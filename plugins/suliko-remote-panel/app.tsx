import { useEffect, useState } from "react";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import {
  demoRemote,
  isSafeDemoApprovalPage,
  type TestApproval, type TestDevice, type TestJob,
} from "./mock-remote.js";

interface Snapshot {
  devices: readonly TestDevice[];
  approvals: readonly TestApproval[];
  job: TestJob;
  approvalStatus: string;
}

export function RemotePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    // Stubbed promise calls only. No network is contacted by this prototype.
    void Promise.all([
      demoRemote.list_devices(),
      demoRemote.list_pending_approvals(),
      demoRemote.get_approval_status("demo-approval-1"),
      demoRemote.job_status("demo-job-1"),
    ]).then(([devices, approvals, status, job]) => {
      if (active) setSnapshot({ devices, approvals, approvalStatus: status.status, job });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-label="Suliko Remote panel" style={{ padding: 16 }}>
      <h2>Suliko Remote (mock only)</h2>
      <p role="note">Offline demo fixture. No live connection, token or permissions.</p>
      {error ? <p role="alert">Unable to load demo data.</p> : null}
      {!snapshot && !error ? <p role="status">Loading mock data…</p> : null}
      {snapshot ? (
        <>
          <section aria-label="Devices">
            <h3>Devices</h3>
            {snapshot.devices.length === 0 ? <p role="status">No devices available in this snapshot.</p> : null}
            {snapshot.devices.some(d => d.status === "offline") ? <p role="status">Some devices are offline; status is informational only.</p> : null}
            <ul>
              {snapshot.devices.map((d) => (
                <li key={d.id}>{d.label} — {d.status}</li>
              ))}
            </ul>
          </section>
          <section aria-label="Pending approvals">
            <h3>Pending approvals</h3>
            {snapshot.approvals.length === 0 ? <p role="status">No pending approvals.</p> : null}
            <p>Approval is performed only on the separate Remote secure page, never inside IDE.</p>
            <ul>
              {snapshot.approvals.map((a) => (
                <li key={a.id}>
                  {a.label} — {snapshot.approvalStatus}
                  {isSafeDemoApprovalPage(a.approvalPageUrl) ? (
                    <a href={a.approvalPageUrl} target="_blank" rel="noopener noreferrer">
                      Open Remote approval page (demo link)
                    </a>
                  ) : <span> Approval page unavailable</span>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Operation outcomes">
            <h3>Operation outcomes</h3>
            <p>{snapshot.job.id}: {snapshot.job.status}</p>
            {snapshot.job.status === "unknown" ? (
              <p role="status">Outcome unknown. Poll status later; never replay a write automatically.</p>
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
    component: RemotePanel,
  });
});