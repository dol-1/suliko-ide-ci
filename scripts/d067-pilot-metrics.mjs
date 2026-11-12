// D-067 synthetic-only pilot metrics. No real participant data, identifiers, or telemetry.
// Source: private PILOT-METRICS-PROTOCOL.md + Claude E10 #36.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const fields=new Set(["consent_status","install_attempted","install_completed","install_minutes",
  "first_task_completed","first_task_elapsed_minutes","day7_eligible",
  "day_1","day_2","day_3","day_4","day_5","day_6","day_7",
  "crash_count","observed_participant_days","remote_exposed","remote_panel_viewed",
  "remote_approval_eligible","remote_approval_attempts","remote_approval_successes",
  "willingness_to_pay"]);
const required=["consent_status","install_attempted","install_completed","first_task_completed","day7_eligible",
  "remote_exposed","remote_approval_eligible","willingness_to_pay"];
const states=new Set(["yes","no","missing"]);
const paid=new Set(["yes","no","unsure","declined"]);
function finiteNonnegative(v) { return typeof v==="number" && Number.isFinite(v) && v>=0; }
function nonnegativeInt(v) { return Number.isSafeInteger(v) && v>=0; }
function must(condition,reason) { if(!condition) throw Error("D067 invalid synthetic fixture: "+reason); }

export function nearestRank(xs,p) {
  if(!xs.length) return null;
  const sorted=[...xs].sort((a,b)=>a-b);
  return sorted[Math.ceil(p*sorted.length)-1];
}
export function analyze(obj) {
  must(obj!==null&&typeof obj==="object"&&!Array.isArray(obj),"object expected");
  must(Object.keys(obj).sort().join(",")==="rows,synthetic", "only rows and synthetic top-level keys permitted");
  must(obj.synthetic===true,"synthetic:true required; real participant data prohibited");
  must(Array.isArray(obj.rows)&&obj.rows.length<=100,"rows must be an array of at most 100 synthetic records");
  for(const r of obj.rows){
    must(r!==null&&typeof r==="object"&&!Array.isArray(r),"each row must be object");
    for(const key of Object.keys(r)) must(fields.has(key),"unknown field (possible identifying data)");
    for(const key of required) must(Object.hasOwn(r,key),"missing required field");
    must(["yes","withdrawn"].includes(r.consent_status),"bad consent status");
    for(const key of ["install_attempted","install_completed","first_task_completed","day7_eligible","remote_exposed","remote_approval_eligible"]){
      must(typeof r[key]==="boolean","bad boolean "+key);
    }
    must(paid.has(r.willingness_to_pay),"bad willingness-to-pay category");
    for(let i=1;i<=7;i++) must(states.has(r["day_"+i]),"bad day_"+i+" status");
    for(const key of ["install_minutes","first_task_elapsed_minutes"]){
      must(r[key]===null||finiteNonnegative(r[key]),"bad duration "+key);
    }
    for(const key of ["crash_count","observed_participant_days","remote_approval_attempts","remote_approval_successes"]){
      must(r[key]===null||nonnegativeInt(r[key]),"bad nonnegative integer "+key);
    }
    must(["yes","no","na"].includes(r.remote_panel_viewed),"bad remote panel flag");
    must(!r.install_completed||r.install_attempted,"completed installation without attempt");
    must(!r.first_task_completed||r.install_completed,"first task without completed install");
    must(!r.day7_eligible||r.install_completed,"day7 eligibility without install");
    must(r.install_completed===(r.install_minutes!==null),"install timing presence must match completion");
    must(r.first_task_completed===(r.first_task_elapsed_minutes!==null),"first-task timing presence must match completion");
    must(!r.remote_exposed?r.remote_panel_viewed==="na":r.remote_panel_viewed!=="na","remote panel exposure mismatch");
    if(r.remote_approval_eligible){
      must(r.remote_approval_attempts!==null&&r.remote_approval_successes!==null,"missing authoritative synthetic approval counts");
      must(r.remote_approval_successes<=r.remote_approval_attempts,"approval successes exceed attempts");
    } else {
      must(r.remote_approval_attempts===null&&r.remote_approval_successes===null,"noneligible remote approval cannot have counts");
    }
    if(r.consent_status==="withdrawn")must(!r.day7_eligible,"withdrawn row may not retain follow-up eligibility");
  }
  const active=obj.rows.filter(x=>x.consent_status==="yes");
  const eligible=active.filter(x=>x.day7_eligible);
  const installed=active.filter(x=>x.install_completed);
  const attempted=active.filter(x=>x.install_attempted);
  const task=active.filter(x=>x.first_task_completed);
  const durations=(xs)=>({n:xs.length,p50:nearestRank(xs,.5),p90:nearestRank(xs,.9)});
  const remoteEligible=active.filter(x=>x.remote_approval_eligible);
  const approvals=remoteEligible.reduce((v,x)=>v+x.remote_approval_attempts,0);
  const successes=remoteEligible.reduce((v,x)=>v+x.remote_approval_successes,0);
  const panelExposed=active.filter(x=>x.remote_exposed);
  const observedDays=active.reduce((v,x)=>v+(x.observed_participant_days??0),0);
  const crashes=active.reduce((v,x)=>v+(x.crash_count??0),0);
  const consentedDay7=eligible.filter(x=>x.day_7==="yes");
  const missingDay7=eligible.filter(x=>x.day_7==="missing");
  return {
    status:"SYNTHETIC DEMONSTRATION ONLY — NO REAL PARTICIPANTS",
    activeSyntheticRows:active.length,withdrawnSyntheticRows:obj.rows.length-active.length,
    installation:{attempted:attempted.length,completed:installed.length,
      minutes:durations(installed.map(x=>x.install_minutes))},
    firstTask:{attempted:attempted.length,completed:task.length,
      elapsedMinutes:durations(task.map(x=>x.first_task_elapsed_minutes))},
    day7:{eligible:eligible.length,returned:consentedDay7.length,missing:missingDay7.length,
      explicitNo:eligible.filter(x=>x.day_7==="no").length,
      repeatTwoOrMoreDays:eligible.filter(x=>Array.from({length:7},(_,i)=>x["day_"+(i+1)]).filter(v=>v==="yes").length>=2).length},
    dailyUse:Object.fromEntries(Array.from({length:7},(_,i)=>["day_"+(i+1),active.filter(x=>x["day_"+(i+1)]==="yes").length])),
    crashCoverage:{crashes,observedParticipantDays:observedDays,
      rate:observedDays?crashes/observedDays:null},
    remotePanel:{exposed:panelExposed.length,viewed:panelExposed.filter(x=>x.remote_panel_viewed==="yes").length},
    remoteApproval:{attempts:approvals,successes,
      rate:approvals?successes/approvals:null,note:"N/A when no synthetic authoritative Remote attempts"},
    willingnessToPay:Object.fromEntries([...paid].map(x=>[x,active.filter(r=>r.willingness_to_pay===x).length])),
  };
}
function main(argv){
  must(argv.length===2&&argv[0]==="--synthetic-input","usage: --synthetic-input <local synthetic JSON>; no real data");
  // Never echo JSON parser excerpts: Node's SyntaxError may include the
  // original malformed content, which is unacceptable for confidential input.
  let json;
  try { json=JSON.parse(readFileSync(resolve(argv[1]),"utf8")); }
  catch { throw Error("synthetic JSON fixture cannot be read or parsed"); }
  console.log(JSON.stringify(analyze(json),null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{main(process.argv.slice(2));}catch(e){console.error("D067 invalid/sensitive input refused; no row data emitted:",e.message);process.exitCode=1;}
}
