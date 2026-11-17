import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,render,gather} from './d240-qa-ten-run-audit.mjs';
const s='a'.repeat(40),old='b'.repeat(40);
const run=i=>({id:i,head_sha:s,head_branch:'main',event:'schedule',path:'.github/workflows/qa01-parity-run.yml',
 created_at:new Date(Date.parse('2026-11-16T00:00:00Z')-i*60000).toISOString(),
 status:'completed',conclusion:'success',run_attempt:1});
test('D240 exactly ten original distinct same SHA real QA success required',()=>{
 const rows=Array.from({length:10},(_,i)=>run(i+1));
 const x=assess(s,rows);
 assert.equal(x.consecutiveExactHeadAllGreen,true);assert.match(render(x),/EXACT_HEAD_TEN_DISTINCT/);
});
test('D240 count nine, intervening old SHA, failed/cancelled/queued all fail closed',()=>{
 const ten=Array.from({length:10},(_,i)=>run(i+1));
 assert.equal(assess(s,ten.slice(0,9)).consecutiveExactHeadAllGreen,false);
 for(const bad of [{...ten[4],head_sha:old},{...ten[4],conclusion:'cancelled'},
  {...ten[4],conclusion:'failure'},{...ten[4],status:'in_progress',conclusion:null},
  {...ten[4],run_attempt:2}]){
   const rows=[...ten];rows[4]=bad;assert.equal(assess(s,rows).consecutiveExactHeadAllGreen,false);
 }
});
test('D240 no duplicated run ID or malformed source counted as ten',()=>{
 const rows=Array.from({length:10},(_,i)=>run(i+1));
 rows[3].id=rows[2].id;
 assert.throws(()=>assess(s,rows),/D240_DUPLICATE_RUN/);
});
test('D240 authoritative GH main SHA differs => never borrow old green',async()=>{
 let n=0;
 const fetchImpl=async()=>({ok:true,json:async()=>++n===1?
  {commit:{sha:old}}:{workflow_runs:Array.from({length:10},(_,i)=>run(i+1))}});
 const report=await gather({token:'synthetic',fetchImpl});
 assert.equal(report.consecutiveExactHeadAllGreen,false);
});
