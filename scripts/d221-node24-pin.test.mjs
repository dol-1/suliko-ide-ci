import fs from 'node:fs';import assert from 'node:assert/strict';
const pins=new Map([
 ['checkout','fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'],
 ['setup-node','a0853c24544627f65ddf259abe73b1d18a591444'],
 ['upload-artifact','b7c566a772e6b6bfb58ed0dc250532a479d7789f'],
 ['download-artifact','37930b1c2abaa49bbe596cd826c3c89aef350131']]);
const old=['3d3c42e5aac5ba805825da76410c181273ba90b1','820762786026740c76f36085b0efc47a31fe5020','ea165f8d65b6e75b540449e92b4886f43607fa02','95815c38cf2ff2164869cbab79da8d1f422bc89e'];
function verify(text){for(const [action,sha] of pins){assert(text.includes('actions/'+action+'@'+sha),'D221_NODE24_PIN_MISSING:'+action);assert(!text.includes('actions/'+action+'@'+sha.slice(0,7)+'\n'),'D221_SHORT_SHA:'+action)}
 for(const pin of old)assert(!text.includes(pin),'D221_OLD_NODE20_SHA_FOUND');
 assert(text.includes('permissions: read-all')&&text.includes('cancel-in-progress: true'),'D221_SECURITY_OR_CONCURRENCY_DOWNGRADE');return true}
for(const file of ['.github/workflows/d165-e1-one-command-3os.yml','.github/workflows/d166-rc-candidate.yml']){const s=fs.readFileSync(file,'utf8');verify(s);for(const oldPin of old)assert.throws(()=>verify(s.replace('actions/checkout@'+pins.get('checkout'),'actions/checkout@'+oldPin)),/D221_|OLD_NODE20/)}
console.log('D221_NODE24_FULL_40HEX_ACTION_PIN_AND_NO_OLD_SHA_NEGATIVES=PASS');
