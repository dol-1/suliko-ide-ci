// D255 public-only doc link guard. Internal source lint on push; external checks on schedule ONLY.
import fs from 'node:fs';
import path from 'node:path';
const docsRoot='site/docs',allowedHosts=new Set(['github.com','gitlab.com','dol-1.github.io']);
// Only two existing no-outreach docs link to the reviewed public signup issue template.
// Do not generalize to arbitrary query strings, token parameters or redirects.
function reviewedQuery(u){return u.search==='' || (u.hostname==='github.com' &&
 u.pathname==='/dol-1/suliko-ide-ci/issues/new' && u.search==='?template=pilot-signup.yml');}
export const pages=[
 '','index.ka/','install.en/','install.ka/','troubleshooting.en/','troubleshooting.ka/',
 'pilot.en/','pilot.ka/','windows-trust.en/','windows-trust.ka/'
];
export function extractLinks(md){
 if(typeof md!=='string')throw Error('D255_NOT_MARKDOWN');
 return [...md.matchAll(/!?\[[^\]]+\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*)?\)/g)]
  .map(x=>x[1].replace(/^<|>$/g,''));
}
export function evaluateDocs(files){
 const names=Object.keys(files).sort(),known=new Set(names),missing=[],external=new Set(),unreviewed=[];
 if(names.length<2||names.length>150)throw Error('D255_WRONG_DOC_SCOPE');
 for(const name of names){
  if(!name.startsWith(docsRoot+'/')||!/\.md$/.test(name)||name.includes('..'))
   throw Error('D255_UNREVIEWED_DOC_PATH');
  if(name.endsWith('.en.md')&&!known.has(name.replace(/\.en\.md$/,'.ka.md')))missing.push(name+' missing Georgian translation');
  if(name.endsWith('.ka.md')&&name!=='site/docs/index.ka.md'&&!known.has(name.replace(/\.ka\.md$/,'.en.md')))missing.push(name+' missing English translation');
  for(const link of extractLinks(files[name])){
   if(link.startsWith('#'))continue;
   if(/^https:\/\//i.test(link)){
    try{
     const url=new URL(link);
     if(!allowedHosts.has(url.hostname)||url.username||url.password||!reviewedQuery(url)||url.hash||url.port||url.pathname.length>650)
       unreviewed.push(name+': unreviewed external URL');
     else external.add(url.origin+url.pathname+url.search);
    }catch{unreviewed.push(name+': malformed https link')}
   }else if(/^[A-Za-z][A-Za-z0-9+.-]*:/.test(link)||link.startsWith('//')){
    unreviewed.push(name+': non-HTTPS or non-link external scheme');
   }else{
    let relative;try{relative=decodeURIComponent(link.split('#')[0].split('?')[0])}catch{missing.push(name+': malformed relative URL');continue}
    if(!relative||relative.startsWith('/')||relative.includes('\\')){missing.push(name+': unsupported relative URL');continue}
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(name),relative));
    if(!resolved.startsWith(docsRoot+'/')||!known.has(resolved))missing.push(name+': absent local target '+relative);
   }
  }
 }
 return {docs:names.length,localErrors:missing,unreviewed,external:[...external].sort()};
}
export async function checkExternal(urls,{fetchImpl=fetch}={}){
 if(!Array.isArray(urls)||urls.length>250)throw Error('D255_EXTERNAL_SCOPE');
 const results=[];
 for(const raw of urls){
  const u=new URL(raw);
  if(u.protocol!=='https:'||!allowedHosts.has(u.hostname)||u.username||u.password||!reviewedQuery(u)||u.hash||u.port)
   throw Error('D255_EXTERNAL_NOT_ALLOWLISTED');
  let status=0;
  try {
   const response=await fetchImpl(u.href,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(12000)});
   status=response.status;
   if(response.body)await response.body.cancel();
  }catch{status=0}
  const result=status>=200&&status<300?'OK':status===404||status===410?'MISSING_CANDIDATE':'REVIEW';
  results.push({host:u.hostname,path:u.pathname,status,result});
 }
 return results;
}
export function summary(audit,checks=[]){
 return {schema:'suliko-d255-docs-links-v1',checkedDocs:audit.docs,
  internalMissing:audit.localErrors,unreviewedSchemes:audit.unreviewed,
  externalCheckCount:checks.length,externalOk:checks.filter(x=>x.result==='OK').length,
  externalMissingCandidates:checks.filter(x=>x.result==='MISSING_CANDIDATE'),
  externalNeedsReview:checks.filter(x=>x.result==='REVIEW'),
  warning:'External 404 can mean private, moved or inaccessible. Do not claim broken without checking public context; no automatic external changes.'};
}
if(process.argv[1]?.endsWith('d255-docs-links.mjs')){
 try{
  const mode=process.argv[2];
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci')throw Error('D255_PUBLIC_GH_ONLY');
  if(mode!=='--internal'&&mode!=='--scheduled-external')throw Error('D255_MODE');
  if(mode==='--scheduled-external'&&process.env.GITHUB_EVENT_NAME!=='schedule')throw Error('D255_EXTERNAL_SCHEDULE_ONLY');
  const files={};
  for(const name of fs.readdirSync(docsRoot)){
   if(!name.endsWith('.md'))continue;
   const file=docsRoot+'/'+name;
   const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error('D255_NONREGULAR_DOC');
   files[file]=fs.readFileSync(file,'utf8');
  }
  const audit=evaluateDocs(files);
  let checks=[];
  if(mode==='--scheduled-external'){
   const urls=audit.external.concat(pages.map(p=>'https://dol-1.github.io/suliko-ide-ci/'+p));
   checks=await checkExternal([...new Set(urls)]);
  }
  const result=summary(audit,checks);
  if(process.env.GITHUB_STEP_SUMMARY){
   fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
     '# D255 public own docs link check\n'+
     'Files '+result.checkedDocs+'; internal missing '+result.internalMissing.length+
     '; unreviewed links '+result.unreviewedSchemes.length+
     '; external scheduled '+result.externalCheckCount+', OK '+result.externalOk+
     ', missing candidates '+result.externalMissingCandidates.length+
     ', manual review '+result.externalNeedsReview.length+'.\n'+
     result.warning+'\n');
  }
  fs.writeFileSync(process.env.RUNNER_TEMP+'/d255-link-audit.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  if(audit.localErrors.length||audit.unreviewed.length)throw Error('D255_INTERNAL_OR_UNREVIEWED_LINKS');
  const missingPages=checks.filter(x=>x.host==='dol-1.github.io'&&x.result==='MISSING_CANDIDATE');
  if(missingPages.length)throw Error('D255_PUBLIC_PAGES_404_OR_410');
  console.log('D255_'+mode.slice(2).replace(/-/g,'_').toUpperCase()+'_REVIEW_COMPLETE_NO_AUTOFIX=PASS');
 }catch(e){console.error('D255_FAIL_CLOSED_'+(e?.message??'UNKNOWN'));process.exitCode=1}
}
