// D228 bounded read-only actual upstream SDK matrix outcome artifact.
// Never creates issues, mutates API state, changes BB, or asserts live-runtime acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const sha40=/^[a-f0-9]{40}$/;
function classify({context,meta,hello,remote,phase,upstreamSha}){
 assert(['pinned','upstream-main'].includes(context),'D228_CONTEXT_INVALID');
 for(const x of [meta,hello,remote])assert(['success','failure','skipped','cancelled'].includes(x),'D228_STEP_OUTCOME_INVALID');
 if(upstreamSha!=='UNAVAILABLE')assert(sha40.test(upstreamSha),'D228_UPSTREAM_SHA_INVALID');
 const success=[meta,hello,remote].every(x=>x==='success');
 const failed=[meta,hello,remote].some(x=>x!=='success');
 let category='NONE';
 if(failed)category=phase==='TYPECHECK'?'SDK_API':phase==='TEST'?'RUNTIME_CONTRACT_TEST':phase==='BUILD'?'BUILD':'UNKNOWN';
 return {context,upstream_sha:upstreamSha,pinned_bb:'0.49.0',pinned_sdk:'0.6.132',
  outcome:success?'PASS':'RED_OR_INCOMPLETE',
  category,scope:category==='RUNTIME_CONTRACT_TEST'?'unit-contract test only, NOT live runtime proof':'build/source test only, NOT live runtime proof',
  steps:{metadata:meta,hello,remote},upstream_main_is_pinned:false};
}
function selfTest(){
 const s={context:'pinned',meta:'success',hello:'success',remote:'success',phase:'TEST',upstreamSha:'a'.repeat(40)};
 assert.equal(classify(s).outcome,'PASS');
 assert.equal(classify({...s,hello:'failure'}).category,'RUNTIME_CONTRACT_TEST');
 assert.equal(classify({...s,hello:'failure',phase:'TYPECHECK'}).category,'SDK_API');
 assert.equal(classify({...s,remote:'failure',phase:'BUILD'}).category,'BUILD');
 assert.equal(classify({...s,meta:'failure',upstreamSha:'UNAVAILABLE',phase:'UNKNOWN'}).category,'UNKNOWN');
 assert.throws(()=>classify({...s,upstreamSha:'deadbeef'}),/D228_UPSTREAM_SHA_INVALID/);
 assert.throws(()=>classify({...s,context:'release'}),/D228_CONTEXT_INVALID/);
 assert.throws(()=>classify({...s,hello:'skippedgreen'}),/D228_STEP_OUTCOME_INVALID/);
 console.log('D228_CLASSIFICATION_NEGATIVE_FIXTURES=PASS');
}
function main(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D228_PUBLIC_CI_ONLY');
 const temp=process.env.RUNNER_TEMP;assert(temp&&path.isAbsolute(temp),'D228_TEMP_REQUIRED');
 let phase='UNKNOWN',upstreamSha='UNAVAILABLE';
 const phaseFile=path.join(temp,'d228-phase.txt');
 if(fs.existsSync(phaseFile))phase=fs.readFileSync(phaseFile,'utf8').trim();
 assert(['BUILD','TYPECHECK','TEST','UNKNOWN'].includes(phase),'D228_PHASE_INVALID');
 const refFile=path.join(temp,'d228-upstream-sha.txt');
 if(fs.existsSync(refFile))upstreamSha=fs.readFileSync(refFile,'utf8').trim();
 const evidence=classify({
  context:process.env.SDK_CONTEXT,meta:process.env.D228_META_RESULT,
  hello:process.env.D228_HELLO_RESULT,remote:process.env.D228_REMOTE_RESULT,
  phase,upstreamSha
 });
 const out='out/d228';fs.mkdirSync(out,{recursive:true});
 const summary={schema:'suliko-d228-compat-matrix-v1',...evidence,
   evidence:'source-only GitHub Actions matrix; no production plugin or live Remote',
   checked_sha:process.env.GITHUB_SHA};
 assert(sha40.test(summary.checked_sha),'D228_SOURCE_SHA_INVALID');
 fs.writeFileSync(path.join(out,evidence.context+'.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
 if(evidence.outcome!=='PASS'){
  const issue='# BB upstream compatibility review — ISSUE DRAFT ONLY\n\n'+
   '- Pinned BB: 0.49.0 / pinned plugin SDK 0.6.132\n'+
   '- Matrix context: '+evidence.context+'\n'+
   '- Upstream main exact SHA: '+upstreamSha+'\n'+
   '- Source SHA: '+process.env.GITHUB_SHA+'\n'+
   '- Failure category: '+evidence.category+' (phase-based, review raw gated CI logs privately)\n'+
   '- Classification scope: '+evidence.scope+'\n'+
   '- Recommendation: WAIT; investigate SDK breaking API / build / contract tests. Do not auto-bump.\n'+
   '- No API issue creation, no BB edits, no owner device, no release.\n';
  fs.writeFileSync(path.join(out,evidence.context+'-issue-draft.md'),issue,{mode:0o600});
 }
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   'D228 pinned-vs-upstream '+evidence.context+': '+evidence.outcome+' '+evidence.category+
   ' exact upstream '+upstreamSha+'; report is artifact only, no automatic issue.\n');
 console.log('D228_MATRIX_STATUS='+evidence.context+'_'+evidence.outcome+'_'+evidence.category);
}
if(process.argv.includes('--self-test'))selfTest();else main();
