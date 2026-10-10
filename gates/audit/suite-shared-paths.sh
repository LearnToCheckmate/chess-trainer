#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────────────────────────
# gates/audit/suite-shared-paths.sh - WHICH PATHS WOULD TWO CONCURRENT SUITES COLLIDE ON?
#
# WHY THIS EXISTS, AND IT IS SOMEBODY ELSE'S notChecked RATHER THAN MY IDEA.
# jobs/the-suite-lock-was-never-justified-by-a-measured-timing-conflict-2026-10-04 is the P0 that
# says the mkdir lock at gates/logs/.suite.lock serialises the entire fleet - 83 of a pushing run's
# 121 minutes - and that CLAUDE.md's own account of it is "the lock is not justified by a
# demonstrated timing perturbation, which I never measured. It is justified by what WAS proved: a
# shared per-gate log path plus two runs inside one window, and one corrupt log out of it."
# That job's remedy is an experiment: remove the lock by hand and run two suites. Its notChecked
# ITEM 2 is the precondition nobody had paid for, verbatim:
#
#     "Whether gates/logs is the only shared path. There may be others (bundle directories, the
#      gate-number register) and the experiment should look for them rather than assume one."
#
# AN EXPERIMENT THAT REMOVES THE MUTEX WITHOUT KNOWING WHICH PATHS STILL COLLIDE REPRODUCES #418
# IN A SECOND ARTEFACT CLASS AND CALLS IT A TIMING RESULT. So this script answers item 2 by
# command, line-independently, and leaves the answer behind as a ratchet rather than as a sentence.
#
# WHAT IT IS NOT. It does not run two suites, does not measure contention, does not say whether the
# lock is justified, and takes no view on whether it should be narrowed. It enumerates WRITE
# DESTINATIONS and classifies each by the key its filename is derived from. That is all, and it is
# the half that can be settled in one command instead of in 166 minutes of wall clock.
#
# THE CLASSIFICATION, AND THE KEY IS THE WHOLE ARGUMENT.
#   RUN-UNIQUE        the path interpolates something that DIFFERS between two concurrent runs:
#                     $STEM (derived at gates.sh:159 from the -all log's own b/c-suffixed name),
#                     a mktemp directory, or a pid. Two runs cannot land on one of these.
#   SHARED-BY-DESIGN  the mutex itself. Two runs MUST land on it; that is what a lock is.
#   COLLIDES          the path interpolates only things two concurrent runs SHARE - $TAG, which is
#                     the build number and is identical for both - or nothing at all. These are the
#                     paths the experiment has to deal with, and they are the answer to item 2.
#
# WHY $TAG AND $STEM ARE NOT THE SAME KEY, which is the fact this whole script turns on. #419's fix
# gave the -all log a b/c/d suffix when the name is taken, and derived every PER-GATE log name from
# that suffixed name. So two runs at build #510 write 510-all.log and 510b-all.log, and their
# per-gate logs are 510-* and 510b-*: safe. CT_SHOTS is set at gates.sh:160 to $G/shots/gates-$TAG,
# which carries NO suffix, so both runs write gates/shots/gates-510/ and lib.js:294's
# `shot(name)` -> SHOTS/<name>.png puts both runs' screenshots on each other. The #419 fix covered
# the logs and not the shots, and nothing has said so since.
#
# USAGE
#   gates/audit/suite-shared-paths.sh              report and ratchet. exit 0 clean, 1 on a breach.
#   gates/audit/suite-shared-paths.sh --selftest   five controls, in both directions. exit 0 / 1.
#
# THE RATCHET IS ON `COLLIDES`, AND ON NEW UNCLASSIFIED EXPRESSIONS, AND ON NOTHING ELSE.
# A ceiling over the TOTAL number of write sites would be satisfied by deleting a log, and relieved
# by raising a number that describes something else - which is the mixed-population ceiling
# gates/audit/story-join.sh was written to get away from.
#
# AND IT DELIBERATELY PRINTS NO FALL ADVICE. gates/verify-log.sh's arms (4) and (5) print
# "CEILING CAN BE LOWERED: commit <CONST>=<n>", computed from the tree in front of them; on
# 2026-10-10 that advice was found to re-create a P1 this project had closed three days earlier by
# BUYING headroom, and arm (5) prints the same sentence off an empty denominator. A tool that
# advises committing a floor it computed from one tree is handing the next reader a decision
# disguised as an instruction. This one states the headroom and names who decides. [R18, R45]
# ──────────────────────────────────────────────────────────────────────────────────────────────────
set -uo pipefail

A="$(cd "$(dirname "$0")" && pwd)"; G="$(dirname "$A")"
GATESH="${CT_SSP_GATESH:-$G/gates.sh}"
LIBJS="${CT_SSP_LIBJS:-$G/lib.js}"
REG="${CT_SSP_REG:-$G/regress}"

# THE COMMITTED INVENTORY. One row per DISTINCT write-destination EXPRESSION the suite can create,
# line-independent on purpose [R25]: a path expression is an address, a line number is not, and
# every edit to gates.sh moves the line numbers without changing what the suite writes.
#   <expression><TAB><class><TAB><keyed on>
SPCEIL=1          # the number of COLLIDES expressions this tree is committed to. Measured, not chosen.
SPCONSUMERS=0     # gates under $REG that READ from CT_SHOTS. See arm (4).
INVENTORY=$(cat <<'INV'
$G/logs	RUN-SAFE-DIR	mkdir -p, idempotent, holds no run's data itself
$G/logs/	RUN-SAFE-DIR	the same directory as a bare prefix in a message string
$G/logs/.suite.lock	SHARED-BY-DESIGN	nothing - it IS the mutex, and pid/started/log live inside it
$G/logs/$TAG-all.log	RUN-UNIQUE	$TAG plus the b..z suffix search at gates.sh:145-151 (#418's guard)
$G/logs/$TAG$sfx-all.log	RUN-UNIQUE	$sfx, the b..z suffix that makes the -all log unique
$G/logs/$TAG-subset-all.log	RUN-UNIQUE	$TAG, and a subset run cannot emit GATES GREEN in any case
$G/logs/$STEM-$name.log	RUN-UNIQUE	$STEM, derived at gates.sh:159 from the suffixed -all log name
$G/logs/$STEM-unit-drill-why.log	RUN-UNIQUE	$STEM, same derivation
$G/shots/gates-$TAG	COLLIDES	$TAG ONLY - no suffix, so two runs at one build number share it
INV
)
# lib.js and the mktemp directories are inventoried separately because they are not $G/ expressions
# in gates.sh and a reader looking only at the suite script will miss both.
#   lib.js:21   SHOTS = CT_SHOTS || <gates>/shots          consumer of the COLLIDES path above
#   lib.js:294  shot(name) -> SHOTS/<name>.png             the write that collides, by fixed name
#   lib.js:194  <gates>/.site/<process.pid>                RUN-UNIQUE, keyed on the pid
#   gates.sh:59 $ST_T=$(mktemp -d)                         RUN-UNIQUE, process-private
# THE .site PATTERN IS WHY THIS IS A DEFECT AND NOT A LIMITATION: the harness already keys its
# served document root on the pid. The project knows how to do this. The shots directory was missed.

fail=0
say(){ printf '%s\n' "$*"; }

derive(){  # every distinct $G/ expression gates.sh can write to, from the source, sorted
  grep -oE '\$G/[A-Za-z0-9_./$={}#-]*' "$GATESH" \
    | sed 's/}$//' \
    | grep -vE '/(gatemanifest\.sh|mountcheck\.js|unit-drill-why\.js|regress/?)$' \
    | sort -u
}

say "== suite-shared-paths: which paths would two concurrent gate suites collide on =="
say "   gates.sh  $GATESH"
say "   lib.js    $LIBJS"
say ""

# ── ARM 1. NO UNCLASSIFIED WRITE DESTINATION. ────────────────────────────────────────────────────
# A new write site added to gates.sh is the thing that silently invalidates this whole answer, so it
# is the arm that reddens. A REMOVED one is a NOTE and not a breach: removing the lock by hand is
# exactly what the experiment this script serves is supposed to do.
declared=$(printf '%s\n' "$INVENTORY" | cut -f1 | sort -u)
found=$(derive)
newly=$(comm -13 <(printf '%s\n' "$declared") <(printf '%s\n' "$found"))
gone=$(comm -23 <(printf '%s\n' "$declared") <(printf '%s\n' "$found"))
nnew=$(printf '%s' "$newly" | grep -c . || true)
ngone=$(printf '%s' "$gone" | grep -c . || true)
say "(1) WRITE DESTINATIONS IN gates.sh: $(printf '%s\n' "$found" | grep -c .) found, $(printf '%s\n' "$declared" | grep -c .) inventoried."
if [ "$nnew" -gt 0 ]; then
  say "    RED: $nnew write destination(s) this inventory has never classified:"
  printf '%s\n' "$newly" | sed 's/^/      + /'
  say "      An unclassified destination is the one thing that makes this report wrong rather than"
  say "      stale. Classify it in INVENTORY above - RUN-UNIQUE, SHARED-BY-DESIGN or COLLIDES - and"
  say "      say which variable its filename is keyed on."
  fail=1
else
  say "    OK: every write destination in gates.sh is classified."
fi
[ "$ngone" -gt 0 ] && { say "    NOTE, not a breach: $ngone inventoried destination(s) are absent from this tree:";
  printf '%s\n' "$gone" | sed 's/^/      - /';
  say "      Removal is legitimate - taking the lock out by hand is how two suites are run on purpose."; }

# ── ARM 2. THE CLASSIFICATION ITSELF. ────────────────────────────────────────────────────────────
say ""
say "(2) CLASSIFICATION, by the key each filename is derived from:"
printf '%s\n' "$INVENTORY" | while IFS=$'\t' read -r expr cls key; do
  printf '    %-16s %-34s keyed on %s\n' "$cls" "$expr" "$key"
done

# ── ARM 3. THE COLLIDES RATCHET. ─────────────────────────────────────────────────────────────────
# COMPUTED FROM THE TREE AND NOT FROM THE INVENTORY, AND THE FIRST DRAFT OF THIS SCRIPT GOT IT
# WRONG [R18]. It read the COLLIDES rows straight out of INVENTORY, which is a constant in this
# file - so the count could never move, the arm could never fire in either direction, and control
# C4 caught it by expecting a fall that could not happen. A ratchet over a hard-coded list is
# decoration that reads as rigour, which is the trap CLAUDE.md records a dozen times. So: a path
# counts as COLLIDES only if it is classified COLLIDES *and* still present in the tree.
collides=$(comm -12 \
  <(printf '%s\n' "$INVENTORY" | awk -F'\t' '$2=="COLLIDES"{print $1}' | sort -u) \
  <(printf '%s\n' "$found"))
ncol=$(printf '%s' "$collides" | grep -c . || true)
say ""
say "(3) COLLIDES: $ncol against the committed ceiling SPCEIL=$SPCEIL."
if [ "$ncol" -gt "$SPCEIL" ]; then
  say "    RED: a new path two concurrent suites would land on:"
  printf '%s\n' "$collides" | sed 's/^/      ! /'
  fail=1
elif [ "$ncol" -lt "$SPCEIL" ]; then
  say "    HEADROOM: $(( SPCEIL - ncol )) of $SPCEIL. The ceiling is NOT lowered here and this script"
  say "    does not tell you to lower it: a fall is a decision for whoever lands the change that"
  say "    caused it, who can see what headroom it leaves. [R45]"
else
  say "    AT THE CEILING, 0 headroom. Each one named:"
  printf '%s\n' "$collides" | sed 's/^/      * /'
fi

# ── ARM 4. IS A COLLIDING PATH AN ASSERTION INPUT, OR ONLY EVIDENCE? ─────────────────────────────
# THIS ARM IS WHAT KEEPS THE REPORT HONEST RATHER THAN LOUD. A shots collision corrupts
# SCREENSHOTS, which are evidence a human reads; #418's collision corrupted the per-gate LOGS, from
# which the suite computes its own footer, which is why it produced two green collages. Those are
# not the same severity and a report that does not separate them is an alarm. The separator is
# mechanical: does any gate READ from the colliding directory?
consumers=$(grep -rlE 'CT_SHOTS|\bSHOTS\b' "$REG" 2>/dev/null | grep -v '^$' || true)
nc=$(printf '%s' "$consumers" | grep -c . || true)
say ""
say "(4) GATES THAT READ A COLLIDING PATH: $nc against SPCONSUMERS=$SPCONSUMERS."
if [ "$nc" -gt "$SPCONSUMERS" ]; then
  say "    RED: a gate now reads from the shots directory, so a collision there is an ASSERTION"
  say "    INPUT and not merely corrupt evidence. The severity of arm (3) changes with this number:"
  printf '%s\n' "$consumers" | sed 's/^/      ! /'
  fail=1
else
  say "    OK: no gate reads it. A collision there costs screenshot EVIDENCE, not any PASS or FAIL."
  say "    That is strictly less bad than #418's log collage and this report says so rather than"
  say "    borrowing #418's severity for a different artefact."
fi

# ── ARM 5. THE ONE SENTENCE THE EXPERIMENT NEEDS. ────────────────────────────────────────────────
say ""
say "(5) FOR WHOEVER RUNS THE TWO-SUITE EXPERIMENT:"
if [ "$ncol" -eq 0 ]; then
  say "    No path two concurrent runs share remains, beyond the mutex itself."
else
  say "    Before removing $G/logs/.suite.lock by hand, give each run its own CT_SHOTS:"
  say "      CT_SHOTS=\$G/shots/gates-\$TAG-\$\$   (or anything carrying the -all log's own suffix)"
  say "    CT_SHOTS is already an environment override at gates.sh:160, so this needs NO edit to"
  say "    the suite and no second opt-out hole of the kind gates.sh:121 refuses on principle."
  say "    Two runs that skip this produce interleaved screenshots under one directory and nothing"
  say "    in this project would report it - which is #418 in the artefact class #419 did not fix."
fi

# ── CONTROLS ─────────────────────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--selftest" ]; then
  say ""
  say "== selftest: five controls, each in the direction that matters =="
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  mkdir -p "$T/regress"
  cp "$GATESH" "$T/gates.sh"; cp "$LIBJS" "$T/lib.js"
  p=0; f=0
  ck(){ if [ "$2" = "$3" ]; then p=$((p+1)); say "  PASS $1 ($2)"; else f=$((f+1)); say "  FAIL $1 (got $2, want $3)"; fi; }
  run(){ CT_SSP_GATESH="$1" CT_SSP_LIBJS="$T/lib.js" CT_SSP_REG="$2" bash "$0" 2>&1; }

  # C1 PRISTINE IS SILENT. Without this, C2 proves nothing: a control that fires needs a control
  #    that does not, or an arm that always reddens passes the suite.
  o=$(run "$T/gates.sh" "$T/regress"); rc=$?
  ck C1-pristine-is-silent "$(printf '%s' "$o" | grep -c 'RED:')" 0
  ck C1b-pristine-exit "$rc" 0

  # C2 A NEW UNCLASSIFIED WRITE DESTINATION REDDENS ARM 1.
  cp "$T/gates.sh" "$T/g2.sh"; printf 'echo hi > "$G/newplace/x.log"\n' >> "$T/g2.sh"
  o=$(run "$T/g2.sh" "$T/regress"); rc=$?
  ck C2-new-destination-fires "$(printf '%s' "$o" | grep -c '+ \$G/newplace')" 1
  ck C2b-new-destination-exit "$rc" 1

  # C3 A REMOVED DESTINATION IS A NOTE AND NOT A BREACH, because removing the lock by hand is the
  #    documented way to run two suites and this tool must not refuse the experiment it serves.
  sed 's#\$G/shots/gates-\$TAG#'"$T"'/shots-fixed#' "$T/gates.sh" > "$T/g3.sh"
  o=$(run "$T/g3.sh" "$T/regress"); rc=$?
  ck C3-removal-is-a-note "$(printf '%s' "$o" | grep -c 'NOTE, not a breach')" 1
  ck C3b-removal-exit-clean "$rc" 0

  # C4 THE FALL PRINTS HEADROOM AND NEVER AN INSTRUCTION TO COMMIT A FLOOR. This control is the one
  #    that stops this script repeating gates/verify-log.sh arm (4)'s mistake of 2026-10-10.
  ck C4-fall-states-headroom "$(printf '%s' "$o" | grep -c 'HEADROOM: 1 of 1')" 1
  ck C4b-no-fall-advice "$(printf '%s' "$o" | grep -ci 'CEILING CAN BE LOWERED\|commit SPCEIL')" 0

  # C5 A GATE THAT READS THE COLLIDING DIRECTORY REDDENS ARM 4, because that is the fact that turns
  #    corrupt evidence into a corrupt assertion.
  printf 'const L=require("../lib");console.log(L.SHOTS);\n' > "$T/regress/98-reads-shots.js"
  o=$(run "$T/gates.sh" "$T/regress"); rc=$?
  ck C5-shots-consumer-fires "$(printf '%s' "$o" | grep -c '98-reads-shots')" 1
  ck C5b-shots-consumer-exit "$rc" 1
  rm -f "$T/regress/98-reads-shots.js"

  say ""
  say "selftest: $p pass / $f fail"
  [ "$f" -eq 0 ] || exit 1
  exit 0
fi

say ""
if [ "$fail" -eq 0 ]; then say "SHARED PATHS OK - $ncol colliding path(s) of ceiling $SPCEIL, all named."; exit 0; fi
say "SHARED PATHS RED"; exit 1
