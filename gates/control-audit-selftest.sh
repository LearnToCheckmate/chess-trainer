#!/usr/bin/env bash
# gates/control-audit-selftest.sh - IS gates/control-audit.js STILL THE AUDIT, OR ONLY SOMETHING THAT PRINTS LIKE IT?
#
# WHY THIS EXISTS, AND WHY IT IS A SEPARATE FILE [#545, item (65);
# jobs/control-audit-js-has-no-self-test-so-a-stub-that-prints-one-summary-line-passes-every-control-2026-10-23].
# The push-checks design review reduced control-audit.js to `console.log("SUMMARY  0 covered, of 59 gates")` and every
# control the project ran still passed (fastgate-drive 51 ok / 0 FAIL). Since #540 the script carries its own
# --selftest, but a stub that REPLACES the script replaces that selftest with it, so the check has to live outside the
# file it checks. This one holds the real audit to facts a stub cannot supply:
#   A1 the script's own --selftest prints its footer with at least 10 passes and 0 fails
#   A2 a real run names its log and a gate count, and prints one row per gate: the rows equal 'gates=N'
#   A3 the section headers' counts sum to N, and each header's count equals the rows printed under it
#   A4 SUMMARY's covered equals COVERED + PARTIAL, and the ratchet's uncovered equals N minus COVERED
#   A5 FROM THE SOURCES, NOT FROM THE AUDIT: every gate whose file carries a CONTROL-RECORD line is NOT in NONE, and
#      every gate whose file carries none IS in NONE
# USAGE  bash gates/control-audit-selftest.sh            exit 0 holds | 1 a fact fails | 2 cannot run
#        CT_CA_SCRIPT=<path> bash gates/control-audit-selftest.sh   holds another script to the same facts (the control)
#        bash gates/control-audit-selftest.sh --selftest  runs the check, then against the job's stub, which must fail
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$G")"

check(){ local CA="$1"
  ( cd "$ROOT" && CA="$CA" node -e '
    const cp=require("child_process"),fs=require("fs"),path=require("path");
    let p=0,f=0;const say=(ok,m)=>{if(ok){p++;console.log("  ok   "+m);}else{f++;console.log("  FAIL "+m);}};
    const run=(a)=>{const r=cp.spawnSync("node",[process.env.CA,...a],{encoding:"utf8",maxBuffer:1<<26});return (r.stdout||"")+(r.stderr||"");};
    const st=run(["--selftest"]);const sm=/control-audit selftest: (\d+) pass \/ (\d+) fail/.exec(st);
    say(!!sm&&+sm[1]>=10&&+sm[2]===0,"A1 the script\x27s own --selftest footer reads at least 10 pass and 0 fail ("+(sm?sm[0]:"no footer")+")");
    const o=run([]);const L=o.split("\n");
    const hm=/^CONTROL AUDIT\s+log=(\S+).*gates=(\d+)/.exec(L.find(l=>/^CONTROL AUDIT/.test(l))||"");const N=hm?+hm[2]:-1;
    const sec={};let cur=null;const rows=[];
    for(const l of L){const h=/^--- ([A-Z-]+) \((\d+)\) ---$/.exec(l);if(h){cur=h[1];sec[cur]={n:+h[2],rows:[]};continue;}
      const r=/^  (\S+?)\s*(?:\d+ assertions|not in log)/.exec(l);if(r&&cur){sec[cur].rows.push(r[1]);rows.push({name:r[1],sec:cur});}
      if(/^SUMMARY/.test(l))cur=null;}
    say(N>0&&rows.length===N,"A2 a real run names its log and prints one row per gate ("+rows.length+" rows, gates="+N+(hm?", log "+hm[1]:"")+")");
    const names=Object.keys(sec);const sum=names.reduce((a,k)=>a+sec[k].n,0);const bad=names.filter(k=>sec[k].n!==sec[k].rows.length);
    say(names.length>=5&&sum===N&&bad.length===0,"A3 the "+names.length+" section counts sum to "+sum+" of "+N+", and each equals the rows under it"+(bad.length?" (mismatched: "+bad.join(",")+")":""));
    const S=/^SUMMARY\s+(\d+) covered, of (\d+) gates/.exec(L.find(l=>/^SUMMARY/.test(l))||"");const R=/uncovered=(\d+)/.exec(L.find(l=>/^CONTROL-AUDIT RATCHET/.test(l))||"");
    const cov=(sec.COVERED?sec.COVERED.n:0)+(sec.PARTIAL?sec.PARTIAL.n:0);
    say(!!S&&!!R&&+S[1]===cov&&+S[2]===N&&+R[1]===N-(sec.COVERED?sec.COVERED.n:0),"A4 SUMMARY covered "+(S?S[1]:"?")+" = COVERED+PARTIAL "+cov+", and ratchet uncovered "+(R?R[1]:"?")+" = gates minus COVERED");
    const wrong=[];for(const r of rows){const fp=r.name==="mountcheck"?"gates/mountcheck.js":"gates/regress/"+r.name+".js";if(!fs.existsSync(fp))continue;
      const has=/^\s*\/\/\s*CONTROL-RECORD:/m.test(fs.readFileSync(fp,"utf8"));if(has===(r.sec==="NONE"))wrong.push(r.name+(has?" has a record but reads NONE":" has none but reads "+r.sec));}
    say(rows.length>0&&wrong.length===0,"A5 from the gate sources: a gate is in NONE exactly when its file carries no CONTROL-RECORD line ("+rows.length+" rows checked"+(wrong.length?"; wrong: "+wrong.slice(0,4).join("; "):"")+")");
    console.log("control-audit-selftest: "+p+" pass / "+f+" fail");process.exit(f?1:0);' ); }

case "${1:-}" in
  --selftest)
    check "${CT_CA_SCRIPT:-$G/control-audit.js}"; rc=$?
    T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; exit 2; }
    printf 'console.log("SUMMARY  0 covered, of 59 gates")\n' > "$T/stub.js"
    check "$T/stub.js" >/dev/null 2>&1; src=$?; rm -rf "$T"
    if [ "$src" = 1 ]; then echo "  ok   S1 the job's one-line stub FAILS this check (exit 1)"; else echo "  FAIL S1 the job's one-line stub was not refused (exit $src)"; rc=1; fi
    exit $rc ;;
  "") check "${CT_CA_SCRIPT:-$G/control-audit.js}"; exit $? ;;
  *) echo "usage: $0 [--selftest]"; exit 2 ;;
esac
