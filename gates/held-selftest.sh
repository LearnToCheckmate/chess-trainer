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

# ── THE HARNESS PREFLIGHT, THE SAME ONE gates/verify-log-selftest.sh CARRIES [#534, fresh antagonist B's
# P2-1]. That file grew this guard because sixteen assertions there called two helpers defined nowhere in it
# and were silent no-ops while its footer stayed self-consistent. B then measured that the guard shipped in
# ONE selftest of four and reproduced the identical defect HERE by renaming one `eq` call: footer
# self-consistent, exit 0, the assertion simply gone. "A lesson recorded in one gate does not travel", one
# file away, inside the build that wrote the lesson down. KNOW ITS LIMIT: the list is hand-kept, so a helper
# called under a name not on it is still silent - the derivation that would close that is described in
# verify-log-selftest.sh and deliberately not shipped there or here.
for __fn in ck eq gt0 ne; do
  command -v "$__fn" >/dev/null 2>&1 || {
    printf 'FAIL harness: assertion helper %s is CALLED by this file and is NOT CALLABLE here.\n' "$__fn"
    printf '  Every %s call would be a silent no-op (this file does not set -e), so the footer would report\n' "$__fn"
    printf '  a self-consistent pass count with assertions missing from it. Refusing to run.\n'
    exit 1
  }
done
unset __fn

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

# 9. A SHA-ONLY HOLD [#529, jobs/the-held-register-cannot-express-a-harness-only-hold-because-all-three-of-its-keys-identify-an-artefact-2026-10-15].
#    A run that changed only gates/ ships main's own bundle, so its hold can key on the sha alone. The three
#    controls the job asks for: it HOLDS its sha, it does NOT hold a bundle md5 (main's own included), and it
#    is NOT treated as cleared; and the sentinel is exact and is not itself a key. The sha is a fresh commit on
#    main's tree made with commit-tree, so no earlier case's row can be what answers for it.
printf 'MAIN VERSION of chess.jsx\n' > "$R/chess.jsx"
SHA9="$(printf 'case 9: a gates-only change\n' | git -C "$R" commit-tree "$(git -C "$R" rev-parse "$MAINSHA^{tree}")" -p "$MAINSHA")"
ck "9a a sha-only hold is written through add, no field typed by hand" 0 env CT_RUNID=held-selftest "$H" add sha-only "$SHA9" '#920' "$RSN"
eq "9b its field 1 is the sentinel"             "sha-only" "$(tail -1 "$R/gates/held-trees.tsv" | cut -f1)"
eq "9c its field 7 is '-', since its source is main's own" "-" "$(f7)"
ck "9d it HOLDS its sha"                        1 "$H" check "$SHA9"
printf 'a tree on no row at all\n' > "$R/chess.jsx"
ck "9e it does NOT hold main's bundle md5"      0 "$H" check "$(md5sum "$R/app.js" | cut -c1-12)"
ck "9f the sentinel is not itself a key"        0 "$H" check sha-only
eq "9g list shows it once, as a LIVE sha-only row" "1" "$("$H" list 2>&1 | grep -c 'A SHA-ONLY hold')"
ck "9h a near miss of the sentinel is refused as a non-hex md5" 2 env CT_RUNID=held-selftest "$H" add SHA-ONLY "$SHA9" '#921' "$RSN"
printf 'V1 the GATED source\n' > "$R/chess.jsx"

# ---- 10. THE HELD REGISTER IS READ AS THE UNION OF HEAD'S COPY AND THE WORKING TREE'S [#534, HELDWT] ----
# jobs/verify-log-sh-and-held-sh-read-the-held-register-from-the-working-tree-so-one-uncommitted-line-deletion-clears-a-held-refusal-2026-10-22,
# routed from #531's antagonist B. Before the fix `match_rows` read the WORKING TREE file alone, so one
# UNCOMMITTED line deletion answered "not held" at exit 0 on a tree a previous run had refused to ship.
# MEASURED on a clone of 707599b: `held.sh check 81dc0469862c` HELD at exit 1, and with that row deleted and
# not committed, "not held" at exit 0.
# THE FIXTURE NEEDS A COMMITTED ROW, which none of the cases above has - they add rows and leave them in the
# working tree, which is why the union is invisible to all 43 of them and why this section builds its own.
HR="$TD/union"; mkdir -p "$HR/gates"
cp "$HERE/held.sh" "$HR/gates/held.sh"; chmod +x "$HR/gates/held.sh"
HU="$HR/gates/held.sh"; HREG="$HR/gates/held-trees.tsv"
git -C "$HR" init -q 2>/dev/null; git -C "$HR" config user.email s@t; git -C "$HR" config user.name selftest
printf 'SOURCE of the held tree\n' > "$HR/chess.jsx"; printf 'bundle-held\n' > "$HR/app.js"
HSRCMD5="$(printf 'SOURCE of the held tree\n' | md5sum | cut -c1-12)"
{ printf '# held-trees.tsv (union self-test fixture, not the real register)\n'
  printf 'ddddddddddd1\t%s\t#901\t2026-10-23T03:00Z\tbuild__UNIONFIXTURE\ta reason long enough to pass the forty-character floor this file enforces\t%s\n' \
    "1111111111111111111111111111111111111111" "$HSRCMD5"
} > "$HREG"
git -C "$HR" add -A >/dev/null 2>&1; git -C "$HR" commit -qm 'a COMMITTED held row' >/dev/null 2>&1
ck "10 the committed row holds, which is the control"      1 "$HU" check ddddddddddd1
# (a) AN UNCOMMITTED DELETION MAY NOT LIFT IT.
grep -v '^ddddddddddd1' "$HREG" > "$HR/x" && mv "$HR/x" "$HREG"
eq "10a the deletion really is uncommitted and git sees it" "1" "$(git -C "$HR" status --porcelain gates/held-trees.tsv | grep -c '^ M')"
ck "10a an UNCOMMITTED DELETION still holds"               1 "$HU" check ddddddddddd1
# (b) AN UNCOMMITTED '-' CLEAR MAY NOT LIFT IT EITHER - the register's own documented clear convention,
#     which is a different edit from a deletion and reaches a different filter.
git -C "$HR" checkout -- gates/held-trees.tsv
sed -i 's/^ddddddddddd1/-ddddddddddd1/' "$HREG"
ck "10b an UNCOMMITTED '-' clear still holds"              1 "$HU" check ddddddddddd1
# (c) DELETION PLUS assume-unchanged, which is what #531's antagonist B actually used: `git status` then prints
#     NOTHING, so a human reviewing the tree sees a clean checkout and the hold was still lifted.
git -C "$HR" checkout -- gates/held-trees.tsv
grep -v '^ddddddddddd1' "$HREG" > "$HR/x" && mv "$HR/x" "$HREG"
git -C "$HR" update-index --assume-unchanged gates/held-trees.tsv
eq "10c git status prints nothing, which is the point of this case" "0" "$(git -C "$HR" status --porcelain gates/held-trees.tsv | grep -c .)"
ck "10c deletion + assume-unchanged still holds"           1 "$HU" check ddddddddddd1
git -C "$HR" update-index --no-assume-unchanged gates/held-trees.tsv; git -C "$HR" checkout -- gates/held-trees.tsv
# (d) AND THE FIX MUST NOT BREAK THE OTHER DIRECTION: a row `held.sh add` has only just written is NOT YET
#     COMMITTED, and the #450 stand-down writes exactly such a row and then cites it. Reading HEAD alone would
#     have traded one false ACCEPT for another, which is why this is a union and not a HEAD read.
printf 'eeeeeeeeeee2\t%s\t#902\t2026-10-23T03:00Z\tbuild__UNIONFIXTURE\ta reason long enough to pass the forty-character floor this file enforces\t-\n' \
  "2222222222222222222222222222222222222222" >> "$HREG"
ck "10d a row added and NOT committed holds at once"       1 "$HU" check eeeeeeeeeee2
git -C "$HR" checkout -- gates/held-trees.tsv
# (e) THE SOURCE KEY, which is the one key that survives a rebuild, must also survive an uncommitted deletion.
printf 'a tree whose bundle is on no row\n' > "$HR/app.js"
ck "10e the source key holds on the committed row"         1 "$HU" check zzzzzzzzzzzz
grep -v '^ddddddddddd1' "$HREG" > "$HR/x" && mv "$HR/x" "$HREG"
ck "10e a SOURCE-key hold survives an uncommitted deletion" 1 "$HU" check zzzzzzzzzzzz
git -C "$HR" checkout -- gates/held-trees.tsv; printf 'bundle-held\n' > "$HR/app.js"
# (f) THE SOURCE IS NAMED IN THE OUTPUT, so a reader of an archived answer can tell a two-source read from a
#     one-source read rather than having to re-run the tool.
# THE FIXTURE MUST MATCH NOTHING FOR THIS CASE, AND MY FIRST DRAFT DID NOT [R18]: the committed row carries a
# sourceMd5 equal to this fixture's chess.jsx, so `check` hit the SOURCE key, printed "HELD BY SOURCE" and
# exited 1 without ever reaching the not-held line, and the case read `absent` on correct behaviour. The
# control was wrong, not the code - the same shape as the hanging mutant two jobs earlier.
printf 'a source on no row at all\n' > "$HR/chess.jsx"
gt0 "10f the not-held line names its source" "$("$HU" check 0123456789ab 2>&1 | grep -c 'source: HEAD and the working tree')"
printf 'SOURCE of the held tree\n' > "$HR/chess.jsx"
# ---- THE MUTANT: the working-tree-only read restored, which is held.sh as 707599b had it. ----
# Built by swapping the two filter lines WHOLE from a literal heredoc, not by editing the variable name in
# place: that is the habit #534's NUL mutant learned the hard way, where deleting part of a pipeline left grep
# reading stdin and the mutant HUNG. A mutant must be the old code, running.
cat > "$TD/filters.old" <<'FILTOLD'
match_rows() { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=2 && $1 !~ /^-/'; }
live_rows()  { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=6 && $1 !~ /^-/'; }
FILTOLD
awk -v f="$TD/filters.old" '
  /^match_rows\(\) \{ grep -v .\^\[\[:space:\]\]\*#. "\$REGALL"/ { while((getline l < f)>0) print l; close(f); next }
  /^live_rows\(\)  \{ grep -v .\^\[\[:space:\]\]\*#. "\$REGALL"/ { next }
  { print }' "$HU" > "$HR/gates/mutant.sh"; chmod +x "$HR/gates/mutant.sh"
MU="$HR/gates/mutant.sh"
# COUNT THE TWO FILTER LINES, NOT EVERY MENTION [R18]. My first draft counted `"$REG" | awk` across the whole
# file and measured 4 against an expected 2, because held.sh's `list` subcommand reads the working-tree register
# twice more to display CLEARED rows - a display path this fix deliberately leaves alone, since a cleared row is
# shown and not enforced. Anchoring on the two function definitions is the assertion that was meant.
eq "10 MUTANT both filters were swapped back to \$REG" "2 0" \
   "$(grep -cE '^(match_rows|live_rows)\(\) +\{ grep -v .\^\[\[:space:\]\]\*#. "\$REG"' "$MU") $(grep -cE '^(match_rows|live_rows)\(\) +\{ grep -v .\^\[\[:space:\]\]\*#. "\$REGALL"' "$MU")"
eq "10 MUTANT parses" "yes" "$(bash -n "$MU" 2>/dev/null && echo yes || echo no)"
ck "10 MUTANT the committed row still holds on a clean tree" 1 "$MU" check ddddddddddd1
grep -v '^ddddddddddd1' "$HREG" > "$HR/x" && mv "$HR/x" "$HREG"
ck "10 MUTANT an uncommitted deletion LIFTS the hold - the defect" 0 timeout 20 "$MU" check ddddddddddd1
ck "10 FIX the same tree still holds"                      1 "$HU" check ddddddddddd1
git -C "$HR" checkout -- gates/held-trees.tsv


# ── 11. THE WHOLE FILE DELETED, NOT ONE LINE OF IT [#534, fresh antagonist B's VETO, upheld]. ────────────
# Section 10 proves an uncommitted LINE deletion cannot lift a hold. It does not cover the FILE, and the file
# was the hole: `held.sh` refused to answer at all (`exit 2`, "no register") before HEAD was ever consulted,
# while HEAD's copy carried every live row - so the question the build procedure is REQUIRED to ask had no
# answerer, and `verify-log.sh` in the same state answered OK at exit 0. Two tools disagreeing about one
# register in opposite directions is what this file records as #450's worst shape.
# THREE SPELLINGS OF ONE EDIT, because `[ -f ]` is false for all three and a fix keyed on only `rm` would
# miss the other two: delete it, replace it with a DIRECTORY, symlink it to /dev/null.
# AND BOTH DIRECTIONS, because a guard that refuses everything is not a fix: a key that is genuinely not held
# must still CLEAR at exit 0 with the file gone, and a verb that WRITES the register must still refuse.
echo "-- 11. the register file itself deleted, replaced, or symlinked away --"
ck "11a the committed row holds on a clean tree (control)"       1 "$HU" check ddddddddddd1
mv "$HREG" "$TD/reg.saved"
ck "11b the FILE deleted and not committed: STILL HELD"          1 timeout 20 "$HU" check ddddddddddd1
gt0 "11c and the source line says HEAD ONLY" "$(timeout 20 "$HU" check ddddddddddd1 2>&1 | grep -c 'HEAD ONLY')"
# THE SOURCE KEY HAD TO BE NEUTRALISED FIRST, AND MY FIRST DRAFT OF THIS CASE DID NOT [R18]. held.sh falls
# back to matching chess.jsx's md5 against each row's sourceMd5 when the two artefact keys miss, and section
# 10 leaves the fixture's chess.jsx set to the HELD source - so this case read HELD on correct behaviour and
# I nearly filed a false refusal against my own fix. That is section 10's own recorded control error ("the
# fixture's source key always matched") repeating one section later: "a lesson recorded in one gate does not
# travel", INSIDE ONE FILE. Measured, not assumed: with chess.jsx on no row the same call exits 0.
printf 'a source on no row at all\n' > "$HR/chess.jsx"
ck "11d a key that is genuinely NOT held still CLEARS"           0 timeout 20 "$HU" check 0123456789ab
printf 'SOURCE of the held tree\n' > "$HR/chess.jsx"
ck "11e a WRITING verb still refuses, because it needs the file" 2 timeout 20 "$HU" add eeeeeeeeeee1 abc1234 '#900' 2026-10-23T00:00Z run x
mkdir "$HREG"
ck "11f replaced by a DIRECTORY: STILL HELD"                     1 timeout 20 "$HU" check ddddddddddd1
rmdir "$HREG"
ln -s /dev/null "$HREG"
ck "11g SYMLINKED to /dev/null: STILL HELD"                      1 timeout 20 "$HU" check ddddddddddd1
rm -f "$HREG"
cp "$TD/reg.saved" "$HREG"
ck "11h restored: still held (control, so 11b-11g are not a stuck refusal)" 1 "$HU" check ddddddddddd1
# ---- THE MUTANT: the early `exit 2` guard restored, which is held.sh before this repair. ----
# Swapped WHOLE from a heredoc rather than edited in place, and `timeout` on every call, because #534's NUL
# mutant hung when a part-deleted pipeline left grep reading stdin.
cat > "$TD/guard.old" <<'GUARDOLD'
[ -f "$REG" ] || { echo "held.sh: no register at $REG"; exit 2; }
GUARDOLD
awk -v f="$TD/guard.old" '
  /^HELD_REGOK=0; \{ \[ -f "\$REG" \] && \[ -r "\$REG" \]; \} && HELD_REGOK=1/ {
    while((getline l < f)>0) print l; close(f); next }
  { print }' "$HU" > "$HR/gates/mutant11.sh"; chmod +x "$HR/gates/mutant11.sh"
MU11="$HR/gates/mutant11.sh"
eq "11 MUTANT the early guard really was put back" "1 0" \
   "$(grep -c 'held.sh: no register at' "$MU11") $(grep -c '^HELD_REGOK=0;' "$MU11")"
eq "11 MUTANT parses" "yes" "$(bash -n "$MU11" 2>/dev/null && echo yes || echo no)"
ck "11 MUTANT holds on a clean tree, as the fix does" 1 timeout 20 "$MU11" check ddddddddddd1
mv "$HREG" "$TD/reg.saved2"
ck "11 MUTANT refuses to ANSWER once the file is gone - the defect" 2 timeout 20 "$MU11" check ddddddddddd1
ck "11 FIX answers HELD in that same state"                         1 timeout 20 "$HU" check ddddddddddd1
cp "$TD/reg.saved2" "$HREG"
git -C "$HR" checkout -- gates/held-trees.tsv

printf '\n%s PASS  %s FAIL  (%s assertions over %s inputs to `add`)\n' "$P" "$F" "$((P+F))" "21"
[ "$F" = "0" ] || exit 1
