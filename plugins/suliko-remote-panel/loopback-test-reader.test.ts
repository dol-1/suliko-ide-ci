import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import { createTestOnlyLoopbackReader } from "./loopback-test-reader.js";

describe("D060 isolated actual HTTP read-only synthetic Remote transport", () => {
  let server: Server;
  let url: string;
  let mode: "normal" | "redirect" | "oversize" | "forged-job" | "unsafe-link";
  let seen: Array<{ method: string | undefined; url: string | undefined; authorization: string | undefined }>;

  beforeEach(async () => {
    mode = "normal";
    seen = [];
    server = createServer((req, res) => {
      seen.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
      if (req.method !== "GET") {
        res.writeHead(405).end();
        return;
      }
      if (mode === "redirect") {
        res.writeHead(302, { Location: "https://example.invalid/forbidden" }).end();
        return;
      }
      const approvalLink = mode === "unsafe-link"
        ? "https://untrusted.example/approve"
        : "https://remote.example.invalid/approvals/demo-approval-1";
      const response =
        req.url === "/mock/devices" ? { devices: [
          { id: "demo-device-1", label: "Disposable Test Host", status: "offline" },
        ] } :
        req.url === "/mock/approvals/pending" ? { approvals: [
          { id: "demo-approval-1", deviceId: "demo-device-1", label: "Demo request", status: "pending", approvalPageUrl: approvalLink },
        ] } :
        req.url === "/mock/approvals/demo-approval-1/status" ? { id: "demo-approval-1", status: "pending" } :
        req.url === "/mock/jobs/demo-job-1/status" ? {
          id: "demo-job-1", deviceId: "demo-device-1",
          status: mode === "forged-job" ? "approved" : "unknown",
        } : null;
      if (response === null) {
        res.writeHead(404).end();
        return;
      }
      const payload = JSON.stringify(mode === "oversize" ? { ...response, padding: "X".repeat(10000) } : response);
      res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }).end(payload);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    url = "http://127.0.0.1:" + addr.port + "/";
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it("reads exactly four allowlisted synthetic GET endpoints and never sends credentials or writes", async () => {
    const c = createTestOnlyLoopbackReader(url);
    expect((await c.list_devices())[0]?.status).toBe("offline");
    expect((await c.list_pending_approvals())[0]?.id).toBe("demo-approval-1");
    expect((await c.get_approval_status("demo-approval-1")).status).toBe("pending");
    expect((await c.job_status("demo-job-1")).status).toBe("unknown");
    expect(Object.keys(c).sort()).toEqual(["get_approval_status","job_status","list_devices","list_pending_approvals"]);
    expect(seen.map(r => r.url)).toEqual([
      "/mock/devices", "/mock/approvals/pending",
      "/mock/approvals/demo-approval-1/status", "/mock/jobs/demo-job-1/status",
    ]);
    expect(seen.every(r => r.method === "GET" && r.authorization === undefined)).toBe(true);
  });

  it("rejects external origins, credentials, path prefixes, query and missing explicit ports before HTTP", () => {
    const invalid = [
      "https://remote.example.invalid:443/", "http://localhost:8181/",
      "http://127.0.0.1/", "http://127.0.0.1:8181/extra",
      "http://user:pass@127.0.0.1:8181/", "http://127.0.0.1:8181/?api_key=foo",
      "http://127.0.0.1:8181/#token", "http://127.0.0.1:0/",
    ];
    for (const bad of invalid) expect(() => createTestOnlyLoopbackReader(bad)).toThrow(/loopback/);
    expect(seen).toHaveLength(0);
  });

  it("rejects path traversal IDs without any request", async () => {
    const c = createTestOnlyLoopbackReader(url);
    await expect(c.job_status("../secret")).rejects.toThrow(/identifier/);
    await expect(c.get_approval_status("demo?token=foo")).rejects.toThrow(/identifier/);
    expect(seen).toHaveLength(0);
  });

  it("fails closed for synthetic redirect; never follows an off-loopback link", async () => {
    mode = "redirect";
    await expect(createTestOnlyLoopbackReader(url).list_devices()).rejects.toThrow();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe("/mock/devices");
  });

  it("fails closed for a too-large actual HTTP response", async () => {
    mode = "oversize";
    await expect(createTestOnlyLoopbackReader(url).list_devices()).rejects.toThrow(/Oversized/);
  });

  it("rejects forged 'approved' job results and unsafe approval URLs", async () => {
    const c = createTestOnlyLoopbackReader(url);
    mode = "forged-job";
    await expect(c.job_status("demo-job-1")).rejects.toThrow(/Untrusted/);
    mode = "unsafe-link";
    await expect(c.list_pending_approvals()).rejects.toThrow(/Unsafe/);
  });
});
