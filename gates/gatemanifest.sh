#!/usr/bin/env bash
# gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | floor | selftest
#   CT_BUILD=#NNN CT_RUNID=<your runId> gates/gatemanifest.sh sync 'what it covers'
#
# SET CT_BUILD AND CT_RUNID ON `sync` AND `retire`, OR THE ROW YOU WRITE IS UNATTRIBUTED [antagonist B's F8 on
# #461]. Both are read and neither was documented anywhere, so the DOCUMENTED happy path - following the usage
# line above - writes `unknown` into the build column and `unknown-run` into the who column. That is #454's own
# tell wearing different clothes: there, the register shipped with zero `minted` rows because the happy path had
# never been executed once; here the happy path executes and silently produces a worse row than the tool can
# write. The 47 seeded rows carry real values (461 / build__1790925639766) because they were written by a script
# that set them, not by following these instructions.
#
# THE EXPECTED-GATES CHECK. Shipped #461 for
# jobs/gates-green-does-not-assert-which-gates-RAN-so-a-deleted-gate-is-invisible-2026-10-01, found by
# antagonist B on #450 ("this is B's best finding and it is better than the fix it was reviewing").
#
# THE DEFECT IT CLOSES, in one sentence: gates.sh globs gates/regress/*.js, so it asserts that the gates PRESENT
# all passed and never that the gates that MATTER were present - a deleted, renamed or never-merged gate is
# indistinguishable from a gate that was never needed, and the suite still ends GATES GREEN.
#
# THE SHAPE, AND WHY IT IS NOT ONE SINGLE VERDICT. Two different failures need two different answers, and giving
# them the same answer is what makes a guard unusable:
#   MISSING  (state=required, file not on disk) -> HARD. Exit 1, and gates.sh refuses to run a single gate.
#            THIS SENTENCE READ "Nothing legitimate produces this: a gate only leaves the required set through
#            `retire`" AND IT IS FALSE. WITHDRAWN AT #462 [R18], measured by both antagonists independently.
#            A gate ALSO leaves the required set by a hand edit of two fields - state -> `absent` plus any
#            non-`-` note - and `retire`'s own refusal is bypassed by deleting the file first, because it only
#            refuses while [ -f "$REG/$g" ]. Antagonist A measured the whole bar for de-requiring the gate
#            CLAUDE.md calls the only cover for brilliancy explanations: delete the file, change one word, type
#            one character; check then exits 0 and the suite runs. So what protects the required set is the
#            COMMIT DIFF and a reviewer, NOT this tool, and the two must not be confused. The missing/absent
#            asymmetry is still worth having; what is withdrawn is the claim that it is mechanical.
#   UNLISTED (file on disk, no row at all)      -> SOFT. Exit 2. The suite still RUNS, because a build that adds
#            a gate must be able to run it, and a hard failure here would mean every new gate reddens its own
#            first suite. But it is NOT a silence either: the count goes in the log footer and
#            gates/verify-log.sh REFUSES a log carrying one, so a gate cannot reach main without a row.
# That asymmetry is the same one gates/verify-log.sh already draws between its default checks and --this-bundle,
# and for the same reason: a guard that fires on the normal case gets switched off.
#
# WHAT THIS CANNOT DO, SAID HERE RATHER THAN DISCOVERED LATER [#419, "a gate log's footer cannot vouch for the
# file it was derived from"]. The summary line this script writes into the log is computed by this script, so
# verify-log.sh reading it back is reading a CLAIM, not an independent measurement - exactly as the PASS-count
# footer is. It cannot be otherwise: verify-log.sh is routinely run on archived logs with no matching tree on
# disk, so it has nothing to re-derive from. What this buys is that the claim now EXISTS and is checkable by
# anyone with the tree; what protects a log's provenance remains the suite lock, not anything in this file.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; M="$G/gate-manifest.tsv"; REG="$G/regress"
CMD="${1:-check}"

# A missing manifest is reported as NOT CHECKED, never as a pass. Antagonist B's ground on #450's held register:
# "A guard whose absence is indistinguishable from its success is not a guard." Same rule, same file shape.
if [ ! -f "$M" ]; then
  echo "gate manifest: NOT CHECKED - no manifest at $M"
  echo "  This file is tracked on main. Its absence means a stale checkout or a deleted file, not an empty"
  echo "  manifest, and a green suite here says NOTHING about whether every expected gate was present."
  [ "$CMD" = "check" ] && exit 3
  exit 3
fi

# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# WHY THERE IS NOT ONE PIPE INTO `grep -q` IN THIS FILE, and it is the most expensive thing #461's antagonist
# pass found. ANTAGONIST A, VETO 1, UPHELD AND REPRODUCED.
#
# `printf '%s\n' "$listed" | grep -qx "$g"` looks exact and is FLAKY under `set -o pipefail` (line 30).
# `grep -q` exits the instant it matches; `printf` is then killed by SIGPIPE and exits 141; `pipefail` returns
# the RIGHTMOST NON-ZERO status, which is printf's 141 - so the pipeline reports failure WHILE GREP ITSELF
# RETURNED 0, i.e. while the row was found. MEASURED HERE, not inferred: an instrumented loop over the real
# manifest prints `PIPESTATUS=[141 0]` - printf 141, grep 0 - and A measured the end-to-end rate at about 2.4%
# of `check` runs under the load a gate suite itself creates, 0 when idle, which is exactly why no control saw
# it. A different random gate each time.
# WHAT IT COST, had it shipped: `check` marks a PRESENT, LISTED gate as UNLISTED, which is exit 2, which lets
# the suite run and then has gates/verify-log.sh REFUSE the log - so roughly one full 44-minute suite in forty
# would be refused by this project's own push gate, naming a gate that is demonstrably there. CLAUDE.md's rule
# is that a flaky assertion is worse than no assertion, and this one is worse again: the `sync` site appended a
# DUPLICATE `required` row on a false miss (A measured 8 spurious rows in 140 runs), corrupting the one file the
# whole mechanism rests on, via the command this tool tells you to run.
# THE FIX IS A HERESTRING, which has no pipe and therefore no SIGPIPE. Every site below uses one. If you add a
# membership test to this file, use `grep -qx "$x" <<<"$list"` and never `printf ... | grep -q`.
# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# #467, AFTER ANTAGONIST B's F4 AND THEN AFTER MY OWN FIX FOR IT WAS WORSE THAN THE DEFECT. B's finding was that
# `sync` and `retire` fall back to `unknown` / `unknown-run` - documented in this file's header since #461 as F8 and
# never closed - and that #467 propagated it into the append-only floor register, where a row is never deleted.
# MY FIRST FIX REFUSED INSIDE floorwrite, which runs AFTER the manifest row has already been written, so `retire`
# edited gate-manifest.tsv, then refused, then exited 1 - leaving the manifest saying a gate is retired and the
# floor still high, i.e. a tree that reads as a BREACH because of a command that declined to finish. A half-applied
# write is worse than either outcome. The guard therefore runs BEFORE anything is touched, so both doors are
# atomic: they do both files or neither.
needids(){
  [ -n "${CT_RUNID:-}" ] && [ -n "${CT_BUILD:-}" ] && return 0
  echo "REFUSED: set CT_BUILD and CT_RUNID before writing either register."
  echo "    CT_BUILD=#NNN CT_RUNID=<your runId> gates/gatemanifest.sh $CMD ..."
  echo "  Both are read by this command and neither has a safe default. gates/gate-required-floor.tsv is"
  echo "  append-only and a row is never deleted, so an 'unknown-run' row in it is permanent and permanently"
  echo "  unattributable - which is why this is a refusal rather than the warning #461 left behind [B's F8/F4]."
  exit 1
}
rows(){ grep -v '^[[:space:]]*#' "$M" | grep -v '^[[:space:]]*$'; }
diskgates(){ for f in "$REG"/*.js; do [ -e "$f" ] && basename "$f"; done | sort; }

# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# #467. THE MONOTONIC FLOOR UNDER `required`. See the header of gates/gate-required-floor.tsv for the defect, the
# reproduction and the one thing this cannot do (trailing truncation; that is the git-anchor job, left open).
#
# floorrows strips comments and blanks exactly as rows() does, and for the same reason: a `#`-prefixed line is not
# a row. UNLIKE rows(), a commented-out line here is ALSO checked for row shape, because a disabled floor row is a
# hidden lowering - the same attack #461's antagonist A found on the manifest (door 6), arriving at a second file.
#
# THE `|| [ -n "$line" ]` IS LOAD-BEARING, for the third time in this project on this file shape: a row appended
# with no trailing newline makes `read` return non-zero and the loop body never runs for it, so the newest row -
# the one that sets the floor - would be INVISIBLE. verify-log.sh records this as guard (i) on held-trees.tsv and
# gatemanifest.sh's own disabled-row loop records it on the manifest. Measured here before it was fixed: a raise
# row written without a final newline left the floor reading its PREVIOUS value, which silently un-does a raise.
FLOORF="$G/gate-required-floor.tsv"

# ── #467, AFTER ANTAGONIST A's 5.1. THE FLOOR GUARDED A CARDINALITY; THE THING WORTH GUARDING IS THE SET. ──────
# A's attack, measured by A and reproduced by me before this existed: promote one of the five `known-absent` rows to
# `required`, `touch` a stub so it counts as present, and de-require the real gate with a reason. The count does not
# move, so the floor does not fire, and the manifest line that reaches the push gate is BYTE-IDENTICAL to the honest
# tree's - while gates/regress/21-review-brilliant.js, the gate CLAUDE.md names as the only cover for brilliancy
# explanations, is gone. verify-log.sh then returns OK with "floor 49 (a recorded value in the register)".
# A quieter variant: flip the row to `retired` rather than `absent` and the departing gate's name appears NOWHERE in
# check's output, because the ABSENT list is only populated for state=absent.
# THIS IS THE ELEVENTH COSTUME OF THE TRAP CLAUDE.md RECORDS TEN TIMES, and A named it as such: the floor bounds a
# number DERIVED FROM THE FILE AN ATTACKER IS EDITING, so compensating edits are invisible to it - the check and the
# thing being checked are the same object, one level up from where #467 first moved the check.
# SO THE REGISTER NOW PINS THE SET, by a digest of the sorted required gate NAMES. A swap at constant count changes
# the digest; nothing a manifest edit can do keeps it fixed, because it is a function of exactly the names.
# WHY IT DOES NOT FIRE ON THE NORMAL CASE, which is the test every guard in this project has to pass: a build that
# ADDS a gate file leaves it UNLISTED (soft, exit 2) and does not change the required set, so the digest is
# unchanged until `sync` writes its row. The legitimate swap is two rows - retire the one leaving, sync the one
# arriving - and each door records its own.
reqdigest(){
  rows | awk -F'\t' '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($2=="required") print $1}' | LC_ALL=C sort | sha256sum | cut -c1-12
}

# Sets FLOOR, FLOORWHY, FLOORBAD. FLOORBAD non-empty means NOT CHECKED or corrupt - never treated as a pass.
floorread(){
  FLOOR=""; FLOORWHY=""; FLOORBAD=""; FLOORDIG=""; FLOORABSENT=""
  if [ ! -f "$FLOORF" ]; then
    FLOORBAD="no floor register at $FLOORF"; FLOORABSENT=1
    return 0
  fi
  # EVERY LOOP VARIABLE IS `local`, AND LEAVING TWO OF THEM OUT COST THIS BUILD A GREEN. floorwrite calls
  # floorread to get the current floor before appending, and floorread was assigning `gate` and `mstate` WITHOUT
  # local - so it overwrote floorwrite's own `gate` local with the LAST ROW's field 8, and every row written
  # carried an empty gate field. The next `check` then refused the file the tool had just written, with
  # "row 3 lowers the floor but names no gate in field 8" - a legitimate retire reddening the suite. The two
  # functions shared one name, which is the same shape as every entry CLAUDE.md records under "the check and the
  # thing being checked were the same object", here at the level of a shell variable.
  local n=0 line cand trimmed stripped f pv k why gate mstate dig last="" lastdig=""
  while IFS= read -r line || [ -n "$line" ]; do
    # ── ANTAGONIST A's 5.2, UPHELD, AND IT MADE THE WHOLE RATCHET A DECORATION ────────────────────────────────
    # This block read `case "$line" in ""|[[:space:]]*) continue;; \#*|...` - so a row beginning with ONE SPACE was
    # treated as a blank line and skipped with NO FLOORBAD. A measured it and I reproduced it: sync to 51, prefix
    # that raise row with a single space, and `floor` reads 49 again while still reporting "2 row(s), append-only,
    # chain-checked"; then de-require the gates the raise paid for and `check` exits 0. Every structural test
    # antagonist B had just added was BYPASSED rather than defeated - with no `lower` row, the exactly-one rule, the
    # named-retired-gate rule, the reason check and the chain check were never consulted. And the `#` form of the
    # identical attack IS caught and has its own control, which this file's header calls "antagonist A's door 6, at
    # the second file" - so the guard existed and one invisible character walked past it.
    # THE THREE CASES ARE NOW SEPARATED, because conflating two of them is what made the hole:
    #   a line that is EMPTY OR ONLY WHITESPACE  -> genuinely blank, ignored (and MY FIRST FIX BROKE THIS, turning
    #                                               a blank line into "unreadable floor row (no tab)" and exit 3)
    #   a line whose first non-space char is `#` -> comment: tested for row shape (the #461 disabled-row rule)
    #   anything else that is INDENTED           -> a row made invisible to the replay. HARD.
    stripped="$(printf '%s' "$line" | tr -d '[:space:]')"
    [ -z "$stripped" ] && continue
    trimmed="$(printf '%s' "$line" | sed 's/^[[:space:]]*//')"
    case "$trimmed" in
      \#*)
        cand="$(printf '%s' "$trimmed" | sed 's/^#[[:space:]]*//')"
        case "$cand" in [0-9]*"	"*) FLOORBAD="a floor row is COMMENTED OUT: $(printf '%s' "$cand" | cut -c1-48)"; return 0;; esac
        continue;;
    esac
    if [ "$trimmed" != "$line" ]; then
      case "$trimmed" in [0-9]*"	"*) FLOORBAD="a floor row is INDENTED, which makes it invisible to the replay: $(printf '%s' "$trimmed" | cut -c1-48)"; return 0;; esac
      continue
    fi
    case "$line" in *"	"*) ;; *) FLOORBAD="unreadable floor row (no tab): $(printf '%s' "$line" | cut -c1-60)"; return 0;; esac
    f="$(printf '%s' "$line"  | cut -f1 | tr -d ' \r')"
    pv="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    k="$(printf '%s' "$line"  | cut -f3 | tr -d ' \r')"
    why="$(printf '%s' "$line" | cut -f7 | tr -d ' \r')"
    gate="$(printf '%s' "$line" | cut -f8 | tr -d ' \r')"
    dig="$(printf '%s' "$line" | cut -f9 | tr -d ' \r')"
    case "$f" in ''|*[!0-9]*) FLOORBAD="floor value is not a number: '$f'"; return 0;; esac
    # ── #468, ANTAGONIST B's VETO (F1), AND IT IS THE THIRD TIME THIS REGISTER HAS BEEN DEFEATED BY ONE
    # CHARACTER. #461 fell to a `#` prefix, #467 to a single leading space, and this one to the `-` SENTINEL THE
    # TOOL ITSELF DEFINES. Field 9 was the one field nothing validated. B measured the whole attack end to end on
    # a copy of the real files: change `9f80bba52ba6` to `-` on the single seed row - same row count, chain
    # untouched - and the required-SET digest check at the call site below was SKIPPED WITH NO MESSAGE OF ANY
    # KIND, `check` exited 0, `selftest` still said 55/0, and `verify-log.sh` printed a NOTE and returned OK.
    # Then edit field 1 of the same row from 49 to 29 (which nothing bounds on row 1, because the chain starts at
    # row 2) and twenty required gates can be deleted and flipped to `absent` with a one-character reason:
    # "29 required, 29 present, 0 missing" at exit 0, with `21-review-brilliant.js` - the gate CLAUDE.md names as
    # the only cover for brilliancy explanations, the item Kunal raised five times - gone, and the word DIGEST
    # appearing NOWHERE in the output. REPRODUCED BY THIS BUILD before the fix was written: with field 9 intact
    # A's swap is exit 1 and names the digest change; with field 9 = `-` it is exit 0 and says nothing.
    # THE SENTINEL IS REMOVED RATHER THAN ERA-GATED, which is the point. `-` meant "this register predates the
    # digest", and NO SUCH REGISTER CAN EXIST: this file was born at #467 and its own seed row says 467 in field
    # 5, while verify-log.sh was calling it "a pre-#467 register" to the operator's face. An era gate for an era
    # that never existed is an off switch. Same shape as CLAUDE.md's "a guard whose absence is indistinguishable
    # from its success is not a guard".
    case "$dig" in
      *[!0-9a-f]*|'') FLOORBAD="row $n's required-set digest (field 9) is not 12 hex characters: '$dig'. There is no legitimate value other than a digest - the '-' sentinel was removed at #468 because it silently disabled the set check, and no pre-#467 register exists."; return 0;;
    esac
    [ "${#dig}" -eq 12 ] || { FLOORBAD="row $n's required-set digest (field 9) is ${#dig} characters, not 12: '$dig'"; return 0; }
    n=$((n+1))
    if [ "$n" -eq 1 ]; then
      [ "$k" = seed ] || { FLOORBAD="the first floor row must be kind 'seed', not '$k'"; return 0; }
    else
      # THE CHAIN. This is the whole reason an interior row cannot be removed or edited without being seen.
      [ "$pv" = "$last" ] || { FLOORBAD="BROKEN CHAIN at row $n: its prev is '$pv' but the previous row's floor is '$last'"; return 0; }
      case "$k" in
        raise) [ "$f" -gt "$last" ] || { FLOORBAD="row $n is a 'raise' from $last to $f, which does not raise"; return 0; };;
        lower)
          # ── #467, SECOND VERSION, AFTER ANTAGONIST B's VETO. THE FIRST VERSION OF THIS ARM WAS THE WHOLE HOLE.
          # It accepted any lowering to any value with a reason of 12 or more characters, and B measured both
          # halves of that being wrong: `xxxxxxxxxxxx` cleared the bar while the genuine reason "slow gate" was
          # REFUSED, because the length was measured after `tr -d ' '` stripped the spaces - so the message quoted
          # 'slowgate' back at the user and read as a bug in the tool. A LENGTH TEST ON A FREE-TEXT FIELD IS NOT A
          # CHECK, and tuning the number would have kept the instrument. It is replaced, not adjusted.
          # THE TEST IS NOW STRUCTURAL AND IT IS TWO THINGS:
          #   (1) A LOWERING IS BY EXACTLY ONE. B's F1: the first version lowered the floor to whatever the tree
          #       happened to require, so removing twenty gates and retiring ONE took the floor 49 -> 29 at exit 0,
          #       with a register row naming one gate and accounting for twenty. The route was the one the breach
          #       message itself printed. One gate leaves per row, so the register's row count is the number of
          #       retirements and cannot be anything else.
          #   (2) THE ROW MUST NAME A GATE THE MANIFEST RECORDS AS `retired` (field 8). This is what closes B's F2,
          #       the hand-appended `lower` row: appending is neither editing nor deleting, so the chain field had
          #       nothing to say about it, and my own breach message claimed otherwise. Now a hand-appended row
          #       must ALSO name a gate whose manifest row reads `retired` - which is the manifest edit `retire`
          #       makes and which carries the reason into the diff. The two files have to agree.
          [ "$f" -eq $((last-1)) ] || { FLOORBAD="row $n lowers the floor $last -> $f; a lowering is by EXACTLY ONE (one gate leaves per row), so this row should read $((last-1))"; return 0; }
          if [ -z "$why" ] || [ "$why" = "-" ]; then
            FLOORBAD="row $n lowers the floor $last -> $f with no reason in field 7"; return 0
          fi
          case "$gate" in
            ''|'-') FLOORBAD="row $n lowers the floor but names no gate in field 8; a lowering must say WHICH gate left"; return 0;;
            *.js) ;;
            *) FLOORBAD="row $n names '$gate' in field 8, which is not a .js gate file"; return 0;;
          esac
          # The manifest is the other half of the agreement. A row claiming a gate was retired, whose manifest row
          # does not say `retired`, is a lowering nobody recorded where it has to be recorded.
          mstate="$(grep -v '^[[:space:]]*#' "$M" 2>/dev/null | awk -F'\t' -v g="$gate" '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($1==g) print $2}' | sed -n '1p')"
          if [ "${mstate:-}" != "retired" ]; then
            FLOORBAD="row $n lowers the floor for $gate, but that gate's state in $(basename "$M") is '${mstate:-NO ROW AT ALL}', not 'retired'. Use: gates/gatemanifest.sh retire $gate 'why'"; return 0
          fi;;
        *) FLOORBAD="row $n has kind '$k', which is not seed/raise/lower"; return 0;;
      esac
    fi
    if [ "$k" = seed ]; then FLOORWHY="seeded at $f by build $(printf '%s' "$line" | cut -f5 | tr -d ' \r')"
    else FLOORWHY="$k $pv -> $f at build $(printf '%s' "$line" | cut -f5 | tr -d ' \r')"; fi
    last="$f"; lastdig="$dig"
  done < "$FLOORF"
  [ "$n" -eq 0 ] && { FLOORBAD="the floor register has no rows at all"; FLOORABSENT=1; return 0; }
  FLOOR="$last"; FLOORDIG="$lastdig"
}
# Appends a row, keeping the chain. floorwrite <newfloor> <kind> <why> [gate]
floorwrite(){
  local nf="$1" k="$2" why="$3" gate="${4:--}" B WHO AT DIG
  floorread
  [ -n "$FLOORBAD" ] && { echo "  REFUSING to write the floor register: $FLOORBAD"; return 1; }
  # ANTAGONIST B's F4, UPHELD. `sync` and `retire` read CT_BUILD and CT_RUNID and fell back to `unknown` /
  # `unknown-run`, and #467's first version PROPAGATED that into the new register - a file whose own header has a
  # section titled WHO WRITES IT and whose discipline is that a row is never deleted. So an unattributable row
  # would have been permanent, in the project's new audit anchor, written by the documented happy path. The
  # manifest has precedent for junk rows; this file must not. It REFUSES instead, which is the #454 lesson
  # (a happy path that silently produces a worse row than the tool can write is not a happy path).
  if [ -z "${CT_RUNID:-}" ] || [ -z "${CT_BUILD:-}" ]; then
    echo "  REFUSING to write the floor register: CT_BUILD and CT_RUNID must both be set."
    echo "    CT_BUILD=#NNN CT_RUNID=<your runId> gates/gatemanifest.sh $CMD ..."
    echo "  This register is append-only and a row is never deleted, so an 'unknown-run' row here is permanent."
    return 1
  fi
  B="${CT_BUILD}"; WHO="${CT_RUNID}"; AT="$(date -u +%Y-%m-%d)"
  # A trailing newline is written UNCONDITIONALLY first if the file lacks one, or this row joins the previous one.
  [ -n "$(tail -c1 "$FLOORF")" ] && printf '\n' >> "$FLOORF"
  DIG="$(reqdigest)"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$nf" "$FLOOR" "$k" "$AT" "${B#\#}" "$WHO" "$why" "$gate" "$DIG" >> "$FLOORF"
  echo "  floor register: $k $FLOOR -> $nf, required-set digest $DIG (build ${B#\#}, $WHO)"
}
# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

case "$CMD" in
check)
  MISSING=""; UNLISTED=""; ABSENT=""; BACK=""; UNJUSTIFIED=""; MALFORMED=0; DISABLED=""
  # ANTAGONIST A's VETO 2, DOOR 6, AND IT IS THE ONLY ONE OF HIS SIX THE #461 FIX DID NOT CLOSE. A row prefixed
  # with `#` is not a malformed row - it is NOT A ROW AT ALL, because rows() strips comments - so `required` fell
  # 47 -> 46 with NO warning, "0 missing", "0 unreadable" and exit 0. A proved it end to end through the real
  # gates.sh: GATES GREEN #461 with 29-draws appearing zero times in the log. A's own proposed invariant
  # (NREQ == NPRES - NUNL + NMISS) does NOT catch it, which I checked before relying on it: with both the row and
  # the file gone, 46 == 46 - 0 + 0 holds.
  # SO IT IS CAUGHT BY SHAPE INSTEAD: a comment line whose text, with the # and any spaces stripped, would parse
  # as a gate row - a filename ending .js followed by a TAB - is a DISABLED ROW, not documentation. The TAB is
  # what makes this safe: this file's header names 67-sel-cls-consumers.js and 50-drill-verdict-no-jump.js in
  # prose, followed by spaces and commas, so no real comment matches. Counted into the same `unreadable` field
  # rather than a ninth column, because it is the same thing from a reader's point of view - a row the tool
  # cannot use - and because a stable 8-field line is what gates/verify-log.sh parses strictly.
  # THE `|| [ -n "$line" ]` IS NOT DECORATION. Without it, a row appended with NO TRAILING NEWLINE makes `read`
  # return non-zero and the loop body never runs for it - so a commented-out row added by hand, which is exactly
  # what this loop exists to catch, would be INVISIBLE to it. gates/verify-log.sh learned this on held-trees.tsv
  # and records it as guard (i) on the same file shape; measured here before fixing: a `#`-prefixed row with no
  # final newline gave "46 required ... 0 unreadable" and exit 0.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in \#*|[[:space:]]*\#*) ;; *) continue;; esac
    cand="$(printf '%s' "$line" | sed 's/^[[:space:]]*#[[:space:]]*//')"
    case "$cand" in *.js"	"*) DISABLED="$DISABLED$(printf '%s' "$cand" | cut -f1)"$'\n'; MALFORMED=$((MALFORMED+1));; esac
  done < "$M"
  NREQ=0; NABS=0; NRET=0
  # Bound the row shape the way verify-log.sh bounds held-trees.tsv: a row somebody wrote meaning to require a
  # gate must never be skipped in silence, so a malformed one is counted and reported rather than ignored.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in *"	"*) ;; *) MALFORMED=$((MALFORMED+1)); continue;; esac
    g="$(printf '%s' "$line" | cut -f1 | tr -d ' \r')"
    s="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    case "$g" in *.js) ;; *) MALFORMED=$((MALFORMED+1)); continue;; esac
    present=0; [ -f "$REG/$g" ] && present=1
    # THE REASON IS LOAD-BEARING, AND I FOUND THAT OUT BY ATTACKING MY OWN GUARD. Measured before this was
    # here: deleting gates/regress/26-invariants.js and hand-editing its row's state from `required` to
    # `absent` gave "46 required, 46 present, 0 missing, 4 known-absent" and EXIT 0. So the whole mechanism -
    # "a gate can only leave in a commit that says why" - was defeated by a two-line edit that said nothing,
    # while `retire` (which refuses while the file is on disk and demands a reason) was the only guarded door.
    # An unguarded second door makes the guarded one decorative. So a row claiming a gate is GONE must carry a
    # reason in field 7, and one that does not is treated as MISSING - hard - rather than warned about: a row
    # that says a gate is absent without saying why does not get the benefit of the doubt. The commit diff is
    # still the real protection; this makes the diff say something.
    note="$(printf '%s' "$line" | cut -f7 | tr -d ' \r')"
    case "$s" in
      required) NREQ=$((NREQ+1)); [ $present -eq 1 ] || MISSING="$MISSING$g"$'\n';;
      absent|retired)
        [ "$s" = absent ] && NABS=$((NABS+1)) || NRET=$((NRET+1))
        if [ $present -eq 1 ]; then
          BACK="$BACK$g (row says $s)"$'\n'
        elif [ -z "$note" ] || [ "$note" = "-" ]; then
          UNJUSTIFIED="$UNJUSTIFIED$g (state $s, no reason in field 7)"$'\n'
        elif [ "$s" = absent ]; then
          ABSENT="$ABSENT$g"$'\n'
        fi
        ;;
      *) MALFORMED=$((MALFORMED+1));;
    esac
  done < <(rows)
  listed="$(rows | cut -f1 | tr -d ' \r' | sort -u)"
  for g in $(diskgates); do
    grep -qx "$g" <<<"$listed" || UNLISTED="$UNLISTED$g"$'\n'   # herestring, NOT a pipe - see the SIGPIPE note above
  done
  NMISS=$(printf '%s' "$MISSING" | grep -c . || true)
  NUNL=$(printf '%s' "$UNLISTED" | grep -c . || true)
  NPRES=$(diskgates | grep -c . || true)
  if [ -n "$UNJUSTIFIED" ]; then
    echo "MANIFEST ROW CLAIMS A GATE IS GONE AND GIVES NO REASON - treated as MISSING, not as an excuse:"
    printf '%s' "$UNJUSTIFIED" | sed 's/^/    /'
    echo "  A row whose state is absent or retired must say WHY in field 7. Without that, flipping a row from"
    echo "  required to absent silently removes a gate from the suite, which is the one thing this file exists"
    echo "  to prevent. Use:  gates/gatemanifest.sh retire <gate> 'the reason'"
  fi
  if [ -n "$MISSING" ]; then
    echo "MANIFEST MISSING GATE(S) - the suite cannot be trusted and must not report green:"
    printf '%s' "$MISSING" | sed 's/^/    /'
    echo "  Each of these has state=required in $M, so a previous commit asserted the suite needs it, and it is"
    echo "  not in $REG. Either restore the file, or retire the row ON PURPOSE and say why:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'"
    echo "  Deleting the row instead makes the manifest agree with the deletion silently, which is the whole"
    echo "  defect this file exists to stop."
  fi
  if [ -n "$UNLISTED" ]; then
    echo "MANIFEST UNLISTED GATE(S) - present in $REG with no row in the manifest:"
    printf '%s' "$UNLISTED" | sed 's/^/    /'
    echo "  The suite still runs these. But verify-log.sh REFUSES a log that reports unlisted gates, so this"
    echo "  must be resolved before a push:  gates/gatemanifest.sh sync 'what they cover'"
    echo "  >> DO IT NOW, BEFORE THE SUITE RUNS. This is known at second two and the refusal lands at the PUSH,"
    echo "  >> so carrying on costs you the whole suite and then sends you back here [antagonist B's F9, #461]."
  fi
  if [ -n "$ABSENT" ]; then
    echo "KNOWN-ABSENT GATE(S) - recorded as not on this tree, NOT a failure, reported every run on purpose:"
    printf '%s' "$ABSENT" | sed 's/^/    /'
    echo "  A defect class with no gate on main is the thing that was previously invisible. Read the note column."
  fi
  if [ -n "$BACK" ]; then
    echo "MANIFEST ROW IS STALE - the file is present but its row says it is not:"
    printf '%s' "$BACK" | sed 's/^/    /'
    echo "  Promote it:  gates/gatemanifest.sh sync 'now on this tree'"
  fi
  if [ -n "$DISABLED" ]; then
    echo "MANIFEST ROW(S) COMMENTED OUT - a disabled row is not a removed gate, it is a hidden one:"
    printf '%s' "$DISABLED" | sed 's/^/    /'
    echo "  Prefixing a row with # does not make the gate optional, it makes the requirement INVISIBLE: the row"
    echo "  stops being counted and nothing says so. To remove a gate, use:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'"
    echo "  which keeps the row and writes the reason into it, so the removal appears in a commit diff."
  fi
  if [ "$MALFORMED" -gt 0 ]; then
    # ANTAGONIST B's VETO F2 ON #461, UPHELD, AND IT IS THE WORST SHAPE A GUARD CAN HAVE. This was a WARNING and
    # nothing else: the count was NOT in the summary line, so it never reached the log footer and verify-log.sh
    # could not see it, and `check` exited 0. MEASURED by B and reproduced here: mangle the tabs on ONE required
    # row (or capitalise its state to `Required`) AND delete that gate, and the line that travels into the push
    # gate read "46 required, 46 present, 0 MISSING" and exit 0 - an AFFIRMATIVE statement that nothing was
    # missing, for a tree with a required gate gone. Not a silence: a false assurance, which is worse.
    # IT IS NOW HARD, not soft, and the reasoning is the asymmetry this file already draws. An UNLISTED gate is
    # soft because it happens every time a build legitimately adds a gate. A malformed row happens only when
    # somebody typed into this file wrongly: it is not a normal occurrence, it cannot block normal work, it is one
    # edit to fix, and while it stands the tool CANNOT KNOW what the suite requires. A row that says a gate is
    # gone without saying why gets no benefit of the doubt (above); a row that cannot be read at all gets less.
    echo "MANIFEST ROW(S) UNREADABLE - $MALFORMED row(s) could not be parsed, so what the suite requires is UNKNOWN:"
    echo "    (no tab separator, no .js in field 1, or a state that is not required/absent/retired)"
    echo "  Somebody wrote those rows meaning to require a gate. Until they are fixed this check cannot tell you"
    echo "  whether a gate is missing - and the count below EXCLUDES them, so it would understate `required`."
  fi
  NUNJ=$(printf '%s' "$UNJUSTIFIED" | grep -c . || true)

  # ── #467. THE FLOOR, COMPARED AND NEVER WRITTEN HERE ──────────────────────────────────────────────────────────
  floorread
  FLOORTXT="NOT-CHECKED"; FLOORSUNK=""; NOWDIG="$(reqdigest)"
  if [ -n "$FLOORBAD" ]; then
    if [ -n "$FLOORABSENT" ]; then echo "GATE-REQUIRED FLOOR: NOT CHECKED - $FLOORBAD"
    else echo "GATE-REQUIRED FLOOR REGISTER IS CORRUPT - $FLOORBAD"; fi
    echo "  The floor register bounds \`required\` from BELOW. Without it this check cannot tell a tree that needs"
    echo "  49 gates from one that has been edited down to 40, which is the whole defect #467 closed. It is NOT"
    echo "  treated as a pass: the count below reads NOT-CHECKED, and gates/verify-log.sh REFUSES a log carrying"
    echo "  that token, naming the floor register as the reason [antagonist B's rule on #450's register: a guard"
    echo "  whose absence is indistinguishable from its success is not a guard]."
    # B's F6: this said verify-log.sh "cannot parse" the token. It parses it DELIBERATELY - its MANIRE467 accepts
    # NOT-CHECKED as a token precisely so it can refuse with the right reason - and its own comment says why,
    # citing #419: a wrong reason that reaches the right verdict is a trap. So a user debugging a refusal was being
    # sent to look for a parse failure that does not exist, by the other half of the same mechanism.
    echo "  Restore gates/gate-required-floor.tsv from main, or if a row is corrupt, fix the row - do NOT delete it."
  else
    FLOORTXT="$FLOOR"
    # ── THE SET CHECK, ANTAGONIST A's 5.1. It runs BEFORE the count check because it is the stronger of the two:
    # every breach of the count is also a change of the set, but not every change of the set moves the count, and
    # A's attack is exactly the case where the count does not move. The count check is kept because it produces the
    # readable message and the actionable remedy; this one produces the strength.
    # #468: the `[ "$FLOORDIG" != "-" ]` clause that used to sit here is GONE. It was the off switch B's F1
    # found: a `-` in field 9 made this whole block unreachable with no message. floorread now refuses such a
    # row outright, so `-` can no longer reach this point at all.
    if [ -n "$FLOORDIG" ] && [ "$NOWDIG" != "$FLOORDIG" ]; then
      FLOORSUNK=1
      echo "REQUIRED-SET DIGEST CHANGED WITH NO ROW IN THE FLOOR REGISTER:"
      echo "    register's last row: $FLOORDIG   this tree: $NOWDIG   ($NREQ required here, floor $FLOOR)"
      # NAME THE GATES, because antagonist A's second observation on 5.1 was that in the `retired` variant the
      # departing gate's name appears NOWHERE in this command's output - the ABSENT list is only populated for
      # state=absent - so the operator was told a set had changed and not which member. A digest that says "something
      # moved" and will not say what is the "absence is the hardest thing to measure" rule failing at the message.
      # The register's own rows carry the gate names for every recorded change, so the comparison is against the
      # names the LAST ROW's digest was computed from - which this tool cannot reconstruct from a hash. What it CAN
      # do is name every gate whose state is not `required` but which the suite has a row for, and say plainly that
      # the list is the candidates rather than the diff.
      LEFTC="$(rows | awk -F'\t' '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($2!="required") print "      "$1" (now "$2")"}')"
      if [ -n "$LEFTC" ]; then
        echo "    gates NOT in the required set on this tree - the departing gate is one of these:"
        printf '%s\n' "$LEFTC"
        echo "    (this is the candidate list, not the diff: a digest cannot be run backwards to the names it came"
        echo "     from. Compare it against the register's own rows, which name a gate per recorded change.)"
      fi
      echo "  The SET of gates this suite requires is not the set the register last recorded, and no row says why."
      echo "  THE COUNT ALONE WOULD NOT HAVE CAUGHT THIS. A row promoted from absent to required, with a stub"
      echo "  touched for it, pays for a real gate being de-required: the count is unchanged and the manifest line"
      echo "  comes out byte-identical to an honest tree's [antagonist A's 5.1 on #467]. The digest is a function of"
      echo "  the sorted required gate NAMES, so a swap cannot hide in it."
      echo "  EVERY change to the required set goes through a door that records it:"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh sync '<what it covers>'      # a gate arrives"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> '<why>'     # a gate leaves"
      echo "  A swap is BOTH, one row each. Adding a gate FILE changes nothing here until sync lists it."
    fi
    if [ "$NREQ" -lt "$FLOOR" ]; then
      FLOORSUNK=1
      echo "GATE-REQUIRED FLOOR BREACHED - this tree requires FEWER gates than an accepted tree already did:"
      echo "    floor $FLOOR (set: $FLOORWHY), this tree requires $NREQ"
      echo "  Some gate that a previous commit asserted the suite needs has left the required set. The two-field"
      echo "  edit that does this - delete the file, flip the row to \`absent\`, type any reason - used to report one"
      echo "  fewer required gate and exit 0, so the suite ran and GATES GREEN was emitted over a smaller suite."
      echo "  If the removal is DELIBERATE, it goes through the door that records it, which also lowers the floor:"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> 'why it is going'"
      echo "  If it is not deliberate, restore the gate - that is the likelier case."
      # THIS SENTENCE WAS FALSE AND ANTAGONIST B CAUGHT IT. It read: "Lowering the floor by hand is not the route:
      # the register is append-only and its chain field makes an edited or deleted row a hard failure." APPENDING
      # is neither editing nor deleting, so the chain had nothing to say, and B hand-appended a `lower` row and got
      # exit 0. The message asserted a guard that did not exist. What is true is stated instead, and it is true
      # because the `lower` arm of floorread now enforces both halves of it.
      echo "  Appending a 'lower' row by hand will not work either, and the reason is specific rather than a claim"
      echo "  about append-only files: a lowering must be by EXACTLY ONE and must name in field 8 a gate whose"
      echo "  state in the manifest is 'retired'. So the two files have to agree, and the manifest is where the"
      echo "  reason lands in the commit diff. One gate leaves per row."
    fi
  fi

  # MALFORMED IS IN THIS LINE BECAUSE THIS LINE IS THE CARRIER. gates.sh copies it into the log footer and
  # gates/verify-log.sh reads it back; a count that is not here is invisible to the push gate [B's F2]. THE SAME
  # IS NOW TRUE OF THE FLOOR [#467]: the floor is the one field in this line that is not computed from the tree,
  # so it is the only one a log can be checked against after the fact, which is why it had to go HERE and not
  # into a line of prose above. A log with no floor field is a pre-#467 log and verify-log.sh gates on the era.
  # ── ANTAGONIST B's F3, UPHELD. THE ARITHMETIC INVARIANT EXISTED ONLY AT THE PUSH GATE, 44 MINUTES TOO LATE.
  # gates/verify-log.sh has checked `required == present - unlisted + missing` since #461 and this file never did,
  # so B got `check` to exit 0 over a tree with a required gate DELETED: remove 26-invariants.js, flip its row to
  # absent, and append ONE duplicate row for a gate that IS on disk. The line then reads "49 required, 48 present,
  # 0 missing" - it contradicts itself - and the suite runs its full 44 minutes and emits GATES GREEN before
  # anything objects. Reproduced by me before fixing. That is exactly the asymmetry gates.sh states three lines
  # above its call to this script: a suite that cannot be trusted should not spend forty minutes proving it.
  # HARD, because a line that does not add up means `missing` does not mean what it says, and `missing` is the
  # whole verdict. Same reasoning as MALFORMED: while it stands, the tool CANNOT KNOW what the suite requires.
  ARITHBAD=""
  if [ $(( NPRES - NUNL + NMISS )) -ne "$NREQ" ]; then
    ARITHBAD=1
    echo "MANIFEST LINE DOES NOT ADD UP - so 'missing' does not mean what it says:"
    echo "    required($NREQ) should equal present($NPRES) - unlisted($NUNL) + missing($NMISS) = $(( NPRES - NUNL + NMISS ))"
    echo "  The usual cause is a DUPLICATE row: two rows naming one gate count twice toward required, which pads"
    echo "  the count back up over a gate that has actually gone. Check for repeated names:"
    echo "      gates/gatemanifest.sh list | awk '{print \$1}' | sort | uniq -d"
    echo "  gates/verify-log.sh has refused logs on this invariant since #461; it is checked HERE now so the"
    echo "  failure costs you a second rather than a whole suite [antagonist B's F3 on #467]."
  fi
  # THE DIGEST GOES IN THE CARRIER LINE TOO, and antagonist A's 5.1 is the reason it has to. A's attack produced
  # a manifest line BYTE-IDENTICAL to an honest tree's, so the push gate had nothing to read even in principle. With
  # the digest here, a log records WHICH SET its suite ran over, not just how many - and gates/verify-log.sh can hold
  # it to a value the register has actually stood at, the same membership test it applies to the floor.
  REQSETTXT="$NOWDIG"; [ -n "$FLOORBAD" ] && REQSETTXT="NOT-CHECKED"
  echo "gate manifest: $NREQ required, $NPRES present, $NMISS missing, $NUNL unlisted, $NABS known-absent, $NRET retired, $NUNJ unjustified, $MALFORMED unreadable, $FLOORTXT floor, $REQSETTXT reqset"
  { [ -n "$MISSING" ] || [ -n "$UNJUSTIFIED" ] || [ "$MALFORMED" -gt 0 ] || [ -n "$FLOORSUNK" ] || [ -n "$ARITHBAD" ]; } && exit 1
  # THE THREE-WAY SPLIT, AND ANTAGONIST A MOVED THE MIDDLE CASE. A BREACHED floor or a CHANGED required set is
  # positive evidence that the suite shrank: hard, exit 1, the suite does not run. An ABSENT register (or one with
  # no rows) is indistinguishable from a stale checkout, so it is exit 3 - it does not block a diagnostic run, and
  # it cannot reach main either, because the NOT-CHECKED token above makes verify-log.sh refuse the log.
  # A CORRUPT REGISTER IS NOW HARD TOO, which is A's point and it is right: a BROKEN CHAIN, an indented or
  # commented-out row, a bad kind or a lowering that does not name a retired gate are none of them "maybe a stale
  # checkout" - they are a file somebody has written into wrongly, and while one stands this tool CANNOT KNOW what
  # the suite requires. Exit 3 would have let a ~70-minute suite run and then be refused at the push gate, which is
  # antagonist B's F9 on #461 (knowable at second two, refused at the push) wearing a new hat, and it contradicts
  # this file's own argument for making a malformed MANIFEST row hard: it is not a normal occurrence, it cannot
  # block normal work, and it is one edit to fix.
  if [ -n "$FLOORBAD" ]; then
    [ -n "$FLOORABSENT" ] && exit 3
    exit 1
  fi
  [ -n "$UNLISTED" ] && exit 2
  exit 0
  ;;
floor)
  floorread
  if [ -n "$FLOORBAD" ]; then echo "gate-required floor: NOT CHECKED - $FLOORBAD"; exit 3; fi
  echo "gate-required floor: $FLOOR (last change: $FLOORWHY)"
  echo "  register: $FLOORF, $(grep -vc '^[[:space:]]*#' "$FLOORF" || true) row(s), append-only, chain-checked"
  exit 0
  ;;
sync)
  WHY="${2:-}"; [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh sync 'what these gates cover / why they arrived'"; exit 1; }
  needids
  B="${CT_BUILD:-unknown}"; WHO="${CT_RUNID:-unknown-run}"; AT="$(date -u +%Y-%m-%d)"
  listed="$(rows | cut -f1 | tr -d ' \r' | sort -u)"; n=0
  for g in $(diskgates); do
    if ! grep -qx "$g" <<<"$listed"; then   # herestring, NOT a pipe - a false miss here APPENDED A DUPLICATE ROW
      # #468 LEFT AS A PIPE, DELIBERATELY, and this is the fifth SIGPIPE site rather than an oversight. Two
      # reasons it cannot corrupt anything, both verified: the pipeline's VALUE is still correct (the last
      # stage, `cut`, reads all of its input), and pipefail's 141 lands on an assignment whose status nothing
      # reads (no `set -e` in this script).
      # A THIRD REASON WAS OFFERED IN THE FIRST DRAFT AND IS WITHDRAWN HERE, on antagonist A's finding (F7):
      # "the very next line supplies a fallback for an empty `d`" protects against NOTHING related to the
      # SIGPIPE, because a SIGPIPE on the upstream `sed` cannot produce an empty `d` - `grep -m1` has already
      # captured its line by then. `d` is empty only when lines 2-6 hold no `//`, a different cause entirely.
      # A wrong reason reaching a right verdict is CLAUDE.md's #419 trap, so it is named rather than dropped.
      # AND THE FOURTH REASON WAS AN ARGUMENT WHERE A MEASUREMENT WAS FREE. It read "`sed -n '2,6p'` also emits
      # at most five lines, so it has usually exited before `grep -m1` can signal it". "Usually" bounds nothing.
      # MEASURED, by A and independently by this build: the largest lines-2-6 block across all 49 gate files is
      # 571 BYTES (gates/regress/15-gallery-playall.js), against a 65536 B pipe buffer - a 115x margin. THAT
      # bounds the risk. Rewriting it would be churn in the one place the pattern is provably safe. Counted on
      # the same job as the four repaired above so the total stays five, not four.
      d="$(sed -n '2,6p' "$REG/$g" | grep -m1 '^//' | sed 's|^//[ ]*||' | tr '\t' ' ' | cut -c1-88)"
      [ -z "$d" ] && d="(no header comment)"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$g" "required" "${B#\#}" "$AT" "$WHO" "$d" "$WHY" >> "$M"
      echo "  added $g as required (build ${B#\#}, $WHO)"; n=$((n+1))
    fi
  done
  # A row that says absent/retired while the file is here is promoted, in place, with the old state kept in note.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in *"	"*) ;; *) continue;; esac
    g="$(printf '%s' "$line" | cut -f1 | tr -d ' \r')"; s="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    case "$s" in absent|retired) [ -f "$REG/$g" ] || continue;; *) continue;; esac
    old="$(printf '%s' "$line" | cut -f7)"
    new="$(printf '%s' "$line" | awk -F'\t' -v OFS='\t' -v w="PROMOTED from $s at ${B#\#}: $WHY | was: $old" '{$2="required";$7=w;print}')"
    python3 - "$M" "$line" "$new" <<'PY'
import sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
t=open(p).read()
assert t.count(old+"\n")==1, "row not unique"
open(p,'w').write(t.replace(old+"\n",new+"\n"))
PY
    echo "  promoted $g from $s to required"; n=$((n+1))
  done < <(rows)
  [ "$n" -eq 0 ] && echo "nothing to sync: every gate in $REG already has a row"
  # #467. RAISE THE FLOOR TO WHAT THIS TREE NOW REQUIRES. `sync` is the only door that ADDS required rows, so it
  # is the only one that can raise the floor, and doing it here rather than in `check` is the point: `check`
  # compares and never writes, so it can never ratify its own denominator. Computed by re-reading the manifest
  # rather than from $n, because $n counts promotions too and a promotion changes `required` by a different amount.
  NREQNOW=$(rows | awk -F'\t' '{gsub(/[ \r]/,"",$2); if($2=="required") c++} END{print c+0}')
  floorread
  if [ -n "$FLOORBAD" ]; then
    echo "  floor register NOT UPDATED: $FLOORBAD"
    echo "  Fix the register and re-run sync, or the next check will read a floor below what this tree requires."
  elif [ "$NREQNOW" -gt "$FLOOR" ]; then
    floorwrite "$NREQNOW" raise "${WHY}" "-" || exit 1
  elif [ -n "$FLOORDIG" ] && [ "$FLOORDIG" != "-" ] && [ "$(reqdigest)" != "$FLOORDIG" ]; then
    # The required SET moved without the count moving, which is antagonist A's 5.1 shape. sync is the arriving
    # door only; something also LEFT, and that has to go through the leaving door so the register says which gate.
    echo "  floor register NOT UPDATED, and this tree will not check clean."
    echo "    the required SET has changed but the COUNT has not ($NREQNOW, floor $FLOOR), so a gate left as this"
    echo "    one arrived. Retire the one that left, by name, so the register records both halves:"
    echo "        CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> 'why it is going'"
    echo "    A swap is two rows, one per door. That is what makes the register a record rather than a tally."
    exit 1
  else
    echo "  floor register unchanged at $FLOOR (this tree requires $NREQNOW)"
  fi
  exit 0
  ;;
retire)
  g="${2:-}"; WHY="${3:-}"
  [ -n "$g" ] && [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh retire <gate.js> 'why it is going'"; exit 1; }
  needids
  ALLROWS="$(rows | cut -f1 | tr -d ' \r')"
  grep -qx "$g" <<<"$ALLROWS" || { echo "no row for $g in $M"; exit 1; }   # herestring; the pipe form made a legitimate retire fail
  if [ -f "$REG/$g" ]; then
    echo "REFUSED: $REG/$g is still on disk. Retire the ROW only when the gate is actually going, and in the"
    echo "  same commit, so the diff shows the file leaving and the reason arriving together."
    exit 1
  fi
  B="${CT_BUILD:-unknown}"; WHO="${CT_RUNID:-unknown-run}"; AT="$(date -u +%Y-%m-%d)"
  line="$(rows | grep -P "^\Q$g\E\t" | sed -n '1p')"   # sed -n 1p reads the whole stream; head -1 would SIGPIPE the grep
  new="$(printf '%s' "$line" | awk -F'\t' -v OFS='\t' -v w="RETIRED at ${B#\#} ($AT, $WHO): $WHY" '{$2="retired";$7=w;print}')"
  python3 - "$M" "$line" "$new" <<'PY'
import sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
t=open(p).read()
assert t.count(old+"\n")==1, "row not unique"
open(p,'w').write(t.replace(old+"\n",new+"\n"))
PY
  # #467. LOWER THE FLOOR, BY THE ONLY DOOR THAT MAY. A deliberate retirement is the one legitimate way for
  # `required` to fall, so it is the one place the floor goes down - and the reason travels into the floor register
  # as well as into the manifest row, because the register is what a later run reads with no tree and no network.
  # WITHOUT THIS THE WHOLE GUARD DEADLOCKS: a legitimate retire would take `required` below the floor, `check`
  # would go hard, and the suite could never go green again, so the first person to retire a gate properly would
  # have had to edit the register by hand - which is precisely the route the register exists to refuse. A guard
  # with no legitimate door gets switched off; that is the same reasoning that makes UNLISTED soft one screen up.
  NREQNOW=$(rows | awk -F'\t' '{gsub(/[ \r]/,"",$2); if($2=="required") c++} END{print c+0}')
  floorread
  if [ -n "$FLOORBAD" ]; then
    echo "  floor register NOT UPDATED: $FLOORBAD"
    echo "  The row above IS written. Fix the register before the next suite, or check will read a stale floor."
  elif [ "$NREQNOW" -eq $((FLOOR-1)) ]; then
    floorwrite "$NREQNOW" lower "retire $g at ${B#\#} ($WHO): $WHY" "$g" || exit 1
  elif [ "$NREQNOW" -lt $((FLOOR-1)) ]; then
    # ANTAGONIST B's F1, UPHELD, AND IT IS THE HOLE THAT NEARLY SHIPPED. The first version wrote
    # `floorwrite "$NREQNOW" lower`, i.e. it dropped the floor to whatever the tree happened to require. So a run
    # that deleted twenty gates and hand-flipped their rows, then retired ONE of them properly, took the floor
    # 49 -> 29 at exit 0 - and the route was the one the BREACH MESSAGE ITSELF PRINTS. Measured by B and
    # reproduced by me before fixing: three gates removed, one retired, floor 49 -> 46, check exit 0, and a
    # verify-log.sh OK over a 47-section log. The register then permanently carried one row naming one gate and
    # accounting for three, which is worse than the plain two-field diff #461 left, because it arrives laundered
    # through this project's own audit anchor looking like due process.
    # ONE GATE LEAVES PER ROW. Retire each one, so the register's row count IS the number of retirements.
    echo "  FLOOR NOT LOWERED, and this retirement is not finished."
    echo "    floor $FLOOR, this tree requires $NREQNOW, so $((FLOOR-NREQNOW)) gate(s) have left the required set"
    echo "    and you have retired ONE. A lowering is by exactly one, so the register's row count is the number"
    echo "    of retirements and cannot be made to stand for more."
    echo "  The manifest row for $g IS written. Retire the other $((FLOOR-NREQNOW-1)) by name as well:"
    rows | awk -F'\t' -v reg="$REG" '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if(($2=="absent"||$2=="retired") && system("[ -f \""reg"/"$1"\" ]")!=0) print "      gates/gatemanifest.sh retire "$1" '"'"'why it is going'"'"'"}' | sed -n '1,8p'
    echo "  If those gates should NOT be leaving, restore them instead - that is the likelier case."
    exit 1
  else
    echo "  floor register unchanged at $FLOOR (this tree requires $NREQNOW)"
  fi
  echo "retired $g. The row stays in $M with the reason; commit this together with the file's removal."
  exit 0
  ;;
list)
  printf '%-40s %-9s %-6s %s\n' GATE STATE BUILD NOTE
  rows | while IFS= read -r line || [ -n "$line" ]; do
    printf '%-40s %-9s %-6s %s\n' "$(printf '%s' "$line" | cut -f1)" "$(printf '%s' "$line" | cut -f2)" "$(printf '%s' "$line" | cut -f3)" "$(printf '%s' "$line" | cut -f7 | cut -c1-70)"
  done
  exit 0
  ;;
selftest)
  # ITS CONTROLS AS A COMMAND RATHER THAN A PARAGRAPH, following gates/buildnum-selftest.sh (#454). Every case
  # runs against a THROWAWAY COPY of the manifest and regress dir, so it can never touch the real ones.
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  mkdir -p "$T/regress"; cp "$M" "$T/gate-manifest.tsv"; cp "$0" "$T/gatemanifest.sh"; chmod +x "$T/gatemanifest.sh"; cp "$M" "$T/kept2.tsv"
  # #467. THE FLOOR REGISTER MUST BE COPIED TOO, and finding out why cost one run of this command. Without it every
  # pre-existing case newly reports "floor NOT CHECKED" and exits 3 instead of the code it asserts - so adding the
  # floor would have reddened sixteen controls that are about something else entirely. A throwaway copy also means
  # the floor cases below can append rows without touching the register this repository actually ships.
  [ -f "$FLOORF" ] && cp "$FLOORF" "$T/gate-required-floor.tsv"; cp "$T/gate-required-floor.tsv" "$T/keptfloor.tsv" 2>/dev/null || true
  for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
  pass=0; fail=0
  # #467. RESET ALL THREE SURFACES, and this exists because adding the floor cases without it cost one run of this
  # command and nine red controls that were about something else. Case 21 DELETES a gate stub to breach the floor;
  # every later case then saw a MISSING required gate, which is hard and OUTRANKS the floor, so eight controls
  # reported "wanted 3, got 1" while the thing they were testing worked perfectly. A control that fails for a
  # reason other than its subject is not a failing control, it is an unreadable one.
  resetT(){
    cp "$T/kept2.tsv" "$T/gate-manifest.tsv"
    cp "$T/keptfloor.tsv" "$T/gate-required-floor.tsv" 2>/dev/null || true
    rm -f "$T"/regress/*.js
    for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
  }
  ck(){ local want="$1" desc="$2"; shift 2; local out rc
    out="$("$@" 2>&1)"; rc=$?
    if [ "$rc" = "$want" ]; then echo "PASS selftest: $desc (exit $rc)"; pass=$((pass+1));
    else echo "FAIL selftest: $desc — wanted exit $want, got $rc"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi; }
  # 1. the control that proves the whole thing: a clean tree is clean.
  ck 0 "a complete tree checks clean" "$T/gatemanifest.sh" check
  # 2. THE DEFECT THE JOB WAS FILED FOR. Delete a required gate -> hard fail. Today, without this, green.
  rm -f "$T/regress/26-invariants.js"
  ck 1 "a DELETED required gate is a hard failure" "$T/gatemanifest.sh" check
  cp /dev/null "$T/regress/26-invariants.js"
  ck 0 "restoring it clears the failure" "$T/gatemanifest.sh" check
  # 3. a RENAMED gate must fail too - it is a deletion plus an unlisted arrival, and the deletion is what matters.
  mv "$T/regress/29-draws.js" "$T/regress/29-draws-renamed.js"
  ck 1 "a RENAMED required gate is a hard failure" "$T/gatemanifest.sh" check
  mv "$T/regress/29-draws-renamed.js" "$T/regress/29-draws.js"
  # 4. an UNLISTED new gate is soft (exit 2), not hard: a build adding a gate must still be able to run it.
  : > "$T/regress/99-brand-new.js"
  ck 2 "an UNLISTED new gate is soft (exit 2), so the suite can still run" "$T/gatemanifest.sh" check
  rm -f "$T/regress/99-brand-new.js"
  # 5. missing beats unlisted when both are true, because the hard case must win.
  rm -f "$T/regress/26-invariants.js"; : > "$T/regress/99-brand-new.js"
  ck 1 "MISSING outranks UNLISTED when both hold" "$T/gatemanifest.sh" check
  cp /dev/null "$T/regress/26-invariants.js"; rm -f "$T/regress/99-brand-new.js"
  # 6. a vanished manifest is NOT CHECKED (exit 3), never a pass.
  mv "$T/gate-manifest.tsv" "$T/kept.tsv"
  ck 3 "a MISSING manifest is NOT CHECKED, not a pass" "$T/gatemanifest.sh" check
  mv "$T/kept.tsv" "$T/gate-manifest.tsv"
  # 7. a malformed row is counted and reported, not skipped in silence.
  printf 'junkrow-no-tab\n' >> "$T/gate-manifest.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  # STRENGTHENED AFTER B's F2: the first version of this case asserted only that a WARNING printed, which is
  # what let the de-requirement through. It now checks all three things that have to be true - the row is
  # named, the count REACHES THE SUMMARY LINE (the carrier verify-log.sh reads), and the exit code is hard.
  if grep -q 'UNREADABLE' <<<"$out" && grep -q '1 unreadable' <<<"$out" && [ "$rc" = 1 ]; then
    echo "PASS selftest: an unreadable row is reported, counted in the summary line, and exits 1"; pass=$((pass+1));
  else echo "FAIL selftest: an unreadable row did not reach the summary line or did not exit 1 (rc=$rc)"; fail=$((fail+1)); fi
  python3 - "$T/gate-manifest.tsv" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read().replace("junkrow-no-tab\n","")
open(p,'w').write(t)
PY
  # 8. retire REFUSES while the file is still there, so a row cannot be softened ahead of the deletion.
  ck 1 "retire refuses while the gate is still on disk" "$T/gatemanifest.sh" retire 26-invariants.js "testing"
  # 9. retire works once the file is gone, and the row SURVIVES carrying the reason.
  rm -f "$T/regress/26-invariants.js"
  # CT_BUILD AND CT_RUNID ADDED AT #467. This case called retire bare, which is exactly what this file's header
  # has said since #461 (antagonist B's F8) produces an UNATTRIBUTED row - the documented happy path writing a
  # worse row than the tool can write, which is #454's own tell. #467 makes both writing doors REFUSE without them
  # rather than warn, because the floor register is append-only and an 'unknown-run' row in it is permanent. So the
  # case now exercises the path a run is actually told to use. The assertion is unchanged; only the invocation is.
  ck 0 "retire works once the gate is gone" env CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 26-invariants.js "selftest reason"
  if grep -q 'RETIRED at .*selftest reason' "$T/gate-manifest.tsv" && grep -qc '26-invariants' "$T/gate-manifest.tsv"; then
    echo "PASS selftest: the retired row stays in the file, carrying its reason"; pass=$((pass+1))
  else echo "FAIL selftest: the retired row did not keep its reason"; fail=$((fail+1)); fi
  # 10. and a retired gate no longer reddens the check.
  ck 0 "a retired gate no longer reddens the check" "$T/gatemanifest.sh" check
  # 11. THE HOLE THIS BUILD'S OWN ANTAGONIST PASS FOUND. Flipping required->absent by hand, with no reason, used
  #     to give exit 0 and quietly shrink the suite. It is now exit 1.
  rm -f "$T/regress/29-draws.js"
  python3 - "$T/gate-manifest.tsv" <<'PY2'
import sys
p=sys.argv[1]; t=open(p).read()
t=t.replace("29-draws.js\trequired","29-draws.js\tabsent",1)
# strip the reason the way a hand edit that says nothing would
ls=t.split("\n")
for i,l in enumerate(ls):
    if l.startswith("29-draws.js\tabsent"):
        f=l.split("\t"); f[6]="-"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY2
  ck 1 "flipping a row to absent WITH NO REASON is still a hard failure" "$T/gatemanifest.sh" check
  # 12. AND #467 REVERSED THIS CASE'S VERDICT ON PURPOSE, SO READ WHY BEFORE "FIXING" IT BACK.
  #     As written at #461 this asserted exit 0: "the same flip WITH a reason is accepted", proving that case 11
  #     was keyed to the REASON and not to the state. That contract was the defect. A hand flip from `required` to
  #     `absent` with any reason at all is exactly the two-field edit that de-required
  #     gates/regress/21-review-brilliant.js at exit 0 - measured at #467, 49 required -> 48 - and it is the whole
  #     subject of jobs/nothing-ratchets-the-manifests-required-count-so-the-denominator-is-editable-downward.
  #     So from #467 it is exit 1: the floor catches it even though the row is now well-formed.
  #     THE DISCRIMINATION CASE 11 WAS BUILT FOR IS KEPT, AND MOVED TO THE MESSAGE. The exit code can no longer
  #     tell the two apart, so the assertion now checks WHICH guard fired - unjustified for a reasonless row,
  #     FLOOR BREACHED for a well-formed one. That is the stronger test of the two and it is what case 11 was
  #     really after: the two routes are still distinguished, just not by a number that is now 1 in both.
  #     I did not delete or weaken it. CLAUDE.md: assume an assertion is right until you have proved otherwise -
  #     here what is proved is that its SUBJECT changed, and the change is the point of the build.
  python3 - "$T/gate-manifest.tsv" <<'PY3'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("29-draws.js\tabsent"):
        f=l.split("\t"); f[6]="lives on branch X, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY3
  ck 1 "the same flip WITH a reason is NOW hard too - the floor catches it [#467, was exit 0 at #461]" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'FLOOR BREACHED' <<<"$out" && ! grep -q 'GIVES NO REASON' <<<"$out"; then
    echo "PASS selftest: a well-formed de-requiring flip is caught by the FLOOR, not by the reason check"; pass=$((pass+1))
  else echo "FAIL selftest: the two de-requiring routes are no longer distinguished by their message"; fail=$((fail+1)); fi
  # 15/16. ANTAGONIST B's F2, AND NOTE WHY CASE 7 COULD NOT SEE IT. Case 7 appends a BRAND-NEW junk row and
  #     asserts only that the WARNING prints - it never checks that the gate stopped being required, so it
  #     "disturbed the mechanism without crossing the threshold" (CLAUDE.md), in the one case where the EXIT CODE
  #     is the defect. These two malform an EXISTING required row whose gate is GONE, which is the real shape.
  rm -f "$T/regress/35-width-containment.js"
  python3 - "$T/gate-manifest.tsv" <<'PY4'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("35-width-containment.js\t"): ls[i]=l.replace("\t","    ")
open(p,'w').write("\n".join(ls))
PY4
  ck 1 "a MALFORMED row whose gate is deleted is a hard failure, not a warning" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q '0 missing' <<<"$out" && ! grep -q 'unreadable' <<<"$out"; then
    echo "FAIL selftest: the summary line still claims 0 missing with no unreadable count"; fail=$((fail+1))
  else echo "PASS selftest: the summary line reports the unreadable row rather than claiming 0 missing"; pass=$((pass+1)); fi
  # 17. an unknown subcommand exits 2, so it can never be mistaken for the MISSING code gates.sh branches on.
  ck 2 "an unknown subcommand exits 2, not the MISSING code 1" "$T/gatemanifest.sh" frobnicate
  # 18/19. ANTAGONIST A's DOOR 6: commenting a row out, with the gate deleted. Exit 0 before this was written.
  cp "$T/kept2.tsv" "$T/gate-manifest.tsv" 2>/dev/null || true
  rm -f "$T/regress/41-coach-bubble.js"
  python3 - "$T/gate-manifest.tsv" <<'PY5'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("41-coach-bubble.js\t"): ls[i]="#"+l
open(p,'w').write("\n".join(ls))
PY5
  ck 1 "a COMMENTED-OUT row whose gate is deleted is a hard failure" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'COMMENTED OUT' <<<"$out" && grep -q '41-coach-bubble' <<<"$out"; then
    echo "PASS selftest: the commented-out row is named, not silently uncounted"; pass=$((pass+1))
  else echo "FAIL selftest: a commented-out row was not reported"; fail=$((fail+1)); fi

  # ── #467. THE FLOOR CASES. jobs/nothing-ratchets-the-manifests-required-count... ────────────────────────────
  # THE FILED CASE NAMES THREE INPUTS. They are the cases labelled `# 20.`, `# 21.` and `# 22.` BELOW - SOURCE
  # LABELS, not PASS-line ordinals, and saying which scheme is the whole point of this sentence. Antagonist A
  # measured that #467's commit message called them 21/22/24 (correct by PASS-line ordinal, because three cases
  # emit two PASS lines each) while this comment called them 20/21/22 (correct by source label): both right under
  # their own scheme, neither saying which, 300 lines apart in one build. That is CLAUDE.md's "a count with no
  # scope cannot be checked", and the #461 note about a control count that "DRIFTED ACROSS THREE DOCUMENTS IN ONE
  # BUILD". Every case reference in this file is a SOURCE LABEL. The authority for the TOTAL remains the command's
  # own last line. The rest below are holes found after the filed three passed, which is the part the job could
  # not specify in advance.
  resetT
  # 20. INPUT 1 of the filed case: a tree at the recorded floor is accepted.
  ck 0 "a tree whose required count equals the floor checks clean" "$T/gatemanifest.sh" check
  # 21. INPUT 2 of the filed case, AND IT IS THE DEFECT ITSELF. Delete the gate CLAUDE.md names as the only cover
  # for brilliancy explanations, flip its row to absent, give the reason `x`. Exit 0 before #467, measured.
  rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF1'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="x"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF1
  ck 1 "required DE-REQUIRED one gate below the floor is a hard failure" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'FLOOR BREACHED' <<<"$out" && grep -q '48 required' <<<"$out"; then
    echo "PASS selftest: the breach is named with both numbers, not merely exited on"; pass=$((pass+1))
  else echo "FAIL selftest: a breached floor was not reported with its numbers"; fail=$((fail+1)); fi
  # 22. INPUT 3 of the filed case: the floor must only ever bind DOWNWARD. A tree requiring MORE is fine.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest extra gate' >/dev/null 2>&1
  ck 0 "a tree requiring MORE than the floor is accepted, and sync raised the floor" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q 'floor: 50' <<<"$out"; then echo "PASS selftest: sync raised the floor 49 -> 50"; pass=$((pass+1))
  else echo "FAIL selftest: sync did not raise the floor (got: $out)"; fail=$((fail+1)); fi
  # 23. THE LEGITIMATE DOOR DOWN MUST WORK, or the guard deadlocks and gets switched off.
  rm -f "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 98-extra-gate.js 'selftest: the legitimate route down' >/dev/null 2>&1
  ck 0 "a LEGITIMATE retire lowers the floor and leaves the tree clean" "$T/gatemanifest.sh" check
  # 24. ABSENT REGISTER -> NOT CHECKED, exit 3, and the token in the summary line must be unparseable to the push
  #     gate. Never a pass, and never silently a pass either.
  mv "$T/gate-required-floor.tsv" "$T/floor.hidden"
  ck 3 "an ABSENT floor register is NOT CHECKED (exit 3), not a pass" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'NOT-CHECKED floor' <<<"$out"; then echo "PASS selftest: the summary line carries the NOT-CHECKED token the push gate refuses"; pass=$((pass+1))
  else echo "FAIL selftest: an absent register did not reach the summary line"; fail=$((fail+1)); fi
  mv "$T/floor.hidden" "$T/gate-required-floor.tsv"
  # 25. THE CHAIN. Deleting an INTERIOR row is the attack the chain field exists for, and it needs no git.
  # THE FIXTURE BUILDS ITS OWN THREE ROWS, and antagonist A's non-veto note is why. It used to carry
  # `assert len(rows)>=3` and rely on earlier cases having left three rows behind: when that precondition tripped,
  # python died, the case reported "a broken chain was not reported", and the REAL cause - the fixture could not be
  # built - appeared nowhere. A measured exactly that on a weakened tree: 31/4, with two of the four failing for
  # reasons other than their subject. This file's own resetT comment says a control that fails for a reason other
  # than its subject is not a failing control but an unreadable one, so the fixture no longer depends on history:
  # it syncs twice to make three rows, which also exercises the writer rather than hand-forging the chain.
  resetT
  : > "$T/regress/98-x1.js"; CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'first extra' >/dev/null 2>&1
  : > "$T/regress/98-x2.js"; CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'second extra' >/dev/null 2>&1
  nrows=$(grep -vc '^[[:space:]]*#' "$T/gate-required-floor.tsv" || true)
  if [ "${nrows:-0}" -lt 3 ]; then
    echo "FAIL selftest: FIXTURE could not be built - wanted 3 floor rows, got ${nrows:-0}. The interior-deletion"
    echo "      case did not run, and that is a fixture failure, NOT a verdict about the chain check."
    fail=$((fail+1))
  else
  python3 - "$T/gate-required-floor.tsv" <<'PYF2'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l and not l.lstrip().startswith("#")]
del ls[rows[1]]
open(p,'w').write("\n".join(ls))
PYF2
  # EXIT 1, NOT 3, FROM #467's SECOND PASS [antagonist A]. A corrupt register is positive evidence somebody wrote
  # into the file wrongly, not a maybe-stale checkout, so it is HARD and the suite does not run. Only an ABSENT
  # register (or one with no rows) stays at 3. The verdict changed deliberately; the assertion is not weakened.
  ck 1 "a DELETED INTERIOR floor row breaks the chain and is HARD" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'BROKEN CHAIN' <<<"$out"; then echo "PASS selftest: the broken chain is named"; pass=$((pass+1))
  else echo "FAIL selftest: a broken chain was not reported"; fail=$((fail+1)); fi
  fi
  # 26. A COMMENTED-OUT floor row is a hidden lowering - antagonist A's door 6, at the second file.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest extra gate again' >/dev/null 2>&1
  python3 - "$T/gate-required-floor.tsv" <<'PYF3'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l and not l.lstrip().startswith("#")]
ls[rows[-1]]="#"+ls[rows[-1]]
open(p,'w').write("\n".join(ls))
PYF3
  ck 1 "a COMMENTED-OUT floor row is a hidden lowering, and is HARD" "$T/gatemanifest.sh" check
  # 27. A `lower` row that names NO GATE in field 8 is refused. This replaces #467's first-version case, which
  #     tested a 12-character length bar on the reason - an instrument antagonist B showed was wrong in both
  #     directions, so it was removed rather than tuned. The structural test is what stands.
  resetT
  # #468: field 9 (the required-set digest) appended to this fixture row. It had 7-8 fields, and #468's
  # floorread now refuses a row whose field 9 is not 12 hex - so WITHOUT this the row is refused for its FORMAT
  # before the arm under test ever runs. The `ck 1` still passed (exit 1 either way) and the MESSAGE assertion is
  # what caught it: 'the two-file disagreement was not named'. A wrong reason reaching the right verdict is a
  # trap, not a check (CLAUDE.md, #419), and here the selftest caught it on its author.
  printf '48\t49\tlower\t2026-10-02\t467\tselftest\tdropping the brilliancy gate\t-\taaaaaaaaaaaa\n' >> "$T/gate-required-floor.tsv"
  ck 1 "a 'lower' row naming no gate in field 8 is refused (hard)" "$T/gatemanifest.sh" check
  # 28. ANTAGONIST B's F2, THE HAND-APPENDED `lower` ROW. Appending is neither editing nor deleting, so the chain
  #     field had nothing to say about it and the first version accepted it at exit 0 - while the breach message
  #     claimed hand-lowering would not work. Now the row must name a gate the MANIFEST records as `retired`.
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF4'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF4
  # #468: field 9 (the required-set digest) appended to this fixture row. It had 7-8 fields, and #468's
  # floorread now refuses a row whose field 9 is not 12 hex - so WITHOUT this the row is refused for its FORMAT
  # before the arm under test ever runs. The `ck 1` still passed (exit 1 either way) and the MESSAGE assertion is
  # what caught it: 'the two-file disagreement was not named'. A wrong reason reaching the right verdict is a
  # trap, not a check (CLAUDE.md, #419), and here the selftest caught it on its author.
  printf '48\t49\tlower\t2026-10-02\t467\tselftest\tdropping the brilliancy gate\t21-review-brilliant.js\taaaaaaaaaaaa\n' >> "$T/gate-required-floor.tsv"
  ck 1 "a hand-appended 'lower' whose gate is 'absent' and not 'retired' in the manifest is refused (hard)" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q "not 'retired'" <<<"$out"; then echo "PASS selftest: the refusal names the manifest state it found instead"; pass=$((pass+1))
  else echo "FAIL selftest: the two-file disagreement was not named"; fail=$((fail+1)); fi
  # 29. ANTAGONIST B's F1, THE VETO. `retire` must lower by EXACTLY ONE and REFUSE when more than one gate has
  #     left, naming the others. The first version lowered the floor to whatever the tree required, so three
  #     removals plus one retire took the floor 49 -> 46 at exit 0, and twenty removals took it to 29.
  resetT
  for g in 21-review-brilliant.js 26-invariants.js 47-menu.js; do
    rm -f "$T/regress/$g"
    python3 - "$T/gate-manifest.tsv" "$g" <<'PYF5'
import sys
p,g=sys.argv[1],sys.argv[2]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith(g+"\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF5
  done
  ck 1 "three gates de-required is a breach before any retire" "$T/gatemanifest.sh" check
  out="$(CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && grep -q 'FLOOR NOT LOWERED' <<<"$out" && grep -q '26-invariants' <<<"$out"; then
    echo "PASS selftest: retire REFUSES to account for three removals with one row, and names the others (exit $rc)"; pass=$((pass+1))
  else echo "FAIL selftest: one retire still absorbed three removals (exit $rc)"; echo "$out" | sed 's/^/      /' | tail -6; fail=$((fail+1)); fi
  ck 1 "and the tree is STILL a breach afterwards, so no green is reachable" "$T/gatemanifest.sh" check
  # 30. THE FLOOR STILL READS 49 AFTER THAT ATTEMPT - the register was not written at all.
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q 'floor: 49' <<<"$out"; then echo "PASS selftest: the refused retire wrote NO floor row (still 49)"; pass=$((pass+1))
  else echo "FAIL selftest: the refused retire wrote a row anyway ($out)"; fail=$((fail+1)); fi
  # 31. AND THE LEGITIMATE ROUTE STILL WORKS, one gate at a time. If this is red the guard deadlocks and gets
  #     switched off, which is the failure mode that matters more than any attack.
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' >/dev/null 2>&1
  ck 0 "ONE removal plus ONE retire is clean, and the floor is 48" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q 'floor: 48' <<<"$out"; then echo "PASS selftest: the legitimate retire lowered the floor by exactly one"; pass=$((pass+1))
  else echo "FAIL selftest: the legitimate retire did not lower the floor ($out)"; fail=$((fail+1)); fi
  # 32. ANTAGONIST B's F3, THE ARITHMETIC INVARIANT. A DUPLICATE row pads `required` back up over a deleted gate,
  #     so the line reads "49 required, 48 present, 0 missing" - contradicting itself - and the first version
  #     exited 0, letting the suite spend 44 minutes and emit GATES GREEN. verify-log.sh had this since #461;
  #     this file did not.
  resetT; rm -f "$T/regress/26-invariants.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF6'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("26-invariants.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
open(p,'a').write("10-gameover.js\trequired\t467\t2026-10-02\tselftest\tpadding\t-\n")
PYF6
  # #468, ANTAGONIST B's F4: the backticks here were COMMAND SUBSTITUTION inside a double-quoted string, so
  # `selftest` printed 'gates/gatemanifest.sh: line NNN: required: command not found' between two PASS lines,
  # the case label lost the word the case is about, and it was NOT counted as a failure. Worse, CLAUDE.md records
  # that the case register is GENERATED from this command's output, so the corruption had already been committed:
  # claude/stories/TEST-CASES.md carried 'a DUPLICATE row padding  over a deleted gate' with the double space.
  # Pre-existing at #467; #468 is the commit that would have landed it on main. Single-quoted now.
  ck 1 'a DUPLICATE row padding `required` over a deleted gate is a hard failure' "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'DOES NOT ADD UP' <<<"$out" && grep -q 'uniq -d' <<<"$out"; then
    echo "PASS selftest: the arithmetic failure is named AND the duplicate-row remedy is printed"; pass=$((pass+1))
  else echo "FAIL selftest: the arithmetic contradiction was not reported"; fail=$((fail+1)); fi
  # 33. ANTAGONIST B's F4. The append-only register must never carry `unknown-run`. Both writing doors refuse.
  resetT; : > "$T/regress/98-extra-gate.js"
  out="$(env -u CT_RUNID -u CT_BUILD "$T/gatemanifest.sh" sync 'covers the new thing' 2>&1)"
  # The expected string changed with the fix and this control caught the drift rather than hiding it: the refusal
  # moved from inside floorwrite (after the manifest was already written) to a guard at the top of the command, so
  # the wording moved with it. Asserting the BEHAVIOUR - a non-zero exit and nothing written - rather than only the
  # old sentence, so the next person to move the message does not have to find this line.
  if [ -n "$out" ] && grep -q 'CT_BUILD and CT_RUNID' <<<"$out" && ! grep -q '98-extra-gate.js' "$T/gate-manifest.tsv"; then
    echo "PASS selftest: sync REFUSES before touching either file when CT_BUILD/CT_RUNID are unset"; pass=$((pass+1))
  else echo "FAIL selftest: sync wrote something with no CT_RUNID"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
  # SCOPED TO ROWS, NOT TO THE FILE. The first version grepped the whole file and went red against a clean
  # register, because this file's own HEADER now contains the words "unknown / unknown-run fallback" while
  # describing the defect. A control that reads documentation and reports it as data is CLAUDE.md's "a bad
  # selector is a reading" at the cheapest possible scale, and it went red the one time it ran.
  # #468: herestring, not a pipe - `grep -qE` exits on first match and SIGPIPEs the upstream `grep -v` under
  # `set -o pipefail` (line 46), so the `!` can report PASS over the very row it looks for. LATENT, not observed:
  # it needs the upstream to BLOCK on a full ~64KB pipe buffer, and this register is far smaller - see the
  # measurement in gates/gates.sh above (race, 5 of 30 trials at 64KB; 502 bytes in practice today).
  if ! grep -qE 'unknown-run' <<<"$(grep -v '^[[:space:]]*#' "$T/gate-required-floor.tsv")"; then
    echo "PASS selftest: and no 'unknown-run' row reached the register"; pass=$((pass+1))
  else echo "FAIL selftest: an 'unknown-run' row is in the append-only register"; fail=$((fail+1)); fi
  # 34. A `raise` row that does not raise is refused - the arithmetic must mean what the kind says.
  resetT
  # #468: field 9 (the required-set digest) appended to this fixture row. It had 7-8 fields, and #468's
  # floorread now refuses a row whose field 9 is not 12 hex - so WITHOUT this the row is refused for its FORMAT
  # before the arm under test ever runs. The `ck 1` still passed (exit 1 either way) and the MESSAGE assertion is
  # what caught it: 'the two-file disagreement was not named'. A wrong reason reaching the right verdict is a
  # trap, not a check (CLAUDE.md, #419), and here the selftest caught it on its author.
  printf '40\t49\traise\t2026-10-02\t467\tselftest\tthis does not raise anything at all\t-\taaaaaaaaaaaa\n' >> "$T/gate-required-floor.tsv"
  ck 1 "a 'raise' row that lowers the floor is refused (hard)" "$T/gatemanifest.sh" check
  # 35. A `lower` row that drops by MORE than one is refused even when it names a retired gate - the "exactly one"
  #     rule is what makes the register's row count the number of retirements.
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' >/dev/null 2>&1
  # #468: field 9 (the required-set digest) appended to this fixture row. It had 7-8 fields, and #468's
  # floorread now refuses a row whose field 9 is not 12 hex - so WITHOUT this the row is refused for its FORMAT
  # before the arm under test ever runs. The `ck 1` still passed (exit 1 either way) and the MESSAGE assertion is
  # what caught it: 'the two-file disagreement was not named'. A wrong reason reaching the right verdict is a
  # trap, not a check (CLAUDE.md, #419), and here the selftest caught it on its author.
  printf '45\t48\tlower\t2026-10-02\t467\tselftest\tdropping several at once\t21-review-brilliant.js\taaaaaaaaaaaa\n' >> "$T/gate-required-floor.tsv"
  ck 1 "a 'lower' row dropping more than one is refused even with a named retired gate (hard)" "$T/gatemanifest.sh" check
  # 36. A row appended with NO TRAILING NEWLINE must still be read. This file shape has eaten this bug three times
  #     in this project; a raise that is invisible silently UN-DOES itself.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest no-newline case' >/dev/null 2>&1
  printf '%s' "$(cat "$T/gate-required-floor.tsv")" > "$T/floor.nonl" && mv "$T/floor.nonl" "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q 'floor: 50' <<<"$out"; then echo "PASS selftest: a final row with no trailing newline is still read"; pass=$((pass+1))
  else echo "FAIL selftest: the last floor row was lost without a trailing newline (got: $out)"; fail=$((fail+1)); fi
  # 37. AND THE WRITER MUST NOT CORRUPT SUCH A FILE: appending must not join two rows into one.
  rm -f "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" retire 98-extra-gate.js 'appending after a newline-less row' >/dev/null 2>&1
  ck 0 "appending after a newline-less row does not join two rows" "$T/gatemanifest.sh" check

  # ── ANTAGONIST A's VETO CASES, #467. Both reproduce A's measurement and both were live before these fixes.
  # 38. A's 5.2: ONE LEADING SPACE made a row invisible to the replay, with no FLOORBAD - so a raise could be
  #     un-done and the gates it paid for de-required, at exit 0, bypassing every structural test rather than
  #     defeating one. The `#` form of the same attack was already caught, which is what made this worth a veto.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest indent case' >/dev/null 2>&1
  python3 - "$T/gate-required-floor.tsv" <<'PYF7'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l and not l.lstrip().startswith("#")]
ls[rows[-1]]=" "+ls[rows[-1]]
open(p,'w').write("\n".join(ls))
PYF7
  ck 1 "an INDENTED floor row is HARD, not silently skipped [A's 5.2]" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'INDENTED' <<<"$out"; then echo "PASS selftest: the indented row is named"; pass=$((pass+1))
  else echo "FAIL selftest: an indented row was not reported"; fail=$((fail+1)); fi
  # 39. AND A GENUINELY BLANK LINE MUST STILL BE IGNORED. My first fix for 38 broke this, turning a line of spaces
  #     into "unreadable floor row (no tab)" and exit 3 - a guard that fires on the normal case gets switched off.
  resetT; printf '\n   \n\t\n  \t \n' >> "$T/gate-required-floor.tsv"
  ck 0 "blank and whitespace-only lines are still ignored" "$T/gatemanifest.sh" check
  # 40. A's 5.1, THE DEEPEST ONE: the floor guarded the COUNT, so promoting a known-absent row and touching a stub
  #     paid for a real gate being de-required. The count, the floor and EVERY OTHER FIELD of the carrier line came
  #     out byte-identical to an honest tree's, and verify-log.sh returned OK. The required-SET digest closes it.
  resetT
  : > "$T/regress/50-drill-verdict-no-jump.js"; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF8'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("50-drill-verdict-no-jump.js\t"):
        f=l.split("\t"); f[1]="required"; ls[i]="\t".join(f)
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="moved to the drill suite, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF8
  ck 1 "a SWAP at constant count and constant floor is a hard failure [A's 5.1]" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'REQUIRED-SET DIGEST CHANGED' <<<"$out"; then echo "PASS selftest: the swap is caught by the SET digest, which the count cannot see"; pass=$((pass+1))
  else echo "FAIL selftest: the swap was not caught"; fail=$((fail+1)); fi
  # 41. AND THE CARRIER LINE MUST DIFFER, or the push gate has nothing to read even in principle - which was the
  #     whole force of A's finding. Measured as a string comparison against the honest tree's line.
  # #468: herestring, not a pipe (one of #467's own three, added in the same build that filed the finding).
  honest="$(resetT; _o="$("$T/gatemanifest.sh" check 2>/dev/null || true)"; grep -m1 '^gate manifest:' <<<"$_o" || true)"
  resetT; : > "$T/regress/50-drill-verdict-no-jump.js"; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF9'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("50-drill-verdict-no-jump.js\t"):
        f=l.split("\t"); f[1]="required"; ls[i]="\t".join(f)
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="moved to the drill suite, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF9
  # #468: herestring, not a pipe (#467's own).
  attacked="$(_o="$("$T/gatemanifest.sh" check 2>/dev/null || true)"; grep -m1 '^gate manifest:' <<<"$_o" || true)"
  # #468 added the `-n "$attacked"` arm on antagonist A's F8. The `-n "$honest"` guard was already correct and
  # already defeats the `|| true` this build added to both captures. But with no guard on the other side, a tree
  # whose `check` emitted NO carrier line at all would satisfy `honest != ""` and print "PASS ... the carrier
  # line DIFFERS" when there was no line to differ. Shielded in practice by TC-40 immediately above, which
  # reddens first on a total crash - but a control that can pass on a condition it does not test is the thing
  # this whole file exists to prevent.
  if [ -n "$honest" ] && [ -n "$attacked" ] && [ "$honest" != "$attacked" ]; then
    echo "PASS selftest: the carrier line DIFFERS on a swapped set (it was byte-identical before #467's digest)"; pass=$((pass+1))
  else echo "FAIL selftest: the carrier line is still byte-identical on a swapped set"; fail=$((fail+1)); fi
  # 42. A SWAP THROUGH sync ALONE IS REFUSED, so the legitimate route for a swap is both doors, one row each.
  resetT
  : > "$T/regress/50-drill-verdict-no-jump.js"; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYFA'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="moved to the drill suite, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYFA
  out="$(CT_BUILD=#467 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'the drill gate arrives' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && grep -q 'required SET has changed but the COUNT has not' <<<"$out"; then
    echo "PASS selftest: sync REFUSES a swap and sends you to the leaving door (exit $rc)"; pass=$((pass+1))
  else echo "FAIL selftest: sync accepted a swap at constant count (exit $rc)"; echo "$out" | sed 's/^/      /' | tail -5; fail=$((fail+1)); fi
  resetT

  # ── #468, ANTAGONIST B's VETO (F1), ITEM 3. TWO CASES OVER THE FIELD NOTHING VALIDATED. ───────────────────────
  # B's whole attack was one character in field 9 of the single seed row, and the tell that it was reachable is
  # that `selftest` said 55/0 straight through it. These two are why it now says 57 and why it would have gone red.
  # 56. THE `-` SENTINEL IS NOT A LEGITIMATE VALUE. It used to mean "this register predates the digest"; no such
  #     register exists (the file was created at #467 and its seed row names 467 in field 5), so the sentinel was
  #     an off switch for the strongest arm the push gate has.
  python3 - "$T/gate-required-floor.tsv" <<'PYFB'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l and not l.startswith("#") and "\t" in l:
        f=l.split("\t")
        if len(f)>=9: f[8]="-"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYFB
  ck 1 "a floor row whose required-set digest (field 9) is the '-' sentinel is a HARD failure, not a silently skipped set check [B's F1 on #468]" "$T/gatemanifest.sh" check
  # 57. AND THE SAME ROW WITH JUNK IN FIELD 9, because the repair must be a format test and not a special case
  #     for one character. `floorread` requires exactly 12 hex.
  python3 - "$T/gate-required-floor.tsv" <<'PYFC'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l and not l.startswith("#") and "\t" in l:
        f=l.split("\t")
        if len(f)>=9: f[8]="zzzz"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYFC
  ck 1 "a floor row whose field 9 is not 12 hex characters is a HARD failure (the repair is a FORMAT test, not a special case for one sentinel)" "$T/gatemanifest.sh" check
  resetT
  # 58. THE CONTROL ON THE CONTROLS: with field 9 restored to a real digest, the identical tree is clean again, so
  #     cases 56 and 57 are about the field and not about something else the reset happened to change.
  ck 0 "and with field 9 a real digest again, the same tree is clean - so 56 and 57 pin the FIELD" "$T/gatemanifest.sh" check
  resetT

  echo "selftest: $pass passed, $fail failed"
  [ "$fail" -eq 0 ] || exit 1
  exit 0
  ;;
*)
  echo "  (on sync and retire, set CT_BUILD=#NNN and CT_RUNID=<your runId> or the row records 'unknown')"
  # EXIT 2, NOT 1, and the number matters [antagonist B's F3 on #461, corrected]. B reported this as exit 0 and
  # MEASURED it is exit 1, so it never was a false-pass route - it fails CLOSED. But 1 is the code gates.sh keys
  # on for "a required gate is MISSING", so a mistyped subcommand made the suite stop and blame the manifest,
  # which is a wrong reason reaching a right verdict - the thing this project calls a trap rather than a check.
  # gates/buildnum.sh and gates/held.sh both exit 2 on an unknown subcommand; this now matches them.
  echo "usage: gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | floor | selftest"; exit 2;;
esac
