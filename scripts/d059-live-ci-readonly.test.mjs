import { test } from "node:test";
import { strict as assert } from "node:assert";
import { inspectLive } from "./d059-live-ci-readonly.mjs";
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
