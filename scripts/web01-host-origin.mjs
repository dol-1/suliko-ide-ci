// [ChatGPT] WEB-01: real stock BB loopback HTTP Host/Origin guard matrix.
import http from 'node:http';
import { writeFileSync } from 'node:fs';
const host = '127.0.0.1';
const port = Number(process.env.BB_WEB01_PORT || 38885);
const matrix = [
  { name: 'local CLI GET without Origin', headers: {host: host+':'+port}, method:'GET', want:200 },
  { name: 'same-origin browser GET', headers:{host:host+':'+port,origin:'http://'+host+':'+port}, method:'GET', want:200 },
  { name: 'foreign browser Origin GET', headers:{host:host+':'+port,origin:'https://attacker.example'}, method:'GET', want:403 },
  { name: 'foreign browser Origin POST', headers:{host:host+':'+port,origin:'https://attacker.example','content-type':'text/plain'}, method:'POST', want:403 },
  { name: 'opaque iframe Origin', headers:{host:host+':'+port,origin:'null'}, method:'GET', want:403 },
  { name: 'DNS rebinding Host only', headers:{host:'attacker.example:'+port}, method:'GET', want:403 },
  { name: 'rebind host and matching hostile origin', headers:{host:'attacker.example:'+port,origin:'http://attacker.example:'+port}, method:'GET', want:403 },
  { name: 'forwarded host does not mask attack origin', headers:{host:host+':'+port,origin:'https://attacker.example','x-forwarded-host':'attacker.example','x-forwarded-proto':'https'}, method:'GET', want:403 },
  { name: 'unrewritten public connect origin', headers:{host:host+':'+port,origin:'https://bee.getbb.app'}, method:'GET', want:403 },
  { name: 'DNS rebinding preflight', headers:{host:'attacker.example:'+port,origin:'http://attacker.example:'+port,'access-control-request-method':'POST'},method:'OPTIONS',want:403 },
  { name: 'invalid Host port', headers:{host:'localhost:65536'},method:'GET',want:[400,403] },
  { name: 'invalid Host userinfo', headers:{host:'localhost@attacker.example'},method:'GET',want:[400,403] },
];
function rawRequest(test){
  return new Promise((resolve,reject)=>{
    const request=http.request({hostname:host,port,path:'/api/v1/threads',method:test.method,headers:test.headers,timeout:8000},response=>{
      response.resume();response.on('end',()=>resolve(response.statusCode));
    });
    request.once('error',reject);request.once('timeout',()=>request.destroy(Error('Request timeout')));
    request.end();
  });
}
const results=[];
for(const test of matrix){
  const code=await rawRequest(test);
  const accepts=Array.isArray(test.want)?test.want:[test.want];
  const pass=accepts.includes(code);
  results.push({name:test.name,expected:accepts.join('/'),actual:code,pass});
  console.log((pass?'PASS':'FAIL')+' '+test.name+': expected '+accepts.join('/')+', got '+code);
}
const report=['# WEB-01 real stock BB loopback Host/Origin matrix','',
  'Source: desktop-v0.49.0, immutable SHA 7b26cae79ec978fafd0a5db0e8517e94f12eb8f4. No live Tailscale used.',
  '| Scenario | Expected HTTP | Actual HTTP | Pass |','|---|---|---|---|',
  ...results.map(r=>'| '+r.name+' | '+r.expected+' | '+r.actual+' | '+(r.pass?'YES':'NO')+' |'),
  '',results.every(r=>r.pass)?'All local mock HTTP cases passed.':'At least one real HTTP boundary failed.',
  'NOT PROVEN: outside-tailnet unreachability, Tailscale ACL, actual Serve on owner host.'];
writeFileSync('web01-results.md',report.join('\n')+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
