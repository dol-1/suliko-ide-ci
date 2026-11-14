// D159 negative-only runner authorization checks; no GUI/npm/data operations.
import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const root=process.env.RUNNER_TEMP;
if(!root||!path.isAbsolute(root))throw Error("D159 requires public runner temporary directory");
const executable=path.resolve("scripts/d159-installed-gui-published-native.mjs");
function mustRefuse(overrides){
 const env={...process.env,...overrides};
 const result=spawnSync(process.execPath,[executable],{
  cwd:process.cwd(),env,encoding:"utf8",timeout:10000,windowsHide:true,
  stdio:["ignore","pipe","pipe"]});
 assert.equal(result.status,1,"Unapproved runner invocation must fail");
 assert.match(result.stderr,/D159/);
 assert.equal(fs.existsSync(path.join(root,"d159-native-owned-home")),false);
 assert.equal(fs.existsSync(path.join(root,"d159-published-cli")),false);
}
test("not a user host: requires CI=true",()=>mustRefuse({CI:"false"}));
test("not a GitHub runner: requires GITHUB_ACTIONS=true",()=>mustRefuse({GITHUB_ACTIONS:"false"}));
test("not an arbitrary public/private repo",()=>mustRefuse({GITHUB_REPOSITORY:"other/repository"}));
