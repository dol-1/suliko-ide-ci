import test from "node:test";
import assert from "node:assert/strict";
import {parseSetupArgs} from "./d165-setup-args.mjs";
const pin="a".repeat(64);
test("D165 valid explicit pinned candidate",()=>assert.deepEqual(parseSetupArgs(["--install","--plugin-sha",pin,"--candidate-file","/runner/candidate.tar.gz"]),{mode:"install",sha:pin,candidateFile:"/runner/candidate.tar.gz"}));
test("D165 default safety",()=>assert.equal(parseSetupArgs([]).mode,"dry-run"));
test("D165 uninstall cannot be persuaded to load arbitrary candidate",()=>assert.equal(parseSetupArgs(["--uninstall"]).mode,"uninstall"));
for(const args of [
 ["--install"],["--install","--plugin-sha","UNSET","--candidate-file","/tmp/a"],
 ["--install","--plugin-sha",pin.slice(1),"--candidate-file","/tmp/a"],
 ["--install","--plugin-sha",pin.toUpperCase(),"--candidate-file","/tmp/a"],
 ["--install","--plugin-sha",pin,"--candidate-file","relative"],
 ["--install","--plugin-sha",pin,"--candidate-file","/a\nunsafe"],
 ["--uninstall","--plugin-sha",pin],["--install","--uninstall"],
 ["--install","--install"],["--install","--plugin-sha",pin,"--plugin-sha",pin,"--candidate-file","/tmp/a"],
 ["--install","--candidate-file","/tmp/a"],["--unknown"]]){
 test("D165 fail closed "+JSON.stringify(args),()=>assert.throws(()=>parseSetupArgs(args)));
}
