#!/bin/bash
# The fastgate BNRATCHET membership test exactly as c661487 wrote it, and the capture-first form #526 replaced it
# with, each run 5 times plain and 5 times with every write() delayed 20 ms by strace fault injection.
# Usage: pipe-probe.sh <path to a records-gate.sh>   (c661487's: git show c661487:gates/records-gate.sh > f)
RG="$1"
RACY='set -uo pipefail; X=no; bash '"$RG"' --entries 2>/dev/null | grep -qxF "$(printf "appendonly\tgates/build-numbers.tsv")" && X=yes; echo "racy    status=${PIPESTATUS[*]} BNRATCHET=$X"'
CAPT='set -uo pipefail; X=no; E="$(bash '"$RG"' --entries 2>/dev/null)"; case "$E" in *"$(printf "appendonly\tgates/build-numbers.tsv")"*) X=yes;; esac; echo "capture BNRATCHET=$X"'
for P in "$RACY" "$CAPT"; do
  echo "-- plain";   for i in 1 2 3 4 5; do bash -c "$P"; done
  echo "-- delayed"; for i in 1 2 3 4 5; do strace -f -qq -o /dev/null -e trace=write -e inject=write:delay_enter=20000 bash -c "$P"; done
done
