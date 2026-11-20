# gates/suite-resume.sh - SOURCED by gates/gates.sh, never run on its own. A full suite that resumes after a container
# restart from the first unfinished gate, on the same tree and bundle proven by hash.
# jobs/the-full-suite-resumes-after-a-container-restart-from-the-first-unfinished-gate-2026-11-18;
# decisions/batch-13-avoids-wasted-full-suite-reruns-2026-11-18 part 2. THE DESIGN IS claude/agents/SUITE-RESUME-DESIGN.md
# AND IT IS TO BE REVIEWED BEFORE USE.
#
# OPT-IN TWICE. gates.sh loads this file only when CT_RESUMABLE or CT_RESUME is set; with both unset it sets SR_ON=0 and
# none of its four hooks does anything, so a suite launched the ordinary way is byte-for-byte the suite it was before.
#   CT_RESUMABLE=1        journal every finished gate (gates/logs/<STEM>-resume.tsv) and mark it in the log
#   CT_RESUME=<journal>   (or the killed run's -all.log) resume: copy the finished gates' sections, run the rest
# The four hooks in gates.sh: sr_begin (after red=0, before the unit layers), sr_import (first line of the gate loop),
# sr_mark (last line of the gate loop), sr_footer (before the `gates ran` footer line).
#
# It reads gates.sh's own variables: N TAG G ROOT STEM ALL APP HEADSHA HEADTREE DIRTYL0 TREEFP0 SUBSET gates red.
# No `grep -q` (nor any early-exiting grep) reads a PIPE here (the pipefail-grep class, gates/audit/pipefail-grep.sh):
# every such test reads a file, a herestring or a process substitution, none of which pipefail can see. The pipes that
# remain feed md5sum, cut or a grep that reads to the end.
# Reviewed: claude/agents/SUITE-RESUME-REVIEW.md (SOUND WITH FIXES); fixes 1a-1d and 1e, 1f, 2i-2iii are in.

SR_VERSION='#suite-resume v1'
SR_ON=1; SR_I=0; SR_K=0; SR_OFF=0; SR_PALL=""; SR_PJ=""; SR_PJMD5=""
SR_SPLIT=0; SR_PK=""; SR_PN=""; SR_PA=0; SR_PB=0; SR_PW=0; SR_PWT=0; SR_PWSRC=""; SR_PLANMD5=""; SR_SPLITN=""; SR_PLAN=""; SR_PLANOF=()
SR_ROFF=(); SR_RLEN=(); SR_RMD5=(); SR_RSTEM=(); SR_RVERD=(); SR_STEMS=()

sr_md5(){ md5sum "$1" 2>/dev/null | cut -c1-32; }
sr_size(){ stat -c %s "$1" 2>/dev/null; }
# bytes [off, off+len) of a file, whole, on stdout
sr_bytes(){ dd if="$1" iflag=skip_bytes,count_bytes skip="$2" count="$3" bs=65536 status=none 2>/dev/null; }
sr_bytes_md5(){ sr_bytes "$1" "$2" "$3" | md5sum | cut -c1-32; }
# the tree digest: tree_fingerprint's tracked, untracked and gitmeta lines. NOT refs - a fetch, or pushing the per-run
# branch to save the work, moves refs and changes nothing a gate reads; HEAD is carried on its own.
# [suite-split] ACROSS MACHINES THE gitmeta LINE IS LEFT OUT: two clones at one sha carry different .git/config (the remote's
# proxy URL, the per-run branch each session was given), so it differs with nothing a gate reads differing. A part and the
# joining run both set SR_SPLIT=1; each part's own prelude still checked its gitmeta did not move before its first gate.
sr_treedigest(){ if [ "${SR_SPLIT:-0}" = 1 ]; then grep -E '^(tracked|untracked) ' <<<"$1"; else grep -E '^(tracked|untracked|gitmeta) ' <<<"$1"; fi | sha1sum | cut -c1-16; }
sr_statusdigest(){ printf '%s' "$1" | md5sum | cut -c1-32; }
sr_rosterdigest(){ local f; for f in "${gates[@]}"; do basename "$f" .js; done | md5sum | cut -c1-32; }
# THE TOOLCHAIN [review 1b]: a container restart can bring another node, Playwright, Chromium or font set (#537 was a
# Chromium 141 -> 153 change), and no environment variable says so. node's version, Playwright's package version and
# the Chromium executable path it resolves (the path carries the browser's revision directory), and an md5 of the
# sorted fc-list. Read from $G so `require` finds gates/node_modules. A part that cannot read one says `absent`.
sr_toolchain(){ local nv pv cv fv
  nv="$(node --version 2>/dev/null || echo absent)"
  pv="$(cd "$G" && node -e 'try{console.log(require("playwright/package.json").version)}catch(e){console.log("absent")}' 2>/dev/null || echo absent)"
  cv="$(cd "$G" && node -e 'try{console.log(require("playwright").chromium.executablePath())}catch(e){console.log("absent")}' 2>/dev/null || echo absent)"
  fv="$(fc-list 2>/dev/null | LC_ALL=C sort | md5sum | cut -c1-12)"
  printf 'node=%s playwright=%s chromium=%s fonts=%s' "${nv:-absent}" "${pv:-absent}" "${cv:-absent}" "$fv" | tr '\t\n' '  '; }
# every CT_* variable plus the few non-CT ones that change what a browser draws, EXCEPT the five that name this
# invocation or act only on the prelude (which the resumed part re-runs and records in its own log), AND the toolchain
sr_envdigest(){ local v; { for v in $(compgen -e | LC_ALL=C sort); do
    case "$v" in CT_RESUME|CT_RESUMABLE|CT_GATES_SELFCOPY|CT_RUNID|CT_GAPFILL_OVERRIDE|CT_PART) continue ;; esac
    # [suite-split] the clone's own path is written <ROOT>, so CT_APP=$ROOT/app.js and CT_SHOTS=$G/... agree between two
    # machines whose clones sit at different paths; any other path (a trial bundle outside the clone) must be the same
    case "$v" in CT_*|FONTCONFIG_FILE|PLAYWRIGHT_BROWSERS_PATH|TZ|LANG|LC_ALL) local val="${!v}"; printf '%s=%s\n' "$v" "${val//"$ROOT"/<ROOT>}" ;; esac
  done; printf 'toolchain=%s\n' "$SR_TC"; } | md5sum | cut -c1-32; }
# ONE place that writes the mark line, so gates.sh and the selftest's fixture joins cannot drift apart.
# `state` is <tree digest>.<status digest>.<env digest> [review 1e], so every section names the whole state it ran in.
sr_mark_text(){ # <i> <n> <name> <stem> <bundle md5> <head> <tree> <state> <body md5>
  printf '    resume-mark: gate %s/%s %s | run %s | bundle %s | head %s | tree %s | state %s | body md5 %s\n' "$@"; }
# ONE place that writes the footer line. Parts are "<stem> gates <a>-<b>", comma-joined.
sr_footer_text(){ # <parts count> <parts> <bundle> <head> <tree> <journal>
  printf 'resume: %s part(s): %s | bundle %s | head %s | tree %s | journal %s\n' "$@"; }

sr_say(){ printf '%s\n' "$1" | tee -a "$ALL"; }
sr_refuse(){
  sr_say "RESUME REFUSED: $1"
  [ -n "${2:-}" ] && sr_say "  $2"
  sr_say "GATES RED $N — stopped before the unit layers: the resume could not be proven to continue the same run. Re-run the suite from the top, or fix the cause and resume again. Design: claude/agents/SUITE-RESUME-DESIGN.md section 6."
  return 1
}

sr_begin(){
  if [ -n "${SUBSET:-}" ]; then
    sr_refuse "CT_RESUME/CT_RESUMABLE was set on a SUBSET run. Resume is for the full suite only: a subset authorises nothing, so there is nothing to carry across a restart."; return 1
  fi
  SR_BUNDLE="$(sr_md5 "$APP")"; [ -n "$SR_BUNDLE" ] || { sr_refuse "could not read the bundle $APP to hash it."; return 1; }
  if [ -n "${CT_PART:-}" ]; then sr_part_init || return 1; fi
  if [ -n "${CT_RESUME:-}" ]; then local sj="$CT_RESUME"; case "$sj" in *-all.log) sj="${sj%-all.log}-resume.tsv" ;; esac
    [ -r "$sj" ] && grep -q $'^split\t' "$sj" && SR_SPLIT=1; fi
  SR_TD="$(sr_treedigest "$TREEFP0")"; SR_SD="$(sr_statusdigest "${DIRTYL0:-}")"
  SR_TC="$(sr_toolchain)"
  SR_RD="$(sr_rosterdigest)"; SR_ED="$(sr_envdigest)"; SR_NG="${#gates[@]}"; SR_STATE="$SR_TD.$SR_SD.$SR_ED"
  SR_J="$G/logs/$STEM-resume.tsv"
  if [ -n "${CT_RESUME:-}" ]; then
    sr_resume_check || return 1
  fi
  { printf '%s\n' "$SR_VERSION"
    printf 'start\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$N" "$STEM" "$ALL" "$APP" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" \
      "$SR_TD" "$SR_SD" "$SR_RD" "$SR_ED" "$SR_NG" "$SR_TC" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    if [ -n "$SR_PJ" ]; then printf 'from\t%s\t%s\t%s\n' "$SR_PJ" "$SR_PJMD5" "$SR_K"; fi
  } > "$SR_J" || { sr_refuse "could not write the journal $SR_J."; return 1; }
  if [ -n "$SR_PJ" ]; then
    local nx="(none - every gate had finished)"; [ "$SR_K" -lt "$SR_NG" ] && nx="$((SR_K+1)) ($(basename "${gates[$SR_K]}" .js))"
    [ -n "${SR_SPLITN:-}" ] && sr_say "suite-split: JOINING $SR_SPLITN part(s) merged by gates/suite-split.sh (plan md5 $SR_PLANMD5): every gate is copied from the part that ran it; this run runs the prelude, the unit layers and the footer."
    sr_say "suite-resume: RESUMING from $SR_PJ (md5 $SR_PJMD5): $SR_K of $SR_NG gates finished there and are copied after an md5 check; the first unfinished gate is $nx. Tree, bundle ($SR_BUNDLE), HEAD, status, roster, environment and toolchain ($SR_TC) all proven equal to that run's start. Journal: $SR_J"
    if [ -n "${SR_TAILRED:-}" ]; then
      red=1
      sr_say "RESUME: the killed run's unfinished gate $SR_TAILRED red line(s) (FAIL, a RED verdict or <<<) before the restart. They are not dropped: this run is RED whatever that gate does here [review 1a]."
    fi
  elif [ -n "$SR_PK" ]; then
    sr_say "suite-split: PART $SR_PK/$SR_PN - runs gates $SR_PA-$SR_PB of $SR_NG ($(basename "${gates[$((SR_PA-1))]}" .js) to $(basename "${gates[$((SR_PB-1))]}" .js)), weight $SR_PW of $SR_PWT ($SR_PWSRC); plan md5 $SR_PLANMD5. Journal $SR_J. The unit layers are left to the joining run. This log is never a push gate: join every part with gates/suite-split.sh join."
  else
    sr_say "suite-resume: resumable run - every finished gate is journaled in $SR_J and marked in this log (bundle $SR_BUNDLE)."
  fi
  return 0
}

sr_resume_check(){
  local pj="$CT_RESUME"
  case "$pj" in *-all.log) pj="${pj%-all.log}-resume.tsv" ;; esac
  [ -f "$pj" ] && [ -r "$pj" ] || { sr_refuse "the journal $pj (from CT_RESUME=$CT_RESUME) is missing or unreadable."; return 1; }
  [ "$(cd "$(dirname "$pj")" && pwd)/$(basename "$pj")" != "$SR_J" ] || { sr_refuse "CT_RESUME names this run's own journal."; return 1; }
  [ -z "$(tail -c1 "$pj")" ] || { sr_refuse "the journal $pj ends in a torn line (no final newline): the run was killed while writing it. Re-run the suite from the top; a journal is never cut back by hand."; return 1; }
  [ "$(head -1 "$pj")" = "$SR_VERSION" ] || { sr_refuse "the journal $pj does not start with '$SR_VERSION'."; return 1; }
  SR_PJ="$pj"; SR_PJMD5="$(sr_md5 "$pj")"
  local nstart; nstart="$(grep -c '^start	' "$pj")"
  [ "$nstart" = 1 ] || { sr_refuse "the journal $pj carries $nstart start row(s), not 1."; return 1; }
  local tag pn pstem pall papp pbun phead ptree ptd psd prd ped png ptc pdate extra
  IFS=$'\t' read -r tag pn pstem pall papp pbun phead ptree ptd psd prd ped png ptc pdate extra < <(grep '^start	' "$pj")
  [ -n "$pdate" ] && [ -z "${extra:-}" ] || { sr_refuse "the journal's start row is malformed (wrong field count)."; return 1; }
  [ "$pn" = "$N" ]            || { sr_refuse "another build number: the killed run gated $pn, this run is $N."; return 1; }
  [ "$pbun" = "$SR_BUNDLE" ]  || { sr_refuse "ANOTHER BUNDLE: the killed run gated bundle md5 $pbun ($papp), this run's bundle is $SR_BUNDLE ($APP)."; return 1; }
  [ "$phead" = "$HEADSHA" ]   || { sr_refuse "ANOTHER TREE: the killed run gated HEAD $phead, this run's HEAD is $HEADSHA."; return 1; }
  [ "$ptree" = "$HEADTREE" ]  || { sr_refuse "ANOTHER TREE: the killed run's HEAD tree was $ptree, this run's is $HEADTREE."; return 1; }
  [ "$ptd" = "$SR_TD" ]       || { sr_refuse "THE WORKING TREE MOVED: tracked bytes, the untracked set or .git config/hooks/info differ from the killed run's start (digest $ptd, now $SR_TD)."; return 1; }
  [ "$psd" = "$SR_SD" ]       || { sr_refuse "THE WORKING TREE MOVED: the git status listing differs from the killed run's start."; return 1; }
  [ "$prd" = "$SR_RD" ] && [ "$png" = "$SR_NG" ] || { sr_refuse "ANOTHER ROSTER: the killed run's gate list ($png gates) is not this run's ($SR_NG gates) - a gate was added, removed or reordered."; return 1; }
  [ "$ptc" = "$SR_TC" ]       || { sr_refuse "ANOTHER TOOLCHAIN: the killed run had [$ptc], this run has [$SR_TC] - a container restart brought another node, Playwright, Chromium or font set, so the rest would not be the same measurement."; return 1; }
  [ "$ped" = "$SR_ED" ]       || { sr_refuse "ANOTHER ENVIRONMENT: a CT_* option (or FONTCONFIG_FILE, PLAYWRIGHT_BROWSERS_PATH, TZ, LANG, LC_ALL) differs from the killed run's, so the rest would not be the same measurement." "Excluded on purpose: CT_RESUME, CT_RESUMABLE, CT_GATES_SELFCOPY, CT_RUNID, CT_GAPFILL_OVERRIDE, CT_PART."; return 1; }
  SR_PALL="$pall"
  [ -f "$SR_PALL" ] && [ -r "$SR_PALL" ] || { sr_refuse "the killed run's log $SR_PALL is missing or unreadable."; return 1; }
  if grep -qE '^(GATES (GREEN|RED)|SUBSET (OK|RED)|PART (OK|RED)) ' "$SR_PALL"; then
    sr_refuse "the run in $SR_PALL FINISHED (it carries a verdict line). A finished run is re-run from the top, never resumed."; return 1
  fi
  # [review 1c] the killed part's prelude is not carried, so its one prelude verdict about the TREE must be read here
  if grep -q '^TREE MOVED BEFORE THE BROWSER GATES' "$SR_PALL"; then
    sr_refuse "the killed run's prelude says TREE MOVED BEFORE THE BROWSER GATES: its gates read a tree other than the one its log describes, so none of them can be carried."; return 1
  fi
  grep -q '^tree unchanged before the browser gates' "$SR_PALL" \
    || { sr_refuse "the killed run's log carries no 'tree unchanged before the browser gates' line, so whether its gates read the tree it started on is unknown."; return 1; }
  # every other line: a gate row or a from row; nothing else
  local bad; bad="$(grep -vcE '^(#suite-resume v1|start	.*|from	[^	]+	[0-9a-f]{32}	[0-9]+|split	[0-9]+	[0-9a-f]{32}|gate	[0-9]+	[^	]+	[^	]+	(green|red)	[0-9]+	[0-9]+	[0-9a-f]{32})$' "$pj")"
  [ "$bad" = 0 ] || { sr_refuse "the journal $pj carries $bad malformed row(s)."; return 1; }
  # [suite-split] a merged journal names its plan; the plan is recomputed HERE from this run's roster and weights, and every
  # row must come from the part the plan gives its position to (a gate run on the wrong machine, or under another plan)
  local nsplit; nsplit="$(grep -c $'^split\t' "$pj")"
  if [ "$nsplit" -gt 0 ]; then
    [ "$nsplit" = 1 ] || { sr_refuse "the merged journal $pj carries $nsplit split rows, not 1."; return 1; }
    local _t sn smd5; IFS=$'\t' read -r _t sn smd5 < <(grep $'^split\t' "$pj")
    sr_plan_load "$sn" || { sr_refuse "the split's plan for $sn parts could not be computed from this run's roster."; return 1; }
    [ "$SR_PLANMD5" = "$smd5" ] || { sr_refuse "ANOTHER PLAN: the parts were assigned by plan md5 $smd5, this run's roster and weights give $SR_PLANMD5 - the gate list or gates/suite-split-seconds.tsv differs."; return 1; }
    SR_SPLITN="$sn"
  fi
  local i nm st vd off len m want=1 psize; psize="$(sr_size "$SR_PALL")"
  while IFS=$'\t' read -r tag i nm st vd off len m; do
    [ "$tag" = gate ] || continue
    [ "$i" = "$want" ] || { sr_refuse "the journal's gate rows are not a clean prefix: row $want expected, found row $i ($nm) - a gap, a repeat or a reorder."; return 1; }
    [ "$want" -le "$SR_NG" ] || { sr_refuse "the journal has more gate rows than the roster has gates."; return 1; }
    [ "$nm" = "$(basename "${gates[$((want-1))]}" .js)" ] || { sr_refuse "journal row $i names $nm but roster position $i is $(basename "${gates[$((want-1))]}" .js)."; return 1; }
    [ $((off+len)) -le "$psize" ] || { sr_refuse "gate $i ($nm) lies past the end of $SR_PALL: the killed log was truncated or replaced."; return 1; }
    [ "$(sr_bytes_md5 "$SR_PALL" "$off" "$len")" = "$m" ] || { sr_refuse "gate $i ($nm): its section in $SR_PALL does not match the md5 the journal recorded - the killed log was edited, truncated or overwritten."; return 1; }
    local mk; mk="$(sr_bytes "$SR_PALL" "$off" "$len" | grep -a '^    resume-mark: ')"
    case "$mk" in
      *"gate $i/$SR_NG $nm | run "*" | bundle $SR_BUNDLE | head $HEADSHA | tree $HEADTREE | state $SR_STATE | body md5 "*) ;;
      *) sr_refuse "gate $i ($nm): its own mark does not name this run's bundle, HEAD, tree and state - a section from another run was spliced in." "mark: ${mk:-(none)}"; return 1 ;;
    esac
    if [ -n "${SR_SPLITN:-}" ]; then
      local pk=""; [[ "$st" =~ -p([0-9]+)of${SR_SPLITN}[a-z]?$ ]] && pk="${BASH_REMATCH[1]}"
      [ "$pk" = "${SR_PLANOF[$i]}" ] || { sr_refuse "gate $i ($nm) was run by $st, but the plan gives position $i to part ${SR_PLANOF[$i]} of $SR_SPLITN - a gate run on the wrong machine."; return 1; }
    fi
    SR_ROFF+=("$off"); SR_RLEN+=("$len"); SR_RMD5+=("$m"); SR_RSTEM+=("$st"); SR_RVERD+=("$vd")
    want=$((want+1))
  done < "$pj"
  SR_K=$((want-1))
  # [review 1a] A CLEAN PREFIX IS NOT ENOUGH. Cutting the last rows (or a kill after a gate's verdict and before its row)
  # leaves a finished gate's bytes in the log with no row, and the join would then drop it - a RED gate included.
  local nmk; nmk="$(grep -ac '^    resume-mark: ' "$SR_PALL")"
  [ "$nmk" = "$SR_K" ] || { sr_refuse "the killed log carries $nmk gate mark(s) and its journal $SR_K row(s): the journal was cut or lost rows, so a finished gate would drop out of the join."; return 1; }
  local ts=0 tail tn
  if [ "$SR_K" -gt 0 ]; then ts=$(( SR_ROFF[SR_K-1] + SR_RLEN[SR_K-1] ))
  else ts="$(grep -abm1 '^=== ' "$SR_PALL" | cut -d: -f1)"; [ -n "$ts" ] || ts="$psize"; fi
  tail="$(sr_bytes "$SR_PALL" "$ts" "$((psize-ts))")"
  tn="$(grep -ac '^=== ' <<<"$tail")"
  [ "$tn" -le 1 ] || { sr_refuse "the killed log holds $tn gate sections after its last journaled gate; at most one (the gate the restart cut) can be unfinished."; return 1; }
  if grep -aqE '^    [^ ]+: green \(' <<<"$tail"; then
    sr_refuse "the killed run's unfinished section already carries a green verdict and no journal row: the journal was cut, or the kill fell between the verdict and the row. Re-run the suite from the top."; return 1
  fi
  local nred; nred="$(grep -acE '^FAIL|^    [^ ]+: RED \(|<<<' <<<"$tail")"
  SR_TAILRED=""; [ "$nred" -gt 0 ] && SR_TAILRED="$(grep -am1 '^=== ' <<<"$tail" | sed 's/^=== //; s/ ===$//') had printed $nred"
  return 0
}

# first line of the gate loop. 0 = imported (the caller continues), 1 = run it.
sr_import(){
  SR_I=$((SR_I+1))
  # [suite-split] a part runs only its own positions; the others are not run, not written, not journaled
  if [ -n "$SR_PK" ] && { [ "$SR_I" -lt "$SR_PA" ] || [ "$SR_I" -gt "$SR_PB" ]; }; then return 0; fi
  if [ "$SR_I" -le "$SR_K" ]; then
    local j=$((SR_I-1)) off len m now
    off="${SR_ROFF[$j]}"; len="${SR_RLEN[$j]}"; m="${SR_RMD5[$j]}"
    if [ "$(sr_bytes_md5 "$SR_PALL" "$off" "$len")" != "$m" ]; then
      red=1; SR_K=$j   # stop importing: this gate and every later one run here
      sr_say "RESUME: gate $SR_I ($1)'s section in $SR_PALL changed between the start check and the import - it is RUN here instead, and this run is RED: the killed log was written to while it was being resumed."
      SR_OFF="$(sr_size "$ALL")"; return 1
    fi
    now="$(sr_size "$ALL")"
    sr_bytes "$SR_PALL" "$off" "$len" >> "$ALL"
    # [review 1d] the verdict is read from the COPIED BYTES, never from the journal's column, which nothing hashes
    local vd; vd="$(sr_verdict "$1" "$now" "$len")"
    [ "$vd" = "${SR_RVERD[$j]}" ] || echo "    (gate $SR_I $1: the journal says ${SR_RVERD[$j]}, its copied section says $vd - the section wins)"
    printf 'gate\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$SR_I" "$1" "${SR_RSTEM[$j]}" "$vd" "$now" "$len" "$m" >> "$SR_J"
    SR_STEMS+=("${SR_RSTEM[$j]}")
    [ "$vd" = red ] && red=1
    echo "=== $1 === copied from run ${SR_RSTEM[$j]} ($vd, md5 $m)"
    return 0
  fi
  SR_OFF="$(sr_size "$ALL")"
  return 1
}

# green only when the section carries its own green verdict line and no FAIL, RED verdict or <<< marker
sr_verdict(){ # <name> <offset in ALL> <length>
  local b; b="$(sr_bytes "$ALL" "$2" "$3")"
  if grep -aqF "    $1: green (" <<<"$b" && ! grep -aqE '^FAIL|^    [^ ]+: RED \(|<<<' <<<"$b"; then echo green; else echo red; fi; }

# last line of the gate loop: the mark, then the journal row
sr_mark(){
  local end bm vd ue um
  end="$(sr_size "$ALL")"
  bm="$(sr_bytes_md5 "$ALL" "$SR_OFF" "$((end-SR_OFF))")"
  sr_mark_text "$SR_I" "$SR_NG" "$1" "$STEM" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" "$SR_STATE" "$bm" >> "$ALL"
  vd="$(sr_verdict "$1" "$SR_OFF" "$((end-SR_OFF))")"
  ue="$(sr_size "$ALL")"; um="$(sr_bytes_md5 "$ALL" "$SR_OFF" "$((ue-SR_OFF))")"
  printf 'gate\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$SR_I" "$1" "$STEM" "$vd" "$SR_OFF" "$((ue-SR_OFF))" "$um" >> "$SR_J"
  SR_STEMS+=("$STEM")
}

# footer: one line, the parts as contiguous blocks of run stems
sr_footer(){
  local parts="" np=0 i=0 a=1 cur="" s
  for s in "${SR_STEMS[@]}" ""; do
    i=$((i+1))
    if [ "$s" != "$cur" ]; then
      if [ -n "$cur" ]; then parts="${parts:+$parts, }$cur gates $a-$((i-1))"; np=$((np+1)); fi
      cur="$s"; a=$i
    fi
  done
  [ -n "$parts" ] || parts="(no gate ran)"
  sr_footer_text "$np" "$parts" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" "$SR_J" | tee -a "$ALL"
}

# ══ THE SUITE SPLIT [batch 13; jobs/the-full-suite-is-split-across-two-or-three-test-machines-and-the-joined-log-is-proved-
# 2026-11-18]. CT_PART=K/N runs part K of N of the roster on this machine; gates/suite-split.sh join merges the N parts' logs
# and journals into ONE journal with a `split` row, and a run with CT_RESUME=<that journal> copies every gate from its part
# and is judged as a resumed run is judged (verify-log.sh -> verify-join.sh). Rule: claude/agents/b13-split-suite-rule.md;
# commands: gates/suite-split.sh's header; controls: gates/suite-split-selftest.sh (TC-R257).
#
# THE PLAN: the roster cut into N CONTIGUOUS runs of positions with the largest part's weight as small as it can be (an
# exact linear-partition DP; among cuts with the same largest part the smaller sum of squares, then the earliest), so each part is one block and the joined footer's parts are the
# machines. Weights are whole seconds from gates/suite-split-seconds.tsv (`<gate>\t<seconds>` rows, the shape
# gates/audit/time-gates.sh writes; a gate it does not list weighs the median of those it does) or, with no such file, 1 a
# gate (the roster's order and count - the 551c log carries no per-gate seconds). Integers, so every awk on every machine
# cuts identically. Prints "k<TAB>a<TAB>b<TAB>weight" lines, positions 1-based and inclusive.
sr_plan(){ # <N> <gate name>...
  local n="$1"; shift
  printf '%s\n' "$@" | awk -v n="$n" -v wf="$G/suite-split-seconds.tsv" '
    BEGIN{ nw=0; while ((getline l < wf) > 0) { if (l ~ /^#/) continue; split(l, c, "\t"); if (c[2] ~ /^[0-9]+(\.[0-9]+)?$/) { g=c[1]; sub(/\.js$/,"",g); w[g]=int(c[2]+0.5); if (w[g]<1) w[g]=1; ws[++nw]=w[g] } } }
    { name[++m]=$0 }
    END{ med=1; if (nw>0) { for(i=1;i<=nw;i++) for(j=i+1;j<=nw;j++) if (ws[j]<ws[i]) { t=ws[i]; ws[i]=ws[j]; ws[j]=t }; med=ws[int((nw+1)/2)] }
      if (n<1 || n>m) exit 3
      S[0]=0; for(i=1;i<=m;i++){ x=(name[i] in w)?w[name[i]]:med; S[i]=S[i-1]+x }
      for(i=1;i<=m;i++){ B[1,i]=S[i]; Q[1,i]=S[i]*S[i] }
      for(k=2;k<=n;k++) for(i=k;i<=m;i++){ best=-1
        for(j=k-1;j<i;j++){ d=S[i]-S[j]; v=B[k-1,j]; if (d>v) v=d; q=Q[k-1,j]+d*d
          if (best<0 || v<best || (v==best && q<bq)) { best=v; bq=q; cj=j } }
        B[k,i]=best; Q[k,i]=bq; C[k,i]=cj }
      e=m; for(k=n;k>=1;k--){ s=(k>1)?C[k,e]+1:1; A[k]=s; E[k]=e; e=s-1 }
      for(k=1;k<=n;k++) printf "%d\t%d\t%d\t%d\n", k, A[k], E[k], S[E[k]]-S[A[k]-1] }'
}
sr_weights_src(){ local wf="$G/suite-split-seconds.tsv"; if [ -r "$wf" ]; then echo "seconds from gates/suite-split-seconds.tsv md5 $(sr_md5 "$wf" | cut -c1-12)"; else echo "1 a gate: no gates/suite-split-seconds.tsv"; fi; }
# loads SR_PLAN, SR_PLANMD5 and SR_PLANOF[position]=part for this run's roster (gates[])
sr_plan_load(){ # <N>
  local names=() f k a b w; for f in "${gates[@]}"; do names+=("$(basename "$f" .js)"); done
  SR_PLAN="$(sr_plan "$1" "${names[@]}")" || return 1
  [ "$(grep -c . <<<"$SR_PLAN")" = "$1" ] || return 1
  SR_PLANMD5="$( { printf '%s\n' "$SR_PLAN"; sr_weights_src; printf '%s\n' "${names[@]}"; } | md5sum | cut -c1-32)"
  SR_PLANOF=()
  while IFS=$'\t' read -r k a b w; do for ((f=a; f<=b; f++)); do SR_PLANOF[$f]="$k"; done; done <<<"$SR_PLAN"
}
sr_part_init(){
  [[ "${CT_PART:-}" =~ ^([1-9])/([2-9])$ ]] && [ "${BASH_REMATCH[1]}" -le "${BASH_REMATCH[2]}" ] \
    || { sr_refuse "CT_PART=${CT_PART:-} is not K/N with 1 <= K <= N and 2 <= N <= 9."; return 1; }
  SR_PK="${BASH_REMATCH[1]}"; SR_PN="${BASH_REMATCH[2]}"
  [ -z "${CT_RESUME:-}" ] || { sr_refuse "CT_PART and CT_RESUME together: a part is never resumed. Re-run the part from the top on its machine."; return 1; }
  [[ "$STEM" =~ -p${SR_PK}of${SR_PN}[a-z]?$ ]] || { sr_refuse "a part's log must be named <number>-p${SR_PK}of${SR_PN}[letter]-all.log (gates.sh names it from CT_PART); this run's stem is $STEM."; return 1; }
  SR_SPLIT=1
  sr_plan_load "$SR_PN" || { sr_refuse "the plan for $SR_PN parts could not be computed over a roster of ${#gates[@]} gate(s)."; return 1; }
  local k a b w; while IFS=$'\t' read -r k a b w; do [ "$k" = "$SR_PK" ] && { SR_PA="$a"; SR_PB="$b"; SR_PW="$w"; }; SR_PWT=$((SR_PWT+w)); done <<<"$SR_PLAN"
  SR_PWSRC="$(sr_weights_src)"
}
# after the gate loop, in a part: a part's footer, which can NEVER say GATES GREEN or GATES RED. Its status is the verdict.
sr_part_footer(){
  local regn; regn=$(awk '/^=== .* ===$/{s=1} s&&/^PASS/{n++} END{print n+0}' "$ALL")
  echo "regression assertions (PASS lines): $regn" | tee -a "$ALL"
  printf 'suite-split: part %s/%s ran gates %s-%s of %s | run %s | bundle %s | head %s | tree %s | state %s | plan %s | journal %s\n' \
    "$SR_PK" "$SR_PN" "$SR_PA" "$SR_PB" "$SR_NG" "$STEM" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" "$SR_STATE" "$SR_PLANMD5" "$SR_J" | tee -a "$ALL"
  echo "gates ran (${#gates[@]}): $(for f in "${gates[@]}"; do printf '%s ' "$(basename "$f" .js)"; done)" | tee -a "$ALL"
  if [ "$red" -eq 0 ]; then echo "PART OK $SR_PK/$SR_PN $N — NOT A PUSH GATE: join every part with gates/suite-split.sh join" | tee -a "$ALL"; return 0
  else echo "PART RED $SR_PK/$SR_PN $N — NOT A PUSH GATE: the joined run will be RED" | tee -a "$ALL"; return 1; fi
}
