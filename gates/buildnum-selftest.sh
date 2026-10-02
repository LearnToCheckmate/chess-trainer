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

echo "---"
echo "buildnum self-test: $P pass, $F fail"
[ "$F" = "0" ]
