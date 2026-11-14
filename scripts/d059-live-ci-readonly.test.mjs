import { test } from "node:test";
import { strict as assert } from "node:assert";
import { inspectLive,writeCiSafeBundle,stockVersionMatchesPin,inspectManagedProviderKeys } from "./d059-live-ci-readonly.mjs";
import { mkdtempSync,readFileSync,writeFileSync,symlinkSync,lstatSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const config=(overrides={})=>({serverUrl:"http://127.0.0.1:38884",dataDir:"/ci/disposable",secrets:"SENTINEL-NEVER-PRINT",...overrides});
const plugins=(more=[])=>({plugins:[
{id:"bb--mcp",enabled:false},{id:"account-pool",enabled:false},
{id:"connect",enabled:false},{id:"bb--connect-next",enabled:false},
{id:"memory",enabled:false},{id:"suliko-hello",enabled:true},...more]});
test("real-shaped CLI data reduces to explicit safe statuses",()=>{
  const r=inspectLive(config(),plugins(),"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
  assert.equal(r.status,"partial-runtime-pass");
  assert.equal(r.pluginStates["suliko-hello"],"enabled");
  assert.deepEqual(r.providerKeyPresence,{openai:"absent",anthropic:"absent"});
  assert.equal(r.providerSettingsAndHooks,"NOT_INSPECTED");
  assert.doesNotMatch(JSON.stringify(r),/SENTINEL|\/ci\/disposable/);
});
test("non-loopback host, port, or data directory cannot pass",()=>{
  for(const c of [
    {serverUrl:"https://example.org:38884"},
    {serverUrl:"http://127.0.0.1:38885"},
    {serverUrl:"http://0.0.0.0:38884"},
    {serverUrl:"http://user:pass@127.0.0.1:38884"},
    {serverUrl:"http://127.0.0.1:38884/?token=SENTINEL-NO-ECHO"},
    {serverUrl:"http://127.0.0.1:38884/#SENTINEL-NO-ECHO"},
    {serverUrl:"http://127.0.0.1:38884/other-base"},
    {dataDir:"/user/home"}]){
    const r=inspectLive(config(c),plugins(),"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
    assert.equal(r.status,"review-required");
  }
});
test("forbidden enabled and unknown statuses reject acceptance",()=>{
  for(const extra of [[{id:"memory",enabled:true}],[{id:"memory",enabled:"yes"}]]){
    const pl=plugins().plugins.filter(x=>x.id!=="memory").concat(extra);
    assert.equal(inspectLive(config(),{plugins:pl},"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n").status,"review-required");
  }
});
test("duplicate plugin IDs fail closed instead of selecting a safe-looking first record",()=>{
  const base=plugins().plugins;
  for(const id of ["account-pool","bb--mcp","connect","bb--connect-next","memory"]){
    const duplicate={plugins:[...base,{id,enabled:true,secrets:"SENTINEL-NEVER-PRINT"}]};
    const r=inspectLive(config(),duplicate,"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
    assert.equal(r.pluginStates[id],"unknown");
    assert.equal(r.checks.forbiddenPluginsSafe,false);
    assert.equal(r.status,"review-required");
    assert.doesNotMatch(JSON.stringify(r),/SENTINEL|\/ci\/disposable/);
  }
  const sameDisabled={plugins:[...base,{id:"account-pool",enabled:false}]};
  assert.equal(inspectLive(config(),sameDisabled,"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n").status,"review-required");
  const duplicateOwned={plugins:[...base,{id:"suliko-hello",enabled:false}]};
  const own=inspectLive(config(),duplicateOwned,"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
  assert.equal(own.pluginStates["suliko-hello"],"unknown");
});
test("malformed CLI shape is rejected, never serialized",()=>{
  assert.throws(()=>inspectLive({serverUrl:"invalid"},{plugins:[]},"/ci/disposable",38884));
  assert.throws(()=>inspectLive(config(),{plugins:null},"/ci/disposable",38884));
});

test("fixed-schema private disposable support bundle excludes untrusted fields",()=>{
  const root=mkdtempSync(join(tmpdir(),"d059-ci-test-"));
  const path=join(root,"d059-support-bundle.json");
  try{
    const report=inspectLive(config(),plugins(),"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
    report.rawProviderToken="SENTINEL-DO-NOT-EMIT";
    report.pluginStates["unknown-user-extension"]="SENTINEL";
    const clean=writeCiSafeBundle(report,path,root);
    const bytes=readFileSync(path,"utf8");
    assert.deepEqual(JSON.parse(bytes),clean);
    assert.doesNotMatch(bytes,/SENTINEL|\/ci\/disposable|rawProviderToken|unknown-user-extension/);
    // Windows does not expose an equivalent POSIX chmod contract via stat.mode.
    // Linux live-readonly still enforces 0600; all OS enforce wx/no-overwrite.
    assert.equal(lstatSync(path).isFile(),true);
    if(process.platform!=="win32")assert.equal(lstatSync(path).mode&0o777,0o600);
    assert.throws(()=>writeCiSafeBundle(report,path,root),/could not be created/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test("bundle rejects arbitrary outside and traversal targets before writing",()=>{
  const root=mkdtempSync(join(tmpdir(),"d059-ci-test-"));
  try{
    assert.throws(()=>writeCiSafeBundle({},join(root,"..","outside.json"),root),/Refusing/);
    assert.throws(()=>writeCiSafeBundle({},"/tmp/another.json",root),/Refusing/);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("preexisting symlink cannot redirect bundle write into a sentinel",()=>{
  // Windows symlink creation requires host-specific privilege; no ACL claim.
  if(process.platform==="win32")return;
  const root=mkdtempSync(join(tmpdir(),"d059-ci-test-"));
  const target=join(root,"sentinel.json"),link=join(root,"d059-support-bundle.json");
  try{
    writeFileSync(target,"DO-NOT-OVERWRITE",{mode:0o600});
    symlinkSync(target,link);
    assert.throws(()=>writeCiSafeBundle({},link,root),/could not be created/);
    assert.equal(readFileSync(target,"utf8"),"DO-NOT-OVERWRITE");
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("stock --version must match pinned CLI, never print attacker-supplied output",()=>{
  assert.equal(stockVersionMatchesPin("0.49.0\n","No bb-app env set.\n"),true);
  for(const bad of ["0.49.1","0.49.0\nSENTINEL-NEVER-PRINT","0.0.0-dev","",null,{}, "0.49.0--fake"]){
    assert.equal(stockVersionMatchesPin(bad),false);
    const report=inspectLive(config(),plugins(),"/ci/disposable",38884,bad,"No bb-app env set.\n");
    assert.equal(report.checks.stockVersionMatchesPin,false);
    assert.equal(report.status,"review-required");
    assert.doesNotMatch(JSON.stringify(report),/SENTINEL|fake|0.49.1|0.0.0-dev/);
  }
  const ok=inspectLive(config(),plugins(),"/ci/disposable",38884,"0.49.0\n","No bb-app env set.\n");
  assert.equal(ok.checks.stockVersionMatchesPin,true);
  assert.equal(ok.status,"partial-runtime-pass");
});

test("redacted stock CLI environment list exposes provider key existence, never values",()=>{
  const text="OPENAI_API_KEY=<set>\nANTHROPIC_API_KEY=<set>\nBB_SERVER_BIND_HOST=<set>\n";
  const presence=inspectManagedProviderKeys(text);
  assert.deepEqual(presence,{openai:"present",anthropic:"present"});
  const report=inspectLive(config(),plugins(),"/ci/disposable",38884,"0.49.0\n",text);
  assert.equal(report.status,"partial-runtime-pass");
  assert.deepEqual(report.providerKeyPresence,presence);
  assert.doesNotMatch(JSON.stringify(report),/OPENAI_API_KEY|ANTHROPIC_API_KEY|SENTINEL|\/ci\/disposable/);
});
test("reject raw token values, duplicate keys and corrupt managed environment listing",()=>{
  for(const bad of [
    "OPENAI_API_KEY=sk-SENTINEL-NO-PRINT\n",
    "OPENAI_API_KEY=<set>\nOPENAI_API_KEY=<set>\n",
    "ANTHROPIC_API_KEY=<set>\nX=real-value\n",
    "OPENAI_API_KEY=<set>",
    "OPENAI_API_KEY=<set>\nSECRET@example.test\n",
    "No bb-app env set.\nOPENAI_API_KEY=<set>\n",
    null,{},"x".repeat(65537)
  ])assert.throws(()=>inspectManagedProviderKeys(bad),/Unsafe|Unredacted/);
});
test("bundle sanitizes tampered provider presence without reflecting unexpected keys",()=>{
  const root=mkdtempSync(join(tmpdir(),"d059-env-"));
  const path=join(root,"d059-support-bundle.json");
  try{
    const report=inspectLive(config(),plugins(),"/ci/disposable",38884,"0.49.0\n","OPENAI_API_KEY=<set>\n");
    report.providerKeyPresence.extra="SENTINEL-VALUE";
    report.providerKeyPresence.anthropic="SENTINEL";
    const clean=writeCiSafeBundle(report,path,root);
    assert.deepEqual(clean.providerKeyPresence,{openai:"present",anthropic:"unknown"});
    assert.doesNotMatch(readFileSync(path,"utf8"),/SENTINEL|OPENAI_API_KEY/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
