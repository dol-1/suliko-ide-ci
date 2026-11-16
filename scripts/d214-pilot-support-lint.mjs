import assert from 'node:assert/strict';
import fs from 'node:fs';
const file='docs/ops/PILOT-SUPPORT-RUNBOOK.md';
const text=fs.readFileSync(file,'utf8');
function safe(s){
 const required=['D196','D208','NOT SENT','SEC-04','NotSigned','SmartScreen','WSL2','synthetic/mock','P0','P1','P2','N/A','one business day','two business days','PUBLIC','--live','0600','wx'];
 for(const token of required)assert(s.includes(token),'D214_MISSING_'+token);
 assert(!/please upload (?:your )?(?:raw )?(?:doctor bundle|logs|screenshots)/i.test(s),'D214_UNSAFE_PUBLIC_UPLOAD');
 assert(!/disable (?:windows )?(?:smartscreen|antivirus|firewall) to (?:proceed|install)/i.test(s),'D214_SECURITY_BYPASS');
 assert(!/we guarantee (?:a )?(?:response|support)/i.test(s),'D214_FALSE_SLA');
 return true;
}
assert.equal(safe(text),true);
for(const bad of ['Please upload your raw doctor bundle','disable SmartScreen to install','we guarantee a response']){
 assert.throws(()=>safe(text+'\n'+bad),/D214_/);
}
console.log('D214_PILOT_SUPPORT_RUNBOOK_CATEGORY_PRIVACY_NEGATIVES_GREEN=PASS');
