#!/usr/bin/env node
// QA-01: summarize exact Playwright 7×2 result without masking failures.
import fs from "node:fs";
const path = process.argv[2];
if (!path) throw Error("Playwright JSON report path required");
const root = JSON.parse(fs.readFileSync(path, "utf8"));
const found = new Map();
const diagnostics = new Map();
function walk(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const id = /^J(0[1-7]):/.exec(spec.title)?.[0]?.slice(0, 3);
      if (!id) throw Error("Unexpected QA-01 test: " + spec.title);
      for (const trial of spec.tests ?? []) {
        const project = trial.projectName;
        if (!["web", "desktop"].includes(project)) throw Error("Unexpected project: " + project);
        const key = id + ":" + project;
        if (found.has(key)) throw Error("Duplicate journey/project: " + key);
        const outcomes = trial.results ?? [];
        found.set(key, outcomes.length ? String(outcomes.at(-1).status) : "not-run");
        const bad = outcomes.find(x => x.status !== "passed");
        if (bad) {
          // Synthetic CI only: record first-line Playwright error, not DOM snapshots,
          // raw stdout, provider credentials, workspace paths or archive content.
          const raw = String(bad.error?.message ?? bad.error?.value ?? bad.status ?? "unknown");
          const detail = raw.split("\n").map(x => x.trim()).filter(x => /^(?:Error:|Locator:|Expected:|Received:|Timeout:|at )/i.test(x)).slice(0, 5).join(" ; ") || raw.split("\n").map(x => x.trim()).find(Boolean) || "unknown";
          const safe = detail.replace(/\x1b\[[0-9;]*m/g, "").replace(/\b(?:https?:\/\/)[^\s]+/gi, "[url]").slice(0, 560);
          diagnostics.set(key, safe);
        }
      }
    }
    walk(suite.suites);
  }
}
walk(root.suites);
const lines = ["# QA-01 Desktop × Web parity", "", "| Journey | Web | Desktop |", "| --- | --- | --- |"];
for (let i = 1; i <= 7; i++) {
  const id = "J0" + i;
  lines.push("| " + id + " | " + (found.get(id + ":web") ?? "MISSING") + " | " + (found.get(id + ":desktop") ?? "MISSING") + " |");
}
lines.push("", "Expected 14 test executions; found " + found.size + ". Failures are preserved; no skips are accepted.");
lines.push("", "Synthetic CI error first-lines (not a root-cause finding):");
for (const [key, error] of diagnostics.entries()) lines.push("- " + key + ": " + error);
console.log(lines.join("\n"));
if (found.size !== 14 || [...found.values()].some(x => x !== "passed")) process.exitCode = 1;
