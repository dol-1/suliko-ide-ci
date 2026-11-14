// D125: only disposable CI-host native Mac/Win actual pinned stock BB CLI reads.
// Never run on owner machine or return raw CLI output, personal paths or secrets.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { connect } from "node:net";
const e=process.env, root=e.RUNNER_TEMP&&resolve(e.RUNNER_TEMP);
if(e.CI!=="true"||e.GITHUB_ACTIONS!=="true"||!["macOS","Windows"].includes(e.RUNNER_OS)||
   !root||e.BB_TELEMETRY!=="false"||e.BB_SERVER_BIND_HOST!=="127.0.0.1"||
   e.BB_SERVER_PORT!=="38884"||e.BB_HOST_DAEMON_PORT!=="38885"||
   e.BB_APP_VERSION!==undefined)throw Error("D125 not a disposable native runner");
const data=join(root,"d059-live-data"),home=join(root,"d125-native-home");
const app=resolve("stock-bb/packages/bb-app/dist/bb-app.js");
const bin=resolve("stock-bb/packages/bb-app/dist/bb.js");
if(!existsSync(app)||!existsSync(bin)||existsSync(data)||existsSync(home))
  throw Error("D125 stock build absent or owned fixture preexists");
mkdirSync(data,{recursive:false,mode:0o700});
mkdirSync(home,{recursive:false,mode:0o700});
for(const n of ["Roaming","Local"])mkdirSync(join(home,n),{mode:0o700});
const env={...e,BB_DATA_DIR:data,HOME:home,USERPROFILE:home,APPDATA:join(home,"Roaming"),
 LOCALAPPDATA:join(home,"Local"),BB_TELEMETRY:"false"};
function cli(args){try{return execFileSync(process.execPath,[bin,...args],{
  env,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:15000,maxBuffer:1024*1024
});}catch{throw Error("D125 sanitized pinned CLI command failed");}}
function json(args){let d;try{d=JSON.parse(cli(args));}catch{throw Error("D125 invalid pinned CLI JSON");}return d;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const socket=(port)=>new Promise(resolveResult=>{
 const c=connect({host:"127.0.0.1",port,timeout:1500});
 let settled=false;
 const finish=ok=>{if(settled)return;settled=true;c.destroy();resolveResult(ok)};
 c.on("connect",()=>finish(true));c.on("error",()=>finish(false));
 c.on("timeout",()=>finish(false));
});
const forbidden=new Set(["account-pool","bb--mcp","connect","bb--connect-next","memory"]);
let server=null;
try{
 server=spawn(process.execPath,[app,"start","--data-dir",data,
  "--server-bind-host","127.0.0.1","--server-port","38884",
  "--host-daemon-port","38885","--no-in-app-updates"],
  {env,stdio:["ignore","ignore","ignore"],windowsHide:true});
 let ready=false;
 for(let i=0;i<40;i++){
   if(server.exitCode!==null)throw Error("D125 isolated BB server quit unexpectedly");
   try{const list=json(["plugin","list","--json"]);
     if(Array.isArray(list.plugins)){ready=true;break;}
   }catch{/* synthetic startup not yet ready; do not print details */}
   await delay(1500);
 }
 if(!ready)throw Error("D125 isolated stock server readiness failed");
 const list=json(["plugin","list","--json"]);
 if(!Array.isArray(list.plugins)||list.plugins.some(x=>!x||typeof x.id!=="string"))
   throw Error("D125 unexpected plugin list");
 for(const [id,records] of [...forbidden].map(id=>[id,list.plugins.filter(x=>x.id===id)])){
   if(records.length>1||records.some(x=>typeof x.enabled!=="boolean"))
     throw Error("D125 conflicting forbidden plugin state");
   if(records.length===1&&records[0].enabled===true)cli(["plugin","disable",id]);
 }
 if(!await socket(38884)||!await socket(38885))
   throw Error("D125 actual loopback sockets not responding");
 const output=execFileSync(process.execPath,
   ["scripts/d059-live-ci-readonly.mjs","--ci-disposable","--bundle",join(root,"d059-support-bundle.json")],
   {env,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:1024*1024});
 let report;try{report=JSON.parse(output);}catch{throw Error("D125 doctor reduced report not JSON");}
 if(report.status!=="partial-runtime-pass"||Object.values(report.checks).some(x=>x!==true)||
    report.providerKeyPresence?.openai!=="absent"||
    report.providerKeyPresence?.anthropic!=="absent"||
    report.providerSettingsAndHooks!=="NOT_INSPECTED")
   throw Error("D125 native doctor categorical assertions failed");
 const bundlePath=join(root,"d059-support-bundle.json"),stat=lstatSync(bundlePath);
 if(!stat.isFile()||stat.isSymbolicLink()||(e.RUNNER_OS==="macOS"&&(stat.mode&0o777)!==0o600))
   throw Error("D125 private bundle file type/mode failed");
 const bundle=readFileSync(bundlePath,"utf8");
 if(JSON.stringify(JSON.parse(bundle))!==JSON.stringify(report)||
   bundle.includes(root)||bundle.includes(home)||
   /"(token|key|password|dataDir|raw|email)"\s*:/.test(bundle))
   throw Error("D125 support bundle reduced-schema privacy mismatch");
 console.log("D125_ACTUAL_STOCK_"+e.RUNNER_OS.toUpperCase()+"_DOCTOR=PASS");
 console.log("D125_BUNDLE_PRIVATE_FIXED_SCHEMA=PASS; native OS security ACL independently NOT audited");
}finally{
 try{execFileSync(process.execPath,[app,"stop","--data-dir",data],{
   env,stdio:"ignore",timeout:15000});}catch{}
 if(server && server.exitCode===null){server.kill();await delay(1000);if(server.exitCode===null)server.kill("SIGKILL");}
 // Only exact paths that did not preexist, both inside runner-managed temporary root.
 for(const path of [data,home]){
   if(path.startsWith(root+"/")||path.startsWith(root+"\\")){
     try{rmSync(path,{recursive:true,force:true});}catch{}
   }
 }
}
