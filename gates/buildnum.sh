#!/usr/bin/env bash
# gates/buildnum.sh - issue and query gates/build-numbers.tsv, the register of build numbers already used.
#
# WHY THIS EXISTS. The build number is the key the whole record hangs on: flags, gate logs, RUN-LOG rows, case
# results, the dashboard and every "shipped at #NNN" claim key off it. It was chosen by each run from what that
# run could see, so two runs that could not see each other chose the SAME one - and "#416" now names two
# different trees, measured here rather than repeated: claude/agents/gatelogs/416-main-all.log records bundle
# md5 b2ab30ff6784 at 1916 PASS and 416-branch-all.log records 69b903f2b0ca at 1938 PASS, both ending
# "GATES GREEN #416". That is why two gate logs collided on a filename, and it is why a flag can truthfully say
# "36 controlled suites at #416" about a tree that does not ship.
#   jobs/mint-build-numbers-from-one-place, point 1. A register makes a repeat STRUCTURALLY IMPOSSIBLE rather
#   than merely unlikely, and `check` makes asking the question cost nothing.
#
#   gates/buildnum.sh check <#NNN>   is this number on the register AT ALL? A QUERY, for a reader or an audit.
#                                    exit 0 = absent, 1 = present (prints every row), 2 = usage.
#   gates/buildnum.sh stampable <#NNN>   MAY THIS RUN STAMP IT? The predicate gates/build.sh uses.
#                                    exit 0 = yes, 1 = no (says who holds it), 2 = usage. Needs CT_RUNID.
#
# THESE ARE TWO DIFFERENT QUESTIONS AND CONFLATING THEM BROKE THE HAPPY PATH (#454, antagonist B). build.sh
# first called `check`, which is true of ANY row - including the `minted` row that `mint` had just written for
# this very run. So the documented sequence, mint then build, DEADLOCKED: the build refused the number it had
# just been issued, and the remedy it printed was "mint a fresh one", which loops for ever. The only escape that
# wrote a bundle was CT_RENUM=1, which build.sh's own header forbids and which left a permanent second row.
# The tell that the path had never been run: this register shipped with ZERO `minted` rows, so #454 itself was
# hand-picked - the only route that worked was the one the tool told you not to use.
# The same conflation also refused the MID-RUN REBUILD, which this register's own header calls the median
# behaviour of any number whose run needed a fix: build.sh wrote a `built` row and then read it back as a
# reason to refuse itself. The check and the thing being checked were the same object, for the ninth time in
# this project's record.
# So `stampable` asks the question that actually matters - IS THIS NUMBER MINE? - and it is the only one
# build.sh consults.
#   gates/buildnum.sh next           print the next free number (highest issued + 1). Reads, never writes.
#   gates/buildnum.sh mint <note>    take the next free number AND record it, in one step. Prints "#NNN".
#   gates/buildnum.sh add <#NNN> <state> <sha> <bundleMd5> <note...>    record a number by hand.
#                                    state: minted | issued | built | shipped | held | abandoned (issued =
#                                    used, final
#                                    disposition not established). sha and bundleMd5 may be '-'.
#                                    CT_SRCMD5 sets the sourceMd5 field; CT_RUNID is REQUIRED.
#   gates/buildnum.sh record <#NNN> <bundleMd5> <sourceMd5>
#                                    append a `built` row. gates/build.sh calls this itself after a successful
#                                    bundle, so every number RESOLVES to the artefacts stamped with it.
#   gates/buildnum.sh list           every row, newest number last, notes in full.
#   gates/buildnum.sh sweep [--add]  AUDIT THE REGISTER AGAINST THE COMMIT HISTORY: every #NNN named by a
#                                    commit subject on any ref that is NOT on the register. --report (the
#                                    default) prints and exits 3 if any are absent; --add records them as
#                                    `issued`. Needs CT_RUNID to write, and REFUSES to write from a
#                                    shallow clone. Always prints the commit and ref count it measured
#                                    over, because a shallow clone finds fewer missing and so reports a
#                                    falsely clean sweep - the backfill was a snapshot, this keeps it true.
#
# POINT 2 OF THE JOB BRIEF IS DELIVERED HERE AND NOT IN THE STAMP, AND THAT IS A CORRECTION TO THE BRIEF RATHER
# THAN A SHORTCUT. The brief asks that "the stamp carries the REF, not just the number", offering `#422
# (main@<sha>)`; a later note on the same job offers the cheaper `#439 (0099cb78)`, the bundle md5, and calls it
# "smaller than this job's point 1 and could land on its own". Quoting both, because this project's rule is to
# quote all of a source and say which part you acted on.
# THE SHA FORM CANNOT WORK AT ALL: the commit that will carry the bundle does not exist when esbuild runs.
# THE MD5 FORM IS HARDER THAN IT LOOKS BUT IS NOT IMPOSSIBLE, AND THE FIRST VERSION OF THIS PARAGRAPH SAID IT
# WAS - corrected here after #454's antagonist A refused the claim. Naively it is a fixed point, since embedding
# the md5 changes it; but the standard escape is to hash over the bundle with the checksum field excluded or
# zeroed, which is how ELF and firmware checksums work, and `--define:__BUILD_MD5__="000..0"` plus a post-hash
# over the bundle-minus-that-literal is a day's work rather than a contradiction. The paragraph also refuted its
# own strong form two sentences later by conceding `(src <md5>)` is possible. So the honest reason the stamp is
# not the carrier is COST AND BLAST RADIUS, not impossibility.
# What IS trivially knowable at build time is the SOURCE md5 - the key #450 established as the only one that
# survives a rebuild, already the seventh field of gates/held-trees.tsv. So the resolvable triple is recorded
# HERE, in a committed file, at the moment of the build, and the bundle does not change by one byte.
# THE STAMP COULD STILL CARRY `(src <md5>)` LATER, and it needs its own run and its own control, because it
# moves every bundle md5 in the project and THREE places parse the stamp, not the two this comment first named:
# gates/lib.js:113 is the actual regex parser (/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/) behind b.stamp()
# and every L.launch provenance print, and it was the one omitted; gates/mountcheck.js:15 does the CT_EXPECT
# startsWith; chess.jsx:7552 does String(__BUILD__).split(' ')[0]. A count with no scope again, in the sentence
# warning about exactly that.
#
# WHAT THIS CANNOT SEE, AND IT IS THE HALF THE #416 COLLISION ACTUALLY NEEDED. This file is in the repository, so
# a run only sees numbers that have been COMMITTED AND PUSHED. Two live containers that have each minted and not
# yet pushed are invisible to each other here - which is exactly the #416 case. The cross-session half is the
# tracker document `buildnumber` on artifact 5326ERvZCZ5tEYRkPavPTF, minted with if_version pinned so the second
# writer BOUNCES instead of duplicating. The two halves cover different holes and neither replaces the other:
# the tracker is the only thing that stops two live runs colliding; this file is the only thing that works with
# no network, survives the tracker being unreachable, and lets gates/build.sh refuse MECHANICALLY at the moment
# of stamping. Use both. If they ever disagree, the HIGHER number is the safe one and the disagreement is a
# finding, because a number issued twice is the defect this register exists to prevent.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REG="$HERE/build-numbers.tsv"
[ -f "$REG" ] || { echo "buildnum.sh: no register at $REG"; exit 2; }

# Field 1 must be a bare number for a row to count. Comments, the header and any malformed line are skipped
# here rather than silently half-matched - held.sh's lesson that a row which LOOKS live and matches nothing is
# worse than no row.
rows() { grep -v '^[[:space:]]*#' "$REG" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/'; }

want_num() { # echoes the bare number, or exits 2. Accepts "#454" and "454" alike.
  local raw="${1:-}" n
  [ -n "$raw" ] || { echo "buildnum.sh: a build number is required, like '#454'" >&2; exit 2; }
  n="${raw#\#}"
  case "$n" in *[!0-9]*|'') echo "buildnum.sh: '$raw' is not a build number" >&2; exit 2;; esac
  if [ "${#n}" -lt 3 ] || [ "${#n}" -gt 4 ]; then
    echo "buildnum.sh: '$raw' is ${#n} digits. Build numbers are 3 or 4, as gates/build.sh and gates/gates.sh" >&2
    echo "  both require (^#[0-9]{3,4}\$). A number outside that can never match a log or a stamp." >&2; exit 2; fi
  printf '%s' "$n"
}

print_rows_for() { rows | awk -F'\t' -v n="$1" '$1==n'; }

# ── THE LOCK, AND WHY A READ-BACK WAS NOT ENOUGH (#454, antagonist A) ────────────────────────────────────────
# The first version of `mint` read the highest number, appended a row, then "read it back" with
#   print_rows_for "$N" | awk '$7==r'   -- rows for this number ATTRIBUTED TO ME
# which asks "did my write land?" and never "am I the only claimant?". Four concurrent mints in one container
# therefore produced FOUR #455s and FOUR exit 0s: each run saw exactly its own row and proceeded to stamp. That
# is the #416 defect reproduced inside the guard written to prevent it, and it is the eighth instance of this
# project's oldest trap - the check and the thing being checked were the same object; here the read-back and the
# write were the same row. Two changes, because either alone is insufficient: the read-modify-append is now
# serialised by a lock, AND the read-back counts rows for the NUMBER (exactly 1) rather than rows for me.
# The lock is mkdir-based with stale takeover, copied in shape from gates/gates.sh:57-73, which shipped at #419
# for this same reason. Never pgrep/pkill here: CLAUDE.md records that both match the asking process's own
# command line, so one hangs and the other kills its own shell.
LOCKD="$HERE/.buildnum.lock"
lock_take() {
  local tries=0
  while ! mkdir "$LOCKD" 2>/dev/null; do
    local holder age
    holder="$(cat "$LOCKD/pid" 2>/dev/null || echo '')"
    if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
      echo "buildnum.sh: taking over a stale lock from dead pid $holder" >&2
      rm -rf "$LOCKD"; continue
    fi
    age=$(( $(date +%s) - $(stat -c %Y "$LOCKD" 2>/dev/null || date +%s) ))
    if [ "$age" -gt 60 ]; then
      echo "buildnum.sh: lock is ${age}s old with holder '$holder'; taking it over" >&2
      rm -rf "$LOCKD"; continue
    fi
    tries=$((tries+1))
    if [ "$tries" -gt 100 ]; then
      echo "buildnum.sh: could not take $LOCKD after $tries tries; another run is minting. Try again." >&2
      return 1
    fi
    sleep 0.1
  done
  printf '%s' "$$" > "$LOCKD/pid" 2>/dev/null || true
  return 0
}
lock_free() { rm -rf "$LOCKD" 2>/dev/null || true; }

# ── A ROW LOST BECAUSE THE FILE DID NOT END IN A NEWLINE (#454, antagonist A) ────────────────────────────────
# `record` appended to a register whose last line had lost its trailing newline. The new row MERGED onto the
# previous one, `rows` saw a single 17-field row, the number became invisible, record exited 0, build.sh printed
# BUILD OK, and the NEXT run's `check` answered "free" - so the number would be stamped twice. git does not
# require the final newline, so an editor save or a merge resolution is one keystroke away from this. Every
# append now goes through append_row, which fixes the newline first.
ensure_nl() { [ -s "$REG" ] || return 0; [ -z "$(tail -c1 "$REG")" ] || printf '\n' >> "$REG"; }
append_row() { ensure_nl; printf '%s\n' "$1" >> "$REG"; }

# ── CT_RUNID IS A FIELD, SO IT IS VALIDATED LIKE ONE (#454, antagonist A) ────────────────────────────────────
# The note was checked for tabs and CT_RUNID was not checked at all, so a NEWLINE in it injected a complete,
# well-formed nine-field row that `rows()` accepted - a permanent fake collision, written by a call that then
# exited 1. A tab shifted every field right.
clean_field() { # <value> <what it is>; echoes it, or exits 2
  local v="$1" what="$2"
  case "$v" in *"	"*|*"
"*) echo "buildnum.sh: $what contains a tab or newline, which would forge or shift register fields" >&2; exit 2;; esac
  printf '%s' "$v"
}
need_runid() {
  [ -n "${CT_RUNID:-}" ] || return 1
  clean_field "$CT_RUNID" "CT_RUNID" >/dev/null || exit 2
  return 0
}
# A number this tool hands out must be one build.sh and gates.sh can accept (^#[0-9]{3,4}$). Without this,
# one `add '#9999'` wedges the series for ever: `next` returns #10000, `mint` hands it out, and build.sh and
# `check` then both refuse it with no escape but hand-editing the register.
in_range() { [ "${#1}" -ge 3 ] && [ "${#1}" -le 4 ]; }

show_row() { # one row on stdin fields: number state sha bundleMd5 sourceMd5 at mintedBy provenance note
  local r="$1"
  printf '  #%-5s %-9s %s   by %s   [%s]\n' \
    "$(printf '%s' "$r" | cut -f1)" "$(printf '%s' "$r" | cut -f2)" \
    "$(printf '%s' "$r" | cut -f6)" "$(printf '%s' "$r" | cut -f7)" "$(printf '%s' "$r" | cut -f8)"
  local sha md5 src; sha="$(printf '%s' "$r" | cut -f3)"; md5="$(printf '%s' "$r" | cut -f4)"; src="$(printf '%s' "$r" | cut -f5)"
  [ "$sha" = "-" ] && [ "$md5" = "-" ] && [ "$src" = "-" ] || \
    printf '    sha: %s   bundle md5: %s   source md5: %s\n' "$sha" "$md5" "$src"
  # THE NOTE IS PRINTED IN FULL, WRAPPED, NEVER TRUNCATED. held.sh's `list` cut its reason at 140 characters and
  # amputated every actionable part of #441's row; the same mistake is not worth making twice in one directory.
  printf '%s\n' "$(printf '%s' "$r" | cut -f9)" | fold -s -w 100 | sed 's/^/    /'
}

highest() { rows | cut -f1 | sort -n | tail -1; }

case "${1:-}" in
  check)
    N="$(want_num "${2:-}")" || exit 2
    HITS="$(print_rows_for "$N")"
    if [ -n "$HITS" ]; then
      CNT="$(printf '%s\n' "$HITS" | wc -l | tr -d ' ')"
      echo "ISSUED: #$N is already on the register ($CNT row(s))."
      printf '%s\n' "$HITS" | while IFS= read -r r; do show_row "$r"; done
      if [ "$CNT" -gt 1 ]; then
        # WORDING CORRECTED (#454, antagonist B). This said "that is a COLLISION ... Do not reuse it" for ANY
        # number with more than one row, and FOUR of the five it fired on are not collisions at all: #440,
        # #441, #451 and #452 each name several artefacts because their run rebuilt mid-pass, which `record`
        # itself calls legal eight lines below and which this register's header calls the median behaviour.
        # It fired hardest on #452 - what origin/main actually serves - telling any auditing run that the live
        # build names two trees. An alarm wrong four times out of five is noise by its second day, and it would
        # have destroyed the signal for #416, the one real collision this file was written to make visible.
        echo "  NOTE: #$N names $CNT artefacts. That is usually LEGAL and expected - a run that fixes something"
        echo "  mid-pass rebuilds, so one number names several bundles. It means 'measured on #$N' is AMBIGUOUS:"
        echo "  cite the bundle md5 alongside the number."
        echo "  A GENUINE COLLISION - one number, two different TREES from two different runs - is a different"
        echo "  thing and the rows say so themselves (see #416's two arms). Compare the runIds above."
      fi
      echo "  Next free number is #$(( $(highest) + 1 )). Use \`gates/buildnum.sh mint\` rather than picking one."
      exit 1
    fi
    echo "free: #$N is on no row of $(basename "$REG") ($(rows | wc -l | tr -d ' ') row(s) checked)"
    exit 0 ;;

  next)
    H="$(highest)"
    [ -n "$H" ] || { echo "buildnum.sh next: the register has no numbered rows, so there is no series to continue." >&2
                     echo "  Refusing to invent one. Seed the register before using next/mint." >&2; exit 2; }
    NX=$(( H + 1 ))
    if ! in_range "$NX"; then
      echo "buildnum.sh next: the next number would be #$NX, which is ${#NX} digits and outside the" >&2
      echo "  ^#[0-9]{3,4}\$ that build.sh and gates.sh require. Reporting it rather than printing a number" >&2
      echo "  nothing downstream will accept. Look for a bad high row in the register." >&2; exit 2; fi
    echo "#$NX" ;;

  mint)
    shift 2>/dev/null || true; NOTE="${*:-}"
    # THE NOTE IS NOT OPTIONAL. A minted number with no note is the row nobody can interpret later, and the
    # whole point of the register is that a LATER run reads what an earlier one did.
    if [ "${#NOTE}" -lt 20 ]; then
      echo "usage: gates/buildnum.sh mint <what this build is for, 20+ chars>"; exit 2; fi
    case "$NOTE" in *"	"*) echo "buildnum.sh mint: the note contains a TAB, which would truncate it at the field break"; exit 2;; esac
    if ! need_runid; then
      echo "buildnum.sh mint: CT_RUNID is not set, so this number would be attributed to 'unknown-run'. A number"
      echo "  whose issuer cannot be traced is the #416 defect with extra steps."
      echo "  Re-run as: CT_RUNID=<your runId> gates/buildnum.sh mint '<note>'"; exit 2; fi
    SRC="$(clean_field "${CT_SRCMD5:--}" "CT_SRCMD5")" || exit 2
    lock_take || exit 1
    H="$(highest)"
    if [ -z "$H" ]; then
      lock_free
      echo "buildnum.sh mint: the register has no numbered rows; refusing to invent a series."; exit 2; fi
    N=$(( H + 1 ))
    if ! in_range "$N"; then
      lock_free
      echo "buildnum.sh mint: the next number would be #$N, which is ${#N} digits."
      echo "  build.sh and gates.sh both require ^#[0-9]{3,4}\$, so handing this out would wedge the series:"
      echo "  every later build would be refused by the bundler and by \`check\`. Almost certainly a bad row"
      echo "  was added by hand (look for an implausible high number in the register) - fix that, not this."
      exit 2; fi
    append_row "$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
      "$N" "minted" "-" "-" "$SRC" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "minted" "$NOTE")"
    # READ IT BACK, AND ASK THE RIGHT QUESTION. The first version counted rows for this number ATTRIBUTED TO
    # ME, which every one of four concurrent minters satisfied. The claim being made is that the number is
    # MINE ALONE, so the test is that #N has exactly ONE row in total and that its runId is mine.
    ROWS_N="$(print_rows_for "$N" | wc -l | tr -d ' ')"
    MINE="$(print_rows_for "$N" | awk -F'\t' -v r="$CT_RUNID" '$7==r' | wc -l | tr -d ' ')"
    lock_free
    if [ "$ROWS_N" != "1" ] || [ "$MINE" != "1" ]; then
      echo "buildnum.sh mint: read-back FAILED - #$N has $ROWS_N row(s) in total and $MINE attributed to"
      echo "  $CT_RUNID; both must be exactly 1. Another run may have minted the same number."
      echo "  Do NOT stamp anything with #$N. Re-read the register and investigate."; exit 1; fi
    echo "#$N"
    echo "buildnum.sh: minted #$N for $CT_RUNID and read it back. COMMIT THIS, and also pin the tracker" >&2
    echo "  document buildnumber (artifact 5326ERvZCZ5tEYRkPavPTF) - see the header: this file cannot see" >&2
    echo "  another live container's unpushed mint, and that is the #416 case." >&2 ;;

  stampable)
    N="$(want_num "${2:-}")" || exit 2
    if ! need_runid; then
      echo "buildnum.sh stampable: CT_RUNID is not set, so I cannot tell YOUR rows from another run's -"
      echo "  which is the entire question. Re-run as CT_RUNID=<your runId> gates/buildnum.sh stampable '#$N'."
      exit 2; fi
    HITS="$(print_rows_for "$N")"
    if [ -z "$HITS" ]; then
      echo "stampable: #$N is on no row. It was CHOSEN by this run rather than issued to it; see the note build.sh prints."
      exit 0; fi
    # Whose rows are they, and in what state? A number is stampable by me when every row claiming it is mine.
    # MINE + minted only      -> the happy path: I minted it and am now building it.
    # MINE + built/shipped    -> a mid-run rebuild, which is legal and common; announced, not refused.
    # SOMEBODY ELSE'S, any state -> refuse. That is the reuse this register exists to prevent, and a `minted`
    #                            row held by another run is exactly the #416 case caught in the act.
    OTHERS="$(printf '%s\n' "$HITS" | awk -F'\t' -v r="$CT_RUNID" '$7!=r' | wc -l | tr -d ' ')"
    MINE="$(printf '%s\n' "$HITS" | awk -F'\t' -v r="$CT_RUNID" '$7==r' | wc -l | tr -d ' ')"
    if [ "$OTHERS" != "0" ]; then
      echo "NOT STAMPABLE: #$N is claimed by $OTHERS row(s) belonging to another run."
      printf '%s\n' "$HITS" | awk -F'\t' -v r="$CT_RUNID" '$7!=r' | while IFS= read -r x; do show_row "$x"; done
      echo "  Stamping it would make #$N name more than one tree, which is the #416 defect."
      echo "  Take your own:  CT_RUNID=$CT_RUNID gates/buildnum.sh mint '<what this build is for>'"
      exit 1; fi
    BUILTN="$(printf '%s\n' "$HITS" | awk -F'\t' '$2=="built"||$2=="shipped"||$2=="held" {c++} END{print c+0}')"
    if [ "$BUILTN" != "0" ]; then
      echo "stampable: #$N is yours and already names $BUILTN artefact(s) you built. A REBUILD, which is legal -"
      echo "  this register's own header calls it the median behaviour of a run that fixed something mid-pass."
      echo "  The new bundle will be recorded as a further artefact under #$N, so cite the md5, not the number."
      exit 0; fi
    echo "stampable: #$N is yours, minted and not yet built ($MINE row(s)). This is the happy path."
    exit 0 ;;

  add)
    N="$(want_num "${2:-}")" || exit 2
    STATE="${3:-}"; SHA="${4:-}"; MD5="${5:-}"; shift 5 2>/dev/null || true; NOTE="${*:-}"
    if [ -z "$STATE" ] || [ -z "$SHA" ] || [ -z "$MD5" ] || [ -z "$NOTE" ]; then
      echo "usage: gates/buildnum.sh add <#NNN> <state> <sha> <bundleMd5> <note...>"
      echo "  state: minted | issued | built | shipped | held | abandoned.  sha/bundleMd5 may be '-'. CT_SRCMD5 optional."; exit 2; fi
    case "$STATE" in minted|issued|built|shipped|held|abandoned) ;; *)
      echo "buildnum.sh add: state '$STATE' is not one of minted, issued, built, shipped, held, abandoned"; exit 2;; esac
    if [ "${#NOTE}" -lt 20 ]; then echo "buildnum.sh add: the note is ${#NOTE} characters. Say what the number names."; exit 2; fi
    case "$NOTE" in *"	"*) echo "buildnum.sh add: the note contains a TAB, which would truncate it at the field break"; exit 2;; esac
    # VALIDATE BOTH KEYS, lowercased, exactly as held.sh had to learn to: it accepted a 32-char md5, an
    # UPPERCASE md5 and a 1-char md5, every one a row that `list` shows as live and that can never match.
    SHA="$(printf '%s' "$SHA" | tr 'A-F' 'a-f')"; MD5="$(printf '%s' "$MD5" | tr 'A-F' 'a-f')"
    if [ "$MD5" != "-" ]; then
      case "$MD5" in *[!0-9a-f]*) echo "buildnum.sh add: bundle md5 '$MD5' is not hex"; exit 2;; esac
      if [ "${#MD5}" -lt 8 ] || [ "${#MD5}" -gt 12 ]; then
        echo "buildnum.sh add: bundle md5 '$MD5' is ${#MD5} chars. gates.sh writes 12 (md5sum app.js | cut -c1-12)."; exit 2; fi
    fi
    if [ "$SHA" != "-" ]; then
      case "$SHA" in *[!0-9a-f,]*) echo "buildnum.sh add: sha '$SHA' is not hex"; exit 2;; esac
      # A SHA OF A SINGLE COMMA PASSED EVERY CHECK (#454, antagonist B): the for-loop below simply never
      # iterated, so `add '#461' held , <md5>` was recorded. Count the parts before trusting the loop.
      NPARTS="$(printf '%s' "$SHA" | tr ',' '\n' | grep -c '[0-9a-f]' || true)"
      [ "$NPARTS" -ge 1 ] || { echo "buildnum.sh add: sha '$SHA' contains no sha at all (commas only)"; exit 2; }
      for one in $(printf '%s' "$SHA" | tr ',' ' '); do
        [ "${#one}" -ge 7 ] || { echo "buildnum.sh add: sha '$one' is under 7 chars"; exit 2; }
        # AND IT MUST NAME AN OBJECT. The register shipped with 004cb86f6a9 on its #453 row - eleven hex
        # characters, inherited from held-trees.tsv, that `git cat-file -t` calls "Not a valid object name"
        # because they diverge from the real sha at character 8 (004cb86d595e...). Hex and length were the only
        # tests, and both passed. Checked only when we are inside a work tree, so the tool still runs outside one.
        if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
          git cat-file -e "$one^{object}" 2>/dev/null || {
            echo "buildnum.sh add: sha '$one' is hex and long enough but names NO OBJECT in this repository."
            echo "  A truncated or mistyped sha passes every other test and is unresolvable to the next reader."
            echo "  If the object is genuinely absent (a shallow clone, an unfetched branch), pass '-' instead."
            exit 2; }
        fi
      done
    fi
    if ! need_runid; then
      echo "buildnum.sh add: CT_RUNID is not set. A row whose author cannot be traced is half a record."; exit 2; fi
    # FIELD 5 IS THE LOAD-BEARING ONE AND WAS THE UNVALIDATED ONE. sourceMd5 is the key #450 established as the
    # only one that survives a rebuild, and the key gates/held.sh compares against the working tree - so an
    # unusable value here is worse than an unusable bundle md5. CT_PROV lands in a field too.
    SRC="$(clean_field "${CT_SRCMD5:--}" "CT_SRCMD5")" || exit 2
    PROV="$(clean_field "${CT_PROV:-measured}" "CT_PROV")" || exit 2
    if [ "$SRC" != "-" ]; then
      SRC="$(printf '%s' "$SRC" | tr 'A-F' 'a-f')"
      case "$SRC" in *[!0-9a-f]*) echo "buildnum.sh add: CT_SRCMD5 '$SRC' is not hex"; exit 2;; esac
      if [ "${#SRC}" -lt 8 ] || [ "${#SRC}" -gt 12 ]; then
        echo "buildnum.sh add: CT_SRCMD5 '$SRC' is ${#SRC} chars; expected 8-12 (md5sum ... | cut -c1-12)."; exit 2; fi
    fi
    # A DUPLICATE IS NOT REFUSED, IT IS ANNOUNCED. #416 genuinely has two trees and the register must be able to
    # RECORD that rather than refuse to describe reality - the register's job is to make a collision visible, and
    # a tool that cannot write the one real collision in this project's history would be useless for auditing it.
    EXIST="$(print_rows_for "$N" | wc -l | tr -d ' ')"
    lock_take || exit 1
    append_row "$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
      "$N" "$STATE" "$SHA" "$MD5" "$SRC" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "$PROV" "$NOTE")"
    lock_free
    if [ "$EXIST" != "0" ]; then
      echo "buildnum.sh: WARNING - #$N already had $EXIST row(s). It now has $(( EXIST + 1 ))."
      echo "  Recorded, not refused: a real collision must be describable. But if you are STAMPING a bundle"
      echo "  with #$N, stop - use \`mint\` and take a fresh number."
    fi
    echo "buildnum.sh: recorded #$N as $STATE. Commit it to main." ;;

  record)
    N="$(want_num "${2:-}")" || exit 2
    MD5="$(printf '%s' "${3:-}" | tr 'A-F' 'a-f')"; SRC="$(printf '%s' "${4:-}" | tr 'A-F' 'a-f')"
    if [ -z "$MD5" ] || [ -z "$SRC" ]; then
      echo "usage: gates/buildnum.sh record <#NNN> <bundleMd5> <sourceMd5>"; exit 2; fi
    for k in "$MD5" "$SRC"; do
      case "$k" in *[!0-9a-f]*) echo "buildnum.sh record: '$k' is not hex"; exit 2;; esac
      if [ "${#k}" -lt 8 ] || [ "${#k}" -gt 12 ]; then
        echo "buildnum.sh record: '$k' is ${#k} chars; expected 8-12 (md5sum ... | cut -c1-12)"; exit 2; fi
    done
    # IDEMPOTENT ON THE TRIPLE. Re-gating the same bundle must not grow the register; a GENUINELY NEW bundle
    # under the same number must. That distinction is the whole measurement: 4 of the 8 build numbers with an
    # app.js commit on main carry MORE THAN ONE distinct bundle md5 (#440 three, #441 two, #451 three, #452
    # two), measured 2026-10-01 over the shallow clone's 50 commits. The register is what makes that visible.
    if rows | awk -F'\t' -v n="$N" -v m="$MD5" -v s="$SRC" '$1==n && $4==m && $5==s {f=1} END{exit !f}'; then
      echo "buildnum.sh record: #$N already has a row for bundle $MD5 / source $SRC; nothing appended."
      exit 0; fi
    RID="$(clean_field "${CT_RUNID:-unknown-run}" "CT_RUNID")" || exit 2
    lock_take || exit 1
    PRIOR="$(rows | awk -F'\t' -v n="$N" '$1==n && $2=="built" {c++} END{print c+0}')"
    append_row "$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
      "$N" "built" "-" "$MD5" "$SRC" "$(date -u +%Y-%m-%dT%H:%MZ)" "$RID" "build.sh" \
      "Bundle built and stamped #$N. Recorded by gates/build.sh so the number resolves to an artefact.")"
    # RECORD NOW READS BACK TOO. It had no read-back while `mint` did, and `record` is the AUTOMATIC path
    # build.sh uses - so the one place a silent loss would never be noticed was the one place without the check.
    BACK="$(rows | awk -F'\t' -v n="$N" -v m="$MD5" '$1==n && $4==m {c++} END{print c+0}')"
    lock_free
    if [ "$BACK" = "0" ]; then
      echo "buildnum.sh record: read-back FAILED - #$N bundle $MD5 is not readable back from the register."
      echo "  The row did not land. Do not trust a later \`check\` on #$N until this is fixed."; exit 1; fi
    if [ "$PRIOR" != "0" ]; then
      echo "buildnum.sh record: NOTE - #$N now names $(( PRIOR + 1 )) distinct bundles. That is legal (a fix"
      echo "  mid-run rebuilds) but it means 'measured on #$N' is AMBIGUOUS from here on: cite the md5 too."
    fi
    echo "buildnum.sh: recorded #$N bundle $MD5 source $SRC." ;;

  sweep)
    # THE REGISTER'S DENOMINATOR WAS FROZEN THE DAY IT WAS BACKFILLED, AND NOTHING NOTICED IT THAWING.
    # #454 backfilled this file from RUN-LOG.md and the committed gate-log filenames. Both sources only carry a
    # number once a run has written its records, so a run that used a number and did NOT ship is invisible to
    # them - and three of the four builds on 2026-10-02 stood down on the push. MEASURED HERE at #465, on an
    # UNSHALLOWED clone of 857 commits: 312 distinct numbers are named in commit subjects across all refs, 226
    # are on the register, and 88 are named by a commit and absent from it. The one that matters is #463, whose
    # own close-out commit edb4496 says "NOT SHIPPED": `check '#463'` answered `free`, and `free` is the one
    # answer this register must never give wrongly, because gates/build.sh refuses only numbers it can SEE.
    # So the backfill was not the fix; a backfill is a snapshot, and this is the sweep that keeps it true.
    # WHAT THIS CAN AND CANNOT CLAIM. It claims "this number was NAMED by a commit subject", which is exactly
    # the register's `issued` semantics - the number was used, final disposition not established. It does NOT
    # claim a bundle was stamped with it: 126 of the mentions are non-leading ("Revert main to #439", "docs
    # after #374"), which name a number without being its build, and that is still evidence the number is
    # spent. Checked before trusting the regex: this repository puts no issue or PR references in commit
    # subjects, so every #NNN in one is a build number.
    MODE="${2:---report}"
    case "$MODE" in --report|--add) ;; *)
      echo "usage: gates/buildnum.sh sweep [--report|--add]"; exit 2;; esac
    # RUN GIT IN THE REGISTER'S OWN REPOSITORY, NOT IN $PWD. The register is resolved from $HERE and the
    # history must come from the same place, or the sweep compares one repo's commits against another repo's
    # register and both halves look fine. gates/buildnum-selftest.sh runs this tool from a temp directory
    # while the caller sits inside the real checkout, which is exactly that mismatch.
    if ! git -C "$HERE" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      echo "buildnum.sh sweep: not inside a git work tree, so there is no history to sweep. Nothing measured."
      exit 2; fi
    # PRINT THE DENOMINATOR, AND REFUSE TO CALL A SHALLOW SWEEP CLEAN. A shallow clone sees fewer commits, so it
    # names fewer numbers, so it finds fewer missing and reports success - the frozen denominator wearing the
    # sweep's own clothes. #405 closed a ledger at the number that happened to be true that day and it answered
    # "none" to the question it existed for. This one says what it measured over, every time.
    NREFS="$(git -C "$HERE" for-each-ref --format='%(refname)' 2>/dev/null | wc -l | tr -d ' ')"
    NCOMMITS="$(git -C "$HERE" log --all --format='%H' 2>/dev/null | wc -l | tr -d ' ')"
    SHALLOW=no; [ -f "$(git -C "$HERE" rev-parse --absolute-git-dir 2>/dev/null)/shallow" ] && SHALLOW=yes
    NAMED="$(git -C "$HERE" log --all --format='%s' 2>/dev/null | grep -oE '#[0-9]{3,4}' | tr -d '#' | sort -un)"
    NNAMED="$(printf '%s\n' "$NAMED" | grep -c '[0-9]' || true)"
    ONREG="$(rows | cut -f1 | sort -un)"
    NONREG="$(printf '%s\n' "$ONREG" | grep -c '[0-9]' || true)"
    ABSENT="$(comm -23 <(printf '%s\n' "$NAMED" | grep '[0-9]') <(printf '%s\n' "$ONREG" | grep '[0-9]'))"
    NABSENT="$(printf '%s\n' "$ABSENT" | grep -c '[0-9]' || true)"
    printf 'buildnum.sh sweep: measured over %s commits on %s refs (shallow: %s)\n' "$NCOMMITS" "$NREFS" "$SHALLOW"
    printf '  %s distinct number(s) named in a commit subject; %s on %s; %s NAMED AND ABSENT.\n' \
      "$NNAMED" "$NONREG" "$(basename "$REG")" "$NABSENT"
    if [ "$SHALLOW" = yes ]; then
      echo "  WARNING - THIS CLONE IS SHALLOW, so the count above is a LOWER BOUND and a clean result proves"
      echo "  nothing. Run \`git fetch --unshallow\` first, or treat this sweep as unmeasured."; fi
    if [ "$NABSENT" = "0" ]; then
      [ "$SHALLOW" = yes ] && { echo "  no absent numbers found, but see the shallow warning above"; exit 3; }
      echo "  the register names every number any commit does."; exit 0; fi
    echo "  absent: $(printf '%s\n' "$ABSENT" | grep '[0-9]' | tr '\n' ' ')"
    if [ "$MODE" != "--add" ]; then
      echo "  These answer \`free\` to check and to gates/build.sh, which is the answer that creates a second"
      echo "  tree under one number. Re-run as \`gates/buildnum.sh sweep --add\` to record them, then commit."
      exit 3; fi
    if ! need_runid; then
      echo "buildnum.sh sweep --add: CT_RUNID is not set. Rows whose author cannot be traced are half a record."
      exit 2; fi
    [ "$SHALLOW" = no ] || { echo "buildnum.sh sweep --add: refusing to write from a SHALLOW clone - the rows"
      echo "  would be a partial backfill presented as a complete one. Unshallow first."; exit 2; }
    AT="$(date -u +%Y-%m-%dT%H:%MZ)"
    lock_take || exit 1
    N_WROTE=0
    for n in $(printf '%s\n' "$ABSENT" | grep '[0-9]'); do
      in_range "$n" || continue
      append_row "$(printf '%s\tissued\t-\t-\t-\t%s\t%s\tgit-log\t%s' "$n" "$AT" "$CT_RUNID" \
        "Swept in: a commit subject on some ref names #$n, so the number was used and must never be reused. State issued, not shipped - a commit subject does not prove a bundle. Found by buildnum.sh sweep over $NCOMMITS commits on $NREFS refs.")"
      N_WROTE=$(( N_WROTE + 1 ))
    done
    lock_free
    printf 'buildnum.sh sweep: recorded %s number(s) as issued. Commit %s to main.\n' "$N_WROTE" "$(basename "$REG")" ;;

  list)
    # LINT FOR THE INVERSE OF held.sh's LESSON (#454, antagonist B). held.sh guarded against a row that LOOKS
    # LIVE and can never match. The opposite is just as bad here and was uncovered: a line that looks recorded
    # and is INVISIBLE, because rows() requires field 1 to be a bare number. A row written `#458` (how every
    # other file in this directory writes a build number, held-trees.tsv included), or cleared with
    # held-trees.tsv's documented `-` prefix convention, vanishes from check, next AND list - in a file whose
    # header says a number is never removed. Named rather than silently skipped.
    GHOSTS="$(grep -vn '^[[:space:]]*#' "$REG" | grep -v '^[0-9]*:[[:space:]]*$' | awk -F: -v q="'" '{line=$0; sub(/^[0-9]+:/,"",line); split(line,F,"\t"); if (F[1] !~ /^[0-9]+$/) print $1}' | tr '\n' ' ')"
    if [ -n "${GHOSTS// /}" ]; then
      echo "WARNING - line(s) $GHOSTS look like data but field 1 is not a bare number, so NO subcommand sees"
      echo "  them: not check, not next, not list. A '#458' or a '-'-prefixed first field does this. Fix them."
      echo
    fi
    printf 'build numbers on %s (%s row(s)):\n' "$(basename "$REG")" "$(rows | wc -l | tr -d ' ')"
    rows | sort -n -k1,1 | while IFS= read -r r; do show_row "$r"; done
    DUP="$(rows | cut -f1 | sort -n | uniq -d | tr '\n' ' ')"
    [ -z "${DUP// /}" ] || { echo; echo "NUMBERS NAMING MORE THAN ONE ARTEFACT: $DUP"
      echo "  Mostly legal: a run that rebuilt mid-pass. It means the NUMBER does not identify a bundle, so"
      echo "  cite the md5 with it. Only #416 is a genuine two-tree collision, and its own rows say so."; }
    H="$(highest)"; [ -z "$H" ] || echo; [ -z "$H" ] || echo "highest issued: #$H   next free: #$(( H + 1 ))" ;;

  *) # Print only the comment block, derived rather than hard-coded - held.sh's --help printed three lines of
     # its own source because the range was pinned to a line number that drifted.
     END="$(grep -n -m1 -v '^#' "$0" | cut -d: -f1)"; sed -n "2,$((END-1))p" "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
