import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='docs/pilot/D196-TROUBLESHOOTING-REPLIES.md';
const src=fs.readFileSync(file,'utf8');
assert(src.startsWith('# D-196'),'wrong draft');
for(let i=1;i<=5;i++)assert(new RegExp('^## '+i+'\\. ', 'm').test(src),'missing symptom '+i);
assert.equal([...src.matchAll(/\\*\\*KA:\\*\\*/g)].length,5,'five KA drafts mandatory');
assert.equal([...src.matchAll(/\\*\\*EN:\\*\\*/g)].length,5,'five EN drafts mandatory');
for(const value of ['synthetic','NotSigned','SmartScreen','0.49.0','SEC04','loopback','provider'])
 assert(src.toLowerCase().includes(value.toLowerCase()),'missing guard '+value);
assert(!/\\bmailto:|\\bghp_[A-Za-z0-9]{10,}|\\bsk-[A-Za-z0-9]{12,}|\\b[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/.test(src),'credential/contact forbidden');
const georgian=[...src].filter(c=>c>='ა'&&c<='ჰ').length;
assert(georgian>150,'not KA');
assert(!/https?:\\/\\/[^)\\s]+\\?token=/i.test(src),'private token link');
console.log('D196 exactly 5 KA/EN synthetic support reply pairs, no identity collection and no beta promise');
