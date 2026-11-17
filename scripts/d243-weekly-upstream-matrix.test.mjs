import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPair,summarize,issueDraft,markdown,fetchRuns} from './d243-weekly-upstream-matrix.mjs';
const sha='a'.repeat(40),run={id:103,head_sha:sha,head_branch:'main',event:'schedule',
 path:'.github/workflows/d064-sdk-matrix.yml',created_at:'2026-11-15T06:41:00Z',
 status:'completed',conclusion:'success'};
const artifact=context=>({schema:'suliko-d228-compat-matrix-v1',context,
 checked_sha:sha,pinned_bb:'0.49.0',pinned_sdk:'0.6.132',
 upstream_sha:'b'.repeat(40),outcome:'PASS',category:'NONE'});
test('D243 only genuine artifact matching same exact GH source counts green',()=>{
 const r=assessPair(run,{pinned:artifact('pinned'),'upstream-main':artifact('upstream-main')});
 const d=summarize([r],'c'.repeat(40),Date.parse('2026-11-17T00:00:00Z'));
 assert.equal(d.allPass,true);assert.match(markdown(d),/NOT necessarily/);
});
test('D243 missing/expired artifact RED with issue draft, not green',()=>{
 const r=assessPair(run,{pinned:artifact('pinned')});
 assert.equal(r.result,'RED_OR_INCOMPLETE');assert.equal(r.issueCategory,'MISSING_ARTIFACT');
 const d=summarize([r],'c'.repeat(40),Date.now());
 assert.match(issueDraft(d),/UNSENT/);
});
test('D243 failing SDK typecheck category source only without invented runtime',()=>{
 const bad={...artifact('upstream-main'),outcome:'RED_OR_INCOMPLETE',category:'SDK_API'};
 const r=assessPair({...run,conclusion:'failure'},{pinned:artifact('pinned'),'upstream-main':bad});
 assert.equal(r.issueCategory,'SDK_API');assert.equal(r.result,'RED_OR_INCOMPLETE');
});
test('D243 invalid upstream SHA or source checksum mismatch rejected',()=>{
 assert.throws(()=>assessPair(run,{pinned:{...artifact('pinned'),checked_sha:'c'.repeat(40)}}),/D228_ARTIFACT/);
 const d=assessPair(run,{pinned:artifact('pinned'),'upstream-main':artifact('upstream-main')});
 assert.throws(()=>summarize([d],'bad',Date.now()),/BAD_SNAPSHOT/);
});
test('D243 scheduled main exact workflow path only, no other/private pulls',async()=>{
 const x=[run,{...run,id:104,event:'push'},{...run,id:105,path:'.github/workflows/d085-release-dry-run.yml'}];
 let calls=0;
 const list=await fetchRuns({token:'synthetic',now:Date.parse('2026-11-17T00:00:00Z'),
  fetchImpl:async()=>{calls++;return{ok:true,json:async()=>({workflow_runs:x})}}});
 assert.equal(calls,1);assert.deepEqual(list.map(x=>x.id),[103]);
});
