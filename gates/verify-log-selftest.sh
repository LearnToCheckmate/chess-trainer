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

# ── SECTION G SITS HERE, BEFORE SECTION E, AND THE PLACEMENT IS A REVERT REQUIREMENT AND NOT A PREFERENCE.
# Run 11 lands four jobs as four commits and each must be revertible ALONE. Appended after section F (HELDWT's),
# section G's hunk was ADJACENT to F's with only a blank line between, so `git revert` of HELDWT's commit on this
# head CONFLICTED in this file - measured in a throwaway clone before the antagonist pair read anything. Moving G
# above section E puts forty-odd lines of ORIGINAL, unchanged text between the two jobs' additions, so each
# reverts cleanly. It also removes the hazard the other way round: section F commits a SOURCE-KEY held row whose
# field 7 is the md5 of ITS chess.jsx, and while G ran after F every one of G's logs was refused by that row
# before the series check was reached. G now runs first and writes its own source.
echo "-- G. DID THE BUILD-NUMBER SERIES DOOR RUN? [#534, VLDOOR]"
echo "      jobs/verify-log-sh-cannot-tell-whether-the-build-number-series-door-ran-so-an-older-green-log-still-authorises-a-push-2026-10-22,"
echo "      filed by #533 against its own work. This script reads only lines beginning PASS, FAIL, '=== ',"
echo "      'gate manifest:' and GATES, and the door's verdict begins with none of them - so an archived green"
echo "      from any tree predating the door verified OK with the series question never asked, and an OVERRIDE"
echo "      appended to a real green returned OK without being mentioned."
echo "      THE BOUNDARY IS THE GATED TREE, decided from git objects alone: the tree at the log's 'ref: HEAD'"
echo "      sha runs the door iff its gates/gates.sh carries the footer echo that prints the verdict. These"
echo "      cases build BOTH trees in the miniature repository and fabricate logs naming each."
# TWO COMMITS: one whose gates/gates.sh carries the footer echo, one whose does not. The marker is that echo's
# own parameter expansion, so the no-door fixture is the same file with the expansion absent - which is what
# every tree before 02b4107 on the real repository looks like to this check.
mkdir -p "$TD/gates"
# G'S TREES NEED THEIR OWN chess.jsx, AND MY FIRST DRAFT DID NOT GIVE THEM ONE [R18]. Section F commits a
# SOURCE-KEY held row (#904) whose field 7 is the md5 of F's chess.jsx, and G's commits change only gates.sh -
# so every G log's gated tree still carried F's source and verify-log.sh refused all 23 of them with
# "REFUSED (held tree, SOURCE key)" before the series check was ever reached. Measured, not guessed: the
# refusal named #904 and the md5 4a1d5ec2689e. That is one section's fixture poisoning the next one's, which is
# exactly why F's own cases had to sit after section E - the same hazard one section further on, and I walked
# into it from the other side. A fresh source here puts G's trees on no held row at all.
printf 'SECTION G source, on no held row\n' > "$TD/chess.jsx"
( cd "$TD" && git add chess.jsx >/dev/null 2>&1 && git commit -q -m 'a source for section G that no held row names' >/dev/null 2>&1 )
printf '#!/usr/bin/env bash\n# a gates.sh WITHOUT the series door footer echo\necho "gate manifest: 1 required"\n' > "$TD/gates/gates.sh"
( cd "$TD" && git add gates/gates.sh >/dev/null 2>&1 && git commit -q -m 'a tree with no series door' >/dev/null 2>&1 )
SER_NODOOR="$( cd "$TD" && git rev-parse HEAD )"
printf '#!/usr/bin/env bash\n# a gates.sh WITH the series door footer echo\necho "${GF_LINE:-build-number series: NOT CHECKED - the door set no verdict.}" | tee -a "$ALL"\n' > "$TD/gates/gates.sh"
( cd "$TD" && git add gates/gates.sh >/dev/null 2>&1 && git commit -q -m 'a tree that runs the series door' >/dev/null 2>&1 )
SER_DOOR="$( cd "$TD" && git rev-parse HEAD )"
ck "G0 the honest G log is not refused for some OTHER reason first" 0 env -C "$TD" "$VL" "$GOOD" "$FOOT"
eq "G0 the two fixture trees really differ on the marker" "0 1" \
   "$( cd "$TD" && git show "$SER_NODOOR:gates/gates.sh" | grep -cF '${GF_LINE:-build-number series:' ) $( cd "$TD" && git show "$SER_DOOR:gates/gates.sh" | grep -cF '${GF_LINE:-build-number series:' )"
# THE LOGS. ser_mk <outfile> <sha> <series-line-or-empty>: GOOD with its ref line re-pointed and, optionally, a
# series verdict inserted into the FOOTER - strictly between the last 'gate manifest:' and the last 'gates ran ('.
ser_mk() {
  local out="$1" sha="$2" line="${3:-}"
  local m r
  m="$(grep -n '^gate manifest:' "$GOOD" | tail -1 | cut -d: -f1)"
  r="$(grep -n '^gates ran (' "$GOOD" | tail -1 | cut -d: -f1)"
  awk -v m="$m" -v L="$line" '{ print } NR==m && L!="" { print L }' "$GOOD" \
    | sed "s|^ref: HEAD .*|ref: HEAD $sha|" > "$out"
}
SEROK="$TD/logs/ser-ok.log";     ser_mk "$SEROK"     "$SER_DOOR"   "build-number series: ok - runId=selftest escape=[(unset)] base=aaaaaaaaaaaa"
SERNONE="$TD/logs/ser-none.log"; ser_mk "$SERNONE"   "$SER_DOOR"   ""
SERPRE="$TD/logs/ser-pre.log";   ser_mk "$SERPRE"    "$SER_NODOOR" ""
eq "G0 the fixture logs differ only as intended" "1 0 0" \
   "$(grep -c '^build-number series:' "$SEROK") $(grep -c '^build-number series:' "$SERNONE") $(grep -c '^build-number series:' "$SERPRE")"
# ── THE JOB'S OWN PAIR, which is its whole close condition.
ck "G1 a door tree's log WITH the footer verdict verifies OK"        0 env -C "$TD" "$VL" "$SEROK" "$FOOT"
ck "G2 the SAME log with that footer line removed is REFUSED"        1 env -C "$TD" "$VL" "$SERNONE" "$FOOT"
ck "G3 and the same file naming a tree BEFORE the door is ACCEPTED"  0 env -C "$TD" "$VL" "$SERPRE" "$FOOT"
ckmsg "G3 and it says that tree predates the door" 0 "predates the door" env -C "$TD" "$VL" "$SERPRE" "$FOOT"
ckmsg "G2 and the refusal names the series check as its reason" 1 "REFUSED (series door)" env -C "$TD" "$VL" "$SERNONE" "$FOOT"
# ── THE FIVE PREFIXES. The verdict moved into a line beginning PASS, FAIL, '=== ', 'gate manifest:' or GATES
# must be REFUSED, because the match is anchored at the start of the line. Those five are precisely the prefixes
# this script already reads, so a forged verdict hidden in one of them would be invisible to every other check
# in this file - and accepted by this one if the anchor were dropped. ONE CASE PER PREFIX.
# TWO FIXTURES NEED A SECOND EDIT OR THEY WOULD BE REFUSED FOR THE WRONG REASON, which is #432's A7b and is
# the trap this project files as "a right verdict for a wrong reason": the PASS fixture adds a PASS line, so its
# `regression assertions (PASS lines):` figure must rise by one to keep the footer agreeing; and the '=== '
# fixture adds a section header, so one existing header is dropped to keep the section count equal to the
# roster's N (RAISING N instead is refused at verify-log.sh's roster/manifest tie, a different check).
# MEASURED rather than reasoned: without those two edits today's script already refuses both for other reasons,
# so only the series check can be what refuses them here.
ser_prefix() { # ser_prefix <out> <prefix-line>
  local out="$1" pre="$2" m
  m="$(grep -n '^gate manifest:' "$GOOD" | tail -1 | cut -d: -f1)"
  awk -v m="$m" -v L="$pre" '{ print } NR==m { print L }' "$GOOD" | sed "s|^ref: HEAD .*|ref: HEAD $SER_DOOR|" > "$out"
}
SERV="build-number series: ok - runId=selftest"
ser_prefix "$TD/logs/ser-pass.log" "PASS forged $SERV"
# raise the PASS footer by one, because the fixture added a PASS line
AP="$(grep -c '^PASS' "$TD/logs/ser-pass.log")"
sed -i "s|^regression assertions (PASS lines): .*|regression assertions (PASS lines): $AP|" "$TD/logs/ser-pass.log"
ser_prefix "$TD/logs/ser-fail.log" "FAIL forged $SERV"
ser_prefix "$TD/logs/ser-eq.log"   "=== forged $SERV"
# drop ONE existing section header, so the '=== ' count is unchanged
awk 'BEGIN{d=0} /^=== / && d==0 && $0 !~ /forged/ { d=1; next } { print }' "$TD/logs/ser-eq.log" > "$TD/logs/ser-eq2.log" && mv "$TD/logs/ser-eq2.log" "$TD/logs/ser-eq.log"
ser_prefix "$TD/logs/ser-mani.log" "gate manifest: forged $SERV"
ser_prefix "$TD/logs/ser-gates.log" "GATES forged $SERV"
eq "G4 the PASS fixture's footer agrees with its own PASS count" "1" \
   "$( a="$(grep -c '^PASS' "$TD/logs/ser-pass.log")"; f="$(grep -o 'regression assertions (PASS lines): [0-9]*' "$TD/logs/ser-pass.log" | tail -1 | awk '{print $NF}')"; [ "$a" = "$f" ] && echo 1 || echo 0 )"
eq "G4 the '=== ' fixture's section count is unchanged" "1" \
   "$( [ "$(grep -c '^=== ' "$TD/logs/ser-eq.log")" = "$(grep -c '^=== ' "$GOOD")" ] && echo 1 || echo 0 )"
# ALL FIVE ARE REFUSED, and the reasons are deliberately not asserted to be the same one: four are refused
# because the anchored match never reads a prefixed line as the verdict, and 'mani' because a forged
# 'gate manifest:' line moves the footer boundary so the verdict reads absent. MUTANT2b and MUTANT2c below
# separate the two mechanisms; this loop asserts only the verdict they share.
for pfx in pass fail eq mani gates; do
  ckmsg "G5 a forged verdict on a '$pfx'-prefixed line is REFUSED by the series check" 1 "REFUSED (series door)" \
        env -C "$TD" "$VL" "$TD/logs/ser-$pfx.log" "$FOOT"
done
# ── A FOOTER WITH RED, WITH TWO SERIES LINES, AND WITH EACH FALLBACK TEXT.
ser_mk "$TD/logs/ser-red.log"  "$SER_DOOR" "build-number series: RED - runId=selftest 1 unaccounted"
ckmsg "G6 a RED footer verdict is REFUSED"              1 "reads RED" env -C "$TD" "$VL" "$TD/logs/ser-red.log" "$FOOT"
M2="$(grep -n '^gate manifest:' "$GOOD" | tail -1 | cut -d: -f1)"
awk -v m="$M2" '{ print } NR==m { print "build-number series: ok - one"; print "build-number series: ok - two" }' "$GOOD" \
  | sed "s|^ref: HEAD .*|ref: HEAD $SER_DOOR|" > "$TD/logs/ser-two.log"
ckmsg "G7 a footer with TWO series lines is REFUSED"    1 "MORE THAN ONE" env -C "$TD" "$VL" "$TD/logs/ser-two.log" "$FOOT"
ser_mk "$TD/logs/ser-fb1.log" "$SER_DOOR" "build-number series: NOT CHECKED - the door set no verdict."
ckmsg "G8 the 'set no verdict' fallback is REFUSED"     1 "FALLBACK" env -C "$TD" "$VL" "$TD/logs/ser-fb1.log" "$FOOT"
ser_mk "$TD/logs/ser-fb2.log" "$SER_DOOR" "build-number series: NOT CHECKED - this door did not run."
ckmsg "G8 the 'did not run' fallback is REFUSED"        1 "FALLBACK" env -C "$TD" "$VL" "$TD/logs/ser-fb2.log" "$FOOT"
# ── AN OVERRIDE AND A REAL NOT CHECKED ARE ACCEPTED AND STATED LOUDLY, which is the thing #533's pen note said
#    no grep would ever state for a reader.
ser_mk "$TD/logs/ser-ovr.log" "$SER_DOOR" "build-number series: OVERRIDE - runId=selftest escape=[533]"
ckmsg "G9 an OVERRIDE is accepted and stated loudly"    0 "*** OVERRIDE ***" env -C "$TD" "$VL" "$TD/logs/ser-ovr.log" "$FOOT"
ser_mk "$TD/logs/ser-nc.log"  "$SER_DOOR" "build-number series: NOT CHECKED - runId=selftest base=aaaaaaaaaaaa; the base ref points at HEAD"
ckmsg "G9 a real NOT CHECKED is accepted and stated loudly" 0 "*** NOT CHECKED ***" env -C "$TD" "$VL" "$TD/logs/ser-nc.log" "$FOOT"
# ── A LOG NAMING A COMMIT THIS REPOSITORY LACKS, and one with NO ref line at all: the boundary cannot be
#    decided, so the check says NOT CHECKED with its reason and the verdict is the other checks'.
ser_mk "$TD/logs/ser-absent.log" "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" ""
ckmsg "G10 a log naming an absent commit reads NOT CHECKED, with its reason" 0 "not in this repository" \
      env -C "$TD" "$VL" "$TD/logs/ser-absent.log" "$FOOT"
grep -v '^ref: HEAD ' "$SEROK" > "$TD/logs/ser-noref.log"
ckmsg "G10 a log with no ref line reads NOT CHECKED, with its reason" 0 "carries no 'ref: HEAD" \
      env -C "$TD" "$VL" "$TD/logs/ser-noref.log" "$FOOT"
# ── AND THE #419 LIMIT IS PRINTED, not merely commented.
ckmsg "G11 the OK text states what the check does NOT say [#419]" 0 "verdict was PRINTED, not that it was right" \
      env -C "$TD" "$VL" "$SEROK" "$FOOT"
# ── MUTANT 1: the series check taken out. It must turn G2 from REFUSED to OK.
awk '/^# ── \(11\) DID THE BUILD-NUMBER SERIES DOOR ACTUALLY RUN\?/{d=1} d&&/^echo "OK: \$LOG is a full-suite green/{d=0} !d{print}' "$VL" > "$TD/gates/vl-nodoor.sh"
chmod +x "$TD/gates/vl-nodoor.sh"
eq "G MUTANT1 the check really was removed" "0" "$(grep -c 'REFUSED (series door)' "$TD/gates/vl-nodoor.sh")"
eq "G MUTANT1 parses" "yes" "$(bash -n "$TD/gates/vl-nodoor.sh" 2>/dev/null && echo yes || echo no)"
ck "G MUTANT1 accepts the log with no footer verdict - the defect" 0 env -C "$TD" timeout 60 "$TD/gates/vl-nodoor.sh" "$SERNONE" "$FOOT"
ck "G FIX refuses it"                                              1 env -C "$TD" "$VL" "$SERNONE" "$FOOT"
# ── MUTANT 2: the series match UNANCHORED. It must turn all five prefix cases from REFUSED to OK.
# IT TAKES TWO EDITS, AND FINDING THAT OUT IS WORTH MORE THAN THE MUTANT [#534, VLDOOR]. My first draft dropped
# the '^' from the awk pattern ALONE and all five cases STILL REFUSED - because the `case` that reads the
# verdict WORD is anchored too, so a line beginning "PASS forged build-number series: ok" matches no verdict
# pattern and falls to the unrecognised-verdict arm. So these five prefixes are protected TWICE, by the line
# match and by the word match, and a one-edit mutant does not discriminate: it reaches the right verdict by the
# wrong route, which this project files as a trap in its own right (#419). The faithful mutant is what an
# unanchored reader would really be - find the verdict text wherever it sits, then strip what precedes it - so
# both edits go in. THE ONE-EDIT MUTANT IS KEPT AS ITS OWN CASE, because "the protection is doubled" is a fact
# about this check that nothing else here states.
sed 's|/\^build-number series:/|/build-number series:/|g' "$VL" > "$TD/gates/vl-anchoronly.sh"
chmod +x "$TD/gates/vl-anchoronly.sh"
for pfx in pass fail eq gates; do
  ckmsg "G MUTANT2b the anchor dropped ALONE still refuses, by the other guard ('$pfx')" 1 "does not recognise" \
        env -C "$TD" timeout 60 "$TD/gates/vl-anchoronly.sh" "$TD/logs/ser-$pfx.log" "$FOOT"
done
# 'mani' IS THE ONE PREFIX THE ANCHOR WAS NEVER WHAT PROTECTED, and measuring that is the point of keeping it
# separate rather than folding it into the loop [#534, VLDOOR]. A forged line beginning 'gate manifest:'
# BECOMES the last 'gate manifest:' line, which is the very thing this check uses to find the footer - so the
# region between the boundary and 'gates ran (' is then EMPTY and the verdict reads ABSENT, not forged.
# MEASURED: the fix refuses it with "footer carries 0 series verdict line(s)" and names the boundary lines.
# That is a THIRD guard, independent of both anchors, and it means this prefix cannot be turned by either
# mutant - which is a fact about the check and not a gap in the controls, so it is asserted rather than
# left to look like one of the four.
ckmsg "G MUTANT2c the 'mani' prefix is refused for a DIFFERENT reason: it moves the footer boundary" 1 \
      "0 series verdict line(s)" env -C "$TD" "$VL" "$TD/logs/ser-mani.log" "$FOOT"
ckmsg "G MUTANT2c and neither mutant can turn it, because the boundary moves whatever the match is" 1 \
      "0 series verdict line(s)" env -C "$TD" timeout 60 "$TD/gates/vl-anchoronly.sh" "$TD/logs/ser-mani.log" "$FOOT"
# the second edit, with awk rather than a nested heredoc, because the normalisation itself carries the quoting
# a heredoc would eat.
awk '/^    case "\$SERIESLINE" in/ { print "    SERIESLINE=\"${SERIESLINE#*build-number series: }\"; SERIESLINE=\"build-number series: $SERIESLINE\"" } { print }' \
  "$TD/gates/vl-anchoronly.sh" > "$TD/gates/vl-unanchored.sh"
chmod +x "$TD/gates/vl-unanchored.sh"
eq "G MUTANT2 the anchor really was dropped" "0" "$(grep -c '/\^build-number series:/' "$TD/gates/vl-unanchored.sh")"
eq "G MUTANT2 and the verdict word is read unanchored too" "1" "$(grep -c 'SERIESLINE#\*build-number series:' "$TD/gates/vl-unanchored.sh")"
eq "G MUTANT2 parses" "yes" "$(bash -n "$TD/gates/vl-unanchored.sh" 2>/dev/null && echo yes || echo no)"
for pfx in pass fail eq gates; do
  ck "G MUTANT2 accepts the forged '$pfx'-prefixed verdict - the defect" 0 \
     env -C "$TD" timeout 60 "$TD/gates/vl-unanchored.sh" "$TD/logs/ser-$pfx.log" "$FOOT"
done
ckmsg "G MUTANT2 but NOT 'mani', which the boundary guard refuses on both" 1 "0 series verdict line(s)" \
      env -C "$TD" timeout 60 "$TD/gates/vl-unanchored.sh" "$TD/logs/ser-mani.log" "$FOOT"
ck "G MUTANT2 still agrees with the fix on the honest log" 0 env -C "$TD" "$TD/gates/vl-unanchored.sh" "$SEROK" "$FOOT"
echo

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
