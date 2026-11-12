import { test } from "node:test";
import { strict as assert } from "node:assert";
import { inspectLive,writeCiSafeBundle } from "./d059-live-ci-readonly.mjs";
import { mkdtempSync,readFileSync,writeFileSync,symlinkSync,lstatSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const config=(overrides={})=>({serverUrl:"http://127.0.0.1:38884",dataDir:"/ci/disposable",secrets:"SENTINEL-NEVER-PRINT",...overrides});
const plugins=(more=[])=>({plugins:[
{id:"bb--mcp",enabled:false},{id:"account-pool",enabled:false},
{id:"connect",enabled:false},{id:"bb--connect-next",enabled:false},
{id:"memory",enabled:false},{id:"suliko-hello",enabled:true},...more]});
test("real-shaped CLI data reduces to explicit safe statuses",()=>{
  const r=inspectLive(config(),plugins(),"/ci/disposable",38884);
  assert.equal(r.status,"partial-runtime-pass");
  assert.equal(r.pluginStates["suliko-hello"],"enabled");
  assert.equal(r.providerKeyPresence,"NOT_INSPECTED");
  assert.equal(r.providerSettingsAndHooks,"NOT_INSPECTED");
  assert.doesNotMatch(JSON.stringify(r),/SENTINEL|\/ci\/disposable/);
});
test("non-loopback host, port, or data directory cannot pass",()=>{
  for(const c of [
    {serverUrl:"https://example.org:38884"},
    {serverUrl:"http://127.0.0.1:38885"},
    {serverUrl:"http://0.0.0.0:38884"},
    {dataDir:"/user/home"}]){
    const r=inspectLive(config(c),plugins(),"/ci/disposable",38884);
    assert.equal(r.status,"review-required");
  }
});
test("forbidden enabled and unknown statuses reject acceptance",()=>{
  for(const extra of [[{id:"memory",enabled:true}],[{id:"memory",enabled:"yes"}]]){
    const pl=plugins().plugins.filter(x=>x.id!=="memory").concat(extra);
    assert.equal(inspectLive(config(),{plugins:pl},"/ci/disposable",38884).status,"review-required");
  }
});
test("malformed CLI shape is rejected, never serialized",()=>{
  assert.throws(()=>inspectLive({serverUrl:"invalid"},{plugins:[]},"/ci/disposable",38884));
  assert.throws(()=>inspectLive(config(),{plugins:null},"/ci/disposable",38884));
});

test("fixed-schema private disposable support bundle excludes untrusted fields",()=>{
  const root=mkdtempSync(join(tmpdir(),"d059-ci-test-"));
  const path=join(root,"d059-support-bundle.json");
  try{
    const report=inspectLive(config(),plugins(),"/ci/disposable",38884);
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
