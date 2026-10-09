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
