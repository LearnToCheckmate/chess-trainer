#!/usr/bin/env bash
# gates/suite-split-selftest.sh - the controls for the full suite split across machines (TC-R257).
# jobs/the-full-suite-is-split-across-two-or-three-test-machines-and-the-joined-log-is-proved-2026-11-18; the runner is
# CT_PART in gates/gates.sh and gates/suite-resume.sh, the join is gates/suite-split.sh, the judge gates/verify-join.sh.
# Node and shell only, no browser, no network; it never touches the real tree.
#
#   bash gates/suite-split-selftest.sh        prints PASS/FAIL TC-R257<x><n> lines and a footer; exit 0 only if no FAIL
#
# WHAT IT RUNS. As gates/suite-resume-selftest.sh does, it EXTRACTS the real gate loop and its hooks out of gates/gates.sh
# (tree_fingerprint, obs_records, tree_fp_moved, resume hook (a) with the CT_PART line, the whole loop, the part exit line,
# hook (d)) and runs them over SIX tiny node gates in throwaway repositories. THE MACHINES are three clones of one sandbox
# commit at three DIFFERENT paths (so their .git/config and their clone path differ, as two cloud sessions' would), each
# running its part with CT_PART=K/3; the parts' files are copied into machine 1, joined there with the real
# gates/suite-split.sh, and the joining run (CT_RESUME=<merged journal>) is the real loop again. NOT RUN: the prelude, the
# unit layers and the real footer (the driver writes a minimal header and footer), and a real browser suite on real
# separate machines - that is the suite window's job (claude/agents/b13-split-suite-rule.md).
#   a  the plan: deterministic, contiguous, every position once, balanced by seconds when gates/suite-split-seconds.tsv
#      exists, and on this repository's real roster.
#   b  the split run: three parts on three machines, joined, the joining run green with every gate copied once, equal
#      PASS/FAIL lines to a serial run, and verify-join reading three parts.
#   c  the controls, each refused by name: a part from another bundle, a gate run on two machines (counted twice), a part
#      missing, a reordered gate, a part given twice, a part unfinished, a section edited, a merged row moved to the wrong
#      machine (refused by the joining run), and a joined log whose parts are out of order (refused by verify-join).
#   d  gates.sh's own refusals of a malformed CT_PART, and the hooks off when CT_PART is unset.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/.." && pwd)"
SF="$HERE/gates.sh"; SR="$HERE/suite-resume.sh"; VJ="$HERE/verify-join.sh"; SP="$HERE/suite-split.sh"; SC="$HERE/suite-compare.js"
for f in "$SF" "$SR" "$VJ" "$SP" "$SC" "$HERE/fastgate.sh"; do [ -r "$f" ] || { echo "FAIL TC-R257z0 cannot read $f"; exit 1; }; done
command -v node >/dev/null || { echo "FAIL TC-R257z0 node is not on PATH"; exit 1; }
TD="$(mktemp -d)"
cleanup(){ [ -n "${CT_SP_KEEP:-}" ] && { echo "kept $TD"; return; }; rm -rf "$TD"; }
trap cleanup EXIT
P=0; F=0
ok(){ P=$((P+1)); printf 'PASS %s\n' "$1"; }
bad(){ F=$((F+1)); printf 'FAIL %s\n' "$1"; }
eqc(){ if [ "$2" = "$3" ]; then ok "$1 ($3)"; else bad "$1 (got [$2], wanted [$3])"; fi; }
has(){ grep -qF -- "$2" "$1"; }

# ── the driver: the REAL code of gates.sh around a minimal header and footer ──────────────────────────────────────
DRV="$TD/driver.sh"
{
  echo 'set -uo pipefail'
  echo 'N="${DRV_N:-#999}"; TAG="${N#\#}"; G="$SB/gates"; ROOT="$SB"; STEM="$DRV_STEM"; SUBSET=""'
  echo 'mkdir -p "$G/logs"; ALL="$G/logs/$STEM-all.log"; : > "$ALL"'
  echo 'APP="$DRV_APP"; BUNDLE_MD5="$(md5sum "$APP" | cut -c1-12)"; export CT_SHOTS="$G/shots/gates-$TAG"   # a CT_ path under the clone, as gates.sh exports'
  awk '/^tree_fingerprint\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$SF"
  awk '/^obs_records\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$SF"
  awk '/^tree_fp_moved\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$SF"
  echo 'HEADSHA="$(git -C "$ROOT" rev-parse HEAD)"; HEADTREE="$(git -C "$ROOT" rev-parse "HEAD^{tree}")"'
  echo 'DIRTYL0="$(git -C "$ROOT" status --porcelain 2>/dev/null || true)"; TREEFP0="$(tree_fingerprint "$ROOT")"'
  echo 'echo "gates.sh $N  bundle $APP  md5 $BUNDLE_MD5  (selftest driver)" | tee -a "$ALL"'
  echo 'gates=(); for g in 01-alpha 02-bravo 03-charlie 04-delta 05-echo 06-foxtrot; do gates+=("$G/regress/$g.js"); done'
  echo 'red=0'
  awk '/^SR_ON=0$/{p=1} p{print} p&&/^fi$/{exit}' "$SF"
  awk '/^TREEMOVED="\$\(tree_fp_moved/{p=1} p{print} p&&/^else echo "tree unchanged before the browser gates/{exit}' "$SF"
  awk '/^for f in "\$\{gates\[@\]\}"; do$/{p=1} p{print} p&&/^done$/{exit}' "$SF"
  grep -m1 '^if \[ -n "\${SR_PK:-}" \]; then sr_part_footer; exit \$?; fi' "$SF"
  echo 'REGN=$(awk '"'"'/^=== .* ===$/{s=1} s&&/^PASS/{n++} END{print n+0}'"'"' "$ALL")'
  echo 'echo "regression assertions (PASS lines): $REGN" | tee -a "$ALL"'
  grep -m1 '^if \[ "\$SR_ON" = 1 \]; then sr_footer; fi' "$SF"
  echo 'echo "gates ran (${#gates[@]}): $(for f in "${gates[@]}"; do printf "%s " "$(basename "$f" .js)"; done)" | tee -a "$ALL"'
  echo 'echo "ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5" | tee -a "$ALL"'
  echo 'if [ $red -eq 0 ]; then echo "GATES GREEN $N" | tee -a "$ALL"; exit 0; else echo "GATES RED $N" | tee -a "$ALL"; exit 1; fi'
} > "$DRV"
for part in 'SR_ON=0' 'export CT_RESUMABLE="${CT_RESUMABLE:-1}"' 'sr_import "$name"' 'sr_mark "$name"' 'sr_part_footer; exit $?' 'sr_footer'; do
  grep -qF -- "$part" "$DRV" || { echo "FAIL TC-R257z0 the driver lacks [$part]: the extraction from gates.sh found nothing"; exit 1; }
done

# ── machine 1: the sandbox repository; machines 2 and 3: clones of it at other paths ──────────────────────────────
M1="$TD/m1/repo"; mkdir -p "$M1/gates/regress" "$TD/out"
cp "$SR" "$VJ" "$SP" "$HERE/fastgate.sh" "$M1/gates/"
printf '%s\n' "process.on('exit',()=>{ if(process.env.CT_OBSERVE_EXIT) console.log('     inputs observed (0): '); });" > "$M1/gates/lib.js"
i=0; for g in 01-alpha 02-bravo 03-charlie 04-delta 05-echo 06-foxtrot; do i=$((i+1))
  printf "console.log('PASS g$i first check'); console.log('PASS g$i measured ' + (40+$i) + 'px  [{\"w\":' + (40+$i) + '}]');\n" > "$M1/gates/regress/$g.js"; done
printf 'gates/logs/\n' > "$M1/.gitignore"
gitc(){ git -C "$1" -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false "${@:2}"; }
( cd "$M1" && git init -q . && git add -A ) && gitc "$M1" commit -q -m "split selftest sandbox" || { echo "FAIL TC-R257z0 could not make the sandbox"; exit 1; }
M2="$TD/m2/elsewhere/repo"; M3="$TD/third-machine/repo"; mkdir -p "$(dirname "$M2")" "$(dirname "$M3")"
git clone -q "$M1" "$M2" && git clone -q "$M1" "$M3" || { echo "FAIL TC-R257z0 could not clone the sandbox"; exit 1; }
printf 'split selftest bundle one\n' > "$TD/out/app.js"; export DRV_APP="$TD/out/app.js"
run(){ local sb="$1"; shift; ( cd "$sb" && env SB="$sb" "$@" bash "$DRV" ) > "$TD/last.out" 2>&1; }
secs(){ grep '^=== ' "$1" | sed 's/^=== //; s/ ===$//' | tr '\n' ' ' | sed 's/ $//'; }
L1="$M1/gates/logs"; L2="$M2/gates/logs"; L3="$M3/gates/logs"

# ════ a. THE PLAN ══════════════════════════════════════════════════════════════════════════════════════════════════
plan(){ ( G="$1"; . "$SR"; sr_plan "${@:2}" ) | awk -F'\t' '{printf "%s:%s-%s/%s ", $1, $2, $3, $4}' | sed 's/ $//'; }
R6="01-alpha 02-bravo 03-charlie 04-delta 05-echo 06-foxtrot"
eqc "TC-R257a1 equal weights (no seconds file): six gates in three parts are three blocks of two" "$(plan "$M1/gates" 3 $R6)" "1:1-2/2 2:3-4/2 3:5-6/2"
eqc "TC-R257a2 and the plan is the same when computed again (deterministic)" "$(plan "$M1/gates" 3 $R6)" "$(plan "$M1/gates" 3 $R6)"
mkdir -p "$TD/wt"; printf '# gate\tseconds\n01-alpha\t600\n02-bravo\t100.4\n03-charlie\t100\n04-delta\t100\n05-echo\t100\n06-foxtrot\t200\n' > "$TD/wt/suite-split-seconds.tsv"
eqc "TC-R257a3 with seconds, the slow first gate is a part of its own and the largest part is as small as it can be" "$(plan "$TD/wt" 3 $R6)" "1:1-1/600 2:2-4/300 3:5-6/300"
printf '01-alpha.js\t50\n' > "$TD/wt/suite-split-seconds.tsv"
eqc "TC-R257a4 a gate the seconds file does not list weighs the median of those it lists (here 50)" "$(plan "$TD/wt" 2 $R6)" "1:1-3/150 2:4-6/150"
real="$(bash "$SP" plan 3 2>&1)"; nreal="$(ls "$HERE"/regress/*.js | wc -l)"
cover="$(grep -oE 'gates [0-9]+-[0-9]+ \(' <<<"$real" | awk '{split($2,r,"-"); if (r[1]!=e+1) bad=1; n+=r[2]-r[1]+1; e=r[2]} END{print (bad?"GAP ":"") n}')"
eqc "TC-R257a5 on this repository's real roster (mountcheck and $nreal regress gates) the 3-part plan covers every position once, in order" "$cover" "$((nreal+1))"

# ════ b. THE SPLIT RUN: three parts on three machines, joined ═══════════════════════════════════════════════════════
run "$M1" DRV_STEM=999u CT_RESUMABLE=1; eqc "TC-R257b1 (reference) a serial run of the six gates is green" "$?" 0
for k in 1 2 3; do eval "MK=\$M$k"; run "$MK" DRV_STEM="999-p${k}of3" CT_PART="$k/3"; eval "RC$k=$?"; cp "$TD/last.out" "$TD/p$k.out"; done
eqc "TC-R257b2 each part exits 0 on its own machine" "$RC1 $RC2 $RC3" "0 0 0"
eqc "TC-R257b3 and runs only the positions the plan gives it" "$(secs "$L1/999-p1of3-all.log") | $(secs "$L2/999-p2of3-all.log") | $(secs "$L3/999-p3of3-all.log")" \
  "01-alpha 02-bravo | 03-charlie 04-delta | 05-echo 06-foxtrot"
eqc "TC-R257b4 each part ends PART OK K/3 and never says GATES GREEN or GATES RED" \
  "$(tail -1 "$L2/999-p2of3-all.log" | cut -c1-14) $(cat "$L1"/999-p1of3-all.log "$L2"/999-p2of3-all.log "$L3"/999-p3of3-all.log | grep -c '^GATES ')" "PART OK 2/3 #9 0"
eqc "TC-R257b5 each part's journal rows are its own positions" "$(cut -f2 <(grep $'^gate\t' "$L3/999-p3of3-resume.tsv")| tr '\n' ' ')" "5 6 "
eqc "TC-R257b6 the three machines' clones sit at three different paths with different .git/config" \
  "$(cmp -s "$M1/.git/config" "$M2/.git/config" && echo same || echo differ) $( [ "$M1" != "$M2" ] && [ "$M2" != "$M3" ] && echo paths-differ )" "differ paths-differ"
cp "$L2/999-p2of3-all.log" "$L2/999-p2of3-resume.tsv" "$L3/999-p3of3-all.log" "$L3/999-p3of3-resume.tsv" "$L1/"
P1="$L1/999-p1of3-all.log"; P2="$L1/999-p2of3-all.log"; P3="$L1/999-p3of3-all.log"
join_(){ ( cd "$M1" && bash gates/suite-split.sh join "$@" ) > "$TD/join.out" 2>&1; }
join_ 999-split "$P1" "$P2" "$P3"; eqc "TC-R257b7 gates/suite-split.sh joins the three parts" "$? $(grep -c '^SPLIT JOIN READY: 6 gates from 3 parts' "$TD/join.out")" "0 1"
eqc "TC-R257b8 the merged journal carries one split row and six gate rows, in order" "$(grep -c $'^split\t3\t' "$L1/999-split-resume.tsv") $(grep $'^gate\t' "$L1/999-split-resume.tsv" | cut -f2 | tr '\n' ' ')" "1 1 2 3 4 5 6 "
run "$M1" DRV_STEM=999j CT_RESUME="$L1/999-split-resume.tsv"; jrc=$?
eqc "TC-R257b9 the joining run (CT_RESUME=<merged journal>) on machine 1 is green" "$jrc $(tail -1 "$L1/999j-all.log")" "0 GATES GREEN #999"
eqc "TC-R257b10 and says it joins three parts" "$(grep -c '^suite-split: JOINING 3 part(s)' "$L1/999j-all.log")" 1
eqc "TC-R257b11 its log holds each gate once, in roster order" "$(secs "$L1/999j-all.log")" "$R6"
eqc "TC-R257b12 and ran none of them itself (no per-gate log under its stem)" "$(ls "$L1"/999j-0*.log 2>/dev/null | wc -l)" 0
eqc "TC-R257b13 its footer names the three machines' parts" "$(grep -c '^resume: 3 part(s): 999-p1of3 gates 1-2, 999-p2of3 gates 3-4, 999-p3of3 gates 5-6 | bundle ' "$L1/999j-all.log")" 1
eqc "TC-R257b14 verify-join accepts it as three parts" "$(bash "$VJ" "$L1/999j-all.log" | grep -c '^JOIN OK: 6 gate section(s), each marked once and in roster order, in 3 part(s)')" 1
eqc "TC-R257b15 its PASS and FAIL lines are the serial run's (suite-compare.js: SAME)" "$(node "$SC" "$L1/999u-all.log" "$L1/999j-all.log" | tail -1)" "SUITE COMPARE: SAME apart from numbers"
eqc "TC-R257b16 and --split over serial, serial, split reads SPLIT HOLDS" "$(node "$SC" --split "$L1/999u-all.log" "$L1/999u-all.log" "$L1/999j-all.log" | tail -1 | cut -c1-11)" "SPLIT HOLDS"

# ════ c. THE CONTROLS ══════════════════════════════════════════════════════════════════════════════════════════════
refj(){ # <id+description> <substring> <join args...>: refused by gates/suite-split.sh join, by name, nothing written
  local d="$1" need="$2" out="999-x$RANDOM"; shift 2
  join_ "$out" "$@"; local rc=$?
  if [ "$rc" = 1 ] && grep -qF -- "$need" "$TD/join.out" && [ ! -e "$L1/$out-all.log" ] && [ ! -e "$L1/$out-resume.tsv" ]; then ok "$d (exit 1, nothing written, names \"$need\")"
  else bad "$d (exit $rc; said: $(grep -m1 'REFUSED\|READY' "$TD/join.out" || echo nothing))"; fi
}
# another bundle: part 2 re-run on machine 2 against another app.js
printf 'split selftest bundle TWO\n' > "$TD/out/app2.js"
run "$M2" DRV_STEM=999-p2of3b CT_PART=2/3 DRV_APP="$TD/out/app2.js"; cp "$L2/999-p2of3b-all.log" "$L2/999-p2of3b-resume.tsv" "$L1/"
refj "TC-R257c1 a part from ANOTHER BUNDLE is refused" "ANOTHER BUNDLE" "$P1" "$L1/999-p2of3b-all.log" "$P3"
# a gate run on two machines: part 2's log and journal with part 1's gate 2 section (bytes, md5 and mark as part 1 wrote
# them) put in front of its own, offsets recomputed - what a machine that also ran gate 2 would hand over. (A mutant part
# filter cannot stand in for it: editing suite-resume.sh on machine 2 moves that machine's tree, and the join then refuses
# on ANOTHER STATE first, which is right but not this control.)
mkdir -p "$TD/twice"; T2="$TD/twice/999-p2of3-all.log"; T2J="$TD/twice/999-p2of3-resume.tsv"
IFS=$'\t' read -r _t _i _n _s _v o1 l1 m1 < <(grep $'^gate\t2\t' "$L1/999-p1of3-resume.tsv")
o2="$(grep $'^gate\t3\t' "$L1/999-p2of3-resume.tsv" | cut -f6)"
{ head -c "$o2" "$P2"; dd if="$P1" iflag=skip_bytes,count_bytes skip="$o1" count="$l1" status=none; tail -c +"$((o2+1))" "$P2"; } > "$T2"
{ head -2 "$L1/999-p2of3-resume.tsv"; printf 'gate\t2\t02-bravo\t999-p2of3\tgreen\t%s\t%s\t%s\n' "$o2" "$l1" "$m1"
  grep $'^gate\t' "$L1/999-p2of3-resume.tsv" | awk -F'\t' -v OFS='\t' -v d="$l1" '{$6=$6+d; print}'; } > "$T2J"
eqc "TC-R257c2 (setup) that part's log holds gates 2, 3 and 4, and its journal's md5s match its bytes" \
  "$(secs "$T2") $(while IFS=$'\t' read -r t i n s v o l m; do [ "$t" = gate ] && [ "$(dd if="$T2" iflag=skip_bytes,count_bytes skip="$o" count="$l" status=none | md5sum | cut -c1-32)" = "$m" ] && printf y; done < "$T2J")" \
  "02-bravo 03-charlie 04-delta yyy"
refj "TC-R257c2 a GATE RUN ON TWO MACHINES (part 2 also ran part 1's gate 2) is refused, not counted twice" "GATE COUNTED TWICE: gate 2 (02-bravo) was run by part 1" "$P1" "$T2" "$P3"
refj "TC-R257c3 a PART MISSING (part 2 of 3 not given) is refused" "PART MISSING" "$P1" "$P3"
refj "TC-R257c4 a PART GIVEN TWICE (part 1 given again) is refused" "PART GIVEN TWICE" "$P1" "$P2" "$P3" "$P1"
# a reordered gate: part 3's journal rows swapped
cp "$P3" "$L1/999-p3of3r-all.log"; sed -i 's/| run 999-p3of3 |/| run 999-p3of3r |/; s/^suite-split: part 3\/3 \(.*\) | run 999-p3of3 |/suite-split: part 3\/3 \1 | run 999-p3of3r |/' "$L1/999-p3of3r-all.log"
{ head -2 "$L1/999-p3of3-resume.tsv"; grep $'^gate\t6\t' "$L1/999-p3of3-resume.tsv"; grep $'^gate\t5\t' "$L1/999-p3of3-resume.tsv"; } | sed 's/\t999-p3of3\t/\t999-p3of3r\t/' > "$L1/999-p3of3r-resume.tsv"
refj "TC-R257c5 a REORDERED GATE (part 3's two rows swapped) is refused" "OUT OF ORDER" "$P1" "$P2" "$L1/999-p3of3r-all.log"
# a part unfinished: its verdict line gone (killed before its footer)
grep -v '^PART OK ' "$P2" > "$L1/999-p2of3u-all.log"; cp "$L1/999-p2of3-resume.tsv" "$L1/999-p2of3u-resume.tsv"
refj "TC-R257c6 a PART UNFINISHED (no PART OK/RED line) is refused" "PART UNFINISHED" "$P1" "$L1/999-p2of3u-all.log" "$P3"
# a section edited after its part wrote it
cp "$P3" "$TD/p3.keep"; sed -i 's/^PASS g5 first check$/PASS g5 first chock/' "$P3"
refj "TC-R257c7 a part whose section was edited (not copied byte for byte) is refused" "does not match the md5" "$P1" "$P2" "$P3"
cp "$TD/p3.keep" "$P3"
# the joining run's own check: a merged row's stem moved to another part, the md5s untouched
cp "$L1/999-split-all.log" "$L1/999-splitw-all.log"; sed "s/\t999-split\t/\t999-splitw\t/; s|$L1/999-split-all.log|$L1/999-splitw-all.log|; s/^\(gate\t3\t03-charlie\t\)999-p2of3\t/\1999-p1of3\t/" "$L1/999-split-resume.tsv" > "$L1/999-splitw-resume.tsv"
run "$M1" DRV_STEM=999jw CT_RESUME="$L1/999-splitw-resume.tsv"; rc=$?
eqc "TC-R257c8 the joining run refuses a merged row whose part is not the plan's, before any gate" "$rc $(grep -c 'a gate run on the wrong machine' "$TD/last.out") $(grep -c '^=== ' "$TD/last.out")" "1 1 0"
printf 'split selftest bundle THREE\n' > "$TD/out/app3.js"
run "$M1" DRV_STEM=999jb CT_RESUME="$L1/999-split-resume.tsv" DRV_APP="$TD/out/app3.js"; rc=$?
eqc "TC-R257c9 the joining run on another bundle than the parts' is refused" "$rc $(grep -c 'RESUME REFUSED: ANOTHER BUNDLE' "$TD/last.out")" "1 1"
# the judge: a joined log whose parts are out of order (parts 2 and 3 swapped in every mark and in the footer)
J="$L1/999j-all.log"; sed 's/| run 999-p2of3 |/| run 999-pTMPof3 |/; s/| run 999-p3of3 |/| run 999-p2of3 |/; s/| run 999-pTMPof3 |/| run 999-p3of3 |/; s/999-p2of3 gates 3-4, 999-p3of3 gates 5-6/999-p3of3 gates 3-4, 999-p2of3 gates 5-6/' "$J" > "$TD/swapped-all.log"
eqc "TC-R257c10 verify-join refuses a joined log whose parts are out of order (every other check satisfied)" "$(bash "$VJ" "$TD/swapped-all.log" | grep -c "A SPLIT'S PARTS OUT OF ORDER")" 1
grep -v "A SPLIT'S PARTS\|A SPLIT WITH A PART\|A SPLIT MIXED" "$VJ" | awk '/^# \[suite-split; batch 13\] A SPLIT/{skip=1} skip&&/^fi$/{skip=0; next} !skip' > "$TD/vj-nosplit.sh"
eqc "TC-R257c10m control: verify-join without its split arm accepts that log (so the arm is what refuses it)" "$(bash "$TD/vj-nosplit.sh" "$TD/swapped-all.log" >/dev/null 2>&1; echo $?) $(grep -c 'A SPLIT' "$TD/vj-nosplit.sh")" "0 0"

# ════ d. gates.sh's refusals, and off by default ═════════════════════════════════════════════════════════════════
gs(){ ( cd "$REPO" && env CT_GATES_NO_COPY=1 "$@" bash "$SF" '#999' ${SUBSETARG:-} ) 2>&1 | head -3; }
for bad_ in 4/3 0/3 3 1/1 a/b; do
  eqc "TC-R257d1 gates.sh refuses CT_PART=$bad_ before any gate, lock or log" "$(gs CT_PART="$bad_" | grep -c 'REFUSED BEFORE ANY GATE RAN - CT_PART=')" 1
done
eqc "TC-R257d2 gates.sh refuses CT_PART on a subset" "$(SUBSETARG=01-x gs CT_PART=1/2 | grep -c 'REFUSED BEFORE ANY GATE RAN - CT_PART=')" 1
eqc "TC-R257d3 gates.sh refuses CT_PART beside CT_RESUME" "$(gs CT_PART=1/2 CT_RESUME=/nonexistent | grep -c 'REFUSED BEFORE ANY GATE RAN - CT_PART=')" 1
run "$M1" DRV_STEM=999o; eqc "TC-R257d4 with CT_PART unset the driver runs all six gates, writes no journal and no split line" \
  "$? $(grep -c '^=== ' "$L1/999o-all.log") $( [ -e "$L1/999o-resume.tsv" ] && echo journal || echo no-journal) $(grep -c 'suite-split\|resume' "$L1/999o-all.log")" "0 6 no-journal 0"
eqc "TC-R257d5 the part's log name comes from CT_PART in gates.sh (NNN-pKofN-all.log)" "$(grep -c 'PSFX="-p${CT_PART%/\*}of${CT_PART#\*/}"' "$SF")" 1
eqc "TC-R257d6 a part skips the fastgate-drive unit layer (both of its conditions carry CT_PART)" "$(grep -c '^if \[ -z "\$SUBSET" \] && \[ -z "\${CT_PART:-}" \] && \[ !\? \?-f "\$DRIVESH" \]; then$' "$SF")" 2

echo "suite-split selftest: $P pass, $F fail"
[ "$F" -eq 0 ]
