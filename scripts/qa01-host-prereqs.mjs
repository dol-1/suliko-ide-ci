// Public QA-01: bounded read-only host/project observations; never print raw identity, path or tokens.
import { readFileSync } from "node:fs";
const fail=()=>{console.error("QA01_HOST_PREREQS unavailable"); process.exitCode=1;};
export function categories(hosts, projects, target, syntheticName) {
  if(!Array.isArray(hosts)||!Array.isArray(projects)||!["web","desktop"].includes(target)||
     !/^qa01-(?:desktop-)?synthetic$/.test(syntheticName))throw Error("Malformed fixture");
  const connected=new Set(hosts.filter(x=>x&&x.status==="connected"&&typeof x.id==="string").map(x=>x.id));
  const selected=projects.filter(x=>x?.name===syntheticName);
  const sources=selected.length===1 && Array.isArray(selected[0].sources)?selected[0].sources:[];
  return {
    target, available:true, connectedHostCount:connected.size, projectCount:projects.length,
    syntheticProjectFound:selected.length===1,
    projectSourceListInSummary:Array.isArray(selected[0]?.sources),
    syntheticSourceCount:sources.length,
    syntheticSourceOnConnectedHost:sources.some(x=>connected.has(x.hostId)),
    // Never expose any path, name, machine ID, provider, credential or raw JSON.
  };
}
if(process.argv[1]&&process.argv[1].endsWith("qa01-host-prereqs.mjs")){
 try {
   const [hostsFile,projectsFile,target,syntheticName]=process.argv.slice(2);
   console.log("QA01_HOST_PREREQS",JSON.stringify(categories(
     JSON.parse(readFileSync(hostsFile,"utf8")),
     JSON.parse(readFileSync(projectsFile,"utf8")),target,syntheticName)));
 } catch {fail();}
}
