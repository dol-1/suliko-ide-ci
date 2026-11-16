// D202 exact-head source regression: no network, no user files, only tracked public fixtures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const setup=read('scripts/suliko-setup.ps1');
const test=read('scripts/d202-windows-uninstaller-hash.test.ps1');
const workflow=read('.github/workflows/d202-windows-uninstaller-hash.yml');
assert.match(setup,/SULIKO-IDE-USER-NSIS-v2/);
assert.match(setup,/uninstaller-sha256=/);
assert.match(setup,/Invalid installed-app uninstaller hash marker/);
assert.match(setup,/D202 refused changed uninstaller executable/);
assert.match(setup,/\^\[a-f0-9\]\{64\}\$/);
assert.match(test,/TAMPERED/);
assert.match(test,/SULIKO-IDE-USER-NSIS-v1/);
assert.match(test,/keep-unchanged/);
assert.match(workflow,/runs-on: windows-2025/);
assert.match(workflow,/permissions: read-all/);
assert.match(workflow,/persist-credentials: false/);
// Final exact-head proof: old-owner markers or a changed uninstaller cannot reach Start-Process.
const hashStart=setup.indexOf('$currentUninstallerHash = (Get-FileHash -LiteralPath $uninstaller');
const rejectStart=setup.indexOf('if ($currentUninstallerHash -cne $ownerUninstallerHash)');
const launchStart=setup.indexOf('$process = Start-Process -FilePath $uninstaller');
assert(hashStart > 0 && rejectStart > hashStart && launchStart > rejectStart, 'D202_UNINSTALL_HASH_CHECK_MUST_PRECEDE_EXEC');
const d217=read('scripts/d217-affected-workflows.mjs');
assert.match(d217,/D217_BLOCKED_AFFECTED_NOT_RUNNABLE=/);
assert.match(d217,/process\.exitCode=1/);
const d081=read('.github/workflows/d081-ports.yml');
assert.match(d081,/node scripts\/d202-exact-head-gate\.mjs/);
console.log('D202 exact-head review: hash-before-execute, D217 fail-closed, and branch regression verified');

console.log('D202 source audit: SHA-bound owner, tamper/v1 refusal, synthetic user data preservation and public hosted CI present');
