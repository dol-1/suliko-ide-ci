// @vitest-environment jsdom
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";

describe("Suliko Hello sidebar panel", () => {
  it("renders a panel and calls the typed RPC without exposing a secret", async () => {
    const app = await loadPluginApp(() => import("./app.js"));
    expect(app.navPanels).toHaveLength(1);
    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "proj_demo", threadId: null },
        rpc: {
          compatibility: () => ({ supported: true, currentVersion: "0.49.0", allowedRange: ">=0.49.0 <0.49.1" }),
          ping: () => ({
            ok: true,
            ts: "2026-11-11T12:00:00.000Z",
            secretConfigured: true,
          }),
        },
      },
    );
    try {
      expect(slot.getByLabelText("Suliko Hello panel")).toBeTruthy();
      fireEvent.click(await slot.findByRole("button", { name: "Ping server" }));
      await slot.findByText(/Connected at 2026-11-11/);
      expect(slot.getByText(/Disposable secret configured: yes/)).toBeTruthy();
      expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual(["compatibility", "ping"]);
    } finally {
      slot.lifecycle.unmount();
    }
  });
  it("does not echo untrusted BB version text in incompatibility warnings", async () => {
    const app = await loadPluginApp(() => import("./app.js"));
    const marker = "sk-" + "SYNTHETIC_DO_NOT_ECHO_1234567890";
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "proj_demo", threadId: null },
      rpc: {
        compatibility: () => ({ supported: false, currentVersion: "0.49.0-" + marker,
          allowedRange: ">=0.49.0 <0.49.1" }),
        ping: () => { throw new Error("ping must not run"); },
      },
    });
    try {
      const alert = await slot.findByRole("alert");
      expect(alert.textContent).toContain("version unavailable");
      expect(alert.textContent).not.toContain(marker);
      expect(slot.queryByRole("button", { name: "Ping server" })).toBeNull();
    } finally { slot.lifecycle.unmount(); }
  });
  it("does not render arbitrary timestamp content from RPC", async () => {
    const app = await loadPluginApp(() => import("./app.js"));
    const marker = "sk-" + "SYNTHETIC_TIMESTAMP_MARKER_12345";
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "proj_demo", threadId: null },
      rpc: {
        compatibility: () => ({ supported: true, currentVersion: "0.49.0",
          allowedRange: ">=0.49.0 <0.49.1" }),
        ping: () => ({ ok: true, ts: "2026-11-12T12:00:00Z " + marker,
          secretConfigured: true }),
      },
    });
    try {
      fireEvent.click(await slot.findByRole("button", { name: "Ping server" }));
      const alert = await slot.findByRole("alert");
      expect(alert.textContent).toContain("RPC check failed");
      expect(alert.textContent).not.toContain(marker);
      expect(slot.queryByText(/Connected at/)).toBeNull();
    } finally { slot.lifecycle.unmount(); }
  });
  it("shows an incompatibility warning and never exposes the action", async () => {
    const app = await loadPluginApp(() => import("./app.js"));
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "proj_demo", threadId: null },
      rpc: {
        compatibility: () => ({ supported: false, currentVersion: "0.49.1", allowedRange: ">=0.49.0 <0.49.1" }),
        ping: () => { throw new Error("should not run"); },
      },
    });
    try {
      expect((await slot.findByRole("alert")).textContent).toContain("0.49.1");
      expect(slot.queryByRole("button", { name: "Ping server" })).toBeNull();
      expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual(["compatibility"]);
    } finally {
      slot.lifecycle.unmount();
    }
  });
});
