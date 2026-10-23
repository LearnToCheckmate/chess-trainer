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
  local WORK="" SNAP0="" SNAP1="" LOCK="" LOCKHELD=0

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
    say "REFUSED: the base ${BASESHA:0:12} carries no gates/checks-tier.sh, so there is no main copy to be judged by."
    return 1
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
  # SO THIS STRIP IS DELIBERATELY SIMPLER THAN A JS LEXER, AND ITS LIMIT IS STATED RATHER THAN HIDDEN: it tracks
  # only the two comment states and NOT string or regex literals, so a `//` or `/*` inside a string literal
  # over-strips the rest of that line. That direction is the safe one HERE, and only here, because a change to
  # anything in the browser read set routes to the full suite at exit 2 before this arm is reached - so this arm
  # only ever reads the BASE, which arrived through a full suite of its own. What it must never do is refuse an
  # honest tree, and over-stripping cannot.
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
      if "${GIT[@]}" cat-file blob "$BASESHA:$f" 2>/dev/null | grep -nE "child_process|execSync|spawnSync|execFile" > /dev/null 2>&1; then
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
      say "REFUSED: a gate suite or another tier run holds $LOCK (pid $holder)."
      return 1
    fi
    rm -rf "$LOCK"; mkdir "$LOCK" 2>/dev/null || { say "REFUSED: cannot create $LOCK"; return 1; }
    say "  NOTE: took over a stale lock (pid '${holder:-none}' is not running)"
  fi
  LOCKHELD=1
  printf '%s\n' "$$" > "$LOCK/pid"; date '+%Y-%m-%d %H:%M:%S %Z' > "$LOCK/started"
  printf '%s\n' "checks-tier $SHORT" > "$LOCK/log"

  snapshot(){
    # ONLY THIS RUN'S OWN LOCK AND LOG ARE EXCLUDED, BY EXACT PATH, AND THAT IS ANTAGONIST B's P3 [#535]. The
    # filter was `grep -v 'gates/logs/'`, a SUBSTRING match that dropped EVERY line mentioning that directory
    # from the whole stream. MEASURED: gates/logs/ is gitignored at gates/.gitignore:6, but
    # `git status --porcelain -uall --ignored` lists each file inside it individually ("!! gates/logs/x"), so a
    # control writing anywhere under gates/logs/ in the real tree was invisible to the comparison while this
    # script and its README both claim "any difference is exit 1" and "the real tree was not touched". A control
    # can reach the real tree because its clone's origin IS the real root. Low impact - the directory is
    # gitignored and holds no durable state - but a guarantee with a hole in it is worse than a narrower
    # guarantee, so the exclusion now names the two paths this run creates and nothing else.
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
    } | grep -vF -e "gates/logs/.suite.lock" -e "$SELFLOG" | sha256sum | cut -c1-64
  }
  SNAP0="$(snapshot)"
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
    out="$(cd "$d" && "$@" 2>&1)"; rc=$?
    local why="" okrc=0 w
    local IFSSAVE="$IFS"; IFS=','
    for w in $want; do [ "$rc" = "$w" ] && okrc=1; done
    IFS="$IFSSAVE"
    [ "$okrc" = 1 ] || why="exit $rc, wanted one of $want"
    if [ -n "$need" ] && ! grep -qF -- "$need" <<<"$out"; then
      why="${why:+$why; }its output does not carry '$need'"
    fi
    if [ -n "$forbid" ] && grep -qE -- "$forbid" <<<"$out"; then
      why="${why:+$why; }its output carries a forbidden line matching '$forbid'"
    fi
    if [ -n "$why" ]; then
      bad "$label: $why"
      say "  RED  $label - $why"
      printf '%s\n' "$out" | tail -25 | sed 's/^/        /' >> "$WORK/red-$CTLN.txt" 2>/dev/null
      LOGLINES="$LOGLINES$(printf '%s\n' "$out" | tail -25 | sed 's/^/        /')"$'\n'
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
  if [ "$DECL" -eq 0 ]; then
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
    bad "verify-log acceptance: the base carries no claude/agents/gatelogs/<N>-all.log to accept"
    say "  RED  verify-log acceptance - no archived green log on the base"
  else
    local GN
    GN="$(sed -E 's|.*/([0-9]+)[a-z]?-all\.log|\1|' <<<"$GLOG")"
    say "  acceptance log: $GLOG (build #$GN), chosen from the BASE's tree so the candidate cannot steer it"
    run_ctl "verify-log.sh (head) accepts #$GN" 0 "OK" "REFUS" -- bash gates/verify-log.sh "$GLOG" "#$GN" --this-bundle
  fi

  # EVERY NEW gates/cases/ FILE IS RUN: exit 0, at least one PASS line, no FAIL line. A control that is added and
  # never executed is the "a test in the repo that no suite runs" class, and this is the one place these run.
  local nc=0
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in *.sh) ;; *) continue;; esac
    nc=$((nc+1))
    run_ctl "new control $p" 0 "PASS" "(^|[[:space:]])FAIL" -- bash "$p"
  done <<<"$NEWFILES"
  say "  new control file(s) run: $nc"

  # ── (9) THE REAL TREE MUST BE EXACTLY AS IT WAS. ────────────────────────────────────────────────────────────
  # A11, and it is checked BEFORE the log is written, so the log itself cannot be the difference.
  SNAP1="$(snapshot)"
  if [ "$SNAP0" != "$SNAP1" ]; then
    say "REFUSED: the real tree CHANGED while the battery ran (snapshot ${SNAP0:0:16} -> ${SNAP1:0:16})."
    say "  Something a control ran wrote into the tree under judgement, moved a ref, or planted a hook or a"
    say "  config entry. A verdict about a tree that moved under the judge is worth nothing, and a planted hook"
    say "  fires at the NEXT commit, where nothing would connect it to this run."
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

  # THE SAME STRING THE SNAPSHOT EXCLUDED, so the exclusion and the write cannot drift apart.
  local OUT="$ROOT/$SELFLOG"
  printf '%s' "$LOGLINES" > "$OUT" 2>/dev/null && printf '%s\n' "  log: $OUT"
  rm -rf "$WORK" 2>/dev/null
  [ "$LOCKHELD" = 1 ] && rm -rf "$LOCK" 2>/dev/null
  return $RC
}

main "$@"; exit $?
