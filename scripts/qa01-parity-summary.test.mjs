import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./qa01-parity-summary.mjs", import.meta.url));
const syntheticKey = "sk-" + "SYNTHETIC_NEVER_ECHO_ABCDEF0123456789";
const syntheticEmail = "synthetic" + "@example.invalid";
const syntheticPath = "/home/" + "example/private-workspace";
const base = () => ({ suites: [{ specs: Array.from({length: 7}, (_,i) => ({
  title: "J0" + (i+1) + ": synthetic only",
  tests: ["web", "desktop"].map(projectName => ({projectName, results:[{status:"passed"}]}))
})) }] });
function runRaw(raw) {
  const temp = mkdtempSync(join(tmpdir(), "qa01-summary-negative-"));
  try {
    const file = join(temp, "synthetic.json");
    writeFileSync(file, raw, {mode:0o600});
    const res = spawnSync(process.execPath, [script, file], {
      encoding:"utf8", timeout:5000, maxBuffer:1024*1024,
      env: {PATH:process.env.PATH || "/usr/bin:/bin"}
    });
    assert.equal(res.error, undefined, "summarizer subprocess failed");
    return {status:res.status, output:(res.stdout||"")+(res.stderr||"")};
  } finally {rmSync(temp, {recursive:true, force:true});}
}
const run = input => runRaw(JSON.stringify(input));
function noLeak(output) {
  for (const needle of [syntheticKey, syntheticEmail, syntheticPath])
    assert.equal(output.includes(needle), false, "untrusted marker leaked");
}
test("exact 7x2 synthetic journey statuses can pass", () => {
  const r=run(base());
  assert.equal(r.status, 0);
  assert.match(r.output,/Expected 14 test executions; found 14/);
  for(let i=1;i<=7;i++) assert.match(r.output,new RegExp("J0"+i+" \\| passed \\| passed"));
});
test("missing one client fails closed", () => {
  const fixture=base(); fixture.suites[0].specs[6].tests.pop();
  const r=run(fixture); assert.equal(r.status,1); assert.match(r.output,/MISSING/);
});
test("duplicate journey/project is rejected without raw output", () => {
  const f=base(); f.suites[0].specs[0].tests.push(structuredClone(f.suites[0].specs[0].tests[0]));
  const r=run(f); assert.equal(r.status,1); assert.match(r.output,/contract rejected/);
});
test("token-like failed diagnostics never enter the summary", () => {
  const f=base();
  f.suites[0].specs[2].tests[0].results=[{status:"failed",error:{message:
    "Error: "+syntheticKey+" "+syntheticEmail+" "+syntheticPath}}];
  const r=run(f); assert.equal(r.status,1); noLeak(r.output);
  assert.match(r.output,/J03:web: other/);
});
test("timeout diagnostic is categorically represented, no untrusted detail", () => {
  const f=base();
  f.suites[0].specs[3].tests[1].results=[{status:"timedOut",error:{message:"Timeout: "+syntheticKey}}];
  const r=run(f); assert.equal(r.status,1); noLeak(r.output);
  assert.match(r.output,/J04:desktop: timeout/);
});
test("retry that later passes cannot hide earlier failure", () => {
  const f=base();
  f.suites[0].specs[0].tests[0].results=[{status:"failed"}, {status:"passed"}];
  const r=run(f); assert.equal(r.status,1); assert.match(r.output,/retry-detected/);
});
test("untrusted project, test title and status are never echoed", () => {
  const badProject=base(); badProject.suites[0].specs[0].tests[0].projectName=syntheticKey;
  let r=run(badProject); assert.equal(r.status,1); noLeak(r.output);
  const badTitle=base(); badTitle.suites[0].specs[0].title=syntheticEmail;
  r=run(badTitle); assert.equal(r.status,1); noLeak(r.output);
  const badStatus=base(); badStatus.suites[0].specs[0].tests[0].results=[{status:syntheticKey}];
  r=run(badStatus); assert.equal(r.status,1); noLeak(r.output);
});
test("invalid report parsing rejects without leaking source text", () => {
  const r=runRaw("THIS IS INVALID JSON "+syntheticKey+" "+syntheticEmail);
  assert.equal(r.status,2); noLeak(r.output);
});
test("empty test result is not accepted as pass", () => {
  const f=base(); f.suites[0].specs[0].tests[0].results=[];
  const r=run(f); assert.equal(r.status,1); assert.match(r.output,/not-run/);
});

test("oversized synthetic report rejects without exposing inserted strings", () => {
  const payload = JSON.stringify({...base(), extra:syntheticKey.repeat(180000)});
  const r = runRaw(payload);
  assert.equal(r.status, 2); noLeak(r.output);
});
test("malformed nested suite shape is refused without leaking error payloads", () => {
  const f = base(); f.suites[0].suites = [syntheticKey];
  const r = run(f); assert.equal(r.status, 1); noLeak(r.output);
  assert.match(r.output, /contract rejected/);
});
test("untrusted Playwright test results type is rejected without disclosure", () => {
  const f = base(); f.suites[0].specs[1].tests[0].results = syntheticKey;
  const r = run(f); assert.equal(r.status, 1); noLeak(r.output);
  assert.match(r.output, /contract rejected/);
});

test("strict J05/J06 checkpoints show only whitelisted fixed phase booleans", () => {
  const f=base();
  const j05=f.suites[0].specs[4].tests[0];
  j05.results=[{status:"failed",stdout:[
    {text:"QA01_STAGE_J05_PANEL\n"},
    {text:"QA01_STAGE_J05_PLUS\n"},
    {text:"QA01_STAGE_J05_SEARCH\n"},
    {text:"QA01_STAGE_J05_LAUNCHER\n"},
    {text:"QA01_STAGE_J05_OPTION\n"},
    {text:"UNTRUSTED "+syntheticKey+" "+syntheticPath+" "+syntheticEmail+"\\n"}
  ],error:{message:syntheticKey}}];
  const j06=f.suites[0].specs[5].tests[1];
  j06.results=[{status:"failed",stdout:[
    {text:"QA01_STAGE_J06_LAUNCHER\n"},
    {text:"QA01_STAGE_J06_OPTION\n"},
    {text:"QA01_STAGE_J06_CLICKED\n"}
  ]}];
  const r=run(f);
  assert.equal(r.status,1); noLeak(r.output);
  assert.match(r.output,/J05:web panel=true plus=true search=true launcher=true option=true clicked=false selected=false/);
  assert.match(r.output,/J06:desktop panel=false plus=false search=false launcher=true option=true clicked=true selected=false/);
  assert.match(r.output,/J05:desktop panel=false plus=false search=false launcher=false option=false clicked=false selected=false/);
});
