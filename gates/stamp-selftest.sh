#!/usr/bin/env bash
# gates/stamp-selftest.sh - the controls for the stamp regex at gates/lib.js's stamp literal (serve()'s bundle line and the stamp() method), as a COMMAND rather
# than as a paragraph.
#
# WHY THIS FILE EXISTS. jobs/uat-stamp-regex-4xx (title: "The UAT stamp regex cannot read build numbers
# from #400 upward") named a case that "exists nowhere": "One case over stamps #399, #400, #416, #422,
# #1000; input count 5." The orchestrator's 2026-10-04 sweep found the title condition already fixed on
# main (gates/lib.js's stamp literal (serve()'s bundle line and the stamp() method) reads /#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/, which is 3-OR-4 digits and
# therefore already covers #399, #400, #416, #422 and #1000), but the SECOND half of the job - "add the
# cases" - was left unwritten, and said so in terms: "nothing in gates/ drives b.stamp()'s regex over
# synthetic stamps ... a future narrowing of lib.js's stamp literal would be invisible again." This is that driver.
#
# IT DOES NOT TOUCH gates/lib.js, chess.jsx, app.js OR ANY BROWSER. The regex is COPIED here as a
# literal, character for character from gates/lib.js's stamp literal (serve()'s bundle line and the stamp() method), and the copy is asserted against the live
# file in case 0 below so the two cannot silently drift - the exact drift this job exists to prevent is
# "a future narrowing of lib.js's stamp literal would be invisible again", and a copy with no equality check against
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
# SO THE REGEX IS CONTROLLED ONLY WHEN THIS IS RUN, and that is the honest state of it [#545, item (62)]: it is a
# SELFTEST on gates/audit/cited-not-run.sh's roster, run by whoever edits a stamp literal in gates/lib.js. What it
# catches when run, measured at #545 with CT_STAMP_LIB pointed at a narrowed copy: narrowing EITHER literal ({3,4} ->
# {3}) gives 7 pass / 1 fail on case 0. The version before #545 passed 8 / 0 on both narrowings, because it compared
# only the first literal grep found, and a narrowed first copy simply let it find the intact second one.

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LIB="${CT_STAMP_LIB:-$HERE/lib.js}"   # CT_STAMP_LIB points the file at another copy, which is how its own control runs

P=0; F=0
ok(){ # ok <label> <expr-as-0-or-1>
  if [ "$2" = "1" ]; then P=$((P+1)); echo "PASS: $1"; else F=$((F+1)); echo "FAIL: $1"; fi
}

# ── CASE 0: THE COPY HAS NOT DRIFTED FROM THE SOURCE ─────────────────────────────────────────────────
# Extract the literal regex source text from gates/lib.js's stamp literal (serve()'s bundle line and the stamp() method) and compare it, as a string, to the
# literal this file is about to drive below. If gates/lib.js ever narrows or widens that pattern, this
# case fails LOUDLY rather than the two copies quietly disagreeing about what "the stamp regex" means.
# EVERY LITERAL, NOT THE FIRST ONE [#545, item (62); jobs/stamp-selftest-lands-as-an-instrument-nothing-runs-and-cites-
# the-wrong-lib-js-line-ten-times-2026-10-13]. lib.js carries the regex TWICE - serve()'s bundle line and the stamp()
# method - and this used to compare only the first match (and to cite a line, 113, that is the fontconfig branch).
# Now every stamp-shaped literal in the file is extracted and each must equal THIS_RE, and there must be at least two,
# so narrowing either copy, or deleting one, turns this case red.
THIS_RE='/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/'
LIVE="$(node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");const m=s.match(/\/#\\d\{[^\n]*?ET\//g)||[];console.log(m.join("\n"));' "$LIB" 2>/dev/null)"
NLIVE=0; NSAME=0
while IFS= read -r l; do [ -n "$l" ] || continue; NLIVE=$((NLIVE+1)); [ "$l" = "$THIS_RE" ] && NSAME=$((NSAME+1)); done <<< "$LIVE"
if [ "$NLIVE" -ge 2 ] && [ "$NSAME" = "$NLIVE" ]; then ok "the regex this file drives is byte-identical to every stamp literal in gates/lib.js ($NLIVE found)" 1
else
  ok "the regex this file drives is byte-identical to every stamp literal in gates/lib.js ($NSAME of $NLIVE equal, at least 2 required)" 0
  echo "  gates/lib.js carries:"; printf '%s\n' "${LIVE:-<no stamp-shaped literal found>}" | sed 's/^/    /'
  echo "  this file expects:      $THIS_RE"
fi

# ── THE DRIVER. node's RegExp, built from the SAME pattern gates/lib.js's stamp literal (serve()'s bundle line and the stamp() method) uses, run over synthetic ──
# document.documentElement.innerHTML content shaped exactly like the real stamp line b.stamp() reads.
drive(){
  node -e '
    // BUILT FROM THIS_RE, NOT A THIRD HAND COPY [#545, item (62)]: case 0 holds THIS_RE equal to lib.js, so the
    // regex driven here is the one that comparison checked.
    const src = process.argv[2]; const re = new RegExp(src.slice(1, src.lastIndexOf("/")));
    const html = process.argv[1];
    const m = html.match(re);
    process.stdout.write(m ? m[0] : "");
  ' "$1" "$THIS_RE"
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
