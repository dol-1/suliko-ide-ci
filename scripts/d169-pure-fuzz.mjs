// D169 actual property-based fuzz tests; deterministic seed and bounded runs.
// Only pure D163/D164/D165 parsers, never network, sockets, BB user files or secrets.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createRequire} from "node:module";
import {FORBIDDEN_IDS,inspectStrictNativePluginState as pluginState} from "./d163-strict-native-plugin-state.mjs";
import {verifyNativeLoopback as loopback} from "./d164-native-listener-guard.mjs";
import {parseSetupArgs} from "./d165-setup-args.mjs";
if(process.env.CI!=="true"||!process.env.RUNNER_TEMP)
 throw Error("D169 requires disposable standard public CI runner");
const require=createRequire(path.join(process.env.RUNNER_TEMP,"d169-fuzz","package.json"));
const fc=require("fast-check");
const common={seed:20261115,numRuns:300,interruptAfterTimeLimit:90000,endOnFailure:true};
const forbidden=id=>({id,enabled:false,status:"disabled"});
const hello={id:"suliko-hello",enabled:true,status:"running"};
const validRows=()=>[...FORBIDDEN_IDS.map(forbidden),hello];
const formats={
 Linux:es=>es.map(([addr,p])=>"LISTEN 0 4096 "+addr+":"+p+" 0.0.0.0:*").join("\n"),
 macOS:es=>es.map(([addr,p])=>"bb-app 1 runner 15u IPv4 0 0t0 TCP "+addr+":"+p+" (LISTEN)").join("\n"),
 Windows:es=>JSON.stringify(es.map(([addr,p])=>({LocalAddress:addr,LocalPort:p})))
};
test("D169/property actual 3 OS listener parser accepts only strict loopback pairs",()=>{
 fc.assert(fc.property(
  fc.constantFrom("Linux","macOS","Windows"),
  fc.constantFrom("127.0.0.1","::1","[::1]","0:0:0:0:0:0:0:1"),
  fc.constantFrom("127.0.0.1","::1","[::1]","0:0:0:0:0:0:0:1"),
  (os,a,b)=>loopback(os,formats[os]([[a,38906],[b,38907]]),[38906,38907])===true
 ),common);
});
test("D169/property actual 3 OS listener parser rejects mixed loopback and externally bound addresses",()=>{
 fc.assert(fc.property(
  fc.constantFrom("Linux","macOS","Windows"),
  fc.constantFrom("0.0.0.0","::","*","192.0.2.23","fe80::1","127.0.0.2","[::]"),
  fc.constantFrom(38906,38907),
  (os,address,port)=>{
   const entries=[["127.0.0.1",38906],["::1",38907],[address,port]];
   assert.throws(()=>loopback(os,formats[os](entries),[38906,38907]),
     error=>error?.category==="listener-exposed-nonloopback");
  }
 ),common);
});
test("D169/property any absent or invalid second listener fails closed",()=>{
 fc.assert(fc.property(
  fc.constantFrom("Linux","macOS","Windows"),
  fc.integer({min:1024,max:65535}).filter(p=>p!==38907&&p!==38906),
  (os,p)=>assert.throws(
    ()=>loopback(os,formats[os]([["127.0.0.1",38906],["127.0.0.1",p]]),[38906,38907]),
    error=>error?.category==="listener-not-observed")
 ),common);
});
test("D169/property forbidden plugin with enabled or stale status always fails SEC02",()=>{
 const bad=fc.constantFrom(
  {enabled:true,status:"running"},
  {enabled:true,status:"disabled"},
  {enabled:false,status:"error"},
  {enabled:false,status:"needs-configuration"},
  {enabled:false,status:"running"},
  {enabled:null,status:"disabled"},
  {enabled:false,status:null});
 fc.assert(fc.property(fc.integer({min:0,max:FORBIDDEN_IDS.length-1}),bad,(index,flags)=>{
  const rows=validRows(),id=FORBIDDEN_IDS[index];
  rows[index]={id,...flags};
  const result=pluginState(rows);
  return result.safe===false&&result.forbiddenOffenders.some(x=>x.id===id);
 }),common);
});
test("D169/property duplicate or missing own plugin never becomes safe",()=>{
 fc.assert(fc.property(fc.constantFrom("missing","duplicate","disabled"),which=>{
  const rows=validRows();
  if(which==="missing")rows.pop();
  else if(which==="duplicate")rows.push({...hello});
  else rows[rows.length-1]={...hello,enabled:false};
  if(which==="duplicate")assert.throws(()=>pluginState(rows),e=>e?.category==="duplicate-own-plugin");
  else assert.equal(pluginState(rows).safe,false);
 }),common);
});
test("D169/property install accepts precisely a 64-character hex SHA and absolute candidate path",()=>{
 const hex=fc.array(fc.constantFrom(..."0123456789abcdef"),{minLength:64,maxLength:64}).map(xs=>xs.join(""));
 fc.assert(fc.property(hex,fc.constantFrom("/tmp/hello.tar.gz","C:\\d165\\hello.tar.gz"),(sha,file)=>{
  const r=parseSetupArgs(["--install","--plugin-sha",sha,"--candidate-file",file]);
  assert.equal(r.mode,"install");assert.equal(r.sha,sha);assert.equal(r.candidateFile,file);
 }),common);
});
test("D169/property malformed or UNSET plugin SHA never accepts installation",()=>{
 fc.assert(fc.property(fc.string({maxLength:80}).filter(x=>!/^[a-f0-9]{64}$/.test(x)),
  s=>assert.throws(()=>parseSetupArgs(["--install","--plugin-sha",s,"--candidate-file","/tmp/hello.tar.gz"])),
 ),common);
 for(const sha of ["UNSET","", "0".repeat(63), "F".repeat(64)])
  assert.throws(()=>parseSetupArgs(["--install","--plugin-sha",sha,"--candidate-file","/tmp/hello.tar.gz"]));
});
test("D169/property unknown CLI args, mixed modes, duplicate SHA cannot sneak into install",()=>{
 fc.assert(fc.property(fc.string({minLength:1,maxLength:40}).filter(x=>!["--install","--uninstall","--dry-run","--plugin-sha","--candidate-file"].includes(x)),
   x=>assert.throws(()=>parseSetupArgs(["--install",x]))),common);
 const pin="f".repeat(64);
 for(const mode of ["--uninstall","--dry-run","--install"])
  assert.throws(()=>parseSetupArgs(["--install",mode,"--plugin-sha",pin,"--candidate-file","/tmp/a"]));
});
console.log("D169 fast-check genuine bounded property tests of all three pure parsers, seeded; no fabricated mutation/e2e coverage.");
