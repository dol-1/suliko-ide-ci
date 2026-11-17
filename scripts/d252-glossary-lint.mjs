// D252 static own-only bilingual source lint; no auto-translation, credentials or external fetch.
import fs from 'node:fs';
const allowed=p=>typeof p==='string'&&/^(plugins\/suliko-(?:hello|remote-panel)\/i18n\.ts|site\/docs\/[a-z0-9.-]+\.(?:en|ka)\.md)$/.test(p);
function getKey(src,key){
 if(!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key))throw Error('D252_BAD_KEY');
 const m=RegExp('(?:^|\\n)\\s*'+key+':\\s*"([^"\\n]+)"').exec(src);
 if(!m)throw Error('D252_MISSING_KEY:'+key);
 return m[1];
}
export function lint(g,read){
 if(g?.schema!=='suliko-d252-ka-en-glossary-v1'||!Array.isArray(g.entries)||g.entries.length<3||g.entries.length>100)throw Error('D252_BAD_GLOSSARY');
 const cache=new Map(),seen=new Set();
 const get=p=>{if(!allowed(p))throw Error('D252_BAD_PATH');if(!cache.has(p))cache.set(p,read(p));return cache.get(p)};
 for(const t of g.entries){
   if(!t.id||seen.has(t.id))throw Error('D252_DUPLICATE');seen.add(t.id);
   if(t.uiKey){
     const src=get(t.uiFile);
     const en=/export const EN = \{([\s\S]*?)\}\s+as const;/.exec(src)?.[1];
     const ka=/export const KA:[^{]+\{([\s\S]*?)\};/.exec(src)?.[1];
     if(!en||!ka)throw Error('D252_UI_FORMAT');
     if(getKey(en,t.uiKey)!==t.en||getKey(ka,t.uiKey)!==t.ka)throw Error('D252_UI_DRIFT:'+t.id);
   }
   if(t.docsEnPhrase&&!get(t.docsEn).includes(t.docsEnPhrase))throw Error('D252_EN_DOC_DRIFT:'+t.id);
   if(t.docsKaPhrase&&!get(t.docsKa).includes(t.docsKaPhrase))throw Error('D252_KA_DOC_DRIFT:'+t.id);
   if(t.forbiddenKa){
     if(!t.docsKa||!Array.isArray(t.forbiddenKa))throw Error('D252_BAD_ALIAS');
     for(const bad of t.forbiddenKa)if(get(t.docsKa).includes(bad))throw Error('D252_KA_VARIANT:'+t.id);
   }
 }
 return {entries:seen.size,files:cache.size};
}
if(process.argv[1]?.endsWith('d252-glossary-lint.mjs')){
 try{
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci')throw Error('D252_PUBLIC_GH_ONLY');
  const g=JSON.parse(fs.readFileSync('docs/terms/d252-ka-en-glossary.json','utf8'));
  const d=lint(g,f=>fs.readFileSync(f,'utf8'));
  console.log('D252_CANONICAL_EN_KA_TERMS='+d.entries+'_FILES='+d.files+'_PASS');
 }catch(e){console.error('D252_FAIL_CLOSED_'+(e?.message||'UNKNOWN'));process.exitCode=1}
}
