// D190 public CI ONLY: execute exactly documented allowlisted preview commands.
// No dynamic shell, no installer, no download, no production/Remote access.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const POSIX='bash scripts/suliko-setup.sh --dry-run';
const WINDOWS='pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -DryRun';
const page=lang=>fs.readFileSync('site/docs/install.'+lang+'.md','utf8');
function extract(text,platform){
  const expression=new RegExp('<!-- D190:'+platform+' -->\\s*```(?:bash|powershell)\\r?\\n([^\\r\\n]+)\\r?\\n```','g');
  const matches=[...text.matchAll(expression)];
  assert.equal(matches.length,1,'exactly one documented '+platform+' block required');
  return matches[0][1];
}
export function verify(texts){
  for(const lang of ['en','ka']){
    assert.equal(extract(texts[lang],'POSIX'),POSIX,lang+' changed POSIX CLI command');
    assert.equal(extract(texts[lang],'WINDOWS'),WINDOWS,lang+' changed native Windows CLI command');
    for(const required of ['WSL2','GUI','NotSigned'])
      assert(texts[lang].includes(required),lang+' missing Windows caveat '+required);
  }
  return {posix:POSIX,windows:WINDOWS};
}
const docs={en:page('en'),ka:page('ka')};
const commands=verify(docs);
if(process.argv.includes('--self-test')){
  const altered={...docs,en:docs.en.replace(POSIX,'bash scripts/suliko-setup.sh --install')};
  assert.throws(()=>verify(altered));
  const removed={...docs,ka:docs.ka.replace('<!-- D190:WINDOWS -->','<!-- D190:MISSING -->')};
  assert.throws(()=>verify(removed));
  console.log('D190 source/documentation negative checks PASS');
  process.exit(0);
}
assert.equal(process.env.GITHUB_ACTIONS,'true','CI-only');
assert.equal(process.env.GITHUB_REPOSITORY,'dol-1/suliko-ide-ci','public CI only');
const os=process.env.RUNNER_OS;
assert(['Linux','macOS','Windows'].includes(os),'unrecognized OS');
// The exact text of the documented command determines both executable and argv.
const command=os==='Windows'?commands.windows:commands.posix;
const parts=command.split(' ');
assert(parts.every(x=>/^[A-Za-z0-9._/-]+$/.test(x)),'nontrivial shell syntax refused');
const workspace=process.env.GITHUB_WORKSPACE;
assert(workspace&&path.isAbsolute(workspace)&&fs.realpathSync(workspace)===fs.realpathSync(process.cwd()),'unreviewed workspace');
const env={...process.env};
const run=spawnSync(parts[0],parts.slice(1),{cwd:workspace,env,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:100000});
assert.equal(run.status,0,'documented preview returned nonzero '+os);
const output=String(run.stdout||'');
assert(output.includes('PREVIEW ONLY')&&output.includes('0.49.0'),'docs command not a matching BB preview');
if(os==='Windows'){
  const help=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File','scripts/suliko-setup.ps1','--help'],{cwd:workspace,env,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:100000});
  assert.equal(help.status,0,'Windows help must execute');
  for(const required of ['WSL2','GUI','NotSigned'])assert(String(help.stdout||'').includes(required),'native Windows WSL2/GUI warning absent: '+required);
}
console.log('D190 exact documented command completed on '+os+' without any installation; Windows CLI WSL2/native GUI distinction remains explicit');
