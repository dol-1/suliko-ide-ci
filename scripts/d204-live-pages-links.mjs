// D204 immutable public Github Pages external check. No private URLs or user data.
// The only network destinations are twelve fixed GitHub Pages paths (no redirects).
import assert from 'node:assert/strict';
const root='https://dol-1.github.io/suliko-ide-ci/';
const pages=[
  ['','Suliko IDE','remote.en/'],
  ['index.ka/','მომხმარებლის გზამკვლევი','remote.ka/'],
  ['install.en/','NotSigned','first-steps.en/'],
  ['install.ka/','NotSigned','first-steps.ka/'],
  ['remote.en/','synthetic/mock','privacy.en/'],
  ['remote.ka/','სინთეტიკურ','privacy.ka/'],
  ['pilot.en/','pilot','troubleshooting.en/'],
  ['pilot.ka/','პილოტ','troubleshooting.ka/'],
  ['windows-trust.en/','NotSigned','install.en/'],
  ['windows-trust.ka/','NotSigned','install.ka/'],
  ['macos-linux-trust.en/','Gatekeeper','windows-trust.en/'],
  ['macos-linux-trust.ka/','Gatekeeper','windows-trust.ka/']
];
const validate=(html,page,word,link)=>{
  assert(typeof html==='string'&&html.length>=300&&html.length<1000000,'D204_PAGE_LENGTH_INVALID');
  assert(html.includes('<html')&&html.includes('Suliko IDE'),'D204_PAGE_HTML_MISSING');
  assert(html.toLowerCase().includes(word.toLowerCase()),'D204_REQUIRED_PUBLIC_SCOPE_MISSING:'+page);
  assert(html.includes(link),'D204_INTERNAL_LINK_MISSING:'+page);
};
export function staticCheck(){
  assert(pages.length===12,'D242_EXPECT_12_LIVE_ROUTES');
  for(const [path,word,link] of pages){
    assert(/^[a-z.\/-]*$/.test(path)&&!path.includes('..'),'D204_UNREVIEWED_PATH');
    assert(word&&link&&!link.includes('..'),'D204_UNREVIEWED_LITERAL');
  }
  const dummy='<html><head><title>Suliko IDE</title></head><body>'+('x'.repeat(350))+' synthetic/mock privacy.en/</body></html>';
  validate(dummy,'remote.en/','synthetic/mock','privacy.en/');
  assert.throws(()=>validate(dummy,'remote.en/','live production approval','privacy.en/'));
  assert.throws(()=>validate(dummy,'remote.en/','synthetic/mock','evil.example/'));
  console.log('D204 fixed public paths and missing-proof negative tests PASS');
}
if(process.argv.includes('--self-test')){staticCheck();process.exit(0);}
assert(process.argv.includes('--live')&&process.argv.length===3,'D204_CI_ONLY');
assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci'&&
  process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_EVENT_NAME==='push','D204_REVIEWED_MAIN_PUSH_ONLY');
staticCheck();
async function read(page){
  const url=root+page;
  for(let attempt=0;attempt<10;attempt++){
    try{
      const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{'accept':'text/html'}});
      if(response.status!==200||!String(response.headers.get('content-type')||'').includes('text/html'))
        throw Error('PUBLIC_PAGE_UNAVAILABLE');
      const html=await response.text();
      return html;
    }catch(e){
      if(attempt===9)throw Error('D204_PUBLIC_PAGE_INACCESSIBLE:'+page);
      await new Promise(resolve=>setTimeout(resolve,3500));
    }
  }
}
for(const [page,word,link] of pages){
 const html=await read(page);
 validate(html,page,word,link);
}
console.log('D242_OFFICIAL_LIVE_GITHUB_PAGES_12_URLS_KA_EN_TRUST=PASS');
