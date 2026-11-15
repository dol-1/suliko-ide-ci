// D165 user-facing argument parser: pure/fail-closed, no file or network access.
export function parseSetupArgs(argv){
 if(!Array.isArray(argv)||argv.some(a=>typeof a!=="string"))throw Error("D165_INVALID_ARGS");
 let mode=null,sha=null,file=null;
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(["--install","--uninstall","--dry-run"].includes(arg)){
   if(mode!==null)throw Error("D165_MULTIPLE_MODES");
   mode=arg.slice(2);
  }else if(arg==="--plugin-sha"){
   if(sha!==null||i+1>=argv.length)throw Error("D165_DUPLICATE_OR_MISSING_SHA");
   sha=argv[++i];
  }else if(arg==="--candidate-file"){
   if(file!==null||i+1>=argv.length)throw Error("D165_DUPLICATE_OR_MISSING_FILE");
   file=argv[++i];
  }else{
   throw Error("D165_UNKNOWN_ARGUMENT");
  }
 }
 mode??="dry-run";
 if(mode==="install"){
  if(!/^[a-f0-9]{64}$/.test(sha??""))throw Error("D165_UNAPPROVED_SHA");
  if(typeof file!=="string"||file.length<2||file.includes("\0")||
    !(file.startsWith("/")||/^[A-Za-z]:[\\/]/.test(file))||
    file.includes("\n")||file.includes("\r"))
   throw Error("D165_CANDIDATE_FILE_REQUIRED");
 }else if(sha!==null||file!==null)throw Error("D165_UNEXPECTED_SOURCE_FLAGS");
 return Object.freeze({mode,sha,candidateFile:file});
}
