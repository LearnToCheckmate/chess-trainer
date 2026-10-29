#!/usr/bin/env bash
# gates/audit/taptext-straddle.sh - DOES tapText CLICK A CONTROL THAT STRADDLES THE VIEWPORT EDGE, AND REFUSE ONE THAT IS NOT ON SCREEN?
#
# WHY THIS EXISTS [#545, item (80) of directOpening_2026_10_29_batch5;
# jobs/taptext-clicks-outside-the-viewport-for-any-element-straddling-the-bottom-edge-2026-09-30]. tapText judged "off
# screen" as FULLY outside the viewport and then clicked the box CENTRE unconditionally, so a control whose top was on
# screen and whose centre was not was never scrolled and the click landed outside the viewport - silently, because
# page.mouse.click does not throw. #441 fixed it (ca50a8b, fdca93d); 364f700 reverted main to #439 and took the fix with
# it, and nothing noticed for a month because no check exercised the straddle band. This is that check, TC-SUITE-288.
#
# WHAT IT ASSERTS, on app.js at 375x730, each with a position:fixed button injected into the live app:
#   T1 a button whose top is 10px inside the bottom edge and whose centre is 12.5px outside it IS clicked
#   T2 a button wholly below the viewport makes tapText THROW, rather than click whatever is there and return a box
#   T3 an ordinary on-screen button is still clicked (the fix must not break the common case)
# It launches a real browser, so it is run by hand, like two-bundles-one-process.sh.
# USAGE  bash gates/audit/taptext-straddle.sh [lib.js]   exit 0 holds | 1 a tap was wrong | 2 could not run
#        bash gates/audit/taptext-straddle.sh --selftest  runs the check, then against 1507ade's lib.js (the pre-port tapText)
set -uo pipefail
G="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(dirname "$G")"

check(){ # <lib.js inside gates/>
  local LIB="$1" T out
  T="$(mktemp -d 2>/dev/null)" || { echo "NOT CHECKED: no scratch"; return 2; }
  cat > "$T/st.js" <<'J'
const L=require(process.argv[2]);
(async()=>{const b=await L.launch({geo:'kunal730'});await b.open();const res={};
  const put=(id,top)=>b.page.evaluate(([id,top])=>{const x=document.createElement('button');x.textContent=id;x.id=id;
    x.style.cssText='position:fixed;left:100px;top:'+top+'px;width:150px;height:45px;z-index:99999';
    x.onclick=()=>{window['hit_'+id]=1;};document.body.appendChild(x);},[id,top]);
  const vh=b.page.viewportSize().height;
  await put('ZZSTRADDLE',vh-10);await put('ZZBELOW',vh+100);await put('ZZPLAIN',200);
  for(const id of ['ZZSTRADDLE','ZZBELOW','ZZPLAIN']){let threw=false;
    try{await b.tapText(new RegExp('^'+id+'$'),{wait:200});}catch(e){threw=true;}
    res[id]={threw,hit:await b.page.evaluate(id=>!!window['hit_'+id],id)};}
  console.log('RES '+JSON.stringify(res));await b.close();L.done('TAPTEXT-STRADDLE');
})().catch(e=>{console.log('ERR '+e.message);process.exit(2);});
J
  out="$(cd "$ROOT" && timeout 170 node "$T/st.js" "$LIB" 2>&1 | sed -n 's/^RES //p')"
  rm -rf "$T"
  [ -n "$out" ] || { echo "NOT CHECKED: the probe did not report"; return 2; }
  node -e '
    const r=JSON.parse(process.argv[1]);let bad=0;const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)bad=1;};
    say(r.ZZSTRADDLE.hit&&!r.ZZSTRADDLE.threw,"T1 a button straddling the bottom edge (top 10px inside, centre outside) is clicked: "+JSON.stringify(r.ZZSTRADDLE));
    say(r.ZZBELOW.threw&&!r.ZZBELOW.hit,"T2 a button wholly below the viewport makes tapText throw instead of clicking blind: "+JSON.stringify(r.ZZBELOW));
    say(r.ZZPLAIN.hit&&!r.ZZPLAIN.threw,"T3 an ordinary on-screen button is still clicked: "+JSON.stringify(r.ZZPLAIN));
    process.exit(bad);' "$out"
}

selftest(){
  local OLD="$G/.lib-straddle-old-$$.js" rc1 rc2
  check "$G/lib.js"; rc1=$?
  git -C "$ROOT" show 1507ade:gates/lib.js > "$OLD" 2>/dev/null || { echo "selftest: cannot read 1507ade:gates/lib.js"; rm -f "$OLD"; return 2; }
  check "$OLD" >/dev/null 2>&1; rc2=$?; rm -f "$OLD"
  local p=0
  [ "$rc1" = 0 ] && { echo "  ok   S0 the committed lib.js holds"; p=$((p+1)); } || echo "  FAIL S0 the committed lib.js (exit $rc1)"
  [ "$rc2" = 1 ] && { echo "  ok   S1 1507ade's lib.js (pre-port tapText) is refused"; p=$((p+1)); } || echo "  FAIL S1 1507ade's lib.js exit $rc2, wanted 1"
  echo "taptext-straddle selftest: $p of 2"; [ "$p" = 2 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") check "$G/lib.js"; exit $? ;;
  *) check "$1"; exit $? ;;
esac
