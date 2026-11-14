// D059: one real read-only stock BB observation in an isolated *public CI* runner.
// NEVER use this CLI on a user's normal BB_DATA_DIR or print BB's raw config.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const forbidden=["account-pool","bb--mcp","connect","bb--connect-next","memory"];
const owned=["suliko-hello","suliko-remote-panel"];

// Commander --version on stock BB 0.49.0 emits a plain line. Only a boolean
// leaves the observer: never include raw version/CLI output in artifacts.
export function stockVersionMatchesPin(raw) {
  return typeof raw==="string"&&raw.length<=32&&raw.trim()==="0.49.0";
}
// BB 0.49.0 official env list format: NAME=<set> or no managed env.
// Reject any unexpected text; never log it or include raw values.
export function inspectManagedProviderKeys(raw) {
  if(raw==="No bb-app env set.\n")return {openai:"absent",anthropic:"absent"};
  if(typeof raw!=="string"||raw.length>65536||!raw.endsWith("\n"))
    throw Error("Unsafe managed env listing shape");
  const keys=new Set();
  for(const line of raw.slice(0,-1).split("\n")){
    const m=/^([A-Z][A-Z0-9_]*)=<set>$/.exec(line);
    if(!m||keys.has(m[1]))throw Error("Unredacted or malformed managed env listing");
    keys.add(m[1]);
  }
  return{openai:keys.has("OPENAI_API_KEY")?"present":"absent",
         anthropic:keys.has("ANTHROPIC_API_KEY")?"present":"absent"};
}
export function inspectLive(config,plugins,expectedDir,port,rawVersion,redactedEnvList) {
  if(config===null||typeof config!=="object"||Array.isArray(config))throw Error("Invalid BB system config shape");
  if(plugins===null||typeof plugins!=="object"||!Array.isArray(plugins.plugins))throw Error("Invalid BB plugin list shape");
  let url=null;
  try{url=new URL(config.serverUrl);}catch{throw Error("Invalid live server URL");}
  const loopback=url.protocol==="http:"&&url.hostname==="127.0.0.1"&&url.port===String(port)&&
    !url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==="/";
  const dataDirMatches=config.dataDir===expectedDir;
  const versionMatches=stockVersionMatchesPin(rawVersion);
  const providerPresence=inspectManagedProviderKeys(redactedEnvList);
  const states={};
  for(const id of [...forbidden,...owned]){
    // One ID cannot have two independently reported states. First-match
    // logic could accept a disabled record and silently ignore a later
    // enabled forbidden plugin in an inconsistent/untrusted CLI response.
    const matches=plugins.plugins.filter(x=>x?.id===id);
    const x=matches[0];
    states[id]=matches.length===0?"absent":
      matches.length!==1||typeof x.enabled!=="boolean"?"unknown":
      x.enabled?"enabled":"disabled";
  }
  const forbiddenSafe=forbidden.every(x=>states[x]==="absent"||states[x]==="disabled");
  return {
    schema:"suliko-doctor-live-ci-v2",
    evidence:"actual-disposable-stock-bb-cli-reads-only",
    stockPin:"desktop-v0.49.0",
    checks:{serverLoopback:loopback,dataDirectoryMatchesDisposable:dataDirMatches,forbiddenPluginsSafe:forbiddenSafe,stockVersionMatchesPin:versionMatches},
    pluginStates:states,
    providerKeyPresence:providerPresence,
    providerSettingsAndHooks:"NOT_INSPECTED",
    status:loopback&&dataDirMatches&&forbiddenSafe&&versionMatches?"partial-runtime-pass":"review-required",
  };
}

/** Write only a fixed-schema, synthetic CI-only support bundle. Never raw CLI data. */
export function writeCiSafeBundle(report,requestedPath,tempRoot) {
  if(!tempRoot||!requestedPath||requestedPath!==join(tempRoot,"d059-support-bundle.json"))
    throw Error("Refusing non-disposable support bundle path");
  const validState=new Set(["enabled","disabled","absent","unknown"]);
  const pluginStates=Object.fromEntries([...forbidden,...owned].map(id=>{
    const state=report?.pluginStates?.[id];
    return [id,validState.has(state)?state:"unknown"];
  }));
  const clean={
    schema:"suliko-doctor-live-ci-v2",
    evidence:"actual-disposable-stock-bb-cli-reads-only",
    stockPin:"desktop-v0.49.0",
    checks:{
      serverLoopback:report?.checks?.serverLoopback===true,
      dataDirectoryMatchesDisposable:report?.checks?.dataDirectoryMatchesDisposable===true,
      forbiddenPluginsSafe:report?.checks?.forbiddenPluginsSafe===true,
      stockVersionMatchesPin:report?.checks?.stockVersionMatchesPin===true,
    },
    pluginStates,
    providerKeyPresence:{
      openai:["present","absent"].includes(report?.providerKeyPresence?.openai)?report.providerKeyPresence.openai:"unknown",
      anthropic:["present","absent"].includes(report?.providerKeyPresence?.anthropic)?report.providerKeyPresence.anthropic:"unknown",
    },
    providerSettingsAndHooks:"NOT_INSPECTED",
    // A caller-supplied success string is NOT authority to mark a reduced
    // support bundle green. Re-derive from the sanitized booleans and the
    // complete set of forbidden plugin categories; reject contradictory or
    // unknown provider observations without including any raw value.
    status:"review-required",
  };
  const safe=report?.status==="partial-runtime-pass" &&
    Object.values(clean.checks).every(value=>value===true) &&
    forbidden.every(id=>clean.pluginStates[id]==="absent"||clean.pluginStates[id]==="disabled") &&
    ["openai","anthropic"].every(id=>
      clean.providerKeyPresence[id]==="present"||clean.providerKeyPresence[id]==="absent");
  if(safe)clean.status="partial-runtime-pass";
  // The input report can include unknown states or forged claims. Always
  // serialize review-required in those cases rather than laundering success.
  // wx = exclusive create. Never overwrite a user file or follow an existing
  // symlink; private permissions, fail closed without echoing OS paths/errors.
  try { writeFileSync(requestedPath,JSON.stringify(clean,null,2)+"\n",{flag:"wx",mode:0o600}); }
  catch { throw Error("Safe CI support bundle could not be created"); }
  return clean;
}

function fromCli(bin,args) {
  try {
    // Keep all raw BB output in memory. Never print stderr, env, file paths,
    // user config, tokens or even a substring of a failed JSON response.
    const output=execFileSync(process.execPath,[bin,...args],{
      env:process.env,encoding:"utf8",timeout:20000,maxBuffer:1024*1024,
      stdio:["ignore","pipe","pipe"],
    });
    return JSON.parse(output);
  } catch {throw Error("Sanitized stock BB CLI read failed");}
}
function readStockVersion(bin) {
  try {
    return execFileSync(process.execPath,[bin,"--version"],{
      env:process.env,encoding:"utf8",timeout:20000,maxBuffer:256,
      stdio:["ignore","pipe","pipe"],
    });
  } catch {throw Error("Sanitized stock BB version read failed");}
}
function readRedactedManagedEnv(root) {
  const bin=resolve("stock-bb/packages/bb-app/dist/bb-app.js");
  if(!existsSync(bin))throw Error("Reviewed stock BB app CLI missing");
  try {
    return execFileSync(process.execPath,[bin,"--data-dir",root,"env","list"],{
      env:process.env,encoding:"utf8",timeout:20000,maxBuffer:65536,
      stdio:["ignore","pipe","pipe"],
    });
  }catch{throw Error("Sanitized managed env list command failed");}
}
function main(argv){
  const bundleRequested=argv.length===3&&argv[1]==="--bundle";
  if(argv[0]!=="--ci-disposable"||!(argv.length===1||bundleRequested))
    throw Error("Only --ci-disposable [--bundle exact-disposable-path] is allowed");
  const env=process.env,root=env.RUNNER_TEMP,port=Number(env.BB_SERVER_PORT);
  if(env.CI!=="true"||!root||env.BB_DATA_DIR!==resolve(root,"d059-live-data")||
      env.BB_SERVER_BIND_HOST!=="127.0.0.1"||
      env.BB_HOST_DAEMON_PORT!=="38885"||
      env.BB_TELEMETRY!=="false"||env.BB_APP_VERSION!==undefined||port!==38884)
    throw Error("Refusing non-disposable or non-loopback environment");
  const bin=resolve("stock-bb/packages/bb-app/dist/bb.js");
  if(!existsSync(bin))throw Error("Reviewed stock BB CLI missing");
  const report=inspectLive(fromCli(bin,["settings","show","--json"]),
    fromCli(bin,["plugin","list","--json"]),env.BB_DATA_DIR,port,readStockVersion(bin),readRedactedManagedEnv(env.BB_DATA_DIR));
  if(bundleRequested)writeCiSafeBundle(report,argv[2],root);
  process.stdout.write(JSON.stringify(report)+"\n");
  if(report.status!=="partial-runtime-pass")process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{main(process.argv.slice(2));}
  catch{process.stderr.write("D059 live CI doctor refused/failed; no BB raw data emitted.\n");process.exitCode=1;}
}
