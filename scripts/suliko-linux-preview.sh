#!/usr/bin/env bash
# Suliko Linux x64 ONE-COMMAND STAGING PREVIEW. Not production installation.
# Installs NO packages, BB services, provider credentials, plugins or network rules.
set -Eeuo pipefail
umask 077
usage() {
  printf '%s\n' 'Usage: suliko-linux-preview.sh --dry-run|--install-preview|--uninstall-preview'
  printf '%s\n' 'PREVIEW ONLY: SHA-pinned official AppImage user staging; NOT full BB+Suliko setup.'
}
if [[ $# -ne 1 ]]; then usage >&2; exit 2; fi
case "$1" in
  --dry-run|--install-preview|--uninstall-preview) mode="$1" ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac
if [[ "$(uname -s)-$(uname -m)" != "Linux-x86_64" ||
      -z "$HOME" || "$HOME" = "/" || "$(id -u)" -eq 0 ]]; then
  printf '%s\n' 'Refusing unsupported platform, root account, or invalid home.' >&2
  exit 2
fi
root="$(cd -- "$(dirname -- "$0")" && pwd)"
asset='bb-0.49.0-x86_64.AppImage'
sha='8349ab773715624fec5082739c817d2a15809504699d34b47d3d9dfbe60fc770'
cache="$HOME/.cache/suliko-ide/$asset"
marker="$HOME/.cache/suliko-ide/.suliko-managed-$asset.sha256"
ownership="SULIKO-IDE-VERIFIED-v1 $asset $sha"
case "$mode" in
  --dry-run)
    bash "$root/suliko-setup.sh" --dry-run
    printf '%s\n' 'PREVIEW: no changes performed; SEC02/plugin/marketplace not installed.'
    ;;
  --install-preview)
    # Both cache and matching ownership marker must be absent or genuine.
    if [[ -e "$cache" || -L "$cache" || -e "$marker" || -L "$marker" ]]; then
      if [[ ! -f "$cache" || -L "$cache" || ! -f "$marker" || -L "$marker" ||
            "$(cat -- "$marker")" != "$ownership" ]]; then
        printf '%s\n' 'Refusing existing unowned or ambiguous cache target.' >&2
        exit 1
      fi
      bash "$root/suliko-setup.sh" --verify-file "$cache" >/dev/null
    else
      bash "$root/suliko-setup.sh" --download-verified >/dev/null
    fi
    # Helper rejects redirected dirs, forged ownership and launcher collisions.
    bash "$root/suliko-stage-linux.sh" --stage >/dev/null
    printf '%s\n' 'PREVIEW ONLY: official BB AppImage staged under this user, pinned SHA-256 verified.'
    printf '%s\n' 'No launch, Suliko plugin, SEC02 runtime, marketplace or beta approval.'
    ;;
  --uninstall-preview)
    # Fail closed on uncertain stage ownership; never delete foreign files.
    bash "$root/suliko-stage-linux.sh" --remove-stage >/dev/null
    bash "$root/suliko-setup.sh" --uninstall >/dev/null
    printf '%s\n' 'PREVIEW ONLY: verified Suliko-owned staging/cache removed; BB data unaffected.'
    ;;
esac
