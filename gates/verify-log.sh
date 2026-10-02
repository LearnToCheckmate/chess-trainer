#!/usr/bin/env bash
# gates/verify-log.sh <logfile> [expected-build]
#
# THE ONE PLACE THAT DECIDES WHETHER A GATE LOG AUTHORISES A PUSH. Run it on any log before citing one.
# Exit 0 only if ALL of these hold; exit 1 with the reason otherwise.
#   1. the log exists and is non-empty
#   2. it is NOT a subset run
#   3. its LAST line is exactly "GATES GREEN #NNN"
#   4. the build in that footer matches the build in the header, so a log cannot be footed for one build and
#      headed for another
#   5. if a second argument is given, the footer names that build
#   6. the log's OWN footer total ("regression assertions (PASS lines): N") exists, is above zero, and EQUALS
#      the number of ^PASS lines actually in the file
#   6b. for a log footed #461 or later, it MUST carry a "gate manifest:" footer with an "N unreadable" field, and
#      that footer must report 0 missing, 0 unlisted and 0 unreadable. A log footed #460 or earlier carries no such
#      line and is reported NOT CHECKED, never passed silently - measured, that exempts every archived log (count it: ls claude/agents/gatelogs/*.log | wc -l) and
#      nothing newer, because the highest build any of them foots is #460.
#   6c. (superseded wording of 6b, kept so the change is visible) it reports 0 missing and 0 unlisted
#      gates - so a suite that ran with a required gate deleted, renamed or never merged cannot authorise a
#      push. A log with no such footer is reported NOT CHECKED, never passed silently.
#   7. the tree it gated is NOT on the held register, gates/held-trees.tsv (ON BY DEFAULT, added #450),
#      by bundle md5, by any sha on the row, or by the stamp-independent md5 of chess.jsx at the gated sha.
#      A MISSING register is reported as 'NOT CHECKED', never as a pass - see the note at check (10).
#   8. (#461, AND IT WAS MISSING FROM THIS LIST UNTIL #467 - antagonist B's F7) the ROSTER cross-check: the
#      "gates ran (N)" line must name MANIREQ + 1 gates (the manifest's required count plus mountcheck), so a log
#      that reports a full suite while fewer gates ran is refused. This one refuses real logs and was unlisted.
#   9. (#461, ALSO MISSING FROM THIS LIST UNTIL #467) the ARITHMETIC cross-check on the manifest line:
#      required == present - unlisted + missing. A line that contradicts itself means 'missing' does not mean what
#      it says. gates/gatemanifest.sh now applies the same invariant at second two [B's F3 on #467].
#  10. (#467) the GATE-REQUIRED FLOOR, in two arms, and only the second is independent:
#      arm 1, required >= the floor the log reports - both numbers from the log, so it is the log vouching for the
#      log, which is the #419 limit and is why it is not offered alone; arm 2, the floor the log reports must be a
#      value gates/gate-required-floor.tsv has actually STOOD AT. A log footed #467+ with no floor field is
#      refused rather than falling back to the pre-#467 shape, and a 'NOT-CHECKED floor' token is refused.
#      An absent register is a REFUSAL, not a note, for the same reason the held register's absence is.
#      THE LIST ABOVE WAS INCOMPLETE FOR TWO BUILDS, which is its own small lesson: three of the checks that
#      actually refuse logs were not in the contract a reader is pointed at, so somebody who got one of those
#      messages and read this header to understand it would have found nothing. Added on B's F7.
#
# WHY EACH OF THESE IS HERE, because every one is a mistake that actually happened:
#  - (2) subset runs were added at #391 and a subset can be green while the gate that would have caught the
#    regression never ran. gates.sh already refuses to emit "GATES GREEN" for one; this is the second lock.
#  - (3) "ends GREEN" has always been the rule and was checked by eye. Eyes skim.
#  - (4) at #388 two logs footed "GATES GREEN #387" were filed as 388-all.log and their totals credited to #388.
#    An external challenger caught it, not this lane. Nothing measured was wrong; the NAME asserted something the
#    CONTENT did not support. See claude/agents/gatelogs/README.md.
#  - (5) lets a caller state the build it THINKS it is pushing and have the log disagree out loud.
#  - (6) added #405, AND IT IS THE CHECK THIS SCRIPT WAS MISSING MOST. An external build-lane challenger
#    reported that this script returns OK on a 0-PASS log; measured before fixing, it did, twice over:
#      a) a hand-made four-line file with no PASS lines at all and a footer claiming 1439 -> OK, exit 0;
#      b) a THIN STDOUT CAPTURE of the genuinely green #404 run - 205 lines, all 32 suite headers, all the
#         per-suite summaries, the real footer, and ZERO ^PASS lines -> OK, exit 0.
#    (b) is the important one. It is the exact shape of EVERY gatelog committed before #391 (see
#    claude/agents/gatelogs/README.md and CLAUDE.md: "a full suite reporting '0 PASS' is the tell"), because
#    gates.sh tees only the summary lines to stdout and writes every PASS line to the log. So the one tool
#    written to decide whether a log is evidence accepted the one log shape the project already knew was not.
#    THE CHECK IS SELF-CONSISTENCY, NOT A THRESHOLD, deliberately: a hard floor like "at least 1000 PASS" would
#    be the frozen denominator again - true the day it was written and wrong as the suite grows or shrinks.
#    Asking the log to agree with ITSELF ages perfectly and catches more: a truncated log, a hand-edited one,
#    and a stdout capture all fail it, at any suite size.
#  - (7) --on-main and (8) --this-bundle, added #417 for flag class-gate-verifies-a-bundle-never-a-ref-2026-09-18.
#    Both are OPT-IN. Why, and what the flag actually asked for, QUOTED IN FULL because the first version of this
#    note quoted half of it and the #417 antagonist caught that - which is the rule this project added at #416
#    ("when a rule quotes a source, the next reader will trust the quotation: quote all of it, and say which part
#    you acted on") failing one notch further in, inside the build that added it.
#      THE FLAG'S FIRST ASK:  "At the end of a full green run, resolve `git rev-parse HEAD` and `git ls-remote
#                              origin main`. If HEAD is not an ancestor-or-equal of origin/main, the log's footer
#                              must SAY SO IN ONE LINE, naming the ref HEAD is actually on."
#      THE FLAG'S SECOND ASK: "Then have verify-log.sh REFUSE a log whose footer claims a green for a build whose
#                              SHA is on no ref of origin."
#    I BUILT THE FIRST. The second is the weaker of the two and would not have caught the instance the flag was
#    filed about: the flag's own measurement four paragraphs earlier reads "git branch -r --contains 9154327 ->
#    origin/claude/nice-einstein-hnoipk, and no other ref" - so 9154327 WAS on a ref of origin. The flag is
#    internally inconsistent and the ancestor-of-origin/main relationship is the half that works.
#    AND IT IS OPT-IN because this script's DEFAULT job is to authorise a push, and at that moment the tree is not
#    yet on any ref of origin - so any such refusal in the default path blocks every push this project makes.
#    Measured on this build: gates.sh '#417' started 12:41:53Z against a tree that was not committed until
#    12:43:38Z. --on-main is for LATER readers (a dashboard, a supervisor, a run report) asking "does this green
#    describe the tree that ships?".
#  - (8) --this-bundle is the PUSH-TIME half, and --on-main structurally cannot cover it. The antagonist found it:
#    the log's own first line already records the md5 of the bundle it gated, and nothing compared it to anything.
#      gates/verify-log.sh claude/agents/gatelogs/416b-all.log '#416'   -> OK, exit 0
#      while md5sum app.js on disk was 91293f224fbc and that log gated 69b903f2b0ca.
#    So the one tool that decides whether a log authorises a push said OK for a green over a different bundle. It
#    needs no network, no git and no commit. It cannot be unconditional - it would refuse every archived gatelog,
#    which gated bundles long replaced - so it is the flag you pass at the moment you are pushing.
#    THE "49" THAT STOOD HERE IS WITHDRAWN [#461, antagonist A]: `ls claude/agents/gatelogs/*.log | wc -l` is
#    WHATEVER `ls claude/agents/gatelogs/*.log | wc -l` SAYS TODAY (93 at #462, 91 when this was written - #461's own close-out added the two that made it stale). 49 was true when it was written and has been re-quoted since, including by #461's own first
#    draft of check (11) below - #405's frozen denominator, inside a quotation, in a build that cites #405.
#    NEGATIVE CONTROLS, free and on disk, run at #417 and RECORDED AS THE COMMAND THAT PRODUCES THEM, because the
#    first version of this note recorded an outcome the command does not produce (it refused for "no ref line",
#    not for "not on main", so its two controls were one run wearing two labels - #411's count-with-no-scope):
#      ref line recording d8ecd55 (4 ahead of main) -> REFUSED (--on-main): ... NOT on origin/main
#      ref line recording 54eb7c6 (== origin/main)  -> ON-MAIN OK
#      a pre-#417 log, no ref line at all           -> REFUSED (--on-main): carries no 'ref: HEAD <sha>' line
#      --this-bundle with app.js != the logged md5  -> REFUSED (--this-bundle)
set -uo pipefail
LOG="${1:-}"; WANT=""; ONMAIN=0; THISBUNDLE=0; IGNOREHELD=0
for a in "${@:2}"; do case "$a" in --on-main) ONMAIN=1;; --this-bundle) THISBUNDLE=1;; --ignore-held) IGNOREHELD=1;; *) WANT="$a";; esac; done
[ -n "$LOG" ] || { echo "usage: gates/verify-log.sh <logfile> [#NNN] [--on-main] [--this-bundle] [--ignore-held]"; exit 1; }
[ -s "$LOG" ] || { echo "REFUSED: $LOG is missing or empty"; exit 1; }
# (9) NUL bytes mean the file was read while something else was writing it, so no part of it can be trusted
# to be what that run measured. #418 produced exactly this: two full suites ran ten seconds apart, the per-gate
# log path had no run identity, and 418b-all.log came out with an 18,165-byte hole of NULs where 'cat' hit a
# file the other process had truncated. THIS SCRIPT ALREADY REFUSED THAT LOG - BY LUCK, NOT BY CHECKING. grep
# switches to binary mode on a NUL and prints "binary file matches" instead of the matched text, so the footer
# extraction below came back empty and the log was refused for "carries no footer", which is false: the footer
# is there and reads 1855. A wrong reason that happens to reach the right verdict fails the moment the
# corruption lands somewhere else in the file - and its sibling 418c, collaged from the same two runs with no
# NUL in it at all, was accepted at 1935 PASS.
NULS="$(tr -dc '\000' < "$LOG" | wc -c | tr -d ' ')"
if [ "${NULS:-0}" != "0" ]; then
  echo "REFUSED: $LOG contains $NULS NUL byte(s), so it was captured while something else was writing it."
  echo "  A gate log is a record of one run. Re-gate; do not try to read around the hole."
  exit 1
fi
if grep -q '^SUBSET RUN:' "$LOG"; then
  echo "REFUSED: $LOG is a SUBSET run and cannot authorise a push"; sed -n '2,3p' "$LOG"; exit 1
fi
LAST="$(tail -1 "$LOG")"
if ! [[ "$LAST" =~ ^GATES\ GREEN\ (#[0-9]{3,4})$ ]]; then
  echo "REFUSED: $LOG does not end with a clean 'GATES GREEN #NNN'"; echo "  last line: $LAST"; exit 1
fi
FOOT="${BASH_REMATCH[1]}"
HEAD_B="$(head -1 "$LOG" | grep -o '#[0-9]\{3,4\}' | head -1 || true)"
if [ -n "$HEAD_B" ] && [ "$HEAD_B" != "$FOOT" ]; then
  echo "REFUSED: $LOG is headed $HEAD_B but footed $FOOT - it gated a different build from the one it is named for"; exit 1
fi
if [ -n "$WANT" ] && [ "$WANT" != "$FOOT" ]; then
  echo "REFUSED: you said $WANT but $LOG gated $FOOT"; exit 1
fi
# (6) the log must agree with itself about how many assertions it ran.
CLAIMED="$(grep -o 'regression assertions (PASS lines): [0-9]\{1,\}' "$LOG" | tail -1 | grep -o '[0-9]\{1,\}$' || true)"
ACTUAL="$(grep -c '^PASS' "$LOG" || true)"
if [ -z "$CLAIMED" ]; then
  echo "REFUSED: $LOG carries no 'regression assertions (PASS lines): N' footer, so it cannot be checked against itself"; exit 1
fi
if [ "$CLAIMED" -eq 0 ] 2>/dev/null; then
  echo "REFUSED: $LOG says it ran 0 assertions. A full suite that asserted nothing is not evidence"; exit 1
fi
if [ "$CLAIMED" != "$ACTUAL" ]; then
  echo "REFUSED: $LOG claims $CLAIMED assertions in its footer but contains $ACTUAL '^PASS' lines."
  if [ "$ACTUAL" -eq 0 ]; then
    echo "  0 PASS lines with a non-zero footer is the THIN LOG shape: gates.sh tees only the summary lines to"
    echo "  stdout and writes every PASS line to gates/logs/<N>-all.log. Copy the LOG, not the terminal output."
  fi
  exit 1
fi
# (10) THE HELD-TREE REGISTER, AND IT IS ON BY DEFAULT. Added #450 for
# jobs/a-gated-green-log-is-not-a-shippable-tree-2026-10-01.
# Everything above this line asks questions about the LOG: is it a full run, does it end green, does it agree
# with itself, did it gate this bundle. All of those can be YES for a tree that a previous run deliberately
# refused to ship. That is not a hypothetical: at 2026-10-01T00:31Z every check in this script returned OK for
# the #441 tree and the push was reverted 17 minutes later, because the thing that stopped #441 was two P0s in
# code the suite had no gate for. A green log cannot carry that. gates/held-trees.tsv can, so this reads it.
# ON BY DEFAULT, unlike (7) and (8), and the asymmetry is deliberate: those two refuse things that are NORMAL at
# push time (a tree not yet on origin, an archived log over a replaced bundle), so defaulting them on would block
# every push this project makes. This one only ever fires on a bundle or a sha somebody wrote down as held, so
# its false-positive rate is structurally zero and the one case it catches is the case that cost a revert.
# Matched on EITHER the bundle md5 or the gated sha, because they fail independently: a log can be rebuilt for a
# new sha over the same bundle, and a sha can be re-gated into a new bundle.
# Escape hatch: --ignore-held, which still prints the row and says loudly that it was overridden. It exists
# because a register is a human artefact and a stale row must not be able to wedge the lane for ever - but it
# makes the override visible in the output rather than silent.
# SELF-CAUGHT AT #450, BEFORE THE PUSH, BY RUNNING THE CONTROL: the first version of this block read
# `if [ "$IGNOREHELD" -eq 0 ] && [ -f "$REG" ]`, which SKIPPED THE LOOKUP ENTIRELY under --ignore-held - so the
# override printed nothing at all and the log came back a bare OK, while the comment five lines above it said the
# override "still prints the row and says loudly that it was overridden". The comment and the code disagreed and
# I wrote both, which is the #449 handover's point (4) landing inside the build that read it. An override whose
# output is indistinguishable from a clean pass is not an override, it is a bypass - and this whole file exists
# because a bare OK was read as permission once already. So the register is ALWAYS read; the flag changes only
# the verdict, never the reporting.
# UPHELD VETO GROUND, ANTAGONIST B ON #450, AND IT IS THE SAME DEFECT AS THE --ignore-held BUG ONE LEVEL UP.
# The first version wrapped this whole block in `if [ -f "$REG" ]` and said nothing when the file was absent,
# while the OK text below still printed "that no run has held it (checked against ...)". So a MISSING register
# was indistinguishable from a register that cleared the tree, and the tool asserted a check it had not run.
# B's words, and they are right: "A guard whose absence is indistinguishable from its success is not a guard."
# HELDCHECK now records what actually happened - ran / missing - and the OK line reports it instead of assuming.
REG="$(cd "$(dirname "$0")" && pwd)/held-trees.tsv"
HELDCHECK="missing"; HELDROWS=0
if [ ! -f "$REG" ]; then
  echo "WARNING: no held-tree register at $REG - THE HOLD CHECK DID NOT RUN."
  echo "  This file is tracked on main. Its absence means a stale checkout or a deleted file, not an empty"
  echo "  register, and a green log here says NOTHING about whether a previous run refused this tree."
fi
if [ -f "$REG" ]; then
  HELDCHECK="ran"
  LOGMD5H="$(head -1 "$LOG" | grep -oi 'md5 [0-9a-f]\{12,32\}' | head -1 | awk '{print $2}' | tr 'A-F' 'a-f' || true)"
  LOGSHAH="$(grep -oi '^ref: HEAD [0-9a-f]\{7,40\}' "$LOG" | tail -1 | awk '{print $3}' | tr 'A-F' 'a-f' || true)"
  HELDROW=""; MALFORMED=0
  # TWO GUARDS FOUND BY RE-READING THIS LOOP ADVERSARIALLY BEFORE PUSHING, and they fail in opposite directions.
  # (i) `|| [ -n "$line" ]` on the read: a row hand-appended WITHOUT a trailing newline makes `read` return
  #     non-zero, so the loop body never runs and THE HELD ROW SILENTLY DOES NOT FIRE. That is a false negative in
  #     the one mechanism whose whole job is not to miss a hold - the worst available failure here.
  # (ii) the length floors: the match is a PREFIX test, so a truncated or typo'd md5 field like `a` would
  #     prefix-match every bundle beginning with `a` and refuse every push this project makes. gates.sh writes 12
  #     hex, so anything under 8 (or under 7 for a sha) is a malformed row, not a short key. A malformed row is
  #     NOT skipped quietly either, because someone wrote it meaning to hold something: it is counted and
  #     reported below. Silently ignoring a row that was meant to stop you is the same defect as (i).
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue;; esac
    case "$line" in *"	"*) ;; *) MALFORMED=$((MALFORMED+1)); continue;; esac
    # NORMALISE CASE AND BOUND THE LENGTH AT BOTH ENDS. Antagonist A on #450 found three SILENT DEAD KEYS: an
    # md5 field of 32 hex and an UPPERCASE md5 or sha each passed the `-lt 8` floor, matched nothing - a 32-char
    # field can never prefix-match the 12 hex gates.sh writes - and were NOT counted as malformed, so the tool
    # printed a clean OK over a row somebody wrote meaning to hold a tree. A floor is only half a bound.
    RMD5="$(printf '%s' "$line" | cut -f1 | tr -d ' \r' | tr 'A-F' 'a-f')"; RSHA="$(printf '%s' "$line" | cut -f2 | tr -d ' \r' | tr 'A-F' 'a-f')"
    case "$RMD5" in -*) continue;; esac   # a cleared row, see the header of held-trees.tsv
    if [ -n "$RMD5" ] && { [ "${#RMD5}" -lt 8 ] || [ "${#RMD5}" -gt 12 ]; }; then MALFORMED=$((MALFORMED+1)); RMD5=""; fi
    if [ -n "$RSHA" ] && [ "${#RSHA}" -lt 7 ]; then MALFORMED=$((MALFORMED+1)); RSHA=""; fi
    HELDROWS=$((HELDROWS+1))
    if [ -n "$LOGMD5H" ] && [ -n "$RMD5" ] && [ "$RMD5" = "${LOGMD5H:0:${#RMD5}}" ]; then HELDROW="$line"; break; fi
    # THE SHA FIELD IS A COMMA-SEPARATED LIST, and antagonist B found why it has to be: the row recorded only
    # #441's GATED sha 409b897, so `held.sh check e765135` - the sha that was actually PUSHED and reverted, the
    # one sha in this project's history that shipped in error - came back "not held, exit 0". A hold is a
    # property of a TREE, and one tree can be reached by several shas (the gated commit, the commit that added
    # the log on top of it, a cherry-pick). Record every sha that names it.
    if [ -n "$LOGSHAH" ] && [ -n "$RSHA" ]; then
      OLDIFS="$IFS"; IFS=','
      for one in $RSHA; do
        [ -n "$one" ] || continue
        [ "${#one}" -ge 7 ] || continue
        if [ "$one" = "$LOGSHAH" ] || [ "${one:0:7}" = "${LOGSHAH:0:7}" ]; then HELDROW="$line"; break; fi
      done
      IFS="$OLDIFS"
      [ -n "$HELDROW" ] && break
    fi
  done < "$REG"
  # (10c) THE SOURCE KEY, AT THE PUSH-AUTHORISING DOOR. Antagonist A on #450 disproved the claim this build had
  # just written into held-trees.tsv - that verify-log.sh "CANNOT use sourceMd5 and does not try: it works from a
  # log". It is reachable from the log alone: the ref line gives `ref: HEAD <sha>`, and
  # `git show <sha>:chess.jsx | md5sum` recovers the stamp-independent source hash. A was right that leaving the
  # false sentence in is worse than the gap, because it tells the next run not to bother.
  # WHY IT MATTERS: both artefact keys die on a rebuild. gates/build.sh embeds a minute-resolution timestamp, so
  # the same chess.jsx bundles to a new md5 in a new minute, and a rebase or cherry-pick gives a new sha. The
  # source key is the only one of the three that survives carrying a held tree forward.
  # AND ITS OWN LIMIT, NAMED: this is an EXACT-BLOB key. A says four commits carry the held chess.jsx
  # byte-identical, so it catches a straight carry-forward - but change one unrelated character, as any real
  # rebase would, and it dies too. No key here tracks the DEFECT; that needs a predicate, filed as
  # jobs/a-held-row-should-carry-a-predicate-not-only-a-hash-2026-10-01.
  if [ -z "$HELDROW" ] && [ -n "$LOGSHAH" ] && command -v git >/dev/null 2>&1; then
    SRCMD5="$(git -C "$(dirname "$REG")/.." show "$LOGSHAH:chess.jsx" 2>/dev/null | md5sum 2>/dev/null | cut -c1-12 || true)"
    if [ -n "$SRCMD5" ] && [ "$SRCMD5" != "d41d8cd98f00" ]; then
      while IFS= read -r line; do
        case "$line" in ''|'#'*) continue;; esac
        case "$line" in *"	"*) ;; *) continue;; esac
        RS="$(printf '%s' "$line" | cut -f1)"; case "$RS" in -*) continue;; esac
        R7="$(printf '%s' "$line" | cut -f7 | tr -d ' \r' | tr 'A-F' 'a-f')"
        [ -n "$R7" ] && [ "$R7" != "-" ] || continue
        [ "${#R7}" -ge 8 ] && [ "${#R7}" -le 12 ] || continue
        if [ "$R7" = "${SRCMD5:0:${#R7}}" ]; then
          echo "REFUSED (held tree, SOURCE key): $LOG gated sha $LOGSHAH, whose chess.jsx is md5 $SRCMD5,"
          echo "  which matches the sourceMd5 of a held row. The bundle md5 and the gated sha did NOT match, so"
          echo "  this is a REBUILD or a carry-forward of source a previous run refused to ship."
          echo "  build:  $(printf '%s' "$line" | cut -f3)   held at $(printf '%s' "$line" | cut -f4) by $(printf '%s' "$line" | cut -f5)"
          echo "  why:    $(printf '%s' "$line" | cut -f6)"
          exit 1
        fi
      done < "$REG"
    fi
  fi
  if [ "$MALFORMED" -gt 0 ] && [ -z "$HELDROW" ]; then
    echo "WARNING: $MALFORMED malformed row(s) in $REG were skipped (no tab, or a key outside 8-12 hex for a bundle md5 / under 7 for a sha)."
    echo "  Somebody wrote those rows meaning to hold a tree. Fix them before trusting this check's silence."
  fi
  if [ -n "$HELDROW" ] && [ "$IGNOREHELD" -eq 1 ]; then
    echo "!! HELD TREE OVERRIDDEN BY --ignore-held. The register says this tree must not ship:"
    echo "   build:  $(printf '%s' "$HELDROW" | cut -f3)   held at $(printf '%s' "$HELDROW" | cut -f4) by $(printf '%s' "$HELDROW" | cut -f5)"
    echo "   bundle: $(printf '%s' "$HELDROW" | cut -f1)   gated sha: $(printf '%s' "$HELDROW" | cut -f2)"
    echo "   why:    $(printf '%s' "$HELDROW" | cut -f6)"
    echo "!! You are overriding that. Say so, and why, wherever you cite this log - a reader who sees only the"
    echo "!! OK line below will not know a previous run refused this tree."
  elif [ -n "$HELDROW" ]; then
    echo "REFUSED (held tree): $LOG is a full-suite green, and the tree it gated is on the held register."
    echo "  build:  $(printf '%s' "$HELDROW" | cut -f3)   held at $(printf '%s' "$HELDROW" | cut -f4) by $(printf '%s' "$HELDROW" | cut -f5)"
    echo "  bundle: $(printf '%s' "$HELDROW" | cut -f1)   gated sha: $(printf '%s' "$HELDROW" | cut -f2)"
    echo "  why:    $(printf '%s' "$HELDROW" | cut -f6)"
    echo "  The suite was green and the log is honest. A previous run refused to ship THIS tree for a reason the"
    echo "  suite could not see. Read gates/held-trees.tsv before deciding; --ignore-held overrides it out loud."
    exit 1
  fi
fi

# ORDERING, DELIBERATE AND MOVED HERE AFTER I RE-READ MY OWN DIFF: this runs AFTER the held-tree register,
# not before it. Both refuse with exit 1, so the verdict is identical either way - but when a log is BOTH on
# the held register AND reports an unlisted gate, only ONE reason gets printed, and it must be the held one.
# #450 built that check after a push it had to revert 17 minutes later, and its message is the only place the
# reader learns a previous run refused this exact tree. An unlisted gate is a bookkeeping lapse; a held tree
# is a tree somebody decided must not ship. The more serious reason wins the output.
# (11) THE EXPECTED-GATES MANIFEST LINE, added #461 for
# jobs/gates-green-does-not-assert-which-gates-RAN-so-a-deleted-gate-is-invisible-2026-10-01.
# Checks (1) to (6) all ask whether the log is a well-formed full-suite green. EVERY ONE OF THEM RETURNS YES FOR A
# SUITE THAT RAN WITH A GATE DELETED, because gates.sh globbed the directory and the deleted gate simply was not
# counted. gates.sh now writes its manifest verdict into the footer, so this reads it.
#
# IT IS NO LONGER CONDITIONAL ON THE LINE BEING THERE, AND THE PARAGRAPH THAT STOOD HERE WAS WRONG.
# It said this check could not be unconditional because "it would refuse all 49 archived gatelogs", borrowing the
# reasoning the header records for --this-bundle without re-deriving it. Antagonist B re-derived it in one command
# and I reproduced it: there are WHATEVER `ls claude/agents/gatelogs/*.log | wc -l` SAYS TODAY (93 at #462, 91 when this was written - #461's own close-out added the two that made it stale) archived logs and the highest build any of them foots is #460, so
# gating the STRICT verdict on the log's OWN BUILD NUMBER refuses zero of the 91 and every log from #461 onward.
# The exemption was free to close and the number justifying it was stale. See MANIERA below.
MANICHECK="absent"; MANIMISS=""; MANIUNL=""; MANIUNREAD=""
MANIFOOT="$(grep -m1 '^gate manifest:' "$LOG" || true)"
# ANTAGONIST B's VETO F1 ON #461, UPHELD, AND THE REASON I HAD WRITTEN FOR THE EXEMPTION WAS NEVER RE-DERIVED.
# This check was conditional on the line being PRESENT, justified by "making it unconditional would refuse all 49
# archived gatelogs" - borrowed from --this-bundle's note without measuring whether it applied. B measured that it
# does not, and I reproduced it: `ls claude/agents/gatelogs/*.log | wc -l` is WHATEVER `ls claude/agents/gatelogs/*.log | wc -l` SAYS TODAY (93 at #462, 91 when this was written - #461's own close-out added the two that made it stale) (the 49 in the header is
# itself stale), and the highest build number any of them foots was 460 WHEN THAT SENTENCE WAS WRITTEN and is 466 as of #467 [B's F8] - the claim it supports (the era gate refuses zero archived logs) still holds, because the gate keys on each log's OWN number. So gating the STRICT verdict on the log's
# own build number refuses exactly ZERO archived logs, and the exemption was free to close all along.
# WHAT IT CLOSED: `rm gates/gate-manifest.tsv`, delete three gates, and gates.sh printed "NOT CHECKED", ran 45 of
# 48, emitted GATES GREEN, and this script returned OK exit 0 - one `rm` turned the whole guard off at the push
# gate. Stripping the footer line did the same, and the OK text then said of a #461 log that it "predates #461".
# FOOT is parsed at line 102 from the footer regex, ~180 lines above here, so this costs nothing.
MANIERA=0
case "${FOOT#\#}" in ''|*[!0-9]*) MANIERA=0;; *) [ "${FOOT#\#}" -ge 461 ] && MANIERA=1;; esac
# #467. A SECOND ERA, FOR THE SAME REASON THE FIRST ONE EXISTS. From #467 the manifest line carries a ninth field,
# the gate-required FLOOR, and a log footed #467 or later that does NOT carry it has either been edited or came
# from an older harness - so the era is gated on the log's own build number exactly as MANIERA is, and for the
# measured reason recorded there: it refuses zero archived logs, because the highest build any of them foots is
# below 467. THE FIELD IS WHY THE ERA IS NEEDED AT ALL: without an era test, stripping ", N floor" from the line
# would fall back to the #461 regex, match cleanly, and turn the floor check off - which is the shape of the exact
# defect antagonist B found at F1 on #461 (one `rm` turning the whole guard off at the push gate).
FLOORERA=0
case "${FOOT#\#}" in ''|*[!0-9]*) FLOORERA=0;; *) [ "${FOOT#\#}" -ge 467 ] && FLOORERA=1;; esac
MANIFLOOR=""; MANIREQSET=""; FLOORNOTE=""
if [ -n "$MANIFOOT" ]; then
  # HERESTRING, NOT A PIPE [antagonist A's veto 1 on #461]: `printf | grep -q` under `set -o pipefail` reports
  # failure when grep short-circuits and SIGPIPEs the printf, measured as PIPESTATUS=[141 0]. Harmless at this
  # one site because a false miss only sends us down the stricter branch - but it is the same class, and the
  # class is now zero occurrences in this directory rather than one that happens not to bite.
  if grep -q 'NOT CHECKED' <<<"$MANIFOOT"; then
    MANICHECK="notchecked"
    if [ "$MANIERA" -eq 1 ]; then
      echo "REFUSED (gate manifest): $LOG is a $FOOT log and its run could NOT read gates/gate-manifest.tsv."
      echo "  $MANIFOOT"
      echo "  From #461 the manifest is tracked on main, so a run that cannot read it has a stale or damaged"
      echo "  checkout - and a suite that could not check its own gate set says NOTHING about whether every"
      echo "  expected gate was present. One deleted manifest would otherwise turn the whole guard off."
      exit 1
    fi
  else
    MANICHECK="ran"
    # ANTAGONIST A's VETO 3 ON #461, UPHELD: THIS PARSED ONE WORDING AND PRINTED ANYTHING ELSE AS A VERDICT.
    # The old parse grepped for the substrings "N missing" and "N unlisted" and treated absence as "nothing to
    # refuse". A measured what that accepts, against a real archived log with one line inserted:
    #   "gate manifest: all good"                      -> OK, and printed as `manifest: gate manifest: all good`
    #   "gate manifest: ... one missing ..."            -> OK   (a word, not a digit, so no match)
    #   a line carrying BOTH "0 missing" AND "3 missing" -> OK   (two grep matches make `[ "$X" -gt 0 ]` throw,
    #                                                            and the `2>/dev/null` on it swallowed the error)
    # That is "a guard whose absence is indistinguishable from its success", inside the check written to apply
    # that rule - the trap this project records nine times, now at the tenth site, found by the pass that was
    # reading the diff for exactly this.
    # THE FIX IS TO PARSE THE WHOLE LINE OR REFUSE IT. A #461-era log's manifest line must match the shape
    # gates.sh emits, field for field, or it is not a verdict and is not treated as one. An unparseable line in a
    # current log means the line was edited or produced by something else, and either way nothing here can read it.
    MANIRE='^gate manifest: ([0-9]+) required, ([0-9]+) present, ([0-9]+) missing, ([0-9]+) unlisted, ([0-9]+) known-absent, ([0-9]+) retired, ([0-9]+) unjustified, ([0-9]+) unreadable$'
    # #467. The ninth field. `NOT-CHECKED` is accepted as a TOKEN here and refused below, deliberately: the
    # alternative is to let it fail the parse, which refuses it with a message about the line's SHAPE when the
    # real problem is a missing floor register, and a wrong reason that reaches the right verdict is a trap this
    # project already paid for once (#419's "carries no footer", which was false - grep had gone binary on a NUL).
    # ANTAGONIST A's 5.3, UPHELD: the floor group was an UNBOUNDED ([0-9]+). A >64-bit digit string reaches bash
    # `test` in arm 1, which errors with status 2, and the `2>/dev/null` on that `[` HID the message - so arm 1 took
    # the false branch and FAILED OPEN while arm 2 blessed the value. A measured it end to end: a log reporting
    # "40 required ... 99999999999999999999 floor" returned OK exit 0. Bounded to six digits, four orders of
    # magnitude above any plausible suite, so the comparison can no longer be skipped by making the number big.
    # AND THE TENTH FIELD, the required-SET digest, for A's 5.1 - see ARM 3 below.
    MANIRE467='^gate manifest: ([0-9]+) required, ([0-9]+) present, ([0-9]+) missing, ([0-9]+) unlisted, ([0-9]+) known-absent, ([0-9]+) retired, ([0-9]+) unjustified, ([0-9]+) unreadable, ([0-9]{1,6}|NOT-CHECKED) floor, ([0-9a-f]{12}|NOT-CHECKED) reqset$'
    if [[ "$MANIFOOT" =~ $MANIRE467 ]]; then
      MANIREQ="${BASH_REMATCH[1]}"; MANIPRES="${BASH_REMATCH[2]}"; MANIMISS="${BASH_REMATCH[3]}"
      MANIUNL="${BASH_REMATCH[4]}"; MANIABS="${BASH_REMATCH[5]}"; MANIRET="${BASH_REMATCH[6]}"
      MANIUNJ="${BASH_REMATCH[7]}"; MANIUNREAD="${BASH_REMATCH[8]}"; MANIFLOOR="${BASH_REMATCH[9]}"; MANIREQSET="${BASH_REMATCH[10]}"
    elif [[ "$MANIFOOT" =~ $MANIRE ]]; then
      MANIREQ="${BASH_REMATCH[1]}"; MANIPRES="${BASH_REMATCH[2]}"; MANIMISS="${BASH_REMATCH[3]}"
      MANIUNL="${BASH_REMATCH[4]}"; MANIABS="${BASH_REMATCH[5]}"; MANIRET="${BASH_REMATCH[6]}"
      MANIUNJ="${BASH_REMATCH[7]}"; MANIUNREAD="${BASH_REMATCH[8]}"
      if [ "$FLOORERA" -eq 1 ]; then
        echo "REFUSED (gate-required floor): $LOG is footed $FOOT and its manifest line carries no 'N floor' field."
        echo "  line: $MANIFOOT"
        echo "  Every gates.sh from #467 emits the floor as the ninth field, because it is the ONE field in that"
        echo "  line not computed from the tree - and therefore the only one a log can still be checked against"
        echo "  after the tree has moved on. A #467-era line without it has been edited or trimmed, and the"
        echo "  pre-#467 regex would otherwise have matched it and turned the floor check off silently."
        exit 1
      fi
    elif [ "$MANIERA" -eq 1 ]; then
      echo "REFUSED (gate manifest): $LOG is footed $FOOT and its manifest line does not parse."
      echo "  line:     $MANIFOOT"
      echo "  expected: gate manifest: N required, N present, N missing, N unlisted, N known-absent, N retired, N unjustified, N unreadable[, N floor, <12 hex> reqset  <- from #467]"
      echo "  Every gates.sh from #461 emits exactly that shape. A line that does not match it was edited or came"
      echo "  from something else, so no count in it can be trusted - and the old parser would have printed it"
      echo "  back to you as though it were a verdict."
      exit 1
    else
      # A pre-#461 log cannot carry this shape. Treat it as the NOT CHECKED case rather than inventing counts.
      MANICHECK="notchecked"
    fi
    if [ "$MANICHECK" = "ran" ]; then
    # B's F2: a row the tool could not parse silently DE-REQUIRES its gate, and the old summary line said
    # "0 missing" for a tree with that gate deleted. The count now exists and is refused here. A #461-or-later
    # log that carries NO unreadable field at all is itself suspect, because gates.sh from #461 always writes it.
    if [ "$MANIERA" -eq 1 ] && [ -z "$MANIUNREAD" ]; then
      echo "REFUSED (gate manifest): $LOG is a $FOOT log whose manifest line carries no 'N unreadable' count."
      echo "  $MANIFOOT"
      echo "  Every gates.sh from #461 writes that field. Its absence means the line was produced by an older"
      echo "  harness or edited by hand, and an unreadable manifest row silently de-requires its gate."
      exit 1
    fi
    if [ -n "$MANIUNREAD" ] && [ "$MANIUNREAD" -gt 0 ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG reports $MANIUNREAD unreadable row(s) in gates/gate-manifest.tsv."
      echo "  $MANIFOOT"
      echo "  A row the tool cannot parse is a gate whose requirement is UNKNOWN, so 'missing' is uncomputable"
      echo "  for it and the counts above understate what the suite requires. Fix the row and re-gate."
      exit 1
    fi
    if [ -n "$MANIMISS" ] && [ "$MANIMISS" -gt 0 ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG reports $MANIMISS required gate(s) MISSING from gates/regress/."
      echo "  $MANIFOOT"
      echo "  A suite that ran without a gate the manifest requires cannot speak for that gate's defect class."
      echo "  gates.sh should have stopped before running; a log in this state was assembled some other way."
      exit 1
    fi
    if [ -n "$MANIUNL" ] && [ "$MANIUNL" -gt 0 ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG reports $MANIUNL gate(s) on disk with no row in gates/gate-manifest.tsv."
      echo "  $MANIFOOT"
      echo "  The suite ran them, so nothing is unproven - but an unlisted gate is one nobody has to keep. Add"
      echo "  the row and re-gate:  gates/gatemanifest.sh sync 'what it covers'"
      echo "  This is the one check here that refuses a log for something the NEXT build does wrong rather than"
      echo "  this one; it is the only moment at which an unlisted gate is cheap to catch."
      exit 1
    fi
    # THE ARITHMETIC NOBODY WAS CHECKING [antagonist A's veto 2, the part that is checkable from a log alone].
    # required rows whose file is present, plus required rows whose file is absent, must account for every listed
    # present file: NREQ == NPRES - NUNL + NMISS, once the stale-row cases are zero. A line that fails this is
    # internally inconsistent, which is the one thing a reader of the LOG can detect without the tree.
    # ── #467. THE FLOOR, IN TWO ARMS, AND ONLY THE SECOND ONE IS INDEPENDENT ──────────────────────────────────
    # jobs/nothing-ratchets-the-manifests-required-count-so-the-denominator-is-editable-downward-2026-10-02.
    # ARM 1 is self-consistency: the log's own required count against the log's own floor. It costs nothing and it
    # catches a trimmed or clumsily edited footer. IT IS NOT EVIDENCE ON ITS OWN AND I AM NOT GOING TO LET THE NEXT
    # READER THINK IT IS: both numbers come out of the same line, so this is the log vouching for the log - the
    # #419 limit this file already records about the PASS count, at a new field. Written as arm 1 of two precisely
    # so that nobody reads the pair as one strong check.
    # ARM 2 is the independent one: the floor the log reports must be a value the floor register has actually
    # STOOD AT. The register is append-only and chain-checked, so every floor this project has ever had is a row in
    # it; a log reporting a floor that is in no row is reporting a number nobody recorded. That is a test of the
    # LOG against something OUTSIDE the log, which is the property arm 1 lacks and the reason this arm exists.
    # IT DOES NOT COMPARE MAGNITUDES, deliberately: a legitimate `retire` lowers the floor, so demanding
    # logFloor >= treeFloor would refuse every log written before any legitimate retirement, for ever - the frozen
    # denominator again, pointed the other way. Membership is the right relation and it needs no ordering.
    if [ -n "$MANIFLOOR" ]; then
      if [ "$MANIFLOOR" = "NOT-CHECKED" ]; then
        echo "REFUSED (gate-required floor): $LOG's run could not read gates/gate-required-floor.tsv."
        echo "  $MANIFOOT"
        echo "  The floor is what stops the manifest's \`required\` count being edited DOWNWARD. A suite that could"
        echo "  not read it ran without knowing whether this tree requires fewer gates than an accepted tree did,"
        echo "  so its green cannot speak to that. Restore the register from main and re-gate."
        exit 1
      fi
      # ARM 1
      if [ "$MANIREQ" -lt "$MANIFLOOR" ] 2>/dev/null; then
        echo "REFUSED (gate-required floor): $LOG reports $MANIREQ required gate(s) against a floor of $MANIFLOOR."
        echo "  $MANIFOOT"
        echo "  A previously accepted tree required $MANIFLOOR gates, so some gate has left the required set. The"
        echo "  two-field edit that does this - delete the gate, flip its row to absent, type any reason - reported"
        echo "  one fewer required gate and exit 0 before #467, and the suite ran and went green over it."
        echo "  gatemanifest.sh check should have stopped the suite; a log in this state was assembled some other way."
        exit 1
      fi
      # ARM 2
      FLOORREG="$(cd "$(dirname "$0")" && pwd)/gate-required-floor.tsv"
      if [ ! -f "$FLOORREG" ]; then
        # ANTAGONIST B's F10, UPHELD. This printed a loud NOTE and then returned 0, so a caller reading only the
        # exit code got a PASS over an absent register - against this build's own second promise, "an absent or
        # corrupt floor register is NOT CHECKED, never a pass". It is now a refusal, which is also what this very
        # file already does for the MANIFEST's absence on a #461-era log (the MANICHECK=notchecked branch above),
        # so the two registers are finally treated alike. The register is tracked on main, so a tree without it is
        # a stale or damaged checkout, not a legitimate state - exactly the reasoning that branch gives.
        echo "REFUSED (gate-required floor): $LOG reports a floor of $MANIFLOOR and gates/gate-required-floor.tsv"
        echo "  is not on this tree, so the ONE floor arm that is independent of the log could not run."
        echo "  $MANIFOOT"
        echo "  Arm 1 (required >= floor) passed, but both its numbers come out of the log, so on its own it is the"
        echo "  log vouching for the log. The register is tracked on main; restore it and re-run."
        exit 1
      else
        # ANTAGONIST B's F5, UPHELD. THIS LINE WAS `... | grep -qx "$MANIFLOOR"` - THE EXACT PIPELINE THIS FILE'S
        # OWN HEADER, 143 LINES ABOVE, SAYS IS NOW AT "ZERO OCCURRENCES IN THIS DIRECTORY". Under `set -o pipefail`
        # (line 82) `grep -q` exits on first match, SIGPIPEs its upstream, and pipefail returns the upstream's 141,
        # so the pipeline reports failure WHILE GREP MATCHED. B measured the reachability honestly rather than
        # asserting it: 0 false misses in 200 trials at 1, 40 and 400 register rows, and 192 of 200 at 4000 rows -
        # so it needs the register to exceed the pipe buffer and is not reachable at one row per retirement today.
        # The fail direction was also safe (a false miss refuses rather than passes). Fixed anyway, because the
        # claim in the header was false the moment this line existed, and a latent instance of a documented class
        # is how the class comes back. Herestring, no pipe, no SIGPIPE.
        FLOORVALS="$(grep -v '^[[:space:]]*#' "$FLOORREG" | cut -f1 | tr -d ' \r')"
        if grep -qx "$MANIFLOOR" <<<"$FLOORVALS"; then
          FLOORNOTE="floor $MANIFLOOR (a recorded value in the register)"
        else
          echo "REFUSED (gate-required floor): $LOG reports a floor of $MANIFLOOR, which is not a value"
          echo "  gates/gate-required-floor.tsv has ever recorded."
          echo "  $MANIFOOT"
          echo "  recorded floors: $(paste -sd, - <<<"$FLOORVALS")"
          echo "  The register is append-only and every floor the suite has run under is a row in it, so a log"
          echo "  naming a floor that is in no row was not produced by a tree carrying this register. That is the"
          echo "  one floor check here that does not read its answer out of the log it is judging."
          exit 1
        fi
        # ── ARM 3, #467 AFTER ANTAGONIST A's 5.1. THE SET, NOT THE COUNT. ───────────────────────────────────────
        # A produced a manifest line BYTE-IDENTICAL to an honest tree's while the gate CLAUDE.md calls the only
        # cover for brilliancy explanations was gone from the suite - by promoting a known-absent row to required
        # and touching a stub, so the count paid for the removal. Arms 1 and 2 both passed, because both read the
        # COUNT. The line now carries a digest of the sorted required gate NAMES, and it gets the same membership
        # test as the floor: a digest the register has never recorded is a set nobody recorded.
        if [ "$MANIREQSET" = "NOT-CHECKED" ]; then
          echo "REFUSED (required-set digest): $LOG's run could not compute the required-set digest."
          echo "  $MANIFOOT"
          exit 1
        fi
        REQSETVALS="$(grep -v '^[[:space:]]*#' "$FLOORREG" | cut -f9 | tr -d ' \r' | grep -v '^$' | grep -v '^-$' || true)"
        if [ -z "$REQSETVALS" ]; then
          echo "NOTE (required-set digest): the floor register records no digests, so $LOG's reqset $MANIREQSET could"
          echo "  not be checked for membership. That is a pre-#467 register, and this arm is NOT CHECKED - which is"
          echo "  not the same as passing. Arms 1 and 2 ran."
          FLOORNOTE="$FLOORNOTE; reqset $MANIREQSET NOT CHECKED (register records no digests)"
        elif grep -qx "$MANIREQSET" <<<"$REQSETVALS"; then
          FLOORNOTE="$FLOORNOTE, reqset $MANIREQSET (a recorded set)"
        else
          echo "REFUSED (required-set digest): $LOG reports a required-set digest of $MANIREQSET, which"
          echo "  gates/gate-required-floor.tsv has never recorded."
          echo "  $MANIFOOT"
          echo "  recorded digests: $(paste -sd, - <<<"$REQSETVALS")"
          echo "  The SET of gates that suite required is not a set this project has recorded requiring. This is the"
          echo "  arm that catches a SWAP - a gate promoted to pay for a real gate being de-required, which leaves"
          echo "  the count, and therefore arms 1 and 2, completely unmoved [antagonist A's 5.1 on #467]."
          exit 1
        fi
      fi
    elif [ "$FLOORERA" -eq 1 ]; then
      # ANTAGONIST B's F9, UPHELD, AND THE COMMENT IT CONTRADICTS IS MINE. The OK line's floor note was set only
      # inside the MANIFLOOR branch, so on a PRE-#467 log nothing was printed at all - while the comment at the
      # print site says in terms "a check that was NOT CHECKED must not be invisible in the OK line". It was
      # invisible. This branch cannot be reached (a #467-era log with no MANIFLOOR is refused above), so it is
      # here for shape; the pre-#467 case is handled at the print site itself.
      FLOORNOTE="floor NOT CHECKED - this log carries no floor field"
    fi
    if [ $(( MANIPRES - MANIUNL + MANIMISS )) -ne "$MANIREQ" ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG's manifest line does not add up."
      echo "  line: $MANIFOOT"
      echo "  required($MANIREQ) should equal present($MANIPRES) - unlisted($MANIUNL) + missing($MANIMISS) = $(( MANIPRES - MANIUNL + MANIMISS ))."
      echo "  A mismatch means rows were skipped or counted twice, so 'missing' does not mean what it says."
      exit 1
    fi
    # ── #462. ANTAGONIST B'S GROUND 1: THE ROSTER LINE WAS NEVER READ, SO THIS SCRIPT ACCEPTED A FORGERY. ──────
    # gates.sh:232 writes `gates ran (N): <names>` - the ONLY record in a log of WHICH gates actually ran, and the
    # entire subject of the job the manifest was built for. Nothing here read it. Worse, the section count WAS
    # computed, inside the final OK echo, and compared to nothing - so the message printed "4 suites" and
    # "47 required, 47 present" on adjacent lines and did not notice.
    # MEASURED by antagonist B from the shipped-surface door and REPRODUCED by this build before accepting it: a
    # 25-line file with 4 sections, 12 PASS and an honest-looking manifest line was accepted as
    # "OK: ... is a full-suite green for #462 (4 suites, 12 PASS, footer agrees)", exit 0.
    # WHY THE MANIFEST COULD NEVER HAVE COVERED THIS: the manifest proves what is ON DISK. `required` subset of
    # `present` subset of `ran` holds only INSIDE a live gates.sh; verify-log.sh is by definition the tool that
    # runs on a log with no tree. So this is the tenth costume of "the check and the thing being checked were the
    # same object", in the file written to retire the ninth - both halves of the cross-check were in the log, free.
    # THE FIX USES FOUR RECORDS THE LOG ALREADY CARRIES, written by different code at different moments:
    #   (1) the roster's own declared N, (2) the names it actually lists, (3) the `=== ` section headers echoed as
    #   each gate STARTED, and (4) MANIREQ from the manifest line. MEASURED AGAINST THE REAL #462 LOG, NOT A
    #   FIXTURE I WROTE: the roster INCLUDES mountcheck as its first name, so sections == roster and roster ==
    #   MANIREQ + 1. MY FIRST VERSION ASSERTED roster+1 == sections AND roster == MANIREQ, and it REFUSED THE
    #   GENUINE GREEN LOG - because the synthetic control I validated against was built from my own belief about
    #   the roster rather than from the artefact, so it agreed with the bug. That is CLAUDE.md's #432/#433 rule
    #   (a fixture that encodes the same assumption as the code cannot see that assumption) committed by the very
    #   check written to stop a log overstating itself. A trimmed roster fails (1) vs (2); a truncated
    #   or hand-made log fails (3); a shrunken required set fails (4).
    # GATED ON MANIERA, exactly as the manifest line is, and that is not a detail: MEASURED, not one of the 93
    # archived logs carries a roster line, because gates.sh:232 is #461 code and #461 never shipped. An ungated
    # version of this check would refuse all 93 and I nearly wrote one.
    ROSTER="$(grep -m1 '^gates ran (' "$LOG" || true)"
    if [ -z "$ROSTER" ]; then
      echo "REFUSED (gates ran): $LOG is footed $FOOT and carries no 'gates ran (N):' line."
      echo "  Every gates.sh from #461 writes one. Without it the log cannot say WHICH gates ran, and a log that"
      echo "  cannot say that is exactly what this script used to accept as a full-suite green."
      exit 1
    fi
    RN="$(sed -E 's/^gates ran \(([0-9]+)\):.*$/\1/' <<<"$ROSTER")"
    case "$RN" in ''|*[!0-9]*)
      echo "REFUSED (gates ran): $LOG's roster line does not carry a numeric count."
      echo "  line: $ROSTER"
      exit 1;; esac
    RNAMES="$(sed -E 's/^gates ran \([0-9]+\): *//' <<<"$ROSTER" | wc -w)"
    SECN="$(grep -c '^=== ' "$LOG" || true)"
    if [ "$RN" -ne "$RNAMES" ]; then
      echo "REFUSED (gates ran): $LOG's roster says $RN gates ran but lists $RNAMES names."
      echo "  line: $ROSTER"
      echo "  A roster that disagrees with itself has been trimmed or rewritten."
      exit 1
    fi
    if [ "$SECN" -ne "$RN" ]; then
      echo "REFUSED (gates ran): $LOG claims $RN gates ran but carries $SECN '=== ' section(s)."
      echo "  A full run echoes exactly one section per entry in the roster, so sections should be $RN."
      echo "  These two are written by different code at different moments, which is why they catch a log that"
      echo "  was truncated, trimmed, reconstructed or hand-made. THIS IS THE CHECK THAT REFUSES B'S FORGERY."
      exit 1
    fi
    # mountcheck IS in the roster (it is the first name) and is NOT a gates/regress file, so it has no manifest
    # row: a full run's roster is therefore MANIREQ + 1. I had this as RN == MANIREQ and the REAL LOG DISPROVED IT.
    if [ "$RN" -ne $(( MANIREQ + 1 )) ]; then
      echo "REFUSED (gates ran): $LOG's manifest requires $MANIREQ gates, so the roster should be $(( MANIREQ + 1 )) with mountcheck, but it is $RN."
      echo "  line: $ROSTER"
      echo "  manifest: $MANIFOOT"
      echo "  The manifest says which gates must EXIST; the roster says which ones RAN. A green that covers fewer"
      echo "  gates than the manifest requires is the defect this whole mechanism was built to make visible."
      exit 1
    fi
    # ── #462. ANTAGONIST A'S G1: EIGHT FIELDS PARSED, FOUR ACTED ON. `unjustified` EXISTS SO THAT A REASONLESS
    # `absent`/`retired` row is treated as MISSING-hard - it is one of the three conditions in gatemanifest.sh's
    # own exit-1 triple (MISSING || UNJUSTIFIED || MALFORMED). This script refused on the other two and PRINTED
    # THIS ONE BACK AS PART OF ITS OK. Measured by A: a self-consistent full-suite green log carrying
    # "3 unjustified" returned OK exit 0, and so did "99 known-absent" and "99 retired".
    # That is verbatim the defect this same file condemns 40 lines above, where #461's antagonist A made the
    # parser demand a well-formed line - and then three of the eight fields it extracts were dropped.
    if [ "$MANIUNJ" -gt 0 ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG reports $MANIUNJ gate(s) de-required with NO REASON."
      echo "  line: $MANIFOOT"
      echo "  gatemanifest.sh treats unjustified as hard (its exit-1 triple is MISSING || UNJUSTIFIED || MALFORMED),"
      echo "  so gates.sh should have stopped before running a gate. A log in this state was assembled some other"
      echo "  way. This is the only forensic signal separating a hand-edited manifest line from a real one."
      exit 1
    fi
    fi
  fi
elif [ "$MANIERA" -eq 1 ]; then
  # B's F1, SECOND HALF, AND MY FIRST FIX MISSED IT - caught by running B's own second command rather than
  # assuming the first fix covered both. Refusing a #461 log whose run said "NOT CHECKED" does nothing about a
  # #461 log with the manifest line DELETED, which is the cheaper attack and reached OK exit 0. The old OK text
  # then said of a #461 log that it "predates #461", which was the tell: that branch exists for ARCHIVED logs and
  # a current log was falling into it. Both halves now key on the SAME era test, so there is one rule, not two.
  echo "REFUSED (gate manifest): $LOG is footed $FOOT but carries NO 'gate manifest:' line at all."
  echo "  Every gates.sh from #461 writes one, before any gate runs. Its absence in a $FOOT log means the line"
  echo "  was removed, or the log was assembled by something other than gates.sh - and either way nothing here"
  echo "  can tell you whether the suite ran with every expected gate present."
  echo "  (Logs footed #460 and earlier legitimately have none and are reported NOT CHECKED, not refused.)"
  exit 1
fi

# (7) --on-main: does this green describe the tree that SHIPS? Opt-in; see the note in the header.
if [ "$ONMAIN" -eq 1 ]; then
  REF="$(grep -o '^ref: HEAD [0-9a-f]\{7,40\}' "$LOG" | tail -1 | awk '{print $3}' || true)"
  if [ -z "$REF" ]; then
    echo "REFUSED (--on-main): $LOG carries no 'ref: HEAD <sha>' line, so the tree it gated cannot be identified."
    echo "  Logs from before #417 have none - re-gate, or check the ref by hand and say so where you cite this log."
    exit 1
  fi
  MAIN="$(git ls-remote origin refs/heads/main 2>/dev/null | head -1 | cut -f1)"
  if [ -z "$MAIN" ]; then
    echo "REFUSED (--on-main): could not read refs/heads/main on origin (offline, refused, or no such branch)."
    echo "  UNKNOWN is not a pass."; exit 1
  fi
  # FETCH FIRST. The ancestor test needs the remote object locally, and nothing else here fetches, so on a stale
  # clone - exactly the dashboard or supervisor this flag is for - a tree that genuinely shipped was being called
  # unshipped, confidently enough to be quoted. Found by the #417 antagonist.
  git fetch -q origin main 2>/dev/null || true
  if [ "$REF" != "$MAIN" ] && ! git merge-base --is-ancestor "$REF" "$MAIN" 2>/dev/null; then
    echo "REFUSED (--on-main): $LOG gated $REF, which is NOT on origin/main ($MAIN)."
    echo "  on: $(git branch -a --contains "$REF" 2>/dev/null | sed 's/^[* ] *//' | paste -sd, - || echo 'no local ref')"
    echo "  The log is honest and the suite was green; this green just does not describe the tree that ships."
    exit 1
  fi
  echo "ON-MAIN OK: $REF is an ancestor-or-equal of origin/main ($MAIN)"
fi
# (8) --this-bundle: does this green describe the bundle that is on disk RIGHT NOW? The push-time half.
if [ "$THISBUNDLE" -eq 1 ]; then
  LOGMD5="$(head -1 "$LOG" | grep -o 'md5 [0-9a-f]\{12,32\}' | head -1 | awk '{print $2}' || true)"
  if [ -z "$LOGMD5" ]; then
    echo "REFUSED (--this-bundle): $LOG has no 'md5 <hex>' on its header line, so the bundle it gated is unknown."; exit 1
  fi
  ROOTDIR="$(cd "$(dirname "$0")/.." && pwd)"
  DISKMD5="$(md5sum "$ROOTDIR/app.js" 2>/dev/null | cut -c1-${#LOGMD5})"
  if [ -z "$DISKMD5" ]; then
    echo "REFUSED (--this-bundle): could not read $ROOTDIR/app.js"; exit 1
  fi
  if [ "$LOGMD5" != "$DISKMD5" ]; then
    echo "REFUSED (--this-bundle): $LOG gated bundle md5 $LOGMD5, but app.js on disk is $DISKMD5."
    echo "  The log is honest about what it measured; it just did not measure what you are about to push."; exit 1
  fi
  echo "THIS-BUNDLE OK: the log gated md5 $LOGMD5, which is app.js on disk"
fi
echo "OK: $LOG is a full-suite green for $FOOT ($(grep -c '^=== ' "$LOG") suites, $ACTUAL PASS, footer agrees)"
# #467. SAY WHICH FLOOR ARM ACTUALLY RAN. A check that was NOT CHECKED must not be invisible in the OK line, or the
# reader takes the OK as covering it - which is the whole reason this project writes "not checked" lists at all.
# ANTAGONIST B's F9, UPHELD: for a PRE-#467 log FLOORNOTE was empty and this line printed NOTHING, so the OK line
# was silent about a check that had not run - the exact condition the sentence above forbids. A log older than #467
# carries no floor field and CANNOT be checked against one; that is a fact about the log, not a pass, and it now
# says so. Era-gated rather than unconditional, because saying "not checked" on a log that WAS checked is the
# opposite error.
if [ -n "$FLOORNOTE" ]; then
  echo "    gate-required $FLOORNOTE"
elif [ "$FLOORERA" -eq 0 ]; then
  echo "    gate-required floor: NOT CHECKED - $FOOT predates #467, so this log carries no floor field. Nothing"
  echo "      here says whether its tree required fewer gates than an accepted tree already did."
fi
# AND SAY WHAT THAT OK IS NOT, EVERY TIME. Added #450. "OK" above is a statement about the SUITE: these
# assertions ran over that bundle and none failed. It is NOT an authorisation to push, and it was read as one -
# see (10) and gates/held-trees.tsv. The adversarial pass is part of this project's push bar and NOTHING
# mechanical records it, so a green log plus a clean merge-base can look like permission when a previous run
# has already refused the same tree. One line of output is cheap; the revert it is pointed at cost 17 minutes
# on main and a build number.
# AND REPORT THE HOLD CHECK POSITIVELY. B's second ground: the old text said "(checked against
# gates/held-trees.tsv above)" and nothing was ever printed above on a clean lookup, so the cross-reference
# pointed at blank space - and read identically whether the register had cleared the tree or had not been read
# at all. A check with no output is a check the reader has to take on faith, which is what this file is against.
if [ "$HELDCHECK" = "ran" ]; then
  echo "    register: not held ($HELDROWS live row(s) checked in gates/held-trees.tsv)"
else
  echo "    register: NOT CHECKED - gates/held-trees.tsv is missing (see the warning above)"
fi
case "$MANICHECK" in
  ran) echo "    manifest: $MANIFOOT" ;;
  notchecked) echo "    manifest: NOT CHECKED - the run could not read gates/gate-manifest.tsv ($MANIFOOT)" ;;
  *) echo "    manifest: NOT CHECKED - this log carries no 'gate manifest:' footer. Builds up to #460 wrote none,"
     echo "              so it says nothing about whether every expected gate was present when it ran. A $FOOT log"
     echo "              reaching this branch would have been REFUSED above, not reported here." ;;
esac
echo "    NOTE: that is a statement about the SUITE, not permission to push. It says these assertions ran over"
echo "    that bundle and none failed. It does not say the adversarial pass cleared the tree, and it does not"
echo "    say this is the tree you are pushing (pass --this-bundle and --on-main to ask those two)."
