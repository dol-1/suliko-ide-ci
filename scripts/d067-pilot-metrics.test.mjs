import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyze,nearestRank } from "./d067-pilot-metrics.mjs";
const row=(overrides={})=>({
  consent_status:"yes",install_attempted:true,install_completed:true,install_minutes:11,
  first_task_completed:true,first_task_elapsed_minutes:22,day7_eligible:true,
  day_1:"yes",day_2:"yes",day_3:"no",day_4:"missing",day_5:"no",day_6:"no",day_7:"yes",
  crash_count:0,observed_participant_days:7,remote_exposed:false,remote_panel_viewed:"na",
  remote_approval_eligible:false,remote_approval_attempts:null,remote_approval_successes:null,
  willingness_to_pay:"unsure",...overrides
});
const fixture=(rows=[])=>({synthetic:true,rows});
test("nearest-rank percentiles are explicit",()=>{
  assert.equal(nearestRank([4,7,11,13,20],.5),11);
  assert.equal(nearestRank([4,7,11,13,20],.9),20);
  assert.equal(nearestRank([],.5),null);
});
test("zero participants never fabricate pilot performance",()=>{
  const r=analyze(fixture());
  assert.equal(r.installation.minutes.p50,null);
  assert.equal(r.firstTask.elapsedMinutes.p90,null);
  assert.equal(r.remoteApproval.rate,null);
  assert.equal(r.day7.eligible,0);
  assert.match(r.status,/SYNTHETIC/);
});
test("missing is not false and failures stay in denominators",()=>{
  const r=analyze(fixture([
    row({install_minutes:4,first_task_elapsed_minutes:8,day_7:"missing"}),
    row({install_minutes:11,first_task_elapsed_minutes:20,day_7:"no"}),
    row({install_attempted:true,install_completed:false,install_minutes:null,
      first_task_completed:false,first_task_elapsed_minutes:null,day7_eligible:false,
      day_7:"missing",day_1:"missing",day_2:"missing"}),
  ]));
  assert.equal(r.installation.attempted,3);
  assert.equal(r.installation.completed,2);
  assert.equal(r.installation.minutes.p50,4);
  assert.equal(r.installation.minutes.p90,11);
  assert.equal(r.day7.eligible,2);
  assert.equal(r.day7.missing,1);
  assert.equal(r.day7.explicitNo,1);
  assert.equal(r.day7.returned,0);
});
test("only eligible authoritative synthetic Remote attempts count",()=>{
  const r=analyze(fixture([
    row({remote_exposed:true,remote_panel_viewed:"yes",remote_approval_eligible:true,
      remote_approval_attempts:3,remote_approval_successes:2}),
    row({remote_exposed:true,remote_panel_viewed:"yes"}),
  ]));
  assert.equal(r.remotePanel.viewed,2);
  assert.equal(r.remoteApproval.attempts,3);
  assert.equal(r.remoteApproval.rate,2/3);
});
test("withdrawn rows excluded without retaining identity",()=>{
  const r=analyze(fixture([row(),row({consent_status:"withdrawn",day7_eligible:false})]));
  assert.equal(r.activeSyntheticRows,1);
  assert.equal(r.withdrawnSyntheticRows,1);
  assert.equal(r.firstTask.completed,1);
});
test("unexpected free text or PII-like keys fail closed",()=>{
  for(const key of ["email","participant_id","full_name","raw_logs","api_key","feedback_notes","repository_url"]){
    assert.throws(()=>analyze(fixture([row({[key]:"private"})])),/unknown field/);
  }
  assert.throws(()=>analyze({rows:[row()],synthetic:false}),/synthetic:true/);
  assert.throws(()=>analyze(fixture([row({day_7:"unknown"})])),/bad day_7/);
  assert.throws(()=>analyze(fixture([row({remote_approval_eligible:true,remote_approval_attempts:1,remote_approval_successes:2})])),/exceed/);
});
