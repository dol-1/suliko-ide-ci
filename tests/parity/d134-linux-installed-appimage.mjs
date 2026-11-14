// D134: strict real official SHA-pinned Linux AppImage installed Hello own-panel.
// Disposable public standard Ubuntu CI ONLY. No owner machines, keys, Remote,
// shell/terminal actions, BB core changes, app publishing or beta endorsement.
import { _electron, expect } from "@playwright/test";
import { basename, resolve, isAbsolute, sep } from "node:path";
const env = process.env;
const bin = env.D134_OFFICIAL_APPIMAGE, tmp = env.RUNNER_TEMP, data = env.BB_DATA_DIR;
if (env.CI !== "true" || env.GITHUB_ACTIONS !== "true" || env.RUNNER_OS !== "Linux" ||
    env.BB_TELEMETRY !== "false" || !tmp || !bin || !isAbsolute(bin) || !data ||
    !resolve(bin).startsWith(resolve(tmp) + sep) ||
    !resolve(data).startsWith(resolve(tmp) + sep) ||
    basename(bin) !== "bb-0.49.0-x86_64.AppImage" ||
    env.D134_BB_WEB_URL !== "http://127.0.0.1:38906/" ||
    env.APPIMAGE_EXTRACT_AND_RUN !== "1") {
  throw Error("D134 refuses non-disposable official Linux AppImage GUI test");
}
const app = await _electron.launch({
  executablePath: resolve(bin),
  args: [],
  timeout: 60000,
  env: {
    ...env,
    BB_DATA_DIR: data,
    BB_SERVER_BIND_HOST: "127.0.0.1",
    BB_SERVER_PORT: "38906",
    BB_HOST_DAEMON_PORT: "38907",
    BB_DESKTOP_APP_URL: "http://127.0.0.1:38906",
    BB_DESKTOP_ATTACH_WITHOUT_PROMPT: "1",
    APPIMAGE_EXTRACT_AND_RUN: "1",
    BB_TELEMETRY: "false"
  }
});
try {
  const page = await app.firstWindow();
  const projects = page.getByRole("button", { name: /projects?/i }).first();
  await projects.waitFor({state: "visible", timeout: 60000});
  const skip = page.getByRole("button", {name: /skip setup/i}).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  if (await projects.isEnabled().catch(() => false)) {
    await projects.click();
    const synthetic = page.getByText(/d134-linux-synthetic/i).first();
    await synthetic.waitFor({state: "visible", timeout: 15000});
    await synthetic.click();
  }
  const hello = page.getByRole("link", {name: /suliko hello/i})
    .or(page.getByRole("button", {name: /suliko hello/i})).first();
  await expect(hello).toBeVisible({timeout: 45000});
  await hello.click();
  await expect(page.getByLabel("Suliko Hello panel")).toBeVisible({timeout: 20000});
  console.log("D134_OFFICIAL_INSTALLED_LINUX_HELLO_PANEL=PASS");
  await page.waitForTimeout(15000);
  if (app.process().exitCode !== null || page.isClosed()) {
    throw Error("D134 official installed Linux AppImage exited prematurely");
  }
  await expect(page.getByLabel("Suliko Hello panel")).toBeVisible();
  console.log("D134_OFFICIAL_INSTALLED_LINUX_GUI_15S=PASS");
} finally {
  await app.close();
}
