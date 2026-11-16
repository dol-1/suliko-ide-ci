// D217: pure source-only workflow diff → push/paths fanout audit.
// Never executes workflow YAML or evaluates workflow expressions.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export const parseItems = raw => {
 const t=raw.trim();
 if(!t)return null; // An empty YAML field starts an indented list, not an empty inline []
 if(t.startsWith('[')&&t.endsWith(']'))
  return t.slice(1,-1).split(',').map(x=>x.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
 return null;
};
export function readPushTrigger(src){
 const lines=src.split(/\r?\n/);
 const on=lines.findIndex(l=>/^on:\s*$/.test(l));
 if(on<0)return null;
 let start=-1;
 for(let i=on+1;i<lines.length;i++){
  if(/^\S/.test(lines[i])&&!/^#/.test(lines[i]))break;
  if(/^  push:\s*$/.test(lines[i])){start=i+1;break}
 }
 if(start<0)return null;
 const result={branches:null,paths:null,branchesIgnore:[],pathsIgnore:[]};
 const keys={branches:'branches',paths:'paths','branches-ignore':'branchesIgnore','paths-ignore':'pathsIgnore'};
 for(let i=start;i<lines.length;i++){
  let line=lines[i];
  if(/^\S/.test(line)||/^  [^\s#][^:]*:/.test(line))break;
  const hit=/^    (branches|paths|branches-ignore|paths-ignore):\s*(.*)$/.exec(line);
  if(!hit)continue;
  const field=keys[hit[1]],inline=parseItems(hit[2]);
  if(inline){result[field]=inline;continue}
  if(hit[2].trim())throw Error('D217_UNSUPPORTED_PUSH_PATHS_LIST: '+hit[1]);
  const items=[];
  for(let k=i+1;k<lines.length;k++){
   const item=/^\s{6}-\s+(.+)$/.exec(lines[k]);
   if(item){items.push(item[1].trim().replace(/^['"]|['"]$/g,''));i=k;continue}
   if(lines[k].trim()===''||/^\s{6}#/.test(lines[k])){i=k;continue}
   break;
  }
  result[field]=items;
 }
 return result;
}
export function globRegex(pattern){
 const source=String(pattern);if(!source||source.length>300)throw Error('D217_BAD_GLOB');
 let out='^';
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='*'){
   if(source[i+1]==='*'){
    if(source[i+2]==='/'){out+='(?:.*/)?';i+=2}
    else{out+='.*';i++}
   }else out+='[^/]*';
  }else if(c==='?')out+='[^/]';
  else if(['\\','^','$','+','?','.','(',')','|','[',']','{','}'].includes(c))out+='\\'+c;
  else out+=c;
 }
 return new RegExp(out+'$');
}
export function matchPath(file,patterns,ignore=[]){
 let yes=!patterns;
 if(patterns){
  yes=false;
  for(const pattern of patterns){
   const neg=pattern.startsWith('!');
   if(globRegex(neg?pattern.slice(1):pattern).test(file))yes=!neg;
  }
 }
 return yes&&!ignore.some(p=>globRegex(p).test(file));
}
export function matchBranch(branch,trigger){
 const branches=trigger.branches,ignore=trigger.branchesIgnore;
 if(branches && !branches.some(p=>globRegex(p).test(branch)))return false;
 if(ignore.some(p=>globRegex(p).test(branch)))return false;
 return true;
}
export function analyze(changed,workflows,branch){
 const affected=[],manual=[];
 for(const [f,src] of Object.entries(workflows)){
  const spec=readPushTrigger(src);
  const relevant=spec
    ? changed.filter(file=>file===f||matchPath(file,spec.paths,spec.pathsIgnore))
    : changed.filter(file=>file===f);
  if(!relevant.length)continue;
  const item={workflow:f,changed:relevant,head_required:true,source:'push-paths',
    feature_push_runnable:!!spec&&matchBranch(branch,spec)};
  if(!spec){item.source='workflow-without-push';manual.push(item)}
  else affected.push(item);
 }
 affected.sort((a,b)=>a.workflow.localeCompare(b.workflow));
 manual.sort((a,b)=>a.workflow.localeCompare(b.workflow));
 return {affected,manual,
  featureRunnable:affected.filter(x=>x.feature_push_runnable),
  needsManual:affected.filter(x=>!x.feature_push_runnable).concat(manual)};
}
function main(){
 const workspace=process.env.GITHUB_WORKSPACE,branch=process.env.GITHUB_REF_NAME;
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='dol-1/suliko-ide-ci'||
    !workspace||!path.isAbsolute(workspace)||!branch||branch==='main')throw Error('D217_FEATURE_ONLY');
 const base=execFileSync('git',['merge-base','HEAD','refs/remotes/origin/main'],{cwd:workspace,encoding:'utf8',timeout:10000}).trim();
 const diff=execFileSync('git',['diff','--name-only','--no-renames','-z',base,'HEAD'],{cwd:workspace,timeout:30000});
 const changed=diff.toString('utf8').split('\0').filter(Boolean).sort();
 const root=path.join(workspace,'.github','workflows'),workflows={};
 for(const name of fs.readdirSync(root).sort()){
  if(!/\.ya?ml$/.test(name))continue;
  const file=path.posix.join('.github/workflows',name);
  workflows[file]=fs.readFileSync(path.join(root,name),'utf8');
 }
 const audit=analyze(changed,workflows,branch);
 const report={schema:'suliko-d217-affected-workflows-v1',base,head:process.env.GITHUB_SHA,
   branch,changed,affected:audit.affected,manual:audit.manual,
   mustCheckExactHead:audit.affected.map(x=>x.workflow).concat(audit.manual.map(x=>x.workflow))};
 const out=path.join(workspace,'d217-affected-workflows.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const lines=['# D217 premerge exact-head CI inventory',
  'Source: public GitHub branch diff against canonical mirrored main; report is NOT evidence of green status.',
  'Branch: '+branch,'Source head: '+process.env.GITHUB_SHA,'Base SHA: '+base,
  'Files: '+changed.join(', '),
  '','| Workflow | Changed path(s) | Feature push runnable | Actual GH run completed/success exact SHA |',
  '| --- | --- | --- | --- |'];
 for(const item of audit.affected.concat(audit.manual))
  lines.push('| '+item.workflow+' | '+item.changed.join(', ')+' | '+(item.feature_push_runnable?'YES':'NO — needs trigger or explicit approved test')+' | **TO VERIFY — NO AUTO-GO** |');
 lines.push('', 'Do not merge until each required affected workflow is independently confirmed on this exact feature HEAD; older red/green run or main-only push is not a substitute. Skip claims must be explicit.');
 const md=path.join(workspace,'d217-premerge-note.md');
 fs.writeFileSync(md,lines.join('\n')+'\n',{flag:'wx',mode:0o600});
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 console.log('D217_AFFECTED_WORKFLOWS='+audit.affected.length);
 console.log('D217_NOT_FEATURE_RUNNABLE='+audit.needsManual.length);
 console.log('D217_DIFF_FILES='+changed.length);
}
if(process.argv[1] && process.argv[1].endsWith('d217-affected-workflows.mjs'))main();
