// D247: exact-head public GitHub Actions premerge note generator, NO merge/release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const REPO='dol-1/suliko-ide-ci';
const SHA=/^[a-f0-9]{40}$/;
const WORKFLOW=/^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/;
const pathOf=run => String(run?.path??'').split('@',1)[0];
const safeRun=run => Number.isSafeInteger(run?.id)&&run.id>0 &&
  Number.isSafeInteger(run?.run_attempt)&&run.run_attempt>0;
function validateInventory(inventory,sha,branch) {
  assert(SHA.test(sha),'D247_BAD_HEAD_SHA');
  assert(typeof branch==='string'&&branch.length>0&&branch!=='main'&&branch.length<=200,'D247_BAD_FEATURE_BRANCH');
  assert(inventory?.schema==='suliko-d217-affected-workflows-v1','D247_D217_SCHEMA');
  assert(inventory.head===sha && inventory.branch===branch,'D247_D217_NOT_EXACT_HEAD');
  assert(SHA.test(inventory.base)&&inventory.base!==sha,'D247_BASE_INVALID');
  const req=inventory.mustCheckExactHead;
  assert(Array.isArray(req)&&req.length>0&&req.length<=180,'D247_EMPTY_OR_LARGE_REQUIRED_SET');
  assert(req.every(x=>typeof x==='string'&&WORKFLOW.test(x)),'D247_BAD_REQUIRED_WORKFLOW');
  assert(new Set(req).size===req.length,'D247_DUPLICATE_REQUIRED');
  assert(Array.isArray(inventory.blockedByUnrunnable),'D247_MISSING_RUNNABILITY_INVENTORY');
  return req;
}
export function assess(inventory,runs,{sha,branch}) {
  const required=validateInventory(inventory,sha,branch);
  assert(Array.isArray(runs)&&runs.length<=5000,'D247_RUNS_INVALID');
  const blocked=new Set(inventory.blockedByUnrunnable.map(x=>x.workflow));
  const rows=[];
  for (const workflow of required) {
    const candidates=runs.filter(r=>r?.head_sha===sha && r?.head_branch===branch &&
      (r?.event==='push'||r?.event==='workflow_dispatch') && pathOf(r)===workflow && safeRun(r));
    candidates.sort((a,b)=>b.id-a.id || b.run_attempt-a.run_attempt);
    const run=candidates[0]??null;
    let verdict=blocked.has(workflow)?'BLOCKED':run===null?'MISSING':
      run.status==='completed'&&run.conclusion==='success'?'GREEN':
      run.status==='completed'?'RED':'PENDING';
    rows.push({workflow,verdict,id:run?.id??null,attempt:run?.run_attempt??null,
      conclusion:run?.conclusion??null,status:run?.status??null});
  }
  const green=rows.filter(x=>x.verdict==='GREEN').length;
  return {green:green===rows.length,sha,branch,base:inventory.base,rows,passed:green,total:rows.length};
}
export function render(result,{at='source-check'}={}) {
  const head='[ChatGPT] EXACT-HEAD PREMERGE '+(result.green?'GREEN':'BLOCKED');
  const lines=[head,
    'Generated at: '+at,
    'Repository: '+REPO,
    'Feature branch: '+result.branch,
    'Exact source HEAD: '+result.sha,
    'Reviewed D217 merge base: '+result.base,
    'Actual workflow outcomes: '+result.passed+'/'+result.total+' GREEN',
    '| D217 required workflow | Result | GitHub Actions run | Attempt | Conclusion |',
    '| --- | --- | --- | --- | --- |'];
  for (const r of result.rows) {
    const link=r.id===null?'MISSING':'https://github.com/'+REPO+'/actions/runs/'+r.id;
    lines.push('| '+r.workflow+' | '+r.verdict+' | '+link+' | '+
      (r.attempt===null?'—':r.attempt)+' | '+(r.conclusion??(r.status??'MISSING'))+' |');
  }
  if(!result.green){
    lines.push('MISSING/RED/PENDING/BLOCKED: '+
      result.rows.filter(x=>x.verdict!=='GREEN').map(x=>x.workflow+'='+x.verdict).join(', '));
    lines.push('NO MERGE: every required exact-head workflow must truly complete success; older SHA, old attempt, skipped, cancelled, and missing never count as GREEN.');
  }else{
    lines.push('Every D217 required exact-head workflow is completed/success. This note alone is NOT merge authorization: review, SHA lock, required native/QA evidence and postmain remain separate gates.');
  }
  return lines.join('\n')+'\n';
}
export async function fetchExactRuns({sha,branch,token,fetchImpl=fetch}) {
  assert(SHA.test(sha)&&branch&&typeof token==='string'&&token.length>0,'D247_LIVE_CREDENTIALS_OR_HEAD');
  const out=[];
  for(let page=1;page<=25;page++){
    const u='https://api.github.com/repos/'+REPO+'/actions/runs?branch='+
      encodeURIComponent(branch)+'&per_page=100&page='+page;
    const response=await fetchImpl(u,{headers:{Authorization:'Bearer '+token,
      Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error'});
    if(!response.ok)throw Error('D247_GITHUB_API_HTTP_'+response.status);
    const body=await response.json();
    if(!Array.isArray(body.workflow_runs))throw Error('D247_GITHUB_API_SHAPE');
    out.push(...body.workflow_runs.filter(x=>x.head_sha===sha));
    if(body.workflow_runs.length<100)return out;
  }
  throw Error('D247_PAGINATION_LIMIT_FAIL_CLOSED');
}
async function main(){
  const args=process.argv.slice(2),value=key=>{const idx=args.indexOf(key);return idx<0?null:args[idx+1]};
  const input=value('--inventory'),branch=value('--branch')??process.env.GITHUB_REF_NAME;
  const sha=value('--head')??process.env.GITHUB_SHA;
  if(!input||!fs.existsSync(input))throw Error('D247_D217_FILE_REQUIRED');
  const inventory=JSON.parse(fs.readFileSync(input,'utf8'));
  let runs;
  if(args.includes('--live')){
    if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO)
      throw Error('D247_PUBLIC_ACTIONS_ONLY');
    runs=await fetchExactRuns({sha,branch,token:process.env.GITHUB_TOKEN});
  }else{
    const file=value('--runs');
    if(!file)throw Error('D247_RUNS_FIXTURE_REQUIRED');
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    runs=Array.isArray(data)?data:data.workflow_runs;
  }
  const result=assess(inventory,runs,{sha,branch});
  process.stdout.write(render(result,{at:new Date().toISOString()}));
  if(!result.green)process.exitCode=1;
}
if(process.argv[1]?.endsWith('d247-exact-head-premerge-note.mjs'))main().catch(e=>{
  console.error('D247_FAIL_CLOSED_'+(e?.message??'UNEXPECTED'));
  process.exitCode=1;
});
