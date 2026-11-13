import {test} from "node:test";
import assert from "node:assert/strict";
import {checkAttestationResults} from "./d089-attestation-subject.mjs";
const digest="a".repeat(64);
const entry=d=>({verificationResult:{statement:{predicateType:"https://slsa.dev/provenance/v1",subject:[{name:"nonrelease-preview",digest:{sha256:d}}]}}});
test("one exact verified digest passes without exposing artifact metadata",()=>{
 const r=checkAttestationResults([entry(digest)],digest);
 assert.equal(r.subjectSha256Matches,true);
 assert.ok(!JSON.stringify(r).includes(digest));
});
test("missing result rejected",()=>assert.throws(()=>checkAttestationResults([],digest)));
test("wrong digest rejected",()=>assert.throws(()=>checkAttestationResults([entry("b".repeat(64))],digest)));
test("wrong predicate rejected",()=>{
 const v=entry(digest);v.verificationResult.statement.predicateType="https://example.invalid/other";
 assert.throws(()=>checkAttestationResults([v],digest));
});
test("duplicate or missing subject rejected",()=>{
 assert.throws(()=>checkAttestationResults([entry(digest),entry(digest)],digest));
 const v=entry(digest);v.verificationResult.statement.subject=[];
 assert.throws(()=>checkAttestationResults([v],digest));
});
test("malformed untrusted certificate-like data never surfaced",()=>{
 const synthetic="sk-"+"SYNTHETIC_TOKEN_123456789";
 const v=entry(synthetic);assert.throws(()=>checkAttestationResults([v],digest));
});
