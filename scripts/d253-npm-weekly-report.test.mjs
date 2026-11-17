import test from 'node:test';
import assert from 'node:assert/strict';
import {auditSummary,outdatedSummary,summary,markdown} from './d253-npm-weekly-report.mjs';
test('D253 real npm v2 metadata severity counts',()=>{
 assert.deepEqual(auditSummary({metadata:{vulnerabilities:{critical:1,high:2,moderate:3,low:4}}}),{critical:1,high:2,moderate:3,low:4,info:0});
});
test('D253 legacy pnpm advisories',()=>{
 assert.equal(auditSummary({advisories:{a:{severity:'high'},b:{severity:'low'}}}).high,1);
});
test('D253 redact raw descriptions; only bounded counts and names',()=>{
 const data=[{plugin:'suliko-hello',audit:{metadata:{vulnerabilities:{high:1}}},outdated:{'zod':{current:'4.0.0',wanted:'4.0.1',latest:'4.1.0'}}},
 {plugin:'suliko-remote-panel',audit:{metadata:{vulnerabilities:{}}},outdated:{}}];
 const r=summary(data),md=markdown(r);
 assert.match(md,/High/);assert.match(md,/zod/);assert.doesNotMatch(md,/secret/i);
});
test('D253 unknown severity or error cannot be counted as clean',()=>{
 assert.throws(()=>auditSummary({error:{code:'E429'}}),/UNAVAILABLE/);
 assert.throws(()=>auditSummary({vulnerabilities:{foo:{severity:'secret'}}}),/UNKNOWN_SEVERITY/);
 assert.throws(()=>auditSummary({}),/AUDIT_SCHEMA/);
});
test('D253 bogus registry output fails without upload',()=>{
 assert.throws(()=>outdatedSummary([{name:'private/path/key',current:'1',latest:'2'}]),/OUTDATED_SCHEMA/);
});

test('D253 registry latest without local node_modules current is explicitly unobserved',()=>{const a=outdatedSummary({'zod':{latest:'4.7.0',wanted:'4.6.7',dependencyType:'dependencies'}});assert.equal(a[0].current,'UNOBSERVED_NO_NODE_MODULES')});
