import assert from 'node:assert/strict';
import fs from 'node:fs';
const repo='dol-1/suliko-ide-ci',apiBase='https://api.github.com/repos/'+repo,sha40=/^[a-f0-9]{40}$/;
function rows(runs,sha){
 assert(sha40.test(sha)&&Array.isArray(runs),'D224_INVALID_INPUT');
 const seen=new Set(),out=[];
 for(const r of runs.filter(x=>x.head_sha===sha&&x.head_branch==='main'&&x.event==='push').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))){
   const name=String(r.name||'').replace(/[\r\n|]/g,' ').slice(0,150);
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
function selfTest(){
 const h='a'.repeat(40),time='2026-11-16T00:00:00Z';
 const d=[{id:1,name:'Doc',head_sha:h,head_branch:'main',event:'push',status:'completed',conclusion:'success',created_at:time},
 {id:2,name:'Doc',head_sha:h,head_branch:'main',event:'push',status:'completed',conclusion:'failure',created_at:'2026-11-15T00:00:00Z'},
 {id:3,name:'Scan',head_sha:h,head_branch:'main',event:'push',status:'queued',conclusion:null,created_at:time},
 {id:4,name:'PR',head_sha:h,head_branch:'feature',event:'push',status:'completed',conclusion:'success',created_at:time}];
 const a=rows(d,h);assert.equal(a.length,2);assert.equal(a[0].conclusion,'success');assert.equal(a[1].conclusion,'pending');
 assert(!report(h,a,time).includes(' | PR |'));assert(report(h,[],time).includes('UNKNOWN'));
 assert.throws(()=>rows(d,'x'),/D224_INVALID_INPUT/);assert.throws(()=>rows([{...d[0],id:'x'}],h),/D224_INVALID_RUN_ID/);
 console.log('D224_EXACT_HEAD_NO_FAKE_GREEN_NEGATIVES=PASS');
}
async function get(path){
 assert(path==='/branches/main'||/^\/actions\/runs\?branch=main&per_page=100&page=[123]$/.test(path),'D224_ENDPOINT_DENIED');
 const token=process.env.GH_READ_TOKEN;assert(typeof token==='string'&&token.length>10,'D224_TOKEN_REQUIRED');
 const r=await fetch(apiBase+path,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{accept:'application/vnd.github+json',authorization:'Bearer '+token}});
 assert.equal(r.status,200,'D224_PUBLIC_API_NOT_200:'+path);
 return await r.json();
}
async function collect(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY===repo,'D224_PUBLIC_GH_RUNNER_ONLY');
 const b=await get('/branches/main'),sha=b.commit?.sha;assert(sha40.test(sha),'D224_MAIN_SHA_UNVERIFIED');
 const all=[];for(let n=1;n<=3;n++){const page=await get('/actions/runs?branch=main&per_page=100&page='+n);assert(Array.isArray(page.workflow_runs),'D224_RUNS_SHAPE');all.push(...page.workflow_runs);if(page.workflow_runs.length<100)break;}
 const observed_at=new Date().toISOString(),entries=rows(all,sha),md=report(sha,entries,observed_at);
 fs.mkdirSync('out/d224',{recursive:true});fs.writeFileSync('out/d224/runs.json',JSON.stringify({sha,observed_at,entries},null,2)+'\n',{mode:0o600});
 fs.writeFileSync('out/d224/runs.md',md,{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
 console.log('D224_BOUNDED_READONLY_EXACT_MAIN_RUN_COUNT='+entries.length);
}
if(process.argv.includes('--self-test'))selfTest();else await collect();
