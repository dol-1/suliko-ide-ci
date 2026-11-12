// QA-01 diagnostic only: no changes to the 14 journey assertions.
import { chromium, _electron } from "@playwright/test";
import { basename } from "node:path";

function sanitize(value) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:gh[ps]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/gi, "[secret]")
    .replace(/(?:\/home\/|\/Users\/|C:\\Users\\)[^\s]+/g, "[home]")
    .trim().replace(/\s+/g, " ").slice(0, 70);
}
async function observe(page, target, stage) {
  const controls = await page.locator("a,button,[role=button],[role=link],h1,h2").evaluateAll((nodes) =>
    nodes.slice(0, 60).map((node) => ({
      role: node.getAttribute("role") || node.tagName.toLowerCase(),
      label: node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent || "",
    })),
  );
  const names = controls.map(({ role, label }) => ({ role: sanitize(role), label: sanitize(label) }))
    .filter(({ label }) => label && !label.includes("[secret]")).slice(0, 40);
  console.log("QA01_DOM_DIAGNOSTIC", JSON.stringify({
    target, stage, pathname: sanitize(new URL(page.url()).pathname), names,
  }));
}
async function diagnose(page, target) {
  await page.waitForLoadState("domcontentloaded");
  await observe(page, target, "initial");
  const projects = page.getByRole("link", { name: /projects?/i })
    .or(page.getByRole("button", { name: /projects?/i })).first();
  // Diagnostic only: client-side hydration can lag DOMContentLoaded. Never
  // use this wait to skip, weaken, retry or rewrite a parity assertion.
  const ready = await projects.waitFor({ state: "visible", timeout: 12000 })
    .then(() => true).catch(() => false);
  await observe(page, target, "after-hydration-wait");
  // A visible Projects control may still be DISABLED by stock onboarding.
  // A diagnostic must never burn 30 seconds attempting that click and thereby
  // prevent capture of the second (Desktop) client.
  const enabled = ready && await projects.isEnabled().catch(() => false);
  const skip = page.getByRole("button", { name: /skip setup/i }).first();
  const skipVisible = await skip.isVisible().catch(() => false);
  console.log("QA01_DIAG_NAV_STATE", JSON.stringify({
    target, projectsVisible: ready, projectsEnabled: enabled, skipSetupVisible: skipVisible,
  }));
  if (enabled) {
    await projects.click({ timeout: 5000 });
    await observe(page, target, "after-projects-nav");
  } else {
    console.log("QA01_DIAG_SKIPPED_DISABLED_NAV", target);
  }
}
const webUrl = new URL(process.env.BB_PARITY_WEB_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(webUrl.hostname) || webUrl.protocol !== "http:") throw Error("Loopback Web only");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(webUrl.toString(), { waitUntil: "domcontentloaded" });
  await diagnose(page, "web");
} finally { await browser.close(); }
const bin = process.env.BB_PARITY_ELECTRON_BINARY;
const data = process.env.BB_PARITY_DATA_DIR;
if (!bin || !data || !basename(data).startsWith("bb-parity-")) throw Error("Disposable packaged Desktop required");
const desktop = await _electron.launch({
  executablePath: bin,
  env: { ...process.env, BB_DATA_DIR: data, BB_SERVER_BIND_HOST: "127.0.0.1", BB_TELEMETRY: "false" },
});
try { await diagnose(await desktop.firstWindow(), "desktop"); }
finally { await desktop.close(); }
