// D089 cross-OS lock-subset assertion; not an SPDX or shipped-bundle audit.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { lockIds, installedIds } from "./d089-lock-spdx.mjs";

export function checkOsInstalledLockSubset(lockText, tree, platform) {
  if (!["darwin","win32"].includes(platform)) throw Error("Only Mac/Windows matrix");
  const lock=lockIds(lockText), found=installedIds(tree);
  const unknown=[...found.all].filter(x=>!lock.has(x));
  const report={
    platform:platform==="darwin"?"macos-arm64":"windows-x64",
    lockIdentities:lock.size,
    resolvedInstalledIdentities:found.all.size,
    resolvedProductionIdentities:found.production.size,
    lockedNotInstalled: [...lock].filter(x=>!found.all.has(x)).length,
    unexpectedInstalledIdentities:unknown.length,
    note:"OS-resolved installed subset only; missing lock identities not classified, no Syft-SPDX or bundled JS certification",
  };
  if (unknown.length) throw Error("OS installed dependency not in frozen lockfile");
  return report;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length!==4) throw Error("Args");
    const lock=fs.readFileSync(process.argv[2],"utf8");
    const tree=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));
    console.log("D089_OS_LOCK_SUBSET",JSON.stringify(checkOsInstalledLockSubset(lock,tree,process.platform)));
  } catch {
    console.error("D089 OS lock subset fail closed; package names, paths and raw errors withheld");
    process.exitCode=1;
  }
}
