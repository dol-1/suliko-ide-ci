// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { demoRemote, isSafeDemoApprovalPage, type RemoteReadOnlyMockPort, type TestDevice } from "./mock-remote.js";
import { RemotePanel } from "./app.js";

afterEach(() => cleanup());

describe("REM-04 client-only Remote mock panel", () => {
  it("shows mock devices/pending/outcome and never an in-IDE approve button", async () => {
    const app = await loadPluginApp(() => import("./app.js"));
    expect(app.navPanels).toHaveLength(1);
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "demo-project", threadId: null }, rpc: {},
    });
    try {
      expect(await slot.findByText(/Demo Laptop/)).toBeTruthy();
      expect(slot.getByText(/Fixture-only write request/)).toBeTruthy();
      expect(slot.getByText(/Outcome unknown/)).toBeTruthy();
      expect(slot.queryByRole("button", { name: /approve/i })).toBeNull();
      const link = slot.getByRole("link", { name: /Open Remote approval page/ });
      expect(link.getAttribute("href")).toBe("https://remote.example.invalid/approvals/demo-approval-1");
      expect(slot.inspection.rpcCalls).toHaveLength(0);
    } finally {
      slot.lifecycle.unmount();
    }
  });

  it("rejects unsupported approval URLs, query strings and unsafe schemes", () => {
    expect(isSafeDemoApprovalPage("https://remote.example.invalid/approvals/demo-approval-1")).toBe(true);
    for (const url of [
      "http://remote.example.invalid/approvals/demo-approval-1",
      "javascript:alert(1)",
      "https://other.example/approvals/demo-approval-1",
      "https://fixture-user:synthetic-secret@remote.example.invalid/approvals/demo-approval-1",
      "https://remote.example.invalid:8443/approvals/demo-approval-1",
      "https://remote.example.invalid/approvals/demo-approval-1?redirect=https://other.example",
    ]) expect(isSafeDemoApprovalPage(url)).toBe(false);
  });
});

describe("D094 actual mounted RemotePanel read-only mock UI states (NOT live Remote)", () => {
  it("shows loading while one of the four read-only calls is unresolved; cancels on unmount", () => {
    const unresolved = new Promise<readonly TestDevice[]>(() => {});
    const port: RemoteReadOnlyMockPort = {
      ...demoRemote, list_devices: () => unresolved,
    };
    const view = render(<RemotePanel readPort={port} />);
    expect(screen.getByRole("status").textContent).toMatch(/Loading mock data/);
    expect(screen.queryByRole("link", { name: /approval page/i })).toBeNull();
    view.unmount();
  });

  it("shows a fail-closed error without stale device or approval data", async () => {
    const port: RemoteReadOnlyMockPort = {
      ...demoRemote, list_devices: async () => { throw Error("Synthetic disconnected fixture"); },
    };
    render(<RemotePanel readPort={port} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Unable to load demo data/);
    expect(screen.queryByText(/Demo Laptop/)).toBeNull();
    expect(screen.queryByRole("link", { name: /approval page/i })).toBeNull();
  });

  it("renders empty devices and empty pending approvals with no in-IDE approve action", async () => {
    const port: RemoteReadOnlyMockPort = {
      ...demoRemote,
      list_devices: async () => [],
      list_pending_approvals: async () => [],
    };
    render(<RemotePanel readPort={port} />);
    expect((await screen.findByText(/No devices available in this snapshot/)).textContent).toBeTruthy();
    expect(screen.getByText(/No pending approvals/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  });

  it("renders offline device notice while preserving unknown-outcome no-replay warning", async () => {
    const port: RemoteReadOnlyMockPort = {
      ...demoRemote,
      list_devices: async () => [
        { id: "test-offline", label: "Disposable offline host", status: "offline" },
      ],
      list_pending_approvals: async () => [],
    };
    render(<RemotePanel readPort={port} />);
    expect((await screen.findByText(/Some devices are offline/)).textContent).toBeTruthy();
    expect(screen.getByText(/Outcome unknown\. Poll status later/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  });
});
