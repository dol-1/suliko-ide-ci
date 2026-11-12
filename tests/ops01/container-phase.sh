#!/usr/bin/env bash
# Called via docker CLI stdin-free shell text; no scripts/data mounted between containers.
set -euo pipefail
test "${BB_SERVER_BIND_HOST:-}" = "127.0.0.1"
test "${BB_SERVER_PORT:-}" = "38886"
test "${BB_HOST_DAEMON_PORT:-}" = "38889"
mkdir -p "$HOME" "$BB_DATA_DIR"
source_dir="$BB_DATA_DIR"
archive="/transfer/archive.tar.gz"
test -f "$archive"
cleanup() {
  node packages/bb-app/dist/bb-app.js stop --data-dir "$source_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT
if [[ "$OPS01_PHASE" == "import" ]]; then
  test -s "$archive"
  test -n "${OPS01_ARCHIVE_SHA:-}"
  test "$(sha256sum "$archive" | cut -d' ' -f1)" = "$OPS01_ARCHIVE_SHA"
  node packages/bb-app/dist/bb.js server import "$archive" --data-dir "$BB_DATA_DIR" --yes >/dev/null
  test -s "$BB_DATA_DIR/bb.db"
elif [[ "$OPS01_PHASE" != "export" ]]; then
  echo "Unknown phase" >&2
  exit 1
fi
node packages/bb-app/dist/bb-app.js start --data-dir "$BB_DATA_DIR" \
  --server-bind-host 127.0.0.1 --server-port 38886 --host-daemon-port 38889 \
  --no-in-app-updates >/tmp/ops01-server.log 2>&1 &
ready=0
for i in $(seq 1 45); do
  if node packages/bb-app/dist/bb.js settings show --json >/tmp/settings.json 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  echo "Disposable container stock BB server did not boot" >&2
  tail -50 /tmp/ops01-server.log >&2
  exit 1
fi
if [[ "$OPS01_PHASE" == "export" ]]; then
  node packages/bb-app/dist/bb.js settings experiment serverMove true >/dev/null
  node packages/bb-app/dist/bb.js server export --out /tmp/ops01-private-stage.tar.gz >/dev/null
  test -s /tmp/ops01-private-stage.tar.gz
  # Stock BB writes an atomic sibling temp file, so export inside the private
  # tmpfs first. Copy only the finished archive into the one allowed file bind.
  cp -- /tmp/ops01-private-stage.tar.gz "$archive"
  rm -f /tmp/ops01-private-stage.tar.gz
  test -s "$archive"
  echo "Source synthetic data fixture exported inside container (archive stays on runner only)"
else
  node -e 'const fs=require("node:fs"); const s=JSON.parse(fs.readFileSync("/tmp/settings.json","utf8")); if(s.experiments?.serverMove!==true && s.config?.experiments?.serverMove!==true) throw Error("Imported fixture setting not preserved")'
  echo "Independent destination container verified restored synthetic setting and loopback service"
fi
