#!/usr/bin/env bash
# ltrialq.sh <bundle-name> <tap early|late> <quota-percent-of-one-core>
#   Runs the probe (node, chromium and every engine worker, by inheritance) inside cgroup-v1 cpu group hbprobe with
#   cfs_quota = Q% of one CPU per 100 ms period: real CPU starvation of the measured browser, without busy loops, so
#   the other cores and the load average stay available to other lanes. Waits until the 1-minute load is <= 10.
H=/tmp/claude-0/-home-user-chess-trainer/dc52dd58-9036-5ad0-bce9-bf1028037f30/scratchpad/hbcf
W=/home/user/chess-trainer/.claude/worktrees/agent-a166f5d9d7a715906
CG=/sys/fs/cgroup/cpu/hbprobe
bn="$1"; tap="$2"; Q="$3"
while awk '{exit !($1>10)}' /proc/loadavg; do sleep 20; done
cd "$W" || exit 2
mkdir -p "$CG"; echo $((Q*1000)) > "$CG/cpu.cfs_quota_us"
la=$(cut -d' ' -f1 /proc/loadavg)
out=$( ( echo $BASHPID > "$CG/cgroup.procs"; exec env CT_APP="$H/$bn.js" LP_TAP="$tap" timeout 1500 node "$H/lprobe.js" ) 2>&1 | grep '^LPROBE' | head -1)
thr=$(grep -E 'nr_throttled|throttled_time' "$CG/cpu.stat" | tr '\n' ' ')
echo "$(date -u +%H:%M:%S) quota=${Q}% load0=$la [$thr] $out"
