import {test} from "node:test";
import assert from "node:assert/strict";
import {categories} from "./qa01-host-prereqs.mjs";
test("reports own synthetic project only by categorical booleans",()=>{
 const r=categories([{id:"synthetic-secret-machine-01",status:"connected"}],
 [{name:"qa01-synthetic",sources:[{hostId:"synthetic-secret-machine-01",path:"/PRIVATE/NOLOG"}]}],"web","qa01-synthetic");
 assert.equal(r.syntheticSourceOnConnectedHost,true);
 assert.equal(r.connectedHostCount,1);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE|synthetic-secret-machine/);
});
test("disconnected project host is a failed prerequisite",()=>{
 const r=categories([{id:"x",status:"disconnected"}],[{name:"qa01-desktop-synthetic",sources:[{hostId:"x"}]}],"desktop","qa01-desktop-synthetic");
 assert.equal(r.syntheticSourceOnConnectedHost,false);
});
test("multiple synthetic projects are ambiguous",()=>{
 const p={name:"qa01-synthetic",sources:[]};
 assert.equal(categories([],[p,p],"web","qa01-synthetic").syntheticProjectFound,false);
});
test("malformed input and unsafe target rejected",()=>{
 assert.throws(()=>categories({},[],"web","qa01-synthetic"));
 assert.throws(()=>categories([],[],"bogus","qa01-synthetic"));
 assert.throws(()=>categories([],[],"web","../../secret"));
});
