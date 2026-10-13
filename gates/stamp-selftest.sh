#!/usr/bin/env bash
# gates/stamp-selftest.sh - the controls for the stamp regex at gates/lib.js:113, as a COMMAND rather
# than as a paragraph.
#
# WHY THIS FILE EXISTS. jobs/uat-stamp-regex-4xx (title: "The UAT stamp regex cannot read build numbers
# from #400 upward") named a case that "exists nowhere": "One case over stamps #399, #400, #416, #422,
# #1000; input count 5." The orchestrator's 2026-10-04 sweep found the title condition already fixed on
# main (gates/lib.js:113 reads /#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/, which is 3-OR-4 digits and
# therefore already covers #399, #400, #416, #422 and #1000), but the SECOND half of the job - "add the
# cases" - was left unwritten, and said so in terms: "nothing in gates/ drives b.stamp()'s regex over
# synthetic stamps ... a future narrowing of lib.js:113 would be invisible again." This is that driver.
#
# IT DOES NOT TOUCH gates/lib.js, chess.jsx, app.js OR ANY BROWSER. The regex is COPIED here as a
# literal, character for character from gates/lib.js:113, and the copy is asserted against the live
# file in case 0 below so the two cannot silently drift - the exact drift this job exists to prevent is
# "a future narrowing of lib.js:113 would be invisible again", and a copy with no equality check against
# its source is precisely that risk reintroduced one file over.
#
# WHAT IT DELIBERATELY DOES NOT DO. It does not add a row to claude/stories/TEST-CASES.md and it does
# not add an entry to gates/audit/cited-not-run.sh's roster. gates/audit/cited-not-run.sh:331 and its
# header state that ADMIT and WEAK are both ceilings on that file that MAY ONLY FALL (measured there:
# "A weak row would ... take WEAK from 2 to 3 against A_WEAK_CEIL=2 ... not merely less informative, it
# reddens this audit on the commit that lands it"). This lane holds no pen and cannot run that audit's
# own selftest to see whether a third SELFTEST|weak row (the shape its two existing companions, for
# verify-log.sh and buildnum.sh, already carry) would breach that ceiling or merely approach it, and
# guessing wrong turns gates/audit/cited-not-run.sh red on the commit that lands this file - which is a
# worse outcome than leaving the TEST-CASES.md row unwritten one more cycle. So this file exists,
# proves the regex, and is named in claude/process-log/lane-1.md and in this job's own outcome rather
# than cited anywhere that would recruit it into that ratchet. THE REMAINING STEP - writing the
# TEST-CASES.md row and, if gates/audit/cited-not-run.sh's own --selftest proves the ceiling has
# headroom, the roster row - is left to whichever run can afford to run that audit's full selftest
# first and read A_WEAK_CEIL and the live WEAK count before writing anything.
#
#   gates/stamp-selftest.sh      run every case, print PASS/FAIL per case and a footer
#
# NOT A GATE. It lives in gates/ and not in gates/regress/, so gates.sh (which globs regress/*.js)
# never runs it, it is in no manifest, and it can never contribute to or block a GATES GREEN.

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LIB="$HERE/lib.js"

P=0; F=0
ok(){ # ok <label> <expr-as-0-or-1>
  if [ "$2" = "1" ]; then P=$((P+1)); echo "PASS: $1"; else F=$((F+1)); echo "FAIL: $1"; fi
}

# ── CASE 0: THE COPY HAS NOT DRIFTED FROM THE SOURCE ─────────────────────────────────────────────────
# Extract the literal regex source text from gates/lib.js:113 and compare it, as a string, to the
# literal this file is about to drive below. If gates/lib.js ever narrows or widens that pattern, this
# case fails LOUDLY rather than the two copies quietly disagreeing about what "the stamp regex" means.
LIVE_RE="$(grep -o '/#\\d{3,4} - 20\\d\\d-\\d\\d-\\d\\d \\d\\d:\\d\\d ET/' "$LIB" | head -1)"
THIS_RE='/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/'
if [ "$LIVE_RE" = "$THIS_RE" ]; then ok "the regex this file drives is byte-identical to gates/lib.js:113's own literal" 1
else
  ok "the regex this file drives is byte-identical to gates/lib.js:113's own literal" 0
  echo "  gates/lib.js:113 reads: ${LIVE_RE:-<no match found - has the line moved or changed shape?>}"
  echo "  this file expects:      $THIS_RE"
fi

# ── THE DRIVER. node's RegExp, built from the SAME pattern gates/lib.js:113 uses, run over synthetic ──
# document.documentElement.innerHTML content shaped exactly like the real stamp line b.stamp() reads.
drive(){
  node -e '
    const re = /#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/;
    const html = process.argv[1];
    const m = html.match(re);
    process.stdout.write(m ? m[0] : "");
  ' "$1"
}

# ── POSITIVE CASES: the five stamps the job names, INPUT COUNT 5, exactly as specified ──────────────
for n in 399 400 416 422 1000; do
  HTML="<div>#$n - 2026-10-13 06:45 ET</div>"
  GOT="$(drive "$HTML")"
  WANT="#$n - 2026-10-13 06:45 ET"
  [ "$GOT" = "$WANT" ] && R=1 || R=0
  ok "stamp #$n is read whole ($WANT)" "$R"
done

# ── THE NEGATIVE HALF: a denominator that cannot say NO is the other vacuity trap. 5 digits is one ───
# past the regex's own {3,4} ceiling and must NOT match as a 4-digit prefix of a 5-digit number -
# if it did, "#39999" would misread as stamp "#3999", a wrong-by-one-digit silent corruption.
HTML5="<div>#39999 - 2026-10-13 06:45 ET</div>"
GOT5="$(drive "$HTML5")"
[ "$GOT5" = "" ] && R5=1 || R5=0
ok "a 5-digit number is NOT read as a 3-4 digit stamp (got: '${GOT5:-<empty, correct>}')" "$R5"

# ── AND A 2-DIGIT NUMBER MUST ALSO NOT MATCH, below the {3,4} floor ──────────────────────────────────
HTML2="<div>#42 - 2026-10-13 06:45 ET</div>"
GOT2="$(drive "$HTML2")"
[ "$GOT2" = "" ] && R2=1 || R2=0
ok "a 2-digit number is NOT read as a 3-4 digit stamp (got: '${GOT2:-<empty, correct>}')" "$R2"

echo "== gates/stamp-selftest.sh: $P pass / $F fail =="
[ "$F" = 0 ]
