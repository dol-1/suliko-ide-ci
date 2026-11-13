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
  let controls = null;
  // Electron can navigate away from "Opening bb" DURING evaluateAll.
  // Retry bounded read-only capture; never report an unavailable snapshot
  // as empty or as an assertion pass.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      controls = await page.locator("a,button,[role=button],[role=link],h1,h2").evaluateAll((nodes) =>
        nodes.slice(0, 60).map((node) => ({
          role: node.getAttribute("role") || node.tagName.toLowerCase(),
          label: node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent || "",
        })),
      );
      break;
    } catch {
      if (attempt < 2) await page.waitForTimeout(300).catch(() => {});
    }
  }
  if (!controls) {
    console.log("QA01_DIAG_CAPTURE_UNAVAILABLE", JSON.stringify({ target, stage }));
    return;
  }
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
  const ready = await projects.waitFor({ state: "visible", timeout: 45000 })
    .then(() => true).catch(() => false);
  await observe(page, target, "after-hydration-wait");
  // Reproduce the exact provider-free onboarding action in the disposable
  // strict fixture. Do not register any provider or submit credentials.
  const skip = page.getByRole("button", { name: /skip setup/i }).first();
  const skipVisible = await skip.isVisible().catch(() => false);
  const skipped = skipVisible
    ? await skip.click({ timeout: 5000 }).then(() => true).catch(() => false)
    : false;
  // The control is sometimes disabled until the synthetic setup is skipped.
  const enabled = ready && await projects.isEnabled().catch(() => false);
  console.log("QA01_DIAG_NAV_STATE", JSON.stringify({
    target, projectsVisible: ready, projectsEnabled: enabled, skipSetupVisible: skipVisible,
    syntheticSkipClicked: skipped,
  }));
  let projectSelected = false;
  if (enabled) {
    const navigated = await projects.click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (navigated) {
      await observe(page, target, "after-projects-nav");
      const synthetic = page.getByText(/qa01-(desktop-)?synthetic/i).first();
      if (await synthetic.isVisible().catch(() => false)) {
        projectSelected = await synthetic.click({ timeout: 5000 }).then(() => true).catch(() => false);
        if (projectSelected) await observe(page, target, "after-synthetic-project");
      }
    }
  } else {
    console.log("QA01_DIAG_SKIPPED_DISABLED_NAV", target);
  }
  // Diagnostic-only booleans: no arbitrary text, credentials, runtime paths,
  // screenshots or test assertion modifications.
  const visible = async (pattern) => {
    const link = page.getByRole("link", { name: pattern });
    const button = page.getByRole("button", { name: pattern });
    return (await link.count()) > 0 && await link.first().isVisible().catch(() => false)
      || (await button.count()) > 0 && await button.first().isVisible().catch(() => false);
  };
  console.log("QA01_DIAG_FEATURE_PREREQS", JSON.stringify({
    target,
    syntheticProjectSelected: projectSelected,
    syntheticProjectVisible: await page.getByText(/qa01-(desktop-)?synthetic/i).first().isVisible().catch(() => false),
    filesNavigationVisible: await visible(/files|changes|diff/i),
    terminalNavigationVisible: await visible(/terminal/i),
    helloNavigationVisible: await visible(/suliko hello/i),
    createThreadVisible: await visible(/new thread/i),
    providerPickerVisible: await visible(/provider|model/i),
  }));
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
  // Match the exact disposable Desktop attach setup used by parity.spec.ts.
  // Otherwise the diagnostic observes a different Electron splash state.
  env: {
    ...process.env,
    BB_DATA_DIR: data,
    BB_SERVER_BIND_HOST: "127.0.0.1",
    BB_SERVER_PORT: "38888",
    BB_HOST_DAEMON_PORT: "38890",
    BB_DESKTOP_APP_URL: "http://127.0.0.1:38888",
    BB_DESKTOP_ATTACH_WITHOUT_PROMPT: "1",
    BB_TELEMETRY: "false",
  },
});
try { await diagnose(await desktop.firstWindow(), "desktop"); }
finally { await desktop.close(); }
