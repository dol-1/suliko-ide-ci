// D234: versioned, read-only, fail-closed response boundary for fixture/mock Remote UI.
// This is NOT a live Remote API or permission/authentication contract.
import type {TestApproval,TestDevice,TestJob} from './mock-remote.js';
export const REMOTE_MOCK_SCHEMA_VERSION=1 as const;
const idPattern=/^[a-zA-Z0-9_-]{1,64}$/;
const denySensitive=/(?:\bBearer\s+\S+|gh[pso]_[a-z0-9_-]{16,}|sk-[a-z0-9_-]{16,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function token(x:unknown):string{
 if(typeof x!=='string'||!idPattern.test(x))throw Error('D234_INVALID_ID');
 return x;
}
function label(x:unknown):string{
 if(typeof x!=='string'||!x.trim()||x.length>160||/[<>\\\u0000-\u001f\u007f]/u.test(x)||denySensitive.test(x))throw Error('D234_INVALID_PUBLIC_LABEL');
 return x;
}
export function validateMockSnapshot(devices:unknown,approvals:unknown,job:unknown):{
 schemaVersion:typeof REMOTE_MOCK_SCHEMA_VERSION;
 devices:readonly TestDevice[];approvals:readonly TestApproval[];job:TestJob;
}{
 if(!Array.isArray(devices)||devices.length>64)throw Error('D234_INVALID_DEVICE_LIST');
 if(!Array.isArray(approvals)||approvals.length>16)throw Error('D234_INVALID_APPROVAL_LIST');
 if(!record(job))throw Error('D234_INVALID_JOB');
 const seenDevices=new Set<string>();
 const safeDevices:TestDevice[]=devices.map(d=>{
  if(!record(d))throw Error('D234_INVALID_DEVICE');
  const id=token(d.id),name=label(d.label);
  if(seenDevices.has(id)||!(d.status==='online'||d.status==='offline'))throw Error('D234_INVALID_DEVICE_STATE');
  seenDevices.add(id);
  return {id,label:name,status:d.status};
 });
 const seenApprovals=new Set<string>();
 const safeApprovals:TestApproval[]=approvals.map(a=>{
  if(!record(a))throw Error('D234_INVALID_APPROVAL');
  const id=token(a.id),deviceId=token(a.deviceId),name=label(a.label);
  if(seenApprovals.has(id)||a.status!=='pending'||typeof a.approvalPageUrl!=='string'||a.approvalPageUrl.length>500)
   throw Error('D234_INVALID_APPROVAL_STATE');
  seenApprovals.add(id);
  // URL is NOT rendered as a link without the existing independent example.invalid allowlist.
  return {id,deviceId,label:name,status:'pending',approvalPageUrl:a.approvalPageUrl};
 });
 const id=token(job.id),deviceId=token(job.deviceId);
 const outcomes=['succeeded','failed','denied','pending','unknown'] as const;
 if(!outcomes.some(x=>x===job.status))throw Error('D234_INVALID_JOB_STATUS');
 return {schemaVersion:REMOTE_MOCK_SCHEMA_VERSION,devices:safeDevices,approvals:safeApprovals,
  job:{id,deviceId,status:job.status as TestJob['status']}};
}
