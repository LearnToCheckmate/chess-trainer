#!/usr/bin/env bash
# gates/door-checks.sh [--selftest|--list]  -> THE FIRST POPULATION OF THE ONE DOOR: non-gate checks that must exit clean.
# Reached through the one door: `gates/records-gate.sh --checks` execs this file, and gates/gates.sh's records_door calls that on
# every full suite and withholds GATES GREEN on any exit but 0.
#
# WHY [#550; jobs/build-one-door-for-every-non-gate-check-2026-10-10 theFIX part (4), "its first population": gates/verify-log.sh
# --citations-selftest, gates/audit/cited-not-run.sh, gates/audit/verify-patch-set.sh]. Each of those is the control set of a
# push-path or audit instrument, and before this nothing the suite runs called any of them, so a change that broke one left every
# log as green as before.
#
# WHAT IS IN, AND WHAT IS OUT, MEASURED ON THIS TREE (claude/exciting-noether-v1swj8 at 503946c, 2026-11-13) RATHER THAN CHOSEN:
#   IN   gates/verify-log.sh --citations-selftest     exit 0, "citations-selftest: 63 pass, 0 fail", 34s
#   IN   gates/audit/cited-not-run.sh --selftest      exit 0, "cited-not-run selftest: 47 pass / 0 fail", 17s
#   IN   gates/audit/verify-patch-set.sh --selftest   exit 0, "SELFTEST 105 pass / 0 fail", 6s
#   IN   gates/audit/cited-not-run.sh (the report)    IN SINCE #550 ROUND 4. It was exit 1 on 503946c with 5 UNACCOUNTED
#        (gates/feature-ledger-diff.js, gates/measure-accuracy-vs-chesscom.js, gates/measure-brilliant-one-rule.js,
#        gates/measure-review-vs-chesscom.js, gates/opening-book/build.js); round 4 gave each a roster row and the report a
#        fixed door line, "cited-not-run report: <cited> pass / <unaccounted+weak-over+stale> fail" (its selftest C36-C39).
#        Measured then: exit 0, ACCOUNTED-GREEN 48 of 48, "cited-not-run report: 203 pass / 0 fail", 31s alone. Its pass
#        figure is a count of CITED FILES, not of cases, so it is deliberately NOT pinned - it may fall legitimately.
#   OUT  gates/verify-log.sh --citations (the register check; jobs/nothing-checks-that-the-registers-citations-resolve-2026-09-30)
#        exit 1 on this tree: CITATIONS RATCHET RED. Round 4 (#550) took widthrise 22 -> 0 (the 22 rows were SHORT, 4 or 5
#        cells of 6, not unescaped pipes) and it is still red on deadpath=17 badcaseid=16 danglingstory=1, all historic and none
#        mechanical (cited files absent from all history, results whose id is absent from the cited log, US-R40 undefined).
#   OUT  gates/audit/verify-patch-set.sh <payload-dir> (the live mode): its input is a set of parked tracker payloads, which a
#        tree does not carry, so the door has nothing to give it. Only its --selftest can run here.
# The IN checks run in parallel (three when this was measured; the report joined at round 4). MEASURED on this 4-core container that buys almost nothing - 54s in parallel against 57s
# run one after another (34 + 17 + 6), each check slowing to 55s/33s/17s - because the checks are CPU-bound already.
#
# NO COUNT IS PINNED HERE, AND THAT IS A GAP, NAMED: this file refuses a non-zero exit, a FAIL, and a missing or zero pass count
# (so a check that printed nothing, or whose loop emptied to nothing, is never a clearance), but a check that LOSES some of its
# cases and still passes the rest is not caught. That is what gates/harness-case-counts.tsv does for the three harnesses
# --harnesses runs; giving these three rows there is the follow-up, left undone because #550 helper A was told not to edit the
# pin registers.
#
# EXIT: 0 every check exited 0 with a readable count line, pass > 0 and fail 0; 1 any check refused; 2 a check could not run
# (its script is missing). A missing script is 2 and never 0: a door that could not run is not a clearance.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(dirname "$HERE")"

# name | script (relative to the repository root) | argument | ERE matching its own count line, pass first and fail second
CHECKS='citations-selftest|gates/verify-log.sh|--citations-selftest|citations-selftest: [0-9]+ pass, [0-9]+ fail
cited-not-run-selftest|gates/audit/cited-not-run.sh|--selftest|cited-not-run selftest: [0-9]+ pass / [0-9]+ fail
verify-patch-set-selftest|gates/audit/verify-patch-set.sh|--selftest|SELFTEST [0-9]+ pass / [0-9]+ fail
cited-not-run-report|gates/audit/cited-not-run.sh||cited-not-run report: [0-9]+ pass / [0-9]+ fail'

# "<pass> <fail>" from the LAST line of <outfile> matching <ere>, or nothing
count_of(){ grep -oE "$2" "$1" 2>/dev/null | tail -1 | grep -oE '[0-9]+ (pass|fail)' | awk '{printf "%s%s", (NR>1?" ":""), $1}'; }

run(){
  local list="${CT_DOOR_CHECKS:-$CHECKS}" root="${CT_DOOR_ROOT:-$ROOT}" tmp rc=0 n=0
  tmp="$(mktemp -d)" || { echo "DOOR CHECKS COULD NOT RUN - mktemp failed"; return 2; }
  local -a names=() pids=() pats=() t0s=()
  while IFS='|' read -r name script arg pat; do
    [ -n "$name" ] || continue
    if [ ! -f "$root/$script" ]; then echo "DOOR CHECKS COULD NOT RUN - $name: $script is missing"; rm -rf "$tmp"; return 2; fi
    ( cd "$root" && s=$(date +%s); timeout 900 bash "$script" $arg > "$tmp/$name.out" 2>&1; r=$?; echo "$r $(( $(date +%s)-s ))" > "$tmp/$name.rc" ) &
    names+=("$name"); pids+=("$!"); pats+=("$pat"); n=$((n+1))
  done <<< "$list"
  [ "$n" -gt 0 ] || { echo "DOOR CHECKS COULD NOT RUN - the check list is empty, and an empty list is not a clearance"; rm -rf "$tmp"; return 2; }
  local i; for i in "${!pids[@]}"; do wait "${pids[$i]}"; done
  for i in "${!names[@]}"; do
    local nm="${names[$i]}" hrc secs pf p fl
    read -r hrc secs < "$tmp/$nm.rc" 2>/dev/null || { hrc=99; secs=?; }
    pf="$(count_of "$tmp/$nm.out" "${pats[$i]}")"; p="${pf%% *}"; fl="${pf##* }"
    if ! [[ "$p" =~ ^[0-9]+$ && "$fl" =~ ^[0-9]+$ ]]; then echo "DOOR CHECKS REFUSED - $nm: exit $hrc, no readable count line (${secs}s); last lines:"; tail -3 "$tmp/$nm.out" | sed 's/^/    /'; rc=1
    elif [ "$hrc" -ne 0 ] || [ "$fl" -gt 0 ]; then echo "DOOR CHECKS REFUSED - $nm: exit $hrc, $fl fail ($p pass, ${secs}s)"; tail -3 "$tmp/$nm.out" | sed 's/^/    /'; rc=1
    elif [ "$p" -eq 0 ]; then echo "DOOR CHECKS REFUSED - $nm: exit 0 over ZERO cases (${secs}s), which is a vacuous pass and not a clearance"; rc=1
    else echo "door checks: $nm exit 0, $p pass 0 fail (${secs}s)"; fi
  done
  rm -rf "$tmp"; [ "$rc" -eq 0 ] && echo "DOOR CHECKS OK - $n of $n"; return $rc
}

selftest(){
  local T; T="$(mktemp -d)"; local ok=0 bad=0
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok  $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  mk(){ mkdir -p "$T/gates"; printf '#!/usr/bin/env bash\necho "%s"\nexit %s\n' "$2" "${3:-0}" > "$T/gates/$1.sh"; }
  rr(){ ( CT_DOOR_ROOT="$T" CT_DOOR_CHECKS="$1" run ) > "$T/last" 2>&1; echo $?; }
  L1='a|gates/a.sh|--selftest|a: [0-9]+ pass, [0-9]+ fail'
  mk a "a: 5 pass, 0 fail"; chk "DC1 one clean check: 0" 0 "$(rr "$L1")"
  chk "DC1b and it says so" 1 "$(grep -c '^DOOR CHECKS OK - 1 of 1$' "$T/last")"
  mk a "a: 5 pass, 1 fail"; chk "DC2 a FAIL in the count line refuses: 1" 1 "$(rr "$L1")"
  mk a "a: 5 pass, 0 fail" 1; chk "DC3 a non-zero exit refuses even with 0 fail: 1" 1 "$(rr "$L1")"
  mk a "nothing printed that looks like a count"; chk "DC4 no count line refuses: 1, never a pass" 1 "$(rr "$L1")"
  mk a "a: 0 pass, 0 fail"; chk "DC5 zero cases is vacuous and refuses: 1" 1 "$(rr "$L1")"
  chk "DC6 a missing script: 2" 2 "$(rr 'z|gates/no-such.sh|--selftest|z: [0-9]+ pass, [0-9]+ fail')"
  chk "DC7 an empty list: 2, not a clearance" 2 "$(rr '')"
  mk a "a: 5 pass, 0 fail"; mk b "b: 3 pass / 0 fail" 1
  chk "DC8 one bad check among good ones refuses the lot: 1" 1 "$(rr "$L1
b|gates/b.sh|--selftest|b: [0-9]+ pass / [0-9]+ fail")"
  chk "DC8b and names the bad one, not the good one" "1 0" "$(grep -c 'REFUSED - b:' "$T/last") $(grep -c 'REFUSED - a:' "$T/last")"
  # DC9: parallel, not serial - two checks that each sleep 2s finish in well under 4s together
  printf '#!/usr/bin/env bash\nsleep 2; echo "s: 1 pass, 0 fail"\n' > "$T/gates/s1.sh"; cp "$T/gates/s1.sh" "$T/gates/s2.sh"
  local s0; s0=$(date +%s); rr 's1|gates/s1.sh|x|s: [0-9]+ pass, [0-9]+ fail
s2|gates/s2.sh|x|s: [0-9]+ pass, [0-9]+ fail' >/dev/null; chk "DC9 the checks run in parallel (2 x 2s in under 4s)" yes "$( [ $(( $(date +%s)-s0 )) -lt 4 ] && echo yes || echo no)"
  # DC10: the live list names exactly the four measured-green checks, and not verify-log --citations, still red at #550 round 4
  chk "DC10 the live list has four rows" 4 "$(printf '%s\n' "$CHECKS" | grep -c .)"
  chk "DC10b and not verify-log --citations, red on deadpath/badcaseid/danglingstory" 0 "$(printf '%s\n' "$CHECKS" | grep -cE '\|--citations\|')"
  chk "DC10c the cited-not-run REPORT is in, with no argument (round 4: accounted-green 48 of 48)" 1 "$(printf '%s\n' "$CHECKS" | grep -cE '^cited-not-run-report\|gates/audit/cited-not-run.sh\|\|')"
  # DC11: each live pattern reads the real summary line its script prints (a fixed specimen of each, from 503946c)
  printf 'citations-selftest: 63 pass, 0 fail\n' > "$T/s1"; printf 'cited-not-run selftest: 47 pass / 0 fail\n' > "$T/s2"; printf 'SELFTEST 105 pass / 0 fail\n' > "$T/s3"; printf 'cited-not-run report: 203 pass / 0 fail\n' > "$T/s4"
  local k=0 name script arg pat; while IFS='|' read -r name script arg pat; do k=$((k+1)); chk "DC11 the live pattern for $name reads its real count line" "$(sed -n 's/[^0-9]*\([0-9]*\) pass[^0-9]*\([0-9]*\) fail.*/\1 \2/p' "$T/s$k")" "$(count_of "$T/s$k" "$pat")"; done <<< "$CHECKS"
  rm -rf "$T"; echo "door-checks self-test: $ok pass, $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --list)     printf '%s\n' "$CHECKS"; exit 0 ;;
  ""|--run)   run; exit $? ;;
  *)          echo "usage: gates/door-checks.sh [--selftest|--list]"; exit 2 ;;
esac
