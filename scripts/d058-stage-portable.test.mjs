// Real official cached asset is prepared by setup preflight in a disposable CI home.
import { paths,preview } from "./d058-stage-portable.mjs";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync,writeFileSync,mkdirSync,symlinkSync,lstatSync,existsSync } from "node:fs";
import { join } from "node:path";
const env=process.env;
const p=paths();
assert.ok(lstatSync(p.source).isFile(),"Official verified cache asset required");
const srcHash=createHash("sha256").update(readFileSync(p.source)).digest("hex");
assert.equal(srcHash,p.sha,"Official download digest differs from approved pin");
assert.equal(await preview("--stage"),"verified-staged");
assert.equal(createHash("sha256").update(readFileSync(p.dest)).digest("hex"),p.sha);
assert.equal(lstatSync(p.dest).isSymbolicLink(),false);
if(process.platform!=="win32")assert.equal(lstatSync(p.dest).mode&0o777,0o600);
assert.equal(await preview("--stage"),"already-verified");
assert.equal(await preview("--remove-stage"),"removed");
assert.equal(existsSync(p.dest),false);
// A foreign file with the same name must NOT be overwritten/deleted.
writeFileSync(p.dest,"FOREIGN-DO-NOT-TOUCH");
await assert.rejects(preview("--stage"),/Refusing/);
await assert.rejects(preview("--remove-stage"),/Refusing/);
assert.equal(readFileSync(p.dest,"utf8"),"FOREIGN-DO-NOT-TOUCH");
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
