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
#   [repo-dir]            optional clone, enables C3; omitted means C3 SKIP
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
  if [ -n "$repo" ] && [ -n "$fromsha" ] && [ -d "$repo/.git" ]; then
    if git -C "$repo" cat-file -e "${fromsha}^{commit}" 2>/dev/null; then
      if git -C "$repo" merge-base --is-ancestor "$fromsha" origin/main 2>/dev/null; then
        fail C3-NOT-ALREADY-ON-MAIN "$fromsha is already an ancestor of origin/main; this payload carries landed work"
      else
        say C3-NOT-ALREADY-ON-MAIN PASS "$fromsha is not on origin/main"
      fi
    else
      say C3-NOT-ALREADY-ON-MAIN SKIP "$fromsha is in no object database here (expected: the author's container is gone)"
    fi
  else
    say C3-NOT-ALREADY-ON-MAIN SKIP "no repository given"
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
  if [ -n "${SELFTEST_REPO:-}" ] && [ -d "${SELFTEST_REPO}/.git" ]; then
    local head; head=$(git -C "$SELFTEST_REPO" rev-parse origin/main)
    mk "$T/c3a" "$head" "x" gates/regress/20-review.js
    check "C3 fires on a commit already on main" 1 'C3-NOT-ALREADY-ON-MAIN *FAIL' \
          "$T/c3a" f3ae36a gates/regress/20-review.js "$SELFTEST_REPO"
    mk "$T/c3b" 9999999111111111111111111111111111111111 "x" gates/regress/20-review.js
    check "C3 skips an unknown sha rather than failing" 0 'C3-NOT-ALREADY-ON-MAIN *SKIP' \
          "$T/c3b" f3ae36a gates/regress/20-review.js "$SELFTEST_REPO"
  else
    echo "SKIP  C3 repository cases (set SELFTEST_REPO to a clone with origin/main)"
  fi

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
