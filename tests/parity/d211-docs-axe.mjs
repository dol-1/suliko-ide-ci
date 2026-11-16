import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const stems=['install','first-steps','faq','web','remote','privacy','troubleshooting','pilot','pilot-metrics','pilot-start','pilot-feedback'];
const routes=['/','/index.ka/',...stems.flatMap(stem=>['/'+stem+'.en/','/'+stem+'.ka/'])];
const snapshots=new Map([['/','home-en'],['/index.ka/','home-ka'],['/install.en/','install-en'],['/install.ka/','install-ka']]);
function validOrigin(input){
 const u=new URL(input);
 assert(u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.username===''&&u.password===''&&u.search===''&&u.hash==='', 'D211_PUBLIC_DOCS_LOOPBACK_ONLY');
 assert(/^[0-9]+$/.test(u.port)&&Number(u.port)>1024&&Number(u.port)<65536,'D211_LOCAL_PORT_REQUIRED');
 return u.origin;
}
function checkRoutes(){
 assert(routes.length===24,'D211_TWO_LANGUAGES_20_ROUTE_PARITY');
 for(const stem of stems)assert(routes.includes('/'+stem+'.en/')&&routes.includes('/'+stem+'.ka/'),'D211_MISSING_KA_EN_PAIR');
 assert(new Set(routes).size===24,'D211_DUPLICATE_ROUTE');
 return true;
}
function selfTest(){
 checkRoutes();
 assert.equal(validOrigin('http://127.0.0.1:38895'),'http://127.0.0.1:38895');
 for(const bad of ['https://127.0.0.1:38895','http://0.0.0.0:38895','http://localhost:38895','http://127.0.0.1:38895/?x=1','http://user:pass@127.0.0.1:38895']){
   assert.throws(()=>validOrigin(bad),/D211_/);
 }
 console.log('D211_LOOPBACK_AND_BILINGUAL_ROUTE_NEGATIVES=PASS');
}
async function run(){
 checkRoutes();
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D211_PUBLIC_RUNNER_ONLY');
 const origin=validOrigin(process.env.D211_DOCS_ORIGIN||'');
 const temp=path.resolve(process.env.RUNNER_TEMP||'/bad'),output=path.resolve(process.env.D211_OUTPUT_DIR||'/bad');
 assert(output.startsWith(temp+path.sep),'D211_SCREENSHOTS_MUST_STAY_RUNNER_TEMP');
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
   const context=await browser.newContext({viewport:{width:1280,height:800},locale:'en-US'});
   await context.route('**/*',route=>{
     let reqUrl;
     try{reqUrl=new URL(route.request().url())}catch{return route.abort()}
     return reqUrl.origin===origin?route.continue():route.abort();
   });
   const page=await context.newPage(),localLinks=new Set(),audit=[];
   for(const route of routes){
     const url=origin+route;
     const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
     assert(response&&response.status()===200,'D211_RENDERED_PUBLIC_ROUTE_NOT_200:'+route);
     assert((await page.locator('h1').count())>0,'D211_RENDERED_TITLE_MISSING:'+route);
     const links=await page.locator('a[href]').evaluateAll(els=>els.map(x=>x.getAttribute('href')).filter(Boolean));
     for(const href of links){
       let dest;
       try{dest=new URL(href,url)}catch{throw Error('D211_INVALID_ANCHOR_URL:'+route)}
       if(dest.origin===origin){assert(!dest.pathname.includes('..'),'D211_TRAVERSAL_LINK');localLinks.add(dest.pathname+dest.search)}
     }
     const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     const critical=axe.violations.filter(x=>x.impact==='critical');
     const serious=axe.violations.filter(x=>x.impact==='serious');
     assert(critical.length===0,'D211_AXE_CRITICAL:'+route+':'+critical.map(x=>x.id).join(','));
     audit.push({route,critical:0,serious:serious.length,violations:axe.violations.length});
     if(snapshots.has(route)){
       await page.setViewportSize({width:375,height:812});
       const name='d211-public-'+snapshots.get(route)+'-375px.png',file=path.join(output,name);
       await page.screenshot({path:file,fullPage:true,animations:'disabled'});
       assert(fs.statSync(file).size>1500,'D211_MOBILE_SCREENSHOT_EMPTY:'+name);
       await page.setViewportSize({width:1280,height:800});
     }
   }
   assert(localLinks.size>5&&localLinks.size<=180,'D211_BOUNDED_PUBLIC_INTERNAL_LINK_COUNT');
   for(const href of [...localLinks].sort()){
     const res=await context.request.get(origin+href,{timeout:10000,failOnStatusCode:false});
     assert(res.status()===200,'D211_RENDERED_INTERNAL_LINK_BROKEN:'+href+':'+res.status());
   }
   assert(fs.readdirSync(output).filter(x=>x.endsWith('.png')).length===4,'D211_FOUR_MOBILE_SHOTS_REQUIRED');
   const severe=audit.reduce((sum,x)=>sum+x.serious,0);
   if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
     '### D211 rendered public docs site: 24/24 KA EN routes; local internal links '+localLinks.size+'; AXE critical 0; serious findings '+severe+' (not claimed zero); 4 static 375px mobile screenshots retained 1 day. No external requests or beta approval.\n');
   console.log('D211_RENDERED_24_LANG_ROUTES_AXE_0_CRITICAL_INTERNAL_LINKS='+localLinks.size+' MOBILE_4=PASS SERIOUS='+severe);
 }finally{await browser.close()}
}
if(process.argv.includes('--self-test'))selfTest();else await run();
