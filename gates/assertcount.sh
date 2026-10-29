#!/usr/bin/env bash
# gates/assertcount.sh - WRITE gates/assertion-counts.tsv, the per-gate assertion pins gates.sh ratchets against.
#
# WHY [#545, item (37); jobs/a-deleted-assertion-inside-a-gate-is-invisible-in-a-green-run-2026-10-10]. gates.sh
# refuses its green line when any gate emits fewer assertions (pass + fail) than this register pins - see
# assert_falls in gates/gates.sh. This is the one door that MOVES a pin: it rewrites every row from a full log and
# writes the reason into each row that changed, so a fall reaches main only in a commit whose diff names it and says
# why. A rise needs recording too (so the next fall is measured from the new level), and costs one command.
#   record <full-log> '<why>'   rewrite the register from the log's gate sections ("=== <gate> ===", counting PASS and FAIL lines in each)
#   show                        print the register's rows
#   --selftest                  the controls, in a scratch copy
# The register's columns: label, count, the build whose log set it, the reason the row last changed.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; REG="${CT_ACREG:-$G/assertion-counts.tsv}"

record(){ # <log> <why>
  local log="$1" why="$2" bn REG="${CT_ACREG:-$REG}"
  [ -f "$log" ] || { echo "assertcount: no such log: $log"; return 2; }
  [ -n "$why" ] && [ "$why" != "-" ] || { echo "assertcount: a reason is required - the reason is the point"; return 2; }
  grep -q '^GATES GREEN \|^GATES RED \|^ASSERTION COUNT FELL' "$log" || { echo "assertcount: $log is not a full-suite log (no verdict line)"; return 2; }
  bn="$(grep -m1 -oE '^gates.sh #[0-9]+[a-z]?' "$log" | sed 's/^gates.sh //')"; bn="${bn:-unknown}"
  local tmp; tmp="$(mktemp)" || return 2
  {
    echo "# gates/assertion-counts.tsv - the per-gate assertion pins. gates.sh's assert_falls refuses GATES GREEN when a"
    echo "# gate emits FEWER (pass + fail) than its row. Written ONLY by gates/assertcount.sh record; a fall reaches main"
    echo "# in a commit whose diff shows the old and new number and the reason. Columns: label, count, set by, why."
    awk -F'\t' -v why="$why" -v bn="$bn" '
      FILENAME==ARGV[1]{ if($0 ~ /^[[:space:]]*#/ || NF<2) next; old[$1]=$2; oldbn[$1]=$3; oldwhy[$1]=$4; next }
      /^=== [^ ]+ ===/{ sec=$0; sub(/^=== /,"",sec); sub(/ ===.*/,"",sec); if(!(sec in got)){ got[sec]=0; ord[++no]=sec }; next }
      sec!="" && /^(PASS|FAIL) /{ got[sec]++ }
      END{ for(i=1;i<=no;i++){ k=ord[i]; n=got[k]
          if((k in old) && old[k]+0==n) printf "%s\t%d\t%s\t%s\n",k,n,oldbn[k],oldwhy[k]
          else printf "%s\t%d\t%s\t%s\n",k,n,bn,((k in old)?"was "old[k]": ":"new: ")why } }
    ' "$( [ -f "$REG" ] && echo "$REG" || echo /dev/null )" "$log" | sort
  } > "$tmp"
  [ "$(grep -vc '^#' "$tmp")" -gt 0 ] || { rm -f "$tmp"; echo "assertcount: $log carries no per-gate summary lines - nothing recorded"; return 2; }
  mv "$tmp" "$REG"; echo "assertcount: recorded $(grep -vc '^#' "$REG") gate(s) from $log into $REG"
}

selftest(){
  local T pass=0 fail=0 out
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  ck(){ if [ "$2" = "$3" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (got [$2] want [$3])"; fail=$((fail+1)); fi; }
  printf 'gates.sh #900  bundle x\n=== ALPHA ===\nPASS 1\nPASS 2\nPASS 3\nPASS 4\nPASS 5\n=== BETA ===\nPASS 1\nPASS 2\nFAIL 3\nGATES GREEN #900\n' > "$T/a.log"
  CT_ACREG="$T/r.tsv" record "$T/a.log" "seed" >/dev/null; ck "R1 a first record writes one row per gate" "$(grep -vc '^#' "$T/r.tsv")" 2
  ck "R2 the row carries count, build and reason" "$(grep '^BETA' "$T/r.tsv")" "$(printf 'BETA\t3\t#900\tnew: seed')"
  printf 'gates.sh #901  bundle x\n=== ALPHA ===\nPASS 1\nPASS 2\nPASS 3\nPASS 4\nPASS 5\n=== BETA ===\nPASS 1\nGATES RED #901\n' > "$T/b.log"
  CT_ACREG="$T/r.tsv" record "$T/b.log" "B lost two on purpose" >/dev/null
  ck "R3 an unchanged row keeps its old build and reason" "$(grep '^ALPHA' "$T/r.tsv")" "$(printf 'ALPHA\t5\t#900\tnew: seed')"
  ck "R4 a changed row names the old number and the new reason" "$(grep '^BETA' "$T/r.tsv")" "$(printf 'BETA\t1\t#901\twas 3: B lost two on purpose')"
  CT_ACREG="$T/r.tsv" record "$T/b.log" "" >/dev/null 2>&1; ck "R5 no reason, no record (exit 2)" "$?" 2
  printf '=== ALPHA ===\nPASS 1\n' > "$T/c.log"
  CT_ACREG="$T/r.tsv" record "$T/c.log" "x" >/dev/null 2>&1; ck "R6 a log with no verdict line is refused (a subset or a fragment)" "$?" 2
  echo "assertcount selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in
  record) shift; record "${1:-}" "${2:-}"; exit $? ;;
  show) grep -v '^#' "$REG"; exit $? ;;
  --selftest) selftest; exit $? ;;
  *) echo "usage: $0 record <full-log> '<why>' | show | --selftest"; exit 2 ;;
esac
