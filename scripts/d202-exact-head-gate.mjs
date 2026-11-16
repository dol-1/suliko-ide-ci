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
console.log('D202 source audit: SHA-bound owner, tamper/v1 refusal, synthetic user data preservation and public hosted CI present');
