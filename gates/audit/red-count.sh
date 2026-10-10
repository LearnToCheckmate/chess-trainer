#!/usr/bin/env bash
# gates/audit/red-count.sh
#
# WHAT IT ANSWERS, in one line: for every committed gatelog that carries reds, how many DISTINCT
# red assertions does it actually hold, and does any number we have PUBLISHED about that log
# disagree with it.
#
# WHY IT EXISTS. jobs/a-fail-line-count-on-a-gatelog-over-reports-by-up-to-five-2026-10-03
# (priority 14, finishFirst) has two halves on its own outcome.whatIsLeft. The first - the one-line
# recipe site in gates/verify-log.sh - became
# jobs/verify-log-sh-carries-the-unsound-fail-count-recipe-beside-its-own-pass-check-2026-10-04 and
# was PARKED by the orchestrator at 2026-10-07T03:10Z until after the 30 October launch, so it is
# not built here and must not be [R33, R39]. The second half is the one this script is:
#
#   "ALSO LEFT AND LARGER: no back-audit of red counts already published in RUN-LOG.md, ledger rows
#    or job documents using the unsound recipe. Named on the new job as the part with the largest
#    blast radius."
#
# A back-audit done once by hand goes stale the next time anybody publishes a red count. This runs
# it, so the answer is derived rather than remembered.
#
# THE THREE RECIPES, AND TWO OF THEM ARE WRONG. gates.sh replays a red section's first five FAIL
# lines into its own summary block (`grep '^FAIL' "$log" | head -5`), and the replayed lines are
# BYTE-IDENTICAL to the originals.
#   RAW      grep -c '^FAIL'                                over-reports wherever a replay happened
#   TOKEN    grep -o '^FAIL [A-Za-z0-9]*' | sort -u | wc -l  WITHDRAWN by #477. This format has no
#            assertion-id field: what follows FAIL is free-form L.say prose, and the character class
#            additionally stops at the first hyphen.
#   DEDUP    grep '^FAIL' | sort -u | wc -l                  exact, because the replay is byte-identical
#
# USAGE
#   gates/audit/red-count.sh             report against the repository it lives in
#   gates/audit/red-count.sh --selftest  run the controls in a throwaway tree
#   CT_ROOT=<dir>                        audit a different tree (the selftest uses this)
#   CT_TOKEN_CEIL=<n>                    override section 3's ratchet ceiling (the selftest uses this)
#
# EXIT CODES. 0 the exactness invariant holds on every replay-free log, the withdrawn recipe is at
# or below its ceiling, and no published figure disagrees with both sound readings. 1 any of those
# three fails. 2 the derivation is vacuous - no log with reds found at all - which is the green this
# script refuses to print. A report that measured nothing must not read like a clean one.
#
# IT CANNOT REDDEN THE SUITE AND IT FIXES NOTHING. gates/gates.sh does not call it (nor any other
# member of gates/audit/ - measured 2026-10-07: `grep -rn "audit/" gates/*.sh deploy.py` returns
# nothing), and RUN-LOG.md is outside the process lane's allow-list, so where this script finds a
# published figure wrong it REPORTS it for the build lane and may not correct it.

set -uo pipefail
ROOT="${CT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RED=0; LOGS=0; FAILN=0; PASSN=0

ck() { # ck <name> <expected> <actual>
  if [ "$2" = "$3" ]; then PASSN=$((PASSN+1)); echo "PASS $1"
  else FAILN=$((FAILN+1)); echo "FAIL $1 | expected [$2] got [$3]"; fi
}

raw_of()   { grep -c '^FAIL' "$1" 2>/dev/null || true; }
dedup_of() { grep '^FAIL' "$1" 2>/dev/null | sort -u | wc -l | tr -d ' '; }
token_of() { grep -o '^FAIL [A-Za-z0-9]*' "$1" 2>/dev/null | sort -u | wc -l | tr -d ' '; }
sect_of()  { grep -c '^=== ' "$1" 2>/dev/null || true; }
# ADDED 2026-10-10 by process-build lane 3 for sections (5) and (6). A RED SECTION is a summary line
# gates.sh writes at :356, four spaces then the gate name then ": RED (". It is the unit the replay
# cap applies to, and it is also - section (6) - the only place a '<<<' has ever appeared in a log.
redsect_of() { grep -cE '^ {4}[^ ]+: RED \(' "$1" 2>/dev/null || true; }
mark_of()    { grep -c '<<<' "$1" 2>/dev/null || true; }

gatelogs() {
  for d in claude/agents/gatelogs claude/agents/controls gates/logs; do
    [ -d "$ROOT/$d" ] || continue
    find "$ROOT/$d" -maxdepth 1 -type f 2>/dev/null | sort
  done
}

report() {
  echo "=== gates/audit/red-count.sh over $ROOT"
  echo

  # ── 1. THE TRUTH TABLE ────────────────────────────────────────────────────────────────────────
  echo "(1) EVERY COMMITTED GATELOG THAT CARRIES A RED, AND THE THREE READINGS OF IT"
  printf '    %-62s %5s %5s %5s %5s\n' log raw dedup token sect
  TBL="$(mktemp)"; WORST=0; WORSTLOG=""; TOKWRONG=0; RAWOVER=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    r="$(raw_of "$f")"; [ "${r:-0}" -gt 0 ] || continue
    d="$(dedup_of "$f")"; t="$(token_of "$f")"; s="$(sect_of "$f")"
    LOGS=$((LOGS+1))
    printf '%s\t%s\t%s\t%s\t%s\n' "${f#$ROOT/}" "$r" "$d" "$t" "$s" >> "$TBL"
    printf '    %-62s %5s %5s %5s %5s\n' "$(basename "$f")" "$r" "$d" "$t" "$s"
    [ "$t" != "$d" ] && TOKWRONG=$((TOKWRONG+1))
    [ "$r" != "$d" ] && RAWOVER=$((RAWOVER+1))
    under=$((d - t)); if [ "$under" -gt "$WORST" ]; then WORST=$under; WORSTLOG="$(basename "$f")"; fi
  done < <(gatelogs)
  echo "    $LOGS log(s) with at least one red."
  if [ "$LOGS" -eq 0 ]; then
    echo "REFUSED: no gatelog with a red was found under $ROOT. Nothing was measured, so nothing is green."
    rm -f "$TBL"; return 2
  fi
  echo "    TOKEN disagrees with DEDUP on $TOKWRONG of $LOGS. RAW over-reports on $RAWOVER of $LOGS."
  echo "    WORST TOKEN UNDER-REPORT: $WORST red(s) lost on $WORSTLOG."
  echo

  # ── 2. THE EXACTNESS INVARIANT, AND IT IS THE CONTROL THAT MAKES DEDUP CREDIBLE ───────────────
  # On a log with NO section headers there was no suite summary, so gates.sh cannot have replayed
  # anything, so dedup MUST equal raw. If it does not, dedup is removing a line the suite never
  # manufactured - two genuinely distinct failures printing byte-identical text - and the recipe is
  # under-counting rather than de-duplicating. This is the one way dedup can be wrong and it is
  # checked on every replay-free log rather than on the three the README names.
  echo "(2) THE EXACTNESS INVARIANT: on a log with 0 sections, DEDUP == RAW"
  N0=0; BAD0=0
  while IFS=$'\t' read -r p r d t s; do
    [ "$s" = "0" ] || continue
    N0=$((N0+1))
    if [ "$r" != "$d" ]; then BAD0=$((BAD0+1)); echo "    DEDUP IS NOT EXACT: $p has 0 sections, raw $r, dedup $d"; fi
  done < "$TBL"
  echo "    $N0 replay-free log(s) checked, $BAD0 where dedup differs from raw."
  ck "(2) dedup is exact on every replay-free log" "0" "$BAD0"
  [ "$BAD0" -eq 0 ] || RED=1
  echo

  # ── 3. THE WITHDRAWN RECIPE, RATCHETED ───────────────────────────────────────────────────────
  # The token recipe is withdrawn, not merely unpreferred, so the number of places that carry it as
  # ADVICE may only fall. A site that WITHDRAWS it in the same file is exempt by its own withdrawal
  # marker, which is how gates/regress/README.md can quote it in order to kill it.
  echo "(3) THE WITHDRAWN TOKEN RECIPE: how many places in the tree still carry it"
  # THE EXEMPTION IS LINE-LOCAL, AND THE FIRST DRAFT'S FILE-LOCAL ONE WAS A HOLE FOUND BY RUNNING
  # RATHER THAN BY READING. It asked whether the word "withdrawn" appeared ANYWHERE in the file, and
  # against the real tree that exempted HANDOFF.md, RUN-LOG.md and gates/verify-log.sh - three
  # documents of several hundred to several thousand lines that each use the word somewhere else
  # entirely - so the ratchet printed "0 site(s) against a ceiling of 1" while the one site the
  # parked job is about was still live at gates/verify-log.sh:720. A detector that exempts the thing
  # it was written to watch is worse than no detector, so the marker must now sit within
  # EXEMPT_WINDOW lines of the occurrence itself.
  EXEMPT_WINDOW="${CT_EXEMPT_WINDOW:-12}"
  SITES="$(cd "$ROOT" && grep -rln "FAIL \[A-Za-z0-9\]\*" --include=*.sh --include=*.md --include=*.js --include=*.py . 2>/dev/null | sed 's|^\./||' | sort || true)"
  LIVE=""
  for s in $SITES; do
    [ "$s" = "gates/audit/red-count.sh" ] && { echo "    EXEMPT (this script, which names the recipe in order to refuse it): $s"; continue; }
    sitelive=0
    while IFS= read -r ln; do
      [ -n "$ln" ] || continue
      lo=$(( ln - EXEMPT_WINDOW )); [ "$lo" -lt 1 ] && lo=1
      hi=$(( ln + EXEMPT_WINDOW ))
      # REPAIRED 2026-10-08 by process-build lane 3, run process-build-3__1791476801744, for
      # jobs/build-499s-18-payload-batch-is-blocked-on-pipefail-greps-tier-b-ceiling-... step (3) of its
      # whatWouldCloseIt. WAS: `sed -n "${lo},${hi}p" ... | grep -qi '...'`. `grep -q` exits on its first
      # selected line, `sed` then takes SIGPIPE and dies 141, and under `set -o pipefail` that 141 is the
      # pipeline's status - so the EXEMPT branch, which is the one a match is supposed to take, could be
      # decided by a broken pipe instead of by the match. Measured TIER B by gates/audit/pipefail-grep.sh
      # on the tree build #499 assembled: `sed -n` is a measured-propagating producer. The window is held
      # in a variable and read with a herestring, which has no pipe and so cannot SIGPIPE at any size.
      # BEHAVIOUR IS UNCHANGED ON THE EMPTY WINDOW: an empty `$win` gives grep one empty line, which
      # matches none of the four alternatives, exactly as an empty pipe did.
      local win; win="$(sed -n "${lo},${hi}p" "$ROOT/$s" 2>/dev/null || true)"
      if grep -qi 'withdraw\|unsound\|is wrong\|do not use' <<<"$win"; then
        echo "    EXEMPT (withdrawn within $EXEMPT_WINDOW lines of the occurrence): $s:$ln"
      else
        echo "    CARRIES IT AS ADVICE: $s:$ln"
        sitelive=1
      fi
    done < <(grep -n "FAIL \[A-Za-z0-9\]\*" "$ROOT/$s" 2>/dev/null | cut -d: -f1)
    [ "$sitelive" = "1" ] && LIVE="$LIVE $s"
  done
  NLIVE="$(printf '%s\n' $LIVE | grep -c . || true)"
  CEIL="${CT_TOKEN_CEIL:-1}"
  echo "    $NLIVE site(s) carry it as advice, against a ceiling of $CEIL. THE CEILING MAY ONLY FALL."
  if [ "$NLIVE" -gt "$CEIL" ]; then
    echo "    RECIPE COUNT ROSE: $NLIVE sites against a ceiling of $CEIL. A withdrawn recipe gained a home."
    RED=1; FAILN=$((FAILN+1)); echo "FAIL (3) the withdrawn recipe is at or below its ceiling"
  else
    PASSN=$((PASSN+1)); echo "PASS (3) the withdrawn recipe is at or below its ceiling"
  fi
  echo "    THE ONE SITE AT THE CEILING IS KNOWN AND IS PARKED, NOT FORGOTTEN:"
  echo "    jobs/verify-log-sh-carries-the-unsound-fail-count-recipe-beside-its-own-pass-check-2026-10-04,"
  echo "    parked until after the 30 October launch. This section exists so that park stays visible"
  echo "    and so a SECOND site cannot appear quietly while the first one waits."
  echo

  # ── 4. THE BACK-AUDIT ────────────────────────────────────────────────────────────────────────
  # For every tracked text file that names a gatelog, read the numbers published within 300
  # characters of that name and ask whether any of them matches NEITHER sound reading. A figure
  # equal to RAW is reported as an over-report rather than as an error, because RAW was the
  # project's own convention before #477 and the distinction is what a reader needs.
  echo "(4) THE BACK-AUDIT: published red figures against the two sound readings"
  BA="$(mktemp)"
  (cd "$ROOT" && find . -path ./.git -prune -o -type f \( -name '*.md' -o -name '*.tsv' \) -print 2>/dev/null | sed 's|^\./||' | sort) > "$BA"
  CITES=0; OVER=0; NEITHER=0
  while IFS= read -r doc; do
    [ -f "$ROOT/$doc" ] || continue
    while IFS=$'\t' read -r p r d t s; do
      b="$(basename "$p")"
      grep -qF "$b" "$ROOT/$doc" 2>/dev/null || continue
      CITES=$((CITES+1))
      # THE NUMBERS MUST COME FROM A WINDOW AROUND THE CITATION, NOT FROM THE WHOLE DOCUMENT, and
      # the first draft of this section took them from the whole document. Run against the real tree
      # it then reported three over-reports in HANDOFF.md and RUN-LOG.md - and all three were FALSE,
      # checked by hand before anything was published [R18]: HANDOFF.md:3395 names 451-all-RED.log
      # beside the figure 16 about a Roadmap element, and the "2 FAIL" it was matched against is
      # thousands of lines away about something else. A back-audit whose hits are mostly noise is a
      # back-audit nobody will read twice, so the window is WINDOW_CHARS either side of the name.
      WINDOW_CHARS="${CT_WINDOW_CHARS:-300}"
      NUMS="$(grep -oE ".{0,$WINDOW_CHARS}$b.{0,$WINDOW_CHARS}" "$ROOT/$doc" 2>/dev/null \
                | grep -oE "[0-9]{1,3} *(red|RED|FAIL|fail)" | grep -oE '^[0-9]+' | sort -un || true)"
      for n in $NUMS; do
        [ "$n" = "0" ] && continue
        if [ "$n" = "$d" ]; then continue
        elif [ "$n" = "$r" ]; then OVER=$((OVER+1)); echo "    OVER-REPORTS BY $((r - d)): $doc publishes $n for $b, where RAW is $r and DEDUP is $d"
        fi
      done
    done < "$TBL"
  done < "$BA"
  echo "    $CITES (document, gatelog) citation pair(s) examined."
  echo "    $OVER published figure(s) equal to the RAW line count where DEDUP is lower."
  echo "    $NEITHER published figure(s) matching neither sound reading."
  ck "(4) no published figure matches neither sound reading" "0" "$NEITHER"
  [ "$NEITHER" -eq 0 ] || RED=1
  echo "    AN OVER-REPORT IS A FINDING FOR THE BUILD LANE AND NOT A RED HERE: RUN-LOG.md is outside"
  echo "    the process lane's allow-list, so this script may name the figure and may not fix it."
  echo "    AND IT CANNOT TELL A QUOTATION FROM A CLAIM, which is a limit of this section rather than"
  echo "    of the recipe, stated because this script's own arrival demonstrated it: the record entry"
  echo "    that REPORTS the RUN-LOG figure quotes it verbatim beside the log name, so one wrong row"
  echo "    can produce several hits. DE-DUPLICATE BY (gatelog, figure) BEFORE PUBLISHING A TOTAL."
  echo

  # ── 5. THE REPLAY CAP, DERIVED FROM gates.sh RATHER THAN REMEMBERED ───────────────────────────
  # ADDED 2026-10-10 by process-build lane 3, run process-build-3__1791649597346, for the FIRST of
  # the two notChecked items of
  # jobs/a-fail-line-count-on-a-gatelog-over-reports-by-up-to-five-2026-10-03:
  #
  #   "whether the replay is capped at exactly 5 for every section or varies with the section's own
  #    FAIL count - measured 5 on one section with 16 FAILs; THE CAP WAS NOT READ OUT OF gates.sh"
  #
  # Three runs named it unrun: the 2026-10-03 filing, this lane's 2026-10-07 outcome, and #492's.
  # It is two greps. IT IS READ OUT OF gates.sh HERE, EVERY RUN, rather than written down, because
  # the whole published bound is a property of one literal in another file and a literal in another
  # file is exactly what goes stale [R18].
  #
  # AND READING IT CORRECTS THIS JOB'S OWN HEADLINE. The cap is a CONSTANT 5 PER RED SECTION, not
  # per log, so the bound on a log's over-report is 5 x (its red sections) and the title's "up to
  # five" is a per-section figure published as a per-log one. It has never been exceeded only
  # because no committed log yet has more than TWO red sections, which section (5) measures rather
  # than assumes - and the suite runs 59 sections, so the condition under which the published bound
  # breaks is "a build goes red in three or more sections", not anything exotic.
  echo "(5) THE REPLAY CAP, READ OUT OF gates/gates.sh, AND THE BOUND IT IMPLIES"
  GS="$ROOT/gates/gates.sh"
  CAP_EXPECT="${CT_CAP_EXPECT:-5}"
  if [ ! -r "$GS" ]; then
    echo "    MEASURED NOTHING on this section: $GS is not readable, so the cap cannot be derived"
    echo "    and no bound below it may be quoted. This is not a PASS."
  else
    # A REPLAY SITE is a line that extracts FAIL lines, caps them with head, and appends to $ALL.
    # Both of gates.sh's sites match: :356 (`grep '^FAIL' "$log" | head -5 | tee -a "$ALL"`) and
    # :326 (the unit-drill-why translation, `sed -n 's/^  FAIL /FAIL unit-drill-why /p' ... head -5`).
    RSITES="$(grep -nE 'FAIL' "$GS" 2>/dev/null | grep -E 'head -' | grep -F 'tee -a' || true)"
    NRS=0; [ -n "$RSITES" ] && NRS="$(grep -c . <<<"$RSITES" || true)"
    CAPSET="$(grep -oE 'head -[0-9]+' <<<"${RSITES:-}" | grep -oE '[0-9]+' | sort -un | tr '\n' ',' | sed 's/,$//' || true)"
    VARCAP="$(grep -cE 'head -\$' <<<"${RSITES:-}" || true)"
    echo "    $NRS replay site(s) in gates/gates.sh:"
    [ -n "$RSITES" ] && sed 's/^/        /' <<<"$RSITES"
    if [ "$NRS" -eq 0 ]; then
      echo "    MEASURED NOTHING: no replay site matched. Either the mechanism is gone - in which case"
      echo "    every bound this project has published about it is about nothing - or this detector's"
      echo "    pattern no longer fits gates.sh. BOTH need a human; neither is a PASS."
      RED=1; FAILN=$((FAILN+1)); echo "FAIL (5) the replay site is locatable in gates.sh"
    else
      ck "(5) every replay cap is a literal, not derived from the section's FAIL count" "0" "$VARCAP"
      [ "$VARCAP" -eq 0 ] || RED=1
      ck "(5) the cap is one value across every replay site" "$CAP_EXPECT" "$CAPSET"
      if [ "$CAPSET" != "$CAP_EXPECT" ]; then
        RED=1
        echo "    THE CAP MOVED, OR THE SITES DISAGREE: derived [$CAPSET] against the recorded $CAP_EXPECT."
        echo "    EVERY published over-report bound in this project is 'the cap x the red sections', so a"
        echo "    change here invalidates all of them at once and is why this is derived and not stored."
      fi
      CAP="${CAP_EXPECT}"; [ "$CAPSET" = "$CAP_EXPECT" ] && CAP="$CAPSET"
      # THE BOUND, OVER THE SAME POPULATION SECTION (1) WALKED.
      MAXRS=0; MAXOVER=0; MAXOVERLOG=""; NB=0; BADB=0
      while IFS= read -r f; do
        [ -n "$f" ] || continue
        r="$(raw_of "$f")"; [ "${r:-0}" -gt 0 ] || continue
        d="$(dedup_of "$f")"; rs="$(redsect_of "$f")"; rs="${rs:-0}"
        NB=$((NB+1)); over=$(( r - d ))
        [ "$rs" -gt "$MAXRS" ] && MAXRS="$rs"
        if [ "$over" -gt "$MAXOVER" ]; then MAXOVER="$over"; MAXOVERLOG="$(basename "$f")"; fi
        if [ "$over" -gt $(( CAP * rs )) ]; then
          BADB=$((BADB+1))
          echo "    OVER-REPORT EXCEEDS THE DERIVED BOUND: $(basename "$f") raw $r dedup $d over $over,"
          echo "        against $CAP x $rs red section(s) = $(( CAP * rs )). The replay is not the whole cause here."
        fi
      done < <(gatelogs)
      if [ "$NB" -eq 0 ]; then
        echo "    MEASURED NOTHING on the bound: no log with a red to apply it to."
      else
        ck "(5) no log over-reports by more than cap x its own red sections" "0" "$BADB"
        [ "$BADB" -eq 0 ] || RED=1
        echo "    $NB log(s) with reds. WORST OVER-REPORT $MAXOVER on ${MAXOVERLOG:-none}."
        echo "    MOST RED SECTIONS IN ANY ONE LOG: $MAXRS. So the bound actually reachable TODAY is"
        echo "    $CAP x $MAXRS = $(( CAP * MAXRS )), and the only reason the published 'up to five' has never been"
        echo "    exceeded is that no committed log has gone red in three or more sections. gates.sh runs"
        echo "    59 sections, so that is a fact about the sample and not a property of the mechanism."
        echo "    QUOTE THE BOUND AS '$CAP PER RED SECTION', NEVER AS '$CAP PER LOG' [R18]."
      fi
    fi
  fi
  echo

  # ── 6. THE MARKER RECIPE, WHICH IS THE SAME CAUSE AND STRICTLY WORSE ─────────────────────────
  # ADDED 2026-10-10 by process-build lane 3 for the SECOND notChecked item of the same job:
  #
  #   "whether the `0 <<<` field in the summary line has the same replay behaviour"
  #
  # ANSWERED, AND THE ANSWER IS NOT 'THE SAME': IT IS WORSE IN KIND. gates.sh counts `marks` from
  # the PER-GATE log (`marks=$(grep -c '<<<' "$log")`, :340) and then prints the count inside the
  # section's summary line, which contains the LITERAL STRING `<<<` - so the all-log gains one
  # `<<<` occurrence per RED SECTION that is pure formatting. A raw FAIL count over-reports a real
  # number; a raw marker count over an all-log reports a number with NO true component.
  #
  # MEASURED 2026-10-10 over all 148 committed logs under claude/agents/: there are exactly 15
  # occurrences of `<<<`, every one of them a RED summary line reading `0 <<<`, and ZERO genuine
  # marker lines anywhere. `grep -c '<<<' <all-log>` therefore returns the log's RED SECTION COUNT
  # and has never once returned a marker count.
  #
  # THE SEVERITY IS SEPARATED RATHER THAN BORROWED, which is what keeps this a finding and not an
  # alarm: gates.sh's own red condition reads `marks` from the per-gate log, never from $ALL, so no
  # build was wrongly reddened or greened by this and the suite's verdict is unaffected. The cost
  # falls on exactly the population this job's ifNotDone names - a lane or an antagonist auditing a
  # gatelog - and it is the one `<<<` is most likely to mislead, because `<<<` is one of the three
  # conditions gates.sh exits 1 on, so a non-zero reading reads as a marker failure.
  #
  # THE SOUND RECIPE is to drop the summary lines first:
  #   grep '<<<' <log> | grep -vE '^ {4}[^ ]+: RED \(' | wc -l
  # or to read the FIELD'S VALUE rather than count the token.
  echo "(6) THE MARKER RECIPE: what 'grep -c <<<' over an all-log actually counts"
  MK_RAW=0; MK_SUMM=0; MK_GEN=0; NMK=0; BADM=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    mr="$(mark_of "$f")"; mr="${mr:-0}"
    [ "$mr" -gt 0 ] || continue
    NMK=$((NMK+1))
    ms="$(grep '<<<' "$f" 2>/dev/null | grep -cE '^ {4}[^ ]+: RED \(' || true)"; ms="${ms:-0}"
    mg=$(( mr - ms ))
    MK_RAW=$(( MK_RAW + mr )); MK_SUMM=$(( MK_SUMM + ms )); MK_GEN=$(( MK_GEN + mg ))
    if [ "$mg" -lt 0 ]; then
      BADM=$((BADM+1))
      echo "    ATTRIBUTION IS IMPOSSIBLE: $(basename "$f") raw $mr, summary lines $ms. More summary"
      echo "        lines than occurrences means this section's own pattern is wrong, not the log."
    elif [ "$mg" -gt 0 ]; then
      echo "    GENUINE MARKER(S): $(basename "$f") holds $mg '<<<' line(s) that are NOT a summary line."
      echo "        This is the FIRST such log. gates.sh's '<<<' red branch has never been exercised on"
      echo "        any committed log, so nothing here says it behaves as its own comment claims."
    fi
  done < <(gatelogs)
  if [ "$NMK" -eq 0 ]; then
    echo "    MEASURED NOTHING on this section: no log under $ROOT holds a '<<<' at all, so neither"
    echo "    recipe can be compared. This is NOT a PASS - a report over an empty population is the"
    echo "    one green this script refuses to print."
  else
    ck "(6) every '<<<' occurrence is attributable" "0" "$BADM"
    [ "$BADM" -eq 0 ] || RED=1
    echo "    $NMK log(s) hold a '<<<'. RAW TOTAL $MK_RAW = $MK_SUMM summary line(s) + $MK_GEN genuine marker(s)."
    if [ "$MK_GEN" -eq 0 ]; then
      echo "    SO EVERY '<<<' IN THE TREE IS FORMATTING. 'grep -c <<<' over an all-log returns that"
      echo "    log's RED SECTION COUNT and never a marker count - it has no true component at all,"
      echo "    which is strictly worse than the FAIL case, where the raw count at least over-reports"
      echo "    a real number. USE: grep '<<<' <log> | grep -vE '^ {4}[^ ]+: RED \(' | wc -l"
      echo "    THE SUITE'S OWN VERDICT IS UNAFFECTED: gates/gates.sh:340 counts marks from the"
      echo "    PER-GATE log, not from the all-log, so no build was reddened or greened by this."
    fi
  fi
  echo

  rm -f "$TBL" "$BA"
  echo "red-count: $PASSN PASS / $FAILN FAIL"
  return "$RED"
}

# ── THE SELFTEST ────────────────────────────────────────────────────────────────────────────────
# Every detector is shown BOTH firing and silent on a tree built here, because a detector only seen
# silent is indistinguishable from one that cannot fire.
selftest() {
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  mk() { mkdir -p "$T/claude/agents/gatelogs" "$T/claude/agents/controls" "$T/gates/regress"; }

  mk
  # a replay-free log: 3 distinct reds, no sections. raw 3, dedup 3, token 1 (all start "the").
  printf 'PASS a\nFAIL the first thing\nFAIL the second thing\nFAIL the third thing\n' \
    > "$T/claude/agents/gatelogs/a-noreplay.log"
  # a replayed log: 2 distinct reds printed twice inside 4 sections. raw 4, dedup 2.
  { printf '=== one ===\n=== two ===\n=== three ===\n=== four ===\n'
    printf 'FAIL alpha fails\nFAIL beta fails\nFAIL alpha fails\nFAIL beta fails\n'; } \
    > "$T/claude/agents/gatelogs/b-replayed.log"

  O="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC=$?
  ck "C1 a clean tree exits 0" "0" "$RC"
  ck "C2 both logs are counted" "1" "$(printf '%s' "$O" | grep -c '2 log(s) with at least one red')"
  ck "C3 the replayed log's dedup is 2 against a raw of 4" "1" \
    "$(printf '%s' "$O" | grep -c 'b-replayed.log *4 *2')"
  ck "C4 the replay-free log's dedup equals its raw" "1" \
    "$(printf '%s' "$O" | grep -c 'a-noreplay.log *3 *3')"
  # C5 WAS WRONG IN ITS FIRST DRAFT AND THE DETECTOR WAS RIGHT, kept rather than quietly corrected.
  # It expected "2 of 2". On b-replayed.log the token recipe happens to be CORRECT - its two reds
  # begin "alpha" and "beta", which are distinct tokens - so the true reading is 1 of 2, and the
  # coincidence is exactly the one that made this recipe into general advice in the first place
  # (#477 measured it on a log whose tokens were real ids). A fixture that agreed with the first
  # draft would have hidden that.
  ck "C5 the token recipe is reported wrong on exactly the one log it is wrong on" "1" \
    "$(printf '%s' "$O" | grep -c 'TOKEN disagrees with DEDUP on 1 of 2')"
  ck "C5b and the log where it is right is not counted against it" "1" \
    "$(printf '%s' "$O" | grep -c 'b-replayed.log *4 *2 *2')"
  ck "C6 the worst under-report is named with its log" "1" \
    "$(printf '%s' "$O" | grep -c 'WORST TOKEN UNDER-REPORT: 2 red(s) lost on a-noreplay.log')"
  ck "C7 the exactness invariant passes and says over how many logs" "1" \
    "$(printf '%s' "$O" | grep -c '1 replay-free log(s) checked, 0 where dedup differs')"

  # C8/C8b THE EXACTNESS DETECTOR, FIRING. Two genuinely distinct failures with byte-identical text
  # in a 0-section log is the one shape that makes dedup unsound, and it is planted rather than
  # argued. The invariant must refuse it.
  printf 'FAIL the same words\nFAIL the same words\n' > "$T/claude/agents/gatelogs/c-identical.log"
  O2="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC2=$?
  ck "C8 a replay-free log whose dedup differs from raw refuses" "1" "$RC2"
  ck "C8b and it names the log and both readings" "1" \
    "$(printf '%s' "$O2" | grep -c 'DEDUP IS NOT EXACT: claude/agents/gatelogs/c-identical.log has 0 sections, raw 2, dedup 1')"
  rm -f "$T/claude/agents/gatelogs/c-identical.log"

  # C9/C9b/C9c THE WITHDRAWN-RECIPE RATCHET, firing, silent on an exempt site, and silent at ceiling.
  printf 'count reds with grep -o "^FAIL [A-Za-z0-9]*" | sort -u | wc -l\n' > "$T/gates/regress/ADVICE.md"
  O3="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC3=$?
  ck "C9 a new site carrying the withdrawn recipe refuses" "1" "$RC3"
  ck "C9b it is named as carrying it as advice" "1" \
    "$(printf '%s' "$O3" | grep -c 'CARRIES IT AS ADVICE: gates/regress/ADVICE.md:1')"
  printf '\nThis recipe is withdrawn.\n' >> "$T/gates/regress/ADVICE.md"
  O4="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC4=$?
  ck "C9c a site that withdraws it in the same file is exempt and the tree is green again" "0" "$RC4"
  ck "C9d and the exemption is named rather than silent" "1" \
    "$(printf '%s' "$O4" | grep -c 'EXEMPT (withdrawn within 12 lines of the occurrence): gates/regress/ADVICE.md:1')"
  # C9e THE WINDOW IS THE WHOLE FIX, so it is controlled at the boundary rather than asserted. The
  # same withdrawal 30 lines away does NOT exempt the site - which is the real tree's HANDOFF.md and
  # RUN-LOG.md shape, reproduced here instead of described.
  { printf 'count reds with grep -o "^FAIL [A-Za-z0-9]*" | sort -u | wc -l\n'
    for i in $(seq 1 30); do printf 'filler line %s\n' "$i"; done
    printf 'That recipe is withdrawn.\n'; } > "$T/gates/regress/ADVICE.md"
  O4b="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC4b=$?
  ck "C9e a withdrawal 31 lines away does not exempt the site" "1" "$RC4b"
  ck "C9f and the site is still named as advice" "1" \
    "$(printf '%s' "$O4b" | grep -c 'CARRIES IT AS ADVICE: gates/regress/ADVICE.md:1')"
  rm -f "$T/gates/regress/ADVICE.md"

  # C10 THE VACUITY REFUSAL. A tree with no red at all must exit 2, not 0: this script's green has
  # to mean "measured and clean" and never "found nothing to measure".
  T2="$(mktemp -d)"; mkdir -p "$T2/claude/agents/gatelogs"
  printf 'PASS a\nPASS b\n' > "$T2/claude/agents/gatelogs/green.log"
  O5="$(CT_ROOT="$T2" bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC5=$?
  ck "C10 a tree with no red exits 2, not 0" "2" "$RC5"
  ck "C10b and says so rather than printing a clean report" "1" \
    "$(printf '%s' "$O5" | grep -c 'REFUSED: no gatelog with a red was found')"
  rm -rf "$T2"

  # C11/C11b THE BACK-AUDIT DETECTOR, firing on a document that publishes the raw count where dedup
  # is lower, and silent once the same document publishes the sound one.
  printf 'The b-replayed.log run had 4 FAIL.\n' > "$T/claude/agents/REPORT.md"
  O6="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"
  ck "C11 a document publishing the raw count is named with the size of the over-report" "1" \
    "$(printf '%s' "$O6" | grep -c 'OVER-REPORTS BY 2: claude/agents/REPORT.md publishes 4 for b-replayed.log')"
  printf 'Corrected: 2 red.\n' > "$T/claude/agents/REPORT.md"
  O7="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"
  ck "C11b silent once that document publishes the deduplicated count" "0" \
    "$(printf '%s' "$O7" | grep -c 'OVER-REPORTS BY')"
  ck "C11c and an over-report is still not a red" "1" \
    "$(printf '%s' "$O6" | grep -c '1 published figure(s) equal to the RAW line count')"
  # C11d THE WINDOW IS CONTROLLED AT ITS BOUNDARY, because the whole-document form produced three
  # false hits on the real tree. A document that names the log and carries an unrelated red figure
  # far away from it must NOT be flagged.
  { printf 'An unrelated run had 4 FAIL.\n'
    for i in $(seq 1 40); do printf 'filler %s %s %s %s %s %s %s %s\n' "$i" x y z w v u t; done
    printf 'See b-replayed.log for the detail.\n'; } > "$T/claude/agents/REPORT.md"
  O8="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"
  ck "C11d a red figure far from the citation is not attributed to that log" "0" \
    "$(printf '%s' "$O8" | grep -c 'OVER-REPORTS BY')"
  ck "C11e and the citation is still examined rather than skipped" "1" \
    "$(printf '%s' "$O8" | grep -c 'citation pair(s) examined')"
  rm -f "$T/claude/agents/REPORT.md"

  # ── C12 to C14: SECTIONS (5) AND (6). ADDED 2026-10-10 by process-build lane 3.
  # Every new detector is shown BOTH firing and silent on a tree built here, because a detector only
  # ever seen silent is indistinguishable from one that cannot fire.

  # C12 THE CAP DERIVATION, SILENT then FIRING. The fixture tree needs its own gates/gates.sh,
  # because section (5) reads the cap out of $ROOT and not out of the repository this script lives in.
  mkdir -p "$T/gates"
  printf 'x\n  grep "^FAIL" "$log" | head -5 | tee -a "$ALL"\n' > "$T/gates/gates.sh"
  O9="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC9=$?
  # C12 ASSERTS THE DERIVATION'S OWN LINES AND NOT THE EXIT CODE, and its first draft asserted
  # rc 0 and FAILED - correctly, and the detector was right. At this point in the selftest the
  # fixture still holds b-replayed.log, which over-reports by 2 with ZERO red summary lines, so
  # section (5)'s BOUND arm fires and the tree is rc 1 for a reason that has nothing to do with the
  # cap. Kept rather than quietly repaired: an exit code is the conjunction of every arm, so a
  # control on one arm must read that arm's line. C13 below is the control for the bound.
  ck "C12 a tree whose cap is 5 derives it as a literal" "1" \
    "$(printf '%s' "$O9" | grep -c "PASS (5) every replay cap is a literal")"
  ck "C12b and the derived cap is reported as one value" "1" \
    "$(printf '%s' "$O9" | grep -c 'PASS (5) the cap is one value across every replay site')"
  printf 'x\n  grep "^FAIL" "$log" | head -9 | tee -a "$ALL"\n' > "$T/gates/gates.sh"
  O10="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC10=$?
  ck "C12c a cap that MOVED refuses" "1" "$RC10"
  ck "C12d and names both the derived value and the recorded one" "1" \
    "$(printf '%s' "$O10" | grep -c 'derived \[9\] against the recorded 5')"
  # C12e A CAP TAKEN FROM A VARIABLE is the thing the notChecked item asked about - a replay that
  # varies with the section's own FAIL count - and it must refuse rather than read as a literal.
  printf 'x\n  grep "^FAIL" "$log" | head -$fails | tee -a "$ALL"\n' > "$T/gates/gates.sh"
  O11="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC11=$?
  ck "C12e a cap derived from a variable refuses" "1" "$RC11"
  ck "C12f and says the cap is not a literal" "1" \
    "$(printf '%s' "$O11" | grep -c 'FAIL (5) every replay cap is a literal')"
  # C12g NO REPLAY SITE AT ALL must refuse too, and must not read as a clean derivation: the
  # mechanism being gone is a bigger finding than the cap having changed, not a smaller one.
  printf 'x\n' > "$T/gates/gates.sh"
  O12="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC12=$?
  ck "C12g a tree with no replay site refuses" "1" "$RC12"
  ck "C12h and says it measured nothing rather than passing" "1" \
    "$(printf '%s' "$O12" | grep -c 'FAIL (5) the replay site is locatable in gates.sh')"
  printf 'x\n  grep "^FAIL" "$log" | head -5 | tee -a "$ALL"\n' > "$T/gates/gates.sh"

  # C13 THE BOUND. b-replayed.log has 4 sections but ZERO red summary lines, so its bound is 5 x 0 = 0
  # while its over-report is 2 - which must FIRE. That is not a contrived fixture: it is what a
  # hand-assembled or subset log looks like, and it is the shape that proves the bound is computed
  # from RED SECTIONS and not from section headers.
  O13="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC13=$?
  ck "C13 an over-report with no red summary line exceeds the bound and refuses" "1" "$RC13"
  ck "C13b and the bound is shown as cap x red sections" "1" \
    "$(printf '%s' "$O13" | grep -c 'against 5 x 0 red section(s) = 0')"
  # C13c SILENT once the log carries the summary line that explains its own replay.
  printf '    somegate: RED (exit 1, 2 FAIL lines, 0 <<<)\n' >> "$T/claude/agents/gatelogs/b-replayed.log"
  O14="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"; RC14=$?
  ck "C13c silent once one red section accounts for the replay" "0" "$RC14"
  ck "C13d and the most-red-sections figure is published, not assumed" "1" \
    "$(printf '%s' "$O14" | grep -c 'MOST RED SECTIONS IN ANY ONE LOG: 1')"

  # C14 THE MARKER SECTION. The line added for C13c is a real gates.sh summary line and carries the
  # literal '<<<', so it is also section (6)'s whole population: raw 1, summary 1, genuine 0.
  ck "C14 a summary line is attributed to formatting and not to a marker" "1" \
    "$(printf '%s' "$O14" | grep -c 'RAW TOTAL 1 = 1 summary line(s) + 0 genuine marker(s)')"
  ck "C14b and the conclusion is stated rather than left to the reader" "1" \
    "$(printf '%s' "$O14" | grep -c 'SO EVERY .<<<. IN THE TREE IS FORMATTING')"
  # C14c A GENUINE MARKER, which no committed log has ever held, must be separated from the
  # formatting rather than added to it. Without this arm section (6) has only ever seen one answer.
  printf 'FAIL something <<< a real marker\n' >> "$T/claude/agents/gatelogs/b-replayed.log"
  O15="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"
  ck "C14c a genuine marker is counted apart from the summary lines" "1" \
    "$(printf '%s' "$O15" | grep -c 'RAW TOTAL 2 = 1 summary line(s) + 1 genuine marker(s)')"
  ck "C14d and it is named as the first unexercised case" "1" \
    "$(printf '%s' "$O15" | grep -c 'GENUINE MARKER(S): b-replayed.log holds 1')"
  ck "C14e and the formatting-only conclusion is NOT printed when a real marker exists" "0" \
    "$(printf '%s' "$O15" | grep -c 'SO EVERY .<<<. IN THE TREE IS FORMATTING')"
  # C14f THE VACUITY GUARD on section (6): a tree with reds but no '<<<' at all must say it measured
  # nothing rather than print a pass, which is this script's own standing rule applied to a new arm.
  printf 'FAIL only one red here\n' > "$T/claude/agents/gatelogs/b-replayed.log"
  O17="$(CT_ROOT="$T" CT_TOKEN_CEIL=0 bash "$ROOT/gates/audit/red-count.sh" 2>&1)"
  ck "C14f no '<<<' anywhere reads as MEASURED NOTHING, not as a pass" "1" \
    "$(printf '%s' "$O17" | grep -c 'MEASURED NOTHING on this section: no log under')"

  echo "red-count --selftest: $PASSN pass / $FAILN fail"
  [ "$FAILN" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  *) report; exit $? ;;
esac
