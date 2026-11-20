#!/usr/bin/env bash
# gates/verify-join.sh <log> - THE JOIN JUDGE for a full suite that was resumed after a container restart.
# jobs/the-full-suite-resumes-after-a-container-restart-from-the-first-unfinished-gate-2026-11-18; design
# claude/agents/SUITE-RESUME-DESIGN.md section 6 (to be reviewed before use).
#
# gates/verify-log.sh calls this ONLY when the log carries a `    resume-mark: ` or `resume: ` line, which no log does
# unless its suite was launched with CT_RESUMABLE or CT_RESUME (gates/suite-resume.sh). Everything verify-log.sh already
# checks still applies to a joined log; this adds what a join can get wrong and an unbroken log cannot:
#   - every gate section carries exactly one mark, as its last line, and every mark sits in a section;
#   - mark i of n names section i, n is the roster count, and the names in order ARE the roster: a gate MISSING or a
#     gate COUNTED TWICE is refused by name even when the two cancel out in the section count;
#   - every mark names the same bundle, HEAD, tree and state (tree, status and environment-with-toolchain digests)
#     (two parts with different hashes are refused), the bundle begins with the header's md5 and the HEAD is the ref
#     line's (another bundle or tree than the log says it gated);
#   - every 'toolchain: playwright' line the gates printed is one and the same line [review 1b]: a join across a
#     node, Playwright or Chromium change is refused even where gates.sh's footer reads only the first such line;
#   - each section's body md5 is its mark's (edited after it was written, or pasted from elsewhere);
#   - exactly one `resume:` footer line, agreeing with the marks: same hashes, and its parts are the marks' run stems as
#     contiguous blocks in order.
# KNOW ITS LIMIT (the #419 limit): it reads only the log, and the marks were written by the harness that wrote the
# sections. A forger who recomputes marks passes it; provenance comes from gates.sh's start checks and the lock.
# Exit 0 with `JOIN OK: ...`; exit 1 with `REFUSED (join): ...`.
set -uo pipefail
LOG="${1:-}"
[ -n "$LOG" ] && [ -f "$LOG" ] && [ -r "$LOG" ] || { echo "REFUSED (join): no readable log given (usage: gates/verify-join.sh <log>)"; exit 1; }
no(){ echo "REFUSED (join): $LOG - $1"; [ -n "${2:-}" ] && echo "  $2"; echo "  A joined suite log authorises a push only when every part is proven to be the same run (claude/agents/SUITE-RESUME-DESIGN.md section 6)."; exit 1; }

HMD5="$(head -1 "$LOG" | grep -o 'md5 [0-9a-f]\{12,32\}' | sed -n '1s/^md5 //p')"
[ -n "$HMD5" ] || no "its header line carries no 'md5 <hex>', so the bundle it says it gated is unknown."
REFHEAD="$(grep '^ref: HEAD ' "$LOG" | tail -1 | awk '{print $3}')"
[ -n "$REFHEAD" ] || no "it carries no 'ref: HEAD <sha>' line, so the tree it says it gated is unknown."
ROSTER="$(grep '^gates ran (' "$LOG" | tail -1)"
[ -n "$ROSTER" ] || no "it carries no 'gates ran (N):' roster line."
RN="$(sed -E 's/^gates ran \(([0-9]+)\):.*/\1/' <<<"$ROSTER")"
[[ "$RN" =~ ^[0-9]+$ ]] || no "its roster line carries no count."
read -r -a RNAMES <<<"$(sed -E 's/^gates ran \([0-9]+\): *//' <<<"$ROSTER")"
[ "${#RNAMES[@]}" = "$RN" ] || no "its roster says $RN gates but names ${#RNAMES[@]}."

NRES="$(grep -cE '^resume: [0-9]+ part\(s\): ' "$LOG")"; NMARK="$(grep -c '^    resume-mark: ' "$LOG")"
[ "$NRES" = 1 ] || no "it carries $NRES 'resume:' footer line(s); a resumable run writes exactly one."
[ "$NMARK" -ge 1 ] || no "it carries a 'resume:' line and no gate marks, so no section can be traced to a run."
NTC="$(grep -a 'toolchain: playwright' "$LOG" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | LC_ALL=C sort -u | grep -c .)"
[ "$NTC" -le 1 ] || no "TWO TOOLCHAINS: its gate sections print $NTC different 'toolchain: playwright' lines, so its parts ran on different node, Playwright or Chromium builds." "$(grep -a 'toolchain: playwright' "$LOG" | sed 's/^[[:space:]]*//' | LC_ALL=C sort -u | tr '\n' ';')"

# one row per section: name, first line, last line, marks inside, line of the last mark, that mark's text
SECS="$(awk '
  function close_sec(endl){ if(name!=""){ printf "%s\t%d\t%d\t%d\t%d\t%s\n", name, st, endl, nm, ml, mt }; name="" }
  /^=== .* ===$/ { close_sec(NR-1); name=$0; sub(/^=== /,"",name); sub(/ ===$/,"",name); st=NR; nm=0; ml=0; mt=""; next }
  /^--- / || /^regression assertions \(PASS lines\)/ { close_sec(NR-1); next }
  /^    resume-mark: / { if(name!=""){ nm++; ml=NR; mt=$0 } else { stray++ } }
  END{ close_sec(NR); if(stray>0) printf "STRAY\t%d\n", stray }' "$LOG")"
STRAY="$(grep '^STRAY	' <<<"$SECS" | cut -f2)"
[ -z "$STRAY" ] || no "$STRAY mark line(s) sit outside any gate section."
SECS="$(grep -v '^STRAY	' <<<"$SECS")"
SN="$(grep -c . <<<"$SECS")"

# names: each roster name exactly once, nothing else
declare -A SEEN=()
while IFS=$'\t' read -r name _rest; do SEEN[$name]=$(( ${SEEN[$name]:-0} + 1 )); done <<<"$SECS"
for n in "${!SEEN[@]}"; do [ "${SEEN[$n]}" -le 1 ] || no "GATE COUNTED TWICE: $n has ${SEEN[$n]} sections."; done
for n in "${RNAMES[@]}"; do [ -n "${SEEN[$n]:-}" ] || no "GATE MISSING: $n is on the roster and has no section."; done
[ "$SN" = "$RN" ] || no "it holds $SN gate section(s) against a roster of $RN."

B0=""; H0=""; T0=""; k=0; STEMSEQ=()
while IFS=$'\t' read -r name st en nm ml mt; do
  k=$((k+1))
  [ "$nm" = 1 ] || no "section $k ($name) carries $nm mark(s), not 1."
  [ "$ml" = "$en" ] || no "section $k ($name): its mark is not its last line (line $ml, the section ends at $en)."
  [[ "$mt" =~ ^\ \ \ \ resume-mark:\ gate\ ([0-9]+)/([0-9]+)\ ([^ ]+)\ \|\ run\ ([^ ]+)\ \|\ bundle\ ([0-9a-f]{32})\ \|\ head\ ([^ ]+)\ \|\ tree\ ([^ ]+)\ \|\ state\ ([^ ]+)\ \|\ body\ md5\ ([0-9a-f]{32})$ ]] \
    || no "section $k ($name): its mark does not parse." "mark: $mt"
  mi="${BASH_REMATCH[1]}"; mn="${BASH_REMATCH[2]}"; mname="${BASH_REMATCH[3]}"; mstem="${BASH_REMATCH[4]}"
  mb="${BASH_REMATCH[5]}"; mh="${BASH_REMATCH[6]}"; mtr="${BASH_REMATCH[7]}"; mst="${BASH_REMATCH[8]}"; mbody="${BASH_REMATCH[9]}"
  [ "$mname" = "$name" ] || no "section $k is $name but its mark names $mname."
  [ "$mi" = "$k" ] && [ "$mn" = "$RN" ] || no "section $k ($name): its mark says gate $mi/$mn, the log has it at $k of $RN - a gate missing or counted twice in the run that wrote it."
  [ "$name" = "${RNAMES[$((k-1))]}" ] || no "section $k is $name but roster position $k is ${RNAMES[$((k-1))]}."
  if [ -z "$B0" ]; then B0="$mb"; H0="$mh"; T0="$mtr"; S0="$mst"; fi
  [ "$mb" = "$B0" ] || no "TWO PARTS WITH DIFFERENT HASHES: section $k ($name, run $mstem) ran on bundle $mb, section 1 on $B0."
  [ "$mh" = "$H0" ] && [ "$mtr" = "$T0" ] || no "TWO PARTS WITH DIFFERENT HASHES: section $k ($name, run $mstem) ran on HEAD $mh tree $mtr, section 1 on HEAD $H0 tree $T0."
  [ "$mst" = "$S0" ] || no "TWO PARTS WITH DIFFERENT HASHES: section $k ($name, run $mstem) ran in state $mst (tree.status.environment digests), section 1 in $S0."
  bm="$(sed -n "${st},$((en-1))p" "$LOG" | md5sum | cut -c1-32)"
  [ "$bm" = "$mbody" ] || no "section $k ($name): its body md5 is $bm, its mark says $mbody - edited after it was written, or pasted from another log."
  STEMSEQ+=("$mstem")
done <<<"$SECS"
case "$B0" in "$HMD5"*) ;; *) no "ANOTHER BUNDLE: the marks name bundle $B0, the header says md5 $HMD5.";; esac
[ "$H0" = "$REFHEAD" ] || no "ANOTHER TREE: the marks name HEAD $H0, the ref line says $REFHEAD."

# the footer line against the marks
RL="$(grep -E '^resume: [0-9]+ part\(s\): ' "$LOG")"
[[ "$RL" =~ ^resume:\ ([0-9]+)\ part\(s\):\ (.*)\ \|\ bundle\ ([0-9a-f]{32})\ \|\ head\ ([^ ]+)\ \|\ tree\ ([^ ]+)\ \|\ journal\ (.+)$ ]] \
  || no "its 'resume:' line does not parse." "line: $RL"
RP="${BASH_REMATCH[1]}"; RPARTS="${BASH_REMATCH[2]}"; RB="${BASH_REMATCH[3]}"; RH="${BASH_REMATCH[4]}"; RT="${BASH_REMATCH[5]}"
[ "$RB" = "$B0" ] && [ "$RH" = "$H0" ] && [ "$RT" = "$T0" ] || no "its 'resume:' line names bundle $RB HEAD $RH tree $RT, the marks $B0 $H0 $T0."
WANT=""; NP=0; cur=""; a=1; i=0
for s in "${STEMSEQ[@]}" ""; do
  i=$((i+1))
  if [ "$s" != "$cur" ]; then
    if [ -n "$cur" ]; then WANT="${WANT:+$WANT, }$cur gates $a-$((i-1))"; NP=$((NP+1)); fi
    cur="$s"; a=$i
  fi
done
[ "$RPARTS" = "$WANT" ] && [ "$RP" = "$NP" ] || no "its 'resume:' line says $RP part(s): $RPARTS - the marks say $NP part(s): $WANT."
# [suite-split; batch 13] A SPLIT'S PARTS ARE THE MACHINES: when any run stem is a part's (<n>-p<K>of<M>[letter], which only
# CT_PART names), every block must be one, of the same M, and the blocks must be parts 1..M, each once, in that order -
# so a part run twice, a part missing or two parts swapped is refused here even where each mark is otherwise sound.
BLK=(); prev=""; for s in "${STEMSEQ[@]}"; do [ "$s" = "$prev" ] || BLK+=("$s"); prev="$s"; done
if grep -qE -- '-p[0-9]of[0-9][a-z]?$' <<<"$(printf '%s\n' "${BLK[@]}")"; then
  SM=""; k=0
  for s in "${BLK[@]}"; do
    k=$((k+1))
    [[ "$s" =~ -p([0-9])of([0-9])[a-z]?$ ]] || no "A SPLIT MIXED WITH ANOTHER RUN: block $k ($s) is not a part of the split the other blocks belong to."
    [ -z "$SM" ] && SM="${BASH_REMATCH[2]}"
    [ "${BASH_REMATCH[2]}" = "$SM" ] && [ "${BASH_REMATCH[1]}" = "$k" ] || no "A SPLIT'S PARTS OUT OF ORDER: block $k is $s, where part $k of $SM belongs - a part missing, run twice, or two parts swapped."
  done
  [ "$k" = "$SM" ] || no "A SPLIT WITH A PART MISSING: $k block(s) of a $SM-part split."
fi
echo "JOIN OK: $RN gate section(s), each marked once and in roster order, in $NP part(s) ($WANT), all on bundle $B0 HEAD $H0 tree $T0; every body md5 matches its mark."
exit 0
