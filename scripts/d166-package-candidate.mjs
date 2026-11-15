// D166: prepare immutable, reproducible, reviewer-only Hello RC candidate.
// CI-only source packaging: no remote access, credentials, BB upstream edits or release.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
const [root,stage]=process.argv.slice(2);
if(process.env.GITHUB_ACTIONS!=="true"||process.env.CI!=="true"||
 process.env.GITHUB_REPOSITORY!=="dol-1/suliko-ide-ci"||
 !root||!path.isAbsolute(root)||!stage||!path.isAbsolute(stage)||
 !stage.startsWith(path.resolve(process.env.RUNNER_TEMP||os.tmpdir())+path.sep))
 throw Error("D166 fail-closed: requires owned public CI workspace/temp");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"plugins/suliko-hello/package.json"),"utf8"));
if(manifest.name!=="bb-plugin-suliko-hello"||manifest.version!=="0.1.0"||
 manifest.devDependencies?.["@get-bb/plugin-sdk"]!=="0.6.132"||
 manifest.engines?.bb!==">=0.49.0 <0.49.1"||
 manifest.engines?.bbPluginSdk!==">=0.6.132 <0.6.133")
 throw Error("D166 fail-closed: unreviewed source or BB SDK pin");
const out=path.join(stage,"suliko-hello");
fs.mkdirSync(out,{recursive:true,mode:0o755});
const prefix="plugins/suliko-hello/";
const tracked=execFileSync("git",["ls-files","-z","--","plugins/suliko-hello"],{
 cwd:root,encoding:"utf8",timeout:10000,maxBuffer:1000000}).split("\0").filter(Boolean);
if(tracked.length<8)throw Error("D166 fail-closed: missing Git tracked Hello files");
const sources=new Set();
for(const relative of tracked){
 if(!relative.startsWith(prefix))throw Error("D166 fail-closed: escaped source");
 const suffix=relative.slice(prefix.length);
 if(!suffix||suffix.split("/").some(p=>p===""||p==="."||p==="..")||sources.has(suffix))
  throw Error("D166 fail-closed: invalid source path");
 sources.add(suffix);
 const input=path.join(root,relative),st=fs.lstatSync(input);
 if(!st.isFile()||st.isSymbolicLink())throw Error("D166 fail-closed: nonregular source");
 const dest=path.join(out,suffix);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(input,dest);
 fs.chmodSync(dest,0o644);
}
for(const name of ["server.js","app.js","app.css","app.meta.json"]){
 const src=path.join(root,"plugins/suliko-hello/dist",name),stat=fs.lstatSync(src);
 if(!stat.isFile()||stat.isSymbolicLink()||!stat.size)
  throw Error("D166 fail-closed: missing regular compiled artifact");
 const dest=path.join(out,"dist",name);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(src,dest);
 fs.chmodSync(dest,0o644);
}
const candidate=JSON.parse(fs.readFileSync(path.join(out,"package.json"),"utf8"));
candidate.version="0.1.0-rc.1";
fs.writeFileSync(path.join(out,"package.json"),JSON.stringify(candidate,null,2)+"\n",{mode:0o644});
// Normalize tar member directory permissions after the intentionally different
// runner-b umask. Do not normalize archive bytes, plugin contents or digest.
function normalizeDirectoryModes(dir){
 const st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error("D176 refused non-directory");
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  if(ent.isSymbolicLink())throw Error("D176 refused symlink");
  if(ent.isDirectory())normalizeDirectoryModes(path.join(dir,ent.name));
 }
 fs.chmodSync(dir,0o755);
}
normalizeDirectoryModes(out);
console.log("D166 deterministic RC candidate prepared from exact checkout, four compiled files.");
