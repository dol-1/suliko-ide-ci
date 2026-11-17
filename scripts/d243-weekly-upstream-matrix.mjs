// D243 weekly read-only pinned 0.49.0 versus real upstream-main SDK matrix evidence.
// Do not mutate BB, publish releases, create GitHub issues or infer a live Runtime GO.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export const REPO='dol-1/suliko-ide-ci';
export const PINNED='0.49.0';
const sha=/^[a-f0-9]{40}$/;
function apiUrl(p){return 'https://api.github.com/repos/'+p}
export function assessPair(run,artifacts){
 if(!run||!Number.isSafeInteger(run.id)||!sha.test(run.head_sha)||
    !['completed','queued','in_progress','waiting','requested','pending'].includes(run.status))
   throw Error('D243_MALFORMED_GH_RUN');
 const results={run_id:run.id,source_sha:run.head_sha,event:run.event,created_at:run.created_at,
   run_conclusion:run.conclusion??'PENDING',contexts:[],result:'PENDING_OR_MISSING',issueCategory:'NONE'};
 let red=false,ok=0,pending=false;
 for(const context of ['pinned','upstream-main']){
  const artifact=artifacts?.[context]??null;
  let row={context,pinned_bb:'0.49.0',pinned_sdk:'0.6.132',tested_upstream_sha:'UNAVAILABLE',
    outcome:'MISSING',category:'MISSING_EVIDENCE'};
  if(artifact){
   if(artifact.schema!=='suliko-d228-compat-matrix-v1'||artifact.context!==context||
      artifact.checked_sha!==run.head_sha||artifact.pinned_bb!==PINNED||
      artifact.pinned_sdk!=='0.6.132'||!['PASS','RED_OR_INCOMPLETE'].includes(artifact.outcome)||
      !['NONE','SDK_API','RUNTIME_CONTRACT_TEST','BUILD','UNKNOWN'].includes(artifact.category)||
      (artifact.upstream_sha!=='UNAVAILABLE'&&!sha.test(artifact.upstream_sha)))
    throw Error('D243_D228_ARTIFACT_SHAPE_OR_SOURCE_DRIFT');
   row={...row,tested_upstream_sha:artifact.upstream_sha,
     outcome:artifact.outcome,category:artifact.category};
  }else if(run.status!=='completed'){
   row.outcome='PENDING';row.category='NONE';
  }
  if(row.outcome==='PASS')ok++;
  if(row.outcome==='RED_OR_INCOMPLETE'||row.outcome==='MISSING')red=true;
  if(row.outcome==='PENDING')pending=true;
  results.contexts.push(row);
 }
 if(results.contexts[0].tested_upstream_sha!=='UNAVAILABLE' &&
    results.contexts[1].tested_upstream_sha!=='UNAVAILABLE' &&
    results.contexts[0].tested_upstream_sha!==results.contexts[1].tested_upstream_sha)
  throw Error('D243_CONTEXTS_CHECKED_DIFFERENT_UPSTREAM_REF');
 results.result=red?'RED_OR_INCOMPLETE':pending?'PENDING':ok===2&&run.conclusion==='success'?'PASS':'RED_OR_INCOMPLETE';
 results.issueCategory=red?(results.contexts.find(x=>x.outcome==='MISSING')?'MISSING_ARTIFACT':
   results.contexts.find(x=>x.outcome==='RED_OR_INCOMPLETE')?.category??'UNKNOWN'):
   results.result==='RED_OR_INCOMPLETE'?'RUN_NOT_SUCCESS':'NONE';
 return results;
}
export function summarize(rows,currentUpstreamSha,now){
 if(!sha.test(currentUpstreamSha)||!Number.isFinite(now)||!Array.isArray(rows)||rows.length>12)
  throw Error('D243_BAD_SNAPSHOT');
 return {schema:'suliko-d243-weekly-sdk-upstream-v1',generated_at:new Date(now).toISOString(),
   pinned_bb:'0.49.0',pinned_sdk:'0.6.132',
   current_upstream_main_sha_for_reference_only:currentUpstreamSha,
   warning:'Current upstream main may differ from SHA tested in each D228 artifact. This is source compile/test, NOT BB live runtime compatibility or authorized SDK bump.',
   rows,allPass:rows.length>0&&rows.every(x=>x.result==='PASS')};
}
export function markdown(d){
 const lines=['# D243 weekly pinned vs upstream SDK source CI matrix (no release)',
  'Generated UTC '+d.generated_at,'Pinned BB '+d.pinned_bb+' / SDK '+d.pinned_sdk,
  'Current upstream-main SHA (NOT necessarily the SHA tested in past matrix runs): '+d.current_upstream_main_sha_for_reference_only,
  '| GH scheduled run | GH source SHA | pinned result | upstream-main result | ACTUAL tested upstream SHA | Risk |',
  '| --- | --- | --- | --- | --- | --- |'];
 for(const row of d.rows){
  const pin=row.contexts.find(x=>x.context==='pinned'),up=row.contexts.find(x=>x.context==='upstream-main');
  lines.push('| https://github.com/'+REPO+'/actions/runs/'+row.run_id+
   ' | '+row.source_sha.slice(0,12)+' | '+pin.outcome+' | '+up.outcome+
   ' | '+(up.tested_upstream_sha??'UNAVAILABLE')+' | '+row.issueCategory+' |');
 }
 lines.push('',d.warning,'Any RED category is an issue DRAFT artifact ONLY. An unavailable artifact is not green, skipped/pending is not green. No BB code edit, no SDK bump or beta clearance.');
 return lines.join('\n')+'\n';
}
export function issueDraft(d){
 const reds=d.rows.filter(r=>r.result==='RED_OR_INCOMPLETE');
 if(!reds.length)return '';
 return ['# D243 BB upstream source compatibility investigation — UNSENT issue DRAFT',
 '- Pinned BB 0.49.0 / pinned SDK 0.6.132; NO auto-upgrade.',
 '- Report generated '+d.generated_at,
 ...reds.map(x=>'- Real GH matrix run https://github.com/'+REPO+'/actions/runs/'+x.run_id+
  ', source '+x.source_sha+', category '+x.issueCategory+
  ', tested upstream SHA '+x.contexts[1].tested_upstream_sha),
 '- Recommendation: REVIEW D228 exact run artifacts/phase; WAIT pending fixed source changes. Do not treat unknown or missing status as SDK API break.',
 '- No actual issue created, no contact/release, no upstream BB modification.'
 ].join('\n')+'\n';
}
export async function fetchRuns({token,now=Date.now(),fetchImpl=fetch}){
 if(!token||typeof token!=='string')throw Error('D243_READ_ONLY_TOKEN_REQUIRED');
 const start=now-7*86400000;const day=x=>new Date(x).toISOString().slice(0,10);
 const rows=[];
 for(let page=1;page<=55;page++){
  const url=apiUrl(REPO)+'/actions/runs?created='+encodeURIComponent(day(start)+'..'+day(now))+'&per_page=100&page='+page;
  const res=await fetchImpl(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'},redirect:'error'});
  if(!res.ok)throw Error('D243_GITHUB_RUNS_HTTP_'+res.status);
  const body=await res.json();
  if(!Array.isArray(body.workflow_runs))throw Error('D243_GH_RUN_SHAPE');
  for(const run of body.workflow_runs){
   if(run.event!=='schedule'||run.head_branch!=='main'||
      String(run.path??'').split('@',1)[0]!=='.github/workflows/d064-sdk-matrix.yml')continue;
   const created=Date.parse(run.created_at);
   if(Number.isFinite(created)&&created>=start&&created<=now)rows.push(run);
  }
  if(body.workflow_runs.length<100)return rows.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 }
 throw Error('D243_PAGINATION_LIMIT_NO_PARTIAL_GREEN');
}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO)throw Error('D243_PUBLIC_GH_ONLY');
 const temp=process.env.RUNNER_TEMP,token=process.env.GITHUB_TOKEN;
 if(!temp||!path.isAbsolute(temp))throw Error('D243_EPHEMERAL_DIR');
 const runs=await fetchRuns({token});
 const now=Date.now(),store=path.join(temp,'d243');fs.mkdirSync(store,{recursive:true,mode:0o700});
 const summarized=[];
 for(const run of runs){
  const reports={};
  if(run.status==='completed'){
   for(const context of ['pinned','upstream-main']){
    const folder=path.join(store,String(run.id),context);
    fs.mkdirSync(folder,{recursive:true,mode:0o700});
    try {
      execFileSync('gh',['run','download',String(run.id),'-R',REPO,
        '-n','d228-upstream-compat-'+context,'-D',folder],
        {env:{...process.env,GH_TOKEN:token},stdio:'ignore',timeout:35000,maxBuffer:12000});
      const file=path.join(folder,context+'.json');
      const st=fs.lstatSync(file);
      if(!st.isFile()||st.isSymbolicLink()||st.size>20000)throw Error('D243_BAD_D228_FILE');
      reports[context]=JSON.parse(fs.readFileSync(file,'utf8'));
    }catch{
      // Artifact missing/expired is MISSING, never silently GREEN.
      reports[context]=null;
    }
   }
  }
  summarized.push(assessPair(run,reports));
 }
 const res=await fetch(apiUrl('get-bb/bb')+'/branches/main',{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error'});
 if(!res.ok)throw Error('D243_UPSTREAM_READONLY_HTTP_'+res.status);
 const upstream=(await res.json()).commit?.sha;
 const report=summarize(summarized,upstream,now);
 fs.writeFileSync(path.join(store,'weekly.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const issue=issueDraft(report);
 if(issue)fs.writeFileSync(path.join(store,'issue-draft.md'),issue,{flag:'wx',mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown(report));
 console.log('D243_SEVEN_DAYS_REAL_SCHEDULED_MATRIX='+runs.length+'_RED='+report.rows.filter(r=>r.result==='RED_OR_INCOMPLETE').length+'_PASS='+report.rows.filter(r=>r.result==='PASS').length);
 if(!report.allPass)process.exitCode=1;
}
if(process.argv[1]?.endsWith('d243-weekly-upstream-matrix.mjs'))main().catch(e=>{
 console.error('D243_FAIL_CLOSED_'+(e?.message??'UNKNOWN'));process.exitCode=1;
});
