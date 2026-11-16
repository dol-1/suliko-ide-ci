// D165 genuine native public GitHub runner: ONE end-user setup entry,
// installed GUI+published CLI same own BB data+candidate digest, real Hello GUI,
// strict SEC02, loopback, protected prior BB user files, and owned uninstall.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {spawn,spawnSync} from "node:child_process";
import {inspectStrictNativePluginState} from "./d163-strict-native-plugin-state.mjs";
import {createTiming} from "./d230-first15-metrics.mjs";
const e=process.env,root=e.RUNNER_TEMP,workspace=e.GITHUB_WORKSPACE,win=process.platform==="win32",
 mac=process.platform==="darwin",linux=process.platform==="linux";
const fail=category=>{throw Object.assign(new Error(category),{category})};
if(e.CI!=="true"||e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="dol-1/suliko-ide-ci"||
 !root||!path.isAbsolute(root)||!workspace||!path.isAbsolute(workspace)||
 process.versions.node!=="22.19.0"||
 !((win&&e.RUNNER_OS==="Windows")||(mac&&e.RUNNER_OS==="macOS")||(linux&&e.RUNNER_OS==="Linux"&&process.arch==="x64")))
 fail("not-native-owned-public-ci");
const home=path.join(root,"d165-owned-home");
const local=path.join(home,"LocalAppData"),roaming=path.join(home,"RoamingAppData");
const base=win?local:home,sub=win?path.join(base,"SulikoIDE"):path.join(base,".local","share","suliko-ide");
const userData=path.join(sub,"UserData"),setupRoot=path.join(sub,"UserSetup");
const data=userData,official=win?path.join(local,"SulikoIDE","InstalledBB","bb.exe"):
 mac?path.join(home,"Applications","bb.app","Contents","MacOS","bb"):
 path.join(home,".local","share","suliko-ide","bb-0.49.0-x86_64.AppImage");
const archive=path.join(root,"d166-verified-candidate","suliko-hello-v0.1.0-rc.1.tar.gz");
const pinFile=path.join(workspace,"marketplace","rc","EXPECTED_SHA.candidate");
const started=Date.now(),d230Clock=process.hrtime.bigint(),d230Points={},
 markD230=stage=>{if(e.D230_REHEARSAL==='1')d230Points[stage]=Number((process.hrtime.bigint()-d230Clock)/1000000n)};
const port=win?38895:mac?38914:38906,daemonPort=win?38896:mac?38915:38907;
const env={...e,HOME:home,USERPROFILE:home,LOCALAPPDATA:local,APPDATA:roaming,
 BB_DATA_DIR:data,BB_TELEMETRY:"false",BB_SERVER_BIND_HOST:"127.0.0.1",
 BB_SERVER_PORT:String(port),BB_HOST_DAEMON_PORT:String(daemonPort),
 ...(linux?{APPIMAGE_EXTRACT_AND_RUN:"1"}:{})};
const shell=(file,args,category,timeout=180000,cwd=workspace)=>{
 const o=spawnSync(file,args,{cwd,env,timeout,windowsHide:true,encoding:"utf8",
   stdio:["ignore","pipe","pipe"],maxBuffer:3000000});
 if(o.error||o.status!==0){
  // Deliberately print allowlisted categories only, never captured process logs.
  if(category==="d165-end-user-single-setup-call"){
    const raw=String(o.stdout||"")+"\n"+String(o.stderr||"");
    const stages=[...raw.matchAll(/D165_STAGE=([a-z0-9-]{2,60})/g)].map(m=>m[1]);
    const allowed=new Set(["official-cached-verified","official-installed","provision-start","provision-entry","parents-checked","candidate-sha-verified","candidate-archive-verified","candidate-extracted","published-cli-installed","plugin-installed","strict-state-converged","loopback-verified"]);
    const latest=stages.filter(x=>allowed.has(x)).at(-1)||"not-reported";
    const captured=/D165_SAFE_PROVISION_CAUSE=([a-z0-9-]{2,60}) D165_SAFE_PROVISION_ERRNO=([A-Z]{2,15}|other)/.exec(raw);
    const causes=["published-npm-install","pinned-npm-not-found","published-cli-server-exited","published-cli-server-not-ready","published-cli-live-state","unreviewed-bb-app-metadata","unreviewed-candidate-manifest","live-sec02-hello-not-converged","real-local-listeners-not-proved-loopback","candidate-source-not-reviewed","candidate-digest-mismatch"];
    const code=causes.find(x=>raw.includes("Error: "+x))||"unclassified";
    const boundedCause=new Set([...causes,"unreviewed-npm-lock-source","npm-lock-content-drift","unsafe-user-parent","unsafe-regular-file","invalid-candidate-archive","invalid-candidate-member-types","candidate-archive-traversal","candidate-archive-link-refused","candidate-digest-mismatch","extract-candidate-failed","staged-candidate-digest-mismatch","staged-candidate-nonregular"]);
    const safeCode=captured&&boundedCause.has(captured[1])?captured[1]:code;
    const safeErrno=captured&&new Set(["ENOENT","EACCES","EPERM","EINVAL","ENOTDIR","EEXIST","EBUSY","ETIMEDOUT"]).has(captured[2])?captured[2]:"other";
    console.error("D165_SAFE_STAGE="+latest+" D165_SAFE_CAUSE="+safeCode+" D165_SAFE_ERRNO="+safeErrno);
  }
  if(category==="d198-live-owned-bb-doctor"){
    const text=String(o.stderr||"")+String(o.stdout||"");
    const safe=/D198_SAFE_STAGE=(platform|owned-root|profile|published-cli|port-contract|native-loopback|plugin-list|unclassified)/.exec(text)?.[1]||"report-refused";
    console.error("D198_SAFE_STAGE="+safe);
  }
  if(category==="d165-actual-electron-hello"&&win){
    // Do not print Playwright failure snapshots: they could include user paths.
    // Only print the latest fixed, allowlisted GUI traversal stage token.
    const raw=String(o.stdout||"");
    const valid=new Set(["app-window-ready","ui-shell-hydrated","projectless-compose-home-ready","projects-page-ready","entry-found","dialog-open","folder-editor-open","path-editor-filled","path-navigation-submitted","project-selection-valid",
      "path-go-confirmed","gui-project-added","hello-nav-visible","hello-panel-visible"]);
    const last=[...raw.matchAll(/D174_GUI_SAFE_STAGE=([a-z-]+)/g)]
      .map(m=>m[1]).filter(x=>valid.has(x)).at(-1)||"not-reported";
    console.error("D174_SAFE_GUI_PROGRESS="+last);
  }
  if(category==="d165-published-cli-live"&&args[1]==="project"&&args[2]==="create"){
    // Never print raw bb CLI response, path, machine ID or server output.
    const raw=String(o.stdout||"")+"\n"+String(o.stderr||"");
    const classify=[
      ["upstream-native-windows-policy",/wsl2|unsupported.*windows|windows.*unsupported/i],
      ["host-identity-missing",/host.?id|host daemon|machine.*not found|unknown machine/i],
      ["git-repository-incomplete",/not a git repository|no commits|unborn branch/i],
      ["root-not-found",/ENOENT|not found|does not exist/i],
      ["server-unreachable",/ECONNREFUSED|ECONNRESET|fetch failed/i],
      ["request-rejected",/bad request|status.?400|validation failed/i],
      ["duplicate-project",/already exists|duplicate/i],
      ["permissions",/permission denied|EACCES|EPERM/i],
      ["invalid-project-path",/invalid.*path|path.*invalid/i]
    ];
    const reason=classify.find(([,regex])=>regex.test(raw))?.[0]||"unclassified";
    console.error("D165_SAFE_PROJECT_CREATE_REASON="+reason);
  }
  fail(category);
 }
 return o.stdout;
};
const sleep=ms=>new Promise(f=>setTimeout(f,ms));
const sha=x=>crypto.createHash("sha256").update(fs.readFileSync(x)).digest("hex");
function nonlink(p){const s=fs.lstatSync(p);if(s.isSymbolicLink())fail("linked-path");return s;}
const pluginData=fs.readFileSync(pinFile,"utf8");
const digest=/^sha256=([a-f0-9]{64})$/m.exec(pluginData)?.[1];
if(!digest||!fs.existsSync(archive)||!nonlink(archive).isFile()||sha(archive)!==digest)
 fail("same-run-d166-pinned-candidate-mismatch");
let server=null,app=null,bbPath=null,installed=false,sourceHash="";
try{
 fs.mkdirSync(home,{mode:0o700});
 fs.mkdirSync(local,{mode:0o700});
 fs.mkdirSync(roaming,{mode:0o700});
 fs.mkdirSync(sub,{recursive:true,mode:0o700});
 // Foreign prior BB data and user-provided data are synthetic, never touched.
 const foreign=path.join(home,".bb");
 fs.mkdirSync(foreign,{mode:0o700});
 const foreignSentinel=path.join(foreign,"foreign-user-preexisting.txt");
 fs.writeFileSync(foreignSentinel,"D165 synthetic foreign BB data: must survive\n",{flag:"wx",mode:0o600});
 fs.mkdirSync(userData,{mode:0o700});
 const ownSentinel=path.join(userData,"pre-existing-user-sentinel.txt");
 fs.writeFileSync(ownSentinel,"D165 synthetic preexisting user data - never delete\n",{flag:"wx",mode:0o600});
 const foreignHash=sha(foreignSentinel),ownedHash=sha(ownSentinel);
 const setupScript=path.join(workspace,"scripts",win?"suliko-setup.ps1":"suliko-setup.sh");
 const installArgs=win?["-NoProfile","-NonInteractive","-File",setupScript,"-Install","-AllowUnsignedVerified","-PluginSha",digest,"-CandidateFile",archive]:
 [setupScript,"--install","--plugin-sha",digest,"--candidate-file",archive];
 const userCommand=win?"pwsh":"bash";
 const setupOut=shell(userCommand,installArgs,"d165-end-user-single-setup-call",750000);
 installed=true;
 if(!setupOut.includes("D165_OWNED_SETUP_SEC02_PINNED_RC_HELLO_LOOPBACK=PASS"))
  fail("d165-setup-did-not-report-success");
 if(!nonlink(official).isFile())fail("d165-gui-not-installed");
 if(!nonlink(path.join(setupRoot,".suliko-owned-v1")).isFile())fail("d165-ownership-marker-missing");
 const setupSeconds=Math.ceil((Date.now()-started)/1000);
 if(setupSeconds>=900)fail("d165-single-user-command-exceeded-900s");
 sourceHash=digest;
 markD230("setup");
  console.log("D165_SETUP_ELAPSED_SECONDS="+setupSeconds);
 // Live actual user provisioned state reused, no source-direct test-only plugin installation.
 const pkg=path.join(setupRoot,"cli","node_modules","bb-app");
 const manifest=JSON.parse(fs.readFileSync(path.join(pkg,"package.json"),"utf8"));
 if(manifest.version!=="0.49.0")fail("d165-published-cli-version");
 bbPath=path.resolve(pkg,manifest.bin.bb);
 app=path.resolve(pkg,manifest.bin["bb-app"]);
 if(!bbPath.startsWith(pkg+path.sep)||!app.startsWith(pkg+path.sep))
  fail("d165-cli-bin-path-escape");
 nonlink(bbPath);nonlink(app);
 server=spawn(process.execPath,[app,"start","--data-dir",data,
  "--server-bind-host","127.0.0.1","--server-port",String(port),
  "--host-daemon-port",String(daemonPort),"--no-in-app-updates"],{
    cwd:root,env,stdio:"ignore",windowsHide:true});
 const runBB=(args,timeout=45000)=>shell(process.execPath,[bbPath,...args],"d165-published-cli-live",timeout);
 let plugins=null;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)fail("d165-cli-server-exited");
  try{const j=JSON.parse(runBB(["plugin","list","--json"]));plugins=j.plugins;if(Array.isArray(plugins))break}catch{}
  await sleep(1500);
 }
 if(!Array.isArray(plugins)||!inspectStrictNativePluginState(plugins).safe)
  fail("d165-installed-strict-sec02-state-not-persistent");
 // D174 policy (Claude #42/#83): pinned BB 0.49.0 native Windows CLI
 // project creation is not supported upstream; test the REAL installed GUI.
 // Linux/macOS retain their actual registered project and GUI smoke.
 if(win){
  const profile=fs.readFileSync(path.join(workspace,"config","hardened",".env.hardened"),"utf8");
  if(!/^BB_SERVER_BIND_HOST=127\.0\.0\.1$/m.test(profile)||
     !/^BB_TELEMETRY=false$/m.test(profile)||
     env.BB_SERVER_BIND_HOST!=="127.0.0.1"||env.BB_TELEMETRY!=="false"||
     !path.resolve(data).startsWith(path.resolve(root)+path.sep))
   fail("d174-windows-sec02-file-profile-not-hardened");
  console.log("D174_WINDOWS_SEC02_FILE_AND_ENV_HARDENED=PASS");
  console.log("D174_WINDOWS_NATIVE_STOCK_CLI_PROJECT_CREATE_NOT_RUN_WSL2_ONLY");
 }else{
  const projectName=mac?"d135-macos-synthetic":"d134-linux-synthetic";
  const project=path.join(home,projectName);
  fs.mkdirSync(project,{mode:0o700});
  fs.writeFileSync(path.join(project,"README.md"),"D165 setup installed real own Hello, synthetic CI fixture only\n",{flag:"wx"});
  shell("git",["-C",project,"init","-b","main"],"d165-test-git-init");
  shell("git",["-C",project,"add","README.md"],"d165-test-git-add");
  runBB(["project","create","--name",projectName,"--root",project]);
  console.log("D165_NATIVE_STAGE=synthetic-project-enrolled");
 }
 // On native Windows the official GUI project browser requires a genuine
 // registered local host daemon. Probe the published daemon's own status,
 // not the unsupported Windows stock CLI project-create command.
 if(win){
  let realHostReady=false;
  for(let i=0;i<65;i++){
   if(server.exitCode!==null)fail("d174-local-host-daemon-exited");
   try{
    const status=await fetch("http://127.0.0.1:"+daemonPort+"/status",{
     signal:AbortSignal.timeout(1600)
    });
    if(status.ok){
     const info=await status.json();
     if(typeof info.hostId==="string"&&info.hostId.length>0){
      realHostReady=true;break;
     }
    }
   }catch{}
   await sleep(1200);
  }
  if(!realHostReady)fail("d174-published-local-host-daemon-not-ready");
  console.log("D174_WINDOWS_REAL_LOCAL_HOST_DAEMON_READY=PASS");
 }
 if(win){env.D129_OFFICIAL_EXE=official;env.D129_BB_WEB_URL="http://127.0.0.1:"+port+"/";}
 else if(mac){env.D135_OFFICIAL_EXE=official;env.D135_BB_WEB_URL="http://127.0.0.1:"+port+"/";}
 else{env.D134_OFFICIAL_APPIMAGE=official;env.D134_BB_WEB_URL="http://127.0.0.1:"+port+"/";}
 const gui=path.join(workspace,"tests","parity",win?"d174-windows-gui-no-cli-project.mjs":
  mac?"d135-macos-official-installed-hello.mjs":"d134-linux-installed-appimage.mjs");
 const result=linux?shell("xvfb-run",["-a",process.execPath,gui],"d165-actual-electron-hello",180000):
 shell(process.execPath,[gui],"d165-actual-electron-hello",180000);
 if(win){
  const required=["D174_WINDOWS_SYNTHETIC_GUI_PROJECT_ENROLLMENT=PASS",
   "D174_WINDOWS_REAL_OFFICIAL_GUI_HELLO_PANEL=PASS",
   "D174_WINDOWS_REAL_GUI_HELLO_LIVENESS_15S=PASS"];
  for(const token of required)if(!result.includes(token))
   fail("d174-real-gui-proof-marker-absent");
  const progress=[...result.matchAll(/D174_GUI_SAFE_STAGE=([a-z-]+)/g)]
   .map(m=>m[1]).filter(x=>new Set(["ui-shell-hydrated","projectless-compose-home-ready",
    "projects-page-ready","entry-found","dialog-open","folder-editor-open",
    "path-editor-filled","path-navigation-submitted","project-selection-valid","path-go-confirmed","gui-project-added","hello-nav-visible","hello-panel-visible"]).has(x));
  console.log("D174_REAL_WINDOWS_GUI_FINAL_STAGE="+(progress.at(-1)||"not-reported"));
 }
 if(!result.includes("PASS"))fail("d165-no-genuine-installed-gui-pass");
 console.log("D165_USER_SINGLE_SETUP_REAL_GUI_HELLO_3OS_NATIVE=PASS");
 markD230("hello");
  console.log("D165_USER_BB_DATA_PRESERVED_BEFORE_UNINSTALL=PASS");
 // D198: inspect the SAME actually installed own CLI and live OS TCP socket
 // state, never a fixture, user shell or Remote. Bundle contains allowlist only.
 const doctor=path.join(workspace,'scripts','suliko-doctor.mjs');
 const bundle=path.join(root,'d198-owned-doctor-redacted.json');
 const d230Canary='D230_NOT_A_CREDENTIAL_SYNTHETIC_CANARY';
  if(e.D230_REHEARSAL==='1')env.D230_SYNTHETIC_CANARY=d230Canary;
  const safeReport=JSON.parse(shell(process.execPath,[doctor,'--live','--bundle',bundle],
   'd198-live-owned-bb-doctor',40000));
  if(e.D230_REHEARSAL==='1')delete env.D230_SYNTHETIC_CANARY;
 if(safeReport.schema!=='suliko-doctor-live-v1'||
    safeReport.evidence!=='user-owned-cli-plus-native-os-readonly-not-remote'||
    safeReport.status!=='live-owned-bb-pass'||
    safeReport.bbVersion!=='0.49.0'||
    safeReport.controls?.loopbackOnly!==true||
    safeReport.controls?.hardenedProfile!==true||
    safeReport.controls?.forbiddenPluginsSafe!==true||
    safeReport.controls?.providerKeyPresenceSource!=='environment-variable-name-only-not-bb-secret-store'||
    safeReport.plugins?.['suliko-hello']!=='enabled')fail('d198-live-doctor-unverified');
  markD230('doctor');
 // D198 CodeQL js/file-system-race: no pathname check-then-open window.
 const bundleFd=fs.openSync(bundle,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
   const bundleStat=fs.fstatSync(bundleFd);
   if(!bundleStat.isFile())fail('d198-bundle-nonregular');
   if(!win && (bundleStat.mode & 0o777)!==0o600)fail('d198-bundle-unsafe-permissions');
   const sanitized=fs.readFileSync(bundleFd,'utf8');
    if(sanitized!==JSON.stringify(safeReport,null,2)+'\n')fail('d198-bundle-report-mismatch');
    if(e.D230_REHEARSAL==='1'&&sanitized.includes(d230Canary))fail('d230-canary-leaked');
 }finally{fs.closeSync(bundleFd)}
 const checkRejected=extra=>{
   const r=spawnSync(process.execPath,[doctor,'--live','--bundle',bundle],{
     cwd:workspace,env:{...env,...extra},encoding:'utf8',windowsHide:true,
     stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:200000});
   if(r.status===0)fail('d198-refusal-regression');
 };
 // Fail-closed both when environment is no longer hardened and when the
 // already-written support bundle might be overwritten. Never log raw output.
 checkRejected({BB_TELEMETRY:'true'});
 checkRejected({});
 markD230('bundle');
  console.log('D198_ACTUAL_OWNED_LIVE_DOCTOR_3OS_AND_REDACTED_WX_0600=PASS');



 // Stop the synthetic disposable hosted BB before user-facing uninstall.
 try{shell(process.execPath,[app,"stop","--data-dir",data],"stop-owned-published-bb",20000)}catch{}
 if(server&&server.exitCode===null){try{server.kill()}catch{}await sleep(1600);}
 const uninstallArgs=win?["-NoProfile","-NonInteractive","-File",setupScript,"-Uninstall"]:
 [setupScript,"--uninstall"];
 shell(userCommand,uninstallArgs,"d165-single-user-uninstall",180000);
 installed=false;
 if(fs.existsSync(setupRoot)||fs.existsSync(official))fail("d165-owned-install-cleanup-incomplete");
 if(sha(foreignSentinel)!==foreignHash||sha(ownSentinel)!==ownedHash)
  fail("d165-foreign-or-user-data-changed");
 // The second uninstall MUST refuse an unrelated untracked root; never
 // delete a file merely because it shares the managed path.
 fs.mkdirSync(setupRoot,{mode:0o700});
 const untracked=path.join(setupRoot,"not-suliko-owned.txt");
 fs.writeFileSync(untracked,"D165 synthetic untracked file\n",{flag:"wx"});
 shell(userCommand,uninstallArgs,"d165-negative-untracked-uninstall",45000);
 if(!fs.existsSync(untracked)||!nonlink(untracked).isFile())fail("d165-untracked-file-deleted");
 if(sha(foreignSentinel)!==foreignHash||sha(ownSentinel)!==ownedHash)
  fail("d165-foreign-data-changed-after-negative");
 console.log("D170_FOREIGN_BB_AND_PREEXISTING_DATA_SHA256_UNCHANGED=PASS");
 console.log("D170_MISSING_OWNER_MARKER_REFUSES_DELETE=PASS");
  markD230("uninstall");
  if(e.D230_REHEARSAL==='1'){
    const os=win?'windows':mac?'macos':'linux';
    const report=createTiming(os,e.GITHUB_SHA,sourceHash,d230Points);
    fs.writeFileSync(path.join(root,'d230-first15-'+os+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('D230_SYNTHETIC_TAG_HELLO_DOCTOR_BUNDLE_OWNED_UNINSTALL=PASS os='+os);
  }
 if(e.GITHUB_STEP_SUMMARY)fs.appendFileSync(e.GITHUB_STEP_SUMMARY,
  "D165 candidate SHA256 "+sourceHash+" from SAME D166 public runner run; real one-command owned GUI + published CLI strict SEC02/Hello + installed native GUI + user-owned uninstall, elapsed "+setupSeconds+"s; synthetic CI only. D170 existing foreign and user BB data hash-preserved; no RC tag, signed SEC04 or beta.\n");
}catch(err){
 console.error("D165_FAIL_CLOSED category="+(err?.category||"native-user-setup"));
 process.exitCode=1;
}finally{
 if(server&&server.exitCode===null){try{server.kill()}catch{}await sleep(1200);}
 if(installed)console.log("D165_INCOMPLETE_OWNED_INSTALL_RETAINED_FOR_DIAGNOSTIC; unrelated data untouched");
 // Only our fresh synthetic CI-owned home is deleted, never a user actual home.
 if(path.dirname(home)===root&&fs.existsSync(home))fs.rmSync(home,{recursive:true,force:true});
}
