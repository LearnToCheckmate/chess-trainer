#!/usr/bin/env bash
# gates/verify-log.sh <logfile> [expected-build] [--on-main] [--this-bundle] [--this-suite] [--ignore-held] [--ignore-fc]
# The four options may come in any order, before or after the build number. An unrecognised token is REFUSED at
# exit 1 and never read as the build number: a misspelled flag used to be swallowed silently and the gate then
# answered OK over a question nobody had asked (#537).
# gates/verify-log.sh --citations     <- reads the TREE, not a log: do the registers' citations resolve? (12)
# gates/verify-log.sh --citations     <- and arm (5): does the register join to the story list at all? (13)
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
# ── THE GIT REDIRECT VARIABLES ARE SCRUBBED, ONCE, HERE [#544, item (11) of
# directOpening_2026_10_28_batch4; the class sweep of
# jobs/gatemanifest-derives-its-root-with-git-c-so-an-inherited-git-dir-switches-off-the-gate-anchor-while-the-tier-still-prints-green-2026-10-22].
# `git -C <dir>` does NOT override an inherited GIT_DIR or GIT_WORK_TREE, so a hook, a wrapper or a parent
# process that exports one makes every git call in a script answer about ANOTHER repository - and #540 measured
# the consequence: the gate anchor read NOT CHECKED at exit 0 with every verdict around it green. #540 fixed
# that one file by PINNING --git-dir and --work-tree on each call. THE SCRUB IS THE OTHER HALF AND IT IS
# STRICTLY STRONGER: pinning cannot stop GIT_OBJECT_DIRECTORY, which redirects the OBJECT STORE rather than the
# repository, and that variable alone still switched the anchor off (that job's knownLimits 48b7b4ab6433ba59,
# P3). Removing the variables leaves each script's own root derivation - cwd, or the script's location - doing
# exactly what it did before, which is why this closes the hole without changing any selection.
# WHY IT IS SAFE: nothing in this project sets these deliberately. A caller that genuinely wants another
# repository passes a path, which still works.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES \
      GIT_NAMESPACE GIT_CEILING_DIRECTORIES GIT_COMMON_DIR GIT_DISCOVERY_ACROSS_FILESYSTEM 2>/dev/null || true

# ── (12) THE CITATIONS MODE, added by the 2026-10-03 process burst for
# jobs/nothing-checks-that-the-registers-citations-resolve-2026-09-30 (p9, test-authoring).
# THE FINDING IT ANSWERS: nothing mechanical checks that the registers' own citations resolve - the job
# measured 8 of 13 named story files and 25 of 47 written case ids pointing at nothing. Every check above
# this line reads ONE LOG; this one reads the TREE, so it is a separate entry point rather than another
# check in the log path:  gates/verify-log.sh --citations
# WHAT IT ASSERTS, and each of the three is the job's own numbering:
#   (1) every claude/stories/*.md, gates/logs/* and claude/agents/gatelogs/* path NAMED anywhere in
#       claude/stories/*.md, gates/**/*.js, HANDOFF.md or CLAUDE.md resolves in the tree, or is on the
#       allowlist below and carries its reason there.
#   (2) every case id in claude/stories/TEST-CASES.md whose row publishes a result occurs at least once,
#       by id, in the -all.log that row's section cites.
#   (3) every bundle md5 such a row cites occurs in that same log - REPORTED, NOT REFUSED. See A3 below.
# gates/logs/ IS NOT TRACKED AND THAT IS WHY (1) IS NOT VACUOUS: `git ls-files gates/logs` is empty, so a
# literal existence test on a gates/logs/<N>-all.log citation would fail for every row in the register and
# prove nothing. The archived copy under claude/agents/gatelogs/ is the artefact a later reader can actually
# open, so a gates/logs/<N>-all.log citation is resolved to claude/agents/gatelogs/<N>-all.log. A row citing
# a log that exists in NEITHER place is a dead citation, which is the thing the job is about.
# IT IS NOT WIRED INTO gates/gates.sh, AND THE OMISSION IS DELIBERATE AND RECORDED [R18, R45]. The job asks
# for it to run inside gates.sh on every build. Two reasons it does not yet: this burst agent holds the
# artefact lock on THIS FILE ONLY [R44] and may not write gates.sh; and measured on main today this mode is
# RED, so wiring it in unchanged would refuse every build until the register is repaired. Wire it in only
# after the red is cleared, or wire it in as a reported count first.
# === gates/verify-log.sh --citations-selftest : THE CONTROLS FOR ARM (4), IN BOTH DIRECTIONS.
# Added 2026-10-04 by process-build lane 4 (runId process-build-4__1791085733081) with arm (4) itself, for
# jobs/citations-resolves-paths-but-never-line-numbers-2026-10-03. It lives INSIDE this file deliberately:
# this run holds the artefact lock on gates/verify-log.sh and on nothing else [R44, one agent one artefact],
# and gates/verify-log-selftest.sh is a separate file another process lane has parked a patch for, so writing
# the controls there would collide with work that is already finished and waiting on the integration slot.
# WHY IT EXISTS AT ALL: arm (4) reads 0 dead and 0 past-EOF on a clean main, so its green proves nothing by
# itself. A check that has never been seen to fire is a report, not an instrument. Each case below asserts a
# detector FIRES on a planted defect and STAYS SILENT on the matching control, which is the standard set by
# this lane's 2026-10-03 and 2026-10-04 runs. It builds a throwaway tree under mktemp -d because the
# --citations block resolves its root as $(dirname $0)/.. and then cd's there, so the only way to drive it
# over fabricated registers is to give it a fabricated root. Nothing under the real repository is touched.
if [ "${1:-}" = "--citations-selftest" ]; then
  SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  SPASS=0; SFAIL=0
  st_ck() { # st_ck <name> <expected> <actual>
    if [ "$2" = "$3" ]; then SPASS=$((SPASS+1)); echo "  ok   $1"
    else SFAIL=$((SFAIL+1)); echo "  FAIL $1: expected [$2] got [$3]"; fi
  }
  st_tree() { # st_tree -> prints a fresh root with this script in place and a minimal tree
    T="$(mktemp -d)"
    mkdir -p "$T/gates/regress" "$T/claude/stories"
    cp "$SELF" "$T/gates/verify-log.sh"
    printf 'line1\nline2\nline3\n' > "$T/gates/regress/10-real.js"
    printf '%s\n' "$T"
  }
  st_arm4() { # st_arm4 <root> -> the one-line (4) summary
    ( cd "$1" && bash gates/verify-log.sh --citations 2>&1 | grep -E '^  \(4\) ' | head -1 )
  }
  st_verdict() { # st_verdict <root> -> CITATIONS verdict line plus exit code
    # THE PATTERN NAMES THE TWO PROSE VERDICTS AND NOT THE RATCHET LINE [#544, item (5)]. It was `^CITATIONS `,
    # which the fixed-shape `CITATIONS RATCHET:` line added by block (14) also matches - and that line prints
    # FIRST, so `head -1` silently started returning it and C7 and C7b failed against a correct mode. A selftest
    # whose selector stops naming one thing is the project's own "a bad selector is a reading".
    ( cd "$1" && bash gates/verify-log.sh --citations >"$1/out.txt" 2>&1; echo "exit=$?"; grep -E '^CITATIONS (OK|RED)' "$1/out.txt" | head -1 )
  }
  st_ratchet() { # st_ratchet <root> -> the one fixed-shape ratchet line
    # ── NO PIPELINE OUT OF THE SCRIPT [#544, close-out push checks]. This read
    #      bash gates/verify-log.sh --citations 2>&1 | grep -E '...' | head -1
    # which is a TIER D sigpipe site: `head` can close the pipe while the producer is still writing, and the
    # pipeline's exit status is discarded so a producer killed by SIGPIPE is indistinguishable from one that
    # finished. gates/gatemanifest.sh's selftest enforces a ceiling on exactly those shapes and THIS SITE
    # BREACHED IT from the moment item (5) wrote it - `gates/gatemanifest.sh --selftest` read 55 passed, 1
    # failed, naming this line. It went unseen for eleven commits because nothing between item (5) and the
    # close-out checks ran that selftest, which is this project's own lesson about a check nobody runs.
    # THERE IS NO PIPELINE AT ALL NOW, AND THE FIRST REPAIR'S OWN COMMENT WAS FALSE [antagonist A of #544,
    # finding F5, UPHELD]. That comment claimed "the script's own exit status is captured and nothing can be
    # killed mid-write" and that this was "written the way its SIBLING eight lines above already is". Neither
    # held: `|| true` DISCARDS the status (the sibling genuinely captures it, with `echo "exit=$?"`), and
    # `grep FILE | head -1` can still SIGPIPE grep under this file's own `set -uo pipefail`. What the first
    # repair actually changed was WHICH producer can be killed - grep instead of the script - and the detector
    # does not count that shape, so the site left the audit's vocabulary while the hazard stayed in the code.
    # IT IS awk AND NOT grep, AND THAT IS THE MEASURED CHOICE RATHER THAN A DODGE. `grep -m1 FILE || true`
    # removes the pipe and is STILL TIER D, because the audit counts an early-exiting grep whose status is
    # discarded whether or not a pipe is involved - re-measured here, the total stayed at 30 after that first
    # attempt. Reading the status in an `if` would make it TIER A, and TIER A is at its own ceiling of 1, so
    # that repair would breach a different limb. `awk '/re/{print; exit}' FILE` has the same early-exit
    # semantics, no second process to signal, and its status is the file read rather than the match - so the
    # hazard is gone rather than relabelled, and the site leaves the audit because it is no longer one.
    # This helper's contract is the one line it prints; the status is not consumed, and saying so is the
    # difference between a discarded status and a claimed one.
    ( cd "$1" && bash gates/verify-log.sh --citations >"$1/ratchet.txt" 2>&1 || true
      awk '/^CITATIONS RATCHET:/{print; exit}' "$1/ratchet.txt" )
  }
  # sig() AS gates/fastgate.sh:2194 DEFINES IT, COPIED HERE ON PURPOSE AND THE COPY IS NAMED. This file must not
  # depend on fastgate.sh being present (it is the push gate's own selftest and runs in bare fixture trees), so
  # the reduction is reproduced rather than imported. If fastgate.sh's sig() changes, this copy is wrong and the
  # assertions below stop meaning what they say - which is why the copy is called out here instead of inlined.
  st_sig() { grep -oE '\b(OK|RED|GREEN|FAIL)\b|[0-9]+' <<< "$1" | paste -sd, - ; }
  st_fields() { local IFS=,; local -a f=($1); printf '%s' "${#f[@]}"; }
  echo "=== citations arm (4) selftest"

  # C1 a clean line citation to a real file at a real line is counted and is not a defect.
  R="$(st_tree)"; printf 'see `gates/regress/10-real.js:2` for the pin\n' > "$R/claude/stories/A.md"
  st_ck "C1 clean citation counted, nothing flagged" \
    "  (4) 1 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R")"

  # C2 DEAD detector fires on a path that is not in the tree, and C2b stays silent when the file exists.
  R2="$(st_tree)"; printf 'see `gates/regress/99-gone.js:5`\n' > "$R2/claude/stories/A.md"
  st_ck "C2 dead path fires" \
    "  (4) 1 line-number citation(s), ceiling 48, 1 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R2")"
  # C2b plants a file LONG ENOUGH for the cited line, because the first draft of this fixture copied the
  # 3-line file and C2b then reported 1 past-EOF - the DEAD detector had gone silent exactly as asked and the
  # STALE one had correctly fired on :5 of a 3-line file. The fixture was wrong, not the arm; recorded here
  # rather than silently repaired, because a fixture that quietly agrees with a bug is this project's #432.
  printf 'a\nb\nc\nd\ne\nf\n' > "$R2/gates/regress/99-gone.js"
  st_ck "C2b dead detector silent once the file exists and is long enough" \
    "  (4) 1 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R2")"

  # C3 STALE detector fires one line past the end and C3b is silent exactly AT the end - the boundary, so an
  # off-by-one in the comparison cannot pass both halves.
  R3="$(st_tree)"; printf 'see `gates/regress/10-real.js:4`\n' > "$R3/claude/stories/A.md"
  st_ck "C3 past-EOF fires at last+1 (file has 3 lines)" \
    "  (4) 1 line-number citation(s), ceiling 48, 0 dead, 1 past end of file, 0 over ceiling" "$(st_arm4 "$R3")"
  printf 'see `gates/regress/10-real.js:3`\n' > "$R3/claude/stories/A.md"
  st_ck "C3b past-EOF silent at the last line itself" \
    "  (4) 1 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R3")"

  # C4 THE NEGATIVE CONTROL THE JOB'S OWN CASE ASKS FOR: a symbol citation must not be reported at all.
  R4="$(st_tree)"; printf 'see `gates/regress/10-real.js` at selectOpening, and `chess.jsx` at fullReset\n' > "$R4/claude/stories/A.md"
  st_ck "C4 symbol-form citations are not counted" \
    "  (4) 0 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R4")"

  # C5 the CEILING. 48 is accepted, 49 is refused, and the message names the overage.
  R5="$(st_tree)"; : > "$R5/claude/stories/A.md"
  i=1; while [ "$i" -le 48 ]; do printf 'row %s `gates/regress/10-real.js:1`\n' "$i" >> "$R5/claude/stories/A.md"; i=$((i+1)); done
  st_ck "C5 exactly at the ceiling is not over it" \
    "  (4) 48 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R5")"
  printf 'row 49 `gates/regress/10-real.js:1`\n' >> "$R5/claude/stories/A.md"
  st_ck "C5b one over the ceiling is refused" \
    "  (4) 49 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 1 over ceiling" "$(st_arm4 "$R5")"

  # C6 SCOPE. The arm is about the story registers, so an identical citation outside claude/stories/ must not
  # be counted - otherwise this file's own comments would redden it, which is how a checker eats itself.
  R6="$(st_tree)"; printf 'see `gates/regress/99-gone.js:5`\n' > "$R6/HANDOFF.md"
  mkdir -p "$R6/gates/regress"; printf '// gates/regress/99-gone.js:5\n' > "$R6/gates/regress/11-other.js"
  st_ck "C6 citations outside claude/stories/*.md are out of scope" \
    "  (4) 0 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R6")"

  # C7 THE ONE THAT MATTERS: does arm (4) actually control the verdict, or only print? Arms (1) and (2) are
  # clean in this tree by construction (no story file names a story path, and TEST-CASES.md is absent, which
  # arm (2) reports as NOT CHECKED), so the verdict moves on arm (4) alone and on nothing else.
  R7="$(st_tree)"; printf 'see `gates/regress/99-gone.js:5`\n' > "$R7/claude/stories/A.md"
  st_ck "C7 a dead line citation turns the whole mode RED at exit 1" \
    "exit=1
CITATIONS RED: 0 dead path(s), 0 unsupported case id(s), 0 misfiled row(s), 1 dead line citation(s), 0 stale line citation(s), 0 over the line-citation ceiling, 0 dead and 0 stale script citation(s). 1 row(s) NOT CHECKED." "$(st_verdict "$R7")"
  ST_RED_RAT="$(st_ratchet "$R7")"      # captured WHILE RED, because C7b overwrites the tree below
  printf 'see `gates/regress/99-gone.js` at someSymbol\n' > "$R7/claude/stories/A.md"
  st_ck "C7b the same tree in symbol form is not red - so C7 was arm (4) and not a side effect" \
    "exit=0
CITATIONS OK with 1 row(s) NOT CHECKED - which is not a pass for those rows." "$(st_verdict "$R7")"

  # ── C7c AND C7d. THE RATCHET LINE KEEPS ONE SHAPE ACROSS THE FLIP THE PROSE LINES CHANGE SHAPE ON.
  # [#544, item (5);
  # jobs/the-records-ratchet-refuses-the-commit-that-fixes-the-arm-5-breach-and-the-roster-says-this-mode-cannot-redden-a-build-2026-10-10.]
  # THIS IS THE ARM-LEVEL HALF OF THAT JOB'S CONTROL and it is deliberately not the whole of it: the end-to-end
  # half, three trees through gates/fastgate.sh's real records tier, is TC-FG-005 in gates/fastgate-drive.sh,
  # because only that one produces an exit code from the push gate. What these two pin is the property the fix
  # rests on - that the line gates/fastgate.sh reduces with sig() has the SAME FIELD COUNT when the mode is RED
  # as when it is OK, so worse()'s "different shape cannot be compared: treat as worse" can no longer fire on an
  # improvement. The two readings come from ONE tree in its two states, $R7 before and after C7b's rewrite,
  # which is why the RED one is captured above rather than re-derived: the states differ in exactly the dead
  # citation and in nothing else.
  ST_OK_RAT="$(st_ratchet "$R7")"
  # THE COUNT MOVED 15 -> 17 AT #544 ITEM (12), when arm (6)'s `scriptdead` and `scriptstale` joined the line,
  # and THIS CASE IS WHAT NOTICED - which is what it is for. It is the live field count, not a floor: a counter
  # added without updating it reddens here, and here is the only place that would see it.
  st_ck "C7c the ratchet line reduces to the same FIELD COUNT red and ok (17: one verdict word, 16 counters)" \
    "17 17" "$(printf '%s %s' "$(st_fields "$(st_sig "$ST_RED_RAT")")" "$(st_fields "$(st_sig "$ST_OK_RAT")")")"
  # AND THE TWO READINGS MUST ACTUALLY DIFFER, or C7c is 15 == 15 over one string twice [prompts/common: assert
  # the denominator in its own line]. The verdict word flips and the deadline counter moves 1 -> 0, so the pair
  # is a real flip of the mode and not two samples of one state.
  st_ck "C7d and they are the two states, not one state twice: the word flips and deadline falls" \
    "RED 1 OK 0" \
    "$(printf '%s %s %s %s' \
       "$(printf '%s' "$ST_RED_RAT" | grep -oE 'RATCHET: (OK|RED)' | awk '{print $2}')" \
       "$(printf '%s' "$ST_RED_RAT" | grep -oE 'deadline=[0-9]+' | cut -d= -f2)" \
       "$(printf '%s' "$ST_OK_RAT"  | grep -oE 'RATCHET: (OK|RED)' | awk '{print $2}')" \
       "$(printf '%s' "$ST_OK_RAT"  | grep -oE 'deadline=[0-9]+' | cut -d= -f2)")"

  # C8 DETERMINISM. Two runs over one tree must agree byte for byte [R36 admission test].
  R8="$(st_tree)"; printf 'a `gates/regress/10-real.js:4`\nb `gates/regress/99-gone.js:1`\n' > "$R8/claude/stories/A.md"
  st_ck "C8 two runs over one tree agree" "$(st_arm4 "$R8")" "$(st_arm4 "$R8")"

  # C8b/C8c/C8d THE FALL ADVICE, in all three directions, added 2026-10-10 by process-build lane 2
  # (runId process-build-2__1791619981075) with the advice itself. WHY IT NEEDS CONTROLS AT ALL, since it
  # only PRINTS: arm (4)'s advice is the one line in this mode a reader is meant to ACT on, and the previous
  # version of it told the reader to commit the floor - which lands the tree in the zero-headroom state
  # jobs/the-line-citation-ceiling-is-at-48-of-48-... was filed as a P1 for and closed by buying headroom.
  # An instruction a tool prints is part of the tool. Three directions because the advice has three states
  # and the middle one is where a one-sided prescription hides: under the ceiling it must name the headroom
  # AND the hazard, AT the ceiling it must say nothing at all, and OVER it the refusal must be unchanged.
  # THE PATTERNS BELOW ARE ARM-(4)-SPECIFIC AND THAT IS NOT TIDINESS, IT IS A MEASUREMENT [R18]. The first
  # draft of C8d and C8e grepped the bare string 'CEILING CAN BE LOWERED' and both FAILED, reading 2 where
  # they expected 0: ARM (5) PRINTS THE SAME SENTENCE for A5ZCEIL and A5WCEIL, so a control keyed on the
  # wording of one arm counts another arm's output. Measured on a throwaway tree at 48 and at 49 rows, both
  # read 2. Hence the '<N> of <M> in use' tail, which only arm (4) prints.
  st_adv() { # st_adv <root> <pattern> -> how many advice lines match
    ( cd "$1" && bash gates/verify-log.sh --citations 2>&1 | grep -cE "$2" || true )
  }
  R9="$(st_tree)"; printf 'one `gates/regress/10-real.js:1`\n' > "$R9/claude/stories/A.md"
  st_ck "C8b under the ceiling, the fall advice names the headroom it would leave" \
    "  CEILING CAN BE LOWERED: 1 of 48 in use, 47 of headroom." \
    "$( cd "$R9" && bash gates/verify-log.sh --citations 2>&1 | grep -E '^  CEILING CAN BE LOWERED' | head -1 )"
  st_ck "C8c and it refuses to recommend the fall without naming the zero-headroom P1" \
    "1" "$(st_adv "$R9" '^  AND A FALL TO THE FLOOR IS NOT FREE: committing A4CEIL=1 leaves ZERO headroom')"
  # C8d THE BOUNDARY, and it is the half that stops C8b/C8c passing by accident: exactly AT the ceiling there
  # is no fall to advise, so BOTH advice lines must be silent while the (4) summary still reports 48 of 48.
  R10="$(st_tree)"; : > "$R10/claude/stories/A.md"
  i=1; while [ "$i" -le 48 ]; do printf 'row %s `gates/regress/10-real.js:1`\n' "$i" >> "$R10/claude/stories/A.md"; i=$((i+1)); done
  st_ck "C8d at the ceiling there is no fall advice at all" \
    "0" "$(st_adv "$R10" '^  (CEILING CAN BE LOWERED: [0-9]+ of [0-9]+ in use|AND A FALL TO THE FLOOR IS NOT FREE)')"
  st_ck "C8d-b and the summary still reads 48 of 48, so C8d is silence and not an empty run" \
    "  (4) 48 line-number citation(s), ceiling 48, 0 dead, 0 past end of file, 0 over ceiling" "$(st_arm4 "$R10")"
  # C8e OVER the ceiling the REFUSAL is untouched by this change - the one assertion that proves the advice
  # edit did not weaken the ratchet it sits beside.
  printf 'row 49 `gates/regress/10-real.js:1`\n' >> "$R10/claude/stories/A.md"
  st_ck "C8e over the ceiling still refuses, and the fall advice stays silent" \
    "1 0" "$(st_adv "$R10" '^  NEW LINE CITATION\(S\): 49 exceeds the committed ceiling of 48 by 1') $(st_adv "$R10" '^  CEILING CAN BE LOWERED: [0-9]+ of [0-9]+ in use')"


  # === ARM (5) CONTROLS, C9 to C16. Added 2026-10-06 by process-build lane 2 with arm (5) itself, for the
  # remainder of jobs/register-join-and-input-count-wrong-2026-09-28. Same rule as C1-C8: every detector is
  # shown FIRING on a planted defect and SILENT on the matching control, over fabricated registers, with no
  # browser and no bundle - so no live register state can make one of them vacuous. C16 is the exception and
  # is deliberate: it reads the REAL register, because that is the remainder the #477 integration run
  # recorded against this file ("the selftest still has no case that reads the REAL register, so the ceiling
  # can go stale again invisibly"). It asserts only NON-VACUITY, never a live figure, so it cannot go stale.
  st_arm5() { # st_arm5 <root> -> the one-line (5) summary
    ( cd "$1" && bash gates/verify-log.sh --citations 2>&1 | grep -E '^  \(5\) ' | head -1 )
  }
  st_arm5line() { # st_arm5line <root> <ERE> -> the first matching arm-5 detail line
    ( cd "$1" && bash gates/verify-log.sh --citations 2>&1 | grep -E "$2" | head -1 )
  }
  st_reg() { # st_reg <root> -> a MINIMAL VALID register: one table with a story column, one row, one story
    printf '### US-X-01 a story\n\ntext\n' > "$1/claude/stories/USER-STORIES.md"
    { printf '| id | story | steps (harness) | expected, measured | executed by | last result |\n'
      printf '|---|---|---|---|---|---|\n'
      printf '| TC-X-001 | US-X-01 | a step | an expectation | gate 10 | pass |\n'; } > "$1/claude/stories/TEST-CASES.md"
  }
  echo "=== citations arm (5) selftest"

  # C9 the baseline: a minimal VALID register reads 1 row in 1 table against 1 story, nothing flagged. If this
  # line is wrong every control below is measuring the wrong thing.
  R9="$(st_tree)"; st_reg "$R9"
  st_ck "C9 a minimal valid register is clean" \
    "  (5) 1 case row(s) in 1 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R9")"

  # C9b VACUITY. Both registers EXIST and yield nothing: that is a refusal, not a clean register. This is the
  # guard that stops a ceiling going stale behind three zeros.
  R9b="$(st_tree)"; : > "$R9b/claude/stories/USER-STORIES.md"; : > "$R9b/claude/stories/TEST-CASES.md"
  st_ck "C9b present-but-empty registers REFUSE rather than pass" \
    "  REFUSED (5): both registers EXIST and the derivation is EMPTY - 0 case row(s), 0 story heading(s), 0 table(s). Arm (5) cannot report a clean register it failed to read." \
    "$(st_arm5line "$R9b" '^  REFUSED \(5\)')"

  # C9c ABSENT is NOT CHECKED and not a refusal - the distinction C7b forced, see arm (5)'s own comment. The
  # pair C9b/C9c is the whole point: one of them must refuse and the other must not.
  R9c="$(st_tree)"
  st_ck "C9c absent registers are NOT CHECKED, not refused" \
    "  (5) NOT CHECKED: claude/stories/TEST-CASES.md and/or claude/stories/USER-STORIES.md is not in this tree, so there is no register to self-check. This is not a pass." \
    "$(st_arm5line "$R9c" '^  \(5\) NOT CHECKED')"

  # C10 STORY COLUMN fires on a second table that holds TC- rows with no story column, and C10b goes silent
  # the moment that table gains one. This is the defect the job was filed for, planted.
  R10="$(st_tree)"; st_reg "$R10"
  { printf '\n| id | what | measured |\n|---|---|---|\n| TC-Y-001 | a thing | a reading |\n'; } >> "$R10/claude/stories/TEST-CASES.md"
  st_ck "C10 a story-less table fires" \
    "  (5) 2 case row(s) in 2 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 1 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R10")"
  st_reg "$R10"
  { printf '\n| id | story | what | measured |\n|---|---|---|---|\n| TC-Y-001 | US-X-01 | a thing | a reading |\n'; } >> "$R10/claude/stories/TEST-CASES.md"
  st_ck "C10b silent once that table has a story column" \
    "  (5) 2 case row(s) in 2 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R10")"

  # C11 the EXEMPTION is keyed to the normalised header text, so the exempt table is counted as exempt and
  # not as a defect; C11b proves the exemption is itself ratcheted, because an exemption with no ceiling is a
  # hole rather than a decision.
  R11="$(st_tree)"; st_reg "$R11"
  { printf '\n| id | case | measured |\n|---|---|---|\n| TC-SUITE-001 | a case | exit 0 |\n'; } >> "$R11/claude/stories/TEST-CASES.md"
  st_ck "C11 the exempt header text is exempt, not a defect" \
    "  (5) 2 case row(s) in 2 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 1 exempt of 1" "$(st_arm5 "$R11")"
  { printf '\n| id | case | measured |\n|---|---|---|\n| TC-SUITE-002 | another | exit 1 |\n'; } >> "$R11/claude/stories/TEST-CASES.md"
  st_ck "C11b a SECOND exempt-shaped table breaches the exemption ceiling" \
    "  EXEMPTION COUNT ROSE: 2 story-less table(s) matched the exemption against a ceiling of 1." \
    "$(st_arm5line "$R11" '^  EXEMPTION COUNT ROSE')"

  # C12 STORY JOIN fires on a heading nobody cites and C12b goes silent once a row cites it.
  R12="$(st_tree)"; st_reg "$R12"; printf '\n### US-X-02 an uncovered story\n' >> "$R12/claude/stories/USER-STORIES.md"
  st_ck "C12 an uncited story heading is at zero cases" \
    "  (5) 1 case row(s) in 1 table(s), 2 story heading(s), 1 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R12")"
  st_ck "C12 names the story it found, rather than only counting it" \
    "  STORY AT ZERO CASES: US-X-02 is a '### US-' heading in USER-STORIES.md that no case row's story cell cites" \
    "$(st_arm5line "$R12" '^  STORY AT ZERO CASES')"
  printf '| TC-X-002 | US-X-02 | a step | an expectation | gate 10 | pass |\n' >> "$R12/claude/stories/TEST-CASES.md"
  st_ck "C12b silent once a case row cites it" \
    "  (5) 2 case row(s) in 1 table(s), 2 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R12")"

  # C12c THE NEGATIVE CONTROL THE JOB IS ACTUALLY ABOUT. The join is COLUMN-ANCHORED: a story id mentioned
  # anywhere else on the row must NOT count as coverage. Without this control the arm could be satisfied by
  # a grep over the row, which is exactly the unanchored join whose false negatives this job measured.
  R12c="$(st_tree)"; st_reg "$R12c"; printf '\n### US-X-02 an uncovered story\n' >> "$R12c/claude/stories/USER-STORIES.md"
  printf '| TC-X-003 | US-X-01 | a step that mentions US-X-02 in prose | an expectation | gate 10 | pass |\n' >> "$R12c/claude/stories/TEST-CASES.md"
  st_ck "C12c a story named outside the story column is NOT coverage" \
    "  (5) 2 case row(s) in 1 table(s), 2 story heading(s), 1 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R12c")"

  # C13 ROW WIDTH fires on an UNESCAPED pipe and C13b is silent on the escaped form - the boundary, so the
  # detector cannot pass both halves by ignoring escaping. This is the sibling job folded in here
  # (jobs/two-case-rows-carry-unescaped-pipes).
  R13="$(st_tree)"; st_reg "$R13"
  printf '| TC-X-004 | US-X-01 | a /this|that/ regex | an expectation | gate 10 | pass |\n' >> "$R13/claude/stories/TEST-CASES.md"
  st_ck "C13 an unescaped pipe shifts the row and is caught" \
    "  (5) 2 case row(s) in 1 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 1 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R13")"
  st_reg "$R13"
  printf '| TC-X-004 | US-X-01 | a /this\\|that/ regex | an expectation | gate 10 | pass |\n' >> "$R13/claude/stories/TEST-CASES.md"
  st_ck "C13b the escaped form is silent" \
    "  (5) 2 case row(s) in 1 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 0 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R13")"

  # C14 the WIDTH CEILING: 2 is accepted, 3 is refused, and the message names the overage. Both sides, so an
  # off-by-one in the comparison cannot pass.
  R14="$(st_tree)"; st_reg "$R14"
  printf '| TC-X-005 | US-X-01 | a|b | an expectation | gate 10 | pass |\n' >> "$R14/claude/stories/TEST-CASES.md"
  printf '| TC-X-006 | US-X-01 | c|d | an expectation | gate 10 | pass |\n' >> "$R14/claude/stories/TEST-CASES.md"
  st_ck "C14 exactly at the width ceiling is not over it" \
    "  (5) 3 case row(s) in 1 table(s), 1 story heading(s), 0 at zero cases (ceiling 9), 2 wrong-width row(s) (ceiling 2), 0 unexempted story-less table(s), 0 exempt of 1" "$(st_arm5 "$R14")"
  printf '| TC-X-007 | US-X-01 | e|f | an expectation | gate 10 | pass |\n' >> "$R14/claude/stories/TEST-CASES.md"
  st_ck "C14b one over the width ceiling is refused" \
    "  NEW WRONG-WIDTH ROW(S): 3 exceeds the committed ceiling of 2 by 1." \
    "$(st_arm5line "$R14" '^  NEW WRONG-WIDTH')"

  # C15 DETERMINISM over one tree [R36 admission test].
  R15="$(st_tree)"; st_reg "$R15"; printf '\n### US-X-09 another\n' >> "$R15/claude/stories/USER-STORIES.md"
  st_ck "C15 two runs over one register agree" "$(st_arm5 "$R15")" "$(st_arm5 "$R15")"

  # C16 THE REAL REGISTER, and the ONLY control here that touches it. It asserts NON-VACUITY and nothing else
  # - no row count, no story count, no ceiling - so it can never go stale, while still failing on the one
  # thing a fabricated tree can never show: that this arm actually reads the register it was written for.
  A5REAL="$(bash "$SELF" --citations 2>&1 | grep -E '^  \(5\) [0-9]' | head -1)"
  A5RR="$(printf '%s' "$A5REAL" | sed -n 's/^  (5) \([0-9]*\) case row(s).*/\1/p')"
  A5RS="$(printf '%s' "$A5REAL" | sed -n 's/.*table(s), \([0-9]*\) story heading(s).*/\1/p')"
  st_ck "C16 the real register is read: case rows > 0" "yes" "$( [ "${A5RR:-0}" -gt 0 ] 2>/dev/null && echo yes || echo "no [$A5REAL]" )"
  st_ck "C16b the real register is read: story headings > 0" "yes" "$( [ "${A5RS:-0}" -gt 0 ] 2>/dev/null && echo yes || echo "no [$A5REAL]" )"

  # C17 THE SIGPIPE MEMBERSHIP TEST [jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02].
  # C17 and C17b are a BOUNDARY, not an assertion about the repaired text: C17 proves the banned pipe form
  # really does invert its answer, and C17b proves the herestring form does not, on the SAME input. One
  # without the other would be satisfiable by a detector that tests nothing.
  #
  # THE FIRST DRAFT OF C17 WAS NON-DETERMINISTIC AND IS RECORDED HERE RATHER THAN QUIETLY REPLACED, because
  # it is the more useful half of what this run learned. It built a 3000-row allowlist and asserted rc 141,
  # on the strength of a measurement over $ALLOW sizes: rc 0 at 1..1000 rows, 141 at 1500, 0 AGAIN at
  # 1800/2000/2200, 141 at 2500/3000/6000. Those numbers are real and they say the thing plainly - THE
  # DEFECT IS A RACE, NOT A THRESHOLD, intermittent from about 1500 rows and reliable from about 2500
  # (~65KB, one pipe buffer). A race is exactly what must not be asserted in a suite: the 3000-row form
  # passed six times and FAILED ONCE IN SIX in a second tree built from a byte-identical file, which under
  # R36 is inadmissible however green it looks on the run that wrote it.
  #
  # SO C17 TAKES THE RACE OUT OF IT BY OVERWHELMING THE PIPE, not by timing. A producer of 20,000 rows is
  # about 520KB, eight pipe buffers, so it MUST block on a write that grep -q is no longer reading - the
  # EPIPE is forced by the arithmetic rather than raced for. MEASURED 20 of 20 runs at rc 141 at this size,
  # against 6 of 7 at 3000. Two shapes were rejected before this one and both are worth knowing about: a
  # three-row producer with a `sleep` between its writes read rc 0 on every run here (the ordering alone is
  # not enough - a short stream is flushed inside one buffer and the write never blocks), and building the
  # rows in a bash loop took over 30 seconds, which fails R36's second admission test however green it is.
  # awk writes the same 20,000 rows in milliseconds.
  SPP="claude/stories/sp-0.md"
  SPSRC() { awk 'BEGIN{for(i=0;i<20000;i++) printf "claude/stories/sp-%d.md\treserved for this control\n", i}'; }
  SPPIPE=0; SPSRC | cut -f1 | grep -qxF "$SPP" || SPPIPE=$?   # SP-BANNED-FORM-ON-PURPOSE
  st_ck "C17 the BANNED pipe form inverts its answer at 20000 rows (rc 141, not 0)" "141" "$SPPIPE"
  SPHERE=0; grep -qxF "$SPP" <<<"$(cut -f1 <<<"$(SPSRC)")" || SPHERE=$?
  st_ck "C17b the herestring form answers correctly on the same 20000 rows (rc 0)" "0" "$SPHERE"
  # C17c COUNTS CODE, NOT PROSE, and the first draft of it got that wrong - it returned 2, one of which was
  # the comment at the herestring site below that QUOTES the banned form while explaining it. A detector
  # that reddens on its own documentation teaches the next holder to delete the documentation, so
  # comment-only lines are stripped before matching. ONE code line then carries the banned form on purpose -
  # C17's negative control above - marked SP-BANNED-FORM-ON-PURPOSE and excluded. THE EXEMPTION IS ITSELF
  # RATCHETED at C17d, the shape C11b already uses in this file: an exemption with no ceiling is a hole
  # rather than a decision, and without C17d this control could be satisfied by marking a real site.
  SPCODE="$(sed 's/^[[:space:]]*#.*$//' "$SELF")"
  SPALL="$(grep -cE '\|[[:space:]]*grep[[:space:]][^|]*-[a-zA-Z]*q' <<<"$SPCODE" || true)"
  SPEX="$(grep -E '\|[[:space:]]*grep[[:space:]][^|]*-[a-zA-Z]*q' <<<"$SPCODE" | grep -cF 'SP-BANNED-FORM-ON-PURPOSE' || true)"
  SPSITES=$(( SPALL - SPEX ))
  st_ck "C17c no UNEXEMPTED membership test in this file's CODE is a pipe into grep -q (ceiling 0, of $SPALL)" "0" "$SPSITES"
  st_ck "C17d the exemption is ratcheted: exactly 1 deliberate site, so marking a real one breaks this" "1" "$SPEX"

  # ── C18: ARM (6) OVER THE REAL TREE, AND WHY IT IS NOT A FABRICATED-ROOT CASE [#544, item (12)].
  #     Arm (6) resolves every `<script>:<line>` citation in the PRESCRIPTIVE files (CLAUDE.md, the tools under
  #     gates/ and their READMEs) and refuses a dead path or one past end of file. It reads the repository with
  #     `git grep`, so it CANNOT be driven from the fabricated roots the C-cases above build: those are mktemp
  #     directories with no git repository, where `git grep` returns nothing and the arm honestly reports 0 of
  #     0. That limit is named rather than worked around with a scope override, because a scope knob on a
  #     push-gate arm is a way to narrow it silently.
  #     SO THIS CASE IS THE LIVE INVARIANT: on THIS tree the prescriptive set must carry no citation that fails
  #     to resolve. It reddens the moment someone writes one, which is the guard the job asks for, and the
  #     DETECTOR's own power is controlled separately - with a planted file carrying one dead and one past-EOF
  #     citation, measured at #544, where the arm names both and the verdict line counts them.
  # NO PIPE, AND THE FIRST DRAFT OF THIS LINE PAID FOR IT. It read
  #   bash "$SELF" --citations | grep -m1 '^  (6) ' | grep -oE '...' || echo 'NO ARM (6) LINE'
  # and printed BOTH the real value and the fallback: `grep -m1` exits at its first match, SIGPIPEs the
  # producer behind it, and under this file's `set -uo pipefail` the pipeline's status is non-zero although the
  # grep itself succeeded - so the `|| echo` arm ran too. That is gates.sh's MANI_LINE defect (#477) and the
  # class gates/audit/pipefail-grep.sh ratchets, reproduced by me in the very commit that adds an arm about
  # citations resolving. One capture, then a herestring, which has no pipe and therefore no SIGPIPE.
  C18OUT="$( bash "$SELF" --citations 2>/dev/null )"
  C18="$( grep -oE '[0-9]+ dead, [0-9]+ past end of file' <<<"$C18OUT" | head -1 )"
  [ -n "$C18" ] || C18='NO ARM (6) LINE'
  st_ck "C18 arm (6): every script line-number citation in the prescriptive set resolves, on this tree" \
    "0 dead, 0 past end of file" "$C18"

  echo "  citations-selftest: $SPASS pass, $SFAIL fail"
  [ "$SFAIL" -eq 0 ] || exit 1
  exit 0
fi
if [ "${1:-}" = "--citations" ] || [ "${1:-}" = "citations" ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  cd "$ROOT" || { echo "REFUSED (--citations): cannot cd to $ROOT"; exit 1; }
  # THE ALLOWLIST IS THE POINT, NOT A LOOPHOLE (the job's words). A reserved name belongs here WITH ITS
  # REASON; a name that is merely broken does not. One entry per line: <path><TAB><reason>.
  ALLOW="claude/stories/REVIEW-SUITE-FULL.md	reserved, not written: claude/stories/README.md says the full review suite keeps this name"
  SRC=""
  for f in claude/stories/*.md gates/*.js gates/*/*.js HANDOFF.md CLAUDE.md; do
    [ -f "$f" ] && SRC="$SRC $f"
  done
  A1BAD=0; A1OK=0; A1ALLOW=0
  echo "=== citations (1): do the named paths resolve?"
  # grep -o over the source set, keeping file:line so a dead citation can be fixed where it is written.
  CITES="$(grep -onE '(claude/stories/[A-Za-z0-9_.-]+\.md|claude/agents/gatelogs/[A-Za-z0-9_.-]+\.log|gates/logs/[A-Za-z0-9_.-]+\.log)' $SRC 2>/dev/null | sort -u || true)"
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    WHERE="${c%:*}"; P="${c##*:}"
    # a gates/logs citation resolves to its archived copy, per the note above
    TEST="$P"
    case "$P" in gates/logs/*) TEST="claude/agents/gatelogs/${P#gates/logs/}";; esac
    if [ -e "$TEST" ]; then A1OK=$((A1OK+1)); continue; fi
    # HERESTRING, NOT A PIPE [jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02].
    # THE CLASS: under `set -o pipefail` (line 84) a membership test written as a pipe returns 141, not 0,
    # whenever `grep -q` short-circuits on an early match and SIGPIPEs the producer still writing behind it.
    # The rc of this pipeline lands in an `if`, so a 141 reads as NOT FOUND - an ALLOWLISTED path is then
    # counted at A1BAD and line 662 turns the whole arm CITATIONS RED. That is a green suite refused at the
    # push gate with a false cause, which is the class this job is named after.
    # MEASURED THIS RUN on the pipe form, matching on row 1 of an $ALLOW of n rows: rc 0 at n=1..1000,
    # rc 141 at n=1500, rc 0 again at n=1800/2000/2200, rc 141 at n=2500/3000/6000. IT IS A RACE, NOT A
    # THRESHOLD - intermittent from about 1500 rows and reliable from about 2500 (~65KB, one pipe buffer).
    # $ALLOW holds ONE row today, so the defect is LATENT; the trigger grows every time a reserved name is
    # added here, and a flaky push gate is worse than a failing one. The herestring has no pipe and
    # therefore no SIGPIPE: rc 0 at every n measured above. Controls C17/C17b/C17c pin both halves.
    if grep -qxF "$P" <<<"$(cut -f1 <<<"$ALLOW")"; then
      A1ALLOW=$((A1ALLOW+1)); continue
    fi
    A1BAD=$((A1BAD+1))
    echo "  DEAD CITATION: $P (named at $WHERE; looked for $TEST)"
  done <<EOF
$CITES
EOF
  echo "  (1) $A1OK resolved, $A1ALLOW allowlisted, $A1BAD dead"
  # (2) and (3) read the case register only. No register, no claim: NOT CHECKED, never a pass.
  TC="claude/stories/TEST-CASES.md"
  A2BAD=0; A2OK=0; A2NC=0; A2MIS=0; A3BAD=0; A3OK=0; A3NC=0
  echo "=== citations (2): does every published case id occur in the log its section cites?"
  if [ ! -f "$TC" ]; then
    echo "  NOT CHECKED: $TC is absent, so no case id can be resolved. That is not a pass."
    A2NC=1; A3NC=1
  else
    SECLOG=""
    while IFS= read -r line; do
      case "$line" in
        '## '*)
          SECLOG="$(printf '%s' "$line" | grep -oE 'gates/logs/[A-Za-z0-9_.-]+\.log' | head -1 || true)"
          [ -n "$SECLOG" ] && SECLOG="claude/agents/gatelogs/${SECLOG#gates/logs/}"
          continue;;
        '| TC-'*) ;;
        *) continue;;
      esac
      ID="$(printf '%s' "$line" | cut -d'|' -f2 | tr -d ' ')"
      [ -n "$ID" ] || continue
      RESULT="$(printf '%s' "$line" | awk -F'|' '{print $(NF-1)}')"
      # "publishes a result" = the last cell carries a PASS/FAIL figure, not a plan or a dash.
      case "$RESULT" in *PASS*|*FAIL*|*pass*|*fail*) ;; *) continue;; esac
      # a row may cite its own log, which wins over the section's
      ROWLOG="$(printf '%s' "$line" | grep -oE 'gates/logs/[A-Za-z0-9_.-]+\.log' | head -1 || true)"
      [ -n "$ROWLOG" ] && ROWLOG="claude/agents/gatelogs/${ROWLOG#gates/logs/}"
      # THE ROW'S OWN BUILD NUMBER OUTRANKS ITS SECTION HEADING, and that is not a nicety: MEASURED on main
      # today, 14 rows between TC-R20 and TC-R44 sit physically under the "Cross-app invariants - executed
      # against #423" heading while their published cells name #427, #428, #448 and #469. Reading the section
      # heading alone reported every one of them as UNSUPPORTED against 423-all.log, which is a true statement
      # about the wrong log and would have sent a reader to repair rows that are merely MISFILED. So: if the
      # published cell names #NNN and claude/agents/gatelogs/NNN-all.log exists, that log is the one the row is
      # checked against, and the disagreement with the section is counted and reported in its own right.
      ROWB="$(printf '%s' "$RESULT" | grep -oE '#[0-9]{3,4}' | head -1 | tr -d '#' || true)"
      ROWBLOG=""
      if [ -n "$ROWB" ] && [ -f "claude/agents/gatelogs/$ROWB-all.log" ]; then
        ROWBLOG="claude/agents/gatelogs/$ROWB-all.log"
      fi
      USELOG="${ROWLOG:-${ROWBLOG:-$SECLOG}}"
      if [ -n "$ROWBLOG" ] && [ -n "$SECLOG" ] && [ "$ROWBLOG" != "$SECLOG" ] && [ -z "$ROWLOG" ]; then
        A2MIS=$((A2MIS+1))
        echo "  MISFILED: $ID publishes a result from $ROWB but sits under a section citing $SECLOG"
      fi
      if [ -z "$USELOG" ]; then
        A2NC=$((A2NC+1)); echo "  NOT CHECKED: $ID publishes a result and neither it nor its section names a log"
        continue
      fi
      if [ ! -f "$USELOG" ]; then
        A2NC=$((A2NC+1)); echo "  NOT CHECKED: $ID cites $USELOG, which is not in the tree (that is (1)'s red, not this one's)"
        continue
      fi
      if grep -qF "$ID" "$USELOG"; then A2OK=$((A2OK+1)); else
        A2BAD=$((A2BAD+1)); echo "  UNSUPPORTED: $ID publishes a result but its id occurs nowhere in $USELOG"
      fi
      # (3) the bundle md5 the row cites must occur in that log.
      for M in $(printf '%s' "$line" | grep -oiE 'md5[ ]+[0-9a-f]{12,32}' | awk '{print $2}' | tr 'A-F' 'a-f' | sort -u); do
        if grep -qiF "$M" "$USELOG"; then A3OK=$((A3OK+1)); else
          A3BAD=$((A3BAD+1)); echo "  REPORTED (3): $ID cites bundle md5 $M, which does not occur in $USELOG"
        fi
      done
    done < "$TC"
  fi
  echo "  (2) $A2OK supported, $A2BAD unsupported, $A2MIS misfiled under a section citing another log, $A2NC not checked"
  echo "=== citations (3): bundle md5s cited by a row - REPORTED, NOT REFUSED"
  echo "  (3) $A3OK found in the cited log, $A3BAD not found"
  # A3 IS REPORTED RATHER THAN REFUSED, AND THE REASON IS A REAL GAP, NOT CAUTION. A case row legitimately
  # cites TWO kinds of bundle: the one its published result was measured on, which must be in the log, and the
  # NEGATIVE-CONTROL bundles built inside the gate, which never reach a committed log and must not be. Nothing
  # in the row's syntax separates them, so a refusal here would redden correct rows. Separating them needs a
  # row-level convention that does not exist yet; that remainder is named on
  # jobs/case-rows-publish-a-figure-from-a-bundle-that-did-not-ship-2026-09-30, not left for a reader to infer.
  # === (4) LINE-NUMBER CITATIONS IN THE STORY REGISTERS. A COMPARATOR, AND A RATCHET RATHER THAN A BAN.
  # jobs/citations-resolves-paths-but-never-line-numbers-2026-10-03 (P2, priority 9, build). Antagonist A,
  # on the cross-read of #474's batch: arms (1), (2) and (3) above ask "does the named PATH resolve?", "does
  # the case id occur in its log?" and "is the md5 in that log?" - and NONE of them reads a line number, so a
  # citation whose path resolves and whose NNN points at the wrong code is invisible here. Re-derived on
  # origin/main at 11abfaa before this arm was written [R18]: `grep -cE ':\$\{?LINE|lineno|:[0-9]+.*resolve'`
  # over this file returned 0. The finding is real and it was still real.
  #
  # ITS theFix PREFERRED OPTION 2 - "REFUSE a path:NNN citation outright in claude/stories/*.md" - AND THAT
  # OPTION IS NOT LANDABLE AS WRITTEN. MEASURED here before building, which the job did not do: there are
  # 48 such citations in claude/stories/*.md on main today (MENU-LANE 8, SUITE-AUDIT 4, TEST-CASES 21,
  # USER-STORIES 15, README 0), all 48 resolve to a file in the tree, and 0 of 48 point past that file's end.
  # THE 46 THAT STOOD HERE IS WITHDRAWN [R18, antagonist B's veto F1 on the 2026-10-04 integration, upheld].
  # It read 46 with TEST-CASES 20 and USER-STORIES 14, and it was CORRECT WHEN TAKEN on origin/main at
  # 11abfaa and STALE BY TWO WHEN COMMITTED: two chess.jsx line citations were added to the registers
  # between 11abfaa and 4db6036 (TEST-CASES 20->21, USER-STORIES 14->15), by six commits to claude/stories/
  # that this arm's author never re-read. Re-derived with this arm's OWN pattern at the landing commit:
  # MENU-LANE 8, SUITE-AUDIT 4, TEST-CASES 21, USER-STORIES 15 = 48, 0 dead, 0 past EOF. The integration that
  # landed this payload touched NO file under claude/stories/, so the breach was never the landing run's.
  # WHY THIS WAS NOT 'JUST SET IT TO 48': the nine expected strings in the selftest above hard-code the
  # ceiling, and C5/C5b plant rows against it - so changing the constant alone takes the selftest RED and,
  # worse, leaves C5b asserting that its row count is over a ceiling it is not over. The fixtures move with
  # the constant or the control stops controlling.
  # THE FIGURES '46 AND 47' THAT STOOD IN THAT SENTENCE ARE WITHDRAWN [R18, process-build lane 2,
  # runId process-build-2__1791619981075, 4:3xam ET, 10 Oct]. They were correct when written against a
  # ceiling of 46 and were carried through the 46->48 correction two paragraphs above without being
  # re-derived, so the sentence explaining why the constant is hard to move was itself an un-re-derived
  # number of the kind it warns about. MEASURED on origin/main 4c7e007 by reading the two fixture loops:
  # C5 plants 48 and C5b plants 49, i.e. ceiling and ceiling+1, which is what the boundary needs. The
  # MECHANISM the sentence states is unaffected and is why this is a correction and not a withdrawal:
  # the fixtures are pinned to the constant's value either way.
  # So an outright refusal is RED ON A CLEAN TREE from its first run, on 48 pre-existing rows in two
  # historical lane documents nobody is editing - and gate 67's own note records the verdict on that shape:
  # "a gate red on a good build is worse than no gate". a5313ab is also narrower than the job quotes it as:
  # its subject is one comment block inside chess.jsx, not the registers, so a blanket ban on the registers
  # would be a NEW rule invented by a checker rather than the enforcement of a decided one [R45 (4)].
  #
  # SO THIS ARM DOES THE THREE THINGS THAT CAN BE TRUE MECHANICALLY, and the ratchet is borrowed from
  # gates/build-numbers.tsv the same way gate-manifest.tsv borrows it:
  #   A4a DEAD   - the cited path does not exist at all. Unambiguous. REFUSES.
  #   A4b STALE  - the path exists and NNN is past its last line. Provably wrong without knowing what SHOULD
  #                be there, which is the objection the job itself raises against option 1. REFUSES.
  #   A4c CEILING- the total count may never RISE above the committed ceiling below, so no new line-number
  #                citation can be added to a register. Falling is encouraged and the arm prints the lower
  #                number to commit. REFUSES on a rise only.
  # WHAT THIS ARM STILL CANNOT DO, said plainly rather than left to be discovered: a citation that resolves
  # and lands on the WRONG EXISTING LINE - TC-R16 B5b at :188 against its real site at :320, the instance A
  # measured - passes A4a, A4b and A4c. No checker can catch that without knowing the intended target, which
  # is the whole reason a5313ab chose symbol citations. A4c is the only defence against the class GROWING,
  # and it is a ceiling, not a cure. That remainder stays on the job as whatIsLeft [R05].
  A4CEIL=48
  A4TOT=0; A4DEAD=0; A4EOF=0
  echo "=== citations (4): line-number citations in claude/stories/*.md - dead, past-EOF, and the ceiling"
  A4CITES="$(grep -onE '((gates/[A-Za-z0-9_./-]+\.(js|sh))|chess\.jsx|app\.js|lessons\.js|index\.html|sw\.js):[0-9]+' claude/stories/*.md 2>/dev/null || true)"
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    # c is <file>:<lineno>:<path>:<NNN>; take the citation off the right so a path with colons cannot shift it
    CIT="${c##*:}"; REST="${c%:*}"; P="${REST##*:}"; WHERE="${REST%:*}"
    A4TOT=$((A4TOT+1))
    if [ ! -f "$P" ]; then
      A4DEAD=$((A4DEAD+1)); echo "  DEAD LINE CITATION: $P:$CIT - $P is not in the tree (named at $WHERE)"
      continue
    fi
    PLINES="$(wc -l < "$P" | tr -d ' ')"
    if [ "$CIT" -gt "$PLINES" ]; then
      A4EOF=$((A4EOF+1)); echo "  STALE LINE CITATION: $P:$CIT but $P has $PLINES lines (named at $WHERE)"
    fi
  done <<EOF
$A4CITES
EOF
  A4RISE=0
  if [ "$A4TOT" -gt "$A4CEIL" ]; then
    A4RISE=$((A4TOT-A4CEIL))
    echo "  NEW LINE CITATION(S): $A4TOT exceeds the committed ceiling of $A4CEIL by $A4RISE. Cite a symbol, not a line [a5313ab]."
  elif [ "$A4TOT" -lt "$A4CEIL" ]; then
    A4HEAD=$((A4CEIL-A4TOT))
    echo "  CEILING CAN BE LOWERED: $A4TOT of $A4CEIL in use, $A4HEAD of headroom."
    echo "  AND A FALL TO THE FLOOR IS NOT FREE: committing A4CEIL=$A4TOT leaves ZERO headroom, which is the exact state jobs/the-line-citation-ceiling-is-at-48-of-48-so-any-build-touching-claude-stories-reddens-the-push-gate-2026-10-06 was filed as a P1 for and CLOSED on 2026-10-07 by BUYING headroom, not by committing the floor. Lower it together with a de-pinning that leaves headroom - main has gone that way twice, 0fbbc47 and 1f5ca10 - or leave the ceiling and say why."
  fi
  echo "  (4) $A4TOT line-number citation(s), ceiling $A4CEIL, $A4DEAD dead, $A4EOF past end of file, $A4RISE over ceiling"

  # === (6) THE SAME QUESTION, ASKED OF THE DOCUMENTS A BUILDER FOLLOWS [#544, item (12) of
  #     directOpening_2026_10_28_batch4; the instrument half of
  #     jobs/citations-resolves-paths-but-never-line-numbers-2026-10-03].
  # ARM (4) ABOVE COVERS claude/stories/ ONLY, and the class that keeps biting is in the PRESCRIPTIVE files -
  # CLAUDE.md, the tools under gates/ and their READMEs - where a wrong pointer costs a run rather than a
  # reader's patience. That job measured the damage twice: #499 found the whole set shifted by +26 and #506 by
  # +66, every citation into gates.sh above its `set -uo pipefail` wrong by exactly the size of an insertion
  # below it, and NO TOOL FOUND EITHER - an antagonist did, both times, because nothing resolved a line number
  # outside claude/stories.
  # WHAT THIS ARM ASKS, AND WHAT IT DELIBERATELY DOES NOT. It resolves every `<script>:<line>` citation in those
  # files and refuses a DEAD path or one PAST END OF FILE. It does NOT ratchet the COUNT, and that is a decision
  # with a measurement behind it rather than a softening: 113 such citations live in the prescriptive set today
  # (89 outside HANDOFF.md, which every close-out rewrites), and writing one is normal practice in this
  # project's tool comments - so a ceiling would fire on the normal case, which CLAUDE.md records as how a guard
  # gets switched off. The count is PUBLISHED instead, so the denominator is in every log.
  # AND THE BLINDNESS THAT REMAINS IS NAMED RATHER THAN PAPERED OVER: a citation into a file that only GREW
  # still resolves, so the +26 and +66 shifts would still pass this arm. Nothing mechanical can see them - the
  # line is real text, just not the right text - and the two cheap fixes that job proposes are a BAN on the
  # form (hostile today, see the 113) or a token match between the citing prose and the cited line (a
  # heuristic, and a wrong one reads as a defect). What closes it is citing by SYMBOL, which CLAUDE.md #503
  # pointer 4 prescribes in prose; this arm makes the half that IS decidable decidable.
  # `gates/cases/README.md` IS OUT OF THIS SCOPE BECAUSE THE PUSH-CHECKS TIER IS REVERTED [#544]. It arrived
  # with that tier and the tier is reverted whole on four upheld vetoes, so the path does not exist on this
  # tree or on main. A glob for an absent path is harmless here - arm (6) reports scriptdead=0 either way - and
  # it is removed rather than left, because the next reader cannot tell a scope entry for a file that is gone
  # from one for a file that was never written.
  A6SCOPE="CLAUDE.md gates/*.sh gates/audit/*.sh gates/regress/README.md gates/pending/README.md"
  # HANDOFF.md IS OUT OF SCOPE, and the reason is mechanical: a close-out rewrites it wholesale every run, so
  # its citations are a moving target and 24 of the 113 live there. RUN-LOG.md, claude/PROCESS-LOG.md,
  # claude/process-log/ and claude/agents/ are out for the reason that job gives for RUN-LOG.md: they are
  # historical rows that must not be rewritten, so a stale pointer in them is a true record of what was cited.
  A6ALLOW="gates/regress/99-gone.js gates/regress/10-real.js gates/regress/01-fixture.js"
  # THE ALLOWLIST IS THE FIXTURE PATHS, and without it this arm reports 14 dead citations that are not defects:
  # every one is a FABRICATED path inside a selftest string in this very file (a deliberately absent gate, so a
  # case can prove the dead-path detector fires). A scan that counted them would be the "a bad selector is a
  # reading" trap, and it is listed here by name rather than pattern so a real dead path cannot hide behind it.
  A6TOT=0; A6DEAD=0; A6EOF=0; A6BAD=""
  A6CITES="$(git grep -nHoE '(gates/[A-Za-z0-9_./-]+\.(sh|js)|chess\.jsx|app\.js):[0-9]+' -- $A6SCOPE 2>/dev/null || true)"
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    WHERE="${c%%:*}:$(printf '%s' "$c" | cut -d: -f2)"
    TGT="$(printf '%s' "$c" | cut -d: -f3)"; TLN="$(printf '%s' "$c" | cut -d: -f4)"
    [ -n "$TGT" ] && [ -n "$TLN" ] || continue
    case " $A6ALLOW " in *" $TGT "*) continue;; esac
    A6TOT=$((A6TOT+1))
    if [ ! -f "$TGT" ]; then
      A6DEAD=$((A6DEAD+1)); A6BAD="$A6BAD $WHERE->$TGT"
      echo "  DEAD SCRIPT CITATION: $TGT:$TLN - $TGT is not in the tree (named at $WHERE)"
    else
      TL="$(wc -l < "$TGT" 2>/dev/null || echo 0)"
      if [ "$TLN" -gt "$TL" ] 2>/dev/null; then
        A6EOF=$((A6EOF+1)); A6BAD="$A6BAD $WHERE->$TGT:$TLN"
        echo "  STALE SCRIPT CITATION: $TGT:$TLN but $TGT has $TL lines (named at $WHERE)"
      fi
    fi
  done <<EOF6
$A6CITES
EOF6
  echo "  (6) $A6TOT script line-number citation(s) in the prescriptive set, $A6DEAD dead, $A6EOF past end of file (no ceiling, by design - see the comment)"
  A6BADN=$((A6DEAD+A6EOF))
  # ── (13) ARM (5), THE REGISTER SELF-CHECK. Added 2026-10-06 by process-build lane 2
  # (runId process-build-2__1791274433682) for the remainder of
  # jobs/register-join-and-input-count-wrong-2026-09-28 (P?, priority 14, finishFirst band 14), whose
  # outcome.whatIsLeft names THIS FILE: "the only register-reading tool is gates/verify-log.sh --citations,
  # whose three arms are path resolution, case-id-in-cited-log and bundle md5s - no story-column, story-join
  # or inputs-vs-loop-bounds arm". So the arm goes here and not into a new script.
  #
  # WHAT IT CHECKS, and all three FIRE ON origin/main 97392e2 TODAY, which is why each is a ratchet and not
  # a ban - gate 67's verdict is that a gate red on a good build is worse than no gate:
  #   A5a STORY COLUMN. A table in claude/stories/TEST-CASES.md that holds TC- rows and whose header has no
  #       `story` column cannot be joined to USER-STORIES.md at all, so every case in it reads as zero
  #       coverage. MEASURED: 5 tables hold TC- rows; 4 have the column, 1 does not (the 14-row TC-SUITE
  #       table). That one is EXEMPT BY NAME WITH ITS REASON and the exemption is itself counted, so a
  #       SECOND story-less table refuses. This is the exact defect the job was filed for - it was the Home
  #       table in September, it was fixed, and the class recurred in a different table.
  #   A5b STORY JOIN. A `### US-` heading in USER-STORIES.md that no case row's story cell cites has no test.
  #       MEASURED: 32 headings, 23 cited, 9 at zero - US-INV-04, US-R35, US-PL-11, US-PL-12, US-PL-13,
  #       US-PL-14, US-GL-01, US-R32, US-R36. The job measured 3 of 18 in September and said 2 of the 3 were
  #       false negatives from one table's schema. The schema is fixed and the number is now NINE of 32, so
  #       the real gap TRIPLED while the false one was being closed. A5ZCEIL may only FALL.
  #   A5c ROW WIDTH. A TC- row whose column count differs from its own table's header is misparsed by every
  #       column-anchored join, including A5b's. Pipes inside a cell must be escaped as \| ; this arm counts
  #       on UNESCAPED pipes only. MEASURED: exactly 2 - TC-R19 at 15 columns against a 6-column header, and
  #       TC-R37 at 3 - which is the sibling the job's remainder says to fold in here
  #       (jobs/two-case-rows-carry-unescaped-pipes). A5WCEIL may only FALL.
  #
  # WHAT THIS ARM DELIBERATELY DOES NOT DO, and the measurement that decided it [R18, R07]. The job's `case`
  # field also asks that "every inputs cell's stated state count equals the product of the loop bounds in the
  # gate file named on the same row". IT IS NOT BUILDABLE AS A TEXT SCAN OVER THESE CELLS AND I MEASURED THAT
  # RATHER THAN ASSUMING IT: a product regex of the form <n> ... x <m> ... = <k> over all 56 TC- rows matches
  # 8 rows, and SIX of the 8 matches are GEOMETRY PAIRS ("320x568", "320x844", "375x730") rather than state
  # products - a 75% false-positive rate on the only mechanical form the cells offer. A detector that wrong
  # would be worse than none, so the half is left on the job with what it would actually need: a declared
  # machine-readable inputs count (a cell field like `N=2x3=6`), or the gate printing its own input count for
  # this arm to read. That is a schema change to the register and to the gates, not a scan.
  #
  # IT IS NOT WIRED INTO gates/gates.sh, for the same two reasons arm (4) is not, and the omission is
  # recorded rather than left to be found: this run holds the artefact lock on THIS FILE and may not write
  # gates.sh [R44], and this mode is RED on main today on arms (1) and (2), so wiring it in unchanged would
  # refuse every build.
  A5ZCEIL=9
  A5WCEIL=2
  A5EXEMPT_CEIL=1
  # One exemption, by its NORMALISED header text, with its reason. Normalised means "| a | b | c |" with
  # single spaces, which is what the awk below prints, so a reflow of the table's whitespace cannot silently
  # void the exemption or silently keep it.
  A5EXKEY="| id | case | measured |"
  A5EXWHY="the 14 TC-SUITE rows are about gates/gatemanifest.sh's own exit codes - suite machinery with no user story to join to, which is the same allowance R08 gives a storyClause of 'none - machinery, not product'"
  echo "=== citations (5): the register self-check - story column, story join, row width"
  A5OUT="$(awk '
    function trim(s){ sub(/^[ \t]+/,"",s); sub(/[ \t]+$/,"",s); return s }
    function ncell(l, arr,   t,k){ t=l; gsub(/\\\|/,"\001",t); t=trim(t); sub(/^\|/,"",t); sub(/\|$/,"",t); k=split(t,arr,"|"); return k }
    FNR==1 { fn++ }
    fn==1 { if ($0 ~ /^### US-/){ s=$0; sub(/^### /,"",s); split(s,A," "); story[A[1]]=1; so[++sn]=A[1] } next }
    { L[++n]=$0 }
    END {
      hl=""
      for(i=1;i<=n;i++){
        if (substr(L[i],1,1)=="|" && L[i+1] ~ /^\|[ :|-]+$/) {
          k=ncell(L[i],C); hl=i; hcols[hl]=k; hrows[hl]=0; hstory[hl]=0; h=""
          for(j=1;j<=k;j++){ if (tolower(trim(C[j]))=="story") hstory[hl]=1; h=h "| " trim(C[j]) " " }
          hdr[hl]=h "|"
          continue
        }
        if (L[i] ~ /^\|[ \t]*TC-/) {
          k=ncell(L[i],C); id=trim(C[1]); rows++
          if (hl==""){ print "ORPHANROW\t" i "\t" id; continue }
          hrows[hl]++
          if (k != hcols[hl]) print "WIDTH\t" i "\t" id "\t" k "\t" hcols[hl] "\t" hl
          if (hstory[hl]) { m = (k>=2 ? C[2] : "")
            while (match(m, /US-[A-Za-z0-9-]+/)) { cited[substr(m,RSTART,RLENGTH)]=1; m=substr(m,RSTART+RLENGTH) } }
        }
      }
      for(hl2 in hrows) if (hrows[hl2]>0) { tabs++; print "TABLE\t" hl2 "\t" (hstory[hl2]?"story":"nostory") "\t" hrows[hl2] "\t" hdr[hl2] }
      z=0; for(i=1;i<=sn;i++) if (!(so[i] in cited)) { print "ZERO\t" so[i]; z++ }
      print "TOTALS\t" rows+0 "\t" sn+0 "\t" z+0 "\t" tabs+0
    }
  ' claude/stories/USER-STORIES.md claude/stories/TEST-CASES.md 2>/dev/null || true)"
  A5TBAD=0; A5EX=0; A5WIDE=0; A5ZERO=0; A5ROWS=0; A5STORIES=0; A5TABS=0; A5ORPH=0; A5ZLIST=""
  while IFS="$(printf '\t')" read -r TAG F2 F3 F4 F5 F6; do
    [ -n "$TAG" ] || continue
    case "$TAG" in
      TABLE)
        A5TABS=$((A5TABS+1))
        if [ "$F3" = "nostory" ]; then
          if [ "$F5" = "$A5EXKEY" ]; then
            A5EX=$((A5EX+1))
            echo "  EXEMPT STORY-LESS TABLE: TEST-CASES.md:$F2 '$F5' with $F4 row(s) - $A5EXWHY"
          else
            A5TBAD=$((A5TBAD+1))
            echo "  NO STORY COLUMN: TEST-CASES.md:$F2 '$F5' holds $F4 TC- row(s) and has no story column, so every one of them joins to zero stories. Add the column or exempt it by name with a reason in A5EXKEY."
          fi
        fi
        ;;
      WIDTH)
        A5WIDE=$((A5WIDE+1))
        echo "  WRONG ROW WIDTH: TEST-CASES.md:$F2 $F3 has $F4 column(s) against its table header's $F5 (header at :$F6). Escape literal pipes as \\| - an unescaped one shifts every cell after it, including the story cell this arm joins on."
        ;;
      ZERO)
        A5ZERO=$((A5ZERO+1)); A5ZLIST="$A5ZLIST $F2"
        echo "  STORY AT ZERO CASES: $F2 is a '### US-' heading in USER-STORIES.md that no case row's story cell cites"
        ;;
      ORPHANROW)
        A5ORPH=$((A5ORPH+1))
        echo "  ORPHAN CASE ROW: TEST-CASES.md:$F2 $F3 appears before any table header, so it belongs to no table"
        ;;
      # +0 ON EVERY TOTAL IN THE awk ABOVE IS NOT TIDINESS, IT IS C9b. An awk variable that was never
      # incremented concatenates as the EMPTY STRING, not as 0, so on a tree with no story headings the
      # TOTALS line arrived as a short record and $A5STORIES came through blank - which is a numeric test
      # against an empty string in the vacuity guard, i.e. the guard against a vacuous reading was itself
      # the thing that read vacuously. Caught by C9b on its first run, not by inspection; the :-0 defaults
      # below are the belt to that braces.
      TOTALS) A5ROWS="${F2:-0}"; A5STORIES="${F3:-0}" ;;
    esac
  done <<EOF
$A5OUT
EOF
  # THE SOUNDNESS GUARD, and it is the remainder the #477 integration run recorded against this file:
  # "the selftest still has no case that reads the REAL register, so the ceiling can go stale again
  # invisibly". A derivation that reads nothing prints three zeros and looks perfect, so an empty reading is
  # a REFUSAL and not a pass. Controlled in both directions in --citations-selftest (C9/C9b).
  #
  # ABSENT IS NOT EMPTY, AND THIS DISTINCTION WAS FORCED ON ME BY A CONTROL RATHER THAN FORESEEN. The first
  # draft refused whenever the derivation was empty, including when the two register files do not exist at
  # all - and C7b, a control arm (4) had already committed, went red: the selftest builds fabricated roots
  # with no registers in them, so arm (5) was turning every one of those trees RED for a reason that has
  # nothing to do with the tree under test. A guard that reddens eleven unrelated controls is the "check and
  # the thing being checked are the same set" trap, and the fix is the convention arm (2) already uses:
  # a register that is NOT THERE is NOT CHECKED and says so; a register that IS there and yields nothing is
  # a refusal. The red is recorded here rather than quietly repaired.
  A5VAC=0; A5NC=0
  if [ ! -f claude/stories/TEST-CASES.md ] || [ ! -f claude/stories/USER-STORIES.md ]; then
    A5NC=1
    echo "  (5) NOT CHECKED: claude/stories/TEST-CASES.md and/or claude/stories/USER-STORIES.md is not in this tree, so there is no register to self-check. This is not a pass."
  elif [ "$A5ROWS" -eq 0 ] || [ "$A5STORIES" -eq 0 ] || [ "$A5TABS" -eq 0 ]; then
    A5VAC=1
    echo "  REFUSED (5): both registers EXIST and the derivation is EMPTY - $A5ROWS case row(s), $A5STORIES story heading(s), $A5TABS table(s). Arm (5) cannot report a clean register it failed to read."
  fi
  A5ZRISE=0; A5WRISE=0; A5EXRISE=0
  if [ "$A5ZERO" -gt "$A5ZCEIL" ]; then
    A5ZRISE=$((A5ZERO-A5ZCEIL)); echo "  NEW STORY AT ZERO CASES: $A5ZERO exceeds the committed ceiling of $A5ZCEIL by $A5ZRISE. Write the case, or list the story with a reason."
  elif [ "$A5ZERO" -lt "$A5ZCEIL" ]; then
    echo "  CEILING CAN BE LOWERED: $A5ZERO of $A5ZCEIL stories at zero cases. Commit A5ZCEIL=$A5ZERO in this file so it cannot rise again."
  fi
  if [ "$A5WIDE" -gt "$A5WCEIL" ]; then
    A5WRISE=$((A5WIDE-A5WCEIL)); echo "  NEW WRONG-WIDTH ROW(S): $A5WIDE exceeds the committed ceiling of $A5WCEIL by $A5WRISE."
  elif [ "$A5WIDE" -lt "$A5WCEIL" ]; then
    echo "  CEILING CAN BE LOWERED: $A5WIDE of $A5WCEIL wrong-width rows. Commit A5WCEIL=$A5WIDE in this file so it cannot rise again."
  fi
  if [ "$A5EX" -gt "$A5EXEMPT_CEIL" ]; then
    A5EXRISE=$((A5EX-A5EXEMPT_CEIL)); echo "  EXEMPTION COUNT ROSE: $A5EX story-less table(s) matched the exemption against a ceiling of $A5EXEMPT_CEIL."
  fi
  echo "  (5) $A5ROWS case row(s) in $A5TABS table(s), $A5STORIES story heading(s), $A5ZERO at zero cases (ceiling $A5ZCEIL), $A5WIDE wrong-width row(s) (ceiling $A5WCEIL), $A5TBAD unexempted story-less table(s), $A5EX exempt of $A5EXEMPT_CEIL"
  A5BAD=$((A5TBAD+A5ORPH+A5VAC+A5ZRISE+A5WRISE+A5EXRISE))
  if [ "$A5BAD" -gt 0 ]; then
    echo "REGISTER SELF-CHECK RED: $A5TBAD unexempted story-less table(s), $A5ORPH orphan row(s), $A5ZRISE new story(ies) at zero cases, $A5WRISE new wrong-width row(s), $A5EXRISE excess exemption(s), $A5VAC empty derivation(s)."
  elif [ "$A5NC" -eq 1 ]; then
    echo "REGISTER SELF-CHECK NOT CHECKED: no register in this tree."
  else
    echo "REGISTER SELF-CHECK OK: $A5ROWS rows in $A5TABS tables join to $A5STORIES stories; $A5ZERO at zero (<=$A5ZCEIL) and $A5WIDE wrong-width (<=$A5WCEIL) are both at or under their committed ceilings."
  fi
  # ── (14) THE RATCHET LINE: ONE FIXED-SHAPE LINE OF DEFECT COUNTERS, PRINTED IN EVERY BRANCH ───────────────
  # [#544, item (5) of directOpening_2026_10_28_batch4;
  # jobs/the-records-ratchet-refuses-the-commit-that-fixes-the-arm-5-breach-and-the-roster-says-this-mode-cannot-redden-a-build-2026-10-10.]
  #
  # WHY IT EXISTS. gates/fastgate.sh runs this mode as a RATCHET on the push path:
  #     ratchet "records" '^(CITATIONS|REGISTER SELF-CHECK)' ... bash "$G/verify-log.sh" --citations
  # Its sig() reduces the matched lines to the words OK/RED/GREEN/FAIL plus EVERY INTEGER on them, and its
  # worse() refuses outright when the field COUNT differs ("different shape cannot be compared: treat as worse").
  # The three prose verdict lines above are written for a human and change shape between their branches - the
  # RED ones enumerate breach counters, the OK ones enumerate the register's TOTALS, and NOT CHECKED carries no
  # number at all - so TWO ordinary things read as WORSE:
  #   (i)  FIXING a breach. Arm (5) RED -> OK takes the signature from 7 fields to 8, so the commit that fixes
  #        the thing the ratchet watches reads FAST GATE RED. Measured in that job: 15 fields against 16.
  #   (ii) GROWING THE REGISTER. The OK line carries rows, tables and stories, which are SIZES; adding case rows
  #        raises them and every rise reads as a defect. Measured on a scratch commit over 8556910: base OK at
  #        150 rows in 6 tables / 35 stories, head OK at 165 in 8 / 36, FAST GATE RED with no defect count moved.
  #        That is four of the twelve docs-only jobs in the queue unable to take the fast route.
  # THE LINE BELOW IS WHAT THE RATCHET READS INSTEAD: one verdict word and FOURTEEN counters, always all of them,
  # always in this order, every one a DEFECT count where lower is better and none of them a size. So the ratchet
  # compares numbers, which is what it was built to do, and the three prose lines stay prose. gates/fastgate.sh
  # passes '^CITATIONS RATCHET:' as its signature grep while still DISPLAYING and logging the prose lines.
  # TWO THINGS IT DELIBERATELY DOES CARRY. `notchecked` is on it because a row that cannot be checked rising is a
  # real loss, and `noregister` is on it because a tree with no register at all would otherwise read as all-zero
  # and therefore better than one with a defect - that is the NOT CHECKED branch's zero-field signature wearing
  # a fixed shape, and it must still be refused.
  # ITS LABELS CARRY NO DIGITS, AND THAT IS LOAD-BEARING RATHER THAN STYLE: sig() takes every integer on the
  # line, so a label like `a5tbad` or `arm5` would contribute a phantom field of its own and shift every counter
  # after it. If you add a counter here, spell its name in letters.
  # #544, item (12): `scriptdead` and `scriptstale` join the line. ADDING A COUNTER CHANGES ITS FIELD COUNT, and
  # the consequence is bounded and is the same one the block above describes for the line's own introduction:
  # a records-tier ratchet whose BASE predates this commit falls back to the verdict-grep comparison, out loud,
  # and once the commit is on main both sides carry 16 fields again. The alternative - never adding a counter -
  # would make the line unable to grow with the arms, which is worse.
  if [ "$A1BAD" -gt 0 ] || [ "$A2BAD" -gt 0 ] || [ "$A4DEAD" -gt 0 ] || [ "$A4EOF" -gt 0 ] || [ "$A4RISE" -gt 0 ] || [ "$A5BAD" -gt 0 ] || [ "${A6BADN:-0}" -gt 0 ]
  then RATV=RED; else RATV=OK; fi
  echo "CITATIONS RATCHET: $RATV deadpath=$A1BAD badcaseid=$A2BAD misfiled=$A2MIS deadline=$A4DEAD staleline=$A4EOF overceiling=$A4RISE notchecked=$A2NC storyless=$A5TBAD orphan=$A5ORPH zerorise=$A5ZRISE widthrise=$A5WRISE exemptrise=$A5EXRISE vacuous=$A5VAC noregister=$A5NC scriptdead=${A6DEAD:-0} scriptstale=${A6EOF:-0}"
  if [ "$A1BAD" -gt 0 ] || [ "$A2BAD" -gt 0 ] || [ "$A4DEAD" -gt 0 ] || [ "$A4EOF" -gt 0 ] || [ "$A4RISE" -gt 0 ] || [ "$A5BAD" -gt 0 ] || [ "${A6BADN:-0}" -gt 0 ]; then
    [ "${A6BADN:-0}" -gt 0 ] && echo "  (6) the script citations that do not resolve:$A6BAD"
    echo "CITATIONS RED: $A1BAD dead path(s), $A2BAD unsupported case id(s), $A2MIS misfiled row(s), $A4DEAD dead line citation(s), $A4EOF stale line citation(s), $A4RISE over the line-citation ceiling, ${A6DEAD:-0} dead and ${A6EOF:-0} stale script citation(s). $A2NC row(s) NOT CHECKED."
    exit 1
  fi
  if [ "$A2NC" -gt 0 ]; then
    echo "CITATIONS OK with $A2NC row(s) NOT CHECKED - which is not a pass for those rows."
    exit 0
  fi
  echo "CITATIONS OK: every named path resolves, every published case id occurs in the log it cites, and every line-number citation resolves within its file at or below the ceiling of $A4CEIL."
  exit 0
fi
LOG="${1:-}"; WANT=""; ONMAIN=0; THISBUNDLE=0; THISSUITE=0; IGNOREHELD=0; IGNOREFC=0
# ── THE ARGUMENT PARSER REFUSES WHAT IT DOES NOT RECOGNISE (#537, the VLMISS job) ──────────────────────────
# jobs/verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03, from an antagonist B of 3 Oct
# 2026, re-sighted by #534's third pair. THE DEFECT: this loop's catch-all `*)` took ANY unrecognised token as
# the build number, with no shape test and last-wins. So a MISSPELLED FLAG placed BEFORE the build number was
# overwritten by the real number and VANISHED SILENTLY, and the script then answered OK at exit 0 without ever
# asking the question the operator believed they had asked.
# MEASURED on main ed65bab against claude/agents/gatelogs/534-all.log, whose honest verdict is a refusal:
#   --this-bundle   -> REFUSES at exit 1, correctly
#   --this-bundel   -> the OK text at exit 0, with its own NOTE that --this-bundle was not asked
# and the same for -this-bundle, --this_bundle, --thisbundle, --on-mian and --ignore-helds. #534's third
# antagonist B measured 9 misspellings out of 9 taking exit 0.
# WHAT MADE IT WORSE THAN A SILENT DROP: the OK text ends by ADVISING the operator to "pass --this-bundle and
# --on-main to ask those two" - that is, to pass the flag they believe they just passed. And it is
# ORDER-DEPENDENT, so the same typo AFTER the number refuses loudly: intermittent, which is worse than
# consistently wrong, because the loud case teaches the operator to trust the quiet one.
# THE FIX IS TWO TESTS AND NO NEW BEHAVIOUR FOR ANY VALID FORM. A token starting with `-` that is not one of
# the three known flags is a TYPO and can never be a build number, so it is refused by name. Anything else must
# match ^#[0-9]{3,4}$ - the shape gates/build.sh and gates/gates.sh both require, and the shape gates.sh
# already validates for its own tag while this script did not.
# THE SHAPE TEST IS A `case` GLOB AND NOT A REGEX, deliberately: it needs no grep, so it cannot be perturbed by
# `set -o pipefail`, a locale, or a grep that goes binary on an odd byte - which is the class of accident this
# very script records against itself at (9).
for a in "${@:2}"; do
  case "$a" in
    --on-main)     ONMAIN=1 ;;
    --this-bundle) THISBUNDLE=1 ;;
    --this-suite)  THISSUITE=1 ;;   # #540, SUITEKEY: arm (8b) below
    --ignore-held) IGNOREHELD=1 ;;
    --ignore-fc) IGNOREFC=1 ;;
    # AN EMPTY POSITIONAL IS NOT A TYPO, AND REFUSING IT WAS A REGRESSION THIS PARSER INTRODUCED.
    # `verify-log.sh "$LOG" "$NUM"` with NUM unset or empty passes an empty string, which ed65bab ignored
    # (exit 0, no build number pinned) and the new loop sent to the "not a build number" arm at exit 1.
    # MEASURED both ways on this tree. A caller whose variable is empty asked for NO PIN; it did not ask for a
    # refusal, and the point of this loop was to catch the token that gets silently OVERWRITTEN - not to fail a
    # call ed65bab answered. It sits above the `-*` arm because '' matches neither glob and would otherwise
    # fall to the catch-all. Found by antagonist A, #537.
    # AND IT SAYS SO, WHICH THE FIRST VERSION OF THIS ARM DID NOT. Restoring exit 0 restored ed65bab's SILENCE
    # with it: a caller whose $NUM was empty got the full OK verdict with no build number pinned and no notice
    # that one had been skipped, which is #450's shape in the script that answers the question. An empty $NUM is
    # at least as likely to be a broken caller as a deliberate "no pin", and this tool does not get to decide
    # which - so it does what it did and says what it did not do. The first version's justification also called
    # this "the one token a CALLER produces"; measured, NO caller in this repository passes a build number
    # variable to this script at all, so that was an interpretation offered as a fact. Antagonist A, #537.
    '')   echo "NOTE: an empty positional was ignored - NO build number is pinned by this check." ;;
    -*)
      echo "REFUSED: '$a' is not an option this script knows."
      echo "  It looks like a flag, so it is a TYPO and is NEVER read as a build number. Before this check a"
      echo "  misspelling placed before the build number was silently overwritten by it, and the gate then"
      echo "  answered OK over a question nobody had asked."
      echo "  The five options are --on-main, --this-bundle, --this-suite, --ignore-held and --ignore-fc, in any order, before or after"
      echo "  the build number."
      exit 1 ;;
    '#'[0-9][0-9][0-9]|'#'[0-9][0-9][0-9][0-9])
      WANT="$a" ;;
    *)
      echo "REFUSED: '$a' is not a build number."
      echo "  A build number is '#' followed by 3 or 4 digits (^#[0-9]{3,4}\$), which is what gates/build.sh and"
      echo "  gates/gates.sh both require; a number outside that shape can never match a log or a stamp."
      echo "  Refusing rather than taking it as one, which is what this parser used to do with any token."
      exit 1 ;;
  esac
done
[ -n "$LOG" ] || { echo "usage: gates/verify-log.sh <logfile> [#NNN] [--on-main] [--this-bundle] [--this-suite] [--ignore-held] [--ignore-fc]"
  echo "       gates/verify-log.sh --citations    (checks the registers' citations against the tree, see (12))"
  echo "       gates/verify-log.sh --citations-selftest   (the both-direction controls for citation arms (4) and (5))"; exit 1; }
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
# A LINE COUNT IS THE RIGHT INSTRUMENT HERE AND THE WRONG ONE FOR REDS. Noted beside the PASS check by the
# 2026-10-03 process burst, which is where
# jobs/a-fail-line-count-on-a-gatelog-over-reports-by-up-to-five-2026-10-03 (p8) asks for the recipe to live.
# THE ASYMMETRY: check (6) above is a SELF-CONSISTENCY test - the footer counts ^PASS lines and so does this,
# so the two agree by construction whatever gates.sh does with duplicates. A RED COUNT is not that: gates.sh
# replays failed assertions, so one failing assertion can produce several ^FAIL lines and a line count
# over-reports the number of distinct reds (measured at up to five on one gatelog). Wherever a red count is
# PUBLISHED - a run report, a RUN-LOG row, a ledger row - count distinct assertion ids, not lines:
#     grep -o '^FAIL [A-Za-z0-9]*' <log> | sort -u | wc -l
# That is correct on both log shapes and costs nothing. The rejected alternative was changing gates.sh's FAIL
# prefix so a line count would be right by construction; it would break every existing reader that greps the
# log, so it needs its own control and is not done here. This script publishes no red count of its own - it
# refuses or it does not - so nothing above changes; the recipe is here because this is the file a reader opens
# when asking what a gatelog's numbers mean.
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

# ── THE HELD REGISTER IS READ AS THE UNION OF HEAD'S COPY AND THE WORKING TREE'S [#534, HELDWT;
# jobs/verify-log-sh-and-held-sh-read-the-held-register-from-the-working-tree-so-one-uncommitted-line-deletion-clears-a-held-refusal-2026-10-22,
# routed from #531's antagonist B].
# WHAT WAS WRONG: both loops below read "$REG", the WORKING TREE file, and nothing else. MEASURED on a clone of
# 707599b before the fix: `verify-log.sh claude/agents/gatelogs/452-all.log '#452'` is REFUSED (held tree) at
# exit 1, and with the #452 row deleted from gates/held-trees.tsv AND NOT COMMITTED it prints OK at exit 0 with
# "register: not held (13 live row(s) checked)". So the one mechanism whose whole job is not to miss a hold was
# cleared by an edit that `git status` shows and that no commit carries - and the same single-line edit cleared
# `held.sh check` too.
# WHY A UNION AND NOT JUST HEAD'S COPY: a row `held.sh add` has only just written is NOT YET COMMITTED, and the
# #450 stand-down writes exactly such a row immediately before citing it. Reading HEAD alone would have made
# this tool blind to the hold a standing-down run had just recorded - trading one false ACCEPT for another.
# The union refuses in both directions: an uncommitted DELETION cannot lift a hold that is live in HEAD, and an
# uncommitted ADDITION holds at once.
# --git-dir AND --work-tree ARE SET EXPLICITLY, because an inherited GIT_DIR overrides `git -C` and this script
# is run from the gates directory, from the repository root and from throwaway clones.
# OUTSIDE A GIT WORK TREE, or where HEAD holds no such file, the working tree file is read ALONE, its sha256 is
# printed, and the OK line says it is the working tree only - so a reader can never mistake a one-source read
# for a two-source one.
HELD_SRC="working tree only"; HELD_HEADROWS="-"; HELD_WTROWS="-"
REGALL="$REG"
# ARMED BEFORE THE FIRST mktemp [#534, antagonist A's P3-1: measured 2 leaked files per invocation here and 2
# in held.sh, on a container whose /tmp already held 2662 tmp.* files]. REGALL is only removed when it is NOT
# $REG, or a failed union would delete the real register - the guard is the whole point of the condition.
trap '[ "${REGALL:-}" = "${REG:-}" ] || rm -f "${REGALL:-}"; rm -f "${REGHEAD:-}"' EXIT
# THE HEAD READ IS NOT NESTED INSIDE `[ -f "$REG" ]`, AND THAT NESTING WAS A BLOCKER [#534, fresh antagonist
# B's VETO, reproduced in a clone before being fixed]. HELDWT's own job title is "read the held register from
# the working tree so one uncommitted LINE deletion clears a held refusal" - and the union fixed the line
# deletion while leaving the FILE deletion wide open, because the whole HEAD read sat under `[ -f "$REG" ]`
# and the warning branch under `[ ! -f "$REG" ]`. So `rm gates/held-trees.tsv`, uncommitted, flipped this tool
# from REFUSED exit 1 to `OK:` exit 0 for EVERY live row at once (14 of them) while HEAD's copy still carried
# them one `git show` away. Measured in a fresh clone: pristine exit 1, after one `rm` exit 0, HEAD still
# carrying the #452 row, and `held.sh check` answering exit 2 - so the two tools disagreed about the same
# register in opposite directions, which this file already records as #450's worst shape. Also reachable by
# replacing the file with a DIRECTORY or a symlink to /dev/null. B's `chmod 000` CONTROL is what proved the
# repair was one guard away: with the file present but unreadable the union read saved it and the refusal
# stood, so only `[ -f ]` being false skipped it. And nothing else covers this: `grep -n held-trees
# gates/gates.sh` is empty, so on a full-suite push this script is the ONLY reader of the register.
# NOW: the HEAD read runs whenever this is a git work tree, whatever the working-tree file is doing, and the
# three sources are reported distinctly - union, HEAD only, or working tree only. HELD_HAVE says whether any
# register could be read at all, and it is what the check and the warning below now branch on, so "the file
# is gone" can no longer mean "the question was not asked".
VLROOT="$(cd "$(dirname "$REG")/.." 2>/dev/null && pwd)"; VLROOT="${VLROOT:-$(pwd)}"
VLGIT=(git --git-dir "$VLROOT/.git" --work-tree "$VLROOT")
# A KEY YOU COULD NOT ASK IS REPORTED, NEVER CREDITED [#534, third-round antagonist A's P1-2]. HEAD's copy of
# the register is read through a `mktemp` file, and an EMPTY mktemp result was treated as "HEAD has no
# register" - so one unwritable TMPDIR silently reverted the whole HELDWT fix: with the live row deleted from
# the working tree and nothing committed, this script answered `OK:` at exit 0 while HEAD held every live row
# one `git show` away, and the source field it prints ASSERTED "HEAD holds no gates/held-trees.tsv", a wrong
# reason reaching a wrong verdict in the field added so a reader could tell the sources apart. mktemp failure
# is now a THIRD STATE - "HEAD could not be asked" - and it REFUSES rather than reporting a clear. It refuses
# and does not merely report NOT CHECKED, because this is the hold question: unlike the series door, failing
# open here is the direction that ships a tree a previous run stood down on. A broken TMPDIR is an
# environment fault the run should stop on, not work around.
VLHELD_UNKNOWN=0
REGHEAD=""; HELD_HAVE=0
if command -v git >/dev/null 2>&1 && "${VLGIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REGHEAD="$(mktemp 2>/dev/null || true)"
  if [ -z "$REGHEAD" ] && "${VLGIT[@]}" cat-file -e HEAD:gates/held-trees.tsv 2>/dev/null; then
    VLHELD_UNKNOWN=1
  fi
  if [ -n "$REGHEAD" ] && "${VLGIT[@]}" show HEAD:gates/held-trees.tsv > "$REGHEAD" 2>/dev/null && [ -s "$REGHEAD" ]; then
    :
  else
    [ -z "$REGHEAD" ] || rm -f "$REGHEAD"
    REGHEAD=""
  fi
fi
if [ -f "$REG" ] && [ -r "$REG" ] && [ -n "$REGHEAD" ]; then
  REGALL="$(mktemp 2>/dev/null || true)"
  if [ -n "$REGALL" ] && cat "$REG" "$REGHEAD" > "$REGALL" 2>/dev/null; then
    HELD_SRC="HEAD and the working tree"; HELD_HAVE=1
  else
    REGALL="$REG"; HELD_SRC="working tree only (the union could not be written)"; HELD_HAVE=1
  fi
elif [ -n "$REGHEAD" ]; then
  # THE LIMB THE VETO WAS ABOUT. The working-tree copy is missing or unreadable and HEAD's is not, so the
  # question is still ASKED, against HEAD alone, and the answer still binds.
  REGALL="$REGHEAD"; HELD_HAVE=1
  if [ -f "$REG" ]; then HELD_SRC="HEAD ONLY (the working-tree copy exists but could not be read)"
  else HELD_SRC="HEAD ONLY - there is NO working-tree copy of gates/held-trees.tsv, which is a deleted file or a stale checkout, NOT an empty register; HEAD's copy is authoritative here and an uncommitted deletion therefore lifts nothing"
  fi
elif [ -f "$REG" ] && [ -r "$REG" ]; then
  REGALL="$REG"; HELD_HAVE=1
  if command -v git >/dev/null 2>&1 && "${VLGIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    HELD_SRC="working tree only (HEAD holds no gates/held-trees.tsv)"
  else
    HELD_SRC="working tree only (not a git work tree), sha256 $(sha256sum "$REG" 2>/dev/null | cut -c1-16)"
  fi
fi
# ── (15) WHICH FONTCONFIG PRODUCED THIS LOG [#544, item (29);
# jobs/no-push-authority-tool-can-see-which-fontconfig-produced-a-gate-log-2026-10-06, P1, raised by
# antagonist A of #485 as item 4 of its veto and independently reached by antagonist B's F3].
# THE FINDING: #485 made the harness's fontconfig deterministic and made every gate log PRINT which one
# produced it, and made nothing READ that line. Measured at the filing: `grep -rn 'FONTCONFIG|CT_NOFC|fonts.conf'
# gates/*.sh` returned NOTHING, so this script, gatemanifest.sh and held.sh were all blind to it and a
# full-suite log ending GATES GREEN still authorised a push when it was produced with CT_NOFC=1, in a tree
# with no gates/fonts.conf, or under an inherited FONTCONFIG_FILE. It is #450's shape recreated by the commit
# that created the variable: every mechanical check asked a question about the log while the thing that
# mattered was not being read out of it. P1 and not P0 because the evidence EXISTS in the log - the gap was a
# missing reader.
# THE ERA PROBLEM, which this job names in its own notChecked and which a naive arm gets wrong: 113 of the
# archived logs carry no fontconfig line at all, so refusing on the line's bare ABSENCE would refuse every
# historical log. So the arm keys on the LOG'S OWN ERA rather than on a build number: a log that carries a
# `toolchain: playwright` line is from #485 onward and must also carry the pinned fontconfig; one that does
# not is from before the instrument existed and is REPORTED as unreadable on this question, never credited
# and never refused. A build number would have been the wrong key twice over - it is in the filename as well
# as the footer, and #416 names two different trees.
# AND IT DOES NOT DUPLICATE ITEM (28). That one makes gates/gates.sh refuse a LIVE run whose measured metrics
# are off calibration. This one asks a question about an ARCHIVED log, which is the only artefact a later
# reader or a push-authority citation has, and it still answers on a log produced by an older gates.sh.
# NO "is it a full green log" GUARD IS NEEDED HERE AND THAT IS WORTH ONE LINE: by this point the script has
# already refused a SUBSET RUN and any log that does not end in a clean `GATES GREEN #NNN`, so every log that
# reaches here is a full-suite green. The first draft guarded on two variables that do not exist in this file
# at all, which `set -u` would have turned into a crash on the first real log - caught by grepping for them
# rather than by assuming they were there.
# AND IT SITS OUTSIDE THE HELD-REGISTER BLOCK, not inside it. The first draft nested it under
# `if [ "$HELD_HAVE" = "1" ]`, so an unreadable held register would have silently skipped the fontconfig
# question too - two independent checks sharing one precondition, which is how a guard stops guarding.
FCSTATE=""; FCVERDICT=""
{
  FCTOOL="$(grep -m1 -e 'toolchain: playwright' "$LOG" 2>/dev/null || true)"
  FCSTATE="$(grep -ao 'fontconfig: [^|]*' "$LOG" 2>/dev/null | sed 's/[[:space:]]*$//' | sort -u || true)"
  if [ -z "$FCTOOL" ]; then
    FCVERDICT="pre-instrument"
  elif [ -z "$FCSTATE" ]; then
    FCVERDICT="missing"
  elif [ "$(printf '%s' "$FCSTATE" | grep -c . || true)" != 1 ]; then
    FCVERDICT="drifted"
  else
    case "$FCSTATE" in
      # THE PINNED STATE IS MATCHED EXACTLY: the bare path, or the path followed by gates/lib.js's '  ->  <face>'
      # [#545, item (7)]. The prefix 'fontconfig: gates/fonts.conf '* that stood here also matched the state
      # gates/lib.js prints when the file is ABSENT ('fontconfig: gates/fonts.conf MISSING - fonts come from the
      # image'), so a log whose fonts came from the image answered OK at exit 0 - one of the three states the job
      # names as unable to authorise a push. FC10 is that state and must be refused.
      'fontconfig: gates/fonts.conf  ->'*|'fontconfig: gates/fonts.conf') FCVERDICT="pinned" ;;
      *) FCVERDICT="unpinned" ;;
    esac
  fi
  case "$FCVERDICT" in
    pre-instrument)
      echo "FONTCONFIG NOT CHECKED: $LOG carries no 'toolchain: playwright' line, so it predates the #485"
      echo "  instrument and cannot say which fontconfig produced it. REPORTED, NEVER CREDITED - this log is"
      echo "  not refused on this question and it is not cleared on it either." ;;
    pinned) : ;;
    *)
      if [ "$IGNOREFC" -eq 1 ]; then
        echo "!! FONTCONFIG OVERRIDDEN BY --ignore-fc. This log was NOT produced under the pinned fontconfig:"
        echo "   state: ${FCSTATE:-<no fontconfig line at all, though the log is from the instrumented era>}"
        echo "   Every text-derived pixel pin in it was measured on whatever fonts the image happened to carry."
        echo "!! You are overriding that. Say so, and why, wherever you cite this log - a reader who sees only"
        echo "!! the OK line below will not know the pins were read off calibration."
      else
        echo "REFUSED (fontconfig): $LOG is a full-suite green that was NOT produced under the pinned fontconfig."
        case "$FCVERDICT" in
          missing)  echo "  This log is from the instrumented era - it carries a toolchain line - and carries NO fontconfig line." ;;
          drifted)  echo "  This log carries MORE THAN ONE distinct fontconfig state, so the instrument moved mid-run:"
                    printf '%s\n' "$FCSTATE" | sed 's/^/    /' ;;
          unpinned) echo "  state: $FCSTATE" ;;
        esac
        echo "  gates/fonts.conf is what every text-derived pin in this suite was calibrated under. A log"
        echo "  produced with CT_NOFC=1, with that file absent, or under an inherited FONTCONFIG_FILE measured"
        echo "  the image's own fonts instead - which is the substitution that cost seven containers and ten"
        echo "  red gates at #537 over a bundle byte-identical to main. --ignore-fc overrides this out loud."
        exit 1
      fi ;;
  esac
} 

if [ "$HELD_HAVE" = "1" ]; then
  # THE LIVE COUNT PER SOURCE, so the OK line reports what each gave rather than one total a reader cannot
  # decompose. A row live in BOTH is counted once in each, which is why these are reported separately and
  # never added together.
  held_live_count() { [ -f "${1:-}" ] || { printf '%s' '-'; return 0; }; grep -v '^[[:space:]]*#' "$1" 2>/dev/null | awk -F'\t' 'NF>=2 && $1 !~ /^-/' | grep -c '' | tr -d ' '; }
  HELD_WTROWS="$(held_live_count "$REG")"
  [ -z "$REGHEAD" ] && HELD_HEADROWS="-" || HELD_HEADROWS="$(held_live_count "$REGHEAD")"
fi
if [ "${HELD_HAVE:-0}" != "1" ]; then
  # ONLY WHEN NEITHER COPY COULD BE READ. This used to be `[ ! -f "$REG" ]`, which fired - and skipped the
  # check - whenever the working-tree file was missing, even with HEAD's copy readable one `git show` away.
  echo "WARNING: no readable held-tree register for $REG - THE HOLD CHECK DID NOT RUN."
  echo "  This file is tracked on main, and HEAD's copy could not be read either. Its absence means a stale"
  echo "  checkout or a deleted file, not an empty register, and a green log here says NOTHING about whether"
  echo "  a previous run refused this tree."
fi
if [ "${HELD_HAVE:-0}" = "1" ]; then
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
  done < "$REGALL"
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
      done < "$REGALL"
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
    # WHICH REGISTER CARRIED THE ROW [#534, antagonist A's P2-2]. The union's provenance was printed only on
    # the "not held" line at the end of a successful verify - the answer nobody acts on - and withheld from
    # this one, which STOPS A PUSH. A reader here had no way to tell a live hold from a row that exists only
    # in HEAD, and that second state is ordinary: `git reset --soft HEAD~1` to redo a commit leaves HEAD ahead
    # of the working tree, so a hold cleared in both the working tree and the redone commit still refuses
    # until it is committed again (A's P2-3; it fails CLOSED, and it is a known limit on this job rather than
    # something this run widens its scope to change). Naming the source is what makes that state legible.
    if [ "${REGALL:-}" != "${REG:-}" ] && [ -n "${REGHEAD:-}" ] && [ -s "${REGHEAD:-}" ]; then
      VLINWT=0; VLINHD=0
      grep -Fxq "$HELDROW" "$REG" 2>/dev/null && VLINWT=1
      grep -Fxq "$HELDROW" "$REGHEAD" 2>/dev/null && VLINHD=1
      if   [ "$VLINWT" = 1 ] && [ "$VLINHD" = 1 ]; then echo "  source: live in BOTH HEAD and the working tree (register source: $HELD_SRC)"
      elif [ "$VLINWT" = 1 ];                      then echo "  source: live in the WORKING TREE (register source: $HELD_SRC)"
      elif [ "$VLINHD" = 1 ];                      then echo "  source: live in HEAD ONLY (register source: $HELD_SRC) - the working tree does not carry this row."
                                                        echo "          If you cleared it and have"
                                                        echo "          not committed that, COMMIT IT and re-run: the register is read as the union of HEAD and"
                                                        echo "          the working tree by design, so an uncommitted clear cannot lift a hold."
      else echo "  source: register source $HELD_SRC (the row could not be located in either copy - report that)"
      fi
    else
      echo "  source: register source $HELD_SRC"
    fi
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
# ── THE GATE ANCHOR'S VERDICT REACHES THIS SCRIPT [#544, item (11) of directOpening_2026_10_28_batch4; part (2)
# of jobs/gatemanifest-derives-its-root-with-git-c-so-an-inherited-git-dir-switches-off-the-gate-anchor-while-the-tier-still-prints-green-2026-10-22].
# WHAT THE ANCHOR IS: gates/gatemanifest.sh's check that no REQUIRED gate vanished or was weakened between the
# base and the head. #540 pinned its repository derivation so an inherited GIT_DIR can no longer switch it off -
# that was part (1) - and left part (2) open with the sentence that matters: "otherwise part (1) fixes the
# instrument and leaves the push gate still unable to see its verdict, which is this project's recurring shape".
# THE VERDICT IS IN EVERY LOG'S BODY ALREADY and nothing read it. Measured at #544 over all 168 archived
# gatelogs: 60 carry a `gate anchor:` line, ALL SIXTY read "origin/main, 0 vanished, 0 weakened", and 108 carry
# none because they predate the anchor. So refusing a NOT CHECKED anchor refuses exactly ZERO archived logs -
# the same arithmetic that let #462 close the manifest exemption, re-measured here rather than borrowed.
# THREE OUTCOMES, THE SAME SHAPE THE MANIFEST BLOCK BELOW USES: absent is reported as NOT CHECKED and refuses
# nothing (a pre-anchor log is honest about what it could not say); a line that READS NOT CHECKED is a REFUSAL,
# because the anchor being off is exactly the state the job describes as printing green; anything else is
# reported beside the manifest line.
ANCHOR="$(grep -m1 '^gate anchor:' "$LOG" || true)"
ANCHORCHECK="absent"
if [ -n "$ANCHOR" ]; then
  case "$ANCHOR" in
    *"NOT CHECKED"*)
      echo "REFUSED (gate anchor): $LOG reports its gate anchor as NOT CHECKED."
      echo "  $ANCHOR"
      echo "  The anchor is what detects a REQUIRED gate vanishing or being weakened between the base and the"
      echo "  head, and NOT CHECKED means it did not run - an inherited GIT_DIR, GIT_WORK_TREE or"
      echo "  GIT_OBJECT_DIRECTORY switches it off, which is the state"
      echo "  jobs/gatemanifest-derives-its-root-with-git-c-...-2026-10-22 was filed for. Every other verdict"
      echo "  in such a log reads green, so this is the one line that can tell you."
      echo "  Re-run the suite in an unredirected environment: env -u GIT_DIR -u GIT_WORK_TREE -u GIT_OBJECT_DIRECTORY ..."
      exit 1 ;;
    *) ANCHORCHECK="ran" ;;
  esac
fi
MANICHECK="absent"; MANIMISS=""; MANIUNL=""; MANIUNREAD=""
MANIFOOT="$(grep -m1 '^gate manifest:' "$LOG" || true)"
# ANTAGONIST B's VETO F1 ON #461, UPHELD, AND THE REASON I HAD WRITTEN FOR THE EXEMPTION WAS NEVER RE-DERIVED.
# This check was conditional on the line being PRESENT, justified by "making it unconditional would refuse all 49
# archived gatelogs" - borrowed from --this-bundle's note without measuring whether it applied. B measured that it
# does not, and I reproduced it: `ls claude/agents/gatelogs/*.log | wc -l` is WHATEVER `ls claude/agents/gatelogs/*.log | wc -l` SAYS TODAY (93 at #462, 91 when this was written - #461's own close-out added the two that made it stale) (the 49 in the header is
# itself stale), and the highest build number any of them foots is 460. So gating the STRICT verdict on the log's
# own build number refuses exactly ZERO archived logs, and the exemption was free to close all along.
# WHAT IT CLOSED: `rm gates/gate-manifest.tsv`, delete three gates, and gates.sh printed "NOT CHECKED", ran 45 of
# 48, emitted GATES GREEN, and this script returned OK exit 0 - one `rm` turned the whole guard off at the push
# gate. Stripping the footer line did the same, and the OK text then said of a #461 log that it "predates #461".
# FOOT is parsed at line 102 from the footer regex, ~180 lines above here, so this costs nothing.
MANIERA=0
case "${FOOT#\#}" in ''|*[!0-9]*) MANIERA=0;; *) [ "${FOOT#\#}" -ge 461 ] && MANIERA=1;; esac
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
    if [[ "$MANIFOOT" =~ $MANIRE ]]; then
      MANIREQ="${BASH_REMATCH[1]}"; MANIPRES="${BASH_REMATCH[2]}"; MANIMISS="${BASH_REMATCH[3]}"
      MANIUNL="${BASH_REMATCH[4]}"; MANIABS="${BASH_REMATCH[5]}"; MANIRET="${BASH_REMATCH[6]}"
      MANIUNJ="${BASH_REMATCH[7]}"; MANIUNREAD="${BASH_REMATCH[8]}"
    elif [ "$MANIERA" -eq 1 ]; then
      echo "REFUSED (gate manifest): $LOG is footed $FOOT and its manifest line does not parse."
      echo "  line:     $MANIFOOT"
      echo "  expected: gate manifest: N required, N present, N missing, N unlisted, N known-absent, N retired, N unjustified, N unreadable"
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
    if [ $(( MANIPRES - MANIUNL + MANIMISS )) -ne "$MANIREQ" ] 2>/dev/null; then
      echo "REFUSED (gate manifest): $LOG's manifest line does not add up."
      echo "  line: $MANIFOOT"
      echo "  required($MANIREQ) should equal present($MANIPRES) - unlisted($MANIUNL) + missing($MANIMISS) = $(( MANIPRES - MANIUNL + MANIMISS ))."
      echo "  A mismatch means rows were skipped or counted twice, so 'missing' does not mean what it says."
      exit 1
    fi
    # ── #462. ANTAGONIST B'S GROUND 1: THE ROSTER LINE WAS NEVER READ, SO THIS SCRIPT ACCEPTED A FORGERY. ──────
    # gates.sh:2623 writes `gates ran (N): <names>` - the ONLY record in a log of WHICH gates actually ran, and the
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
    # archived logs carries a roster line, because gates.sh:2623 (:232 when this was written) is #461 code and #461 never shipped. An ungated
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
  # SHALLOW CLONES MAKE THIS INSTRUMENT LIE, AND NOTHING IN THIS FILE SAID SO UNTIL NOW.
  # Added by the 2026-10-03 process burst for
  # jobs/the-is-ancestor-instrument-returns-false-negatives-in-a-shallow-clone-2026-10-01 (p8), whose own
  # measurement names this file: `grep -n 'shallow|unshallow|--depth'` over CLAUDE.md, HANDOFF.md, RUN-LOG.md,
  # gates/held.sh and gates/verify-log.sh returned NO mention of the effect. That job's control is three shas
  # and one command: at depth 50, 9087c28 and 8cd81ec both read `not-ancestor`; after
  # `git fetch --deepen=400 origin main` both read ANCESTOR, with no commit created and no ref moved. TWO OF
  # THREE FLIPPED ON CLONE DEPTH ALONE. `git merge-base --is-ancestor` cannot see past a graft, so in a shallow
  # clone every sha older than the graft reads not-ancestor and this check REFUSES A TREE THAT GENUINELY SHIPPED
  # - which is the shape of refusal a reader quotes, because the message is specific and confident.
  # SO: DEEPEN FIRST, AND IF IT IS STILL SHALLOW, REFUSE WITH THE TRUE CAUSE RATHER THAN THE FALSE ONE.
  # Not a pass: UNKNOWN is not a pass here [the --on-main note above], and a cheap deepen usually removes the
  # question entirely. What changes is that the output can no longer blame the tree for the clone.
  # WHY 400, MEASURED RATHER THAN CHOSEN: origin/main is 860 commits and the DEEPEST 'ref: HEAD' line in any
  # archived gatelog is 238 commits behind HEAD (417b-all.log 6eeca3e; 419c-all.log is 234), so 400 covers every
  # log in the register with room to spare and is not the whole history. THE LIMIT OF THAT, NAMED: because every
  # real ref line is inside 400, the still-shallow-after-deepen branch below CANNOT be exercised by any log in
  # this repository today, so it is reasoned, not measured. The branch that IS measured is the one that pays:
  # in a `--depth 2` clone, the shipped script REFUSES 419c-all.log as 'NOT on origin/main' and this one reports
  # ON-MAIN OK, on the same log, the same sha and the same origin/main.
  SHALLOW=0
  if [ "$(git rev-parse --is-shallow-repository 2>/dev/null || echo unknown)" = "true" ]; then
    SHALLOW=1
    git fetch -q --deepen=400 origin main 2>/dev/null || true
    [ "$(git rev-parse --is-shallow-repository 2>/dev/null || echo unknown)" = "true" ] || SHALLOW=0
  fi
  if [ "$REF" != "$MAIN" ] && ! git merge-base --is-ancestor "$REF" "$MAIN" 2>/dev/null && [ "$SHALLOW" -eq 1 ]; then
    echo "REFUSED (--on-main): NOT CHECKED, not 'not on main'. This clone is SHALLOW even after"
    echo "  'git fetch --deepen=400 origin main', so 'git merge-base --is-ancestor $REF $MAIN' cannot see past"
    echo "  the graft and returns false for every sha older than it. The ancestry of $REF is UNKNOWN here, which"
    echo "  is not a pass and is also NOT evidence that the tree did not ship."
    echo "  grafts: $(git rev-parse --git-dir >/dev/null 2>&1 && wc -l < "$(git rev-parse --git-dir)/shallow" 2>/dev/null || echo '?')"
    echo "  Fix the instrument, not the log:  git fetch --unshallow origin   (or --deepen= a larger number)"
    exit 1
  fi
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
# (8b) --this-suite: does this green describe the SUITE that is on disk RIGHT NOW? The honest companion to
# --this-bundle [#540, SUITEKEY, jobs/the-push-gate-has-no-key-for-the-suite-itself-2026-10-03, P1, filed from
# #474's integration tree by its antagonist B]. --this-bundle asks "is app.js the bundle the log measured" and
# --on-main asks "is the gated sha on origin/main" - and NEITHER IS A FUNCTION OF THE SUITE. B measured it on
# a tree 12 commits ahead of main with 1228 insertions across the three scripts that decide whether this
# project may ship: both flags answered OK, because app.js was untouched and the archived log's sha had been
# merged. A run can rewrite a gate's assertions, cite the previous build's green and get OK on both keys, and
# the log it cites is honest about a suite that no longer exists. #531's antagonist B then showed the same
# hole from the other side: a tampered gates/verify-log.sh routed to the full suite gets a green log that
# says nothing about the tamper, and verify-log.sh - the tampered file - then says OK over itself.
# THE KEY: every tracked file under gates/regress/ at the log's own `ref: HEAD <sha>`, plus gates/gates.sh,
# gates/verify-log.sh and gates/gatemanifest.sh (the set B fingerprinted and the set this job names), listed
# with `git ls-tree` at that sha, against the same paths on disk hashed with `git hash-object --no-filters`
# (RAW bytes, the #527 reason: a clean filter or an index flag must not be able to make a changed file read
# clean), plus every gates/regress/*.js ON DISK that the sha did not carry, because gates.sh globs that
# directory and a gate the log never ran is on disk right now. A path that differs, is missing, or was added
# is NAMED, and one is enough to refuse.
# WHAT IT DOES NOT COVER, SAID HERE SO THE OK LINE IS NOT OVER-READ [#540 repair, antagonist B's B-F3, P2]:
# gates/mountcheck.js, which gates.sh RUNS as its first logged section; every driver under gates/drive/,
# which 16 gates require for play, 8 for review, 7 for lesson, 4 for puzzles and 1 for home; gates/lib.js,
# which every gate requires; gates/engine-extract.js; and the harness's other scripts and registers
# (build.sh, buildnum.sh, held.sh, records-gate.sh, control-audit.js, fastgate.sh, gate-manifest.tsv,
# held-trees.tsv, fonts.conf, the node_modules the suite runs on) are NOT in the set. B measured that a line
# appended to gates/mountcheck.js, to gates/drive/play.js or to gates/lib.js still reads THIS-SUITE OK over
# 539-all.log on e8dd9cb's tree. A changed driver changes what 16 gates measure, so the OK line's claim is
# exactly "the 63 files named", no wider. The set is the job's, and widening it is a decision for the job,
# not for the arm; what is left out is printed with every verdict rather than implied by the word SUITE.
# PINNED AND OFFLINE: the repository is the one above this script, named with --git-dir and --work-tree so an
# inherited GIT_DIR cannot redirect it (#540 GMROOT, the same class), and NOTHING IS FETCHED - a sha this
# repository does not hold is a refusal that says so, not a pass and not a fetch. No pipe here feeds grep:
# the ref line is read as the --on-main arm reads it, and every comparison is an awk pass over two listings.
if [ "$THISSUITE" -eq 1 ]; then
  SKREF="$(grep -o '^ref: HEAD [0-9a-f]\{7,40\}' "$LOG" | tail -1 | awk '{print $3}' || true)"
  if [ -z "$SKREF" ]; then
    echo "REFUSED (--this-suite): $LOG carries no 'ref: HEAD <sha>' line, so the suite it ran cannot be identified."
    echo "  Logs from before #417 have none - re-gate, or check the suite by hand and say so where you cite this log."
    exit 1
  fi
  SKROOT="$(cd "$(dirname "$0")/.." && pwd)"
  SKGIT=(git -C "$SKROOT" --git-dir="$SKROOT/.git" --work-tree="$SKROOT")
  if ! "${SKGIT[@]}" rev-parse --verify --quiet "$SKREF^{commit}" >/dev/null 2>&1; then
    echo "REFUSED (--this-suite): this repository ($SKROOT) does not hold commit $SKREF, the sha the log gated,"
    echo "  so the suite that ran cannot be read. Nothing is fetched here: UNKNOWN is not a pass. Fetch it, or"
    echo "  read the log in the checkout that produced it."
    exit 1
  fi
  SK_SCRIPTS="gates/gates.sh gates/verify-log.sh gates/gatemanifest.sh"
  # path<TAB>blob at the gated sha, for every tracked file under gates/regress/ and the three scripts.
  # shellcheck disable=SC2086  # SK_SCRIPTS is a deliberate word list
  SK_AT="$("${SKGIT[@]}" ls-tree -r "$SKREF" -- gates/regress $SK_SCRIPTS 2>/dev/null | awk -F'\t' '{split($1,m," "); if (m[2]=="blob") print $2 "\t" m[3]}' | sort)"
  if [ -z "$SK_AT" ]; then
    echo "REFUSED (--this-suite): $SKREF carries no gates/regress/ and none of $SK_SCRIPTS, so there is no suite to compare."
    exit 1
  fi
  # path<TAB>hash on disk, for every path the sha carries plus every gates/regress/*.js on disk the sha does not.
  # THE ON-DISK LIST IS gates.sh's OWN ENUMERATION, NOT ls AND NOT find [#540, two repairs]. `ls gates/regress/*.js`
  # printed a `name:` header and the CONTENTS of a directory named like a gate, which read as stray extra paths in
  # the refusal (antagonist A's A-F6); the first repair used `find -type f -o -type l`, which DROPPED such a
  # directory - and gates.sh's glob keeps it, and node runs <dir>.js/index.js, so an untracked directory gate read
  # THIS-SUITE OK while the suite would have run one more file (fresh antagonist A2's A2-F1, P2, upheld as a veto);
  # find also listed dotfiles the glob never runs (A2-F2). The glob below is the one gates.sh runs its gates from:
  # `*.js` with `[ -e ]`, so a directory named like a gate is IN (and refuses, as it must) and a dotfile is OUT.
  SK_PATHS="$( { printf '%s\n' "$SK_AT" | cut -f1; ( cd "$SKROOT" && for skg in gates/regress/*.js; do [ -e "$skg" ] && printf '%s\n' "$skg"; done ); } | sort -u )"
  SK_NOW=""
  while IFS= read -r skp; do
    [ -n "$skp" ] || continue
    if [ -f "$SKROOT/$skp" ]; then
      skh="$("${SKGIT[@]}" hash-object --no-filters "$SKROOT/$skp" 2>/dev/null || echo UNREADABLE)"
    else skh="ABSENT"; fi
    SK_NOW="$SK_NOW$skp	$skh"$'\n'
  done <<<"$SK_PATHS"
  # ONE AWK PASS over both listings. Verdict lines: `differs`, `missing on disk`, `on disk and not at <sha>`.
  SK_REPORT="$(awk -F'\t' -v sha="$SKREF" '
    NR==FNR { at[$1]=$2; next }
    { now[$1]=$2 }
    END {
      for (p in now) {
        if (!(p in at))            printf "    %s: on disk and not at %s (a gate the log never ran)\n", p, sha;
        else if (now[p]=="ABSENT") printf "    %s: at %s and missing on disk\n", p, sha;
        else if (now[p]!=at[p])    printf "    %s: differs (at %s %s, on disk %s)\n", p, sha, substr(at[p],1,12), substr(now[p],1,12);
      }
    }' <(printf '%s\n' "$SK_AT") <(printf '%s' "$SK_NOW") | sort)"
  # the three counts are awk passes, so the sentence in the header ("no pipe here feeds grep") is true as
  # written; the first version counted with `| grep -c .`, which reads all its input and so was harmless, but
  # was still three pipes into grep under a header that said there were none [#540 repair, antagonist A's A-F5].
  SK_N="$(printf '%s\n' "$SK_AT" | awk 'NF{n++} END{print n+0}')"
  SK_NREG="$(printf '%s\n' "$SK_AT" | awk -F'\t' '$1 ~ /^gates\/regress\// {n++} END{print n+0}')"
  SK_BAD="$(printf '%s' "$SK_REPORT" | awk 'NF{n++} END{print n+0}')"
  if [ "$SK_BAD" -gt 0 ]; then   # SK-VERDICT
    echo "REFUSED (--this-suite): the suite on disk is not the suite $LOG ran at $SKREF - $SK_BAD path(s) of $SK_N:"
    printf '%s\n' "$SK_REPORT"
    echo "  The log is honest about the suite it measured; it just did not measure the suite you are about to push."
    echo "  (key: every tracked file under gates/regress/ plus $SK_SCRIPTS, raw bytes; NOT in the key:"
    echo "   gates/mountcheck.js, gates/drive/*, gates/lib.js, gates/engine-extract.js, the harness's other scripts and registers, and node_modules)"
    exit 1
  fi
  echo "THIS-SUITE OK: $SK_N suite files read the same bytes on disk as at $SKREF ($SK_NREG under gates/regress/ plus $SK_SCRIPTS)"
  echo "    NOT in that key, so not vouched for by it: gates/mountcheck.js (a logged suite section), gates/drive/* (the drivers 16 gates require),"
  echo "    gates/lib.js, gates/engine-extract.js, the harness's other scripts and registers, and node_modules."
fi
# ── (11a)/(11) THE BUILD-NUMBER SERIES DOOR CHECK WAS REVERTED OUT OF THIS FILE [#534]. ────────────
# It landed in this run (VLDOOR) and THREE successive antagonist pairs each broke it; the fourth-round
# finding is why it is gone rather than repaired a fourth time. The check located the footer verdict
# between the LAST `gate manifest:` and the LAST `gates ran (`, and a guard was then added bounding how MANY
# of those lines a log may carry (1, 1 and 2, calibrated on all 164 archived logs). THE CEILING BOUNDS
# FREQUENCY AND THE ATTACK NEEDS POSITION. Measured on claude/agents/gatelogs/533-all.log: rewrite the real
# verdict to RED, MOVE the log's own manifest line below it, append a forged `ok`. No line added, no line
# deleted, all three ceilings satisfied at their honest values (manifest 2, gates-ran 1, ref 1) - and this
# script printed `series door: ok` and `OK:` at exit 0 over a log physically carrying
# `build-number series: RED`. AND THE PROPOSED REPAIR DOES NOT WORK EITHER, which is the part that settled
# it: an adjacency invariant was suggested on the ground that the attack leaves three lines in the footer
# window. It leaves ONE. Measured side by side, the forged footer is STRUCTURALLY IDENTICAL to the honest
# one - last-manifest, verdict, last-gates-ran, gap 2, one line between, same order - so no positional test
# over the log text can separate them. The only trace is a RED line elsewhere in the file, which a forger
# deletes. THAT IS #419 IN ITS PUREST FORM: the log is self-describing and a forger controls all of it, so
# an archived log cannot be made to vouch for its own door. A check that is turned by reordering one line
# the forger does not even have to write, shipped under a message asserting the attack is closed, is WORSE
# than no check: it is a green-authorising surface carrying a false warrant in the permanent record, which
# is the #450 shape the job existed to answer. So this file is blind to the series door again, and that is
# now a DECLARED limit rather than a FALSE guarantee. The job stays open with the mechanism recorded on it.
# What would actually close it is not in a log reader at all: it is re-running the door against the tree.

if [ "${VLHELD_UNKNOWN:-0}" = "1" ]; then
  echo "REFUSED (held register UNKNOWN): $LOG is a full-suite green, and this script could not ask the whole"
  echo "  held-tree question. HEAD carries gates/held-trees.tsv but no temporary file could be created to read"
  echo "  it (mktemp failed - an unwritable or missing TMPDIR), so HEAD's rows were NOT consulted and only the"
  echo "  working-tree copy was. A hold live in HEAD and absent from the working tree would therefore have been"
  echo "  invisible, which is exactly the state gates/held-trees.tsv exists to make visible."
  echo "  THIS IS NOT 'not held'. Fix TMPDIR and re-run, or read gates/held-trees.tsv at HEAD by hand."
  exit 1
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
  echo "    register: not held ($HELDROWS row(s) walked in gates/held-trees.tsv; source: $HELD_SRC; live rows: HEAD=$HELD_HEADROWS worktree=$HELD_WTROWS)"
else
  echo "    register: NOT CHECKED - gates/held-trees.tsv is missing (see the warning above)"
fi
# ── AND THE BUILD-NUMBER REGISTER IS READ AND REPORTED [#544, item (10) of directOpening_2026_10_28_batch4;
# the last line of item 5's remainder in
# jobs/the-build-number-register-landed-with-a-named-remainder-2026-10-01, which asks that gates/gates.sh and
# gates/verify-log.sh read gates/build-numbers.tsv. HALF OF THAT ASK WAS ALREADY DONE AND THE JOB'S TEXT IS
# STALE: gates/gates.sh reads the register in 107 places, including the #533 gap-fill door that refuses a run
# whose register carries a row nothing accounts for. This file genuinely did not read it - one mention, in a
# comment - and now does.]
# IT REPORTS AND REFUSES NOTHING, deliberately and for a measured reason. This script's whole job is archived
# logs, and the register was BACKFILLED from RUN-LOG.md and the gatelog filenames, so numbers older than the
# backfill are legitimately absent from it: a refusal here would reject honest logs for a bookkeeping gap in a
# file written years-of-builds later. What the reader needs is the number's PROVENANCE beside the verdict -
# whether the number this log foots was issued, and what else it names - which is exactly #454's "a number is
# ambiguous about as often as not, so cite the bundle md5" made visible at the one place a log is judged.
if [ -n "${FOOT:-}" ]; then
  BNREG="$(dirname "$0")/build-numbers.tsv"
  BNBARE="${FOOT#\#}"
  if [ -r "$BNREG" ]; then
    BNROWS="$(awk -F'\t' -v n="$BNBARE" '$1==n' "$BNREG" 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$BNROWS" = "0" ]; then
      echo "    build number: $FOOT has NO row in gates/build-numbers.tsv. Not a refusal - the register was"
      echo "                  backfilled from RUN-LOG.md and the gatelog names, so an older number is"
      echo "                  legitimately absent. It does mean nothing here can say who issued it."
    else
      echo "    build number: $FOOT has $BNROWS row(s) in gates/build-numbers.tsv - $(awk -F'\t' -v n="$BNBARE" '$1==n{printf "%s%s", sep, $2; sep="/"}' "$BNREG" 2>/dev/null), issued to $(awk -F'\t' -v n="$BNBARE" '$1==n{print $7; exit}' "$BNREG" 2>/dev/null)"
      [ "$BNROWS" != "1" ] && echo "                  More than one row means the number names more than one artefact: cite the bundle md5, not the number [#454]."
    fi
  else
    echo "    build number: NOT CHECKED - gates/build-numbers.tsv is not readable from $(dirname "$0")"
  fi
fi
case "$ANCHORCHECK" in
  ran) echo "    ${ANCHOR}" ;;
  *)   echo "    gate anchor: NOT CHECKED - this log carries no 'gate anchor:' line. 108 of the 168 archived logs"
       echo "                 carry none because they predate the anchor; it says nothing about whether a required"
       echo "                 gate vanished when this suite ran. A log that REPORTS its anchor as NOT CHECKED is"
       echo "                 refused above rather than reported here." ;;
esac
case "$MANICHECK" in
  ran) echo "    manifest: $MANIFOOT" ;;
  notchecked) echo "    manifest: NOT CHECKED - the run could not read gates/gate-manifest.tsv ($MANIFOOT)" ;;
  *) echo "    manifest: NOT CHECKED - this log carries no 'gate manifest:' footer. Builds up to #460 wrote none,"
     echo "              so it says nothing about whether every expected gate was present when it ran. A $FOOT log"
     echo "              reaching this branch would have been REFUSED above, not reported here." ;;
esac
echo "    NOTE: that is a statement about the SUITE, not permission to push. It says these assertions ran over"
echo "    that bundle and none failed. It does not say the adversarial pass cleared the tree, and it does not"
echo "    say this is the tree you are pushing (pass --this-bundle, --this-suite and --on-main to ask those three:"
echo "    the bundle on disk, the suite on disk, and the tree on origin/main)."
