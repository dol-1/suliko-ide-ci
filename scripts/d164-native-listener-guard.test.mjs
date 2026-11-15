// D164 pure native OS listener snapshots; never reads actual sockets/hosts.
import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyNativeLoopback as verify} from "./d164-native-listener-guard.mjs";
const ports=[38906,38907];
const fail=(os,raw,category)=>assert.throws(()=>verify(os,raw,ports),e=>e?.category===category);
const ss=(entries)=>entries.map(([address,p])=>"LISTEN 0 4096 "+address+":"+p+" 0.0.0.0:*").join("\n");
const lsof=(entries)=>"COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\n"+
 entries.map(([address,p])=>"bb-app 1 runner 15u IPv4 0 0t0 TCP "+address+":"+p+" (LISTEN)").join("\n");
const win=(entries)=>JSON.stringify(entries.map(([address,p])=>({LocalAddress:address,LocalPort:p})));
test("actual two local listeners each OS strictly IPv4 or IPv6 loopback",()=>{
 for(const os of ["Linux","macOS","Windows"]){
  const fn=os==="Linux"?ss:os==="macOS"?lsof:win;
  assert.equal(verify(os,fn([["127.0.0.1",38906],["::1",38907]]),ports),true);
  assert.equal(verify(os,fn([["[::1]",38906],["127.0.0.1",38907]]),ports),true);
 }
});
test("reject any wildcard exposure even with a correct loopback address",()=>{
 for(const os of ["Linux","macOS","Windows"]){
  const fn=os==="Linux"?ss:os==="macOS"?lsof:win;
  for(const address of ["0.0.0.0","::","*","192.0.2.11","fe80::1"]){
   fail(os,fn([["127.0.0.1",38906],[address,38906],["::1",38907]]),"listener-exposed-nonloopback");
  }
 }
});
test("both expected exact ports required; unrelated listening ports insufficient",()=>{
 for(const os of ["Linux","macOS","Windows"]){
  const fn=os==="Linux"?ss:os==="macOS"?lsof:win;
  fail(os,fn([["127.0.0.1",38906],["127.0.0.1",39999]]),"listener-not-observed");
  fail(os,fn([]),"listener-not-observed");
 }
});
test("malformed Windows JSON and port/address types fail closed",()=>{
 fail("Windows","", "listener-invalid-windows-json");
 fail("Windows","{", "listener-invalid-windows-json");
 fail("Windows",JSON.stringify([{LocalPort:"38906",LocalAddress:"127.0.0.1"}]),"listener-invalid-windows-json");
 fail("Windows",JSON.stringify([{LocalPort:38906,LocalAddress:null}]),"listener-invalid-windows-json");
});
test("invalid contract never accepted or echoed",()=>{
 for(const value of [null,{},[],[38906,38906],[38906,0],[38906,70000]]){
  assert.throws(()=>verify("Linux",ss([]),value),e=>e?.category==="listener-contract");
 }
 assert.throws(()=>verify("Darwin","",ports),e=>e?.category==="listener-contract");
});
