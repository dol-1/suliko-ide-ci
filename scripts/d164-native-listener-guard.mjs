// D164 pure fail-closed listener parser. No local IO, network or logs.
// Used ONLY for CI-owned published BB server+daemon ports on disposable runners.
const reject=category=>{throw Object.assign(new Error("D164"),{category})};
const approved=address=>{
 const a=address.replace(/^\[|\]$/g,"").toLowerCase();
 return a==="127.0.0.1"||a==="::1"||a==="0:0:0:0:0:0:0:1";
};
export function verifyNativeLoopback(os,raw,ports){
 if(!["Linux","macOS","Windows"].includes(os)||typeof raw!=="string"||
    !Array.isArray(ports)||ports.length!==2||new Set(ports).size!==2||
    ports.some(p=>!Number.isSafeInteger(p)||p<1024||p>65535))
  reject("listener-contract");
 const wanted=new Set(ports);
 const actual=new Map(ports.map(p=>[p,[]]));
 if(os==="Windows"){
  let rows;
  try{
   const parsed=JSON.parse(raw.trim());
   rows=Array.isArray(parsed)?parsed:[parsed];
  }catch{reject("listener-invalid-windows-json")}
  for(const row of rows){
   const p=row?.LocalPort;
   if(!Number.isSafeInteger(p)||typeof row?.LocalAddress!=="string")
    reject("listener-invalid-windows-json");
   if(wanted.has(p))actual.get(p).push(row.LocalAddress);
  }
 }else{
  for(const line of raw.split(/\r?\n/u)){
   let address,port;
   if(os==="Linux"){
    const fields=line.trim().split(/\s+/u);
    if(fields[0]!=="LISTEN"||fields.length<5)continue;
    const m=/^(.+):(\d+)$/u.exec(fields[3]);
    if(!m)continue;
    address=m[1];port=Number(m[2]);
   }else{
    const m=/\bTCP\s+(\S+):(\d+)\s+\(LISTEN\)/u.exec(line);
    if(!m)continue;
    address=m[1];port=Number(m[2]);
   }
   if(wanted.has(port))actual.get(port).push(address);
  }
 }
 for(const port of ports){
  const addresses=actual.get(port);
  if(addresses.length===0)reject("listener-not-observed");
  if(addresses.some(a=>!approved(a)))reject("listener-exposed-nonloopback");
 }
 return true;
}
