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
# AN EXPORTED BUILDNUM_MAX_DELTA WOULD CHANGE EVERY SERIES CASE BELOW, so it is scrubbed here, as case 7 scrubs CT_RUNID
# (build #465's antagonist A ran this file with CT_RUNID exported and got failures that had nothing to do with the tool).
# The override cases in 28f pass it explicitly, one call at a time, with env.
unset BUILDNUM_MAX_DELTA
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

# row_for <number> [state]: one real-shaped nine-field register row. Fixtures that must put a STRAY row on a register
# write it with this and not with `add`, because add refuses a stray row now (that refusal is one of the things the
# series-bound cases below control), and a fixture that goes through the guard it is testing proves nothing.
row_for() { printf '%s\t%s\t-\t-\t-\t2026-01-01T00:00Z\tfixture\tfixture\ta note long enough to pass the floor\n' "$1" "${2:-issued}"; }
# mkreg <dir> <number>...: a directory of its own holding a copy of buildnum.sh and a register of exactly these rows.
mkreg() { local d="$1" n; shift; mkdir -p "$d"; cp "$HERE/buildnum.sh" "$d/buildnum.sh"; chmod +x "$d/buildnum.sh"
          : > "$d/build-numbers.tsv"; for n in "$@"; do row_for "$n" >> "$d/build-numbers.tsv"; done; }
md5of() { md5sum "$1" | cut -c1-12; }

# ── THE HARNESS PREFLIGHT, THE SAME ONE gates/verify-log-selftest.sh AND gates/held-selftest.sh CARRY
# [#534, fresh antagonist B's P2-1]. verify-log-selftest.sh grew it because sixteen of its assertions called
# helpers defined nowhere in it and were silent no-ops while its footer stayed self-consistent at 62 pass /
# 0 fail. B measured that the guard shipped in ONE selftest of four, and reproduced the identical defect here
# by renaming one `eq` call: 191 pass / 0 fail, exit 0, one stderr line, the assertion simply gone. That is
# "a lesson recorded in one gate does not travel", one file away, inside the build that wrote it down.
# THE LIST IS DERIVED FROM THIS FILE'S OWN CALLS AND DEFINITIONS AT AUTHORING TIME, not guessed, and it is
# still hand-kept: a helper called under a name not on it is silent. The derivation that would close that is
# described in verify-log-selftest.sh and deliberately not shipped, because a scan of this file by this file
# is the self-reference shape this project records nine times and needs its own controls first.
for __fn in ck eq; do
  command -v "$__fn" >/dev/null 2>&1 || {
    printf 'FAIL harness: assertion helper %s is CALLED by this file and is NOT CALLABLE here.\n' "$__fn"
    printf '  Every %s call would be a silent no-op (this file does not set -e), so the footer would report\n' "$__fn"
    printf '  a self-consistent pass count with assertions missing from it. Refusing to run.\n'
    exit 1
  }
done
unset __fn

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

# 8b. FIXTURE COLLISION CONTROL, asserted BEFORE the first case writes anything (TC-SUITE-BN-FIXTURE-001, from
# jobs/the-buildnum-selftest-fixture-was-renumbered-onto-the-live-series-so-it-breaks-the-moment-that-number-is-minted-2026-10-13).
# $TD's register is a COPY OF THE REAL ONE, so a number the fixture writes that the real series has already reached
# is counted twice by the grep -c in case 13 below. That is how the #518/#519 renumbering broke on 13 Oct, and
# a non-zero count here names the cause in one line instead of leaving a later case to fail for a reason that looks
# unrelated. #999 is the only fixture number written to this working register: case 14 builds a register of its own
# and the 4-digit sweep cases further down build theirs. The list is asserted non-empty first, so a refactor that
# empties it fails loudly instead of passing over nothing.
# THE LIST IS READ OFF THIS FILE, NOT TYPED. The 14 Oct direct run's antagonist A measured that the first version was
# FXN="999" followed by `[ -n "$FXN" ]`, a literal tested against itself, which cannot fail. The numbers a fixture can
# collide on are the ones this file passes to record or add, so the list is those, and the guard below fails if a
# refactor ever changes their spelling so that none is found.
FXN="$(grep -oE '(record|add) +"#[0-9]{3,4}"' "${BASH_SOURCE[0]}" | grep -oE '[0-9]{3,4}' | sort -u | tr '\n' ' ')"
if [ -n "${FXN// /}" ]; then P=$((P+1)); echo "PASS the fixture-number list is read off this file and is not empty, so the collision control below is not vacuous"
else F=$((F+1)); echo "FAIL no fixture number was found in this file - the collision control below would pass over nothing"; fi
for fx in $FXN; do
  eq "fixture number #$fx is not already a real row on the register copy" "0" "$(grep -c "^$fx"$'\t' "$TD/build-numbers.tsv" || true)"
done

# 8c. THE REAL REGISTER MUST BE ONE SERIES, OR EVERY MINT CASE BELOW FAILS FOR ONE REASON THAT LOOKS LIKE MANY (14 Oct direct run).
# $TD's register is a copy of the real one and the cases from 17 on mint against it. If the real register ever holds a number
# the series bound cuts off, each of them would fail with a refusal, and a reader would look for twenty causes. Asserted
# BEFORE anything is written, in two independent ways: the largest step between consecutive distinct numbers, measured here
# with awk and not with the tool, and the tool's own answer. Measured on main's register at c6c50cc (#518): 385 distinct numbers, #125 to #518, largest step 4.
REAL_LS="$(grep -v '^[[:space:]]*#' "$TD/build-numbers.tsv" | awk -F'\t' '$1 ~ /^[0-9]+$/ {print $1}' | sort -n -u | awk 'NR > 1 && $1 - p > m {m = $1 - p} {p = $1} END {print m + 0}')"
eq "the real register's largest step between consecutive distinct numbers is $REAL_LS, within the margin of 10 (measured here, not by the tool)" "yes" \
   "$([ "$REAL_LS" -le 10 ] && echo yes || echo no)"
eq "and the tool agrees: next on the real register copy issues a number" "yes" "$(CT_RUNID=selftest "$BN" next >/dev/null 2>&1 && echo yes || echo no)"

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

# 13b. TAKE THE FIXTURE'S ROWS BACK OUT OF THE WORKING REGISTER. $TD's register is a COPY OF THE REAL ONE, and a
# well-formed #999 row on top of a real series that is in the 500s is exactly the bad high row that buildnum.sh's
# delta_ok() refuses to mint past (jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10).
# Left in, it would make every later next/mint in this file refuse. The register is append-only by design, but $TD
# is a throwaway copy, and case 20 below does the same for its own #9999. RENUMBERING THE FIXTURE TO THE NEXT REAL
# NUMBERS INSTEAD DOES NOT WORK: #518/#519 was tried on 13 Oct and the integration run that minted #518 reverted it,
# because every grep -c above then counts the REAL #518 row as well as the fixture's own (95 pass became 93 pass /
# 2 fail, and a third case was due to follow at #519). A fixture row that is taken back out cannot collide with
# anything the series reaches later.
sed -i '/^999\t/d' "$TD/build-numbers.tsv"
eq "the fixture's #999 rows are out of the working register again" "0" "$(grep -c '^999' "$TD/build-numbers.tsv" || true)"

# 14. next IS THE HIGHEST PLUS ONE, and it is computed numerically. A lexical sort would put 99 after 454.
# ON A REGISTER OF ITS OWN, three contiguous rows ending at #999: the cross-digit step (999 -> 1000) is the whole
# point of the case, a lexical sort puts "999" after "1000", and a register of the real copy's size cannot hold
# a #999 row without looking like the bad high row the delta bound exists to refuse. Contiguous rows are ordinary
# growth to that bound (delta 1), so this also shows the bound lets the 3-to-4-digit step through.
CX="$(mktemp -d)"; cp "$HERE/buildnum.sh" "$CX/buildnum.sh"; chmod +x "$CX/buildnum.sh"
for n in 997 998 999; do printf '%s\tissued\t-\t-\t-\t2026-01-01T00:00Z\tfixture\tfixture\ta note long enough to pass the floor\n' "$n"; done > "$CX/build-numbers.tsv"
eq "next is numeric, not lexical" "#1000" "$(CT_RUNID=selftest "$CX/buildnum.sh" next)"
rm -rf "$CX"

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
# visible). A whole-file duplicate scan therefore reports those as failures, which is the
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
# THE ROW IS WRITTEN DIRECTLY, NOT THROUGH add: add refuses a stray row now (see the series-bound cases below).
row_for 9999 built >> "$TD/build-numbers.tsv"
ck "next refuses to return a 5-digit number" 2 "$BN" next
ck "mint refuses to hand out a 5-digit number" 2 env CT_RUNID=selftest "$BN" mint "this must not be handed out at all"
eq "nothing in the 10000 range was written" "0" "$(grep -c '^10000' "$TD/build-numbers.tsv" || true)"
sed -i '/^9999\t/d' "$TD/build-numbers.tsv"

# R08(a)-(d). jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10's OWN
# four-point control set (R08), run on a FRESH isolated register rather than $TD's cumulative one so each case
# starts from a known, contiguous baseline and is not hostage to whatever earlier cases left highest() at.
# THE DIAGNOSIS THIS JOB CORRECTED: case 20 above (#9999) was never the damaging case - in_range() at
# buildnum.sh (line 171 before this change) already refused it LOUDLY, by name, before this job existed. The damaging case is a
# WELL-FORMED #999 row: it passes in_range (3 digits) just fine, silently becomes the new highest(), and next/
# mint used to hand out #1000 at exit 0 with no diagnostic at all - 490 numbers burned in silence had the real
# series been sitting at #510. That is case 22 below. Comparing next()'s output against highest() can never
# catch it, because highest() itself IS the bad row by the time next() runs; the bound has to look at the register
# itself and not at the number being asked for (delta_ok(), added in buildnum.sh). The first version compared highest()
# with the register's next-highest distinct number, which section 28 below shows is not enough.
R08D="$(mktemp -d)"; cp "$HERE/buildnum.sh" "$R08D/buildnum.sh"; chmod +x "$R08D/buildnum.sh"
R08BN="$R08D/buildnum.sh"
seed_r08() { # writes a small, CONTIGUOUS fixture register (…#508 #509 #510) so "the previous highest" is
             # unambiguous and the margin math is easy to check by hand.
  printf '508\tbuilt\t-\taaaaaaaaaaaa\tbbbbbbbbbbbb\t2026-01-01T00:00Z\tfixture\tbuild.sh\ta note long enough to pass the floor\n509\tbuilt\t-\tcccccccccccc\tdddddddddddd\t2026-01-01T00:01Z\tfixture\tbuild.sh\ta note long enough to pass the floor\n510\tshipped\teeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\tffffffffffff\t111111111111\t2026-01-01T00:02Z\tfixture\tmeasured\ta note long enough to pass the floor\n' > "$R08D/build-numbers.tsv"
}

# R08(a). (THE LIVE CASE) a well-formed #999 row appended to a register whose real highest is #510 - the
# exact shape of the production incident this job measured (baseline next=#510, one append, next/mint burn
# straight to #1000). next and mint must now REFUSE, and the refusal must NAME #999, the suspect row - not just
# fail silently or with a message that could be about anything.
seed_r08
row_for 999 built >> "$R08D/build-numbers.tsv"   # written directly: add refuses it now
NEXT_ERR="$(CT_RUNID=selftest "$R08BN" next 2>&1 >/dev/null)"
ck "R08(a) LIVE CASE: next refuses on a well-formed #999 row (used to silently return #1000)" 2 "$R08BN" next
eq "R08(a) the refusal NAMES #999, the suspect row, not just a number" "yes" \
   "$(grep -q '#999' <<<"$NEXT_ERR" && echo yes || echo no)"
ck "R08(a) mint refuses too (used to silently hand out #1000, no diagnostic at all)" 2 \
   env CT_RUNID=selftest "$R08BN" mint "this must not be handed out at all, it would burn 489 numbers"
eq "R08(a) nothing in the 1000 range was written by the refused mint" "0" \
   "$(grep -c '^1000	' "$R08D/build-numbers.tsv" || true)"

# R08(b). (NO REGRESSION) a #9999 row must keep refusing LOUDLY, exactly as it already did via in_range()
# before this job's delta_ok() existed - the fix must not trade the 5-digit gap for the 3-digit one.
seed_r08
row_for 9999 built >> "$R08D/build-numbers.tsv"   # written directly: add refuses it now
NEXT_ERR_B="$(CT_RUNID=selftest "$R08BN" next 2>&1 >/dev/null)"
ck "R08(b) NO REGRESSION: next still refuses a #9999 row (in_range's own case, unchanged)" 2 "$R08BN" next
# AN EXIT CODE SHARED BY TWO GUARDS CANNOT TELL THEM APART (the 14 Oct direct run's antagonist A: this case asserted exit 2 only,
# so it could not distinguish in_range's refusal from the series bound's). The message can.
eq "R08(b) and it is IN_RANGE that refuses (five-digit wording), not the series bound" "1 0" \
   "$(printf '%s' "$NEXT_ERR_B" | grep -c 'which is 5 digits') $(printf '%s' "$NEXT_ERR_B" | grep -c 'cut off from its own series')"
ck "R08(b) NO REGRESSION: mint still refuses a #9999 row" 2 env CT_RUNID=selftest "$R08BN" mint "this must still refuse, same as before this job"

# R08(c). (NON-VACUITY) a legitimate append of the REAL next number - #511, one past the seeded #510 - must
# still succeed. A delta bound tight enough to refuse ordinary growth is the obvious wrong fix this control
# exists to catch.
seed_r08
eq "R08(c) NON-VACUITY: next still returns the real next number for ordinary growth" "#511" "$(CT_RUNID=selftest "$R08BN" next)"
ck "R08(c) NON-VACUITY: mint still succeeds for ordinary growth" 0 env CT_RUNID=selftest "$R08BN" mint "an ordinary legitimate build, one past the seeded highest"
eq "R08(c) and the minted row is #511, not refused or skipped" "1" "$(grep -c '^511	' "$R08D/build-numbers.tsv")"
rm -rf "$R08D"

# R08(d), THE OTHER 86, already proved by this file's own footer count, not a separate assertion here:
# this run's own "pass"/"fail" totals below ARE that count, and jobs/...-2026-10-10's record of them on
# parkedAt is what carries the number forward. Restated here only so a reader of the case list, not the footer,
# still sees the obligation named. The count printed below is computed, not typed: the hard-coded "89" this line
# used to carry was false the day it was written (the 14 Oct direct run's antagonist A: 44 cases were above it and 54 below).
echo "R08(d): the $((P + F)) cases counted so far are in this run's own pass/fail footer, not re-counted here."

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
ck "a real short sha is accepted"           0 env CT_RUNID=selftest "$BN" add "$MN" held 004cb86 - "a note long enough to pass the floor here"
ck "a sha of a single comma is refused"     2 env CT_RUNID=selftest "$BN" add "#995" held , - "a note long enough to pass the floor here"

# 27. SWEEP: THE REGISTER'S DENOMINATOR, AND THE SHALLOW CLONE THAT MAKES A CLEAN SWEEP MEANINGLESS.
# #465 measured 88 numbers named by a commit subject and absent from the register, #463 among them - a number
# whose own close-out commit says NOT SHIPPED, reading `free` to check and therefore to gates/build.sh. The
# backfill came from RUN-LOG.md and the gatelog filenames, which only carry a number once a run writes records,
# so every run that stood down was invisible to it. These cases pin the sweep AND its two refusals; the shallow
# ones matter most, because a shallow clone names fewer numbers, finds fewer missing and reports success.
ck "sweep outside a work tree measures nothing and says so" 2 "$BN" sweep
# THE UNKNOWN-MODE CASE IS ASSERTED AGAINST THE GIT FIXTURE FURTHER DOWN, NOT HERE, AND THAT IS THE WHOLE
# POINT. #465's antagonist A proved the obvious version vacuous: `$BN` lives in a temp dir that is not a work
# tree, so `$BN sweep --wat` exits 2 at the work-tree check and NEVER REACHES the mode guard - A deleted the
# mode guard outright and the control still passed. An exit code shared by two guards cannot tell them apart,
# so the real case is `ck ... 2 "$BG" sweep --wat` below, where the work-tree check passes and a missing mode
# guard would exit 3 instead. Same family as the two gates that both asserted exit 2 and read no message.

# A GIT FIXTURE WHOSE HISTORY AND REGISTER ARE THE SAME REPOSITORY, which is what the sweep requires and what
# the first version of it got wrong: it read `git log` from $PWD and the register from $HERE, so running the
# tool from a temp directory while sitting inside the real checkout compared one repo against another's register.
GD="$TD/fix"; mkdir -p "$GD"
cp "$HERE/buildnum.sh" "$GD/buildnum.sh"; chmod +x "$GD/buildnum.sh"
printf '%s\n' '# fixture register' '900	issued	-	-	-	2026-01-01T00:00Z	fixture	fixture	a note long enough to pass the floor' > "$GD/build-numbers.tsv"
git -C "$GD" init -q 2>/dev/null
git -C "$GD" config user.email selftest@example.com; git -C "$GD" config user.name selftest
git -C "$GD" add -A >/dev/null 2>&1
git -C "$GD" commit -q -m "#900: the number already on the fixture register" >/dev/null 2>&1
git -C "$GD" commit -q --allow-empty -m "#901: a number used by a run that never shipped" >/dev/null 2>&1
git -C "$GD" commit -q --allow-empty -m "docs after #902: a non-leading mention still spends the number" >/dev/null 2>&1
# THE HASHLESS FORM, which the first version of `sweep` could not see. #465's antagonist B measured 27 real
# subjects reading "Build NNN" with no '#', naming 16 spent numbers that all answered `free`. A fixture that
# only ever writes '#' agrees with that bug exactly as #432's archive fixtures agreed with theirs.
git -C "$GD" commit -q --allow-empty -m "Build 903: the hashless form this project's early history actually used" >/dev/null 2>&1
# AND THE FORMS THAT MUST NOT MATCH, all of them real strings from this repository's own subjects. If the
# extractor is ever loosened to a bare [0-9]{3,4} these become build numbers and the register fills with
# assertion totals and geometries.
git -C "$GD" commit -q --allow-empty -m "GATES GREEN at 3320 assertions, 49 suites / 3320, at 375x730, TC-PL-034, sha 97b1234" >/dev/null 2>&1
# AND A NUMBER NAMED ONLY IN A COMMIT **BODY** MUST NOT BE SWEPT. This is the regression test for the veto
# antagonist B raised in #465's cross-read, and it is the sharpest control in this file because the defect was
# live at HEAD and self-inflicted. For one revision the extractor read `%s%n%b`, so the commit message and
# HANDOFF.md text DOCUMENTING the 4-digit comm demonstration - which contains #999, #1000 and #1001 - made the
# sweep report those three as spent, exit 3. With the gates/build.sh wiring that meant every later build would
# print "the register and the commit history DISAGREE" and offer `sweep --add`, which would have written three
# permanent rows for numbers nothing ever built, two of them in the FUTURE, moving `next` from #466 to #1002.
# WRITING ABOUT A BUILD NUMBER SPENT IT: the documentation of a defect became an input to the scanner that
# defect was in, which is the self-reference trap this project records ten times, in a new costume.
git -C "$GD" commit -q --allow-empty -m "#900 note: a body that MENTIONS numbers must not spend them" -m "This body names #991 and Build 992 while documenting something. Neither may be swept." >/dev/null 2>&1
BG="$GD/buildnum.sh"
ck "sweep finds the numbers a commit names and the register does not" 3 "$BG" sweep
eq "it names all three, the hashless Build 903 included" "901 902 903 " "$("$BG" sweep 2>/dev/null | sed -n 's/^  absent: //p')"
eq "a number named ONLY in a commit BODY is NOT swept (the #465 feedback loop)" "0" \
   "$("$BG" sweep 2>/dev/null | sed -n 's/^  absent: //p' | grep -cE '99[12]')"
eq "and it takes NOTHING from counts, geometries, case ids or shas" "1" "$("$BG" sweep 2>/dev/null | grep -c 'absent: 901 902 903 $')"
# THE DENOMINATOR, CROSS-CHECKED AGAINST GIT RATHER THAN HARDCODED. The first version asserted the literal
# "measured over 3 commits" and went red the moment the fixture gained a commit - a control that breaks when
# its fixture grows is a control nobody will keep. `git rev-list --count --all` is an INDEPENDENT reading of
# the same quantity (git, not the tool under test), so this stays a real cross-check rather than reading the
# expectation off the thing it is checking.
eq "it publishes the denominator it measured, and the number is right" "1" \
   "$("$BG" sweep 2>/dev/null | grep -c "measured over $(git -C "$GD" rev-list --count --all) commits")"
MG="$(md5sum "$GD/build-numbers.tsv" | cut -d' ' -f1)"
# env -u, NOT a bare call. Antagonist A ran this file with CT_RUNID EXPORTED - which every CLAUDE.md recipe
# invites, and which a run that exports it once gets for free - and got "60 pass, 2 FAIL" on two cases that
# have nothing to do with the tool. Case 7 above already knew to scrub; this one did not.
ck "sweep --add refuses with no CT_RUNID" 2 env -u CT_RUNID "$BG" sweep --add
eq "and that refusal wrote nothing"       "$MG" "$(md5sum "$GD/build-numbers.tsv" | cut -d' ' -f1)"
ck "sweep rejects an unknown mode, where the work-tree check PASSES" 2 "$BG" sweep --wat
ck "sweep --add records them with CT_RUNID" 0 env CT_RUNID=selftest "$BG" sweep --add
ck "and the sweep is then clean"            0 "$BG" sweep
eq "the rows are issued, not shipped"       "3" "$(awk -F'\t' '$2=="issued" && $8=="git-log"' "$GD/build-numbers.tsv" | wc -l | tr -d ' ')"
eq "every written row has exactly 9 fields" "1" "$(awk -F'\t' '!/^#/ && NF {print NF}' "$GD/build-numbers.tsv" | sort -u | wc -l | tr -d ' ')"
eq "#901 now answers ISSUED rather than free" "1" "$("$BG" check '#901' 2>/dev/null | grep -c 'already on the register')"

# 27a. THE SWEPT ROW MUST BE AUDITABLE WITHOUT RE-RUNNING THE SWEEP, AND THE ORDER OF OPERATIONS MUST HOLD.
# These are the two R08 cases owed by jobs/swept-register-rows-cite-no-sha-so-they-cannot-be-audited-without-the-tool-2026-10-02
# and jobs/sweep-computes-the-absent-set-before-it-takes-the-lock-2026-10-02. BOTH jobs were SKIPPED by two
# separate burst agents on 2026-10-03 for the same reason and they recorded it: one held gates/buildnum.sh and
# could not write the case, the other held THIS file and could not reach the fix. Two agents, one artefact lock
# each, one job undone twice. They land together because R44 lets one agent hold both.
# WHY THIS IS NOT A COUNT. "104 rows cite no sha" is a fact about one afternoon; the assertion is that EVERY row
# this tool writes carries evidence a reader can fetch, which is the class and not the instance [R06].
SWEPT_SHAS="$(awk -F'\t' '$8=="git-log" {print $1"\t"$3}' "$GD/build-numbers.tsv")"
eq "every swept row carries a sha and none carries '-'" "0" \
   "$(printf '%s\n' "$SWEPT_SHAS" | awk -F'\t' '$2=="-"' | grep -c . )"
R_OK=0; R_SUBJ=0; R_N=0
while IFS="$(printf '\t')" read -r _num _sha; do
  [ -n "${_num:-}" ] || continue
  R_N=$((R_N+1))
  git -C "$GD" cat-file -e "$_sha" 2>/dev/null && R_OK=$((R_OK+1))
  # #527: captured, then tested with a herestring. This was `git show ... | grep -qE ... && R_SUBJ=...`, a pipeline
  # into grep -q whose status decides control flow, the shape gates/records-gate.sh entries_ratchet() was measured
  # taking SIGPIPE in under load; gatemanifest.sh's sigpipe audit filed it as TIER D because the `&&` that reads
  # its status is on the continuation line.
  _subj="$(git -C "$GD" show --no-patch --format=%s "$_sha" 2>/dev/null)"
  grep -qE "(#|[Bb]uild +)0*$_num(\$|[^0-9])" <<< "$_subj" && R_SUBJ=$((R_SUBJ+1))
done <<< "$SWEPT_SHAS"
eq "every swept sha RESOLVES under git cat-file -e"            "$R_N" "$R_OK"
eq "and the commit it names has that number in its SUBJECT"    "$R_N" "$R_SUBJ"
eq "and there were three swept rows to check, not zero"        "3"    "$R_N"
# THE NEGATIVE HALF, BECAUSE A DENOMINATOR THAT CANNOT BE EMPTY IS NOT THE ONLY VACUITY TRAP: a predicate that
# cannot say NO is the other one. The fixture's own pre-existing #900 row carries '-' in field 3 - the exact
# shape every swept row had before this fix - so the same two predicates are run against it and must FAIL.
# Without this the four assertions above would read identically on a register where nothing was checkable.
BAD_SHA="$(awk -F'\t' '$1==900 {print $3; exit}' "$GD/build-numbers.tsv")"
# NOT "exit 1". MEASURED: `git cat-file -e -` exits 128, not 1, because '-' is not a malformed object id that
# cat-file rejects, it is a rev git cannot parse at all. The first draft of this case asserted 1 and went red on
# a correct tree - a control whose expected value was guessed rather than read, which is the thing this whole
# file exists to stop. The assertion is therefore that the predicate says NO (non-zero), not which non-zero.
eq "the predicate is shown able to say NO: the '-' row's sha does not resolve" "no" \
   "$(git -C "$GD" cat-file -e "$BAD_SHA" 2>/dev/null && echo yes || echo no)"
eq "and that row is the pre-existing one, so the control is a real row and not a fabrication" "-" "$BAD_SHA"
# THE ORDER OF OPERATIONS, ASSERTED BY READING THE SCRIPT RATHER THAN BY RACING TWO PROCESSES. The job itself
# proposes this: a true concurrency case needs two processes and would have to argue R36 admission (deterministic
# across three runs) before it could join anything, while the order is a property of the file and is the same on
# every run. It reads the REPOSITORY copy under test, not the temp copy, so a reader can point at the line.
SRC="$HERE/buildnum.sh"
LT_LINE="$(grep -n 'lock_take || exit 1' "$SRC" | tail -1 | cut -d: -f1)"
AN_LINE="$(grep -n 'ABSENT_NOW="\$(comm' "$SRC" | head -1 | cut -d: -f1)"
eq "the absent set is re-derived AFTER the lock is taken, not before" "yes" \
   "$([ -n "$AN_LINE" ] && [ -n "$LT_LINE" ] && [ "$AN_LINE" -gt "$LT_LINE" ] && echo yes || echo no)"
eq "and the append loop iterates the RE-DERIVED set"   "1" "$(grep -c 'for n in \$(printf .*ABSENT_NOW' "$SRC")"
eq "and never the pre-lock set it reported"            "0" "$(grep -c 'for n in \$(printf .*\$ABSENT"' "$SRC")"
# AND THE RE-DERIVATION MUST COMPARE UNDER LC_ALL=C LIKE THE ONE IT COPIES. #465's antagonist B found that comm
# wants lexicographic order while both sets are sorted numerically, and the two agree only while every number
# has the same digit count - it bites at #1000, which in_range permits. A second comparison that drifted from
# the first would reintroduce that defect inside the lock, where the 4-digit fixture below would still pass.
eq "both comm comparisons sort under LC_ALL=C" "4" "$(grep -c 'LC_ALL=C sort -u' "$SRC")"

# 27b. THE SHALLOW CLONE, AND BOTH BRANCHES, AND THE FIXTURE REBUILT BECAUSE THE FIRST ONE WAS A NO-OP.
# BOTH of #465's antagonists, independently and from different doors, measured that the first version of this
# block could not see the guard it was named for. `grep -v '^901'` was meant to manufacture an absent number
# on the shallow clone; it did nothing, because `sweep --add` had written 901/902 to the fixture's WORKING TREE
# and never committed them, so a `file://` clone copied a register holding #900 alone. The shallow clone then
# had 1 absent (#902, absent for the unrelated reason that its register predated the --add) and exited 3
# through the ORDINARY absent path. Antagonist A proved the vacuity the right way round: it replaced the
# shallow-and-clean branch with `:` and the control still passed. So the branch that is the entire point of
# the feature - a shallow clone names fewer numbers, finds fewer missing, and reports SUCCESS - was asserted
# in the case record and exercised by nothing. That is this project's "an untested path is not a passing
# path" one level up: an untested path with a control pointing at it.
# AND IT IS THE PRODUCTION STATE, which is why it is worth this much text: the routine's clone IS shallow, so
# a sweep in a routine container reaches this branch first, not the absent path.
# THE FIXTURE NOW COMMITS ITS REGISTER before cloning, so the shallow clone carries 900/901/902/903, and the
# two cases are built from it deliberately.
git -C "$GD" add -A >/dev/null 2>&1
git -C "$GD" commit -q -m "#900 records: commit the swept register so a clone of this fixture carries it" >/dev/null 2>&1
SD="$TD/shal"
git clone -q --depth 1 --no-local "file://$GD" "$SD" 2>/dev/null
if [ -f "$SD/.git/shallow" ] && [ -f "$SD/build-numbers.tsv" ]; then
  cp "$HERE/buildnum.sh" "$SD/buildnum.sh"; chmod +x "$SD/buildnum.sh"; BS="$SD/buildnum.sh"
  # CASE 1: SHALLOW AND GENUINELY CLEAN. The clone's one commit names #900, which its register holds, so
  # NABSENT really is 0 - and the sweep must STILL exit 3 rather than report a clean register.
  eq "the shallow clone really has zero absent" "0 NAMED AND ABSENT" \
     "$("$BS" sweep 2>/dev/null | grep -o '[0-9]* NAMED AND ABSENT' | head -1)"
  ck "a shallow sweep with ZERO absent still refuses to report clean" 3 "$BS" sweep
  eq "and it says the clone is shallow"         "1" "$("$BS" sweep 2>/dev/null | grep -c 'THIS CLONE IS SHALLOW')"
  eq "it does NOT print the all-clear sentence" "0" "$("$BS" sweep 2>/dev/null | grep -c 'names every number')"
  MS="$(md5sum "$SD/build-numbers.tsv" | cut -d' ' -f1)"
  # EXIT 3, NOT 2, AND THE DIFFERENCE IS THE REASON CASE 2 EXISTS. With zero absent the command stops at the
  # clean-but-shallow branch and never evaluates the --add refusal, so the exit code here is the "I could not
  # measure this" 3 rather than the "I refuse to write" 2. It writes nothing either way, which is the property
  # that matters and is asserted on the register's md5. Expecting 2 here was MY error, caught by this control
  # on its first run; the --add refusal proper is reached only in case 2 below.
  ck "sweep --add on a shallow CLEAN clone stops at the unmeasured branch" 3 env CT_RUNID=selftest "$BS" sweep --add
  eq "and wrote nothing"                        "$MS" "$(md5sum "$SD/build-numbers.tsv" | cut -d' ' -f1)"
  # CASE 2: SHALLOW AND GENUINELY DIRTY, which is the only way to reach the --add refusal itself - with zero
  # absent the command exits at the clean branch above before that refusal is ever evaluated.
  grep -v '^900' "$SD/build-numbers.tsv" > "$SD/r.tsv" && mv "$SD/r.tsv" "$SD/build-numbers.tsv"
  eq "now the shallow clone has one absent"     "1 NAMED AND ABSENT" \
     "$("$BS" sweep 2>/dev/null | grep -o '[0-9]* NAMED AND ABSENT' | head -1)"
  MS2="$(md5sum "$SD/build-numbers.tsv" | cut -d' ' -f1)"
  ck "sweep --add refuses on a shallow clone with one absent" 2 env CT_RUNID=selftest "$BS" sweep --add
  eq "and wrote nothing then either"            "$MS2" "$(md5sum "$SD/build-numbers.tsv" | cut -d' ' -f1)"
else
  # A VACUOUS SKIP IS A GREEN FOOTER OVER A DEGRADED CONTROL SET, which antagonist A measured: the first
  # version emitted one passing `eq "skip" "skip"` and the footer read 59 pass / 0 fail. It FAILS now.
  F=$((F+1)); printf 'FAIL the shallow fixture could not be built, so 9 shallow controls did NOT run\n'
fi

# 27c. FOUR DIGITS, BECAUSE comm MERGES LEXICALLY AND BOTH SETS ARE SORTED NUMERICALLY.
# Found by both antagonists. Latent today (no 4-digit number exists in this history or on the register) and
# `in_range` already permits four, so it is reachable without any other change. Reproduced end to end before
# it was fixed: with the register holding 1000 and the subjects naming #999/#1000/#1001, the sweep reported
# ALL THREE absent - #1000 included, which IS on the register - and `sweep --add` then appended a DUPLICATE
# row to a file whose own header says a row is never removed. comm's "file 1 is not in sorted order" warning
# goes to stderr inside a command substitution, so it was discarded and its exit 1 never seen.
QD="$TD/four"; mkdir -p "$QD"
cp "$HERE/buildnum.sh" "$QD/buildnum.sh"; chmod +x "$QD/buildnum.sh"
printf '%s\n' '# four-digit fixture' '1000	issued	-	-	-	2026-01-01T00:00Z	fixture	fixture	a note long enough to pass the floor' > "$QD/build-numbers.tsv"
git -C "$QD" init -q 2>/dev/null
git -C "$QD" config user.email selftest@example.com; git -C "$QD" config user.name selftest
git -C "$QD" add -A >/dev/null 2>&1
git -C "$QD" commit -q -m "#1000: the number this fixture's register already holds" >/dev/null 2>&1
git -C "$QD" commit -q --allow-empty -m "#999: three digits, genuinely absent" >/dev/null 2>&1
git -C "$QD" commit -q --allow-empty -m "#1001: four digits, genuinely absent" >/dev/null 2>&1
BQ="$QD/buildnum.sh"
eq "with 4-digit numbers the absent set is exactly the two that are absent" "999 1001 " \
   "$("$BQ" sweep 2>/dev/null | sed -n 's/^  absent: //p')"
eq "and #1000, which IS on the register, is NOT called absent" "0" \
   "$("$BQ" sweep 2>/dev/null | sed -n 's/^  absent: //p' | grep -c '1000')"
ck "the 4-digit sweep still exits 3 on a real divergence" 3 "$BQ" sweep
ck "and --add records only the two"  0 env CT_RUNID=selftest "$BQ" sweep --add
eq "so #1000 still has exactly ONE row, not a duplicate" "1" \
   "$(awk -F'\t' '$1=="1000"' "$QD/build-numbers.tsv" | wc -l | tr -d ' ')"
ck "and the 4-digit sweep is then clean" 0 "$BQ" sweep

# ════ 28. THE SERIES BOUND, AND THE TWO ROWS THAT DEFEATED ITS FIRST VERSION (14 Oct direct run) ═══════════════════════
# jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10. The bound that cases
# R08(a)-(d) above pin compared highest() with the SECOND-HIGHEST distinct number, and two adjacent high rows defeated
# it: #999 and #1000 have each other, the gap collapses to 1 and the guard is silent. The 14 Oct direct run's two blind antagonists
# found that independently, and `sweep --add` wrote exactly such a pair in one command. The bound now asks what the
# SERIES is - the longest run of distinct numbers in which no step is bigger than BUILDNUM_MAX_DELTA (default 10) -
# instead of what sits just below the top. R08's four controls all append ONE row, which is why they stayed green over
# the hole; every case here that matters puts TWO OR MORE rows above a series.
# EVERY FIXTURE IS A REGISTER OF ITS OWN (mkreg), and every STRAY row on one is written with row_for and not with `add`,
# which refuses one now: a fixture that goes through the guard it is testing proves nothing.
SB="$TD/series"; mkdir -p "$SB"

# 28a. THE PAIR. A twelve-number series ending at #511 with #999 and #1000 above it.
mkreg "$SB/pair" $(seq 500 511) 999 1000
PAIR="$SB/pair/buildnum.sh"; PAIRREG="$SB/pair/build-numbers.tsv"; PM="$(md5of "$PAIRREG")"
PAIR_ERR="$(CT_RUNID=selftest "$PAIR" next 2>&1 >/dev/null)"
ck "28a THE PAIR: next refuses with #999 and #1000 above a series that ends at #511 (the second-highest bound was silent here)" 2 "$PAIR" next
eq "28a the refusal names both strays in order, the series length and top, and the nearest gap" "1 1 1" \
   "$(grep -c 'no step that small: #999 #1000\.' <<<"$PAIR_ERR") $(grep -c 'it has 12 numbers and ends at #511' <<<"$PAIR_ERR") $(grep -c 'The nearest is 488 past #511' <<<"$PAIR_ERR")"
ck "28a mint refuses the same register" 2 env CT_RUNID=selftest "$PAIR" mint "this must not be handed out, it would burn 488 numbers"
eq "28a and the refused mint wrote nothing and left no lock behind" "$PM no" \
   "$(md5of "$PAIRREG") $([ -d "$SB/pair/.buildnum.lock" ] && echo yes || echo no)"
mkreg "$SB/clean" $(seq 500 511)
eq "28a CONTROL: the same series without the pair issues #512, so the refusals above are the pair's and not the fixture's" "#512" \
   "$(CT_RUNID=selftest "$SB/clean/buildnum.sh" next 2>/dev/null)"
# check AND list USED TO RECOMMEND `mint` ON THE VERY STATE WHERE mint EXITS 2, naming the forbidden number: two documented
# verbs, opposite answers on one register. They share next's test now.
CHK="$("$PAIR" check '#511' 2>/dev/null)"; LST="$("$PAIR" list 2>/dev/null)"
eq "28a check does not recommend mint on the register where mint refuses, and says so" "0 1" \
   "$(grep -c 'Next free number' <<<"$CHK") $(grep -c 'No number can be handed out right now' <<<"$CHK")"
eq "28a list says NONE instead of naming #1001" "1 0" "$(grep -c 'next free: NONE' <<<"$LST") $(grep -c 'next free: #' <<<"$LST")"
CHK_OK="$("$SB/clean/buildnum.sh" check '#511' 2>/dev/null)"; LST_OK="$("$SB/clean/buildnum.sh" list 2>/dev/null)"
eq "28a CONTROL: on the clean register check and list both name #512" "1 1" \
   "$(grep -c 'Next free number is #512' <<<"$CHK_OK") $(grep -c 'next free: #512' <<<"$LST_OK")"
eq "28a none of the read-only calls above wrote anything" "$PM" "$(md5of "$PAIRREG")"

# 28b. A CLUSTER, NOT ONLY A PAIR: five rows (#997 to #1001) above the same twelve-number series.
mkreg "$SB/cluster" $(seq 500 511) 997 998 999 1000 1001
CL_ERR="$(CT_RUNID=selftest "$SB/cluster/buildnum.sh" next 2>&1 >/dev/null)"
ck "28b A FIVE-ROW CLUSTER (#997 to #1001) above a twelve-number series is refused as well" 2 "$SB/cluster/buildnum.sh" next
eq "28b and the refusal lists every row of it, and the series it sits above" "1 1" \
   "$(grep -c 'no step that small: #997 #998 #999 #1000 #1001\.' <<<"$CL_ERR") $(grep -c 'ends at #511' <<<"$CL_ERR")"

# 28c. A TIE, AND THE DEFINITION. Two runs of the same length: the LOWER one is the series, so the higher run is refused
# rather than trusted. A higher run that is strictly LONGER than the lower one is, by definition, the series; that is the
# DECLARED LIMIT in buildnum.sh's header, pinned here as the definition it is so that a change to it is seen and the
# header is rewritten with it. It takes more stray rows than the register has numbers, and add and sweep --add refuse
# to write even one.
mkreg "$SB/tie" 500 501 502 900 901 902
TIE_ERR="$(CT_RUNID=selftest "$SB/tie/buildnum.sh" next 2>&1 >/dev/null)"
ck "28c A TIE between two runs goes to the LOWER one, so the higher run is refused" 2 "$SB/tie/buildnum.sh" next
eq "28c and the refusal says the series ends at #502 and names the higher run" "1 1" \
   "$(grep -c 'ends at #502' <<<"$TIE_ERR") $(grep -c 'no step that small: #900 #901 #902\.' <<<"$TIE_ERR")"
mkreg "$SB/longer" 500 501 502 900 901 902 903
eq "28c DECLARED LIMIT, AS THE DEFINITION IT IS: a higher run LONGER than the lower one is the series (see the header)" "#904" \
   "$(CT_RUNID=selftest "$SB/longer/buildnum.sh" next 2>/dev/null)"

# 28d. NO FALSE ALARMS ON SHAPES THE REAL REGISTER MAY HAVE. A bound that cries wolf is switched off by the first person it
# blocks. A stray BELOW the series is history, not a threat to the next number; a gap inside the history is not a stray
# when the run above it is the longer one; and a real jump above the series IS refused, because a margin is a margin and
# not a guess about intent (the override in 28f is how a person says it is real).
mkreg "$SB/low" 125 $(seq 500 511)
eq "28d A LOW stray, far below the series, is not an alarm" "#512" "$(CT_RUNID=selftest "$SB/low/buildnum.sh" next 2>/dev/null)"
mkreg "$SB/gap" $(seq 500 505) $(seq 517 528)
eq "28d a gap of 12 INSIDE the history is not an alarm when the run above it is the longer one" "#529" \
   "$(CT_RUNID=selftest "$SB/gap/buildnum.sh" next 2>/dev/null)"
mkreg "$SB/jump" $(seq 500 511) 530 531 532
JUMP_ERR="$(CT_RUNID=selftest "$SB/jump/buildnum.sh" next 2>&1 >/dev/null)"
ck "28d a real jump of 19 above a twelve-number series IS refused" 2 "$SB/jump/buildnum.sh" next
eq "28d and the refusal prints the override that is exactly the gap" "1" "$(grep -c 'BUILDNUM_MAX_DELTA=19 gates/buildnum.sh next' <<<"$JUMP_ERR")"

# 28e. THE BOUNDARY, BOTH SIDES OF IT: a step of exactly 10 is growth and a step of 11 is not.
mkreg "$SB/b10" $(seq 500 511) 521
eq "28e BOUNDARY: a step of exactly 10 above the top is growth" "#522" "$(CT_RUNID=selftest "$SB/b10/buildnum.sh" next 2>/dev/null)"
mkreg "$SB/b11" $(seq 500 511) 522
ck "28e and a step of 11 is not" 2 "$SB/b11/buildnum.sh" next

# 28f. THE OVERRIDE. A refusal the operator has no way past is not a remedy, so the variable the bound's own name advertises
# is honoured, validated and never silent. THE REMEDY THE REFUSAL PRINTS IS TAKEN VERBATIM, because a message that names a
# number that does not work is worse than no message.
HINT="$(sed -n 's/.*accept it for this one call: BUILDNUM_MAX_DELTA=\([0-9][0-9]*\) gates\/buildnum.sh next.*/\1/p' <<<"$PAIR_ERR")"
eq "28f the refusal prints a number to override with, and it is the gap to the nearest stray" "488" "$HINT"
OV_OUT="$(env BUILDNUM_MAX_DELTA="${HINT:-0}" CT_RUNID=selftest "$PAIR" next 2>"$SB/ov.err")"
eq "28f taking that remedy VERBATIM gets past the refusal" "#1001" "$OV_OUT"
eq "28f and an override is never silent" "1" "$(grep -c 'BUILDNUM_MAX_DELTA=488 is in effect (the default is 10)' "$SB/ov.err")"
LESS_ERR="$(env BUILDNUM_MAX_DELTA=$(( ${HINT:-0} - 1 )) CT_RUNID=selftest "$PAIR" next 2>&1 >/dev/null)"
eq "28f one less than the printed number still refuses, and for the series reason" "1" "$(grep -c 'cut off from its own series' <<<"$LESS_ERR")"
eq "28f the override reaches check and list too, because they share next's test" "1 1" \
   "$(env BUILDNUM_MAX_DELTA=488 "$PAIR" check '#511' 2>/dev/null | grep -c 'Next free number is #1001') $(env BUILDNUM_MAX_DELTA=488 "$PAIR" list 2>/dev/null | grep -c 'next free: #1001')"
for bad in abc 0 -1 010 10000 1.5 "1 0" 5x; do
  BAD_ERR="$(env BUILDNUM_MAX_DELTA="$bad" "$PAIR" next 2>&1 >/dev/null)"; BAD_RC=$?
  eq "28f BUILDNUM_MAX_DELTA='$bad' is refused with its own message (exit 2)" "2 1" "$BAD_RC $(grep -c 'Refusing to guess' <<<"$BAD_ERR")"
done
ck "28f a bad value is refused by EVERY verb, not only the ones that read it, so a typo is not ignored by one path" 2 env BUILDNUM_MAX_DELTA=abc "$BN" check "#416"
eq "28f the largest accepted value, 9999, is accepted" "#1001" "$(env BUILDNUM_MAX_DELTA=9999 "$PAIR" next 2>/dev/null)"
eq "28f the smallest, 1, is accepted" "#512" "$(env BUILDNUM_MAX_DELTA=1 "$SB/clean/buildnum.sh" next 2>/dev/null)"
eq "28f and an EMPTY value means the default, not zero" "#512" "$(env BUILDNUM_MAX_DELTA= "$SB/clean/buildnum.sh" next 2>/dev/null)"

# 28g. add REFUSES TO WRITE A STRAY ROW. The register is append-only, so a stray row cannot be taken back out; the only
# place to stop one is before it is written. THE STRAY TEST COMES LAST in add, after every validation, so each of those
# keeps its own reason: a control that asserts only "exit 2" cannot tell this refusal from a bad state if it runs first.
mkreg "$SB/addreg" $(seq 500 511)
AR="$SB/addreg/buildnum.sh"; AREG="$SB/addreg/build-numbers.tsv"; AM="$(md5of "$AREG")"
ADD_ERR="$(CT_RUNID=selftest "$AR" add '#999' issued - - "a stray number typed by hand, which must not be written" 2>&1)"
ck "28g add refuses a number the series does not reach (#999 is 488 past #511)" 2 env CT_RUNID=selftest "$AR" add '#999' issued - - "a stray number typed by hand, which must not be written"
eq "28g it says why, with the gap, and prints the way past" "1 1" \
   "$(grep -c 'refusing to write #999. It is 488 past #511' <<<"$ADD_ERR") $(grep -c 'BUILDNUM_MAX_DELTA=488 gates/buildnum.sh add' <<<"$ADD_ERR")"
eq "28g and wrote nothing" "$AM" "$(md5of "$AREG")"
ck "28g the other half of the pair (#1000) is refused the same way" 2 env CT_RUNID=selftest "$AR" add '#1000' issued - - "the other half of the pair, which must not be written"
ORD_ERR="$(CT_RUNID=selftest "$AR" add '#999' bogus - - "a stray number with a bad state, refused for the state" 2>&1)"
eq "28g REASON ORDER: a bad state on that same stray number is refused for the STATE, not the stray" "1 0" \
   "$(grep -c "state 'bogus' is not one of" <<<"$ORD_ERR") $(grep -c 'refusing to write' <<<"$ORD_ERR")"
ck "28g add accepts ordinary growth (#512)" 0 env CT_RUNID=selftest "$AR" add '#512' issued - - "ordinary growth one past the top of the series"
ck "28g add accepts exactly the margin above the top (#522 is #512 + 10)" 0 env CT_RUNID=selftest "$AR" add '#522' issued - - "exactly ten past the top, which is still growth"
ck "28g and refuses one past the margin (#533 is #522 + 11)" 2 env CT_RUNID=selftest "$AR" add '#533' issued - - "eleven past the top, which is a stray row"
ck "28g add accepts a second row for a number INSIDE the series (the legal rebuild shape)" 0 env CT_RUNID=selftest "$AR" add '#505' built - - "a second row for a number inside the series"
eq "28g the register holds exactly the three accepted rows more than it began with" "15" "$(grep -c . "$AREG")"
mkreg "$SB/seed"
ck "28g seeding an EMPTY register is not a stray (there is no series yet to be cut off from)" 0 env CT_RUNID=selftest "$SB/seed/buildnum.sh" add '#500' issued - - "the first row of a register that has none yet"

# 28h. record IS NOT BOUNDED, BY DESIGN. It writes the number gates/build.sh has just stamped, and refusing there would turn a
# bookkeeping refusal into a failed build for a number the run was already told it could use. The stray row it can write is
# caught the next time a number is asked for, which is the loud half of the contract.
mkreg "$SB/rec" $(seq 500 511)
ck "28h record writes the number build.sh just stamped even when it is a stray" 0 env CT_RUNID=selftest "$SB/rec/buildnum.sh" record '#999' aaaaaaaaaaaa bbbbbbbbbbbb
ck "28h and the stray row it wrote is caught the next time a number is asked for" 2 env CT_RUNID=selftest "$SB/rec/buildnum.sh" next

# 28i. sweep SPLITS WHAT THE COMMIT SUBJECTS NAME INTO PLAUSIBLE AND IMPLAUSIBLE. On this repository's own main the numbers
# #999 and #1000 are named by the subject of the reverted first attempt at this very bound: the TEXT of a commit about a
# defect, not builds. The remedy gates/build.sh prints on every build, `sweep --add`, used to write both as rows, after
# which next and mint handed out #1001 at exit 0 with 481 numbers burned in one command. A number is plausible when it lies
# in the series or is joined to its top by steps no bigger than the margin, each one extending the top for the next.
mkreg "$SB/sw" $(seq 500 510)
git -C "$SB/sw" init -q 2>/dev/null
git -C "$SB/sw" config user.email selftest@example.com; git -C "$SB/sw" config user.name selftest
git -C "$SB/sw" add -A >/dev/null 2>&1
git -C "$SB/sw" commit -q -m "#510: the last real build on this fixture" >/dev/null 2>&1
git -C "$SB/sw" commit -q --allow-empty -m "#999: a commit ABOUT a defect names a number nothing built" >/dev/null 2>&1
git -C "$SB/sw" commit -q --allow-empty -m "#1000: and its twin" >/dev/null 2>&1
SW="$SB/sw/buildnum.sh"; SWREG="$SB/sw/build-numbers.tsv"; SWM="$(md5of "$SWREG")"
SW_OUT="$("$SW" sweep 2>&1)"; SW_RC=$?
eq "28i sweep EXITS 0 when the only names the register lacks are implausible (it exited 3 and printed the wedging remedy)" "0" "$SW_RC"
eq "28i it lists them as implausible and counts none of them as absent" "1 1 0" \
   "$(grep -c 'implausible: 999 1000' <<<"$SW_OUT") $(grep -c ' 0 NAMED AND ABSENT' <<<"$SW_OUT") $(grep -c '^  absent:' <<<"$SW_OUT")"
ck "28i sweep --add on it exits 0" 0 env CT_RUNID=selftest "$SW" sweep --add
eq "28i and writes nothing, so the register is byte-identical" "$SWM" "$(md5of "$SWREG")"
eq "28i and next is still #511, not #1001" "#511" "$(CT_RUNID=selftest "$SW" next 2>/dev/null)"
git -C "$SB/sw" commit -q --allow-empty -m "#511: the next real build" >/dev/null 2>&1
git -C "$SB/sw" commit -q --allow-empty -m "Build 518: seven past it, still joined" >/dev/null 2>&1
git -C "$SB/sw" commit -q --allow-empty -m "#526: eight past that, still joined" >/dev/null 2>&1
git -C "$SB/sw" commit -q --allow-empty -m "#538: twelve past that, joined to nothing" >/dev/null 2>&1
SW_OUT="$("$SW" sweep 2>&1)"; SW_RC=$?
eq "28i with plausible names too: exit 3, and exactly the plausible chain is counted as absent" "3 1 1" \
   "$SW_RC $(grep -c ' 3 NAMED AND ABSENT' <<<"$SW_OUT") $(grep -c '^  absent: 511 518 526 *$' <<<"$SW_OUT")"
eq "28i and #538 is listed with #999 and #1000 as implausible, not absent" "1" "$(grep -c 'implausible: 538 999 1000' <<<"$SW_OUT")"
ADD_OUT="$(CT_RUNID=selftest "$SW" sweep --add 2>&1)"; ADD_RC=$?
eq "28i sweep --add records the chain whole and exits 0" "0 1" "$ADD_RC $(grep -c 'recorded 3 number(s) as issued' <<<"$ADD_OUT")"
eq "28i it says what it left out" "1" "$(grep -c 'NOT recorded, implausible: 538 999 1000' <<<"$ADD_OUT")"
eq "28i exactly one row each for #511, #518 and #526" "1 1 1" \
   "$(grep -c "^511"$'\t' "$SWREG") $(grep -c "^518"$'\t' "$SWREG") $(grep -c "^526"$'\t' "$SWREG")"
eq "28i and none for #538, #999 or #1000" "0 0 0" \
   "$(grep -c "^538"$'\t' "$SWREG" || true) $(grep -c "^999"$'\t' "$SWREG" || true) $(grep -c "^1000"$'\t' "$SWREG" || true)"
eq "28i next is #527 afterwards: the chain is one series ending at #526" "#527" "$(CT_RUNID=selftest "$SW" next 2>/dev/null)"
# A NAME THAT IS IMPLAUSIBLE TODAY BECOMES PLAUSIBLE THE MOMENT THE SERIES GETS WITHIN THE MARGIN OF IT, and is then reported
# as absent. That is the documented behaviour (the report says so) and the reason an implausible number is listed rather than dropped.
ck "28i add #530 (four past the series top)" 0 env CT_RUNID=selftest "$SW" add '#530' issued - - "four past the top, which brings #538 within the margin"
SW_OUT="$("$SW" sweep 2>&1)"; SW_RC=$?
eq "28i #538 is now within the margin of #530, so it is absent and #999 and #1000 are still implausible" "3 1 1" \
   "$SW_RC $(grep -c '^  absent: 538 *$' <<<"$SW_OUT") $(grep -c 'implausible: 999 1000' <<<"$SW_OUT")"
eq "28i the plausibility split is applied on BOTH sides of the lock (the report and the re-derivation inside it)" "2" \
   "$(grep -c '| split_plausible' "$SRC")"

# ── CASE 29: A NUL BYTE IN THE REGISTER (#534, NUL).
# jobs/one-nul-byte-in-the-register-makes-buildnum-stampable-report-an-issued-number-as-free-2026-10-22,
# filed by #532. GNU grep treats a file containing a NUL as BINARY and prints the single line
# `grep: <file>: binary file matches` INSTEAD OF the matching lines, so rows() returned NOTHING and every
# caller concluded the register was empty - which made `stampable` answer that an ISSUED number was FREE, at
# exit 0, and that is the only mechanical guard this project has against two trees under one build number.
#
# THE CASE IS A DIFFERENTIAL AND NOT A THRESHOLD, which is what the job's own close condition asks for:
# "stampable and check return the SAME verdict for a register with and without a NUL in a note field". So the
# fixture is built TWICE from one source and the two differ BY EXACTLY ONE BYTE - a byte INSIDE a note field,
# replaced in place so the row keeps its length and its nine fields. `cmp -l` asserts that, because a fixture
# that differed in two ways would make every comparison below meaningless (my own first draft APPENDED text as
# well as a NUL and `list` then differed for an honest reason, which is the trap of a control whose input is
# not what it claims).
NULD="$TD/nul"; mkdir -p "$NULD/a" "$NULD/b"
cp "$HERE/buildnum.sh" "$NULD/a/buildnum.sh"; cp "$HERE/buildnum.sh" "$NULD/b/buildnum.sh"
chmod +x "$NULD/a/buildnum.sh" "$NULD/b/buildnum.sh"
{ printf '# fixture register for the NUL case\n'
  row_for 530 issued; row_for 531 issued; row_for 532 issued
  printf '533\tminted\t-\t-\t-\t2026-10-22T19:00Z\tbuild__OTHERRUN\tminted\ta note long enough to pass the floor\n'
} > "$NULD/a/build-numbers.tsv"
# ONE BYTE, IN PLACE, INSIDE THE NOTE OF THE FIRST ROW. perl is not assumed to exist; this is tr-free on purpose
# because the thing under test is a NUL-stripping reader and building the fixture with it would be circular.
awk 'BEGIN{ORS=""} { if (!done && $0 ~ /^530\t/) { n=index($0,"note"); if (n>0) { printf "%s%c%s\n", substr($0,1,n-1), 0, substr($0,n+1); done=1; next } } print $0 "\n" }' \
  "$NULD/a/build-numbers.tsv" > "$NULD/b/build-numbers.tsv"
eq "29 the NUL fixture really carries exactly one NUL byte" "0 1" \
   "$(tr -cd '\000' < "$NULD/a/build-numbers.tsv" | wc -c | tr -d ' ') $(tr -cd '\000' < "$NULD/b/build-numbers.tsv" | wc -c | tr -d ' ')"
eq "29 and the two fixtures differ in exactly that ONE byte and nothing else" "1" \
   "$(cmp -l "$NULD/a/build-numbers.tsv" "$NULD/b/build-numbers.tsv" 2>/dev/null | wc -l | tr -d ' ')"
eq "29 and the NUL is INSIDE a note field, so both files have the same length" "0" \
   "$(( $(wc -c < "$NULD/a/build-numbers.tsv") - $(wc -c < "$NULD/b/build-numbers.tsv") ))"
# THE DIFFERENTIAL ITSELF: three numbers, one issued to ANOTHER run, one issued to this one, one on no row.
# Each is compared on BOTH stdout and exit status, because the defect changed the VERDICT and not the wording.
nul_same() { # nul_same <label> <subcommand...>: stdout and exit equal on the clean and the NUL register
  local lbl="$1"; shift
  local ao ae bo be
  ao="$( cd "$NULD/a" && CT_RUNID=build__MINEOWN ./buildnum.sh "$@" 2>/dev/null )"; ae=$?
  bo="$( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh "$@" 2>/dev/null )"; be=$?
  eq "29 $lbl: same stdout and same exit with and without the NUL" "SAME SAME" \
     "$([ "$ao" = "$bo" ] && echo SAME || echo DIFFER) $([ "$ae" = "$be" ] && echo SAME || echo DIFFER)"
}
nul_same "stampable a number issued to ANOTHER run" stampable '#533'
nul_same "stampable a number on NO row"             stampable '#900'
nul_same "check a number issued to another run"     check 533
nul_same "check a number on no row"                 check 900
nul_same "next"                                     next
# THE THREE CASES BELOW BUILD THEIR ACTUAL VALUE WITH printf AND NOT WITH `echo $?; grep -c`, because a command
# substitution holding TWO command outputs keeps the NEWLINE between them, and `eq` then compares "1\n1" with
# the "1 1" it was given and reports a FAIL on correct behaviour. My first draft of this block did exactly that
# on three of its cases, and the three it hit were the three POSITIVE-CONTENT assertions - the ones that say the
# verdict is right rather than merely unchanged - so the harness fault was concentrated in the cases that matter
# most. Same family as gate 47's control recipe naming moved line numbers: the control was wrong, not the code.
# AND THE VERDICT IS THE RIGHT ONE, not merely the same one. A reader that refused to answer at all would also
# be "the same" on both files, so the differential above is necessary and NOT sufficient: this asserts the
# POSITIVE content, which is the clause the defect actually broke.
eq "29 and the verdict on the NUL register is NOT STAMPABLE at exit 1, not 'free'" "1 1" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh stampable '#533' >"$TD/n.out" 2>/dev/null; printf '%s %s' "$?" "$(grep -c 'belonging to another run' "$TD/n.out")" )"
eq "29 and the row count it reports is the whole register, not zero" "1" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh check 900 2>/dev/null | grep -c '4 row(s) checked' )"
# THE WARNING IS ON STDERR AND NEVER ON STDOUT, because gates/gates.sh's series door quotes the FIRST LINE of
# stampable's stdout and branches on its exit status: a warning on stdout would be read as a verdict.
# THE SECOND HALF COUNTS THE WARNING'S FIRST LINE, NOT EVERY MENTION OF THE FILE. My first draft asserted
# `grep -c 'build-numbers.tsv'` equals 1 and measured 2, because the warning names the register twice on
# purpose - once as the path that is damaged and once inside the `tr -cd` command a reader can run to find the
# byte. The assertion was wrong, not the message: a needle that counts incidental mentions is not a test of
# "does it name the file", so it now reads the line that carries the count.
eq "29 the NUL warning names the file and the count, on STDERR" "1 1" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh stampable '#533' 2>"$TD/n.err" >/dev/null; printf '%s %s' "$(grep -c 'contains 1 NUL byte(s)' "$TD/n.err")" "$(grep -c 'build-numbers.tsv contains 1 NUL byte' "$TD/n.err")" )"
eq "29 and NOTHING about a NUL reaches STDOUT" "0" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh stampable '#533' 2>/dev/null | grep -ci 'nul' )"
eq "29 and the clean register prints no warning at all" "0" \
   "$( cd "$NULD/a" && CT_RUNID=build__MINEOWN ./buildnum.sh stampable '#533' 2>&1 >/dev/null | grep -ci 'nul' )"
# `list` READS THE REGISTER DIRECTLY, by design, so it is fixed too and asserted separately: the ROW SET must be
# identical. WHAT IS NOT IDENTICAL, DECLARED RATHER THAN HIDDEN: the one note whose byte the NUL overwrote prints
# one character shorter, because that byte is GONE from the file - `tr -d` strips it. That is a property of the
# damaged file and not of the reader, and no verdict depends on it.
eq "29 list reports the same number of rows on both" "SAME" \
   "$( [ "$( cd "$NULD/a" && ./buildnum.sh list 2>/dev/null | grep -c '^  #' )" = "$( cd "$NULD/b" && ./buildnum.sh list 2>/dev/null | grep -c '^  #' )" ] && echo SAME || echo DIFFER )"
eq "29 and the same SET of numbers, which is what 'the same rows' means here" "SAME" \
   "$( [ "$( cd "$NULD/a" && ./buildnum.sh list 2>/dev/null | grep -o '^  #[0-9]*' | md5sum )" = "$( cd "$NULD/b" && ./buildnum.sh list 2>/dev/null | grep -o '^  #[0-9]*' | md5sum )" ] && echo SAME || echo DIFFER )"
# THE MUTANT: rows() and the list scan as 707599b had them, with no NUL stripping. It must turn the
# issued-number case - the whole point of the job - from NOT STAMPABLE at exit 1 to "on no row" at exit 0.
#
# IT IS BUILT BY SWAPPING WHOLE LINES FROM A LITERAL HEREDOC, AND NOT BY DELETING THE `tr` FROM A PIPELINE,
# BECAUSE MY FIRST ATTEMPT AT THAT HUNG AND A MUTANT THAT HANGS PROVES NOTHING. The fix reads
# `tr -d '\000' < "$REG" | grep -v PATTERN`, where the file arrives by REDIRECTION, so a sed that removed only
# the `tr ... |` prefix left `grep -v PATTERN` with NO FILE ARGUMENT - grep then read STDIN and waited for ever,
# and the selftest sat in `bash ./mutant.sh stampable #533` until it was killed by pid. Same class as the note
# on gates.sh's M9 (a mutant that dies on set -u reads nothing, so it is not the door it claims to be): a mutant
# must be the OLD CODE, running.
cat > "$NULD/rows.old" <<'ROWSOLD'
rows() { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/'; }
ROWSOLD
cat > "$NULD/ghosts.old" <<'GHOSTSOLD'
    GHOSTS="$(grep -vn '^[[:space:]]*#' "$REG" | grep -v '^[0-9]*:[[:space:]]*$' | awk -F: -v q="'" '{line=$0; sub(/^[0-9]+:/,"",line); split(line,F,"\t"); if (F[1] !~ /^[0-9]+$/) print $1}' | tr '\n' ' ')"
GHOSTSOLD
awk -v r="$NULD/rows.old" -v g="$NULD/ghosts.old" '
  /^rows\(\) \{ tr -d/        { while((getline l < r)>0) print l; close(r); next }
  /^    GHOSTS="\$\(tr -d/     { while((getline l < g)>0) print l; close(g); next }
  { print }' "$NULD/b/buildnum.sh" > "$NULD/b/mutant.sh"; chmod +x "$NULD/b/mutant.sh"
eq "29 MUTANT both lines really were swapped, and the tr is gone from neither more nor less" "0 0 1 1" \
   "$(grep -c '^rows() { tr -d' "$NULD/b/mutant.sh") $(grep -c '^    GHOSTS="$(tr -d' "$NULD/b/mutant.sh") $(grep -c '^rows() { grep -v' "$NULD/b/mutant.sh") $(grep -c '^    GHOSTS="$(grep -vn' "$NULD/b/mutant.sh")"
eq "29 MUTANT is a different script from the fix" "differs" \
   "$( [ "$(md5sum < "$NULD/b/buildnum.sh")" != "$(md5sum < "$NULD/b/mutant.sh")" ] && echo differs || echo identical )"
eq "29 MUTANT parses" "yes" "$(bash -n "$NULD/b/mutant.sh" 2>/dev/null && echo yes || echo no)"
# EVERY MUTANT CALL IS UNDER `timeout`, so a mutant that blocks on stdin is a FAIL and never a hang. 124 is
# timeout's own exit for a kill, so it can never be mistaken for the 0 this case is looking for.
eq "29 MUTANT reads the ISSUED number as free, at exit 0 - which is the defect" "0 1" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN timeout 20 ./mutant.sh stampable '#533' >"$TD/m.out" 2>/dev/null; printf '%s %s' "$?" "$(grep -c 'is on no row' "$TD/m.out")" )"
eq "29 MUTANT sees ZERO rows where the fix sees four" "0 4" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN timeout 20 ./mutant.sh check 900 2>/dev/null | sed -n 's/.*(\([0-9]*\) row(s) checked).*/\1/p' ) $( cd "$NULD/b" && CT_RUNID=build__MINEOWN ./buildnum.sh check 900 2>/dev/null | sed -n 's/.*(\([0-9]*\) row(s) checked).*/\1/p' )"
eq "29 MUTANT terminates rather than blocking on stdin" "yes" \
   "$( cd "$NULD/b" && CT_RUNID=build__MINEOWN timeout 20 ./mutant.sh check 900 >/dev/null 2>&1; [ $? -ne 124 ] && echo yes || echo no )"
# AND THE MUTANT AGREES WITH THE FIX ON THE CLEAN REGISTER, which is why no existing case could see this: the
# strip is a no-op on a file with no NUL, and the two readers are byte-identical there.
eq "29 MUTANT and FIX agree on the CLEAN register" "SAME" \
   "$( cp "$NULD/b/mutant.sh" "$NULD/a/mutant.sh"; chmod +x "$NULD/a/mutant.sh"; [ "$( cd "$NULD/a" && CT_RUNID=build__MINEOWN timeout 20 ./mutant.sh stampable '#533' 2>/dev/null )" = "$( cd "$NULD/a" && CT_RUNID=build__MINEOWN ./buildnum.sh stampable '#533' 2>/dev/null )" ] && echo SAME || echo DIFFER )"

# ── CASE 30: A LEADING ZERO IS READ AS OCTAL (#537, the OCTAL job) ──────────────────────────────────────────
# THE DEFECT, measured on main ed65bab before the fix: one register row numbered 0535 made `next` print #350
# at exit 0, and #350 is an ISSUED number on the real register (2026-10-01, backfilled from git). rows() keeps
# any all-digit first field, `sort -n` correctly placed 0535 as 535, highest() RETURNED THE STRING "0535", and
# $(( H + 1 )) read it as octal - 0535 base 8 is 349 - so the tool handed out a number another tree carries.
#
# THE FIXTURE IS BUILT SO THE MUTANT LANDS ON AN ISSUED ROW, WHICH IS THE WHOLE POINT OF THE CASE AND IS NOT
# AUTOMATIC. A zero-led row on its own only proves the arithmetic is wrong; it does not prove the ANSWER IS
# DANGEROUS. 0535 octal + 1 is exactly 350, so the fixture carries a row for 350 as well, and the mutant
# assertion below reads "the number it handed out is on the register" rather than merely "it is not 536".
# AND THE SERIES RUN HAD TO BE CHOSEN, NOT GUESSED: delta_ok refuses when highest() sits above the top of the
# longest contiguous run, so 524..534 plus the 0535 row makes 535 the top of a 12-long run and `next` is NOT
# refused on the fix. A fixture of 350 + 500..511 + 0535 was my first draft and it made the fix exit 2 with
# "number(s) cut off from its own series" - a red for the right reason that would have hidden the real assertion.
mkreg "$SB/octal" 350 $(seq 524 534)
row_for "0535" minted >> "$SB/octal/build-numbers.tsv"
mkreg "$SB/octalclean" 350 $(seq 524 535)
mkreg "$SB/octalmint" 350 $(seq 524 534)
row_for "0535" minted >> "$SB/octalmint/build-numbers.tsv"

eq "30 the fixture really holds a zero-led row and a row for 350" "1 1" \
   "$(grep -c '^0535	' "$SB/octal/build-numbers.tsv") $(grep -c '^350	' "$SB/octal/build-numbers.tsv")"
# THE HEADLINE. Not "prints 536" but "does not print a number the register already holds": that is the claim
# the job makes and the one a later edit must not be able to satisfy by accident.
eq "30 FIX next hands out a number that is NOT already on the register" "free" \
   "$( cd "$SB/octal" && N="$(./buildnum.sh next 2>/dev/null | tr -d '#')"; if [ -z "$N" ]; then echo refused; elif grep -q "^$N	" build-numbers.tsv; then echo ISSUED; else echo free; fi )"
eq "30 FIX next prints the true next number and exits 0" "#536 0" \
   "$( cd "$SB/octal" && printf '%s ' "$(./buildnum.sh next 2>/dev/null)"; printf '%s' "$?" )"
# THE SERIES DOOR READS THE FIRST LINE OF STDOUT AND BRANCHES ON THE EXIT STATUS (see the comment at rows() in
# buildnum.sh), so the report must not reach stdout and stdout must stay exactly one line. This is the assertion
# that stops a later author "helpfully" echoing the warning where a consumer would read it as a verdict.
eq "30 FIX stdout is exactly one line and says nothing about a zero" "1 0" \
   "$( cd "$SB/octal" && printf '%s %s' "$(./buildnum.sh next 2>/dev/null | wc -l | tr -d ' ')" "$(./buildnum.sh next 2>/dev/null | grep -ci 'zero')" )"
eq "30 FIX the warning IS on stderr and names the offending row" "1 1" \
   "$( cd "$SB/octal" && ./buildnum.sh next 2>"$TD/o.err" >/dev/null; printf '%s %s' "$(grep -c 'LEADING ZERO' "$TD/o.err")" "$(grep -c '0535' "$TD/o.err")" )"
eq "30 FIX a register with no zero-led row prints no warning at all" "0" \
   "$( cd "$SB/octalclean" && ./buildnum.sh next 2>&1 >/dev/null | grep -ci 'LEADING ZERO' )"
# add IS A WRITE VERB AND THE REGISTER IS APPEND-ONLY, so "refuses" is not enough on its own: the file must be
# byte-identical afterwards. A refusal that has already appended is the failure this half exists to prevent.
eq "30 FIX add refuses a zero-led number at exit 2 AND writes nothing" "2 SAME" \
   "$( cd "$SB/octal" && B="$(md5sum < build-numbers.tsv)"; ./buildnum.sh add '#0535' minted - - 'a deliberately malformed row, for the control' >/dev/null 2>&1; E=$?; A="$(md5sum < build-numbers.tsv)"; printf '%s ' "$E"; [ "$B" = "$A" ] && printf SAME || printf CHANGED )"
eq "30 FIX mint over a zero-led register writes a number that was free" "0 536 free" \
   "$( cd "$SB/octalmint" && CT_RUNID=build__OCTALCTL ./buildnum.sh mint 'a control mint over a register holding one leading-zero row' >/dev/null 2>&1; E=$?; N="$(awk -F'\t' '$7=="build__OCTALCTL"{print $1}' build-numbers.tsv)"; printf '%s %s ' "$E" "$N"; [ "$(awk -F'\t' -v n="$N" '$1==n' build-numbers.tsv | wc -l | tr -d ' ')" = "1" ] && printf free || printf COLLIDED )"

# THE MUTANT: highest() exactly as ed65bab had it, one whole line swapped in from a literal heredoc. Built this
# way and not by sed-ing the awk out of the pipeline, for the reason case 29 records against its own first
# attempt: a mutant assembled by deleting part of a pipeline can leave a command reading STDIN and hang for
# ever, and a mutant that hangs proves nothing. A mutant must be THE OLD CODE, RUNNING.
cat > "$SB/octal/highest.old" <<'HIGHESTOLD'
highest() { rows | cut -f1 | sort -n | tail -1; }
HIGHESTOLD
awk -v h="$SB/octal/highest.old" '
  /^highest\(\) \{ rows \| cut -f1 \| awk/ { while((getline l < h)>0) print l; close(h); next }
  { print }' "$SB/octal/buildnum.sh" > "$SB/octal/mutant.sh"; chmod +x "$SB/octal/mutant.sh"
eq "30 MUTANT the line really was swapped, and only that line" "0 1" \
   "$(grep -c '^highest() { rows | cut -f1 | awk' "$SB/octal/mutant.sh") $(grep -c '^highest() { rows | cut -f1 | sort -n | tail -1; }' "$SB/octal/mutant.sh")"
eq "30 MUTANT is a different script from the fix" "differs" \
   "$( [ "$(md5sum < "$SB/octal/buildnum.sh")" != "$(md5sum < "$SB/octal/mutant.sh")" ] && echo differs || echo identical )"
eq "30 MUTANT parses" "yes" "$(bash -n "$SB/octal/mutant.sh" 2>/dev/null && echo yes || echo no)"
# EVERY MUTANT CALL IS UNDER `timeout`, as case 29's are: 124 is timeout's own kill exit and can never be
# mistaken for the 0 this case looks for.
eq "30 MUTANT terminates rather than blocking on stdin" "yes" \
   "$( cd "$SB/octal" && timeout 20 ./mutant.sh next >/dev/null 2>&1; [ $? -ne 124 ] && echo yes || echo no )"
# THE TURN. This is the assertion the whole case exists for: the mutant hands out a number the register already
# holds, at exit 0, with no refusal anywhere.
eq "30 MUTANT hands out an ALREADY-ISSUED number at exit 0 - which is the defect" "0 #350 ISSUED" \
   "$( cd "$SB/octal" && O="$(timeout 20 ./mutant.sh next 2>/dev/null)"; E=$?; printf '%s %s ' "$E" "$O"; N="$(printf '%s' "$O" | tr -d '#')"; if [ -n "$N" ] && grep -q "^$N	" build-numbers.tsv; then printf ISSUED; else printf free; fi )"
eq "30 MUTANT list advertises the same issued number as next free" "1" \
   "$( cd "$SB/octal" && timeout 20 ./mutant.sh list 2>/dev/null | grep -c 'next free: #350' )"
# AND WHY NO EXISTING CASE COULD SEE THIS: on a register with no zero-led row the two readers are identical, so
# all 192 cases before this one agree on both scripts. That is the "a gate that has never gone red on an input
# class" shape - the input class was absent from every fixture in the file.
eq "30 MUTANT and FIX agree on a register with no zero-led row" "SAME" \
   "$( cp "$SB/octal/mutant.sh" "$SB/octalclean/mutant.sh"; chmod +x "$SB/octalclean/mutant.sh"; [ "$( cd "$SB/octalclean" && timeout 20 ./mutant.sh next 2>/dev/null )" = "$( cd "$SB/octalclean" && ./buildnum.sh next 2>/dev/null )" ] && echo SAME || echo DIFFER )"

# ── 31. `record` IS A WRITE VERB, AND IT IS THE ONLY ONE A RUN REACHES WITHOUT TYPING IT ───────────────────
# Case 30 above covers highest() reading a zero-led row as octal. This one covers the OTHER half of that job -
# refusing to create such a row - at the verb case 30's own fix did not reach. gates/build.sh:202 calls
# `record` after a successful stamp, and `gates/build.sh '#0538'` passes build.sh's own ^#[0-9]{3,4}$ shape
# test, so the documented build path wrote the malformed row at exit 0 with no warning. Measured on this tree
# before the repair; found by antagonist A at #537 from the shipped-surface door, not from the diff.
mkreg "$SB/rec" 350 $(seq 524 534)
# ONE PATH, NO FALLBACK. My own first draft of this line tried two paths with a `||` between them, which
# passes whichever one answers and tells a reader nothing about which file was actually read - the "a count
# with no scope cannot be checked" rule at the smallest possible scale.
eq "31 the fixture's register exists and has no zero-led row to start with" "yes 0" \
   "$( printf '%s %s' "$( [ -f "$SB/rec/build-numbers.tsv" ] && echo yes || echo no )" "$( grep -c '^0' "$SB/rec/build-numbers.tsv" )" )"
R31B="$( md5sum "$SB/rec/build-numbers.tsv" | cut -c1-12 )"
ck "31 record REFUSES a number written with a leading zero" 2 \
   sh -c "cd '$SB/rec' && CT_RUNID=fixture ./buildnum.sh record '#0538' deadbeefdead beefdeadbeef"
eq "31 and it says WHY, naming the leading zero rather than the hex" "1" \
   "$( cd "$SB/rec" && CT_RUNID=fixture ./buildnum.sh record '#0538' deadbeefdead beefdeadbeef 2>&1 >/dev/null | grep -c 'LEADING ZERO' )"
# THE REGISTER IS APPEND-ONLY, SO "REFUSES" IS NOT ENOUGH ON ITS OWN: the file must be byte-identical after.
# A refusal that still appended would leave a row no later edit can remove, which is the whole reason this
# guard runs BEFORE the write and not after it.
eq "31 and the register is BYTE-IDENTICAL afterwards" "$R31B" "$( md5sum "$SB/rec/build-numbers.tsv" | cut -c1-12 )"
# THE CONTROL: the same call with a well-formed number must still work, or the guard is just a broken verb.
ck "31 control: record of a WELL-FORMED number still succeeds" 0 \
   sh -c "cd '$SB/rec' && CT_RUNID=fixture ./buildnum.sh record '#538' deadbeefdead beefdeadbeef"
eq "31 control: and THAT row did land" "1" \
   "$( cd "$SB/rec" && grep -c '^538	built' build-numbers.tsv )"
# ---- THE MUTANT: the guard line removed, which is buildnum.sh as the first version of this fix had it. ----
# Swapped WHOLE from a heredoc rather than sed-ed out of a pipeline, for case 29's recorded reason.
cp "$SB/rec/buildnum.sh" "$SB/rec/mutant31.sh"
python3 -I -c "
import sys
p='$SB/rec/mutant31.sh'; s=open(p).read()
old='    plain_dec_or_die \"\$N\" record'
assert s.count(old)==1, s.count(old)
open(p,'w').write(s.replace(old, '    : # THE GUARD REMOVED BY THE MUTANT'))
" || true
chmod +x "$SB/rec/mutant31.sh"
eq "31 MUTANT the guard really was removed, and only it" "0 1" \
   "$( printf '%s %s' "$( grep -c 'plain_dec_or_die \"\$N\" record' "$SB/rec/mutant31.sh" )" "$( grep -c 'THE GUARD REMOVED BY THE MUTANT' "$SB/rec/mutant31.sh" )" )"
eq "31 MUTANT parses" "yes" "$( bash -n "$SB/rec/mutant31.sh" 2>/dev/null && echo yes || echo no )"
# THE TURN. The mutant must WRITE the malformed row at exit 0 - reporting nothing - which is what the
# documented build path did on ed65bab and on this build's own first commit.
ck "31 MUTANT writes the zero-led row at exit 0 - the defect" 0 \
   sh -c "cd '$SB/rec' && CT_RUNID=fixture ./mutant31.sh record '#0539' deadbeefdead beefdeadbeef"
eq "31 MUTANT and the row is on the register, with no warning printed" "1 0" \
   "$( cd "$SB/rec" && printf '%s %s' "$( grep -c '^0539' build-numbers.tsv )" "$( CT_RUNID=fixture ./mutant31.sh record '#0540' deadbeefdead beefdeadbeef 2>&1 >/dev/null | grep -ci 'zero' )" )"
# AND THE MUTANT AGREES WITH THE FIX ON EVERY WELL-FORMED NUMBER, which is why the 207 assertions before this
# one could not see the hole: not one of them passes a zero-led number to a WRITE verb.
eq "31 MUTANT and FIX agree on a well-formed number" "SAME" \
   "$( cd "$SB/rec" && CT_RUNID=fixture ./mutant31.sh record '#541' aaaaaaaaaaaa bbbbbbbbbbbb >/dev/null 2>&1; A=$?; CT_RUNID=fixture ./buildnum.sh record '#542' aaaaaaaaaaaa bbbbbbbbbbbb >/dev/null 2>&1; B=$?; [ "$A" = "$B" ] && echo SAME || echo DIFFER )"

echo "---"
echo "buildnum self-test: $P pass, $F fail"
[ "$F" = "0" ]
