// D218 public GH CI: compare KA EN literal source-tag install/uninstall lines
// to the installed E1 native runner argv from the exact IMMUTABLE RC tag.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const tag='1c7470934ab694ce69ac92e70de300d6f6c50743';
const digest='8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a';
const posixInstall='bash scripts/suliko-setup.sh --install --plugin-sha '+digest+' --candidate-file "$D218_CANDIDATE_PATH"';
const posixUninstall='bash scripts/suliko-setup.sh --uninstall';
const winInstall='pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -Install -AllowUnsignedVerified -PluginSha '+digest+' -CandidateFile $env:D218_CANDIDATE_PATH';
const winUninstall='pwsh -NoProfile -NonInteractive -File scripts/suliko-setup.ps1 -Uninstall';
const commands=[posixInstall,posixUninstall,winInstall,winUninstall];
const fail=why=>{throw new Error('D218_DOC_TAG_CONTRACT_'+why)};
export function verifyDocPair(en,ka,tagSource,commit){
 if(commit!==tag)fail('WRONG_TAG_COMMIT');
 for(const [lang,content] of [['EN',en],['KA',ka]]){
  for(const line of commands){
   const count=content.split(/\r?\n/).filter(x=>x===line).length;
   if(count!==1)fail(lang+'_MISSING_EXACT_COMMAND');
  }
  if(!content.includes(tag)||!content.includes('NotSigned')||!content.includes('WSL2')||
    !content.includes('D218_CANDIDATE_PATH'))fail(lang+'_MISSING_TRUST_SCOPE');
 }
 const patterns=[
  '["-NoProfile","-NonInteractive","-File",setupScript,"-Install","-AllowUnsignedVerified","-PluginSha",digest,"-CandidateFile",archive]',
  '[setupScript,"--install","--plugin-sha",digest,"--candidate-file",archive]',
  '["-NoProfile","-NonInteractive","-File",setupScript,"-Uninstall"]',
  '[setupScript,"--uninstall"]'
 ];
 for(const pattern of patterns)if(!tagSource.includes(pattern))fail('TAG_ARGV_DRIFT');
 return true;
}
const selfTest=()=>{
 const dummy=commands.join('\n')+'\n'+tag+'\nNotSigned WSL2 D218_CANDIDATE_PATH';
 const src=['["-NoProfile","-NonInteractive","-File",setupScript,"-Install","-AllowUnsignedVerified","-PluginSha",digest,"-CandidateFile",archive]',
 '[setupScript,"--install","--plugin-sha",digest,"--candidate-file",archive]',
 '["-NoProfile","-NonInteractive","-File",setupScript,"-Uninstall"]',
 '[setupScript,"--uninstall"]'].join(' ');
 verifyDocPair(dummy,dummy,src,tag);
 const negative=(a,b,c,d)=>{try{verifyDocPair(a,b,c,d);throw Error('D218_SELF_TEST_BYPASS')}catch(e){if(!String(e.message).startsWith('D218_DOC_TAG_CONTRACT_'))throw e}};
 negative(dummy.replace(posixInstall,'bash scripts/suliko-setup.sh --install --plugin-sha WRONG'),dummy,src,tag);
 negative(dummy,dummy.replace(winUninstall,'pwsh unexpected'),src,tag);
 negative(dummy,dummy,src,'a'.repeat(40));
 negative(dummy,dummy,src.replace('"--uninstall"','"--delete-all"'),tag);
 console.log('D218_DOC_KA_EN_TAG_NEGATIVE_MATRIX=PASS');
};
if(process.argv.includes('--self-test'))selfTest();
else{
 if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||
    process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci')fail('NOT_PUBLIC_GH_CI');
 const root=process.env.GITHUB_WORKSPACE;
 if(!root||!path.isAbsolute(root))fail('BAD_REPO_ROOT');
 const rcDir=path.join(root,'tagged-source');
 const sha=execFileSync('git',['-C',rcDir,'rev-parse','HEAD'],{encoding:'utf8',timeout:15000}).trim();
 const en=fs.readFileSync(path.join(root,'site/docs/install.en.md'),'utf8');
 const ka=fs.readFileSync(path.join(root,'site/docs/install.ka.md'),'utf8');
 const tagRunner=fs.readFileSync(path.join(rcDir,'scripts/d165-native-one-command.mjs'),'utf8');
 verifyDocPair(en,ka,tagRunner,sha);
 console.log('D218_DOC_TAG_3OS_KA_EN_EXACT_SOURCE_ARGV=PASS');
}
