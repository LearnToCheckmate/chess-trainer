#!/usr/bin/env bash
# gates/audit/cited-not-run.sh
#
# WHAT IT ANSWERS, in one line: which files under gates/ are CITED in our own records as the
# evidence behind a published number, and are reachable by NO suite run.
#
# WHY IT EXISTS. jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 is that class. Its first
# published answer was ZERO, which was the number true of the single file that had just been fixed;
# its corrected answer was FIVE, hand-derived by reading RUN-LOG.md, and its own claim row calls
# that "itself a floor over one document". Both numbers were read by a person. This derives the set
# instead, from gates/gates.sh and from the record documents, so the count cannot be published wrong
# again and cannot go stale the next time a file is added beside the suite rather than inside it.
# It is a COMPARATOR in the sense of R47: it checks what we PRINT as evidence against what the
# runner can actually REACH. Both halves were already in our hands and nothing read them together.
#
# IT DOES NOT ADMIT ANYTHING TO A SUITE. Admission needs gates/gates.sh, whose log section count is
# pinned by gates/verify-log.sh:431-440 - one extra section header there refuses every green log from
# that point on. This script only reports, so it can never redden the suite it audits.
#
# USAGE
#   gates/audit/cited-not-run.sh            report against the repository it lives in
#   gates/audit/cited-not-run.sh --selftest run the controls (no repository needed)
#   CT_ROOT=<dir>                           audit a different tree (the selftest uses this)
#   CT_RECORDS="a.md b.md"                  override the record document list
#   CT_ROSTER=<file>                        override the roster of section 2b (the selftest uses this)
#
# EXIT CODES. 0 nothing cited-and-unreachable, OR every member of the set is accounted for by name
# in the roster of section 2b. 1 the set has a member nobody has accounted for, or a roster entry
# whose reason its own writer does not believe beyond the ceiling, or a roster entry that no longer
# names a member. 2 the derivation itself is unsound - too few reachable files or no citations found
# at all - which is the vacuous pass this script refuses to print green over. A report that cannot
# see the suite must not read like a clean suite.
#
# THE VERDICT MOVED FROM THE SIZE OF THE SET TO WHETHER ITS MEMBERS ARE EXPLAINED, 2026-10-06, and
# the reason is measured rather than tasteful: the set was 5 hand-read, 17 derived on 2026-10-04 at
# 842df1b, and 23 at 8067e37 two days later. Keyed on size this script is red for ever and therefore
# unreadable; keyed on accounting it goes red on the DAY an unexplained file appears, while the
# person who added it is still there to say why. The size is still printed on every run and is still
# the headline number - it has not been hidden, it has been demoted.

set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${CT_ROOT:-$(cd "$SELF/../.." && pwd)}"
G="$ROOT/gates"

# ── 1. REACHABLE: derived from gates/gates.sh, never from a hand-written list ──────────────────────
# A hand-list is the bug this whole class is made of: gates/unit-drill-why.js sat one directory above
# the only directory that is executed, for 30 days, while a list said it ran.
# STRIP COMMENTS BEFORE READING AN ENTRY POINT, and this is not fussiness: gates/gates.sh carries
# 100+ lines of commentary that NAME files it does not run - "gates/regress/67-sel-cls-consumers.js
# ... absent from it", "gates/.pin-app.js cannot divert the gate", "verify-log.sh:431-440 refuses".
# Matching those made five build-toolchain scripts read as reachable and dropped the leak count from
# 17 to 12 in the wrong direction. A detector that reads a comment as an invocation understates the
# class it exists to count, which is the quietest way for this file to be useless.
decomment(){ sed -e 's/^[[:space:]]*#.*$//' -e 's/[[:space:]]#[[:space:]].*$//' "$1"; }

reachable_seed(){
  local sh="$ROOT/$1"
  [ -r "$sh" ] || return 0
  printf '%s\n' "$1"
  local CODE; CODE="$(mktemp)"; decomment "$sh" > "$CODE"
  # the regress glob at gates.sh:112 is the suite's whole enumeration
  if grep -qE '"\$G"/regress/\*\.js' "$CODE"; then
    local f
    for f in "$G"/regress/*.js; do [ -e "$f" ] && printf '%s\n' "gates/regress/$(basename "$f")"; done
  fi
  # every explicit "$G/<name>.js|.sh" or "gates/<name>.js|.sh" path literal in the entry point
  # (mountcheck, unit-drill-why, gatemanifest.sh ...). Captured by pattern so a new one is free.
  grep -oE '\$G/[A-Za-z0-9._/-]+\.(js|sh)' "$CODE" | sed 's|^\$G/|gates/|' | sort -u
  grep -oE '(^|[^A-Za-z0-9._/-])gates/[A-Za-z0-9._/-]+\.(js|sh)' "$CODE" | grep -oE 'gates/[A-Za-z0-9._/-]+\.(js|sh)' | sort -u
  rm -f "$CODE"
}

# transitive closure over require() for .js and over "$G/x.sh" invocations for .sh.
# WITHOUT THIS THE REPORT IS WRONG IN THE EXPENSIVE DIRECTION: gates/regress/22-engline-recovery.js
# carries require('../engine-extract.js'), so engine-extract.js IS executed by the suite even though
# no glob and no path literal names it. A detector that missed that would file a leak that is not one.
closure(){
  local -A seen=(); local -a queue=(); local p
  while IFS= read -r p; do [ -n "$p" ] && { seen["$p"]=1; queue+=("$p"); }; done
  local i=0
  while [ $i -lt ${#queue[@]} ]; do
    local cur="${queue[$i]}"; i=$((i+1))
    local abs="$ROOT/$cur"; [ -r "$abs" ] || continue
    local dir; dir="$(dirname "$cur")"
    local spec res
    case "$cur" in
      *.js)
        while IFS= read -r spec; do
          case "$spec" in
            ./*|../*) ;;                      # relative only: a bare specifier is a node module
            *) continue;;
          esac
          res="$(norm "$dir/$spec")"
          [ -r "$ROOT/$res" ] || res="$(norm "$dir/$spec.js")"
          [ -r "$ROOT/$res" ] || res="$(norm "$dir/$spec/index.js")"
          [ -r "$ROOT/$res" ] || continue
          case "$res" in gates/*) ;; *) continue;; esac
          [ -n "${seen[$res]:-}" ] && continue
          seen["$res"]=1; queue+=("$res")
        done < <(grep -oE "require\(['\"][^'\"]+['\"]\)" "$abs" | sed -E "s/require\(['\"]//; s/['\"]\)//")
        ;;
      *.sh|*.py)
        while IFS= read -r spec; do
          res="gates/${spec#\$G/}"; res="${res#gates/gates/}"; case "$res" in gates/*) ;; *) res="gates/$res";; esac
          [ -r "$ROOT/$res" ] || continue
          [ -n "${seen[$res]:-}" ] && continue
          seen["$res"]=1; queue+=("$res")
        done < <( { decomment "$abs" | grep -oE '\$G/[A-Za-z0-9._/-]+\.(js|sh)'; decomment "$abs" | grep -oE 'gates/[A-Za-z0-9._/-]+\.(js|sh)'; } | sort -u)
        ;;
    esac
  done
  printf '%s\n' "${!seen[@]}" | sort -u
}

# normalise a/./b and a/../b without touching the filesystem (the fixture trees have no such paths
# on disk until they are resolved, and realpath would resolve against the wrong root).
norm(){ printf '%s\n' "$1" | awk -F/ '{n=0; for(i=1;i<=NF;i++){ if($i=="."||$i==""){continue} else if($i==".."){ if(n>0) n-- } else { a[++n]=$i } } s=""; for(i=1;i<=n;i++) s=s (i>1?"/":"") a[i]; print s}'; }

# ── 2. CITED: every file under gates/ named in a record document ───────────────────────────────────
# Default list. RUN-LOG.md alone is what produced the FIVE, and the claim row that published it says
# five "is itself a floor over one document", so the floor is lifted here by scanning the records that
# actually carry published numbers. The list is overridable so the number can be re-derived narrowly.
default_records(){
  local f
  for f in RUN-LOG.md HANDOFF.md DECISIONS-LOG.md FEEDBACK-INBOX.md claude/PROCESS-LOG.md; do
    [ -r "$ROOT/$f" ] && printf '%s\n' "$f"
  done
  for f in "$ROOT"/claude/stories/*.md; do [ -e "$f" ] && printf '%s\n' "claude/stories/$(basename "$f")"; done
}

# ── 2b. THE ROSTER: WHY EACH CITED-AND-UNREACHABLE FILE IS NOT IN A SUITE ─────────────────────────
# WHY THIS SECTION EXISTS, and it is the half of this class that the count alone cannot deliver.
# jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 step (2) of its own outcome.whatIsLeft says
# "ADMIT the fifteen, or record per file why not". Section 2 above derives the set; nothing recorded
# why. MEASURED, and this is the argument: that set was 5 (hand-read, one document), then 17 (derived,
# 2026-10-04 at 842df1b), and it is 23 at 8067e37 on 2026-10-06. It grew by SIX in two days while a
# red number sat in a report no suite runs. A number that only goes up is not a finding, it is a
# weather report, and nobody reads the weather. So the verdict moves off the SIZE of the set and onto
# whether every member is ACCOUNTED FOR BY NAME. An accounted file costs nothing; a new unaccounted
# one turns this script red on the day it appears, which is the day somebody can still say why.
#
# FOUR COLUMNS, pipe-separated: path | class | strength | reason.
#   OPERATOR  a tool a lane, a person or the deploy path invokes directly. A gate suite running it
#             would be wrong, not right: several of them WRITE (held.sh, buildnum.sh) or need a
#             credential dump the runner has not got (ledger-diff.js).
#   SELFTEST  the companion selftest of a named script, run by whoever edits that script.
#   ONEOFF    a one-shot probe or measurement whose number is already published. Re-running it on
#             every build buys nothing; the published figure is the artefact.
#   ADMIT     should run on every build and does not. CEILING, MAY ONLY FALL. Empty today, and that
#             is a claim this script now makes checkable rather than a silence.
# STRENGTH is EXACTLY `strong` or `weak`, lowercase, and a VALUE OUTSIDE THAT PAIR IS UNACCOUNTED.
# WEAK IS THE POINT OF THE COLUMN: it means the reason is defensible and I do not believe it, so the
# next reader gets a shortlist of 2 instead of a pile of 23. The weak count has its own ceiling and
# may only fall.
#   A SENTENCE THAT STOOD HERE UNTIL #487 IS WITHDRAWN, BECAUSE IT WAS FALSE IN THE DIRECTION THAT
#   MATTERS [R18]. It read: "Writing `strong` over a reason you doubt is the only way to cheat this
#   file, and it costs the cheat a line with their name on it." Measured by #487's antagonist A and
#   reproduced by the build before the fix: `[ "$str" = "weak" ]` counted ANYTHING else as strong, so
#   capitalising one letter - `weak` -> `Weak` - took the live roster from WEAK 2 of ceiling 2 to
#   WEAK 0 and still printed ACCOUNTED-GREEN. The ceiling this header says MAY ONLY FALL had zero
#   headroom, so that one letter was the whole guard, and it cost the cheat nothing and named nobody.
#   The REASON column was worse: no line of this script ever read field 4, so a roster of 23 rows with
#   every reason BLANK printed "no member of it is unexplained" at exit 0.
#   Both columns are now validated the same way the CLASS column always was, by a `case` that names
#   the bad value - which is where the control was pointed and where the sibling columns were not.
#   It is CLAUDE.md's gatemanifest lesson one field to the right: "the reason string is unvalidated -
#   `-` is refused and `x` is not." Here even empty passed.
roster_default(){ cat <<'EOF'
gates/audit/cited-not-run.sh|OPERATOR|strong|This script. Run by a process lane or the orchestrator against a tree; it reports and admits nothing, so a suite running it could only redden itself on its own report.
gates/audit/pipefail-grep.sh|OPERATOR|strong|Derives the early-exiting-grep-under-pipefail class by command and ratchets it, and MEASURES each site's tier from its producer with a run-time propagation probe. Its input is the gates/ tree plus a probe it runs itself, not the working app, so a build has nothing for it to read; and it reports source sites to repair rather than any behaviour a suite could assert on. Admitting it would also make every build pay the probe's multi-megabyte derivation.
gates/audit/r19-phone-geometry.sh|OPERATOR|strong|TC-SUITE-056: does any record document still call a geometry other than 375x761 Kunal's phone. Its input is the record documents and the stories, not the working app, so a build has nothing for it to read; and its verdict is about what we WROTE, which no regression gate may assert on.
gates/audit/red-count.sh|OPERATOR|strong|Back-audit of published red counts against every committed gatelog, built 2026-10-07 for the second half of jobs/a-fail-line-count-on-a-gatelog-over-reports-by-up-to-five-2026-10-03. Its input is the record documents and the gatelog archive, not the working tree, so a build has nothing for it to read; and it reports an over-report in RUN-LOG.md, which no suite may act on. Admitting it would also make the suite assert on its own past logs, which is a different instrument from a regression gate.
gates/audit/landed-on-main.sh|OPERATOR|strong|Post-integration audit of collection `patches` against origin/main. Needs the tracker dumped to disk first, which no gates.sh invocation does.
gates/audit/verify-parked-patch.sh|OPERATOR|strong|Checks ONE parked payload at park time. Its input is a patch document, not the working tree, so it has nothing to say on a build with no payload.
gates/audit/verify-patch-set.sh|OPERATOR|strong|Checks a SET of parked payloads against each other before an apply. Same input shape: a manifest of patch documents, produced by the integration slot and by nothing else.
gates/audit/pixel-literal-classify.sh|OPERATOR|strong|Seeded #481 to classify the suite's pinned layout literals. Reports a census for an owner to act on; it asserts nothing about the bundle, so there is no build-time verdict to gate.
gates/audit/lesson.js|OPERATOR|strong|Audit of the Lesson screen on the live bundle at four geometries, ~900s under timeout and one PNG per state. The suite's own lesson gates cover the invariants; this is the wide sweep a person reads.
gates/drive/menu.js|OPERATOR|strong|A DRIVER LIBRARY, not a test: state functions for the Menu sheet, required by gates/audit/menu.js. It carries no assertion, so admitting it would run no check.
gates/vocab.js|OPERATOR|strong|Writes the driving vocabulary (screenshots, labels, data-ct rects) for whoever must drive a screen they have not seen. Output is documentation for a reader, not a pass/fail.
gates/control-audit.js|OPERATOR|strong|Audits which gates carry assertions their control never covered - a question about the SUITE, asked of the suite. Running it inside the suite it audits is the circularity its own header argues against, and jobs/control-audit-bounds-total-by-the-L-say-SITE-count-so-no-looping-gate-can-be-covered-2026-10-01 is open against its bound.
gates/ledger-diff.js|OPERATOR|strong|Two-way diff between the flag register and this repository. Its own header states node cannot read the artifact database, so the caller must dump collection `flags` to a file first. A build runner has no such dump.
gates/held.sh|OPERATOR|strong|WRITES gates/held-trees.tsv, the register of gated-green trees that must not ship. A suite that invoked it would append rows during a gate run.
gates/buildnum.sh|OPERATOR|strong|WRITES gates/build-numbers.tsv and is reached from the deploy path (tier 2), not from the suite. Same reason as held.sh: a gate run must not allocate build numbers.
gates/build.sh|OPERATOR|strong|The bundle builder itself, reached from the deploy path (tier 2). gates.sh runs AGAINST its output; running it from inside the suite would rebuild the thing under test mid-run.
gates/verify-log.sh|OPERATOR|strong|THE PUSH GATE. It reads a finished gatelog and authorises the push, so by construction it runs after the suite, not inside it. Its ceiling arms are an OPERATOR-RUN AUDIT and are NOT the push authority: gates/gates.sh never executes this file (every reference in it is a comment) and the --citations mode exits before the log-verification path, so an over-ceiling arm cannot redden any build. The omission is deliberate and recorded at gates/verify-log.sh:103. The arms are audited by their own selftest.
gates/fastgate.sh|OPERATOR|strong|THE TIER DECIDER ON THE PUSH PATH. Invoked by the build routine with a base sha (prompts/build-run STEP 0F) to decide whether THIS tree may push without the full suite, so it runs BEFORE gates/gates.sh and decides whether gates.sh runs at all. A suite that invoked it would be asking the thing it may skip whether it may be skipped - the circularity gates/control-audit.js's row names one line up - and it takes an argument no gate run has. Same shape as the gates/verify-log.sh row above: a push-path authority runs around the suite, not inside it. NOT A SHELF SCRIPT: unlike most members of this set it is exercised on every fast-eligible push, which is why its reason is strong rather than weak. Its own trustworthiness is a separate question from its admissibility and is not settled by this row - gates/fastgate.sh:19 carries a withdrawn load-bearing claim of its own [R18] and has no companion selftest in this roster, which is an ADMIT candidate for whoever writes one, not a reason to keep this file unaccounted.
gates/verify-log-selftest.sh|SELFTEST|weak|The companion selftest of the push gate, run by whoever edits gates/verify-log.sh. WEAK AND I DO NOT BELIEVE IT: this is the selftest of the one script that decides whether anything ships, and an editor-triggered selftest is exactly the shape that let A4CEIL go stale and get breached by 2 on the commit it landed on. It is the strongest ADMIT candidate in this roster and it is not mine to admit.
gates/buildnum-selftest.sh|SELFTEST|weak|The companion selftest of gates/buildnum.sh, run by whoever edits it. WEAK for the same reason one notch down: buildnum.sh owns the build-number space, two concurrent runs have already collided in it (jobs/concurrent-runs-collide-on-the-gate-number-space-2026-09-28), and nothing re-runs this after an unrelated change.
gates/measure-drill-verdict-reserve.js|ONEOFF|strong|Measured the drill verdict's board cost once; its figure is published in claude/stories/USER-STORIES.md:26 and in TEST-CASES.md. The recurring assertion lives in the drill gates.
gates/measure-kunal-qh3.js|ONEOFF|strong|One-shot measurement of a single named position for a single published number. Nothing about it generalises to a build.
gates/audit/antagonist373-label.js|ONEOFF|strong|Antagonist probe written for build #373 against that bundle's labels. Its finding is recorded; the gate that protects the behaviour is in gates/regress/.
gates/audit/antagonist373-play.js|ONEOFF|strong|Antagonist probe for #373's Play screen, same shape and same reason.
gates/audit/antagonist373-review.js|ONEOFF|strong|Antagonist probe for #373's Review screen, same shape and same reason.
gates/audit/selfantagonist373.js|ONEOFF|strong|#373's self-antagonist pass, cited once in DECISIONS-LOG.md:299 as the evidence behind a decision already taken.
gates/pending/probe466-pfh.js|ONEOFF|strong|In gates/pending/, which IS the declared parking directory for probes - gates/pending/README.md is its register, and jobs/a-unit-test-written-for-the-p0-is-not-in-the-suite-2026-09-28 owns the separate defect that the register lists 1 of 12 files.
gates/pending/50-drill-verdict-no-jump.js|ADMIT|strong|A STANDING P0 REGRESSION GATE, NOT A PROBE, and the first ADMIT entry this roster has ever carried. Kunal found the defect on his own phone ("Board jumps when the message in red comes up."); the gate was authored by the test-authoring lane on 2026-09-22, implements TC-R15 over 7 geometry pairs / 14 measured states, and build #500 landed it into gates/pending and cited it in HANDOFF.md, RUN-LOG.md, claude/stories/README.md and claude/stories/USER-STORIES.md - which is what made it a member of this set. IT SHOULD RUN ON EVERY BUILD AND DOES NOT, because #500's own close-out records that its FIX is refused, so admitting it to gates/gates.sh today would redden every build. That is the ADMIT class exactly: owed work, recorded by name. WHY IT IS NOT ONEOFF, which is the row a lane wanting a quiet number would have written: gates/pending/probe466-pfh.js above is ONEOFF because it is a one-shot probe whose figure is published, and this is a recurring assertion with a pass condition whose job is to fail until the fix lands. Calling it ONEOFF to keep the ADMIT count at zero is the cheat the header of this section argues against one paragraph up. AND THE COST IS DECLARED RATHER THAN SLIPPED IN: this row takes ADMIT from 0 to 1, and the header above calls ADMIT a CEILING, MAY ONLY FALL that is empty today. No line of this script enforces that - ADMIT is computed into cAD, printed as ADMIT-WORKLIST and deliberately excluded from the exit code at line 331 - so the header asserts a ratchet the code does not implement. That is a contradiction inside one file [R45 shape 1 and 4] and it is NAMED here for the daily sweep rather than resolved by whoever found it, which R45 forbids.
EOF
}
roster(){ if [ -n "${CT_ROSTER:-}" ] && [ -r "$CT_ROSTER" ]; then grep -v '^[[:space:]]*#' "$CT_ROSTER"; else roster_default; fi; }
# CEILINGS. Both MAY ONLY FALL, and lowering one is the point of the next run that takes this class.
A_UNACC_CEIL=0   # a cited-and-unreachable file in no roster class. Zero, and it is a hard zero.
A_WEAK_CEIL=2    # roster entries whose reason I wrote and do not believe. Named above.

main_report(){
  local -a RECS=()
  if [ -n "${CT_RECORDS:-}" ]; then read -r -a RECS <<<"$CT_RECORDS"; else
    while IFS= read -r l; do RECS+=("$l"); done < <(default_records); fi

  local REACH; REACH="$( { reachable_seed gates/gates.sh; } | closure)"
  # TIER 2. The suite is not the only thing that executes a file under gates/. gates/build.sh and
  # deploy.py are the deploy path, and gates/buildnum.sh, held.sh and gatemanifest.sh are reached
  # from there rather than from gates.sh. Reporting those as orphans would overstate the class in
  # the expensive direction - a lane would go admitting a build script to a gate suite. So the
  # headline stays SUITE-UNREACHABLE and the harder subset, reachable from NO entry point at all,
  # is reported separately. The entry list is the only hand-written list in this file and it is
  # printed in the header so it can be argued with.
  local ENTRIES2="gates/gates.sh gates/build.sh deploy.py"
  local REACH2 e; REACH2="$( for e in $ENTRIES2; do reachable_seed "$e"; done | closure)"
  local nreach; nreach="$(printf '%s\n' "$REACH" | grep -c . || true)"

  # citations: "gates/x/y.js" wins; a bare "y.js" resolves only if exactly one file under gates/
  # carries that basename, so an ambiguous bare name is reported as ambiguous rather than guessed.
  local CIT="" ; local rec line tok cand n
  for rec in "${RECS[@]}"; do
    [ -r "$ROOT/$rec" ] || continue
    while IFS= read -r line; do
      local no="${line%%:*}"; local body="${line#*:}"
      while IFS= read -r tok; do
        [ -n "$tok" ] || continue
        case "$tok" in
          gates/*) cand="$tok"; [ -r "$ROOT/$cand" ] || continue;;
          *)
            n="$(cd "$G" 2>/dev/null && find . -name "$tok" -type f 2>/dev/null | wc -l | tr -d ' ')"
            [ "$n" = "1" ] || continue
            cand="gates/$(cd "$G" && find . -name "$tok" -type f | sed 's|^\./||')";;
        esac
        case "$cand" in gates/logs/*) continue;; esac
        CIT+="$cand	$rec:$no"$'\n'
      done < <(printf '%s\n' "$body" | grep -oE '(gates/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+)\.(js|sh)')
    done < <(grep -nE '\.(js|sh)' "$ROOT/$rec" 2>/dev/null)
  done

  local citfiles; citfiles="$(printf '%s' "$CIT" | awk -F'\t' 'NF{print $1}' | sort -u)"
  local ncit; ncit="$(printf '%s\n' "$citfiles" | grep -c . || true)"

  echo "=== cited-not-run: files under gates/ cited as evidence and reachable by no suite run ==="
  echo "root            $ROOT"
  echo "records scanned ${#RECS[@]}: ${RECS[*]}"
  echo "reachable       $nreach files, derived from gates/gates.sh + require/source closure"
  echo "cited           $ncit distinct files under gates/"
  echo "entry points    $ENTRIES2 (tier 2 only; tier 1 is gates/gates.sh alone)"

  # THE VACUOUS-PASS GUARD. An empty derivation must never print green: that failure mode has already
  # happened once in this project, to a sibling audit script, on its first real run.
  if [ "$nreach" -lt 20 ]; then
    echo "UNSOUND: only $nreach reachable files derived; gates/gates.sh is missing or its enumeration changed shape."
    return 2
  fi
  if [ "$ncit" -lt 1 ]; then
    echo "UNSOUND: no file under gates/ is cited in any scanned record; the citation scan found nothing to compare."
    return 2
  fi

  local leak; leak="$(comm -23 <(printf '%s\n' "$citfiles") <(printf '%s\n' "$REACH" | sort -u))"
  local nleak; nleak="$(printf '%s\n' "$leak" | grep -c . || true)"
  echo "CITED-NOT-RUN   $nleak"
  if [ "$nleak" -eq 0 ]; then echo "GREEN: every cited file under gates/ is reachable by a suite run."; return 0; fi
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    echo "  LEAK $f"
    printf '%s' "$CIT" | awk -F'\t' -v k="$f" 'NF && $1==k {print "       cited at " $2}' | sort -u | head -6
  done <<<"$leak"
  local orphan; orphan="$(comm -23 <(printf '%s\n' "$leak" | grep . | sort -u) <(printf '%s\n' "$REACH2" | sort -u))"
  local norph; norph="$(printf '%s\n' "$orphan" | grep -c . || true)"
  echo "ORPHAN          $norph of the $nleak are reachable from NO entry point ($ENTRIES2):"
  printf '%s\n' "$orphan" | grep . | sed 's/^/  ORPHAN /'

  # ── ROSTER RECONCILIATION. The verdict is here, not on $nleak ───────────────────────────────────
  local RT; RT="$(mktemp)"; roster > "$RT"
  local leakset; leakset="$(printf '%s\n' "$leak" | grep . | sort -u)"
  local accounted=0 unacc=0 weak=0 retired=0 cOP=0 cST=0 cON=0 cAD=0
  local -a UNACC=() WEAK=() RETIRE=() ADMITL=()
  local f row cls str rsn
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    row="$(awk -F'|' -v k="$f" '$1==k{print;exit}' "$RT")"
    if [ -z "$row" ]; then unacc=$((unacc+1)); UNACC+=("$f"); continue; fi
    accounted=$((accounted+1))
    cls="$(printf '%s' "$row" | cut -d'|' -f2)"; str="$(printf '%s' "$row" | cut -d'|' -f3)"
    rsn="$(printf '%s' "$row" | cut -d'|' -f4)"
    # STRENGTH AND REASON ARE VALIDATED *BEFORE* THE CLASS CASE, DELIBERATELY: the class case
    # increments cOP/cST/cON/cAD, so rejecting a row after it had run would decrement `accounted`
    # while leaving the class tally high, and the printed breakdown would no longer sum to it.
    case "$str" in
      weak)   weak=$((weak+1)); WEAK+=("$f");;
      strong) ;;
      *) unacc=$((unacc+1)); accounted=$((accounted-1)); UNACC+=("$f (roster strength \"$str\" is not one of strong weak)"); continue;;
    esac
    # A ROW WITH NO REASON ACCOUNTS FOR NOTHING, WHICH IS THIS FILE'S ENTIRE PURPOSE.
    case "$rsn" in
      ''|'-') unacc=$((unacc+1)); accounted=$((accounted-1)); [ "$str" = "weak" ] && { weak=$((weak-1)); unset 'WEAK[${#WEAK[@]}-1]'; }; UNACC+=("$f (roster reason is empty, so nothing accounts for this file)"); continue;;
    esac
    case "$cls" in
      OPERATOR) cOP=$((cOP+1));;
      SELFTEST) cST=$((cST+1));;
      ONEOFF)   cON=$((cON+1));;
      ADMIT)    cAD=$((cAD+1)); ADMITL+=("$f");;
      *) unacc=$((unacc+1)); accounted=$((accounted-1)); UNACC+=("$f (roster class \"$cls\" is not one of OPERATOR SELFTEST ONEOFF ADMIT)"); continue;;
    esac
  done <<<"$leakset"
  # A ROSTER ENTRY THAT NO LONGER NAMES A MEMBER IS A FAILURE, NOT A TIDY-UP. An exemption that
  # outlives the file it exempts is how a roster becomes a list of names nobody has checked, which
  # is the same failure as the hand-written reachable list this script exists to replace.
  local rp rc rs rr
  while IFS='|' read -r rp rc rs rr; do
    [ -n "$rp" ] || continue
    if ! grep -qxF "$rp" <<<"$leakset"; then
      retired=$((retired+1))
      if [ ! -r "$ROOT/$rp" ]; then RETIRE+=("$rp - GONE, no such file in this tree")
      else RETIRE+=("$rp - RETIRE, it is now reachable or no longer cited"); fi
    fi
  done < "$RT"
  rm -f "$RT"

  echo "ACCOUNTED       $accounted of $nleak   (OPERATOR $cOP, SELFTEST $cST, ONEOFF $cON, ADMIT $cAD)"
  echo "UNACCOUNTED     $unacc of ceiling $A_UNACC_CEIL"
  local x
  for x in "${UNACC[@]}"; do echo "  UNACCOUNTED $x"; done
  echo "WEAK            $weak of ceiling $A_WEAK_CEIL (reason written and not believed by its writer)"
  for x in "${WEAK[@]}"; do echo "  WEAK $x"; done
  echo "STALE-ROSTER    $retired"
  for x in "${RETIRE[@]}"; do echo "  STALE $x"; done
  # ADMIT IS A WORKLIST AND DOES NOT DECIDE THE EXIT CODE, deliberately. A lane that declares a file
  # admittable is doing the thing this roster is for; failing the audit on that declaration would
  # make silence the cheaper answer, which is the behaviour that produced a set of 23.
  echo "ADMIT-WORKLIST  $cAD (does not affect the exit code; see the roster header)"
  for x in "${ADMITL[@]}"; do echo "  ADMIT $x"; done

  local bad=0
  [ "$unacc" -gt "$A_UNACC_CEIL" ] && bad=1
  [ "$weak"  -gt "$A_WEAK_CEIL"  ] && bad=1
  [ "$retired" -gt 0 ] && bad=1
  if [ "$bad" -eq 1 ]; then
    echo "RED. $nleak files are cited as evidence and unreachable by the suite; $unacc of them are accounted for by NOBODY, $weak carry a reason their writer does not believe (ceiling $A_WEAK_CEIL), and $retired roster entries no longer name a member."
    return 1
  fi
  echo "ACCOUNTED-GREEN. All $nleak cited-and-unreachable files are accounted for by name, $weak weakly (ceiling $A_WEAK_CEIL), 0 unaccounted, 0 stale roster entries. THIS IS NOT A CLAIM THAT THE SET IS SMALL - it is $nleak - only that no member of it is unexplained."
  return 0
}

# ── 3. THE CONTROLS. Every detector shown FIRING and SILENT, per R18, on a fixture tree ───────────
selftest(){
  local pass=0 fail=0
  ck(){ local name="$1" want="$2" got="$3"; if [ "$want" = "$got" ]; then pass=$((pass+1)); echo "  ok   $name"; else fail=$((fail+1)); echo "  FAIL $name (want $want, got $got)"; fi; }

  local T; T="$(mktemp -d)"; trap 'rm -rf "$T"' RETURN
  mkdir -p "$T/gates/regress" "$T/gates/audit" "$T/gates/drive" "$T/claude/stories"
  # a gates.sh with the real enumeration shape: the regress glob plus two path literals
  cat > "$T/gates/gates.sh" <<'EOF'
ALLREG=(); for f in "$G"/regress/*.js; do [ -e "$f" ] && ALLREG+=("$f"); done
gates=("$G/mountcheck.js")
UNITJS="$G/unit-drill-why.js"
MANI_OUT="$("$G/gatemanifest.sh" check 2>&1)"
EOF
  : > "$T/gates/mountcheck.js"; : > "$T/gates/unit-drill-why.js"; : > "$T/gates/gatemanifest.sh"
  # 25 reachable regress gates, so the soundness floor of 20 is cleared by the fixture too
  local i; for i in $(seq 1 25); do echo "// gate $i" > "$T/gates/regress/$i-fix.js"; done
  echo "require('../lib.js')"      >> "$T/gates/regress/1-fix.js"   # C4 transitive .js
  echo "require('../drive/play')"  >> "$T/gates/regress/2-fix.js"   # C4b extensionless + dir
  : > "$T/gates/lib.js"; : > "$T/gates/drive/play.js"
  : > "$T/gates/orphan-cited.js"       # C2 cited, unreachable        -> LEAK
  : > "$T/gates/orphan-uncited.js"     # C3 uncited, unreachable      -> silent
  : > "$T/gates/bare-named.js"         # C5 cited by basename only    -> LEAK
  : > "$T/gates/measure-thing.sh"      # C7 a .sh cited, unreachable  -> LEAK
  : > "$T/gates/regress/9-fix.js"
  cat > "$T/RUN-LOG.md" <<'EOF'
ran gates/regress/1-fix.js -> 12 PASS            (C1 reachable+cited, must stay silent)
evidence: gates/orphan-cited.js -> 7 checks      (C2)
evidence: bare-named.js -> 3 checks              (C5, no directory given)
evidence: gates/measure-thing.sh -> 41px         (C7)
evidence: gates/lib.js helper                    (C4, reachable by require)
evidence: gates/drive/play.js                    (C4b)
EOF
  echo "nothing cited here" > "$T/claude/stories/EMPTY.md"

  local out rc
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C0  exit 1 when the set is non-empty"            "1" "$rc"
  ck "C1  a reachable regress gate is NOT a leak"      "0" "$(grep -c 'LEAK gates/regress/1-fix.js' <<<"$out")"
  ck "C2  an unreachable cited .js IS a leak"          "1" "$(grep -c 'LEAK gates/orphan-cited.js' <<<"$out")"
  ck "C3  an unreachable UNCITED file is silent"       "0" "$(grep -c 'orphan-uncited' <<<"$out")"
  ck "C4  a file reachable via require is NOT a leak"  "0" "$(grep -c 'LEAK gates/lib.js' <<<"$out")"
  ck "C4b extensionless require resolves"             "0" "$(grep -c 'LEAK gates/drive/play.js' <<<"$out")"
  ck "C5  a bare basename citation resolves"           "1" "$(grep -c 'LEAK gates/bare-named.js' <<<"$out")"
  ck "C6  mountcheck named by path literal is clear"   "0" "$(grep -c 'LEAK gates/mountcheck.js' <<<"$out")"
  ck "C7  a cited .sh is in scope, not only .js"       "1" "$(grep -c 'LEAK gates/measure-thing.sh' <<<"$out")"
  ck "C8  the count equals the lines printed"          "3" "$(sed -n 's/^CITED-NOT-RUN *//p' <<<"$out")"
  ck "C9  every leak names a citing document and line" "3" "$(grep -c 'cited at RUN-LOG.md:' <<<"$out")"

  # C16/C17: the comment arm. Both directions, because stripping too much is as wrong as too little.
  : > "$T/gates/mentioned-only.js"
  echo "# see gates/mentioned-only.js for the argument" >> "$T/gates/gates.sh"
  echo "evidence: gates/mentioned-only.js -> 9 checks" >> "$T/RUN-LOG.md"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"
  ck "C16 a file named only in a COMMENT is still a leak" "1" "$(grep -c 'LEAK gates/mentioned-only.js' <<<"$out")"
  ck "C17 and a file named on a CODE line is not"         "0" "$(grep -c 'LEAK gates/gatemanifest.sh' <<<"$out")"
  rm -f "$T/gates/mentioned-only.js"
  sed -i '$d' "$T/RUN-LOG.md"

  # ── THE ROSTER ARM, C18-C29. Every detector FIRING and SILENT, on the same fixture tree ─────────
  # The three leaks here are gates/orphan-cited.js, gates/bare-named.js and gates/measure-thing.sh.
  # EVERY CASE BELOW PASSES CT_ROSTER, so these controls say nothing about the SHIPPED roster's
  # contents - that is section 2b's own job and the real run's ACCOUNTED line. What they test is the
  # mechanism: that an unexplained file cannot pass, that an explained one does, that an exemption
  # outliving its member fails, and that the weak ceiling and the class vocabulary both bite.
  local R="$T/roster.txt"
  full_roster(){ cat > "$R" <<'EOF'
# a comment line, which must be ignored rather than parsed as a path
gates/orphan-cited.js|ONEOFF|strong|one-shot probe, number published
gates/bare-named.js|OPERATOR|strong|run by hand
gates/measure-thing.sh|OPERATOR|strong|run by hand
EOF
  }

  full_roster
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C18 a fully accounted set exits 0 though non-empty"  "0" "$rc"
  ck "C19 and says ACCOUNTED-GREEN"                        "1" "$(grep -c '^ACCOUNTED-GREEN' <<<"$out")"
  ck "C20 the headline size is still printed when green"   "3" "$(sed -n 's/^CITED-NOT-RUN *//p' <<<"$out")"
  ck "C21 the per-class tally sums to the set"             "3" "$(sed -n 's/^ACCOUNTED  *\([0-9]*\) of.*/\1/p' <<<"$out")"

  # UNACCOUNTED, firing: drop one row and the same tree must refuse.
  grep -v '^gates/bare-named.js|' "$R" > "$R.tmp" && mv "$R.tmp" "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C22 one unexplained member refuses"                  "1" "$rc"
  ck "C23 and names that file, not another"                "1" "$(grep -c '^  UNACCOUNTED gates/bare-named.js' <<<"$out")"
  ck "C24 the unaccounted count is 1, not 3"               "1" "$(sed -n 's/^UNACCOUNTED  *\([0-9]*\) of.*/\1/p' <<<"$out")"

  # STALE ROSTER, both arms: an entry for a file that is not a member, present and absent.
  full_roster
  echo 'gates/regress/1-fix.js|ONEOFF|strong|reachable, so not a member' >> "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C25 an exemption for a REACHABLE file refuses"       "1" "$rc"
  ck "C25b and is reported as RETIRE, not GONE"            "1" "$(grep -c 'STALE gates/regress/1-fix.js - RETIRE' <<<"$out")"
  full_roster
  echo 'gates/no-such-file.js|ONEOFF|strong|deleted two builds ago' >> "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C26 an exemption for a DELETED file refuses"         "1" "$rc"
  ck "C26b and is reported as GONE"                        "1" "$(grep -c 'STALE gates/no-such-file.js - GONE' <<<"$out")"

  # THE WEAK CEILING. Two weak reasons is the shipped ceiling, so two must pass and three must not.
  full_roster
  sed -i 's/^gates\/orphan-cited.js|ONEOFF|strong|/gates\/orphan-cited.js|ONEOFF|weak|/; s/^gates\/bare-named.js|OPERATOR|strong|/gates\/bare-named.js|OPERATOR|weak|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C27 two weak reasons are at the ceiling and pass"    "0" "$rc"
  ck "C27b and both are named"                             "2" "$(grep -c '^  WEAK ' <<<"$out")"
  sed -i 's/^gates\/measure-thing.sh|OPERATOR|strong|/gates\/measure-thing.sh|OPERATOR|weak|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C28 a third weak reason breaches the ceiling"        "1" "$rc"

  # THE CLASS VOCABULARY. A class outside the four is NOT a free pass - this is the field-name drift
  # R43 was written about, one directory to the left: a roster whose class column accepts anything
  # accounts for nothing.
  full_roster
  sed -i 's/^gates\/orphan-cited.js|ONEOFF|/gates\/orphan-cited.js|PROBABLY-FINE|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C29 an unknown class counts as UNACCOUNTED"          "1" "$rc"
  ck "C29b and the message names the bad class"            "1" "$(grep -c 'PROBABLY-FINE' <<<"$out")"

  # THE STRENGTH VOCABULARY, C31-C31e (#487). The sibling of C29, one column to the right, and it was
  # unguarded until #487: `[ "$str" = "weak" ]` let any other spelling count as strong, so ONE CAPITAL
  # LETTER emptied a ceiling that may only fall. C31c is the control that stops this over-firing.
  full_roster
  sed -i 's/^gates\/orphan-cited.js|ONEOFF|strong|/gates\/orphan-cited.js|ONEOFF|Weak|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C31 a mis-cased strength counts as UNACCOUNTED"      "1" "$rc"
  ck "C31b and the message names the bad strength"         "1" "$(grep -c 'is not one of strong weak' <<<"$out")"
  ck "C31b2 and it is NOT silently counted as weak"        "0" "$(grep -c '^  WEAK gates/orphan-cited.js' <<<"$out")"
  full_roster
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C31c POSITIVE: the unmodified roster still passes"   "0" "$rc"
  # AND THE REASON COLUMN, which no line of this script read before #487.
  full_roster
  sed -i 's/^gates\/orphan-cited.js|ONEOFF|strong|.*$/gates\/orphan-cited.js|ONEOFF|strong|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C31d an empty reason counts as UNACCOUNTED"          "1" "$rc"
  ck "C31e and the message says nothing accounts for it"   "1" "$(grep -c 'roster reason is empty' <<<"$out")"

  # ADMIT is a worklist and must NOT decide the exit code. Both halves asserted.
  full_roster
  sed -i 's/^gates\/orphan-cited.js|ONEOFF|/gates\/orphan-cited.js|ADMIT|/' "$R"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" CT_ROSTER="$R" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C30 an ADMIT member does not redden the audit"       "0" "$rc"
  ck "C30b and appears on the worklist"                    "1" "$(grep -c '^  ADMIT gates/orphan-cited.js' <<<"$out")"

  # the GREEN arm: delete the three leaks and the same tree must pass
  rm -f "$T/gates/orphan-cited.js" "$T/gates/bare-named.js" "$T/gates/measure-thing.sh"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C10 exit 0 once nothing is cited-and-unreachable" "0" "$rc"
  ck "C11 and it says so"                               "1" "$(grep -c '^GREEN' <<<"$out")"

  # the UNSOUND arm. Both guards must fire: this is the control my own sibling script lacked on its
  # first real run, and a green printed over an empty derivation is the worst output this file could have.
  mv "$T/gates/gates.sh" "$T/gates/gates.sh.off"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C12 exit 2 when the suite cannot be derived"     "2" "$rc"
  ck "C13 and it is not reported as green"             "0" "$(grep -c '^GREEN' <<<"$out")"
  mv "$T/gates/gates.sh.off" "$T/gates/gates.sh"
  echo "no file names here" > "$T/EMPTY-REC.md"
  out="$(CT_ROOT="$T" CT_RECORDS="EMPTY-REC.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C14 exit 2 when no citation is found at all"     "2" "$rc"
  ck "C15 and the reason names the citation scan"      "1" "$(grep -c 'no file under gates/ is cited' <<<"$out")"

  echo "cited-not-run selftest: $pass pass / $fail fail"
  [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest|selftest) selftest;;
  *) main_report;;
esac
