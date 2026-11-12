#!/usr/bin/env node
// Suliko Doctor D-059: OFFLINE SYNTHETIC fixture verifier.
// This preview never touches user credentials, BB runtime, local devices or home directories.
import { readFileSync, writeFileSync } from "node:fs";

const guarded = ["account-pool", "mcp", "connect", "connect-next", "memory"];
const owned = ["suliko-hello", "suliko-remote-panel"];
const allowedState = new Set(["enabled", "disabled", "absent"]);
function inspect(source) {
  // Construct ALL output from a constant-key allowlist. Never serialize source or errors.
  const valid = source !== null && typeof source === "object" && !Array.isArray(source) ? source : {};
  const version = typeof valid.bbVersion === "string"
    && valid.bbVersion.length <= 32
    && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]{1,16})?$/.test(valid.bbVersion)
    ? valid.bbVersion : "unknown";
  const listener = valid.listenerHost === "127.0.0.1" || valid.listenerHost === "::1" || valid.listenerHost === "localhost";
  const hardened = valid.profileHardened === true;
  const plugins = {};
  for (const id of [...guarded, ...owned]) {
    const state = valid.plugins && typeof valid.plugins === "object" ? valid.plugins[id] : undefined;
    plugins[id] = allowedState.has(state) ? state : "unknown";
  }
  const forbiddenSafe = guarded.every(id => plugins[id] === "disabled" || plugins[id] === "absent");
  const keyPresent = valid.providerKeyPresent === true;
  const safe = version !== "unknown" && listener && hardened && forbiddenSafe;
  return {
    schema: "suliko-doctor-offline-v1",
    evidence: "synthetic-fixture-only-not-live-bb",
    bbVersion: version,
    controls: {
      loopbackOnly: listener,
      hardenedProfile: hardened,
      forbiddenPluginsSafe: forbiddenSafe,
      providerKeyPresent: keyPresent,
    },
    plugins,
    status: safe ? "synthetic-fixture-pass" : "review-required",
  };
}
function main(args) {
  if (args.includes("--help")) {
    process.stdout.write("Usage: node scripts/suliko-doctor.mjs --fixture SYNTHETIC.json [--bundle NEWFILE.json]\nPreview only: does not inspect live BB, personal credentials or files.\n");
    return 0;
  }
  if (args.length !== 2 && args.length !== 4) {
    process.stderr.write("Argument validation failed: use --fixture and optional --bundle.\n");
    return 2;
  }
  if (args[0] !== "--fixture" || (args.length === 4 && args[2] !== "--bundle")) {
    process.stderr.write("Unsupported options.\n");
    return 2;
  }
  let source;
  try {
    source = JSON.parse(readFileSync(args[1], "utf8"));
  } catch {
    // Never include operating-system error text: it may include a real private path.
    process.stderr.write("Cannot read valid synthetic fixture.\n");
    return 2;
  }
  const report = inspect(source);
  const serialized = JSON.stringify(report, null, 2) + "\n";
  if (args.length === 4) {
    try {
      writeFileSync(args[3], serialized, { flag: "wx", mode: 0o600 });
    } catch {
      process.stderr.write("Cannot create a new support bundle. Existing files are not overwritten.\n");
      return 2;
    }
  }
  process.stdout.write(serialized);
  return report.status === "synthetic-fixture-pass" ? 0 : 1;
}
process.exitCode = main(process.argv.slice(2));
