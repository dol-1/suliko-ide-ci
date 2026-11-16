// D227: own-plugin KA/EN source-only complete key inventory, no private BB source.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const plugins=[['hello','plugins/suliko-hello/i18n.ts'],['remote-mock','plugins/suliko-remote-panel/i18n.ts']];
function extract(source,label){
 assert(source.length>60&&source.length<50000,'D227_BAD_SOURCE_SIZE');
 const match=new RegExp('^export const '+label+'[^\\n]*=\\s*\\{','m').exec(source);
 assert(match,'D227_MISSING_LOCALE_'+label);
 const body=source.slice(match.index+match[0].length);
 const end=body.search(/^\s*}\s*(?:as const)?;\s*$/m);
 assert(end>=0,'D227_UNCLOSED_LOCALE_'+label);
 const entries=new Map();
 for(const line of body.slice(0,end).split(/\r?\n/)){
   if(!line.trim()||/^\s*\/\//.test(line))continue;
   const item=/^\s*([A-Za-z][A-Za-z0-9]*):\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/.exec(line);
   assert(item,'D227_UNSUPPORTED_LOCALE_SYNTAX_'+label);
   assert(!entries.has(item[1]),'D227_DUPLICATE_KEY_'+item[1]);
   const text=JSON.parse('"'+item[2]+'"');
   assert(typeof text==='string'&&text.trim()!==''&&!text.includes('\uFFFD'),'D227_EMPTY_OR_INVALID_'+item[1]);
   entries.set(item[1],text);
 }
 return entries;
}
function compare(en,ka){
 assert(en.size>=10&&ka.size>=10,'D227_TOO_FEW_KEYS');
 assert([...en.keys()].sort().join(',')===[...ka.keys()].sort().join(','),'D227_MISSING_OR_EXTRA_TRANSLATION_KEY');
 assert([...ka.values()].some(x=>/[\u10D0-\u10FF]/u.test(x)),'D227_NO_GEORGIAN_COPY');
 return [...en.keys()].sort();
}
function selfTest(){
 const sample='export const EN = {\n  alpha: "A",\n  beta: "B",\n  gamma: "C",\n  delta: "D",\n  epsilon: "E",\n  zeta: "F",\n  eta: "G",\n  theta: "H",\n  iota: "I",\n  kappa: "J",\n} as const;\nexport const KA: Record<string,string> = {\n  alpha: "ქართული",\n  beta: "ბ",\n  gamma: "გ",\n  delta: "დ",\n  epsilon: "ე",\n  zeta: "ზ",\n  eta: "თ",\n  theta: "ი",\n  iota: "კ",\n  kappa: "ლ",\n};\n';
 const en=extract(sample,'EN'),ka=extract(sample,'KA');
 assert.equal(compare(en,ka).length,10);
 assert.throws(()=>compare(en,new Map([...ka].slice(1))),/D227_(TOO_FEW|MISSING_OR_EXTRA)/);
 assert.throws(()=>extract(sample.replace('alpha: "ქართული"','alpha: "   "'),'KA'),/D227_EMPTY/);
 assert.throws(()=>extract(sample.replace('beta: "B",','beta: "B",\n  beta: "repeat",'),'EN'),/D227_DUPLICATE/);
 console.log('D227_KA_EN_INVENTORY_MISSING_EMPTY_DUPLICATE_NEGATIVES=PASS');
}
function main(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D227_PUBLIC_ONLY');
 const summary=[];
 for(const [id,file] of plugins){
   const raw=fs.readFileSync(file,'utf8');
   const en=extract(raw,'EN'),ka=extract(raw,'KA');
   const keys=compare(en,ka);
   summary.push({plugin:id,english_key_count:en.size,georgian_key_count:ka.size,keys,missing:0,empty:0});
 }
 fs.mkdirSync('out/d227',{recursive:true});
 fs.writeFileSync('out/d227/translation-keys.json',JSON.stringify({schema:'suliko-d227-i18n-v1',summary,scope:'own-plugins-only'},null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'D227 all own-plugin EN/KA keys present: '+summary.map(x=>x.plugin+' '+x.keys.length).join(', ')+'. No UI screenshot claim from this job.\n');
 console.log('D227_TRANSLATION_KEYS_COMPLETE='+summary.reduce((a,x)=>a+x.keys.length,0));
}
if(process.argv.includes('--self-test'))selfTest();else main();
