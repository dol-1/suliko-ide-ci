// D065: deterministic source-only beta preview, NO release, no tag, no uploaded artifacts.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
const ROOTS=["plugins/suliko-hello","plugins/suliko-remote-panel"];
const CATALOG="marketplace/marketplace.json";
function sha(data){return createHash("sha256").update(data).digest("hex");}
function collect(root,where,items) {
  const actual=join(root,where),stat=lstatSync(actual);
  if(stat.isSymbolicLink()||(!stat.isDirectory()&&!stat.isFile()))throw Error("Reject unsafe preview tree entry");
  if(stat.isDirectory()){
    for(const name of readdirSync(actual).sort()) {
      if(name==="node_modules"||name==="dist"||name===".git")continue;
      if(!/^[a-zA-Z0-9._-]+$/.test(name))throw Error("Invalid source filename");
      collect(root,where+"/"+name,items);
    }
  } else {
    const bytes=readFileSync(actual);
    items.push({path:where.replaceAll(sep,"/"),sha256:sha(bytes),bytes:bytes.length});
  }
}
export function previewManifest(root) {
  const abs=resolve(root);
  // Validate both directory and leaf before parsing. Otherwise JSON errors
  // from a symlinked catalog can echo private external file snippets.
  const catalogParent=join(abs,"marketplace"),catalogFile=join(abs,CATALOG);
  const parentStat=lstatSync(catalogParent),leafStat=lstatSync(catalogFile);
  if(parentStat.isSymbolicLink()||!parentStat.isDirectory()||
     leafStat.isSymbolicLink()||!leafStat.isFile())
    throw Error("Reject unsafe preview marketplace catalog path");
  const catalog=JSON.parse(readFileSync(catalogFile,"utf8"));
  if(catalog.schemaVersion!==1||catalog.name!=="suliko-experimental"||
      catalog.plugins?.length!==1||catalog.plugins[0]?.id!=="suliko-hello")throw Error("Unreviewed marketplace catalog");
  if(catalog.plugins[0].source?.git?.url!=="https://github.com/dol-1/suliko-ide-ci.git")throw Error("Unreviewed marketplace origin");
  const files=[];
  for(const item of ROOTS)collect(abs,item,files);
  collect(abs,CATALOG,files);
  files.sort((a,b)=>a.path.localeCompare(b.path,"en"));
  const pluginVersions=ROOTS.map(p=>{
    const pkg=JSON.parse(readFileSync(join(abs,p,"package.json"),"utf8"));
    if(pkg.engines?.bb!==">=0.49.0 <0.49.1"||pkg.devDependencies?.["@get-bb/plugin-sdk"]!=="0.6.132")throw Error("Unreviewed BB or SDK plugin pin");
    return{path:p,name:pkg.name,version:pkg.version,bb:pkg.engines.bb,sdk:pkg.engines.bbPluginSdk};
  });
  const info={schema:1,channel:"beta-preview-only",status:"not-released",is_public_beta:false,source_only:true,complete_sbom:false,attested:false,manifest_source:CATALOG,plugins:pluginVersions,files};
  return{...info,manifest_sha256:sha(Buffer.from(JSON.stringify(info)))};
}
// Exact destination rather than unsafe string-prefix acceptance (../ and sibling dirs).
export function safePreviewOutput(dest,runnerTemp) {
  if(!runnerTemp||!dest||resolve(dest)!==join(resolve(runnerTemp),"d065-preview.json"))
    throw Error("Preview output must use the exact runner-private preview filename");
  return resolve(dest);
}
async function main() {
  const dest=safePreviewOutput(process.argv[2],process.env.RUNNER_TEMP);
  const result=previewManifest(process.cwd());
  writeFileSync(dest,JSON.stringify(result,null,2)+"\n",{flag:"wx",mode:0o600});
  console.log("D065 PREVIEW ONLY, source files="+result.files.length+" SHA256="+result.manifest_sha256+"; no bundle/attestation/SBOM/release");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e=>{console.error("D065 failed closed: "+e.message);process.exitCode=1;});
