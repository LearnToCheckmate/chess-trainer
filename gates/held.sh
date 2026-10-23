#!/usr/bin/env bash
# gates/held.sh - write and query gates/held-trees.tsv, the register of gated-green trees that must not ship.
#
# WHY A SCRIPT AND NOT JUST "APPEND A LINE". Because the line gets appended at the wrong moment or not at all.
# #441 stood down on two P0s, wrote one sentence into a prose RUN-LOG cell on a branch that never merged, and
# the next run pushed that exact tree on four green checks. The whole value of the register is that a row is
# written AT THE MOMENT OF THE STAND-DOWN, in the same step, and committed to MAIN. One command makes that
# cheap enough that there is no excuse; `check` makes asking the question cheap too.
#
#   gates/held.sh check [<bundleMd5-or-sha>]   is this tree held? With no argument, md5sum app.js on disk.
#                                              exit 0 = not held, exit 1 = HELD (prints the row), 2 = usage.
#   gates/held.sh add <bundleMd5> <gatedSha> <#NNN> <reason...>    append a row. Refuses a duplicate.
#   gates/held.sh add sha-only <gatedSha> <#NNN> <reason...>   a SHA-ONLY hold [#529]: for a run that changed
#                                              no application file, so its bundle is main's own. Field 1 is the
#                                              literal `sha-only`: the row stays LIVE and matches no bundle md5.
#                                              Field 7, the sourceMd5, IS COMPUTED - `git show <gatedSha>:chess.jsx
#                                              | md5sum | cut -c1-12`. You do not add it by hand. CT_SRCMD5
#                                              overrides it; `add` says which tree it used, every time.
#   gates/held-selftest.sh                     the controls for this file. Not a gate; runs in about a second.
#   gates/held.sh selftest                     the same thing, for a caller that only knows this file's name.
#   gates/held.sh list                         every live row, reason IN FULL. Cleared rows (the '-' prefix)
#                                              are listed separately below them, not mixed in.
#
# THE REASON IS NOT OPTIONAL AND IS NOT "see the run report". It is the specific thing the suite could not see,
# because the next reader's whole decision turns on it. A row whose reason is a pointer is a row that sends the
# next run back to the prose this file exists to replace.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REG="$HERE/held-trees.tsv"; ROOT="$(cd "$HERE/.." && pwd)"
# THIS GUARD USED TO `exit 2` HERE, BEFORE HEAD WAS EVER CONSULTED, AND THAT IS HALF OF A BLOCKER
# [#534, fresh antagonist B's VETO]. With `gates/held-trees.tsv` deleted and not committed, `check` answered
# exit 2 ("no register") while HEAD's copy still carried every live row - so the question the build procedure
# is required to ask had NO ANSWERER, and verify-log.sh in the same state answered OK at exit 0. Two tools
# disagreeing about one register in opposite directions is the shape this file already records as #450's
# worst. The file is still REQUIRED for the verbs that WRITE it; `check` is a READ and HEAD can serve it.
HELD_REGOK=0; { [ -f "$REG" ] && [ -r "$REG" ]; } && HELD_REGOK=1

# TWO ROW FILTERS, AND ANTAGONIST A ON #450 FOUND WHY ONE IS NOT ENOUGH. `live_rows` required NF>=6, so a row
# missing its reason made verify-log.sh REFUSE (exit 1) while `held.sh check` answered "not held" (exit 0) - the
# documented query tool disagreeing with the enforcing tool about the same register, which is worse than either
# verdict alone. match_rows keeps only what the MATCH needs (two keys); live_rows stays for `list`, where a row
# with no reason is a defect worth seeing.
# ── BOTH FILTERS READ THE UNION OF HEAD'S REGISTER AND THE WORKING TREE'S [#534, HELDWT;
# jobs/verify-log-sh-and-held-sh-read-the-held-register-from-the-working-tree-so-one-uncommitted-line-deletion-clears-a-held-refusal-2026-10-22,
# routed from #531's antagonist B]. MEASURED on a clone of 707599b before the fix: `held.sh check 81dc0469862c`
# answers HELD at exit 1, and with that row deleted from the working tree AND NOT COMMITTED it answers
# "not held" at exit 0 - so one uncommitted line deletion cleared the hold, and the identical edit cleared
# gates/verify-log.sh at the same time.
# A UNION AND NOT JUST HEAD'S COPY, for the reason verify-log.sh records at length: a row `add` has only just
# written is not yet committed, and the #450 stand-down writes exactly such a row and then cites it. Reading
# HEAD alone would make this tool blind to a hold a standing-down run had just recorded. The union refuses both
# ways: an uncommitted deletion or '-' clear cannot lift a hold live in HEAD, and an uncommitted addition holds
# at once. gates/fastgate.sh:1139 is the model - it already reads this register with `git show`.
# --git-dir AND --work-tree ARE SET EXPLICITLY, because an inherited GIT_DIR overrides `git -C`.
HELD_SRC="working tree only"
REGALL="$REG"
# ARMED BEFORE THE FIRST mktemp, so there is no window in which a temp file exists and the trap does not
# [#534, antagonist A's P3-1: measured 2 leaked files per invocation, and /tmp on that container already held
# 2662 tmp.* files. `held.sh check` is a documented per-run step, so the leak is per run and not per session].
# The :- guards matter: this fires on paths where neither variable was ever set, under `set -u`.
trap 'rm -f "${HELD_HEADREG:-}" "${HELD_UNION:-}"' EXIT
# A KEY YOU COULD NOT ASK IS REPORTED, NEVER CREDITED [#534, third-round antagonist A's P1-2]. Both this tool
# and verify-log.sh read HEAD's copy of the register through a `mktemp` file, and an EMPTY mktemp result was
# treated as "HEAD has no register" - so one unwritable TMPDIR silently reverted the whole HELDWT fix in both
# tools: with the live row deleted from the working tree and nothing committed, `held.sh check` answered
# "not held" at exit 0 and verify-log.sh answered `OK:` at exit 0, while HEAD held every live row one
# `git show` away. Worse, the source line then ASSERTED "HEAD holds no gates/held-trees.tsv", which is a wrong
# reason reaching a wrong verdict in the very field added so a reader could tell the sources apart. This
# container state is real, not hypothetical - gates.sh's own comments record a door running under an
# unwritable TMPDIR. So mktemp failure is now a THIRD STATE: not "HEAD has none", but "HEAD could not be
# asked", which can never be reported as a clear.
HELD_UNKNOWN=0; HELD_UNKNOWN_WHY=""
HELD_GIT=(git --git-dir "$ROOT/.git" --work-tree "$ROOT")
if command -v git >/dev/null 2>&1 && "${HELD_GIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HELD_HEADREG="$(mktemp 2>/dev/null || true)"
  if [ -z "$HELD_HEADREG" ] && "${HELD_GIT[@]}" cat-file -e HEAD:gates/held-trees.tsv 2>/dev/null; then
    HELD_UNKNOWN=1
    HELD_UNKNOWN_WHY="HEAD carries gates/held-trees.tsv but no temporary file could be created to read it (mktemp failed - an unwritable or missing TMPDIR), so HEAD's rows were NOT consulted"
  fi
  if [ -n "$HELD_HEADREG" ] && "${HELD_GIT[@]}" show HEAD:gates/held-trees.tsv > "$HELD_HEADREG" 2>/dev/null && [ -s "$HELD_HEADREG" ]; then
    if [ "$HELD_REGOK" = "1" ]; then
      HELD_UNION="$(mktemp 2>/dev/null || true)"
      if [ -n "$HELD_UNION" ] && cat "$REG" "$HELD_HEADREG" > "$HELD_UNION" 2>/dev/null; then
        REGALL="$HELD_UNION"; HELD_SRC="HEAD and the working tree"
      fi
    else
      # THE LIMB THE VETO WAS ABOUT: no readable working-tree copy, HEAD's copy readable, so the question is
      # still asked against HEAD alone and the answer still binds.
      REGALL="$HELD_HEADREG"
      HELD_SRC="HEAD ONLY - there is NO readable working-tree copy of gates/held-trees.tsv, which is a deleted file or a stale checkout and NOT an empty register, so an uncommitted deletion lifts nothing"
    fi
  else
    [ -z "${HELD_HEADREG:-}" ] || rm -f "$HELD_HEADREG"
    HELD_SRC="working tree only (HEAD holds no gates/held-trees.tsv)"
  fi
else
  HELD_SRC="working tree only (not a git work tree), sha256 $(sha256sum "$REG" 2>/dev/null | cut -c1-16)"
fi
# NOW refuse, for the verbs that genuinely need the working-tree file, and only if HEAD cannot serve the read.
if [ "$HELD_REGOK" != "1" ] && [ "$REGALL" = "$REG" ]; then
  echo "held.sh: no readable register at $REG, and HEAD holds no usable gates/held-trees.tsv either."
  echo "  That is a stale checkout or a deleted file, NOT an empty register: this tool cannot tell you"
  echo "  whether a previous run refused this tree, so treat the answer as UNKNOWN rather than as 'not held'."
  exit 2
fi
case "${1:-}" in
  add|clear|retire)
    if [ "$HELD_REGOK" != "1" ]; then
      echo "held.sh: $1 writes the register, so it needs the working-tree copy at $REG, which is missing or"
      echo "  unreadable. HEAD's copy is being used for READS this run ($HELD_SRC). Restore the file first:"
      echo "    git checkout -- gates/held-trees.tsv"
      exit 2
    fi ;;
esac
# WHICH REGISTER CARRIED THE ROW. THE REFUSAL BRANCHES WERE THE ONLY ONES NOT SAYING [#534, antagonist A's
# P2-2]. The union's provenance was printed on the "not held" line - the answer nobody acts on - and withheld
# from the two answers that STOP A PUSH, so a reader staring at a refusal had no way to tell a live hold from a
# row that exists only in HEAD. That second state is reachable and ordinary: `git reset --soft HEAD~1` to redo
# a commit leaves HEAD ahead of the working tree, and a hold cleared in BOTH the working tree and the redone
# commit still refuses until it is committed again (A's P2-3, which fails CLOSED and is a known limit on this
# job rather than a defect this run widens scope to fix). Naming the source is what makes that state legible
# instead of baffling, which is why it ships with the refusal and not only with the pass.
held_whence() { # held_whence <the matched row>
  local r="$1" inwt=0 inhead=0
  grep -Fxq "$r" "$REG" 2>/dev/null && inwt=1
  [ -n "${HELD_HEADREG:-}" ] && [ -s "${HELD_HEADREG:-}" ] && grep -Fxq "$r" "$HELD_HEADREG" 2>/dev/null && inhead=1
  if [ "$inwt" = 1 ] && [ "$inhead" = 1 ]; then printf '  source: this row is live in BOTH HEAD and the working tree (register source: %s)\n' "$HELD_SRC"
  elif [ "$inwt" = 1 ];                    then printf '  source: this row is live in the WORKING TREE (register source: %s)\n' "$HELD_SRC"
  elif [ "$inhead" = 1 ];                  then printf '  source: this row is live in HEAD ONLY - the working tree does not carry it. If you cleared or\n          deleted it and have not committed that, COMMIT IT and re-run; the union reads HEAD too, by\n          design, so an uncommitted clear cannot lift a hold (register source: %s)\n' "$HELD_SRC"
  else                                          printf '  source: register source %s (the matched row could not be located in either copy, which should not\n          happen; report it rather than acting on it)\n' "$HELD_SRC"
  fi; }
# <key>: the human name this run asked that key under ("app.js on disk -> md5 ...", "git rev-parse HEAD -> ..."),
# or the bare key if it was not one of the asked set. With three keys in play, "HELD: <12 hex> matches a row" does
# not tell a reader WHICH question found the row, and that is the first thing they need in order to act on it.
held_keyname() {
  local k="$1" a
  for a in "${HELD_ASKED[@]:-}"; do case "$a" in *"$k"*) printf '%s' "$a"; return 0;; esac; done
  printf '%s' "$k"
}
match_rows() { grep -v '^[[:space:]]*#' "$REGALL" | awk -F'\t' 'NF>=2 && $1 !~ /^-/'; }
live_rows()  { grep -v '^[[:space:]]*#' "$REGALL" | awk -F'\t' 'NF>=6 && $1 !~ /^-/'; }

case "${1:-}" in
  check)
    # ── THE NO-KEY FORM ASKS EVERY KEY A LIVE ROW CAN CARRY (#537, the HELDKEY job) ────────────────────────────
    # THE DEFECT, measured in a scratch clone at 6fcbca5 (#523's own held tree) with main ed65bab's held.sh and
    # held-trees.tsv in the working tree: `bash gates/held.sh check` printed "no key given, using app.js on disk
    # -> md5 ec31de9fe6c5" and then "not held" AT EXIT 0, while `bash gates/held.sh check "$(git rev-parse HEAD)"`
    # read HELD for row #523 at exit 1. Same tree, same register, opposite verdicts, and the form that answered
    # "not held" is THE ONE CLAUDE.md PRESCRIBES BEFORE A PUSH.
    # WHY, and it is arithmetic rather than bad luck: the no-key form computed exactly ONE key, an md5 of app.js.
    # The three newest holds (#523, #524, #525) are SHA-ONLY rows - field 1 is the literal "sha-only", which the
    # matcher below deliberately skips as a bundle key (#529), and field 2 is a git sha. An md5 is never equal to
    # a git sha, so those rows were unreachable from the default form no matter what tree it ran in. Sha-only is
    # the SANCTIONED form for a harness-only hold, which is what most gate runs now are, so the class the
    # prescribed check could not see was the NORMAL class, not an edge.
    # SO THE DEFAULT NOW ASKS THREE KEYS instead of one, and the one-key form is UNTOUCHED: a caller that names
    # its key gets exactly the verdicts it got before, which is what the job asks for, and that is also why
    # chess.jsx-at-HEAD below is added ONLY to the default - adding it to the named form could turn one of its
    # "not held" answers into HELD BY SOURCE, which would be a change to a form the job says to keep.
    # A KEY IT COULD NOT ASK IS REPORTED AND NEVER CREDITED, which is this file's own rule from #534's third-round
    # antagonist A (see the HELD_HEADREG block above): outside a git work tree there is no HEAD, and that is
    # printed rather than silently treated as a key that missed.
    KEY="${2:-}"
    HELD_KEYS=(); HELD_ASKED=(); HELD_MISSED=()
    if [ -n "$KEY" ]; then
      HELD_KEYS+=("$(printf '%s' "$KEY" | tr 'A-F' 'a-f')")
      HELD_ASKED+=("the key you named -> $KEY")
    else
      HK="$(md5sum "$ROOT/app.js" 2>/dev/null | cut -c1-12)"
      if [ -n "$HK" ]; then HELD_KEYS+=("$(printf '%s' "$HK" | tr 'A-F' 'a-f')"); HELD_ASKED+=("app.js on disk -> md5 $HK")
      else HELD_MISSED+=("app.js on disk (cannot read $ROOT/app.js)"); fi
      if command -v git >/dev/null 2>&1 && "${HELD_GIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        HH="$("${HELD_GIT[@]}" rev-parse HEAD 2>/dev/null || true)"
        if [ -n "$HH" ]; then HELD_KEYS+=("$(printf '%s' "$HH" | tr 'A-F' 'a-f')"); HELD_ASKED+=("git rev-parse HEAD -> $HH")
        else HELD_MISSED+=("HEAD's sha (git rev-parse HEAD gave nothing - an unborn branch?)"); fi
      else
        HELD_MISSED+=("git rev-parse HEAD (not a git work tree, so there is no HEAD to ask)")
      fi
      if [ "${#HELD_KEYS[@]}" -eq 0 ]; then
        echo "held.sh check: no key given and NOT ONE key could be computed here, so this is not a 'not held'."
        printf '  could not ask: %s\n' "${HELD_MISSED[@]}"
        echo "  Name a key explicitly: gates/held.sh check <bundle md5 | sha>"
        exit 2
      fi
      echo "held.sh check: no key given, asking every key a live row can carry:"
      printf '  asked: %s\n' "${HELD_ASKED[@]}"
      # The "could NOT ask" list is printed ONCE, below, after the source keys are collected - not here. It can
      # still GROW at that point (chess.jsx on disk or at HEAD may be unreadable), so printing it here as well
      # emitted the same line twice. My own control 12d caught that by counting the line and measuring 2.
      KEY="${HELD_KEYS[0]}"
    fi
    # Field 2 is a COMMA-SEPARATED list of every sha that names the tree, not just the gated one. Antagonist B
    # found why: with only #441's gated sha on the row, `check e765135` - the sha actually pushed and reverted -
    # answered "not held, exit 0". Also guards a key under 8 hex, which as a prefix test would match everything.
    KEY="$(printf '%s' "$KEY" | tr 'A-F' 'a-f')"
    # THE MATCHER IS UNCHANGED; WHAT CHANGED IS THAT IT IS ASKED ONCE PER KEY. The first key that matches wins
    # and HELD_HITKEY records which one did, so the verdict says WHICH key found the row rather than leaving a
    # reader to guess - with three keys in play, "HELD: <key> matches" is ambiguous unless the key is named.
    HIT=""; HELD_HITKEY=""
    for HELD_K in "${HELD_KEYS[@]}"; do
      HIT="$(match_rows | awk -F'\t' -v k="$HELD_K" '
        { m=tolower($1); gsub(/[ \r]/,"",m)
          if (m != "sha-only" && length(m)>=8 && length(m)<=12 && substr(k,1,length(m))==m) { print; exit }   # sha-only is no bundle key [#529]
          n=split(tolower($2), SH, ",")
          for (i=1;i<=n;i++) { gsub(/[ \r]/,"",SH[i])
            if (length(SH[i])>=7 && (SH[i]==k || substr(SH[i],1,7)==substr(k,1,7))) { print; exit } } }')"
      if [ -n "$HIT" ]; then HELD_HITKEY="$HELD_K"; KEY="$HELD_K"; break; fi
    done
    # THE SOURCE KEY. bundleMd5 and gatedSha both identify an ARTEFACT: gates/build.sh embeds a minute-resolution
    # timestamp in the stamp, so a REBUILD of a held source tree gets a fresh md5 and a fresh sha and matches
    # neither. This is the one place that can close that, because it is the one place that looks at the WORKING
    # TREE rather than at a log. Checked only when the first two keys missed, so a direct hit still reports as one.
    # THE SOURCE KEYS. chess.jsx ON DISK is unchanged and is asked in BOTH forms, exactly as before. chess.jsx
    # AT HEAD is new and is asked ONLY when no key was named: it is a second source key, and adding it to the
    # named form could turn one of that form's "not held" answers into HELD BY SOURCE, which the job says to
    # leave alone. It catches the tree whose working copy has moved on but whose COMMIT is the held source.
    HELD_SRCKEYS=(); HELD_SRCNAMES=()
    if [ -r "$ROOT/chess.jsx" ]; then
      HELD_SRCKEYS+=("$(md5sum "$ROOT/chess.jsx" | cut -c1-12)"); HELD_SRCNAMES+=("chess.jsx on disk")
    else
      [ -n "${2:-}" ] || HELD_MISSED+=("chess.jsx on disk (cannot read $ROOT/chess.jsx)")
    fi
    if [ -z "${2:-}" ]; then
      if command -v git >/dev/null 2>&1 && "${HELD_GIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        HSH="$("${HELD_GIT[@]}" show HEAD:chess.jsx 2>/dev/null | md5sum | cut -c1-12 || true)"
        if "${HELD_GIT[@]}" cat-file -e HEAD:chess.jsx 2>/dev/null && [ -n "$HSH" ]; then
          HELD_SRCKEYS+=("$HSH"); HELD_SRCNAMES+=("chess.jsx at HEAD")
        else
          HELD_MISSED+=("chess.jsx at HEAD (HEAD carries no chess.jsx)")
        fi
      fi
    fi
    if [ -z "${2:-}" ]; then
      # `"${!ARR[@]:-}"` is INDIRECT EXPANSION and not "indices, or nothing": bash reads the array's VALUES as a
      # variable name and dies with "invalid variable name". Measured here - my own draft of this loop did it and
      # broke nine assertions in this file's section 12 at once. The count guard is the idiom that works.
      if [ "${#HELD_SRCKEYS[@]}" -gt 0 ]; then
        for __i in "${!HELD_SRCKEYS[@]}"; do
          printf '  asked: %s -> md5 %s\n' "${HELD_SRCNAMES[$__i]}" "${HELD_SRCKEYS[$__i]}"
          HELD_ASKED+=("${HELD_SRCNAMES[$__i]} -> md5 ${HELD_SRCKEYS[$__i]}")
        done
      fi
      # ONCE, and only here, because this is the first point at which the list is complete.
      [ "${#HELD_MISSED[@]}" -eq 0 ] || printf '  could NOT ask: %s\n' "${HELD_MISSED[@]}"
    fi
    if [ -z "$HIT" ] && [ "${#HELD_SRCKEYS[@]}" -gt 0 ]; then
      SRC=""; HELD_SRCWHICH=""
      for __i in "${!HELD_SRCKEYS[@]}"; do
        SRC="${HELD_SRCKEYS[$__i]}"
        HIT="$(match_rows | awk -F'\t' -v s="$SRC" '{ if (NF>=7) { p=tolower($7); gsub(/[ \r]/,"",p); if (p != "-" && length(p)>=8 && length(p)<=12 && substr(s,1,length(p))==p) { print; exit } } }')"
        if [ -n "$HIT" ]; then HELD_SRCWHICH="${HELD_SRCNAMES[$__i]}"; break; fi
      done
      if [ -n "$HIT" ]; then
        echo "  (the source key that matched was: $HELD_SRCWHICH)"
        echo "HELD BY SOURCE: chess.jsx on disk is md5 $SRC, which matches a held row's sourceMd5."
        echo "  The BUNDLE md5 and the gated sha did NOT match, so this is a REBUILD of a held source tree -"
        echo "  a new artefact built from source a previous run refused to ship. That is the one evasion the"
        echo "  other two keys cannot see; see the note in held-trees.tsv."
        printf '  build:  %s   held at %s by %s\n' "$(printf '%s' "$HIT" | cut -f3)" "$(printf '%s' "$HIT" | cut -f4)" "$(printf '%s' "$HIT" | cut -f5)"
        printf '  why:    %s\n' "$(printf '%s' "$HIT" | cut -f6)"
        held_whence "$HIT"
        exit 1
      fi
    fi
    if [ -n "$HIT" ]; then
      echo "HELD: $KEY matches a row on the register."
      [ -z "$HELD_HITKEY" ] || printf '  the key that matched: %s\n' "$(held_keyname "$HELD_HITKEY")"
      printf '  build:  %s   held at %s by %s\n' "$(printf '%s' "$HIT" | cut -f3)" "$(printf '%s' "$HIT" | cut -f4)" "$(printf '%s' "$HIT" | cut -f5)"
      printf '  bundle: %s   gated sha: %s\n' "$(printf '%s' "$HIT" | cut -f1)" "$(printf '%s' "$HIT" | cut -f2)"
      printf '  why:    %s\n' "$(printf '%s' "$HIT" | cut -f6)"
      held_whence "$HIT"
      exit 1
    fi
    if [ "${HELD_UNKNOWN:-0}" = "1" ]; then
      echo "UNKNOWN: $KEY matched no row of the register THAT THIS RUN COULD READ, and one source could not be read."
      echo "  $HELD_UNKNOWN_WHY."
      echo "  That is NOT the same answer as 'not held', and this tool will not give you the clear one."
      echo "  Rows actually consulted: $(match_rows | wc -l | tr -d ' ') (source: $HELD_SRC)."
      echo "  Fix the temporary directory (TMPDIR) and re-run, or read gates/held-trees.tsv at HEAD by hand."
      exit 2
    fi
    # THE VERDICT NAMES HOW MANY KEYS IT ASKED. Before this, the default form printed one key and "not held",
    # which reads as "I asked the question" when it had asked one of four. A negative that does not say what it
    # covered is the thing R18 calls an unmeasured claim, and this is the line a run reads before a push.
    # THE VERDICT SAYS HOW MANY KEYS IT ASKED, AND STAYS ONE CLAIM LONG. Before this, the default form printed
    # one key and "not held", which reads as "I asked the question" when it had asked one of four. A negative
    # that does not say what it covered is the unmeasured claim R18 is about, and this is the line a run reads
    # before a push. The keys themselves are listed above, so they are not repeated into this line.
    if [ "${#HELD_ASKED[@]}" -gt 1 ]; then
      echo "not held: no live row of $(basename "$REG") matches ANY of the ${#HELD_ASKED[@]} key(s) asked above ($(match_rows | wc -l | tr -d ' ') matchable row(s) checked; source: $HELD_SRC)"
    else
      echo "not held: $KEY is on no live row of $(basename "$REG") ($(match_rows | wc -l | tr -d ' ') matchable row(s) checked; source: $HELD_SRC)"
    fi
    exit 0 ;;
  add)
    MD5="${2:-}"; SHA="${3:-}"; BUILD="${4:-}"; shift 4 2>/dev/null || true; REASON="${*:-}"
    if [ -z "$MD5" ] || [ -z "$SHA" ] || [ -z "$BUILD" ] || [ -z "$REASON" ]; then
      echo "usage: gates/held.sh add <bundleMd5> <gatedSha> <#NNN> <reason...>"; exit 2; fi
    case "$BUILD" in \#[0-9][0-9][0-9]|\#[0-9][0-9][0-9][0-9]) ;; *) echo "held.sh add: build must look like #NNN, got '$BUILD'"; exit 2;; esac
    if [ "${#REASON}" -lt 40 ]; then
      echo "held.sh add: the reason is $((${#REASON})) characters. Name the specific thing the suite could not"
      echo "  see - that is the next reader's whole decision. A pointer to a run report is what this replaces."; exit 2; fi
    # VALIDATE BOTH KEYS. `add` policed the build token and a 40-char reason floor and NOTHING about either key,
    # so antagonist A got it to accept a 32-char md5, an UPPERCASE md5 and a 1-char md5 - every one a row that
    # `list` shows as live and that can never match anything.
    # A SHA-ONLY HOLD IS THE ONE SANCTIONED FIELD 1 THAT IS NOT AN MD5 [#529, jobs/the-held-register-cannot-express-a-harness-only-hold-because-all-three-of-its-keys-identify-an-artefact-2026-10-15].
    # Every key here identifies an ARTEFACT, and a run that changes only gates/ shares its artefact with main:
    # #523 made no application change, so its bundle md5 was exactly what origin/main serves, and a truthful
    # row would have made `check` answer HELD for main's own bundle and verify-log.sh refuse every later log
    # over it. The only escape was a typed-wrong field (the gated sha's first twelve characters in the bundle
    # column, which #523, #524 and #525 all used), and a '-' prefix would have CLEARED the row and disarmed
    # the sha key with it. So: the exact lowercase literal `sha-only`, compared BEFORE any case folding, so
    # `SHA-ONLY` or `sha_only` is still a non-hex md5 and is refused. It does not start with '-', so
    # match_rows keeps the row live; it is eight characters, so verify-log.sh's 8 to 12 bound counts it well
    # formed; and no hex md5 can start with it, so no bundle ever matches it. `check` skips it as a bundle
    # key by name and `list` says what it is. gates/held-selftest.sh case 9 is the control.
    SHAONLY=0; [ "$MD5" = "sha-only" ] && SHAONLY=1
    SHA="$(printf '%s' "$SHA" | tr 'A-F' 'a-f')"
    [ "$SHAONLY" = 1 ] || MD5="$(printf '%s' "$MD5" | tr 'A-F' 'a-f')"
    [ "$SHAONLY" = 1 ] || case "$MD5" in *[!0-9a-f]*) echo "held.sh add: bundle md5 '$MD5' is not hex (a hold with no bundle key is written as the literal sha-only)"; exit 2;; esac
    if [ "$SHAONLY" = 0 ] && { [ "${#MD5}" -lt 8 ] || [ "${#MD5}" -gt 12 ]; }; then
      echo "held.sh add: bundle md5 '$MD5' is ${#MD5} chars. gates.sh writes 12 (\`md5sum app.js | cut -c1-12\`)."
      echo "  Anything outside 8-12 can never prefix-match a log's md5, so the row would look live and match nothing."; exit 2; fi
    for one in $(printf '%s' "$SHA" | tr ',' ' '); do
      case "$one" in *[!0-9a-f]*) echo "held.sh add: sha '$one' is not hex"; exit 2;; esac
      [ "${#one}" -ge 7 ] || { echo "held.sh add: sha '$one' is under 7 chars"; exit 2; }
    done
    case "$REASON" in *"	"*) echo "held.sh add: the reason contains a TAB, which would truncate it at the field break"; exit 2;; esac
    # DUPLICATE CHECK WITHOUT grep -x: A found that a '-'-prefixed md5 made `grep -qx "$MD5\t$SHA"` parse the
    # pattern as an option ("grep: invalid option -- '\t'"), print a usage dump, AND APPEND THE ROW ANYWAY,
    # since there is no `set -e`. A trust tool printing an error and then succeeding is the wrong-reason shape.
    if match_rows | cut -f1,2 | awk -v a="$MD5" -v b="$SHA" -F'\t' '$1==a && $2==b {found=1} END{exit !found}'; then
      echo "held.sh add: that bundle and sha are already on the register"; exit 1; fi
    if [ -z "${CT_RUNID:-}" ]; then
      echo "held.sh add: CT_RUNID is not set, so this row would be attributed to 'unknown-run'. A hold whose"
      echo "  author cannot be traced is half a record. Re-run as: CT_RUNID=<your runId> gates/held.sh add ..."
      exit 2
    fi
    # ==== FIELD 7, THE SOURCE KEY. IT IS COMPUTED HERE AND IT IS COMPUTED FROM THE GATED SHA. ====
    # This arm used to write "${CT_SRCMD5:--}" - i.e. '-' unless an operator remembered an environment variable -
    # and the header above used to tell the operator to fill it in afterwards. MEASURED on main at 2bb09bf over
    # the 12 rows of held-trees.tsv with NF>=6: ONE (bundle e7d0499e886b) has field 7 = '-'. One is better than
    # the two this defect was filed on, and it is still the one key that survives a REBUILD being opt-in:
    # gates/build.sh embeds a minute-resolution stamp, so a rebuild of a held source tree gets a fresh bundle md5
    # AND a fresh sha and matches neither of the first two keys. An opt-in guard is the guard that is not there.
    #
    # AND IT IS THE GATED SHA, NOT THE WORKING TREE, WHICH IS THE OPPOSITE OF WHAT THE FILED JOB PRESCRIBED.
    # jobs/held-sh-add-leaves-the-only-rebuild-proof-key-empty-2026-10-02 asks for `md5sum $ROOT/chess.jsx`.
    # #463 shipped exactly that and its own antagonist measured it as an ACTIVE INVERSION OF BOTH POLARITIES:
    # build V1, gate it, take a veto, edit to V2, stand down, add - and field 7 names V2. A later run rebuilds
    # V1, gets a fresh bundle md5 in a new minute, and `check` says NOT HELD: the refused tree ships. Meanwhile
    # the never-gated V2 gets HELD BY SOURCE: a false hold on a tree nobody ever refused. The edit-then-stand-down
    # sequence is not exotic - #459, #461 and #463 all ran it.
    #
    # THE DECIDING CONSUMER IS NOT THIS FILE. gates/verify-log.sh takes the same key as
    # `git show "$LOGSHAH:chess.jsx" | md5sum | cut -c1-12` at the door that authorises a push, and `list` has
    # printed the label "(chess.jsx at that sha)" all along. Two readers, one key: a row written from the working
    # tree can never match either of them, so the working-tree default silently disarms the push gate's source
    # refusal. Measured by the same antagonist over the live register: 7 of 8 rows then, 11 of 12 now, carry the
    # gated-sha form. This is the register's established semantics and it is now what `add` writes.
    SRC7=""; SRC7_HOW=""
    if [ -n "${CT_SRCMD5:-}" ]; then
      SRC7="$(printf '%s' "$CT_SRCMD5" | tr 'A-F' 'a-f')"
      # AN OVERRIDE IS VALIDATED LIKE AN ARGUMENT. '-' stays legal: it is how an operator says "this hold has no
      # source key", which clause 4 below also writes, and refusing it would make the honest answer unsayable.
      if [ "$SRC7" != "-" ]; then
        case "$SRC7" in *[!0-9a-f]*) echo "held.sh add: CT_SRCMD5 '$CT_SRCMD5' is not hex"; exit 2;; esac
        if [ "${#SRC7}" -lt 8 ] || [ "${#SRC7}" -gt 12 ]; then
          echo "held.sh add: CT_SRCMD5 '$CT_SRCMD5' is ${#SRC7} chars. verify-log.sh compares 12"
          echo "  (\`git show <sha>:chess.jsx | md5sum | cut -c1-12\`), so anything outside 8-12 matches nothing."
          exit 2; fi
      fi
      SRC7_HOW="CT_SRCMD5, given explicitly"
    else
      # CLAUSE: A COMMA-SEPARATED SHA LIST IS REFUSED RATHER THAN GUESSED. Row 1 of the register (#441's) carries
      # two shas, and a row covering two shas covers two trees - which have two different chess.jsx and therefore
      # two different keys. Picking the first silently is the kind of guess this register exists to remove.
      case "$SHA" in *,*)
        echo "held.sh add: the sha argument names more than one commit ('$SHA'), so there is no single"
        echo "  chess.jsx to key field 7 from - two shas are two trees. Either add one row per tree, or say"
        echo "  which source you mean: CT_SRCMD5=\$(git show <the gated sha>:chess.jsx | md5sum | cut -c1-12)"
        echo "  gates/held.sh add ...   (CT_SRCMD5=- is legal and records that this hold has no source key.)"
        exit 2;; esac
      DISKSRC=""; [ -r "$ROOT/chess.jsx" ] && DISKSRC="$(md5sum "$ROOT/chess.jsx" | cut -c1-12)"
      if git -C "$ROOT" cat-file -e "$SHA^{commit}" 2>/dev/null; then
        SRC7="$(git -C "$ROOT" show "$SHA:chess.jsx" 2>/dev/null | md5sum 2>/dev/null | cut -c1-12)"
        if [ -z "$SRC7" ] || [ "$SRC7" = "d41d8cd98f00" ]; then
          # The sha exists but carries no chess.jsx (d41d8cd98f00 is md5 of nothing, which is what a failed
          # `git show` pipes into md5sum - and `set -o pipefail` cannot be relied on to notice inside $( )).
          SRC7="${DISKSRC:--}"; SRC7_HOW="the WORKING TREE: $SHA has no readable chess.jsx"
        else
          SRC7_HOW="chess.jsx at the gated sha $SHA"
          # CLAUSE: WARN LOUDLY WHEN DISK AND GATED SHA DISAGREE. That disagreement is the mechanical tell that
          # the gate-then-edit-then-stand-down sequence happened, and it is the one moment the operator has to
          # choose which tree the row is about. It is a warning and not a refusal: the gated sha is the right
          # default and the row is still correct, but a silent default here is how #463 got it backwards.
          if [ -n "$DISKSRC" ] && [ "$DISKSRC" != "$SRC7" ]; then
            echo "held.sh add: WARNING - chess.jsx ON DISK is md5 $DISKSRC but at the gated sha $SHA it is $SRC7."
            echo "  The working tree is NOT the tree you gated, which means this run edited chess.jsx after its"
            echo "  gating run. Field 7 is written from the GATED SHA ($SRC7), because that is the tree the other"
            echo "  two keys and the reason string are about, and the only form gates/verify-log.sh can match."
            echo "  If you meant to hold the tree on disk instead, re-run with CT_SRCMD5=$DISKSRC."
          fi
        fi
      else
        SRC7="${DISKSRC:--}"
        SRC7_HOW="the WORKING TREE: $SHA is not a commit in this clone"
        echo "held.sh add: NOTE - '$SHA' is not a commit in this clone (a shallow clone is normal here), so"
        echo "  field 7 is md5 of chess.jsx ON DISK ($SRC7) rather than at that sha. If the two trees differ,"
        echo "  this key names the wrong one; fetch the sha, or pass CT_SRCMD5 explicitly."
      fi
      # CLAUSE: A KEY EQUAL TO MAIN'S OWN chess.jsx IS WRITTEN AS '-', LOUDLY. Found by #463 trying to write its
      # own row and not by either antagonist. On a HARNESS-ONLY hold there is no held source: chess.jsx is
      # byte-identical to main's, so this key would make `check` print HELD BY SOURCE for every future tree built
      # from main's chess.jsx - including every later harness-only build - until somebody noticed and cleared the
      # row. A guard that refuses main is worse than a guard that refuses nothing, so the honest answer is '-'
      # and a sentence saying what was lost. The first two keys still hold the row; only the rebuild key is gone.
      if [ "$SRC7" != "-" ]; then
        MAINSRC=""
        for R in origin/main main origin/HEAD; do
          if git -C "$ROOT" cat-file -e "$R^{commit}" 2>/dev/null; then
            MAINSRC="$(git -C "$ROOT" show "$R:chess.jsx" 2>/dev/null | md5sum 2>/dev/null | cut -c1-12)"
            [ -n "$MAINSRC" ] && [ "$MAINSRC" != "d41d8cd98f00" ] && break
            MAINSRC=""
          fi
        done
        if [ -n "$MAINSRC" ] && [ "$SRC7" = "$MAINSRC" ]; then
          echo "held.sh add: field 7 written as '-'. The source key computed to $SRC7, which is main's OWN"
          echo "  chess.jsx, so this is a HARNESS-ONLY hold and there is no held source to key on. Writing it"
          echo "  would make \`check\` report HELD BY SOURCE for every future tree built from main - including"
          echo "  every later harness-only build. THE ROW LOSES ITS REBUILD-PROOF KEY and keeps the other two:"
          echo "  a rebuild of this bundle in a new minute will NOT be caught. Say so in the reason if it matters."
          SRC7="-"; SRC7_HOW="'-', because the computed key equalled main's own chess.jsx"
        fi
      fi
    fi
    [ -n "$SRC7" ] || SRC7="-"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$MD5" "$SHA" "$BUILD" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "$REASON" "$SRC7" >> "$REG"
    echo "held.sh: field 7 (sourceMd5) = $SRC7, from $SRC7_HOW"
    [ "$SHAONLY" = 1 ] && echo "held.sh: a SHA-ONLY hold [#529]: it holds the sha(s) $SHA and no bundle md5, by design."
    echo "held.sh: recorded $BUILD bundle $MD5 sha $SHA. COMMIT THIS TO MAIN, not to the per-run branch -"
    echo "  a row on a branch that never merges is the failure this register was written for." ;;
  selftest|--selftest)
    # ONE TOOL, TWO NAMES, AND THAT IS DELIBERATE. gates/buildnum-selftest.sh is the house pattern and this
    # file's controls live beside it at gates/held-selftest.sh. But a caller that only knows THIS file's name
    # should not have to know the other one: jobs/build-one-door-for-every-non-gate-check-2026-10-10, which is
    # Kunal's own one-door decision, names the entry as `gates/held.sh --selftest`. Both spellings reach the
    # same script, so the door can list either and neither goes stale.
    ST="$HERE/held-selftest.sh"
    [ -x "$ST" ] || [ -r "$ST" ] || { echo "held.sh selftest: no controls at $ST"; exit 2; }
    exec bash "$ST" ;;
  list)
    # THE REASON IS PRINTED IN FULL, WRAPPED - IT IS NOT TRUNCATED. The first version cut it at
    # substr($6,1,140), which stopped #441's row mid-clause at "measured at this" and amputated every actionable
    # part of it: which gate reddens, that it is absent from the tree, and the routing note about the pile. The
    # file's own header says the reason is not optional and is not a pointer, and then `list` turned it back into
    # one. Antagonist B read the output as a tired run would and caught it. If a reason is too long to read, that
    # is the reason's problem, not a thing to hide.
    printf 'live rows on %s:\n' "$(basename "$REG")"
    live_rows | while IFS= read -r r; do
      printf '  %-13s %-10s %s   held by %s\n' "$(printf '%s' "$r" | cut -f1)" "$(printf '%s' "$r" | cut -f3)" "$(printf '%s' "$r" | cut -f4)" "$(printf '%s' "$r" | cut -f5)"
      [ "$(printf '%s' "$r" | cut -f1)" = "sha-only" ] && printf '%s\n' "    bundle: none. A SHA-ONLY hold [#529]: that run changed no application file, so its bundle was main's own and is not held."
      printf '    shas: %s\n' "$(printf '%s' "$r" | cut -f2)"
      SRC7="$(printf '%s' "$r" | cut -f7)"; [ -z "$SRC7" ] || [ "$SRC7" = "-" ] || printf '    source md5: %s (chess.jsx at that sha)\n' "$SRC7"
      printf '%s\n' "$(printf '%s' "$r" | cut -f6)" | fold -s -w 104 | sed 's/^/    /'
    done
    CLEARED="$(grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=6 && $1 ~ /^-/' | wc -l | tr -d ' ')"
    if [ "$CLEARED" != "0" ]; then
      printf '\ncleared row(s), %s - kept on purpose, see the header. They do not match and do not hold:\n' "$CLEARED"
      grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=6 && $1 ~ /^-/ {printf "  %-13s %-10s %s\n", $1, $3, $4}'
    fi ;;
  *) # PRINT ONLY THE COMMENT BLOCK. This was `sed -n '2,20p'`, and the comment block ends at line 17, so the
     # --help of the tool that teaches the push bar printed three lines of its own source. Derived now rather
     # than hard-coded, so it cannot drift again when a line is added above.
     END="$(grep -n -m1 -v '^#' "$0" | cut -d: -f1)"; sed -n "2,$((END-1))p" "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
