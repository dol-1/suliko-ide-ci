import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLinks,evaluateDocs,checkExternal,summary} from './d255-docs-links.mjs';
const files={'site/docs/index.en.md':'[to ka](index.ka.md) [official](https://github.com/get-bb/bb)',
'site/docs/index.ka.md':'[to en](index.en.md)'};
test('D255 internal EN KA and public whitelist inventory',()=>{
 const r=evaluateDocs(files);
 assert.equal(r.localErrors.length,0);assert.deepEqual(r.external,['https://github.com/get-bb/bb']);
});
test('D255 detects broken relative link',()=>{
 const r=evaluateDocs({...files,'site/docs/index.en.md':'[missing](notfound.ka.md)'});
 assert.equal(r.localErrors.length,1);
});
test('D255 blocks non-HTTPS or localhost unreviewed sources',()=>{
 const r=evaluateDocs({...files,'site/docs/index.en.md':'[token](http://127.0.0.1:1234/private)'});
 assert.equal(r.unreviewed.length,1);
});
test('D255 scheduled results separate public 404 candidate from uncertain 403',async()=>{
 const urls=['https://github.com/get-bb/bb','https://dol-1.github.io/suliko-ide-ci/'];
 let n=0;const r=await checkExternal(urls,{fetchImpl:async()=>({status:++n===1?404:403})});
 assert.equal(r[0].result,'MISSING_CANDIDATE');assert.equal(r[1].result,'REVIEW');
 assert.equal(summary(evaluateDocs(files),r).externalMissingCandidates.length,1);
});

test('D255 permits ONLY pre-existing public issue-template query (not any token or custom form)',()=>{
 const existing='https://github.com/dol-1/suliko-ide-ci/issues/new?template=pilot-signup.yml';
 const v=evaluateDocs({...files,'site/docs/index.en.md':'[existing public template]('+existing+')'});
 assert.equal(v.unreviewed.length,0);assert(v.external.includes(existing));
 for(const other of ['https://github.com/dol-1/suliko-ide-ci/issues/new?template=other.yml','https://github.com/dol-1/suliko-ide-ci/issues/new?token=x','https://evil.test/external']){
   const audit=evaluateDocs({...files,'site/docs/index.en.md':'[not allowed]('+other+')'});
   assert.equal(audit.unreviewed.length,1);
 }
});
