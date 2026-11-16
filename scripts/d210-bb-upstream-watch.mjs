import assert from 'node:assert/strict';import fs from 'node:fs';
const pinned='desktop-v0.49.0',expectedLicense='MIT';

function analyze(input,now){
 assert(input&&input.latest&&input.repo,'D210_UPSTREAM_INPUT_INVALID');
 const tag=input.latest.tag_name,published=input.latest.published_at,license=input.repo.license?.spdx_id;
 assert(/^desktop-v\d+\.\d+\.\d+$/.test(tag),'D210_UNEXPECTED_RELEASE_TAG');
 assert(typeof published==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(published),'D210_RELEASE_DATE_INVALID');
 assert(license&&typeof license==='string'&&/^[A-Za-z0-9.()+-]{2,40}$/.test(license),'D210_LICENSE_UNKNOWN');
 const publishedAt=Date.parse(published);assert(Number.isFinite(publishedAt),'D210_DATE_UNPARSEABLE');
 const ageDays=Math.floor((now-publishedAt)/86400000);assert(ageDays>=-1,'D210_FUTURE_PUBLISHED_DATE');
 const changed=tag!==pinned,licenseChanged=license!==expectedLicense,stale=ageDays>=60;
 const safeUrl='https://github.com/get-bb/bb/releases/tag/'+tag;
 const reasons=[...(changed?['A new stable desktop tag differs from pinned']:[]),...(licenseChanged?['GitHub repository SPDX license differs from reviewed MIT']:[]),...(stale?['No new stable desktop release for 60 or more days']:[])];
 const header='# BB upstream review '+tag+' (review draft ONLY)\n\n';
 const report=header+'- Reviewed pinned: '+pinned+'\n- Newest official stable: '+tag+
 '\n- Official URL: '+safeUrl+'\n- Published UTC: '+published+
 '\n- Repository SPDX: '+license+'; baseline '+expectedLicense+
 '\n- Age days: '+ageDays+'\n- Triggers: '+(reasons.length?reasons.join('; '):'NONE (pinned remains latest, license unchanged, <60 days)')+
 '\n\n## Human review checklist; no automated decision\n\n'+
 '- [ ] Read exact upstream changelog and document additions, BB plugin SDK API/typing breaking changes and security fixes (DO NOT invent this from tag).\n'+
 '- [ ] Check upstream license, plugin permission/IPC changes and compatibility with locked BB 0.49.0.\n'+
 '- [ ] Decide bump vs defer in separate GitLab issue after source review; security fixes highest priority.\n'+
 '- [ ] If proposing bump: separate MR, owned plugins/config only (NO edits to get-bb/bb), exact native D165 three OS + QA14/14 + SEC02 + D166 builders with no unsupported version-range expansion.\n'+
 '- [ ] If stale/license changed: propose BB continuity issue for owner review, never auto-publish or auto-issue.\n\n'+
 '**NO changes to pinned version, BB core, live user devices, public release or pilot.**\n';
 return {tag,license,ageDays,changed,licenseChanged,stale,needsReview:reasons.length>0,report};
}
function selfTest(){
 const sample={latest:{tag_name:pinned,published_at:'2026-11-06T20:54:14Z'},repo:{license:{spdx_id:'MIT'}}},n=Date.parse('2026-11-16T14:00:00Z');
 const same=analyze(sample,n);assert(!same.needsReview);
 assert(analyze({...sample,latest:{...sample.latest,tag_name:'desktop-v0.50.0'}},n).changed);
 assert(analyze({...sample,repo:{license:{spdx_id:'Apache-2.0'}}},n).licenseChanged);
 assert(analyze(sample,n+61*86400000).stale);
 assert.throws(()=>analyze({...sample,latest:{...sample.latest,tag_name:'desktop-latest'}},n),/D210_UNEXPECTED_RELEASE_TAG/);
 assert.throws(()=>analyze({...sample,repo:{license:{spdx_id:null}}},n),/D210_LICENSE_UNKNOWN/);
 console.log('D210_RELEASE_LICENSE_60DAY_NO_AUTO_ISSUE_NEGATIVES=PASS');
}
function run(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D210_PUBLIC_RUNNER_REQUIRED');
 const s=fs.readFileSync(0,'utf8');assert(s.length>100&&s.length<200000,'D210_BOUNDED_INPUT');
 const result=analyze(JSON.parse(s),Date.now());
 fs.mkdirSync('out/d210',{recursive:true});
 fs.writeFileSync('out/d210/upstream-review.md',result.report,{mode:0o600});
 fs.writeFileSync('out/d210/upstream-status.json',JSON.stringify({pinned,tag:result.tag,license:result.license,ageDays:result.ageDays,changed:result.changed,licenseChanged:result.licenseChanged,stale:result.stale,needsReview:result.needsReview},null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,result.report);
 console.log('D210_READONLY_UPSTREAM_NEEDS_REVIEW='+result.needsReview+' PINNED='+pinned+' LATEST='+result.tag);
}
if(process.argv.includes('--self-test'))selfTest();else run();
