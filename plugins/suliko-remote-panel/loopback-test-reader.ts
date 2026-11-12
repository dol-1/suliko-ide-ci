/**
 * E3 D-060 TEST-ONLY HTTP adapter. The shipped UI still uses app-local demoRemote.
 * Never send secrets or contact a real Remote server. 127.0.0.1 is the ONLY host.
 * The paths/JSON below are synthetic fixture shapes, not a Remote public API.
 */
import {
  isSafeDemoApprovalPage,
  type RemoteReadOnlyMockPort,
  type TestApproval,
  type TestApprovalStatus,
  type TestDevice,
  type TestJob,
} from "./mock-remote.js";

const MAX_JSON_BYTES = 8192;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw Error("Invalid synthetic response object");
  }
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw Error("Invalid synthetic resource identifier");
  }
  return value;
}
function label(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 96 ||
      /[\u0000-\u001f<>]/.test(value)) {
    throw Error("Invalid synthetic display label");
  }
  return value;
}
function jsonList(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value) || value.length > 16) {
    throw Error("Invalid synthetic " + name + " list");
  }
  return value;
}

export function createTestOnlyLoopbackReader(
  baseUrl: string,
  doFetch: typeof fetch = fetch,
): RemoteReadOnlyMockPort {
  const u = new URL(baseUrl);
  const port = Number(u.port);
  if (u.protocol !== "http:" || u.hostname !== "127.0.0.1" ||
      !/^[0-9]{1,5}$/.test(u.port) || !Number.isInteger(port) ||
      port < 1 || port > 65535 || u.pathname !== "/" || u.search !== "" ||
      u.hash !== "" || u.username !== "" || u.password !== "") {
    throw Error("D060 requires explicit disposable IPv4 loopback endpoint");
  }
  // No arbitrary base URLs, custom paths, redirects, cookies or auth headers.
  const origin = u.origin;
  async function getJson(path: string): Promise<unknown> {
    const response = await doFetch(origin + path, {
      method: "GET",
      redirect: "error",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw Error("Synthetic status read denied");
    if (response.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
      throw Error("Synthetic response has wrong content type");
    }
    const size = response.headers.get("content-length");
    if (size !== null && (!/^\d{1,5}$/.test(size) || Number(size) > MAX_JSON_BYTES)) {
      throw Error("Oversized synthetic response");
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("Missing synthetic response body");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        throw Error("Oversized synthetic response");
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(data) as unknown;
  }
  return {
    async list_devices(): Promise<readonly TestDevice[]> {
      const body = record(await getJson("/mock/devices"));
      return jsonList(body.devices, "devices").map(raw => {
        const d = record(raw);
        const status = d.status;
        if (status !== "online" && status !== "offline") {
          throw Error("Untrusted synthetic device state");
        }
        return { id: id(d.id), label: label(d.label), status };
      });
    },
    async list_pending_approvals(): Promise<readonly TestApproval[]> {
      const body = record(await getJson("/mock/approvals/pending"));
      return jsonList(body.approvals, "approvals").map(raw => {
        const d = record(raw);
        if (d.status !== "pending" || typeof d.approvalPageUrl !== "string" ||
            !isSafeDemoApprovalPage(d.approvalPageUrl)) {
          throw Error("Unsafe synthetic approval state or link");
        }
        return {
          id: id(d.id),
          deviceId: id(d.deviceId),
          label: label(d.label),
          status: "pending" as const,
          approvalPageUrl: d.approvalPageUrl,
        };
      });
    },
    async get_approval_status(approvalId: string): Promise<TestApprovalStatus> {
      id(approvalId);
      const body = record(await getJson("/mock/approvals/" + approvalId + "/status"));
      if (body.id !== approvalId || !["pending", "approved", "denied", "expired"].includes(String(body.status))) {
        throw Error("Untrusted synthetic approval status");
      }
      return { id: approvalId, status: body.status as TestApprovalStatus["status"] };
    },
    async job_status(jobId: string): Promise<TestJob> {
      id(jobId);
      const body = record(await getJson("/mock/jobs/" + jobId + "/status"));
      if (body.id !== jobId || !["pending", "succeeded", "failed", "denied", "unknown"].includes(String(body.status))) {
        throw Error("Untrusted synthetic job status");
      }
      return { id: jobId, deviceId: id(body.deviceId), status: body.status as TestJob["status"] };
    },
  };
}
