import { _electron, chromium, expect, test as base, type Page } from "@playwright/test";
import { basename } from "node:path";

// Optional stock BB first-run setup offers an explicit, supported Skip setup
// action. In a synthetic provider-free CI fixture take that path, never submit
// provider keys, and preserve all 14 strict subsequent journey assertions.
async function enterProviderFreeShell(page: Page) {
  const projects = page.getByRole("button", { name: /projects?/i }).first();
  await projects.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const skip = page.getByRole("button", { name: /skip setup/i }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  // Enroll ONLY the generated qa01-* project in the client UI: BB's thread
  // creation UI is project-scoped. No third-party provider, token or host used.
  const projectNav = page.getByRole("button", { name: /projects?/i }).first();
  if (await projectNav.isVisible().catch(() => false)) {
    await projectNav.click();
    const synthetic = page.getByText(/qa01-(desktop-)?synthetic/i).first();
    if (await synthetic.waitFor({ state: "visible", timeout: 2500 }).then(() => true).catch(() => false))
      await synthetic.click();
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

test("J05: workspace files/diff navigation exists", async ({ appPage }) => {
  const files = navigation(appPage, /files|changes|diff/i);
  await expect(files).toBeVisible();
  await files.click();
  await expect(appPage.getByRole("main").or(appPage.locator("#root")).first()).toBeVisible();
});

test("J06: terminal affordance exists with an enrolled disposable host", async ({ appPage }) => {
  // Requires fixture worktree+host; absence fails the test (no silent skip).
  await expect(navigation(appPage, /terminal/i)).toBeVisible();
});

test("J07: Suliko Hello plugin panel appears on both clients", async ({ appPage }) => {
  // Requires approved test-only plugin install; no production/private auth.
  const panel = navigation(appPage, /suliko hello/i);
  await expect(panel).toBeVisible();
  await panel.click();
  await expect(appPage.getByLabel("Suliko Hello panel")).toBeVisible();
});