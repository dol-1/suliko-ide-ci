import { useEffect, useState } from "react";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { remoteMessages, remoteStatusLabel } from "./i18n.js";
import { pollingDelay } from "./polling.js";
import {
  demoRemote,
  isSafeDemoApprovalPage,
  type RemoteReadOnlyMockPort,
  type TestApproval, type TestDevice, type TestJob,
} from "./mock-remote.js";

interface Snapshot {
  devices: readonly TestDevice[];
  approvals: readonly TestApproval[];
  job: TestJob;
  approvalStatuses: ReadonlyMap<string, "pending" | "approved" | "denied" | "expired">;
}

export function RemotePanel({ readPort = demoRemote }: { readPort?: RemoteReadOnlyMockPort } = {}) {
  const lang = typeof document !== "undefined" && document.documentElement.lang
    ? document.documentElement.lang
    : typeof navigator !== "undefined" ? navigator.language : "en";
  const t = remoteMessages(lang);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Only four read-only, no-network mock calls. Never retry or replay a write.
    async function refresh() {
      try {
        const [devices, approvals, job] = await Promise.all([
          readPort.list_devices(),
          readPort.list_pending_approvals(),
          readPort.job_status("demo-job-1"),
        ]);
        // Each displayed approval must have its OWN matching status read.
        // Do not attach a single demo ID's status to unrelated requests.
        if (!Array.isArray(approvals) || approvals.length > 16) {
          throw new Error("Untrusted demo approval count");
        }
        const ids = new Set<string>();
        for (const approval of approvals) {
          if (typeof approval?.id !== "string" ||
              !/^[a-zA-Z0-9_-]{1,64}$/.test(approval.id) ||
              ids.has(approval.id)) {
            throw new Error("Duplicate or invalid demo approval ID");
          }
          ids.add(approval.id);
        }
        const statuses = await Promise.all(
          approvals.map(a => readPort.get_approval_status(a.id)),
        );
        const approvalStatuses = new Map<string, "pending" | "approved" | "denied" | "expired">();
        for (let i = 0; i < approvals.length; i++) {
          const status = statuses[i];
          if (!status || status.id !== approvals[i]?.id ||
              !["pending", "approved", "denied", "expired"].includes(status.status)) {
            throw new Error("Mismatched demo approval status");
          }
          approvalStatuses.set(status.id, status.status);
        }
        if (!active) return;
        failures = 0;
        setSnapshot({ devices, approvals, approvalStatuses, job });
        setError(false);
      } catch {
        if (!active) return;
        // Fail closed: never render stale device/approval/outcome data as current.
        failures = Math.min(failures + 1, 3);
        setSnapshot(null);
        setError(true);
      } finally {
        if (active) timer = setTimeout(() => { void refresh(); }, pollingDelay(failures));
      }
    }
    void refresh();
    return () => { active = false; if (timer !== undefined) clearTimeout(timer); };
  }, [readPort]);

  return (
    <section aria-label={t.panelLabel} style={{ padding: 16 }}>
      <h2>{t.title}</h2>
      <p role="note">{t.demoNote}</p>
      {error ? <p role="alert">{t.loadError}</p> : null}
      {!snapshot && !error ? <p role="status">{t.loading}</p> : null}
      {snapshot ? (
        <>
          <section aria-label={t.devices}>
            <h3>{t.devices}</h3>
            {snapshot.devices.length === 0 ? <p role="status">{t.noDevices}</p> : null}
            {snapshot.devices.some(d => d.status === "offline") ? <p role="status">{t.offlineNotice}</p> : null}
            <ul>
              {snapshot.devices.map((d) => (
                <li key={d.id}>{d.label} — {remoteStatusLabel(t,d.status)}</li>
              ))}
            </ul>
          </section>
          <section aria-label={t.pendingApprovals}>
            <h3>{t.pendingApprovals}</h3>
            {snapshot.approvals.length === 0 ? <p role="status">{t.noApprovals}</p> : null}
            <p>{t.externalOnly}</p>
            <ul>
              {snapshot.approvals.map((a) => (
                <li key={a.id}>
                  {a.label} — {remoteStatusLabel(t,snapshot.approvalStatuses.get(a.id) ?? "unknown")}
                  {isSafeDemoApprovalPage(a.approvalPageUrl) ? (
                    <a href={a.approvalPageUrl} target="_blank" rel="noopener noreferrer">
                      {t.openApproval}
                    </a>
                  ) : <span> {t.pageUnavailable}</span>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-label={t.outcomes}>
            <h3>{t.outcomes}</h3>
            <p>{snapshot.job.id}: {remoteStatusLabel(t,snapshot.job.status)}</p>
            {snapshot.job.status === "unknown" ? (
              <p role="status">{t.unknownOutcome}</p>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "suliko-remote",
    title: "Suliko Remote (mock)",
    icon: "Monitor",
    path: "suliko-remote",
    // SDK nav panels receive PluginNavPanelProps; the mock port is test-only injection.
    component: () => <RemotePanel />,
  });
});