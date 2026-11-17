// D251 source-only BOM delta. Never invent a vulnerability result from an inventory.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const safe=s=>typeof s==='string'&&s.length>0&&s.length<=400&& !/[\x00-\x1f]/.test(s);
export function componentId(c) {
  assert(c&&safe(c.name),'D251_COMPONENT_NAME_INVALID');
  if(safe(c.purl)&&c.purl.startsWith('pkg:')) {
    const clean=c.purl.split('?')[0].split('#')[0];
    const at=clean.lastIndexOf('@'),slash=clean.lastIndexOf('/');
    const stem=at>slash?clean.slice(0,at):clean;
    if(safe(stem))return stem;
  }
  return [safe(c.group)?c.group:'',c.name].filter(Boolean).join('/');
}
export function licenses(c){
  const list=Array.isArray(c.licenses)?c.licenses:[];
  const found=[];
  for(const item of list) {
    const expression=item?.expression??item?.license?.id??item?.license?.name;
    if(safe(expression))found.push(expression);
  }
  return [...new Set(found)].sort();
}
export function inventory(bom){
  if(!/^1\.(?:4|5|6|7)$/.test(String(bom?.specVersion))||bom?.bomFormat!=='CycloneDX'||
     !Array.isArray(bom.components)||bom.components.length>20000)throw Error('D251_BAD_CYCLONEDX_FORMAT_'+String(bom?.bomFormat).slice(0,16)+'_SPEC_'+String(bom?.specVersion).slice(0,8)+'_COUNT_'+(Array.isArray(bom?.components)?bom.components.length:'missing'));
  const groups=new Map();
  for(const c of bom.components){
    const id=componentId(c),version=safe(c.version)?c.version:'UNKNOWN';
    const key=id+'@'+version,entry=groups.get(id)??new Map();
    if(entry.has(key) && JSON.stringify(entry.get(key))!==JSON.stringify(licenses(c)))
      throw Error('D251_DUPLICATE_CONFLICTING_LICENSE:'+id);
    entry.set(key,licenses(c));
    groups.set(id,entry);
  }
  return groups;
}
function sorted(m){return [...m.keys()].sort()}
function versions(entries){return [...entries.keys()].map(key=>key.slice(key.lastIndexOf('@')+1)).sort()}
export function compare(oldBom,newBom,{oldRef,newRef}={}){
  if(!/^[a-f0-9]{40}$/.test(oldRef??'')||!/^[a-f0-9]{40}$/.test(newRef??'')||oldRef===newRef)
     throw Error('D251_IMMUTABLE_SOURCE_REFS_REQUIRED');
  const a=inventory(oldBom),b=inventory(newBom);
  const added=[],removed=[],updated=[],licenseChanges=[];
  for(const id of [...new Set([...a.keys(),...b.keys()])].sort()){
    const x=a.get(id),y=b.get(id);
    if(!x)added.push({id,versions:versions(y)});
    else if(!y)removed.push({id,versions:versions(x)});
    else {
      const before=versions(x),after=versions(y);
      if(JSON.stringify(before)!==JSON.stringify(after))updated.push({id,before,after});
      for(const key of sorted(x)){
        if(!y.has(key))continue;
        const oldLic=x.get(key),newLic=y.get(key);
        if(JSON.stringify(oldLic)!==JSON.stringify(newLic))
          licenseChanges.push({id,version:key.slice(key.lastIndexOf('@')+1),before:oldLic,after:newLic});
      }
    }
  }
  return {schema:'suliko-d251-bom-delta-v1',oldRef,newRef,oldComponents:oldBom.components.length,
    newComponents:newBom.components.length,added,removed,updated,licenseChanges,
    advisoryEvidence:'NOT_ASSESSED_BY_CYCLONEDX_INVENTORY',
    securityConclusion:'NO_VULNERABILITY_CLEARANCE_OR_RELEASE_GO'};
}
export function render(report){
  const lines=['# D251 immutable rc.1 → main CycloneDX dependency inventory delta',
    'Source refs: '+report.oldRef+' → '+report.newRef,
    'Scanned component occurrences: '+report.oldComponents+' → '+report.newComponents,
    '| Category | Count |','| --- | ---: |',
    '| Added package identities | '+report.added.length+' |',
    '| Removed package identities | '+report.removed.length+' |',
    '| Version-set changes | '+report.updated.length+' |',
    '| License-expression changes on identical versions | '+report.licenseChanges.length+' |',
    '','Advisories: '+report.advisoryEvidence+'. SBOM alone cannot identify new advisories, so **no security clean claim**.',
    'Package identities use purl without version, and compare all observed version sets. SPDX unknown license is not MIT or clean. No auto-bump or beta authorization.'];
  for(const [group,items] of [['Added',report.added],['Removed',report.removed],['Version changes',report.updated],['License changes',report.licenseChanges]]){
    lines.push('', '## '+group);
    if(!items.length)lines.push('No differences detected in these specific generated BOM inventories.');
    for(const item of items.slice(0,200))lines.push('- '+JSON.stringify(item));
    if(items.length>200)lines.push('REVIEW REQUIRED: output truncated, use retained JSON report.');
  }
  return lines.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('d251-cyclonedx-delta.mjs')){
  try {
    const [oldFile,newFile,oldRef,newRef,out]=process.argv.slice(2);
    if(!oldFile||!newFile||!out||!fs.existsSync(oldFile)||!fs.existsSync(newFile))throw Error('D251_INPUT_FILES_REQUIRED');
    const report=compare(JSON.parse(fs.readFileSync(oldFile,'utf8')),JSON.parse(fs.readFileSync(newFile,'utf8')),{oldRef,newRef});
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    process.stdout.write(render(report));
  }catch(e){console.error('D251_FAIL_CLOSED_'+(e?.message||'UNKNOWN'));process.exitCode=1}
}
