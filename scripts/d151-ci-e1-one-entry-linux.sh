#!/usr/bin/env bash
# D151: deliberately CI-ONLY, nonprivileged Linux one-entry *prototype*.
# One command stages exact official GUI, uses real published stock npm CLI for
# SEC02 + local Hello, checks genuine installed UI, then uninstalls own files.
# No end-user setup release, RC marketplace, real providers or owner data.
set -euo pipefail
umask 077
[[ "$#" = 0 && "$CI" = true && "$GITHUB_ACTIONS" = true &&
   "$GITHUB_REPOSITORY" = 'dol-1/suliko-ide-ci' ]] ||
  { echo 'D151 restricted to exact disposable public CI repository' >&2; exit 2; }
[[ "$(uname -s)" = Linux && "$(uname -m)" = x86_64 && "$(id -u)" -ne 0 ]] ||
  { echo 'D151 requires nonroot native Linux x64 CI' >&2; exit 2; }
[[ "$RUNNER_TEMP" = /* && "$RUNNER_TEMP" != / && -d "$RUNNER_TEMP" && ! -L "$RUNNER_TEMP" ]] ||
  { echo 'D151 requires a regular CI-owned temp root' >&2; exit 2; }
command -v xvfb-run >/dev/null
command -v ss >/dev/null
command -v npm >/dev/null
command -v node >/dev/null
[[ "$(node -p 'process.version')" = v22.19.0 ]] ||
  { echo 'D151 published npm runtime requires pinned Node22.19' >&2; exit 2; }
work="$RUNNER_TEMP/d151-owned-home"
pkg="$RUNNER_TEMP/d151-published-cli"
[[ ! -e "$work" && ! -L "$work" && ! -e "$pkg" && ! -L "$pkg" ]] ||
  { echo 'D151 refuses reused disposable test directories' >&2; exit 2; }
export HOME="$work" BB_DATA_DIR="$work/bb-disposable" BB_TELEMETRY=false
export BB_SERVER_BIND_HOST=127.0.0.1 BB_SERVER_PORT=38906 BB_HOST_DAEMON_PORT=38907 APPIMAGE_EXTRACT_AND_RUN=1
mkdir -m 700 -p "$HOME" "$BB_DATA_DIR" "$pkg"
begin="$(date +%s)"
app_pid=""
bb_app_pid=""
cleanup() {
  code="$?"
  trap - EXIT
  set +e
  if [[ -n "$app_pid" ]]; then
    kill -TERM -- "-$app_pid" >/dev/null 2>&1 || true
    sleep 2
    kill -KILL -- "-$app_pid" >/dev/null 2>&1 || true
    wait "$app_pid" >/dev/null 2>&1 || true
  fi
  if command -v bb-app >/dev/null 2>&1; then
    bb-app stop --data-dir "$BB_DATA_DIR" >/dev/null 2>&1 || true
  fi
  if [[ -n "$bb_app_pid" ]]; then
    kill "$bb_app_pid" >/dev/null 2>&1 || true
    wait "$bb_app_pid" >/dev/null 2>&1 || true
  fi
  # This owner-checked CLI never deletes third-party/user BB data.
  bash scripts/suliko-setup.sh --uninstall >/dev/null 2>&1 || true
  exit "$code"
}
trap cleanup EXIT

# Actual one-entry provisioning begins here (no distinct external CI CLI
# configuration step). The user-facing script alone currently stages the GUI;
# this reviewed experiment layers separate published stock CLI configuration
# in a SINGLE explicit CI-only orchestrator, not a claim of shipped installer.
bash scripts/suliko-setup.sh --dry-run >/dev/null
bash scripts/suliko-setup.sh --install >/dev/null
app="$HOME/.local/share/suliko-ide/bb-0.49.0-x86_64.AppImage"
launcher="$HOME/.local/bin/suliko-bb-desktop"
test -x "$app"
test "$(readlink "$launcher")" = "$app"
printf '%s  %s\n' '8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770' "$app" | sha256sum -c - >/dev/null

npm view bb-app@0.49.0 --json >"$RUNNER_TEMP/d151-registry-metadata.json"
node - "$RUNNER_TEMP/d151-registry-metadata.json" <<'NODE'
const fs=require('node:fs'),m=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(m.name!=='bb-app'||m.version!=='0.49.0'||!/^sha512-[A-Za-z0-9+/]+=*$/.test(m.dist?.integrity||''))
 throw Error('D151 published runtime registry identity not confirmed');
NODE
# Published pinned stock package, never source-built BB; all install hooks
# run inside isolated hosted CI, no real end-user installation via npm.
npm --prefix "$pkg" install --no-audit --no-fund --save-exact bb-app@0.49.0 >/dev/null
node - "$pkg/node_modules/bb-app/package.json" <<'NODE'
const p=require(process.argv[2]);
if(p.name!=='bb-app'||p.version!=='0.49.0')throw Error('D151 unexpected published stock CLI');
NODE
export PATH="$pkg/node_modules/.bin:$PATH"
command -v bb
command -v bb-app
# The actual official AppImage must start under nonprivileged CI before any
# source-level fixture assumptions. Never use provider accounts.
setsid xvfb-run -a "$app" >"$RUNNER_TEMP/d151-gui.log" 2>&1 &
app_pid="$!"
sleep 20
kill -0 "$app_pid" 2>/dev/null || { echo 'D151 official AppImage GUI exited before liveness check' >&2; exit 1; }
kill -TERM -- "-$app_pid" >/dev/null 2>&1 || true
wait "$app_pid" >/dev/null 2>&1 || true
app_pid=""
bb-app start --data-dir "$BB_DATA_DIR" --server-bind-host 127.0.0.1 --server-port 38906 --host-daemon-port 38907 --no-in-app-updates >"$RUNNER_TEMP/d151-server.log" 2>&1 &
bb_app_pid="$!"
ready=0
for i in $(seq 1 60); do
  if bb plugin list --json >"$RUNNER_TEMP/d151-before.json" 2>/dev/null; then ready=1; break; fi
  sleep 2
done
[[ "$ready" = 1 ]] || { echo 'D151 published loopback CLI unavailable' >&2; exit 1; }
node - "$RUNNER_TEMP/d151-before.json" <<'NODE' >"$RUNNER_TEMP/d151-forbidden"
const fs=require('node:fs'),v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(v.plugins))throw Error('D151 real BB plugins unavailable');
for(const id of ['bb--mcp','account-pool','connect','bb--connect-next','memory']){
 const found=v.plugins.filter(p=>p.id===id);
 if(found.length>1)throw Error('D151 duplicate forbidden BB ID');
 if(found.length===1&&found[0].enabled===true)console.log(id);
}
NODE
while IFS= read -r id; do
  [[ -n "$id" ]] || continue
  bb plugin disable "$id" >/dev/null
done <"$RUNNER_TEMP/d151-forbidden"
bb plugin install ./plugins/suliko-hello --yes >/dev/null
bb plugin list --json >"$RUNNER_TEMP/d151-after.json"
node - "$RUNNER_TEMP/d151-after.json" <<'NODE'
const fs=require('node:fs'),v=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(v.plugins))throw Error('D151 missing real plugin list');
for(const id of ['bb--mcp','account-pool','connect','bb--connect-next','memory']){
 const found=v.plugins.filter(p=>p.id===id);
 if(found.length>1||(found.length===1&&(found[0].enabled!==false||found[0].status!=='disabled')))
   throw Error('D151 real forbidden plugin not disabled');
}
const own=v.plugins.filter(p=>p.id==='suliko-hello'||p.id==='bb-plugin-suliko-hello');
if(own.length!==1||own[0].enabled!==true)throw Error('D151 real local Hello not enabled');
NODE
bash scripts/verify-hardened.sh
project="$HOME/d151-synthetic-project"
mkdir -m 700 -p "$project"
printf '%s\n' 'D151 synthetic public runner project only' >"$project/README.md"
git -C "$project" init -b main >/dev/null
git -C "$project" add README.md
bb project create --name d134-linux-synthetic --root "$project" >/dev/null
export D134_OFFICIAL_APPIMAGE="$app" D134_BB_WEB_URL='http://127.0.0.1:38906/'
xvfb-run -a node tests/parity/d134-linux-installed-appimage.mjs
ss -ltn >"$RUNNER_TEMP/d151-listeners"
grep -Eq '127[.]0[.]0[.]1:38906([[:space:]]|$)' "$RUNNER_TEMP/d151-listeners"
grep -Eq '127[.]0[.]0[.]1:38907([[:space:]]|$)' "$RUNNER_TEMP/d151-listeners"
bb-app stop --data-dir "$BB_DATA_DIR" >/dev/null
bash scripts/suliko-setup.sh --uninstall >/dev/null
test ! -e "$app" && test ! -L "$launcher" && test ! -e "$HOME/.cache/suliko-ide/bb-0.49.0-x86_64.AppImage"
elapsed="$(($(date +%s)-begin))"
echo "D151_NATIVE_CI_ONE_ENTRY_PARTIAL=PASS" >>"$GITHUB_STEP_SUMMARY"
echo "D151_SETUP_ELAPSED_SECONDS=$elapsed" >>"$GITHUB_STEP_SUMMARY"
echo 'D151 CI-only single script official Linux AppImage + genuine published versioned stock CLI hardened disabled plugins and local Hello in actual installed GUI, cleanup; no user ship, immutable RC marketplace, 3OS or SEC04/beta GO.' >>"$GITHUB_STEP_SUMMARY"
test "$elapsed" -lt 900
