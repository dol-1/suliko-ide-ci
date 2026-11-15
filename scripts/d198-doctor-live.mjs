// D198 only: owned published BB CLI and native OS read-only probes.
// Never echo BB stdout, credentials, user paths or socket metadata.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyNativeLoopback} from './d164-native-listener-guard.mjs';

const allowlist=['account-pool','bb--mcp','connect','bb--connect-next','memory',
 'suliko-hello','suliko-remote-panel'];
const fail=()=>{throw new Error('D198_SAFE_LIVE_PROBE_NOT_VERIFIED')};
const nonlink=(p,dir=false)=>{
 const v=fs.lstatSync(p);
 if(v.isSymbolicLink()||(dir?!v.isDirectory():!v.isFile()))fail();
 return v;
};
const run=(exe,args,cwd,max=400000)=>{
 const out=spawnSync(exe,args,{cwd,env:process.env,encoding:'utf8',
   windowsHide:true,timeout:30000,stdio:['ignore','pipe','pipe'],maxBuffer:max});
 if(out.error||out.status!==0||typeof out.stdout!=='string'||out.stdout.length>max)fail();
 return out.stdout; // never printed, parsed to an exact whitelist only
};
export function collectOwnedLiveDoctor() {
 const env=process.env;
 const win=process.platform==='win32',mac=process.platform==='darwin',linux=process.platform==='linux';
 if(!(win||mac||linux)||process.versions.node!=='22.19.0')fail();
 if(!win&&typeof process.getuid==='function'&&process.getuid()===0)fail();
 const home=win?env.LOCALAPPDATA:env.HOME;
 if(!home||!path.isAbsolute(home)||path.parse(home).root===home)fail();
 nonlink(home,true);
 const sub=win?path.join(home,'SulikoIDE'):path.join(home,'.local','share','suliko-ide');
 // Every parent traversed by the owned BB path must be a real directory.
 if(!win){nonlink(path.join(home,'.local'),true);nonlink(path.join(home,'.local','share'),true);}
 nonlink(sub,true);
 const root=path.join(sub,'UserSetup'),data=path.join(sub,'UserData');
 nonlink(root,true);nonlink(data,true);
 if(env.BB_DATA_DIR!==data||env.BB_SERVER_BIND_HOST!=='127.0.0.1'||
    env.BB_TELEMETRY!=='false')fail();
 const pkgdir=path.join(root,'cli','node_modules','bb-app');
 for(const p of [path.join(root,'cli'),path.join(root,'cli','node_modules'),pkgdir])nonlink(p,true);
 const manifestFile=path.join(pkgdir,'package.json');
 nonlink(manifestFile);
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 if(manifest.name!=='bb-app'||manifest.version!=='0.49.0'||typeof manifest.bin?.bb!=='string')fail();
 const bin=path.resolve(pkgdir,manifest.bin.bb);
 if(!bin.startsWith(pkgdir+path.sep))fail();
 nonlink(bin);
 const serverPort=Number(env.BB_SERVER_PORT),daemonPort=Number(env.BB_HOST_DAEMON_PORT);
 if(!Number.isSafeInteger(serverPort)||!Number.isSafeInteger(daemonPort)||
    serverPort===daemonPort||serverPort<1024||daemonPort<1024||
    serverPort>65535||daemonPort>65535)fail();
 const os=win?'Windows':mac?'macOS':'Linux';
 let raw;
 if(linux)raw=run('ss',['-ltnH'],home);
 else if(mac)raw=run('lsof',['-nP','-iTCP','-sTCP:LISTEN'],home);
 else {
   const code='$ports=@('+serverPort+','+daemonPort+');'+
      '$rows=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $ports -contains [int]$_.LocalPort } | Select-Object LocalAddress,LocalPort);'+
      'ConvertTo-Json -InputObject $rows -Compress';
   raw=run('pwsh',['-NoProfile','-NonInteractive','-Command',code],home);
 }
 // Fails closed on an absent port, non-loopback address or malformed snapshot.
 verifyNativeLoopback(os,raw,[serverPort,daemonPort]);
 const status=JSON.parse(run(process.execPath,[bin,'plugin','list','--json'],home));
 if(!Array.isArray(status.plugins)||status.plugins.length>200)fail();
 const plugins={};
 for(const id of allowlist){
   const rows=status.plugins.filter(x=>x&&x.id===id);
   if(rows.length>1)fail();
   if(rows.length===0){plugins[id]='absent';continue;}
   const row=rows[0];
   if(row.enabled===false && row.status==='disabled')plugins[id]='disabled';
   else if(row.enabled===true && row.status!=='disabled')plugins[id]='enabled';
   else plugins[id]='unknown';
 }
 // Detect names only: *never* read, print or serialize a provider key VALUE.
 // This is explicit env-presence evidence, not a claim about BB's secret store.
 const providerKeyPresent=['ANTHROPIC_API_KEY','OPENAI_API_KEY','GOOGLE_API_KEY']
   .some(n=>Object.hasOwn(env,n));
 return {
  bbVersion:manifest.version,listenerHost:'127.0.0.1',profileHardened:true,
  plugins,providerKeyPresent
 };
}
