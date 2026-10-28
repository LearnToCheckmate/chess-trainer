#!/usr/bin/env bash
# gates/audit-all.sh — THE ONE CALLER FOR THE AUDIT INSTRUMENTS UNDER gates/audit/.
#
# Built for jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28, whose title is literal and whose class
# that job's own measurementFromProcessBuild3_2026_10_07 field widens from one file to five:
#
#   MEASURED at origin/main 65296e8, by command and not by reading:
#     gates/audit/ holds 5 files with the executable bit set - cited-not-run.sh, landed-on-main.sh,
#     pixel-literal-classify.sh, verify-parked-patch.sh, verify-patch-set.sh - and
#     `grep -rn "audit/" gates/*.sh deploy.py` returns EXACTLY ONE hit, gates/fastgate.sh:178, which is a
#     classification string inside a case arm and not a call. So all five are tests in this repository that
#     nothing runs. Four of them carry a --selftest arm, 157 controls between them, and those controls have
#     been executed by hand, once, by the run that wrote them.
#
# WHY THIS FILE AND NOT THE TWO REMEDIES THE JOB'S OWN `fix` FIELD OFFERS. Both are closed, and that is why
# the class half of this job has sat since 2026-09-28:
#   (1) "move it under gates/regress/ with a claimed number" needs a row in gates/gate-manifest.tsv. That
#       path is outside the process-build allow-list, and lane 1 measured the consequence at 2026-10-07T18:34Z:
#       gates/verify-log.sh exits 1 with REFUSED (gate manifest) on a log whose footer reports an unlisted
#       gate, so the build that landed it loses the push for ALL of that build's commits, not only the gate.
#   (2) "call it from gates/gates.sh" is inside the allow-list by path and moves the suite's log section
#       count, which gates/verify-log.sh pins. That refuses every green log from that point on.
# An entry point OUTSIDE the suite is the third route. It cannot move a suite number, it needs no manifest
# row, and it is therefore deliverable without spending the push gate's zero headroom. WHAT IT DOES NOT DO,
# said here rather than left for a reader to discover: IT DOES NOT PUT THESE INSTRUMENTS IN THE PUSH SUITE.
# Whether an audit instrument belongs in an 84-minute push suite at all is a scheduling decision above this
# lane [R20]. This gives the five a caller; it does not give them a schedule, and the job stays open.
#
# USAGE
#   gates/audit-all.sh                 run every discovered instrument's self-test arm; verdict + exit code
#   gates/audit-all.sh --list          the roster only. Discovers and classifies, runs nothing.
#   gates/audit-all.sh --selftest      this file's own controls, in both directions. No repository needed.
#   CT_AUDIT_DIR=<dir>                 audit a different directory (the selftest uses this)
#   CT_AUDIT_ROSTER=<file>             override the accounted roster (the selftest uses this)
#   CT_AUDIT_TIMEOUT=<secs>            per-instrument timeout, default 300
#
# EXIT 0 only when every instrument either RAN GREEN or is ACCOUNTED with a reason. 1 on any FAIL, TIMEOUT or
# UNACCOUNTED. 2 when there is NOTHING TO AUDIT - an empty instrument set is reported and never credited,
# because `every()` over nothing is true and that is the eleventh trap CLAUDE.md records: "BEFORE ASSERTING A
# PROPERTY OF A COLLECTION, ASSERT THE COLLECTION IS NON-EMPTY - IN ITS OWN ASSERTION, NOT AS A CONJUNCT."
#
# THREE THINGS THIS FILE DELIBERATELY DOES NOT DO.
#   - IT DOES NOT READ THE INSTRUMENT'S OUTPUT TO DECIDE. The verdict is the instrument's EXIT STATUS and
#     nothing else, and C13 is the control that proves it: an instrument that prints the word FAIL and exits
#     0 is counted OK. Grepping another tool's prose for a verdict is how two readers get two verdicts, which
#     R38's test (c) cost two fires and a third an inconsistent one.
#   - IT DOES NOT PIPE INTO AN EARLY-EXIT grep. Every match here is `grep -q` against a FILE, never
#     `producer | grep -q`, because this project carries 14 measured early-exit-pipe sites whose exit status
#     decides something and whose status is lost to SIGPIPE under `set -o pipefail`
#     (jobs/main-carries-14-early-exit-pipe-sites-and-nothing-on-main-records-it-2026-10-06). `set -u` only.
#   - IT DOES NOT HARD-CODE THE FIVE. The set is DISCOVERED, so an instrument landed tomorrow is audited
#     tomorrow without an edit here. A hard-coded list is the frozen denominator CLAUDE.md records at #405,
#     where a closed flag answered "none" to the question it existed for because its total could grow.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
AUD="${CT_AUDIT_DIR:-$HERE/audit}"
TMO="${CT_AUDIT_TIMEOUT:-300}"
MODE="${1:-run}"

# ── THE ACCOUNTED ROSTER ─────────────────────────────────────────────────────────────────────────────────
# An instrument with no --selftest arm is NOT silently excused. It must appear here with a reason, and the
# UNACCOUNTED ceiling below is 0, so a new instrument with no self-test and no roster row REFUSES this run
# rather than passing through it. Same shape as gates/audit/cited-not-run.sh's roster and its ceiling of 0.
# FORMAT: one line per instrument, "<basename>|<reason>". A reason of "-" is refused.
roster_lines() {
  if [ -n "${CT_AUDIT_ROSTER:-}" ]; then cat "$CT_AUDIT_ROSTER"; return; fi
  cat <<'ROSTER_EOF'
pipefail-grep.sh|No --selftest arm, and it is PRE-EXISTING ON MAIN rather than anything this batch brought. MEASURED by a one-variable control rather than asserted: this umbrella checked out ALONE onto pristine origin/main at b8b2153, with no other payload present, reports INSTRUMENTS 9 / FAIL 0 / ACCOUNTED 1 / UNACCOUNTED 1 against its ceiling of 0 and exits 1, naming this same file. So the umbrella as written CANNOT PASS ON THE TREE IT SHIPS ONTO, and this row is what makes it able to - the #454 shape, where a guard's happy path had never been executed once. ACCOUNTED, not excused: the selftest arm was written and parked as proc-lane2-art-gates-audit-pipefail-grep-sh-measured-tier-2026-10-08, and it was REFUSED here for the second time (after #506) because its 3-way apply cannot find its ancestor blob - its base creates a version of this file that the 2026-10-09 consolidated payload supersedes. The concrete next step is to rebase that payload onto current main and land its --selftest arm, at which point this row is deleted rather than edited. Until then this row is what keeps the gap visible instead of silent.
pixel-literal-classify.sh|No --selftest arm on main at 65296e8, measured with grep on the file itself (0 occurrences). It is a CENSUS over the working tree - it prints how many pinned layout literals each suite file carries - so its output is a count rather than a verdict and this entry point has no expected value to compare it against. Running it here would publish a number nothing checks, which is the defect its own header withdraws a figure for. ACCOUNTED, not excused: the concrete next step is a --selftest arm over fabricated files with a known literal count, and until that exists this row is what keeps it visible.
ROSTER_EOF
}

reason_for() {
  # grep -q against a FILE via a temp roster, never a pipe into grep [see the header's second note].
  local want="$1" line name rest
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    name="${line%%|*}"; rest="${line#*|}"
    if [ "$name" = "$want" ]; then printf '%s' "$rest"; return 0; fi
  done <<ROSTER_IN
$(roster_lines)
ROSTER_IN
  return 1
}

# ── DISCOVERY ────────────────────────────────────────────────────────────────────────────────────────────
# Depth 1 only, regular files, executable bit set. C11 is the control that a nested executable is NOT an
# instrument: a directory of helpers under gates/audit/<something>/ is not a thing this file may run.
discover() { find "$AUD" -maxdepth 1 -type f -perm -u+x 2>/dev/null | sort; }
# Reported, never counted: a .sh under gates/audit/ with no executable bit cannot be run by any caller, and
# a caller that silently skipped it would hide exactly the class this file exists for.
discover_nonexec() { find "$AUD" -maxdepth 1 -type f ! -perm -u+x -name '*.sh' 2>/dev/null | sort; }

# ── IS THIS INSTRUMENT ARMED? TWO INDEPENDENT SOURCES, AND THEY MUST AGREE ────────────────────────────────
# [#544, item (6) of directOpening_2026_10_28_batch4;
# jobs/audit-all-has-selftest-is-a-text-scan-so-run-or-excused-turns-on-a-grep-and-c21-is-co-blind-2026-10-10.]
#
# WHAT WAS WRONG. This was `grep -q -- '--selftest' "$1"`, and that one predicate decides the branch below: an
# instrument it calls armed is RUN, one it calls unarmed is looked up in the roster and, with a reason, reported
# ACCOUNTED and NOT RUN at exit 0. It did not ask whether the file HAS a working arm; it asked whether those ten
# characters appear anywhere in it, a header comment included. Two directions, and only one was loud:
#   (a) a no-arm instrument that merely MENTIONS --selftest in a comment flips to armed and is run with a flag it
#       ignores. LOUD: measured, `gates/audit/pipefail-grep.sh --selftest` runs its normal census and exits 1, so
#       the umbrella records FAIL. This project's house style moves long explanations into the file they describe,
#       so it was one edit away.
#   (b) a genuinely armed instrument whose arm is RENAMED, with the string gone from the file, flips to no-arm -
#       and a roster row with any non-empty reason then reports it ACCOUNTED and NOT RUN, at exit 0. Its controls
#       stop running and this umbrella stays green. SILENT.
# AND C21, THE CONTROL WRITTEN FOR EXACTLY THAT ("A ROSTER ROW CANNOT HIDE A FAILURE. An instrument that HAS a
# selftest is run whatever the roster says"), established "HAS a selftest" with has_selftest - the same text
# scan. The guard and the thing it guards against read one string, so the single edit that defeats the guard is
# the edit that makes the guard agree. The job's own words: the control is co-blind with the defect.
#
# THE PREDICATE NOW READS CODE AND NOT PROSE: a line containing --selftest whose first non-space character is not
# `#`. awk rather than grep, with no pipe anywhere, for the reason this file's header already gives about
# `grep -q` and SIGPIPE under pipefail. MEASURED over the eleven instruments on main: 9 armed, and the 2 the
# roster names (pipefail-grep.sh, pixel-literal-classify.sh) unarmed - the same answer the old scan gave today,
# which is why this is a latent hole closed rather than a live failure fixed. AND THE OBVIOUS REGEX IS WRONG:
# `^[[:space:]]*[^#[:space:]].*--selftest` consumes the first `-` of `  --selftest)` and then looks for a SECOND
# mention on the line, so it reports require-resolve.sh and verify-parked-patch.sh - whose arms are exactly that
# indented case pattern - as unarmed. Controlled three ways in the selftest: a comment-only mention, a real arm,
# and an indented case pattern.
#
# THAT CLOSES (a). (b) NEEDS A SECOND SOURCE, because no scan of a file can tell "this never had an arm" from
# "this had one and it was renamed". armed_lines() below is that source: a DECLARATION, independent of the
# file's bytes, and the two are compared for every instrument. Declared armed with no arm in the code is a
# REFUSAL the roster cannot excuse - it is checked before the roster is consulted - and armed but undeclared is
# reported and RUN, never excused, on the gate-manifest precedent that a guard which fires on the normal case
# gets switched off.
has_selftest() {
  awk 'index($0,"--selftest") { s=$0; sub(/^[[:space:]]+/,"",s); if (substr(s,1,1) != "#") { found=1; exit } }
       END { exit(found?0:1) }' "$1"
}

# ── THE DECLARED-ARMED SET: the independent source has_selftest is checked against. ────────────────────────
# FORMAT, as the roster's: one line per instrument, "<basename>|<what its own --selftest arm covers>". It is
# overridable with CT_AUDIT_ARMED so the selftest can drive both directions over fixtures.
# WHY A LIST AND NOT A COUNT: a count of armed instruments falls by one when an arm is renamed AND rises by one
# when an instrument is added, so the two cancel and the ratchet reads clean. The names do not cancel.
armed_lines() {
  if [ -n "${CT_AUDIT_ARMED:-}" ]; then cat "$CT_AUDIT_ARMED"; return; fi
  cat <<'ARMED_EOF'
cited-not-run.sh|The roster-and-ceiling instrument's own controls over its admission arms.
landed-on-main.sh|Its ancestry and shallow-clone arms over planted fixtures.
r19-phone-geometry.sh|The geometry-token controls, both directions.
red-count.sh|The FAIL-line counting controls, including the over-report this job family came from.
require-resolve.sh|Both-direction controls over planted require fixtures. Its arm is an INDENTED case pattern.
story-join.sh|The story-join controls over fixture registers.
suite-shared-paths.sh|The shared-path derivation's own controls.
verify-parked-patch.sh|The payload-acceptance controls. Its arm is an INDENTED case pattern.
verify-patch-set.sh|The patch-set acceptance controls over planted payloads.
ARMED_EOF
}

is_declared_armed() {
  local want="$1" line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    [ "${line%%|*}" = "$want" ] && return 0
  done <<ARMED_IN
$(armed_lines)
ARMED_IN
  return 1
}

# THE DIRECTORY CHECK BELONGS TO THE RUN MODES AND NOT TO --selftest, AND THE FIRST DRAFT HAD IT ABOVE THE
# MODE DISPATCH. That draft exited 2 with "no such directory" whenever this file sat anywhere without an
# audit/ sibling - which contradicted its own USAGE line, "No repository needed", and was found by a MUTATION
# CONTROL rather than by reading: three mutants copied to a scratch directory all reported 27 pass / 0 fail
# because none of them reached its controls at all, and a mutation that kills nothing looks exactly like a
# detector that cannot die. C28 is the control that the selftest arm is reachable with no tree on disk.
preflight() {
  [ -d "$AUD" ] || { echo "audit-all: no such directory: $AUD"; echo "AUDIT-ALL NOTHING TO AUDIT (0 instruments)"; return 2; }
  echo "audit-all over $AUD"
  echo "timeout per instrument: ${TMO}s   mode: $MODE"
  echo "-----"
  return 0
}

run_pass() {
  local n_inst=0 n_ran=0 n_ok=0 n_fail=0 n_tmo=0 n_acct=0 n_unacct=0 f b why rc out
  local failed_names="" unacct_names="" tmo_names=""
  local n_lost=0 n_unlisted=0 lost_names="" unlisted_names=""   # #544, item (6)
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    b="$(basename "$f")"
    n_inst=$((n_inst+1))
    # ── DECLARED ARMED BUT THE ARM IS GONE: A REFUSAL, CHECKED BEFORE THE ROSTER IS CONSULTED [#544, item (6)].
    # This is direction (b) of the job: an arm renamed takes the predicate to "no arm", and a roster row would
    # then report the instrument ACCOUNTED and NOT RUN at exit 0 with its controls silently stopped. The
    # declaration cannot be satisfied by editing the file, so the two sources disagree and that disagreement is
    # the finding. It is deliberately NOT routed through the roster branch below: a reason that excuses an
    # instrument which never had an arm must not excuse one that has LOST its arm.
    if ! has_selftest "$f" && is_declared_armed "$b"; then
      n_lost=$((n_lost+1)); lost_names="$lost_names $b"
      printf '  LOST-ARM  %-34s declared armed in armed_lines() and no --selftest in its CODE: renamed, or deleted
' "$b"
      continue
    fi
    if has_selftest "$f"; then
      # ARMED BUT UNDECLARED IS REPORTED AND STILL RUN, never excused [#544, item (6)]: a build that ADDS an arm
      # must be able to run it, on the gate-manifest precedent that a guard firing on the normal case gets
      # switched off. It does not change the exit code, because the instrument runs and its own failure surfaces.
      if ! is_declared_armed "$b"; then
        n_unlisted=$((n_unlisted+1)); unlisted_names="$unlisted_names $b"
        printf '  UNLISTED  %-34s has a --selftest arm and no armed_lines() row; it is RUN anyway. Add the row.
' "$b"
      fi
      if [ "$MODE" = "--list" ]; then
        printf '  SELFTEST  %-34s (not run: --list)\n' "$b"
        n_ran=$((n_ran+0))
        continue
      fi
      out="$(timeout "$TMO" "$f" --selftest 2>&1)"; rc=$?
      n_ran=$((n_ran+1))
      if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
        n_tmo=$((n_tmo+1)); tmo_names="$tmo_names $b"
        printf '  TIMEOUT   %-34s after %ss\n' "$b" "$TMO"
      elif [ "$rc" -eq 0 ]; then
        n_ok=$((n_ok+1))
        printf '  OK        %-34s exit 0   %s\n' "$b" "$(printf '%s' "$out" | tail -n 1)"
      else
        n_fail=$((n_fail+1)); failed_names="$failed_names $b"
        printf '  FAIL      %-34s exit %-3s %s\n' "$b" "$rc" "$(printf '%s' "$out" | tail -n 1)"
      fi
    else
      if why="$(reason_for "$b")" && [ -n "$why" ] && [ "$why" != "-" ]; then
        n_acct=$((n_acct+1))
        printf '  ACCOUNTED %-34s no --selftest arm; %s\n' "$b" "$(printf '%s' "$why" | cut -c1-96)"
      else
        n_unacct=$((n_unacct+1)); unacct_names="$unacct_names $b"
        printf '  UNACCOUNTED %-32s no --selftest arm and no roster row with a reason\n' "$b"
      fi
    fi
  done <<DISCOVERED
$(discover)
DISCOVERED

  while IFS= read -r f; do
    [ -n "$f" ] || continue
    printf '  NOT-EXECUTABLE %-29s reported, not counted as an instrument\n' "$(basename "$f")"
  done <<NONEXEC
$(discover_nonexec)
NONEXEC

  echo "-----"
  echo "INSTRUMENTS $n_inst   RAN $n_ran   OK $n_ok   FAIL $n_fail   TIMEOUT $n_tmo   ACCOUNTED $n_acct   UNACCOUNTED $n_unacct of ceiling 0"
  # ON ITS OWN LINE, so every existing consumer's substring match on the line above is untouched [#544, item (6)].
  echo "DECLARED-ARMED $(armed_lines | grep -c '|')   LOST-ARM $n_lost of ceiling 0   UNLISTED-ARMED $n_unlisted (reported, run anyway)"
  [ -n "$lost_names" ] && echo "LOST ARM:$lost_names"
  [ -n "$unlisted_names" ] && echo "UNLISTED ARMED:$unlisted_names"
  [ -n "$failed_names" ] && echo "FAILED:$failed_names"
  [ -n "$tmo_names" ] && echo "TIMED OUT:$tmo_names"
  [ -n "$unacct_names" ] && echo "UNACCOUNTED:$unacct_names"

  if [ "$n_inst" -eq 0 ]; then
    echo "AUDIT-ALL NOTHING TO AUDIT (0 instruments)"
    return 2
  fi
  if [ "$MODE" = "--list" ]; then
    echo "AUDIT-ALL LISTED (nothing was run)"
    return 0
  fi
  if [ "$n_fail" -gt 0 ] || [ "$n_tmo" -gt 0 ] || [ "$n_unacct" -gt 0 ] || [ "$n_lost" -gt 0 ]; then
    echo "AUDIT-ALL REFUSED"
    return 1
  fi
  echo "AUDIT-ALL OK"
  return 0
}

# ── THIS FILE'S OWN CONTROLS ─────────────────────────────────────────────────────────────────────────────
# Sixteen, every one written FIRING FIRST and then silent, because gates/audit/verify-parked-patch.sh's C3
# is this project's worked example of a control set that only ever asserts the SKIP.
selftest() {
  # THE RECURSION GUARD EXISTS FOR ONE CONTROL AND IS NOT A FEATURE. C28 runs a COPY of this file from a
  # directory with no audit/ sibling to prove the selftest arm is reachable with no tree on disk; without a
  # guard that inner run would execute all the controls again, each spawning its own copies.
  if [ -n "${CT_AUDIT_NO_RECURSE:-}" ]; then echo "audit-all selftest: reachable with no tree on disk"; return 0; fi
  local pass=0 fail=0
  ck() { # ck <id> <expected> <actual> <what>
    if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '  ok   %-8s %s\n' "$1" "$4"
    else fail=$((fail+1)); printf '  FAIL %-8s %s (want "%s", got "%s")\n' "$1" "$4" "$2" "$3"; fi
  }
  local T; T="$(mktemp -d)"
  local SELF="$HERE/$(basename "$0")"

  mk() { # mk <dir> <name> <exit> <text> [selftest-arm yes/no/comment]
    # THE ARM IS WRITTEN AS CODE AND NOT AS A COMMENT [#544, item (6)]. It was `# accepts --selftest`, a comment,
    # which the predicate's text scan called armed - so every armed fixture in this selftest was itself an
    # instance of the defect's direction (a), and when has_selftest started reading code these eight controls
    # went red (C1, C2, C3, C7, C13, C20, C21, C23). Worth recording how C21 failed, because it is the job's
    # direction (b) reproduced by accident: its fixture's arm vanished as far as the predicate was concerned, the
    # roster row then suppressed the instrument, and the control that exists to prove a roster row CANNOT hide a
    # failure read exit 0. The fixture still ignores the flag and exits with its given code, so every expectation
    # here is unchanged; only the way it declares the arm is.
    # A THIRD VALUE, `comment`, writes the OLD shape on purpose, and C31 drives it.
    mkdir -p "$1"
    { echo '#!/bin/sh'
      case "${5:-yes}" in
        yes)     echo 'case "${1:-}" in --selftest) : ;; esac' ;;
        comment) echo '# accepts --selftest' ;;
      esac
      echo "echo \"$4\""
      echo "exit $3"
    } > "$1/$2"
    chmod +x "$1/$2"
  }
  one() { CT_AUDIT_DIR="$1" CT_AUDIT_TIMEOUT="${2:-5}" CT_AUDIT_ROSTER="${3:-}" CT_AUDIT_ARMED="${4:-}" bash "$SELF" > "$T/out" 2>&1; echo $?; }

  # (1) A FIXTURE WITH ONE PASSING INSTRUMENT. Firing arm of the green verdict.
  mk "$T/green" a.sh 0 "a selftest: 3 pass / 0 fail"
  rc="$(one "$T/green")"
  ck C1 0 "$rc" "one passing instrument exits 0"
  grep -q '^AUDIT-ALL OK$' "$T/out" && r=y || r=n
  ck C2 y "$r" "and the verdict line is AUDIT-ALL OK"
  grep -q 'INSTRUMENTS 1   RAN 1   OK 1   FAIL 0' "$T/out" && r=y || r=n
  ck C3 y "$r" "and the counters read 1 instrument, 1 ran, 1 ok"

  # (2) ONE FAILING INSTRUMENT. Firing arm of the refusal, plus the NEGATIVE control that the verdict is
  # genuinely REPLACED rather than merely accompanied by a FAIL line - the trap verify-parked-patch.sh's own
  # C3 records.
  mk "$T/red" a.sh 3 "a selftest: 2 pass / 1 fail"
  rc="$(one "$T/red")"
  ck C4 1 "$rc" "one failing instrument exits 1"
  grep -q '^AUDIT-ALL REFUSED$' "$T/out" && r=y || r=n
  ck C5 y "$r" "and the verdict line is AUDIT-ALL REFUSED"
  grep -q '^AUDIT-ALL OK$' "$T/out" && r=y || r=n
  ck C6 n "$r" "and AUDIT-ALL OK is GONE, not merely accompanied"
  grep -q 'FAILED: a.sh' "$T/out" && r=y || r=n
  ck C7 y "$r" "and the failing instrument is named"

  # (3) AN EXECUTABLE INSTRUMENT WITH NO SELFTEST ARM AND NO ROSTER ROW. The ceiling of 0 firing.
  mk "$T/unacct" b.sh 0 "a census, no verdict" no
  : > "$T/empty-roster"
  rc="$(one "$T/unacct" 5 "$T/empty-roster")"
  ck C8 1 "$rc" "an instrument with no selftest and no roster row refuses the run"
  grep -q 'UNACCOUNTED 1 of ceiling 0' "$T/out" && r=y || r=n
  ck C9 y "$r" "and it is counted as UNACCOUNTED 1 against a ceiling of 0"

  # (4) THE SAME INSTRUMENT WITH A ROSTER ROW. Silent arm: accounted is not a failure.
  printf 'b.sh|a census over the tree, no expected value to compare against\n' > "$T/roster"
  rc="$(one "$T/unacct" 5 "$T/roster")"
  ck C10 0 "$rc" "the same instrument WITH a roster reason exits 0"
  grep -q 'ACCOUNTED 1' "$T/out" && r=y || r=n
  ck C11 y "$r" "and is counted ACCOUNTED rather than UNACCOUNTED"
  printf 'b.sh|-\n' > "$T/dashroster"
  rc="$(one "$T/unacct" 5 "$T/dashroster")"
  ck C12 1 "$rc" "a roster reason of '-' is refused, so an empty excuse is not an excuse"

  # (5) THE VERDICT IS THE EXIT STATUS, NOT THE PROSE. An instrument that PRINTS the word FAIL and exits 0
  # is OK. This is the control for the header's first deliberate non-feature.
  mk "$T/liar" a.sh 0 "FAIL FAIL FAIL but I exit zero"
  rc="$(one "$T/liar")"
  ck C13 0 "$rc" "an instrument printing FAIL and exiting 0 is counted OK (exit status decides)"

  # (6) NOTHING TO AUDIT IS EXIT 2 AND NEVER A GREEN. Both arms: an empty directory, and a directory whose
  # only .sh has no executable bit.
  mkdir -p "$T/none"
  rc="$(one "$T/none")"
  ck C14 2 "$rc" "an empty instrument set exits 2, not 0"
  grep -q 'NOTHING TO AUDIT' "$T/out" && r=y || r=n
  ck C15 y "$r" "and says NOTHING TO AUDIT rather than OK"
  mkdir -p "$T/nonexec"; mk "$T/nonexec" c.sh 0 "x"; chmod -x "$T/nonexec/c.sh"
  rc="$(one "$T/nonexec")"
  ck C16 2 "$rc" "a non-executable .sh is not an instrument, so that set is also exit 2"
  grep -q 'NOT-EXECUTABLE c.sh' "$T/out" && r=y || r=n
  ck C17 y "$r" "and it is REPORTED rather than passed over in silence"

  # (7) DISCOVERY IS DEPTH 1. An executable in a subdirectory is not an instrument.
  mkdir -p "$T/nested/helpers"; mk "$T/nested/helpers" d.sh 3 "deep"
  rc="$(one "$T/nested")"
  ck C18 2 "$rc" "an executable one directory down is not discovered"

  # (8) THE TWO-INSTRUMENT DISCRIMINATOR. A check that found the first failure and stopped reads differently
  # from one that counts, which is the only way to tell them apart from the outside.
  mkdir -p "$T/two"; mk "$T/two" a.sh 0 "ok"; mk "$T/two" b.sh 1 "bad"; mk "$T/two" c.sh 1 "bad"
  rc="$(one "$T/two")"
  ck C19 1 "$rc" "three instruments, two failing, exits 1"
  grep -q 'INSTRUMENTS 3   RAN 3   OK 1   FAIL 2' "$T/out" && r=y || r=n
  ck C20 y "$r" "and all three RAN - it counts rather than stopping at the first failure"

  # (9) A ROSTER ROW CANNOT HIDE A FAILURE. An instrument that HAS a selftest is run whatever the roster says.
  printf 'a.sh|I would very much rather not be run\n' > "$T/hideroster"
  rc="$(one "$T/red" 5 "$T/hideroster")"
  ck C21 1 "$rc" "a roster row does not suppress an instrument that has a selftest arm"

  # (10) THE TIMEOUT ARM, driven rather than asserted.
  mkdir -p "$T/slow"
  printf '#!/bin/sh\ncase "${1:-}" in --selftest) : ;; esac\nsleep 30\n' > "$T/slow/a.sh"; chmod +x "$T/slow/a.sh"
  rc="$(one "$T/slow" 1)"
  ck C22 1 "$rc" "an instrument that outlives the timeout refuses the run"
  grep -q 'TIMEOUT   a.sh' "$T/out" && r=y || r=n
  ck C23 y "$r" "and is reported as a TIMEOUT rather than as a FAIL"

  # (11) --list RUNS NOTHING. Vacuity guard on the roster mode: it must not be mistakable for a green run.
  rc="$(CT_AUDIT_DIR="$T/red" bash "$SELF" --list > "$T/out" 2>&1; echo $?)"
  ck C24 0 "$rc" "--list over a FAILING instrument still exits 0"
  grep -q '^AUDIT-ALL LISTED (nothing was run)$' "$T/out" && r=y || r=n
  ck C25 y "$r" "and says LISTED (nothing was run), never OK"
  grep -q '^AUDIT-ALL OK$' "$T/out" && r=y || r=n
  ck C26 n "$r" "and does not print AUDIT-ALL OK"

  # (12) A MISSING DIRECTORY IS EXIT 2, NOT A GREEN.
  rc="$(CT_AUDIT_DIR="$T/does-not-exist" bash "$SELF" > "$T/out" 2>&1; echo $?)"
  ck C27 2 "$rc" "a directory that does not exist exits 2"

  # (13) THE SELFTEST ARM IS REACHABLE WITH NO TREE ON DISK, which this file's USAGE promises and its first
  # draft did not deliver. A copy placed where there is no audit/ sibling must still reach its controls.
  mkdir -p "$T/notree"; cp "$SELF" "$T/notree/audit-all.sh"; chmod +x "$T/notree/audit-all.sh"
  rc="$(CT_AUDIT_NO_RECURSE=1 bash "$T/notree/audit-all.sh" --selftest > "$T/out" 2>&1; echo $?)"
  ck C28 0 "$rc" "--selftest from a directory with no audit/ sibling exits 0, not 2"
  grep -q 'no such directory' "$T/out" && r=y || r=n
  ck C29 n "$r" "and does not refuse on the missing directory"
  rc="$(cd "$T/notree" && bash ./audit-all.sh > "$T/out2" 2>&1; echo $?)"
  ck C30 2 "$rc" "while a RUN from that same directory still exits 2 - the check moved, it did not go"

  # ── (14) THE THREE INPUTS jobs/audit-all-has-selftest-is-a-text-scan-...-and-c21-is-co-blind-2026-10-10 ASKS
  #     FOR, AND THE ONE IT NAMES AS MISSING IS C32 [#544, item (6)]. Its theControlSetThisNeeds_R08 reads:
  #       (a) a working arm plus a roster row: must be RUN and its failure must surface - "this is C21 today and
  #           it already passes";
  #       (b) a working arm RENAMED, the string deleted, plus a roster row: must NOT be reported ACCOUNTED -
  #           "FAILS TODAY, and is the input C21 is missing";
  #       (c) a no-arm instrument whose file mentions --selftest in a COMMENT only: must not be reported OK
  #           merely because it exits 0.
  #     C21 is (a) and stays as it is. C31 is (c). C32 is (b), and C33 is its one-variable control: the SAME
  #     fixture and the SAME roster, with the declaration removed, goes back to ACCOUNTED at exit 0 - so C32's
  #     refusal is the declaration's doing and not the fixture's.
  #     AND THIS IS WHERE THE CO-BLINDNESS GOES. C21 and C31 are still keyed to what the file says, because
  #     that is what they are about; C32 is keyed to the DECLARATION, which no edit to the instrument can
  #     satisfy. The guard and the thing it guards against no longer read one string.

  # (c) A COMMENT-ONLY MENTION IS NOT AN ARM. The fixture exits 1, so if it were run as armed the umbrella would
  #     record FAIL and refuse; with a roster row it must be ACCOUNTED at exit 0 instead.
  mkdir -p "$T/cmt"; mk "$T/cmt" a.sh 1 "bad" comment
  printf 'a.sh|a census, no arm, and its header discusses --selftest at length\n' > "$T/cmtroster"
  rc="$(one "$T/cmt" 5 "$T/cmtroster")"
  ck C31 0 "$rc" "a --selftest mentioned only in a comment is not an arm: accounted, not run"
  grep -q 'ACCOUNTED a.sh' "$T/out" && r=y || r=n
  ck C31b y "$r" "and it is reported ACCOUNTED rather than OK or FAIL"

  # (b) DECLARED ARMED, ARM GONE, ROSTER ROW PRESENT: the roster may not excuse it.
  mkdir -p "$T/lost"; mk "$T/lost" a.sh 0 "ok" no
  printf 'a.sh|I would very much rather not be run\n' > "$T/lostroster"
  printf 'a.sh|its own controls\n' > "$T/lostarmed"
  rc="$(one "$T/lost" 5 "$T/lostroster" "$T/lostarmed")"
  ck C32 1 "$rc" "an instrument declared armed whose arm is gone REFUSES the run, roster row or not"
  grep -q 'LOST-ARM  a.sh' "$T/out" && r=y || r=n
  ck C32b y "$r" "and is reported LOST-ARM, naming the disagreement"
  grep -q 'ACCOUNTED a.sh' "$T/out" && r=y || r=n
  ck C32c n "$r" "and is NOT reported ACCOUNTED, which is what the roster row would have bought it"

  # C33 THE ONE VARIABLE: same fixture, same roster, no declaration.
  printf '\n' > "$T/noarmed"
  rc="$(one "$T/lost" 5 "$T/lostroster" "$T/noarmed")"
  ck C33 0 "$rc" "the same fixture with no armed-set row is accounted at exit 0 - so C32 is the declaration's doing"

  # (d) ARMED BUT UNDECLARED IS RUN, NOT EXCUSED, and is reported so the row gets added. The fixture exits 1, so
  #     a version that quietly skipped an undeclared instrument would read exit 0 here.
  mkdir -p "$T/unl"; mk "$T/unl" a.sh 1 "bad"
  rc="$(one "$T/unl" 5 "" "$T/noarmed")"
  ck C34 1 "$rc" "an armed instrument with no armed-set row is RUN anyway, so its failure still refuses"
  grep -q 'UNLISTED  a.sh' "$T/out" && r=y || r=n
  ck C34b y "$r" "and the missing row is reported as UNLISTED rather than passed over"

  rm -rf "$T"
  echo ""
  echo "audit-all selftest: $pass pass / $fail fail"
  [ "$fail" -eq 0 ] || return 1
  return 0
}

case "$MODE" in
  --selftest) selftest; exit $? ;;
  --list|run) preflight || exit $?; run_pass; exit $? ;;
  *) echo "usage: gates/audit-all.sh [--list|--selftest]"; exit 2 ;;
esac
