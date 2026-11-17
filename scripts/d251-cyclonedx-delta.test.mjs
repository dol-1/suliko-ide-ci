import test from 'node:test';
import assert from 'node:assert/strict';
import {inventory,compare,render} from './d251-cyclonedx-delta.mjs';
const oldRef='1'.repeat(40),newRef='2'.repeat(40);
const bom=components=>({bomFormat:'CycloneDX',specVersion:'1.6',components});
const c=(name,version,license='MIT')=>({name,version,purl:'pkg:npm/'+name+'@'+version,licenses:[{license:{id:license}}]});
test('D251 detects added, removed, version-set change and same-version license delta',()=>{
 const old=bom([c('stay','1','MIT'),c('old','1'),c('bump','1')]);
 const now=bom([c('stay','1','Apache-2.0'),c('added','1'),c('bump','2')]);
 const d=compare(old,now,{oldRef,newRef});
 assert.equal(d.added[0].id,'pkg:npm/added');
 assert.equal(d.removed[0].id,'pkg:npm/old');
 assert.equal(d.updated[0].id,'pkg:npm/bump');
 assert.equal(d.licenseChanges[0].id,'pkg:npm/stay');
 assert.match(render(d),/NOT_ASSESSED_BY_CYCLONEDX_INVENTORY/);
});
test('D251 no false delta on semantically same component set',()=>{
 const v=compare(bom([c('demo','1')]),bom([c('demo','1')]),{oldRef,newRef});
 assert.equal(v.added.length+v.removed.length+v.updated.length+v.licenseChanges.length,0);
 assert.equal(v.securityConclusion,'NO_VULNERABILITY_CLEARANCE_OR_RELEASE_GO');
});
test('D251 invalid source ref or unreviewed CycloneDX refused',()=>{
 assert.throws(()=>compare(bom([]),bom([]),{oldRef,newRef:oldRef}),/IMMUTABLE/);
 assert.throws(()=>inventory({components:[]}),/BAD_CYCLONEDX/);
});
test('D251 duplicate package identity with conflicting license refused',()=>{
 assert.throws(()=>inventory(bom([c('x','1','MIT'),c('x','1','GPL-3.0-only')])),/DUPLICATE_CONFLICTING_LICENSE/);
});

test('D251 supports the current CycloneDX 1.7 document schema',()=>{const d=bom([c('x','1')]);d.specVersion='1.7';assert.equal(inventory(d).size,1)});
