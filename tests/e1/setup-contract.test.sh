#!/usr/bin/env bash
# E1: offline, synthetic ONLY. Never downloads/executes installers.
set -Eeuo pipefail
umask 077
repo="$(git -C "$(dirname "${BASH_SOURCE[0]}")/../.." rev-parse --show-toplevel)"
script="$repo/scripts/suliko-setup.sh"
test -f "$script"
remote="$(git -C "$repo" remote get-url origin)"
case "$remote" in
  https://github.com/dol-1/suliko-ide-ci|https://github.com/dol-1/suliko-ide-ci.git) ;;
  *) printf "%s\\n" "Not an authorized PUBLIC CI checkout" >&2; exit 2 ;;
esac
root="$(mktemp -d "${TMPDIR:-/tmp}/suliko-e1-fixture-XXXXXXXX")"
trap 'rm -rf -- "$root"' EXIT
mkdir -m 700 -p "$root/home" "$root/foreign"
printf 'PRESERVE-FOREIGN\n' > "$root/foreign/sentinel"
pass=0
run(){ env -i HOME="$root/home" TMPDIR="$root" PATH=/usr/bin:/bin bash "$script" "$@"; }
ok(){ pass=$((pass+1)); printf 'E1 TEST %d PASS: %s\n' "$pass" "$1"; }
# 1. Dry run can only report the preview, not touch the synthetic HOME.
run --dry-run >"$root/out" 2>"$root/err"
grep -q 'PREVIEW ONLY' "$root/out"
grep -q 'NOT implemented' "$root/out"
test ! -e "$root/home/.cache"
ok 'preview has no filesystem or install side effects'
# 2. Unknown flags and 3. missing verification operand fail closed.
if run --install >"$root/out" 2>"$root/err"; then exit 1; else test "$?" -eq 2; fi
ok 'unimplemented install option refused'
if run --verify-file >"$root/out" 2>"$root/err"; then exit 1; else test "$?" -eq 2; fi
ok 'missing verify-file operand refused'
# 4. Invalid local file fails SHA-256. No download or execution.
printf 'FAKE NOT OFFICIAL\n' > "$root/bad-image"
if run --verify-file "$root/bad-image" >"$root/out" 2>"$root/err"; then exit 1; fi
grep -q 'SHA-256 mismatch' "$root/err"
ok 'tampered offline installer rejected'
# 5. Symlinks are refused, preserving the foreign file contents.
ln -s "$root/foreign/sentinel" "$root/symlink-image"
if run --verify-file "$root/symlink-image" >"$root/out" 2>"$root/err"; then exit 1; fi
test "$(cat "$root/foreign/sentinel")" = 'PRESERVE-FOREIGN'
ok 'symlinked verification file refused'
# 6. Symlinked cache directory cannot redirect --uninstall.
mkdir -m 700 "$root/home/.cache"
ln -s "$root/foreign" "$root/home/.cache/suliko-ide"
if run --uninstall >"$root/out" 2>"$root/err"; then exit 1; fi
test "$(cat "$root/foreign/sentinel")" = 'PRESERVE-FOREIGN'
rm "$root/home/.cache/suliko-ide"
ok 'uninstall refuses foreign cache symlink'
# 7. Even a same-named file is foreign unless its verified ownership marker exists.
mkdir -m 700 "$root/home/.cache/suliko-ide"
asset="$root/home/.cache/suliko-ide/bb-0.49.0-x86_64.AppImage"
marker="$root/home/.cache/suliko-ide/.suliko-managed-bb-0.49.0-x86_64.AppImage.sha256"
printf 'SYNTHETIC-FOREIGN-FILE\n' > "$asset"
printf 'PRESERVE\n' > "$root/home/.cache/suliko-ide/foreign.txt"
run --uninstall >"$root/out" 2>"$root/err"
test "$(cat "$asset")" = 'SYNTHETIC-FOREIGN-FILE'
test "$(cat "$root/home/.cache/suliko-ide/foreign.txt")" = PRESERVE
ok 'uninstall never deletes a filename without a valid ownership marker'
# 8. Download rejects an existing cache entry before any network call.
if run --download-verified >"$root/out" 2>"$root/err"; then exit 1; fi
grep -q 'refusing overwrite' "$root/err"
test "$(cat "$asset")" = 'SYNTHETIC-FOREIGN-FILE'
ok 'download cannot overwrite a preexisting same-named file (no network)'
# 9. Forged or malformed ownership markers cannot authorize deletion.
printf 'FORGED-MARKER\n' > "$marker"
if run --uninstall >"$root/out" 2>"$root/err"; then exit 1; fi
test "$(cat "$asset")" = 'SYNTHETIC-FOREIGN-FILE'
rm "$marker"
ok 'forged marker rejected without file deletion'
# 10. Marker symlink cannot authorize deletion, including its target.
ln -s "$root/foreign/sentinel" "$marker"
if run --uninstall >"$root/out" 2>"$root/err"; then exit 1; fi
test "$(cat "$root/foreign/sentinel")" = 'PRESERVE-FOREIGN'
test "$(cat "$asset")" = 'SYNTHETIC-FOREIGN-FILE'
rm "$marker"
ok 'symlinked marker rejected without following foreign target'
# 11. With a matching ownership marker AND checksum, only tracked asset is removed.
# Offline digest shim represents a previously verified asset; NOT a real BB hash check.
mkdir -m 700 "$root/hash-shim"
cat > "$root/hash-shim/shasum" <<'MOCK_HASH'
#!/usr/bin/env bash
[[ "$1" == "-a" && "$2" == "256" ]] || exit 2
if [[ "$(cat "$3")" == 'SYNTHETIC-VERIFIED-FIXTURE' ]]; then
  printf '%s  %s\n' '8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770' "$3"
else
  /usr/bin/sha256sum "$3"
fi
MOCK_HASH
chmod 700 "$root/hash-shim/shasum"
printf 'SYNTHETIC-VERIFIED-FIXTURE' > "$asset"
printf '%s\n' 'SULIKO-IDE-VERIFIED-v1 bb-0.49.0-x86_64.AppImage 8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770' > "$marker"
env -i HOME="$root/home" TMPDIR="$root" PATH="$root/hash-shim:/usr/bin:/bin" bash "$script" --uninstall >"$root/out" 2>"$root/err"
test ! -e "$asset"
test ! -e "$marker"
test "$(cat "$root/home/.cache/suliko-ide/foreign.txt")" = PRESERVE
test "$(cat "$root/foreign/sentinel")" = 'PRESERVE-FOREIGN'
ok 'verified synthetic marker and hash allow tracked deletion only'
printf 'E1 OFFLINE SYNTHETIC %d/%d PASS; no BB install, network, key, user HOME or production Remote\n' "$pass" "$pass"
