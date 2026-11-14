import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

// D150: actual *published* immutable-version upstream bb-app CLI on two native
// free public CI OSes. No provider, owner machine, Remote, BB core edit or GUI
// install. Registry digest is a candidate, not proof of publisher identity.
const category = (reason) => { throw Object.assign(new Error("D150"), { category: reason }); };
const root = process.env.RUNNER_TEMP;
if (!root || !path.isAbsolute(root) || !fs.existsSync(root)) category("missing-runner-temp");
if (!["win32", "darwin"].includes(process.platform)) category("unsupported-native-os");
if (process.versions.node !== "22.19.0") category("node-version");
const pkg = path.join(root, "d150-published-pkg");
const home = path.join(root, "d150-isolated-home");
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
  // Never shell-expand CLI arguments: the earlier Windows npm.cmd + shell=true
  // was caught by main security scanning. Use Node's own pinned bundled npm JS
  // instead. The candidates are fixed paths next to setup-node's executable;
  // no PATH-discovery or arbitrary shell execution is permitted.
  const nodeDir = path.dirname(process.execPath);
  const options = [
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.resolve(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const npmCli = options.find(candidate => {
    try { return fs.lstatSync(candidate).isFile(); } catch { return false; }
  });
  if (!npmCli) category("pinned-node-npm-cli-not-found");
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    encoding: "utf8",
    env,
    cwd: root,
    timeout: maxMs,
    windowsHide: true,
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
  console.log("D150_PUBLISHED_NPM_NATIVE_LOOPBACK=PASS");
  console.log("D150_PUBLISHED_NPM_OS=" + (process.platform === "win32" ? "windows-2025" : "macos-15"));
  console.log("D150_SCOPE=read-only-published-CLI; no-GUI-no-user-setup-no-SEC02-no-RC-no-beta");
} catch (e) {
  console.error("D150_PUBLISHED_NPM_NATIVE=FAIL category=" + (e.category || "runtime"));
  process.exitCode = 1;
} finally {
  await stop();
}
