#!/bin/bash
S=/tmp/claude-0/-home-user-chess-trainer/1f67fe53-5b8e-5ef1-8034-f7d7f91388f5/scratchpad/t17
cd $S/clone
printf 'run\tstartZ\tendZ\tload1m\tfreeMB\tsummary\tH1\n' > $S/table.tsv
for i in $(seq 1 20); do
  st=$(date -u +%H:%M:%S); ld=$(cut -d' ' -f1 /proc/loadavg); fr=$(df -m /tmp | awk 'NR==2{print $4}')
  bash gates/fastgate-drive.sh unfixed > $S/logs/unfixed-$i.log 2>&1
  en=$(date -u +%H:%M:%S); sm=$(grep -oE '[0-9]+ ok, [0-9]+ FAIL, [0-9]+ skipped' $S/logs/unfixed-$i.log | tail -1)
  h1=$(grep -E '^ *(ok|FAIL) +H1 ' $S/logs/unfixed-$i.log | awk '{print $1}' | head -1)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' $i $st $en $ld $fr "$sm" "${h1:-?}" >> $S/table.tsv
done
echo DONE >> $S/table.tsv
