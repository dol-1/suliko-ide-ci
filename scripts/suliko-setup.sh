#!/usr/bin/env bash
# Suliko E1 preflight: official BB asset only, checksum verified, never executed.
set -euo pipefail
umask 077
version="0.49.0"
tag="desktop-v0.49.0"
mode="dry-run"
verify_path=""
usage() {
  printf '%s\n' 'Usage: suliko-setup.sh [--dry-run|--download-verified|--verify-file PATH|--uninstall]'
  printf '%s\n' 'PREVIEW ONLY: downloads and verifies the official BB installer; does not install BB or plugins.'
}
if [[ $# -gt 0 ]]; then
  case "$1" in
    --dry-run) mode="dry-run"; shift ;;
    --download-verified) mode="download-verified"; shift ;;
    --uninstall) mode="uninstall"; shift ;;
    --verify-file) mode="verify-file"; shift; [[ $# -gt 0 ]] || { usage; exit 2; }; verify_path="$1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
fi
[[ $# -eq 0 ]] || { usage; exit 2; }
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) asset="bb-0.49.0-x86_64.AppImage"; sha="8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770" ;;
  Darwin-arm64) asset="bb-0.49.0-arm64.dmg"; sha="5bebb0b635c1c8b14e549fe3799152d8a6375bb2e8259be328897e1906f63e17" ;;
  *) printf '%s\n' 'Unsupported platform/CPU. See official BB README for npx fallback.' >&2; exit 2 ;;
esac
cache="$HOME/.cache/suliko-ide"
destination="$cache/$asset"
marker="$cache/.suliko-managed-$asset.sha256"
marker_record="SULIKO-IDE-VERIFIED-v1 $asset $sha"
url="https://github.com/get-bb/bb/releases/download/$tag/$asset"
hash_file() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}';
  elif command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}';
  else printf '%s\n' 'No SHA-256 utility available' >&2; return 2; fi
}
# Never follow a redirected cache tree during download or cleanup.
ensure_managed_cache_path() {
  for candidate in "$HOME/.cache" "$cache"; do
    if [[ -L "$candidate" ]]; then
      printf '%s\n' 'Refusing symlinked Suliko cache path' >&2
      return 1
    fi
  done
}
check_file() {
  [[ -f "$1" && ! -L "$1" ]] || { printf '%s\n' 'Missing regular file or symlink refused' >&2; return 1; }
  local digest
  digest="$(hash_file "$1")" || return
  [[ "$digest" == "$sha" ]] || { printf '%s\n' 'SHA-256 mismatch; file rejected' >&2; return 1; }
  printf '%s\n' 'Official release SHA-256 verified'
}
case "$mode" in
  dry-run)
    printf 'PREVIEW ONLY | official BB %s | asset: %s\n' "$version" "$asset"
    printf '%s\n' 'A real install, plugin configuration, and service changes are NOT implemented.'
    ;;
  verify-file) check_file "$verify_path" ;;
  download-verified)
    ensure_managed_cache_path
    # Never replace a same-named file that might belong to the user.
    [[ ! -e "$destination" && ! -L "$destination" && ! -e "$marker" && ! -L "$marker" ]] ||
      { printf '%s\n' 'Cache target already exists; refusing overwrite' >&2; exit 1; }
    command -v curl >/dev/null 2>&1 || { printf '%s\n' 'curl required' >&2; exit 2; }
    mkdir -p "$cache"
    tmp="$(mktemp "$cache/.bb-verified.XXXXXXXX")"
    trap 'rm -f "$tmp"' EXIT
    curl --fail --location --proto '=https' --tlsv1.2 --retry 2 --silent --show-error --output "$tmp" "$url"
    check_file "$tmp"
    # Hard-link creation is no-clobber even if another process won a race.
    ln "$tmp" "$destination" || { printf '%s\n' 'Cache target appeared; refusing overwrite' >&2; exit 1; }
    rm -f -- "$tmp"
    # Exclusive marker creation; a failure leaves an untracked file, never
    # an authorization to delete that file on a subsequent --uninstall.
    ( set -C; printf '%s\n' "$marker_record" > "$marker" ) ||
      { printf '%s\n' 'Ownership marker creation failed' >&2; exit 1; }
    trap - EXIT
    printf 'Verified official BB asset saved at: %s\n' "$destination"
    printf '%s\n' 'It was NOT executed or installed.'
    ;;
  uninstall)
    ensure_managed_cache_path
    # A matching marker is required: filename alone never establishes ownership.
    if [[ -e "$marker" || -L "$marker" ]]; then
      [[ -f "$marker" && ! -L "$marker" && "$(cat "$marker")" == "$marker_record" ]] ||
        { printf '%s\n' 'Invalid ownership marker; refusing removal' >&2; exit 1; }
      if [[ -e "$destination" || -L "$destination" ]]; then
        check_file "$destination" >/dev/null ||
          { printf '%s\n' 'Managed installer changed; refusing removal' >&2; exit 1; }
        rm -f -- "$destination"
      fi
      rm -f -- "$marker"
    fi
    if [[ -d "$cache" && ! -L "$cache" ]]; then rmdir "$cache" 2>/dev/null || true; fi
    printf '%s\n' 'Suliko tracked cache cleanup finished; untracked files and BB data untouched.'
    ;;
esac
