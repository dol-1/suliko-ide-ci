// D244: synthetic-only doctor bundle redaction; no real credentials, user paths, or devices.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script=path.resolve('scripts/suliko-doctor.mjs');
const basic=()=>({bbVersion:'0.49.0',listenerHost:'127.0.0.1',profileHardened:true,
  providerKeyPresent:false,plugins:{'account-pool':'disabled','bb--mcp':'disabled',
  connect:'disabled','bb--connect-next':'disabled',memory:'disabled',
  'suliko-hello':'enabled','suliko-remote-panel':'absent'}});
const forms=[
  'plain-secret','opaque-access-token','bearer-header','sk-example-token',
  'github-like-key','anthropic-like-key','google-like-key','pem-header',
  'pem-footer','json-escaped-secret','url-query-credential','url-fragment-credential',
  'unix-home-username','mac-home-username','windows-users-username',
  'local-appdata-path','env-openai-key','env-anthropic-key','env-google-key',
  'authorization-json','http-cookie','oauth-refresh-field','private-ssh-key-marker',
  'base64-looking-value','url-encoded-value','unicode-secret-marker',
  'trailing-newline-text','colon-separated-token','nested-provider-key',
  'plugin-description-key','cli-stderr-category','socket-host-suffix'
];
function call(args,extraEnv={}){
 return spawnSync(process.execPath,[script,...args],{cwd:process.cwd(),encoding:'utf8',
  env:{...process.env,...extraEnv},timeout:15000,maxBuffer:30000,windowsHide:true});
}
test('D244 at least 20 distinct synthetic secret formats never serialize into bundle or diagnostics',()=>{
 assert.ok(forms.length>=20,'D244_NOT_ENOUGH_FORMATS');
 for(let i=0;i<forms.length;i++){
  const marker='SYNTH_D244_ONLY_'+String(i).padStart(3,'0')+'_'+forms[i].replaceAll('-','_');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d244-bounded-'));
  try{
   const fixture=path.join(root,'input.json'),bundle=path.join(root,'bundle.json');
   const obj=basic();
   if(i%8===0)obj.notes={log:marker,extra:[{deep:{token:marker}}]};
   else if(i%8===1)obj.bbVersion=marker;
   else if(i%8===2)obj.listenerHost=marker;
   else if(i%8===3)obj.providerKeyPresent=marker;
   else if(i%8===4)obj.plugins['suliko-hello']=marker;
   else if(i%8===5)obj.plugins['account-pool']=marker;
   else if(i%8===6)obj.plugins['arbitrary-hidden-'+i]=marker;
   else obj.diagnostic={env:{OPENAI_API_KEY:marker},path:'/home/'+marker+'/config',url:'https://example.invalid/?token='+marker};
   fs.writeFileSync(fixture,JSON.stringify(obj),{flag:'wx',mode:0o600});
   const child=call(['--fixture',fixture,'--bundle',bundle],{
     OPENAI_API_KEY:'SYNTH_D244_ENV_NOT_REAL_'+marker,
     ANTHROPIC_API_KEY:'SYNTH_D244_ENV_NOT_REAL_'+marker,
     GOOGLE_API_KEY:'SYNTH_D244_ENV_NOT_REAL_'+marker
   });
   assert.ok(child.status===0||child.status===1,'D244_UNEXPECTED_EXIT');
   assert.ok(fs.existsSync(bundle),'D244_MISSING_BUNDLE');
   const data=fs.readFileSync(bundle,'utf8');
   const all=data+String(child.stdout||'')+String(child.stderr||'');
   assert.ok(data.length>100&&data.length<4000,'D244_UNBOUNDED_REPORT');
   assert.ok(!all.includes(marker),'D244_SECRET_LEAK_'+i);
   assert.ok(!all.includes('SYNTH_D244_ENV_NOT_REAL_'),'D244_ENV_LEAK_'+i);
   const out=JSON.parse(data);
   assert.equal(out.schema,'suliko-doctor-offline-v1');
   assert.equal(typeof out.controls.providerKeyPresent,'boolean');
   assert.ok(out.status==='review-required'||out.status==='synthetic-fixture-pass');
   assert.equal(child.stdout,data,'D244_REPORT_BUNDLE_DIVERGED');
   if(process.platform!=='win32')assert.equal(fs.statSync(bundle).mode&0o777,0o600,'D244_PRIVATE_MODE');
  }finally{fs.rmSync(root,{recursive:true,force:true})}
 }
});
test('D244 live failed preconditions emit only bounded stage, never actual synthetic env contents',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'d244-empty-owned-'));
 const marker='SYNTH_D244_ENV_LIVE_NEVER_LOG_VALUE';
 try{
  const child=call(['--live'],{HOME:root,LOCALAPPDATA:root,
   OPENAI_API_KEY:marker,ANTHROPIC_API_KEY:marker,GOOGLE_API_KEY:marker});
  assert.notEqual(child.status,0,'D244_LIVE_UNAUTHORIZED');
  const text=String(child.stdout||'')+String(child.stderr||'');
  assert.ok(!text.includes(marker),'D244_LIVE_ENV_DISCLOSED');
  assert.ok(!text.includes(root),'D244_LIVE_PATH_DISCLOSED');
  assert.ok(text.length<1000,'D244_VERBOSE_FAILURE');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('D244 existing bundle is write-once and never replaced',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'d244-existing-'));
 try{
  const fixture=path.join(root,'input.json'),bundle=path.join(root,'bundle.json');
  const sentinel='SYNTH_D244_PREEXISTING_FILE_NOT_SECRET';
  fs.writeFileSync(fixture,JSON.stringify(basic()),{flag:'wx',mode:0o600});
  fs.writeFileSync(bundle,sentinel,{flag:'wx',mode:0o600});
  const child=call(['--fixture',fixture,'--bundle',bundle]);
  assert.equal(child.status,2,'D244_OVERWRITE_NOT_REFUSED');
  assert.equal(fs.readFileSync(bundle,'utf8'),sentinel,'D244_EXISTING_FILE_MUTATED');
  assert.ok(!String(child.stderr||'').includes(bundle),'D244_PATH_ECHO');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
