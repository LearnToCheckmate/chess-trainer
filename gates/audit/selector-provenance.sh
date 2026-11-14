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
#   G_SPCEIL=<n>                                       ratchet: fail if UNOPENED same-build pairs exceed n
#
# MARKING A PAIR OPENED (#550, test-system round 4). A same-build pair stays in the SAME-BUILD count for ever - the
# history does not change when a gate is repaired - so before this the count could only RISE, and the work of opening a
# pair (re-keying its absence line onto words, or reading it and finding no line that can pass on a missing hook) left no
# trace the census could read. A gate now records it beside the code, one line per hook:
#
#     // SELECTOR-OPENED: <hook> control=<sha> <what the control did>
#     // SELECTOR-OPENED: <hook> reading=<class> <why no line can pass when the hook is missing>
#
#   control=<sha>  CREDITED ONLY IF the same file carries a `CONTROL-RECORD: <sha>` line for that sha (either may be the
#                  shorter prefix), so the mark points at a recorded control run and cannot cite one that never happened.
#   reading=<class> a lowercase word (presence, fallback, comment, precondition, detail, nav ...) and a non-empty reason.
#   Never credited: no reason text, an unknown kind, a control sha the file records no control for, or a hook the file
#   does not name (a STRAY mark). Uncredited marks are LISTED, with the reason, never silently dropped. A mark on a pair
#   that is not same-build is reported as UNUSED and changes nothing.
#   The mark's own text must not contain a data-ct="..." or tapCt('...') literal: the sweep reads those as selectors.
#   The ceiling (G_SPCEIL) is on the UNOPENED count, which is the one that can now fall.
# ─────────────────────────────────────────────────────────────────────────────────────────────────
set -uo pipefail

G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$(dirname "$G")")"
# -e, not -d (#550): in a git WORKTREE .git is a FILE (a "gitdir:" pointer), so the -d test refused every worktree run - the
# job's own outcome.sweepOnHead recorded the refusal. What this line exists to refuse is an EXPORT with no history, so after
# the cheap path test it asks git itself.
[ -e "$ROOT/.git" ] || { echo "selector-provenance: no .git at $ROOT - this tool reads committed history and cannot run on an export"; exit 3; }
cd "$ROOT" || exit 3
git rev-parse --git-dir >/dev/null 2>&1 || { echo "selector-provenance: $ROOT/.git is not a usable repository - this tool reads committed history"; exit 3; }

# A SHALLOW CLONE CANNOT ANSWER THIS QUESTION AND MUST SAY SO RATHER THAN RETURN A SMALL NUMBER.
# Asked of git, not of the path .git/shallow (#550): in a worktree that path does not exist - the shallow file lives in the
# common git dir - so the path test would ANSWER a shallow worktree instead of refusing it. Anything but "false" refuses.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" != "false" ]; then
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
# opened_marks FILE: one row per SELECTOR-OPENED mark, "hook<TAB>verdict<TAB>detail", where verdict is control, reading,
# or NOCREDIT:<reason>. The selftest's C11 stubs THIS function out to show the arms that credit a mark go red without it.
opened_marks(){ # $1 = gate file at HEAD
  sed -n 's#^[[:space:]]*//[[:space:]]*SELECTOR-OPENED:[[:space:]]*##p' "$1" 2>/dev/null | while read -r hk kd rest; do
    [ -n "$hk" ] || continue
    if [ -z "$rest" ]; then printf '%s\tNOCREDIT:no-reason\t%s\n' "$hk" "$kd"; continue; fi
    case "$kd" in
      control=*) cs="${kd#control=}"
        if ! printf '%s' "$cs" | grep -qx '[0-9a-f]\{7,40\}'; then printf '%s\tNOCREDIT:bad-sha\t%s\n' "$hk" "$kd"; continue; fi
        ok=0
        while read -r rs; do case "$rs" in "$cs"*) ok=1;; esac; case "$cs" in "$rs"*) ok=1;; esac
        done < <(sed -n 's#^[[:space:]]*//[[:space:]]*CONTROL-RECORD:[[:space:]]*\([0-9a-f]\{7,40\}\).*#\1#p' "$1")
        if [ "$ok" = 1 ]; then printf '%s\tcontrol\t%s\n' "$hk" "$cs"; else printf '%s\tNOCREDIT:no-control-record-for-%s\t%s\n' "$hk" "$cs" "$kd"; fi;;
      reading=*) rc="${kd#reading=}"
        if printf '%s' "$rc" | grep -qx '[a-z][a-z-]*'; then printf '%s\treading\t%s\n' "$hk" "$rc"; else printf '%s\tNOCREDIT:bad-class\t%s\n' "$hk" "$kd"; fi;;
      *) printf '%s\tNOCREDIT:unknown-kind\t%s\n' "$hk" "$kd";;
    esac
  done
}

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
  # one sweep, two readings (same-build, unopened) and the whole report in $WORK/rep - each sweep costs about 90s
  sweep3(){ bash "${1:-gates/audit/selector-provenance.sh}" > "$WORK/rep" 2>&1; awk '/^  SAME-BUILD/{s=$2} /^    UNOPENED/{u=$2} END{print s, u}' "$WORK/rep"; }
  # plant_lit adds a data-ct literal as a comment line at the end of chess.jsx: app_names_at reads literals, so it is an app hook to
  # this sweep. (plant_attr renames the first pz-bottom, and chess.jsx carries only two, so it cannot plant five hooks in one tree.)
  plant_lit(){ printf '// selftest hook data-ct="%s"\n' "$1" >> chess.jsx; }
  plant_mark(){ awk -v l="$1" 'NR==1{print; print l; next}{print}' gates/regress/30-p1-fixes.js > .t && mv .t gates/regress/30-p1-fixes.js; }
  plant_attr(){ awk -v n="$1" 'BEGIN{d=0}{if(!d && index($0,"data-ct=\"pz-bottom\"")>0){sub(/data-ct="pz-bottom"/,"data-ct=\"" n "\"");d=1}print}' chess.jsx > .t && mv .t chess.jsx; }
  plant_assert(){ awk -v n="$1" 'BEGIN{d=0}{print; if(!d && index($0,"const hm=await b.rect")>0){print "    const _c=await b.rect(\x27[data-ct=\"" n "\"]\x27);L.say(!!_c,\x27selftest control\x27);";d=1}}' gates/regress/30-p1-fixes.js > .t && mv .t gates/regress/30-p1-fixes.js; }
  reset_tree(){ git reset -q --hard "$BASE"; git clean -qfd; mkdir -p gates/audit; cp "$SELF" gates/audit/; }
  P=0; F=0
  ck(){ if [ "$2" = "$3" ]; then P=$((P+1)); echo "  PASS  $1  ($2)"; else F=$((F+1)); echo "  FAIL  $1  got [$2] want [$3]"; fi; }

  echo "selector-provenance --selftest  over $ROOT at $(echo "$BASE" | cut -c1-8)"
  read -r B0 U0 < <(sweep3); echo "  TC-INV-08 baseline same-build count: $B0, unopened: $U0"
  [ -n "$B0" ] && [ -n "$U0" ] || { echo "  FAIL  the baseline run produced no count at all - every control below would compare two blanks and PASS"; exit 1; }

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
  G_SPCEIL="$U0" bash gates/audit/selector-provenance.sh >/dev/null 2>&1
  ck "C4 a ceiling at the baseline REFUSES a new (unopened) same-build pair" "$?" "1"
  reset_tree
  G_SPCEIL="$U0" bash gates/audit/selector-provenance.sh >/dev/null 2>&1
  ck "C4 the same ceiling ACCEPTS the unmodified tree" "$?" "0"

  # C5, AND IT IS THE ONE THAT MATTERS MOST, because it is the failure this lane's OWN PROCEDURE would
  # have produced: prompts/test-authoring step 4 prescribes `git clone --depth 1`, and in a shallow
  # clone every selector looks introduced in the oldest commit present - so a shallow run would
  # publish a small, wrong number with total confidence instead of refusing.
  SH="$WORK/shallow"; rm -rf "$SH"; git clone -q --depth 1 "file://$C" "$SH" 2>/dev/null
  mkdir -p "$SH/gates/audit"; cp "$SELF" "$SH/gates/audit/"
  ( cd "$SH" && bash gates/audit/selector-provenance.sh >/dev/null 2>&1 )
  ck "C5 a shallow clone is REFUSED, not answered" "$?" "3"

  # C6, A GIT WORKTREE IS ANSWERED, NOT REFUSED (#550). Its .git is a FILE (a gitdir: pointer), and the first version's
  # `[ -d .git ]` refused every worktree run with exit 3 - recorded on this tool's own job as "run from the main clone".
  WT="$WORK/wt"; git worktree add -q --detach "$WT" HEAD >/dev/null 2>&1
  mkdir -p "$WT/gates/audit"; cp "$SELF" "$WT/gates/audit/"
  ( cd "$WT" && bash gates/audit/selector-provenance.sh >/dev/null 2>&1 ); r6=$?
  ck "C6 a git worktree (.git is a file) is ANSWERED with a count, not refused" "$([ -f "$WT/.git" ] && { [ "$r6" = 0 ] || [ "$r6" = 1 ]; } && echo answered || echo "refused-or-not-a-worktree:$r6")" "answered"

  # C7-C11, THE SELECTOR-OPENED MARK (#550 round 4). One planted tree, five same-build pairs and one stray mark, read by
  # one sweep: a mark is credited ONLY in its two lawful forms (reading=<class> <reason>; control=<sha> with a
  # CONTROL-RECORD line for that sha in the same file), and every other mark is listed and not credited.
  reset_tree
  for h in sp-ctl-seven sp-ctl-eight sp-ctl-eightb sp-ctl-nine sp-ctl-nineb; do plant_lit "$h"; plant_assert "$h"; done
  plant_mark "// SELECTOR-OPENED: sp-ctl-seven reading=presence the selftest's own planted read is a presence line"
  plant_mark "// SELECTOR-OPENED: sp-ctl-eight control=deadbee a control nobody recorded"
  plant_mark "// CONTROL-RECORD: 5e1f7e5 2026-11-13 total=1 red=1 scope=selftest how=a planted record for C8b"
  plant_mark "// SELECTOR-OPENED: sp-ctl-eightb control=5e1f7e5a the record above, cited by a longer prefix"
  plant_mark "// SELECTOR-OPENED: sp-ctl-nine reading=presence"
  plant_mark "// SELECTOR-OPENED: sp-ctl-nineb verdict=fine a kind the reader does not know"
  plant_mark "// SELECTOR-OPENED: sp-ctl-ten reading=presence a hook this file never names"
  git commit -qam "#9996: controls seven to eleven - SELECTOR-OPENED marks, lawful and not"
  read -r B7 U7 < <(sweep3); cp "$WORK/rep" "$WORK/rep7"
  ck "C7 a reading= mark with a reason OPENS its pair" "$(grep -c 'sp-ctl-seven .*SAME-BUILD:ASSERTED  OPENED:reading=presence' "$WORK/rep7")" "1"
  ck "C7 the five planted pairs all count as same-build" "$B7" "$((B0+5))"
  ck "C8 a control= mark with no CONTROL-RECORD for its sha is NOT credited, and is listed" "$(grep -c 'sp-ctl-eight .*UNOPENED' "$WORK/rep7")/$(grep -c 'sp-ctl-eight .*no-control-record-for-deadbee' "$WORK/rep7")" "1/1"
  ck "C8b a control= mark whose sha the file records (prefix either way) OPENS its pair" "$(grep -c 'sp-ctl-eightb .*OPENED:control=5e1f7e5a' "$WORK/rep7")" "1"
  ck "C9 a mark with no reason is NOT credited, and is listed" "$(grep -c 'sp-ctl-nine .*UNOPENED' "$WORK/rep7")/$(grep -c 'sp-ctl-nine .*no-reason' "$WORK/rep7")" "1/1"
  ck "C9b a mark of an unknown kind is NOT credited, and is listed" "$(grep -c 'sp-ctl-nineb .*UNOPENED' "$WORK/rep7")/$(grep -c 'sp-ctl-nineb .*unknown-kind' "$WORK/rep7")" "1/1"
  ck "C10 a mark naming a hook the file does not name is listed STRAY" "$(grep -c 'sp-ctl-ten .*STRAY' "$WORK/rep7")" "1"
  ck "C7-C10 the unopened count rises by exactly the three uncredited pairs" "$U7" "$((U0+3))"
  # C11, THE CONTROL WITH THE READING REMOVED (CLAUDE.md: a control set is run once over the tree without its subject). The
  # same planted tree, swept by a copy of this script whose opened_marks() reads nothing: C7 and C8b must read UNOPENED.
  sed 's/^opened_marks(){ # \$1 = gate file at HEAD$/opened_marks(){ return 0; # STUBBED by selftest C11/' gates/audit/selector-provenance.sh > gates/audit/.sp-nomarks.sh
  ck "C11 the stub took (the mutant's opened_marks returns before reading)" "$(grep -c '^opened_marks(){ return 0;' gates/audit/.sp-nomarks.sh)" "1"
  read -r B11 U11 < <(sweep3 gates/audit/.sp-nomarks.sh)
  ck "C11 with the reading stubbed, the C7 pair reads UNOPENED (C7 would go red)" "$(grep -c 'sp-ctl-seven .*UNOPENED' "$WORK/rep")" "1"
  ck "C11 with the reading stubbed, the C8b pair reads UNOPENED (C8b would go red)" "$(grep -c 'sp-ctl-eightb .*UNOPENED' "$WORK/rep")" "1"
  ck "C11 with the reading stubbed, the unopened count is the baseline's same-build count plus all five" "$U11" "$((B0+5))"
  rm -f gates/audit/.sp-nomarks.sh

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
: > "$WORK/pairs"; : > "$WORK/badmarks"
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
  opened_marks "$f" > "$WORK/marks"
  gate_names "$f" > "$WORK/gnames"
  # a mark naming a hook the file does not name is STRAY: reported, never credited
  awk -F'\t' 'NR==FNR{n[$1]=1;next} !($1 in n){print}' "$WORK/gnames" "$WORK/marks" | while IFS=$'\t' read -r hk vd dt; do
    printf '%s\t%s\tSTRAY (the file names no such selector)\n' "$f" "$hk" >> "$WORK/badmarks"; done
  awk -F'\t' '$2 ~ /^NOCREDIT/' "$WORK/marks" | while IFS=$'\t' read -r hk vd dt; do
    printf '%s\t%s\t%s (%s)\n' "$f" "$hk" "${vd#NOCREDIT:}" "$dt" >> "$WORK/badmarks"; done
  # classify + join, for the selectors the file uses AT HEAD (a selector it no longer uses is not
  # a live assertion and is not this job's class)
  while read -r n; do
    [ -n "$n" ] || continue
    gsha="$(awk -F'\t' -v k="$n" '$1==k{print $2; exit}' "$WORK/gfirst")"
    asha="$(awk -F'\t' -v k="$n" '$1==k{print $2; exit}' "$WORK/app-first")"
    if [ -z "$asha" ]; then DYN=$((DYN+1)); printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t-\n' "$f" "$n" "-" "-" "${gsha:--}" "$(buildof "${gsha:-HEAD}")" "NO-APP-LITERAL" >> "$WORK/pairs"; continue; fi
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
    op="$(awk -F'\t' -v k="$n" '$1==k && $2!~/^NOCREDIT/{print $2"="$3; exit}' "$WORK/marks")"
    if [ "$v" = SAME-BUILD ]; then op="${op:+OPENED:$op}"; op="${op:-UNOPENED}"
    else [ -n "$op" ] && printf '%s\t%s\tUNUSED (the pair is %s, not same-build)\n' "$f" "$n" "$v" >> "$WORK/badmarks"; op="-"; fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$f" "$n" "$asha" "${ab:--}" "$gsha" "${gb:--}" "$v:$kind" "$op" >> "$WORK/pairs"
  done < <(gate_names "$f")
done

SAME=$(awk -F'\t' '$7 ~ /^SAME-BUILD/' "$WORK/pairs" | wc -l | tr -d ' ')
SAME_A=$(awk -F'\t' '$7=="SAME-BUILD:ASSERTED"' "$WORK/pairs" | wc -l | tr -d ' ')
SAME_N=$(awk -F'\t' '$7=="SAME-BUILD:NAV-ONLY"' "$WORK/pairs" | wc -l | tr -d ' ')
OPN=$(awk -F'\t' '$7 ~ /^SAME-BUILD/ && $8 ~ /^OPENED/' "$WORK/pairs" | wc -l | tr -d ' ')
OPN_C=$(awk -F'\t' '$7 ~ /^SAME-BUILD/ && $8 ~ /^OPENED:control/' "$WORK/pairs" | wc -l | tr -d ' ')
OPN_R=$(awk -F'\t' '$7 ~ /^SAME-BUILD/ && $8 ~ /^OPENED:reading/' "$WORK/pairs" | wc -l | tr -d ' ')
UNO=$(awk -F'\t' '$7 ~ /^SAME-BUILD/ && $8=="UNOPENED"' "$WORK/pairs" | wc -l | tr -d ' ')
BADM=$(wc -l < "$WORK/badmarks" | tr -d ' ')
DIFF=$(awk -F'\t' '$7 ~ /^DIFFERENT/' "$WORK/pairs" | wc -l | tr -d ' ')
UNK=$(awk -F'\t' '$7 ~ /^UNKNOWN/' "$WORK/pairs" | wc -l | tr -d ' ')
NOLIT=$(awk -F'\t' '$7=="NO-APP-LITERAL"' "$WORK/pairs" | wc -l | tr -d ' ')
TOT=$(wc -l < "$WORK/pairs" | tr -d ' ')

echo "selector-provenance  sweep over $(ls gates/regress/*.js | wc -l | tr -d ' ') gate files at $(git rev-parse --short HEAD) ($(buildof HEAD))"
echo "POPULATION  $TOT (gate file, selector) pairs live at HEAD"
echo "  SAME-BUILD  $SAME   ($SAME_A asserted / read, $SAME_N navigation-only)"
echo "    OPENED    $OPN   ($OPN_C by a recorded control, $OPN_R by reading; a SELECTOR-OPENED mark in the gate)"
echo "    UNOPENED  $UNO"
echo "  DIFFERENT   $DIFF"
echo "  UNKNOWN     $UNK    (a commit on one side carries no #NNN; never counted as same-build)"
echo "  NO-APP-LITERAL $NOLIT (the gate names a selector chess.jsx never emits as a literal: dynamic, or dead)"
echo
if [ "$SAME" -gt 0 ]; then
  echo "THE SAME-BUILD PAIRS - each one an assertion that could not have gone red on the bundle it was written against:"
  awk -F'\t' '$7 ~ /^SAME-BUILD/{printf "  %-44s %-26s build %-6s app %.8s  gate %.8s  %s  %s\n",$1,$2,$4,$3,$5,$7,$8}' "$WORK/pairs" | sort
  echo
fi
if [ "$BADM" -gt 0 ]; then
  echo "SELECTOR-OPENED MARKS NOT CREDITED ($BADM) - listed so a mark that does not count is never silent:"
  awk -F'\t' '{printf "  %-44s %-26s %s\n",$1,$2,$3}' "$WORK/badmarks" | sort
  echo
fi
if [ "$NOLIT" -gt 0 ]; then
  echo "NO-APP-LITERAL (reported, not asserted - a selector with no literal in chess.jsx cannot be joined from either side):"
  awk -F'\t' '$7=="NO-APP-LITERAL"{printf "  %-44s %s\n",$1,$2}' "$WORK/pairs" | sort
  echo
fi
cp "$WORK/pairs" "${CT_SP_OUT:-/dev/null}" 2>/dev/null || true

# #550, the orchestrator's ruling a4 on questions build__1794388896663-q4 (7:41am ET 11 Nov 2026), jobs/an-assertion-keyed-to-a-
# selector-its-own-build-adds-cannot-control-2026-09-29: the ceiling is SET, at the same-build count this script reads on the run's
# tree when it is set - 81 on the #550 branch (it was 35 on 9 Oct, 52 at #548, 59 at #549: left unset, it only rose). A new same-build
# hook-and-assertion pair is now a RED; lower it as pairs are fixed. G_SPCEIL in the environment still overrides (the selftest uses it).
# #550 round 4: the ceiling now bounds the UNOPENED count (SELECTOR-OPENED marks above), and is set to 13, measured at this commit
# (same-build 142, opened 129, unopened 13). The 81 it replaces bounded the raw same-build count, which read 142 on the branch tip.
CEIL="${G_SPCEIL:-0}"   # #550 lead: 13 -> 12 (gate 30 menu-sheet), 12 -> 9 (gate 72 drill-eval, -fill, -num), 9 -> 8 (gate 39 pz-streak), 8 -> 7 (gate 112 rev-head), 7 -> 5 (gate 15 ask-card by control, rec-cap-done by reading), 5 -> 4 (gate 118 bril-lib), 4 -> 2 (gate 28 scan-busy, scan-side-b), 2 -> 1 (gate 72 pz-msg), 1 -> 0 (gate 73 glist-filters by reading), the rest each opened by a recorded control
if [ -z "$CEIL" ]; then
  echo "NO CEILING SET (G_SPCEIL unset) - this run REPORTS and asserts nothing. Set G_SPCEIL to the"
  echo "measured count to make a new same-build pair a RED rather than a line in a log."
  exit 0
fi
if [ "$UNO" -gt "$CEIL" ]; then
  echo "FAIL  unopened same-build pairs $UNO EXCEED the ceiling $CEIL - a build has added an assertion keyed to a"
  echo "      selector it introduced in the same commit range. Name it above, or lower the assertion onto"
  echo "      what the element SAYS rather than onto the hook the fix drilled (CLAUDE.md, #432)."
  exit 1
fi
if [ "$UNO" -lt "$CEIL" ]; then
  echo "CEILING CAN BE LOWERED: $UNO of $CEIL. Set G_SPCEIL=$UNO."
fi
echo "PASS  unopened same-build pairs $UNO within ceiling $CEIL (same-build $SAME, opened $OPN)"
exit 0
