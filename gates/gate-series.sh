#!/usr/bin/env bash
# gates/gate-series.sh - RUN ONE OR MORE GATES ALONE, N TIMES EACH, IN A QUIET OR A BUSY CONTAINER, AND WRITE EVERY RUN
# TO A TSV [#553; jobs/gate-20-is-killed-at-its-900-second-limit-in-3-of-4-runs-on-551-make-it-finish-well-inside-it-2026-11-18,
# jobs/gates-26-and-48-are-looked-at-for-flakiness-2026-11-15, jobs/gate-26-goes-red-at-ply-31-on-the-small-phone-while-the-
# explanation-is-still-coming-2026-11-18]. The 20-run series those jobs ask for waits on Kunal's q21 (where it runs); this is
# the instrument, so the series can start the minute q21 is answered.
#
# USAGE
#   bash gates/gate-series.sh --mode quiet|busy --n N [--gates "20-review 26-invariants"] [--bundle app.js]
#                             [--out <tsv>] [--timeout 900] [--allow-noisy]
#   bash gates/gate-series.sh --summary <tsv>     the SUMMARY lines of an existing TSV
#   bash gates/gate-series.sh --selftest          its controls, as a command (fixtures and the busy loop; no browser)
#   exit 0 every run green | 1 at least one run not GREEN | 2 refused (usage, not quiet, no bundle, wrong busy pid)
#
# WHAT EACH HALF IS
#   quiet  REFUSES TO START unless the 1-minute AND the 5-minute load averages are BOTH under 1 (read from /proc/loadavg
#          at start, and again before every run: a run whose own start is not quiet is not started and the series stops
#          with exit 2). The three seats must be paused for that to be true; this script cannot pause them, it can only
#          refuse. --allow-noisy runs anyway, and EVERY row it produces carries quiet=false and the verdict NOISY (the
#          gate's own result is kept in `gateResult`); the SUMMARY counts only quiet=true rows toward the quiet half, so
#          a noisy run can never stand in for a quiet one (the lead's rule, #553). --allow-noisy exists for the dry run of
#          this script. `--selftest` shows a noisy row being left out of the quiet count.
#   busy   keeps EXACTLY ONE CORE busy for the whole half with one named process, `gate-series-busy`
#          (gates/gate-series-busy.js): a fixed node loop (Math.sqrt over a counter, no allocation, no I/O) that writes its
#          iteration count to a file once a second. Measured, not assumed: each row records the loop's iterations per
#          second over that run and the CPU share it got (utime+stime ticks from /proc/<pid>/stat over wall time; 1.00 is
#          one full core). Busy rows carry quiet=false. The pid recorded is the LOOP'S OWN: the loop writes process.pid
#          to a file, and this script refuses unless that equals $! and /proc/<pid>/cmdline names gate-series-busy (comm is cut to 15 characters). The loop
#          DIES WITH ITS PARENT: trap EXIT kills it by pid (never by pattern - CLAUDE.md: pkill -f kills its own shell),
#          and the loop itself exits within a second once this script's pid is gone, so a SIGKILLed series leaves no
#          core-eating stray (two strays from this script's first tests ran on at #553 until 02:06Z).
#
# WHAT A ROW SAYS
#   verdict     NOISY for every --allow-noisy row. Otherwise GREEN (exit 0 and a summary line with 0 fail and >0 pass),
#               RED, TIMEOUT (exit 124, killed at --timeout), or NOSUMMARY (exited without a "N pass, M fail" line).
#               Only GREEN counts green.
#   gateResult  the gate's own result by the same rule, kept for NOISY rows too.
#   The gate is run exactly as gates/gates.sh runs one: from the repo root, CT_OBSERVE_EXIT=1, `timeout 900`,
#   `node -r gates/lib.js gates/regress/<gate>.js`, with CT_APP naming the bundle. Times are `date -u` at run start/end.
#   Per-run logs go to gates/pairs/logs/series/ (ignored by .gitignore), one per run, named in the row.
#
# WHAT IT DOES NOT DO: it does not run the suite, does not authorise anything, never emits GATES GREEN, and one series
# is one container's reading on one day - the TSV names the container (hostname, nproc) so two series can be compared.
set -u
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"

# One SUMMARY line per gate and mode over every row of a TSV (a TSV appended over two calls summarises both).
# Columns used: 2 gate, 3 mode, 4 quiet, 7 seconds, 11 verdict. The quiet half counts ONLY quiet=true rows.
summarise() {
  awk -F'\t' 'NR>1{k=$2" "$3; if($3=="quiet" && $4!="true"){left[k]++; next}
      n[k]++; if($11=="GREEN")g[k]++; if($11=="TIMEOUT")t[k]++; if($7+0>mx[k])mx[k]=$7+0; s[k]+=$7}
    END{for(k in left) if(!(k in n)) n[k]=0
        for(k in n) printf "SUMMARY %s: %d runs, %d green, %d timed out, mean %.0fs, max %.0fs%s\n", k, n[k], g[k]+0, t[k]+0, (n[k]?s[k]/n[k]:0), mx[k]+0, (left[k]?", "left[k]" NOISY row(s) left out of the quiet count":"")}' "$1" | sort
}

selftest() {
  local T bad=0 S PP BP w
  T="$(mktemp -d)"
  ck() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got [$2] want [$3]"; bad=1; fi; }
  local H='run\tgate\tmode\tquiet\tstartedAt\tfinishedAt\tseconds\texit\tpass\tfail\tverdict\tgateResult\tload1\tload5\tbusyItersPerSec\tbusyCpuShare\tbusyPid\tbundleMd5\thost\tcores\tlog\n'
  local R='%s\t20-review\tquiet\t%s\tx\tx\t%s\t0\t9\t0\t%s\tGREEN\t0.5\t0.5\t-\t-\t-\tm\th\t4\tl\n'
  { printf "$H"; printf "$R" 1 true 100 GREEN; printf "$R" 2 false 900 NOISY; } > "$T/a.tsv"
  S="$(summarise "$T/a.tsv")"
  ck S1-a-noisy-row-is-left-out-of-the-quiet-count "$(printf '%s\n' "$S" | grep -c '^SUMMARY 20-review quiet: 1 runs, 1 green')" 1
  ck S2-and-the-summary-says-it-left-one-out "$(printf '%s\n' "$S" | grep -c '1 NOISY row(s) left out of the quiet count')" 1
  ck S3-its-900s-does-not-reach-the-quiet-max "$(printf '%s\n' "$S" | grep -c 'max 100s')" 1
  { printf "$H"; printf "$R" 1 false 100 NOISY; } > "$T/b.tsv"
  ck S4-a-noisy-only-tsv-gives-zero-quiet-runs "$(summarise "$T/b.tsv" | grep -c '^SUMMARY 20-review quiet: 0 runs, 0 green')" 1
  { printf "$H"; printf "$R" 1 false 100 GREEN; } > "$T/c.tsv"
  ck S5-a-quiet-false-row-never-counts-even-with-a-GREEN-verdict "$(summarise "$T/c.tsv" | grep -c '^SUMMARY 20-review quiet: 0 runs, 0 green')" 1
  # The busy loop: its own pid, its name, and death with its parent (a stand-in parent is killed; the loop must go).
  sleep 60 & PP=$!
  node "$G/gate-series-busy.js" "$T/cnt" "$PP" & BP=$!
  w=0; while [ ! -s "$T/cnt.pid" ] && [ $w -lt 50 ]; do sleep 0.1; w=$((w+1)); done
  ck S6-the-loop-records-its-own-pid "$(tr -d '\n' < "$T/cnt.pid" 2>/dev/null)" "$BP"
  ck S7-and-is-named-gate-series-busy "$(tr '\0' ' ' < "/proc/$BP/cmdline" 2>/dev/null | cut -d' ' -f1)" gate-series-busy
  kill "$PP"; wait "$PP" 2>/dev/null; sleep 4
  if kill -0 "$BP" 2>/dev/null; then ck S8-the-loop-dies-with-its-parent alive dead; kill "$BP"; else ck S8-the-loop-dies-with-its-parent dead dead; fi
  wait 2>/dev/null; rm -rf "$T"
  if [ $bad -eq 0 ]; then echo "gate-series selftest: OK"; else echo "gate-series selftest: FAILED"; fi
  return $bad
}

case "${1:-}" in
  --selftest) selftest; exit $?;;
  --summary) [ -s "${2:-}" ] || { echo "gate-series: --summary needs a TSV" >&2; exit 2; }; summarise "$2"; exit 0;;
esac

MODE=""; N=""; GATES="20-review 26-invariants"; BUNDLE="$ROOT/app.js"; OUT=""; TMO=900; NOISY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="$2"; shift 2;;
    --n) N="$2"; shift 2;;
    --gates) GATES="$2"; shift 2;;
    --bundle) BUNDLE="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --timeout) TMO="$2"; shift 2;;
    --allow-noisy) NOISY=1; shift;;
    *) echo "gate-series: unknown argument '$1'" >&2; exit 2;;
  esac
done
case "$MODE" in quiet|busy) ;; *) echo "gate-series: --mode must be quiet or busy" >&2; exit 2;; esac
case "$N" in ''|*[!0-9]*|0) echo "gate-series: --n must be a positive integer" >&2; exit 2;; esac
[ "$MODE" = busy ] && [ $NOISY -eq 1 ] && { echo "gate-series: --allow-noisy belongs to the quiet half only" >&2; exit 2; }
case "$BUNDLE" in /*) ;; *) BUNDLE="$PWD/$BUNDLE";; esac
[ -s "$BUNDLE" ] || { echo "gate-series: no bundle at $BUNDLE" >&2; exit 2; }
for g in $GATES; do [ -f "$G/regress/$g.js" ] || { echo "gate-series: no gate gates/regress/$g.js" >&2; exit 2; }; done
LOGD="$G/pairs/logs/series"; mkdir -p "$LOGD"
STEM="$(date -u +%Y%m%dT%H%M%SZ)-$MODE"
[ -n "$OUT" ] || OUT="$LOGD/$STEM.tsv"
BMD5="$(md5sum "$BUNDLE" | cut -c1-12)"
HOST="$(hostname)"; CORES="$(nproc)"

loads() { awk '{print $1"\t"$2}' /proc/loadavg; }
is_quiet() { awk '{exit !($1<1 && $2<1)}' /proc/loadavg; }

if [ "$MODE" = quiet ] && [ $NOISY -eq 0 ] && ! is_quiet; then
  echo "gate-series: REFUSED - quiet half needs 1-min and 5-min load both under 1; /proc/loadavg reads: $(cut -d' ' -f1-3 /proc/loadavg). Pause the seats and retry." >&2
  exit 2
fi

BUSYPID=""; BUSYF=""
cleanup() { [ -n "$BUSYPID" ] && kill "$BUSYPID" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT
trap 'exit 130' INT TERM
if [ "$MODE" = busy ]; then
  BUSYF="$LOGD/$STEM.busy-count"
  node "$G/gate-series-busy.js" "$BUSYF" "$$" &
  BUSYPID=$!
  sleep 3
  kill -0 "$BUSYPID" 2>/dev/null || { echo "gate-series: the busy loop did not start" >&2; exit 2; }
  OWN="$(tr -d '\n' < "$BUSYF.pid" 2>/dev/null)"; COMM="$(tr '\0' ' ' < "/proc/$BUSYPID/cmdline" 2>/dev/null | cut -d' ' -f1)"
  if [ "$OWN" != "$BUSYPID" ] || [ "$COMM" != gate-series-busy ]; then
    echo "gate-series: REFUSED - the pid held ($BUSYPID, cmdline '$COMM') is not the loop's own ('$OWN')" >&2; exit 2
  fi
fi
ticks() { awk '{print $14+$15}' "/proc/$1/stat" 2>/dev/null || echo 0; }
HZ="$(getconf CLK_TCK)"

[ -s "$OUT" ] || printf 'run\tgate\tmode\tquiet\tstartedAt\tfinishedAt\tseconds\texit\tpass\tfail\tverdict\tgateResult\tload1\tload5\tbusyItersPerSec\tbusyCpuShare\tbusyPid\tbundleMd5\thost\tcores\tlog\n' > "$OUT"
echo "gate-series: mode=$MODE n=$N gates=[$GATES] bundle=$BUNDLE ($BMD5) timeout=${TMO}s host=$HOST cores=$CORES -> $OUT"
[ $NOISY -eq 1 ] && echo "gate-series: --allow-noisy - every row is quiet=false and NOISY, and counts toward nothing"
[ -n "$BUSYPID" ] && echo "gate-series: busy loop gate-series-busy, its own pid $BUSYPID, one core"
ANYRED=0
for g in $GATES; do
  for i in $(seq 1 "$N"); do
    QCOL=false
    if [ "$MODE" = quiet ] && [ $NOISY -eq 0 ]; then
      is_quiet || { echo "gate-series: STOPPED before $g run $i - load rose: $(cut -d' ' -f1-3 /proc/loadavg)" >&2; exit 2; }
      QCOL=true
    fi
    read -r L1 L5 < <(loads)
    LOG="$LOGD/$STEM-$g-$i.log"
    S0="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; T0=$(date +%s.%N)
    if [ -n "$BUSYPID" ]; then C0=$(ticks "$BUSYPID"); B0=$(cat "$BUSYF" 2>/dev/null || echo 0); BT0=$(date +%s.%N); fi
    ( cd "$ROOT" && CT_APP="$BUNDLE" CT_OBSERVE_EXIT=1 timeout "$TMO" node -r "$G/lib.js" "$G/regress/$g.js" ) > "$LOG" 2>&1; RC=$?
    T1=$(date +%s.%N); S1="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    SECS=$(awk -v a="$T0" -v b="$T1" 'BEGIN{printf "%.1f", b-a}')
    IPS=-; SHARE=-
    if [ -n "$BUSYPID" ]; then
      C1=$(ticks "$BUSYPID"); B1=$(cat "$BUSYF" 2>/dev/null || echo 0); BT1=$(date +%s.%N)
      IPS=$(awk -v a="$B0" -v b="$B1" -v s="$BT0" -v e="$BT1" 'BEGIN{printf "%.0f", (b-a)/(e-s)}')
      SHARE=$(awk -v a="$C0" -v b="$C1" -v hz="$HZ" -v s="$BT0" -v e="$BT1" 'BEGIN{printf "%.2f", (b-a)/hz/(e-s)}')
    fi
    SUM="$(grep -E '[0-9]+ pass, [0-9]+ fail' "$LOG" | tail -1)"
    P=$(printf '%s' "$SUM" | sed -E 's/.* ([0-9]+) pass, ([0-9]+) fail.*/\1/'); F=$(printf '%s' "$SUM" | sed -E 's/.* ([0-9]+) pass, ([0-9]+) fail.*/\2/')
    [ -n "$SUM" ] || { P=-; F=-; }
    if [ $RC -eq 124 ]; then GR=TIMEOUT
    elif [ -z "$SUM" ]; then GR=NOSUMMARY
    elif [ $RC -eq 0 ] && [ "$F" = 0 ] && [ "$P" -gt 0 ]; then GR=GREEN
    else GR=RED; fi
    V="$GR"; [ $NOISY -eq 1 ] && V=NOISY
    [ "$V" = GREEN ] || ANYRED=1
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$i" "$g" "$MODE" "$QCOL" "$S0" "$S1" "$SECS" "$RC" "$P" "$F" "$V" "$GR" "$L1" "$L5" "$IPS" "$SHARE" "${BUSYPID:--}" "$BMD5" "$HOST" "$CORES" "${LOG#$ROOT/}" >> "$OUT"
    echo "  $g run $i: $V (gate $GR, quiet=$QCOL) in ${SECS}s (exit $RC, $P pass $F fail, load $L1/$L5, busy $IPS it/s share $SHARE)"
  done
done
summarise "$OUT"
exit $ANYRED
