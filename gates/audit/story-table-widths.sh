#!/usr/bin/env bash
# gates/audit/story-table-widths.sh - DOES EVERY TABLE ROW UNDER claude/stories/ HAVE ITS OWN HEADER'S WIDTH?
#
# WHY THIS EXISTS [#549, item (93); jobs/tc-mn-018-in-the-menu-lane-register-has-four-cells-against-a-five-cell-header-2026-10-30].
# claude/stories/MENU-LANE-2026-09-15.md's TC-MN-018 row had 4 cells under a 5-cell header on main 29b60c2, and nothing
# could see it: the row-width check in `gates/verify-log.sh --citations` arm (5) reads USER-STORIES.md and TEST-CASES.md
# only. #547 (be8d86a) fixed the row and wrote in arm (5) why that arm is not widened - the lane documents' tables each
# carry their own header, which the arm's register-shaped awk cannot read, and widening the one script that decides
# whether a log authorises a push is the self-reference trap CLAUDE.md records. The job's close condition still asks
# for "the check that says so" to read those files. This is that check, kept OUT of verify-log.sh for arm (5)'s reason.
#
# WHAT A TABLE IS HERE: a line opening with `|` directly followed by a separator line (`|---`, `| :-- |` ...). Every
# following line that opens with `|` is a row of it, up to the first line that does not. Cells are counted the way a
# GFM renderer splits them: one optional leading and one optional trailing `|` are dropped, then the line splits on
# every UNESCAPED `|` (an escaped `\|` is part of a cell; a pipe inside backticks is NOT escaped by them - GFM still
# splits on it, which is exactly the failure this catches).
# WHAT IT ASSERTS:
#   W0 at least one table was found across the files read (an empty denominator is reported, never credited)
#   W1 every row has exactly its header's cell count
# Files with no table are listed by name, not judged.
# USAGE  bash gates/audit/story-table-widths.sh [file.md ...]   default: every claude/stories/*.md
#        exit 0 holds | 1 a row has the wrong width | 2 nothing readable, or no table found at all
#        bash gates/audit/story-table-widths.sh --selftest
set -uo pipefail
check(){ local f rc=0 any=0
  [ "$#" -gt 0 ] || { echo "NOT CHECKED: no files given"; return 2; }
  for f in "$@"; do [ -r "$f" ] || { echo "NOT CHECKED: cannot read $f"; return 2; }; done
  awk '
    function cells(s,   t){ t=s; gsub(/\\\|/,"",t); sub(/^[ \t]*\|/,"",t); sub(/\|[ \t]*$/,"",t); return gsub(/\|/,"|",t)+1 }
    FNR==1 { if (prev!="") fin(); prev=FILENAME; intab=0; ptxt=""; tabs=0; rows=0 }
    function fin(){ if (tabs) printf "  %s: %d table(s), %d row(s)\n", prev, tabs, rows; else printf "  %s: no table, not judged\n", prev }
    {
      sep = ($0 ~ /^[ \t]*\|[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/)
      if (sep && ptxt ~ /^[ \t]*\|/ && !intab) { intab=1; hw=cells(ptxt); hl=FNR-1; tabs++; T++; ptxt=$0; next }
      if (intab && $0 ~ /^[ \t]*\|/) { rows++; R++; k=cells($0); if (k!=hw) { B++; printf "  FAIL %s:%d has %d cell(s) against a header of %d (header at :%d)\n", FILENAME, FNR, k, hw, hl } }
      else intab=0
      ptxt=$0
    }
    END { if (prev!="") fin()
          if (!T) { print "NOT CHECKED: no table found in any file read"; exit 2 }
          printf "story-table-widths: %d table(s), %d row(s), %d wrong-width row(s)\n", T, R, B+0
          exit (B>0) }' "$@"; }
selftest(){ local T pass=0 fail=0 rc; T="$(mktemp -d 2>/dev/null)" || return 2
  ck(){ check "$T/r.md" >"$T/out" 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; sed 's/^/       /' "$T/out"; fail=$((fail+1)); fi; }
  H='| id | case | expected | measured | result |'
  printf '%s\n|---|---|---|---|---|\n| TC-A | a | b | c | d |\n' "$H" > "$T/r.md"; ck "S0 a five-cell row under a five-cell header holds" 0
  printf '%s\n|---|---|---|---|---|\n| TC-MN-018 | a | b | c |\n' "$H" > "$T/r.md"; ck "S1 the TC-MN-018 shape, four cells under five, is refused" 1
  printf '%s\n|---|---|---|---|---|\n| TC-A | a \\| x | b | c | d |\n' "$H" > "$T/r.md"; ck "S2 an escaped pipe is part of a cell" 0
  printf '%s\n|---|---|---|---|---|\n| TC-A | `a|x` | b | c | d |\n' "$H" > "$T/r.md"; ck "S3 a pipe inside backticks still splits, so the row is refused" 1
  printf '%s\n|---|---|---|---|---|\nTC-A | a | b | c | d\n' "$H" > "$T/r.md"; ck "S4 a line not opening with a pipe ends the table and is not judged" 0
  printf '%s\n| :-- | --- | --: | :-: | --- |\n| TC-A | a | b | c | d\n' "$H" > "$T/r.md"; ck "S5 aligned separator read, and a row with no trailing pipe counts the same" 0
  printf '%s\n|---|---|---|---|---|\n| TC-A | a | b | c | d |\n\n| x | y |\n|---|---|\n| 1 | 2 | 3 |\n' "$H" > "$T/r.md"; ck "S6 a second table is judged against ITS OWN header" 1
  printf 'prose only | with a pipe\n' > "$T/r.md"; ck "S7 no table at all is exit 2, not a pass" 2
  check "$T/absent.md" >/dev/null 2>&1; rc=$?; if [ "$rc" = 2 ]; then echo "  ok   S8 an unreadable file is exit 2"; pass=$((pass+1)); else echo "  FAIL S8 (exit $rc, wanted 2)"; fail=$((fail+1)); fi
  rm -rf "$T"; echo "story-table-widths selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]; }
case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") D="$(cd "$(dirname "$0")/../.." && pwd)/claude/stories"; shopt -s nullglob; F=("$D"/*.md); check "${F[@]}"; exit $? ;;
  *) check "$@"; exit $? ;;
esac
