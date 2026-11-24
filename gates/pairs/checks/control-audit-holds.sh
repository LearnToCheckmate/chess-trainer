#!/usr/bin/env bash
# gates/pairs/checks/control-audit-holds.sh - the grading machine's check for
# jobs/control-audit-holds-a-record-only-to-a-log-carrying-the-gates-current-assertion-set-2026-11-20 (#553).
# Run from a worktree's root (the machine does). No browser. Two halves, both printed as PASS/FAIL lines:
#   1. `node gates/control-audit.js --selftest`, its "SELFTEST PASS/FAIL" lines re-worded to "PASS/FAIL ARM ..." - the fixture
#      arms (8) to (10), in scratch repositories;
#   2. the REAL audit over this tree's own records and its newest accepted gatelog, as "PASS/FAIL REAL ..." lines:
#      gate 81 (whose count grows with the committed gatelogs) reads COVERED with every record sound; gate 147 reads COVERED
#      while its two older records still fault for their own reasons (c8fd052: its assertions changed since; 34a4a6d: a
#      trial scope of 8 hex characters, out of the vocabulary) - a hold that is loose enough to pass a stale record is caught.
set -uo pipefail
node gates/control-audit.js --selftest 2>&1 | sed -n -E 's/^SELFTEST (PASS|FAIL) /\1 ARM /p'
OUT="$(node gates/control-audit.js 2>&1)"
printf '%s\n' "$OUT" | CA_OUT=1 node -e '
  const t=require("fs").readFileSync(0,"utf8").split("\n");let cur=null;const v={},recs={};let g=null;
  for(const l of t){const h=/^--- ([A-Z-]+) \(\d+\) ---$/.exec(l);if(h){cur=h[1];continue;}
    const r=/^  (\S+?)\s*(?:\d+ assertions|not in log)/.exec(l);if(r&&cur){g=r[1];v[g]=cur;recs[g]=[];continue;}
    const c=/^      (sound|partial|base|FAULT)\s+([0-9a-f]+) /.exec(l);if(c&&g)recs[g].push({k:c[1],sha:c[2],l});}
  const say=(ok,m)=>console.log((ok?"PASS":"FAIL")+" REAL "+m);
  const g81=Object.keys(v).find(k=>/^81-/.test(k)),g147=Object.keys(v).find(k=>/^147-/.test(k));
  const r81=g81?recs[g81]:[];
  say(g81&&v[g81]==="COVERED"&&r81.length>=6&&r81.every(r=>r.k==="sound"),"gate 81 reads COVERED with every record sound ("+(g81?v[g81]:"absent")+", "+r81.filter(r=>r.k==="sound").length+" of "+r81.length+" sound) - its records over fewer gatelogs are held 1..log, not to the newest count");
  const r147=g147?recs[g147]:[];const f=(s)=>r147.find(r=>r.sha.startsWith(s));
  say(g147&&v[g147]==="COVERED","gate 147 reads COVERED ("+(g147?v[g147]:"absent")+")");
  say(!!f("c8fd052")&&f("c8fd052").k==="FAULT"&&/the assertions changed since c8fd052/.test(f("c8fd052").l),"gate 147 record c8fd052 still faults: its assertions changed since");
  say(!!f("34a4a6d")&&f("34a4a6d").k==="FAULT"&&/scope=trial:fb5726af is not in the vocabulary/.test(f("34a4a6d").l),"gate 147 record 34a4a6d still faults: its scope is out of the vocabulary");
'
