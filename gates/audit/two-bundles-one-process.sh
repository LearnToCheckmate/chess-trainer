#!/usr/bin/env bash
# gates/audit/two-bundles-one-process.sh - DOES ONE NODE PROCESS THAT LAUNCHES TWO BUNDLES ACTUALLY SERVE TWO BUNDLES?
#
# WHY THIS EXISTS [#545, item (48) of directOpening_2026_10_29_batch5;
# jobs/two-launches-with-different-bundles-in-one-process-serve-the-first-one-twice-2026-10-02]. gates/lib.js's serve()
# memoised its server per PROCESS and never compared the requested `app` with the one it was serving, so a before/after
# script - which is how this project runs every negative control it publishes - measured the first bundle twice, and
# printed no bundle line for the second. No committed gate passes `app` to L.launch, so no GATES GREEN was affected;
# the ad-hoc control scripts were. This is TC-SUITE-264.
#
# WHAT IT ASSERTS: T1 two launches in one process, given app.js and a copy whose stamp number is rewritten, read two
# DIFFERENT stamps out of the served page (b.stamp()); T2 the same bundle launched twice reads the same stamp (so T1
# is not two random readings). It launches a real browser, so it is not a committed-files audit and is run by hand.
# USAGE  bash gates/audit/two-bundles-one-process.sh [lib.js]   exit 0 holds | 1 the second launch got the first bundle | 2 could not run
#        bash gates/audit/two-bundles-one-process.sh --selftest   runs the check, then against lib.js with the old memo restored
set -uo pipefail
G="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(dirname "$G")"

check(){ # <lib.js inside gates/>
  local LIB="$1" T rc
  T="$(mktemp -d 2>/dev/null)" || { echo "NOT CHECKED: no scratch"; return 2; }
  sed 's/#\([0-9]\{3,4\}\) - 20/#9\1 - 20/' "$ROOT/app.js" > "$T/other.js"
  if cmp -s "$ROOT/app.js" "$T/other.js"; then echo "NOT CHECKED: app.js carries no stamp to rewrite"; rm -rf "$T"; return 2; fi
  cat > "$T/two.js" <<'J'
const L=require(process.argv[2]);
(async()=>{const r=[];for(const app of process.argv.slice(3)){const b=await L.launch({app,geo:'kunal730'});await b.open();r.push(await b.stamp());await b.close();}
console.log('STAMPS '+JSON.stringify(r));L.done('TWO-BUNDLES');})().catch(e=>{console.log('ERR '+e.message);process.exit(2);});
J
  local A B
  A="$(cd "$ROOT" && timeout 170 node "$T/two.js" "$LIB" "$ROOT/app.js" "$T/other.js" 2>&1 | sed -n 's/^STAMPS //p')"
  B="$(cd "$ROOT" && timeout 170 node "$T/two.js" "$LIB" "$ROOT/app.js" "$ROOT/app.js" 2>&1 | sed -n 's/^STAMPS //p')"
  rm -rf "$T"
  if [ -z "$A" ] || [ -z "$B" ]; then echo "NOT CHECKED: a launch did not report its stamps (A='$A' B='$B')"; return 2; fi
  rc=0
  node -e 'const a=JSON.parse(process.argv[1]);const ok=a.length===2&&a[0]&&a[1]&&a[0]!==a[1];console.log((ok?"  ok   ":"  FAIL ")+"T1 two bundles in one process read two stamps: "+process.argv[1]);process.exit(ok?0:1)' "$A" || rc=1
  node -e 'const a=JSON.parse(process.argv[1]);const ok=a.length===2&&a[0]&&a[0]===a[1];console.log((ok?"  ok   ":"  FAIL ")+"T2 one bundle twice reads one stamp: "+process.argv[1]);process.exit(ok?0:1)' "$B" || rc=1
  return $rc
}

selftest(){
  local pass=0 fail=0 rc M="$G/.lib-mutant-$$.js"
  check "$G/lib.js" >/dev/null 2>&1; rc=$?
  if [ "$rc" = 0 ]; then echo "  ok   S0 gates/lib.js as committed holds"; pass=$((pass+1)); else echo "  FAIL S0 gates/lib.js as committed (exit $rc)"; fail=$((fail+1)); fi
  # THE MUTANT IS THE OLD CODE: the per-process memo restored as the first line of serve().
  sed 's/^async function serve(opts={}){$/&\n  if(_srv\&\&!opts.fresh)return _srv;/' "$G/lib.js" > "$M"
  if [ "$(grep -c 'if(_srv&&!opts.fresh)return _srv;' "$M")" != 1 ]; then echo "  FAIL S1 the mutant could not be built"; fail=$((fail+1))
  else check "$M" >/dev/null 2>&1; rc=$?
    if [ "$rc" = 1 ]; then echo "  ok   S1 the old per-process memo reddens T1"; pass=$((pass+1)); else echo "  FAIL S1 the old memo (exit $rc, wanted 1)"; fail=$((fail+1)); fi
  fi
  rm -f "$M"
  echo "two-bundles-one-process selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

case "${1:-}" in --selftest) selftest; exit $? ;; "") check "$G/lib.js"; exit $? ;; *) check "$1"; exit $? ;; esac
