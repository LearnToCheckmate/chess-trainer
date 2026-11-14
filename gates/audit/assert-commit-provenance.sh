#!/usr/bin/env bash
# gates/audit/assert-commit-provenance.sh <signed|trailer|both> [base [head]]  -> CLAUSES CLAUDE.md#commit-signed AND
# CLAUDE.md#commit-trailer AS RUNNABLE PREDICATES. The first assert of gates/contract-asserts.tsv.
#
# WHY [#550 test-system helper A; jobs/entry-three-contracts-become-runnable-asserts-2026-10-10 theFIX (3), "add a required
# assert key written as a runnable predicate, implemented as one script per artefact under gates/audit/"]. CLAUDE.md states two
# rules about every commit, and until now nothing checked either:
#   commit-trailer  "every commit you make carries the trailer" (Claude-Session), the rule widened at #546 item (29) after 516
#                   commits on main were found with none and no session could be recovered for them.
#   commit-signed   "COMMITS ARE SIGNED HERE ... AND NO RUN PASSES commit.gpgsign=false" (#546 item (85)), with its own
#                   instrument: `git cat-file commit <sha> | sed -n '1,/^$/p' | grep -c '^gpgsig'` is 1 on a signed commit
#                   and 0 on an unsigned one, because `git log --format=%G?` prints N for every commit in this container.
# THE ARTEFACT IS THE RANGE A PUSH WOULD CARRY: base..head, base defaulting to `git merge-base origin/main HEAD` and head to
# HEAD. History already on main is out of scope by construction - its 516 trailerless commits are the record
# claude/agents/PROVENANCE-486.md maps, and no later run can repair them.
# EXIT 0 every commit in the range holds | 1 one does not (each named) | 2 could not run: the base or head does not resolve
# (a shallow clone without the base answers 2, never a clean range), or an unknown mode. An EMPTY range is exit 0 and says so:
# HEAD already on main carries nothing to judge, which gates/gates.sh's records_door treats the same way.
# The count line: "commit-provenance <mode>: <held> pass / <broken> fail (<n> commit(s) in <base12>..<head12>)".
set -uo pipefail
mode="${1:-}"
case "$mode" in signed|trailer|both) ;; --selftest) ;; *) echo "usage: $0 <signed|trailer|both> [base [head]] | --selftest"; exit 2 ;; esac

check(){ # check <mode> <base> <head>   run inside the repository
  local m="$1" base head c sig tr p=0 f=0 n=0
  head="$(git rev-parse --quiet --verify "${3}^{commit}" 2>/dev/null)" || { echo "COMMIT PROVENANCE COULD NOT RUN - head '$3' does not resolve"; return 2; }
  base="$(git rev-parse --quiet --verify "${2}^{commit}" 2>/dev/null)" || { echo "COMMIT PROVENANCE COULD NOT RUN - base '$2' does not resolve (a shallow clone? run git fetch --unshallow)"; return 2; }
  local list; list="$(git rev-list "$base..$head" 2>/dev/null)" || { echo "COMMIT PROVENANCE COULD NOT RUN - git rev-list $base..$head failed"; return 2; }
  for c in $list; do n=$((n+1))
    sig="$(git cat-file commit "$c" | sed -n '1,/^$/p' | grep -c '^gpgsig')"
    tr="$(git log -1 --format='%(trailers:key=Claude-Session,valueonly)' "$c" | grep -c .)"
    if [ "$m" != trailer ]; then if [ "$sig" = 1 ]; then p=$((p+1)); else f=$((f+1)); echo "commit-provenance: UNSIGNED $(git log -1 --format='%h %s' "$c" | cut -c1-100)"; fi; fi
    if [ "$m" != signed ];  then if [ "$tr" -ge 1 ]; then p=$((p+1)); else f=$((f+1)); echo "commit-provenance: NO Claude-Session TRAILER $(git log -1 --format='%h %s' "$c" | cut -c1-100)"; fi; fi
  done
  echo "commit-provenance $m: $p pass / $f fail ($n commit(s) in ${base:0:12}..${head:0:12}$([ "$n" = 0 ] && echo ', an empty range: nothing to judge'))"
  [ "$f" -eq 0 ]
}

selftest(){
  local T ok=0 bad=0; T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  for v in GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR; do unset "$v"; done
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok   $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  # A scratch repository with a fake signature: a commit object written by hand with a gpgsig header is what the predicate reads,
  # so no key is needed and nothing here signs or unsigns anything in the real repository.
  # Every object is written with hash-object, so no `git commit` runs and no signing setting is touched, here or anywhere.
  git -C "$T" init -q -b main >/dev/null 2>&1 || { echo "selftest: no scratch repo"; return 2; }
  local TREE; TREE="$(git -C "$T" mktree </dev/null)"
  mkc(){ # mkc <parent or -> <signed 0|1> <trailer 0|1> -> sha of a new commit object on <parent>
    { echo "tree $TREE"; [ "$1" != - ] && echo "parent $1"; echo "author t <t@t> 1700000000 +0000"; echo "committer t <t@t> 1700000000 +0000"
      [ "$2" = 1 ] && printf 'gpgsig -----BEGIN SSH SIGNATURE-----\n U1NIU0lHZmFrZQ==\n -----END SSH SIGNATURE-----\n'
      echo; echo "fixture"; [ "$3" = 1 ] && { echo; echo "Claude-Session: https://claude.ai/code/session_fixture"; }; } | git -C "$T" hash-object -t commit -w --stdin; }
  local B G1 G2 U N
  B="$(mkc - 1 1)"; G1="$(mkc "$B" 1 1)"; G2="$(mkc "$G1" 1 1)"; U="$(mkc "$G2" 0 1)"; N="$(mkc "$G2" 1 0)"
  rr(){ ( cd "$T" && check "$1" "$2" "$3" ) > "$T/last" 2>&1; echo $?; }
  chk "P1 two signed, trailered commits: both modes 0" "0 0" "$(rr signed "$B" "$G2") $(rr trailer "$B" "$G2")"
  chk "P1b and the count line reads 4 pass / 0 fail in both mode" 1 "$(rr both "$B" "$G2" >/dev/null; grep -c '^commit-provenance both: 4 pass / 0 fail (2 commit' "$T/last")"
  chk "P2 an UNSIGNED commit in the range refuses (signed mode): 1" 1 "$(rr signed "$B" "$U")"
  chk "P2b and names it" 1 "$(grep -c '^commit-provenance: UNSIGNED' "$T/last")"
  chk "P2c the trailer mode does not refuse it (the two clauses are separate predicates)" 0 "$(rr trailer "$B" "$U")"
  chk "P3 a commit with NO Claude-Session trailer refuses (trailer mode): 1" 1 "$(rr trailer "$B" "$N")"
  chk "P3b and names it" 1 "$(grep -c 'NO Claude-Session TRAILER' "$T/last")"
  chk "P4 history BEFORE base is out of scope: the unsigned commit as base, a clean commit on it, 0" 0 "$(rr signed "$U" "$(mkc "$U" 1 1)")"
  chk "P5 an empty range is 0 and says so" "0 1" "$(rr both "$G2" "$G2") $(grep -c 'an empty range' "$T/last")"
  chk "P6 a base that does not resolve: 2, never a clean range" 2 "$(rr both deadbeefdeadbeefdeadbeefdeadbeefdeadbeef "$G2")"
  chk "P7 a head that does not resolve: 2" 2 "$(rr both "$B" no-such-ref)"
  # P8 THE CHECK WITH ITS SUBJECT REMOVED: a copy whose signature test always holds passes the unsigned commit - so P2 is what
  # catches it. (The control the rule set asks for: a control set run over the tree without its subject, seen red.)
  sed 's/if \[ "\$sig" = 1 \]; then/if true; then/' "${BASH_SOURCE[0]}" > "$T/defanged.sh"
  if cmp -s "${BASH_SOURCE[0]}" "$T/defanged.sh"; then chk "P8 the defang edit applied" applied missed
  else chk "P8 control: with the signature test defanged, the unsigned commit PASSES (exit 0)" 0 "$( CT_CP_ROOT="$T" bash "$T/defanged.sh" signed "$B" "$U" >/dev/null 2>&1; echo $?)"; fi
  echo "commit-provenance selftest: $ok pass / $bad fail"; [ "$bad" -eq 0 ]
}

if [ "$mode" = --selftest ]; then selftest; exit $?; fi
ROOT="${CT_CP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"   # CT_CP_ROOT: another repository (the selftest's control)
cd "$ROOT" || exit 2
head="${3:-HEAD}"
if [ -n "${2:-}" ]; then base="$2"; else
  base="$(git merge-base origin/main "$head" 2>/dev/null)" || { echo "COMMIT PROVENANCE COULD NOT RUN - no merge-base of origin/main and $head (origin/main not fetched, or a shallow clone)"; exit 2; }
fi
check "$mode" "$base" "$head"; exit $?
