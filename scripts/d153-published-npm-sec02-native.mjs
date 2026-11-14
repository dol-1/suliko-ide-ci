import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

// D153: actual *published* immutable-version upstream bb-app CLI on two native
// free public CI OSes. No provider, owner machine, Remote, BB core edit or GUI
// install. Registry digest is a candidate, not proof of publisher identity.
const category = (reason) => { throw Object.assign(new Error("D153"), { category: reason }); };
const root = process.env.RUNNER_TEMP;
if (!root || !path.isAbsolute(root) || !fs.existsSync(root)) category("missing-runner-temp");
if (!["win32", "darwin"].includes(process.platform)) category("unsupported-native-os");
if (process.versions.node !== "22.19.0") category("node-version");
const pkg = path.join(root, "d153-published-pkg");
const home = path.join(root, "d153-isolated-home");
const data = path.join(home, "bb-disposable");
if (fs.existsSync(pkg) || fs.existsSync(home)) category("unexpected-existing-test-path");
fs.mkdirSync(pkg, { recursive: false, mode: 0o700 });
fs.mkdirSync(data, { recursive: true, mode: 0o700 });
const env = {
  ...process.env,
  HOME: home,
  BB_DATA_DIR: data,
  BB_TELEMETRY: "false",
  BB_SERVER_BIND_HOST: "127.0.0.1",
  BB_SERVER_PORT: "39061",
  BB_HOST_DAEMON_PORT: "39062",
};
function npm(args, maxMs) {
  // GitHub's stock Win2025 exposes npm.cmd, while macOS has executable npm.
  // All arguments are fixed in CI except a path derived from RUNNER_TEMP.
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    env,
    cwd: root,
    timeout: maxMs,
    windowsHide: true,
    shell: process.platform === "win32",
    maxBuffer: 2_000_000,
  });
  if (result.status !== 0 || result.error) category("npm-operation");
  return result.stdout;
}
const metadata = JSON.parse(npm(["view", "bb-app@0.49.0", "--json"], 60_000));
if (metadata.name !== "bb-app" || metadata.version !== "0.49.0" ||
    !/^sha512-[A-Za-z0-9+/]+=*$/.test(metadata.dist?.integrity || "")) {
  category("registry-metadata");
}
npm(["--prefix", pkg, "install", "--no-audit", "--no-fund", "--save-exact", "bb-app@0.49.0"], 8 * 60_000);
const pkgRoot = path.join(pkg, "node_modules", "bb-app");
const manifest = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
assert.equal(manifest.name, "bb-app");
assert.equal(manifest.version, "0.49.0");
if (typeof manifest.bin?.bb !== "string" || typeof manifest.bin?.["bb-app"] !== "string") {
  category("published-executable-metadata");
}
function bin(relative) {
  const full = path.resolve(pkgRoot, relative);
  if (!full.startsWith(pkgRoot + path.sep) || !fs.statSync(full).isFile()) category("bin-path");
  return full;
}
const bb = bin(manifest.bin.bb);
const app = bin(manifest.bin["bb-app"]);
const launchArgs = [app, "start", "--data-dir", data, "--server-bind-host", "127.0.0.1",
  "--server-port", "39061", "--host-daemon-port", "39062", "--no-in-app-updates"];
const server = spawn(process.execPath, launchArgs, { env, cwd: root, stdio: "ignore", windowsHide: true });
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function stop() {
  try {
    spawnSync(process.execPath, [app, "stop", "--data-dir", data],
      { env, cwd: root, timeout: 20000, windowsHide: true, stdio: "ignore" });
  } finally {
    if (server.exitCode === null) server.kill();
  }
}
try {
  let found = null;
  for (let i = 0; i < 60; i++) {
    const call = spawnSync(process.execPath, [bb, "plugin", "list", "--json"], {
      env, cwd: root, encoding: "utf8", timeout: 8000, maxBuffer: 2_000_000,
      windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
    });
    if (call.status === 0) {
      try {
        const state = JSON.parse(call.stdout);
        if (Array.isArray(state.plugins)) { found = state; break; }
      } catch {}
    }
    await wait(2000);
  }
  if (!found) category("native-cli-not-ready");
  // Require real independently reachable HTTP loopback, not mere JSON fixture.
  const response = await fetch("http://127.0.0.1:39061/", { signal: AbortSignal.timeout(5000) })
    .catch(() => null);
  if (!response || !response.ok) category("loopback-http");
  if (!Array.isArray(found.plugins)) category("plugin-list-shape");
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace || !path.isAbsolute(workspace)) category("missing-public-workspace");
  const fixture = path.join(workspace, "plugins", "suliko-hello");
  const fixturePackage = JSON.parse(fs.readFileSync(path.join(fixture, "package.json"), "utf8"));
  if (fixturePackage.name !== "bb-plugin-suliko-hello" ||
      fixturePackage.engines?.bb !== ">=0.49.0 <0.49.1" ||
      fixturePackage.devDependencies?.["@get-bb/plugin-sdk"] !== "0.6.132") {
    category("unreviewed-own-plugin-fixture");
  }
  function invokeBB(args, deadline = 40000) {
    const out = spawnSync(process.execPath, [bb, ...args], {
      env, cwd: workspace, encoding: "utf8", timeout: deadline, windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"], maxBuffer: 2_000_000,
    });
    if (out.status !== 0 || out.error) category("published-bb-cli-operation");
    return out.stdout;
  }
  const forbidden = ["bb--mcp", "account-pool", "connect", "bb--connect-next", "memory"];
  for (const id of forbidden) {
    const items = found.plugins.filter(x => x.id === id);
    if (items.length > 1) category("duplicate-forbidden-id");
    if (items.length === 1 && items[0].enabled === true) invokeBB(["plugin", "disable", id]);
  }
  invokeBB(["plugin", "install", fixture, "--yes"], 90000);
  const after = JSON.parse(invokeBB(["plugin", "list", "--json"]));
  if (!Array.isArray(after.plugins)) category("published-plugins-after-install");
  for (const id of forbidden) {
    const rows = after.plugins.filter(x => x.id === id);
    if (rows.length > 1 ||
        rows.length === 1 && (rows[0].enabled !== false || rows[0].status !== "disabled")) {
      category("forbidden-stock-plugin-active");
    }
  }
  const hello = after.plugins.filter(x => x.id === "suliko-hello" || x.id === "bb-plugin-suliko-hello");
  if (hello.length !== 1 || hello[0].enabled !== true) category("own-hello-not-enabled");
  console.log("D153_PUBLISHED_NATIVE_SEC02_HELLO=PASS");
  console.log("D153_PUBLISHED_NPM_NATIVE_LOOPBACK=PASS");
  console.log("D153_PUBLISHED_NPM_OS=" + (process.platform === "win32" ? "windows-2025" : "macos-15"));
  console.log("D153_SCOPE=real-published-native-SEC02-and-local-Hello; no-packaged-GUI-no-user-installer-no-RC-no-beta");
} catch (e) {
  console.error("D153_PUBLISHED_NPM_NATIVE=FAIL category=" + (e.category || "runtime"));
  process.exitCode = 1;
} finally {
  await stop();
}
