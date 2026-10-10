#!/usr/bin/env bash
# gates/held-selftest.sh - the controls for gates/held.sh, as a COMMAND rather than as a paragraph.
#
# WHY THIS FILE EXISTS, AND IT IS NOT "for completeness". gates/held.sh is the register that tells the push bar
# a tree was deliberately refused, and its field 7 - the sourceMd5 - is the only one of its three keys that
# survives a REBUILD, because gates/build.sh embeds a minute-resolution stamp so a rebuild of byte-identical
# source gets a fresh bundle md5 AND a fresh sha. That key has now been got WRONG TWICE IN BOTH DIRECTIONS:
# once written as '-' by default (opt-in, so absent), and once at #463 computed from the WORKING TREE, which
# names the post-veto edit rather than the gated tree and therefore disarms gates/verify-log.sh's own source
# refusal at the door that authorises a push. Each time, the thing that was missing was A CONTROL THAT CREATES
# THE DISAGREEING CONFIGURATION. jobs/held-sh-field-7-should-come-from-the-gated-sha-not-the-working-tree-2026-10-02
# measured that both existing controls (TC-RS-007 and TC-RS-011) set up the trivially-agreeing case - field 7 is
# written from chess.jsx and compared against the same bytes moments later - so both sides of the comparison are
# the same file and neither tests the arm the field exists for. CASE 2 BELOW IS THAT CONTROL.
#
#   gates/held-selftest.sh      run every case, print PASS/FAIL per case and a footer
#   gates/held.sh selftest      the same thing, for a caller that only knows held.sh's name
#
# IT NEVER TOUCHES THE REAL REGISTER, and here that is a charter rule and not only prudence: gates/held-trees.tsv
# is a .tsv under gates/, which the process build lane may not write at all, and the register is append-only by
# design so a bad row cannot be deleted. Every case runs against a COPY, inside a throwaway git repository built
# by this script, with its own chess.jsx at two versions and its own origin/main.
#
# NOT A GATE. It lives in gates/ and not in gates/regress/, so gates.sh (which globs regress/*.js) never runs it,
# it is in no manifest, and it can never contribute to or block a GATES GREEN. It is a developer check on a
# developer tool - which is exactly the shape gates/records-gate.sh is being built to give a caller to.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

# THE RECURSION GUARD, AND IT IS HERE BECAUSE IT BIT. Case 8 checks that `gates/held.sh selftest` reaches this
# script. Without this guard that call builds a fixture, reaches case 8 again, and the thing never terminates -
# measured as a two-minute timeout on the first run of this file. Case 8's claim is only ever THAT THE ENTRY
# POINT RESOLVES, so a nested call announces itself and stops. It does not re-run the cases and does not claim to.
if [ -n "${CT_HELD_SELFTEST_NESTED:-}" ]; then
  echo "== held.sh self-test, reached as a NESTED call: the entry point resolves, cases not re-run =="
  exit 0
fi

TD="$(mktemp -d)"; trap 'rm -rf "$TD"' EXIT
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
gt0() { # gt0 <description> <count> - the phrase is PRESENT. Used where a message legitimately appears more
        # than once and pinning the exact count would make the control brittle about wording rather than
        # about behaviour, which is the frozen-denominator trap in miniature.
  if [ "${2:-0}" -ge 1 ] 2>/dev/null; then P=$((P+1)); printf 'PASS %s (%s occurrence(s))\n' "$1" "$2"
  else F=$((F+1)); printf 'FAIL %s (absent)\n' "$1"; fi
}
ne() { # ne <description> <must-NOT-equal> <actual>
  if [ "$2" != "$3" ]; then P=$((P+1)); printf 'PASS %s (%s, not %s)\n' "$1" "$3" "$2"
  else F=$((F+1)); printf 'FAIL %s (got %s, which is the value it must never be)\n' "$1" "$3"; fi
}

# ---- THE FIXTURE. A git repository with THREE distinct chess.jsx: main's, the gated one, and an edit. ----
R="$TD/repo"; mkdir -p "$R/gates"
cp "$HERE/held.sh" "$R/gates/held.sh"; chmod +x "$R/gates/held.sh"
# A HEADER-ONLY REGISTER, not a copy of the real one. A copy would carry 12 live rows whose keys could collide
# with a case's own, and `check` would then answer about somebody else's tree. The file's shape is what held.sh
# needs, so the shape is what the fixture provides.
printf '# held-trees.tsv (self-test fixture, not the real register)\n' > "$R/gates/held-trees.tsv"
H="$R/gates/held.sh"
git -C "$R" init -q 2>/dev/null; git -C "$R" config user.email s@t; git -C "$R" config user.name selftest
printf 'MAIN VERSION of chess.jsx\n' > "$R/chess.jsx"; printf 'bundle-main\n' > "$R/app.js"
git -C "$R" add -A >/dev/null; git -C "$R" commit -qm main1
git -C "$R" branch -f main HEAD >/dev/null 2>&1
git -C "$R" update-ref refs/remotes/origin/main HEAD
MAINSRC="$(printf 'MAIN VERSION of chess.jsx\n' | md5sum | cut -c1-12)"
printf 'V1 the GATED source\n' > "$R/chess.jsx"
git -C "$R" add -A >/dev/null; git -C "$R" commit -qm gated
SHA1="$(git -C "$R" rev-parse HEAD)"
V1="$(printf 'V1 the GATED source\n' | md5sum | cut -c1-12)"
V2="$(printf 'V2 EDITED after the gating run\n' | md5sum | cut -c1-12)"
f7() { tail -1 "$R/gates/held-trees.tsv" | cut -f7; }
RSN="a reason long enough to clear the forty character floor this tool enforces"
export CT_RUNID=held-selftest

echo "== held.sh self-test. fixture repo at $R =="
echo "   main's chess.jsx md5 $MAINSRC | gated (V1) $V1 | edited (V2) $V2 | gated sha ${SHA1:0:12}"
echo

# 1. SHA RESOLVABLE AND THE WORKING TREE AGREES WITH IT. The easy case, and the one both pre-existing controls
#    were restricted to. Field 7 must be the source md5 and must NOT be '-'.
printf 'V1 the GATED source\n' > "$R/chess.jsx"
ck "1a add accepted when disk agrees with the gated sha" 0 env CT_RUNID=held-selftest "$H" add aaaaaaaaaaa1 "$SHA1" '#901' "$RSN"
eq "1b field 7 is the gated source md5"       "$V1" "$(f7)"
ne "1c field 7 is not the '-' this defect was filed on" "-" "$(f7)"
eq "1d the output names the sha it used"      "1" "$(env CT_RUNID=held-selftest "$H" add aaaaaaaaaaa2 "$SHA1" '#902' "$RSN" 2>&1 | grep -c "from chess.jsx at the gated sha")"

# 2. ===== THE CONTROL NO EXISTING CONTROL CREATED: THE WORKING TREE DIFFERS FROM THE GATED SHA. =====
#    This is the gate-then-veto-then-edit-then-stand-down sequence that #459, #461 and #463 all actually ran.
#    Field 7 must be V1 (the tree that was gated and refused) and must NOT be V2 (the tree on disk). On #463's
#    shipped behaviour 2b FAILS and 2c FAILS, which is what makes this a control rather than a demonstration.
printf 'V2 EDITED after the gating run\n' > "$R/chess.jsx"
ck "2a add still accepted when disk differs"  0 env CT_RUNID=held-selftest "$H" add bbbbbbbbbbb1 "$SHA1" '#903' "$RSN"
eq "2b field 7 is the GATED source, not the working tree" "$V1" "$(f7)"
ne "2c field 7 is NOT the edited working tree"            "$V2" "$(f7)"
eq "2d the disagreement is warned about, loudly"          "1" "$(env CT_RUNID=held-selftest "$H" add bbbbbbbbbbb2 "$SHA1" '#904' "$RSN" 2>&1 | grep -c 'WARNING - chess.jsx ON DISK')"
eq "2e the warning names the override that would hold the disk tree instead" "1" \
   "$(env CT_RUNID=held-selftest "$H" add bbbbbbbbbbb3 "$SHA1" '#905' "$RSN" 2>&1 | grep -c "CT_SRCMD5=$V2")"

# 3. SHA NOT IN THE CLONE. Shallow clones are normal here, so this must degrade rather than fail - to the
#    working tree, SAYING SO, because a key that names the wrong tree silently is the whole defect class.
ck "3a add accepted with an unresolvable sha" 0 env CT_RUNID=held-selftest "$H" add ccccccccccc1 deadbeef1234567 '#906' "$RSN"
eq "3b field 7 falls back to the working tree" "$V2" "$(f7)"
# 3c WAS WRITTEN EXPECTING ONE OCCURRENCE AND MEASURED TWO, AND THE CONTROL WAS WRONG RATHER THAN THE TOOL
#     [R18]: the phrase appears in the NOTE and again in the closing `field 7 ... from <how>` provenance line,
#     which is correct - a reader who sees only the last line still learns which tree the key names.
gt0 "3c and the fallback says which tree it used" \
   "$(env CT_RUNID=held-selftest "$H" add ccccccccccc2 deadbeef1234568 '#907' "$RSN" 2>&1 | grep -c 'not a commit in this clone')"

# 4. A COMMA-SEPARATED SHA LIST IS REFUSED RATHER THAN GUESSED. Row 1 of the real register carries two shas,
#    and two shas are two trees with two different chess.jsx. The explicit override makes it sayable.
ck "4a a two-sha row is refused (exit 2)" 2 env CT_RUNID=held-selftest "$H" add ddddddddddd1 "$SHA1,deadbeef1234567" '#908' "$RSN"
ck "4b ... and accepted once CT_SRCMD5 says which source" 0 env CT_RUNID=held-selftest CT_SRCMD5="$V1" "$H" add ddddddddddd1 "$SHA1,deadbeef1234567" '#909' "$RSN"
eq "4c the override is what lands in field 7" "$V1" "$(f7)"

# 5. A KEY EQUAL TO MAIN'S OWN chess.jsx IS WRITTEN AS '-', LOUDLY. The harness-only hold. Found by #463 trying
#    to write its own row, and by neither antagonist. A guard that refuses main is worse than no guard.
printf 'MAIN VERSION of chess.jsx\n' > "$R/chess.jsx"
MAINSHA="$(git -C "$R" rev-parse HEAD~1)"
ck "5a a harness-only hold is still recorded" 0 env CT_RUNID=held-selftest "$H" add eeeeeeeeeee1 "$MAINSHA" '#910' "$RSN"
eq "5b its field 7 is '-' rather than a key that would hold main" "-" "$(f7)"
eq "5c and it says what the row loses by it" "1" \
   "$(env CT_RUNID=held-selftest "$H" add eeeeeeeeeee2 "$MAINSHA" '#911' "$RSN" 2>&1 | grep -c 'LOSES ITS REBUILD-PROOF KEY')"

# 6. THE OVERRIDE IS VALIDATED LIKE AN ARGUMENT, because an unmatched key looks live and matches nothing - the
#    lesson `add` already learned about its first two keys. '-' stays legal: it is the honest answer of case 5.
printf 'V1 the GATED source\n' > "$R/chess.jsx"
ck "6a a non-hex CT_SRCMD5 is refused"        2 env CT_RUNID=held-selftest CT_SRCMD5=zzzzzzzzzzzz "$H" add fffffffffff1 "$SHA1" '#912' "$RSN"
ck "6b a 32-char CT_SRCMD5 is refused"        2 env CT_RUNID=held-selftest CT_SRCMD5=a4df39c38222a4df39c38222a4df3922 "$H" add fffffffffff2 "$SHA1" '#913' "$RSN"
ck "6c CT_SRCMD5=- is legal, not an error"    0 env CT_RUNID=held-selftest CT_SRCMD5=- "$H" add fffffffffff3 "$SHA1" '#914' "$RSN"
eq "6d ... and writes '-'"                    "-" "$(f7)"

# 7. THE ARMS THAT WERE ALREADY RIGHT MUST STILL BE RIGHT. This change touches one branch of `add`; these are
#    the never-regress controls for everything around it, so a later edit cannot trade one guard for another.
ck "7a add without CT_RUNID is refused"       2 env -u CT_RUNID "$H" add 11111111111a "$SHA1" '#915' "$RSN"
ck "7b a short reason is refused"             2 env CT_RUNID=held-selftest "$H" add 11111111111b "$SHA1" '#916' "too short"
ck "7c a malformed build token is refused"    2 env CT_RUNID=held-selftest "$H" add 11111111111c "$SHA1" '915' "$RSN"
ck "7d a non-hex bundle md5 is refused"       2 env CT_RUNID=held-selftest "$H" add zzzzzzzzzzzz "$SHA1" '#917' "$RSN"
ck "7e a duplicate bundle+sha is refused"     1 env CT_RUNID=held-selftest "$H" add aaaaaaaaaaa1 "$SHA1" '#918' "$RSN"
ck "7f check on a held bundle refuses"        1 "$H" check aaaaaaaaaaa1
# 7g FAILED AS FIRST WRITTEN AND THE TOOL WAS RIGHT [R18]. `check 0f0f0f0f0f0f` exited 1, not 0, because
#     chess.jsx on disk was still V1 - a source that case 1 and case 2 both put on the register - so the SOURCE
#     arm refused it, exactly as designed. The control had quietly assumed "unknown bundle key" meant "not held",
#     which is the inference the source key exists to break. The case now gives the fixture a tree that is on no
#     row, which is what it always meant to ask.
printf 'a tree on no row at all\n' > "$R/chess.jsx"
ck "7g check on an unknown key, with a tree on no row, passes" 0 "$H" check 0f0f0f0f0f0f
printf 'V1 the GATED source\n' > "$R/chess.jsx"
ck "7h check by SOURCE key refuses"           1 "$H" check "$V1"
ck "7i list exits clean"                      0 "$H" list
ck "7j no argument prints usage (exit 2)"     2 "$H"

# 8. THE DOOR'S OWN ENTRY POINT. jobs/build-one-door-for-every-non-gate-check-2026-10-10 lists this check as
#    `gates/held.sh --selftest`; the house pattern names the file. Both must reach the same script, or the
#    one-door entry is a path that does not answer - the orphaned-instrument failure that job exists to end.
#    Run against the FIXTURE copy, so this does not recurse into the real tree.
cp "$HERE/held-selftest.sh" "$R/gates/held-selftest.sh"
eq "8a held.sh selftest reaches this script"   "1" "$(CT_HELD_SELFTEST_NESTED=1 bash "$H" selftest 2>&1 | grep -c 'held.sh self-test')"
eq "8b held.sh --selftest reaches it too"      "1" "$(CT_HELD_SELFTEST_NESTED=1 bash "$H" --selftest 2>&1 | grep -c 'held.sh self-test')"
rm -f "$R/gates/held-selftest.sh"
ck "8c selftest says so when the controls are absent" 2 bash "$H" selftest

printf '\n%s PASS  %s FAIL  (%s assertions over %s inputs to `add`)\n' "$P" "$F" "$((P+F))" "19"
[ "$F" = "0" ] || exit 1
