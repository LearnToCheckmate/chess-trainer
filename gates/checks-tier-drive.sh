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
  printf '%s\n' "PASS stub" "GATES GREEN #500" > "$d/claude/agents/gatelogs/500-all.log"
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
note "cases: A1 to A15 plus one mutant per new arm. Fixture repositories under $T."
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
expect A8 "$D" "$A8BASE" 1 "PREMISE P1 BROKEN" "a real read of a tier path in the browser read set is REFUSED"

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

# ── A12. A CONTROL THAT REWRITES OR APPENDS TO THE JUDGE GETS THE ORIGINAL'S VERDICT. ───────────────────────
# The judge is one function with `main "$@"; exit $?` on its last line, so its body is fully parsed before it
# runs and an appended line is never reached. Both attacks are run against a tree that is otherwise GREEN.
A12BAD=""
for kind in rewrite append; do
  D="$T/a12-$kind"; mkfix "$D"
  case "$kind" in
    rewrite) BODY='for f in /proc/$PPID/fd/*; do : ; done; printf "%s\n" "echo HIJACKED; exit 0" >> "$0" 2>/dev/null || true' ;;
    append)  BODY='printf "%s\n" "echo HIJACKED; exit 0" >> "$OLDPWD/gates/checks-tier.sh" 2>/dev/null || true' ;;
  esac
  { printf '%s\n' "#!/usr/bin/env bash"
    printf '%s\n' "$BODY"
    printf '%s\n' 'echo "SELFTEST 3 pass / 0 fail"' "exit 0"; } > "$D/gates/gates.sh"
  commitin "$D" "a control that attacks the judge ($kind)"; B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  commitin "$D" "a tier-only change"
  runtier "$D" "$B"
  if grep -qF "HIJACKED" <<<"$TOUT"; then A12BAD="$A12BAD $kind(hijacked)"; fi
  # The honest verdict for this tree is 0 (a tier-only change, stub controls green) or 1 if the write was
  # detected by the real-tree snapshot. Either is the ORIGINAL's verdict; what must never happen is the
  # attacker's own exit reaching the caller as a green it did not earn.
  if [ "$TRC" != 0 ] && [ "$TRC" != 1 ]; then A12BAD="$A12BAD $kind(exit $TRC)"; fi
done
if [ -n "$A12BAD" ]; then rec A12 FAIL "the judge was hijacked:$A12BAD"
else rec A12 ok "rewriting the judge's bytes and appending to it both yield the original's verdict"; fi

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

# ── THE MUTANTS. EACH DISABLES ONE ARM AND MUST TURN A CASE. ─────────────────────────────────────────────────
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
  O="$(cd "$D" && bash "$TF/ct.sh" "$M2B" "$D" 2>&1)"; R=$?; rm -rf "$TF"
  if [ "$R" = 1 ] && grep -qF "self pin" <<<"$O" && grep -qF "REFUSED" <<<"$O"; then
    rec M2 FAIL "the self pin still refused with its comparison removed"
  else
    rec M2 ok "removing the self pin turns A6 (exit $R, no refusal)"
  fi
fi

# M3. Widen the routing to allow any gates/ path: A3 must stop routing.
D="$T/m-M3"; mkfix "$D"
sed -E 's|^      gates/fastgate\.sh\|gates/verify-log\.sh\|gates/held\.sh\|gates/buildnum\.sh\)$|      gates/*)|' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M3 FAIL "the routing mutation changed nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M3 base" >/dev/null 2>&1
  M3B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "// touched" >> "$D/gates/lib.js"
  commitin "$D" "held.sh plus gates/lib.js under a widened routing"
  runtier "$D" "$M3B"
  if [ "$TRC" = 2 ] && grep -qF "outside this tier's set" <<<"$TOUT"; then
    rec M3 FAIL "the path routing still named gates/lib.js with its case widened to gates/*"
  else
    rec M3 ok "widening the routing to gates/* turns A3's gates/lib.js case (exit $TRC)"
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
sed -E 's|if \(c=="/" \&\& d=="\*"\) \{ inblock=1; i\+=2; continue \}|if (0) { inblock=1; i+=2; continue }|' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M5 FAIL "the block-comment mutation changed nothing"
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

# M6. Remove the bundle-identity arm: A7 must stop refusing the rename.
D="$T/m-M6"; mkfix "$D"
sed -E 's/^  if \[ -n "\$mismatch" \]; then$/  if false; then/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M6 FAIL "the identity mutation changed nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M6 base" >/dev/null 2>&1
  M6B="$(git -C "$D" rev-parse HEAD)"
  mkdir -p "$D/gates/cases"
  git -C "$D" mv app.js gates/cases/app.js >/dev/null 2>&1 || mv "$D/app.js" "$D/gates/cases/app.js"
  commitin "$D" "rename app.js into gates/cases/ under a removed identity arm"
  runtier "$D" "$M6B"
  if grep -qF "served tree" <<<"$TOUT"; then
    rec M6 FAIL "the identity arm still fired with its branch removed"
  else
    rec M6 ok "removing the identity arm turns A7's detection (exit $TRC, no identity verdict)"
  fi
fi

# M7. Allow an existing gates/cases/ file to change: A4a must stop routing.
D="$T/m-M7"; mkfix "$D"
sed -E 's/^  if \[ -n "\$EXISTINGCASES" \]; then$/  if false; then/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M7 FAIL "the existing-cases mutation changed nothing"
else
  mkdir -p "$D/gates/cases"; printf '%s\n' "#!/usr/bin/env bash" "echo PASS existing" "exit 0" > "$D/gates/cases/c-old.sh"
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M7 base" >/dev/null 2>&1
  M7B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# weakened" >> "$D/gates/cases/c-old.sh"
  printf '%s\n' "# changed" >> "$D/gates/buildnum.sh"
  commitin "$D" "weaken an existing control under a removed arm"
  runtier "$D" "$M7B"
  if grep -qF "EXISTING gates/cases/ file" <<<"$TOUT"; then
    rec M7 FAIL "the existing-control arm still fired with its branch removed"
  else
    rec M7 ok "removing the existing-control arm turns A4a (exit $TRC)"
  fi
fi

# M8. Remove the harness-identity arm: A5s1 must stop routing on a harness-only change.
D="$T/m-M8"; mkfix "$D"
sed -E 's/^    if \[ "\$hb" != "\$hh" \]; then$/    if false; then/' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M8 FAIL "the harness-identity mutation changed nothing"
else
  git -C "$D" add -A >/dev/null 2>&1; git -C "$D" commit --quiet -m "mutant M8 base" >/dev/null 2>&1
  M8B="$(git -C "$D" rev-parse HEAD)"
  printf '%s\n' "# changed" >> "$D/gates/held.sh"
  printf '%s\n' "# S1: one added line" >> "$D/gates/held-selftest.sh"
  commitin "$D" "held.sh plus one harness line under a removed arm"
  runtier "$D" "$M8B"
  if grep -qF "not byte-identical to the base" <<<"$TOUT"; then
    rec M8 FAIL "the harness-identity arm still fired with its branch removed"
  else
    rec M8 ok "removing the harness-identity arm turns the two-commit split's S1 (exit $TRC)"
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

# M12. Remove the .sh/.md guard on a new gates/cases/ file: A17 must stop routing.
D="$T/m-M12"; mkfix "$D"
sed -E 's|^          \*\.sh\|\*\.md\) ;;$|          *) ;;|' "$G/checks-tier.sh" > "$D/gates/checks-tier.sh"
if cmp -s "$D/gates/checks-tier.sh" "$G/checks-tier.sh"; then
  rec M12 FAIL "the gates/cases form mutation changed nothing"
else
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

# M13. Restore the substring gates/logs filter: A18 must stop catching the write.
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
old='| grep -vF -e \"gates/logs/.suite.lock\" -e \"\$SELFLOG\" |'
new=\"| grep -v 'gates/logs/' |\"
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
