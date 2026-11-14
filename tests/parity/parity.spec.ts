import { _electron, chromium, expect, test as base, type Page } from "@playwright/test";
import { basename } from "node:path";

// Optional stock BB first-run setup offers an explicit, supported Skip setup
// action. In a synthetic provider-free CI fixture take that path, never submit
// provider keys, and preserve all 14 strict subsequent journey assertions.
async function enterProviderFreeShell(page: Page) {
  const projects = page.getByRole("button", { name: /projects?/i }).first();
  // In real packaged Linux Desktop QA run 43266035103, the renderer still
  // displayed the "Opening bb" splash after 12 seconds. The old catch
  // silently continued into J03/J04/J07 without a hydrated app shell.
  // Require the actual Projects control before every journey, preserving
  // strict assertions: an unready client now FAILS explicitly.
  await projects.waitFor({ state: "visible", timeout: 45000 });
  const skip = page.getByRole("button", { name: /skip setup/i }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  // Enroll ONLY the generated qa01-* project in the client UI: BB's thread
  // creation UI is project-scoped. No third-party provider, token or host used.
  // Stock BB retains the selected project across new attached Desktop windows.
  // Re-clicking the menu every time can leave a stale overlay intercepting
  // subsequent actions (source: packaged D066 Desktop E9 and QA diagnostics).
  // Keep *all* J01-J07 assertions identical; only avoid duplicate setup.
  const alreadySelected = page.getByRole("button", {
    name: /^Project:\s*qa01-(?:desktop-)?synthetic$/i,
  }).first();
  if (!(await alreadySelected.isVisible().catch(() => false))) {
    const projectNav = page.getByRole("button", { name: /projects?/i }).first();
    if (await projectNav.isVisible().catch(() => false)) {
      await projectNav.click();
      const synthetic = page.getByText(/qa01-(desktop-)?synthetic/i).first();
      if (await synthetic.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false))
        await synthetic.click();
    }
  }
}

const test = base.extend<{ appPage: Page }>({
  appPage: async ({}, use, info) => {
    if (info.project.name === "web") {
      const raw = process.env.BB_PARITY_WEB_URL;
      if (!raw) throw new Error("BB_PARITY_WEB_URL is required (disposable loopback BB server)");
      const url = new URL(raw);
      if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:") {
        throw new Error("Web parity tests require an explicit HTTP loopback URL");
      }
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ serviceWorkers: "block" });
      try {
        const page = await context.newPage();
        await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
        await enterProviderFreeShell(page);
        await use(page);
      } finally {
        await context.close();
        await browser.close();
      }
      return;
    }
    if (info.project.name !== "desktop") throw new Error("Unexpected parity target");
    const executablePath = process.env.BB_PARITY_ELECTRON_BINARY;
    const dataDir = process.env.BB_PARITY_DATA_DIR;
    if (!executablePath || !dataDir || !basename(dataDir).startsWith("bb-parity-")) {
      throw new Error("Packaged Electron path and disposable bb-parity-* data directory are required");
    }
    const electronApp = await _electron.launch({
      executablePath,
      args: [],
      env: {
        ...process.env,
        BB_DATA_DIR: dataDir,
        BB_SERVER_BIND_HOST: "127.0.0.1",
        BB_SERVER_PORT: "38888",
        BB_HOST_DAEMON_PORT: "38890",
        // Pin the package to our already-running disposable loopback server.
        // Stock BB supports this test-only explicit attach mode; no real user
        // account or external server approval is bypassed.
        BB_DESKTOP_APP_URL: "http://127.0.0.1:38888",
        BB_DESKTOP_ATTACH_WITHOUT_PROMPT: "1",
        BB_TELEMETRY: "false",
      },
    });
    try {
      const page = await electronApp.firstWindow();
      await enterProviderFreeShell(page);
      await use(page);
    } finally {
      await electronApp.close();
    }
  },
});

function navigation(page: Page, pattern: RegExp) {
  return page.getByRole("link", { name: pattern })
    .or(page.getByRole("button", { name: pattern }))
    .first();
}

// All journeys are read-only except opening UI panes in isolated fixtures.
// Full backend task execution belongs in separate provider-safe integration tests.
// Selectors are provisional against pinned stock BB 0.49.0 and MUST be reviewed
// against its actual accessible labels before treating any run as acceptance.

test("J01: application shell loads on both clients", async ({ appPage }) => {
  await expect(appPage.locator("#root")).toBeVisible();
});

test("J02: projects navigation is available", async ({ appPage }) => {
  await expect(navigation(appPage, /projects?/i)).toBeVisible();
});

test("J03: new thread opens a message composer", async ({ appPage }) => {
  const newThread = navigation(appPage, /new thread/i);
  await expect(newThread).toBeVisible();
  await newThread.click();
  await expect(appPage.getByRole("textbox").first()).toBeVisible();
});

test("J04: provider/model selection can be opened", async ({ appPage }) => {
  const picker = navigation(appPage, /provider|model/i);
  await expect(picker).toBeVisible();
  await picker.click();
  await expect(appPage.getByRole("dialog").or(appPage.getByRole("listbox")).first()).toBeVisible();
});

// Stock BB desktop-v0.49.0 deliberately routes Files and Terminal through
// "new tab" action search, not sidebar navigation. Upstream sources:
// RootComposeView useAppCommandHandler("file.quickOpen") opens NewTab;
// NewTabFileSearch renders file results as role=option; NewTabActions renders
// "Start terminal" as role=option when the project source host is connected.
// These tests now require ACTUAL file search + open, and ACTUAL terminal start,
// stronger than the previous nonexistent-sidebar-label assertions.
async function openStockFileLauncher(page: Page) {
  // The actual stock New Tab button was visible/clickable on BOTH Web and
  // packaged Desktop in GH 43533416898 post-journey diagnostic. An already
  // visible combobox alone does not prove the current launcher/tab is active:
  // always select the explicit stock New Tab action before a strict journey.
  const newTab = page.locator("button[data-panel-new-tab]").first();
  if (!(await newTab.isVisible().catch(() => false))) {
    const show = page.getByRole("button", { name: /Show right panel/i }).first();
    if (await show.isVisible().catch(() => false)) {
      await show.click();
    } else {
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+j");
    }
  }
  await expect(newTab).toBeVisible({ timeout: 10000 });
  await newTab.click();
  const search = page.getByRole("combobox", { name: /Search files/i }).first();
  await expect(search).toBeVisible({ timeout: 10000 });
  await expect(search).toBeEnabled();
  return search;
}

test("J05: workspace files/diff navigation exists", async ({ appPage }) => {
  const search = await openStockFileLauncher(appPage);
  // All diagnostic checkpoints are FIXED constants captured only inside
  // Playwright JSON; never print raw DOM, filenames, paths or errors.
  console.log("QA01_STAGE_J05_LAUNCHER");
  // The only file in the isolated repository is deterministic and harmless.
  await search.fill("README");
  const file = appPage.getByRole("group", { name: /^Files$/i })
    .getByRole("option", { name: /README\.md/i }).first();
  await expect(file).toBeVisible({ timeout: 15000 });
  console.log("QA01_STAGE_J05_OPTION");
  await file.click();
  console.log("QA01_STAGE_J05_CLICKED");
  // A real opened file tab is required, not just the application root.
  await expect(appPage.getByRole("button", { name: /README\.md/i })
    .and(appPage.locator('button[aria-pressed="true"]')).first())
    .toBeVisible({ timeout: 10000 });
  console.log("QA01_STAGE_J05_SELECTED");
});

test("J06: terminal affordance exists with an enrolled disposable host", async ({ appPage }) => {
  const search = await openStockFileLauncher(appPage);
  console.log("QA01_STAGE_J06_LAUNCHER");
  // Pinned stock NewTabFileSearch only exposes action role=option after a matching query.
  // Empty-query actions are separate buttons; exercise the actual accessible search flow.
  await search.fill("terminal");
  const terminal = appPage.getByRole("option", { name: /Start terminal/i }).first();
  await expect(terminal).toBeVisible({ timeout: 10000 });
  await expect(terminal).toBeEnabled();
  console.log("QA01_STAGE_J06_OPTION");
  // Do not execute commands; starting a disposable terminal UI is sufficient.
  await terminal.click();
  console.log("QA01_STAGE_J06_CLICKED");
  await expect(appPage.getByRole("button", { name: /terminal/i })
    .and(appPage.locator('button[aria-pressed="true"]')).first())
    .toBeVisible({ timeout: 10000 });
  console.log("QA01_STAGE_J06_SELECTED");
});

test("J07: Suliko Hello plugin panel appears on both clients", async ({ appPage }) => {
  // Requires approved test-only plugin install; no production/private auth.
  const panel = navigation(appPage, /suliko hello/i);
  await expect(panel).toBeVisible();
  await panel.click();
  await expect(appPage.getByLabel("Suliko Hello panel")).toBeVisible();
});