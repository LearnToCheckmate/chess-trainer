#!/usr/bin/env bash
# gates/audit/geometry-sets.sh - DO THE REGISTER'S NAMED GEOMETRY SETS STILL EQUAL THE GATES THEY NAME?
#
# WHY THIS EXISTS [#545, item (13) of directOpening_2026_10_29_batch5;
# jobs/supported-geometry-names-two-different-sets-2026-09-28]. "Supported geometry" once resolved to two
# different sets, so no story clause using it could be decided. claude/stories/USER-STORIES.md now names each
# set ONCE, in its section THE GEOMETRY SETS, NAMED ONCE - THE DRILL SEVEN (gate 51's ALLGEOS, which that gate
# calls TA-7, prompts/test-authoring's name) and THE LESSON THREE (gate 48's GEOS) - and every clause says
# which one it means. Nothing checked that the named members stay equal to the gates, or that the undecidable
# phrase stays out of the clauses. This is that register-level case, TC-SUITE-253.
#
# WHAT IT ASSERTS, each its own line, from the committed files and nothing else:
#   G1 the DRILL SEVEN line in USER-STORIES.md lists exactly the seven WxH of gate 51's ALLGEOS, in order
#   G2 the LESSON THREE line lists exactly gate 48's GEOS, resolved through gates/lib.js's GEOS table
#   G4 gates/lib.js TA7 (THE DRILL SEVEN as GEOS names, added #545 item (40)) resolves to gate 51's ALLGEOS
#   G3 no line of USER-STORIES.md or TEST-CASES.md uses "supported geometry" except inside double quotes
#      (a quoted mention is the record of the old wording, which the register keeps on purpose)
#   G0 each set was FOUND before anything was compared [the empty-denominator class: reported, never credited]
# USAGE   bash gates/audit/geometry-sets.sh [repo-dir]      exit 0 all hold, 1 any fails, 2 a source unreadable
#         bash gates/audit/geometry-sets.sh --selftest      the controls
set -uo pipefail

check(){ # <repo-dir>
  ( cd "$1" && node -e '
    const fs=require("fs");const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)process.exitCode=1;};
    let us,tc,g51,g48,lib;
    try{us=fs.readFileSync("claude/stories/USER-STORIES.md","utf8");tc=fs.readFileSync("claude/stories/TEST-CASES.md","utf8");
        g51=fs.readFileSync("gates/regress/51-drill-explain-why.js","utf8");g48=fs.readFileSync("gates/regress/48-lesson-flow.js","utf8");
        lib=require(process.cwd()+"/gates/lib.js");}catch(e){console.log("NOT CHECKED: a source is unreadable - "+e.message);process.exit(2);}
    const wx=s=>(s.match(/\b\d{3}x\d{3}\b/g)||[]);
    const block=(name)=>{const i=us.indexOf("**"+name+"**");if(i<0)return null;const j=us.indexOf("\n- **",i+5);const k=us.indexOf("\n\n",i);
      const end=Math.min(j<0?1e9:j,k<0?1e9:k);const seg=us.slice(i,end);const b=seg.match(/\*\*((?:\d{3}x\d{3}[^*]*?)+)\*\*/g)||[];
      return b.map(wx).flat();};
    const d7=block("THE DRILL SEVEN"), l3=block("THE LESSON THREE");
    const m51=g51.match(/const ALLGEOS=\[([^\]]*)\]/), a51=m51?[...m51[1].matchAll(/w:(\d+),h:(\d+)/g)].map(m=>m[1]+"x"+m[2]):[];
    const m48=g48.match(/const GEOS=\[([^\]]*)\]/), k48=m48?[...m48[1].matchAll(/'"'"'([^'"'"']+)'"'"'/g)].map(m=>m[1]):[];
    const a48=k48.map(k=>lib.GEOS[k]?lib.GEOS[k].w+"x"+lib.GEOS[k].h:"<"+k+" not in GEOS>");
    say(!!d7&&d7.length>0&&a51.length>0, "G0a THE DRILL SEVEN line and gate 51 ALLGEOS were both FOUND ("+(d7||[]).length+" and "+a51.length+" members)");
    say(!!l3&&l3.length>0&&a48.length>0, "G0b THE LESSON THREE line and gate 48 GEOS were both FOUND ("+(l3||[]).length+" and "+a48.length+" members)");
    say(!!d7&&d7.join()===a51.join(), "G1 THE DRILL SEVEN equals gate 51 ALLGEOS member for member: register ["+(d7||[]).join(" ")+"] gate ["+a51.join(" ")+"]");
    say(!!l3&&l3.join()===a48.join(), "G2 THE LESSON THREE equals gate 48 GEOS through gates/lib.js: register ["+(l3||[]).join(" ")+"] gate ["+a48.join(" ")+"]");
    const t7=(lib.TA7||[]).map(k=>lib.GEOS[k]?lib.GEOS[k].w+"x"+lib.GEOS[k].h:"<"+k+" not in GEOS>");
    say(t7.length>0&&t7.join()===a51.join(), "G4 gates/lib.js TA7 resolves to gate 51 ALLGEOS member for member: lib ["+t7.join(" ")+"] gate ["+a51.join(" ")+"]");
    const live=[];for(const [f,t] of [["USER-STORIES.md",us],["TEST-CASES.md",tc]])t.split("\n").forEach((l,i)=>{
      const unq=l.replace(/"[^"]*"/g,"");if(/supported geometr/i.test(unq))live.push(f+":"+(i+1));});
    say(live.length===0, "G3 no clause uses \"supported geometry\" as a live term outside double quotes ("+live.length+(live.length?": "+live.join(" "):"")+")");
  ' )
}

selftest(){
  local T pass=0 fail=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 1; }
  trap 'rm -rf "$T"' RETURN
  ck(){ local name="$1" want="$2"; check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$want" ]; then echo "  ok   $name"; pass=$((pass+1)); else echo "  FAIL $name (exit $rc, wanted $want)"; fail=$((fail+1)); fi; }
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/claude/stories" "$T/r/gates/regress"; cp "$ROOTD/gates/lib.js" "$T/r/gates/lib.js"
        cp "$ROOTD/claude/stories/USER-STORIES.md" "$ROOTD/claude/stories/TEST-CASES.md" "$T/r/claude/stories/"
        cp "$ROOTD/gates/regress/51-drill-explain-why.js" "$ROOTD/gates/regress/48-lesson-flow.js" "$T/r/gates/regress/"; }
  mk; ck "S0 the real files as committed hold" 0
  mk; sed -i "s/const GEOS=\['se','kunal730','390'\]/const GEOS=['se','kunal730','430']/" "$T/r/gates/regress/48-lesson-flow.js"; ck "S1 gate 48 GEOS drifting from THE LESSON THREE reddens G2" 1
  mk; sed -i 's/{w:440,h:956/{w:428,h:926/' "$T/r/gates/regress/51-drill-explain-why.js"; ck "S2 gate 51 ALLGEOS drifting from THE DRILL SEVEN reddens G1" 1
  mk; printf '\n- A clause that holds at any supported geometry.\n' >> "$T/r/claude/stories/USER-STORIES.md"; ck "S3 an unquoted 'supported geometry' clause reddens G3" 1
  mk; printf '\n- A clause recording the old wording, "any supported geometry", in quotes.\n' >> "$T/r/claude/stories/USER-STORIES.md"; ck "S4 a QUOTED mention does not redden" 0
  mk; sed -i 's/\*\*THE DRILL SEVEN\*\*/**THE DRILL 7**/' "$T/r/claude/stories/USER-STORIES.md"; ck "S5 a renamed set heading is NOT credited (G0 reddens)" 1
  mk; sed -i "s/const TA7=\['se','w360'/const TA7=['se'/" "$T/r/gates/lib.js"; ck "S6 a TA7 that drops one geometry reddens G4" 1
  echo "geometry-sets selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") check "$ROOTD"; exit $? ;;
  *) check "$1"; exit $? ;;
esac
