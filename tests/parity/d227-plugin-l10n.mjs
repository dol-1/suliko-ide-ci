import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),plugins=['suliko-hello','suliko-remote-panel'];
function entries(source,locale){
 const match=new RegExp('export const '+locale+'(?:\\s*:[^\\n=]+)?\\s*=\\s*\\{').exec(source);
 assert(match,'D227_MISSING_OBJECT_'+locale);
 const start=match.index+match[0].length,end=source.indexOf(locale==='EN'?'\n} as const;':'\n};',start);
 assert(end>start,'D227_UNCLOSED_'+locale);
 const map=new Map();
 for(const line of source.slice(start,end).split(/\r?\n/)){
  if(!line.trim())continue;
  const m=/^\s{2}([A-Za-z]\w*):\s*("(?:[^"\\]|\\.)*"),?\s*$/.exec(line);
  assert(m,'D227_UNPARSED_'+locale);
  assert(!map.has(m[1]),'D227_DUPLICATE_'+m[1]);
  const v=JSON.parse(m[2]);assert(v.trim().length>0,'D227_EMPTY_'+m[1]);map.set(m[1],v);
 }
 assert(map.size>0,'D227_EMPTY_DICTIONARY');return map;
}
function inventory(source,plugin){
 const en=entries(source,'EN'),ka=entries(source,'KA');
 assert.deepEqual([...en.keys()].sort(),[...ka.keys()].sort(),'D227_MISSING_KEY_'+plugin);
 return {plugin,count:en.size,en:Object.fromEntries(en),ka:Object.fromEntries(ka)};
}
function fromFile(plugin){return inventory(fs.readFileSync(path.join(root,'plugins',plugin,'i18n.ts'),'utf8'),plugin)}
function test(){
 const name='suliko-hello',src=fs.readFileSync(path.join(root,'plugins',name,'i18n.ts'),'utf8');
 const removed=src.replace('  panelLabel: "სულიკო ჰელოს პანელი",\n','');
 assert.notEqual(removed,src);assert.throws(()=>inventory(removed,name),/D227_MISSING_KEY/);
 const blank=src.replace('panelLabel: "სულიკო ჰელოს პანელი"','panelLabel: ""');
 assert.notEqual(blank,src);assert.throws(()=>inventory(blank,name),/D227_EMPTY_/);
 const duplicate=src.replace('panelLabel: "სულიკო ჰელოს პანელი"','panelLabel: "ერთ-ერთი",\n  panelLabel: "მეორე"');
 assert.notEqual(duplicate,src);assert.throws(()=>inventory(duplicate,name),/D227_DUPLICATE_/);
 for(const n of plugins){const v=fromFile(n);assert(v.count>=12,'D227_TOO_FEW_KEYS');console.log('D227_KA_EN_PARITY_'+n+'='+v.count+'/'+v.count);}
 console.log('D227_MISSING_EMPTY_DUPLICATE_NEGATIVES=PASS');
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function html(v,mode){
 const cells=Object.entries(v.ka).map(([k,t])=>'<li data-check><b>'+esc(k)+'</b> — '+esc(t)+'</li>').join('');
 return '<!doctype html><html lang="ka"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;max-width:100%}body{font:15px/1.5 system-ui,sans-serif;background:#eef3f9;color:#1b2939}.app{max-width:1180px;margin:auto;padding:12px;min-width:0}header,main{background:#fff;padding:15px;border:1px solid #dde6f2;border-radius:10px;margin-bottom:12px;min-width:0}h1{font-size:22px;margin:0 0 12px}p{margin:0 0 12px}ul{padding-left:22px;margin:0}li{padding:6px 0;border-bottom:1px solid #ddd}li,h1,p{overflow-wrap:anywhere;max-width:100%}b{font-size:13px}</style></head><body><div class="app"><header><h1 data-check>'+esc(v.plugin+' '+mode+' ქართული')+'</h1><p data-check>SYNTHETIC STRING MOCK — not a real BB/Remote host or participant screen.</p></header><main><p data-check>ყველა KA/EN თარგმანის გასწორება</p><ul>'+cells+'</ul></main></div></body></html>';
}
async function render(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D227_PUBLIC_CI_ONLY');
 const dir=path.resolve(process.env.D227_OUTPUT_DIR||'/invalid'),temp=path.resolve(process.env.RUNNER_TEMP||'/bad');
 assert(dir.startsWith(temp+path.sep),'D227_RUNNER_TEMP_ONLY');
 fs.mkdirSync(dir,{recursive:true});
 const {chromium}=await import('@playwright/test'),browser=await chromium.launch({headless:true});const evidence=[];
 try{
  for(const n of plugins)for(const mode of ['web-mock','desktop-mock'])for(const width of [375,1280]){
   const context=await browser.newContext({viewport:{width,height:812},locale:'ka-GE'});
   try{
    await context.route('**/*',route=>route.abort());
    const page=await context.newPage(),v=fromFile(n);await page.setContent(html(v,mode));
    const check=await page.evaluate(()=>({h:document.documentElement.scrollWidth-innerWidth,bad:[...document.querySelectorAll('[data-check]')].filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).length,n:document.querySelectorAll('[data-check]').length}));
    assert(check.n===v.count+3&&check.h<=1&&check.bad===0,'D227_KA_TEXT_CLIPPED_'+n+'_'+mode+'_'+width);
    const file='d227-'+n+'-'+mode+'-'+width+'.png';await page.screenshot({path:path.join(dir,file),fullPage:true,animations:'disabled'});
    assert(fs.statSync(path.join(dir,file)).size>1500,'D227_EMPTY_SCREENSHOT');
    evidence.push({plugin:n,mode,width,keys:v.count,clipped:0,file});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 assert(evidence.length===8,'D227_EIGHT_PREVIEWS_REQUIRED');
 fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({synthetic:true,actualBBHost:false,proof:evidence},null,2)+'\n',{mode:0o600});
 console.log('D227_EIGHT_OFFLINE_MOCK_CLIPPING_SCREENSHOTS_PASS');
}
if(process.argv.includes('--self-test'))test();else await render();
