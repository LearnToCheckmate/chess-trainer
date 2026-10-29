#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────────────────────────────
# gates/audit/tracker-cited-ids.sh - DO THE CASE AND STORY IDS THE TRACKER'S JOBS CITE EXIST IN THE REGISTERS?
#
# WHY THIS EXISTS. TC-R17 [#545, item (12) of directOpening_2026_10_29_batch5;
# jobs/story-and-case-register-frozen-at-380-2026-09-27, clause (2) of its whatIsLeft and its
# START_HERE_2026_10_12_TCR17_JOIN spec]. `gates/verify-log.sh --citations` asks whether the REGISTERS'
# citations resolve - their paths, their logs, their story join. Nothing asked the OPPOSITE question:
# whether the ids a tracker job names as its case or its story clause exist in the registers at all. R08
# makes every defect job carry a case id and a story clause, and a job whose id resolves nowhere is a job
# whose "fixed" a closer cannot check. This is that join, from the tracker side to the repository side.
#
# IT IS A COMPARATOR AND IT RUNS BY HAND AGAINST AN EXPORT [R47]. The tracker is not reachable from the
# suite, so the input is a directory of job documents saved by ArtifactData (`query` with `out_dir`), one
# JSON file per job; the registers are read from `git show origin/main:<path>` in the repository given,
# never from the working tree, so an uncommitted register edit cannot make an id resolve.
#
# WHAT IS READ, AND ONLY THAT. For every job whose `status` is not "closed": the case-bearing fields
# `case`, `theTestCase`, `storyClause` and `theStoryClause` (a non-string value is read as its JSON text).
# Ids are taken with the regex (TC|US)-[A-Z]+-?[0-9]+[a-z]? and must end at a non-alphanumeric character.
#
# WHEN AN ID RESOLVES. Some line of claude/stories/TEST-CASES.md or claude/stories/USER-STORIES.md at
# origin/main begins with one of:
#   `| <id>`      a table row (the first cell may carry trailing words, as TC-R15's does)
#   `### <id>`    a story heading, at any heading depth (`## US-R31 - ...` is how US-R31 is written)
#   `<id>  `      a case in the register's BLOCK form (two spaces after the id, as TC-BN-001 and TC-R30
#                 are written) - the third of the register's three case formats
#                 [jobs/the-case-register-defines-cases-in-three-formats-so-every-case-count-is-format-dependent-2026-10-04];
#                 the spec named the first two, and a case written in this form IS registered, so leaving
#                 it out would report real cases as unresolved.
# Each form requires the id to END there: `| TC-R1` does not resolve TC-R1 from a `| TC-R15` row (C4).
#
# THE DENOMINATOR IS PRINTED FIRST, AND A BARE "0 unresolved" IS NOT THIS SCRIPT'S OUTPUT. The job measured
# that 28 of 63 build-owned finish-first jobs carry no case at all, so a pass over the citing jobs says
# nothing about the rest. The report prints jobs scanned, jobs citing at least one id, distinct ids cited,
# cited/total, unresolved/cited, and the NAMED unresolved list, in that order.
#
# USAGE
#   bash gates/audit/tracker-cited-ids.sh <jobs-dir> <repo-dir>
#   bash gates/audit/tracker-cited-ids.sh --selftest      the controls; exit 0 all pass, 1 any fail
# EXIT  0 unresolved at or under the committed ceiling | 1 above it, or a selftest failure
#       2 NOT CHECKED: no job documents, no readable origin/main register, or a usage error
# OVERRIDE, used by the selftest and by nothing else:  CT_TCI_CEIL=<n>
#
# ── THE COMMITTED CEILING. MEASURED, not chosen [#545]: the first run over the 209 ready jobs exported at
#    2026-10-29 at 9:3x am ET against origin/main 1507ade read 22 unresolved of 63 cited (50 of 209 jobs cite an
#    id); the job's outcome names all 22. TC-R17 and US-P01 are two of them and land with this file, so the first
#    run after #545 reaches main should read 20.
#    It may only fall. Lower it in a commit when the list shrinks.
TCI_CEIL=22
set -uo pipefail
CEIL="${CT_TCI_CEIL:-$TCI_CEIL}"

extract(){ # <jobs-dir>: prints "<job-id>\t<id>" for every id cited by a not-closed job, and a "#JOBS <n>" line
  node -e '
    const fs=require("fs"),path=require("path");const dir=process.argv[1];
    let n=0;const out=[];
    for(const f of fs.readdirSync(dir).filter(x=>x.endsWith(".json")).sort()){
      let d;try{d=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));}catch(e){continue;}
      if(d&&d.data&&typeof d.data==="object"&&!Array.isArray(d.data)&&("status" in d.data||"title" in d.data))d=d.data;
      if(!d||typeof d!=="object")continue;
      if(d.status==="closed")continue;
      n++;const id=f.replace(/\.json$/,"");
      for(const k of ["case","theTestCase","storyClause","theStoryClause"]){
        if(d[k]==null)continue;const s=typeof d[k]==="string"?d[k]:JSON.stringify(d[k]);
        const re=/(?:^|[^A-Za-z0-9-])((?:TC|US)-[A-Z]+-?[0-9]+[a-z]?)(?![A-Za-z0-9])/g;let m;
        while((m=re.exec(s)))out.push(id+"\t"+m[1]);
      }
    }
    process.stdout.write("#JOBS "+n+"\n"+[...new Set(out)].join("\n")+(out.length?"\n":""));
  ' "$1"
}

registers(){ # <repo-dir>: the two registers at origin/main, concatenated; non-zero if either is unreadable
  local r="$1" t s
  t="$(git -C "$r" show origin/main:claude/stories/TEST-CASES.md 2>/dev/null)" || return 1
  s="$(git -C "$r" show origin/main:claude/stories/USER-STORIES.md 2>/dev/null)" || return 1
  [ -n "$t" ] && [ -n "$s" ] || return 1
  printf '%s\n%s\n' "$t" "$s"
}

resolves(){ # <id> <register text>: 0 when a line begins with one of the three forms and the id ends there
  awk -v id="$1" '
    function ends(rest){ return rest=="" || rest ~ /^[^A-Za-z0-9]/ }
    { if (index($0,"| " id)==1 && ends(substr($0,3+length(id)))) { f=1; exit }
      if (match($0,/^#+ /) && index(substr($0,RLENGTH+1),id)==1 && ends(substr($0,RLENGTH+1+length(id)))) { f=1; exit }
      if (index($0,id "  ")==1) { f=1; exit } }
    END { exit f?0:1 }' <<<"$2"
}

audit(){ # <jobs-dir> <repo-dir>
  local jd="$1" rd="$2" ex reg njobs cites ids nids nciting unres nun u
  [ -d "$jd" ] || { echo "NOT CHECKED: $jd is not a directory of job documents"; return 2; }
  ex="$(extract "$jd")" || { echo "NOT CHECKED: the job documents could not be read"; return 2; }
  njobs="$(printf '%s\n' "$ex" | sed -n 's/^#JOBS //p')"
  [ "${njobs:-0}" -gt 0 ] 2>/dev/null || { echo "NOT CHECKED: no not-closed job document in $jd - an empty export is reported, never credited"; return 2; }
  reg="$(registers "$rd")" || { echo "NOT CHECKED: claude/stories/TEST-CASES.md or USER-STORIES.md is unreadable at origin/main in $rd"; return 2; }
  cites="$(printf '%s\n' "$ex" | grep -v '^#JOBS ' | grep . || true)"
  nciting="$(printf '%s\n' "$cites" | cut -f1 | grep . | sort -u | grep -c . || true)"
  ids="$(printf '%s\n' "$cites" | cut -f2 | grep . | sort -u || true)"
  nids="$(printf '%s\n' "$ids" | grep -c . || true)"
  unres=""; nun=0
  while IFS= read -r u; do
    [ -n "$u" ] || continue
    if ! resolves "$u" "$reg"; then unres="$unres $u"; nun=$((nun+1)); fi
  done <<<"$ids"
  echo "=== tracker-cited-ids: the case and story ids tracker jobs cite, joined to the registers at origin/main"
  echo "  jobs scanned (not closed)     $njobs"
  echo "  jobs citing at least one id   $nciting    (cited/total $nciting/$njobs)"
  echo "  distinct ids cited            $nids"
  echo "  unresolved                    $nun    (unresolved/cited $nun/$nids, ceiling $CEIL)"
  for u in $unres; do
    echo "    UNRESOLVED $u   cited by: $(awk -F'\t' -v i="$u" '$2==i && ++n<=3 {printf "%s ", $1}' <<<"$cites")"
  done
  if [ "$nun" -gt "$CEIL" ]; then
    echo "TRACKER-CITED-IDS RED: $nun unresolved, above the committed ceiling of $CEIL. A newly cited id names no register line."
    return 1
  fi
  [ "$nun" -lt "$CEIL" ] && echo "  CEILING CAN BE LOWERED: set TCI_CEIL=$nun in this file, in a commit, so it cannot rise again."
  echo "TRACKER-CITED-IDS OK: $nun unresolved of $nids cited, at or under the ceiling of $CEIL."
  return 0
}

selftest(){
  local T R J pass=0 fail=0 out rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch directory"; return 1; }
  trap 'rm -rf "$T"' RETURN
  R="$T/repo"; J="$T/jobs"; mkdir -p "$R/claude/stories" "$J"
  printf '| id | story | steps | expected | by | last |\n|---|---|---|---|---|---|\n| TC-R15 trailing words | US-R12 | s | e | b | l |\n| TC-SUITE-7 | US-BN-01 | s | e | b | l |\n\nTC-BN-001  US-BN-01 a block-form case\n' > "$R/claude/stories/TEST-CASES.md"
  printf '### US-R12 a story\n## US-BN-01 - another, at depth two\n' > "$R/claude/stories/USER-STORIES.md"
  ( cd "$R" && git init -q && git -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A \
      && git -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm fixture \
      && git update-ref refs/remotes/origin/main HEAD ) >/dev/null 2>&1
  ck(){ # <name> <want rc> <want substring> -- runs audit over $J and $R
    local name="$1" wrc="$2" want="$3"
    out="$(audit "$J" "$R" 2>&1)"; rc=$?
    if [ "$rc" = "$wrc" ] && { [ -z "$want" ] || case "$out" in *"$want"*) true;; *) false;; esac; }; then
      echo "  ok   $name"; pass=$((pass+1))
    else echo "  FAIL $name (rc $rc, wanted $wrc and '$want')"; printf '%s\n' "$out" | sed 's/^/       /' | tail -4; fail=$((fail+1)); fi
  }
  ck "C0 an EMPTY export is NOT CHECKED at exit 2, never credited" 2 "NOT CHECKED: no not-closed job"
  printf '{"status":"ready","case":"TC-R15 and TC-SUITE-7 and TC-BN-001","storyClause":"US-R12"}' > "$J/a.json"
  printf '{"status":"ready","title":"no case at all"}' > "$J/b.json"
  CEIL=0 ck "C1 ids in all three register forms RESOLVE, exit 0 at a ceiling of 0" 0 "unresolved                    0"
  CEIL=0 ck "C2 and the denominator is printed: 2 jobs scanned, 1 citing" 0 "cited/total 1/2"
  printf '{"status":"ready","theTestCase":"TC-R99"}' > "$J/c.json"
  CEIL=0 ck "C3 an injected UNRESOLVABLE id reddens at exit 1 above the ceiling" 1 "UNRESOLVED TC-R99"
  CEIL=1 ck "C3b and the same id at a ceiling of 1 is OK and still NAMED" 0 "UNRESOLVED TC-R99"
  rm -f "$J/c.json"; printf '{"status":"closed","case":"TC-R98"}' > "$J/d.json"
  CEIL=0 ck "C4a a CLOSED job is not read" 0 "unresolved                    0"
  rm -f "$J/d.json"; printf '{"status":"ready","case":"TC-R1"}' > "$J/e.json"
  CEIL=0 ck "C4 TC-R1 is NOT resolved by the TC-R15 row (the id must end where the form does)" 1 "UNRESOLVED TC-R1 "
  rm -f "$J/e.json"; printf '{"id":"x","data":{"status":"ready","case":"US-ZZ-09"},"version":3}' > "$J/f.json"
  CEIL=0 ck "C5 the ArtifactData envelope {id,data,version} is unwrapped" 1 "UNRESOLVED US-ZZ-09"
  rm -f "$J/f.json"
  ( cd "$R" && git update-ref -d refs/remotes/origin/main ) >/dev/null 2>&1
  CEIL=0 ck "C6 no origin/main register is NOT CHECKED at exit 2" 2 "unreadable at origin/main"
  echo "tracker-cited-ids selftest: $pass pass / $fail fail"
  [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  ""|-h|--help) sed -n '/^# USAGE/,/^# OVERRIDE/p' "$0"; exit 2 ;;
  *) [ $# -eq 2 ] || { echo "usage: $0 <jobs-dir> <repo-dir> | --selftest"; exit 2; }
     audit "$1" "$2"; exit $? ;;
esac
