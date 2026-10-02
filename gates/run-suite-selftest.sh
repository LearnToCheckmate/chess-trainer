#!/usr/bin/env bash
# gates/run-suite-selftest.sh    THE CONTROLS FOR gates/run-suite.sh AND FOR held.sh's COMPUTED sourceMd5.
#
# Controls as a command, not a paragraph. #463. Two fixes, and every assertion below CROSSES THE THRESHOLD
# rather than merely disturbing the mechanism - which is this project's own standing rule about controls, and
# the reason TC-RS-001 exists at all: it REPRODUCES #461's loss before TC-RS-002 shows the fix immune to it.
# A control that only showed the fixed case passing would be the "a gate that cannot fail" shape.
#
#   TC-RS-001a an UNEDITED run of the same script is clean                          (proves the instrument)
#   TC-RS-001b editing it mid-run makes the interpreter read garbage                 (THE DEFECT, must REPRODUCE)
#   TC-RS-002  the same edit against a COPY of that script does not reach it         (THE FIX)
#   TC-RS-003  run-suite.sh removes its copy on exit, and on an interrupted exit
#   TC-RS-004  the copy is inside gates/, so dirname-derived roots still resolve
#   TC-RS-005  run-suite.sh reports an UNCHANGED harness, and writes the digest file
#   TC-RS-006  run-suite.sh reports a CHANGED harness loudly and names the file      (must cross the threshold)
#   TC-RS-007  held.sh add computes sourceMd5 from chess.jsx by default (was '-')    (THE DEFECT it closes)
#   TC-RS-008  CT_SRCMD5 still overrides it
#   TC-RS-009  a non-hex CT_SRCMD5 is refused
#   TC-RS-010  a too-short CT_SRCMD5 is refused
#   TC-RS-011  a row written by the new add is refused by `check` ON THE SOURCE KEY ALONE, with the bundle
#              key deliberately missed - which is the whole point of the field
#   TC-RS-012  every live row of the committed register carries a sourceMd5
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"
P=0; F=0
ok(){ P=$((P+1)); echo "PASS $1"; }
no(){ F=$((F+1)); echo "FAIL $1 -- $2"; }
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

# ── TC-RS-001 / 002. The mechanism, reproduced then defeated. ────────────────────────────────────────────────
# A script that sleeps, edited mid-sleep to insert padding ABOVE the sleep, resumes at a byte offset that is now
# in the middle of a different line. #461's real failure was `line 196: hit: unbound variable` where line 196 is
# a bare `fi`; the small version prints the same SHAPE - a fragment of a word.
cat > "$T/victim.sh" <<'EOS'
#!/usr/bin/env bash
sleep 2
echo DONE_OK
EOS
chmod +x "$T/victim.sh"

# WHAT THE DISCRIMINATOR IS, because the first version of this control read the wrong quantity and failed on a
# run that had reproduced the defect perfectly. The observable is A DIAGNOSTIC THE UNEDITED SCRIPT CANNOT
# PRODUCE - bash complaining about a line and a fragment of a word that does not exist in any version of the
# file. Whether that is also FATAL depends on the script's own options and on where the shifted offset happens
# to land: here bash reports `line 3: g: command not found` and carries on, while #461's offset landed on
# gates.sh's `set -u` unbound-variable path and killed the suite before its footer. The CORRUPTION is the
# defect; dying at the footer is one of its consequences. So TC-RS-001a proves the instrument is clean on an
# unedited run and TC-RS-001b requires the diagnostic to appear - a threshold the unedited run does not cross.
PAD='#!/usr/bin/env bash\n# padding padding padding padding padding padding padding padding\n# padding padding padding padding padding padding padding padding\nsleep 2\necho DONE_OK\n'
GARBAGE='(command not found|unbound variable|syntax error|unexpected)'

bash "$T/victim.sh" > "$T/clean.out" 2>&1; CLEAN_RC=$?
if [ "$CLEAN_RC" -eq 0 ] && grep -q DONE_OK "$T/clean.out" && ! grep -qE "$GARBAGE" "$T/clean.out"; then
  ok "TC-RS-001a the unedited script ran clean: exit 0, DONE_OK, no diagnostic"
else
  no "TC-RS-001a" "the unedited script was not clean (exit $CLEAN_RC, out '$(tr -d '\n' < "$T/clean.out")'); the instrument is broken, so neither 001b nor 002 means anything"
fi

bash "$T/victim.sh" > "$T/direct.out" 2>&1 &
VP=$!
sleep 0.6
printf "$PAD" > "$T/victim.sh"
wait $VP; DIRECT_RC=$?
if grep -qE "$GARBAGE" "$T/direct.out"; then
  ok "TC-RS-001b editing a running script corrupted the interpreter: '$(grep -oE "line [0-9]+: .*" "$T/direct.out" | head -1 | cut -c1-60)' (exit $DIRECT_RC) - a fragment that appears in no version of the file"
else
  no "TC-RS-001b" "the edit produced NO corruption diagnostic (exit $DIRECT_RC, out '$(tr -d '\n' < "$T/direct.out")'). This control is the premise of the whole fix; if it cannot reproduce, TC-RS-002's green means nothing."
fi

cat > "$T/victim2.sh" <<'EOS'
#!/usr/bin/env bash
sleep 2
echo DONE_OK
EOS
cp "$T/victim2.sh" "$T/.copy-of-victim2.sh"
bash "$T/.copy-of-victim2.sh" > "$T/copy.out" 2>&1 &
CP=$!
sleep 0.6
printf "$PAD" > "$T/victim2.sh"
wait $CP; COPY_RC=$?
if [ "$COPY_RC" -eq 0 ] && grep -q DONE_OK "$T/copy.out" && ! grep -qE "$GARBAGE" "$T/copy.out"; then
  ok "TC-RS-002 the same edit against the original left the running COPY untouched: exit 0, DONE_OK, no diagnostic"
else
  no "TC-RS-002" "running from a copy still broke: exit $COPY_RC, out '$(tr -d '\n' < "$T/copy.out")'"
fi

# ── TC-RS-003..006. run-suite.sh itself, driven with a STUB gates.sh so no browser and no 44 minutes. ────────
REAL="$G/gates.sh"; STASH="$T/gates.sh.real"
cp "$REAL" "$STASH"
restore(){ cp "$STASH" "$REAL"; }
trap 'restore; rm -rf "$T"' EXIT

cat > "$REAL" <<'EOS'
#!/usr/bin/env bash
# STUB installed by run-suite-selftest.sh. Asserts the two things the copy must preserve, then exits.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"
echo "STUB_G=$G"
echo "STUB_ROOT=$ROOT"
echo "STUB_ARG1=$1"
echo "STUB_ARG2=${2:-}"
[ -d "$G/regress" ] && echo "STUB_SEES_REGRESS=yes" || echo "STUB_SEES_REGRESS=no"
[ -f "$ROOT/chess.jsx" ] && echo "STUB_SEES_SOURCE=yes" || echo "STUB_SEES_SOURCE=no"
exit "${CT_STUB_RC:-0}"
EOS
chmod +x "$REAL"

rm -f "$G/logs/901-harness.md5"
CT_RUNID=selftest bash "$G/run-suite.sh" '#901' > "$T/rs.out" 2>&1; RS_RC=$?

if [ -z "$(find "$G" -maxdepth 1 -name '.run-901.sh' -print -quit)" ]; then
  ok "TC-RS-003 the run-scoped copy gates/.run-901.sh was removed on exit"
else
  no "TC-RS-003" "gates/.run-901.sh survived the run"
fi

if grep -q "STUB_G=$G" "$T/rs.out" && grep -q "STUB_ROOT=$ROOT" "$T/rs.out" \
   && grep -q 'STUB_SEES_REGRESS=yes' "$T/rs.out" && grep -q 'STUB_SEES_SOURCE=yes' "$T/rs.out"; then
  ok "TC-RS-004 the copy resolved \$G and \$ROOT to the real repo and saw gates/regress and chess.jsx"
else
  no "TC-RS-004" "dirname-derived roots did not survive the copy: $(grep -E 'STUB_(G|ROOT|SEES)' "$T/rs.out" | tr '\n' ' ')"
fi

if grep -q 'STUB_ARG1=#901' "$T/rs.out"; then ok "TC-RS-004b both arguments passed through unchanged"
else no "TC-RS-004b" "arguments were not passed through: $(grep STUB_ARG "$T/rs.out" | tr '\n' ' ')"; fi

if grep -q 'HARNESS UNCHANGED' "$T/rs.out" && [ -f "$G/logs/901-harness.md5" ] \
   && grep -q '^harness: UNCHANGED' "$G/logs/901-harness.md5" \
   && grep -q -- '--- BEFORE' "$G/logs/901-harness.md5" && grep -q -- '--- AFTER' "$G/logs/901-harness.md5"; then
  ok "TC-RS-005 an unedited harness reported UNCHANGED, with both digests written to logs/901-harness.md5"
else
  no "TC-RS-005" "the unchanged case did not report cleanly (rc $RS_RC)"
fi

# TC-RS-006. THE ONE THAT MUST CROSS THE THRESHOLD: edit a harness file DURING the run and require the report to
# name it. The stub sleeps so there is a window; a background editor touches gatemanifest.sh, which the copy does
# NOT protect and which is exactly why the digest check exists.
cat > "$REAL" <<'EOS'
#!/usr/bin/env bash
set -uo pipefail
sleep 2
echo STUB_SLOW_DONE
exit 0
EOS
chmod +x "$REAL"
MAN="$G/gatemanifest.sh"; cp "$MAN" "$T/man.real"
( sleep 0.7; printf '\n# transient edit by run-suite-selftest TC-RS-006\n' >> "$MAN" ) &
ED=$!
rm -f "$G/logs/902-harness.md5"
CT_RUNID=selftest bash "$G/run-suite.sh" '#902' > "$T/rs2.out" 2>&1 || true
wait $ED 2>/dev/null || true
cp "$T/man.real" "$MAN"

if grep -q 'HARNESS CHANGED DURING THE RUN' "$T/rs2.out" && grep -q 'gatemanifest.sh' "$T/rs2.out" \
   && grep -q '^harness: CHANGED' "$G/logs/902-harness.md5"; then
  ok "TC-RS-006 a harness file edited mid-run was reported loudly and named (gatemanifest.sh)"
else
  no "TC-RS-006" "a mid-run harness edit went unreported: $(tr -d '\n' < "$T/rs2.out" | cut -c1-160)"
fi
restore

# ── TC-RS-007..011. held.sh's computed sourceMd5, against a THROWAWAY register. ──────────────────────────────
# Never against gates/held-trees.tsv: a selftest that appends to the real register is a selftest that poisons the
# push gate. held.sh keys its register off its own directory, so the whole gates/ dir is copied to the sandbox.
SB="$T/sandbox"; mkdir -p "$SB/gates"
cp "$G/held.sh" "$SB/gates/"
printf '# throwaway register for run-suite-selftest\n' > "$SB/gates/held-trees.tsv"
printf 'SELFTEST SOURCE FIXTURE\n' > "$SB/chess.jsx"
EXPECT="$(md5sum "$SB/chess.jsx" | cut -c1-12)"
R40='a selftest reason long enough to clear the forty character floor that add enforces'

CT_RUNID=selftest bash "$SB/gates/held.sh" add aaaabbbbcccc 1111111111111111111111111111111111111111 '#901' $R40 > "$T/h1.out" 2>&1 || true
GOT="$(awk -F'\t' '!/^#/ && NF>1 {print $7}' "$SB/gates/held-trees.tsv" | tail -1)"
if [ "$GOT" = "$EXPECT" ]; then
  ok "TC-RS-007 add computed field 7 from chess.jsx by default: $GOT (was '-' before #463)"
else
  no "TC-RS-007" "field 7 read '$GOT', expected the chess.jsx md5 '$EXPECT'"
fi

CT_RUNID=selftest CT_SRCMD5=DEADBEEF0001 bash "$SB/gates/held.sh" add aaaabbbbcccd 2222222222222222222222222222222222222222 '#901' $R40 > "$T/h2.out" 2>&1 || true
GOT2="$(awk -F'\t' '!/^#/ && NF>1 {print $7}' "$SB/gates/held-trees.tsv" | tail -1)"
if [ "$GOT2" = "deadbeef0001" ]; then ok "TC-RS-008 CT_SRCMD5 overrode the computed value and was lowercased"
else no "TC-RS-008" "override gave '$GOT2', expected 'deadbeef0001'"; fi

BEFORE_N="$(awk -F'\t' '!/^#/ && NF>1' "$SB/gates/held-trees.tsv" | wc -l | tr -d ' ')"
CT_RUNID=selftest CT_SRCMD5=nothex000000 bash "$SB/gates/held.sh" add aaaabbbbccce 3333333333333333333333333333333333333333 '#901' $R40 > "$T/h3.out" 2>&1; RC3=$?
AFTER_N="$(awk -F'\t' '!/^#/ && NF>1' "$SB/gates/held-trees.tsv" | wc -l | tr -d ' ')"
if [ "$RC3" -eq 2 ] && [ "$BEFORE_N" = "$AFTER_N" ] && grep -q 'is not hex' "$T/h3.out"; then
  ok "TC-RS-009 a non-hex CT_SRCMD5 was refused (exit 2) and NO row was appended"
else
  no "TC-RS-009" "non-hex override: exit $RC3, rows $BEFORE_N -> $AFTER_N"
fi

CT_RUNID=selftest CT_SRCMD5=abc bash "$SB/gates/held.sh" add aaaabbbbccce 3333333333333333333333333333333333333333 '#901' $R40 > "$T/h4.out" 2>&1; RC4=$?
AFTER2_N="$(awk -F'\t' '!/^#/ && NF>1' "$SB/gates/held-trees.tsv" | wc -l | tr -d ' ')"
if [ "$RC4" -eq 2 ] && [ "$BEFORE_N" = "$AFTER2_N" ]; then
  ok "TC-RS-010 a 3-char CT_SRCMD5 was refused (exit 2) and NO row was appended"
else
  no "TC-RS-010" "short override: exit $RC4, rows $BEFORE_N -> $AFTER2_N"
fi

# TC-RS-011. THE POINT OF THE FIELD. Ask `check` about a bundle md5 that is on NO row - so the bundle key is
# deliberately missed, exactly as it would be after a rebuild - while the held chess.jsx sits on disk. The refusal
# must come from the SOURCE key alone. Then change the source and require it to pass, or the arm is not measuring.
printf 'SELFTEST SOURCE FIXTURE\n' > "$SB/chess.jsx"
bash "$SB/gates/held.sh" check ffffffffffff > "$T/c1.out" 2>&1; C1=$?
printf 'A DIFFERENT SOURCE TREE ENTIRELY\n' > "$SB/chess.jsx"
bash "$SB/gates/held.sh" check ffffffffffff > "$T/c2.out" 2>&1; C2=$?
if [ "$C1" -eq 1 ] && grep -q 'HELD BY SOURCE' "$T/c1.out" && [ "$C2" -eq 0 ]; then
  ok "TC-RS-011 with the bundle key missed, check refused on the source key alone (exit 1) and passed once the source changed (exit 0)"
else
  no "TC-RS-011" "source arm did not discriminate: held-source exit $C1, other-source exit $C2"
fi

MISSING="$(awk -F'\t' '!/^#/ && NF>1 && ($7=="-" || $7=="") {c++} END{print c+0}' "$G/held-trees.tsv")"
LIVE="$(awk -F'\t' '!/^#/ && NF>1 {c++} END{print c+0}' "$G/held-trees.tsv")"
if [ "$MISSING" = "0" ]; then ok "TC-RS-012 all $LIVE live rows of the committed register carry a sourceMd5"
else no "TC-RS-012" "$MISSING of $LIVE live rows still read '-' for field 7"; fi

echo
echo "run-suite-selftest: $P pass, $F fail"
[ "$F" -eq 0 ] || exit 1
