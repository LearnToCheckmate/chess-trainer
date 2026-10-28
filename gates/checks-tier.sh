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
  local WORK="" PRIV="" MIRROR="" SNAP0="" SNAP1="" SNAPTXT0="" SNAPTXT1="" LOCK="" LOCKHELD=0 LOCKSIG0="" SELFLOGBAD=0
  local CTLMARK="" CTL_OUT=""
  local SNAPRC=0
  local CTLTMO="${CT_CTL_TIMEOUT:-600}"
  local OUT=""

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

  # ── (0) THE BASE MUST BE THIS REPOSITORY'S OWN origin/main [fresh antagonist B, F3, round 4]. ────────────
  # The base arrives as an ARGUMENT and nothing compared it to anything. B reproduced the consequence: a branch
  # two commits past origin/main, where commit 1 changes gates/held.sh and commit 2 changes a BROWSER GATE.
  # Run with base=origin/main the tier correctly answers GO FULL and names gates/regress/01-x.js. Run with
  # base=HEAD~1 it answers CHECKS TIER GREEN - and the push then carries a changed browser gate the tier never
  # looked at, because every arm of this script compares HEAD against the base it was HANDED. The whole design
  # rests on "judged by main's own copy against main", and half of that was unchecked.
  # IT IS NOT A HYPOTHETICAL INVOCATION: this project's own rule is to fetch and rebase before a push, so a
  # mid-branch sha is exactly what an operator has in hand after one.
  # GO FULL AND NOT RED, because which sha was passed is the operator's state and not a fault in the commit.
  local ORIGINMAIN
  ORIGINMAIN="$("${GIT[@]}" rev-parse --verify refs/remotes/origin/main 2>/dev/null)" || ORIGINMAIN=""
  if [ -z "$ORIGINMAIN" ]; then
    say "GO FULL: $ROOT has no refs/remotes/origin/main, so there is nothing to check the base against and this"
    say "  tier cannot establish that it is judging a candidate against MAIN. Fetch, then re-run, or run the suite."
    return 2
  fi
  if [ "$ORIGINMAIN" != "$BASESHA" ]; then
    say "GO FULL: the base you passed is ${BASESHA:0:12} and refs/remotes/origin/main is ${ORIGINMAIN:0:12}."
    say "  Every arm below compares HEAD against the BASE, so a base that is not main lets commits between main"
    say "  and that base through unjudged - B reproduced a changed browser gate taking a GREEN that way. Pass"
    say "  origin/main as the base, or run the full suite."
    return 2
  fi

  # ── (1) THE SELF PIN. THE RUNNING BYTES MUST BE MAIN'S BYTES. ────────────────────────────────────────────────
  # A6. The judge is only main's judge if it IS main's copy. Both blob ids are printed, so a reader can see which
  # two objects were compared rather than trusting a yes. `git hash-object` is the same function git uses to make
  # the blob, so this is an identity and not a heuristic.
  # ROUND 4, D6: THE PATH IS MADE ABSOLUTE FIRST, AND AN EMPTY PIN REFUSES WITH A REASON [fifth round, P3(4)].
  # `"${GIT[@]}"` carries -C "$ROOT", so git resolves a RELATIVE path against the repository root and not
  # against the cwd this judge was invoked from - and the documented invocation is `bash "$T/checks-tier.sh"`,
  # an absolute path, which is why nobody hit it sooner. Invoked as `bash ./ct.sh` from anywhere else, MINE came
  # back EMPTY and the verdict printed `self pin: running=none  base=<blob>` and then asserted the bytes
  # DIFFERED - an empty variable in a blob-id slot, reported as a mismatch. An unhashable judge is not a
  # changed judge, and the two must not produce the same verdict.
  local MINE THEIRS SELF="${BASH_SOURCE[0]}"
  case "$SELF" in
    /*) ;;
    *)  SELF="$(cd -- "$(dirname -- "$SELF")" 2>/dev/null && pwd)/$(basename -- "$SELF")" ;;
  esac
  MINE="$("${GIT[@]}" hash-object -t blob -- "$SELF" 2>/dev/null)" || MINE=""
  if [ -z "$MINE" ]; then
    say "REFUSED: this judge cannot hash its own running bytes at '$SELF', so the self pin below would compare"
    say "  an EMPTY value against the base's blob and report a mismatch. An unhashable judge is not a changed"
    say "  judge. Run it from an absolute path, as its header prescribes:"
    say "  T=\"\$(mktemp -d)\"; git show origin/main:gates/checks-tier.sh > \"\$T/checks-tier.sh\""
    return 1
  fi
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
  # ROUND 4, D5: SPLIT EXACTLY AS THE SNAPSHOT ARM IS SPLIT, AND FOR THE SAME REASON [fifth round, P2(3), "the
  # TENTH FALSE HARD-REFUSE AND IT FIRES TODAY"]. An UNTRACKED path at entry answered exit 1 - "do not re-run
  # hoping for a different answer" - and CLAUDE.md's pen rule expressly authorises every other chat in this
  # project to read, measure, test and WRITE DOCS AND FLAGS in this repository. So another session's note made
  # an honest candidate unpushable, on a tree whose committed content is perfectly fine. A MODIFIED TRACKED
  # FILE, a STAGED change or anything under .git still refuses, because then the verdicts below really would be
  # about a commit nobody is looking at - which is #533's "a closing claim is no wider than its controls" one
  # step earlier.
  # NOTE WHAT THE BATTERY DOES WITH AN UNTRACKED PATH: nothing. Every control and every harness runs in a clone
  # checked out at HEAD, so the working tree is never read by any of them - which is the other half of why a
  # hard refusal here was the wrong verdict.
  local DIRTY DIRTYTRACKED
  DIRTY="$("${GIT[@]}" status --porcelain 2>/dev/null)"
  if [ -n "$DIRTY" ]; then
    DIRTYTRACKED="$(printf '%s\n' "$DIRTY" | grep -vE '^\?\? ' || true)"
    if [ -n "$(printf '%s' "$DIRTYTRACKED" | tr -d '[:space:]')" ]; then
      say "REFUSED: the working tree carries a TRACKED modification or a staged change, and every check below"
      say "  is about the COMMITTED candidate."
      say "$(printf '%s\n' "$DIRTYTRACKED" | sed 's/^/    /')"
      return 1
    fi
    say "GO FULL: the working tree carries untracked path(s) and nothing else. This judge will not call your"
    say "  commit broken on them - CLAUDE.md lets every other chat write docs and flags in this repository - but"
    say "  it cannot attribute its measurements to a tree it has not seen whole either, so the suite decides."
    say "$(printf '%s\n' "$DIRTY" | sed 's/^/    /')"
    return 2
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
  local tierpaths=0 scriptpaths=0 newsh=0 p isnew
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      gates/fastgate.sh|gates/verify-log.sh|gates/held.sh|gates/buildnum.sh)
        tierpaths=$((tierpaths+1)); scriptpaths=$((scriptpaths+1)) ;;
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
          case "$p" in *.sh) newsh=$((newsh+1)) ;; esac
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
  # ROUND 4, D6: A COMMIT WHOSE ONLY TIER PATHS ARE gates/cases/*.md EARNS NOTHING HERE [fifth round, P3(5)].
  # The routing accepts a new .md because the directory's convention file is one, and the battery below runs
  # every gates/cases/*.sh and READS no .md at all - so such a commit reached CHECKS TIER GREEN having had
  # nothing whatever executed on its behalf, while gates/cases/README.md told its author that "a new file here
  # is run by the tier". A green that means "nothing was checked" is the one verdict this tier must never give.
  if [ "$scriptpaths" = 0 ] && [ "$newsh" = 0 ]; then
    say "GO FULL: the only paths this tier recognises in this commit are new gates/cases/*.md file(s). This tier"
    say "  RUNS every gates/cases/*.sh and reads .md as documentation, so there is nothing here for it to"
    say "  execute and a green would certify an empty check. The full suite decides a documentation-only commit."
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
            if (c=="/" && d=="/") { if (i>1 && substr(line,i-1,1)==":") { out = out c; i++; continue } break }
            out = out c; i++
          }
          if (out ~ /(checks-tier|checks-tier-drive|fastgate|verify-log|held|buildnum)\.sh/) {
            sub(/^[ \t]+/, "", out)
            printf "%d: %s\n", NR, substr(out,1,120)
          }
        }' 2>/dev/null | sed "s|^|$f:|"
    done
  )"
  # ── ROUND 4, D6: THE STRIPPER'S STATE MUST CLOSE AT THE END OF EVERY FILE IT READS. ────────────────────────
  # This is the CHEAP HALF of knownLimit 4a14dac044acc63f, and the expensive half - a real string-aware scan or
  # a JS tokeniser - stays a known limit. The limit is stated in the arm above: a `/*` inside a STRING literal
  # sets `inblock` for the rest of the FILE, and over-stripping produces a false GREEN, because a line in the
  # base can hide the very read this arm exists to find. Measured there: a gate whose base carries
  # `const marker = '/*';` and then a real `readFileSync('../verify-log.sh')` reads "premise: P1 clean".
  # WHAT THIS ARM BUYS, and it is worth having even though it is not the tokeniser: a file whose comment state
  # is still OPEN at EOF is a file the stripper has misread, whatever the reason - an unterminated comment, a
  # `/*` in a string, a regex literal - and in that state its reading of the file is not evidence. So it is
  # reported and routed rather than silently trusted. An honest tree has every comment closed: measured on the
  # base, 0 of the browser read set's .js files are unbalanced.
  # AND THE `://` CASE IS WHY THIS IS NOT A SUFFICIENT GUARD ON ITS OWN: `https://example` used to set the
  # comment state for the rest of a line, so a URL in a line of code could hide a read that followed it on the
  # same line. That one is FIXED above rather than reported, because it needs no state to get right.
  local unbal
  unbal="$(
    printf '%s\n' "$P1" | while IFS= read -r f; do
      [ -n "$f" ] || continue
      case "$f" in *.js) ;; *) continue;; esac
      "${GIT[@]}" cat-file blob "$BASESHA:$f" 2>/dev/null | awk '
        BEGIN{ inblock=0 }
        {
          line=$0; i=1; L=length(line)
          while (i<=L) {
            c=substr(line,i,1); d=substr(line,i+1,1)
            if (inblock) { if (c=="*" && d=="/") { inblock=0; i+=2 } else { i++ } ; continue }
            if (c=="/" && d=="*") { inblock=1; i+=2; continue }
            if (c=="/" && d=="/") { if (i>1 && substr(line,i-1,1)==":") { i++; continue } break }
            i++
          }
        }
        END{ if (inblock) print "its block-comment state is still OPEN at end of file" }' 2>/dev/null \
        | sed "s|^|$f: |"
    done
  )"
  if [ -n "$(printf '%s' "$unbal" | tr -d '[:space:]')" ]; then
    say "GO FULL: the premise stripper's own state does not close on the base, so its reading of these file(s)"
    say "  is not evidence either way:"
    say "$(printf '%s\n' "$unbal" | sed 's/^/    /')"
    say "  A file whose comment state is still open at EOF has been misread from that point on, and an"
    say "  over-stripped file produces a FALSE CLEAN rather than a harmless refusal. That is the base's state"
    say "  and not your commit's, so the full suite decides."
    snapcheck
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    return 2
  fi

  if [ -n "$badp" ]; then
    # GO FULL AND NOT RED [fresh antagonist B, F5, round 4]. This arm reads the BASE and nothing else, so it is
    # state entirely outside the commit being judged, and the person refused cannot act on it except by running
    # the full suite - which is what exit 2 says. Exit 1 means "do not re-run hoping for a different answer" and
    # would make the FIRST honest, suite-approved change to the browser read set turn this tier into a permanent
    # hard refuse for every later tier-only commit. Same class as the four refusals round 3 already repaired.
    say "GO FULL: PREMISE P1 BROKEN on the base - the browser read set reads a push check path on a NON-COMMENT line:"
    say "$(printf '%s\n' "$badp" | sed 's/^/    /')"
    say "  A browser gate's verdict CAN therefore depend on these scripts, so this tier's identity is false until"
    say "  the read is removed or the path joins the forced set. That is the BASE's state, not your commit's:"
    say "  nothing is known to be wrong with this candidate, so the honest answer is the full suite."
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    return 2
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
            if (c=="/" && d=="/") { if (i>1 && substr(line,i-1,1)==":") { out = out c; i++; continue } break }
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
    # TWO FIXES HERE [fresh antagonist B, F5 and F6, round 4]. (1) GO FULL and not RED, for the same reason as
    # P1 above: this reads the BASE alone. (2) THE VERDICT USED TO CONTRADICT ITSELF IN ONE SENTENCE - it said
    # "outside gates/lib.js:" and then printed the whole match list, gates/lib.js INCLUDED, because `cpsites` is
    # every matching file and not the offenders. B reproduced it with a base that adds child_process to
    # gates/drive/play.js: the refusal listed play.js AND lib.js under a heading saying "outside lib.js". A
    # reader then cannot tell which file is the finding. The list is now the offenders only, and the expected
    # file is named separately so the reader can see the arm's own premise.
    local cpbad
    cpbad="$(printf '%s\n' "$cpsites" | grep -v '^gates/lib\.js$' || true)"
    say "GO FULL: PREMISE P2 BROKEN on the base - child_process appears in the browser read set outside gates/lib.js."
    if [ -n "$(printf '%s' "$cpbad" | tr -d '[:space:]')" ]; then
      say "  the offending file(s):"
      say "$(printf '%s\n' "$cpbad" | sed 's/^/    /')"
    else
      say "  gates/lib.js itself does NOT match, which is the other way this arm can break: the expected site is"
      say "  gone, so the premise is no longer established by anything. matched: $cpn file(s)."
    fi
    say "  A gate that can start a process can run a push check, and then the read set is not independent of it."
    say "  That is the BASE's state and not your commit's, so the honest answer is the full suite."
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    return 2
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
  # ── ANTAGONIST B's P1-c IS REAL, AND PINNING THE PARENT IS NOT ITS FIX. RECORDED HERE RATHER THAN GUARDED.
  # B defeated this pin in five lines by renaming the lock's PARENT instead of the lock: `mv gates/logs
  # gates/.logs-hold`, `mkdir -p gates/logs`, `mkdir gates/logs/.suite.lock` - which SUCCEEDS, proving a second
  # suite could have started - then remove it and `mv` the original back. MEASURED: a parent rename leaves the
  # child's inode AND ctime unchanged, while renaming the lock itself DOES move its ctime, which is why this
  # test catches the direct handback and not that one.
  # I TRIED PINNING THE PARENT AND WITHDREW IT, BECAUSE IT FIRES ON THE NORMAL CASE [R18]. A directory's ctime
  # moves whenever an entry is created in it, so pinning `gates/logs` made ANY write under that directory - by
  # a control, by another session, by anything - a lock-integrity REFUSAL. My own cases measured it within
  # minutes: A45 (an empty directory at the old temporary name) and M13 both turned into "the suite lock was
  # removed, taken over or re-created", a verdict about a lock nobody touched. A guard that fires on the normal
  # case is a guard that gets switched off, which is this file's own reason for routing a live lock rather than
  # refusing it.
  # AND THE PARENT'S INODE WOULD NOT HAVE WORKED EITHER: the attack RESTORES the original directory, so its
  # inode at the end is the one from the start. What B's finding actually needs is an INTERVAL proof - the lock
  # held open for the whole battery, agreed by inode rather than by path - and that is a change to the lock
  # protocol gates.sh owns, which this run's brief forbids touching. So it is a named known limit on the job,
  # with its reproduction, and not a wording in this file.
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
    # ROUND 4, D4: EVERY LINE CARRIES A TYPE PREFIX THIS FUNCTION ITSELF WRITES, AND THE CLASSIFIER KEYS ON
    # THAT PREFIX AND NEVER ON A REGEX OVER GIT'S OUTPUT SHAPES. The round-3 classifier inferred the class from
    # the shape of each differing line - `^[0-7]{6} [0-9a-f]{40} [0-9]`, `refs/`, `\t[a-z]+ =` and so on - and it
    # MISSED gates/logs/.checks- BY ONE CHARACTER, which is how the fifth round's P1(a) landed on the routable
    # side of the split. A prefix the producer writes cannot be mis-inferred by the consumer.
    # AND IT RECORDS CONTENT, NOT NAMES, WHICH IS THE FIFTH ROUND'S P1(c). `git status --porcelain -uall
    # --ignored` prints `!! <path>` and nothing hashed the bytes, so a control could rewrite ANY ignored file -
    # claude/agents/gatelogs/*.log and gates/logs/* among them, which is where this project keeps its gate-log
    # evidence - and the run printed EXIT 0, CHECKS TIER GREEN and "the real tree was not touched". The README's
    # "NOTHING IS EXCLUDED FROM IT" was true of the SET and false of the BYTES.
    local f h d rec
    # TRACKED IS THE INDEX'S RECORDED OIDS, SO THE WORKTREE'S BYTES ARE HASHED SEPARATELY - AND ANTAGONIST B's
    # P1-b IS WHY, AFTER I NEARLY TALKED MYSELF OUT OF IT [R18]. B reported that a control can rewrite a
    # tracked file in place, at the same size, with its mtime restored, and move nothing in this snapshot,
    # reaching a green over a replaced bundle. My first three reproductions DISAGREED: on a fresh fixture,
    # outside git's racily-clean window, and on a real clone with the file's mtime older than the index and
    # restored to the nanosecond, `git status --porcelain` reported the file modified every time - so I had
    # written this arm off as covered by the WT and DIFF lines and recorded the dispute.
    # THEN I BUILT THE CASE INSTEAD OF ARGUING, AND THE CASE WENT RED. A62 reproduces B's attack inside the
    # harness's own fixture and the judge answered exit 0, CHECKS TIER GREEN, over a replaced bundle: in that
    # configuration the stat cache IS trusted and `git status` says nothing. Whatever the exact mechanism
    # (git's stat cache depends on the index's own mtime, so it is configuration-dependent by construction),
    # the right conclusion is the one the control gave, not the one three hand-reproductions gave - which is
    # this project's own rule about believing a measurement over an argument, pointed at my own argument.
    # SO THE BYTES ARE HASHED, 592 files and 135MB in 0.77s a pass on the real tree, and a tracked file whose
    # CONTENT moves is grave whatever the index and the stat cache say.
    "${GIT[@]}" ls-files -s 2>/dev/null | sed 's/^/TRACKED /'
    ( cd "$ROOT" 2>/dev/null && "${GIT[@]}" ls-files -z 2>/dev/null | xargs -0 -r sha256sum 2>/dev/null ) \
      | sed 's/^/TRACKEDBYTES /'
    "${GIT[@]}" for-each-ref --format='%(refname) %(objectname)' 2>/dev/null | sed 's/^/REF /'
    "${GIT[@]}" stash list 2>/dev/null | sed 's/^/STASH /'
    printf 'DIFF %s\n' "$("${GIT[@]}" diff --no-ext-diff HEAD 2>/dev/null | sha256sum | cut -c1-64)"
    # CONFIG, HOOK and INFO: the CONTENT of .git/config, of every file under .git/hooks and of every file under
    # .git/info - exclude and attributes BODIES included, which the round-3 snapshot listed by NAME only, so a
    # rewritten .git/info/exclude was invisible to it.
    if [ -f "$ROOT/.git/config" ]; then
      printf 'CONFIG .git/config %s\n' "$(sha256sum < "$ROOT/.git/config" 2>/dev/null | cut -c1-64)"
    else printf 'CONFIG .git/config absent\n'; fi
    for f in "$ROOT"/.git/hooks/*; do
      [ -f "$f" ] || continue
      printf 'HOOK %s %s\n' "${f##*/}" "$(sha256sum < "$f" 2>/dev/null | cut -c1-64)"
    done
    for f in "$ROOT"/.git/info/*; do
      [ -f "$f" ] || continue
      printf 'INFO %s %s\n' "${f##*/}" "$(sha256sum < "$f" 2>/dev/null | cut -c1-64)"
    done
    # UNTRACKED: one line per untracked or ignored path with its inode, size and ctime to the NANOSECOND, so a
    # rewrite of an existing file shows even when its name and size are kept. THIS STAT FORM IS FOR THIS SET
    # ALONE, and the reason is the exit code: a change here ROUTES and is never a green, while this judge runs as
    # root in this container and root can in principle set a ctime back - so every set whose change is GRAVE is
    # content-hashed instead. gates/node_modules is untracked and not ignored, so it is in this set; MEASURED on
    # the real tree after `npm ci`, the whole pass is 95 entries in 0.006s, which is the floor this costs.
    # A STATUS LINE THAT IS NEITHER `??` NOR `!!` IS A TRACKED MODIFICATION OR A STAGED CHANGE, and it is typed
    # WT and is GRAVE: no other session writing a doc can produce one.
    while IFS= read -r -d '' rec; do
      case "$rec" in
        '?? '*|'!! '*)
          f="${rec:3}"
          printf 'UNTRACKED %s %s\n' "$f" "$(stat -c '%i %s %z' -- "$ROOT/$f" 2>/dev/null || echo gone)" ;;
        *) printf 'WT %s\n' "$rec" ;;
      esac
    done < <("${GIT[@]}" status --porcelain=v1 -uall --ignored -z 2>/dev/null)
    # EVIDENCE: the CONTENT of every file under gates/logs/ and claude/agents/gatelogs/, typed apart from
    # UNTRACKED so that a file which EXISTED at the first snapshot and then changed or vanished is GRAVE while a
    # newly ADDED one only routes. That split is what makes a rewritten gate log a refusal: the fifth round's
    # P1(c) was reproduced with a pre-existing ignored log whose text afterwards read "ALL EVIDENCE REMOVED BY A
    # CONTROL". MEASURED on the real tree: 166 files, 95MB, 3.3s a pass.
    for d in gates/logs claude/agents/gatelogs; do
      [ -d "$ROOT/$d" ] || continue
      while IFS= read -r -d '' f; do
        # THE HASH IS ON ITS OWN LINE SO THAT ITS MUTANT HAS A CLEAN SEAM. M34 has to replace the content hash
        # with a constant to show that hashing the BYTES (and not the name set, as round 3 did) is what catches
        # a same-name same-size rewrite; folded into the printf it could only be mutated by also dropping an
        # argument, and printf REUSES its format string, so the hash would have been printed anyway on a second
        # line and the mutant would have proved nothing. The shape of the code is chosen to keep its own control
        # honest, which is the same reason writelog() is a function.
        h="$(sha256sum < "$f" 2>/dev/null | cut -c1-64)"
        printf 'EVIDENCE %s %s\n' "${f#"$ROOT"/}" "$h"
      done < <(find "$ROOT/$d" -type f -print0 2>/dev/null | sort -z)
    done
    # GITDIR: the parts of .git where the RECOVERY EVIDENCE lives, which antagonist B's P1-d found outside
    # every arm: it removed .git/logs (the reflogs), .git/ORIG_HEAD and .git/COMMIT_EDITMSG and registered a
    # ghost worktree under .git/worktrees, all under exit 0 and a green. The object store is listed by PACK
    # SIZE rather than hashed, because 53MB of objects twice a run is not affordable and a truncated pack - the
    # shape B's P1-a destroyed a repository with - changes its size.
    local glog
    glog="$(find "$ROOT/.git/logs" -type f -print0 2>/dev/null | sort -z | xargs -0 -r sha256sum 2>/dev/null | sha256sum | cut -c1-64)"
    printf 'GITDIR logs %s\n' "$glog"
    printf 'GITDIR worktrees %s\n' "$(find "$ROOT/.git/worktrees" -mindepth 1 -maxdepth 2 2>/dev/null | sort | sha256sum | cut -c1-64)"
    printf 'GITDIR packs %s\n' "$(find "$ROOT/.git/objects" -maxdepth 2 -type f -printf '%P %s\n' 2>/dev/null | sort | sha256sum | cut -c1-64)"
    for f in ORIG_HEAD COMMIT_EDITMSG HEAD packed-refs shallow; do
      if [ -f "$ROOT/.git/$f" ]; then
        printf 'GITDIR %s %s\n' "$f" "$(sha256sum < "$ROOT/.git/$f" 2>/dev/null | cut -c1-64)"
      else printf 'GITDIR %s absent\n' "$f"; fi
    done
    # OUTSIDE: the files a control could use to reach the OPERATOR rather than the repository. The global git
    # config is here because the fifth round's P2(1) is exactly that: a GLOBAL core.hooksPath needs no file in
    # the repository at all, fires at the next commit, and the round-3 classifier knew only the .git/config INI
    # shape while `git config --global --list` emits `key.sub=value`.
    for f in "$HOME/.gitconfig" "$HOME/.config/git/config" "$HOME/.bashrc" "$HOME/.bash_profile" \
             "$HOME/.profile" "$HOME/.npmrc"; do
      if [ -f "$f" ]; then printf 'OUTSIDE %s %s\n' "$f" "$(sha256sum < "$f" 2>/dev/null | cut -c1-64)"
      else printf 'OUTSIDE %s absent\n' "$f"; fi
    done
    printf 'OUTSIDE git-config-global %s\n' "$(git config --global --list 2>/dev/null | sha256sum | cut -c1-64)"
    printf 'OUTSIDE git-config-system %s\n' "$(git config --system --list 2>/dev/null | sha256sum | cut -c1-64)"
  }

  # THE SECOND SNAPSHOT IS TAKEN ON EVERY EXIT PATH AFTER THE LOCK IS HELD, WHICH IS ROUND 4's OWN RESIDUAL
  # [antagonist A of the fourth round, theREMAINDER (a) on the hand-off job]. The three `return 2`s of the
  # acceptance block below fire AFTER the whole first half of the battery has run, and they used to leave with
  # the lock released and SNAP1 never taken - a window in which tampering was neither detected nor reported.
  # This function is the ONE place the two snapshots are compared, so the acceptance block and step (9) cannot
  # drift apart, and it SETS SNAPRC rather than echoing it: `say` accumulates into LOGLINES, and a function
  # called inside `$( )` would do that in a subshell and lose every line.
  #   SNAPRC 0  nothing moved.
  #   SNAPRC 1  GRAVE: tracked content, a ref, the stash, the working-tree diff, a staged change, a git config
  #             entry, a hook, a .git/info body, a file outside the repository, or an EVIDENCE file that existed
  #             at SNAP0 and changed or vanished. None of those is a doc write by another session.
  #   SNAPRC 2  ROUTED: an UNTRACKED or EVIDENCE path ADDED, or an UNTRACKED path removed or rewritten.
  #             CLAUDE.md lets every other chat write docs and flags in this repository and this judge cannot
  #             tell their writes from a control's, so it will not call the candidate broken on one.
  # THE LOG WRITE IS A FUNCTION SO THAT ITS CALL SITE IS ONE LINE, AND THAT IS NOT COSMETIC. The mutants that
  # prove this layer load-bearing have to swap the write for the in-place `>` form, and a five-line `&&` chain
  # cannot be replaced by one line without leaving a syntax error behind - at which point the mutant is testing
  # "the judge does not parse" and not the arm. mkmut's own header in the harness records that exact failure
  # costing two mutants their meaning, so the shape of this code is chosen to keep its mutant honest.
  # WHAT IT GUARANTEES, in order: the temporary is mktemp's, inside the private directory, so its name is not
  # computable and its creation cannot follow a link; the move is a RENAME, which acts on the NAME and so can
  # neither write through a symlink nor touch a hard link's other names, and `-T` refuses a directory at the
  # destination; and then the RESULT IS VERIFIED rather than assumed, because PRIV may be on another filesystem
  # where mv falls back to copy-and-unlink and opens the destination path. A write that is verified to be a
  # regular file, unlinked elsewhere, carrying this run's own bytes, cannot be a write that landed somewhere else.
  # THERE IS NO TEMPORARY AND NO RENAME ANY MORE, AND THAT CLOSES TWO FINDINGS AT ONCE [antagonist A's P1(d),
  # and A's QUESTION 1 about the cross-device fallback]. The rename was safe against a link AT THE DESTINATION
  # and not against one at the SOURCE: with a spinner relinking `$PRIV/log-*`, `mv -T` would have moved the
  # VICTIM onto the log path - destroying the bundle by renaming it. And because PRIV may be on another
  # filesystem, `mv` could fall back to copy-and-unlink, which opens the destination name and would follow a
  # symlink planted between the check and the write; A could not measure that here because /tmp and the
  # repository are one device, and it is now unreachable rather than unmeasured.
  # THE WRITE IS A SINGLE O_EXCL CREATE, which is what `set -C` compiles to. MEASURED before it was written: on
  # a path where a symlink to a victim is planted, `( set -C; printf ... > "$path" )` fails with "cannot
  # overwrite existing file" and the victim is untouched; on a fresh name it creates the file; and on an
  # existing plain file it refuses, which is why the honest re-run unlinks first. So a plant at this name can
  # make the log FAIL TO APPEAR - which is a RED with a sentence - and can no longer make the judge write
  # somewhere else.
  writelog(){
    # The honest re-run: a plain, single-linked regular file of ours is removed so the O_EXCL create can run.
    # Anything else at this name has already been refused by the write-target arm above.
    if [ -f "$OUT" ] && [ ! -L "$OUT" ] && [ "$(stat -c %h -- "$OUT" 2>/dev/null || echo 0)" = 1 ]; then
      rm -f -- "$OUT" 2>/dev/null || return 1
    fi
    ( set -C; printf '%s' "$LOGLINES" > "$OUT" ) 2>/dev/null || return 1
    [ -f "$OUT" ] && [ ! -L "$OUT" ] || return 1
    [ "$(stat -c %h -- "$OUT" 2>/dev/null || echo 0)" = 1 ] || return 1
    [ "$(sha256sum < "$OUT" 2>/dev/null | cut -c1-64)" = "$(printf '%s' "$LOGLINES" | sha256sum | cut -c1-64)" ] || return 1
    return 0
  }

  snapcheck(){
    SNAPRC=0
    [ "$LOCKHELD" = 1 ] || return 0
    SNAPTXT1="$(snapshot)"
    SNAP1="$(printf '%s\n' "$SNAPTXT1" | sha256sum | cut -c1-64)"
    [ "$SNAP0" = "$SNAP1" ] && return 0
    local SNAPDIFF gcount ecount dl
    SNAPDIFF="$(diff <(printf '%s\n' "$SNAPTXT0") <(printf '%s\n' "$SNAPTXT1") 2>/dev/null || true)"
    gcount="$(printf '%s\n' "$SNAPDIFF" | grep -cE '^[<>] (TRACKED|TRACKEDBYTES|REF|STASH|DIFF|WT|CONFIG|HOOK|INFO|GITDIR|OUTSIDE) ' || true)"
    gcount=$((gcount+0))
    # A '<' EVIDENCE line is a file that was there at SNAP0 and is no longer byte-identical: changed or gone.
    # A '>' EVIDENCE line with no '<' is an addition, which is what this run's own controls legitimately do.
    ecount="$(printf '%s\n' "$SNAPDIFF" | grep -cE '^< EVIDENCE ' || true)"; ecount=$((ecount+0))
    # AND TWO UNTRACKED NAMES ARE GRAVE WHEREVER THEY MOVE, WHICH KEEPS A REFUSAL ROUND 3 ESTABLISHED FROM
    # BEING WEAKENED BY ROUND 4's SPLIT. Mutant M21 measured exactly that: with the write-target guard and the
    # rename both removed, a symlink planted at this run's own log path is an UNTRACKED path ADDED, so the
    # typed split above ROUTED where round 3's classifier - which carried `gates/logs/(\.suite\.lock|checks-)`
    # as a grave marker - REFUSED, and the bundle was rewritten under a route. The justification for routing an
    # untracked change is that CLAUDE.md lets every other chat write docs and flags here and this judge cannot
    # tell their writes from a control's. That reasoning does not reach these two names: `gates/logs/.suite.lock`
    # is gates.sh's own lock and `gates/logs/checks-*` is THIS SCRIPT's log, and nothing else in this project
    # writes either. A name only the judge and a control can touch is not a doc write.
    local lcount
    # `\.?checks-` AND NOT `checks-`, AND THAT ONE CHARACTER IS THE FIFTH ROUND'S P1(a) IN ITS OWN WORDS:
    # "THE GRAVE CLASSIFIER MISSES IT BY ONE CHARACTER: it carries gates/logs/(\.suite\.lock|checks-) and the
    # temporary is .checks-, so the plant lands on the ROUTABLE side of round 4's own split." Writing the same
    # pattern again here would have reproduced the defect inside its own repair, which is what case A44 is for.
    lcount="$(printf '%s\n' "$SNAPDIFF" | grep -cE '^[<>] UNTRACKED gates/logs/(\.suite\.lock|\.?checks-)' || true)"
    lcount=$((lcount+0))
    gcount=$((gcount + lcount))
    if [ $((gcount + ecount)) -gt 0 ]; then
      say "REFUSED: the real tree CHANGED while the battery ran (snapshot ${SNAP0:0:16} -> ${SNAP1:0:16})."
      say "  $gcount differing line(s) name tracked content, a ref, the stash, the working-tree diff, a staged"
      say "  change, a git config entry, a hook, a .git/info body, a file outside this repository, or this"
      say "  judge's own log path or suite lock - names nothing but this script and a control ever writes - and"
      say "  $ecount name an EVIDENCE file (gates/logs, claude/agents/gatelogs) that existed before the battery"
      say "  and changed or vanished. None of those is another session writing a doc, and all of them are what a"
      say "  control plants. A planted hook fires at the NEXT commit, where nothing would connect it to this run."
      SNAPRC=1
    else
      say "GO FULL: the real tree CHANGED while the battery ran (snapshot ${SNAP0:0:16} -> ${SNAP1:0:16}), and"
      say "  every differing line is an UNTRACKED path added, removed or rewritten, or a new EVIDENCE file. This"
      say "  judge cannot tell a control's write from another session's - CLAUDE.md lets every other chat write"
      say "  docs and flags here - so it will not call your commit broken on it. Read the lines below: if none is"
      say "  yours, re-run the tier; the full suite decides either way."
      SNAPRC=2
    fi
    while IFS= read -r dl; do say "    $dl"; done < <(printf '%s\n' "$SNAPDIFF" | head -20)
    return 0
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

  # ── ROUND 4, D2: THE JUDGE'S OWN DIRECTORY, AND NOTHING IT WRITES HAS A NAME A CONTROL CAN COMPUTE. ─────────
  # THREE OF THE FIVE ADVERSARIAL ROUNDS ON THIS FILE FOUND ONE SHAPE - the judge's own write landing somewhere
  # else - and all three used a DERIVED NAME: the final log (rounds 2 and 3, symlink then hard link), the
  # temporary `gates/logs/.checks-$SHORT-$$.tmp` (round 5a, whose two components the judge itself publishes in
  # $LOCK/pid and $LOCK/log), and `$WORK/ctl-N.out` (round 5b, where $WORK is `dirname "$PWD"` from inside any
  # control). Both doors of the fifth round converged on the same STRUCTURAL remedy rather than another guard,
  # and this is it: every file this judge writes is created by `mktemp` or `mkdir` - O_EXCL semantics, which
  # cannot follow a link of either kind - inside a private directory that NO control's cwd sits under and whose
  # name no control can compute. Copying the three $OUT probes onto $LOGTMP was explicitly rejected on the job:
  # that is a TOCTOU on a path an attacker can re-create, and 5(b) is the same bug at a second name.
  # WHY IT IS A SECOND mktemp -d AND NOT A SUBDIRECTORY OF $WORK: a control's cwd is $WORK/cN, so $WORK is one
  # `dirname` away from every control, and anything under it is therefore computable. PRIV is a sibling of $WORK
  # under TMPDIR, mode 700 as mktemp -d creates it, and it is removed on every exit path.
  PRIV="$(mktemp -d 2>/dev/null)"
  if [ -z "$PRIV" ] || [ ! -d "$PRIV" ]; then
    say "REFUSED: mktemp -d produced no usable private directory, so this judge has nowhere to write that a"
    say "  control cannot compute. Every write of this run goes through that directory, so it will not proceed."
    rm -rf "$WORK" 2>/dev/null
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK"
    return 1
  fi
  chmod 700 "$PRIV" 2>/dev/null

  # ── ROUND 4, D3: A PER-RUN MARKER, SO A PROCESS THAT OUTLIVES ITS CONTROL CAN BE FOUND. ─────────────────────
  # run_ctl's own comment admitted the hole in terms: "the orphaned background process keeps running ... it is
  # still a process nobody reaps, and killing a whole process group is a bigger change than this". It is that
  # bigger change now, and the marker is the half a process group cannot cover: a control that calls `setsid`
  # itself, or double-forks, LEAVES the group, so the group kill cannot see it. Every control is given
  # CT_CTL_MARK in its environment, and /proc is scanned for a live process still carrying it.
  # ITS LIMIT, STATED HERE AND IN THE README RATHER THAN IMPLIED: a survivor that re-executes with a scrubbed
  # environment keeps nothing to match, so this catches the ordinary escape and not the determined one. A
  # control runs as the same user as this judge and can signal or trace it; the judge is a mechanical layer,
  # not a sandbox, and the antagonist pass that reads every control is the check.
  CTLMARK="$(head -c 24 /dev/urandom 2>/dev/null | od -An -tx1 2>/dev/null | tr -dc 'a-f0-9')"
  if [ -z "$CTLMARK" ] || [ "${#CTLMARK}" -lt 16 ]; then
    say "REFUSED: could not mint a per-run control marker from /dev/urandom, so a process that outlives its"
    say "  control could not be distinguished from any other process on this machine."
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK"
    return 1
  fi

  # ctl_survivors -> prints the pid of every live process carrying this run's marker, one per line.
  # THE herestring IS DELIBERATE AND NOT A STYLE CHOICE: `tr ... | grep -q` is an early-exiting pipe into grep
  # under pipefail, which this project's own sigpipe audit classes TIER A and whose ceiling is 1 with 0 used.
  # A guard that breaks the repository's push gate to exist is not a guard.
  ctl_survivors(){
    local pd pid envtxt
    for pd in /proc/[0-9]*; do
      pid="${pd#/proc/}"
      [ "$pid" = "$$" ] && continue
      [ -r "$pd/environ" ] || continue
      # THE REDIRECT ERROR IS THE SHELL'S, NOT tr's, SO `2>/dev/null` ON tr DOES NOT SUPPRESS IT [antagonist
      # B, P2]: as root `[ -r /proc/1/environ ]` is TRUE while the open fails, and the judge printed dozens of
      # "Permission denied" and "No such process" lines into the operator's terminal, interleaved with its own
      # verdict and absent from the log. The whole group's stderr is redirected instead.
      envtxt="$( { tr '\0' '\n' < "$pd/environ"; } 2>/dev/null )"
      if grep -qxF "CT_CTL_MARK=$CTLMARK" <<<"$envtxt"; then printf '%s\n' "$pid"; fi
    done
    return 0
  }

  # ── ROUND 4, D1: GIT NO LONGER HANDS A CONTROL THE REAL TREE. ───────────────────────────────────────────────
  # EVERY ONE of those three P1s reached the real repository by the SAME free route, and it was handed to the
  # control by this judge: `git clone --shared "$ROOT"` leaves the clone's `remote.origin.url` naming the tree
  # under judgement and its `.git/objects/info/alternates` pointing into it, so a control that asserts nothing
  # can read `git config --get remote.origin.url` and write anywhere in the real checkout. The controls now
  # clone from a THROWAWAY MIRROR in the judge's private directory, so both of those name the mirror and the
  # real root appears in neither. MEASURED: `git clone --mirror --no-hardlinks` of this repository is 1.7s and
  # 53MB, a control's clone from the mirror is 1.0s against 0.9s from the real root, and the clone's
  # remote.origin.url and alternates both resolve inside PRIV.
  # --no-hardlinks ON THE MIRROR IS LOAD-BEARING AND NOT TIDINESS: a hardlinked object file is the SAME INODE as
  # the real repository's, so a control that wrote one would corrupt the tree under judgement through a path no
  # snapshot of mine watches.
  # WHAT THIS DOES NOT DO, and D3's README entry says it in the same words: a control can still find the real
  # tree through /proc (this judge's cwd and argv), so this closes the EASY route and not the class. The defence
  # for the rest is D2 above - a write with no computable target - plus the antagonist pass that reads every
  # control. A judge is a mechanical layer, not a sandbox.
  MIRROR="$PRIV/mirror.git"
  # AND THE MIRROR'S OWN ORIGIN IS REMOVED, WHICH IS ANTAGONIST B's P1-f AND A FALSE CLAIM OF MINE [R18]. The
  # comment below used to say "both of those name the mirror and the real root appears in neither". It did
  # appear: a clone records where it came from, so the MIRROR's own remote.origin.url was $ROOT and a control
  # reached the real tree in two hops -
  # `git -C "$(git config --get remote.origin.url)" config --get remote.origin.url`. B measured both hops.
  # MEASURED HERE BEFORE AND AFTER: with the remote removed, `git clone --shared "$MIRROR"` still works and the
  # two-hop read returns NOTHING. The alternates path still names PRIV, so PRIV's name is not a secret and
  # nothing in this file may rest on its being one - which is why D2's guarantee is mktemp and not obscurity.
  if ! git clone --quiet --mirror --no-hardlinks "$ROOT" "$MIRROR" >/dev/null 2>&1 || [ ! -d "$MIRROR" ]; then
    say "REFUSED: could not build the throwaway mirror of this repository in the private directory, so every"
    say "  control's clone would have to name the real tree as its origin - which is the route three of the five"
    say "  adversarial rounds on this judge used to write into the tree under judgement."
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK"
    return 1
  fi
  git -C "$MIRROR" remote remove origin >/dev/null 2>&1 || true
  if [ -n "$(git -C "$MIRROR" config --get remote.origin.url 2>/dev/null || true)" ]; then
    say "REFUSED: the throwaway mirror still records this repository as its own origin, so a control reaches the"
    say "  real tree in two hops through it. That is the route this isolation exists to remove."
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK"
    return 1
  fi
  say "  isolation: controls clone from a throwaway mirror in this run's private directory, not from $ROOT,"
  say "    and the mirror records no origin of its own, so the two-hop read of it returns nothing"

  # ── (8) THE BATTERY. EACH CONTROL IN ITS OWN THROWAWAY CLONE, HEAD CHECKED OUT, origin/main AT THE BASE. ────
  # NEVER A GIT WORKTREE OF THE REAL CHECKOUT: worktrees share refs and .git/info/exclude, and #530's controls
  # moved the real refs/remotes/origin/main that way. A clone has its own refs, so update-ref below cannot reach
  # the tree under judgement.
  local nclone=0
  # THE MIRROR IS RE-VERIFIED BEFORE EVERY CLONE, because the controls share it. A control cannot alter the
  # CONTENT at a sha - git objects are content-addressed and git checks them on read - but it can delete objects
  # or move the mirror's refs, so the two trees every control reads are compared against the real repository's
  # own values before each clone. Cheap (two rev-parses) and it keeps the mirror from becoming a way to weaken a
  # LATER control: an earlier control that reverted a weakening in gates/held.sh inside the mirror would
  # otherwise make main's held-selftest pass against a tree nobody committed.
  mirror_ok(){
    local a b
    a="$("${GIT[@]}" rev-parse --verify "$HEADSHA^{tree}" 2>/dev/null)"
    b="$(git -C "$MIRROR" rev-parse --verify "$HEADSHA^{tree}" 2>/dev/null)"
    [ -n "$a" ] && [ "$a" = "$b" ] || return 1
    a="$("${GIT[@]}" rev-parse --verify "$BASESHA^{tree}" 2>/dev/null)"
    b="$(git -C "$MIRROR" rev-parse --verify "$BASESHA^{tree}" 2>/dev/null)"
    [ -n "$a" ] && [ "$a" = "$b" ] || return 1
    return 0
  }
  # ── ANTAGONIST A's P1(b): THE FOURTH PLACE, AND IT IS THE BIGGEST WRITE THIS JUDGE MAKES. D2 says "nothing
  # the judge writes has a name a control can compute", and `run_ctl` then built its clone at `$WORK/c$CTLN` -
  # a control's cwd is $WORK/c<N>, so the NEXT clone's destination is `dirname "$PWD"` plus one increment, and
  # `ALLCASES` is sorted so the order is predictable. A control symlinked $WORK/c<N+1> at a directory inside the
  # real repository's .git and `git clone` wrote SEVENTY-EIGHT PATHS into the tree under judgement - a complete
  # second checkout, with its own .git - under exit 0, CHECKS TIER GREEN, and "the real tree was not touched".
  # The snapshot saw nothing, because .git/ is listed by none of its types, and the next control then ran with
  # its cwd inside the real repository. Aimed one directory higher it is a ROUTE: a 78-path checkout at the
  # repository root, classified as "another chat wrote a doc".
  # THE DESTINATION IS NOW mktemp's, AND THE PARENT STAYS $WORK ON PURPOSE: putting the clones under $PRIV
  # would make `dirname "$PWD"` resolve to PRIV from inside every control, which is the same hole one directory
  # over. A's own measurement of this repair: the plant creates NOTHING in the real tree and the honest case
  # stays green.
  mkclone(){
    local dest="$1"
    nclone=$((nclone+1))
    if ! mirror_ok; then
      bad "the throwaway mirror no longer matches this repository's base and head trees, so no later control can be trusted"
      return 1
    fi
    # `git clone` into an EXISTING EMPTY directory is allowed, which is what makes the mktemp -d destination
    # work: mktemp creates the directory itself, so there is nothing for a control to pre-plant at that name.
    git clone --quiet --no-hardlinks --shared "$MIRROR" "$dest" >/dev/null 2>&1 || return 1
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
  # ── ctl_exec <dir> <outfile> -- <cmd...>  RUNS A COMMAND THE WAY EVERY CONTROL MUST BE RUN, AND IT IS A
  # FUNCTION BECAUSE THE ONE ARM THAT DID NOT USE run_ctl WAS EXEMPT FROM EVERY HARDENING run_ctl HAS
  # [antagonist B, P1-e]. The fastgate-drive arm below read
  # `out="$(cd "$d" && timeout 900 bash gates/fastgate-drive.sh fixed 2>&1)"` - no stdin redirect, no output
  # file, no setsid, no process-group kill, no env isolation, no marker and therefore no survivor scan - and it
  # is the ONE arm that executes the CANDIDATE's own gates/fastgate.sh (gates/fastgate-drive.sh runs
  # `bash "$C/gates/fastgate.sh"` at two sites). B measured HOME=/root inside it, stdin the judge's own socket,
  # CT_CTL_MARK unset, and a `setsid bash -c 'sleep 45' &` from the candidate's script SURVIVING the whole run
  # with no survivor report; and a `sleep 20 &` in it held the real tree's suite lock 20 seconds longer under a
  # green, bounded only by this arm's own 900s.
  # SO THE EXECUTION DISCIPLINE LIVES IN ONE PLACE AND BOTH CALL SITES USE IT. Duplication is how this arm came
  # to be left behind: every guard the five rounds added went into run_ctl, and nothing told the author of each
  # repair that a second site existed.
  #   125 means the ISOLATION could not be built, which is never a verdict about the command.
  #   $CTL_BOUND overrides the per-command bound for a caller that needs a different one (the drive arm's 900s).
  # ── ANTAGONIST A's P1(d): mktemp STOPS A PRE-PLANT AND DOES NOT STOP A SWAP, SO THE WRITE GOES THROUGH A
  # DESCRIPTOR AND THE NAME IS NEVER RESOLVED TWICE. A left a control that spawns a `setsid` spinner - which
  # escapes the process group by construction - polling for any empty `$PRIV/ctl-*.out` or `$PRIV/log-*` and
  # relinking it at the real app.js. In 3 of 9 runs the bundle was rewritten with a later control's stdout: the
  # snapshot DID refuse, and the damage had already happened, which is the standard this file set itself twice
  # ("a REFUSED verdict over a clobbered bundle would still have cost somebody their tree"). PRIV's name is no
  # secret either - `dirname "$(git config --get remote.origin.url)"` IS PRIV - and mode 700 buys nothing
  # against a control running as the same uid.
  # SO: mktemp creates the inode, this function opens it ONCE, every child writes to that descriptor, and the
  # output is read back through /proc/self/fd - which re-opens the same inode. MEASURED before it was written:
  # with the name renamed away and a symlink to a victim left in its place mid-run, two children's output still
  # landed in the original file, /proc/self/fd read both lines back, and the victim was untouched. A relink can
  # still take the NAME; it can no longer take the WRITE.
  # THE CALLER NEVER SEES THE NAME: the content comes back in CTL_OUT, so no call site can reintroduce a
  # second resolution - which is how the drive arm came to be exempt from every other guard.
  ctl_exec(){
    local d="$1"; shift; [ "${1:-}" = "--" ] && shift
    local chome cgit pgid rc outf ofd bound="${CTL_BOUND:-$CTLTMO}"
    CTL_OUT=""
    chome="$(mktemp -d "$PRIV/h-XXXXXXXXXX" 2>/dev/null)" || return 125
    [ -n "$chome" ] && [ -d "$chome" ] || return 125
    cgit="$(mktemp "$chome/gitconfig-XXXXXXXXXX" 2>/dev/null)" || return 125
    [ -n "$cgit" ] && [ -f "$cgit" ] || return 125
    outf="$(mktemp "$PRIV/ctl-XXXXXXXXXX.out" 2>/dev/null)" || return 125
    [ -n "$outf" ] && [ -f "$outf" ] || return 125
    exec {ofd}>"$outf" || return 125
    # [FRESH ANTAGONIST A, P2(1)] THE NAME IS RESOLVED TWICE AFTER ALL, AND THE COMMENT ABOVE SAYING IT IS NOT
    # WAS TOO STRONG: once by mktemp(3) and once by this `exec`, and the second resolution follows a symlink, so
    # a control that relinks the name in between captures a later control's stdout. A could not land it against
    # the judge (0 hits in 5 runs) - but the descriptor arm's only negative control, M44, SKIPPED this run, so
    # the arm is UNCONTROLLED and an unproven claim is not a guard. Compare the descriptor's own inode against
    # the one mktemp created: that closes the swap deterministically rather than by timing.
    # `-ef` AND NOT `stat`, FOR TWO MEASURED REASONS. `stat` does not dereference a symlink without `-L`, so
    # `stat -c %i /proc/self/fd/N` returns the inode of the PROCFS LINK rather than of the file it points at -
    # my first version of this guard compared that against mktemp's inode, they never matched, and it returned
    # 125 for EVERY control: the harness went 48 FAIL in 100 seconds, which is the harness doing its job. `-ef`
    # is a shell builtin, so it also needs no fork and no exec. MEASURED both ways: SAME on the honest path,
    # and DIFFERENT once the name is relinked to a victim, which is the case it exists for.
    [ "$outf" -ef "/proc/self/fd/$ofd" ] || return 125
    [ ! -L "$outf" ] || return 125
    # ── FRESH ANTAGONIST A's P1, AND IT WAS MINE: THE PGID USED TO COME BACK IN A FILE, AND THIS FUNCTION
    # TURNS A PGID INTO `kill -TERM -- -<it>` AS ROOT. D3's first version launched the control under
    # `setsid --wait bash -c 'printf "%s\n" "$$" > "$0"; ...' "$pgf"`, so the control was a session and group
    # leader and wrote its own pgid where this function could read it. mktemp defeats a pre-plant at a
    # PREDICTABLE name and does nothing whatever about ENUMERATION: a control's cwd is under $WORK, $PRIV is
    # `dirname "$(git config --get remote.origin.url)"`, and mode 700 "buys nothing against a control running
    # as the same uid" - this file's own words. So `for f in "$PRIV"/pg-*; do echo <any digits> > "$f"; done`
    # chose the group the judge would TERM. A reproduced it twice and I reproduced it again before touching
    # this: a control that asserts nothing killed an unrelated `setsid sleep 600` and the verdict was
    # `CHECKS TIER GREEN` with the sentence "and that the real tree was not touched" printed under it; with `0`
    # the judge TERMed ITSELF mid-battery, leaving no verdict, no log, the suite lock standing with a dead pid
    # and 79 temp directories behind. `1` is `kill -TERM -- -1` as root, which neither of us ran.
    # WHY IT IS NOT THE SAME-UID LIMIT WEARING A NEW HAT: the destructive act is the JUDGE's, outside every
    # control's process group and outside the marker scan, so `ctl_survivors`, the group kill and the snapshot
    # are all blind to it by construction - and the two layers that make $outf safe were applied five lines
    # above and not here.
    # THE FIX DELETES THE SURFACE RATHER THAN VALIDATING IT: job control puts the background subshell in a
    # group of its own whose pgid IS `$!`, so the number comes from the judge's own shell and no file exists
    # for a control to write. Measured: the grandchild of the subshell inherits that group, the group kill
    # reaches it, and `wait` still carries the exit status through (rc=7 from a child that exited 7).
    # WHAT IT COSTS: `setsid` also made the control a SESSION leader, and job control does not, so a control
    # keeps the judge's session and could open /dev/tty if the session has one. That is inside the same-uid
    # limit this file already discloses (a control can read the judge's cwd and argv out of /proc), and it buys
    # the removal of the only place where a control's bytes became a root signal. A control that calls
    # `setsid` itself still escapes the group and is still caught by the marker, exactly as before.
    set -m
    ( cd "$d" && env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_OBJECT_DIRECTORY \
          -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_CEILING_DIRECTORIES \
          HOME="$chome" TMPDIR="$chome" XDG_CONFIG_HOME="$chome/xdg" \
          GIT_CONFIG_GLOBAL="$cgit" GIT_CONFIG_NOSYSTEM=1 \
          CT_CTL_MARK="$CTLMARK" \
          timeout "$bound" "$@" >&$ofd 2>&1 </dev/null ) &
    pgid=$!
    set +m
    wait "$pgid"; rc=$?
    # READ BACK THROUGH THE DESCRIPTOR AND NEVER THROUGH $outf, for the same reason the write goes through it.
    CTL_OUT="$(cat "/proc/self/fd/$ofd" 2>/dev/null || true)"
    exec {ofd}>&-
    # THE GROUP IS KILLED BY THE NUMBER THIS FUNCTION WATCHED ITSELF, and the floor is belt and braces: 0 means
    # "the sender's own group" and 1 means "every process on the machine", and both are digit strings.
    case "$pgid" in
      ''|*[!0-9]*) : ;;
      *) [ "$pgid" -gt 1 ] && kill -TERM -- "-$pgid" 2>/dev/null; : ;;
    esac
    return $rc
  }

  run_ctl(){
    local label="$1" want="$2" need="$3" forbid="$4"; shift 4; [ "${1:-}" = "--" ] && shift
    local d out rc
    CTLN=$((CTLN+1))
    d="$(mktemp -d "$WORK/c-XXXXXXXXXX" 2>/dev/null)" || d=""
    if [ -z "$d" ] || [ ! -d "$d" ]; then
      bad "$label: could not create its clone directory, so the control did not run"
      say "  RED  $label - no clone directory"
      return 1
    fi
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
    # THE OUTPUT GOES TO A FILE AND NOT THROUGH A COMMAND SUBSTITUTION, AND THAT IS WHAT MAKES THE BOUND REAL
    # [fresh antagonist A, round 4, finding 2]. `timeout` signals its DIRECT CHILD only, and `$( )` blocks until
    # every holder of the pipe's write end has exited - so a control whose body is `sleep 25 &` kept the pipe
    # open and ran for 25 seconds under a 3-second bound, reached PASS, reached CHECKS TIER GREEN, and held the
    # real tree's suite lock throughout. `sleep 9999 &` is an unbounded hold on the one lock that stops two
    # suites overlapping. M23 could not see it, because its control is a FOREGROUND sleep: it measured
    # `timeout`'s ability to kill its own child and said nothing about the pipe. THE BOUND WAS ON `timeout` AND
    # NOT ON `run_ctl`, which is the distinction the whole finding turns on.
    # Redirecting to a file leaves no pipe for a grandchild to hold, so the subshell returns when timeout does.
    # WHAT THIS DOES NOT DO, said plainly rather than implied: the orphaned background process keeps running.
    # It cannot hold this run up and it cannot reach the tree under judgement (its cwd is a throwaway clone),
    # but it is still a process nobody reaps, and killing a whole process group is a bigger change than this.
    # ROUND 4, D2, AND THIS EXACT LINE IS THE FIFTH ROUND'S P1(b): it read `outf="$WORK/ctl-$CTLN.out"`, and
    # each control's cwd is `$WORK/c$CTLN`, so $WORK is `dirname "$PWD"` from inside any control. A control
    # pre-planted symlinks at every $WORK/ctl-N.out and the NEXT control's stdout was written through one - the
    # reproduction replaced app.js with the following control's output. mktemp creates the file itself with
    # O_EXCL, in a directory no control can name, so there is nothing to pre-plant and nothing to follow.
    # ── ROUND 4, D3: THE CONTROL GETS ITS OWN HOME, TMPDIR, XDG_CONFIG_HOME AND GIT CONFIG, AND ITS OWN
    # PROCESS GROUP. Before this, a control inherited the judge's entire environment, so `git config --global`
    # reached the OPERATOR's ~/.gitconfig - a global core.hooksPath needs no file in the repository at all and
    # fires at the next commit anywhere - and `npm`, `pip` or anything else that writes a dotfile reached their
    # real homes. GIT_CONFIG_NOSYSTEM=1 closes /etc/gitconfig the same way. stdin is /dev/null, as before.
    # AND THE BOUND IS NOW ON THE GROUP, which is what the previous round's own comment said it was not: it
    # bounded `timeout`'s DIRECT CHILD, so a control whose body is `sleep 9999 &` held the real tree's suite
    # lock for as long as it liked. Job control makes the control's subshell a process-group leader whose pgid
    # IS `$!`, so the judge watches the number itself, and the group is killed when the control ends - measured
    # here: an orphaned `sleep 30 &` is reaped by the group kill and is gone from `ps` afterwards. It was
    # `setsid --wait` writing its pgid into a file until fresh antagonist A's P1 of the seventh round; the
    # reasoning is at that repair, in ctl_exec.
    # ── ANTAGONIST B's P1-a, AND IT WAS MINE: THIS IS THE SIXTH TIME A JUDGE WRITE AT A DERIVED NAME HAS BEEN
    # THE DEFECT ON THIS FILE, AND THE FIRST FIVE ARE WHY D2 EXISTS. The first version of D3 wrote
    # `chome="$WORK/h$CTLN"; mkdir -p "$chome"; : > "$chome/gitconfig-empty"`. A control's cwd is $WORK/c<N>, so
    # $WORK is `dirname "$PWD"` and its own N is `"${PWD##*/c}"`, and `ALLCASES` is sorted, so the NEXT
    # control's N is predictable and a commit may legitimately add more than one control. B planted a symlink at
    # $WORK/h<N+1>/gitconfig-empty and the judge's own `: >` truncated the target: an operator file outside the
    # repository went 46 bytes to 0, and aimed at .git/objects/pack/*.pack it destroyed the repository
    # ("far too short to be a packfile") - under exit 0, CHECKS TIER GREEN, and the sentence "the real tree was
    # not touched". `mkdir -p "$chome"` was the same lever one level up: plant $WORK/h<N+1> as a symlink to a
    # directory and the next control's $HOME is wherever the planting control chose.
    # SO THE CONTROL HOME IS mktemp's TOO, inside PRIV, which is what D2 says in terms and what I failed to
    # apply to the one path my own repair added: "every file this judge writes is created by mktemp or mkdir -
    # O_EXCL semantics, which cannot follow a link of either kind - inside a private directory that NO control's
    # cwd sits under and whose name no control can compute."
    local rc
    ctl_exec "$d" -- "$@"; rc=$?
    if [ "$rc" = 125 ]; then
      bad "$label: its isolated environment could not be built, so the control did not run"
      say "  RED  $label - no isolated environment"
      return 1
    fi
    out="$CTL_OUT"
    if [ "$rc" = 124 ]; then
      bad "$label: did not finish in ${CTLTMO}s"
      say "  RED  $label - did not finish in ${CTLTMO}s (timed out; the suite lock is held for the whole battery)"
      return 1
    fi
    local why="" okrc=0 w
    local IFSSAVE="$IFS"; IFS=','
    for w in $want; do [ "$rc" = "$w" ] && okrc=1; done
    IFS="$IFSSAVE"
    # "wanted 0" FOR A SET OF ONE [fresh antagonist B, F9]. It read "exit 3, wanted one of 0", which is the
    # plural construction over a single value - the shape this run was briefed to hunt in its own verdict lines.
    if [ "$okrc" != 1 ]; then
      case "$want" in
        *,*) why="exit $rc, wanted one of $want" ;;
        *)   why="exit $rc, wanted $want" ;;
      esac
    fi
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
    # AND A SURVIVOR IS GRAVE EVEN WHEN THE CONTROL ITSELF PASSED, because what it leaves behind is the point:
    # a process that outlives the battery can write into the real tree after the snapshot that was supposed to
    # prove nothing did. The group kill above cannot see one that called `setsid` itself; the marker can.
    local surv
    surv="$(ctl_survivors)"
    if [ -n "$(printf '%s' "$surv" | tr -d '[:space:]')" ]; then
      bad "$label: left a live process carrying this run's control marker (pid $(printf '%s' "$surv" | tr '\n' ' '))"
      say "  RED  $label - a process of this control OUTLIVED it: pid $(printf '%s' "$surv" | tr '\n' ' ')"
      say "        A control that escapes its own process group can write into the real tree after the snapshot"
      say "        that is supposed to prove nothing did."
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
    CTLN=$((CTLN+1))
    d="$(mktemp -d "$WORK/c-XXXXXXXXXX" 2>/dev/null)" || d=""
    if [ -z "$d" ] || [ ! -d "$d" ] || ! mkclone "$d"; then
      bad "fastgate-drive.sh fixed: could not build its isolated clone"
      say "  RED  fastgate-drive.sh fixed - no clone"
    else
      # THROUGH ctl_exec, WITH ITS OWN BOUND [antagonist B, P1-e]. This arm runs the CANDIDATE's own
      # gates/fastgate.sh by way of main's harness, so it needs every guard a gates/cases control gets.
      CTL_BOUND=900 ctl_exec "$d" -- bash gates/fastgate-drive.sh fixed; rc=$?
      out="$CTL_OUT"
      local dsurv
      dsurv="$(ctl_survivors)"
      if [ -n "$(printf '%s' "$dsurv" | tr -d '[:space:]')" ]; then
        bad "fastgate-drive.sh fixed: left a live process carrying this run's control marker (pid $(printf '%s' "$dsurv" | tr '\n' ' '))"
        say "  RED  fastgate-drive.sh fixed - a process of this arm OUTLIVED it: pid $(printf '%s' "$dsurv" | tr '\n' ' ')"
      fi
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
      [ "$rc" = 125 ] && why="its isolated environment could not be built"
      [ "$rc" = 0 ] || why="${why:-exit $rc, wanted 0}"
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
    # THE SECOND SNAPSHOT IS TAKEN HERE TOO [round 4's own residual]: half the battery has already run, so
    # leaving without comparing would be a window in which tampering is neither detected nor reported.
    snapcheck
    [ "$SNAPRC" = 1 ] && say "CHECKS TIER RED: the refusal above outranks the route - a control changed the real tree."
    [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
    rm -rf "$WORK" "$PRIV" 2>/dev/null
    [ "$SNAPRC" = 1 ] && return 1
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
    # AN ABSENT app.js MUST NOT BE REPORTED AS d41d8cd98f00 [fresh antagonist B, F8]. `cat-file blob` on a
    # missing path writes nothing and md5sum then hashes the EMPTY STRING, so the verdict named the md5 of
    # nothing as "this tree's app.js" and sent the reader hunting for a bundle difference that is a missing file.
    if "${GIT[@]}" cat-file -e "$HEADSHA:app.js" 2>/dev/null; then
      DISKMD5="$("${GIT[@]}" cat-file blob "$HEADSHA:app.js" 2>/dev/null | md5sum | cut -c1-12)"
    else
      DISKMD5="(no app.js at ${HEADSHA:0:12})"
    fi
    if [ "$NMD5" != 1 ]; then
      say "GO FULL: the base's newest archived log $GLOG names $NMD5 bundle md5(s) on a \`ref:\` line, not one."
      say "  With no single structured value the arm cannot compare anything, and guessing which of several to"
      say "  believe is how the first version of this check went wrong. State outside your commit: run the suite."
      snapcheck
      [ "$SNAPRC" = 1 ] && say "CHECKS TIER RED: the refusal above outranks the route - a control changed the real tree."
      [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
      rm -rf "$WORK" "$PRIV" 2>/dev/null
      [ "$SNAPRC" = 1 ] && return 1
      return 2
    fi
    if [ "$LOGMD5" != "$DISKMD5" ]; then
      say "GO FULL: the base's newest archived log $GLOG gated bundle $LOGMD5 and this tree's app.js is $DISKMD5."
      say "  The acceptance arm compares the two with --this-bundle, so it cannot speak about this candidate while"
      say "  they differ. That is state outside your commit, not a fault in it: the full suite decides."
      snapcheck
      [ "$SNAPRC" = 1 ] && say "CHECKS TIER RED: the refusal above outranks the route - a control changed the real tree."
      [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
      rm -rf "$WORK" "$PRIV" 2>/dev/null
      [ "$SNAPRC" = 1 ] && return 1
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
  # ROUND 4: `-L` TESTS THE WRONG PROPERTY, AND BOTH ANTAGONISTS OF THE THIRD ROUND FOUND IT INDEPENDENTLY
  # FROM OPPOSITE DOORS. A HARD LINK IS NOT A SYMLINK: `[ -L ]` is FALSE for one, and `>` then truncates and
  # rewrites the inode it finds - which is app.js. Two poses, both reproduced by both of them and both now cases
  # A35 and A36 in the harness:
  #   the log path does NOT pre-exist -> the plant adds a line to the ignored listing, so the SNAPSHOT refuses
  #     (exit 1) and the write STILL destroys the bundle. That is precisely the state mutant M21 exists to call
  #     unacceptable, and the round-3 commit's own justification for this layer - "a REFUSED verdict over a
  #     clobbered bundle would still have cost somebody their tree" - was therefore unmet by the fix that cited it.
  #   the log path ALREADY exists, which is true of any re-run of the tier at an unchanged HEAD and is exactly
  #     what the live-lock GO FULL text above invites -> `rm -f` plus `ln` leaves the `!!` ignored line IDENTICAL
  #     in both snapshots, so the snapshot is BLIND, and the run reaches exit 0, CHECKS TIER GREEN, and prints
  #     "the real tree was not touched" over a replaced app.js.
  # SO THE QUESTION WAS NEVER "IS THIS PATH A SYMLINK". It is "DOES WRITING HERE WRITE SOMEWHERE ELSE", and the
  # answer has three parts: a redirected DIRECTORY component, a redirected FILE, and a file whose inode somebody
  # else also holds. All three are asked below, and the write itself is then made structurally incapable of
  # following either kind of link (see the O_EXCL create at the end of this function).
  # AND B's F2 IS THE SAME LEVER WITH NO LINK AT ALL: a control that puts a DIRECTORY at the log path makes the
  # write fail, and `> "$OUT" 2>/dev/null && printf ' log: ...'` swallowed it - exit 0, CHECKS TIER GREEN, and NO
  # LOG FILE EXISTS. The audit artefact the whole design rests on was removable by the commit under judgement,
  # with the only tell an unlabelled "Is a directory" on stderr that no consumer greps. So the log is now PROBED
  # here, before the verdict, and a probe that fails is a RED with its own sentence.
  OUT="$ROOT/$SELFLOG"
  local _p
  for _p in "$ROOT/gates" "$ROOT/gates/logs"; do
    [ -L "$_p" ] || continue
    say "REFUSED: $_p is a SYMLINK, so every path under it - including this run's own log - resolves somewhere"
    say "  else, and a write there lands outside the directory this judge believes it is writing to."
    SELFLOGBAD=1; RC=1
  done
  # ── ANTAGONIST A's P1(a) — AND THE REFUSAL IT REPLACES WAS MINE, WRITTEN HOURS EARLIER IN THIS SAME RUN.
  # Round 4's first draft said "the destination must not exist at all", which made the judge's OWN PREVIOUS LOG
  # a hard refusal: A ran an honest tier-only commit twice at one head and got CHECKS TIER GREEN, then
  # `REFUSED: something already exists at gates/logs/checks-<short>-all.log`, exit 1 - the verdict whose own
  # meaning in this file is "do not re-run hoping for a different answer". Measured against the baseline, the
  # same two runs are green TWICE, so it was a REGRESSION and not a tightening. Worse, the judge creates the
  # state itself: every ROUTE and every RED writes a log and the route's text says "re-run the tier", which the
  # next run then refused. That is the false-hard-refuse class this file spent FIVE repairs converting to exit
  # 2, committed for the sixth time by the repair for the fifth.
  # SO THE QUESTION GOES BACK TO BEING ABOUT THE KIND OF THING AT THE NAME - and the reason that is sound now,
  # where it was insufficient three times in round 3, is that it is no longer the thing preventing the HARM.
  # Two layers carry that: `writelog` is an O_EXCL CREATE with four post-conditions, which cannot write through a
  # symlink or a hard link's other names; and D4's snapshot makes anything appearing at
  # `gates/logs/[.]checks-*` or the suite lock GRAVE, so a plant during the battery is refused by the arm that
  # can actually tell it from an honest re-run. What is left for this arm is the one case the create cannot
  # survive and an honest re-run never produces: something at that name which is not a plain single-linked
  # regular file.
  if [ "$SELFLOGBAD" = 0 ] && { [ -e "$OUT" ] || [ -L "$OUT" ]; }; then
    local _lnk
    if [ -L "$OUT" ]; then
      say "REFUSED: $SELFLOG is a SYMLINK. An honest re-run of this tier leaves a regular file here, so this is"
      say "  a plant, and writing it would be a write to whatever it points at."
      SELFLOGBAD=1; RC=1
    elif [ ! -f "$OUT" ]; then
      say "REFUSED: $SELFLOG exists and is NOT a regular file, so this run cannot write its own log there and"
      say "  would leave no auditable record. A control can create a DIRECTORY at this path to do exactly that."
      SELFLOGBAD=1; RC=1
    else
      _lnk="$(stat -c %h -- "$OUT" 2>/dev/null || echo 1)"
      if [ "$_lnk" != 1 ]; then
        say "REFUSED: $SELFLOG has $_lnk hard links, so its inode is also reachable by another name. Unlinking"
        say "  this name would leave those other names intact, but an inode this run did not create being shared"
        say "  is a plant and not an honest re-run: \`[ -L ]\` is FALSE for a hard link, which is how round 3"
        say "  missed it."
        SELFLOGBAD=1; RC=1
      else
        say "  NOTE: $SELFLOG already exists as a plain regular file and will be REPLACED by this run's write."
        say "    That is this tier re-run at an unchanged head, which its own live-lock route invites, and it is"
        say "    not a fault in the commit. A plant at this name during the battery is caught by the snapshot."
      fi
    fi
  fi
  # NO FILE IS CREATED HERE, AND MY FIRST VERSION OF THIS FIX CREATED ONE - which broke twenty-four cases at
  # once and is the same trap one layer in. I had the write-target arm PROBE the directory by creating the
  # temporary it would later rename, so that a log which cannot be written would be a RED before the verdict
  # rather than a silence after a GREEN. The temporary is a new untracked path under gates/logs, created
  # BETWEEN SNAP0 and SNAP1 - so the snapshot saw a real difference and routed every honest candidate to the
  # full suite. THE CHECK CREATED THE DIFFERENCE IT THEN MEASURED, which is the twelfth costume again, authored
  # by the repair for the eleventh. B's F2 is still closed, and by the checks ABOVE rather than by a probe: a
  # DIRECTORY at the log path is caught by `[ ! -f "$OUT" ]`, which creates nothing. What a probe would have
  # added over that is coverage of an unwritable gates/logs, and the final write reports that loudly instead.
  # THE COMPARISON ITSELF IS snapcheck's, IN ONE PLACE, so this arm and the three early routes of the
  # acceptance block above cannot drift apart. What is left here is the mapping onto this run's exit code.
  # NEVER DOWNGRADE AN ESTABLISHED REFUSAL, and the first version of the round-3 split did exactly that - four
  # cases turned from exit 1 to exit 2 at once, because the lock arm and the write-target arm run BEFORE this
  # one and set RC=1, and `RC=2` then overwrote their verdict. A route is the WEAKER answer, so it may only
  # ever be taken from a clean slate.
  # AND THE MARKER IS SCANNED ONE LAST TIME, as D3 requires: "after each control and again at the end". A
  # control's own check (in run_ctl) can only see what has already started; a process spawned by the LAST thing
  # a control did, or one whose parent exited between the two, is only visible here.
  local survend
  survend="$(ctl_survivors)"
  if [ -n "$(printf '%s' "$survend" | tr -d '[:space:]')" ]; then
    bad "a process carrying this run's control marker is still alive at the end of the battery (pid $(printf '%s' "$survend" | tr '\n' ' '))"
    say "REFUSED: a process started by a control is STILL RUNNING after the battery (pid $(printf '%s' "$survend" | tr '\n' ' '))."
    say "  It can write into the real tree after the snapshot that is supposed to prove nothing did, so no"
    say "  verdict this run could give about the real tree would still be true a second later."
    RC=1
  fi

  snapcheck
  if [ "$SNAPRC" = 1 ]; then
    RC=1
  elif [ "$SNAPRC" = 2 ]; then
    [ "$RC" = 0 ] && RC=2
  fi

  # ── (10) THE VERDICT, WRITTEN ONCE. ─────────────────────────────────────────────────────────────────────────
  # EVERY REFUSAL PATH NOW EMITS THE `CHECKS TIER RED` TOKEN [fresh antagonist A, round 4, P3]. When FIND was
  # empty and RC was 1 - which is the lock arm, the snapshot arm and the write-target arm, i.e. three of the
  # judge's refusal paths - NEITHER branch below ran, so the log carried a bare `REFUSED:` line and no RED
  # token at all. Anything that greps for the token saw nothing on exactly the paths that matter most.
  if [ "${#FIND[@]}" -eq 0 ] && [ "$RC" = 1 ]; then
    say ""
    say "CHECKS TIER RED: the refusal above is about the state of the real tree or of this run's own log, not"
    say "  about a control's contract, so no control is listed. $CTLN control(s) ran."
  elif [ "${#FIND[@]}" -eq 0 ] && [ "$RC" = 2 ]; then
    say ""
    say "GO FULL: the route above is this run's verdict. $CTLN control(s) ran and $CTLOK met their contract."
  fi
  if [ "${#FIND[@]}" -gt 0 ]; then
    say ""
    # "N check(s)" AND NOT "N of CTLN control(s)" [fresh antagonist B, F7]. The two fastgate-drive DECL branches
    # (a repeated tc() id, a zero declared count) call `bad` WITHOUT incrementing CTLN, which is incremented only
    # on the path that actually builds a clone - so B reproduced "CHECKS TIER RED: 1 of 5 control(s) did not meet
    # their contract" where the one finding is NOT one of the five. A count against a different denominator, in
    # the headline of a refusal. FIND holds every finding and CTLN counts controls RUN; they are two quantities
    # and the line now says so instead of dividing one by the other.
    say "CHECKS TIER RED: ${#FIND[@]} check(s) did not meet their contract ($CTLN control(s) run)."
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

  # THE WRITE IS AN O_EXCL CREATE, AND THAT IS WHAT MAKES IT STRUCTURALLY UNABLE TO FOLLOW A LINK OF EITHER
  # KIND. A bare `>` truncates whatever inode the name resolves to, so a symlink writes its target and a hard
  # link writes the file that shares the inode - which is how a control replaced app.js. `set -C` makes the
  # redirection O_CREAT|O_EXCL, which FAILS on anything already at the name, a dangling symlink included: it
  # never opens somebody else's inode, because it will not open an existing one at all.
  # [FRESH ANTAGONIST A, P2(2)] THIS PARAGRAPH SAID "RENAME" UNTIL THIS COMMIT, AND THE RENAME LEFT IN THE SAME
  # DIFF THAT DELETED IT. A found six such claims, two of them in verdict text the operator reads at the moment
  # it matters. The security property a reader is told to rely on is now carried by a DIFFERENT mechanism with
  # a different failure mode - the honest-re-run `rm -f` then create is a window a rename did not have, and the
  # kind-of-thing arm above plus D4's grave clause on `gates/logs/[.]checks-*` are what cover it - so the
  # sentence had to move with the code. A measured the replacement on every path: a symlink to a victim fails
  # rc 1 with the victim untouched, a dangling symlink fails with the target still absent, and a hard link is
  # refused twice over. For the hard-link case it is STRONGER than the rename it replaced.
  # THAT PARAGRAPH USED TO END "The temporary was created and proved writable back in step (9), before the
  # verdict, so a log that cannot be written is a RED with a sentence rather than a silence after a GREEN",
  # AND IT WAS FALSE OF THIS FILE [antagonist A, P3(2), R18]. Round 4 DELETED that probe on purpose - the
  # comment fifteen lines above says so, "NO FILE IS CREATED HERE, AND MY FIRST VERSION OF THIS FIX CREATED
  # ONE" - because creating it between the two snapshots routed every honest candidate. It is the fourth time
  # a sentence in this file has survived the code it described. What IS true: a log that cannot be written is
  # still a RED with a sentence, by the branch below, which reports a failed write rather than swallowing it.
  if [ "$SELFLOGBAD" = 1 ]; then
    printf '%s\n' "  log NOT written: the write-target check above refused this path, so this run leaves no log file."
    printf '%s\n' "  The verdict above stands and is on stdout only."
    [ "$RC" = 0 ] && RC=1
  elif writelog; then
    printf '%s\n' "  log: $OUT"
  else
    # ROUND 4, D2: THE TEMPORARY IS mktemp's, IN THE PRIVATE DIRECTORY, AND THIS IS THE FIFTH ROUND'S P1(a).
    # It was `$ROOT/gates/logs/.checks-$SHORT-$$.tmp`, and BOTH components are published by this judge itself -
    # $LOCK/pid holds `$$` and $LOCK/log holds `checks-tier $SHORT` - so a control that asserted nothing
    # symlinked app.js at that name and the `>` followed it. The write-target arm checked $OUT and never
    # $LOGTMP. It landed at exit 2, a ROUTE, and afterwards the log file WAS a symlink to app.js, so `cat`ting
    # the log printed a perfect log and only `git status` said the bundle was gone.
    # AND THE TEMPORARY IS GONE ENTIRELY, WHICH IS WHY THERE IS NOTHING LEFT TO RENAME. The write is one
    # `( set -C; printf )` straight at $OUT, so no second name exists for a control to aim at and no
    # cross-filesystem fallback can open the destination path behind our back. The result is still VERIFIED
    # rather than assumed - a regular file, not a link, one link count, carrying the bytes this run wrote -
    # because a write that is verified cannot be a write that landed somewhere else.
    printf '%s\n' "CHECKS TIER RED: the verdict above could not be written to $SELFLOG as a regular file"
    printf '%s\n' "  carrying this run's own bytes, so this run leaves no auditable log. Its text is on stdout"
    printf '%s\n' "  only. A verdict nobody can re-read later is not evidence."
    RC=1
  fi
  rm -rf "$WORK" "$PRIV" 2>/dev/null
  [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
  return $RC
}

main "$@"; exit $?
