import assert from 'node:assert/strict';
import fs from 'node:fs';
const repo='dol-1/suliko-ide-ci',sha40=/^[a-f0-9]{40}$/;
function rows(runs,sha){
 assert(sha40.test(sha)&&Array.isArray(runs),'D224_INVALID_INPUT');
 const seen=new Set(),out=[];
 for(const r of runs.filter(x=>x.head_sha===sha&&x.head_branch==='main'&&x.event==='push').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))){
   const name=String(r.name||'').replace(/[^a-zA-Z0-9 .()_+:/-]/g,'?').slice(0,150);
   if(!name||seen.has(name))continue;
   assert(Number.isSafeInteger(r.id)&&r.id>0,'D224_INVALID_RUN_ID');
   const conclusion=r.status==='completed'?(r.conclusion||'unknown'):'pending';
   assert(/^(success|failure|cancelled|skipped|timed_out|action_required|neutral|stale|startup_failure|unknown|pending)$/.test(conclusion),'D224_INVALID_STATUS');
   out.push({workflow:name,sha,conclusion,link:'https://github.com/'+repo+'/actions/runs/'+r.id});
   seen.add(name);
 }
 return out;
}
function report(sha,items,at){
 let s='# D224 exact-main postmain CI evidence (snapshot only)\n\nMain '+sha+' / '+at+
 '\n\nOnly observed main push runs on exact main SHA are listed; absence is UNKNOWN, never a GO.\n\n';
 if(!items.length)return s+'No exact-main runs found in bounded history. UNKNOWN.\n';
 return s+'| Workflow | SHA | Conclusion | Link |\n|---|---|---|---|\n'+items.map(x=>'| '+x.workflow+' | '+x.sha+' | '+x.conclusion+' | [run]('+x.link+') |').join('\n')+'\n';
}

function d229AllEnabledWorkflows(workflows,runs,sha){
 assert(Array.isArray(workflows)&&workflows.length>0&&workflows.length<=300,'D229_WORKFLOWS_INVENTORY_INVALID');
 const seen=new Set(),all=[];
 for(const w of workflows){
  assert(Number.isSafeInteger(w.id)&&w.id>0&&typeof w.name==='string'&&w.name.length>0,'D229_WORKFLOW_SHAPE_INVALID');
  if(w.state!=='active')continue;
  assert(!seen.has(w.id),'D229_DUPLICATE_WORKFLOW_ID');
  seen.add(w.id);
  const matching=runs.filter(r=>r.workflow_id===w.id&&r.head_sha===sha&&r.head_branch==='main'&&r.event==='push');
  matching.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  const hit=matching[0];
  const status=hit?hit.status==='completed'?(hit.conclusion||'unknown'):'pending':'MISSING';
  if(hit)assert(Number.isSafeInteger(hit.id)&&hit.id>0&&/^(success|failure|cancelled|skipped|timed_out|action_required|neutral|stale|startup_failure|unknown|pending)$/.test(status),'D229_RUN_INVALID');
  const name=w.name.replace(/[^a-zA-Z0-9 .()_+:/-]/g,'?').slice(0,150);
  const path=String(w.path||'unknown-path-'+w.id).replace(/[^a-zA-Z0-9_.\/@-]/g,'?').slice(0,240);
  all.push({workflow:name,path,sha,conclusion:status,link:hit?'https://github.com/'+repo+'/actions/runs/'+hit.id:null});
 }
 all.sort((a,b)=>a.path.localeCompare(b.path));
 return all;
}
function d229Report(sha,observed,entries){
 const lines=['# D229 every enabled GitHub workflow vs exact canonical main (bounded 100 latest main runs)',
  '', 'Source SHA: '+sha+' | Observed: '+observed,
  'MISSING means no matching main/push/exact-SHA run in fetched last 100; some workflows have path/event filters and need not run. MISSING is **not** green, failure or proof the workflow is defective.',
  'No release, beta or owner action is inferred.', '',
  '| Workflow | File | Conclusion | Run |','|---|---|---|---|'];
 for(const x of entries)lines.push('| '+x.workflow+' | '+x.path+' | '+x.conclusion+' | '+(x.link?'[run]('+x.link+')':'MISSING')+' |');
 return lines.join('\n')+'\n';
}

function selfTest(){
 const h='a'.repeat(40),time='2026-11-16T00:00:00Z';
 const d=[{id:1,name:'Doc',head_sha:h,head_branch:'main',event:'push',status:'completed',conclusion:'success',created_at:time},
 {id:2,name:'Doc',head_sha:h,head_branch:'main',event:'push',status:'completed',conclusion:'failure',created_at:'2026-11-15T00:00:00Z'},
 {id:3,name:'Scan',head_sha:h,head_branch:'main',event:'push',status:'queued',conclusion:null,created_at:time},
 {id:4,name:'PR',head_sha:h,head_branch:'feature',event:'push',status:'completed',conclusion:'success',created_at:time}];
 const a=rows(d,h);assert.equal(a.length,2);assert.equal(a[0].conclusion,'success');assert.equal(a[1].conclusion,'pending');
 assert(!report(h,a,time).includes(' | PR |'));assert(report(h,[],time).includes('UNKNOWN'));
 assert.throws(()=>rows(d,'x'),/D224_INVALID_INPUT/);assert.throws(()=>rows([{...d[0],id:'x'}],h),/D224_INVALID_RUN_ID/);
 const wi=[{id:42,name:'Known',path:'.github/workflows/known.yml',state:'active'},{id:43,name:'Absent',path:'.github/workflows/absent.yml',state:'active'}];
 const known=d229AllEnabledWorkflows(wi,[{...d[0],workflow_id:42}],h);
 assert.equal(known.length,2);assert.equal(known[0].conclusion,'MISSING');assert.equal(known[1].conclusion,'success');
 assert.equal(known[0].link,null);assert(d229Report(h,time,known).includes('MISSING'));
 assert(d229AllEnabledWorkflows(wi,[{...d[0],workflow_id:42}],'b'.repeat(40)).every(x=>x.conclusion==='MISSING'));
 assert.throws(()=>d229AllEnabledWorkflows([{...wi[0],id:'bad'}],[],h),/D229_WORKFLOW_SHAPE_INVALID/);
 console.log('D224_EXACT_HEAD_NO_FAKE_GREEN_NEGATIVES=PASS');
 console.log('D229_MISSING_WORKFLOW_AND_EXACT_SHA_NEGATIVE_FIXTURES=PASS');
}
function consumeValidatedInput(){
 const input=fs.readFileSync(0,'utf8');assert(input.length>100&&input.length<6000000,'D224_INPUT_SIZE_INVALID');
 const data=JSON.parse(input);assert(data&&typeof data==='object'&&data.branch&&data.runs&&data.workflows,'D229_API_TRIPLE_INVALID');
 const sha=data.branch.commit?.sha;assert(typeof sha==='string'&&sha40.test(sha),'D224_MAIN_SHA_UNVERIFIED');
 assert(Array.isArray(data.runs.workflow_runs)&&data.runs.workflow_runs.length<=100,'D224_RUNS_SHAPE_INVALID');
 assert(Array.isArray(data.workflows.workflows)&&data.workflows.workflows.length<=300,'D229_WORKFLOWS_SHAPE_INVALID');
 return {sha,all:data.runs.workflow_runs,workflows:data.workflows.workflows};
}
function collect(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY===repo,'D224_PUBLIC_GH_RUNNER_ONLY');
 const {sha,all,workflows}=consumeValidatedInput();
 const observed_at=new Date().toISOString(),entries=rows(all,sha),md=report(sha,entries,observed_at);
 const d229=d229AllEnabledWorkflows(workflows,all,sha),allMd=d229Report(sha,observed_at,d229);
 fs.mkdirSync('out/d224',{recursive:true});fs.writeFileSync('out/d224/runs.json',JSON.stringify({sha,observed_at,entries},null,2)+'\n',{mode:0o600});
 fs.writeFileSync('out/d224/runs.md',md,{mode:0o600});
 fs.writeFileSync('out/d224/d229-all-enabled-main.json',JSON.stringify({sha,observed_at,workflows:d229},null,2)+'\n',{mode:0o600});
 fs.writeFileSync('out/d224/d229-all-enabled-main.md',allMd,{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md+'\n'+allMd);
 console.log('D224_BOUNDED_READONLY_EXACT_MAIN_RUN_COUNT='+entries.length);
 console.log('D229_ENABLED_WORKFLOWS='+d229.length+' D229_MISSING='+d229.filter(x=>x.conclusion==='MISSING').length);
}
if(process.argv.includes('--self-test'))selfTest();else collect();
