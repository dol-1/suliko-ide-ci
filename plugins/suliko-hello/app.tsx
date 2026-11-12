import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { helloContract } from "./server.js";

type BbCompatibility =
  | { kind: "checking" }
  | { kind: "supported" }
  | { kind: "unsupported"; version: string | null; allowedRange: string };

type HelloStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; ts: string; secretConfigured: boolean }
  | { kind: "error" };

export function HelloPanel() {
  const rpc = useRpc<typeof helloContract>();
  const [status, setStatus] = useState<HelloStatus>({ kind: "idle" });
  const [compatibility, setCompatibility] = useState<BbCompatibility>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    void rpc.call("compatibility", {}).then((result) => {
      if (!active) return;
      setCompatibility(result.supported
        ? { kind: "supported" }
        : { kind: "unsupported", version: result.currentVersion, allowedRange: result.allowedRange });
    }).catch(() => {
      if (active) setCompatibility({
        kind: "unsupported", version: null, allowedRange: ">=0.49.0 <0.49.1",
      });
    });
    return () => { active = false; };
  }, [rpc]);

  async function checkServer() {
    if (compatibility.kind !== "supported") return;
    setStatus({ kind: "loading" });
    try {
      const result = await rpc.call("ping", {});
      setStatus({
        kind: "success",
        ts: result.ts,
        secretConfigured: result.secretConfigured,
      });
    } catch {
      // Do not echo arbitrary server errors; they may contain sensitive detail.
      setStatus({ kind: "error" });
    }
  }

  return (
    <section aria-label="Suliko Hello panel" style={{ padding: 16 }}>
      <h2>Suliko Hello</h2>
      <p>SDK panel and typed backend RPC feasibility probe.</p>
      {compatibility.kind === "checking" ? <p role="status">Checking BB compatibility…</p> : null}
      {compatibility.kind === "unsupported" ? (
        <p role="alert">
          Suliko Hello disabled: BB {compatibility.version ?? "version unavailable"} is unsupported.
          Required: {compatibility.allowedRange}. Update or restore a compatible BB build.
        </p>
      ) : null}
      {compatibility.kind === "supported" ? (
        <button type="button" onClick={() => void checkServer()} disabled={status.kind === "loading"}>
          Ping server
        </button>
      ) : null}
      {status.kind === "loading" ? <p role="status">Checking…</p> : null}
      {status.kind === "success" ? (
        <div role="status">
          <p>Connected at {status.ts}</p>
          <p>Disposable secret configured: {status.secretConfigured ? "yes" : "no"}</p>
        </div>
      ) : null}
      {status.kind === "error" ? <p role="alert">RPC check failed.</p> : null}
    </section>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "suliko-hello",
    title: "Suliko Hello",
    icon: "Plug",
    path: "suliko-hello",
    component: HelloPanel,
  });
});