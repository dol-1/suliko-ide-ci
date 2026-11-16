// D229: bounded exact-main workflow completeness; no release or API mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {readPushTrigger,matchBranch} from './d217-affected-workflows.mjs';
const sha40=/^[0-9a-f]{40}$/;
const safe=s=>String(s).replace(/[|\r\n<>]/g,'?').slice(0,160);
function enumerate(workflows){
 const found=[];
 for(const {file,source} of workflows){
   const trigger=readPushTrigger(source);
   if(!trigger || !matchBranch('main',trigger))continue;
   const match=/^name:\s*(.+?)\s*$/m.exec(source);
   assert(match && match[1], 'D229_UNNAMED_MAIN_WORKFLOW:'+file);
   const name=match[1].trim().replace(/^['"]|['"]$/g,'');
   found.push({file,name:safe(name)});
 }
 assert(new Set(found.map(x=>x.file)).size===found.length,'D229_DUPLICATE_WORKFLOW_FILE');
 return found.sort((a,b)=>a.file.localeCompare(b.file));
}
function reconcile(sha,inventory,entries){
 assert(sha40.test(sha)&&Array.isArray(entries)&&Array.isArray(inventory),'D229_BAD_EVIDENCE_SHAPE');
 const observed=new Map();
 for(const x of entries){
   assert(x.sha===sha&&typeof x.workflow==='string'&&!observed.has(x.workflow),'D229_WRONG_SHA_OR_DUPLICATE');
   assert(/^(success|failure|cancelled|skipped|timed_out|action_required|neutral|stale|startup_failure|unknown|pending)$/.test(x.conclusion),'D229_BAD_CONCLUSION');
   assert(new RegExp('^https://github[.]com/dol-1/suliko-ide-ci/actions/runs/[0-9]+$').test(x.link),'D229_NONOFFICIAL_RUN');
   observed.set(x.workflow,x);
 }
 return inventory.map(x=>({
   ...x,sha,conclusion:observed.get(x.name)?.conclusion??'MISSING',
   link:observed.get(x.name)?.link??null,
 }));
}
function render(rows,sha){
 let s='# D229 full main-eligible workflow snapshot\n\n';
 s+='Canonical main SHA: '+sha+'. Each main-eligible workflow is listed. MISSING = no exact-SHA main/push run in last 100 API results, **not** evidence of failure or success. Skipped/pending remain explicit; no public beta GO.\n\n';
 s+='| Workflow file | Workflow | Conclusion | Actual exact-main run |\n|---|---|---|---|\n';
 for(const x of rows)s+='| '+safe(x.file)+' | '+safe(x.name)+' | '+x.conclusion+' | '+(x.link?'[run]('+x.link+')':'MISSING')+' |\n';
 return s;
}
function selfTest(){
 const h='a'.repeat(40);
 const yes='name: Docs\non:\n  push:\n    branches: [main]\n    paths: [docs/**]\n';
 const no='name: Feature\non:\n  push:\n    branches: [feat/branch]\n';
 const i=enumerate([{file:'docs.yml',source:yes},{file:'feature.yml',source:no}]);
 assert.deepEqual(i.map(x=>x.name),['Docs']);
 const absent=reconcile(h,i,[]);
 assert.equal(absent[0].conclusion,'MISSING');
 assert(render(absent,h).includes('MISSING'));
 const present=reconcile(h,i,[{workflow:'Docs',sha:h,conclusion:'pending',link:'https://github.com/dol-1/suliko-ide-ci/actions/runs/12'}]);
 assert.equal(present[0].conclusion,'pending');
 assert.throws(()=>reconcile(h,i,[{...present[0],workflow:'Docs',sha:'b'.repeat(40),link:present[0].link}]),/D229_WRONG_SHA/);
 assert.throws(()=>reconcile(h,i,[{workflow:'Docs',sha:h,conclusion:'success',link:'https://evil.example/1'}]),/D229_NONOFFICIAL_RUN/);
 console.log('D229_MAIN_EXPECTED_MISSING_WRONG_SHA_NEGATIVES=PASS');
}
function main(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D229_GH_ONLY');
 const inFile='out/d224/runs.json';
 assert(fs.existsSync(inFile),'D229_D224_EVIDENCE_MISSING');
 const doc=JSON.parse(fs.readFileSync(inFile,'utf8'));
 assert(sha40.test(doc.sha),'D229_MAIN_SHA_BAD');
 const dir='.github/workflows';
 const workflowFiles=fs.readdirSync(dir).filter(f=>/\.ya?ml$/.test(f)).sort()
   .map(f=>({file:path.posix.join(dir,f),source:fs.readFileSync(path.join(dir,f),'utf8')}));
 assert(workflowFiles.length>70&&workflowFiles.length<180,'D229_WORKFLOW_BOUNDS');
 const rows=reconcile(doc.sha,enumerate(workflowFiles),doc.entries);
 assert(rows.length>10,'D229_MAIN_WORKFLOW_COUNT_UNEXPECTED');
 const missing=rows.filter(r=>r.conclusion==='MISSING').length;
 const md=render(rows,doc.sha);
 fs.writeFileSync('out/d224/completeness.md',md,{mode:0o600});
 fs.writeFileSync('out/d224/completeness.json',JSON.stringify({sha:doc.sha,scope:'main-eligible-push',observed_at:doc.observed_at,checked:rows.length,missing,rows},null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'D229 expected main-eligible: '+rows.length+'; MISSING: '+missing+' (no implied GO)\n');
 console.log('D229_COMPLETE_INVENTORY='+rows.length+' MISSING='+missing+' EXACT_MAIN_SHA='+doc.sha);
}
if(process.argv.includes('--self-test'))selfTest();else main();
