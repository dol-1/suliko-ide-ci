#!/usr/bin/env bash
# E1 Linux-x64 PREVIEW: stage a verified official BB AppImage in user space.
# Does not run the installer, configure plugins/providers, or change BB data.
set -euo pipefail
umask 077
if [[ $# -ne 1 || ( "$1" != "--stage" && "$1" != "--remove-stage" ) ]]; then
  echo 'Usage: suliko-stage-linux.sh --stage|--remove-stage (PREVIEW ONLY)' >&2
  exit 2
fi
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 || -z "$HOME" || "$HOME" = "/" ]]; then
  echo 'Only nonprivileged Linux x86_64 user staging is supported' >&2
  exit 2
fi
asset='bb-0.49.0-x86_64.AppImage'
sha='8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770'
cache="$HOME/.cache/suliko-ide/$asset"
stage_dir="$HOME/.local/share/suliko-ide"
stage="$stage_dir/$asset"
owner="$stage_dir/.suliko-owned-stage-$asset.sha256"
owner_record="SULIKO-IDE-STAGE-v1 $asset $sha"
link_dir="$HOME/.local/bin"
link="$link_dir/suliko-bb-desktop"
safe_dirs() {
  for dir in "$HOME/.local" "$HOME/.local/share" "$stage_dir" "$link_dir" "$HOME/.cache" "$HOME/.cache/suliko-ide"; do
    if [[ -L "$dir" ]]; then echo 'Refusing redirected managed directory' >&2; return 1; fi
  done
}
check_sha() {
  [[ -f "$1" && ! -L "$1" ]] || return 1
  local got
  if command -v sha256sum >/dev/null 2>&1; then got="$(sha256sum "$1" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then got="$(shasum -a 256 "$1" | awk '{print $1}')"
  else return 1
  fi
  [[ "$got" = "$sha" ]]
}
check_owner() {
  [[ -f "$owner" && ! -L "$owner" && "$(cat "$owner")" == "$owner_record" ]]
}
safe_dirs
if [[ "$1" = "--remove-stage" ]]; then
  if [[ -e "$link" || -L "$link" || -e "$stage" || -L "$stage" || -e "$owner" || -L "$owner" ]]; then
    check_owner || { echo 'Refusing unowned stage/launcher: missing or invalid ownership marker' >&2; exit 1; }
  fi
  if [[ -e "$link" || -L "$link" ]]; then
    [[ -L "$link" && "$(readlink "$link")" = "$stage" ]] || { echo 'Refusing unrelated launcher' >&2; exit 1; }
  fi
  if [[ -e "$stage" || -L "$stage" ]]; then
    check_sha "$stage" || { echo 'Refusing modified/unowned AppImage' >&2; exit 1; }
  fi
  [[ ! -L "$link" ]] || rm -- "$link"
  [[ ! -f "$stage" ]] || rm -- "$stage"
  [[ ! -e "$owner" ]] || rm -- "$owner"
  [[ ! -d "$stage_dir" ]] || rmdir "$stage_dir" 2>/dev/null || true
  echo 'PREVIEW staging removed; unrelated files, official BB data and other software untouched.'
  exit 0
fi
if [[ -e "$link" || -L "$link" || -e "$stage" || -L "$stage" || -e "$owner" || -L "$owner" ]]; then
  check_owner || { echo 'Refusing preexisting stage/launcher without verified ownership' >&2; exit 1; }
fi
if [[ -e "$link" || -L "$link" ]]; then
  [[ -L "$link" && "$(readlink "$link")" = "$stage" ]] || { echo 'Refusing occupied Suliko launcher path' >&2; exit 1; }
fi
if [[ -e "$stage" || -L "$stage" ]]; then
  check_sha "$stage" || { echo 'Refusing modified/unowned AppImage' >&2; exit 1; }
else
  [[ ! -e "$owner" && ! -L "$owner" ]] || { echo 'Orphaned ownership marker; refusing stage' >&2; exit 1; }
  # Never trust a cached asset without a fresh digest, even when download
  # itself verified the original official GitHub release.
  if [[ ! -f "$cache" ]]; then
    bash "$(cd -- "$(dirname -- "$0")" && pwd)/suliko-setup.sh" --download-verified >/dev/null
  fi
  check_sha "$cache" || { echo 'Pinned official BB asset checksum mismatch' >&2; exit 1; }
  mkdir -p -- "$stage_dir" "$link_dir"
  safe_dirs
  temp="$(mktemp "$stage_dir/.stage.XXXXXXXX")"
  trap 'rm -f -- "$temp"' EXIT
  cp -- "$cache" "$temp"
  check_sha "$temp" || { echo 'Staged AppImage copy checksum mismatch' >&2; exit 1; }
  chmod 700 "$temp"
  [[ ! -e "$stage" && ! -L "$stage" ]] || { echo 'Stage path occupied' >&2; exit 1; }
  # Atomic same-filesystem, no-clobber hardlink; never replace a foreign asset.
  ln -- "$temp" "$stage" || { echo 'Stage target appeared; refusing overwrite' >&2; exit 1; }
  rm -- "$temp"
  trap - EXIT
  # If marker creation races/fails, leave an untracked orphan; never authorize
  # uninstall of it implicitly. Owner can remove that orphan manually.
  ( set -C; printf '%s\n' "$owner_record" > "$owner" ) ||
    { echo 'Could not write exclusive stage owner record' >&2; exit 1; }
fi
if [[ ! -e "$link" && ! -L "$link" ]]; then
  mkdir -p -- "$link_dir"
  ln -s -- "$stage" "$link"
fi
echo 'PREVIEW: official BB AppImage SHA-256 verified and staged for this user.'
echo 'Not launched; no Suliko plugins, hardened profile, service or real setup performed.'
