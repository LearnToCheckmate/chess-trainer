#!/usr/bin/env bash
# The test from jobs/the-no-floor-control-is-not-green-...: gate 26 ALONE, SEQUENTIALLY, three runs per bundle.
# Never concurrent (#418's two overlapping suites produced collage logs).
# Progress goes to PROG so a watcher can wait on a FILE rather than on a pgrep pattern that matches itself
# (the #407/#416/#445run self-reference trap).
set -u
cd /home/user/chess-trainer
S=/tmp/claude-0/-home-user-chess-trainer/914a77c2-0e31-55af-a807-d56139d4ef8c/scratchpad/g26
PROG=$S/progress.txt
TREE=/home/user/chess-trainer/app.js          # md5 0bbc5c85b1df, the pile head, floor ON
CTL=/tmp/claude-0/-home-user-chess-trainer/914a77c2-0e31-55af-a807-d56139d4ef8c/scratchpad/control.js  # c31a7ee506c9, floor OFF
for spec in tree:2 tree:3 control:1 control:2 control:3; do
  b="${spec%%:*}"; n="${spec##*:}"
  [ "$b" = tree ] && APP=$TREE || APP=$CTL
  echo "RUN-START $b$n $(date -u +%H:%M:%SZ) md5=$(md5sum $APP | cut -c1-12)" >> $PROG
  CT_APP=$APP CT_EXPECT='#442' timeout 900 node gates/regress/26-invariants.js > $S/$b-run$n.log 2>&1
  rc=$?
  ik=$(grep -cE "^PASS" $S/$b-run$n.log)
  fl=$(grep -cE "^FAIL" $S/$b-run$n.log)
  echo "RUN-DONE $b$n rc=$rc $(date -u +%H:%M:%SZ) pass=$ik fail=$fl" >> $PROG
done
echo "ALL-RUNS-COMPLETE $(date -u +%H:%M:%SZ)" >> $PROG
