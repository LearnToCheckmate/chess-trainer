#!/usr/bin/env bash
# gates/gates.sh "#373"                          THE GATE IS ONE SCRIPT (supervisor ruling, HANDOFF 0c).
# gates/gates.sh "#373" "20-review 21-review-brilliant"    a SUBSET, for the iteration loop only.
#
# Runs gates/mountcheck.js FIRST (HANDOFF gate 3: it catches a stale or unmountable bundle in seconds), then every
# gates/regress/*.js in name order, one at a time with nothing else running (measurements are timing-sensitive).
# Each gate's output goes to gates/logs/<N>-<gate>.log and all of it to gates/logs/<N>-all.log. Exit 1 on any FAIL
# line, any "<<<" marker, or a non-zero exit. The footer prints the PASS-line count (the charter's "regression
# assertions" number, must only rise) and GATES GREEN / GATES RED. A build is "gated" only when the log ends GREEN.
#   CT_EXPECT is passed to mountcheck as the stamp the bundle must carry (defaults to $1).
#
# ── #391, procedure 6e item 1. SUBSET RUNS, AND THE ONE RULE THAT MATTERS ─────────────────────────────────────
# $2 is an optional space-separated list of gate basenames (globs allowed: "3*" or "20-review 4*"). Unset means
# every gate, exactly as before, so nothing that exists changes behaviour. mountcheck ALWAYS runs.
#
# **A SUBSET RUN NEVER AUTHORISES A PUSH.** It is for diagnosing a red, checking a fix, or proving a new gate.
# The full suite still runs from the top before every push.
#
# The guard is not a comment, it is mechanical: a subset run CANNOT EMIT THE STRING "GATES GREEN". Every consumer
# in this project greps for exactly that - this session does it dozens of times a day - so a subset log is
# unusable as a push gate by every reader that already exists, including ones nobody remembers to update. A
# subset also writes to a DIFFERENT FILE (<N>-subset-all.log) so it can never overwrite or be mistaken for the
# full log, and its header and footer both say so. `gates/verify-log.sh <log>` is the one place that decides
# whether a log authorises a push; run it on any log before citing one.
#
# Why this exists: an external challenger caught a log footed "GATES GREEN #387" filed under a 388-all.log name
# (fixed at #389, see claude/agents/gatelogs/README.md). A subset log passed off as a full one is that same
# failure with a far bigger blast radius, because a subset can be green while the gate that would have caught
# the regression never ran at all.
set -uo pipefail
N="${1:-}"; [[ "$N" =~ ^#[0-9]{3,4}$ ]] || { echo "usage: gates/gates.sh '#373' ['20-review 21-review-brilliant']"; exit 1; }
SUBSET="${2:-}"
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"; TAG="${N#\#}"
mkdir -p "$G/logs"
# ── #403: A FULL LOG NEVER OVERWRITES AN EARLIER FULL LOG OF THE SAME TAG. ───────────────────────────────────
# The log name came from the build TAG alone, so two passes gating the SAME bundle wrote the same file and the
# second silently destroyed the first. That is not hypothetical: #401 and #402 both re-gated the unchanged #400
# bundle, #402's run overwrote #401's log, and STANDING CHECKS A (2026-09-16-08, check C2-2) then reported the
# executed evidence for HEAD as UNKNOWN - correctly, because no committed log covered either pass even though the
# full suite had been run and verified twice. A record that cannot distinguish two runs of the same bundle is the
# same defect class as the frozen denominator and the three-places control record.
# The repo's own committed names already show the convention this restores by hand: 381b, 381c, 381d, 382b, 383b.
# Subset logs are deliberately still overwritten - they are the iteration loop and must never accumulate.
if [ -n "$SUBSET" ]; then
  ALL="$G/logs/$TAG-subset-all.log"
else
  ALL="$G/logs/$TAG-all.log"
  if [ -e "$ALL" ]; then
    for sfx in b c d e f g h i j k l m n o p q r s t u v w x y z; do
      cand="$G/logs/$TAG$sfx-all.log"
      [ -e "$cand" ] || { ALL="$cand"; break; }
    done
    [ "$ALL" = "$G/logs/$TAG-all.log" ] && { echo "FAIL: $TAG-all.log through ${TAG}z-all.log all exist; move some out of $G/logs/ first"; exit 1; }
    echo "NOTE: $TAG-all.log already exists, so this run writes $(basename "$ALL") rather than overwriting it."
  fi
fi
: > "$ALL"
export CT_EXPECT="${CT_EXPECT:-$N}"; export CT_SHOTS="${CT_SHOTS:-$G/shots/gates-$TAG}"
APP="${CT_APP:-$ROOT/app.js}"; export CT_APP="$APP"   # CT_APP=/path/bundle.js gates a trial bundle; the default is the repo's app.js, named explicitly so a gates/.pin-app.js cannot divert the gate
BUNDLE_MD5="$(md5sum "$APP" | cut -c1-12)"
echo "gates.sh $N  bundle $APP  md5 $BUNDLE_MD5  $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$ALL"
# WHICH TREE IS THIS, SAMPLED NOW AND NOT AT THE END. The #417 antagonist broke the first version of the ref
# line below by pointing out that it read `git rev-parse HEAD` when the run FINISHED: this very build's suite
# started at 12:41:53Z against an uncommitted tree and HEAD moved at 12:43:38Z, 105 seconds in, so the log would
# have named a commit that did not exist when two of its thirty-six gates ran. It also noted the deeper half -
# the thing gated is the WORKING TREE and a commit is a different object, so a dirty tree read as ON-MAIN while
# the bundle on disk was not in any commit at all. Both are fixed by sampling here, and by recording the dirty
# count and the bundle md5 alongside the sha so the commit is bound to the artefact.
# `--git-dir` is explicit because `cd "$ROOT" && git ...` does NOT override an inherited GIT_DIR/GIT_WORK_TREE,
# and a gate run launched from a hook or a wrapper that exports them reported another repository's HEAD.
GIT="git -C $ROOT --git-dir=$ROOT/.git --work-tree=$ROOT"
HEADSHA="$($GIT rev-parse HEAD 2>/dev/null || echo unknown)"
DIRTYN="$($GIT status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

# build the gate list: mountcheck always, then either everything or just the named ones
ALLREG=(); for f in "$G"/regress/*.js; do [ -e "$f" ] && ALLREG+=("$f"); done

# ── #399, procedure 6e item 4. A DUPLICATE GATE NUMBER FAILS LOUDLY RATHER THAN SILENTLY RUNNING BOTH ────────
# claude/stories/README.md's gate-number register has said "gates.sh should fail loudly on a duplicate number;
# until it does, this table is the only check" since #390. It is now this check. Three lanes published a gate on
# 2026-09-14 and two chose the same number; number 47 was then claimed TWICE MORE (47-menu.js and 47-puzzles.js,
# each authored believing 47 free), which is what made this cheap to add and expensive to keep deferring.
# gates.sh runs regress/*.js in NAME order, so two files sharing a number is an ordering that depends on the rest
# of the filename - and a lane reading "47 is covered" cannot tell which 47 ran. Runs on a subset too: the check
# is about the DIRECTORY, not about which gates this invocation happens to execute.
# TWO BUGS THE #399 ANTAGONIST PASS FOUND IN THE FIRST VERSION OF THIS GUARD, both by running the nine cases
# instead of the one it was written for. A guard that silently misses a case is worse than no guard.
#   (a) 047-foo.js beside 47-menu.js was MISSED, because `sort | uniq -d` compares the STRINGS "047" and "47".
#       Both files ran. Leading zeros are now stripped before comparing, so 047 and 47 are the same number.
#   (b) 47.js and 47x-foo.js beside 47-menu.js fired, but printed "47: 47-menu.js" - naming only the INNOCENT
#       file, because the reporting loop matched $n-* and required a dash straight after the number. The report
#       is now built from the same normalised number the comparison uses, so every colliding file is named.
# NOTE THE \n. The first attempt at this fix used printf '%s' with no newline, so every number concatenated into
# one long line, `sort -n | uniq -d` saw a single record and the guard went SILENT ON ALL NINE CASES - including
# the plain 47-other.js collision it was written for. Caught by re-running the antagonist's own nine cases
# against the fix rather than trusting it, which is the only reason it is not in this commit. `$(...)` strips the
# trailing newline, so the equality test below is unaffected.
num(){ local b; b="$(basename "$1")"; b="${b%%[!0-9]*}"; b="$((10#${b:-0}))"; printf '%s\n' "$b"; }
dupes=""
for n in $(for f in "${ALLREG[@]}"; do b="$(basename "$f")"; case "$b" in [0-9]*) num "$f";; esac; done | sort -n | uniq -d); do
  names=""
  for f in "${ALLREG[@]}"; do b="$(basename "$f")"; case "$b" in [0-9]*) [ "$(num "$f")" = "$n" ] && names="$names$b ";; esac; done
  dupes="$dupes$n: $names"$'\n'
done
if [ -n "$dupes" ]; then
  echo "FAIL: duplicate gate number(s) in $G/regress/ - claim one in claude/stories/README.md and renumber the other:" | tee -a "$ALL"
  printf '%s' "$dupes" | tee -a "$ALL"
  exit 1
fi

gates=("$G/mountcheck.js")
if [ -n "$SUBSET" ]; then
  for pat in $SUBSET; do
    hit=0
    for f in "${ALLREG[@]}"; do case "$(basename "$f" .js)" in $pat) gates+=("$f"); hit=1;; esac; done
    [ $hit -eq 1 ] || { echo "FAIL: subset pattern '$pat' matched no gate in $G/regress/" | tee -a "$ALL"; exit 1; }
  done
  export CT_SUBSET="$SUBSET"
  echo "SUBSET RUN: ${#gates[@]} of $(( ${#ALLREG[@]} + 1 )) gates — $SUBSET" | tee -a "$ALL"
  echo "THIS LOG CANNOT AUTHORISE A PUSH. The full suite runs from the top before every push." | tee -a "$ALL"
else
  gates+=("${ALLREG[@]}")
fi

red=0
for f in "${gates[@]}"; do
  name="$(basename "$f" .js)"; log="$G/logs/$TAG-$name.log"
  echo "=== $name ===" | tee -a "$ALL"
  ( cd "$ROOT" && timeout 900 node "$f" ) > "$log" 2>&1; rc=$?
  cat "$log" >> "$ALL"
  fails=$(grep -c '^FAIL' "$log" || true); marks=$(grep -c '<<<' "$log" || true)
  if [ $rc -ne 0 ] || [ "$fails" -gt 0 ] || [ "$marks" -gt 0 ]; then red=1; echo "    $name: RED (exit $rc, $fails FAIL lines, $marks <<<)" | tee -a "$ALL"; grep '^FAIL' "$log" | head -5 | tee -a "$ALL"; else echo "    $name: green ($(grep -c '^PASS' "$log") PASS)" | tee -a "$ALL"; fi
done
PASSN=$(grep -c '^PASS' "$ALL" || true)
echo "regression assertions (PASS lines): $PASSN" | tee -a "$ALL"
# ── WHICH TREE DID THIS GATE? (#417, flag class-gate-verifies-a-bundle-never-a-ref-2026-09-18) ──────────────
# Every one of this suite's assertions answers "is the tree in this working directory correct?" and NOT ONE
# answers "is this the tree that ships". #416 went green at 1940 PASS, verify-log.sh passed it and the dashboard
# published it - for a commit on refs/heads/claude/nice-einstein-hnoipk and no other ref, while origin/main was
# still #415. Three lanes each spent a run re-deriving that. So the log STATES it. It never fails the run: a
# gate legitimately runs before its push, and one that reddens on a pre-push tree blocks every build.
# The sha, the dirty count and the bundle md5 were all sampled at run START (see the header above).
MAINSHA="$($GIT ls-remote origin refs/heads/main 2>/dev/null | head -1 | cut -f1)"
DIRTYTXT=""; [ "${DIRTYN:-0}" != "0" ] && DIRTYTXT=" | WORKING TREE DIRTY: $DIRTYN path(s) - the gated bundle is not this commit's"
if [ -z "$MAINSHA" ]; then
  REFLINE="ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5 | origin/main UNKNOWN (refs/heads/main unreadable: offline, refused, or no such branch - NOT a pass)$DIRTYTXT"
elif [ "$HEADSHA" = "$MAINSHA" ]; then
  REFLINE="ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5 | origin/main $MAINSHA | HEAD IS origin/main$DIRTYTXT"
elif ($GIT merge-base --is-ancestor "$HEADSHA" "$MAINSHA" 2>/dev/null); then
  REFLINE="ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5 | origin/main $MAINSHA | HEAD is an ancestor of origin/main (already shipped)$DIRTYTXT"
else
  AHEAD="$($GIT rev-list --count "$MAINSHA..$HEADSHA" 2>/dev/null || echo '?')"
  ONREFS="$($GIT branch -a --contains "$HEADSHA" 2>/dev/null | sed 's/^[* ] *//' | paste -sd, - )"
  REFLINE="ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5 | origin/main $MAINSHA | NOT ON MAIN - $AHEAD commit(s) ahead, on: ${ONREFS:-no ref}$DIRTYTXT"
fi
echo "$REFLINE" | tee -a "$ALL"
if [ -n "$SUBSET" ]; then
  # DELIBERATELY NOT "GATES GREEN": every consumer greps for that string, so a subset must never produce it.
  if [ $red -eq 0 ]; then echo "SUBSET OK $N — NOT A PUSH GATE (${#gates[@]} gates ran: $SUBSET)" | tee -a "$ALL"; exit 0
  else echo "SUBSET RED $N ($SUBSET)" | tee -a "$ALL"; exit 1; fi
fi
if [ $red -eq 0 ]; then echo "GATES GREEN $N" | tee -a "$ALL"; exit 0; else echo "GATES RED $N" | tee -a "$ALL"; exit 1; fi
