import { _electron, expect, test, type ElectronApplication } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

let app: ElectronApplication;
let tempData: string;

test.beforeAll(async () => {
  const binary = process.env.BB_SEC03_ELECTRON_BINARY;
  if (!binary) throw new Error("BB_SEC03_ELECTRON_BINARY must reference a reviewed packaged stock BB 0.49.0 executable");
  tempData = mkdtempSync(resolve(tmpdir(), "bb-sec03-"));
  app = await _electron.launch({
    executablePath: binary,
    args: [],
    env: {
      ...process.env,
      BB_DATA_DIR: tempData,
      BB_SERVER_BIND_HOST: "127.0.0.1",
      BB_TELEMETRY: "false",
      BB_DESKTOP_AUTO_UPDATE: "0",
    },
  });
  await app.firstWindow();
});

test.afterAll(async () => {
  try { await app?.close(); } finally {
    if (tempData) rmSync(tempData, { recursive: true, force: true });
  }
});

type ProbeResult = { ok: true; value: unknown } | { ok: false; error: string };

async function foreignWindowIpc(channel: string, payload?: unknown, iframe = false): Promise<ProbeResult> {
  // Test-owned disposable renderer deliberately has an IPC-capable test preload.
  // BB's real preload/core is NOT modified; the test is a sender-authentication probe.
  return app.evaluate(async ({ BrowserWindow }, args) => {
    const foreign = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: args.preload,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        nodeIntegrationInSubFrames: args.iframe,
        webSecurity: true,
      },
    });
    try {
      const html = args.iframe ? "<html><body><iframe srcdoc='<p>subframe</p>'></iframe></body></html>" : "<html><body>synthetic foreign renderer</body></html>";
      await foreign.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
      const invocation = "window.sec03Probe.invoke(" + JSON.stringify(args.channel) + "," + JSON.stringify(args.payload) + ").then(value=>({ok:true,value}),error=>({ok:false,error:String(error)}))";
      const expression = args.iframe
        ? "(async()=>{const frame=document.querySelector('iframe');await new Promise((res,rej)=>{if(frame.contentDocument?.readyState==='complete')res();else {frame.onload=res;setTimeout(()=>rej(Error('subframe not ready')),10000)}});return frame.contentWindow.eval(" + JSON.stringify(invocation) + ")})()"
        : invocation;
      return await foreign.webContents.executeJavaScript(expression, true);
    } finally {
      foreign.destroy();
    }
  }, {
    channel,
    payload: payload ?? null,
    iframe,
    preload: resolve("foreign-preload.cjs"),
  });
}

test("IPC-01: a foreign window must not query privileged desktop information", async () => {
  // Source hypothesis: main.ts GET_INFO lacks explicit sender/frame verification.
  const response = await foreignWindowIpc("bb-desktop:get-info");
  expect(response.ok, JSON.stringify(response)).toBe(false);
});

test("IPC-02: foreign window may not read available server choices", async () => {
  // Positive control in pinned server-choice-ipc.ts checks approved window IDs.
  const response = await foreignWindowIpc("bb-desktop:get-server-choices");
  expect(response.ok, JSON.stringify(response)).toBe(false);
});

test("IPC-03: foreign window may not perform privileged clipboard write", async () => {
  // Uses synthetic marker only; no secrets, credentials or external OS calls.
  const response = await foreignWindowIpc("bb-desktop:write-clipboard", { text: "SEC03-UNAUTHORIZED-FIXTURE" });
  expect(response.ok, JSON.stringify(response)).toBe(false);
});

test("IPC-04: foreign window cannot reach tab page evaluation", async () => {
  // This schema-valid request has no real tab ID. Authorization should reject
  // *before* a tab lookup; if only a non-existent tab is rejected, further
  // isolation review is still required.
  const response = await foreignWindowIpc("bb-desktop:browser:evaluate", {
    tabId: "sec03-nonexistent-tab", expression: "1", world: "isolated", channel: "sec03",
  });
  expect(response.ok, JSON.stringify(response)).toBe(true);
  if (response.ok) {
    const result = response.value as { ok?: unknown; error?: unknown } | null;
    expect(result?.ok).toBe(false);
    expect(String(result?.error ?? "")).toMatch(/window|unauthori[sz]ed|not available|denied/i);
  }
});

test("IPC-05: foreign subframe cannot read server choices", async () => {
  const response = await foreignWindowIpc("bb-desktop:get-server-choices", null, true);
  expect(response.ok, JSON.stringify(response)).toBe(false);
});
