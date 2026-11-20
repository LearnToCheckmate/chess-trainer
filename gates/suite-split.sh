#!/usr/bin/env bash
# gates/suite-split.sh - THE FULL SUITE SPLIT ACROSS 2 OR 3 MACHINES, AND THE JOIN OF ITS PARTS [batch 13;
# jobs/the-full-suite-is-split-across-two-or-three-test-machines-and-the-joined-log-is-proved-2026-11-18]. Built on the
# resumable suite (gates/suite-resume.sh, gates/verify-join.sh): a split is a resume whose finished gates came from N
# machines instead of one killed run, so the joined log is proved by the same code that proves a resumed one.
#
#   bash gates/suite-split.sh plan <N>                       the plan for this tree's roster: which gates each part runs
#   bash gates/suite-split.sh join <out stem> <part -all.log>...   check the N parts and write ONE merged journal and log
#
# THE WHOLE PROCEDURE (claude/agents/b13-split-suite-rule.md has the comparison rule):
#   1. every machine: a clone at the SAME sha, the same bundle (`md5sum app.js`), `cd gates && npm ci`, nothing else running.
#   2. machine K of N:  cp gates/gates.sh gates/.gates-run-pK.sh && CT_PART=K/N bash gates/.gates-run-pK.sh '#NNN'
#      -> gates/logs/NNN-pKofN-all.log and gates/logs/NNN-pKofN-resume.tsv, ending `PART OK K/N` (exit 0) or `PART RED`.
#      A part is never a push gate, never says GATES GREEN, skips the fastgate-drive unit layer (the joining run runs it),
#      and runs ONLY the positions the plan gives it.
#   3. copy every part's -all.log and -resume.tsv, byte for byte, into gates/logs/ of ONE machine (any of them).
#   4. there:  bash gates/suite-split.sh join NNN-split gates/logs/NNN-p1ofN-all.log ... gates/logs/NNN-pNofN-all.log
#   5. there:  cp gates/gates.sh gates/.gates-run-join.sh && CT_RESUME=gates/logs/NNN-split-resume.tsv bash gates/.gates-run-join.sh '#NNN'
#      -> NNN-all.log: its own prelude and unit layers, every gate COPIED from its part (md5-checked), the real footer.
#   6. bash gates/verify-log.sh gates/logs/NNN-all.log '#NNN'   (calls verify-join.sh: every gate once, one bundle/tree/state)
#
# WHAT `join` REFUSES (exit 1, `SPLIT JOIN REFUSED: ...`), before anything is written:
#   a part unfinished (no PART OK/RED line) or killed; a part whose prelude moved the tree; a part number missing or given
#   twice; parts of different N; a part on ANOTHER BUNDLE, HEAD, tree, tree state, status, environment, toolchain, build
#   number or roster than part 1; a part run under another plan than this tree computes; a part that ran a position the
#   plan does not give it (a gate run on two machines, or on the wrong one); a journal row out of order, for another
#   gate than the roster's, or whose section bytes do not match its md5; a gate no part ran; a log with more sections or
#   marks than journal rows.
# And the joining run's own resume check re-proves all of it against THIS machine (sr_resume_check): the bundle, HEAD,
# tree, status, roster, environment and toolchain of every part against its own, and each row's part against the plan.
#
# KNOWN LIMITS. (1) Across machines the `gitmeta` digest (.git/config, hooks, info) is NOT compared - two clones differ
# there with nothing a gate reads differing; each part's own prelude still proved its gitmeta did not move. (2) The clone
# path is normalised in the environment digest (<ROOT>), any other path is not: a trial bundle must sit at the same path on
# every machine. (3) Like verify-join, it reads logs the harness wrote; a forger who recomputes every mark and md5 passes.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; G="$HERE"; ROOT="$(dirname "$G")"
. "$HERE/suite-resume.sh" || { echo "SPLIT JOIN REFUSED: could not load $HERE/suite-resume.sh"; exit 2; }
no(){ echo "SPLIT JOIN REFUSED: $1"; [ -n "${2:-}" ] && echo "  $2"; echo "  Nothing was written. Re-run the part(s) named, or fix the cause, and join again."; exit 1; }
roster_from_tree(){ gates=("$G/mountcheck.js"); local f; for f in "$G"/regress/*.js; do [ -e "$f" ] && gates+=("$f"); done; }

cmd="${1:-}"; shift || true
case "$cmd" in
plan)
  n="${1:-}"; [[ "$n" =~ ^[2-9]$ ]] || { echo "usage: gates/suite-split.sh plan <N, 2 to 9>"; exit 2; }
  roster_from_tree; sr_plan_load "$n" || { echo "could not compute a plan for $n parts over ${#gates[@]} gates"; exit 2; }
  echo "plan for $n parts over ${#gates[@]} gates ($(sr_weights_src)), plan md5 $SR_PLANMD5:"
  while IFS=$'\t' read -r k a b w; do
    echo "  part $k/$n: gates $a-$b ($((b-a+1)) gates, $(basename "${gates[$((a-1))]}" .js) to $(basename "${gates[$((b-1))]}" .js)), weight $w   -> CT_PART=$k/$n"
  done <<<"$SR_PLAN"
  exit 0 ;;
join) ;;
*) echo "usage: gates/suite-split.sh plan <N> | join <out stem> <part -all.log>..."; exit 2 ;;
esac

OUT="${1:-}"; shift || true
[[ "$OUT" =~ ^[0-9]{3,4}[A-Za-z0-9-]*$ ]] || no "the out stem '$OUT' must look like NNN-split (it names gates/logs/<stem>-all.log and -resume.tsv)."
[ "$#" -ge 2 ] || no "give every part's -all.log (2 to 9 of them); got $#."
OUTALL="$G/logs/$OUT-all.log"; OUTJ="$G/logs/$OUT-resume.tsv"
[ ! -e "$OUTALL" ] && [ ! -e "$OUTJ" ] || no "$OUTALL or $OUTJ already exists; a join never overwrites one."

declare -A BYK=(); PN=""; ROSTERL=""; START0=""; PLAN0=""; LOGS=(); JS=()
for lg in "$@"; do
  [ -f "$lg" ] && [ -r "$lg" ] || no "PART MISSING: $lg is not a readable file."
  case "$lg" in *-all.log) ;; *) no "$lg is not a part's -all.log.";; esac
  j="${lg%-all.log}-resume.tsv"
  [ -f "$j" ] && [ -r "$j" ] || no "PART MISSING: $lg has no journal beside it ($j). Copy both files of every part."
  [ "$(head -1 "$j")" = "$SR_VERSION" ] || no "$j does not start with '$SR_VERSION'."
  [ -z "$(tail -c1 "$j")" ] || no "$j ends in a torn line: that part was killed while writing it. Re-run the part."
  v="$(grep -E '^PART (OK|RED) [0-9]/[0-9] ' "$lg" | tail -1)"
  [ -n "$v" ] || no "PART UNFINISHED: $lg carries no 'PART OK' or 'PART RED' line - the part was killed or is still running, or it is not a part's log. Re-run it."
  grep -qE '^(GATES (GREEN|RED)|SUBSET (OK|RED)) ' "$lg" && no "$lg carries a GATES or SUBSET verdict: it is not a part's log."
  grep -q '^TREE MOVED BEFORE THE BROWSER GATES' "$lg" && no "$lg: that part's prelude says TREE MOVED BEFORE THE BROWSER GATES."
  grep -q '^tree unchanged before the browser gates' "$lg" || no "$lg carries no 'tree unchanged before the browser gates' line."
  pl="$(grep -E '^suite-split: part [0-9]/[0-9] ran gates ' "$lg" | tail -1)"
  [[ "$pl" =~ ^suite-split:\ part\ ([0-9])/([0-9])\ ran\ gates\ ([0-9]+)-([0-9]+)\ of\ ([0-9]+)\ \|\ run\ ([^ ]+)\ \|\ .*\ \|\ plan\ ([0-9a-f]{32})\ \|\ journal\ .*$ ]] \
    || no "$lg carries no parsable 'suite-split: part K/N ran gates a-b' line."
  k="${BASH_REMATCH[1]}"; n="${BASH_REMATCH[2]}"; pa="${BASH_REMATCH[3]}"; pb="${BASH_REMATCH[4]}"; pstem="${BASH_REMATCH[6]}"; pplan="${BASH_REMATCH[7]}"
  [ "$pstem" = "$(basename "${lg%-all.log}")" ] || no "$lg says it is run $pstem: renamed after it ran."
  [ -z "$PN" ] && PN="$n"
  [ "$n" = "$PN" ] || no "PARTS OF DIFFERENT SPLITS: $lg is part $k of $n, the first part given is of $PN."
  [ -z "${BYK[$k]:-}" ] || no "PART GIVEN TWICE: part $k/$n is both ${BYK[$k]} and $lg - a part run on two machines counts its gates twice."
  BYK[$k]="$lg"
  rl="$(grep '^gates ran (' "$lg" | tail -1)"; [ -z "$ROSTERL" ] && ROSTERL="$rl"
  [ "$rl" = "$ROSTERL" ] || no "ANOTHER ROSTER: $lg ran over another gate list than ${LOGS[0]}."
  st="$(grep $'^start\t' "$j")"; [ "$(grep -c $'^start\t' "$j")" = 1 ] || no "$j carries $(grep -c $'^start\t' "$j") start rows, not 1."
  # fields: start N stem all app bundle head tree td sd rd ed ng tc date - compare all but stem, all, app and date
  cmpf="$(cut -f2,6-14 <<<"$st")"
  if [ -z "$START0" ]; then START0="$cmpf"; START0ROW="$st"; PLAN0="$pplan"; else
    if [ "$cmpf" != "$START0" ]; then
      names=(number bundle head tree tree-state status roster environment roster-count toolchain); why=""
      for i in 1 2 3 4 5 6 7 8 9 10; do a="$(cut -f$i <<<"$START0")"; b="$(cut -f$i <<<"$cmpf")"; [ "$a" = "$b" ] || why="$why ${names[$((i-1))]} ($a against $b);"; done
      case "$why" in *" bundle ("*) w1="ANOTHER BUNDLE";; *" head ("*|*" tree ("*) w1="ANOTHER TREE";; *) w1="ANOTHER STATE";; esac
      no "$w1: $lg did not run on what ${LOGS[0]} ran on:$why" "Every machine needs a clone at the same sha with the same app.js, toolchain and CT_* options."
    fi
  fi
  [ "$pplan" = "$PLAN0" ] || no "ANOTHER PLAN: $lg was assigned by plan $pplan, ${LOGS[0]} by $PLAN0."
  LOGS+=("$lg"); JS+=("$j")
done
[ "${#LOGS[@]}" = "$PN" ] || { miss=""; for ((k=1; k<=PN; k++)); do [ -n "${BYK[$k]:-}" ] || miss="$miss $k"; done
  no "PART MISSING: a $PN-part split needs $PN part logs, $# given; missing part(s):$miss."; }
for ((k=1; k<=PN; k++)); do [ -n "${BYK[$k]:-}" ] || no "PART MISSING: part $k/$PN is not among the logs given."; done

# the roster from part 1's log, and the plan THIS tree computes for it
read -r -a RN <<<"$(sed -E 's/^gates ran \([0-9]+\): *//' <<<"$ROSTERL")"
gates=(); for nm in "${RN[@]}"; do gates+=("$G/regress/$nm.js"); done
[ "${#gates[@]}" = "$(cut -f9 <<<"$START0")" ] || no "the roster line names ${#gates[@]} gates and the journals' start rows $(cut -f9 <<<"$START0")."
sr_plan_load "$PN" || no "could not compute the plan for $PN parts over ${#gates[@]} gates."
[ "$SR_PLANMD5" = "$PLAN0" ] || no "ANOTHER PLAN: the parts ran under plan $PLAN0 and this tree computes $SR_PLANMD5 for their roster (the roster or gates/suite-split-seconds.tsv differs)."

# every part's rows: exactly its plan's positions, in order, each section's bytes matching its md5, as many marks and
# sections in its log as rows
declare -a SRCLOG=() SROFF=() SRLEN=() SRMD5=() SRSTEM=() SRVD=() SRK=()
for ((k=1; k<=PN; k++)); do
  lg="${BYK[$k]}"; j="${lg%-all.log}-resume.tsv"
  IFS=$'\t' read -r _k pa pb _w < <(sed -n "${k}p" <<<"$SR_PLAN")
  bad="$(grep -vcE '^(#suite-resume v1|start	.*|gate	[0-9]+	[^	]+	[^	]+	(green|red)	[0-9]+	[0-9]+	[0-9a-f]{32})$' "$j")"
  [ "$bad" = 0 ] || no "$j carries $bad row(s) that are not a part journal's (version, start, gate)."
  psize="$(sr_size "$lg")"; want="$pa"; nrow=0
  while IFS=$'\t' read -r tag i nm st vd off len m; do
    [ "$tag" = gate ] || continue
    if [ "$i" -lt "$pa" ] || [ "$i" -gt "$pb" ]; then
      [ -n "${SRK[$i]:-}" ] && no "GATE COUNTED TWICE: gate $i ($nm) was run by part ${SRK[$i]} and by part $k ($lg)."
      no "GATE RUN BY THE WRONG PART: part $k/$PN ran gate $i ($nm); the plan gives it gates $pa-$pb, so gate $i would be counted twice."
    fi
    [ "$i" = "$want" ] || no "OUT OF ORDER: part $k's journal row $want expected, found row $i ($nm) - a gap, a repeat or a reordered gate."
    [ "$nm" = "${RN[$((i-1))]}" ] || no "REORDERED: part $k's row $i names $nm but roster position $i is ${RN[$((i-1))]}."
    [ "$st" = "$(basename "${lg%-all.log}")" ] || no "part $k's row $i names run $st, not this part."
    [ $((off+len)) -le "$psize" ] || no "part $k's gate $i ($nm) lies past the end of $lg: truncated or replaced."
    [ "$(sr_bytes_md5 "$lg" "$off" "$len")" = "$m" ] || no "part $k's gate $i ($nm): its section in $lg does not match the md5 its journal recorded - edited or not copied byte for byte."
    SRCLOG[$i]="$lg"; SROFF[$i]="$off"; SRLEN[$i]="$len"; SRMD5[$i]="$m"; SRSTEM[$i]="$st"; SRVD[$i]="$vd"; SRK[$i]="$k"
    want=$((want+1)); nrow=$((nrow+1))
  done < "$j"
  [ "$want" = $((pb+1)) ] || no "PART INCOMPLETE: part $k/$PN journaled gates $pa-$((want-1)) of its $pa-$pb (gate $want onward has no row)."
  nm_="$(grep -ac '^    resume-mark: ' "$lg")"; ns_="$(grep -ac '^=== ' "$lg")"
  [ "$nm_" = "$nrow" ] && [ "$ns_" = "$nrow" ] || no "part $k: $lg holds $ns_ section(s) and $nm_ mark(s) against $nrow journal row(s) - a gate ran that its journal does not account for."
done
for ((i=1; i<=${#RN[@]}; i++)); do [ -n "${SRK[$i]:-}" ] || no "GATE MISSING: gate $i (${RN[$((i-1))]}) was run by no part."; done

# write: part 1's prelude, then every section in roster order; the journal with one split row and the new offsets
p1="${BYK[1]}"; off1="${SROFF[1]}"
tmpa="$OUTALL.tmp.$$"; tmpj="$OUTJ.tmp.$$"
sr_bytes "$p1" 0 "$off1" > "$tmpa"
{ printf '%s\n' "$SR_VERSION"
  IFS=$'\t' read -r -a SF0 <<<"$START0ROW"; SF0[2]="$OUT"; SF0[3]="$OUTALL"; (IFS=$'\t'; printf '%s\n' "${SF0[*]}")
  printf 'split\t%s\t%s\n' "$PN" "$SR_PLANMD5"
  for ((i=1; i<=${#RN[@]}; i++)); do
    now="$(sr_size "$tmpa")"; sr_bytes "${SRCLOG[$i]}" "${SROFF[$i]}" "${SRLEN[$i]}" >> "$tmpa"
    [ "$(sr_bytes_md5 "$tmpa" "$now" "${SRLEN[$i]}")" = "${SRMD5[$i]}" ] || { echo "COPY FAILED at gate $i" >&2; exit 3; }
    printf 'gate\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$i" "${RN[$((i-1))]}" "${SRSTEM[$i]}" "${SRVD[$i]}" "$now" "${SRLEN[$i]}" "${SRMD5[$i]}"
  done
} > "$tmpj" || { rm -f "$tmpa" "$tmpj"; no "the copy into $tmpa failed."; }
mv "$tmpa" "$OUTALL" && mv "$tmpj" "$OUTJ"
nred=0; for ((i=1; i<=${#RN[@]}; i++)); do [ "${SRVD[$i]}" = red ] && nred=$((nred+1)); done
echo "SPLIT JOIN READY: ${#RN[@]} gates from $PN parts ($(for ((k=1; k<=PN; k++)); do IFS=$'\t' read -r _k a b _w < <(sed -n "${k}p" <<<"$SR_PLAN"); printf '%s gates %s-%s; ' "$(basename "${BYK[$k]%-all.log}")" "$a" "$b"; done)$nred red), one bundle, HEAD, tree and state, plan $SR_PLANMD5."
echo "  merged log $OUTALL and journal $OUTJ. Now, on THIS machine, the joining run (it runs the prelude, the unit layers and the footer, and copies every gate):"
echo "  cp gates/gates.sh gates/.gates-run-join.sh && CT_RESUME=$OUTJ bash gates/.gates-run-join.sh '$(cut -f1 <<<"$START0")'"
exit 0
