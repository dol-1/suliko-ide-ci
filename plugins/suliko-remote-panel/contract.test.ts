import { describe, expect, it, vi } from "vitest";
import {
  evaluateSyntheticCall, freshSyntheticPrincipal, FIXTURE_NOW, pollUnknownReceipt,
  type ProposedCall, type SyntheticPrincipal, type DenyReason
} from "./contract-mock.js";

describe("D-055 synthetic Remote contract negatives (NOT live Remote)", () => {
  const BASE = freshSyntheticPrincipal();
  const attempts: ReadonlyArray<{
    id: string; call: ProposedCall; principal?: SyntheticPrincipal; why: DenyReason;
  }> = [
    { id: "REM-NEG-01", call: {method:"run_as_root", deviceId:"test-device-a", approvalId:"synthetic-a"}, why:"FORBIDDEN_METHOD" },
    { id: "REM-NEG-02", call: {method:"list_devices", deviceId:"test-device-b"}, why:"DEVICE_OUTSIDE_ALLOWLIST" },
    { id: "REM-NEG-03", call: {method:"write_file", deviceId:"test-device-a"}, why:"APPROVAL_REQUIRED" },
    { id: "REM-NEG-04", call: {method:"write_file", deviceId:"test-device-a",approvalId:"synthetic-a",approvalUsed:true}, why:"REPLAYED_APPROVAL" },
    { id: "REM-NEG-05", call: {method:"write_file", deviceId:"test-device-a",approvalId:"synthetic-a",approvedDigest:"digest-a",requestedDigest:"digest-b"}, why:"TAMPERED_ARGUMENTS" },
    { id: "REM-NEG-06", call: {method:"list_devices"}, principal:{...BASE,revoked:true}, why:"TOKEN_EXPIRED_OR_REVOKED" },
    { id: "REM-NEG-07", call: {method:"job_status"}, principal:{...BASE,audience:"other"}, why:"PRINCIPAL_OR_AUDIENCE" },
    { id: "REM-NEG-08", call: {method:"approve_action",deviceId:"test-device-a",approvedBy:"ide-agent",approvalId:"synthetic-a"}, why:"SELF_APPROVAL" },
    { id: "REM-NEG-09", call: {method:"list_devices"}, principal:{...BASE,tokenKind:"memo"}, why:"TOKEN_SCOPE" },
    { id: "REM-NEG-10", call: {method:"write_file",deviceId:"test-device-a",requestPath:"workspace/../../private",approvalId:"synthetic-a"}, why:"PATH_TRAVERSAL" },
  ];
  for (const fixture of attempts) {
    it(fixture.id + " denies and produces auditable reason", () => {
      const result = evaluateSyntheticCall(fixture.principal ?? BASE, fixture.call, FIXTURE_NOW);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(fixture.why);
      expect(result.audit).toEqual(expect.objectContaining({ method: fixture.call.method, reason: fixture.why }));
    });
  }
  it("read-only calls allowed on scoped synthetic principal, unknown methods denied", () => {
    for (const method of ["list_devices", "list_pending_approvals", "get_approval_status", "job_status"]) {
      expect(evaluateSyntheticCall(BASE,{method,deviceId:"test-device-a"},FIXTURE_NOW).allowed).toBe(true);
    }
    expect(evaluateSyntheticCall(BASE,{method:"approve_action", approvalId:"fixture"},FIXTURE_NOW).allowed).toBe(false);
    expect(evaluateSyntheticCall({...BASE,expiresAt:FIXTURE_NOW}, {method:"list_devices"}, FIXTURE_NOW).allowed).toBe(false);
  });
});

describe("D-055 unknown outcome is status-poll only", () => {
  it("polls same receipt through unknown/pending to authoritative success", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce("unknown").mockResolvedValueOnce("pending").mockResolvedValueOnce("succeeded");
    expect(await pollUnknownReceipt("mock-job-1",read,3)).toBe("succeeded");
    expect(read.mock.calls).toEqual([["mock-job-1"],["mock-job-1"],["mock-job-1"]]);
  });
  it("does not call write or retry; unresolved remains unknown", async () => {
    const read = vi.fn(async () => "unknown" as const);
    expect(await pollUnknownReceipt("mock-job-2",read,2)).toBe("unknown");
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("fails closed on forged terminal state and invalid retry bound", async () => {
    await expect(pollUnknownReceipt("mock-job-3",async () => "approved" as never,2)).rejects.toThrow(/Untrusted/);
    await expect(pollUnknownReceipt("mock-job-3",async () => "pending",0)).rejects.toThrow(/bound/);
  });
});
