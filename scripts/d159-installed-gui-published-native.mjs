// D159/D161: native Windows/macOS/Linux *public CI only* official installed GUI + real
// published bb-app CLI in the SAME synthetic BB_DATA_DIR. Not user setup/release.
import fs from "node:fs";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";
const e=process.env, root=e.RUNNER_TEMP, workspace=e.GITHUB_WORKSPACE;
const platform=process.platform, isWin=platform==="win32", isMac=platform==="darwin", isLinux=platform==="linux";
const fail=(category)=>{throw Object.assign(new Error("D159"),{category})};
if(e.CI!=="true"||e.GITHUB_ACTIONS!=="true"||
   e.GITHUB_REPOSITORY!=="dol-1/suliko-ide-ci"||
   !((isWin&&e.RUNNER_OS==="Windows")||(isMac&&e.RUNNER_OS==="macOS")||(isLinux&&e.RUNNER_OS==="Linux"&&process.arch==="x64"))||
   !root||!path.isAbsolute(root)||!workspace||!path.isAbsolute(workspace)||
   process.versions.node!=="22.19.0"||
   ((isMac||isLinux) && typeof process.getuid==="function"&&process.getuid()===0))
  fail("not-approved-disposable-native-runner");
const began=Date.now(),port=isWin?38895:isMac?38914:38906,daemonPort=isWin?38896:isMac?38915:38907;
const home=path.join(root,"d159-native-owned-home");
const prefix=path.join(root,"d159-published-cli");
const data=path.join(home,"bb-disposable");
const local=path.join(home,"LocalAppData"), roaming=path.join(home,"RoamingAppData");
const fixture=path.join(workspace,"plugins","suliko-hello");
const env={...e,HOME:home,USERPROFILE:home,LOCALAPPDATA:local,APPDATA:roaming,
  BB_DATA_DIR:data,BB_TELEMETRY:"false",BB_SERVER_BIND_HOST:"127.0.0.1",
  BB_SERVER_PORT:String(port),BB_HOST_DAEMON_PORT:String(daemonPort),
  ...(isLinux?{APPIMAGE_EXTRACT_AND_RUN:"1"}:{})};
let app="",bb="",official="",server=null,installed=false;
function execute(executable,args,category,timeout=180000,cwd=workspace){
 const out=spawnSync(executable,args,{env,cwd,encoding:"utf8",timeout,
   windowsHide:true,maxBuffer:2_000_000,stdio:["ignore","pipe","pipe"]});
 if(out.error||out.status!==0)fail(category);
 return out.stdout;
}
function npm(args,timeout=150000){
 const nodeDir=path.dirname(process.execPath);
 const options=[
  path.join(nodeDir,"node_modules","npm","bin","npm-cli.js"),
  path.resolve(nodeDir,"..","lib","node_modules","npm","bin","npm-cli.js"),
 ];
 const npmCli=options.find(candidate=>{
  try{return fs.lstatSync(candidate).isFile()}catch{return false}
 });
 if(!npmCli)fail("pinned-node-npm-cli");
 return execute(process.execPath,[npmCli,...args],"published-npm",timeout,root);
}
function invokeBB(args,timeout=45000){
 return execute(process.execPath,[bb,...args],"published-bb-cli",timeout);
}
function getPlugins(){
 const json=JSON.parse(invokeBB(["plugin","list","--json"]));
 if(!Array.isArray(json.plugins))fail("invalid-live-plugins");
 return json.plugins;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function pathOccupiedNoFollow(target){
 try{fs.lstatSync(target);return true}
 catch(error){if(error?.code==="ENOENT")return false;throw error}
}
async function cleanup(){
 if(app){
  try{execute(process.execPath,[app,"stop","--data-dir",data],
       "bb-stop",20000,root)}catch{}
 }
 if(server&&server.exitCode===null){
  try{server.kill()}catch{}
  await wait(1500);
  if(server.exitCode===null)try{server.kill("SIGKILL")}catch{}
 }
 if(installed){
  try{
   if(isWin)execute("pwsh",["-NoProfile","-NonInteractive","-File",
     path.join(workspace,"scripts","suliko-setup.ps1"),"-Uninstall"],"owned-win-uninstall",90000);
   else execute("bash",[path.join(workspace,"scripts","suliko-setup.sh"),
     "--uninstall"],"owned-nonwindows-uninstall",90000);
   if(fs.existsSync(official))fail("owned-app-remains-after-uninstall");
   if(isLinux){
    const launcher=path.join(home,".local","bin","suliko-bb-desktop");
    if(pathOccupiedNoFollow(launcher)||pathOccupiedNoFollow(path.join(home,".cache","suliko-ide","bb-0.49.0-x86_64.AppImage")))
     fail("owned-linux-stage-remains-after-uninstall");
   }
  }catch(error){throw error;}
 }
 // Both directories were created exclusively under RUNNER_TEMP by this script.
 for(const dir of [prefix,home]){
  if(path.dirname(dir)!==root)fail("unexpected-owned-test-directory");
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
let passed=false,category="unexpected";
try{
 // Refuse adopted fixtures. mkdir() creates only fresh roots, never overwrites.
 fs.mkdirSync(home,{mode:0o700});
 fs.mkdirSync(prefix,{mode:0o700});
 fs.mkdirSync(local,{mode:0o700});
 fs.mkdirSync(roaming,{mode:0o700});
 fs.mkdirSync(data,{mode:0o700});
 const f=JSON.parse(fs.readFileSync(path.join(fixture,"package.json"),"utf8"));
 if(f.name!=="bb-plugin-suliko-hello"||
    f.engines?.bb!==">=0.49.0 <0.49.1"||
    f.devDependencies?.["@get-bb/plugin-sdk"]!=="0.6.132")
   fail("unreviewed-own-plugin");
 // Real user-facing GUI setup executes once under synthetic host; not a source-built GUI.
 if(isWin){
  execute("pwsh",["-NoProfile","-NonInteractive","-File",
    path.join(workspace,"scripts","suliko-setup.ps1"),
    "-Install","-AllowUnsignedVerified"],"official-windows-user-setup",350000);
  official=path.join(local,"SulikoIDE","InstalledBB","bb.exe");
 }else if(isMac){
  execute("bash",[path.join(workspace,"scripts","suliko-setup.sh"),
    "--install"],"official-macos-user-setup",350000);
  official=path.join(home,"Applications","bb.app","Contents","MacOS","bb");
 }else{
  if(!fs.existsSync("/usr/bin/xvfb-run"))fail("linux-native-xvfb-missing");
  execute("bash",[path.join(workspace,"scripts","suliko-setup.sh"),
    "--install"],"official-linux-user-setup",350000);
  official=path.join(home,".local","share","suliko-ide","bb-0.49.0-x86_64.AppImage");
 }
 installed=true;
 // Assert the expected official launcher after setup, do not follow symlink.
 const appStat=fs.lstatSync(official);
 if(!appStat.isFile()||appStat.isSymbolicLink())fail("invalid-official-launcher");
 if(isLinux){
  const launcher=path.join(home,".local","bin","suliko-bb-desktop");
  if(!fs.lstatSync(launcher).isSymbolicLink()||fs.readlinkSync(launcher)!==official)
   fail("invalid-owned-linux-launcher");
  const digest=execute("sha256sum",[official],"official-linux-checksum",30000).trim().split(/\s+/)[0];
  if(digest!=="8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770")
   fail("official-linux-sha256-mismatch");
 }
 // Stock *published npm*, version-pinned: registry metadata is NOT publisher identity.
 const metadata=JSON.parse(npm(["view","bb-app@0.49.0","--json"],90000));
 if(metadata.name!=="bb-app"||metadata.version!=="0.49.0"||
    !/^sha512-[A-Za-z0-9+/]+=*$/.test(metadata.dist?.integrity||""))
   fail("unreviewed-registry-metadata");
 npm(["--prefix",prefix,"install","--no-audit","--no-fund",
      "--save-exact","bb-app@0.49.0"],7*60000);
 const pkg=path.join(prefix,"node_modules","bb-app");
 const manifest=JSON.parse(fs.readFileSync(path.join(pkg,"package.json"),"utf8"));
 if(manifest.name!=="bb-app"||manifest.version!=="0.49.0")fail("unreviewed-package");
 function packageBin(relative){
  if(typeof relative!=="string")fail("published-bin-missing");
  const resolved=path.resolve(pkg,relative);
  if(!resolved.startsWith(pkg+path.sep))fail("published-bin-escaped-package");
  return resolved;
 }
 bb=packageBin(manifest.bin?.bb);
 app=packageBin(manifest.bin?.["bb-app"]);
 server=spawn(process.execPath,[app,"start","--data-dir",data,
  "--server-bind-host","127.0.0.1","--server-port",String(port),
  "--host-daemon-port",String(daemonPort),"--no-in-app-updates"],
  {env,cwd:root,stdio:"ignore",windowsHide:true});
 let plugins=null;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)fail("published-server-exited");
  try{plugins=getPlugins();break}catch{}
  await wait(1500);
 }
 if(!plugins)fail("published-server-readiness");
 const forbidden=["bb--mcp","account-pool","connect","bb--connect-next","memory"];
 for(const id of forbidden){
  const rows=plugins.filter(x=>x.id===id);
  if(rows.length>1)fail("duplicate-stock-plugin");
  if(rows.length===1&&(rows[0].enabled!==false||rows[0].status!=="disabled"))
   invokeBB(["plugin","disable",id]);
 }
 invokeBB(["plugin","install",fixture,"--yes"],90000);
 // D160: scoped race recovery against actual published BB state. A disabled
 // flag alone does NOT satisfy SEC02: require both fields and own Hello active.
 // Reissue a reviewed fixed-ID disable if lifecycle startup rewrites status.
 // Print only a fixed public ID/category, never raw plugin JSON or paths.
 let strict=false,lastCategory="not-yet-observed";
 for(let i=0;i<16;i++){
  plugins=getPlugins();
  let safe=true;
  for(const id of forbidden){
   const rows=plugins.filter(x=>x.id===id);
   if(rows.length>1)fail("duplicate-stock-plugin");
   if(rows.length===1&&(rows[0].enabled!==false||rows[0].status!=="disabled")){
    safe=false;
    const enabled=rows[0].enabled===true?"true":rows[0].enabled===false?"false":"other";
    const rawStatus=rows[0].status;
    const status=rawStatus==="disabled"?"disabled":rawStatus==="running"?"running":
     rawStatus==="needs-configuration"?"needs-configuration":rawStatus==="error"?"error":"other";
    lastCategory="forbidden-"+id+"-enabled-"+enabled+"-status-"+status;
    // Do not silently accept a stale or re-enabled plugin; actually request
    // a disable again at bounded intervals, then re-read live runtime state.
    if(i>=2&&i%3===2)invokeBB(["plugin","disable",id]);
   }
  }
  const own=plugins.filter(x=>x.id==="suliko-hello"||x.id==="bb-plugin-suliko-hello");
  if(own.length>1)fail("duplicate-own-plugin");
  const helloActive=own.length===1&&own[0].enabled===true;
  if(!helloActive){
   lastCategory=own.length===0?"own-hello-missing":"own-hello-not-enabled";
   if(own.length===1&&i>=2&&i%3===2)
    invokeBB(["plugin","enable","suliko-hello"]);
  }
  if(safe&&helloActive){strict=true;break}
  await wait(1000);
 }
 if(!strict){
  console.error("D160_STRICT_LIVE_STATE_REJECTED category="+lastCategory);
  fail("strict-live-sec02-hello-not-confirmed");
 }
 // Real synthetic project enrolled via published CLI, both native GUI tests rely on it.
 const name=isWin?"d129-win-synthetic":isMac?"d135-macos-synthetic":"d134-linux-synthetic";
 const project=path.join(home,name);
 fs.mkdirSync(project,{mode:0o700});
 fs.writeFileSync(path.join(project,"README.md"),"D159 synthetic disposable project only\n",{flag:"wx",mode:0o600});
 execute("git",["-C",project,"init","-b","main"],"git-init");
 execute("git",["-C",project,"add","README.md"],"git-add");
 invokeBB(["project","create","--name",name,"--root",project]);
 if(isWin){
  env.D129_OFFICIAL_EXE=official;
  env.D129_BB_WEB_URL="http://127.0.0.1:38895/";
 }else if(isMac){
  env.D135_OFFICIAL_EXE=official;
  env.D135_BB_WEB_URL="http://127.0.0.1:38914/";
 }else{
  env.D134_OFFICIAL_APPIMAGE=official;
  env.D134_BB_WEB_URL="http://127.0.0.1:38906/";
 }
 const guiTest=isWin?"d129-windows-installed-desktop.mjs":isMac?
  "d135-macos-official-installed-hello.mjs":"d134-linux-installed-appimage.mjs";
 const result=isLinux?
  execute("xvfb-run",["-a",process.execPath,path.join(workspace,"tests","parity",guiTest)],
    "genuine-installed-electron-hello",180000):
  execute(process.execPath,[path.join(workspace,"tests","parity",guiTest)],
    "genuine-installed-electron-hello",180000);
 if(!result.includes("PASS"))fail("actual-gui-not-verified");
 const elapsed=Math.ceil((Date.now()-began)/1000);
 if(elapsed>=900)fail("exceeded-15-minutes");
 console.log("D159_INSTALLED_NATIVE_GUI_PUBLISHED_CLI_SEC02_HELLO=PASS");
 console.log("D159_NATIVE_OS="+(isWin?"windows-2025":isMac?"macos-15":"ubuntu-24.04"));
 if(isLinux)console.log("D161_LINUX_OFFICIAL_INSTALLED_GUI_PUBLISHED_CLI_STRICT=PASS");
 console.log("D159_ACTIVE_SAME_SYNTHETIC_BB_DATA_DIR=PASS");
 console.log("D159_SETUP_ELAPSED_SECONDS="+elapsed);
 if(e.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(e.GITHUB_STEP_SUMMARY,
   "D159 real official user-installed native GUI + independently published stock CLI live same synthetic data: SUCCESS in "+elapsed+"s. CI-only, still two provisioning commands, no approved RC or beta.\n");
 passed=true;
}catch(err){
 category=err?.category||"runtime";
 console.error("D159_FAIL_CLOSED category="+category);
 process.exitCode=1;
}finally{
 try{await cleanup()}catch{
  console.error("D159_CLEANUP_FAILED");
  process.exitCode=1;
 }
}
if(!passed)process.exitCode=1;
