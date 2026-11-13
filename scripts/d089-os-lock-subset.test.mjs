import {test} from "node:test";
import assert from "node:assert/strict";
import {checkOsInstalledLockSubset} from "./d089-os-lock-subset.mjs";
const lock="lockfileVersion: '9.0'\n\npackages:\n\n  a@1.0.0:\n    resolution: {integrity: sha512-SYNTHETIC_A}\n  b@2.0.0:\n    resolution: {integrity: sha512-SYNTHETIC_B}\n\nsnapshots:\n\n  a@1.0.0: {}\n  b@2.0.0: {}\n";
const tree=[{dependencies:{a:{version:"1.0.0"}}}];
test("Mac and Windows installed identities are strict frozen-lock subsets",()=>{
 for(const platform of ["darwin","win32"]){
   const r=checkOsInstalledLockSubset(lock,tree,platform);
   assert.equal(r.lockIdentities,2);assert.equal(r.resolvedInstalledIdentities,1);
   assert.equal(r.lockedNotInstalled,1);assert.equal(r.unexpectedInstalledIdentities,0);
   assert.ok(!JSON.stringify(r).includes("a@1"));
 }
});
test("unexpected OS-installed package is rejected",()=>{
 assert.throws(()=>checkOsInstalledLockSubset(lock,[{dependencies:{c:{version:"1.0.0"}}}],"darwin"));
});
test("unreviewed OS and invalid report rejected",()=>{
 assert.throws(()=>checkOsInstalledLockSubset(lock,tree,"linux"));
 assert.throws(()=>checkOsInstalledLockSubset("not a lock",tree,"win32"));
});
test("malformed and synthetic secret identifiers never print",()=>{
 const secret="sk-"+"SYNTHETIC_DO_NOT_LOG_12345";
 assert.throws(()=>checkOsInstalledLockSubset(lock,[{dependencies:{[secret]:{version:"1.0.0"}}}],"win32"));
});
