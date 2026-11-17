// D240 strict source-only daily acceptance tracker, never a Playwright retry or test dispatch.
// Archived D195 J06 failure happened on a different SHA; do not relabel it flaky.
import fs from 'node:fs';
const REPO='dol-1/suliko-ide-ci',sha40=/^[a-f0-9]{40}$/;
const qaPath='.github/workflows/qa01-parity-run.yml';
export function assess(mainSha,records){
 if(!sha40.test(mainSha)||!Array.isArray(records)||records.length>100)throw Error('D240_BAD_INPUT');
 const filtered=records.filter(x=>x?.path?.split('@',1)[0]===qaPath && x.head_branch==='main' &&
   ['push','schedule','workflow_dispatch'].includes(x.event))
  .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
 const seen=new Set(),ordered=[];
 for(const r of filtered){
  if(!Number.isSafeInteger(r.id)||r.id<=0||!sha40.test(r.head_sha)||
     !Number.isSafeInteger(r.run_attempt)||r.run_attempt<1||!Number.isFinite(Date.parse(r.created_at)))
    throw Error('D240_UNTRUSTED_RUN');
  if(seen.has(r.id))throw Error('D240_DUPLICATE_RUN');
  seen.add(r.id);ordered.push(r);
 }
 const latest=ordered.slice(0,10),ready=latest.length===10&&latest.every(x=>
   x.head_sha===mainSha&&x.run_attempt===1&&x.status==='completed'&&x.conclusion==='success');
 const rows=latest.map(x=>({id:x.id,sha:x.head_sha,attempt:x.run_attempt,event:x.event,
   result:x.status==='completed'?(x.conclusion??'unknown'):'PENDING',
   matches_main_sha:x.head_sha===mainSha}));
 return {schema:'suliko-d240-ten-distinct-j06-qa-v1',exactMainSha:mainSha,
  examined:rows.length,needed:10,consecutiveExactHeadAllGreen:ready,rows,
  verdict:ready?'EXACT_HEAD_TEN_DISTINCT_REAL_QA_PASS':'NOT_YET_PROVEN',
  rootCauseAssessment:'Historical J06 dual Web/Desktop RED used stock NewTab action-search Start terminal option; later main uses documented Control+Shift+Enter keyboard shortcut with real Terminal section and selected-tab assertions. Historical fail is real; differing SHAs prohibit claiming a demonstrated flaky test.',
  scope:'Actual full J01-J07 7x2 strict QA run, not an independent assistive human audit or beta GO.'};
}
export function render(report){
 let s='# D240 real ten sequential exact-main J06 QA acceptance (NO retry)\n';
 s+='Canonical main: '+report.exactMainSha+'\n'+report.verdict+
  '; only '+report.examined+'/10 recent distinct source QA runs checked. Strict full 14/14 preserved.\n';
 s+='| Genuine QA run | Source | Original attempt | Conclusion | Exact main |\n| --- | --- | ---: | --- | --- |\n';
 for(const r of report.rows)s+='| https://github.com/'+REPO+'/actions/runs/'+r.id+' | '+r.sha.slice(0,10)+
  ' | '+r.attempt+' | '+r.result+' | '+r.matches_main_sha+' |\n';
 s+='Historical J06 RED is not erased by different-SHA success. No workflow rerun, skip, test retry, new external data or beta authorization.\n';
 return s;
}
async function get(url,token,fetchImpl){
 const res=await fetchImpl(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'},redirect:'error'});
 if(!res.ok)throw Error('D240_READONLY_GITHUB_HTTP_'+res.status);
 return await res.json();
}
export async function gather({token,fetchImpl=fetch}){
 if(!token||typeof token!=='string')throw Error('D240_TOKEN_REQUIRED');
 const root='https://api.github.com/repos/'+REPO;
 const main=await get(root+'/branches/main',token,fetchImpl);
 const runs=await get(root+'/actions/workflows/qa01-parity-run.yml/runs?branch=main&per_page=30',token,fetchImpl);
 if(!Array.isArray(runs.workflow_runs))throw Error('D240_GH_WORKFLOW_RUNS_SHAPE');
 return assess(main.commit?.sha,runs.workflow_runs);
}
if(process.argv[1]?.endsWith('d240-qa-ten-run-audit.mjs')){
 try{
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO)throw Error('D240_PUBLIC_RUNNER_ONLY');
  const source=fs.readFileSync('tests/parity/parity.spec.ts','utf8');
  const config=fs.readFileSync('tests/parity/playwright.config.ts','utf8');
  if(!source.includes('appPage.keyboard.press("Control+Shift+Enter")')||
     !source.includes('section[data-app-terminal][aria-label="Terminal"]')||
     !source.includes('[data-testid="secondary-panel-tab-strip"] button[aria-pressed="true"]')||
     !config.includes('retries: 0')||!config.includes('workers: 1'))
    throw Error('D240_STRICT_J06_SOURCE_OR_NO_RETRY_GUARD_CHANGED');
  const result=await gather({token:process.env.GITHUB_TOKEN});
  const temp=process.env.RUNNER_TEMP;
  if(!temp)throw Error('D240_RUNNER_TEMP_REQUIRED');
  fs.writeFileSync(temp+'/d240-qa-ten-real-runs.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,render(result));
  console.log('D240_10_CONSECUTIVE_SAME_MAIN_SHA_REAL_STRICT_QA_PROVEN='+result.consecutiveExactHeadAllGreen);
  if(!result.consecutiveExactHeadAllGreen)process.exitCode=1;
 }catch(e){console.error('D240_FAIL_CLOSED_'+(e?.message??'UNEXPECTED'));process.exitCode=1}
}
