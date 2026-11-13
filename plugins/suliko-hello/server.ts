import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { ALLOWED_BB_VERSION_RANGE, isCompatibleBbVersion, publicBbVersion } from "./version-compat.js";

// Only public status leaves the backend. Secret settings are never sent to the app.
export const helloContract = defineRpcContract({
  compatibility: {
    input: z.object({}).strict(),
    output: z.object({
      supported: z.boolean(),
      currentVersion: z.string().nullable(),
      allowedRange: z.literal(ALLOWED_BB_VERSION_RANGE),
    }).strict(),
  },
  ping: {
    input: z.object({}).strict(),
    output: z.object({
      ok: z.literal(true),
      ts: z.string(),
      secretConfigured: z.boolean(),
    }).strict(),
  },
});

export default function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    demoSecret: {
      type: "string",
      label: "Disposable demo secret (optional)",
      description: "Test-only value. Never enter a production credential.",
      secret: true,
    },
  });

  // SDK-backed check only. Unknown/unavailable version is incompatible (fail closed).
  async function currentBbVersion(signal?: AbortSignal): Promise<string | null> {
    try {
      const info = await bb.sdk.system.version(signal ? { signal } : {});
      return typeof info.currentVersion === "string" ? info.currentVersion : null;
    } catch {
      return null;
    }
  }

  // Post-factory service runs at startup and advertises the incompatible state
  // to the host UI. This does not alter or block BB's stock auto-updater.
  bb.background.service("bb-version-guard", {
    async start(signal) {
      const version = await currentBbVersion(signal);
      if (signal.aborted) return;
      if (!isCompatibleBbVersion(version)) {
        throw Object.assign(
          new Error("Suliko Hello disabled: requires BB " + ALLOWED_BB_VERSION_RANGE + "."),
          { name: "NeedsConfigurationError" },
        );
      }
      await new Promise<void>((resolve) => {
        if (signal.aborted) { resolve(); return; }
        signal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
  });

  bb.rpc.register(helloContract, {
    async compatibility() {
      const currentVersion = await currentBbVersion();
      return {
        supported: isCompatibleBbVersion(currentVersion),
        currentVersion: publicBbVersion(currentVersion),
        allowedRange: ALLOWED_BB_VERSION_RANGE,
      };
    },
    async ping() {
      const version = await currentBbVersion();
      if (!isCompatibleBbVersion(version)) {
        throw new Error("Suliko Hello is disabled for this BB version.");
      }
      // SDK settings.get() reads secret data on the server only.
      const { demoSecret } = await settings.get();
      return {
        ok: true as const,
        ts: new Date().toISOString(),
        secretConfigured: Boolean(demoSecret),
      };
    },
  });
}
