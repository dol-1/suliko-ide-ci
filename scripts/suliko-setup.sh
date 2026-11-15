#!/usr/bin/env bash
# Suliko E1 user-only partial native stage: verified official BB asset, not a released setup.
# Full SEC02 and own plugin are independent until the unified E1 matrix passes.
set -euo pipefail
umask 077
version="0.49.0"
tag="desktop-v0.49.0"
mode="dry-run"
verify_path=""
plugin_sha=""
candidate_file=""
usage() {
  printf '%s\n' 'Usage: suliko-setup.sh [--dry-run|--download-verified|--install|--verify-file PATH|--uninstall]'
  printf '%s\n' 'Complete E1 candidate setup: --install --plugin-sha <64hex> --candidate-file /absolute/path/to/suliko-hello-v0.1.0-rc.1.tar.gz (Node 22.19.0 required).'
  printf '%s\n' 'Without candidate flags, --install is legacy official-GUI-only PREVIEW; no beta/release claim.'
}
if [[ $# -gt 0 ]]; then
  case "$1" in
    --dry-run) mode="dry-run"; shift ;;
    --download-verified) mode="download-verified"; shift ;;
    --install) mode="install"; shift ;;
    --uninstall) mode="uninstall"; shift ;;
    --verify-file) mode="verify-file"; shift; [[ $# -gt 0 ]] || { usage; exit 2; }; verify_path="$1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
fi
if [[ "$mode" = install ]]; then
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --plugin-sha) [[ -z "$plugin_sha" && $# -ge 2 ]] || { usage; exit 2; }; plugin_sha="$2"; shift 2 ;;
      --candidate-file) [[ -z "$candidate_file" && $# -ge 2 ]] || { usage; exit 2; }; candidate_file="$2"; shift 2 ;;
      *) usage; exit 2 ;;
    esac
  done
fi
[[ $# -eq 0 ]] || { usage; exit 2; }
if [[ -n "$plugin_sha" || -n "$candidate_file" ]]; then
  [[ "$mode" = install && "$plugin_sha" =~ ^[a-f0-9]{64}$ && "$candidate_file" = /* ]] ||
    { printf '%s\n' 'D165 fail closed: explicit SHA256 and absolute candidate path required' >&2; exit 2; }
  [[ -f "$candidate_file" && ! -L "$candidate_file" ]] ||
    { printf '%s\n' 'D165 fail closed: candidate file must be regular' >&2; exit 2; }
  [[ "$(node --version 2>/dev/null)" = "v22.19.0" ]] ||
    { printf '%s\n' 'D165 fail closed: reviewed Node 22.19.0 required' >&2; exit 2; }
fi
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
mac_user_root_check() {
  [[ "$(uname -s)-$(uname -m)" = "Darwin-arm64" && "$EUID" -ne 0 &&
     -n "$HOME" && "$HOME" = /* && "$HOME" != "/" &&
     -d "$HOME" && ! -L "$HOME" ]] ||
    { printf '%s\n' 'macOS signed user-only install requires nonprivileged arm64 user and unlinked HOME' >&2; return 2; }
  local app_dir="$HOME/Applications"
  [[ ! -L "$app_dir" && ( ! -e "$app_dir" || -d "$app_dir" ) ]] ||
    { printf '%s\n' 'Refusing symlinked or non-directory user Applications' >&2; return 1; }
}
mac_app="$HOME/Applications/bb.app"
mac_owner="$HOME/Applications/.suliko-owned-bb-0.49.0-arm64.sha256"
mac_record="SULIKO-IDE-MAC-USER-APP-v1 $asset $sha"
mac_install_user() {
  mac_user_root_check
  ensure_managed_cache_path
  local app_dir="$HOME/Applications" dmg="$destination" owner="$mac_owner" app="$mac_app"
  [[ ! -e "$app" && ! -L "$app" && ! -e "$owner" && ! -L "$owner" ]] ||
    { printf '%s\n' 'User app/ownership record already occupied; refusing overwrite' >&2; return 1; }
  if [[ ! -e "$dmg" && ! -L "$dmg" && ! -e "$marker" && ! -L "$marker" ]]; then
    bash "$0" --download-verified >/dev/null
  fi
  [[ -f "$marker" && ! -L "$marker" && "$(cat "$marker")" = "$marker_record" ]] ||
    { printf '%s\n' 'Refusing unowned official DMG cache' >&2; return 1; }
  check_file "$dmg" >/dev/null || return
  mkdir -m 700 -p "$app_dir"
  mac_user_root_check
  local source_app
  # Mount state deliberately survives function return so the EXIT trap can
  # detach even when a preceding command fails under set -e.
  mac_mount_target="$(mktemp -d "$HOME/.suliko-dmg-readonly.XXXXXXXX")" || return
  mac_mounted=0
  mac_detach() {
    if [[ "${mac_mounted:-0}" = 1 ]]; then
      hdiutil detach -quiet "$mac_mount_target" >/dev/null 2>&1 ||
        { printf '%s\n' 'Could not safely detach official DMG' >&2; return 1; }
      mac_mounted=0
    fi
    rmdir "$mac_mount_target" >/dev/null 2>&1 || return 1
  }
  trap mac_detach EXIT
  hdiutil attach -readonly -nobrowse -quiet -mountpoint "$mac_mount_target" "$dmg" || return
  mac_mounted=1
  source_app="$(find "$mac_mount_target" -maxdepth 2 -type d -name 'bb.app' -print -quit)"
  [[ -n "$source_app" && -d "$source_app" && ! -L "$source_app" ]] ||
    { printf '%s\n' 'Verified DMG did not contain regular bb.app' >&2; return 1; }
  [[ ! -e "$app" && ! -L "$app" ]] ||
    { printf '%s\n' 'User app target appeared during mount; refusing overwrite' >&2; return 1; }
  # Copy preserves quarantine; never pass ditto --noqtn or bypass Gatekeeper.
  ditto "$source_app" "$app" || return
  [[ -d "$app" && ! -L "$app" && -x "$app/Contents/MacOS/bb" && ! -L "$app/Contents/MacOS/bb" ]] ||
    { printf '%s\n' 'Installed app missing regular launcher; preserving untracked bundle' >&2; return 1; }
  codesign --verify --deep --strict "$app" >/dev/null 2>&1 ||
    { printf '%s\n' 'macOS code-signature rejected; preserving untracked app' >&2; return 1; }
  spctl --assess --type execute "$app" >/dev/null 2>&1 ||
    { printf '%s\n' 'Gatekeeper rejected app; preserving untracked app without launch' >&2; return 1; }
  # Exact own marker is created EXCLUSIVELY after official signature and OS trust pass.
  # If marker creation fails the orphan is preserved, never silently adopted.
  ( set -C; printf '%s\n' "$mac_record" > "$owner" ) ||
    { printf '%s\n' 'Mac app owner marker unavailable; app preserved without uninstall right' >&2; return 1; }
  mac_detach
  trap - EXIT
  printf '%s\n' 'D141 signed official macOS BB app installed current-user only, code-signature and Gatekeeper PASS; SEC02/Hello/RC not provisioned by setup.'
}
mac_uninstall_user() {
  mac_user_root_check
  local app="$mac_app" owner="$mac_owner"
  if [[ -e "$owner" || -L "$owner" ]]; then
    [[ -f "$owner" && ! -L "$owner" && "$(cat "$owner")" = "$mac_record" ]] ||
      { printf '%s\n' 'Refusing unexpected macOS app ownership marker' >&2; return 1; }
    [[ -d "$app" && ! -L "$app" && -x "$app/Contents/MacOS/bb" && ! -L "$app/Contents/MacOS/bb" ]] ||
      { printf '%s\n' 'Refusing modified/nonregular owned app path' >&2; return 1; }
    codesign --verify --deep --strict "$app" >/dev/null 2>&1 ||
      { printf '%s\n' 'Refusing to remove tampered signed app bundle' >&2; return 1; }
    rm -rf -- "$app"
    rm -f -- "$owner"
  elif [[ -e "$app" || -L "$app" ]]; then
    printf '%s\n' 'Untracked macOS app preserved; never adopt a foreign installation.'
  fi
}

case "$mode" in
  install)
    # Both OSes stage/execute exact signed/hashed official BB user binaries
    # only. Real user SEC02/plugin installation remains a separate next gate.
    if [[ "$(uname -s)-$(uname -m)" = "Darwin-arm64" ]]; then
      mac_install_user
      if [[ -n "$plugin_sha" ]]; then
        node "$(cd -- "$(dirname -- "$0")" && pwd)/d165-user-provision.mjs" --install --plugin-sha "$plugin_sha" --candidate-file "$candidate_file"
      fi
      exit 0
    fi
    [[ "$(uname -s)-$(uname -m)" = "Linux-x86_64" ]] ||
      { printf '%s\n' 'Unsupported user setup platform/CPU' >&2; exit 2; }
    [[ "$EUID" -ne 0 ]] || { printf '%s\n' 'Non-privileged user required; no sudo or service creation.' >&2; exit 2; }
    ensure_managed_cache_path
    if [[ ! -e "$destination" && ! -L "$destination" && ! -e "$marker" && ! -L "$marker" ]]; then
      bash "$0" --download-verified >/dev/null
    fi
    bash "$(cd -- "$(dirname -- "$0")" && pwd)/suliko-stage-linux.sh" --stage
    if [[ -n "$plugin_sha" ]]; then
      node "$(cd -- "$(dirname -- "$0")" && pwd)/d165-user-provision.mjs" --install --plugin-sha "$plugin_sha" --candidate-file "$candidate_file"
      printf '%s\n' 'D165 official Linux GUI + strict published CLI SEC02/Hello same owned BB data installed from explicit digest. Reviewer-only candidate; NOT released beta.'
    else
      printf '%s\n' 'D141 Linux verified official AppImage staged user-only; SEC02/Hello/RC are NOT installed by this command.'
    fi
    ;;
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
    d165_root="$HOME/.local/share/suliko-ide/UserSetup"
    if [[ -d "$d165_root" && ! -L "$d165_root" ]]; then
      [[ "$(node --version 2>/dev/null)" = "v22.19.0" ]] ||
        { printf '%s\n' 'D165 cannot safely uninstall owned plugin: reviewed Node unavailable' >&2; exit 2; }
      node "$(cd -- "$(dirname -- "$0")" && pwd)/d165-user-provision.mjs" --uninstall
    fi
    if [[ "$(uname -s)-$(uname -m)" = "Darwin-arm64" ]]; then
      mac_uninstall_user
    fi
    if [[ "$(uname -s)" = "Linux" ]]; then
      bash "$(cd -- "$(dirname -- "$0")" && pwd)/suliko-stage-linux.sh" --remove-stage >/dev/null
    fi
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
