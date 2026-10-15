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
TAMPER=""
for f in gates/records-gate.sh gates/gatemanifest.sh gates/verify-log.sh gates/control-audit.js; do
  hb="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || echo MISSING)"
  wb="$($GIT hash-object "$ROOT/$f" 2>/dev/null || echo MISSING)"
  [ "$hb" = "$wb" ] || TAMPER="$TAMPER    $f: commit $hb, working tree $wb\n"
done
if [ -n "$TAMPER" ]; then
  say ""
  say "FAST GATE REFUSED - this tier EXECUTES these files from the working tree while every verdict it prints is"
  say "about the COMMIT, and for these the two are not the same object:"
  printf "$TAMPER" | tee -a "$LOG"
  say "A clean git status cannot see this: assume-unchanged and skip-worktree both suppress it. Run FULL."
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
  HOMERE="$(grep -oE '\^Build #[^/]*\$' "$G/regress/49-home.js" 2>/dev/null | head -1)"
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
  SO_B="$(mktemp)"; SO_H="$(mktemp)"
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
BNRATCHET=no
"$G/records-gate.sh" --entries 2>/dev/null \
  | grep -qxF "$(printf 'appendonly\tgates/build-numbers.tsv')" && BNRATCHET=yes
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
    say "     last 400 commits: this exemption reaches 11 that were unreachable before, 192 of 400 in total.)"
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
