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
# THE TEMPORARIES GO ON EVERY EXIT PATH, AND A KILL INSIDE A RATCHET IS THE ONE EXCEPTION [#527, item (2)(c) of
# jobs/harness-case-h21-cannot-fail-for-its-own-defect-and-the-case-register-and-comments-claim-what-the-code-does-not-back-2026-10-16].
# The comment at the second pair of register copies below said this script must not leave temporaries behind on
# any exit path, and it did. MEASURED on #526's script: a refused run (four contiguous mints, exit 1) left two
# register copies in TMPDIR, the base's and the head's (235,266 and 235,634 bytes on H29's fixture over 366428f,
# whose register ended at #526; the copies grow with it), and gates/fastgate-drive.sh makes many such runs.
# Every mktemp below now registers its path in FG_TMPS and this one EXIT trap removes them all, so a refusal, a
# FULL and a green leave TMPDIR as they found it; the ratchets' base worktree is registered too, so an exit
# during a ratchet removes its directory. A KILL during a ratchet can still leave that one directory [#527 v4,
# an independent reader, SIGTERM 2 of 2]: the ratchet's child process keeps writing into it after the trap has
# run, so the trap's rm meets "Directory not empty"; git keeps a worktree entry that `git worktree prune`
# clears, and the directory itself stays in TMPDIR. The trap does not change the exit status (bash keeps the status of the `exit` that ran it), and bash
# runs it on SIGTERM as well, which is how `timeout` stops this script. Controlled by gates/fastgate-drive.sh H29.
FG_TMPS=()
fg_cleanup(){ local t; for t in "${FG_TMPS[@]}"; do [ -n "$t" ] && rm -rf -- "$t"; done; return 0; }
trap fg_cleanup EXIT

say "fastgate.sh  base $BASE  head $HEAD  $(date '+%Y-%m-%d %H:%M:%S %Z')"

DIRTY="$($GIT status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$DIRTY" != "0" ]; then
  say "FAST GATE REFUSED - working tree is DIRTY ($DIRTY path(s)). Fast mode gates a COMMIT, not a working tree:"
  say "  the whole argument is that the changed SET is known, and an uncommitted edit is not in it."
  exit 1
fi

# ── THIS TIER EXECUTES WORKING-TREE CODE WHILE CLAIMING TO GATE A COMMIT. ASSERT THE TWO ARE THE SAME. ───────
# Added #521 on antagonist B's cross-read, after A had found the route and B had measured that A's own fix did
# not close it. THE HOLE: every check this tier runs is executed from the WORKING TREE - records-gate.sh twice,
# gatemanifest.sh, verify-log.sh and control-audit.js - while every verdict it prints is about $HEAD. The only
# thing tying those together was the DIRTY check above, and `git status` is a STATUS check, not a CONTENT check:
# `git update-index --assume-unchanged <file>` makes it report 0 while the file on disk says whatever you like.
# MEASURED, TWICE, BOTH AT EXIT 0 FAST GATE GREEN WITH NO PRIOR COMMIT. A defanged the working-tree door and
# rewrote register rows in place. B then defeated A's `--entries` fix by adding ONE line inside entries_live()
# in the working tree, so `--entries` listed the register while the ratchet loop still skipped it - which is the
# sharpest statement of the whole class: "one list" is not a property of a FILE, it is a property of an HONEST
# COPY of that file, and this script runs whichever copy is on disk.
# SO THE FIX IS NOT A BETTER QUESTION ABOUT THE DOOR, IT IS TO PIN THE EXECUTABLE. Compare the blob the commit
# records against the blob on disk, for every file this tier executes, and refuse on any difference.
# I EXTENDED B's LIST BY ONE: B named records-gate.sh, verify-log.sh and control-audit.js; gatemanifest.sh is
# executed here too (the `binary "gate manifest"` call) and is equally defangable, so it is in the set.
# IT IS A NO-OP ON EVERY HONEST TREE, which is why it is safe to add here: a clean `git status` already implies
# worktree == index == HEAD, so this can only fire where the status check was being lied to.
# ── #530 N1. A CONVERSION IN FORCE ROUTES TO THE FULL SUITE AT EXIT 2, IT DOES NOT REFUSE AT EXIT 1 ──────────
# jobs/the-raw-byte-pins-of-fastgate-refuse-an-honest-autocrlf-checkout-at-exit-1-instead-of-routing-it-to-the-full-suite-2026-10-20,
# found by the second independent reader of #527's patches on their rehearsal tree. Both pins below hash the
# WORKING TREE RAW (`hash-object --no-filters`), which is right and is what stops a clean filter making a
# doctored file read as committed. But a checkout whose bytes differ from its blobs BY DESIGN - made with
# core.autocrlf=true, core.eol, or a text, eol or working-tree-encoding attribute - is then refused at EXIT 1,
# the stop code, by the first pin that hashes a converted file. Measured by that reader: after
# `git -c core.autocrlf=true checkout -- gates/verify-log.sh`, `git status` is CLEAN, `git hash-object` returns
# the HEAD blob and `git hash-object --no-filters` returns another, so the pin refuses an honest tree.
# EXIT 1 READS LIKE TAMPERING AND THIS IS NOT TAMPERING. The honest answer for a checkout the fast tier cannot
# compare byte for byte is the one the whole tier is built around: pay the full suite. So this asks the question
# BEFORE the pins and routes to exit 2 with the reason named.
# IT IS A NO-OP ON AN HONEST TREE, measured on this one before it was written rather than assumed: no
# core.autocrlf and no core.eol are set, there is no .gitattributes at all, and `git ls-files --eol` over the
# 549 tracked paths of gates/, app.js, chess.jsx and claude/ reports ZERO index-versus-worktree differences and
# ZERO non-empty attributes. So this cannot fire here today, which is why it is safe to put in front of the pins.
# NO PIPELINE INTO AN EARLY-EXITING READER: awk reads to EOF and limits what it PRINTS, so there is no SIGPIPE -
# the class gates/gatemanifest.sh's own audit exists to refuse.
CONVWHY=""
CAC="$($GIT config --get core.autocrlf 2>/dev/null || true)"
case "$CAC" in true|input) CONVWHY="core.autocrlf=$CAC";; esac
CEOL="$($GIT config --get core.eol 2>/dev/null || true)"
case "$CEOL" in crlf|native) CONVWHY="${CONVWHY:+$CONVWHY; }core.eol=$CEOL";; esac
# ── THE INDEX-VERSUS-WORKTREE EOL COMPARISON IS WITHDRAWN FROM THIS TEST, AND ITS OWN HARNESS CAUGHT WHY.
# The first version of this check also routed to FULL when `ls-files --eol` showed i/ and w/ disagreeing on any
# tracked path. That is a CONTENT-DIFFERENCE signal, not a conversion signal, and the two must not be confused
# here: case H30 plants a modified file and hides it with `git update-index --assume-unchanged`, which is
# TAMPERING and must be REFUSED at exit 1 by the pins below - and the eol arm fired on it first and sent it to
# exit 2 instead. H30 went FAIL ("a route hid the change and was NOT refused: assume-unchanged(exit 2)") on the
# first harness run after this check landed. A guard that converts a refusal into a routing decision is worse
# than the false refusal it was written to remove.
# SO THE TEST IS NOW ONLY WHAT A CONVERSION IN FORCE ACTUALLY LOOKS LIKE: the two config keys, and a DECLARED
# attribute. Attributes come from .gitattributes and not from file content, so no doctored file can set one.
CONVROWS="$($GIT -c core.quotePath=false ls-files --eol -- gates app.js chess.jsx claude 2>/dev/null \
  | awk 'BEGIN{n=0} {a=substr($3,6); if (a!="") {n++; if (n<=3) print "    " $0}}')"
if [ -n "$CONVROWS" ]; then
  CONVWHY="${CONVWHY:+$CONVWHY; }an eol, text or working-tree-encoding attribute on a tracked path"
fi
if [ -n "$CONVWHY" ]; then
  say ""
  say "FULL SUITE REQUIRED - a line-ending or encoding CONVERSION is in force for this checkout ($CONVWHY)."
  say "    The raw-byte pins below would compare converted working-tree bytes against unconverted blobs and"
  say "    REFUSE an honest tree at exit 1, which reads like tampering and is not. The honest answer for a"
  say "    checkout this tier cannot compare byte for byte is to pay the full suite. [#530]"
  [ -n "$CONVROWS" ] && printf '%s\n' "$CONVROWS" | tee -a "$LOG"
  exit 2
fi

# ── #530 N3. A FILE THE COMMIT DOES NOT HOLD MAY NOT STEER A RATCHET ────────────────────────────────────────
# jobs/an-untracked-file-hidden-by-info-exclude-steers-the-records-ratchet-of-fastgate-past-every-raw-byte-guard-2026-10-20,
# found by the second independent reader of #527's patches from the shipped-surface door.
# THE HOLE. The catch-all hashes every TRACKED file raw, and the dirty check reads `git status`. Two checks this
# tier runs read files STRAIGHT OFF DISK, untracked ones included: `gates/verify-log.sh --citations` globs
# claude/stories/*.md, gates/*.js, gates/*/*.js, HANDOFF.md and CLAUDE.md, and gates/control-audit.js reads
# claude/agents/gatelogs and gates/regress. An untracked file placed in those globs AND matched by
# .git/info/exclude is in NEITHER `git status` NOR `git ls-files`, so the dirty check and the catch-all both
# pass and it feeds the ratchet. The reader measured it: an excluded gates/zz-rev-evil.js naming a dead gate log
# turned an honest register-only commit from FAST GATE GREEN to FAST GATE RED (19 -> 20 dead paths). Not shown
# in the dangerous direction, and the reader named the route for that too: control-audit.js audits the
# HIGHEST-NUMBERED log that passes verify-log.sh, so an untracked claude/agents/gatelogs/999999-all.log would be
# chosen over the real top log. 366428f reads the same files, so this is not new at #527.
# THE FIX: list the untracked files, IGNORED ONES INCLUDED, inside exactly those path sets, and route to the
# full suite naming them. A verdict about a commit may not be computed from a file the commit does not hold.
#
# THE PATHSPECS CARRY `:(glob)` AND THAT IS LOAD-BEARING, NOT TIDINESS. Git's default pathspec `*` MATCHES
# ACROSS `/`, while the shell globs verify-log.sh actually uses do not. Measured here before the scan was
# written: `git ls-files --others -- 'gates/*.js'` returns 68 paths - every .js under gates/node_modules - and
# the same pathspec as `:(glob)gates/*.js` returns 0. Without the magic this guard would fire on every honest
# run over ignored dependency files, and a guard that fires on the normal case gets switched off, which is this
# project's own recorded reason for `--this-bundle` being opt-in. fastgate.sh's own read pin already uses
# `:(glob)` for exactly this.
# MEASURED NO-OP ON AN HONEST TREE: all six sets report 0 untracked-including-ignored paths on this checkout.
OSPECS=(':(glob)claude/stories/*.md' ':(glob)gates/*.js' ':(glob)gates/*/*.js' ':(glob)HANDOFF.md' \
        ':(glob)CLAUDE.md' ':(glob)claude/agents/gatelogs/*' ':(glob)gates/regress/*.js')
# --others with NO --exclude-standard, so an .gitignore'd or .git/info/exclude'd file is LISTED: hiding is the
# whole mechanism. awk reads to EOF and only limits what it prints, so there is no early-exit pipeline here.
OSTEER="$($GIT -c core.quotePath=false ls-files --others -- "${OSPECS[@]}" 2>/dev/null \
  | awk 'BEGIN{n=0} {n++; if (n<=5) print "    " $0} END{if (n>5) print "    ... and " (n-5) " more"}')"
if [ -n "$OSTEER" ]; then
  say ""
  say "FULL SUITE REQUIRED - there are UNTRACKED files (ignored ones included) inside the path sets this tier's"
  say "    checks read off disk. gates/verify-log.sh --citations and gates/control-audit.js read these globs"
  say "    directly, so such a file steers a ratchet whose verdict is about the COMMIT - and an excluded one is"
  say "    in neither git status nor git ls-files, so the dirty check and the raw-byte catch-all both pass it."
  say "    A verdict about a commit may not be computed from a file the commit does not hold. [#530]"
  printf '%s\n' "$OSTEER" | tee -a "$LOG"
  exit 2
fi

TAMPER=""
for f in gates/records-gate.sh gates/gatemanifest.sh gates/verify-log.sh gates/control-audit.js \
         gates/buildnum.sh; do   # buildnum.sh added #523: Part 2 EXECUTES it from the working tree
  hb="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || echo MISSING)"
  wb="$($GIT hash-object --no-filters "$ROOT/$f" 2>/dev/null || echo MISSING)"   # #527: RAW bytes, see below
  [ "$hb" = "$wb" ] || TAMPER="$TAMPER    $f: commit $hb, working tree $wb\n"
done
if [ -n "$TAMPER" ]; then
  say ""
  say "FAST GATE REFUSED - this tier EXECUTES these files from the working tree while every verdict it prints is"
  say "about the COMMIT, and for these the two are not the same object:"
  printf "$TAMPER" | tee -a "$LOG"
  say "A clean git status cannot see this: index flags and clean filters both suppress it. Run FULL."   # #527
  exit 1
fi

# -- AND WHAT IT READS A VERDICT OUT OF. ADDED #527, PART 3 OF THE STAMP JOB. ---------------------------------
# jobs/the-tier-guards-what-it-executes-but-not-what-it-reads-2026-10-14. The loop above pins the files this
# tier EXECUTES. Two of its verdicts are READ out of working-tree files instead: control (g) greps gate 49's
# stamp regex out of gates/regress/49-home.js, and the premise check greps every file of PSCAN for require()
# and path.join. Under the same two index flags a working-tree copy that differs from the commit let control
# (g) print CONTAINED and the premise print covered, both about a tree that is not the one being gated:
# gates/fastgate-drive.sh H10 and H11 drive both, and both took EXIT 0 FAST GATE GREEN on #526's script.
# THE SET IS NOT A SECOND LIST. PSCAN_PATS is the one definition: the premise check expands it into PSCAN, and
# this loop hands the same patterns to `git ls-files`, so the two cannot drift. #490 recorded at the premise
# check that a second hand-written list is the defect, whatever its patterns say. The files come from the
# INDEX and not from a glob of the working tree, so a tracked file deleted on disk is MISSING here rather than
# silently absent; the dirty check above has already shown the index to be the commit.
# BOTH PINS HASH WITH --no-filters [#527, an independent reviewer's finding]. `git hash-object` applies a clean
# filter unless told not to, and a filter declared in .git/info/attributes, which git never tracks, can turn a
# changed file into the committed blob for `git status` and for this comparison alike, whenever its pattern
# matches the ABSOLUTE path both loops hash: `**/gates/...` does and `gates/...` does not (measured, git 2.43.0).
# Raw bytes cannot be filtered. H10 drives that route for this pin and H32 for the one above, each declaring the
# `**/` form; with the plain form H10 could not fail, and a mutant of this loop without --no-filters survived it.
# This repository declares no filter and no eol conversion, and the routine's container sets no core.autocrlf, so
# no honest verdict moves THERE. A checkout made with core.autocrlf=true or an eol attribute holds bytes that are
# not its blobs by design, and is REFUSED at exit 1 by the first pin that hashes a converted file (an independent
# reader measured it with `git -c core.autocrlf=true checkout`): a false refusal, the safe direction, and such a
# checkout takes the full suite by hand. Routing it to exit 2 instead is filed, not done here.
# It is a no-op on an honest tree, like the loop above, and an empty set is reported, never credited.
PSCAN_PATS='regress/*.js mountcheck.js lib.js engine-extract.js drive/*.js'
read -r -a PSCAN_ARR <<< "$PSCAN_PATS"
PSPECS=(); for p in "${PSCAN_ARR[@]}"; do PSPECS+=(":(glob)gates/$p"); done
RSET="$($GIT -c core.quotePath=false ls-files -- "${PSPECS[@]}" 2>/dev/null)"   # v4: raw names, as the catch-all lists them
READPIN=""; RN=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  RN=$((RN+1))
  hb="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || echo MISSING)"
  wb="$($GIT hash-object --no-filters "$ROOT/$f" 2>/dev/null || echo MISSING)"
  # v4: a name the commit cannot resolve is a refusal, never MISSING = MISSING credited as a match
  [ "$hb" != MISSING ] && [ "$hb" = "$wb" ] || READPIN="$READPIN    $f: commit $hb, working tree $wb\n"
done <<< "$RSET"
if [ "$RN" = 0 ]; then
  say ""
  say "FULL SUITE REQUIRED. The read pin found NO tracked file matching PSCAN_PATS ($PSCAN_PATS), so it pinned"
  say "    nothing, and an empty set is reported, never credited. The tiered gate is not taken."
  exit 2
fi
if [ -n "$READPIN" ]; then
  say ""
  say "FAST GATE REFUSED - this tier READS a verdict out of these files (control (g) and the premise check) while"
  say "every verdict it prints is about the COMMIT, and for these the two are not the same object:"
  printf '%b' "$READPIN" | tee -a "$LOG"
  say "A clean git status cannot see this: index flags and clean filters both suppress it. Run FULL."
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

# ── IN-SHELL LIST MEMBERSHIP AND FIRST LINE. ADDED #525. NO PIPE, SO NO SIGPIPE AND NO pipefail RACE. ────────
# THE DEFECT THIS CLOSES, found on the held #524 tree by an independent reviewer (its finding F1) and
# REPRODUCED by the orchestrator at 11:35pm ET, Thu 15 Oct: the register plausibility arm below was entered
# only if `printf '%s\n' "$CHANGED" | grep -qxF 'gates/build-numbers.tsv'`, and this script runs under
# `set -uo pipefail` (:48). Once the changed-path list exceeds the 64 KiB pipe buffer, grep -q EXITS AT ITS
# FIRST MATCH, printf takes SIGPIPE, the PIPELINE status becomes 141, the test reads FALSE, and the WHOLE
# register arm - every exit 1 refusal in it - is skipped WITHOUT A WORD.
# MEASURED, control and test: one hand-written `999 minted` row on its own is REFUSED (exit 1, "gains a row
# the series cannot carry"); the SAME row in a commit that also adds 4000 empty files under zzz/ takes EXIT 0
# FAST GATE GREEN at 4001 changed paths, and `gates/buildnum.sh next` in that tree then exits 2 for every
# later build - which burns the number range permanently, because the register is append-only. The reviewer
# measured the bare pipeline losing the race 3 of 5 times at 3000 paths and 5 of 5 at 5000; 2000 and 2500
# were refused, so the threshold on that machine lies between 2500 and 3000.
# IT IS A FALSE GREEN AND NOT A FALSE REFUSAL, which is what makes it a P0: the direction of the failure is to
# SKIP a refusal, so THE BIGGER THE COMMIT THE WEAKER THE GATE, and one bulk records commit reaches it by
# ACCIDENT, not only on purpose.
# WHY A `case` AND NOT A BIGGER BUFFER OR `|| true`: a quoted `case` has no pipe to break, so the class is
# REMOVED rather than made less likely. `|| true` would mask a real failure and leave the race in place.
# WHY A FUNCTION AND NOT A THIRD HAND-WRITTEN `case`: the BNRATCHET site below already carries exactly this
# fix, and its own comment tells the story - this site was not swept, so A FIX RECORDED IN ONE HOME DID NOT
# TRAVEL TO THE NEXT [CLAUDE.md records that trap by name]. One function is the only form that travels.
# THE NEWLINE PADDING IS LOAD-BEARING: an unpadded substring match would accept `x/gates/build-numbers.tsv`
# and `gates/build-numbers.tsv.bak`, which is exactly what the `-x` of the old grep was buying.
NL_525='
'
in_changed(){ # <path>: 0 if $CHANGED carries it as a WHOLE LINE. Pipe-free, so payload-independent.
  case "$NL_525$CHANGED$NL_525" in *"$NL_525$1$NL_525"*) return 0 ;; esac
  return 1
}
# first_line <text>: the text up to its first newline. Replaces `<producer> | head -1`, where head exits early
# and SIGPIPEs a producer still reading a large file (app.js is about 1 MB). THE VALUE WAS ALWAYS RIGHT at
# those three sites - head prints the first line before it goes - so this is HARDENING and I claim no measured
# false verdict for it. It is done anyway because the P0 above proves the shape is not safe by inspection, and
# because two of the three sit in plaus_stamp and plaus_delta, which decide whether a push is refused.
first_line(){ printf '%s' "${1%%"$NL_525"*}"; }

# ── BUNDLE IDENTITY. MEASURED, NOT INFERRED FROM THE PATH LIST. ─────────────────────────────────────────────
# Every file GitHub Pages actually serves, compared by blob id at base and at head. A rename, a delete, a mode
# change or a content change all move the blob id or remove the object, and any of those sends you to the full
# suite. This is the premise stated as a measurement, and it does not care how the path list was computed.
SHIPPED="app.js lessons.js sw.js stockfish-18-lite-single.js index.html privacy.html terms.html refund.html delete-account.html chess-tracker.html"
BUNDLEDIFF=""     # any served file other than app.js whose blob moved -> always FULL
APPDIFF=""        # app.js specifically, which may be stamp-only (see STAMP-ONLY below)
for f in $SHIPPED; do
  b="$($GIT rev-parse --quiet --verify "$BASEFULL:$f" 2>/dev/null || echo MISSING)"
  h="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || echo MISSING)"
  [ "$b" = "$h" ] && continue
  if [ "$f" = app.js ] && [ "$b" != MISSING ] && [ "$h" != MISSING ]; then
    APPDIFF="app.js (base ${b%% *} -> head ${h%% *})"
  else
    BUNDLEDIFF="$BUNDLEDIFF$f (base ${b%% *} -> head ${h%% *})\n"
  fi
done
if [ -n "$BUNDLEDIFF" ]; then
  say ""
  say "FULL SUITE REQUIRED. A shipped file is not byte-identical to the base:"
  printf "$BUNDLEDIFF" | sed 's/^/    /' | tee -a "$LOG"
  say "MISSING on the head side means the commit DELETED or RENAMED a file the site serves."
  exit 2
fi

# ── STAMP-ONLY. THE ONE NARROW EXEMPTION, STATED POSITIVELY, WITH ITS CONTROLS WIRED IN. ────────────────────
# jobs/the-tier-check-compares-a-stamped-bundle-so-no-rebuild-is-ever-byte-identical-2026-10-10, band 17,
# Kunal's own override. THE DEFECT: gates/build.sh embeds the build stamp via --define:__BUILD__="\"$STAMP\"",
# and esbuild substitutes it at THREE sites, so a rebuild NEVER produces a byte-identical app.js even when not
# one line of application logic changed. Measured at #510: this check returned GO FULL naming app.js
# (0a2663582f2a -> ff6559a18078) while that same run's close-out independently recorded the app as
# byte-identical to main for the fifth consecutive build. BOTH were true - the tier compares a fresh rebuild
# with the new stamp in it, the close-out compares final states with the stamp on both sides. So the one lane
# paying the 84-minute suite was the one lane structurally excluded from the tier, because it rebuilds.
# THAT EXCLUSION IS REMOVED AT #521, AND THE SENTENCE THAT STOOD HERE IS WITHDRAWN [R18] - said at the top,
# because this header's own words were "this is the paragraph a reader takes the claim from". It read: "AND THAT
# EXCLUSION IS NOT REMOVED BY THIS CHANGE ... Minting is the OTHER condition and it is untouched: measured
# marginal 0 of 400 until part two lands." #521 IS that part two: gates/build-numbers.tsv is out of the shared
# FORCE arm, so a commit that rebuilt the bundle AND minted its number can reach this tier. Measured, each
# version's own classify() over origin/main's last 400 commits: main 162, this arm 181 pure, 191 with the
# stamp-only condition actually applied. The full statement, with the blocker census, the withdrawn figures and
# the residual the change leaves live, is at the FORCE loop.
#
# THE CONSTRUCTION IS INVERTED ON PURPOSE AND THIS IS THE WHOLE RISK OF THE CHANGE. The job says in terms: do
# NOT implement this as "normalise the stamp sites, then compare". Blanking bytes before a comparison is how a
# check goes green on evidence that was removed, and this project already has one - gates/audit/cited-not-run.sh
# went red to green on 2026-10-07 because a HANDOFF.md rewrite deleted the only citation of gates/shots476.js,
# so the file left the instrument's member set and the red cleared with nothing accounted for. A normaliser
# matching one byte more than the stamp would let a GENUINE app change read as identical and ship with ZERO
# browser gates run. Today's failure costs 84 wasted minutes; that failure ships a defect. So the test is
# POSITIVE: find the stamp occurrences, require EXACTLY THREE a side all equal to one another, then require
# that substituting the base stamp literal for the head stamp literal REPRODUCES THE HEAD BLOB BYTE FOR BYTE.
# A fourth differing byte anywhere makes the reconstruction unequal and forces FULL.
#
# THREE RESIDUALS, NAMED RATHER THAN IMPLIED [#514 blind pair]. (1) The predicate does not ask whether the new
# stamp is a PLAUSIBLE build: a LOWER build number and a nonsense date reachable through build.sh's unvalidated
# CT_STAMP_TIME are both accepted, measured at exit 0, and the length pin does not touch them because both are
# the same length. ITS STATED MITIGATION WAS THE SENTENCE THIS BUILD FALSIFIED, SO RESIDUAL (1) IS NOW LIVE AND
# IS RE-STATED AS SUCH [R18, #521 antagonist A]. The withdrawn mitigation read: "Impact is low for a structural
# reason rather than a lucky one - a REAL build also writes a gates/build-numbers.tsv row, which classify()
# FORCEs, so anything that genuinely rebuilt goes full anyway." #521 took that FORCE arm off, so a real build no
# longer goes full and the mitigation is void. A drove the consequence rather than arguing it: replacing all
# three stamps with "#001 - 2026-10-10 07:40 ET" - same length, lower number, a lie - plus an ordinary mint row
# takes EXIT 0 FAST GATE GREEN where main's script takes EXIT 2. WHAT IT COSTS, bounded honestly: no code byte
# moves, so no app defect reaches a player this way; what degrades is the three on-screen stamps and the
# provenance of every archived log and register row keyed on the number, and 49-home.js still passes because it
# asserts the FORMAT. The realistic accident is a wrong DATE through build.sh's unvalidated CT_STAMP_TIME rather
# than a wrong number. Named here as live rather than left described as structurally closed.
# AND SINCE #529 THAT ACCIDENT CANNOT REACH AN ISSUED BUNDLE [R18, jobs/a-wrong-build-stamp-can-reach-main-on-an-app-changing-build-because-build-sh-does-not-validate-ct-stamp-time-2026-10-16]:
# gates/build.sh now validates CT_STAMP_TIME before esbuild (the form, a real Eastern minute, not after the wall
# clock plus ten minutes, not before origin/main's stamp), and only a trial bundle under CT_OUT is let through.
# A hand edit of app.js can still write any stamp, which is what the plausibility arm below exists for.
# (2) This tier never calls gates/held.sh check, so nothing here asks whether the tree was one a previous run
# refused to ship. A raised it; B established it is STRUCTURALLY CLOSED rather than latent, and the reasoning
# is worth keeping: held.sh's sourceMd5 key reads chess.jsx, the exemption PROVES chess.jsx is unchanged (any
# chess.jsx in the diff exits 2 at classify) on a tree already proved clean, so held.sh would return the same
# source-key verdict here as on origin/main; only the bundle key moves, and held.sh itself declares that key
# useless across a rebuild. DELIBERATELY NOT ADDED: `held.sh check` exits 1 for HELD and 2 for usage, so a
# naive wiring re-creates the very refuse-instead-of-go-full bug arm 3 above exists to fix. Filed against the
# tier as a whole. (3) The marginal is zero today - see the FORCE loop below.
#
# IT FAILS SAFE IN EVERY DIRECTION, which is why the regex may be strict: a stamp that does not match (a
# five-digit build number, a changed stamp format), a count that is not three, two unequal stamps on one side,
# or one byte changed anywhere else all leave STAMPONLY empty and send the run to the full suite.
#
# WHY A STAMP-ONLY app.js CANNOT MOVE A GATE'S VERDICT. THE FIRST VERSION OF THIS PARAGRAPH WAS FALSE, BOTH
# ANTAGONISTS CAUGHT IT INDEPENDENTLY AT #514, AND IT HAD ALREADY BEEN PROMOTED INTO THE PRINTED LOG - which is
# worse than a wrong comment, because the log is the artefact that authorises a push [#450, #490].
# THE FALSE VERSION read "NO regress gate ASSERTS the stamp value - they reach it through L.note". MEASURED,
# `grep -n "L.say(" gates/regress/*.js` filtered on the stamp returns FIVE build-stamp ASSERTIONS:
#   42-home-devrow.js:104   the dev row sits ABOVE the build stamp               (GEOMETRY)
#   47-menu.js:263          TC-MN-007, reachable and HIT-TESTABLE                (GEOMETRY)
#   47-menu.js:342          a readout matching /build #/i                        (format)
#   49-home.js:551          TC-HM-021, near(bld.restTop, W.build.y, 1)           (GEOMETRY, 1px)
#   49-home.js:554          TC-HM-022, /^Build #\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET$/   (format)
# THE CORRECT ARGUMENT IS IN TWO HALVES AND BOTH ARE LOAD-BEARING:
#   FORMAT   49:554's regex is this script's own RE anchored with ^Build and $, so it accepts exactly what the
#            exemption accepts; 47:342 needs only the literal "build #". THAT AGREEMENT IS A CROSS-FILE
#            COUPLING AND CONTROL (g) ABOVE IS WHAT CHECKS IT - before #514 nothing did.
#   GEOMETRY 42:104, 47:263 and 49:551 read the stamp's rendered position. The LENGTH PIN is what holds them,
#            and the wrap margin measured at so_pred is why one character could not have moved them anyway.
# AND THE COUNT OF app.js READERS WAS WRONG TOO, with B's correction being larger and sharper than A's: THREE
# regress gates read app.js AS DATA (33-reproducible-review, 66-winprob-ladder, 67-sel-cls-consumers) and all
# three match MINIFIED CODE; 68-brilliant-sac-empty-square:53 reads it only to HASH it for a NOTE, and its own
# :55 says in terms that it "is NOT what this gate reads" while :30 says it measures chess.jsx - run against
# both bundles it is 78 pass / 0 fail with only that note line differing; and gates/lib.js:214 SERVES the
# bundle to all 58 browser gates. A stamp-only diff leaves every code byte identical, so the conclusion holds.
# WHAT COVERS mountcheck, SAID PROPERLY. The one real stamp assertion outside regress is mountcheck.js:15,
# conditional on CT_EXPECT. THIS TIER DOES NOT RUN MOUNTCHECK EITHER - gates.sh does, in full mode - so under
# the exemption a rebuilt bundle reaches main having been mounted in a browser by NOTHING AT ALL, and the #351
# white-screen guard never runs. What covers that is the BYTE PROOF, not another gate. The earlier sentence
# ("mountcheck is NOT one of the browser gates this tier skips") was true only on a technicality and is
# withdrawn: it sat in a paragraph reassuring the reader about the FAST path, where gates.sh is never invoked.

# ONE DEFINITION OF THE PREDICATE, CALLED BY THE LIVE PATH AND BY THE CONTROLS, so the two cannot drift. That
# is classify()'s own argument one block down ("two lists cannot drift when there is one list") applied here:
# a control that exercises a SECOND copy of the rule proves nothing about the copy that decides the push.
# latin1 maps every byte to one char, so every string operation is a BYTE operation and the reconstruction is
# exact; utf8 would re-encode and could not prove byte identity.
so_pred(){ node -e '
const fs=require("fs");
const RE=/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/g;
const b=fs.readFileSync(process.argv[1],"latin1"), h=fs.readFileSync(process.argv[2],"latin1");
const bm=b.match(RE)||[], hm=h.match(RE)||[];
const bail=(m)=>{console.log("NOT-STAMP-ONLY "+m);process.exit(1);};
if(bm.length!==3) bail("base app.js carries "+bm.length+" build stamps, not 3");
if(hm.length!==3) bail("head app.js carries "+hm.length+" build stamps, not 3");
const sb=bm[0], sh=hm[0];
if(!bm.every(x=>x===sb)) bail("the 3 base stamps are not identical to each other");
if(!hm.every(x=>x===sh)) bail("the 3 head stamps are not identical to each other");
// THE LENGTH PIN. PRECAUTIONARY, AND THE MECHANISM FIRST OFFERED FOR IT IS FALSIFIED - both halves said here,
// because publishing only the first would be the prose this project files against [#514 blind pair + cross-read].
// A (diff door) vetoed on the ground that a different-LENGTH stamp could move three GEOMETRY assertions:
// 42-home-devrow.js:104, 47-menu.js:263, and 49-home.js:551 which pins the stamps rest-top within ONE pixel.
// THAT MECHANISM DOES NOT OCCUR, measured from two doors rather than argued. B drove an adversarial bundle
// restamped one byte LONGER at se/kunal730/390/430 against mains bundle and a real rebuild: TC-HM-021 restTop
// 839/839/823.5/794.8 IDENTICAL on all three, TC-HM-022 PASS on all three, 49-home block C 16 pass / 0 fail
// each, Home innerText md5 799c0c91ce46 identical across nine runs, scrollWidth == innerWidth at 320, zero
// console errors; only the stamps own box moved, 227.94 -> 235.06px. A then measured WHY: all three assertions
// read VERTICAL quantities, so they move only if the line WRAPS, and at 320x568 the line is 227.94px in a
// 284px content box that first wraps at +8 CHARACTERS - while this regex bounds the delta to EXACTLY ONE
// character, every field being fixed-width but the 3-or-4-digit number. A margin of 8 against an excursion of 1.
// SO WHY KEEP IT, and the reason is Bs and not As: without the pin the accepted set is the ENTIRE LANGUAGE of
// the regex above, and a fast greens soundness then rests on 49-home.js:554s regex staying in step with this
// one - a cross-file coupling with nothing checking it. The pin makes the head a function of the base with one
// unknown and removes the coupling. ITS ONLY COST, stated so nobody discovers it later: the single
// #999 -> #1000 build pays a full suite it would not otherwise have paid, and it fails safe in that direction.
// NO APOSTROPHE MAY APPEAR ANYWHERE IN THIS NODE PROGRAM. It is passed as a single-quoted shell string, so
// one apostrophe terminates it and the rest is parsed as shell. My first draft of the message below wrote
// "the base" with a possessive and "49-home.js:554" with one, and every control failed with
// "line 243: the: command not found" - so_pred answered wrongly, control (a) reported it, and the script
// correctly REFUSED at exit 1 rather than deciding anything. The guard caught my own typo, which is the
// strongest evidence the arm distinction added at #514 is right: a lying instrument must refuse, not go full.
if(sb.length!==sh.length) bail("the head stamp is "+sh.length+" bytes and the base stamp "+sb.length
  +"; the accepted set must not widen to the whole regex language, because a fast green would then depend on"
  +" the regex in 49-home.js staying in step with this one, and nothing checks that");
const nb=b.split(sb).length-1;
if(nb!==3) bail("the base stamp literal occurs "+nb+" times as a literal, not 3");
if(b.split(sb).join(sh)!==h) bail("the differing bytes are NOT confined to the 3 stamp sites");
console.log("STAMP-ONLY 3 sites, base \""+sb+"\" -> head \""+sh+"\", "
  +Buffer.byteLength(b,"latin1")+" -> "+Buffer.byteLength(h,"latin1")+" bytes, identical elsewhere");
' "$1" "$2" 2>&1; }

# THE FOUR CONTROLS THE JOB MANDATES, AND THEY RUN ON EVERY INVOCATION RATHER THAN ONCE AT AUTHORING TIME.
# "An unproven control is not a control [R08]" - so if any of them gives the wrong answer this script REFUSES
# (exit 1) instead of deciding anything. BE PRECISE ABOUT WHICH RUN HERE: so_selftest runs the THREE fixture
# controls (a), (b) and (c); control (d), the #489 rename, is proved by the BUNDLE IDENTITY loop above, which
# sees app.js MISSING at head and exits 2 before this block is reached. The first draft of this comment said
# "all four" and claimed "0.4s", and BOTH were wrong [R18]: the fixtures are pure byte operations cut from the
# base's OWN app.js, needing no esbuild, no commit and no network, and they measure 165 ms (164/165/168 over
# three runs) against this script's own 7.0-7.5s end to end. That is why they can be unconditional, which is
# what the job asks for - and the figure is now one I took rather than one I estimated.
#   (a) POSITIVE  a different valid stamp at all three sites           -> STAMP-ONLY
#   (b) NEGATIVE  one meaningful byte changed OUTSIDE the stamp sites  -> NOT-STAMP-ONLY
#   (c) NEGATIVE  a byte changed INSIDE a stamp site to a non-stamp    -> NOT-STAMP-ONLY  (the loose-normaliser case)
#   (d) NEGATIVE  app.js absent at head, the #489 rename               -> handled by BUNDLE IDENTITY above,
#       NOT re-proved by a fixture here. app.js reads MISSING on one side, so the loop sends it to BUNDLEDIFF
#       and the tier exits 2 before this block runs. The guard is STRUCTURAL, not a sample. This line said
#       "re-proved here" until #514 re-read its own comment: grep 'CONTROL (' returns a, b, c, f, g and no d,
#       so it contradicted the prose four lines above, which was already correct. a5ccbe6 fixed the "all four"
#       overclaim in the PROSE and left it standing in the TABLE - one claim, two homes, one fixed [#493].
so_selftest(){
  local D RC OUT FAILED=0
  SO_FIXWHY=""
  D="$(mktemp -d)" || { say "FAST GATE REFUSED - mktemp -d failed, so the stamp-only controls could not run."; exit 1; }
  FG_TMPS+=("$D" "$D.why")   # #527: removed by the EXIT trap on every path, as well as below
  if ! $GIT cat-file blob "$BASEFULL:app.js" > "$D/base" 2>/dev/null || [ ! -s "$D/base" ]; then
    rm -rf "$D"; return 2   # no base app.js to cut fixtures from; caller decides
  fi
  node -e '
const fs=require("fs");
const RE=/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/g;
const D=process.argv[1];
const b=fs.readFileSync(D+"/base","latin1");
const m=b.match(RE)||[];
if(m.length!==3){console.error("FIXTURE-UNAVAILABLE base carries "+m.length+" stamps, not 3");process.exit(3);}
// THE POSITIVE FIXTURE MUST BE THE SAME LENGTH AS THE BASE STAMP, AND ITS WIDTH IS DERIVED, NOT HARD-CODED.
// My first draft hard-coded a 4-digit "#9999 - ..." here, which is 27 bytes against a 3-digit base of 26, so
// the length pin added at #514 REJECTED the positive fixture and control (a) failed on every run - and the
// script correctly refused at exit 1 rather than deciding. Deriving the width keeps (a) valid when build
// numbers reach 4 digits, which is the frozen-literal trap this project files against.
const sb=m[0];
const W=(sb.match(/^#(\d+)/)||[0,"000"])[1].length;
const sh="#"+"9".repeat(W)+" - 2099-01-01 00:00 ET";                     // same length as sb by construction
const a=b.split(sb).join(sh);
fs.writeFileSync(D+"/a",a,"latin1");                                     // (a) stamp-only, SAME length
const i=b.indexOf("createRoot");                                         // (b) a real code site, not padding
if(i<0){console.error("FIXTURE-UNAVAILABLE no createRoot in base");process.exit(3);}
fs.writeFileSync(D+"/b",a.slice(0,i)+"createRoo7"+a.slice(i+10),"latin1");
const j=a.indexOf(sh);                                                   // (c) inside a stamp site
fs.writeFileSync(D+"/c",a.slice(0,j)+"#999X"+a.slice(j+5),"latin1");
// (f) ONE CHARACTER LONGER AND STILL WELL-FORMED. Only available while the base is 3 digits, because the
// regex tops out at 4: at W=4 no LONGER stamp is still valid, so the fixture is not written and the control
// below says so explicitly rather than passing over a file that is not there [non-empty denominator].
if(W<4) fs.writeFileSync(D+"/f",b.split(sb).join("#"+"9".repeat(W+1)+" - 2099-01-01 00:00 ET"),"latin1");
' "$D" > "$D.why" 2>&1 || { SO_FIXWHY="$(cat "$D.why" 2>/dev/null)"; rm -f "$D.why"; rm -rf "$D"; return 3; }
rm -f "$D.why"
  # (a) must be STAMP-ONLY
  OUT="$(so_pred "$D/base" "$D/a")"; RC=$?
  [ "$RC" = 0 ] || { say "    CONTROL (a) FAILED - a stamp-only rebuild was not recognised: $OUT"; FAILED=1; }
  # (b) must NOT be
  OUT="$(so_pred "$D/base" "$D/b")"; RC=$?
  [ "$RC" != 0 ] || { say "    CONTROL (b) FAILED - one changed code byte outside the stamps read as stamp-only: $OUT"; FAILED=1; }
  # (c) must NOT be
  OUT="$(so_pred "$D/base" "$D/c")"; RC=$?
  [ "$RC" != 0 ] || { say "    CONTROL (c) FAILED - a non-stamp byte inside a stamp site read as stamp-only: $OUT"; FAILED=1; }
  # (f) a WELL-FORMED stamp one character LONGER must be refused by the length pin
  if [ -f "$D/f" ]; then
    OUT="$(so_pred "$D/base" "$D/f")"; RC=$?
    [ "$RC" != 0 ] || { say "    CONTROL (f) FAILED - a longer valid stamp read as stamp-only: $OUT"; FAILED=1; }
  else
    say "    CONTROL (f) DID NOT RUN - the base stamp is already 4 digits, so no LONGER well-formed stamp"
    say "        exists for the regex to accept. Reported, not credited as a pass."
  fi
  rm -rf "$D"
  # ── (g) THE CROSS-FILE REGEX COUPLING. ANTAGONIST B's P1-2 AT #514, BUILT A's THREE WAYS. ──────────────────
  # WHY IT EXISTS. The conclusion a fast green prints - that no gate's verdict can differ - survives only
  # because gates/regress/49-home.js:554 ASSERTS the stamp with a regex that happens to be this script's own,
  # anchored with ^Build and $. That is a coupling across two files with NOTHING CHECKING IT: tighten 49-home's
  # pattern (a plausible-date check, an exact-text pin) and the printed sentence silently becomes a lie. B
  # called it the eleventh-costume trap with the roles swapped - the check's stated REASON and the thing being
  # checked had become the same regex.
  # BUILT THE THREE WAYS A PRESCRIBED, because the obvious version is circular:
  #   (i)   FIXTURE-DRIVEN, never a comparison of the two patterns as TEXT. Comparing pattern source is the
  #         brittle version and tells you nothing about the language either accepts.
  #   (ii)  CONTAINMENT, not equality: the relation that must hold is "every stamp so_pred accepts, 49-home
  #         accepts". Equality would go RED on a legitimate tightening of this script's own regex.
  #   (iii) EXTRACTION FAILURE IS A HARD RED. If a refactor moves 49-home's literal into a const, the grep
  #         returns nothing and a naive control would pass over an EMPTY SET - the non-empty-denominator trap
  #         this project records eleven times, and #490's premise check written in the vocabulary of the thing
  #         it checks. So an empty extraction FAILS, and so does a fixture set nothing accepts.
  # ITS LIMIT, STATED BESIDE IT: it covers gate 49 only. 42:104 and 47:263 involve no regex at all; what makes
  # those safe is the LENGTH PIN and the wrap margin recorded at so_pred, not any pattern agreement.
  HOMERE="$(first_line "$(grep -oE '\^Build #[^/]*\$' "$G/regress/49-home.js" 2>/dev/null || true)")"   # #525: no `| head -1`
  if [ -z "$HOMERE" ]; then
    say "    CONTROL (g) FAILED - could not extract 49-home.js's stamp regex, so the containment this script"
    say "        prints as its soundness argument is UNCHECKED. That is a hard red, not a skip [(iii)]."
    FAILED=1
  else
    OUT="$(node -e '
const theirs=new RegExp(process.argv[1]);
const mine=/^#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET$/;
const F=["#511 - 2026-10-10 07:40 ET","#1000 - 2026-10-11 01:11 ET","#511 - 2099-99-99 99:99 ET",
         "#99 - 2026-01-01 00:00 ET","#51100 - 2026-01-01 00:00 ET","Build #511 - 2026-10-10 07:40 ET",""];
let acc=0, bad=[];
for(const f of F){
  const m=mine.test(f);
  if(m){ acc++; if(!theirs.test("Build "+f)) bad.push(f); }
}
if(acc===0){ console.log("VACUOUS the fixture set contains no stamp this script accepts, so containment is untested"); process.exit(1); }
if(bad.length){ console.log("NOT-CONTAINED 49-home rejects "+bad.length+" stamp(s) this exemption accepts: "+JSON.stringify(bad)); process.exit(1); }
console.log("CONTAINED "+acc+" of "+F.length+" fixtures are accepted here and all are accepted by 49-home.js");
' "$HOMERE")"; RC=$?
    [ "$RC" = 0 ] || { say "    CONTROL (g) FAILED - $OUT"; FAILED=1; }
  fi
  [ "$FAILED" = 0 ] || return 1
  return 0
}

# ── PART 2, THE PLAUSIBILITY ARM. ADDED #523. ───────────────────────────────────────────────────────────────
# WHY IT EXISTS, AND IT IS RESIDUAL (1) OF THIS SCRIPT'S OWN HEADER BEING CLOSED RATHER THAN RE-DESCRIBED.
# so_pred above proves the head bundle differs from the base BY ITS THREE BUILD STAMPS AND NOTHING ELSE. It
# never asks whether the new stamp is a PLAUSIBLE build, so three wrong inputs took EXIT 0 FAST GATE GREEN on
# origin/main at 7b2f5b9, measured by the orchestrator and reproduced by this run's own harness: a same-length
# stamp with a LOWER number (#001), the same with a date five years ahead, and a stamp with no register row.
# The residual's stated mitigation - that a real build also writes a gates/build-numbers.tsv row and a register
# row FORCED the full suite - was void from #521, which took the register out of the FORCE arm.
#
# THE BOUNDS COME FROM SOURCES THAT ARE NOT UNDER TEST [R08 sibling clause]: the margin is read out of
# gates/buildnum.sh rather than copied, the wall clock is read from the machine, and the second witness is the
# register, which is a DIFFERENT file from the bundle being judged. Both witnesses are required, not either.
#
# MEASURED FIRST, OVER HISTORY, AND THE DENOMINATOR IS THE PART THAT MATTERS [Part 2(e)].
# Over all 1204 commits on origin/main at 7b2f5b9 in a COMPLETE clone (git rev-parse --is-shallow-repository
# false, so these are counts and not floors): 550 commits touch app.js; 43 of those have a STAMP-ONLY app.js
# diff by so_pred's own predicate extracted verbatim; and only TEN of the 43 would ever REACH this arm, because
# the other 33 carry some path classify() calls FORCE and exit before the stamp block. Over those ten:
#   number step      +1 nine times, +2 once. Never negative, never above +2, against a margin of 10.
#   stamp date       always later than the base stamp.
#   built-row lag    EXACTLY 0 minutes on all ten, and 0 on #522 - the stamp and the row are two clock reads
#                    seconds apart (gates/build.sh:114 and gates/buildnum.sh:523), so they share a minute.
#   register match   10 of 10 carry exactly ONE `built` row for the stamp number whose bundle field equals the
#                    first 12 hex of the md5 of that commit's own app.js. So rule (b) refuses none of history.
# ZERO UNEXPLAINED VIOLATIONS. Three commits violate these rules over the WIDER stamp-only population of 43 and
# all three are explained and none reaches this arm: 364f7009 is the deliberate "Revert main to #439" and
# a3368361 is "#510 veto fixes", which walks the bundle back #510 -> #508 - both also touch a FORCE path
# (chess.jsx, gates/audit/, gates/pending/), and b88f1c8 is #522's own real rebuild, +11 over a base stamp of
# #511 because #512 to #521 shipped no app change, which is NOT stamp-only either. The lesson in one line: the
# base stamp number is the number of the last commit that CHANGED app.js, not the previous build, so a step
# larger than the margin is reachable. THIS LINE USED TO END "reachable only through a real rebuild, which never
# gets here", AND THAT WAS FALSE [#529]: after held mints a real rebuild does get here, and it went FULL. The step
# is now measured from the higher of the base stamp and the base series top (see plaus_pred, and H33).
#
# EQUALITY IS ALLOWED, AND THAT IS A MEASUREMENT AND NOT A COURTESY. The job offered strict increase "unless
# measured history shows equal number rebuilds landing on main". It does: 11 of the 43 stamp-only commits carry
# the SAME number on both sides (#511 -> #511, #508 -> #508, #497 -> #497 twice, #491, #474, #471, #465, #451
# twice, #436, #434). CLAUDE.md gives the mechanism - the stamp embeds the MINUTE, so a rebuild in a new minute
# from byte-identical source is a new bundle under one number. Requiring hn > bn would refuse that class.
#
# FAIL-SAFE DIRECTION, KEEPING THIS SCRIPT'S OWN EXIT CONVENTION (lines 433-450 give the reason):
#   an IMPLAUSIBLE stamp          -> exit 2, GO FULL. The commit belongs in the suite; it is not a liar.
#   a check that COULD NOT RUN    -> exit 2, GO FULL, with the reason through say() so it reaches the log.
#   a STRAY REGISTER ROW          -> exit 1, REFUSED. The register is append-only, so a bad row cannot be taken
#                                    back out once it lands, and exit 2 would route it into a suite that does
#                                    not check the register at all. Measured, not assumed: gates/gates.sh and
#                                    gates/records-gate.sh were both read for this, and NEITHER runs
#                                    buildnum.sh next nor any series check, so the full suite would land it.
PLAUS_WHY=""
plaus_stamp(){ first_line "$(grep -aoE '#[0-9]{3,4} - 20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} ET' "$1" 2>/dev/null || true)"; }   # #525: no `| head -1`
# THE MARGIN IS READ, NOT COPIED. A second copy of a constant is the defect this project keeps filing, so this
# greps gates/buildnum.sh for its own default and honours the same BUILDNUM_MAX_DELTA override buildnum.sh does.
# AND IT SAYS WHERE THE NUMBER CAME FROM [#524, antagonist A finding 6]. The margin honours
# BUILDNUM_MAX_DELTA, which is correct - buildnum.sh honours it too - but NOTHING in any verdict said the
# number had been overridden, so `BUILDNUM_MAX_DELTA=1000 gates/fastgate.sh` printed "past the series margin
# of 1000 that gates/buildnum.sh itself uses", naming the wrong author for the bound and asserting a
# provenance that was false. An environment variable that widens a push gate must appear in the artefact the
# push is justified by. PLAUS_DELTA_SRC carries it; the two places the margin is DECISIVE both print it.
# IT SETS TWO GLOBALS AND ECHOES NOTHING, AND THAT IS THE WHOLE FIX [#524 second pass, VETOED BY BOTH
# ANTAGONISTS INDEPENDENTLY - A from the diff door, B from the shipped surface, which is the strongest signal
# this process produces]. The previous version set PLAUS_DELTA_SRC and then ECHOED the number, and both call
# sites read it as `D="$(plaus_delta)"` - a COMMAND SUBSTITUTION, i.e. a subshell - so every assignment died
# with the subshell and all three readers saw the empty string from the initialiser.
# B's one-line proof of the mechanism, which is the clearest statement of it:
#     $ bash -c 'X=""; f(){ X="set by f"; printf "%s" 7; }; V="$(f)"; echo "V=$V  X=[$X]"'
#     V=7  X=[]
# MEASURED CONSEQUENCE, and it is a REGRESSION rather than merely a dead fix: the normal fast-green path -
# every stamp-only bundle push - printed `(step 3, margin 1000 [])`, and the margin refusal printed `past the
# series margin of 10 []`. Before #524 those read `margin 10` and `past the series margin of 10 that
# gates/buildnum.sh itself uses` (`git show d7e6f8a^:gates/fastgate.sh`, lines 500 and 541). So a correct
# sentence was traded for an empty bracket, on the artefact a push is justified by. A's finding 6 complained
# that the margin's AUTHOR was misattributed when an override was live; my repair made the field mute in every
# case, which is worse.
# AND THE THIRD READER NAMED THE WRONG CAUSE: the register arm's `${PLAUS_DELTA_SRC:-BN_DEFAULT_DELTA could
# not be read...}` fallback fired on a NON-NUMERIC OVERRIDE and blamed buildnum.sh, which had been read fine.
# CLAUDE.md: "A wrong reason that reaches the right verdict is a trap, not a check."
# NOTHING CONTROLLED IT. `grep -c 'OVERRIDDEN by' gates/fastgate-drive.sh` was 0, and H17 passes on a
# DIFFERENT mechanism - the separate RP_DEF block in the register arm, which re-greps buildnum.sh in the
# parent shell - so the harness was green over a dead mechanism. H21 below is the control, and it asserts the
# bracket's CONTENT on the green path, which is the path that regressed.
PLAUS_DELTA=""
PLAUS_DELTA_SRC=""
plaus_delta(){           # sets PLAUS_DELTA and PLAUS_DELTA_SRC in THIS shell; returns 0 ok, 1 unreadable
  local d b
  b="$(first_line "$(sed -n 's/^BN_DEFAULT_DELTA=\([0-9][0-9]*\).*/\1/p' "$G/buildnum.sh" 2>/dev/null || true)")"   # #525: no `| head -1`
  PLAUS_DELTA=""
  if [ -z "$b" ]; then
    PLAUS_DELTA_SRC="gates/buildnum.sh carries no BN_DEFAULT_DELTA= line this script can read"; return 1; fi
  d="${BUILDNUM_MAX_DELTA:-$b}"
  # A WHOLE NUMBER FROM 1, NOT MERELY DIGITS [#524, antagonist B finding 2]. B swept the variable over one
  # HONEST records commit - a single `525 minted` row written by the real `buildnum.sh mint` - and measured
  # `BUILDNUM_MAX_DELTA=0` turning it into `FAST GATE REFUSED` (exit 1) with a reason that blamed the COMMIT:
  # "gates/build-numbers.tsv changed and gates/buildnum.sh next now REFUSES ... so this commit would wedge the
  # next mint". The commit wedges nothing; the caller's environment does, and prompts/build-run STEP 0F reads
  # exit 1 as STOP, so a stray variable stopped an honest push. buildnum.sh's own bound is 1..9999 and this
  # now matches it, so a 0 or a word is an ENVIRONMENT fault reported as a notice, never a refusal of the tree.
  # THAT SENTENCE WAS FALSE UNTIL #529 [R18, jobs/the-register-arm-of-fastgate-asks-buildnum-sh-next-under-the-callers-environment-so-an-unusable-margin-refuses-an-honest-mint-at-exit-1-2026-10-20].
  # It held for this function and not for the register arm, which went on asking gates/buildnum.sh next under
  # the caller's environment: buildnum.sh refuses 0 or a word before it reads the register, and the arm read
  # that refusal as a wedge, so an honest one-row mint commit like B's still took EXIT 1 under
  # BUILDNUM_MAX_DELTA=0 on 366428f and on #527's tree (measured). The arm now asks with the variable removed
  # whenever this function says the value is unusable: see UNDER ITS OWN DEFAULT in the register arm.
  # A LENGTH TEST BEFORE ANY NUMERIC ONE [#529, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16].
  # This read `[ "$d" -lt 1 ] || [ "$d" -gt 9999 ]` after a digits-only test, and on a twenty-digit value that
  # is not a comparison at all: test prints "integer expression expected", returns 2, and the if reads it as
  # false, so BUILDNUM_MAX_DELTA=99999999999999999999 was ACCEPTED as the margin (measured by calling this function
  # alone on #527's script: it returned 0 with the twenty digits as PLAUS_DELTA). gates/buildnum.sh
  # refuses the same value before any arithmetic with one case pattern, and this now uses that pattern: digits
  # only, no leading zero, at most four digits, which is exactly 1..9999 and leaves no numeric test to fail.
  case "$d" in ''|*[!0-9]*|0*|?????*)
    PLAUS_DELTA_SRC="BUILDNUM_MAX_DELTA is set to '${BUILDNUM_MAX_DELTA:-}', which is not a whole number from 1 to 9999 as gates/buildnum.sh requires (its own BN_DEFAULT_DELTA is $b); an environment fault, not a fault of the tree"; return 1 ;; esac
  if [ -n "${BUILDNUM_MAX_DELTA:-}" ] && [ "${BUILDNUM_MAX_DELTA:-}" != "$b" ]; then
    PLAUS_DELTA_SRC="OVERRIDDEN by BUILDNUM_MAX_DELTA=$BUILDNUM_MAX_DELTA in the environment; gates/buildnum.sh's own BN_DEFAULT_DELTA is $b"
  else
    PLAUS_DELTA_SRC="gates/buildnum.sh BN_DEFAULT_DELTA=$b"
  fi
  PLAUS_DELTA="$d"
  return 0
}
# ET -> UTC through the ZONE NAME, never an offset [R52]. AND NOT `TZ=... date -u`, WHICH IS THE TRAP I FELL
# INTO WHILE MEASURING THIS: -u makes GNU date parse in UTC as well as print in it, so the conversion silently
# becomes the identity and every lag reads exactly +240 minutes - the EDT offset wearing the mask of a result.
# The TZ="..." prefix INSIDE the -d string is parsed in that zone and is correct across the 1 November boundary.
plaus_et2utc(){ date -u -d "TZ=\"America/New_York\" $1" '+%Y-%m-%dT%H:%MZ' 2>/dev/null; }

# THE PREDICATE. ONE DEFINITION, CALLED BY THE LIVE PATH AND BY gates/fastgate-drive.sh THROUGH THE SCRIPT
# ITSELF, so there is no second copy of the rule to drift - classify()'s own argument applied again.
# Echoes a verdict line; returns 0 plausible, 1 refuse (stray row), 2 go-full (implausible or cannot run).
plaus_pred(){ # <base app.js> <head app.js> <head md5-12> <base register>
  local BA="$1" HA="$2" HM5="$3" BR="${4:-}" SB SH BNUM HNUM BDATE HDATE D NOW10 HUTC ROW RTIME HI STOP REF STEP STEPTXT RRUN OTH
  SB="$(plaus_stamp "$BA")"; SH="$(plaus_stamp "$HA")"
  if [ -z "$SB" ] || [ -z "$SH" ]; then
    PLAUS_WHY="could not read a build stamp from both sides (base '$SB', head '$SH')"; return 2; fi
  BNUM="${SB#\#}"; BNUM="${BNUM%% *}"; HNUM="${SH#\#}"; HNUM="${HNUM%% *}"
  BDATE="${SB#* - }"; BDATE="${BDATE% ET}"; HDATE="${SH#* - }"; HDATE="${HDATE% ET}"
  case "$BNUM$HNUM" in *[!0-9]*) PLAUS_WHY="a stamp number is not numeric (base $BNUM, head $HNUM)"; return 2 ;; esac
  plaus_delta || { PLAUS_WHY="the series margin is unknown: $PLAUS_DELTA_SRC"; return 2; }   # no subshell [#524]
  D="$PLAUS_DELTA"
  # THE STEP IS MEASURED FROM THE HIGHER OF THE BASE STAMP AND THE BASE SERIES TOP [#529, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16].
  # It was measured from the base STAMP alone. The base stamp is the number of the last commit that changed
  # app.js, and a held run mints without shipping, so main's register can sit many numbers above it (#523,
  # #524 and #525 did). An independent reviewer's input, 2 of 2: ten minted-only rows above #522, then the real
  # mint and record of #535 with app.js restamped, answered exit 2 "#535 is 13 above the base #522, past the
  # series margin of 10", a FALSE FULL that kept the fast path shut in exactly the state held mints create.
  # The series top is read from the BASE register with the register arm's own row filter (field 1 a bare number,
  # NF>=2; nine digits at most, so a planted giant row cannot raise it), so it is a number main already holds.
  # Using it loosens nothing the register arm checks: an appended number must still be contiguous with the
  # base top, so a stamp past the series still has no row to stand on. H33 is the case.
  # AND IT MUST NOT LOOSEN THE OTHER DIRECTION [R18, #529 review, an independent reviewer's F2]. Measuring from
  # the series top let through every number BELOW it as well as the one above it: over eleven minted-only rows
  # #527 to #537, each another run's, a restamp to #535 answered exit 0 with "step -2", where #527's script sent
  # the same commits to the full suite, and `buildnum.sh stampable 535` calls that number NOT STAMPABLE for the
  # restamping run. So a head number at or below the series top that is not the base stamp's own must be the
  # run's own by every register row for it, buildnum.sh stampable's rule, asked at (b2) below once the built row
  # that names this bundle is in hand: another run's number goes FULL (H44), the run's own passes (H45), the
  # run's own next mint passes (H33), and a rebuild under the base stamp's own number keeps the equality this
  # predicate has always allowed. [#529 second review, both reviewers' N1: the first form of this fix sent every
  # number inside the series FULL as "a number the register already issued, not a fresh mint", which is false
  # for a run whose mint reached main in an earlier push than its bundle; `buildnum.sh stampable` calls that
  # number the run's own.]
  STOP=0
  if [ -n "$BR" ] && [ -r "$BR" ]; then
    STOP="$(awk -F'\t' '!/^[[:space:]]*#/ && NF>=2 && $1 ~ /^[0-9]+$/ && length($1) <= 9 { if ($1 + 0 > t) t = $1 + 0 } END { print t + 0 }' "$BR" 2>/dev/null)"
  fi
  case "$STOP" in ''|*[!0-9]*) STOP=0 ;; esac
  REF="$((10#$BNUM))"; [ "$STOP" -gt "$REF" ] && REF="$STOP"
  STEP="$((10#$HNUM - REF))"
  # (a) NUMBER. Equality allowed - measured, see the block comment above. Lower refuses; above the margin refuses.
  if [ "$HNUM" -lt "$BNUM" ]; then
    PLAUS_WHY="the head stamp number #$HNUM is LOWER than the base #$BNUM; a build number never goes backwards on a stamp-only commit"; return 2; fi
  # A number inside the base series is judged at (b2), by whose rows it has, not here by its position [#529 second review].
  if [ "$STEP" -gt "$D" ]; then
    PLAUS_WHY="the head stamp number #$HNUM is $STEP above #$REF, the higher of the base stamp #$BNUM and the base series top #$STOP, past the series margin of $D [$PLAUS_DELTA_SRC]"; return 2; fi
  # (a) DATE. Lexicographic compare is exact for YYYY-MM-DD HH:MM, so no date arithmetic and no DST edge here.
  if [ "$HDATE" \< "$BDATE" ]; then
    PLAUS_WHY="the head stamp date $HDATE is EARLIER than the base stamp date $BDATE"; return 2; fi
  # THE BOUND IS FORMATTED IN EASTERN, NOT MERELY PARSED THERE [#524, and it is the defect #523 existed to
  # close, made two lines above its own correct conversion]. This read
  #   date -d 'TZ="America/New_York" now + 10 minutes'
  # where the TZ="..." prefix sets the PARSING zone and the OUTPUT zone stays the process TZ, which is UTC in
  # every container this project runs in. `now` needs no parsing zone at all, so the prefix bought nothing and
  # the output came back in UTC: the bound was wall clock +4h10m under EDT and +5h10m under EST, not +10
  # minutes. MEASURED at 2026-10-16T00:05Z: true ET 20:05, the old form 2026-10-16 00:15, this form 20:15 -
  # so the orchestrator's own named fixture, a stamp three hours ahead of the clock, took EXIT 0 FAST GATE
  # GREEN. H14 below is the control, at +3 HOURS; H4's +5 YEARS fails the lexicographic date rule either way
  # and therefore could not see this class at all.
  # DO NOT "FIX" plaus_et2utc A FEW LINES ABOVE BY ANALOGY. There the TZ="..." prefix IS the parsing zone for a
  # given ET timestamp and -u IS the intended output zone, so that form is correct. The two differ precisely
  # because one parses an ET time into UTC and this one formats the current instant in ET.
  NOW10="$(TZ=America/New_York date -d 'now + 10 minutes' '+%Y-%m-%d %H:%M' 2>/dev/null)"
  [ -n "$NOW10" ] || { PLAUS_WHY="could not read the wall clock, so a future-dated stamp cannot be excluded"; return 2; }
  if [ "$HDATE" \> "$NOW10" ]; then
    PLAUS_WHY="the head stamp date $HDATE is later than the wall clock plus ten minutes ($NOW10 ET), so it cannot be a build that has happened"; return 2; fi
  # (b) THE SECOND WITNESS: THE REGISTER. A different file from the bundle under judgement, so this is not the
  # painter checking itself. A MISSING or out-of-band row is "cannot confirm" and goes FULL - never green -
  # because buildnum.sh record is BEST EFFORT (it warns and does not fail the build), so a legitimate build can
  # genuinely lack a row and must not be REFUSED for it.
  [ -n "$HM5" ] || { PLAUS_WHY="the head bundle md5 was not computed, so the register row cannot be matched to it"; return 2; }
  [ -r "$PLAUS_REG" ] || { PLAUS_WHY="the head register is unreadable, so the stamp has no second witness"; return 2; }
  ROW="$(awk -F'\t' -v n="$HNUM" -v m="$HM5" 'NF>=6 && $1==n && $2=="built" && $4==m {print; exit}' "$PLAUS_REG")"
  if [ -z "$ROW" ]; then
    HI="$(awk -F'\t' -v n="$HNUM" 'NF>=2 && $1==n && $2=="built" {c++} END{print c+0}' "$PLAUS_REG")"
    PLAUS_WHY="the head register holds no \`built\` row for #$HNUM whose bundle field is $HM5 (it holds $HI \`built\` row(s) for #$HNUM), so nothing but the bundle itself says this stamp names this build"; return 2; fi
  # (b2) A NUMBER INSIDE THE SERIES MUST BE THIS RUN'S [#529 second review, both reviewers' N1]. At or below the
  # base series top and not the base stamp's own, the number already has register rows, and it is stampable here
  # only by the run that holds every one of them: buildnum.sh stampable's rule, asked of the head register with
  # the runId of the `built` row that names this bundle. That is the shape of a run whose mint reached main in an
  # earlier push and whose bundle follows in a later one (H45); another run's held number goes FULL (H44).
  # THE RUNID IS TAKEN ON TRUST, as `buildnum.sh stampable` takes CT_RUNID: a row written under another run's
  # runId passes this test, and nothing in the register can tell [#529 third pass, reviewer A].
  if [ "$HNUM" -ne "$BNUM" ] && [ "$STEP" -lt 1 ]; then
    RRUN="$(printf '%s' "$ROW" | cut -f7)"
    OTH="$(awk -F'\t' -v n="$HNUM" -v r="$RRUN" '!/^[[:space:]]*#/ && NF >= 7 && $1 ~ /^[0-9]+$/ && $1 + 0 == n + 0 && $7 != r { c++ } END { print c + 0 }' "$PLAUS_REG" 2>/dev/null)"
    case "$OTH" in ''|*[!0-9]*) OTH=1 ;; esac
    if [ -z "$RRUN" ] || [ "$OTH" -ne 0 ]; then
      PLAUS_WHY="the head stamp number #$HNUM sits inside the base series (top #$STOP), is not the base stamp's own #$BNUM, and $OTH register row(s) for it carry a runId other than the one on the \`built\` row that names this bundle, so it is another run's number (buildnum.sh stampable's rule)"; return 2; fi
  fi
  RTIME="$(printf '%s' "$ROW" | cut -f6)"
  HUTC="$(plaus_et2utc "$HDATE")"
  [ -n "$HUTC" ] && [ -n "$RTIME" ] || { PLAUS_WHY="could not convert the stamp date to UTC to compare it with the register row time"; return 2; }
  # BAND: the row is never EARLIER than the stamp (record runs after the bundle is written) and never more than
  # an hour later. History is 0 minutes on all ten reachable commits and on #522; the hour is headroom for a
  # build that straddles a minute, and it still rejects a row borrowed from a different build hours away.
  if [ "$RTIME" \< "$HUTC" ]; then
    PLAUS_WHY="the register row for #$HNUM is stamped $RTIME, EARLIER than the bundle stamp $HDATE ET ($HUTC); the row is written after the bundle"; return 2; fi
  if [ "$RTIME" \> "$(date -u -d "$HUTC + 60 minutes" '+%Y-%m-%dT%H:%MZ' 2>/dev/null || printf '%s' "$RTIME")" ]; then
    PLAUS_WHY="the register row for #$HNUM is stamped $RTIME, more than an hour after the bundle stamp $HDATE ET ($HUTC); history shows these two clock reads share a minute"; return 2; fi
  if [ "$HNUM" -eq "$BNUM" ]; then STEPTXT="the base stamp's own number, a rebuild under it"
  elif [ "$STEP" -lt 1 ]; then STEPTXT="inside the base series (top #$STOP), and every register row for #$HNUM carries the runId on the \`built\` row that names this bundle, buildnum.sh stampable's test; a runId is what a row says, not proof of who wrote it"
  else STEPTXT="step $STEP over #$REF, the higher of the base stamp and the base series top #$STOP"; fi   # never a negative step [#529 review]
  PLAUS_WHY="stamp #$BNUM -> #$HNUM ($STEPTXT; margin $D [$PLAUS_DELTA_SRC]), date $BDATE -> $HDATE, not after $NOW10 ET; register \`built\` row for #$HNUM names bundle $HM5 at $RTIME, and the bundle stamp is $HUTC"
  return 0
}

# ── ORDER [#524]. PART 2(c) RUNS *BEFORE* THE STAMP BLOCK, AND THE REORDER IS THE WHOLE FIX. ─────────
# #523 placed this block AFTER the app.js/stamp-only block. Every implausible-stamp path in that block ends in
# `exit 2`, so a commit that both planted a register row AND got its stamp wrong exited at the stamp arm and
# PART 2(c) NEVER RAN - the row then landed, because the full suite checks neither buildnum.sh next nor any
# series bound (gates.sh never mentions buildnum at all; that was measured for #523's own comment below).
# MEASURED by #523's antagonist A: restamp app.js to '#001 - <now> ET' and append a '999 minted' row in ONE
# commit gives EXIT 2 'the head stamp number #001 is LOWER than the base #522' with 'planted row present at
# head: 1' printed beside it and no register verdict at all. The harness could not see it because it tested
# the planted row ALONE (H8 -> exit 1) and the bad stamp ALONE (H3 -> exit 2) and had no case with both; H15
# below is that case. Running the register arm first makes its exit 1 win over the stamp arm's exit 2 by
# ordering rather than by arithmetic, which is the cheaper half of the two remedies the job offered - and the
# correct precedence, because exit 1 means REFUSE and exit 2 only means go and pay the suite.
# IT IS SAFE TO RUN FIRST: this block reads only $CHANGED (set at :141), $BASEFULL, $HEAD and plaus_delta,
# all of which exist well above here, and it touches nothing the stamp block reads.
# ── PART 2(c), REGISTER PLAUSIBILITY. ADDED #523. ──────────────────────────────────────────────────────────
# gates/build-numbers.tsv has been RECORDS since the arm split landed at #522, guarded by the records door's
# APPEND-ONLY ratchet. That ratchet proves old rows were not edited. IT NEVER ASKS WHETHER AN APPENDED ROW IS A
# PLAUSIBLE NUMBER, so one hand-written `999 minted` row took EXIT 0 FAST GATE GREEN on main - measured - and
# in that same tree `buildnum.sh next` REFUSES with exit 2, because 999 is cut off from the series and handing
# out #1000 would silently burn every number between. So the push gate accepted exactly the row that wedges the
# minter, and the register is append-only, so it cannot be taken back out once it lands.
#
# THE SERIES BOUND IS REUSED, NOT RE-IMPLEMENTED. A second copy of the rule is the defect this project keeps
# filing, so this ASKS buildnum.sh rather than re-deriving its series: `next` returning exit 0 is the same
# predicate that will have to hold the next time anybody mints, and it is the one the wedge actually breaks.
# The appended-row bound beside it is the cheap local check that names the offending row for a reader.
#
# THIS IS exit 1 AND NOT exit 2, AND THE REASON IS THE ONE THING I MEASURED RATHER THAN ASSUMED. Routing a
# stray row to the full suite would be useless: I read gates/gates.sh and gates/records-gate.sh for this, and
# NEITHER runs buildnum.sh next nor any series check - gates.sh never mentions buildnum at all - so the suite
# would go green and the row would land. prompts/build-run STEP 0F reads exit 1 as STOP: do not push, file it.
if in_changed 'gates/build-numbers.tsv'; then   # #525: was a printf-into-grep-qxF pipeline, a pipefail SIGPIPE race
  # THE DELTA IS NO LONGER A PRECONDITION OF THIS BLOCK [#524, antagonist A's veto, UPHELD].
  # This read `RP_D="$(plaus_delta)"; if [ -z "$RP_D" ]; then ... exit 2; fi` at the HEAD of the block, and A
  # defeated the whole refusal with one environment variable: plaus_delta validates with
  # `case "$d" in ''|*[!0-9]*) return 1`, so BUILDNUM_MAX_DELTA=abc (or -5) makes it fail and the block
  # exited 2 BEFORE the contiguity bound ran. Measured by A in a clone on H8's own planted `999 minted` row:
  # abc and -5 give EXIT 2, while 10 and 0 give the correct EXIT 1. By this script's own argument - the full
  # suite runs neither `buildnum.sh next` nor any series check - routing a stray row to the suite LANDS IT.
  # IT WAS ALSO A DEAD PRECONDITION, which is what made it invisible: since #524 the bound does not read the
  # delta at all, so the refusal reason it printed ("an appended row cannot be bounded") was already false.
  # The delta is now needed ONLY for the disclosure line below, so an unreadable one costs a notice and never
  # the check. A non-numeric override is still reported, because silence about it is A's finding 6.
  plaus_delta || true
  RP_D="$PLAUS_DELTA"
  if [ -z "$RP_D" ]; then
    say ""
    say "register plausibility [#524]: the series margin is unknown ($PLAUS_DELTA_SRC)."
    say "  THE BOUND BELOW STILL RUNS: since #524 it is contiguity and does not consult the margin at all."
    RP_D="unreadable"
  fi
  # SAY WHEN THE OVERRIDE IS LIVE [#524]. plaus_delta honours ${BUILDNUM_MAX_DELTA:-...}, and buildnum.sh
  # prints override_notice on stderr whenever it is in effect while this script printed only the resulting
  # number - so BUILDNUM_MAX_DELTA=1000 silently widened the old margin far enough to accept H8's own 999
  # fixture. The contiguity bound above no longer reads the margin at all, which is the real repair; this line
  # exists so a reader of the log can still see that the environment was trying to move it.
  # IT IS PRINTED HERE, BEFORE THE BOUND RUNS, AND NOT BESIDE THE SUCCESS LINE. My first draft put it with
  # the final verdict say(), which meant a tree that was REFUSED never disclosed that an override was set -
  # the one case a reader most needs it, because the override is what an attacker would reach for. H17 is
  # the control and it asserts the notice on a REFUSAL, which that placement would have failed.
  # ONE SOURCE FOR THE PROVENANCE STRING, NOT TWO [#524 second pass]. This block used to re-grep
  # BN_DEFAULT_DELTA itself, in the parent shell - which is WHY H17 passed while plaus_pred's identical claim
  # was dead, and is exactly the duplicated-constant defect this project files against itself. plaus_delta now
  # sets PLAUS_DELTA_SRC in this shell, so there is one computation and one string.
  case "$PLAUS_DELTA_SRC" in OVERRIDDEN*)
    say "register plausibility [#524]: $PLAUS_DELTA_SRC."
    say "  It does NOT widen the check below - appended rows are bounded by CONTIGUITY now, not by the margin -"
    say "  and it is named here so the log records the attempt." ;;
  esac
  RP_B="$(mktemp)"; RP_H="$(mktemp)"; FG_TMPS+=("$RP_B" "$RP_H")   # #527: the EXIT trap removes them on every path
  $GIT cat-file blob "$BASEFULL:gates/build-numbers.tsv" > "$RP_B" 2>/dev/null || true
  $GIT cat-file blob "$HEAD:gates/build-numbers.tsv"     > "$RP_H" 2>/dev/null || true
  if [ ! -s "$RP_H" ]; then
    rm -f "$RP_B" "$RP_H"
    say ""
    say "FAST GATE REFUSED - gates/build-numbers.tsv is in the diff and the head copy is empty or unreadable."
    say "    The register is append-only; an empty head is not an append [#523]."
    exit 1
  fi
  # TOP OF THE BASE SERIES, read with buildnum.sh's own row filter (field 1 a bare number, NF>=2) so a comment
  # or the header cannot be half-matched - held.sh's lesson, which buildnum.sh:102 already encodes.
  RP_TOP="$(grep -v '^[[:space:]]*#' "$RP_B" 2>/dev/null | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1}' | sort -n | tail -1)"
  [ -n "$RP_TOP" ] || RP_TOP=0
  # NO BASE SERIES AT ALL -> GO FULL, SAID OUT LOUD [#524]. With an absent or row-less base the top is 0 and
  # contiguity would demand the first new number be #1, so the bound below would REFUSE the commit that
  # CREATES the register - which is a real commit in this history (f89bca9db1, 95 numbers against an empty
  # base). It cannot recur on main while the file exists, and that is exactly why it must not be a silent
  # refusal: a run that hit it would read a confident sentence about a series that is not there. exit 2, not
  # exit 1, because there is no series to wedge.
  if [ "$RP_TOP" = 0 ]; then
    rm -f "$RP_B" "$RP_H"
    say ""
    say "FULL SUITE REQUIRED - the BASE gates/build-numbers.tsv carries no numbered row, so there is no series"
    say "    for an appended number to be contiguous with [#524]. Run: gates/gates.sh \"#<N>\""
    exit 2
  fi
  # APPENDED ROWS: present at head, absent at base. comm needs sorted input, and the rows are not sorted, so
  # this compares as SETS - which is what "append-only" leaves behind and is enough to name a new number.
  # THE BOUND IS CONTIGUITY, NOT THE SERIES MARGIN [#524]. This compared each appended row against
  # RP_TOP + RP_D, which accepted TEN numbers above the base top - so appending a bare `530 minted` row on a
  # base topping out at #523 took EXIT 0 FAST GATE GREEN and BURNED SIX NUMBERS permanently, measured by
  # #523's antagonist B in a clone (buildnum.sh next then returned #531 with #524, #525 and #529 reading
  # free). THE MARGIN WAS NEVER THE RIGHT INSTRUMENT HERE: BN_DEFAULT_DELTA exists in buildnum.sh to let
  # series_run tolerate a GAP IN HISTORY it is reading, not to license a run to skip numbers it is writing.
  # What the minter actually does is `next` = highest + 1 (gates/buildnum.sh, the next verb), so a commit that
  # appends k DISTINCT NEW numbers can only honestly have minted RP_TOP+1 .. RP_TOP+k. That is the rule now,
  # and it is strictly stronger than the margin while still admitting every legitimate shape:
  #   - a further row for a number already in the base (a `built` row after a `minted` row) is <= RP_TOP;
  #   - this very run appends TWO numbers, #523 (arriving with the held branch, whose row never reached main)
  #     and #524 (mine), against a base topping out at #522 - so 523 <= 522+1 and 524 <= 522+2, and it passes.
  # A gap is still free in the OTHER direction: nothing here requires a number to be used once minted.
  RP_BAD=""
  RP_NEW="$(grep -vxF -f <(grep -v '^[[:space:]]*#' "$RP_B" 2>/dev/null || true) <(grep -v '^[[:space:]]*#' "$RP_H") 2>/dev/null \
            | cut -f1 | awk 'NF && $1 ~ /^[0-9]+$/ {print $1}' | sort -n -u)"
  # THE BASE'S NUMBER SET, NOT JUST ITS TOP [#524, antagonist A's veto 5(a), UPHELD]. The skip used to be
  # `[ "$rnum" -le "$RP_TOP" ] && continue`, commented "another row for a number the base already carries" -
  # AND THAT COMMENT IS FALSE WHENEVER THE REGISTER HAS A GAP. It has NINE, measured by A over 391 distinct
  # numbers: 126, 256, 257, 258, 278, 303, 304, 361, 363. So a hand-written row for a FREE number below the
  # top was never bounded at all: A committed one `363 minted` row in a clone, got EXIT 0 FAST GATE GREEN,
  # and the log POSITIVELY ASSERTED "every new number in this diff is contiguous with the base register top
  # of #524" - a check it had skipped - after which `buildnum.sh check 363` went from free to ISSUED, burned
  # permanently because the register is append-only. The test is therefore MEMBERSHIP in the base's own
  # number set, which is what the comment always claimed it was.
  # NORMALISED AS STRINGS, NOT THROUGH ARITHMETIC [#524 second pass, antagonist A's VETO 2]. This read
  # `awk '{print $1+0}'` and the membership test below read `$((10#$rnum))`, and BOTH overflow: bash wraps at
  # 64 bits, so `$((10#18446744073709552016))` is 400 - measured - and awk's own +0 goes through a double and
  # loses precision above 2^53. A appended ONE row numbered 18446744073709552016 (= 2^64 + 400, where 400 IS
  # in the base register), the membership test matched the wrapped value, the row was classified as "a number
  # the base already carries" and SKIPPED, and the run took EXIT 0 FAST GATE GREEN under a log positively
  # asserting "0 new build number(s) above the base register top of #524 ... and NO new number at or below
  # #524". `buildnum.sh next` then went BACKWARDS from #525 to #401, into already-spent numbers, with the
  # "ask the minter itself" check passing because `next` still exits 0.
  # THE EXIT CODE WAS PRE-EXISTING AND THE FALSE ASSERTION IS NEW, which is why it is this build's to fix:
  # before #524 `[ "$rnum" -le "$RP_TOP" ]` errored on the operand and fell through to the same green, but it
  # COUNTED the row; the membership skip made it invisible and the new success line certified its absence.
  # That is A5(a)'s ground - a log asserting a check it skipped - with the number set to zero.
  # THE FIX IS THE FIELD WIDTH, not the arithmetic, because no arithmetic repair can make a 20-digit build
  # number meaningful: this register's numbers run 125..524, so anything over six digits is a malformed row
  # and is REFUSED by name. Below that bound every value is far inside both bash's and awk's exact range.
  # length(), NOT AN INTERVAL EXPRESSION, AND THIS PROJECT ALREADY KNEW [#524, caught by H22 on its first run].
  # My first version of this line was `awk '$1 ~ /^[0-9]{7,}$/'`, and **mawk 1.3.4 does not support interval
  # expressions**: `echo 1234567890 | awk '$1 ~ /^[0-9]{7,}$/'` prints NOTHING here. So the refusal matched no
  # row, never fired, and H22 went EXIT 0 FAST GATE GREEN on the very fixture it was written for - a guard that
  # LOOKED implemented and could not fail, which is "a selector that cannot match" (#394) with the sign flipped.
  # THE PART THAT IS WORSE THAN THE BUG: gates/buildnum.sh:753 already carries the comment "NO awk INTERVAL
  # MATCH ANYWHERE IN IT. mawk 1.3.4's leftmost-shortest match() on /[0-9]{3,4}/ is what got burst wave 1's
  # patch 11 on this very file DROPPED from the 2026-10-03 integration". The lesson was written down, in this
  # suite, one file away, and I reintroduced it anyway - #390's "a lesson recorded in one gate does not travel
  # to the next one by itself", and #493's "a fix recorded in one home does not travel". `grep -rn "awk.*{[0-9]"
  # gates/*.sh` finds exactly these two and nothing else, so the sweep is clean after this line.
  RP_WIDE="$(grep -v '^[[:space:]]*#' "$RP_H" 2>/dev/null | cut -f1 | awk 'NF && $1 ~ /^[0-9]+$/ && length($1) > 6 {print $1}' | sort -u | head -5 | tr '\n' ' ')"
  if [ -n "$RP_WIDE" ]; then
    say ""
    say "FAST GATE REFUSED - gates/build-numbers.tsv carries a row whose build number is more than six digits"
    say "    long: $RP_WIDE[#524]. This register's numbers run 125..524, every bound in this arm and in"
    say "    gates/buildnum.sh is integer arithmetic, and bash wraps at 64 bits - 10#18446744073709552016 is"
    say "    400 - so such a row is silently read as a DIFFERENT number by every check that looks at it."
    exit 1
  fi
  RP_BASENUMS="$(grep -v '^[[:space:]]*#' "$RP_B" 2>/dev/null | cut -f1 | awk 'NF && $1 ~ /^[0-9]+$/ {sub(/^0+/,"",$1); if($1=="")$1="0"; print $1}' | sort -u)"
  # AND THE TWO DOORS ARE JUDGED SEPARATELY, BECAUSE I MEASURED THE HISTORY AND MY FIRST BOUND WOULD HAVE
  # REFUSED HONEST WORK [#524]. My first answer to A's 5(b) was a flat ceiling of k <= 2 new numbers per
  # commit, written with the sentence "nothing in this project's history appends three" - WHICH I HAD NOT
  # MEASURED. Measured, one `git show <sha>:gates/build-numbers.tsv` per commit touching the file, base set
  # against head set: the largest single-commit append is **123** (`f6127fcb36`, #454's census), and that
  # commit touches **gates/build-numbers.tsv AND NOTHING ELSE** - a records-only commit, exactly the
  # population this arm judges. A flat ceiling of 2 would have refused it, and two more: `dc0ece3609` (#480)
  # and `21b5967513` (#469) each append THREE. "A guard that refuses honest work is worse than no guard" is
  # this project's own rule and I was one command away from breaking it.
  # WHAT THE SPLIT MEASUREMENT SHOWS, and it is a clean split:
  #   ABOVE the base top (a MINT; `next` = highest+1)      max 3, at #480 and #469 - excluding f89bca9db1,
  #                                                        which CREATED the register against an empty base
  #                                                        and so counts 95 above a top of 0.
  #   AT OR BELOW the base top (a CENSUS fill of a GAP)    max 123, in 5 commits, all of them #454/#465-era
  #                                                        corrections of numbers already spent.
  # So they are different operations with different honest shapes, and one bound cannot serve both:
  #   - above the top: contiguity AND k <= 3. 3 admits every shape that has occurred and refuses A's attack
  #     at 4 of the 10 rows it planted. REFUSAL (exit 1), because the full suite runs no series check.
  #   - at or below the top: named in the log and sent to the FULL SUITE (exit 2). It is never a fast green -
  #     it turns a free number ISSUED for ever, which is A's 363 finding - but it is not refused either,
  #     because #454's census is the measured proof that honest records-only commits do this.
  # I CANNOT DISTINGUISH A CENSUS FROM A's PLANTED ROW AND I AM NOT PRETENDING TO: both write a row for a
  # free number below the top. What the split buys is that neither can take the FAST door silently, and that
  # the log names every number being spent instead of asserting contiguity it never checked.
  # ── THE HELD-TREES EXEMPTION IS READ FROM THE BASE COMMIT, NOT THE WORKING TREE. ADDED #525. ──────────────
  # THREE FAULTS, found by an independent reviewer on the held #524 tree (its F2 and F3) and REPRODUCED by the
  # orchestrator. The exemption below read `grep -q "<TAB>#NNN<TAB>" "$ROOT/gates/held-trees.tsv"`, i.e. the
  # WORKING TREE, with no column discipline:
  #  (1) THE WORKING TREE IS NOT WHAT IS BEING GATED, and this script's tamper pin covers the files it
  #      EXECUTES, not the files it READS. Ten hand-written rows 525..534 are refused (exit 1); the same commit
  #      with ten matching held rows written into the working tree only and hidden by
  #      `git update-index --assume-unchanged gates/held-trees.tsv` answered EXIT 0 FAST GATE GREEN with
  #      `git status --porcelain` EMPTY (orchestrator 1 of 1; reviewer 4 of 4, three with assume-unchanged and
  #      one with skip-worktree). A merely dirty file is caught; those two index flags hide it from that check.
  #  (2) IT WAS LOOSER THAN THE HOLD REGISTER'S OWN READER. Any line carrying the number between two tabs in
  #      ANY column vouched for it - a COMMENT line and a CLEARED row (field 1 starting with `-`) included,
  #      both of which gates/held.sh's own `match_rows` excludes. Three such lines plus four appended rows
  #      answered EXIT 0 with "1 of them count toward the ceiling of three" (orchestrator 1 of 1).
  #  (3) THE DIFF COULD VOUCH FOR ITSELF: ten rows and ten held rows in one diff answered exit 2 instead of
  #      exit 1, and this script's own comments say exit 2 lands a burn because the full suite runs no series
  #      check. H23's accept fixture planted its vouching rows in the SAME commit as the mint, so the harness
  #      could not tell a row the BASE holds from one the diff supplies.
  # THE FIX IS THE BASE BLOB, PARSED THE REGISTER'S OWN WAY, AND MATCHED IN THE NUMBER COLUMN ONLY. All three
  # faults share one cause - the question "is this mint accounted for?" is a question about the tree being
  # gated FROM, so it is asked of `git show "$BASEFULL":...` and of nothing else. A row the diff adds cannot
  # vouch, because it is not in the base. The filter is `match_rows` from gates/held.sh:33 (skip comments,
  # require NF>=2, reject a cleared row whose field 1 starts with `-`) and the number must be in FIELD 3, the
  # column `held.sh add` writes it to, so the heldBy column can no longer vouch.
  # FAIL-SAFE BY CONSTRUCTION: if the base carries no such file, or git cannot read it, the set is EMPTY and
  # EVERY new number counts toward the ceiling. The failure direction is a refusal, never a green.
  # AND THE MEMBERSHIP TEST IS PIPE-FREE, for the reason in_changed() above exists: this set is small today and
  # a `case` is safe at any size, so the class does not come back here when the register grows.
  RP_HELDBASE="$($GIT show "$BASEFULL:gates/held-trees.tsv" 2>/dev/null \
    | grep -v '^[[:space:]]*#' | awk -F'\t' 'NF>=2 && $1 !~ /^-/ {print $3}' || true)"
  RP_HELDBASE="$NL_525$RP_HELDBASE$NL_525"
  held_vouches_at_base(){ # <bare number>: 0 iff a LIVE BASE row names it in the NUMBER column
    case "$RP_HELDBASE" in *"$NL_525#$1$NL_525"*) return 0 ;; esac
    return 1
  }
  say "held-trees rows in the BASE that can vouch for a mint: $(printf '%s' "$RP_HELDBASE" | grep -c '^#' || true) (read with git show from $BASE, never from the working tree [#525])"
  RP_I=0
  RP_K=0
  RP_HELDOK=""
  RP_FILL=""
  while IFS= read -r rnum; do
    [ -n "$rnum" ] || continue
    # a further row for a number the base ACTUALLY CARRIES is not a new number (a `built` row after a
    # `minted` row). Compared numerically via +0 on both sides so 0530 and 530 are one number [B finding 6].
    RP_NORM="$rnum"; RP_NORM="${RP_NORM#"${RP_NORM%%[!0]*}"}"; [ -n "$RP_NORM" ] || RP_NORM=0
    if grep -qxF "$RP_NORM" <<<"$RP_BASENUMS"; then continue; fi   # string compare, not $(( )) [#524 V2]
    # DOOR TWO: at or below the base top, and the base does not carry it. A gap fill, not a mint.
    if [ "$rnum" -le "$RP_TOP" ]; then
      RP_FILL="$RP_FILL    #$rnum is new and sits AT OR BELOW the base register top of #$RP_TOP, so it is not a mint (gates/buildnum.sh next is highest+1); it fills a gap and turns a number \`check\` answered \`free\` into \`issued\` for good.\n"
      continue
    fi
    RP_I=$((RP_I + 1))
    # A NUMBER WITH A held-trees ROW IS AN ACCOUNTED-FOR MINT AND DOES NOT COUNT TOWARD THE CEILING
    # [#524, antagonist A's NOTE 5, UPHELD AND CLOSED RATHER THAN LEFT AS A RESIDUAL]. A's objection was that
    # the ceiling was measured over pushes that LANDED, which by construction can never contain a HELD run's
    # unlanded mint - so honest unlanded mints accumulate and a legitimate tree can exceed three, while exit 1
    # is terminal (prompts/build-run STEP 0F reads it as STOP) with no full-suite escape.
    # IT IS NOT HYPOTHETICAL AND I MEASURED HOW NEAR IT WAS: this branch adds exactly #523 and #524 above
    # main's top of #522, #523 already carries a held-trees row, and if this run holds then #524 does too. One
    # more held run reaches 3 - still allowed - and the one after reaches FOUR, refused terminally, with three
    # of the four being accounted-for holds. A guard that blocks the project's only writer in two runs is
    # worse than the attack it was built for, and gates/held-trees.tsv on main records four CONSECUTIVE holds
    # (#456-#459), so the shape recurs.
    # TWO COUNTERS, DELIBERATELY NOT ONE: RP_I is the POSITION and contiguity still applies to every new
    # number (an accounted-for mint is still sequential, so this does not loosen that test by a single row);
    # RP_K is what the ceiling bounds, and it skips a number the held register vouches for. A's ten
    # hand-written rows carry no held row, so they still count ten and are still refused - the attack is
    # unaffected, which is the only thing that makes this safe rather than a widening.
    if held_vouches_at_base "$rnum"; then   # #525: BASE blob, match_rows filter, number column only
      RP_HELDOK="$RP_HELDOK #$rnum"
    else
      RP_K=$((RP_K + 1))
    fi
    if [ "$rnum" -gt "$((RP_TOP + RP_I))" ]; then
      # BASE 10, FORCED, AND THE ORDINAL SPELLED [#524, antagonist B finding 6]. `[ "$rnum" -le ... ]` reads a
      # leading-zero number as DECIMAL while $(( )) reads the same string as OCTAL, so B's planted `0530` row
      # was TESTED as 530 and then DESCRIBED using 344: the refusal printed "Landing it burns -181 number(s)
      # permanently". The verdict was right and the sentence was nonsense - and a negative burn count inside a
      # REFUSED log is exactly the kind of figure this project quotes into a run report. 10# pins the base for
      # every arithmetic use of the row's own number. The ordinal is separate and smaller: it printed "1th".
      RP_N10=$((10#$rnum))
      case "$RP_I" in 1) RP_ORD="1st" ;; 2) RP_ORD="2nd" ;; 3) RP_ORD="3rd" ;; *) RP_ORD="${RP_I}th" ;; esac
      RP_BAD="$RP_BAD    row #$rnum is new, and it is the $RP_ORD new number in this diff, so an honest mint would have made it #$((RP_TOP + RP_I)) (base register top #$RP_TOP, and gates/buildnum.sh next is highest+1). Landing it burns $((RP_N10 - RP_TOP - RP_I)) number(s) permanently, and the register is append-only.\n"
    fi
  done <<EOF
$RP_NEW
EOF
  # THE APPENDED ROWS AS ROWS, NOT AS NUMBERS [#529, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
  # Everything above judges the NUMBERS that appear, and RP_NEW is a SET difference (`grep -vxF`), so two
  # shapes took EXIT 0 FAST GATE GREEN on #524's held tree, measured by the orchestrator on 04dee1e on 15 Oct
  # 2026 (inputs P6 and P7 of a 21 input run): a row BYTE-IDENTICAL to one the base already holds is not in a
  # set difference at all, and a contiguous `built` row naming a bundle that was never built passes a bound
  # that reads the number field only. claude/stories/TEST-CASES.md had named both as residuals (1) and (2)
  # since #524. So the appended rows are now counted WITH THEIR MULTIPLICITY (one awk: the base rows first,
  # then each head row is matched off against them or kept), and every kept row is judged as a row:
  #   (i)   nine tab separated fields and a state from the vocabulary `buildnum.sh add` accepts (minted,
  #         issued, built, shipped, held, abandoned), which is what every writer in gates/ produces;
  #   (ii)  no exact copy of another row in the head register. No tool writes one: `record` is idempotent on
  #         number, bundle and source, `mint` reads back exactly one row for its number, and `add` stamps the
  #         minute, so a copy is a hand, or an operator running `add` twice in one minute;
  #   (iii) a `built` row names a bundle this history holds: app.js at the base, at the head or at any commit
  #         between; or a HEX bundle a LIVE gates/held-trees.tsv row names FOR THAT ROW'S OWN NUMBER AND RUNID
  #         (its fields 3 and 5), at the base or at the head; or it shares its number and runId with ANOTHER
  #         ROW APPENDED IN THIS DIFF whose bundle is one THIS DIFF CHANGES (an app.js at the head or between
  #         that differs from the base's) or whose own live held row vouches for it, because a run that
  #         rebuilds mid pass records every bundle and commits one.
  # TWO MORE NARROWINGS FROM THE SECOND REVIEW [#529, R18]. A cleared row ('-' in field 1) is a withdrawn row,
  # and the three this change clears (#523, #524, #525) carry their gated sha's first 12 characters there, which
  # the hex test alone accepted, so a built row for the live number naming one took FAST GATE GREEN (reviewer
  # A's N2, H46). And a built row naming the BASE's own bundle vouched for itself and seeded its run's
  # siblings, so a register only commit carried a forged row beside a copy of the live one (reviewer B's N2,
  # H47). AND A THIRD FROM THE THIRD PASS [reviewer B's N3]: a live held bundle vouched for a row with ANY number
  # and runId, so a register only commit carried a forged row beside a copy of #504's held bundle (H48); a held
  # row now vouches for the build it names, its own number under its own runId. Replayed against main's
  # history with all three, the counts are unchanged and nothing is refused (run5/sim_g6_r3.py).
  # TWO CLAUSES OF THE FIRST VERSION WERE WITHDRAWN BEFORE IT LANDED, AND A THIRD WAS NARROWED [R18, #529 review].
  # Both independent reviewers measured forged rows taking EXIT 0 FAST GATE GREEN under the green line below:
  # "the number the head stamp carries" vouched ANY bundle for that number, and on a records-only commit the
  # head stamp IS the base stamp, so a row for the live number naming a bundle nobody built passed (H40), as did
  # a second row beside an honest rebuild (H43); pairs drawn from BASE rows let a row that copies a real row's
  # number and runId pass (H41); and field 1 of held-trees.tsv entered the vouch set verbatim, so the `sha-only`
  # sentinel of gates/held.sh vouched a bundle no tool can record (H42). History needs none of the three.
  # MEASURED AGAINST HISTORY BEFORE IT WAS WRITTEN, because a guard that refuses honest work is worse than no
  # guard: every first-parent commit on main that touched the register, replayed with these rules, is 406
  # appended rows (95 of them built) with 0 copies, 0 rows of other than nine fields, 0 states outside the
  # vocabulary and every built row vouched: 64 by app.js at the commit or its parent, 8 by a hex held-trees
  # bundle and 23 by a row the same run appended in the same commit (run5/sim_g6_tight.py, the orchestrator's
  # replay as tightened by the review). The held runs' close-outs (#456, #459 and #504 among them) are why the
  # sibling clause exists: without it this arm would refuse every one.
  # WHAT (iii) CANNOT SEE, said so nobody over-reads it: it proves a built row names a bundle that some file in
  # this history names, or sits beside one written by the same run in this diff. It does not prove a hand did
  # not write that file's row too, since a held-trees row and
  # a built row naming one invented bundle pass together, and it need not: a hand-written contiguous `minted`
  # row burns the same one number and the bound above accepts it by design, because nothing here can tell a
  # hand-written mint from a real one. NO PIPELINE: blobs go to a temporary file and md5sum reads the file.
  RP_TMPBLOB="$(mktemp)"; FG_TMPS+=("$RP_TMPBLOB")   # removed by the EXIT trap on every path [#527]
  RP_VOUCH=""; RP_SEED=""; RP_BM=""; RP_HK=""   # RP_SEED: changed bundles that may stand for a sibling; RP_HK: held keys
  for RP_C in "$BASEFULL" "$HEAD" $($GIT rev-list "$BASEFULL..$HEAD" -- app.js 2>/dev/null || true); do
    if $GIT cat-file blob "$RP_C:app.js" > "$RP_TMPBLOB" 2>/dev/null; then
      RP_M="$(md5sum "$RP_TMPBLOB" 2>/dev/null || true)"; RP_VOUCH="$RP_VOUCH ${RP_M:0:12}"
      if [ "$RP_C" = "$BASEFULL" ]; then RP_BM="${RP_M:0:12}"
      elif [ "${RP_M:0:12}" != "$RP_BM" ]; then RP_SEED="$RP_SEED ${RP_M:0:12}"; fi   # a bundle this diff changes
    fi
  done
  for RP_C in "$BASEFULL" "$HEAD"; do
    if $GIT cat-file blob "$RP_C:gates/held-trees.tsv" > "$RP_TMPBLOB" 2>/dev/null; then
      RP_HK="$RP_HK $(awk -F'\t' '$0 !~ /^[[:space:]]*#/ && NF >= 5 {b = $1; n = $3; sub(/^#/, "", n); r = $5; if (b ~ /^[0-9a-f]+$/ && n ~ /^[0-9]+$/ && r != "" && r !~ /[| ]/) printf "%s|%s|%s ", substr(b, 1, 12), n, r}' "$RP_TMPBLOB")"   # live hex rows, keyed on their own number and runId [#529 reviews]
    fi
  done
  # THE JUDGE. Pass one matches the head rows off against the base rows (multiplicity), keeps the rest, and
  # collects the (number, runId) pairs of KEPT built rows whose bundle is vouched; pass two judges the kept rows.
  RP_ROWBAD="$(awk -F'\t' -v bfile="$RP_B" -v vouch="$RP_VOUCH" -v seed="$RP_SEED" -v heldk="$RP_HK" '
    function norm(x) { sub(/^0+/, "", x); if (x == "") x = "0"; return x }
    function held(x) { return ((x[4] SUBSEP norm(x[1]) SUBSEP x[7]) in HK) }   # its own number and runId only [#529 third pass]
    BEGIN { nv = split(vouch, va, " "); for (i = 1; i <= nv; i++) if (va[i] != "") V[va[i]] = 1
            ns = split(seed, sa, " "); for (i = 1; i <= ns; i++) if (sa[i] != "") S[sa[i]] = 1
            nh = split(heldk, ha, " "); for (i = 1; i <= nh; i++) if (split(ha[i], hq, "|") == 3) HK[hq[1] SUBSEP norm(hq[2]) SUBSEP hq[3]] = 1
            ST["minted"] = 1; ST["issued"] = 1; ST["built"] = 1; ST["shipped"] = 1; ST["held"] = 1; ST["abandoned"] = 1 }
    $0 ~ /^[[:space:]]*#/ || $0 == "" { next }
    FILENAME == bfile { B[$0]++; next }
    { H[$0]++; L[++n] = $0 }
    END {
      for (k in B) R[k] = B[k]
      for (i = 1; i <= n; i++) {
        l = L[i]
        if (R[l] > 0) { R[l]--; continue }
        K[i] = 1
        if (split(l, g, "\t") == 9 && g[2] == "built" && ((g[4] in S) || held(g))) P[norm(g[1]) SUBSEP g[7]] = 1   # seeds [#529 reviews]
      }
      for (i = 1; i <= n; i++) {
        if (!(i in K)) continue
        l = L[i]
        nf = split(l, f, "\t")
        if (nf != 9) { printf "    an appended row has %d fields, and every writer in gates/ writes nine: %s\n", nf, substr(l, 1, 70); continue }
        if (!(f[2] in ST)) { printf "    appended row #%s carries the state \"%s\", which no tool in gates/ writes (minted, issued, built, shipped, held, abandoned).\n", f[1], f[2]; continue }
        if (H[l] > 1) { printf "    appended row #%s %s (runId %s, written %s) is a BYTE-IDENTICAL copy of another row in the head register, and no tool in gates/ writes one.\n", f[1], f[2], f[7], f[6]; continue }
        if (f[2] == "built" && !((f[4] in V) || held(f) || ((norm(f[1]) SUBSEP f[7]) in P)))
          printf "    appended row #%s built names bundle %s, which nothing in this history holds: not app.js at the base, at the head or between, no live gates/held-trees.tsv row naming it for this number and runId, and no vouched built row for #%s by %s appended in this diff.\n", f[1], f[4], f[1], f[7]
      }
    }' "$RP_B" "$RP_H" 2>/dev/null || true)"
  # KEEP THE TWO ROW SETS for the not-checked count on the green path below [#524, B finding 6]; the files
  # themselves go, because this block must not leave temporaries behind on any exit path.
  RP_B2="$(mktemp)"; RP_H2="$(mktemp)"; FG_TMPS+=("$RP_B2" "$RP_H2"); cp "$RP_B" "$RP_B2"; cp "$RP_H" "$RP_H2"   # #527: see FG_TMPS
  RP_BASENUMS2="$RP_BASENUMS"
  rm -f "$RP_B" "$RP_H"
  # AND k IS BOUNDED AT THE MINT DOOR [#524, antagonist A's veto 5(b), UPHELD, AND THE SHARPEST OF THE PAIR].
  # The bound was per-position (`rnum > RP_TOP + RP_I`), so k CONTIGUOUS rows license k numbers and nothing
  # bounded k. A measured it: ten hand-written rows at top+1..top+10 took EXIT 0 FAST GATE GREEN and moved
  # `buildnum.sh next` from #525 to #535 - TEN NUMBERS BURNED IN ONE COMMIT BY ONE HAND, strictly worse than
  # the six that motivated this bound in the first place. H16's single sparse row was refused and the dense
  # form was not.
  # THE CEILING IS 3, MEASURED - AND THE CITATION THIS MESSAGE USED TO CARRY WAS WRONG, IN BOTH ITS HOMES
  # [#524 second pass, antagonist A's VETO 3]. It said "three has happened twice in this register (#469,
  # #480)". Re-derived with this script's own row filter, one `git show <sha>:gates/build-numbers.tsv` per
  # commit touching the file, base number set against head number set:
  #     21b5967513  top=466  ABOVE(3): 467 468 469   #469: a live game can be re-entered
  #     dc0ece3609  top=477  ABOVE(3): 478 479 480   #480: print what this container IS into every gate log
  #     46d919dc3a  top=514  ABOVE(3): 515 516 517   #517 register rows: the mint, plus the #515/#516 backfill
  # THREE, not twice, and the missing one is the MOST RECENT - seven builds before this one - and the one
  # whose own subject describes the shape most likely to recur. The same false count was in
  # claude/stories/TEST-CASES.md at TC-SUITE-077, so it was wrong in both homes: #493's "a fix recorded in one
  # home does not travel", with an error instead of a fix.
  # HOW I GOT IT WRONG, because the method matters more than the number: I ran my per-commit measurement and
  # read it through `tail -45`, which cut the NEWEST commits - #500 to #524 - off the head of the list. The
  # ceiling VALUE survived (3 is still the maximum) but the evidence for it was a truncated window I then
  # published as a census. That is #411/#412's "a count with no scope cannot be checked", self-inflicted by a
  # pipe.
  # AND THE BOUND IS OVER THE DIFF, NOT OVER ONE COMMIT [A's NOTE 4]. This arm requires BASE to be
  # origin/main and reads $CHANGED from $BASEFULL..$HEAD, so it judges the WHOLE BRANCH STACK; the sentence
  # below used to say "at most three in one commit" over a diff that may carry many. A re-derived the correct
  # population too - main's first-parent history grouped into pushes by the build number in the subject, base
  # = parent of the group's oldest commit - and the maximum above-top PER PUSH is also 3 (#469, #480, #517),
  # with #454's register-creating push at 218 above a top of 0 and diverted by the RP_TOP=0 arm. So the number
  # is right for the population actually judged; the justification now names which population it is.
  if [ "$RP_K" -gt 3 ]; then
    RP_BAD="$RP_BAD    this diff appends $RP_I NEW build numbers ABOVE the base top of #$RP_TOP, of which $RP_K are NOT vouched for by a row in gates/held-trees.tsv, and the measured ceiling is THREE. A mint takes one (gates/buildnum.sh next is highest+1); two occur when a run merges a branch whose own minted row never reached main; three has happened three times in this register (#469 21b5967513, #480 dc0ece3609, #517 46d919dc3a, re-derived at #524); four has never happened, per commit or per push. NOTE THE SCOPE: this arm judges the whole diff \$BASEFULL..\$HEAD, not one commit, so a branch stack of honest one-mint commits is counted together.\n"
    [ -n "$RP_HELDOK" ] && RP_BAD="$RP_BAD    (Excluded from that count because gates/held-trees.tsv vouches for them:$RP_HELDOK. A HELD run's mint row never reaches main, so unlanded mints accumulate on the next tree - which is why they are excluded rather than counted.)\n"
    RP_BAD="$RP_BAD    THIS REFUSAL IS TERMINAL AND exit 2 WAS CONSIDERED AND REJECTED: the full suite runs no series check, so routing a wholesale burn there lands it. If these numbers ARE accounted for, the route is a held-trees row per held mint - which this arm reads - and not a workaround.\n"
    RP_BAD="$RP_BAD    AND CHECK YOUR BASE BEFORE YOU HUNT A WEDGE [#524, A's NOTE 6]: if refs/remotes/origin/main is STALE this count is inflated by numbers already on the real main. A measured exactly that - with origin/main pinned eight builds back this arm reported '10 NEW build numbers' for a tree whose first eight were already landed. Run git fetch and read git log -1 origin/main before believing the figure above.\n"
  fi
  if [ -n "$RP_BAD" ]; then
    say ""
    say "FAST GATE REFUSED - gates/build-numbers.tsv gains a row the series cannot carry [#523]. The register is"
    say "    APPEND-ONLY, so this cannot be edited out again once it lands, and it wedges every later mint:"
    printf "$RP_BAD" | tee -a "$LOG"
    # AND NAME THE GAP FILLS TOO, EVEN THOUGH WE ARE REFUSING [#524, antagonist A's NOTE 7]. RP_BAD used to
    # short-circuit here, so a diff carrying BOTH a refusing condition and a gap fill was silent about the
    # free number it also turns `issued` - A measured `grep -c 363` = 0 on exactly that diff. A5(a)'s whole
    # point was that the log must name every number being spent, and a refusal is no excuse for omitting one:
    # the reader of a refused log is the person deciding what to do next.
    if [ -n "$RP_FILL" ]; then
      say "    AND THE SAME DIFF ALSO FILLS A GAP, which the refusal above does not mention:"
      printf "$RP_FILL" | tee -a "$LOG"
    fi
    if [ -n "$RP_ROWBAD" ]; then
      say "    AND, JUDGED AS ROWS [#529], THE SAME DIFF GAINS ROWS NO TOOL IN gates/ WRITES:"
      printf '%s\n' "$RP_ROWBAD" | tee -a "$LOG"
    fi
    exit 1
  fi
  # ROWS NO TOOL WRITES ARE REFUSED WHEN THE NUMBERS ARE OTHERWISE FINE [#529, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
  # exit 1 and not exit 2, for the reason the gap fill below cannot share: the full suite runs no series check
  # and reads no row, so a copy or an unvouched built row sent there would land. The reasons are printed with
  # %s, never as a format, because every byte of them came from a row a hand may have written.
  if [ -n "$RP_ROWBAD" ]; then
    say ""
    say "FAST GATE REFUSED - gates/build-numbers.tsv gains a row no tool in gates/ writes [#529]. The register is"
    say "    APPEND-ONLY, so it cannot be edited out again once it lands:"
    printf '%s\n' "$RP_ROWBAD" | tee -a "$LOG"
    if [ -n "$RP_FILL" ]; then
      say "    AND THE SAME DIFF ALSO FILLS A GAP, which the refusal above does not mention:"
      printf "$RP_FILL" | tee -a "$LOG"
    fi
    exit 1
  fi
  if [ -n "$RP_FILL" ]; then
    say ""
    say "FULL SUITE REQUIRED - gates/build-numbers.tsv fills a GAP rather than appending a mint [#524]:"
    printf "$RP_FILL" | tee -a "$LOG"
    say "    This is not refused: #454's census (f6127fcb36, gates/build-numbers.tsv and nothing else) filled"
    say "    123 such numbers legitimately, so refusing it would refuse honest work. It does not get the FAST"
    say "    door, because nothing here can tell a census from a hand-written row claiming a free number, and"
    say "    the register is append-only. Run: gates/gates.sh \"#<N>\""
    exit 2
  fi
  # AND ASK THE MINTER ITSELF. This is the predicate the wedge actually breaks, so it is the one that decides.
  # UNDER ITS OWN DEFAULT WHEN THE CALLER'S MARGIN IS ONE IT REFUSES [#529, jobs/the-register-arm-of-fastgate-asks-buildnum-sh-next-under-the-callers-environment-so-an-unusable-margin-refuses-an-honest-mint-at-exit-1-2026-10-20].
  # gates/buildnum.sh exits 2 on a BUILDNUM_MAX_DELTA outside 1..9999 BEFORE it reads the register, so `next`
  # asked under that environment says nothing about this tree, and this arm read the refusal as "this commit
  # would wedge the next mint": exit 1, which prompts/build-run STEP 0F reads as STOP. MEASURED on an honest
  # one-row mint commit made by the real `buildnum.sh mint`: 0, abc and twenty digits each gave EXIT 1 FAST GATE
  # REFUSED on 366428f, on #527's tree and on this tree before the change, and 10 gave EXIT 0. That is #524
  # antagonist B's finding 2, which plaus_delta's comment says was closed; it was closed in plaus_delta only.
  # plaus_delta has already judged the value (PLAUS_DELTA_SRC begins "BUILDNUM_MAX_DELTA is set to" only when it
  # is unusable), so this asks the minter with the variable removed, which is the margin the next real mint will
  # use, and says so. A usable override is passed through unchanged, as before.
  case "$PLAUS_DELTA_SRC" in
    "BUILDNUM_MAX_DELTA is set to"*)
      say "register plausibility [#529]: asking gates/buildnum.sh next with BUILDNUM_MAX_DELTA removed, because it"
      say "  refuses the value set; an environment fault, not a fault of the tree."
      RP_OUT="$(cd "$ROOT" && env -u BUILDNUM_MAX_DELTA bash "$G/buildnum.sh" next 2>&1)"; RP_RC=$? ;;
    *)
      RP_OUT="$(cd "$ROOT" && bash "$G/buildnum.sh" next 2>&1)"; RP_RC=$? ;;
  esac
  if [ "$RP_RC" != 0 ]; then
    say ""
    say "FAST GATE REFUSED - gates/build-numbers.tsv changed and gates/buildnum.sh next now REFUSES on the head"
    say "    register (exit $RP_RC), so this commit would wedge the next mint [#523]:"
    printf '%s\n' "$RP_OUT" | sed 's/^/    /' | tee -a "$LOG"
    exit 1
  fi
  # WHAT THIS LINE MAY CLAIM IS EXACTLY WHAT RAN [#524]. It used to say "every new number in this diff is
  # contiguous with the base register top" on a path that SKIPPED every number at or below that top - A's
  # 5(a), where a planted `363 minted` row got a fast green under a log asserting a check it had not done.
  # Both doors are now walked, so the sentence is true; and it names the count, so a reader can see k.
  say "register plausibility [#523, bound corrected #524]: $RP_I new build number(s) above the base register"
  [ -n "$RP_HELDOK" ] && say "  ($RP_K of them count toward the ceiling of three; gates/held-trees.tsv vouches for$RP_HELDOK, which a held run's unlanded mint needs.)"
  say "  top of #$RP_TOP, each contiguous with it (an honest mint is highest+1, so the Nth new number may be"
  say "  at most #$RP_TOP+N) and at most three in one commit; NO new number at or below #$RP_TOP, which would"
  say "  be a gap fill rather than a mint and goes to the full suite; and gates/buildnum.sh next still answers"
  say "  exit 0 on the head register ($RP_OUT)."
  say "  And judged as rows [#529]: every appended row carries nine fields and a state the tools write, none is"
  say "  a copy of another row, and every appended built row names a bundle app.js or a hex held-trees row holds,"
  say "  or shares its number and runId with a row appended in this diff that does."
  # WHAT THIS ARM DID NOT CHECK, SAID ON THE GREEN PATH [#524, antagonist B finding 6]. B appended one row
  # claiming the LIVE number #524 for another runId and took EXIT 0 FAST GATE GREEN under the line above; at
  # 25 rows for 500..524 it was still green and still "0 new build number(s)", while
  # `CT_RUNID=<the true holder> buildnum.sh stampable 524` went to NOT STAMPABLE - permanently, because the
  # register is append-only. The bound is over the NUMBERS that appear, so a row for a number the base already
  # carries is outside it by construction. The green line read as a clean bill over a register diff that
  # nothing had examined, which is the thing #450 is about; now it says so.
  RP_SAME="$(grep -vxF -f <(grep -v '^[[:space:]]*#' "$RP_B2" 2>/dev/null || true) <(grep -v '^[[:space:]]*#' "$RP_H2") 2>/dev/null \
             | cut -f1 | awk 'NF && $1 ~ /^[0-9]+$/ {sub(/^0+/,"",$1); if($1=="")$1="0"; print $1}' | sort -u \
             | grep -cxF -f <(printf '%s\n' "$RP_BASENUMS2") 2>/dev/null || true)"
  [ -n "$RP_SAME" ] || RP_SAME=0
  say "  NOT CHECKED BY THIS ARM, stated rather than left to be found: $RP_SAME appended row(s) name a number the"
  say "  base register ALREADY carries. Since #529 every appended row is judged as a row (nine fields, a state the"
  say "  tools write, no copy, and a built row's bundle held in this history), but NOT by its runId, so one written"
  say "  for another run can still make a live number NOT STAMPABLE for its true holder, append-only and for good."
  rm -f "$RP_B2" "$RP_H2"
fi

STAMPONLY=""
if [ -n "$APPDIFF" ]; then
  so_selftest; SO_ST=$?
  case "$SO_ST" in
    0) say ""
       say "stamp-only controls, all answered correctly against fixtures cut from this base's own app.js:"
       say "    (a) a same-length restamp is recognised   (b) one code byte outside the stamps is not"
       say "    (c) a non-stamp byte inside a stamp site is not   (f) a one-character-longer valid stamp is not"
       say "    (g) every stamp this exemption accepts is accepted by the regex in gates/regress/49-home.js" ;;
    2) say ""
       say "FULL SUITE REQUIRED. There is no base app.js to cut the stamp-only controls from, so the exemption"
       say "    cannot be proven and is not taken."
       say "    $APPDIFF"
       exit 2 ;;
    3) # COULD NOT BUILD OR RUN THE FIXTURES. THIS IS exit 2, NOT exit 1, AND THE DISTINCTION IS A's VETO AT
       # #514 - the only finding in either antagonist pass that was a MEASURED REGRESSION AGAINST MAIN rather
       # than a false claim. The controls did not answer WRONGLY here; they gave no answer at all, e.g. a base
       # app.js carrying FOUR stamp sites because somebody shipped a feature showing the build in one more
       # place, or no node on PATH. Such a commit belongs in the full suite, which is exactly where it was
       # going before this script existed: REPRODUCED from both doors, the identical commit shape returns
       # EXIT 2 on origin/main's copy and returned EXIT 1 here. Refusing it is the exit-code mistake the
       # records-ratchet block below records as #509's own, committed a third time.
       # AND THE REASON NOW GOES THROUGH say() SO IT REACHES THE ARCHIVED LOG. It used to go to stdout only,
       # so gates/logs/fast-*-all.log carried NO explanation - measured 0 occurrences of FIXTURE-UNAVAILABLE
       # in the archive by both antagonists - and told the next run the controls had answered incorrectly,
       # which was false and sent it hunting a bug in so_pred that is not there.
       say ""
       say "FULL SUITE REQUIRED. The stamp-only controls could not be BUILT or RUN, so the exemption is not"
       say "    proven and is not taken. This is NOT a wrong answer from the controls; it is no answer:"
       say "    ${SO_FIXWHY:-(no diagnostic captured)}"
       say "    $APPDIFF"
       exit 2 ;;
    *) # A CONTROL ANSWERED WRONGLY. THIS STAYS exit 1 AND THE TWO ARMS ARE DELIBERATELY NOT ONE - antagonist
       # B's cross-read point, and it is right: a LYING instrument needs fixing, and exit 2 would let every
       # future run route around it unnoticed. Only "could not be built" (arm 3) becomes GO FULL. Collapsing
       # both onto 2 would have weakened the guard while fixing the regression.
       say ""
       say "FAST GATE REFUSED - A STAMP-ONLY CONTROL ANSWERED INCORRECTLY, so this script will not use the"
       say "    exemption to decide anything. An unproven control is not a control [R08]. File at priority 16."
       exit 1 ;;
  esac
  # `cat-file -t` and not `rev-parse --verify <rev>:<path>`: a DIRECTORY resolves to a tree id as happily as a
  # file resolves to a blob, and #509's antagonist A proved that reading a tree with `cat-file blob` truncates
  # to 0 bytes and makes an empty-against-empty comparison succeed - the block printing its own success line.
  # `^{blob}` is NOT the remedy; it answers `fatal: Needed a single revision` on a real blob.
  SO_BT="$($GIT cat-file -t "$BASEFULL:app.js" 2>/dev/null || echo none)"
  SO_HT="$($GIT cat-file -t "$HEAD:app.js" 2>/dev/null || echo none)"
  SO_B="$(mktemp)"; SO_H="$(mktemp)"; FG_TMPS+=("$SO_B" "$SO_H")   # #527: see FG_TMPS
  if [ -z "$SO_B" ] || [ -z "$SO_H" ] || [ ! -f "$SO_B" ] || [ ! -f "$SO_H" ]; then
    say ""; say "FULL SUITE REQUIRED. mktemp failed, so the stamp-only test could not be run at all."
    say "    $APPDIFF"; exit 2
  fi
  $GIT cat-file blob "$BASEFULL:app.js" > "$SO_B" 2>/dev/null || true
  $GIT cat-file blob "$HEAD:app.js"     > "$SO_H" 2>/dev/null || true
  if [ "$SO_BT" != blob ] || [ "$SO_HT" != blob ] || [ ! -s "$SO_B" ] || [ ! -s "$SO_H" ]; then
    SO_OUT="NOT-STAMP-ONLY app.js is not a non-empty blob on both sides (base $SO_BT, head $SO_HT)"
    SO_RC=1
  else
    SO_OUT="$(so_pred "$SO_B" "$SO_H")"
    SO_RC=$?
  fi
  rm -f "$SO_B" "$SO_H"
  if [ "$SO_RC" = 0 ]; then
    STAMPONLY=yes
    # ── PART 2 CALL SITE, #523. The exemption is not taken until the stamp is PLAUSIBLE as well as stamp-only.
    PLAUS_REG="$(mktemp)"; FG_TMPS+=("$PLAUS_REG")   # #527: see FG_TMPS
    if [ -z "$PLAUS_REG" ] || [ ! -f "$PLAUS_REG" ]; then
      say ""; say "FULL SUITE REQUIRED. mktemp failed, so the stamp-plausibility arm could not be run at all."
      say "    $APPDIFF"; exit 2
    fi
    $GIT cat-file blob "$HEAD:gates/build-numbers.tsv" > "$PLAUS_REG" 2>/dev/null || true
    PL_B="$(mktemp)"; PL_H="$(mktemp)"; FG_TMPS+=("$PL_B" "$PL_H")   # #527: see FG_TMPS
    $GIT cat-file blob "$BASEFULL:app.js" > "$PL_B" 2>/dev/null || true
    $GIT cat-file blob "$HEAD:app.js"     > "$PL_H" 2>/dev/null || true
    PL_R="$(mktemp)"; FG_TMPS+=("$PL_R")   # #529: the BASE register, for the series top plaus_pred measures from
    $GIT cat-file blob "$BASEFULL:gates/build-numbers.tsv" > "$PL_R" 2>/dev/null || true
    PL_M5="$(md5sum < "$PL_H" 2>/dev/null | cut -c1-12)"
    plaus_pred "$PL_B" "$PL_H" "$PL_M5" "$PL_R"; PL_RC=$?
    rm -f "$PLAUS_REG" "$PL_B" "$PL_H" "$PL_R"
    case "$PL_RC" in
      0) say ""
         say "stamp plausibility, both witnesses [#523]: $PLAUS_WHY" ;;
      1) say ""
         say "FAST GATE REFUSED - the stamp plausibility arm answered that this tree must not take a fast green:"
         say "    $PLAUS_WHY"
         exit 1 ;;
      *) say ""
         say "FULL SUITE REQUIRED. app.js differs by its build stamp only, but that stamp is NOT a plausible"
         say "    build, so the exemption is not taken [#523]:"
         say "    NOT-STAMP-ONLY $PLAUS_WHY"
         say "    $APPDIFF"
         exit 2 ;;
    esac
    say ""
    say "app.js differs from the base BY ITS BUILD STAMP ONLY, so it does not force the full suite:"
    say "    $APPDIFF"
    say "    $SO_OUT"
    say "    FIVE assertions read the build stamp: two are FORMAT (one of them 49-home.js:554's regex, which"
    say "    control (g) checks rather than assumes) and three are GEOMETRY, held by the equal-length pin above."
    say "    The three gates that read app.js off disk match minified CODE, byte-identical here."
  else
    say ""
    say "FULL SUITE REQUIRED. app.js is not byte-identical to the base and the difference is NOT stamp-only:"
    say "    $APPDIFF"
    say "    $SO_OUT"
    exit 2
  fi
fi


# ── DOES THIS HEAD CARRY .nojekyll? MEASURED ONCE, FROM THE OBJECT STORE, AND USED BY classify() BELOW. ─────
# Added #509. The root-.md arm of classify() used to be an unconditional FORCE whose stated reason was "GitHub
# Pages runs Jekyll here (no .nojekyll), so index.md would be SERVED". That reason was true and the arm was
# still wrong, because RUN-LOG.md and HANDOFF.md are both root-level .md and CLAUDE.md requires BOTH at every
# close-out - so the arm forced the 84-minute suite on every commit that records a build, in order to guard
# against a root index.md that does not exist. Measured on main's last 400 commits: that one arm costs 90 of
# them the fast tier IN THE TREE THAT MEASUREMENT WAS TAKEN ON (#508's). BE PRECISE ABOUT WHICH MARGINAL THIS
# IS, because #509's antagonist A caught the first draft stating one number unconditionally: with the two guard
# registers FORCE, as they are here, moving root .md to records takes the reachable set 83 -> 173, a marginal of
# 90; with them records-only it would be 96 -> 192, a marginal of 96. Both antagonists re-derived all four
# figures independently and both reproduced 83 / 173 / 96 / 192 exactly.
# THE FIX IS TO REMOVE THE PREMISE RATHER THAN THE RULE. With .nojekyll at the root, GitHub Pages serves the
# tree statically and does NOT RENDER a root index.md. BE EXACT, because #509's first draft said "not rendered
# or served at all" and both antagonists called the second half false: a root index.md IS still served,
# verbatim, at /index.md. What .nojekyll removes is the RENDERING, not the file.
# AND THE CROSS-READ WENT FURTHER, SO THE REASON FOR THIS ARM IS NOT THE ONE IT LOOKS LIKE. Measured on this
# tree: of 31 tracked .md files ZERO carry YAML front matter, and Jekyll renders only files that have it,
# copying the rest verbatim as StaticFiles - so a root index.md WOULD NOT HAVE BEEN RENDERED AT / EVEN WITHOUT
# .nojekyll, and index.html is tracked at the root so / resolves to it either way. THE OLD ARM'S STATED PREMISE
# WAS THEREFORE ALREADY FALSE for the only index.md this repository could plausibly grow. The honest reason for
# this change is NOT "it closes a live Jekyll render path" but "un-forcing root .md needs the dotfile-publishing
# switch to be explicit, present, and itself FORCED" - which is what .nojekyll falling to the default *) arm
# gives. That matters because a fix justified by a consequence nobody can reproduce gets withdrawn along with
# its reason. The one real shipped-surface delta: Jekyll does not publish dotfiles, so /.nojekyll and
# /.gitignore become fetchable URLs that were not before; .gitignore was read and carries scratch paths and
# comments, no secret. So the arm is now CONDITIONAL on that
# file, and if somebody ever deletes it the arm goes straight back to FORCE with no further edit. That is why
# this is a measurement and not a constant: a rule whose premise is a file should read the file.
# ASKED OF THE OBJECT STORE AT HEAD, NOT OF THE FILESYSTEM. docs/fast-gate-state records a field withdrawn in
# full for exactly this mistake - it concluded this script did not exist on main because `ls` returned no such
# file, when `git cat-file -e <sha>:gates/fastgate.sh` succeeded at both shas it named. An ls of a working
# directory is not a measurement of a commit, and fast mode gates a COMMIT.
# AND IT MUST BE A BLOB. #509's antagonist A found that the first draft asked `rev-parse --verify`, which
# resolves a DIRECTORY named .nojekyll to a tree id and reported `yes`: GitHub Pages sees no .nojekyll FILE, so
# Jekyll still runs and a root index.md is still rendered at /, and the arm below would have called it
# records-only. Demonstrated end to end at exit 0. `cat-file -t` is the working form and `^{blob}` is not -
# `rev-parse --verify "<sha>:<path>^{blob}"` answers `fatal: Needed a single revision` on a real blob.
NOJEKYLL=no
[ "$($GIT cat-file -t "$HEAD:.nojekyll" 2>/dev/null || echo MISSING)" = blob ] && NOJEKYLL=yes
say "root .nojekyll at head: $NOJEKYLL (a BLOB, not merely a resolvable path; it decides whether a ROOT-level"
say "  .md is records-only - see classify. Absent or a directory means the ROOT .md arm goes back to FORCE.)"

# ── IS gates/build-numbers.tsv STILL UNDER THE RECORDS DOOR'S VALUE RATCHET? ASK THE DOOR. ──────────────────
# Added #521 with the arm it guards. The arm below calls the build-number register records-only, and the ONLY
# thing standing between that and an edited row is gates/records-gate.sh's APPENDONLY ratchet. So the arm asks
# whether that ratchet still covers the register instead of assuming it: drop the entry and the register goes
# straight back to FORCE with no further edit, which is strictly the #509 state and therefore safe by default.
#
# IT ASKS THE DOOR THROUGH ITS OWN `--entries` INTERFACE, AND THE TWO VERSIONS THIS REPLACES ARE WHY [#521
# blind pair, both doors]. My first version grepped `^RATCHET_APPENDONLY=` in `$HEAD:gates/records-gate.sh` and
# asserted in this comment that "one anchored pattern avoids it". ANTAGONIST B BROKE IT: a line-anchored grep
# still matches a TRAILING COMMENT on that same line, so
#     RATCHET_APPENDONLY="gates/held-trees.tsv FEEDBACK-INBOX.md DECISIONS-LOG.md"   # gates/build-numbers.tsv moved to its own door
# answered `yes` for a door that had dropped the entry, and B drove it to EXIT 0 FAST GATE GREEN over a head
# commit that REWROTE THREE REGISTER ROWS IN PLACE. My second version extracted the quoted VALUE and matched it
# whole-word, which closes that and the three other false-yes spellings ANTAGONIST A then enumerated (a longer
# path, a differently-prefixed path, and a later re-assignment: 4 of 11 spellings A drove).
# A BROKE THE SECOND VERSION TOO, AND THAT IS WHY NEITHER SURVIVED. Reading the door's SOURCE is reading the
# wrong object: the `"$G/records-gate.sh" "$BASEFULL" "$HEAD"` call below RUNS the door from the WORKING TREE
# (DE-PINNED FROM A LINE NUMBER ON B's CROSS-READ: I first wrote "line 789", which was true of the tree I
# measured on, 740 at the previous commit of this same change and different again now, because every comment I
# add to this file moves it. That is #450's one-line-number-two-trees shape committed inside the build whose own
# classify() comment flags it, so the reference is to the CALL and not to a line) while both of my
# versions read it from the OBJECT STORE at $HEAD. The only thing tying those together is `git status`, which is
# not a content check and is suppressible - A drove `git update-index --assume-unchanged gates/records-gate.sh`,
# defanged the working-tree door, committed an in-place register row edit, and got "ratchet at head: yes" and
# EXIT 0 FAST GATE GREEN WITH NO PRIOR COMMIT AT ALL.
# SO STOP MAINTAINING A SECOND LIST. `records-gate.sh --entries` prints one `MODE<TAB>path` per ratcheted entry
# and exists for exactly this - the door's own header calls it "two lists cannot drift when there is one list".
# Asking it is immune to every spelling in A's matrix, because it is the door's own parse rather than a
# re-implementation of it, and it reads THE SAME FILE fastgate is about to execute. If the door is missing,
# unreadable, or prints nothing, the match fails and BNRATCHET stays `no`, which FORCES: every failure is
# fail-safe. THE GENERAL LESSON, which cost two versions in one run: a guard that re-implements another file's
# parse is the twelfth costume of CLAUDE.md's trap, and the fix is never a better regex - it is to ask the thing
# itself. The hazard is also bigger than my first comment's figure: that comment said the file names this path
# in "nine other places", and A measured 35 occurrences across 30 lines (28 besides the assignment and the
# baseline), so the surface a source-grep had to get right was three times what I claimed.
# CAPTURE FIRST, THEN MATCH - NEVER PIPE INTO `grep -q` UNDER pipefail [#524]. This was
#   "$G/records-gate.sh" --entries 2>/dev/null | grep -qxF "..." && BNRATCHET=yes
# and under `set -uo pipefail` it is a RACE, not a read: grep -q exits the moment it matches (the 2nd of 9
# lines), records-gate.sh then takes SIGPIPE, the PIPELINE status becomes 141, the && never fires, BNRATCHET
# stays `no`, and classify() sends the register to FORCE for a reason that has nothing to do with the commit.
# MEASURED by #523's antagonist B three ways: 9 misses in 150 trials of the bare pipeline (6.0 per cent per
# invocation); 0 misses in 25 with pipefail off, so the interaction and not records-gate.sh; and 4 of 10
# `fastgate-drive.sh fixed` runs RED under load, with causation proved deterministically by forcing
# BNRATCHET=no and getting a byte-identical failure signature. It is LOAD-DEPENDENT - a quiet box missed 0 in
# 150 - and the load condition is exactly the one gates.sh runs this under, with the suite writing its log.
# On main the race was merely fail-safe (one commit routed to the full suite); #523 wired it into GATES GREEN
# itself, which is the one artefact that authorises a push, so a coin flip became load-bearing.
# gates/verify-log.sh already names this class at its own arm 5 ("therefore no SIGPIPE: rc 0 at every n").
BNRATCHET=no
BN_ENT="$("$G/records-gate.sh" --entries 2>/dev/null || true)"
# AND THE MATCH IS IN-SHELL TOO [#524, antagonist A claim 2]. Capturing into BN_ENT took records-gate.sh out
# of the pipeline, which is the fix that mattered - but the replacement was still `printf | grep -qxF` under
# `set -uo pipefail`, i.e. the identical SHAPE, safe only because --entries is small. A measured it: 244 bytes
# over 9 lines gives 0 misses in 200 trials, while the same construct at 300 KB gives 60 misses in 60. So it
# was safe BY PAYLOAD SIZE against the 64 KiB pipe buffer, not by construction, and any growth of --entries
# past that re-opens exactly the defect #523 was held for. A quoted `case` has no pipe to break. The TAB is
# built once into a variable because a pattern cannot carry a $(printf) safely.
BN_WANT="$(printf 'appendonly\tgates/build-numbers.tsv')"
case "$BN_ENT" in *"$BN_WANT"*) BNRATCHET=yes ;; esac
say "gates/build-numbers.tsv in the records door's APPENDONLY ratchet (asked of the door via --entries, which is"
say "  the same file this script runs below): $BNRATCHET - it decides whether the register is records-only."

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
    # #509 TRIED TO MOVE THESE TWO PATHS TO RECORDS AND WITHDREW IT ON BOTH ANTAGONISTS' VETO, AND #521 HAS NOW
    # MOVED EXACTLY ONE OF THEM. The move was part two of its job: minting a build number appends a row to
    # build-numbers.tsv, so a shared FORCE arm made the fast tier unreachable by every run that takes a number.
    # #509 built the append-only byte ratchet to replace the protection and ITS RATCHET WAS NOT SUFFICIENT, which
    # was measured rather than argued. (a) ONE APPENDED NUL BYTE satisfies every byte condition - it grows the
    # file and changes no base byte - and takes held-trees.tsv from 12 live rows to 0, `held.sh check` from exit 1
    # to exit 0 and `buildnum.sh stampable 509` from exit 1 to exit 0, because grep goes binary on a NUL and
    # suppresses the matching lines. (b) ONE WELL-FORMED APPENDED ROW numbered 9999 - a legitimate append by every
    # condition there is - wedges `buildnum.sh next` and `mint` project-wide, and removing it is a PREFIX failure,
    # so the UNDO is not a records commit and costs the full suite.
    #
    # BOTH OF (a) AND (b) ARE NOW CLOSED FOR THE BUILD-NUMBER REGISTER, BY WORK THAT LANDED SINCE, AND THAT IS THE
    # WHOLE WARRANT FOR THIS ARM. (a) is closed by the records door's TEXT condition, which refuses a NUL in an
    # APPENDONLY record and is controlled end to end by `gates/records-gate.sh selftest` C3 and - on this very file
    # rather than only on its sibling - by C9. (b) is MADE LOUD, NOT CLOSED, by gates/buildnum.sh's SERIES
    # BOUND, which landed at #520 (08d4e07, controls at c51462e) and refuses a stray cluster of any size rather
    # than bounding only the top two numbers; its 170 controls run as a command. The consumer half - a register
    # whose consumer parses zero rows from it is refused - landed as records-gate.sh's parse-stability arm at
    # #518 (e716161) with its follow-up at #520 (f193594).
    #
    # "CLOSED" WAS MY WORD FOR (b) AND BOTH OF #521's ANTAGONISTS FALSIFIED IT INDEPENDENTLY, FROM OPPOSITE
    # DOORS, SO IT IS WITHDRAWN HERE [R18] AND THE RESIDUAL IS NAMED. #509's two clauses for attack (b) - that a
    # well-formed appended row "wedges buildnum.sh next and mint project-wide", and that "removing it is a PREFIX
    # failure, so the UNDO costs the full suite" - are BOTH STILL TRUE, and from #521 the PLANT is cheap while
    # the UNDO is still refused. Measured on one commit over today's main: an appended row numbered #999 (B) or
    # #600 (A) takes EXIT 0 FAST GATE GREEN; `buildnum.sh next` then exits 2 with "number(s) cut off from its own
    # series" and NO RUN CAN MINT until a human retires the row or every call carries BUILDNUM_MAX_DELTA; and
    # deleting the row answers EXIT 1 "NOSHRINK". A also drove the ACCIDENT rather than only the attack: a mint
    # row with one extra digit typed (521 -> 5211) is in range and does the same. A SECOND VALUE CLASS that none
    # of (a), (b) or (c) sees: one appended row claiming a number for a different runId flips ownership, so
    # `CT_RUNID=<the true holder> buildnum.sh stampable <N>` goes exit 1 and the true holder is locked out of its
    # own number - which is the #519/#520 incident, found then by a cross-read and by no tool.
    #
    # WHAT IS AND IS NOT NEW, because the counterweight is both antagonists' own and it decides the severity.
    # gates/buildnum.sh is an OPERATOR tool and gates/gates.sh never runs it, so THE FULL SUITE NEVER CHECKED
    # THESE VALUES EITHER: the FORCE arm was a TOLL, not a check. What #521 changes is the PRICE of the plant
    # (about 110 minutes to about 7 seconds) and the verdict word, not its reachability. That is a real cost, and
    # it is why the series bound was a prerequisite: it turns a SILENT wedge into a LOUD refusal that names the
    # problem at the next mint. What it does not do is prevent the plant.
    # THE FIX THAT WOULD CLOSE IT IS A's AND IS DELIBERATELY NOT TAKEN HERE: a value-plausibility arm in this
    # door's build-numbers case, refusing an appended row whose number is cut off from the series - the predicate
    # gates/buildnum.sh:256 `delta_ok` already computes from `series_run()`, so the work is a control set and a
    # call site and not a new algorithm. It would have refused every one of both antagonists' appends. It is a
    # new guard in a second file needing its own controls, and Kunal's authorisation for #521 covers taking this
    # path out of the FORCE arm and nothing wider - and A agreed, saying it would have objected had I done it,
    # because shipping a values guard with no controls in the same run that removes the values protection is the
    # shape this project files against. So: three landed mechanisms for the BYTES, a loud refusal at mint time
    # for the VALUES, and the gap between them stated here rather than papered over.
    #
    # KUNAL'S YES IS WHAT PERMITS IT, and it is recorded rather than inferred: his standing rule is that no FORCE
    # arm moves without his word, and he gave it in chat at about 11:26am ET on 14 Oct 2026 ("Yes.") to this exact
    # change, having been told in plain words what it does. The direction is on
    # jobs/the-tier-check-compares-a-stamped-bundle-so-no-rebuild-is-ever-byte-identical-2026-10-10 at
    # kunalNamedNextJob_2026_10_14, and the opening is docs/restart-readiness directOpening_2026_10_14.
    #
    # gates/held-trees.tsv STAYS FORCE, ALONE, AND IT IS HELD BACK ON A MEASURED GAP RATHER THAN ON CAUTION. The
    # records door's consumer arm counts rows with `consumer_row_count`, which copies gates/held.sh's `live_rows`
    # (NF>=6) while `held.sh check` itself uses `match_rows` (NF>=2) at held.sh:48. LIVE IS A SUBSET OF MATCH, so a
    # drift that drops a row of 2 to 5 fields is INVISIBLE to the arm and VISIBLE to the consumer - a false ACCEPT,
    # declared at records-gate.sh:782-783. MEASURED HERE through both consumers' OWN pipelines rather than
    # re-derived: match_rows 11, live_rows 11, and the BAND (NF>=2 and NF<6, uncleared, non-comment) is ZERO, so
    # the false accept is LATENT and not live. The job's own whatItDoesNotCover makes settling that the condition
    # for moving this path, and this run did not settle it, so the arm is SPLIT and held-trees.tsv keeps what it
    # has. That is the instruction followed, not a judgement substituted for it.
    #
    # A FIGURE OF MY OWN IS WITHDRAWN HERE, AND IT WAS NEVER IN THIS COMMENT [R18]. This paragraph has read 11
    # and 11 since I wrote it, carried from the job's carry-in. But I then RE-MEASURED with a naive
    # `awk -F'\t' 'NF>=6{l++} NF>=2{m++}'` that excluded neither `#` comment lines nor rows cleared with a
    # leading `-`, got 13 and 13, and published THAT pair in this run's commit message and in the brief I handed
    # both blind antagonists as claim C8. held.sh's own match_rows and live_rows (held.sh:33-34) exclude both, and
    # re-run verbatim they give 11 and 11. So the carry-in was right, my re-measurement was the wrong one, and the
    # document I was most confident about was the one I corrupted. What caught it was not care: it was running
    # `held.sh check`, which prints "11 matchable row(s) checked" in its own output and contradicted me.
    #
    # AND THE SPLIT IS THE RIGHT SHAPE FOR A MEASURED REASON, NOT ONLY BECAUSE THE INSTRUCTION SAID SO. The gap
    # above is SPECIFIC TO held-trees.tsv. For the register that MOVED there is no such asymmetry at all:
    # consumer_row_count's build-numbers.tsv arm (records-gate.sh:238) is `NF>=2 && $1 ~ /^[0-9]+$/`, which is
    # BYTE-IDENTICAL to gates/buildnum.sh:102's own `rows()` - the single filter every buildnum consumer reads
    # the register through - and both read 500 rows on this tree. So the arm counts EXACTLY what the consumer
    # counts for the file whose protection now leans on it, and miscounts only for the file left FORCE. That is
    # the opposite of what a cautious compromise would have produced, and it is why this is a split rather than a
    # deferral of both.
    #
    # WHAT THE SPLIT IS WORTH, RE-MEASURED BY THIS RUN RATHER THAN CARRIED - AND THE FIGURES I FIRST WROTE HERE
    # WERE THE INHERITED ONES AND DO NOT REPRODUCE, SO THEY ARE WITHDRAWN IN THE COMMENT THAT CARRIED THEM [R18].
    # My own first draft of this paragraph repeated #509's published numbers, that the tier "reaches 173 with root
    # .md records-only and 192 with these two as well". MEASURED HERE over origin/main's last 400 commits, running
    # each version's OWN classify() over each commit's changed set (git diff --name-only --no-renames c~1..c),
    # NOJEKYLL=yes on both sides:
    #     main's classify() today                                       162 of 400
    #     this arm, app.js never exempt                                 181 of 400   (+19)
    #     this arm, app.js exempt UNCONDITIONALLY (an upper bound)       192 of 400   (+30)
    #     this arm, with #514's stamp-only condition ACTUALLY APPLIED      191 of 400   (+29)
    # THE MARGINAL OF +19 REPRODUCES EXACTLY; THE ABSOLUTES DO NOT. 162 against the 173 in circulation, and the
    # 192 published as this arm's pure-classify figure is in fact the figure WITH #514's stamp exemption modelled,
    # so two different models were being reported under one number. The 400-commit window has moved by about a
    # week since those figures were taken, which explains drift in an absolute and does not excuse repeating one.
    #
    # AND THE THIRD ROW IS THE ONE THIS JOB EXISTS FOR. On main today the stamp exemption fires on 0 of 400, and
    # that is measured here rather than inherited from #514: base pure-classify and base stamp-exempt are BOTH
    # 162, because every commit that touches app.js also mints a number and the shared arm forced the register, so
    # exempting app.js alone buys nothing at all. With this arm, 11 commits newly reach the exemption and TEN of
    # the eleven actually SATISFY it: 181 -> 191. The 192 row above is app.js exempt UNCONDITIONALLY, an UPPER
    # BOUND, not the exemption applied.
    # THAT DISTINCTION IS ANTAGONIST A's, AND I HAD IT WRONG IN THIS VERY TABLE [R18]. My first version labelled
    # 192 "app.js exempt when the diff is stamp-only (#514)", which asserts the condition was applied; I had
    # modelled app.js as always exempt. A ran so_pred over each of the 11 and found one failure, and I RE-DERIVED
    # IT MYSELF rather than taking the number - extracting the predicate verbatim and running it on each commit's
    # c~1:app.js against c:app.js. Ten return STAMP-ONLY; b5732bc, "#491 mint and bundle: the register rows and
    # the #491 stamp", returns NOT-STAMP-ONLY ("the differing bytes are NOT confined to the 3 stamp sites"), so in
    # the real script it exits 2 at the stamp-only block before this loop is reached. Honest figures: 181 pure,
    # 191 applied (+29, adds 10), 192 bound. ONE COMMIT IN FOUR HUNDRED - and it is the whole point of the
    # paragraph it sits in, because this table exists to withdraw two inherited figures reported under a model
    # other than their label, and I then did the same thing one row lower. A caught it in the same pass.
    # Either way the mechanism stands: this arm is what makes #514's exemption fire AT ALL, which is why neither
    # half of this job does anything alone and why part one correctly shipped with a measured marginal of zero.
    gates/build-numbers.tsv)
            if [ "$BNRATCHET" = yes ]; then echo "RECORDS"
            else echo "FORCE the build-number register, and gates/records-gate.sh --entries no longer lists it as appendonly, so nothing would protect its row VALUES - run that command to see what left the door"
            fi ;;
    gates/held-trees.tsv)                           echo "FORCE a GUARD REGISTER whose protection lives in its row VALUES - #490 antagonists, re-upheld at #509, and held back ALONE at #521 on the consumer_row_count NF>=6 against match_rows NF>=2 gap at records-gate.sh:782-783" ;;
    claude/*|gates/logs/*|gates/*.tsv)              echo "RECORDS" ;;
    # CLAUDE.md IS NOT A RECORD OF WHAT HAPPENED, IT IS THE PUSH BAR ITSELF, AND #509's CROSS-READ IS WHY THIS
    # ARM EXISTS. The root-.md arm below gave CLAUDE.md the NOSHRINK ratchet, which is a LINE COUNT - and
    # antagonist A's reproduced attack was a ZERO-NET-LINE-CHANGE commit. Antagonist B then drove it against
    # #509's own fixed tree and it took a FAST GATE GREEN: 742 lines at base, 742 at head, 9 bytes smaller, and
    # one of CLAUDE.md's two statements of the held-tree requirement gone, on the one file every build session
    # reads before it acts. That is verbatim the sentence the withdrawn part two is condemned by - "the threat
    # is not emptying but DISARMING" - landing on the push bar. APPENDONLY is the wrong arm for it (CLAUDE.md is
    # legitimately edited in place, by deliberate decision) and NOSHRINK is too weak, so the honest answer is
    # that a commit which rewrites the rules every session reads is NOT a records commit. It costs almost
    # nothing: CLAUDE.md is edited rarely, while RUN-LOG.md and HANDOFF.md - the two every close-out writes -
    # stay records-only, which is what part one was for.
    CLAUDE.md)                                      echo "FORCE the push bar itself, not a record of a run: a commit that rewrites the rules every session reads is not a records commit - #509 cross-read" ;;
    */*.md)                                         echo "RECORDS" ;;
    *.md)   if [ "$NOJEKYLL" = yes ]; then echo "RECORDS"
            else echo "FORCE a ROOT-level .md and NO .nojekyll at head: GitHub Pages would run Jekyll, so index.md would be SERVED"
            fi ;;
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
  # THE STAMP-ONLY EXEMPTION IS APPLIED HERE AND NOT IN classify(), AND THE DISTINCTION IS LOAD-BEARING.
  # classify() is asked by THREE callers: this changed-set decision and the TWO premise checks below, which
  # walk what the gates themselves read and REFUSE (exit 1) if a gate requires a file classify() calls
  # records-only. gates/regress/33-reproducible-review.js reads app.js off disk, so making classify() return
  # RECORDS for app.js would break the premise check and retire fast mode outright. The exemption therefore
  # belongs to THIS decision alone: app.js stays FORCE for everyone who asks the classifier, and is dropped
  # from the force set for this one commit only once the stamp-only test above has PROVED the difference is
  # confined to the three stamp sites. Measured on this tree: the job's locus names the bundle compare only,
  # and a bundle-compare-only fix is INERT, because classify()'s own `app.js|chess.jsx|entry.jsx` arm forces
  # app.js by itself. DE-PINNED BY SYMBOL ON A's VETO: this cited "classify():190", which is correct on
  # origin/main's copy and lands inside so_pred in THIS one, because the block above inserts lines. That is
  # #450's "one line number meaning two different things on two trees", committed in the build that
  # re-derived #450's own lesson for the ref line.
  if [ "$p" = app.js ] && [ "$STAMPONLY" = yes ]; then
    # ── WHAT THIS EXEMPTION IS WORTH: AT #514, NOTHING; AT #521, TEN COMMITS IN FOUR HUNDRED. THE #514 TEXT
    # ── IS WITHDRAWN HERE [R18] RATHER THAN LEFT TO BE READ AS CURRENT. It read: "WHAT THIS EXEMPTION IS WORTH
    # TODAY: NOTHING. THE MARGINAL IS ZERO ... gates/build.sh ends every non-CT_OUT build with `buildnum.sh
    # record`, appending a row to gates/build-numbers.tsv, which classify() FORCEs - and a rebuild CANNOT happen
    # without minting, by this project's own rule. So the commit shape a real build produces still takes the full
    # suite." EVERY CLAUSE OF THAT IS NOW FALSE: classify() no longer FORCEs the register, and the commit shape a
    # real build produces is exactly the shape that now takes a fast green - demonstrated as this build's headline
    # control, a close-out-shaped commit (stamp-only rebuild + minted row + RUN-LOG + HANDOFF) answering EXIT 2 on
    # main's script and EXIT 0 FAST GATE GREEN on this one. The minting half was #514's second condition and #521
    # is it. Both antagonists reached #514's version from opposite doors and I re-derived every figure myself.
    # THE NUMBER, over origin/main~400..origin/main, classify() transcribed verbatim, re-derived three times
    # independently and agreeing to the commit: 73 commits touch app.js; 64 of those ALSO touch the register;
    # and the count whose other changed paths are all records-only - where this exemption could actually fire
    # - is ZERO. The remaining 9 are each blocked by chess.jsx, a gates/regress file, gates/lib.js or the held
    # register. AND IT IS A PER-COMMIT UPPER BOUND: fastgate diffs base..HEAD over a whole push, a union that
    # can only ADD blockers, so the per-push figure is at most 0.
    # THE BLOCKER CENSUS, because the register is not the only wall and the next marginal must count them all:
    # gates/build-numbers.tsv 64 of 73, chess.jsx 50, gates/gate-manifest.tsv 18, gates/lib.js 3, held 2.
    # THAT CENSUS IS #514's AND WAS TAKEN ON #514's WINDOW - DO NOT PUBLISH ITS 73 BESIDE THIS BUILD's 191
    # [B's cross-read rider]. On THIS window, off d85ffb0, B censused 61 app.js-touching commits, all of them
    # 3-stamps-to-3-stamps. The two denominators are different windows a week apart and neither is wrong.
    # EVERYTHING FROM "THIS ONE SHIPS 0 OF 400" ONWARD WAS TRUE AT #514 AND IS WITHDRAWN AT #521 [R18], IN THE
    # BLOCK THAT CARRIED IT, BECAUSE #521 IS THE PART TWO IT WAS WAITING FOR. The withdrawn sentences, kept so
    # the change is readable: "THIS ONE SHIPS 0 OF 400 UNTIL PART TWO LANDS"; "It was NOT re-taken here";
    # "the benefit and the new trust surface are gated by THE SAME CONDITION ... so today's RISK is zero as well,
    # not merely the benefit". That last one was #514's whole safety argument and it NO LONGER HOLDS: the
    # condition that made the risk zero was the register's FORCE arm, and this build removed it deliberately.
    # SO STATE THE RISK POSITIVELY INSTEAD OF INHERITING A RETIRED REASSURANCE. From #521 a stamp-only app.js
    # CAN ride a records-tier green, so what stands between a real bundle change and a fast green is now the
    # so_pred stamp-only proof ALONE - its 7 controls, which run on every invocation and refuse at exit 1 if any
    # answers wrongly - plus the served-blob loop above, and no longer the accident that nothing could reach here.
    # MEASURED at #521, each version's own classify() over origin/main's last 400 commits: the exemption reaches
    # 0 of 400 on main's arm, and on this one 11 commits REACH it of which TEN SATISFY it (181 pure-classify ->
    # 191 applied; 192 is the unconditional bound). TEN is the number of commits whose trust now rests on
    # so_pred, and it was 0 yesterday.
    # FOUND BY ANTAGONIST B FROM THE SHIPPED-SURFACE DOOR, which read the LOG rather than the diff and caught
    # that the three printed clauses below - the register is FORCE, a real build still goes full, the marginal is
    # 0 of 400 - were all made false by this very commit and were still being printed on the log that authorises
    # the push, including in this run's own published H2 control log. That is the #490 defect (a sentence stating
    # a discredited reason) landing on the push gate, and the diff-side reading could not see it.
    say "    app.js: classify() forces it, and the stamp-only proof above exempts it for THIS commit."
    say "    (BOTH conditions are now met: #521 took gates/build-numbers.tsv out of the shared FORCE arm, so a"
    say "     commit that rebuilt the bundle AND minted its number CAN reach this tier. Measured over origin/main's"
    say "     last 400 commits: this exemption REACHES 11 commits that were unreachable before and is SATISFIED"
    say "     by ten of them, giving 191 of 400 applied; 192 is the unconditional upper bound, not a count.)"
    continue
  fi
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

# ── WHY THIS BLOCK SITS *AFTER* THE FORCE DECISION, AND IT DID NOT AT FIRST. ─────────────────────────────────
# #509 first placed the records ratchet above classify(), where #490 put its own SHORTER guard. MEASURED and
# it is wrong: a commit that both rewrites a record AND touches chess.jsx must be told GO FULL (exit 2), not
# REFUSED (exit 1) - the full suite is exactly where such a commit belongs, and refusing it stops honest work.
# Control (k2) proves the pre-existing version of that mistake is still live one block below: shrinking
# claude/stories/TEST-CASES.md while touching chess.jsx returns REAL EXIT 1 'a register of cases or stories got
# SHORTER' instead of exit 2 naming chess.jsx. That is #490's and is filed, not fixed here. This block is now
# only ever reached by a commit that WOULD OTHERWISE TAKE A FAST GREEN, which is the only commit it has any
# business judging.
# ── RATCHETED RECORDS. NOW ITS OWN DOOR: gates/records-gate.sh. ────────────────────────────────────
# The 192 lines that stood here - the TEXT, NOSHRINK and APPENDONLY conditions, their two lists, blobtype(),
# the staging directory and every refusal string - are now gates/records-gate.sh, verbatim and moved rather
# than retyped. Part (1) of jobs/build-one-door-for-every-non-gate-check-2026-10-10, which is Kunal's one-door
# decision of 12:49am ET on 2026-10-10. Read that file's header for what this change is NOT: the ratchets are
# still ratchets (part 3 is NOT taken), and the full-suite path does NOT yet call this door (part 2's second
# half is NOT taken). Nothing about what this tier accepts or refuses has changed, and that is measured: this
# script's stdout and its log are byte-identical before and after the move over the same commit pairs.
#
# WHY THE EXIT CODE IS MAPPED AND NOT PASSED THROUGH. The door answers 0 ran-and-clean, 1 refused, 2 could-not-
# run. A records tier that proceeded on 2 would be crediting a check that never compared anything, which is the
# empty-denominator trap CLAUDE.md records eleven times - so 2 refuses here, and the door's own line says why.
# `set -uo pipefail` is on from line 48, so the pipeline below carries the door's status and not tee's.
if ! "$G/records-gate.sh" "$BASEFULL" "$HEAD" 2>&1 | tee -a "$LOG"; then
  exit 1
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
# #527: PSCAN is EXPANDED from PSCAN_PATS, the one definition the read pin near the top of this script also
# hands to git ls-files, so the files the premise reads and the files the pin compares are one set. The string
# is byte for byte the literal it replaces: "$G/regress/*.js $G/mountcheck.js $G/lib.js $G/engine-extract.js $G/drive/*.js".
# BUILT BY A LOOP AND NOT BY ${PSCAN_PATS// / $G/} [#527 v4]: bash 5.2 turns an `&` in a ${//} replacement into
# the matched text, so a checkout path holding `&` broke that form (an independent reader's finding, reproduced
# on this container's bash 5.2.21: "/tmp/a&b/gates" gave "/tmp/a b/gates/mountcheck.js").
PSCAN=""; for _pp in "${PSCAN_ARR[@]}"; do PSCAN="$PSCAN $G/$_pp"; done; PSCAN="${PSCAN# }"
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
# EXISTENCE IS ASKED OF THE COMMIT [#527, Part 3]. Both parts of the premise check used to decide with
# `[ -e "$ROOT/..." ]`, which asks the WORKING TREE, and the working tree can hold what the commit does not:
# MEASURED on #526's script, (1) a records file a committed gate names with path.join, deleted on disk and
# hidden with assume-unchanged, was skipped by part two and the commit took EXIT 0 FAST GATE GREEN; and (2) an
# untracked file matched by .git/info/exclude, at the regress-relative spelling of a gates-level require(),
# made part one keep that spelling (classified FORCE) instead of the gates-relative one the commit carries
# (classified RECORDS), with the same green. H30 and H31 in gates/fastgate-drive.sh are those two. Part one now
# chooses its spelling by what the COMMIT holds; part two counts a reference that is on disk OR in the commit,
# which only ever adds the hidden ones, so no honest count or verdict moves.
in_head(){ $GIT cat-file -e "$HEAD:$1" 2>/dev/null; }
UNCOVERED=""
while IFS= read -r dep; do
  [ -n "$dep" ] || continue
  # resolve relative to gates/regress (where the gates live), with -m so a module id with no file still resolves
  # a dep may be written from gates/regress/ or from gates/ itself (lib.js, drive/*), so resolve BOTH and take
  # the one that names a file that exists; if neither does, judge the regress-relative one, which is the stricter.
  rel="$(realpath -m --relative-to="$ROOT" "$G/regress/$dep" 2>/dev/null || echo "$dep")"
  alt="$(realpath -m --relative-to="$ROOT" "$G/$dep" 2>/dev/null || echo "$dep")"
  if ! in_head "$rel" && ! in_head "$rel.js" && { in_head "$alt" || in_head "$alt.js"; }; then   # #527: the COMMIT decides
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
  # keep only references that name something that really exists in the repo - on disk OR in the commit [#527]
  [ -e "$ROOT/$ref" ] || in_head "$ref" || continue
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
say "  inside the FORCE set."
# THE CONCLUSION IS STATED SEPARATELY AND CONDITIONALLY, BECAUSE THE STAMP-ONLY EXEMPTION ADDS A PREMISE TO IT.
# Before #514 this sentence could be one line: every file a gate reads is FORCE, and nothing FORCE is in the
# diff, therefore no verdict can differ. With the exemption, app.js CAN be in the diff while gate 33 reads it,
# so the conclusion now rests on the stamp-only proof as well, and a log that did not say so would be asserting
# the old reasoning over the new facts - which is #490's defect (a sentence stating a discredited reason) with
# my own change attached.
if [ "$STAMPONLY" = yes ]; then
  say "  app.js IS in this diff, so the no-verdict-can-differ conclusion rests on the stamp-only proof as well."
  say "  Three regress gates read app.js as DATA (33, 66, 67) and match minified CODE; 68 hashes it for a note;"
  say "  gates/lib.js serves it to all 58. Every code byte here is identical, so none of those can differ."
  say "  FIVE assertions DO read the build stamp. Two are format - 49-home.js:554's regex is this script's own"
  say "  anchored, which control (g) checks rather than assumes - and three are GEOMETRY, held by the length pin."
  say "  NOTE WHAT THIS TIER DOES NOT DO: it runs no mountcheck either, so this bundle has been mounted in a"
  say "  browser by nothing. What covers that is the byte proof above, not another gate."
else
  say "  Nothing in the FORCE set is in this diff, so no gate's verdict can differ from its verdict on the base."
fi
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
  wt="$(mktemp -d)" || { red=1; say "    $label: RED (mktemp -d failed - could not create a temp directory for the base worktree)"; return; }
  FG_TMPS+=("$wt")   # #527: removed on every exit path; a kill leaves only a worktree entry for git worktree prune
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

# -- THE CATCH-ALL: EVERY TRACKED FILE, BY ITS BYTES. ADDED #527, PART 3 OF THE STAMP JOB. ----------------------
# The two pins near the top compare the files this tier EXECUTES and the files it READS A VERDICT OUT OF. Every
# check since then has read the working tree somewhere else too, the HEAD half of the two ratchets just above
# most of all, which runs verify-log.sh and control-audit.js in this working tree, and each of those can be fed
# a copy the commit does not hold while `git status` stays clean. So rather than a third list this asks the one
# question they share, after every specific guard has had its say and before the only green this script
# prints: is every tracked file's working-tree content, read RAW (--no-filters), the blob the index records?
# With a clean status the index is the commit. It never asks git whether a file changed; it hashes the bytes,
# so it does not care HOW a status was made to lie: assume-unchanged, skip-worktree, a clean filter in
# .git/info/attributes, a core.fsmonitor hook, stale stat data. One git process hashes them all (0.44 s for the
# 581 tracked files of #526's tree). MEASURED BEFORE IT WAS WRITTEN, on #526's script: a commit adding one dead
# citation to the case register is refused by the records ratchet (FAST GATE RED), and the same commit with
# the register put back on disk as the base had it and hidden with assume-unchanged took EXIT 0 FAST GATE
# GREEN, "records: no worse than base". Controlled by gates/fastgate-drive.sh H28, which hides it four ways.
# It comes LAST and not first on purpose: placed first it would answer H10, H11, H25, H30 and H32 itself, and the
# specific guards those cases control would no longer be shown to work. A checkout whose bytes differ from its
# blobs by design (core.autocrlf, an eol attribute) is refused at exit 1, here or by a pin above, and is NOT
# routed to the full suite [#527 v4: this said it "pays the full suite"]; this repository and the routine's
# container have neither. An entry that is not a plain file (a symlink, a submodule, a conflict stage) is routed
# to the full suite rather than judged. IT SEES TRACKED FILES ONLY: an UNTRACKED file that a check globs or reads
# (verify-log.sh --citations globs gates/*.js and claude/stories/*.md, control-audit.js reads directories) is not
# hashed here, and hidden by .git/info/exclude it is not in `git status` either; an independent reader showed one
# turning the records ratchet RED on an honest commit. Item (4) of WHAT THESE DO NOT COVER in the case register.
CA_IDX="$($GIT -c core.quotePath=false ls-files -s 2>/dev/null)" || CA_IDX=""
if [ -z "$CA_IDX" ]; then
  say ""
  say "FULL SUITE REQUIRED. git ls-files -s listed no tracked file, so the catch-all could not run, and an empty"
  say "    set is reported, never credited. The tiered gate is not taken."
  exit 2
fi
CA_ODD="$(awk -F'\t' '{split($1, m, " "); if ((m[1] != "100644" && m[1] != "100755") || m[3] != "0" || $2 ~ /^"/) print}' <<< "$CA_IDX")"
if [ -n "$CA_ODD" ]; then
  say ""
  say "FULL SUITE REQUIRED. The catch-all hashes file bytes, and these tracked entries are not plain files with a"
  say "    plain path (a symlink, a submodule, a conflict stage or a quoted name), so it does not judge them:"
  awk 'NR<=10 {print "    " $0}' <<< "$CA_ODD" | tee -a "$LOG"
  exit 2
fi
CA_PATHS="$(cut -f2- <<< "$CA_IDX")"
CA_WANT="$(awk '{print $2}' <<< "$CA_IDX")"
CA_GOT="$($GIT hash-object --no-filters --stdin-paths <<< "$CA_PATHS" 2>/dev/null)"
if [ "$CA_GOT" != "$CA_WANT" ]; then
  mapfile -t CA_P <<< "$CA_PATHS"; mapfile -t CA_W <<< "$CA_WANT"; mapfile -t CA_G <<< "$CA_GOT"
  CA_BAD=""; CA_NB=0; CA_HASHED=0
  [ -n "$CA_GOT" ] && CA_HASHED="${#CA_G[@]}"
  for ((i = 0; i < CA_HASHED && i < ${#CA_P[@]}; i++)); do
    if [ "${CA_G[$i]}" != "${CA_W[$i]}" ]; then
      CA_NB=$((CA_NB + 1))
      [ "$CA_NB" -le 20 ] && CA_BAD="$CA_BAD    ${CA_P[$i]}: commit ${CA_W[$i]}, working tree ${CA_G[$i]}\n"
    fi
  done
  if [ "$CA_HASHED" -lt "${#CA_P[@]}" ]; then
    CA_NB=$((CA_NB + 1))
    CA_BAD="$CA_BAD    ${CA_P[$CA_HASHED]}: commit ${CA_W[$CA_HASHED]}, working tree MISSING or unreadable, and git hash-object\n"
    CA_BAD="$CA_BAD      stopped there, so the $(( ${#CA_P[@]} - CA_HASHED - 1 )) tracked file(s) after it were not hashed\n"
  fi
  say ""
  say "FAST GATE REFUSED - $CA_NB tracked file(s) in the working tree are not the blob the commit records, and git"
  say "status did not say so, so a check above may have read a copy the commit does not hold:"
  printf '%b' "$CA_BAD" | tee -a "$LOG"
  say "Find what hides it (git ls-files -v, .git/info/attributes, core.fsmonitor) and run again, or run FULL."
  exit 1
fi

say ""
# #490: "54" was hard-coded and wrong by two, in the one sentence that states the SCOPE of what was skipped,
# while three separate tools compute it (ls gates/regress/*.js = 55, gatemanifest check = 55 required,
# control-audit = 56 sections counting mountcheck). Both antagonists caught it independently. Compute it.
NGATES="$(ls "$G"/regress/*.js 2>/dev/null | wc -l | tr -d ' ')"
say "gates ran: records tier only. The $NGATES browser gates in gates/regress were NOT run, and could not have"
if [ "$STAMPONLY" = yes ]; then
  # "none is in this diff" IS FALSE when the exemption fires - app.js is in the diff - and saying it anyway
  # would be the exact class of defect #490 fixed two lines below. State what was measured instead.
  say "  differed: every file any of them reads is in the FORCE set, re-derived above, and the only one of those"
  say "  in this diff is app.js, whose differing bytes are its three build-stamp literals and nothing else."
else
  say "  differed: every file any of them reads is in the FORCE set, re-derived above, and none is in this diff."
fi
# #490: the old ref line read "bundle UNCHANGED (app.js not in the changed set)", which is VERBATIM the ground
# 6120ecd records as the lie that certified a blank page - a path-list inference. The verdict is now sound because
# BUNDLE IDENTITY compares blob ids, so the line should state THAT and not the discredited reason.
# #490: the ref line must state what was MEASURED. It said "bundle UNCHANGED by BLOB ID over all N served
# files", which stops being true the moment the stamp-only exemption fires - app.js's blob HAS moved. Saying
# otherwise would be the same class of defect #490 fixed here: a log stating a discredited reason.
if [ "$STAMPONLY" = yes ]; then
  say "ref: HEAD $HEAD | base $BASEFULL (= origin/main) | $(set -- $SHIPPED; echo $#) served files: all byte-identical by BLOB ID except app.js, whose only differing bytes are its 3 build-stamp sites (proved above)"
else
  say "ref: HEAD $HEAD | base $BASEFULL (= origin/main) | bundle UNCHANGED by BLOB ID over all $(set -- $SHIPPED; echo $#) served files"
fi
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
