// D253: read-only npm registry trend and pnpm security audit summary, no dependency changes.
import fs from 'node:fs';
const severities=['critical','high','moderate','low','info'];
export function auditSummary(data){
 if(!data||typeof data!=='object'||data.error)throw Error('D253_AUDIT_UNAVAILABLE');
 let counts={critical:0,high:0,moderate:0,low:0,info:0};
 if(data.metadata?.vulnerabilities && typeof data.metadata.vulnerabilities==='object'){
   for(const key of severities){
     const n=Number(data.metadata.vulnerabilities[key]??0);
     if(!Number.isSafeInteger(n)||n<0||n>100000)throw Error('D253_AUDIT_COUNT_INVALID');
     counts[key]=n;
   }
 }else {
   const collection=data.advisories??data.vulnerabilities;
   if(!collection||typeof collection!=='object')throw Error('D253_AUDIT_SCHEMA');
   for(const row of Object.values(collection)){
     const type=String(row?.severity??'').toLowerCase();
     if(!severities.includes(type))throw Error('D253_UNKNOWN_SEVERITY');
     counts[type]++;
   }
 }
 return counts;
}
export function outdatedSummary(data){
 if(!data||typeof data!=='object')throw Error('D253_OUTDATED_UNAVAILABLE');
 if(data.error)throw Error('D253_OUTDATED_REGISTRY_ERROR');
 const entries=Array.isArray(data)?data:Object.entries(data).map(([name,v])=>({...v,name}));
 const rows=[];
 if(entries.length>1000)throw Error('D253_OUTDATED_TOO_MANY');
 for(const row of entries){
  const name=row?.name,current=row?.current,latest=row?.latest;
  if(typeof name!=='string'||!/^(?:@[\w.-]+\/)?[\w.-]+$/.test(name)||name.length>160||
     typeof current!=='string'||typeof latest!=='string'||current.length>100||latest.length>100)
    throw Error('D253_OUTDATED_SCHEMA_KEYS_'+Object.keys(row??{}).filter(k=>/^[a-zA-Z]{1,30}$/.test(k)).slice(0,12).join('_')+'_TYPES_'+typeof current+'_'+typeof latest);
  rows.push({name,current,latest,wanted:typeof row.wanted==='string'?row.wanted:'unknown'});
 }
 return rows.sort((a,b)=>a.name.localeCompare(b.name));
}
export function summary(inputs){
 if(!Array.isArray(inputs)||inputs.length!==2)throw Error('D253_SCOPE_TWO_OWN_PLUGINS');
 const reports=inputs.map(x=>({
   plugin:x.plugin,
   audit:auditSummary(x.audit),
   outdated:outdatedSummary(x.outdated),
   auditStatus:'LIVE_REGISTRY_AS_OF_WORKFLOW_ONLY_NOT_SECURITY_CLEARANCE'
 }));
 if(reports.some(r=>!['suliko-hello','suliko-remote-panel'].includes(r.plugin)))throw Error('D253_UNREVIEWED_PLUGIN');
 return {schema:'suliko-d253-weekly-npm-risk-v1',reports,scope:'LOCKED_PNPM_READONLY_NO_BUMP',
   warning:'The registry can change after this run. An empty count is not SEC04 approval.'};
}
export function markdown(result){
 const lines=['# D253 weekly pinned npm advisories and outdated dependencies (read-only)',
  'Source is actual pnpm audit/outdated JSON from immutable current source, no auto-upgrade.',
  '| Own plugin | Critical | High | Moderate | Low | Outdated direct/known packages |',
  '| --- | ---: | ---: | ---: | ---: | ---: |'];
 for(const p of result.reports){
   lines.push('| '+p.plugin+' | '+p.audit.critical+' | '+p.audit.high+' | '+p.audit.moderate+' | '+p.audit.low+' | '+p.outdated.length+' |');
   for(const x of p.outdated)lines.push('- '+p.plugin+' / '+x.name+': installed '+x.current+', latest '+x.latest+' (wanted '+x.wanted+'). Bump requires separate MR and exact-source plugin CI.');
 }
 lines.push('Security interpretation: no unauthorized version bump. HIGH/CRITICAL findings require a separate category-specific review issue and source applicability, no automatic beta GO. Audit categories are time-bound registry output, not all security sources.');
 return lines.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('d253-npm-weekly-report.mjs')){
 try{
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci')throw Error('D253_PUBLIC_CI_ONLY');
  const root=process.env.RUNNER_TEMP;
  if(typeof root!=='string'||root.length<5)throw Error('D253_NO_EPHEMERAL_ROOT');
  const paths=[['suliko-hello','hello'],['suliko-remote-panel','remote']].map(([plugin,id])=>({
    plugin,
    audit:JSON.parse(fs.readFileSync(root+'/d253/'+id+'.audit.json','utf8')),
    outdated:JSON.parse(fs.readFileSync(root+'/d253/'+id+'.outdated.json','utf8'))
  }));
  const report=summary(paths);
  fs.writeFileSync(root+'/d253/d253-summary.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  const lines=markdown(report);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines);
  console.log('D253_OWN_PLUGIN_WEEKLY_SOURCE_REPORT=COMPLETE; no automatic bump or SEC04 claim');
 }catch(e){console.error('D253_FAIL_CLOSED_'+(e?.message??'UNEXPECTED'));process.exitCode=1}
}
