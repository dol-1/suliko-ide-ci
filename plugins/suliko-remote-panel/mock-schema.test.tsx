// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {RemotePanel} from './app.js';
import {demoRemote,type RemoteReadOnlyMockPort} from './mock-remote.js';
import {REMOTE_MOCK_SCHEMA_VERSION,validateMockSnapshot} from './mock-schema.js';
afterEach(()=>cleanup());
const valid={
 devices:[{id:'demo-device-1',label:'Demo Laptop',status:'online'}],
 approvals:[{id:'demo-approval-1',deviceId:'demo-device-1',label:'Fixture-only write request',status:'pending',
  approvalPageUrl:'https://remote.example.invalid/approvals/demo-approval-1'}],
 job:{id:'demo-job-1',deviceId:'demo-device-1',status:'unknown'},
};
function check(d:unknown=valid.devices,a:unknown=valid.approvals,j:unknown=valid.job){
 return validateMockSnapshot(d,a,j);
}
describe('D234 version 1 read-only mock response contract',()=>{
 it('accepts only bounded schema and independently preserves allowlisted URL gate',()=>{
  const good=check();
  expect(good.schemaVersion).toBe(REMOTE_MOCK_SCHEMA_VERSION);
  expect(good.devices[0]?.status).toBe('online');
  expect(good.job.status).toBe('unknown');
 });
 it('rejects missing fields, bad states, oversized payloads and duplicate IDs',()=>{
  for(const bad of [
   {devices:null},{devices:[] as never[],job:{...valid.job,status:'approved'}},
   {devices:[{...valid.devices[0],id:'../../secret'}]},
   {devices:[{...valid.devices[0],label:'<script>'}]},
   {devices:[{...valid.devices[0],label:'sk-abcdefghijklmnop'}]},
   {devices:Array.from({length:65},()=>valid.devices[0])},
   {devices:[valid.devices[0],valid.devices[0]]},
   {approvals:Array.from({length:17},()=>valid.approvals[0])},
   {approvals:[{...valid.approvals[0],label:'x'.repeat(200)}]},
   {approvals:[{...valid.approvals[0],status:'approved'}]},
   {approvals:[{...valid.approvals[0],approvalPageUrl:'x'.repeat(501)}]},
   {job:{...valid.job,deviceId:''}},
   {job:{...valid.job,status:null}},
  ]){
   const d='devices' in bad?bad.devices:valid.devices;
   const a='approvals' in bad?bad.approvals:valid.approvals;
   const j='job' in bad?bad.job:valid.job;
   expect(()=>check(d,a,j)).toThrow(/D234_/);
  }
 });
 it('seeded property mutations 500 fail closed; no current/unknown state ever promoted',()=>{
  let state=0x1234abcd;
  const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  for(let i=0;i<500;i++){
   const n=rand()%10;
   const d=structuredClone(valid.devices),a=structuredClone(valid.approvals),j=structuredClone(valid.job);
   if(n===0)d[0]!.id='bad/id';
   if(n===1)d[0]!.label=' '.repeat(161);
   if(n===2)d[0]!.status='pending';
   if(n===3)a[0]!.id='x'.repeat(65);
   if(n===4)a[0]!.label='sk-EXAMPLE_NOT_REAL_xxxxxxxxx';
   if(n===5)a[0]!.status='approved';
   if(n===6)a[0]!.approvalPageUrl='x'.repeat(501);
   if(n===7)j.id='';
   if(n===8)j.status='approved';
   if(n===9)j.deviceId='bad/path';
   expect(()=>check(d,a,j)).toThrow(/D234_/);
  }
 });
 it('malformed response is a generic error; never renders fake write controls or raw material',async()=>{
  let statusReads=0;
  const port:RemoteReadOnlyMockPort={...demoRemote,
   list_devices:async()=>[{id:'../../secret',label:'sk-abcdefghijklmnop',status:'online'}] as never,
   get_approval_status:async(id)=>{statusReads++;return {id,status:'pending'};},
  };
  render(<RemotePanel readPort={port}/>);
  const alert=await screen.findByRole('alert');
  expect(alert.textContent).toMatch(/Unable to load demo data/);
  expect(document.body.textContent).not.toContain('sk-abcdefghijklmnop');
  expect(statusReads).toBe(0);
  expect(screen.queryByRole('link',{name:/approval/i})).toBeNull();
  expect(screen.queryByRole('button',{name:/approve|run command|write file/i})).toBeNull();
 });
});
