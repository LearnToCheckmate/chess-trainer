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
  TOUT="$(cd "$d" && bash "$tf/ct.sh" "$base" "$d" 2>&1)"; TRC=$?
  rm -rf "$tf"
}

commitin(){ git -C "$1" add -A >/dev/null 2>&1; git -C "$1" commit --quiet -m "${2:-candidate}" >/dev/null 2>&1; }

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
note "cases: A1 to A41 plus one mutant per new arm (M1 to M30). Fixture repositories under $T."
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
expect A13 "$D" "$FIXBASE" 1 "working tree is not clean" "a dirty working tree is REFUSED"

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
sed -E 's/^(  DIRTY="\$\("\$\{GIT\[@\]\}" status --porcelain 2>\/dev\/null\)")$/  DIRTY=""/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M1 FAIL "the dirty-tree mutation changed nothing, so this mutant tests nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M1 base" >/dev/null 2>&1
  M1B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"; commitin "$D" "a tier-only change"
  printf '%s\n' "uncommitted" >> "$D/gates/held.sh"
  runtier "$D" "$M1B"
  if [ "$TRC" = 1 ] && grep -qF "working tree is not clean" <<<"$TOUT"; then
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
sed -E 's/^  if \[ "\$SNAP0" != "\$SNAP1" \]; then$/  if false; then/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
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
assert n == 2, "M5 anchor occurs %d times, expected 2 (P1's stripper and P2's)" % n
out = s.replace(A, B, 1)
assert out.count(A) == 1, "M5 must leave P2's stripper intact"
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
python3 -I -c "
import sys
src=open(sys.argv[1]).read()
old='      git config --global --list 2>/dev/null\n    }'
new=\"      git config --global --list 2>/dev/null\n    } | grep -v 'gates/logs/'\"
assert src.count(old)==1, 'anchor count %d' % src.count(old)
open(sys.argv[2],'w').write(src.replace(old,new))
" "$G/checks-tier.sh" "$D/gates/checks-tier.sh" 2>/dev/null
M13OK=1
if [ ! -s "$D/gates/checks-tier.sh" ]; then
  rec M13 FAIL "the mutation produced an EMPTY or missing file, so it tests nothing"; M13OK=0
elif cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M13 FAIL "the snapshot filter mutation changed nothing"; M13OK=0
elif ! bash -n "$D/gates/checks-tier.sh" 2>/dev/null; then
  rec M13 FAIL "the mutated judge does not parse, so its verdict is about a broken file and not about the arm"; M13OK=0
elif ! grep -qF "grep -v 'gates/logs/'" "$D/gates/checks-tier.sh"; then
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
printf '%s\t%s\n' "            if (c==\"/\" && d==\"/\") { break }\n            out = out c; i++\n          }\n          print out\n        }' 2>/dev/null | grep -nE \"child_process" "            if (c==\"/\" && d==\"/\") { break }\n            out = out c; i++\n          }\n          print \$0\n        }' 2>/dev/null | grep -nE \"child_process" | mkmut "$D/gates/checks-tier.sh"
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
if mutguard M18 "drop the tc() uniqueness guard" "$D/gates/checks-tier.sh" '  if false; then'; then
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
if mutguard M19 "drop the lock-integrity check" "$D/gates/checks-tier.sh" '  if false; then'; then
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
printf '%s\t%s\n' '  if [ "$SNAP0" != "$SNAP1" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M19b "disable the snapshot so the lock check stands alone" "$D/gates/checks-tier.sh" '  if false; then'; then
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
R="$(git config --get remote.origin.url)"; SH="$(git rev-parse --short HEAD)"
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
R="$(git config --get remote.origin.url)"; L="$R/gates/logs/.suite.lock"
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
R="$(git config --get remote.origin.url)"
mkdir -p "$R/gates/logs"; printf 'planted\n' > "$R/gates/logs/checks-deadbeef-all.logEVIL"
echo "PASS c-logwrite asserts nothing"
exit 0
LW
commitin "$D" "held.sh plus a control that writes under gates/logs"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qF "the real tree CHANGED" <<<"$TOUT" && grep -qF "checks-deadbeef-all.logEVIL" <<<"$TOUT"; then
  rec A32 ok "a write under gates/logs is seen AND the differing line is named in the verdict (exit $TRC)"
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
printf '%s\t%s\n' '  if [ "$SNAP0" != "$SNAP1" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M20 "disable the snapshot comparison" "$D/gates/checks-tier.sh" '  if false; then'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M20 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cat > "$D/gates/cases/c-evil.sh" <<'EVIL'
#!/usr/bin/env bash
R="$(git config --get remote.origin.url)"; SH="$(git rev-parse --short HEAD)"
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
  printf '%s\t%s\n' '  if [ "$SELFLOGBAD" = 0 ] && [ -e "$OUT" ]; then' '  if false; then'
  printf '%s\t%s\n' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$LOGTMP" 2>/dev/null && mv -f -- "$LOGTMP" "$OUT" 2>/dev/null; then' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$OUT" 2>/dev/null; then'
} | mkmut "$D/gates/checks-tier.sh"
if mutguard M21 "disable both halves of the write-target guard" "$D/gates/checks-tier.sh" '  for _p in; do'; then
  mkdir -p "$D/gates/cases"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M21 base" >/dev/null 2>&1
  MB="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  cat > "$D/gates/cases/c-evil.sh" <<'EVIL'
#!/usr/bin/env bash
R="$(git config --get remote.origin.url)"; SH="$(git rev-parse --short HEAD)"
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
R="$(git config --get remote.origin.url)"; L="$R/gates/logs/.suite.lock"
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
printf '%s\t%s\n' '    ( cd "$d" && timeout "$CTLTMO" "$@" >"$outf" 2>&1 </dev/null ); rc=$?' '    ( cd "$d" && "$@" >"$outf" 2>&1 </dev/null ); rc=$?' | mkmut "$D/gates/checks-tier.sh"
if mutguard M23 "remove the per-control timeout" "$D/gates/checks-tier.sh" '    ( cd "$d" && "$@" >"$outf" 2>&1 </dev/null ); rc=$?'; then
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
R="\$(git config --get remote.origin.url)"; SH="\$(git rev-parse --short HEAD)"
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
R="$(git config --get remote.origin.url)"
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
R="$(git config --get remote.origin.url)"; SH="$(git rev-parse --short HEAD)"
mkdir -p "$R/gates/logs/checks-$SH-all.log"
echo "PASS c-nolog asserts nothing"
exit 0
NL
commitin "$D" "held.sh plus a control that puts a DIRECTORY at the log path"
runtier "$D" "$FIXBASE"
if [ "$TRC" = 1 ] && grep -qF "NOT a regular file" <<<"$TOUT"; then
  rec A41 ok "a directory at the log path is refused and the verdict says why (exit $TRC)"
else
  rec A41 FAIL "a directory at the log path did not refuse with a reason (exit $TRC)"
  printf '%s\n' "$TOUT" | tail -8 | sed 's/^/          /'
fi

# ── M29. REMOVE THE BASE-vs-origin/main ARM: A38 must stop routing.
D="$T/m-M29"; mkfix "$D"
printf '%s\t%s\n' '  if [ "$ORIGINMAIN" != "$BASESHA" ]; then' '  if false; then' | mkmut "$D/gates/checks-tier.sh"
if mutguard M29 "remove the base-vs-origin/main arm" "$D/gates/checks-tier.sh" '  if false; then'; then
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
printf '%s\t%s\n' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$LOGTMP" 2>/dev/null && mv -f -- "$LOGTMP" "$OUT" 2>/dev/null; then' '  elif printf '"'"'%s'"'"' "$LOGLINES" > "$OUT" 2>/dev/null; then' | mkmut "$D/gates/checks-tier.sh"
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

# ── A1. THE WHOLE REAL BATTERY, IN THE REAL REPOSITORY. The only slow case, about 6.5 minutes. ──────────────
# It is the case that says the battery is green HERE, on this tree, rather than on a fixture of stubs. It needs
# the tier to exist on origin/main, so before this work lands it runs against the WORKING TREE's copy installed
# as a synthetic base in a full clone of the real repository.
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
