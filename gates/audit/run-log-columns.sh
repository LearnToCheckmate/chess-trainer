#!/usr/bin/env bash
# gates/audit/run-log-columns.sh - DO RUN-LOG.md's ROWS FROM #545 ON CARRY THE COLUMNS ITS HEADER DECLARES?
#
# WHY THIS EXISTS [#545, item (73); jobs/the-run-log-header-declares-nine-columns-and-the-rows-have-two-2026-10-09].
# The header (Supervisor ruling B, 2026-09-12) declares nine columns - build, what, ETA stated, started, staged,
# actual, delta, gates, live - and for dozens of builds every row had two, so the ETA pair was no longer readable
# down a column. #545 took the job's decision (b), the one consistent with ruling B: rows from #545 on use the
# declared columns again; the historical two-column rows are left exactly as written (the file is a record).
# This holds the decision mechanically, so it cannot drift back unnoticed.
# ASSERTS: R0 the header row is found and its width read; R1 every row whose build number is >= 545 has exactly
# that many cells. Rows below #545 are counted and not judged.
# USAGE  bash gates/audit/run-log-columns.sh [file]   exit 0 holds | 1 a row from #545 on has the wrong width | 2 no header
#        bash gates/audit/run-log-columns.sh --selftest
set -uo pipefail
FROM=545
check(){ awk -F'|' -v from="$FROM" '
  /^\| build \|/ && !w { w=NF-2; next }
  /^\| *#[0-9]+[a-z]? *\|/ { n=$2; gsub(/[^0-9]/,"",n); if (n+0>=from) { judged++; if (NF-2!=w) bad=bad " " $2 "(" NF-2 " cells)" } else old++ }
  END { if (!w) { print "NOT CHECKED: no header row \"| build |\" found"; exit 2 }
        printf "run-log columns: header %d, %d row(s) from #%d judged, %d older row(s) not judged\n", w, judged, from, old
        if (bad!="") { print "  FAIL rows with the wrong width:" bad; exit 1 }
        print "  OK every judged row has the header width"; exit 0 }' "$1"; }
selftest(){ local T pass=0 fail=0 rc; T="$(mktemp -d 2>/dev/null)" || return 2
  ck(){ check "$T/r.md" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; fail=$((fail+1)); fi; }
  H='| build | what | ETA stated (at) | started | staged for his click | actual | delta | gates | live (his commit) |'
  printf '%s\n|---|\n| #544 | two cells |\n| #545 | a | b | c | d | e | f | g | h |\n' "$H" > "$T/r.md"; ck "S0 an old two-cell row is not judged and a nine-cell #545 row holds" 0
  printf '%s\n|---|\n| #546 | two cells |\n' "$H" > "$T/r.md"; ck "S1 a two-cell row from #545 on is refused" 1
  printf '| x |\n| #546 | a |\n' > "$T/r.md"; ck "S2 no header is exit 2, not a pass" 2
  rm -rf "$T"; echo "run-log-columns selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]; }
case "${1:-}" in --selftest) selftest; exit $? ;; "") check "$(cd "$(dirname "$0")/../.." && pwd)/RUN-LOG.md"; exit $? ;; *) check "$1"; exit $? ;; esac
