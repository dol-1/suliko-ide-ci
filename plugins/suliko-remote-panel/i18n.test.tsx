// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { EN, KA, remoteMessages, remoteStatusLabel } from "./i18n.js";

describe("D-061 Remote panel KA/EN labels", () => {
  it("has matching nonempty strings and fail-closed fallback statuses", () => {
    expect(Object.keys(KA).sort()).toEqual(Object.keys(EN).sort());
    expect(Object.values(KA).every((x) => x.trim().length > 0)).toBe(true);
    expect(remoteMessages("fr")).toBe(EN);
    expect(remoteStatusLabel(KA, "secret-untrusted-status")).toBe("უცნობია");
  });
  it("localizes demo state without adding in-IDE approval", async () => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = "ka-GE";
    const app = await loadPluginApp(() => import("./app.js"));
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      context: { projectId: "demo-project", threadId: null }, rpc: {},
    });
    try {
      expect(slot.getByLabelText("სულიკო Remote პანელი")).toBeTruthy();
      expect(await slot.findByText(/Demo Laptop/)).toBeTruthy();
      expect(slot.getByText(/შედეგი უცნობია/)).toBeTruthy();
      expect(slot.getByRole("link", { name: /გახსენით Remote-ის თანხმობის გვერდი/ }).getAttribute("href"))
        .toBe("https://remote.example.invalid/approvals/demo-approval-1");
      expect(slot.queryByRole("button", { name: /approve|დამტკიცება/i })).toBeNull();
      expect(slot.inspection.rpcCalls).toHaveLength(0);
    } finally { slot.lifecycle.unmount(); document.documentElement.lang = previous; }
  });
});
