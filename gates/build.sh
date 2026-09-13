#!/usr/bin/env bash
# gates/build.sh "#373"  -> bundles chess.jsx (via entry.jsx) into <repo>/app.js with the build stamp.
# Refuses: a missing/odd build number, a bundle without createRoot (#351 white screen), a bundle without the stamp,
# a bundle node --check rejects. Prints bytes, md5 and the stamp. Env: CT_STAMP_TIME overrides the time (tests only).
set -euo pipefail
N="${1:-}"
[[ "$N" =~ ^#[0-9]{3,4}$ ]] || { echo "FAIL: build number required, like: gates/build.sh '#373'"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
G="$ROOT/gates"
[ -d "$G/node_modules/esbuild" ] || { echo "FAIL: run (cd gates && npm ci) first"; exit 1; }
B="$G/.build"; rm -rf "$B"; mkdir -p "$B"
cp "$ROOT/chess.jsx" "$B/chess.jsx"; cp "$G/entry.jsx" "$B/entry.jsx"
ln -s "$G/node_modules" "$B/node_modules"
STAMP="$N - ${CT_STAMP_TIME:-$(TZ=America/New_York date '+%Y-%m-%d %H:%M')} ET"
ESB="$G/node_modules/.bin/esbuild"
# 1) compile check (warnings count as failures, as deploy.py did)
CC=$("$ESB" "$B/chess.jsx" --bundle --external:react --external:react-dom --outfile=/dev/null --log-level=warning 2>&1 || true)
if [ -n "$CC" ]; then echo "FAIL: compile check:"; echo "$CC" | head -20; exit 1; fi
# 2) bundle with the stamp
"$ESB" "$B/entry.jsx" --bundle --format=iife --jsx=automatic --minify \
  --define:process.env.NODE_ENV='"production"' --define:__BUILD__="\"$STAMP\"" --outfile="$B/app.js" --log-level=warning
node --check "$B/app.js" || { echo "FAIL: node --check"; exit 1; }
grep -q 'createRoot' "$B/app.js" || { echo "FAIL: bundle has no createRoot (chess.jsx bundled instead of entry.jsx?)"; exit 1; }
grep -qF "$STAMP" "$B/app.js" || { echo "FAIL: stamp '$STAMP' not in bundle"; exit 1; }
grep -qF '"18.3.1"' "$B/app.js" || { echo "FAIL: React 18.3.1 not in bundle"; exit 1; }
OUT="${CT_OUT:-$ROOT/app.js}"   # CT_OUT=/some/path builds a trial bundle without touching the repo's app.js (CT_APP serves it)
cp "$B/app.js" "$OUT"
echo "BUILD OK: $STAMP  -> $OUT  bytes=$(stat -c %s "$OUT")  md5=$(md5sum "$OUT" | cut -c1-12)"
