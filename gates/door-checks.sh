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
#   IN   gates/verify-log.sh --citations (the register check; jobs/nothing-checks-that-the-registers-citations-resolve-2026-09-30)
#        IN SINCE #550 ROUND 5. It was exit 1 through round 4 (widthrise 22 -> 0 there) on deadpath=17 badcaseid=16 misfiled=11
#        notchecked=2 danglingstory=1 gatestoryundefined=2. Round 5 decided each item rather than editing mechanically: two log
#        citations repointed to the log that holds the figure (434b, 449), eight never-in-repo paths named in its ALLOW with a
#        reason and printed every run; one unsupported id cited at the log that carries it (TC-R09c, 489-all.log), fifteen whose
#        id no archived log carries marked NOT SUPPORTED with the figure moved verbatim to the measured cell; US-R40 re-pointed to
#        US-R03; arm (8) taught the US-RF register. Measured then: exit 0, "CITATIONS OK with 1 row(s) NOT CHECKED" (TC-SUITE-013,
#        kept: its result is a selftest exit code), "citations door: 310 pass / 0 fail", ~14s alone. It gained that fixed door line
#        for this file (its --citations-selftest C24/C24b). Its pass figure counts CITATIONS, not cases, so it is NOT pinned -
#        the same reason as the report row.
#   IN   gates/audit/control-floor.sh, and its --selftest (#550 test-system helper A, theFIX part (3)): the gates
#        gates/control-audit.js reads COVERED or PARTIAL are named in gates/control-covered-floor.tsv and held there as a
#        BINARY - the piece of fastgate's control-audit ratchet that can be one while the audit as a whole is RED
#        (uncovered=104 of 139 at 2994c8f). Measured then: "control-floor: 39 pass / 0 fail", ~8s; selftest 17 pass / 0 fail.
#        UNLIKE the report and citations rows its count IS pinned (door:control-floor): it counts FLOOR ROWS, and a row
#        leaving is a gate losing its cover, which must say so in the diff.
#   IN   gates/audit/contract-asserts.sh, and its --selftest (#550 test-system helper A; jobs/entry-three-contracts-become-
#        runnable-asserts-2026-10-10): ENTRY THREE - each clause in gates/contract-asserts.tsv marked `assert` runs its predicate
#        under gates/audit/, and a breach refuses here. Measured at fe3b8fd: "contract-asserts: 2 pass / 0 fail (2 in force, 1 not
#        checked here, 52 not in force ...)", ~6s; selftest 21 pass / 0 fail (it also runs each live assert's own --selftest).
#        Its count IS pinned (door:contract-asserts): it counts in-force asserts that held, so an assert leaving lowers the pin.
#   OUT  gates/audit/verify-patch-set.sh <payload-dir> (the live mode): its input is a set of parked tracker payloads, which a
#        tree does not carry, so the door has nothing to give it. Only its --selftest can run here.
# The IN checks run in parallel (three when this was measured; the report joined at round 4, --citations at round 5). MEASURED on this 4-core container that buys almost nothing - 54s in parallel against 57s
# run one after another (34 + 17 + 6), each check slowing to 55s/33s/17s - because the checks are CPU-bound already.
#
# THE CASE COUNTS ARE PINNED [#550 round 4, closing the gap this paragraph used to name]. Beyond a non-zero exit, a FAIL and a
# missing or zero pass count, a check that LOSES some of its cases and still passes the rest is now refused: each selftest's pass
# count is a `door:<name>` row in gates/harness-case-counts.tsv, the register --harnesses already ratchets, and a run reading FEWER
# than the pin refuses. A rise is reported and is committed by editing that row's pin. gates/harness-counts.sh skips `door:` rows
# (this file runs them) but still holds them to its never-delete rule against HEAD. The REPORT row and the CITATIONS row are not
# pinned: their pass figures count cited files and citations, which may fall legitimately; DC16 holds every --selftest row in the
# live list to having a pin, and DC16c holds the citations row to having none.
# CT_DOOR_PINS overrides the register (the selftest uses it); a register that cannot be read is exit 2, never a clearance.
#
# EXIT: 0 every check exited 0 with a readable count line, pass > 0 and fail 0; 1 any check refused; 2 a check could not run
# (its script is missing). A missing script is 2 and never 0: a door that could not run is not a clearance.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(dirname "$HERE")"

# name | script (relative to the repository root) | argument | ERE matching its own count line, pass first and fail second
CHECKS='citations-selftest|gates/verify-log.sh|--citations-selftest|citations-selftest: [0-9]+ pass, [0-9]+ fail
cited-not-run-selftest|gates/audit/cited-not-run.sh|--selftest|cited-not-run selftest: [0-9]+ pass / [0-9]+ fail
verify-patch-set-selftest|gates/audit/verify-patch-set.sh|--selftest|SELFTEST [0-9]+ pass / [0-9]+ fail
cited-not-run-report|gates/audit/cited-not-run.sh||cited-not-run report: [0-9]+ pass / [0-9]+ fail
citations|gates/verify-log.sh|--citations|citations door: [0-9]+ pass / [0-9]+ fail
control-floor-selftest|gates/audit/control-floor.sh|--selftest|control-floor selftest: [0-9]+ pass / [0-9]+ fail
control-floor|gates/audit/control-floor.sh||control-floor: [0-9]+ pass / [0-9]+ fail
contract-asserts-selftest|gates/audit/contract-asserts.sh|--selftest|contract-asserts selftest: [0-9]+ pass / [0-9]+ fail
contract-asserts|gates/audit/contract-asserts.sh||contract-asserts: [0-9]+ pass / [0-9]+ fail'

# "<pass> <fail>" from the LAST line of <outfile> matching <ere>, or nothing
count_of(){ grep -oE "$2" "$1" 2>/dev/null | tail -1 | grep -oE '[0-9]+ (pass|fail)' | awk '{printf "%s%s", (NR>1?" ":""), $1}'; }

# the pin of door check <name>: field 3 of the `door:<name>` row of <register>, or nothing
pin_of(){ awk -F'\t' -v k="door:$2" '$1==k{print $3; exit}' "$1" 2>/dev/null; }

run(){
  local list="${CT_DOOR_CHECKS:-$CHECKS}" root="${CT_DOOR_ROOT:-$ROOT}" pins="${CT_DOOR_PINS:-$HERE/harness-case-counts.tsv}" tmp rc=0 n=0
  [ -r "$pins" ] || { echo "DOOR CHECKS COULD NOT RUN - the pin register $pins cannot be read"; return 2; }
  # --only <name[,name]> [#550 helper A round 6, part (3)]: run the NAMED rows of this one list and no others, so
  # records-gate.sh --binaries can run a formerly-ratcheted check as a binary WITHOUT a second copy of its command
  # line. An unknown name is exit 2 (a filter that matched nothing is not a clearance), and so is an empty filter.
  if [ -n "${DOOR_ONLY+x}" ]; then
    [ -n "$DOOR_ONLY" ] || { echo "DOOR CHECKS COULD NOT RUN - --only was given no name"; return 2; }
    local want kept="" ln
    for want in ${DOOR_ONLY//,/ }; do
      ln="$(printf '%s\n' "$list" | awk -F'|' -v n="$want" '$1==n')"
      [ -n "$ln" ] || { echo "DOOR CHECKS COULD NOT RUN - --only names '$want', which is not a row of the check list"; return 2; }
      kept="$kept${kept:+$'\n'}$ln"
    done
    list="$kept"
  fi
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
    else
      local pin; pin="$(pin_of "$pins" "$nm")"
      if [ -n "$pin" ] && [ "$p" -lt "$pin" ]; then echo "DOOR CHECKS REFUSED - $nm ran $p case(s), BELOW its pin $pin in $(basename "$pins"): a case was deleted or a loop emptied (${secs}s)"; rc=1
      elif [ -n "$pin" ] && [ "$p" -gt "$pin" ]; then echo "door checks: $nm exit 0, $p pass 0 fail (${secs}s), ABOVE its pin $pin - commit the rise in the door:$nm row"
      elif [ -n "$pin" ]; then echo "door checks: $nm exit 0, $p pass 0 fail (${secs}s), = its pin"
      else echo "door checks: $nm exit 0, $p pass 0 fail (${secs}s), unpinned"; fi
    fi
  done
  rm -rf "$tmp"; [ "$rc" -eq 0 ] && echo "DOOR CHECKS OK - $n of $n"; return $rc
}

selftest(){
  local T; T="$(mktemp -d)"; local ok=0 bad=0
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok  $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  mk(){ mkdir -p "$T/gates"; printf '#!/usr/bin/env bash\necho "%s"\nexit %s\n' "$2" "${3:-0}" > "$T/gates/$1.sh"; }
  : > "$T/pins"
  rr(){ ( CT_DOOR_ROOT="$T" CT_DOOR_PINS="$T/pins" CT_DOOR_CHECKS="$1" run ) > "$T/last" 2>&1; echo $?; }
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
  # DC10: the live list names exactly the seven measured-green checks; verify-log --citations joined at #550 round 5, once green,
  # and control-floor with its selftest at #550 test-system helper A (part (3))
  chk "DC10 the live list has nine rows (contract-asserts and its selftest joined at #550 test-system helper A)" 9 "$(printf '%s\n' "$CHECKS" | grep -c .)"
  chk "DC10b and verify-log --citations is one of them, by that argument (round 5: CITATIONS OK, 0 fail)" 1 "$(printf '%s\n' "$CHECKS" | grep -cE '^citations\|gates/verify-log.sh\|--citations\|')"
  chk "DC10c the cited-not-run REPORT is in, with no argument (round 4: accounted-green 48 of 48)" 1 "$(printf '%s\n' "$CHECKS" | grep -cE '^cited-not-run-report\|gates/audit/cited-not-run.sh\|\|')"
  # DC11: each live pattern reads the real summary line its script prints (a fixed specimen of each, from 503946c)
  printf 'citations-selftest: 63 pass, 0 fail\n' > "$T/s1"; printf 'cited-not-run selftest: 47 pass / 0 fail\n' > "$T/s2"; printf 'SELFTEST 105 pass / 0 fail\n' > "$T/s3"; printf 'cited-not-run report: 203 pass / 0 fail\n' > "$T/s4"; printf 'citations door: 310 pass / 0 fail (1 row(s) NOT CHECKED, counted in neither)\n' > "$T/s5"; printf 'control-floor selftest: 17 pass / 0 fail\n' > "$T/s6"; printf 'control-floor: FELL x now reads NONE - n\ncontrol-floor: 39 pass / 0 fail   (39 floor row(s), 139 gates audited, 0 covered gate(s) not on the floor)\n' > "$T/s7"; printf 'contract-asserts selftest: 21 pass / 0 fail\n' > "$T/s8"; printf 'contract-asserts: NOT IN FORCE (NO ROW) R01 - x\ncontract-asserts: 2 pass / 0 fail (2 in force, 1 not checked here, 52 not in force: 0 by row, 52 with no row; 0 could not run)\n' > "$T/s9"
  local k=0 name script arg pat; while IFS='|' read -r name script arg pat; do k=$((k+1)); chk "DC11 the live pattern for $name reads its real count line" "$(sed -n 's/[^0-9]*\([0-9]*\) pass[^0-9]*\([0-9]*\) fail.*/\1 \2/p' "$T/s$k")" "$(count_of "$T/s$k" "$pat")"; done <<< "$CHECKS"
  # DC12-DC15: the case-count pin (#550 round 4). One check, pinned at 5.
  mk a "a: 5 pass, 0 fail"; printf 'door:a\tgates/a.sh\t5\tn\n' > "$T/pins"
  chk "DC12 at its pin: 0" 0 "$(rr "$L1")"
  mk a "a: 4 pass, 0 fail"; chk "DC13 one case lost (4 under a pin of 5) refuses: 1" 1 "$(rr "$L1")"
  chk "DC13b and says it fell below its pin" 1 "$(grep -c 'REFUSED - a ran 4 case(s), BELOW its pin 5' "$T/last")"
  mk a "a: 6 pass, 0 fail"; chk "DC14 a rise passes: 0" 0 "$(rr "$L1")"
  chk "DC14b and is reported as above its pin" 1 "$(grep -c 'ABOVE its pin 5' "$T/last")"
  : > "$T/pins"; mk a "a: 4 pass, 0 fail"; chk "DC14c no row for the check: unpinned, passes, says so" "0 1" "$(rr "$L1") $(grep -c 'unpinned' "$T/last")"
  chk "DC15 an unreadable pin register: 2, not a clearance" 2 "$( ( CT_DOOR_ROOT="$T" CT_DOOR_PINS="$T/no-such-pins" CT_DOOR_CHECKS="$L1" run ) >/dev/null 2>&1; echo $?)"
  # DC16: every --selftest row of the LIVE list has a door: pin in the real register, and the report row has none
  local miss=0 nm sc ar pt; while IFS='|' read -r nm sc ar pt; do [ "$ar" = --selftest ] || continue; [ -n "$(pin_of "$HERE/harness-case-counts.tsv" "$nm")" ] || miss=$((miss+1)); done <<< "$CHECKS"
  chk "DC16 every live --selftest check is pinned in gates/harness-case-counts.tsv" 0 "$miss"
  chk "DC16b and the report row is not (its count is cited files, not cases)" "" "$(pin_of "$HERE/harness-case-counts.tsv" cited-not-run-report)"
  chk "DC16c nor the citations row (its count is citations, not cases)" "" "$(pin_of "$HERE/harness-case-counts.tsv" citations)"
  chk "DC16d but the control-floor row IS pinned, at the live floor's row count (a row leaving is a gate losing its cover)" "$(grep -cv '^#' "$HERE/control-covered-floor.tsv")" "$(pin_of "$HERE/harness-case-counts.tsv" control-floor)"
  chk "DC16e and the contract-asserts row IS pinned (it counts in-force asserts that held; an assert leaving lowers it)" yes "$([ -n "$(pin_of "$HERE/harness-case-counts.tsv" contract-asserts)" ] && echo yes || echo no)"
  # DC17 (#550 helper A round 6): --only runs the named rows and no others; an unknown or empty name is 2, never 0
  : > "$T/pins"; mk a "a: 5 pass, 0 fail"; mk b "b: 3 pass / 0 fail" 1
  L2="$L1
b|gates/b.sh|--selftest|b: [0-9]+ pass / [0-9]+ fail"
  ro(){ ( CT_DOOR_ROOT="$T" CT_DOOR_PINS="$T/pins" CT_DOOR_CHECKS="$L2" DOOR_ONLY="$1" run ) > "$T/last" 2>&1; echo $?; }
  chk "DC17 --only a runs a alone and passes although b would refuse: 0" 0 "$(ro a)"
  chk "DC17b and it ran exactly one check" 1 "$(grep -c '^DOOR CHECKS OK - 1 of 1$' "$T/last")"
  chk "DC17c --only b runs the refusing row: 1" 1 "$(ro b)"
  chk "DC17d --only a,b runs both and refuses on b: 1" 1 "$(ro a,b)"
  chk "DC17e --only a name not in the list: 2" 2 "$(ro nosuch)"
  chk "DC17f --only with an empty name: 2" 2 "$(ro '')"
  rm -rf "$T"; echo "door-checks self-test: $ok pass, $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --list)     printf '%s\n' "$CHECKS"; exit 0 ;;
  ""|--run)   run; exit $? ;;
  --only)     DOOR_ONLY="${2:-}"; run; exit $? ;;
  *)          echo "usage: gates/door-checks.sh [--selftest|--list|--only <name[,name]>]"; exit 2 ;;
esac
