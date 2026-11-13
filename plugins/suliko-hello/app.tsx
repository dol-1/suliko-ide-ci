import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { helloContract } from "./server.js";
import { panelMessages } from "./i18n.js";
import { publicBbVersion } from "./version-compat.js";

/** Display only canonical UTC timestamps, never arbitrary RPC text. */
function publicRpcTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 28 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) return null;
  const canonical = new Date(epoch).toISOString();
  // Reject impossible calendar dates silently normalized by Date.parse.
  return canonical.startsWith(value.slice(0, 19)) ? canonical : null;
}

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
  const lang = typeof document !== "undefined" && document.documentElement.lang
    ? document.documentElement.lang
    : typeof navigator !== "undefined" ? navigator.language : "en";
  const t = panelMessages(lang);
  const rpc = useRpc<typeof helloContract>();
  const [status, setStatus] = useState<HelloStatus>({ kind: "idle" });
  const [compatibility, setCompatibility] = useState<BbCompatibility>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    void rpc.call("compatibility", {}).then((result) => {
      if (!active) return;
      setCompatibility(result.supported
        ? { kind: "supported" }
        : { kind: "unsupported", version: publicBbVersion(result.currentVersion), allowedRange: result.allowedRange });
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
      const ts = publicRpcTimestamp(result.ts);
      if (!ts) throw new Error("Invalid public timestamp");
      setStatus({
        kind: "success",
        ts,
        secretConfigured: result.secretConfigured,
      });
    } catch {
      // Do not echo arbitrary server errors; they may contain sensitive detail.
      setStatus({ kind: "error" });
    }
  }

  return (
    <section aria-label={t.panelLabel} style={{ padding: 16 }}>
      <h2>{t.heading}</h2>
      <p>{t.description}</p>
      {compatibility.kind === "checking" ? <p role="status">{t.checkingCompatibility}</p> : null}
      {compatibility.kind === "unsupported" ? (
        <p role="alert">
          {t.unsupportedPrefix} {compatibility.version ?? t.versionUnavailable} {t.unsupportedSuffix}
          {t.required} {compatibility.allowedRange}. {t.updateOrRestore}
        </p>
      ) : null}
      {compatibility.kind === "supported" ? (
        <button type="button" onClick={() => void checkServer()} disabled={status.kind === "loading"}>
          {t.pingServer}
        </button>
      ) : null}
      {status.kind === "loading" ? <p role="status">{t.checking}</p> : null}
      {status.kind === "success" ? (
        <div role="status">
          <p>{t.connectedAt} {status.ts}</p>
          <p>{t.secretConfigured} {status.secretConfigured ? t.yes : t.no}</p>
        </div>
      ) : null}
      {status.kind === "error" ? <p role="alert">{t.rpcFailed}</p> : null}
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
