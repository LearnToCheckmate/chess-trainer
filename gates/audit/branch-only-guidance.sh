#!/usr/bin/env bash
# gates/audit/branch-only-guidance.sh - HOW MUCH BUILDER GUIDANCE EXISTS ONLY ON A BRANCH THAT NEVER REACHED MAIN?
#
# WHY [#545, item (46); jobs/handoff-guidance-written-on-an-unmerged-branch-is-invisible-to-every-later-run-2026-10-01].
# A routine run is cloned onto main, so a paragraph a stood-down run wrote into HANDOFF.md, CLAUDE.md or RUN-LOG.md on its
# per-run branch is invisible to every later run BY CONSTRUCTION. One such paragraph ("DO NOT DROP THE FLOOR EITHER") was
# cited in the pen note as a file the next run had failed to read - a false lesson, because no run on main could have read
# it. This is the job's sweep: for every origin ref that is NOT an ancestor of origin/main, the lines that ref ADDS to each
# of the three files (three-dot diff from the merge-base) and that are NOT present verbatim anywhere in main's copy.
# A ref that is an ancestor of main reports nothing by construction (its three-dot diff is empty) - the negative control.
#   bash gates/audit/branch-only-guidance.sh [repo-dir]    one TSV row per (ref, file) with a non-zero count, then a total
#   bash gates/audit/branch-only-guidance.sh --selftest
# Requires a complete clone: on a shallow one the merge-base cannot be computed and the ref is reported NOT CHECKED.
set -uo pipefail
FILES="HANDOFF.md CLAUDE.md RUN-LOG.md"

sweep(){ # <repo>
  local repo="$1" ref f n tot=0 refs=0 skipped=0
  local g=(git -C "$repo")
  "${g[@]}" rev-parse --verify -q origin/main >/dev/null || { echo "NOT CHECKED: no origin/main in $repo"; return 2; }
  [ "$("${g[@]}" rev-parse --is-shallow-repository)" = false ] || { echo "NOT CHECKED: $repo is a shallow clone - run git fetch --unshallow first"; return 2; }
  local T; T="$(mktemp -d)" || return 2
  for f in $FILES; do "${g[@]}" show "origin/main:$f" > "$T/main.$f" 2>/dev/null || : > "$T/main.$f"; done
  printf 'ref\tfile\tlines-only-on-the-branch\n'
  while read -r ref; do
    case "$ref" in origin/main|origin/HEAD|origin) continue;; esac
    if "${g[@]}" merge-base --is-ancestor "$ref" origin/main 2>/dev/null; then continue; fi
    if ! "${g[@]}" merge-base origin/main "$ref" >/dev/null 2>&1; then skipped=$((skipped+1)); printf '%s\t-\tNOT CHECKED (no merge-base)\n' "$ref"; continue; fi
    refs=$((refs+1))
    for f in $FILES; do
      n="$("${g[@]}" diff --no-color origin/main..."$ref" -- "$f" 2>/dev/null | awk 'FNR==NR{seen[$0]=1;next} /^\+\+\+/{next} /^\+/{l=substr($0,2); if(l ~ /[^[:space:]]/ && !(l in seen)) c++} END{print c+0}' "$T/main.$f" -)"
      [ "$n" -gt 0 ] && { printf '%s\t%s\t%s\n' "$ref" "$f" "$n"; tot=$((tot+n)); }
    done
  done < <("${g[@]}" for-each-ref refs/remotes/origin --format='%(refname:short)' | sort)
  rm -rf "$T"
  echo "TOTAL: $tot line(s) of HANDOFF.md / CLAUDE.md / RUN-LOG.md exist only on $refs ref(s) that are not ancestors of origin/main ($skipped not checked)"
}

selftest(){
  local T pass=0 fail=0 out
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  ck(){ if eval "$2"; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1"; fail=$((fail+1)); fi; }
  ( cd "$T" && git init -q o && cd o && git config user.email a@b.c && git config user.name t && printf 'base\n' > HANDOFF.md && git add . && git commit -qm base \
    && git checkout -qb merged && printf 'base\nmerged line\n' > HANDOFF.md && git commit -qam m && git checkout -q master && git merge -q --ff-only merged \
    && git checkout -qb side && printf 'base\nmerged line\nDO NOT DROP THE FLOOR EITHER\n' > HANDOFF.md && git commit -qam s \
    && git checkout -qb ported master && printf 'base\nmerged line\n' > HANDOFF.md && git checkout -q master ) >/dev/null 2>&1
  git clone -q "$T/o" "$T/c" >/dev/null 2>&1; git -C "$T/c" branch -q -r >/dev/null
  git -C "$T/c" update-ref refs/remotes/origin/main refs/remotes/origin/master
  out="$(sweep "$T/c")"
  ck "B1 a branch-only guidance line is counted on its ref" 'grep -q "^origin/side	HANDOFF.md	1$" <<<"$out"'
  ck "B2 a ref that is an ancestor of main reports nothing (the negative control)" '! grep -q "^origin/merged" <<<"$out"'
  ck "B3 the total names the one line and the one ref" 'grep -q "^TOTAL: 1 line(s) .* only on 1 ref(s)" <<<"$out"'
  git -C "$T/c" fetch -q --depth 1 origin 2>/dev/null; git clone -q --depth 1 "file://$T/o" "$T/s" >/dev/null 2>&1
  ck "B4 a shallow clone is refused (exit 2), never read as clean" '! sweep "$T/s" >/dev/null 2>&1 && [ "$(sweep "$T/s" >/dev/null 2>&1; echo $?)" = 2 ]'
  echo "branch-only-guidance selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}
ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in --selftest) selftest; exit $? ;; "") sweep "$ROOTD"; exit $? ;; *) sweep "$1"; exit $? ;; esac
