import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,render,fetchExactRuns} from './d247-exact-head-premerge-note.mjs';
const sha='a'.repeat(40),old='b'.repeat(40),branch='feat/d247-exact-head-premerge-note';
const a='.github/workflows/d165-e1-one-command-3os.yml',b='.github/workflows/d063-gitleaks.yml';
const inventory=()=>({schema:'suliko-d217-affected-workflows-v1',head:sha,base:old,
  branch,mustCheckExactHead:[a,b],blockedByUnrunnable:[]});
const ok=(path,id,attempt=1)=>({id,path,run_attempt:attempt,head_sha:sha,head_branch:branch,
  event:'push',status:'completed',conclusion:'success'});
test('D247 GREEN requires all exact-head paths and correct provenance',()=>{
 const r=assess(inventory(),[ok(a,100),ok(b,101)],{sha,branch});
 assert.equal(r.green,true);
 assert.match(render(r),/EXACT-HEAD PREMERGE GREEN/);
 assert.match(render(r),/actions\/runs\/101/);
});
test('D247 MISSING and older green SHA never authorize current source',()=>{
 const r=assess(inventory(),[{...ok(a,100),head_sha:old},ok(b,101)],{sha,branch});
 assert.equal(r.green,false);assert.equal(r.rows[0].verdict,'MISSING');
});
test('D247 cancelled and skipped count RED, not GREEN',()=>{
 for(const conclusion of ['cancelled','skipped','failure','timed_out']){
  const r=assess(inventory(),[{...ok(a,100),conclusion},ok(b,101)],{sha,branch});
  assert.equal(r.green,false);assert.equal(r.rows[0].verdict,'RED');
 }
});
test('D247 newer failed attempt supersedes previous successful attempt of same run',()=>{
 const r=assess(inventory(),[ok(a,100,1),{...ok(a,100,2),conclusion:'failure'},ok(b,101)],{sha,branch});
 assert.equal(r.rows[0].attempt,2);assert.equal(r.rows[0].verdict,'RED');
});
test('D247 newest pending supersedes old exact-head success, no false GO',()=>{
 const r=assess(inventory(),[ok(a,100),{...ok(a,102),status:'in_progress',conclusion:null},ok(b,101)],{sha,branch});
 assert.equal(r.green,false);assert.equal(r.rows[0].verdict,'PENDING');
});
test('D247 unrunnable workflow is BLOCKED even when other path succeeded',()=>{
 const i=inventory();i.blockedByUnrunnable=[{workflow:a}];
 const r=assess(i,[ok(a,100),ok(b,101)],{sha,branch});
 assert.equal(r.green,false);assert.equal(r.rows[0].verdict,'BLOCKED');
});
test('D247 mismatched inventory head and duplicated required names refused',()=>{
 const i=inventory();i.head=old;
 assert.throws(()=>assess(i,[],{sha,branch}),/D247_D217_NOT_EXACT_HEAD/);
 const d=inventory();d.mustCheckExactHead=[a,a];
 assert.throws(()=>assess(d,[],{sha,branch}),/D247_DUPLICATE_REQUIRED/);
});
test('D247 API pagination bounded, filtered by head, never treats old green as current',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({workflow_runs:[ok(a,1),{...ok(b,2),head_sha:old}]})}};
 const runs=await fetchExactRuns({sha,branch,token:'synthetic',fetchImpl});
 assert.equal(calls,1);assert.deepEqual(runs.map(x=>x.id),[1]);
});
