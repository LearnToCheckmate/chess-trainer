#!/usr/bin/env bash
# gates/audit/story-ladder.sh - DOES US-R03's GRADE LADDER STILL EQUAL THE GATE'S LADDER, NAME FOR NAME AND IN ORDER?
#
# WHY THIS EXISTS [#545, item (22) of directOpening_2026_10_29_batch5;
# jobs/us-r03-contradicts-the-app-and-the-gate-that-cites-it-2026-09-27]. US-R03 said "Excellent is folded into
# Best" for five builds after #421 shipped Excellent as its own grade, while gates/regress/20-review.js asserted
# the opposite and cited US-R03 as its authority. #541 fixed the text; nothing stopped the next split or rename
# from drifting the same way. This is that check, TC-SUITE-255. It reads committed files only and launches no
# browser, so it lives here and not in gate 20, whose verdict must stay a pure function of the bundle.
#
# WHAT IT ASSERTS: L0 both lists were FOUND and are non-empty (an empty denominator is reported, never credited);
# L1 the grade names in US-R03's "TEN grades (...)" bullet equal LADDER in gates/regress/20-review.js, in order;
# L2 the bullet's count word ("TEN") equals the number of names it lists.
# USAGE  bash gates/audit/story-ladder.sh [repo-dir]   exit 0 holds | 1 drifted | 2 a source unreadable
#        bash gates/audit/story-ladder.sh --selftest
set -uo pipefail

check(){ ( cd "$1" && node -e '
  const fs=require("fs");const say=(ok,m)=>{console.log((ok?"  ok   ":"  FAIL ")+m);if(!ok)process.exitCode=1;};
  let us,g;try{us=fs.readFileSync("claude/stories/USER-STORIES.md","utf8");g=fs.readFileSync("gates/regress/20-review.js","utf8");}
  catch(e){console.log("NOT CHECKED: "+e.message);process.exit(2);}
  const h=us.indexOf("### US-R03 ");const end=h<0?-1:us.indexOf("\n### ",h+5);const sec=h<0?"":us.slice(h,end<0?undefined:end);
  const m=sec.replace(/\n\s*/g," ").match(/the ([A-Z]+) grades \(([^)]*)\)/);
  const words={EIGHT:8,NINE:9,TEN:10,ELEVEN:11,TWELVE:12};
  const story=m?m[2].replace(/,?\s*in that order\s*$/,"").split(/\s*,\s*/).map(s=>s.trim()).filter(Boolean):[];
  const gm=g.match(/const LADDER=\[([^\]]*)\]/);const gate=gm?[...gm[1].matchAll(/["\x27]([^"\x27]+)["\x27]/g)].map(x=>x[1]):[];
  say(story.length>0&&gate.length>0,"L0 US-R03 grade bullet and gate 20 LADDER both FOUND ("+story.length+" and "+gate.length+" names)");
  say(story.length>0&&story.join()===gate.join(),"L1 US-R03 names equal gate 20 LADDER in order: story ["+story.join(" ")+"] gate ["+gate.join(" ")+"]");
  say(!!m&&words[m[1]]===story.length,"L2 the bullet count word "+(m?m[1]:"<none>")+" equals the "+story.length+" names it lists");
' ); }

selftest(){
  local T pass=0 fail=0 rc
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 1; }
  trap 'rm -rf "$T"' RETURN
  mk(){ rm -rf "$T/r"; mkdir -p "$T/r/claude/stories" "$T/r/gates/regress"
        cp "$ROOTD/claude/stories/USER-STORIES.md" "$T/r/claude/stories/"; cp "$ROOTD/gates/regress/20-review.js" "$T/r/gates/regress/"; }
  ck(){ check "$T/r" >/dev/null 2>&1; rc=$?; if [ "$rc" = "$2" ]; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1 (exit $rc, wanted $2)"; fail=$((fail+1)); fi; }
  mk; ck "S0 the committed files hold" 0
  mk; sed -i "s/'Best','Excellent'/'Excellent','Best'/" "$T/r/gates/regress/20-review.js"; ck "S1 a reordered LADDER reddens L1" 1
  mk; sed -i 's/Best,$/Best, Excellent folded,/' "$T/r/claude/stories/USER-STORIES.md"; sed -i '0,/^  Excellent, Good/s//  Good/' "$T/r/claude/stories/USER-STORIES.md"; ck "S2 a story bullet that folds a grade away reddens" 1
  mk; sed -i 's/the TEN grades/the NINE grades/' "$T/r/claude/stories/USER-STORIES.md"; ck "S3 a count word that disagrees with the list reddens L2" 1
  mk; sed -i 's/^const LADDER=/const LADDER_RENAMED=/' "$T/r/gates/regress/20-review.js"; ck "S4 a LADDER the check cannot find is NOT credited (L0)" 1
  echo "story-ladder selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}

ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"
case "${1:-}" in --selftest) selftest; exit $? ;; "") check "$ROOTD"; exit $? ;; *) check "$1"; exit $? ;; esac
