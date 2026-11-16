// D226: parse workflow source only. Equivalent per-ref groups and pinned local reusable workflows are valid.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dir='.github/workflows';
const refExpression='$'+'{{ github.ref }}';
const remote=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[a-f0-9]{40}$/;
const local=/^\.\/\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/;
function violations(file,source,exists){
 const errors=[];
 const start=source.match(/^concurrency:\s*\r?\n((?:^[ ]{2}.+(?:\r?\n|$))*)/m);
 const block=start?.[1]??'';
 const group=block.match(/^  group:\s*(.*?)\s*$/m)?.[1]??'';
 if(!group.includes(refExpression)||!/^  cancel-in-progress:\s*true\s*$/m.test(block))
   errors.push('NO_PER_REF_CANCEL');
 if(!/^permissions:\s*(read-all|\r?\n\s{2}[a-z-]+:\s*(read|none|write))/m.test(source))
   errors.push('PERMISSIONS_NOT_EXPLICIT');
 for(const m of source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)){
   const action=m[1];
   if(remote.test(action))continue;
   if(local.test(action) && exists(action.slice(2)))continue;
   errors.push('UNPINNED_OR_INVALID_USES');
 }
 return errors;
}
function selfTest(){
 const sample='name: fixture\nconcurrency:\n  group: scoped-'+refExpression+'\n  cancel-in-progress: true\npermissions: read-all\njobs:\n  foo:\n    uses: ./.github/workflows/safe.yml\n  bar:\n    steps:\n      - uses: github/codeql-action/init@'+ 'a'.repeat(40)+'\n';
 assert.deepEqual(violations('test.yml',sample,x=>x===dir+'/safe.yml'),[]);
 assert(violations('test.yml',sample.replace(refExpression,'noref'),()=>true).includes('NO_PER_REF_CANCEL'));
 assert(violations('test.yml',sample.replace('cancel-in-progress: true','cancel-in-progress: false'),()=>true).includes('NO_PER_REF_CANCEL'));
 assert(violations('test.yml',sample.replace('permissions: read-all','permissions: write-all'),()=>true).includes('PERMISSIONS_NOT_EXPLICIT'));
 assert(violations('test.yml',sample.replace('cancel-in-progress: true','cancel-in-progress: True'),()=>true).includes('NO_PER_REF_CANCEL'));
 assert(violations('test.yml',sample.replace('github/codeql-action/init@'+ 'a'.repeat(40),'github/codeql-action/init@v3'),()=>true).includes('UNPINNED_OR_INVALID_USES'));
 assert(violations('test.yml',sample.replace('./.github/workflows/safe.yml','./../private/file.yml'),()=>true).includes('UNPINNED_OR_INVALID_USES'));
 assert(violations('test.yml',sample,()=>false).includes('UNPINNED_OR_INVALID_USES'));
 console.log('D226_D083_EQUIVALENT_PER_REF_PINNED_LOCAL_AND_NEGATIVES=PASS');
}
function main(){
 assert(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='dol-1/suliko-ide-ci','D226_PUBLIC_GH_ONLY');
 const files=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x));
 assert(files.length>=90&&files.length<=180,'D226_WORKFLOW_COUNT');
 const issues=[];
 for(const f of files.sort()){
  const source=fs.readFileSync(path.join(dir,f),'utf8');
  const e=violations(f,source,rel=>{
    const name=path.basename(rel);
    if(path.posix.join(dir,name)!==rel)return false;
    try{const meta=fs.lstatSync(rel);return meta.isFile()&&!meta.isSymbolicLink()}catch{return false}
  });
  for(const code of e)issues.push(f+':'+code);
 }
 for(const issue of issues)console.error('D226_POLICY_'+issue);
 if(issues.length)throw Error('D226_WORKFLOW_POLICY_FAILED_COUNT='+issues.length);
 console.log('D226_SECURE_WORKFLOW_POLICY='+files.length+'_GREEN');
}
if(process.argv.includes('--self-test'))selfTest();else main();
