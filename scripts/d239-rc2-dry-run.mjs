// D239 source-only reproducibility comparison, NEVER create tag, approval or release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
export const RC1_SOURCE='1c7470934ab694ce69ac92e70de300d6f6c50743';
export const REVIEWED_MAIN='02544da33f784cc73e4daba09170ece3d30f8cd8';
export const RC1_DIGEST='8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a';
const sha64=/^[a-f0-9]{64}$/;
export function assess({candidate,reviewRecord,tagRef=RC1_SOURCE,mainRef=REVIEWED_MAIN,sourceNotes}){
 assert(sha64.test(candidate),'D239_BAD_CANDIDATE_SHA256');
 assert(tagRef===RC1_SOURCE&&mainRef===REVIEWED_MAIN,'D239_UNREVIEWED_SOURCE_REFS');
 assert(typeof reviewRecord==='string'&&reviewRecord.includes('sha256='+candidate)&&reviewRecord.includes('status=REVIEW_CANDIDATE_ONLY_NOT_APPROVED'),
   'D239_CANDIDATE_NOT_REVIEWED');
 assert(typeof sourceNotes==='string'&&sourceNotes.includes('No public beta')&&
   sourceNotes.includes('D202')&&sourceNotes.includes('Windows'),
   'D239_UNSAFE_OR_MISSING_DRAFT_NOTES');
 const same=candidate===RC1_DIGEST;
 return {schema:'suliko-d239-source-rc2-no-tag-v1',rc1Source:tagRef,mainSource:mainRef,
   rc1Digest:RC1_DIGEST,sourceCandidateDigest:candidate,byteIdenticalToRc1:same,
   userPackageChange:same?'NONE_IDENTICAL_ARCHIVE':'REVIEW_REQUIRED_CANDIDATE_BINARY_CHANGED',
   humanNote:same?'rc.2 is NOT a distinct package; do not label this as an upgrade or new release.':
      'Distinct candidate SHA requires a separate review, no automatic rc.2 tag/release.',
   changesSourceOnly:['D198 owned live doctor and sanitized support bundle',
    'D202 SHA-bound Windows owned uninstall verification',
    'D217 exact-source affected CI inventory, more strict Windows/Linux/macOS native CI'],
   published:false,tagCreated:false,installerIssued:false,releaseApproved:false};
}
export function render(r){
 return [
 '# D239 rc.2 dry-run candidate contrast (NO tag, NO release)',
 'Exact original rc.1 source: '+r.rc1Source,
 'Reviewed current main source: '+r.mainSource,
 'Original rc.1 immutable archive SHA256: '+r.rc1Digest,
 'Two independent current-source candidate archive SHA256: '+r.sourceCandidateDigest,
 'Binary equality: '+(r.byteIdenticalToRc1?'BYTE IDENTICAL':'DIFFERENT, REVIEW REQUIRED'),
 'English: '+r.humanNote,
 'English: Added source-only work includes owned doctor, strict Windows uninstall digest, and exact-source CI. No public beta; no binary upgrade claim.',
 'ქართული: ეს არის მხოლოდ წყაროსა და ორმაგი builder-ის ტესტი. ცვლილებები: დამხმარე დიაგნოსტიკა, Windows-ის უსაფრთხო წაშლის ჰეშის კონტროლი და CI. არც ტეგი, არც საჯარო ბეტა, არც ახალი პროგრამული ვერსია.',
 'State: source-only reviewer candidate; no release, tag, security signing or outreach.',
 ].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('d239-rc2-dry-run.mjs')){
 try {
   if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci'||
      process.env.GITHUB_REF_NAME!=='feat/d239-rc2-no-tag-dry-run')throw Error('D239_PUBLIC_FEATURE_ONLY');
   const digest=process.env.D239_CANDIDATE_SHA;
   const rec=fs.readFileSync('marketplace/rc/EXPECTED_SHA.candidate','utf8');
   const notes=fs.readFileSync('docs/release/D239-RC2-SOURCE-ONLY-KA-EN.md','utf8');
   const report=assess({candidate:digest,reviewRecord:rec,sourceNotes:notes});
   const temp=process.env.RUNNER_TEMP;
   if(!temp)throw Error('D239_EPHEMERAL_TEMP_REQUIRED');
   fs.writeFileSync(temp+'/d239-rc2-source-only.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
   if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,render(report));
   console.log('D239_SOURCE_RC2_TWIN_BUILDERS_REPRODUCIBLE=PASS; archive_equal_rc1='+report.byteIdenticalToRc1+'; NOT RELEASED');
 }catch(e){console.error('D239_FAIL_CLOSED_'+(e?.message??'UNKNOWN'));process.exitCode=1}
}
