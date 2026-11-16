import fs from 'node:fs';
import assert from 'node:assert/strict';
const en=fs.readFileSync('site/docs/windows-trust.en.md','utf8'),ka=fs.readFileSync('site/docs/windows-trust.ka.md','utf8');
function safe(text,language){
 for(const v of ['Get-FileHash','-Algorithm SHA256','SmartScreen','NotSigned','WSL2','desktop-v0.49.0','synthetic/mock','install.'+language+'.md'])assert(text.includes(v),'D233_MISSING_'+language+'_'+v);
 assert(text.includes("C:\\reviewed\\bb-installer.exe"),'D233_PLACEHOLDER_BOTH_LANGUAGES');
 assert(!/run anyway|disable smartscreen|turn off smartscreen|bypass the warning/i.test(text),'D233_SECURITY_BYPASS_TEXT');
 assert(!/Invoke-WebRequest|Start-Process|ExecutionPolicy Bypass|Set-MpPreference/i.test(text),'D233_EXECUTE_OR_DISABLE_FORBIDDEN');
 return true;
}
assert(safe(en,'en')&&safe(ka,'ka'));
for(const bad of ['Run anyway','disable SmartScreen','Start-Process','ExecutionPolicy Bypass']){
 assert.throws(()=>safe(en+'\n'+bad,'en'),/D233_/);
}
console.log('D233_KA_EN_NOTSIGNED_SHA256_READONLY_SMARTSCREEN_WSL2_NEGATIVES_PASS');
