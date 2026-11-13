// D-089 independent pnpm v9 installed closure versus SPDX check.
// No names, raw errors or paths are printed on failure.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
function id(name,version) {
  if(typeof name!=="string"||typeof version!=="string")throw Error("Malformed identity");
  const v=version.split("(")[0];
  if(!/^(?:@[^/\s]+\/)?[^@\s/][^\s@]*$/.test(name)||!/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(v))throw Error("Malformed identity");
  return name+"@"+v;
}
export function lockIds(text){
  if(typeof text!=="string"||text.length>2000000||!/^lockfileVersion:\s*['"]9\.0['"]/m.test(text))throw Error("Lock format");
  const lines=text.replace(/\r\n/g,"\n").split("\n");
  const from=lines.indexOf("packages:"),to=lines.indexOf("snapshots:");
  if(from<0||to<=from)throw Error("Lock sections");
  const ids=new Set();
  for(const line of lines.slice(from+1,to)){
    if(!line.trim()||line.startsWith("    "))continue;
    const m=/^  (?:'([^']+)'|"([^"]+)"|([^:\s]+)):\s*$/.exec(line);
    if(!m)throw Error("Lock key");
    const key=m[1]??m[2]??m[3],split=key.lastIndexOf("@");
    if(split<=0)throw Error("Lock id");
    const name=id(key.slice(0,split),key.slice(split+1));
    if(ids.has(name))throw Error("Duplicate lock id");
    ids.add(name);
  }
  if(!ids.size)throw Error("Empty lock");
  return ids;
}
export function installedIds(tree){
  if(!Array.isArray(tree)||tree.length!==1||!tree[0]||typeof tree[0]!=="object")throw Error("Pnpm root");
  const all=new Set(),production=new Set();let count=0;
  function walk(node,prod,depth){
    if(++count>20000||depth>70)throw Error("Pnpm graph too large");
    for(const field of ["dependencies","optionalDependencies","devDependencies"]){
      const deps=node[field]??{};
      if(!deps||typeof deps!=="object"||Array.isArray(deps))throw Error("Pnpm graph");
      for(const [name,child] of Object.entries(deps)){
        if(!child||typeof child!=="object"||Array.isArray(child))throw Error("Pnpm node");
        const key=id(child.name??name,child.version);
        all.add(key);
        const childProd=prod&&field!=="devDependencies";
        if(childProd)production.add(key);
        walk(child,childProd,depth+1);
      }
    }
  }
  walk(tree[0],true,0);
  if(!all.size)throw Error("Empty installed closure");
  return {all,production};
}
export function spdxIds(doc){
  if(doc?.spdxVersion!=="SPDX-2.3"||!Array.isArray(doc.packages)||!doc.packages.length||!Array.isArray(doc.relationships))throw Error("Bad SPDX");
  const found=new Set();
  for(const pkg of doc.packages){
    if(typeof pkg?.name!=="string"||typeof pkg?.versionInfo!=="string")continue;
    let key;try{key=id(pkg.name,pkg.versionInfo)}catch{continue}
    if(found.has(key))throw Error("Ambiguous duplicate SPDX package");
    found.add(key);
  }
  if(!found.size)throw Error("Empty SPDX identities");
  return found;
}
export function audit(lock,list,spdx){
  const locked=lockIds(lock), installed=installedIds(list), found=spdxIds(spdx);
  const unlocked=[...installed.all].filter(x=>!locked.has(x));
  const missing=[...installed.all].filter(x=>!found.has(x));
  const result={locked:locked.size,installed:installed.all.size,production:installed.production.size,
    uninstalledLock:[...locked].filter(x=>!installed.all.has(x)).length,foundInSpdx:found.size,
    unlocked:unlocked.length,missingInSpdx:missing.length,
    note:"Linux installed closure only: optional non-Linux and bundled production completeness not certified"};
  if(unlocked.length||missing.length)throw Error("Missing coverage");
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==5)throw Error("Args");
    const [lock,list,spdx]=process.argv.slice(2).map(x=>fs.readFileSync(x,"utf8"));
    console.log("D089_COVERAGE",JSON.stringify(audit(lock,JSON.parse(list),JSON.parse(spdx))));
  }catch{console.error("D089 FAIL-CLOSED: lock/installed/SPDX identity mismatch; source details withheld");process.exitCode=1}
}
