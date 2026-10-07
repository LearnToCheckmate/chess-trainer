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

# ── THE BASE IS NOT TAKEN ON TRUST. ────────────────────────────────────────────────────────────────────────
# Added #490 on both antagonists' finding, reproduced before acting. Until now BASE was whatever sha the caller
# typed, and NOTHING checked it: not that it is an ancestor of HEAD, not that it is what main carries. So every
# soundness sentence this script prints was relative to the caller's choice. MEASURED: a commit adding three
# lines of code to app.js, then a records commit on top, run with the FIRST of those as BASE, took EXIT 0 FAST
# GATE GREEN over an app.js differing from main - and the log printed "bundle UNCHANGED", which is verbatim the
# sentence 6120ecd records as the lie that certified a blank page. The #489 fix made that sentence true with
# respect to BASE; it was still false with respect to MAIN, and main is what GitHub Pages serves. A second
# reproduction, from the other antagonist: `fastgate.sh HEAD~1` on a two-commit stack reports "changed paths (1)"
# and authorises a push that carries both commits.
$GIT rev-parse --quiet --verify "$BASE^{commit}" >/dev/null 2>&1 || {
  say "FAST GATE REFUSED - the base \"$BASE\" does not name a commit in this repository."; exit 1; }
BASEFULL="$($GIT rev-parse "$BASE^{commit}")"
if ! $GIT merge-base --is-ancestor "$BASEFULL" "$HEAD" 2>/dev/null; then
  say "FAST GATE REFUSED - the base is NOT AN ANCESTOR of HEAD, so the diff is not what a push would carry:"
  say "    base $BASEFULL"
  say "    head $HEAD"
  exit 1
fi
MAINREF="$($GIT rev-parse --quiet --verify refs/remotes/origin/main 2>/dev/null || true)"
if [ -n "$MAINREF" ]; then
  if [ "$MAINREF" != "$BASEFULL" ]; then
    say "FAST GATE REFUSED - the base is not what origin/main carries, and a fast green is only meaningful"
    say "against the tree main actually serves:"
    say "    base          $BASEFULL"
    say "    origin/main   $MAINREF"
    if $GIT merge-base --is-ancestor "$MAINREF" "$HEAD" 2>/dev/null; then
      say "    origin/main IS an ancestor of HEAD - re-run with origin/main as the base."
    else
      say "    origin/main is NOT an ancestor of HEAD - fetch and rebase first [CLAUDE.md, fetch before you build]."
    fi
    exit 1
  fi
  say "base check: the base IS origin/main ($MAINREF), and is an ancestor of HEAD."
else
  say "FAST GATE REFUSED - refs/remotes/origin/main does not resolve here, so the base cannot be checked"
  say "against what main serves. Run `git fetch origin main` first. Fast mode will not guess."
  exit 1
fi

CHANGED="$($GIT diff --name-only --no-renames "$BASEFULL".."$HEAD" 2>/dev/null)"   # --no-renames: see header
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
  b="$($GIT rev-parse --quiet --verify "$BASEFULL:$f" 2>/dev/null || echo MISSING)"
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
# RE-SCOPED AT #490. This guard was the ONLY protection on those two files and it implemented the WRONG
# INVARIANT: it compares `wc -l`, and the threat is not emptying but DISARMING. Both #490 antagonists reproduced
# it independently. Prefixing one "-" to a row's bundleMd5 CLEARS that row (verify-log.sh:799 and held.sh treat a
# leading "-" as a cleared row) with zero lines removed, and I reproduced the full threshold crossing myself:
# `verify-log.sh claude/agents/gatelogs/459b-all.log` went from REAL EXIT 1 "REFUSED (held tree)" to REAL EXIT 0
# "OK", and held.sh's live-row count went 9 -> 0, on a FAST GATE GREEN. The same two-character trick renumbers a
# build-numbers.tsv row in place and takes `buildnum.sh check 490` from ISSUED/exit 1 to free/exit 0, making one
# number re-mintable. THE FIX IS IN classify(): both files are now FORCE, because their protection lives in their
# row VALUES and no line-count or subset test is worth trusting with the #450 class. This block is kept as a
# second line of defence and, with those two paths forced, it normally cannot fire - said plainly rather than
# left looking load-bearing.
SHRANK=""
for f in gates/held-trees.tsv gates/build-numbers.tsv; do
  nb="$($GIT show "$BASEFULL:$f" 2>/dev/null | wc -l | tr -d ' ')"; nb="${nb:-0}"
  nh="$($GIT show "$HEAD:$f" 2>/dev/null | wc -l | tr -d ' ')"; nh="${nh:-0}"
  [ "$nh" -lt "$nb" ] 2>/dev/null && SHRANK="$SHRANK$f ($nb lines -> $nh)\n"
done
if [ -n "$SHRANK" ]; then
  say ""
  say "FAST GATE REFUSED - a guard register LOST rows, which no legitimate records commit does:"
  printf "$SHRANK" | sed 's/^/    /' | tee -a "$LOG"
  exit 1
fi

# ── THE CLASSIFIER. ONE FUNCTION, TWO CALLERS, AND THAT IS THE WHOLE POINT. ─────────────────────────────────
# Added #490. Until now the changed-set decision below and the premise check further down each carried their own
# idea of what counts as records-only, and the premise check's idea was written in a DIFFERENT VOCABULARY from
# the decision's - require() targets against glob patterns. So a gate could read a file the decision classed as
# records and the premise check could not see it. MEASURED on main at 109d897 before this fix:
# gates/regress/68-brilliant-sac-empty-square.js reads its nine-game PGN corpus out of
# claude/agents/bench/pgn/ with fs.readFileSync, claude/* was records-only, and a commit DELETING one of those
# PGNs took FAST GATE GREEN with the log asserting "the 54 browser gates ... could not have differed". Gate 68
# on that tree: 70 pass / 3 FAIL / exit 1, against 78 pass / 0 fail with the file present. The fast green was
# wrong, and the premise check that exists to catch exactly that returned OK.
# So classification now lives in ONE place that both callers ask. Two lists cannot drift when there is one list.
# THIS IS THE ELEVENTH COSTUME OF THE TRAP CLAUDE.md RECORDS TEN TIMES: the check and the thing being checked
# must not be the same object, and the dual failure is just as bad - a check that cannot SEE the thing it checks.
classify(){   # classify <repo-relative-path>  ->  "FORCE <reason>"  or  "RECORDS"
  case "$1" in
    app.js|chess.jsx|entry.jsx)                     echo "FORCE bundle input or the bundle itself" ;;
    package.json|package-lock.json)                 echo "FORCE build toolchain" ;;
    gates/regress/*|gates/mountcheck.js|gates/lib.js) echo "FORCE a gate or the harness" ;;
    gates/drive/*)                                  echo "FORCE 33 of the regress gates require these drivers - #489 finding 2" ;;
    gates/audit/*|gates/engine-extract.js)          echo "FORCE executable harness, not a record: gates/audit holds 0 non-code files" ;;
    gates/build.sh|gates/gates.sh|gates/gatemanifest.sh|gates/gate-manifest.tsv) echo "FORCE how the suite is built or enumerated" ;;
    gates/fastgate.sh)                              echo "FORCE this script gates itself by the full suite" ;;
    functions/*|firebase.json|*.html)               echo "FORCE shipped surface outside the bundle" ;;
    claude/agents/bench/*)                          echo "FORCE gate 68 reads its PGN corpus here with fs.readFileSync - measured #490" ;;
    gates/held-trees.tsv|gates/build-numbers.tsv)   echo "FORCE a GUARD REGISTER whose protection lives in its row VALUES - #490 antagonists" ;;
    claude/*|gates/logs/*|gates/*.tsv)              echo "RECORDS" ;;
    */*.md)                                         echo "RECORDS" ;;
    *.md)                                           echo "FORCE a ROOT-level .md: GitHub Pages runs Jekyll here (no .nojekyll), so index.md would be SERVED" ;;
    *.js|*.html|*.json)                             echo "FORCE a .js, .html or .json file this script does not otherwise recognise" ;;
    gates/*)                                        echo "FORCE gates/ path this script does not recognise - defaulting to FULL" ;;
    *)                                              echo "FORCE path this script does not recognise - defaulting to FULL" ;;
  esac
}

# ── EVIDENCE MAY NOT BE DESTROYED BY A RECORDS COMMIT. ──────────────────────────────────────────────────────
# Added #490 on antagonist A's P0-3 and antagonist B's P2-3, both reproduced, and note what it is NOT: it is not
# a hole fastgate INTRODUCED, because the full suite never checked these either. What fast mode removes is the 84
# minutes that incidentally made destroying evidence expensive, and a records tier whose cheapest operation is
# deleting the proof is the wrong shape whatever the suite does.
#   A: `git rm claude/agents/gatelogs/489-all.log` - the ONLY full-suite green over the bundle main serves, and
#      the artefact verify-log.sh cites - took EXIT 0 FAST GATE GREEN, and the control-audit ratchet called it
#      "no worse". I FIXED THAT RATCHET'S KEY (it was matching only a header line) and the deletion STILL passed,
#      because control-audit measures CONTROL COVERAGE and that reads 0 covered / 56 gates either way. So the
#      honest finding is that no ratchet over coverage can see this, and it needs its own rule. Measured both
#      ways: SUMMARY is byte-identical with and without the log.
#   B: truncating claude/stories/TEST-CASES.md from 702 to 552 lines - 21% of the case register - scored as an
#      IMPROVEMENT, because the only number that moved was "1 row(s) NOT CHECKED" falling to 0.
# THE RULE: a records commit may ADD records. Removing a gate log, or shortening a register, is not a records
# action and does not get the cheap tier. It is still perfectly possible - it just pays the full suite and is
# therefore visible.
GONE="$($GIT diff --name-only --no-renames --diff-filter=D "$BASEFULL".."$HEAD" 2>/dev/null | grep -E '^claude/agents/gatelogs/' || true)"
if [ -n "$GONE" ]; then
  say ""
  say "FAST GATE REFUSED - this commit DELETES gate log evidence, which no records commit does:"
  echo "$GONE" | sed 's/^/    /' | tee -a "$LOG"
  say "A gate log is what verify-log.sh cites to prove a bundle was gated. Run FULL, or do not delete it."
  exit 1
fi
SHORTER=""
for f in claude/stories/TEST-CASES.md claude/stories/USER-STORIES.md; do
  nb="$($GIT show "$BASEFULL:$f" 2>/dev/null | wc -l | tr -d ' ')"; nb="${nb:-0}"
  nh="$($GIT show "$HEAD:$f" 2>/dev/null | wc -l | tr -d ' ')"; nh="${nh:-0}"
  [ "$nh" -lt "$nb" ] 2>/dev/null && SHORTER="$SHORTER$f ($nb lines -> $nh)\n"
done
if [ -n "$SHORTER" ]; then
  say ""
  say "FAST GATE REFUSED - a register of cases or stories got SHORTER, which the records ratchet reads as an"
  say "improvement because the only number that moves is a 'not checked' count falling:"
  printf "$SHORTER" | sed 's/^/    /' | tee -a "$LOG"
  exit 1
fi

# ── WHAT FORCES THE FULL SUITE. Anything that can change the bundle, the gates, or how they run. ─────────────
FORCE=""
while IFS= read -r p; do
  [ -n "$p" ] || continue
  v="$(classify "$p")"
  [ "$v" = "RECORDS" ] || FORCE="$FORCE$p (${v#FORCE })\n"
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
# #490, both antagonists: this scanned ONLY gates/regress/*.js and gates/mountcheck.js, while the script's own
# "CORRECT CLAIM" paragraph names gates/lib.js, gates/drive/* and gates/engine-extract.js as the gates' inputs.
# A gate reaches a file THROUGH its harness as readily as directly, so a dependency one level down was invisible.
# Antagonist A measured it as latent rather than live today - none of those three currently reaches a records
# path - and latent is exactly how gate 68's fixture got here. gates/control-audit.js is deliberately NOT in this
# set: it is not a browser gate, it is a records-tier check this script RATCHETS at base and head, so a change to
# what it reads is compared rather than assumed away.
PSCAN="$G/regress/*.js $G/mountcheck.js $G/lib.js $G/engine-extract.js $G/drive/*.js"
DEPS="$(grep -ohE "require\(['\"][^'\"]+['\"]\)" $PSCAN 2>/dev/null \
        | sed -E "s/require\(['\"]//; s/['\"]\)//" | grep -E '^[./]' | sort -u)"
# PART ONE ASKS classify(), AND CARRIES NO LIST OF ITS OWN. #490's first attempt left a hand-written `case`
# whitelist here and claimed in its commit message that "two lists cannot drift when there is one list" - which
# was FALSE while this block existed, and #490's own antagonist A proved it rather than argued it: one of the six
# patterns, `*/lessons.js`, was UNANCHORED, so a gate requiring `../../claude/agents/lessons.js` matched it and
# was declared covered, while classify() on that same path returns RECORDS. Reproduced end to end: a records
# commit editing that module took the gate from PASS/exit 0 to FAIL/exit 1 and still took EXIT 0 FAST GATE GREEN,
# with the log stating "every one of them inside the FORCE set". That is the TWELFTH costume of CLAUDE.md's trap,
# produced by the very commit that was fixing the eleventh. The lesson is not "anchor the glob": it is that a
# second list is the defect, whatever its patterns say. So the require() target is RESOLVED to a repo-relative
# path and handed to classify(), the same function the changed-set decision uses.
UNCOVERED=""
while IFS= read -r dep; do
  [ -n "$dep" ] || continue
  # resolve relative to gates/regress (where the gates live), with -m so a module id with no file still resolves
  # a dep may be written from gates/regress/ or from gates/ itself (lib.js, drive/*), so resolve BOTH and take
  # the one that names a file that exists; if neither does, judge the regress-relative one, which is the stricter.
  rel="$(realpath -m --relative-to="$ROOT" "$G/regress/$dep" 2>/dev/null || echo "$dep")"
  alt="$(realpath -m --relative-to="$ROOT" "$G/$dep" 2>/dev/null || echo "$dep")"
  if [ ! -e "$ROOT/$rel" ] && [ ! -e "$ROOT/$rel.js" ] && { [ -e "$ROOT/$alt" ] || [ -e "$ROOT/$alt.js" ]; }; then
    rel="$alt"
  fi
  case "$rel" in
    ../*|/*) UNCOVERED="$UNCOVERED$dep -> $rel (resolves OUTSIDE the repository)\n"; continue ;;
  esac
  if [ "$(classify "$rel")" = "RECORDS" ]; then
    UNCOVERED="$UNCOVERED$dep -> $rel (a gate requires this, and classify() calls it records-only)\n"
  fi
done <<< "$DEPS"
if [ -n "$UNCOVERED" ]; then
  say ""
  say "FAST GATE REFUSED - THE PREMISE IS BROKEN. A regress gate requires a file the FORCE list does not cover:"
  printf "$UNCOVERED" | sed 's/^/    /' | tee -a "$LOG"
  say "Add it to FORCE above, or retire fast mode. File a job and run FULL."
  exit 1
fi
# ── PREMISE CHECK, PART TWO: THE FILES A GATE READS WITHOUT require(). ───────────────────────────────────────
# Added #490, because part one could not see them and that was a live hole, measured and reproduced. require()
# is how a gate reaches a MODULE; path.join + fs.readFileSync is how it reaches a FIXTURE, and a fixture is an
# input to the verdict exactly as much as a module is. Measured on main: three regress gates read with fs
# (27-scan-fen reads chess.jsx, 33-reproducible-review reads app.js, 68-brilliant-sac-empty-square reads
# claude/agents/bench/pgn/*.pgn) and only the first two were inside the FORCE set.
#
# HOW IT DERIVES THEM, and what it deliberately does NOT try to do. For every path.join(...) call in the gates
# it takes the LEADING RUN OF QUOTED LITERALS, drops the ".." hops that walk up out of gates/regress, joins the
# rest, and keeps it if that path actually EXISTS in the repo. It stops at the first non-literal argument, so
# path.join(DIR, gid + '.pgn') contributes DIR's own directory and not a guess at the filename - the DIRECTORY
# is what needs covering, so stopping there loses nothing. It is not a JS parser and does not pretend to be;
# what makes it sound is that it asks the SAME classify() the decision uses, so anything it does find cannot be
# classified one way here and the other way there.
FSREFS="$(for gf in $PSCAN; do
    [ -f "$gf" ] || continue
    grep -oE "path\.join\([^)]*\)" "$gf" 2>/dev/null \
      | sed -E "s/^path\.join\(//; s/\)$//" \
      | awk -F',' '{
          out=""; 
          for(i=1;i<=NF;i++){
            seg=$i; gsub(/^[ \t]+|[ \t]+$/,"",seg);
            if(seg ~ /^'"'"'[^'"'"']*'"'"'$/ || seg ~ /^"[^"]*"$/){
              gsub(/^['"'"'"]|['"'"'"]$/,"",seg);
              out = (out=="" ? seg : out "/" seg);
            } else if (out != "") { break }
          }
          if(out!="") print out
        }'
  done | sed -E 's#(^|/)\.\./#/#g; s#^/+##; s#^(\.\./)+##' | sed -E 's#^\.\.$##' | grep -v '^$' | sort -u)"

FSBAD=""
FSSEEN=0
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  # keep only references that name something that really exists in the repo
  [ -e "$ROOT/$ref" ] || continue
  FSSEEN=$((FSSEEN+1))
  if [ "$(classify "$ref")" = "RECORDS" ]; then
    FSBAD="$FSBAD$ref (a gate reads this, and classify() calls it records-only)\n"
  fi
done <<< "$FSREFS"

if [ -n "$FSBAD" ]; then
  say ""
  say "FAST GATE REFUSED - THE PREMISE IS BROKEN. A regress gate READS a path this script treats as records-only,"
  say "so a records commit could change that gate's input while this script reports the gates could not differ:"
  printf "$FSBAD" | sed 's/^/    /' | tee -a "$LOG"
  say "Add it to classify() as FORCE, or retire fast mode. File a job and run FULL."
  exit 1
fi
say ""
say "premise check: $(echo "$DEPS" | grep -c .) distinct require() targets across the regress gates, every one of them"
say "  inside the FORCE set. So no gate's verdict can differ from its verdict on the base for this commit."
say "premise check part two: $FSSEEN existing repo paths reached by path.join in the gates, every one of them FORCE."

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
      *) case "${b[$i]}${h[$i]}" in *[!0-9]*) return 0 ;; esac      # #490: a number replaced by a word is WORSE,
         [ "${h[$i]}" -gt "${b[$i]}" ] && return 0 ;;                #   not silently skipped past by 2>/dev/null

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
  if ! git -C "$ROOT" worktree add -q --detach "$wt" "$BASEFULL" 2>>"$LOG"; then
    red=1; say "    $label: RED (could not create a base worktree at $BASEFULL - the ratchet cannot be evaluated)"
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
  # #490, antagonist A: the key here was '(uncontrolled|CONTROL AUDIT|controlled)', which matches ONLY
  # control-audit.js's HEADER line ("CONTROL AUDIT   log=claude/agents/gatelogs/489-all.log   gates=56") and
  # NEITHER of its two real verdict lines ("SUMMARY  0 covered, of 56 gates" and "CONTROL-AUDIT RED:" - note the
  # HYPHEN, which the old alternation's space could never match). So sig() reduced to a GATE-LOG FILENAME ORDINAL
  # and the gate count, 489,56, and every "control audit: no worse than base" ever printed was that compared with
  # itself. Worse, it moved the wrong way: deleting claude/agents/gatelogs/489-all.log - the only full-suite green
  # over main's bundle - read 489 -> 488 as a count that FELL, i.e. an improvement, while ADDING a gate log, the
  # commonest records commit this project makes, would have been refused as WORSE because a filename number rose.
  ratchet "control audit" '^(SUMMARY|CONTROL-AUDIT)' node "$G/control-audit.js"
else
  say "    control audit: SKIPPED (node or gates/control-audit.js not available here)"
fi

say ""
# #490: "54" was hard-coded and wrong by two, in the one sentence that states the SCOPE of what was skipped,
# while three separate tools compute it (ls gates/regress/*.js = 55, gatemanifest check = 55 required,
# control-audit = 56 sections counting mountcheck). Both antagonists caught it independently. Compute it.
NGATES="$(ls "$G"/regress/*.js 2>/dev/null | wc -l | tr -d ' ')"
say "gates ran: records tier only. The $NGATES browser gates in gates/regress were NOT run, and could not have"
say "  differed: every file any of them reads is in the FORCE set, re-derived above, and none is in this diff."
# #490: the old ref line read "bundle UNCHANGED (app.js not in the changed set)", which is VERBATIM the ground
# 6120ecd records as the lie that certified a blank page - a path-list inference. The verdict is now sound because
# BUNDLE IDENTITY compares blob ids, so the line should state THAT and not the discredited reason.
say "ref: HEAD $HEAD | base $BASEFULL (= origin/main) | bundle UNCHANGED by BLOB ID over all $(set -- $SHIPPED; echo $#) served files"
if [ $red -eq 0 ]; then
  say "FAST GATE GREEN $HEAD"
  say "This authorises a push of THIS COMMIT ONLY. It is not the full suite's own green footer and must never"
  say "be cited as one; gates/verify-log.sh refuses this log as a push gate, correctly, and was confirmed doing"
  say "so at #490 - it exits 1 because this log does not end in the full suite's green footer."
  say "The NIGHTLY full suite on main is what certifies the bundle. Its verdict is recorded on the TRACKER as"
  say "  docs/fast-gate-state (artifact 5326ERvZCZ5tEYRkPavPTF) - NOT a file in this repository. #490's antagonist B,"
  say "  which deliberately has no database tools, read the old wording as naming a repo file and reported it"
  say "  missing; it was right that nothing in the repo carries it, and the wording was what misled it."
  exit 0
else
  say "FAST GATE RED $HEAD"
  exit 1
fi
