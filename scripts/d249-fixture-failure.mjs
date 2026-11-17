// D249: bounded, category-only classifier of a disposable public CI host startup failure.
// Never print the log, its file path, command lines, environment, or unreviewed tokens.
import {openSync,fstatSync,readFileSync,closeSync,constants} from 'node:fs';
import {resolve,join} from 'node:path';
export function classifyD249Log(value) {
  const text=typeof value==='string'?value:'';
  if (/EADDRINUSE|address already in use|port is already allocated/i.test(text)) return 'port-bind';
  if (/ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|cannot find module/i.test(text)) return 'module-unavailable';
  if (/EACCES|EPERM|permission denied/i.test(text)) return 'permission';
  if (/ENOMEM|out of memory|allocation failed/i.test(text)) return 'memory';
  if (/SQLITE_BUSY|database is locked|database is malformed/i.test(text)) return 'data-store';
  if (/unknown option|unrecognized option|unsupported option/i.test(text)) return 'argument-rejected';
  if (/ENOENT|no such file or directory/i.test(text)) return 'file-missing';
  return text.trim()?'unclassified':'log-empty';
}
if(process.argv[1]?.endsWith('d249-fixture-failure.mjs')){
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci'||!process.env.RUNNER_TEMP)
    throw Error('D249_PUBLIC_CI_ONLY');
  const wanted=resolve(join(process.env.RUNNER_TEMP,'d066-desktop-server.log'));
  if(resolve(process.argv[2]??'')!==wanted)throw Error('D249_LOG_PATH_REFUSED');
  let category='log-unavailable';
  let fd;
  try{
    // O_NOFOLLOW + fstat on the same open descriptor prevents path-swap races.
    fd=openSync(wanted,constants.O_RDONLY|constants.O_NOFOLLOW);
    const st=fstatSync(fd);
    if(st.isFile()&&st.size<=262144)category=classifyD249Log(readFileSync(fd,'utf8'));
    else category='log-not-regular-or-too-large';
  }catch{ category='log-unavailable'; }
  finally{ if(fd!==undefined)try{closeSync(fd);}catch{} }
  process.stdout.write('D249_STOCK_FIXTURE_LOG_CATEGORY='+category+'\n');
}