// D-089: independently reconcile production installed closure against D-043
// pnpm license inventory, reporting counts only. Not legal clearance.
import fs from "node:fs";
import {pathToFileURL} from "node:url";
import {installedIds} from "./d089-lock-spdx.mjs";

export function auditProductionLicenses(pnpmTree, licenseRaw) {
  const installed=installedIds(pnpmTree).production;
  const grouped=typeof licenseRaw==="string"?
    (licenseRaw.trim()==="No licenses in packages found" ? {} : JSON.parse(licenseRaw)) :
    licenseRaw;
  if(!grouped||typeof grouped!=="object"||Array.isArray(grouped))throw Error("Invalid pnpm license groups");
  const records=new Set();
  let unknown=0,copyleft=0,ambiguous=0;
  for(const [lic,packages] of Object.entries(grouped)){
    if(!Array.isArray(packages)||typeof lic!=="string"||lic.length>180)throw Error("Invalid license group");
    const risky=/(?:^|[^A-Za-z])(?:AGPL|GPL)(?:[- .\d(]|$)/i.test(lic);
    const unclear=!lic.trim()||/unknown|undefined|unlicensed|noassertion|see license|licenseref/i.test(lic);
    for(const item of packages){
      if(!item||typeof item.name!=="string"||!Array.isArray(item.versions)||!item.versions.length)throw Error("Invalid license package");
      for(const version of item.versions){
        if(typeof version!=="string"||!/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(version))throw Error("Invalid license version");
        const key=item.name+"@"+version;
        if(records.has(key))ambiguous++;
        records.add(key);
        if(risky)copyleft++;
        if(unclear)unknown++;
      }
    }
  }
  const expectedMissing=[...installed].filter(x=>!records.has(x));
  const unexpected=[...records].filter(x=>!installed.has(x));
  const summary={productionInstalled:installed.size,licensesFound:records.size,
    productionMissingLicense:expectedMissing.length,licenseNotInProduction:unexpected.length,
    ambiguousLicenseEntries:ambiguous,unknownOrUnclearLicenses:unknown,gplAgplLicenses:copyleft,
    note:"D043-compatible declared production closure only; license legal review and bundled JS content not certified"};
  if(expectedMissing.length||unexpected.length||ambiguous||unknown||copyleft)
    throw Error("Production license coverage/review failed closed");
  return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==4)throw Error("Args");
    const graph=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
    const license=fs.readFileSync(process.argv[3],"utf8");
    console.log("D089_LICENSE",JSON.stringify(auditProductionLicenses(graph,license)));
  }catch{console.error("D089 FAIL-CLOSED: installed production vs D043 license inventory differs; details withheld");process.exitCode=1}
}
