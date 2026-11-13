// D-089: compare a gh-verified same-run attestation subject to local artifact bytes.
// The CLI MUST perform crypto trust/source-workflow binding first. This only audits
// digest/statement shape and does not substitute for certificate validation.
import fs from "node:fs";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";

export function checkAttestationResults(results, localSha256) {
  if(!Array.isArray(results)||results.length<1||results.length>30)
    throw Error("Missing/oversized verified results");
  if(typeof localSha256!=="string"||!/^[a-f0-9]{64}$/.test(localSha256))
    throw Error("Bad artifact sha256");
  let matches=0;
  for(const entry of results){
    const vr=entry?.verificationResult;
    const statement=vr?.statement;
    if(statement?.predicateType!=="https://slsa.dev/provenance/v1" ||
       !Array.isArray(statement.subject)||statement.subject.length<1)
      throw Error("Bad SLSA provenance statement");
    // Only a verified subject digest is accepted, not untrusted predicate metadata.
    for(const subject of statement.subject){
      const digest=subject?.digest?.sha256;
      if(typeof digest!=="string"||!/^[a-f0-9]{64}$/.test(digest))
        throw Error("Malformed attestation subject sha256");
      if(digest!==localSha256)throw Error("Different artifact digest");
      matches++;
    }
  }
  if(matches!==1)throw Error("Expected exactly one subject match");
  return {verifiedAttestationSubjects:matches,subjectSha256Matches:true,
    note:"CLI separately verified source SHA/ref, signer workflow and trust certificate"};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==4)throw Error("Usage");
    const report=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
    const hash=crypto.createHash("sha256").update(fs.readFileSync(process.argv[3])).digest("hex");
    console.log("D089_ATTESTATION",JSON.stringify(checkAttestationResults(report,hash)));
  }catch{console.error("D089 FAIL-CLOSED: verified provenance subject mismatch; private/raw details withheld");process.exitCode=1}
}
