import test from 'node:test';
import assert from 'node:assert/strict';
import {RC1_DIGEST,assess,render} from './d239-rc2-dry-run.mjs';
const notes='D202 current source Windows provenance. No public beta, only dry-run.';
const rec='sha256='+RC1_DIGEST+'\nstatus=REVIEW_CANDIDATE_ONLY_NOT_APPROVED\n';
test('D239 rc1 identical source package cannot claim rc2 binary upgrade',()=>{
 const r=assess({candidate:RC1_DIGEST,reviewRecord:rec,sourceNotes:notes});
 assert.equal(r.byteIdenticalToRc1,true);assert.equal(r.userPackageChange,'NONE_IDENTICAL_ARCHIVE');
 assert.equal(r.tagCreated,false);assert.equal(r.published,false);
 assert.match(render(r),/BYTE IDENTICAL/);
});
test('D239 independent changed digest requires review not automatic tag',()=>{
 const next='c'.repeat(64);
 const r=assess({candidate:next,reviewRecord:'sha256='+next+'\nstatus=REVIEW_CANDIDATE_ONLY_NOT_APPROVED\n',sourceNotes:notes});
 assert.equal(r.byteIdenticalToRc1,false);assert.equal(r.releaseApproved,false);
});
test('D239 malformed and nonreviewed candidate refused, no false GO',()=>{
 assert.throws(()=>assess({candidate:'short',reviewRecord:rec,sourceNotes:notes}),/BAD_CANDIDATE/);
 assert.throws(()=>assess({candidate:'b'.repeat(64),reviewRecord:rec,sourceNotes:notes}),/NOT_REVIEWED/);
 assert.throws(()=>assess({candidate:RC1_DIGEST,reviewRecord:rec,sourceNotes:'published now'}),/UNSAFE/);
});
