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
    ( cd "$d" && G="$d/gates" ROOT="$d" STEM=probe ALL="$ST_T/d-all.log" SUBSET="" BLK="$ST_T/block.sh" \
      bash -c 'set -uo pipefail; red=0; . "$BLK" >/dev/null 2>&1; printf %s "$red"' 2>/dev/null )
  }
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

# ── G6's GAP-FILL DOOR IS WITHDRAWN FROM THIS RUN ON ANTAGONIST B's UPHELD VETO, AND THE MEASUREMENTS STAY ──
# jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16
# asks, as the last of its four clauses, that "the full suite does not go green on a gap fill row that nothing
# accounts for". This run built that door here and B broke it twice. Both reproductions were re-run by me before
# the veto was accepted, and both hold:
#   (a) THE CRITERION REJECTED THE CENSUS ITS OWN REFUSAL NAMED AS THE REMEDY. It accepted a gap-fill row only
#       with provenance `measured`, while `gates/buildnum.sh sweep --add` - the census - writes `git-log`.
#       Measured over this register's 323 `issued` rows: 228 git-log, 83 run-log, 11 measured, 1 handoff, so the
#       test accepted ELEVEN and rejected the 228 the tool itself wrote. The refusal line then told a stuck run
#       to run `sweep --add`, which is what produces the refusal. Circular, and false about this project's own
#       tooling. The "#519 rows are the worked example" citation was wrong the same way: their own notes say
#       "backfilled by the integration run" and "OWNERSHIP CORRECTION", so the criterion was calibrated on two
#       HAND-WRITTEN rows and rejected the tool's output - the exact inversion of the door's stated purpose.
#   (b) WORSE, AND IT IS WHY THIS COMES OUT RATHER THAN GETTING A PATCH: a run's OWN HONEST MINT is a row below
#       the base top and absent from the base whenever origin/main gained a higher number first - the
#       two-live-container case CLAUDE.md names by name. B reproduced it: another session mints #531 and pushes,
#       this run's earlier #530 row then reads "FILLS A GAP below the base series top #531", and the suite is a
#       HARD RED BEFORE ANY GATE, with no environment override anywhere in the block. The register is
#       append-only, so the only escape is to abandon the minted number - permanently burning a build number,
#       which is the harm this door's own text invoked.
#   (c) and two supporting faults: it said "the rows THIS COMMIT APPENDS" while reading the WORKING TREE, which
#       on this lane's documented path is always dirty after mint and build.sh; and it read the base with a bare
#       `git -C "$ROOT" show` while this same file records, in terms, that `--git-dir` must be explicit because
#       an inherited GIT_DIR/GIT_WORK_TREE is not overridden by `-C` - so the base series top, the one number
#       the whole verdict turns on, could come from another repository.
# WHAT A CORRECT DOOR NEEDS, so run 8 starts from the finding and not from scratch. The discriminator is not a
# provenance word - that is a shape, and a hand-written row can type any shape. It is the thing a census carries
# and a planted row cannot: field 3, the SHA of the commit that names the number, which `buildnum.sh` writes at
# its sweep append and which can be resolved and checked against that commit's subject. And the run's own mint
# must be exempt by construction, which `buildnum.sh stampable` already computes. Both are value tests. Until
# they exist, the full suite checks no series, which is exactly where d7a022b stood, so nothing regresses here.
# G6 therefore stays FIXED-IN-PART with this clause as its remainder, and the three measurements above are on
# its job so the next attempt does not re-derive them.
#
# ── #532 BUILT THIS DOOR A SECOND TIME AND WITHDREW IT A SECOND TIME. READ (b) ABOVE FIRST: I REBUILT IT. ──
# Clause (b) above names the wedge - a run's own mint reads as a gap fill once origin/main gains a higher
# number first - and prescribes the exemption: "which `buildnum.sh stampable` already computes". I did not take
# that prescription. I built a second ceiling instead: the extends-the-series test against the MERGE-BASE top
# rather than the base top, on the reasoning that a number above the top AS IT STOOD WHEN YOU BRANCHED cannot
# be back-filling anything. That reasoning is sound and the ceiling is still WRONG, because of what it is made
# of. MEASURED, by this run's antagonist B and reproduced by me before the veto was accepted:
#   (d) THE MERGE-BASE CEILING EVAPORATES ON THE ONE COMMAND YOU MUST RUN BEFORE YOU PUSH. Integrating
#       origin/main - `git merge origin/main`, or the rebase CLAUDE.md requires when main has moved - makes the
#       merge-base the other container's commit, so mbtop becomes ITS top and your own mint falls below the
#       ceiling again. Fixture: another container mints #533 and pushes while you hold #532. BEFORE the merge
#       the door reads `ok`; AFTER it, on a register that is the honest union of both containers' true rows, it
#       reads `RED - 2 appended, 2 filling a gap (0 yours, 0 census, 2 unaccounted)`, exit 1, before any gate.
#       So (b) is not fixed, it is DEFERRED BY ONE COMMAND - and the command it is deferred past is mandatory.
#   (e) AND NO CT_RUNID RECOVERS IT, which is what makes it a wedge rather than a nuisance. The field-7 test
#       asks that EVERY row for the number carry CT_RUNID. `gates/build.sh` writes a second row attributed to
#       `unknown-run` whenever CT_RUNID is not exported, which buildnum.sh:519 makes the default and CLAUDE.md
#       names as a known slip; `unknown-run` also fails the runId shape guard. With those two rows present no
#       value of CT_RUNID satisfies the test, and the remaining escapes are deleting a true row from an
#       append-only register or un-merging main. Measured at build__mine, build__other, a rotated id, and
#       unset: RED in all four.
# AND THE COVERAGE WAS OVERSTATED IN THE SAME DIRECTION, found independently by both antagonists of the second
# pair, which is why this comes out whole rather than getting a third patch:
#   (f) THE HEADLINE PREDICATE HAD NO CONTROL. The fix widened the row test from NF==9 to NF>=7 so that a row
#       carrying one trailing tab - which `buildnum.sh`'s own NF>=2 filter reads as a row that BURNS a number -
#       could not be invisible. Restoring NF==9 left the 51-case arm at 85 pass / 0 fail: not one case could
#       tell the new predicate from the one it replaced. The case NAMED for the reproduction,
#       `D4b-a-gap-fill-row-with-ONE-TRAILING-TAB-is-RED`, contained no trailing tab (`cat -A`: NF=9), so the
#       one input the veto turned on was driven by nothing. Same family as the `49-home` controls published as
#       bare counts whose stated input was not the input that ran.
#   (g) AND THE REFUSAL COULD NOT NAME THE ROW IT WAS REFUSING. The GAP line emits six tab fields and the
#       reader took seven, so `The row: $bn_f` printed empty on every refusal - while the same commit added two
#       instructions that depend on that row being printed, including the escape `CT_RUNID=<the value in field
#       7 of that row>`. One character, and nothing in the arm could see it.
# WHAT IS LEFT UNTRIED, so run 10 starts here rather than at the top. The prescription in (b) has still never
# been built: delegate the exemption to `gates/buildnum.sh stampable`, the project's own authority on whether a
# number belongs to this run, instead of reimplementing it as a ceiling plus a field-7 test. It is computed
# from the rows' attribution and NOT from any series top, so it is the one formulation measured here that
# integration cannot move; it carries 47 controls of its own; and delegating makes the door and the authority
# agree by construction, which neither draft did - at the withdrawal of this one they disagreed about an honest
# tree in both directions. KNOW WHAT IT DOES NOT COVER before building on it: a second row under a number the
# base ALREADY holds is not a gap fill at all, and that is the #416 damage class (two trees, one number) this
# job's own title names as "a duplicate row takes a fast green". A door built only on `stampable` would pass it.
# TWO PASSES HAVE NOW ENDED HERE AND NOTHING REGRESSES EITHER TIME: with the door out, the full suite checks no
# series, which is where d7a022b stood. G6 stays FIXED-IN-PART with this clause as its remainder. The
# reproductions for (d) through (g) are on its job, with the fixture scripts, so the third attempt measures
# them rather than rediscovering them - which is what both of these passes spent their antagonist budget on.

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
  ( cd "$ROOT" && timeout 900 bash "$DRIVESH" fixed ) > "$dlog" 2> "$dlog.err"; drc=$?
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
  if [ "$drc" -eq 2 ] && [ "$dfail" -eq 0 ] && [ "$dok" -eq 0 ] && [ "$drefuse" -ge 1 ] && [ "$dtblmis" -eq 0 ]; then   # #525: a decline must SAY so; #531: and its table must be readable
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
echo "gates ran ($(( ${#gates[@]} ))): $(for f in "${gates[@]}"; do printf '%s ' "$(basename "$f" .js)"; done)" | tee -a "$ALL"
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
