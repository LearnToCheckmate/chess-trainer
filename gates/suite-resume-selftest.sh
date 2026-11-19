#!/usr/bin/env bash
# gates/suite-resume-selftest.sh - the controls for a full suite that resumes after a container restart (TC-R241).
# jobs/the-full-suite-resumes-after-a-container-restart-from-the-first-unfinished-gate-2026-11-18; design
# claude/agents/SUITE-RESUME-DESIGN.md. Node and shell only, no browser, no network; it never touches the real tree.
#
#   bash gates/suite-resume-selftest.sh        prints PASS/FAIL TC-R241<x><n> lines and a footer; exit 0 only if no FAIL
#
# WHAT IT RUNS, AND WHAT IT DOES NOT. gates.sh's full run needs a browser and about six hours, and this harness may not
# spend one. So, as `gates.sh --selftest` does for its other arms, it EXTRACTS the real code out of gates/gates.sh - the
# functions tree_fingerprint and obs_records, resume hook (a), the WHOLE gate loop with hooks (b) and (c) in it, and
# hook (d) - and runs it in a throwaway repository over a roster of THREE tiny node gates, with a stub lib.js that prints
# the `inputs observed` line the loop requires. The prelude (manifest, door, unit layers) and the real footer are NOT
# run; the driver writes a minimal header, footer and ref line around the extracted code. So this shows the loop, the
# journal, the kill, the import and the join; it does not show a real six-hour suite killed and resumed (left for the
# first run that may spend one: launch it with CT_RESUMABLE=1).
#   a  the joiner: an unbroken resumable run, a run SIGKILLed in the middle of gate 2, the resume, a second kill and
#      a second resume (three parts); the joined log holds each gate once and its PASS/FAIL lines equal the unbroken run's.
#   b  every refusal gates.sh makes before it resumes (design section 6, first table).
#   c  the judge: gates/verify-log.sh (whole) over joins assembled with the same mark and footer code from the real
#      committed green claude/agents/gatelogs/474-integration-all.log - accepted, and each bad join refused; and, as the
#      control, a copy of verify-log.sh with its join hook removed ACCEPTS the bad joins the hook exists for.
#   d  off by default: the gate loop extracted from the BASE commit's gates.sh and from this one, with CT_RESUME and
#      CT_RESUMABLE unset, write byte-identical logs over the same gates.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/.." && pwd)"
SF="$HERE/gates.sh"; SR="$HERE/suite-resume.sh"; VJ="$HERE/verify-join.sh"; VL="$HERE/verify-log.sh"
BASE="${CT_SR_BASE:-1e0c21e8}"   # the commit before the resume hooks, for (d)
for f in "$SF" "$SR" "$VJ" "$VL" "$HERE/fastgate.sh"; do [ -r "$f" ] || { echo "FAIL TC-R241z0 cannot read $f"; exit 1; }; done
command -v node >/dev/null || { echo "FAIL TC-R241z0 node is not on PATH"; exit 1; }

TD="$(mktemp -d)"; KILLPIDS=()
cleanup(){ local p; for p in "${KILLPIDS[@]}"; do case "$p" in [1-9]*) kill -9 -- "-$p" 2>/dev/null ;; esac; done; [ -n "${CT_SR_KEEP:-}" ] && { echo "kept $TD"; return; }; rm -rf "$TD"; }
trap cleanup EXIT
P=0; F=0
ok(){ P=$((P+1)); printf 'PASS %s\n' "$1"; }
bad(){ F=$((F+1)); printf 'FAIL %s\n' "$1"; }
eqc(){ if [ "$2" = "$3" ]; then ok "$1 ($3)"; else bad "$1 (got [$2], wanted [$3])"; fi; }

# ── the driver: the REAL code of gates.sh around a minimal header and footer ──────────────────────────────────────
mkdriver(){ # <gates.sh to extract from> <out>
  local src="$1" out="$2"
  {
    echo 'set -uo pipefail'
    echo 'N="${DRV_N:-#999}"; TAG="${N#\#}"; G="$SB/gates"; ROOT="$SB"; STEM="$DRV_STEM"; SUBSET="${DRV_SUBSET:-}"'
    echo 'mkdir -p "$G/logs"; ALL="$G/logs/$STEM-all.log"; : > "$ALL"'
    echo 'APP="$DRV_APP"; BUNDLE_MD5="$(md5sum "$APP" | cut -c1-12)"'
    awk '/^tree_fingerprint\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$src"
    awk '/^obs_records\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$src"
    awk '/^tree_fp_moved\(\)\{/{p=1} p{print} p&&/^\}/{exit}' "$src"
    echo 'HEADSHA="$(git -C "$ROOT" rev-parse HEAD)"; HEADTREE="$(git -C "$ROOT" rev-parse "HEAD^{tree}")"'
    echo 'DIRTYL0="$(git -C "$ROOT" status --porcelain 2>/dev/null || true)"; TREEFP0="$(tree_fingerprint "$ROOT")"'
    echo 'echo "gates.sh $N  bundle $APP  md5 $BUNDLE_MD5  (selftest driver)" | tee -a "$ALL"'
    echo 'gates=(); for g in ${DRV_ROSTER:-01-alpha 02-bravo 03-charlie}; do gates+=("$G/regress/$g.js"); done'
    echo 'red=0'
    awk '/^SR_ON=0$/{p=1} p{print} p&&/^fi$/{exit}' "$src"
    echo '[ -n "${DRV_MOVE_TREE:-}" ] && : > "$ROOT/written-by-the-prelude.txt"   # stands for a prelude that wrote to the repository'
    echo 'if [ -z "${DRV_NO_TREECHECK:-}" ]; then'
    awk '/^TREEMOVED="\$\(tree_fp_moved/{p=1} p{print} p&&/^else echo "tree unchanged before the browser gates/{exit}' "$src"
    echo "fi"
    awk '/^for f in "\$\{gates\[@\]\}"; do$/{p=1} p{print} p&&/^done$/{exit}' "$src"
    echo 'REGN=$(awk '"'"'/^=== .* ===$/{s=1} s&&/^PASS/{n++} END{print n+0}'"'"' "$ALL")'
    echo 'echo "regression assertions (PASS lines): $REGN" | tee -a "$ALL"'
    grep -m1 '^if \[ "\$SR_ON" = 1 \]; then sr_footer; fi' "$src"
    echo 'echo "gates ran (${#gates[@]}): $(for f in "${gates[@]}"; do printf "%s " "$(basename "$f" .js)"; done)" | tee -a "$ALL"'
    echo 'echo "ref: HEAD $HEADSHA | bundle md5 $BUNDLE_MD5" | tee -a "$ALL"'
    echo 'if [ $red -eq 0 ]; then echo "GATES GREEN $N" | tee -a "$ALL"; exit 0; else echo "GATES RED $N" | tee -a "$ALL"; exit 1; fi'
  } > "$out"
}

# ── the throwaway repository: three tiny gates, a stub lib.js, the real fastgate.sh (obs_records reads classify()) ──
SB="$TD/repo"; OUT="$TD/out"; SR_CTL="$TD/ctl"; mkdir -p "$SB/gates/regress" "$OUT" "$SR_CTL"; export SB SR_CTL
cp "$SR" "$VJ" "$HERE/fastgate.sh" "$SB/gates/"
printf '%s\n' "process.on('exit',()=>{ if(process.env.CT_OBSERVE_EXIT) console.log('     inputs observed (0): '); });" > "$SB/gates/lib.js"
mkgate(){ # <name> <tag>
  cat > "$SB/gates/regress/$1.js" <<EOF
const fs=require('fs'), path=require('path');
const C=process.env.SR_CTL; console.log('PASS $2 first check');
if (C && fs.existsSync(path.join(C,'hold-$1'))) {
  fs.writeFileSync(path.join(C,'started-$1'), String(process.pid)+' '+String(process.ppid));
  const t0=Date.now(); while (Date.now()-t0 < 60000) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100); }
}
if (C && fs.existsSync(path.join(C,'red-$1'))) console.log('FAIL $2 second check'); else console.log('PASS $2 second check');
EOF
}
mkgate 01-alpha g1; mkgate 02-bravo g2; mkgate 03-charlie g3
printf 'gates/logs/\n' > "$SB/.gitignore"
( cd "$SB" && git init -q . && git add -A && git -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false commit -q -m "selftest sandbox" ) \
  || { echo "FAIL TC-R241z0 could not make the sandbox repository"; exit 1; }
printf 'selftest bundle one\n' > "$OUT/app.js"; export DRV_APP="$OUT/app.js"
DRV="$TD/driver.sh"; mkdriver "$SF" "$DRV"
for part in 'SR_ON=0' 'sr_import "$name"' 'sr_mark "$name"' 'for f in "${gates[@]}"; do' 'TREEMOVED="$(tree_fp_moved' 'tree unchanged before the browser gates'; do
  grep -qF -- "$part" "$DRV" || { echo "FAIL TC-R241z0 the driver lacks [$part]: the extraction from gates.sh found nothing"; exit 1; }
done
L="$SB/gates/logs"
run(){ ( cd "$SB" && env "$@" bash "$DRV" ) > "$TD/last.out" 2>&1; }
# run in its own process group, wait for gate <name> to start, then SIGKILL everything: the driver, timeout and node
runkill(){ # <gate name> env...
  local g="$1"; shift
  rm -f "$SR_CTL/started-$g"; touch "$SR_CTL/hold-$g"
  ( cd "$SB" && exec setsid env "$@" bash "$DRV" ) > "$TD/last.out" 2>&1 &
  local pg=$! i=0; KILLPIDS+=("$pg"); disown "$pg" 2>/dev/null   # no job notice: the kill is the point
  while [ ! -s "$SR_CTL/started-$g" ] && [ $i -lt 300 ]; do sleep 0.1; i=$((i+1)); done
  local np pp; read -r np pp < "$SR_CTL/started-$g" 2>/dev/null || true
  [ "$(ps -o pgid= -p "$pg" 2>/dev/null | tr -d ' ')" = "$pg" ] && kill -9 -- "-$pg" 2>/dev/null
  case "${np:-}" in [1-9]*) kill -9 "$np" 2>/dev/null ;; esac
  case "${pp:-}" in [1-9]*) [ "$(cat "/proc/$pp/comm" 2>/dev/null)" = timeout ] && kill -9 "$pp" 2>/dev/null ;; esac
  i=0; while [ -e "/proc/$pg" ] && [ $i -lt 50 ]; do sleep 0.1; i=$((i+1)); done; rm -f "$SR_CTL/hold-$g"
  [ -n "${np:-}" ]
}
secs(){ grep '^=== ' "$1" | tr '\n' ' ' | sed 's/ $//'; }
pf(){ grep -E '^(PASS|FAIL) ' "$1"; }
WANTSECS='=== 01-alpha === === 02-bravo === === 03-charlie ==='

# ════ a. THE JOINER ════════════════════════════════════════════════════════════════════════════════════════════════
run DRV_STEM=999u CT_RESUMABLE=1; rc=$?
eqc "TC-R241a1 an unbroken resumable run over three gates is green" "$rc" 0
eqc "TC-R241a2 and journals three finished gates" "$(grep -c $'^gate\t' "$L/999u-resume.tsv" 2>/dev/null)" 3
eqc "TC-R241a3 and marks each section once" "$(grep -c '^    resume-mark: ' "$L/999u-all.log")" 3
eqc "TC-R241a4 and verify-join reads it as one part" "$(bash "$VJ" "$L/999u-all.log" 2>&1 | grep -c '^JOIN OK: 3 gate section(s), each marked once and in roster order, in 1 part(s)')" 1

runkill 02-bravo DRV_STEM=999 CT_RESUMABLE=1; krc=$?
eqc "TC-R241a5 a run SIGKILLed in the middle of gate 2 (gate 2 had started and printed)" "$krc" 0
eqc "TC-R241a6 left gate 2's section open and unmarked, and one gate journaled" \
  "$(grep -c '^=== 02-bravo ===' "$L/999-all.log") $(grep -c '^    resume-mark: ' "$L/999-all.log") $(grep -c $'^gate\t' "$L/999-resume.tsv")" "1 1 1"
eqc "TC-R241a7 and no verdict line, as after a container restart" "$(grep -cE '^GATES (GREEN|RED)' "$L/999-all.log")" 0

run DRV_STEM=999b CT_RESUME="$L/999-resume.tsv"; rc=$?
eqc "TC-R241a8 the resume from the first unfinished gate is green" "$rc" 0
eqc "TC-R241a9 and says it resumed with 1 of 3 finished" "$(grep -c 'suite-resume: RESUMING from .*: 1 of 3 gates finished there' "$L/999b-all.log")" 1
eqc "TC-R241a10 the joined log holds each gate once, in order" "$(secs "$L/999b-all.log")" "$WANTSECS"
eqc "TC-R241a11 gate 1 was COPIED, not run again (no per-gate log of it under the resumed stem)" "$( [ -e "$L/999b-01-alpha.log" ] && echo ran-again || echo copied ) $( [ -e "$L/999b-02-bravo.log" ] && echo ran || echo not-run )" "copied ran"
eqc "TC-R241a12 its PASS and FAIL lines equal the unbroken run's" "$(diff <(pf "$L/999u-all.log") <(pf "$L/999b-all.log") >/dev/null && echo same || echo differ)" same
eqc "TC-R241a13 its first section is byte-identical to the killed run's" \
  "$(diff <(sed -n '/^=== 01-alpha ===/,/^    resume-mark: /p' "$L/999-all.log") <(sed -n '/^=== 01-alpha ===/,/^    resume-mark: /p' "$L/999b-all.log") >/dev/null && echo same || echo differ)" same
eqc "TC-R241a14 the footer line names two parts" "$(grep -c '^resume: 2 part(s): 999 gates 1-1, 999b gates 2-3 | bundle ' "$L/999b-all.log")" 1
eqc "TC-R241a15 verify-join accepts the joined log" "$(bash "$VJ" "$L/999b-all.log" >/dev/null 2>&1; echo $?)" 0
eqc "TC-R241a16 the footer can say GATES GREEN" "$(tail -1 "$L/999b-all.log")" "GATES GREEN #999"
cp "$L/999-all.log" "$TD/part1-all.log"; cp "$L/999-resume.tsv" "$TD/part1-resume.tsv"

# a second kill, inside the resumed part, and a second resume: three parts
runkill 03-charlie DRV_STEM=999c CT_RESUME="$L/999-resume.tsv"; krc=$?
eqc "TC-R241a17 the resumed part SIGKILLed in the middle of gate 3" "$krc $(grep -c $'^gate\t' "$L/999c-resume.tsv")" "0 2"
run DRV_STEM=999d CT_RESUME="$L/999c-resume.tsv"; rc=$?
eqc "TC-R241a18 a second resume, from the resumed part's journal, is green" "$rc" 0
eqc "TC-R241a19 and its log holds each gate once, in three parts" "$(secs "$L/999d-all.log") | $(grep -o '^resume: 3 part(s): 999 gates 1-1, 999c gates 2-2, 999d gates 3-3' "$L/999d-all.log")" \
  "$WANTSECS | resume: 3 part(s): 999 gates 1-1, 999c gates 2-2, 999d gates 3-3"
eqc "TC-R241a20 PASS and FAIL lines still equal the unbroken run's, and verify-join accepts it" \
  "$(diff <(pf "$L/999u-all.log") <(pf "$L/999d-all.log") >/dev/null && echo same || echo differ) $(bash "$VJ" "$L/999d-all.log" >/dev/null 2>&1; echo $?)" "same 0"
# a red gate carries across the join: gate 1 red in part 1 keeps the joined run red
cp "$SB/gates/regress/01-alpha.js" "$TD/01.keep"
printf '%s\n' "console.log('PASS g1 first check'); console.log('FAIL g1 second check');" > "$SB/gates/regress/01-alpha.js"
( cd "$SB" && git -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false commit -qam "red gate 1" )
runkill 02-bravo DRV_STEM=998 CT_RESUMABLE=1 >/dev/null
run DRV_STEM=998b CT_RESUME="$L/998-resume.tsv"; rc=$?
eqc "TC-R241a21 a gate RED in the killed part keeps the joined run RED" "$rc $(tail -1 "$L/998b-all.log")" "1 GATES RED #999"
cp "$TD/01.keep" "$SB/gates/regress/01-alpha.js"
( cd "$SB" && git -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false commit -qam "gate 1 green again" )
# the kill above must be re-taken on THIS head for the refusals below, which start from a clean killed part 1
runkill 02-bravo DRV_STEM=997 CT_RESUMABLE=1 >/dev/null
J1="$L/997-resume.tsv"; A1="$L/997-all.log"

# ════ b. THE REFUSALS BEFORE A RESUME ══════════════════════════════════════════════════════════════════════════════
refuse(){ # <id+description> <substring> env...
  local d="$1" need="$2"; shift 2
  run "$@"; local rc=$?
  # a herestring, never `grep ... | grep -q` (the pipefail SIGPIPE class, gates/gatemanifest.sh sigpipe)
  local refl; refl="$(grep '^RESUME REFUSED: ' "$TD/last.out" || true)"
  if [ "$rc" = 1 ] && grep -qF -- "$need" <<<"$refl" && ! grep -q '^=== ' "$TD/last.out"; then ok "$d (exit 1, before any gate, names \"$need\")"
  else bad "$d (exit $rc; refusal named: $(grep -m1 'RESUME REFUSED' "$TD/last.out" || echo none); sections run: $(grep -c '^=== ' "$TD/last.out"))"; fi
}
cp "$DRV_APP" "$TD/app.keep"; printf 'selftest bundle TWO\n' > "$DRV_APP"
refuse "TC-R241b1 a resume on ANOTHER BUNDLE is refused" "ANOTHER BUNDLE" DRV_STEM=997x CT_RESUME="$J1"
cp "$TD/app.keep" "$DRV_APP"
H0="$(git -C "$SB" rev-parse HEAD)"
( cd "$SB" && git -c user.name=ct-st -c user.email=ct-st@local -c commit.gpgsign=false commit -q --allow-empty -m "another head, same tree" )
refuse "TC-R241b2 a resume on ANOTHER HEAD (same tree bytes) is refused" "ANOTHER TREE: the killed run gated HEAD" DRV_STEM=997x CT_RESUME="$J1"
git -C "$SB" reset -q --hard "$H0"
printf '\n// edited\n' >> "$SB/gates/regress/03-charlie.js"
refuse "TC-R241b3 a resume after a tracked file was edited (not committed) is refused" "THE WORKING TREE MOVED" DRV_STEM=997x CT_RESUME="$J1"
git -C "$SB" checkout -q -- gates/regress/03-charlie.js
printf 'x\n' > "$SB/new-untracked.txt"
refuse "TC-R241b4 a resume after an untracked file appeared is refused" "THE WORKING TREE MOVED" DRV_STEM=997x CT_RESUME="$J1"
rm -f "$SB/new-untracked.txt"
refuse "TC-R241b5 a resume over ANOTHER ROSTER is refused" "ANOTHER ROSTER" DRV_STEM=997x CT_RESUME="$J1" DRV_ROSTER="01-alpha 03-charlie 02-bravo"
refuse "TC-R241b6 a resume under ANOTHER ENVIRONMENT (a CT_ option) is refused" "ANOTHER ENVIRONMENT" DRV_STEM=997x CT_RESUME="$J1" CT_SETTLE_EXTRA=1
refuse "TC-R241b7 a resume for another build number is refused" "another build number" DRV_STEM=997x CT_RESUME="$J1" DRV_N='#998'
refuse "TC-R241b8 CT_RESUMABLE on a subset run is refused" "SUBSET" DRV_STEM=997x CT_RESUMABLE=1 DRV_SUBSET="01-alpha"
cp "$A1" "$TD/a1.keep"; sed -i 's/^PASS g1 first check$/PASS g1 first chock/' "$A1"
refuse "TC-R241b9 a resume whose killed log was edited in a finished section is refused" "does not match the md5" DRV_STEM=997x CT_RESUME="$J1"
cp "$TD/a1.keep" "$A1"
run DRV_STEM=994 CT_RESUMABLE=1
refuse "TC-R241b10 a resume from a FINISHED run is refused" "FINISHED" DRV_STEM=994x CT_RESUME="$L/994-resume.tsv"
# the gap, repeat and torn cases need a journal of two rows on THIS head
runkill 03-charlie DRV_STEM=996 CT_RESUMABLE=1 >/dev/null; J2="$L/996-resume.tsv"
cp "$J2" "$TD/j2.keep"; sed -i '/^gate\t1\t/d' "$J2"
refuse "TC-R241b11 a journal with a GAP (row 1 gone) is refused" "not a clean prefix" DRV_STEM=996x CT_RESUME="$J2"
cp "$TD/j2.keep" "$J2"; grep $'^gate\t1\t' "$TD/j2.keep" >> "$J2"
refuse "TC-R241b12 a journal with a REPEATED row (gate 1 twice) is refused" "not a clean prefix" DRV_STEM=996x CT_RESUME="$J2"
cp "$TD/j2.keep" "$J2"; printf 'gate\t3\t03-charlie' >> "$J2"
refuse "TC-R241b13 a journal ending in a torn row (killed mid-write) is refused" "torn line" DRV_STEM=996x CT_RESUME="$J2"
cp "$TD/j2.keep" "$J2"
# a section from another run spliced in: its mark names another bundle, the journal's md5 recomputed to match
cp "$A1" "$TD/a1.keep"; cp "$J1" "$TD/j1.keep"
OTHER="$(printf 'another bundle\n' | md5sum | cut -c1-32)"; CUR="$(md5sum "$DRV_APP" | cut -c1-32)"
sed -i "s/| bundle $CUR |/| bundle $OTHER |/" "$A1"
IFS=$'\t' read -r _t _i _n _s _v OFF LEN _m < <(grep $'^gate\t1\t' "$J1")
NEWM="$(dd if="$A1" iflag=skip_bytes,count_bytes skip="$OFF" count="$LEN" status=none | md5sum | cut -c1-32)"
sed -i "s/^\(gate\t1\t.*\t\)[0-9a-f]\{32\}$/\1$NEWM/" "$J1"
refuse "TC-R241b14 a section spliced in from another bundle (md5s made to agree) is refused by its own mark" "spliced in" DRV_STEM=997x CT_RESUME="$J1"
cp "$TD/a1.keep" "$A1"; cp "$TD/j1.keep" "$J1"
refuse "TC-R241b15 a missing journal is refused" "missing or unreadable" DRV_STEM=997x CT_RESUME="$L/no-such-resume.tsv"
run DRV_STEM=997y CT_RESUME="$A1"; rc=$?
eqc "TC-R241b16 CT_RESUME may name the killed -all.log; with nothing changed the resume goes ahead" "$rc $(secs "$L/997y-all.log")" "0 $WANTSECS"

# ── the review's fixes (claude/agents/SUITE-RESUME-REVIEW.md), each a case that fails on the code before the fix ──
# 1a: a CUT journal. Gate 2 red in the killed run, the run killed in gate 3, then gate 2's row cut: the rows are still a
# clean prefix (row 1), gate 2 would re-run here (green) and the red would vanish from the join.
touch "$SR_CTL/red-02-bravo"; runkill 03-charlie DRV_STEM=993 CT_RESUMABLE=1 >/dev/null; rm -f "$SR_CTL/red-02-bravo"
J3="$L/993-resume.tsv"; eqc "TC-R241b17 (setup) the killed run journaled gate 2 RED" "$(grep -c $'^gate\t2\t02-bravo\t993\tred\t' "$J3")" 1
sed -i '/^gate\t2\t/d' "$J3"
refuse "TC-R241b17 a CUT journal (a finished RED gate's row removed) is refused, not resumed green [review 1a]" "the journal was cut" DRV_STEM=993x CT_RESUME="$J3"
# 1a: the unfinished gate had printed FAIL before the restart (killed between its output and its verdict): carried as RED
runkill 02-bravo DRV_STEM=992 CT_RESUMABLE=1 >/dev/null
printf 'PASS g2 first check\nFAIL g2 second check\n' >> "$L/992-all.log"
run DRV_STEM=992b CT_RESUME="$L/992-resume.tsv"; rc=$?
eqc "TC-R241b18 FAIL lines the cut gate had already printed are not dropped: the resumed run is RED and says so [review 1a]" \
  "$rc $(grep -c "^RESUME: the killed run's unfinished gate 02-bravo had printed 1 red line" "$L/992b-all.log") $(tail -1 "$L/992b-all.log")" "1 1 GATES RED #999"
runkill 02-bravo DRV_STEM=991 CT_RESUMABLE=1 >/dev/null
printf 'PASS g2 first check\nPASS g2 second check\n    02-bravo: green (2 PASS)\n' >> "$L/991-all.log"
refuse "TC-R241b19 a green verdict after the last journaled gate (journal cut, or a kill between verdict and row) is refused [review 1a]" "already carries a green verdict" DRV_STEM=991x CT_RESUME="$L/991-resume.tsv"
# 1b: another node (a container restart that brought a new toolchain); no environment variable changes
mkdir -p "$TD/fakebin"; REALNODE="$(command -v node)"
printf '#!/usr/bin/env bash\nif [ "${1:-}" = --version ]; then echo v0.0.0-another-node; exit 0; fi\nexec "%s" "$@"\n' "$REALNODE" > "$TD/fakebin/node"; chmod +x "$TD/fakebin/node"
runkill 02-bravo DRV_STEM=990 CT_RESUMABLE=1 >/dev/null
refuse "TC-R241b20 a resume under ANOTHER TOOLCHAIN (node --version differs, every variable the same) is refused [review 1b]" "ANOTHER TOOLCHAIN" DRV_STEM=990x CT_RESUME="$L/990-resume.tsv" PATH="$TD/fakebin:$PATH"
eqc "TC-R241b21 the start record names node, Playwright, Chromium and fonts" "$(grep -c $'^start\t.*\tnode=v[^ ]* playwright=[^ ]* chromium=[^ ]* fonts=[0-9a-f]*\t' "$L/990-resume.tsv")" 1
# 1c: the killed run's prelude said TREE MOVED (the stray file gone again by the time of the resume)
runkill 02-bravo DRV_STEM=989 CT_RESUMABLE=1 DRV_MOVE_TREE=1 >/dev/null; rm -f "$SB/written-by-the-prelude.txt"
eqc "TC-R241b22 (setup) the killed run's prelude says TREE MOVED" "$(grep -c '^TREE MOVED BEFORE THE BROWSER GATES' "$L/989-all.log")" 1
refuse "TC-R241b22 a resume of a run whose prelude said TREE MOVED is refused [review 1c]" "TREE MOVED BEFORE THE BROWSER GATES" DRV_STEM=989x CT_RESUME="$L/989-resume.tsv"
runkill 02-bravo DRV_STEM=988 CT_RESUMABLE=1 DRV_NO_TREECHECK=1 >/dev/null
refuse "TC-R241b23 a resume of a run with no 'tree unchanged' line is refused [review 1c]" "carries no 'tree unchanged before the browser gates' line" DRV_STEM=988x CT_RESUME="$L/988-resume.tsv"
# 1d: the journal's verdict column edited from red to green; the copied section is red, so the join is red
touch "$SR_CTL/red-01-alpha"; runkill 02-bravo DRV_STEM=987 CT_RESUMABLE=1 >/dev/null; rm -f "$SR_CTL/red-01-alpha"
sed -i 's/^\(gate\t1\t01-alpha\t987\t\)red\t/\1green\t/' "$L/987-resume.tsv"
run DRV_STEM=987b CT_RESUME="$L/987-resume.tsv"; rc=$?
eqc "TC-R241a22 a copied RED section keeps the run RED although its journal row was edited to green [review 1d]" "$rc $(tail -1 "$L/987b-all.log")" "1 GATES RED #999"

# ════ c. THE JUDGE: verify-log.sh over joins built from a real committed green ═══════════════════════════════════
REALLOG="$REPO/claude/agents/gatelogs/474-integration-all.log"
VS="$TD/vl"; mkdir -p "$VS/gates" "$VS/logs"
cp "$VL" "$VJ" "$VS/gates/"; for f in gate-manifest.tsv held-trees.tsv held-predicate.sh; do [ -r "$HERE/$f" ] && cp "$HERE/$f" "$VS/gates/"; done
printf 'fabricated selftest bundle, never served\n' > "$VS/app.js"
BFULL="$(md5sum "$VS/app.js" | cut -c1-32)"; B12="${BFULL:0:12}"
LOGMD5="$(head -1 "$REALLOG" | grep -o 'md5 [0-9a-f]\{12,32\}' | sed -n 1p | awk '{print $2}')"
GOOD="$VS/logs/good.log"; sed "1s/md5 $LOGMD5/md5 $B12/" "$REALLOG" > "$GOOD"
RHEAD="$(grep '^ref: HEAD ' "$GOOD" | awk '{print $3}')"; TREE0="$(printf 'tree' | sha1sum | cut -c1-40)"
FOOTB="$(tail -1 "$GOOD" | grep -o '#[0-9]*')"
# join <out> <K: sections 1..K are run p1, the rest p2> [bundle-for-p2] [head-for-p2] [header-bundle]
STATE0="$(printf 's' | sha1sum | cut -c1-16).$(printf 't' | md5sum | cut -c1-32).$(printf 'e' | md5sum | cut -c1-32)"
# join <out> <K> [bundle p2] [head p2] [bundle p1 and header] [state p2] [toolchain line p1] [toolchain line p2]
join(){ local out="$1" K="$2" b2="${3:-$BFULL}" h2="${4:-$RHEAD}" bh="${5:-$BFULL}" st2="${6:-$STATE0}" tc1="${7:-}" tc2="${8:-}"
  ( . "$SR" >/dev/null 2>&1
    awk '/^=== .* ===$/{print "S\t" NR} /^regression assertions \(PASS lines\)/{print "E\t" NR; exit}' "$GOOD" > "$VS/bounds"
    N_=$(grep -c '^S' "$VS/bounds"); mapfile -t ST < <(cut -f2 "$VS/bounds")
    : > "$out"; sed -n "1,$((ST[0]-1))p" "$GOOD" >> "$out"
    for k in $(seq 1 "$N_"); do
      s="${ST[$((k-1))]}"; e=$(( ${ST[$k]} - 1 )); nm="$(sed -n "${s}s/^=== \(.*\) ===$/\1/p" "$GOOD")"
      if [ "$k" -le "$K" ]; then stem=p1; b="$bh"; h="$RHEAD"; stt="$STATE0"; tc="$tc1"; else stem=p2; b="$b2"; h="$h2"; stt="$st2"; tc="$tc2"; fi
      { sed -n "${s}p" "$GOOD"; [ -n "$tc" ] && printf '     %s\n' "$tc"; sed -n "$((s+1)),${e}p" "$GOOD"; } > "$VS/sec"
      cat "$VS/sec" >> "$out"
      sr_mark_text "$k" "$N_" "$nm" "$stem" "$b" "$h" "$TREE0" "$stt" "$(md5sum < "$VS/sec" | cut -c1-32)" >> "$out"
    done
    parts="p1 gates 1-$K, p2 gates $((K+1))-$N_"; [ "$K" -ge "$N_" ] && parts="p1 gates 1-$N_"
    awk -v from="${ST[$N_]}" -v rl="$(sr_footer_text "$([ "$K" -ge "$N_" ] && echo 1 || echo 2)" "$parts" "$bh" "$RHEAD" "$TREE0" /selftest/journal.tsv)" \
      'NR>=from{ if($0 ~ /^gates ran \(/) print rl; print }' "$GOOD" >> "$out" )
}
vl(){ local sc="$1" lg="$2"; shift 2; ( cd "$VS" && bash "$sc" "$lg" "$FOOTB" "$@" ) > "$TD/vl.out" 2>&1; echo $?; }
JG="$VS/logs/joined.log"; join "$JG" 20
eqc "TC-R241c1 the unjoined real green is still accepted (no mark, no join check)" "$(vl "$VS/gates/verify-log.sh" "$GOOD")" 0
eqc "TC-R241c2 a join of that green in two parts (sections 1-20, then 21-54) is accepted by verify-log.sh" "$(vl "$VS/gates/verify-log.sh" "$JG")" 0
eqc "TC-R241c3 and verify-log ran the join judge on it" "$(grep -c '^JOIN OK: 54 gate section(s)' "$TD/vl.out")" 1
join "$VS/logs/one.log" 99
eqc "TC-R241c4 an unbroken resumable run (one part) is accepted" "$(vl "$VS/gates/verify-log.sh" "$VS/logs/one.log")" 0
# the mutant: the same verify-log.sh with its join hook removed - the control that the hook is what refuses
MUT="$VS/gates/verify-log-nojoin.sh"; grep -v '^  bash "\$VJ" "\$LOG" || exit 1$' "$VS/gates/verify-log.sh" > "$MUT"
eqc "TC-R241c5 the control copy differs from verify-log.sh by exactly the join hook line" "$(diff "$VS/gates/verify-log.sh" "$MUT" | grep -c '^<')" 1
judge(){ # <id> <description> <log> <substring of the join refusal> <mutant: accepts|refuses> [verify-log option]
  local id="$1" d="$2" log="$3" need="$4" mwant="$5" rc mrc; local -a xo=(); [ -n "${6:-}" ] && xo=("$6")
  rc="$(vl "$VS/gates/verify-log.sh" "$log" "${xo[@]}")"; local named=no; grep -qF -- "$need" "$TD/vl.out" && named=yes
  if [ "$rc" = 1 ] && [ "$named" = yes ]; then ok "$id $d is REFUSED (names \"$need\")"; else bad "$id $d (exit $rc, names \"$need\": $named; $(grep -m1 REFUSED "$TD/vl.out" || echo 'no refusal'))"; fi
  mrc="$(vl "$MUT" "$log" "${xo[@]}")"
  case "$mwant:$mrc" in accepts:0|refuses:1) ok "${id}m control: without the join hook verify-log $mwant it (exit $mrc)";;
    *) bad "${id}m control: without the join hook verify-log should $mwant it (exit $mrc)";; esac
}
join "$VS/logs/b-bundle.log" 20 "$(printf 'x\n' | md5sum | cut -c1-32)"
judge TC-R241c6 "a join whose second part ran on ANOTHER BUNDLE" "$VS/logs/b-bundle.log" "TWO PARTS WITH DIFFERENT HASHES" accepts
join "$VS/logs/b-head.log" 20 "$BFULL" "0000000000000000000000000000000000000001"
judge TC-R241c7 "a join whose second part ran on ANOTHER HEAD" "$VS/logs/b-head.log" "TWO PARTS WITH DIFFERENT HASHES" accepts
join "$VS/logs/b-header.log" 20 "$(printf 'y\n' | md5sum | cut -c1-32)" "$RHEAD" "$(printf 'y\n' | md5sum | cut -c1-32)"
judge TC-R241c8 "a join whose every part ran on a bundle the header does not name" "$VS/logs/b-header.log" "ANOTHER BUNDLE" accepts
# a gate missing: section 30 and its mark cut out, roster untouched
refoot(){ # the fixture predates the unit-layer footer line, so its total is every ^PASS line in the file
  local r a; r="$(awk '/^=== .* ===$/{s=1} s&&/^PASS/{n++} END{print n+0}' "$1")"; a="$(grep -c '^PASS' "$1")"
  if grep -q '^unit-layer assertions (PASS lines before the first gate section' "$1"; then
    sed -i -E "s/^regression assertions \(PASS lines\): [0-9]+$/regression assertions (PASS lines): $r/; s/^(unit-layer assertions \(PASS lines before the first gate section, not regress gates\)): [0-9]+; all PASS lines: [0-9]+$/\1: $((a-r)); all PASS lines: $a/" "$1"
  else sed -i -E "s/^regression assertions \(PASS lines\): [0-9]+$/regression assertions (PASS lines): $a/" "$1"; fi; }
cutsec(){ awk -v n="$2" '/^=== .* ===$/{k++} /^regression assertions \(PASS lines\)/{k=0} !(k==n){print}' "$1"; }
cutsec "$JG" 30 > "$VS/logs/b-missing.log"; refoot "$VS/logs/b-missing.log"
judge TC-R241c9 "a join with a gate MISSING" "$VS/logs/b-missing.log" "GATE MISSING" refuses
# a gate counted twice: section 30 (with its mark) appears twice
dupsec(){ awk -v n="$2" '/^=== .* ===$/{k++; if(buf!=""){printf "%s", buf; buf=""}} /^regression assertions \(PASS lines\)/{ if(buf!=""){printf "%s", buf; buf=""}; k=0} k==n{buf=buf $0 "\n"} {print}' "$1"; }
dupsec "$JG" 30 > "$VS/logs/b-twice.log"; refoot "$VS/logs/b-twice.log"
judge TC-R241c10 "a join with a gate COUNTED TWICE (restarted from an earlier gate)" "$VS/logs/b-twice.log" "COUNTED TWICE" refuses
# missing AND twice, cancelling in the count: section 31 replaced by a second copy of section 30
awk '/^=== .* ===$/{k++} /^regression assertions \(PASS lines\)/{k=0} k==30{b=b $0 "\n"} k==31{ if(!d){printf "%s", b; d=1}; next} {print}' "$JG" > "$VS/logs/b-cancel.log"; refoot "$VS/logs/b-cancel.log"
judge TC-R241c11 "a join with one gate missing and another counted twice, equal in number" "$VS/logs/b-cancel.log" "COUNTED TWICE" accepts
sed '0,/^PASS /{s/^PASS \(.*\)$/PASS \1 (edited)/}' "$JG" > "$TD/x" && awk 'BEGIN{d=0} /^=== /{s++} s==1 && /^PASS / && !d{ $0=$0 " (edited)"; d=1 } {print}' "$JG" > "$VS/logs/b-edited.log"
judge TC-R241c12 "a join with a section edited after it was written" "$VS/logs/b-edited.log" "body md5" accepts
sed 's/^resume: 2 part(s): p1 gates 1-20, p2 gates 21-54 /resume: 2 part(s): p1 gates 1-25, p2 gates 26-54 /' "$JG" > "$VS/logs/b-parts.log"
judge TC-R241c13 "a join whose resume: line misstates its parts" "$VS/logs/b-parts.log" "the marks say 2 part(s)" accepts
grep -v '^resume: ' "$JG" > "$VS/logs/b-noline.log"
judge TC-R241c14 "a join with its resume: line removed" "$VS/logs/b-noline.log" "0 'resume:' footer line(s)" accepts
sed '0,/^    resume-mark: gate 2\//s//    resume-mark: gate 3\//' "$JG" > "$VS/logs/b-index.log"
judge TC-R241c15 "a join whose mark puts a gate at the wrong position" "$VS/logs/b-index.log" "its mark says gate 3/54" accepts
grep -v '^    resume-mark: ' "$JG" > "$VS/logs/b-nomarks.log"
judge TC-R241c18 "a join with every mark removed and its resume: line kept" "$VS/logs/b-nomarks.log" "no gate marks" accepts
TCA='toolchain: playwright 1.55.0 chromium 141.0.7390.37 (selftest)'; TCB='toolchain: playwright 1.55.0 chromium 153.0.7000.1 (selftest)'
join "$VS/logs/tc-same.log" 20 "$BFULL" "$RHEAD" "$BFULL" "$STATE0" "$TCA" "$TCA"
# (a toolchain line puts a log in the instrumented era, whose fontconfig line the 474 fixture predates, so these two run with
# verify-log's own --ignore-fc; that override touches the fontconfig check only)
eqc "TC-R241c19 a join whose every section prints the same toolchain line is accepted" "$(vl "$VS/gates/verify-log.sh" "$VS/logs/tc-same.log" --ignore-fc)" 0
join "$VS/logs/b-tc.log" 20 "$BFULL" "$RHEAD" "$BFULL" "$STATE0" "$TCA" "$TCB"
judge TC-R241c20 "a join whose second part printed ANOTHER TOOLCHAIN line (gates.sh's footer reads only the first) [review 1b]" "$VS/logs/b-tc.log" "TWO TOOLCHAINS" accepts --ignore-fc
join "$VS/logs/b-state.log" 20 "$BFULL" "$RHEAD" "$BFULL" "$(printf 'x' | sha1sum | cut -c1-16).$(printf 't' | md5sum | cut -c1-32).$(printf 'e' | md5sum | cut -c1-32)"
judge TC-R241c21 "a join whose second part ran in another tree state (same bundle, HEAD, tree sha) [review 1e]" "$VS/logs/b-state.log" "ran in state" accepts
awk 'NR==2{print "suite-resume: RESUMING from /selftest/j.tsv (md5 0): 3 of 54 gates finished there"} {print}' "$GOOD" > "$VS/logs/b-sronly.log"
judge TC-R241c22 "a log carrying only a 'suite-resume:' line (marks and resume: line stripped) [review 1f]" "$VS/logs/b-sronly.log" "0 'resume:' footer line(s)" accepts
eqc "TC-R241c16 verify-join.sh on the selftest's own resumed log (part a) agrees with verify-log's judge" "$(bash "$VJ" "$L/999b-all.log" | grep -c '^JOIN OK: 3 gate section(s), each marked once and in roster order, in 2 part(s) (999 gates 1-1, 999b gates 2-3)')" 1
rm -f "$VS/gates/verify-join.sh"
eqc "TC-R241c17 a joined log with verify-join.sh absent is refused, not passed" "$(vl "$VS/gates/verify-log.sh" "$JG") $(grep -c 'the join cannot be judged' "$TD/vl.out")" "1 1"

# ════ d. OFF BY DEFAULT ═══════════════════════════════════════════════════════════════════════════════════════════
if git -C "$REPO" cat-file -e "$BASE:gates/gates.sh" 2>/dev/null; then
  git -C "$REPO" show "$BASE:gates/gates.sh" > "$TD/base-gates.sh"
  eqc "TC-R241d1 the base commit's gates.sh has no resume hook" "$(grep -c 'sr_import\|SR_ON' "$TD/base-gates.sh")" 0
  DRVB="$TD/driver-base.sh"; mkdriver "$TD/base-gates.sh" "$DRVB"
  ( cd "$SB" && env -u CT_RESUME -u CT_RESUMABLE DRV_STEM=995 bash "$DRVB" ) > "$TD/base.out" 2>&1; rb=$?
  ( cd "$SB" && env -u CT_RESUME -u CT_RESUMABLE DRV_STEM=995 bash "$DRV" ) > "$TD/new.out" 2>&1; rn=$?
  eqc "TC-R241d2 unset, the gate loop of this gates.sh writes the SAME log, byte for byte, as the base's" \
    "$rb $rn $(cmp -s "$TD/base.out" "$TD/new.out" && echo same-stdout || echo stdout-differs)" "0 0 same-stdout"
  ( cd "$SB" && env -u CT_RESUME -u CT_RESUMABLE DRV_STEM=995 bash "$DRVB" ) >/dev/null 2>&1; cp "$L/995-all.log" "$TD/base.all"
  ( cd "$SB" && env -u CT_RESUME -u CT_RESUMABLE DRV_STEM=995 bash "$DRV" ) >/dev/null 2>&1
  eqc "TC-R241d3 and the same -all.log, with no journal written" "$(cmp -s "$TD/base.all" "$L/995-all.log" && echo same || echo differs) $( [ -e "$L/995-resume.tsv" ] && echo journal || echo no-journal) $(grep -c 'resume' "$L/995-all.log")" "same no-journal 0"
else
  bad "TC-R241d1 NOT CHECKED: commit $BASE is not in this repository, so the base loop cannot be compared (set CT_SR_BASE)"
fi
eqc "TC-R241d4 the four hooks in gates.sh are each guarded by SR_ON, set to 0 unless CT_RESUMABLE or CT_RESUME is set" \
  "$(grep -c '^SR_ON=0$' "$SF") $(grep -c 'if \[ -n "\${CT_RESUMABLE:-}\${CT_RESUME:-}" \]; then' "$SF") $(grep -c 'if \[ "\$SR_ON" = 1 \]' "$SF")" "1 1 3"
eqc "TC-R241d5 verify-log.sh calls the join judge only for a log carrying a mark, a resume: footer or a suite-resume: line" \
  "$(grep -cF "if grep -qE '^(    resume-mark: |resume: [0-9]+ part\(s\): |suite-resume: )' \"\$LOG\"; then" "$VL")" 1

echo "suite-resume selftest: $P pass, $F fail"
[ "$F" -eq 0 ]
