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
