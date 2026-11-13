// @vitest-environment jsdom
// D-088 E3: injectable read-only mock transport; NEVER a live Remote client.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RemotePanel } from "./app.js";
import type { RemoteReadOnlyMockPort } from "./mock-remote.js";

afterEach(() => { cleanup(); document.documentElement.lang = "en"; });

function port(changes: Partial<RemoteReadOnlyMockPort> = {}): RemoteReadOnlyMockPort {
  return {
    async list_devices() { return [{ id: "fixture-1", label: "Fixture Test Laptop", status: "offline" as const }]; },
    async list_pending_approvals() { return []; },
    async get_approval_status(id) { return { id, status: "pending" as const }; },
    async job_status(id) { return { id, deviceId: "fixture-1", status: "unknown" as const }; },
    ...changes,
  };
}
const never = () => new Promise<never>(() => {});
function noWriteControls() {
  expect(screen.queryByRole("button",{name:/approve|დამტკიც|execute|run command/i})).toBeNull();
}
describe("D088 Remote MOCK state matrix (no network, no token, no authority)", () => {
  it("renders loading while read-only mocks are unresolved", () => {
    render(<RemotePanel readPort={port({
      list_devices: never,
      list_pending_approvals: never,
      get_approval_status: never,
      job_status: never,
    })} />);
    expect(screen.getByRole("status").textContent).toMatch(/Loading mock data/);
    noWriteControls();
  });
  it("redacts rejected mock diagnostics and renders an English error state", async () => {
    const marker="sk-SYNTH_D088_NOT_SECRET";
    render(<RemotePanel readPort={port({
      list_devices: async () => { throw new Error(marker); },
    })} />);
    expect((await screen.findByRole("alert")).textContent).toBe("Unable to load demo data.");
    expect(document.body.textContent).not.toContain(marker);
    noWriteControls();
  });
  it("renders empty devices and approvals without an approval link", async () => {
    render(<RemotePanel readPort={port({ list_devices: async()=>[] })} />);
    expect(await screen.findByText("No devices available in this snapshot.")).toBeTruthy();
    expect(screen.getByText("No pending approvals.")).toBeTruthy();
    expect(screen.queryByRole("link",{name:/approval/i})).toBeNull();
    noWriteControls();
  });
  it("renders offline and unknown outcome from read-only fixture only", async () => {
    render(<RemotePanel readPort={port()} />);
    expect(await screen.findByText(/Fixture Test Laptop/)).toBeTruthy();
    expect(screen.getByText("Some devices are offline; status is informational only.")).toBeTruthy();
    expect(screen.getByText(/Outcome unknown\. Poll status later/)).toBeTruthy();
    noWriteControls();
  });
  it("renders Georgian offline and empty copy without a live Remote client", async () => {
    document.documentElement.lang="ka-GE";
    render(<RemotePanel readPort={port({list_devices: async()=>[]})} />);
    expect(await screen.findByText("ამ ჩანაწერში მოწყობილობები არ არის.")).toBeTruthy();
    expect(screen.getByText("მოლოდინში თანხმობა არ არის.")).toBeTruthy();
    noWriteControls();
  });
  it("refuses unsafe approval URLs even when injected from a fake read port", async () => {
    render(<RemotePanel readPort={port({
      list_pending_approvals:async()=>[{id:"demo-approval-1",deviceId:"fixture-1",label:"Fixture request",status:"pending" as const,approvalPageUrl:"https://evil.invalid/approvals/demo-approval-1"}],
    })} />);
    expect(await screen.findByText(/Fixture request/)).toBeTruthy();
    expect(screen.getByText("Approval page unavailable")).toBeTruthy();
    expect(screen.queryByRole("link",{name:/Open Remote approval page/})).toBeNull();
    noWriteControls();
  });
});
