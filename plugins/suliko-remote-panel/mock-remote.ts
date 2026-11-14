/**
 * REM-04 client-only mock for IDE panel prototyping.
 * This is NOT a remote MCP schema declaration or a live adapter.
 * Normalize authoritative Remote responses after owner-provided contract/GO.
 * Absolutely no token, approval mutation, shell, root or network is used.
 */
export type RemoteOutcome = "succeeded" | "failed" | "denied" | "pending" | "unknown";
export interface TestDevice { id: string; label: string; status: "online" | "offline" }
export interface TestApproval { id: string; deviceId: string; label: string; status: "pending"; approvalPageUrl: string }
export interface TestApprovalStatus { id: string; status: "pending" | "approved" | "denied" | "expired" }
export interface TestJob { id: string; deviceId: string; status: RemoteOutcome }

export interface RemoteReadOnlyMockPort {
  list_devices(): Promise<readonly TestDevice[]>;
  list_pending_approvals(): Promise<readonly TestApproval[]>;
  get_approval_status(id: string): Promise<TestApprovalStatus>;
  job_status(id: string): Promise<TestJob>;
}

/** No real Remote endpoint, token, fetch() or permissions. */
export const demoRemote: RemoteReadOnlyMockPort = {
  async list_devices() {
    return [
      { id: "demo-device-1", label: "Demo Laptop", status: "online" },
      { id: "demo-device-2", label: "Demo Test Host", status: "offline" },
    ];
  },
  async list_pending_approvals() {
    return [{
      id: "demo-approval-1",
      deviceId: "demo-device-1",
      label: "Fixture-only write request",
      status: "pending",
      approvalPageUrl: "https://remote.example.invalid/approvals/demo-approval-1",
    }];
  },
  async get_approval_status(id) {
    return { id, status: "pending" };
  },
  async job_status(id) {
    return { id, deviceId: "demo-device-1", status: "unknown" };
  },
};

/** Demo links may only point to a clearly unresolvable documentation domain. */
export function isSafeDemoApprovalPage(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "remote.example.invalid" &&
      !u.username && !u.password && !u.port &&
      /^\/approvals\/[a-zA-Z0-9_-]+$/.test(u.pathname) && !u.search && !u.hash;
  } catch {
    return false;
  }
}