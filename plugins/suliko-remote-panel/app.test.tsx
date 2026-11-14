// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { isSafeDemoApprovalPage } from "./mock-remote.js";

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