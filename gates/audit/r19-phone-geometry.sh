#!/usr/bin/env bash
# gates/audit/r19-phone-geometry.sh
#
# WHAT IT ANSWERS, in one line: does any artefact in this repository still describe a geometry
# OTHER than 375x761 as Kunal's phone?
#
# WHY IT EXISTS. prompts/common R19 was settled on 2026-10-03 in these words: "USE 375 x 761. The
# figure 730 is wrong and should be corrected wherever it appears, including the GEOS entry labelled
# kunal730". Four days later nothing had read that sentence against the tree. The case was specified
# as TC-SUITE-056 on jobs/the-disposition-pass-parked-every-r19-correction-and-kept-the-job-that-
# propagates-the-wrong-figure-at-priority-14-2026-10-07 by the external UAT challenger, complete with
# its pass condition, its input count and the statement that it fails today - and the case was the
# one half of that job nobody owned, because the job's `fix` field is a tracker edit belonging to the
# orchestrator. This file is that case, built. It is a COMPARATOR in the sense of R47: the ground
# truth (R19, settled) was already in our hands and nothing compared it to what we print.
#
# IT IS DELIBERATELY NARROW, AND THE NARROWNESS IS THE WHOLE DESIGN. Measured at origin/main
# 6fb630d over this script's own scope, the token `kunal730` occurs 197 times and `kunal761` 15. An
# audit that reddened on all 197 would be unreadable from the day it landed and would be ignored by
# the second week - which is the failure mode its sibling cited-not-run.sh recorded and corrected on
# 2026-10-06. A named geometry COLUMN called kunal730 is not an error: the error is an artefact that
# CALLS that geometry his phone, because that is the claim R19 overturned. So A1 fires only where the
# 730 token sits within 80 characters of a phrase claiming it is the real/his/actual phone. The
# census is printed on every run as context and is asserted by nothing, because a count that moves
# every build cannot be a pass condition [R18].
#
# IT DOES NOT ADMIT ANYTHING TO A SUITE AND CANNOT REDDEN ONE. Admission needs gates/gates.sh, whose
# log section count is pinned by gates/verify-log.sh - one extra section header there refuses every
# green log from that point on. This reports. A1 IS RED ON MAIN TODAY and that is the point: a case
# that passes before the fix proves nothing [R10 item 2].
#
# A3, ADDED 2026-10-10 by process-build lane 3 for work item 4 of
# jobs/gate-20-and-gate-21-never-visit-kunals-actual-geometry-2026-10-01. That item asks for "the
# fleet-wide sweep of the `kunal` token across the other ~50 gate files", and it has been owed since
# 1 October because a sweep is a one-off count: somebody derives it, writes it in a document, and it
# is stale by the next build. A3 makes it an INSTRUMENT. It counts the gates in gates/regress that
# ever launch at kunal761 and RATCHETS that count, so the number can only go up.
#
# A3 TAKES NO SIDE IN THE OPEN 730/761 CONTRADICTION, AND THAT IS WHY IT IS BUILDABLE TODAY.
# contradictions/r19-height-settled-against-the-phone-card-still-asking-2026-10-04 is open: R19 says
# 375x761, gates/lib.js:31 says kunal730 is the real phone, and 39 of the 58 gates on main name 730.
# Process lane 2 measured at 02:35Z on 2026-10-10 that deleting those 730 columns IS the resolution
# of that contradiction, and R45 reserves a resolution to someone other than whoever reports it. A3
# therefore asserts NOTHING about 730. It asserts only that the suite's 761 coverage does not FALL,
# which R19 settled on 2026-10-03 and which no side of the contradiction disputes. A1 is where the
# "calls 730 his phone" claim is already measured, and A1 is already red.
#
# WHY A RATCHET AND NOT A TARGET. A target ("all 58 gates must visit 761") would be red on the day it
# landed and would stay red for weeks, which is the failure cited-not-run.sh recorded on 2026-10-06
# and which this file's A1 census comment already names. A floor can be met today, cannot be met by
# bookkeeping, and turns a gate that LOSES its 761 column - or a new gate that never had one - into a
# red on the build that does it. The floor is a committed literal, so raising it is a diff.
#
# USAGE
#   gates/audit/r19-phone-geometry.sh             report against the repository it lives in
#   gates/audit/r19-phone-geometry.sh --strict    same, but exit 1 when a check is RED (for a caller)
#   gates/audit/r19-phone-geometry.sh --selftest  run the controls; needs no repository
#   CT_ROOT=<dir>                                 audit a different tree (the selftest uses this)
#
# EXIT CODES. Report mode: 0 always, so no caller can be broken by wiring it; read the VERDICT line.
# --strict: 0 all checks green, 1 a check is red, 2 the derivation is unsound (scope empty, or
# gates/lib.js unreadable) - the vacuous pass this script refuses to print green over.
# --selftest: 0 every control behaved, 1 a control did not.

set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${CT_ROOT:-$(cd "$SELF/../.." && pwd)}"

# ── THE TWO PATTERNS. Written once, used by both the report and the controls, so a control can
# never pass against a pattern the report does not use. That is the vacuity trap this family keeps
# finding: gates/audit/verify-patch-set.sh had two repo-reading checks whose only controls asserted
# the SKIP, and 12 assertions in gate 67 could not fail at all (#493).
# THREE BUGS IN MY OWN FIRST DRAFT, CAUGHT BY THESE CONTROLS AND NOT BY READING, recorded here
# rather than quietly fixed because the first of them is a trap any shell author can fall into.
#  (1) The window was written [^\n]{0,80}. In a POSIX bracket expression \n is not a newline: it is
#      the two literal characters \ and n, so [^\n] means "not a backslash and NOT THE LETTER n" and
#      the pattern silently failed on every string with an n in the gap - which is most English.
#      It is the exact shape of a check that reads as sound and asserts nothing. grep is line-based
#      already, so the correct window is .{0,80}.
#  (2) The claim can come BEFORE the number: gates/lib.js:29 reads "his phone's LAYOUT VIEWPORT is
#      375x730". A one-directional pattern missed the oldest of the three live sites.
#  (3) The multiplication sign was written as the escape \xc3\x97, which grep -E matches literally.
#      It is now the character itself.
# Four of the eight positives below failed on the first run. The controls are the only reason this
# file is not a green that means nothing [R10 item 2].
# AND A FOURTH, FROM THE SAME CONTROL SET: the multiplication sign cannot live in a BRACKET
# expression. This container's locale is LC_CTYPE=POSIX, where × is the two bytes C3 97 and a
# bracket matches ONE byte, so [xX×] matched neither half of the pair and C6 stayed red through the
# first fix. As an alternation BRANCH the two bytes are matched as a sequence and it passes in any
# locale, so the fix is locale-independent rather than a locale setting the next container may not
# have. A pattern that depends on the caller's locale is a pattern that passes here and fails in CI.
R19_MULT=$(printf '\xc3\x97')
R19_NUM="(375[[:space:]]*(x|X|${R19_MULT})[[:space:]]*730|kunal730)"
R19_PHRASE='(real phone|his phone|[Kk]unal.s phone|actual phone)'
CLAIM_RE="(${R19_NUM}.{0,80}${R19_PHRASE}|${R19_PHRASE}.{0,80}${R19_NUM})"
ANCHOR_TOKEN='kunal761'

# ── A3's THREE COMMITTED LITERALS.
# A3_FLOOR  MEASURED at origin/main 38a8a25 on 2026-10-10: `grep -lF kunal761 gates/regress/*.js | wc -l`
#           reads 6 of 58 gate files, and the SET was re-derived by command rather than copied from
#           any lane's description of itself [R18]: 21-review-brilliant, 26-invariants, 45-play-setup,
#           67-sel-cls-consumers, 72-drill-prev, 73-review-list-filter. NOTE WHAT IS NOT IN IT:
#           41-coach-bubble. Process lane 2 added its kunal761 column at 02:35Z on 2026-10-10 and that
#           work is PARKED, not landed - patches/proc-lane2-art-gates-regress-41-coach-bubble-js-2026-10-10
#           carries a patch and no integrationResult - so main does not have it. My own first draft of
#           this comment named 41 from that lane outcome and the firing demonstration below caught it,
#           which is the whole reason a floor is measured off the tree and not off a report. The floor
#           is that measurement and nothing
#           aspirational, so the arm is GREEN on the tree that introduces it and goes red only on a
#           regression. Raise it in a commit when the number rises; the report prints the exact line.
# A3_MIN_SUITE  The denominator guard. A3 self-selects OUT of a tree holding fewer than this many
#           regress gates, because the fixture trees in selftest() below carry one or two and a floor
#           of 6 over a two-file fixture is a red that says nothing about the suite. C24 to C29 drive
#           A3 over synthetic trees ABOVE this threshold in both directions, so the arm is never
#           asserted only by its own skip - which is the vacuity this family keeps finding.
# A3 IS A SEPARATE L.say-SHAPED CHECK AND NOT A CONJUNCT OF A1, deliberately: a compound whose halves
# cannot fail independently reads as two checks while being one.
A3_FLOOR="${CT_A3FLOOR:-6}"
A3_MIN_SUITE="${CT_A3MIN:-20}"

# ── A4. THE GEOMETRY TOKEN MAY NOT BE A CONTROL-FLOW DISCRIMINATOR OR A SOURCE OF DIMENSIONS.
# Built at #544 for jobs/the-geometry-token-is-a-control-flow-discriminator-so-the-761-migration-stays-green-
# while-deleting-coverage-2026-10-08, whose case id is TC-GATE-GEOTOKEN-001 (landed as TC-SUITE-230: there is
# no GATE-GEOTOKEN id space in claude/stories/TEST-CASES.md and every row in it is TC-<SPACE>-<NNN>).
#
# WHAT THE JOB PROVED, and it is the reason this arm exists rather than a reading of the code. gates/regress/
# 65-promotion-after-gameover.js read `const isLand=geoKey!=='kunal730'` and then launched `isLand?LAND:
# 'kunal730'`, so ANY token but that literal - the correct 375x761 included - routed the portrait case into the
# landscape branch, which ignores its argument. Its instrument, I00, was built from the same `isLand`, so it
# asserted the viewport it had been TOLD to expect. The external UAT challenger ran the one-token swap the 761
# migration prescribes on one bundle at #496: 'I00 [730x375]' printed TWICE, the portrait run was gone, and the
# gate reported the IDENTICAL 20 pass / 0 fail. Half the coverage, same verdict, same count. That is the twelfth
# costume of the trap CLAUDE.md records eleven times - the check and the thing being checked were one object,
# and here they were one TOKEN.
#
# I DID NOT IMPLEMENT THE PASS CONDITION THE JOB WROTE, AND THE REASON IS THE RULE ABOUT FLAGS' FIXES BEING
# HYPOTHESES [CLAUDE.md, #416]. It asks for "zero matches" of `(!==|===)\s*['"](kunal730|...)['"]` over
# gates/regress/*.js. Measured at #544 that regex returns TEN lines, and THREE OF THE TEN ARE PROSE: gates/
# regress/21-review-brilliant.js:274 and 48-lesson-flow.js:508 and :813, the last two being THIS PROJECT'S OWN
# WRITTEN RECORD of this exact trap from #410. A control demanding zero matches would be discharged by deleting
# the sentences that remember the lesson, which is worse than the defect. So A4 reads CODE and not prose
# (decomment below), and it splits the remaining seven by MECHANISM instead of banning the shape.
#
# A4a HARD, AND THE ONLY ONE THAT IS RED BEFORE THE FIX. A comparison on a geometry token whose result is BOUND
# TO A VARIABLE (var/let/const <name> =) or which yields a WIDTHxHEIGHT literal on the same line. Binding is
# precisely how one token becomes a discriminator reused in four places, and a WxH literal is a dimension read
# off a name. Exactly the job's two sites, and nothing else, measured: 2 before #544's fix, 0 after.
# WHAT A4a DELIBERATELY DOES NOT FLAG, said out loud because the obvious widening would: gates/regress/
# 36-evalbar.js:230 selects the explanatory CLAUSE of an assertion message with `geo==='kunal730'?...:...`. It
# is a ternary on a token and it is not this defect. Its per-geometry pin comes from BOARD_W[geo], a TABLE keyed
# on the token, and a rename makes that lookup undefined, which the gate reports as `L.note ... NOT YET PINNED`
# - LOUDLY, two lines above. A rename costs it the specific half of one sentence and nothing else. Widening A4a
# to every ternary would charge it and would charge any future message that mentions a geometry by name.
# A4b REPORTED WITH A CEILING, never credited as a pass. The rest: `if(geo==='kunal')` around a per-geometry pin
# and the message selector above. Legitimate - a pin belongs to one geometry - and still rot-prone, because a
# rename makes the guarded assertion silently NOT RUN rather than go red. The job measured the real growth
# vector as ordinary gate authoring (+25 lines of the 730 token in six builds), so the ceiling is what stops a
# new gate adding another, and it is a committed literal so raising it is a diff someone reads.
# A4c HARD. A compared token that is NOT a live key of GEOS. ZERO today, and this is the arm that actually fires
# on the migration this job is about: rename the key in gates/lib.js and every gate still comparing the old
# literal is named on the next run. It is green on the tree that introduces it and its controls drive it RED
# over fixtures, which is how this file already treats A2 and A3.
# THE TOKEN LIST IS DERIVED FROM gates/lib.js AND NEVER TYPED, and that is not tidiness: a typed list is the
# frozen denominator CLAUDE.md records at #405, and it would answer "no dead tokens" loudest at the moment
# somebody renames one. The derivation is asserted NON-EMPTY in its own line before anything is asserted over
# it, and so is the site set [R51/the empty-denominator class: a missing denominator is reported, never credited].
# A4_CEILING  MEASURED at #544 on this tree AFTER the two gate-65 fixes, by this script's own a4_sites:
#           FIVE code sites - 11-lesson.js:13, 20-review.js:215, 36-evalbar.js:230, 40-reachability.js:311 and
#           70-live-game-reset-guard.js:341. Not aspirational and not rounded up.
A4_CEILING="${CT_A4CEIL:-5}"

# ── SCOPE. The five paths the case names, expanded. Printed as a file count because R18 says count
# inputs and not assertions: one file is a demonstration, 61 is a measurement.
scope_files(){
  {
    [ -r "$ROOT/gates/lib.js" ] && printf '%s\n' "$ROOT/gates/lib.js"
    find "$ROOT/gates" -type f -name '*.js' 2>/dev/null
    [ -r "$ROOT/claude/stories/USER-STORIES.md" ] && printf '%s\n' "$ROOT/claude/stories/USER-STORIES.md"
    [ -r "$ROOT/claude/stories/TEST-CASES.md" ] && printf '%s\n' "$ROOT/claude/stories/TEST-CASES.md"
    [ -r "$ROOT/CLAUDE.md" ] && printf '%s\n' "$ROOT/CLAUDE.md"
  } | sort -u
}

# A1. No artefact calls a non-761 geometry his phone. Returns the matching file:line list on stdout.
a1_hits(){
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    grep -nEi "$CLAIM_RE" "$f" 2>/dev/null | sed "s|^|${f#$ROOT/}:|"
  done < <(scope_files)
}

# A2. The anchor. gates/lib.js must carry kunal761 within 200 characters of the word "phone", so the
# file that defines the geometry set states the settled one as the phone. Implemented on the whole
# file as one string rather than line by line, because GEOS is a single very long line and a
# line-scoped window would be satisfied by accident rather than on purpose.
a2_ok(){
  local lib="$ROOT/gates/lib.js"
  [ -r "$lib" ] || return 2
  tr -d '\n' < "$lib" | grep -qEi "(${ANCHOR_TOKEN}.{0,200}phone|phone.{0,200}${ANCHOR_TOKEN})"
}

# A3. The 761 suite-coverage ratchet. Two predicates, each one line, so a control can drive either.
# grep -lF, not grep -l: the token is a literal and -F removes any chance of a pattern reading.
# No `grep -q`, no `head`, and nothing consuming part of a producer's output, per this file's header.
a3_gates(){   # every regress gate file, one per line, sorted. The DENOMINATOR.
  find "$ROOT/gates/regress" -maxdepth 1 -type f -name '*.js' 2>/dev/null | sort
}
a3_covered(){ # of those, the ones that name the anchor geometry at all. The NUMERATOR.
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    grep -lF "$ANCHOR_TOKEN" "$f" 2>/dev/null
  done < <(a3_gates)
}

# ── A4's PIECES.
# decomment: the file with /*..*/ and //.. removed, so A4 reads code and not the project's own record of this
# trap. Strings and template literals are respected, which is what keeps a URL or a regex from opening a false
# comment: at a '/' the next character decides, and a regex literal's next character is never '/' or '*'
# because JavaScript itself reads those two as comments. DECLARED LIMIT: the state resets at each newline, so a
# template literal spanning lines is not tracked across the break. C30 and C31 drive both of the cases that
# could bite - a '//' inside a string and a regex literal containing an escaped slash - and C33 drives the live
# one, this file's own gate-65 comment block, which quotes `geoKey!=='kunal730'` in prose and MUST NOT be read
# as a site. That quotation is why a comment-blind A4 would have scored its own fix as only half applied.
decomment(){
  awk '
  BEGIN{ blk=0 }
  {
    line=$0; out=""; i=1; n=length(line);
    while(i<=n){
      c=substr(line,i,1); c2=substr(line,i,2);
      if(blk){ if(c2=="*/"){ blk=0; i+=2 } else { i++ } ; continue }
      if(c2=="/*"){ blk=1; i+=2; continue }
      if(c2=="//"){ break }
      if(c=="\047" || c=="\"" || c=="`"){
        q=c; out=out c; i++;
        while(i<=n){
          cc=substr(line,i,1);
          if(cc=="\\"){ out=out cc; i++; if(i<=n){ out=out substr(line,i,1); i++ } ; continue }
          out=out cc; i++;
          if(cc==q) break
        }
        continue
      }
      out=out c; i++
    }
    print out
  }' "$1"
}

# geos_keys: the GEOS key set, read off gates/lib.js. Only the OUTER keys match `<key>:{` - every inner field
# (w, h, safe, label) is followed by a value and not by a brace - and a quoted key like '390' is accepted.
# Returns 2 when gates/lib.js is unreadable or the literal cannot be found, which the report turns into
# NOT CHECKED rather than into a pass.
geos_keys(){
  local lib="$ROOT/gates/lib.js" body
  [ -r "$lib" ] || return 2
  body="$(tr -d '\n' < "$lib" | sed -e 's/.*const GEOS={//' -e 's/};.*//')"
  [ -n "$body" ] || return 2
  printf '%s' "$body" | grep -oE "[A-Za-z0-9_]+'?:\{" | sed -e "s/'\{0,1\}:{\$//" | sort -u
}

a4_files(){
  {
    find "$ROOT/gates/regress" -maxdepth 1 -type f -name '*.js' 2>/dev/null
    find "$ROOT/gates" -maxdepth 1 -type f -name '*.js' 2>/dev/null
    find "$ROOT/gates/drive" -maxdepth 1 -type f -name '*.js' 2>/dev/null
  } | sort -u
}

# a4_sites: every geometry-token comparison in CODE, as path:line:text.
a4_sites(){
  local keys alt f
  keys="$(geos_keys)" || return 2
  [ -n "$keys" ] || return 2
  alt="$(printf '%s' "$keys" | tr '\n' '|' | sed -e 's/|$//')"
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    decomment "$f" | grep -nE "(!==|===)[[:space:]]*('|\")($alt)('|\")" | sed "s|^|${f#$ROOT/}:|"
  done < <(a4_files)
}

# a4_bound: of those, the A4a class - the name turned into a value.
a4_bound(){
  a4_sites | grep -E "((var|let|const)[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*[[:space:]]*=[^=]|[0-9]{3}[[:space:]]*x[[:space:]]*[0-9]{3})"
}

# a4_dead: the A4c class - a compared token that GEOS no longer has. Asks the comparison about the key set
# rather than the key set about the comparison, so a rename is what moves it.
a4_dead(){
  local keys f
  keys="$(geos_keys)" || return 2
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    decomment "$f" \
      | grep -oE "(!==|===)[[:space:]]*('|\")[A-Za-z0-9_]+('|\")" \
      | sed -e "s/^.*['\"]\\([A-Za-z0-9_]*\\)['\"]\$/\\1/" \
      | while IFS= read -r t; do
          case "$t" in
            kunal*|short*|se) : ;;   # only tokens that LOOK like a geometry are asked about.
            # AND THE THREE-DIGIT KEYS ARE OUT OF A4c's REACH BY CONSTRUCTION, measured rather than assumed.
            # The first version of this list accepted [0-9][0-9][0-9] so that '390' and '430' were covered, and
            # running it printed 34 dead tokens over six gates: `==='500'` and `==='800'` and `==='400'` are
            # timeouts and widths, not geometries, and nothing in the string tells them apart. A list loose
            # enough to cover '390' is loose enough to report a defect in every gate that compares a number -
            # which is this project's own "a bad selector is a reading" and would have been ignored by the
            # second day. So A4c covers the kunal*, short* and se families and CANNOT cover a numeric key; the
            # rename this job is about is kunal730 -> kunal761 and is inside that scope. A numeric key renamed
            # silently is a real residual and it is named on the job rather than papered over here.
            # 'land' IS DELIBERATELY NOT IN THAT LIST and leaving it out is the difference between a check and a
            # false red: gate 65 calls blockI with 'land', LAND is a literal at :566 and has never been a GEOS
            # key, so asking GEOS about it would report a dead token on a tree where nothing is wrong.
            *) continue ;;
          esac
          printf '%s\n' "$keys" | grep -qxF "$t" || printf '%s:%s\n' "${f#$ROOT/}" "$t"
        done
  done < <(a4_files)
}

census(){
  local tok="$1" n=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    n=$(( n + $(grep -oF "$tok" "$f" 2>/dev/null | wc -l) ))
  done < <(scope_files)
  printf '%s\n' "$n"
}

report(){
  local strict="${1:-no}" nfiles hits nhits a2 rc=0
  nfiles=$(scope_files | wc -l | tr -d ' ')
  echo "R19 PHONE GEOMETRY AUDIT - is any geometry other than 375x761 called Kunal's phone?"
  echo "root: $ROOT"
  echo "inputs: $nfiles files (gates/lib.js, gates/**/*.js, claude/stories/USER-STORIES.md, claude/stories/TEST-CASES.md, CLAUDE.md)"
  if [ "$nfiles" -lt 5 ]; then
    echo "A1 NOT CHECKED: scope resolved to $nfiles files, which is fewer than the five paths the case names."
    echo "VERDICT UNSOUND"
    [ "$strict" = strict ] && return 2
    return 0
  fi
  hits="$(a1_hits)"
  nhits=$(printf '%s' "$hits" | grep -c . || true)
  if [ "$nhits" -eq 0 ]; then
    echo "A1 PASS: no artefact in scope calls a non-761 geometry the real/his/actual phone."
  else
    echo "A1 FAIL: $nhits line(s) in scope call a non-761 geometry Kunal's phone,"
    echo "         across $(printf '%s\n' "$hits" | sed 's/:[0-9]*:.*$//' | sort -u | grep -c .) file(s):"
    # TRUNCATED AT 200 COLUMNS, and this is not cosmetic: claude/stories/TEST-CASES.md holds single
    # case rows over 6,000 characters long, and four of them match. Printed whole, the five lines
    # that matter in gates/lib.js are buried under 25,000 characters of case prose and nobody reads
    # the verdict. file:line is what a fixer needs; the rest is in the file.
    printf '%s\n' "$hits" | cut -c1-200 | sed -e 's/^/  /' -e 's/$/ .../'
    rc=1
  fi
  if a2_ok; then
    echo "A2 PASS: gates/lib.js carries $ANCHOR_TOKEN within 200 characters of the word phone."
  else
    local s=$?
    if [ "$s" = 2 ]; then
      echo "A2 NOT CHECKED: gates/lib.js is not readable under $ROOT."
      echo "VERDICT UNSOUND"
      [ "$strict" = strict ] && return 2
      return 0
    fi
    echo "A2 FAIL: gates/lib.js does not state $ANCHOR_TOKEN as the phone."
    rc=1
  fi
  local ntot ncov
  ntot=$(a3_gates | grep -c . || true)
  ncov=$(a3_covered | grep -c . || true)
  if [ "$ntot" -lt "$A3_MIN_SUITE" ]; then
    # NOT A PASS AND NOT COUNTED. Printed as its own line so a reader can see the arm did not run,
    # rather than reading a green that covered nothing [R18: a missing denominator is reported,
    # never credited].
    echo "A3 NOT APPLICABLE: gates/regress under this root holds $ntot gate file(s), fewer than the"
    echo "         $A3_MIN_SUITE a real suite carries, so the 761 coverage ratchet did not run. rc unaffected."
  elif [ "$ncov" -lt "$A3_FLOOR" ]; then
    echo "A3 FAIL: $ncov of $ntot gates in gates/regress ever launch at $ANCHOR_TOKEN, below the"
    echo "         committed floor of $A3_FLOOR. A gate has lost its $ANCHOR_TOKEN column, or the floor"
    echo "         was raised without the gates to meet it. The covered set is:"
    a3_covered | sed -e "s|^$ROOT/||" -e 's/^/  /'
    rc=1
  else
    echo "A3 PASS: $ncov of $ntot gates in gates/regress launch at $ANCHOR_TOKEN, at or above the floor of $A3_FLOOR."
    if [ "$ncov" -gt "$A3_FLOOR" ]; then
      echo "         RATCHET CAN RISE: set A3_FLOOR=$ncov in this file, in a commit, so the new coverage is held."
    fi
  fi
  # ── A4. Three checks, each its own line, never a conjunct: a compound whose halves cannot fail
  # independently reads as two checks while being one [this file's own A3 note].
  local keys nkeys sites nsites bound nbound dead ndead
  keys="$(geos_keys)"; local kr=$?
  nkeys=$(printf '%s' "$keys" | grep -c . || true)
  if [ "$kr" != 0 ] || [ "$nkeys" -eq 0 ]; then
    # NOT CHECKED, not a pass. Every A4 check is asserted over this list, so an empty list would make all
    # three of them report green over nothing - which is the one failure mode this file keeps finding.
    echo "A4 NOT CHECKED: no GEOS key set could be derived from gates/lib.js under this root, so the"
    echo "         geometry-token checks were asserted over nothing and are NOT reported as passing."
    echo "VERDICT UNSOUND"
    [ "$strict" = strict ] && return 2
    return 0
  fi
  sites="$(a4_sites)"
  nsites=$(printf '%s' "$sites" | grep -c . || true)
  if [ "$nsites" -eq 0 ]; then
    # NOT CHECKED, AND NOT UNSOUND EITHER - and the first draft had it as UNSOUND, which broke five of this
    # file's own existing controls. C16, C17, C25, C27 and C28 build small fixture trees to drive A1, A2 and
    # A3, and not one of them contains a geometry COMPARISON, so an UNSOUND verdict here fired on the normal
    # case and reddened arms it says nothing about. That is CLAUDE.md's "a guard that fires on the normal case
    # gets switched off" arriving inside the commit that adds the guard, and it was caught by running the
    # selftest rather than by reading the diff. A4a and A4b are REPORTED as not run - never printed as PASS,
    # which is the half that matters [R51] - and A4c below is unaffected because it scans independently.
    # THE RESIDUAL, STATED RATHER THAN HIDDEN: on a real suite a selector that stopped matching would print
    # these two lines instead of going red. What protects against that is that the lines are printed and are
    # not a pass, and that this suite's own count is in the report every run.
    echo "A4a NOT CHECKED: $nkeys GEOS key(s) derived and NOT ONE geometry comparison was found in code under"
    echo "          gates/regress, gates or gates/drive, so nothing was asserted about binding a name to a value."
    echo "A4b NOT CHECKED: no comparison site to count against the ceiling of $A4_CEILING."
  else
  bound="$(a4_bound)"; nbound=$(printf '%s' "$bound" | grep -c . || true)
  if [ "$nbound" -eq 0 ]; then
    echo "A4a PASS: of $nsites code site(s) comparing one of $nkeys geometry token(s), none binds the result to a"
    echo "          variable or reads a WIDTHxHEIGHT literal off the name."
  else
    echo "A4a FAIL: $nbound code site(s) turn a geometry's NAME into a VALUE - the name is bound to a variable or"
    echo "          yields a WIDTHxHEIGHT literal, so renaming the key changes behaviour rather than the key:"
    printf '%s\n' "$bound" | cut -c1-200 | sed -e 's/^/  /'
    rc=1
  fi
  if [ "$nsites" -le "$A4_CEILING" ]; then
    echo "A4b PASS: $nsites comparison site(s) at or under the committed ceiling of $A4_CEILING."
    [ "$nsites" -lt "$A4_CEILING" ] && \
      echo "          CEILING CAN BE LOWERED: set A4_CEILING=$nsites in this file, in a commit, so it cannot rise again."
  else
    echo "A4b FAIL: $nsites comparison site(s), above the committed ceiling of $A4_CEILING. A new one has been added."
    echo "          Each is legitimate on its own - a pin belongs to one geometry - and each goes SILENTLY NOT-RUN"
    echo "          on a rename rather than red, which is why the count is held rather than the shape banned:"
    printf '%s\n' "$sites" | cut -c1-200 | sed -e 's/^/  /'
    rc=1
  fi
  fi
  # A4c IS OUTSIDE THAT BRANCH ON PURPOSE. It has its own scan - it asks the comparisons about the key set
  # rather than the key set about the comparisons - so it is exactly the arm that still speaks when a rename
  # has made every site invisible to a4_sites. Putting it inside the branch would have made the renamed-key
  # fixture red for the WRONG REASON (an empty site set) and the right verdict for no reason at all, which is
  # this project's "a wrong reason that reaches the right verdict is a trap, not a check". Caught by C44.
  dead="$(a4_dead)"; ndead=$(printf '%s' "$dead" | grep -c . || true)
  if [ "$ndead" -eq 0 ]; then
    echo "A4c PASS: every geometry-shaped token compared in code is a live key of GEOS."
  else
    echo "A4c FAIL: $ndead comparison(s) name a geometry token GEOS does not have. A key was renamed and the"
    echo "          gates comparing the old literal were not, so their branches can no longer be taken:"
    printf '%s\n' "$dead" | sed -e 's/^/  /'
    rc=1
  fi
  echo "census (context only, asserted by nothing [R18]): kunal730 $(census kunal730) occurrence(s), kunal761 $(census kunal761)"
  if [ "$rc" -eq 0 ]; then echo "VERDICT GREEN"; else echo "VERDICT RED"; fi
  [ "$strict" = strict ] && return "$rc"
  return 0
}

# ── CONTROLS. Both directions on every check. A control that only asserts the SKIP is the vacuity
# this family keeps finding, so each positive is paired with a negative that MUST NOT fire, and the
# negatives are the cases a careless widening of the pattern would break: a bare geometry column
# named kunal730, and the CORRECT sentence at 761.
selftest(){
  local pass=0 fail=0
  chk(){ # chk <name> <expected 0|1> <command...>
    local name="$1" want="$2"; shift 2
    "$@" >/dev/null 2>&1; local got=$?
    [ "$got" -ne 0 ] && got=1
    if [ "$got" = "$want" ]; then pass=$((pass+1)); echo "PASS $name"
    else fail=$((fail+1)); echo "FAIL $name (wanted rc $want, got $got)"; fi
  }
  # REPAIRED 2026-10-08 by process-build lane 3, run process-build-3__1791476801744, for
  # jobs/build-499s-18-payload-batch-is-blocked-on-pipefail-greps-tier-b-ceiling-... step (2) of its
  # whatWouldCloseIt. WAS: `printf '%s' "$1" | grep -qEi "$CLAIM_RE"`. `grep -q` exits as soon as it has
  # selected a line, so its producer takes SIGPIPE and dies 141; under `set -o pipefail` that 141 becomes
  # the pipeline's status and this function's rc, so a MATCH could be published as a failure. Measured by
  # gates/audit/pipefail-grep.sh on the tree build #499 assembled: this site is TIER B, a status-only
  # consumer downstream of a propagating `printf`. A herestring has no pipe, so there is no SIGPIPE to
  # propagate at any input size - which is the point: the pipe form is latent on the producer's size and
  # the repair removes the possibility rather than the current symptom.
  m(){ grep -qEi "$CLAIM_RE" <<<"$1"; }

  echo "-- A1 pattern, POSITIVES (each MUST match; every one is a real shape from main) --"
  chk C1-lib-line-34  0 m "const GEOS={kunal730:{w:375,h:730,safe:'',label:'375x730 = Kunal\\'s real phone'}"
  chk C2-lib-line-31  0 m "'kunal730' is the real phone and new gates should use it"
  chk C3-lib-line-29  0 m "his phone's LAYOUT VIEWPORT is 375x730"
  chk C4-spaced       0 m "375 x 730 is his phone"
  chk C5-capital-X    0 m "375X730 = Kunal's actual phone"
  chk C6-unicode-mult 0 m "375×730 is his phone"
  chk C7-token-first  0 m "kunal730 - the actual phone we test on"
  chk C8-mixed-case   0 m "KUNAL730 is HIS PHONE"

  echo "-- A1 pattern, NEGATIVES (each MUST NOT match; these are what narrowness buys) --"
  chk C9-bare-column  1 m "for(const g of ['kunal730','se','390'])"
  chk C10-correct-761 1 m "kunal761 = Kunal's real phone"
  chk C11-too-far     1 m "kunal730$(printf '%*s' 90 '')is his phone"
  chk C12-730-no-claim 1 m "375x730 is the shorter-phone column"
  chk C13-phone-alone 1 m "his phone renders at 375x761"
  chk C14-other-num   1 m "375x679 = Kunal's real phone"

  echo "-- A1 over a FIXTURE TREE, both directions, through the real scope walk --"
  local t; t="$(mktemp -d)"
  mk(){ mkdir -p "$t/gates/regress" "$t/claude/stories"
        printf '%s\n' "$1" > "$t/gates/lib.js"
        printf 'nothing here\n' > "$t/gates/regress/00-x.js"
        printf 'stories\n' > "$t/claude/stories/USER-STORIES.md"
        printf 'cases\n' > "$t/claude/stories/TEST-CASES.md"
        printf 'claude\n' > "$t/CLAUDE.md"; }

  mk "const GEOS={kunal730:{label:'375x730 = Kunal\\'s real phone'}};"
  chk C15-fixture-dirty-is-red 1 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict
  mk "const GEOS={kunal761:{label:'375x761 = Kunal\\'s real phone'}};"
  chk C16-fixture-clean-is-green 0 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict

  echo "-- A2 anchor, both directions, and the MUTATION control --"
  mk "const GEOS={kunal761:{label:'the 375x761 phone'}};"
  chk C17-anchor-present 0 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict
  mk "const GEOS={kunal:{label:'375x679 column'}};"
  chk C18-anchor-absent-is-red 1 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict
  mk "const GEOS={kunal761:{w:375}};$(printf '%*s' 260 '')// the phone"
  chk C19-anchor-too-far-is-red 1 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict

  echo "-- UNSOUNDNESS, which must be rc 2 and never a green --"
  local e; e="$(mktemp -d)"
  chk C20-empty-tree-is-unsound 1 env CT_ROOT="$e" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict
  chk C21-empty-tree-report-is-0 0 env CT_ROOT="$e" bash "$SELF/$(basename "${BASH_SOURCE[0]}")"
  mkdir -p "$e/gates/regress" "$e/claude/stories"; printf 'x\n' > "$e/gates/regress/00-x.js"
  printf 's\n' > "$e/claude/stories/USER-STORIES.md"; printf 'c\n' > "$e/claude/stories/TEST-CASES.md"
  printf 'c\n' > "$e/CLAUDE.md"
  chk C22-no-libjs-is-unsound 1 env CT_ROOT="$e" bash "$SELF/$(basename "${BASH_SOURCE[0]}")" --strict

  echo "-- REPORT MODE CANNOT BREAK A CALLER, which is why it is safe to wire --"
  mk "const GEOS={kunal730:{label:'375x730 = Kunal\\'s real phone'}};"
  chk C23-dirty-report-exits-0 0 env CT_ROOT="$t" bash "$SELF/$(basename "${BASH_SOURCE[0]}")"

  echo "-- A3, THE 761 COVERAGE RATCHET, over synthetic suites ABOVE the denominator guard --"
  # The fixture trees above carry ONE regress gate, so every control from C15 to C23 runs with A3
  # NOT APPLICABLE and is unaffected by this arm. These six drive A3 itself, through the real walk,
  # in both directions - firing, silent, and at its own boundary - so the arm is never asserted by
  # its skip alone.
  local a; a="$(mktemp -d)"
  mka(){ # mka <total gates> <how many carry the token>
    rm -rf "$a"; mkdir -p "$a/gates/regress" "$a/claude/stories"
    printf "const GEOS={kunal761:{label:'375x761 = the phone'}};\n" > "$a/gates/lib.js"
    printf 'stories\n' > "$a/claude/stories/USER-STORIES.md"
    printf 'cases\n'   > "$a/claude/stories/TEST-CASES.md"
    printf 'claude\n'  > "$a/CLAUDE.md"
    local i=0
    while [ "$i" -lt "$1" ]; do
      if [ "$i" -lt "$2" ]; then printf "L.launch({geo:'kunal761'});\n" > "$a/gates/regress/$i-g.js"
      else                       printf "L.launch({geo:'kunal'});\n"    > "$a/gates/regress/$i-g.js"; fi
      i=$((i+1))
    done
  }
  RUNME="$SELF/$(basename "${BASH_SOURCE[0]}")"
  mka 25 0
  chk C24-a3-zero-coverage-is-red      1 env CT_ROOT="$a" CT_A3FLOOR=1 bash "$RUNME" --strict
  mka 25 3
  chk C25-a3-above-floor-is-green      0 env CT_ROOT="$a" CT_A3FLOOR=3 bash "$RUNME" --strict
  chk C26-a3-one-below-floor-is-red    1 env CT_ROOT="$a" CT_A3FLOOR=4 bash "$RUNME" --strict
  chk C27-a3-at-floor-exactly-is-green 0 env CT_ROOT="$a" CT_A3FLOOR=3 bash "$RUNME" --strict
  mka 19 0
  # THE GUARD ITSELF, and it must be GREEN rather than red: a 19-gate tree is not a suite, so a
  # floor of 1 over it must not be charged. This is the control that makes C24 mean something - the
  # two trees differ only in gate count, so C24's red cannot be coming from the walk failing.
  chk C28-a3-below-min-suite-skips     0 env CT_ROOT="$a" CT_A3FLOOR=1 bash "$RUNME" --strict
  # AND THE SKIP MUST BE VISIBLE. A silent skip is how an arm stops existing without anybody
  # noticing, so the NOT APPLICABLE line is asserted as output and not only as an exit code.
  chk C29-a3-skip-says-so-in-the-report 0 \
      env CT_ROOT="$a" CT_A3FLOOR=1 bash -c 'r=$("$0" 2>&1); case "$r" in *"A3 NOT APPLICABLE"*) exit 0;; *) exit 1;; esac' "$RUNME"
  rm -rf "$a"


  echo "-- A4, the geometry-token checks, both directions on each of the three [#544] --"
  # THE FIXTURE IS A WHOLE SMALL TREE and not a string, because every A4 check walks files and derives its
  # token list from gates/lib.js. A1 and A2 are held GREEN in it (the GEOS literal states 761 as the phone and
  # nothing calls 730 his phone) so that the strict rc reports A4 and not a sibling arm - the one-variable
  # discipline this file's C25-to-C28 set already uses for A3.
  local q; q="$(mktemp -d)"
  # A DEFAULT CONTAINING BRACES CANNOT GO INSIDE ${2:-...}, AND THE FIRST VERSION OF mk4 PUT IT THERE.
  # Parameter expansion ends at the first unescaped '}', so `${2:-kunal730:{w:375,h:730,label:'375x730'}` ended
  # four characters into the default and the remaining `,kunal761:{...},se:{...}}` was concatenated as LITERAL
  # TEXT after whatever $2 expanded to. The override therefore never replaced the key set, it prefixed it:
  # mk4 "..." "@@broken@@" wrote `const GEOS={@@broken@@,kunal761:{...},se:{...}}};`, which still derives two
  # live keys. C46 was green on that fixture for the WRONG REASON - A4c's dead kunal730, not the empty key set
  # it was written to drive - and C47, which asserts the report SAYS so, is what caught it. That is this
  # project's "a wrong reason that reaches the right verdict is a trap, not a check", and the only reason it was
  # visible is that one of the two controls asserts the WORDS and not just the exit code.
  local A4DEF="kunal730:{w:375,h:730,label:'375x730'},kunal761:{w:375,h:761,label:'375x761'},se:{w:320,h:568,label:'320x568'}"
  mk4(){ # mk4 <gates/regress/zz.js contents> [<gates/lib.js GEOS body override>]
    rm -rf "$q"; mkdir -p "$q/gates/regress" "$q/claude/stories"
    printf 'const GEOS={%s};\n// kunal761 is the phone this suite is built for.\n' "${2-$A4DEF}" \
      > "$q/gates/lib.js"
    printf '%s\n' "$1" > "$q/gates/regress/zz-a4.js"
    printf 'stories\n' > "$q/claude/stories/USER-STORIES.md"
    printf 'cases\n'   > "$q/claude/stories/TEST-CASES.md"
    printf 'claude\n'  > "$q/CLAUDE.md"; }
  r19(){ env CT_ROOT="$q" "$@" bash "$RUNME" --strict; }
  says(){ # says <needle>: the report must SAY this, not merely exit a number
    local needle="$1"; shift
    local out; out="$(env CT_ROOT="$q" "$@" bash "$RUNME" 2>&1)"
    case "$out" in *"$needle"*) return 0;; *) return 1;; esac; }

  # A4a. The two shapes, and the guard shape that must NOT be charged.
  mk4 "const isLand=geoKey!=='kunal730';"
  chk C30-a4a-bound-to-a-variable-is-red     1 r19 CT_A4CEIL=9
  mk4 "  const g=geo==='se'?'320x568':'375x730';"
  chk C31-a4a-widthxheight-literal-is-red    1 r19 CT_A4CEIL=9
  mk4 "if(geo==='kunal730'){L.say(x,'pin');}"
  chk C32-a4a-a-plain-guard-is-NOT-charged   0 r19 CT_A4CEIL=9
  # AND THE ONE THAT KEEPS A4a FROM BECOMING "no ternaries": a message selector is a ternary on a token and is
  # not this defect - gates/regress/36-evalbar.js:230 is the live instance and its pin comes from a TABLE.
  mk4 "L.say(ok,tag+': board '+pin+(geo==='kunal730'?', 4px narrower':' (fit to height)'));"
  chk C33-a4a-a-message-ternary-is-NOT-charged 0 r19 CT_A4CEIL=9

  # decomment. THE LIVE CASE FIRST, because it is the one that bit: the fix committed at #544 explains itself
  # in a comment that QUOTES `geoKey!=='kunal730'`, so a comment-blind A4a would score its own repair as half
  # done. Driven against the real repository, not a fixture.
  chk C34-decomment-this-repo-has-no-bound-site 0 bash -c '[ "$( "$0" | grep -c "^A4a FAIL" )" = 0 ]' "$RUNME"
  mk4 "/* #410: THIS WAS KEYED TO THE NAME - const isLand=geoKey!=='kunal730' - and stayed green. */
if(geo==='se'){L.say(x,'pin');}"
  chk C35-decomment-block-comment-not-a-site 0 r19 CT_A4CEIL=9
  mk4 "// const isLand=geoKey!=='kunal730';
if(geo==='se'){L.say(x,'pin');}"
  chk C36-decomment-line-comment-not-a-site  0 r19 CT_A4CEIL=9
  # The two cases a naive stripper breaks. Both must still be SEEN as code, so the bound site in each is red.
  mk4 "const u='https://example.invalid//x';const isLand=geoKey!=='kunal730';"
  chk C37-decomment-slashes-inside-a-string  1 r19 CT_A4CEIL=9
  mk4 "const re=/\\/ move/;const isLand=geoKey!=='kunal730';"
  chk C38-decomment-regex-with-escaped-slash 1 r19 CT_A4CEIL=9

  # A4b, the ceiling, in both directions over the SAME tree so the only variable is the number.
  mk4 "if(geo==='kunal730'){a();}
if(geo==='se'){b();}"
  chk C39-a4b-at-the-ceiling-exactly-is-green 0 r19 CT_A4CEIL=2
  chk C40-a4b-one-over-the-ceiling-is-red     1 r19 CT_A4CEIL=1
  chk C41-a4b-says-it-can-be-lowered          0 says "CEILING CAN BE LOWERED: set A4_CEILING=2" CT_A4CEIL=9

  # A4c, the arm that fires on the migration. GREEN on the tree that ships it, so its controls are the only
  # evidence it can speak at all [R10 item 2].
  mk4 "if(geo==='kunal730'){a();}"
  chk C42-a4c-live-token-is-green             0 r19 CT_A4CEIL=9
  mk4 "if(geo==='kunal730'){a();}" "kunal761:{w:375,h:761,label:'375x761'},se:{w:320,h:568,label:'320x568'}"
  chk C43-a4c-renamed-key-leaves-a-dead-token 1 r19 CT_A4CEIL=9
  chk C44-a4c-names-the-dead-token            0 says "zz-a4.js:kunal730" CT_A4CEIL=9
  # THE FALSE RED THIS RUN CAUGHT AND FIXED. The first version of A4c accepted any three-digit token so that
  # '390' and '430' were in scope, and printed 34 dead tokens over six real gates because `==='500'` is a
  # timeout. A list loose enough to cover a numeric key is loose enough to report a defect in every gate that
  # compares a number.
  mk4 "if(t==='500'){a();}
if(geo==='kunal730'){b();}"
  chk C45-a4c-a-numeric-string-is-not-a-geometry 0 r19 CT_A4CEIL=9

  # THE EMPTY DENOMINATORS. Both must read NOT CHECKED and UNSOUND - never a pass - because all three A4
  # checks are asserted over these two sets [R51/the empty-denominator class].
  mk4 "if(geo==='kunal730'){a();}" "@@broken@@"
  chk C46-a4-no-geos-keys-is-unsound-not-green  1 r19 CT_A4CEIL=9
  chk C47-a4-no-geos-keys-says-NOT-CHECKED      0 says "A4 NOT CHECKED: no GEOS key set" CT_A4CEIL=9
  mk4 "nothing compares anything here"
  chk C48-a4-no-sites-says-NOT-CHECKED          0 says "A4a NOT CHECKED" CT_A4CEIL=9
  # AND THE HALF THAT ACTUALLY MATTERS: it must not be credited. An arm that prints PASS over an empty set
  # reports loudest exactly when the thing it guards has disappeared.
  chk C49-a4-no-sites-is-NOT-printed-as-a-pass  0 \
      env CT_ROOT="$q" CT_A4CEIL=9 bash -c '[ "$( "$0" | grep -c "^A4[ab] PASS" )" = 0 ]' "$RUNME"
  rm -rf "$q"

  rm -rf "$t" "$e"
  echo "SELFTEST $pass pass / $fail fail"
  [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest ;;
  --strict)   report strict ;;
  "")         report ;;
  *) echo "usage: $(basename "$0") [--strict|--selftest]" >&2; exit 64 ;;
esac
