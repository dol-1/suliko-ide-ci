// D230: deterministic, synthetic 3OS rehearsal metrics only. No participant telemetry.
import fs from 'node:fs';
import path from 'node:path';
const TAG='1c7470934ab694ce69ac92e70de300d6f6c50743';
const DIGEST='8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a';
const sha40=/^[a-f0-9]{40}$/, stages=['setup','hello','doctor','bundle','uninstall'];
const oses=new Set(['linux','macos','windows']);
function check(v,code){if(!v)throw Error('D230_'+code)}
export function createTiming(os,sourceHead,candidateSha,marks){
 check(oses.has(os)&&sha40.test(sourceHead)&&candidateSha===DIGEST,'SOURCE');
 check(marks&&typeof marks==='object','MARKS');
 let prev=0;const intervals={},ordered={};
 for(const stage of stages){
  const now=marks[stage];
  check(Number.isSafeInteger(now)&&now>=prev&&now<=1800000,'ORDER_'+stage);
  ordered[stage]=now;intervals[stage]=now-prev;prev=now;
 }
 return {schema:'suliko-d230-first15-v1',tagCommit:TAG,candidateSha,sourceHead,os,synthetic:true,participants:0,realRemote:false,bundleLeakFree:true,ordered,intervals,totalMs:prev,within15min:prev<=900000};
}
export function aggregate(rows,head){
 check(sha40.test(head)&&Array.isArray(rows)&&rows.length===3,'THREE_OS');
 const seen=new Set();
 for(const r of rows){
  check(r?.schema==='suliko-d230-first15-v1'&&oses.has(r.os)&&!seen.has(r.os),'DUPLICATE_OS');
  seen.add(r.os);check(r.sourceHead===head&&r.tagCommit===TAG&&r.candidateSha===DIGEST,'TAG_HEAD_DIGEST');
  check(r.synthetic===true&&r.participants===0&&r.realRemote===false&&r.bundleLeakFree===true,'NO_REAL_USERS');
  const expected=createTiming(r.os,head,DIGEST,r.ordered);
  check(JSON.stringify(expected.intervals)===JSON.stringify(r.intervals)&&expected.totalMs===r.totalMs&&expected.within15min===r.within15min,'TAMPERING');
 }
 const stats={};for(const stage of [...stages,'total']){
  const values=rows.map(r=>stage==='total'?r.totalMs:r.intervals[stage]).sort((a,b)=>a-b);
  stats[stage]={p50Ms:values[1],p90Ms:values[2],n:3};
 }
 return {schema:'suliko-d230-synthetic-aggregate-v1',tagCommit:TAG,candidateSha:DIGEST,sourceHead:head,synthetic:true,participants:0,realRemote:false,populationInference:false,allWithin15min:rows.every(x=>x.within15min),byOS:rows.map(x=>({os:x.os,ms:x.intervals,totalMs:x.totalMs,within15min:x.within15min})),stats};
}
function selfTest(){
 const sha='a'.repeat(40),m={setup:100,hello:200,doctor:260,bundle:280,uninstall:400};
 const rows=['linux','macos','windows'].map((os,i)=>createTiming(os,sha,DIGEST,Object.fromEntries(stages.map(k=>[k,m[k]+i*100]))));
 check(aggregate(rows,sha).stats.total.p90Ms===600,'P90');
 const invalid=[[rows[0],rows[1],rows[1]],[rows[0],rows[1]],[{...rows[0],sourceHead:'b'.repeat(40)},rows[1],rows[2]],[{...rows[0],participants:1},rows[1],rows[2]],[{...rows[0],ordered:{...rows[0].ordered,doctor:150}},rows[1],rows[2]]];
 for(const b of invalid){let denied=false;try{aggregate(b,sha)}catch{denied=true}check(denied,'NEGATIVE_BYPASS')}
 console.log('D230_SHA_TAG_THREE_OS_ORDERED_PERCENTILES_NEGATIVES=PASS');
}
function main(){
 check(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','PUBLIC_ONLY');
 const dir=process.argv[3];check(dir&&path.isAbsolute(dir),'PATH');
 const names=fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort();check(names.length===3,'FILES');
 const rows=names.map(n=>{
  check(/^d230-first15-(linux|macos|windows)\.json$/.test(n),'NAME');
  const file=path.join(dir,n),s=fs.lstatSync(file);
  check(s.isFile()&&!s.isSymbolicLink()&&s.size>200&&s.size<3000,'BOUNDED');
  const raw=fs.readFileSync(file,'utf8');check(!/(?:sk-[a-z0-9_-]{16,}|gh[pso]_[a-z0-9_-]{16,}|Bearer\s+\S+)/i.test(raw),'SECRET');
  const r=JSON.parse(raw);check(n==='d230-first15-'+r.os+'.json','FILE_OS');return r;
 });
 const result=aggregate(rows,process.env.GITHUB_SHA);
 fs.mkdirSync('out/d230',{recursive:true});
 fs.writeFileSync('out/d230/rehearsal.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
 let md='# D230 THREE-OS SYNTHETIC REHEARSAL — NOT PARTICIPANTS\n\n';
 md+='Pinned immutable rc.1 tag '+TAG+' and reviewed SHA256 '+DIGEST+'. No real Remote, user, consent or beta authorization. Percentiles describe exactly 3 OS samples, not a population.\n\n';
 md+='| Stage | p50 seconds | p90 seconds |\n| --- | ---: | ---: |\n';
 for(const [k,v] of Object.entries(result.stats))md+='| '+k+' | '+(v.p50Ms/1000).toFixed(1)+' | '+(v.p90Ms/1000).toFixed(1)+' |\n';
 md+='\nAll 3 OS within 15 minutes: '+result.allWithin15min+' (any slower timing is reported honestly).\n';
 fs.writeFileSync('out/d230/rehearsal.md',md,{mode:0o600});
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
 console.log('D230_SYNTHETIC_3OS_REHEARSAL=PASS within15='+result.allWithin15min);
}
if(path.basename(process.argv[1]||'')==='d230-first15-metrics.mjs'){
 if(process.argv[2]==='--self-test')selfTest();
 else if(process.argv[2]==='--aggregate')main();
 else throw Error('D230_UNKNOWN_MODE');
}
