#!/usr/bin/env bash
# gates/checks-tier-drive.sh [fixed]   -> drives gates/checks-tier.sh end to end and asserts its verdicts.
#
# WHY A HARNESS AND NOT A PARAGRAPH. gates/checks-tier.sh is a JUDGE: it decides whether a commit may push
# without the full suite. A judge is attacked like one - the design's own reviewer broke two earlier drafts in
# fifteen places, most of them a route by which a commit reached a green it should not - so every arm of it needs
# a case that asserts an EXIT CODE and a VERDICT SUBSTRING, and a MUTANT that turns that case. A control that
# cannot fail is the thing this project has filed eleven times under "the check and the thing being checked were
# the same object"; a mutant is how an arm is shown to be load-bearing rather than decorative.
#
# HOW IT IS CHEAP. Most cases run against a SYNTHETIC FIXTURE repository whose controls are stubs that exit in
# milliseconds, because what those cases test is the ROUTING and the JUDGE'S OWN ARMS, not the controls. The
# cases that rest on a REAL control run it: A5 uses main's real held.sh and held-selftest.sh, A9 the real
# verify-log.sh acceptance, A15 main's real tc() table. A1 runs the WHOLE REAL BATTERY in the real repository and
# is the only slow case (about 6.5 minutes); it is skipped unless CT_TIER_A1=1 or the mode argument is `fixed`.
#
# THE FIXTURE IS A REPOSITORY AND NOT A DIRECTORY, because the judge reads base and head ONLY through git objects
# and self-pins to the base's blob. A fixture that was not a repo could not exercise one arm of it honestly.
#
# NEVER A GIT WORKTREE OF THIS CHECKOUT [#530]: worktrees share refs and .git/info/exclude, and #530's own
# controls moved the real refs/remotes/origin/main that way. Every fixture here is a fresh `git init` under
# mktemp, and the real repository is read and never written.
#
# EXIT 0 and a "tier-drive: N ok, 0 FAIL" line when every case met its contract; 1 otherwise.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; G="$ROOT/gates"
MODE="${1:-stub}"
OK=0; FAILN=0; SKIP=0; RESULTS=""

T="$(mktemp -d 2>/dev/null)"
# EVERY mktemp IS CHECKED [#532]: #532's door ran `mktemp -d` unchecked, so under an unwritable TMPDIR its
# scratch paths became files at the filesystem ROOT, where a safety check then refused to remove six of them.
if [ -z "$T" ] || [ ! -d "$T" ]; then
  echo "checks-tier-drive.sh: REFUSING - mktemp -d produced no usable directory (TMPDIR unwritable?)."
  exit 1
fi
cleanup(){ [ -n "${T:-}" ] && [ -d "$T" ] && rm -rf "$T"; }
trap cleanup EXIT

note(){ printf '%s\n' "$*"; }
rec(){ # rec <id> <ok|FAIL|SKIP> <text>
  RESULTS="$RESULTS$1 $2 $3"$'\n'
  case "$2" in
    ok)   OK=$((OK+1));   printf '  %-5s ok    %s\n' "$1" "$3" ;;
    FAIL) FAILN=$((FAILN+1)); printf '  %-5s FAIL  %s\n' "$1" "$3" ;;
    SKIP) SKIP=$((SKIP+1)); printf '  %-5s SKIP  %s\n' "$1" "$3" ;;
  esac
}

# ── THE FIXTURE. A minimal repository the judge can read, with STUB controls so a case costs milliseconds. ────
# gates/lib.js carries child_process on purpose: premise P2 requires it to be there and nowhere else, so a
# fixture without it would make every case fail for a reason no case is about.
mkfix(){ # mkfix <dir> ; leaves the base sha in FIXBASE
  local d="$1"
  mkdir -p "$d/gates/regress" "$d/gates/drive" "$d/claude/agents/gatelogs"
  git init --quiet "$d"
  git -C "$d" config user.name ct-tier-drive
  git -C "$d" config user.email ct-tier-drive@local
  git -C "$d" config commit.gpgsign false

  printf '%s\n' "/* app bundle */" "var BUILD='#530 - 2026-10-21 20:50 ET';" > "$d/app.js"
  printf '%s\n' "<html><body><script src=app.js></script></body></html>" > "$d/index.html"
  printf '%s\n' "// chess source" "export const x=1;" > "$d/chess.jsx"
  printf '%s\n' "// lib" "const cp=require('child_process');" "module.exports={};" > "$d/gates/lib.js"
  printf '%s\n' "// mountcheck" "require('./lib');" > "$d/gates/mountcheck.js"
  printf '%s\n' "// engine extract" > "$d/gates/engine-extract.js"
  printf '%s\n' "// driver" "require('../lib');" > "$d/gates/drive/play.js"
  printf '%s\n' "// a regress gate" "require('../lib');" > "$d/gates/regress/01-x.js"
  # gates/logs IS GITIGNORED, AS IT IS IN THE REAL REPOSITORY (gates/.gitignore:6), AND WITHOUT THIS THE TWO
  # LOCK CASES FAILED FOR A REASON NEITHER IS ABOUT: the judge refuses a dirty working tree BEFORE it takes the
  # lock, so a fixture that tracks gates/logs answers "the working tree is not clean, ?? gates/logs/" to every
  # case that pre-creates a lock. A fixture that does not mirror the thing it stands in for tests the fixture.
  printf '%s\n' "logs/" > "$d/gates/.gitignore"

  # The four push check scripts. Stubs, but real files with real exits.
  for s in fastgate verify-log held buildnum; do
    printf '%s\n' "#!/usr/bin/env bash" "# stub $s" "exit 0" > "$d/gates/$s.sh"
  done
  # verify-log.sh must ACCEPT the archived green log with --this-bundle, which is what A9 turns.
  cat > "$d/gates/verify-log.sh" <<'VL'
#!/usr/bin/env bash
# stub verify-log: accepts an archived log and prints OK. A case that needs a REFUSING head replaces this whole
# file, because verify-log.sh is inside the tier's set and a side file would be routed away instead.
echo "OK: $1 $2 $3"
exit 0
VL
  # The harnesses and the other judges. Stubs with the contracts the tier pins.
  printf '%s\n' "#!/usr/bin/env bash" 'if [ "${1:-}" = "--selftest" ]; then echo "SELFTEST 3 pass / 0 fail"; exit 0; fi' "echo stub-gates" "exit 0" > "$d/gates/gates.sh"
  printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 stub"' 'echo "buildnum self-test: 3 pass, 0 fail"' "exit 0" > "$d/gates/buildnum-selftest.sh"
  printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 stub held"' 'echo "3 PASS  0 FAIL"' "exit 0" > "$d/gates/held-selftest.sh"
  printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 stub vl"' 'echo "Confirmed set clean. 8 hole(s) still open"' "exit 2" > "$d/gates/verify-log-selftest.sh"
  printf '%s\n' "#!/usr/bin/env bash" "# stub records gate" "exit 0" > "$d/gates/records-gate.sh"
  printf '%s\n' "// stub control audit" > "$d/gates/control-audit.js"
  printf '%s\n' "#!/usr/bin/env bash" "# stub gatemanifest" "exit 0" > "$d/gates/gatemanifest.sh"
  # A tc() table of three ids plus H12 (which the tier removes) and H1b (the only case allowed to skip), and a
  # `fixed` mode whose summary line the tier parses. Declared count is therefore 3.
  cat > "$d/gates/fastgate-drive.sh" <<'FD'
#!/usr/bin/env bash
tc(){
  case "$1" in
    H1) :;;
    H1b) :;;
    H2) :;;
    H12) :;;
  esac
}
echo "2 ok, 0 FAIL, 1 skipped"
echo "  H1b SKIP esbuild absent"
exit 0
FD
  # THE ARCHIVED LOG CARRIES A REAL `ref:` LINE NAMING THIS FIXTURE'S OWN app.js, and it has to, because the
  # acceptance arm now reads the md5 off that line and routes GO FULL when there is not exactly one. The old
  # fixture log had no `bundle md5` anywhere, which the previous arm read as "nothing to compare" and skipped -
  # so the fixture agreed with the defect, which is #432's "a fixture that encodes the same assumption as the
  # code cannot see that assumption". A real log has the line; the fixture now has it too.
  printf 'PASS stub\nref: HEAD 0000000000000000000000000000000000000000 | bundle md5 %s | origin/main 0000000000000000000000000000000000000000\nGATES GREEN #500\n' \
    "$(md5sum "$d/app.js" | cut -c1-12)" > "$d/claude/agents/gatelogs/500-all.log"
  # THE TIER UNDER TEST is the working tree's own copy, installed as the fixture's base blob, because the judge
  # self-pins to the base and must be run from it.
  cp "$G/checks-tier.sh" "$d/gates/checks-tier.sh"
  chmod +x "$d"/gates/*.sh
  git -C "$d" add -A >/dev/null 2>&1
  git -C "$d" commit --quiet -m "fixture base" >/dev/null 2>&1
  FIXBASE="$(git -C "$d" rev-parse HEAD)"
}

# runtier <dir> <base> -> sets TOUT and TRC. Runs the judge EXACTLY as its contract prescribes: from the base's
# own blob, never from the working tree.
runtier(){
  local d="$1" base="$2" tf
  tf="$(mktemp -d)"
  if [ -z "$tf" ] || [ ! -d "$tf" ]; then TOUT="mktemp failed"; TRC=99; return; fi
  # THE FIXTURE MUST CARRY refs/remotes/origin/main, POINTING AT THE BASE, because the judge now checks that the
  # base it was handed IS the repository's own origin/main [fresh antagonist B's F3, round 4] - and a `git init`
  # fixture has no such ref at all. Setting it HERE rather than in mkfix is deliberate: the real invocation
  # passes origin/main as the base, so this mirrors it for every case at once, and a case that wants to test the
  # arm itself points the ref somewhere else AFTER calling this (see A38).
  git -C "$d" update-ref refs/remotes/origin/main "$base" >/dev/null 2>&1 || true
  git -C "$d" show "$base:gates/checks-tier.sh" > "$tf/ct.sh" 2>/dev/null
  # $DRIVEHOME OVERRIDES THE JUDGE'S HOME FOR ONE CASE ONLY (A47), and it exists so that the OUTSIDE arm of
  # round 4's snapshot can be exercised WITHOUT a control writing to the real operator's ~/.bashrc. A harness
  # that proved that arm by editing the real home would be a harness nobody could run twice.
  if [ -n "${DRIVEHOME:-}" ]; then
    TOUT="$(cd "$d" && HOME="$DRIVEHOME" bash "$tf/ct.sh" "$base" "$d" 2>&1)"; TRC=$?
  else
    TOUT="$(cd "$d" && bash "$tf/ct.sh" "$base" "$d" 2>&1)"; TRC=$?
  fi
  rm -rf "$tf"
}

# `__CTREAL__` IS THE FIXTURE'S OWN ABSOLUTE PATH, AND IT EXISTS BECAUSE ROUND 4's D1 DEFEATED THE WAY NINE
# CASES USED TO DELIVER THEIR PLANT. Every one of them read `git config --get remote.origin.url` from inside a
# control, which WAS the tree under judgement and is now the throwaway mirror - so the plants landed in the
# mirror, the judge had nothing to refuse, and six cases whose ARMS ARE STILL IN THE JUDGE went green: A26 (a
# symlink at the log path), A29 (the lock handback), A32 (a write under gates/logs), A36 (a hard link at a
# fresh log path), A40 (a planted hook) and A41 (a directory at the log path). Reading that as "the arms are
# no longer needed" would be the mistake: D1 closes ONE route to the real tree and says so in terms - a control
# can still reach it through /proc - so the arms must stay, and their cases must deliver the plant by a route
# that still works. This marker is that route: the harness knows the fixture's path and bakes it into the
# control, which models a control that located the tree by any means other than the one D1 took away.
# IT IS SUBSTITUTED HERE, at the commit, so a case cannot forget it: every file under the fixture carrying the
# marker gets the fixture's absolute path. D1's OWN case (A42) is the one that asserts the route is gone.
commitin(){
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    sed -i "s|__CTREAL__|$1|g" "$f" 2>/dev/null || true
  done < <(grep -rl -- '__CTREAL__' "$1" 2>/dev/null || true)
  git -C "$1" add -A >/dev/null 2>&1; git -C "$1" commit --quiet -m "${2:-candidate}" >/dev/null 2>&1
}

# expect <id> <dir> <base> <wanted-rc> <wanted-substring> <description>
expect(){
  local id="$1" d="$2" base="$3" wrc="$4" wsub="$5" desc="$6"
  runtier "$d" "$base"
  local why=""
  [ "$TRC" = "$wrc" ] || why="exit $TRC, wanted $wrc"
  if [ -n "$wsub" ] && ! grep -qF -- "$wsub" <<<"$TOUT"; then
    why="${why:+$why; }no '$wsub' in its verdict"
  fi
  if [ -n "$why" ]; then
    rec "$id" FAIL "$desc :: $why"
    printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
    return 1
  fi
  rec "$id" ok "$desc (exit $TRC)"
  return 0
}

note "checks-tier-drive.sh  mode=$MODE  root=$ROOT  clock=$(TZ=America/New_York date '+%-I:%M%p ET, %-d %b %Y')"
note "cases: A1 to A63 plus one mutant per new arm (M1 to M48). Fixture repositories under $T."
note ""

# ── A2. A TIER PATH PLUS A RECORD FILE -> GO FULL. ───────────────────────────────────────────────────────────
D="$T/a2"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/verify-log.sh"
printf '%s\n' "a run log line" > "$D/RUN-LOG.md"
commitin "$D" "verify-log plus a RUN-LOG line"
expect A2 "$D" "$FIXBASE" 2 "GO FULL" "a tier path plus RUN-LOG.md routes to the full suite"

# ── A3. EACH DISALLOWED PATH, ON ITS OWN, WITH A TIER PATH BESIDE IT -> GO FULL, NAMING IT. ──────────────────
A3N=0; A3BAD=""
for p in app.js chess.jsx gates/lib.js gates/regress/01-x.js gates/drive/play.js gates/gates.sh \
         gates/records-gate.sh gates/control-audit.js gates/build-numbers.tsv gates/fastgate-drive.sh; do
  D="$T/a3-$A3N"; mkfix "$D"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  mkdir -p "$(dirname "$D/$p")"; printf '%s\n' "// touched" >> "$D/$p"
  commitin "$D" "held.sh plus $p"
  runtier "$D" "$FIXBASE"
  if [ "$TRC" != 2 ] || ! grep -qF "GO FULL" <<<"$TOUT"; then
    A3BAD="$A3BAD $p(exit $TRC)"
  fi
  A3N=$((A3N+1))
done
if [ -n "$A3BAD" ]; then rec A3 FAIL "a disallowed path did not route to the full suite:$A3BAD"
else rec A3 ok "all $A3N disallowed paths route to the full suite, each named"; fi

# ── A4. AN EXISTING gates/cases/ FILE CHANGED, AND ONE DELETED -> GO FULL. ───────────────────────────────────
D="$T/a4"; mkdir -p "$D"; mkfix "$D"
mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo PASS existing" "exit 0" > "$D/gates/cases/c-old.sh"
commitin "$D" "add an existing control"; A4BASE="$(git -C "$D" rev-parse HEAD)"
# The base for this case is the commit that HAS the control, and the tier must be on it too (it is, from mkfix).
printf '%s\n' "# weakened" >> "$D/gates/cases/c-old.sh"
printf '%s\n' "# changed" >> "$D/gates/buildnum.sh"
commitin "$D" "weaken an existing control"
expect A4a "$D" "$A4BASE" 2 "GO FULL" "an EXISTING gates/cases/ file changed routes to the full suite"
D2="$T/a4b"; mkfix "$D2"
mkdir -p "$D2/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo PASS existing" "exit 0" > "$D2/gates/cases/c-old.sh"
commitin "$D2" "add an existing control"; A4BASE2="$(git -C "$D2" rev-parse HEAD)"
rm "$D2/gates/cases/c-old.sh"; printf '%s\n' "# changed" >> "$D2/gates/buildnum.sh"
commitin "$D2" "delete an existing control"
expect A4b "$D2" "$A4BASE2" 2 "GO FULL" "an EXISTING gates/cases/ file DELETED routes to the full suite"

# ── A5. THE REVIEWER'S TWO-COMMIT SPLIT, ON MAIN'S REAL held.sh AND held-selftest.sh. ────────────────────────
# S1 adds ONE line to the harness and keeps its count; S2 then turns a key off under the weakened harness. On
# this tier main's harness is the only harness, so S1 is routed (the harness is not in the tier's set) and S2,
# run against a base whose harness is main's, cannot be 0.
D="$T/a5"; mkfix "$D"
if [ -f "$G/held.sh" ] && [ -f "$G/held-selftest.sh" ]; then
  cp "$G/held.sh" "$D/gates/held.sh"; cp "$G/held-selftest.sh" "$D/gates/held-selftest.sh"
  cp "$ROOT/gates/held-trees.tsv" "$D/gates/held-trees.tsv" 2>/dev/null || true
  chmod +x "$D"/gates/*.sh
  commitin "$D" "real held.sh and its real harness"; A5BASE="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' '# S1: one added line in the harness' >> "$D/gates/held-selftest.sh"
  commitin "$D" "S1: one line added to the harness"
  expect A5s1 "$D" "$A5BASE" 2 "GO FULL" "S1, one added harness line, is routed and never waved through"
  # S2: THE HARNESS IS PUT BACK TO MAIN'S AND held.sh IS GENUINELY WEAKENED. The tier must NOT answer 0.
  # THE WEAKENING HAS TO BE REAL, AND MY FIRST VERSION OF THIS CASE APPENDED A COMMENT. A comment is an honest
  # no-op: main's own harness still read 71 of 71, the tier answered 0, and 0 WAS THE RIGHT ANSWER - so the case
  # was failing the tier for being correct. What the reviewer's S2 actually does is turn a KEY OFF, so this makes
  # `check` always answer not-held, which is precisely what held-selftest.sh's assertions 7h and 10e exist to
  # catch. MEASURED against main's real harness before this case was trusted: 49 PASS, 22 FAIL.
  git -C "$D" checkout --quiet "$A5BASE" -- gates/held-selftest.sh
  python3 -I -c "
import sys
p=sys.argv[1]; L=open(p).read().split(chr(10))
L.insert(1, 'case \"\${1:-}\" in check) echo \"held.sh check: not held\"; exit 0;; esac')
open(p,'w').write(chr(10).join(L))
" "$D/gates/held.sh"
  commitin "$D" "S2: turn held.sh's check off with the harness untouched"
  runtier "$D" "$A5BASE"
  if [ "$TRC" = 0 ]; then rec A5s2 FAIL "S2 weakened held.sh under main's own harness and the tier answered 0"
  else rec A5s2 ok "S2, the SOURCE key weakened under main's harness, is not 0 (exit $TRC)"; fi
else
  rec A5s1 SKIP "gates/held.sh or gates/held-selftest.sh absent from this tree"
  rec A5s2 SKIP "gates/held.sh or gates/held-selftest.sh absent from this tree"
fi

# ── A6. THE TIER'S BYTES ARE NOT MAIN'S -> REFUSED. ──────────────────────────────────────────────────────────
# Run a DIFFERENT copy of the judge than the base's blob. This is the arm that stops a tier judging itself.
D="$T/a6"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change"
TF="$(mktemp -d)"; git -C "$D" show "$FIXBASE:gates/checks-tier.sh" > "$TF/ct.sh"
printf '%s\n' "# an extra byte that main does not have" >> "$TF/ct.sh"
git -C "$D" update-ref refs/remotes/origin/main "$FIXBASE" >/dev/null 2>&1 || true
A6OUT="$(cd "$D" && bash "$TF/ct.sh" "$FIXBASE" "$D" 2>&1)"; A6RC=$?
rm -rf "$TF"
if [ "$A6RC" = 1 ] && grep -qF "REFUSED" <<<"$A6OUT" && grep -qF "self pin" <<<"$A6OUT"; then
  rec A6 ok "a judge whose bytes are not the base's blob REFUSES itself (exit 1)"
else
  rec A6 FAIL "the self pin did not refuse a modified judge (exit $A6RC)"
  printf '%s\n' "$A6OUT" | tail -6 | sed 's/^/          /'
fi

# ── A7. A RENAME OF app.js INTO A TIER-LOOKING PATH IS NEVER 0. ──────────────────────────────────────────────
D="$T/a7"; mkfix "$D"
mkdir -p "$D/gates/cases"
git -C "$D" mv app.js gates/cases/app.js >/dev/null 2>&1 || mv "$D/app.js" "$D/gates/cases/app.js"
commitin "$D" "rename app.js into gates/cases/"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 0 ]; then rec A7 FAIL "a rename of app.js into gates/cases/ took a GREEN"
else rec A7 ok "a rename of app.js into a tier-looking path is never 0 (exit $TRC)"; fi

# ── A8. A PLANTED NON-COMMENT READ OF A TIER PATH IN A REGRESS GATE ON THE BASE -> REFUSED. ──────────────────
D="$T/a8"; mkfix "$D"
printf '%s\n' "const s=require('fs').readFileSync('../verify-log.sh');" >> "$D/gates/regress/01-x.js"
commitin "$D" "plant a real read of verify-log.sh in a regress gate"
A8BASE="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change over the planted base"
expect A8 "$D" "$A8BASE" 2 "PREMISE P1 BROKEN" "a real read of a tier path in the browser read set is REFUSED"

# ── A8b. THE SAME WORDS INSIDE A BLOCK COMMENT ARE NOT A READ. ───────────────────────────────────────────────
# THE CONTROL THAT MAKES A8 MEAN SOMETHING, and it is not decoration: measured on a30fc59, a `//`-only comment
# strip finds exactly one hit in the real read set and it is prose inside a block comment, so a premise arm
# without this distinction would refuse main itself for a word in a paragraph.
D="$T/a8b"; mkfix "$D"
printf '%s\n' "/*" " * the same shape as verify-log.sh refusing the log, and fastgate.sh before it" " */" >> "$D/gates/regress/01-x.js"
commitin "$D" "a tier path named only inside a block comment"
A8BBASE="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change over the commented base"
expect A8b "$D" "$A8BBASE" 0 "CHECKS TIER GREEN" "a tier path inside a BLOCK COMMENT is not a read"

# ── A9. A HEAD WHOSE verify-log.sh REFUSES MAIN'S NEWEST GREEN LOG -> RED. ───────────────────────────────────
# THE REFUSAL MUST BE IN verify-log.sh ITSELF, NOT IN A SIDE FILE. The first version of this case planted
# `gates/.vl-refuse`, which is a path OUTSIDE the tier's set, so the routing sent the commit to the full suite
# at exit 2 and the acceptance arm never ran - the case passed its own exit test for a reason that had nothing
# to do with acceptance, and the mutant that removed the acceptance arm read the same 2 and reported the arm as
# load-bearing. A case whose trigger is routed away before the arm under test runs is not a case.
D="$T/a9"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" "# a head whose verify-log REFUSES the archived green log" 'echo "REFUSED: this head rejects $1"' "exit 1" > "$D/gates/verify-log.sh"
commitin "$D" "a verify-log that refuses the archived green log"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qF "RED" <<<"$TOUT"; then
  rec A9 ok "a head whose verify-log.sh refuses main's newest green log is RED (exit 1)"
else
  rec A9 FAIL "the acceptance arm did not redden a refusing verify-log.sh (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── A10. A RED CONTROL -> RED, NAMING IT. ────────────────────────────────────────────────────────────────────
D="$T/a10"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'echo "SELFTEST 2 pass / 1 fail"' "exit 1" > "$D/gates/gates.sh"
commitin "$D" "a gates.sh whose selftest fails"; A10BASE="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change over a red control"
expect A10 "$D" "$A10BASE" 1 "CHECKS TIER RED" "a red control reddens the tier and is named"

# ── A11. A CONTROL THAT WRITES INTO THE REAL TREE, MOVES A REF, OR PLANTS A HOOK -> RED. ─────────────────────
A11N=0; A11BAD=""
for kind in write ref hook config; do
  D="$T/a11-$kind"; mkfix "$D"
  case "$kind" in
    write)  BODY='printf "%s\\n" planted > "$OLDPWD/planted-by-a-control.txt" 2>/dev/null || true' ;;
    ref)    BODY='git -C "$OLDPWD" update-ref refs/remotes/origin/main HEAD 2>/dev/null || true' ;;
    hook)   BODY='printf "%s\\n" "#!/bin/sh" "exit 0" > "$OLDPWD/.git/hooks/post-commit" 2>/dev/null; chmod +x "$OLDPWD/.git/hooks/post-commit" 2>/dev/null || true' ;;
    config) BODY='git -C "$OLDPWD" config ct.planted yes 2>/dev/null || true' ;;
  esac
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' "$BODY"
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  commitin "$D" "a gates.sh whose selftest touches the real tree ($kind)"; B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  commitin "$D" "a tier-only change over a tree-touching control"
  runtier "$D" "$B"
  if [ "$TRC" = 0 ]; then A11BAD="$A11BAD $kind"; fi
  A11N=$((A11N+1))
done
if [ -n "$A11BAD" ]; then rec A11 FAIL "a control that touched the real tree still got a GREEN:$A11BAD"
else rec A11 ok "all $A11N tree-touching controls (write, ref, hook, config) are refused"; fi

# ── A12. A CONTROL THAT REWRITES OR APPENDS TO THE RUNNING JUDGE GETS THE ORIGINAL'S VERDICT.
# THE FIRST VERSION OF THIS CASE COULD NOT FAIL, AND ANTAGONIST A PROVED IT [F3, P2]. Its two poses appended to
# `$0` (which inside run_ctl is gates/gates.sh IN THE THROWAWAY CLONE) and to `$OLDPWD/gates/checks-tier.sh`
# (the fixture's WORKING-TREE copy) - while the running judge is a temporary file extracted from the base's blob.
# Neither is the file bash is reading, its `for f in /proc/$PPID/fd/*` loop was a no-op, so `HIJACKED` could
# never appear and the residual assertion was `TRC in {0,1}`, which a tier-only candidate satisfies for EVERY
# outcome. The mechanism was sound; the case was decoration.
# SO THE POSES NOW FIND THE RUNNING JUDGE THE WAY AN ATTACKER WOULD, by walking /proc for the bash process whose
# argv names the extracted copy, and writing to THAT path. TWO THINGS THE SECOND VERSION ALSO GOT WRONG, both
# recorded because each made the case unable to report: the marker was echoed to stdout, which run_ctl DISCARDS
# for a control that passes, so the case could not see whether its own pose had landed; and it is read from a
# file OUTSIDE the fixture, because a marker inside it would be caught by the real-tree snapshot and change the
# verdict the case is trying to observe.
A12BAD=""; A12TRIED=""
for kind in append rewrite; do
  D="$T/a12-$kind"; mkfix "$D"
  MARK="$T/a12-marker-$kind"; rm -f "$MARK"
  case "$kind" in
    append)  ACT='printf "%s\n" "echo HIJACKED-BY-APPEND; exit 0" >> "$J"' ;;
    rewrite) ACT='printf "%s\n" "#!/usr/bin/env bash" "echo HIJACKED-BY-REWRITE" "exit 0" > "$J"' ;;
  esac
  {
    echo '#!/usr/bin/env bash'
    echo '# Find the RUNNING judge: the bash process whose argv names the extracted checks-tier copy.'
    echo 'J=""'
    echo 'for c in /proc/[0-9]*/cmdline; do'
    echo '  while IFS= read -r arg; do'
    echo '    case "$arg" in'
    echo '      */ct.sh|*/checks-tier.sh) [ -f "$arg" ] && [ -w "$arg" ] && J="$arg" ;;'
    echo '    esac'
    echo '  done < <(tr "\0" "\n" < "$c" 2>/dev/null)'
    echo '  [ -n "$J" ] && break'
    echo 'done'
    echo 'if [ -z "$J" ]; then'
    printf '  printf "%%s\\n" "could-not-locate" > %s\n' "$MARK"
    echo 'else'
    echo "  $ACT"
    printf '  printf "%%s\\n" "wrote-to $J" > %s\n' "$MARK"
    echo 'fi'
    echo 'echo "SELFTEST 3 pass / 0 fail"'
    echo 'exit 0'
  } > "$D/gates/gates.sh"
  commitin "$D" "a control that attacks the RUNNING judge ($kind)"; B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  commitin "$D" "a tier-only change"
  runtier "$D" "$B"
  if grep -q 'wrote-to' "$MARK" 2>/dev/null; then A12TRIED="$A12TRIED $kind(reached-the-judge)"
  else A12TRIED="$A12TRIED $kind(could-not-locate)"; fi
  grep -qF "HIJACKED" <<<"$TOUT" && A12BAD="$A12BAD $kind(HIJACKED)"
  # The honest verdict for this tree is 0 (a tier-only change over green stub controls) or 1 (the real-tree
  # snapshot saw the write). Anything else means the attacker's own exit reached the caller.
  [ "$TRC" != 0 ] && [ "$TRC" != 1 ] && A12BAD="$A12BAD $kind(exit $TRC)"
done
if [ -n "$A12BAD" ]; then rec A12 FAIL "the running judge was hijacked:$A12BAD"
elif ! grep -q 'reached-the-judge' <<<"$A12TRIED"; then
  rec A12 SKIP "neither pose could locate the running judge in /proc, so this case was not attempted:$A12TRIED"
else rec A12 ok "a control that writes to the RUNNING judge gets the original's verdict:$A12TRIED"; fi

# ── A13. A DIRTY WORKING TREE -> REFUSED. ────────────────────────────────────────────────────────────────────
D="$T/a13"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change"
printf '%s\n' "uncommitted" >> "$D/gates/held.sh"
# D5 SPLIT THIS SENTENCE IN TWO, so the case now reads the TRACKED half - the half that still refuses, and the
# half this case was always about. The untracked half is A50, which routes.
expect A13 "$D" "$FIXBASE" 1 "TRACKED modification" "a dirty working tree with a TRACKED modification is REFUSED"

# ── A14. NO TIER PATH IN THE CHANGED SET -> GO FULL. ────────────────────────────────────────────────────────
D="$T/a14"; mkfix "$D"
printf '%s\n' "a line" > "$D/HANDOFF.md"
commitin "$D" "records only, no tier path"
expect A14 "$D" "$FIXBASE" 2 "GO FULL" "a changed set with no tier path routes to the full suite"

# ── A15. THE fastgate-drive CONTRACT: THE DENOMINATOR IS THE BASE'S tc() TABLE LESS H12. ────────────────────
# A15a: ok+skipped BELOW the declared count -> RED. A15b: a skip other than H1b -> RED. A15c: main's REAL table
# derives the same number gates/gates.sh derives at :2252-2253.
D="$T/a15a"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' 'echo "1 ok, 0 FAIL, 0 skipped"' "exit 0" > "$D/gates/fastgate-drive.sh"
commitin "$D" "a harness that runs fewer cases than it declares"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change"
expect A15a "$D" "$B" 1 "CHECKS TIER RED" "ok+skipped below the declared count is RED"
D="$T/a15b"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' 'echo "2 ok, 0 FAIL, 1 skipped"' 'echo "  H2 SKIP for a reason that is not esbuild"' "exit 0" > "$D/gates/fastgate-drive.sh"
commitin "$D" "a harness where a case other than H1b skips"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change"
expect A15b "$D" "$B" 1 "CHECKS TIER RED" "a skip other than H1b is RED"
# A15c. MAIN'S REAL TABLE, derived by gates/gates.sh's own recipe and by the tier's, must agree.
if [ -f "$G/fastgate-drive.sh" ]; then
  R1="$(sed -n '/^tc(){/,/^}/p' "$G/fastgate-drive.sh" | grep -oE '(^|[[:space:]])H[0-9]+b?\)' | tr -d ' \t\r)' | grep -vx H12 | sort -u | grep -c . || true)"
  R2="$(sed -n '/^tc(){/,/^}/p' "$G/fastgate-drive.sh" | grep -oE '(^|[[:space:]])H[0-9]+b?\)' | tr -d ' \t\r)' | grep -c . || true)"
  if [ "$((R1+0))" -gt 0 ] && [ "$((R2+0))" -eq "$((R1+1))" ]; then
    rec A15c ok "main's real tc() table derives $R1 declared ids from $R2 rows, H12 excluded, as gates.sh does"
  else
    rec A15c FAIL "main's real tc() table derives $R1 from $R2 rows, which is not table-less-H12"
  fi
else
  rec A15c SKIP "gates/fastgate-drive.sh absent"
fi

# ── A16. THE verify-log SELFTEST IS TRI-STATE, AND ITS SUCCESS STATE IS EXIT 0 (antagonist B's upheld P1 VETO).
# gates/verify-log-selftest.sh exits 1 when a confirmed case REGRESSED, 2 when the confirmed set is clean with
# holes still open, and 0 when the confirmed set is clean and EVERY HOLE IS CLOSED. Exit 0 is success. The tier
# pinned 2, so it RED-refused the commit that closes verify-log.sh's eight documented parser holes - the single
# most important commit class it exists to fast-gate. A16a is that commit; A16b is the real regression, which
# must still be RED.
D="$T/a16a"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 stub vl"' 'echo "verify-log self-test: 35 pass, 0 fail, 0 hole(s) open, 8 hole(s) closed"' 'echo "Confirmed set clean and every hole closed."' "exit 0" > "$D/gates/verify-log-selftest.sh"
commitin "$D" "a base whose verify-log selftest has every hole closed"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# the parser repair" >> "$D/gates/verify-log.sh"
commitin "$D" "close the parser holes"
expect A16a "$D" "$B" 0 "CHECKS TIER GREEN" "the selftest at exit 0, every hole closed, is ACCEPTED"
D="$T/a16b"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'echo "FAIL 1 a confirmed case regressed"' 'echo "verify-log self-test: 34 pass, 1 fail, 8 hole(s) open, 0 hole(s) closed"' 'echo "A CONFIRMED CASE REGRESSED."' "exit 1" > "$D/gates/verify-log-selftest.sh"
commitin "$D" "a base whose verify-log selftest regresses"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/verify-log.sh"
commitin "$D" "a tier-only change over a regressed selftest"
expect A16b "$D" "$B" 1 "CHECKS TIER RED" "the selftest at exit 1, a confirmed case regressed, is still RED"

# ── A17. A NEW FILE UNDER gates/cases/ THAT NOTHING WOULD RUN -> GO FULL (my own finding from re-reading the diff).
D="$T/a17"; mkfix "$D"
mkdir -p "$D/gates/cases"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
printf '%s\n' "planted, and nothing bash-es a .js" > "$D/gates/cases/c-nothing-runs-this.js"
commitin "$D" "held.sh plus a new non-sh non-md file under gates/cases"
expect A17 "$D" "$FIXBASE" 2 "GO FULL" "a new gates/cases/ file that is neither .sh nor .md routes to the full suite"

# ── A18. A CONTROL THAT WRITES UNDER THE REAL TREE'S gates/logs/ IS CAUGHT (antagonist B's P3).
# The snapshot used to drop every line containing `gates/logs/`, a SUBSTRING match, so a write anywhere under
# that directory was invisible while this tool claimed the real tree was untouched.
D="$T/a18"; mkfix "$D"
{ printf '%s\n' "#!/usr/bin/env bash"
  printf '%s\n' 'mkdir -p "$OLDPWD/gates/logs" 2>/dev/null; printf "%s\n" planted > "$OLDPWD/gates/logs/planted-by-a-control.txt" 2>/dev/null || true'
  printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
commitin "$D" "a control that writes under the real tree's gates/logs"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
commitin "$D" "a tier-only change"
runtier "$D" "$B"
if [ "$TRC" = 0 ]; then rec A18 FAIL "a control wrote under the real tree's gates/logs and still got a GREEN"
else rec A18 ok "a control writing under the real tree's gates/logs is caught (exit $TRC)"; fi

# ── A25. A CONTROL THAT REMOVES THE SUITE LOCK IS CAUGHT (antagonist A, F8 residual). The snapshot must exclude
# the lock's own path - this run creates it - and that exclusion left a hole: a control could delete the only
# guard against two suites overlapping (#419) mid-battery and still reach GREEN.
D="$T/a25"; mkfix "$D"
{ printf '%s\n' "#!/usr/bin/env bash"
  printf '%s\n' 'rm -rf "$OLDPWD/gates/logs/.suite.lock" 2>/dev/null || true'
  printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
commitin "$D" "a control that removes the suite lock"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
runtier "$D" "$B"
if [ "$TRC" = 0 ]; then rec A25 FAIL "a control removed the suite lock and the tier still answered GREEN"
else rec A25 ok "a control that removes the suite lock is caught (exit $TRC)"; fi

# ── A19 / A20. EVERY gates/cases/ CONTROL RUNS, THE BASE'S INCLUDED (antagonist A's upheld P1 VETO F1).
# A19 is the reproduction: a base carrying a control that prints FAIL and exits 1, with a candidate changing only
# a tier path, used to read exit 0 CHECKS TIER GREEN and "new control file(s) run: 0" - the tier reaching GREEN
# on a tree the project's own control set refuses. A20 is the other half, and without it A19 could be satisfied
# by a tier that simply reddens whenever the base has any control at all.
D="$T/a19"; mkfix "$D"
mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo 'FAIL c-old is RED'" "exit 1" > "$D/gates/cases/c-old.sh"
commitin "$D" "base carries a RED control"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# a fix" >> "$D/gates/held.sh"; commitin "$D" "a later tier-only change"
expect A19 "$D" "$B" 1 "CHECKS TIER RED" "a RED control already on the base reddens a later tier-only commit"
D="$T/a20"; mkfix "$D"
mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo 'PASS c-old holds'" "exit 0" > "$D/gates/cases/c-old.sh"
commitin "$D" "base carries a GREEN control"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# a fix" >> "$D/gates/held.sh"; commitin "$D" "a later tier-only change"
runtier "$D" "$B"
if [ "$TRC" = 0 ] && grep -qF "1 already on the base" <<<"$TOUT"; then
  rec A20 ok "a GREEN control on the base is RUN and counted, and the commit still passes (exit 0)"
else
  rec A20 FAIL "the base's GREEN control was not run and counted (exit $TRC)"
  printf '%s\n' "$TOUT" | grep -E 'control|GREEN|RED' | tail -4 | sed 's/^/          /'
fi

# ── A21. A BASE THAT PREDATES THIS TIER IS GO FULL, NOT REFUSED (antagonist A, P2).
# Every base until this build lands is such a base, and exit 1 told those commits they were broken.
D="$T/a21"; mkfix "$D"
git -C "$D" rm -q --cached gates/checks-tier.sh >/dev/null 2>&1; rm -f "$D/gates/checks-tier.sh"
commitin "$D" "a base with no checks-tier.sh"; B="$(git -C "$D" rev-parse HEAD)"
cp "$G/checks-tier.sh" "$D/gates/checks-tier.sh"; chmod +x "$D/gates/checks-tier.sh"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "add the tier and change a tier path"
TF="$(mktemp -d)"; cp "$G/checks-tier.sh" "$TF/ct.sh"
git -C "$D" update-ref refs/remotes/origin/main "$B" >/dev/null 2>&1 || true
A21OUT="$(cd "$D" && bash "$TF/ct.sh" "$B" "$D" 2>&1)"; A21RC=$?
rm -rf "$TF"
if [ "$A21RC" = 2 ] && grep -qF "GO FULL" <<<"$A21OUT" && grep -qF "predating this tier" <<<"$A21OUT"; then
  rec A21 ok "a base carrying no gates/checks-tier.sh routes to the full suite (exit 2), not REFUSED"
else
  rec A21 FAIL "a base predating the tier did not route to the full suite (exit $A21RC)"
  printf '%s\n' "$A21OUT" | tail -4 | sed 's/^/          /'
fi

# ── A22. PREMISE P2 IS COMMENT-BLIND NO LONGER (antagonist A, P2). One word of prose used to make this tier a
# hard REFUSED - the same false positive P1 was repaired for, one screen below it, with ZERO headroom.
D="$T/a22"; mkfix "$D"
printf '%s\n' "// NOTE: this gate does NOT use execSync; see gates/lib.js." >> "$D/gates/regress/01-x.js"
printf '%s\n' "/* nor spawnSync, nor child_process, which only lib.js may touch */" >> "$D/gates/regress/01-x.js"
commitin "$D" "a base whose regress gate NAMES child_process in comments only"
B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
expect A22 "$D" "$B" 0 "CHECKS TIER GREEN" "child_process named in COMMENTS only does not break premise P2"

# ── A23. THE ACCEPTANCE ARM GOES FULL, NOT RED, WHEN THE ARCHIVED LOG GATED A DIFFERENT BUNDLE (antagonist A, P2).
# That is state outside the candidate, and RED is the verdict that says "do not re-run".
D="$T/a23"; mkfix "$D"
printf 'PASS\nref: HEAD deadbeefdeadbeef | bundle md5 aaaaaaaaaaaa | origin/main x\nGATES GREEN #500\n' > "$D/claude/agents/gatelogs/500-all.log"
commitin "$D" "a base whose archived log gated a different bundle"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
expect A23 "$D" "$B" 2 "GO FULL" "an archived log gating another bundle routes to the full suite, not RED"

# ── A24. A DUPLICATED tc() CASE ID IS RED (antagonist A, P3). gates/gates.sh has this guard and the tier did not,
# so a repeated id inflated DECL and reddened an HONEST harness while A15c, which uses sort -u, stayed green.
D="$T/a24"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' 'echo "2 ok, 0 FAIL, 1 skipped"' 'echo "  H1b SKIP esbuild absent"' "exit 0" > "$D/gates/fastgate-drive.sh"
commitin "$D" "a base whose tc() table repeats a case id"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
expect A24 "$D" "$B" 1 "REPEATS a case id" "a repeated tc() case id is RED and named, not an inflated denominator"

# ── THE MUTANTS. EACH DISABLES ONE ARM AND MUST TURN A CASE. ─────────────────────────────────────────────────
# ── THE MUTATION HELPER. EVERY MUTANT GOES THROUGH IT, AND THAT IS ANTAGONIST A's UPHELD P1 VETO F2(a) [#535].
# M3 and M12 used `sed -E 's|...\|...|...|'`, and in ERE `\|` is ALTERNATION, not an escaped delimiter. M3
# rewrote SIX lines - four of them comments and run_ctl's real `bash gates/verify-log.sh` call - and M12 one, and
# BOTH left a judge that does not parse. `bash` on an unparseable script exits 2, which this tier's interface
# defines as GO FULL, so each mutant's case "turned" because the judge would not start - and the routing arm and
# the .sh/.md form guard were never shown load-bearing at all. The `cmp -s` guard passed both, because it proves
# the bytes MOVED and not that they moved WHERE YOU MEANT.
# AND THE REASON THIS IS A HELPER AND NOT THREE MORE FIXES: I had already hit this exact defect in M13 and
# written a four-part guard for it IN THE SAME COMMIT that introduced M12 carrying it. Fixing the instance and
# not the class is CLAUDE.md's "a lesson recorded in one gate does not travel to the next one by itself",
# committed by the commit that recorded the lesson. So the guard is now the only way to build a mutant here.
# mkmut <outfile> ; replacement pairs on stdin as OLD<TAB>NEW, one per line, \n for newlines. Exits non-zero
# unless every anchor matched EXACTLY ONCE.
# THE CONTROL LAUNCH LINE, IN ONE PLACE, BECAUSE THREE MUTANTS ANCHOR ON IT AND IT HAS NOW MOVED TWICE. When
# the seventh round replaced `setsid --wait ... "$pgf"` with job control, three anchors went stale at once and
# every one of them would have failed LOUDLY (mkmut requires exactly one match) rather than silently running a
# weaker mutant - which is the guard working. One definition so they cannot drift apart from each other.
LAUNCHLINE='          timeout "$bound" "$@" >&$ofd 2>&1 </dev/null ) &'

mkmut(){
  local out="$1"
  python3 -I -c '
import sys
src=open(sys.argv[1]).read()
n=0
for line in sys.stdin.read().split("\n"):
    if not line.strip(): continue
    if "\t" not in line:
        sys.stderr.write("no tab in replacement line\n"); sys.exit(3)
    old,new=line.split("\t",1)
    old=old.replace("\\n","\n"); new=new.replace("\\n","\n")
    c=src.count(old)
    if c!=1:
        sys.stderr.write("anchor matched %d times (want 1): %r\n"%(c,old[:70])); sys.exit(3)
    src=src.replace(old,new); n+=1
if n==0:
    sys.stderr.write("no replacements given\n"); sys.exit(3)
open(sys.argv[2],"w").write(src)
' "$G/checks-tier.sh" "$out"
}
# mutguard <id> <desc> <outfile> <expect-substring> -> 0 if the mutant is usable, 1 if it is not (and records FAIL)
mutguard(){
  local id="$1" desc="$2" out="$3" expect="$4"
  if [ ! -s "$out" ]; then rec "$id" FAIL "$desc :: the mutation produced an EMPTY or missing file"; return 1; fi
  if cmp -s "$out" "$G/checks-tier.sh"; then rec "$id" FAIL "$desc :: the mutation changed NOTHING"; return 1; fi
  if ! bash -n "$out" 2>/dev/null; then
    rec "$id" FAIL "$desc :: the mutated judge DOES NOT PARSE, so its verdict is about a broken file and not about the arm"; return 1; fi
  if [ -n "$expect" ] && ! grep -qF -- "$expect" "$out"; then
    rec "$id" FAIL "$desc :: the mutated judge does not carry the text the mutation was meant to install"; return 1; fi
  return 0
}
# THE ROUTING-WIDENING MUTATION, used by the two-stage mutants below. It is a VALID bash case arm, unlike the
# broken sed it replaces, and it lets a non-tier path through to the arms that come after routing.
WIDEN_OLD='      gates/fastgate.sh|gates/verify-log.sh|gates/held.sh|gates/buildnum.sh)'
WIDEN_NEW='      gates/fastgate.sh|gates/verify-log.sh|gates/held.sh|gates/buildnum.sh|*)'


# A mutant that leaves every case green proves the arm it removed was decorative. This is the one test that
# separates an arm which is load-bearing from one that merely runs.
mutant(){ # mutant <id> <sed-expr> <case-dir-builder> <wanted-honest-rc> <desc>
  local id="$1" expr="$2" builder="$3" honest="$4" desc="$5"
  local d="$T/m-$id"
  $builder "$d" || { rec "$id" SKIP "$desc (fixture could not be built)"; return; }
  # Install the mutated judge as the fixture's BASE blob, which is the only copy the contract lets run.
  sed -E "$expr" "$G/checks-tier.sh" > "$d/gates/checks-tier.sh"
  if cmp -s "$d/gates/checks-tier.sh" "$G/checks-tier.sh"; then
    rec "$id" FAIL "$desc :: the mutation changed NOTHING, so this mutant tests nothing"
    return
  fi
  git -C "$d" add -A >/dev/null 2>&1
  git -C "$d" commit --quiet -m "mutant base: $id" >/dev/null 2>&1
  local mb; mb="$(git -C "$d" rev-parse HEAD)"
  # Re-apply the candidate change on top of the mutant base.
  printf '%s\n' "# changed" >> "$d/gates/held.sh"
  $MUTEXTRA "$d" 2>/dev/null || true
  commitin "$d" "the candidate over the mutant base"
  runtier "$d" "$mb"
  if [ "$TRC" = "$honest" ]; then
    rec "$id" FAIL "$desc :: the mutant reached the HONEST verdict $honest, so the arm is not load-bearing"
  else
    rec "$id" ok "$desc :: turns the case ($TRC, honest is $honest)"
  fi
}
MUTEXTRA=:

# M1. Remove the dirty-tree refusal: A13's case must stop refusing.
mut_m1(){ local d="$1"; mkfix "$d"; }
D="$T/m-M1"
mkfix "$D"
# RE-ANCHORED BY #542, AND MOVED TO mkmut. The entrance repair reads the NUL stream STRAIGHT FROM git into the
# loop - it cannot go through a variable, because `$(...)` strips NULs - so the single `DIRTY=` line this sed
# named no longer exists in any form. A sed whose anchor cannot match is a mutant that silently tests nothing,
# which is worse than no mutant by this harness's own standard, so the mutation is now a substring replacement
# in the same idiom as M37 and M49: make the loop read an EMPTY stream, so DIRTYANY stays 0, no dirty-tree
# verdict is ever reached, and A13 must stop refusing.
printf '%s\t%s\n' 'done < <("${GIT[@]}" status --porcelain=v1 -z --untracked-files=all 2>/dev/null)' 'done < <(:)' \
  | mkmut "$D/gates/checks-tier.sh"
if ! mutguard M1 "remove the dirty-tree refusal" "$D/gates/checks-tier.sh" 'done < <(:)'; then
  :
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M1 base" >/dev/null 2>&1
  M1B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  printf '%s\n' "uncommitted" >> "$D/gates/held.sh"
  runtier "$D" "$M1B"
  if [ "$TRC" = 1 ] && grep -qF "TRACKED modification" <<<"$TOUT"; then
    rec M1 FAIL "the dirty-tree arm still refused with its check removed, so A13 does not test it"
  else
    rec M1 ok "removing the dirty-tree refusal turns A13 (exit $TRC instead of a clean-tree refusal)"
  fi
fi

# M2. Remove the self pin: A6 must stop refusing a modified judge.
D="$T/m-M2"; mkfix "$D"
sed -E 's/^  if \[ "\$MINE" != "\$THEIRS" \]; then$/  if false; then/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M2 FAIL "the self-pin mutation changed nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M2 base" >/dev/null 2>&1
  M2B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  TF="$(mktemp -d)"; git -C "$D" show "$M2B:gates/checks-tier.sh" > "$TF/ct.sh"
  printf '%s\n' "# an extra byte" >> "$TF/ct.sh"
  git -C "$D" update-ref refs/remotes/origin/main "$M2B" >/dev/null 2>&1 || true
  O="$(cd "$D" && bash "$TF/ct.sh" "$M2B" "$D" 2>&1)"; R=$?; rm -rf "$TF"
  if [ "$R" = 1 ] && grep -qF "self pin" <<<"$O" && grep -qF "REFUSED" <<<"$O"; then
    rec M2 FAIL "the self pin still refused with its comparison removed"
  else
    rec M2 ok "removing the self pin turns A6 (exit $R, no refusal)"
  fi
fi

# M3. WIDEN THE ROUTING so a non-tier path is let through: A3's gates/lib.js pose must stop being named by the
# routing. TWO STAGES, because a mutant that only proves "some arm still caught it" proves nothing about the arm
# it removed [antagonist A, F2(b)]. Stage 1 widens routing ALONE and shows the SERVED-TREE IDENTITY arm catches
# the bundle change on its own; stage 2 widens routing AND removes identity, and must reach exit 0.
D="$T/m-M3"; mkfix "$D"
printf '%s\t%s\n' "$WIDEN_OLD" "$WIDEN_NEW" | mkmut "$D/gates/checks-tier.sh"
if mutguard M3 "widen the routing" "$D/gates/checks-tier.sh" "$WIDEN_NEW"; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M3 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "// touched" >> "$D/gates/lib.js"
  commitin "$D" "held.sh plus gates/lib.js under a widened routing"
  runtier "$D" "$MB"
  if grep -qF "outside this tier's set" <<<"$TOUT"; then
    rec M3 FAIL "the routing still named gates/lib.js with its case widened to let every path through"
  elif [ "$TRC" = 2 ] && grep -qF "browser read set is NOT byte-identical" <<<"$TOUT"; then
    rec M3 ok "widening the routing turns A3's naming, and the read-set identity arm catches it alone (exit 2)"
  else
    rec M3 FAIL "with routing widened, neither the routing nor the identity arm gave the expected verdict (exit $TRC)"
  fi
fi

# M4. Remove the real-tree snapshot comparison: A11 must stop refusing.
D="$T/m-M4"; mkfix "$D"
# ROUND 4 MOVED THIS ANCHOR: the comparison now lives in snapcheck, which is the single place the two
# snapshots are compared, so the way to remove it is to make that function return before it compares.
sed -E 's/^    \[ "\$SNAP0" = "\$SNAP1" \] && return 0$/    return 0/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M4 FAIL "the snapshot mutation changed nothing"
else
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' 'printf "%s\n" planted > "$OLDPWD/planted-by-a-control.txt" 2>/dev/null || true'
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M4 base" >/dev/null 2>&1
  M4B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$M4B"
  if [ "$TRC" = 0 ]; then
    rec M4 ok "removing the real-tree snapshot turns A11: a planted write now takes a GREEN (exit 0)"
  else
    rec M4 FAIL "the tree check still refused with its comparison removed (exit $TRC)"
  fi
fi

# M5. Strip only LINE comments in the premise: A8b must flip from green to a false refusal.
D="$T/m-M5"; mkfix "$D"
# THE FIRST OCCURRENCE ONLY, AND A COUNT ASSERTED BOTH WAYS [fresh antagonist A, F-I]. The anchor
# `if (c=="/" && d=="*") { inblock=1; i+=2; continue }` occurs TWICE in checks-tier.sh, once in premise arm P1's
# awk stripper and once in P2's, because F4 duplicated the stripper rather than factoring it. A bare `sed -E`
# therefore changed BOTH, so M5 disabled the block-comment strip in both arms and overlapped M16 - and `cmp -s`
# said "changed", which is true and is not the question. mkmut's exactly-once rule would have refused it, and
# that rule was applied to the twelve new mutants and not to the seven legacy ones, which is "a lesson recorded
# in one gate does not travel" inside the commit that quotes that rule about itself. So: assert the anchor
# occurs exactly twice in the source, replace exactly ONE of them, and assert exactly one occurrence remains -
# which is what makes this mutant about P1 alone and distinct from M16.
python3 - "$G/checks-tier.sh" "$D/gates/checks-tier.sh" <<'M5PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
A = 'if (c=="/" && d=="*") { inblock=1; i+=2; continue }'
B = 'if (0) { inblock=1; i+=2; continue }'
s = open(src, encoding='utf-8').read()
n = s.count(A)
# ROUND 4 ADDED A THIRD COPY OF THIS ANCHOR: D6's end-of-file comment-state arm runs the same stripper to ask
# whether `inblock` is still set at EOF. In file order the occurrences are P1's stripper, that arm's, and P2's,
# so the count is 3 and replacing the FIRST still makes this mutant about P1 alone.
assert n == 3, "M5 anchor occurs %d times, expected 3 (P1's stripper, D6's end-of-file arm, and P2's)" % n
out = s.replace(A, B, 1)
assert out.count(A) == 2, "M5 must leave D6's arm and P2's stripper intact"
assert out != s
open(dst, 'w', encoding='utf-8').write(out)
M5PY
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M5 FAIL "the block-comment mutation changed nothing"
elif ! bash -n "$D/gates/checks-tier.sh" 2>/dev/null; then
  rec M5 FAIL "the block-comment mutant does not parse, so any exit it produces is bash's and not an arm's"
else
  printf '%s\n' "/*" " * the same shape as verify-log.sh refusing the log" " */" >> "$D/gates/regress/01-x.js"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M5 base" >/dev/null 2>&1
  M5B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$M5B"
  if [ "$TRC" = 0 ]; then
    rec M5 FAIL "with block comments unstripped the premise still passed, so A8b does not test the distinction"
  else
    rec M5 ok "not stripping block comments turns A8b into a false refusal (exit $TRC), which is why it is stripped"
  fi
fi

# M6. REMOVE THE SERVED-TREE IDENTITY ARM, WITH ROUTING WIDENED SO IT IS THE ONLY ARM THAT COULD CATCH THE
# CHANGE. This is antagonist A's F2(b) repaired: the old M6 removed identity alone, and A7 still read exit 2
# because ROUTING caught the deleted app.js - so the mutant passed only because its own test grepped for a
# different string than the case asserts, and the identity arm had no evidence behind it at all. Paired with
# M3's stage 1, which shows identity catching it alone, this is the two-sided measurement.
D="$T/m-M6"; mkfix "$D"
{ printf '%s\t%s\n' "$WIDEN_OLD" "$WIDEN_NEW"
  printf '%s\t%s\n' '  if [ -n "$mismatch" ]; then' '  if false; then'; } | mkmut "$D/gates/checks-tier.sh"
if mutguard M6 "widen routing and remove the identity arm" "$D/gates/checks-tier.sh" "$WIDEN_NEW"; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M6 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "// the bundle moves" >> "$D/gates/lib.js"
  commitin "$D" "a browser read-set change with routing widened and identity removed"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M6 ok "removing the identity arm lets a read-set change take a GREEN once routing is widened (exit 0)"
  else
    rec M6 FAIL "a read-set change was still caught with routing widened AND identity removed (exit $TRC), so the identity arm is not what A7 measures"
  fi
fi

# M7. ALLOW AN EXISTING gates/cases/ FILE TO CHANGE, AND REMOVE THE ARM-6 BYTE-IDENTITY LOOP TOO. Antagonist
# A's F2(b): the old M7 disabled only the routing-level EXISTINGCASES branch, and A4a still read exit 2 with
# GO FULL because the arm-6 loop over the base's gates/cases files caught it - two arms for one property, so the
# mutant proved neither. Both go, and A4a must then stop routing.
D="$T/m-M7"; mkfix "$D"
{ printf '%s\t%s\n' '  if [ -n "$EXISTINGCASES" ]; then' '  if false; then'
  printf '%s\t%s\n' '    if [ "$hb" != "$hh" ]; then\n      say "GO FULL: the existing control file $o is not byte-identical to the base (base=$hb head=$hh)."\n      return 2\n    fi' '    if false; then\n      say "GO FULL: the existing control file $o is not byte-identical to the base (base=$hb head=$hh)."\n      return 2\n    fi'; } | mkmut "$D/gates/checks-tier.sh"
if mutguard M7 "allow an existing control to change" "$D/gates/checks-tier.sh" "  if false; then"; then
  mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo PASS existing" "exit 0" > "$D/gates/cases/c-old.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M7 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# weakened" >> "$D/gates/cases/c-old.sh"
  printf '%s\n' "# changed" >> "$D/gates/buildnum.sh"
  commitin "$D" "weaken an existing control under both arms removed"
  runtier "$D" "$MB"
  # A `case` AND NOT `grep -qF <<<"$TOUT" || grep -qF <<<"$TOUT"`, AND THE REASON IS THE RATCHET, NOT TASTE.
  # `gates/gatemanifest.sh sigpipe` read 23 sites at the base a30fc59 and 24 on this tree, and the extra one was
  # this line - filed TIER A, the one tier the audit exists to refuse, whose ceiling is 1 and whose single slot
  # the file's own comment reserves for gates/verify-log.sh:128. MEASURED with a four-shape probe dropped into
  # gates/ in a throwaway clone: ONE herestring into `grep -q` inside an `if` is exempt, TWO joined by `||` are
  # NOT, a real pipe is (correctly) a site, and a `case` is not. So the exemption is per logical line rather
  # than per grep, and the audit's own printed remedy ("make that line a herestring") cannot fix a line that is
  # already two herestrings. That is a defect in the instrument and it is filed as
  # jobs/the-sigpipe-audits-herestring-exemption-is-defeated-by-an-or-chain-...-2026-10-23; gates/gatemanifest.sh
  # is outside this run's scope, and editing the instrument that judges my own new files in the commit that adds
  # them would be #432's trap. What is in scope is not leaving the ratchet worse than I found it: a `case` is a
  # pure bash match with no grep, no pipe and no subprocess, it is measured NOT to be a site, and it takes the
  # total back to the base's 23.
  case "$TOUT" in
    *"EXISTING gates/cases/ file"*|*"existing control file"*)
      rec M7 FAIL "an existing-control arm still fired with both of them removed" ;;
    *)
      rec M7 ok "removing both existing-control arms turns A4a (exit $TRC, no existing-control verdict)" ;;
  esac
fi

# M8. REMOVE THE HARNESS-IDENTITY ARM, WITH ROUTING WIDENED so it is the only arm that could catch a harness
# change. Antagonist A's F2(b): the old M8's sed matched TWO lines (so it also disabled the existing-cases loop,
# overlapping M7), and A5s1 still read exit 2 with GO FULL because ROUTING named gates/held-selftest.sh - the
# arm under test was never the one speaking.
D="$T/m-M8"; mkfix "$D"
{ printf '%s\t%s\n' "$WIDEN_OLD" "$WIDEN_NEW"
  printf '%s\t%s\n' '    if [ "$hb" != "$hh" ]; then\n      say "GO FULL: $o is not byte-identical to the base (base=$hb head=$hh)."' '    if false; then\n      say "GO FULL: $o is not byte-identical to the base (base=$hb head=$hh)."'; } | mkmut "$D/gates/checks-tier.sh"
if mutguard M8 "widen routing and remove the harness-identity arm" "$D/gates/checks-tier.sh" "$WIDEN_NEW"; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M8 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "# S1: one added line" >> "$D/gates/held-selftest.sh"
  commitin "$D" "held.sh plus one harness line, routing widened and harness identity removed"
  runtier "$D" "$MB"
  if grep -qF "is not byte-identical to the base" <<<"$TOUT"; then
    rec M8 FAIL "the harness-identity arm still fired with its branch removed"
  elif [ "$TRC" = 0 ]; then
    rec M8 ok "removing the harness-identity arm lets the two-commit split's S1 take a GREEN (exit 0)"
  else
    rec M8 FAIL "S1 was still stopped with routing widened AND harness identity removed (exit $TRC)"
  fi
fi

# M9. Credit a skip without bounding the denominator: A15a must stop reddening.
D="$T/m-M9"; mkfix "$D"
sed -E 's/^      \[ \$\(\(okn \+ skn\)\) -ne "\$DECL" \] && why=.*$/      :/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M9 FAIL "the denominator mutation changed nothing"
else
  printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' 'echo "1 ok, 0 FAIL, 0 skipped"' "exit 0" > "$D/gates/fastgate-drive.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M9 base" >/dev/null 2>&1
  M9B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$M9B"
  if [ "$TRC" = 0 ]; then
    rec M9 ok "removing the denominator bound turns A15a: 1 of 3 cases now takes a GREEN (exit 0)"
  else
    rec M9 FAIL "the denominator bound still fired with its test removed (exit $TRC)"
  fi
fi

# M10. Remove the acceptance arm: A9 must stop reddening.
D="$T/m-M10"; mkfix "$D"
sed -E 's|^    run_ctl "verify-log\.sh \(head\) accepts #\$GN".*$|    :|' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M10 FAIL "the acceptance mutation changed nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M10 base" >/dev/null 2>&1
  M10B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "#!/usr/bin/env bash" "# refusing head" 'echo "REFUSED: this head rejects $1"' "exit 1" > "$D/gates/verify-log.sh"
  commitin "$D" "a refusing verify-log under a removed acceptance arm"
  runtier "$D" "$M10B"
  if [ "$TRC" = 0 ]; then
    rec M10 ok "removing the acceptance arm turns A9: a refusing verify-log.sh takes a GREEN (exit 0)"
  else
    rec M10 FAIL "the acceptance arm still fired with its call removed (exit $TRC)"
  fi
fi

# M11. Pin the verify-log selftest back to exactly 2: A16a must stop being accepted.
D="$T/m-M11"; mkfix "$D"
sed -E 's|^  run_ctl "verify-log-selftest\.sh"  0,2 |  run_ctl "verify-log-selftest.sh"    2 |' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M11 FAIL "the exit-set mutation changed nothing"
else
  printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 stub vl"' 'echo "Confirmed set clean and every hole closed."' "exit 0" > "$D/gates/verify-log-selftest.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M11 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# the parser repair" >> "$D/gates/verify-log.sh"; commitin "$D" "close the parser holes"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M11 FAIL "pinning the exit back to 2 still accepted the repaired selftest, so A16a tests nothing"
  else
    rec M11 ok "pinning the exit back to 2 turns A16a: the hole-closing commit is refused again (exit $TRC)"
  fi
fi

# M12. REMOVE THE .sh/.md FORM GUARD on a new gates/cases/ file: A17 must stop routing. Built through mkmut,
# because this mutant's first version was the broken-ERE one antagonist A found [F2(a)].
D="$T/m-M12"; mkfix "$D"
printf '%s\t%s\n' '          *.sh|*.md) ;;' '          *.sh|*.md|*) ;;' | mkmut "$D/gates/checks-tier.sh"
if mutguard M12 "remove the gates/cases form guard" "$D/gates/checks-tier.sh" '*.sh|*.md|*) ;;'; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M12 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  mkdir -p "$D/gates/cases"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "planted" > "$D/gates/cases/c-nothing-runs-this.js"
  commitin "$D" "a new non-sh non-md control file under a removed guard"
  runtier "$D" "$MB"
  if grep -qF "neither .sh nor .md" <<<"$TOUT"; then
    rec M12 FAIL "the form guard still fired with its case widened"
  else
    rec M12 ok "removing the .sh/.md guard turns A17 (exit $TRC, no form verdict)"
  fi
fi

# M13. RE-INTRODUCE a gates/logs filter into the snapshot: A18 and A32 must stop catching the write. The arm
# this turns is now the ABSENCE of a filter rather than an exact-path one - the third round deleted the
# exclusion outright, because its comment said "BY EXACT PATH" while the code was still a two-needle SUBSTRING
# match, and the right answer to a thing that needs a careful wording is to remove the thing.
# THE MUTATION IS MADE WITH python AND NOT sed, AND THE GUARD CHECKS WHAT IT PRODUCED AND NOT ONLY THAT IT
# CHANGED. The first version used a sed whose escaping was pathological enough to fail outright ("unknown option
# to `s'"), which left the mutant file EMPTY - and the `cmp -s` guard passed it, because an empty file IS
# different from the original. An empty judge then routed at exit 2 and the case read as if the arm had held.
# A guard that proves the bytes MOVED is not a guard that proves they moved WHERE YOU MEANT, which is this
# project's "the numbers moved but not past the line" one level up, inside a mutant.
D="$T/m-M13"; mkfix "$D"
# AND IT GOES THROUGH mkmut NOW, which is the helper every other mutant here uses and which guards all four
# ways a mutation can lie (empty file, nothing changed, does not parse, does not carry what was installed).
# The bespoke `python3 -c` this replaced had to escape a `$(` inside a double-quoted bash string, and the first
# attempt at re-anchoring it for round 4 produced a file bash could not parse at all - which is the very
# failure its own comment above describes, committed by the edit that was fixing the anchor.
# BOTH SNAPSHOTS, and the first attempt filtered only SNAPTXT0 - which leaves the two sides ASYMMETRIC, so
# the write still shows as a difference and the mutant read exit 2 for a reason that was not the arm. A filter
# that is meant to blind a comparison has to be applied to both of its inputs.
{ printf '%s\t%s\n' 'SNAPTXT0="$(snapshot)"' 'SNAPTXT0="$(snapshot | grep -v gates/logs/)"'
  printf '%s\t%s\n' 'SNAPTXT1="$(snapshot)"' 'SNAPTXT1="$(snapshot | grep -v gates/logs/)"'
} | mkmut "$D/gates/checks-tier.sh"
M13OK=1
if [ ! -s "$D/gates/checks-tier.sh" ]; then
  rec M13 FAIL "the mutation produced an EMPTY or missing file, so it tests nothing"; M13OK=0
elif cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M13 FAIL "the snapshot filter mutation changed nothing"; M13OK=0
elif ! bash -n "$D/gates/checks-tier.sh" 2>/dev/null; then
  rec M13 FAIL "the mutated judge does not parse, so its verdict is about a broken file and not about the arm"; M13OK=0
elif ! grep -qF "snapshot | grep -v gates/logs/" "$D/gates/checks-tier.sh"; then
  rec M13 FAIL "the mutated judge does not carry the substring filter the mutation was supposed to restore"; M13OK=0
fi
if [ "$M13OK" = 1 ]; then
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' 'mkdir -p "$OLDPWD/gates/logs" 2>/dev/null; printf "%s\n" planted > "$OLDPWD/gates/logs/planted-by-a-control.txt" 2>/dev/null || true'
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M13 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M13 ok "the substring gates/logs filter turns A18: the write becomes invisible and takes a GREEN (exit 0)"
  else
    rec M13 FAIL "the substring filter still caught the write (exit $TRC), so A18 does not test the exact-path fix"
  fi
fi

# M14. Run only the NEW controls, as the arm did before A's veto: A19 must stop reddening.
D="$T/m-M14"; mkfix "$D"
# THE ANCHOR CARRIES NO BACKSLASH-n, because mkmut turns the two-character sequence \n into a newline so a
# multi-line replacement can be expressed on one line - and the first version of this mutant anchored on the
# ALLCASES line, which contains `printf '%s\n%s\n'`, so the anchor never matched. mutguard caught it and
# reported FAIL rather than letting a no-op mutant read as a success, which is the whole reason it exists.
printf '%s\t%s\n' '"$cb" "$NEWFILES" | grep -E' '"$NEWFILES" "$NEWFILES" | grep -E' | mkmut "$D/gates/checks-tier.sh"
if mutguard M14 "run only the new controls" "$D/gates/checks-tier.sh" '"$NEWFILES" "$NEWFILES" | grep'; then
  mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo 'FAIL c-old is RED'" "exit 1" > "$D/gates/cases/c-old.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M14 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# a fix" >> "$D/gates/held.sh"; commitin "$D" "a later tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M14 ok "running only the new controls turns A19: the base's RED control is skipped and the commit takes a GREEN (exit 0)"
  else
    rec M14 FAIL "the base's RED control still reddened the commit with the union removed (exit $TRC)"
  fi
fi

# M15. Refuse a base that predates the tier, as it did before: A21 must stop routing.
D="$T/m-M15"; mkfix "$D"
printf '%s\t%s\n' '    say "GO FULL: the base ${BASESHA:0:12} carries no gates/checks-tier.sh, so there is no main copy to judge by."\n    say "  That is a base predating this tier, not a fault in your commit. The full suite decides it."\n    return 2' '    say "REFUSED: the base ${BASESHA:0:12} carries no gates/checks-tier.sh."\n    return 1' | mkmut "$D/gates/checks-tier.sh"
if mutguard M15 "refuse a pre-tier base" "$D/gates/checks-tier.sh" 'return 1'; then
  git -C "$D" rm -q --cached gates/checks-tier.sh >/dev/null 2>&1; rm -f "$D/gates/checks-tier.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M15 base, no tier" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  TF="$(mktemp -d)"; printf '%s\t%s\n' '    say "GO FULL: the base ${BASESHA:0:12} carries no gates/checks-tier.sh, so there is no main copy to judge by."\n    say "  That is a base predating this tier, not a fault in your commit. The full suite decides it."\n    return 2' '    say "REFUSED: the base ${BASESHA:0:12} carries no gates/checks-tier.sh."\n    return 1' | mkmut "$TF/ct.sh"
  git -C "$D" update-ref refs/remotes/origin/main "$MB" >/dev/null 2>&1 || true
  O="$(cd "$D" && bash "$TF/ct.sh" "$MB" "$D" 2>&1)"; R=$?; rm -rf "$TF"
  if [ "$R" = 1 ]; then
    rec M15 ok "restoring the refusal turns A21: a pre-tier base is REFUSED again rather than routed (exit 1)"
  else
    rec M15 FAIL "a pre-tier base did not refuse with the refusal restored (exit $R)"
  fi
fi

# M16. Make premise P2 comment-blind again: A22 must flip to a false refusal.
D="$T/m-M16"; mkfix "$D"
printf '%s\t%s\n' "            if (c==\"/\" && d==\"/\") { if (i>1 && substr(line,i-1,1)==\":\") { out = out c; i++; continue } break }\n            out = out c; i++\n          }\n          print out\n        }' 2>/dev/null | grep -nE \"child_process" "            if (c==\"/\" && d==\"/\") { break }\n            out = out c; i++\n          }\n          print \$0\n        }' 2>/dev/null | grep -nE \"child_process" | mkmut "$D/gates/checks-tier.sh"
if mutguard M16 "make P2 comment-blind" "$D/gates/checks-tier.sh" 'print $0'; then
  printf '%s\n' "// NOTE: this gate does NOT use execSync; see gates/lib.js." >> "$D/gates/regress/01-x.js"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M16 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 2 ] && grep -qF "PREMISE P2 BROKEN" <<<"$TOUT"; then
    rec M16 ok "making P2 comment-blind turns A22 into a false ROUTE (exit 2), which is why it strips comments"
  else
    rec M16 FAIL "P2 stayed clean with its comment strip removed (exit $TRC), so A22 does not test it"
  fi
fi

# M17. Redden instead of routing when the archived log gated another bundle: A23 must stop routing.
D="$T/m-M17"; mkfix "$D"
printf '%s\t%s\n' '    if [ "$LOGMD5" != "$DISKMD5" ]; then' '    if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M17 "remove the bundle-mismatch route" "$D/gates/checks-tier.sh" '    if false; then'; then
  printf 'PASS\nref: HEAD deadbeefdeadbeef | bundle md5 aaaaaaaaaaaa | origin/main x\nGATES GREEN #500\n' > "$D/claude/agents/gatelogs/500-all.log"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M17 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 2 ] && grep -qF "gated bundle" <<<"$TOUT"; then
    rec M17 FAIL "the bundle-mismatch route still fired with its branch removed"
  else
    rec M17 ok "removing the bundle-mismatch route turns A23 (exit $TRC, no routing verdict)"
  fi
fi

# M18. Drop the tc() uniqueness guard: A24 must stop naming the repeat.
D="$T/m-M18"; mkfix "$D"
printf '%s\t%s\n' '  if [ "$DECL" -ne "$DECLU" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M18 "drop the tc() uniqueness guard" "$D/gates/checks-tier.sh" '    return 0'; then
  printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' 'echo "2 ok, 0 FAIL, 1 skipped"' 'echo "  H1b SKIP esbuild absent"' "exit 0" > "$D/gates/fastgate-drive.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M18 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if grep -qF "REPEATS a case id" <<<"$TOUT"; then
    rec M18 FAIL "the uniqueness guard still fired with its branch removed"
  else
    rec M18 ok "dropping the uniqueness guard turns A24 (exit $TRC, the repeat is unnamed)"
  fi
fi

# M19. Drop the lock-integrity check: A25 must stop catching the removal.
D="$T/m-M19"; mkfix "$D"
printf '%s\t%s\n' '  if [ ! -d "$LOCK" ] || [ "$LOCKPID" != "$$" ] || [ "$LOCKSIG1" != "$LOCKSIG0" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M19 "drop the lock-integrity check" "$D/gates/checks-tier.sh" '    return 0'; then
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' 'rm -rf "$OLDPWD/gates/logs/.suite.lock" 2>/dev/null || true'
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M19 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  # THE EXPECTED OUTCOME CHANGED WHEN THE SNAPSHOT STOPPED EXCLUDING THE LOCK, AND THE CASE HAD TO CHANGE WITH
  # IT RATHER THAN BE DECLARED BROKEN. M19 used to assert that removing the integrity check let the lock removal
  # reach a GREEN. It no longer does, and that is CORRECT: with nothing excluded from the snapshot, the lock's
  # disappearance is a line in `status --porcelain --ignored` and the snapshot refuses on it. So there are now
  # two independent layers over one attack, and a single mutant cannot speak about either - which is the trap
  # this project records eleven times, arriving inside a mutant. The pair below is the honest instrument: M19
  # removes the integrity check and asserts the OTHER layer still refuses while the verdict STOPS naming the
  # lock (so the message really does come from the check), and M19b removes the snapshot comparison and asserts
  # the integrity check refuses ON ITS OWN and still names it.
  if grep -qF "the suite lock was removed" <<<"$TOUT"; then
    rec M19 FAIL "the lock-integrity verdict still appeared with its check removed, so A25's message has no mutant"
  elif [ "$TRC" != 1 ]; then
    rec M19 FAIL "with the integrity check removed NOTHING refused a removed lock (exit $TRC) - the snapshot backstop is not working either"
  else
    rec M19 ok "dropping the lock-integrity check turns A25's MESSAGE; the snapshot still refuses the removal (exit $TRC)"
  fi
fi

# ── M19b. THE OTHER SIDE OF THE SAME PAIR: disable the SNAPSHOT comparison and the lock-integrity check must
# refuse the removal on its own, and still name it.
D="$T/m-M19b"; mkfix "$D"
printf '%s\t%s\n' '    [ "$SNAP0" = "$SNAP1" ] && return 0' '    return 0' | mkmut "$D/gates/checks-tier.sh"
if mutguard M19b "disable the snapshot so the lock check stands alone" "$D/gates/checks-tier.sh" '    return 0'; then
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' 'rm -rf "$OLDPWD/gates/logs/.suite.lock" 2>/dev/null || true'
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M19b base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 1 ] && grep -qF "the suite lock was removed" <<<"$TOUT"; then
    rec M19b ok "with the snapshot blind the LOCK CHECK alone refuses the removal and names it (exit $TRC)"
  else
    rec M19b FAIL "with the snapshot blind nothing named the removed lock (exit $TRC)"
  fi
fi


# ══ THE FRESH PAIR'S ROUND. EIGHT NEW CASES AND EIGHT NEW MUTANTS, ONE PER NEW ARM. ═══════════════════════════
# Every arm below was added because an antagonist reached a verdict it should not have. The case asserts the exit
# and the verdict; the mutant removes the arm and asserts the case stops holding. Where TWO layers now cover one
# attack, there are TWO mutants, each disabling the other layer, so neither layer rests on the other's evidence.

# ── A26. A CONTROL PLANTS A SYMLINK AT THIS RUN'S OWN LOG PATH -> REFUSED, AND NOTHING IS WRITTEN THROUGH IT.
# Fresh antagonist A's F-B, the P1 VETO of the third round: the control computes the log path from its clone's
# origin url and its own short sha, symlinks it at app.js, and the judge's final unconditional write replaced
# the bundle - after printing "the real tree was not touched" at exit 0.
D="$T/a26"; mkfix "$D"
mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo 'PASS c-old holds'" "exit 0" > "$D/gates/cases/c-old.sh"
commitin "$D" "a base with one control"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
cat > "$D/gates/cases/c-evil.sh" <<'EVIL'
#!/usr/bin/env bash
# Not a control. The pose from antagonist A's F-B, as a case: assert nothing, plant a link at the judge's own
# log path, and let the judge's last line do the damage.
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
mkdir -p "$R/gates/logs"; rm -f "$R/gates/logs/checks-$SH-all.log"
ln -s "$R/app.js" "$R/gates/logs/checks-$SH-all.log"
echo "PASS c-evil asserts nothing"
exit 0
EVIL
commitin "$D" "held.sh plus a control that plants a symlink at the log path"
A26MD5BEFORE="$(md5sum "$D/app.js" | cut -c1-32)"
runtier "$D" "$B"
A26MD5AFTER="$(md5sum "$D/app.js" | cut -c1-32)"
A26WHY=""
[ "$TRC" = 1 ] || A26WHY="exit $TRC, wanted 1"
grep -qiF "symlink" <<<"$TOUT" || A26WHY="${A26WHY:+$A26WHY; }no 'symlink' in its verdict"
[ "$A26MD5BEFORE" = "$A26MD5AFTER" ] || A26WHY="${A26WHY:+$A26WHY; }app.js WAS REWRITTEN through the link"
if [ -n "$A26WHY" ]; then
  rec A26 FAIL "a symlink planted at the log path :: $A26WHY"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
else
  rec A26 ok "a symlink planted at the log path is REFUSED and the target is untouched (exit $TRC)"
fi

# ── A27. A LIVE SUITE LOCK -> GO FULL, NOT RED. Fresh antagonist A's duty 2 and F-F: a running suite is
# transient state outside the candidate, and it is the only false-RED path that fires on the normal sequence.
D="$T/a27"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
mkdir -p "$D/gates/logs/.suite.lock"; printf '%s\n' "$$" > "$D/gates/logs/.suite.lock/pid"
expect A27 "$D" "$FIXBASE" 2 "GO FULL" "a lock held by a LIVE pid routes to the full suite instead of refusing"
rm -rf "$D/gates/logs/.suite.lock"

# ── A28. A STALE LOCK IS TAKEN OVER AND THE RUN PROCEEDS. CLAUDE.md: the first accident after the lock shipped
# was a SIGKILL that left one behind, so the takeover branch is not optional - and nothing exercised it.
D="$T/a28"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
mkdir -p "$D/gates/logs/.suite.lock"; printf '%s\n' "4000000" > "$D/gates/logs/.suite.lock/pid"
expect A28 "$D" "$FIXBASE" 0 "took over a stale lock" "a lock whose pid is not running is taken over and the run proceeds"

# ── A29. A CONTROL RELEASES THE LOCK AND HANDS IT BACK WITH THE SAME PID -> REFUSED. Fresh antagonist A's F-C:
# the pid check is an END-STATE test, and three lines defeat it.
D="$T/a29"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-handback.sh" <<'HB'
#!/usr/bin/env bash
R="__CTREAL__"; L="$R/gates/logs/.suite.lock"
P="$(cat "$L/pid" 2>/dev/null || echo none)"
rm -rf "$L"; mkdir -p "$L"; printf '%s\n' "$P" > "$L/pid"
echo "PASS c-handback asserts nothing"
exit 0
HB
commitin "$D" "held.sh plus a control that hands the lock back"
expect A29 "$D" "$FIXBASE" 1 "handed back rather than held" "a lock released and re-created with the same pid is REFUSED on its inode"

# ── A30. A CONTROL THAT DOES NOT FINISH IS A NAMED RED, NOT A HANG. Fresh antagonist A's F-E: `sleep 40` reached
# PASS and GREEN with the real tree's lock held throughout, and nothing bounded it.
D="$T/a30"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
printf '%s\n' "#!/usr/bin/env bash" "sleep 30" "echo 'PASS never reached in time'" "exit 0" > "$D/gates/cases/c-slow.sh"
commitin "$D" "held.sh plus a control that does not finish"
CT_CTL_TIMEOUT=3 expect A30 "$D" "$FIXBASE" 1 "did not finish in 3s" "a control that overruns its bound is a named RED"

# ── A31. THE CONTROL CONTRACT, THREE POSES THAT ALL REACHED GREEN. Fresh antagonist A's F-G.
A31N=0; A31BAD=""
A31ONE(){ # A31ONE <tag> <body-line...>
  local tag="$1"; shift
  local d="$T/a31-$tag"; mkfix "$d"
  printf '%s\n' "# changed" >> "$d/gates/held.sh"
  mkdir -p "$d/gates/cases"
  { printf '%s\n' "#!/usr/bin/env bash"; printf '%s\n' "$@"; printf '%s\n' "exit 0"; } > "$d/gates/cases/c-$tag.sh"
  commitin "$d" "held.sh plus a $tag control"
  runtier "$d" "$FIXBASE"
  A31N=$((A31N+1))
  if [ "$TRC" = 0 ]; then A31BAD="$A31BAD $tag(exit 0, GREEN)"; fi
}
A31ONE vacuous 'echo "0 PASS  0 FAIL"'
A31ONE bypassed 'echo "all checks BYPASSED; nothing asserted"'
A31ONE midfail 'echo "PASS 1 ok"' 'echo "Result: FAIL - the key is off"'
if [ -n "$A31BAD" ]; then rec A31 FAIL "a control that asserts nothing or reports a FAIL still passed the contract:$A31BAD"
else rec A31 ok "all $A31N vacuous or failing control poses are refused by the contract"; fi

# ── A32. A CONTROL WRITING UNDER gates/logs IN THE REAL TREE IS SEEN NOW THAT NOTHING IS EXCLUDED, AND THE
# VERDICT NAMES THE LINE. The filter used to drop the whole directory, then the two paths by substring.
D="$T/a32"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-logwrite.sh" <<'LW'
#!/usr/bin/env bash
R="__CTREAL__"
mkdir -p "$R/gates/logs"; printf 'planted\n' > "$R/gates/logs/checks-deadbeef-all.logEVIL"
echo "PASS c-logwrite asserts nothing"
exit 0
LW
commitin "$D" "held.sh plus a control that writes under gates/logs"
runtier "$D" "$FIXBASE"
# THIS CASE STAYS AT EXIT 1 UNDER ROUND 4'S SPLIT, AND WORKING OUT WHY IS WHAT PRODUCED THE LAST CLAUSE OF THE
# GRAVE CLASSIFIER. D4 routes an untracked path that is merely ADDED, on the ground that CLAUDE.md lets every
# other chat write docs and flags in this repository and the judge cannot tell their writes from a control's.
# This plant is NOT of that kind: `gates/logs/checks-deadbeef-all.logEVIL` is in the judge's OWN namespace -
# `gates/logs/checks-*` is this script's log and `gates/logs/.suite.lock` is gates.sh's lock, and nothing else
# in this project writes either - so it is grave wherever it moves. Mutant M21 is what forced the distinction:
# without it, round 4 would have ROUTED a symlink planted at this run's own log path where round 3 REFUSED it,
# which is weakening an established refusal. The route arm has its own case in A39, over a path (claude/) that
# another session really does write.
if [ "$TRC" = 1 ] && grep -qF "the real tree CHANGED" <<<"$TOUT" && grep -qF "checks-deadbeef-all.logEVIL" <<<"$TOUT"; then
  rec A32 ok "a write in the judge's own gates/logs namespace is SEEN, NAMED and grave (exit $TRC)"
else
  rec A32 FAIL "a write under gates/logs was not seen, or the verdict did not name the line (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
fi

# ── A33. THE ACCEPTANCE ARM READS THE `ref:` LINE AND IGNORES PROSE. THE DIRECT CONTROL FOR THE ROUND'S OTHER
# P1: three `bundle md5` tokens in a gate's own assertion text plus the real one on the ref line. The shipped
# arm read all four, concatenated them, and routed GO FULL on every candidate.
D="$T/a33"; mkfix "$D"
{ printf 'PASS stub\n'
  printf 'PASS 12 THE CLAIM IS WITHDRAWN: measured against bundle md5 890f7a9b7b67 and bundle md5 5388547cb472\n'
  printf '  and the healthy main bundle md5 bd8f31ddbc47, so the arm says nothing.\n'
  printf 'ref: HEAD 0000000000000000 | bundle md5 %s | origin/main 0\n' "$(md5sum "$D/app.js" | cut -c1-12)"
  printf 'GATES GREEN #500\n'; } > "$D/claude/agents/gatelogs/500-all.log"
commitin "$D" "a base whose archived log mentions three other bundles in PROSE"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
expect A33 "$D" "$B" 0 "CHECKS TIER GREEN" "md5 tokens in a gate's PROSE do not defeat the acceptance arm"

# ── A34. AN ARCHIVED LOG WITH NO `ref:` LINE -> GO FULL, NAMING THE COUNT. 46 of the 131 logs on main predate
# the ref line, so this is a real shape and not a hypothetical.
D="$T/a34"; mkfix "$D"
printf 'PASS stub\nGATES GREEN #500\n' > "$D/claude/agents/gatelogs/500-all.log"
commitin "$D" "a base whose archived log predates the ref line"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
expect A34 "$D" "$B" 2 "names 0 bundle md5" "an archived log with no ref line routes to the full suite"

# ── M20. DISABLE THE SNAPSHOT COMPARISON so the symlink guard is the only thing that can speak: A26 must STILL
# refuse, and app.js must STILL be intact. This is layer (2) measured alone.
D="$T/m-M20"; mkfix "$D"
printf '%s\t%s\n' '    [ "$SNAP0" = "$SNAP1" ] && return 0' '    return 0' | mkmut "$D/gates/checks-tier.sh"
if mutguard M20 "disable the snapshot comparison" "$D/gates/checks-tier.sh" '    return 0'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M20 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cat > "$D/gates/cases/c-evil.sh" <<'EVIL'
#!/usr/bin/env bash
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
mkdir -p "$R/gates/logs"; rm -f "$R/gates/logs/checks-$SH-all.log"
ln -s "$R/app.js" "$R/gates/logs/checks-$SH-all.log"
echo "PASS c-evil asserts nothing"
exit 0
EVIL
  commitin "$D" "a symlink plant with the snapshot blind"
  MB5="$(md5sum "$D/app.js" | cut -c1-32)"
  runtier "$D" "$MB"
  if [ "$TRC" = 1 ] && grep -qiF "symlink" <<<"$TOUT" && [ "$MB5" = "$(md5sum "$D/app.js" | cut -c1-32)" ]; then
    rec M20 ok "with the snapshot blind the SYMLINK GUARD alone still refuses and still protects the target (exit $TRC)"
  else
    rec M20 FAIL "with the snapshot blind the symlink guard did not hold on its own (exit $TRC)"
  fi
fi

# ── M21. REMOVE THE WRITE-TARGET GUARD **AND** THE RENAME, which is the only way to reach the harm now - and
# re-framing it that way is itself the measurement. Its first version removed the guard alone and the target
# survived, because round 4 replaced the in-place `>` with a `rm -f` plus `mv`, and a RENAME cannot follow a
# link of either kind: it replaces the directory entry and never opens the old inode. So the guard is no longer
# the thing that prevents the damage - it is the thing that REPORTS it - and a mutant that removes only the
# reporter proves nothing about the protection. With both gone, the verdict must still be REFUSED (the snapshot
# names a difference under gates/logs/checks-, which this round made a GRAVE marker) AND the bundle must be
# rewritten, which is the harm the RENAME, not the verdict, now prevents. M28 is the complement.
D="$T/m-M21"; mkfix "$D"
{ printf '%s\t%s\n' '  for _p in "$ROOT/gates" "$ROOT/gates/logs"; do' '  for _p in; do'
  printf '%s\t%s\n' '  if [ "$SELFLOGBAD" = 0 ] && { [ -e "$OUT" ] || [ -L "$OUT" ]; }; then' '  if false; then'
  printf '%s\t%s\n' '  elif writelog; then' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$OUT" 2>/dev/null; then'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M21 "disable both halves of the write-target guard" "$D/gates/checks-tier.sh" '  for _p in; do'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M21 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cat > "$D/gates/cases/c-evil.sh" <<'EVIL'
#!/usr/bin/env bash
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
mkdir -p "$R/gates/logs"; rm -f "$R/gates/logs/checks-$SH-all.log"
ln -s "$R/app.js" "$R/gates/logs/checks-$SH-all.log"
echo "PASS c-evil asserts nothing"
exit 0
EVIL
  commitin "$D" "a symlink plant with the guard AND the rename removed"
  MB5="$(md5sum "$D/app.js" | cut -c1-32)"
  runtier "$D" "$MB"
  MA5="$(md5sum "$D/app.js" | cut -c1-32)"
  if [ "$TRC" = 1 ] && [ "$MB5" != "$MA5" ]; then
    rec M21 ok "with the guard AND the rename removed the SNAPSHOT still refuses (exit $TRC) and the bundle IS rewritten - which is the harm the RENAME, not the verdict, prevents"
  elif [ "$TRC" = 1 ]; then
    rec M21 FAIL "both were removed and the write still did not reach the target, so neither layer is shown load-bearing"
  else
    rec M21 FAIL "with the write-target guard removed nothing refused the plant (exit $TRC)"
  fi
fi

# ── M22. REMOVE THE LOCK INODE from the integrity test: A29 must stop refusing.
D="$T/m-M22"; mkfix "$D"
printf '%s\t%s\n' '  if [ ! -d "$LOCK" ] || [ "$LOCKPID" != "$$" ] || [ "$LOCKSIG1" != "$LOCKSIG0" ]; then\n    say "REFUSED: the suite lock was removed, taken over or re-created while the battery ran."' '  if [ ! -d "$LOCK" ] || [ "$LOCKPID" != "$$" ]; then\n    say "REFUSED: the suite lock was removed, taken over or re-created while the battery ran."' | mkmut "$D/gates/checks-tier.sh"
if mutguard M22 "drop the lock inode+ctime check" "$D/gates/checks-tier.sh" '  if [ ! -d "$LOCK" ] || [ "$LOCKPID" != "$$" ]; then'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M22 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cat > "$D/gates/cases/c-handback.sh" <<'HB'
#!/usr/bin/env bash
R="__CTREAL__"; L="$R/gates/logs/.suite.lock"
P="$(cat "$L/pid" 2>/dev/null || echo none)"
rm -rf "$L"; mkdir -p "$L"; printf '%s\n' "$P" > "$L/pid"
echo "PASS c-handback asserts nothing"
exit 0
HB
  commitin "$D" "a lock handback with the inode check gone"
  runtier "$D" "$MB"
  if grep -qF "handed back rather than held" <<<"$TOUT"; then
    rec M22 FAIL "the inode check still fired with its term removed"
  else
    rec M22 ok "dropping the inode check turns A29: the handback is invisible to the pid test (exit $TRC)"
  fi
fi

# ── M23. REMOVE THE CONTROL TIMEOUT: A30 must stop reddening and the control must run to completion.
D="$T/m-M23"; mkfix "$D"
# D3 MOVED THIS: the control now runs under `setsid --wait` in its own process group, so the bound is carried
# into that group and the anchor is the line that carries it.
printf '%s\t%s\n' "$LAUNCHLINE" '          "$@" >&$ofd 2>&1 </dev/null ) &' | mkmut "$D/gates/checks-tier.sh"
if mutguard M23 "remove the per-control timeout" "$D/gates/checks-tier.sh" '          "$@" >&$ofd 2>&1 </dev/null ) &'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M23 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "#!/usr/bin/env bash" "sleep 6" "echo 'PASS slow but unbounded'" "exit 0" > "$D/gates/cases/c-slow.sh"
  commitin "$D" "a slow control with no bound"
  M23S="$(date -u +%s)"
  CT_CTL_TIMEOUT=3 runtier "$D" "$MB"
  M23E="$(date -u +%s)"
  if grep -qF "did not finish in" <<<"$TOUT"; then
    rec M23 FAIL "a timeout still fired with the timeout removed"
  elif [ "$((M23E-M23S))" -lt 5 ]; then
    rec M23 FAIL "the run finished in $((M23E-M23S))s, so the 6s control did not actually run and the mutant proves nothing"
  else
    rec M23 ok "removing the bound turns A30: a 6s control runs to completion under a 3s setting ($((M23E-M23S))s, exit $TRC)"
  fi
fi

# ── M24. REVERT `need` TO A FIXED-STRING `PASS`: A31's BYPASSED pose must stop being refused.
D="$T/m-M24"; mkfix "$D"
printf '%s\t%s\n' 'run_ctl "control $p" 0 "re:^PASS([[:space:]]|$)"' 'run_ctl "control $p" 0 "PASS"' | mkmut "$D/gates/checks-tier.sh"
if mutguard M24 "revert the control PASS test to a fixed string" "$D/gates/checks-tier.sh" 'run_ctl "control $p" 0 "PASS"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M24 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "#!/usr/bin/env bash" 'echo "all checks BYPASSED; nothing asserted"' "exit 0" > "$D/gates/cases/c-bypassed.sh"
  commitin "$D" "a BYPASSED control against a fixed-string need"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M24 ok "a fixed-string need turns A31: BYPASSED contains PASS and reaches GREEN (exit $TRC)"
  else
    rec M24 FAIL "the fixed-string need still refused the BYPASSED pose, so A31's first half has no mutant (exit $TRC)"
  fi
fi

# ── M25. REVERT THE FAIL FORBID to the previous narrower pattern: A31's mid-line FAIL pose must stop reddening.
D="$T/m-M25"; mkfix "$D"
printf '%s\t%s\n' '"(^|[^0-9[:space:]])[[:space:]]*FAIL|[1-9][0-9]*[[:space:]]*FAIL"' '"([1-9][0-9]*|^)[[:space:]]*FAIL"' | mkmut "$D/gates/checks-tier.sh"
if mutguard M25 "revert the FAIL forbid to the narrower pattern" "$D/gates/checks-tier.sh" '"([1-9][0-9]*|^)[[:space:]]*FAIL"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M25 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "#!/usr/bin/env bash" 'echo "PASS 1 ok"' 'echo "Result: FAIL - the key is off"' "exit 0" > "$D/gates/cases/c-midfail.sh"
  commitin "$D" "a mid-line FAIL against the old forbid"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M25 ok "the narrower forbid turns A31: a FAIL that is neither line-initial nor digit-prefixed passes (exit $TRC)"
  else
    rec M25 FAIL "the narrower forbid still caught the mid-line FAIL, so A31's third pose has no mutant (exit $TRC)"
  fi
fi

# ── M26. REVERT THE LIVE-LOCK ROUTE to `return 1`: A27 must stop routing.
D="$T/m-M26"; mkfix "$D"
printf '%s\t%s\n' 'once the other run has finished."\n      return 2' 'once the other run has finished."\n      return 1' | mkmut "$D/gates/checks-tier.sh"
if mutguard M26 "revert the live-lock route to a refusal" "$D/gates/checks-tier.sh" '      return 1'; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M26 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  mkdir -p "$D/gates/logs/.suite.lock"; printf '%s\n' "$$" > "$D/gates/logs/.suite.lock/pid"
  runtier "$D" "$MB"
  rm -rf "$D/gates/logs/.suite.lock"
  if [ "$TRC" = 2 ]; then
    rec M26 FAIL "the live lock still routed with the route reverted"
  else
    rec M26 ok "reverting the route turns A27: a live lock refuses at exit $TRC instead of routing"
  fi
fi

# ── M27. REVERT THE ACCEPTANCE md5 EXTRACTION to the unscoped whole-log grep: A33 must stop going green. This is
# the mutant for the round's second P1, and it reproduces the shipped defect exactly.
D="$T/m-M27"; mkfix "$D"
{ printf '%s\t%s\n' '    LOGMD5="$({ "${GIT[@]}" cat-file blob "$BASESHA:$GLOG" 2>/dev/null | grep '"'"'^ref: '"'"' || true; } \' '    LOGMD5="$({ "${GIT[@]}" cat-file blob "$BASESHA:$GLOG" 2>/dev/null | cat || true; } \'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M27 "revert the md5 extraction to the whole log" "$D/gates/checks-tier.sh" '| cat || true; } \'; then
  { printf 'PASS stub\n'
    printf 'PASS 12 measured against bundle md5 890f7a9b7b67 and bundle md5 5388547cb472 and bundle md5 bd8f31ddbc47\n'
    printf 'ref: HEAD 0000000000000000 | bundle md5 %s | origin/main 0\n' "$(md5sum "$D/app.js" | cut -c1-12)"
    printf 'GATES GREEN #500\n'; } > "$D/claude/agents/gatelogs/500-all.log"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M27 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M27 FAIL "the unscoped extraction still reached GREEN, so A33 does not test the scoping"
  else
    rec M27 ok "the unscoped extraction turns A33: prose md5s route the candidate away (exit $TRC)"
  fi
fi


# ══ ROUND 4. THE THIRD PAIR'S VETO: A HARDLINK IS NOT A SYMLINK, AND A PLANT AT AN EXISTING PATH IS INVISIBLE.
# Antagonist A of the third round reproduced BOTH halves. The guard added in round 3 tests `[ -L ]`, which is
# FALSE for a hard link, and the write then truncates and rewrites the shared inode - which is app.js. Two poses,
# and the second is the worse one by far:
#   X1  the log path does NOT pre-exist. The plant adds a line to the ignored listing, so the SNAPSHOT refuses
#       (exit 1) - and the write still happens, so the bundle is destroyed under a REFUSED verdict. That is
#       exactly the state mutant M21 exists to declare unacceptable.
#   X2  the log path ALREADY exists, which is true of any re-run of the tier at an unchanged HEAD - and the new
#       live-lock GO FULL text explicitly invites exactly that re-run. The control `rm`s and re-`ln`s a path the
#       `!!` ignored listing ALREADY enumerates, so the line is IDENTICAL in both snapshots: nothing added,
#       nothing removed, SNAPSHOT BLIND. Exit 0, CHECKS TIER GREEN, the sentence "the real tree was not touched"
#       printed, and app.js replaced by this run's own log text.
# THE DUTY-2 ANSWER THAT GENERALISES, and it is A's: every real-tree case in the battery plants something NEW,
# and `git status --porcelain --ignored` reports PRESENCE and not CONTENT for an ignored file - so a control that
# REPLACES a path the stream already lists is the one shape the no-exclusion snapshot is structurally blind to.
# The round-3 reasoning was "nothing needs excluding, because the lock cancels and the log is absent from both";
# the state it misses is "the log is PRESENT in both and is not the same file".

a35ctl(){ # a35ctl <dir> <linkcmd>  - writes the plant control; $2 is `ln` or `ln -s`
  cat > "$1/gates/cases/c-plant.sh" <<EVIL
#!/usr/bin/env bash
R="__CTREAL__"; SH="\$(git rev-parse --short HEAD)"
mkdir -p "\$R/gates/logs"; rm -f "\$R/gates/logs/checks-\$SH-all.log"
$2 "\$R/app.js" "\$R/gates/logs/checks-\$SH-all.log"
echo "PASS c-plant asserts nothing"
exit 0
EVIL
}

# ── A35. A HARDLINK AT AN ALREADY-EXISTING LOG PATH MUST NOT REACH A GREEN, AND MUST NOT REWRITE THE TARGET.
D="$T/a35"; mkfix "$D"
mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo 'PASS c-old holds'" "exit 0" > "$D/gates/cases/c-old.sh"
commitin "$D" "a base with one control"; B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
a35ctl "$D" "ln"
commitin "$D" "held.sh plus a control that HARDLINKS app.js at the log path"
A35SH="$(git -C "$D" rev-parse --short HEAD)"
# THE PRECONDITION IS THE WHOLE POINT: the log path already exists, as it does after any earlier tier run at
# this HEAD, so the ignored-listing line is present in BOTH snapshots.
mkdir -p "$D/gates/logs"; printf 'an earlier run of this tier wrote this\n' > "$D/gates/logs/checks-$A35SH-all.log"
A35B="$(md5sum "$D/app.js" | cut -c1-32)"
runtier "$D" "$B"
A35A="$(md5sum "$D/app.js" | cut -c1-32)"
A35WHY=""
[ "$TRC" = 0 ] && A35WHY="exit 0 - IT REACHED A GREEN"
[ "$A35B" = "$A35A" ] || A35WHY="${A35WHY:+$A35WHY; }app.js WAS REWRITTEN through the hard link"
grep -qF "CHECKS TIER GREEN" <<<"$TOUT" && A35WHY="${A35WHY:+$A35WHY; }the verdict says CHECKS TIER GREEN"
if [ -n "$A35WHY" ]; then
  rec A35 FAIL "a hardlink at an EXISTING log path :: $A35WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A35 ok "a hardlink at an existing log path is refused and app.js is untouched (exit $TRC)"
fi

# ── A36. THE SAME PLANT WITH NO PRE-EXISTING LOG PATH: the snapshot DOES see it, so the verdict was always
# right - and the TARGET must survive, which is the half round 3 claimed and did not deliver.
D="$T/a36"; mkfix "$D"
mkdir -p "$D/gates/cases"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
a35ctl "$D" "ln"
commitin "$D" "held.sh plus a hardlink plant at a FRESH log path"
A36B="$(md5sum "$D/app.js" | cut -c1-32)"
runtier "$D" "$FIXBASE"
A36A="$(md5sum "$D/app.js" | cut -c1-32)"
A36WHY=""
[ "$TRC" = 1 ] || A36WHY="exit $TRC, wanted 1"
[ "$A36B" = "$A36A" ] || A36WHY="${A36WHY:+$A36WHY; }app.js WAS REWRITTEN through the hard link"
if [ -n "$A36WHY" ]; then
  rec A36 FAIL "a hardlink plant at a fresh log path :: $A36WHY"
else
  rec A36 ok "a hardlink plant at a fresh log path is refused AND the target survives (exit $TRC)"
fi

# ── A37. A CONTROL THAT BACKGROUNDS A CHILD MUST STILL BE BOUNDED. Antagonist A's finding 2: `timeout` signals
# only its direct child, and a COMMAND SUBSTITUTION blocks until every holder of the pipe's write end exits - so
# `sleep 25 &` ran 25 seconds under a 3-second bound, reached PASS and a GREEN, with the real tree's suite lock
# held throughout. M23's control is a FOREGROUND sleep, so it measures timeout's ability to kill its own child
# and nothing about the pipe: the bound was on `timeout`, not on `run_ctl`.
D="$T/a37"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
printf '%s\n' "#!/usr/bin/env bash" "sleep 25 &" "echo 'PASS c-bg asserts nothing'" "exit 0" > "$D/gates/cases/c-bg.sh"
commitin "$D" "held.sh plus a control that backgrounds a long sleep"
A37S="$(date -u +%s)"
CT_CTL_TIMEOUT=3 runtier "$D" "$FIXBASE"
A37E="$(date -u +%s)"
if [ "$((A37E-A37S))" -ge 20 ]; then
  rec A37 FAIL "a backgrounded child outlived the 3s bound by design: the run took $((A37E-A37S))s"
else
  rec A37 ok "a control that backgrounds a child is still bounded ($((A37E-A37S))s, exit $TRC)"
fi


# ── A38. THE BASE MUST BE THE REPOSITORY'S OWN origin/main [fresh antagonist B, F3]. B reproduced a branch two
# commits past main where commit 1 changes gates/held.sh and commit 2 changes a BROWSER GATE: base=origin/main
# correctly answers GO FULL and names the gate, base=HEAD~1 answered CHECKS TIER GREEN - and the push then
# carries a changed browser gate nothing judged, because every arm compares HEAD against the base it was HANDED.
D="$T/a38"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
MID="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "// touched by a commit the tier is not asked about" >> "$D/gates/regress/01-x.js"
commitin "$D" "a BROWSER GATE change past the base the operator will pass"
# runtier points origin/main at whatever base it is given, so the ref is repointed to the REAL main AFTER it.
runtier "$D" "$MID"
git -C "$D" update-ref refs/remotes/origin/main "$FIXBASE" >/dev/null 2>&1
TF38="$(mktemp -d)"; git -C "$D" show "$MID:gates/checks-tier.sh" > "$TF38/ct.sh" 2>/dev/null
A38OUT="$(cd "$D" && bash "$TF38/ct.sh" "$MID" "$D" 2>&1)"; A38RC=$?
rm -rf "$TF38"
if [ "$A38RC" = 2 ] && grep -qF "refs/remotes/origin/main is" <<<"$A38OUT"; then
  rec A38 ok "a base that is not origin/main routes to the full suite and names both shas (exit $A38RC)"
else
  rec A38 FAIL "a mid-branch base was judged as though it were main (exit $A38RC)"
  printf '%s\n' "$A38OUT" | tail -6 | sed 's/^/          /'
fi

# ── A39. AN UNRELATED WRITER IN THE TREE ROUTES AND DOES NOT BLAME A CONTROL [fresh antagonist B, F4]. The
# snapshot arm used to answer exit 1 - "do not re-run hoping for a different answer" - and to assert that "a
# control ran wrote into the tree", on a tree where another session had written a doc. CLAUDE.md's own pen rule
# lets every other chat read, measure, test and write docs and flags in this repository, and the lock excludes
# gate suites and not that. Re-running is the fix, which exit 1 forbids.
D="$T/a39"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
printf '%s\n' "#!/usr/bin/env bash" "sleep 3" "echo 'PASS c-slowish holds'" "exit 0" > "$D/gates/cases/c-slowish.sh"
commitin "$D" "an honest candidate with a control that takes a moment"
( sleep 2; printf '%s\n' "a note another session wrote" > "$D/claude/SESSION-NOTE.md" ) &
A39BG=$!
runtier "$D" "$FIXBASE"
wait "$A39BG" 2>/dev/null || true
A39WHY=""
[ "$TRC" = 2 ] || A39WHY="exit $TRC, wanted 2"
grep -qF "SESSION-NOTE.md" <<<"$TOUT" || A39WHY="${A39WHY:+$A39WHY; }the verdict did not name the differing line"
grep -qF "Something a control ran wrote" <<<"$TOUT" && A39WHY="${A39WHY:+$A39WHY; }the verdict still blames a control"
if [ -n "$A39WHY" ]; then
  rec A39 FAIL "an unrelated writer during the battery :: $A39WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A39 ok "an unrelated untracked write ROUTES, names the line, and does not blame a control (exit $TRC)"
fi

# ── A40. THE GRAVE HALF OF THE SAME SPLIT: a planted HOOK is still a hard refusal. If every real-tree change
# routed, the softer verdict would have bought B's F4 at the price of the thing the arm exists for.
D="$T/a40"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-hook.sh" <<'HK'
#!/usr/bin/env bash
R="__CTREAL__"
printf '%s\n' '#!/bin/sh' 'echo planted' > "$R/.git/hooks/post-commit"
chmod +x "$R/.git/hooks/post-commit"
echo "PASS c-hook asserts nothing"
exit 0
HK
commitin "$D" "held.sh plus a control that plants a post-commit hook"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qF "hook" <<<"$TOUT"; then
  rec A40 ok "a planted hook is a HARD refusal and the verdict names it (exit $TRC)"
else
  rec A40 FAIL "a planted hook did not produce a hard refusal (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── A41. A DIRECTORY AT THE LOG PATH MUST NOT BE A SILENT GREEN [fresh antagonist B, F2]. No link is needed:
# an empty ignored directory is invisible to `git status`, the write then fails, and `> "$OUT" 2>/dev/null &&
# printf ' log: ...'` swallowed it - exit 0, CHECKS TIER GREEN, and NO LOG FILE EXISTS. The audit artefact the
# whole design rests on was removable by the commit under judgement.
D="$T/a41"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-nolog.sh" <<'NL'
#!/usr/bin/env bash
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
mkdir -p "$R/gates/logs/checks-$SH-all.log"
echo "PASS c-nolog asserts nothing"
exit 0
NL
commitin "$D" "held.sh plus a control that puts a DIRECTORY at the log path"
runtier "$D" "$FIXBASE"
# D2 REPLACED THREE PROBES OF WHAT IS AT THE NAME WITH ONE RULE - nothing may be there - so the sentence this
# case reads changed with it. The assertion is the same one: a directory at the log path is a REFUSAL with a
# reason, never a silent green, and the reason names what it found.
if [ "$TRC" = 1 ] && grep -qF "NOT a regular file" <<<"$TOUT"; then
  rec A41 ok "a directory at the log path is refused and the verdict says why (exit $TRC)"
else
  rec A41 FAIL "a directory at the log path did not refuse with a reason (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M29. REMOVE THE BASE-vs-origin/main ARM: A38 must stop routing.
D="$T/m-M29"; mkfix "$D"
printf '%s\t%s\n' '  if [ "$ORIGINMAIN" != "$BASESHA" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M29 "remove the base-vs-origin/main arm" "$D/gates/checks-tier.sh" '    return 0'; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M29 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  MID29="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "// touched" >> "$D/gates/regress/01-x.js"; commitin "$D" "a browser gate past the base"
  git -C "$D" update-ref refs/remotes/origin/main "$MB" >/dev/null 2>&1
  TF29="$(mktemp -d)"; git -C "$D" show "$MB:gates/checks-tier.sh" > "$TF29/ct.sh" 2>/dev/null
  O29="$(cd "$D" && bash "$TF29/ct.sh" "$MID29" "$D" 2>&1)"; R29=$?
  rm -rf "$TF29"
  if grep -qF "refs/remotes/origin/main is" <<<"$O29"; then
    rec M29 FAIL "the base-vs-main arm still fired with its branch removed"
  else
    rec M29 ok "removing the base-vs-main arm turns A38: a mid-branch base is judged as main (exit $R29)"
  fi
fi

# ── M30. KEEP THE GUARD AND RESTORE THE IN-PLACE WRITE: the guard alone must still protect the target. The
# complement of M21, so each of the two layers is measured without the other.
D="$T/m-M30"; mkfix "$D"
printf '%s\t%s\n' '  elif writelog; then' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$OUT" 2>/dev/null; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M30 "restore the in-place write, keep the guard" "$D/gates/checks-tier.sh" '> "$OUT" 2>/dev/null; then'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M30 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  a35ctl "$D" "ln"
  commitin "$D" "a hardlink plant against the in-place write"
  M30B="$(md5sum "$D/app.js" | cut -c1-32)"
  runtier "$D" "$MB"
  M30A="$(md5sum "$D/app.js" | cut -c1-32)"
  if [ "$M30B" = "$M30A" ]; then
    rec M30 ok "with the rename gone the write-target GUARD alone still protects the target (exit $TRC)"
  else
    rec M30 FAIL "the guard did not protect the target on its own, so M21 and M30 do not separate the layers"
  fi
fi

# ══ ROUND 4's OWN CASES. ONE PER PROPERTY D1, D2 AND D4 ADD, EACH WITH A MUTANT. ═══════════════════════════════
# THE SHAPE OF THESE SIX IS DIFFERENT FROM EVERY CASE ABOVE AND THAT IS THE POINT. Rounds 2, 3 and 5 all found
# the same defect - the judge's own write landing somewhere else - and each repair was a GUARD that reported the
# plant. Round 4's remedy is STRUCTURAL: the plant cannot land, because nothing the judge writes has a name a
# control can compute. So the assertion is no longer "the verdict refuses": it is THE REAL TREE IS UNCHANGED,
# and a GREEN is an acceptable outcome provided the log is a regular file the judge itself created. A case that
# only read the exit code could not tell the difference between a guard that reported the harm and a design in
# which the harm never happened.

# ── A42. D1: NO CONTROL'S CLONE NAMES THE REAL TREE. The control is the assertion: it FAILS if its own
# remote.origin.url or its alternates file points at the repository under judgement, which is how all three of
# the P1s in rounds 2, 3 and 5 reached it. An honest judge therefore goes GREEN here, and M31 turns it.
D="$T/a42"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-isolated.sh" <<'ISO'
#!/usr/bin/env bash
R="__CTREAL__"
U="$(git config --get remote.origin.url 2>/dev/null || echo none)"
A="$(cat .git/objects/info/alternates 2>/dev/null || echo none)"
case "$U" in
  "$R"|"$R"/*|"$R".|"$R"/.) echo "FAIL this control's origin IS the tree under judgement: $U"; exit 1 ;;
esac
# THE SECOND HOP, AND BOTH DOORS OF THE FIRST PAIR ASKED FOR IT INDEPENDENTLY. This case asserted only that
# the control's OWN origin is not the real tree - which the mirror satisfies by construction - so it passed
# while `git -C "$(git config --get remote.origin.url)" config --get remote.origin.url` returned the real
# root, because a clone records where it came from. "The assertion was satisfied by something other than
# what it names", in antagonist A's words, about the case written to assert the removal.
H2="$(git -C "$U" config --get remote.origin.url 2>/dev/null || echo none)"
case "$H2" in
  "$R"|"$R"/*|"$R".|"$R"/.) echo "FAIL the mirror names the tree under judgement, so two hops reach it: $H2"; exit 1 ;;
esac
case "$A" in
  "$R"|"$R"/*) echo "FAIL this control's alternates point into the tree under judgement: $A"; exit 1 ;;
esac
echo "PASS isolated from the real tree (origin=$U alternates=$A)"
exit 0
ISO
commitin "$D" "held.sh plus a control that asserts it cannot see the real tree"
expect A42 "$D" "$FIXBASE" 0 "CHECKS TIER GREEN" "no control's clone names the real tree as its origin or alternates"

# ── M31. PUT `--shared "$ROOT"` BACK: A42's control must FAIL, so the tier goes RED.
D="$T/m-M31"; mkfix "$D"
printf '%s\t%s\n' '    git clone --quiet --no-hardlinks --shared "$MIRROR" "$dest" >/dev/null 2>&1 || return 1' '    git clone --quiet --no-hardlinks --shared "$ROOT" "$dest" >/dev/null 2>&1 || return 1' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M31 "clone the controls from the real root again" "$D/gates/checks-tier.sh" '--shared "$ROOT" "$dest"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M31 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a42/gates/cases/c-isolated.sh" "$D/gates/cases/c-isolated.sh" 2>/dev/null
  sed -i "s|$T/a42|$D|g" "$D/gates/cases/c-isolated.sh" 2>/dev/null
  commitin "$D" "the isolation control over the mutant base"
  runtier "$D" "$MB"
  if [ "$TRC" = 1 ] && grep -qF "origin IS the tree under judgement" <<<"$TOUT"; then
    rec M31 ok "cloning from the real root turns A42: the control sees the tree under judgement (exit $TRC)"
  else
    rec M31 FAIL "the isolation arm is not load-bearing: A42 did not turn (exit $TRC)"
    printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
  fi
fi

# ── A43. D2: THE FIFTH ROUND'S P1(b). run_ctl wrote each control's output to `$WORK/ctl-$CTLN.out`, and a
# control's cwd is `$WORK/c$CTLN`, so $WORK is one `dirname` away from every control. The pose pre-plants links
# at every guessable output name and the NEXT control's stdout is written through one. mktemp in the private
# directory leaves nothing to pre-plant: the real tree must be untouched and the log must be the judge's own.
D="$T/a43"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-aaa-plant.sh" <<'PL'
#!/usr/bin/env bash
R="__CTREAL__"
W="$(dirname "$PWD")"
for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  rm -f "$W/ctl-$n.out" 2>/dev/null
  ln -s "$R/app.js" "$W/ctl-$n.out" 2>/dev/null || true
done
echo "PASS c-aaa-plant asserts nothing"
exit 0
PL
cat > "$D/gates/cases/c-zzz-victim.sh" <<'VIC'
#!/usr/bin/env bash
echo "PASS c-zzz-victim is the control whose output the plant wanted"
exit 0
VIC
commitin "$D" "held.sh plus a control that pre-plants links at every control output name"
A43MD5BEFORE="$(md5sum "$D/app.js" | cut -c1-32)"
runtier "$D" "$FIXBASE"
A43MD5AFTER="$(md5sum "$D/app.js" | cut -c1-32)"
A43SH="$(git -C "$D" rev-parse --short HEAD)"
A43WHY=""
[ "$A43MD5BEFORE" = "$A43MD5AFTER" ] || A43WHY="app.js WAS REWRITTEN through a planted output link"
[ "$TRC" = 0 ] || A43WHY="${A43WHY:+$A43WHY; }exit $TRC, wanted 0"
[ -f "$D/gates/logs/checks-$A43SH-all.log" ] || A43WHY="${A43WHY:+$A43WHY; }the run left no regular log file"
[ -L "$D/gates/logs/checks-$A43SH-all.log" ] && A43WHY="${A43WHY:+$A43WHY; }the log is a symlink"
if [ -n "$A43WHY" ]; then
  rec A43 FAIL "links at every control output name :: $A43WHY"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
else
  rec A43 ok "links pre-planted at every guessable control output name reach nothing; the tree is untouched and the log is the judge's own (exit $TRC)"
fi

# ── M32. PUT `$WORK/ctl-$CTLN.out` BACK (and the existence check with it, or every control reds for a reason
# that is not the arm): A43's plant must reach app.js.
D="$T/m-M32"; mkfix "$D"
# BOTH HALVES COME BACK: the DERIVED NAME (the fifth round's P1(b)) and the write THROUGH that name rather
# than through a descriptor (antagonist A's P1(d) of this round). The two are one mutation now, because
# ctl_exec creates the file and opens it in the same two lines.
{ printf '%s\t%s\n' '    outf="$(mktemp "$PRIV/ctl-XXXXXXXXXX.out" 2>/dev/null)" || return 125' '    outf="$WORK/ctl-$CTLN.out"; : > "$outf"'
  printf '%s\t%s\n' "$LAUNCHLINE" '          timeout "$bound" "$@" >"$outf" 2>&1 </dev/null ) &'
  printf '%s\t%s\n' '    CTL_OUT="$(cat "/proc/self/fd/$ofd" 2>/dev/null || true)"' '    CTL_OUT="$(cat "$outf" 2>/dev/null || true)"'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M32 "put the derived control output name and the write through it back" "$D/gates/checks-tier.sh" '    outf="$WORK/ctl-$CTLN.out"; : > "$outf"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M32 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a43/gates/cases/c-aaa-plant.sh" "$D/gates/cases/c-aaa-plant.sh" 2>/dev/null
  cp "$T/a43/gates/cases/c-zzz-victim.sh" "$D/gates/cases/c-zzz-victim.sh" 2>/dev/null
  sed -i "s|$T/a43|$D|g" "$D/gates/cases/c-aaa-plant.sh" 2>/dev/null
  commitin "$D" "the plant over the mutant base"
  M32B="$(md5sum "$D/app.js" | cut -c1-32)"
  runtier "$D" "$MB"
  M32A="$(md5sum "$D/app.js" | cut -c1-32)"
  if [ "$M32B" != "$M32A" ]; then
    rec M32 ok "the derived output name turns A43: a later control's stdout lands in app.js (exit $TRC)"
  else
    rec M32 FAIL "the output name is not load-bearing: the plant reached nothing even with it restored (exit $TRC)"
  fi
fi

# ── A44. D2: THE FIFTH ROUND'S P1(a), AND THE ONE-CHARACTER MISS. The old temporary was
# `gates/logs/.checks-$SHORT-$$.tmp`, and BOTH of its components were published by the judge itself - $LOCK/pid
# holds `$$` and $LOCK/log holds `checks-tier $SHORT` - so the control reads the pid out of the lock, plants a
# link at that exact name, and the old `>` followed it into app.js at exit 2, a ROUTE. Nothing writes there any
# more. The plant is ALSO the case for the grave classifier's `\.?checks-`: it lands in the judge's own
# namespace and so is a REFUSAL, not a route, which is the half the round-3 regex missed by one character.
D="$T/a44"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-tmplink.sh" <<'TL'
#!/usr/bin/env bash
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
P="$(cat "$R/gates/logs/.suite.lock/pid" 2>/dev/null || echo 0)"
mkdir -p "$R/gates/logs"
rm -f "$R/gates/logs/.checks-$SH-$P.tmp" 2>/dev/null
ln -s "$R/app.js" "$R/gates/logs/.checks-$SH-$P.tmp" 2>/dev/null || true
echo "PASS c-tmplink asserts nothing"
exit 0
TL
commitin "$D" "held.sh plus a control that plants a link at the judge's old temporary name"
A44MD5BEFORE="$(md5sum "$D/app.js" | cut -c1-32)"
runtier "$D" "$FIXBASE"
A44MD5AFTER="$(md5sum "$D/app.js" | cut -c1-32)"
A44WHY=""
[ "$A44MD5BEFORE" = "$A44MD5AFTER" ] || A44WHY="app.js WAS REWRITTEN through the planted temporary"
[ "$TRC" = 1 ] || A44WHY="${A44WHY:+$A44WHY; }exit $TRC, wanted 1 (a plant in the judge's own namespace is grave, not a route)"
grep -qF ".checks-" <<<"$TOUT" || A44WHY="${A44WHY:+$A44WHY; }the verdict does not name the planted line"
if [ -n "$A44WHY" ]; then
  rec A44 FAIL "a link at the old temporary name :: $A44WHY"
  printf '%s\n' "$TOUT" | tail -12 | sed 's/^/          /'
else
  rec A44 ok "a link at the old temporary name reaches nothing, is named, and is GRAVE rather than routed (exit $TRC)"
fi

# ── M33. PUT THE DERIVED TEMPORARY AND THE IN-PLACE `>` BACK, which is round 3's write exactly: the verdict may
# still refuse, and the BUNDLE MUST BE REWRITTEN - the harm the mktemp write, not the verdict, now prevents.
D="$T/m-M33"; mkfix "$D"
printf '%s\t%s\n' '  elif writelog; then' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$ROOT/gates/logs/.checks-$SHORT-$$.tmp" 2>/dev/null && mv -f -- "$ROOT/gates/logs/.checks-$SHORT-$$.tmp" "$OUT" 2>/dev/null; then' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M33 "restore the derived temporary and the in-place write" "$D/gates/checks-tier.sh" '.checks-$SHORT-$$.tmp'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M33 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a44/gates/cases/c-tmplink.sh" "$D/gates/cases/c-tmplink.sh" 2>/dev/null
  sed -i "s|$T/a44|$D|g" "$D/gates/cases/c-tmplink.sh" 2>/dev/null
  commitin "$D" "the temporary plant over the mutant base"
  M33B="$(md5sum "$D/app.js" | cut -c1-32)"
  runtier "$D" "$MB"
  M33A="$(md5sum "$D/app.js" | cut -c1-32)"
  if [ "$M33B" != "$M33A" ]; then
    rec M33 ok "the derived temporary turns A44: the write follows the link and app.js is replaced (exit $TRC)"
  else
    rec M33 FAIL "the temporary's name is not load-bearing: the plant reached nothing with it restored (exit $TRC)"
  fi
fi

# ── A45. D2: AN EMPTY DIRECTORY AT THE OLD TEMPORARY NAME, which is the fifth round's P2(2): it made ONE run
# print BOTH `CHECKS TIER GREEN` and `CHECKS TIER RED:` and leave NO log file, and `git status` never lists an
# empty directory so the snapshot stayed clean. The judge writes nowhere near that name now, so the run must be
# an ordinary green with a regular log file - and that is the assertion, not a refusal.
D="$T/a45"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-tmpdir.sh" <<'TD'
#!/usr/bin/env bash
R="__CTREAL__"; SH="$(git rev-parse --short HEAD)"
P="$(cat "$R/gates/logs/.suite.lock/pid" 2>/dev/null || echo 0)"
mkdir -p "$R/gates/logs/.checks-$SH-$P.tmp"
echo "PASS c-tmpdir asserts nothing"
exit 0
TD
commitin "$D" "held.sh plus a control that puts an empty directory at the old temporary name"
runtier "$D" "$FIXBASE"
A45SH="$(git -C "$D" rev-parse --short HEAD)"
A45WHY=""
[ "$TRC" = 0 ] || A45WHY="exit $TRC, wanted 0"
grep -qF "CHECKS TIER GREEN" <<<"$TOUT" || A45WHY="${A45WHY:+$A45WHY; }no green verdict"
grep -qF "CHECKS TIER RED" <<<"$TOUT" && A45WHY="${A45WHY:+$A45WHY; }the run printed BOTH a green and a red"
[ -f "$D/gates/logs/checks-$A45SH-all.log" ] || A45WHY="${A45WHY:+$A45WHY; }the run left no regular log file"
if [ -n "$A45WHY" ]; then
  rec A45 FAIL "an empty directory at the old temporary name :: $A45WHY"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
else
  rec A45 ok "an empty directory at the old temporary name is inert: one verdict, and a regular log file (exit $TRC)"
fi

# ── A46. D4: A CONTROL REWRITES A PRE-EXISTING IGNORED GATE LOG, KEEPING ITS NAME AND ITS SIZE. This is the
# fifth round's P1(c), reproduced there with a log whose text afterwards read "ALL EVIDENCE REMOVED BY A
# CONTROL" while the run printed EXIT 0, CHECKS TIER GREEN and "the real tree was not touched". The snapshot
# hashed the NAME SET and not the BYTES. EVIDENCE lines carry a content hash, and a file that existed at the
# first snapshot and changed is GRAVE - a route would not do, because a route is still not a refusal of the
# thing that destroyed the evidence.
D="$T/a46"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-evidence.sh" <<'EV'
#!/usr/bin/env bash
R="__CTREAL__"
F="$R/gates/logs/earlier-run-all.log"
[ -f "$F" ] || { echo "PASS nothing to rewrite"; exit 0; }
N="$(wc -c < "$F" | tr -d ' ')"
python3 -I -c "
import sys
n=int(sys.argv[2])
open(sys.argv[1],'w').write(('EVIDENCE REWRITTEN BY A CONTROL '*200)[:n])
" "$F" "$N" 2>/dev/null || true
echo "PASS c-evidence asserts nothing"
exit 0
EV
mkdir -p "$D/gates/logs"
printf 'PASS an earlier run of the suite\nGATES GREEN #499\n' > "$D/gates/logs/earlier-run-all.log"
commitin "$D" "held.sh plus a control that rewrites an existing ignored gate log in place"
A46SZBEFORE="$(wc -c < "$D/gates/logs/earlier-run-all.log" | tr -d ' ')"
runtier "$D" "$FIXBASE"
A46WHY=""
[ "$TRC" = 1 ] || A46WHY="exit $TRC, wanted 1"
grep -qF "the real tree CHANGED" <<<"$TOUT" || A46WHY="${A46WHY:+$A46WHY; }the verdict does not say the tree changed"
# THE PATTERN IS THE DIFF LINE AND NOT THE WORD [antagonist A, P3(1)]: `grep -qF "EVIDENCE"` was satisfied by
# the refusal's own boilerplate, which carries the literal word on EVERY grave refusal - A measured it passing
# on A47's dotfile case, where the matching line reads "0 name an EVIDENCE file ... that existed before the
# battery". A vacuous conjunct inside the case written for content hashing.
grep -qE '^ +[<>] EVIDENCE ' <<<"$TOUT" || A46WHY="${A46WHY:+$A46WHY; }the verdict names no EVIDENCE diff line"
A46SZAFTER="$(wc -c < "$D/gates/logs/earlier-run-all.log" | tr -d ' ')"
[ "$A46SZBEFORE" = "$A46SZAFTER" ] || A46WHY="${A46WHY:+$A46WHY; }the rewrite did not keep the size, so this case does not test content hashing"
if [ -n "$A46WHY" ]; then
  rec A46 FAIL "a rewritten existing gate log :: $A46WHY"
  printf '%s\n' "$TOUT" | tail -12 | sed 's/^/          /'
else
  rec A46 ok "a same-name same-size rewrite of an existing gate log is GRAVE and the EVIDENCE line is named (exit $TRC)"
fi

# ── M34. SNAPSHOT THE EVIDENCE SET BY NAME ONLY, which is exactly what round 3 did: A46 must stop refusing.
D="$T/m-M34"; mkfix "$D"
printf '%s\t%s\n' '        h="$(sha256sum < "$f" 2>/dev/null | cut -c1-64)"' '        h=names-only-no-content-hash' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M34 "hash the evidence set by name only" "$D/gates/checks-tier.sh" 'h=names-only-no-content-hash'; then
  mkdir -p "$D/gates/cases" "$D/gates/logs"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M34 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a46/gates/cases/c-evidence.sh" "$D/gates/cases/c-evidence.sh" 2>/dev/null
  sed -i "s|$T/a46|$D|g" "$D/gates/cases/c-evidence.sh" 2>/dev/null
  printf 'PASS an earlier run of the suite\nGATES GREEN #499\n' > "$D/gates/logs/earlier-run-all.log"
  commitin "$D" "the evidence rewrite over the mutant base"
  runtier "$D" "$MB"
  # WHAT THIS MUTANT TURNS IS THE VERDICT AND NOT THE DETECTION, AND MEASURING IT SAID SO RATHER THAN MY FIRST
  # GUESS. I expected exit 0 - a same-size rewrite going green, as it did in the fifth round - and it reads
  # exit 2 instead. The reason is D4's own UNTRACKED line, which carries the inode, the SIZE and the CTIME TO
  # THE NANOSECOND: a rewrite moves the ctime even when the name and the size are kept, so the change is still
  # NOTICED with the content hash removed. What the content hash supplies is the CLASS: with it the rewrite is
  # an EVIDENCE file that existed and changed, which is GRAVE; without it the only differing line is UNTRACKED,
  # which ROUTES. So the arm is load-bearing - A46 asks for exit 1 and the mutant cannot reach it - and the
  # honest statement of what it buys is "a refusal instead of a route", not "detection instead of blindness".
  # ROUND 3 WAS FULLY BLIND HERE and this mutant does not reproduce that, because it keeps D4's stat line: the
  # round-3 snapshot listed untracked paths by NAME ONLY, with no stat and no hash at all.
  if [ "$TRC" != 1 ]; then
    rec M34 ok "hashing the evidence set by name turns A46: the rewrite becomes a ROUTE, not a refusal (exit $TRC, honest is 1)"
  else
    rec M34 FAIL "the content hash is not load-bearing: the name-only snapshot still refused (exit $TRC)"
    printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
  fi
fi

# ── A47. D4: A CONTROL EDITS A DOTFILE OUTSIDE THE REPOSITORY BY ABSOLUTE PATH. The OUTSIDE set exists because
# a control that cannot reach the repository can still reach the OPERATOR - ~/.bashrc, ~/.npmrc, the global git
# config - and nothing in rounds 1 to 4 looked outside the checkout at all. $DRIVEHOME gives the judge a
# throwaway HOME so this case proves the arm without touching the real one.
D="$T/a47"; mkfix "$D"
DRIVEHOME="$T/fakehome-a47"; mkdir -p "$DRIVEHOME"
printf '%s\n' "# a real dotfile" "export PS1='$ '" > "$DRIVEHOME/.bashrc"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-dotfile.sh" <<'DF'
#!/usr/bin/env bash
H="__CTHOME__"
printf '%s\n' "# appended by a control" >> "$H/.bashrc" 2>/dev/null || true
echo "PASS c-dotfile asserts nothing"
exit 0
DF
sed -i "s|__CTHOME__|$DRIVEHOME|g" "$D/gates/cases/c-dotfile.sh"
commitin "$D" "held.sh plus a control that appends to a dotfile outside the repository"
runtier "$D" "$FIXBASE"
A47WHY=""
[ "$TRC" = 1 ] || A47WHY="exit $TRC, wanted 1"
grep -qF "OUTSIDE" <<<"$TOUT" || A47WHY="${A47WHY:+$A47WHY; }the verdict does not name an OUTSIDE line"
if [ -n "$A47WHY" ]; then
  rec A47 FAIL "a control editing a dotfile outside the repository :: $A47WHY"
  printf '%s\n' "$TOUT" | tail -12 | sed 's/^/          /'
else
  rec A47 ok "a control appending to ~/.bashrc by absolute path is GRAVE and the OUTSIDE line is named (exit $TRC)"
fi
DRIVEHOME=""

# ══ ROUND 4's D3, D5 AND D6 CASES. ════════════════════════════════════════════════════════════════════════════

# ── A48. D3: A CONTROL CANNOT REACH THE OPERATOR'S GIT CONFIG. The fifth round's P2(1): a GLOBAL
# `core.hooksPath` needs no file in the repository at all and fires at the NEXT commit anywhere on the machine,
# and the round-3 classifier knew only the .git/config INI shape while `git config --global --list` emits
# `key.sub=value`. D3 gives every control GIT_CONFIG_GLOBAL into its own throwaway directory, so the write
# cannot land; D4's OUTSIDE lines are the second layer if it ever does. THE ASSERTION IS THAT THE REAL FILE IS
# UNCHANGED, and the run is then an ordinary green - $DRIVEHOME keeps "real" meaning a fake home.
D="$T/a48"; mkfix "$D"
DRIVEHOME="$T/fakehome-a48"; mkdir -p "$DRIVEHOME"
printf '%s\n' "[user]" "	name = the operator" > "$DRIVEHOME/.gitconfig"
A48BEFORE="$(md5sum "$DRIVEHOME/.gitconfig" | cut -c1-32)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-hookspath.sh" <<'HP'
#!/usr/bin/env bash
git config --global core.hooksPath /tmp/evil-hooks 2>/dev/null || true
echo "PASS c-hookspath asserts nothing"
exit 0
HP
commitin "$D" "held.sh plus a control that sets a GLOBAL core.hooksPath"
runtier "$D" "$FIXBASE"
A48AFTER="$(md5sum "$DRIVEHOME/.gitconfig" | cut -c1-32)"
A48WHY=""
[ "$A48BEFORE" = "$A48AFTER" ] || A48WHY="the operator's ~/.gitconfig WAS REWRITTEN by a control"
[ "$TRC" = 0 ] || A48WHY="${A48WHY:+$A48WHY; }exit $TRC, wanted 0"
if [ -n "$A48WHY" ]; then
  rec A48 FAIL "a control setting a global core.hooksPath :: $A48WHY"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
else
  rec A48 ok "a control's \`git config --global\` lands in its own throwaway home and the operator's config is untouched (exit $TRC)"
fi
DRIVEHOME=""

# ── M35. TAKE THE ENVIRONMENT ISOLATION OUT: A48's write must reach the home the judge can see.
D="$T/m-M35"; mkfix "$D"
# BOTH HOME AND GIT_CONFIG_GLOBAL COME OUT, AND THAT IS A CORRECTION OF MY OWN FIRST VERSION OF THIS MUTANT,
# which removed GIT_CONFIG_GLOBAL alone and CHANGED NOTHING - measured, 0 moved and 0 refused. With HOME still
# pointing at the control's own throwaway directory, `git config --global` fell back to $HOME/.gitconfig and
# wrote there, which is a throwaway file either way. The mutant proved the arm load-bearing only once it
# removed the variable that actually isolates it: "the numbers moved but not past the line", inside a mutant.
{ printf '%s\t%s\n' '          HOME="$chome" TMPDIR="$chome" XDG_CONFIG_HOME="$chome/xdg" \' '          TMPDIR="$chome" \'
  printf '%s\t%s\n' '          GIT_CONFIG_GLOBAL="$cgit" GIT_CONFIG_NOSYSTEM=1 \' '          GIT_CONFIG_NOSYSTEM=1 \'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M35 "drop HOME and GIT_CONFIG_GLOBAL from the control's environment" "$D/gates/checks-tier.sh" '          TMPDIR="$chome" \'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M35 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a48/gates/cases/c-hookspath.sh" "$D/gates/cases/c-hookspath.sh" 2>/dev/null
  commitin "$D" "the hooksPath control over the mutant base"
  DRIVEHOME="$T/fakehome-m35"; mkdir -p "$DRIVEHOME"
  printf '%s\n' "[user]" "	name = the operator" > "$DRIVEHOME/.gitconfig"
  M35B="$(md5sum "$DRIVEHOME/.gitconfig" | cut -c1-32)"
  runtier "$D" "$MB"
  M35A="$(md5sum "$DRIVEHOME/.gitconfig" | cut -c1-32)"
  # HOME still points at the throwaway, so with GIT_CONFIG_GLOBAL gone git falls back to $HOME/.gitconfig -
  # which in this case IS the home the judge snapshots. Either the file moves or the OUTSIDE arm refuses; both
  # are the arm doing its job, and a clean green with the file untouched is the only failure.
  if [ "$M35B" != "$M35A" ] || [ "$TRC" = 1 ]; then
    rec M35 ok "without GIT_CONFIG_GLOBAL the control reaches the judge's own HOME and the OUTSIDE arm speaks (exit $TRC, config moved: $([ "$M35B" != "$M35A" ] && echo yes || echo no))"
  else
    rec M35 FAIL "the environment isolation is not load-bearing: nothing moved and nothing refused (exit $TRC)"
  fi
  DRIVEHOME=""
fi

# ── A49. D3: A CONTROL THAT OUTLIVES ITSELF IS GRAVE. run_ctl's own round-3 comment admitted this in terms -
# "the orphaned background process keeps running ... killing a whole process group is a bigger change than
# this" - and left it. A process that survives the battery can write into the real tree AFTER the snapshot that
# is supposed to prove nothing did, so the judge must refuse rather than note it. `setsid` is the escape the
# process-group kill cannot see, which is why the marker scan exists beside it.
D="$T/a49"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-survivor.sh" <<'SV'
#!/usr/bin/env bash
setsid sleep 600 >/dev/null 2>&1 &
echo "PASS c-survivor asserts nothing"
exit 0
SV
commitin "$D" "held.sh plus a control that leaves a setsid process behind"
runtier "$D" "$FIXBASE"
A49WHY=""
[ "$TRC" = 1 ] || A49WHY="exit $TRC, wanted 1"
grep -qF "OUTLIVED" <<<"$TOUT" || A49WHY="${A49WHY:+$A49WHY; }the verdict does not say a process outlived its control"
if [ -n "$A49WHY" ]; then
  rec A49 FAIL "a control that leaves a setsid process behind :: $A49WHY"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
else
  rec A49 ok "a control that escapes its process group is found by its marker and is RED (exit $TRC)"
fi
# NEVER `pkill -f` A PATTERN THIS SCRIPT'S OWN COMMAND LINE CARRIES - #531 killed its own shell that way
# twice in one hour. These are matched by ARGV EQUALITY through ps and killed BY PID.
while IFS= read -r svpid; do [ -n "$svpid" ] && kill -TERM "$svpid" 2>/dev/null || true
done < <(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="sleep" && $3=="600" {print $1}')

# ── M36. REMOVE THE MARKER SCAN: A49 must stop reddening.
D="$T/m-M36"; mkfix "$D"
printf '%s\t%s\n' '    surv="$(ctl_survivors)"' '    surv=""' | mkmut "$D/gates/checks-tier.sh"
if mutguard M36 "remove the per-control survivor scan" "$D/gates/checks-tier.sh" '    surv=""'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M36 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a49/gates/cases/c-survivor.sh" "$D/gates/cases/c-survivor.sh" 2>/dev/null
  commitin "$D" "the survivor control over the mutant base"
  runtier "$D" "$MB"
  # The END-OF-RUN scan is a separate arm and is still in place, so the honest verdict is still 1 - what this
  # mutant proves is that the PER-CONTROL scan is what names the control responsible. Measured either way.
  if grep -qF "OUTLIVED" <<<"$TOUT"; then
    rec M36 FAIL "the per-control scan is not load-bearing: a control was still named as having outlived itself (exit $TRC)"
  else
    rec M36 ok "removing the per-control scan turns A49's own message: no control is named (exit $TRC, the end-of-run arm still speaks)"
  fi
  # NEVER `pkill -f` A PATTERN THIS SCRIPT'S OWN COMMAND LINE CARRIES - #531 killed its own shell that way
# twice in one hour. These are matched by ARGV EQUALITY through ps and killed BY PID.
while IFS= read -r svpid; do [ -n "$svpid" ] && kill -TERM "$svpid" 2>/dev/null || true
done < <(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="sleep" && $3=="600" {print $1}')
fi

# ── A50. D5: AN UNTRACKED PATH AT ENTRY ROUTES AND IS NAMED. The fifth round called this "the TENTH FALSE
# HARD-REFUSE AND IT FIRES TODAY": exit 1 means "do not re-run hoping for a different answer", and CLAUDE.md's
# pen rule expressly lets every other chat in this project write docs and flags in this repository. The battery
# never reads the working tree at all - every control and harness runs in a clone checked out at HEAD.
D="$T/a50"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "a note another session left" > "$D/claude/SESSION-NOTE.md"
runtier "$D" "$FIXBASE"
A50WHY=""
[ "$TRC" = 2 ] || A50WHY="exit $TRC, wanted 2"
grep -qF "SESSION-NOTE.md" <<<"$TOUT" || A50WHY="${A50WHY:+$A50WHY; }the verdict does not name the untracked path"
if [ -n "$A50WHY" ]; then
  rec A50 FAIL "an untracked path at entry :: $A50WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A50 ok "an untracked path at entry ROUTES and is named, instead of hard-refusing an honest commit (exit $TRC)"
fi
rm -f "$D/claude/SESSION-NOTE.md"

# ── M37. PUT THE UNDIVIDED ENTRANCE REFUSAL BACK: A50 must go back to exit 1.
D="$T/m-M37"; mkfix "$D"
# THE ANCHOR CARRIES NO LITERAL BACKSLASH-n, because mkmut translates one into a NEWLINE and an anchor
# holding `%s\n` cannot match the single line it came from. Three mutants of this build hit that.
# RE-ANCHORED BY #542 for the same reason as M1: the ` | grep -vE '^?? ' || true)"` this used to mutate was
# removed by the entrance repair. The undivided refusal is restored instead by making the UNTRACKED arm of the
# new `case` unmatchable, so an untracked entry falls through to the catch-all and refuses - which is exactly
# what M37 exists to assert: that the split is load-bearing and A50 goes back to exit 1 without it.
printf '%s\t%s\n' "        '?') ROUTEL=" "        '?zz') ROUTEL=" \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M37 "refuse any dirty tree again" "$D/gates/checks-tier.sh" "'?zz') ROUTEL="; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M37 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  printf '%s\n' "a note another session left" > "$D/claude/SESSION-NOTE.md"
  runtier "$D" "$MB"
  if [ "$TRC" = 1 ]; then
    rec M37 ok "the undivided refusal turns A50: an untracked note hard-refuses an honest commit (exit 1)"
  else
    rec M37 FAIL "the entrance split is not load-bearing: the mutant still routed (exit $TRC)"
  fi
  rm -f "$D/claude/SESSION-NOTE.md"
fi

# ── A51. D5's other half, asserted separately so the two cannot pass as one: a MODIFIED TRACKED file at entry
# still REFUSES, because then every verdict below would be about a commit nobody is looking at.
D="$T/a51"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "uncommitted change to a tracked file" >> "$D/gates/held.sh"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qF "TRACKED modification" <<<"$TOUT"; then
  rec A51 ok "a modified tracked file at entry still REFUSES and says which kind of dirt it found (exit $TRC)"
else
  rec A51 FAIL "a modified tracked file at entry did not refuse with its reason (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── A52. D6: THE SELF PIN SURVIVES A RELATIVE INVOCATION. `"${GIT[@]}"` carries -C "$ROOT", so git resolved a
# relative path against the repository root rather than the cwd, and the verdict printed
# `self pin: running=none  base=<blob>` and then asserted the bytes DIFFERED - an empty variable in a blob-id
# slot, reported as a mismatch. An unhashable judge is not a changed judge.
D="$T/a52"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
A52T="$(mktemp -d)"
git -C "$D" update-ref refs/remotes/origin/main "$FIXBASE" >/dev/null 2>&1 || true
git -C "$D" show "$FIXBASE:gates/checks-tier.sh" > "$A52T/ct.sh" 2>/dev/null
A52OUT="$(cd "$A52T" && bash ./ct.sh "$FIXBASE" "$D" 2>&1)"; A52RC=$?
A52WHY=""
[ "$A52RC" = 0 ] || A52WHY="exit $A52RC, wanted 0"
grep -qF "running=none" <<<"$A52OUT" && A52WHY="${A52WHY:+$A52WHY; }the self pin still printed running=none"
if [ -n "$A52WHY" ]; then
  rec A52 FAIL "the judge invoked by a relative path :: $A52WHY"
  printf '%s\n' "$A52OUT" | tail -8 | sed 's/^/          /'
else
  rec A52 ok "the judge invoked as \`bash ./ct.sh\` hashes its own bytes and pins against the base (exit $A52RC)"
fi
rm -rf "$A52T"

# ── M40. REVERT THE PATH RESOLUTION: A52 must stop pinning.
D="$T/m-M40"; mkfix "$D"
{ printf '%s\t%s\n' '  case "$SELF" in' '  case "x$SELF" in'
  printf '%s\t%s\n' '    /*) ;;' '    x/*) ;;'
  printf '%s\t%s\n' '    *)  SELF="$(cd -- "$(dirname -- "$SELF")" 2>/dev/null && pwd)/$(basename -- "$SELF")" ;;' '    x*) : ;;'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M40 "stop making the judge's own path absolute" "$D/gates/checks-tier.sh" '    x*) : ;;'; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M40 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  M40T="$(mktemp -d)"
  git -C "$D" update-ref refs/remotes/origin/main "$MB" >/dev/null 2>&1 || true
  git -C "$D" show "$MB:gates/checks-tier.sh" > "$M40T/ct.sh" 2>/dev/null
  M40OUT="$(cd "$M40T" && bash ./ct.sh "$MB" "$D" 2>&1)"; M40RC=$?
  if [ "$M40RC" != 0 ]; then
    rec M40 ok "without the path resolution a relative invocation cannot pin and the judge stops (exit $M40RC)"
  else
    rec M40 FAIL "the path resolution is not load-bearing: the relative invocation still went green (exit $M40RC)"
  fi
  rm -rf "$M40T"
fi

# ── A53. D6: A NEW gates/cases/*.md ALONE MUST NOT EARN A GREEN. The routing accepts a new .md because this
# directory's own convention file is one, and the battery runs only *.sh - so such a commit reached CHECKS TIER
# GREEN with nothing executed on its behalf, while the README told its author a new file here "is run by the
# tier". A green that means "nothing was checked" is the one verdict this tier must never give.
D="$T/a53"; mkfix "$D"
mkdir -p "$D/gates/cases"
printf '%s\n' "# a note about a control" > "$D/gates/cases/notes.md"
commitin "$D" "a new gates/cases/*.md and nothing else"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 2 ] && grep -qF "documentation" <<<"$TOUT"; then
  rec A53 ok "a commit whose only tier path is a new .md routes instead of earning a green (exit $TRC)"
else
  rec A53 FAIL "a new .md alone did not route with a reason (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M38. REMOVE THE md-ONLY ARM: A53 must go green.
D="$T/m-M38"; mkfix "$D"
printf '%s\t%s\n' '  if [ "$scriptpaths" = 0 ] && [ "$newsh" = 0 ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M38 "remove the documentation-only route" "$D/gates/checks-tier.sh" '  if false; then'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M38 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# a note about a control" > "$D/gates/cases/notes.md"
  commitin "$D" "a new .md over the mutant base"
  runtier "$D" "$MB"
  if [ "$TRC" = 0 ]; then
    rec M38 ok "without the arm a documentation-only commit takes a GREEN with nothing executed (exit 0)"
  else
    rec M38 FAIL "the documentation-only arm is not load-bearing: the commit did not go green without it (exit $TRC)"
  fi
fi

# ── A54. D6: THE STRIPPER'S STATE MUST CLOSE AT END OF FILE. A base file whose block comment never closes has
# been misread from that point on, and an over-stripped file produces a FALSE CLEAN rather than a harmless
# refusal - so the honest answer is to say so and route, not to trust the reading.
D="$T/a54"; mkfix "$D"
printf '%s\n' "// a gate" "/* this comment never closes" "require('../lib');" > "$D/gates/regress/01-x.js"
commitin "$D" "a base whose regress gate leaves a block comment open"; A54B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
runtier "$D" "$A54B"
if [ "$TRC" = 2 ] && grep -qF "still OPEN at end of file" <<<"$TOUT" && grep -qF "01-x.js" <<<"$TOUT"; then
  rec A54 ok "an unbalanced block comment in the base is reported, named and routed (exit $TRC)"
else
  rec A54 FAIL "an unbalanced block comment was not reported and named (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M41. REMOVE THE END-OF-FILE STATE CHECK: A54 must stop routing.
D="$T/m-M41"; mkfix "$D"
printf '%s\t%s\n' '  if [ -n "$(printf '"'"'%s'"'"' "$unbal" | tr -d '"'"'[:space:]'"'"')" ]; then' '  if false; then' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M41 "remove the end-of-file comment-state check" "$D/gates/checks-tier.sh" '  if false; then'; then
  printf '%s\n' "// a gate" "/* this comment never closes" "require('../lib');" > "$D/gates/regress/01-x.js"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M41 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if grep -qF "still OPEN at end of file" <<<"$TOUT"; then
    rec M41 FAIL "the end-of-file check is not load-bearing: it still reported the unbalanced file (exit $TRC)"
  else
    rec M41 ok "without the check an unbalanced base file is trusted silently (exit $TRC)"
  fi
fi

# ── A55. D6: `://` IS NOT A COMMENT START. A URL in a line of code used to strip the REST OF THAT LINE, so a
# real read of a push check path that followed a URL on the same line was invisible to premise P1 - which is
# the one arm standing between this tier and a browser gate whose verdict depends on those scripts.
D="$T/a55"; mkfix "$D"
printf '%s\n' "// a gate" "const u='https://example.com/x'; require('fs').readFileSync('../verify-log.sh');" \
  > "$D/gates/regress/01-x.js"
commitin "$D" "a base where a URL precedes a real read on one line"; A55B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
runtier "$D" "$A55B"
if [ "$TRC" = 2 ] && grep -qF "PREMISE P1 BROKEN" <<<"$TOUT" && grep -qF "verify-log.sh" <<<"$TOUT"; then
  rec A55 ok "a URL no longer hides a real read of a push check path on the same line (exit $TRC)"
else
  rec A55 FAIL "a read after a URL on one line was not seen by premise P1 (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M39. READ `://` AS A COMMENT START AGAIN: A55's read must become invisible.
D="$T/m-M39"; mkfix "$D"
printf '%s\t%s\n' '            if (c=="/" && d=="/") { if (i>1 && substr(line,i-1,1)==":") { out = out c; i++; continue } break }\n            out = out c; i++\n          }\n          if (out ~ /(checks-tier|checks-tier-drive|fastgate|verify-log|held|buildnum)\.sh/) {' '            if (c=="/" && d=="/") { break }\n            out = out c; i++\n          }\n          if (out ~ /(checks-tier|checks-tier-drive|fastgate|verify-log|held|buildnum)\.sh/) {' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M39 "read :// as a comment start again" "$D/gates/checks-tier.sh" 'if (c=="/" && d=="/") { break }'; then
  printf '%s\n' "// a gate" "const u='https://example.com/x'; require('fs').readFileSync('../verify-log.sh');" \
    > "$D/gates/regress/01-x.js"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M39 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if grep -qF "PREMISE P1 BROKEN" <<<"$TOUT"; then
    rec M39 FAIL "the :// fix is not load-bearing: the read was still seen with it reverted (exit $TRC)"
  else
    rec M39 ok "reading :// as a comment start turns A55: the read is hidden and the premise reads clean (exit $TRC)"
  fi
fi

# ══ THE SIXTH ROUND'S CASES. ONE PER VETO THE FIRST PAIR OF BUILD #536 UPHELD. ═════════════════════════════════
# BOTH DOORS RETURNED **BLOCK** ON THE ROUND-4 TREE, WITH NINE REPRODUCED P1s BETWEEN THEM, AND TWO OF THEM WERE
# DEFECTS ROUND 4's OWN REPAIRS HAD JUST INTRODUCED - which makes this the sixth consecutive round on this file
# to find its defect inside the previous round's fix. The cases below are the controls for the repairs; where a
# repair was WITHDRAWN rather than made (the lock's parent pin), there is no case and the limit is on the job.
# THE SHAPE OF ALL OF THEM IS "THE DAMAGE DID NOT HAPPEN", not "the verdict was right. That is this file's own
# standard, stated twice in round 4 and missed twice by it: "a REFUSED verdict over a clobbered bundle would
# still have cost somebody their tree."

# ── A56. AN HONEST COMMIT'S SECOND RUN AT ONE HEAD IS NOT A REFUSAL [antagonist A, P1(a)]. Round 4 made the
# judge's own previous log a hard REFUSED - exit 1, "do not re-run hoping for a different answer" - on a
# byte-identical tree with nothing wrong in the commit. The same two runs against the baseline are green twice,
# so it was a regression, and the judge creates the state itself: every ROUTE and every RED writes a log, and
# the route's own text says "re-run the tier". NO CASE IN THIS HARNESS CALLED runtier TWICE until this one.
D="$T/a56"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
runtier "$D" "$FIXBASE"; A56RC1=$TRC
A56SH="$(git -C "$D" rev-parse --short HEAD)"
runtier "$D" "$FIXBASE"; A56RC2=$TRC
A56WHY=""
[ "$A56RC1" = 0 ] || A56WHY="the FIRST run was exit $A56RC1, wanted 0"
[ "$A56RC2" = 0 ] || A56WHY="${A56WHY:+$A56WHY; }the SECOND run at the same head was exit $A56RC2, wanted 0"
[ -f "$D/gates/logs/checks-$A56SH-all.log" ] || A56WHY="${A56WHY:+$A56WHY; }the second run left no regular log file"
[ -L "$D/gates/logs/checks-$A56SH-all.log" ] && A56WHY="${A56WHY:+$A56WHY; }the log is a symlink"
if [ -n "$A56WHY" ]; then
  rec A56 FAIL "two runs of the tier at one head :: $A56WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A56 ok "an honest commit is green on BOTH runs at one head, and the second run's log is its own regular file"
fi

# ── M42. PUT "THE DESTINATION MUST NOT EXIST AT ALL" BACK: A56's second run must refuse.
D="$T/m-M42"; mkfix "$D"
printf '%s\t%s\n' '    if [ -L "$OUT" ]; then' '    if [ -e "$OUT" ] || [ -L "$OUT" ]; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M42 "refuse any pre-existing log destination" "$D/gates/checks-tier.sh" '    if [ -e "$OUT" ] || [ -L "$OUT" ]; then'; then
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M42 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"; M42RC1=$TRC
  runtier "$D" "$MB"; M42RC2=$TRC
  if [ "$M42RC1" = 0 ] && [ "$M42RC2" != 0 ]; then
    rec M42 ok "the must-not-exist rule turns A56: the second run of an honest commit is exit $M42RC2"
  else
    rec M42 FAIL "the kind-of-thing split is not load-bearing: runs read $M42RC1 then $M42RC2"
  fi
fi

# ── A57. THE CLONE DIRECTORY IS NOT A COMPUTABLE NAME [antagonist A, P1(b)]. It is the LARGEST write this judge
# makes, it was `$WORK/c$CTLN`, and a control symlinked the NEXT one at a directory inside the real .git: `git
# clone` then wrote SEVENTY-EIGHT PATHS into the tree under judgement, with its own .git, under exit 0 and
# "the real tree was not touched" - the snapshot lists no .git path, so nothing spoke.
D="$T/a57"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-aaa-clonedir.sh" <<'CD'
#!/usr/bin/env bash
R="__CTREAL__"
W="$(dirname "$PWD")"; N="${PWD##*/c}"
mkdir -p "$R/.git/PLANTED-BY-A-CONTROL" 2>/dev/null
# the next clone's destination, as the old derived name computed it
ln -s "$R/.git/PLANTED-BY-A-CONTROL" "$W/c$((N+1))" 2>/dev/null || true
echo "PASS c-aaa-clonedir asserts nothing"
exit 0
CD
cat > "$D/gates/cases/c-zzz-after.sh" <<'AF'
#!/usr/bin/env bash
echo "PASS c-zzz-after is the control whose clone the plant wanted"
exit 0
AF
commitin "$D" "held.sh plus a control that symlinks the next clone directory into the real .git"
runtier "$D" "$FIXBASE"
A57N="$(find "$D/.git/PLANTED-BY-A-CONTROL" -mindepth 1 2>/dev/null | grep -c . || true)"
if [ "${A57N:-0}" -eq 0 ]; then
  rec A57 ok "a symlink at the next clone's old derived name receives NOTHING: 0 paths in the real .git (exit $TRC)"
else
  rec A57 FAIL "a control redirected a clone INTO the real repository: $A57N path(s) under .git/PLANTED-BY-A-CONTROL (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M43. PUT THE DERIVED CLONE DIRECTORY BACK: A57's plant must receive a whole checkout.
D="$T/m-M43"; mkfix "$D"
printf '%s\t%s\n' '    d="$(mktemp -d "$WORK/c-XXXXXXXXXX" 2>/dev/null)" || d=""\n    if [ -z "$d" ] || [ ! -d "$d" ]; then\n      bad "$label: could not create its clone directory, so the control did not run"\n      say "  RED  $label - no clone directory"\n      return 1\n    fi' '    d="$WORK/c$CTLN"' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M43 "put the derived clone directory back" "$D/gates/checks-tier.sh" '    d="$WORK/c$CTLN"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M43 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a57/gates/cases/c-aaa-clonedir.sh" "$D/gates/cases/c-aaa-clonedir.sh" 2>/dev/null
  cp "$T/a57/gates/cases/c-zzz-after.sh" "$D/gates/cases/c-zzz-after.sh" 2>/dev/null
  sed -i "s|$T/a57|$D|g" "$D/gates/cases/c-aaa-clonedir.sh" 2>/dev/null
  commitin "$D" "the clone-directory plant over the mutant base"
  runtier "$D" "$MB"
  M43N="$(find "$D/.git/PLANTED-BY-A-CONTROL" -mindepth 1 2>/dev/null | grep -c . || true)"
  if [ "${M43N:-0}" -gt 0 ]; then
    rec M43 ok "the derived clone directory turns A57: $M43N path(s) were written into the real .git (exit $TRC)"
  else
    rec M43 FAIL "the clone directory's name is not load-bearing: the plant received nothing with it restored (exit $TRC)"
  fi
fi

# ── A58. THE JUDGE'S WRITES GO THROUGH A DESCRIPTOR, SO RELINKING THE NAME MID-RUN CANNOT CAPTURE THEM
# [antagonist A, P1(d)]. mktemp stops a PRE-PLANT and not a SWAP: PRIV's name is `dirname "$(git config --get
# remote.origin.url)"`, mode 700 buys nothing against the same uid, and A's spinner relinked any empty
# $PRIV/ctl-*.out at app.js and captured a later control's stdout in 3 of 9 runs. The verdict was already a
# refusal; the BUNDLE was already gone.
D="$T/a58"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-aaa-swap.sh" <<'SW'
#!/usr/bin/env bash
R="__CTREAL__"
M="$(git config --get remote.origin.url 2>/dev/null)"; P="$(dirname "$M")"
# A BOUNDED spinner, so the case cleans up after itself: it relinks any EMPTY judge scratch file at the bundle.
setsid bash -c '
  for i in $(seq 1 6000); do
    for f in "'"$P"'"/ctl-*.out "'"$P"'"/log-*; do
      [ -f "$f" ] || continue
      [ -s "$f" ] && continue
      rm -f "$f" 2>/dev/null && ln -s "'"$R"'/app.js" "$f" 2>/dev/null
    done
  done' >/dev/null 2>&1 &
echo "PASS c-aaa-swap asserts nothing"
exit 0
SW
cat > "$D/gates/cases/c-zzz-filler.sh" <<'FL'
#!/usr/bin/env bash
echo "PASS c-zzz-filler output is what the spinner wanted in the bundle"
exit 0
FL
commitin "$D" "held.sh plus a control that races the judge's own scratch writes"
A58MD5="$(md5sum "$D/app.js" | cut -c1-32)"
A58HITS=0
for A58I in 1 2 3 4 5; do
  runtier "$D" "$FIXBASE"
  [ "$(md5sum "$D/app.js" | cut -c1-32)" = "$A58MD5" ] || A58HITS=$((A58HITS+1))
done
while IFS= read -r svpid; do [ -n "$svpid" ] && kill -TERM "$svpid" 2>/dev/null || true
done < <(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="bash" && /ctl-\*\.out/ {print $1}')
if [ "$A58HITS" = 0 ]; then
  rec A58 ok "five runs against a spinner relinking the judge's scratch names: the bundle was NEVER rewritten"
else
  rec A58 FAIL "the bundle was rewritten in $A58HITS of 5 runs through a relinked judge scratch name"
fi

# ── M44. WRITE THROUGH THE NAME AGAIN INSTEAD OF THE DESCRIPTOR: A58's spinner must land at least once.
D="$T/m-M44"; mkfix "$D"
{ printf '%s\t%s\n' "$LAUNCHLINE" '          timeout "$bound" "$@" >"$outf" 2>&1 </dev/null ) &'
  printf '%s\t%s\n' '    CTL_OUT="$(cat "/proc/self/fd/$ofd" 2>/dev/null || true)"' '    CTL_OUT="$(cat "$outf" 2>/dev/null || true)"'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M44 "write the control output through the name again" "$D/gates/checks-tier.sh" '>"$outf" 2>&1 </dev/null ) &'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M44 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a58/gates/cases/c-aaa-swap.sh" "$D/gates/cases/c-aaa-swap.sh" 2>/dev/null
  cp "$T/a58/gates/cases/c-zzz-filler.sh" "$D/gates/cases/c-zzz-filler.sh" 2>/dev/null
  sed -i "s|$T/a58|$D|g" "$D/gates/cases/c-aaa-swap.sh" 2>/dev/null
  commitin "$D" "the spinner over the mutant base"
  M44MD5="$(md5sum "$D/app.js" | cut -c1-32)"; M44HITS=0
  for M44I in 1 2 3 4 5 6 7 8 9 10 11 12; do
    runtier "$D" "$MB"
    [ "$(md5sum "$D/app.js" | cut -c1-32)" = "$M44MD5" ] || M44HITS=$((M44HITS+1))
  done
  while IFS= read -r svpid; do [ -n "$svpid" ] && kill -TERM "$svpid" 2>/dev/null || true
  done < <(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="bash" && /ctl-\*\.out/ {print $1}')
  if [ "$M44HITS" -gt 0 ]; then
    rec M44 ok "writing through the name turns A58: the bundle was rewritten in $M44HITS of 12 runs"
  else
    rec M44 SKIP "the race did not land in 12 runs with the name restored, so this mutant proved nothing this time - the window between mktemp and the child's open is sub-millisecond here, while A measured 3 of 9 against the wider pre-refactor gap"
  fi
fi

# ── A59. THE CONTROL'S HOME IS NOT A COMPUTABLE NAME EITHER [antagonist B, P1-a, and it was MINE]. D3's first
# draft wrote `: > "$WORK/h$CTLN/gitconfig-empty"` - a judge write, with `>`, at a name every control can
# compute from its own cwd - and B truncated an operator file through it, and then a pack file, destroying the
# repository under exit 0 and CHECKS TIER GREEN.
D="$T/a59"; mkfix "$D"
printf 'IMPORTANT OPERATOR FILE - three lines\nsecond\nthird\n' > "$T/a59-victim.txt"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-aaa-home.sh" <<'HM'
#!/usr/bin/env bash
W="$(dirname "$PWD")"; N="${PWD##*/c}"
for K in 1 2 3 4 5 6 7 8 9 10 11 12; do
  mkdir -p "$W/h$K" 2>/dev/null
  rm -f "$W/h$K/gitconfig-empty" 2>/dev/null
  ln -s "__CTVICTIM__" "$W/h$K/gitconfig-empty" 2>/dev/null || true
done
echo "PASS c-aaa-home asserts nothing"
exit 0
HM
sed -i "s|__CTVICTIM__|$T/a59-victim.txt|g" "$D/gates/cases/c-aaa-home.sh"
cat > "$D/gates/cases/c-zzz-later.sh" <<'LT'
#!/usr/bin/env bash
echo "PASS c-zzz-later runs after the plant"
exit 0
LT
commitin "$D" "held.sh plus a control that plants links at every control-home name"
A59SZ="$(wc -c < "$T/a59-victim.txt" | tr -d ' ')"
runtier "$D" "$FIXBASE"
A59AFTER="$(wc -c < "$T/a59-victim.txt" | tr -d ' ')"
if [ "$A59SZ" = "$A59AFTER" ]; then
  rec A59 ok "links at every old control-home name truncate nothing: the victim is still $A59AFTER bytes (exit $TRC)"
else
  rec A59 FAIL "the judge truncated a file through a planted control-home name: $A59SZ -> $A59AFTER bytes (exit $TRC)"
fi

# ── M45. PUT THE DERIVED CONTROL HOME BACK: A59's victim must be truncated.
D="$T/m-M45"; mkfix "$D"
printf 'IMPORTANT OPERATOR FILE - three lines\nsecond\nthird\n' > "$T/m45-victim.txt"
{ printf '%s\t%s\n' '    chome="$(mktemp -d "$PRIV/h-XXXXXXXXXX" 2>/dev/null)" || return 125' '    chome="$WORK/h$CTLN"; mkdir -p "$chome"'
  printf '%s\t%s\n' '    cgit="$(mktemp "$chome/gitconfig-XXXXXXXXXX" 2>/dev/null)" || return 125' '    cgit="$chome/gitconfig-empty"; : > "$cgit"'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M45 "put the derived control home back" "$D/gates/checks-tier.sh" '    cgit="$chome/gitconfig-empty"; : > "$cgit"'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M45 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a59/gates/cases/c-aaa-home.sh" "$D/gates/cases/c-aaa-home.sh" 2>/dev/null
  cp "$T/a59/gates/cases/c-zzz-later.sh" "$D/gates/cases/c-zzz-later.sh" 2>/dev/null
  sed -i "s|$T/a59-victim.txt|$T/m45-victim.txt|g" "$D/gates/cases/c-aaa-home.sh" 2>/dev/null
  commitin "$D" "the control-home plant over the mutant base"
  M45SZ="$(wc -c < "$T/m45-victim.txt" | tr -d ' ')"
  runtier "$D" "$MB"
  M45AFTER="$(wc -c < "$T/m45-victim.txt" | tr -d ' ')"
  if [ "$M45SZ" != "$M45AFTER" ]; then
    rec M45 ok "the derived control home turns A59: the judge truncated the victim, $M45SZ -> $M45AFTER bytes"
  else
    rec M45 FAIL "the control home's name is not load-bearing: nothing was truncated with it restored (exit $TRC)"
  fi
fi

# ── A60. THE fastgate-drive ARM GETS THE SAME DISCIPLINE AS A CONTROL [antagonist B, P1-e]. It is the ONE arm
# that executes the CANDIDATE's own gates/fastgate.sh, and it had no stdin redirect, no env isolation, no
# process group, no marker and therefore no survivor scan: B measured HOME=/root inside it and a `setsid` child
# of the candidate's own script surviving the whole run unreported.
D="$T/a60"; mkfix "$D"
printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' \
  'setsid bash -c "sleep 8" >/dev/null 2>&1 &' 'echo "1 ok, 0 FAIL, 0 skipped"' "exit 0" > "$D/gates/fastgate-drive.sh"
commitin "$D" "a base whose harness leaves a setsid child behind"; A60B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
runtier "$D" "$A60B"
if [ "$TRC" = 1 ] && grep -qF "OUTLIVED" <<<"$TOUT"; then
  rec A60 ok "a setsid child left by the drive arm is found by the marker and is RED (exit $TRC)"
else
  rec A60 FAIL "the drive arm's orphan was not reported (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M46. TAKE THE DRIVE ARM BACK OUT OF ctl_exec: A60's orphan must go unreported.
D="$T/m-M46"; mkfix "$D"
{ printf '%s\t%s\n' '      CTL_BOUND=900 ctl_exec "$d" -- bash gates/fastgate-drive.sh fixed; rc=$?\n      out="$CTL_OUT"' '      out="$(cd "$d" && timeout 900 bash gates/fastgate-drive.sh fixed 2>&1)"; rc=$?'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M46 "run the drive arm outside ctl_exec again" "$D/gates/checks-tier.sh" 'out="$(cd "$d" && timeout 900 bash gates/fastgate-drive.sh fixed 2>&1)"'; then
  printf '%s\n' "#!/usr/bin/env bash" 'tc(){ case "$1" in H1) :;; H1b) :;; H2) :;; H12) :;; esac; }' \
    'setsid bash -c "sleep 8" >/dev/null 2>&1 &' 'echo "1 ok, 0 FAIL, 0 skipped"' "exit 0" > "$D/gates/fastgate-drive.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M46 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  runtier "$D" "$MB"
  if grep -qF "OUTLIVED" <<<"$TOUT"; then
    rec M46 FAIL "the drive arm's isolation is not load-bearing: the orphan was still reported (exit $TRC)"
  else
    rec M46 ok "outside ctl_exec the drive arm's orphan is invisible: no survivor report (exit $TRC)"
  fi
fi

# ── A61. THE RECOVERY EVIDENCE INSIDE .git IS WATCHED [antagonist B, P1-d]. B removed .git/logs, .git/ORIG_HEAD
# and .git/COMMIT_EDITMSG and registered a ghost worktree, all under exit 0 and a green, because .git appeared
# in no arm of the snapshot. The reflogs are where a destroyed branch is recovered from.
D="$T/a61"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-reflog.sh" <<'RL'
#!/usr/bin/env bash
R="__CTREAL__"
rm -rf "$R/.git/logs" 2>/dev/null
echo "PASS c-reflog asserts nothing"
exit 0
RL
commitin "$D" "held.sh plus a control that removes the reflogs"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qE '^ +[<>] GITDIR logs ' <<<"$TOUT"; then
  rec A61 ok "a control that removes .git/logs is GRAVE and the GITDIR line is named (exit $TRC)"
else
  rec A61 FAIL "removing the reflogs was not reported as grave (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -10 | sed 's/^/          /'
fi

# ── M47. DROP THE GITDIR ARM: A61 must stop refusing.
D="$T/m-M47"; mkfix "$D"
# THE SEAM IS THE HASH'S OWN LINE, for the reason M34 needed one: an anchor carrying `%s\n` cannot match,
# because mkmut turns a literal backslash-n into a newline.
printf '%s\t%s\n' '    glog="$(find "$ROOT/.git/logs" -type f -print0 2>/dev/null | sort -z | xargs -0 -r sha256sum 2>/dev/null | sha256sum | cut -c1-64)"' '    glog=constant-no-reflog-hash' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M47 "make the reflog arm a constant" "$D/gates/checks-tier.sh" '    glog=constant-no-reflog-hash'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M47 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cp "$T/a61/gates/cases/c-reflog.sh" "$D/gates/cases/c-reflog.sh" 2>/dev/null
  sed -i "s|$T/a61|$D|g" "$D/gates/cases/c-reflog.sh" 2>/dev/null
  commitin "$D" "the reflog wipe over the mutant base"
  runtier "$D" "$MB"
  if grep -qE '^ +[<>] GITDIR logs ' <<<"$TOUT"; then
    rec M47 FAIL "the GITDIR arm is not load-bearing: the wipe was still named with it made constant (exit $TRC)"
  else
    rec M47 ok "without the GITDIR hash the reflog wipe is invisible to the snapshot (exit $TRC)"
  fi
fi

# ── A62. AN IN-PLACE, SAME-SIZE REWRITE OF A TRACKED FILE IS GRAVE, AND THIS CASE EXISTS BECAUSE ANTAGONIST B
# REPORTED THE OPPOSITE [B's P1-b]. B measured `git ls-files -s` not moving - which is TRUE, it is the index's
# recorded oid - and reported `git status` clean with it, so a control could leave the bundle replaced under a
# green. I could not reproduce the second half: on a fresh fixture, outside git's racily-clean window, and on a
# real clone with the file's mtime older than the index and restored to the nanosecond, `git status` reported
# the file modified every time, with core.trustctime both false and true. So the claim is DISPUTED and the arm
# that covers it is the WT and DIFF pair rather than TRACKED. A case is the honest way to hold that open: the
# day a configuration appears where all three are blind, this goes red instead of a reviewer arguing.
D="$T/a62"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"
mkdir -p "$D/gates/cases"
cat > "$D/gates/cases/c-inplace.sh" <<'IP'
#!/usr/bin/env bash
R="__CTREAL__"
MT="$(stat -c %y "$R/app.js" 2>/dev/null)"
printf 'EVIL' | dd of="$R/app.js" bs=1 seek=0 conv=notrunc status=none 2>/dev/null
touch -d "$MT" "$R/app.js" 2>/dev/null
echo "PASS c-inplace asserts nothing"
exit 0
IP
commitin "$D" "held.sh plus a control that rewrites the bundle in place at the same size"
A62MD5="$(md5sum "$D/app.js" | cut -c1-32)"
sleep 1
runtier "$D" "$FIXBASE"
A62AFTER="$(md5sum "$D/app.js" | cut -c1-32)"
A62WHY=""
[ "$TRC" = 1 ] || A62WHY="exit $TRC, wanted 1"
grep -qF "the real tree CHANGED" <<<"$TOUT" || A62WHY="${A62WHY:+$A62WHY; }the verdict does not say the tree changed"
[ "$A62MD5" = "$A62AFTER" ] && A62WHY="${A62WHY:+$A62WHY; }the control did not actually rewrite the bundle, so this case tested nothing"
if [ -n "$A62WHY" ]; then
  rec A62 FAIL "an in-place same-size rewrite of a tracked file :: $A62WHY"
  printf '%s\n' "$TOUT" | tail -12 | sed 's/^/          /'
else
  rec A62 ok "an in-place same-size rewrite of the bundle with its mtime restored is GRAVE (exit $TRC)"
fi

# ── A63. THE JUDGE MUST NOT TAKE THE PROCESS GROUP IT KILLS FROM ANYTHING A CONTROL CAN WRITE. This is fresh
# antagonist A's P1 of the seventh round, and it was the one place where a control's BYTES became a root
# SIGNAL: ctl_exec launched the control under `setsid --wait bash -c 'printf "%s\n" "$$" > "$0"' "$pgf"` and
# then ran `kill -TERM -- -$(cat "$pgf")`. $PRIV is `dirname "$(git config --get remote.origin.url)"` from
# inside any control and mktemp only defeats a PRE-PLANT, so a control enumerated `"$PRIV"/pg-*` and chose the
# group. A killed an unrelated process group under CHECKS TIER GREEN, and with `0` the judge TERMed itself
# mid-battery - no verdict, no log, the suite lock left standing. The assertion is about the VICTIM, not about
# the verdict: an honest control passes, so the exit code is 0 either way and only the victim's survival can
# tell the two judges apart.
D="$T/a63"; mkfix "$D"
setsid bash -c 'exec sleep 599' >/dev/null 2>&1 &
sleep 0.4
A63VPID="$(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="sleep" && $3=="599" {print $1; exit}')"
A63VPG="$(ps -o pgid= -p "${A63VPID:-0}" 2>/dev/null | tr -d ' ')"
if [ -z "$A63VPID" ] || [ -z "$A63VPG" ] || [ "$A63VPG" = 0 ]; then
  rec A63 SKIP "could not stand up a victim process group to aim the judge at"
else
  mkdir -p "$D/gates/cases"
  # TWO NAMES, DELIBERATELY: `pg-*` is the name the defect's own mktemp produced, and `pgid-*` is the name
  # M48 reads back. A control cannot know which the judge uses, so it writes both - which is also why the
  # mutant below can be a two-line change rather than a restoration of the whole launch.
  cat > "$D/gates/cases/c-pg.sh" <<CTL
#!/usr/bin/env bash
MIR="\$(git config --get remote.origin.url 2>/dev/null)"
PRIV="\$(dirname "\$MIR")"
for f in "\$PRIV"/pg-*; do [ -f "\$f" ] && printf '%s\n' "$A63VPG" > "\$f"; done
printf '%s\n' "$A63VPG" > "\$PRIV/pgid-victim" 2>/dev/null
echo "PASS c-pg asserts nothing; it only aims the judge at pgid $A63VPG"
exit 0
CTL
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  commitin "$D" "held.sh plus a control that aims the judge's group kill at an unrelated process group"
  runtier "$D" "$FIXBASE"
  sleep 0.3
  A63ALIVE=no; kill -0 "$A63VPID" 2>/dev/null && A63ALIVE=yes
  if [ "$A63ALIVE" = yes ]; then
    rec A63 ok "the group kill uses a pgid the judge watched itself, so an unrelated group survives (exit $TRC)"
  else
    rec A63 FAIL "a control chose the process group the judge TERMed: victim pgid $A63VPG is gone (exit $TRC)"
    printf '%s\n' "$TOUT" | tail -12 | sed 's/^/          /'
  fi
  kill -TERM "$A63VPID" 2>/dev/null || true
fi

# ── M48. TAKE THE PGID OUT OF A FILE AGAIN: A63's victim must die.
D="$T/m-M48"; mkfix "$D"
printf '%s\t%s\n' '    case "$pgid" in' '    for _f in "$PRIV"/pgid-*; do [ -f "$_f" ] && pgid="$(cat "$_f" 2>/dev/null)"; done\n    case "$pgid" in' | mkmut "$D/gates/checks-tier.sh"
if mutguard M48 "read the killed pgid out of a file a control can write" "$D/gates/checks-tier.sh" 'for _f in "$PRIV"/pgid-*; do'; then
  setsid bash -c 'exec sleep 598' >/dev/null 2>&1 &
  sleep 0.4
  M48VPID="$(ps -eo pid=,cmd= 2>/dev/null | awk '$2=="sleep" && $3=="598" {print $1; exit}')"
  M48VPG="$(ps -o pgid= -p "${M48VPID:-0}" 2>/dev/null | tr -d ' ')"
  if [ -z "$M48VPID" ] || [ -z "$M48VPG" ] || [ "$M48VPG" = 0 ]; then
    rec M48 SKIP "could not stand up a victim process group for the mutant"
  else
    mkdir -p "$D/gates/cases"
    cat > "$D/gates/cases/c-pg.sh" <<CTL
#!/usr/bin/env bash
MIR="\$(git config --get remote.origin.url 2>/dev/null)"
PRIV="\$(dirname "\$MIR")"
printf '%s\n' "$M48VPG" > "\$PRIV/pgid-victim" 2>/dev/null
echo "PASS c-pg asserts nothing; it only aims the judge at pgid $M48VPG"
exit 0
CTL
    git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M48 base" >/dev/null 2>&1
    MB="$(git -C "$D" rev-parse HEAD)"
    printf '%s\n' "# changed again" >> "$D/gates/held.sh"
    commitin "$D" "held.sh plus the aiming control, against the mutant"
    runtier "$D" "$MB"
    sleep 0.3
    M48ALIVE=no; kill -0 "$M48VPID" 2>/dev/null && M48ALIVE=yes
    if [ "$M48ALIVE" = no ]; then
      rec M48 ok "reading the pgid out of a control-writable file turns A63: the victim group was TERMed (exit $TRC)"
    else
      rec M48 FAIL "the mutant did not turn A63 - the victim survived, so A63 proves nothing this run"
    fi
    kill -TERM "$M48VPID" 2>/dev/null || true
  fi
fi

# ── A1. THE WHOLE REAL BATTERY, IN THE REAL REPOSITORY. The only slow case, about 6.5 minutes. ──────────────
# It is the case that says the battery is green HERE, on this tree, rather than on a fixture of stubs. It needs
# the tier to exist on origin/main, so before this work lands it runs against the WORKING TREE's copy installed
# as a synthetic base in a full clone of the real repository.
# ══ A64..A69 AND M49. THE ENTRANCE SPLIT KEYS ON THE TIER'S PATH SET, NOT ON TRACKED-vs-UNTRACKED. ═══════════
# Fresh antagonist B's P1 of #536, reproduced independently by #542's own B from the shipped surface and by the
# run itself before any edit. CLAUDE.md's pen rule lets every other chat in this project write docs and flags
# into this checkout, and this repo's shared docs are TRACKED, so the old split hard-refused an honest candidate
# at exit 1 - "do not re-run hoping for a different answer" - for a note another session left in DECISIONS-LOG.md,
# while the SAME WRITE UNTRACKED routed at exit 2. These six cases pin each arm of the new split separately so
# that no two of them can pass as one, and M49 turns the first.
# THE DOC IS IN THE BASE ON PURPOSE in every case below: if it arrived in the candidate commit instead, the
# changed set would route for its OWN reason and the case would pass without exercising the entrance at all.

# A64. A TRACKED edit OUTSIDE the set ROUTES, and the verdict names the path.
D="$T/a64"; mkfix "$D"
printf '%s\n' "# decisions" > "$D/DECISIONS-LOG.md"
commitin "$D" "the base plus a tracked doc"; A64B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "- a note another chat left" >> "$D/DECISIONS-LOG.md"
runtier "$D" "$A64B"
A64WHY=""
[ "$TRC" = 2 ] || A64WHY="exit $TRC, wanted 2"
grep -qF "no uncommitted change to a TRACKED path inside this tier's set" <<<"$TOUT" || A64WHY="${A64WHY:+$A64WHY; }the verdict does not say nothing inside the set is dirty"
grep -qF "DECISIONS-LOG.md" <<<"$TOUT" || A64WHY="${A64WHY:+$A64WHY; }the verdict does not NAME the tracked path"
# ITS OWN BUCKET AND ITS OWN SIDE OF THE SET, asserted separately [#543 repair 3; A's F5].
grep -qF "[worktree edit, outside the set]" <<<"$TOUT" || A64WHY="${A64WHY:+$A64WHY; }the named line does not carry its bucket and which side of the set it sits on"
if [ -n "$A64WHY" ]; then
  rec A64 FAIL "a tracked edit outside the tier's set :: $A64WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A64 ok "a TRACKED edit to a doc OUTSIDE the tier's set ROUTES and is named, instead of hard-refusing an honest commit (exit $TRC)"
fi

# A65. A TRACKED edit INSIDE the set still REFUSES. Asserted separately from A64 so the two cannot pass as one.
D="$T/a65"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "uncommitted, and inside the set" >> "$D/gates/held.sh"
runtier "$D" "$FIXBASE"
A65WHY=""
[ "$TRC" = 1 ] || A65WHY="exit $TRC, wanted 1"
grep -qF "TRACKED path INSIDE this tier's own set" <<<"$TOUT" || A65WHY="${A65WHY:+$A65WHY; }the refusal does not say the path is inside the set"
# ITS OWN BUCKET AND ITS OWN PATH [#543 repair 3]: a worktree edit inside the set, named as such.
grep -qF "[worktree edit, inside the set] " <<<"$TOUT" || A65WHY="${A65WHY:+$A65WHY; }the named line does not carry its bucket and side"
grep -qF "gates/held.sh" <<<"$TOUT" || A65WHY="${A65WHY:+$A65WHY; }the refusal does not NAME the path inside the set"
if [ -n "$A65WHY" ]; then
  rec A65 FAIL "a tracked edit inside the tier's set :: $A65WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A65 ok "a tracked edit INSIDE the tier's set still REFUSES, named as a worktree edit inside the set (exit $TRC)"
fi

# A66. BOTH AT ONCE -> REFUSE, and the refusal names the INSIDE path. One refusal outranks every route.
D="$T/a66"; mkfix "$D"
printf '%s\n' "# decisions" > "$D/DECISIONS-LOG.md"
commitin "$D" "the base plus a tracked doc"; A66B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "- a note another chat left" >> "$D/DECISIONS-LOG.md"
printf '%s\n' "uncommitted, and inside the set" >> "$D/gates/held.sh"
runtier "$D" "$A66B"
A66WHY=""
[ "$TRC" = 1 ] || A66WHY="exit $TRC, wanted 1"
grep -qF "gates/held.sh" <<<"$TOUT" || A66WHY="${A66WHY:+$A66WHY; }the refusal does not name the path INSIDE the set"
if [ -n "$A66WHY" ]; then
  rec A66 FAIL "one refusal must outrank every route :: $A66WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A66 ok "an inside-the-set edit beside an outside one REFUSES and names the inside path (exit $TRC)"
fi

# A67. A STAGED edit to a record OUTSIDE the set ROUTES at exit 2, named staged and outside.
# THIS CASE WAS REVERSED BY THE ORCHESTRATOR'S RULING [#543 repair 3 of THE WORK;
# decisions/a-staged-or-unmerged-doc-outside-the-tier-set-is-an-ordinary-state-so-the-tier-routes-it-2026-10-28].
# It used to assert exit 1, on the premise that a staged change means the verdicts would be about a commit
# nobody is looking at. That premise does not reach a path OUTSIDE the set: no verdict of this judge reads
# working-tree bytes - the acceptance, identity, premise and harness arms read git objects and every control
# runs in its own clone - and CLAUDE.md lets every other chat write docs here, so a pull or a cherry-pick that
# conflicts on one of them leaves exactly this state. Exit 1 means "stop, do not re-run", so refusing it was a
# false hard refusal of an honest commit. Inside the set nothing changed: A76 pins that half.
D="$T/a67"; mkfix "$D"
printf '%s\n' "# decisions" > "$D/DECISIONS-LOG.md"
commitin "$D" "the base plus a tracked doc"; A67B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "- staged, not committed" >> "$D/DECISIONS-LOG.md"
git -C "$D" add DECISIONS-LOG.md >/dev/null 2>&1
runtier "$D" "$A67B"
A67WHY=""
[ "$TRC" = 2 ] || A67WHY="exit $TRC, wanted 2"
grep -qF "[staged, outside the set] " <<<"$TOUT" || A67WHY="${A67WHY:+$A67WHY; }the named line does not carry the bucket 'staged' and 'outside the set'"
grep -qF "DECISIONS-LOG.md" <<<"$TOUT" || A67WHY="${A67WHY:+$A67WHY; }the verdict does not NAME the staged path"
if [ -n "$A67WHY" ]; then
  rec A67 FAIL "a staged record outside the tier's set :: $A67WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A67 ok "a STAGED edit to a record OUTSIDE the tier's set ROUTES, named staged and outside, instead of hard-refusing an honest commit (exit $TRC)"
fi

# A68. A PATH HOLDING A SPACE AND A NEWLINE ROUTES AND IS NAMED EXACTLY. This is why the read is -z and NUL by
# NUL: the line-oriented read this replaced would have split this one path into two entries and named neither.
D="$T/a68"; mkfix "$D"
A68N="$(printf 'claude/a doc with a space\nand a newline.md')"
mkdir -p "$D/claude"
printf '%s\n' "# a doc" > "$D/$A68N"
commitin "$D" "the base plus a doc whose name holds a space and a newline"; A68B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "- a note another chat left" >> "$D/$A68N"
runtier "$D" "$A68B"
A68WHY=""
[ "$TRC" = 2 ] || A68WHY="exit $TRC, wanted 2"
grep -qF "and a newline.md" <<<"$TOUT" || A68WHY="${A68WHY:+$A68WHY; }the verdict does not name the path's second line, so the NUL-by-NUL read is not load-bearing"
if [ -n "$A68WHY" ]; then
  rec A68 FAIL "a path holding a space and a newline :: $A68WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A68 ok "a tracked edit to a path holding a SPACE AND A NEWLINE routes and is named whole (exit $TRC)"
fi

# A69. AN UNTRACKED FILE UNDER gates/ STILL ROUTES, as it did before this split: the set governs TRACKED edits,
# and no control or harness reads the working tree at all.
D="$T/a69"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "a scratch file another chat left" > "$D/gates/SCRATCH-NOTE.md"
runtier "$D" "$FIXBASE"
A69WHY=""
[ "$TRC" = 2 ] || A69WHY="exit $TRC, wanted 2"
grep -qF "gates/SCRATCH-NOTE.md" <<<"$TOUT" || A69WHY="${A69WHY:+$A69WHY; }the verdict does not name the untracked path"
# AND IT SAYS IT IS INSIDE THE SET, which is the half the route's old wording got wrong: it claimed "nothing
# inside it" over a path under gates/ [#543 repair 3; B's P2 of round 9, 65c8fa1435481e07].
grep -qF "[untracked, inside the set]" <<<"$TOUT" || A69WHY="${A69WHY:+$A69WHY; }the named line does not say the untracked path is INSIDE the set"
grep -qF "nothing inside it" <<<"$TOUT" && A69WHY="${A69WHY:+$A69WHY; }the route claims nothing is inside the set while naming a path under gates/"
if [ -n "$A69WHY" ]; then
  rec A69 FAIL "an untracked path under gates/ :: $A69WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A69 ok "an UNTRACKED file under gates/ still ROUTES and is named (exit $TRC)"
fi

# M49. PUT THE REFUSE-ALL ARM BACK: every tracked worktree edit refuses again, and A64 must turn.
D="$T/m-M49"; mkfix "$D"
# RE-ANCHORED AT #543 (repair 3): the `' ') if tier_relevant_path` arm this used to mutate no longer exists,
# because the entrance now classifies every entry by its paths. The equivalent mutation is to call every
# tracked path inside the set, which restores the refuse-all behaviour A64 turns on.
printf '%s\t%s\n' '        tier_relevant_path "$dp" && dinside=1' '        dinside=1 # M49: every tracked path reads as inside the set' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M49 "refuse every tracked edit again" "$D/gates/checks-tier.sh" 'M49: every tracked path reads as inside the set'; then
  printf '%s\n' "# decisions" > "$D/DECISIONS-LOG.md"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M49 base" >/dev/null 2>&1
  M49B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  printf '%s\n' "- a note another chat left" >> "$D/DECISIONS-LOG.md"
  runtier "$D" "$M49B"
  if [ "$TRC" = 1 ]; then
    rec M49 ok "the refuse-all arm turns A64: a note in a tracked doc hard-refuses an honest commit again (exit 1)"
  else
    rec M49 FAIL "the path-set split is not load-bearing: the mutant still routed (exit $TRC)"
  fi
fi

# ══ A70..A72 AND M50. A RENAME OR COPY IS TWO PATHS AND ONE ENTRY. ═══════════════════════════════════════════
# #543, repair 1 of THE WORK. Fresh antagonist A's F1 and B's P3 of #542, the same line found from both doors.
# `git status --porcelain=v1 -z` emits a rename or copy as the status entry carrying the NEW path, then the OLD
# path, and the arm before this repair consumed that second field only when the FIRST column was R or C. A
# WORKTREE rename has the first column BLANK, so the old path was left in the stream AND READ BACK AS THE NEXT
# ENTRY - and because `RUN-LOG.md` begins with the letter R it then matched the rename branch itself, asked for a
# second field that was not there, and REFUSED an honest commit at exit 1 naming "RUN-LOG.md -> " with nothing
# after the arrow. The verdict was decided by the first letter of a leftover path. A70 pins the route and the
# naming, A71 the inside-the-set refusal, A72 the ORDER, and M50 turns A70 by reading the first column only.
# THE RECORD IS IN THE BASE ON PURPOSE, as in A64..A69: a doc that arrived in the candidate commit instead would
# put itself in the changed set and route for its own reason, and the case would never reach the entrance.

# A70. THE REPRODUCTION: a WORKTREE rename of a record OUTSIDE the set ROUTES at exit 2 and names BOTH paths.
D="$T/a70"; mkfix "$D"
printf '%s\n' "# run log" > "$D/RUN-LOG.md"
commitin "$D" "the base plus a tracked record"; A70B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
( cd "$D" && mv RUN-LOG.md RUN-LOG-moved.md && git add -N RUN-LOG-moved.md ) >/dev/null 2>&1
runtier "$D" "$A70B"
A70WHY=""
[ "$TRC" = 2 ] || A70WHY="exit $TRC, wanted 2"
grep -qF "RUN-LOG.md -> RUN-LOG-moved.md" <<<"$TOUT" || A70WHY="${A70WHY:+$A70WHY; }the verdict does not name both paths as old -> new"
# THE DEFECT'S OWN SIGNATURE, asserted as its own clause: an arrow with nothing after it means the second NUL
# field was never consumed. Checked separately from the line above so that neither can pass for the other.
grep -qE 'RUN-LOG\.md -> *$' <<<"$TOUT" && A70WHY="${A70WHY:+$A70WHY; }the arrow has nothing after it, so the old path was left in the NUL stream"
if [ -n "$A70WHY" ]; then
  rec A70 FAIL "a worktree rename outside the set :: $A70WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A70 ok "a WORKTREE rename of a record OUTSIDE the set ROUTES and names both paths old -> new (exit $TRC)"
fi

# A71. A rename with a path INSIDE the set still REFUSES, and names both paths. Asserted separately from A70 so
# that the two cannot pass as one: this is the half a route must never swallow.
D="$T/a71"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
( cd "$D" && mv gates/held.sh gates/held-moved.sh && git add -N gates/held-moved.sh ) >/dev/null 2>&1
expect A71 "$D" "$FIXBASE" 1 "gates/held.sh -> gates/held-moved.sh" \
  "a worktree rename with a path INSIDE the tier's set REFUSES and names both paths"

# A72. THE ORDER IS GIT'S OWN: old -> new, not the read order. A staged `git mv` of a record still refuses here
# (repair 3 of THE WORK rules on that separately), so this case is about the NAMING and nothing else.
D="$T/a72"; mkfix "$D"
printf '%s\n' "# run log" > "$D/RUN-LOG.md"
commitin "$D" "the base plus a tracked record"; A72B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
( cd "$D" && git mv RUN-LOG.md RUN-LOG-staged.md ) >/dev/null 2>&1
runtier "$D" "$A72B"
A72WHY=""
grep -qF "RUN-LOG.md -> RUN-LOG-staged.md" <<<"$TOUT" || A72WHY="the verdict does not print the rename as old -> new"
grep -qF "RUN-LOG-staged.md -> RUN-LOG.md" <<<"$TOUT" && A72WHY="${A72WHY:+$A72WHY; }the verdict prints it BACKWARDS, new -> old, which is the read order and not git's"
if [ -n "$A72WHY" ]; then
  rec A72 FAIL "a staged rename's printed order :: $A72WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A72 ok "a staged \`git mv\` of a record prints old -> new, git's own order (exit $TRC)"
fi

# M50. READ THE FIRST COLUMN ONLY, as the arm did before this repair, and A70 must turn.
D="$T/m-M50"; mkfix "$D"
# RE-ANCHORED AT #543 (repair 3): the rename test moved into the bucket ladder. Dropping its second-column
# limb makes a worktree rename read as an ordinary worktree edit, so the second NUL field is never consumed and
# the leftover old path is read back as the next entry - which is exactly the defect repair 1 removed.
printf '%s\t%s\n' \
  '      elif [ "$dx" = R ] || [ "$dx2" = R ]; then' \
  '      elif [ "$dx" = R ]; then # M50: the first column only' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M50 "read the rename's first column only" "$D/gates/checks-tier.sh" 'M50: the first column only'; then
  printf '%s\n' "# run log" > "$D/RUN-LOG.md"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M50 base" >/dev/null 2>&1
  M50B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  ( cd "$D" && mv RUN-LOG.md RUN-LOG-moved.md && git add -N RUN-LOG-moved.md ) >/dev/null 2>&1
  runtier "$D" "$M50B"
  if [ "$TRC" = 1 ]; then
    rec M50 ok "reading the first column only turns A70: the leftover old path is misread as a status entry and an honest commit is REFUSED again (exit 1)"
  else
    rec M50 FAIL "the either-column read is not load-bearing: the mutant still routed (exit $TRC)"
  fi
fi


# ══ A73, A74 AND M51. A SHALLOW ROOT ROUTES; IT DOES NOT ANSWER RED. ═════════════════════════════════════════
# #543, repair 2 of THE WORK. Fresh antagonist A's F2 of #542. main's gates/verify-log-selftest.sh pins a
# fixture log naming a commit 461 behind main, and THE ROUTINE'S OWN CLONE IS SHALLOW AT 50 COMMITS, which does
# not hold it - so main's selftest regressed inside the judge's battery and the acceptance arm turned that into
# CHECKS TIER RED at exit 1 on an honest commit. Reproduced end to end before the repair: a depth-50 clone with
# no local main read JUDGE EXIT 1 with TWO controls red (verify-log-selftest 76/5 and buildnum-selftest 218/1).
# THE SOURCE FIXTURE CARRIES THREE COMMITS ON PURPOSE. A depth-2 clone of a two-commit repository holds the
# whole history and `--is-shallow-repository` answers FALSE, so the case would assert nothing; and a depth-1
# clone DROPS THE BASE, which the judge refuses earlier for a different reason, so the case would pass without
# reaching this arm at all. Both preconditions are therefore asserted in the case rather than assumed.
# file:// IS LOAD-BEARING: git ignores --depth on a plain local-path clone.
D="$T/a73src"; mkfix "$D"
printf '%s\n' "# a record another chat keeps" > "$D/RUN-LOG.md"
commitin "$D" "the base, one commit above the fixture's first"; A73B="$(git -C "$D" rev-parse HEAD)"
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"

# A73. The depth-2 clone: shallow, base present, and it must ROUTE at exit 2 naming the shallow root.
A73C="$T/a73"; rm -rf "$A73C"
if ! git clone --quiet --depth 2 --single-branch "file://$D" "$A73C" >/dev/null 2>&1; then
  rec A73 FAIL "a shallow root routes :: the --depth 2 clone of the fixture could not be made"
else
  A73WHY=""
  [ "$(git -C "$A73C" rev-parse --is-shallow-repository 2>/dev/null)" = true ] \
    || A73WHY="the clone is NOT shallow, so this case asserts nothing about the arm"
  git -C "$A73C" cat-file -e "${A73B}^{commit}" 2>/dev/null \
    || A73WHY="${A73WHY:+$A73WHY; }the clone does not hold the BASE, so the judge refuses earlier for another reason"
  if [ -n "$A73WHY" ]; then
    rec A73 FAIL "a shallow root routes :: $A73WHY"
  else
    runtier "$A73C" "$A73B"
    [ "$TRC" = 2 ] || A73WHY="exit $TRC, wanted 2"
    grep -qF "SHALLOW clone" <<<"$TOUT" || A73WHY="${A73WHY:+$A73WHY; }the verdict does not say the root is shallow"
    grep -qF "fetch --unshallow" <<<"$TOUT" || A73WHY="${A73WHY:+$A73WHY; }the verdict does not name the remedy"
    if [ -n "$A73WHY" ]; then
      rec A73 FAIL "a shallow root routes :: $A73WHY"
      printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
    else
      rec A73 ok "a SHALLOW root ROUTES at exit 2, naming the shallow root and its remedy, instead of answering RED on an honest commit (exit $TRC)"
    fi
  fi
fi

# A74. THE SAME FIXTURE CLONED FULL IS UNCHANGED: the arm keys on the clone shape and on nothing else, so a full
# clone must not take that route. Asserted separately from A73 so neither can pass for the other.
A74C="$T/a74"; rm -rf "$A74C"
if ! git clone --quiet --single-branch "file://$D" "$A74C" >/dev/null 2>&1; then
  rec A74 FAIL "a full clone is unchanged :: the clone of the fixture could not be made"
else
  A74WHY=""
  [ "$(git -C "$A74C" rev-parse --is-shallow-repository 2>/dev/null)" = false ] \
    || A74WHY="the control clone is itself shallow, so it cannot show the arm is shape-keyed"
  if [ -n "$A74WHY" ]; then
    rec A74 FAIL "a full clone is unchanged :: $A74WHY"
  else
    runtier "$A74C" "$A73B"
    grep -qF "SHALLOW clone" <<<"$TOUT" && A74WHY="the full clone took the SHALLOW route, so the arm is not keyed on the clone shape"
    if [ -n "$A74WHY" ]; then
      rec A74 FAIL "a full clone is unchanged :: $A74WHY"
      printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
    else
      rec A74 ok "a FULL clone of the same fixture does not take the shallow route (exit $TRC)"
    fi
  fi
fi

# M51. REMOVE THE SHALLOW CHECK, and A73 must turn: the judge walks on into the battery in a shallow root.
D="$T/m-M51"; mkfix "$D"
printf '%s\t%s\n' \
  '  if [ "$("${GIT[@]}" rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then' \
  '  if false; then # M51: the shallow check removed' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M51 "remove the shallow-root route" "$D/gates/checks-tier.sh" 'M51: the shallow check removed'; then
  printf '%s\n' "# a record another chat keeps" > "$D/RUN-LOG.md"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M51 base" >/dev/null 2>&1
  M51B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  M51C="$T/m-M51-clone"; rm -rf "$M51C"
  if ! git clone --quiet --depth 2 --single-branch "file://$D" "$M51C" >/dev/null 2>&1; then
    rec M51 FAIL "remove the shallow-root route :: the --depth 2 clone could not be made"
  elif [ "$(git -C "$M51C" rev-parse --is-shallow-repository 2>/dev/null)" != true ]; then
    rec M51 FAIL "remove the shallow-root route :: the clone is not shallow, so the mutant is not exercised"
  else
    runtier "$M51C" "$M51B"
    if grep -qF "SHALLOW clone" <<<"$TOUT"; then
      rec M51 FAIL "the shallow route is not load-bearing: the mutant still named the shallow root (exit $TRC)"
    else
      rec M51 ok "removing the shallow check turns A73: the judge walks past a shallow root instead of routing it (exit $TRC, no shallow-root verdict)"
    fi
  fi
fi


# ══ A75..A77 AND M52. THE RULING: AN ENTRY IS CLASSIFIED BY ITS PATHS, NOT BY ITS BUCKET. ════════════════════
# #543, repair 3 of THE WORK. Fresh antagonist B's P2 of #542 - the class B asked be ruled on - and the
# orchestrator's ruling
# (decisions/a-staged-or-unmerged-doc-outside-the-tier-set-is-an-ordinary-state-so-the-tier-routes-it-2026-10-28).
# Reproduced at 1c7bd01 before the repair: an unmerged `UU README.md` from a conflicted cherry-pick, with HEAD
# STILL the tier-only candidate, REFUSED at exit 1, and so did a staged `M  README.md`. A75 pins the unmerged
# half, A76 the inside-the-set refusal that must NOT move, A77 the unmerged entry inside the set, and M52 puts
# the refuse-every-index-entry arm back and turns A75. A67 was REVERSED by the same ruling and is above.
# THE CONFLICT IS BUILT FROM A SIDE CHAIN WHOSE PARENT ALREADY DIFFERS FROM THE BASE, which is the only shape
# that leaves HEAD at the candidate: cherry-picking a commit whose parent IS the base applies cleanly, moves
# HEAD, and puts the record in the changed set - so the case would route for its own reason and never reach the
# entrance. That mistake was made once by hand on this run and is pinned here so it is not made again.

# A75. AN UNMERGED record OUTSIDE the set ROUTES at exit 2, named unmerged and outside.
D="$T/a75"; mkfix "$D"
printf '%s\n' "# readme" > "$D/README.md"
commitin "$D" "the base plus a tracked record"; A75B="$(git -C "$D" rev-parse HEAD)"
git -C "$D" checkout -q -b side >/dev/null 2>&1
printf '%s\n' "P" > "$D/README.md"; commitin "$D" "side1: the record one way"
printf '%s\n' "Q" > "$D/README.md"; commitin "$D" "side2: the record another way"
A75S="$(git -C "$D" rev-parse HEAD)"
git -C "$D" checkout -q -B cand "$A75B" >/dev/null 2>&1
printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
A75C="$(git -C "$D" rev-parse HEAD)"
git -C "$D" cherry-pick "$A75S" >/dev/null 2>&1
A75WHY=""
[ "$(git -C "$D" rev-parse HEAD)" = "$A75C" ] || A75WHY="the cherry-pick MOVED HEAD, so this case is not about the entrance"
git -C "$D" status --porcelain=v1 | grep -q '^UU README.md' || A75WHY="${A75WHY:+$A75WHY; }the fixture is not in the UU state this case is about"
if [ -n "$A75WHY" ]; then
  rec A75 FAIL "an unmerged record outside the set :: $A75WHY"
else
  runtier "$D" "$A75B"
  [ "$TRC" = 2 ] || A75WHY="exit $TRC, wanted 2"
  grep -qF "[unmerged, outside the set] " <<<"$TOUT" || A75WHY="${A75WHY:+$A75WHY; }the named line does not carry the bucket 'unmerged' and 'outside the set'"
  grep -qF "README.md" <<<"$TOUT" || A75WHY="${A75WHY:+$A75WHY; }the verdict does not NAME the unmerged path"
  if [ -n "$A75WHY" ]; then
    rec A75 FAIL "an unmerged record outside the set :: $A75WHY"
    printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
  else
    rec A75 ok "an UNMERGED record OUTSIDE the tier's set ROUTES, named unmerged and outside, instead of hard-refusing an honest commit (exit $TRC)"
  fi
fi

# A76. A STAGED edit INSIDE the set still REFUSES, named staged and inside. The half the ruling does not touch,
# asserted separately from A67 so that a route can never swallow it.
D="$T/a76"; mkfix "$D"
printf '%s\n' "# changed" >> "$D/gates/buildnum.sh"; commitin "$D" "a tier-only change"
printf '%s\n' "staged, and inside the set" >> "$D/gates/held.sh"
git -C "$D" add gates/held.sh >/dev/null 2>&1
runtier "$D" "$FIXBASE"
A76WHY=""
[ "$TRC" = 1 ] || A76WHY="exit $TRC, wanted 1"
grep -qF "[staged, inside the set] " <<<"$TOUT" || A76WHY="${A76WHY:+$A76WHY; }the named line does not carry the bucket 'staged' and 'inside the set'"
grep -qF "gates/held.sh" <<<"$TOUT" || A76WHY="${A76WHY:+$A76WHY; }the refusal does not NAME the staged path inside the set"
if [ -n "$A76WHY" ]; then
  rec A76 FAIL "a staged edit inside the tier's set :: $A76WHY"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
else
  rec A76 ok "a STAGED edit INSIDE the tier's set still REFUSES, named staged and inside (exit $TRC)"
fi

# A77. AN UNMERGED entry on a path INSIDE the set REFUSES. Separate from A75 so neither can pass for the other:
# the ruling turns on the PATHS, so both sides of it need their own case in the unmerged bucket.
D="$T/a77"; mkfix "$D"
git -C "$D" checkout -q -b side >/dev/null 2>&1
printf '%s\n' "P" >> "$D/gates/held.sh"; commitin "$D" "side1: the script one way"
printf '%s\n' "Q" >> "$D/gates/held.sh"; commitin "$D" "side2: the script another way"
A77S="$(git -C "$D" rev-parse HEAD)"
git -C "$D" checkout -q -B cand "$FIXBASE" >/dev/null 2>&1
printf '%s\n' "# changed" >> "$D/gates/buildnum.sh"; commitin "$D" "a tier-only change"
A77C="$(git -C "$D" rev-parse HEAD)"
git -C "$D" cherry-pick "$A77S" >/dev/null 2>&1
A77WHY=""
[ "$(git -C "$D" rev-parse HEAD)" = "$A77C" ] || A77WHY="the cherry-pick MOVED HEAD, so this case is not about the entrance"
git -C "$D" status --porcelain=v1 | grep -q '^UU gates/held.sh' || A77WHY="${A77WHY:+$A77WHY; }the fixture is not in the UU state this case is about"
if [ -n "$A77WHY" ]; then
  rec A77 FAIL "an unmerged path inside the set :: $A77WHY"
else
  expect A77 "$D" "$FIXBASE" 1 "[unmerged, inside the set] " \
    "an UNMERGED entry on a path INSIDE the tier's set REFUSES, named unmerged and inside"
fi

# M52. PUT THE REFUSE-EVERY-INDEX-ENTRY ARM BACK, and A75 must turn.
D="$T/m-M52"; mkfix "$D"
printf '%s\t%s\n' \
  '      elif [ "$dinside" = 1 ]; then' \
  '      elif [ "$dinside" = 1 ] || [ "$dx" != '"'"' '"'"' ]; then # M52: every index entry refuses again' \
  | mkmut "$D/gates/checks-tier.sh"
if mutguard M52 "refuse every index entry again" "$D/gates/checks-tier.sh" 'M52: every index entry refuses again'; then
  printf '%s\n' "# readme" > "$D/README.md"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M52 base" >/dev/null 2>&1
  M52B="$(git -C "$D" rev-parse HEAD)"
  git -C "$D" checkout -q -b side >/dev/null 2>&1
  printf '%s\n' "P" > "$D/README.md"; commitin "$D" "side1"
  printf '%s\n' "Q" > "$D/README.md"; commitin "$D" "side2"
  M52S="$(git -C "$D" rev-parse HEAD)"
  git -C "$D" checkout -q -B cand "$M52B" >/dev/null 2>&1
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  M52C="$(git -C "$D" rev-parse HEAD)"
  git -C "$D" cherry-pick "$M52S" >/dev/null 2>&1
  if [ "$(git -C "$D" rev-parse HEAD)" != "$M52C" ] || ! git -C "$D" status --porcelain=v1 | grep -q '^UU README.md'; then
    rec M52 FAIL "refuse every index entry again :: the mutant's fixture is not in the UU state, so the arm is not exercised"
  else
    runtier "$D" "$M52B"
    if [ "$TRC" = 1 ]; then
      rec M52 ok "the refuse-all-index-entries arm turns A75: an unmerged record outside the set hard-refuses an honest commit again (exit 1)"
    else
      rec M52 FAIL "the path-based classification is not load-bearing: the mutant still routed (exit $TRC)"
    fi
  fi
fi


if [ "$MODE" = fixed ] || [ "${CT_TIER_A1:-0}" = 1 ]; then
  A1D="$T/a1"
  if git clone --quiet --no-hardlinks --shared "$ROOT" "$A1D" >/dev/null 2>&1; then
    git -C "$A1D" config user.name ct-tier-drive
    git -C "$A1D" config user.email ct-tier-drive@local
    git -C "$A1D" config commit.gpgsign false
    cp "$G/checks-tier.sh" "$A1D/gates/checks-tier.sh"
    cp "$G/checks-tier-drive.sh" "$A1D/gates/checks-tier-drive.sh" 2>/dev/null || true
    mkdir -p "$A1D/gates/cases"
    cp "$G/cases/README.md" "$A1D/gates/cases/README.md" 2>/dev/null || true
    git -C "$A1D" add -A >/dev/null 2>&1
    git -C "$A1D" commit --quiet -m "A1 synthetic base: the tier as this tree carries it" >/dev/null 2>&1
    A1BASE="$(git -C "$A1D" rev-parse HEAD)"
    # The candidate: one new control file under gates/cases/ plus a change to verify-log.sh, which is exactly
    # the shape the tier exists for (the design's A1).
    printf '%s\n' "#!/usr/bin/env bash" "# A1's own new control" 'echo "PASS A1 control ran"' "exit 0" > "$A1D/gates/cases/c-a1.sh"
    chmod +x "$A1D/gates/cases/c-a1.sh"
    printf '%s\n' "# a comment-only change for A1" >> "$A1D/gates/verify-log.sh"
    git -C "$A1D" add -A >/dev/null 2>&1
    git -C "$A1D" commit --quiet -m "A1 candidate: verify-log.sh plus one new control" >/dev/null 2>&1
    A1S="$(date -u +%s)"
    # THE CLONE'S origin/main MUST BE POINTED AT THIS CASE'S BASE, and forgetting it cost this case one run.
    # A `git clone` of /home/user/chess-trainer sets refs/remotes/origin/main from the SOURCE REPOSITORY'S LOCAL
    # `main` BRANCH, which in this container is stale at #526 - not from the real origin/main - so the judge's
    # base-vs-main arm correctly routed A1 to the full suite. The real invocation passes origin/main AS the base,
    # so pointing the ref at A1BASE is what makes this fixture mirror reality rather than a convenience.
    git -C "$A1D" update-ref refs/remotes/origin/main "$A1BASE" >/dev/null 2>&1 || true
    TF="$(mktemp -d)"; git -C "$A1D" show "$A1BASE:gates/checks-tier.sh" > "$TF/ct.sh"
    A1OUT="$(cd "$A1D" && bash "$TF/ct.sh" "$A1BASE" "$A1D" 2>&1)"; A1RC=$?
    rm -rf "$TF"
    A1E="$(date -u +%s)"
    if [ "$A1RC" = 0 ] && grep -qF "CHECKS TIER GREEN" <<<"$A1OUT"; then
      rec A1 ok "the whole REAL battery is green on this tree in $((A1E-A1S))s (exit 0)"
    else
      rec A1 FAIL "the real battery did not go green (exit $A1RC, $((A1E-A1S))s)"
      printf '%s\n' "$A1OUT" | tail -30 | sed 's/^/          /'
    fi
  else
    rec A1 SKIP "could not clone the real repository for the full battery"
  fi
else
  rec A1 SKIP "the whole real battery is opt-in: run \`checks-tier-drive.sh fixed\` or set CT_TIER_A1=1"
fi

note ""
note "tier-drive: $OK ok, $FAILN FAIL, $SKIP skipped"
[ "$FAILN" = 0 ] && exit 0
exit 1
