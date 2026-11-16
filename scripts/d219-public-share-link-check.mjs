import fs from 'node:fs';
import assert from 'node:assert/strict';
const repo='dol-1/suliko-ide-ci',base='https://dol-1.github.io/suliko-ide-ci/';
const form='https://github.com/'+repo+'/issues/new?template=pilot-signup.yml';
const expected=['os','mode','usage','cadence','price-band','goals','public-consent'];
const required=['os','mode','usage','cadence','public-consent'];
const fieldLabels=['Windows','macOS','Linux','Desktop','Web','Two-week','Public'];
function validateSource(yaml,owner,en,ka){
 assert(yaml.startsWith('name:')&&yaml.includes('PUBLIC GitHub issue'),'D219_TEMPLATE_PUBLIC_SCOPE_ABSENT');
 const ids=[...yaml.matchAll(/^\s+id:\s*([a-z-]+)\s*$/gm)].map(x=>x[1]);
 assert.deepEqual(ids,expected,'D219_FORM_FIELDS_UNEXPECTED');
 for(const id of required){const offset=yaml.indexOf('id: '+id);assert(offset>=0);
   const next=ids.indexOf(id)<ids.length-1?yaml.indexOf('id: '+ids[ids.indexOf(id)+1],offset):yaml.length;
   assert(/required: true/.test(yaml.slice(offset,next)),'D219_REQUIRED_FIELD_NOT_ENFORCED:'+id);
 }
 assert(!/(?:type:\s*input|id:\s*(?:email|name|phone|address|contact))/.test(yaml),'D219_PERSONAL_INPUT_FIELD_NOT_ALLOWED');
 for(const target of [owner,en,ka]){
  assert(target.includes(form),'D219_MISSING_PUBLIC_FORM_REFERENCE');
  assert(!/(?:mailto:|sign up by email)/i.test(target),'D219_ALTERNATIVE_CONTACT_NOT_ALLOWED');
 }
 // Exact absolute public Pages URL with a required path boundary; never trust a substring of a hostile host.
 assert(/https:\/\/dol-1\.github\.io\/suliko-ide-ci\/(?:\s|\)|$)/m.test(owner),'D219_LIVE_SITE_REFERENCE_MISSING');
 assert(owner.includes('NOT SENT'),'D219_NOT_SENT_SCOPE_MISSING');
 assert(en.includes('GitHub issues are public')||en.includes('GitHub issue'),'D219_EN_PRIVACY_MISSING');
 assert(ka.includes('Issue საჯაროა')||ka.includes('GitHub-ის საჯარო'),'D219_KA_PRIVACY_MISSING');
 return true;
}
async function get(url,contentType){
 const out=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),
   headers:{'accept':contentType,'user-agent':'Suliko-D219-CI-read-only'}});
 assert.equal(out.status,200,'D219_HTTP_NOT_200:'+url.split('?')[0]);
 assert(out.url===url,'D219_URL_REDIRECT:'+url.split('?')[0]);
 const data=await out.text();
 assert(data.length>250&&data.length<1200000,'D219_REMOTE_CONTENT_SIZE');
 return {data,ct:out.headers.get('content-type')||''};
}
function selfTest(){
 const owner=fs.readFileSync('docs/owner-pack/SHARE-LINK.md','utf8'),
       source=fs.readFileSync('.github/ISSUE_TEMPLATE/pilot-signup.yml','utf8'),
       en=fs.readFileSync('site/docs/pilot.en.md','utf8'),
       ka=fs.readFileSync('site/docs/pilot.ka.md','utf8');
 validateSource(source,owner,en,ka);
 assert.throws(()=>validateSource(source.replace('id: os','id: email'),owner,en,ka),/D219_FORM_FIELDS_UNEXPECTED/);
 assert.throws(()=>validateSource(source.replace('required: true','required: false'),owner,en,ka),/D219_REQUIRED_FIELD_NOT_ENFORCED/);
 assert.throws(()=>validateSource(source,owner.replace('NOT SENT','SENT'),en,ka),/D219_NOT_SENT_SCOPE_MISSING/);
 console.log('D219_PUBLIC_FORM_FIELDS_MINIMAL_AND_NO_SEND_NEGATIVES=PASS');
}
if(process.argv.includes('--self-test'))selfTest();
else{
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY===repo&&
  process.env.GITHUB_REF_NAME==='feat/d219-share-link-owner-ready-no-send','D219_ONLY_REVIEWED_CI');
 selfTest();
 for(const route of ['','pilot.en/','pilot.ka/']){
  const page=await get(base+route,'text/html');
  assert(page.ct.includes('text/html')&&page.data.includes('Suliko IDE'),'D219_PAGES_LIVE_INVALID');
  if(route.startsWith('pilot.'))assert(page.data.includes('pilot-signup.yml'),'D219_PILOT_FORM_LINK_NOT_LIVE');
 }
 // Official public GitHub REST source must itself return HTTP200 and exactly
 // the reviewed form fields, not an error page or private credential data.
 const api='https://api.github.com/repos/'+repo+'/contents/.github/ISSUE_TEMPLATE/pilot-signup.yml?ref=main';
 const remote=await get(api,'application/vnd.github+json');
 assert(remote.ct.includes('json'),'D219_FORM_API_MISSING_JSON');
 const obj=JSON.parse(remote.data);
 assert(obj.type==='file'&&obj.path==='.github/ISSUE_TEMPLATE/pilot-signup.yml'&&
   obj.encoding==='base64'&&typeof obj.content==='string','D219_FORM_REPO_API_SHAPE_INVALID');
 const yml=Buffer.from(obj.content.replace(/\s/g,''),'base64').toString('utf8');
 validateSource(yml,fs.readFileSync('docs/owner-pack/SHARE-LINK.md','utf8'),
   fs.readFileSync('site/docs/pilot.en.md','utf8'),fs.readFileSync('site/docs/pilot.ka.md','utf8'));
 // GitHub requires authentication to create issues: an unauthenticated
 // 302 to GitHub's OWN login is recorded honestly, never mislabeled HTTP200.
 const res=await fetch(form,{redirect:'manual',signal:AbortSignal.timeout(15000),
   headers:{accept:'text/html','user-agent':'Suliko-D219-CI-read-only'}});
 if(res.status===302){
   const loc=new URL(res.headers.get('location')||'',form);
   const target=new URL(loc.searchParams.get('return_to')||'/',form);
   assert(loc.origin==='https://github.com'&&loc.pathname==='/login'&&
     target.origin==='https://github.com'&&
     target.pathname==='/dol-1/suliko-ide-ci/issues/new'&&
     target.searchParams.get('template')==='pilot-signup.yml',
     'D219_UNEXPECTED_FORM_REDIRECT');
   console.log('D219_GITHUB_ISSUE_FORM=AUTH_LOGIN_302_NOT_ANONYMOUS_HTTP200');
 }else if(res.status===200){
   assert(res.url===form&&(res.headers.get('content-type')||'').includes('text/html'),
     'D219_FORM_PAGE_NOT_ORIGINAL_URL');
   const html=await res.text();
   assert(html.includes('pilot-signup.yml')&&html.includes('Suliko IDE'),
     'D219_FORM_VISIBLE_FIELDS_NOT_VERIFIED');
   console.log('D219_GITHUB_ISSUE_FORM=ANONYMOUS_HTTP200');
 }else assert.fail('D219_FORM_LINK_UNAVAILABLE: HTTP'+res.status);
 console.log('D219_PUBLIC_PAGES_3_HTTP200_FORM_TEMPLATE_API_HTTP200_AND_REVIEWED_NONPII_FIELDS=PASS_NOT_SENT');
}
