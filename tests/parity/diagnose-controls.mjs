// QA-01 read-only diagnostic against disposable synthetic BB fixtures.
// Logs only short sanitized names of accessible controls; never raw DOM or keys.
import { chromium, _electron } from "@playwright/test";
import { basename } from "node:path";

function sanitize(value) {
  return String(value ?? "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:gh[ps]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|Bearer\\s+\\S+)/gi, "[secret]")
    .replace(/(?:\\/home\\/|\\/Users\\/|C:\\\\Users\\\\)[^\\s]+/g, "[home]")
    .trim().replace(/\\s+/g, " ").slice(0, 70);
}
async function observe(page, target, stage) {
  const rows = await page.locator("a,button,[role=button],[role=link],h1,h2").evaluateAll((nodes) =>
    nodes.slice(0, 60).map((element) => ({
      role: element.getAttribute("role") || element.tagName.toLowerCase(),
      label: element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "",
    })),
  );
  const names = rows.map(({ role, label }) => ({ role: sanitize(role), label: sanitize(label) }))
    .filter(({ label }) => label && !label.includes("[secret]")).slice(0, 40);
  console.log("QA01_DOM_DIAGNOSTIC", JSON.stringify({ target, stage, pathname: sanitize(new URL(page.url()).pathname), names }));
}
async function diagnose(page, target) {
  await page.waitForLoadState("domcontentloaded");
  await observe(page, target, "initial");
  const projects = page.getByRole("link", { name: /projects?/i })
    .or(page.getByRole("button", { name: /projects?/i })).first();
  if (await projects.isVisible().catch(() => false)) {
    await projects.click();
    await observe(page, target, "after-projects-nav");
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
const desktop = await _electron.launch({ executablePath: bin, env: { ...process.env, BB_DATA_DIR: data, BB_SERVER_BIND_HOST: "127.0.0.1", BB_TELEMETRY: "false" } });
try { await diagnose(await desktop.firstWindow(), "desktop"); }
finally { await desktop.close(); }
