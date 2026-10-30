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
ck "9f the sentinel is not itself a key"        2 "$H" check sha-only   # exit 2 since #545 (B finding 2): a non-hex key is a usage error, which says the same thing more loudly
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
ck "10e the source key holds on the committed row"         1 "$HU" check 0f0f0f0f0f0f   # a well-formed key on no row since #545 (B finding 2): the hold comes from the SOURCE key
grep -v '^ddddddddddd1' "$HREG" > "$HR/x" && mv "$HR/x" "$HREG"
ck "10e a SOURCE-key hold survives an uncommitted deletion" 1 "$HU" check 0f0f0f0f0f0f
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

# ---- 12. THE NO-KEY FORM ASKS EVERY KEY A LIVE ROW CAN CARRY [#537, HELDKEY] --------------------------------
# jobs/held-sh-check-in-the-form-claude-md-prescribes-asks-one-key-so-the-three-sha-only-holds-can-never-match-2026-10-23
# THE DEFECT: `check` with NO key - the form CLAUDE.md prescribes before a push - computed ONE key, the md5 of
# app.js. A SHA-ONLY row carries the literal "sha-only" in field 1 (which the matcher skips as a bundle key,
# #529) and a git sha in field 2, and an md5 never equals a git sha, so those rows were unreachable from the
# default form in ANY tree. Sha-only is the sanctioned form for a harness-only hold, which is what most gate
# runs now are, so the class the prescribed check could not see was the NORMAL class.
# MEASURED on main ed65bab in a scratch clone at 6fcbca5 (#523's own held tree): the no-key form printed
# "using app.js on disk -> md5 ec31de9fe6c5" and "not held" AT EXIT 0, while `check "$(git rev-parse HEAD)"`
# read HELD for row #523 at exit 1. Same tree, same register, opposite verdicts.
# THE FIXTURE COMMITS FIRST AND THEN ADDS THE ROW, which is not a trick but exactly how a real hold is written:
# `held.sh add sha-only <launch head>` writes a row naming the sha that is already HEAD, and the run then checks
# before pushing. The row therefore lives in the WORKING TREE and is live by the union rule section 10 pinned.
KR="$TD/keys"; mkdir -p "$KR/gates"
cp "$HERE/held.sh" "$KR/gates/held.sh"; chmod +x "$KR/gates/held.sh"
KU="$KR/gates/held.sh"; KREG="$KR/gates/held-trees.tsv"
git -C "$KR" init -q 2>/dev/null; git -C "$KR" config user.email s@t; git -C "$KR" config user.name selftest
printf 'KEYS fixture source, on no row\n' > "$KR/chess.jsx"; printf 'KEYS fixture bundle, on no row\n' > "$KR/app.js"
printf '# held-trees.tsv (key-coverage self-test fixture, not the real register)\n' > "$KREG"
git -C "$KR" add -A >/dev/null 2>&1; git -C "$KR" commit -qm 'the tree that will be held sha-only' >/dev/null 2>&1
KSHA="$(git -C "$KR" rev-parse HEAD)"
KAPP="$(md5sum "$KR/app.js" | cut -c1-12)"; KSRC="$(md5sum "$KR/chess.jsx" | cut -c1-12)"
# THE CONTROL FIRST: with no row naming anything here, the default must CLEAR. Without this the refusals below
# could be a stuck refusal rather than a hold - section 11h records that exact lesson one section up.
ck "12 control: a tree no live row names CLEARS at exit 0"        0 timeout 20 "$KU" check
eq "12 control: and it says how many keys it asked, not one" "1" \
   "$( timeout 20 "$KU" check 2>/dev/null | grep -c 'asked: git rev-parse HEAD' )"
eq "12 control: it asks all four keys by name" "4" \
   "$( timeout 20 "$KU" check 2>/dev/null | grep -c '^  asked: ' )"
# (a) A SHA-ONLY ROW NAMING THIS TREE'S HEAD. This is the case the job exists for.
printf 'sha-only\t%s\t#902\t2026-10-23T04:00Z\tbuild__KEYFIXTURE\ta sha-only hold, the sanctioned form for a harness-only build, long enough for the floor\t-\n' "$KSHA" >> "$KREG"
ck "12a a SHA-ONLY row naming HEAD now REFUSES the no-key form"   1 timeout 20 "$KU" check
eq "12a and it names the row it matched"                    "1 1" \
   "$( timeout 20 "$KU" check 2>&1 | grep -c '#902' ) $( timeout 20 "$KU" check 2>&1 | grep -c 'build__KEYFIXTURE' )"
eq "12a and it says WHICH key matched, which with four in play is the first thing a reader needs" "1" \
   "$( timeout 20 "$KU" check 2>&1 | grep -c 'the key that matched: git rev-parse HEAD' )"
# AND THE ONE-KEY FORM MUST BE UNCHANGED: it already saw this row and must still see it, and it must still
# answer the same way for a key that is on no row.
ck "12a the one-key form still sees it (unchanged behaviour)"     1 timeout 20 "$KU" check "$KSHA"
ck "12a the one-key form still clears a key on no row"            0 timeout 20 "$KU" check 0123456789ab
# (b) A ROW WHOSE ONLY LIVE KEY IS THE SOURCE KEY. Field 7 is chess.jsx's md5; fields 1 and 2 name nothing here.
git -C "$KR" checkout -- gates/held-trees.tsv
printf 'sha-only\t%s\t#903\t2026-10-23T04:10Z\tbuild__KEYFIXTURE2\ta source-keyed hold whose artefact keys match nothing in this tree, long enough for the floor\t%s\n' \
  "9999999999999999999999999999999999999999" "$KSRC" >> "$KREG"
ck "12b a row live only by its SOURCE key also refuses the no-key form" 1 timeout 20 "$KU" check
# THE NEEDLE IS THE HEADLINE, NOT THE PARENTHETICAL IT REPLACED [#537 repair, antagonist B F4]. The verdict
# used to print "HELD BY SOURCE: chess.jsx on disk is md5 $SRC" as a LITERAL with the true key named only in a
# parenthetical above it, so the line a reader quotes named the wrong file whenever the match came from
# chess.jsx AT HEAD. Asserting the headline names the key is strictly stronger than asserting the aside exists.
eq "12b and the HEADLINE names which source key matched" "1" \
   "$( timeout 20 "$KU" check 2>&1 | grep -c '^HELD BY SOURCE: chess.jsx on disk is md5 ' )"
# (c) chess.jsx AT HEAD, which is the key the working tree cannot supply once the file has moved on. This is the
#     tree whose checkout has been edited but whose COMMIT is the held source - the default asks HEAD too, and
#     the named form deliberately does NOT, because adding a key there would change that form's verdicts.
printf 'the working copy has moved on since the commit\n' > "$KR/chess.jsx"
eq "12c chess.jsx on disk is now a DIFFERENT md5 from the one on the row" "differs" \
   "$( [ "$(md5sum "$KR/chess.jsx" | cut -c1-12)" != "$KSRC" ] && echo differs || echo same )"
ck "12c the no-key form still refuses, on chess.jsx AT HEAD"      1 timeout 20 "$KU" check
# COUNTS THE VERDICT LINE, NOT EVERY MENTION. My first draft grepped for 'chess.jsx at HEAD' and measured 2,
# because the key is named once in the "asked:" list and once in the verdict - the assertion was wrong, not the
# message, which is section 29-of-buildnum's recorded lesson about needles that count incidental mentions.
# AND THIS IS THE CASE F4 WAS ABOUT: the match comes from chess.jsx AT HEAD, so a headline hard-coded to "on
# disk" printed a file whose md5 was not the number beside it. The md5 is pinned too, because naming the right
# file with the wrong number would satisfy a name-only needle.
eq "12c and the HEADLINE names chess.jsx at HEAD, with the matching md5" "1" \
   "$( timeout 20 "$KU" check 2>&1 | grep -c "^HELD BY SOURCE: chess.jsx at HEAD is md5 $KSRC," )"
git -C "$KR" checkout -- chess.jsx
# (d) OUTSIDE A GIT WORK TREE THE MISSING KEYS ARE REPORTED, NEVER CREDITED. This file's own HELD_HEADREG block
#     records that rule from #534's third-round antagonist A, and a default that silently dropped two of its
#     four keys would be the same defect one level up.
KN="$TD/nogit"; mkdir -p "$KN/gates"; cp "$HERE/held.sh" "$KN/gates/held.sh"; chmod +x "$KN/gates/held.sh"
printf 'x\n' > "$KN/app.js"; printf 'y\n' > "$KN/chess.jsx"
printf '# held-trees.tsv (no-git fixture)\n' > "$KN/gates/held-trees.tsv"
eq "12d outside a work tree it SAYS it could not ask HEAD" "1" \
   "$( cd "$KN" && timeout 20 ./gates/held.sh check 2>&1 | grep -c 'could NOT ask: git rev-parse HEAD' )"
# AND IT REFUSES RATHER THAN CLEARING, WHICH IS WHAT THE PARAGRAPH ABOVE ALWAYS SAID AND THIS ASSERTION USED
# TO CONTRADICT [#537 repair, antagonist A F6]. It read `0` here - "it still answers rather than dying" - and
# exit 0 from this tool IS the credit: "not held" is what a run reads before a push. So the one case in this
# file written to prove a missing key is never credited asserted that it was, and the assertion and the
# comment three lines above it disagreed for a whole build. Outside a work tree HEAD's sha cannot be asked, so
# the honest answer is UNKNOWN at exit 2 - it still ANSWERS (it does not die, and the message names what it
# could not ask), and it does not pretend the question was put.
ck "12d and it refuses to call that a 'not held' (UNKNOWN, exit 2)"  2 timeout 20 "$KN/gates/held.sh" check
eq "12d and the UNKNOWN names the key it could not ask" "1" \
   "$( cd "$KN" && timeout 20 ./gates/held.sh check 2>&1 | grep -c "^UNKNOWN: .*could NOT be asked" )"
# AND ITS OWN ARITHMETIC MUST ADD TO FOUR, which is the assertion that was missing and the reason a silent drop
# survived. Asserting the LINE EXISTS is what the first version of this case did, and the line existed while
# reading "2 key(s) this run could ask, and 1 key(s) could NOT be asked" - three of the four keys CLAUDE.md
# promises, because outside a work tree the chess.jsx-at-HEAD key was neither asked nor reported. A fixture that
# greps for a line encodes the same assumption as the code it tests. Found by antagonist A, #537.
eq "12d and the two numbers in that verdict SUM TO FOUR, the number of keys this form claims" "4" \
   "$( cd "$KN" && V="$( timeout 20 ./gates/held.sh check 2>&1 | grep '^UNKNOWN: ' )"
      NA="$( printf '%s' "$V" | sed -n 's/.*any of the \([0-9]*\) key(s) this run could ask.*/\1/p' )"
      NB="$( printf '%s' "$V" | sed -n 's/.*and \([0-9]*\) key(s) could NOT be asked.*/\1/p' )"
      if [ -n "$NA" ] && [ -n "$NB" ]; then echo $((NA+NB)); else echo "unparsed"; fi )"
# ---- THE MUTANT: the HEAD sha dropped from the no-key form, which is held.sh as ed65bab had it. ----
# Swapped WHOLE from a heredoc, and every call under `timeout`, for the reason #534's NUL mutant recorded: a
# mutant assembled by deleting part of a construct can leave a command reading stdin and hang, and a mutant
# that hangs proves nothing. A mutant must be THE OLD CODE, RUNNING.
git -C "$KR" checkout -- gates/held-trees.tsv
printf 'sha-only\t%s\t#902\t2026-10-23T04:00Z\tbuild__KEYFIXTURE\ta sha-only hold, the sanctioned form for a harness-only build, long enough for the floor\t-\n' "$KSHA" >> "$KREG"
# THE MUTANT DROPS THE KEY SILENTLY, BECAUSE THAT IS WHAT ed65bab DID. An earlier version of this heredoc
# pushed a HELD_MISSED entry instead, which looks equivalent and is not: after the #537 repair a non-empty
# HELD_MISSED is itself a refusal (exit 2), so the mutant stopped reaching the exit-0 "not held" that is the
# defect this section exists to turn, and the turn below went red against a mutant that was never ed65bab's
# code. A mutant must be THE OLD CODE, RUNNING - and "the old code" includes what it did NOT do.
cat > "$TD/keys.old" <<'KEYSOLD'
        : # the HEAD-sha key is DROPPED BY THE MUTANT, silently, exactly as ed65bab dropped it
KEYSOLD
# skip=2, NOT 3, AND THE DIFFERENCE IS A WHOLE BRANCH. The three lines after the match are the `if [ -n "$HH" ]`
# arm, its `else HELD_MISSED+=(...)` arm, and then the OUTER `else`. Skipping three swallowed that `else`, so the
# mutant ran the outer else's body - HELD_MISSED+=("...not a git work tree...") - INSIDE the then-branch, and
# reported a key it could not ask while standing in a git work tree. That was invisible for a whole build because
# HELD_MISSED had no effect on the exit status; the #537 repair gave it one, and the turn below went red against a
# mutant that was not ed65bab's code. A mutant assembled by LINE COUNT has to assert its own shape, which is what
# the premise assertion below now does.
awk -v f="$TD/keys.old" '
  /^        HH="\$\("\$\{HELD_GIT\[@\]\}" rev-parse HEAD 2>\/dev\/null \|\| true\)"/ { skip=2
    while((getline l < f)>0) print l; close(f); next }
  skip > 0 { skip--; next }
  { print }' "$KU" > "$KR/gates/mutant12.sh"; chmod +x "$KR/gates/mutant12.sh"
MU12="$KR/gates/mutant12.sh"
eq "12 MUTANT the HEAD-sha key really was dropped, and only it" "0 1" \
   "$(grep -c 'rev-parse HEAD 2>/dev/null' "$MU12") $(grep -c 'DROPPED BY THE MUTANT' "$MU12")"
eq "12 MUTANT is a different script from the fix" "differs" \
   "$( [ "$(md5sum < "$KU")" != "$(md5sum < "$MU12")" ] && echo differs || echo identical )"
eq "12 MUTANT parses" "yes" "$(bash -n "$MU12" 2>/dev/null && echo yes || echo no)"
# AND THE DROP IS SILENT, WHICH IS THE PREMISE OF THE TURN. ed65bab did not know the HEAD sha was a key, so it
# said nothing about one; a mutant that REPORTS a key it could not ask is refused by the repair for that reason
# instead of clearing the hold, and the turn would then pass for the wrong reason - red where the defect is not.
# Asserted, not assumed: three keys asked, no "could NOT ask" line, inside a real work tree.
eq "12 MUTANT drops the key SILENTLY, as ed65bab did (3 keys asked, nothing reported missing)" "3 0" \
   "$( cd "$KR" && printf '%s %s' "$( timeout 20 "$MU12" check 2>&1 | grep -c '^  asked: ' )" "$( timeout 20 "$MU12" check 2>&1 | grep -c 'could NOT ask' )" )"
# THE TURN. This is the assertion the whole section exists for.
ck "12 MUTANT reads the sha-only hold as NOT HELD at exit 0 - the defect" 0 timeout 20 "$MU12" check
ck "12 FIX refuses that same tree, same register"                        1 timeout 20 "$KU" check
# AND THE MUTANT AGREES WITH THE FIX WHEREVER THE HOLD IS NOT SHA-ONLY, which is why none of the 71 assertions
# already in this file could see it: every one of them either names its key or holds by a bundle md5.
eq "12 MUTANT and FIX agree on the one-key form" "SAME" \
   "$( timeout 20 "$MU12" check "$KSHA" >/dev/null 2>&1; A=$?; timeout 20 "$KU" check "$KSHA" >/dev/null 2>&1; B=$?; [ "$A" = "$B" ] && echo SAME || echo DIFFER )"
git -C "$KR" checkout -- gates/held-trees.tsv

# ── 13. A KEY IT COULD NOT ASK IS NEVER CREDITED, AND THE EXIT STATUS IS WHERE THE CREDIT HAPPENS ──────────
# THE DEFECT, and it is one this build introduced and its own antagonist caught: widening the no-key form from
# one key to four made `check` fall through to "not held" AT EXIT 0 whenever SOME key could be computed, even
# with app.js - the bundle key, the only key the one-key default ever asked - unreadable. ed65bab exits 2 in
# that state ("cannot read app.js and no key given"), so the pre-push check went from "I cannot tell" to "this
# tree is clear" as a direct result of asking MORE keys. The miss was printed on stdout the whole time; what
# credited it was $?, which is what a run reads. Same shape as #450: every key that WAS asked answered
# honestly, and the exit status answered a question nobody had put.
KM="$TD/missing"; mkdir -p "$KM/gates"
cp "$HERE/held.sh" "$KM/gates/held.sh"; chmod +x "$KM/gates/held.sh"
git -C "$KM" init -q 2>/dev/null; git -C "$KM" config user.email s@t; git -C "$KM" config user.name selftest
printf 'MISSING fixture source\n' > "$KM/chess.jsx"; printf 'MISSING fixture bundle\n' > "$KM/app.js"
printf '# held-trees.tsv (missing-key self-test fixture, not the real register)\n' > "$KM/gates/held-trees.tsv"
git -C "$KM" add -A >/dev/null 2>&1; git -C "$KM" commit -qm 'the tree whose bundle goes missing' >/dev/null 2>&1
MU="$KM/gates/held.sh"
# THE CONTROL COMES FIRST, and it is the one that matters most: a guard that fires on the NORMAL case gets
# switched off. With all four keys askable and no row naming any of them, this must still CLEAR at exit 0.
ck "13 control: all four keys askable and no row names them - CLEARS at exit 0" 0 timeout 20 "$MU" check
eq "13 control: and all four really were asked" "4" \
   "$( cd "$KM" && timeout 20 "$MU" check 2>/dev/null | grep -c '^  asked: ' )"
# NOW TAKE THE BUNDLE AWAY. app.js is the key CLAUDE.md's one-argument-free form was built on.
mv "$KM/app.js" "$KM/app.js.aside"
ck "13 app.js unreadable: this is UNKNOWN (exit 2), NOT 'not held'" 2 timeout 20 "$MU" check
eq "13 and the verdict line says so in its first word" "1" \
   "$( cd "$KM" && timeout 20 "$MU" check 2>&1 | grep -c '^UNKNOWN: ' )"
# BOTH NEEDLES ARE SCOPED TO THE LINE THEY MEAN, and my first draft of neither was. The key is named TWICE on
# purpose - once in the collection block's "could NOT ask:" list and once in the UNKNOWN verdict, which has to
# be self-contained because it is the line a reader greps - so a bare count measured 2 and the assertion was
# wrong rather than the output. The second needle is the same mistake pointed the other way: the UNKNOWN text
# contains the phrase "not held" INSIDE its own explanation ("this is NOT a 'not held'"), so what must be
# absent is the VERDICT line, which is the one that starts with it. This is 12c's recorded lesson about
# needles that count incidental mentions, found twice more in one section.
eq "13 and the UNKNOWN verdict names the key it could not ask, and says how many it could" "1 1" \
   "$( cd "$KM" && printf '%s %s' "$( timeout 20 "$MU" check 2>&1 | grep -c '^    app.js on disk (cannot read' )" "$( timeout 20 "$MU" check 2>&1 | grep -c 'key(s) this run could ask' )" )"
eq "13 and NO 'not held:' VERDICT LINE is printed - that is where the credit would be" "0" \
   "$( cd "$KM" && timeout 20 "$MU" check 2>&1 | grep -c '^not held: ' )"
# AND IT STILL FINDS A REAL HOLD WITH THE SAME KEY MISSING. The repair must refuse a CLEAR, not swallow a
# REFUSAL: a tree that is genuinely held has to read HELD (exit 1) even with app.js gone, or the guard has
# made the tool useless in the one state it was written for.
MSHA="$( git -C "$KM" rev-parse HEAD )"
printf 'sha-only\t%s\t#904\t2026-10-24T00:30Z\tbuild__MISSINGFIXTURE\ta sha-only hold on the tree whose bundle cannot be read, long enough for the floor\t-\n' "$MSHA" >> "$KM/gates/held-trees.tsv"
ck "13 a real hold is still HELD (exit 1) with app.js still unreadable" 1 timeout 20 "$MU" check
eq "13 and HELD outranks the missing key - the row is named, not the miss" "1" \
   "$( cd "$KM" && timeout 20 "$MU" check 2>&1 | grep -c 'build__MISSINGFIXTURE' )"
git -C "$KM" checkout -- gates/held-trees.tsv 2>/dev/null || printf '# held-trees.tsv (missing-key self-test fixture, not the real register)\n' > "$KM/gates/held-trees.tsv"
# ---- THE MUTANT: the guard removed, which is this build's own first commit. ----
python3 -I -c "
import sys
p='$KM/gates/mutant13.sh'; src=open('$MU').read()
old='    if [ \"\${#HELD_MISSED[@]}\" -gt 0 ]; then'
assert src.count(old)==1, src.count(old)
i=src.index(old); j=src.index('    fi\n', i)+len('    fi\n')
open(p,'w').write(src[:i] + '    : # THE GUARD REMOVED BY THE MUTANT\n' + src[j:])
"
chmod +x "$KM/gates/mutant13.sh"; MM="$KM/gates/mutant13.sh"
eq "13 MUTANT the guard really was removed, and only it" "0 1" \
   "$( printf '%s %s' "$( grep -c 'UNKNOWN: no live row matches any of' "$MM" )" "$( grep -c 'THE GUARD REMOVED BY THE MUTANT' "$MM" )" )"
eq "13 MUTANT parses" "yes" "$( bash -n "$MM" 2>/dev/null && echo yes || echo no )"
# THE TURN. The mutant must answer "not held" at exit 0 over a tree whose bundle key it could not compute -
# a FAIL-OPEN in the one check CLAUDE.md prescribes before a push.
ck "13 MUTANT answers 'not held' at exit 0 with the bundle key unaskable - the defect" 0 timeout 20 "$MM" check
eq "13 MUTANT and it even reports the miss while clearing the tree" "1 1" \
   "$( cd "$KM" && printf '%s %s' "$( timeout 20 "$MM" check 2>&1 | grep -c 'could NOT ask: app.js' )" "$( timeout 20 "$MM" check 2>&1 | grep -c '^not held: ' )" )"
mv "$KM/app.js.aside" "$KM/app.js"
# ---- 13d: chess.jsx is a DIRECTORY [#546, antagonist B's F1]. `[ -r ]` is true for a directory, so held.sh asked an
# EMPTY source key, counted it as asked, and CLEARED the tree at exit 0. A key it could not compute is exit 2.
mv "$KM/chess.jsx" "$KM/chess.jsx.aside"; mkdir "$KM/chess.jsx"
ck "13d chess.jsx a DIRECTORY: UNKNOWN (exit 2), never a clearance" 2 timeout 20 "$MU" check
eq "13d and NO 'not held:' verdict line is printed" "0" "$( cd "$KM" && timeout 20 "$MU" check 2>&1 | grep -c '^not held: ' )"
# 13e: THE NAMED FORM keeps its exit code by design (#537), so its NOTE must not claim a source key it never asked
# [#546, fresh antagonist B's V1: it said "plus chess.jsx on disk" with chess.jsx a directory].
eq "13e the named form with chess.jsx a DIRECTORY says the key was NOT asked" "1 0" \
   "$( cd "$KM" && printf '%s %s' "$( timeout 20 "$MU" check abcdef012345 2>&1 | grep -c 'could NOT be read here, so it was not asked' )" "$( timeout 20 "$MU" check abcdef012345 2>&1 | grep -c 'plus chess.jsx on disk' )" )"
rmdir "$KM/chess.jsx"; mv "$KM/chess.jsx.aside" "$KM/chess.jsx"
# 13f: A ROW THIS TOOL CANNOT READ IS NOT A CLEARANCE [#546, fresh antagonist B's V2]. A row written with spaces, or
# with a 32-hex md5 in field 1, was silently skipped - committing #441's row with spaces lifted its hold.
cp "$KM/gates/held-trees.tsv" "$KM/gates/held-trees.tsv.keep"
printf '%s    -    #905    2026-10-30T00:00Z    build__F    a row written with spaces    -\n' "abcdef012345" >> "$KM/gates/held-trees.tsv"
ck "13f a row written with SPACES is UNKNOWN (exit 2), never a clearance" 2 timeout 20 "$MU" check
ck "13f and the named form too" 2 timeout 20 "$MU" check abcdef012345
cp "$KM/gates/held-trees.tsv.keep" "$KM/gates/held-trees.tsv"
printf 'abcdef0123456789abcdef0123456789\t-\t#906\t2026-10-30T00:00Z\tbuild__F\ta 32-hex md5 in field 1\t-\n' >> "$KM/gates/held-trees.tsv"
ck "13f a 32-hex md5 in field 1 is UNKNOWN (exit 2)" 2 timeout 20 "$MU" check
cp "$KM/gates/held-trees.tsv.keep" "$KM/gates/held-trees.tsv"; rm -f "$KM/gates/held-trees.tsv.keep"
ck "13f control: the restored register clears the clean tree again" 0 timeout 20 "$MU" check
# 13g: A SHORT PREFIX OF A HELD BUNDLE IS HELD [#546, fresh antagonist B F1]: a4df39c38222 read 1 and a4df39c read 0.
printf 'abcdef012345\t-\t#907\t2026-10-30T00:00Z\tbuild__F\ta held bundle, for the short-prefix arm, long enough for the floor\t-\n' >> "$KM/gates/held-trees.tsv"
ck "13g the full 12-hex key reads HELD" 1 timeout 20 "$MU" check abcdef012345
ck "13g a 7-hex prefix of it reads HELD too, not a clearance" 1 timeout 20 "$MU" check abcdef0
ck "13g an unrelated 7-hex key still clears" 0 timeout 20 "$MU" check 1234567
sed -i '/#907/d' "$KM/gates/held-trees.tsv"
# 13h: AN 8-HEX BUNDLE ROW, WHICH `add` ACCEPTS, IS A READABLE ROW [#546, third-round antagonist B F3]. The 13f guard first
# required exactly 12 hex, so one legal `add deadbeef ...` made every later check answer UNKNOWN.
printf 'deadbeef\t-\t#908\t2026-10-30T00:00Z\tbuild__F\tan 8-hex bundle row as add writes one, long enough for the floor\t-\n' >> "$KM/gates/held-trees.tsv"
ck "13h an 8-hex row does not block a clean tree (exit 0, not 2)" 0 timeout 20 "$MU" check
ck "13h and its own key still reads HELD" 1 timeout 20 "$MU" check deadbeef
sed -i '/#908/d' "$KM/gates/held-trees.tsv"
# 13i: EVERY KEY FIELD OF A LIVE ROW IS VALIDATED, NOT ONLY FIELD 1 [#546, third-round antagonist A V2]: a sha-only row's only
# key is field 2, and a quoted sha there cleared at exit 0.
for BADROW in 'sha-only\t"abcdef0123456789abcdef0123456789abcdef01"\t#909\t2026-10-30T00:00Z\tbuild__F\ta quoted sha, long enough for the floor\t-' \
              'sha-only\tabcdef0 1234567\t#909\t2026-10-30T00:00Z\tbuild__F\ta space-separated sha list, long enough for the floor\t-' \
              'abcdef012345\t-\t#909\t2026-10-30T00:00Z\tbuild__F\ta 32-hex source md5 in field 7, long enough\tabcdef0123456789abcdef0123456789'; do
  printf "$BADROW\n" >> "$KM/gates/held-trees.tsv"
  ck "13i a live row with a malformed key field is UNKNOWN (exit 2): $(printf "$BADROW" | cut -f2 | cut -c1-24)" 2 timeout 20 "$MU" check
  sed -i '/#909/d' "$KM/gates/held-trees.tsv"
done
ck "13i a LIVE field 7 with a note after its key is UNKNOWN (exit 2): the matcher would glue the note on and read nothing" 2 sh -c 'printf "abcdef012345\t-\t#910\t2026-10-30T00:00Z\tbuild__F\ta held bundle whose field 7 carries a note, long enough\t55288417624a ||| CLEARED AT #999\n" >> "$1/gates/held-trees.tsv"; cd "$1" && timeout 20 "$2" check 1234567 >/dev/null; r=$?; sed -i "/#910/d" "$1/gates/held-trees.tsv"; exit $r' _ "$KM" "$MU"
ck "13i control: the same note on a RETIRED row is still readable (a retired row matches nothing)" 0 sh -c 'printf -- "-abcdef012345\t-\t#911\t2026-10-30T00:00Z\tbuild__F\ta retired row whose field 7 carries a note, long enough\t55288417624a ||| CLEARED AT #999\n" >> "$1/gates/held-trees.tsv"; cd "$1" && timeout 20 "$2" check 1234567 >/dev/null; r=$?; sed -i "/#911/d" "$1/gates/held-trees.tsv"; exit $r' _ "$KM" "$MU"
# 13j: THE WRITER REFUSES WHAT THE CHECKER REFUSES [#546, fourth-round A V1], and a working copy with no final newline
# is read as its rows, not glued onto HEAD's first line [fourth-round A F1].
for BADSHA in "abc1234," ",abc1234" "abc1234,,def5678" "abc1234 def5678" "$(printf 'a%.0s' $(seq 41))"; do
  ck "13j add refuses sha list '$(printf %s "$BADSHA" | cut -c1-20)'" 2 env CT_RUNID=held-selftest CT_SRCMD5=- "$MU" add abcdef012346 "$BADSHA" '#912' "a refused sha list, long enough for the reason floor here"
done
ck "13j and check still clears the clean tree after those refusals" 0 timeout 20 "$MU" check
cp "$KM/gates/held-trees.tsv" "$KM/gates/held-trees.tsv.keep"
printf 'abcdef012347\t1234567\t#913\t2026-10-30T00:00Z\tbuild__F\ta last row with no final newline, long enough for the floor\t-' >> "$KM/gates/held-trees.tsv"
ck "13j a working copy with NO FINAL NEWLINE still clears a clean tree" 0 timeout 20 "$MU" check
ck "13j and its unterminated last row still holds its key" 1 timeout 20 "$MU" check abcdef012347
cp "$KM/gates/held-trees.tsv.keep" "$KM/gates/held-trees.tsv"; rm -f "$KM/gates/held-trees.tsv.keep"
# ---- THE ZERO-KEY LIMB, A DIFFERENT BRANCH, WHICH HAD NO ASSERTION AT ALL ----
# Everything above is taken in the PARTIAL-miss state: app.js unreadable, three keys still asked. The limb where
# NOT ONE key can be computed is a separate branch with its own exit, and antagonist B proved it uncontrolled the
# only way that settles it - by mutating that `exit 2` to `exit 0` and running this whole file: 107 PASS, 0 FAIL.
# The mutation IS the defect the repair exists to prevent, a tree CLEARED having asked nothing at all, and
# thirteen assertions written for the neighbouring limb could not see it. THE STATE IS REAL, not contrived: a
# `cp -r`, a tarball or an scp'd tree has no .git, and a tree whose bundle was never built has no app.js.
KZ="$TD/zerokey"; mkdir -p "$KZ/gates"
cp "$HERE/held.sh" "$KZ/gates/held.sh"; chmod +x "$KZ/gates/held.sh"
printf '# held-trees.tsv (zero-key self-test fixture, not the real register)\n' > "$KZ/gates/held-trees.tsv"
eq "13z the fixture really supplies no key: no .git, no app.js, no chess.jsx" "no-git no-app no-src" \
   "$( printf '%s %s %s' "$( [ -d "$KZ/.git" ] && echo git || echo no-git )" "$( [ -f "$KZ/app.js" ] && echo app || echo no-app )" "$( [ -f "$KZ/chess.jsx" ] && echo src || echo no-src )" )"
ck "13z with NOT ONE key computable the answer is exit 2, never a clearance" 2 timeout 20 "$KZ/gates/held.sh" check
eq "13z and it says so in terms, and prints NO 'not held:' verdict line" "1 0" \
   "$( cd "$KZ" && printf '%s %s' "$( timeout 20 ./gates/held.sh check 2>&1 | grep -c 'NOT ONE artefact key could be computed' )" "$( timeout 20 ./gates/held.sh check 2>&1 | grep -c '^not held: ' )" )"
# AND IT ACCOUNTS FOR THE KEYS IT NEVER REACHED. This limb returns before the two chess.jsx source keys are
# collected, so they are unasked rather than asked-and-missed - which a verdict naming two misses of four would
# otherwise leave a reader to guess at. Antagonist B, #537.
eq "13z and it says how many it tried and that the source keys were not reached" "1 1" \
   "$( cd "$KZ" && printf '%s %s' "$( timeout 20 ./gates/held.sh check 2>&1 | grep -c 'key(s) tried, of the four this form asks' )" "$( timeout 20 ./gates/held.sh check 2>&1 | grep -c 'unasked rather than asked-and-missed' )" )"
# THE MUTANT IS B'S OWN ONE-STATUS MUTATION, built with sed on the line AFTER the limb's last message so it
# cannot touch any other exit in the file - the smallest possible, and the one that shipped green.
ZEXL="$( grep -n 'Name a key explicitly: gates/held.sh check' "$KZ/gates/held.sh" | head -1 | cut -d: -f1 )"
ZEXL=$(( ZEXL + 1 ))
sed "${ZEXL}s/exit 2/exit 0  # THE CLEARANCE RESTORED BY THE MUTANT/" "$KZ/gates/held.sh" > "$KZ/gates/mutant13z.sh"
chmod +x "$KZ/gates/mutant13z.sh"
eq "13z MUTANT is that one status changed and nothing else" "1 differs yes" \
   "$( printf '%s %s %s' "$( grep -c 'THE CLEARANCE RESTORED BY THE MUTANT' "$KZ/gates/mutant13z.sh" )" "$( [ "$(md5sum < "$KZ/gates/held.sh")" != "$(md5sum < "$KZ/gates/mutant13z.sh")" ] && echo differs || echo identical )" "$( bash -n "$KZ/gates/mutant13z.sh" 2>/dev/null && echo yes || echo no )" )"
ck "13z MUTANT clears a tree it could ask NOTHING about, at exit 0 - the defect" 0 timeout 20 "$KZ/gates/mutant13z.sh" check
# AND THE MUTANT AGREES WITH THE FIX WHENEVER EVERY KEY IS ASKABLE, which is why the 94 assertions above could
# not see this: every fixture in this file before section 13 can compute every key it asks for.
eq "13 MUTANT and FIX agree once app.js is readable again" "SAME" \
   "$( timeout 20 "$MM" check >/dev/null 2>&1; A=$?; timeout 20 "$MU" check >/dev/null 2>&1; B=$?; [ "$A" = "$B" ] && echo SAME || echo DIFFER )"

# ── SECTION 14: ONE UNCOMMITTED NUL BYTE MUST NOT BE A CLEARANCE [#544, item (15) of
# directOpening_2026_10_28_batch4;
# jobs/one-uncommitted-nul-byte-in-held-trees-tsv-turns-a-held-tree-into-a-clearance-at-exit-0-2026-10-27, P1,
# from antagonist B of #539's blind shipped-surface door].
# WHAT IT WAS: this tool concatenates HEAD's register and the working-tree register into one temp file and greps
# it, so ONE UNCOMMITTED NUL BYTE made GNU grep switch to binary mode, print "binary file matches" instead of
# the matching lines, and answer "not held ... (0 matchable row(s) checked)" AT EXIT 0 for a tree a LIVE ROW
# NAMES. Nothing was committed; the only tell was ` M gates/held-trees.tsv`.
# THE INPUT SET IS THE JOB'S OWN: three register states (clean, one NUL, many NULs) x two key forms (the bundle
# md5 by name, and the no-argument form that asks four keys), plus the mutant. Every assertion reads the EXIT
# CODE, because the defect printed an honest-looking sentence with the wrong status - which is what this job
# says in terms: "the case must assert the EXIT CODE and not only the message".
NR_="$TD/nulreg"; mkdir -p "$NR_/gates"
cp "$HERE/held.sh" "$NR_/gates/held.sh"; chmod +x "$NR_/gates/held.sh"
NU="$NR_/gates/held.sh"; NREG="$NR_/gates/held-trees.tsv"
git -C "$NR_" init -q 2>/dev/null; git -C "$NR_" config user.email s@t; git -C "$NR_" config user.name selftest
printf 'NUL fixture source\n' > "$NR_/chess.jsx"; printf 'NUL fixture bundle\n' > "$NR_/app.js"
printf '# held-trees.tsv (NUL self-test fixture, not the real register)\n' > "$NREG"
git -C "$NR_" add -A >/dev/null 2>&1; git -C "$NR_" commit -qm 'the tree that will be held' >/dev/null 2>&1
NAPP="$(md5sum "$NR_/app.js" | cut -c1-12)"
# A LIVE ROW NAMING THIS TREE'S BUNDLE, written by the tool itself so the row is the shape a real hold has.
env CT_RUNID=held-selftest "$NU" add "$NAPP" "$(git -C "$NR_" rev-parse HEAD)" '#944' 'the NUL section fixture row, long enough to pass the reason floor' >/dev/null 2>&1
ck "14a control: a clean register REFUSES the held bundle at exit 1"  1 timeout 20 env -C "$NR_" "$NU" check "$NAPP"
ck "14b control: and the no-argument form refuses it too"             1 timeout 20 env -C "$NR_" "$NU" check
# ONE NUL, inserted at the first newline of the WORKING-TREE copy and never committed - the exact attack.
python3 -I - "$NREG" <<'NULPY'
import sys
p=sys.argv[1]; b=open(p,'rb').read(); i=b.index(b'\n')
open(p,'wb').write(b[:i]+b'\x00'+b[i:])
NULPY
eq "14c the fixture really is damaged: one NUL in the working-tree copy, none in HEAD's" "1 0" \
   "$( printf '%s %s' "$(tr -cd '\000' < "$NREG" | wc -c | tr -d ' ')" "$(git -C "$NR_" show HEAD:gates/held-trees.tsv 2>/dev/null | tr -cd '\000' | wc -c | tr -d ' ')" )"
ck "14d ONE uncommitted NUL still REFUSES the held bundle at exit 1 (was exit 0, a clearance)" 1 timeout 20 env -C "$NR_" "$NU" check "$NAPP"
ck "14e and the no-argument form still refuses"                1 timeout 20 env -C "$NR_" "$NU" check
eq "14f and the NUL is reported loudly on stderr, not swallowed" "1" \
   "$( timeout 20 env -C "$NR_" "$NU" check "$NAPP" 2>&1 >/dev/null | grep -c 'NUL byte' )"
# MANY NULs, to show the guard is not a one-byte special case.
python3 -I - "$NREG" <<'NULPY2'
import sys
p=sys.argv[1]; b=open(p,'rb').read()
open(p,'wb').write(b.replace(b'\t', b'\x00\t\x00'))
NULPY2
eq "14g the many-NUL state is reached" "yes" \
   "$( [ "$(tr -cd '\000' < "$NREG" | wc -c | tr -d ' ')" -gt 2 ] && echo yes || echo no )"
ck "14h MANY NULs still refuse at exit 1"                      1 timeout 20 env -C "$NR_" "$NU" check "$NAPP"
# THE MUTANT: the strip removed, the same many-NUL register. It must NOT refuse - that is the defect, and a
# case that cannot tell the two apart is not a control.
MN_="$NR_/gates/.held-nul-mutant.sh"
python3 -I - "$NR_/gates/held.sh" "$MN_" <<'MUTPY'
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
i=s.index('HELD_NULS="$(tr -cd')
j=s.index('# NOW refuse, for the verbs', i)
open(dst,'w').write(s[:i]+': # the NUL guard removed by the control\n'+s[j:])
MUTPY
chmod +x "$MN_"
ck "14i MUTANT (the strip removed) CLEARS the same register - which is the defect this section is about" 0 timeout 20 env -C "$NR_" "$MN_" check "$NAPP"
eq "14j and it clears with the honest-looking sentence that made this hard to see" "1" \
   "$( timeout 20 env -C "$NR_" "$MN_" check "$NAPP" 2>/dev/null | grep -c 'matchable row(s) checked' )"
rm -f "$MN_"

# 15. A BYTE-APPEND IS NOT A LINE-APPEND [#545, item (93); jobs/held-sh-appends-with-no-ensure-nl-so-a-byte-append-can-
#     rewrite-the-last-row-2026-10-10]. The job's controls (a) and (c): on a register whose last byte is NOT a newline, `add`
#     must write a well-formed NEW row and leave the last existing row's sourceMd5 alone; and the normal path stays green
#     (every section above). Its control is the same section on a held.sh with the guard removed, which must glue the row on.
nl_case(){ # <held.sh> -> prints "<rows-before> <rows-after> <old-last-field7-after> <new-last-field1>"
  local hs="$1" reg="$R/gates/held-trees.tsv" before after
  python3 -c "import sys;p=sys.argv[1];s=open(p).read();open(p,'w').write(s.rstrip('\n'))" "$reg"
  before="$(grep -vc '^#' "$reg")"; local was7; was7="$(tail -1 "$reg" | cut -f7)"
  printf 'V1 the GATED source\n' > "$R/chess.jsx"
  env CT_RUNID=held-selftest "$hs" add ddddddddddd5 "$SHA1" '#915' "$RSN" >/dev/null 2>&1
  after="$(grep -vc '^#' "$reg")"
  printf '%s %s %s %s %s\n' "$before" "$after" "$was7" "$(grep -v '^#' "$reg" | tail -2 | head -1 | cut -f7)" "$(tail -1 "$reg" | cut -f1)"
}
NLR="$(nl_case "$H")"; set -- $NLR
eq "15a on a register with no final newline, add writes ONE NEW row (row count +1)" "$(( $1 + 1 ))" "$2"
eq "15b and the row that was last keeps its sourceMd5, not glued onto"               "$3" "$4"
eq "15c and the new row's first field is the new bundle md5"                        "ddddddddddd5" "$5"
NLM="$R/gates/.held-nlmut.sh"
python3 -c "
import sys;s=open(sys.argv[1]).read();g='    if [ -s \"\$REG\" ] && [ -n \"\$(tail -c1 \"\$REG\")\" ]; then printf \'\\\\n\' >> \"\$REG\"; fi\n'
assert s.count(g)==1, 'guard line not found';open(sys.argv[2],'w').write(s.replace(g,''))" "$H" "$NLM" && chmod +x "$NLM"
NLX="$(nl_case "$NLM")"; set -- $NLX
ne "15d CONTROL: with the guard removed the row count does NOT rise - the new row was glued onto the last one" "$(( $1 + 1 ))" "$2"
rm -f "$NLM"
# The mutant left a GLUED row (two rows on one line) on the fixture register, and held.sh now refuses a register
# carrying an unreadable row (13f/13i) - which is right, so the fixture is restored rather than the guard relaxed [#546].
sed -i '/#915/d' "$R/gates/held-trees.tsv"

# 16. A NAMED KEY MUST BE A KEY [#545, antagonist B's finding 2]: a malformed or too-short key is a usage error, exit 2, never
#     a clearance at exit 0.
ck "16a check zz (not hex) is a usage error, not a clearance"            2 "$H" check zz
ck "16b check - is a usage error"                                        2 "$H" check -
ck "16c check a4df39 (6 hex, shorter than any key) is a usage error"     2 "$H" check a4df39
"$H" check abcdef0123 >/dev/null 2>&1; S16=$?
ne "16d a well-formed key is NOT refused as malformed - it gets an answer (0 or 1), never the usage exit 2" "2" "$S16"

printf '\n%s PASS  %s FAIL  (%s assertions over %s inputs to `add`)\n' "$P" "$F" "$((P+F))" "22"
[ "$F" = "0" ] || exit 1
