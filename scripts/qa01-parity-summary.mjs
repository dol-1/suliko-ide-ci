#!/usr/bin/env node
// QA-01: summarize exact Playwright 7×2 result; NEVER echo untrusted error text.
import fs from "node:fs";

let root;
try {
  if (process.argv.length !== 3) throw Error("Invalid arguments");
  const input = fs.readFileSync(process.argv[2], "utf8");
  if (input.length > 4 * 1024 * 1024) throw Error("Report too large");
  root = JSON.parse(input);
  if (!root || typeof root !== "object" || Array.isArray(root)) throw Error("Bad root");
} catch {
  console.error("QA01 malformed or missing result; source details withheld.");
  process.exit(2);
}

const found = new Map();
const diagnostics = new Map();
const VALID_STATUSES = new Set(["passed", "failed", "timedOut", "skipped", "interrupted", "not-run"]);

function category(raw) {
  // Categorize in memory only. Never serialize, log or substring raw error data.
  const text = String(raw ?? "").slice(0, 4096);
  if (/timeout|timed out|waiting for/i.test(text)) return "timeout";
  if (/locator|strict mode violation/i.test(text)) return "locator";
  if (/expected|received|assertion/i.test(text)) return "assertion";
  return "other";
}

function walk(suites) {
  if (!Array.isArray(suites)) throw Error("Invalid suite shape");
  for (const suite of suites) {
    if (!suite || typeof suite !== "object") throw Error("Invalid suite");
    if (!Array.isArray(suite.specs ?? []) || !Array.isArray(suite.suites ?? []))
      throw Error("Invalid suites/specs");
    for (const spec of suite.specs ?? []) {
      const id = /^J(0[1-7]):/.exec(spec?.title)?.[0]?.slice(0, 3);
      if (!id || !Array.isArray(spec.tests)) throw Error("Unexpected QA01 spec");
      for (const trial of spec.tests) {
        const project = trial?.projectName;
        if (project !== "web" && project !== "desktop") throw Error("Unexpected QA01 project");
        const key = id + ":" + project;
        if (found.has(key)) throw Error("Duplicate QA01 journey/project");
        const results = trial.results;
        if (!Array.isArray(results)) throw Error("Malformed QA01 test results");
        // retries=0 is required. A later success must not hide an earlier failure.
        const final = results.length === 1 ? results[0]?.status : (results.length ? "retry-detected" : "not-run");
        const status = VALID_STATUSES.has(final) ? final : "unknown";
        found.set(key, status);
        const nonpassing = results.find(r => r?.status !== "passed");
        if (nonpassing || results.length !== 1) {
          diagnostics.set(key, results.length > 1 ? "retry-detected" :
            category(nonpassing?.error?.message ?? nonpassing?.error?.value ?? nonpassing?.status));
        }
      }
    }
    walk(suite.suites ?? []);
  }
}

try {
  walk(root.suites);
} catch {
  console.error("QA01 report contract rejected; untrusted data withheld.");
  process.exit(1);
}

const lines = ["# QA-01 Desktop × Web parity", "", "| Journey | Web | Desktop |", "| --- | --- | --- |"];
for (let i = 1; i <= 7; i++) {
  const id = "J0" + i;
  lines.push("| " + id + " | " + (found.get(id + ":web") ?? "MISSING") + " | " +
    (found.get(id + ":desktop") ?? "MISSING") + " |");
}
lines.push("", "Expected 14 test executions; found " + found.size +
  ". Missing, retry, skip and failure states never pass.");
lines.push("", "Safe failure classifications (raw Playwright errors withheld):");
for (const [key, kind] of diagnostics) lines.push("- " + key + ": " + kind);
console.log(lines.join("\n"));
if (found.size !== 14 || [...found.values()].some(s => s !== "passed"))
  process.exitCode = 1;
