/**
 * Test-only proposal for IDE -> Remote read/status policy.
 * DOES NOT implement, validate, or claim any live Remote access control.
 * No fetch, tokens, network or privileged execution.
 */
export type SafeMethod = "list_devices" | "list_pending_approvals" | "get_approval_status" | "job_status";
const READ_METHODS: ReadonlySet<string> = new Set(["list_devices", "list_pending_approvals", "get_approval_status", "job_status"]);
export type DenyReason =
  | "TOKEN_SCOPE" | "TOKEN_EXPIRED_OR_REVOKED" | "PRINCIPAL_OR_AUDIENCE"
  | "DEVICE_OUTSIDE_ALLOWLIST" | "PATH_TRAVERSAL" | "SELF_APPROVAL"
  | "REPLAYED_APPROVAL" | "TAMPERED_ARGUMENTS"
  | "APPROVAL_REQUIRED" | "FORBIDDEN_METHOD" | "ALLOW_READ_ONLY";

export interface SyntheticPrincipal {
  id: string;
  audience: string;
  tokenKind: "remote" | "memo";
  expiresAt: number;
  revoked: boolean;
  devices: readonly string[];
}
export interface ProposedCall {
  method: string;
  deviceId?: string;
  requestPath?: string;
  approvalUsed?: boolean;
  approvalId?: string;
  approvedDigest?: string;
  requestedDigest?: string;
  approvedBy?: string;
}
export interface ContractDecision { readonly allowed: boolean; readonly reason: DenyReason; readonly audit: { method: string; deviceId?: string; reason: DenyReason } }
const deny = (r: ProposedCall, reason: DenyReason): ContractDecision => ({
  allowed: false, reason,
  audit: { method: r.method, ...(r.deviceId ? { deviceId: r.deviceId } : {}), reason },
});
const allow = (r: ProposedCall): ContractDecision => ({
  allowed: true, reason: "ALLOW_READ_ONLY",
  audit: { method: r.method, ...(r.deviceId ? { deviceId: r.deviceId } : {}), reason: "ALLOW_READ_ONLY" },
});

/** Explicit fail-closed, contract-level MOCK; Remote backend must enforce separately. */
export function evaluateSyntheticCall(c: SyntheticPrincipal, r: ProposedCall, now: number): ContractDecision {
  if (c.tokenKind !== "remote") return deny(r, "TOKEN_SCOPE");
  if (c.revoked || now >= c.expiresAt) return deny(r, "TOKEN_EXPIRED_OR_REVOKED");
  if (c.id !== "ide-agent" || c.audience !== "remote") return deny(r, "PRINCIPAL_OR_AUDIENCE");
  if (r.deviceId && !c.devices.includes(r.deviceId)) return deny(r, "DEVICE_OUTSIDE_ALLOWLIST");
  if (r.requestPath && r.requestPath.split(/[\\/]/).some(x => x === "..")) return deny(r, "PATH_TRAVERSAL");
  if (r.approvedBy === c.id && r.method.startsWith("approve")) return deny(r, "SELF_APPROVAL");
  if (r.approvalUsed) return deny(r, "REPLAYED_APPROVAL");
  if (r.approvedDigest !== undefined && r.requestedDigest !== r.approvedDigest) return deny(r, "TAMPERED_ARGUMENTS");
  if (!READ_METHODS.has(r.method) && !r.approvalId) return deny(r, "APPROVAL_REQUIRED");
  if (!READ_METHODS.has(r.method)) return deny(r, "FORBIDDEN_METHOD");
  return allow(r);
}
export const FIXTURE_NOW = 1_800_000_000_000;
export function freshSyntheticPrincipal(): SyntheticPrincipal {
  return { id: "ide-agent", audience: "remote", tokenKind: "remote", expiresAt: FIXTURE_NOW + 60_000, revoked: false, devices: ["test-device-a"] };
}

export type Receipt = "pending" | "succeeded" | "failed" | "denied" | "unknown";
/** Only query existing status, never submit or replay an action. */
export async function pollUnknownReceipt(
  jobId: string,
  readStatus: (sameJobId: string) => Promise<Receipt>,
  maxPolls = 3,
): Promise<Receipt> {
  if (!jobId || maxPolls < 1 || maxPolls > 10) throw new Error("Invalid mock receipt/poll bound");
  for (let i = 0; i < maxPolls; i++) {
    const status = await readStatus(jobId);
    if (status === "succeeded" || status === "failed" || status === "denied") return status;
    if (status !== "pending" && status !== "unknown") throw new Error("Untrusted receipt status");
  }
  return "unknown";
}

/** Client-side read-only retry pacing; injectable wait prevents hidden timers in tests.
 * No approval/action request is constructed or replayed by this function.
 */
export function boundedBackoffMs(retryIndex: number): number {
  if (!Number.isInteger(retryIndex) || retryIndex < 0 || retryIndex > 9) {
    throw new Error("Invalid read-only retry index");
  }
  return Math.min(500 * (2 ** retryIndex), 4000);
}
export async function pollReceiptWithBackoff(
  jobId: string,
  readStatus: (sameJobId: string) => Promise<Receipt>,
  wait: (ms: number) => Promise<void>,
  maxPolls = 4,
): Promise<Receipt> {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(jobId) || !Number.isInteger(maxPolls) || maxPolls < 1 || maxPolls > 10) {
    throw new Error("Invalid read-only receipt or bounded poll count");
  }
  for (let attempt = 0; attempt < maxPolls; attempt++) {
    const status = await readStatus(jobId);
    if (status === "succeeded" || status === "failed" || status === "denied") return status;
    if (status !== "pending" && status !== "unknown") throw new Error("Untrusted receipt status");
    if (attempt + 1 < maxPolls) await wait(boundedBackoffMs(attempt));
  }
  return "unknown";
}
