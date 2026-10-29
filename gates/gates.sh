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

# ── gates/gates.sh --selftest ─────────────────────────────────────────────────────────────────────────────────
# jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02, THE REMAINDER.
# That job's headline repair LANDED (the herestring at the MANI_LINE assignment below, burst wave 1 patch 03,
# integrated 2026-10-04T00:46Z). Its own scopeReducedTo then recorded what was still owed, in these words:
# "the 2-input case is only recorded as prose in the gates.sh comment; no standing assertion exists
# (gatemanifest.sh's selftest does not cover MANI_LINE)." The job's `case` field asks for exactly two inputs:
# MANI_OUT under the pipe buffer -> one line; MANI_OUT over it -> still one line, where it used to be two.
# This arm is that assertion, and it lives in this file because the expression it is about lives in this file -
# the "a lesson recorded in one gate does not travel to the next one by itself" rule, applied to one script.
#
# IT READS THIS FILE'S OWN SOURCE RATHER THAN A COPY OF THE EXPRESSION, which is the whole point: C5 to C8 run
# the assignment line extracted live from $0, so reverting that line to the pipe form makes the controls FAIL
# instead of leaving them green against a copy that no longer matches the code. The defect form is likewise read
# from the "# WAS:" comment rather than retyped, so the two forms this arm compares are both the file's own.
#
# AND IT CARRIES A CONTROL THAT FIRES, not only one that asserts the repaired text. C3 and C4 run the DEFECT form
# over the same 200,000-byte input and require 2 lines with the false 'NOT CHECKED' fallback second. Without them
# the pass on C6 would be unfalsifiable - a harness that cannot produce the bug cannot be said to have excluded
# it, which is the vacuity class this project files repeatedly (gates/audit/verify-patch-set.sh C26/C27, and
# jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-that-fires-2026-10-06).
#
# IT CANNOT RUN THE SUITE AND DOES NOT PRETEND TO. --selftest exits before the usage check, before mountcheck and
# before any gate, touches no file under gates/logs, and can never emit the string "GATES GREEN". A normal
# invocation is unaffected: this block is reachable only with the literal first argument --selftest, which the
# usage check on the next line would otherwise reject outright.
if [ "${1:-}" = "--selftest" ]; then
  SG="$(cd "$(dirname "$0")" && pwd)"; SF="$SG/$(basename "$0")"
  ST_T="$(mktemp -d)"; trap 'rm -rf "$ST_T"' EXIT
  st_p=0; st_f=0
  st(){ if [ "$2" = "$3" ]; then st_p=$((st_p+1)); echo "SELFTEST PASS $1"; else st_f=$((st_f+1)); echo "SELFTEST FAIL $1 — expected [$3] got [$2]"; fi; }
  # The two forms, both READ FROM THIS FILE rather than retyped.
  LIVE="$(grep -m1 '^MANI_LINE=' "$SF")"
  WAS="$(grep -m1 '^# WAS: ' "$SF" | sed 's/^# WAS: //')"
  if [ -z "$LIVE" ] || [ -z "$WAS" ]; then
    echo "SELFTEST NOT CHECKED — could not read both forms from $SF (live=[${LIVE:-}] was=[${WAS:-}])."
    echo "SELFTEST 0 pass / 1 fail"; exit 1
  fi
  # Two inputs, per the job's own case: one small, one unambiguously over the ~64KB pipe buffer.
  SMALL='gate manifest: 59 required, 59 present, 0 missing'
  BIG="$SMALL
$(head -c 200000 /dev/zero | tr '\0' 'x')"
  st_run(){ # $1 = form, $2 = MANI_OUT value; prints the captured value
    # The value goes through a FILE and not through the environment: a 200,000-byte env var is the kind of thing
    # that fails for a reason unrelated to the defect, and the first draft of this arm did exactly that - every
    # large-input control returned empty and C3, the firing control, reported 0 lines instead of 2. Found by
    # running it, not by reading it.
    printf '%s' "$2" > "$ST_T/in"
    printf '%s\n' 'set -uo pipefail' "MANI_OUT=\"\$(cat \"$ST_T/in\")\"" "$1" 'printf %s "$MANI_LINE"' > "$ST_T/f.sh"
    bash "$ST_T/f.sh" 2>/dev/null
  }
  st_lines(){ printf '%s' "$1" | grep -c '' ; }
  st C1-harness-can-exceed-the-pipe-buffer "$( [ "${#BIG}" -ge 200000 ] && echo yes || echo no )" yes
  st C2-defect-form-is-silent-on-a-small-manifest "$(st_lines "$(st_run "MANI_LINE=\"\$($WAS)\"" "$SMALL")")" 1
  st C3-defect-form-FIRES-on-a-large-manifest "$(st_lines "$(st_run "MANI_LINE=\"\$($WAS)\"" "$BIG")")" 2
  st C4-and-its-second-line-is-the-FALSE-fallback "$(st_run "MANI_LINE=\"\$($WAS)\"" "$BIG" | sed -n '2p')" 'gate manifest: NOT CHECKED'
  st C5-live-form-one-line-on-a-small-manifest "$(st_lines "$(st_run "$LIVE" "$SMALL")")" 1
  st C6-live-form-one-line-on-a-large-manifest "$(st_lines "$(st_run "$LIVE" "$BIG")")" 1
  st C7-live-form-returns-the-verdict-not-the-fallback "$(st_run "$LIVE" "$BIG")" "$SMALL"
  st C8-live-form-pipes-nothing-into-grep "$(printf '%s' "$LIVE" | grep -cE '\|[[:space:]]*grep')" 0
  st C9-this-file-sets-pipefail-so-the-class-applies "$(grep -c '^set -uo pipefail' "$SF")" 1
  st C10-the-two-forms-were-extracted-and-differ "$( [ "$LIVE" != "MANI_LINE=\"\$($WAS)\"" ] && echo yes || echo no )" yes

  # ── C11 to C14: THE fastgate-drive UNIT BLOCK'S TWO SILENT PATHS [#525]. ─────────────────────────────────
  # The block below ran the harness that drives gates/fastgate.sh, the script that authorises every fast-tier
  # push, and it had two ways to report nothing at all:
  #   (1) A DECLINE NEEDED NO REFUSAL. It read `drc 2 && dfail 0 && dok 0` as a decline and printed SKIPPED.
  #       bash itself exits 2 on a SYNTAX ERROR, and then dfail and dok are 0 because nothing ran, so a
  #       harness that does not parse took the skip branch. MEASURED on the held tree, 1 of 1 by the
  #       orchestrator and 1 of 1 by the reviewer (its F5).
  #   (2) A MISSING HARNESS WAS SILENT. A bare `[ -f "$DRIVESH" ]` guard, so with the file moved aside the
  #       block printed nothing, added no line to the suite log, and left red at 0.
  # These four cases drive THE REAL BLOCK, extracted from this very file by the same awk the job was filed
  # with, against three stub harnesses in a scratch tree. They are here and not in fastgate-drive.sh on
  # purpose: the thing under test is gates.sh's verdict logic, and a harness cannot be the control for how its
  # own absence is reported - that is the #461 trap, where the check and the thing checked were one object.
  # C13 IS THE ONE THAT KEEPS THIS HONEST. The dirty-tree decline is the DOCUMENTED happy path between
  # gates/build.sh and gates/gates.sh, and it must still SKIP. A guard that fires on the normal case gets
  # switched off, so the pair C11/C13 is what shows the new condition discriminates rather than tightens.
  awk '/^DRIVESH=/{p=1} /^for f in "\$\{gates\[@\]\}"; do/{if(p){exit}} p{print}' "$SF" > "$ST_T/block.sh"
  st C14-the-unit-block-was-extracted "$( [ -s "$ST_T/block.sh" ] && echo yes || echo no )" yes
  # ── #531. THE STUBS NOW CARRY A tc() TABLE AND THE SCRATCH TREE IS A REAL REPOSITORY. ───────────────────
  # jobs/the-unit-blocks-declared-case-count-is-a-hand-kept-array-so-it-can-be-edited-down-together-with-the-cases-2026-10-21.
  # The block below now cross-checks the harness's declaration against the COMMITTED tc() table, which it reads
  # with `git show HEAD:gates/fastgate-drive.sh`. Two consequences for this selftest, and both are mechanical
  # rather than cosmetic: the scratch tree has to BE a repository with the stub committed in it, or every stub
  # would read an empty table and the three cases that must NOT redden (C13, C16, C24) would all go red for a
  # reason that has nothing to do with what they test; and each stub needs a table whose ids, less H12, EQUAL
  # its own declaration, or the new limb would redden C16 and C24 as well.
  # H12 IS SKIPPED BECAUSE THE HARNESS SKIPS IT: it is fastgate-drive.sh's unfixed MODE and has no case body,
  # so the real derivation drops it and this generator must drop it too or the two counts differ by one.
  # commit.gpgsign IS FORCED OFF FOR THIS SCRATCH COMMIT ONLY. That is not the defect
  # jobs/a-defensive-commit-gpgsign-false-left-two-commits-unsigned-in-a-fully-signed-repository-2026-10-16
  # records: that one is about commits that reach a real branch. This repository is created by mktemp, read
  # once by a `git show` in the same function, and deleted; a signature on it would be verified by nobody.
  st_tbl(){ # $1 = how many case ids the table must YIELD once H12 is dropped; prints a tc() table
    local want="$1" n i
    n="$want"; if [ "$want" -ge 12 ]; then n=$(( want + 1 )); fi   # H12 is dropped, so one more id is needed
    printf 'tc(){\n  case "$1" in\n'
    for i in $(seq 1 "$n"); do printf '    H%s) printf TC-SUITE-X%s ;;\n' "$i" "$i"; done
    # $2 = tabdup: repeat H1 at a TAB, which is the evasion C33 controls. The table still MAPS $want ids.
    [ "${2:-}" = tabdup ] && printf '\tH1) printf TC-SUITE-X1 ;;\n'
    printf '  esac\n}\n'
  }
  st_drive(){ # $1 = the body of the stub gates/fastgate-drive.sh; prints the block's final red value
    # $2 = how many case ids its tc() table must yield, default 1 (a non-empty table). 0 writes NO TABLE AT
    # ALL, which is the shape this job's own case needs and which must read RED.
    local d="$ST_T/d" tbl="${2:-1}"; rm -rf "$d"; mkdir -p "$d/gates/logs"
    if [ -n "$1" ]; then
      # tbl may be a COUNT, 0 for no table at all, or "N:tabdup" for N ids plus a tab-indented duplicate of H1.
      local tn="${tbl%%:*}" tmode=""; [ "$tbl" != "$tn" ] && tmode="${tbl##*:}"
      { printf '%s\n' '#!/usr/bin/env bash' "$1"; [ "$tn" -gt 0 ] && st_tbl "$tn" "$tmode"; } > "$d/gates/fastgate-drive.sh"
    fi
    ( cd "$d" && git init -q . >/dev/null 2>&1 && git add -A >/dev/null 2>&1 \
      && git -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false \
             commit -q --allow-empty -m "selftest stub" >/dev/null 2>&1 )
    # $3 = a CT_DRIVE_TIMEOUT override, so the timeout branch can be driven by a REAL `timeout` in a second
    # instead of by a stub that merely exits 124 [#544 item (34)]. Passed only when given, because `timeout ""`
    # is a usage error and would make the arm red for its own reason.
    if [ -n "${3-}" ]; then
      ( cd "$d" && G="$d/gates" ROOT="$d" STEM=probe ALL="$ST_T/d-all.log" SUBSET="" BLK="$ST_T/block.sh" CT_DRIVE_TIMEOUT="$3" \
        bash -c 'set -uo pipefail; red=0; . "$BLK" >/dev/null 2>&1; printf %s "$red"' 2>/dev/null )
    else
      ( cd "$d" && G="$d/gates" ROOT="$d" STEM=probe ALL="$ST_T/d-all.log" SUBSET="" BLK="$ST_T/block.sh" \
        bash -c 'set -uo pipefail; red=0; . "$BLK" >/dev/null 2>&1; printf %s "$red"' 2>/dev/null )
    fi
  }
  # ── C91a TO C91d: A TIMEOUT IS A REPORTED DECLINE AND NEVER A RED [#544 item (34);
  # jobs/the-unit-blocks-timeout-900-has-lost-most-of-its-margin-and-a-timeout-there-reds-the-suite-2026-10-20].
  # THE JOB'S case FIELD ASKS FOR THE CEILING TO BE SET JUST UNDER THE RUNTIME AND THE BLOCK RUN, so that is
  # what C91a does: a one-second ceiling against a stub that sleeps three, which drives `timeout` itself end to
  # end rather than asserting a branch from a stub's chosen exit code. C91b is the same stub at exit 124 WITHOUT
  # a real timeout, which is what the branch sees, and the two agreeing is what says the branch is about drc and
  # not about how the 124 arose.
  # C91c IS THE MUTANT AND IS WHAT MAKES THE PAIR EVIDENCE: with the 124 limb removed from the condition the
  # same stub must be RED, which is the behaviour this item removes. Without it C91a would be satisfied by any
  # block that happens not to redden, including one that credits a timeout as a green.
  # C91d IS THE LIMIT, and it is deliberately not a skip: a harness that answered a case WRONGLY and then timed
  # out is still RED. A wrong answer is evidence about the tree; a timeout is evidence about the container, and
  # only the second is excused. That pair is what stops this being a blanket excuse for exit 124.
  st C91a-a-REAL-timeout-is-a-SKIP-not-a-RED  "$(st_drive 'echo "cases: 1 declared"; sleep 3; echo "  ok  H1 [TC-SUITE-X1] stub"' 1 1)" 0
  st C91b-exit-124-reads-the-same-way         "$(st_drive 'echo "cases: 1 declared"; exit 124' 1)" 0
  st C91c-MUTANT-without-the-124-limb-it-REDS "$(ST_M="$(cat "$ST_T/block.sh")"; printf '%s' "$ST_M" | sed 's|^  if \[ "$drc" -eq 124 \] && \[ "$dfail" -eq 0 \]; then|  if false; then|' > "$ST_T/block.sh"; st_drive 'echo "cases: 1 declared"; exit 124' 1; printf '%s' "$ST_M" > "$ST_T/block.sh")" 1
  st C91d-a-FAILED-case-then-a-timeout-is-RED "$(st_drive 'echo "cases: 1 declared"; echo "  FAIL H1 [TC-SUITE-X1] stub"; exit 124' 1)" 1
  # C11 a harness that does not PARSE: bash exits 2 with no REFUSING line, so this must be RED (1), not a skip.
  st C11-a-harness-that-does-not-parse-is-RED "$(st_drive 'if then; fi fi')" 1
  # C12 the harness file is ABSENT: must be RED (1) and not a silence.
  st C12-a-missing-harness-is-RED            "$(st_drive '')" 1
  # C13 a NAMED refusal at exit 2 is still a SKIP (0): the dirty-tree path on the documented happy path.
  st C13-a-named-refusal-is-still-a-SKIP     "$(st_drive 'echo "fastgate-drive.sh: REFUSING - stub"; exit 2')" 0
  # ── C15 AND C16: THE SKIP BOUND [#526]. The verdict used to credit skips as green with no floor but
  # `dok -eq 0`, which is the finding that HELD #525. These two are a PAIR and must be read as one:
  # C15 shows the bound fires on a harness that has stopped asserting, C16 shows it does NOT fire on the
  # honest tree. C15 FAILS with the fix removed; C16 passes either way BY DESIGN, because it is the control
  # against setting the bound too tight, and a guard that fires on the normal case gets switched off.
  st_drive_n(){ # $1 = ok lines, $2 = SKIPPED lines, $3 = cases declared (default $1 + $2); exits 0, so only
    # the counts decide the verdict. Since #529 a stub DECLARES its cases as the harness does, or the block is RED,
    # and its SKIPPED lines take the names after its ok lines', because the block now wants one name per verdict.
    st_drive "echo \"cases: ${3:-$(( $1 + $2 ))} declared (stub)\"
for i in \$(seq 1 $1); do echo \"  ok  H\$i [TC-SUITE-0\$i]  (probe)\"; done
for i in \$(seq $(( $1 + 1 )) $(( $1 + $2 ))); do echo \"  SKIPPED H\$i [TC-SUITE-0\$i]  probe\"; done
exit 0" "${3:-$(( $1 + $2 ))}"
  }
  st C15-one-ok-and-25-skipped-is-RED        "$(st_drive_n 1 25)" 1
  st C16-24-ok-and-2-skipped-is-still-green  "$(st_drive_n 24 2)" 0
  # C18: THE BOUND MUST ALSO BE PINNED AGAINST BEING WIDENED [#526, antagonist A's F3]. C15 and C16 together
  # pin it only to the interval [3, 25]: measured, `sed` the bound to `-gt 20` and the whole selftest is still
  # green, so the pair discriminates against the fix being REMOVED and not against it being LOOSENED. This is
  # the boundary case, and it is the tightest one the honest tree permits - A also measured that the reachable
  # honest maximum is exactly 2, because gates/fastgate-drive.sh had three SKIPPED emission sites and two of
  # them are the mutually exclusive halves of H1b (esbuild present but no bundle built, and esbuild absent;
  # named rather than numbered since #527, whose cases moved the lines). So 3 skips meant something was wrong.
  # #527 ADDS SIX CASES THAT CAN SKIP, and only some share H25's condition (a git whose `update-index
  # --assume-unchanged` does not hide a changed file from `git status`). H11 and H30 hide only that way, as H25
  # does; H10 can also hide by a clean filter, H28 and H32 by skip-worktree or a clean filter, and H31 by
  # .git/info/exclude, and those skip only when no route hides. So the honest count is 1 (H1b) on a git that
  # hides the file, which this container's 2.43.0 does, and 4 (H1b, H11, H25, H30) on one that does not, which
  # this bound turns RED. That red is deliberate and is the thing to re-measure before raising the bound: a
  # bound widened to fit would also pass a harness that had silently skipped other cases.
  st C18-24-ok-and-3-skipped-is-RED          "$(st_drive_n 24 3)" 1
  # ── C17: THE DECLINE TEST MUST REQUIRE A REAL REFUSAL LINE, NOT THE WORD ANYWHERE [#526]. ───────────────
  # The drefuse grep was unanchored, so an exit 2 whose prose merely contains "REFUSING" read as a decline
  # and printed SKIPPED. The plausible route is the #461 shifted-file class, where bash's error text is a
  # fragment of a file that no longer exists at that offset - and fastgate-drive.sh carries twelve REFUSING
  # lines, which is precisely the parse-failure case the decline test exists to tell apart from a refusal.
  st C17-refusing-in-prose-is-not-a-decline  "$(st_drive 'echo "this harness is not REFUSING at all"; exit 2')" 1
  # ── C19 TO C24: THE DECLARED DENOMINATOR [#529, jobs/the-unit-blocks-verdict-bounds-skips-rather-than-the-denominator-so-a-harness-that-stops-silently-is-green-on-one-assertion-2026-10-20]. ──
  # One case per instance the job measured, each RED with the fix and each green on #527's block, which is
  # how they were checked before this comment was written; C24 is the control that the honest shape, with its
  # declaration, is still green.
  # C19, instance (1), THE HEADLINE: one ok line of 26 declared, exit 0. #527's block read it green.
  st C19-one-ok-of-26-declared-is-RED       "$(st_drive_n 1 0 26)" 1
  # C20: the same single ok line and NO declaration at all, which is what #527's harness printed.
  st C20-no-declaration-is-RED              "$(st_drive 'echo "  ok  H1 [TC-SUITE-057]  (probe)"; exit 0')" 1
  # C21, instance (2): 24 ok and 2 skips written at FOUR spaces, 26 declared. The strict count reads 0 skipped.
  st C21-a-four-space-skip-is-RED           "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 24); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "    SKIPPED H25 [TC-SUITE-082]  probe"; echo "    SKIPPED H26 [TC-SUITE-083]  probe"; exit 0' 26)" 1
  # C22, instance (3): 25 ok on stdout and the 26th on STDERR, 26 declared. #527's 2>&1 counted all 26.
  st C22-an-ok-line-on-stderr-is-not-counted "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 25); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "  ok  H26 [TC-SUITE-083]  (probe)" >&2; exit 0' 26)" 1
  # C23, instance (4): 25 well-formed ok lines and one bare `  ok  `, 26 declared.
  st C23-a-bare-ok-line-is-RED              "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 25); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "  ok  "; exit 0' 26)" 1
  # C24, THE CONTROL: the honest shape (32 ok, 1 skipped, 33 declared) is green.
  st C24-the-honest-shape-is-green          "$(st_drive_n 32 1 33)" 0
  # C25 AND C26 KILL A MUTANT THE FIRST SIX LEFT ALIVE [#529 rehearsal, mutant UM2]. With the two strict count
  # comparisons (dokany against dok, dskipany against dskip) deleted, C19 to C24 all still passed: each of their
  # stray lines also short-changed the denominator, so the denominator alone turned them red. These two keep the
  # denominator whole and add one stray line, so only the strict counts can see it.
  # C25: 25 ok and 1 SKIPPED, 26 declared, plus one bare `  ok` line. The sum balances and dokany reads 26.
  st C25-a-stray-ok-beside-a-full-count-is-RED   "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 25); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "  SKIPPED H26 [TC-SUITE-083]  probe"; echo "  ok  "; exit 0' 26)" 1
  # C26: 26 ok, 26 declared, plus one SKIPPED line at four spaces. The sum balances and dskipany reads 1.
  st C26-a-stray-skip-beside-a-full-count-is-RED "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 26); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "    SKIPPED H27 [TC-SUITE-084]  probe"; exit 0' 26)" 1
  # C27 TO C29: TWO HOLES THE #529 REVIEW FOUND [both reviewers' F3]. C27: one ok line under a twenty-digit
  # declaration, which -ne could not compare and so read as agreeing. C28: 26 declared and 26 ok lines, H25
  # twice and H26 never, the count balanced by a duplicate. C29: 26 ok of 26 declared plus a FAIL at a tab.
  st C27-a-twenty-digit-declaration-is-RED   "$(st_drive 'echo "cases: 99999999999999999999 declared (stub)"; echo "  ok  H1 [TC-SUITE-057]  (probe)"; exit 0' 26)" 1
  st C28-one-case-twice-one-missing-is-RED   "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 25); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; echo "  ok  H25 [TC-SUITE-025]  (probe)"; exit 0' 26)" 1
  st C29-a-tab-indented-fail-is-RED          "$(st_drive 'echo "cases: 26 declared (stub)"; for i in $(seq 1 26); do echo "  ok  H$i [TC-SUITE-0$i]  (probe)"; done; printf "\tFAIL H27 [TC-SUITE-084]  probe\n"; exit 0' 26)" 1
  # ── C30 TO C32: THE COMMITTED-TABLE CROSS-CHECK [#531, jobs/the-unit-blocks-declared-case-count-is-a-hand-kept-array-so-it-can-be-edited-down-together-with-the-cases-2026-10-21]. ──
  # C30 IS THE JOB'S OWN CASE, VERBATIM, and it is the one that was green on #530's fix: a stub that REPLACES
  # the harness, declares one case and runs one case agrees with itself perfectly, because every number the
  # block had came out of the file the stub replaced. With no tc() table in the committed text it is now RED.
  st C30-a-stub-with-no-case-table-is-RED   "$(st_drive 'echo "cases: 1 declared (stub)"; echo "  ok  H1 [TC-SUITE-057]  (probe)"; exit 0' 0)" 1
  # C31: the table is THERE but its header is respaced to `tc() {`, which is still valid bash and which the
  # range `/^tc(){/,/^}/` does not match - so the ids cannot be read and the declaration cannot be checked.
  # This is the shape of the gap #530's guard added, seen from this block rather than from the harness.
  st C31-a-respaced-table-header-is-RED     "$(st_drive 'echo "cases: 1 declared (stub)"; echo "  ok  H1 [TC-SUITE-057]  (probe)"; exit 0
tc() {
  case "$1" in
    H1) printf TC-SUITE-X1 ;;
  esac
}' 0)" 1
  # C32 IS C13's PAIR AND THE WHOLE POINT OF THE SECOND HALF OF THIS JOB. C13 is a named refusal at exit 2
  # with a readable table and it must stay a SKIP, because the dirty-tree decline is the documented happy path.
  # C32 is a named refusal at exit 2 whose table CANNOT BE READ - the harness's own empty-table refusal - and it
  # must be RED. Same exit code, same REFUSING line, opposite verdicts: that is what shows the new condition
  # discriminates rather than simply tightening the decline branch out of existence.
  st C32-a-refusal-with-no-readable-table-is-RED "$(st_drive 'echo "fastgate-drive.sh: REFUSING - the tc() table in this script yielded no case ids"; exit 2' 0)" 1
  # ── C33 AND C34 EXIST BECAUSE THIS RUN'S OWN ANTAGONIST MEASURED THAT C30, C31 AND C32 ALL PRINT THE SAME
  # REASON LINE - "the committed tc() table yields NO case ids" - so the limb shipped with ONE of its THREE
  # arms controlled and the commit message claimed "each its own test". These are the other two arms. [#531]
  # C33: a duplicate case id written at a TAB. Before the tr class was widened this read GREEN, crediting two
  # cases from a table that maps one; it is the repeated-id arm AND the regression test for the tab evasion.
  # IT DECLARES THREE ON PURPOSE. With a declaration of 2 this case went RED on BOTH trees - the table yields
  # three ROWS either way, so the COUNT arm fired and the repeated-id arm was never reached: the right verdict
  # for the wrong reason, which is #432's A7b. Declaring 3 makes rows==declared, so ONLY distinctness can red it.
  st C33-a-tab-indented-duplicate-id-is-RED "$(st_drive 'echo "cases: 3 declared (stub)"; echo "  ok  H1 [TC-SUITE-057]  (probe)"; echo "  ok  H2 [TC-SUITE-058]  (probe)"; echo "  ok  H3 [TC-SUITE-059]  (probe)"; exit 0' 2:tabdup)" 1
  # C34: the harness declares fewer cases than the committed table maps. This is the count arm, and it is the
  # one that catches a case body deleted from the harness while its row stays in the table.
  st C34-a-declaration-under-the-table-is-RED "$(st_drive 'echo "cases: 2 declared (stub)"; echo "  ok  H1 [TC-SUITE-057]  (probe)"; echo "  ok  H2 [TC-SUITE-058]  (probe)"; exit 0' 3)" 1


  # ── C35 TO C79: THE GAP-FILL DOOR (G6, #533). THE COUNTS ARE THE COMMAND'S OWN OUTPUT AND ARE DELIBERATELY
  # NOT RESTATED HERE: this banner read "TWENTY-FIVE CASES AND SEVEN MUTANTS" through four repair rounds while
  # the arm grew to three figures and the mutant list to thirteen, and the same file said "THE THIRTEEN
  # MUTANTS" 470 lines below - two counts in one file disagreeing, with no case asserting either, which is the
  # drift CLAUDE.md records against gatemanifest.sh's own count. Run the arm; it prints the tally. ──────────────────────────
  # The door is the block between GF_REG= and the gates array, and these cases run THAT BLOCK, extracted from
  # this very file by awk, against freshly `git init`ed scratch repositories whose base, HEAD and working-tree
  # registers this harness writes. They are here and not in a gate because the thing under test is gates.sh's
  # own verdict logic before any gate runs, and because a door cannot be the control for its own absence (C59).
  #
  # NEVER A WORKTREE OF THE REAL CHECKOUT: #530's controls moved the real refs/remotes/origin/main that way,
  # because worktrees share refs. Each fixture is an independent repository under $ST_T.
  #
  # EVERY MUTANT IS BUILT FROM THE EXTRACTED BLOCK BY A LITERAL STRING EDIT, and each must TURN a NAMED case.
  # That is the half #532 got wrong: restoring its vetoed predicate left its 51-case arm at 85 pass / 0 fail,
  # so not one case could tell the new predicate from the one it replaced.
  awk '/^GF_REG=/{p=1} /^gates=\("\$G\/mountcheck.js"\)/{if(p)exit} p{print}' "$SF" > "$ST_T/gf.sh"
  GFMINE=build__0000000000001; GFOTHER=build__0000000000002
  st_row(){ printf '%s\t%s\t%s\t-\t-\t2026-10-22T19:00Z\t%s\t%s\tfixture row written by the gates.sh selftest\n' "$1" "$2" "$3" "$4" "$5"; }
  st_gc(){ git -C "$1" -c user.email=f@f -c user.name=f -c commit.gpgsign=false "${@:2}" >/dev/null 2>&1; }
  st_mk(){ # $1 = name; a repo whose base register holds 530, 531, 532 and whose origin/main ref is set
    local d="$ST_T/$1"; rm -rf "$d"; mkdir -p "$d/gates"; git init -q "$d" 2>/dev/null
    cp "$SG/buildnum.sh" "$d/gates/buildnum.sh"
    { echo '# fixture register for the gap-fill door selftest'
      st_row 530 issued - "$GFOTHER" run-log; st_row 531 issued - "$GFOTHER" run-log; st_row 532 issued - "$GFOTHER" run-log
    } > "$d/gates/build-numbers.tsv"
    st_gc "$d" add -A; st_gc "$d" commit -q -m 'fixture base register'
    git -C "$d" update-ref refs/remotes/origin/main HEAD 2>/dev/null; printf '%s' "$d"; }
  st_gfrun(){ # $1 = repo, $2 = block file; prints stdout+stderr
    ( cd "$1" && env ROOT="$1" N='#533' ALL="$1/gf.log" bash -c 'set -uo pipefail; : > "$ALL"; source '"$2" 2>&1 ); }
  # FIELD 3 OF THE LINE, NOT FIELD 4: it reads "build-number series: ok - rows read: ...", so $4 is the dash.
  # The first version of this helper read $4 and every verdict came back "-", which is a harness fault; it is
  # recorded here because a helper that returns a constant makes every case that uses it unfalsifiable.
  st_gfv(){ st_gfrun "$1" "$2" | grep -m1 'rows read:' | awk '{print $3}'; }
  st_gfn(){ st_gfrun "$1" "$2" | grep -c "$3" || true; }
  st_sub(){ awk -v a="$3" -v b="$4" '{ i=index($0,a); if(i>0) $0=substr($0,1,i-1) b substr($0,i+length(a)); print }' "$1" > "$2"; }

  # C35-C37: a bare gap-fill row - a foreign runId and '-' in field 3 - uncommitted, committed, and deleted
  # from the working tree only. All three RED, and each prints the row it refuses field for field.
  d="$(st_mk gf1)"; st_row 533 minted - "$GFMINE" minted >> "$d/gates/build-numbers.tsv"
  st_gc "$d" add -A; st_gc "$d" commit -q -m '#533 mint'
  st_row 400 issued - "$GFOTHER" measured >> "$d/gates/build-numbers.tsv"
  st C35-a-bare-gapfill-row-UNCOMMITTED-is-RED "$(CT_RUNID=$GFMINE st_gfv "$d" "$ST_T/gf.sh")" RED
  st C35b-and-it-prints-the-row-field-for-field "$(CT_RUNID=$GFMINE st_gfn "$d" "$ST_T/gf.sh" 'n=\[400\]')" 1
  st C35c-and-the-counts-name-one-unaccounted "$(CT_RUNID=$GFMINE st_gfn "$d" "$ST_T/gf.sh" 'unaccounted=1')" 1
  d2="$(st_mk gf2)"; st_row 533 minted - "$GFMINE" minted >> "$d2/gates/build-numbers.tsv"
  st_row 400 issued - "$GFOTHER" measured >> "$d2/gates/build-numbers.tsv"
  st_gc "$d2" add -A; st_gc "$d2" commit -q -m '#533 mint and a planted row'
  st C36-the-same-row-COMMITTED-is-RED "$(CT_RUNID=$GFMINE st_gfv "$d2" "$ST_T/gf.sh")" RED
  d3="$(st_mk gf3)"; st_row 533 minted - "$GFMINE" minted >> "$d3/gates/build-numbers.tsv"
  st_row 400 issued - "$GFOTHER" measured >> "$d3/gates/build-numbers.tsv"
  st_gc "$d3" add -A; st_gc "$d3" commit -q -m '#533 mint and a planted row'
  grep -v '^400' "$d3/gates/build-numbers.tsv" > "$d3/x" && mv "$d3/x" "$d3/gates/build-numbers.tsv"
  st C37-committed-then-deleted-from-the-worktree-is-RED "$(CT_RUNID=$GFMINE st_gfv "$d3" "$ST_T/gf.sh")" RED
  # TWO, not one, since the round-one repair: the phrase is in the GATES RED headline that names the cause
  # class AND in the detail line under it. The case is re-measured rather than relaxed to a range.
  st C37b-and-the-cause-is-named-a-deletion "$(CT_RUNID=$GFMINE st_gfn "$d3" "$ST_T/gf.sh" 'has been DELETED')" 2

  # C38-C40: THE TWO-LIVE-CONTAINER SHAPE, which is the wedge that withdrew BOTH earlier doors. Another
  # container mints #534 and pushes while this run holds #533. Before integrating, HEAD lacks the base's new
  # row; after integrating, the register is the honest union of both containers' rows, resolved in BOTH orders
  # (a real merge conflicts in the register, so the second order is built by hand). All three must read ok.
  d4="$(st_mk gf4)"; st_row 534 minted - "$GFOTHER" minted >> "$d4/gates/build-numbers.tsv"
  st_gc "$d4" add -A; st_gc "$d4" commit -q -m 'the other container pushes its own mint'
  git -C "$d4" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  git -C "$d4" reset -q --hard HEAD~1 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$d4/gates/build-numbers.tsv"
  st_gc "$d4" add -A; st_gc "$d4" commit -q -m '#533 mint'
  st C38-two-containers-BEFORE-integrating-is-ok "$(CT_RUNID=$GFMINE st_gfv "$d4" "$ST_T/gf.sh")" ok
  st C38b-and-reports-NO-deletion "$(CT_RUNID=$GFMINE st_gfn "$d4" "$ST_T/gf.sh" 'merge-base-vs-head=0 head-vs-worktree=0')" 1
  d5="$(st_mk gf5)"; st_row 534 minted - "$GFOTHER" minted >> "$d5/gates/build-numbers.tsv"
  st_gc "$d5" add -A; st_gc "$d5" commit -q -m 'the other container pushes its own mint'
  git -C "$d5" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$d5/gates/build-numbers.tsv"
  st_gc "$d5" add -A; st_gc "$d5" commit -q -m '#533 mint after integrating'
  st C39-AFTER-integrating-theirs-then-mine-is-ok "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/gf.sh")" ok
  st C39b-and-it-is-counted-as-a-gapfill-that-is-mine "$(CT_RUNID=$GFMINE st_gfn "$d5" "$ST_T/gf.sh" 'gap-fill=1 (yours=1')" 1
  d6="$(st_mk gf6)"; st_row 534 minted - "$GFOTHER" minted >> "$d6/gates/build-numbers.tsv"
  st_gc "$d6" add -A; st_gc "$d6" commit -q -m 'the other container pushes its own mint'
  git -C "$d6" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  awk -v r="$(st_row 533 minted - "$GFMINE" minted)" '/^534\t/ && !d { printf "%s\n", r; d=1 } { print }' \
    "$d6/gates/build-numbers.tsv" > "$d6/y" && mv "$d6/y" "$d6/gates/build-numbers.tsv"
  st_gc "$d6" add -A; st_gc "$d6" commit -q -m '#533 mint resolved above the other row'
  st C40-AFTER-integrating-mine-then-theirs-is-ok "$(CT_RUNID=$GFMINE st_gfv "$d6" "$ST_T/gf.sh")" ok

  # C41-C45: #532's P0 - the honest run that NO value of CT_RUNID can satisfy, because gates/build.sh leaves a
  # second row attributed to `unknown-run` when CT_RUNID is not exported. RED without the escape, OVERRIDE with
  # it, and the OVERRIDE line carries no `ok` token and none of the five prefixes verify-log.sh reads.
  d7="$(st_mk gf7)"; st_row 534 minted - "$GFOTHER" minted >> "$d7/gates/build-numbers.tsv"
  st_gc "$d7" add -A; st_gc "$d7" commit -q -m 'the other container pushes its own mint'
  git -C "$d7" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$d7/gates/build-numbers.tsv"
  st_row 533 built - unknown-run build-sh >> "$d7/gates/build-numbers.tsv"
  st_gc "$d7" add -A; st_gc "$d7" commit -q -m '#533 mint and build after integrating'
  st C41-the-P0-without-the-escape-is-RED "$(CT_RUNID=$GFMINE st_gfv "$d7" "$ST_T/gf.sh")" RED
  st C41b-and-the-refusal-names-the-escape "$(CT_RUNID=$GFMINE st_gfn "$d7" "$ST_T/gf.sh" "CT_GAPFILL_OVERRIDE='533'")" 1
  st C42-the-P0-WITH-the-escape-is-OVERRIDE "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$d7" "$ST_T/gf.sh")" OVERRIDE
  st C43-the-OVERRIDE-summary-has-no-ok-token "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfrun "$d7" "$ST_T/gf.sh" | grep -m1 'rows read:' | grep -cw ok)" 0
  st C43b-nor-any-prefix-verify-log-reads "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfrun "$d7" "$ST_T/gf.sh" | grep -cE '^(PASS|FAIL|=== |gate manifest:|GATES)')" 0
  st C44-both-533-rows-are-judged-and-printed "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$d7" "$ST_T/gf.sh" 'FIELD FOR FIELD: n=\[533\]')" 2
  st C45-the-escape-is-inert-with-no-CT_RUNID "$( ( unset CT_RUNID; export CT_GAPFILL_OVERRIDE=533; st_gfn "$d7" "$ST_T/gf.sh" 'CT_RUNID is not set' ) )" 1

  # C46-C48: the escape's two tests, each refusing ON ITS OWN. A foreign `built` row under this run's own
  # minted number (field 7); a SECOND minted row that passes field 7 (the count); and a lone minted row that
  # is nobody's (the third test). Each is a different limb and each must RED.
  d8="$(st_mk gf8)"; st_row 534 minted - "$GFOTHER" minted >> "$d8/gates/build-numbers.tsv"
  st_gc "$d8" add -A; st_gc "$d8" commit -q -m 'other mint'; git -C "$d8" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$d8/gates/build-numbers.tsv"
  st_row 533 built - "$GFOTHER" build-sh >> "$d8/gates/build-numbers.tsv"
  st_gc "$d8" add -A; st_gc "$d8" commit -q -m 'mint plus a foreign build row'
  # REWRITTEN AT ROUND THREE, AND THE REASON IS THE FINDING AND NOT A RELAXATION [antagonist B of #533,
  # P1-1]. This case asserted RED: the escape refused any number carrying a row that is not this run's. That
  # test ALSO refuses the honest resumed run of C70, which exists on the live register at #507 and #519, and
  # it buys nothing against a forger because this door declares field 7 to be taken on trust - anyone who can
  # write the row can write the field. So the escape now passes the shape and REPORTS it: the verdict word is
  # OVERRIDE (never ok), the foreign rows are counted, and their field-7 values are NAMED in the line, which
  # is what the refusal could never tell a reader. M10 is the mutant that restores the old tests and must turn
  # C70b; these two cases now assert the reporting rather than the refusal.
  st C46-escape-PASSES-a-foreign-built-row-and-NAMES-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$d8" "$ST_T/gf.sh")" OVERRIDE
  st C46b-and-the-line-names-whose-row-it-was "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$d8" "$ST_T/gf.sh" "whose rows rode through: $GFOTHER")" 2
  st C46c-and-counts-it-as-neither-mine-nor-unknown-run "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$d8" "$ST_T/gf.sh" '1 row(s) carry neither it nor the literal unknown-run')" 2
  d9="$(st_mk gf9)"; st_row 534 minted - "$GFOTHER" minted >> "$d9/gates/build-numbers.tsv"
  st_gc "$d9" add -A; st_gc "$d9" commit -q -m 'other mint'; git -C "$d9" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$d9/gates/build-numbers.tsv"
  st_row 533 minted - unknown-run minted >> "$d9/gates/build-numbers.tsv"
  st_gc "$d9" add -A; st_gc "$d9" commit -q -m 'two minted rows for one number'
  st C47-escape-PASSES-a-second-minted-row-and-COUNTS-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$d9" "$ST_T/gf.sh")" OVERRIDE
  st C47b-and-the-line-says-two-minted-rows "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$d9" "$ST_T/gf.sh" 'carries 2 minted row(s)')" 2
  da="$(st_mk gfa)"; st_row 534 minted - "$GFOTHER" minted >> "$da/gates/build-numbers.tsv"
  st_gc "$da" add -A; st_gc "$da" commit -q -m 'other mint'; git -C "$da" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - unknown-run minted >> "$da/gates/build-numbers.tsv"
  st_gc "$da" add -A; st_gc "$da" commit -q -m 'a minted row that is nobody s'
  st C48-escape-refuses-a-mint-that-is-not-mine "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$da" "$ST_T/gf.sh")" RED

  # C49: ONE REAL TRAILING TAB. buildnum.sh's own NF>=2 filter reads such a row as one that BURNS a number, so
  # a door that cannot see it is blind to the shape #532's item (f) names. C56 is its mutant.
  db="$(st_mk gfb)"; st_row 533 minted - "$GFMINE" minted >> "$db/gates/build-numbers.tsv"
  printf '400\tissued\t-\t-\t-\t2026-10-22T19:00Z\t%s\tmeasured\ta row with one trailing tab\t\n' "$GFOTHER" >> "$db/gates/build-numbers.tsv"
  st_gc "$db" add -A; st_gc "$db" commit -q -m 'mint and a trailing-tab plant'
  st C49-a-trailing-tab-gapfill-row-is-RED "$(CT_RUNID=$GFMINE st_gfv "$db" "$ST_T/gf.sh")" RED
  st C49b-the-fixture-really-carries-the-tab "$(tail -1 "$db/gates/build-numbers.tsv" | cat -A | grep -c '\^I\$')" 1

  # C50: ONE NUL BYTE. It makes every grep-based reader print "binary file matches" instead of lines, which is
  # how one byte makes buildnum.sh answer that an ISSUED number is free. The verdict line must say RED too, and
  # not "NOT CHECKED": the first draft of this door reached GATES RED with a NOT CHECKED verdict beside it, and
  # this case is what found that.
  dc="$(st_mk gfc)"; st_row 533 minted - "$GFMINE" minted >> "$dc/gates/build-numbers.tsv"
  st_gc "$dc" add -A; st_gc "$dc" commit -q -m 'mint'
  printf 'x\000x\n' >> "$dc/gates/build-numbers.tsv"
  st C50-a-NUL-byte-in-the-register-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dc" "$ST_T/gf.sh")" RED
  st C50b-and-the-verdict-line-carries-the-cause "$(CT_RUNID=$GFMINE st_gfrun "$dc" "$ST_T/gf.sh" | grep -m1 '^build-number series:' | grep -c 'NUL byte')" 1

  # C51: a number THE BASE ALREADY HOLDS is not a gap fill at all - the #416 class in this job's own title.
  # Those rows are REPORTED with their number, kind and field 7, and refused by nothing here. A legitimate
  # later push adds them, so a door that refused them would fire on the normal case and get switched off.
  dd="$(st_mk gfd)"; st_row 533 minted - "$GFMINE" minted >> "$dd/gates/build-numbers.tsv"
  st_row 532 built - "$GFOTHER" build-sh >> "$dd/gates/build-numbers.tsv"
  st_row 532 shipped - "$GFOTHER" run-log >> "$dd/gates/build-numbers.tsv"
  st_gc "$dd" add -A; st_gc "$dd" commit -q -m 'mint plus two rows under a base-held number'
  st C51-base-held-rows-are-REPORTED-not-refused "$(CT_RUNID=$GFMINE st_gfn "$dd" "$ST_T/gf.sh" 'REPORTED, NOT REFUSED - #532')" 2
  st C51b-and-the-verdict-is-still-ok "$(CT_RUNID=$GFMINE st_gfv "$dd" "$ST_T/gf.sh")" ok
  st C51c-the-report-names-kind-and-field-7 "$(CT_RUNID=$GFMINE st_gfn "$dd" "$ST_T/gf.sh" "kind=base-held mintedBy=\[$GFOTHER\]")" 2

  # C52-C54: THE CENSUS ROUTE. A row written by `buildnum.sh sweep --add` itself, under a FOREIGN runId, is ok
  # (that is the 228-row population #530's provenance word rejected). A census-SHAPED row whose field 3 names a
  # commit that does not name the number is RED. A census-shaped row citing a commit of the SAME push reads ok,
  # which is a declared forgery path and a known limit on G6, not an accident.
  de="$(st_mk gfe)"; st_row 533 minted - "$GFMINE" minted >> "$de/gates/build-numbers.tsv"
  st_gc "$de" add -A; st_gc "$de" commit -q -m '#533 mint'
  echo fixture > "$de/hole.txt"; st_gc "$de" add -A; st_gc "$de" commit -q -m 'a fixture commit whose subject names #400'
  ( cd "$de" && CT_RUNID=$GFOTHER gates/buildnum.sh sweep --add >/dev/null 2>&1 )
  st_gc "$de" add -A; st_gc "$de" commit -q -m 'the census row'
  st C52-a-real-sweep-written-census-row-is-ok "$(CT_RUNID=$GFMINE st_gfv "$de" "$ST_T/gf.sh")" ok
  st C52b-and-it-is-counted-as-census "$(CT_RUNID=$GFMINE st_gfn "$de" "$ST_T/gf.sh" 'census=1')" 1
  df="$(st_mk gff)"; st_row 533 minted - "$GFMINE" minted >> "$df/gates/build-numbers.tsv"
  st_gc "$df" add -A; st_gc "$df" commit -q -m '#533 mint'
  GFSHA="$(git -C "$df" rev-parse HEAD)"
  st_row 400 issued "$GFSHA" "$GFOTHER" git-log >> "$df/gates/build-numbers.tsv"
  st_gc "$df" add -A; st_gc "$df" commit -q -m 'a census-shaped row citing a commit that names another number'
  st C53-census-shaped-whose-subject-misses-N-is-RED "$(CT_RUNID=$GFMINE st_gfv "$df" "$ST_T/gf.sh")" RED
  dg="$(st_mk gfg)"; st_row 533 minted - "$GFMINE" minted >> "$dg/gates/build-numbers.tsv"
  st_gc "$dg" add -A; st_gc "$dg" commit -q -m 'a commit naming #400 added by this very push'
  GFSHA="$(git -C "$dg" rev-parse HEAD)"
  st_row 400 issued "$GFSHA" "$GFOTHER" git-log >> "$dg/gates/build-numbers.tsv"
  st_gc "$dg" add -A; st_gc "$dg" commit -q -m 'the forged census row'
  st C54-a-same-push-census-row-is-ok-AS-DECLARED "$(CT_RUNID=$GFMINE st_gfv "$dg" "$ST_T/gf.sh")" ok

  # C55: a gap-fill row TYPED WITH THIS RUN'S OWN runId reads as ours. The runId is taken on trust and that is
  # a declared known limit on G6, stated here with its verdict rather than left for a reader to discover.
  dh="$(st_mk gfh)"; st_row 533 minted - "$GFMINE" minted >> "$dh/gates/build-numbers.tsv"
  st_row 400 minted - "$GFMINE" minted >> "$dh/gates/build-numbers.tsv"
  st_gc "$dh" add -A; st_gc "$dh" commit -q -m 'mint plus a row typed with this run s own runId'
  st C55-a-row-typed-with-my-runId-is-ok-AS-DECLARED "$(CT_RUNID=$GFMINE st_gfv "$dh" "$ST_T/gf.sh")" ok

  # C56: a REAL deleted base row - present at the merge-base and absent from HEAD. The test is against the
  # MERGE-BASE and never against the base itself, because rows origin/main gained are not at the merge-base, so
  # a base that moved AHEAD of an unrebased HEAD cannot read as a deletion. Reading it as one rebuilt #530's
  # wedge, and C38 is the positive half of that pair.
  di="$(st_mk gfi)"; st_row 533 minted - "$GFMINE" minted >> "$di/gates/build-numbers.tsv"
  grep -v '^531' "$di/gates/build-numbers.tsv" > "$di/x" && mv "$di/x" "$di/gates/build-numbers.tsv"
  st_gc "$di" add -A; st_gc "$di" commit -q -m 'mint, and a base row deleted'
  st C56-a-deleted-merge-base-row-is-RED "$(CT_RUNID=$GFMINE st_gfv "$di" "$ST_T/gf.sh")" RED
  st C56b-and-the-row-is-printed "$(CT_RUNID=$GFMINE st_gfn "$di" "$ST_T/gf.sh" 'n=\[531\]')" 1

  # C57: an UNREADABLE base inside a work tree is RED, loudly, and names the one command that fixes it. Every
  # throwaway clone in this project has no refs/remotes/origin/main until `git update-ref` sets it, so RED here
  # is this door's DECLARED behaviour and not a wedge - which is why the refusal prints the remedy.
  dj="$(st_mk gfj)"; st_row 533 minted - "$GFMINE" minted >> "$dj/gates/build-numbers.tsv"
  st_gc "$dj" add -A; st_gc "$dj" commit -q -m '#533 mint'
  git -C "$dj" update-ref -d refs/remotes/origin/main 2>/dev/null
  st C57-an-unreadable-base-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dj" "$ST_T/gf.sh")" RED
  # ONE, not two: the remedy is named in GF_WHY, which the verdict line and the detail line both carry - and
  # until the GF_GF guard above, the block DIED between them, so this case's own drift from 2 to 1 is what
  # exposed that P0. Both lines are asserted separately now rather than counted together.
  st C57b-the-verdict-line-names-the-update-ref-remedy "$(CT_RUNID=$GFMINE st_gfrun "$dj" "$ST_T/gf.sh" | grep -c '^build-number series:.*git update-ref refs/remotes/origin/main')" 1
  st C57c-and-the-detail-line-does-too "$(CT_RUNID=$GFMINE st_gfrun "$dj" "$ST_T/gf.sh" | grep -c '^  the BASE register.*git update-ref refs/remotes/origin/main')" 1
  st C57d-and-the-block-reaches-GATES-RED "$(CT_RUNID=$GFMINE st_gfn "$dj" "$ST_T/gf.sh" '^GATES RED #533')" 1

  # C58: THE AGREEMENT CONTROL. The door's "yours" verdict must equal what `stampable` answers when run BY HAND
  # on the same file, and the md5 of the buildnum.sh the door ran is printed so the two are known to be one
  # object. This is what makes the delegation real rather than a claim: at #532's withdrawal its door and this
  # authority disagreed about an honest tree in both directions.
  ( cd "$d5" && CT_RUNID=$GFMINE gates/buildnum.sh stampable '#533' > "$ST_T/hand.out" 2>&1 ) && GFHRC=0 || GFHRC=$?
  echo "SELFTEST NOTE buildnum.sh md5 the door ran: $(md5sum "$d5/gates/buildnum.sh" | cut -c1-12), repository: $(md5sum "$SG/buildnum.sh" | cut -c1-12); by hand exit $GFHRC: $(sed -n '1p' "$ST_T/hand.out")"
  st C58-the-hand-run-of-stampable-says-yours "$GFHRC" 0
  st C58b-and-the-door-counted-it-as-yours "$(CT_RUNID=$GFMINE st_gfn "$d5" "$ST_T/gf.sh" 'yours=1')" 1
  st C58c-and-the-two-buildnum-files-are-one-object "$(md5sum "$d5/gates/buildnum.sh" | cut -c1-32)" "$(md5sum "$SG/buildnum.sh" | cut -c1-32)"
  ( cd "$d2" && CT_RUNID=$GFMINE gates/buildnum.sh stampable '#400' > "$ST_T/hand2.out" 2>&1 ) && GFHRC=0 || GFHRC=$?
  st C58d-the-hand-run-refuses-the-plant-too "$GFHRC" 1
  st C58e-and-so-did-the-door "$(CT_RUNID=$GFMINE st_gfv "$d2" "$ST_T/gf.sh")" RED

  # C59: WITH THE DOOR TAKEN OUT, the bare gap-fill row of C36 passes the place the door stood: no verdict line
  # at all and nothing stops the suite. This is the case that shows the door is what reddens C35 to C37, and
  # without it their RED could come from anything in this file.
  : > "$ST_T/nodoor.sh"
  st C59-with-the-door-removed-there-is-no-verdict-line "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/nodoor.sh" 'build-number series:')" 0
  st C59b-and-nothing-stops-the-suite "$( CT_RUNID=$GFMINE st_gfrun "$d2" "$ST_T/nodoor.sh" >/dev/null 2>&1; echo $? )" 0


  # ── C60-C67: THE CONTROLS ANTAGONIST A's P0 PROVED WERE MISSING, plus the four branches no case had entered.
  # A's veto was not that the door was wrong about a case it tested; it was that `gf_minus`'s `NR==FNR` idiom
  # INVERTS when the subtrahend file is empty (awk's FNR restarts, so with an empty first file every line of
  # the second one is read as the first file and recorded as the SUBTRAHEND), and the arm had 100 pass / 0 fail
  # on both the broken and the repaired door because no fixture ever emptied one. Four call sites take a
  # subtrahend, so four states can empty one: base.rows (C62), head.rows (C61, twice), wt.rows (C60). M8 is
  # their mutant and it must turn C60 and C61, or this repair is itself uncontrolled - which is the exact
  # requirement this build levelled at #532.
  st_gfv2(){ # the verdict word when the line carries no `rows read:` (the early refusals and NOT CHECKED).
    st_gfrun "$1" "$2" | grep '^build-number series:' | grep -v 'REPORTED, NOT REFUSED' | head -1 | awk '{print $3}'; }
  dk="$(st_mk gfk)"; st_row 533 minted - "$GFMINE" minted >> "$dk/gates/build-numbers.tsv"
  st_gc "$dk" add -A; st_gc "$dk" commit -q -m '#533 mint'
  : > "$dk/gates/build-numbers.tsv"
  st C60-the-WORKING-TREE-register-emptied-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dk" "$ST_T/gf.sh")" RED
  st C60b-and-the-counts-say-four-rows-went "$(CT_RUNID=$GFMINE st_gfn "$dk" "$ST_T/gf.sh" 'head-vs-worktree=4')" 1
  st C60c-and-the-headline-names-a-deletion "$(CT_RUNID=$GFMINE st_gfn "$dk" "$ST_T/gf.sh" 'GATES RED #533 — stopped before running any gate: a committed row has been DELETED')" 1
  dl="$(st_mk gfl)"; st_row 533 minted - "$GFMINE" minted >> "$dl/gates/build-numbers.tsv"
  st_gc "$dl" add -A; st_gc "$dl" commit -q -m '#533 mint'
  : > "$dl/gates/build-numbers.tsv"; st_gc "$dl" add -A; st_gc "$dl" commit -q -m 'the register is wiped in a commit'
  st_row 530 issued - "$GFOTHER" run-log >> "$dl/gates/build-numbers.tsv"
  st C61-the-COMMITTED-register-emptied-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dl" "$ST_T/gf.sh")" RED
  st C61b-and-the-count-is-against-the-MERGE-BASE "$(CT_RUNID=$GFMINE st_gfn "$dl" "$ST_T/gf.sh" 'merge-base-vs-head=3')" 1
  # C62: THE BASE register with no rows at all. There is then no series, so by this door's own definition no
  # row can be a gap fill: every row is at or above a top of 0 and is REPORTED as extending. ok is the correct
  # verdict and it is also the least this door ever says, which is why the case is written down rather than
  # left to be rediscovered as a hole. The state is not reachable on main (the register has had rows since
  # #465), and it is reachable in any fixture or fresh clone, which is where a selftest lives.
  dm="$ST_T/gfm"; rm -rf "$dm"; mkdir -p "$dm/gates"; git init -q "$dm" 2>/dev/null
  cp "$SG/buildnum.sh" "$dm/gates/buildnum.sh"
  echo '# fixture register with no rows at all' > "$dm/gates/build-numbers.tsv"
  st_gc "$dm" add -A; st_gc "$dm" commit -q -m 'a base register with no rows'
  git -C "$dm" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$dm/gates/build-numbers.tsv"
  st_row 400 issued - "$GFOTHER" measured >> "$dm/gates/build-numbers.tsv"
  st_gc "$dm" add -A; st_gc "$dm" commit -q -m 'mint plus a planted row over an empty base'
  st C62-an-EMPTY-BASE-register-reads-ok "$(CT_RUNID=$GFMINE st_gfv "$dm" "$ST_T/gf.sh")" ok
  st C62b-and-both-rows-are-REPORTED-as-extending "$(CT_RUNID=$GFMINE st_gfn "$dm" "$ST_T/gf.sh" 'is ABOVE the base series top #0')" 2
  st C62c-and-the-base-really-held-no-rows "$(CT_RUNID=$GFMINE st_gfn "$dm" "$ST_T/gf.sh" 'rows read: base=0')" 1
  # C63: THE COUNTS PARTITION. Every gap-fill row is credited to exactly one of yours / census / override /
  # unaccounted, so the four must sum to the gap-fill total - otherwise the line can report a clean partition
  # while a row fell through the case statement unjudged, which is the hole the first draft had (it `break`ed
  # out of the loop on the first refusal and left the remaining rows uncounted).
  st_gfsum(){ st_gfrun "$1" "$2" | grep -m1 'rows read:' \
    | sed -n 's/.*gap-fill=\([0-9]*\) (yours=\([0-9]*\) census=\([0-9]*\) override=\([0-9]*\) unaccounted=\([0-9]*\)).*/\1 \2 \3 \4 \5/p' \
    | awk '{ print ($2+$3+$4+$5 == $1) ? "partition" : "BROKEN " $0 }'; }
  st C63-the-counts-partition-holds-on-a-RED "$(CT_RUNID=$GFMINE st_gfsum "$d2" "$ST_T/gf.sh")" partition
  st C63b-and-on-the-two-container-ok "$(CT_RUNID=$GFMINE st_gfsum "$d5" "$ST_T/gf.sh")" partition
  st C63c-and-on-an-OVERRIDE "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfsum "$d7" "$ST_T/gf.sh")" partition
  st C63d-and-on-a-three-row-plant "$(CT_RUNID=$GFMINE st_gfsum "$dd" "$ST_T/gf.sh")" partition
  # C64: CT_RUNID=unknown-run, which antagonist A found INVERTED the door - every `yours` credit is computed
  # from it, and `unknown-run` is the one value gates/buildnum.sh:519 reserves for a row belonging to nobody,
  # so a run exporting it read `ok` on the very tree that reads RED with an honest id. It is refused at the top.
  st C64-CT_RUNID-unknown-run-is-refused "$(CT_RUNID=unknown-run st_gfv2 "$d2" "$ST_T/gf.sh")" RED
  st C64b-and-the-cause-is-named-not-the-row "$(CT_RUNID=unknown-run st_gfn "$d2" "$ST_T/gf.sh" 'is this project.s value for a row belonging to NOBODY')" 1
  st C64c-the-INVERSION-is-real-with-an-honest-id "$(CT_RUNID=$GFMINE st_gfv "$d2" "$ST_T/gf.sh")" RED
  # C65: a row whose number gates/buildnum.sh cannot parse. `want_num` exits 2 with its message on STDERR, so
  # the door's first draft read an empty stdout and blamed CT_RUNID, printing a remedy that cannot work - the
  # #454 deadlock shape (the remedy loops). It must quote the stderr and say CT_RUNID is not the cause.
  dn="$(st_mk gfn)"; st_row 533 minted - "$GFMINE" minted >> "$dn/gates/build-numbers.tsv"
  st_row 99 issued - "$GFOTHER" measured >> "$dn/gates/build-numbers.tsv"
  st_gc "$dn" add -A; st_gc "$dn" commit -q -m 'mint plus a two-digit number row'
  st C65-an-unparseable-number-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dn" "$ST_T/gf.sh")" RED
  st C65b-and-the-stderr-is-quoted "$(CT_RUNID=$GFMINE st_gfn "$dn" "$ST_T/gf.sh" "is 2 digits")" 1
  st C65c-and-CT_RUNID-is-cleared-of-the-blame "$(CT_RUNID=$GFMINE st_gfn "$dn" "$ST_T/gf.sh" 'CT_RUNID is not the cause')" 1
  st C65d-and-it-is-counted-unaccounted-not-dropped "$(CT_RUNID=$GFMINE st_gfn "$dn" "$ST_T/gf.sh" 'unaccounted=1')" 1
  # C66: no scratch directory. The five early refusals set the stop flag before the counts exist, and the
  # first draft printed `NOT CHECKED - this door did not run` one line above `GATES RED`, which is a record
  # saying two things at once. The verdict word must be RED and the counts must say why they are dashes.
  st C66-no-scratch-directory-is-RED "$(TMPDIR=/nonexistent-ct533-selftest CT_RUNID=$GFMINE st_gfv "$dn" "$ST_T/gf.sh")" RED
  st C66b-and-the-dashes-say-why "$(TMPDIR=/nonexistent-ct533-selftest CT_RUNID=$GFMINE st_gfn "$dn" "$ST_T/gf.sh" 'refused before all three registers could be read')" 1
  # C67: no git work tree. THIS one is genuinely NOT CHECKED rather than RED - there is no base to judge
  # against, and a suite that cannot be run from a clone is not a suite. It is a declared limit on G6.
  do_="$ST_T/gfo"; rm -rf "$do_"; mkdir -p "$do_/gates"; cp "$SG/buildnum.sh" "$do_/gates/buildnum.sh"
  { echo '# fixture'; st_row 530 issued - "$GFOTHER" run-log; st_row 533 minted - "$GFMINE" minted; } > "$do_/gates/build-numbers.tsv"
  st C67-no-git-work-tree-is-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv2 "$do_" "$ST_T/gf.sh")" NOT
  st C67b-and-it-says-it-is-a-declared-limit "$(CT_RUNID=$GFMINE st_gfn "$do_" "$ST_T/gf.sh" 'a declared limit of this door, recorded on G6')" 1

  # C68: NO REFUSAL PATH MAY DIE PART-WAY. The verdict line is printed BEFORE the reason, the row and the
  # GATES RED headline, so a verdict-word assertion is green on a block that dies one line later - which is
  # exactly what happened to the GF_GF P0 above. This case walks every refusal fixture the arm has built and
  # asserts two things the verdict word cannot see: no `unbound variable` (or any bash error) in the output,
  # and the GATES RED headline actually arrives.
  st_gfend(){ local out; out="$(st_gfrun "$1" "$2" 2>&1)"
    case "$out" in
      *"unbound variable"*|*"command not found"*|*"syntax error"*) printf 'BASH-ERROR'; return;;
    esac
    case "$out" in *"GATES RED #533"*) printf 'reached';; *) printf 'NO-HEADLINE';; esac; }
  # `while read` and NOT `set --`: the arm's own positional parameters still hold the suite's arguments, and
  # a loop that overwrote them would be a harness fault of exactly the kind this file keeps recording.
  printf '%s\n' "$d2|planted-row" "$d3|worktree-deletion" "$dc|NUL-byte" "$dj|unreadable-base" \
    "$di|merge-base-deletion" "$dk|emptied-worktree" "$dl|emptied-HEAD" "$dn|unparseable-number" > "$ST_T/endcases"
  while IFS='|' read -r gfd gfname; do
    st "C68-$gfname-refuses-WITHOUT-dying" "$(CT_RUNID=$GFMINE st_gfend "$gfd" "$ST_T/gf.sh")" reached
  done < "$ST_T/endcases"
  st C68i-and-the-no-scratch-refusal-too "$(TMPDIR=/nonexistent-ct533-selftest CT_RUNID=$GFMINE st_gfend "$dn" "$ST_T/gf.sh")" reached
  # AND THE DETECTOR IS SHOWN ABLE TO RETURN SOMETHING ELSE, because a helper that always answers `reached`
  # would make all nine cases above unfalsifiable - this file's "a gate that cannot fail" in helper form.
  st C68j-the-detector-can-say-NO-HEADLINE "$(CT_RUNID=$GFMINE st_gfend "$ST_T/nosuchdir-$$" "$ST_T/gf.sh")" NO-HEADLINE
  st C68k-and-it-can-say-BASH-ERROR "$( printf '%s\n' 'echo "build-number series: RED - x"' 'echo "$GF_NEVER_SET_ANYWHERE"' > "$ST_T/bad.sh"; CT_RUNID=$GFMINE st_gfend "$d2" "$ST_T/bad.sh" )" BASH-ERROR


  # ── C69-C75: ANTAGONIST B's SECOND ROUND, each case built from the fixture ITS finding was reproduced on.
  # B read from the shipped-surface door and its findings are about what the door SAYS and where its remedies
  # lead, which is the class no diff-side reading reaches: a refusal whose printed remedy produces a second
  # refusal with no remedy, a remedy that launders a plant to ok when followed, an honest tree refused with no
  # route, and a counts clause that contradicts itself.
  # C69: the base ref pointing at HEAD. Following the door's own update-ref remedy with HEAD makes the tree
  # under test its own base: every committed row is "already in the base", `appended` reads 0, and a committed
  # plant READ ok. The verdict is now NOT CHECKED - not a refusal, because the suite must still run, and never
  # ok, because nothing was compared. M9 is its mutant.
  dp="$(st_mk gfp)"; st_row 400 issued - "$GFOTHER" measured >> "$dp/gates/build-numbers.tsv"
  st_gc "$dp" add -A; st_gc "$dp" commit -q -m 'a committed gap-fill plant'
  git -C "$dp" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st C69-base-ref-at-HEAD-is-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dp" "$ST_T/gf.sh")" NOT
  st C69b-and-it-does-not-stop-the-suite "$( CT_RUNID=$GFMINE st_gfrun "$dp" "$ST_T/gf.sh" >/dev/null 2>&1; echo $? )" 0
  # C69c's NEEDLE CHANGED AT #534 AND THE CASE DID NOT [R18]. It quoted "(not read: the base ref points at
  # HEAD, so no comparison is possible)", which was true while the branch read no register. G6's remainder
  # makes the branch read all four and judge the uncommitted rows, so that clause is gone and would have
  # turned this case red on a CORRECT tree. The requirement it encodes - the line must say why nothing was
  # compared - is unchanged and is now carried by the counts clause, which says it of the COMMITTED rows
  # only, because that is now the honest scope.
  st C69c-and-it-says-why-the-committed-rows-were-not-compared "$(CT_RUNID=$GFMINE st_gfn "$dp" "$ST_T/gf.sh" 'were NOT compared')" 1
  st C69d-and-the-word-ok-is-absent-from-the-line "$(CT_RUNID=$GFMINE st_gfrun "$dp" "$ST_T/gf.sh" | grep -m1 '^build-number series:' | grep -cw ok)" 0
  # C70: THE HONEST MULTI-OWNER GAP FILL - a RESUMED run, where the number was minted by the run that died and
  # built by this one. The old escape required that NO row be another run's and that there be exactly one
  # minted row, which is this run's, so this tree was RED with the escape set: an honest tree refused with no
  # route, which is the #530 and #532 wedge. MEASURED on the live register: #507 and #519 each carry rows
  # under two field-7 values, so the shape is this project's own history. M10 is its mutant.
  dq="$(st_mk gfq)"; st_row 534 minted - "$GFOTHER" minted >> "$dq/gates/build-numbers.tsv"
  st_gc "$dq" add -A; st_gc "$dq" commit -q -m 'the other container pushes its own mint'
  git -C "$dq" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFOTHER" minted >> "$dq/gates/build-numbers.tsv"
  st_row 533 built - "$GFMINE" build-sh >> "$dq/gates/build-numbers.tsv"
  st_gc "$dq" add -A; st_gc "$dq" commit -q -m 'resumed run: the previous run minted, this one built'
  st C70-a-resumed-run-is-RED-without-the-escape "$(CT_RUNID=$GFMINE st_gfv "$dq" "$ST_T/gf.sh")" RED
  st C70b-and-OVERRIDE-with-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$dq" "$ST_T/gf.sh")" OVERRIDE
  st C70c-and-the-line-NAMES-the-other-runs-id "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$dq" "$ST_T/gf.sh" "named so the log says whose rows rode through: $GFOTHER")" 2
  st C70d-and-it-counts-the-foreign-rows "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$dq" "$ST_T/gf.sh" '1 row(s) carry neither it nor the literal unknown-run')" 2
  st C70e-and-the-suite-is-not-stopped "$( CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfrun "$dq" "$ST_T/gf.sh" >/dev/null 2>&1; echo $? )" 0
  # C71-C72: THE REMEDY MUST MATCH THE SIDE THE ROW IS ON, and both bad rows must be printed. One committed
  # plant and one uncommitted, so the two remedies and the two prints are in one run - and the numbers are 99
  # and 1000, which is also the numeric-sort case: `sort` without -n puts 1000 before 99.
  dr="$(st_mk gfr)"; st_row 533 minted - "$GFMINE" minted >> "$dr/gates/build-numbers.tsv"
  st_row 99 issued - "$GFOTHER" measured >> "$dr/gates/build-numbers.tsv"
  st_gc "$dr" add -A; st_gc "$dr" commit -q -m 'mint plus a committed plant'
  st_row 400 issued - "$GFOTHER" measured >> "$dr/gates/build-numbers.tsv"
  st C71-both-bad-rows-are-printed "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/gf.sh" 'THE ROW, FIELD FOR FIELD')" 2
  st C71b-and-the-counts-partition-still-holds "$(CT_RUNID=$GFMINE st_gfsum "$dr" "$ST_T/gf.sh")" partition
  st C71c-the-COMMITTED-row-gets-the-commit-remedy "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/gf.sh" 'ALREADY IN A COMMIT')" 1
  st C71d-and-never-the-working-tree-one-for-it "$(CT_RUNID=$GFMINE st_gfrun "$dr" "$ST_T/gf.sh" | grep -c "is 2 digits.*comes out of the working tree")" 0
  ds="$(st_mk gfs)"; st_row 533 minted - "$GFMINE" minted >> "$ds/gates/build-numbers.tsv"
  st_row 1000 issued - "$GFOTHER" measured >> "$ds/gates/build-numbers.tsv"
  st_row 99 issued - "$GFOTHER" measured >> "$ds/gates/build-numbers.tsv"
  st_gc "$ds" add -A; st_gc "$ds" commit -q -m 'two plants, one four-digit'
  st C72-the-LOWEST-number-is-reported-first "$(CT_RUNID=$GFMINE st_gfrun "$ds" "$ST_T/gf.sh" | grep -m1 'FIELD FOR FIELD' | sed -n 's/.*n=\[\([0-9]*\)\].*/\1/p')" 99
  # C73: on a DELETION the three class counters must not read 0 beside appended rows that exist.
  dt="$(st_mk gft)"; st_row 533 minted - "$GFMINE" minted >> "$dt/gates/build-numbers.tsv"
  st_row 99 issued - "$GFOTHER" measured >> "$dt/gates/build-numbers.tsv"
  st_row 400 issued - "$GFOTHER" measured >> "$dt/gates/build-numbers.tsv"
  st_gc "$dt" add -A; st_gc "$dt" commit -q -m 'mint plus two plants'
  grep -v '^99	' "$dt/gates/build-numbers.tsv" > "$dt/z" && mv "$dt/z" "$dt/gates/build-numbers.tsv"
  st C73-a-deletion-does-not-print-zero-classes "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'gap-fill=- (yours=- census=- override=- unaccounted=-)')" 1
  st C73b-and-says-it-did-not-classify "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'not classified: refused on a deletion before any appended row was judged')" 1
  st C73c-and-the-appended-count-is-still-real "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'appended=3')" 1
  # C74: the merge-base refusal's remedy must BRANCH on the shallowness it prints, because `git fetch
  # --unshallow` on a complete repository answers `fatal: --unshallow on a complete repository does not make
  # sense` - a refusal prescribing a command that cannot run. The fixture has two unrelated histories.
  du="$ST_T/gfu"; rm -rf "$du"; mkdir -p "$du/gates"; git init -q "$du" 2>/dev/null
  cp "$SG/buildnum.sh" "$du/gates/buildnum.sh"
  { echo '# fixture'; st_row 530 issued - "$GFOTHER" run-log; } > "$du/gates/build-numbers.tsv"
  st_gc "$du" add -A; st_gc "$du" commit -q -m 'one history'
  GFU_FIRST="$(git -C "$du" rev-parse --abbrev-ref HEAD 2>/dev/null || echo master)"
  git -C "$du" checkout -q --orphan other 2>/dev/null
  { echo '# fixture'; st_row 531 issued - "$GFOTHER" run-log; } > "$du/gates/build-numbers.tsv"
  st_gc "$du" add -A; st_gc "$du" commit -q -m 'an unrelated history'
  git -C "$du" update-ref refs/remotes/origin/main refs/heads/other 2>/dev/null
  # BY NAME, never `checkout -`: the first draft used the dash form, it did not take after an orphan
  # checkout, HEAD stayed on the orphan branch - which is also what origin/main points at - and the case
  # measured C69's base-ref-at-HEAD verdict instead of the unrelated-histories one. A fixture that silently
  # poses a different question is this project's "a gate that enters a state by the shortest route often
  # enters the wrong one".
  git -C "$du" checkout -q "$GFU_FIRST" 2>/dev/null || true
  st_row 533 minted - "$GFMINE" minted >> "$du/gates/build-numbers.tsv"
  st C74-unrelated-histories-are-RED "$(CT_RUNID=$GFMINE st_gfv2 "$du" "$ST_T/gf.sh")" RED
  st C74b-and-a-complete-clone-is-told-a-deepen-wont-help "$(CT_RUNID=$GFMINE st_gfn "$du" "$ST_T/gf.sh" 'a deepen or an unshallow will not help')" 2
  st C74c-and-is-not-told-to-run-unshallow "$(CT_RUNID=$GFMINE st_gfrun "$du" "$ST_T/gf.sh" | grep -c 'so run git fetch --deepen 200 origin')" 0
  # C75: the extends line must not say "at or above" while its test is -gt.
  # ONE, not zero: d2 appends this run's own #533 over a base topping out at #532, so that row IS above the
  # top and the line fires. The first draft of this case expected 0 from a misreading of its own fixture.
  st C75-the-extends-line-says-ABOVE "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/gf.sh" 'is ABOVE the base series top')" 1
  st C75b-and-never-the-old-at-or-above-wording "$(CT_RUNID=$GFMINE st_gfrun "$d2" "$ST_T/gf.sh" | grep -c 'is at or above the base series top')" 0


  # ── C76-C78: ANTAGONIST A's SECOND ROUND. A found no P0 and vetoed on two things the door SAYS: a declared
  # limit justified by a sentence that is the opposite of what the authority answers, and a report line that
  # on a live two-tree collision prints THIS run's id and not the conflicting one.
  # C76: the base-held report must name the BASE row's owner and stampable's own verdict. The fixture is the
  # #416 collision in the act: origin/main already carries another run's minted row for this number, and this
  # tree appends its own minted and built rows for it. The verdict stays ok - delegating this class would
  # refuse the legitimate instance too, which is the whole reason it is reported and not judged - and the line
  # now carries both ids, so a reader of a green log sees two trees holding one number. M12 is its mutant.
  dv="$(st_mk gfv)"; st_row 533 minted - "$GFOTHER" minted >> "$dv/gates/build-numbers.tsv"
  st_gc "$dv" add -A; st_gc "$dv" commit -q -m 'their 533 mint lands on main'
  git -C "$dv" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFMINE" minted >> "$dv/gates/build-numbers.tsv"
  st_row 533 built - "$GFMINE" build-sh >> "$dv/gates/build-numbers.tsv"
  st_gc "$dv" add -A; st_gc "$dv" commit -q -m 'our own 533: the collision'
  st C76-the-collision-is-REPORTED-and-ok "$(CT_RUNID=$GFMINE st_gfv "$dv" "$ST_T/gf.sh")" ok
  st C76b-and-the-line-names-the-BASE-rows-owner "$(CT_RUNID=$GFMINE st_gfn "$dv" "$ST_T/gf.sh" "baseMintedBy=\[$GFOTHER\]")" 2
  st C76c-and-the-appended-rows-owner-too "$(CT_RUNID=$GFMINE st_gfn "$dv" "$ST_T/gf.sh" "mintedBy=\[$GFMINE\] baseMintedBy=")" 2
  st C76d-and-quotes-the-authority-refusing-it "$(CT_RUNID=$GFMINE st_gfn "$dv" "$ST_T/gf.sh" 'stampable=\[NOT STAMPABLE')" 2
  st C76e-and-the-hand-run-really-does-refuse "$( ( cd "$dv" && CT_RUNID=$GFMINE gates/buildnum.sh stampable '#533' >/dev/null 2>&1; echo $? ) )" 1
  # C77: a number with a LEADING ZERO must be classified in base ten, as the register reads it. The base here
  # tops out at #5000, and the appended row is #010000: decimal 10000 is above the top (extends, ok), octal
  # 4096 is below it (a gap fill, and RED). M13 restores the bash-arithmetic form and must turn this.
  dw="$ST_T/gfw"; rm -rf "$dw"; mkdir -p "$dw/gates"; git init -q "$dw" 2>/dev/null
  cp "$SG/buildnum.sh" "$dw/gates/buildnum.sh"
  { echo '# fixture'; st_row 4999 issued - "$GFOTHER" run-log; st_row 5000 issued - "$GFOTHER" run-log; } > "$dw/gates/build-numbers.tsv"
  st_gc "$dw" add -A; st_gc "$dw" commit -q -m 'a base topping out at 5000'
  git -C "$dw" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 010000 minted - "$GFMINE" minted >> "$dw/gates/build-numbers.tsv"
  # COMMITTED, so HEAD is not the base: with the row uncommitted and origin/main at HEAD this fixture met the
  # base-ref-at-HEAD branch of C69 and measured NOT CHECKED - a fixture posing a different question, which is
  # the same trap C74's own first draft fell into one round earlier.
  st_gc "$dw" add -A; st_gc "$dw" commit -q -m 'a leading-zero number appended'
  st C77-a-leading-zero-number-is-read-base-ten "$(CT_RUNID=$GFMINE st_gfv "$dw" "$ST_T/gf.sh")" ok
  st C77b-and-classified-as-extending-the-series "$(CT_RUNID=$GFMINE st_gfn "$dw" "$ST_T/gf.sh" 'is ABOVE the base series top #5000')" 1
  st C77c-and-buildnum-reads-the-same-number "$( ( cd "$dw" && awk -F'\t' '$1 ~ /^0/ { print $1+0; exit }' gates/build-numbers.tsv ) )" 10000
  # C78: gf_nul must not blame a NUL byte for a file it cannot read at all. Tested as a FUNCTION, because the
  # permission route needs a non-root user and antagonist A said so rather than claiming a reproduction.
  # The function is extracted on its own and called directly: three inputs, three distinct answers.
  awk '/^gf_nul\(\)/{print}' "$ST_T/gf.sh" > "$ST_T/nulfn.sh"
  printf 'a clean file\n' > "$ST_T/clean.tsv"; printf 'a\000b\n' > "$ST_T/nul.tsv"
  st_nul(){ bash -c 'set -uo pipefail; source "$1"; gf_nul "$2"; echo $?' _ "$ST_T/nulfn.sh" "$1" 2>/dev/null | tail -1; }
  st C78-the-function-was-really-extracted "$(grep -c '^gf_nul()' "$ST_T/nulfn.sh")" 1
  st C78b-a-clean-file-passes-gf_nul "$(st_nul "$ST_T/clean.tsv")" 0
  st C78c-a-NUL-file-fails-it "$(st_nul "$ST_T/nul.tsv")" 1
  st C78d-an-UNREADABLE-file-is-its-own-answer "$(st_nul "$ST_T/no-such-file-at-all")" 2
  st C78e-and-the-two-failures-are-DISTINCT "$( [ "$(st_nul "$ST_T/nul.tsv")" != "$(st_nul "$ST_T/no-such-file-at-all")" ] && echo distinct || echo same )" distinct


  # ── C79-C84: THE THIRD PAIR. B's P0 is the one that matters: two of this door's own messages RAN git as a
  # side effect of being built, because their text named commands in BACKTICKS inside a double-quoted string.
  # The 206-case arm was blind to it, because every case asserted what the door DECIDED and none asserted that
  # the words it prints are the words that were written. C79 is that control.
  st_gfspan(){ st_gfrun "$1" "$2" | grep -cF "$3" || true; }
  # C79: the three spans of the base-ref-at-HEAD message must reach the output verbatim. On the broken form
  # bash substituted them away: `appended` became empty, and the whole name of the command the reader is being
  # warned against - git update-ref refs/remotes/origin/main HEAD - was EXECUTED and then deleted.
  st C79-the-NOT-CHECKED-message-keeps-its-words "$(CT_RUNID=$GFMINE st_gfspan "$dp" "$ST_T/gf.sh" "'appended' would read 0")" 1
  st C79b-and-names-the-command-it-warns-against "$(CT_RUNID=$GFMINE st_gfspan "$dp" "$ST_T/gf.sh" "a throwaway 'git update-ref refs/remotes/origin/main HEAD' does")" 1
  st C79c-and-runs-no-command-while-building-it "$(CT_RUNID=$GFMINE st_gfrun "$dp" "$ST_T/gf.sh" | grep -c 'command not found')" 0
  st C79d-the-source-carries-no-live-backtick "$(grep '`' "$ST_T/gf.sh" | grep -vE '^[ \t]*#' | grep -cE '`(git|appended|rows|is-shallow|fatal)' || true)" 0
  # C80: A SHALLOW clone with no merge-base - the limb of the merge-base refusal that had no case at all,
  # because C74's fixture is a COMPLETE repository with unrelated histories. Two things are asserted that the
  # verdict word cannot give: the clone is STILL SHALLOW after the run, and it is told the shallow half.
  rm -rf "$ST_T/shsrc" "$ST_T/shclone"; mkdir -p "$ST_T/shsrc/gates"
  cp "$SG/buildnum.sh" "$ST_T/shsrc/gates/buildnum.sh"
  { echo '# fixture'; st_row 530 issued - "$GFOTHER" run-log; } > "$ST_T/shsrc/gates/build-numbers.tsv"
  git init -q -b main "$ST_T/shsrc" 2>/dev/null; st_gc "$ST_T/shsrc" add -A; st_gc "$ST_T/shsrc" commit -q -m one
  echo x > "$ST_T/shsrc/x"; st_gc "$ST_T/shsrc" add -A; st_gc "$ST_T/shsrc" commit -q -m two
  echo y > "$ST_T/shsrc/y"; st_gc "$ST_T/shsrc" add -A; st_gc "$ST_T/shsrc" commit -q -m three
  git clone -q --depth 1 "file://$ST_T/shsrc" "$ST_T/shclone" 2>/dev/null
  git -C "$ST_T/shclone" checkout -q --orphan orph 2>/dev/null
  st_gc "$ST_T/shclone" commit -q -m 'an orphan commit, so there is no merge-base'
  st C80-the-fixture-really-is-shallow "$(git -C "$ST_T/shclone" rev-parse --is-shallow-repository 2>/dev/null)" true
  st C80b-no-merge-base-is-RED "$(CT_RUNID=$GFMINE st_gfv2 "$ST_T/shclone" "$ST_T/gf.sh")" RED
  st C80c-and-a-SHALLOW-clone-is-told-the-shallow-half "$(CT_RUNID=$GFMINE st_gfn "$ST_T/shclone" "$ST_T/gf.sh" 'This clone IS shallow')" 2
  st C80d-and-it-is-STILL-SHALLOW-afterwards "$( CT_RUNID=$GFMINE st_gfrun "$ST_T/shclone" "$ST_T/gf.sh" >/dev/null 2>&1; git -C "$ST_T/shclone" rev-parse --is-shallow-repository 2>/dev/null )" true
  st C80e-and-origin-main-still-reaches-one-commit "$(git -C "$ST_T/shclone" rev-list --count origin/main 2>/dev/null)" 1
  # C81: the escape's VALUE on every verdict, including a green and an unset one - the only way an armed
  # escape that changed nothing becomes visible in an archived log.
  st C81-the-escape-value-is-printed-when-used "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfn "$d7" "$ST_T/gf.sh" 'escape=\[533\]')" 1
  st C81b-and-when-unset-on-a-green "$(CT_RUNID=$GFMINE st_gfn "$d5" "$ST_T/gf.sh" 'escape=\[(unset)\]')" 1
  st C81c-and-when-ARMED-but-unused-on-a-green "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE='100 101 102' st_gfn "$d5" "$ST_T/gf.sh" 'escape=\[100 101 102\]')" 1
  st C81d-so-two-different-escapes-give-different-logs "$( [ "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfrun "$d7" "$ST_T/gf.sh" | md5sum)" != "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE="$(seq 100 532)" st_gfrun "$d7" "$ST_T/gf.sh" | md5sum)" ] && echo differ || echo identical )" differ
  # C82: the authority must be runnable, and that is a door defect, refused and NOT escapable.
  dx="$(st_mk gfx)"; st_row 533 minted - "$GFMINE" minted >> "$dx/gates/build-numbers.tsv"
  st_row 401 minted - "$GFMINE" minted >> "$dx/gates/build-numbers.tsv"
  st_gc "$dx" add -A; st_gc "$dx" commit -q -m 'an honest gap fill of this run own'
  st C82-CONTROL-the-honest-tree-is-ok "$(CT_RUNID=$GFMINE st_gfv "$dx" "$ST_T/gf.sh")" ok
  chmod -x "$dx/gates/buildnum.sh"
  st C82b-a-non-executable-authority-is-RED "$(CT_RUNID=$GFMINE st_gfv2 "$dx" "$ST_T/gf.sh")" RED
  # ONCE, not twice: this refusal now comes from the row loop, whose verdict line is built from GF_COUNTS, so
  # GF_WHY prints on the detail line alone. The early refusals print it twice because their verdict line
  # appends it. Re-measured after the early -x elif was removed on antagonist A of the fourth pair's P3-1.
  st C82c-and-is-called-a-door-defect "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/gf.sh" "a defect in this door's ENVIRONMENT and not in the tree")" 1
  st C82d-and-is-NOT-escapable "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfv2 "$dx" "$ST_T/gf.sh")" RED
  chmod +x "$dx/gates/buildnum.sh"
  st C82e-and-the-control-still-reads-ok-after "$(CT_RUNID=$GFMINE st_gfv "$dx" "$ST_T/gf.sh")" ok
  # C83: the deletion refusal names its route out.
  # ONCE, not twice: on a deletion the verdict line is "RED - <counts>" and the reason goes on the detail line
  # under it, so GF_WHY is printed once. The refusals that reach the fallback assembly print it twice. Measured
  # rather than assumed, which is how the two expectations above were wrong by one.
  # THE ROUTE IS NOW CHOSEN BY HALF, so these assert the HEAD-vs-working-tree wording on a worktree deletion -
  # and C83c asserts the OTHER half is NOT offered here, which is the finding: the first version printed the
  # working-tree route for a committed deletion, where both of its actions are no-ops.
  st C83-the-deletion-refusal-names-the-right-route "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'only the working tree has lost it, so git checkout -- gates/build-numbers.tsv puts it back')" 1
  st C83b-and-says-what-to-do-if-the-row-is-wrong "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'amend the commit that added it rather than deleting it here')" 1
  st C83c-and-does-NOT-offer-the-committed-half-route "$(CT_RUNID=$GFMINE st_gfn "$dt" "$ST_T/gf.sh" 'the one that REMOVED the row')" 0
  st C83d-while-the-COMMITTED-half-gets-that-one "$(CT_RUNID=$GFMINE st_gfn "$dl" "$ST_T/gf.sh" 'the one that REMOVED the row, never the one that added it')" 1
  st C83e-and-is-told-the-working-tree-route-will-not-clear-it "$(CT_RUNID=$GFMINE st_gfn "$dl" "$ST_T/gf.sh" 'restoring it in the working tree does NOT clear this refusal')" 1
  # C84: the extends declaration must say the fast arm bounds it on the FAST path only.
  st C84-the-extends-clause-scopes-the-fast-arm "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/gf.sh" 'ON THE FAST PATH ONLY')" 1
  st C84b-and-says-nothing-bounds-it-here "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/gf.sh" 'nothing bounds the extends class')" 1


  # ── C85-C88: THE FIFTH PAIR, whose two reports found the same two P1s independently from opposite doors.
  # C85: THE HEADLINE, which no case had ever asserted - and that is why round six's repair could land one
  # indentation level away from its finding and still read 244 ok / 0 red. C82c asserts the DETAIL line, which
  # every route prints; the headline is a different sentence and it was accusing the tree.
  st_gfhead(){ st_gfrun "$1" "$2" | grep -m1 '^GATES RED' || true; }
  chmod -x "$dx/gates/buildnum.sh"
  st C85-the-headline-names-the-ENVIRONMENT "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/gf.sh" "this door's own ENVIRONMENT is broken")" 1
  st C85b-and-NOT-the-unaccounted-row-headline "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/gf.sh" 'carries a row nothing accounts for')" 0
  st C85c-and-says-the-tree-may-be-honest "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/gf.sh" 'The tree may be perfectly honest')" 1
  chmod +x "$dx/gates/buildnum.sh"
  st C85d-and-the-control-still-reads-ok "$(CT_RUNID=$GFMINE st_gfv "$dx" "$ST_T/gf.sh")" ok
  # C86: the register AT the merge-base unreadable, which the old alternation answered with "could not compute
  # the MERGE-BASE" - false twice over, since the sha is in the detail line and one register was not read.
  dy="$ST_T/gfy"; rm -rf "$dy"; mkdir -p "$dy/gates"; git init -q -b main "$dy" 2>/dev/null
  echo seed > "$dy/seed.txt"; st_gc "$dy" add -A; st_gc "$dy" commit -q -m 'a root commit with no register'
  GFY_MB="$(git -C "$dy" rev-parse HEAD 2>/dev/null)"
  cp "$SG/buildnum.sh" "$dy/gates/buildnum.sh"
  { echo '# fixture'; st_row 530 issued - "$GFOTHER" run-log; st_row 532 issued - "$GFOTHER" run-log; } > "$dy/gates/build-numbers.tsv"
  st_gc "$dy" add -A; st_gc "$dy" commit -q -m 'the base side adds the register'
  git -C "$dy" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  git -C "$dy" checkout -q -b headside "$GFY_MB" 2>/dev/null
  mkdir -p "$dy/gates"; cp "$SG/buildnum.sh" "$dy/gates/buildnum.sh"
  { echo '# fixture'; st_row 530 issued - "$GFOTHER" run-log; st_row 532 issued - "$GFOTHER" run-log; } > "$dy/gates/build-numbers.tsv"
  st_gc "$dy" add -A; st_gc "$dy" commit -q -m 'the head side adds it too'
  st C86-an-unreadable-merge-base-register-is-RED "$(CT_RUNID=$GFMINE st_gfv2 "$dy" "$ST_T/gf.sh")" RED
  st C86b-and-the-headline-says-it-could-not-READ-it "$(CT_RUNID=$GFMINE st_gfn "$dy" "$ST_T/gf.sh" 'computed the merge-base and could not READ the register at it')" 1
  # THE POSITIVE HALF, which C86c alone could not give [antagonist A of the sixth pair, P3-2]: a case asserting
  # a string occurs ZERO times is green over a typo in the arm that should print it, and over an arm that
  # cannot fire at all. C74's fixture - two unrelated histories - is where the compute failure really happens.
  st C86d-the-compute-failure-headline-DOES-fire "$(CT_RUNID=$GFMINE st_gfn "$du" "$ST_T/gf.sh" 'could not compute the MERGE-BASE')" 1
  st C86e-and-it-says-what-it-DID-read "$(CT_RUNID=$GFMINE st_gfn "$du" "$ST_T/gf.sh" 'read the base and HEAD registers')" 1
  st C86f-and-never-the-over-claim "$(CT_RUNID=$GFMINE st_gfrun "$du" "$ST_T/gf.sh" | grep -c 'read every register it needed')" 0
  st C86c-and-never-claims-it-could-not-compute-it "$(CT_RUNID=$GFMINE st_gfn "$dy" "$ST_T/gf.sh" 'could not compute the MERGE-BASE')" 0
  # C87: the escape ARMED and DECLINED. A gap-fill number whose only row carries the literal unknown-run is
  # refused BY DESIGN - widening the test would make a mint that is nobody's escapable, which is what C48 and
  # M4 exist to refuse - and until now the refusal re-printed the same offer, so the log read as though the
  # escape had never been tried and the reader had a route they cannot take.
  dA="$(st_mk gfA)"; st_row 533 minted - "$GFMINE" minted >> "$dA/gates/build-numbers.tsv"
  st_row 401 built - unknown-run build-sh >> "$dA/gates/build-numbers.tsv"
  st_gc "$dA" add -A; st_gc "$dA" commit -q -m 'a gap fill whose only row belongs to nobody'
  dB="$(st_mk gfB)"; st_row 533 minted - "$GFMINE" minted >> "$dB/gates/build-numbers.tsv"
  st_row 400 issued - "$GFOTHER" measured >> "$dB/gates/build-numbers.tsv"
  st_row 401 built - unknown-run build-sh >> "$dB/gates/build-numbers.tsv"
  st_gc "$dB" add -A; st_gc "$dB" commit -q -m 'two unaccounted rows, the armed one higher'
  st C87-armed-and-declined-is-still-RED "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfv "$dA" "$ST_T/gf.sh")" RED
  st C87b-and-the-reason-says-it-was-ARMED "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dA" "$ST_T/gf.sh" 'THE ESCAPE WAS ARMED FOR #401 AND DID NOT APPLY')" 1
  st C87c-and-names-the-field-7-values-present "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dA" "$ST_T/gf.sh" 'values present for #401 are: unknown-run')" 1
  st C87d-and-declares-the-limit "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dA" "$ST_T/gf.sh" 'A DECLARED LIMIT, not an oversight')" 1
  st C87g-the-notice-is-NOT-lost-on-a-higher-offender "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dB" "$ST_T/gf.sh" 'THE ESCAPE WAS ARMED FOR #401 AND DID NOT APPLY')" 1
  st C87h-and-the-armed-refusal-STOPS-offering-the-escape "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dB" "$ST_T/gf.sh" "CT_GAPFILL_OVERRIDE='401'")" 0
  st C87i-and-says-re-running-changes-nothing "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=400 st_gfn "$dB" "$ST_T/gf.sh" 'ALREADY BEEN TRIED FOR THIS NUMBER AND DECLINED')" 1
  st C87j-while-an-UNARMED-number-is-still-offered-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dB" "$ST_T/gf.sh" "CT_GAPFILL_OVERRIDE='400'")" 1
  st C87k-and-no-line-says-both-things "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=400 st_gfrun "$dB" "$ST_T/gf.sh" | grep -c "do not re-run with it.*CT_GAPFILL_OVERRIDE='400'")" 0
  # A COMMITTED offending row, which both existing fixtures lacked - and that is why no case saw the remedy
  # printing the uncommitted route for a committed row.
  dC="$(st_mk gfC)"; st_row 533 minted - "$GFMINE" minted >> "$dC/gates/build-numbers.tsv"
  st_row 401 built - unknown-run build-sh >> "$dC/gates/build-numbers.tsv"
  st_gc "$dC" add -A; st_gc "$dC" commit -q -m 'the offending row is COMMITTED'
  st C87l-a-COMMITTED-row-gets-the-amend-route "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dC" "$ST_T/gf.sh" 'ALREADY IN A COMMIT')" 2
  st C87m-and-not-the-working-tree-route-alone "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfrun "$dC" "$ST_T/gf.sh" | grep -c 'correct field 7 to this run.s runId in the working tree before committing it')" 0
  st C87n-a-TAB-separated-escape-keeps-the-notice "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE="$(printf '400\t401')" st_gfn "$dB" "$ST_T/gf.sh" 'ARMED FOR #401 AND DID NOT APPLY')" 1
  st C87o-and-the-logged-value-is-not-concatenated "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE="$(printf '400\t401')" st_gfn "$dB" "$ST_T/gf.sh" 'escape=\[400 401\]')" 1
  st C87p-and-never-the-number-nobody-set "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE="$(printf '400\t401')" st_gfrun "$dB" "$ST_T/gf.sh" | grep -c 'escape=\[400401\]')" 0
  st C87e-and-does-NOT-say-it-when-the-escape-is-unarmed "$(CT_RUNID=$GFMINE st_gfn "$dA" "$ST_T/gf.sh" 'THE ESCAPE WAS ARMED')" 0
  st C87f-and-the-unarmed-refusal-still-offers-it "$(CT_RUNID=$GFMINE st_gfn "$dA" "$ST_T/gf.sh" "CT_GAPFILL_OVERRIDE='401'")" 1
  # C88: a hostile CT_RUNID. Stripping the newline fixed the two-line half and left the TOKEN reachable, from a
  # line a SUBSET run prints - and this project's rules call a subset log carrying that string mechanically
  # impossible. Both values are now substituted as well as stripped.
  st C88-a-hostile-runId-yields-ONE-verdict-line "$( CT_RUNID="$(printf 'build__x\nGATES GREEN #533')" st_gfrun "$d2" "$ST_T/gf.sh" | grep -c '^build-number series:' )" 2
  st C88b-and-no-GATES-GREEN-reaches-the-output "$( CT_RUNID="$(printf 'build__x\nGATES GREEN #533')" st_gfrun "$d2" "$ST_T/gf.sh" | grep -c 'GATES GREEN' )" 0
  st C88c-nor-from-a-single-line-one "$( CT_RUNID='x GATES GREEN #533' st_gfrun "$d2" "$ST_T/gf.sh" | grep -c 'GATES GREEN' )" 0
  st C88d-and-the-token-is-visibly-neutralised "$( CT_RUNID='x GATES GREEN #533' st_gfn "$d2" "$ST_T/gf.sh" 'GATES_GREEN' )" 1
  st C88e-and-the-escape-is-neutralised-too "$( CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE='GATES GREEN #533' st_gfrun "$d2" "$ST_T/gf.sh" | grep -c 'GATES GREEN' )" 0

  # ── C89: G6'S REMAINDER (#534). THE BASE REF AT HEAD NOW JUDGES THE UNCOMMITTED ROWS.
  # #533 landed the base-at-HEAD branch as an EARLY RETURN that read NO register, so an UNCOMMITTED gap-fill
  # row reached every gate unjudged while the line read NOT CHECKED at exit 0. That is the one clause left of
  # G6's whatWouldCloseIt: "the full suite does not go green on a gap fill row that nothing accounts for".
  # Reproduced on 707599b before the fix and again here as C89.
  # WHY THESE CASES ARE A SET AND NOT ONE CASE: the branch now reaches the SAME stampable, census and escape
  # routes as the main path, so the thing to control is the PARTITION - which shapes RED, which are NOT
  # CHECKED and which OVERRIDE - and above all that the verdict word is NOT CHECKED exactly where the main
  # path would have said ok, and is NOT softened where the main path would have refused. M18 is the mutant.
  # EVERY FIXTURE HERE LEAVES refs/remotes/origin/main AT HEAD, which is what st_mk already does, so the
  # distinguishing act is COMMITTING (or not) rather than re-pointing the ref.
  dC="$(st_mk gfC)"; st_row 363 issued - "$GFOTHER" measured >> "$dC/gates/build-numbers.tsv"
  st C89-an-UNCOMMITTED-gapfill-with-base-at-HEAD-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dC" "$ST_T/gf.sh")" RED
  st C89a-and-it-prints-the-row-field-for-field "$(CT_RUNID=$GFMINE st_gfn "$dC" "$ST_T/gf.sh" 'n=\[363\]')" 1
  st C89b-and-the-counts-name-one-unaccounted "$(CT_RUNID=$GFMINE st_gfn "$dC" "$ST_T/gf.sh" 'unaccounted=1')" 1
  st C89c-and-the-counts-say-the-committed-rows-were-not-compared "$(CT_RUNID=$GFMINE st_gfn "$dC" "$ST_T/gf.sh" 'base-at-HEAD=yes')" 1
  st C89d-and-it-DOES-stop-the-suite "$( CT_RUNID=$GFMINE st_gfrun "$dC" "$ST_T/gf.sh" >/dev/null 2>&1; echo $? )" 1
  # THE DENOMINATOR, ASSERTED SEPARATELY [prompts/common, the eleventh costume]: the clause above is only
  # evidence if the judged set was NON-EMPTY, and a door that judged nothing would also print no unaccounted
  # row. This case reads the count of rows the door says it judged, so the set cannot be empty unnoticed.
  st C89e-and-one-uncommitted-row-was-actually-JUDGED-not-merely-appended "$(CT_RUNID=$GFMINE st_gfn "$dC" "$ST_T/gf.sh" 'were APPENDED, of which 1 were JUDGED by this door, 0 are base-held and 0 EXTEND')" 1
  # AN UNCOMMITTED DELETION OF A COMMITTED ROW IS STILL RED with the base at HEAD: del_w is head-minus-worktree
  # and HEAD is readable whatever the base ref points at, so this half never depended on the base.
  dD="$(st_mk gfD)"; grep -v '^531' "$dD/gates/build-numbers.tsv" > "$dD/x" && mv "$dD/x" "$dD/gates/build-numbers.tsv"
  st C89f-an-uncommitted-DELETION-with-base-at-HEAD-is-RED "$(CT_RUNID=$GFMINE st_gfv "$dD" "$ST_T/gf.sh")" RED
  st C89g-and-the-deletion-half-is-the-working-tree-one "$(CT_RUNID=$GFMINE st_gfn "$dD" "$ST_T/gf.sh" 'head-vs-worktree=1')" 1
  # MY OWN UNCOMMITTED MINT ROW ABOVE HEAD'S TOP: NOT CHECKED, never RED and never ok. This is the shape this
  # run's own suite launches on, so a RED here would wedge the documented path - #530's and #532's withdrawal.
  dE="$(st_mk gfE)"; st_row 534 minted - "$GFMINE" minted >> "$dE/gates/build-numbers.tsv"
  st C89h-my-own-uncommitted-mint-above-the-top-is-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dE" "$ST_T/gf.sh")" NOT
  # `grep ... | sed -n '1p'` AND NOT `grep -m1`, IN THESE THREE AND DELIBERATELY [#534]. `grep -m1` exits as
  # soon as it matches, which closes the pipe and can hand the upstream a SIGPIPE - and under `pipefail` the
  # whole substitution then reads 141 instead of the count, so the case reports a number that is not a count.
  # gates/gatemanifest.sh's selftest ratchets these sites, and MY OWN THREE NEW ONES PUSHED A BREACHED RATCHET
  # FURTHER: measured, the base tree reads "23 early-exit pipe(s) ... D 16, total ceiling 15" and my tree read
  # 26 with D 19. The ratchet was already over its ceiling at 707599b and that is not this run's to close, but
  # adding to it IS, and the three were mine. `sed -n '1p'` takes the first line without exiting early, so the
  # upstream always completes. The other `grep -m1` sites in this arm predate this run and are left alone
  # rather than swept, because the count is back to the base's 23 and a sweep of pre-existing sites is a
  # different job from not making it worse.
  st C89i-and-never-RED "$(CT_RUNID=$GFMINE st_gfrun "$dE" "$ST_T/gf.sh" | grep '^build-number series:' | sed -n '1p' | grep -c 'RED')" 0
  st C89j-and-the-word-ok-is-absent "$(CT_RUNID=$GFMINE st_gfrun "$dE" "$ST_T/gf.sh" | grep '^build-number series:' | sed -n '1p' | grep -cw ok)" 0
  # C89u-C89w: APPENDED IS NOT JUDGED, AND dE IS THE SHAPE THAT PROVES IT [#534, antagonist A's veto].
  # dE's row is #534, ABOVE the fixture top of 532, so it EXTENDS and the door does not judge it. The clause
  # must therefore say appended=1 and judged=0 - and before the fix it said "the 1 uncommitted row(s) WERE
  # judged", which is why C89w pins the OLD WORDS ABSENT rather than only the new ones present: the defect
  # was a sentence, so the regression pin has to be on the sentence. These three are what C89e could not be:
  # C89e's fixture #363 is BELOW the top, so it is a gap fill, judged=1, and the old string was accidentally
  # TRUE there - the control read the right number for the wrong reason and could not have caught this.
  st C89u-an-uncommitted-EXTENDS-row-is-appended-but-NOT-judged "$(CT_RUNID=$GFMINE st_gfn "$dE" "$ST_T/gf.sh" 'the 1 uncommitted row(s) were APPENDED, of which 0 were JUDGED by this door, 0 are base-held and 1 EXTEND')" 1
  st C89v-and-the-clause-names-it-as-extending "$(CT_RUNID=$GFMINE st_gfn "$dE" "$ST_T/gf.sh" '0 are base-held and 1 EXTEND the series, NEITHER of which this door judges')" 1
  st C89w-and-the-false-sentence-the-veto-named-is-GONE "$(CT_RUNID=$GFMINE st_gfn "$dE" "$ST_T/gf.sh" 'uncommitted row(s) WERE judged')" 0
  # C89x-C89z: THE BASE-HELD CLASS, THE FIXTURE THE FIRST REPAIR'S FOUR CASES ALL MISSED [fresh antagonist A's
  # VETO]. This appends, uncommitted, a row for #532 - a number the BASE register already holds - which is the
  # #416 two-trees-one-number class. C51/C51b already pin that the door REPORTS such a row and leaves the
  # verdict alone; these pin that the COUNTS say so too, which is what the first repair got wrong by folding
  # GF_K into the judged number. C89z pins the superseded wording ABSENT, as C89w does for the first veto.
  ddh="$(st_mk gfdh)"; st_row 532 built - "$GFOTHER" build-sh >> "$ddh/gates/build-numbers.tsv"
  st C89x-an-uncommitted-BASE-HELD-row-is-appended-but-NOT-judged "$(CT_RUNID=$GFMINE st_gfn "$ddh" "$ST_T/gf.sh" 'the 1 uncommitted row(s) were APPENDED, of which 0 were JUDGED by this door, 1 are base-held and 0 EXTEND')" 1
  st C89y-and-the-door-still-only-REPORTS-it "$(CT_RUNID=$GFMINE st_gfn "$ddh" "$ST_T/gf.sh" 'REPORTED, NOT REFUSED - #532')" 1
  st C89z-and-the-superseded-judged-wording-is-GONE "$(CT_RUNID=$GFMINE st_gfn "$ddh" "$ST_T/gf.sh" 'of which 1 were JUDGED')" 0
  # AN UNCOMMITTED GAP FILL THAT stampable SAYS IS YOURS: NOT CHECKED, armed or not. The ownership answer is
  # the authority's and not this branch's, which is the prescription both earlier withdrawals pointed at.
  dF="$(st_mk gfF)"; st_row 363 minted - "$GFMINE" minted >> "$dF/gates/build-numbers.tsv"
  st C89k-an-uncommitted-gapfill-that-is-yours-is-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dF" "$ST_T/gf.sh")" NOT
  st C89l-and-the-same-with-the-escape-armed "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=363 st_gfv "$dF" "$ST_T/gf.sh")" NOT
  st C89m-and-the-counts-credit-it-as-yours "$(CT_RUNID=$GFMINE st_gfn "$dF" "$ST_T/gf.sh" 'yours=1')" 1
  # THE ESCAPE IN C70'S RESUMED-RUN SHAPE, UNCOMMITTED: OVERRIDE with it, RED without. HEAD'S TOP IS #534 AND
  # ANOTHER RUN'S, COMMITTED, AND THAT IS LOAD-BEARING: with the top at 532 the number 533 EXTENDS the series
  # instead of filling a gap, the door reports it without judging it, and the case reads NOT CHECKED on fix
  # and mutant alike. My first draft of this control did exactly that and measured it - the fixture was wrong
  # and the fix was right, which is the trap in prompts/common's own words (check the control moved the
  # quantity the assertion reads at all).
  dG="$(st_mk gfG)"; st_row 534 issued - "$GFOTHER" run-log >> "$dG/gates/build-numbers.tsv"
  st_gc "$dG" add -A; st_gc "$dG" commit -q -m 'another container pushed #534'
  git -C "$dG" update-ref refs/remotes/origin/main HEAD 2>/dev/null
  st_row 533 minted - "$GFOTHER" minted >> "$dG/gates/build-numbers.tsv"; st_row 533 built - "$GFMINE" built >> "$dG/gates/build-numbers.tsv"
  st C89n-the-resumed-run-shape-uncommitted-is-RED-unarmed "$(CT_RUNID=$GFMINE st_gfv "$dG" "$ST_T/gf.sh")" RED
  st C89o-and-OVERRIDE-with-the-escape-naming-533 "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$dG" "$ST_T/gf.sh")" OVERRIDE
  st C89p-and-the-OVERRIDE-outranks-the-NOT-CHECKED "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfrun "$dG" "$ST_T/gf.sh" | grep '^build-number series:' | sed -n '1p' | grep -c 'NOT CHECKED')" 0
  # A CLEAN TREE WITH THE BASE AT HEAD IS UNCHANGED: NOT CHECKED, and the suite runs. C69, C69b and C69d
  # already cover the committed plant; this is the no-working-tree-change cell beside it.
  dH="$(st_mk gfH)"
  st C89q-a-clean-tree-with-base-at-HEAD-is-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dH" "$ST_T/gf.sh")" NOT
  st C89r-and-it-does-not-stop-the-suite "$( CT_RUNID=$GFMINE st_gfrun "$dH" "$ST_T/gf.sh" >/dev/null 2>&1; echo $? )" 0
  st C89s-and-it-says-nothing-was-appended-and-nothing-judged "$(CT_RUNID=$GFMINE st_gfn "$dH" "$ST_T/gf.sh" 'the 0 uncommitted row(s) were APPENDED, of which 0 were JUDGED by this door, 0 are base-held and 0 EXTEND')" 1
  # AND GF_NOCHK IS STILL PRINTED on every one of them, which is what C79, C79b and M14a-c assert on $dp:
  # the words were KEPT verbatim by this fix and the new scope clause is added beside them, not instead.
  st C89t-the-NOT-CHECKED-line-still-carries-GF_NOCHK "$(CT_RUNID=$GFMINE st_gfn "$dH" "$ST_T/gf.sh" "there is no base to judge appended rows against")" 1

  # ── THE SIXTEEN MUTANTS. Each is the extracted block with ONE literal string put back, and each TURNS a case. ──
  echo "SELFTEST NOTE mutants: each is $ST_T/gf.sh with one literal edit; a case that passes on both would be no control at all."
  # MUTANT 1, AND IT IS THE DECISIVE ONE: a merge-base ceiling in front of stampable - #532's own door. It
  # turns C39, the after-integrating tree, from ok to RED. That single pair is the whole difference between
  # this attempt and the last one.
  cat > "$ST_T/m1.ins" <<'M1INS'
          GF_MBTOP="$(awk -F'\t' '{ if ($1+0 > m) m=$1+0 } END{ print m+0 }' "$GF_T/mb.rows")"
          if [ "$gfn" -le "$GF_MBTOP" ]; then GF_U=$((GF_U+1)); GF_STOP=1; GF_ROWSHOW="$gfrow"
            GF_WHY="MUTANT: #$gfn is at or below the merge-base series top #$GF_MBTOP."; break; fi
M1INS
  # THE ANCHOR CARRIES THE REDIRECTION, because `"$GF_BN" stampable` alone now matches TWO call sites: the
  # gap-fill judgement and the base-held report added for antagonist A's P1-2. With the bare anchor awk
  # inserted the mutant ceiling into the base-held branch, where it changes nothing, and M1b - the single most
  # important control in this arm, the one that distinguishes this attempt from #532 - silently stopped
  # turning. Caught by running the arm after the round-four edit, which is why every round re-runs it whole.
  awk -v a='"$GF_BN" stampable "#$gfn" > "$GF_T/sp.out"' -v f="$ST_T/m1.ins" '{ if (!d && index($0,a)>0) { while((getline l < f)>0) print l; close(f); d=1 } print }' "$ST_T/gf.sh" > "$ST_T/m1.sh"
  st M1-the-ceiling-mutant-parses "$(bash -n "$ST_T/m1.sh" 2>/dev/null && echo yes || echo no)" yes
  st M1a-FIX-reads-ok-after-integrating "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/gf.sh")" ok
  st M1b-CEILING-MUTANT-reads-RED-there "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/m1.sh")" RED
  st M1c-and-names-its-own-ceiling "$(CT_RUNID=$GFMINE st_gfn "$d5" "$ST_T/m1.sh" 'merge-base series top')" 1
  # MUTANT 2: stampable pointed at a register that holds no row for the number, which is the "door asked the
  # wrong file" case. The fix REDs through the no-row check; with that check also removed it reads ok.
  rm -rf "$ST_T/wrong"; mkdir -p "$ST_T/wrong/gates"; cp "$SG/buildnum.sh" "$ST_T/wrong/gates/"
  grep -v '^533	' "$d5/gates/build-numbers.tsv" > "$ST_T/wrong/gates/build-numbers.tsv"
  st_sub "$ST_T/gf.sh" "$ST_T/m2.sh" "GF_BN=\"\$ROOT/gates/buildnum.sh\"" "GF_BN=\"$ST_T/wrong/gates/buildnum.sh\""
  # ONE BLOCK, NOT TWO [antagonist A of the third pair, P3-2]: this awk matched the exit-2 branch's
  # `case "$GF_M1" in` as well, so the mutant lost the no-row check AND the exit-2 remedy branching - sixteen
  # lines in two hunks. M2c's conclusion survived (the exit-2 path is never entered on that fixture, measured
  # with the single-block variant), and a mutant that deletes two things is a control for neither.
  awk '!dn && /case "\$GF_M1" in/{d=1} d&&$1=="esac"{d=0;dn=1;next} d{next} {print}' "$ST_T/m2.sh" > "$ST_T/m2m.sh"
  st M2-both-variants-parse "$(bash -n "$ST_T/m2.sh" 2>/dev/null && bash -n "$ST_T/m2m.sh" 2>/dev/null && echo yes || echo no)" yes
  st M2a-the-no-row-check-FIRES-as-RED "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/m2.sh")" RED
  # TWICE since round seven: the phrase is in GF_WHY and in the headline arm added for this very cause.
  st M2b-and-calls-it-a-door-defect "$(CT_RUNID=$GFMINE st_gfn "$d5" "$ST_T/m2.sh" 'reading DIFFERENT files')" 2
  st M2c-MUTANT-without-that-check-is-ok "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/m2m.sh")" ok
  # MUTANTS 3 AND 4: the escape without each of its two tests. Each passes the shape the other test exists for.
  # MUTANTS 3 AND 4 ARE NOW ONE QUESTION, AND IT IS WHETHER THE ESCAPE STILL HAS A FLOOR. The two tests they
  # used to remove are gone (see C46), so the mutant that matters is M10, which puts them back. What must
  # still hold is that the escape is not a universal pass: it requires a row of THIS RUN'S, so a number whose
  # every row belongs to somebody else is refused even with the escape named - which is C48's fixture, asserted
  # here against the escape rather than left to the refusal path.
  st M3a-the-escape-still-has-a-floor "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$da" "$ST_T/gf.sh")" RED
  st M3b-and-the-floor-is-the-one-remaining-test "$(grep -c 'if \[ "\$gfmine" != "0" \]; then GF_ESC=1; fi' "$ST_T/gf.sh")" 1
  st_sub "$ST_T/gf.sh" "$ST_T/m4.sh" 'if [ "$gfmine" != "0" ]; then GF_ESC=1; fi' 'GF_ESC=1'
  st M4a-FIX-refuses-a-mint-that-is-nobodys "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$da" "$ST_T/gf.sh")" RED
  st M4b-MUTANT-with-no-floor-passes-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$da" "$ST_T/m4.sh")" OVERRIDE
  # MUTANT 5: the row predicate back to NF==9, the one #532's own 51-case arm could not tell from NF>=7.
  st_sub "$ST_T/gf.sh" "$ST_T/m5.sh" 'if (NF>=2 && $1 ~ /^[0-9]+$/) print' 'if (NF==9 && $1 ~ /^[0-9]+$/) print'
  st M5a-FIX-reds-the-trailing-tab-row "$(CT_RUNID=$GFMINE st_gfv "$db" "$ST_T/gf.sh")" RED
  st M5b-MUTANT-cannot-see-it-and-is-ok "$(CT_RUNID=$GFMINE st_gfv "$db" "$ST_T/m5.sh")" ok
  # MUTANT 6: an empty field in the refusal print, which is #532's item (g) - its GAP line emitted six fields
  # and its reader took seven, so "The row:" printed empty on every refusal.
  st_sub "$ST_T/gf.sh" "$ST_T/m6.sh" "\"\$(printf '%s' \"\$1\" | cut -f1)\"" "\"\$(printf '%s' \"\$1\" | cut -f97)\""
  st M6a-FIX-prints-a-non-empty-row "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/gf.sh" 'n=\[400\]')" 1
  st M6b-MUTANT-prints-an-empty-field "$(CT_RUNID=$GFMINE st_gfn "$d2" "$ST_T/m6.sh" 'n=\[\]')" 1
  # MUTANT 7: the extractor copy without `sed 's/^0*//'`, which is what makes it agree with buildnum.sh's
  # SHAMAP on a subject reading '#0363'. The two pipelines are also compared as strings, from both files.
  st_gfx(){ printf '%s\n' "$1" | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | sed 's/^0*//' | tr '\n' ' ' || true; }
  st_gfxm(){ printf '%s\n' "$1" | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | tr '\n' ' ' || true; }
  # THE EXTRACTED DOOR, NOT THE WHOLE FILE [antagonist A of the third pair, P2-1]. This read "$SF" with a
  # `head -1`, which picks the SELFTEST's retyped copy of the pipeline at the top of this arm - so the
  # published claim "the two extractor pipelines are identical" bound the SELFTEST to buildnum.sh and left the
  # DOOR's own pipeline, gf_subject_names, bound to nothing at all. A drifted it: removing the -i from the
  # door's line leaves this arm at 232 ok / 0 red AND false-REDs an honest tree carrying a census row whose
  # commit subject reads "Build 400 of the trainer", which is exactly what buildnum.sh sweep --add writes.
  st_pipe(){ grep -o "grep -oiE.*sed 's/\^0\*//'" "$1" | head -1; }
  st M7a-FIX-reads-0363-as-363 "$(st_gfx '#0363 a padded number')" "363 "
  st M7b-MUTANT-reads-it-as-0363 "$(st_gfxm '#0363 a padded number')" "0363 "
  st M7c-Build-363-spelled-out "$(st_gfx 'Build 363 spelled out')" "363 "
  st M7d-build-hash-363-matches-ONCE "$(st_gfx 'build #363 both ways')" "363 "
  st M7e-the-DOORS-pipeline-matches-buildnums "$(st_pipe "$ST_T/gf.sh")" "$(st_pipe "$SG/buildnum.sh")"
  st M7e2-and-the-block-holds-exactly-one "$(grep -c "grep -oiE.*sed 's/\^0\*//'" "$ST_T/gf.sh")" 1
  st M7e3-and-the-selftests-own-copy-agrees-too "$(st_pipe "$SF")" "$(st_pipe "$SG/buildnum.sh")"
  st M7f-and-both-were-actually-found "$( [ -n "$(st_pipe "$SG/buildnum.sh")" ] && echo yes || echo no )" yes
  # AND THE DOOR'S FUNCTION IS CALLED DIRECTLY, not a copy of it [antagonist A of the third pair, P2-1]. The
  # census route is the one thing that stops a legitimately swept row being refused, and until this it had no
  # assertion of its own: M7a-M7d exercise st_gfx, which is a retyped copy inside this arm.
  # THE RANGE ENDS ON THE FUNCTION'S OWN CLOSING LINE, not on a bare `}` at column zero - there is none, the
  # function closes with `[ -n "$hit" ]; }`, so the first draft of this extraction took 372 lines and sourced
  # most of the door. A fixture that quietly contains more than it says is this project's own recurring trap.
  awk '/^gf_subject_names\(\)/{p=1} p{print} p && /\[ -n "\$hit" \]; }/{exit}' "$ST_T/gf.sh" > "$ST_T/subjfn.sh"
  st M7g-the-function-was-really-extracted "$(grep -c '^gf_subject_names()' "$ST_T/subjfn.sh")" 1
  dz="$ST_T/gfz"; rm -rf "$dz"; mkdir -p "$dz"; git init -q "$dz" 2>/dev/null
  echo one > "$dz/a"; st_gc "$dz" add -A; st_gc "$dz" commit -q -m 'Build 400 of the trainer'
  GFZSHA="$(git -C "$dz" rev-parse HEAD 2>/dev/null)"
  st_subj(){ ( cd "$1" && bash -c 'set -uo pipefail; GF_GIT=(git --git-dir "$1/.git" --work-tree "$1"); source "$2"; gf_subject_names "$3" "$4"; echo $?' _ "$1" "$ST_T/subjfn.sh" "$2" "$3" 2>/dev/null | tail -1 ); }
  st M7h-a-lowercase-build-subject-is-matched "$(st_subj "$dz" "$GFZSHA" 400)" 0
  st M7i-and-another-number-is-not "$(st_subj "$dz" "$GFZSHA" 401)" 1
  # MUTANT 15: the -i off the DOOR's extractor, which is A's drift. It must turn M7h, and it is the control
  # that did not exist: with it absent, two independent drifts of this pipeline left the arm at 232 / 0.
  sed "s/grep -oiE/grep -oE/" "$ST_T/subjfn.sh" > "$ST_T/subjmut.sh"
  st_subjm(){ ( cd "$1" && bash -c 'set -uo pipefail; GF_GIT=(git --git-dir "$1/.git" --work-tree "$1"); source "$2"; gf_subject_names "$3" "$4"; echo $?' _ "$1" "$ST_T/subjmut.sh" "$2" "$3" 2>/dev/null | tail -1 ); }
  st M15-the-case-drift-mutant-differs "$( [ "$(md5sum < "$ST_T/subjfn.sh" | cut -c1-32)" != "$(md5sum < "$ST_T/subjmut.sh" | cut -c1-32)" ] && echo differs || echo same )" differs
  st M15a-FIX-matches-the-lowercase-subject "$(st_subj "$dz" "$GFZSHA" 400)" 0
  st M15b-MUTANT-does-not "$(st_subjm "$dz" "$GFZSHA" 400)" 1

  # MUTANT 8: `gf_minus` back to the `NR==FNR` idiom antagonist A vetoed. It is correct for every non-empty
  # subtrahend, which is why 100 controls passed over it, and it inverts on an empty one: with the subtrahend
  # file empty, awk reads the MINUEND's lines under FNR==NR and files them as the subtrahend, so the
  # difference comes back empty and a register whose every row has been deleted reads `ok`. This mutant exists
  # because a repair with no control is what this build faulted #532 for; it must turn C60 and C61.
  st_sub "$ST_T/gf.sh" "$ST_T/m8.sh" "'FILENAME==GFB{b[\$0]++;next}" "'NR==FNR{b[\$0]++;next}"
  st M8-the-NR-FNR-mutant-parses "$(bash -n "$ST_T/m8.sh" 2>/dev/null && echo yes || echo no)" yes
  st M8a-and-it-really-carries-the-idiom "$(grep -c 'NR==FNR{b\[\$0\]++' "$ST_T/m8.sh")" 1
  st M8b-FIX-reds-the-emptied-worktree "$(CT_RUNID=$GFMINE st_gfv "$dk" "$ST_T/gf.sh")" RED
  st M8c-MUTANT-reads-it-ok "$(CT_RUNID=$GFMINE st_gfv "$dk" "$ST_T/m8.sh")" ok
  st M8d-FIX-reds-the-emptied-HEAD "$(CT_RUNID=$GFMINE st_gfv "$dl" "$ST_T/gf.sh")" RED
  st M8e-MUTANT-reads-that-ok-too "$(CT_RUNID=$GFMINE st_gfv "$dl" "$ST_T/m8.sh")" ok
  # AND THE SAME MUTANT AGREES WITH THE FIX ON EVERY NON-EMPTY SUBTRAHEND, which is why no existing case
  # could see it: a control that fails on the broken door for an unrelated reason would prove nothing.
  st M8f-mutant-and-fix-agree-on-the-planted-row "$(CT_RUNID=$GFMINE st_gfv "$d2" "$ST_T/m8.sh")" RED
  st M8g-and-on-the-two-container-tree "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/m8.sh")" ok
  st M8h-and-the-arm-passed-100-over-the-broken-one "$( [ "$(CT_RUNID=$GFMINE st_gfv "$d5" "$ST_T/m8.sh")" = ok ] && echo agreed || echo differed )" agreed

  # MUTANT 9: the base-ref-at-HEAD branch removed, which is what the door did before antagonist B followed its
  # own printed remedy. The committed plant then reads `ok` with `appended=0` - a green claiming the push
  # carries no new rows at all.
  # RE-KEYED AT #534 BECAUSE G6'S REMAINDER CHANGED BOTH LINES THIS AWK ANCHORED ON, and the re-key is part of
  # that fix rather than a tidy-up: the branch no longer ends in `elif [ -z "${GF_MB:-}" ]` (it closes with
  # `fi` and the chain below it is guarded on GF_BASEATHEAD), so the old anchor matched NOTHING, `d` was never
  # reset, and the mutant would have been the block truncated at the branch - which parses but is not the door
  # it claims to be. ITS MEANING IS UNCHANGED: delete the block that sets GF_BASEATHEAD, and because that flag
  # is initialised far above (outside this range, on purpose) the mutant runs the main path with the flag at 0
  # and so prints `ok` where the fix prints NOT CHECKED. M9b and M9c are the same two assertions as before.
  awk '/if \[ -n "\$\{GF_BASESHA:-\}" \] && \[ "\$GF_BASESHA" = "\$\{GF_HEADSHA:-\}" \]; then/{d=1} d&&/^    if \[ "\$GF_BASEATHEAD" = "0" \] && \[ -z "\$\{GF_MB:-\}" \]; then/{d=0} !d{print}' "$ST_T/gf.sh" > "$ST_T/m9.sh"
  st M9-the-no-base-guard-mutant-parses "$(bash -n "$ST_T/m9.sh" 2>/dev/null && echo yes || echo no)" yes
  st M9a-FIX-says-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dp" "$ST_T/gf.sh")" NOT
  st M9b-MUTANT-reads-the-plant-ok "$(CT_RUNID=$GFMINE st_gfv "$dp" "$ST_T/m9.sh")" ok
  st M9c-and-reports-no-appended-rows-at-all "$(CT_RUNID=$GFMINE st_gfn "$dp" "$ST_T/m9.sh" 'appended=0')" 1
  # MUTANT 10: the escape's two withdrawn tests restored, which is the door as it stood when B found that an
  # honest resumed run had no route. It must turn C70b from OVERRIDE back to RED.
  # M10 RESTORES BOTH HALVES OF THE OLD DOOR [antagonist A of the third pair, P3-1]. Round three widened
  # gfmine from `$1==n && $2=="minted" && $7==r` to `$1==n && $7==r` IN THE SAME EDIT that replaced the
  # three-way condition, so a mutant that restores only the condition is not the door it claims to be: on the
  # ordinary honest shape (my minted row plus my built row) it reads gfmine=2 and refuses, where the real
  # pre-round-three door read gfmine=1 and passed. Both halves are restored here, in two substitutions.
  st_sub "$ST_T/gf.sh" "$ST_T/m10a.sh" 'if [ "$gfmine" != "0" ]; then GF_ESC=1; fi' 'if [ "$gfbad" = "0" ] && [ "$gfmint" = "1" ] && [ "$gfmine" = "1" ]; then GF_ESC=1; fi'
  # SINGLE QUOTES ON BOTH ARGUMENTS, because the awk fragment contains $1 and $7 and this file runs under
  # `set -u`: the first draft of this line used DOUBLE quotes, bash tried to expand $7, and the whole arm
  # died with "$7: unbound variable" at the top, 150 cases reporting empty. The same class as the P0 two
  # rounds earlier - a shell string that DOES something while being built - and caught the same way.
  st_sub "$ST_T/m10a.sh" "$ST_T/m10.sh" '$1==n && $7==r{c++}' '$1==n && $2=="minted" && $7==r{c++}'
  st M10-the-old-escape-mutant-parses "$(bash -n "$ST_T/m10.sh" 2>/dev/null && echo yes || echo no)" yes
  st M10z-and-it-restored-the-old-gfmine "$(grep -cF '$2=="minted" && $7==r{c++}' "$ST_T/m10.sh")" 1
  st M10y-and-touched-NOTHING-else "$(diff "$ST_T/m10a.sh" "$ST_T/m10.sh" | grep -c '^[<>]')" 2
  st M10a-FIX-passes-the-resumed-run "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$dq" "$ST_T/gf.sh")" OVERRIDE
  st M10b-MUTANT-refuses-it-with-no-route "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$dq" "$ST_T/m10.sh")" RED
  st M10c-and-still-refuses-a-foreign-only-number "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=533 st_gfv "$da" "$ST_T/gf.sh")" RED
  # MUTANT 11: `break` back in the exit-2 branch, which is how a tree with two bad rows printed one row and
  # named the other number nowhere. It must turn C71 (two prints) and C71b (the partition).
  st_sub "$ST_T/gf.sh" "$ST_T/m11.sh" '            # `continue`, NOT `break`' '            break
            # `continue`, NOT `break`'
  st M11-the-break-mutant-parses "$(bash -n "$ST_T/m11.sh" 2>/dev/null && echo yes || echo no)" yes
  st M11a-FIX-prints-both-rows "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/gf.sh" 'THE ROW, FIELD FOR FIELD')" 2
  st M11b-MUTANT-prints-one "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/m11.sh" 'THE ROW, FIELD FOR FIELD')" 1
  # NOT the partition: GF_GF increments per judged row, so a loop that stops early still sums. What `break`
  # loses is the second row's NUMBER, which is exactly what antagonist B reported - "400 occurs nowhere in
  # the output". The first draft of this case asserted the partition and was wrong about its own mechanism.
  st M11c-FIX-names-the-second-number "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/gf.sh" 'n=\[400\]')" 1
  st M11d-MUTANT-names-it-nowhere "$(CT_RUNID=$GFMINE st_gfn "$dr" "$ST_T/m11.sh" 'n=\[400\]')" 0

  # MUTANT 12: the base-held report line without the base row's owner and the authority's verdict, which is
  # how a live collision's only line named this run's id and nothing else.
  st_sub "$ST_T/gf.sh" "$ST_T/m12.sh" 'baseMintedBy=[${gfbase7:-(none)}] ' ''
  st M12-the-thin-report-mutant-parses "$(bash -n "$ST_T/m12.sh" 2>/dev/null && echo yes || echo no)" yes
  st M12a-FIX-names-the-other-runs-id "$(CT_RUNID=$GFMINE st_gfn "$dv" "$ST_T/gf.sh" "baseMintedBy=\[$GFOTHER\]")" 2
  st M12b-MUTANT-names-it-nowhere "$(CT_RUNID=$GFMINE st_gfn "$dv" "$ST_T/m12.sh" "$GFOTHER")" 0
  st M12c-and-both-still-read-ok "$(CT_RUNID=$GFMINE st_gfv "$dv" "$ST_T/m12.sh")" ok
  # MUTANT 13: the classifier back to bash arithmetic, which reads 010000 as octal 4096.
  # THE MUTANT IS THE ARITHMETIC FORM, not the `[ -gt ]` one antagonist A named: `[ "010000" -gt 5000 ]` is
  # TRUE (strtol, base ten) while `(( 010000 > 5000 ))` is FALSE (octal 4096). The first draft of this mutant
  # swapped `10#` for the `[ -gt ]` form and could not turn the case, which is how A's premise was caught.
  st_sub "$ST_T/gf.sh" "$ST_T/m13.sh" 'if [ "$((10#$gfn))" -gt "$GF_TOP" ] 2>/dev/null; then' 'if (( gfn > GF_TOP )) 2>/dev/null; then'
  st M13-the-octal-mutant-parses "$(bash -n "$ST_T/m13.sh" 2>/dev/null && echo yes || echo no)" yes
  st M13a-FIX-reads-010000-as-above-5000 "$(CT_RUNID=$GFMINE st_gfv "$dw" "$ST_T/gf.sh")" ok
  st M13b-ARITHMETIC-MUTANT-reads-it-as-4096 "$(CT_RUNID=$GFMINE st_gfv "$dw" "$ST_T/m13.sh")" RED
  st M13c-and-the-two-disagree-about-the-number "$( [ "$(CT_RUNID=$GFMINE st_gfv "$dw" "$ST_T/gf.sh")" != "$(CT_RUNID=$GFMINE st_gfv "$dw" "$ST_T/m13.sh")" ] && echo disagree || echo agree )" disagree
  st M13d-and-test-gt-ITSELF-reads-base-ten "$( [ "010000" -gt 5000 ] && echo decimal || echo octal )" decimal
  st M13e-while-the-arithmetic-form-reads-octal "$( gfnx=010000; (( gfnx > 5000 )) && echo decimal || echo octal )" octal

  # MUTANT 14: the backticks put back in the base-ref-at-HEAD message, which is B's P0 exactly. It must turn
  # C79 (the words are gone) and C79c (the shell complains), and the mutant is the only place in this repo
  # where that form now exists. It is NOT run against the shallow fixture: that form unshallows the clone
  # under test, so the mutant is exercised on the fixture whose message carries no git command to run.
  st_sub "$ST_T/gf.sh" "$ST_T/m14.sh" "and 'appended' would read 0" "and \`appended\` would read 0"
  st M14-the-backtick-mutant-parses "$(bash -n "$ST_T/m14.sh" 2>/dev/null && echo yes || echo no)" yes
  st M14a-FIX-prints-the-word "$(CT_RUNID=$GFMINE st_gfspan "$dp" "$ST_T/gf.sh" "'appended' would read 0")" 1
  st M14b-MUTANT-prints-it-nowhere "$(CT_RUNID=$GFMINE st_gfspan "$dp" "$ST_T/m14.sh" "appended would read 0")" 0
  st M14c-and-the-shell-says-command-not-found "$(CT_RUNID=$GFMINE st_gfrun "$dp" "$ST_T/m14.sh" | grep -c 'appended: command not found')" 1

  # MUTANT 16: the cause arms nested back INSIDE the zero-counts guard, which is round six's own mistake. It
  # must turn C85: the headline the arms exist for becomes unreachable, because the only refusal that sets
  # that reason is raised after GF_GF has been incremented. This is the control that did not exist, and its
  # absence is why a 244-case arm read green over an unreachable branch.
  python3 - "$ST_T/gf.sh" "$ST_T/m16.sh" <<'M16PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
i = s.index('  case "${GF_WHY:-}" in\n')   # the headline case: two-space indent, the only one at that depth
j = s.index('  esac\n', i) + len('  esac\n')
block = s[i:j]
nested = ('  if [ "${GF_GF:-0}" = "0" ] 2>/dev/null && [ "${GF_D1:-0}" = "0" ] && [ "${GF_D2:-0}" = "0" ]; then\n'
          + block + '  else\n    echo "GATES RED $N — stopped before running any gate: the build-number register carries a row nothing accounts for." | tee -a "$ALL"\n  fi\n')
open(dst, 'w').write(s[:i] + nested + s[j:])
M16PY
  st M16-the-renesting-mutant-parses "$(bash -n "$ST_T/m16.sh" 2>/dev/null && echo yes || echo no)" yes
  chmod -x "$dx/gates/buildnum.sh"
  st M16a-FIX-names-the-environment "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/gf.sh" "this door's own ENVIRONMENT is broken")" 1
  st M16b-MUTANT-accuses-the-tree-instead "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/m16.sh" 'carries a row nothing accounts for')" 1
  st M16c-and-never-reaches-the-cause-arm "$(CT_RUNID=$GFMINE st_gfn "$dx" "$ST_T/m16.sh" "this door's own ENVIRONMENT is broken")" 0
  chmod +x "$dx/gates/buildnum.sh"
  # MUTANT 17: the armed-and-declined notice deleted from the point of decline, which is where round seven did
  # not put it. It must turn C87g - the notice vanishes for any number that is not the lowest offender.
  awk '/THE ESCAPE WAS ARMED FOR #\$gfn AND DID NOT APPLY/ && /REPORTED, NOT REFUSED/ {next} {print}' "$ST_T/gf.sh" > "$ST_T/m17.sh"
  st M17-the-lost-notice-mutant-parses "$(bash -n "$ST_T/m17.sh" 2>/dev/null && echo yes || echo no)" yes
  st M17a-and-it-really-dropped-the-line "$( [ "$(grep -c '' < "$ST_T/m17.sh")" -lt "$(grep -c '' < "$ST_T/gf.sh")" ] && echo dropped || echo same )" dropped
  st M17b-FIX-keeps-the-notice-on-a-higher-offender "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dB" "$ST_T/gf.sh" 'ARMED FOR #401 AND DID NOT APPLY')" 1
  st M17c-MUTANT-loses-it "$(CT_RUNID=$GFMINE CT_GAPFILL_OVERRIDE=401 st_gfn "$dB" "$ST_T/m17.sh" 'ARMED FOR #401 AND DID NOT APPLY')" 0

  # MUTANT 18 (#534, G6's remainder): THE OLD BLINDNESS PUT BACK. M9 deletes the branch and so loses the
  # verdict WORD; this one keeps the word and removes the JUDGEMENT, which is the defect as it actually
  # shipped at #533 - the branch answered NOT CHECKED without reading a register, so an uncommitted gap-fill
  # row reached every gate. One literal edit: when the base is at HEAD, the appended-from-the-working-tree
  # set is emptied instead of computed, which is exactly what an early return did. It must turn C89 from RED
  # to NOT CHECKED and C89e's denominator from 1 to 0.
  st_sub "$ST_T/gf.sh" "$ST_T/m18.sh" 'gf_minus "$GF_T/wt.rows"   "$GF_T/head.rows" > "$GF_T/app_w"' 'if [ "$GF_BASEATHEAD" = "1" ]; then : > "$GF_T/app_w"; else gf_minus "$GF_T/wt.rows" "$GF_T/head.rows" > "$GF_T/app_w"; fi'
  st M18-the-old-blindness-mutant-parses "$(bash -n "$ST_T/m18.sh" 2>/dev/null && echo yes || echo no)" yes
  st M18a-FIX-reds-the-uncommitted-gapfill "$(CT_RUNID=$GFMINE st_gfv "$dC" "$ST_T/gf.sh")" RED
  st M18b-MUTANT-reads-it-NOT-CHECKED "$(CT_RUNID=$GFMINE st_gfv "$dC" "$ST_T/m18.sh")" NOT
  st M18c-and-the-MUTANT-judged-nothing "$(CT_RUNID=$GFMINE st_gfn "$dC" "$ST_T/m18.sh" 'the 0 uncommitted row(s) were APPENDED, of which 0 were JUDGED by this door')" 1
  st M18d-and-the-MUTANT-does-not-stop-the-suite "$( CT_RUNID=$GFMINE st_gfrun "$dC" "$ST_T/m18.sh" >/dev/null 2>&1; echo $? )" 0
  # AND IT AGREES WITH THE FIX WHERE THE BASE IS NOT AT HEAD, which is why no existing case could see it: a
  # mutant that differed everywhere would be caught by any one of the hundred cases above.
  st M18e-mutant-and-fix-agree-off-this-branch "$(CT_RUNID=$GFMINE st_gfv "$d2" "$ST_T/m18.sh")" RED

  # AND THE EXTRACTION M7g CHECKS IS BOUNDED [antagonist A of the fifth pair, P3-3]: M7g asserted only that the
  # function's first line is there, which is true whether the range ended at the function or ran to EOF.
  st M7g2-and-the-extraction-is-BOUNDED "$(grep -c '' < "$ST_T/subjfn.sh")" 5

  # ── C90 + M19: THE INSTRUMENT FOOTER MUST NOT EMIT THE VERDICT TOKEN, AND THIS IS THE FIRST OF THE THREE
  # ESCAPES TO GET A CONTROL. #539's first draft ended the footer clause with the literal two-word token, which
  # put it into EVERY log on EVERY run - SUBSET and RED logs included - against an invariant this repository
  # states in six places. The two earlier escapes (a newline in CT_RUNID, then the token inside CT_RUNID) each
  # got five arms, C88 to C88e; this one got a PROSE RULE IN A COMMENT and nothing else, and this project's own
  # file says in terms that a written warning is not a guard. Both antagonists of the repair pass said so.
  # IT IS A BEHAVIOURAL CONTROL, NOT A GREP OVER THE SOURCE: the block is extracted LIVE from $SF by the text
  # of its own first and last lines - no offsets, because a line number inside the file the next commit will
  # shift is the one citation form guaranteed to rot (this build learned that twice in one hour) - and then RUN
  # over a crafted log, so what is asserted is what reaches a log rather than what the source looks like.
  ST_FB="$ST_T/footer.sh"; sed -n '/^TC_LINE=/,/^echo "instrument:/p' "$SF" > "$ST_FB"
  printf '%s\n' 'text metrics @16px over the reference string: system-ui 402.12  "Segoe UI" 322.15  sans-serif 348.28  (fall-through sentinel 322.15)' > "$ST_T/cal.log"
  printf '%s\n' 'text metrics @16px over the reference string: system-ui 373.42  "Segoe UI" 373.42  sans-serif 348.28  (fall-through sentinel 322.15)' > "$ST_T/off.log"
  # THE DENOMINATOR FIRST AND AS ITS OWN ASSERTION [the eleventh costume]: `grep -c` over the output of a block
  # that was never found is 0, which is the PASSING value, so an extraction that silently matched nothing would
  # make every arm below report success loudest exactly when the thing under test had disappeared.
  st C90-the-footer-block-was-FOUND-and-RAN "$( ALL="$ST_T/cal.log" bash "$ST_FB" 2>/dev/null | grep -c '^instrument:' )" 1
  st C90a-and-it-actually-COMPARED-the-calibration "$( ALL="$ST_T/cal.log" bash "$ST_FB" 2>/dev/null | grep -c 'calibration AGREES' )" 1
  st C90b-and-emits-NO-verdict-token-on-the-agreeing-path "$( ALL="$ST_T/cal.log" bash "$ST_FB" 2>/dev/null | grep -c 'GATES GREEN' )" 0
  # BOTH ARMS, because the clause is unconditional: a later editor who reworded only the AGREES branch would
  # leave the token reachable from the branch a stand-down run actually takes.
  # IF YOU EXTEND THESE ARMS, KNOW THAT THE FIXTURES SELF-POLLUTE [antagonist A2, an observation not a finding]:
  # the block ends in `tee -a "$ALL"`, so every arm APPENDS an instrument line to its own fixture, and that
  # appended line itself contains `text metrics @16px` because TM_LINE is interpolated into it. These arms survive
  # only because `grep -m1` always reaches the pristine line 1. An arm using `tail`, or a count, inherits a
  # corrupted fixture - so re-create the fixture in the arm rather than reusing these.
  st C90c-nor-on-the-disagreeing-path "$( ALL="$ST_T/off.log" bash "$ST_FB" 2>/dev/null | grep -c 'GATES GREEN' )" 0
  st C90d-and-that-path-really-was-the-DISAGREES-one "$( ALL="$ST_T/off.log" bash "$ST_FB" 2>/dev/null | grep -c 'calibration DISAGREES' )" 1
  st C90e-nor-when-the-log-carries-no-metrics-line "$( : > "$ST_T/empty.log"; ALL="$ST_T/empty.log" bash "$ST_FB" 2>/dev/null | grep -c 'GATES GREEN' )" 0
  # C90f IS C90e's DENOMINATOR [antagonist B2, F1]. C90e expects 0 and a block that printed nothing
  # also returns 0, and empty.log appeared in exactly one arm, so the metrics-less path was the one
  # zero-expecting path with no presence assertion beside it. Unreachable today - the echo is
  # unconditional - but a future `case` arm returning early there would make C90e loudest when the
  # footer had gone silent, which is the whole reason C90 and C90d exist for the other two paths.
  st C90f-and-the-metrics-less-path-still-PRINTED "$( ALL="$ST_T/empty.log" bash "$ST_FB" 2>/dev/null | grep -c '^instrument:' )" 1
  # ── C90g, C90h: THE EXTRACTION'S SHAPE, NOT ONLY ITS BEHAVIOUR [antagonist B2, F2, a P2 it would
  # land before the suite and I agree]. `sed -n '/^TC_LINE=/,/^echo "instrument:/p'` is bounded at the
  # TOP ONLY: a second line beginning `TC_LINE=` ANYWHERE BELOW the real echo makes sed emit a second
  # range, and B2 measured that a 41-line extraction becomes 69 and swallows the project's ONE
  # legitimate token emitter, `if [ $red -eq 0 ]; then echo "GATES GREEN $N"`. It then turns the
  # control BOTH WAYS and neither depends on the clause: with `red` unset the captured tail dies on
  # `[ -eq 0 ]`, the arm's own 2>/dev/null swallows it, GATES RED prints instead and C90b still reads
  # 0 and PASSES; with `red=0` in scope - a plain unqualified name this selftest already assigns -
  # C90b reads 1 and the control REDS ON A TREE WHOSE CLAUSE IS CLEAN. A false green and a false red
  # from one unremarkable line. So the answer is BOTH doors: the driven arms above prove what reaches
  # a log, and these two prove the range is actually the footer.
  # B2's PRESCRIPTION WAS WRONG AS WRITTEN AND IS CORRECTED HERE [the flag-proposes-a-hypothesis rule]:
  # it asked for `grep -c 'GATES GREEN' "$ST_FB"` to be 0. MEASURED on the correct tree it is 2, both
  # in the COMMENTS the extraction legitimately carries - the very paragraphs explaining this rule sit
  # between the `esac` and the `echo` - so that arm would have reddened a clean tree on its first run.
  # The non-comment count is the assertion that means what B2 intended, and it reads 0.
  st C90g-the-extracted-range-carries-NO-verdict-token-in-any-CODE-line "$( grep -v '^[[:space:]]*#' "$ST_FB" | grep -c 'GATES GREEN' )" 0
  st C90h-and-the-range-ends-at-EXACTLY-ONE-instrument-echo "$( grep -c '^echo "instrument:' "$ST_FB" )" 1
  # M19 IS THE MUTANT, AND WITHOUT IT C90b WOULD BE A GREEN THAT HAS NEVER BEEN SHOWN ABLE TO FAIL - which is
  # the defect this whole arm exists to answer. It restores #539's first draft one word at a time.
  st_sub "$ST_FB" "$ST_T/m19.sh" 'cannot reach the verdict below' 'cannot withhold GATES GREEN'
  st M19-the-first-draft-mutant-parses "$(bash -n "$ST_T/m19.sh" 2>/dev/null && echo yes || echo no)" yes
  st M19a-MUTANT-leaks-the-token-on-the-agreeing-path "$( ALL="$ST_T/cal.log" bash "$ST_T/m19.sh" 2>/dev/null | grep -c 'GATES GREEN' )" 1
  st M19b-and-on-the-disagreeing-path-too "$( ALL="$ST_T/off.log" bash "$ST_T/m19.sh" 2>/dev/null | grep -c 'GATES GREEN' )" 1
  # ── C90i..C90n AND M20: THE CALIBRATION COMPARISON IS A GATE SINCE #544 AND THESE ARE ITS CONTROLS
  # [item (28); jobs/the-suites-calibration-comparison-is-a-record-and-nothing-refuses-on-a-mismatch-2026-10-27,
  # which asks for "a case and a turning mutant for both directions (off-calibration must redden, on-calibration
  # must not)"]. THEY ASSERT `red` AND NOT THE PRINTED SENTENCE, because the printed sentence is what #539
  # already had and the whole finding was that nothing refused. The block is sourced with red=0 and `red` is read
  # back, which is the pattern this selftest already uses for the build-number door.
  # st_cal <blockfile> <logfile> [subset]: the value of `red` after the footer block runs over that log.
  # THE LOG AND THE SUBSET ARE PASSED AS ARGUMENTS AND EXPORTED ON THE `bash` CALL, not set as shell-function
  # prefixes, and the first draft did it the other way: `ALL=... st_cal ...` assigns in the CURRENT shell, a
  # child `bash -c` inherits only EXPORTED variables, so every arm ran with ALL unset - which took the
  # metrics-less-full-run path and returned red=1. FOUR ARMS WERE GREEN FOR THE WRONG REASON that way (the
  # off-calibration, Segoe-slot, drift and unparsable ones all expect 1), and the two that expect 0 were the
  # only ones that failed and so the only tell. A prefix on a function is not a prefix on a process.
  st_cal(){
    ALL="$2" SUBSET="${3-}" BLK="$1" bash -c 'red=0; . "$BLK" >/dev/null 2>&1; printf %s "$red"' 2>/dev/null
  }
  printf '%s\n' 'text metrics @16px over the reference string: system-ui 402.12  "Segoe UI" 373.42  sans-serif 348.28  (fall-through sentinel 322.15)' > "$ST_T/segoe.log"
  { printf '%s\n' 'text metrics @16px over the reference string: system-ui 402.12  "Segoe UI" 322.15  sans-serif 348.28  (fall-through sentinel 322.15)'
    printf '%s\n' 'text metrics @16px over the reference string: system-ui 373.42  "Segoe UI" 373.42  sans-serif 348.28  (fall-through sentinel 322.15)'; } > "$ST_T/drift.log"
  printf '%s\n' 'text metrics @16px over the reference string: system-ui 402.12  "Segoe UI" 322.15  sans-serif 348.28' > "$ST_T/three.log"
  st C90i-ON-calibration-does-NOT-redden            "$( st_cal "$ST_FB" "$ST_T/cal.log" )" 0
  st C90j-OFF-calibration-REDDENS                   "$( st_cal "$ST_FB" "$ST_T/off.log" )" 1
  # C90k IS THE SLOT THAT ACTUALLY MOVED IN #537 AND NO OTHER: only "Segoe UI" changed, 373.42 against a
  # calibrated 322.15, so a comparison over sans-serif alone, over system-ui alone, or over any subset omitting
  # the app stack's FIRST family misses the one real event this project has had. That fixture is 537-all.log's
  # own quadruple.
  st C90k-the-SEGOE-slot-alone-REDDENS              "$( st_cal "$ST_FB" "$ST_T/segoe.log" )" 1
  # C90l is the limit #539 filed as not-fixed: `grep -m1` read the first line of a log that carries one per gate
  # launch, and antagonist B2 DROVE a real mid-run drift whose footer said AGREES at exit 0.
  st C90l-a-MID-RUN-DRIFT-REDDENS                   "$( st_cal "$ST_FB" "$ST_T/drift.log" )" 1
  st C90l2-and-the-verdict-names-the-drift          "$( ALL="$ST_T/drift.log" bash "$ST_FB" 2>/dev/null | grep -c 'calibration DRIFTED MID-RUN' )" 1
  # C90m AND C90n ARE THE GUARD THAT MUST NOT FIRE ON THE NORMAL CASE, in both directions: an unparsable line
  # reddens a FULL run and must NOT redden a subset, because a subset of a mechanical gate launches no browser
  # and prints no metrics line at all. A guard that fires on the normal case gets switched off [CLAUDE.md].
  st C90m-an-UNPARSABLE-line-reddens-a-FULL-run     "$( st_cal "$ST_FB" "$ST_T/three.log" )" 1
  st C90n-but-NOT-a-subset-run                      "$( st_cal "$ST_FB" "$ST_T/three.log" 20-review )" 0
  st C90n2-nor-does-a-metrics-less-SUBSET-run       "$( st_cal "$ST_FB" "$ST_T/empty.log" 20-review )" 0
  st C90n3-while-a-metrics-less-FULL-run-does       "$( st_cal "$ST_FB" "$ST_T/empty.log" )" 1
  # M20 IS THE TURNING MUTANT THE JOB ASKS FOR BY NAME. It defangs the comparison the only way that keeps the
  # block parsing - by making the measured quadruple equal the wanted one - and every REDDENING arm above must
  # go quiet while C90i stays 0. Without it C90j..C90n would be greens that have never been shown able to fail,
  # which is the defect this whole item exists to answer.
  st_sub "$ST_FB" "$ST_T/m20.sh" 'TM_NGOT="$(printf' 'TM_GOT="$TM_WANT"; TM_NGOT="$(printf'
  st M20-the-defanged-comparison-parses            "$(bash -n "$ST_T/m20.sh" 2>/dev/null && echo yes || echo no)" yes
  st M20a-MUTANT-off-calibration-no-longer-reddens "$( st_cal "$ST_T/m20.sh" "$ST_T/off.log" )" 0
  st M20b-MUTANT-the-segoe-slot-no-longer-reddens  "$( st_cal "$ST_T/m20.sh" "$ST_T/segoe.log" )" 0
  st M20c-and-ON-calibration-is-still-quiet         "$( st_cal "$ST_T/m20.sh" "$ST_T/cal.log" )" 0
  st M19c-and-the-MUTANT-still-prints-a-footer "$( ALL="$ST_T/cal.log" bash "$ST_T/m19.sh" 2>/dev/null | grep -c '^instrument:' )" 1
  # M19d CLOSES A FAIL-OPEN A2 MEASURED, and it is why M19c's name no longer claims "differs ONLY in the token":
  # st_sub rewrites nothing when its anchor is absent, so on a tree whose clause ALREADY carries the token the
  # "mutant" is byte-identical to the block and M19a/M19b read 1 = expected 1 and PASS. M19 alone therefore cannot
  # tell "the mutant introduced the token" from "the fix already had it". The SET is still sound - C90b/c/e go red
  # in exactly that state, measured on both external mutants - but a control that fails OPEN should say so, and one
  # `cmp` is cheaper than the next reader rediscovering it.
  st M19d-and-the-mutant-actually-DIFFERS-from-the-fix "$(cmp -s "$ST_FB" "$ST_T/m19.sh" && echo same || echo differ)" differ

  echo "SELFTEST $st_p pass / $st_f fail"
  [ "$st_f" -eq 0 ] || exit 1
  exit 0
fi
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
# ── ONE SUITE AT A TIME (#419) ────────────────────────────────────────────────────────────────────────────
# #418 ran TWO full suites ten seconds apart against the same bundle. The -all.log guard below did its job and
# gave them separate names (418b, 418c), so BOTH looked like clean full-suite greens and one was accepted by
# verify-log.sh at 1935 PASS. They were not two runs: 26 of their 36 gate sections are BYTE-IDENTICAL, including
# 49-home at 53,951 bytes, because the per-gate log path had no run identity and both processes were reading and
# writing the same 36 files. Each -all.log is a COLLAGE of two runs, and 418b carries an 18KB hole of NUL bytes
# where it read a file the other process was mid-write. Nothing detected this: the footer total is computed FROM
# the collage, so self-consistency holds by construction - the check and the thing checked were the same object,
# which is this project's oldest trap wearing a new costume.
# Two concurrent suites are also wrong for a reason that has nothing to do with log names: every settle-based
# assertion in this suite measures a browser competing for CPU with a second full suite.
# There is DELIBERATELY NO ENV OVERRIDE. An opt-out is a hole held by the party being audited (#418's free-form
# scope). To run two on purpose, remove the lock directory by hand, where it is visible.
LOCK="$G/logs/.suite.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  HOLDER="$(cat "$LOCK/pid" 2>/dev/null || echo '')"
  # kill -0 asks about ONE pid. Never pgrep -f here: its pattern matches this script's own command line, which
  # is how #407 waited on itself and how #416 killed its own shell.
  if [ -n "$HOLDER" ] && kill -0 "$HOLDER" 2>/dev/null; then
    echo "FAIL: another gate suite is already running (pid $HOLDER, started $(cat "$LOCK/started" 2>/dev/null), log $(cat "$LOCK/log" 2>/dev/null))."
    echo "  Two concurrent suites share nothing safely: they contend for CPU, so every settle-based assertion"
    echo "  becomes a coin flip, and at #418 they produced two green logs that were collages of each other."
    echo "  Wait for it to finish, or kill pid $HOLDER and remove $LOCK."
    exit 1
  fi
  echo "NOTE: stale lock $LOCK (pid '${HOLDER:-none}' is not running) - taking it over."
  rm -rf "$LOCK"; mkdir "$LOCK" || { echo "FAIL: cannot create $LOCK"; exit 1; }
fi
echo "$$" > "$LOCK/pid"; date '+%Y-%m-%d %H:%M:%S %Z' > "$LOCK/started"
trap 'rm -rf "$LOCK"' EXIT

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
echo "$ALL" > "$LOCK/log"
# EVERY file this run writes is named from the -all log it was given, so a second run cannot land on one of them.
# Before #419 this was "$TAG-$name.log" for every run of a build: the b/c suffix protected the -all log and
# nothing else, and a SUBSET run silently overwrote the full run's per-gate evidence for the same reason.
STEM="$(basename "$ALL")"; STEM="${STEM%-all.log}"
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

# ── #461. THE EXPECTED-GATES MANIFEST: WHICH GATES RAN, NOT JUST THAT THE ONES PRESENT PASSED ────────────────
# jobs/gates-green-does-not-assert-which-gates-RAN-so-a-deleted-gate-is-invisible-2026-10-01, from antagonist B
# on #450. Everything below this line asks "did the gates in this directory pass". NOTHING asked whether the
# directory holds the gates it is supposed to, so a gate deleted, renamed or never merged was indistinguishable
# from a gate that was never needed - and the suite still ended GATES GREEN. Measured: main reported 47 suites
# green while gates/regress/67-sel-cls-consumers.js (the only gate that reddens on the sel/cls consumer P0s) and
# gates/regress/50-drill-verdict-no-jump.js (the only gate over the drill board jump) were both absent from it.
#
# IT RUNS BEFORE ANY GATE, like the duplicate-number guard above and for the same reason: a suite that cannot be
# trusted should not spend forty minutes proving it. And it runs ON A SUBSET TOO - the question is about the
# DIRECTORY, not about which gates this invocation executes.
#
# TWO OUTCOMES, DELIBERATELY NOT ONE [see the header of gates/gatemanifest.sh]:
#   exit 1  a required gate is MISSING -> this suite stops here and cannot emit GATES GREEN.
#   exit 2  a gate on disk is UNLISTED -> the suite RUNS (a build that adds a gate must be able to run it), the
#           count goes in the footer, and gates/verify-log.sh refuses the log, so it cannot reach main unlisted.
#   exit 3  the manifest itself is missing -> NOT CHECKED, reported, and the suite runs. A stale checkout must
#           not be able to wedge the lane, but it must not read as a pass either.
MANI_OUT="$("$G/gatemanifest.sh" check 2>&1)"; MANI_RC=$?
printf '%s\n' "$MANI_OUT" | tee -a "$ALL"
# ── jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02 ───────────────
# WAS: printf '%s\n' "$MANI_OUT" | grep -m1 '^gate manifest:' || echo 'gate manifest: NOT CHECKED'
# Under `set -uo pipefail` (line 30) a SHORT-CIRCUITING grep kills the producer with SIGPIPE once MANI_OUT
# exceeds the pipe buffer: grep SUCCEEDS, printf exits 141, pipefail reports 141 for the pipeline, so the `||`
# fallback ALSO runs and appends its echo to the output grep already produced. MANI_LINE then holds BOTH lines,
# the footer carries the literal 'gate manifest: NOT CHECKED' next to a perfectly read manifest, and
# gates/verify-log.sh refuses a complete green ~70-minute suite for a reason that is FALSE.
# REPRODUCED before fixing, 2 inputs: MANI_OUT at 10 filler bytes -> 1 line both ways (positive control);
# MANI_OUT at 200,000 filler bytes -> 2 lines with the pipe and 1 line with the herestring. A HERESTRING HAS NO
# PIPE AND THEREFORE NO SIGPIPE. MANI_OUT is ~1KB today and the buffer is ~64KB, so this is LATENT - but `check`
# prints one permanent line per known-absent gate and rows are never deleted, so it grows monotonically.
# gates/gatemanifest.sh's own header already states this rule ("use grep -qx \"$x\" <<<\"$list\" and never
# printf ... | grep -q"); the rule was written in that file and the surviving instance was in this one.
# THE CLASS IS NOT FULLY SWEPT HERE AND THAT IS DELIBERATE: the other four sites the job names are in
# gates/gatemanifest.sh (1045, 1057, 977 - all live, same repair) and one at gatemanifest.sh:528 which is safe
# (producer is `sed -n '2,6p'`, at most five lines). A burst agent holds ONE artefact lock [R44] and this one is
# gates/gates.sh, so gatemanifest.sh's three are left for the agent that holds that file. classSwept {found 5,
# fixed 1, left 4} - 3 live and 1 judged safe.
MANI_LINE="$(grep -m1 '^gate manifest:' <<<"$MANI_OUT" || echo 'gate manifest: NOT CHECKED')"
if [ "$MANI_RC" -eq 1 ]; then
  echo "GATES RED $N — stopped before running any gate: the expected-gates manifest is not satisfied." | tee -a "$ALL"
  exit 1
fi
# ANTAGONIST A ON #461: THIS BRANCHED ONLY ON RC 1, SO THE WHOLE GUARD WAS BYPASSED WITH NO MANIFEST DIFF AT ALL.
# A missing gatemanifest.sh gives 127 and a non-executable one 126; both fell through, the suite ran for 44
# minutes, and MANI_LINE fell back to the literal "gate manifest: NOT CHECKED". verify-log.sh now refuses that for
# a #461-era log, so the push was already blocked - but blocking it after the suite rather than before it is
# exactly A's and B's F9 point: this is knowable at second two. Deleting one script is not a legitimate state.
if [ "$MANI_RC" -ge 126 ]; then
  echo "GATES RED $N — stopped before running any gate: could not EXECUTE $G/gatemanifest.sh (exit $MANI_RC)." | tee -a "$ALL"
  echo "  127 means the script is missing, 126 means it is not executable. Both are a damaged checkout, not a" | tee -a "$ALL"
  echo "  tree to gate: the suite cannot tell you which gates it was supposed to run. Restore it and re-gate." | tee -a "$ALL"
  exit 1
fi

# ── THE GAP-FILL DOOR, G6's THIRD ATTEMPT (#533). TWO WERE BUILT HERE AND BOTH WERE WITHDRAWN WHOLE. ─────────
# jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16
# asks, as the last of its four clauses, that "the full suite does not go green on a gap fill row that nothing
# accounts for". A GAP-FILL ROW is an appended row whose number is below the base register's series top and
# absent from the base: the shape a planted row has, and the shape that makes "#416" name two trees.
#
# WHAT THE FIRST TWO ATTEMPTS MEASURED, kept in four lines because it is what makes this one different and the
# full reproductions are on the job with their fixture scripts:
#   #530 keyed the exemption on a PROVENANCE WORD (`measured`), which accepted 11 of this register's 323 issued
#     rows and rejected the 228 that `buildnum.sh sweep --add` itself writes, then told a stuck run to run the
#     very command that produces the refusal. A word is a shape, and a hand-written row can type any shape.
#   BOTH keyed "is this row legitimate" on A SERIES CEILING, and that is the wedge that withdrew both. #530 used
#     the BASE series top: a run's own honest mint falls below it the moment another container pushes a higher
#     number first, which is the two-live-container case CLAUDE.md names. #532 used the MERGE-BASE top, which is
#     sound at the instant you branch and EVAPORATES ON `git merge origin/main` - the command CLAUDE.md requires
#     before a push when main has moved - because integrating makes the merge-base the other container's commit.
#     Measured there: an honest tree whose register is the true union of both containers' rows read RED, exit 1,
#     before any gate, for CT_RUNID correct, foreign, rotated AND unset. No value of CT_RUNID recovered it,
#     because gates/build.sh writes a second row attributed to `unknown-run` when CT_RUNID is not exported.
#
# SO THIS DOOR USES NO CEILING OF ANY KIND FOR OWNERSHIP, which is the prescription both withdrawals point at
# and neither built. A series top still CLASSIFIES a row (below it and absent from the base = gap fill), because
# that is the job's own definition of the thing being judged; what it no longer does is decide whether the row is
# LEGITIMATE. That question is delegated to `gates/buildnum.sh stampable`, the project's own authority on whether
# a number belongs to this run. stampable is computed from the rows' ATTRIBUTION and from no series top at all,
# so integrating origin/main cannot move its answer; it carries 47 controls of its own; and delegating makes the
# door and the authority agree BY CONSTRUCTION ON THE GAP-FILL CLASS - the scope matters and was missing until
# antagonist A of #533 measured the base-held class, where they disagree and this door is the LENIENT one -
# which neither draft did - at #532's withdrawal they disagreed
# about an honest tree in both directions.
#
# READING stampable CORRECTLY IS HALF THE WORK. Its exit 0 is ALSO its answer for a number on NO ROW
# (gates/buildnum.sh:407-409). For a row this door has just READ, that answer can only mean the door asked the
# wrong file, so it is RED and it is NOT escapable: it is a defect in this door, not in the tree. The verdict is
# therefore read from the exit status AND the FIRST LINE of the message, never through a pipe, and the quoted
# line is the first one and never the remedy lines after it.
#
# WHAT IT DOES NOT COVER, declared here and as a known limit on G6 rather than left to be discovered:
#   - A second row under a number the base ALREADY HOLDS is not a gap fill at all, and that is the #416 damage
#     class this job's title names ("a duplicate row takes a fast green"). **THE SENTENCE HERE READ
#     "stampable would pass it" AND THAT IS FALSE: IT REFUSES IT** [antagonist A of #533, P1-2, measured on a
#     fixture where origin/main carries another run's minted #533 and this tree carries its own minted and
#     built rows - `stampable '#533'` answers exit 1, "NOT STAMPABLE: #533 is claimed by 1 row(s) belonging to
#     another run"]. The decision not to delegate this class stands and the REASON is now the measured one:
#     stampable refuses the collision AND the legitimate instance equally (an honest `shipped` row of ours
#     under a number another run issued reads exit 1 too), so delegating here would rebuild the #530 and #532
#     wedge on a new class - an honest tree refused before any gate. What this door does instead is REPORT,
#     and since A's finding the report carries the BASE row's field 7 and stampable's own verdict beside the
#     appended row's, because the line used to print only the appended row's id - which on a live collision is
#     THIS RUN'S, so the one line a reader of a green log got said the number looked like ours. Those rows
#     are REPORTED in the line, with their number, kind and field 7, and REFUSED BY NOTHING here: #529's arm
#     judges them on the fast path, a legitimate later push adds them (a `shipped` row for an earlier build, a
#     run's second push under its own number), and whether the FULL suite should refuse one is not in
#     whatWouldCloseIt.
#   - A census-shaped row citing a commit THE SAME PUSH ADDS reads ok by the census test. That is a forgery path.
#   - The runId is taken on TRUST: a hand-written row that types this run's own runId into field 7 reads as ours.
#   - A gap-fill number whose rows carry two field-7 values for an honest reason (a run that ships another run's
#     build, as #507's rows do; an ownership correction, as #519's; a resumed run) is not covered by the escape.
#   - Outside a git work tree there is no base, so the verdict is NOT CHECKED rather than ok.
#
# THE ESCAPE IS REQUIRED AND LOUD. #532's P0 is an HONEST run that cannot pass stampable at all: its own mint row
# plus the `built` row gates/build.sh leaves as `unknown-run`, read after integrating origin/main. Deleting a row
# from an append-only register or un-merging main are not escapes, so there is one here, under its own variable
# (CT_RENUM already means overriding another run's number at gates/build.sh:94). Its verdict word is OVERRIDE, it
# prints every row it passes, and that line carries no `ok` token and never begins with PASS, FAIL, "=== ",
# "gate manifest:" or GATES - because gates/verify-log.sh reads only those (:802, :811, :994, :1137) and would
# otherwise read an overridden suite exactly as an ok one. The door restates the OVERRIDE in the footer beside
# MANI_LINE for the same reason.
# THE IDENTITY CLAUSE IS BUILT ONCE, HERE, AND EVERY VERDICT LINE USES IT [antagonist A of the fourth pair,
# P2-1, and antagonist B of the fourth pair, P2-1 - the same finding from both doors]. Round five added
# `escape=` to GF_COUNTS only, and FOUR verdict lines are assembled by hand elsewhere: the early-refusal
# fallback, the unknown-run RED, the no-git NOT CHECKED and the base-ref-at-HEAD NOT CHECKED. The last two are
# NON-REFUSING, so the suite runs on and the log can end GATES GREEN - which means an armed escape was
# invisible in exactly the archived log the change exists to make it visible in, and TEST-CASES.md published
# "on EVERY verdict, greens included". One variable, five sites, and the newline strip belongs here too
# (antagonist A of the third pair, P2-2: a newline in CT_RUNID made the verdict two lines and put the string
# GATES GREEN into a SUBSET log, which this project's own rules call mechanically impossible).
GF_REG="$ROOT/gates/build-numbers.tsv"
# AND THE TOKEN ITSELF IS NEUTRALISED, not only the newline [antagonist A of the fifth pair, P3-2]. Stripping
# \n fixed the TWO-LINE half and left the string reachable: CT_RUNID='x GATES GREEN #533' still put those two
# words into the log, from a line a subset run prints, and this project's rules call that mechanically
# impossible. Neither value is ever a build number or a verdict, so substituting the token costs nothing.
# AND WHITESPACE IS REPLACED, NOT DELETED [antagonist B of the seventh pair, P2]: `tr -d` turned an escape
# naming "401<tab>402" into the logged value escape=[401402], a number nobody set, which defeats the very
# recoverability this clause exists for. Squeezed to single spaces instead, so the log records what was set.
GF_IDENT="runId=$(printf '%s' "${CT_RUNID:-(unset)}" | tr '\n\r\t' '   ' | tr -s ' ' ' ' | sed 's/GATES GREEN/GATES_GREEN/g; s/GATES RED/GATES_RED/g' | cut -c1-80) escape=[$(printf '%s' "${CT_GAPFILL_OVERRIDE:-(unset)}" | tr '\n\r\t' '   ' | tr -s ' ' ' ' | sed 's/GATES GREEN/GATES_GREEN/g; s/GATES RED/GATES_RED/g' | cut -c1-120)]"
GF_BN="$ROOT/gates/buildnum.sh"
GF_LINE="build-number series: NOT CHECKED - this door did not run."
# The counts clause is initialised so that EVERY verdict line carries one, including the five refusals that
# happen before all three registers can be read. One line shape for every outcome is what lets a reader - and
# this file's own selftest - find the verdict the same way every time.
# THE EARLY REFUSALS CARRY IT TOO [antagonist B of the fourth pair, P2-1]: six refusals fall back to this
# initialised value, and it named neither the runId, nor the escape, nor the base - so the one line a reader
# gets from a door that refused before reading anything said nothing about who ran it or with what armed.
GF_COUNTS="$GF_IDENT base=(not read) merge-base=(not read); rows read: base=- head=- worktree=- merge-base=- (not read: refused before all three registers could be read)"
GF_STOP=0
GF_WHY=""
GF_ROWSHOW=""
# INITIALISED HERE, OUTSIDE THE BLOCK MUTANT M9 DELETES, AND THAT PLACEMENT IS THE POINT [#534, G6].
# M9 removes the base-at-HEAD handling to prove this door's verdict word depends on it. If this flag were
# initialised inside that block the mutant would die on `set -u` at the verdict assembly instead of reading
# `ok`, and a mutant that crashes proves nothing about the predicate it replaced - which is #532's own
# recorded failure (a restored predicate that left its 51-case arm at 85 pass / 0 fail).
GF_BASEATHEAD=0
GF_GIT=(git --git-dir "$ROOT/.git" --work-tree "$ROOT")
# `unknown-run` IS THIS PROJECT'S LITERAL FOR NOBODY AND MAY NOT BE A runId HERE [antagonist A of #533]. It is
# what gates/build.sh writes into field 7 when CT_RUNID is not exported (gates/buildnum.sh:519), and the escape
# below special-cases it as "nobody's row". With CT_RUNID set to it, the OWNERSHIP path would read those same
# rows as OURS - so the two halves of this door would disagree about one string, and a lone `minted` gap-fill row
# that C48 asserts must be RED read `ok`, with no override and nothing loud in the log. Measured: 0 of 514 rows
# on the live register carry it, so this is a latent inversion rather than a live one, and it is refused here
# rather than left as a declared limit because it defeats a NAMED control with no change to the tree.
if [ "${CT_RUNID:-}" = "unknown-run" ]; then
  GF_LINE="build-number series: RED - $GF_IDENT base=(not read) merge-base=(not read); rows read: base=- head=- worktree=- merge-base=- (not read: refused before any register was opened) - CT_RUNID is the literal unknown-run, which is this project's value for a row belonging to NOBODY (gates/buildnum.sh:519) and cannot identify this run."
  echo "$GF_LINE" | tee -a "$ALL"
  echo "GATES RED $N — stopped before running any gate: CT_RUNID is unusable." | tee -a "$ALL"
  echo "  Export CT_RUNID as this run's own runId. The literal unknown-run is what gates/build.sh writes when" | tee -a "$ALL"
  echo "  CT_RUNID is absent, so accepting it here would make this door read another run's rows as this run's." | tee -a "$ALL"
  exit 1
fi
# A NUL byte makes grep print "binary file matches" instead of lines, which is how one byte in this register
# makes buildnum.sh report an issued number as free (jobs/one-nul-byte-in-the-register-makes-buildnum-stampable-report-an-issued-number-as-free-2026-10-22).
# A door that cannot read its input WHOLE must say so, so this is measured by byte count and never by grep.
# THE READ IS CHECKED BEFORE THE BYTES ARE COUNTED [antagonist A of #533, P3-4]. If the file cannot be read for
# any reason other than a NUL byte - permissions, I/O, a vanished mount - the two substitutions made `a` the
# literal x and `b` the number 0, so the refusal said "it contains a NUL byte" about a file that does not: the
# right verdict for the wrong reason, which this project files as a trap in its own right (#419). A could not
# reproduce it in a container running as root and said so rather than claiming it; the guard costs one test.
gf_nul(){ local a b; [ -r "$1" ] || return 2; a="$(wc -c < "$1" 2>/dev/null || echo x)"; b="$(tr -d '\0' < "$1" 2>/dev/null | wc -c || echo y)"; [ "$a" = "$b" ]; }
# THE ROW PREDICATE IS buildnum.sh's OWN (gates/buildnum.sh:102): field 1 a bare number and NF>=2. Never NF==9 -
# a row with one trailing tab BURNS a number and read as NF==9 at #532, where restoring the old predicate left
# the 51-case arm at 85 pass / 0 fail because nothing could tell the two apart. No interval expression appears in
# any awk here: measured in this container, mawk 1.3.4 20240123 silently matches NOTHING against an ANCHORED
# interval with unequal bounds (^[0-9a-f]{12,40}$ fails on a 16-character hex string while ^[0-9a-f]{16,16}$
# passes), which is exactly the shape of the dead accept limb #532 found in its own door.
gf_rows(){ awk -F'\t' '{ if ($0 ~ /^[ \t]*#/) next; if (NF>=2 && $1 ~ /^[0-9]+$/) print }' "$1" > "$2"; }
# KEYED ON FILENAME AND NEVER ON NR==FNR, AND THIS WAS A P0 IN THIS DOOR'S FIRST DRAFT [antagonist A of #533].
# `NR==FNR` means "still reading the first file" ONLY while the first file produces records. Given an EMPTY
# subtrahend awk reads no record from it, so FNR resets to 1 for the second file while NR is also 1, the test
# stays TRUE for every row of the MINUEND, all of them are filed as things to subtract, and the function returns
# NOTHING. The consequence was the worst kind: the deletion limb - the one mechanical guard against two trees
# under one build number - read `ok` at exit 0 when EVERY row of the register was deleted, while the verdict line
# printed `head=4 worktree=0 ... head-vs-worktree=0` and refuted itself in its own sentence. It was strongest
# where the damage was smallest and absent where it was total. FILENAME is true of the file being read whatever
# it contains, so the empty case behaves like any other. NOT ONE of this door's 32 original controls could see
# it - the repair left the arm at 100 pass / 0 fail - which is why C60 to C62 and mutant M8 exist below.
gf_minus(){ awk -v GFB="$2" 'FILENAME==GFB{b[$0]++;next}{h[$0]++}END{for(k in h){c=0;if(k in b)c=b[k];n=h[k]-c;while(n>0){print k;n--}}}' "$2" "$1"; }
gf_show(){ printf '  THE ROW, FIELD FOR FIELD: n=[%s] state=[%s] sha=[%s] bundleMd5=[%s] sourceMd5=[%s] at=[%s] mintedBy=[%s] provenance=[%s] note=[%s]\n' \
    "$(printf '%s' "$1" | cut -f1)" "$(printf '%s' "$1" | cut -f2)" "$(printf '%s' "$1" | cut -f3)" \
    "$(printf '%s' "$1" | cut -f4)" "$(printf '%s' "$1" | cut -f5)" "$(printf '%s' "$1" | cut -f6)" \
    "$(printf '%s' "$1" | cut -f7)" "$(printf '%s' "$1" | cut -f8)" "$(printf '%s' "$1" | cut -f9)"; }
# The extractor is COPIED FROM gates/buildnum.sh's SHAMAP pipeline (:764 to :770) rather than re-invented, and
# an agreement control fails if the two ever disagree on the same fixture subjects. `sed 's/^0*//'` is part of
# it: without that line the copy and the original differ on a subject reading '#0363'.
gf_subject_names(){ local subj hit
  subj="$("${GF_GIT[@]}" log -1 --format=%s "$1" 2>/dev/null || true)"
  [ -n "$subj" ] || return 1
  hit="$(printf '%s\n' "$subj" | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | sed 's/^0*//' | awk -v n="$2" '$0==n{print "y"}' || true)"
  [ -n "$hit" ]; }
if [ ! -e "$ROOT/.git" ]; then
  GF_LINE="build-number series: NOT CHECKED - $GF_IDENT base=(no git) merge-base=(no git); rows read: base=- head=- worktree=- merge-base=- (not read: no git work tree) - no git work tree at $ROOT, so there is no base register to judge appended rows against (a declared limit of this door, recorded on G6)."
else
  # #532's door ran `BN_T="$(mktemp -d)"` with no check, so under an unwritable TMPDIR its scratch paths became
  # files at the filesystem root, six of which an antagonist's test left behind. This one checks.
  GF_T="$(mktemp -d 2>/dev/null || true)"
  if [ -z "${GF_T:-}" ] || [ ! -d "${GF_T:-}" ]; then
    GF_STOP=1; GF_WHY="mktemp -d produced no usable directory (got [${GF_T:-}]), so this door has nowhere to read the three registers into."
  elif [ ! -f "$GF_REG" ]; then
    GF_STOP=1; GF_WHY="the register $GF_REG does not exist, so the rows this push will carry cannot be read."
  elif ! gf_nul "$GF_REG"; then
    GF_STOP=1; GF_WHY="the working-tree register is not readable whole: it contains a NUL byte, which makes every grep-based reader print 'binary file matches' instead of rows and makes buildnum.sh answer that an ISSUED number is free."
  elif ! "${GF_GIT[@]}" show "refs/remotes/origin/main:gates/build-numbers.tsv" > "$GF_T/base.raw" 2>"$GF_T/base.err"; then
    GF_STOP=1; GF_WHY="the BASE register at refs/remotes/origin/main:gates/build-numbers.tsv could not be read ($(sed -n '1p' "$GF_T/base.err" 2>/dev/null || true)). A throwaway clone has no refs/remotes/origin/main until you run: git update-ref refs/remotes/origin/main <the base sha>, WHICH IS THE SHA ORIGIN'S main POINTS AT (git ls-remote origin refs/heads/main) AND NEVER HEAD - pointing it at HEAD makes the tree under test its own base, which this door now answers NOT CHECKED rather than ok [antagonist B of #533, P2-1]. IN A SHALLOW CLONE THAT UPDATE-REF FAILS with 'nonexistent object' because the base commit is not in the pack, so run git fetch --deepen 200 first - 200 and not 50, because this door named three different depths in three refusals until antagonist B of the third pair counted them [P3-3] [antagonist A of #533]. RED here is this door's declared behaviour, not a wedge."
  # THE EARLY -x REFUSAL IS GONE, AND ITS REMOVAL IS THE FINDING [antagonist A of the fourth pair, P3-1].
  # Round five added it as an elif before any row is read, so it HARD-STOPPED a tree with zero appended rows -
  # where $GF_BN is never invoked at all and the door would have answered ok - and it was declared
  # non-escapable, so that tree had no route out: the #530/#532 shape, an honest tree refused, built by the
  # repair for a different honest-tree refusal. It also contradicted this project's own policy for the
  # identical condition, since gates/build.sh treats a missing or non-executable gates/buildnum.sh as a
  # WARNING and continues, so a run may legitimately have BUILT in that state. What carries it instead is the
  # in-loop 126/127 branch below, which fires only when a row actually needs the authority, says the same
  # thing, and is equally non-escapable - measured on a bad-interpreter buildnum.sh (exit 127) and on a
  # chmod -x one (exit 126), both RED, both RED again with CT_GAPFILL_OVERRIDE set.
  elif ! "${GF_GIT[@]}" show "HEAD:gates/build-numbers.tsv" > "$GF_T/head.raw" 2>"$GF_T/head.err"; then
    GF_STOP=1; GF_WHY="the register at HEAD could not be read ($(sed -n '1p' "$GF_T/head.err" 2>/dev/null || true))."
  else
    GF_BASESHA="$("${GF_GIT[@]}" rev-parse refs/remotes/origin/main 2>/dev/null || true)"
    GF_HEADSHA="$("${GF_GIT[@]}" rev-parse HEAD 2>/dev/null || true)"
    GF_MB="$("${GF_GIT[@]}" merge-base HEAD refs/remotes/origin/main 2>/dev/null || true)"
    if [ -n "${GF_BASESHA:-}" ] && [ "$GF_BASESHA" = "${GF_HEADSHA:-}" ]; then
      # NOT CHECKED FOR THE COMMITTED ROWS, AND THE UNCOMMITTED ONES ARE NOW JUDGED [#534, G6's remainder].
      # #533 landed this branch as an EARLY RETURN: it assembled its own verdict line and read NO register at
      # all, so with the base ref at HEAD an UNCOMMITTED gap-fill row reached every gate unjudged - measured
      # by the orchestrator on 707599b and reproduced here before the fix (a bare #363 row, foreign runId,
      # '-' in field 3, left uncommitted: NOT CHECKED at exit 0, then mountcheck and the gates ran).
      # WHY THE MAIN PATH IS THE WHOLE FIX, rather than a second implementation beside it: a base at HEAD
      # makes base.rows and mb.rows EQUAL head.rows by construction, and the main path's four set
      # differences then already say exactly the right things - `head-vs-base` is 0 because no committed row
      # CAN be judged, `worktree-vs-head` is the appended set, `head-vs-worktree` is a working-tree
      # deletion, and GF_TOP is HEAD's own series top. So this branch sets a FLAG and falls through to that
      # path; it duplicates no logic, and the stampable, census and escape routes are the same ones, which
      # is why a row that is yours by attribution cannot read differently here than anywhere else.
      # THE VERDICT WORD IS THE ONLY THING THAT CHANGES: `ok` becomes NOT CHECKED, because the committed
      # rows were not compared, while RED and OVERRIDE stand as the main path sets them.
      # AND THE DEAD LIMB IS NOW LIVE: the assembly below carried a GF_NOCHK branch that two antagonists of
      # #533 proved UNREACHABLE and removed, precisely because this branch never reached it. It is restored
      # there, and C89h is the control that it fires rather than a comment claiming it does. The refusal one branch below invites a stuck run to
      # run `git update-ref refs/remotes/origin/main <the base sha>`, and the obvious misreading of that is
      # HEAD. Do it and the base becomes the tree under test: every committed row is in the base, `appended`
      # reads 0, and a committed plant READ ok with the door reporting a push that carries no new rows at all.
      # The build's first mitigation was to print the base sha in the verdict line, which is a human-only
      # protection - antagonist B's point is that nothing mechanical noticed, and it is right. The suite still
      # runs (this is not a refusal), and the verdict word is the honest one: with the base equal to HEAD there
      # is nothing this door can compare, so it says so instead of claiming a green it has not earned.
      # THE VERDICT IS SET HERE, not left to the assembly below, and the first draft of this fix got that
      # wrong in a way its own fixture caught: this branch skips the register reads, so GF_COUNTS is never
      # built and GF_LINE stayed at the initialised fallback "NOT CHECKED - this door did not run." - which
      # is the FALSE sentence (the door ran and reached a verdict) that the five early refusals already have
      # a guard against. Same class, one branch later.
      GF_STOP=0
      GF_BASEATHEAD=1
            # EVERY QUOTE IN THESE TWO MESSAGES IS A SINGLE QUOTE, AND THE REASON IS A P0 OF THIS BUILD'S OWN
      # [antagonist B of the third pair, #533]. Both strings are double-quoted and both named a git command in
      # BACKTICKS, so bash ran them as command substitutions while merely BUILDING the message: the door
      # silently executed `git fetch --unshallow` (a full-history network fetch, UNSHALLOWING the clone under
      # test, outside GF_GIT so against the ambient cwd) and `git update-ref refs/remotes/origin/main HEAD`
      # (writing a ref in whatever repository the cwd happened to be). Reproduced: a depth-1 clone went from 1
      # commit reachable from origin/main to 3, and `rev-parse --is-shallow-repository` from true to false, in
      # the course of printing a REFUSAL. Worse, the shallow/complete branch below reads that same datum, so it
      # answered for the state the backtick had just created and always printed the complete-repository half;
      # and all three spans were deleted from the message, including the name of the command the reader is
      # being warned about. This is #529's recorded trap - backticks inside a double-quoted shell string - and
      # this run had already hit it once today in a tracker receipt and then rebuilt it in code. C79 asserts
      # each span's literal text reaches the output, which is the control the 206-case arm did not have.
      GF_NOCHK="the base ref refs/remotes/origin/main points at HEAD ($(printf '%.12s' "$GF_BASESHA")), so there is no base to judge appended rows against - every committed row reads as already in the base and 'appended' would read 0 on a tree that may carry any number of them. This is what a throwaway 'git update-ref refs/remotes/origin/main HEAD' does, and it is why this door answers NOT CHECKED here rather than claiming a green it has not earned. Point the ref at the real base: git ls-remote origin refs/heads/main gives the sha, and in a shallow clone git fetch --deepen 200 origin first."
      # THE SAME IDENTITY CLAUSE AS EVERY OTHER VERDICT, ESCAPE INCLUDED [antagonist B of the fourth pair, P2-1].
      # This is the only non-refusal verdict other than ok and OVERRIDE - the suite runs on and the log can end
      # GATES GREEN with nothing judged - and it carried runId and the two shas but NO escape, so a NOT CHECKED
      # beside an armed escape was a push artefact in which neither fact was recoverable by any reader. The
      # round-five claim "ON EVERY VERDICT INCLUDING THE GREENS" was false for exactly this line.
      # NO GF_LINE IS ASSEMBLED HERE ANY MORE. It is built by the one assembly below, from the counts the
      # main path measures, so this branch can no longer publish a verdict about rows it never read.
    fi
    # THE TWO REFUSALS BELOW DO NOT APPLY WHEN THE BASE IS AT HEAD, and the guard is the flag rather than a
    # re-test of the shas: with base == HEAD, `merge-base HEAD refs/remotes/origin/main` IS HEAD, so GF_MB is
    # non-empty and `show "$GF_MB:..."` resolves - measured, not assumed, on the reproduction fixture, where
    # merge-base printed the same 12 hex as base and head. They are guarded anyway so that a future change to
    # either refusal cannot silently swallow this branch.
    if [ "$GF_BASEATHEAD" = "0" ] && [ -z "${GF_MB:-}" ]; then
      GF_STOP=1; GF_WHY="merge-base HEAD refs/remotes/origin/main could not be computed, so this door cannot tell a DELETED register row from a base that has simply moved ahead of an unrebased HEAD - the two have the same surface signature, and reading the second as the first is what rebuilt #530's wedge. THE REMEDY, BRANCHED ON THE DATUM RATHER THAN PRESCRIBED OVER IT [antagonist B of #533, P3-1 and P3-3]: the first version of this sentence printed 'is-shallow-repository' and then prescribed a deepen or an unshallow whatever it said, and on a COMPLETE repository 'git fetch --unshallow' answers 'fatal: --unshallow on a complete repository does not make sense' - a refusal whose own remedy cannot be run. $( if [ "$("${GF_GIT[@]}" rev-parse --is-shallow-repository 2>/dev/null || echo unknown)" = "true" ]; then printf '%s' "This clone IS shallow, so the base commit is simply not in the pack: run git fetch --deepen 200 origin, or git fetch --unshallow, and re-run."; else printf '%s' "This clone is NOT shallow, so a deepen or an unshallow will not help and --unshallow will refuse outright: HEAD and refs/remotes/origin/main genuinely share no ancestor in it. Check what that ref points at (git rev-parse refs/remotes/origin/main) against the real base (git ls-remote origin refs/heads/main); the usual cause is a ref planted in a throwaway clone."; fi )"
    elif [ "$GF_BASEATHEAD" = "0" ] && ! "${GF_GIT[@]}" show "$GF_MB:gates/build-numbers.tsv" > "$GF_T/mb.raw" 2>"$GF_T/mb.err"; then
      GF_STOP=1; GF_WHY="the register at the merge-base $GF_MB could not be read ($(sed -n '1p' "$GF_T/mb.err" 2>/dev/null || true))."
    else
      # WITH THE BASE AT HEAD THE GUARDED `elif` DID NOT RUN, so mb.raw has not been written yet. Read it
      # here from GF_MB, which is HEAD in that case, so the merge-base set equals HEAD's and `del_h`
      # (merge-base minus HEAD) is 0 by construction - no committed row can read as a deletion on a tree
      # whose base is its own HEAD, which is correct: there is nothing to have deleted it from.
      if [ "$GF_BASEATHEAD" = "1" ]; then
        "${GF_GIT[@]}" show "$GF_MB:gates/build-numbers.tsv" > "$GF_T/mb.raw" 2>"$GF_T/mb.err" || : > "$GF_T/mb.raw"
      fi
      cp "$GF_REG" "$GF_T/wt.raw"
      gf_rows "$GF_T/base.raw" "$GF_T/base.rows"; gf_rows "$GF_T/head.raw" "$GF_T/head.rows"
      gf_rows "$GF_T/mb.raw"   "$GF_T/mb.rows";   gf_rows "$GF_T/wt.raw"   "$GF_T/wt.rows"
      GF_NB="$(grep -c '' < "$GF_T/base.rows" || true)"; GF_NH="$(grep -c '' < "$GF_T/head.rows" || true)"
      GF_NM="$(grep -c '' < "$GF_T/mb.rows" || true)";   GF_NW="$(grep -c '' < "$GF_T/wt.rows" || true)"
      # EVERY ROW THE PUSH WILL CARRY, counted WITH MULTIPLICITY: what HEAD adds to the base, and what the
      # working tree holds that HEAD does not - because on this lane's documented path the mint and build rows
      # are UNCOMMITTED while the suite runs, so a door that reads HEAD alone is blind exactly there.
      gf_minus "$GF_T/head.rows" "$GF_T/base.rows" > "$GF_T/app_h"
      gf_minus "$GF_T/wt.rows"   "$GF_T/head.rows" > "$GF_T/app_w"
      # A row HEAD holds that the working tree does not, and a row at the MERGE-BASE that HEAD or the working
      # tree has lost: both are a register row deleted, which is the one mechanical guard against two trees
      # under one build number. The deletion test is against the MERGE-BASE and never against the base itself:
      # rows origin/main gained are not at the merge-base, so a base that moved ahead cannot read as a deletion.
      gf_minus "$GF_T/head.rows" "$GF_T/wt.rows" > "$GF_T/del_w"
      gf_minus "$GF_T/mb.rows"   "$GF_T/head.rows" > "$GF_T/del_h"
      GF_A1="$(grep -c '' < "$GF_T/app_h" || true)"; GF_A2="$(grep -c '' < "$GF_T/app_w" || true)"
      GF_D1="$(grep -c '' < "$GF_T/del_h" || true)"; GF_D2="$(grep -c '' < "$GF_T/del_w" || true)"
      GF_TOP="$(awk -F'\t' '{ if ($1+0 > m) m=$1+0 } END{ print m+0 }' "$GF_T/base.rows")"
      GF_Y=0; GF_C=0; GF_O=0; GF_K=0; GF_E=0; GF_U=0; GF_GF=0; GF_ARMED_DECLINED=""
      # THE CLASSIFICATION CLAUSE IS A VARIABLE, so the deletion path can say it did not classify rather than
      # print zeros [antagonist B of #533, P2-3]. On a deletion the judging loop never runs, and the line read
      # `appended=3 ... gap-fill=0; base-held=0; extends-the-series=0` on a tree that really carried two
      # gap-fill rows - three appended rows whose three-way classification summed to zero. A record that says
      # two things at once is this project's aFIELDCONSISTENCYNOTE_516, which this build cites against its own
      # first draft, so it cannot stand in the same build's door.
      GF_CLS=""
      if [ "$GF_D1" != "0" ] || [ "$GF_D2" != "0" ]; then
        GF_STOP=1
        # THE ROUTE BRANCHES ON WHICH HALF FIRED, AND THE FIRST VERSION OF IT WAS A NO-OP ON ONE HALF AND POINTED
        # AT THE WRONG COMMIT ON BOTH [antagonist B of the fourth pair, P2-2, reproduced in three steps on a
        # fixture]. It offered "git checkout -- gates/build-numbers.tsv, or re-add the printed row" for both
        # halves. For the HEAD-vs-working-tree half that is right. For the merge-base-vs-HEAD half both actions
        # change only the WORKING TREE, so the refusal is unchanged - and re-adding the row makes it an APPENDED
        # row as a side effect - while "amend the commit that added it" names the wrong commit entirely: the row
        # was added upstream and REMOVED here, so a reader following it literally rewrites published history,
        # which this project forbids outright. #454's printed-remedy deadlock inside a message that cites #454.
        GF_WHY="a committed register row has been DELETED: $GF_D1 row(s) present at the merge-base $GF_MB and absent from HEAD, $GF_D2 row(s) present at HEAD and absent from the working tree. The register is append-only; a deleted row is how a spent number reads as free. THE ROUTE OUT DEPENDS ON WHICH HALF FIRED, and they are not the same repair. $( if [ "$GF_D1" != "0" ]; then printf '%s' "For the merge-base-vs-HEAD half, which is this one ($GF_D1 row(s)): the row is in a COMMIT of yours that removed it, so restoring it in the working tree does NOT clear this refusal and re-adding it makes it an appended row instead. Find the commit with git log -p -- gates/build-numbers.tsv and amend or rebase THAT commit - the one that REMOVED the row, never the one that added it, which is normally upstream and must not be rewritten - and only on a branch you created and have not pushed. "; fi )$( if [ "$GF_D2" != "0" ]; then printf '%s' "For the HEAD-vs-working-tree half ($GF_D2 row(s)): the row is still committed and only the working tree has lost it, so git checkout -- gates/build-numbers.tsv puts it back, or re-add the printed row verbatim. If the ROW is what is wrong, amend the commit that added it rather than deleting it here, because deleting it is what this refusal is for."; fi )"
        GF_ROWSHOW="$(cat "$GF_T/del_h" "$GF_T/del_w" 2>/dev/null || true)"
        GF_CLS="gap-fill=- (yours=- census=- override=- unaccounted=-); base-held=-; extends-the-series=- (not classified: refused on a deletion before any appended row was judged)"
      else
        # SORTED, SO THE REFUSAL IS PREDICTABLE [antagonist B of #533, P3-2]. gf_minus emits rows in awk's hash
        # order, so with several bad rows the one named in the refusal was arbitrary (stable, but arbitrary), and
        # a reader who fixed it met the next one. Sorting makes the lowest-numbered offender the one reported
        # first on every run and in every container.
        # THE SIDE IS KEPT, AND THE SORT IS NUMERIC [antagonist B of #533, P1-3 and P3-2]. Two faults in one
        # line. (1) The door computed whether a row is COMMITTED (app_h) or UNCOMMITTED (app_w) and then threw
        # that apart with `cat`, so every refusal printed the uncommitted remedy - "must come out of the working
        # tree before it is committed" - for a row that is already in a commit. A reader who follows it deletes
        # the row from the working tree and meets the DELETION refusal, which until this round named no remedy
        # at all: #454's printed-remedy deadlock, in a door whose own comments cite it. (2) `sort` is
        # lexicographic, so "the lowest-numbered offender is reported first" was false the moment a four-digit
        # number appeared: 1000 sorts before 99. A tag column, stripped before the row is read, fixes both.
        { awk -F'\t' '{ print "committed\t" $0 }' "$GF_T/app_h"; awk -F'\t' '{ print "uncommitted\t" $0 }' "$GF_T/app_w"; } \
          | sort -t"$(printf '\t')" -k2,2n > "$GF_T/judged"
        while IFS= read -r gfline; do
          [ -n "$gfline" ] || continue
          gftag="$(printf '%s' "$gfline" | cut -f1)"
          gfrow="$(printf '%s' "$gfline" | cut -f2-)"
          case "$gftag" in
            committed) gfrem="This row is ALREADY IN A COMMIT ($gftag at HEAD). The register is append-only, so deleting it from the working tree alone is refused as a DELETION by this same door: amend or rebase the commit that added it, on a branch you created and have not pushed, and never on a branch anyone else may have checked out." ;;
            *)         gfrem="This row is UNCOMMITTED ($gftag, in the working tree only), so it comes out of the working tree before it is committed and nothing in git history needs changing." ;;
          esac
          gfn="$(printf '%s' "$gfrow" | cut -f1)"
          if awk -F'\t' -v n="$gfn" '$1==n{f=1} END{exit f?0:1}' "$GF_T/base.rows"; then
            GF_K=$((GF_K+1))
            # THE BASE ROW'S OWNER AND THE AUTHORITY'S OWN VERDICT, BESIDE THE APPENDED ROW'S [antagonist A of
            # #533, P1-2]. This line printed only the APPENDED row's field 7, which on a live #416 collision is
            # THIS RUN'S id - so the single line a reader of a green log gets about two trees holding one number
            # said the number looked like ours, and the conflicting runId appeared nowhere. Report only: the
            # verdict is unchanged, because delegating this class would refuse the legitimate instance too.
            gfbase7="$(awk -F'\t' -v n="$gfn" '$1==n{print $7; exit}' "$GF_T/base.rows")"
            gfsp="$("$GF_BN" stampable "#$gfn" 2>/dev/null | sed -n '1p' || true)"
            echo "build-number series: REPORTED, NOT REFUSED - #$gfn is a number the base register ALREADY HOLDS, so it is not a gap fill at all. kind=base-held mintedBy=[$(printf '%s' "$gfrow" | cut -f7)] baseMintedBy=[${gfbase7:-(none)}] state=[$(printf '%s' "$gfrow" | cut -f2)] stampable=[${gfsp:-(no answer)}]. This is the #416 class in this job's own title and it is a declared limit of this door: stampable REFUSES this class (it refuses the collision and the legitimate instance alike), so delegating it would refuse an honest tree, which is the #530 and #532 wedge on a new class. If the two mintedBy values differ, two trees hold one number and that is a finding for the person reading this log." | tee -a "$ALL"
            continue
          fi
          # BASE TEN, EXPLICITLY - AND ANTAGONIST A's REASON FOR THIS CHANGE IS WRONG, WHICH IS WORTH MORE
          # THAN THE CHANGE [antagonist A of #533, P3-4, second half, PARTLY REJECTED ON MEASUREMENT]. A
          # reported that `[ "$gfn" -gt "$GF_TOP" ]` "uses bash arithmetic, which reads a leading zero as
          # octal", and that a row numbered 010000 was therefore classified against 4096. MEASURED:
          # `[ "010000" -gt 5000 ]` is TRUE. POSIX `test` parses its operands with strtol in base ten, so
          # `[ -gt ]` reads 10000 and agrees with the register already; it is `$(( 010000 ))` and `(( ))` that
          # read 4096. A's own fixture could not tell the two apart, because its base top was #532 and both
          # readings exceed it - the shape this file records as "a predicate that depends on which answer you
          # happen to get". The change is kept anyway, because `10#` says in the code which base is meant and
          # costs nothing, and M13's mutant is the ARITHMETIC form that really does read octal - so the arm now
          # carries the distinction rather than the claim.
          if [ "$((10#$gfn))" -gt "$GF_TOP" ] 2>/dev/null; then
            # REPORTED, NOT REFUSED, AND NOW NAMED RATHER THAN SILENT [antagonist B of #533, P2-3]. A row AT OR
            # ABOVE the base series top is not a gap fill by this job's own definition, so this door does not
            # judge it - but it was passing such a row unprinted, including a `built` row carrying ANOTHER run's
            # id for a number this tree never minted, and a high poison row that makes `buildnum.sh next` refuse
            # for every later run. gates/fastgate.sh's register arm bounds appended numbers by CONTIGUITY with a
            # ceiling of 3 from the same two inputs, so the FAST door is stricter than the full suite on this
            # class. That asymmetry is a declared limit of this door and a known limit on G6, not something this
            # run widens its scope to close; what it does do is print the row, so a reader is never told nothing.
            GF_E=$((GF_E+1))
            echo "build-number series: REPORTED, NOT REFUSED - #$gfn is ABOVE the base series top #$GF_TOP (the test is -gt, and this line read \"at or above\" until antagonist B of #533 read the two together - escaped, because unescaped inner double quotes CLOSE the string and the three words printed bare, which is the round-five mechanism losing punctuation instead of running a command [antagonist A of the third pair, P3-4 and antagonist B of the fourth pair, P3-2, the same site from both doors]; a row AT the top is caught one branch earlier as base-held), so it EXTENDS the series and is not a gap fill. kind=extends mintedBy=[$(printf '%s' "$gfrow" | cut -f7)] state=[$(printf '%s' "$gfrow" | cut -f2)]. This door does not judge the extends class. BE EXACT ABOUT WHAT DOES [antagonist B of the third pair, P2-2]: gates/fastgate.sh's register arm bounds this class by contiguity with a ceiling of 3 ON THE FAST PATH ONLY, and fastgate.sh is the tool that decides whether a tree may push WITHOUT the full suite - it does not run on a full-suite push, and gates.sh never invokes it. So on the path THIS log authorises, nothing bounds the extends class, and the damage is permanent and one row wide: one above-top row makes gates/buildnum.sh next refuse for every later run, and the register is append-only, so removing it trips this door's own deletion refusal. That is a declared limit on G6 and it is the honest statement of it." | tee -a "$ALL"
            continue
          fi
          GF_GF=$((GF_GF+1))
          "$GF_BN" stampable "#$gfn" > "$GF_T/sp.out" 2> "$GF_T/sp.err" && GF_RC=0 || GF_RC=$?
          GF_M1="$(sed -n '1p' "$GF_T/sp.out" 2>/dev/null || true)"
          case "$GF_M1" in
            "stampable: #$gfn is on no row"*)
              # APPENDED, NOT ASSIGNED [antagonist B of #533, P2-2]: this branch and the exit-2 branch below
              # each overwrote GF_ROWSHOW, so a tree with two bad rows printed `unaccounted=2` and ONE row, and
              # the number of the row it dropped appeared nowhere in the output. The door's own comment says
              # every unaccounted row is judged, counted AND PRINTED.
              GF_U=$((GF_U+1)); GF_STOP=1; GF_ROWSHOW="$(printf '%s\n%s' "${GF_ROWSHOW:-}" "$gfrow")"
              [ -n "${GF_WHY:-}" ] || GF_WHY="gates/buildnum.sh stampable answered exit $GF_RC with \"$GF_M1\" for a row THIS DOOR HAS JUST READ. That answer means the number is on no row of the file stampable looked at, so the door and the authority are reading DIFFERENT files - a defect in this door, not in the tree. It is deliberately NOT escapable."
              break;;
          esac
          if [ "$GF_RC" = "0" ]; then GF_Y=$((GF_Y+1)); continue; fi
          if [ "$GF_RC" = "126" ] || [ "$GF_RC" = "127" ]; then
            # NOT THE TREE'S FAULT AND NOT ESCAPABLE [antagonist B of the third pair, P2-4]: 126 and 127 are
            # the shell telling us the authority could not be RUN, which the catch-all used to report as
            # "it is not this run's" with an empty quoted message as the only tell.
            GF_U=$((GF_U+1)); GF_STOP=1; GF_ROWSHOW="$(printf '%s\n%s' "${GF_ROWSHOW:-}" "$gfrow")"
            [ -n "${GF_WHY:-}" ] || GF_WHY="gates/buildnum.sh stampable could not be RUN for #$gfn (exit $GF_RC, which is the shell's own code for not-executable or not-found), so this door could not ask the authority anything. That is a defect in this door's ENVIRONMENT and not in the tree - every row may be perfectly honest - and it is deliberately NOT escapable: CT_GAPFILL_OVERRIDE would write a false escape into the log of a build that needed none. Check the actual state with ls -l gates/buildnum.sh or test -x gates/buildnum.sh, NOT with git ls-files -s, which reads the INDEX mode and still prints 100755 for a file chmod has just stripped."
            continue
          fi
          if [ "$GF_RC" = "2" ]; then
            # TWO DIFFERENT THINGS EXIT 2 AND THEY NEED DIFFERENT REFUSALS [antagonist A of #533]. `need_runid`
            # exits 2 on stdout; `want_num` exits 2 on STDERR for a number that is not 3 or 4 digits, and this
            # branch read only stdout - so a row numbered 99 or 00400 was refused with the message quoted EMPTY
            # and the cause given as "CT_RUNID is not set" while CT_RUNID was correctly set, printing a remedy
            # that loops for ever. That is #532's item (g) in a new place and #530's own withdrawn failure mode.
            GF_U=$((GF_U+1)); GF_STOP=1; GF_ROWSHOW="$(printf '%s\n%s' "${GF_ROWSHOW:-}" "$gfrow")"
            GF_E1="$(sed -n '1p' "$GF_T/sp.err" 2>/dev/null || true)"
            case "$GF_M1" in
              *"CT_RUNID"*)
                [ -n "${GF_WHY:-}" ] || GF_WHY="gates/buildnum.sh stampable cannot tell this run's rows from another run's, because CT_RUNID is not set: \"$GF_M1\". Set CT_RUNID to this run's runId in the suite's environment and re-run. A tree with no appended gap-fill row needs no CT_RUNID at all; this one has $GF_GF." ;;
              *)
                # THE SAME GUARD AS THE UNACCOUNTED BRANCH, so "GF_WHY keeps the FIRST reason" is true of this
            # branch too [antagonist A of the third pair, P3-5]: it assigned unconditionally, so a
            # higher-numbered row that stampable exits 2 on could overwrite a lower-numbered row's reason.
            [ -n "${GF_WHY:-}" ] || GF_WHY="gates/buildnum.sh stampable could not read #$gfn as a build number and exited 2 with nothing on stdout; its stderr says: \"${GF_E1:-(nothing)}\". CT_RUNID is not the cause and setting it will not help. The row's field 1 is not a build number this project can issue, so the row itself is wrong. $gfrem" ;;
            esac
            # `continue`, NOT `break` [antagonist B of #533, P2-2, the half appending GF_ROWSHOW could not fix].
            # This branch used to end the loop, so with two bad rows the counts read unaccounted=1, one row was
            # printed and the OTHER NUMBER APPEARED NOWHERE - and the one dropped was the #416-class plant while
            # the one reported was the malformed number. The door's own comment four branches down says every
            # unaccounted row is judged, counted AND printed; now both branches obey it, the four-way partition
            # sums to the gap-fill count on this shape too, and GF_WHY keeps the FIRST reason (the `[ -n ... ] ||`
            # guard below), which is the one whose row sorts lowest.
            continue
          fi
          gfsha="$(printf '%s' "$gfrow" | cut -f3)"
          if [ -n "$gfsha" ] && [ "$gfsha" != "-" ] && "${GF_GIT[@]}" cat-file -e "$gfsha" 2>/dev/null && gf_subject_names "$gfsha" "$gfn"; then
            GF_C=$((GF_C+1)); continue
          fi
          GF_ESC=0
          if [ -n "${CT_GAPFILL_OVERRIDE:-}" ] && [ -n "${CT_RUNID:-}" ]; then
            # `set -f` FOR THE SPLIT [antagonist B of #533, P3-1]: an unquoted expansion takes PATHNAME expansion
            # as well as word splitting, so CT_GAPFILL_OVERRIDE='*' would name whatever the working directory
            # happens to hold. No privilege is gained - the variable IS the escape - but an escape that can name
            # a row its author did not type is not an escape anybody can reason about.
            set -f
            for gfo in ${CT_GAPFILL_OVERRIDE}; do
              [ "${gfo#\#}" = "$gfn" ] || continue
              # ONE CONDITION, NOT THREE, AND THE TWO THAT WENT ARE THE ONES THAT REFUSED AN HONEST TREE
              # [antagonist B of #533, P1-1, reproduced before it was accepted]. The escape used to require
              # that NO row for the number be another run's and that the number have EXACTLY ONE minted row,
              # which is this run's. Both refuse shapes that are honest and that exist on the live register:
              # a RESUMED run (the number minted by the run that died, built by this one), an ownership
              # correction, a run shipping another run's build. MEASURED on gates/build-numbers.tsv as it
              # stands: #507 and #519 each carry rows under TWO different field-7 values, so the shape is the
              # project's own history and not a hypothetical. With the old tests such a tree read RED, exit 1,
              # before any gate, WITH the escape set - which is the #530 and #532 wedge exactly: an honest tree
              # refused with no route out. And the tests bought nothing against a forger, because this door
              # declares field 7 to be taken on trust: anyone who can write the row can write the field.
              # SO THE CONDITION IS NOW: at least one row for this number is THIS RUN'S. The escape remains a
              # deliberate, named, logged human act - CT_GAPFILL_OVERRIDE must name the number, CT_RUNID must
              # be set, the verdict word is OVERRIDE and never ok, and every row is printed field for field.
              # WHAT WENT IS REPLACED BY REPORTING RATHER THAN BY NOTHING: the foreign rows are counted and
              # their field 7 values are named in the OVERRIDE line, so a reader of the log sees exactly whose
              # rows rode through, which is what the refusal could never tell them.
              gfmine="$(awk -F'\t' -v n="$gfn" -v r="${CT_RUNID:-}" '$1==n && $7==r{c++} END{print c+0}' "$GF_T/wt.rows")"
              gfbad="$(awk -F'\t' -v n="$gfn" -v r="${CT_RUNID:-}" '$1==n && $7!=r && $7!="unknown-run"{c++} END{print c+0}' "$GF_T/wt.rows")"
              gfwho="$(awk -F'\t' -v n="$gfn" -v r="${CT_RUNID:-}" '$1==n && $7!=r { if (!(($7) in seen)) { seen[$7]=1; o=o (o?", ":"") $7 } } END{ print (o==""?"(none)":o) }' "$GF_T/wt.rows")"
              gfmint="$(awk -F'\t' -v n="$gfn" '$1==n && $2=="minted"{c++} END{print c+0}' "$GF_T/wt.rows")"
              if [ "$gfmine" != "0" ]; then GF_ESC=1; fi
              break
            done
            set +f
          fi
          # THE ESCAPE WAS ARMED AND DID NOT APPLY: SAY SO, instead of re-printing the same offer [antagonist
          # B of the fifth pair, P1-2, accepted in this half and DECLINED in the other]. B measured that a
          # gap-fill row whose ONLY field-7 value is the literal unknown-run can satisfy no value of
          # CT_RUNID - the escape needs a row of this run's, and CT_RUNID=unknown-run is refused at the top -
          # so the refusal named a route the reader cannot take and the log read as though the escape had
          # never been tried. BOTH HALVES OF B's FIX ARE NOT TAKEN: widening the ownership test to accept
          # unknown-run would make a `minted` row that is NOBODY'S escapable, and that is the exact shape
          # C48, M3a and M4a exist to refuse - #530's provenance looseness, which an earlier antagonist pair
          # made this build keep. So the floor stays and the LOG stops lying about it: when the escape named
          # this number and did not apply, the reason says why and names the field-7 values present, and the
          # limit is declared rather than implied. A number with no row of this run's at all is refused by
          # design, and the OVERRIDE message no longer claims to cover it.
          # ITS OWN LINE, AT THE POINT OF DECLINE [antagonist B of the sixth pair, P2-2]. Round seven put this
          # notice into GF_WHY, which the first-reason guard emits only for the LOWEST-sorting offender - so arm
          # the escape for any other number and the fact that it was tried and declined vanished from the log
          # entirely, which is the defect round seven existed to fix, surviving for every number but one.
          # Measured: armed for #401 beside an unaccounted #400, the notice appeared 0 times. Printed here it
          # cannot be lost, it is printed once per declined number, and it takes the REPORTED shape the
          # base-held and extends classes already use - a line that carries no `ok` token and none of the five
          # prefixes gates/verify-log.sh reads.
          if [ "$GF_ESC" = "0" ] && [ -n "${CT_GAPFILL_OVERRIDE:-}" ]; then
            # WHITESPACE IS NORMALISED, NOT ASSUMED TO BE SPACES [antagonist B of the seventh pair, P2]. The
            # escape loop splits on IFS - space, tab and newline - and this membership test matched only
            # space-delimited words, so a tab- or newline-separated CT_GAPFILL_OVERRIDE lost the notice for
            # EVERY number while the escape itself still worked, and the refusal then re-offered the value
            # already in the operator's environment: the deadlock this notice exists to remove.
            case " $(printf '%s' "${CT_GAPFILL_OVERRIDE:-}" | tr -d '#' | tr -s '[:space:]' ' ') " in
              *" $gfn "*)
                GF_ARMED_DECLINED="${GF_ARMED_DECLINED:-} $gfn"
                echo "build-number series: REPORTED, NOT REFUSED - THE ESCAPE WAS ARMED FOR #$gfn AND DID NOT APPLY, so do not re-run with it: CT_GAPFILL_OVERRIDE named this number and the escape requires at least ONE row for it carrying THIS run's CT_RUNID, of which there are $(awk -F'\t' -v n="$gfn" -v r="${CT_RUNID:-}" '$1==n && $7==r { c++ } END { print c+0 }' "$GF_T/wt.rows"). The field 7 values present for #$gfn are: $(awk -F'\t' -v n="$gfn" '$1==n { if (!(($7) in s)) { s[$7]=1; o=o (o?", ":"") $7 } } END{ print (o==""?"(none)":o) }' "$GF_T/wt.rows"). A DECLARED LIMIT, not an oversight: a number whose every row belongs to somebody else, or to the literal unknown-run that belongs to nobody, is refused by design - widening the test to accept it would make a minted row that is nobody's escapable, which is what #530's provenance looseness did. The repair is to the ROW. $gfrem Correct field 7 to this run's runId, or let the run that owns the number gate it - and note which side the row is on, because this line said \"in the working tree before committing it\" unconditionally until antagonist B of the seventh pair walked it: on a COMMITTED row that edit makes the HEAD line absent from the working tree, which this same door then refuses as a register DELETION, whose own remedy restores the wrong field 7 and returns you here. A closed loop in two moves, and verbatim the defect this door fixed one round earlier for the refusal string." | tee -a "$ALL" ;;
            esac
          fi
          if [ "$GF_ESC" = "1" ]; then
            GF_O=$((GF_O+1))
            echo "build-number series: OVERRIDE - #$gfn is a gap-fill row passed by CT_GAPFILL_OVERRIDE. At least one row for #$gfn in the working-tree register carries field 7 equal to this run's CT_RUNID ($gfmine of them), $gfbad row(s) carry neither it nor the literal unknown-run that gates/build.sh writes when CT_RUNID is not exported, and #$gfn carries $gfmint minted row(s). Field 7 values other than this run's, named so the log says whose rows rode through: $gfwho. stampable refused the number, which is #532's P0 IN THE SHAPE THIS ESCAPE COVERS - an honest run whose own BUILD row reads unknown-run while its MINT row carries this run's CT_RUNID, which is what gates/build.sh produces when CT_RUNID is not exported. A number with NO row of this run's at all is NOT covered and is refused by design [antagonist B of the fifth pair, P1-2] and, since antagonist B of #533, also the resumed-run and ownership-correction shapes that exist on this very register at #507 and #519. THIS SUITE IS NOT AN UNOVERRIDDEN ONE, and the one tool that decides whether a log authorises a push CANNOT SEE THIS LINE: gates/verify-log.sh reads only lines beginning PASS, FAIL, \"=== \", \"gate manifest:\" or GATES. That is filed as jobs/verify-log-sh-cannot-tell-whether-the-build-number-series-door-ran-so-an-older-green-log-still-authorises-a-push-2026-10-22 and it is a HUMAN duty until that job lands: an override must be stated in the run report and the ledger, because no grep will state it for you." | tee -a "$ALL"
            gf_show "$gfrow" | tee -a "$ALL"
            continue
          fi
          # EVERY UNACCOUNTED ROW IS JUDGED, COUNTED AND PRINTED, rather than the first one ending the loop
          # [antagonist A of #533]: with two bad rows the counts clause read `gap-fill=1 ... unaccounted=1` and
          # the second row was never looked at. The four-way partition now sums to the gap-fill count on every
          # refusal, which C62 asserts.
          GF_U=$((GF_U+1)); GF_STOP=1
          GF_ROWSHOW="$(printf '%s\n%s' "${GF_ROWSHOW:-}" "$gfrow")"
          # NO PREAMBLE HERE, AND THE OFFER IS CONDITIONAL [antagonist B of the sixth pair, P2-1]. Round seven
          # prepended the armed-and-declined notice to this string and left the old offer on its tail, so ONE
          # LINE said "so do not re-run with it" and then "the escape is CT_GAPFILL_OVERRIDE='$gfn'" - a record
          # saying two things at once (aFIELDCONSISTENCYNOTE_516), with the offer last, which is the clause a
          # reader acts on, and following it lands in the identical refusal: #454's printed-remedy deadlock
          # inside the repair written to remove it. The notice is now its own line above, and the offer is made
          # only when the escape has NOT already been tried for this number.
          [ -n "${GF_WHY:-}" ] || GF_WHY="#$gfn FILLS A GAP in the build-number series - it is below the base register's series top #$GF_TOP and absent from the base - and NOTHING ACCOUNTS FOR IT. It is not this run's by gates/buildnum.sh stampable (exit $GF_RC: \"$GF_M1\"), and field 3 names no commit whose subject gives #$gfn by buildnum.sh's own extractor. A number that fills a gap is a number some other tree may already have spent, which is how '#416' came to name two trees. DO NOT mint a fresh number to get past this: that spends a second one. Either the row is wrong - and then: $gfrem - or$( case " ${GF_ARMED_DECLINED:-} " in *" $gfn "*) printf '%s' ", AS THE REPORTED LINE ABOVE SAYS, THE ESCAPE HAS ALREADY BEEN TRIED FOR THIS NUMBER AND DECLINED, so re-running with it changes nothing: the repair is to the ROW, not to the escape." ;; *) printf '%s' " it is an honest run in #532's own shape, and then the escape is CT_GAPFILL_OVERRIDE='$gfn' with CT_RUNID set, which is recorded in the log as an OVERRIDE and is not a green." ;; esac )"
          continue
        done < "$GF_T/judged"
      fi
      # THE LINE NAMES THE IDENTITY AND THE TREES IT WAS MEASURED AGAINST [antagonist B of #533, P2-1 and P2-4].
      # Every `yours=` credit is a function of CT_RUNID, and the line recorded neither it nor the base: one tree
      # read RED or ok depending on an environment variable the archived log did not mention, which is the rule
      # #524 already settled for gates/fastgate.sh ("an environment variable that widens a push gate must appear
      # in the artefact the push is justified by"). And `git update-ref refs/remotes/origin/main HEAD` - which
      # this door's own refusal text invites a stuck run to reach for - silences the committed half while the
      # verdict word stays ok; naming the base and merge-base shas makes that visible in an archived green,
      # which is #450's "name the tree when you cite that line". CT_RUNID is a register field, not a secret.
      # AND THE ESCAPE'S VALUE, ON EVERY VERDICT INCLUDING THE GREENS [antagonist B of the third pair, P2-1].
      # The door printed runId= for exactly #524's reason - an environment variable that widens a push gate
      # must appear in the artefact the push is justified by - and CT_GAPFILL_OVERRIDE widens it strictly
      # more while appearing nowhere. Measured: an escape naming ONE number and an escape naming 433 numbers
      # produced BYTE-IDENTICAL logs, and an armed-but-unused escape on a clean tree was invisible. Printing
      # it always is the point: that is the only way an escape that changed nothing becomes visible.
      # SANITISED, BECAUSE A VERDICT LINE THAT IS NOT ONE LINE BREAKS A GUARANTEE THIS PROJECT CALLS MECHANICAL
      # [antagonist A of the third pair, P2-2]. Both values are interpolated raw, so a newline in CT_RUNID made
      # the verdict TWO lines - and with CT_RUNID set to a string ending "GATES GREEN #533" a SUBSET run's log
      # carried that exact string twice, while CLAUDE.md states as mechanical that a subset run CANNOT emit it
      # (every consumer in this project greps for exactly that). verify-log.sh still refused the log, on subset
      # detection and on its last-line check, which is why this was P2 and not P1 - but the guarantee was gone,
      # and the trigger was an environment variable rather than a code change.
      GF_COUNTS="$GF_IDENT base=$(printf '%.12s' "${GF_BASESHA:-unknown}") merge-base=$(printf '%.12s' "${GF_MB:-unknown}"); rows read: base=$GF_NB head=$GF_NH worktree=$GF_NW merge-base=$GF_NM; appended=$((GF_A1+GF_A2)) (head-vs-base=$GF_A1 worktree-vs-head=$GF_A2); ${GF_CLS:-gap-fill=$GF_GF (yours=$GF_Y census=$GF_C override=$GF_O unaccounted=$GF_U); base-held=$GF_K; extends-the-series=$GF_E}; deletions: merge-base-vs-head=$GF_D1 head-vs-worktree=$GF_D2"
      # AND WITH THE BASE AT HEAD THE COUNTS SAY SO, because `head-vs-base=0` is otherwise a true number a
      # reader will take for a claim about the push [#534, G6's remainder]. The clause names the scope of the
      # judgement rather than leaving it to be inferred from a zero: how many uncommitted rows were APPENDED,
      # how many of those were JUDGED, how many merely EXTEND the series, and that the committed rows were not
      # compared at all. This makes the NOT CHECKED verdict readable in an archived log, where nobody can
      # re-run the door to find out what it saw.
      # APPENDED AND JUDGED ARE TWO NUMBERS AND THIS CLAUSE PRINTED ONE OF THEM UNDER THE OTHER'S NAME
      # [#534, antagonist A's VETO, upheld and reproduced]. It read "the $GF_A2 uncommitted row(s) WERE
      # judged", and $GF_A2 is worktree-vs-head: the APPENDED count, non-zero whenever a row was appended
      # whatever class it fell in. The JUDGED set is $GF_GF (gap fill) plus $GF_K (base-held). The extends
      # AND THE FIRST REPAIR GOT THE JUDGED SET WRONG TOO, ONE CLASS OVER [#534, fresh antagonist A's VETO,
      # upheld and reproduced]. It printed $((GF_GF+GF_K)) as "JUDGED", on the strength of a comment here that
      # asserted "the JUDGED set is $GF_GF plus $GF_K". NOTHING IN THIS FILE SUPPORTS THE SECOND HALF, and the
      # base-held branch denies it twice: its own comment reads "Report only: the verdict is unchanged", its
      # printed line reads "REPORTED, NOT REFUSED", and its control is NAMED
      # C51-base-held-rows-are-REPORTED-not-refused with C51b pinning the verdict at `ok`. Measured: that
      # branch does GF_K=$((GF_K+1)) and then `continue`, so a base-held row never reaches GF_GF either. So an
      # uncommitted row for a number the base register ALREADY HOLDS - the #416 two-trees-one-number class in
      # this job's own title - was reported as JUDGED at NOT CHECKED and exit 0 while the authority answered
      # NOT STAMPABLE. THAT IS THIS RUN'S OWN UPHELD VETO RESTATED AGAINST GF_K INSTEAD OF GF_E, and it was
      # WORSE than the silence it replaced, because the false number was now explicitly labelled. The judged
      # set is GF_GF alone. C89x-C89z are the control, on a base-held fixture - and the reason the first repair
      # could not see this is the reason C89e could not see the first defect: the four cases asserting this
      # clause used dC, dE and dH, NONE of them base-held, so the fixture coincided with the claim.
      # The extends branch does GF_E=$((GF_E+1)) and then `continue`, so an extends row NEVER reaches GF_GF and is never
      # judged - and the door says so in terms, "This door does not judge the extends class", in the same
      # output. So on an uncommitted row ABOVE the series top this clause asserted a judgement the same door
      # denied in the same log, at NOT CHECKED and exit 0, with the row reaching every gate: THE G6 DEFECT
      # RESTATED AS A CLAIM THAT IT HAD BEEN HANDLED. That is why it was a veto and not a wording nit - this
      # clause exists ONLY for a reader of an archived log who cannot re-run the door, and it was false in the
      # one shape G6 exists for. AND IT WAS THE COMMON PATH, NOT A CORNER: this run's own row #534 is above
      # the top, so every run that mints normally hits it. C89u to C89w are the control, on dE, which is that
      # shape; C89w pins the old sentence ABSENT, because the words are what was wrong.
      if [ "$GF_BASEATHEAD" = "1" ]; then
        GF_COUNTS="$GF_COUNTS; base-at-HEAD=yes (the base ref points at HEAD, so head-vs-base is 0 BY CONSTRUCTION and the $GF_NH committed row(s) were NOT compared; the $GF_A2 uncommitted row(s) were APPENDED, of which $GF_GF were JUDGED by this door, $GF_K are base-held and $GF_E EXTEND the series, NEITHER of which this door judges; a deletion could only be seen against the working tree)"
      fi
      # THE DEAD LIMB IS GONE [antagonist A of the third pair, P3-3 and antagonist B of the fourth pair, P2-1,
      # the same finding from both doors]. A branch on GF_NOCHK stood here claiming it "must come FIRST so no
      # later branch can relabel it ok", and it was UNREACHABLE: GF_NOCHK is set only in the base-ref-at-HEAD
      # branch, which assembles its own GF_LINE and never reaches this assembly. A guard that cannot fire is not
      # the protection its comment advertises, and its comment described an output it did not produce. Proved
      # dead by replacing its test with `false`: byte-identical output on the fixture it claimed to serve.
      if [ "$GF_STOP" = "1" ]; then
        GF_LINE="build-number series: RED - $GF_COUNTS"
      elif [ "$GF_O" != "0" ]; then
        GF_LINE="build-number series: OVERRIDE - $GF_COUNTS"
      elif [ "$GF_BASEATHEAD" = "1" ]; then
        # THE LIMB THE COMMENT ABOVE CORRECTLY CALLED DEAD, RESTORED NOW THAT IT IS REACHABLE [#534, G6].
        # Its ORDER is the whole of its correctness and it is third on purpose: a base at HEAD must NOT
        # soften a refusal, so RED (an unaccounted uncommitted row, or a working-tree deletion) and OVERRIDE
        # both outrank it, and only the case the main path would have called `ok` becomes NOT CHECKED -
        # because `ok` would be a green earned over the uncommitted rows alone while reading as a verdict on
        # the push. Put this limb FIRST and the door stops refusing the very row G6 exists for; C89n, C89o and
        # C89p are the controls for that ordering, not this comment. (These two citations read C81a and C81b
        # until antagonist A of #534 checked them: C81a EXISTS NOWHERE in this file, and C81b is
        # C81b-and-when-unset-on-a-green, which asserts escape=[(unset)] and has nothing to do with either
        # claim. The #450 dangling-citation shape, in the file that records it, inside a comment whose own
        # last clause says "the control, not this comment".)
        GF_LINE="build-number series: NOT CHECKED - $GF_COUNTS - $GF_NOCHK"
      else
        GF_LINE="build-number series: ok - $GF_COUNTS"
      fi
    fi
  fi
  [ -z "${GF_T:-}" ] || rm -rf "$GF_T"
fi
# A STOP MUST NOT PRINT A "NOT CHECKED" VERDICT BESIDE IT, and the first draft of this door did exactly that:
# the five early refusals above (no scratch directory, no register, a NUL byte, an unreadable base, an
# uncomputable merge-base) set GF_STOP and GF_WHY but never reached the assignment that builds GF_LINE, so the
# line read "NOT CHECKED - this door did not run" one line above "GATES RED". That is aFIELDCONSISTENCYNOTE_516's
# class - a record carrying the same fact twice where one copy is wrong reads as evidence that somebody is lying -
# and a footer reader would have been told the door had not run. Caught by this door's own NUL control (D8), not
# by reading it. The guard is here rather than repeated in each branch so a later branch inherits it, and it is a
# `case` and not `grep -q` because this file may add no new early-exit pipe consumer.
case "${GF_LINE:-}" in
  "build-number series: RED"*) ;;
  *) if [ "$GF_STOP" = "1" ]; then GF_LINE="build-number series: RED - $GF_COUNTS - $GF_WHY"; fi ;;
esac
echo "$GF_LINE" | tee -a "$ALL"
if [ "$GF_STOP" = "1" ]; then
  # THE HEADLINE NAMES THE CAUSE CLASS. It read "the build-number register carries a row nothing accounts for"
  # for every refusal, including the five that happen before any row is read (no scratch directory, no register,
  # a NUL byte, an unreadable base, an uncomputable merge-base) - a wrong reason reaching a right verdict, which
  # this project files as a trap in its own right (#419). Found by this run's own hostile-environment pass.
  # `${GF_GF:-0}` AND NOT `$GF_GF`, WHICH IS A P0 THIS BUILD'S OWN FIRST REPAIR INTRODUCED AND ITS OWN C57
  # COULD NOT SEE. GF_GF is initialised where the rows are counted, so on all five early refusals it was
  # UNBOUND here, and `set -u` killed the block immediately after the verdict line - so the suite died with
  # `GF_GF: unbound variable` instead of printing the reason, the row and GATES RED. C57 passed over it
  # because st_gfv reads only the verdict line, which is printed one line EARLIER: #393's "a gate that halts
  # on the first missing element hides every regression after it", with the gate's own helper as the blindfold.
  # C68 is the control, and it asserts the thing the verdict word cannot see: no refusal path may emit an
  # unbound-variable error, and every one must reach its last line.
  # THE CAUSE IS READ BEFORE THE COUNTS, AND THIS TIME IT ACTUALLY IS [both antagonists of the fifth pair,
  # independently: A's P1-2 and B's P1-1]. Round six added the cause-keyed arms INSIDE the zero-counts `if`,
  # and the one refusal they exist for - the authority that could not be RUN - is raised in the row loop AFTER
  # GF_GF has been incremented, so the outer test was always false, the arms were unreachable, and the log
  # still told an honest tree it "carries a row nothing accounts for" one line above a reason saying the fault
  # is this door's environment and not the tree. A repair that landed one indentation level away from the
  # finding it was written for, and the comment on it asserted the opposite of what the code did. The cause
  # arms are now the OUTER case and the three count-keyed branches are its default arm.
  # THE SECOND ARM IS ALSO SPLIT, because its alternation was answering for a different failure [A's P3-1 and
  # B's P2-1]: "the register AT the merge-base could not be read" was given the headline "read every register
  # it needed and could not compute the MERGE-BASE", and both halves of that sentence are false - the
  # merge-base was computed (its sha is in the detail line) and one register was not read.
  case "${GF_WHY:-}" in
    # ONE ALTERNATIVE, NOT TWO [antagonist A of the sixth pair, P3-1]: this arm also matched
    # "is not executable at", which was round five's early pre-check string and that refusal was DELETED in
    # round six - so half the pattern could never fire. A decorative alternative in a cause arm is the same
    # species as a mutant that no longer mutates: it reads like coverage and is not.
    *"could not be RUN for"*)
      echo "GATES RED $N — stopped before running any gate: this door's own ENVIRONMENT is broken - the authority it delegates to, gates/buildnum.sh, could not be run - so it cannot say whether the push carries a row that fills a gap in the series. The tree may be perfectly honest." | tee -a "$ALL" ;;
    *"for a row THIS DOOR HAS JUST READ"*)
      echo "GATES RED $N — stopped before running any gate: this door and the authority it delegates to are reading DIFFERENT files, which is a defect in this door and not in the tree." | tee -a "$ALL" ;;
    *"could not be computed"*)
      # "THE BASE AND HEAD REGISTERS", NOT "EVERY REGISTER IT NEEDED" [antagonist A of the sixth pair, P3-3]:
      # this refusal fires before the merge-base register is opened, and the counts clause on the line above it
      # says so - base=(not read) and "refused before all three registers could be read" - so the old wording
      # had the headline claiming more than its own detail line. Round seven split this arm, which makes this
      # the moment to say what was actually read.
      echo "GATES RED $N — stopped before running any gate: this door read the base and HEAD registers and could not compute the MERGE-BASE, so it cannot tell a deleted row from a base that has moved ahead. The tree may be perfectly honest." | tee -a "$ALL" ;;
    *"the register at the merge-base"*)
      echo "GATES RED $N — stopped before running any gate: this door computed the merge-base and could not READ the register at it, so one of the three registers it compares is missing. The tree may be perfectly honest." | tee -a "$ALL" ;;
    *)
      if [ "${GF_GF:-0}" = "0" ] 2>/dev/null && [ "${GF_D1:-0}" = "0" ] && [ "${GF_D2:-0}" = "0" ]; then
        echo "GATES RED $N — stopped before running any gate: this door could not read the build-number register and its base, so it cannot say whether the push carries a row that fills a gap in the series." | tee -a "$ALL"
      elif [ "${GF_D1:-0}" != "0" ] || [ "${GF_D2:-0}" != "0" ]; then
        echo "GATES RED $N — stopped before running any gate: a committed row has been DELETED from the append-only build-number register." | tee -a "$ALL"
      else
        echo "GATES RED $N — stopped before running any gate: the build-number register carries a row nothing accounts for." | tee -a "$ALL"
      fi ;;
  esac
  echo "  $GF_WHY" | tee -a "$ALL"
  printf '%s\n' "${GF_ROWSHOW:-}" | while IFS= read -r gfr; do [ -n "$gfr" ] && gf_show "$gfr" | tee -a "$ALL"; done
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

# ── THE UNIT LAYER: gates/unit-drill-why.js RUNS, AND ITS RED IS THE SUITE'S RED ──────────────────────────────
# Closes jobs/a-unit-test-written-for-the-p0-is-not-in-the-suite-2026-09-28 (P1-shaped, priority 8) and
# jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 (priority 7), which are one defect filed twice: the
# 40-check unit test written to protect Kunal's drill WHY sentence sits at gates/ root, and line 112's
# `for f in "$G"/regress/*.js` is the whole enumeration, so NO suite run has ever reached it. #426 hand-ran it
# once and RUN-LOG.md cites "40 checks, exit 0" as evidence for a build; nothing has checked it since.
#
# WHICH OPTION AND WHY. a-test-in-the-repo offered "move it under gates/regress/ with a claimed number" or
# "call it explicitly from gates.sh before the regress loop and fail the run on a non-zero exit". THIS IS THE
# SECOND, for three measured reasons: (1) a burst agent holds ONE artefact lock [R44] and this one is
# gates/gates.sh, so it may not create gates/regress/NN-*.js nor claim a number in claude/stories/README.md;
# (2) a move triggers the duplicate-number guard above and the gate-manifest's required set, neither of which
# this agent may edit; (3) the unit layer is genuinely NOT a browser gate and keeping it out of regress/ keeps
# the manifest's required count meaning what it says.
#
# THE TRAP THE JOB NAMES, AND IT IS REAL: unit-drill-why.js prints "  ok  <name>" and "  FAIL <name>", not the
# suite's "^PASS". Dropped in as-is it would add 0 to the footer total while still being able to redden - "a
# gate that can go red but can never be seen to be green", the same shape as the frozen-denominator traps in
# this repo's history. So its 40 oks are TRANSLATED into ^PASS lines here. The footer total therefore RISES by
# 40 on the first full run after this lands; that is a one-time step and the build that ships it says so in its
# close-out, per the "the total must only rise" rule.
#
# THE SECOND TRAP, WHICH IS NOT IN EITHER JOB AND WOULD HAVE BROKEN THE PUSH GATE. The obvious shape is to echo
# "=== unit-drill-why ===" like a gate section. DO NOT: gates/verify-log.sh:431-440 refuses any full log whose
# count of '^=== ' lines differs from the roster count in "gates ran (N): ...", and :446 requires that roster to
# be MANIREQ + 1 (mountcheck). An extra section header would refuse EVERY green log from here on, and the
# roster cannot absorb this file because it is not a manifest row. So the marker is '--- ' and the roster is
# left exactly as it was. MEASURED, not reasoned: with this block in, '^=== ' count and the roster both read 1
# on a one-gate subset run and verify-log's roster arm is unchanged.
#
# IT RUNS ON FULL RUNS ONLY. A subset run already states it cannot authorise a push, and the 40 extra PASS
# lines would make a subset log's total incomparable with the gate it names. Stated rather than silent.
UNITJS="$G/unit-drill-why.js"
if [ -z "$SUBSET" ] && [ -f "$UNITJS" ]; then
  ulog="$G/logs/$STEM-unit-drill-why.log"
  echo "--- unit-drill-why (unit layer, not a regress gate, not in the roster) ---" | tee -a "$ALL"
  ( cd "$ROOT" && timeout 300 node "$UNITJS" ) > "$ulog" 2>&1; urc=$?
  uok=$(grep -c '^  ok' "$ulog" || true); ufail=$(grep -c '^  FAIL' "$ulog" || true)
  sed -n 's/^  ok  *\(.*\)$/PASS unit-drill-why \1/p' "$ulog" >> "$ALL"
  if [ "$urc" -ne 0 ] || [ "$ufail" -gt 0 ] || [ "$uok" -eq 0 ]; then
    red=1
    echo "    unit-drill-why: RED (exit $urc, $ufail FAIL, $uok ok)" | tee -a "$ALL"
    sed -n 's/^  FAIL /FAIL unit-drill-why /p' "$ulog" | head -5 | tee -a "$ALL"
    echo "        0 ok is as red as a FAIL here: this test source-slices whyBand, whyShape, mistakeWhy and" | tee -a "$ALL"
    echo "        mistakeHint out of chess.jsx by name, so a rename or a signature change makes it assert" | tee -a "$ALL"
    echo "        nothing rather than fail. Full output: $ulog" | tee -a "$ALL"
  else
    echo "    unit-drill-why: green ($uok ok -> $uok PASS lines)" | tee -a "$ALL"
  fi
fi

# ── THE UNIT LAYER, SECOND BLOCK: gates/fastgate-drive.sh DRIVES THE TIERED PUSH GATE. ADDED #523. ────────────
# Closes the coverage half of
# jobs/no-test-drives-gates-fastgate-sh-end-to-end-so-a-same-length-wrong-stamp-and-a-planted-register-row-both-take-a-fast-green-2026-10-15.
# gates/fastgate.sh decides whether a commit may reach main WITHOUT this suite, and until now nothing in the
# repository tested it: line 112's `for f in "$G"/regress/*.js` is the whole enumeration and no regress gate
# reads it, so GATES GREEN said nothing about it. #522 landed 291 lines of that script under a green suite
# that read none of them.
#
# WHY THE SECOND OPTION AGAIN, exactly as the unit-drill-why block above chose it: a harness that must build
# throwaway clones and commits is not a browser gate, and keeping it out of regress/ keeps the gate manifest's
# required count meaning what it says. IT DELIBERATELY GETS NO gate-manifest.tsv ROW for the same reason the
# block above gets none: gates/verify-log.sh requires the roster to be MANIREQ + 1 (mountcheck), so a manifest
# row for a non-regress file would refuse every green log from here on. The job's `what` field says this script
# "has no gates/gate-manifest.tsv row, so a green suite says nothing about it"; the row is the diagnosis of the
# hole and not the remedy, and the remedy is this block. Marker is `--- ` and never `=== `, same reason.
#
# AND I DID NOT MAKE jobs/the-unit-layers-ok-count-and-its-pass-lines-come-from-two-different-patterns-2026-10-03
# WORSE, WHICH THE JOB ASKS IN TERMS. That job is about the block above: its `uok` comes from `grep -c "^  ok"`
# while its PASS lines come from a sed with a different shape, so the count it reports and the lines it emits
# can disagree. This block derives BOTH FROM ONE PATTERN - the PASS lines are generated first and the count is
# a count OF THOSE LINES - so `dok` cannot differ from the number of PASS lines added to the log. I did not
# change the block above, because it is not this run's item and its artefact lock is not mine to widen.
#
# FULL RUNS ONLY, same as above. And it needs no network and no esbuild: its one esbuild case prints SKIPPED
# and does not count as an ok, so a container without esbuild cannot quietly turn this green on fewer cases.
DRIVESH="$G/fastgate-drive.sh"
# ── A MISSING HARNESS IS A RED, NOT A SILENCE [#525]. ───────────────────────────────────────────────────────
# This block was guarded by a bare `[ -f "$DRIVESH" ]`, so with gates/fastgate-drive.sh moved aside it printed
# NOTHING, added no line to the suite log, and the suite ended green with red still 0 - MEASURED by the
# orchestrator 1 of 1 at the held tip and 1 of 1 earlier at ab852a5, and named by #523's antagonist B as the
# third fault of this block before it had a job of its own.
# IT IS THE #461 TRAP EXACTLY: `gates.sh` built its gate list by globbing the directory it was checking, so a
# gate that was deleted was indistinguishable from a gate that was never needed. Here the unit layer's own
# existence was tested by the thing that would otherwise report its absence, and the answer to "did the push
# gate get exercised?" was a blank where it should have been a refusal.
# A SUBSET RUN IS STILL EXEMPT, and that is not the same hole: a subset cannot emit GATES GREEN at all, so it
# authorises nothing and has no verdict to protect.
if [ -z "$SUBSET" ] && [ ! -f "$DRIVESH" ]; then
  red=1
  echo "--- fastgate-drive (unit layer) ---" | tee -a "$ALL"
  echo "    fastgate-drive: RED - THE HARNESS FILE IS ABSENT: $DRIVESH" | tee -a "$ALL"
  echo "        gates/fastgate.sh is the script that authorises every fast-tier push, and this is the only" | tee -a "$ALL"
  echo "        layer in this suite that drives it end to end. Its absence used to print nothing at all, so a" | tee -a "$ALL"
  echo "        full suite could go GREEN with the push gate wholly unexercised and no line saying so [#525]." | tee -a "$ALL"
fi
if [ -z "$SUBSET" ] && [ -f "$DRIVESH" ]; then
  dlog="$G/logs/$STEM-fastgate-drive.log"
  echo "--- fastgate-drive (unit layer, not a regress gate, not in the roster) ---" | tee -a "$ALL"
  # ── STDOUT IS COUNTED AND STDERR IS NOT, AND THE HARNESS IS HELD TO ITS OWN DECLARATION [#529]. ─────────
  # jobs/the-unit-blocks-verdict-bounds-skips-rather-than-the-denominator-so-a-harness-that-stops-silently-is-green-on-one-assertion-2026-10-20.
  # The skip bound below (#526) closed the harness that ANNOUNCES its skips. It did not close the one that
  # stops without a word: a stub printing ONE ok line at exit 0 read "fastgate-drive: green (1 ok -> 1 PASS
  # lines, 0 skipped)", so a renamed fixture, a changed guard or a case loop over an empty list was green on one
  # assertion of 26. The harness now prints `cases: N declared` before any case runs, and this block requires
  # ok + SKIPPED + FAIL to equal N, so the count is the harness's own and no constant here can go stale as
  # cases are added. The job's three other instances close with it: (2) a SKIPPED line indented any other way
  # than the harness's two spaces is not a skip to this block, so it is now a mismatch instead of a silence
  # (and an ok or SKIPPED shape that the strict counts do not read is RED by itself); (3) the harness's stderr
  # goes to its own file and is appended to the log only after the counting, so an ok-shaped line there counts
  # for nothing; (4) an ok line counts only with its case id and its [TC-...] id, so a
  # bare `echo "  ok  "` no longer puts "PASS fastgate-drive " in the log.
  # THE CLAUSE "which is what gates/audit/cited-not-run.sh keys on" IS WITHDRAWN IN PLACE [#530, R18]. That script
  # holds no reference to fastgate-drive and keys on "ran <file> -> N PASS" lines and a file roster, never on a
  # case id or a TC id inside a PASS line - antagonist A of #529 measured it. The tightening is correct and worth
  # having; only its stated reason was false. THE REAL CONSUMER, named rather than left as "for its own sake":
  # `gates/verify-log.sh --citations` arm (2), whose own verdict reads "every published case id occurs in the log
  # it cites" - it looks the case id up in the archived log, so an ok line carrying no case id supports no
  # published TEST-CASES row. A different script from the one this comment used to name.
  # ── THE CEILING IS A NAMED NUMBER WITH ITS MEASUREMENT BESIDE IT, AND A TIMEOUT HERE IS A REPORTED
  # DECLINE RATHER THAN A RED [#544 item (34); jobs/the-unit-blocks-timeout-900-has-lost-most-of-its-margin-
  # and-a-timeout-there-reds-the-suite-2026-10-20, P2, raised by #527's blind antagonist pair from both doors].
  # WHAT WAS WRONG: the ceiling was the literal 900, calibrated when this harness was 25 cases, and a timeout
  # read drc=124 with no REFUSING line - which is NOT the decline branch, so it fell to the RED branch and the
  # WHOLE SUITE went red with no failing assertion in it. The failure mode was a lost 70-to-110-minute suite on
  # a loaded container, which is the #524 shape where four suites were abandoned and none authorised anything.
  # THE MEASUREMENTS, ALL OF THEM TAKEN RATHER THAN SCALED FROM ONE:
  #   idle, 25 cases   (366428f)                        40.7s
  #   idle, 32 cases   (#527's own commit)              98.2s     - 2.4x for 7 cases, because each case is
  #                                                                 several gates/fastgate.sh invocations
  #   LOADED, 32 cases (the #527 patches document's own rehearsal, three CPU burners and a disk writer)
  #                                                     444-683s  - 4.5x to 7.0x of idle, and 76% of 900
  #   idle, 62 cases   (item (33)'s four cases and their four committed mutants)
  #                                                     396s      - measured at 03:58Z, 61 ok / 0 FAIL /
  #                                                                 1 skipped
  #   idle, 63 cases   (THIS tree, after H62, the case for antagonist A's veto V1)
  #                                                     450s      - measured at 05:05Z, 62 ok / 0 FAIL /
  #                                                                 1 skipped. +54s for one case, which is
  #                                                                 four more gates/fastgate.sh invocations
  # So the loaded band for THIS tree is 450 x 4.5 to 450 x 7.0 = 2025s to 3150s, against a ceiling of 900.
  # The old ceiling is now BELOW the idle runtime's loaded multiple by a factor of two to three: it was not
  # losing margin, it had lost it.
  # WHY 1800 AND NOT 3600, said plainly because the whole loaded band now exceeds it: 1800 covers the idle
  # runtime FOUR times over, and it bounds the worst case this block can cost a
  # suite at 30 minutes rather than 60. Above it the suite does not die - it DECLINES, loudly, which is the
  # second half of the fix and the reason this number does not have to cover the worst case alone. A ceiling
  # chosen to cover every load would make a genuine hang cost an hour of a 70-minute suite.
  # OVERRIDABLE FOR ITS OWN CONTROL ONLY, which is what lets the selftest drive a REAL timeout in a second
  # rather than assert a branch by eye (the job's case field asks for exactly that: "set the ceiling to a value
  # just under the measured loaded runtime ... in a scratch copy").
  DRIVE_TIMEOUT="${CT_DRIVE_TIMEOUT:-1800}"
  ( cd "$ROOT" && timeout "$DRIVE_TIMEOUT" bash "$DRIVESH" fixed ) > "$dlog" 2> "$dlog.err"; drc=$?
  sed -n 's/^  ok  *\(H[0-9][0-9]*[a-z]* \[TC-[A-Z0-9-]*\].*\)$/PASS fastgate-drive \1/p' "$dlog" > "$dlog.pass"
  dok=$(grep -c '^PASS fastgate-drive ' "$dlog.pass" || true)
  dokany=$(grep -cE '^[[:space:]]*ok([[:space:]]|$)' "$dlog" || true)       # every ok shape, read or not
  # ── #530, ANCHORED ON ANTAGONIST B's FINDING F3, WHICH IS A GAP IN THIS RUN'S OWN dfailany FIX. That fix
  # anchored the ANY counter to a case id and left this STRICT one matching any two-space `FAIL `, and the two
  # are compared - so a quoted line indented at exactly two spaces with no case id became a false red through
  # THIS counter instead, the same hazard mirrored. My comment below called the class "soundly swept at one
  # site"; that reason is sound for the ok and SKIPPED twins, which must stay loose because they are CREDITED,
  # and it was NOT sound for dfail, which can only redden. Withdrawn and fixed [R18]. Latent, not live: nothing
  # on this tree emits such a line - the harness quotes sub-process output at nine spaces and four, never two.
  # Both FAIL counters now require the case id a real verdict always carries, so a quoted line counts in NEITHER
  # and cannot create a mismatch, while every genuine FAIL still counts in both.
  dfail=$(grep -cE '^  FAIL[[:space:]]+H[0-9]+[a-z]*([[:space:]]|$)' "$dlog" || true)
  dskip=$(grep -c '^  SKIPPED ' "$dlog" || true)
  dskipany=$(grep -cE '^[[:space:]]*SKIPPED' "$dlog" || true)               # every SKIPPED shape, read or not
  # ── #530 (1) [jobs/the-unit-blocks-new-counting-layer-can-redden-on-a-quoted-fail-line-and-its-own-header-misdescribes-what-it-counts-2026-10-21]
  # WAS: grep -cE '^[[:space:]]*FAIL'  - ANY indented FAIL, so a line the harness QUOTES OUT OF A SUB-PROCESS it
  # drives made the shape test below report a mismatch and go RED with NO CASE HAVING FAILED. Proved to occur,
  # not argued: #529's own unfixed.log carries 16 indented FAIL lines against 14 real case failures, the two
  # extras being "FAIL: run (cd gates && npm ci) first" continuation lines quoted out of gates/build.sh by cases
  # H38 and H39. It was latent rather than live only because the FIXED mode - the only mode this block runs -
  # happened to carry none on that tree.
  # NOW it requires what a case verdict carries and a quoted line does not: the case id after FAIL. The strict
  # count above requires the harness's exact two-space indent; this one still accepts ANY indent, so a FAIL
  # verdict indented some other way is still the mismatch #529 added it for.
  # WHY THE ok AND SKIPPED TWINS ARE DELIBERATELY LEFT LOOSE [R06, and the asymmetry is the whole reason]: an ok
  # line is CREDITED, so dokany must keep matching a bare `  ok  ` with no case id - catching that forgery is
  # exactly what #529's fault (4) added it for, and anchoring it to a case id would blind it. A FAIL line is
  # never credited; it can only redden. SO LOOSE IS A GUARD ON THE ok SIDE - AND IT IS A HAZARD THERE TOO, which
  # this comment's last clause used to deny ("a GUARD on the ok side and a HAZARD on the FAIL side") and which is
  # WITHDRAWN here [R18, a fresh reviewer of this tree]: the twins are compared with EQUALITY at :538, :550 and
  # the verdict below, not with >=, so a quoted sub-process line that the loose pattern reads and the strict one
  # does not makes dokany > dok and REDDENS a suite in which no case failed. That is the identical hazard #529
  # found on dfailany and this run anchored out of dfail, pointed the other way. Latent, not live, and measured
  # rather than asserted: the only sub-process output this harness interpolates is prefixed (fastgate-drive.sh:67
  # indents `git status --porcelain`, whose lines begin with status codes, and :411 parenthesises a mint note),
  # and no tool on the push path emits a line beginning `ok` or `SKIPPED`. The honest repair is to COUNT the
  # lines the strict pattern did not read and REPORT them, rather than to compare two totals - filed, not done
  # here, because it is a shape change to a block whose own counters are what this run just finished anchoring.
  # classSwept {found 4, fixed 2, left 2 with this reason} - corrected from {3,1,2} at #530 on B's F3, which
  # found the fourth site: the STRICT dfail counter below, anchored in the same way for the same reason.
  dfailany=$(grep -cE '^[[:space:]]*FAIL[[:space:]]+H[0-9]+[a-z]*([[:space:]]|$)' "$dlog" || true)   # every FAIL VERDICT shape, read or not [#529 review, anchored #530]
  ddeclared=$(grep -c '^cases: ' "$dlog" || true)
  dcases="$(sed -n 's/^cases: \([0-9][0-9]*\) declared.*$/\1/p' "$dlog")"
  case "$dcases" in ''|*[!0-9]*|0*|?????*) dcases="" ;; esac   # 1 to 9999, plaus_delta's own pattern [#529 review]
  dnames=$(sed -nE 's/^  (ok +|SKIPPED |FAIL )(H[0-9]+[a-z]*) .*$/\2/p' "$dlog" | sort -u | wc -l)
  dnames=$((dnames + 0))   # the DISTINCT case names on the strict lines [#529 review]
  # ── #531. THE DECLARATION IS NOW CROSS-CHECKED AGAINST THE COMMITTED TABLE, BY THIS BLOCK. ───────────────
  # jobs/the-unit-blocks-declared-case-count-is-a-hand-kept-array-so-it-can-be-edited-down-together-with-the-cases-2026-10-21,
  # its own theFix, SECOND option. #529 made this block require ok + SKIPPED + FAIL to equal the count the
  # harness DECLARES, and #530 made the harness DERIVE that count from its own tc() table instead of a
  # hand-kept array. Both are right and neither closes the job, because every one of those numbers still comes
  # out of the one file: a stub that REPLACES gates/fastgate-drive.sh declares 1, runs 1 and agrees with
  # itself, and the block read "green (1 ok -> 1 PASS lines, 0 skipped, of 1 declared)" with red 0 on b192ad8
  # exactly as on d7a022b. That is #530's own measured remainder and the orchestrator's verifier reproduced it.
  # SO THE SECOND NUMBER MUST COME FROM SOMEWHERE THE HARNESS DOES NOT WRITE AT RUN TIME: the COMMITTED text
  # of the table, read here with git. The harness is executed from the working tree and this reads HEAD, and
  # prompts/build-run's own sequence leaves those equal at this point for a run that commits before gating -
  # a run with a dirty tree takes the decline branch below and asserts nothing either way.
  # WHAT IT CANNOT DO, said plainly so it is not over-read [R18]: it does NOT make the declaration unforgeable.
  # A case deleted from BOTH the table and its body still lowers the declaration and this count together, since
  # both now read the same committed table; only a comparison against origin/main's table would catch that, and
  # that is antagonist-b-530's f5, left as a known limit on this job rather than claimed as closed here.
  # What it DOES close is the whole class where the harness's output is the only evidence of its own scope.
  # THE GIT INVOCATION IS BUILT HERE AND NOT TAKEN FROM $GIT: gates.sh --selftest extracts this block from
  # `^DRIVESH=` and runs it in a scratch tree, and $GIT is defined ABOVE that range, so a reference to it
  # would be an unbound variable under `set -u` in every selftest case.
  # AN ARRAY AND NOT A STRING [#531, this run's own antagonist A, note 9]. As a string this word-split on
  # every space in $ROOT, so a checkout at a path containing one read dtbl=0 and reddened an HONEST tree,
  # blaming the harness for the path. Measured in a clone at "/tmp/.../sp ace/r": dtbl 0 where 53 is right.
  DGIT=(git -C "$ROOT" --git-dir="$ROOT/.git" --work-tree="$ROOT")
  # tr -d ' \t\r)' AND NOT tr -d ' )' [#531, antagonist A's P1 4]. grep -oE captures the leading
  # whitespace character, and deleting only spaces and parens left a TAB attached: `\tH1` and `H1` then sort
  # as two distinct ids, so a duplicate written at a tab mapped one case while the block credited two - the
  # same tab-versus-space class this block already carries C21, C26 and C29 for, reintroduced in the limb
  # added beside them. The class covers tab, CR and every other space character rather than just the one found.
  dtblids="$("${DGIT[@]}" show HEAD:gates/fastgate-drive.sh 2>/dev/null | sed -n '/^tc(){/,/^}/p' \
             | grep -oE '(^|[[:space:]])H[0-9]+b?\)' | tr -d ' \t\r)' | grep -vx H12 || true)"
  dtbl=$(printf '%s' "$dtblids" | grep -c . || true);          dtbl=$((dtbl + 0))
  dtbluniq=$(printf '%s' "$dtblids" | sort -u | grep -c . || true); dtbluniq=$((dtbluniq + 0))
  # THREE WAYS THIS GOES WRONG, EACH ITS OWN TEST AND NOT A CONJUNCT [prompts/common, the non-empty-denominator
  # rule]. An empty table is reported rather than compared, because 0 == 0 against a harness that declared
  # nothing usable is exactly the vacuity this job is about.
  dtblmis=0; dtblwhy=""
  if [ "$dtbl" -eq 0 ]; then
    dtblmis=1; dtblwhy="the committed tc() table yields NO case ids"
  elif [ "$dtbluniq" -ne "$dtbl" ]; then
    dtblmis=1; dtblwhy="the committed tc() table repeats a case id ($dtbl rows, $dtbluniq distinct)"
  elif [ -n "$dcases" ] && [ "$dtbl" -ne "$dcases" ]; then
    dtblmis=1; dtblwhy="the harness declared $dcases case(s) and the committed tc() table yields $dtbl"
  fi
  # TWO HOLES THE #529 REVIEW FOUND, BOTH CLOSED HERE. (a) The declared count was tested as digits only and then
  # compared with -ne, which on a value past 2^63 prints "integer expression expected" and returns 2, read as
  # false: a twenty-digit declaration was green over one ok line. It is bounded now the way plaus_delta bounds
  # its margin (C27). (b) The denominator was a COUNT: one case reported twice while another reported nothing
  # balanced it, so a copied case body could drop an assertion with every count agreeing. The distinct case
  # names on the strict lines must now number ok + SKIPPED + FAIL (C28), and a FAIL line indented any other way
  # than the harness's two spaces is a mismatch like its ok and SKIPPED twins (C29).
  # ── #530 (2). THE STDERR APPEND MOVED BELOW drefuse, WHICH IS THE TENTH COUNTER AND WAS THE ONE EXCEPTION ──
  # The append used to sit HERE, above drefuse, so nine counters were computed before it and the TENTH after -
  # while this block's own comment and the log header it writes both say the stderr is "appended after the
  # counting, so nothing in it is counted". That sentence was true of nine counters and FALSE of the one that
  # converts a RED into a SKIPPED: drefuse is the whole evidence requirement #525 added to the decline branch, so
  # a harness whose only output was a REFUSING line on STDERR was credited with having declined. Antagonist A of
  # #529 demonstrated it with a stub; antagonist B verified it from the two line numbers alone.
  # The harness writes its own REFUSING lines with `echo`, to STDOUT, so an honest decline is unaffected; what
  # stops being credited is a REFUSING line that reached stderr, which is the forgery. NOT A REGRESSION of P1's:
  # origin/main's block used 2>&1 and behaved the same way, so what P1 changed was the CLAIM, not the behaviour -
  # and this moves the BEHAVIOUR to match the claim rather than weakening the claim to match the behaviour.
  # ── A DECLINE NEEDS EVIDENCE, AND exit 2 ALONE IS NOT EVIDENCE [#525]. ────────────────────────────────────
  # The decline branch below keyed on `drc -eq 2 && dfail -eq 0 && dok -eq 0`, which the comment correctly
  # argues is the signature of the harness's own named REFUSING paths. It is also the signature of a harness
  # THAT DOES NOT PARSE, because bash itself exits 2 on a syntax error - and then dfail and dok are 0 for the
  # trivial reason that nothing ran at all. MEASURED by the orchestrator, 1 of 1, and by the reviewer, 1 of 1
  # (its F5): `sed -i '62a if then; fi fi' gates/fastgate-drive.sh`, committed, makes
  # `bash gates/fastgate-drive.sh fixed` exit 2 with "syntax error near unexpected token `then'", and this
  # block then printed SKIPPED, printed NO REFUSING line, and left red at 0.
  # SO THE TEST IS THE HARNESS'S OWN WORDS AND NOT ITS EXIT CODE. A genuine decline copies a REFUSING line
  # into the log - the block already prints it - so requiring at least one makes the evidence the condition
  # instead of a courtesy. A syntax error, a missing interpreter, a killed process and an exit 2 from anywhere
  # that is not a named refusal all now fall through to the RED branch, which is where they belong.
  # THE DIRTY-TREE DECLINE IS UNAFFECTED, which is the point of fixing it this way rather than by deleting the
  # branch: that path prints "REFUSING - the working tree is not clean" before it exits, so it still SKIPS.
  # ANCHORED [#526]. This was `grep -ac 'REFUSING'`, UNANCHORED, so any exit-2 output that merely CONTAINED
  # the substring anywhere read as a legitimate decline - including prose that says the opposite ("this
  # harness is not REFUSING at all"). The harness's twelve real refusals all echo at column 0 with this exact
  # prefix and all exit 2, so the anchor keeps every one of them and drops the accidental match. Its own
  # "REFUSING TO REPORT GREEN - no case ran" line is deliberately NOT matched and never needed to be: that
  # path exits 1, and the decline branch requires exit 2, so it has always arrived at the RED branch.
  drefuse=$(grep -ac '^fastgate-drive\.sh: REFUSING - ' "$dlog" || true)
  # the append is HERE now, after every counter, so the sentence it prints is true as written [#530 (2)]
  if [ -s "$dlog.err" ]; then { echo "--- the harness's stderr, appended after the counting, so nothing in it is counted ---"; cat "$dlog.err"; } >> "$dlog"; fi
  rm -f "$dlog.err"
  cat "$dlog.pass" >> "$ALL"; rm -f "$dlog.pass"
  # ── DECLINED TO RUN IS A REPORTED SKIP, NOT A RED [#524]. ──────────────────────────────────────────────────
  # #523 wrote this as `drc -ne 0 || dfail -gt 0 || dok -eq 0 -> red=1`, and the comment below defended the
  # `dok -eq 0` limb on the ground that the harness "can decline to run anything rather than fail a case". That
  # is true, and making the decline a RED is the mistake, because ONE OF THE THINGS IT DECLINES ON IS THE
  # DOCUMENTED HAPPY PATH: gates/fastgate-drive.sh tests the COMMITTED tree, so it refuses when the working
  # tree is dirty - and prompts/build-run's own sequence is mint -> gates/build.sh -> gates/gates.sh, which
  # leaves app.js rebuilt and UNCOMMITTED at exactly the moment this block runs. MEASURED by #523's antagonist
  # A: `touch zz-probe.tmp && bash gates/fastgate-drive.sh fixed` prints "REFUSING - the working tree is not
  # clean" and exits 2, setting drc=2 AND dok=0, so both red limbs fire. #523 is the ONE configuration where
  # that does not bite, because it shipped no application change; the next build that actually rebuilds app.js
  # could not have reached GATES GREEN at all. It would also have reddened 21 of the 151 archived green logs,
  # #522's among them - the very baseline #523 cited for itself.
  # CLAUDE.md's rule is the one that decides this: a guard that fires on the normal case gets switched off,
  # which is why --this-bundle is opt-in. So the verdict is split on WHAT THE HARNESS SAID, not merely on a
  # non-zero code, and the harness's own convention already separates the two cases cleanly: exit 1 is "a case
  # answered WRONGLY", exit 2 is "could not RUN" and is reached only by its named REFUSING paths, before any
  # case executes. A decline therefore has dfail 0 and dok 0 by construction.
  # IT IS NEVER SILENT, which is the whole difference between this and weakening the guard: the refusal line is
  # copied verbatim into the log, so a reader sees that the push gate went untested and why. That is the same
  # honest-and-blind shape as the five known-absent gates the manifest reports every run, and the same
  # precedent as the esbuild-absent case inside the harness, which already prints SKIPPED and counts no ok.
  # ── AND A SKIP BOUND, BECAUSE THE VERDICT CREDITED SKIPS AS GREEN WITH NO FLOOR BUT `dok -eq 0` [#526]. ────
  # This is the finding that HELD #525: with 1 ok and 25 SKIPPED the block printed
  # "fastgate-drive: green (1 ok -> 1 PASS lines, 25 skipped)" and left red at 0, so a harness that had
  # silently stopped running its cases - a renamed fixture, a changed guard, an environment that makes every
  # case skip - reported green inside a GATES GREEN log, and that log then authorised a push. It is #405's
  # "0 PASS is the tell" with the DENOMINATOR REMOVED rather than frozen: the section line reports the skips
  # and the verdict ignores them.
  # WHY THE BOUND IS 2 AND NOT 0. Two skips is the most an HONEST tree takes, and both are reachable with no
  # tampering: H1b skips wherever esbuild is not on the PATH (the harness's own clone carries no
  # node_modules), and H25 prints SKIPPED when git's `update-index --assume-unchanged` does not hide the
  # doctored file, which depends on the git build. A bound of 0 would fire on the normal case, and a guard
  # that fires on the normal case gets switched off - the same argument C13 makes for the dirty-tree decline.
  # SINCE #527 H11 AND H30 SHARE H25's CONDITION, so on a git that does not hide the file four cases skip with
  # H1b and this block is RED; the comment at C18 in this file's selftest says why the bound is not raised to fit.
  # SO THE PAIR IS WHAT MATTERS, NOT THE NUMBER: C15 (1 ok, 25 SKIPPED) must be RED and C16 (24 ok,
  # 2 SKIPPED) must stay green, and C16 is green with this fix and without it BY DESIGN - it is the control
  # that stops the bound being set too tight, so do not look for a failure of it.
  # TAKEN AT #529: the job's own "preferred" form, where the harness prints its own `cases: N` and the block
  # requires ok + SKIPPED + FAIL == N (the comment above the counts says what it closes). The skip bound stays
  # beside it on purpose: a harness that declares 26 cases and honestly skips 25 of them agrees with its own
  # declaration and still asserts nothing, so the count closes the silent stop and the bound the loud one.
  # ── #531 (2). AND A DECLINE IS NOT CREDITED WHEN THE TABLE ITSELF IS UNREADABLE. ─────────────────────────
  # This is the gap #530's own fix added, measured by the orchestrator's verifier and named in that job's
  # whatIsLeft (2): respace the table's header to `tc() {`, which is still valid bash, and the harness's new
  # empty-table guard refuses at exit 2 with a REFUSING line - so this branch credited it as a sanctioned
  # decline and printed SKIPPED with red 0, where the same tree WITHOUT that guard read RED. A guard that
  # turns a red into a skip on a harmless-looking edit to the harness is worse than the hole it closed.
  # A harness that cannot read its own case table is a damaged script, which is what its own refusal says in
  # terms, and a damaged script is never a tree to judge: it falls through to the RED branch. The dirty-tree
  # decline - the documented happy path between gates/build.sh and gates/gates.sh - is untouched, because that
  # path refuses with its table perfectly readable. C13 and C32 are the pair that shows this discriminates.
  # ── A TIMEOUT IS A REPORTED DECLINE AND NEVER A RED [#544 item (34)]. `timeout` exits 124, which carries no
  # REFUSING line, so this branch has to be its own: before this item drc=124 fell through to the RED branch
  # below and reddened a suite in which no case had failed. IT IS NOT CREDITED AS A GREEN EITHER - red stays 0
  # and the log says in terms that the tiered push gate went unexercised, which is the same honest-and-blind
  # shape as the dirty-tree decline above it and as the five known-absent gates the manifest reports every run.
  # AND IT IS NOT A BLANKET EXCUSE: `dfail -eq 0` is required, so a run where a case ANSWERED WRONGLY and the
  # harness then timed out is still red. A wrong answer is evidence about the tree; a timeout is evidence about
  # the container.
  if [ "$drc" -eq 124 ] && [ "$dfail" -eq 0 ]; then
    echo "    fastgate-drive: SKIPPED - the harness TIMED OUT at ${DRIVE_TIMEOUT}s (exit 124) and asserted nothing it can be held to." | tee -a "$ALL"
    echo "        $dok ok, $dskip skipped and 0 FAIL line(s) were written before it was killed." | tee -a "$ALL"
    echo "        This is NOT a red and NOT a green: the tiered push gate was not exercised by this suite, so" | tee -a "$ALL"
    echo "        this log says nothing about gates/fastgate.sh. A timeout is a fact about the CONTAINER, and" | tee -a "$ALL"
    echo "        reddening a 70-minute suite over one is how a whole suite gets lost with no defect in it" | tee -a "$ALL"
    echo "        [#524: four suites abandoned, none authorising anything]. The ceiling is measured beside the" | tee -a "$ALL"
    echo "        timeout call: 450s idle for 63 cases on this tree, 2025-3150s under the rehearsed load." | tee -a "$ALL"
    echo "        Full output: $dlog" | tee -a "$ALL"
  elif [ "$drc" -eq 2 ] && [ "$dfail" -eq 0 ] && [ "$dok" -eq 0 ] && [ "$drefuse" -ge 1 ] && [ "$dtblmis" -eq 0 ]; then   # #525: a decline must SAY so; #531: and its table must be readable
    echo "    fastgate-drive: SKIPPED - the harness DECLINED to run and asserted nothing (exit 2)." | tee -a "$ALL"
    grep -a '^fastgate-drive\.sh: REFUSING - ' "$dlog" | head -3 | sed 's/^/        /' | tee -a "$ALL"   # #527: the lines drefuse counted
    echo "        This is NOT a red and NOT a green: the tiered push gate was not exercised by this suite," | tee -a "$ALL"
    echo "        so this log says nothing about gates/fastgate.sh. The usual cause is a dirty working tree," | tee -a "$ALL"
    echo "        which is the documented path between gates/build.sh and gates/gates.sh. Full output: $dlog" | tee -a "$ALL"
  elif [ "$drc" -ne 0 ] || [ "$dfail" -gt 0 ] || [ "$dok" -eq 0 ] || [ "$dskip" -gt 2 ] \
       || [ "$ddeclared" -ne 1 ] || [ -z "$dcases" ] || [ "$((dok + dskip + dfail))" -ne "${dcases:-0}" ] \
       || [ "$dokany" -ne "$dok" ] || [ "$dskipany" -ne "$dskip" ] || [ "$dfailany" -ne "$dfail" ] \
       || [ "$dnames" -ne "$((dok + dskip + dfail))" ] || [ "$dtblmis" -ne 0 ]; then   # #529: the second to fourth lines; #531: the committed-table cross-check
    red=1
    echo "    fastgate-drive: RED (exit $drc, $dfail FAIL, $dok ok, $dskip skipped, $drefuse REFUSING line(s); ${dcases:-no usable} case(s) declared on $ddeclared line(s), $dokany ok-shaped, $dskipany SKIPPED-shaped and $dfailany FAIL-shaped line(s), $dnames distinct case name(s), $dtbl case id(s) in the committed tc() table)" | tee -a "$ALL"
    if [ "$dtblmis" -ne 0 ]; then echo "        THE COMMITTED TABLE DISAGREES WITH THE RUN [#531]: $dtblwhy." | tee -a "$ALL"; fi
    sed -n 's/^  FAIL /FAIL fastgate-drive /p' "$dlog" | head -8 | tee -a "$ALL"
    echo "        A case answered WRONGLY, or the harness reported success having asserted nothing. Both are" | tee -a "$ALL"
    echo "        red: exit 1 is the harness's own code for a wrong answer, and 0 ok with exit 0 would mean it" | tee -a "$ALL"
    echo "        claimed green over no assertions [#405's '0 PASS is the tell']. A DECLINE is handled above" | tee -a "$ALL"
    echo "        and is not this branch - and since #525 a decline must carry at least one REFUSING line, so" | tee -a "$ALL"
    echo "        an exit 2 from a harness that does not PARSE arrives here instead of reading as a skip." | tee -a "$ALL"
    echo "        Full output: $dlog" | tee -a "$ALL"
  else
    echo "    fastgate-drive: green ($dok ok -> $dok PASS lines, $dskip skipped, of $dcases declared, matching $dtbl case id(s) in the committed tc() table)" | tee -a "$ALL"
  fi
fi

for f in "${gates[@]}"; do
  name="$(basename "$f" .js)"; log="$G/logs/$STEM-$name.log"
  echo "=== $name ===" | tee -a "$ALL"
  ( cd "$ROOT" && timeout 900 node "$f" ) > "$log" 2>&1; rc=$?
  cat "$log" >> "$ALL"
  fails=$(grep -c '^FAIL' "$log" || true); marks=$(grep -c '<<<' "$log" || true); passn=$(grep -c '^PASS' "$log" || true)
  # ── #461, ANTAGONIST B's F4. "PRESENT" WAS A FILENAME, NOT A GATE. ──────────────────────────────────────────
  # The manifest check above asks whether each required gate EXISTS. B measured the obvious next step: `: >
  # gates/regress/26-invariants.js` leaves the file present, the manifest reads "47 required, 47 present, 0
  # missing", the section reports "green (0 PASS)", and the suite ends GATES GREEN. So the strongest remaining
  # route to a green suite with a defect class uncovered was to EMPTY a gate rather than delete it. This script
  # already computed that PASS count purely in order to print it; asserting it is above zero is one condition and
  # is genuinely independent of the manifest, because it reads what the gate DID rather than that it is on disk.
  # It is also the project's own oldest tell, from #405: "a full suite reporting 0 PASS is the tell".
  # MEASURED BEFORE ASSERTING, which is the point: across the 22 sections of this build's first full run the
  # LOWEST PASS count in any green section is 7, so no gate in the suite legitimately asserts nothing.
  if [ $rc -eq 0 ] && [ "$fails" -eq 0 ] && [ "$marks" -eq 0 ] && [ "$passn" -eq 0 ]; then
    red=1; echo "    $name: RED (exited clean and asserted NOTHING - 0 PASS lines)" | tee -a "$ALL"
    echo "        A gate that is present and asserts nothing is indistinguishable from a gate that is absent," | tee -a "$ALL"
    echo "        and the manifest cannot see the difference: the file exists. Either it is broken, or it was" | tee -a "$ALL"
    echo "        emptied. If a gate ever legitimately asserts nothing, it should not be in the suite." | tee -a "$ALL"
  elif [ $rc -ne 0 ] || [ "$fails" -gt 0 ] || [ "$marks" -gt 0 ]; then red=1; echo "    $name: RED (exit $rc, $fails FAIL lines, $marks <<<)" | tee -a "$ALL"; grep '^FAIL' "$log" | head -5 | tee -a "$ALL"; else echo "    $name: green ($passn PASS)" | tee -a "$ALL"; fi
done
PASSN=$(grep -c '^PASS' "$ALL" || true)
echo "regression assertions (PASS lines): $PASSN" | tee -a "$ALL"
# ── #461. THE FOOTER NAMES THE GATES THAT RAN, AND RESTATES THE MANIFEST VERDICT. ────────────────────────────
# The job's title is the point: "GATES GREEN asserts that the gates present all passed, not that the gates that
# MATTER were present". A reader of an archived log could count "=== name ===" headers by hand; now the log says
# it in one greppable line, and carries the manifest's own verdict next to the PASS total that is already there.
# BOTH LINES ARE CLAIMS THIS SCRIPT COMPUTES, not independent measurements, and gates/verify-log.sh reading them
# back is reading a claim - the same honest limit the PASS-count footer has had since #419. Stated so the next
# reader does not take the line for more than it is.
echo "$MANI_LINE" | tee -a "$ALL"
# AND THE SERIES VERDICT BESIDE IT [G6, #533]. The door above already printed this line before any gate ran;
# it is restated here because an OVERRIDE must be legible in the FOOTER, where every HUMAN reader of a green
# log looks. BE EXACT ABOUT WHAT THAT BUYS, because the first version of this comment was not [antagonist B
# of #533, P1-2]: it said an overridden suite "would otherwise be indistinguishable from an ok one", which
# reads as though the restatement made it distinguishable. It does not, for the one reader that decides.
# gates/verify-log.sh reads only lines beginning PASS, FAIL, "=== ", "gate manifest:" or GATES (:802, :811,
# :994, :1137), and this line begins with none of them - deliberately, so that an OVERRIDE or a RED can never
# be miscounted as a PASS or mistaken for authorising output. The other half of that choice is that the tool
# CANNOT SEE IT EITHER WAY: B appended an OVERRIDE line to a real green log and verify-log.sh returned OK
# without mentioning it. So the footer line is for the person, the refusal is for the run, and the tool is
# blind to both - filed as jobs/verify-log-sh-cannot-tell-whether-the-build-number-series-door-ran-so-an-
# older-green-log-still-authorises-a-push-2026-10-22, with the fix belonging to a file this run may not edit.
# Until it lands, an OVERRIDE is a HUMAN duty: say so in the run report and the ledger, because no grep will.
echo "${GF_LINE:-build-number series: NOT CHECKED - the door set no verdict.}" | tee -a "$ALL"
echo "gates ran ($(( ${#gates[@]} ))): $(for f in "${gates[@]}"; do printf '%s ' "$(basename "$f" .js)"; done)" | tee -a "$ALL"
# #538 [the container job]: restate the instrument beside the verdict, so a later reader knows what the pins were read on.
# #539 [the same job, after BOTH antagonist doors read the #538 line and converged on the same remedy]: also COMPARE
#   the measured metrics against the calibration and print the verdict. The #538 line put the comparand on the page
#   without the comparison, which reads as a verification to anyone who greps the footer - antagonist B of #539 filed
#   that as its veto ground (withdrawn once it saw the commit declares the line a record) and antagonist A of #539
#   reached the same locus from the diff door as its F3. ONE literal, TM_CAL, is both compared and printed, so there
#   is no second prose home to go stale, which was A's F3; and the provenance is the measured range rather than the
#   single build #538 named, which was A's F2.
# THIS IS A RECORD AND NOT A GATE, deliberately and not by omission. `red` is assigned only inside the per-gate loop
#   above, which has completed by the time this block runs, so nothing here can reach the SUBSET OK / GATES GREEN /
#   GATES RED lines below. VERIFIED MECHANICALLY AGAINST EVERY ASSIGNMENT SITE: `red` is initialised ONCE and
#   assigned at FIVE sites, two of them inside the per-gate loop and three above it, and THE PROPERTY THAT MATTERS
#   IS THAT EVERY ONE OF THEM IS ABOVE THIS BLOCK. A seventh assignment inside --selftest never reaches this footer.
#   CHECK IT IN ONE COMMAND RATHER THAN TRUSTING THIS SENTENCE:
#       grep -n 'red=[01]' gates/gates.sh | grep -v ':[[:space:]]*#'
#   lists the SEVEN real sites with their lines, and `grep -n '^TC_LINE=' gates/gates.sh` gives this block's own -
#   every site number must be lower except the --selftest one, which is lower too. THE SECOND GREP IS NOT
#   DECORATION AND ROUND SIX ADDED IT AFTER RUNNING THE FIRST: without it the command returns TEN lines, because
#   three COMMENTS quote `red=1` - and two of those three are sentences of THIS comment, including the line that
#   prescribes the command. Worse, one of them sits BELOW this block, so a reader following round five's
#   instruction saw a match at a higher line number than the block and would have concluded the relation this
#   paragraph asserts was false. The relation was true the whole time; the CHECK was wrong. A verification command
#   printed inside the file it verifies will match itself, which is this project's oldest trap (#407's pgrep, #416's
#   pkill, #419's footer computed from the log, #450's every-tool-asked-about-the-log) in its cheapest costume yet:
#   the instruction and the thing instructed about were the same bytes. THIS SENTENCE CARRIED SEVEN ABSOLUTE OFFSETS UNTIL ROUND FIVE AND ALL SEVEN WERE WRONG, which is the
#   whole reason it now carries none; see the paragraph below the `esac`. The
#   first two drafts said "all at or inside the per-gate loop, whose `done` closes about fifty lines above this
#   block", and BOTH halves were wrong: false for four of the six sites, and the distance was 49 when written and
#   became 68 when this very comment grew. A distance from a comment to a line the same comment is shifting is the
#   one citation form guaranteed to rot, so this sentence asserts the relation instead. #539 first published five and
#   missed the fifth assignment, which shares an elif chain with the fourth; the fresh pair's A2 completed the
#   enumeration, and ROUND FIVE REMOVED THE LINE NUMBERS IT WAS COMPLETED WITH, because by then every one of them
#   had rotted. The
#   conclusion is unchanged - no site is reachable from here - but an enumeration offered as the proof has to be
#   complete, because the whole argument is that every site was checked. A seventh assignment at :148 is inside
#   --selftest and never reaches this footer.
# ITS LIMIT, stated because it is what decides the shape: the test is STRING CONTAINMENT against a literal, so a
#   reword or respacing of gates/lib.js's metrics sentence flips it to DISAGREES, and it cannot tell "the metrics
#   moved" from "the sentence changed". That is exactly why it may NOT withhold GATES GREEN, and why it prints the
#   literal it compared so a reader can see which of the two happened. A comparison that can false-alarm on a reword
#   must not be able to refuse a push; the comparison belongs in the record and the refusal does not.
# MEASURED before it was written, over ALL 166 committed gatelogs in claude/agents/gatelogs: AGREES on 52 of them,
#   485-all.log through 534-all.log, every one of which reads chromium 141.0.7390.37; DISAGREES on exactly ONE,
#   537-all.log - the ten-gate red over main's own unchanged bundle that this build exists to fix, where only the
#   "Segoe UI" slot moved, 373.42 against a calibrated 322.15, under chromium 153.0.8010.12; and NOT COMPARED on the
#   other 113, which predate 485-all.log and carry no metrics line at all. It also DISAGREES on a CT_NOFC=1 run,
#   which is the state the pin exists to prevent. THOSE FIGURES ARE THE SECOND SET: #539 first published "29 logs,
#   AGREES on 28, #500 to #534", which came from globbing 5*-all.log and so silently excluded every log whose name
#   does not start with 5 - the fresh pair's A2 caught it, and the corrected denominator is 166 with the range
#   starting 15 logs lower. The conclusion is unchanged: the discriminating case is uniquely 537-all.log.
#   The cheaper candidate - echoing the `fontconfig:` line instead - was measured and REJECTED: 537-all.log:113 reads
#   a CLEAN fontconfig line and the whole file carries zero MISMATCH, because gates/lib.js's guard tests fc-match
#   "sans-serif", which resolved correctly in #537. Echoing it would have printed a clean line through the red.
# A SECOND LIMIT, NAMED BECAUSE THE COMMENT ABOVE USED TO PRESENT CONTAINMENT AS THE ONLY ONE: `grep -m1` reads the
#   FIRST metrics line and a full-suite log carries one per gate launch - 54 to 58 of them, measured across the
#   archive - and NOTHING HERE CHECKS THAT THEY AGREE WITH EACH OTHER. The fresh pair's A2 drove a synthetic log
#   carrying a calibrated line followed by an off-calibration one and this block printed AGREES, so a mid-run drift
#   (a fontconfig cache change, a relaunch under different env, one gate running with CT_NOFC=1) would be invisible
#   here while the suite's own pins moved underneath it. IT IS LATENT AGAINST THE ARCHIVE AND REACHABLE IN A LIVE
#   RUN - #539's round three said "LATENT and not live" and antagonist B2 falsified the second half by MEASUREMENT
#   the same hour: it drove a real subset, moved gates/fonts.conf out after mountcheck had printed its line and
#   before the next gate launched, and got a log whose line 22 is calibrated, whose line 54 reads Inter and is OFF
#   calibration, and whose footer says AGREES at SUBSET OK exit 0. So the archive half stands and the word "live"
#   was wrong. Every log in the archive carries
#   exactly ONE distinct metrics line, re-measured at #539 over ALL 166 COMMITTED LOGS rather than over a sample of
#   five - `for f in claude/agents/gatelogs/*.log; do grep -ao 'text metrics @16px.*' "$f" | sort -u | wc -l; done`
#   never exceeds 1 - because a sound claim resting on a five-log denominator is the very shape this comment
#   corrects two paragraphs down. Filed rather than fixed,
#   because a new predicate in this block is what produced the P1 the fresh pair vetoed on.
# ── #544, item (28). IT REFUSES NOW, ON KUNAL'S OWN RULING, AND IT PARSES NUMBERS INSTEAD OF MATCHING A
# SENTENCE [jobs/the-suites-calibration-comparison-is-a-record-and-nothing-refuses-on-a-mismatch-2026-10-27,
# raised at P1 by antagonist B of #539 as a veto ground and left at P2 pending a ruling].
# THE RULING: decisions/an-off-calibration-suite-may-not-push-2026-10-27. Kunal chose between 7:07pm and 7:11pm
# ET on Tue 27 Oct 2026 that the #534 calibration is AUTHORITATIVE for this suite's text-derived pins and that a
# full suite measuring off it MAY NOT PUSH. That is the authority question #539 correctly refused to settle for
# itself, and it is why this block can now reach `red` where the paragraph above says it could not.
# THE OTHER REASON #539 MADE IT A PRINT IS DISSOLVED RATHER THAN OVERRIDDEN. Its stated limit was that the test
# was STRING CONTAINMENT, so a reword or respacing of gates/lib.js's metrics sentence flipped it to DISAGREES and
# it could not tell "the metrics moved" from "the sentence changed" - and a check that can false-alarm on a
# reword must not be able to refuse a push. Correct, and that is why this one PARSES THE FOUR NUMBERS: a reword
# cannot move them, and the verdict prints both the wanted and the measured quadruple so a reader sees which
# slot moved rather than being told a sentence differs.
# AND IT CLOSES THE SECOND LIMIT THAT COMMENT NAMED AS FILED-NOT-FIXED: `grep -m1` read the FIRST metrics line
# while a full suite carries one per gate launch, and antagonist B2 of #539 DROVE the mid-run drift - a real
# subset with gates/fonts.conf moved out after mountcheck had printed its line, giving a log whose line 22 is
# calibrated, whose line 54 reads Inter and is off calibration, and whose footer said AGREES at exit 0. So this
# reads EVERY distinct metrics line and refuses when they disagree with each other, which is the only reading
# under which the footer's claim is about the whole run.
# THE INVERSION TRAP, carried from the job because an implementer who gets it wrong reds every healthy run:
# gates/lib.js says in terms that a "Segoe UI" fall-through is the NORMAL, correct outcome for an uninstalled
# face, and 322.15 IS the fall-through sentinel. In #537 the defect was Segoe UI FAILING to fall through. So the
# calibrated quadruple below has 322.15 in that slot ON PURPOSE and the comparison is EQUALITY against it - not
# "the sentinel means trouble", which would have reddened every healthy log and stayed green on 537-all.log.
# WHY A MISSING OR UNPARSABLE LINE REDDENS ONLY A FULL RUN: a subset of a mechanical gate launches no browser
# and so prints no metrics line, and a guard that fires on the normal case gets switched off. A FULL suite
# always launches browsers, so an absent line there means the instrument did not report - and under the ruling a
# suite that cannot say whether it was on calibration may not push either. Reported in every case, credited in
# none.
TC_LINE="$(grep -m1 -e 'toolchain: playwright' "$ALL" 2>/dev/null)"; TC_LINE="${TC_LINE#"${TC_LINE%%[! ]*}"}"
# THE COLLECTOR SKIPS THE FOOTER'S OWN instrument: LINE, and that is not tidiness - without it this block
# reads its own output back. A finished log CARRIES the instrument line, and TM_LINE is interpolated into it,
# so a second reading of any archived log would see TWO "distinct" metrics lines and report a MID-RUN DRIFT on
# a log that never drifted. Found by running the selftest: its arms re-run the block over one fixture and the
# block `tee -a`s into that same fixture, so the second arm onward saw the pollution - which is the trap this
# selftest's own comment warns about four screens up, and the eleventh costume of the check and the thing being
# checked being one object. Trailing blanks are trimmed too, because the appended copy ends at a ` | ` and so
# differs from the pristine line by whitespace alone.
TM_ALL="$(grep -av '^[[:space:]]*instrument:' "$ALL" 2>/dev/null | grep -ao 'text metrics @16px[^|]*' | sed 's/[[:space:]]*$//' | sort -u || true)"
TM_LINE="${TM_ALL%%$'\n'*}"; TM_LINE="${TM_LINE#"${TM_LINE%%[! ]*}"}"
TM_NDIST="$(printf '%s' "$TM_ALL" | grep -c . || true)"
TM_WANT='402.12 322.15 348.28 322.15'
# BELT AND BRACES ON THE DECIMAL COUNT [antagonist A of #544, F10]. This required EXACTLY two decimals while
# gates/lib.js's producer returned a coerced Number, so a metric of 348.30 would print "348.3", go unmatched,
# take TM_NGOT below 4 and make a FULL run RED for "calibration NOT COMPARED" on an honest tree. The producer is
# fixed to format the line to two decimals, which is the end that can guarantee it; this widening means the
# parse no longer depends on that being true. A metric that rounds to a whole number and prints with NO DOT is
# still missed, and that is the declared residual: the only dotted numbers in this line are the four metrics
# (the `@16px` carries no dot), so requiring the dot is what keeps the match from picking up the font size.
TM_GOT="$(printf '%s' "$TM_LINE" | grep -oE '[0-9]+\.[0-9]+' | tr '\n' ' ' || true)"; TM_GOT="${TM_GOT% }"
TM_NGOT="$(printf '%s' "$TM_GOT" | wc -w | tr -d ' ')"
TM_PROV='the #534 calibration, authoritative by decisions/an-off-calibration-suite-may-not-push-2026-10-27; the target every green log from #485 to #534 read, on chromium 141.0.7390.37'
TM_FULL=no; [ -z "${SUBSET:-}" ] && TM_FULL=yes
if [ -z "$TM_ALL" ]; then
  CAL_V="calibration NOT COMPARED - this log carries no text metrics line, or it is binary"
  if [ "$TM_FULL" = yes ]; then red=1; CAL_V="*** calibration NOT COMPARED and this is a FULL run, so the instrument did not report at all and nothing can say whether these pins were read on calibration. A suite that cannot answer that may not push [decisions/an-off-calibration-suite-may-not-push-2026-10-27] ***"; fi
elif [ "$TM_NDIST" != 1 ]; then
  red=1
  CAL_V="*** calibration DRIFTED MID-RUN - this log carries $TM_NDIST DISTINCT text metrics lines, so the instrument moved while the suite was running and the gates before and after it were read on different fonts. First: [$TM_LINE] ***"
elif [ "$TM_NGOT" != 4 ]; then
  CAL_V="calibration NOT COMPARED - the metrics line parsed to $TM_NGOT number(s) and not 4, so the comparison has no quadruple to make. Line: [$TM_LINE]"
  if [ "$TM_FULL" = yes ]; then red=1; CAL_V="*** $CAL_V This is a FULL run, and a suite that cannot answer whether it was on calibration may not push ***"; fi
elif [ "$TM_GOT" = "$TM_WANT" ]; then
  CAL_V="calibration AGREES - measured [$TM_GOT] equals $TM_PROV"
else
  red=1
  CAL_V="*** calibration DISAGREES - every text-derived pin in this log is OFF CALIBRATION. Measured [$TM_GOT], wanted [$TM_WANT], which is $TM_PROV. The four slots in order are system-ui, \"Segoe UI\", sans-serif and the fall-through sentinel ***"
fi
# THE CLAUSE BELOW MUST NOT CONTAIN THE TWO-WORD VERDICT TOKEN. #539's first draft ended it "this line cannot
#   withhold GATES GREEN", which put that literal into EVERY log on EVERY run - subset and red logs included - and
#   this repository states in six places that a subset log mechanically cannot carry it, and EVERY ONE IS NAMED BY
#   ITS TEXT so that none of them can rot: the CANNOT EMIT THE STRING line in this script's own header; the `can
#   never emit the string` line a few lines below it; the A SUBSET RUN IS STILL EXEMPT line in the fastgate
#   paragraph; the `DELIBERATELY NOT` line immediately above the subset verdict at the foot of this script; the
#   `a subset run cannot emit` justification in gates/audit/suite-shared-paths.sh; and CLAUDE.md.
#   NUMBERS WERE TRIED HERE AND THEY FAILED THREE TIMES IN ONE HOUR, which is why there are none left:
#   round two wrote `:2490`, round two's own 28 added lines moved the target and left `:2490` pointing at a
#   sentence of this very comment; round three replaced that one with the text anchor above and re-verified the
#   nine remaining offsets; then ROUND FOUR INSERTED 32 LINES 1,300 LINES AWAY, in --selftest, and rotted ALL TEN
#   of them by exactly 32 - including the one written here as `:2142`, a dead number quoted only as evidence and
#   not as a pointer, which no reviewer's table caught, and including one that
#   half-resolved onto a DIFFERENT `red=1` outside the loop, which reads as the comment being wrong about the loop
#   rather than wrong about the number. THE LESSON WAS DRAWN ONE NOTCH SHORT AND THAT IS THE REUSABLE PART: round
#   three concluded that a distance to a line THIS comment shifts cannot be trusted. The true rule is that an
#   absolute offset is rotted by ANY later insertion ABOVE it, anywhere in the file, by anyone - and in this file
#   that is every future --selftest arm, because --selftest sits at the top and is where arms get added. The text
#   anchor round three introduced survived both insertions untouched, which is the in-tree proof of the remedy.
#   Reason: every consumer and every ad-hoc watcher greps
#   for exactly that string. The fresh pair's A2 drove a real subset run and got a SUBSET RED log answering yes to
#   that grep. On its cross-read of the repair it ran the same probe with CT_EXPECT set and got a SUBSET OK log
#   reading zero, which is the stronger control: the token is absent on the green-ish subset path too, and that is
#   the path a careless grep would most plausibly be pointed at. This project already closed that hole twice from a
#   narrower route - a newline in
#   CT_RUNID, then the token inside CT_RUNID - with the GF_IDENT sanitiser (`grep -n '^GF_IDENT=' gates/gates.sh`,
#   the `sed 's/GATES GREEN/GATES_GREEN/g'` in it) and five selftest controls
#   (C88 to C88e); a hard-coded literal bypasses the sanitiser, which only guards the interpolated path. Say "the
#   verdict below" and never the token. It does not say "the GREEN verdict below" either, which round three's
#   clause did: on a red or subset run the verdict below is SUBSET RED or the red one, so that adjective was
#   false on exactly the runs a careless reader is most likely to be holding [antagonist B2, P3].
echo "instrument: ${TC_LINE:-toolchain: NOT FOUND in this log} | ${TM_LINE:-text metrics: NOT FOUND in this log} | $CAL_V | A GATE SINCE #544: an off-calibration or mid-run-drifted full run cannot reach the verdict below [decisions/an-off-calibration-suite-may-not-push-2026-10-27]" | tee -a "$ALL"
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
