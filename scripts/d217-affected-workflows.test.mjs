import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseItems,readPushTrigger,globRegex,matchPath,matchBranch,analyze}
 from './d217-affected-workflows.mjs';
test('D217 YAML inline branches and listed paths parsed without executing YAML',()=>{
 const spec=readPushTrigger(
  "name: check\non:\n  push:\n    branches: [feat/d217, main]\n    paths:\n      - 'marketplace/rc/**'\n      - '.github/workflows/check.yml'\n  workflow_dispatch:\n");
 assert.deepEqual(spec.branches,['feat/d217','main']);
 assert.deepEqual(spec.paths,['marketplace/rc/**','.github/workflows/check.yml']);
 assert.equal(matchBranch('feat/d217',spec),true);
 assert.equal(matchBranch('feat/other',spec),false);
 assert.equal(matchPath('marketplace/rc/EXPECTED_SHA',spec.paths),true);
 assert.equal(matchPath('marketplace/rc/icons/suliko.svg',spec.paths),true);
 assert.equal(matchPath('scripts/suliko.sh',spec.paths),false);
});
test('D217 scoped glob semantics and special regex punctuation',()=>{
 assert.equal(globRegex('scripts/**/*.mjs').test('scripts/a.mjs'),true);
 assert.equal(globRegex('scripts/**/*.mjs').test('scripts/sub/a.mjs'),true);
 assert.equal(globRegex('scripts/a.test.mjs').test('scripts/aXtest.mjs'),false);
 assert.equal(globRegex('docs/**').test('docs/index.md'),true);
 assert.equal(globRegex('docs/**').test('src/index.md'),false);
});
test('D217 ordered negative path filters and paths-ignore remain fail closed',()=>{
 assert.equal(matchPath('src/b.test.mjs',['src/**','!src/**/*.test.mjs']),false);
 assert.equal(matchPath('src/b.mjs',['src/**','!src/**/*.test.mjs']),true);
 assert.equal(matchPath('src/b.mjs',['src/**'],['src/b.mjs']),false);
});
test('D217 actual affected source list includes untriggerable required workflow',()=>{
 const files={
  '.github/workflows/native.yml':"on:\n  push:\n    branches: [main]\n    paths: ['scripts/**']\n",
  '.github/workflows/scan.yml':"on:\n  push:\n    branches: [feat/branch, main]\n    paths:\n      - 'scripts/**'\n",
  '.github/workflows/manual.yml':"on:\n  workflow_dispatch:\n"};
 const got=analyze(['scripts/safe.mjs'],files,'feat/branch');
 assert.deepEqual(got.affected.map(x=>x.workflow),[
  '.github/workflows/native.yml','.github/workflows/scan.yml']);
 assert.deepEqual(got.needsManual.map(x=>x.workflow),['.github/workflows/native.yml']);
 assert.deepEqual(got.featureRunnable.map(x=>x.workflow),['.github/workflows/scan.yml']);
});
test('D217 changed workflow must be reviewed even if its paths omit self',()=>{
 const files={'.github/workflows/guard.yml':"on:\n  push:\n    branches: [main]\n    paths:\n      - 'scripts/**'\n"};
 const got=analyze(['.github/workflows/guard.yml'],files,'feat/branch');
 assert.equal(got.affected.length,1);
 assert.equal(got.needsManual.length,1);
});
test('D217 no push means modified workflow is manual/blocked not green',()=>{
 const files={'.github/workflows/guard.yml':"on:\n  workflow_dispatch:\n"};
 const got=analyze(['.github/workflows/guard.yml'],files,'feat/branch');
 assert.equal(got.manual.length,1);
 assert.equal(got.needsManual.length,1);
});
test('D217 unsupported scalar path filters rejected rather than omitted',()=>{
 assert.throws(()=>readPushTrigger("on:\n  push:\n    paths: *.mjs\n"),/UNSUPPORTED_PUSH_PATHS_LIST/);
});
test('D217 static parser never treats a non-push schedule as automatic feature green',()=>{
 assert.equal(readPushTrigger("on:\n  schedule:\n    - cron: '17 3 * * *'\n  workflow_dispatch:\n"),null);
});


test('D226 !202 SHARE-LINK path replay identifies D181 and historical un-runnable branch',()=>{
 const f='.github/workflows/d181-owner-pack-lint.yml';
 const historic="on:\n  push:\n    branches: [fix/d225-owner-one-canonical-link-after-d219, main]\n    paths: ['docs/owner-pack/**']\n";
 const old=analyze(['docs/owner-pack/SHARE-LINK.md'],{[f]:historic},'feat/d219-share-readiness-after-d218');
 assert.deepEqual(old.affected.map(x=>x.workflow),[f]);
 assert.deepEqual(old.needsManual.map(x=>x.workflow),[f]);
 const current=analyze(['docs/owner-pack/SHARE-LINK.md'],{[f]:fs.readFileSync(new URL('../.github/workflows/d181-owner-pack-lint.yml',import.meta.url),'utf8')},'feat/d219-share-readiness-after-d218');
 assert.deepEqual(current.affected.map(x=>x.workflow),[f]);
 assert.deepEqual(current.featureRunnable.map(x=>x.workflow),[f]);
});
test('D226 !183 EXPECTED_SHA path replay identifies D165 3OS and historical un-runnable branch',()=>{
 const f='.github/workflows/d165-e1-one-command-3os.yml';
 const historic="on:\n  push:\n    branches: [feat/d165-end-user-one-command, main]\n    paths: ['marketplace/rc/**']\n";
 const old=analyze(['marketplace/rc/EXPECTED_SHA'],{[f]:historic},'feat/d205-tag-proof-after-pages-fix');
 assert.deepEqual(old.affected.map(x=>x.workflow),[f]);
 assert.deepEqual(old.needsManual.map(x=>x.workflow),[f]);
 const current=analyze(['marketplace/rc/EXPECTED_SHA'],{[f]:fs.readFileSync(new URL('../.github/workflows/d165-e1-one-command-3os.yml',import.meta.url),'utf8')},'feat/d205-tag-proof-after-pages-fix');
 assert.deepEqual(current.affected.map(x=>x.workflow),[f]);
 assert.deepEqual(current.featureRunnable.map(x=>x.workflow),[f]);
});
