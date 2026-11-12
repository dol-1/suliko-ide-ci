import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const executable = new URL("../scripts/suliko-doctor.mjs", import.meta.url);
const fixture = {
  bbVersion: "0.49.0",
  listenerHost: "127.0.0.1",
  profileHardened: true,
  providerKeyPresent: true,
  plugins: {
    "account-pool": "disabled",
    mcp: "absent",
    connect: "disabled",
    "connect-next": "absent",
    memory: "disabled",
    "suliko-hello": "enabled",
    "suliko-remote-panel": "disabled",
  },
};
const needles = [
  "sk-test-super-secret-do-not-show",
  "person.private@example.org",
  "/home/testprivate/.config/suliko",
  "C:\\Users\\testprivate\\Projects",
  "token_value_never_publish",
];
function run(f, opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "suliko-doctor-test-"));
  try {
    const path = join(dir, "fake-input.json");
    const bundle = join(dir, "safe-bundle.json");
    writeFileSync(path, JSON.stringify(f));
    const args = [fileURLToPath(executable), "--fixture", path, ...(opts.bundle ? ["--bundle", bundle] : [])];
    const res = spawnSync(process.execPath, args, { encoding: "utf8" });
    return { ...res, output: res.stdout + res.stderr, bundle: opts.bundle && res.status !== 2 ? readFileSync(bundle, "utf8") : null, mode: opts.bundle && res.status !== 2 ? (statSync(bundle).mode & 0o777) : null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("schema allowlist makes synthetic secrets unrepresentable in stdout and bundle", () => {
  const f = { ...fixture, user: { apiKey: needles[0], email: needles[1], home: needles[2], windows: needles[3] }, extra: needles[4] };
  const result = run(f, { bundle: true });
  assert.equal(result.status, 0, result.output);
  for (const secret of needles) {
    assert.ok(!result.output.includes(secret), "secret present in stdout");
    assert.ok(!result.bundle.includes(secret), "secret present in bundle");
  }
  assert.equal(JSON.parse(result.bundle).status, "synthetic-fixture-pass");
  if (process.platform !== "win32") assert.equal(result.mode, 0o600);
});
test("malicious version and disabled plugin prevent synthetic pass without echoing values", () => {
  const result = run({ ...fixture, bbVersion: needles[0], listenerHost: "0.0.0.0", plugins: { ...fixture.plugins, mcp: "enabled" }, error: needles[1] });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).status, "review-required");
  for (const secret of needles) assert.ok(!result.output.includes(secret));
});
test("unknown plugin status fails closed, no false success", () => {
  const result = run({ ...fixture, plugins: { ...fixture.plugins, "account-pool": "weird" } });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).plugins["account-pool"], "unknown");
});
test("invalid file path does not leak private filesystem path in diagnostic", () => {
  const bad = join(tmpdir(), "secret-person-path-321", "missing.json");
  const res = spawnSync(process.execPath, [fileURLToPath(executable), "--fixture", bad], { encoding: "utf8" });
  assert.equal(res.status, 2);
  assert.ok(!res.stderr.includes("secret-person-path-321"));
});
