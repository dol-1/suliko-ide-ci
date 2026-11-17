// D254 read-only public GH Actions 7-day workflow elapsed-time audit, not GitHub billing.
import fs from 'node:fs';
const repo='dol-1/suliko-ide-ci';
function date(input){const v=Date.parse(input??'');if(!Number.isFinite(v))throw Error('D254_BAD_API_DATE');return v}
function clean(s){return typeof s==='string'?s.replace(/[^A-Za-z0-9 ._()/:-]/g,'').slice(0,150):'UNKNOWN'}
export function analyze(runs,{startMs,endMs}){
 if(!Array.isArray(runs)||runs.length>6000||!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=startMs)
   throw Error('D254_INVALID_SCOPE');
 const grouped=new Map(),distinct=new Map(),cancellations=[];
 let total=0,completed=0,pending=0;
 for(const r of runs){
  if(!Number.isSafeInteger(r.id)||typeof r.head_sha!=='string'||!(/^[a-f0-9]{40}$/.test(r.head_sha)))throw Error('D254_UNTRUSTED_RUN');
  const created=date(r.created_at);if(created<startMs||created>endMs)continue;
  total++;
  const name=clean(r.name),key=clean(r.path?.split('@')[0]??name);
  const g=grouped.get(key)??{workflow:key,name,runs:0,completed:0,wallMinutes:0,cancelled:0,failed:0,retried:0};
  g.runs++;
  if(r.run_attempt>1)g.retried++;
  if(r.status==='completed'){
   const started=date(r.run_started_at??r.created_at),ended=date(r.updated_at);
   if(ended<started||ended-started>48*3600*1000)throw Error('D254_DURATION_INCONSISTENT');
   const duration=(ended-started)/60000;
   g.wallMinutes+=duration;
   g.completed++;completed++;
   if(r.conclusion==='cancelled'){g.cancelled++;cancellations.push({workflow:key,head_sha:r.head_sha.slice(0,8)})}
   else if(r.conclusion!=='success')g.failed++;
  }else pending++;
  grouped.set(key,g);
  const sig=key+'@'+r.head_sha;
  const ids=distinct.get(sig)??new Set();ids.add(r.id);distinct.set(sig,ids);
 }
 const ranked=[...grouped.values()].sort((a,b)=>b.wallMinutes-a.wallMinutes||a.workflow.localeCompare(b.workflow));
 for(const v of ranked)v.wallMinutes=Number(v.wallMinutes.toFixed(2));
 const duplicateCandidates=[...distinct.entries()].filter(([k,ids])=>ids.size>1)
    .map(([k,ids])=>({workflow:k.split('@')[0],distinctRuns:ids.size}))
    .sort((a,b)=>b.distinctRuns-a.distinctRuns).slice(0,20);
 return {schema:'suliko-d254-ci-observed-run-walltime-v1',
  start:new Date(startMs).toISOString(),end:new Date(endMs).toISOString(),
  observed:total,completed,pending,top5:ranked.slice(0,5),duplicateCandidates,
  cancelledJobsByWorkflow:cancellations.reduce((acc,c)=>{acc[c.workflow]=(acc[c.workflow]??0)+1;return acc},{}),
  accounting:'WORKFLOW_WALL_ELAPSED_NOT_GITHUB_BILLABLE_OR_ACTUAL_RUNNER_MINUTES',
  recommendation:'Review same-SHA duplicate push/workflow_call and cancelled concurrency groups before changing jobs; retain strict all-OS/QA gates and no paid runners.'};
}
export function render(r){
 const lines=['# D254 past 7 days public GitHub Actions CI observability',
   'UTC window: '+r.start+' to '+r.end,
   'Workflow run records: '+r.observed+'; completed '+r.completed+'; still pending '+r.pending,
   '**Important:** wall elapsed time is NOT billed CI minutes or summed running-job minutes; parallel matrices and queue skew the estimate.',
   '| Top workflow | Completed runs | Observed wall minutes | Cancellations |',
   '| --- | ---: | ---: | ---: |'];
 for(const item of r.top5)lines.push('| '+item.workflow+' | '+item.completed+' | '+item.wallMinutes+' | '+item.cancelled+' |');
 lines.push('','Possible duplicated workflow runs on same head (do not call waste until reviewed):');
 if(!r.duplicateCandidates.length)lines.push('No same-head duplicates observed in returned complete window.');
 for(const item of r.duplicateCandidates)lines.push('- '+item.workflow+': '+item.distinctRuns+' distinct runs on one exact SHA.');
 lines.push('','Recommendations: audit redundant direct-push and workflow_call invocation; use SHA/ref/run_id-scoped concurrency only where source guards require; preserve all true Windows/macOS/Linux and QA gates. No paid-runner suggestion, no automatic cancellation of legitimate validations.');
 return lines.join('\n')+'\n';
}
export async function getRuns({token,now=Date.now(),fetchImpl=fetch}){
 if(!token||typeof token!=='string')throw Error('D254_AUTH_REQUIRED');
 const start=now-7*86400000,end=now;
 const startDay=new Date(start).toISOString().slice(0,10),endDay=new Date(end).toISOString().slice(0,10);
 const runs=[];
 for(let page=1;page<=60;page++){
  const url='https://api.github.com/repos/'+repo+'/actions/runs?created='+encodeURIComponent(startDay+'..'+endDay)+'&per_page=100&page='+page;
  const res=await fetchImpl(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error'});
  if(!res.ok)throw Error('D254_GITHUB_HTTP_'+res.status);
  const body=await res.json();
  if(!Array.isArray(body.workflow_runs))throw Error('D254_RESPONSE_SCHEMA');
  runs.push(...body.workflow_runs);
  if(body.workflow_runs.length<100)return analyze(runs,{startMs:start,endMs:end});
 }
 throw Error('D254_TOO_MANY_RUNS_NO_PARTIAL_REPORT');
}
if(process.argv[1]?.endsWith('d254-ci-usage-report.mjs')){
 try{
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==repo)throw Error('D254_PUBLIC_GH_ONLY');
  const result=await getRuns({token:process.env.GITHUB_TOKEN});
  const out=process.env.RUNNER_TEMP+'/d254-ci-usage.json';
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,render(result));
  console.log('D254_7D_WORKFLOW_ELAPSED_TOP5_SOURCE=PASS; NOT billed/runner minutes, not a paid runner request');
 }catch(e){console.error('D254_FAIL_CLOSED_'+(e?.message??'UNKNOWN'));process.exitCode=1}
}
