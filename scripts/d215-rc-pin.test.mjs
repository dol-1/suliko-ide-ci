import test from "node:test";
import assert from "node:assert/strict";
import {validateRcPins} from "./d215-rc-pin.mjs";
const source="1c7470934ab694ce69ac92e70de300d6f6c50743";
const digest="8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a";
test("D215 approved immutable 40-hex commit + reviewed archive bytes",()=>{
 assert.deepEqual(validateRcPins(source,digest,digest),{approvedCommit:source,candidateDigest:digest});
});
test("D215 UNSET still permits reviewed *candidate* in isolated preapproval CI",()=>{
 assert.deepEqual(validateRcPins("UNSET",digest,digest),{approvedCommit:"UNSET",candidateDigest:digest});
});
for(const malformed of [digest,source.slice(1),source.toUpperCase(),source+"0",source.slice(0,39)+"g","0".repeat(40),"", "UNSET\n"+source]) {
 test("D215 cannot confuse approved commit with artifact digest "+JSON.stringify(malformed),()=>{
   assert.throws(()=>validateRcPins(malformed,digest,digest),/malformed-approved-rc-pin/);
 });
}
for(const malformed of [source,"UNSET","",digest.toUpperCase(),"0".repeat(63),"g"+digest.slice(1)]) {
 test("D215 candidate digest MUST be 64 lowercase hex "+JSON.stringify(malformed),()=>{
  assert.throws(()=>validateRcPins(source,malformed,digest),/malformed-candidate-pin/);
 });
}
test("D215 arbitrary archive rejected even with valid approved source commit",()=>{
 assert.throws(()=>validateRcPins(source,digest,"f".repeat(64)),/candidate-source-not-reviewed/);
});
test("D215 NO approved source bypass of reviewed artifact digest",()=>{
 assert.throws(()=>validateRcPins(source,digest,source),/candidate-source-not-reviewed/);
});
