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
#   exit 0 every run green | 1 at least one run red or timed out | 2 refused (usage, not quiet, no bundle)
#
# WHAT EACH HALF IS
#   quiet  REFUSES TO START unless the 1-minute AND the 5-minute load averages are BOTH under 1 (read from /proc/loadavg
#          at start, and again before every run: a run whose own start is not quiet is not started and the series stops
#          with exit 2). The three seats must be paused for that to be true; this script cannot pause them, it can only
#          refuse. --allow-noisy runs anyway and writes NOT-QUIET in every row's `quiet` column; it exists for the dry
#          run of the script itself and a NOT-QUIET row is never a quiet-half figure.
#   busy   keeps EXACTLY ONE CORE busy for the whole half with one named process, `gate-series-busy` (gates/gate-series-busy.js): a fixed node loop
#          (Math.sqrt over a counter, no allocation, no I/O) that writes its iteration count to a file once a second.
#          Measured, not assumed: each row records the loop's iterations per second over that run and the CPU share it
#          got (utime+stime ticks from /proc/<pid>/stat over wall time; 1.00 is one full core). The loop is killed by
#          PID on exit, never by pattern (CLAUDE.md: pkill -f kills its own shell).
#
# WHAT A ROW SAYS
#   verdict  GREEN (exit 0 and a summary line with 0 fail and >0 pass), RED, TIMEOUT (exit 124, killed at --timeout),
#            or NOSUMMARY (exited without a "N pass, M fail" line). Only GREEN counts green.
#   The gate is run exactly as gates/gates.sh runs one: from the repo root, CT_OBSERVE_EXIT=1, `timeout 900`,
#   `node -r gates/lib.js gates/regress/<gate>.js`, with CT_APP naming the bundle. Times are `date -u` at run start/end.
#   Per-run logs go to gates/pairs/logs/series/ (ignored by .gitignore), one per run, named in the row.
#
# WHAT IT DOES NOT DO: it does not run the suite, does not authorise anything, never emits GATES GREEN, and one series
# is one container's reading on one day - the TSV names the container (hostname, nproc) so two series can be compared.
set -u
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"
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
trap cleanup EXIT INT TERM
if [ "$MODE" = busy ]; then
  BUSYF="$LOGD/$STEM.busy-count"
  # gates/gate-series-busy.js sets process.title, so `ps` shows gate-series-busy; its loop body is fixed and is the whole load.
  node "$G/gate-series-busy.js" "$BUSYF" &
  BUSYPID=$!
  sleep 3
  kill -0 "$BUSYPID" 2>/dev/null || { echo "gate-series: the busy loop did not start" >&2; exit 2; }
fi
ticks() { awk '{print $14+$15}' "/proc/$1/stat" 2>/dev/null || echo 0; }
HZ="$(getconf CLK_TCK)"

[ -s "$OUT" ] || printf 'run\tgate\tmode\tquiet\tstartedAt\tfinishedAt\tseconds\texit\tpass\tfail\tverdict\tload1\tload5\tbusyItersPerSec\tbusyCpuShare\tbundleMd5\thost\tcores\tlog\n' > "$OUT"
echo "gate-series: mode=$MODE n=$N gates=[$GATES] bundle=$BUNDLE ($BMD5) timeout=${TMO}s host=$HOST cores=$CORES -> $OUT"
[ -n "$BUSYPID" ] && echo "gate-series: busy loop gate-series-busy pid $BUSYPID, one core"
ANYRED=0
for g in $GATES; do
  for i in $(seq 1 "$N"); do
    QCOL=QUIET
    if [ "$MODE" = quiet ]; then
      if ! is_quiet; then
        if [ $NOISY -eq 1 ]; then QCOL=NOT-QUIET
        else echo "gate-series: STOPPED before $g run $i - load rose: $(cut -d' ' -f1-3 /proc/loadavg)" >&2; exit 2; fi
      fi
    else QCOL=BUSY; fi
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
    if [ $RC -eq 124 ]; then V=TIMEOUT
    elif [ -z "$SUM" ]; then V=NOSUMMARY
    elif [ $RC -eq 0 ] && [ "$F" = 0 ] && [ "$P" -gt 0 ]; then V=GREEN
    else V=RED; fi
    [ "$V" = GREEN ] || ANYRED=1
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$i" "$g" "$MODE" "$QCOL" "$S0" "$S1" "$SECS" "$RC" "$P" "$F" "$V" "$L1" "$L5" "$IPS" "$SHARE" "$BMD5" "$HOST" "$CORES" "${LOG#$ROOT/}" >> "$OUT"
    echo "  $g run $i: $V in ${SECS}s (exit $RC, $P pass $F fail, load $L1/$L5, busy $IPS it/s share $SHARE)"
  done
done
# SUMMARY: one line per gate and mode over every row of this TSV (a TSV appended over two calls summarises both).
awk -F'\t' 'NR>1{k=$2" "$3; n[k]++; if($11=="GREEN")g[k]++; if($11=="TIMEOUT")t[k]++; if($7+0>mx[k])mx[k]=$7+0; s[k]+=$7; nq[k]+=($4=="NOT-QUIET")}
  END{for(k in n) printf "SUMMARY %s: %d runs, %d green, %d timed out, mean %.0fs, max %.0fs%s\n", k, n[k], g[k]+0, t[k]+0, s[k]/n[k], mx[k], (nq[k]?", "nq[k]" NOT-QUIET (not a quiet figure)":"")}' "$OUT" | sort
exit $ANYRED
