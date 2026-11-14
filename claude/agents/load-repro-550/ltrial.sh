#!/usr/bin/env bash
# ltrial.sh <bundle-name> <tap early|late> <busy-loops K> [throttle]
#   Pins the probe (its node, chromium and every engine worker inherit the affinity) AND K busy loops to ONE core (cpu 3),
#   so the contention is real CPU starvation of the measured browser while the other three cores stay free for other lanes.
#   Waits until the 1-minute load is <= 10 before starting. The busy loops are killed by their captured PIDs, never by pattern.
H=/tmp/claude-0/-home-user-chess-trainer/dc52dd58-9036-5ad0-bce9-bf1028037f30/scratchpad/hbcf
W=/home/user/chess-trainer/.claude/worktrees/agent-a166f5d9d7a715906
bn="$1"; tap="$2"; K="$3"; thr="${4:-}"; NI="${5:-0}"
while awk '{exit !($1>10)}' /proc/loadavg; do sleep 20; done
cd "$W" || exit 2
pids=()
for i in $(seq 1 "$K"); do taskset -c 3 node -e 'for(;;){}' & pids+=($!); done
la=$(cut -d' ' -f1 /proc/loadavg)
out=$(CT_APP="$H/$bn.js" LP_TAP="$tap" LP_THROTTLE="$thr" taskset -c 3 nice -n "$NI" timeout 1200 node "$H/lprobe.js" 2>&1 | grep '^LPROBE' | head -1)
for p in "${pids[@]}"; do kill "$p" 2>/dev/null; done
wait 2>/dev/null
echo "$(date -u +%H:%M:%S) K=$K nice=$NI load0=$la $out"
