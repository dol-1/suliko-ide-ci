// Real official cached asset is prepared by setup preflight in a disposable CI home.
import { paths,preview } from "./d058-stage-portable.mjs";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync,writeFileSync,mkdirSync,symlinkSync,lstatSync,existsSync,copyFileSync,unlinkSync,openSync,closeSync,fstatSync,constants } from "node:fs";
import { join } from "node:path";
const env=process.env;
const p=paths();
// Verify contents from the same open descriptor, not an earlier path lstat.
// O_NOFOLLOW refuses swapped symlink leaves on supported native platforms.
function readRegularFixture(filename,encoding) {
  const fd=openSync(filename,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try {
    if(!fstatSync(fd).isFile())throw Error("Fixture must be a regular file");
    return readFileSync(fd,encoding);
  } finally {closeSync(fd);}
}
assert.ok(lstatSync(p.source).isFile(),"Official verified cache asset required");
const srcHash=createHash("sha256").update(readRegularFixture(p.source)).digest("hex");
assert.equal(srcHash,p.sha,"Official download digest differs from approved pin");
assert.equal(readFileSync(p.cacheMarker,"utf8").trimEnd(),p.cacheMarkerRecord,"Preflight must have claimed cache");
assert.equal(await preview("--stage"),"verified-staged");
assert.equal(createHash("sha256").update(readRegularFixture(p.dest)).digest("hex"),p.sha);
assert.equal(lstatSync(p.dest).isSymbolicLink(),false);
if(process.platform!=="win32")assert.equal(lstatSync(p.dest).mode&0o777,0o600);
assert.equal(readFileSync(p.marker,"utf8").trimEnd(),p.markerRecord);
if(process.platform!=="win32")assert.equal(lstatSync(p.marker).mode&0o777,0o600);
assert.equal(await preview("--stage"),"already-verified");
// The correct official cached BYTES alone cannot authorize a new or
// idempotent stage operation when the preflight ownership claim is forged.
const originalCacheMarker=readFileSync(p.cacheMarker,"utf8");
writeFileSync(p.cacheMarker,"FORGED-CACHE-OWNER\n");
await assert.rejects(preview("--stage"),/Refusing/);
assert.equal(createHash("sha256").update(readRegularFixture(p.dest)).digest("hex"),p.sha);
writeFileSync(p.cacheMarker,originalCacheMarker);
assert.equal(await preview("--stage"),"already-verified");
// A forged marker cannot authorize removing a real correct-hash staged asset.
writeFileSync(p.marker,"FORGED-OWNERSHIP\n");
await assert.rejects(preview("--remove-stage"),/Refusing/);
await assert.rejects(preview("--stage"),/Refusing/);
assert.equal(createHash("sha256").update(readRegularFixture(p.dest)).digest("hex"),p.sha);
writeFileSync(p.marker,p.markerRecord+"\n");
assert.equal(await preview("--remove-stage"),"removed");
assert.equal(existsSync(p.dest),false);
assert.equal(existsSync(p.marker),false);
// Foreign bytes may be IDENTICAL to the pinned release: ownership remains absent.
copyFileSync(p.source,p.dest,constants.COPYFILE_EXCL);
await assert.rejects(preview("--remove-stage"),/Refusing/);
await assert.rejects(preview("--stage"),/Refusing/);
assert.equal(createHash("sha256").update(readRegularFixture(p.dest)).digest("hex"),p.sha);
assert.equal(existsSync(p.marker),false);
unlinkSync(p.dest);
// A foreign file with the same name must NOT be overwritten/deleted.
// Copy a private, explicitly new runner fixture with no-clobber semantics.
// Do not write to the path we just checked/deleted (TOCTOU).
const foreignPayload=join(env.RUNNER_TEMP,"d058-foreign-owned-payload");
writeFileSync(foreignPayload,"FOREIGN-DO-NOT-TOUCH",{flag:"wx",mode:0o600});
try{copyFileSync(foreignPayload,p.dest,constants.COPYFILE_EXCL);}
finally{unlinkSync(foreignPayload);}
await assert.rejects(preview("--stage"),/Refusing/);
await assert.rejects(preview("--remove-stage"),/Refusing/);
assert.equal(readRegularFixture(p.dest,"utf8"),"FOREIGN-DO-NOT-TOUCH");
// Reject a symlink or Windows junction at the managed parent, preserving foreign bytes.
const foreign=join(env.RUNNER_TEMP,"d058-foreign-stage");
const redirected=join(env.RUNNER_TEMP,"d058-redirected-stage");
mkdirSync(foreign,{recursive:true});mkdirSync(redirected,{recursive:true});
writeFileSync(join(foreign,"foreign-sentinel"),"PRESERVE");
const key=process.platform==="darwin"?"HOME":"LOCALAPPDATA";
const old=env[key];env[key]=redirected;
if(process.platform==="darwin"){
  mkdirSync(join(redirected,"Library","Application Support"),{recursive:true});
  symlinkSync(foreign,join(redirected,"Library","Application Support","SulikoIDE"),"dir");
}else symlinkSync(foreign,join(redirected,"SulikoIDE"),"junction");
await assert.rejects(preview("--stage"),/redirected/);
await assert.rejects(preview("--remove-stage"),/redirected/);
env[key]=old;
assert.equal(readFileSync(join(foreign,"foreign-sentinel"),"utf8"),"PRESERVE");
console.log("D058 official native Mac/Windows disposable asset staging, idempotence, rollback, foreign-file and diverted-parent negatives PASS. Installer was NEVER executed.");
