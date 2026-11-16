import fs from 'node:fs';
import assert from 'node:assert/strict';
const source='https://github.com/get-bb/bb',pinned='desktop-v0.49.0';
function version(tag){const m=/^desktop-v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);assert(m,'D210_UNREVIEWED_RELEASE_TAG');return m.slice(1).map(Number)}
function compare(a,b){for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(a[i]-b[i]);return 0}
function review(raw){
 assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'D210_JSON_INVALID');
 const tag=raw.tag_name,html=raw.html_url,when=raw.published_at;
 assert(typeof tag==='string'&&tag.length<65,'D210_TAG_INVALID');
 assert(raw.draft===false&&raw.prerelease===false,'D210_NOT_STABLE_RELEASE');
 assert(html===source+'/releases/tag/'+tag,'D210_UPSTREAM_URL_NOT_FIXED');
 assert(typeof when==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(when),'D210_RELEASE_DATE_INVALID');
 const candidate=version(tag),baseline=version(pinned),delta=compare(candidate,baseline);
 return {tag,pinned,when,html,decision:delta>0?'REVIEW_NEW_STABLE':delta===0?'NO_NEW_STABLE':'UPSTREAM_OLDER_THAN_PINNED',delta};
}
function outputs(r){
 const summary=['# D210 official BB stable release check','',
 'Source: '+source,'Published stable tag: '+r.tag,'Pinned BB Desktop: '+r.pinned,
 'Published UTC: '+r.when,'Official release: '+r.html,'Result: '+r.decision,'',
 'NO upstream core edits, automatic bump, release, user installation or Remote/Memo changes.'];
 const issue=r.delta>0?[
 '# BB upstream review '+r.tag,'',
 'Source: '+r.html,'Official published UTC: '+r.when,'Current reviewed pin: '+r.pinned,'',
 'Review changelog, plugin SDK breaking changes and security fixes against pinned source.',
 'Check immutable D165 genuine Windows/macOS/Linux setup, SEC02, strict QA J01–J07 Web/Desktop 14/14, D166 two-builder candidate and CodeQL/Semgrep/Gitleaks/D152.',
 'Recommend WAIT until actual own-plugin compatibility and independent security evidence are GREEN.',
 'A version bump requires a separate reviewed GitLab MR, never an auto-bump or BB core patch.',
 'This is an ISSUE DRAFT artifact only. NO API create issue and no release/pilot GO.'
 ].join('\n')+'\n':null;
 return {summary:summary.join('\n')+'\n',issue};
}
function selfTest(){
 const fixture={tag_name:pinned,html_url:source+'/releases/tag/'+pinned,published_at:'2026-11-06T20:54:14Z',draft:false,prerelease:false};
 assert.equal(review(fixture).decision,'NO_NEW_STABLE');assert.equal(outputs(review(fixture)).issue,null);
 const next={...fixture,tag_name:'desktop-v0.50.0',html_url:source+'/releases/tag/desktop-v0.50.0'};
 assert.equal(review(next).decision,'REVIEW_NEW_STABLE');assert(outputs(review(next)).issue.includes('separate reviewed GitLab MR'));
 assert.equal(review({...fixture,tag_name:'desktop-v0.48.1',html_url:source+'/releases/tag/desktop-v0.48.1'}).decision,'UPSTREAM_OLDER_THAN_PINNED');
 assert.throws(()=>review({...fixture,tag_name:'desktop-latest',html_url:source+'/releases/tag/desktop-latest'}),/D210_UNREVIEWED_RELEASE_TAG/);
 assert.throws(()=>review({...next,html_url:'https://example.com/invalid'}),/D210_UPSTREAM_URL_NOT_FIXED/);
 assert.throws(()=>review({...next,prerelease:true}),/D210_NOT_STABLE_RELEASE/);
 console.log('D210_OFFICIAL_STABLE_PIN_WAIT_ISSUE_DRAFT_NO_AUTO_BUMP_NEGATIVES=PASS');
}
function main(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D210_PUBLIC_CI_ONLY');
 const data=fs.readFileSync(0,'utf8');assert(data.length>100&&data.length<400000,'D210_API_INPUT_SIZE');
 const r=review(JSON.parse(data)),out=outputs(r);
 fs.mkdirSync('out/d210',{recursive:true});
 fs.writeFileSync('out/d210/status.md',out.summary,{mode:0o600});
 if(out.issue)fs.writeFileSync('out/d210/issue-draft.md',out.issue,{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,out.summary);
 console.log('D210_OFFICIAL_STABLE_'+r.decision+'='+r.tag);
}
if(process.argv.includes('--self-test'))selfTest();else main();
