#!/usr/bin/env bash
# gates/push-run-branch.sh - PUSH HEAD TO ONE BRANCH ONLY WHEN THE DOOR CHECKS SAY OK, EXACTLY [#553 seat B1;
# jobs/cited-not-run-report-refused-once-while-gates-ran-in-the-same-checkout-2026-11-14 clause (3); the orchestrator's q24
# ruling, run-answers orchestrator-B14-Q24-RULING-2026-11-24, option B: the guard lives in the repository].
#
# WHY. On 14 Nov a push command grepped the door's output for the door's own words and matched the REFUSED line, so a tree
# the door had refused was pushed. Since then the lead's push line has matched ^DOOR CHECKS OK - (n) of \1$, but that line
# lived in no file. This is that line as a tool, so a push cannot be made on a door that did not say OK in full.
#
# USAGE   bash gates/push-run-branch.sh <branch>     runs `bash gates/records-gate.sh --checks`, then, only if
#                                                    (1) it exits 0, and (2) its LAST output line is exactly
#                                                    `DOOR CHECKS OK - <n> of <n>` with the same n twice,
#                                                    runs `git push origin HEAD:<branch>` - nothing else: no force, no
#                                                    other ref, no other remote.
#         bash gates/push-run-branch.sh --selftest   its controls, against a stub door and a stub git (nothing is pushed)
# EXIT    0 pushed | 1 the door did not say OK (refused, nothing pushed) | 2 usage or a bad branch name | else git's own
#         exit code from the push.
#
# WHAT IT DOES NOT DO: it does not fetch, rebase or check that main has not moved (CLAUDE.md: fetch and rebase before any
# push - still the caller's step), it does not run the suite, and an OK door is not GATES GREEN.
set -u
G="$(cd "$(dirname "$0")" && pwd)"

# door_ok <output-file> <exit-code>: 0 only for exit 0 and a last line `DOOR CHECKS OK - n of n`; prints why otherwise.
door_ok() {
  local out="$1" rc="$2" last n m
  if [ "$rc" != 0 ]; then echo "push-run-branch: REFUSED - the door checks exited $rc"; return 1; fi
  last="$(tail -n 1 "$out")"
  if [[ "$last" =~ ^DOOR\ CHECKS\ OK\ -\ ([0-9]+)\ of\ ([0-9]+)$ ]]; then
    n="${BASH_REMATCH[1]}"; m="${BASH_REMATCH[2]}"
    if [ "$n" = "$m" ]; then return 0; fi
    echo "push-run-branch: REFUSED - the last line says $n of $m, not all of them: '$last'"; return 1
  fi
  if grep -q 'DOOR CHECKS' "$out"; then
    echo "push-run-branch: REFUSED - the last line is not 'DOOR CHECKS OK - n of n': '$last' (the door's line: '$(grep 'DOOR CHECKS' "$out" | tail -1)')"
  else
    echo "push-run-branch: REFUSED - the door printed no DOOR CHECKS line at all; last line: '$last'"
  fi
  return 1
}

# branch_ok <name>: a plain branch name; refuses an option, a refspec, a force marker or an empty name.
branch_ok() {
  local b="$1"
  case "$b" in ''|-*|*:*|+*|*' '*|refs/*|HEAD) echo "push-run-branch: REFUSED - '$b' is not a plain branch name"; return 2;; esac
  git check-ref-format --branch "$b" >/dev/null 2>&1 || { echo "push-run-branch: REFUSED - '$b' is not a valid branch name"; return 2; }
  return 0
}

# run <branch> <door-command> <git-command>: the whole path; the real CLI passes the real door and git, the selftest stubs.
run() {
  local b="$1" door="$2" gitc="$3" out rc
  branch_ok "$b" || return 2
  out="$(mktemp)"
  bash -c "$door" > "$out" 2>&1; rc=$?
  tail -n 3 "$out"
  if ! door_ok "$out" "$rc"; then rm -f "$out"; echo "push-run-branch: nothing pushed"; return 1; fi
  rm -f "$out"
  echo "push-run-branch: door OK - git push origin HEAD:$b"
  "$gitc" push origin "HEAD:$b"
}

selftest() {
  local T bad=0; T="$(mktemp -d)"
  ck() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got [$2] want [$3]"; bad=1; fi; }
  printf '#!/usr/bin/env bash\necho "$*" >> "%s/git.args"\n' "$T" > "$T/git"; chmod +x "$T/git"
  door() { printf '%s\n' "$@" > "$T/door.out"; echo "cat '$T/door.out'"; }
  try() {  # try <name> <want-rc> <want-pushed 0|1> <door-command>
    rm -f "$T/git.args"; run main "$4" "$T/git" > "$T/run.out" 2>&1; local rc=$?
    ck "$1-exit" "$rc" "$2"
    ck "$1-pushed" "$([ -s "$T/git.args" ] && echo 1 || echo 0)" "$3"
  }
  try P1-an-exact-ok-last-line-pushes 0 1 "$(door 'door checks: x exit 0' 'DOOR CHECKS OK - 12 of 12')"
  ck P1-and-pushes-exactly-HEAD-to-the-named-branch "$(cat "$T/git.args" 2>/dev/null)" "push origin HEAD:main"
  try P2-a-different-count-is-refused 1 0 "$(door 'door checks: x exit 0' 'DOOR CHECKS OK - 11 of 12')"
  try P3-a-missing-door-line-is-refused 1 0 "$(door 'door checks: x exit 0' 'door checks: y exit 0')"
  try P4-an-ok-line-that-is-not-the-last-is-refused 1 0 "$(door 'DOOR CHECKS OK - 12 of 12' 'door checks: late line')"
  try P5-the-refused-line-is-refused 1 0 "$(door 'DOOR CHECKS REFUSED - cited-not-run-report: exit 1, 51 fail (209 pass, 68s)')"
  try P6-an-ok-last-line-with-a-nonzero-exit-is-refused 1 0 "$(door 'DOOR CHECKS OK - 12 of 12'; echo "cat '$T/door.out'; exit 1")"
  try P7-trailing-text-after-the-ok-line-is-refused 1 0 "$(door 'DOOR CHECKS OK - 12 of 12 (stale)')"
  local b; for b in -f +main a:b refs/heads/main HEAD ''; do
    rm -f "$T/git.args"; run "$b" "$(door 'DOOR CHECKS OK - 1 of 1')" "$T/git" > /dev/null 2>&1
    ck "P8-a-non-plain-branch-is-refused-[$b]" "$?:$([ -s "$T/git.args" ] && echo pushed || echo none)" "2:none"
  done
  rm -rf "$T"
  if [ $bad -eq 0 ]; then echo "push-run-branch selftest: OK"; else echo "push-run-branch selftest: FAILED"; fi
  return $bad
}

case "${1:-}" in
  --selftest) selftest; exit $?;;
  ''|-h|--help) sed -n '9,18p' "$0"; exit 2;;
esac
[ $# -eq 1 ] || { echo "push-run-branch: one argument, the branch" >&2; exit 2; }
cd "$(dirname "$G")" || exit 2
run "$1" "bash '$G/records-gate.sh' --checks" git
