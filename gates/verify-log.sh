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
#   6b. if the log carries a "gate manifest:" footer (#461 and later), it reports 0 missing and 0 unlisted
#      gates - so a suite that ran with a required gate deleted, renamed or never merged cannot authorise a
#      push. A log with no such footer is reported NOT CHECKED, never passed silently.
#   7. the tree it gated is NOT on the held register, gates/held-trees.tsv (ON BY DEFAULT, added #450),
#      by bundle md5, by any sha on the row, or by the stamp-independent md5 of chess.jsx at the gated sha.
#      A MISSING register is reported as 'NOT CHECKED', never as a pass - see the note at check (10).
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
#    needs no network, no git and no commit. It cannot be unconditional - it would refuse all 49 archived
#    gatelogs, which gated bundles long replaced - so it is the flag you pass at the moment you are pushing.
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
# (11) THE EXPECTED-GATES MANIFEST LINE, added #461 for
# jobs/gates-green-does-not-assert-which-gates-RAN-so-a-deleted-gate-is-invisible-2026-10-01.
# Checks (1) to (6) all ask whether the log is a well-formed full-suite green. EVERY ONE OF THEM RETURNS YES FOR A
# SUITE THAT RAN WITH A GATE DELETED, because gates.sh globbed the directory and the deleted gate simply was not
# counted. gates.sh now writes its manifest verdict into the footer, so this reads it.
#
# IT IS CONDITIONAL ON THE LINE BEING THERE, AND THAT IS NOT A LOOPHOLE - it is the same decision the header
# records for --this-bundle ("it cannot be unconditional - it would refuse all 49 archived gatelogs"). Every log
# committed before #461 has no manifest line, and refusing them all would make this script useless for exactly
# the audits it exists to serve. SO: line present -> enforced. Line absent -> reported as NOT CHECKED in the OK
# output, never silently passed, which is antagonist B's rule from #450 ("a guard whose absence is
# indistinguishable from its success is not a guard") applied to this check rather than re-learned on it.
MANICHECK="absent"; MANIMISS=""; MANIUNL=""
MANIFOOT="$(grep -m1 '^gate manifest:' "$LOG" || true)"
if [ -n "$MANIFOOT" ]; then
  if printf '%s' "$MANIFOOT" | grep -q 'NOT CHECKED'; then
    MANICHECK="notchecked"
  else
    MANICHECK="ran"
    MANIMISS="$(printf '%s' "$MANIFOOT" | grep -o '[0-9]\{1,\} missing' | grep -o '^[0-9]\{1,\}' || true)"
    MANIUNL="$(printf '%s' "$MANIFOOT" | grep -o '[0-9]\{1,\} unlisted' | grep -o '^[0-9]\{1,\}' || true)"
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
  fi
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
  *) echo "    manifest: NOT CHECKED - this log carries no 'gate manifest:' footer, so it predates #461 and"
     echo "              says nothing about whether every expected gate was present when it ran." ;;
esac
echo "    NOTE: that is a statement about the SUITE, not permission to push. It says these assertions ran over"
echo "    that bundle and none failed. It does not say the adversarial pass cleared the tree, and it does not"
echo "    say this is the tree you are pushing (pass --this-bundle and --on-main to ask those two)."
