import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyD249Log} from './d249-fixture-failure.mjs';
test('D249 startup categories use fixed allowlist and never reflect raw logs',()=>{
  const cases=[
    ['Error listen EADDRINUSE 127.0.0.1:38888','port-bind'],
    ['ERR_MODULE_NOT_FOUND /private/example','module-unavailable'],
    ['EACCES permission denied','permission'],
    ['FATAL ERROR out of memory','memory'],
    ['SQLITE_BUSY database is locked','data-store'],
    ['unknown option --something','argument-rejected'],
    ['ENOENT no such file or directory','file-missing'],
    ['silent startup failure with ghp_SYNTHETICSECRETNOTREAL','unclassified'],
    ['','log-empty']];
  const allowed=new Set(cases.map(x=>x[1]));
  for(const [log,category] of cases){
    const actual=classifyD249Log(log);
    assert.equal(actual,category);
    assert(allowed.has(actual));
    assert(!actual.includes('SYNTHETICSECRETNOTREAL'));
  }
});