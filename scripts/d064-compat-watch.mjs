// D064: version-contract watch only; not evidence of runtime API compatibility.
import { readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const PIN_SHA="7b26cae79ec978fafd0a5db0e8517e94f12eb8f4";
const PIN_VERSION="0.6.132";
const KNOWN_MAIN_VERSION="0.6.141";
const ISSUE="https://gitlab.com/dol-1-group/suliko-ide/-/work_items/49";
function parts(v) {
  if(!/^\d+\.\d+\.\d+$/.test(v)) throw Error("Unreviewed semver syntax");
  return v.split(".").map(Number);
}
function cmp(a,b) {
  const x=parts(a),y=parts(b);
  for(let i=0;i<3;i++) if(x[i]!==y[i])return x[i]<y[i]?-1:1;
  return 0;
}
function inRange(v,range) {
  const m=/^>=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/.exec(range);
  if(!m)throw Error("Unreviewed SDK range syntax");
  return cmp(v,m[1])>=0&&cmp(v,m[2])<0;
}
export function inspect(input) {
  const {mainVersion,pinVersion,mainSha,pinSha,manifests}=input;
  if(!/^[0-9a-f]{40}$/.test(mainSha)||pinSha!==PIN_SHA)throw Error("Upstream SHA validation failed");
  if(pinVersion!==PIN_VERSION)throw Error("Frozen SDK pin unexpectedly changed");
  for(const plugin of manifests) {
    if(plugin.devDependencies?.["@get-bb/plugin-sdk"]!==PIN_VERSION)throw Error("Unreviewed plugin dependency pin");
    if(!inRange(pinVersion,plugin.engines?.bbPluginSdk??""))throw Error("Frozen SDK outside reviewed plugin range");
  }
  if(mainVersion===pinVersion)return{state:"same-version",mainSha,mainVersion};
  if(mainVersion!==KNOWN_MAIN_VERSION)throw Error("UNREVIEWED upstream main SDK "+mainVersion+"; update #49");
  if(manifests.some(p=>inRange(mainVersion,p.engines.bbPluginSdk)))throw Error("Unexpected main compatibility; inspect SDK gate");
  return{state:"known-drift",mainSha,mainVersion};
}
async function getJson(url) {
  const r=await fetch(url,{headers:{"User-Agent":"suliko-d064-read-only"}});
  if(!r.ok)throw Error("Upstream HTTP "+r.status);
  return r.json();
}
async function main() {
  const manifests=["plugins/suliko-hello/package.json","plugins/suliko-remote-panel/package.json"].map(x=>JSON.parse(readFileSync(resolve(x),"utf8")));
  const ref=await getJson("https://api.github.com/repos/get-bb/bb/branches/main");
  const sha=ref?.commit?.sha;
  if(!/^[0-9a-f]{40}$/.test(sha??""))throw Error("Unverified branch ref");
  const root="https://raw.githubusercontent.com/get-bb/bb/";
  const [latest,pinned]=await Promise.all([
    getJson(root+sha+"/packages/plugin-sdk/package.json"),
    getJson(root+PIN_SHA+"/packages/plugin-sdk/package.json")
  ]);
  const result=inspect({mainVersion:latest.version,pinVersion:pinned.version,mainSha:sha,pinSha:PIN_SHA,manifests});
  const finding=result.state==="known-drift"?"KNOWN OUTSIDE REVIEWED RANGES, existing "+ISSUE+"; not yet proven to break at runtime":"Version pin matches; real plugin compilation still pending";
  console.log("D064 main SHA="+sha+" SDK="+latest.version+" frozen="+pinned.version+" state="+result.state);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "### D064 upstream contract watch\n- Main SHA: "+sha+"\n- Main SDK: "+latest.version+
    "\n- Pinned SHA: "+PIN_SHA+"\n- Pinned SDK: "+pinned.version+"\n- "+finding+
    "\nThis is a version-contract check, NOT an upstream main plugin SDK compile/test.\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e=>{console.error("D064 FAIL CLOSED: "+e.message);process.exitCode=1;});
