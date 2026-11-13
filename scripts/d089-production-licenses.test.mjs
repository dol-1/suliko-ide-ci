import {test} from "node:test";
import assert from "node:assert/strict";
import {auditProductionLicenses} from "./d089-production-licenses.mjs";
const tree=[{dependencies:{zod:{version:"4.6.7"}},devDependencies:{typescript:{version:"5.9.3"}}}];
const valid={MIT:[{name:"zod",versions:["4.6.7"]}]};
test("production (not build/dev) license records exactly reconcile",()=>{
 const r=auditProductionLicenses(tree,valid);
 assert.equal(r.productionInstalled,1);assert.equal(r.licensesFound,1);
 assert.equal(r.productionMissingLicense,0);
});
test("missing production dependency license fails",()=>assert.throws(()=>auditProductionLicenses(tree,{})));
test("dev-only dependency misleadingly listed as shipped fails",()=>assert.throws(()=>auditProductionLicenses(tree,{MIT:[{name:"typescript",versions:["5.9.3"]}]})));
test("license mismatch, unknown/copyleft and duplicate fail closed",()=>{
 assert.throws(()=>auditProductionLicenses(tree,{MIT:[{name:"zod",versions:["4.6.6"]}]}));
 assert.throws(()=>auditProductionLicenses(tree,{UNKNOWN:[{name:"zod",versions:["4.6.7"]}]}));
 assert.throws(()=>auditProductionLicenses(tree,{"GPL-3.0":[{name:"zod",versions:["4.6.7"]}]}));
 assert.throws(()=>auditProductionLicenses(tree,{MIT:[{name:"zod",versions:["4.6.7"]},{name:"zod",versions:["4.6.7"]}]}));
});
test("empty production graph accepts D043 no-licenses sentinel",()=>{
 const r=auditProductionLicenses([{devDependencies:{typescript:{version:"5.9.3"}}}],"No licenses in packages found");
 assert.equal(r.licensesFound,0);
});
test("malformed and synthetic secret-shape never accepted",()=>{
 assert.throws(()=>auditProductionLicenses(tree,[]));
 const secret="sk-"+"SYNTHETIC_DO_NOT_LOG_12345";
 assert.throws(()=>auditProductionLicenses(tree,{MIT:[{name:secret,versions:["4.6.7"]}]}));
});
