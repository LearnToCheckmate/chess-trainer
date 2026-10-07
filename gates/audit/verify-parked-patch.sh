#!/usr/bin/env bash
# gates/audit/verify-parked-patch.sh
#
# Verifies a PARKED PATCH payload against its own manifest entry, at park time
# and again at integration time.
#
# WHY THIS EXISTS. jobs/nothing-verifies-a-parked-patch-so-one-of-fifteen-carried-
# the-wrong-commit-2026-10-03, measured by the daily integration slot over the whole
# 2026-10-03 burst wave 1 manifest: 14 of 15 payloads were sound and 1 carried
# somebody else's already-landed commit. That payload was a format-patch of f3ae36a
# - its own document's baseSha - diffing RUN-LOG.md, not the agent's commit 6e2bdf5
# and not gates/held.sh. The agent reported 12 green controls in good faith; what it
# parked was not what it built, and its container is gone. The checks below are free
# and every one of them would have caught it at 20:30Z.
#
# Written by process-build lane 2, run process-build__1791079994048, 2026-10-04.
# The PROSE amendment to prompts/process-burst step 4 is the orchestrator's [R17];
# this file is the executable half, so the check is a command rather than a reminder.
#
# USAGE
#   verify-parked-patch.sh <payload-file> <declared-base-sha> <declared-paths-csv> [repo-dir]
#   verify-parked-patch.sh --selftest
#
#   <payload-file>        the `patch` field of the parked document, written to a file
#   <declared-base-sha>   the document's baseSha field (full or abbreviated)
#   <declared-paths-csv>  the document's artefact / touched field, comma-separated
#   [repo-dir]            optional repository, enables C3; omitted means C3 SKIP.
#                         A clone, a `git worktree add --detach` tree or a bare repo
#                         all work: the guard is `git rev-parse --git-dir`, not
#                         `-d .git`. Each SKIP names its own reason, so "no repo-dir
#                         given" now means the argument was absent and nothing else.
#
# EXIT 0 only when every applicable check passed. 1 on any FAIL. 2 on bad usage.

set -u

PERMITTED_INCIDENTAL='claude/PROCESS-LOG.md'

# The process-build / process-burst allow-list, from prompts/process-build.
allow_listed() {
  case "$1" in
    gates/regress/*|gates/drive/*|gates/audit/*|gates/pending/*) return 0 ;;
    gates/*.sh) return 0 ;;
    claude/stories/*|claude/agents/*|claude/PROCESS-LOG.md) return 0 ;;
    *) return 1 ;;
  esac
}
# Paths a parallel lane may NEVER park, whatever its manifest says.
forbidden() {
  case "$1" in
    chess.jsx|app.js|lessons.js|index.html|sw.js) return 0 ;;
    RUN-LOG.md|HANDOFF.md|CLAUDE.md|FEEDBACK-INBOX.md|DECISIONS-LOG.md) return 0 ;;
    claude/BUILD-CONTEXT.md) return 0 ;;
    gates/*.tsv) return 0 ;;
    */*) return 1 ;;
    *) return 0 ;;   # any other bare file at the repository root
  esac
}

FAILED=0
say() { printf '%-34s %-4s %s\n' "$1" "$2" "$3"; }
fail() { say "$1" FAIL "$2"; FAILED=1; }

verify() {
  local payload="$1" base="$2" declared="$3" repo="${4:-}"
  FAILED=0

  if [ ! -s "$payload" ]; then
    fail C0-PAYLOAD-NON-EMPTY "payload file is missing or empty: $payload"
    return 1
  fi

  local fromsha
  fromsha=$(awk 'NR==1 && $1=="From" {print $2; exit}' "$payload")
  local -a paths
  mapfile -t paths < <(sed -n 's|^diff --git a/.* b/||p' "$payload")

  # ---- C0 WELL-FORMED -----------------------------------------------------
  if [ -z "$fromsha" ]; then
    fail C0-WELL-FORMED "line 1 is not 'From <sha> ...'; this is not git format-patch output"
  elif [ "${#paths[@]}" -eq 0 ]; then
    fail C0-WELL-FORMED "no 'diff --git' line: the payload carries a commit message and no diff"
  elif ! grep -q '^@@\|^new file mode\|^deleted file mode\|^similarity index' "$payload"; then
    fail C0-WELL-FORMED "no hunk header, new-file mode or rename: nothing would be applied"
  else
    say C0-WELL-FORMED PASS "format-patch of $fromsha over ${#paths[@]} path(s)"
  fi

  # ---- C1 FROM-SHA IS NOT THE DECLARED BASE -------------------------------
  # theFix check (1). A format-patch whose From-sha equals its own baseSha means
  # the range was wrong: the payload is the base commit, not the work on top of it.
  if [ -n "$fromsha" ] && [ -n "$base" ]; then
    local n=${#fromsha}; [ ${#base} -lt "$n" ] && n=${#base}
    if [ "${fromsha:0:$n}" = "${base:0:$n}" ]; then
      fail C1-FROM-SHA-NOT-BASE "From-sha $fromsha == declared baseSha $base; the range was wrong"
    else
      say C1-FROM-SHA-NOT-BASE PASS "$fromsha != $base"
    fi
  else
    say C1-FROM-SHA-NOT-BASE SKIP "no From-sha or no declared baseSha to compare"
  fi

  # ---- C2 PATHS AGREE WITH THE MANIFEST -----------------------------------
  # theFix check (2) says the diff paths must EQUAL the `touched` field. MEASURED
  # 2026-10-04 against the two patches parked in `patches`: equality FALSELY FAILS
  # every process-lane patch, because prompts/process-build step 6 REQUIRES each run
  # to append to claude/PROCESS-LOG.md, so patches/proc-lane1-art-gates-verify-log-
  # selftest-sh-2026-10-04 declares one artefact and soundly diffs two paths. So the
  # check implemented here is the two-sided one that does not false-positive:
  #   every declared path must be present, and every present path must be either
  #   declared or the permitted incidental record file.
  if [ "${#paths[@]}" -gt 0 ]; then
    local missing="" extra="" d p found
    IFS=',' read -r -a decl <<< "$declared"
    for d in "${decl[@]}"; do
      d="$(printf '%s' "$d" | tr -d '[:space:]')"; [ -z "$d" ] && continue
      found=0
      for p in "${paths[@]}"; do [ "$p" = "$d" ] && found=1; done
      [ $found -eq 0 ] && missing="$missing $d"
    done
    for p in "${paths[@]}"; do
      found=0
      for d in "${decl[@]}"; do
        d="$(printf '%s' "$d" | tr -d '[:space:]')"
        [ "$p" = "$d" ] && found=1
      done
      [ "$p" = "$PERMITTED_INCIDENTAL" ] && found=1
      [ $found -eq 0 ] && extra="$extra $p"
    done
    if [ -n "$missing" ] || [ -n "$extra" ]; then
      fail C2-PATHS-MATCH-MANIFEST "declared-but-absent:${missing:- none} present-but-undeclared:${extra:- none}"
    else
      say C2-PATHS-MATCH-MANIFEST PASS "${#paths[@]} path(s) agree with the manifest entry"
    fi
  else
    say C2-PATHS-MATCH-MANIFEST SKIP "no diff paths to compare"
  fi

  # ---- C3 THE PAYLOAD IS NOT ALREADY ON MAIN ------------------------------
  # Added beyond theFix, because it names the burst07 failure directly rather than
  # by its symptom: that payload carried a commit that was ALREADY LANDED. C1 catches
  # it only because the already-landed commit happened to be the document's own base.
  # THE GUARD ASKS GIT, NOT THE FILESYSTEM, AND EVERY SKIP NAMES ITS OWN REASON.
  # It used to read `[ -n "$repo" ] && [ -n "$fromsha" ] && [ -d "$repo/.git" ]` with a
  # single else printing "no repository given". In a `git worktree add --detach` tree
  # .git is a FILE, not a directory, so the third test was false and the script blamed
  # the operator for an argument they had supplied - and a worktree is how every
  # appliesClean field in the `patches` collection is measured, so for a parallel lane
  # C3 was not occasionally vacuous, it was always vacuous. `rev-parse --git-dir` is
  # true for a clone, a worktree and a bare repository alike. Three skips rather than
  # the two theFix asked for: a missing From-sha was ALSO reported as "no repository
  # given", which is the same false-reason defect in a second input. Controls: section
  # 10 of --selftest. jobs/gates-audit-verify-parked-patch-sh-c3-skips-silently-when-
  # the-repo-dir-is-a-git-worktree-2026-10-08, and the same line is named by
  # jobs/verify-parked-patch-c3-cases-skip-silently-in-a-worktree-and-the-published-17-
  # omits-its-scope-2026-10-04, which prescribes this identical remedy and whose WIDER
  # remedy (C3 answering by `git apply -R --check` per commit, because a parked
  # payload's From-sha is absent from every other object database - 7 of 7 measured) is
  # NOT done here and is not this lane's: that job is owned by build and is parked.
  if [ -z "$repo" ]; then
    say C3-NOT-ALREADY-ON-MAIN SKIP "no repo-dir given"
  elif ! git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
    say C3-NOT-ALREADY-ON-MAIN SKIP "the path given is not a git repository: $repo"
  elif [ -z "$fromsha" ]; then
    say C3-NOT-ALREADY-ON-MAIN SKIP "the payload carries no From-sha to look up"
  elif ! git -C "$repo" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    # FOUND BY WIDENING THE GUARD AND THEN MEASURING THE WIDENED CASE, NOT BY REASONING
    # [R18]. `rev-parse --git-dir` correctly accepts a BARE repository, and a bare clone
    # of this repo has refs/heads/main and NO refs/remotes/origin/main - so `merge-base
    # --is-ancestor <sha> origin/main` fails on an unresolvable ref, the 2>/dev/null
    # swallows it, and the else branch below printed a confident
    #   C3-NOT-ALREADY-ON-MAIN PASS "<sha> is not on origin/main"
    # for a sha that IS on main. Measured: bare clone of origin/main 6bd5e54, payload
    # From-sha 6bd5e54, old predicate SKIP "no repository given" / new predicate without
    # this arm PASS "is not on origin/main". That is worse than the vacuity this change
    # exists to remove: a wrong PASS replaces an honest SKIP. The ancestry question
    # cannot be asked without the ref, so say so instead of answering it.
    say C3-NOT-ALREADY-ON-MAIN SKIP "the repository has no origin/main to compare against: $repo"
  elif git -C "$repo" cat-file -e "${fromsha}^{commit}" 2>/dev/null; then
    if git -C "$repo" merge-base --is-ancestor "$fromsha" origin/main 2>/dev/null; then
      fail C3-NOT-ALREADY-ON-MAIN "$fromsha is already an ancestor of origin/main; this payload carries landed work"
    else
      say C3-NOT-ALREADY-ON-MAIN PASS "$fromsha is not on origin/main"
    fi
  else
    say C3-NOT-ALREADY-ON-MAIN SKIP "$fromsha is in no object database here (expected: the author's container is gone)"
  fi

  # ---- C4 ALLOW-LIST ------------------------------------------------------
  # A parallel lane's payload that touches app code or a shared append-only record
  # reintroduces exactly the merge conflict the single pen exists to prevent.
  if [ "${#paths[@]}" -gt 0 ]; then
    local bad=""
    for p in "${paths[@]}"; do
      if forbidden "$p" || ! allow_listed "$p"; then bad="$bad $p"; fi
    done
    if [ -n "$bad" ]; then
      fail C4-ALLOW-LIST "outside the parallel-lane allow-list:$bad"
    else
      say C4-ALLOW-LIST PASS "all ${#paths[@]} path(s) inside the allow-list"
    fi
  else
    say C4-ALLOW-LIST SKIP "no diff paths to check"
  fi

  # ---- C5 A NEW NUMBERED GATE NEEDS A MANIFEST ROW THIS LANE MAY NOT WRITE ----
  # MEASURED 2026-10-07 by process-build-1__1791398097932, both directions, in a
  # throwaway copy of gates/ rather than read off the source:
  #   gates/gatemanifest.sh check, baseline            -> exit 0, "0 unlisted"
  #   the same copy plus one unlisted gates/regress/*.js -> exit 2, "1 unlisted"
  #   remove the file again                            -> exit 0, "0 unlisted"
  # Exit 2 is SOFT by design, so the suite still runs the new gate. The refusal
  # lands one step later and it is hard: gates/verify-log.sh, the one tool that
  # decides whether a log authorises a push, REFUSES at exit 1 on any log whose
  # manifest footer reports unlisted > 0. Measured on the committed
  # claude/agents/gatelogs/493b-all.log: unmodified -> exit 0; the SAME log with
  # its three manifest footer lines changed from "57 present, 0 unlisted" to
  # "58 present, 1 unlisted" (arithmetic kept consistent so the separate
  # add-up check cannot be what fires) -> exit 1, "REFUSED (gate manifest)".
  #
  # SO THE PAYLOAD IS UNLANDABLE, AND IT DOES NOT FAIL ALONE. The row that would
  # make it pushable goes in gates/gate-manifest.tsv, which `forbidden` above
  # rejects, so C4 fails the payload if the row is included and C5 fails it if it
  # is not. Those two together are a proof, not a precaution: this lane cannot
  # deliver a new numbered gate by any route. And the refusal is at the PUSH, so
  # the cost is not this payload - it is every commit in the build that landed it.
  #
  # WHAT THIS CHECK IS NOT. It does not fire on a MODIFIED gate (the manifest row
  # already exists), nor on a new gates/audit/, gates/drive/, gates/pending/ or
  # gates/*.sh file (the manifest's required set is gates/regress/*.js only -
  # which is also why five gates/audit/ scripts could land callerless and nothing
  # objected). Those are the C5-silent controls in the selftest.
  local nfm_lines newgates ngates
  nfm_lines=$(grep -c '^new file mode' "$payload" || true)
  newgates=$(awk '
    /^diff --git a\// { cur=$0; sub(/^diff --git a\/.* b\//,"",cur); next }
    /^new file mode/  { if (cur!="") { print cur; cur="" } }
  ' "$payload")
  local nadded; nadded=$(printf '%s' "$newgates" | grep -c . || true)
  if [ "$nadded" -ne "$nfm_lines" ]; then
    # THE VACUITY GUARD, and it is required rather than tidy: every detector below
    # reasons over a set this parse produced, and `every()` over nothing is true.
    # If the payload holds more 'new file mode' lines than this parse attributed to
    # a path, the parse did not read what the check assumes and the answer is NOT
    # CHECKED, never PASS [CLAUDE.md, "assert the collection is non-empty - in its
    # own say, not as a conjunct"].
    say C5-NEW-GATE-MANIFEST-ROW "NOT" "CHECKED: $nfm_lines 'new file mode' line(s) but $nadded attributable to a path - the parse disagrees with the payload"
  else
    local gbad=""
    for g in $newgates; do
      case "$g" in gates/regress/[0-9]*.js) gbad="$gbad $g" ;; esac
    done
    if [ -n "$gbad" ]; then
      fail C5-NEW-GATE-MANIFEST-ROW "adds new numbered gate(s):$gbad - unlandable from a parallel lane. gates/gatemanifest.sh check reports them as unlisted (exit 2, soft) and gates/verify-log.sh then REFUSES the whole build's log at exit 1; the gates/gate-manifest.tsv row that would fix it is forbidden here, so C4 rejects the payload if the row is included"
    else
      say C5-NEW-GATE-MANIFEST-ROW SKIP "$nadded new file(s), none a numbered gates/regress/*.js"
    fi
  fi

  if [ "$FAILED" -eq 0 ]; then echo "VERDICT SOUND"; return 0; fi
  echo "VERDICT REJECT"; return 1
}

# ===========================================================================
# SELFTEST. Every detector must FIRE on a forged payload and must NOT fire on a
# sound one; a control set that only ever goes green cannot tell you anything
# [jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02].
# ===========================================================================
selftest() {
  local T; T=$(mktemp -d); local pass=0 fail=0
  check() { # name expect-exit expect-grep payload base declared [repo]
    local name="$1" wantrc="$2" wantgrep="$3"; shift 3
    local out rc
    out=$(verify "$@" 2>&1); rc=$?
    if [ "$rc" -eq "$wantrc" ] && printf '%s' "$out" | grep -q "$wantgrep"; then
      printf 'PASS  %s\n' "$name"; pass=$((pass+1))
    else
      printf 'FAIL  %s (rc=%s want %s, looking for "%s")\n%s\n' "$name" "$rc" "$wantrc" "$wantgrep" "$out"
      fail=$((fail+1))
    fi
  }
  mk() { # file fromsha subject paths...
    local f="$1" sha="$2" subj="$3"; shift 3
    { echo "From $sha Mon Sep 17 00:00:00 2001"
      echo "From: fixture <noreply@anthropic.com>"
      echo "Date: Sun, 4 Oct 2026 00:00:00 +0000"
      echo "Subject: [PATCH] $subj"; echo
      for p in "$@"; do
        echo "diff --git a/$p b/$p"
        echo "index 1111111..2222222 100644"
        echo "--- a/$p"; echo "+++ b/$p"
        echo "@@ -1,1 +1,2 @@"; echo " x"; echo "+y"
      done
      echo "-- "; echo "2.43.0"
    } > "$f"
  }

  # 1. The real shape of a SOUND single-artefact burst payload (burst02, gate 20).
  mk "$T/sound1" 42f900a166e27f43de182100456a446de7995676 "gate 20" gates/regress/20-review.js
  check "sound: one declared path, one diffed path" 0 'VERDICT SOUND' \
        "$T/sound1" f3ae36a gates/regress/20-review.js

  # 2. The real shape of a SOUND process-lane payload: artefact + PROCESS-LOG.md.
  #    This is the case theFix's literal "EQUAL" wording would have rejected.
  mk "$T/sound2" 58962ebdf9c41c5dee0a97c242a3d976e3eb78f1 "process: selftest" \
     claude/PROCESS-LOG.md gates/verify-log-selftest.sh
  check "sound: artefact plus the PROCESS-LOG append" 0 'VERDICT SOUND' \
        "$T/sound2" 420d4d4b4f2787eb1f9ec79811ed689f26b13787 gates/verify-log-selftest.sh

  # 3. C1 fires: the burst07 payload, a format-patch of its own baseSha.
  mk "$T/c1" f3ae36a0000000000000000000000000000000 "held.sh field 7" RUN-LOG.md
  check "C1 fires on From-sha == baseSha" 1 'C1-FROM-SHA-NOT-BASE *FAIL' \
        "$T/c1" f3ae36a gates/held.sh
  # 3b. and the SAME payload trips C2 and C4 too, which is how one defect was visible
  #     three ways and still shipped.
  check "C2 fires on the same payload" 1 'C2-PATHS-MATCH-MANIFEST *FAIL' \
        "$T/c1" f3ae36a gates/held.sh
  check "C4 fires on RUN-LOG.md" 1 'C4-ALLOW-LIST *FAIL' \
        "$T/c1" f3ae36a gates/held.sh

  # 4. C1 does NOT fire on an abbreviated base that merely shares no prefix.
  mk "$T/c1n" aaaaaaa111111111111111111111111111111111 "x" gates/regress/20-review.js
  check "C1 silent when the shas differ" 0 'C1-FROM-SHA-NOT-BASE *PASS' \
        "$T/c1n" f3ae36a gates/regress/20-review.js

  # 5. C2 fires when the declared artefact is ABSENT from the diff.
  mk "$T/c2a" bbbbbbb111111111111111111111111111111111 "x" gates/regress/99-other.js
  check "C2 fires on declared-but-absent" 1 'declared-but-absent: gates/regress/20-review.js' \
        "$T/c2a" f3ae36a gates/regress/20-review.js

  # 6. C2 fires on an undeclared EXTRA path that is not the permitted record file.
  mk "$T/c2b" ccccccc111111111111111111111111111111111 "x" \
     gates/regress/20-review.js gates/regress/26-invariants.js
  check "C2 fires on present-but-undeclared" 1 'present-but-undeclared: gates/regress/26-invariants.js' \
        "$T/c2b" f3ae36a gates/regress/20-review.js

  # 7. C4 fires on app code, which is the whole reason the parallel lanes exist.
  mk "$T/c4a" ddddddd111111111111111111111111111111111 "x" chess.jsx
  check "C4 fires on chess.jsx" 1 'C4-ALLOW-LIST *FAIL' "$T/c4a" f3ae36a chess.jsx
  mk "$T/c4b" eeeeeee111111111111111111111111111111111 "x" gates/gate-manifest.tsv
  check "C4 fires on a .tsv under gates" 1 'C4-ALLOW-LIST *FAIL' "$T/c4b" f3ae36a gates/gate-manifest.tsv
  mk "$T/c4c" fffffff111111111111111111111111111111111 "x" deploy.py
  check "C4 fires on a new file at the root" 1 'C4-ALLOW-LIST *FAIL' "$T/c4c" f3ae36a deploy.py

  # 8. C0 fires on the three malformations seen in wave 1's three collections.
  printf 'this is a file body, not a patch\n' > "$T/c0a"
  check "C0 fires on fileContent parked as a patch" 1 'C0-WELL-FORMED *FAIL' "$T/c0a" f3ae36a gates/held.sh
  { echo "From 1234567111111111111111111111111111111111 Mon Sep 17 00:00:00 2001"
    echo "Subject: [PATCH] message only"; echo; } > "$T/c0b"
  check "C0 fires on a commit message with no diff" 1 'no .diff --git. line' "$T/c0b" f3ae36a gates/held.sh
  { echo "From 1234567111111111111111111111111111111111 Mon Sep 17 00:00:00 2001"
    echo; echo "diff --git a/gates/held.sh b/gates/held.sh"; } > "$T/c0c"
  check "C0 fires on a diff header with no hunk" 1 'no hunk header' "$T/c0c" f3ae36a gates/held.sh
  : > "$T/c0d"
  check "C0 fires on an empty payload" 1 'C0-PAYLOAD-NON-EMPTY *FAIL' "$T/c0d" f3ae36a gates/held.sh

  # 9. C3 against a real repository: HEAD of origin/main is by definition landed.
  # SAME CLASS, SECOND SITE IN THIS FILE: a worktree passed as SELFTEST_REPO used to
  # fall into the else and the two C3 cases silently did not run, which is why the
  # published figure read 17 from a clone and 15 from a worktree with a perfectly good
  # origin/main. Ask git.
  if [ -n "${SELFTEST_REPO:-}" ] && git -C "${SELFTEST_REPO}" rev-parse --git-dir >/dev/null 2>&1 \
     && git -C "${SELFTEST_REPO}" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    local head; head=$(git -C "$SELFTEST_REPO" rev-parse origin/main)
    mk "$T/c3a" "$head" "x" gates/regress/20-review.js
    check "C3 fires on a commit already on main" 1 'C3-NOT-ALREADY-ON-MAIN *FAIL' \
          "$T/c3a" f3ae36a gates/regress/20-review.js "$SELFTEST_REPO"
    mk "$T/c3b" 9999999111111111111111111111111111111111 "x" gates/regress/20-review.js
    check "C3 skips an unknown sha rather than failing" 0 'C3-NOT-ALREADY-ON-MAIN *SKIP' \
          "$T/c3b" f3ae36a gates/regress/20-review.js "$SELFTEST_REPO"
  else
    echo "SKIP  C3 repository cases (set SELFTEST_REPO to a repository that RESOLVES origin/main: a clone or a worktree, not a bare clone of a local repo)"
  fi

  # 10. THE REPOSITORY SHAPE MAY NOT CHANGE C3's ANSWER, AND EVERY SKIP MUST NAME ITS
  #     OWN REASON. The class is "a check in gates/audit/ that guards a repository read
  #     on a filesystem test rather than on git". Written as an EQUALITY BETWEEN TWO
  #     REPOSITORY SHAPES over one payload rather than as a pin on one shape's string,
  #     so it still holds when the message is reworded. Input count: 1 payload x 2 repo
  #     shapes for the equivalence, plus 2 argument shapes for the reason split.
  if [ -n "${SELFTEST_REPO:-}" ] && git -C "${SELFTEST_REPO}" rev-parse --git-dir >/dev/null 2>&1 \
     && git -C "${SELFTEST_REPO}" rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    local wt="$T/wt-shape" head2 outc outw rcc rcw tokc tokw
    if git -C "$SELFTEST_REPO" worktree add --detach "$wt" origin/main >/dev/null 2>&1; then
      head2=$(git -C "$SELFTEST_REPO" rev-parse origin/main)
      mk "$T/c3shape" "$head2" "already landed" gates/regress/20-review.js
      outc=$(verify "$T/c3shape" f3ae36a gates/regress/20-review.js "$SELFTEST_REPO" 2>&1); rcc=$?
      outw=$(verify "$T/c3shape" f3ae36a gates/regress/20-review.js "$wt" 2>&1); rcw=$?
      tokc=$(printf '%s\n' "$outc" | awk '/^C3-NOT-ALREADY-ON-MAIN/{print $2; exit}')
      tokw=$(printf '%s\n' "$outw" | awk '/^C3-NOT-ALREADY-ON-MAIN/{print $2; exit}')
      if [ -n "$tokc" ] && [ "$tokc" = "$tokw" ] && [ "$rcc" -eq "$rcw" ]; then
        printf 'PASS  C3 reaches the same verdict in a clone and in a worktree (%s, rc=%s, 1 payload x 2 shapes)\n' "$tokc" "$rcc"; pass=$((pass+1))
      else
        printf 'FAIL  C3 verdict depends on the repository SHAPE: clone=%s rc=%s worktree=%s rc=%s\n' "$tokc" "$rcc" "$tokw" "$rcw"; fail=$((fail+1))
      fi
      if printf '%s' "$outw" | grep -q 'no repo-dir given\|no repository given'; then
        printf 'FAIL  C3 blames the operator in a worktree: a repo-dir WAS given and is usable\n'; fail=$((fail+1))
      else
        printf 'PASS  C3 does not say "no repo-dir given" when a worktree was given\n'; pass=$((pass+1))
      fi
      git -C "$SELFTEST_REPO" worktree remove --force "$wt" >/dev/null 2>&1
      git -C "$SELFTEST_REPO" worktree prune >/dev/null 2>&1
      # The reason split, both directions, on the same payload.
      check "C3 says no repo-dir given ONLY when the argument is absent" 0 'SKIP no repo-dir given' \
            "$T/c3shape" f3ae36a gates/regress/20-review.js
      check "C3 names an unusable path rather than blaming the caller" 0 'is not a git repository' \
            "$T/c3shape" f3ae36a gates/regress/20-review.js "$T"
      # A repository with no origin/main cannot answer C3's question. It must SKIP and
      # say why, NEVER print PASS "is not on origin/main" - which is what this file did
      # for one edit of its own life, caught by its own bare-repo control.
      if git clone -q --bare "$SELFTEST_REPO" "$T/bare.git" >/dev/null 2>&1; then
        check "C3 refuses to answer in a repository with no origin/main" 0 'SKIP the repository has no origin/main' \
              "$T/c3shape" f3ae36a gates/regress/20-review.js "$T/bare.git"
        local obare; obare=$(verify "$T/c3shape" f3ae36a gates/regress/20-review.js "$T/bare.git" 2>&1)
        if printf '%s' "$obare" | grep -q 'C3-NOT-ALREADY-ON-MAIN *PASS'; then
          printf 'FAIL  C3 claims a landed sha is not on main where origin/main does not resolve\n'; fail=$((fail+1))
        else
          printf 'PASS  C3 never PASSes where origin/main does not resolve (1 payload, 1 refless repo)\n'; pass=$((pass+1))
        fi
        rm -rf "$T/bare.git"
      else
        echo "SKIP  C3 refless-repository case (bare clone of SELFTEST_REPO failed)"
      fi
    else
      echo "FAIL  C3 shape cases: could not create a worktree from SELFTEST_REPO"; fail=$((fail+1))
    fi
  else
    echo "SKIP  C3 repository-shape cases (set SELFTEST_REPO to a repository that RESOLVES origin/main and can host a worktree)"
  fi

  # ---- C5's controls. Six, every detector shown FIRING and SILENT, plus the
  # NOT-CHECKED arm and the negative control that the verdict is actually gone.
  # A control set that only asserts the SKIP is the defect this file's own
  # C3 already has [jobs/verify-parked-patch-c3-cases-skip-silently-...-2026-10-04],
  # so the firing arm is written first and the discriminator is written last.
  mknew() { # file fromsha subject paths...   -- same as mk but ADDS each path
    local f="$1" sha="$2" subj="$3"; shift 3
    { echo "From $sha Mon Sep 17 00:00:00 2001"
      echo "From: fixture <noreply@anthropic.com>"
      echo "Date: Wed, 7 Oct 2026 00:00:00 +0000"
      echo "Subject: [PATCH] $subj"; echo
      for p in "$@"; do
        echo "diff --git a/$p b/$p"
        echo "new file mode 100644"
        echo "index 0000000..2222222"
        echo "--- /dev/null"; echo "+++ b/$p"
        echo "@@ -0,0 +1,1 @@"; echo "+y"
      done
      echo "-- "; echo "2.43.0"
    } > "$f"
  }

  # C5a FIRES on the real blocked case: gates/regress/56-review-ladder.js is the
  # gate jobs/20-review-cats-frozen-at-eight has been waiting for since
  # 2026-09-22, 56 is free on main, and this lane cannot deliver it.
  mknew "$T/c5a" 1111111 "process: gate 56" gates/regress/56-review-ladder.js
  check "C5 fires on a new numbered gate" 1 'C5-NEW-GATE-MANIFEST-ROW *FAIL' \
        "$T/c5a" f3ae36a gates/regress/56-review-ladder.js
  # C5a-neg THE NEGATIVE CONTROL: the verdict must actually be gone, not merely
  # accompanied by a FAIL line. "The numbers moved" is necessary and not sufficient.
  check "C5 firing removes VERDICT SOUND" 1 'VERDICT REJECT' \
        "$T/c5a" f3ae36a gates/regress/56-review-ladder.js
  # C5b names the gate it refused, so the message is actionable without re-deriving.
  check "C5 names the gate it refused" 1 '56-review-ladder.js' \
        "$T/c5a" f3ae36a gates/regress/56-review-ladder.js
  # C5c SILENT on a MODIFIED gate - the manifest row already exists. This is the
  # ordinary case and a guard that fires on it would be switched off.
  check "C5 silent on a modified gate" 0 'C5-NEW-GATE-MANIFEST-ROW *SKIP' \
        "$T/sound1" f3ae36a gates/regress/20-review.js
  # C5d SILENT on a new gates/audit/ script - not in the manifest's required set,
  # which is gates/regress/*.js only. Five such scripts are on main already.
  mknew "$T/c5d" 2222222 "process: a new audit" gates/audit/new-thing.sh
  check "C5 silent on a new gates/audit script" 0 'C5-NEW-GATE-MANIFEST-ROW *SKIP' \
        "$T/c5d" f3ae36a gates/audit/new-thing.sh
  # C5e THE DISCRIMINATOR. Two new gates in one payload must be counted as two.
  # Without this, a check that found the first and stopped reads identically.
  mknew "$T/c5e" 3333333 "process: two gates" \
        gates/regress/56-review-ladder.js gates/regress/59-x.js
  check "C5 names BOTH gates when a payload adds two" 1 '59-x.js' \
        "$T/c5e" f3ae36a gates/regress/56-review-ladder.js gates/regress/59-x.js
  # C5f NOT CHECKED, never PASS, when the parse disagrees with the payload: a
  # 'new file mode' line that no 'diff --git' claims. The forged payload below has
  # two such lines and one attributable path.
  mknew "$T/c5f" 4444444 "process: forged" gates/regress/56-review-ladder.js
  sed -i 's/^index 0000000..2222222$/index 0000000..2222222\nnew file mode 100644/' "$T/c5f"
  check "C5 reads NOT CHECKED on an unattributable new-file line" 0 'C5-NEW-GATE-MANIFEST-ROW *NOT' \
        "$T/c5f" f3ae36a gates/regress/56-review-ladder.js
  check "C5 does NOT print a SKIP or a FAIL when it is NOT CHECKED" 0 'CHECKED: 2 ' \
        "$T/c5f" f3ae36a gates/regress/56-review-ladder.js

  rm -rf "$T"
  echo "-----"
  echo "verify-parked-patch selftest: $pass pass, $fail fail"
  [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest ;;
  -h|--help|"") sed -n '1,30p' "$0"; exit 2 ;;
  *)
    [ $# -lt 3 ] && { echo "usage: $0 <payload-file> <declared-base-sha> <declared-paths-csv> [repo-dir]"; exit 2; }
    verify "$1" "$2" "$3" "${4:-}" ;;
esac
