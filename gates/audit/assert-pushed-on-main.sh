#!/usr/bin/env bash
# gates/audit/assert-pushed-on-main.sh <export-dir> [--since <ISO>] [--run <runId>] | --selftest  -> CLAUSE R34 ("prove the push
# landed") AS A RUNNABLE PREDICATE, the second assert of gates/contract-asserts.tsv that reads a tracker export.
#
# WHY [#550 test-system helper A; jobs/entry-three-contracts-become-runnable-asserts-2026-10-10, its outcome_550_part1 nextParts
# "more tree checks starting with R34"]. prompts/rule-contracts' R34 row (v26): artefact runledger, the check-out row's
# std.pushedShas, breach claimed-sha-not-on-main, "after every push, by git merge-base --is-ancestor". This reads a runledger
# EXPORT (ArtifactData query with out_dir: <export-dir>/runledger/*.json) and asks the repository: every element of every
# check-out row's std.pushedShas is a sha (7-40 hex), names a commit here, and that commit is an ancestor of origin/main.
# THE CLONE MUST BE COMPLETE. CLAUDE.md: on a shallow clone --is-ancestor returns false negatives and 128s, "A YES CAN BE TRUSTED
# AND A NO CANNOT". So a shallow repository is exit 2, never a verdict, and a sha this repository does not hold is reported
# UNRESOLVED and counted as a breach only on a complete clone (there it is a claimed sha that exists nowhere we can see).
# EXIT 0 every claimed sha in the window landed | 1 one did not (each named: not a sha, unresolved, or not on main) | 2 could not
# run: no export, no rows in the window, a shallow clone, or no origin/main.
# The count line: "pushed-on-main: <landed> pass / <broken> fail (<n> sha(s) on <r> check-out row(s), origin/main <sha12>)".
set -uo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
ROOT="${CT_PM_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

check(){ # check <export-dir> <since or empty> <run or empty>
  local exp="$1" since="$2" run="$3"
  [ -d "$exp/runledger" ] || { echo "PUSHED-ON-MAIN COULD NOT RUN - no export at $exp/runledger"; return 2; }
  [ "$(git -C "$ROOT" rev-parse --is-shallow-repository 2>/dev/null)" = false ] || { echo "PUSHED-ON-MAIN COULD NOT RUN - $ROOT is a shallow clone (or not a repository): an ancestry NO cannot be trusted there; git fetch --unshallow"; return 2; }
  local main; main="$(git -C "$ROOT" rev-parse --quiet --verify 'origin/main^{commit}' 2>/dev/null)" || { echo "PUSHED-ON-MAIN COULD NOT RUN - origin/main does not resolve here"; return 2; }
  local rows; rows="$(node -e '
    const fs=require("fs"),path=require("path");const [dir,since,run]=process.argv.slice(1);let out=[],n=0,found=false;
    for(const fn of fs.readdirSync(dir).filter(f=>f.endsWith(".json")).sort()){let d;try{d=JSON.parse(fs.readFileSync(path.join(dir,fn),"utf8"));}catch(e){continue;}
      d=d&&d.data?d.data:d;const id=fn.replace(/\.json$/,"");
      if(run){if(id!==run&&(d&&d.runId)!==run)continue;found=true;if(!d||!d.finishedAt){console.log("NOTOUT\t"+id);process.exit(0);}}
      if(!d||!d.finishedAt||(since&&String(d.finishedAt)<since))continue;n++;
      const s=d.std;const p=s&&typeof s==="object"?s.pushedShas:undefined;
      if(p===undefined){console.log("NOFIELD\t"+id);continue;}
      if(!Array.isArray(p)){console.log("NOTLIST\t"+id);continue;}
      for(const x of p)console.log("SHA\t"+id+"\t"+String(x).replace(/[\t\n]/g," "));}
    if(run&&!found)console.log("NOROW\t"+run);console.log("ROWS\t"+n);' "$exp/runledger" "$since" "$run")"
  case "$rows" in *"NOROW	"*) echo "PUSHED-ON-MAIN COULD NOT RUN - the export holds no row for $run"; return 2;; esac
  case "$rows" in *"NOTOUT	"*) echo "PUSHED-ON-MAIN COULD NOT RUN - the row $run is checked in and not yet checked out"; return 2;; esac
  local nrows; nrows="$(printf '%s\n' "$rows" | awk -F'\t' '$1=="ROWS"{print $2}')"
  [ "${nrows:-0}" -gt 0 ] || { echo "PUSHED-ON-MAIN COULD NOT RUN - no check-out row in the window, and an empty window is not a clearance"; return 2; }
  local p=0 f=0 n=0 kind id x full
  while IFS=$'\t' read -r kind id x; do
    case "$kind" in
      NOTLIST) f=$((f+1)); echo "pushed-on-main: NOT A LIST $id - std.pushedShas is not a list";;
      SHA) n=$((n+1))
        if ! printf '%s' "$x" | grep -qx '[0-9a-f]\{7,40\}'; then f=$((f+1)); echo "pushed-on-main: NOT A SHA $id - '${x:0:70}'"; continue; fi
        # AN AMBIGUOUS PREFIX IS ITS OWN REASON [#550 test-system helper A, on checker seat 2's note on d8a09fb]: git refuses a short
        # sha two objects share (exit 128, "short object ID ... is ambiguous" on stderr), and this line used to report it as "no such
        # commit" - the right verdict for the wrong reason. Without --quiet, so the reason is readable.
        local rerr; rerr="$(git -C "$ROOT" rev-parse --verify "$x^{commit}" 2>&1 >/dev/null)"
        full="$(git -C "$ROOT" rev-parse --quiet --verify "$x^{commit}" 2>/dev/null)" || {
          f=$((f+1))
          case "$rerr" in *ambiguous*) echo "pushed-on-main: AMBIGUOUS $id $x - more than one object here starts with it, so it names no one commit";;
            *) echo "pushed-on-main: UNRESOLVED $id $x - no such commit in this complete clone";; esac
          continue; }
        if git -C "$ROOT" merge-base --is-ancestor "$full" "$main" 2>/dev/null; then p=$((p+1)); else f=$((f+1)); echo "pushed-on-main: NOT ON MAIN $id $x - not an ancestor of origin/main ${main:0:12}"; fi;;
    esac
  done <<< "$rows"
  echo "pushed-on-main: $p pass / $f fail ($n sha(s) on $nrows check-out row(s)$([ -n "$run" ] && echo " for $run only"), origin/main ${main:0:12})"
  [ "$f" -eq 0 ]
}

selftest(){
  local T ok=0 bad=0; T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  for v in GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR; do unset "$v"; done
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok   $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  # a scratch repository of hand-written commit objects (hash-object; nothing is committed or signed): A <- B on "main", C off A
  local R="$T/repo"; git init -q -b main "$R" >/dev/null 2>&1 || { echo "selftest: no scratch repo"; return 2; }
  local TREE A B C; TREE="$(git -C "$R" mktree </dev/null)"
  mk(){ { echo "tree $TREE"; [ -n "$1" ] && echo "parent $1"; echo "author t <t@t> 1700000000 +0000"; echo "committer t <t@t> 1700000000 +0000"; echo; echo "$2"; } | git -C "$R" hash-object -t commit -w --stdin; }
  A="$(mk '' a)"; B="$(mk "$A" b)"; C="$(mk "$A" c)"
  git -C "$R" update-ref refs/remotes/origin/main "$B"; git -C "$R" update-ref refs/heads/main "$B"   # the second ref is what P11's shallow clone takes
  local E="$T/exp/runledger"; mkdir -p "$E"
  row(){ printf '{"id":"%s","data":{"finishedAt":"%s","std":{"pushedShas":%s}}}' "$1" "$2" "$3" > "$E/$1.json"; }
  rr(){ ( ROOT="$R" check "$T/exp" "${1:-}" "${2:-}" ) > "$T/last" 2>&1; echo $?; }
  row a__1 2026-11-10T00:00:00Z "[\"${B:0:7}\",\"$A\"]"; row a__2 2026-11-11T00:00:00Z '[]'
  chk "P1 every claimed sha is an ancestor of origin/main (and an empty list is a run that pushed nothing): 0" 0 "$(rr)"
  chk "P1b and the count line reads 2 pass / 0 fail on 2 rows" 1 "$(grep -c '^pushed-on-main: 2 pass / 0 fail (2 sha(s) on 2 check-out' "$T/last")"
  row b__3 2026-11-12T00:00:00Z "[\"$C\"]"
  chk "P2 a claimed sha off main (a per-run branch the push never reached) refuses: 1, named" "1 1" "$(rr) $(grep -c "NOT ON MAIN b__3 $C" "$T/last")"
  row b__3 2026-11-12T00:00:00Z '["18bfe35 - RECORDS ONLY, a fast-forward"]'
  chk "P3 a sentence in pushedShas is NOT A SHA: 1" "1 1" "$(rr) $(grep -c 'NOT A SHA b__3' "$T/last")"
  row b__3 2026-11-12T00:00:00Z '["deadbeefdeadbeef"]'
  chk "P4 a sha the complete clone does not hold is UNRESOLVED: 1" "1 1" "$(rr) $(grep -c 'UNRESOLVED b__3' "$T/last")"
  row b__3 2026-11-12T00:00:00Z '"none"'
  chk "P5 pushedShas that is not a list: 1" "1 1" "$(rr) $(grep -c 'NOT A LIST b__3' "$T/last")"
  rm -f "$E/b__3.json"
  chk "P6 --run on a landed row: 0, that row only" "0 1" "$(rr '' a__1) $(grep -c 'for a__1 only' "$T/last")"
  printf '{"id":"c__4","data":{"startedAt":"2026-11-13T00:00:00Z"}}' > "$E/c__4.json"
  chk "P7 --run on a row not yet checked out: 2" 2 "$(rr '' c__4)"
  chk "P8 --run on a row the export lacks: 2" 2 "$(rr '' zz__9)"
  chk "P9 a window with no check-out row: 2" 2 "$(rr 2026-12-01T00:00:00Z)"
  chk "P10 no export: 2" 2 "$( ( ROOT="$R" check "$T/none" '' '' ) >/dev/null 2>&1; echo $?)"
  local SH="$T/shallow"; git clone -q --depth 1 "file://$R" "$SH" >/dev/null 2>&1 || true
  if [ "$(git -C "$SH" rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
    chk "P11 a SHALLOW clone is could-not-run (2), never a verdict" 2 "$( ( ROOT="$SH" check "$T/exp" '' '' ) >/dev/null 2>&1; echo $?)"
  else chk "P11 the shallow fixture was built" shallow "not-shallow"; fi
  # P13 AN AMBIGUOUS 7-HEX PREFIX (checker seat 2's recipe, chk2/r34amb): two commits on A whose ids share 7 hex digits, found by a
  # birthday search over their messages; the claimed prefix is AMBIGUOUS, not UNRESOLVED, and it refuses
  local IJ I J X Y; IJ="$(python3 -I -c '
import hashlib,sys
tree,parent=sys.argv[1],sys.argv[2];seen={};i=0
while True:
    b=("tree %s\nparent %s\nauthor t <t@t> 1700000000 +0000\ncommitter t <t@t> 1700000000 +0000\n\nm%d\n"%(tree,parent,i)).encode()
    h=hashlib.sha1(b"commit %d\0"%len(b)+b).hexdigest()[:7]
    if h in seen: print(seen[h],i); break
    seen[h]=i; i+=1' "$TREE" "$A")"
  read -r I J <<<"$IJ"; X="$(mk "$A" "m$I")"; Y="$(mk "$A" "m$J")"
  if [ "${X:0:7}" = "${Y:0:7}" ]; then
    row b__3 2026-11-12T00:00:00Z "[\"${X:0:7}\"]"
    chk "P13 a 7-hex prefix two commits share is AMBIGUOUS, not UNRESOLVED, and refuses: 1" "1 1 0" "$(rr) $(grep -c "AMBIGUOUS b__3 ${X:0:7}" "$T/last") $(grep -c 'UNRESOLVED b__3' "$T/last")"
  else chk "P13 the birthday search built two commits sharing a prefix" shared "${X:0:7}/${Y:0:7}"; fi
  # P12 THE CHECK WITH ITS SUBJECT REMOVED: a copy whose ancestry test always holds passes P2's off-main sha
  row b__3 2026-11-12T00:00:00Z "[\"$C\"]"
  sed 's/if git -C "\$ROOT" merge-base --is-ancestor "\$full" "\$main" 2>\/dev\/null; then/if true; then/' "$SELF" > "$T/defanged.sh"
  if cmp -s "$SELF" "$T/defanged.sh"; then chk "P12 the defang edit applied" applied missed
  else chk "P12 control: with the ancestry test defanged, the off-main sha PASSES (exit 0)" 0 "$(CT_PM_ROOT="$R" bash "$T/defanged.sh" "$T/exp" >/dev/null 2>&1; echo $?)"; fi
  echo "pushed-on-main selftest: $ok pass / $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  ""|-*) echo "usage: gates/audit/assert-pushed-on-main.sh <export-dir> [--since <ISO>] [--run <runId>] | --selftest"; exit 2 ;;
esac
EXP="$1"; shift; SINCE=""; RUN=""
while [ $# -gt 0 ]; do case "$1" in --since) SINCE="${2:-}"; shift 2;; --run) RUN="${2:-}"; shift 2;; *) echo "unknown argument $1"; exit 2;; esac; done
check "$EXP" "$SINCE" "$RUN"; exit $?
