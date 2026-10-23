#!/usr/bin/env bash
# gates/checks-tier.sh <base-sha> <repo-root>
#   -> decides whether a commit that changes ONLY the four push check scripts may push WITHOUT the full suite,
#      and gates it by running MAIN'S OWN copy of the checks against the candidate.
#
# HOW IT IS RUN, AND IT IS NEVER RUN FROM THE WORKING TREE:
#   T="$(mktemp -d)"; git show origin/main:gates/checks-tier.sh > "$T/checks-tier.sh"
#   bash "$T/checks-tier.sh" "$(git rev-parse origin/main)" "$(git rev-parse --show-toplevel)"
#
# WHY THIS EXISTS (Kunal, 2026-10-23, "Yes." at about 2:39am ET; decisions/push-checks-only-tier-yes-2026-10-23).
# A commit that changes only gates/fastgate.sh, gates/verify-log.sh, gates/held.sh or gates/buildnum.sh pays the
# full suite - about 113 minutes over #527 to #534 - and almost all of it is the 60 browser sections. MEASURED on
# main: no file in the browser read set (gates/regress/*.js, gates/lib.js, gates/drive/*, gates/mountcheck.js,
# gates/engine-extract.js) reads or runs any of those four scripts on a non-comment line, and child_process
# appears in that whole set only in gates/lib.js, twice, for `fc-match` and `python3 -m http.server`. So for such
# a commit the browser sections are a TOLL and not a check. 42 open jobs change only these four scripts.
#
# THE CLAIM IT RESTS ON, AND IT IS AN IDENTITY RATHER THAN A RISK JUDGEMENT. If the served tree and the browser
# read set are byte-identical at base and head, no browser gate can return a verdict different from the one it
# returned on the base. PREMISE below re-derives that on every run and REFUSES if it has stopped holding, so the
# identity is checked rather than asserted.
#
# AND THE PUSH IS JUDGED BY MAIN'S COPY OF THE CHECKS, NOT BY THE CHANGED COPY. That is Kunal's own condition and
# it is the whole reason this is sound: a weakened check cannot approve itself. Every control in the battery runs
# in its own throwaway clone checked out at HEAD with refs/remotes/origin/main pointed at the base, and the
# HARNESSES (gates/fastgate-drive.sh, gates/verify-log-selftest.sh, gates/held-selftest.sh,
# gates/buildnum-selftest.sh) and every EXISTING gates/cases/ file must be byte-identical to main. WHY THE
# HARNESSES MAY NOT CHANGE, measured by the design's reviewer: it added ONE line to held-selftest.sh (a `ck` that
# prints PASS with the wanted exit) and kept 71 of 71, and then a second commit turned off held.sh's SOURCE key
# under the weakened harness. On this tier main's harnesses are the only harnesses, and a fix's new cases go in a
# NEW file under gates/cases/, which can add a check and can never remove one.
#
# WHY THE WHOLE PROGRAM IS ONE FUNCTION WITH `main "$@"; exit $?` ON THE LAST LINE. Two attacks the design's
# reviewer ran against earlier drafts, both of which this shape closes by construction rather than by a test:
#   (1) IT REWROTE THE JUDGE'S UNREAD BYTES through /proc while bash was still reading the file by byte offset.
#       Bash parses a function body COMPLETELY before it runs, so by the time `main` executes there are no unread
#       bytes left to rewrite. This is the same mechanism CLAUDE.md records costing #461 a 71-minute suite.
#   (2) IT APPENDED A LINE that ran after a bare `main "$@"` and turned a RED into exit 0. `exit $?` on the same
#       last line means an appended line is never reached.
# So: no code outside main, nothing at load time, and nothing after the exit. Do not add a helper above main.
#
# EXITS, AND THEY ARE THE WHOLE INTERFACE:
#   0  CHECKS TIER GREEN <sha>   - this commit may push without the full suite.
#   2  GO FULL <reason>          - NOT a failure and NOT a red. Run the full suite exactly as before.
#   1  REFUSED or RED            - stop. Do not push, do not re-run hoping for a different answer.
# THE DEFAULT IS FULL. Any path this script does not recognise forces the full suite, which is the opposite of
# how a subset run picks its gates and is why a green here may authorise a push where a subset never can.
#
# IT EMITS "CHECKS TIER GREEN" AND DELIBERATELY NOT "GATES GREEN": every consumer in this project greps for that
# exact string, and gates/verify-log.sh will refuse this log as a bundle push gate, correctly, because it is not
# one. This log says the served tree is identical, main's own checks were run against the candidate and passed,
# and the real tree was not touched. It says nothing about the app.
set -uo pipefail

main(){
  # ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  # EVERYTHING IS LOCAL TO THIS FUNCTION, INCLUDING THE HELPERS, so the parse-before-run property above holds.
  # ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  local BASE="${1:-}" ROOT="${2:-}"
  local RC=0 VERD="" LOGLINES="" SHORT="" HEADSHA="" BASESHA=""
  local WORK="" SNAP0="" SNAP1="" SNAPTXT0="" SNAPTXT1="" LOCK="" LOCKHELD=0 LOCKSIG0="" SELFLOGBAD=0
  local CTLTMO="${CT_CTL_TIMEOUT:-600}"

  # Verdicts are kept IN MEMORY and the log is written ONCE, at the end, after the real-tree check. A judge that
  # appends as it goes hands an attacker a file to edit and a half-written log to a reader who sees no verdict.
  local -a FIND=()
  say(){ LOGLINES="$LOGLINES$*"$'\n'; printf '%s\n' "$*"; }
  bad(){ FIND+=("$*"); }

  if [ -z "$BASE" ] || [ -z "$ROOT" ]; then
    printf '%s\n' "checks-tier.sh: usage: bash checks-tier.sh <base-sha> <repo-root>" \
      "  Run it from main's own blob, never from the working tree:" \
      "  T=\"\$(mktemp -d)\"; git show origin/main:gates/checks-tier.sh > \"\$T/checks-tier.sh\"" \
      "  bash \"\$T/checks-tier.sh\" \"\$(git rev-parse origin/main)\" \"\$(git rev-parse --show-toplevel)\""
    return 2
  fi
  [ -d "$ROOT/.git" ] || { printf '%s\n' "checks-tier.sh: REFUSED - $ROOT is not a git repository."; return 1; }

  # GIT AS AN ARRAY AND NEVER A STRING [jobs/gates-fastgate-sh-keeps-git-in-a-string-so-at-a-checkout-path-with-a-
  # space-every-git-call-fails-and-its-refusals-become-routes-2026-10-22]: fastgate.sh holds GIT as a string with
  # 42 unquoted uses, so a checkout path containing a SPACE makes every git call fail silently, HEAD resolve to
  # the literal 'unknown', and its REFUSALS stop firing - exit 1 becomes exit 2. An array cannot do that.
  local -a GIT=(git -C "$ROOT" --git-dir="$ROOT/.git" --work-tree="$ROOT")

  BASESHA="$("${GIT[@]}" rev-parse --verify "$BASE^{commit}" 2>/dev/null)" || BASESHA=""
  HEADSHA="$("${GIT[@]}" rev-parse --verify 'HEAD^{commit}' 2>/dev/null)" || HEADSHA=""
  [ -n "$BASESHA" ] || { printf '%s\n' "checks-tier.sh: REFUSED - base '$BASE' does not resolve to a commit."; return 1; }
  [ -n "$HEADSHA" ] || { printf '%s\n' "checks-tier.sh: REFUSED - HEAD does not resolve to a commit in $ROOT."; return 1; }
  SHORT="$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null)"; [ -n "$SHORT" ] || SHORT="unknown"

  say "checks-tier.sh  base=${BASESHA:0:12}  head=${HEADSHA:0:12}  root=$ROOT"
  say "  run at $(date -u '+%Y-%m-%dT%H:%M:%SZ') ($(TZ=America/New_York date '+%-I:%M%p ET, %-d %b %Y'))"

  # ── (1) THE SELF PIN. THE RUNNING BYTES MUST BE MAIN'S BYTES. ────────────────────────────────────────────────
  # A6. The judge is only main's judge if it IS main's copy. Both blob ids are printed, so a reader can see which
  # two objects were compared rather than trusting a yes. `git hash-object` is the same function git uses to make
  # the blob, so this is an identity and not a heuristic.
  local MINE THEIRS SELF="${BASH_SOURCE[0]}"
  MINE="$("${GIT[@]}" hash-object -t blob -- "$SELF" 2>/dev/null)" || MINE=""
  THEIRS="$("${GIT[@]}" rev-parse --verify "$BASESHA:gates/checks-tier.sh" 2>/dev/null)" || THEIRS=""
  say "  self pin: running=${MINE:-none}  base=${THEIRS:-none}"
  if [ -z "$THEIRS" ]; then
    # GO FULL AND NOT REFUSED [antagonist A, P2]. This read `return 1`, and exit 1 means "stop, do not push, do
    # not re-run hoping for a different answer". But a base with no gates/checks-tier.sh is simply a base that
    # PREDATES this tier - which is every base until this build lands, and every branch cut before it - and the
    # right answer for "this tier cannot judge your commit" is the full suite, which is this script's whole
    # default. Refusing it told honest commits they were broken.
    say "GO FULL: the base ${BASESHA:0:12} carries no gates/checks-tier.sh, so there is no main copy to judge by."
    say "  That is a base predating this tier, not a fault in your commit. The full suite decides it."
    return 2
  fi
  if [ "$MINE" != "$THEIRS" ]; then
    say "REFUSED: the running copy of this script is NOT the base's copy (running ${MINE:-none}, base $THEIRS)."
    say "  A tier judged by a changed tier is the defect this whole step exists to prevent: run it from"
    say "  \`git show origin/main:gates/checks-tier.sh\` and nothing else."
    return 1
  fi

  # ── (2) A DIRTY WORKING TREE IS REFUSED. ────────────────────────────────────────────────────────────────────
  # A13. Every verdict below is about the COMMITTED candidate. On a dirty tree they would be verdicts about a
  # commit nobody is looking at, which is #533's "a closing claim is no wider than its controls" one step earlier.
  local DIRTY
  DIRTY="$("${GIT[@]}" status --porcelain 2>/dev/null)"
  if [ -n "$DIRTY" ]; then
    say "REFUSED: the working tree is not clean, and every check below is about the COMMITTED candidate."
    say "$(printf '%s\n' "$DIRTY" | sed 's/^/    /')"
    return 1
  fi

  # ── (3) THE CHANGED SET, AND THE DEFAULT IS FULL. ───────────────────────────────────────────────────────────
  # --no-renames because `git diff --name-only` reports only the DESTINATION of a rename, which is how a
  # `git mv app.js claude/old-app.js.md` once presented as a single records path and took a fast green whose own
  # log said "bundle UNCHANGED" while the bundle was gone (A7 is that attack aimed at a tier-looking path).
  local CHANGED NEWFILES="" EXISTINGCASES=""
  CHANGED="$("${GIT[@]}" diff --no-renames --name-only "$BASESHA" "$HEADSHA" 2>/dev/null)"
  local ADDED
  ADDED="$("${GIT[@]}" diff --no-renames --diff-filter=A --name-only "$BASESHA" "$HEADSHA" 2>/dev/null)"
  if [ -z "$CHANGED" ]; then
    say "GO FULL: the changed set over ${BASESHA:0:12}..${HEADSHA:0:12} is EMPTY, so there is nothing for this tier to judge."
    return 2
  fi
  say "  changed set: $(printf '%s\n' "$CHANGED" | grep -c . || true) path(s)"

  # THE FOUR SCRIPTS AND NOTHING ELSE, PLUS NEW FILES UNDER gates/cases/. Any other path - app.js, chess.jsx,
  # gates/lib.js, a regress gate, a driver, gates/gates.sh, records-gate.sh, control-audit.js, EITHER REGISTER,
  # a record file, or a harness - routes to the full suite (A2, A3, A4, A14). A register row routes FULL on
  # purpose: it is read by gates/buildnum.sh's own arms, so a tier that waved its own mint row through would be
  # judging a changed input with a changed judge.
  local tierpaths=0 p isnew
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      gates/fastgate.sh|gates/verify-log.sh|gates/held.sh|gates/buildnum.sh)
        tierpaths=$((tierpaths+1)) ;;
      gates/cases/*)
        # A NEW FILE HERE MUST BE .sh OR .md, AND THAT IS MY OWN FINDING FROM RE-READING THIS DIFF [#535]. The
        # routing counted ANY new path under gates/cases/ as a tier path, and the battery's run loop only
        # `bash`-es *.sh - so a new `gates/cases/x.js` was waved through and executed by NOTHING. That is "a test
        # in the repo that no suite runs" arriving inside the one directory this tier exists to let a fix add
        # controls to. Anything else here routes to the full suite, where the whole suite can judge it.
        case "$p" in
          *.sh|*.md) ;;
          *)
            say "GO FULL: '$p' is a new file under gates/cases/ that is neither .sh nor .md, so nothing would run it."
            say "  This tier runs every new gates/cases/*.sh and reads gates/cases/*.md as documentation. A file"
            say "  in any other form would be added and executed by nothing, so the full suite decides it."
            return 2 ;;
        esac
        isnew=0
        while IFS= read -r a; do [ "$a" = "$p" ] && isnew=1; done <<<"$ADDED"
        if [ "$isnew" = 1 ]; then
          tierpaths=$((tierpaths+1)); NEWFILES="$NEWFILES$p"$'\n'
        else
          # A4. An EXISTING control file changed or deleted. A control set that can be edited down is not a
          # control set: this is the one direction gates/cases/ may not move, and it is why the tier allows
          # ADDITIONS there and nothing else.
          EXISTINGCASES="$EXISTINGCASES$p"$'\n'
        fi ;;
      *)
        say "GO FULL: '$p' is outside this tier's set, so the full suite decides this commit."
        say "  This tier judges ONLY gates/fastgate.sh, gates/verify-log.sh, gates/held.sh, gates/buildnum.sh"
        say "  and NEW files under gates/cases/. Any other path - a bundle input, a gate, a driver, the harness,"
        say "  either register, or a record file - forces the full suite. The default is FULL."
        return 2 ;;
    esac
  done <<<"$CHANGED"

  if [ -n "$EXISTINGCASES" ]; then
    say "GO FULL: an EXISTING gates/cases/ file was changed or deleted, which this tier may not wave through:"
    say "$(printf '%s' "$EXISTINGCASES" | sed 's/^/    /')"
    say "  gates/cases/ is append-only to this tier: a new file may ADD a check and nothing may REMOVE one."
    return 2
  fi
  if [ "$tierpaths" = 0 ]; then
    say "GO FULL: no path in the changed set belongs to this tier, so it has no claim to make about this commit."
    return 2
  fi

  # ── (4) BUNDLE AND READ-SET IDENTITY, BY BLOB ID AND NOT BY THE PATH LIST. ──────────────────────────────────
  # THE PATH LIST ABOVE IS NOT TRUSTED ALONE, which is the #489 lesson: the decisive hole was never in the
  # allowlist. The SERVED TREE is derived from gates/lib.js:195 - the site directory is the repository with every
  # top-level entry symlinked except `.git`, `gates` and `app.js`, and app.js copied from the bundle - so the
  # served set is "every top-level entry except .git and gates", compared as TREE AND BLOB IDS so a change
  # anywhere inside one of those subtrees is caught without enumerating it. The browser READ SET under gates/ is
  # compared the same way. This is the arm that stops A7: a rename of app.js into a tier-looking path changes
  # the served tree whatever the changed set calls itself.
  local sb sh_ mismatch=""
  for o in app.js index.html chess.jsx; do
    sb="$("${GIT[@]}" rev-parse --verify "$BASESHA:$o" 2>/dev/null || echo ABSENT)"
    sh_="$("${GIT[@]}" rev-parse --verify "$HEADSHA:$o" 2>/dev/null || echo ABSENT)"
    [ "$sb" = "$sh_" ] || mismatch="$mismatch  $o: base=$sb head=$sh_"$'\n'
  done
  # Every top-level entry except .git and gates, by its own object id, plus the read set under gates/.
  local tb th
  tb="$("${GIT[@]}" ls-tree "$BASESHA" | grep -v $'\tgates$' || true)"
  th="$("${GIT[@]}" ls-tree "$HEADSHA" | grep -v $'\tgates$' || true)"
  if [ "$tb" != "$th" ]; then
    mismatch="$mismatch  the served tree (every top-level entry except gates) differs at base and head"$'\n'
  fi
  for o in gates/lib.js gates/mountcheck.js gates/engine-extract.js gates/drive gates/regress; do
    sb="$("${GIT[@]}" rev-parse --verify "$BASESHA:$o" 2>/dev/null || echo ABSENT)"
    sh_="$("${GIT[@]}" rev-parse --verify "$HEADSHA:$o" 2>/dev/null || echo ABSENT)"
    [ "$sb" = "$sh_" ] || mismatch="$mismatch  $o: base=$sb head=$sh_"$'\n'
  done
  if [ -n "$mismatch" ]; then
    say "GO FULL: the served tree or the browser read set is NOT byte-identical at base and head."
    say "$(printf '%s' "$mismatch")"
    say "  The identity this tier rests on has not been met for this commit, so the browser sections are a real"
    say "  check and not a toll. Run the full suite."
    return 2
  fi
  say "  identity: the served tree and the browser read set are byte-identical at base and head"

  # ── (5) THE PREMISE, RE-DERIVED EVERY RUN. ──────────────────────────────────────────────────────────────────
  # P1: no non-comment line of the browser read set names a tier path or its basename. A8 plants exactly that on
  # the BASE and must read 1.
  # BLOCK COMMENTS ARE STRIPPED AS WELL AS LINE COMMENTS, AND THAT IS NOT A REFINEMENT - IT IS THE DIFFERENCE
  # BETWEEN THIS ARM WORKING AND REFUSING EVERY HONEST TREE. MEASURED at a30fc59 while this was written: a
  # `//`-only strip returns ONE hit, gates/regress/66-winprob-ladder.js:178, and it is PROSE inside a block
  # comment ("the same shape as verify-log.sh refusing the ..."). A premise arm that counted that would refuse
  # main itself, for a word in a paragraph. python3 does the stripping because it is the one tool here that can
  # hold the two comment states without a regex that lies.
  local P1 P2 premise_rc
  P1="$("${GIT[@]}" ls-tree -r --name-only "$BASESHA" -- gates/regress gates/drive gates/lib.js \
          gates/mountcheck.js gates/engine-extract.js 2>/dev/null)"
  premise_rc=0
  local badp
  # THE COMMENT STRIP IS awk AND NOT AN INLINE python -c, AND THE REASON IS A DEFECT OF MINE THAT MY OWN A1 CASE
  # CAUGHT. The first version embedded a python state machine inside this quoted heredoc, and the nested quote
  # escaping did not survive: the file literally carried `c=="'"'"'"`, which python reads as a TWO-CHARACTER
  # string that no single character can equal, so the string-tracking arms were dead and the stripper mis-read
  # the real tree. It reported gates/regress/66-winprob-ladder.js:178 - prose inside a block comment that opens
  # at :172 - as a live read, which would have REFUSED main itself. One nested-quote mistake, one false P0.
  # SO THIS STRIP IS DELIBERATELY SIMPLER THAN A JS LEXER, AND ITS LIMIT IS NOW STATED CORRECTLY - THE FIRST
  # VERSION OF THIS PARAGRAPH WAS WRONG IN BOTH SCOPE AND DIRECTION [antagonist A, P2, withdrawn here]. It said a
  # `//` or `/*` inside a string literal "over-strips the rest of that LINE" and concluded "what it must never do
  # is refuse an honest tree, and over-stripping cannot". BOTH HALVES ARE FALSE. `inblock` persists to the end of
  # the FILE, not the line; and over-stripping produces a false GREEN, not only a harmless refusal. MEASURED: a
  # regress gate whose base carries `const marker = '/*';` and then a real
  # `require('fs').readFileSync('../verify-log.sh')` reads "premise: P1 clean" and CHECKS TIER GREEN, while A8
  # proves the same read without that one preceding line is PREMISE P1 BROKEN at exit 1. So one line in the base
  # can hide the read this arm exists to find.
  # WHY IT IS STILL ACCEPTED, stated as a bound rather than a dismissal: this arm only ever reads the BASE, because
  # any change to the browser read set routes to the full suite at exit 2 before it is reached - so defeating it
  # takes a commit that already went through a full suite, and it is a latent weakness in the identity rather than
  # a one-commit attack. It is recorded as a known limit on the job, with the remedy named: a real JS tokeniser,
  # or a check that the file's comment state is balanced at EOF.
  badp="$(
    printf '%s\n' "$P1" | while IFS= read -r f; do
      [ -n "$f" ] || continue
      case "$f" in *.js) ;; *) continue;; esac
      "${GIT[@]}" cat-file blob "$BASESHA:$f" 2>/dev/null | awk '
        BEGIN{ inblock=0 }
        {
          line=$0; out=""; i=1; L=length(line)
          while (i<=L) {
            c=substr(line,i,1); d=substr(line,i+1,1)
            if (inblock) { if (c=="*" && d=="/") { inblock=0; i+=2 } else { i++ } ; continue }
            if (c=="/" && d=="*") { inblock=1; i+=2; continue }
            if (c=="/" && d=="/") { break }
            out = out c; i++
          }
          if (out ~ /(checks-tier|checks-tier-drive|fastgate|verify-log|held|buildnum)\.sh/) {
            sub(/^[ \t]+/, "", out)
            printf "%d: %s\n", NR, substr(out,1,120)
          }
        }' 2>/dev/null | sed "s|^|$f:|"
    done
  )"
  if [ -n "$badp" ]; then
    say "REFUSED: PREMISE P1 BROKEN - the browser read set reads a push check path on a NON-COMMENT line:"
    say "$(printf '%s\n' "$badp" | sed 's/^/    /')"
    say "  While that is true a browser gate's verdict CAN depend on these scripts, so this tier's identity is"
    say "  false and fast mode is retired until the read is removed or the path joins the forced set."
    return 1
  fi
  # P2: child_process only in gates/lib.js, and only for its two commands.
  local cpsites
  cpsites="$(
    printf '%s\n' "$P1" | while IFS= read -r f; do
      [ -n "$f" ] || continue
      case "$f" in *.js) ;; *) continue;; esac
      # P2 STRIPS COMMENTS EXACTLY AS P1 DOES [antagonist A, P2]. It used to grep the RAW blob, so ONE WORD OF
      # PROSE turned this tier into a hard REFUSED - the very false positive the commit above was written to
      # remove from P1, left standing one screen below it. Measured: adding the comment
      # `// NOTE: this gate does NOT use execSync; see gates/lib.js.` to any regress gate reads
      # "REFUSED: PREMISE P2 BROKEN", exit 1. Headroom was ZERO (exactly one file matches today) in a repository
      # whose gates carry hundred-line comments about their own tooling.
      if "${GIT[@]}" cat-file blob "$BASESHA:$f" 2>/dev/null | awk '
        BEGIN{ inblock=0 }
        {
          line=$0; out=""; i=1; L=length(line)
          while (i<=L) {
            c=substr(line,i,1); d=substr(line,i+1,1)
            if (inblock) { if (c=="*" && d=="/") { inblock=0; i+=2 } else { i++ } ; continue }
            if (c=="/" && d=="*") { inblock=1; i+=2; continue }
            if (c=="/" && d=="/") { break }
            out = out c; i++
          }
          print out
        }' 2>/dev/null | grep -nE "child_process|execSync|spawnSync|execFile" > /dev/null 2>&1; then
        printf '%s\n' "$f"
      fi
    done
  )"
  local cpn
  cpn="$(printf '%s\n' "$cpsites" | grep -c . || true)"; cpn=$((cpn+0))
  if [ "$cpn" -ne 1 ] || [ "$(printf '%s' "$cpsites" | tr -d '[:space:]')" != "gates/lib.js" ]; then
    say "REFUSED: PREMISE P2 BROKEN - child_process appears in the browser read set outside gates/lib.js:"
    say "$(printf '%s\n' "$cpsites" | sed 's/^/    /')"
    say "  A gate that can start a process can run a push check, and then the read set is not independent of it."
    return 1
  fi
  say "  premise: P1 clean (block comments stripped); P2 clean (child_process only in gates/lib.js)"

  # ── (6) THE HARNESSES AND THE EXISTING CONTROLS MUST BE MAIN'S. ─────────────────────────────────────────────
  # A5. The reviewer's two-commit split: S1 adds one line to a harness (and keeps 71 of 71), S2 then turns a key
  # off under the weakened harness. Both halves die here, because on this tier main's harnesses are the only
  # harnesses. The routing above already sends a harness change to the full suite; this arm is the INDEPENDENT
  # one, by blob id, so a path the routing mis-spells cannot slip a harness past it.
  local hb hh
  for o in gates/fastgate-drive.sh gates/verify-log-selftest.sh gates/held-selftest.sh gates/buildnum-selftest.sh gates/gates.sh gates/records-gate.sh gates/control-audit.js gates/gatemanifest.sh; do
    hb="$("${GIT[@]}" rev-parse --verify "$BASESHA:$o" 2>/dev/null || echo ABSENT)"
    hh="$("${GIT[@]}" rev-parse --verify "$HEADSHA:$o" 2>/dev/null || echo ABSENT)"
    if [ "$hb" != "$hh" ]; then
      say "GO FULL: $o is not byte-identical to the base (base=$hb head=$hh)."
      say "  On this tier main's harnesses and judges are the only ones, so a change to any of them is the full"
      say "  suite's business. A new control goes in a NEW file under gates/cases/."
      return 2
    fi
  done
  # Every gates/cases/ file that EXISTS on the base must be byte-identical at head (a deletion is caught too,
  # because an absent blob is not equal to a present one).
  local cb
  cb="$("${GIT[@]}" ls-tree -r --name-only "$BASESHA" -- gates/cases 2>/dev/null)"
  while IFS= read -r o; do
    [ -n "$o" ] || continue
    hb="$("${GIT[@]}" rev-parse --verify "$BASESHA:$o" 2>/dev/null || echo ABSENT)"
    hh="$("${GIT[@]}" rev-parse --verify "$HEADSHA:$o" 2>/dev/null || echo ABSENT)"
    if [ "$hb" != "$hh" ]; then
      say "GO FULL: the existing control file $o is not byte-identical to the base (base=$hb head=$hh)."
      return 2
    fi
  done <<<"$cb"
  say "  harnesses and existing controls: byte-identical to the base"

  # ── (7) TAKE THE REAL TREE'S SUITE LOCK AND SNAPSHOT THE TREE. ──────────────────────────────────────────────
  # The battery runs real scripts. They must not be able to write into the tree under judgement, move a ref, or
  # plant a hook or a config entry that fires later (A11, and the reviewer's planted post-commit hook, which ran
  # at the NEXT commit). The lock is gates.sh's own mkdir+pid lock, so this tier and a suite cannot overlap.
  LOCK="$ROOT/gates/logs/.suite.lock"
  local SELFLOG="gates/logs/checks-$SHORT-all.log"
  mkdir -p "$ROOT/gates/logs" 2>/dev/null
  if ! mkdir "$LOCK" 2>/dev/null; then
    local holder
    holder="$(cat "$LOCK/pid" 2>/dev/null || echo '')"
    # kill -0 asks about ONE pid. NEVER pgrep -f here: its pattern matches this script's own command line, which
    # is how #407 waited on itself and #416 killed its own shell.
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
      # GO FULL AND NOT RED [fresh antagonist A, duty 2 and F-F]. This was `return 1`, and exit 1 in this file's
      # own interface means "stop. Do not push, do not re-run hoping for a different answer." A gate suite running
      # in the same checkout is TRANSIENT STATE OUTSIDE THE CANDIDATE - the same class this round already routed
      # three times (an archived log gating another bundle, a base predating the tier, a base with no log) - and it
      # is the only false-RED path that fires on the NORMAL operating sequence: build, gate, tier, push. A guard
      # that fires on the normal case is a guard that gets switched off. Nothing about the commit is known to be
      # wrong, so the honest answer is the one that always holds: run the suite. Re-running the tier after the
      # other suite finishes is also now a sane thing to do, which exit 1 told you it was not.
      say "GO FULL: a gate suite or another tier run holds $LOCK (pid $holder), so this run cannot take the lock"
      say "  that makes its measurements attributable to a tree nobody else is writing. That is state outside your"
      say "  commit: run the full suite, or re-run the tier once the other run has finished."
      return 2
    fi
    rm -rf "$LOCK"; mkdir "$LOCK" 2>/dev/null || { say "REFUSED: cannot create $LOCK"; return 1; }
    say "  NOTE: took over a stale lock (pid '${holder:-none}' is not running)"
  fi
  LOCKHELD=1
  printf '%s\n' "$$" > "$LOCK/pid"; date '+%Y-%m-%d %H:%M:%S %Z' > "$LOCK/started"
  printf '%s\n' "checks-tier $SHORT" > "$LOCK/log"
  # THE INODE, NOT ONLY THE PID [fresh antagonist A, F-C]. See the integrity check in step (9).
  # THE INODE **AND** THE CTIME, BECAUSE THE INODE ALONE IS BLIND AND MY OWN CASE A29 MEASURED IT BLIND.
  # The first version of this fix compared `stat -c %i` only. A29 then failed, and the reason is the rule this
  # project states as "a negative control must cross the threshold, not just disturb the mechanism": measured in
  # three lines, `mkdir L; rm -rf L; mkdir L` REUSES the inode on this filesystem - 696865 both times - so the
  # quantity the assertion read had not moved at all even though the directory really had been re-created. The
  # ctime does move (1792762350 -> 1792762351), it is set by the kernel on creation, and `touch` cannot forge it.
  # %z rather than %Z for nanoseconds, so a handback inside the same second is still visible.
  LOCKSIG0="$(stat -c '%i %z' "$LOCK" 2>/dev/null || echo none)"

  snapshot(){
    # THERE IS NO EXCLUSION AT ALL ANY MORE, AND THAT IS THE SECOND ROUND OF ANTAGONIST B's P3 [#535]. The first
    # filter was `grep -v 'gates/logs/'`, a SUBSTRING match that dropped EVERY line mentioning that directory
    # from the whole stream. MEASURED: gates/logs/ is gitignored at gates/.gitignore:6, but
    # `git status --porcelain -uall --ignored` lists each file inside it individually ("!! gates/logs/x"), so a
    # control writing anywhere under gates/logs/ in the real tree was invisible to the comparison while this
    # script and its README both claim "any difference is exit 1" and "the real tree was not touched". A control
    # can reach the real tree because its clone's origin IS the real root.
    # THE SECOND VERSION NAMED THE TWO PATHS - and the comment above it said "BY EXACT PATH" while the code was
    # still `grep -vF -e <path> -e <path>`, which is a SUBSTRING match with two needles instead of one. The
    # fresh pair's B found it in exactly those terms: `gates/logs/checks-<short>-all.logEVIL`, or anything under
    # the lock directory, still vanished from the stream. That is the THIRD time in this one run that this file
    # has shipped the opposite of its own stated intent (the premise arm, the verify-log-selftest pin, this), so
    # the fix is not a third wording: it is to REMOVE the thing that needed a wording.
    # WHY NOTHING NEEDS EXCLUDING, DERIVED FROM THE ORDER OF OPERATIONS RATHER THAN ASSERTED: the lock directory
    # and its pid/started/log files are all created ABOVE, before SNAP0, so they are present and identical in
    # BOTH snapshots and cancel; and $SELFLOG is written at the very END, after SNAP1 is taken and compared, so
    # it is absent from both. An exclusion for a line that cannot differ buys nothing and costs a hole. If some
    # future control does move a line under gates/logs in the real tree, that is a finding and this arm should
    # say so - which is what it now does, by printing the differing lines instead of two opaque hashes.
    { "${GIT[@]}" ls-files -s
      "${GIT[@]}" status --porcelain=v1 -uall --ignored
      "${GIT[@]}" for-each-ref --format='%(refname) %(objectname)'
      "${GIT[@]}" diff --no-ext-diff HEAD
      cat "$ROOT/.git/config" 2>/dev/null
      cat "$ROOT/.git/info/exclude" 2>/dev/null
      ls -1 "$ROOT/.git/hooks" 2>/dev/null
      for h in "$ROOT"/.git/hooks/*; do [ -f "$h" ] && { printf 'HOOK %s\n' "${h##*/}"; cat "$h"; }; done
      ls -1 "$ROOT/.git/info" 2>/dev/null
      git config --global --list 2>/dev/null
    }
  }
  SNAPTXT0="$(snapshot)"
  SNAP0="$(printf '%s\n' "$SNAPTXT0" | sha256sum | cut -c1-64)"
  say "  real-tree snapshot taken under the lock: ${SNAP0:0:16}"

  WORK="$(mktemp -d 2>/dev/null)"
  # EVERY mktemp IS CHECKED, THE DOOR'S OWN INCLUDED [#532, item (8) of this run's brief]: #532's door ran
  # `BN_T="$(mktemp -d)"` with no check, so under an unwritable TMPDIR its scratch paths became files at the
  # filesystem ROOT, where a safety check then refused to remove six of them.
  if [ -z "$WORK" ] || [ ! -d "$WORK" ]; then
    say "REFUSED: mktemp -d produced no usable directory (TMPDIR unwritable?), so no control can be isolated."
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK"
    return 1
  fi

  # ── (8) THE BATTERY. EACH CONTROL IN ITS OWN THROWAWAY CLONE, HEAD CHECKED OUT, origin/main AT THE BASE. ────
  # NEVER A GIT WORKTREE OF THE REAL CHECKOUT: worktrees share refs and .git/info/exclude, and #530's controls
  # moved the real refs/remotes/origin/main that way. A clone has its own refs, so update-ref below cannot reach
  # the tree under judgement.
  local nclone=0
  mkclone(){
    local dest="$1"
    nclone=$((nclone+1))
    git clone --quiet --no-hardlinks --shared "$ROOT" "$dest" >/dev/null 2>&1 || return 1
    git -C "$dest" -c advice.detachedHead=false checkout --quiet "$HEADSHA" >/dev/null 2>&1 || return 1
    git -C "$dest" update-ref refs/remotes/origin/main "$BASESHA" >/dev/null 2>&1 || return 1
    return 0
  }

  # run_ctl <label> <wanted-exit> <must-contain-or-empty> <must-not-contain-or-empty> -- <cmd...>
  local CTLN=0 CTLOK=0
  # `want` IS A COMMA-SEPARATED SET AND NOT A SINGLE NUMBER, AND THAT IS ANTAGONIST B's UPHELD P1 VETO [#535].
  # It was a single number, and gates/verify-log-selftest.sh is TRI-STATE: exit 1 a confirmed case regressed,
  # exit 2 "Confirmed set clean, N hole(s) still open", exit 0 "Confirmed set clean and every hole closed".
  # Exit 0 is its SUCCESS state. Pinning 2 therefore RED-REFUSED the single most important commit this tier
  # exists to fast-gate: the one that closes verify-log.sh's eight documented argument-parser holes. REPRODUCED
  # before it was believed - applying that repair to the parser takes the selftest to "35 pass, 0 fail, 0 hole(s)
  # open, 8 hole(s) closed" at exit 0, and the tier answered "exit 0, wanted 2", CHECKS TIER RED, exit 1. A gate
  # that tells a developer their correct security fix is broken is worse than no gate.
  # AND THE SHARPEST PART IS THAT THIS FILE'S OWN COMMENT SAID TO DO IT RIGHT: it claimed the arm pins "the
  # SENTENCE ... rather than pinning a number that would have to be edited on every repair", and then pinned the
  # number anyway. Prose about intent is not an implementation, which is the second time in one run this file
  # shipped the opposite of what its own comment promised.
  run_ctl(){
    local label="$1" want="$2" need="$3" forbid="$4"; shift 4; [ "${1:-}" = "--" ] && shift
    local d out rc
    CTLN=$((CTLN+1))
    d="$WORK/c$CTLN"
    if ! mkclone "$d"; then
      bad "$label: could not build its isolated clone, so the control did not run"
      say "  RED  $label - no clone"
      return 1
    fi
    # A BOUND AND A CLOSED STDIN [fresh antagonist A, F-E]. This was `out="$(cd "$d" && "$@" 2>&1)"`, with no
    # timeout and no stdin redirect, in the one arm of this script that runs ARBITRARY COMMITTED SCRIPTS - while
    # the fastgate-drive arm, whose author expected it to be slow, got a `timeout`. A reproduces a control whose
    # body is `sleep 40` reaching PASS and CHECKS TIER GREEN 40 seconds later, with the real tree's suite lock
    # held throughout, and a control that reads stdin inherits the judge's and blocks the same way. CLAUDE.md's
    # #419 is that long work in this container dies on an idle turn, which would leave that lock behind.
    # SO THE "about 6 minutes instead of 113" FIGURE WAS UNBOUNDED, which is why A classed it as measured in one
    # configuration only: it is a measurement of today's control set, not a property of the tier.
    # THE NUMBER IS 600s AND IT IS DERIVED, NOT PICKED: A1 measures the WHOLE battery at 365s, so no single
    # control that exists today can exceed that, and 600 therefore cannot redden anything this suite now runs
    # while still being a real bound. CT_CTL_TIMEOUT overrides it for a deliberately slow control.
    out="$(cd "$d" && timeout "$CTLTMO" "$@" 2>&1 </dev/null)"; rc=$?
    if [ "$rc" = 124 ]; then
      bad "$label: did not finish in ${CTLTMO}s"
      say "  RED  $label - did not finish in ${CTLTMO}s (timed out; the suite lock is held for the whole battery)"
      return 1
    fi
    local why="" okrc=0 w
    local IFSSAVE="$IFS"; IFS=','
    for w in $want; do [ "$rc" = "$w" ] && okrc=1; done
    IFS="$IFSSAVE"
    [ "$okrc" = 1 ] || why="exit $rc, wanted one of $want"
    # `need` MAY BE A REGEX, VIA AN `re:` PREFIX, BECAUSE A FIXED-STRING `PASS` IS SATISFIED BY `BYPASSED`
    # [fresh antagonist A, F-G]. The gates/cases contract wanted a line matching `^PASS[[:space:]]`, which a
    # fixed-string match cannot express. Each arm is a SINGLE herestring grep inside an `if` - measured to be
    # exempt from the sigpipe audit - and never two joined by `||`, which is the shape that put the repository's
    # first TIER A site in this build (see the `case` in checks-tier-drive.sh and the job it is filed under).
    if [ -n "$need" ]; then
      case "$need" in
        re:*)
          if ! grep -qE -- "${need#re:}" <<<"$out"; then
            why="${why:+$why; }its output has no line matching /${need#re:}/"
          fi ;;
        *)
          if ! grep -qF -- "$need" <<<"$out"; then
            why="${why:+$why; }its output does not carry '$need'"
          fi ;;
      esac
    fi
    if [ -n "$forbid" ] && grep -qE -- "$forbid" <<<"$out"; then
      why="${why:+$why; }its output carries a forbidden line matching '$forbid'"
    fi
    if [ -n "$why" ]; then
      bad "$label: $why"
      say "  RED  $label - $why"
      # THE FAILING CONTROL'S OUTPUT GOES TO THE TERMINAL TOO, VIA say [antagonist A, P3]. It used to be appended
      # to LOGLINES only, and LOGLINES is not written until the end of the run, so an operator watching a RED saw
      # ONE line of reason and had to go and read gates/logs/checks-*-all.log to find out why. A's pass lost ten
      # minutes to exactly that.
      say "$(printf '%s\n' "$out" | tail -25 | sed 's/^/        /')"
      return 1
    fi
    CTLOK=$((CTLOK+1))
    say "  PASS $label"
    return 0
  }

  say "  battery: running main's own checks against the candidate, each in its own clone"
  run_ctl "gates.sh --selftest"        0 "SELFTEST" "^SELFTEST [0-9]+ pass / [1-9]" -- bash gates/gates.sh --selftest
  run_ctl "buildnum-selftest.sh"       0 "self-test" "[1-9][0-9]* fail"             -- bash gates/buildnum-selftest.sh
  run_ctl "held-selftest.sh"           0 "PASS"      "[1-9][0-9]* FAIL"             -- bash gates/held-selftest.sh
  # verify-log-selftest.sh's OWN CONTRACT IS EXIT 2 WITH A CLEAN CONFIRMED SET, and that is not a failure being
  # excused: its footer says in terms that this exit 2 is the EXPECTED state until the push gate's argument parser
  # is repaired. The arm therefore pins the SENTENCE and refuses more holes than main has, rather than pinning a
  # number that would have to be edited on every repair.
  # 0 OR 2, NEVER 1. Both 0 and 2 mean "no confirmed case regressed"; only exit 1 does, and the forbid regex
  # catches any "N fail" summary beside it. The SENTENCE is still pinned, so a run that stops printing it is
  # still red - that was the right half of the original arm and it is kept.
  run_ctl "verify-log-selftest.sh"  0,2 "Confirmed set clean" "[1-9][0-9]* fail"   -- bash gates/verify-log-selftest.sh

  # THE fastgate-drive CONTRACT, AND THE DENOMINATOR IS DERIVED RATHER THAN TYPED (A15). gates/gates.sh derives
  # the declared case count from the tc() table at :2252-2253, less H12 which is the harness's unfixed mode and
  # has no case body. Counting the WHOLE table reads every honest push RED, which is why H12 comes out. H1b is
  # the ONLY case allowed to skip (it skips where esbuild is absent).
  local DECL dids
  dids="$("${GIT[@]}" cat-file blob "$BASESHA:gates/fastgate-drive.sh" 2>/dev/null \
          | sed -n '/^tc(){/,/^}/p' | grep -oE '(^|[[:space:]])H[0-9]+b?\)' | tr -d ' \t\r)' | grep -vx H12 || true)"
  DECL="$(printf '%s\n' "$dids" | grep -c . || true)"; DECL=$((DECL+0))
  # THE UNIQUENESS GUARD gates.sh HAS, AND THIS TIER DID NOT [antagonist A, P3]. gates.sh computes both the count
  # and the DISTINCT count and reddens on "the committed tc() table repeats a case id". Without it a duplicated id
  # inflates DECL, so `ok+skipped != DECL` reddens an honest harness - and A15c, which exists to show "the same
  # recipe the gate suite uses", derives ITS number with `sort -u`, so it would have stayed green while the tier
  # reddened. The claim that the two use the same recipe was false as written; now they do.
  local DECLU
  DECLU="$(printf '%s\n' "$dids" | sort -u | grep -c . || true)"; DECLU=$((DECLU+0))
  if [ "$DECL" -ne "$DECLU" ]; then
    bad "fastgate-drive.sh: the base's tc() table REPEATS a case id ($DECL rows, $DECLU distinct), so the declared count is inflated"
    say "  RED  fastgate-drive.sh - the base tc() table repeats a case id ($DECL rows, $DECLU distinct)"
  elif [ "$DECL" -eq 0 ]; then
    bad "fastgate-drive.sh: the base's tc() table yields NO case ids, so its declared count cannot be derived"
    say "  RED  fastgate-drive.sh - the base tc() table is unreadable, and a declared 0 would make the test vacuous"
  else
    local d out rc okn skn failn
    CTLN=$((CTLN+1)); d="$WORK/c$CTLN"
    if ! mkclone "$d"; then
      bad "fastgate-drive.sh fixed: could not build its isolated clone"
      say "  RED  fastgate-drive.sh fixed - no clone"
    else
      out="$(cd "$d" && timeout 900 bash gates/fastgate-drive.sh fixed 2>&1)"; rc=$?
      okn="$(grep -cE '^[[:space:]]*H[0-9]+b?[[:space:]]+ok' <<<"$out" || true)"; okn=$((okn+0))
      skn="$(grep -cE 'SKIP' <<<"$out" || true)"; skn=$((skn+0))
      failn="$(grep -cE 'FAIL' <<<"$out" || true)"; failn=$((failn+0))
      local okline
      okline="$(grep -oE '[0-9]+ ok, [0-9]+ FAIL, [0-9]+ skipped' <<<"$out" | tail -1 || true)"
      if [ -n "$okline" ]; then
        okn="$(sed -E 's/^([0-9]+) ok.*/\1/' <<<"$okline")"; okn=$((okn+0))
        failn="$(sed -E 's/.*, ([0-9]+) FAIL.*/\1/' <<<"$okline")"; failn=$((failn+0))
        skn="$(sed -E 's/.*, ([0-9]+) skipped.*/\1/' <<<"$okline")"; skn=$((skn+0))
      fi
      local why=""
      [ "$rc" = 0 ] || why="exit $rc, wanted 0"
      [ "$failn" -gt 0 ] && why="${why:+$why; }$failn FAIL line(s)"
      [ $((okn + skn)) -ne "$DECL" ] && why="${why:+$why; }ok($okn) plus skipped($skn) is $((okn+skn)), not the base's declared $DECL"
      if [ "$skn" -gt 0 ]; then
        local badskip
        badskip="$(grep -E 'SKIP' <<<"$out" | grep -vE '\bH1b\b' || true)"
        [ -n "$badskip" ] && why="${why:+$why; }a case other than H1b skipped"
      fi
      if [ -n "$why" ]; then
        bad "fastgate-drive.sh fixed: $why"
        say "  RED  fastgate-drive.sh fixed - $why (declared $DECL from the base's tc() table less H12)"
        LOGLINES="$LOGLINES$(printf '%s\n' "$out" | tail -25 | sed 's/^/        /')"$'\n'
      else
        CTLOK=$((CTLOK+1))
        say "  PASS fastgate-drive.sh fixed - $okn ok, $failn FAIL, $skn skipped of $DECL declared"
      fi
    fi
  fi

  # THE FORBID REGEX ABOVE IS `([1-9][0-9]*|^)[[:space:]]*FAIL` AND NOT A BARE `FAIL` [antagonist A, P3]. The bare
  # form reddened a control whose footer reads "1 PASS  0 FAIL" - which is exactly the shape gates/cases/README.md
  # tells an author to write ("as the other self tests here do", and every self test here prints that footer). So
  # following the documentation produced a RED. A zero-count footer is now fine and a non-zero one is not.
  #
  # A9. THE HEAD'S verify-log.sh MUST STILL ACCEPT MAIN'S NEWEST GREEN FULL LOG, and main's own copy must accept
  # it too - so a head that breaks the push gate's acceptance is caught here and not at somebody's push. The log
  # is chosen from the BASE's tree, newest first, so the choice cannot be steered by the candidate.
  # `awk '{print $NF}'` AND NOT `$3`, AND MY OWN HARNESS CAUGHT THIS BEFORE ANY REVIEWER DID. The sort key is
  # built as "<number> <letter> <path>", and for a log with NO letter suffix - which is every log in this
  # repository bar a handful - the middle field is EMPTY, so awk's whitespace splitting collapses it and $3 is
  # the empty string. The arm then reported "the base carries no archived green log" and reddened EVERY tree,
  # including three mutants that were reading that red as their own arm firing. One bug, four false verdicts,
  # and the tell was a case that should have been green going red for a reason unrelated to what it tested.
  local GLOG
  GLOG="$("${GIT[@]}" ls-tree -r --name-only "$BASESHA" -- claude/agents/gatelogs 2>/dev/null \
          | grep -E '/[0-9]+[a-z]?-all\.log$' | sed -E 's|.*/([0-9]+)([a-z]?)-all\.log|\1 \2 &|' | sort -k1,1n -k2,2 | tail -1 | awk '{print $NF}')"
  if [ -z "$GLOG" ]; then
    # GO FULL AND NOT RED [fresh antagonist B, P3]. This was `bad` plus a RED line, so a branch cut before any
    # log was archived - an honest tree, with nothing wrong in the commit - got exit 1, the one verdict that
    # means "do not re-run hoping for a different answer". Whether the BASE happens to carry an archived log is
    # state outside the candidate, which is the same reason the bundle-mismatch branch below routes rather than
    # refuses. a30fc59 carries 131 of them so this is not reachable today; it is reachable on a fresh line.
    say "GO FULL: the base ${BASESHA:0:12} carries no claude/agents/gatelogs/<N>-all.log, so the acceptance arm"
    say "  has nothing to accept. That is state outside your commit: the full suite decides."
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
    rm -rf "$WORK" 2>/dev/null
    return 2
  else
    local GN
    GN="$(sed -E 's|.*/([0-9]+)[a-z]?-all\.log|\1|' <<<"$GLOG")"
    say "  acceptance log: $GLOG (build #$GN), chosen from the BASE's tree so the candidate cannot steer it"
    # THE BUNDLE THE ARCHIVED LOG GATED MUST BE THE BUNDLE ON DISK, OR THIS ARM IS GO FULL AND NOT RED
    # [antagonist A, P2]. `--this-bundle` compares the log's gated md5 against app.js on disk. They agree today
    # (049b41dfb6f1 for #530 to #534), but the moment main's newest archived log gates a different bundle - which
    # #454 measured happening on four of eight build numbers, and which any mid-pass rebuild produces - EVERY
    # tier-only commit read CHECKS TIER RED, exit 1, for a reason with nothing to do with the candidate. RED is
    # the one verdict that says "do not re-run hoping for a different answer". This is state OUTSIDE the commit,
    # so the honest answer is the full suite.
    # THE md5 COMES OFF THE LOG'S OWN `ref:` LINE AND NOWHERE ELSE, AND MY OWN HARNESS CASE A1 CAUGHT THE
    # ALTERNATIVE BEFORE EITHER REVIEWER DID - then the fresh pair's B reproduced it independently, from the
    # shipped surface, before it had read my note. The first version greped the WHOLE log for
    # `bundle md5 <12 hex>` and then did `sort -u | tr -d '\n'`. MEASURED on the base's newest log, 534-all.log:
    # that phrase occurs FOUR times and only ONE is the log's own ref line (049b41dfb6f1, line 6479) - the other
    # three are PROSE inside a gate's assertion text at line 3208, where gate 66 names the two negative-control
    # bundles it was proved against and the healthy one. `sort -u | tr -d '\n'` then CONCATENATED all four into
    # the 48-character string 049b41dfb6f15388547cb472890f7a9b7b67bd8f31ddbc47, which is no md5 at all, and the
    # comparison declared a mismatch against its own first twelve characters. So the arm returned GO FULL on
    # EVERY candidate and THE TIER COULD NEVER EMIT `CHECKS TIER GREEN` AGAINST TODAY'S BASE - the whole
    # economic claim of the job, dead, after paying the full battery first. NOT A ONE-OFF, measured across all
    # 131 archived logs: every log from #506 to #534 - twenty-three consecutive - names four distinct md5
    # tokens, so this had been true for twenty-nine builds' worth of logs, not just the newest.
    # TWO CAUSES IN ONE LINE, and this project has a rule against each: a multi-valued extraction collapsed to a
    # scalar (the same shape as this run's own `awk '{print $3}'` collapse ten lines above), and an UNSCOPED
    # SELECTOR - "a bad selector is a reading, not a measurement" - reading a whole log for a phrase that
    # ordinary gate prose in this repository is free to contain, and does.
    # SCOPE, MEASURED NOT ASSUMED: of the 131 archived -all.log files, 85 carry exactly ONE `^ref: ` line and it
    # carries exactly one `bundle md5`, and 46 carry NONE - all 46 predate the ref line's introduction (#373 to
    # #426 era). Since the arm takes the NEWEST log, the modern format is what it will read; the zero case and
    # the more-than-one case are handled anyway, as GO FULL, because "the structured line is not there or does
    # not agree with itself" is state outside the candidate exactly as a differing bundle is.
    local LOGMD5 DISKMD5 NMD5
    LOGMD5="$({ "${GIT[@]}" cat-file blob "$BASESHA:$GLOG" 2>/dev/null | grep '^ref: ' || true; } \
              | grep -oE 'bundle md5 [0-9a-f]{12}' | awk '{print $3}' | sort -u)"
    NMD5="$(printf '%s' "$LOGMD5" | grep -c '^[0-9a-f]\{12\}$' || true)"
    DISKMD5="$("${GIT[@]}" cat-file blob "$HEADSHA:app.js" 2>/dev/null | md5sum | cut -c1-12)"
    if [ "$NMD5" != 1 ]; then
      say "GO FULL: the base's newest archived log $GLOG names $NMD5 bundle md5(s) on a \`ref:\` line, not one."
      say "  With no single structured value the arm cannot compare anything, and guessing which of several to"
      say "  believe is how the first version of this check went wrong. State outside your commit: run the suite."
      [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
      rm -rf "$WORK" 2>/dev/null
      return 2
    fi
    if [ "$LOGMD5" != "$DISKMD5" ]; then
      say "GO FULL: the base's newest archived log $GLOG gated bundle $LOGMD5 and this tree's app.js is $DISKMD5."
      say "  The acceptance arm compares the two with --this-bundle, so it cannot speak about this candidate while"
      say "  they differ. That is state outside your commit, not a fault in it: the full suite decides."
      [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
      rm -rf "$WORK" 2>/dev/null
      return 2
    fi
    run_ctl "verify-log.sh (head) accepts #$GN" 0 "OK" "REFUS" -- bash gates/verify-log.sh "$GLOG" "#$GN" --this-bundle
  fi

  # EVERY gates/cases/ CONTROL IS RUN - THE UNION OF THE BASE'S AND THIS COMMIT'S NEW ONES - AND THAT UNION IS
  # ANTAGONIST A's UPHELD P1 VETO [#535]. This loop read $NEWFILES ONLY, so a control added through this tier was
  # executed exactly ONCE, in the commit that added it, and never judged anything again; the base's controls were
  # byte-COMPARED and never RUN, while the log said "harnesses and existing controls: byte-identical to the base"
  # and gates/cases/README.md published the opposite as the directory's whole purpose and as the answer to the
  # reviewer's two-commit split. REPRODUCED before it was believed: a base carrying a control that prints FAIL and
  # exits 1, with a candidate changing only gates/held.sh, read exit 0, CHECKS TIER GREEN, "new control file(s)
  # run: 0" - the tier reaching GREEN on a tree the project's own control set refuses. A control set that does not
  # accumulate is a label, and the whole economic case for this directory is that controls are milliseconds each
  # and they pile up.
  local nc=0 nbase=0
  local ALLCASES
  ALLCASES="$(printf '%s\n%s\n' "$cb" "$NEWFILES" | grep -E '\.sh$' | sort -u || true)"
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    nc=$((nc+1))
    local isbase=0
    while IFS= read -r q; do [ "$q" = "$p" ] && isbase=1; done <<<"$cb"
    [ "$isbase" = 1 ] && nbase=$((nbase+1))
    # THE CONTRACT IS `^PASS<space>` AND A NARROWER FAIL FORBID, AND BOTH HALVES WERE DEFEATED [fresh
    # antagonist A, F-G, three poses each reaching exit 0 CHECKS TIER GREEN PASS]. (1) `need` was the FIXED
    # STRING "PASS", so `all checks BYPASSED; nothing asserted` satisfied it - the word PASS inside BYPASSED -
    # and so did a control whose entire output is `0 PASS  0 FAIL`, which is the empty denominator credited as a
    # control, in the directory whose whole purpose is accumulating controls. That is CLAUDE.md's eleventh
    # costume reappearing inside the fix for it. (2) The forbid was `([1-9][0-9]*|^)[[:space:]]*FAIL`, so a FAIL
    # that is neither line-initial nor digit-prefixed escaped: `Result: FAIL - the key is off` was permitted.
    # The previous round narrowed the forbid from a bare `FAIL` for a good reason - a bare `FAIL` reddened the
    # `N PASS  0 FAIL` footer the README tells authors to write - and the narrowing opened this. So the new
    # pattern forbids FAIL preceded by anything that is not a digit, AND any non-zero count, while still
    # allowing a `0 FAIL` footer: `(^|[^0-9[:space:]])[[:space:]]*FAIL` catches `Result: FAIL` and a bare
    # leading FAIL, `[1-9][0-9]*[[:space:]]*FAIL` catches `3 FAIL`, and neither can match inside `0 FAIL`.
    run_ctl "control $p" 0 "re:^PASS([[:space:]]|$)" "(^|[^0-9[:space:]])[[:space:]]*FAIL|[1-9][0-9]*[[:space:]]*FAIL" -- bash "$p"
  done <<<"$ALLCASES"
  say "  gates/cases control(s) run: $nc ($nbase already on the base, $((nc-nbase)) new in this commit)"

  # ── (9) THE REAL TREE MUST BE EXACTLY AS IT WAS. ────────────────────────────────────────────────────────────
  # A11, and it is checked BEFORE the log is written, so the log itself cannot be the difference.
  # THE LOCK ITSELF IS CHECKED SEPARATELY, BECAUSE THE SNAPSHOT EXCLUDES ITS PATH [antagonist A, F8 residual].
  # The exclusion is necessary - this run creates the lock, so it would always differ - but it left a hole A
  # measured: a control that runs `rm -rf "$OLDPWD/gates/logs/.suite.lock"` reached CHECKS TIER GREEN with the
  # lock gone, so a control could release the only guard against two suites overlapping (#419) mid-battery and
  # nothing would say so. An exclusion is not a licence, so what the snapshot cannot see is asserted directly.
  # AND THE INODE, BECAUSE THE PID CHECK IS AN END-STATE TEST AND A CONTROL CAN HAND THE LOCK BACK [fresh
  # antagonist A, F-C, reproduced in three lines]: read the pid out of the file this check reads, `rm -rf` the
  # lock, prove a second process can `mkdir` it, then write the pid back. The end state is then identical and
  # the tier reached CHECKS TIER GREEN while the #419 guarantee had been broken mid-battery. `mkdir` after
  # `rm -rf` cannot reproduce the inode AND ctime pair, so comparing them turns "the lock looks the same now"
  # was never let go". It is the difference between a property of the END and a property of the INTERVAL, which
  # is the same distinction as #398's "nothing painted past the edge" versus "nothing was squeezed".
  local LOCKPID LOCKSIG1
  LOCKPID="$(cat "$LOCK/pid" 2>/dev/null || echo gone)"
  LOCKSIG1="$(stat -c '%i %z' "$LOCK" 2>/dev/null || echo none)"
  if [ ! -d "$LOCK" ] || [ "$LOCKPID" != "$$" ] || [ "$LOCKSIG1" != "$LOCKSIG0" ]; then
    say "REFUSED: the suite lock was removed, taken over or re-created while the battery ran."
    say "  pid now '$LOCKPID' (mine is $$); lock inode+ctime was '$LOCKSIG0' and is now '$LOCKSIG1'."
    say "  A control released the one guard against two suites overlapping, so nothing this run measured can be"
    say "  attributed to a tree nobody else was writing. A changed inode means the directory was re-created, so"
    say "  the lock was handed back rather than held - the end state matching is not the same as holding it."
    RC=1
  fi
  # A CONTROL CAN PLANT A SYMLINK AT THIS RUN'S OWN LOG PATH, AND THE JUDGE WROTE THROUGH IT [fresh antagonist
  # A, F-B, P1 VETO - and it is the sharpest finding of the three adversarial rounds this file has had]. The
  # route, reproduced end to end by A: a new control under gates/cases/ reads `git config --get remote.origin.url`
  # - which IS the real repository root, because its clone's origin is the tree under judgement - computes
  # `gates/logs/checks-$(git rev-parse --short HEAD)-all.log` (the same path this run will write, derivable
  # because the clone is checked out at the same commit), removes it and symlinks it at `$ROOT/app.js`. The
  # control exits 0 with a PASS line and asserts nothing. The judge then printed CHECKS TIER GREEN, including the
  # sentence "and that the real tree was not touched", and its FINAL ACT - the log write, after SNAP1, after the
  # verdict, unconditional - followed the symlink and REPLACED THE SHIPPED BUNDLE WITH THIS RUN'S LOG TEXT.
  # Measured: app.js md5 28c88aa1... before, 13d1719a... after, `git status` reading `M app.js`, head -1 of the
  # bundle reading "checks-tier.sh base=... head=...". Point it at gates/verify-log.sh and the push gate is the
  # casualty; at .git/config and the repository is.
  # TWO LAYERS, DELIBERATELY, BECAUSE EITHER ALONE WOULD HAVE BEEN ENOUGH AND NEITHER WAS THERE. (1) The snapshot
  # no longer excludes anything, so the planted link appears in SNAP1 and not SNAP0 and the verdict is REFUSED.
  # (2) The write itself refuses to follow a symlink, so the DAMAGE does not happen even when the verdict is
  # already decided - a REFUSED verdict over a clobbered bundle would still have cost somebody their tree.
  # AND NOTE WHOSE FIX THIS IS: the previous round's repair wrote, in terms, "An exclusion is not a licence, so
  # what the snapshot cannot see is asserted directly" - and then asserted the LOCK and left the LOG, which is
  # the one of the two excluded paths the judge itself writes through. The sentence was right and was applied to
  # one half of its own subject. Twelfth costume of the trap: the check and the thing being checked were the same
  # object - here the excluded path and the written path.
  if [ -L "$ROOT/gates/logs" ] || [ -L "$ROOT/$SELFLOG" ]; then
    say "REFUSED: $SELFLOG is a symlink, or sits under one, so this run's own log write would follow it into"
    say "  whatever it points at. A control under gates/cases/ can compute this path and plant the link, which is"
    say "  how a control with no assertions in it reached CHECKS TIER GREEN over a replaced app.js."
    SELFLOGBAD=1
    RC=1
  fi
  SNAPTXT1="$(snapshot)"
  SNAP1="$(printf '%s\n' "$SNAPTXT1" | sha256sum | cut -c1-64)"
  if [ "$SNAP0" != "$SNAP1" ]; then
    say "REFUSED: the real tree CHANGED while the battery ran (snapshot ${SNAP0:0:16} -> ${SNAP1:0:16})."
    say "  Something a control ran wrote into the tree under judgement, moved a ref, or planted a hook or a"
    say "  config entry. A verdict about a tree that moved under the judge is worth nothing, and a planted hook"
    say "  fires at the NEXT commit, where nothing would connect it to this run."
    # NAME THE LINES. Two hashes tell the next reader that something moved and nothing about what, which costs a
    # whole re-run to find out - and the re-run may not reproduce it. At most 20 lines, so a pathological diff
    # cannot bury the verdict.
    local dl
    while IFS= read -r dl; do say "    $dl"; done < <(diff <(printf '%s\n' "$SNAPTXT0") <(printf '%s\n' "$SNAPTXT1") 2>/dev/null | head -20)
    RC=1
  fi

  # ── (10) THE VERDICT, WRITTEN ONCE. ─────────────────────────────────────────────────────────────────────────
  if [ "${#FIND[@]}" -gt 0 ]; then
    say ""
    say "CHECKS TIER RED: ${#FIND[@]} of $CTLN control(s) did not meet their contract."
    local i
    for i in "${FIND[@]}"; do say "  - $i"; done
    RC=1
  elif [ "$RC" = 0 ]; then
    say ""
    say "  controls: $CTLN run, $CTLOK met their contract, 0 red; $nclone isolated clone(s) built"
    say "CHECKS TIER GREEN $HEADSHA"
    say "  WHAT THIS DOES AND DOES NOT SAY. It is NOT 'GATES GREEN' and must never be cited as one:"
    say "  gates/verify-log.sh will refuse this log as a bundle push gate, correctly, because it is not one."
    say "  It says the served tree and the browser read set are byte-identical to ${BASESHA:0:12}, that main's"
    say "  own copy of every push check was run against this candidate and met its contract, and that the real"
    say "  tree was not touched. It says nothing whatever about the app."
    RC=0
  fi

  # WRITTEN AFTER SNAP1 IS TAKEN AND COMPARED, which is why the snapshot needs no exclusion for it.
  local OUT="$ROOT/$SELFLOG"
  # RE-CHECKED AT THE MOMENT OF WRITING, not only in step (9). The battery is over and the lock is held, so the
  # window is small - but this is the line that did the damage in F-B, and a guard placed anywhere other than
  # immediately above the write is a guard with a window.
  if [ "$SELFLOGBAD" = 1 ] || [ -L "$OUT" ] || [ -L "$ROOT/gates/logs" ]; then
    printf '%s\n' "  log NOT written: $SELFLOG is a symlink or sits under one. Following it would write this run's"
    printf '%s\n' "  log text into whatever it points at, which is how F-B replaced app.js. The verdict above stands."
  else
    printf '%s' "$LOGLINES" > "$OUT" 2>/dev/null && printf '%s\n' "  log: $OUT"
  fi
  rm -rf "$WORK" 2>/dev/null
  [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
  return $RC
}

main "$@"; exit $?
