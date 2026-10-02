#!/usr/bin/env bash
# gates/run-suite.sh '#NNN' ['20-review 21-*']    LAUNCH THE SUITE SO A MID-RUN EDIT CANNOT CORRUPT IT.
#
# Use this instead of calling gates/gates.sh directly. It takes the same two arguments and passes them straight
# through, so nothing about the suite's behaviour changes; what changes is WHICH COPY of gates.sh the interpreter
# is reading while the suite runs.
#
# ── WHY THIS EXISTS, AND IT COST A WHOLE SUITE THREE HOURS BEFORE THIS FILE WAS WRITTEN ──────────────────────
# BASH READS A SCRIPT BY BYTE OFFSET AS IT GOES. It does not load the file once; it seeks. So editing a running
# script makes the interpreter resume at a byte offset in a file whose contents have shifted underneath it, and
# the failure lands AT THE END, after all the work, as a garbage error naming a line and a variable that never
# occur together anywhere in the file.
#
# #461 launched the 71-minute suite at 07:36:29Z and then patched gates/gates.sh twice on two UPHELD antagonist
# vetoes, at 08:19:59Z and 08:36:15Z, both inside the run. All 48 sections ran and ALL 48 WERE GREEN (3263 PASS,
# 0 FAIL) - the gates are node subprocesses and their results were never at risk - and then the suite died before
# writing its footer with:
#       gates/gates.sh: line 196: hit: unbound variable
# There is no `hit` at line 196. Line 196 is a bare `fi`; `hit` lives 7 lines earlier inside the SUBSET branch,
# which a full run never enters. The message is a fragment of a file that no longer existed at that offset, which
# is why it cannot be found by reading the script and why all four committed versions of gates.sh pass `bash -n`
# and run the footer path clean. WHAT IT COST: the whole suite. 48 green sections with no footer and no
# GATES GREEN, so by this project's own bar the log authorises nothing and the run re-gated from the top. The
# results were not wrong, they were UNUSABLE, which at the push gate is the same thing.
#
# AND THE WINDOW IS NOT AN EDGE CASE, IT IS THE NORMAL CASE. The antagonist must finish before the push and the
# suite takes 44 to 71 minutes, so the two overlap BY CONSTRUCTION. A run that acts on an upheld veto while the
# suite is running is behaving correctly and will hit this every time.
# jobs/the-suite-must-run-from-a-copy-of-its-own-script-2026-10-02, filed by #461 against itself.
#
# ── HOW ─────────────────────────────────────────────────────────────────────────────────────────────────────
# The copy lives at gates/.run-<TAG>.sh - INSIDE gates/, deliberately. gates.sh computes both of its roots from
# `dirname "$0"` (gates.sh:33, `G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"`), so a copy anywhere
# else would resolve $G to a temp directory and the suite would find no gates, no logs directory and no bundle.
# That is the one trap in this fix and it is why the copy is not in /tmp. The EXIT trap removes it; .gitignore
# carries gates/.run-*.sh so an interrupted run cannot leave a tracked file behind.
#
# ── WHAT THIS DOES *NOT* PROTECT, STATED RATHER THAN QUIETLY IMPLIED ────────────────────────────────────────
# The copy covers gates.sh and nothing else. Three windows remain, each smaller, and the md5 check below is what
# makes them VISIBLE rather than silent:
#   1. gates/gatemanifest.sh - invoked by gates.sh once, before any gate runs, so the exposure is the first few
#      seconds of the run rather than its whole length.
#   2. gates/regress/*.js - node reads a module fully when it STARTS it, so a gate already running is safe and a
#      gate not yet started picks up an edit. Narrower, and arguably legitimate when adding a gate mid-run.
#   3. this script itself. It is short and is not a file a veto fix has any reason to touch, but the exposure is
#      real and is named here rather than left for someone to discover the way #461 discovered the first one.
#
# So this script ALSO does the cheaper half of the same job, which is worth more than the copy on its own:
# it records `md5sum` of every gates/*.sh plus the manifest BEFORE the run and checks it AFTER. If anything
# changed, it says so loudly and names the files, because a log from a run whose harness moved is suspect
# whatever its footer says. #461's second run did this by hand and it is the only reason that log can be cited.
# The verdict and both digests go to gates/logs/<TAG>-harness.md5 so the record outlives this terminal.
set -uo pipefail
N="${1:-}"; [[ "$N" =~ ^#[0-9]{3,4}$ ]] || { echo "usage: gates/run-suite.sh '#463' ['20-review 21-*']"; exit 1; }
SUBSET="${2:-}"
G="$(cd "$(dirname "$0")" && pwd)"; TAG="${N#\#}"
mkdir -p "$G/logs"
COPY="$G/.run-$TAG.sh"
FREEZE="$G/logs/$TAG-harness.md5"

trap 'rm -f "$COPY"' EXIT INT TERM

harness_md5() { (cd "$G" && md5sum *.sh gate-manifest.tsv 2>/dev/null | sort -k2); }

BEFORE="$(harness_md5)"
{
  echo "# gates/logs/$TAG-harness.md5 - the harness digest around the $N suite run."
  echo "# Written by gates/run-suite.sh. If the AFTER block differs from the BEFORE block, the harness was"
  echo "# edited while the suite was running and the log is suspect whatever its footer says."
  echo "run     $N   runId ${CT_RUNID:-unknown-run}   subset '${SUBSET}'"
  echo "started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "--- BEFORE"
  printf '%s\n' "$BEFORE"
} > "$FREEZE"

cp "$G/gates.sh" "$COPY" || { echo "run-suite.sh: could not copy gates.sh"; exit 1; }
chmod +x "$COPY"
echo "run-suite.sh: running $N from $COPY (a copy of gates.sh, so an edit to the repo copy cannot reach the"
echo "  running interpreter). Harness digest frozen at $FREEZE."

bash "$COPY" "$N" "$SUBSET"
RC=$?

AFTER="$(harness_md5)"
{
  echo "finished $(date -u +%Y-%m-%dT%H:%M:%SZ)   suite exit $RC"
  echo "--- AFTER"
  printf '%s\n' "$AFTER"
} >> "$FREEZE"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "HARNESS UNCHANGED across the run: $(printf '%s\n' "$BEFORE" | wc -l | tr -d ' ') files, digests identical."
  echo "harness: UNCHANGED" >> "$FREEZE"
else
  echo "*** HARNESS CHANGED DURING THE RUN. THIS LOG IS SUSPECT WHATEVER ITS FOOTER SAYS. ***"
  echo "    The copy protected gates.sh itself, so the suite will not have died at its footer - but"
  echo "    gatemanifest.sh and the gate files are read during the run and these changed:"
  diff <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER") | sed 's/^/    /'
  { echo "harness: CHANGED - see the diff below"; diff <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER"); } >> "$FREEZE"
fi

exit $RC
