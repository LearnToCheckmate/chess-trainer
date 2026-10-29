#!/usr/bin/env bash
# gates/fontpin-control.sh - THE NEGATIVE CONTROL FOR THE FONT PIN'S ONE ASSERTION.
#
# WHAT IT ANSWERS, in one line: does a gate run actually REDDEN when the fontconfig that calibrated this
# suite's text-derived pixel pins is not the one in force?
#
# WHY IT EXISTS. gates/fonts.conf's own "WHAT THIS DOES NOT CLAIM (5)" says nothing in this suite fails
# loudly when the instrument is wrong, and
# jobs/libjs-asserts-the-resolved-font-face-with-fc-match-in-a-host-subprocess-which-cannot-see-what-the-
# browser-resolved-2026-10-27 is closed only when something does. #544 made gates/lib.js assert the
# IN-BROWSER relation ("Segoe UI" equals the fall-through sentinel iff the pin is in force) as a real
# L.say, so every gate carries it. THIS SCRIPT IS THE OTHER HALF THAT JOB ASKS FOR: it drives the harness
# under a deliberately broken FONTCONFIG_FILE and asserts the run reddens, rather than asserting that a
# different number got printed. An assertion nobody has seen fail is not evidence [CLAUDE.md, #385].
#
# WHY IT IS NOT IN gates/regress/ AND NOT UNDER gates/audit/. Not in regress/: gates.sh globs that
# directory and gates/verify-log.sh pins the suite's section count, so a new file there moves a number the
# push gate reads. Not under gates/audit/: gates/audit-all.sh runs the --selftest arm of every executable
# it finds there, and this one launches a real browser four times - a new dependency for an umbrella whose
# whole value is that it is cheap and has no tree requirements. It sits in gates/ as a sibling of the
# other hand-run instruments, with its roster row in gates/audit/cited-not-run.sh so it is ACCOUNTED and
# not an unaccounted member of that audit's set the moment a record document cites it.
#
# USAGE
#   gates/fontpin-control.sh            drive all four states and report; exit 0 if the control BEHAVED
#   gates/fontpin-control.sh --strict   same, and exit 1 if it did not
# EXIT CODES. 0 the control behaved (the pinned state is green and all three degraded states are red),
#             1 with --strict when it did not, 2 the environment could not run it at all.
#
# WHAT "BEHAVED" MEANS, and the polarity is the part to get right [#539's antagonist B]. An uninstalled
# face FALLING THROUGH is the normal, correct outcome; 322.15 is the fall-through sentinel in these
# images; and in #537 the defect was "Segoe UI" FAILING to fall through, reading 373.42 because
# fontconfig substituted Inter. So GREEN is "Segoe UI == sentinel" and the intuitive reading is backwards.
set -uo pipefail
G="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STRICT=no
case "${1:-}" in
  --strict) STRICT=yes ;;
  "") : ;;
  *) echo "usage: $(basename "$0") [--strict]" >&2; exit 64 ;;
esac

T="$(mktemp -d)" || { echo "fontpin-control: could not mktemp"; exit 2; }
trap 'rm -rf "$T"' EXIT

# THE HARNESS IS THE REAL ONE. It requires gates/lib.js by absolute path - not a copy, not a stub - so what
# this control drives is the assertion the suite ships. L.run exits non-zero iff an assertion failed, which
# is what "the run REDDENS" means here.
cat > "$T/drive.js" <<EOS
const L=require('$G/lib.js');
L.run(async()=>{
  const b=await L.launch({geo:'kunal730',name:'fontpin-control'});
  await b.open();
  await b.close();
},'fontpin-control');
EOS
printf 'this is not xml <<<\n' > "$T/malformed.conf"

PASS=0; FAIL=0
chk(){ # chk <label> <expected rc 0|1> <env...>
  local label="$1" want="$2"; shift 2
  local out rc
  out="$(env "$@" node "$T/drive.js" 2>&1)"; rc=$?
  local seen
  seen="$(printf '%s' "$out" | grep -oE '(PASS|FAIL) TC-SUITE-233' | head -1)"
  local segoe
  segoe="$(printf '%s' "$out" | grep -oE '"segoe":[0-9.]+' | head -1)"
  if [ "$rc" = "$want" ]; then PASS=$((PASS+1)); printf 'PASS %-34s rc=%s  %s  %s\n' "$label" "$rc" "${seen:-<no TC-SUITE-233 line>}" "$segoe"
  else FAIL=$((FAIL+1)); printf 'FAIL %-34s rc=%s wanted %s  %s  %s\n' "$label" "$rc" "$want" "${seen:-<no TC-SUITE-233 line>}" "$segoe"; fi
}

echo "fontpin-control: driving gates/lib.js's font-pin assertion over four fontconfig states"
echo "  harness: $G/lib.js (the shipped one, by absolute path)"
# (1) THE CALIBRATED STATE. Must be GREEN, or the control is measuring a broken container and nothing below
#     means anything - this is the denominator [R51: report a missing one, never credit it].
chk "the pin in force (must be green)"        0 CT_FP_STATE=pin
# (2),(3),(4) THE THREE DEGRADED STATES gates/lib.js can be in. All three must REDDEN.
chk "CT_NOFC=1, the image default"            1 CT_NOFC=1
chk "a caller FONTCONFIG_FILE that is garbage" 1 FONTCONFIG_FILE="$T/malformed.conf"
chk "a caller FONTCONFIG_FILE that is absent"  1 FONTCONFIG_FILE="$T/does-not-exist.conf"

echo "fontpin-control: $PASS behaved / $FAIL did not"
if [ "$FAIL" -eq 0 ]; then echo "FONTPIN CONTROL BEHAVED"; else echo "FONTPIN CONTROL DID NOT BEHAVE"; fi
[ "$STRICT" = yes ] && [ "$FAIL" -ne 0 ] && exit 1
exit 0
