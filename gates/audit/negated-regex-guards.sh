#!/usr/bin/env bash
# gates/audit/negated-regex-guards.sh - IS EVERY NEGATED REGEX INSIDE A GATE ASSERTION REVIEWED FOR WHAT IT CANNOT SEE?
#
# WHY THIS EXISTS [#545, item (49) of directOpening_2026_10_29_batch5;
# jobs/sweep-for-regexes-checked-in-one-direction-only-2026-10-02]. A pattern checked only for what it wrongly MATCHES
# fails in two different ways depending on its sign. Required to match (/x/.test(s)), a miss turns the gate RED - loud.
# NEGATED (!/x/.test(s)), a miss turns it GREEN: the assertion certifies that something is absent because the pattern
# cannot see the form it takes. #545 found four of those by diffing each pattern against the app's own strings -
# gate 33 /Blunder|Mistake|Inaccuracy/ beside a ten-grade ladder that has Miss, gate 29 /Draw/ beside 'Stalemate' and
# '½–½', gate 65 /=Q/ beside =R/=B/=N, gate 16 /Strength/ beside 'Draw — strength stays'. This lists every negated
# regex on a line that asserts (L.say) in gates/regress/*.js and requires a row for it, keyed on FILE and PATTERN (not
# line), in claude/agents/negated-regex-guards.tsv, whose verdict says what corpus it was checked against. TC-SUITE-266.
#
# USAGE  bash gates/audit/negated-regex-guards.sh [repo-dir]   exit 0 every site reviewed | 1 an unreviewed site, or a row
#        bash gates/audit/negated-regex-guards.sh --selftest   naming no site | 2 a source unreadable
set -uo pipefail

check(){ ( cd "$1" && node -e '
  const fs=require("fs");let reg;
  try{reg=fs.readFileSync("claude/agents/negated-regex-guards.tsv","utf8");}catch(e){console.log("NOT CHECKED: "+e.message);process.exit(2);}
  const rows=new Map();for(const l of reg.split("\n")){if(!l||l[0]==="#")continue;const f=l.split("\t");if(f.length>=3)rows.set(f[0]+"\t"+f[1],f[2]);}
  const sites=new Map();let other=0;
  for(const fn of fs.readdirSync("gates/regress").filter(x=>/\.js$/.test(x)).sort()){
    const src=fs.readFileSync("gates/regress/"+fn,"utf8");
    for(const line of src.split("\n")){const re=/!\s*(\/(?:[^\/\\\n]|\\.)+\/[gimsuy]*)\.test\(/g;let m;
      while((m=re.exec(line))){if(/L\.say\(/.test(line)){const k="gates/regress/"+fn+"\t"+m[1];sites.set(k,(sites.get(k)||0)+1);}else other++;}}}
  const unrev=[...sites.keys()].filter(k=>!rows.has(k)),dead=[...rows.keys()].filter(k=>!sites.has(k));
  console.log("negated regex tests on an asserting line: "+[...sites.values()].reduce((a,b)=>a+b,0)+" at "+sites.size+" (file, pattern) sites; "+other+" more on non-asserting lines (filters, guards) are not held here");
  for(const k of unrev)console.log("  UNREVIEWED "+k.replace("\t","  "));
  for(const k of dead)console.log("  ROW NAMES NO SITE "+k.replace("\t","  "));
  if(sites.size===0){console.log("  FAIL no site found at all - an empty denominator is not a pass");process.exit(1);}
  console.log((unrev.length||dead.length)?"RED: "+unrev.length+" unreviewed, "+dead.length+" stale row(s)":"OK: every site has a reviewed row");
  process.exit((unrev.length||dead.length)?1:0);' ); }

selftest(){
  local T pass=0 fail=0 rc ROOTD
  ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/gates/regress" "$T/r/claude/agents"; cp "$ROOTD"/gates/regress/*.js "$T/r/gates/regress/"; cp "$ROOTD/claude/agents/negated-regex-guards.tsv" "$T/r/claude/agents/"; }
  ck(){ check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; fail=$((fail+1)); fi; }
  mk; ck "S0 the committed gates and register hold" 0
  mk; printf "L.say(!/Resign/.test(t),'a new negated assertion');\n" >> "$T/r/gates/regress/99-new.js"; ck "S1 a NEW negated assertion nobody reviewed reddens" 1
  mk; printf "const ok=!/Resign/.test(t);\n" >> "$T/r/gates/regress/99-new.js"; ck "S2 a negated regex on a non-asserting line is not held" 0
  mk; sed -i '0,/^gates\/regress\//{/^gates\/regress\//d}' "$T/r/claude/agents/negated-regex-guards.tsv"; ck "S3 a deleted review row reddens (its site is unreviewed)" 1
  mk; printf 'gates/regress/00-gone.js\t/x/\tchecked\n' >> "$T/r/claude/agents/negated-regex-guards.tsv"; ck "S4 a row naming no site reddens" 1
  mk; rm "$T/r/claude/agents/negated-regex-guards.tsv"; ck "S5 no register is exit 2, not a pass" 2
  echo "negated-regex-guards selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in --selftest) selftest; exit $? ;; "") check "$(cd "$(dirname "$0")/../.." && pwd)"; exit $? ;; *) check "$1"; exit $? ;; esac
