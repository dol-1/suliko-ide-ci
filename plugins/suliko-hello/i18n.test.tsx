// @vitest-environment jsdom
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { EN, KA, localeFromLanguage } from "./i18n.js";

describe("D-061 Hello KA/EN localization", () => {
  it("has equivalent typed nonempty keys and safe fallback", () => {
    expect(Object.keys(KA).sort()).toEqual(Object.keys(EN).sort());
    expect(Object.values(KA).every((text) => text.trim().length > 0)).toBe(true);
    expect(localeFromLanguage("ka-GE")).toBe("ka");
    expect(localeFromLanguage("en-US")).toBe("en");
    expect(localeFromLanguage("unsupported")).toBe("en");
  });
  it("shows Georgian accessible labels with typed RPC only", async () => {
    const old = document.documentElement.lang;
    document.documentElement.lang = "ka-GE";
    const app = await loadPluginApp(() => import("./app.js"));
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "proj_demo", threadId: null },
      rpc: {
        compatibility: () => ({ supported: true, currentVersion: "0.49.0", allowedRange: ">=0.49.0 <0.49.1" }),
        ping: () => ({ ok: true, ts: "2026-11-12T12:00:00Z", secretConfigured: true }),
      },
    });
    try {
      expect(slot.getByLabelText("სულიკო ჰელოს პანელი")).toBeTruthy();
      fireEvent.click(await slot.findByRole("button", { name: "სერვერის შემოწმება" }));
      await slot.findByText(/დაკავშირებულია: 2026-11-12/);
      expect(slot.getByText(/სატესტო საიდუმლოს კონფიგურაცია: დიახ/)).toBeTruthy();
      expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual(["compatibility", "ping"]);
    } finally {
      slot.lifecycle.unmount();
      document.documentElement.lang = old;
    }
  });
});
