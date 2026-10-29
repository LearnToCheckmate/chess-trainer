#!/usr/bin/env bash
# gates/unit-held-guard.sh - THE HELD-TREE GUARD'S HEADLINE CONTROL, RE-RUN ON EVERY FULL SUITE (unit layer).
#
# WHY THIS EXISTS [#545, item (85) of directOpening_2026_10_29_batch5;
# jobs/the-held-tree-guard-has-18-controls-and-no-regression-test-2026-10-01, P1]. #450 proved the held-tree guard
# (gates/verify-log.sh check 10 plus gates/held.sh and gates/held-trees.tsv) with 18 shell controls, and nothing in
# any suite re-ran them: `gates.sh` enumerated gates/regress/*.js and two unit blocks, neither of which reads either
# script. So an edit that disabled check 10 would still end GATES GREEN. This file is the job's theFix, run by
# gates.sh's unit layer (third block) so its red is the suite's red.
#
# THE FIXTURE IS COMMITTED, NOT RECOVERED. The job proposed `git show e765135:claude/agents/gatelogs/441-all.log`;
# this routine's containers arrive as `--depth 50` clones (CLAUDE.md), where that object is absent, so a git
# recovery would answer NOT CHECKED on most runs. gates/fixtures/441-all.log.gz is that file byte for byte, and U0
# proves it by md5 before anything reads it.
#
# WHAT IT ASSERTS - each its own line, "  ok  <name>" / "  FAIL <name>", the unit-drill-why convention gates.sh translates:
#   U0  the fixture decompresses to md5 f642ea094641, the 4100-line #441 log the job names (the denominator)
#   U1  gates/verify-log.sh REFUSES it as '#441' (exit 1) and the refusal names the held register
#   U2  the same command with --ignore-held ACCEPTS it (exit 0), so U1's refusal is the hold and no other check
#   U3  gates/verify-log.sh ACCEPTS claude/agents/gatelogs/449-all.log as '#449' (exit 0): the guard does not refuse a clean log
#   U4  gates/held-selftest.sh exits 0 (it prints its own count; the number is not written here), so held.sh's own controls run too
# USAGE  bash gates/unit-held-guard.sh   exit 0 all ok | 1 any FAIL | 2 could not run (no scratch)
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"
T="$(mktemp -d 2>/dev/null)" || { echo "  FAIL U0 no scratch directory, nothing checked"; exit 2; }
trap 'rm -rf "$T"' EXIT
bad=0
say(){ if [ "$1" = 0 ]; then echo "  ok  $2"; else echo "  FAIL $2"; bad=1; fi; }
VL="${CT_HG_VERIFY:-$G/verify-log.sh}"   # CT_HG_VERIFY: a mutant verify-log.sh INSIDE gates/, for the negative control only
FX="$G/fixtures/441-all.log.gz"; L441="$T/441-all.log"
gzip -dc "$FX" > "$L441" 2>/dev/null; m="$(md5sum < "$L441" 2>/dev/null)"; m="${m:0:12}"
[ "$m" = "f642ea094641" ]; say $? "U0 held-guard: the #441 fixture decompresses to md5 f642ea094641 (read $m)"
if [ "$m" = "f642ea094641" ]; then
  ( cd "$ROOT" && bash "$VL" "$L441" '#441' ) > "$T/u1" 2>&1; r1=$?
  grep -q 'held at' "$T/u1"; h1=$?
  [ "$r1" = 1 ] && [ "$h1" = 0 ]; say $? "U1 held-guard: verify-log.sh REFUSES the held #441 log (exit $r1, names the held row: $([ "$h1" = 0 ] && echo yes || echo no))"
  ( cd "$ROOT" && bash "$VL" "$L441" '#441' --ignore-held ) > /dev/null 2>&1; r2=$?
  [ "$r2" = 0 ]; say $? "U2 held-guard: with --ignore-held the same log is ACCEPTED (exit $r2), so U1's refusal is the hold alone"
else
  echo "  FAIL U1 held-guard: NOT RUN, the fixture is not the #441 log"; echo "  FAIL U2 held-guard: NOT RUN, the fixture is not the #441 log"; bad=1
fi
( cd "$ROOT" && bash "$VL" "$ROOT/claude/agents/gatelogs/449-all.log" '#449' ) > /dev/null 2>&1; r3=$?
[ "$r3" = 0 ]; say $? "U3 held-guard: verify-log.sh ACCEPTS the clean 449-all.log (exit $r3)"
( cd "$ROOT" && bash "$G/held-selftest.sh" ) > "$T/u4" 2>&1; r4=$?
tl="$(tail -n 1 "$T/u4")"
[ "$r4" = 0 ]; say $? "U4 held-guard: gates/held-selftest.sh exits 0 (exit $r4; ${tl:0:80})"
exit $bad
