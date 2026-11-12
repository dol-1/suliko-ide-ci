// [ChatGPT] D-043, pnpm 9.15.0 production-only license audit.
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
const [project, file] = process.argv.slice(2);
if (!project || !file) throw new Error('usage: node plugin-license-audit.mjs <plugin-dir> <pnpm-license-json>');
const manifest = JSON.parse(readFileSync(resolve(project, 'package.json'), 'utf8'));
const raw = readFileSync(resolve(file), 'utf8').trim();
const catalog = raw === 'No licenses in packages found' ? {} : JSON.parse(raw);
if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) throw Error('pnpm license output must group packages by license');
const results = [];
for (const [license, entries] of Object.entries(catalog)) {
  if (!Array.isArray(entries)) throw Error('Malformed pnpm license group: ' + license);
  for (const p of entries) {
    if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !Array.isArray(p.versions) || !p.versions.length || p.versions.some(v=>typeof v !== 'string')) {
      throw Error('Malformed pnpm license package metadata: ' + license);
    }
    for (const version of p.versions) results.push({ name: p.name, version, license: license.trim() });
  }
}
const depCount = Object.keys(manifest.dependencies || {}).length + Object.keys(manifest.optionalDependencies || {}).length;
if (depCount && !results.length) throw Error('Missing production license results despite declared dependencies');
const unknown = results.filter(x => !x.license || /unknown|undefined|unlicensed|noassertion|see license|licenseref/i.test(x.license));
const gpl = results.filter(x => /(?:^|[^A-Za-z])(?:AGPL|GPL)(?:[- .\d(]|$)/i.test(x.license));
const lgpl = results.filter(x => /(?:^|[^A-Za-z])LGPL(?:[- .\d(]|$)/i.test(x.license));
const lines = [
  '# D-043 shipped-plugin dependency license audit — ' + basename(project),
  '',
  'Production dependency license records: ' + results.length,
  'Unknown/unclear: ' + unknown.length,
  'GPL/AGPL: ' + gpl.length,
  'LGPL (manual review): ' + lgpl.length,
  '',
  '| Package | Version | Declared license |',
  '|---|---|---|',
  ...results.sort((a,b)=>a.name.localeCompare(b.name)).map(x=> '| ' + x.name.replaceAll('|','\\|') + ' | ' + x.version + ' | ' + x.license.replaceAll('|','\\|') + ' |'),
  '',
  '**Scope:** only this Suliko plugin production dependency closure. BB itself and build/dev toolchain are NOT bundled by Suliko.',
];
console.log(lines.join('\n'));
if (unknown.length || gpl.length) {
  console.error('FAIL: unresolved or GPL/AGPL production licenses must be reviewed before distributing plugin');
  process.exitCode = 1;
}
