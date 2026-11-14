#!/usr/bin/env bash
# gates/audit/contract-asserts.sh [--universe-from <rule-contracts.json>] [--selftest]  -> ENTRY THREE OF THE ONE DOOR: A CLAUSE'S
# CONTRACT IS A RUNNABLE ASSERT, AND A FAILING ONE REFUSES THE DOOR THE WAY A FAILING GATE DOES.
#
# WHY [#550 test-system helper A; jobs/entry-three-contracts-become-runnable-asserts-2026-10-10, the third option on Kunal's
# 2026-10-10 one-door card]. prompts/rule-contracts types each rule as a FIELD LIST that a sweep reads; nothing can run it, so a
# breach is at best reported the next morning and never blocks a push, and a clause that is not a numbered rule (a CLAUDE.md rule, a
# build-run step) has nowhere to carry a contract at all. This file is the job's theFIX (3) and (4) on the repository side:
#   gates/contract-asserts.tsv   the register: one row per clause, its status, its input, and the command that IS its predicate.
#   gates/audit/assert-*.{sh,js} one predicate per artefact (exit 0 holds, 1 breach, 2 could not run).
#   gates/door-checks.sh         runs this file as its `contract-asserts` row, so gates/gates.sh's records_door withholds
#                                GATES GREEN on a breach.
# ITS CONTROL SET, the job's theCONTROLSET_R08, each a selftest arm:
#   (a) an `assert` row with no command, or a command whose script is not in the tree, REFUSES at adoption (C1, C2).
#   (b) a known breach REFUSES, not merely reports (C3; the live example is R43, run against an export).
#   (c) a clause on the UNIVERSE line with no row is reported NOT IN FORCE (NO ROW), and is never counted as a pass (C5).
#   (d) "the daily sweep and the door return the SAME verdict on the same tree": the verdict is this one command. A sweep that runs
#       it with the same export gets the same answer; prompts/daily-reconcile calling it is a tracker edit this lane cannot make.
# WHAT IS NOT DONE HERE, said so the next reader does not take it as wider: (1) stable clause ids written INTO prompts/build-run and
# prompts/common (tracker documents); (2) requiring every clause in contracts, scanChecks or deliberatelyNotTyped (the tracker's
# completeness block does that for rules); the register's UNIVERSE line is a copy of that list until (1) exists.
# EXIT 0 every in-force assert that could run holds | 1 a breach, or an adoption refusal | 2 could not run: no register, an empty
# register, no in-force row that can run here, or an assert exited 2 (its own could-not-run is never a pass).
# The count line, read by gates/door-checks.sh: "contract-asserts: <held> pass / <broken> fail (<n> in force, <k> not checked
# here, <m> not in force)". CT_CONTRACT_REGISTER overrides the register; CT_CONTRACT_EXPORT names a tracker export directory.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(dirname "$(dirname "$HERE")")"

run(){ # run <register> <root> <export-dir or empty> <universe-json or empty>
  local reg="$1" root="$2" exp="$3" uj="$4" line clause status input cmd note p=0 f=0 inforce=0 nch=0 nif=0 cnr=0 adopt=0 brl=""
  [ -r "$reg" ] || { echo "CONTRACT ASSERTS COULD NOT RUN - the register $reg cannot be read"; return 2; }
  local universe; universe="$(sed -n 's/^# UNIVERSE //p' "$reg" | head -1)"
  if [ -n "$uj" ]; then universe="$(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const x=(d.data||d).completeness;if(!x||!Array.isArray(x.ruleSetGoverned)){process.exit(3)}console.log(x.ruleSetGoverned.join(" "))' "$uj" 2>/dev/null)" \
      || { echo "CONTRACT ASSERTS COULD NOT RUN - $uj carries no completeness.ruleSetGoverned"; return 2; }
    universe="$universe $(sed -n 's/^# UNIVERSE //p' "$reg" | head -1 | tr ' ' '\n' | grep '#' | tr '\n' ' ')"; fi
  local seen=" " rows=0
  while IFS=$'\t' read -r clause status input cmd note; do
    [ -n "$clause" ] && [ "${clause:0:1}" != "#" ] || continue
    rows=$((rows+1)); seen="$seen$clause "
    case "$status" in
      not-in-force) nif=$((nif+1)); [ -n "${note// /}" ] && [ "$note" != - ] || { echo "contract-asserts: ADOPTION REFUSED $clause - not-in-force with no reason"; adopt=$((adopt+1)); }
                    echo "contract-asserts: NOT IN FORCE $clause - ${note:0:140}"; continue ;;
      assert) ;;
      *) echo "contract-asserts: ADOPTION REFUSED $clause - status '$status' is neither assert nor not-in-force"; adopt=$((adopt+1)); continue ;;
    esac
    local script="${cmd%% *}"
    if [ -z "${cmd// /}" ] || [ "$cmd" = - ]; then echo "contract-asserts: ADOPTION REFUSED $clause - an assert row with no command (control (a))"; adopt=$((adopt+1)); continue; fi
    case "$script" in gates/audit/*) ;; *) echo "contract-asserts: ADOPTION REFUSED $clause - its command '$script' is not under gates/audit/"; adopt=$((adopt+1)); continue ;; esac
    if [ ! -f "$root/$script" ]; then echo "contract-asserts: ADOPTION REFUSED $clause - $script is not in the tree"; adopt=$((adopt+1)); continue; fi
    case "$input" in
      tree) ;;
      export:*) local coll="${input#export:}"
                if [ -z "$exp" ] || [ ! -d "$exp/$coll" ]; then nch=$((nch+1)); echo "contract-asserts: NOT CHECKED HERE $clause - it reads a $coll export and CT_CONTRACT_EXPORT names none (counted in neither)"; continue; fi
                cmd="${cmd//\{export\}/$exp}" ;;
      *) echo "contract-asserts: ADOPTION REFUSED $clause - input '$input' is neither tree nor export:<collection>"; adopt=$((adopt+1)); continue ;;
    esac
    inforce=$((inforce+1))
    local out rc runner=bash; case "$script" in *.js) runner=node ;; esac
    # shellcheck disable=SC2086
    out="$(cd "$root" && timeout 600 $runner $cmd 2>&1)"; rc=$?
    case "$rc" in
      0) p=$((p+1)); echo "contract-asserts: HOLDS $clause - $(printf '%s\n' "$out" | tail -1 | cut -c1-160)" ;;
      1) f=$((f+1)); brl="$brl $clause"; echo "contract-asserts: BREACH $clause - $(printf '%s\n' "$out" | tail -1 | cut -c1-160)"; printf '%s\n' "$out" | grep -v '^\s*$' | tail -4 | head -3 | sed 's/^/    /' ;;
      *) cnr=$((cnr+1)); echo "contract-asserts: COULD NOT RUN $clause (exit $rc) - $(printf '%s\n' "$out" | tail -1 | cut -c1-160)" ;;
    esac
  done < "$reg"
  [ "$rows" -gt 0 ] || { echo "CONTRACT ASSERTS COULD NOT RUN - the register names no clause, and an empty register is not a clearance"; return 2; }
  local u nr=0; for u in $universe; do case "$seen" in *" $u "*) ;; *) nr=$((nr+1)); echo "contract-asserts: NOT IN FORCE (NO ROW) $u - the universe names it and no row types it (control (c))" ;; esac; done
  [ -n "$brl" ] && echo "contract-asserts: REFUSED BY THE BREACH OF$brl (see each BREACH line above)"
  echo "contract-asserts: $p pass / $((f+adopt)) fail ($inforce in force, $nch not checked here, $((nif+nr)) not in force: $nif by row, $nr with no row; $cnr could not run)"
  [ $((f+adopt)) -gt 0 ] && return 1
  [ "$cnr" -gt 0 ] && return 2
  [ "$inforce" -gt 0 ] || { echo "CONTRACT ASSERTS COULD NOT RUN - no in-force assert could run here, so nothing was asserted"; return 2; }
  return 0
}

selftest(){
  local T ok=0 bad=0; T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok   $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  mkdir -p "$T/gates/audit" "$T/exp/runledger"
  printf '#!/usr/bin/env bash\necho "fixture holds"; exit 0\n' > "$T/gates/audit/good.sh"
  printf '#!/usr/bin/env bash\necho "fixture: BREACH"; exit 1\n' > "$T/gates/audit/bad.sh"
  printf '#!/usr/bin/env bash\necho "fixture could not run"; exit 2\n' > "$T/gates/audit/cnr.sh"
  printf '#!/usr/bin/env bash\n[ -d "$1/runledger" ] && echo "export read at $1" && exit 0; exit 2\n' > "$T/gates/audit/exp.sh"
  reg(){ { echo "# UNIVERSE ${U:-X1}"; local r; for r in "$@"; do printf '%s\n' "$r"; done; } > "$T/reg"; }
  rr(){ run "$T/reg" "$T" "${1:-}" "" > "$T/last" 2>&1; echo $?; }
  local TAB=$'\t'
  U="X1" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n"
  chk "C0 one in-force assert that holds: 0" 0 "$(rr)"
  chk "C0b and the count line reads 1 pass / 0 fail, 1 in force" 1 "$(grep -c '^contract-asserts: 1 pass / 0 fail (1 in force' "$T/last")"
  U="X1" reg "X1${TAB}assert${TAB}tree${TAB}-${TAB}n"
  chk "C1 control (a): an assert row with no command refuses at adoption: 1" 1 "$(rr)"
  chk "C1b and says so" 1 "$(grep -c 'ADOPTION REFUSED X1 - an assert row with no command' "$T/last")"
  U="X1" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/missing.sh${TAB}n"
  chk "C2 control (a): an assert whose script is not in the tree refuses: 1" 1 "$(rr)"
  U="X1 X2" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n" "X2${TAB}assert${TAB}tree${TAB}gates/audit/bad.sh${TAB}n"
  chk "C3 control (b): a known breach REFUSES the door, not merely reports: 1" 1 "$(rr)"
  chk "C3b and names the clause as a BREACH" 1 "$(grep -c '^contract-asserts: BREACH X2' "$T/last")"
  U="X1" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/cnr.sh${TAB}n"
  chk "C4 an assert that could not run is 2, never a pass" 2 "$(rr)"
  U="X1 X9" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n"
  chk "C5 control (c): a universe clause with no row does not refuse (0) ..." 0 "$(rr)"
  chk "C5b ... and is reported NOT IN FORCE (NO ROW), counted as not in force and not as a pass" "1 1" "$(grep -c 'NOT IN FORCE (NO ROW) X9' "$T/last") $(grep -c '^contract-asserts: 1 pass / 0 fail (1 in force, 0 not checked here, 1 not in force' "$T/last")"
  U="X1 X2" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n" "X2${TAB}not-in-force${TAB}-${TAB}-${TAB}-"
  chk "C6 a not-in-force row with no reason refuses at adoption: 1" 1 "$(rr)"
  U="X1 X2" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n" "X2${TAB}assert${TAB}export:runledger${TAB}gates/audit/exp.sh {export}${TAB}n"
  chk "C7 an export assert with no export is NOT CHECKED HERE and counted in neither: 0" "0 1" "$(rr) $(grep -c 'NOT CHECKED HERE X2' "$T/last")"
  chk "C7b with the export named it runs, with {export} replaced: 0, 2 pass" "0 1" "$(rr "$T/exp") $(grep -c '^contract-asserts: 2 pass / 0 fail' "$T/last")"
  U="X2" reg "X2${TAB}assert${TAB}export:runledger${TAB}gates/audit/exp.sh {export}${TAB}n"
  chk "C8 a register whose only asserts cannot run here: 2, nothing was asserted" 2 "$(rr)"
  : > "$T/reg"; chk "C9 an empty register: 2" 2 "$(rr)"
  chk "C10 an unreadable register: 2" 2 "$(run "$T/no-such" "$T" "" "" >/dev/null 2>&1; echo $?)"
  U="X1" reg "X1${TAB}asserted${TAB}tree${TAB}gates/audit/good.sh${TAB}n"
  chk "C11 an unknown status refuses at adoption: 1" 1 "$(rr)"
  U="X1" reg "X1${TAB}assert${TAB}tree${TAB}tools/elsewhere.sh${TAB}n"
  chk "C12 a command outside gates/audit/ refuses at adoption: 1" 1 "$(rr)"
  # C13 THE LIVE REGISTER: every assert row's script exists in this tree, and every universe clause has a row or is reported
  local miss=0 c s i cmd n; while IFS=$'\t' read -r c s i cmd n; do [ -n "$c" ] && [ "${c:0:1}" != "#" ] && [ "$s" = assert ] || continue; [ -f "$ROOT/${cmd%% *}" ] || miss=$((miss+1)); done < "$ROOT/gates/contract-asserts.tsv"
  chk "C13 every assert row of the live register names a script in this tree" 0 "$miss"
  # C15 EACH LIVE ASSERT SCRIPT PASSES ITS OWN --selftest (one per distinct script), so the predicates are controlled through this door
  local sc seenS=" " sbad=0 sn=0; while IFS=$'\t' read -r c s i cmd n; do [ -n "$c" ] && [ "${c:0:1}" != "#" ] && [ "$s" = assert ] || continue
    sc="${cmd%% *}"; case "$seenS" in *" $sc "*) continue ;; esac; seenS="$seenS$sc "; sn=$((sn+1))
    local rn=bash; case "$sc" in *.js) rn=node ;; esac
    ( cd "$ROOT" && $rn "$sc" --selftest ) > "$T/st.out" 2>&1 || { sbad=$((sbad+1)); echo "    $sc --selftest FAILED: $(tail -1 "$T/st.out")"; }
  done < "$ROOT/gates/contract-asserts.tsv"
  chk "C15 every distinct assert script of the live register passes its own --selftest ($sn script(s))" "yes 0" "$([ "$sn" -gt 0 ] && echo yes || echo no) $sbad"
  # C14 THE CHECK WITH ITS SUBJECT REMOVED: a copy whose breach arm counts as a hold passes C3's tree - so C3 is what catches it
  sed 's/^      1) f=\$((f+1)); brl="\$brl \$clause"; echo "contract-asserts: BREACH/      1) p=$((p+1)); echo "contract-asserts: BREACH/' "${BASH_SOURCE[0]}" > "$T/defanged.sh"
  if cmp -s "${BASH_SOURCE[0]}" "$T/defanged.sh"; then chk "C14 the defang edit applied" applied missed
  else U="X1 X2" reg "X1${TAB}assert${TAB}tree${TAB}gates/audit/good.sh${TAB}n" "X2${TAB}assert${TAB}tree${TAB}gates/audit/bad.sh${TAB}n"
    chk "C14 control: with the breach arm defanged, the known breach PASSES (exit 0)" 0 "$(CT_CONTRACT_REGISTER="$T/reg" CT_CONTRACT_ROOT="$T" bash "$T/defanged.sh" >/dev/null 2>&1; echo $?)"; fi
  echo "contract-asserts selftest: $ok pass / $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --universe-from) run "${CT_CONTRACT_REGISTER:-$ROOT/gates/contract-asserts.tsv}" "${CT_CONTRACT_ROOT:-$ROOT}" "${CT_CONTRACT_EXPORT:-}" "${2:-}"; exit $? ;;
  "") run "${CT_CONTRACT_REGISTER:-$ROOT/gates/contract-asserts.tsv}" "${CT_CONTRACT_ROOT:-$ROOT}" "${CT_CONTRACT_EXPORT:-}" ""; exit $? ;;
  *) echo "usage: gates/audit/contract-asserts.sh [--universe-from <rule-contracts.json>] [--selftest]"; exit 2 ;;
esac
