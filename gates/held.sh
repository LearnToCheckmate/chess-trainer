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
#                                              The sourceMd5 7th field is COMPUTED from the working tree's
#                                              chess.jsx - the file the run just built from. Override it with
#                                              CT_SRCMD5=<12 hex> when the held source is not the working tree
#                                              (git show <gatedSha>:chess.jsx | md5sum | cut -c1-12).
#
# WHY `add` COMPUTES THE 7TH FIELD INSTEAD OF ASKING. It used to write '-' and tell the run to fill it in by
# hand, which made the STRONGEST key opt-in. Measured 2026-10-02 over the register's live rows: one of eight
# read '-' (#456's). That matters because of what the other two keys cannot survive: gates/build.sh:14 embeds
# $(TZ=America/New_York date '+%Y-%m-%d %H:%M') in the stamp via --define:__BUILD__, so ANY rebuild of a held
# source tree in a new minute produces a fresh bundle md5 AND a fresh sha and matches neither of the first two
# keys. sourceMd5 is the only one of the three that survives a rebuild, and it is the arm `check` uses against
# the working tree. A row written with it empty looks complete - all seven fields present - and silently has no
# rebuild protection at all, which is the exact evasion the field was added at #450 to close.
# jobs/held-sh-add-leaves-the-only-rebuild-proof-key-empty-2026-10-02.
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
    # THE 7TH FIELD IS COMPUTED, NOT ASKED FOR. See the header: it is the only key that survives a rebuild, and
    # leaving it to the operator made it opt-in on the one row that most needed it. An explicit CT_SRCMD5 still
    # wins, for the case where the held source is not the working tree - validated the same way MD5 is, because
    # an unvalidated override is just a slower way of writing a row that matches nothing.
    if [ -n "${CT_SRCMD5:-}" ]; then
      SRCMD5="$(printf '%s' "$CT_SRCMD5" | tr 'A-F' 'a-f')"
      case "$SRCMD5" in *[!0-9a-f]*) echo "held.sh add: CT_SRCMD5 '$SRCMD5' is not hex"; exit 2;; esac
      if [ "${#SRCMD5}" -lt 8 ] || [ "${#SRCMD5}" -gt 12 ]; then
        echo "held.sh add: CT_SRCMD5 '$SRCMD5' is ${#SRCMD5} chars; it must be 8-12 to match what \`check\`"
        echo "  computes (\`md5sum chess.jsx | cut -c1-12\`), or the row can never match anything."; exit 2; fi
      SRCWHY="from CT_SRCMD5"
    elif [ -r "$ROOT/chess.jsx" ]; then
      SRCMD5="$(md5sum "$ROOT/chess.jsx" | cut -c1-12)"; SRCWHY="computed from $ROOT/chess.jsx"
    else
      SRCMD5="-"; SRCWHY="UNAVAILABLE"
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$MD5" "$SHA" "$BUILD" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "$REASON" "$SRCMD5" >> "$REG"
    if [ "$SRCMD5" = "-" ]; then
      echo "held.sh add: WARNING - chess.jsx is not readable at $ROOT, so the sourceMd5 field is '-' and this"
      echo "  row has NO rebuild protection: a later run that rebuilds this source tree gets a fresh bundle md5"
      echo "  and a fresh sha and will match neither key. Fill field 7 in, or re-run with CT_SRCMD5=<12 hex>."
    else
      echo "held.sh add: sourceMd5 $SRCMD5 ($SRCWHY)."
    fi
    echo "held.sh: recorded $BUILD bundle $MD5 sha $SHA. COMMIT THIS TO MAIN, not to the per-run branch -"
    echo "  a row on a branch that never merges is the failure this register was written for." ;;
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
