import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,render,getRuns} from './d254-ci-usage-report.mjs';
const sha='a'.repeat(40),start=Date.parse('2026-11-10T00:00:00Z'),end=Date.parse('2026-11-17T00:00:00Z');
const run=(id,name='A',conclusion='success',minutes=10)=>({
 id,name,path:'.github/workflows/'+name+'.yml@main',head_sha:sha,run_attempt:1,
 created_at:'2026-11-15T10:00:00Z',run_started_at:'2026-11-15T10:00:00Z',
 updated_at:new Date(Date.parse('2026-11-15T10:00:00Z')+minutes*60000).toISOString(),
 status:'completed',conclusion
});
test('D254 actual completed workflow elapsed and duplicate source accounting',()=>{
 const r=analyze([run(1,'A','success',10),run(2,'A','cancelled',3),run(3,'B','success',8)],{startMs:start,endMs:end});
 assert.equal(r.completed,3);assert.equal(r.top5[0].wallMinutes,13);
 assert.equal(r.duplicateCandidates.length,1);
 assert.match(render(r),/NOT billed CI minutes/);
});
test('D254 invalid time, source or excessive duration fails closed',()=>{
 const x=run(1);x.head_sha='bad';
 assert.throws(()=>analyze([x],{startMs:start,endMs:end}),/UNTRUSTED_RUN/);
 const y=run(2);y.updated_at='2026-11-20T10:00:00Z';
 assert.throws(()=>analyze([y],{startMs:start,endMs:end}),/DURATION_INCONSISTENT/);
});
test('D254 live pagination and time filter bounded',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return{ok:true,json:async()=>({workflow_runs:[run(5)]})}};
 const r=await getRuns({token:'synthetic',now:Date.parse('2026-11-17T00:00:00Z'),fetchImpl});
 assert.equal(r.observed,1);assert.equal(calls,1);
});
