#!/usr/bin/env bash
# gates/audit/selector-provenance.sh
# ─────────────────────────────────────────────────────────────────────────────────────────────────
# WHAT THIS GUARDS, and which case it implements.
#
#   US-INV-07  (new)  "A gate that goes green must have been able to go red on the build it is
#                      guarding against."
#   TC-INV-08a/b/c    (new) in claude/stories/TEST-CASES.md
#
# THE DEFECT CLASS, in CLAUDE.md's own words (the "#432" bullet, the SIXTH costume of the trap that
# file records seven times):
#
#     "AN ASSERTION KEYED TO A HOOK YOUR OWN BUILD ADDS CANNOT BE CONTROLLED, AND ITS CONTROL WILL
#      LOOK LIKE IT WORKED. ... A check that reads only what the fix added cannot see the defect the
#      fix removes. ... The sweep for other instances - every data-ct-keyed assertion whose attribute
#      and assertion arrived in one build, found with git log -S and no browser - is
#      jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29,
#      and it is UNCOUNTED, which is the honest state of it."
#
# This file is that sweep, as a command rather than as a number, because a number published in a
# document goes stale the next time a build adds a selector and nothing re-derives it (this project's
# own `gates-without-a-negative-control` flag is the worked example: closed at "ALL 19 SUITES" and
# read as "none" for nine gates after).
#
# WHY THERE IS NO BROWSER HERE. The input axis is (gate file, selector) pairs in committed history,
# not geometries. A seven-geometry loop would report 7x the inputs and measure one. Same reasoning as
# gates/regress/62-*, and it is what makes this cheap enough to run on every build.
#
# WHAT IT CANNOT SEE, stated here rather than discovered later:
#   (a) A commit whose subject carries no "#NNN" cannot be mapped to a build. Those pairs are counted
#       and reported as UNKNOWN and are NEVER folded into the same-build count. A missing denominator
#       is reported, never credited (CLAUDE.md).
#   (b) Granularity is (file, selector), not (file, assertion). One selector read by four L.say lines
#       in one file is one row here. The row therefore says a selector is uncontrollable; it does not
#       say how many assertions ride on it.
#   (c) NAV-ONLY vs ASSERTED is decided mechanically (see classify() below) and is deliberately
#       CONSERVATIVE: a selector counts as ASSERTED unless every one of its occurrences is inside a
#       tapCt() or a .waitFor() on the same line. So ASSERTED is an UPPER bound on the dangerous class.
#       A tap on a missing selector throws and reddens loudly; an assertion that READS a missing
#       selector is the one that can pass.
#   (d) Dynamic selectors - chess.jsx emits data-ct={'look-pc-'+pv} and two siblings - carry no
#       literal, so neither side of the join can see them. Counted and named as DYNAMIC-SKIPPED.
#   (e) First appearance is first appearance on THIS history. A selector that arrived, was removed and
#       came back reads as its first arrival. Counted as REINTRODUCED where the walk sees it twice.
#
# USAGE
#   gates/audit/selector-provenance.sh                 report + exit status against G_SPCEIL
#   gates/audit/selector-provenance.sh --selftest      both-direction controls, no repo state touched
#   G_SPCEIL=<n>                                       ratchet: fail if same-build pairs exceed n
# ─────────────────────────────────────────────────────────────────────────────────────────────────
set -uo pipefail

G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$(dirname "$G")")"
[ -d "$ROOT/.git" ] || { echo "selector-provenance: no .git at $ROOT - this tool reads committed history and cannot run on an export"; exit 3; }
cd "$ROOT" || exit 3

# A SHALLOW CLONE CANNOT ANSWER THIS QUESTION AND MUST SAY SO RATHER THAN RETURN A SMALL NUMBER.
if [ -f .git/shallow ]; then
  echo "selector-provenance: REFUSING - this is a SHALLOW clone. Every selector would read as"
  echo "  'introduced' in the oldest commit present, so every pair would read SAME-BUILD or UNKNOWN."
  echo "  Re-run in a full clone. (prompts/test-authoring step 4 prescribes --depth 1; that is the"
  echo "  disagreement filed as part of this tool's job.)"
  exit 3
fi

NAMES_RE='[A-Za-z0-9_:-]\+'
# the two literal forms a gate uses to name a selector
gate_names(){ # $1 = file
  { grep -o "data-ct=\"$NAMES_RE\"" "$1" 2>/dev/null | sed 's/data-ct="//;s/"$//'
    grep -o "tapCt('$NAMES_RE'" "$1" 2>/dev/null | sed "s/tapCt('//;s/'$//"
  } | sort -u
}
# the literal forms chess.jsx uses to EMIT one
app_names_at(){ # $1 = sha ; prints the literal data-ct names present in chess.jsx at that sha
  git show "$1:chess.jsx" 2>/dev/null \
    | grep -o "data-ct=\"$NAMES_RE\"\|\"data-ct\":\"$NAMES_RE\"" \
    | sed 's/.*"\(.*\)"$/\1/;s/data-ct="//;s/"$//' | sort -u
}
buildof(){ git log -1 --format=%s "$1" 2>/dev/null | grep -o '#[0-9]\{1,4\}' | head -1; }

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# ── THE CONTROLS, AS A COMMAND RATHER THAN A PARAGRAPH (the convention gatemanifest.sh selftest and
#    gates/audit/story-join.sh --selftest already set here). FIVE CONTROLS IN BOTH DIRECTIONS: two
#    things that MUST be reported and three that MUST NOT, because a sweep that only proves it can
#    find something has not shown it can decline, and this tool's whole subject is checks that
#    cannot decline. Each plants its own history in a throwaway clone; the repository is untouched.
#    ~2 minutes, so it is opt-in and the default run stays ~20s.
if [ "${1:-}" = "--selftest" ]; then
  C="$WORK/clone"; git clone -q --no-hardlinks "$ROOT" "$C" || { echo "selftest: clone failed"; exit 3; }
  SELF="$G/selector-provenance.sh"
  cd "$C" || exit 3; git config user.email selftest@local; git config user.name selftest
  mkdir -p gates/audit; cp "$SELF" gates/audit/
  BASE="$(git rev-parse HEAD)"
  same_count(){ bash gates/audit/selector-provenance.sh | awk '/^  SAME-BUILD/{print $2}'; }
  plant_attr(){ awk -v n="$1" 'BEGIN{d=0}{if(!d && index($0,"data-ct=\"pz-bottom\"")>0){sub(/data-ct="pz-bottom"/,"data-ct=\"" n "\"");d=1}print}' chess.jsx > .t && mv .t chess.jsx; }
  plant_assert(){ awk -v n="$1" 'BEGIN{d=0}{print; if(!d && index($0,"const hm=await b.rect")>0){print "    const _c=await b.rect(\x27[data-ct=\"" n "\"]\x27);L.say(!!_c,\x27selftest control\x27);";d=1}}' gates/regress/30-p1-fixes.js > .t && mv .t gates/regress/30-p1-fixes.js; }
  reset_tree(){ git reset -q --hard "$BASE"; git clean -qfd; mkdir -p gates/audit; cp "$SELF" gates/audit/; }
  P=0; F=0
  ck(){ if [ "$2" = "$3" ]; then P=$((P+1)); echo "  PASS  $1  ($2)"; else F=$((F+1)); echo "  FAIL  $1  got [$2] want [$3]"; fi; }

  echo "selector-provenance --selftest  over $ROOT at $(echo "$BASE" | cut -c1-8)"
  B0="$(same_count)"; echo "  TC-INV-08 baseline same-build count: $B0"
  [ -n "$B0" ] || { echo "  FAIL  the baseline run produced no count at all - every control below would compare two blanks and PASS"; exit 1; }

  # C1, MUST BE REPORTED: the hook and the assertion that reads it, in one commit. The #432 shape.
  reset_tree; plant_attr sp-ctl-one; plant_assert sp-ctl-one
  git commit -qam "#9991: control one - a hook and the assertion that reads it, in one commit"
  ck "C1 a same-commit pair is REPORTED as SAME-BUILD" "$(bash gates/audit/selector-provenance.sh | grep -c 'sp-ctl-one .*SAME-BUILD')" "1"
  ck "C1 raises the count by exactly one" "$(same_count)" "$((B0+1))"

  # C2, MUST NOT BE REPORTED: the hook arrives one build earlier. The normal, healthy case - and a
  # sweep that flagged it would cry wolf on 171 of 220 pairs, which is how an alarm gets ignored.
  reset_tree; plant_attr sp-ctl-two; git commit -qam "#9992: control two - the hook arrives alone"
  plant_assert sp-ctl-two; git commit -qam "#9993: control two - the assertion, one build later"
  ck "C2 a different-build pair is NOT reported" "$(bash gates/audit/selector-provenance.sh | grep -c 'sp-ctl-two .*SAME-BUILD')" "0"
  ck "C2 leaves the count unmoved" "$(same_count)" "$B0"

  # C3, MUST NOT BE CREDITED: one side's commit subject carries no #NNN. A missing denominator is
  # reported, never credited (CLAUDE.md), so this reads UNKNOWN and must not inflate the count.
  reset_tree; plant_attr sp-ctl-three; git commit -qam "control three - a subject with no build number in it"
  plant_assert sp-ctl-three; git commit -qam "#9994: control three - the assertion"
  ck "C3 an unmappable commit does NOT read as same-build" "$(bash gates/audit/selector-provenance.sh | grep -c 'sp-ctl-three .*SAME-BUILD')" "0"
  ck "C3 leaves the count unmoved" "$(same_count)" "$B0"

  # C4, THE RATCHET ITSELF. Without this the tool is a report nothing reads, which is leakage class 3
  # wearing a tool's clothes.
  reset_tree; plant_attr sp-ctl-four; plant_assert sp-ctl-four
  git commit -qam "#9995: control four - the ratchet"
  G_SPCEIL="$B0" bash gates/audit/selector-provenance.sh >/dev/null 2>&1
  ck "C4 a ceiling at the baseline REFUSES a new same-build pair" "$?" "1"
  reset_tree
  G_SPCEIL="$B0" bash gates/audit/selector-provenance.sh >/dev/null 2>&1
  ck "C4 the same ceiling ACCEPTS the unmodified tree" "$?" "0"

  # C5, AND IT IS THE ONE THAT MATTERS MOST, because it is the failure this lane's OWN PROCEDURE would
  # have produced: prompts/test-authoring step 4 prescribes `git clone --depth 1`, and in a shallow
  # clone every selector looks introduced in the oldest commit present - so a shallow run would
  # publish a small, wrong number with total confidence instead of refusing.
  SH="$WORK/shallow"; rm -rf "$SH"; git clone -q --depth 1 "file://$C" "$SH" 2>/dev/null
  mkdir -p "$SH/gates/audit"; cp "$SELF" "$SH/gates/audit/"
  ( cd "$SH" && bash gates/audit/selector-provenance.sh >/dev/null 2>&1 )
  ck "C5 a shallow clone is REFUSED, not answered" "$?" "3"

  echo "  ---- $P pass / $F fail"
  [ "$F" = 0 ] || exit 1
  exit 0
fi


# ── 1. FIRST APPEARANCE OF EVERY SELECTOR IN chess.jsx, by walking its own history once. ──────────
# One pass over the 362 commits that touch chess.jsx, rather than one `git log -S` per selector,
# which is the same answer in a fraction of the time and - the part that matters - gives the answer
# for selectors nobody has asked about yet, so the sweep does not depend on its own input list.
: > "$WORK/app-first"
prev=""
for sha in $(git log --reverse --format=%H -- chess.jsx); do
  app_names_at "$sha" > "$WORK/now"
  if [ -z "$prev" ]; then cp "$WORK/now" "$WORK/seen"; awk -v s="$sha" '{print $1"\t"s}' "$WORK/now" >> "$WORK/app-first"
  else comm -23 "$WORK/now" "$WORK/seen" | awk -v s="$sha" '{print $1"\t"s}' >> "$WORK/app-first"
       sort -u "$WORK/now" "$WORK/seen" -o "$WORK/seen"
  fi
  prev=1
done
sort -u "$WORK/app-first" -o "$WORK/app-first"

# ── 2. FIRST APPEARANCE OF EVERY SELECTOR IN EACH GATE FILE, same single-pass shape, with --follow
#       so a renumbered gate keeps its history (this project renumbers gates: 55 -> 56 -> 57 on
#       2026-09-28 alone). ────────────────────────────────────────────────────────────────────────
: > "$WORK/pairs"
DYN=0
for f in gates/regress/*.js; do
  [ -e "$f" ] || continue
  : > "$WORK/gseen"
  : > "$WORK/gfirst"
  for sha in $(git log --reverse --follow --format=%H -- "$f"); do
    p="$(git log -1 --format=%H --name-only --diff-filter=ad "$sha" >/dev/null 2>&1; echo "$f")"
    git show "$sha:$p" > "$WORK/blob" 2>/dev/null || continue
    gate_names "$WORK/blob" > "$WORK/gnow"
    comm -23 "$WORK/gnow" "$WORK/gseen" | awk -v s="$sha" '{print $1"\t"s}' >> "$WORK/gfirst"
    sort -u "$WORK/gnow" "$WORK/gseen" -o "$WORK/gseen"
  done
  sort -u "$WORK/gfirst" -o "$WORK/gfirst"
  # classify + join, for the selectors the file uses AT HEAD (a selector it no longer uses is not
  # a live assertion and is not this job's class)
  while read -r n; do
    [ -n "$n" ] || continue
    gsha="$(awk -F'\t' -v k="$n" '$1==k{print $2; exit}' "$WORK/gfirst")"
    asha="$(awk -F'\t' -v k="$n" '$1==k{print $2; exit}' "$WORK/app-first")"
    if [ -z "$asha" ]; then DYN=$((DYN+1)); printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$f" "$n" "-" "-" "${gsha:--}" "$(buildof "${gsha:-HEAD}")" "NO-APP-LITERAL" >> "$WORK/pairs"; continue; fi
    ab="$(buildof "$asha")"; gb="$(buildof "$gsha")"
    kind=ASSERTED
    if ! grep -q "data-ct=\"$n\"" "$f" && grep -q "tapCt('$n'" "$f"; then kind=NAV-ONLY; fi
    if grep -q "data-ct=\"$n\"" "$f"; then
      tot=$(grep -c "data-ct=\"$n\"" "$f"); nav=$(grep -c "data-ct=\"$n\"\].*waitFor(" "$f")
      [ "$tot" = "$nav" ] && kind=NAV-ONLY
    fi
    if [ -z "$ab" ] || [ -z "$gb" ]; then v=UNKNOWN
    elif [ "$ab" = "$gb" ];            then v=SAME-BUILD
    else                                    v=DIFFERENT; fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$f" "$n" "$asha" "${ab:--}" "$gsha" "${gb:--}" "$v:$kind" >> "$WORK/pairs"
  done < <(gate_names "$f")
done

SAME=$(awk -F'\t' '$7 ~ /^SAME-BUILD/' "$WORK/pairs" | wc -l | tr -d ' ')
SAME_A=$(awk -F'\t' '$7=="SAME-BUILD:ASSERTED"' "$WORK/pairs" | wc -l | tr -d ' ')
SAME_N=$(awk -F'\t' '$7=="SAME-BUILD:NAV-ONLY"' "$WORK/pairs" | wc -l | tr -d ' ')
DIFF=$(awk -F'\t' '$7 ~ /^DIFFERENT/' "$WORK/pairs" | wc -l | tr -d ' ')
UNK=$(awk -F'\t' '$7 ~ /^UNKNOWN/' "$WORK/pairs" | wc -l | tr -d ' ')
NOLIT=$(awk -F'\t' '$7=="NO-APP-LITERAL"' "$WORK/pairs" | wc -l | tr -d ' ')
TOT=$(wc -l < "$WORK/pairs" | tr -d ' ')

echo "selector-provenance  sweep over $(ls gates/regress/*.js | wc -l | tr -d ' ') gate files at $(git rev-parse --short HEAD) ($(buildof HEAD))"
echo "POPULATION  $TOT (gate file, selector) pairs live at HEAD"
echo "  SAME-BUILD  $SAME   ($SAME_A asserted / read, $SAME_N navigation-only)"
echo "  DIFFERENT   $DIFF"
echo "  UNKNOWN     $UNK    (a commit on one side carries no #NNN; never counted as same-build)"
echo "  NO-APP-LITERAL $NOLIT (the gate names a selector chess.jsx never emits as a literal: dynamic, or dead)"
echo
if [ "$SAME" -gt 0 ]; then
  echo "THE SAME-BUILD PAIRS - each one an assertion that could not have gone red on the bundle it was written against:"
  awk -F'\t' '$7 ~ /^SAME-BUILD/{printf "  %-44s %-26s build %-6s app %.8s  gate %.8s  %s\n",$1,$2,$4,$3,$5,$7}' "$WORK/pairs" | sort
  echo
fi
if [ "$NOLIT" -gt 0 ]; then
  echo "NO-APP-LITERAL (reported, not asserted - a selector with no literal in chess.jsx cannot be joined from either side):"
  awk -F'\t' '$7=="NO-APP-LITERAL"{printf "  %-44s %s\n",$1,$2}' "$WORK/pairs" | sort
  echo
fi
cp "$WORK/pairs" "${CT_SP_OUT:-/dev/null}" 2>/dev/null || true

CEIL="${G_SPCEIL:-}"
if [ -z "$CEIL" ]; then
  echo "NO CEILING SET (G_SPCEIL unset) - this run REPORTS and asserts nothing. Set G_SPCEIL to the"
  echo "measured count to make a new same-build pair a RED rather than a line in a log."
  exit 0
fi
if [ "$SAME" -gt "$CEIL" ]; then
  echo "FAIL  same-build pairs $SAME EXCEED the ceiling $CEIL - a build has added an assertion keyed to a"
  echo "      selector it introduced in the same commit range. Name it above, or lower the assertion onto"
  echo "      what the element SAYS rather than onto the hook the fix drilled (CLAUDE.md, #432)."
  exit 1
fi
if [ "$SAME" -lt "$CEIL" ]; then
  echo "CEILING CAN BE LOWERED: $SAME of $CEIL. Set G_SPCEIL=$SAME."
fi
echo "PASS  same-build pairs $SAME within ceiling $CEIL"
exit 0
