#!/usr/bin/env bash
# stretch.sh <run>...   each run "bundle:tap:quota". Holds the LOADREPRO lock for the whole stretch (removed on any exit),
# waits for the 5-minute load to be <= 2 before starting, drains 60 s, and stops (killing the cgroup's processes by PID)
# the moment the 5-minute load passes 4.
H=/tmp/claude-0/-home-user-chess-trainer/dc52dd58-9036-5ad0-bce9-bf1028037f30/scratchpad/hbcf
LOCK=/tmp/claude-0/-home-user-chess-trainer/dc52dd58-9036-5ad0-bce9-bf1028037f30/scratchpad/LOADREPRO.lock
CG=/sys/fs/cgroup/cpu/hbprobe
LOG=$H/ltrials.log
cleanup(){ [ -n "${WP:-}" ] && kill "$WP" 2>/dev/null
  if [ -d "$CG" ]; then for p in $(cat "$CG/cgroup.procs" 2>/dev/null); do kill -9 "$p" 2>/dev/null; done; sleep 1; rmdir "$CG" 2>/dev/null; fi
  rm -f "$LOCK"; echo "$(date -u +%H:%M:%S) stretch end: lock removed, load $(cat /proc/loadavg)" >> "$LOG"; }
trap cleanup EXIT; trap "exit 1" INT TERM   # a TERM must END the stretch; with cleanup alone as the TERM handler the loop went on to the next run after the lock was gone (08:26Z)
while awk '{exit !($2>2)}' /proc/loadavg; do sleep 20; done
echo "helper B load reproduction, started $(date -u +%FT%TZ), pid $$" > "$LOCK"
echo "$(date -u +%H:%M:%S) stretch start: lock created, load $(cat /proc/loadavg); draining 60 s" >> "$LOG"
sleep 60; n=0; while pgrep -f chrome-headless-shell >/dev/null && [ $n -lt 40 ]; do sleep 15; n=$((n+1)); done; if pgrep -f chrome-headless-shell >/dev/null; then echo "$(date -u +%H:%M:%S) ABORT: other browsers still running after 11 min of drain" >> "$LOG"; exit 1; fi; echo "$(date -u +%H:%M:%S) drained: no other browser running" >> "$LOG"
# watcher: 5-minute load over 4 stops the stretch
( while :; do if awk '{exit !($2>4)}' /proc/loadavg; then echo "$(date -u +%H:%M:%S) STOP: 5-minute load $(cut -d' ' -f2 /proc/loadavg) > 4" >> "$LOG"; for p in $(cat "$CG/cgroup.procs" 2>/dev/null); do kill -9 "$p" 2>/dev/null; done; kill -TERM $$; exit; fi; sleep 10; done ) & WP=$!
for r in "$@"; do IFS=: read bn tap q <<< "$r"; bash $H/ltrialq.sh "$bn" "$tap" "$q" >> "$LOG" 2>&1; done
