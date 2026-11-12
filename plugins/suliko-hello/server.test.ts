import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server.js";

describe("Suliko Hello typed backend RPC", () => {
  it("registers ping and returns a timestamp with no configured secret", async () => {
    const host = createFakePluginHost({ pluginId: "suliko-hello" });
    try {
      host.harness.sdk.stub("system.version", () => ({ currentVersion: "0.49.0" }));
      await plugin(host.bb);
      expect(host.harness.inspection.registrations.rpcMethods).toContain("ping");
      expect(host.harness.inspection.registrations.rpcMethods).toContain("compatibility");
      const result = await host.harness.behavior.callRpc("ping", {});
      expect(result).toMatchObject({ ok: true, secretConfigured: false });
      expect((result as { ts: string }).ts).toMatch(/^\d{4}-\d\d-\d\dT/);
      expect(JSON.stringify(result)).not.toContain("demoSecret");
    } finally {
      await host.harness.lifecycle.dispose();
    }
  });

  it("reads a synthetic secret on server but never returns its value", async () => {
    const dummy = "disposable-fixture-only-do-not-use";
    const host = createFakePluginHost({
      pluginId: "suliko-hello",
      settings: { demoSecret: dummy },
    });
    try {
      host.harness.sdk.stub("system.version", () => ({ currentVersion: "0.49.0" }));
      await plugin(host.bb);
      const result = await host.harness.behavior.callRpc("ping", {});
      expect(result).toMatchObject({ ok: true, secretConfigured: true });
      expect(JSON.stringify(result)).not.toContain(dummy);
    } finally {
      await host.harness.lifecycle.dispose();
    }
  });
  it("fails closed for a newer BB version before secret access", async () => {
    const host = createFakePluginHost({ pluginId: "suliko-hello", settings: { demoSecret: "synthetic" } });
    try {
      host.harness.sdk.stub("system.version", () => ({ currentVersion: "0.49.1" }));
      await plugin(host.bb);
      expect(await host.harness.behavior.callRpc("compatibility", {})).toEqual({
        supported: false, currentVersion: "0.49.1", allowedRange: ">=0.49.0 <0.49.1",
      });
      await expect(host.harness.behavior.callRpc("ping", {})).rejects.toThrow();
      const service = host.harness.runService("bb-version-guard");
      await service.done;
      expect(host.harness.inspection.needsConfigurationMessages.join(" ")).toContain("disabled");
    } finally {
      await host.harness.lifecycle.dispose();
    }
  });

  it("fails closed when the SDK cannot report the BB version", async () => {
    const host = createFakePluginHost({ pluginId: "suliko-hello" });
    try {
      host.harness.sdk.stub("system.version", () => { throw new Error("unavailable"); });
      await plugin(host.bb);
      expect(await host.harness.behavior.callRpc("compatibility", {})).toMatchObject({
        supported: false, currentVersion: null,
      });
      await expect(host.harness.behavior.callRpc("ping", {})).rejects.toThrow();
    } finally {
      await host.harness.lifecycle.dispose();
    }
  });
});