#!/usr/bin/env bash
# SEC-02: fail-closed configuration and plugin-state verifier for stock BB.
# Pinned-source contract: get-bb/bb@desktop-v0.49.0.
# No secrets, BB code changes, installation, service start or privilege changes.
set -Eeuo pipefail

readonly ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ROOT_DIR}/config/hardened/.env.hardened"
plugins_json=""
usage() {
  printf 'Usage: %s [--env-file PATH] [--plugins-json PATH]\n' "$0"
  printf 'Without --plugins-json, reads live status from: bb plugin list --json\n'
}
while (($# > 0)); do
  case "$1" in
    --env-file)
      if (($# < 2)); then usage >&2; exit 1; fi
      env_file="$2"; shift 2 ;;
    --plugins-json)
      if (($# < 2)); then usage >&2; exit 1; fi
      plugins_json="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'SEC-02: unknown argument: %s\n' "$1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ ! -f "$env_file" ]]; then
  printf 'SEC-02 FAIL: no env contract file: %s\n' "$env_file" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  printf 'SEC-02 FAIL: Node.js is required to validate JSON\n' >&2
  exit 1
fi

tempfile=""
cleanup() {
  if [[ -n "$tempfile" ]]; then rm -f -- "$tempfile"; fi
}
trap cleanup EXIT

if [[ -z "$plugins_json" ]]; then
  if ! command -v bb >/dev/null 2>&1; then
    printf 'SEC-02 FAIL: BB CLI unavailable; cannot verify live plugin state\n' >&2
    exit 1
  fi
  tempfile="$(mktemp)"
  if ! bb plugin list --json >"$tempfile"; then
    printf 'SEC-02 FAIL: bb plugin list --json did not succeed\n' >&2
    exit 1
  fi
  plugins_json="$tempfile"
else
  printf 'SEC-02: using supplied plugin JSON fixture; this does NOT verify a live BB server\n' >&2
fi

if [[ ! -f "$plugins_json" ]]; then
  printf 'SEC-02 FAIL: missing plugin JSON\n' >&2
  exit 1
fi

node - "$env_file" "$plugins_json" <<'NODE'
"use strict";
const fs = require("node:fs");
const envPath = process.argv[2];
const pluginsPath = process.argv[3];
const fail = (why) => { console.error("SEC-02 FAIL: " + why); process.exit(1); };

const source = fs.readFileSync(envPath, "utf8");
const settings = new Map();
for (const [index, raw] of source.split(/\r?\n/u).entries()) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const m = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
  if (!m) fail("bad env line " + (index + 1) + "; never execute env files");
  if (settings.has(m[1])) fail("duplicate env setting " + m[1]);
  settings.set(m[1], m[2]);
}
const required = new Map([
  ["BB_SERVER_BIND_HOST", "127.0.0.1"],
  ["BB_TELEMETRY", "false"],
]);
for (const [name, expected] of required.entries()) {
  if (settings.get(name) !== expected) fail(name + " in .env.hardened must equal " + expected);
  if (process.env[name] !== expected) {
    fail(name + " effective verifier process env is not " + expected +
      "; export/configure the packaged launch env explicitly");
  }
}
let response;
try {
  response = JSON.parse(fs.readFileSync(pluginsPath, "utf8"));
} catch (err) {
  fail("cannot parse plugin status JSON: " + String(err));
}
if (!response || typeof response !== "object" || !Array.isArray(response.plugins)) {
  fail('expected "bb plugin list --json" shape: {plugins: []}');
}
const forbidden = [
  "bb--mcp", "account-pool", "connect", "bb--connect-next", "memory",
];
const seen = new Set();
for (const entry of response.plugins) {
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string" ||
      typeof entry.enabled !== "boolean" || typeof entry.status !== "string") {
    fail("plugin entry missing typed id/enabled/status; refuse ambiguous state");
  }
  if (seen.has(entry.id)) fail("duplicate plugin id " + entry.id);
  seen.add(entry.id);
}
for (const id of forbidden) {
  const plugin = response.plugins.find((p) => p.id === id);
  if (!plugin) {
    console.log("SEC-02: " + id + " absent (not installed)");
    continue;
  }
  if (plugin.enabled !== false || plugin.status !== "disabled") {
    fail(id + " is not provably disabled (enabled=" + plugin.enabled +
      ", status=" + plugin.status + ")");
  }
  console.log("SEC-02: " + id + " disabled");
}
console.log("SEC-02 PASS: env/loopback values and five forbidden plugin states verified.");
console.log("NOTE: process config checks do not replace a deployed listener/ACL reachability test.");
NODE