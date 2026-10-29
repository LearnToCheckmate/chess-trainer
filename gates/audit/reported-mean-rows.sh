#!/usr/bin/env bash
# gates/audit/reported-mean-rows.sh - CAN A MEAN THIS PROJECT REPORTS ABOUT ITSELF BE RE-DERIVED FROM ROWS STORED BESIDE IT?
#
# WHY THIS EXISTS [#545, item (53) of directOpening_2026_10_29_batch5;
# jobs/tc-r16-a-reported-mean-must-be-re-derivable-from-stored-rows-2026-10-04]. Two benchmark runs reported +453.0 and
# +519.6 as one mean, stored no rows, and the disagreement cost six days to not settle; the cause, found only once rows
# were kept, was that each reading depended on how many analyses ran at once. So a report passes only if (C1) it stores
# its rows, N equals their count, and the mean it states equals the mean of (est - elo) over exactly those rows; and
# (C2) EVERY ROW names the conditions it was read under - build, geometry and concurrency - because a corpus with no
# concurrency recorded is as unauditable as a mean with no rows. TC-SUITE-267, story US-P02.
#
# INPUT is one tracker document exported as JSON (ArtifactData get with out_dir), since the reports live on the
# tracker and not in this repository. It reads the shape benchmark docs use: data.rows[] with estFromFormula and
# headerElo, data.N, and the stated mean as the first signed number in data.aggregatesReDerivedFromTheRowsAbove's
# READ_THIS_BEFORE_QUOTING_THE_MEAN, or a numeric data.mean. Field names are arguments to nothing: a report in another
# shape is exit 2, NOT CHECKED, never a pass.
# USAGE  bash gates/audit/reported-mean-rows.sh <doc.json>    exit 0 C1 and C2 hold | 1 either fails | 2 not checkable
#        bash gates/audit/reported-mean-rows.sh --selftest
set -uo pipefail

check(){ node -e '
  const fs=require("fs");let d;try{d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));d=d.data||d;}catch(e){console.log("NOT CHECKED: "+e.message);process.exit(2);}
  const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)process.exitCode=1;};
  const rows=Array.isArray(d.rows)?d.rows:null;
  let stated=typeof d.mean==="number"?d.mean:null;
  if(stated===null&&d.aggregatesReDerivedFromTheRowsAbove){const t=String(d.aggregatesReDerivedFromTheRowsAbove.READ_THIS_BEFORE_QUOTING_THE_MEAN||"");const m=/([+-]\d+(?:\.\d+)?)/.exec(t);if(m)stated=+m[1];}
  if(!rows){say(false,"C1 the report stores NO rows, so its mean cannot be re-derived (keys: "+Object.keys(d).slice(0,12).join(",")+")");console.log("  FAIL C2 not reachable without rows");process.exit(1);}
  if(stated===null){console.log("NOT CHECKED: rows are stored but no stated mean was found in a shape this reads");process.exit(2);}
  const use=rows.filter(r=>typeof r.estFromFormula==="number"&&typeof r.headerElo==="number");
  const mean=use.length?use.reduce((a,r)=>a+(r.estFromFormula-r.headerElo),0)/use.length:NaN;
  say(use.length>0&&use.length===rows.length,"C1a every stored row carries est and elo ("+use.length+" of "+rows.length+")");
  say(typeof d.N==="number"&&d.N===rows.length,"C1b the stated N equals the rows stored (N "+d.N+", rows "+rows.length+")");
  say(Math.abs(mean-stated)<0.05+1e-9,"C1c the stated mean "+stated+" equals the mean re-derived from those rows ("+mean.toFixed(2)+")");
  const want=["build","geometry","concurrency"];
  const missing=want.filter(k=>!rows.every(r=>r[k]!==undefined&&r[k]!==null&&r[k]!==""));
  say(missing.length===0,"C2 every row names its build, geometry and concurrency (missing on some row: "+(missing.join(",")||"none")+")");
' "$1"; }

selftest(){
  local T pass=0 fail=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  ck(){ check "$T/d.json" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; fail=$((fail+1)); fi; }
  R='{"estFromFormula":1100,"headerElo":1000,"build":"#545","geometry":"375x761","concurrency":1},{"estFromFormula":900,"headerElo":1000,"build":"#545","geometry":"375x761","concurrency":1},{"estFromFormula":1300,"headerElo":1000,"build":"#545","geometry":"375x761","concurrency":1}'
  printf '{"data":{"N":3,"mean":100,"rows":[%s]}}' "$R" > "$T/d.json"; ck "S0 rows that re-derive the mean, with conditions, hold" 0
  printf '{"data":{"N":3,"mean":120,"rows":[%s]}}' "$R" > "$T/d.json"; ck "S1 a stated mean the rows do not give reddens C1c" 1
  printf '{"data":{"N":4,"mean":100,"rows":[%s]}}' "$R" > "$T/d.json"; ck "S2 an N that is not the row count reddens C1b" 1
  printf '{"data":{"N":3,"mean":100}}' > "$T/d.json"; ck "S3 aggregates with no rows reddens C1" 1
  printf '{"data":{"N":3,"mean":100,"rows":[%s]}}' "$(printf '%s' "$R" | sed 's/,"concurrency":1//g')" > "$T/d.json"; ck "S4 rows with no concurrency redden C2" 1
  printf '{"data":{"N":3,"rows":[%s]}}' "$R" > "$T/d.json"; ck "S5 rows with no stated mean are NOT CHECKED (exit 2), not a pass" 2
  echo "reported-mean-rows selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in --selftest) selftest; exit $? ;; "") echo "usage: $0 <doc.json> | --selftest"; exit 2 ;; *) check "$1"; exit $? ;; esac
