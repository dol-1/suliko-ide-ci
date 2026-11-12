import { previewManifest,safePreviewOutput } from "./d065-source-preview.mjs";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function fixture(fn) {
  const root=mkdtempSync(join(tmpdir(),"d065-fixture-"));
  try{
    for(const name of ["plugins/suliko-hello","plugins/suliko-remote-panel","marketplace"])mkdirSync(join(root,name),{recursive:true});
    writeFileSync(join(root,"marketplace/marketplace.json"),JSON.stringify({schemaVersion:1,name:"suliko-experimental",plugins:[{id:"suliko-hello",source:{git:{url:"https://github.com/dol-1/suliko-ide-ci.git"}}}]}));
    for(const name of ["plugins/suliko-hello","plugins/suliko-remote-panel"])
      writeFileSync(join(root,name,"package.json"),JSON.stringify({name,version:"0.0.1",engines:{bb:">=0.49.0 <0.49.1",bbPluginSdk:">=0.6.132 <0.6.133"},devDependencies:{"@get-bb/plugin-sdk":"0.6.132"}}));
    writeFileSync(join(root,"plugins/suliko-hello/app.tsx"),"export default 1;");
    fn(root);
  } finally{rmSync(root,{recursive:true,force:true});}
}
test("deterministic canonical content hash, clear NONRELEASE state",()=>fixture(root=>{
  const a=previewManifest(root),b=previewManifest(root);
  assert.deepEqual(a,b);
  assert.equal(a.status,"not-released");
  assert.equal(a.complete_sbom,false);
  assert.equal(a.source_only,true);
}));
test("content mutation changes release preview SHA",()=>fixture(root=>{
  const a=previewManifest(root).manifest_sha256;
  writeFileSync(join(root,"plugins/suliko-hello/app.tsx"),"export default 2;");
  assert.notEqual(previewManifest(root).manifest_sha256,a);
}));
test("untrusted marketplace rejected",()=>fixture(root=>{
  writeFileSync(join(root,"marketplace/marketplace.json"),"{}");
  assert.throws(()=>previewManifest(root),/catalog/);
}));
test("unreviewed SDK dependency rejected",()=>fixture(root=>{
  const path=join(root,"plugins/suliko-hello/package.json");
  writeFileSync(path,JSON.stringify({engines:{bb:">=0.49.0 <0.49.1"},devDependencies:{"@get-bb/plugin-sdk":"0.6.141"}}));
  assert.throws(()=>previewManifest(root),/pin/);
}));
test("refuse symlink inside source tree",()=>fixture(root=>{
  symlinkSync(join(root,"marketplace/marketplace.json"),join(root,"plugins/suliko-hello/unsafe.json"));
  assert.throws(()=>previewManifest(root),/unsafe/);
}));

test("exact private preview path refuses traversal, sibling-prefix and missing runner root",()=>{
  const temp=join(tmpdir(),"d065-safe-temp");
  assert.equal(safePreviewOutput(join(temp,"d065-preview.json"),temp),join(temp,"d065-preview.json"));
  assert.throws(()=>safePreviewOutput(join(temp,"..","outside.json"),temp),/exact runner-private/);
  assert.throws(()=>safePreviewOutput(join(temp+"-foreign","d065-preview.json"),temp),/exact runner-private/);
  assert.throws(()=>safePreviewOutput(join(temp,"other.json"),temp),/exact runner-private/);
  assert.throws(()=>safePreviewOutput(join(temp,"d065-preview.json"),""),/exact runner-private/);
});

test("catalog leaf symlink rejected before JSON parsing",()=>fixture(root=>{
  const leaf=join(root,"marketplace/marketplace.json");
  rmSync(leaf);
  symlinkSync(join(root,"plugins/suliko-hello/package.json"),leaf);
  assert.throws(()=>previewManifest(root),/unsafe preview marketplace catalog/);
}));
test("catalog parent symlink cannot redirect preview to external tree",()=>fixture(root=>{
  const oldDir=join(root,"marketplace");
  const target=join(root,"marketplace-target");
  renameSync(oldDir,target);
  symlinkSync(target,oldDir,"dir");
  assert.throws(()=>previewManifest(root),/unsafe preview marketplace catalog/);
}));

test("plugin ancestor symlink cannot redirect source tree preview",()=>fixture(root=>{
  const original=join(root,"plugins"),target=join(root,"plugins-target");
  renameSync(original,target);
  symlinkSync(target,original,"dir");
  assert.throws(()=>previewManifest(root),/unsafe preview plugins directory/);
}));
