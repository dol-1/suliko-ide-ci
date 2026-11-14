// E1 macOS arm64 / Windows x64 official BB asset staging PREVIEW.
// A .dmg or .exe is NEVER executed, installed, mounted or uploaded.
import { createHash,randomUUID } from "node:crypto";
import { createReadStream,copyFileSync,existsSync,linkSync,lstatSync,mkdirSync,unlinkSync,readFileSync,writeFileSync,constants } from "node:fs";
import { homedir } from "node:os";
import { dirname,isAbsolute,join,resolve } from "node:path";
import { pathToFileURL } from "node:url";
const assets={
  "darwin-arm64":["bb-0.49.0-arm64.dmg","5bebb0b635c1c8b14e549fe3799152d8a6375bb2e8259be328897e1906f63e17"],
  "win32-x64":["bb-0.49.0-x64.exe","201b38136c30f37d17ee5fea88c7a91dde64e00ca4e583dfd5b3650e65c6aa2f"],
};
function stat(path) {
  try{return lstatSync(path);}
  catch(e){if(e.code==="ENOENT")return null;throw Error("Unreadable managed path");}
}
function dirs(paths,create=false) {
  for(let i=0;i<paths.length;i++){
    let s=stat(paths[i]);
    if(!s&&create&&i>0){mkdirSync(paths[i],{mode:0o700});s=stat(paths[i]);}
    if(s&&(s.isSymbolicLink()||!s.isDirectory()))throw Error("Refusing redirected parent directory");
    if(!s&&create)throw Error("Missing user root directory");
  }
}
function file(path) {
  const s=stat(path);
  if(s&&(s.isSymbolicLink()||!s.isFile()))throw Error("Refusing linked or non-file asset");
  return !!s;
}
async function hash(path) {
  const h=createHash("sha256");
  for await(const b of createReadStream(path))h.update(b);
  return h.digest("hex");
}
export function paths(platform=process.platform,arch=process.arch,env=process.env) {
  const pair=assets[platform+"-"+arch];
  if(!pair)throw Error("Preview supports only macOS arm64 and Windows x64");
  const root=platform==="darwin"?(env.HOME||homedir()):env.LOCALAPPDATA;
  if(!root||!isAbsolute(root)||resolve(root)===resolve("/"))throw Error("Missing absolute user-root");
  const cache=platform==="darwin"
    ?[root,join(root,".cache"),join(root,".cache","suliko-ide")]
    :[root,join(root,"SulikoIDE"),join(root,"SulikoIDE","Cache")];
  const stage=platform==="darwin"
    ?[root,join(root,"Library"),join(root,"Library","Application Support"),join(root,"Library","Application Support","SulikoIDE"),join(root,"Library","Application Support","SulikoIDE","Stage")]
    :[root,join(root,"SulikoIDE"),join(root,"SulikoIDE","Stage")];
  const cacheMarker=join(cache.at(-1),".suliko-managed-"+pair[0]+".sha256");
  const cacheMarkerRecord="SULIKO-IDE-VERIFIED-v1 "+pair[0]+" "+pair[1];
  const marker=join(stage.at(-1),".suliko-owned-stage-"+pair[0]+".sha256");
  const markerRecord="SULIKO-IDE-PORTABLE-STAGE-v1 "+pair[0]+" "+pair[1];
  return {asset:pair[0],sha:pair[1],cache,stage,source:join(cache.at(-1),pair[0]),dest:join(stage.at(-1),pair[0]),cacheMarker,cacheMarkerRecord,marker,markerRecord};
}
// The SHA-256 pin proves bytes only, NOT file ownership. A foreign user's
// identical official asset must never be deleted or implicitly adopted.
function markerMatches(path,expected) {
  const s=stat(path);
  if(!s)return false;
  if(s.isSymbolicLink()||!s.isFile()||s.size>256)
    throw Error("Refusing nonregular or oversized ownership marker");
  // Linux/macOS shell and Windows PowerShell StreamWriter emit one line.
  const record=readFileSync(path,"utf8");
  return record===expected+"\n"||record===expected+"\r\n";
}
export async function preview(mode,p=paths()) {
  if(!["--stage","--remove-stage"].includes(mode))throw Error("Preview mode required");
  dirs(p.cache);dirs(p.stage);
  const exists=file(p.dest);
  const markerExists=!!stat(p.marker);
  // Never assume ownership based solely on the official binary's identical digest.
  const owned=markerExists&&markerMatches(p.marker,p.markerRecord);
  if(mode==="--remove-stage"){
    if(exists||markerExists){
      if(!exists||!owned||await hash(p.dest)!==p.sha)
        throw Error("Refusing unowned or modified stage; manual review required");
      unlinkSync(p.dest);
      unlinkSync(p.marker);
    }
    return "removed";
  }
  // A same-digest cache file is not proof that the preflight created it.
  // Cache cleanup remains the separate preflight's responsibility.
  if(!markerMatches(p.cacheMarker,p.cacheMarkerRecord))
    throw Error("Refusing unowned official cache");
  if(!file(p.source)||await hash(p.source)!==p.sha)throw Error("Missing/mismatched official cache");
  if(exists||markerExists){
    if(!exists||!owned||await hash(p.dest)!==p.sha)
      throw Error("Refusing occupied or ambiguous stage");
    return "already-verified";
  }
  dirs(p.stage,true);
  const temp=join(dirname(p.dest),".stage-"+randomUUID());
  try{
    copyFileSync(p.source,temp,constants.COPYFILE_EXCL);
    if(await hash(temp)!==p.sha)throw Error("Copied asset digest mismatch");
    // Hard-link is an atomic no-clobber create, including on NTFS.
    linkSync(temp,p.dest);
    // Exclusive marker creation; failure leaves an UNOWNED orphan and never
    // grants an implicit right to delete. Manual review is safer than adoption.
    writeFileSync(p.marker,p.markerRecord+"\n",{flag:"wx",mode:0o600});
  }finally{if(existsSync(temp))unlinkSync(temp);}
  return "verified-staged";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3){console.error("E1 preview requires exactly one mode");process.exitCode=2;}
  else preview(process.argv[2]).then(x=>console.log("E1 PREVIEW "+x+"; no installer execution, profile, plugin or BB data operation")).catch(()=>{
    console.error("E1 stage preview refused or failed; no raw paths disclosed");
    process.exitCode=1;
  });
}
