// D066: Linux loopback-only BB + installed own-plugin 30-minute RSS soak.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const MiB=1024*1024;
export function median(values) {
  if(!Array.isArray(values)||!values.length||values.some(v=>!Number.isFinite(v)||v<=0))
    throw Error("Invalid positive RSS sample series");
  const x=[...values].sort((a,b)=>a-b);
  return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2;
}
export function p95(values) {
  if(!Array.isArray(values)||!values.length)throw Error("No RSS samples");
  const x=[...values].sort((a,b)=>a-b);
  return x[Math.ceil(x.length*0.95)-1];
}
export function evaluateSoak(samples,durationSeconds) {
  if(durationSeconds<1800)throw Error("Full soak acceptance requires at least 30 minutes");
  const baseline=samples.filter(s=>s.sec>=60 && s.sec<180).map(s=>s.rss);
  const late=samples.filter(s=>s.sec>=durationSeconds-300).map(s=>s.rss);
  if(baseline.length<4||late.length<10)throw Error("Insufficient warmup or final-window RSS evidence");
  const base=median(baseline),last=p95(late),growth=last-base;
  const threshold=Math.max(base*0.30,64*MiB);
  return {base,last,growth,threshold,passed:growth<=threshold};
}
function listenerPid(port) {
  const ss=spawnSync("ss",["-H","-ltnp"],{encoding:"utf8",timeout:5000});
  if(ss.error||ss.status!==0)throw Error("ss process listener discovery failed");
  const lines=ss.stdout.split("\n").filter(line=>new RegExp(":"+port+"(?:\\s|$)").test(line));
  const pids=[...new Set(lines.flatMap(line=>[...line.matchAll(/pid=(\d+)/g)].map(m=>Number(m[1]))))];
  if(pids.length!==1)throw Error("Disposable loopback server PID missing or ambiguous");
  return pids[0];
}
function readRss(pid) {
  const status=readFileSync("/proc/"+pid+"/status","utf8");
  const match=/^VmRSS:\s*(\d+)\s*kB$/m.exec(status);
  if(!match)throw Error("Could not read exact Linux server RSS");
  return Number(match[1])*1024;
}
async function health(port) {
  const r=await fetch("http://127.0.0.1:"+port+"/health",{signal:AbortSignal.timeout(3000)});
  if(!r.ok)throw Error("BB loopback /health failed HTTP "+r.status);
}
async function main() {
  const port=Number(process.env.BB_SERVER_PORT);
  const duration=Number(process.env.D066_SOAK_SECONDS||"1800");
  if(!Number.isInteger(port)||port!==38891||duration!==1800)throw Error("Only fixed 38891 and 1800s full soak permitted");
  const pid=listenerPid(port);
  const samples=[],started=performance.now();
  while(performance.now()-started<duration*1000) {
    const currentPid=listenerPid(port);
    if(currentPid!==pid)throw Error("BB server listener was restarted during soak");
    await health(port);
    const sec=(performance.now()-started)/1000;
    samples.push({sec,rss:readRss(pid)});
    await new Promise(resolve=>setTimeout(resolve,15000));
  }
  await health(port);
  const result=evaluateSoak(samples,duration);
  const line="D066 30-minute Linux BB+Hello soak: samples="+samples.length+
    " baselineMiB="+(result.base/MiB).toFixed(1)+
    " finalP95MiB="+(result.last/MiB).toFixed(1)+
    " deltaMiB="+(result.growth/MiB).toFixed(1)+
    " allowedMiB="+(result.threshold/MiB).toFixed(1)+
    " pass="+result.passed;
  console.log(line);
  if(process.env.GITHUB_STEP_SUMMARY) {
    const fs=await import("node:fs");
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,line+"\n"+
      "No system-wide leak or cross-OS acceptance claimed; exact Linux listener PID and /health were required throughout.\n");
  }
  if(!result.passed)throw Error("D066 sustained server RSS growth exceeded warmup-adjusted bound");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e=>{console.error("D066 soak failed closed:",e.message);process.exitCode=1;});
