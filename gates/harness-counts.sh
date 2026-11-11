#!/usr/bin/env bash
# gates/harness-counts.sh [--selftest]  -> THE PUSH-CHECK HARNESSES THE SUITE DOES NOT RUN, UNDER A CASE-COUNT RATCHET.
# Reached through the one door: `gates/records-gate.sh --harnesses` execs this file.
#
# WHY [#550, item (104) of directOpening_2026_11_11_batch10; jobs/build-one-door-for-every-non-gate-check-2026-10-10, theFIX part
# (4) as gained at batch 10's apply, from jobs/a-deleted-assertion-inside-a-gate-is-invisible-in-a-green-run-2026-10-10 whatIsLeft
# (1)]. gates/held-selftest.sh, gates/verify-log-selftest.sh and gates/buildnum-selftest.sh are the controls of three push-gate
# tools, and nothing the suite runs calls them: a case deleted from one of them leaves every log as green as before. Each is now
# pinned the way gates/assertion-counts.tsv pins a gate: its case count is a row in gates/harness-case-counts.tsv; a run reading
# FEWER than the pin refuses, a FAIL refuses, a harness whose own count line cannot be read refuses, and a row deleted from the
# register (against HEAD's committed copy) refuses - the never-delete ratchet the gate manifest implements. A RISE is reported and
# is committed with its new count (`--write`), so the pin only moves up in a diff that says so.
#
# THE COUNT IS THE HARNESS'S OWN SUMMARY LINE, AND THAT IS NAMED, NOT HIDDEN: it is a claim the harness computes (CLAUDE.md's
# #419 limit). What it catches is the case this job names - a case deleted or a loop emptied lowers the harness's own total - not
# a harness that lies about its total.
#
# EXIT: 0 every harness at or above its pin and FAIL-free; 1 a fall, a FAIL, a non-zero exit or a deleted row; 2 could not run
# (no register, a harness missing, its count line unreadable).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(dirname "$HERE")"

# a harness's own summary line -> "pass fail"
count_of(){ # <name> <outfile>
  local o="$2" m
  case "$1" in
    held-selftest)       m=$(grep -oE '^[0-9]+ PASS +[0-9]+ FAIL' "$o" | tail -1 | awk '{print $1, $3}') ;;
    verify-log-selftest) m=$(grep -oE 'verify-log self-test: [0-9]+ pass, [0-9]+ fail' "$o" | tail -1 | awk '{gsub(",","");print $3, $5}') ;;
    buildnum-selftest)   m=$(grep -oE 'buildnum self-test: [0-9]+ pass, [0-9]+ fail' "$o" | tail -1 | awk '{gsub(",","");print $3, $5}') ;;
    *)                   m=$(grep -oE '(^|: )[0-9]+ (PASS|pass),? +[0-9]+ (FAIL|fail)' "$o" | tail -1 | grep -oE '[0-9]+' | head -2 | paste -sd' ') ;;
  esac
  printf '%s' "$m"
}

run(){
  local write="${1:-}" rc=0 tmp; tmp="$(mktemp -d)"
  local REG="${CT_HARNESS_REG:-$HERE/harness-case-counts.tsv}"   # read per call, so the selftest's per-control register reaches it
  [ -f "$REG" ] || { echo "HARNESS COUNTS COULD NOT RUN - no register at $REG"; return 2; }
  # never-delete: every row HEAD's committed register carries must still be here
  if [ -z "${CT_HARNESS_REG:-}" ] && git -C "$ROOT" cat-file -e HEAD:gates/harness-case-counts.tsv 2>/dev/null; then
    while IFS=$'\t' read -r n _; do case "$n" in ''|\#*) continue;; esac
      grep -q "^$n	" "$REG" || { echo "HARNESS COUNTS REFUSED - row '$n' is in HEAD's committed register and gone from the working copy: a harness leaves only in a commit that says why, with its row kept"; rc=1; }
    done < <(git -C "$ROOT" show HEAD:gates/harness-case-counts.tsv)
  fi
  local new="$tmp/reg"; : > "$new"
  while IFS=$'\t' read -r name path pin note; do
    case "$name" in ''|\#*) printf '%s\t%s\t%s\t%s\n' "$name" "$path" "$pin" "$note" >> "$new"; continue;; esac
    local f="$path" out="$tmp/$name.out"; case "$f" in /*) : ;; *) f="$ROOT/$path" ;; esac
    [ -f "$f" ] || { echo "HARNESS COUNTS COULD NOT RUN - $name: $path is missing"; rm -rf "$tmp"; return 2; }
    ( cd "$ROOT" && timeout 900 bash "$f" ) > "$out" 2>&1; local hrc=$?
    local pf; pf="$(count_of "$name" "$out")"; local p="${pf%% *}" fl="${pf##* }"
    if ! [[ "$p" =~ ^[0-9]+$ && "$fl" =~ ^[0-9]+$ ]]; then echo "HARNESS COUNTS COULD NOT RUN - $name printed no readable count line (exit $hrc); its output is $out"; rm -rf "$tmp"; return 2; fi
    if [ "$hrc" -ne 0 ] || [ "$fl" -gt 0 ]; then echo "HARNESS COUNTS REFUSED - $name: exit $hrc, $fl FAIL ($p pass)"; rc=1
    elif [ "$p" -lt "$pin" ]; then echo "HARNESS COUNTS REFUSED - $name ran $p case(s), BELOW its pin $pin: a case was deleted or a loop emptied"; rc=1
    elif [ "$p" -gt "$pin" ]; then echo "harness counts: $name ran $p, ABOVE its pin $pin - commit the rise (gates/records-gate.sh --harnesses --write)"
    else echo "harness counts: $name ran $p = its pin"; fi
    if [ "$write" = --write ] && [ "$p" -gt "$pin" ] && [ "$rc" -eq 0 ]; then pin="$p"; fi
    printf '%s\t%s\t%s\t%s\n' "$name" "$path" "$pin" "$note" >> "$new"
  done < "$REG"
  if [ "$write" = --write ] && [ "$rc" -eq 0 ]; then cp "$new" "$REG"; echo "harness counts: register written"; fi
  rm -rf "$tmp"; [ "$rc" -eq 0 ] && echo "HARNESS COUNTS OK"; return $rc
}

selftest(){
  local T; T="$(mktemp -d)"; local ok=0 bad=0
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok  $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  mkh(){ printf '#!/usr/bin/env bash\necho "%s"\nexit %s\n' "$2" "${3:-0}" > "$T/$1.sh"; }
  reg(){ printf '%s\t%s\t%s\t%s\n' "$@" >> "$T/reg"; }
  rr(){ ( CT_HARNESS_REG="$T/reg" run "$@" ) >/dev/null 2>&1; echo $?; }
  mkh held "164 PASS  0 FAIL  (x)"; : > "$T/reg"; reg held-selftest "$T/held.sh" 164 n
  chk "HC1 at its pin: 0" 0 "$(rr)"
  : > "$T/reg"; reg held-selftest "$T/held.sh" 165 n
  chk "HC2 a case deleted (ran 164 under a pin of 165): 1" 1 "$(rr)"
  : > "$T/reg"; reg held-selftest "$T/held.sh" 100 n
  chk "HC3 a rise: 0, reported" 0 "$(rr)"
  ( CT_HARNESS_REG="$T/reg" run --write ) >/dev/null 2>&1; chk "HC4 --write raises the pin to the run" 164 "$(awk -F'\t' '{print $3}' "$T/reg")"
  mkh held "164 PASS  2 FAIL  (x)"; chk "HC5 a FAIL refuses: 1" 1 "$(rr)"
  mkh held "164 PASS  0 FAIL  (x)" 3; chk "HC6 a non-zero exit refuses: 1" 1 "$(rr)"
  mkh held "nothing to see"; chk "HC7 no count line: 2, never a pass" 2 "$(rr)"
  : > "$T/reg"; reg held-selftest "$T/missing.sh" 1 n; chk "HC8 a missing harness: 2" 2 "$(rr)"
  mkh vl "verify-log self-test: 137 pass, 0 fail, 0 hole(s) open"; : > "$T/reg"; reg verify-log-selftest "$T/vl.sh" 137 n
  chk "HC9 verify-log's count line is read" 0 "$(rr)"
  mkh bn "buildnum self-test: 246 pass, 0 fail"; : > "$T/reg"; reg buildnum-selftest "$T/bn.sh" 247 n
  chk "HC10 buildnum's count line is read, and one case down refuses" 1 "$(rr)"
  ( CT_HARNESS_REG="$T/nope" run ) >/dev/null 2>&1; chk "HC11 no register: 2" 2 "$?"
  # HC12 never-delete, against a scratch repository's committed register
  local R="$T/repo"; mkdir -p "$R/gates"; cp "$HERE/harness-counts.sh" "$R/gates/"
  printf '#!/usr/bin/env bash\necho "1 PASS  0 FAIL"\n' > "$R/gates/a.sh"; printf '#!/usr/bin/env bash\necho "1 PASS  0 FAIL"\n' > "$R/gates/b.sh"
  printf 'held-selftest\tgates/a.sh\t1\tn\nother\tgates/b.sh\t0\tn\n' > "$R/gates/harness-case-counts.tsv"
  ( cd "$R" && git init -q && git add -A && git -c user.email=t@t -c user.name=t -c commit.gpgsign=false commit -qm b ) >/dev/null 2>&1
  printf 'held-selftest\tgates/a.sh\t1\tn\n' > "$R/gates/harness-case-counts.tsv"
  ( bash "$R/gates/harness-counts.sh" ) >/dev/null 2>&1; chk "HC12 a row deleted from the committed register refuses: 1" 1 "$?"
  ( cd "$R" && git checkout -q -- gates/harness-case-counts.tsv ); ( bash "$R/gates/harness-counts.sh" ) >/dev/null 2>&1; chk "HC13 the same repository with the row restored: 0" 0 "$?"
  rm -rf "$T"; echo "harness-counts self-test: $ok pass, $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --write)    run --write; exit $? ;;
  ""|--run)   run; exit $? ;;
  *)          echo "usage: gates/harness-counts.sh [--write|--selftest]"; exit 2 ;;
esac
