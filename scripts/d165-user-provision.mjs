// D165 nonprivileged user-owned setup provisioning. Only stock pinned BB CLI,
// author-owned candidate bytes & synthetic/no-secret fixtures. No remote/BB core edits.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawn,spawnSync} from "node:child_process";
import {parseSetupArgs} from "./d165-setup-args.mjs";
import {validateRcPins} from "./d215-rc-pin.mjs";
import {FORBIDDEN_IDS,inspectStrictNativePluginState} from "./d163-strict-native-plugin-state.mjs";
import {verifyNativeLoopback} from "./d164-native-listener-guard.mjs";
// Fail closed with fixed vocabulary only; no user paths, npm logs or stack traces.
const safeProvisionCauses=new Set([
 "unsafe-user-parent","redirected-managed-root","redirected-user-data",
 "candidate-digest-mismatch","candidate-source-not-reviewed","unsafe-regular-file",
 "invalid-candidate-archive","invalid-candidate-member-count","invalid-candidate-archive-traversal",
 "candidate-archive-traversal","invalid-candidate-member-types","candidate-archive-link-refused",
 "published-npm-install","pinned-npm-not-found","unreviewed-bb-app-metadata",
 "unreviewed-npm-lock-source","npm-lock-content-drift",
 "unreviewed-candidate-manifest","candidate-nonregular-member","published-cli-server-not-ready",
 "published-cli-server-exited","published-cli-live-state","real-local-listeners-not-proved-loopback",
 "live-sec02-hello-not-converged","require-reviewed-node-22-19-0","unsafe-user-root",
 "native-listener-query","extract-candidate-failed","expected-regular-owned-file",
 "staged-candidate-digest-mismatch","staged-candidate-nonregular"
]);
const safeErrnos=new Set(["ENOENT","EACCES","EPERM","EINVAL","ENOTDIR","EEXIST","EBUSY","ETIMEDOUT"]);
function fatalProvision(err){
 const category=String(err?.category||"");
 const code=String(err?.code||"");
 console.error("D165_SAFE_PROVISION_CAUSE="+(safeProvisionCauses.has(category)?category:"unclassified")+
  " D165_SAFE_PROVISION_ERRNO="+(safeErrnos.has(code)?code:"other"));
 process.exit(1);
}
process.on("uncaughtException",fatalProvision);
process.on("unhandledRejection",fatalProvision);
const args=parseSetupArgs(process.argv.slice(2)),e=process.env,win=process.platform==="win32";
const mac=process.platform==="darwin",linux=process.platform==="linux";
const fail=category=>{throw Object.assign(new Error(category),{category})};
if(!win&&!mac&&!linux)fail("unsupported-native-os");
if(process.versions.node!=="22.19.0")fail("require-reviewed-node-22-19-0");
if(!win&&typeof process.getuid==="function"&&process.getuid()===0)fail("root-not-allowed");
const base=win?e.LOCALAPPDATA:e.HOME;
if(!base||!path.isAbsolute(base)||path.parse(base).root===base)fail("unsafe-user-root");
const sub=win?path.join(base,"SulikoIDE"):path.join(base,".local","share","suliko-ide");
const root=path.join(sub,"UserSetup"),data=path.join(sub,"UserData");
const marker=path.join(root,".suliko-owned-v1");
const candidateRoot=path.join(root,"candidate"),prefix=path.join(root,"cli");
const sha=crypto.createHash, repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const approvedFile=path.join(repoRoot,"marketplace","rc","EXPECTED_SHA");
const candidateFile=path.join(repoRoot,"marketplace","rc","EXPECTED_SHA.candidate");
function readRegular(f,maxBytes=10000000){
 // Security: fd-based fstat and read eliminate lstat/open pathname races.
 const flags=fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0);
 const fd=fs.openSync(f,flags);
 try{
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.size<1||st.size>maxBytes)fail("unsafe-regular-file");
  return fs.readFileSync(fd);
 }finally{fs.closeSync(fd)}
}
const expected=f=>readRegular(f,500).toString("utf8").trim();
const candidateDigest=()=>{
 const txt=expected(candidateFile).split(/\r?\n/).find(s=>s.startsWith("sha256="))||"";
 return txt.slice(7);
};
const isManaged=(p)=>{try{let x=fs.lstatSync(p);return x.isDirectory()&&!x.isSymbolicLink()}catch(e){if(e.code==="ENOENT")return false;throw e}};
function checkParents(){
 for(const p of [base,win?sub:path.join(base,".local"),...(win?[]:[path.join(base,".local","share")]),sub]){
  try{let st=fs.lstatSync(p);if(!st.isDirectory()||st.isSymbolicLink())fail("unsafe-user-parent")}
  catch(err){if(err.code!=="ENOENT")throw err;}
 }
 if(fs.existsSync(root)&&!isManaged(root))fail("redirected-managed-root");
 if(fs.existsSync(data)&&!isManaged(data))fail("redirected-user-data");
}
function regular(p){
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||!s.size)fail("expected-regular-owned-file");
 return s;
}
function shell(executable,args,category,timeout=180000,cwd=root,env=process.env){
 const out=spawnSync(executable,args,{cwd,env,encoding:"utf8",timeout,stdio:["ignore","pipe","pipe"],windowsHide:true,maxBuffer:1000000});
 if(out.error||out.status!==0)fail(category);
 return out.stdout;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assertCandidate(){
 const got=sha("sha256").update(readRegular(args.candidateFile,10000000)).digest("hex");
 if(got!==args.sha)fail("candidate-digest-mismatch");
 const known=candidateDigest();
 const approved=expected(approvedFile);
 // Reviewed RC commit is a 40hex source pin, NOT an alternate archive hash.
 // A candidate must independently match EXPECTED_SHA.candidate's 64hex digest.
 validateRcPins(approved,known,args.sha);
 return got;
}
function verifyTar(){
 // GNU tar on native Windows interprets a drive colon as remote tar transport;
 // use the verified archive basename from its own parent as cwd on every OS.
 const output=shell("tar",["-tzf",path.basename(args.candidateFile)],"invalid-candidate-archive",20000,path.dirname(args.candidateFile));
 const names=output.trim().split(/\r?\n/).filter(Boolean);
 if(names.length<10||names.length>100)fail("invalid-candidate-member-count");
 for(const n of names){
  let parts=n.replace(/\/$/,"").split("/");
  if(parts[0]!=="suliko-hello"||parts.some(x=>x===""||x===".."||x===".")||
    n.includes("\\")||n.startsWith("/"))fail("candidate-archive-traversal");
 }
 // We accept only regular files and directories, not symlink or hardlink
 // members; archived bytes have already matched the reviewed exact digest.
 const lines=shell("tar",["-tvzf",path.basename(args.candidateFile)],"invalid-candidate-member-types",20000,path.dirname(args.candidateFile));
 for(const line of lines.split(/\r?\n/).filter(Boolean))
  if(!["-","d"].includes(line[0]))fail("candidate-archive-link-refused");
}
function verifyAllExtracted(dir){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,ent.name),st=fs.lstatSync(f);
  if(st.isSymbolicLink()||(!st.isFile()&&!st.isDirectory()))fail("candidate-nonregular-member");
  if(st.isDirectory())verifyAllExtracted(f);
 }
}
const gui=win?path.join(base,"SulikoIDE","InstalledBB","bb.exe"):
 mac?path.join(base,"Applications","bb.app","Contents","MacOS","bb"):
 path.join(base,".local","share","suliko-ide","bb-0.49.0-x86_64.AppImage");
function launcherText(){
 if(win){
  const quote=x=>"'"+x.replaceAll("'","''")+"'";
  return "$ErrorActionPreference='Stop'\n$env:BB_DATA_DIR="+quote(data)+"\n& "+quote(gui)+"\nexit $LASTEXITCODE\n";
 }
 const quote=x=>"'"+x.replaceAll("'","'\\''")+"'";
 return "#!/usr/bin/env bash\nset -euo pipefail\nexport BB_DATA_DIR="+quote(data)+"\nexec "+quote(gui)+" \"$@\"\n";
}
function mainRecord(digest){return "SULIKO-IDE-OWN-PROVISION-v1 "+digest}
if(args.mode==="dry-run"){
 console.log("D165_PREVIEW_ONLY exact reviewed candidate source + one-entry published CLI setup requires --plugin-sha and --candidate-file; no writes.");
}else if(args.mode==="uninstall"){
 checkParents();
 if(!fs.existsSync(root)){console.log("D165_NO_MANAGED_PROVISION_TO_REMOVE; BB user data untouched.");}
 else{
  if(!fs.existsSync(marker)){console.log("D165_UNTRACKED_PROVISION_PRESERVED; no owner marker.");}
  else{
   const m=readRegular(marker,500).toString("utf8").trim();
   if(!/^SULIKO-IDE-OWN-PROVISION-v1 [a-f0-9]{64}$/.test(m))fail("unrecognized-setup-owner-marker");
   const allowed=new Set(["cli","candidate",win?"launch-suliko.ps1":"launch-suliko.sh",".suliko-owned-v1"]);
   const names=fs.readdirSync(root);
   if(names.some(x=>!allowed.has(x)))fail("foreign-setup-root-file-preserved");
   const launch=path.join(root,win?"launch-suliko.ps1":"launch-suliko.sh");
   if(readRegular(launch,2000).toString("utf8")!==launcherText())fail("modified-launcher-preserved");
   for(const f of [prefix,candidateRoot]){
    if(!isManaged(f))fail("foreign-subtree-preserved");
   }
   // Nothing under UserData is deleted; this is deliberately user-owned.
   for(const f of [prefix,candidateRoot])fs.rmSync(f,{recursive:true});
   fs.unlinkSync(launch);
   fs.unlinkSync(marker);
   fs.rmdirSync(root);
   console.log("D165_OWNED_CLI_CANDIDATE_LAUNCHER_REMOVED; USER_BB_DATA_PRESERVED");
  }
 }
}else{
 console.log("D165_STAGE=provision-entry");
 checkParents();
 console.log("D165_STAGE=parents-checked");
 if(args.mode!=="install")fail("invalid-setup-mode");
 assertCandidate();
 console.log("D165_STAGE=candidate-sha-verified");
 verifyTar();
 console.log("D165_STAGE=candidate-archive-verified");
 regular(gui);
 if(fs.existsSync(root))fail("existing-provision-root-refused");
 fs.mkdirSync(sub,{recursive:true,mode:0o700});
 fs.mkdirSync(root,{recursive:false,mode:0o700});
 let server=null,app=null,bb=null,stopped=false;
 try{
  fs.mkdirSync(candidateRoot,{mode:0o700});
  // Stage the SHA-pinned candidate into a newly owned directory, so native
  // Windows tar never sees a drive-letter path (including -C). Verify the
  // bytes AGAIN after staging: no pathname race may change extracted content.
  const staged=path.join(candidateRoot,".d165-verified-archive.tar.gz");
  fs.writeFileSync(staged,readRegular(args.candidateFile,10000000),{flag:"wx",mode:0o600});
  try{
   const stagedDigest=sha("sha256").update(readRegular(staged,10000000)).digest("hex");
   if(stagedDigest!==args.sha)fail("staged-candidate-digest-mismatch");
   shell("tar",["-xzf",path.basename(staged)],"extract-candidate-failed",30000,candidateRoot);
  }finally{
   const st=fs.lstatSync(staged);
   if(!st.isFile()||st.isSymbolicLink())fail("staged-candidate-nonregular");
   fs.unlinkSync(staged);
  }
  console.log("D165_STAGE=candidate-extracted");
  verifyAllExtracted(candidateRoot);
  const plugin=path.join(candidateRoot,"suliko-hello");
  const mp=JSON.parse(fs.readFileSync(path.join(plugin,"package.json"),"utf8"));
  if(mp.name!=="bb-plugin-suliko-hello"||mp.version!=="0.1.0-rc.1"||
     mp.devDependencies?.["@get-bb/plugin-sdk"]!=="0.6.132"||
     mp.engines?.bb!==">=0.49.0 <0.49.1")fail("unreviewed-candidate-manifest");
  fs.mkdirSync(prefix,{mode:0o700});
  if(!fs.existsSync(data))fs.mkdirSync(data,{mode:0o700});
  const nodeDir=path.dirname(process.execPath);
  const npmPaths=[
    path.join(nodeDir,"node_modules","npm","bin","npm-cli.js"),
    path.resolve(nodeDir,"..","lib","node_modules","npm","bin","npm-cli.js")
  ];
  const npmCli=npmPaths.find(f=>{try{return fs.lstatSync(f).isFile()}catch{return false}});
  if(!npmCli)fail("pinned-npm-not-found");
  const env={...e,BB_DATA_DIR:data,BB_TELEMETRY:"false",BB_SERVER_BIND_HOST:"127.0.0.1",
   BB_SERVER_PORT:win?"38895":mac?"38914":"38906",BB_HOST_DAEMON_PORT:win?"38896":mac?"38915":"38907",
   ...(linux?{APPIMAGE_EXTRACT_AND_RUN:"1"}:{})};
  // D197: never resolve a mutable transitive range at user install time.
  // This repo-reviewed npm lock pins the full published dependency graph with
  // sha512 integrity; we copy it only into our newly owned, empty CLI prefix.
  const lockRoot=path.join(repoRoot,"scripts","d197-bb-cli-lock");
  const rootManifestBytes=readRegular(path.join(lockRoot,"package.json"),10000);
  const lockBytes=readRegular(path.join(lockRoot,"package-lock.json"),200000);
  if(sha("sha256").update(lockBytes).digest("hex")!==
    "f31092f27b9a982793c19741d7ff13f8e8eaf05a4d9a1f6464968dc150c620df")
    fail("unreviewed-npm-lock-source");
  const rootManifest=JSON.parse(rootManifestBytes.toString("utf8"));
  const lock=JSON.parse(lockBytes.toString("utf8"));
  const bbLock=lock.packages?.["node_modules/bb-app"];
  if(rootManifest.name!=="suliko-pinned-bb-app-cli"||
     rootManifest.dependencies?.["bb-app"]!=="0.49.0"||
     Object.keys(rootManifest.dependencies||{}).length!==1||
     lock.lockfileVersion!==3||
     lock.packages?.[""].dependencies?.["bb-app"]!=="0.49.0"||
     bbLock?.version!=="0.49.0"||
     !/^sha512-[A-Za-z0-9+/]+=*$/.test(bbLock.integrity||""))
    fail("unreviewed-npm-lock-source");
  for(const [name,item] of Object.entries(lock.packages)){
    if(!name)continue;
    // npm packages bundled within the independently integrity-pinned npm tarball
    // have no separate integrity, as represented in npm's official lock format.
    if(item.inBundle===true && name.startsWith("node_modules/npm/node_modules/"))continue;
    if(!/^sha512-[A-Za-z0-9+/]+=*$/.test(item.integrity||"")||
       !item.resolved?.startsWith("https://registry.npmjs.org/"))
      fail("unreviewed-npm-lock-source");
  }
  fs.writeFileSync(path.join(prefix,"package.json"),rootManifestBytes,{flag:"wx",mode:0o600});
  fs.writeFileSync(path.join(prefix,"package-lock.json"),lockBytes,{flag:"wx",mode:0o600});
  const npm=args=>shell(process.execPath,[npmCli,...args],"published-npm-install",420000,base,env);
  const meta=JSON.parse(npm(["view","bb-app@0.49.0","--json"]));
  if(meta.name!=="bb-app"||meta.version!=="0.49.0"||
    meta.dist?.integrity!==bbLock.integrity)fail("unreviewed-bb-app-metadata");
  npm(["--prefix",prefix,"ci","--ignore-scripts","--no-audit","--no-fund"]);
  if(!readRegular(path.join(prefix,"package-lock.json"),200000).equals(lockBytes))
    fail("npm-lock-content-drift");
  console.log("D165_STAGE=published-cli-installed");
  const pkg=path.join(prefix,"node_modules","bb-app");
  const m=JSON.parse(fs.readFileSync(path.join(pkg,"package.json"),"utf8"));
  if(m.name!=="bb-app"||m.version!=="0.49.0")fail("installed-published-bb-version");
  const bin=n=>{
   if(typeof m.bin?.[n]!=="string")fail("bb-cli-bin-missing");
   const f=path.resolve(pkg,m.bin[n]);
   if(!f.startsWith(pkg+path.sep))fail("bb-bin-escapes-package");
   regular(f);return f;
  };
  app=bin("bb-app");bb=bin("bb");
  const runBB=(a,t=45000)=>shell(process.execPath,[bb,...a],"published-cli-live-state",t,base,env);
  server=spawn(process.execPath,[app,"start","--data-dir",data,
    "--server-bind-host","127.0.0.1","--server-port",env.BB_SERVER_PORT,
    "--host-daemon-port",env.BB_HOST_DAEMON_PORT,"--no-in-app-updates"],{
    cwd:base,env,windowsHide:true,stdio:"ignore"});
  let plugins=null;
  const getPlugins=()=>{
   const doc=JSON.parse(runBB(["plugin","list","--json"]));
   if(!Array.isArray(doc.plugins))fail("live-plugin-state-invalid");
   return doc.plugins;
  };
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)fail("published-cli-server-exited");
   try{plugins=getPlugins();break}catch{}
   await sleep(1500);
  }
  if(!plugins)fail("published-cli-server-not-ready");
  for(const id of FORBIDDEN_IDS){
   const rows=plugins.filter(x=>x.id===id);
   if(rows.length>1)fail("duplicate-forbidden-stock-plugin");
   if(rows.length===1&&(rows[0].enabled!==false||rows[0].status!=="disabled"))
    runBB(["plugin","disable",id]);
  }
  runBB(["plugin","install",plugin,"--yes"],90000);
  console.log("D165_STAGE=plugin-installed");
  let safe=false,reason="not-converged";
  for(let i=0;i<16;i++){
   const state=inspectStrictNativePluginState(getPlugins());
   if(state.safe){safe=true;break;}
   reason=state.lastCategory;
   if(i>=2&&i%3===2){
    for(const offender of state.forbiddenOffenders)runBB(["plugin","disable",offender.id]);
    if(state.helloPresent&&!state.helloActive)runBB(["plugin","enable","suliko-hello"]);
   }
   await sleep(1000);
  }
  if(!safe)fail("live-sec02-hello-not-converged");
  console.log("D165_STAGE=strict-state-converged");
  const ports=[Number(env.BB_SERVER_PORT),Number(env.BB_HOST_DAEMON_PORT)];
  const snapshot=()=>{
   if(linux)return shell("ss",["-ltnH"],"native-listener-query",20000,base,env);
   if(mac)return shell("lsof",["-nP","-iTCP","-sTCP:LISTEN"],"native-listener-query",20000,base,env);
   const code="$ports=@("+ports.join(",")+");"+
    "$rows=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $ports -contains [int]$_.LocalPort } | Select-Object LocalAddress,LocalPort);"+
    "ConvertTo-Json -InputObject $rows -Compress";
   return shell("pwsh",["-NoProfile","-NonInteractive","-Command",code],"native-listener-query",20000,base,env);
  };
  let loopback=false;
  for(let i=0;i<12;i++){
   try{verifyNativeLoopback(win?"Windows":mac?"macOS":"Linux",snapshot(),ports);loopback=true;break}
   catch(err){if(err.category==="listener-exposed-nonloopback")throw err}
   await sleep(1000);
  }
  if(!loopback)fail("real-local-listeners-not-proved-loopback");
  console.log("D165_STAGE=loopback-verified");
  const launch=path.join(root,win?"launch-suliko.ps1":"launch-suliko.sh");
  fs.writeFileSync(launch,launcherText(),{flag:"wx",mode:0o700});
  fs.writeFileSync(marker,mainRecord(args.sha)+"\n",{flag:"wx",mode:0o600});
  console.log("D165_OWNED_SETUP_SEC02_PINNED_RC_HELLO_LOOPBACK=PASS");
  console.log("D165_CANDIDATE_SHA256="+args.sha);
 }finally{
  if(app){
   try{shell(process.execPath,[app,"stop","--data-dir",data],"stop-owned-bb-app",20000,base,{
    ...e,BB_DATA_DIR:data,BB_TELEMETRY:"false",BB_SERVER_BIND_HOST:"127.0.0.1"
   });stopped=true}catch{}
  }
  if(server&&server.exitCode===null){
   try{server.kill()}catch{}
   await sleep(1500);
   if(server.exitCode===null)try{server.kill("SIGKILL")}catch{}
  }
  if(!stopped)console.log("D165_STOP_STATUS_NOT_VERIFIED; only owned server process was terminated.");
 }
}
