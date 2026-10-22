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

  # ── #532. THE GAP-FILL DOOR'S CONTROLS (D1 to D18) ───────────────────────────────────────────────────────
  # jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16
  # They live HERE, in a --selftest arm, and not in gates/fastgate-drive.sh, for the reason the #461 trap gives:
  # the thing under test is gates.sh's own verdict logic, and they must be re-runnable by any later reader in
  # seconds rather than reproduced from a run report. Each drives THE REAL BLOCK, extracted from this very file
  # by the same awk shape the unit-block arm above uses, so reverting the door makes these FAIL instead of
  # leaving them green against a copy that no longer matches the code.
  # EACH CASE PRINTS THE DOOR'S OWN LINE, which is what the brief for this build required of every control.
  # THE SCRATCH REPOSITORIES ARE REAL REPOSITORIES WITH refs/remotes/origin/main SET BY HAND. A plain clone has
  # no such ref and the door reads RED there BY DESIGN (D17 is that case), so every fixture sets it explicitly.
  # NEVER A git worktree OF THIS CHECKOUT: worktrees share refs and .git/info/exclude, and #530's controls moved
  # the real refs/remotes/origin/main that way. Every repo below is created by mktemp and deleted with ST_T.
  awk '/^BN_REL=/{p=1} /^gates=\("\$G\/mountcheck.js"\)/{if(p)exit} p{print}' "$SF" > "$ST_T/door.sh"
  st D1-the-door-block-was-extracted "$( [ -s "$ST_T/door.sh" ] && echo yes || echo no )" yes

  st_dreg(){ # prints a base register: the header, then rows 500..530 with 517 a HOLE, so top=530
    printf '# number\tstate\tsha\tbundleMd5\tsourceMd5\tat\tmintedBy\tprovenance\tnote\n'
    local i
    for i in $(seq 500 530); do
      [ "$i" = "517" ] && continue
      printf '%s\tminted\t-\t-\t-\t2026-10-01T00:00Z\tbuild__base\tminted\tbase fixture row for the gap-fill door controls\n' "$i"
    done
  }
  st_drow(){ # $1 number, $2 runId, $3 field-3 sha
    printf '%s\tminted\t%s\t-\t-\t2026-10-22T00:00Z\t%s\tminted\tfixture row for the gap-fill door controls\n' "$1" "$3" "$2"
  }
  st_dgit(){ ( cd "$1" && git -c commit.gpgsign=false -c user.name=d -c user.email=d@l "${@:2}" >/dev/null 2>&1 ); }
  st_dnew(){ # $1 = dir. A repository whose only commit carries the base register, with origin/main set to it.
    mkdir -p "$1/gates"; st_dgit "$1" init -q 2>/dev/null || ( cd "$1" && git init -q )
    st_dreg > "$1/gates/build-numbers.tsv"
    st_dgit "$1" add -A; st_dgit "$1" commit -qm "base: the register fixture"
    st_dgit "$1" update-ref refs/remotes/origin/main HEAD
  }
  st_drun(){ # $1 = dir, $2 = CT_RUNID ("" to leave it unset). Prints "<rc>|<the door's line>".
    local rc line out="$ST_T/d.out"
    if [ -z "$2" ]; then
      ( cd "$1" && env -u CT_RUNID G="$1/gates" ROOT="$1" N='#999' ALL="$ST_T/d-all.log" \
          bash "$ST_T/door.sh" ) > "$out" 2>&1; rc=$?
    else
      ( cd "$1" && CT_RUNID="$2" G="$1/gates" ROOT="$1" N='#999' ALL="$ST_T/d-all.log" \
          bash "$ST_T/door.sh" ) > "$out" 2>&1; rc=$?
    fi
    line="$(grep -m1 '^build-number series:' "$out" || echo 'NO DOOR LINE')"
    printf '%s|%s\n' "$rc" "$line"
  }
  st_dv(){ # the verdict word only, so a case asserts ok/RED/NOT and not a whole sentence
    case "$1" in
      0\|*ok\ -*) echo ok ;;
      1\|*RED\ -*) echo RED ;;
      0\|*NOT\ CHECKED*) echo NOTCHECKED ;;
      *NO\ DOOR\ LINE*) echo NOLINE ;;
      *) echo "unexpected:$1" ;;
    esac
  }

  # D2/D3. THE HONEST TREE, which is the case a guard that fires on the normal path would break. The run's own
  # mint is ABOVE the base top, so it is not a gap fill at all and CT_RUNID cannot matter - which is why D3
  # (CT_RUNID unset) must also read ok, and is the declaration the door's comment makes.
  st_dnew "$ST_T/r2"; st_drow 531 build__mine - >> "$ST_T/r2/gates/build-numbers.tsv"
  ST_D2="$(st_drun "$ST_T/r2" build__mine)"; st D2-honest-mint-above-the-base-top-is-ok "$(st_dv "$ST_D2")" ok
  ST_D3="$(st_drun "$ST_T/r2" "")";          st D3-honest-tree-is-ok-with-CT_RUNID-unset "$(st_dv "$ST_D3")" ok
  st D2-line-reports-one-appended-row "$(printf '%s' "$ST_D2" | grep -c '1 appended, 0 filling a gap')" 1

  # D4/D5/D6. THE BARE GAP-FILL ROW - a foreign runId and '-' in field 3 - in all three shapes a push can carry
  # it. D4 is UNCOMMITTED, which is the shape #530's door could not see and the shape this lane's documented
  # path always produces: mint, build.sh, then the suite, with the rows still unstaged.
  st_dnew "$ST_T/r4"; st_drow 517 build__someone_else - >> "$ST_T/r4/gates/build-numbers.tsv"
  ST_D4="$(st_drun "$ST_T/r4" build__mine)"; st D4-bare-gap-fill-UNCOMMITTED-is-RED "$(st_dv "$ST_D4")" RED
  st_dgit "$ST_T/r4" add -A; st_dgit "$ST_T/r4" commit -qm "append a gap-fill row"
  ST_D5="$(st_drun "$ST_T/r4" build__mine)"; st D5-bare-gap-fill-COMMITTED-is-RED "$(st_dv "$ST_D5")" RED
  grep -v '^517' "$ST_T/r4/gates/build-numbers.tsv" > "$ST_T/r4/x" && mv "$ST_T/r4/x" "$ST_T/r4/gates/build-numbers.tsv"
  ST_D6="$(st_drun "$ST_T/r4" build__mine)"; st D6-committed-then-removed-from-the-worktree-only-is-RED "$(st_dv "$ST_D6")" RED
  st D4-line-names-the-unaccounted-row "$(printf '%s' "$ST_D4" | grep -c '1 unaccounted')" 1

  # D7/D8/D9. THE WEDGE #530's DOOR DIED ON, in both of its shapes. Another container mints 532 and pushes, so
  # the base top is 532 and this run's own honest 531 is BELOW it and absent from the base. It must read ok, and
  # it must read ok whether HEAD lacks the base's new row (D7) or carries it under this run's own row (D8).
  # D9 IS THE DECLARED COST: with CT_RUNID unset the "yours" test cannot pass, so the same tree reads RED. That
  # is on G6 as a known limit, and it is why the door's comment states it rather than leaving it to be found.
  st_dnew "$ST_T/r7"
  st_drow 532 build__other_container - >> "$ST_T/r7/gates/build-numbers.tsv"
  st_dgit "$ST_T/r7" add -A; st_dgit "$ST_T/r7" commit -qm "the other container's higher mint"
  st_dgit "$ST_T/r7" update-ref refs/remotes/origin/main HEAD
  st_dgit "$ST_T/r7" reset -q --hard HEAD~1
  st_drow 531 build__mine - >> "$ST_T/r7/gates/build-numbers.tsv"
  ST_D7="$(st_drun "$ST_T/r7" build__mine)"; st D7-own-mint-below-a-raised-base-top-HEAD-lacks-it-is-ok "$(st_dv "$ST_D7")" ok
  ST_D9="$(st_drun "$ST_T/r7" "")";          st D9-same-tree-with-CT_RUNID-unset-is-RED-as-declared "$(st_dv "$ST_D9")" RED
  st_dnew "$ST_T/r8"
  st_drow 532 build__other_container - >> "$ST_T/r8/gates/build-numbers.tsv"
  st_dgit "$ST_T/r8" add -A; st_dgit "$ST_T/r8" commit -qm "the other container's higher mint"
  st_dgit "$ST_T/r8" update-ref refs/remotes/origin/main HEAD
  st_drow 531 build__mine - >> "$ST_T/r8/gates/build-numbers.tsv"
  ST_D8="$(st_drun "$ST_T/r8" build__mine)"; st D8-own-mint-below-a-raised-base-top-on-top-of-it-is-ok "$(st_dv "$ST_D8")" ok
  st D7-line-counts-the-gap-fill-as-yours "$(printf '%s' "$ST_D7" | grep -c '1 filling a gap (1 yours')" 1

  # D10. THE RUNID IS TAKEN ON TRUST and this control shows the verdict rather than leaving it implied: a
  # hand-written gap-fill row that TYPES this run's runId into field 7 reads ok. Declared as a known limit on
  # G6. Closing it would need an identity channel outside the file, which this door deliberately does not invent.
  st_dnew "$ST_T/r10"; st_drow 517 build__mine - >> "$ST_T/r10/gates/build-numbers.tsv"
  ST_D10="$(st_drun "$ST_T/r10" build__mine)"; st D10-a-typed-runId-reads-as-yours-KNOWN-LIMIT "$(st_dv "$ST_D10")" ok

  # D11/D12/D13. THE CENSUS TEST, which is the half that judges a row nobody can claim. Field 3 must resolve to
  # a commit whose SUBJECT names the number, by the extractor `buildnum.sh sweep --add` uses.
  #   D11 a commit already in the base, subject names #517            -> ok
  #   D12 a commit whose subject does NOT name #517                   -> RED (the row's own claim is false)
  #   D13 a commit THE SAME PUSH ADDS, subject names #517             -> ok, and it is a FORGERY PATH, declared
  #       as a known limit on G6 with this control as its evidence: a run can write both the row and the commit
  #       its field 3 cites. The repair is outside this door (it needs a base that already holds the commit).
  st_dnew "$ST_T/r11"
  st_dgit "$ST_T/r11" commit -q --allow-empty -m "#517 close-out: a commit that names the number"
  ST_SHA517="$( cd "$ST_T/r11" && git rev-parse HEAD )"
  st_dgit "$ST_T/r11" commit -q --allow-empty -m "a commit that names no build number at all"
  ST_SHANON="$( cd "$ST_T/r11" && git rev-parse HEAD )"
  st_dgit "$ST_T/r11" update-ref refs/remotes/origin/main HEAD
  st_drow 517 build__someone_else "$ST_SHA517" >> "$ST_T/r11/gates/build-numbers.tsv"
  ST_D11="$(st_drun "$ST_T/r11" build__mine)"; st D11-a-census-row-citing-a-base-commit-that-names-it-is-ok "$(st_dv "$ST_D11")" ok
  grep -v '^517' "$ST_T/r11/gates/build-numbers.tsv" > "$ST_T/r11/x" && mv "$ST_T/r11/x" "$ST_T/r11/gates/build-numbers.tsv"
  st_drow 517 build__someone_else "$ST_SHANON" >> "$ST_T/r11/gates/build-numbers.tsv"
  ST_D12="$(st_drun "$ST_T/r11" build__mine)"; st D12-a-census-row-whose-commit-does-not-name-it-is-RED "$(st_dv "$ST_D12")" RED
  st_dnew "$ST_T/r13"
  st_dgit "$ST_T/r13" commit -q --allow-empty -m "#517 records: a commit this very push adds"
  ST_SHASAME="$( cd "$ST_T/r13" && git rev-parse HEAD )"
  st_drow 517 build__someone_else "$ST_SHASAME" >> "$ST_T/r13/gates/build-numbers.tsv"
  ST_D13="$(st_drun "$ST_T/r13" build__mine)"; st D13-a-census-row-citing-a-commit-of-the-same-push-is-ok-KNOWN-LIMIT "$(st_dv "$ST_D13")" ok

  # D14. A REAL DELETED BASE ROW. The register is append-only, so a row the merge-base has and the tree does not
  # is a tamper. Measured against MERGE-BASE and never against origin/main - D7 and D8 are the control that
  # shows the difference, because a base that moved AHEAD has the same surface signature and reads 0 deleted.
  st_dnew "$ST_T/r14"
  grep -v '^510' "$ST_T/r14/gates/build-numbers.tsv" > "$ST_T/r14/x" && mv "$ST_T/r14/x" "$ST_T/r14/gates/build-numbers.tsv"
  ST_D14="$(st_drun "$ST_T/r14" build__mine)"; st D14-a-deleted-base-row-is-RED "$(st_dv "$ST_D14")" RED
  st D14-line-counts-one-deletion "$(printf '%s' "$ST_D14" | grep -c '1 deleted')" 1
  st D7-and-D8-prove-a-moved-base-is-not-a-deletion "$(printf '%s|%s' "$(st_dv "$ST_D7")" "$(st_dv "$ST_D8")")" "ok|ok"

  # D15/D16/D17. WHAT THE DOOR DOES WHEN IT CANNOT MEASURE. Inside a work tree an unreadable base register or a
  # missing origin/main is RED, loudly, because gates/verify-log.sh reads no door line, so a NOT CHECKED that
  # let the suite run could still authorise a push. OUTSIDE a work tree it is NOT CHECKED and the suite runs,
  # which is the known limit G6 carries.
  st_dnew "$ST_T/r15"; st_dgit "$ST_T/r15" update-ref -d refs/remotes/origin/main
  ST_D15="$(st_drun "$ST_T/r15" build__mine)"; st D15-no-origin-main-ref-is-RED "$(st_dv "$ST_D15")" RED
  mkdir -p "$ST_T/r16/gates"; st_dreg > "$ST_T/r16/gates/build-numbers.tsv"
  ST_D16="$(st_drun "$ST_T/r16" build__mine)"; st D16-outside-a-git-work-tree-is-NOT-CHECKED "$(st_dv "$ST_D16")" NOTCHECKED
  st_dnew "$ST_T/r17"; st_dgit "$ST_T/r17" rm -q --cached gates/build-numbers.tsv
  rm -f "$ST_T/r17/gates/build-numbers.tsv"
  ST_D17="$(st_drun "$ST_T/r17" build__mine)"; st D17-a-missing-worktree-register-is-RED "$(st_dv "$ST_D17")" RED

  # D18. THE CONTROL THAT SHOWS THE DOOR IS WHAT REDDENS D4, rather than something else in the fixture: the SAME
  # tree run through an EMPTY block prints no door line and exits 0. This is the "with the door taken out" case
  # the brief required, done here rather than by editing a tracked file, because an empty block IS the tree with
  # the door removed as far as this verdict is concerned.
  : > "$ST_T/empty.sh"
  ST_D18="$( ( cd "$ST_T/r10" && CT_RUNID=build__mine G="$ST_T/r10/gates" ROOT="$ST_T/r10" N='#999' \
      ALL="$ST_T/d-all.log" bash "$ST_T/empty.sh" ) >"$ST_T/d18.out" 2>&1; printf '%s|%s' "$?" \
      "$(grep -m1 '^build-number series:' "$ST_T/d18.out" || echo 'NO DOOR LINE')" )"
  st D18-with-the-door-removed-the-same-tree-prints-no-line-and-exits-0 "$(st_dv "$ST_D18")" NOLINE

  # D19. THE DOOR'S EXTRACTOR IS A COPY OF buildnum.sh's SHAMAP, so it is pinned BOTH WAYS. Textually, the two
  # grep stages must be byte-identical after whitespace normalisation; behaviourally, they must agree on the
  # same fixture subjects. A copy nobody compares is how two extractors drift and a census row stops resolving.
  ST_EX_DOOR="$(grep -oE "grep -oiE '\(#\|\\\\bbuild \+\)\[0-9\]\{3,4\}'" "$ST_T/door.sh" | head -1)"
  ST_EX_BN="$(grep -oE "grep -oiE '\(#\|\\\\bbuild \+\)\[0-9\]\{3,4\}'" "$SG/buildnum.sh" | head -1)"
  st D19a-the-extractor-is-byte-identical-to-buildnum-shs "$( [ -n "$ST_EX_DOOR" ] && [ "$ST_EX_DOOR" = "$ST_EX_BN" ] && echo same || echo "DRIFTED" )" same
  st_dex(){ printf '%s\n' "$1" | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | sed 's/^0*//' | tr '\n' ' ' | sed 's/ $//'; }
  st D19b-extractor-on-a-close-out-subject "$(st_dex '#517 close-out: the records')" "517"
  st D19c-extractor-on-the-word-build "$(st_dex 'build 517 landed')" "517"
  st D19d-extractor-ignores-a-bare-number "$(st_dex 'fixed 517 things')" ""
  st D19e-extractor-takes-both-numbers "$(st_dex '#517 and #518 together')" "517 518"
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

# ── G6. THE GAP-FILL DOOR: THE FULL SUITE DOES NOT GO GREEN ON AN APPENDED REGISTER ROW NOTHING ACCOUNTS FOR ──
# jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16,
# the LAST of its four clauses: "the full suite does not go green on a gap fill row that nothing accounts for".
# #529 landed the first three in gates/fastgate.sh's register arm (rows judged AS ROWS, with multiplicity).
# #530 built a door here and WITHDREW every executable line of it on antagonist B's upheld veto. Both of B's
# reproductions were re-run before the veto was accepted and both held, and this door is built AROUND them
# rather than over them - so read these two before changing anything here:
#   (a) ITS CRITERION WAS A PROVENANCE WORD, AND A WORD IS A SHAPE A HAND-WRITTEN ROW CAN TYPE. It accepted a
#       gap-fill row only at provenance `measured`, while `buildnum.sh sweep --add` - the census, the tool its
#       own refusal line told a stuck run to use - writes `git-log`. Over the register's 323 `issued` rows:
#       228 git-log, 83 run-log, 11 measured, 1 handoff. It accepted ELEVEN and rejected the 228 the tool
#       itself wrote, and the two `measured` rows it was calibrated on are #519's HAND-WRITTEN backfill pair.
#   (b) AND IT COULD WEDGE THE LANE. A gap fill is any appended number below the base series top and absent
#       from the base - and A RUN'S OWN HONEST MINT IS EXACTLY THAT whenever origin/main gains a higher number
#       first, which is the two-live-container case CLAUDE.md names. B reproduced it end to end: the suite went
#       HARD RED before any gate with no override anywhere, and the only escape was abandoning the minted
#       number, permanently burning one - the very harm the door's own text invoked.
# SO THE TWO TESTS BELOW ARE VALUE TESTS AND NEITHER IS A WORD. A row is accounted for when it is YOURS (field
# 7 is this run's CT_RUNID on EVERY row for that number in the source the row came from, which is the predicate
# `buildnum.sh stampable` applies) or when it is a CENSUS ROW (field 3 is a sha that resolves in this repository
# to a commit whose subject NAMES that number, by the same extractor `sweep --add` uses). The first makes the
# wedge impossible by construction; the second is the thing a census carries and a planted row cannot.
# WHY NOT CALL `stampable` ITSELF: its bare exit 0 is also given for a number on NO row, and it reads the
# WORKING TREE only (gates/buildnum.sh:407-409). Both are wrong here - the two-container case must read ok for
# a reason, and a committed row must be judged against the commit. So the predicate is re-implemented on the
# source actually under test, and `stampable` stays the documented name for it.
# FOUR MORE THINGS #530's VETO FOUND, EACH FIXED HERE RATHER THAN REDISCOVERED:
#   - IT READ THE WORKING TREE WHILE SAYING "the rows THIS COMMIT APPENDS". Both of B's reproductions fired with
#     nothing committed. This door judges BOTH: the rows HEAD appends against refs/remotes/origin/main AND the
#     rows the working tree holds that HEAD does not, because on this lane's documented path (mint, then
#     build.sh, then the suite) the rows are uncommitted while the suite runs, so a door reading HEAD alone is
#     blind exactly there. Its line says how many rows it read from each of the four sources.
#   - IT READ THE BASE WITH A BARE `git -C`. `-C` does NOT override an inherited GIT_DIR, so the base series
#     top - the one number the whole verdict turns on - could come from another repository. BNGIT below is an
#     ARRAY with --git-dir and --work-tree both explicit, and every git call in this block goes through it.
#   - A MOVED BASE IS NOT A DELETION. A row the base has and HEAD lacks has the SAME surface signature as a
#     deleted row, so the deletion test is taken against merge-base(HEAD, origin/main) and never against
#     origin/main: an unrebased HEAD contains its own merge-base by construction, so a base that moved ahead
#     reads as zero deletions. (antagonist-a-530's alsoDisclosed: #530's door read a deletion as NOT CHECKED.)
#   - NO EARLY-EXIT PIPE IS ADDED. The register is ~236 KB, well past a pipe buffer, and under `set -uo
#     pipefail` a short-circuiting consumer kills the producer with SIGPIPE and the pipeline reports 141 - the
#     MANI_LINE class 30 lines above, and gatemanifest.sh's `sigpipe` ceiling. Every register here is written to
#     a FILE and read by one awk pass; the only greps are over a ONE-LINE commit subject, and the membership
#     test after them is a bash loop, not a `grep -q`.
# WHAT IT DOES WHEN CT_RUNID IS UNSET, DECLARED BECAUSE gates.sh RUNS UNDER `set -u` AND MOST LAUNCHES CARRY NO
# CT_RUNID (the nightly suite among them): the "yours" test cannot pass, so an honest tree still reads ok -
# it has no gap-fill row at all, its mint being ABOVE the base top - and ONLY a run's own mint below a RAISED
# base top reads otherwise. That is the one case where an unset CT_RUNID turns an ok into a RED, and it is on
# G6 as a declared known limit rather than engineered away, because inventing a second identity channel here
# would be a worse door than the one it replaced.
# TWO MORE KNOWN LIMITS, DECLARED ON G6 WITH CONTROLS RATHER THAN LEFT TO BE FOUND: field 7 is taken ON TRUST,
# so a hand-written row that types this run's own runId reads as yours; and a census row whose field-3 commit a
# SHALLOW clone cannot fetch reads unaccounted, i.e. RED - the safe side, and loud.
# OUTSIDE A GIT WORK TREE there is no base to compare against and the line reads NOT CHECKED and the suite runs;
# INSIDE one, an unreadable base register or an uncomputable merge-base is RED, loudly, because
# gates/verify-log.sh reads no door line and a NOT CHECKED that let the suite run could still authorise a push.
# A plain `git clone`, and a single-branch clone, have NO refs/remotes/origin/main and so read RED by that rule:
# every throwaway clone of a control must `git update-ref refs/remotes/origin/main <sha>` before gates.sh, and
# that RED is the declared behaviour, not a wedge.
BN_REL="gates/build-numbers.tsv"
BNGIT=(git --git-dir="$ROOT/.git" --work-tree="$ROOT")
BN_T="$(mktemp -d)"
BN_RED=0
BN_LINE="build-number series: NOT CHECKED"
BN_DETAIL=""
if [ ! -e "$ROOT/.git" ]; then
  BN_LINE="build-number series: NOT CHECKED - $ROOT is not a git work tree, so there is no base register to judge against"
else
  bn_fail(){ BN_RED=1; BN_LINE="build-number series: RED - $1"; }
  if ! "${BNGIT[@]}" show "refs/remotes/origin/main:$BN_REL" > "$BN_T/base.tsv" 2>"$BN_T/err"; then
    bn_fail "cannot read $BN_REL at refs/remotes/origin/main, so the base series is unknown and no appended row can be judged. In a throwaway clone run \`git update-ref refs/remotes/origin/main <sha>\` first."
  elif ! "${BNGIT[@]}" show "HEAD:$BN_REL" > "$BN_T/head.tsv" 2>>"$BN_T/err"; then
    bn_fail "cannot read $BN_REL at HEAD"
  elif ! BN_MB="$("${BNGIT[@]}" merge-base HEAD refs/remotes/origin/main 2>>"$BN_T/err")"; then
    bn_fail "cannot compute merge-base(HEAD, refs/remotes/origin/main), so a deleted base row cannot be told from a base that moved ahead"
  elif ! "${BNGIT[@]}" show "$BN_MB:$BN_REL" > "$BN_T/mb.tsv" 2>>"$BN_T/err"; then
    bn_fail "cannot read $BN_REL at merge-base $BN_MB"
  elif [ ! -f "$ROOT/$BN_REL" ]; then
    bn_fail "$BN_REL is missing from the working tree"
  else
    cp "$ROOT/$BN_REL" "$BN_T/wt.tsv"
    # ONE awk PASS OVER THE FOUR REGISTERS. A data row is NF==9 with a bare number in field 1, which drops the
    # 62 comment lines AND the header row (`# number<TAB>state<TAB>...`), whose NF is also 9.
    # THE MULTISET DIFFERENCE IS THE POINT: #529's own defect was `grep -vxF -f`, a SET difference, in which a
    # byte-identical duplicate row is not in the difference at all. Here each source is consumed row by row in
    # file order against a COPY of the previous source's counts, so a duplicate appears as an appended row.
    # -F'\t' IS LOAD-BEARING AND IS WHY THIS LINE IS NOT A ONE-LINER. Without it awk splits on WHITESPACE, so
    # the note field's spaces make NF large, `NF==9` is false for EVERY row, and the door classifies nothing and
    # reads `ok` on every tree - a door that cannot fail. That is exactly how it was first written here, and D4,
    # D5, D6, D9, D12 and D14 below all read ok until this flag was added. The register is a TSV; say so.
    awk -F'\t' -v BASE="$BN_T/base.tsv" -v MB="$BN_T/mb.tsv" -v HEADF="$BN_T/head.tsv" -v WTF="$BN_T/wt.tsv" \
        -v RUNID="${CT_RUNID:-}" '
      function isrow() { return (NF==9 && $1 ~ /^[0-9]+$/) }
      FILENAME==BASE { nb_all++; if(isrow()){ bc[$0]++; bn[$1]++; nb++; if($1+0>top) top=$1+0 } }
      FILENAME==MB   { if(isrow()){ mc[$0]++; mrows[++nm]=$0 } }
      FILENAME==HEADF{ if(isrow()){ hc[$0]++; hrows[++nh]=$0; hn[$1]++; if(RUNID!="" && $7==RUNID) hmine[$1]++ } }
      FILENAME==WTF  { if(isrow()){ wc[$0]++; wrows[++nw]=$0; wn[$1]++; if(RUNID!="" && $7==RUNID) wmine[$1]++ } }
      END{
        printf "COUNTS\t%d\t%d\t%d\t%d\t%d\n", nb+0, nm+0, nh+0, nw+0, top+0
        # DELETIONS, against merge-base and never against origin/main (see the comment above).
        # Iterated in merge-base FILE ORDER with a seen[] guard, not `for(l in mc)`: awk`s associative
        # iteration order is unspecified, and a verdict whose lines reorder between runs is a verdict two
        # readers can disagree about. The row is flattened (tabs -> " | ") because the reader below splits on
        # tabs and a raw row would split across its own fields.
        for(i=1;i<=nm;i++){ l=mrows[i]; if(l in seen) continue; seen[l]=1
          d1 = mc[l] - (l in hc ? hc[l] : 0); d2 = mc[l] - (l in wc ? wc[l] : 0)
          d = (d1 > d2 ? d1 : d2)
          if(d > 0){ l2=l; gsub(/\t/," | ",l2); printf "DEL\t%d\t%s\n", d, l2 }
        }
        # APPENDED = (HEAD minus BASE) then (WORKTREE minus HEAD), each with multiplicity, in file order.
        for(l in bc) left[l]=bc[l]
        for(i=1;i<=nh;i++){ l=hrows[i]
          if((l in left) && left[l]>0){ left[l]-- } else { app[++na]=l; src[na]="HEAD" } }
        for(l in hc) left2[l]=hc[l]
        for(i=1;i<=nw;i++){ l=wrows[i]
          if((l in left2) && left2[l]>0){ left2[l]-- } else { app[++na]=l; src[na]="worktree" } }
        printf "APP\t%d\n", na+0
        for(i=1;i<=na;i++){
          n=split(app[i], f, "\t"); num=f[1]
          # A row for a number the BASE already has is not a gap fill: that is the ordinary mid-run rebuild,
          # which this register`s own header calls the median behaviour of a run that fixed something mid-pass.
          # A number ABOVE the base top is not a gap fill either: it EXTENDS the series.
          if((num in bn) || num+0 > top+0) continue
          if(src[i]=="HEAD"){ tot=hn[num]+0; mineN=hmine[num]+0 } else { tot=wn[num]+0; mineN=wmine[num]+0 }
          mine = (RUNID!="" && tot>0 && tot==mineN) ? 1 : 0
          r2=app[i]; gsub(/\t/," | ",r2)
          printf "GAP\t%s\t%s\t%s\t%d\t%s\n", src[i], num, f[3], mine, r2
        }
      }' "$BN_T/base.tsv" "$BN_T/mb.tsv" "$BN_T/head.tsv" "$BN_T/wt.tsv" > "$BN_T/out" 2>>"$BN_T/err" \
      || bn_fail "the register scan itself failed; see the suite log"
    if [ "$BN_RED" -eq 0 ]; then
      BN_NB=0; BN_NM=0; BN_NH=0; BN_NW=0; BN_TOP=0; BN_NAPP=0
      BN_GAPS=0; BN_OK_MINE=0; BN_OK_CENSUS=0; BN_UNACC=0; BN_NDEL=0
      while IFS=$'\t' read -r bn_kind bn_a bn_b bn_c bn_d bn_e; do
        case "$bn_kind" in
          COUNTS) BN_NB="$bn_a"; BN_NM="$bn_b"; BN_NH="$bn_c"; BN_NW="$bn_d"; BN_TOP="$bn_e" ;;
          APP)    BN_NAPP="$bn_a" ;;
          DEL)    BN_NDEL=$(( BN_NDEL + bn_a ))
                  BN_DETAIL="$BN_DETAIL
  DELETED FROM THE REGISTER ($bn_a copy/copies), present at merge-base $BN_MB and absent now: $bn_b" ;;
          GAP)    BN_GAPS=$(( BN_GAPS + 1 ))
                  # bn_a source, bn_b number, bn_c field 3 (the census sha), bn_d the "yours" verdict
                  if [ "$bn_d" = "1" ]; then
                    BN_OK_MINE=$(( BN_OK_MINE + 1 ))
                    BN_DETAIL="$BN_DETAIL
  gap-fill #$bn_b ($bn_a) is ACCOUNTED FOR: yours - field 7 is ${CT_RUNID:-} on every row for #$bn_b in that source"
                  else
                    bn_cen=""
                    if [ -n "$bn_c" ] && [ "$bn_c" != "-" ] && [[ "$bn_c" =~ ^[0-9a-f]{7,40}$ ]] \
                       && "${BNGIT[@]}" cat-file -e "$bn_c^{commit}" 2>/dev/null; then
                      bn_subj="$("${BNGIT[@]}" log -1 --format=%s "$bn_c" 2>/dev/null || true)"
                      # THE EXTRACTOR IS buildnum.sh's SHAMAP, COPIED (gates/buildnum.sh:764-770), and the
                      # control for the copy is a case that FAILS when the two disagree on one fixture subject.
                      # NO awk INTERVAL MATCH and no early-exit consumer: the producer is one short subject.
                      bn_nums="$(printf '%s\n' "$bn_subj" | grep -oiE '(#|\bbuild +)[0-9]{3,4}' \
                                 | grep -oE '[0-9]{3,4}' | sed 's/^0*//' || true)"
                      for bn_x in $bn_nums; do [ "$bn_x" = "$bn_b" ] && bn_cen="$bn_c"; done
                    fi
                    if [ -n "$bn_cen" ]; then
                      BN_OK_CENSUS=$(( BN_OK_CENSUS + 1 ))
                      BN_DETAIL="$BN_DETAIL
  gap-fill #$bn_b ($bn_a) is ACCOUNTED FOR: census row - field 3 $bn_cen resolves to a commit whose subject names #$bn_b"
                    else
                      BN_UNACC=$(( BN_UNACC + 1 ))
                      BN_DETAIL="$BN_DETAIL
  gap-fill #$bn_b ($bn_a) IS UNACCOUNTED FOR. It is below the base series top #$BN_TOP and absent from the base,
  and it is neither yours (field 7 is not ${CT_RUNID:-<CT_RUNID unset>} on every row for #$bn_b) nor a census row (field 3 '$bn_c' does
  not resolve to a commit whose subject names #$bn_b). The row: $bn_e"
                    fi
                  fi ;;
        esac
      done < "$BN_T/out"
      if [ "$BN_NDEL" -gt 0 ] || [ "$BN_UNACC" -gt 0 ]; then BN_RED=1; fi
      BN_LINE="build-number series: $( [ "$BN_RED" -eq 1 ] && echo RED || echo ok ) - read base $BN_NB / merge-base $BN_NM / HEAD $BN_NH / worktree $BN_NW row(s); $BN_NAPP appended, $BN_GAPS filling a gap ($BN_OK_MINE yours, $BN_OK_CENSUS census, $BN_UNACC unaccounted), $BN_NDEL deleted; base series top #$BN_TOP"
    fi
  fi
fi
printf '%s\n' "$BN_LINE" | tee -a "$ALL"
[ -n "$BN_DETAIL" ] && printf '%s\n' "$BN_DETAIL" | tee -a "$ALL"
rm -rf "$BN_T"
if [ "$BN_RED" -eq 1 ]; then
  echo "GATES RED $N — stopped before running any gate: the build-number register carries a row nothing accounts for." | tee -a "$ALL"
  echo "  A gap-fill row is an appended row below the base series top and absent from the base. It is accounted" | tee -a "$ALL"
  echo "  for when it is YOURS (field 7 is your CT_RUNID on every row for that number) or a CENSUS row (field 3" | tee -a "$ALL"
  echo "  resolves to a commit whose subject names the number, as \`buildnum.sh sweep --add\` writes it)." | tee -a "$ALL"
  echo "  DO NOT make it pass by abandoning your own minted number: your own mint is exempt by field 7, and" | tee -a "$ALL"
  echo "  burning a build number is the harm this door exists to avoid. Find out who wrote the row instead." | tee -a "$ALL"
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
