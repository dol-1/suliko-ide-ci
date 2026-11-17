import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const y=readFileSync('.github/workflows/d246-five-windows-proof.yml','utf8');
test('D246 proof only calls full unchanged official Windows D129 on source or synthetic refs',()=>{
 assert.match(y,/branches:[\s\S]*fix\/d246-windows-stock-after-d242/);
 assert.match(y,/test\/d246-winproof-\*/);
 assert.match(y,/permissions: read-all/);
 assert.match(y,/github\.repository == 'dol-1\/suliko-ide-ci'/);
 assert.match(y,/uses: \.\/\.github\/workflows\/d129-windows-installed-desktop-hello\.yml/);
 assert.equal((y.match(/^\s+uses:\s/gm)||[]).length,1);
 assert.doesNotMatch(y,/continue-on-error:|workflow_dispatch:|secrets:|skip[-_ ]tests|npm test --if-present/i);
});