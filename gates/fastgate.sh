#!/usr/bin/env bash
# gates/fastgate.sh "<base-sha>"   -> decides whether this tree may push WITHOUT the full suite, and gates it.
#
# WHY THIS EXISTS (Kunal, 2026-10-06, approving a tiered gate).
# Every push paid the full suite: 56 sections, ~84 minutes, growing about 2 minutes per section. A run that
# pushes takes a median 121 minutes and so spans two hourly fires, and a fire landing on a held pen stands down
# 82% of the time. Measured over five full days that is 7 pushes a day against ~78 findings a day filed. The
# price of ACTING was ~84 minutes and the price of OBSERVING was nothing, and a system with that asymmetry
# fills up with observations. This script changes the price of acting for the commits that cannot possibly
# break the app.
#
# THE CLAIM IT RESTS ON. CORRECTED 2026-10-07 AFTER #489's ANTAGONIST BROKE THE FIRST VERSION OF IT.
#
# WITHDRAWN [R18], because it was false and it was this script's load-bearing sentence: "all 55 files in
# gates/regress were read for every repo path they open. FIFTY-FOUR of them drive the BUILT BUNDLE and read NO
# other file in this repository." MEASURED on main: 53 regress gates require ../lib, and 33 of them require a
# driver under ../drive/ (play 16, review 6, lesson 6, puzzles 4, home 1), one requires ../engine-extract.js,
# one ../../functions/fen.js and one an absolute path to lessons.js. The gates read PLENTY of other files. The
# first version could not see any of it because its re-derivation grepped for quoted literals ending .md .tsv
# .json .html .sh, and the gates reach their harness with require() of .js - so the check was written in the
# same vocabulary as the allowlist it existed to defend and could only ever confirm it. That is the trap
# CLAUDE.md records nine times: the check and the thing being checked were the same object.
#
# THE CORRECT CLAIM, AND IT IS NARROWER. A regress gate is a function of (the built bundle, gates/lib.js, its
# driver under gates/drive/, and the few modules listed above). EVERY ONE of those now FORCES the full suite.
# So a commit that touches none of them cannot change any browser gate's verdict. That is still an identity,
# but it is an identity about a set this script now enumerates rather than about a claim that the set is empty.
# PREMISE CHECK re-derives the set from require() on every run and REFUSES if a gate reaches for anything the
# FORCE list below does not already cover.
#
# AND THE PATH LIST IS NO LONGER TRUSTED ALONE. The decisive hole was not in the allowlist at all: `git diff
# --name-only` reports only the DESTINATION of a rename, so `git mv app.js claude/old-app.js.md` presented as a
# single records path and took a FAST GATE GREEN whose own log said "bundle UNCHANGED" while the bundle was
# gone and index.html still pointed at it - a blank page on main, certified. Two fixes, both here: --no-renames
# on the diff, and BUNDLE IDENTITY below, which compares the shipped files' blob ids at base and head directly
# instead of inferring they are unchanged from a list of paths.
#
# WHAT IT REFUSES. Fast mode is allowed ONLY when the changed set touches none of the bundle's inputs, none of
# the gates, and none of the harness. ANY path it does not recognise forces the full suite: the default is
# always FULL, never FAST. An unknown file is a reason to run everything, which is the opposite of how a
# subset run chooses its gates and is why this may authorise a push where `gates.sh <N> "<subset>"` may not.
#
# IT DOES NOT REBUILD. A records-only commit has no business minting a build number or restamping app.js. If
# app.js differs from the base, that is a bundle change by definition and this script sends you to the full suite.
#
# EMITS "FAST GATE GREEN <sha>" on success. Deliberately NOT the full suite's own green string: every consumer
# greps for that exact string and a fast log must never be mistaken for a full one. Writes its own log name.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; G="$ROOT/gates"
BASE="${1:-}"
[ -n "$BASE" ] || { echo "fastgate.sh: usage: gates/fastgate.sh <base-sha>   (the sha this tree is diffed against; normally origin/main)"; exit 2; }
GIT="git -C $ROOT --git-dir=$ROOT/.git --work-tree=$ROOT"
HEAD="$($GIT rev-parse HEAD 2>/dev/null || echo unknown)"
mkdir -p "$G/logs"
LOG="$G/logs/fast-$($GIT rev-parse --short HEAD 2>/dev/null || date +%s)-all.log"
: > "$LOG"
say(){ echo "$*" | tee -a "$LOG"; }

say "fastgate.sh  base $BASE  head $HEAD  $(date '+%Y-%m-%d %H:%M:%S %Z')"

DIRTY="$($GIT status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$DIRTY" != "0" ]; then
  say "FAST GATE REFUSED - working tree is DIRTY ($DIRTY path(s)). Fast mode gates a COMMIT, not a working tree:"
  say "  the whole argument is that the changed SET is known, and an uncommitted edit is not in it."
  exit 1
fi

CHANGED="$($GIT diff --name-only --no-renames "$BASE".."$HEAD" 2>/dev/null)"   # --no-renames: see header
if [ -z "$CHANGED" ]; then say "FAST GATE REFUSED - no changed paths between $BASE and $HEAD. Nothing to gate."; exit 1; fi
say "changed paths ($(echo "$CHANGED" | wc -l | tr -d ' ')):"
echo "$CHANGED" | sed 's/^/    /' | tee -a "$LOG"

# ── BUNDLE IDENTITY. MEASURED, NOT INFERRED FROM THE PATH LIST. ─────────────────────────────────────────────
# Every file GitHub Pages actually serves, compared by blob id at base and at head. A rename, a delete, a mode
# change or a content change all move the blob id or remove the object, and any of those sends you to the full
# suite. This is the premise stated as a measurement, and it does not care how the path list was computed.
SHIPPED="app.js lessons.js sw.js stockfish-18-lite-single.js index.html privacy.html terms.html refund.html delete-account.html chess-tracker.html"
BUNDLEDIFF=""
for f in $SHIPPED; do
  b="$($GIT rev-parse --quiet --verify "$BASE:$f" 2>/dev/null || echo MISSING)"
  h="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || echo MISSING)"
  [ "$b" = "$h" ] || BUNDLEDIFF="$BUNDLEDIFF$f (base ${b%% *} -> head ${h%% *})\n"
done
if [ -n "$BUNDLEDIFF" ]; then
  say ""
  say "FULL SUITE REQUIRED. A shipped file is not byte-identical to the base:"
  printf "$BUNDLEDIFF" | sed 's/^/    /' | tee -a "$LOG"
  say "MISSING on the head side means the commit DELETED or RENAMED a file the site serves."
  exit 2
fi

# ── GUARD FILES MAY NOT SHRINK. ─────────────────────────────────────────────────────────────────────────────
# held-trees.tsv is the only carrier of "a previous run refused to ship this tree" and verify-log.sh consults it
# by default; build-numbers.tsv is the #454 non-reuse register. Both only ever grow in normal operation, and
# both sit under the gates/*.tsv wildcard that takes a fast green, so emptying either is a records commit that
# silently disarms a guard. Raised by #489's antagonist as finding 5.
SHRANK=""
for f in gates/held-trees.tsv gates/build-numbers.tsv; do
  nb="$($GIT show "$BASE:$f" 2>/dev/null | wc -l | tr -d ' ')"; nb="${nb:-0}"
  nh="$($GIT show "$HEAD:$f" 2>/dev/null | wc -l | tr -d ' ')"; nh="${nh:-0}"
  [ "$nh" -lt "$nb" ] 2>/dev/null && SHRANK="$SHRANK$f ($nb lines -> $nh)\n"
done
if [ -n "$SHRANK" ]; then
  say ""
  say "FAST GATE REFUSED - a guard register LOST rows, which no legitimate records commit does:"
  printf "$SHRANK" | sed 's/^/    /' | tee -a "$LOG"
  exit 1
fi

# ── WHAT FORCES THE FULL SUITE. Anything that can change the bundle, the gates, or how they run. ─────────────
FORCE=""
while IFS= read -r p; do
  case "$p" in
    app.js|chess.jsx|entry.jsx)                     FORCE="$FORCE$p (bundle input or the bundle itself)\n" ;;
    package.json|package-lock.json)                 FORCE="$FORCE$p (build toolchain)\n" ;;
    gates/regress/*|gates/mountcheck.js|gates/lib.js) FORCE="$FORCE$p (a gate or the harness)\n" ;;
    gates/drive/*)                                  FORCE="$FORCE$p (33 of the regress gates require these drivers - #489 finding 2)\n" ;;
    gates/audit/*|gates/engine-extract.js)          FORCE="$FORCE$p (executable harness, not a record: gates/audit holds 0 non-code files)\n" ;;
    gates/build.sh|gates/gates.sh|gates/gatemanifest.sh|gates/gate-manifest.tsv) FORCE="$FORCE$p (how the suite is built or enumerated)\n" ;;
    gates/fastgate.sh)                              FORCE="$FORCE$p (this script gates itself by the full suite)\n" ;;
    functions/*|firebase.json|*.html)               FORCE="$FORCE$p (shipped surface outside the bundle)\n" ;;
    claude/*|gates/logs/*|gates/*.tsv|*.md) : ;;   # records only. gates/audit and gates/drive were HERE and were wrong [#489]
    *.js|*.html|*.json)                             FORCE="$FORCE$p (a .js, .html or .json file this script does not otherwise recognise)\n" ;;
    gates/*)                                        FORCE="$FORCE$p (gates/ path this script does not recognise - defaulting to FULL)\n" ;;
    *)                                              FORCE="$FORCE$p (path this script does not recognise - defaulting to FULL)\n" ;;
  esac
done <<< "$CHANGED"

if [ -n "$FORCE" ]; then
  say ""
  say "FULL SUITE REQUIRED. These paths are not records-only:"
  printf "$FORCE" | sed 's/^/    /' | tee -a "$LOG"
  say "Run: gates/gates.sh \"#<N>\"   (the full suite, and only its own green footer authorises this push)"
  exit 2          # exit 2 means GO FULL. It is not a failure.
fi

# ── PREMISE CHECK. Re-derived every run, because the whole script rests on it. ───────────────────────────────
# Derived from require(), which is how a gate actually reaches another file. The OLD version grepped for quoted
# literals ending .md .tsv .json .html .sh - the same vocabulary as the allowlist - so it could only confirm it.
DEPS="$(grep -ohE "require\(['\"][^'\"]+['\"]\)" "$G"/regress/*.js "$G"/mountcheck.js 2>/dev/null \
        | sed -E "s/require\(['\"]//; s/['\"]\)//" | grep -E '^[./]' | sort -u)"
UNCOVERED=""
while IFS= read -r dep; do
  [ -n "$dep" ] || continue
  case "$dep" in
    ../lib|../lib.js|./lib|../mountcheck.js)        : ;;   # covered: gates/lib.js, gates/mountcheck.js FORCE
    ../drive/*)                                     : ;;   # covered: gates/drive/* FORCE
    ../engine-extract.js)                           : ;;   # covered: gates/engine-extract.js FORCE
    ../../functions/*)                              : ;;   # covered: functions/* FORCE
    */lessons.js|lessons.js|../../lessons.js)       : ;;   # covered: root *.js FORCE
    *)  UNCOVERED="$UNCOVERED$dep\n" ;;
  esac
done <<< "$DEPS"
if [ -n "$UNCOVERED" ]; then
  say ""
  say "FAST GATE REFUSED - THE PREMISE IS BROKEN. A regress gate requires a file the FORCE list does not cover:"
  printf "$UNCOVERED" | sed 's/^/    /' | tee -a "$LOG"
  say "Add it to FORCE above, or retire fast mode. File a job and run FULL."
  exit 1
fi
say ""
say "premise check: $(echo "$DEPS" | grep -c .) distinct require() targets across the regress gates, every one of them"
say "  inside the FORCE set. So no gate's verdict can differ from its verdict on the base for this commit."

# ── WHAT STILL RUNS, AND HOW IT JUDGES. ─────────────────────────────────────────────────────────────────────
# Two of the three record checks are ALREADY RED on main and have been for days (citations: 18 dead paths, 19
# unsupported case ids; control-audit: unverifiable back-fill). Blocking on them would block every fast push
# for a reason this commit did not cause, and within a day somebody would delete the check to get green. So
# they are RATCHETS, not pass/fail: the same check is run against the BASE and against HEAD, and the commit is
# refused only if a count got WORSE. A records commit may not make the records worse. That is the whole test,
# it is the right one for an already-failing check, and both checks run in about a second so the second run
# costs nothing. gatemanifest is the exception: it passes today and is binary, because a missing or weakened
# gate is not a degree.
red=0
# A VERDICT is every line the check ends on, not one of them. The first version grepped only the CITATIONS
# line; an adversary commit that appended a malformed case row flipped REGISTER SELF-CHECK from OK to RED and
# left CITATIONS untouched, so it passed. A check with two verdict lines needs both, and a word flipping from
# OK to RED is worse whatever the numbers do.
verdicts(){ "$@" 2>&1 | grep -E "$KEY" ; }
sig(){ grep -oE '\b(OK|RED|GREEN|FAIL)\b|[0-9]+' <<< "$1" | paste -sd, - ; }
worse(){ # worse <base-sig> <head-sig>
  local IFS=,; local -a b=($1) h=($2); local i
  [ "${#b[@]}" = "${#h[@]}" ] || return 0            # different shape cannot be compared: treat as worse
  for i in "${!b[@]}"; do
    case "${b[$i]}" in
      OK|GREEN) [ "${h[$i]}" = "${b[$i]}" ] || return 0 ;;          # a pass that stopped passing
      RED|FAIL) : ;;                                                # already failing: only the numbers matter
      *) [ "${h[$i]}" -gt "${b[$i]}" ] 2>/dev/null && return 0 ;;   # a count that rose
    esac
  done
  return 1
}
ratchet(){ # ratchet <label> <verdict-grep> <cmd...>
  # The base run happens in a DETACHED WORKTREE, never by mutating the lane's own tree. The first version used
  # `git stash` + `git checkout "$BASE" -- .` with $GIT quoted as one word; $GIT is multi-word, so the command
  # silently did nothing, both runs read the SAME tree, and a commit that made the records worse passed as "no
  # worse". A ratchet that compares a tree to itself always says no worse. Both bugs were found by adversarial
  # cases before this shipped, and both are recorded so nobody reintroduces them.
  local label="$1"; KEY="$2"; shift 2
  local hv bv hs bs wt
  hv="$(verdicts "$@")"
  wt="$(mktemp -d)"
  if ! git -C "$ROOT" worktree add -q --detach "$wt" "$BASE" 2>>"$LOG"; then
    red=1; say "    $label: RED (could not create a base worktree at $BASE - the ratchet cannot be evaluated)"
    rm -rf "$wt"; return
  fi
  local -a bcmd=(); local a
  for a in "$@"; do case "$a" in "$ROOT"/*) bcmd+=("$wt/${a#$ROOT/}") ;; *) bcmd+=("$a") ;; esac; done
  bv="$( cd "$wt" && "${bcmd[@]}" 2>&1 | grep -E "$KEY" )"
  git -C "$ROOT" worktree remove --force "$wt" 2>>"$LOG" || rm -rf "$wt"
  { echo "=== $label ==="; echo "  base:"; echo "$bv" | sed 's/^/    /'; echo "  head:"; echo "$hv" | sed 's/^/    /'; } >> "$LOG"
  if [ -z "$hv" ]; then red=1; say "    $label: RED (nothing matched /$KEY/ on HEAD - the check did not run or changed shape)"; return; fi
  if [ -z "$bv" ]; then red=1; say "    $label: RED (nothing matched on the BASE - cannot ratchet against nothing)"; return; fi
  hs="$(sig "$hv")"; bs="$(sig "$bv")"
  if worse "$bs" "$hs"; then red=1
    say "    $label: RED - this commit made it WORSE"
    echo "$bv" | sed 's/^/        base: /' | tee -a "$LOG"
    echo "$hv" | sed 's/^/        head: /' | tee -a "$LOG"
  else
    say "    $label: no worse than base"
  fi
}
binary(){ local label="$1"; shift; local out rc
  out="$("$@" 2>&1)"; rc=$?
  echo "=== $label ===" >> "$LOG"; echo "$out" >> "$LOG"
  if [ $rc -ne 0 ]; then red=1; say "    $label: RED (exit $rc)"; echo "$out" | tail -4 | sed 's/^/        /' >> "$LOG"
    echo "$out" | tail -4 | sed 's/^/        /'
  else say "    $label: green"; fi
}
say ""
say "running the checks a records commit CAN break:"
binary  "gate manifest" bash "$G/gatemanifest.sh" check
ratchet "records"       '^(CITATIONS|REGISTER SELF-CHECK)' bash "$G/verify-log.sh" --citations
if command -v node >/dev/null 2>&1 && [ -f "$G/control-audit.js" ]; then
  ratchet "control audit" '(uncontrolled|CONTROL AUDIT|controlled)' node "$G/control-audit.js"
else
  say "    control audit: SKIPPED (node or gates/control-audit.js not available here)"
fi

say ""
say "gates ran: records tier only. The 54 browser gates were NOT run and could not have differed."
say "ref: HEAD $HEAD | base $BASE | bundle UNCHANGED (app.js not in the changed set)"
if [ $red -eq 0 ]; then
  say "FAST GATE GREEN $HEAD"
  say "This authorises a push of THIS COMMIT ONLY. It is not the full suite's own green footer and never"
  say "the nightly full suite on main is what certifies the bundle, and docs/fast-gate-state records its verdict."
  exit 0
else
  say "FAST GATE RED $HEAD"
  exit 1
fi
