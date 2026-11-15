// @vitest-environment jsdom
// D-088 E3: injectable read-only mock transport; NEVER a live Remote client.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
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
  it("binds each approval to its matching read-only status, never another row", async () => {
    const seen: string[] = [];
    const fixture = (id: string, label: string) => ({
      id, label, deviceId: "fixture-1", status: "pending" as const,
      approvalPageUrl: "https://remote.example.invalid/approvals/" + id,
    });
    render(<RemotePanel readPort={port({
      list_pending_approvals: async () => [
        fixture("fixture-a", "Fixture Alpha"), fixture("fixture-b", "Fixture Beta"),
      ],
      get_approval_status: async (id) => {
        seen.push(id);
        return { id, status: id === "fixture-a" ? "approved" as const : "denied" as const };
      },
    })} />);
    expect((await screen.findByText(/Fixture Alpha/)).textContent).toContain("approved");
    expect(screen.getByText(/Fixture Beta/).textContent).toContain("denied");
    expect(seen.sort()).toEqual(["fixture-a", "fixture-b"]);
    noWriteControls();
  });
  it("fails closed on mismatched or duplicate approval IDs without showing links", async () => {
    const fixture = {
      id: "fixture-a", label: "Fixture Alpha", deviceId: "fixture-1",
      status: "pending" as const,
      approvalPageUrl: "https://remote.example.invalid/approvals/fixture-a",
    };
    const { unmount } = render(<RemotePanel readPort={port({
      list_pending_approvals: async () => [fixture],
      get_approval_status: async () => ({ id: "fixture-b", status: "approved" as const }),
    })} />);
    expect((await screen.findByRole("alert")).textContent).toBe("Unable to load demo data.");
    expect(screen.queryByText(/Fixture Alpha/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    unmount();
    let statusesRead = 0;
    render(<RemotePanel readPort={port({
      list_pending_approvals: async () => [fixture, fixture],
      get_approval_status: async (id) => {
        statusesRead++;
        return { id, status: "pending" as const };
      },
    })} />);
    await screen.findByRole("alert");
    expect(statusesRead).toBe(0);
    expect(screen.queryByRole("link")).toBeNull();
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

describe("E3 bounded read-only mock polling and unmount", () => {
  it("fails closed on a transient error and refreshes only after 30s", async () => {
    vi.useFakeTimers();
    try {
      let requests = 0;
      const readPort = port({ list_devices: async () => {
        requests++;
        if (requests === 1) throw new Error("sk-SYNTH_NOT_A_REAL_SECRET");
        return [];
      } });
      render(<RemotePanel readPort={readPort} />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(requests).toBe(1);
      expect(screen.getByRole("alert").textContent).toBe("Unable to load demo data.");
      await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
      expect(requests).toBe(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(requests).toBe(2);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByText("No devices available in this snapshot.")).toBeTruthy();
      noWriteControls();
    } finally { cleanup(); vi.useRealTimers(); }
  });
  it("stops polling permanently on unmount", async () => {
    vi.useFakeTimers();
    try {
      let requests = 0;
      const readPort = port({ list_devices: async () => {
        requests++;
        return [];
      } });
      const { unmount } = render(<RemotePanel readPort={readPort} />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(requests).toBe(1);
      unmount();
      await act(async () => { await vi.advanceTimersByTimeAsync(240_000); });
      expect(requests).toBe(1);
    } finally { cleanup(); vi.useRealTimers(); }
  });
});
