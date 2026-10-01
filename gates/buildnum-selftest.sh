#!/usr/bin/env bash
# gates/buildnum-selftest.sh - the controls for gates/buildnum.sh, as a COMMAND rather than as a paragraph.
#
# WHY THIS FILE EXISTS. #454 proved buildnum.sh with nine adversarial cases and a bundle-neutrality control, and
# every one of them lived only in that run's own transcript. This project has measured what that costs twice:
# gate 49 arrived with six negative-control results published as bare numbers ("NC2: 15 red") and two of the six
# turned out to be SUBSET runs that nobody could reproduce (#411, #412), and gate 47's control recipe named line
# numbers that had moved 36 down (#399). The rule both produced is PUBLISH THE COMMAND WITH THE COUNT. So the
# controls are here, they run in about a second, and anyone can re-derive the claim instead of trusting it.
#
#   gates/buildnum-selftest.sh          run every case, print PASS/FAIL per case and a footer
#
# IT NEVER TOUCHES THE REAL REGISTER. Every case runs against a COPY in a temp directory, with a copy of
# buildnum.sh beside it, so a bug in the tool cannot corrupt gates/build-numbers.tsv - which matters because the
# register is append-only by design and a bad row cannot be deleted, only superseded.
#
# NOT A GATE. It lives in gates/ and not in gates/regress/, so gates.sh (which globs regress/*.js) never runs it
# and it can never contribute to or block a GATES GREEN. It is a developer check on a developer tool.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TD="$(mktemp -d)"; trap 'rm -rf "$TD"' EXIT
cp "$HERE/buildnum.sh" "$TD/buildnum.sh"; cp "$HERE/build-numbers.tsv" "$TD/build-numbers.tsv"
chmod +x "$TD/buildnum.sh"
BN="$TD/buildnum.sh"
P=0; F=0
ck() { # ck <description> <expected-exit> <command...>
  local d="$1" want="$2"; shift 2
  "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" = "$want" ]; then P=$((P+1)); printf 'PASS %s (exit %s)\n' "$d" "$got"
  else F=$((F+1)); printf 'FAIL %s (exit %s, wanted %s)\n' "$d" "$got" "$want"; fi
}
eq() { # eq <description> <expected> <actual>
  if [ "$2" = "$3" ]; then P=$((P+1)); printf 'PASS %s (%s)\n' "$1" "$3"
  else F=$((F+1)); printf 'FAIL %s (got %s, wanted %s)\n' "$1" "$3" "$2"; fi
}

echo "== buildnum.sh self-test, register copy at $TD =="

# 1-5. A MALFORMED NUMBER IS REFUSED, not silently coerced. '#45' and '#45678' matter specifically: build.sh and
# gates.sh both require ^#[0-9]{3,4}$, so a number outside that can never match a stamp or a log.
ck "empty number refused"        2 "$BN" check ""
ck "non-numeric refused"         2 "$BN" check "abc"
ck "two-digit number refused"    2 "$BN" check "#45"
ck "five-digit number refused"   2 "$BN" check "#45678"
ck "trailing garbage refused"    2 "$BN" check "45x"

# 6. AN ISSUED NUMBER REPORTS ISSUED. #416 is the one real collision in this project's history and carries two
# rows, so it is also the case that proves `check` reports BOTH rather than stopping at the first.
ck "an issued number exits 1"    1 "$BN" check "#416"
eq "check prints both #416 rows" "2" "$("$BN" check '#416' 2>/dev/null | grep -c '^  #416')"

# 7. mint REFUSES WITHOUT CT_RUNID. A number whose issuer cannot be traced is the #416 defect with extra steps.
ck "mint without CT_RUNID refused" 2 env -u CT_RUNID "$BN" mint "a note that is comfortably long enough"
# 8. ... and refuses a note too short to interpret later.
ck "mint with a short note refused" 2 env CT_RUNID=selftest "$BN" mint "too short"

# 9-10. add VALIDATES ITS KEYS. held.sh had to learn this: it accepted a 32-char md5, an UPPERCASE md5 and a
# 1-char md5, each of which `list` shows as live and which can never match anything.
ck "add with a bad state refused" 2 env CT_RUNID=selftest "$BN" add "#999" bogus - - "a note long enough to pass the floor"
ck "add with a 32-char md5 refused" 2 env CT_RUNID=selftest "$BN" add "#999" built - "A4DF39C38222A4DF39C38222A4DF3922" "a note long enough to pass the floor"

# 11. THE NEGATIVE CONTROL: none of the refusals above wrote anything.
# #454's first version of this check used `git diff` on a file that is NEW and therefore untracked, so git could
# never have reported a change whatever happened - a vacuous control that LOOKED like it passed. Keyed on the
# file's own md5 instead.
AFTER="$(md5sum "$TD/build-numbers.tsv" | cut -c1-12)"
BEFORE="$(md5sum "$HERE/build-numbers.tsv" | cut -c1-12)"
eq "no refused call wrote to the register" "$BEFORE" "$AFTER"

# 12. THE POSITIVE CONTROL, WITHOUT WHICH CASE 11 IS WORTHLESS. A legal call MUST write, or "nothing changed"
# proves only that the tool is inert. This is the rule #418 paid for: ask what your check prints on a case you
# already know is fine, before believing what it printed on the case in question.
CT_RUNID=selftest "$BN" record "#999" aaaaaaaaaaaa bbbbbbbbbbbb >/dev/null 2>&1
NOW="$(md5sum "$TD/build-numbers.tsv" | cut -c1-12)"
if [ "$NOW" != "$AFTER" ]; then P=$((P+1)); echo "PASS a legal record DOES write, so case 11 is not vacuous"
else F=$((F+1)); echo "FAIL nothing writes at all - every case above proves nothing"; fi

# 13. record IS IDEMPOTENT ON THE TRIPLE: re-gating the same bundle must not grow the register, while a
# genuinely new bundle under the same number must.
CT_RUNID=selftest "$BN" record "#999" aaaaaaaaaaaa bbbbbbbbbbbb >/dev/null 2>&1
eq "record is idempotent on an identical triple" "1" "$(grep -c '^999' "$TD/build-numbers.tsv")"
CT_RUNID=selftest "$BN" record "#999" cccccccccccc bbbbbbbbbbbb >/dev/null 2>&1
eq "a NEW bundle under the same number DOES append" "2" "$(grep -c '^999' "$TD/build-numbers.tsv")"

# 14. next IS THE HIGHEST PLUS ONE, and it is computed numerically. A lexical sort would put 99 after 454.
eq "next is numeric, not lexical" "#1000" "$(CT_RUNID=selftest "$BN" next)"

# 15. A REGISTER WITH NO NUMBERED ROWS MUST REFUSE TO INVENT A SERIES rather than start at 1.
printf '# header only, no rows\n' > "$TD/empty.tsv"
cp "$TD/build-numbers.tsv" "$TD/keep.tsv"; cp "$TD/empty.tsv" "$TD/build-numbers.tsv"
ck "next on an empty register refuses"  2 "$BN" next
ck "mint on an empty register refuses"  2 env CT_RUNID=selftest "$BN" mint "a note that is comfortably long enough"
cp "$TD/keep.tsv" "$TD/build-numbers.tsv"

# 16. A MISSING REGISTER IS A USAGE ERROR, not a silent "free".
# AND IT RESTORES THE FILE AFTERWARDS. The first version did not, so every case added after it ran against a
# register that did not exist and the concurrency case reported "0 of 4 minted" as a pass. A destructive case
# that leaks its damage into later cases makes those cases report on nothing - the same shape as the vacuous
# control this file's case 11 exists to prevent, one level up.
cp "$TD/build-numbers.tsv" "$TD/keep16.tsv"
rm -f "$TD/build-numbers.tsv"
ck "a missing register refuses rather than answering free" 2 "$BN" check "#454"
cp "$TD/keep16.tsv" "$TD/build-numbers.tsv"

# ════ THE CASES ANTAGONIST A's VETO ADDED (#454). Each one FAILED before the fix it guards. ════════════════
# These are here, and not in a paragraph, because A's two blocking defects were both invisible to the twelve
# controls above: those pointed only at argument validation, which returns before anything is written.

# 17. CONCURRENT MINT. Four runs minting at once must each get a DIFFERENT number - never the same one twice.
# Before the fix all four got #455 with four exit 0s, because the read-back counted rows attributed to ME
# rather than rows for the NUMBER: each run saw exactly its own row and proceeded to stamp. That is the #416
# defect reproduced inside the guard written to prevent it.
# THE ASSERTION HERE WAS WRONG IN ITS FIRST VERSION AND IS RECORDED RATHER THAN QUIETLY CORRECTED: it asserted
# the four runs get ONE number between them, which is not the property wanted. Serialised correctly, four
# minters get 455/456/457/458 - four successes and four distinct numbers. The invariant is DISTINCTNESS, not
# scarcity, and an assertion aimed at the wrong property passes and fails for the wrong reasons.
BEFORE_N="$(grep -vE '^[[:space:]]*#' "$TD/build-numbers.tsv" | awk -F'\t' '$1 ~ /^[0-9]+$/' | wc -l | tr -d ' ')"
OUT="$(for i in 1 2 3 4; do CT_RUNID="race-$i" "$BN" mint "concurrent mint attempt $i for the lock test" 2>/dev/null & done; wait)"
GOT="$(printf '%s\n' "$OUT" | grep -c '^#' || true)"
UNIQ="$(printf '%s\n' "$OUT" | grep '^#' | sort -u | wc -l | tr -d ' ')"
eq "every concurrent mint got a DISTINCT number" "$GOT" "$UNIQ"
# SCOPED TO THE RACE'S OWN ROWS, and that scoping is the point rather than a convenience: the live register
# DELIBERATELY carries five recorded collisions (416, 440, 441, 451, 452 - real history this file exists to make
# visible) plus #999 from case 12. A whole-file duplicate scan therefore reports those as failures, which is the
# frozen-denominator mistake in miniature: the right denominator is the rows THIS CASE created.
DUPES="$(grep -vE '^[[:space:]]*#' "$TD/build-numbers.tsv" | awk -F'\t' '$1 ~ /^[0-9]+$/ && $7 ~ /^race-/ {print $1}' | sort -n | uniq -d | tr '\n' ' ')"
if [ -z "${DUPES// /}" ]; then P=$((P+1)); echo "PASS the race left NO number claimed twice"
else F=$((F+1)); echo "FAIL the race left duplicate number(s): $DUPES - this is the #416 defect"; fi
AFTER_N="$(grep -vE '^[[:space:]]*#' "$TD/build-numbers.tsv" | awk -F'\t' '$1 ~ /^[0-9]+$/' | wc -l | tr -d ' ')"
eq "one row per successful mint, no row lost or doubled" "$GOT" "$(( AFTER_N - BEFORE_N ))"

# 18. A REGISTER WHOSE LAST LINE LOST ITS TRAILING NEWLINE. `record` used to append onto that line, merging two
# rows into one 17-field row, making the number INVISIBLE while reporting success - after which `check` answered
# "free" and the number would be stamped twice. This is the automatic path build.sh uses.
printf '%s' "$(cat "$TD/build-numbers.tsv")" > "$TD/nonl.tsv"   # strips the final newline
cp "$TD/build-numbers.tsv" "$TD/keep2.tsv"; cp "$TD/nonl.tsv" "$TD/build-numbers.tsv"
[ -n "$(tail -c1 "$TD/build-numbers.tsv")" ] && echo "   (register deliberately has no final newline)"
CT_RUNID=selftest "$BN" record "#777" dddddddddddd eeeeeeeeeeee >/dev/null 2>&1
RC=$?
if [ "$RC" = "0" ]; then P=$((P+1)); echo "PASS record succeeded on a newline-less register"
else F=$((F+1)); echo "FAIL record exited $RC on a newline-less register"; fi
# THE POINT OF THE CASE: the number must be FINDABLE afterwards. This is what was broken.
"$BN" check "#777" >/dev/null 2>&1
if [ "$?" = "1" ]; then P=$((P+1)); echo "PASS #777 is findable after a record onto a newline-less register"
else F=$((F+1)); echo "FAIL #777 is INVISIBLE after record - the row merged onto the previous line"; fi
eq "no 17-field row was created" "0" "$(awk -F'\t' 'NF>9' "$TD/build-numbers.tsv" | wc -l | tr -d ' ')"
cp "$TD/keep2.tsv" "$TD/build-numbers.tsv"

# 19. CT_RUNID IS A FIELD. A newline in it injected a complete, well-formed nine-field row that `rows()`
# accepted - a permanent fake collision written by a call that then exited 1. A tab shifted every field.
B4="$(md5sum "$TD/build-numbers.tsv" | cut -c1-12)"
CT_RUNID="$(printf 'run\n998\tminted\t-\t-\t-\tx\ty\tinjected')" "$BN" mint "a note long enough to pass the twenty char floor" >/dev/null 2>&1
ck "a newline in CT_RUNID is refused" 2 env CT_RUNID="$(printf 'run\nevil')" "$BN" mint "a note long enough to pass the twenty char floor"
ck "a tab in CT_RUNID is refused"     2 env CT_RUNID="$(printf 'run\tevil')" "$BN" mint "a note long enough to pass the twenty char floor"
eq "no forged row was injected by CT_RUNID" "$B4" "$(md5sum "$TD/build-numbers.tsv" | cut -c1-12)"
eq "no row claims the injected number 998" "0" "$(grep -c '^998' "$TD/build-numbers.tsv" || true)"

# 20. THE SERIES MUST NOT BE WEDGED BY ONE HIGH ROW. A legal 4-digit `add` of #9999 used to make `next` return
# #10000 and `mint` hand it out - a number build.sh and `check` both refuse, for ever, with no escape but
# hand-editing. next and mint now validate their OWN OUTPUT against the range they document.
CT_RUNID=selftest "$BN" add "#9999" built - - "a deliberately high row to test the range wedge" >/dev/null 2>&1
ck "next refuses to return a 5-digit number" 2 "$BN" next
ck "mint refuses to hand out a 5-digit number" 2 env CT_RUNID=selftest "$BN" mint "this must not be handed out at all"
eq "nothing in the 10000 range was written" "0" "$(grep -c '^10000' "$TD/build-numbers.tsv" || true)"
sed -i '/^9999\t/d' "$TD/build-numbers.tsv"

# 21. FIELD 5 IS THE LOAD-BEARING KEY and was the unvalidated one: sourceMd5 is what held.sh compares against
# the working tree, so an unusable value there is worse than an unusable bundle md5.
ck "a non-hex CT_SRCMD5 is refused"  2 env CT_RUNID=selftest CT_SRCMD5=NOT-A-HASH-AT-ALL "$BN" add "#996" built - - "a note long enough to pass the floor here"
ck "a tab in CT_PROV is refused"     2 env CT_RUNID=selftest CT_PROV="$(printf 'p\tq')" "$BN" add "#996" built - - "a note long enough to pass the floor here"

# ════ THE CASES ANTAGONIST B's VETO ADDED (#454) ══════════════════════════════════════════════════════════════
# B's P0-1 was the worst defect in this build and NOTHING above could see it, because every case above tests
# buildnum.sh in isolation and the defect was in the INTEGRATION: build.sh asked `check`, which is true of any
# row including the `minted` row `mint` had just written, so the documented sequence mint-then-build deadlocked.
# The tell B used is worth keeping: the register shipped with ZERO `minted` rows, so the happy path had never
# been run even once. An untested path is not a passing path.

# 22. THE HAPPY PATH: mint, then ask whether the number I just minted is mine to stamp. This is the deadlock.
MN="$(CT_RUNID=happy "$BN" mint 'the documented happy path, mint then build' 2>/dev/null | head -1)"
eq "mint returned a number" "#" "$(printf '%s' "$MN" | cut -c1)"
ck "a number I just minted IS stampable by me"      0 env CT_RUNID=happy  "$BN" stampable "$MN"
ck "the same number is NOT stampable by another run" 1 env CT_RUNID=other "$BN" stampable "$MN"
ck "stampable without CT_RUNID refuses (it cannot tell whose it is)" 2 env -u CT_RUNID "$BN" stampable "$MN"

# 23. THE MID-RUN REBUILD, which this register's own header calls the median behaviour of any number whose run
# needed a fix - and which the `check`-based guard also refused, because build.sh wrote a `built` row and then
# read it back as a reason to refuse itself.
CT_RUNID=happy "$BN" record "$MN" 1111aaaa2222 3333bbbb4444 >/dev/null 2>&1
ck "my own number stays stampable after I have built it (rebuild)" 0 env CT_RUNID=happy "$BN" stampable "$MN"
ck "and it is still refused to a different run"                    1 env CT_RUNID=other "$BN" stampable "$MN"

# 24. A NUMBER ON NO ROW is stampable by anyone - build.sh warns that it was chosen rather than issued, and
# that is deliberately a warning and not a refusal (see build.sh's header).
ck "an unused number is stampable" 0 env CT_RUNID=happy "$BN" stampable "#998"

# 25. THE WORDING. B measured that the >1-row message called four ordinary numbers COLLISIONS, including #452,
# which is what origin/main serves - an alarm wrong four times in five destroys the signal for #416, the one
# real collision. "COLLISION" must now appear only where a row says so itself.
eq "check on a multi-artefact number does NOT cry collision" "0" "$("$BN" check '#452' 2>/dev/null | grep -ci 'is a COLLISION' || true)"
eq "check on #452 does say its number is ambiguous"          "1" "$("$BN" check '#452' 2>/dev/null | grep -ci 'names 2 artefacts' || true)"
eq "list reserves the word collision for #416"               "1" "$("$BN" list 2>/dev/null | grep -ci 'Only #416 is a genuine' || true)"

# 26. A SHA THAT NAMES NO OBJECT. The register shipped with one (004cb86f6a9, inherited from held-trees.tsv),
# which passed hex and length and resolved to nothing.
ck "a sha that names no object is refused"  2 env CT_RUNID=selftest "$BN" add "#997" held 004cb86f6a9 - "a note long enough to pass the floor here"
ck "a real short sha is accepted"           0 env CT_RUNID=selftest "$BN" add "#997" held 004cb86 - "a note long enough to pass the floor here"
ck "a sha of a single comma is refused"     2 env CT_RUNID=selftest "$BN" add "#995" held , - "a note long enough to pass the floor here"

echo "---"
echo "buildnum self-test: $P pass, $F fail"
[ "$F" = "0" ]
