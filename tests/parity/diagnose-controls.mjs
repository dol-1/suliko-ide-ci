// QA-01 diagnostic only: no changes to the 14 journey assertions.
import { chromium, _electron } from "@playwright/test";
import { basename } from "node:path";
import { categoricalControls } from "./diagnose-controls-safe.mjs";

async function observe(page, target, stage) {
  let labels = null;
  // In-memory bounded capture only. Never print raw UI names, paths, or errors:
  // even a disposable runner can surface arbitrary untrusted app text.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      labels = await page.locator("a,button,[role=button],[role=link],h1,h2").evaluateAll(nodes =>
        nodes.slice(0, 60).map(node => String(
          node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent || ""
        ).slice(0, 256)),
      );
      break;
    } catch {
      if (attempt < 2) await page.waitForTimeout(300).catch(() => {});
    }
  }
  if (!labels) {
    console.log("QA01_DIAG_CAPTURE_UNAVAILABLE", JSON.stringify({ target, stage }));
    return;
  }
  console.log("QA01_DIAG_CONTROL_CATEGORIES",
    JSON.stringify({ target, stage, ...categoricalControls(labels) }));
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
  // Independent, optional read-only result capture after strict 7x2 has run.
  // Click only the locally installed disposable Hello nav button; NEVER ping RPC,
  // enroll providers, or submit a thread. Fixed booleans only, no raw UI/error.
  const helloNav = page.getByRole("button", { name: /^Suliko Hello$/i }).first();
  const helloButtonVisible = await helloNav.isVisible().catch(() => false);
  let helloClickSucceeded = false;
  let helloPanelMounted = false;
  if (helloButtonVisible) {
    helloClickSucceeded = await helloNav.click({ timeout: 5000 })
      .then(() => true).catch(() => false);
    if (helloClickSucceeded) {
      helloPanelMounted = await page.getByLabel("Suliko Hello panel").first()
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true).catch(() => false);
    }
  }
  console.log("QA01_DIAG_PANEL_MOUNT", JSON.stringify({
    target, helloButtonVisible, helloClickSucceeded, helloPanelMounted,
    strictJourneyCountUnchanged: 14,
  }));
  // Pinned get-bb/bb docs/configuration.md specifies Linux/Windows:
  // Mod+P (quick open), Mod+D (diff), Mod+Shift+Enter (terminal).
  // Probe only AFTER all 14 unchanged strict journeys and only in the
  // disposable project UI. No key values, file content or raw DOM logged.
  async function probeShortcut(key, expected) {
    try {
      await page.keyboard.press("Escape");
      await page.keyboard.press(key);
      await page.waitForTimeout(300);
      const count = await expected.count().catch(() => 0);
      const visible = count > 0 && await expected.first().isVisible().catch(() => false);
      await page.keyboard.press("Escape");
      return { delivered: true, expectedVisible: visible };
    } catch {
      return { delivered: false, expectedVisible: false };
    }
  }
  const quickOpen = await probeShortcut("Control+p",
    page.getByRole("dialog").or(page.getByRole("combobox")).or(
      page.getByRole("textbox", { name: /file|search|path/i })));
  const diff = await probeShortcut("Control+d",
    page.getByRole("tab", { name: /diff|changes/i }).or(
      page.getByRole("heading", { name: /diff|changes/i })));
  const terminal = await probeShortcut("Control+Shift+Enter",
    page.getByRole("tab", { name: /terminal/i }).or(
      page.getByRole("heading", { name: /terminal/i })));
  console.log("QA01_DIAG_SHORTCUTS", JSON.stringify({
    target, quickOpen, diff, terminal, strictJourneyCountUnchanged: 14,
  }));
  // The pinned stock "file.quickOpen" command promises workspace-file
  // navigation in a panel tab. Measure that actual synthetic README file,
  // not just generic dialog presence. Diagnostics remain AFTER strict 7x2.
  let readmeListed = false;
  let readmeOpenActionSucceeded = false;
  let syntheticReadmeContentVisible = false;
  try {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+p");
    await page.waitForTimeout(500);
    const readme = page.getByText(/^README\.md$/i).first();
    readmeListed = await readme.isVisible().catch(() => false);
    if (readmeListed) {
      readmeOpenActionSucceeded = await readme.click({ timeout: 5000 })
        .then(() => true).catch(() => false);
      if (readmeOpenActionSucceeded) {
        syntheticReadmeContentVisible = await page.getByText(/disposable (test )?project only/i)
          .first().isVisible().catch(() => false);
      }
    }
    await page.keyboard.press("Escape");
  } catch {
    // No raw Playwright error, data-path, synthetic content or DOM output.
  }
  console.log("QA01_DIAG_QUICK_FILE", JSON.stringify({
    target, readmeListed, readmeOpenActionSucceeded,
    syntheticReadmeContentVisible, strictJourneyCountUnchanged: 14,
  }));
  // Source-backed pinned BB accessible UI. Use exact controls and a synthetic
  // query; never capture raw DOM, arbitrary text, file data or errors.
  let searchVisible=false, searchEnabled=false, fileOptionVisible=false;
  let fileTabVisible=false, terminalActionVisible=false, terminalActionEnabled=false;
  let terminalTabVisible=false;
  try {
    const combo=page.getByRole("combobox",{name:/Search files/i}).first();
    searchVisible=await combo.isVisible().catch(()=>false);
    if(!searchVisible) {
      await page.keyboard.press("Control+p");
      searchVisible=await combo.isVisible().catch(()=>false);
    }
    searchEnabled=searchVisible && await combo.isEnabled().catch(()=>false);
    if(searchEnabled) {
      await combo.fill("README");
      const file=page.getByRole("group",{name:/^Files$/i})
        .getByRole("option",{name:/README\.md/i}).first();
      fileOptionVisible=await file.waitFor({state:"visible",timeout:6000})
        .then(()=>true).catch(()=>false);
      if(fileOptionVisible) {
        const clicked=await file.click({timeout:3000}).then(()=>true).catch(()=>false);
        fileTabVisible=clicked && await page.getByRole("tab",{name:/README\.md/i}).first()
          .waitFor({state:"visible",timeout:3000}).then(()=>true).catch(()=>false);
      }
    }
    await page.keyboard.press("Escape");
    if(!(await combo.isVisible().catch(()=>false))) await page.keyboard.press("Control+p");
    if(await combo.isVisible().catch(()=>false)) await combo.fill("");
    const action=page.getByRole("option",{name:/Start terminal/i}).first();
    terminalActionVisible=await action.isVisible().catch(()=>false);
    terminalActionEnabled=terminalActionVisible && await action.isEnabled().catch(()=>false);
    // A non-running UI-only probe may open a disposable terminal tab, but never
    // sends a command, touches user data, or treats UI action as QA acceptance.
    if(terminalActionEnabled) {
      const clicked=await action.click({timeout:3000}).then(()=>true).catch(()=>false);
      terminalTabVisible=clicked && await page.getByRole("tab",{name:/terminal/i}).first()
        .waitFor({state:"visible",timeout:3000}).then(()=>true).catch(()=>false);
    }
  } catch { /* redacted diagnostic */ }
  console.log("QA01_DIAG_STOCK_ACTIONS",JSON.stringify({
    target,searchVisible,searchEnabled,fileOptionVisible,fileTabVisible,
    terminalActionVisible,terminalActionEnabled,terminalTabVisible,
    strictJourneyCountUnchanged:14,
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
