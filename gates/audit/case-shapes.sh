#!/usr/bin/env bash
# gates/audit/case-shapes.sh - IS EVERY CASE IN THE REGISTER DEFINED IN A SHAPE THE REGISTER DECLARES, AND HOW MANY ARE THERE?
#
# WHY THIS EXISTS [#545, item (89) of directOpening_2026_10_29_batch5;
# jobs/the-case-register-defines-cases-in-three-formats-so-every-case-count-is-format-dependent-2026-10-04]. The
# register's contract line named ONE shape (the pipe row), cases were defined in THREE, and three lanes reading the same
# file published 14, 31 and 55 as its case count. This run took the job's second branch: the contract line now NAMES all
# three shapes, and this script is the one counter, so a count no longer depends on which parse a reader happened to use.
#
# THE FOUR DECLARED SHAPES, each a definition only at the START of a line (ID = TC-<LETTERS>[-]<digits>[letter]).
# The job counted three; building this found a FOURTH, the ### heading, and three cases (TC-R51, TC-R60, TC-R62) that
# exist ONLY as headings - so TC-R51, which the TC-R gap paragraph calls 'reserved', is in fact defined:
#   ROW   | ID |                 a pipe-table row, the column contract
#   BARE  ID<two or more spaces> a bare entry: the id, a gap, then the story and the text (TC-PL-031.., TC-R30, ..)
#   BOLD  **ID - ...  or  **ID (...  a bold paragraph opening (TC-GL-001, TC-GL-002, TC-R41, TC-R42)
#   HEAD  ### ID (...            a heading opening a case's own section (TC-R51, TC-R58, TC-R60, TC-R62, TC-R63, TC-R64)
# WHAT IT ASSERTS:
#   S0 each shape was FOUND (an empty denominator is reported, never credited)
#   S1 no id is DEFINED in two of ROW, BARE and BOLD (a second definition is a fork of one case). A HEAD may sit
#      over ONE of them: that is a section title over its own row or entry, which is how TC-R58, R63 and R64 are written
#   S2 every id that OPENS a line in any other way is on the RESERVED list below - a mention, not a definition
#   S6 every ROW line defines a DISTINCT id, so the row count and the case count are one number [#546, item (88); the
#      job's testCase asks that |P| equal the rows the section tables contain]. A second row for one id is a fork of a
#      case inside ONE shape, which S1 cannot see because it compares shapes. Measured at #546: 344 row lines, 344 ids.
# and it prints the total, the one number to quote: `bash gates/audit/case-shapes.sh | tail -1`.
# USAGE  bash gates/audit/case-shapes.sh [repo-dir]   exit 0 holds | 1 a check fails | 2 the register is unreadable
#        bash gates/audit/case-shapes.sh --selftest
set -uo pipefail
# RESERVED: ids that open a line in prose and are deliberately defined nowhere. Each is named with its reason.
# EMPTY at #545: the one candidate, TC-R51, turned out to be defined, by a heading (see HEAD above).
RESERVED=''

check(){ ( cd "$1" && node -e '
  const fs=require("fs");let t;try{t=fs.readFileSync("claude/stories/TEST-CASES.md","utf8");}catch(e){console.log("NOT CHECKED: "+e.message);process.exit(2);}
  const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)process.exitCode=1;};
  const ID="TC-[A-Z]+-?[0-9]+[a-z]?";const L=t.split("\n");
  const row=new Map(),bare=new Map(),bold=new Map(),head=new Map(),open=new Map();
  const add=(m,id,i)=>{if(!m.has(id))m.set(id,[]);m.get(id).push(i+1);};
  L.forEach((l,i)=>{let m;
    if((m=l.match(new RegExp("^\\|\\s*("+ID+")\\s*\\|"))))add(row,m[1],i);
    else if((m=l.match(new RegExp("^("+ID+") {2,}"))))add(bare,m[1],i);
    else if((m=l.match(new RegExp("^\\*\\*("+ID+")( - | \\()"))))add(bold,m[1],i);
    else if((m=l.match(new RegExp("^#{2,4} ("+ID+") \\("))))add(head,m[1],i);
    else if((m=l.match(new RegExp("^(?:#+\\s*|\\*\\*|[-*]\\s+)?\\s*("+ID+")\\b"))))add(open,m[1],i);});
  say(row.size>0&&bare.size>0&&bold.size>0&&head.size>0,"S0 all four declared shapes were FOUND (row "+row.size+", bare "+bare.size+", bold "+bold.size+", head "+head.size+")");
  const multi=[];for(const id of new Set([...row.keys(),...bare.keys(),...bold.keys()])){const n=[row,bare,bold].filter(m=>m.has(id)).length;if(n>1)multi.push(id+" @ "+[row,bare,bold].map(m=>(m.get(id)||[]).join("/")).join(" | "));}
  say(multi.length===0,"S1 no id is defined in two shapes ("+multi.length+(multi.length?": "+multi.join("; "):"")+")");
  const all=new Set([...row.keys(),...bare.keys(),...bold.keys(),...head.keys()]);const res=new Set((process.env.CS_RESERVED||"").split(/\s+/).filter(Boolean));
  const stray=[...open.keys()].filter(id=>!all.has(id)&&!res.has(id));
  say(stray.length===0,"S2 every id opening a line outside the four shapes is a declared reservation ("+stray.length+(stray.length?": "+stray.map(id=>id+"@"+open.get(id).join("/")).join(" "):"")+")");
  const rowLines=[...row.values()].reduce((n,v)=>n+v.length,0);const dupRows=[...row.entries()].filter(([,v])=>v.length>1);
  say(row.size>0&&rowLines===row.size,"S6 every ROW line defines a distinct id - "+rowLines+" row lines, "+row.size+" distinct row ids"+(dupRows.length?": "+dupRows.map(([id,v])=>id+"@"+v.join("/")).join(" "):"")+" [#546, item (88)]");
  const headOnly=[...head.keys()].filter(id=>!row.has(id)&&!bare.has(id)&&!bold.has(id));
  console.log("CASES "+all.size+" defined (row "+row.size+", bare "+bare.size+", bold "+bold.size+", head "+head.size+" of which "+headOnly.length+" heading-only: "+headOnly.join(" ")+"), "+res.size+" reserved");
' ); }

selftest(){
  local T p=0 f=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 1; }
  trap 'rm -rf "$T"' RETURN
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/claude/stories"; cp "$ROOTD/claude/stories/TEST-CASES.md" "$T/r/claude/stories/"; }
  ck(){ CS_RESERVED="$RESERVED" check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; p=$((p+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; f=$((f+1)); fi; }
  mk; ck "S0 the committed register holds" 0
  mk; printf '\nTC-ZZ-001  US-X, a bare definition of a case that also has a row\n| TC-ZZ-001 | US-X | a | b | c | d |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S1 one id defined as a row AND a bare entry reddens" 1
  mk; printf '\nTC-ZZ-002 is mentioned at the start of a line and defined nowhere\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S2 an undeclared line-opening id reddens" 1
  mk; sed -i -E 's/^\*\*(TC-[A-Z]+-?[0-9]+[a-z]?)( - | \()/\1:\2/' "$T/r/claude/stories/TEST-CASES.md"; ck "S3 a register with no BOLD-shape entry is NOT credited (S0 reddens)" 1
  mk; printf '\n### TC-ZZ-005 (US-X) a heading over its own row\n| TC-ZZ-005 | US-X | a | b | c | d |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S5 a HEAD over one row is a section title and holds" 0
  mk; printf '\n## TC-ZZ-003: a FIFTH shape, a heading with no (story)\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S4 a case opened in an undeclared fifth shape reddens via S2" 1
  mk; printf '\n| TC-ZZ-006 | US-X | a | b | c | d |\n| TC-ZZ-006 | US-X | e | f | g | h |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S6 one id given TWO rows reddens (one shape, so S1 is blind to it)" 1
  echo "case-shapes selftest: $p pass / $f fail"; [ "$f" -eq 0 ]
}

ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") CS_RESERVED="$RESERVED" check "$ROOTD"; exit $? ;;
  *) CS_RESERVED="$RESERVED" check "$1"; exit $? ;;
esac
