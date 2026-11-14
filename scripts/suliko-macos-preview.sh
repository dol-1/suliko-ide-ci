#!/usr/bin/env bash
# Official BB ARM64 user-app staging PREVIEW. No install service, GUI launch or plugin.
set -Eeuo pipefail
umask 077
usage() { echo 'Usage: suliko-macos-preview.sh --dry-run|--install-preview|--uninstall-preview (NOT beta)'; }
if [[ $# -ne 1 ]]; then usage >&2; exit 2; fi
case "$1" in
  --dry-run|--install-preview|--uninstall-preview) mode="$1";;
  --help|-h) usage; exit 0;;
  *) usage >&2; exit 2;;
esac
if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ||
      -z "$HOME" || "$HOME" = "/" || "$(id -u)" -eq 0 ||
      -L "$HOME" || -L "$HOME/Applications" ||
      -L "$HOME/.cache" || -L "$HOME/.cache/suliko-ide" ]]; then
  echo 'D102 refused privileged, unsupported or redirected managed location' >&2
  exit 2
fi
root="$(cd -- "$(dirname -- "$0")" && pwd)"
sha='5bebb0b635c1c8b14e549fe3799152d8a6375bb2e8259be328897e1906f63e17'
asset='bb-0.49.0-arm64.dmg'
cache="$HOME/.cache/suliko-ide/$asset"
cache_marker="$HOME/.cache/suliko-ide/.suliko-managed-$asset.sha256"
app="$HOME/Applications/SulikoBBPreview.app"
marker="$HOME/Applications/.suliko-bb-preview-0.49.0-arm64.sha256"
record="SULIKO-BB-MAC-PREVIEW-v1 $sha"
cache_record="SULIKO-IDE-VERIFIED-v1 $asset $sha"
verify_cache() {
  [[ -f "$cache" && ! -L "$cache" && -f "$cache_marker" && ! -L "$cache_marker" &&
     "$(cat -- "$cache_marker")" = "$cache_record" ]] || return 1
  bash "$root/suliko-setup.sh" --verify-file "$cache" >/dev/null
}
verify_app() {
  [[ -d "$app" && ! -L "$app" && -f "$marker" && ! -L "$marker" &&
     "$(cat -- "$marker")" = "$record" &&
     -x "$app/Contents/MacOS/bb" && ! -L "$app/Contents/MacOS/bb" ]] || return 1
  codesign --verify --deep --strict "$app" >/dev/null 2>&1
}
case "$mode" in
  --dry-run)
    bash "$root/suliko-setup.sh" --dry-run >/dev/null
    echo 'D102 DRY RUN: zero user files changed.'
    ;;
  --install-preview)
    if [[ -e "$app" || -L "$app" || -e "$marker" || -L "$marker" ]]; then
      verify_app || { echo 'D102 refused existing unowned or modified app' >&2; exit 1; }
      verify_cache || { echo 'D102 existing app but no verified owned DMG cache' >&2; exit 1; }
      echo 'D102 PREVIEW existing verified stage; no overwrite.'
      exit 0
    fi
    if [[ -e "$cache" || -L "$cache" || -e "$cache_marker" || -L "$cache_marker" ]]; then
      verify_cache || { echo 'D102 refused existing unowned DMG cache' >&2; exit 1; }
    else
      bash "$root/suliko-setup.sh" --download-verified >/dev/null
      verify_cache || { echo 'D102 official DMG failed verification' >&2; exit 1; }
    fi
    mkdir -p -- "$HOME/Applications"
    [[ ! -L "$HOME/Applications" && ! -e "$app" && ! -L "$app" &&
       ! -e "$marker" && ! -L "$marker" ]] ||
      { echo 'D102 user app stage occupied' >&2; exit 1; }
    mount="$(mktemp -d /tmp/d102-macos-mount.XXXXXXXX)"
    mounted=0
    detach() {
      if [[ "$mounted" = 1 ]]; then hdiutil detach -quiet "$mount" >/dev/null 2>&1 || true; fi
      rmdir "$mount" >/dev/null 2>&1 || true
    }
    trap detach EXIT
    hdiutil attach -readonly -nobrowse -quiet -mountpoint "$mount" "$cache"
    mounted=1
    source_app="$(find "$mount" -maxdepth 2 -type d -name 'bb.app' -print -quit)"
    [[ -n "$source_app" && ! -L "$source_app" ]] ||
      { echo 'D102 official DMG app bundle missing' >&2; exit 1; }
    # Preserve any quarantine metadata that exists on the verified DMG app.
    # Never suppress Gatekeeper attributes during a preview copy.
    env -u DITTONORSRC ditto --qtn "$source_app" "$app"
    [[ -x "$app/Contents/MacOS/bb" && ! -L "$app/Contents/MacOS/bb" ]] ||
      { echo 'D102 copied app has no trusted executable' >&2; exit 1; }
    codesign --verify --deep --strict "$app" >/dev/null 2>&1 ||
      { echo 'D102 copied app signature failed; unowned stage left for review' >&2; exit 1; }
    ( set -C; printf '%s\n' "$record" > "$marker" ) ||
      { echo 'D102 could not create exclusive ownership record' >&2; exit 1; }
    verify_app
    echo 'D102 PREVIEW SHA-pinned signed app staged as user; NOT executed.'
    ;;
  --uninstall-preview)
    if [[ -e "$app" || -L "$app" || -e "$marker" || -L "$marker" ]]; then
      verify_app || { echo 'D102 refused delete of unowned/modified user app' >&2; exit 1; }
      rm -rf -- "$app"
      rm -f -- "$marker"
    fi
    bash "$root/suliko-setup.sh" --uninstall >/dev/null
    [[ ! -e "$app" && ! -L "$app" && ! -e "$marker" ]] || exit 1
    echo 'D102 PREVIEW owned app/cache removed; other files untouched.'
    ;;
esac
