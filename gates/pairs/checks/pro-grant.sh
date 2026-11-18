#!/usr/bin/env bash
# gates/pairs/checks/pro-grant.sh - the grading machine's check for jobs/kunals-own-account-gets-pro-without-paying-2026-11-17.
# Run from a worktree's root (the machine does). Two halves, both printed as PASS/FAIL lines:
#   1. gates/regress/167-pro-owner-grant.js - the bridge's proWatch on stand-in snapshots, and the source and rule texts (node only);
#   2. rules-test/firestore.rules.test.js on the Firestore EMULATOR, each test as one line "PASS RULES <title>" / "FAIL RULES <title>".
# The emulator needs Java (11+) and, the first time, the network: its packages are installed once into gates/pairs/.work/rules-node_modules
# of the REAL tree (gitignored) and linked into the worktree; firebase-tools keeps the emulator's own download in its cache (~/.cache/firebase).
# Measured at #551 in the build container: the emulator runs here (openjdk 21), 15 tests in about 4 seconds once installed.
set -uo pipefail
WT="$(pwd)"; HERE="$(cd "$(dirname "$0")" && pwd)"
REAL="$(git -C "$WT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git$##')"; [ -n "$REAL" ] || REAL="$WT"
node gates/regress/167-pro-owner-grant.js 2>&1 | grep -E '^(PASS|FAIL) |pass,'
NM="$REAL/gates/pairs/.work/rules-node_modules"
if [ ! -d "$NM/node_modules/@firebase/rules-unit-testing" ]; then
  mkdir -p "$NM" && cp "$WT/rules-test/package.json" "$NM/" && (cd "$NM" && npm install --no-audit --no-fund >"$NM/install.log" 2>&1) \
    || { echo "FAIL RULES the emulator packages could not be installed (see $NM/install.log)"; exit 1; }
fi
[ -e "$WT/rules-test/node_modules" ] || ln -s "$NM/node_modules" "$WT/rules-test/node_modules"
OUT="$(cd "$WT/rules-test" && timeout 300 "$NM/node_modules/.bin/firebase" emulators:exec --only firestore --project demo-ct "node --test firestore.rules.test.js" 2>&1)"; RC=$?
printf '%s\n' "$OUT" | sed -n -E 's/^ok [0-9]+ - (.*)$/PASS RULES \1/p; s/^not ok [0-9]+ - (.*)$/FAIL RULES \1/p'
printf '%s\n' "$OUT" | grep -qE '^# pass [0-9]+' || { echo "FAIL RULES the emulator run printed no test summary (exit $RC)"; printf '%s\n' "$OUT" | grep -iE 'error|java' | head -5; }
rm -f "$WT/rules-test/node_modules" "$WT/rules-test/firestore-debug.log"
exit 0
