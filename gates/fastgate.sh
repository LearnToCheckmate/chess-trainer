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
# THE CLAIM IT RESTS ON, AND IT IS MEASURED, NOT ASSUMED.
# On 2026-10-06 all 55 files in gates/regress were read for every repo path they open. FIFTY-FOUR of them drive
# the BUILT BUNDLE and read NO other file in this repository: not a claude/ document, not a .tsv, not a .md.
# They are a pure function of app.js. THEREFORE: if a commit leaves the bundle byte-identical, not one of those
# 54 gates can return a different verdict than it did on the base. Skipping them is not a risk judgement, it is
# an identity. Re-derive this with:
#     for f in gates/regress/*.js; do grep -oE "['\"][A-Za-z0-9_./-]+\.(md|tsv|json|html|sh)['\"]" "$f"; done | sort -u
# If that ever returns a path, THIS SCRIPT'S PREMISE IS BROKEN and the gate that reads it must be added to
# ALWAYS below, or fast mode retired. The premise is re-checked on every run, at PREMISE CHECK.
#
# WHAT IT REFUSES. Fast mode is allowed ONLY when the changed set touches none of the bundle's inputs, none of
# the gates, and none of the harness. ANY path it does not recognise forces the full suite: the default is
# always FULL, never FAST. An unknown file is a reason to run everything, which is the opposite of how a
# subset run chooses its gates and is why this may authorise a push where `gates.sh <N> "<subset>"` may not.
#
# IT DOES NOT REBUILD. A records-only commit has no business minting a build number or restamping app.js. If
# app.js differs from the base, that is a bundle change by definition and this script sends you to the full suite.
#
# EMITS "FAST GATE GREEN <sha>" on success. Deliberately NOT "GATES GREEN": every consumer in this project
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

CHANGED="$($GIT diff --name-only "$BASE".."$HEAD" 2>/dev/null)"
if [ -z "$CHANGED" ]; then say "FAST GATE REFUSED - no changed paths between $BASE and $HEAD. Nothing to gate."; exit 1; fi
say "changed paths ($(echo "$CHANGED" | wc -l | tr -d ' ')):"
echo "$CHANGED" | sed 's/^/    /' | tee -a "$LOG"

# ── WHAT FORCES THE FULL SUITE. Anything that can change the bundle, the gates, or how they run. ─────────────
FORCE=""
while IFS= read -r p; do
  case "$p" in
    app.js|chess.jsx|entry.jsx)                     FORCE="$FORCE$p (bundle input or the bundle itself)\n" ;;
    package.json|package-lock.json)                 FORCE="$FORCE$p (build toolchain)\n" ;;
    gates/regress/*|gates/mountcheck.js|gates/lib.js) FORCE="$FORCE$p (a gate or the harness)\n" ;;
    gates/build.sh|gates/gates.sh|gates/gatemanifest.sh|gates/gate-manifest.tsv) FORCE="$FORCE$p (how the suite is built or enumerated)\n" ;;
    gates/fastgate.sh)                              FORCE="$FORCE$p (this script gates itself by the full suite)\n" ;;
    functions/*|firebase.json|*.html)               FORCE="$FORCE$p (shipped surface outside the bundle)\n" ;;
    claude/*|gates/audit/*|gates/logs/*|gates/drive/*|gates/*.tsv|*.md) : ;;   # records and audit tooling: no browser gate reads these
    gates/*)                                        FORCE="$FORCE$p (gates/ path this script does not recognise - defaulting to FULL)\n" ;;
    *)                                              FORCE="$FORCE$p (path this script does not recognise - defaulting to FULL)\n" ;;
  esac
done <<< "$CHANGED"

if [ -n "$FORCE" ]; then
  say ""
  say "FULL SUITE REQUIRED. These paths are not records-only:"
  printf "$FORCE" | sed 's/^/    /' | tee -a "$LOG"
  say "Run: gates/gates.sh \"#<N>\"   (the full suite, and only its GATES GREEN authorises this push)"
  exit 2          # exit 2 means GO FULL. It is not a failure.
fi

# ── PREMISE CHECK. Re-derived every run, because the whole script rests on it. ───────────────────────────────
LEAK="$(grep -ohE "['\"][A-Za-z0-9_./-]+\.(md|tsv|json|html|sh)['\"]" "$G"/regress/*.js 2>/dev/null \
        | tr -d "'\"" | grep -vE '^(package(-lock)?\.json)$' | sort -u)"
if [ -n "$LEAK" ]; then
  say ""
  say "FAST GATE REFUSED - THE PREMISE IS BROKEN. A gate in gates/regress now reads a non-bundle repo file:"
  echo "$LEAK" | sed 's/^/    /' | tee -a "$LOG"
  say "Fast mode is sound only while every regress gate is a pure function of the bundle. File a job and run FULL."
  exit 1
fi
say ""
say "premise check: 0 regress gates read a non-bundle repo file. The 54 browser gates cannot be affected by this commit."

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
  say "This authorises a push of THIS COMMIT ONLY. It is not GATES GREEN and never substitutes for one:"
  say "the nightly full suite on main is what certifies the bundle, and docs/fast-gate-state records its verdict."
  exit 0
else
  say "FAST GATE RED $HEAD"
  exit 1
fi
