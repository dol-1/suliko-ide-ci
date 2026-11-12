#!/usr/bin/env bash
# SEC-02 unit-contract tests (fixture only; no BB process or network test).
set -Eeuo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
verify="$root/scripts/verify-hardened.sh"
good="$root/tests/fixtures/hardened/disabled.json"
bad="$root/tests/fixtures/hardened/enabled-mcp.json"

expect_success() {
  if ! BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false \
    bash "$verify" --plugins-json "$good" >/dev/null; then
    printf 'FAIL: expected disabled fixture to pass\n' >&2
    exit 1
  fi
}
expect_fail() {
  local why="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf 'FAIL: expected rejection of %s\n' "$why" >&2
    exit 1
  fi
}
expect_success
expect_fail "enabled MCP" env BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false \
  bash "$verify" --plugins-json "$bad"
expect_fail "public bind" env BB_SERVER_BIND_HOST=0.0.0.0 BB_TELEMETRY=false \
  bash "$verify" --plugins-json "$good"
expect_fail "telemetry enabled" env BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=true \
  bash "$verify" --plugins-json "$good"
expect_fail "missing plugin JSON" env BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false \
  bash "$verify" --plugins-json "$root/tests/fixtures/hardened/does-not-exist.json"
printf 'SEC-02: five fixture contract cases passed (not an integration/security audit).\n'

# Additional fail-closed mutations: do not rely solely on a known-bad MCP fixture.
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
mutate_json() {
  node - "$good" "$tmp/mutated.json" "$1" <<'NODE'
"use strict";
const fs = require("node:fs");
const [input, output, mutation] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(input, "utf8"));
switch (mutation) {
  case "string-enabled": data.plugins[0].enabled = "false"; break;
  case "duplicate-id": data.plugins.push({ ...data.plugins[0] }); break;
  case "missing-status": delete data.plugins[0].status; break;
  case "wrong-envelope": delete data.plugins; break;
  default: throw new Error("unknown mutation: " + mutation);
}
fs.writeFileSync(output, JSON.stringify(data));
NODE
}
for mutation in string-enabled duplicate-id missing-status wrong-envelope; do
  mutate_json "$mutation"
  expect_fail "malformed plugin status ($mutation)" env \
    BB_SERVER_BIND_HOST=127.0.0.1 BB_TELEMETRY=false \
    bash "$verify" --plugins-json "$tmp/mutated.json"
done
printf 'not json\n' > "$tmp/mutated.json"
expect_fail "unparseable JSON" env BB_SERVER_BIND_HOST=127.0.0.1 \
  BB_TELEMETRY=false bash "$verify" --plugins-json "$tmp/mutated.json"
cp "$root/config/hardened/.env.hardened" "$tmp/mutated.env"
printf 'BB_TELEMETRY=true\n' >> "$tmp/mutated.env"
expect_fail "duplicate env setting" env BB_SERVER_BIND_HOST=127.0.0.1 \
  BB_TELEMETRY=false bash "$verify" --env-file "$tmp/mutated.env" --plugins-json "$good"
sed 's/BB_SERVER_BIND_HOST=127.0.0.1/BB_SERVER_BIND_HOST=0.0.0.0/' \
  "$root/config/hardened/.env.hardened" > "$tmp/mutated.env"
expect_fail "public bind setting declared in file" env BB_SERVER_BIND_HOST=127.0.0.1 \
  BB_TELEMETRY=false bash "$verify" --env-file "$tmp/mutated.env" --plugins-json "$good"
printf 'SEC-02: seven additional malformed-state tests passed (fixture-only).\n'