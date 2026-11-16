// D215 strict semantic separation: 40hex immutable RC source commit vs 64hex archive digest.
// Both are independently reviewed; a source commit may NEVER authorize arbitrary archive bytes.
export const commitPattern=/^[a-f0-9]{40}$/;
export const digestPattern=/^[a-f0-9]{64}$/;
export function validateRcPins(approvedCommit,candidateDigest,actualDigest){
 if(approvedCommit!=="UNSET"&&(!commitPattern.test(approvedCommit)||/^0{40}$/.test(approvedCommit)))
   throw new Error("malformed-approved-rc-pin");
 if(!digestPattern.test(candidateDigest))throw new Error("malformed-candidate-pin");
 if(!digestPattern.test(actualDigest)||actualDigest!==candidateDigest)
   throw new Error("candidate-source-not-reviewed");
 return {approvedCommit,candidateDigest};
}
