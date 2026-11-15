// D163: public pure negative SEC02 contract tests; no installed runtime.
import {test} from "node:test";
import assert from "node:assert/strict";
import {FORBIDDEN_IDS,inspectStrictNativePluginState as inspect} from "./d163-strict-native-plugin-state.mjs";
const hello={id:"suliko-hello",enabled:true,status:"running"};
const disabled=id=>({id,enabled:false,status:"disabled"});
const checkError=(rows,category)=>assert.throws(()=>inspect(rows),error=>error?.category===category);
test("exact reviewed five forbidden IDs are immutable",()=>{
 assert.deepEqual([...FORBIDDEN_IDS],["bb--mcp","account-pool","connect","bb--connect-next","memory"]);
 assert.equal(Object.isFrozen(FORBIDDEN_IDS),true);
});
test("allow only own enabled Hello and absent or BOTH-fields disabled stock",()=>{
 for(const rows of [[hello],[...FORBIDDEN_IDS.map(disabled),hello],[{id:"unrelated",enabled:true},hello]]){
  const result=inspect(rows);
  assert.equal(result.safe,true);
  assert.deepEqual(result.forbiddenOffenders,[]);
  assert.equal(result.helloActive,true);
 }
});
test("fail-closed if own Hello missing, disabled, duplicated or unrecognized",()=>{
 assert.equal(inspect([]).lastCategory,"own-hello-missing");
 assert.equal(inspect([]).safe,false);
 for(const name of ["suliko-hello","bb-plugin-suliko-hello"]){
  for(const enabled of [false,null,undefined,0]){
   const state=inspect([{id:name,enabled}]);
   assert.equal(state.safe,false);
   assert.equal(state.lastCategory,"own-hello-not-enabled");
  }
 }
 checkError([hello,{id:"bb-plugin-suliko-hello",enabled:true}],"duplicate-own-plugin");
 checkError([hello,hello],"duplicate-own-plugin");
});
test("all five forbidden plugin IDs reject enabled, stale, missing or malformed live flags",()=>{
 for(const id of FORBIDDEN_IDS){
  for(const row of [
   {id,enabled:true,status:"running"},
   {id,enabled:false,status:"running"},
   {id,enabled:false,status:"needs-configuration"},
   {id,enabled:false,status:"error"},
   {id,enabled:false},
   {id,status:"disabled"},
   {id,enabled:null,status:"disabled"},
   {id,enabled:true,status:"disabled"}
  ]){
   const state=inspect([row,hello]);
   assert.equal(state.safe,false);
   assert.deepEqual(state.forbiddenOffenders.map(x=>x.id),[id]);
   assert.match(state.lastCategory,new RegExp("^forbidden-"+id+"-enabled-(true|false|other)-status-(running|needs-configuration|error|disabled|other)$"));
  }
  checkError([disabled(id),disabled(id),hello],"duplicate-stock-plugin");
 }
});
test("only fixed categories are returned, private strings never echoed",()=>{
 const secret="private-token-user-home-do-not-emit";
 const state=inspect([{id:"bb--mcp",enabled:false,status:secret,details:secret},hello]);
 assert.equal(state.safe,false);
 assert.equal(state.lastCategory,"forbidden-bb--mcp-enabled-false-status-other");
 assert.equal(JSON.stringify(state).includes(secret),false);
});
test("a stock forbidden state is not overridden by healthy own Hello",()=>{
 const state=inspect([{id:"connect",enabled:false,status:"running"},hello]);
 assert.equal(state.helloActive,true);
 assert.equal(state.safe,false);
 assert.equal(state.forbiddenOffenders.length,1);
});
test("explicitly reject nonarray JSON and malformed inputs",()=>{
 for(const input of [null,{},false,"secret",0])checkError(input,"invalid-live-plugins");
});
