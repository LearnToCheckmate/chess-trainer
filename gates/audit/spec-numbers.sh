#!/usr/bin/env bash
# gates/audit/spec-numbers.sh - DOES EVERY COUNT THE SPEC STATES ABOUT THE SUITE EQUAL THE ARTEFACT IT CITES?
#
# WHY [#545, item (42); jobs/spec-numbers-disagree-with-the-artefact-they-cite-2026-09-27]. Three numbers the spec
# stated about the suite were wrong, all three typed from a run and wrong by the time the same commit landed: "Twelve
# screens" over a SCREENS table of thirteen, "the other 1961 assertions" (#422's total) in a section executed at #423,
# and a story threshold of 1px over a gate comparing 1.05 against a rounded value. #545 removed the typed counts and
# made the gate compare the raw spread with 1.0; this is what keeps them from coming back. It reads committed files
# only - no browser - so it is an operator audit and not a gate.
#   N1 every typed screen count in the STEPS column of the TC-INV rows, and in the invariants header, of TEST-CASES.md ("12 screens", "Twelve
#      screens", "the 13 declared screens") equals the number of rows in gate 26's SCREENS table
#   N2 every "<N> assertions in this suite" in USER-STORIES.md equals the PASS footer of the newest archived full log
#   N3 US-INV-02's "within <N>px" equals the number gate 26's invariant-2 filter compares the raw spread against
#   N0 each artefact was FOUND (SCREENS rows > 0, a newest log with a footer, the filter literal) - never credited empty
# USAGE  bash gates/audit/spec-numbers.sh [repo-dir]   exit 0 holds, 1 a number disagrees, 2 a source unreadable
#        bash gates/audit/spec-numbers.sh --selftest
set -uo pipefail

check(){ ( cd "$1" && node -e '
  const fs=require("fs");const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)process.exitCode=1;};
  let tc,us,g;try{tc=fs.readFileSync("claude/stories/TEST-CASES.md","utf8");us=fs.readFileSync("claude/stories/USER-STORIES.md","utf8");g=fs.readFileSync("gates/regress/26-invariants.js","utf8");}
  catch(e){console.log("NOT CHECKED: "+e.message);process.exit(2);}
  const i=g.indexOf("const SCREENS=[");const j=i<0?-1:g.indexOf("\n];",i);
  const nScreens=i<0||j<0?0:(g.slice(i,j).match(/^\s*\[\x27[a-z0-9-]+\x27,/gm)||[]).length;
  const W={twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18};
  const lines=tc.split("\n").filter(l=>/^\| TC-INV-0/.test(l)||/^Geometries: 320x568/.test(l));
  // THE STEPS COLUMN ONLY (the 3rd cell), and the header line: those are where the spec states what the case does.
  // The expected and result cells record dated measurements ("13 of 13 screens walked" at #404), which were true when
  // taken and are history, not claims about today.
  const typed=[];for(const l0 of lines){const l=/^\| /.test(l0)?(l0.split("|")[3]||""):l0;const re=/\b(\d{1,2}|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)(?:[ -]declared)?[ -]screens?\b/gi;let m;
    while((m=re.exec(l))){const v=/^\d+$/.test(m[1])?+m[1]:W[m[1].toLowerCase()];typed.push({v,at:(l0.match(/^\| (TC-INV-\S+)/)||[0,"Geometries line"])[1],txt:m[0]});}}
  say(nScreens>0,"N0a gate 26 SCREENS table FOUND ("+nScreens+" rows)");
  const badS=typed.filter(t=>t.v!==nScreens);
  say(nScreens>0&&badS.length===0,"N1 every typed screen count in the TC-INV rows equals SCREENS ("+nScreens+"): "+typed.length+" typed, "+badS.length+" wrong"+(badS.length?" - "+badS.map(t=>t.at+" says \x22"+t.txt+"\x22").join("; "):""));
  const logs=fs.existsSync("claude/agents/gatelogs")?fs.readdirSync("claude/agents/gatelogs").filter(f=>/^\d+[a-z]?-all\.log$/.test(f)):[];
  logs.sort((a,b)=>parseInt(a)-parseInt(b)||a.localeCompare(b));const newest=logs[logs.length-1];
  const foot=newest?((fs.readFileSync("claude/agents/gatelogs/"+newest,"utf8").match(/regression assertions \(PASS lines\): (\d+)/)||[])[1]):undefined;
  say(!!foot,"N0b the newest archived full log has a PASS footer ("+(newest||"none")+": "+(foot||"none")+")");
  const claims=[...us.matchAll(/\b(\d{3,5})\s+assertions in this suite\b/g)].map(m=>+m[1]);
  const badA=claims.filter(c=>""+c!==foot);
  say(!!foot&&badA.length===0,"N2 every \x22<N> assertions in this suite\x22 in USER-STORIES.md equals the footer of "+newest+", "+foot+": "+claims.length+" stated, "+badA.length+" wrong"+(badA.length?" ("+badA.join(", ")+")":""));
  const h=us.indexOf("### US-INV-02 ");const e=h<0?-1:us.indexOf("\n### ",h+5);const sec=h<0?"":us.slice(h,e<0?undefined:e);
  const story=(sec.replace(/\n\s*/g," ").match(/within (\d+(?:\.\d+)?)px/)||[])[1];
  const lit=(g.match(/const spread=iv\.rows\.filter\(r=>r\.rawSpread>(\d+(?:\.\d+)?)\)/)||[])[1];
  say(!!story&&!!lit,"N0c US-INV-02 threshold and gate 26 filter literal both FOUND (story "+(story||"none")+"px, gate "+(lit||"none")+")");
  say(!!story&&!!lit&&parseFloat(story)===parseFloat(lit),"N3 US-INV-02 says within "+story+"px and gate 26 compares the RAW spread against "+lit);
' ); }

selftest(){
  local T pass=0 fail=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/claude/stories" "$T/r/gates/regress" "$T/r/claude/agents/gatelogs"
        cp "$ROOTD/claude/stories/TEST-CASES.md" "$ROOTD/claude/stories/USER-STORIES.md" "$T/r/claude/stories/"
        cp "$ROOTD/gates/regress/26-invariants.js" "$T/r/gates/regress/"
        printf 'GATES GREEN #999\nregression assertions (PASS lines): 4242\n' > "$T/r/claude/agents/gatelogs/999-all.log"; }
  ck(){ check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; fail=$((fail+1)); fi; }
  mk; ck "S0 the committed files hold" 0
  mk; sed -i '0,/^| TC-INV-02a | US-INV-02 | at every screen/s//| TC-INV-02a | US-INV-02 | at each of 12 screens/' "$T/r/claude/stories/TEST-CASES.md"; ck "S1 a typed '12 screens' in a TC-INV row reddens N1" 1
  mk; printf '\nThe other 1961 assertions in this suite each pin a number.\n' >> "$T/r/claude/stories/USER-STORIES.md"; ck "S2 a stale suite total reddens N2" 1
  mk; printf '\nThe other 4242 assertions in this suite each pin a number.\n' >> "$T/r/claude/stories/USER-STORIES.md"; ck "S3 a suite total that EQUALS the newest footer does not redden" 0
  mk; sed -i 's/r=>r\.rawSpread>1\.0)/r=>r.rawSpread>1.05)/' "$T/r/gates/regress/26-invariants.js"; ck "S4 a gate literal of 1.05 against a 1px story reddens N3" 1
  mk; rm "$T/r/claude/agents/gatelogs/999-all.log"; ck "S5 no archived log is NOT credited (N0b reddens)" 1
  echo "spec-numbers selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}
ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in --selftest) selftest; exit $? ;; "") check "$ROOTD"; exit $? ;; *) check "$1"; exit $? ;; esac
