#!/usr/bin/env bash
# gates/audit/suite-lock-contention.sh   DOES THE SUITE LOCK HAVE A TIMING JUSTIFICATION, MEASURED ON REAL GATES
#
# jobs/the-suite-lock-was-never-justified-by-a-measured-timing-conflict-2026-10-04, notChecked ITEM 1:
#   "Whether the suite is settle-bound rather than CPU-bound on a container under real load. CLAUDE.md asserts
#    it is, from an observation rather than a measurement."
# That item sat unmeasured from 2026-10-04 to 2026-10-10 because the experiment the job describes is two FULL
# suites - 83 minutes each - and no parallel lane has a budget that reaches the end of one, let alone two.
# THIS SCRIPT IS THE SAME QUESTION AT ONE GATE INSTEAD OF THE WHOLE SUITE. It runs a gate alone, then runs N
# copies of it at once, and compares BOTH the wall clock AND the assertion counts. That is affordable inside a
# 70-minute budget, and it is the measurement the job's second sentence asks for rather than a proxy for it.
#
# WHAT IT DOES NOT DECIDE, said here so nothing downstream over-reads it. It cannot license removing the lock:
# gates.sh:112-120 records a SECOND and independent reason for it, a shared per-gate log path that produced two
# collage logs at #418, and lane 4 measured on 2026-10-10 that gates/shots/gates-$TAG is shared the same way
# (patches/proc-lane4-art-gates-audit-ssp-2026-10-10). This script ISOLATES those paths per worker on purpose,
# so what it reports is the timing half alone. Both halves have to be answered before the lock can be scoped.
#
# USAGE
#   gates/audit/suite-lock-contention.sh                          # default gates, levels 1 2, 2 reps
#   gates/audit/suite-lock-contention.sh -g "42-home-devrow 36-evalbar" -c "1 2 4" -r 2
#   gates/audit/suite-lock-contention.sh -x                       # POSITIVE CONTROL: adds CPU hogs, must flip
#   -t 25   tolerance, percent of median wall-clock inflation at C>1 that still reads SETTLE-BOUND
#
# EXIT  0 every gate read SETTLE-BOUND   1 at least one read CPU-BOUND   3 the measurement was vacuous
set -uo pipefail
G="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; ROOT="$(cd "$G/.." && pwd)"
GATES="42-home-devrow 36-evalbar"; LEVELS="1 2"; REPS=2; TOL=25; CONTROL=0
while getopts "g:c:r:t:xh" o; do case "$o" in
  g) GATES="$OPTARG";; c) LEVELS="$OPTARG";; r) REPS="$OPTARG";; t) TOL="$OPTARG";; x) CONTROL=1;;
  h) sed -n '1,30p' "${BASH_SOURCE[0]}"; exit 0;; *) echo "FAIL: bad option"; exit 3;; esac; done
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"; [ -n "${HOGS:-}" ] && kill $HOGS 2>/dev/null' EXIT
echo "SUITE-LOCK-CONTENTION  $(date '+%Y-%m-%d %H:%M:%S %Z')  gates [$GATES]  levels [$LEVELS]  reps $REPS  tolerance ${TOL}%  control $CONTROL"
echo "  cores $(nproc 2>/dev/null || echo '?')  node $(node -v 2>/dev/null || echo absent)  bundle $(md5sum "$ROOT/app.js" 2>/dev/null | cut -c1-12)"
[ -f "$ROOT/app.js" ] || { echo "FAIL: no $ROOT/app.js to gate - the measurement would be vacuous"; exit 3; }
[ "$REPS" -ge 2 ] || { echo "FAIL: -r must be at least 2 or there is no median to compare"; exit 3; }

# ONE WORKER. Every path it writes is keyed on its own id, so this measures CONTENTION FOR CPU and never a
# collision on a filename - the other half of the lock's justification, which is not this script's question.
run_one(){ # $1 gate  $2 worker id -> prints "<ms> <rc> <pass> <fail>"
  local gate="$1" id="$2" out="$WORK/$1.$2.log" s e rc p f
  s=$(date +%s%3N)
  ( cd "$ROOT" && CT_SHOTS="$WORK/shots.$id" CT_APP="$ROOT/app.js" timeout 600 node "$G/regress/$gate.js" ) >"$out" 2>&1; rc=$?
  e=$(date +%s%3N)
  p=$(grep -c '^PASS' "$out" 2>/dev/null || echo 0); f=$(grep -c '^FAIL' "$out" 2>/dev/null || echo 0)
  echo "$((e-s)) $rc $p $f"
}
median(){ tr ' ' '\n' <<<"$*" | grep -v '^$' | sort -n | awk '{a[NR]=$1} END{if(NR==0){print 0}else if(NR%2){print a[(NR+1)/2]}else{print int((a[NR/2]+a[NR/2+1])/2)}}'; }

HOGS=""
# THE CONTROL STARTS AFTER THE SOLO LEVEL, NOT BEFORE IT, AND THE FIRST DRAFT OF THIS SCRIPT GOT IT WRONG.
# Hogs running during the C=1 baseline inflate the baseline too, so the RATIO barely moves and a control that
# cannot flip the verdict proves nothing - it would be this project's own "a gate that cannot fail" defect,
# written into the instrument built to measure a gate. start_hogs is therefore called from inside the level
# loop, the first time a level above 1 is reached, so the load is present for the concurrent arms alone.
start_hogs(){
  [ "$CONTROL" = 1 ] || return 0; [ -z "$HOGS" ] || return 0
  # FOUR BUSY LOOPS PER CORE, NOT ONE. Measured 2026-10-10 on this two-core container: one loop per core
  # inflated gate 42 by 8%, inside the 25% tolerance, so the control came out SETTLE-BOUND and proved nothing
  # about the detector. The gate is that settle-bound; the load has to be heavy enough to starve it before the
  # detector can be shown firing. CT_CONTENTION_HOGS overrides the multiplier.
  local n; n=$(( $(nproc 2>/dev/null || echo 2) * ${CT_CONTENTION_HOGS:-4} ))
  echo "  CONTROL: starting $n busy loops AFTER the solo baseline, so the inflation detector is shown flipping"
  for i in $(seq "$n"); do ( while :; do :; done ) & HOGS="$HOGS $!"; done
}

RC=0
for gate in $GATES; do
  [ -f "$G/regress/$gate.js" ] || { echo "GATE $gate: MISSING at $G/regress/$gate.js - not measured"; RC=3; continue; }
  echo; echo "GATE $gate"
  SOLO_MED=""; SOLO_PASS=""; SOLO_SIG=""
  for C in $LEVELS; do
    MS=""; SIGS=""; BAD=0
    [ "$C" = 1 ] || start_hogs
    for rep in $(seq "$REPS"); do
      pids=""; k=0
      while [ "$k" -lt "$C" ]; do k=$((k+1)); ( run_one "$gate" "c$C.r$rep.w$k" > "$WORK/res.$C.$rep.$k" ) & pids="$pids $!"; done
      wait $pids
      k=0; while [ "$k" -lt "$C" ]; do k=$((k+1))
        read -r ms rc p f < "$WORK/res.$C.$rep.$k"
        MS="$MS $ms"; SIGS="$SIGS ${p}p/${f}f/rc$rc"
        printf '  C=%-2s rep%-2s w%-2s  %6s ms  rc %s  %s pass  %s fail\n' "$C" "$rep" "$k" "$ms" "$rc" "$p" "$f"
      done
    done
    MED=$(median "$MS")
    if [ "$C" = 1 ]; then
      SOLO_MED="$MED"; SOLO_SIG="$(tr ' ' '\n' <<<"$SIGS" | grep -v '^$' | sort -u | tr '\n' ',')"
      SOLO_PASS="$(tr ' ' '\n' <<<"$SIGS" | grep -v '^$' | head -1)"
      echo "  SOLO median ${MED} ms, signature(s) ${SOLO_SIG}"
      case "$SOLO_PASS" in 0p/*) echo "  FAIL: the solo run produced ZERO pass lines, so nothing below could discriminate - vacuous"; RC=3; break;; esac
      continue
    fi
    SIGU="$(tr ' ' '\n' <<<"$SIGS" | grep -v '^$' | sort -u | tr '\n' ',')"
    [ "$SIGU" = "$SOLO_SIG" ] || BAD=1
    INF=$(( SOLO_MED>0 ? (MED-SOLO_MED)*100/SOLO_MED : 999 ))
    echo "  C=$C median ${MED} ms vs solo ${SOLO_MED} ms = ${INF}% inflation; signature(s) ${SIGU}"
    if [ "$BAD" = 1 ]; then
      echo "  C=$C VERDICT CPU-BOUND: an assertion count or exit code CHANGED under concurrency (solo ${SOLO_SIG} vs ${SIGU}). The lock is justified AT THIS GATE and the number that justifies it is this line."
      RC=1
    elif [ "$INF" -gt "$TOL" ]; then
      echo "  C=$C VERDICT CPU-BOUND: every assertion held, but the median wall clock inflated ${INF}% against a ${TOL}% tolerance, so the suite is competing for CPU rather than waiting on the app."
      RC=1
    else
      echo "  C=$C VERDICT SETTLE-BOUND: identical assertion counts and ${INF}% inflation inside the ${TOL}% tolerance. On the TIMING half alone, this gate gives the lock no justification."
    fi
  done
done
# IN CONTROL MODE THE SCRIPT IS BEING TESTED, NOT THE SUITE. A control run that comes out SETTLE-BOUND means
# the inflation detector was never shown firing, so neither verdict from this script can be trusted at that
# load, and saying so is the whole point of having a control at all [R36, and the project's own "a gate that
# cannot fail" class].
if [ "$CONTROL" = 1 ]; then
  echo
  if [ "$RC" = 1 ]; then
    echo "CONTROL FLIPPED: under $(( $(nproc 2>/dev/null || echo 2) * ${CT_CONTENTION_HOGS:-4} )) busy loops the detector reported CPU-BOUND, so a real contention effect is one this script can see. The clean run's verdict is therefore a measurement and not a vacuity."
    exit 0
  fi
  echo "CONTROL DID NOT FLIP: the detector stayed SETTLE-BOUND under load, so its ability to report CPU-BOUND is UNPROVEN at this load and no verdict from a clean run may be cited. Raise CT_CONTENTION_HOGS and re-run."
  exit 4
fi
echo
case "$RC" in
  0) echo "SUITE-LOCK-CONTENTION: SETTLE-BOUND at every level measured. This answers the TIMING half of notChecked item 1 only; the shared-path half (gates/logs, gates/shots) is isolated by this script by design and is a separate question.";;
  1) echo "SUITE-LOCK-CONTENTION: CPU-BOUND somewhere above. The lock has a measured timing justification at the gate and level named, which is what the job says would close it as rejected.";;
  *) echo "SUITE-LOCK-CONTENTION: VACUOUS - nothing was measured, so no verdict. Do not read this as either answer.";;
esac
exit $RC
