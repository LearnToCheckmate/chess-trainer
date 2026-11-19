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
# No `grep -q` reads a pipe here (the pipefail-grep class, gates/audit/pipefail-grep.sh): every test reads a file or a
# herestring.

SR_VERSION='#suite-resume v1'
SR_ON=1; SR_I=0; SR_K=0; SR_OFF=0; SR_PALL=""; SR_PJ=""; SR_PJMD5=""
SR_ROFF=(); SR_RLEN=(); SR_RMD5=(); SR_RSTEM=(); SR_RVERD=(); SR_STEMS=()

sr_md5(){ md5sum "$1" 2>/dev/null | cut -c1-32; }
sr_size(){ stat -c %s "$1" 2>/dev/null; }
# bytes [off, off+len) of a file, whole, on stdout
sr_bytes(){ dd if="$1" iflag=skip_bytes,count_bytes skip="$2" count="$3" bs=65536 status=none 2>/dev/null; }
sr_bytes_md5(){ sr_bytes "$1" "$2" "$3" | md5sum | cut -c1-32; }
# the tree digest: tree_fingerprint's tracked, untracked and gitmeta lines. NOT refs - a fetch, or pushing the per-run
# branch to save the work, moves refs and changes nothing a gate reads; HEAD is carried on its own.
sr_treedigest(){ grep -E '^(tracked|untracked|gitmeta) ' <<<"$1" | sha1sum | cut -c1-16; }
sr_statusdigest(){ printf '%s' "$1" | md5sum | cut -c1-32; }
sr_rosterdigest(){ local f; for f in "${gates[@]}"; do basename "$f" .js; done | md5sum | cut -c1-32; }
# every CT_* variable plus the few non-CT ones that change what a browser draws, EXCEPT the five that name this
# invocation or act only on the prelude (which the resumed part re-runs and records in its own log)
sr_envdigest(){ local v; { for v in $(compgen -e | LC_ALL=C sort); do
    case "$v" in CT_RESUME|CT_RESUMABLE|CT_GATES_SELFCOPY|CT_RUNID|CT_GAPFILL_OVERRIDE) continue ;; esac
    case "$v" in CT_*|FONTCONFIG_FILE|PLAYWRIGHT_BROWSERS_PATH|TZ|LANG|LC_ALL) printf '%s=%s\n' "$v" "${!v}" ;; esac
  done; } | md5sum | cut -c1-32; }
# ONE place that writes the mark line, so gates.sh and the selftest's fixture joins cannot drift apart.
sr_mark_text(){ # <i> <n> <name> <stem> <bundle md5> <head> <tree> <body md5>
  printf '    resume-mark: gate %s/%s %s | run %s | bundle %s | head %s | tree %s | body md5 %s\n' "$@"; }
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
  SR_TD="$(sr_treedigest "$TREEFP0")"; SR_SD="$(sr_statusdigest "${DIRTYL0:-}")"
  SR_RD="$(sr_rosterdigest)"; SR_ED="$(sr_envdigest)"; SR_NG="${#gates[@]}"
  SR_J="$G/logs/$STEM-resume.tsv"
  if [ -n "${CT_RESUME:-}" ]; then
    sr_resume_check || return 1
  fi
  { printf '%s\n' "$SR_VERSION"
    printf 'start\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$N" "$STEM" "$ALL" "$APP" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" \
      "$SR_TD" "$SR_SD" "$SR_RD" "$SR_ED" "$SR_NG" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    if [ -n "$SR_PJ" ]; then printf 'from\t%s\t%s\t%s\n' "$SR_PJ" "$SR_PJMD5" "$SR_K"; fi
  } > "$SR_J" || { sr_refuse "could not write the journal $SR_J."; return 1; }
  if [ -n "$SR_PJ" ]; then
    local nx="(none - every gate had finished)"; [ "$SR_K" -lt "$SR_NG" ] && nx="$((SR_K+1)) ($(basename "${gates[$SR_K]}" .js))"
    sr_say "suite-resume: RESUMING from $SR_PJ (md5 $SR_PJMD5): $SR_K of $SR_NG gates finished there and are copied after an md5 check; the first unfinished gate is $nx. Tree, bundle ($SR_BUNDLE), HEAD, status, roster and environment all proven equal to that run's start. Journal: $SR_J"
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
  [ -z "$(tail -c1 "$pj")" ] || { sr_refuse "the journal $pj ends in a torn line (no final newline): the run was killed while writing it." "Its last complete row is still trustworthy only if the file is cut back to it by hand, in the open."; return 1; }
  [ "$(head -1 "$pj")" = "$SR_VERSION" ] || { sr_refuse "the journal $pj does not start with '$SR_VERSION'."; return 1; }
  SR_PJ="$pj"; SR_PJMD5="$(sr_md5 "$pj")"
  local nstart; nstart="$(grep -c '^start	' "$pj")"
  [ "$nstart" = 1 ] || { sr_refuse "the journal $pj carries $nstart start row(s), not 1."; return 1; }
  local tag pn pstem pall papp pbun phead ptree ptd psd prd ped png pdate extra
  IFS=$'\t' read -r tag pn pstem pall papp pbun phead ptree ptd psd prd ped png pdate extra < <(grep '^start	' "$pj")
  [ -n "$pdate" ] && [ -z "${extra:-}" ] || { sr_refuse "the journal's start row is malformed (wrong field count)."; return 1; }
  [ "$pn" = "$N" ]            || { sr_refuse "another build number: the killed run gated $pn, this run is $N."; return 1; }
  [ "$pbun" = "$SR_BUNDLE" ]  || { sr_refuse "ANOTHER BUNDLE: the killed run gated bundle md5 $pbun ($papp), this run's bundle is $SR_BUNDLE ($APP)."; return 1; }
  [ "$phead" = "$HEADSHA" ]   || { sr_refuse "ANOTHER TREE: the killed run gated HEAD $phead, this run's HEAD is $HEADSHA."; return 1; }
  [ "$ptree" = "$HEADTREE" ]  || { sr_refuse "ANOTHER TREE: the killed run's HEAD tree was $ptree, this run's is $HEADTREE."; return 1; }
  [ "$ptd" = "$SR_TD" ]       || { sr_refuse "THE WORKING TREE MOVED: tracked bytes, the untracked set or .git config/hooks/info differ from the killed run's start (digest $ptd, now $SR_TD)."; return 1; }
  [ "$psd" = "$SR_SD" ]       || { sr_refuse "THE WORKING TREE MOVED: the git status listing differs from the killed run's start."; return 1; }
  [ "$prd" = "$SR_RD" ] && [ "$png" = "$SR_NG" ] || { sr_refuse "ANOTHER ROSTER: the killed run's gate list ($png gates) is not this run's ($SR_NG gates) - a gate was added, removed or reordered."; return 1; }
  [ "$ped" = "$SR_ED" ]       || { sr_refuse "ANOTHER ENVIRONMENT: a CT_* option (or FONTCONFIG_FILE, PLAYWRIGHT_BROWSERS_PATH, TZ, LANG, LC_ALL) differs from the killed run's, so the rest would not be the same measurement." "Excluded on purpose: CT_RESUME, CT_RESUMABLE, CT_GATES_SELFCOPY, CT_RUNID, CT_GAPFILL_OVERRIDE."; return 1; }
  SR_PALL="$pall"
  [ -f "$SR_PALL" ] && [ -r "$SR_PALL" ] || { sr_refuse "the killed run's log $SR_PALL is missing or unreadable."; return 1; }
  if grep -qE '^(GATES (GREEN|RED)|SUBSET (OK|RED)) ' "$SR_PALL"; then
    sr_refuse "the run in $SR_PALL FINISHED (it carries a verdict line). A finished run is re-run from the top, never resumed."; return 1
  fi
  # every other line: a gate row or a from row; nothing else
  local bad; bad="$(grep -vcE '^(#suite-resume v1|start	.*|from	[^	]+	[0-9a-f]{32}	[0-9]+|gate	[0-9]+	[^	]+	[^	]+	(green|red)	[0-9]+	[0-9]+	[0-9a-f]{32})$' "$pj")"
  [ "$bad" = 0 ] || { sr_refuse "the journal $pj carries $bad malformed row(s)."; return 1; }
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
      *"gate $i/$SR_NG $nm | run "*" | bundle $SR_BUNDLE | head $HEADSHA | tree $HEADTREE | body md5 "*) ;;
      *) sr_refuse "gate $i ($nm): its own mark does not name this run's bundle, HEAD and tree - a section from another run was spliced in." "mark: ${mk:-(none)}"; return 1 ;;
    esac
    SR_ROFF+=("$off"); SR_RLEN+=("$len"); SR_RMD5+=("$m"); SR_RSTEM+=("$st"); SR_RVERD+=("$vd")
    want=$((want+1))
  done < "$pj"
  SR_K=$((want-1))
  return 0
}

# first line of the gate loop. 0 = imported (the caller continues), 1 = run it.
sr_import(){
  SR_I=$((SR_I+1))
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
    printf 'gate\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$SR_I" "$1" "${SR_RSTEM[$j]}" "${SR_RVERD[$j]}" "$now" "$len" "$m" >> "$SR_J"
    SR_STEMS+=("${SR_RSTEM[$j]}")
    [ "${SR_RVERD[$j]}" = red ] && red=1
    echo "=== $1 === copied from run ${SR_RSTEM[$j]} (${SR_RVERD[$j]}, md5 $m)"
    return 0
  fi
  SR_OFF="$(sr_size "$ALL")"
  return 1
}

# last line of the gate loop: the mark, then the journal row
sr_mark(){
  local end bm vd ue um
  end="$(sr_size "$ALL")"
  bm="$(sr_bytes_md5 "$ALL" "$SR_OFF" "$((end-SR_OFF))")"
  sr_mark_text "$SR_I" "$SR_NG" "$1" "$STEM" "$SR_BUNDLE" "$HEADSHA" "$HEADTREE" "$bm" >> "$ALL"
  vd=red; grep -aqF "    $1: green (" < <(sr_bytes "$ALL" "$SR_OFF" "$((end-SR_OFF))") && vd=green
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
