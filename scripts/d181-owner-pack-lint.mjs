// D181 owner-phase dry-run lint. No GitHub API, credentials, deploy or tag actions.
import assert from "node:assert/strict";
import fs from "node:fs";
const expected=[
 "docs/owner-pack/OWNER-PHASE-KA-EN.md",
 "docs/owner-pack/ENABLE-PAGES.md",
 "docs/owner-pack/RC-TAG-EXPECTED-SHA.md",
 "docs/owner-pack/SHARE-LINK.md",
 ".github/workflows/d062-docs.yml",
 ".github/workflows/spike04-marketplace-rc.yml",
 "marketplace/rc/EXPECTED_SHA",
 "marketplace/rc/EXPECTED_SHA.candidate",
 "marketplace/rc/marketplace.json",
 "site/mkdocs.yml",
 "site/docs/index.md",
 "site/docs/index.ka.md",
 "site/docs/pilot.ka.md",
 "site/docs/pilot.en.md",
 "site/docs/pilot-metrics.en.md",
 ".github/ISSUE_TEMPLATE/pilot-signup.yml"
];
// Open with O_NOFOLLOW, then inspect and read the SAME already opened file
// descriptor. Never check path metadata then reopen that pathname (TOCTOU).
function readSafely(name){
 const fd=fs.openSync(name,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const st=fs.fstatSync(fd);
  assert(st.isFile(),"D181 unsafe owner-pack input "+name);
  const value=fs.readFileSync(fd,"utf8");
  assert(value.length>4,"D181 empty owner-pack input "+name);
  return value;
 }finally{
  fs.closeSync(fd);
 }
}
const checked=new Map(expected.map(name=>[name,readSafely(name)]));
const read=(name)=>{
 assert(checked.has(name),"D181 unreviewed owner-pack read "+name);
 return checked.get(name);
};
const index=read(expected[0]),pages=read(expected[1]),rc=read(expected[2]),share=read(expected[3]);
const required=[
 [index,["ENABLE-PAGES.md","RC-TAG-EXPECTED-SHA.md","SHARE-LINK.md","NOT authorized"]],
 [pages,["PAGES_ENABLED","d062-docs.yml","GitHub Actions","next reviewed"]],
 [rc,["suliko-hello/v0.1.0-rc.1","EXPECTED_SHA","spike04-marketplace-rc.yml","SEC-04"]],
 [share,["pilot-signup.yml","one link","NOT SENT","SEC-04"]]
];
for(const [text,terms] of required)
 for(const term of terms)assert(text.toLowerCase().includes(term.toLowerCase()),"D181 missing gated instruction: "+term);
for(const [name,reg] of [
 [".github/workflows/d062-docs.yml",/vars\.PAGES_ENABLED\s*==\s*'true'/],
 [".github/workflows/spike04-marketplace-rc.yml",/marketplace\/rc\/EXPECTED_SHA/],
 ["marketplace/rc/EXPECTED_SHA.candidate",/^sha256=[0-9a-f]{64}$/m]
])assert(reg.test(read(name)),"D181 referenced execution gate missing "+name);
assert(/^(UNSET|[0-9a-f]{40})\s*$/.test(read("marketplace/rc/EXPECTED_SHA")),"D181 ambiguous final tag SHA");
assert((index.match(/\| [123] \|/g)||[]).length===3,"D181 owner phase must have exactly three steps");
const lines=share.split(/\r?\n/).filter(x=>x.includes("https://github.com/dol-1/suliko-ide-ci/issues/new?"));
assert(lines.length===1,"D181 share pack must contain one signup URL");
console.log("D181_OWNER_PACK_3_ACTIONS_ALL_REAL_PATHS=PASS (NO publish/tag/send)");
