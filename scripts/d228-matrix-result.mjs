import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const sha40=/^[a-f0-9]{40}$/;
export function classify(input){
 assert(input&&['pinned','upstream-main'].includes(input.context),'D228_INVALID_CONTEXT');
 const stage=['SDK_API','BUILD','RUNTIME'].includes(input.stage)?input.stage:'BUILD';
 const ok=['source','hello','remote'].every(k=>input[k]==='success');
 if(ok)assert(sha40.test(input.upstreamSha),'D228_SUCCESS_REQUIRES_EXACT_UPSTREAM_SHA');
 return {pass:ok,category:ok?null:stage,upstreamSha:sha40.test(input.upstreamSha)?input.upstreamSha:'UNKNOWN',context:input.context};
}
function selfTest(){
 const a='a'.repeat(40),green=classify({context:'pinned',source:'success',hello:'success',remote:'success',stage:'SDK_API',upstreamSha:a});
 assert.equal(green.pass,true);assert.equal(green.category,null);
 for(const stage of ['SDK_API','BUILD','RUNTIME']){
  const red=classify({context:'upstream-main',source:'success',hello:'failure',remote:'skipped',stage,upstreamSha:a});
  assert.equal(red.pass,false);assert.equal(red.category,stage);
 }
 assert.equal(classify({context:'upstream-main',source:'failure',hello:'skipped',remote:'skipped',upstreamSha:'UNKNOWN'}).category,'BUILD');
 assert.throws(()=>classify({context:'pinned',source:'success',hello:'success',remote:'success',upstreamSha:'UNKNOWN'}),/EXACT_UPSTREAM_SHA/);
 console.log('D228_FAIL_CLOSED_CATEGORY_AND_EXACT_SHA_NEGATIVES_PASS');
}
function report(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D228_PUBLIC_CI_ONLY');
 const dir=path.join(process.env.GITHUB_WORKSPACE,'out','d228');fs.mkdirSync(dir,{recursive:true});
 const context=process.env.SDK_CONTEXT,mark=path.join(dir,'failure-'+context+'.txt');
 const stage=fs.existsSync(mark)?fs.readFileSync(mark,'utf8').trim():'BUILD';
 const x=classify({context,stage,source:process.env.D228_SOURCE_OUTCOME,hello:process.env.D228_HELLO_OUTCOME,remote:process.env.D228_REMOTE_OUTCOME,upstreamSha:process.env.D228_UPSTREAM_SHA});
 const summary={schema:'suliko-d228-v1',source_sha:process.env.GITHUB_SHA,reviewed_bb_tag:'desktop-v0.49.0',reviewed_bb_commit:'7b26cae79ec978fafd0a5db0e8517e94f12eb8f4',upstream_main_sha:x.upstreamSha,context:x.context,pass:x.pass,failure_category:x.category,actual_runtime:false,auto_bump:false,auto_issue:false};
 fs.writeFileSync(path.join(dir,'matrix-'+context+'.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
 const text=['# D228 nightly compatibility evidence: '+context,'','Source: '+summary.source_sha,'Pinned BB: '+summary.reviewed_bb_tag+' / '+summary.reviewed_bb_commit,'Exact observed upstream main: '+x.upstreamSha,'Own plugin source support ranges unchanged. Disposable public runner only; this validates SDK type/build and mock tests, NOT live BB runtime compatibility.','','Result: '+(x.pass?'PASS':'RED — '+x.category),''];
 if(!x.pass){text.push('## DRAFT GitLab issue text — NOT POSTED','', 'Title: D228 '+x.category+' compatibility regression for '+context+' / '+x.upstreamSha,'','Expected: own plugins build, typecheck and synthetic tests at selected reviewed SDK context.','Observed: stage '+x.category+' is RED; inspect private/redacted CI logs before manual issue creation.','Recommendation: hold upstream bump; do not widen support range or edit BB core.');}
 fs.writeFileSync(path.join(dir,(x.pass?'summary-':'issue-DRAFT-')+context+'.md'),text.join('\n')+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,text.join('\n')+'\n');
 console.log('D228_RESULT_'+context+'='+(x.pass?'PASS':'RED_'+x.category));
}
if(process.argv.includes('--self-test'))selfTest();else report();
