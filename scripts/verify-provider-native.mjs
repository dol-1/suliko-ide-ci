// [ChatGPT] D-046: source-pin plus clean disposable project check.
// This verifies *risk is acknowledged and fixture is clean*, NOT that BB disabled native hooks.
import { lstatSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';
const [projectArg, sourceArg] = process.argv.slice(2);
if (!projectArg || !sourceArg) throw Error('usage: verify-provider-native.mjs <disposable-project> <stock-bridge-sdk-session.ts>');
function fail(msg) { console.error('SEC-02 PROVIDER FAIL: '+msg); process.exit(1); }
const project = resolve(projectArg);
try { if (lstatSync(project).isSymbolicLink()) fail('project path is a symlink'); }
catch { fail('project root missing'); }
const canonical = realpathSync(project);
if (canonical !== project) fail('project root aliases a different path');
for (const name of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME']) {
  const raw=process.env[name];
  if (!raw || !isAbsolute(raw)) fail(name+' must be a distinct absolute non-shared location');
  const target=resolve(raw);
  if (target===project || target.startsWith(project+sep)) fail(name+' must be outside project root');
  try {
    if (lstatSync(target).isSymbolicLink()) fail(name+' symlink not permitted');
    if (realpathSync(target)!==target) fail(name+' resolves through an alias');
  } catch { fail(name+' target directory missing'); }
  if (target === '/' || target === '/tmp' || target === '/home') fail(name+' unsafe shared/global root');
}
const suspect=[
  'CLAUDE.md','AGENTS.md','.claude','.codex','.mcp.json','.agents',
];
for(const path of suspect) {
  if(existsSync(resolve(project,path))) fail('provider-native project settings/hook exposure present: '+path);
}
let source;
try { source=readFileSync(resolve(sourceArg),'utf8'); } catch { fail('pinned stock provider source unavailable'); }
if(!/settingSources:\s*\[\s*["']user["']\s*,\s*["']project["']\s*,\s*["']local["']\s*\]/u.test(source)) {
  fail('stock BB settingSources contract changed; re-review upstream before proceeding');
}
console.log('SEC-02 PROVIDER PASS: stock BB loads user+project+local sources; disposable fixture has no project-native hooks/settings and both global state homes are distinct. RESIDUAL RISK: ancestors and runtime injection not cleared; not an enforced BB isolation switch.');
