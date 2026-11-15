// D163: pure deterministic strict live-state classifier for CI-only stock BB.
// No BB process, imports, IO, environment, data logs, network or native GUI.
export const FORBIDDEN_IDS=Object.freeze(["bb--mcp","account-pool","connect","bb--connect-next","memory"]);
const reject=category=>{throw Object.assign(new Error("D163"),{category})};
export function inspectStrictNativePluginState(plugins){
 if(!Array.isArray(plugins))reject("invalid-live-plugins");
 const offenders=[];
 for(const id of FORBIDDEN_IDS){
  const rows=plugins.filter(x=>x?.id===id);
  if(rows.length>1)reject("duplicate-stock-plugin");
  if(rows.length===1&&(rows[0].enabled!==false||rows[0].status!=="disabled")){
   const enabled=rows[0].enabled===true?"true":rows[0].enabled===false?"false":"other";
   const rawStatus=rows[0].status;
   const status=rawStatus==="disabled"?"disabled":rawStatus==="running"?"running":
    rawStatus==="needs-configuration"?"needs-configuration":rawStatus==="error"?"error":"other";
   offenders.push({id,category:"forbidden-"+id+"-enabled-"+enabled+"-status-"+status});
  }
 }
 const own=plugins.filter(x=>x?.id==="suliko-hello"||x?.id==="bb-plugin-suliko-hello");
 if(own.length>1)reject("duplicate-own-plugin");
 const helloPresent=own.length===1;
 const helloActive=helloPresent&&own[0].enabled===true;
 // The Hello category takes precedence over forbidden categories, as in D160.
 const lastCategory=!helloActive?(helloPresent?"own-hello-not-enabled":"own-hello-missing"):
  offenders.length?offenders[offenders.length-1].category:"not-yet-observed";
 return {safe:offenders.length===0&&helloActive,forbiddenOffenders:offenders,
  helloPresent,helloActive,lastCategory};
}
