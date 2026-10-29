#!/usr/bin/env bash
# gates/verify-log-selftest.sh - the controls for gates/verify-log.sh, as a COMMAND rather than as a paragraph.
#
# WHY THIS FILE EXISTS, and it is the whole of
# jobs/the-push-gate-is-the-least-adversarially-executed-script-in-the-project-2026-10-03 (P1, priority 10).
# gates/verify-log.sh is the single place this project decides whether a gate log authorises a push, and until
# this file it was tested almost entirely by READING it. The 2026-10-03 integration batch grew it from 199 to
# 739 lines - hundreds of those lines being prose about why --this-bundle exists and what the #416 half-merge
# cost - AND NOBODY TYPED THE FLAG WRONG ONCE. An untested path is not a passing path. That job's fix is one
# sentence: give it a selftest as a command, the way gates/gatemanifest.sh selftest (32 cases) and
# gates/buildnum-selftest.sh (76 cases) already have one, because those two are the measurably robust scripts
# in gates/ and the reason is that their controls are executable rather than prose.
#
#   gates/verify-log-selftest.sh          run every case, print PASS/FAIL per case and a footer
#
# IT NEVER TOUCHES THE REAL TREE. Every case runs inside a throwaway miniature repository in a temp directory:
# a copy of verify-log.sh at <tmp>/gates/verify-log.sh, a fabricated app.js beside it, and a local bare repo
# standing in for origin. verify-log.sh resolves its root as "$(dirname "$0")/.." (lines 108 and 703) and reads
# origin through `git ls-remote origin`, so both of its tree-facing flags can be exercised offline and
# deterministically, with no network, no browser and no risk to the real register or the real bundle.
#
# NOT A GATE, and the omission is deliberate [R36, R45]. It lives in gates/ and not in gates/regress/, so
# gates.sh (which globs regress/*.js) never runs it and it can never contribute to or block a GATES GREEN.
# gates/buildnum-selftest.sh states the same thing for the same reason. It is a developer check on the tool
# that authorises pushes, and the tool is not app behaviour, so it has no story clause [R08].
#
# TWO TALLIES, AND THE SECOND ONE IS THE POINT.
#   CONFIRMED  - behaviour verify-log.sh already has, pinned here so a later edit cannot remove it silently.
#   HOLES      - behaviour the push gate SHOULD have and measurably does not. Each one names the job that owns
#                it. These are written as the TRUE requirement, never as today's wrong answer, so when the
#                build lane fixes verify-log.sh the case flips from HOLE OPEN to HOLE CLOSED BY ITSELF and
#                nobody has to come back and edit an expectation. That is the difference between a control and
#                a snapshot: a snapshot of a bug has to be maintained, a control retires itself.
#
# EXIT CODES:  0 = every confirmed case green and no hole open.  1 = a confirmed case regressed - that is a
#              real break and the loudest thing this script can say.  2 = confirmed set clean, N holes still
#              open (the expected state until the push gate is repaired).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
SRC="$HERE/verify-log.sh"
[ -r "$SRC" ] || { echo "REFUSED: cannot read $SRC"; exit 1; }

# The fixture log is a real committed green, not a hand-written one, so every structural check in verify-log.sh
# (footer arithmetic, manifest line, roster count, section count, ref line) sees the shape it was written for.
REALLOG="$REPO/claude/agents/gatelogs/474-integration-all.log"
[ -r "$REALLOG" ] || { echo "REFUSED: fixture log $REALLOG is not readable"; exit 1; }

TD="$(mktemp -d)"; trap 'rm -rf "$TD"' EXIT
mkdir -p "$TD/gates" "$TD/logs"
cp "$SRC" "$TD/gates/verify-log.sh"; chmod +x "$TD/gates/verify-log.sh"
# gate-manifest.tsv is read by the manifest block; copy it so the sandbox answers as the real tree does.
[ -r "$HERE/gate-manifest.tsv" ] && cp "$HERE/gate-manifest.tsv" "$TD/gates/gate-manifest.tsv"
[ -r "$HERE/held-trees.tsv" ] && cp "$HERE/held-trees.tsv" "$TD/gates/held-trees.tsv"
VL="$TD/gates/verify-log.sh"

# The bundle the fixture log says it gated. app.js in the sandbox is fabricated to have exactly that md5 is NOT
# possible, so instead the sandbox records the md5 its own app.js really has and the cases are built around the
# two values - which is stronger, because it means --this-bundle has a genuine match case AND a genuine
# mismatch case rather than a reasoned one.
LOGMD5="$(head -1 "$REALLOG" | grep -o 'md5 [0-9a-f]\{12,32\}' | head -1 | awk '{print $2}')"
[ -n "$LOGMD5" ] || { echo "REFUSED: fixture log carries no 'md5 <hex>' on its header line"; exit 1; }
printf 'fabricated selftest bundle, never served\n' > "$TD/app.js"
DISKMD5="$(md5sum "$TD/app.js" | cut -c1-12)"

# GOOD: the real green, with its header md5 rewritten to the sandbox's own app.js, so --this-bundle matches.
GOOD="$TD/logs/good.log"
sed "1s/md5 $LOGMD5/md5 $DISKMD5/" "$REALLOG" > "$GOOD"
FOOT="$(tail -1 "$GOOD" | grep -o '#[0-9]\{3,4\}')"
# MISMATCH: the real green untouched, whose header md5 is NOT the sandbox's app.js.
MISMATCH="$TD/logs/mismatch.log"; cp "$REALLOG" "$MISMATCH"

P=0; F=0; HOPEN=0; HCLOSED=0
eq() { # eq <description> <expected> <actual>
       # COPIED VERBATIM from gates/held-selftest.sh:47-50 rather than re-written, so the two harnesses
       # cannot drift in what a PASS line looks like [#534, antagonist B's veto].
  if [ "$2" = "$3" ]; then P=$((P+1)); printf 'PASS %s (%s)\n' "$1" "$3"
  else F=$((F+1)); printf 'FAIL %s (got %s, wanted %s)\n' "$1" "$3" "$2"; fi
}
gt0() { # gt0 <description> <count> - the phrase is PRESENT. Used where a message legitimately appears more
        # than once and pinning the exact count would make the control brittle about wording rather than
        # about behaviour, which is the frozen-denominator trap in miniature. Verbatim from
        # gates/held-selftest.sh:51-56 - and that citation read 52-58 until a fresh antagonist checked it, which is
        # the #450 dangling-citation shape inside the pass that fixed two dangling citations.
  if [ "${2:-0}" -ge 1 ] 2>/dev/null; then P=$((P+1)); printf 'PASS %s (%s occurrence(s))\n' "$1" "$2"
  else F=$((F+1)); printf 'FAIL %s (absent)\n' "$1"; fi
}
ck() { # ck <description> <expected-exit> <command...>
  local d="$1" want="$2"; shift 2
  "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" = "$want" ]; then P=$((P+1)); printf 'PASS %s (exit %s)\n' "$d" "$got"
  else F=$((F+1)); printf 'FAIL %s (exit %s, wanted %s)\n' "$d" "$got" "$want"; fi
}
ckmsg() { # ckmsg <description> <expected-exit> <substring the refusal must name> <command...>
  local d="$1" want="$2" need="$3"; shift 3
  local out; out="$("$@" 2>&1)"; local got=$?
  # jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02, the class
  # sweep that job's own notChecked asked for and never carried. WAS, on both lines:
  #     printf '%s' "$out" | grep -qF -- "$need"
  # This file sets `set -uo pipefail` near the top and $out is the WHOLE output of verify-log.sh, which grows with
  # the log it reads. `grep -qF` stops reading at its first match, so once $out exceeds the pipe buffer the
  # printf is killed with SIGPIPE, exits 141, and pipefail reports 141 FOR A PIPELINE WHOSE GREP SUCCEEDED.
  # The two consequences are different and both wrong:
  #   - in the `if` condition the test goes FALSE on a needle that IS present, so a passing self-test is
  #     reported FAIL. That is the opposite of the gates.sh MANI_LINE symptom and strictly worse: gates.sh printed a
  #     false NOT CHECKED beside a real verdict, this prints a false FAIL beside a correct refusal.
  #   - in the diagnostic the `|| echo NO` arm ALSO runs, exactly as it did at the gates.sh MANI_LINE site.
  # A HERESTRING HAS NO PIPE AND THEREFORE NO SIGPIPE. The reproduction, its control and the ratchet that
  # stops a third instance appearing are in gates/audit/pipefail-grep.sh.
  if [ "$got" = "$want" ] && grep -qF -- "$need" <<<"$out"; then
    P=$((P+1)); printf 'PASS %s (exit %s, names "%s")\n' "$d" "$got" "$need"
  else
    F=$((F+1)); printf 'FAIL %s (exit %s wanted %s; names "%s": %s)\n' "$d" "$got" "$want" "$need" \
      "$(grep -qF -- "$need" <<<"$out" && echo yes || echo NO)"
  fi
}
holeneg() { # holeneg <job id> <description> <expected-exit WHEN FIXED> <substring the refusal must NOT name> <command...>
  # Closed when the command answers <want> AND its message does NOT contain <banned>. Deliberately a NEGATIVE
  # match: the requirement is that the refusal stops misreporting a flag typo as a build-number mismatch, and
  # pinning the replacement wording would force the build lane to adopt THIS file's phrasing, which is not this
  # lane's to decide [R17]. What is required is the diagnosis, not the sentence.
  local job="$1" d="$2" want="$3" banned="$4"; shift 4
  local out; out="$("$@" 2>&1)"; local got=$?
  # SAME CLASS AS ckmsg ABOVE AND THE WORST OF THE THREE, because this one is NEGATED: with `!` in front, a
  # SIGPIPE-induced non-zero makes the condition TRUE, so a banned string that IS present reads as absent and
  # the hole reports CLOSED on a refusal that still misreports. A false PASS, not a false FAIL.
  if [ "$got" = "$want" ] && ! grep -qF -- "$banned" <<<"$out"; then
    HCLOSED=$((HCLOSED+1)); printf 'HOLE CLOSED %s (exit %s, no longer says "%s")\n' "$d" "$got" "$banned"
  else
    HOPEN=$((HOPEN+1)); printf 'HOLE OPEN   %s (exit %s, still reports itself as "%s") [%s]\n' "$d" "$got" "$banned" "$job"
  fi
}
hole() { # hole <job id> <description> <expected-exit WHEN FIXED> <command...>
  local job="$1" d="$2" want="$3"; shift 3
  "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" = "$want" ]; then HCLOSED=$((HCLOSED+1)); printf 'HOLE CLOSED %s (exit %s) [%s]\n' "$d" "$got" "$job"
  else HOPEN=$((HOPEN+1)); printf 'HOLE OPEN   %s (exit %s, the push gate should answer %s) [%s]\n' "$d" "$got" "$want" "$job"; fi
}

# ── THE HARNESS PREFLIGHT. AN UNDEFINED ASSERTION HELPER IS NOW A RED AND NOT A SILENCE. ────────────────
# WHY THIS EXISTS, AND IT IS THIS BUILD'S OWN DEFECT [#534, antagonist B's veto, upheld and measured]:
# sections F and G shipped calling `eq` and `gt0`, which are defined in gates/held-selftest.sh and
# gates/buildnum-selftest.sh and were NEVER defined here. This file does not `set -e`, so each call was a
# no-op that printed to stderr and nothing else: SIXTEEN assertions neither credited nor reported, the
# footer read "62 pass, 0 fail" and AGREED WITH ITSELF, and the brief's documented expectation was
# calibrated on the broken run. Every one of the sixteen was a FIXTURE- or MUTANT-INTEGRITY check - "the
# two fixture trees really differ on the marker", "MUTANT1 the check really was removed", "both loops were
# put back to $REG", the three `bash -n` parse checks - so the whole "did my control actually control?"
# layer for both of this build's new sections was absent while its verdict cases passed. That is #416's
# "check the control moved the quantity the assertion reads AT ALL" and #405's "0 PASS is the tell", and
# self-consistency could not see it because an assertion that never runs prints no line to count.
# IT IS ALSO "A LESSON RECORDED IN ONE GATE DOES NOT TRAVEL": the helpers exist two files away, I wrote
# the calls from memory of those files, and nothing in between asked.
# HAND-KEPT, AND THAT IS ACCEPTABLE ONLY BECAUSE THE LIST IS NOW ENFORCED: a helper added to this file and
# omitted here is still fine (it is checked at its own call site by bash), but a helper CALLED and never
# defined can no longer pass silently IF ITS NAME IS ON THIS LIST.
# AND THAT QUALIFIER IS LOAD-BEARING, BECAUSE THE FIRST VERSION OF THIS REPAIR CLAIMED MORE THAN IT DOES
# [#534, fresh antagonist A's P2]. Its commit message said "so a third one cannot be silent". FALSE: this is a
# hand-kept list of six names, and a helper called under any OTHER name is still a silent no-op - reproduced
# by inserting one `eqq "..." "yes" "no"` into section G, which left the footer self-consistent at 78 pass /
# 0 fail, the expected exit 2, and exactly one `command not found` line on stderr, which is the very condition
# the veto was about. This is the gate-manifest lesson with the roles swapped: the hand-kept list IS the
# manifest, and what it lacks is a DERIVATION. The derivation exists and is one line - every word in command
# position that is neither defined in this file nor on PATH - and is NOT shipped here, because a scan of this
# file by this file is the self-reference shape this project records nine times and it needs its own controls
# before it guards a push-gate selftest. Filed rather than built.
# A SECOND, SMALLER OVERCLAIM IN THE SAME BREATH [A's P3]: `command -v` tests CALLABILITY, not "defined in
# this file", and the refusal message below says the latter. An inherited exported function of the same name
# satisfies the guard - demonstrated by deleting `eq` here and exporting a stub, which restored the vetoed
# state at 63 pass. A wrong reason reaching the right verdict, which this project treats as a trap; the
# message is worded to the check it actually performs. ser_mk and ser_prefix are deliberately absent: they are defined in
# section G, below this point, and bash requires a definition before the CALL and not before this check.
for __fn in ck ckmsg eq gt0 hole holeneg; do
  command -v "$__fn" >/dev/null 2>&1 || {
    printf 'FAIL harness: assertion helper %s is CALLED by this file and is NOT CALLABLE here.\n' "$__fn"
    printf '  Every %s call would be a silent no-op (this file does not set -e), so the footer would\n' "$__fn"
    printf '  report a self-consistent pass count with assertions missing from it. Refusing to run.\n'
    exit 1
  }
done
unset __fn

echo "== verify-log.sh self-test =="
echo "   sandbox      $TD"
echo "   fixture log  claude/agents/gatelogs/$(basename "$REALLOG") (footed $FOOT)"
echo "   log md5      $DISKMD5 in good.log (rewritten to match the sandbox app.js), $LOGMD5 in mismatch.log"
echo

echo "-- A. the happy paths, pinned so a later edit cannot remove them silently"
ck "a real full green is accepted"                         0 "$VL" "$GOOD"
ck "with the right build number it is accepted"            0 "$VL" "$GOOD" "$FOOT"
ckmsg "--this-bundle passes when app.js IS the gated bundle" 0 "THIS-BUNDLE OK" "$VL" "$GOOD" "$FOOT" --this-bundle
echo

echo "-- B. the nine mandated refusals. Each must refuse AND name its own reason:"
echo "      a wrong reason that reaches the right verdict is the #418 defect, which this file's subject"
echo "      records as having been refused 'by luck, not by checking'."
: > "$TD/logs/empty.log"
ckmsg "an empty log is refused"                 1 "missing or empty"      "$VL" "$TD/logs/empty.log"
ckmsg "a nonexistent log is refused"            1 "missing or empty"      "$VL" "$TD/logs/no-such-file.log"
printf 'gates.sh #474  md5 %s\n' "$DISKMD5" > "$TD/logs/nul.log"
printf 'PASS something\0\0\0 and more\n' >> "$TD/logs/nul.log"
cat "$GOOD" >> "$TD/logs/nul.log"
ckmsg "a log with NUL bytes is refused for the NULs"  1 "NUL byte"        "$VL" "$TD/logs/nul.log"
{ echo "SUBSET RUN: 3 of 54 sections"; echo "because the run was interrupted"; echo "and that is all"; cat "$GOOD"; } > "$TD/logs/subset.log"
ckmsg "a SUBSET run cannot authorise a push"    1 "SUBSET"                "$VL" "$TD/logs/subset.log"
head -n -1 "$GOOD" > "$TD/logs/nogreen.log"
ckmsg "a log not ending in GATES GREEN is refused" 1 "does not end"       "$VL" "$TD/logs/nogreen.log"
sed '1s/#474/#999/' "$GOOD" > "$TD/logs/headfoot.log"
ckmsg "head/foot build mismatch is refused"     1 "gated a different build" "$VL" "$TD/logs/headfoot.log"
ckmsg "a wrong expected build number is refused" 1 "you said"             "$VL" "$GOOD" '#999'
grep -v '^regression assertions (PASS lines):' "$GOOD" > "$TD/logs/nofooter.log"
ckmsg "no assertion-count footer is refused"    1 "carries no"            "$VL" "$TD/logs/nofooter.log"
sed 's/^regression assertions (PASS lines): [0-9]*/regression assertions (PASS lines): 99999/' "$GOOD" > "$TD/logs/miscount.log"
ckmsg "a footer that overstates its PASS lines is refused" 1 "claims"     "$VL" "$TD/logs/miscount.log"
sed 's/^regression assertions (PASS lines): [0-9]*/regression assertions (PASS lines): 0/' "$GOOD" > "$TD/logs/zero.log"
ckmsg "a full suite that asserted nothing is refused" 1 "0 assertions"    "$VL" "$TD/logs/zero.log"
echo

echo "-- C. --this-bundle's own refusals, which are the #416 half-merge guard"
ckmsg "--this-bundle refuses a bundle mismatch"  1 "but app.js on disk is" "$VL" "$MISMATCH" "$FOOT" --this-bundle
sed "1s/  md5 $DISKMD5//" "$GOOD" > "$TD/logs/nomd5.log"
ckmsg "--this-bundle refuses a log with no md5 on its header" 1 "no 'md5" "$VL" "$TD/logs/nomd5.log" "$FOOT" --this-bundle
echo

echo "-- D. --on-main's own refusals, offline, against a local bare repo standing in for origin"
( cd "$TD" && git init -q . && git config user.email selftest@example.com && git config user.name selftest \
  && git add -A >/dev/null 2>&1 && git commit -q -m "selftest fixture" ) >/dev/null 2>&1
grep -v '^ref: HEAD ' "$GOOD" > "$TD/logs/noref.log"
ckmsg "--on-main refuses a log with no 'ref: HEAD' line" 1 "carries no 'ref: HEAD" \
      env -C "$TD" "$VL" "$TD/logs/noref.log" "$FOOT" --on-main
ckmsg "--on-main refuses when origin/main cannot be read, and calls UNKNOWN not a pass" 1 "UNKNOWN is not a pass" \
      env -C "$TD" "$VL" "$GOOD" "$FOOT" --on-main
echo

echo "-- D+. --on-main's PASSING arms, against a local origin, so they are a statement about the tool and"
echo "       not about the depth of the clone this file happens to run in [#544, item (4) of the opening]."
# WHAT WAS WRONG, AND IT WENT RED IN THE ONE ENVIRONMENT THE BUILD ROUTINE ACTUALLY RUNS IN.
# Every --on-main case that expects exit 0 used $GOOD, whose `ref: HEAD` line names 1f5ca108 - a real commit
# of this repository, about 200 behind HEAD - and ran against the REAL origin. verify-log.sh then has to
# answer `git merge-base --is-ancestor 1f5ca108 <origin/main>`, which needs that object locally. The routine's
# container is a shallow clone, so it is absent. MEASURED at #544 in a fresh `git clone --depth 50`:
# `git cat-file -e 1f5ca108^{commit}` ABSENT, and this file reads 80 pass / 1 fail with
# "H valid: <log> '#NNN' --on-main" as the one failure.
# AND THE REASON IT LOOKED INTERMITTENT RATHER THAN BROKEN IS WORTH MORE THAN THE FIX. Only the FIRST of the
# five --on-main cases failed; the other four passed in the same run. verify-log.sh's own shallow repair runs
# `git fetch -q --deepen=400 origin main` before it gives up, so case 1 pays for the deepen, fails, AND LEAVES
# THE CLONE DEEP - after which cases 2 to 5 pass and a second run of the whole file passes 81/0. The tool was
# repairing the environment as a side effect of being tested in it, which is why the job that owns this reads
# "network-dependent": it is not the network, it is that the first measurement changes what the second one
# measures. A control whose outcome depends on whether anything ran it before is not a control. The job is
# jobs/two-push-check-selftests-read-red-in-a-shallow-clone-because-their-fixtures-name-old-commits-2026-10-28,
# whose own measurement at 1c7bd01 reads 80 pass / 1 fail run straight in a depth 50 clone "whose origin could
# deepen it over the network" and 76 pass / 5 fail through the push checks tier's mirror, "which cannot deepen"
# - the same five cases, and the difference between the two figures is the side effect described above.
# THE FIX IS THE FIXTURE, NOT THE EXPECTATION, AND IT MAKES THE CASES STRONGER RATHER THAN QUIETER.
# A local bare repository stands in for origin - the same device section D already uses for the refusals - with
# three shas of its own: main's tip, main's PARENT, and a commit on a side branch that was never pushed. So the
# two passing arms are now measured separately (equal-to-tip, and a strict ancestor) and the refusing arm is
# measured too, all offline, with every object present by construction at any clone depth. Before this, the
# ancestry arm was exercised only incidentally and the "NOT on origin/main" refusal was not exercised at all.
OM="$TD/onmain"; OMB="$TD/onmain-origin.git"
mkdir -p "$OM/gates" "$OM/logs"
cp "$VL" "$OM/gates/verify-log.sh"; chmod +x "$OM/gates/verify-log.sh"
cp "$TD/app.js" "$OM/app.js"          # same bytes, so DISKMD5 and --this-bundle mean the same thing here
for f in gate-manifest.tsv held-trees.tsv; do [ -r "$TD/gates/$f" ] && cp "$TD/gates/$f" "$OM/gates/$f"; done
git init -q "$OM" 2>/dev/null
git -C "$OM" config user.email selftest@example.com; git -C "$OM" config user.name selftest
git -C "$OM" symbolic-ref HEAD refs/heads/main 2>/dev/null
git -C "$OM" commit -q --allow-empty -m "the ancestor the passing --on-main case names" >/dev/null 2>&1
OMANC="$(git -C "$OM" rev-parse HEAD 2>/dev/null || true)"
git -C "$OM" commit -q --allow-empty -m "the tip origin/main points at" >/dev/null 2>&1
OMTIP="$(git -C "$OM" rev-parse HEAD 2>/dev/null || true)"
git -C "$OM" checkout -q -b side "$OMANC" 2>/dev/null
git -C "$OM" commit -q --allow-empty -m "a commit that never reached main" >/dev/null 2>&1
OMOFF="$(git -C "$OM" rev-parse HEAD 2>/dev/null || true)"
git -C "$OM" checkout -q main 2>/dev/null
git init -q --bare "$OMB" 2>/dev/null
git -C "$OM" remote add origin "$OMB" 2>/dev/null
git -C "$OM" push -q origin main 2>/dev/null
onmain() { ( cd "$OM" && "$OM/gates/verify-log.sh" "$@" ); }   # cwd is what `git ls-remote origin` reads
# THE FIXTURE'S OWN PRECONDITIONS, ASSERTED BEFORE ANYTHING IS CONCLUDED FROM IT. A missing denominator is
# reported, never credited [CLAUDE.md]: if this little repository did not build, every case below would pass or
# fail for a reason that has nothing to do with verify-log.sh, and these four lines are what say so out loud.
eq "D+ fixture: origin's main is readable offline and is the tip commit" "$OMTIP" \
   "$(cd "$OM" && git ls-remote origin refs/heads/main 2>/dev/null | head -1 | cut -f1)"
eq "D+ fixture: the ancestor is a DIFFERENT commit from the tip, so the ancestry arm is the one measured" "differ" \
   "$( [ -n "$OMANC" ] && [ -n "$OMTIP" ] && [ "$OMANC" != "$OMTIP" ] && echo differ || echo same )"
eq "D+ fixture: and it really is an ancestor of it, measured with git rather than assumed" "yes" \
   "$(cd "$OM" && git merge-base --is-ancestor "$OMANC" "$OMTIP" 2>/dev/null && echo yes || echo no)"
eq "D+ fixture: while the side commit is NOT, which is what the refusing case rests on" "no" \
   "$(cd "$OM" && git merge-base --is-ancestor "$OMOFF" "$OMTIP" 2>/dev/null && echo yes || echo no)"
# Each fixture log is $GOOD with its ref line rewritten, exactly as $GOOD is itself $REALLOG with its md5 line
# rewritten: a real committed green, so every structural check still sees the shape it was written for.
onmainlog() { sed "s|^ref: HEAD .*|ref: HEAD $1|" "$GOOD" > "$2"; }
GOODANC="$OM/logs/anc.log"; onmainlog "$OMANC" "$GOODANC"
GOODTIP="$OM/logs/tip.log"; onmainlog "$OMTIP" "$GOODTIP"
GOODOFF="$OM/logs/off.log"; onmainlog "$OMOFF" "$GOODOFF"
eq "D+ fixture: the rewritten log carries exactly one ref line, and it is the sha asked for" "1 $OMANC" \
   "$( printf '%s %s' "$(grep -c '^ref: HEAD ' "$GOODANC")" "$(grep -o '^ref: HEAD .*' "$GOODANC" | awk '{print $3}')" )"
ckmsg "D+ --on-main passes on a STRICT ANCESTOR of origin/main, offline"   0 "ON-MAIN OK" \
      onmain "$GOODANC" "$FOOT" --on-main
ckmsg "D+ --on-main passes when the gated sha IS origin/main itself"       0 "ON-MAIN OK" \
      onmain "$GOODTIP" "$FOOT" --on-main
ckmsg "D+ --on-main REFUSES a gated sha that is not on main, and says which" 1 "NOT on origin/main" \
      onmain "$GOODOFF" "$FOOT" --on-main
# AND THE REFUSAL ABOVE IS NOT THE SHALLOW ONE WEARING ITS CLOTHES. verify-log.sh has two refusals here and
# they say opposite things: "NOT CHECKED, not 'not on main'" for a clone that cannot see past its graft, and
# "is NOT on origin/main" for a sha that genuinely is not there. This fixture is not shallow, so the second is
# the only one that may fire - and if a later edit ever made the shallow arm swallow the real one, this is the
# line that notices.
# THE SELECTOR IS THE SHALLOW REFUSAL'S OWN SENTENCE AND NOT THE BARE WORDS "NOT CHECKED", corrected at #544
# item (29) after that item's new arm made this one go red. The arm counted every occurrence of a generic
# phrase, and verify-log.sh now prints "FONTCONFIG NOT CHECKED" for a log that predates the #485 instrument -
# which is a true, unrelated report. So the count rose to 1 and this line read as the shallow refusal having
# swallowed the real one, which it had not. A bad selector is a reading, not a measurement [CLAUDE.md]: it now
# names the shallow arm's own first clause, which nothing else in this script prints.
eq "D+ and it is the genuine refusal, not the shallow-clone NOT CHECKED one" "0" \
   "$(onmain "$GOODOFF" "$FOOT" --on-main 2>&1 | grep -c "NOT CHECKED, not 'not on main'" || true)"
echo

# ── SECTION G (the build-number series door, #534 VLDOOR) WAS REVERTED OUT WITH THE CHECK IT CONTROLLED.
# Its 30-odd cases and its two mutants were real and all passed; they are gone because the CHECK is gone, and
# a control over a check that no longer exists is worse than no control - it is a green that means nothing.
# WHY THE CHECK WENT, in one line each: it located the footer verdict between the LAST `gate manifest:` and
# the LAST `gates ran (`; three antagonist pairs broke it in three different spellings; the final one needed
# NO ADDED LINE AT ALL - move the log's own manifest line below the real verdict, append a forged `ok`, and
# the forged footer is STRUCTURALLY IDENTICAL to an honest one (same order, gap 2, one line between), so no
# positional or frequency test over the log text can separate them. The one real trace is a RED line
# elsewhere, which a forger deletes. See the declaration where blocks (11a) and (11) used to live in
# gates/verify-log.sh. The lesson this file keeps: each repair was controlled against the PREVIOUS attack's
# spelling rather than against the mechanism, so each control passed and the next spelling walked through.

echo "-- E. THE HOLES. Written as the requirement, so each retires itself when the push gate is fixed."
echo "      THE CAUSE IS ONE LINE: verify-log.sh:220 parses its own arguments with"
echo "        for a in \"\${@:2}\"; do case \"\$a\" in --on-main) ...;; *) WANT=\"\$a\";; esac; done"
echo "      so ANY unrecognised argument is silently taken to be the expected build number, and the last one"
echo "      wins. A misspelled flag is therefore not an error - it is a build-number guess."
echo "      AND THE EFFECT IS ORDER-DEPENDENT, which is sharper than the parent job records. Measured"
echo "      2026-10-04 by this file: a misspelling placed AFTER the build number overwrites WANT and refuses"
echo "      (for the wrong reason, as a build mismatch); placed BEFORE it, the correct number overwrites WANT,"
echo "      the comparison passes, the flag is never set, and the run reads OK at exit 0 having silently"
echo "      skipped the check it asked for. The build procedure passes the number first, so the dangerous"
echo "      order is the one the project actually types. One line of output is the entire difference between"
echo "      the two runs: 'THIS-BUNDLE OK'. Nothing else changes."
for bad in --this-bundl --this--bundle -this-bundle --this_bundle --thisbundle; do
  hole "verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03" \
       "a misspelled '$bad' before the build number must not read as a build number" 1 \
       "$VL" "$GOOD" "$bad" "$FOOT"
done
hole "verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03" \
     "a misspelled '--on-mian' before the build number must not read as a build number" 1 \
     "$VL" "$GOOD" --on-mian "$FOOT"
hole "verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03" \
     "a bare unknown argument '--nonsense' must be refused rather than guessed at" 1 \
     "$VL" "$GOOD" --nonsense "$FOOT"
echo "      AND THE SAME PARSER HOLE HAS A SECOND MOUTH, found by this file rather than inherited:"
echo "      a misspelling placed AFTER the number does refuse, but it refuses as 'you said X but the log gated"
echo "      #NNN' - a build-number complaint for a flag typo. A reader who trusts that message will go and"
echo "      check the build number, which is correct, and the typo survives the investigation."
holeneg "verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03" \
     "a misspelling after the build number must not be reported as a build-number mismatch" 1 "you said" \
     "$VL" "$GOOD" "$FOOT" --this-bundl
echo "      THIS CASE WAS WRITTEN WRONG FIRST AND THE ERROR IS WORTH MORE THAN THE CASE [R18]. It was"
echo "      written as a CONFIRMED case asserting the refusal says 'you said ... but the log gated #NNN',"
echo "      which is today's behaviour - so it pinned the bug as the requirement, the exact 'snapshot of a"
echo "      bug' this file's own header warns against twenty lines up. It was caught the only way it could"
echo "      be: by running this selftest against a COPY of verify-log.sh with a candidate parser fix applied,"
echo "      where the case went red under a correct fix. A control is only trustworthy once it has been seen"
echo "      to flip, and the thing that flips it has to be the fix rather than the bug."
echo

echo "-- F. THE HELD REGISTER IS READ AS THE UNION OF HEAD'S COPY AND THE WORKING TREE'S [#534, HELDWT]"
echo "      jobs/verify-log-sh-and-held-sh-read-the-held-register-from-the-working-tree-so-one-uncommitted-line-deletion-clears-a-held-refusal-2026-10-22,"
echo "      routed from #531's antagonist B. Before the fix both of this script's register reads took the"
echo "      WORKING TREE file alone, so ONE UNCOMMITTED LINE DELETION turned a REFUSED (held tree) at exit 1"
echo "      into OK at exit 0. Measured on a clone of 707599b on the archived #452 log before the fix."
echo "      THESE CASES SIT AFTER SECTION E ON PURPOSE, and the reason is the trap: section E's eight hole"
echo "      cases run GOOD and reach the held check, so a held row naming GOOD's own md5 would flip seven of"
echo "      them for a reason that has nothing to do with the hole. Every fixture below uses a key that is"
echo "      NOT GOOD's, and the footer's hole counts are asserted unchanged at the end."
# THE FIXTURE: a log whose header md5 is a key the register already holds (#452's bundle), which the sandbox's
# own app.js is not. The register was copied in and COMMITTED by section D, so HEAD carries it.
HELDKEY="81dc0469862c"
HELDLOG="$TD/logs/held452.log"
sed "1s/md5 $DISKMD5/md5 $HELDKEY/" "$GOOD" > "$HELDLOG"
eq "F0 the fixture log really carries the held key on its header" "1" \
   "$(head -1 "$HELDLOG" | grep -c "md5 $HELDKEY")"
eq "F0 and that key is NOT GOOD's, so section E cannot be touched by it" "0" \
   "$(head -1 "$GOOD" | grep -c "md5 $HELDKEY")"
ck "F1 a held-by-md5 log is REFUSED (the control)" 1 env -C "$TD" "$VL" "$HELDLOG" "$FOOT"
# (a) AN UNCOMMITTED DELETION MAY NOT LIFT IT.
grep -v "^$HELDKEY" "$TD/gates/held-trees.tsv" > "$TD/h.x" && mv "$TD/h.x" "$TD/gates/held-trees.tsv"
eq "F2 the deletion really is uncommitted and git sees it" "1" \
   "$( cd "$TD" && git status --porcelain gates/held-trees.tsv | grep -c '^ M' )"
ck "F2 an UNCOMMITTED DELETION still REFUSES" 1 env -C "$TD" "$VL" "$HELDLOG" "$FOOT"
# (b) AN UNCOMMITTED '-' CLEAR, the register's own documented clear convention, is a different edit.
( cd "$TD" && git checkout -- gates/held-trees.tsv )
sed -i "s/^$HELDKEY/-$HELDKEY/" "$TD/gates/held-trees.tsv"
ck "F3 an UNCOMMITTED '-' clear still REFUSES" 1 env -C "$TD" "$VL" "$HELDLOG" "$FOOT"
# (c) DELETION PLUS assume-unchanged, which is what #531's antagonist B used: git status then prints NOTHING.
( cd "$TD" && git checkout -- gates/held-trees.tsv )
grep -v "^$HELDKEY" "$TD/gates/held-trees.tsv" > "$TD/h.x" && mv "$TD/h.x" "$TD/gates/held-trees.tsv"
( cd "$TD" && git update-index --assume-unchanged gates/held-trees.tsv )
eq "F4 git status prints nothing, which is the point of this case" "0" \
   "$( cd "$TD" && git status --porcelain gates/held-trees.tsv | grep -c . )"
ck "F4 deletion + assume-unchanged still REFUSES" 1 env -C "$TD" "$VL" "$HELDLOG" "$FOOT"
( cd "$TD" && git update-index --no-assume-unchanged gates/held-trees.tsv && git checkout -- gates/held-trees.tsv )
# (d) THE OTHER DIRECTION, which is why this is a union and not a HEAD read: a row `held.sh add` has only just
#     written is NOT YET COMMITTED, and the #450 stand-down writes exactly such a row and then cites it.
FRESHKEY="$DISKMD5"
printf '%s\t%s\t#903\t2026-10-23T03:00Z\tbuild__UNIONFIXTURE\tan uncommitted hold, which is what the 450 stand-down writes immediately before citing it\t-\n' \
  "$FRESHKEY" "0000000000000000000000000000000000000903" >> "$TD/gates/held-trees.tsv"
ck "F5 a row added and NOT committed REFUSES at once" 1 env -C "$TD" "$VL" "$GOOD" "$FOOT"
( cd "$TD" && git checkout -- gates/held-trees.tsv )
ck "F5 and with that row gone, GOOD is accepted again - so F5 was the row and not the log" 0 env -C "$TD" "$VL" "$GOOD" "$FOOT"
# (e) THE SOURCE KEY, the only one of the three that survives a rebuild, must also survive the deletion.
printf 'SELFTEST source for the union cases\n' > "$TD/chess.jsx"
( cd "$TD" && git add chess.jsx >/dev/null 2>&1 && git commit -q -m 'a chess.jsx for the source-key union case' >/dev/null 2>&1 )
SRCKEY="$(printf 'SELFTEST source for the union cases\n' | md5sum | cut -c1-12)"
SRCSHA="$( cd "$TD" && git rev-parse HEAD )"
SRCLOG="$TD/logs/srckey.log"
sed -e "1s/md5 $DISKMD5/md5 ffffffffffff/" "$GOOD" > "$SRCLOG"
sed -i "s|^ref: HEAD .*|ref: HEAD $SRCSHA|" "$SRCLOG"
printf 'aaaaaaaaaa03\t%s\t#904\t2026-10-23T03:00Z\tbuild__UNIONFIXTURE\ta source-key hold whose bundle md5 and gated sha both miss on purpose, so only field 7 can match\t%s\n' \
  "0000000000000000000000000000000000000904" "$SRCKEY" >> "$TD/gates/held-trees.tsv"
( cd "$TD" && git add gates/held-trees.tsv >/dev/null 2>&1 && git commit -q -m 'commit the source-key held row' >/dev/null 2>&1 )
ck "F6 a SOURCE-key hold REFUSES (the control)" 1 env -C "$TD" "$VL" "$SRCLOG" "$FOOT"
grep -v '^aaaaaaaaaa03' "$TD/gates/held-trees.tsv" > "$TD/h.x" && mv "$TD/h.x" "$TD/gates/held-trees.tsv"
ck "F6 and it survives an uncommitted deletion of its row" 1 env -C "$TD" "$VL" "$SRCLOG" "$FOOT"
( cd "$TD" && git checkout -- gates/held-trees.tsv )
# (f) THE SOURCE IS NAMED IN THE OK LINE, so an archived answer says whether one source was read or two.
gt0 "F7 the OK line names the register source and the per-source live counts" \
    "$( env -C "$TD" "$VL" "$GOOD" "$FOOT" 2>&1 | grep -c 'source: HEAD and the working tree' )"
# ---- THE MUTANT: the working-tree-only read restored, which is verify-log.sh as 707599b had it. ----
# One literal edit: the two loops read "$REG" again instead of the union. It must turn F2 from REFUSED to OK.
sed 's|done < "\$REGALL"|done < "$REG"|' "$VL" > "$TD/gates/vl-mutant.sh"; chmod +x "$TD/gates/vl-mutant.sh"
VLM="$TD/gates/vl-mutant.sh"
eq "F MUTANT both loops were put back to \$REG" "2 0" \
   "$(grep -c 'done < "\$REG"' "$VLM") $(grep -c 'done < "\$REGALL"' "$VLM")"
eq "F MUTANT parses" "yes" "$(bash -n "$VLM" 2>/dev/null && echo yes || echo no)"
ck "F MUTANT refuses the held log on a clean tree, as the fix does" 1 env -C "$TD" "$VLM" "$HELDLOG" "$FOOT"
grep -v "^$HELDKEY" "$TD/gates/held-trees.tsv" > "$TD/h.x" && mv "$TD/h.x" "$TD/gates/held-trees.tsv"
ck "F MUTANT an uncommitted deletion LIFTS the refusal - the defect" 0 env -C "$TD" timeout 60 "$VLM" "$HELDLOG" "$FOOT"
ck "F FIX the same tree still REFUSES" 1 env -C "$TD" "$VL" "$HELDLOG" "$FOOT"
( cd "$TD" && git checkout -- gates/held-trees.tsv )
echo

echo "---"
# ---- H. THE ARGUMENT PARSER REFUSES WHAT IT DOES NOT RECOGNISE [#537, VLMISS] -------------------------------
# jobs/verify-log-accepts-a-misspelled-this-bundle-and-returns-ok-2026-10-03.
# THE JOB'S OWN CONTROL IS THE EIGHT HOLE CASES IN SECTION E ABOVE, which were written as the TRUE requirement
# and flip to HOLE CLOSED by themselves once the parser is repaired - that is why this file's exit goes from 2
# to 0 with no case here changing. Measured: 35 pass / 0 fail / 8 open / exit 2 before, 35 / 0 / 0 open /
# 8 closed / exit 0 after.
# THIS SECTION EXISTS BECAUSE THOSE EIGHT DO NOT CARRY THE WHOLE INPUT CLASS. The job names six tokens and the
# holes carry only four of them: neither `--this-bundel` (the job's own spelling, one letter from
# `--this-bundl`, which the holes DO carry) nor `--ignore-helds` appears there, and no hole tests the SHAPE of
# the build number at all. A set of inputs that happens to miss two of the six the job names is the
# "a gate that has never gone red on an input class" shape, so the class is completed here rather than assumed.
echo "  H. the parser refuses an unrecognised token instead of reading it as the build number (#537)"
# (a) THE JOB'S SIX TOKENS, PLACED BEFORE THE NUMBER, which is the order that used to be silent: the real
#     number overwrote the typo and the gate answered OK. Each must refuse AND NAME THE TOKEN - a refusal that
#     does not name it sends the operator to check the build number instead, which is section E's holeneg case.
for bad in --this-bundel -this-bundle --this_bundle --thisbundle --on-mian --ignore-helds; do
  ckmsg "H '$bad' before the number is refused and NAMED" 1 "$bad" "$VL" "$GOOD" "$bad" "$FOOT"
done
# (b) AND AFTER THE NUMBER TOO, so the fix is not order-dependent in the other direction. Before the repair
#     this position refused, but as "you said X but the log gated #NNN" - a build-number complaint for a flag
#     typo, which section E pins with a holeneg. Here it must refuse as an unknown OPTION.
ckmsg "H a misspelling AFTER the number is refused as an unknown option" 1 "is not an option" \
      "$VL" "$GOOD" "$FOOT" --this-bundel
# (c) THE BUILD NUMBER'S SHAPE. ^#[0-9]{3,4}$ is what gates/build.sh and gates/gates.sh both require, and this
#     script validated it nowhere, so any token at all became the expected build.
ckmsg "H '#53' is too short to be a build number"   1 "is not a build number" "$VL" "$GOOD" '#53'
ckmsg "H '534' without the # is not a build number" 1 "is not a build number" "$VL" "$GOOD" '534'
ckmsg "H '#53a' is not a build number"              1 "is not a build number" "$VL" "$GOOD" '#53a'
# (d) EVERY VALID FORM STILL WORKS, IN EITHER ORDER, which is the half that stops this fix becoming a
#     regression. Without these the refusals above could be satisfied by a parser that refuses everything.
ck "H valid: <log> alone"                                  0 "$VL" "$GOOD"
ck "H valid: <log> '#NNN'"                                 0 "$VL" "$GOOD" "$FOOT"
# THE FOUR --on-main FORMS RUN AGAINST THE LOCAL ORIGIN OF SECTION D+, NOT THE REAL ONE. What they are for is
# the PARSER - the flag in each position, with and without a number, beside another flag - and that is measured
# just as well against a fixture whose objects are all present. Against the real origin they were also, by
# accident, a test of the ancestry of one hard-coded sha, which is what made them depth-dependent (see D+).
ck "H valid: <log> '#NNN' --on-main"                       0 onmain "$GOODANC" "$FOOT" --on-main
ck "H valid: <log> --on-main '#NNN' (flag FIRST)"          0 onmain "$GOODANC" --on-main "$FOOT"
ck "H valid: <log> --on-main --this-bundle, no number"     0 onmain "$GOODANC" --on-main --this-bundle
ck "H valid: <log> --ignore-held '#NNN' --on-main"         0 onmain "$GOODANC" --ignore-held "$FOOT" --on-main
# (e) IS DELIBERATELY NOT HERE, AND THE REASON IS A MEASUREMENT RATHER THAN A PREFERENCE. The obvious case to
#     add is that the two arms reading $1 BEFORE the parser (--citations and --citations-selftest) are still
#     reached. It cannot live in this file: $VL is a COPY in a temp fixture with no story files and no gate
#     roster, and BOTH arms HANG there - measured, two of them still running after seven minutes before they
#     were killed by pid - so the case would not fail, it would stall the whole selftest. An assertion that
#     hangs is worse than none, which is this project's own rule about a mutant that hangs proving nothing.
#     The measurement belongs in the real checkout and was taken there instead, on the tree this run commits:
#     `--citations` exits 1 (the base's own standing red, unchanged) and `--citations-selftest` exits 0, and
#     neither prints a parser refusal. It is recorded on the job, not asserted here.

# ── I. AN EMPTY POSITIONAL IS NOT A TYPO ───────────────────────────────────────────────────────────────────
# Section H pinned the parser's refusals: a flag it does not know and a token that is not a build number are
# both exit 1, where before they were silently overwritten by the number that followed. It had no case for the
# EMPTY STRING, and that is the one token a CALLER produces rather than a typist: `verify-log.sh "$LOG" "$NUM"`
# with NUM unset passes '', which ed65bab ignored (exit 0, nothing pinned) and the new loop sent to the "not a
# build number" arm at exit 1. A gate that refuses a call the base answered is a regression whoever introduced
# it, and this one was introduced by the fix in the same commit as the refusals it belongs to.
# Found by antagonist A at #537 by enumerating what the parser can be HANDED, not what it can be typed.
ck "I empty positional: <log> '' is exit 0, as it was before the parser" 0 "$VL" "$GOOD" ""
eq "I and it pins NO build number, so nothing is asserted about one" "0" \
   "$( "$VL" "$GOOD" "" 2>&1 | grep -c 'REFUSED' )"
# BYTE-IDENTITY WAS THE WRONG BAR AND IT LOCKED THE SILENCE IN. The first version of this assertion required
# the empty-positional call to be byte-identical to the call with no positional at all - which is true of
# ed65bab and was true of the repair, and which made the ONE-LINE improvement the state needs (saying that a
# token was ignored and no number pinned) redden the selftest. A fixture that forbids the fix is worse than no
# fixture. What must agree is the VERDICT and the STATUS; what must differ is exactly one notice line.
# Found by antagonist A, #537, which also measured that no caller in this repository passes a build-number
# variable to this script at all - so the "a caller produces it" justification was an interpretation, not a fact.
eq "I and its VERDICT and STATUS agree with the same call made with no positional at all" "SAME-VERDICT SAME-RC" \
   "$( A="$( "$VL" "$GOOD" "" 2>&1 )"; RA=$?; B="$( "$VL" "$GOOD" 2>&1 )"; RB=$?
      VA="$( printf '%s\n' "$A" | grep -E '^(OK|REFUSED)' | head -1 )"; VB="$( printf '%s\n' "$B" | grep -E '^(OK|REFUSED)' | head -1 )"
      printf '%s %s' "$( [ "$VA" = "$VB" ] && echo SAME-VERDICT || echo DIFFER-VERDICT )" "$( [ "$RA" = "$RB" ] && echo SAME-RC || echo DIFFER-RC )" )"
# AND IT SAYS WHAT IT IGNORED, which is the whole difference between the two calls and the reason the bar above
# was relaxed rather than deleted. A tool that silently drops a token it was handed is #450's shape.
eq "I and the empty positional is REPORTED, naming that no build number is pinned" "1 0" \
   "$( printf '%s %s' "$( "$VL" "$GOOD" "" 2>&1 | grep -c '^NOTE: an empty positional was ignored' )" "$( "$VL" "$GOOD" 2>&1 | grep -c '^NOTE: an empty positional was ignored' )" )"
# AND TWO EMPTIES, because a loop that handles one by accident can still fall through on the second.
ck "I two empty positionals are also exit 0" 0 "$VL" "$GOOD" "" ""
ck "I an empty positional does not disarm a REAL option beside it" 0 onmain "$GOODANC" "" --on-main
ck "I nor a real build number beside it" 0 "$VL" "$GOOD" "" "$FOOT"
# THE CONTROLS: every refusal section H established must still refuse. An empty-string arm placed wrongly -
# above the glob arms, or as part of the catch-all - would take the whole parser down with it, and the three
# cases below are what tell the difference between "'' is ignored" and "the parser stopped reading".
ck "I control: a flag it does not know still REFUSES" 1 "$VL" "$GOOD" --nope
ck "I control: a non-number token still REFUSES" 1 "$VL" "$GOOD" junk
ck "I control: a whitespace-only positional is NOT the empty string and still REFUSES" 1 "$VL" "$GOOD" " "
# THE ORDER IS A FACT ABOUT THE FILE, so it is read off the file by LINE NUMBER rather than inferred from
# behaviour. If '' were ever moved below the catch-all the cases above would go red anyway - this says WHY in
# one line, which is what makes the red diagnosable instead of merely present.
eq "I control: the '' arm sits ABOVE the -* arm in \$SRC, so it cannot fall to the catch-all" "above" \
   "$( A="$( grep -n "^    '')" "$SRC" | head -1 | cut -d: -f1 )"; B="$( grep -n '^    -\*)$' "$SRC" | head -1 | cut -d: -f1 )"
      if [ -n "$A" ] && [ -n "$B" ] && [ "$A" -lt "$B" ]; then echo above; else echo "A=$A B=$B"; fi )"
# A FOURTH ARGUMENT TO A THREE-ARGUMENT `eq` SAT HERE AND RAN AS A COMMAND. It was the first draft of the
# assertion above - an awk whose regex wanted five characters where the real arm has three, so it could never
# match - and when that draft was replaced the replacement anchored on the `eq` line and left this continuation
# behind. bash then ran an empty command name and printed "line 439: : command not found" two lines before this
# file declared itself clean: `bash -n` passes, $F never moves, the exit stays 0, and no door in this project
# reads that stderr, which is why it shipped. Found INDEPENDENTLY BY BOTH antagonists at #537, one from the diff
# and one by running the script and reading what it printed rather than what it counted.
# THE LESSON: when you replace a MULTI-LINE shell construct, anchor on the WHOLE construct. Anchoring on its
# first line leaves the rest executing.

echo
echo "-- J. --this-suite: THE KEY FOR THE SUITE ITSELF [#540, SUITEKEY]"
echo "      jobs/the-push-gate-has-no-key-for-the-suite-itself-2026-10-03. Neither --this-bundle (app.js's md5) nor"
echo "      --on-main (the gated sha's ancestry) is a function of the gate suite, so a tree that rewrote the three"
echo "      deciders passed both unchanged (#474's antagonist B), and a tampered verify-log.sh said OK over itself"
echo "      (#531's antagonist B). These cases run in their OWN throwaway repository holding a one-gate suite, a"
echo "      log whose ref line names that repository's HEAD, and the script run IN PLACE under its gates/, because"
echo "      the arm roots itself from its own location and pins --git-dir and --work-tree there."
SK="$TD/suite"; mkdir -p "$SK/gates/regress" "$SK/logs"
cp "$SRC" "$SK/gates/verify-log.sh"; chmod +x "$SK/gates/verify-log.sh"
[ -r "$HERE/gate-manifest.tsv" ] && cp "$HERE/gate-manifest.tsv" "$SK/gates/gate-manifest.tsv"
[ -r "$HERE/held-trees.tsv" ] && cp "$HERE/held-trees.tsv" "$SK/gates/held-trees.tsv"
cp "$TD/app.js" "$SK/app.js"
printf '// a one-assertion gate for the --this-suite cases\nL.say("J fixture", true);\n' > "$SK/gates/regress/01-selftest-gate.js"
printf '#!/usr/bin/env bash\n# a stand-in gates.sh; never executed by these cases\n' > "$SK/gates/gates.sh"
printf '#!/usr/bin/env bash\n# a stand-in gatemanifest.sh; never executed by these cases\n' > "$SK/gates/gatemanifest.sh"
SKG=(git -C "$SK" --git-dir="$SK/.git" --work-tree="$SK")
( "${SKG[@]}" init -q -b main && "${SKG[@]}" -c user.email=selftest@example.com -c user.name=selftest add -A \
  && "${SKG[@]}" -c user.email=selftest@example.com -c user.name=selftest commit -q -m "suite fixture" ) >/dev/null 2>&1
SKSHA="$("${SKG[@]}" rev-parse HEAD)"
SKVL="$SK/gates/verify-log.sh"
SKLOG="$SK/logs/suite.log"; sed "s|^ref: HEAD .*|ref: HEAD $SKSHA|" "$GOOD" > "$SKLOG"
eq "J0 the fixture log's ref line names the suite repository's HEAD" "1" "$(grep -c "^ref: HEAD $SKSHA" "$SKLOG")"
ckmsg "J1 control: the suite on disk IS the suite at the gated sha" 0 "THIS-SUITE OK" "$SKVL" "$SKLOG" "$FOOT" --this-suite
ckmsg "J1 and the flag is read in either position" 0 "THIS-SUITE OK" "$SKVL" "$SKLOG" --this-suite "$FOOT"
gt0 "J1 and the OK line names what the key leaves OUT, so it cannot be over-read" \
    "$( "$SKVL" "$SKLOG" "$FOOT" --this-suite 2>&1 | grep -c 'NOT in that key' )"
# (a) a gate's assertion edited on disk and not committed - the job's own case, and the one its mutant turns.
printf 'L.say("an assertion the log never ran", true);\n' >> "$SK/gates/regress/01-selftest-gate.js"
ckmsg "J2 a gate EDITED on disk refuses and names the gate" 1 "gates/regress/01-selftest-gate.js: differs" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
ck "J2 control: WITHOUT --this-suite the same tree is still accepted - the defect, kept as the baseline" 0 \
   "$SKVL" "$SKLOG" "$FOOT" --this-bundle
"${SKG[@]}" checkout -q -- gates/regress/01-selftest-gate.js
# (b) a gate on disk the sha never carried: gates.sh globs the directory, so it would run; the log never ran it.
printf 'L.say("a gate the log never ran", true);\n' > "$SK/gates/regress/02-added-gate.js"
ckmsg "J3 a gate ADDED on disk refuses and names it as never run" 1 "gates/regress/02-added-gate.js: on disk and not at" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
rm -f "$SK/gates/regress/02-added-gate.js"
# (b2) A DIRECTORY NAMED LIKE A GATE IS A GATE TO gates.sh (node runs <dir>.js/index.js), so it is a gate to this
#      key too [#540, A2-F1]: the first repair's `find -type f` dropped it and read OK; the glob keeps it.
mkdir -p "$SK/gates/regress/03-dir-gate.js"; printf 'console.log("a directory gate")\n' > "$SK/gates/regress/03-dir-gate.js/index.js"
ckmsg "J3b a DIRECTORY named like a gate, added on disk, refuses and names it as never run" 1 "gates/regress/03-dir-gate.js: on disk and not at" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
rm -rf "$SK/gates/regress/03-dir-gate.js"
# (b3) and a DOTFILE under gates/regress is nothing to gates.sh's glob, so it is nothing to the key [A2-F2].
printf '// an editor lock, never a gate\n' > "$SK/gates/regress/.#lock.js"
ckmsg "J3c a dotfile under gates/regress is not a gate and does not refuse" 0 "THIS-SUITE OK" "$SKVL" "$SKLOG" "$FOOT" --this-suite
rm -f "$SK/gates/regress/.#lock.js"
# (c) a gate deleted on disk.
rm -f "$SK/gates/regress/01-selftest-gate.js"
ckmsg "J4 a gate MISSING on disk refuses and names it" 1 "gates/regress/01-selftest-gate.js: at $SKSHA and missing on disk" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
"${SKG[@]}" checkout -q -- gates/regress/01-selftest-gate.js
# (d) one of the three deciders edited.
printf '# one more line\n' >> "$SK/gates/gates.sh"
ckmsg "J5 gates/gates.sh edited on disk refuses and names it" 1 "gates/gates.sh: differs" "$SKVL" "$SKLOG" "$FOOT" --this-suite
"${SKG[@]}" checkout -q -- gates/gates.sh
# (e) THE VERIFIER ITSELF, which is #531's instance: the script that answers is the file that changed. The
#     append lands after every byte the interpreter has read by the time the arm runs, and the edit is made
#     before the run starts, so this is not the mid-run edit CLAUDE.md forbids.
printf '# tampered\n' >> "$SK/gates/verify-log.sh"
ckmsg "J6 the VERIFIER ITSELF edited on disk refuses and names itself" 1 "gates/verify-log.sh: differs" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
"${SKG[@]}" checkout -q -- gates/verify-log.sh
ckmsg "J6 control: restored, the tree is accepted again - so J2 to J6 were the edits and not the log" 0 "THIS-SUITE OK" \
      "$SKVL" "$SKLOG" "$FOOT" --this-suite
# (f) no ref line: the suite that ran cannot be identified.
grep -v '^ref: HEAD ' "$SKLOG" > "$SK/logs/noref.log"
ckmsg "J7 a log with no 'ref: HEAD' line refuses" 1 "carries no 'ref: HEAD" "$SKVL" "$SK/logs/noref.log" "$FOOT" --this-suite
# (g) a sha this repository does not hold - GOOD's real one. Nothing is fetched: UNKNOWN is not a pass.
ckmsg "J8 a gated sha this repository does not hold refuses, and does not fetch" 1 "does not hold commit" \
      "$SKVL" "$GOOD" "$FOOT" --this-suite
# (h) THE LIMIT, STATED RATHER THAN HIDDEN: the key is the job's set, and gates/lib.js is outside it. A fixture
#     that pretended otherwise would be the frozen-denominator trap; this one says what the word SUITE covers.
printf '// not in the key\n' > "$SK/gates/lib.js"
ck "J9 LIMIT: gates/lib.js is outside the key, so an added lib.js is still accepted (named in the OK line)" 0 \
   "$SKVL" "$SKLOG" "$FOOT" --this-suite
rm -f "$SK/gates/lib.js"
# ---- THE MUTANT: the verdict dropped. One literal edit on the line marked SK-VERDICT; J2 must turn. ----
sed 's|^  if \[ "\$SK_BAD" -gt 0 \]; then   # SK-VERDICT$|  if false; then   # SK-VERDICT (MUTANT)|' "$SKVL" > "$SK/gates/vl-mutant.sh"
chmod +x "$SK/gates/vl-mutant.sh"
eq "J MUTANT the verdict line was replaced exactly once" "1 0" \
   "$(grep -c 'SK-VERDICT (MUTANT)' "$SK/gates/vl-mutant.sh") $(grep -c '^  if \[ "\$SK_BAD" -gt 0 \]; then   # SK-VERDICT$' "$SK/gates/vl-mutant.sh")"
printf 'L.say("an assertion the log never ran", true);\n' >> "$SK/gates/regress/01-selftest-gate.js"
ck "J MUTANT an edited gate is ACCEPTED - the defect" 0 "$SK/gates/vl-mutant.sh" "$SKLOG" "$FOOT" --this-suite
ck "J FIX the same tree still REFUSES" 1 "$SKVL" "$SKLOG" "$FOOT" --this-suite
"${SKG[@]}" checkout -q -- gates/regress/01-selftest-gate.js
rm -f "$SK/gates/vl-mutant.sh"

# ── SECTION FC: WHICH FONTCONFIG PRODUCED THIS LOG [#544, item (29);
# jobs/no-push-authority-tool-can-see-which-fontconfig-produced-a-gate-log-2026-10-06, P1, raised by
# antagonist A of #485 as item 4 of its veto and reached independently by antagonist B's F3].
# THE FIXTURES CARRY A toolchain LINE AND $GOOD DOES NOT, which is the whole reason this section builds its own
# rather than reusing it: claude/agents/gatelogs/474-integration-all.log predates the #485 instrument, so every
# arm above this one reads "pre-instrument" and is untouched by the new check. MEASURED before writing them -
# `grep -c 'toolchain: playwright'` on that log is 0 - because an added arm that silently changed ninety
# existing verdicts would be the worst way to find that out.
# THE ERA CASE IS THE ONE THAT MATTERS MOST and it is FC6: 113 archived logs carry no fontconfig line at all, so
# a check that refused on the line's bare absence would refuse every historical log. The arm keys on the LOG'S
# OWN ERA instead, and FC6 is what proves that a pre-instrument log is reported and not refused.
FCD="$TD/logs"; mkdir -p "$FCD"
fcmk(){ # fcmk <outfile> <line...>: $GOOD with a toolchain line and whatever fontconfig lines are given,
        # inserted after its first line so the header md5 and the footer total are both untouched.
  local out="$1"; shift
  { head -1 "$GOOD"
    printf '     toolchain: playwright 1.63.0 (/opt/node22/lib/node_modules/playwright)  chromium 153.0.8010.12\n'
    for l in "$@"; do printf '     %s\n' "$l"; done
    tail -n +2 "$GOOD"; } > "$out"
}
fcmk "$FCD/fc-pinned.log"   'fontconfig: gates/fonts.conf  ->  sans-serif resolves to "DejaVu Sans"'
fcmk "$FCD/fc-nofc.log"     'fontconfig: DISABLED by CT_NOFC=1 - fonts come from the image  ->  sans-serif resolves to "Inter"'
fcmk "$FCD/fc-caller.log"   'fontconfig: caller-supplied FONTCONFIG_FILE=/tmp/whatever.conf  ->  sans-serif resolves to "Inter"'
fcmk "$FCD/fc-absent.log"   'fontconfig: gates/fonts.conf MISSING - fonts come from the image  ->  sans-serif resolves to "Inter"'
fcmk "$FCD/fc-drift.log"    'fontconfig: gates/fonts.conf  ->  sans-serif resolves to "DejaVu Sans"' \
                            'fontconfig: DISABLED by CT_NOFC=1 - fonts come from the image  ->  sans-serif resolves to "Inter"'
fcmk "$FCD/fc-missing.log"
ck      "FC1 a log produced under the PINNED fontconfig is accepted"            0 "$VL" "$FCD/fc-pinned.log" "$FOOT"
ckmsg   "FC2 a CT_NOFC=1 log is REFUSED"                                        1 'REFUSED (fontconfig)' "$VL" "$FCD/fc-nofc.log" "$FOOT"
ckmsg   "FC3 a caller-supplied FONTCONFIG_FILE log is REFUSED"                  1 'REFUSED (fontconfig)' "$VL" "$FCD/fc-caller.log" "$FOOT"
ckmsg   "FC4 a log with TWO fontconfig states is REFUSED as drifted"            1 'MORE THAN ONE distinct fontconfig state' "$VL" "$FCD/fc-drift.log" "$FOOT"
ckmsg   "FC5 an instrumented log with NO fontconfig line is REFUSED"            1 'carries NO fontconfig line' "$VL" "$FCD/fc-missing.log" "$FOOT"
ckmsg   "FC6 a PRE-INSTRUMENT log is reported and NOT refused"                  0 'FONTCONFIG NOT CHECKED' "$VL" "$GOOD" "$FOOT"
# FC7 AND FC8 ARE THE #450 LESSON, AND THEY ARE TWO ARMS AND NOT ONE. The first draft of --ignore-held SKIPPED
# THE LOOKUP ENTIRELY and so overrode SILENTLY, which #450 caught with its own control; an exit code alone
# cannot tell a loud override from a check that was never made.
ck      "FC7 --ignore-fc overrides the refusal"                                 0 "$VL" "$FCD/fc-nofc.log" "$FOOT" --ignore-fc
ckmsg   "FC8 and the override is LOUD, not silent"                              0 'FONTCONFIG OVERRIDDEN BY --ignore-fc' "$VL" "$FCD/fc-nofc.log" "$FOOT" --ignore-fc
# FC9: the state is NAMED in the refusal, or a reader has to re-derive which of the three it was.
ckmsg   "FC9 the refusal names the state it found"                              1 'CT_NOFC=1' "$VL" "$FCD/fc-nofc.log" "$FOOT"
# FC10 AND FC11 ARE THE THIRD STATE THE JOB NAMES [#545, item (7)]: gates/lib.js prints 'gates/fonts.conf MISSING'
# when the pinned file is absent, and arm (15)'s old prefix match read that line as PINNED and answered OK.
ckmsg   "FC10 a log whose gates/fonts.conf was MISSING is REFUSED"              1 'REFUSED (fontconfig)' "$VL" "$FCD/fc-absent.log" "$FOOT"
ckmsg   "FC11 and the refusal names the MISSING state"                          1 'gates/fonts.conf MISSING' "$VL" "$FCD/fc-absent.log" "$FOOT"
# ── SECTION GA: THE GATE ANCHOR'S COUNTS ARE READ, AND A #545-OR-LATER LOG MUST CARRY THE LINE [#545, item (24);
# jobs/the-manifest-anchor-count-reaches-the-log-but-not-the-push-gate-2026-10-03, work items 1 and 3]. These run on
# COPIES OF A REAL ARCHIVED LOG THAT CARRIES THE LINE (544-all.log, 'gate anchor: origin/main, 0 vanished, 0
# weakened'), because $GOOD predates the anchor and could not pose any of them. Each fixture changes one thing.
GAD="$TD/ga"; mkdir -p "$GAD"; GAREAL="$HERE/../claude/agents/gatelogs/544-all.log"
if [ -r "$GAREAL" ] && grep -q '^gate anchor: origin/main, 0 vanished, 0 weakened$' "$GAREAL"; then
  cp "$GAREAL" "$GAD/ga-ok.log"
  sed 's/^gate anchor: origin\/main, 0 vanished, 0 weakened$/gate anchor: origin\/main, 1 vanished, 0 weakened/' "$GAREAL" > "$GAD/ga-van.log"
  sed 's/^gate anchor: origin\/main, 0 vanished, 0 weakened$/gate anchor: origin\/main, 0 vanished, 1 weakened/' "$GAREAL" > "$GAD/ga-weak.log"
  sed 's/^gate anchor: origin\/main, 0 vanished, 0 weakened$/gate anchor: origin\/main, some vanished/' "$GAREAL" > "$GAD/ga-unparse.log"
  sed 's/^gate anchor: origin\/main, 0 vanished, 0 weakened$/gate anchor: NOT CHECKED - fixture/' "$GAREAL" > "$GAD/ga-nc.log"
  grep -v '^gate anchor:' "$GAREAL" > "$GAD/ga-absent-544.log"
  grep -v '^gate anchor:' "$GAREAL" | sed 's/#544/#545/g' > "$GAD/ga-absent-545.log"
  ck      "GA0 the real 544-all.log, anchor 0/0, is accepted"                            0 "$VL" "$GAD/ga-ok.log" '#544'
  ckmsg   "GA1 an anchor reporting 1 VANISHED required gate is REFUSED"                  1 'VANISHED' "$VL" "$GAD/ga-van.log" '#544'
  ckmsg   "GA2 an anchor reporting 1 WEAKENED required gate is REFUSED"                  1 'WEAKENED' "$VL" "$GAD/ga-weak.log" '#544'
  ckmsg   "GA3 an anchor line that does not parse into two counts is REFUSED"            1 'cannot read' "$VL" "$GAD/ga-unparse.log" '#544'
  ckmsg   "GA4 an anchor that reads NOT CHECKED is still REFUSED (#544's arm, kept)"     1 'NOT CHECKED' "$VL" "$GAD/ga-nc.log" '#544'
  ckmsg   "GA5 a #544 log with NO anchor line is reported, not refused (pre-#545 era)"   0 'gate anchor: NOT CHECKED' "$VL" "$GAD/ga-absent-544.log" '#544'
  ckmsg   "GA6 a #545-or-later log with NO anchor line is REFUSED"                       1 'carries no' "$VL" "$GAD/ga-absent-545.log" '#545'
else
  echo "FAIL GA the real archived log with a gate anchor line is not readable at $GAREAL - section GA did not run"; F=$((F+1))
fi

# ── SF: PER-SECTION SELF-CONSISTENCY, check (6b) [#545, item (87); jobs/log-self-consistency-is-one-line-forgeable-
# and-54-per-gate-footers-are-unread-2026-10-03]. The job's three inputs: the real 474-all.log (control), the half-
# stripped forgery (every second PASS dropped, global footer rewritten - check (6) alone printed "footer agrees"), and
# the same forgery with every gate's own "N pass" footer fixed up too, which the harness line must still catch.
SFREAL="$REPO/claude/agents/gatelogs/474-all.log"
if [ -r "$SFREAL" ]; then
  SFD="$TD/sf"; mkdir -p "$SFD"
  SFT="$(grep -o 'regression assertions (PASS lines): [0-9]*' "$SFREAL" | tail -1 | grep -o '[0-9]*$')"
  awk '/^PASS/{c++; if(c%2==0) next} {print}' "$SFREAL" > "$SFD/half.log"
  SFH="$(grep -c '^PASS' "$SFD/half.log")"
  sed -i "s/regression assertions (PASS lines): $SFT\$/regression assertions (PASS lines): $SFH/" "$SFD/half.log"
  awk 'function out(){ for(i=1;i<=k;i++){ l=b[i]; if(insec && l ~ /^[^ ].*: [0-9]+ pass, [0-9]+ fail$/) sub(/: [0-9]+ pass,/, ": " n " pass,", l); print l } k=0; n=0 }
       /^=== .* ===$/ || /^--- / || /^regression assertions \(PASS lines\)/ { out(); insec=($0 ~ /^=== /) }
       { b[++k]=$0; if($0 ~ /^PASS/) n++ }
       END{ out() }' "$SFD/half.log" > "$SFD/half2.log"
  ck    "SF0 the real 474-all.log is accepted by the per-section arm"                              0 "$VL" "$SFREAL" '#474'
  ckmsg "SF1 half the PASS lines dropped and the global footer rewritten is REFUSED, by section"   1 'section by section' "$VL" "$SFD/half.log" '#474'
  ckmsg "SF2 the same with every gate footer fixed up is still REFUSED, on the harness line"       1 'the harness line says' "$VL" "$SFD/half2.log" '#474'
else
  echo "FAIL SF the real archived 474-all.log is not readable at $SFREAL - section SF did not run"; F=$((F+1))
fi

# ── SR: NO RED MARKER IN A GREEN LOG, check (6c) [#545, antagonist B's finding 1]. A red log made "green" by its last line,
# by an appended verdict, and a green log with a second appended GATES GREEN.
SRRED="$REPO/claude/agents/gatelogs/521-RED-the-pre-existing-gate-48-latch-fired-at-320x540.log"
if [ -r "$SRRED" ] && [ -r "$REPO/claude/agents/gatelogs/544-all.log" ]; then
  SRD="$TD/sr"; mkdir -p "$SRD"
  sed '$ s/GATES RED #521/GATES GREEN #521/' "$SRRED" > "$SRD/lastline.log"
  { cat "$SRRED"; echo 'GATES GREEN #521'; } > "$SRD/appended.log"
  { cat "$REPO/claude/agents/gatelogs/544-all.log"; echo 'GATES GREEN #544'; } > "$SRD/twogreen.log"
  ckmsg "SR1 a RED log whose last line was rewritten to GATES GREEN is REFUSED for its red markers" 1 'red marker' "$VL" "$SRD/lastline.log" '#521'
  ckmsg "SR2 a RED log with GATES GREEN appended under GATES RED is REFUSED"                        1 'red marker' "$VL" "$SRD/appended.log" '#521'
  ckmsg "SR3 a green log with a second appended GATES GREEN is REFUSED"                              1 'GATES GREEN' "$VL" "$SRD/twogreen.log" '#544'
else
  echo "FAIL SR the archived 521-RED or 544 log is not readable - section SR did not run"; F=$((F+1))
fi

echo "verify-log self-test: $P pass, $F fail, $HOPEN hole(s) open, $HCLOSED hole(s) closed"
if [ "$F" != "0" ]; then
  echo "A CONFIRMED CASE REGRESSED. That is a real break in the push gate, not a known hole."
  exit 1
fi
if [ "$HOPEN" != "0" ]; then
  echo "Confirmed set clean. $HOPEN hole(s) still open in gates/verify-log.sh - see the job ids above."
  echo "This exit 2 is the EXPECTED state until the push gate's argument parser is repaired, and it is not"
  echo "a gate: gates.sh globs regress/*.js and never runs this file."
  exit 2
fi
echo "Confirmed set clean and every hole closed."
exit 0
