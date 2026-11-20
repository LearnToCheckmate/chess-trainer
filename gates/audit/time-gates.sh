#!/bin/bash
# gates/audit/time-gates.sh - time gates one at a time, the way gates.sh runs each one [batch 13;
# jobs/the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18]. Writes rows for gates/audit/gate-seconds.js --tsv:
#   <gate> <seconds> <PASS> <FAIL> <exit> <5-min load at the start>
# usage (from the repo root): CT_APP=<bundle> bash gates/audit/time-gates.sh <out.tsv> <gate-name> [<gate-name> ...]
# Each gate runs as gates.sh runs it: `CT_OBSERVE_EXIT=1 timeout 900 node -r gates/lib.js gates/regress/<gate>.js`, never two
# at once, and only once the 5-minute load is at or under CT_MAXLOAD (default 4; it waits a minute and re-reads). The gate's
# full output goes to <dir of out.tsv>/logs/<gate>.log. This is a measuring tool, never a push gate: it prints no verdict.
set -u
out="$1"; shift
[ -n "${CT_APP:-}" ] || { echo "time-gates.sh: set CT_APP to the bundle under test" >&2; exit 2; }
mkdir -p "$(dirname "$out")/logs"
for g in "$@"; do
  g="${g%.js}"; f="gates/regress/$g.js"; [ -f "$f" ] || [ "$g" != mountcheck ] || f="gates/mountcheck.js"
  [ -f "$f" ] || { echo "time-gates.sh: no gate $f" >&2; continue; }
  while :; do l5=$(awk '{print $2}' /proc/loadavg); awk -v l="$l5" -v m="${CT_MAXLOAD:-4}" 'BEGIN{exit !(l<=m)}' && break; sleep 60; done
  lg="$(dirname "$out")/logs/$g.log"
  t0=$(date +%s%N)
  CT_OBSERVE_EXIT=1 timeout 900 node -r ./gates/lib.js "$f" > "$lg" 2>&1; rc=$?
  t1=$(date +%s%N)
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$g" "$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.1f",(b-a)/1e9}')" \
    "$(grep -c '^PASS' "$lg")" "$(grep -c '^FAIL' "$lg")" "$rc" "$l5" >> "$out"
done
