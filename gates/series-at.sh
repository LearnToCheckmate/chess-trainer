#!/usr/bin/env bash
# gates/series-at.sh - RE-RUN THE BUILD-NUMBER SERIES DOOR AGAINST THE TREE A GATE LOG GATED, AND SAY WHAT IT ANSWERS.
#
# WHY THIS EXISTS [#550 helper B; jobs/verify-log-sh-cannot-tell-whether-the-build-number-series-door-ran-so-an-older-
# green-log-still-authorises-a-push-2026-10-22]. gates/gates.sh runs the series door (the block from `GF_REG=` to the gates
# array) before any gate and prints one `build-number series:` line. gates/verify-log.sh reads an archived log with no tree
# on disk, so it cannot tell a log whose door ran from one written before the door existed - and #534 proved it should not
# try: three rounds of log-side checks were each broken by a new spelling (a reordered, a re-assembled, a footer-free log)
# and were reverted out. That job's own conclusion is the route taken here: "the series question can only be answered by
# RE-RUNNING THE DOOR AGAINST A TREE ... a tool that takes a sha, not a script that reads an archived file". So this tool
# reads exactly two lines of the log - the `gates.sh #NNN` header and the `ref: HEAD <sha> | ... | origin/main <sha>` line,
# both written by gates.sh before any gate - and no line beginning PASS, FAIL, `=== `, `gate manifest:` or GATES. It then
# builds an INDEPENDENT clone (never a worktree of the real checkout: #530's controls moved the real origin/main that way),
# checks out the gated HEAD, points that clone's origin/main at the logged base, and sources TODAY's door against it.
#
# WHAT ITS ANSWER MEANS, AND WHAT IT CANNOT SEE - stated here so a later run does not rediscover it:
#   - It is today's door applied to that tree, not a replay of what ran that day. That is the question a push asks.
#   - It uses today's gates/buildnum.sh (the authority the door delegates to), copied over the clone's, because a tree from
#     before a verb existed would otherwise refuse for a reason that is about the tool and not the tree.
#   - A log whose ref line says WORKING TREE DIRTY gated a working tree, not a commit; uncommitted register rows are not
#     reproducible from a sha, so the verdict covers the committed tree only and says so (exit stays the door's).
#   - The runId is CT_RUNID if set, else the one runId the register at HEAD gives that build number; if the register names
#     several or none, the tool refuses with exit 2 rather than choose.
#
# USAGE  bash gates/series-at.sh <gatelog> [repo]      exit 0 the door says ok | 1 the door refuses (RED) |
#        bash gates/series-at.sh --selftest              2 not answerable (no header, no ref line, a sha not in
#                                                          the repo, no runId, or the door printed no verdict)
set -uo pipefail
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
GATESH="$(cd "$(dirname "$0")" && pwd)/gates.sh"
BNSH="$(cd "$(dirname "$0")" && pwd)/buildnum.sh"

answer(){ # $1 = log, $2 = source repo
  local log="$1" src="$2" n head base runid T rc line dirty
  [ -r "$log" ] || { echo "series-at: NOT ANSWERABLE - cannot read $log"; return 2; }
  n="$(head -1 "$log" | sed -n 's/^gates\.sh \(#[0-9][0-9]*[a-z]*\) .*/\1/p')"
  [ -n "$n" ] || { echo "series-at: NOT ANSWERABLE - line 1 of $log is not a gates.sh header naming a build"; return 2; }
  line="$(grep -m1 '^ref: HEAD ' "$log" || true)"
  head="$(printf '%s' "$line" | sed -n 's/^ref: HEAD \([0-9a-f]\{40\}\) .*/\1/p')"
  base="$(printf '%s' "$line" | sed -n 's/.*| origin\/main \([0-9a-f]\{40\}\)\b.*/\1/p')"
  [ -n "$head" ] && [ -n "$base" ] || { echo "series-at: NOT ANSWERABLE - $log carries no 'ref: HEAD <sha> | ... | origin/main <sha>' line"; return 2; }
  case "$line" in *"WORKING TREE DIRTY"*) dirty=1 ;; *) dirty=0 ;; esac
  git -C "$src" cat-file -e "$head^{commit}" 2>/dev/null && git -C "$src" cat-file -e "$base^{commit}" 2>/dev/null \
    || { echo "series-at: NOT ANSWERABLE - $n gated HEAD ${head:0:12} on origin/main ${base:0:12}, and $src does not hold both commits (a shallow clone? fetch --unshallow)"; return 2; }
  if [ -n "${CT_RUNID:-}" ]; then runid="$CT_RUNID"
  else
    runid="$(git -C "$src" show "$head:gates/build-numbers.tsv" 2>/dev/null | awk -F'\t' -v k="${n#\#}" '$1==k && $7!="" && $7!="-" && $7!="unknown-run"{print $7}' | sort -u)"
    case "$(printf '%s\n' "$runid" | grep -c .)" in
      1) ;;
      0) echo "series-at: NOT ANSWERABLE - the register at ${head:0:12} names no runId for $n; set CT_RUNID"; return 2 ;;
      *) echo "series-at: NOT ANSWERABLE - the register at ${head:0:12} names several runIds for $n ($(printf '%s' "$runid" | tr '\n' ' ')); set CT_RUNID to the one that gated this log"; return 2 ;;
    esac
  fi
  T="$(mktemp -d 2>/dev/null)" || { echo "series-at: NOT ANSWERABLE - no scratch directory"; return 2; }
  # An independent clone sharing objects (alternates), so its refs are its own and the real checkout's never move.
  if ! git clone -q --shared --no-checkout "$src" "$T/r" 2>/dev/null || ! git -C "$T/r" -c advice.detachedHead=false checkout -q "$head" 2>/dev/null \
     || ! git -C "$T/r" update-ref refs/remotes/origin/main "$base" 2>/dev/null; then
    rm -rf "$T"; echo "series-at: NOT ANSWERABLE - could not build a clone at ${head:0:12}"; return 2; fi
  mkdir -p "$T/r/gates"; cp "$BNSH" "$T/r/gates/buildnum.sh"; git -C "$T/r" update-index --assume-unchanged gates/buildnum.sh 2>/dev/null || true
  awk '/^GF_REG=/{p=1} /^gates=\("\$G\/mountcheck.js"\)/{if(p)exit} p{print}' "$GATESH" > "$T/door.sh"
  [ -s "$T/door.sh" ] || { rm -rf "$T"; echo "series-at: NOT ANSWERABLE - gates.sh carries no door block (GF_REG= .. gates=)"; return 2; }
  ( cd "$T/r" && env -u CT_GAPFILL_OVERRIDE ROOT="$T/r" N="$n" ALL="$T/door.log" CT_RUNID="$runid" bash -c 'set -uo pipefail; : > "$ALL"; source "$0"' "$T/door.sh" ) > "$T/out" 2>&1
  rc=$?
  # The door prints one REPORTED line per row it does not judge and then its summary verdict, so the LAST line is the verdict.
  line="$(grep '^build-number series:' "$T/out" | tail -1 || true)"
  echo "series-at: $n gated HEAD ${head:0:12} on origin/main ${base:0:12}, runId $runid - today's door against that tree:"
  if [ -z "$line" ]; then sed 's/^/    /' "$T/out" | head -12; rm -rf "$T"; echo "series-at: NOT ANSWERABLE - the door printed no verdict line"; return 2; fi
  grep '^build-number series:' "$T/out" | cut -c1-400 | sed 's/^/  /'
  [ "$dirty" = 1 ] && echo "  NOTE: the log says WORKING TREE DIRTY - it gated uncommitted files, and this answer covers the committed tree only"
  if [ "$rc" != 0 ]; then grep -A2 '^GATES RED' "$T/out" | cut -c1-400 | sed 's/^/  /'; rm -rf "$T"; echo "series-at: RED - the door refuses this tree"; return 1; fi
  rm -rf "$T"
  case "$line" in
    "build-number series: ok "*|"build-number series: ok -"*) echo "series-at: OK - the door passes this tree (verdict: the last line above)"; return 0 ;;
    # A row ABOVE the base top extends the series: the door lets the suite run and reports it (its own words: it "does not judge
    # the extends class"). Every ordinary build's own mint is this case, so it is a pass here too, with the report shown above.
    "build-number series: REPORTED, NOT REFUSED"*) echo "series-at: OK - the door lets this tree through and REPORTS a row it does not judge (the line above)"; return 0 ;;
    *) echo "series-at: NOT ANSWERABLE - the door ran and did not say ok (an OVERRIDE or NOT CHECKED verdict is not a clearance)"; return 2 ;;
  esac
}

selftest(){
  local T pass=0 fail=0 rc d mine=build__0000000000001 other=build__0000000000002 b h
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  row(){ printf '%s\t%s\t%s\t-\t-\t2026-11-14T00:00Z\t%s\t%s\tfixture row written by the series-at selftest\n' "$1" "$2" "$3" "$4" "$5"; }
  gc(){ git -C "$1" -c user.email=f@f -c user.name=f -c commit.gpgsign=false "${@:2}" >/dev/null 2>&1; }
  ck(){ local out; out="$(CT_RUNID="${3:-}" answer "$T/log" "$d" 2>&1)"; rc=$?
    if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; printf '%s\n' "$out" | sed 's/^/       /' | head -8; fail=$((fail+1)); fi; }
  log(){ { printf 'gates.sh #%s  bundle /x/app.js  md5 000000000000  2026-11-14 00:00:00 UTC\n' "$1"
           printf 'PASS a line this tool must not read\nGATES GREEN #%s\n' "$1"
           printf 'ref: HEAD %s | bundle md5 000000000000 | origin/main %s | %s\n' "$2" "$3" "${4:-ON MAIN}"; } > "$T/log"; }
  d="$T/repo"; mkdir -p "$d/gates"; git init -q "$d"
  { echo '# fixture register'; row 530 issued - "$other" run-log; row 531 issued - "$other" run-log; } > "$d/gates/build-numbers.tsv"
  gc "$d" add -A; gc "$d" commit -q -m 'fixture base register'; b="$(git -C "$d" rev-parse HEAD)"; git -C "$d" update-ref refs/remotes/origin/main "$b"
  row 532 minted - "$mine" minted >> "$d/gates/build-numbers.tsv"; gc "$d" add -A; gc "$d" commit -q -m '#532 mint'; h="$(git -C "$d" rev-parse HEAD)"
  log 532 "$h" "$b"; ck "S1 a tree whose one appended row is this run's mint passes the door (exit 0)" 0
  # THE CONTROL PAIR: the same log shape, a tree whose push carries a row the run does not own (a gap-fill under another runId).
  row 529 minted - "$other" minted >> "$d/gates/build-numbers.tsv"; gc "$d" add -A; gc "$d" commit -q -m '#532 also writes 529'; h="$(git -C "$d" rev-parse HEAD)"
  log 532 "$h" "$b"; ck "S2 the same log over a tree carrying a foreign gap-fill row is REFUSED (exit 1)" 1 "$mine"
  CT_RUNID="$mine" answer "$T/log" "$d" > "$T/s2b.out" 2>&1; [ -n "${SERIES_AT_DEBUG:-}" ] && cut -c1-300 "$T/s2b.out"
  if grep -q '^  GATES RED #532' "$T/s2b.out" && grep -q '#529 FILLS A GAP' "$T/s2b.out"; then echo "  ok   S2b and it is refused BY THE DOOR, for row 529 (GATES RED, and the cause names #529 as a gap fill)"; pass=$((pass+1)); else echo "  FAIL S2b the refusal is not the door's RED verdict on 529"; fail=$((fail+1)); fi
  log 532 "$h" "$b"; ck "S3 with no CT_RUNID the runId is read from the register at HEAD (532 names one) and the door still refuses" 1
  log 532 "$h" "$b" "WORKING TREE DIRTY: 1 path(s)"; ck "S4 a DIRTY log is still answered for the committed tree (exit is the door's)" 1 "$mine"
  printf 'gates.sh #532  bundle x\nGATES GREEN #532\n' > "$T/log"; ck "S5 a log with no ref line is NOT ANSWERABLE (exit 2), never a pass" 2 "$mine"
  printf 'not a header\nref: HEAD %s | origin/main %s |\n' "$h" "$b" > "$T/log"; ck "S6 a log with no gates.sh header is NOT ANSWERABLE (exit 2)" 2 "$mine"
  log 532 "0123456789012345678901234567890123456789" "$b"; ck "S7 a gated sha the repo does not hold is NOT ANSWERABLE (exit 2)" 2 "$mine"
  log 533 "$h" "$b"; ck "S8 a build number the register names no runId for, with no CT_RUNID, is NOT ANSWERABLE (exit 2)" 2
  # S9: the tool must not read the suite's verdict lines: a log whose ONLY verdict-bearing line says GATES RED is answered the same.
  log 532 "$h" "$b"; sed -i 's/^GATES GREEN/GATES RED/; s/^PASS/FAIL/' "$T/log"; ck "S9 the answer does not depend on any PASS, FAIL or GATES line (same tree, RED suite lines: still exit 1)" 1 "$mine"
  # S10: the real checkout's origin/main is never moved by an answer (the clone is independent).
  local before after; before="$(git -C "$d" rev-parse -q --verify refs/remotes/origin/main 2>/dev/null || echo none)"; log 532 "$h" "$b"; CT_RUNID="$mine" answer "$T/log" "$d" >/dev/null 2>&1
  after="$(git -C "$d" rev-parse -q --verify refs/remotes/origin/main 2>/dev/null || echo none)"
  if [ "$before" = "$after" ]; then echo "  ok   S10 answering leaves the source repository's origin/main where it was ($before)"; pass=$((pass+1)); else echo "  FAIL S10 origin/main moved: $before -> $after"; fail=$((fail+1)); fi
  echo "series-at selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  ""|-h|--help) sed -n '2,28p' "$SELF"; exit 2 ;;
  *) answer "$1" "${2:-$(cd "$(dirname "$0")/.." && pwd)}"; exit $? ;;
esac
