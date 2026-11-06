#!/usr/bin/env bash
# gates/audit/case-shapes.sh - IS EVERY CASE IN THE REGISTER DEFINED IN A SHAPE THE REGISTER DECLARES, AND HOW MANY ARE THERE?
#
# WHY THIS EXISTS [#545, item (89) of directOpening_2026_10_29_batch5;
# jobs/the-case-register-defines-cases-in-three-formats-so-every-case-count-is-format-dependent-2026-10-04]. The
# register's contract line named ONE shape (the pipe row), cases were defined in THREE, and three lanes reading the same
# file published 14, 31 and 55 as its case count. This run took the job's second branch: the contract line now NAMES all
# three shapes, and this script is the one counter, so a count no longer depends on which parse a reader happened to use.
#
# ONE SHAPE SINCE #549 [item (72); the job's first branch, which #545 and #546 left unbuilt]. #545 found FOUR shapes
# (ROW, BARE `ID<2+ spaces>`, BOLD `**ID - ` / `**ID (`, HEAD `### ID (`) and declared them; #549 converted the 19 bare,
# 4 bold and 3 heading-only definitions into rows by a kept script, so the register now obeys its own column contract:
#   ROW   | ID |  or  | ID (...) |   a pipe-table row; the first cell may carry a parenthetical note (TC-R15, TC-R17)
#   HEAD  ### ID (...            allowed ONLY as the title of a section over a ROW of the same id - never a definition
# ID is TC-<LETTERS/DIGITS> then any -<part>, so the NAMED ids (TC-PZ-BURST, TC-R64-D12, TC-R40-HELP-REST, TC-HM-DISC)
# count too: until #549 the pattern was TC-<LETTERS>[-]<digits>[letter] and 13 named rows were outside every count,
# which made "grep '^| *TC-'" and this tool disagree by 13 on the same file.
# WHAT IT ASSERTS:
#   S0 the ROW shape was FOUND (an empty denominator is reported, never credited)
#   S1 every HEAD sits over a ROW of its own id (a heading-only case is the fourth shape coming back)
#   S2 every id that OPENS a line in any other way - a bare entry or a bold paragraph included - is on the RESERVED list
#      below, a mention and not a definition
#   S6 every ROW line defines a DISTINCT id, so the row count and the case count are one number [#546, item (88)]. The
#      count is not written here: the tool prints it (`bash gates/audit/case-shapes.sh | tail -1`).
#   S9 the row count equals the plain `^| *TC-` line count, so the one-shape claim is checked, not asserted [#549]
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
  const ID="TC-[A-Z0-9]+[a-z]?(?:-[A-Za-z0-9]+)*";const L=t.split("\n");
  const row=new Map(),head=new Map(),open=new Map();let plain=0;
  const add=(m,id,i)=>{if(!m.has(id))m.set(id,[]);m.get(id).push(i+1);};
  L.forEach((l,i)=>{let m;if(/^\|\s*TC-/.test(l))plain++;
    if((m=l.match(new RegExp("^\\|\\s*("+ID+")(?:\\s*\\||\\s+\\()"))))add(row,m[1],i);
    else if((m=l.match(new RegExp("^#{2,4} ("+ID+") \\("))))add(head,m[1],i);
    else if((m=l.match(new RegExp("^(?:#+\\s*|\\*\\*|[-*]\\s+|\\|\\s*)?\\s*("+ID+")\\b"))))add(open,m[1],i);});
  say(row.size>0,"S0 the ROW shape was FOUND (row "+row.size+", head "+head.size+")");
  const orphanHead=[...head.keys()].filter(id=>!row.has(id));
  say(orphanHead.length===0,"S1 every ### heading sits over a ROW of its own id ("+orphanHead.length+(orphanHead.length?": "+orphanHead.map(id=>id+"@"+head.get(id).join("/")).join(" "):"")+") [#549, item (72)]");
  const res=new Set((process.env.CS_RESERVED||"").split(/\s+/).filter(Boolean));
  const stray=[...open.keys()].filter(id=>!row.has(id)&&!res.has(id));
  say(stray.length===0,"S2 every id opening a line outside a ROW is a declared reservation - a bare or bold definition is not ("+stray.length+(stray.length?": "+stray.map(id=>id+"@"+open.get(id).join("/")).join(" "):"")+")");
  const rowLines=[...row.values()].reduce((n,v)=>n+v.length,0);const dupRows=[...row.entries()].filter(([,v])=>v.length>1);
  say(row.size>0&&rowLines===row.size,"S6 every ROW line defines a distinct id - "+rowLines+" row lines, "+row.size+" distinct row ids"+(dupRows.length?": "+dupRows.map(([id,v])=>id+"@"+v.join("/")).join(" "):"")+" [#546, item (88)]");
  say(rowLines===plain,"S9 the case rows equal the plain ^| *TC- line count ("+rowLines+" of "+plain+") [#549, item (72)]");
  console.log("CASES "+row.size+" defined (one shape: row; "+head.size+" headed by a ### section title), "+res.size+" reserved");
' ); }

selftest(){
  local T p=0 f=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 1; }
  trap 'rm -rf "$T"' RETURN
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/claude/stories"; cp "$ROOTD/claude/stories/TEST-CASES.md" "$T/r/claude/stories/"; }
  ck(){ CS_RESERVED="$RESERVED" check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; p=$((p+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; f=$((f+1)); fi; }
  mk; ck "S0 the committed register holds" 0
  mk; printf '\nTC-ZZ-001  US-X, a bare definition of a case\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S2 a BARE definition is no longer a shape and reddens" 1
  mk; printf '\n**TC-ZZ-009 - a bold definition of a case.** US-X.\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S2b a BOLD definition is no longer a shape and reddens" 1
  mk; printf '\nTC-ZZ-002 is mentioned at the start of a line and defined nowhere\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S2c an undeclared line-opening id reddens" 1
  mk; sed -i -E 's/^\| *TC-/| XC-/' "$T/r/claude/stories/TEST-CASES.md"; ck "S3 a register with no ROW is NOT credited (S0 reddens)" 1
  mk; printf '\n### TC-ZZ-005 (US-X) a heading over its own row\n| TC-ZZ-005 | US-X | a | b | c | d |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S5 a HEAD over one row is a section title and holds" 0
  mk; printf '\n### TC-ZZ-010 (US-X) a heading with no row under it\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S1 a heading-only case reddens" 1
  mk; printf '\n## TC-ZZ-003: a heading with no (story)\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S4 a case opened in an undeclared shape reddens via S2" 1
  mk; printf '\n| TC-ZZ-006 | US-X | a | b | c | d |\n| TC-ZZ-006 | US-X | e | f | g | h |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S6 one id given TWO rows reddens" 1
  mk; printf '\n| TC-ZZ-007 (a note in the first cell) | US-X | a | b | c | d |\n| TC-ZZ-007 | US-X | e | f | g | h |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S7 a parenthetical first cell is a ROW, so its duplicate reddens S6" 1
  mk; printf '\n| TC-ZZ-008: a pipe line opened some other way | a |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S8 a pipe line opening with an id in no declared shape reddens" 1
  mk; printf '\n| TC-ZZ-NAMED | US-X | a | b | c | d |\n| TC-ZZ-NAMED | US-X | e | f | g | h |\n' >> "$T/r/claude/stories/TEST-CASES.md"; ck "S10 a NAMED id is counted, so its duplicate row reddens S6" 1
  echo "case-shapes selftest: $p pass / $f fail"; [ "$f" -eq 0 ]
}

ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") CS_RESERVED="$RESERVED" check "$ROOTD"; exit $? ;;
  *) CS_RESERVED="$RESERVED" check "$1"; exit $? ;;
esac
