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
[ -f "$REG" ] || { echo "held.sh: no register at $REG"; exit 2; }

# TWO ROW FILTERS, AND ANTAGONIST A ON #450 FOUND WHY ONE IS NOT ENOUGH. `live_rows` required NF>=6, so a row
# missing its reason made verify-log.sh REFUSE (exit 1) while `held.sh check` answered "not held" (exit 0) - the
# documented query tool disagreeing with the enforcing tool about the same register, which is worse than either
# verdict alone. match_rows keeps only what the MATCH needs (two keys); live_rows stays for `list`, where a row
# with no reason is a defect worth seeing.
match_rows() { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=2 && $1 !~ /^-/'; }
live_rows()  { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=6 && $1 !~ /^-/'; }

case "${1:-}" in
  check)
    KEY="${2:-}"
    if [ -z "$KEY" ]; then
      KEY="$(md5sum "$ROOT/app.js" 2>/dev/null | cut -c1-12)"
      [ -n "$KEY" ] || { echo "held.sh check: cannot read $ROOT/app.js and no key given"; exit 2; }
      echo "held.sh check: no key given, using app.js on disk -> md5 $KEY"
    fi
    # Field 2 is a COMMA-SEPARATED list of every sha that names the tree, not just the gated one. Antagonist B
    # found why: with only #441's gated sha on the row, `check e765135` - the sha actually pushed and reverted -
    # answered "not held, exit 0". Also guards a key under 8 hex, which as a prefix test would match everything.
    KEY="$(printf '%s' "$KEY" | tr 'A-F' 'a-f')"
    HIT="$(match_rows | awk -F'\t' -v k="$KEY" '
      { m=tolower($1); gsub(/[ \r]/,"",m)
        if (length(m)>=8 && length(m)<=12 && substr(k,1,length(m))==m) { print; exit }
        n=split(tolower($2), SH, ",")
        for (i=1;i<=n;i++) { gsub(/[ \r]/,"",SH[i])
          if (length(SH[i])>=7 && (SH[i]==k || substr(SH[i],1,7)==substr(k,1,7))) { print; exit } } }')"
    # THE SOURCE KEY. bundleMd5 and gatedSha both identify an ARTEFACT: gates/build.sh embeds a minute-resolution
    # timestamp in the stamp, so a REBUILD of a held source tree gets a fresh md5 and a fresh sha and matches
    # neither. This is the one place that can close that, because it is the one place that looks at the WORKING
    # TREE rather than at a log. Checked only when the first two keys missed, so a direct hit still reports as one.
    if [ -z "$HIT" ] && [ -r "$ROOT/chess.jsx" ]; then
      SRC="$(md5sum "$ROOT/chess.jsx" | cut -c1-12)"
      HIT="$(match_rows | awk -F'\t' -v s="$SRC" '{ if (NF>=7) { p=tolower($7); gsub(/[ \r]/,"",p); if (p != "-" && length(p)>=8 && length(p)<=12 && substr(s,1,length(p))==p) { print; exit } } }')"
      if [ -n "$HIT" ]; then
        echo "HELD BY SOURCE: chess.jsx on disk is md5 $SRC, which matches a held row's sourceMd5."
        echo "  The BUNDLE md5 and the gated sha did NOT match, so this is a REBUILD of a held source tree -"
        echo "  a new artefact built from source a previous run refused to ship. That is the one evasion the"
        echo "  other two keys cannot see; see the note in held-trees.tsv."
        printf '  build:  %s   held at %s by %s\n' "$(printf '%s' "$HIT" | cut -f3)" "$(printf '%s' "$HIT" | cut -f4)" "$(printf '%s' "$HIT" | cut -f5)"
        printf '  why:    %s\n' "$(printf '%s' "$HIT" | cut -f6)"
        exit 1
      fi
    fi
    if [ -n "$HIT" ]; then
      echo "HELD: $KEY matches a row on the register."
      printf '  build:  %s   held at %s by %s\n' "$(printf '%s' "$HIT" | cut -f3)" "$(printf '%s' "$HIT" | cut -f4)" "$(printf '%s' "$HIT" | cut -f5)"
      printf '  bundle: %s   gated sha: %s\n' "$(printf '%s' "$HIT" | cut -f1)" "$(printf '%s' "$HIT" | cut -f2)"
      printf '  why:    %s\n' "$(printf '%s' "$HIT" | cut -f6)"
      exit 1
    fi
    echo "not held: $KEY is on no live row of $(basename "$REG") ($(match_rows | wc -l | tr -d ' ') matchable row(s) checked)"
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
    MD5="$(printf '%s' "$MD5" | tr 'A-F' 'a-f')"; SHA="$(printf '%s' "$SHA" | tr 'A-F' 'a-f')"
    case "$MD5" in *[!0-9a-f]*) echo "held.sh add: bundle md5 '$MD5' is not hex"; exit 2;; esac
    if [ "${#MD5}" -lt 8 ] || [ "${#MD5}" -gt 12 ]; then
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
