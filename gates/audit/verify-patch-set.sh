#!/usr/bin/env bash
# gates/audit/verify-patch-set.sh
#
# Verifies a SET of parked patch payloads AGAINST EACH OTHER, before the daily
# integration slot tries to apply them.
#
# WHY THIS EXISTS, AND WHY IT IS A SECOND FILE RATHER THAN A FLAG ON THE FIRST.
# gates/audit/verify-parked-patch.sh (process-build lane 2, 2026-10-04) checks ONE
# payload against its own manifest: is this format-patch well formed, is its From-sha
# not its own base, do its paths agree with what its document declares, is anything in
# it outside the parallel lanes' allow-list. Every one of those questions is answerable
# from a single payload. The questions below are not answerable from a single payload at
# all, which is the gap its own job records: "it checks a payload against its own
# manifest and CANNOT see a cross-payload collision"
# (jobs/every-parallel-lanes-first-patch-creates-process-log-md-so-the-integrator-must-
# drop-one-artefact-2026-10-04, field testCase).
#
# THE TWO MEASURED CLASSES THIS CATCHES. Neither is hypothetical and nothing checks
# either one today.
#
#  (1) ADD/ADD ON A FILE THE CHARTER MAKES EVERY LANE CREATE. prompts/process-build
#      step 6 tells every process lane to append to claude/PROCESS-LOG.md. That file is
#      not on origin/main, so EVERY lane's first payload adds it as a new file, and two
#      such payloads add/add-conflict under `git am --3way`. Measured in both orders on
#      clones of 420d4d4 by lane 2: whichever payload is second stops on that one path,
#      and `git am --skip` then discards the whole commit. Where the lane bundled its
#      artefact and its record into ONE commit, the artefact goes with it -
#      gates/verify-log-selftest.sh and its 25 controls, in the measured case.
#      So this script reports the collision AND, separately, whether it is SKIPPABLE:
#      a lane that isolated the shared file in a commit of its own loses only its
#      record. That distinction is the whole difference between a noisy integration and
#      a lost artefact, and it is the one the integrator needs at the moment it reads
#      the conflict.
#
#  (2) TWO PAYLOADS CLAIMING ONE GATE NUMBER. AND THIS ONE IS A COMPLEMENT TO A
#      CHECK THAT ALREADY EXISTS, SAID PLAINLY SO NOBODY DOUBLE-COUNTS IT [R18]:
#      gates/gates.sh:134 has failed loudly on two files in gates/regress/ sharing a
#      number since #399. That check fires only AFTER both files are in the directory,
#      which means after both payloads have landed on main. S3 below fires BEFORE the
#      integration slot applies either one. The gap between the two is not academic:
#      the add/add class in (1) makes `git am --skip` the integrator's normal move, and
#      a skipped payload never puts its file in the directory at all, so gates.sh's
#      guard stays silent on a collision that has already cost an artefact.
#      jobs/two-lane-runs-can-claim-the-same-gate-number-2026-09-28 records FOUR
#      instances, the fourth of which would have shipped: three runs of one lane fired
#      inside three minutes, all three took "the next free number in gates/regress/",
#      the first two both got 55, and the collision surfaced only because a run happened
#      to read a sibling's note at check-out - "never by a check". The repository is not
#      a register while four lanes and fifteen burst agents are live. Two payloads that
#      add gates/regress/56-a.js and gates/regress/56-b.js do NOT conflict in git at
#      all: both apply cleanly, the manifest gets two rows for one number, and the suite
#      silently runs one gate where two were authored.
#
#  (3) AND THE TWO CLASSES NOTHING ABOVE CAN SEE, BOTH MEASURED BY #484'S
#      ANTAGONISTS AND BOTH ADDED HERE ON 2026-10-06 BY process-build lane 2, run
#      process-build-2__1791296057092, against
#      jobs/the-payload-collision-checks-never-ask-origin-main-so-a-single-payload-
#      can-add-add-conflict-while-the-audit-reports-green-2026-10-06.
#
#      THE CAUSE IS ONE SENTENCE: S1 AND S4 COMPARE PAYLOADS ONLY AGAINST EACH
#      OTHER, AND NOTHING ASKED WHAT IS ALREADY ON MAIN. Everything above is a
#      payload-against-payload question, so the whole family needs two adders or two
#      modifiers before it can say anything at all.
#
#      S1b, ONE PAYLOAD AGAINST MAIN. The header above used to assert that
#      claude/PROCESS-LOG.md "is not on origin/main, so EVERY lane's first payload
#      adds it as a new file, and TWO such payloads add/add-conflict". THE PREMISE
#      WAS FALSE WHEN IT WAS WRITTEN: a8d1148 put that file on main, and commit
#      6a746f6 added a sentence saying so (the "or as a shared edit (after a8d1148
#      put it there)" clause in S2's comment) while S1 went on implementing the
#      false half. Measured consequence on the live set, which is why this is not a
#      drill: of the payloads parked today, proc-lane4-art-gates-verify-log-sh-
#      2026-10-04 ADDS claude/PROCESS-LOG.md as a new file. One adder, so S1 passes
#      and prints "no path is added as a new file by two payloads". Applied alone to
#      a clone, `git am --3way` returns CONFLICT (add/add) with that one path
#      unmerged - against MAIN ALONE, no second payload anywhere in it. The script
#      had the repo-dir in its hand and used it only for gate numbers.
#
#      S7, ADDED BY ONE AND MODIFIED BY ANOTHER. S1 needs two adders. S4 needs two
#      modifiers. A path one payload ADDS and another MODIFIES is in neither set, so
#      it was reported by neither check - and S2's own SKIP line said so in writing
#      rather than closing it. It is also the asymmetric one: in the add/add case
#      `git am --skip` costs the SKIPPED payload its record, while here it costs
#      whatever the MODIFYING payload bundled, so the integrator's cheap move is a
#      different move. S7 reports the pair and feeds S2, so the skippability
#      question is now asked of all three collision classes and not two [R06].
#
#      AND BOTH REPO ARMS GET A CONTROL THAT FIRES, which the job required in
#      writing and which this file could not previously supply: its only repo
#      controls were C26 and C27, and BOTH ASSERT THE SKIP. SELFTEST_REPO below
#      builds a real throwaway git repository with an origin/main ref inside the
#      mktemp -d, so S1b is shown FIRING on a path that is on main and SILENT on one
#      that is not. A detector only ever seen skipping has not been shown to work
#      [R36]. S3b and S6 are NOT fixed here and are NOT claimed: their vacuity is
#      the sibling job jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-
#      has-a-control-that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06,
#      and S1b deliberately does not repeat their bug - see its origin/main
#      resolution guard, which reports NOT CHECKED where S3b reports PASS.
#
#      ONE THING TO KNOW BEFORE READING AN S1b RUN, because it would otherwise look
#      like a false-positive storm. S1b asks "would this payload add/add against
#      main AT APPLY TIME". For a payload that HAS ALREADY BEEN APPLIED the answer
#      is yes by construction - its own landing is what put the path on main. Run
#      over all 14 documents in `patches` on 2026-10-06, including the landed ones,
#      it fired ELEVEN times and every one of the eleven was arithmetically correct
#      and operationally meaningless. The integrator never has that set: prompts/
#      build-run STEP 1I selects documents with a `patch` field and NO
#      `integrationResult`, which is the unlanded pile, and that is the only set
#      this check is a question about. Measured on the single payload the job names,
#      proc-lane4-art-gates-verify-log-sh-2026-10-04 alone against this clone:
#      S1-NEWFILE-COLLISION SKIP (one payload, no pair) and S1b FAIL on
#      claude/PROCESS-LOG.md, exit 1 - the job's headline reproduced exactly.
#
# AND ONE CLASS THE ARTEFACT LOCK IS SUPPOSED TO PREVENT, CHECKED ANYWAY (S4). R44
# requires a lane to hold claims/art-<path> before it writes a file. If two payloads
# modify one existing file, either a lock was skipped or one expired mid-run. That is
# worth knowing BEFORE `git am` discovers it as a textual conflict.
#
# EXCEPT FOR THE ONE FILE THE CHARTER ORDERS EVERY LANE TO WRITE, AND THAT EXCEPTION
# IS WHY S4 WAS SPLIT ON 2026-10-06 (process-build lane 1, run
# process-build-1__1791290097356, closing jobs/s4-reports-a-skipped-r44-lock-for-two-
# lanes-correct-sequential-appends-to-process-log-2026-10-06).
#
# THE LOCK SERIALISES WRITES WITHIN A RUN. IT CANNOT SERIALISE PAYLOADS. A payload
# lives from the moment it is parked until the integration slot takes it, which is
# hours or days after the lock is released, so two PERFECTLY serialised runs leave two
# payloads that both modify one file. MEASURED, with the claims collection read rather
# than inferred: claims/art-claude-PROCESS-LOG-md was held by run
# process-build-1__1791268512757 and RELEASED at 2026-10-06T07:04:00Z; run
# process-build-2__1791274433682 claimed it cleanly at 08:17:39Z with an expiresAt of
# 10:37:39Z and released it at 08:36:30Z. Neither lane skipped a lock and neither lock
# expired - and this script, over the four payloads then parked, printed
#   S4-NO-SHARED-EDIT FAIL claude/PROCESS-LOG.md modified by: <lane1> <lane2>
#                          (R44 lock skipped or expired)
# which is a true collision reported with a FALSE CAUSE. prompts/process-build step 6
# REQUIRES every process lane to append to claude/PROCESS-LOG.md on every run, so with
# four lanes on 0 */6 * * * two such payloads in one batch is the NORMAL case, not the
# exception. A detector that fires on the normal case with a cause the reader cannot
# find is one the integrator learns to ignore, and S1 through S6 then lose the
# credibility they were built for.
#
# SO THE SHARED EDIT IS SPLIT BY PATH, NOT SOFTENED:
#   S4   a shared modification of any OTHER existing file. Unchanged, still a FAIL,
#        still "(R44 lock skipped or expired)", because for any other path that
#        reading is correct.
#   S4b  a shared modification of a PERMITTED_INCIDENTAL path - today exactly
#        claude/PROCESS-LOG.md, the same one-member set gates/audit/
#        verify-parked-patch.sh:33 already names. Reported as EXPECTED with its real
#        consequence (git am --3way stops on the second payload; see S2 for what
#        --skip costs), not as a lock violation.
#
# AND S2 NOW COVERS SHARED EDITS, WHICH IS THE SECOND HALF OF THE SAME DEFECT. S2
# answers "if this collides, does --skip cost a record or an artefact", and that
# question is identical for a shared edit and for an add/add. It used to be asked only
# of new-file adds, so on the four real payloads above it printed
#   S2-COLLISION-SKIPPABLE SKIP no collision to be skippable
# while S4 was failing on a collision in the same output. The shared-modification set
# is therefore computed BEFORE S2 and both checks read one set of colliding paths.
#
# WHAT THIS SCRIPT IS NOT. It does not apply anything, does not need the network, does
# not open a browser, and does not touch the real repository: with no [repo-dir] it reads
# only the payload files handed to it. It is a park-time and integration-time audit, not
# a gate - it lives in gates/audit/, not gates/regress/, so gates.sh's regress/*.js glob
# cannot see it and GATES GREEN is unaffected by it either way.
#
# Written by process-build lane 3, run process-build-3__1791088018385, 2026-10-04.
# The PROSE half - amending prompts/build-run STEP 1I to run this, and prompts/
# process-build step 6 so the record is always its own commit - is the orchestrator's
# under R17 and is NOT in this patch. So the job it serves is fixed-in-part, not fixed.
#
# USAGE
#   verify-patch-set.sh <payload-dir> [repo-dir]
#   verify-patch-set.sh --selftest
#
#   <payload-dir>  a directory of files, one per parked document, each holding that
#                  document's `patch` field verbatim. The FILENAME is used as the
#                  payload's name in the report, so name them after the document id.
#                  Files not beginning "From " are reported and skipped (S0).
#   [repo-dir]     optional clone. Enables S1b (a path already on main), S3b (a gate
#                  number already on main) and S6
#                  (the recommended apply order by base-commit date). Omitted = SKIP.
#
# A BUG THIS FILE'S OWN FIRST REAL RUN FOUND, recorded rather than quietly fixed.
# The commit-boundary patterns were first written as awk /^From [0-9a-f]{7,40} /.
# mawk does not support interval expressions without --re-interval, so on this
# sandbox they matched NOTHING: S5 reported "0 distinct commit(s), none in two
# payloads" as a PASS, and S2 saw every diff as belonging to one commit and so
# called all three real lane payloads unskippable when all three had correctly
# split their record into its own commit. The selftest did not catch it because
# every fixture was read with the same broken pattern, so the fixtures and the
# checks were wrong together. The patterns are now $1=="From" && $2~/^[0-9a-f]+$/,
# and control C28 asserts S5's PASS line carries a NON-ZERO commit count - a
# vacuous pass is the failure mode that hid this, so a control now names it [R18].
#
# EXIT 0 when every applicable check passed, 1 on any FAIL, 2 on bad usage.
# A SKIP IS NOT A PASS and is printed as SKIP with its reason, per R18.

set -u

FAILED=0
say()  { printf '%-30s %-4s %s\n' "$1" "$2" "$3"; }
fail() { say "$1" FAIL "$2"; FAILED=1; }

# Paths the charter ORDERS every parallel lane to write, so a shared edit of one is
# expected rather than a lock violation (S4b). Space-separated.
#
# IT IS MEANT TO BE THE SAME ONE-MEMBER SET AS gates/audit/verify-parked-patch.sh:33,
# AND UNTIL #484 THIS COMMENT CLAIMED IT WAS "rather than a second, independently-
# drifting list" - WHICH NOTHING CHECKED. It is a copy-paste literal in two files with
# no cross-read either way, so the claim was exactly the kind of assurance this project
# calls a written warning rather than a guard. #484's antagonist A caught it one screen
# below a citation of [R06] in the same diff. C56 now compares the two literals, so the
# sentence above is a measurement instead of a hope. If they ever disagree, one of the
# two audits is wrong about every payload it reads.
#
# QUOTE THE EXPANSION. `for q in $PERMITTED_INCIDENTAL` is a deliberate word split, but
# an unquoted expansion also pathname-expands, so a glob character in a value would
# match against the CWD instead of being compared. There are none today; C57 pins that.
PERMITTED_INCIDENTAL='claude/PROCESS-LOG.md'
is_permitted_incidental() {
  local q
  for q in $PERMITTED_INCIDENTAL; do [ "$1" = "$q" ] && return 0; done
  return 1
}

# ---------------------------------------------------------------------------
# Payload readers. Each answers one question about one payload file.
# ---------------------------------------------------------------------------

# Every path the payload touches, one per line.
ps_paths() { sed -n 's|^diff --git a/.* b/||p' "$1"; }

# Deletion lines inside ONE path's diff sections of ONE payload, summed over every
# commit in that payload. THIS IS THE MECHANISM S4b EXCUSES, so it is measured rather
# than assumed: prompts/process-build step 6 licenses an APPEND to the shared record,
# and a section that removes existing lines is overwriting another lane's record, not
# adding one. Excludes the "--- a/<path>" file header and git's "-- " signature, which
# is the same set `grep -c '^-[^-]'` selects.
ps_del_lines_in() {
  awk -v want="$2" '
    /^diff --git a\// { cur=$0; sub(/^diff --git a\/.* b\//,"",cur); inp=(cur==want); next }
    inp && /^--/ { next }
    inp && /^-/  { n++ }
    END { print n+0 }
  ' "$1"
}

# Every path the payload ADDS as a new file, one per line. git format-patch emits
# "new file mode <mode>" on the line after the "diff --git" line of an addition.
ps_new_paths() {
  awk '
    /^diff --git a\/.* b\// { path=$0; sub(/^diff --git a\/.* b\//,"",path); next }
    /^new file mode / { if (path != "") { print path; path="" } }
  ' "$1"
}

# For a given path, the number of DISTINCT commits in this payload that touch it,
# and whether the commit touching it touches anything else. A payload is a
# format-patch stream: commits are separated by lines matching ^From <sha> .
# Prints "<commits-touching> <other-paths-in-those-commits>".
ps_isolation() {
  awk -v want="$2" '
    $1 == "From" && $2 ~ /^[0-9a-f][0-9a-f]+$/ { c++; next }
    /^diff --git a\/.* b\// {
      p=$0; sub(/^diff --git a\/.* b\//,"",p)
      if (p == want) { touch[c]=1 } else { others[c]++ }
      seen[c]=1
    }
    END {
      n=0; extra=0
      for (k in touch) { n++; extra += others[k] }
      print n, extra
    }
  ' "$1"
}

ps_from_shas() { awk '$1 == "From" && $2 ~ /^[0-9a-f][0-9a-f]+$/ { print $2 }' "$1"; }

# gates/regress/NN-name.js -> NN, NORMALISED.
# The leading-zero strip is not a nicety: gates/gates.sh's own duplicate-number
# guard was shipped at #399 WITHOUT it, 047-foo.js beside 47-menu.js was missed
# because `sort | uniq -d` compares the strings "047" and "47", and both gates ran.
# That bug is recorded in gates/gates.sh:124. A set-level check that compares the
# strings would reintroduce it one layer earlier, so this uses the same arithmetic
# normalisation gates.sh now uses ($((10#...))), and control C30 asserts it [R06].
gate_number() {
  case "$1" in
    gates/regress/[0-9]*.js)
      local b n
      b="${1#gates/regress/}"
      n="${b%%[!0-9]*}"
      [ -n "$n" ] || return 0
      printf '%s\n' "$((10#$n))"
      ;;
    *) : ;;
  esac
}

# ---------------------------------------------------------------------------
# The set-level audit.
# ---------------------------------------------------------------------------
verify_set() {
  local dir="$1" repo="${2:-}"
  FAILED=0

  if [ ! -d "$dir" ]; then
    say S0-SET-READABLE FAIL "not a directory: $dir"
    return 1
  fi

  local -a payloads=()
  local f
  for f in "$dir"/*; do
    [ -f "$f" ] || continue
    if [ ! -s "$f" ]; then
      fail S0-SET-READABLE "empty payload file: $(basename "$f")"
      continue
    fi
    if ! head -n 1 "$f" | grep -q '^From [0-9a-f]\{7,40\} '; then
      fail S0-SET-READABLE "$(basename "$f") does not begin 'From <sha>': not format-patch output"
      continue
    fi
    payloads+=("$f")
  done

  local n=${#payloads[@]}
  if [ "$n" -eq 0 ]; then
    say S0-SET-READABLE SKIP "no well-formed payloads in $dir; nothing to cross-check"
    return "$FAILED"
  fi
  say S0-SET-READABLE PASS "$n well-formed payload(s)"

  # A set of one cannot collide with itself. Say so rather than printing five
  # vacuous passes: a check that cannot fail on this input is a SKIP [R18].
  if [ "$n" -eq 1 ]; then
    say S1-NEWFILE-COLLISION   SKIP "one payload in the set; no pair to compare"
    say S2-COLLISION-SKIPPABLE  SKIP "no collision to be skippable"
    say S3-GATE-NUMBER-UNIQUE   SKIP "one payload in the set; no pair to compare"
    say S4-NO-SHARED-EDIT       SKIP "one payload in the set; no pair to compare"
    say S4b-EXPECTED-SHARED-EDIT SKIP "one payload in the set; no pair to compare"
    say S5-NO-DUPLICATE-COMMIT  SKIP "one payload in the set; no pair to compare"
    # S7 is cross-payload by construction. S1b is NOT, and is deliberately outside
    # this branch: one payload adding a path main already has is the whole defect.
    say S7-ADD-VERSUS-MODIFY    SKIP "one payload in the set; no pair to compare"
  else

  # ---- S1 NEW-FILE COLLISION ---------------------------------------------
  # The job's own pass condition: the count of paths added as a new file by more
  # than one payload must be 0.
  local tmp; tmp=$(mktemp)
  for f in "${payloads[@]}"; do
    ps_new_paths "$f" | sort -u | while read -r p; do
      [ -n "$p" ] && printf '%s\t%s\n' "$p" "$(basename "$f")"
    done
  done > "$tmp"

  local -a collided=()
  local p cnt
  while read -r cnt p; do
    [ -n "$p" ] || continue
    if [ "$cnt" -gt 1 ]; then collided+=("$p"); fi
  done < <(cut -f1 "$tmp" | sort | uniq -c | awk '{print $1, $2}')

  if [ "${#collided[@]}" -eq 0 ]; then
    say S1-NEWFILE-COLLISION PASS "no path is added as a new file by two payloads"
  else
    for p in "${collided[@]}"; do
      fail S1-NEWFILE-COLLISION "$p added as a new file by: $(awk -F'\t' -v w="$p" '$1==w{printf "%s ", $2}' "$tmp")"
    done
  fi

  # ---- THE SHARED-MODIFICATION SET, COMPUTED BEFORE S2 -------------------
  # Modifications, not additions: additions are S1. This used to live inside S4,
  # AFTER S2 had already announced "no collision to be skippable", which is why S2
  # printed a SKIP in the same output in which S4 printed a FAIL on a collision.
  # Computed here so S2 and S4 read ONE set of colliding paths [R06: the same
  # decision is made in two places, so it is fixed in both].
  local mtmp; mtmp=$(mktemp)
  for f in "${payloads[@]}"; do
    local newp; newp=$(ps_new_paths "$f" | sort -u)
    ps_paths "$f" | sort -u | while read -r p; do
      [ -n "$p" ] || continue
      printf '%s\n' "$newp" | grep -qxF "$p" && continue
      printf '%s\t%s\n' "$p" "$(basename "$f")"
    done
  done > "$mtmp"
  local -a sharedmod=()
  while read -r cnt p; do
    [ -n "$p" ] || continue
    [ "$cnt" -gt 1 ] && sharedmod+=("$p")
  done < <(cut -f1 "$mtmp" | sort | uniq -c | awk '{print $1, $2}')

  # ---- S7 ADDED BY ONE PAYLOAD, MODIFIED BY ANOTHER ----------------------
  # The third bucket. S1 keys on two adders and S4 on two modifiers, so this pair
  # fell between them; S2's SKIP line named the hole and nothing closed it. The
  # consequence is NOT the add/add consequence and that is why it is a separate
  # check with its own sentence: `git am --skip` on an add/add discards the skipped
  # payload's record, while here it discards whatever the MODIFYING payload bundled
  # with the shared path, which may be an artefact.
  local -a addmod=()
  local pp adders modders crossmod
  while read -r pp; do
    [ -n "$pp" ] || continue
    adders=$(awk -F'\t' -v w="$pp" '$1==w{print $2}' "$tmp" | sort -u)
    modders=$(awk -F'\t' -v w="$pp" '$1==w{print $2}' "$mtmp" | sort -u)
    # A payload that adds a path in one commit and modifies it in a later commit is
    # NOT this class: it is one payload, internally consistent, and git applies it.
    # The class is a MODIFIER THAT IS NOT ALSO AN ADDER.
    crossmod=$(comm -23 <(printf '%s\n' "$modders") <(printf '%s\n' "$adders"))
    [ -n "$crossmod" ] || continue
    addmod+=("$pp")
    fail S7-ADD-VERSUS-MODIFY "$pp is ADDED as a new file by: $(printf '%s ' $adders)and MODIFIED by: $(printf '%s ' $crossmod)- neither S1 (which needs two adders) nor S4 (which needs two modifiers) can see this pair. git am --3way stops on this path, and here --skip costs whatever the MODIFYING payload bundled, not the adder's record"
  done < <(comm -12 <(cut -f1 "$tmp" | sort -u) <(cut -f1 "$mtmp" | sort -u))
  [ "${#addmod[@]}" -eq 0 ] && say S7-ADD-VERSUS-MODIFY PASS "no path is added as a new file by one payload and modified by another"

  # ---- S2 IS THE COLLISION SKIPPABLE ------------------------------------
  # For every colliding path - added as a new file by two payloads (S1) OR
  # modified by two payloads (S4/S4b) - every payload that touches it must isolate
  # it in a commit that touches NOTHING ELSE. Then `git am --skip` costs that
  # payload its record and keeps its artefact. If any payload bundles the shared
  # path with other work, skipping discards that work too: that is artefact loss,
  # and it is the state the integrator must stop on rather than skip through.
  #
  # THE QUESTION IS THE SAME FOR BOTH CLASSES AND THAT IS THE POINT. A record
  # isolated in its own commit costs a record; a bundled one costs an artefact.
  # Whether the record arrived as an add/add (before claude/PROCESS-LOG.md existed
  # on main) or as a shared edit (after a8d1148 put it there) changes nothing about
  # what --skip discards.
  local -a colliding_all=()
  while read -r p; do
    [ -n "$p" ] && colliding_all+=("$p")
  done < <(printf '%s\n' ${collided[@]+"${collided[@]}"} ${sharedmod[@]+"${sharedmod[@]}"} ${addmod[@]+"${addmod[@]}"} | sed '/^$/d' | sort -u)

  if [ "${#colliding_all[@]}" -eq 0 ]; then
    say S2-COLLISION-SKIPPABLE SKIP "no path is added as a new file by two payloads (S1), no existing path is modified by two payloads (S4), and no path is added by one and modified by another (S7). The add-versus-modify hole #484's antagonist A measured is CLOSED as of 2026-10-06: S7 computes that pair and its paths are in this check's input, so all three collision classes are asked the skippability question. What this line still does NOT cover is a collision against MAIN rather than against another payload - that is S1b, which needs a [repo-dir] and says so itself when it has none"
  else
    local unskippable=0
    for p in "${colliding_all[@]}"; do
      for f in "${payloads[@]}"; do
        ps_paths "$f" | sort -u | grep -qxF "$p" || continue
        local iso extra
        read -r iso extra < <(ps_isolation "$f" "$p")
        if [ "${extra:-0}" -gt 0 ]; then
          fail S2-COLLISION-SKIPPABLE "$(basename "$f"): $p is bundled with $extra other path-change(s); git am --skip would discard them"
          unskippable=1
        fi
      done
    done
    if [ "$unskippable" -eq 0 ]; then
      say S2-COLLISION-SKIPPABLE PASS "${#colliding_all[@]} colliding path(s), each isolated in its own commit; --skip costs only the record"
    fi
  fi
  rm -f "$tmp"

  # ---- S3 GATE NUMBER UNIQUE ACROSS THE SET ------------------------------
  local gtmp; gtmp=$(mktemp)
  for f in "${payloads[@]}"; do
    ps_new_paths "$f" | while read -r p; do
      local num; num=$(gate_number "$p")
      [ -n "$num" ] && printf '%s\t%s\t%s\n' "$num" "$p" "$(basename "$f")"
    done
  done > "$gtmp"

  local dup=0 num
  while read -r cnt num; do
    [ -n "$num" ] || continue
    if [ "$cnt" -gt 1 ]; then
      local names; names=$(awk -F'\t' -v w="$num" '$1==w{printf "%s (%s) ", $2, $3}' "$gtmp")
      # Two payloads adding the SAME filename is S1's add/add, already reported.
      # S3 is the silent one: same number, different filename, both apply clean.
      local distinct; distinct=$(awk -F'\t' -v w="$num" '$1==w{print $2}' "$gtmp" | sort -u | wc -l)
      if [ "$distinct" -gt 1 ]; then
        fail S3-GATE-NUMBER-UNIQUE "gate number $num claimed by $distinct different files: $names"
        dup=1
      fi
    fi
  done < <(cut -f1 "$gtmp" | sort | uniq -c | awk '{print $1, $2}')
  if [ "$dup" -eq 0 ]; then
    if [ ! -s "$gtmp" ]; then
      say S3-GATE-NUMBER-UNIQUE SKIP "no payload adds a gates/regress/NN-*.js file"
    else
      say S3-GATE-NUMBER-UNIQUE PASS "$(wc -l < "$gtmp" | tr -d ' ') new gate file(s), no number claimed twice"
    fi
  fi

  # ---- S4 / S4b A SHARED EDIT OF AN EXISTING FILE ------------------------
  # The set itself was computed above, before S2. Here it is SPLIT BY PATH:
  #   S4b  a PERMITTED_INCIDENTAL path. EXPECTED, with its real consequence named.
  #   S4   anything else. Still a FAIL and still "(R44 lock skipped or expired)".
  # The split is by the path, never by who wrote it or by how many payloads there
  # are, so no lane can turn a lock violation into an expected edit by filing more
  # payloads.
  local shared=0 expected=0
  if [ "${#sharedmod[@]}" -eq 0 ]; then
    if [ ! -s "$mtmp" ]; then
      say S4-NO-SHARED-EDIT SKIP "every change in the set is a new file; no existing file is modified"
    else
      say S4-NO-SHARED-EDIT PASS "no existing file is modified by two payloads"
    fi
    say S4b-EXPECTED-SHARED-EDIT SKIP "no existing file is modified by two payloads"
  else
    local who
    for p in "${sharedmod[@]}"; do
      who=$(awk -F'\t' -v w="$p" '$1==w{printf "%s ", $2}' "$mtmp")
      if is_permitted_incidental "$p"; then
        # THE EXCLUSION IS PINNED TO ITS MECHANISM, NOT TO THE PATH LIST. #484 shipped
        # this keyed on the path alone and BOTH its antagonists broke it independently
        # from different doors: a payload whose section for this path DELETES 140 lines
        # of other lanes' records audited green at exit 0, where the script it replaced
        # exited 1. The justification sentence said "step 6 requires every process lane
        # to APPEND to it" and nothing ever compared that word to the diff. So the guard
        # was strictly weaker than its predecessor on the one path it excuses, which is
        # the 35-width-containment rule's own instruction: excuse a case by the
        # MECHANISM that makes it benign, never by the list it appears on.
        local destroyers="" d nd
        for f in "${payloads[@]}"; do
          ps_paths "$f" | sort -u | grep -qxF "$p" || continue
          nd=$(ps_del_lines_in "$f" "$p")
          [ "$nd" -gt 0 ] && destroyers="$destroyers$(basename "$f") removes $nd line(s); "
        done
        if [ -n "$destroyers" ]; then
          fail S4-NO-SHARED-EDIT "$p modified by: ${who}- and NOT by appending: ${destroyers}which overwrites another lane's record rather than adding one. prompts/process-build step 6 licenses an APPEND to this file and licenses nothing else, so this is NOT an expected shared edit and NOT safe to git am --skip past (R44 lock skipped or expired, or a destructive record commit)."
          shared=1
        else
          say S4b-EXPECTED-SHARED-EDIT PASS "$p modified by: ${who}- EXPECTED, not a lock violation: prompts/process-build step 6 requires every process lane to append to it, every one of these payloads APPENDS ONLY (0 deletion lines in its sections for this path, measured), and R44's lock serialises writes within a run, not payloads across runs. CONSEQUENCE: git am --3way stops on each payload after the first with this the only unmerged path; S2 says whether --skip costs only the record, and because every section here is a pure append the conflict is also resolvable with --continue at no loss."
          expected=1
        fi
      else
        fail S4-NO-SHARED-EDIT "$p modified by: ${who}(R44 lock skipped or expired)"
        shared=1
      fi
    done
    [ "$shared" -eq 0 ] && say S4-NO-SHARED-EDIT PASS "no existing file outside PERMITTED_INCIDENTAL is modified by two payloads"
    [ "$expected" -eq 0 ] && say S4b-EXPECTED-SHARED-EDIT SKIP "no PERMITTED_INCIDENTAL path is modified by two payloads"
  fi
  rm -f "$mtmp"

  # ---- S5 NO DUPLICATE COMMIT ACROSS THE SET -----------------------------
  # Two payloads carrying one From-sha means one lane parked another's commit. The
  # 2026-10-03 wave produced exactly this failure once in fifteen.
  local stmp; stmp=$(mktemp)
  for f in "${payloads[@]}"; do
    ps_from_shas "$f" | sort -u | while read -r s; do
      [ -n "$s" ] && printf '%s\t%s\n' "$s" "$(basename "$f")"
    done
  done > "$stmp"
  local dupsha=0 s
  while read -r cnt s; do
    [ -n "$s" ] || continue
    if [ "$cnt" -gt 1 ]; then
      fail S5-NO-DUPLICATE-COMMIT "commit $s appears in: $(awk -F'\t' -v w="$s" '$1==w{printf "%s ", $2}' "$stmp")"
      dupsha=1
    fi
  done < <(cut -f1 "$stmp" | sort | uniq -c | awk '{print $1, $2}')
  [ "$dupsha" -eq 0 ] && say S5-NO-DUPLICATE-COMMIT PASS "$(cut -f1 "$stmp" | sort -u | wc -l | tr -d ' ') distinct commit(s), none in two payloads"
  rm -f "$stmp"
  rm -f "$gtmp"

  fi  # end n>1

  # ---- S1b A NEW PATH THAT ALREADY EXISTS ON MAIN ------------------------
  # OUTSIDE the n>1 branch on purpose: this is the one check in the file that can
  # fail on a set of ONE, because the second party to the conflict is main.
  if [ -n "$repo" ] && [ -d "$repo/.git" ]; then
    if ! git -C "$repo" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
      # NOT CHECKED, NOT PASS, AND THIS IS THE POINT. A build-run clone sits on the
      # per-run branch the routine mints at every wake, so origin/main may not exist
      # as a ref at all; S3b below swallows exactly that state into a green line
      # (jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-
      # that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06). A wrong
      # reason that reaches the right verdict is a trap [#419]; a wrong reason that
      # reaches the WRONG verdict is this file's whole subject.
      say S1b-NEW-PATH-FREE-ON-MAIN SKIP "NOT CHECKED: origin/main does not resolve as a ref in $repo, so nothing here can be said about what main carries. Fetch origin/main in the clone and re-run; do NOT read this as a pass"
    else
      local onmain_hit=0 iso extra
      for f in "${payloads[@]}"; do
        while read -r p; do
          [ -n "$p" ] || continue
          git -C "$repo" cat-file -e "origin/main:$p" 2>/dev/null || continue
          read -r iso extra < <(ps_isolation "$f" "$p")
          fail S1b-NEW-PATH-FREE-ON-MAIN "$(basename "$f") adds $p as a NEW FILE and origin/main already carries it: git am --3way stops with CONFLICT (add/add) on this path with NO second payload involved, and --skip there discards ${extra:-0} other path-change(s) bundled in the same commit"
          onmain_hit=1
        done < <(ps_new_paths "$f" | sort -u)
      done
      [ "$onmain_hit" -eq 0 ] && say S1b-NEW-PATH-FREE-ON-MAIN PASS "no payload adds a path origin/main already carries"
    fi
  else
    say S1b-NEW-PATH-FREE-ON-MAIN SKIP "no [repo-dir] given; cannot ask origin/main which paths already exist"
  fi

  # ---- S3b A GATE NUMBER ALREADY ON MAIN ---------------------------------
  # REWRITTEN 2026-10-06 by process-build lane 2 for
  # jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-
  # that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06. FOUR ORDINARY
  # STATES USED TO REACH "PASS no new gate number collides with origin/main" WITHOUT
  # COMPARING ANYTHING, and the arm had no control showing it fire. Each is now a
  # separate NOT CHECKED carrying its own reason, because the failure mode of this
  # family is a green line with nothing behind it, not a wrong number:
  #   (a) the clone has no origin/main ref - THE NORMAL STATE OF A BUILD-RUN CLONE,
  #       which sits on the per-run branch the routine mints at every wake. ls-tree
  #       wrote its fatal to the 2>/dev/null and $onmain was empty, so nothing could
  #       match. S1b already guards this; S3b, one check below it, did not.
  #   (b) the scratch file was unwritable. S3b was the ONLY check in this family to
  #       write OUTSIDE the mktemp area - 4 occurrences of $dir/.. against 0 in all
  #       three sibling audits - so a read-only parent put "Permission denied" on
  #       STDERR, which this script's own selftest harness discards with out=$(...),
  #       and then printed PASS over a real clash at exit 0. It now uses mktemp like
  #       every one of its siblings and checks that the file it is about to read
  #       actually exists.
  #   (c) a MISTYPED repo-dir was reported as "no [repo-dir] given" - a false reason
  #       for a real argument, so the one person who could fix it is told the
  #       opposite of what happened.
  #   (d) ls-tree succeeded and returned no numbered gate at all. That cannot be true
  #       of this repository, so it is evidence the read did not mean what the check
  #       thinks, not evidence of a free number space.
  if [ -z "$repo" ]; then
    say S3b-NUMBER-FREE-ON-MAIN SKIP "no [repo-dir] given; cannot read origin/main's gate numbers"
  elif [ ! -d "$repo/.git" ]; then
    say S3b-NUMBER-FREE-ON-MAIN SKIP "NOT CHECKED: a [repo-dir] WAS given and it is not a git repository ($repo). Check the path; do NOT read this as 'no repo-dir given' and do NOT read it as a pass"
  elif ! git -C "$repo" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    say S3b-NUMBER-FREE-ON-MAIN SKIP "NOT CHECKED: origin/main does not resolve as a ref in $repo, so main's gate numbers could not be read at all. Fetch origin/main in the clone and re-run; do NOT read this as a pass"
  else
    local onmain clash=0 s3btree s3berr s3bhits
    s3btree=$(mktemp); s3berr=$(mktemp)
    if ! git -C "$repo" ls-tree --name-only origin/main gates/regress/ >"$s3btree" 2>"$s3berr"; then
      say S3b-NUMBER-FREE-ON-MAIN SKIP "NOT CHECKED: git ls-tree origin/main failed in $repo: $(tr '\n' ' ' < "$s3berr" | cut -c1-200). Nothing was compared; do NOT read this as a pass"
      rm -f "$s3btree" "$s3berr"
    else
      onmain=$(sed -n 's|^gates/regress/\([0-9][0-9]*\)-.*\.js$|\1|p' "$s3btree" | sort -u)
      rm -f "$s3btree" "$s3berr"
      if [ -z "$onmain" ]; then
        say S3b-NUMBER-FREE-ON-MAIN SKIP "NOT CHECKED: origin/main resolved and carries NO gates/regress/<number>-*.js file, which cannot be true of this repository - the read did not mean what this check assumes. Do NOT read this as a free number space"
      else
        s3bhits=$(mktemp)
        for f in "${payloads[@]}"; do
          ps_new_paths "$f" | while read -r p; do
            local num; num=$(gate_number "$p")
            [ -n "$num" ] || continue
            if printf '%s\n' "$onmain" | grep -qx "$num"; then
              printf '%s\t%s\t%s\n' "$num" "$p" "$(basename "$f")"
            fi
          done
        done >> "$s3bhits"
        if [ ! -e "$s3bhits" ]; then
          say S3b-NUMBER-FREE-ON-MAIN SKIP "NOT CHECKED: the scratch file the comparison writes to disappeared under it, so an empty result cannot be distinguished from no result. Do NOT read this as a pass"
        elif [ -s "$s3bhits" ]; then
          while IFS=$'\t' read -r num p who; do
            fail S3b-NUMBER-FREE-ON-MAIN "gate number $num is already taken on origin/main; $who adds $p"
          done < "$s3bhits"
          clash=1
        fi
        rm -f "$s3bhits"
        [ "$clash" -eq 0 ] && say S3b-NUMBER-FREE-ON-MAIN PASS "no new gate number collides with origin/main ($(printf '%s\n' "$onmain" | wc -l | tr -d ' ') number(s) read from main)"
      fi
    fi
  fi

  # ---- S6 RECOMMENDED APPLY ORDER ---------------------------------------
  # prompts/build-run STEP 1I says oldest base first. Without a clone the base
  # dates are unknowable, so this is a SKIP and not a guess.
  # REWRITTEN 2026-10-06 by process-build lane 2, same job as S3b above. S6 WAS NOT
  # VACUOUS, IT WAS CONFIDENTLY WRONG, and that is worse. Every base sha of a parked
  # payload is cut in another container from a branch nobody fetches, so NONE of them
  # resolves in the integration clone: `|| echo 0` gave every payload the key 0,
  # `sort -n` over equal keys is a no-op, and the line printed GLOB ORDER under the
  # words "oldest base first" at PASS. Measured over the real 6-payload set it put
  # the 2026-10-04 payload - the oldest base in the set by two days, by its own
  # filename - LAST. The design was also backwards: with NO repo it declined to guess
  # and said so, and with a repo in which the dates were equally unknown it guessed,
  # so handing it the repo-dir made the output worse. It now verifies its inputs
  # before ordering them and prints NO ORDER unless every base resolved.
  if [ -z "$repo" ]; then
    say S6-APPLY-ORDER SKIP "no [repo-dir] given; base-commit dates unknown, order not guessed"
  elif [ ! -d "$repo/.git" ]; then
    say S6-APPLY-ORDER SKIP "NOT CHECKED: a [repo-dir] WAS given and it is not a git repository ($repo). Check the path; do NOT read this as 'no repo-dir given'"
  else
    local s6keys s6unres s6tot=0 s6bad=0 b d
    s6keys=$(mktemp); s6unres=$(mktemp)
    for f in "${payloads[@]}"; do
      s6tot=$((s6tot+1))
      b=$(awk '$1 == "From" && $2 ~ /^[0-9a-f][0-9a-f]+$/ {print $2; exit}' "$f")
      if [ -n "$b" ] && git -C "$repo" rev-parse --verify --quiet "${b}^{commit}" >/dev/null 2>&1; then
        d=$(git -C "$repo" log -1 --format=%ct "$b^" 2>/dev/null || git -C "$repo" log -1 --format=%ct "$b" 2>/dev/null)
        printf '%s\t%s\n' "${d:-0}" "$(basename "$f")" >> "$s6keys"
      else
        s6bad=$((s6bad+1))
        printf '%s (base %s)\n' "$(basename "$f")" "${b:-<no From line>}" >> "$s6unres"
      fi
    done
    if [ "$s6bad" -gt 0 ]; then
      say S6-APPLY-ORDER SKIP "NOT CHECKED: $s6bad of $s6tot base commit(s) do not resolve in $repo - $(tr '\n' ';' < "$s6unres" | cut -c1-240). NO ORDER IS PRINTED: sort -n over keys that are all 0 returns the input order, so an order derived from unresolved bases is glob order wearing the words 'oldest base first'. Fetch the payloads' base commits into the clone, or apply oldest base first by the baseSha field on each patch document"
    else
      say S6-APPLY-ORDER PASS "oldest base first, all $s6tot base(s) resolved in the clone: $(sort -n "$s6keys" | cut -f2 | tr '\n' ' ')"
    fi
    rm -f "$s6keys" "$s6unres"
  fi

  return "$FAILED"
}

# ---------------------------------------------------------------------------
# SELFTEST. Every detector is shown BOTH firing and silent, because a detector
# only ever seen silent has not been shown to work [R36, and the lesson of
# gates/buildnum-selftest.sh]. Fixtures are synthetic format-patch streams in a
# mktemp -d: no network, no clone, no browser, nothing in the real repository.
# ---------------------------------------------------------------------------

PASS=0; FAILN=0
t_pass() { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
t_fail() { FAILN=$((FAILN+1)); printf '  FAIL %s\n' "$1"; }
expect_line() { # <name> <output> <regex>
  if printf '%s\n' "$2" | grep -Eq "$3"; then t_pass "$1"; else
    t_fail "$1 (no line matching: $3)"; printf '%s\n' "$2" | sed 's/^/        /'
  fi
}
expect_rc() { # <name> <actual> <wanted>
  if [ "$2" = "$3" ]; then t_pass "$1 (exit $2)"; else t_fail "$1 (exit $2, wanted $3)"; fi
}
# A NEGATIVE CONTROL IS NOT A LUXURY HERE. The defect this file was amended for was a
# line that printed a TRUE collision with a FALSE cause, so "S4b now says EXPECTED" is
# only half the assertion: the other half is that the old sentence is GONE. A control
# that only looks for the new line would pass on an output carrying both.
expect_no_line() { # <name> <output> <regex>
  if printf '%s\n' "$2" | grep -Eq "$3"; then
    t_fail "$1 (unwanted line matching: $3)"; printf '%s\n' "$2" | sed 's/^/        /'
  else t_pass "$1"; fi
}

# mkpayload <file> <sha> <subject> then path-spec args:
#   new:<path>        an addition in its own commit
#   mod:<path>        a modification in its own commit
#   newbundle:<p1>,<p2>  two additions in ONE commit
mk_commit_header() {
  printf 'From %s Mon Sep 17 00:00:00 2001\nFrom: Claude <noreply@anthropic.com>\nDate: Sun, 4 Oct 2026 04:00:00 +0000\nSubject: [PATCH] %s\n\n---\n' "$1" "$2"
}
mk_new() {
  printf 'diff --git a/%s b/%s\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/%s\n@@ -0,0 +1 @@\n+hello\n' "$1" "$1" "$1"
}
mk_mod() {
  printf 'diff --git a/%s b/%s\nindex 1111111..2222222 100644\n--- a/%s\n+++ b/%s\n@@ -1 +1 @@\n-hello\n+world\n' "$1" "$1" "$1" "$1"
}

mk_append() {
  printf 'diff --git a/%s b/%s\nindex 1111111..2222222 100644\n--- a/%s\n+++ b/%s\n@@ -40,3 +40,5 @@ ctx\n ctx1\n ctx2\n ctx3\n+appended line A\n+appended line B\n' "$1" "$1" "$1" "$1"
}
mk_rewrite() {
  printf 'diff --git a/%s b/%s\nindex 1111111..3333333 100644\n--- a/%s\n+++ b/%s\n@@ -1,3 +1,1 @@\n-other lane line 1\n-other lane line 2\n-other lane line 3\n+ONLY MY RECORD SURVIVES\n' "$1" "$1" "$1" "$1"
}
mk_delfile() {
  printf 'diff --git a/%s b/%s\ndeleted file mode 100644\nindex 1111111..0000000\n--- a/%s\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-other lane line 1\n-other lane line 2\n' "$1" "$1" "$1"
}

selftest() {
  T=$(mktemp -d)
  local out rc

  # ---- fixture set A: two payloads, each adding its own artefact in commit 1
  # and claude/PROCESS-LOG.md in a SEPARATE commit 2. The real, correct shape.
  mkdir -p "$T/A"
  { mk_commit_header aaaaaaa "lane1 artefact"; mk_new gates/verify-log-selftest.sh
    mk_commit_header aaaaaab "lane1 record";   mk_new claude/PROCESS-LOG.md; } > "$T/A/lane1"
  { mk_commit_header bbbbbbb "lane2 artefact"; mk_new gates/audit/verify-parked-patch.sh
    mk_commit_header bbbbbbc "lane2 record";   mk_new claude/PROCESS-LOG.md; } > "$T/A/lane2"
  out=$(verify_set "$T/A"); rc=$?
  expect_line  C1-S1-fires-on-the-real-class "$out" '^S1-NEWFILE-COLLISION +FAIL .*claude/PROCESS-LOG\.md'
  expect_line  C2-S2-passes-when-isolated    "$out" '^S2-COLLISION-SKIPPABLE +PASS'
  expect_rc    C3-set-A-exit-1 "$rc" 1

  # ---- fixture set B: lane1 BUNDLES its artefact and the record in ONE commit.
  # Same collision, but now unskippable: this is the artefact-loss state.
  mkdir -p "$T/B"
  { mk_commit_header ccccccc "lane1 bundled"; mk_new gates/verify-log-selftest.sh; mk_new claude/PROCESS-LOG.md; } > "$T/B/lane1"
  cp "$T/A/lane2" "$T/B/lane2"
  out=$(verify_set "$T/B"); rc=$?
  expect_line  C4-S2-fires-on-a-bundled-commit "$out" '^S2-COLLISION-SKIPPABLE +FAIL .*lane1.*bundled'
  expect_line  C5-S1-also-fires-on-set-B       "$out" '^S1-NEWFILE-COLLISION +FAIL'
  expect_rc    C6-set-B-exit-1 "$rc" 1

  # ---- fixture set C: fully disjoint, no shared file at all. Everything silent.
  mkdir -p "$T/C"
  { mk_commit_header 0dddddd "lane1"; mk_new gates/regress/80-alpha.js; } > "$T/C/lane1"
  { mk_commit_header 0eeeeee "lane2"; mk_new gates/regress/81-beta.js;  } > "$T/C/lane2"
  out=$(verify_set "$T/C"); rc=$?
  expect_line  C7-S1-silent-when-disjoint "$out" '^S1-NEWFILE-COLLISION +PASS'
  expect_line  C8-S3-silent-on-80-and-81  "$out" '^S3-GATE-NUMBER-UNIQUE +PASS'
  expect_line  C9-S4-skip-no-modifications "$out" '^S4-NO-SHARED-EDIT +SKIP'
  expect_rc    C10-set-C-exit-0 "$rc" 0

  # ---- fixture set D: THE GATE-NUMBER COLLISION. Different filenames, same
  # number. git applies both without a murmur; only S3 sees it.
  mkdir -p "$T/D"
  { mk_commit_header 0c0ffee "lane1"; mk_new gates/regress/56-review-rating-source.js; } > "$T/D/lane1"
  { mk_commit_header 0f1e2d3 "lane2"; mk_new gates/regress/56-review-cats.js;          } > "$T/D/lane2"
  out=$(verify_set "$T/D"); rc=$?
  expect_line  C11-S3-fires-on-one-number-two-files "$out" '^S3-GATE-NUMBER-UNIQUE +FAIL .*56'
  expect_line  C12-S1-silent-on-set-D               "$out" '^S1-NEWFILE-COLLISION +PASS'
  expect_rc    C13-set-D-exit-1 "$rc" 1

  # ---- fixture set E: two payloads MODIFYING one existing file. S4's class.
  mkdir -p "$T/E"
  { mk_commit_header 0a1b2c3 "lane1"; mk_mod gates/verify-log.sh; } > "$T/E/lane1"
  { mk_commit_header 0d4e5f6 "lane2"; mk_mod gates/verify-log.sh; } > "$T/E/lane2"
  out=$(verify_set "$T/E"); rc=$?
  expect_line  C14-S4-fires-on-a-shared-edit "$out" '^S4-NO-SHARED-EDIT +FAIL .*gates/verify-log\.sh'
  expect_line  C15-S1-silent-on-a-shared-edit "$out" '^S1-NEWFILE-COLLISION +PASS'
  expect_rc    C16-set-E-exit-1 "$rc" 1

  # ---- fixture set F: one payload carrying another's commit (the 1-in-15 case).
  mkdir -p "$T/F"
  { mk_commit_header 42f900a "burst02"; mk_new gates/regress/20-review.js; } > "$T/F/burst02"
  { mk_commit_header 42f900a "burst07"; mk_new gates/held.sh;              } > "$T/F/burst07"
  out=$(verify_set "$T/F"); rc=$?
  expect_line  C17-S5-fires-on-a-duplicate-commit "$out" '^S5-NO-DUPLICATE-COMMIT +FAIL .*42f900a'
  expect_rc    C18-set-F-exit-1 "$rc" 1
  out=$(verify_set "$T/C")
  expect_line  C19-S5-silent-on-distinct-commits "$out" '^S5-NO-DUPLICATE-COMMIT +PASS'

  # ---- fixture set G: a single payload. Pairwise checks must SKIP, not PASS.
  mkdir -p "$T/G"; cp "$T/A/lane1" "$T/G/lane1"
  out=$(verify_set "$T/G"); rc=$?
  expect_line  C20-single-payload-skips-S1 "$out" '^S1-NEWFILE-COLLISION +SKIP'
  expect_rc    C21-set-G-exit-0 "$rc" 0

  # ---- fixture set H: a malformed payload. S0 must fail rather than ignore it.
  mkdir -p "$T/H"; printf 'this is not a patch\n' > "$T/H/junk"; cp "$T/C/lane1" "$T/H/lane1"
  out=$(verify_set "$T/H"); rc=$?
  expect_line  C22-S0-fires-on-a-non-patch "$out" '^S0-SET-READABLE +FAIL .*junk'
  expect_rc    C23-set-H-exit-1 "$rc" 1

  # ---- an empty directory: a SKIP, exit 0, and no vacuous passes.
  mkdir -p "$T/I"
  out=$(verify_set "$T/I"); rc=$?
  expect_line  C24-empty-set-skips "$out" '^S0-SET-READABLE +SKIP'
  expect_rc    C25-empty-set-exit-0 "$rc" 0

  # ---- S3b and S6 must SKIP without a repo, on every set above.
  out=$(verify_set "$T/C")
  expect_line  C26-S3b-skips-without-repo "$out" '^S3b-NUMBER-FREE-ON-MAIN +SKIP'
  expect_line  C27-S6-skips-without-repo  "$out" '^S6-APPLY-ORDER +SKIP'

  # C28 is the control that would have caught the mawk interval bug: S5's PASS
  # must report a non-zero commit count. "0 distinct commit(s)" is a vacuous pass.
  out=$(verify_set "$T/C")
  expect_line  C28-S5-pass-counts-real-commits "$out" '^S5-NO-DUPLICATE-COMMIT +PASS 2 distinct'
  # C29 is the real-payload shape: a collision on a file each lane isolated in a
  # commit of its own is FAIL on S1 and PASS on S2, which is the integrator's
  # "skip the record, keep the artefact" state.
  out=$(verify_set "$T/A")
  expect_line  C29-A-is-skippable-not-lossy "$out" '^S2-COLLISION-SKIPPABLE +PASS'

  # C30: leading zeros. 047-foo.js and 47-bar.js are ONE number, which is the bug
  # gates/gates.sh paid for at #399 and which a string comparison reintroduces.
  mkdir -p "$T/J"
  { mk_commit_header 0aaaaab "lane1"; mk_new gates/regress/047-foo.js; } > "$T/J/lane1"
  { mk_commit_header 0aaaaac "lane2"; mk_new gates/regress/47-bar.js;  } > "$T/J/lane2"
  out=$(verify_set "$T/J"); rc=$?
  expect_line  C30-S3-normalises-leading-zeros "$out" '^S3-GATE-NUMBER-UNIQUE +FAIL .*47'
  expect_rc    C31-set-J-exit-1 "$rc" 1
  # C32: and a bare 47.js, which the #399 antagonist also found, is the same number.
  mkdir -p "$T/K"
  { mk_commit_header 0aaaaad "lane1"; mk_new gates/regress/47.js;     } > "$T/K/lane1"
  { mk_commit_header 0aaaaae "lane2"; mk_new gates/regress/47-bar.js; } > "$T/K/lane2"
  out=$(verify_set "$T/K")
  expect_line  C32-S3-sees-a-bare-number "$out" '^S3-GATE-NUMBER-UNIQUE +FAIL .*47'

  # =========================================================================
  # SETS L TO P: THE SHARED-EDIT SPLIT. Added 2026-10-06 with the S4/S4b split,
  # closing jobs/s4-reports-a-skipped-r44-lock-for-two-lanes-correct-sequential-
  # appends-to-process-log-2026-10-06. Every one of these is modelled on a shape
  # that EXISTS in collection `patches`, not on an invented one.
  # =========================================================================

  # ---- fixture set L: TODAY'S REAL SHAPE, and the input that produced the false
  # diagnosis. Two lanes, each modifying its own artefact in commit 1 and
  # claude/PROCESS-LOG.md in a SEPARATE commit 2, both having held and released
  # claims/art-claude-PROCESS-LOG-md cleanly, hours apart.
  mkdir -p "$T/L"
  { mk_commit_header 1aaaaaa "lane1 artefact"; mk_mod gates/regress/61-review-list-month-independence.js
    mk_commit_header 1aaaaab "lane1 record";   mk_append claude/PROCESS-LOG.md; } > "$T/L/lane1"
  { mk_commit_header 1bbbbbb "lane2 artefact"; mk_mod gates/verify-log.sh
    mk_commit_header 1bbbbbc "lane2 record";   mk_append claude/PROCESS-LOG.md; } > "$T/L/lane2"
  out=$(verify_set "$T/L"); rc=$?
  expect_line     C33-S4b-reports-the-expected-shared-edit "$out" '^S4b-EXPECTED-SHARED-EDIT +PASS .*claude/PROCESS-LOG\.md.*EXPECTED'
  expect_line     C34-S4-passes-on-the-permitted-path      "$out" '^S4-NO-SHARED-EDIT +PASS'
  expect_no_line  C35-the-false-cause-is-gone              "$out" 'lock skipped or expired'
  expect_line     C36-S2-now-sees-the-shared-edit          "$out" '^S2-COLLISION-SKIPPABLE +PASS 1 colliding path'
  expect_rc       C37-set-L-exit-0 "$rc" 0

  # ---- fixture set M: the SAME expected shared edit, but lane1 bundled its record
  # with its artefact. The collision is still expected; what --skip costs is not.
  # This is the state the integrator must stop on, and before this amendment S2 did
  # not look at it at all.
  mkdir -p "$T/M"
  { mk_commit_header 1ccccccc "lane1 bundled"; mk_mod gates/regress/61-review-list-month-independence.js; mk_append claude/PROCESS-LOG.md; } > "$T/M/lane1"
  cp "$T/L/lane2" "$T/M/lane2"
  out=$(verify_set "$T/M"); rc=$?
  expect_line  C38-S2-fires-on-a-bundled-record     "$out" '^S2-COLLISION-SKIPPABLE +FAIL .*lane1.*claude/PROCESS-LOG\.md is bundled'
  expect_line  C39-S4b-still-calls-it-expected      "$out" '^S4b-EXPECTED-SHARED-EDIT +PASS'
  expect_rc    C40-set-M-exit-1 "$rc" 1

  # ---- fixture set N: a permitted shared edit AND a real one in the same set. The
  # split must not let the permitted path excuse the other.
  mkdir -p "$T/N"
  { mk_commit_header 1ddddddd "lane1 artefact"; mk_mod gates/verify-log.sh
    mk_commit_header 1dddddde "lane1 record";   mk_append claude/PROCESS-LOG.md; } > "$T/N/lane1"
  { mk_commit_header 1eeeeeee "lane2 artefact"; mk_mod gates/verify-log.sh
    mk_commit_header 1eeeeeef "lane2 record";   mk_append claude/PROCESS-LOG.md; } > "$T/N/lane2"
  out=$(verify_set "$T/N"); rc=$?
  expect_line  C41-S4-still-fires-on-the-real-one   "$out" '^S4-NO-SHARED-EDIT +FAIL .*gates/verify-log\.sh.*lock skipped or expired'
  expect_line  C42-S4b-fires-on-the-permitted-one   "$out" '^S4b-EXPECTED-SHARED-EDIT +PASS .*claude/PROCESS-LOG\.md'
  expect_rc    C43-set-N-exit-1 "$rc" 1

  # ---- fixture set O: only ONE payload touches the permitted path. Being on the
  # permitted list is not a reason to print anything: S4b must SKIP, not PASS. A
  # check that cannot fail on this input is a SKIP [R18].
  mkdir -p "$T/O"
  { mk_commit_header 1fffffff "lane1"; mk_append claude/PROCESS-LOG.md; } > "$T/O/lane1"
  { mk_commit_header 10000001 "lane2"; mk_mod gates/gatemanifest.sh;  } > "$T/O/lane2"
  out=$(verify_set "$T/O"); rc=$?
  expect_line  C44-S4b-skips-on-a-single-toucher "$out" '^S4b-EXPECTED-SHARED-EDIT +SKIP'
  expect_line  C45-S4-passes-on-set-O            "$out" '^S4-NO-SHARED-EDIT +PASS'
  expect_rc    C46-set-O-exit-0 "$rc" 0

  # ---- fixture set P: THREE payloads on one non-permitted file. The split is by
  # path, never by how many payloads there are, so filing a third must not dilute
  # the FAIL into an expectation.
  mkdir -p "$T/P"
  { mk_commit_header 10000002 "lane1"; mk_mod gates/verify-log.sh; } > "$T/P/lane1"
  { mk_commit_header 10000003 "lane2"; mk_mod gates/verify-log.sh; } > "$T/P/lane2"
  { mk_commit_header 10000004 "lane3"; mk_mod gates/verify-log.sh; } > "$T/P/lane3"
  out=$(verify_set "$T/P"); rc=$?
  expect_line  C47-three-payloads-still-fail-S4 "$out" '^S4-NO-SHARED-EDIT +FAIL .*lane1.*lane2.*lane3.*lock skipped or expired'
  expect_rc    C48-set-P-exit-1 "$rc" 1

  # ---- set E again: the second half of theFIX. S2 used to SKIP on a set whose only
  # collision was a shared edit, in the same output in which S4 failed on it.
  out=$(verify_set "$T/E")
  expect_line     C49-S2-no-longer-skips-a-shared-edit "$out" '^S2-COLLISION-SKIPPABLE +PASS'
  expect_no_line  C50-S2-skip-is-gone-on-set-E         "$out" '^S2-COLLISION-SKIPPABLE +SKIP'

  # ---- set A again: the add/add path is untouched by the split. S4b must SKIP,
  # because an ADDITION of the permitted path is S1's business and not S4b's.
  out=$(verify_set "$T/A")
  expect_line  C51-S4b-skips-on-an-add-add "$out" '^S4b-EXPECTED-SHARED-EDIT +SKIP'

  # ---- fixture sets Q, R, S: THE SHAPE S4b EXCUSES. Added at #484b after BOTH
  # antagonists independently broke the #484 split from different doors. Every
  # permitted-path fixture above is now a REAL APPEND (mk_append), because until #484b
  # they used mk_mod - a line-1 replacement with one deletion - which is a shape that
  # occurs in NO payload in collection `patches`: all three real record hunks are
  # "@@ -143,3 +143,N @@" with zero deletion lines. A fixture carrying a shape reality
  # does not produce cannot reveal anything about reality, and these three sets are the
  # controls that would have caught the hole on the day.
  mkdir -p "$T/Q"
  { mk_commit_header 1aaabbb1 "lane1 artefact"; mk_new gates/audit/zz-one.sh
    mk_commit_header 1aaabbb2 "lane1 record";   mk_append claude/PROCESS-LOG.md; } > "$T/Q/lane1"
  { mk_commit_header 1aaabbb3 "lane2 artefact"; mk_new gates/audit/zz-two.sh
    mk_commit_header 1aaabbb4 "lane2 DESTRUCTIVE record"; mk_rewrite claude/PROCESS-LOG.md; } > "$T/Q/lane2"
  out=$(verify_set "$T/Q"); rc=$?
  expect_line    C52-a-destructive-record-is-NOT-an-expected-shared-edit "$out" '^S4-NO-SHARED-EDIT +FAIL .*claude/PROCESS-LOG\.md.*NOT by appending'
  expect_line    C53-the-FAIL-names-the-destroying-payload               "$out" '^S4-NO-SHARED-EDIT +FAIL .*lane2 removes 3 line\(s\)'
  expect_no_line C54-S4b-does-NOT-call-it-expected                       "$out" '^S4b-EXPECTED-SHARED-EDIT +PASS'
  expect_rc      C55-set-Q-exit-1 "$rc" 1

  # set R: the same path DELETED outright. ps_new_paths keys on "new file mode", so a
  # deletion lands in the modification bucket and would have been excused by path too.
  mkdir -p "$T/R"
  { mk_commit_header 1cccddd1 "lane1 artefact"; mk_new gates/audit/zz-three.sh
    mk_commit_header 1cccddd2 "lane1 record";   mk_append claude/PROCESS-LOG.md; } > "$T/R/lane1"
  { mk_commit_header 1cccddd3 "lane2 artefact"; mk_new gates/audit/zz-four.sh
    mk_commit_header 1cccddd4 "lane2 deletes the record file"; mk_delfile claude/PROCESS-LOG.md; } > "$T/R/lane2"
  out=$(verify_set "$T/R"); rc=$?
  expect_line C58-a-deletion-of-the-permitted-path-fails-S4 "$out" '^S4-NO-SHARED-EDIT +FAIL .*claude/PROCESS-LOG\.md.*NOT by appending'
  expect_rc   C59-set-R-exit-1 "$rc" 1

  # set S: THE POSITIVE CONTROL, and it is the one that stops this fix over-firing.
  # Two pure appends must still be EXPECTED and must still exit 0, or the repair has
  # simply reddened the normal case - which is how a guard gets switched off.
  mkdir -p "$T/S"
  { mk_commit_header 1eeefff1 "lane1 artefact"; mk_new gates/audit/zz-five.sh
    mk_commit_header 1eeefff2 "lane1 record";   mk_append claude/PROCESS-LOG.md; } > "$T/S/lane1"
  { mk_commit_header 1eeefff3 "lane2 artefact"; mk_new gates/audit/zz-six.sh
    mk_commit_header 1eeefff4 "lane2 record";   mk_append claude/PROCESS-LOG.md; } > "$T/S/lane2"
  out=$(verify_set "$T/S"); rc=$?
  expect_line C60-two-pure-appends-are-still-EXPECTED "$out" '^S4b-EXPECTED-SHARED-EDIT +PASS .*claude/PROCESS-LOG\.md.*APPENDS ONLY'
  expect_line C61-S4-passes-on-set-S                  "$out" '^S4-NO-SHARED-EDIT +PASS'
  expect_rc   C62-set-S-exit-0 "$rc" 0

  # ---- fixture sets T and U: S7's class, ADDED BY ONE AND MODIFIED BY ANOTHER.
  # Added 2026-10-06 by process-build lane 2, run process-build-2__1791296057092,
  # against jobs/the-payload-collision-checks-never-ask-origin-main-so-a-single-
  # payload-can-add-add-conflict-while-the-audit-reports-green-2026-10-06.
  mkdir -p "$T/U7"
  { mk_commit_header 7777771 "lane1 adds the shared helper"; mk_new gates/audit/shared-helper.sh; } > "$T/U7/lane1"
  { mk_commit_header 7777772 "lane2 edits the shared helper"; mk_mod gates/audit/shared-helper.sh; } > "$T/U7/lane2"
  out=$(verify_set "$T/U7"); rc=$?
  expect_line     C63-S7-fires-on-add-versus-modify   "$out" '^S7-ADD-VERSUS-MODIFY +FAIL .*gates/audit/shared-helper\.sh.*ADDED .*MODIFIED'
  expect_line     C64-S7-names-the-modifying-cost     "$out" '^S7-ADD-VERSUS-MODIFY +FAIL .*MODIFYING payload bundled'
  expect_line     C65-S1-is-silent-on-S7s-class       "$out" '^S1-NEWFILE-COLLISION +PASS'
  expect_line     C66-S4-is-silent-on-S7s-class       "$out" '^S4-NO-SHARED-EDIT +PASS'
  # THE POINT OF THE WHOLE CHECK: before S7 existed this set printed S1 PASS, S4 PASS
  # and S2 SKIP, which is three green lines over a path git stops on.
  expect_no_line  C67-S2-no-longer-skips-on-S7s-class "$out" '^S2-COLLISION-SKIPPABLE +SKIP'
  expect_rc       C68-set-U7-exit-1 "$rc" 1

  # Silent arm: an addition and a modification on DIFFERENT paths is not the class.
  mkdir -p "$T/V7"
  { mk_commit_header 7777773 "lane1 adds"; mk_new gates/audit/one.sh; } > "$T/V7/lane1"
  { mk_commit_header 7777774 "lane2 mods"; mk_mod gates/audit/two.sh; } > "$T/V7/lane2"
  out=$(verify_set "$T/V7"); rc=$?
  expect_line  C69-S7-silent-on-disjoint-paths "$out" '^S7-ADD-VERSUS-MODIFY +PASS'
  expect_rc    C70-set-V7-exit-0 "$rc" 0

  # ---- THE REPO ARM, AND IT IS THE REASON THIS BLOCK EXISTS. Before today the only
  # controls in this file touching the repo arms were C26 and C27 and BOTH ASSERT THE
  # SKIP, so no repo-reading check had ever been shown to fire. A throwaway git
  # repository inside the same mktemp -d costs one init and three commits, needs no
  # network and touches nothing in the real tree, which is the bar this file's header
  # sets for a fixture [R36].
  FIXREPO="$T/fixrepo"
  mkdir -p "$FIXREPO"
  (
    cd "$FIXREPO" || exit 1
    git init -q . >/dev/null 2>&1 || exit 1
    git config user.email fixture@example.invalid
    git config user.name  Fixture
    mkdir -p claude gates/regress
    printf 'the shared record\n' > claude/PROCESS-LOG.md
    printf '// gate 61\n' > gates/regress/61-review-list-month-independence.js
    git add -A >/dev/null 2>&1
    # AN EXPLICIT COMMITTER DATE ON THE FIRST COMMIT TOO, and the reason is a control
    # that failed while this was being written rather than a precaution: without it
    # the first commit is dated NOW, which makes it the NEWEST commit in the fixture,
    # so the two S6 ordering controls below both read as glob order and C89 passed for
    # the wrong reason. The ref still points here and the tree is unchanged, so C71
    # through C79 are untouched; only the sha and the date move.
    GIT_COMMITTER_DATE='@1500000000 +0000' GIT_AUTHOR_DATE='@1500000000 +0000' \
      git commit -q -m 'fixture main' >/dev/null 2>&1 || exit 1
    # The ref name is what the checks read, so the fixture creates the real thing
    # rather than a branch that happens to be called main.
    git update-ref refs/remotes/origin/main HEAD
    # TWO MORE COMMITS, ADDED 2026-10-06 FOR THE S6 CONTROLS, AND DELIBERATELY AFTER
    # THE update-ref: origin/main keeps pointing at the first commit, so its TREE is
    # byte-for-byte what C71 through C79 were written against and none of them is
    # disturbed. What these two add is the only thing S6 needs and the fixture did not
    # have - base shas that RESOLVE, each with a parent, with committer dates far
    # enough apart that an ordering is unambiguous rather than a coin toss.
    GIT_COMMITTER_DATE='@1600000000 +0000' GIT_AUTHOR_DATE='@1600000000 +0000' \
      git commit -q --allow-empty -m 'fixture second' >/dev/null 2>&1 || exit 1
    GIT_COMMITTER_DATE='@1700000000 +0000' GIT_AUTHOR_DATE='@1700000000 +0000' \
      git commit -q --allow-empty -m 'fixture third' >/dev/null 2>&1 || exit 1
  ) || true
  FIXC2=$(git -C "$FIXREPO" rev-parse --verify --quiet 'HEAD~1' 2>/dev/null || echo '')
  FIXC3=$(git -C "$FIXREPO" rev-parse --verify --quiet 'HEAD'   2>/dev/null || echo '')

  if [ -d "$FIXREPO/.git" ] && git -C "$FIXREPO" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    # FIRING ARM, and it is the live defect reduced to one payload: a single payload
    # adding claude/PROCESS-LOG.md, which main has carried since a8d1148.
    mkdir -p "$T/W1"
    { mk_commit_header 8888881 "lane4 artefact and record in one commit"
      mk_new gates/verify-log.sh; mk_new claude/PROCESS-LOG.md; } > "$T/W1/lane4"
    out=$(verify_set "$T/W1" "$FIXREPO"); rc=$?
    expect_line  C71-S1b-fires-on-a-path-already-on-main "$out" '^S1b-NEW-PATH-FREE-ON-MAIN +FAIL .*claude/PROCESS-LOG\.md.*add/add'
    expect_line  C72-S1b-names-what-skip-would-discard   "$out" '^S1b-NEW-PATH-FREE-ON-MAIN +FAIL .*discards 1 other path-change'
    # S1 CANNOT see this: one payload, one adder. This control is the measurement in
    # the job's title - the audit reporting green over a payload git will stop on.
    expect_line  C73-S1-is-green-on-the-same-set         "$out" '^S1-NEWFILE-COLLISION +SKIP'
    expect_rc    C74-set-W1-exit-1 "$rc" 1

    # SILENT ARM on the same repo: a new path main does not carry.
    mkdir -p "$T/W2"
    { mk_commit_header 8888882 "lane4 new gate"; mk_new gates/regress/99-brand-new.js; } > "$T/W2/lane4"
    out=$(verify_set "$T/W2" "$FIXREPO"); rc=$?
    expect_line  C75-S1b-silent-on-a-genuinely-new-path "$out" '^S1b-NEW-PATH-FREE-ON-MAIN +PASS'
    expect_rc    C76-set-W2-exit-0 "$rc" 0

    # AND THE BYPRODUCT, STATED AS A BYPRODUCT AND NOT CLAIMED AS A FIX [R18]: the
    # same fixture shows S3b firing for the first time. S3b's three silent-pass
    # routes are NOT repaired here; they are the sibling job
    # jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-
    # that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06. What this
    # control establishes is only that the arm is capable of firing at all.
    mkdir -p "$T/W3"
    { mk_commit_header 8888883 "lane4 clashing number"; mk_new gates/regress/61-clash-with-main.js; } > "$T/W3/lane4"
    out=$(verify_set "$T/W3" "$FIXREPO"); rc=$?
    expect_line  C77-S3b-can-fire-at-all "$out" '^S3b-NUMBER-FREE-ON-MAIN +FAIL .*61'

    # A REPO WITH NO origin/main REF: S1b must say NOT CHECKED and must NOT pass.
    # This is the state of a build-run clone sitting on its per-run branch.
    NOREF="$T/noref"; mkdir -p "$NOREF"
    ( cd "$NOREF" && git init -q . >/dev/null 2>&1 && git config user.email f@e.invalid && git config user.name F       && printf 'x\n' > f.txt && git add -A >/dev/null 2>&1 && git commit -q -m base >/dev/null 2>&1 ) || true
    out=$(verify_set "$T/W1" "$NOREF"); rc=$?
    expect_line     C78-S1b-says-not-checked-without-the-ref "$out" '^S1b-NEW-PATH-FREE-ON-MAIN +SKIP .*NOT CHECKED: origin/main does not resolve'
    expect_no_line  C79-S1b-never-passes-without-the-ref     "$out" '^S1b-NEW-PATH-FREE-ON-MAIN +PASS'

    # ===================================================================
    # S3b AND S6: THE ARMS THIS FILE HAD NEVER SHOWN TO WORK.
    # Added 2026-10-06 by process-build lane 2 for the S3b/S6 vacuity job. Before
    # today the only controls touching these two were C26 and C27 and BOTH ASSERT
    # THE SKIP, so the two checks that read the repository had never been shown to
    # fire, to be silent correctly, or to decline. C77 above establishes only that
    # S3b CAN fire. Every control below is paired: a firing arm and a silent arm, or
    # a NOT-CHECKED arm and the negative control that the old green line is GONE -
    # because the defect being fixed here IS a green line, so "it now says NOT
    # CHECKED" is only half the assertion [the expect_no_line note above].
    # ===================================================================

    # S3b SILENT ARM. The same fixture, a number main does not carry. C77 fires on
    # 61; this is the other half, and it also pins the new count in the PASS line,
    # which is the evidence that something was actually read rather than defaulted.
    out=$(verify_set "$T/W2" "$FIXREPO"); rc=$?
    expect_line  C81-S3b-silent-on-a-free-number "$out" '^S3b-NUMBER-FREE-ON-MAIN +PASS .*1 number\(s\) read from main'
    expect_rc    C82-set-W2-with-repo-exit-0 "$rc" 0

    # S3b ROUTE (a): A CLONE WITH NO origin/main REF, which is the NORMAL state of a
    # build-run clone. W3 carries a REAL clash on 61, so the old code printed
    # "S3b PASS no new gate number collides with origin/main" over a true collision
    # at exit 0, with the git fatal swallowed by 2>/dev/null and not one byte of
    # warning. The negative control is the one that matters.
    out=$(verify_set "$T/W3" "$NOREF"); rc=$?
    expect_line     C83-S3b-says-not-checked-without-the-ref "$out" '^S3b-NUMBER-FREE-ON-MAIN +SKIP .*NOT CHECKED: origin/main does not resolve'
    expect_no_line  C84-S3b-never-passes-without-the-ref     "$out" '^S3b-NUMBER-FREE-ON-MAIN +PASS'

    # S3b ROUTE (c): A MISTYPED repo-dir. The old code reported it as "no [repo-dir]
    # given", a false reason for a real argument, so the reader was told the opposite
    # of what happened. Both arms are checked: the new reason is present AND the old
    # false sentence is gone.
    out=$(verify_set "$T/W3" "$T/no-such-clone-here")
    expect_line     C85-S3b-names-a-bad-repo-dir-as-bad "$out" '^S3b-NUMBER-FREE-ON-MAIN +SKIP .*NOT CHECKED: a \[repo-dir\] WAS given'
    expect_no_line  C86-S3b-does-not-call-a-typo-a-missing-arg "$out" '^S3b-NUMBER-FREE-ON-MAIN +SKIP no \[repo-dir\] given'

    # S6 FIRING ARM, and "firing" for S6 means DECLINING. W3's base sha 8888883 is a
    # fixture literal that resolves nowhere, which is exactly the real situation: every
    # parked payload's base is cut in another container from a branch nobody fetches.
    # The old code gave it the key 0 and printed glob order under the words "oldest
    # base first" at PASS. C88 is the control that the old line is gone.
    out=$(verify_set "$T/W3" "$FIXREPO")
    expect_line     C87-S6-declines-when-a-base-does-not-resolve "$out" '^S6-APPLY-ORDER +SKIP .*NOT CHECKED: 1 of 1 base commit\(s\) do not resolve'
    expect_no_line  C88-S6-never-passes-on-an-unresolved-base   "$out" '^S6-APPLY-ORDER +PASS'

    # S6 SILENT ARM - the one state in which an order is a fact rather than a guess:
    # every base resolves in the clone. Built from the fixture's own two later commits,
    # so the shas are real. The payload based on the OLDER commit must come FIRST, and
    # the assertion is on the ORDER and not merely on the word PASS, which is what the
    # old control set never checked: it is the ordering that was wrong.
    if [ -n "$FIXC2" ] && [ -n "$FIXC3" ]; then
      mkdir -p "$T/W4"
      { mk_commit_header "$FIXC3" "newer base"; mk_new gates/audit/newer.sh; } > "$T/W4/zz-newer"
      { mk_commit_header "$FIXC2" "older base"; mk_new gates/audit/older.sh; } > "$T/W4/aa-older"
      out=$(verify_set "$T/W4" "$FIXREPO"); rc=$?
      expect_line  C89-S6-orders-by-base-date-when-every-base-resolves "$out" '^S6-APPLY-ORDER +PASS .*all 2 base\(s\) resolved.*aa-older zz-newer'
      expect_rc    C90-set-W4-exit-0 "$rc" 0
      # AND THE CONTROL THAT PROVES C89 IS NOT PASSING ON GLOB ORDER BY ACCIDENT. The
      # filenames are deliberately named so that glob order (aa-older, zz-newer) and
      # base-date order agree in W4; reverse the NAMES and keep the bases, and a check
      # that is really sorting by date must STILL put the older base first - which the
      # old implementation, sorting six equal zeros, could never do.
      mkdir -p "$T/W5"
      { mk_commit_header "$FIXC3" "newer base"; mk_new gates/audit/newer.sh; } > "$T/W5/aa-newer"
      { mk_commit_header "$FIXC2" "older base"; mk_new gates/audit/older.sh; } > "$T/W5/zz-older"
      out=$(verify_set "$T/W5" "$FIXREPO")
      expect_line     C91-S6-order-is-not-glob-order "$out" '^S6-APPLY-ORDER +PASS .*zz-older aa-newer'
      expect_no_line  C92-S6-did-not-print-glob-order "$out" '^S6-APPLY-ORDER +PASS .*aa-newer zz-older'
    else
      FAILN=$((FAILN+1))
      echo "  FAIL C89-to-C92-s6-resolving-fixture-unavailable (could not read two parented commits from the fixture at $FIXREPO; the S6 ordering controls did not run)"
    fi
  else
    # git unavailable or init refused: SKIP LOUDLY rather than silently dropping six
    # controls. A selftest that quietly shrinks is how C26 and C27 came to be the
    # only repo controls in the file.
    FAILN=$((FAILN+1))
    echo "  FAIL C71-to-C92-repo-fixture-unavailable (could not build a git fixture with an origin/main ref at $FIXREPO; the S1b, S3b and S6 firing, silent and not-checked controls did not run)"
  fi

  # ---- C56/C57: the PERMITTED_INCIDENTAL literal, which the comment above used to
  # ASSERT agreed with its sibling audit while nothing compared them [R06].
  local sib="$(dirname "$0")/verify-parked-patch.sh" lits
  if [ -r "$sib" ]; then
    lits=$(grep -h "^PERMITTED_INCIDENTAL=" "$sib" "$0" | sort -u | wc -l | tr -d ' ')
    if [ "$lits" = "1" ]; then PASS=$((PASS+1)); echo "  ok   C56-permitted-set-agrees-with-verify-parked-patch"
    else FAILN=$((FAILN+1)); echo "  FAIL C56-permitted-set-agrees-with-verify-parked-patch ($lits distinct literals, wanted 1)"; fi
  else
    FAILN=$((FAILN+1)); echo "  FAIL C56-permitted-set-agrees-with-verify-parked-patch (sibling not readable at $sib)"
  fi
  case "$PERMITTED_INCIDENTAL" in
    *'*'*|*'?'*|*'['*) FAILN=$((FAILN+1)); echo "  FAIL C57-permitted-set-has-no-glob-characters ($PERMITTED_INCIDENTAL)";;
    *) PASS=$((PASS+1)); echo "  ok   C57-permitted-set-has-no-glob-characters";;
  esac

  # ---- C80: THE CONTROL IDS ARE UNIQUE, AND THIS RUN NEEDED IT. The S7 and S1b
  # controls added on 2026-10-06 were first numbered from C62, which this file was
  # already using for C62-set-S-exit-0, so two different controls answered to one id
  # for as long as it took to read the output. A duplicate id is not cosmetic here:
  # every one of these names is how a run report, a job and a build record refer to
  # a control, and the project has already paid for one unspelled field (R43's
  # measurement: 43 jobs worked, 24 nameable). Caught by reading, which is exactly
  # the method this file exists to replace, so it is now a control [R06].
  local ids dupids
  ids=$(grep -hoE '^[[:space:]]*(expect_line|expect_no_line|expect_rc)[[:space:]]+C[0-9]+-' "$0" | grep -oE 'C[0-9]+' ; \
        grep -hoE 'echo "  ok   C[0-9]+' "$0" | grep -oE 'C[0-9]+')
  dupids=$(printf '%s\n' "$ids" | sed '/^$/d' | sort | uniq -d | tr '\n' ' ')
  if [ -z "$dupids" ]; then
    PASS=$((PASS+1)); echo "  ok   C80-control-ids-are-unique ($(printf '%s\n' "$ids" | sed '/^$/d' | sort -u | wc -l | tr -d ' ') distinct)"
  else
    FAILN=$((FAILN+1)); echo "  FAIL C80-control-ids-are-unique (duplicated: $dupids)"
  fi

  printf '\nSELFTEST %s pass / %s fail\n' "$PASS" "$FAILN"
  rm -rf "$T"
  [ "$FAILN" -eq 0 ] || return 1
  return 0
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") printf 'usage: %s <payload-dir> [repo-dir]\n       %s --selftest\n' "$0" "$0" >&2; exit 2 ;;
  *)  verify_set "$1" "${2:-}"; exit $? ;;
esac
