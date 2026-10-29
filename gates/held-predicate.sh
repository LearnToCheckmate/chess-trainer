#!/usr/bin/env bash
# gates/held-predicate.sh - THE HELD REGISTER'S 8TH FIELD: A PREDICATE OVER A TREE, NOT A HASH OF AN ARTEFACT.
#
# WHY [#545, item (47); jobs/a-held-row-should-carry-a-predicate-not-only-a-hash-2026-10-01]. Every key on a
# gates/held-trees.tsv row is a hash of an artefact: the bundle md5 dies on any rebuild (the stamp is in the bundle),
# the gated sha dies on a rebase or a cherry-pick, and the source md5 is an exact blob that dies on one unrelated
# character. So no key tracks the DEFECT, and the guard's reach silently shrinks the moment a held tree is carried
# forward with an edit on top. #441's defect was two one-line facts about a tree - chess.jsx lacked `_selL`, and
# gates/regress/67-sel-cls-consumers.js was absent - and a row could not say so. Field 8 can.
#
# THE VOCABULARY IS FIXED AND NOTHING IS EVALUATED AS SHELL, which is the design care the job asks for: a string out of
# a committed register is never executed. A predicate is one or more CLAUSES joined by ';', and the row holds a tree
# when EVERY clause is true of it:
#   absent:<path>            the path does not exist in the tree
#   lacks:<path>:<text>      the path is absent, or contains <text> zero times (fixed string, not a regex)
#   contains:<path>:<text>   the path exists and contains <text> at least once
# <path> is repo-relative (no leading '/', no '..'). <text> runs to the end of the clause and may contain ':'.
# A PREDICATE THAT CANNOT BE EVALUATED FAILS LOUD, NEVER CLEAR - the fail-open shape #450's antagonist vetoed: an
# unknown verb, an empty path or text, a path with '..', or a revision git cannot resolve is exit 2, which every
# caller treats as "not a clearance".
#   held-predicate.sh eval <repo> <rev|DISK> '<predicate>'   0 = TRUE (held), 1 = FALSE, 2 = cannot evaluate
#   held-predicate.sh valid '<predicate>'                    0 = well formed, 2 = malformed (for `held.sh add`)
#   held-predicate.sh --selftest
set -uo pipefail

pred_parse(){ # <predicate>  -> one "verb<TAB>path<TAB>text" line per clause; exit 2 if any clause is malformed
  local p="$1" c verb rest path text
  [ -n "$p" ] && [ "$p" != "-" ] || return 2
  local IFS=';'; local -a CL; read -ra CL <<<"$p"; unset IFS
  [ "${#CL[@]}" -gt 0 ] || return 2
  for c in "${CL[@]}"; do
    c="${c#"${c%%[![:space:]]*}"}"; c="${c%"${c##*[![:space:]]}"}"
    [ -n "$c" ] || return 2
    verb="${c%%:*}"; rest="${c#*:}"; [ "$rest" != "$c" ] || return 2
    case "$verb" in
      absent) path="$rest"; text="" ;;
      lacks|contains) path="${rest%%:*}"; text="${rest#*:}"; { [ "$text" != "$rest" ] && [ -n "$text" ]; } || return 2 ;;
      *) return 2 ;;
    esac
    [ -n "$path" ] || return 2
    case "$path" in /*|*..*|*"	"*) return 2 ;; esac
    printf '%s\t%s\t%s\n' "$verb" "$path" "$text"
  done
}

pred_eval(){ # <repo> <rev|DISK> <predicate>
  local repo="$1" rev="$2" p="$3" parsed verb path text exists n body
  parsed="$(pred_parse "$p")" || return 2
  if [ "$rev" != DISK ]; then git -C "$repo" rev-parse --verify -q "$rev^{commit}" >/dev/null 2>&1 || return 2; fi
  while IFS=$'\t' read -r verb path text; do
    if [ "$rev" = DISK ]; then if [ -e "$repo/$path" ]; then exists=1; else exists=0; fi
    else if git -C "$repo" cat-file -e "$rev:$path" 2>/dev/null; then exists=1; else exists=0; fi; fi
    case "$verb" in
      absent) [ "$exists" = 0 ] || return 1 ;;
      lacks|contains)
        n=0
        if [ "$exists" = 1 ]; then
          if [ "$rev" = DISK ]; then body="$(cat -- "$repo/$path" 2>/dev/null)" || return 2
          else body="$(git -C "$repo" show "$rev:$path" 2>/dev/null)" || return 2; fi
          n="$(grep -cF -- "$text" <<<"$body" || true)"; n="${n:-0}"
        fi
        if [ "$verb" = lacks ]; then [ "$n" -eq 0 ] || return 1; else [ "$n" -gt 0 ] || return 1; fi ;;
    esac
  done <<<"$parsed"
  return 0
}

selftest(){
  local T pass=0 fail=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  ck(){ pred_eval "$T/r" "$2" "$3" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$4" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $4)"; fail=$((fail+1)); fi; }
  ( mkdir -p "$T/r/gates/regress" && cd "$T/r" && git init -q && git config user.email a@b.c && git config user.name t \
    && printf 'const a=1;\n' > chess.jsx && git add . && git commit -qm held \
    && printf 'const a=1;\nconst _selL=2;\n' > chess.jsx && printf 'x\n' > gates/regress/67-sel-cls-consumers.js && git add . && git commit -qm fixed ) >/dev/null 2>&1
  local HELD FIXED P="lacks:chess.jsx:_selL;absent:gates/regress/67-sel-cls-consumers.js"
  HELD="$(git -C "$T/r" rev-parse HEAD~1)"; FIXED="$(git -C "$T/r" rev-parse HEAD)"
  ck "P1 #441's two-clause predicate is TRUE at the held tree (exit 0 = held)" "$HELD" "$P" 0
  ck "P2 and FALSE at the tree that carries the fix and the gate (exit 1)" "$FIXED" "$P" 1
  ( cd "$T/r" && git checkout -q "$HELD" && printf 'const a=1;\n// an unrelated carry-forward edit\n' > chess.jsx && git commit -qam carried ) >/dev/null 2>&1
  ck "P3 a carry-forward with an unrelated edit is STILL held - the case every hash key misses" "$(git -C "$T/r" rev-parse HEAD)" "$P" 0
  ck "P4 DISK is evaluated from the working tree" DISK "$P" 0
  ck "P5 contains: is true when the text is present" "$FIXED" "contains:chess.jsx:_selL" 0
  ck "P6 an unknown verb is exit 2, never a clearance" "$FIXED" "rm:-rf" 2
  ck "P7 a path with '..' is exit 2" "$FIXED" "absent:../etc/passwd" 2
  ck "P8 lacks with no text is exit 2" "$FIXED" "lacks:chess.jsx" 2
  ck "P9 an unresolvable revision is exit 2" "deadbeefdeadbeef" "absent:x" 2
  ck "P10 an empty clause between ';' is exit 2" "$FIXED" "absent:x;;absent:y" 2
  ck "P11 a shell metacharacter in text is a fixed string, not code" "$FIXED" 'lacks:chess.jsx:$(touch PWNED)' 0
  if [ -e "$T/r/PWNED" ] || [ -e "$PWD/PWNED" ]; then echo "  FAIL P11b the text was executed"; fail=$((fail+1)); else echo "  ok   P11b nothing was executed"; pass=$((pass+1)); fi
  # THE WIRING, not only the evaluator: held.sh check must read field 8 and refuse on it. A register row whose
  # three hash keys match nothing, in a repo laid out like this one, at the held tree and at the fixed tree.
  local HS; HS="$(cd "$(dirname "$0")" && pwd)"
  wk(){ local name="$1" want="$2" pred="$3"; ( cd "$T/r" && mkdir -p gates && cp "$HS/held.sh" "$HS/held-predicate.sh" gates/ \
        && printf 'bundle\n' > app.js \
        && printf 'ffffffffffff\t%s\t#999\t2026-10-29T17:00Z\tbuild__PREDFIXTURE\ta predicate-only fixture hold whose hash keys match nothing on purpose\t-\t%s\n' \
             0000000000000000000000000000000000000999 "$pred" > gates/held-trees.tsv \
        && bash gates/held.sh check >/dev/null 2>&1 ); rc=$?
        if [ "$rc" = "$want" ]; then echo "  ok   $name"; pass=$((pass+1)); else echo "  FAIL $name (exit $rc, wanted $want)"; fail=$((fail+1)); fi; }
  git -C "$T/r" checkout -q "$HELD" 2>/dev/null; git -C "$T/r" checkout -q -- . 2>/dev/null
  wk "W0 the control: the SAME fixture row with no predicate clears the held tree (so W1 is field 8's doing)" 0 "-"
  wk "W1 held.sh check REFUSES (exit 1) on the held tree by its field-8 predicate alone" 1 "$P"
  git -C "$T/r" checkout -q "$FIXED" 2>/dev/null
  wk "W2 and clears (exit 0) at the tree that carries the fix" 0 "$P"
  wk "W3 a malformed field-8 predicate is exit 2, never a clearance" 2 "rm:-rf"
  echo "held-predicate selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in
  eval) pred_eval "${2:-}" "${3:-}" "${4:-}"; exit $? ;;
  valid) pred_parse "${2:-}" >/dev/null; exit $? ;;
  --selftest) selftest; exit $? ;;
  *) echo "usage: $0 eval <repo> <rev|DISK> '<predicate>' | valid '<predicate>' | --selftest"; exit 2 ;;
esac
