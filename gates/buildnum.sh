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
#
#   READ THOSE EXIT STATUSES OFF THE SCRIPT AND NOT OFF A PIPELINE. `check` writes its rows a line at a time, so
#   a downstream reader that closes the pipe early kills it with SIGPIPE, and what the caller then reads is not
#   the verdict. Found by antagonist B of #518 (its section 5.1).
#   THE PARAGRAPH THAT STOOD HERE FROM #544 item (16b) UNTIL ITS OWN ANTAGONIST READ IT WAS WRONG IN THREE WAYS
#   AND IS REPLACED [antagonist A of #544, veto V2, UPHELD; every figure below re-measured by hand before this
#   was written, which is what item (16b) claimed and had not done]. It said the piped form exits 141 and
#   offered "${PIPESTATUS[0]}" as a remedy. MEASURED on 2026-10-29 against this register, four commands:
#     bash gates/buildnum.sh check '#517'                                  -> 1          (present: the verdict)
#     ...check '#517' | head -2            in a DEFAULT shell              -> 0          PIPESTATUS[0]=141
#     ...check '#517' | head -2            under `set -o pipefail`         -> 141        PIPESTATUS[0]=141
#     OUT="$(...check '#517')"; RC=$?                                      -> 1          (the verdict)
#   (1) THE PIPED FORM EXITS 0, NOT 141, unless the caller has set pipefail - which the old text never stated,
#       so a reader who ran the published line got 0 and had grounds to conclude the note was wrong.
#   (2) "${PIPESTATUS[0]}" IS THE HAZARD AND NOT THE REMEDY: it is 141 in BOTH shells, because it is precisely
#       the producer's SIGPIPE status. A caller who followed that sentence read 141 instead of the verdict.
#   (3) THE DANGEROUS READING IS THE ONE THE OLD TEXT DID NOT NAME. Without pipefail the pipeline's `$?` is 0,
#       and two lines above this one, exit 0 MEANS ABSENT. So `buildnum.sh check "$N" | head -5; if [ $? -eq 0 ];
#       then echo free; fi` reports an ISSUED NUMBER AS FREE - the #416 two-trees-one-number shape, and strictly
#       worse than the 141 the old text warned about.
#   THERE IS NOTHING TO FIX IN THE SCRIPT: a writer that is signalled cannot choose its own status. THE ONE
#   REMEDY THAT WORKS IS TO CAPTURE FIRST AND PAGE THE CAPTURE - `OUT="$(buildnum.sh check "$N")"; RC=$?` - and
#   no caller in this project reads `$?` across a pipe from this script today, which is why all of this is a
#   hazard for the next caller rather than a live defect.
#
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
#   gates/buildnum.sh clear <#NNN> <why...>                              record that a number no longer stands
#                                    (append-only, like every write here; exit 2 if the number has no row at
#                                    all, exit 3 if it was already cleared). #544.
#                                    state: minted | issued | built | shipped | held | abandoned (issued =
#                                    used, final
#                                    disposition not established). sha and bundleMd5 may be '-'.
#                                    CT_SRCMD5 sets the sourceMd5 field; CT_RUNID is REQUIRED. REFUSES (exit 2) a number
#                                    the register's series does not reach: see THE ONE LIMIT ON "HIGHER" below.
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
#                                    A name the register's series does not reach (more than BUILDNUM_MAX_DELTA
#                                    past its top) is IMPLAUSIBLE: listed, not counted as absent, never written.
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
# THE ONE LIMIT ON "HIGHER" is the series bound further down. The register has a SERIES: its longest run of
# distinct numbers in which no step is bigger than BUILDNUM_MAX_DELTA (default 10). A number the series does not
# reach is not growth, it is a STRAY ROW, and next and mint REFUSE rather than hand out the number after it. add
# and sweep --add apply the same test BEFORE they write, so this tool never creates a stray row itself. record does
# not (it writes the number build.sh just stamped), and a row typed into the file by hand is caught when the next
# number is asked for. THE REGISTER IS APPEND-ONLY, so a stray row cannot be edited out of it. To carry on above
# one deliberately, accept the jump for that call with BUILDNUM_MAX_DELTA=<the gap or more>, which the refusal
# prints; every later call needs it too until the series is rejoined, and a person has to decide how to retire
# the row. Do NOT add the intermediate numbers to quiet the bound: that burns every one of them to hide one row.
set -uo pipefail
# ── THE GIT REDIRECT VARIABLES ARE SCRUBBED, ONCE, HERE [#544, item (11) of
# directOpening_2026_10_28_batch4; the class sweep of
# jobs/gatemanifest-derives-its-root-with-git-c-so-an-inherited-git-dir-switches-off-the-gate-anchor-while-the-tier-still-prints-green-2026-10-22].
# `git -C <dir>` does NOT override an inherited GIT_DIR or GIT_WORK_TREE, so a hook, a wrapper or a parent
# process that exports one makes every git call in a script answer about ANOTHER repository - and #540 measured
# the consequence: the gate anchor read NOT CHECKED at exit 0 with every verdict around it green. #540 fixed
# that one file by PINNING --git-dir and --work-tree on each call. THE SCRUB IS THE OTHER HALF AND IT IS
# STRICTLY STRONGER: pinning cannot stop GIT_OBJECT_DIRECTORY, which redirects the OBJECT STORE rather than the
# repository, and that variable alone still switched the anchor off (that job's knownLimits 48b7b4ab6433ba59,
# P3). Removing the variables leaves each script's own root derivation - cwd, or the script's location - doing
# exactly what it did before, which is why this closes the hole without changing any selection.
# WHY IT IS SAFE: nothing in this project sets these deliberately. A caller that genuinely wants another
# repository passes a path, which still works.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES \
      GIT_NAMESPACE GIT_CEILING_DIRECTORIES GIT_COMMON_DIR GIT_DISCOVERY_ACROSS_FILESYSTEM 2>/dev/null || true

HERE="$(cd "$(dirname "$0")" && pwd)"; REG="$HERE/build-numbers.tsv"
[ -f "$REG" ] || { echo "buildnum.sh: no register at $REG"; exit 2; }

# THE NUL WARNING IS LOUD, ON STDERR, AND EXACTLY ONCE [#534, NUL]. rows() now reads a NUL-bearing register
# whole, so no verdict is wrong any more - but a register carrying a NUL is still a damaged file somebody must
# repair, and silently coping with it is how the next reader of this directory inherits it. It goes to STDERR
# and never to stdout, and it is emitted HERE rather than inside rows() because rows() is called many times in
# one invocation and a warning repeated nine times reads as nine faults. It names the register and the COUNT,
# because "there is a NUL somewhere" is not something anybody can act on.
REG_NULS="$(tr -cd '\000' < "$REG" 2>/dev/null | wc -c | tr -d ' ')"
if [ "${REG_NULS:-0}" != "0" ] 2>/dev/null; then
  echo "buildnum.sh: WARNING - $REG contains ${REG_NULS} NUL byte(s). Every row is still read (they are" >&2
  echo "  stripped before parsing, so no verdict below is affected), but the file is damaged and should be" >&2
  echo "  repaired: a NUL makes GNU grep print 'binary file matches' instead of lines, which is how an" >&2
  echo "  ISSUED build number came to read as free. Find it with: tr -cd '\\000' < $REG | wc -c" >&2
fi

# Field 1 must be a bare number for a row to count. Comments, the header and any malformed line are skipped
# here rather than silently half-matched - held.sh's lesson that a row which LOOKS live and matches nothing is
# worse than no row.
# ONE NUL BYTE USED TO LOSE THE WHOLE REGISTER, AND IT MADE AN ISSUED NUMBER READ FREE [#534, NUL;
# jobs/one-nul-byte-in-the-register-makes-buildnum-stampable-report-an-issued-number-as-free-2026-10-22,
# filed by #532]. GNU grep treats a file containing a NUL as binary and prints the single line
# `grep: <file>: binary file matches` INSTEAD OF the matching lines, so this reader returned NOTHING and
# every caller concluded the register was empty. MEASURED on 707599b before the fix, with one NUL injected
# into the note of row #347 of the live 516-row register: rows() read 0 rows (not 365 as the job estimated -
# grep refuses the whole file rather than stopping at the NUL), and `stampable '#533'` under a FOREIGN
# CT_RUNID answered "#533 is on no row. It was CHOSEN by this run rather than issued to it" at exit 0, where
# the same register without the NUL answers "NOT STAMPABLE: #533 is claimed by 2 row(s) belonging to another
# run" at exit 1. That is the only mechanical guard against two trees under one build number, reading free.
# `tr -d` AND NOT `grep -a`, AND THE CHOICE IS MEASURED RATHER THAN REASONED: both read all 516 rows, but
# `LC_ALL=C grep -a` leaves the NUL inside the note (1 byte survives into the output), so `list` would print
# bytes the file's author never wrote and show_row's columns would be shifted for that row; `tr -d` removes it
# (0 survive). On a CLEAN register the new reader is BYTE-IDENTICAL to the old one, md5 1fd4b134a47a both ways,
# so nothing about the happy path moves. The damage is reported on STDERR ONLY, once, where this file sets REG:
# gates/gates.sh's series door quotes the FIRST LINE of stampable's stdout and branches on its exit status, so
# a warning on stdout would be read as a verdict.
rows() { tr -d '\000' < "$REG" | grep -v '^[[:space:]]*#' | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/'; }

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

# ── A NUMBER'S DISTINCT BUNDLES, WHICH IS NOT ITS ROW COUNT [#544 item (32);
# jobs/buildnum-check-counts-rows-not-bundles-so-the-ambiguity-alarm-fires-on-the-happy-path-2026-10-08, P2,
# found at #497 running the pre-push register check on its own number].
# `check` printed "#N names <ROW COUNT> artefacts ... 'measured on #N' is AMBIGUOUS", and a `minted` row names
# NO artefact - its bundle-md5 field is literally `-`, which show_row prints. So the DOCUMENTED happy path,
# mint a number then build it once, produces two rows naming ONE bundle and the ambiguity note fired on it.
# MEASURED by the job over the whole register: 15 numbers had more than one row while naming fewer than two
# distinct bundles - thirteen naming exactly one and two (#467, #478) naming none at all - and every one of
# them is #457 or later, which is when `mint` came into use. So it was the current happy path, not history.
# THIS IS #454's OWN DEFECT ONE LAYER DOWN AND THE LESSON IS #454's OWN SENTENCE: it found this same alarm
# saying "that is a COLLISION ... Do not reuse it" for any number with more than one row, measured that four of
# the five it fired on were legal mid-pass rebuilds, and fixed THE WORDING while leaving THE COUNT that makes
# it fire. 'AN ALARM THAT IS WRONG FOUR TIMES IN FIVE DESTROYS THE SIGNAL IT WAS BUILT FOR.'
# FIELD 4 IS THE BUNDLE MD5 and `-` is its written absence; `record`'s own read-back keys on $4, so the field
# is not inferred here. Both helpers are used by check, list, record and stampable, so the four reports cannot
# drift apart again - which is what let this one survive a pass over the same lines.
bundles_for()  { print_rows_for "$1" | awk -F'\t' '$4!="-" && $4!="" {print $4}' | sort -u; }
nbundles_for() { bundles_for "$1" | awk 'NF{c++} END{print c+0}'; }

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

# -- A LEADING ZERO IS NOT A NUMBER, AND ONLY $(( )) THINKS OTHERWISE (#537, the OCTAL job) ------------------
# MEASURED on main ed65bab, in a scratch git repo with main's own register: with ONE row numbered 0535 appended,
# `next` printed #350 at exit 0 and `list` printed "highest issued: #0535   next free: #350" - and #350 is an
# ISSUED number (2026-10-01, backfilled from git, build__1790886022489). So the tool handed out a number another
# tree already carries, which is the #416 damage this whole register exists to prevent, reachable by one typed
# zero and silent until a later read-back.
# THE MECHANISM IS ONE SITE AND NOT TWO. rows() above keeps any all-digit first field, so 0535 survives it;
# highest() sorted with `sort -n`, which correctly places 0535 as 535, and then RETURNED THE STRING "0535"; and
# $(( H + 1 )) read that string as OCTAL - 0535 base 8 is 349 - giving 350.
# WHICH CONSTRUCTS ACTUALLY READ OCTAL WAS MEASURED, NOT ASSUMED, because that is what decides the blast radius:
#   $(( 0535 + 1 ))        = 350   <- the only offender
#   [ 0535 -gt 534 ]       = TRUE         (bash's test reads base 10)
#   awk '{print $1 + 0}'   = 535          (awk never reads octal)
# So series_run (awk $1+0), delta_ok (its comparison is `[ -gt ]`) and stray_check (already `10#$1`) were NEVER
# affected. That is also why the two readers disagreed: the series check had read base 10 since it was written.
# SO THE FIX BELONGS IN highest() AND NOT AT THE ARITHMETIC SITES. Normalising the value ONCE, here, fixes every
# consumer at the same time. The class sweep found FIVE $(( )) sites fed by this function, not the two the job
# named: `next`, `mint`, can_issue, `check`'s "Next free number is" recommendation, and `list`'s "next free".
# Patching the two named ones would have left `check` and `list` still advertising an already-issued number to
# the next reader, which is the half of the defect nobody had looked at.
# WHY NORMALISE RATHER THAN REFUSE. The register is APPEND-ONLY and cannot take a bad row back, so a refusal here
# would wedge every mint in the project until somebody hand-edited a file this project's own records ratchet
# refuses to accept edits to. That is delta_ok's own rule two screens below ("a refusal the operator has no way
# past is not a remedy") and it is #530's and #532's withdrawn ceilings arriving a third time. So: hand out the
# TRUE next number, and report the malformed row loudly instead of silently tolerating it.
highest() { rows | cut -f1 | awk '{ printf "%d\n", $1 + 0 }' | sort -n | tail -1; }

# THE REPORT GOES TO STDERR ONLY, AND THAT IS NOT A STYLE CHOICE. The comment at rows() above records that
# gates/gates.sh's series door quotes the FIRST LINE of `stampable`'s stdout and branches on its exit status, so a
# warning printed on stdout would be read as a verdict. Every caller below prints this to stderr and none of them
# changes its exit status because of it: a malformed row already on an append-only register is a thing to say, not
# a reason to stop a run that has done nothing wrong.
zero_led_list() { rows | cut -f1 | grep '^0[0-9]' | sort -u | tr '\n' ' ' || true; }

zero_led_report() { # <label>: warn on STDERR if the register holds a number written with a leading zero
  local lst
  lst="$(zero_led_list)"
  [ -n "${lst% }" ] || return 0
  echo "buildnum.sh ${1:-}: WARNING - the register holds number(s) written with a LEADING ZERO: ${lst% }." >&2
  echo "  A leading zero is not a build number. Every number is read in base 10 here, so this tool hands out the" >&2
  echo "  TRUE next number and never an octal reading of one. THE NUMBER IS TAKEN, NOT FREE - DO NOT RE-MINT IT." >&2
  echo "  This warning used to end 'no check, stampable or print_rows_for lookup keyed on the plain number will" >&2
  echo "  ever match it', which is FALSE and pointed the reader at the one repair that loses a number: awk" >&2
  echo "  compares \$1==n NUMERICALLY when both sides look numeric, so a zero-led field equals the plain number" >&2
  echo "  and all three of those lookups match the row either way. Measured at #537: on a register holding one" >&2
  echo "  such row, check and stampable both answered about it from the plain number." >&2
  echo "  (No example number is printed in this warning on purpose - it would be indistinguishable from the" >&2
  echo "  offending row named above, which is the one thing a reader has to be able to read off this line.)" >&2
  echo "  What is malformed is the FIELD, not the row's reachability. The register is append-only: correct it by" >&2
  echo "  adding a well-formed row, never by editing that one." >&2
}

# <bare number> <verb>: refuse a number written with a leading zero BEFORE anything is written. It is the half
# that stops a new bad row being created at all - normalising highest() only stops the existing ones doing
# damage - and it is therefore wired at EVERY verb that appends a row: `mint`, `add`, `record` and `sweep --add`.
# It was first wired at two of the four, which made the claim in this sentence false for the automatic path; see
# the note in the `record` arm. want_num above cannot carry it: it is shared with `check`
# and `stampable`, which must stay able to ASK about a malformed number that is already on the register.
plain_dec_or_die() {
  case "$1" in 0*)
    echo "buildnum.sh $2: '#$1' has a LEADING ZERO, which is not a build number." >&2
    echo "  Writing it would put a MALFORMED row on an append-only register, where it cannot be edited out, and" >&2
    echo "  \$(( )) arithmetic reads it as octal - #0535 is 349, not 535. Refusing before the write." >&2
    echo "  (It would not be INVISIBLE, which is what this text used to claim here and at zero_led_report: awk" >&2
    echo "  compares numerically, so lookups keyed on the plain number DO match it. Measured at #537.)" >&2
    echo "  Pass the number without the zero: #${1#0}" >&2
    exit 2 ;;
  esac
}

# THE MARGIN IS ALSO THE OVERRIDE, AND ITS NAME SAYS SO. Until this change this was a bare assignment that silently
# ignored the environment variable its own name advertises. It is honoured now and validated, because a refusal
# the operator has no way past is not a remedy (see the refusal text in delta_ok). An override is never silent:
# override_notice prints it on every call that uses it.
BN_DEFAULT_DELTA=10   # real growth is +1 almost always; +10 covers a few concurrent minters
BUILDNUM_MAX_DELTA="${BUILDNUM_MAX_DELTA:-$BN_DEFAULT_DELTA}"
case "$BUILDNUM_MAX_DELTA" in
  *[!0-9]*|0*|?????*)
    echo "buildnum.sh: BUILDNUM_MAX_DELTA='$BUILDNUM_MAX_DELTA' is not a whole number from 1 to 9999. Refusing to guess." >&2
    exit 2 ;;
esac
override_notice() { # <label>
  [ "$BUILDNUM_MAX_DELTA" = "$BN_DEFAULT_DELTA" ] || \
    echo "buildnum.sh $1: BUILDNUM_MAX_DELTA=$BUILDNUM_MAX_DELTA is in effect (the default is $BN_DEFAULT_DELTA)." >&2
}

# THE SERIES, AND WHY THE BOUND LOOKS AT IT RATHER THAN AT THE TOP TWO NUMBERS.
# jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10.
# in_range() above bounds the MAGNITUDE of a number and that is correct and not the gap: a #9999 row already
# makes `next`/`mint` refuse loudly, by name, every time. The case in_range() ADMITS is the damaging one: a
# single well-formed #999 row (3 digits, passes in_range just fine) silently becomes the new highest(), and
# `next`/`mint` then hand out #1000 at exit 0 with no diagnostic - 490 numbers burned in silence if the true
# series was sitting at #510. Comparing the computed next number against highest() itself can never catch
# this: highest() IS #999, so next-minus-highest is always exactly 1 by construction, however bad the row is.
# THE FIRST VERSION OF THIS BOUND COMPARED highest() WITH THE SECOND-HIGHEST DISTINCT NUMBER AND ANY TWO ADJACENT
# HIGH ROWS DEFEATED IT (the two blind antagonists of the 14 Oct direct run, independently): #999 and #1000 have each other, the
# gap collapses to 1 and the guard is silent, and `sweep --add` wrote exactly such a pair in one command. So the
# bound no longer asks what sits just below the top. It asks what the SERIES is: the longest run of distinct
# numbers in which no step is bigger than BUILDNUM_MAX_DELTA (a tie goes to the LOWER run). A number the series
# does not reach is cut off from it, one row or fifty, and a highest() above the series' top means next and mint
# would hand out a number past every one of them. Measured on main's register at c6c50cc (#518): 385 distinct
# numbers, #125 to #518, a single run, no step bigger than 4, so the margin of 10 never fires on real history.
# THE ONE THING THIS CANNOT SEE: a stray run LONGER than the whole series would be taken for the series (an equal one
# is a tie, and a tie goes to the lower run, so a higher stray run of the same length is still refused). That takes
# more stray rows than the register has numbers; add and sweep --add refuse to write even one, so only record (one
# stamped build at a time) or a hand edit could, and the tracker's docs/buildnumber is the only other witness.
# gates/buildnum-selftest.sh pins the definition (case 28c), so a change to it is seen.
series_run() { # prints "<top> <length>" of the series, or nothing when the register has no numbered rows
  rows | cut -f1 | sort -n -u | awk -v m="$BUILDNUM_MAX_DELTA" '
    { v = $1 + 0 }
    NR == 1 || v - prev > m { start = NR }
    { len = NR - start + 1; if (len > best) { best = len; top = v }; prev = v }
    END { if (NR) print top, best }'
}

# WHERE THE SERIES TEST RUNS. next and mint (delta_ok) before they hand out a number. check and list (can_issue)
# before they tell a reader which number comes next, so two documented verbs cannot give opposite answers on one
# register state: the first version of this bound left `check` recommending `mint` on the very state where mint
# exits 2. add (stray_check) and sweep --add (split_plausible) BEFORE they write, so this tool never creates a
# stray row, which matters because the register is append-only and cannot take one back. NOT bounded: record. It
# writes the number gates/build.sh has just stamped, and refusing there would turn a bookkeeping refusal into a
# failed build for a number the run was already told it could use; a stray row written that way is still caught
# the next time a number is asked for.
# <#NX> <#H> <label: "next"|"mint">; returns 0 if highest() is the top of the series, else prints a named
# refusal to stderr and returns 1. Runs AFTER in_range so the existing 5-digit wording for #9999-class rows is
# unchanged; this is the SECOND, independent net, for rows in_range already lets through.
delta_ok() {
  local nx="$1" h="$2" label="$3" run top len strays first shown gap
  override_notice "$label"
  run="$(series_run)"; top="${run%% *}"; len="${run##* }"
  [ -n "$top" ] || return 0        # defensive only: next and mint refuse an empty register before they call this
  [ "$h" -gt "$top" ] || return 0  # highest() is the top of the series: nothing is cut off above it
  strays="$(rows | cut -f1 | sort -n -u | awk -v t="$top" '$1 + 0 > t + 0 { printf "%d ", $1 + 0 }')"
  first="${strays%% *}"; gap=$(( first - top ))
  shown="$(printf '%s' "$strays" | sed 's/[0-9][0-9]*/#&/g')"
  echo "buildnum.sh $label: refusing. The register holds number(s) cut off from its own series, so the next number" >&2
  echo "  would be #$nx, past every one of them. The series is the longest run of numbers with no step bigger than" >&2
  echo "  ${BUILDNUM_MAX_DELTA}: it has $len numbers and ends at #$top. Above it, joined to it by no step that small: ${shown% }." >&2
  echo "  The nearest is $gap past #$top; handing out #$nx would silently burn every number between them." >&2
  echo "  If that jump is real and intended, accept it for this one call: BUILDNUM_MAX_DELTA=$gap gates/buildnum.sh $label" >&2
  echo "  Every later call needs it too until the series is rejoined. The register is append-only, so a bad row cannot" >&2
  echo "  be edited out of it: if these are mistakes, a person has to decide how to retire them. Do not add the" >&2
  echo "  intermediate numbers to quiet this check; that burns every one of them to hide one bad row." >&2
  return 1
}

can_issue() { # <label>: would next/mint hand out a number right now? Silent; returns 0 yes, 1 no.
  local h nx
  h="$(highest)"; [ -n "$h" ] || return 1
  nx=$(( h + 1 ))
  in_range "$nx" || return 1
  delta_ok "$nx" "$h" "$1" >/dev/null 2>&1
}

stray_check() { # <bare number> <label>: may this tool WRITE a row for the number? Returns 0, or prints why not and returns 1.
  local n=$(( 10#$1 )) label="$2" run top gap
  override_notice "$label"
  run="$(series_run)"; top="${run%% *}"
  [ -n "$top" ] || return 0                                  # nothing numbered yet: seeding is not a stray
  [ "$n" -le $(( top + BUILDNUM_MAX_DELTA )) ] && return 0   # inside the series, or within the margin above it
  gap=$(( n - top ))
  echo "buildnum.sh $label: refusing to write #$n. It is $gap past #$top, where the register's own series ends, and" >&2
  echo "  no step of ${BUILDNUM_MAX_DELTA} or less joins them. That is the shape of a stray row: this register is append-only, so" >&2
  echo "  it could never be taken back out, and next and mint would refuse from then on. If the jump is real and intended," >&2
  echo "  accept it for this one call: BUILDNUM_MAX_DELTA=$gap gates/buildnum.sh $label ..." >&2
  return 1
}

split_plausible() { # stdin: absent numbers, ascending, one per line. Prints "P <n>" (may be recorded) or "I <n>" (implausible).
  # A number is plausible when it lies inside the series, or is joined to its top by steps no bigger than the margin
  # (each plausible number extends the top for the next one, so a short chain is recorded whole). Everything above the
  # first break is implausible: it is what a stray row would be if it were written.
  awk -v top="$(series_top)" -v m="$BUILDNUM_MAX_DELTA" '
    NF { n = $1 + 0
         if (top == "" || n <= top + 0) print "P", $1
         else if (n - top <= m)         { print "P", $1; top = n }
         else                           print "I", $1 }'
}
series_top() { local run; run="$(series_run)"; printf '%s' "${run%% *}"; }

case "${1:-}" in
  check)
    N="$(want_num "${2:-}")" || exit 2
    HITS="$(print_rows_for "$N")"
    if [ -n "$HITS" ]; then
      CNT="$(printf '%s\n' "$HITS" | wc -l | tr -d ' ')"
      BCNT="$(nbundles_for "$N")"
      echo "ISSUED: #$N is already on the register ($CNT row(s), naming $BCNT distinct bundle(s))."
      printf '%s\n' "$HITS" | while IFS= read -r r; do show_row "$r"; done
      # ── A CLEARED NUMBER IS NAMED AS CLEARED, AND NOT AS RESERVED [antagonist A of #544, finding F9].
      # Item (10) shipped the `clear` verb and its block claimed that "`check` prints cleared rows in their own
      # labelled section". IT DID NOT: cleared rows printed inline with every other row, and because a cleared
      # row carries no bundle md5 the note below then told an auditing run the number was RESERVED and names no
      # artefact yet - true of the md5 field and the opposite of what happened to the number. A measured it on
      # #517 after two clearances: three rows, "RESERVED and names NO artefact yet", and no mention of the
      # clearance anywhere in the output. The claim is corrected at the `clear` block and the behaviour is
      # supplied here, which is the half that a reader actually consumes.
      CLRN="$(printf '%s\n' "$HITS" | awk -F'\t' '$2=="cleared"{c++} END{print c+0}')"
      if [ "$CLRN" != "0" ]; then
        echo "  CLEARED: #$N carries $CLRN 'cleared' row(s), so it was recorded and NO LONGER STANDS. The"
        echo "  register is append-only, so the earlier rows are still above - read the cleared row's note for"
        echo "  why. A cleared number is NOT free: \`next\` and \`mint\` still count it as issued."
      fi
      # RESERVED IS A DIFFERENT AND MORE USEFUL THING TO SAY THAN AMBIGUOUS, and it is the job's own second
      # clause: with rows on the register and no bundle md5 among them, the number names NOTHING yet. #467 and
      # #478 are that shape, and the old note told a reader they named several artefacts where there are zero.
      # IT IS SUPPRESSED FOR A CLEARED NUMBER, because "names no artefact yet" reads as "still available to
      # build under" and a cleared number is the opposite of that [F9].
      if [ "$BCNT" = "0" ] && [ "$CLRN" = "0" ]; then
        echo "  NOTE: #$N is RESERVED and names NO artefact yet - every row's bundle md5 is '-'. Nothing has"
        echo "  been built under it, so there is nothing to cite and nothing ambiguous about it."
      fi
      if [ "$BCNT" -gt 1 ]; then
        # WORDING CORRECTED (#454, antagonist B). This said "that is a COLLISION ... Do not reuse it" for ANY
        # number with more than one row, and FOUR of the five it fired on are not collisions at all: #440,
        # #441, #451 and #452 each name several artefacts because their run rebuilt mid-pass, which `record`
        # itself calls legal eight lines below and which this register's header calls the median behaviour.
        # It fired hardest on #452 - what origin/main actually serves - telling any auditing run that the live
        # build names two trees. An alarm wrong four times out of five is noise by its second day, and it would
        # have destroyed the signal for #416, the one real collision this file was written to make visible.
        # THE COUNT IS DISTINCT BUNDLES AND NOT ROWS [#544 item (32)]. The sentence below is #454's, which is
        # correct; what was wrong was the number in it. A `minted` row, an `issued` row and a `shipped` row of
        # a bundle already counted all add rows and no artefacts.
        echo "  NOTE: #$N names $BCNT artefacts. That is usually LEGAL and expected - a run that fixes something"
        echo "  mid-pass rebuilds, so one number names several bundles. It means 'measured on #$N' is AMBIGUOUS:"
        echo "  cite the bundle md5 alongside the number."
        echo "  A GENUINE COLLISION - one number, two different TREES from two different runs - is a different"
        echo "  thing and the rows say so themselves (see #416's two arms). Compare the runIds above."
      fi
      # WIRED TO THE SAME TEST AS next/mint (can_issue). It used to print "Next free number is #1000. Use mint" on a
      # register where mint exits 2: two documented verbs, opposite answers, and the one that recommended the verb
      # that cannot work also named the forbidden number.
      if can_issue check; then
        echo "  Next free number is #$(( $(highest) + 1 )). Use \`gates/buildnum.sh mint\` rather than picking one."
      else
        echo "  No number can be handed out right now: \`gates/buildnum.sh next\` refuses, and its message says why."
      fi
      exit 1
    fi
    zero_led_report check
    echo "free: #$N is on no row of $(basename "$REG") ($(rows | wc -l | tr -d ' ') row(s) checked)"
    exit 0 ;;

  next)
    zero_led_report next
    H="$(highest)"
    [ -n "$H" ] || { echo "buildnum.sh next: the register has no numbered rows, so there is no series to continue." >&2
                     echo "  Refusing to invent one. Seed the register before using next/mint." >&2; exit 2; }
    NX=$(( H + 1 ))
    if ! in_range "$NX"; then
      echo "buildnum.sh next: the next number would be #$NX, which is ${#NX} digits and outside the" >&2
      echo "  ^#[0-9]{3,4}\$ that build.sh and gates.sh require. Reporting it rather than printing a number" >&2
      echo "  nothing downstream will accept. Look for a bad high row in the register." >&2; exit 2; fi
    delta_ok "$NX" "$H" "next" || exit 2
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
    zero_led_report mint
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
    if ! delta_ok "$N" "$H" "mint"; then lock_free; exit 2; fi
    # Unreachable once highest() normalises, and kept anyway: it is the assertion that says so, and it costs one
    # case. If a later edit reverts the normalisation this refuses before the append rather than after it, which
    # on an append-only register is the whole difference. lock_free first - a refusal must not hold the lock.
    case "$N" in 0*) lock_free; plain_dec_or_die "$N" mint ;; esac
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
    # DISTINCT BUNDLES, NOT ROWS [#544 item (32)]: the job's notChecked guessed this one was safe because it
    # already filters to the states that build. It is not - `built` then `shipped` for ONE bundle is two rows -
    # so it is counted the same way as the other three reports, from the one helper.
    BUILTN="$(printf '%s\n' "$HITS" | awk -F'\t' '($2=="built"||$2=="shipped"||$2=="held") && $4!="-" && $4!="" {print $4}' | sort -u | awk 'NF{c++} END{print c+0}')"
    if [ "$BUILTN" != "0" ]; then
      echo "stampable: #$N is yours and already names $BUILTN artefact(s) you built. A REBUILD, which is legal -"
      echo "  this register's own header calls it the median behaviour of a run that fixed something mid-pass."
      echo "  The new bundle will be recorded as a further artefact under #$N, so cite the md5, not the number."
      exit 0; fi
    echo "stampable: #$N is yours, minted and not yet built ($MINE row(s)). This is the happy path."
    exit 0 ;;

  add)
    N="$(want_num "${2:-}")" || exit 2
    zero_led_report add
    plain_dec_or_die "$N" add
    STATE="${3:-}"; SHA="${4:-}"; MD5="${5:-}"; shift 5 2>/dev/null || true; NOTE="${*:-}"
    if [ -z "$STATE" ] || [ -z "$SHA" ] || [ -z "$MD5" ] || [ -z "$NOTE" ]; then
      echo "usage: gates/buildnum.sh add <#NNN> <state> <sha> <bundleMd5> <note...>"
      echo "  state: minted | issued | built | shipped | held | abandoned | cleared.  sha/bundleMd5 may be '-'. CT_SRCMD5 optional."
      echo "  (\`cleared\` has its own subcommand, which checks that there is something to clear: gates/buildnum.sh clear <#NNN> <why>.)"; exit 2; fi
    case "$STATE" in minted|issued|built|shipped|held|abandoned|cleared) ;; *)
      echo "buildnum.sh add: state '$STATE' is not one of minted, issued, built, shipped, held, abandoned, cleared"; exit 2;; esac
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
    # THE STRAY TEST COMES LAST, after every validation above, so each of those refusals keeps its own reason: a
    # control that asserts only "exit 2" cannot tell this refusal from a bad state or a non-hex md5 if it runs first.
    stray_check "$N" add || exit 2
    lock_take || exit 1
    append_row "$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
      "$N" "$STATE" "$SHA" "$MD5" "$SRC" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "$PROV" "$NOTE")"
    lock_free
    if [ "$EXIST" != "0" ]; then
      echo "buildnum.sh: WARNING - #$N already had $EXIST row(s). It now has $(( EXIST + 1 ))."
      echo "  Recorded, not refused: a real collision must be describable. But if you are STAMPING a bundle"
      echo "  with #$N, stop - use \`mint\` and take a fresh number."
      # ── EXIT 3: RECORDED, AND IT WAS A DUPLICATE [#544, item (10); item 5 of
      # jobs/the-build-number-register-landed-with-a-named-remainder-2026-10-01, antagonist B's residual].
      # The warning above was printed at EXIT 0, so a CALLER could not tell "recorded" from "recorded, and this
      # number already had rows" - it had to parse the prose. held.sh's sibling refuses outright with exit 1,
      # which is wrong here on purpose (#416 genuinely has two trees and the register must be able to describe
      # reality), so the answer is a THIRD code rather than a refusal: 3 is this project's established "done,
      # with a caveat" (gates/buildnum.sh sweep already exits 3 on a shallow clone, where it did the work and
      # cannot vouch for the denominator). Nothing is refused and nothing is silent.
      echo "buildnum.sh: recorded #$N as $STATE. Commit it to main."
      echo "  exit 3 = recorded, and the number already had rows. Exit 0 means it was the first."
      exit 3
    fi
    echo "buildnum.sh: recorded #$N as $STATE. Commit it to main." ;;

  clear)
    # ── `clear` EXISTS SO THAT CLEARING A NUMBER HAS A VISIBLE FORM [#544, item (10); item 5 of
    # jobs/the-build-number-register-landed-with-a-named-remainder-2026-10-01].
    # WHAT IT IS FOR. gates/held-trees.tsv documents a `-` PREFIX as its clearing convention, and the two files
    # are siblings a reader moves between - but in THIS register a `-`-prefixed first field makes the row
    # INVISIBLE to every subcommand (rows() requires field 1 to be a bare number), in a file whose header says a
    # number is never removed. #454 added a lint to `list` that NAMES such a line; this is the other half, the
    # sanctioned way to say "this number was recorded and no longer stands" without editing or hiding anything.
    # IT IS APPEND-ONLY LIKE EVERY OTHER WRITE HERE: it adds a `cleared` row and changes no existing byte, and
    # `check` NAMES A CLEARED NUMBER as cleared, in its own line above the row list, and SUPPRESSES the
    # RESERVED note for it. THIS SENTENCE USED TO CLAIM A LABELLED SECTION THAT DID NOT EXIST [antagonist A of
    # #544, F9]: cleared rows printed inline like every other row, and because they carry no bundle md5 the
    # RESERVED note then told an auditing run the number "names NO artefact yet", which is true of the field and
    # the opposite of what had happened to the number. Behaviour supplied and claim corrected together, because
    # correcting only the claim would have left the reader with the wrong reading and no tell.
    # TWO REFUSALS AND ONE CAVEAT CODE, so a caller can tell the three outcomes apart:
    #   exit 2  the number has NO prior row - you cannot clear what was never recorded, and a lone `cleared`
    #           row would be a claim about a number this register has never seen.
    #   exit 3  it was ALREADY cleared - the row is written (append-only, and a second clearance with a new
    #           reason is a legitimate record), and 3 says it was not the first.
    #   exit 0  cleared, and this is the first clearance.
    N="$(want_num "${2:-}")" || exit 2
    zero_led_report clear
    plain_dec_or_die "$N" clear
    shift 2 2>/dev/null || true; NOTE="${*:-}"
    if [ -z "$NOTE" ]; then
      echo "usage: gates/buildnum.sh clear <#NNN> <why it no longer stands, 20+ chars>"; exit 2; fi
    if [ "${#NOTE}" -lt 20 ]; then echo "buildnum.sh clear: the note is ${#NOTE} characters. Say why it no longer stands."; exit 2; fi
    case "$NOTE" in *"	"*) echo "buildnum.sh clear: the note contains a TAB, which would truncate it at the field break"; exit 2;; esac
    if [ -z "${CT_RUNID:-}" ]; then
      echo "buildnum.sh clear: CT_RUNID is not set. A row whose author cannot be traced is half a record."; exit 2; fi
    EXIST="$(print_rows_for "$N" | wc -l | tr -d ' ')"
    if [ "$EXIST" = "0" ]; then
      echo "buildnum.sh clear: #$N has no row in this register, so there is nothing to clear."
      echo "  A lone 'cleared' row would be a claim about a number this register has never seen."
      echo "  Did you mean \`add\`?  gates/buildnum.sh check '#$N'  shows what it holds."
      exit 2
    fi
    WASCLEAR="$(print_rows_for "$N" | awk -F'\t' '$2=="cleared"' | wc -l | tr -d ' ')"
    stray_check "$N" clear || exit 2
    lock_take || exit 1
    append_row "$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' \
      "$N" "cleared" "-" "-" "-" "$(date -u +%Y-%m-%dT%H:%MZ)" "$CT_RUNID" "cleared" "$NOTE")"
    lock_free
    echo "buildnum.sh: #$N recorded as cleared over its $EXIST existing row(s). Commit it to main."
    if [ "$WASCLEAR" != "0" ]; then
      echo "  exit 3 = it already carried $WASCLEAR cleared row(s); this is not the first clearance."
      exit 3
    fi
    ;;

  record)
    N="$(want_num "${2:-}")" || exit 2
    # AND `record` IS GUARDED, WHICH IS THE ONLY ONE OF THE WRITE VERBS A RUN REACHES WITHOUT TYPING IT. The
    # first version of this fix guarded `mint` and `add` - the two a human invokes - and left this one open, so
    # the claim at plain_dec_or_die ("stops a new bad row being created at all") was false for the one path that
    # writes a row BY ITSELF: gates/build.sh:202 calls `record` after a successful stamp. MEASURED on this tree
    # before the fix: `gates/build.sh '#0538'` passes its own ^#[0-9]{3,4}$ shape test, stamps the bundle, and
    # `record` appended `0538 built ...` at exit 0 with no warning at all. Found by antagonist A, #537.
    plain_dec_or_die "$N" record
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
    # DISTINCT BUNDLES OTHER THAN THIS ONE, not `built` ROWS [#544 item (32)]. A bundle recorded `built` and
    # later `shipped` is two rows and one artefact, so the old count announced a rise that had not happened.
    PRIOR="$(bundles_for "$N" | awk -v m="$MD5" '$0!=m{c++} END{print c+0}')"
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
    # them. THE FIRST VERSION OF THIS COMMENT THEN SAID "nothing compared it to the commit history", AND THAT
    # IS FALSE AND IS WITHDRAWN HERE [R18] - #465's antagonist A refused it with one command. #454 DID sweep
    # the commit history, in a documented second pass: 123 rows on origin/main carry provenance `git-log`
    # (`git show origin/main:gates/build-numbers.tsv | grep -cP '\tgit-log\t'` is 123) and their own note
    # states the method, `git log --all --format=%s | grep -oE '^#[0-9]{3,4}'`. So the cause is not an absent
    # sweep, it is the SCAN'S SHAPE - and "one character" is TOO NARROW, which is antagonist B's correction to
    # antagonist A in the cross-read and is measured: dropping the leading anchor reaches 87 of the 88 and ZERO
    # of the 16 hashless `Build NNN` numbers, because those are missed by the anchored and unanchored `#` forms
    # alike. There were always TWO INDEPENDENT GAPS and the fix needed both. The anchor is the larger one: 89 numbers are named only away from the
    # start of a subject ("Revert main to #439", "docs after #374"), and 87 of the 88 this build swept in are
    # in exactly that class. Naming the wrong cause would have sent the next reader to the wrong file.
    # AND #454 CHOSE THAT ANCHOR DELIBERATELY, so dropping it is a POLICY CHANGE and is argued, not assumed.
    # Its row says a plain scan "also returns cross-references like '#125' in 'Friends: cloud functions
    # (request/accept/list/remove) for #125', which was never a build number" - and that is true, and this
    # build records #125 anyway. THE REASON IS US-BN-01's ASYMMETRY: `issued` for a number nobody used costs
    # a GAP, and the register's own header says a gap costs nothing and must never be tidied up; `free` for a
    # number somebody used costs a SECOND TREE under one name. So the two error directions are not comparable
    # and the cheap one is the one to take. What must NOT be claimed, and was in the first version of this
    # build's own note, is that every number swept in is a genuine build number: some are cross-references,
    # #125 among them, and recording them is a deliberate over-approximation of "spent".
    # Three of the four builds on 2026-10-02 stood down on the push. MEASURED HERE at #465, on an
    # UNSHALLOWED clone of 857 commits: 312 distinct numbers were named in commit subjects across all refs,
    # 224 OF THOSE were on the register, and 88 were named by a commit and absent from it. The register's own
    # total was 226 distinct, which is a DIFFERENT number and is not the subtrahend: 226 - 224 = 2 numbers
    # (#369 and #455) are on the register and named by no subject at all. The first version of this comment
    # spliced those two denominators into one sentence and read "312 named, 226 on the register, 88 absent",
    # which does not subtract - caught by #465's antagonist B, in the file whose own header lectures about a
    # count with no scope. The one that matters is #463, whose
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
    # THE EXTRACTOR MATCHES TWO FORMS, AND THE SECOND ONE WAS MISSED ON THE FIRST VERSION OF THIS
    # SUBCOMMAND - found by #465's antagonist B at the shipped-surface door, upheld, and it is the whole
    # reason this comment enumerates rather than asserts. The first version required the '#', and this
    # project's early history does not use it: 27 subjects read "Build NNN:" with no hash, naming 16
    # distinct numbers (#238-#246, #265, #271-#276), every one of which answered `free` while the sweep
    # printed "the register names every number any commit does". "Build 276: hide in-game Hint in online
    # human games" is unmistakably a build number in this series, and "Build #276" (78 subjects) was being
    # swept while "Build 276" (27) was not - the only difference being whether that run typed a '#'.
    # I HAD CHECKED THE REGEX IN ONE DIRECTION ONLY. I enumerated what could wrongly MATCH (issue refs,
    # PR numbers) and found none, and never enumerated what could wrongly MISS. Both directions now:
    #   MUST match   #NNN (463 subjects), Build #NNN (78), build #NNN (3), Build NNN (27)
    #   MUST NOT match, all real strings in this history and all meaning something else entirely:
    #     "GATES GREEN at 3320" and "49 suites / 3320" (assertion totals), "375x730" (a geometry),
    #     "TC-PL-034" (a case id), "97b1234" (a sha fragment), "-> 730", "Kunal's 375".
    # So the pattern stays ANCHORED to '#' or to the literal word "build". It is deliberately not
    # loosened to a bare [0-9]{3,4}, which would swallow every count and geometry above.
    # SUBJECTS ONLY (--format='%s'), AND THE BODY SCAN THAT WAS HERE FOR ONE REVISION IS REMOVED BECAUSE IT
    # CREATED A FEEDBACK LOOP: WRITING ABOUT A BUILD NUMBER SPENT IT. Antagonist A asked for bodies; antagonist
    # B refuted it in the cross-read, measured at HEAD rather than argued. This build's own commit message and
    # HANDOFF.md document the 4-digit `comm` demonstration, whose text contains #999, #1000 and #1001. With
    # bodies in scope the sweep reported exactly those three as spent-and-absent, exit 3 - so with the new
    # gates/build.sh wiring EVERY later build would have printed "the register and the commit history DISAGREE"
    # and offered `sweep --add` as the remedy, which would have written three permanent rows for numbers nothing
    # ever built, TWO OF THEM IN THE FUTURE, moving `next` from #466 to #1002 and skipping 535 numbers. A
    # warning that is always wrong plus a one-command remedy that is destructive is strictly worse than the gap
    # it closed. It is also the self-reference trap this project records ten times, in a new costume: the
    # DOCUMENTATION of a defect became an INPUT to the scanner that defect was in.
    # AND THE DOOR IT CLOSED WAS EMPTY ANYWAY, which is what settles it. Measured at 0ed7f05, before this
    # build's commits existed: bodies name exactly ONE number no subject names, #455, and it was already on the
    # register. So the body scan never found anything and cost a live feedback loop. (A's supporting claim, that
    # a body scan "would have found #342 mechanically", was already measured WRONG - `git log 0ed7f05
    # --format='%b' | grep -c '#342'` is 0, and A conceded it in the cross-read.)
    # THE RESIDUAL, NAMED RATHER THAN ENGINEERED AWAY: a commit SUBJECT that mentions a number in prose still
    # spends it, and this history has such subjects ("Revert main to #439", "docs after #374") - but every one
    # of those names a real build, subjects here are short and claim-shaped by convention, and the sweep only
    # WARNS while `--add` stays manual. Bounding the subject form to a claim marker is the next step if a
    # subject ever spends a number nothing built; it is not needed today and guessing at it is not free.
    NAMED="$(git -C "$HERE" log --all --format='%s' 2>/dev/null \
      | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | sed 's/^0*//' | sort -un)"
    NNAMED="$(printf '%s\n' "$NAMED" | grep -c '[0-9]' || true)"
    ONREG="$(rows | cut -f1 | sort -un)"
    NONREG="$(printf '%s\n' "$ONREG" | grep -c '[0-9]' || true)"
    # comm REQUIRES LEXICOGRAPHIC ORDER AND BOTH SETS ABOVE ARE SORTED NUMERICALLY, which agree only
    # while every number has the same number of digits. #465's antagonist B found this; it is latent today
    # (zero 4-digit numbers exist in subjects or on the register, measured) and it bites at #1000, which
    # `in_range` already permits. Demonstrated rather than reasoned: with NAMED={999,1000,1001} and
    # ONREG={1000}, numerically-sorted input makes comm report ALL THREE absent - including #1000, which
    # IS on the register - and the "not in sorted order" warning goes to stderr inside a command
    # substitution, so it is discarded and comm's exit 1 is never seen. `sweep --add` would then append a
    # duplicate row to a file whose header says a number is never removed. So: compare under LC_ALL=C and
    # sort only the DISPLAY numerically.
    ABSENT_ALL="$(comm -23 <(printf '%s\n' "$NAMED" | grep '[0-9]' | LC_ALL=C sort -u) \
                           <(printf '%s\n' "$ONREG" | grep '[0-9]' | LC_ALL=C sort -u) | sort -n)"
    # THE PLAUSIBILITY SPLIT (14 Oct direct run; jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10).
    # ABSENT_ALL is every number a commit subject names that the register does not, and on this repository's own
    # main that set holds #999 and #1000, named by the subject of ded2b2b, the reverted first attempt at this very
    # bound. They are not builds: they are the TEXT of a commit about a defect, the self-reference trap this file
    # records for the body scan. The remedy this report used to print, `sweep --add`, would have written both as
    # rows: next and mint would then have handed out #1001 at exit 0, 481 numbers burned in one command, and
    # gates/build.sh prints that remedy on every build. So the set is split. A number is PLAUSIBLE when it lies
    # inside the register's series or is joined to its top by steps no bigger than the margin (each one extends
    # the top for the next, so a short chain is recorded whole); ABSENT keeps its old meaning for those alone.
    # The rest are IMPLAUSIBLE: reported, never counted as absent, never written. A number that is implausible
    # today becomes plausible, and is reported as absent, the moment the series gets within the margin of it.
    SPLIT="$(printf '%s\n' "$ABSENT_ALL" | grep '[0-9]' | split_plausible)"
    ABSENT="$(printf '%s\n' "$SPLIT" | sed -n 's/^P //p')"
    IMPLAUSIBLE="$(printf '%s\n' "$SPLIT" | sed -n 's/^I //p')"
    NABSENT="$(printf '%s\n' "$ABSENT" | grep -c '[0-9]' || true)"
    NIMPL="$(printf '%s\n' "$IMPLAUSIBLE" | grep -c '[0-9]' || true)"
    printf 'buildnum.sh sweep: measured over %s commits on %s refs (shallow: %s)\n' "$NCOMMITS" "$NREFS" "$SHALLOW"
    # LABEL THE UNITS. #465's antagonist B measured that this line said "316 on build-numbers.tsv" while
    # `check` and `list` both say "340 row(s)" of the same file, with nothing saying one counts DISTINCT
    # NUMBERS and the other counts ROWS - so a later run comparing the two sees an unexplained 24 and no
    # way to tell which is wrong. A number legitimately has several rows (minted, built, shipped), which is
    # the whole reason the two differ.
    printf '  %s distinct number(s) named in a commit subject; %s distinct on %s (%s row(s)); %s NAMED AND ABSENT.\n' \
      "$NNAMED" "$NONREG" "$(basename "$REG")" "$(rows | wc -l | tr -d ' ')" "$NABSENT"
    if [ "$NIMPL" != "0" ]; then
      echo "  implausible: $(printf '%s\n' "$IMPLAUSIBLE" | grep '[0-9]' | tr '\n' ' ')"
      echo "  ($NIMPL more number(s) named in a commit subject but joined to the register's series by no step of"
      echo "  ${BUILDNUM_MAX_DELTA} or less, so they are NOT counted as absent and sweep --add will never write them: a cross-reference or"
      echo "  a typo, not a build. Writing one would make next and mint refuse, or burn every number below it.)"
    fi
    if [ "$SHALLOW" = yes ]; then
      echo "  WARNING - THIS CLONE IS SHALLOW, so the count above is a LOWER BOUND and a clean result proves"
      echo "  nothing. Run \`git fetch --unshallow\` first, or treat this sweep as unmeasured."; fi
    if [ "$NABSENT" = "0" ]; then
      [ "$SHALLOW" = yes ] && { echo "  no absent numbers found, but see the shallow warning above"; exit 3; }
      if [ "$NIMPL" != "0" ]; then
        echo "  the register names every number any commit SUBJECT names that its series reaches; the implausible"
        echo "  ones listed above are the only others, and none is a build. NOT CHECKED: commit BODIES and git tags."
        exit 0; fi
      echo "  the register names every number any commit SUBJECT names, in either the #NNN or the 'Build NNN'"
      echo "  form. NOT CHECKED: commit BODIES (deliberately - scanning them made writing about a number spend"
      echo "  it) and git tags (there are none today, so that door is shut rather than covered)."
      exit 0; fi
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
    # ── RE-DERIVE INSIDE THE LOCK, AND CARRY THE SHA ─────────────────────────────────────────────────────────
    # Two jobs, one block, because both fixes are in it and doing one alone would park two patches on one file:
    # jobs/sweep-computes-the-absent-set-before-it-takes-the-lock-2026-10-02 (P2, #465 antagonist A, diff door)
    # jobs/swept-register-rows-cite-no-sha-so-they-cannot-be-audited-without-the-tool-2026-10-02 (P2, antagonist B).
    #
    # WHY THE RE-DERIVATION. ABSENT above is computed BEFORE lock_take, so the lock serialised only the APPENDS:
    # two concurrent `--add` runs both compute the same absent set, both pass the lock in turn, and both append
    # it - duplicate `issued` rows in a file whose own header says a row is never removed, after which `check`
    # reports numbers as naming SEVERAL artefacts when they name none. That is #454's alarm-that-is-always-wrong,
    # in the register that alarm is about. Not reachable while the pen rule leaves exactly one writer, which is
    # why it is P2 and not higher; the finding was from reading the code and the job says so rather than implying
    # a race was run, and nothing here claims to have raced it either.
    # THE JOB OFFERED TWO FIXES AND NAMED THE BETTER ONE, and this takes that one: re-derive inside the lock
    # rather than merely take the lock earlier, because it makes --add IDEMPOTENT under concurrency instead of
    # only serialised, and it costs one re-read of a file already in page cache.
    # ONREG_NOW AND ABSENT_NOW ARE NEW NAMES AND NOT A REASSIGNMENT, deliberately. The report above printed the
    # PRE-LOCK figures and must keep saying what IT measured [R18]; and a pair of distinct names is what lets a
    # selftest assert the ORDER OF OPERATIONS by reading this script, which is the deterministic control the job
    # proposes in place of racing two processes - a true concurrency case needs two processes and would have to
    # argue R36 admission first.
    ONREG_NOW="$(rows | cut -f1 | sort -un)"
    ABSENT_NOW="$(comm -23 <(printf '%s\n' "$NAMED" | grep '[0-9]' | LC_ALL=C sort -u) \
                           <(printf '%s\n' "$ONREG_NOW" | grep '[0-9]' | LC_ALL=C sort -u) | sort -n)"
    # LC_ALL=C ON BOTH SIDES, EXACTLY AS IN THE PRE-LOCK COMPUTATION ABOVE. #465's antagonist B found that comm
    # wants lexicographic order while both sets are sorted numerically, and that the two agree only while every
    # number has the same digit count - it bites at #1000, which in_range already permits. This copy must never
    # drift from that one, and gates/buildnum-selftest.sh's 4-digit fixture now covers BOTH of them.
    # THE SPLIT IS RE-DERIVED TOO, against the series as it stands INSIDE the lock, because rows another writer
    # added since the report can move the top. ABSENT_NOW stays the whole re-derived set, and the loop below
    # iterates only its plausible part.
    SPLIT_NOW="$(printf '%s\n' "$ABSENT_NOW" | grep '[0-9]' | split_plausible)"
    ABSENT_NOW_PLAUSIBLE="$(printf '%s\n' "$SPLIT_NOW" | sed -n 's/^P //p')"
    ABSENT_NOW_IMPLAUSIBLE="$(printf '%s\n' "$SPLIT_NOW" | sed -n 's/^I //p')"
    # WHAT IS DELIBERATELY *NOT* RE-DERIVED: NAMED. It comes from git history, which no concurrent `--add` can
    # change, so re-walking it here would hold the lock across a full `git log --all` and buy nothing.
    #
    # THE SHA MAP, AND WHY A ROW WITH NO SHA IS NOT A RECORD. Every row --add wrote before this change carried
    # sha '-' and a note saying only that 'a commit subject on some ref names #NNN', so 104 of the register's
    # numbers became assertions whose only evidence was the tool that made them - while the pre-existing rows
    # cite a sha, a gatelog filename or RUN-LOG.md. This project's own rule is that a measurement must say how it
    # was taken well enough to be re-derived (#411/#412, publish the command with the count). The walk that
    # yields the subject already yields %H and the old formatting threw it away.
    # --reverse MAKES "THE FIRST SHA THAT NAMES EACH NUMBER" THE OLDEST SUCH COMMIT, so the value is
    # deterministic rather than whatever the ref enumeration happened to be that day [R36].
    # THE EXTRACTOR IS THE SAME PIPELINE AS NAMED ABOVE, CHARACTER FOR CHARACTER, AND THAT IS LOAD-BEARING: a
    # second regex that drifted would attribute a number to a commit that does not name it, or find no sha for a
    # number NAMED did match. The pre-filter is on the WHOLE LINE and changes nothing semantically - a line whose
    # subject matches also matches as a line, and a line that matched only via the sha is impossible, because a
    # 40-hex sha contains no '#' and no word "build" - so it only skips commits that could never contribute.
    # NO awk INTERVAL MATCH ANYWHERE IN IT. mawk 1.3.4's leftmost-shortest match() on /[0-9]{3,4}/ is what got
    # burst wave 1's patch 11 on this very file DROPPED from the 2026-10-03 integration
    # (jobs/buildnum-patch-computes-the-absent-set-lexicographically-and-breaks-its-own-selftest-2026-10-03), and
    # the one awk here compares a whole field for equality and matches no pattern at all. Baseline measured
    # before touching the file: gates/buildnum-selftest.sh is 76 pass / 0 fail on origin/main 2bb09bf, which is
    # the exact figure that dropped patch broke (76/0 -> 75/1).
    # IT IS BUILT HERE, INSIDE THE LOCK AND ONLY ON THE --add PATH, because it is the most expensive thing this
    # subcommand does and `--report`, which gates/build.sh reaches on every build, must not pay for it.
    # ONE RESIDUAL, NAMED RATHER THAN ENGINEERED AWAY: a subject containing a literal tab would be split by the
    # read below and only its first part scanned. git subjects are single-line and this history has none; if one
    # ever appears the symptom is the loud refusal below, not a wrong sha.
    SHAMAP="$(git -C "$HERE" log --all --reverse --format='%H%x09%s' 2>/dev/null \
      | grep -iE '(#|\bbuild +)[0-9]{3,4}' \
      | while IFS=$'\t' read -r _sha _subj; do
          printf '%s\n' "$_subj" \
            | grep -oiE '(#|\bbuild +)[0-9]{3,4}' | grep -oE '[0-9]{3,4}' | sed 's/^0*//' \
            | while read -r _n; do printf '%s\t%s\n' "$_n" "$_sha"; done
        done)"
    N_WROTE=0
    for n in $(printf '%s\n' "$ABSENT_NOW_PLAUSIBLE" | grep '[0-9]'); do
      # DEAD TODAY AND LOUD IF IT EVER FIRES. Antagonist A measured that `in_range` can never reject here,
      # because every element came from a {3,4}-digit match - and that a silent `continue` would have let
      # --add exit 0 having written nothing while the sweep stayed dirty, which is the worst shape a guard
      # can have. So it reports and fails instead of skipping quietly.
      in_range "$n" || { echo "buildnum.sh sweep --add: refusing to write '$n', which is not 3-4 digits."
        echo "  This is unreachable by construction; if you are reading it, the extractor changed."
        lock_free; exit 2; }
      # AND NOT WITH A LEADING ZERO EITHER - BUT KNOW WHY THIS IS A BELT AND NOT A FIX, because the first version
      # of this comment got that wrong and said the opposite. It claimed the sweep is "the one write path that can
      # be fed a malformed number by a third party", since its numbers come from COMMIT SUBJECTS. MEASURED at #537
      # by antagonist A, on a git fixture whose only interesting subject is "#0538 a zero-led number in a commit
      # subject": the row lands as `538`. The extractor at :749 ends `| sed 's/^0*//'`, so the number is
      # NORMALISED before `in_range` or this guard sees anything, and A settled it by instrumenting the line -
      # the guard receives n=[538]. So this guard is UNREACHABLE BY CONSTRUCTION TODAY and what protects this verb
      # is the extractor, not this line. It is kept as a belt on the one verb whose input is not typed by a hand,
      # and case 31 does NOT control it - what controls it is the assertion in that case pinning the `sed 's/^0*//'`
      # in the extractor, so that removing the normalisation makes this guard necessary again rather than silently
      # load-bearing. The commit message of b0d3464 carries the false version of this sentence; it is corrected
      # here and in the run report, and this is the same defect class that commit existed to fix.
      # lock_free first: plain_dec_or_die exits, and the siblings above all release the lock before they do.
      case "$n" in 0*) lock_free; plain_dec_or_die "$n" "sweep --add" ;; esac
      # THE SHA IS REFUSED, NEVER QUIETLY WRITTEN AS '-'. A '-' in field 3 is the defect this change removes, so
      # falling back to one on a miss would reintroduce it silently for the one row where it matters. Unreachable
      # by construction, like the guard above - every element of ABSENT_NOW came out of NAMED, which came out of
      # the same subjects this map was built from - so if you are reading it the two extractors have drifted.
      NSHA="$(printf '%s\n' "$SHAMAP" | awk -F'\t' -v n="$n" '$1==n{print $2; exit}')"
      [ -n "$NSHA" ] || { echo "buildnum.sh sweep --add: no commit sha found for '$n', which NAMED matched."
        echo "  The two extractors have drifted; refusing to write a row that cannot be re-derived."
        lock_free; exit 2; }
      # AND IT IS RESOLVED BEFORE IT IS WRITTEN, which is the half of this job that makes the row auditable:
      # `add` already validates that a sha names a real object, so a swept sha is held to the same bar. This
      # also discharges the field-forgery check clean_field exists for without a subshell that could exit while
      # holding the lock: a value `cat-file -e` resolves is 40 hex characters and can carry no tab or newline.
      git -C "$HERE" cat-file -e "$NSHA" 2>/dev/null || {
        echo "buildnum.sh sweep --add: sha '$NSHA' for '$n' does not resolve in this repository."
        echo "  Refusing to write a row whose own evidence cannot be fetched."
        lock_free; exit 2; }
      append_row "$(printf '%s\tissued\t%s\t-\t-\t%s\t%s\tgit-log\t%s' "$n" "$NSHA" "$AT" "$CT_RUNID" \
        "Swept in: commit $NSHA names #$n in its subject, so the number was used and must never be reused. Re-derive this row with \`git show --no-patch --format=%s $NSHA\`. State issued, not shipped - a commit subject does not prove a bundle. Found by buildnum.sh sweep over $NCOMMITS commits on $NREFS refs.")"
      N_WROTE=$(( N_WROTE + 1 ))
    done
    lock_free
    # BOTH FIGURES ARE PRINTED WHEN THEY DIFFER, because that difference is the entire point of the
    # re-derivation: it means another writer landed rows between the report above and this append. Without this
    # line "recorded 2 number(s)" under a report saying "3 NAMED AND ABSENT" reads as a lost row, and a reader
    # chasing it would find nothing wrong.
    if [ "$N_WROTE" != "$NABSENT" ]; then
      printf 'buildnum.sh sweep: %s number(s) were absent when this run MEASURED and %s when it held the LOCK;\n' \
        "$NABSENT" "$N_WROTE"
      echo "  another writer recorded the difference. Nothing was lost and nothing was written twice."
    fi
    if [ -n "$(printf '%s' "$ABSENT_NOW_IMPLAUSIBLE" | tr -d ' \n')" ]; then
      echo "buildnum.sh sweep: NOT recorded, implausible: $(printf '%s\n' "$ABSENT_NOW_IMPLAUSIBLE" | grep '[0-9]' | tr '\n' ' ')"
      echo "  (no step of ${BUILDNUM_MAX_DELTA} or less joins them to the series; writing them would wedge next and mint)"
    fi
    printf 'buildnum.sh sweep: recorded %s number(s) as issued. Commit %s to main.\n' "$N_WROTE" "$(basename "$REG")" ;;

  list)
    # LINT FOR THE INVERSE OF held.sh's LESSON (#454, antagonist B). held.sh guarded against a row that LOOKS
    # LIVE and can never match. The opposite is just as bad here and was uncovered: a line that looks recorded
    # and is INVISIBLE, because rows() requires field 1 to be a bare number. A row written `#458` (how every
    # other file in this directory writes a build number, held-trees.tsv included), or cleared with
    # held-trees.tsv's documented `-` prefix convention, vanishes from check, next AND list - in a file whose
    # header says a number is never removed. Named rather than silently skipped.
    # NUL-PROOFED WITH THE SAME `tr -d` AS rows() [#534, NUL]. This scan reads $REG directly rather than
    # through rows(), by design - its whole job is to find lines rows() CANNOT see - so fixing rows() alone
    # would have left `list` blind to every ghost in a NUL-bearing register while rows() read it whole: the
    # two readers would have disagreed about the same file, which is worse than both being wrong.
    GHOSTS="$(tr -d '\000' < "$REG" | grep -vn '^[[:space:]]*#' | grep -v '^[0-9]*:[[:space:]]*$' | awk -F: -v q="'" '{line=$0; sub(/^[0-9]+:/,"",line); split(line,F,"\t"); if (F[1] !~ /^[0-9]+$/) print $1}' | tr '\n' ' ')"
    if [ -n "${GHOSTS// /}" ]; then
      echo "WARNING - line(s) $GHOSTS look like data but field 1 is not a bare number, so NO subcommand sees"
      echo "  them: not check, not next, not list. A '#458' or a '-'-prefixed first field does this. Fix them."
      echo
    fi
    printf 'build numbers on %s (%s row(s)):\n' "$(basename "$REG")" "$(rows | wc -l | tr -d ' ')"
    rows | sort -n -k1,1 | while IFS= read -r r; do show_row "$r"; done
    # THE SAME ROW-VS-BUNDLE CONFUSION, IN THE SECOND REPORT, which the job's notChecked named and did not
    # drive [#544 item (32)]: `cut -f1 | uniq -d` lists every number with more than one ROW, so the whole
    # mint-then-build population landed in a report headed NUMBERS NAMING MORE THAN ONE ARTEFACT. COUNTED on
    # this register rather than estimated - and the first draft of this very comment carried a guessed pair of
    # numbers, which is the fault this item is about: 55 numbers have more than one ROW and 32 of those name
    # more than one BUNDLE, so the old report named 23 numbers that are not ambiguous at all.
    DUP="$(for n in $(rows | cut -f1 | sort -n | uniq -d); do [ "$(nbundles_for "$n")" -gt 1 ] && printf '%s ' "$n"; done; true)"
    [ -z "${DUP// /}" ] || { echo; echo "NUMBERS NAMING MORE THAN ONE ARTEFACT: $DUP"
      echo "  Mostly legal: a run that rebuilt mid-pass. It means the NUMBER does not identify a bundle, so"
      echo "  cite the md5 with it. Only #416 is a genuine two-tree collision, and its own rows say so."; }
    zero_led_report list
    H="$(highest)"
    if [ -n "$H" ]; then
      echo
      if can_issue list; then echo "highest issued: #$H   next free: #$(( H + 1 ))"
      else echo "highest issued: #$H   next free: NONE - \`gates/buildnum.sh next\` refuses and its message says why"; fi
    fi ;;

  *) # Print only the comment block, derived rather than hard-coded - held.sh's --help printed three lines of
     # its own source because the range was pinned to a line number that drifted.
     END="$(grep -n -m1 -v '^#' "$0" | cut -d: -f1)"; sed -n "2,$((END-1))p" "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
