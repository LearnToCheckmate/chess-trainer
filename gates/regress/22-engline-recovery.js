// regress/22-engline-recovery.js  #389, flag uat387-engine-wasm-trap-ply25 (headless UAT lane, P2).
//
// THE DEFECT, measured on #387 before a line was changed. Stepping the Opera Game review with the engine
// line on, the single-file Stockfish traps ("RuntimeError: unreachable") on two positions - ply 19 (10.Nxb5)
// and ply 25 (13.Rxd7). The trap is inside the WASM and is not ours to fix. What WAS ours:
//
//   const val={line:line.trim()};engCacheRef.current[fen]=val;
//
// sfBestLine (chess.jsx:2952) RESOLVES NULL on every failure path - worker not ready, idle check failed,
// postMessage threw, abort, or a trap mid-search. It never rejects. So on a trap `line` is '' and the old
// code stored {line:''} in the cache as though it were the engine's reply. Next visit: cache HIT, no query,
// bare ellipsis. For ever. Measured three revisits each on plies 19 and 25 - never recovered, twice, with
// two independently written probes.
//
// AND THE NUMBER WAS WRONG TOO, which the original report did not have. The trapped search delivers a
// partial score before it dies, so ply 19 read "-3.0" on a position the coach chip and eval bar both call
// about +3 for White. That wrong number was cached permanently beside the empty line. On the fixed bundle
// the revisit returns "+2.8" WITH its variation, so the retry corrects the sign as well as the line.
//
// RESIDUAL, STATED SO NOBODY READS THIS GATE AS MORE THAN IT IS: on the visit where the trap actually
// fires, the number is still wrong-signed and the line is still absent. The fix makes that self-heal on
// the next visit instead of persisting. A first-visit fix means recovering the worker after a trap, which
// is a bigger change and is NOT in #389.
//
// WHY NO EXISTING GATE SAW IT: the gallery's Review card visits plies 0, 19, 33 and 19 again, and the
// suite's other Review gates stop at a handful of plies. 29 of the 33 plies had never been rendered by
// anything. This gate does not walk all 33 either - that costs two minutes a geometry - it goes straight
// to the two positions the trap is reproducible on and asserts the RECOVERY, which is the part we fixed.
// ── CONTROL RE-VERIFIED 2026-09-16 at #402, AND IT STILL BITES HARDER THAN WHEN IT WAS RECORDED. ─────────────
// #401 established that this gate HAS a recorded control (in RUN-LOG rows, not here) but not that the control
// still discriminates against the file AS IT STANDS - the gate has gained 11 assertions since, 10 -> 21, and
// none of the additions was covered by the original measurement. That gap is now closed, and the record lives
// here rather than in a RUN-LOG row nobody greps.
// Both controls are SHIPPED RELEASES, so no trial bundle is needed - the strongest kind of control there is.
//   vs the shipped #387 (6e19f7e, app.js md5 ae5ebbc44976):  6 FAIL / 15 PASS   (RUN-LOG #389 recorded 4 of 10)
//   vs the shipped #390 (ecf733d, app.js md5 5fc71d38a468):  3 FAIL / 18 PASS   (RUN-LOG #392 recorded 2 of 14)
// The red count rose with the assertion count in both cases, which is the result that matters: the assertions
// added at #392 and #398 are covered by the same bundles, not riding free on a green earned by the originals.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const TRAP_PLIES=[19,25];   // measured on #387: the two positions the WASM traps on, in both directions
const engTxt=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const plyTxt=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-move-line"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
// A variation is present when something after the leading evaluation is a move number followed by real SAN.
// #391 - THIS PREDICATE WAS FLAKY AND THE SUITE CAUGHT IT, four builds after it shipped. It used to read
// /\d+\.+\s*[KQRBNO]?[a-h1-8]/, which requires a FILE OR RANK immediately after the piece letter - so it
// matches "16. Qd5+" and does NOT match "16. Qxf7", because the character after Q is the capture x. It passed
// at #389 only because those two runs happened to return lines containing a non-capture move. On a run where
// the engine returned "13... Nxd7 14. Bxe7 Bxe7 15. Bxd7+ Kxd7 16. Qxf7" - every move a capture - it called a
// perfectly good variation a bare ellipsis and went red on a healthy build. Use real SAN, captures included.
const SAN='(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)';
const hasVar=(s)=>{if(!s)return false;const rest=s.replace(/^\S+\s*/,'');return new RegExp('\\d+\\.+\\s*'+SAN).test(rest);};
const num=(s)=>{if(!s)return null;const m=String(s).match(/^([+-]?\d+\.\d)/);return m?parseFloat(m[1]):null;};
const fwd=async(b,n,w)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(w||110);}};
const back=async(b,n,w)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000});await b.page.waitForTimeout(w||110);}};
// ── THE TRAP COUNTER, AND ITS UNIT CONTROL [#544, item (25);
// jobs/gate-22-never-requires-the-wasm-trap-to-have-fired-so-five-recovery-assertions-pass-over-a-non-event-2026-10-09,
// P2, found by antagonist A of #504 in the ROTATING AUDIT of ten pre-existing assertions].
// THE FINDING: this file exists to prove the app RECOVERS from the Stockfish WASM trap - the #389 defect, 'a
// failed query is not an answer, and caching it is how broken once becomes broken for ever'. Its five recovery
// assertions ALLOW /RuntimeError: unreachable/ at the error check below and REQUIRE it nowhere. So on any run,
// container or machine where the trap does not occur there is nothing to recover from, all five pass over a
// NON-EVENT, and nobody can tell which happened from the log. That is the missing-denominator rule applied to
// a whole gate: every() and a negated test() are both true over nothing, and so is a recovery check over a
// failure that never happened. The irony the job records is that this gate's SUBJECT is #389.
// AND THE PRIORITY ARGUMENT INVERTS RATHER THAN WEAKENS, which the job measured after filing it: at #504 the
// trap fired SIX times in this container's own section and TWO of the five went RED, catching the live P0
// jobs/two-analysis-queries-on-one-worker-abort-each-other-and-the-loser-is-cached-as-an-answer-2026-10-09 and
// stopping that push. A gate that has caught something is worth MORE hardening, not less: the day the trap
// stops firing is the day a proven-necessary guard goes silent with no tell.
const TRAP_RE=/RuntimeError: unreachable/;
const trapCount=(errs)=>(errs||[]).filter(e=>TRAP_RE.test(String(e))).length;
L.run(async()=>{
  // THE PREDICATE IS UNIT-TESTED BEFORE THE BROWSER STARTS, over the three inputs that matter, because
  // CLAUDE.md's #391 rule is that a predicate parsing what an engine wrote must be checked against what the
  // engine can produce - including the cases it must REJECT - and because the LIVE line below cannot be
  // controlled in a container where the trap always fires. Eight strings take a second and would have caught
  // #391 on the day.
  L.say(trapCount([])===0 && trapCount(['TypeError: x is not a function'])===0
        && trapCount(['RuntimeError: unreachable'])===1
        && trapCount(['a','RuntimeError: unreachable at wasm://wasm/0001','RuntimeError: unreachable'])===2,
    'TC-SUITE-236 INSTRUMENT: the trap counter counts /RuntimeError: unreachable/ and reads ZERO over an empty list - which is the reading that makes the non-vacuity line below mean something',
    {empty:trapCount([]),unrelated:trapCount(['TypeError: x is not a function']),one:trapCount(['RuntimeError: unreachable']),two:trapCount(['a','RuntimeError: unreachable at wasm://wasm/0001','RuntimeError: unreachable'])});
  const b=await L.launch({geo:'kunal730',name:'engline-recovery',store:{ct_pool:'3'}});await b.open();
  await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});
  await b.tapText(/^⋯$/,{wait:500}).catch(()=>{});
  await b.tapText(/Analyze with the engine/,{wait:900}).catch(()=>{});
  await b.settle(1200);
  const el=await b.rect('[data-ct="rev-engline"]');
  L.say(!!el,'the engine line row is on screen at all (non-empty companion: everything below is vacuous without it)',el&&el.text);

  /* #398 (review-engline-clipped-2px): THE CONTAINER MUST ACTUALLY CONTAIN ITS CHILDREN.
     rev-why is a flex column whose height _whyH is a RESERVATION summed from its rows' DECLARED heights, and
     the container also had gap:2 - pixels the reservation never included. With the engine row on that is two
     children and one gap, so the parent was 2px short and overflow:hidden cut rev-engline's bottom 2px.
     Measured at 375x730: parent 561..632, rev-why-txt 51, rev-engline 20 ending at 634.
     IT IS THE ENGINE LINE, which is why 2px matters more here: this project spent #389, #392 and a sign fix
     making that number trustworthy, and a clipped number reads as a rendering fault on the one row a user has
     most reason to doubt.
     ASSERTED AS THE PROPERTY, NOT A HEIGHT. The first fix for this added (rows-1)*gap to the reservation and
     was VETOED by the antagonist: rev-bestline carries no height style and flex-shrink:1, so it paints 14-16
     against the 20 _bestH claims, and that arithmetic over-reserved in the three-row state - costing 16px of
     board at 320x568, where the fit loop trims in 8px steps. The shipped fix sets gap:0 instead, so each
     child's painted height is at most its declared height and nothing can be clipped in any row combination
     while not one extra pixel is reserved.
     THE 0.5 TOLERANCE IS NOT A ROUND NUMBER PICKED FOR COMFORT. Every term in _whyH is an integer and every
     child's height is either an integer literal or a content-sized line box, so a correct build reads a
     deficit of 0 or negative; the 0.5 absorbs sub-pixel rect noise only. The defect it must catch is 2px in
     portrait and 4px in landscape, so the band rejects everything the assertion exists for by a factor of
     four. Stated here because a threshold nobody can explain is one nobody can safely move. */
  const fit=await b.page.evaluate(()=>{
    const p=document.querySelector('[data-ct="rev-why"]'); if(!p)return null;
    const pr=p.getBoundingClientRect(), cs=getComputedStyle(p);
    const gap=parseFloat(cs.rowGap||cs.gap||'0')||0;
    const kids=[...p.children].map(c=>{const r=c.getBoundingClientRect();
      return {ct:c.getAttribute('data-ct'),h:+r.height.toFixed(1),over:+(r.bottom-pr.bottom).toFixed(1)};});
    const need=kids.reduce((a,k)=>a+k.h,0)+gap*Math.max(0,kids.length-1);
    return {ph:+pr.height.toFixed(1),gap,kids,need:+need.toFixed(1),deficit:+(need-pr.height).toFixed(1)};
  });
  L.say(!!fit&&fit.kids.length>=2,'COMPANION: rev-why really is carrying more than one row here, so the containment check below is actually being exercised',fit&&fit.kids.map(k=>k.ct));
  L.say(!!fit&&fit.deficit<=0.5,'rev-why is TALL ENOUGH FOR ITS CHILDREN PLUS ITS GAPS - the reservation summed the rows and forgot the gaps, so it was one gap short and clipped the engine line',fit);
  L.say(!!fit&&fit.kids.every(k=>k.over<=0.5),'and NO child of rev-why paints past its bottom edge, which is the thing the user actually sees',fit&&fit.kids);

  /* THE THREE-ROW STATE. The first version of this gate filed it as undrivable - "the rev-best pill only
     renders when _hasBetter, and the sheet route left rev-bestline absent anyway". That was wrong, and the
     route was thirty lines away in a sibling gate: 20-review.js:111 scans BACK for a ply whose move line
     carries a negative verdict AND a [data-ct="rev-best"] chip, and rev-best's handler is
     setShowBest(true);setEngOn(true);playBestLine() - the three-row state directly. CLAUDE.md's "a lesson
     recorded in one gate does not travel to the next one by itself", firing again in the same week it was
     written; git log and the sibling gates are faster than rediscovering a control.
     WHY THIS STATE SPECIFICALLY. rev-bestline is the ONLY child of rev-why with no height style and the only
     one that can shrink, and it is what made the FIRST fix for this defect wrong - (rows-1)*gap over-reserved
     here and cost 16px of board at 320x568. So it is the row where a future regression is most likely, and
     until now it had no assertion at all. Everything above runs in the two-row state; a pinned-height fix
     would go green there and red here. */
  /* Walk FORWARD first. The first draft scanned back from where the fit check leaves off, which is ply 0 -
     there is nothing behind it, so the companion went red on its first run. That is the companion earning
     its place rather than a cost: a block that cannot reach its state should say so, not report on air.
     20-review.js walks to ply 18 before it scans back, for exactly this reason. */
  await fwd(b,18);await b.settle(1500);
  const negPly=await (async()=>{
    for(let k=0;k<20;k++){
      const ml=await b.rect('[data-ct="rev-move-line"]');
      const chip=await b.rect('[data-ct="rev-best"]');
      if(ml&&/Blunder|Mistake|Inaccuracy|Miss|\?/.test(ml.text)&&chip)return {text:ml.text.replace(/\s+/g,' ').slice(0,60)};
      await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000});
      await b.settle(350);
    }
    return null;
  })();
  L.say(!!negPly,'COMPANION: found a ply whose verdict is negative AND carries a best-move chip - without one the three-row state cannot be entered and everything below would be vacuous',negPly);
  if(negPly){
    await b.tapText(/^best/,{wait:900}).catch(async()=>{await b.page.locator('[data-ct="rev-best"]').first().click({timeout:5000}).catch(()=>{});});
    await b.settle(2500);
    const fit3=await b.page.evaluate(()=>{
      const p=document.querySelector('[data-ct="rev-why"]'); if(!p)return null;
      const pr=p.getBoundingClientRect(), cs=getComputedStyle(p);
      const gap=parseFloat(cs.rowGap||cs.gap||'0')||0;
      const kids=[...p.children].map(c=>{const r=c.getBoundingClientRect();
        return {ct:c.getAttribute('data-ct'),h:+r.height.toFixed(1),over:+(r.bottom-pr.bottom).toFixed(1),
                squeeze:+(c.scrollHeight-c.clientHeight).toFixed(1)};});
      const need=kids.reduce((a,k)=>a+k.h,0)+gap*Math.max(0,kids.length-1);
      return {ph:+pr.height.toFixed(1),gap,kids,need:+need.toFixed(1),deficit:+(need-pr.height).toFixed(1)};
    });
    /* The companion has to name rev-bestline, not just count to three. "three children" is satisfied by
       [rev-cmp, rev-why-txt, rev-engline] in landscape, which is the two-row case wearing a third row and
       would pin nothing about the row under test - the same shape as an alternation that matches every branch. */
    const has3=!!fit3&&fit3.kids.some(k=>k.ct==='rev-bestline');
    L.say(has3,'COMPANION: rev-bestline is ACTUALLY present now - this is the three-row state and not merely three children',fit3&&fit3.kids.map(k=>k.ct));
    /* CONTAINMENT IS THE WRONG QUESTION IN THIS STATE, AND ASKING IT GIVES A VACUOUS PASS. Measured against
       three deliberately broken bundles: with gap:3 the three rows fit exactly (14+51+20+6 = 91 = the
       reservation), and with gap:4 they STILL "fit" - because rev-bestline SHRANK from 15px to 12px and
       absorbed the excess (12+51+20+8 = 91), leaving rev-engline sitting at over:0. So "does any child paint
       past the bottom edge" is answered NO by flex-shrink no matter how wrong the arithmetic gets, because
       flex-shrink pays the bill out of rev-bestline. That is this project's own definition of an assertion
       that cannot fail - and it is the containment trap in a fourth costume: the thing I am trying to detect
       is absorbed by the very mechanism I am asserting over.
       WHAT ACTUALLY GOES WRONG HERE IS A DIFFERENT DEFECT WITH THE SAME CAUSE. rev-bestline is overflowY:hidden,
       so shrinking it does not reflow its text - it CUTS it, with no ellipsis, exactly the silent cut this
       build exists to remove from the engine line. So assert the squeeze, not the containment: no child of
       rev-why may be rendered shorter than its own content. On the shipped bundle rev-bestline measures
       15 tall with 15 of content (squeeze 0); at gap:4 it is 12 tall with 15 of content (squeeze 3), which is
       the control crossing the line rather than merely disturbing the mechanism. Keep the containment check
       too - it is not vacuous in the two-row state above, where nothing can shrink. */
    L.say(has3&&fit3.deficit<=0.5,'THREE-ROW: rev-why still contains its children with the best-line row showing',fit3);
    L.say(has3&&fit3.kids.every(k=>k.squeeze<=0.5),'THREE-ROW: and NO row is rendered shorter than its own content - a gap regression does not clip the engine line here, it silently squeezes the best-line row instead, and that row cuts its text with no ellipsis',fit3&&fit3.kids);
  }
  for(const target of TRAP_PLIES){
    await b.tapText(/^⏮$/,{wait:800}).catch(()=>{});await b.settle(500);
    await fwd(b,target);await b.settle(5000);
    const at=await plyTxt(b);
    L.say(!!at&&at.indexOf(target+'/33')>=0,'reached ply '+target+' (state-reached check, not assumed)',at);
    const first=await engTxt(b);
    L.note('ply '+target+' first visit: '+JSON.stringify(first));
    /* #392 (review-engline-wrong-sign-on-trap): THE FIRST VISIT'S NUMBER MUST NOT LIE ABOUT WHO IS WINNING.
       #389 stopped caching the failed query so the LINE recovers on a revisit. It left the worse half: a
       trapped search returns a partial score with the WRONG SIGN, and a user stepping through once, forwards,
       never sees the correction. Measured on #390: ply 19 read -2.5 in a position everything else calls +3.0.
       The line may still be missing here - the WASM trap is not ours - but the NUMBER comes from the stored
       analysis now, so it is right even when the search died. */
    const fn=num(first);
    L.say(fn!==null,'ply '+target+': the FIRST visit leads with a readable number, trapped search or not',first);
    L.say(fn!==null&&fn>=1.0,'ply '+target+': and that first-visit number is POSITIVE - a dead search no longer prints its wrong-signed partial score (was '+(target===19?'-2.5':'-5.0')+' on #390)',{first:first,n:fn});
    // step away and back - this is the revisit the old build could never recover from
    await fwd(b,1);await b.settle(2500);await back(b,1);await b.settle(5000);
    const again=await engTxt(b);
    L.note('ply '+target+' after revisit: '+JSON.stringify(again));
    L.say(hasVar(again),'ply '+target+': a REVISIT yields a variation, not a bare ellipsis (#389: a failed query is no longer cached as an answer)',again);
    // THE SIGN, PINNED TO THE GAME RATHER THAN TO ANOTHER READOUT. The obvious cross-check is the eval bar,
    // and it is CIRCULAR here: with engOn the bar renders engLine itself (chess.jsx:3809 _engBar), so the two
    // can never disagree. The coach chip is the independent source and it reads empty in this state. So the
    // assertion is pinned to a fact about the GAME instead: after 10.Nxb5 and after 13.Rxd7 White is winning,
    // measured +2.8 and +5.5 on the fixed bundle and agreed by the coach chip (+3.0) and the stored analysis.
    // A trapped search used to leave -2.8 and -5.0 here, so the sign alone separates a real answer from the
    // wreckage of a dead one. Band rather than exact value: an engine number moves a little run to run.
    const n=num(again);
    L.say(n!==null,'ply '+target+': the revisited engine line still leads with a readable number',again);
    L.say(n!==null&&n>=1.0,'ply '+target+': that number is POSITIVE and over a pawn - White is winning both of these positions, and a trapped search used to leave a negative here',{engline:n,wasOnBrokenBuild:(target===19?-2.8:-5.0)});
  }
  await b.close();

  /* ──────────────────────────────────────────────────────────────────────────────────────────────────────
     BLOCK R (#511). THE OTHER CALLER ON THE SAME WORKER. Added for
     jobs/two-analysis-queries-on-one-worker-abort-each-other-and-the-loser-is-cached-as-an-answer-2026-10-09.

     EVERYTHING ABOVE ASKS WHETHER THE *ENGLINE* CALLER SURVIVES A FAILED QUERY. Nothing asked the same
     question of the OTHER caller, and that is where the defect still was. sacRun (#365, the "If they take
     it, ..." clause on a Brilliant or Great move) stored its result guarded only by the GAME key, and
     sfEval1 resolves an OBJECT with bestmove:null on an abort - not the `null` the engline path tests for -
     so an aborted search was stored as `{replySan:'',verdict:''}`; the effect returns early on any existing
     byPly[ai], so that ply was NEVER re-queried and the clause that says WHY the sacrifice works was gone
     for the rest of the review. CLAUDE.md's #389 in the caller #389 did not touch.

     ONE LAUNCH CONTROLS BOTH HALVES OF THE FIX, AND THE SECOND ARM THAT USED TO DO IT WAS WORSE.
     This block shipped with ONE assertion set and BOTH BLIND ANTAGONISTS CAUGHT THAT IT CONTROLLED HALF
     THE DIFF: a yield-only bundle (HEAD minus the three cache/token hunks) scored the shipping verdict
     exactly. The two halves are now controlled by two assertions in one pass:
       R3c  THE YIELD HALF      the engine line keeps a real variation on this Brilliant ply, because
                                sacRun no longer aborts it. Needs no step-away, so it cannot trap.
       R4   THE CACHE/TOKEN     the clause survives a step-away that aborts sacRun mid-search.
     MEASURED, four bundles each one hunk-group from the next, one container:
       bundle         yield  cache/token   R3c            R4
       main             -         -        RED            RED
       cache-only       -         +        RED            green
       yield-only       +         -        green          RED
       shipping         +         +        green          green
     (The md5s belong in the log and the build record, not here: this file outlives any one bundle and a
      hard-coded md5 in a gate header is a stale citation waiting to happen. Cite the md5 beside the run.)
     THE STEP-AWAY IS TIMED OFF THE ENGINE LINE'S OWN ARRIVAL, NOT OFF A WALL CLOCK [antagonist B's
     cross-read, upheld]. The first version used fixed 600ms and 1200ms waits. Those are correct in THIS
     container and are the #480/#416 class. B measured why: the engline's variation lands at t+839/840ms
     and the clause at t+1676/1677ms, so sacRun's in-flight window is about 1.05s-1.68s and 1200 sat
     ~150ms inside a ~600ms window WHOSE BOTH EDGES ARE ENGINE-SPEED TERMS. On a faster engine sacRun would
     have stored its answer before 1200ms, the step-away would abort nothing, and the arm would go SILENTLY
     GREEN ON A BUNDLE MISSING THE CACHE AND TOKEN FIX. R3c now polls for the arrival and R4 steps away
     200ms after it, so the state is read off the screen; an engine too fast or too slow reddens R3c rather
     than passing quietly. Kunal's phone is slower than this container.
     AND ONE ASSERTION OUTSIDE BLOCK R IS NON-DETERMINISTIC ON THE CACHE-ONLY BUNDLE, recorded because two
     independent runs disagreed and neither reading should be written down as the truth: 'ply 25: a REVISIT
     yields a variation' went RED in antagonist A's cache-only run (reading '+5.4 ...') and GREEN in mine.
     A's mechanism is the best explanation and is the same one R3c now asserts - without the yield, sacRun's
     abort costs the engine line its variation - and it is not established. It needs its own control.
     THE DENOMINATOR IS TAKEN AT A DIFFERENT PLY FROM THE RACE, AND THAT IS THE WHOLE DESIGN.
     The first draft settled on ply 38 with the engine off, read the clause, and then raced ply 38 - and
     scored 28 pass / 0 FAIL on main, CERTIFYING THE DEFECT ABSENT. sacRef.byPly is keyed BY PLY and never
     expires, so proving the clause exists at ply 38 CACHES A GOOD ANSWER FOR PLY 38 and the race that
     follows issues no query at all. The check and the thing being checked were the same object [CLAUDE.md
     records that trap nine times; this is the denominator wearing it]. Measured both ways: standalone, main
     reads the clause absent; with a ply-38 denominator in front of it, main reads it present. Same bundle,
     opposite verdicts. The denominator now sits at ply 74 (37...Rf7, Great), the other ply in this game
     whose sentence carries the clause, leaving ply 38 cold. EACH ARM LAUNCHES ITS OWN BROWSER for the same
     reason: one review's byPly survives everything inside it, so a second arm in the same page would
     measure a warm entry.

     WHAT THIS BLOCK DOES NOT SAY, measured by antagonist B and scoped here rather than left implied:
     ONCE THE WASM WORKER HAS TRAPPED, THE CLAUSE IS PERMANENTLY ABSENT ON THIS BUNDLE AND ON MAIN ALIKE,
     and two fast Next taps with the engine already on will trap it. That is #389's own named residual -
     nothing recovers the worker - and it is why both arms reach the ply with the engine OFF and then assert
     the worker is healthy before racing. A trapped worker answers nothing, so without that precondition
     this block would redden on every bundle for a reason that is not the defect.
     It also drives ct_pool 3 only. B measured pool 1 working, so that is declared coverage and not a claim.
     [R18, #545 item (94)] NO LONGER: the arm below runs at ct_pool 3 and again at ct_pool 1.
  */
  {
    const fs=require('fs');
    const KPGN=fs.readFileSync(__dirname+'/../../claude/agents/bench/pgn/184024052818.pgn','utf8');
    const T=38;                       // 19...Bxh3!! Brilliant  - THE RACE TARGET, kept cold until the race
    const D=74;                       // 37...Rf7 !  Great      - THE DENOMINATOR, a different ply
    const IF=(x)=>!!x&&/\bIf\s+\S+,\s+\S+/.test(x);
    const why=(bb)=>bb.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
    /* TWO ARMS, NAMED BY THE STATE THEY RACE AND NOT BY A MILLISECOND COUNT [antagonist B's cross-read,
       upheld]. The first version of this pair stepped away at fixed 600ms and 1200ms. Those numbers are
       correct in THIS container and are the #480/#416 class - a threshold belonging to the instrument it
       was calibrated on. B measured why: the engine line's variation lands at t+839ms and t+840ms in two
       independent runs and the clause at t+1676/1677ms, so sacRun's in-flight window is about 1.05s to
       1.68s and 1200 sat ~150ms inside a ~600ms window WHOSE BOTH EDGES ARE ENGINE-SPEED TERMS. On a
       faster engine sacRun would acquire at 450ms and have stored its answer before 1200ms, so the
       step-away would abort nothing and THE ARM WOULD GO SILENTLY GREEN ON A BUNDLE MISSING THE CACHE AND
       TOKEN FIX - the exact failure it was added to prevent; on a slower one it would duplicate the first
       arm. Kunal's phone is slower than this container.
       SO EACH ARM NOW READS THE SCREEN AND SAYS WHICH STATE IT RACED. The engine line's arrival is
       observable - it gains a real variation when its query returns - so 'waiting' steps away while that
       has NOT happened yet and 'inflight' steps away just after it has. R3b asserts the state in each arm,
       in R4a's own state-reached-not-assumed style, so a future reader can tell a green that means FIXED
       from a green that means THE RACE MISSED. If the engine is so fast or so slow that an arm cannot
       reach its state, R3b goes RED and says so rather than quietly passing. */
    // #545 item (94) [jobs/gate-22-block-r-drives-ct-pool-3-only-so-the-single-worker-branch-is-uncovered-2026-10-10]: the arm
    // now runs at ct_pool 3 AND at ct_pool 1. At pool 1 the review itself falls back to sfEval1 on the very worker under
    // contention, which is the branch CLAUDE.md's #375 rule demands coverage of. Pool-1 lines carry the tag 'R [ct_pool=1] '.
    // Antagonist B of #511 measured pool 1 healthy by hand; this makes it an assertion. Costs about a minute of suite.
    for(const [POOL,tag] of [['3','R '],['1','R [ct_pool=1] ']]){
      const r=await L.launch({geo:'kunal730',name:'engline-sacrun-race-pool'+POOL,store:{ct_pool:POOL}});await r.open();
      await r.tile('Review');await r.page.locator('textarea').first().fill(KPGN);await r.tapText(/^⚡ Analyze Game$/,{wait:300});
      await r.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await r.settle(600);
      await r.tapText(/^Start review/,{wait:900});

      await fwd(r,D,80);await r.settle(7000);
      const atD=await plyTxt(r);
      L.say(!!atD&&atD.indexOf(D+'/85')>=0,tag+'R0 reached ply '+D+' of Kunal’s own game (state-reached, not assumed)',atD);
      const denom=await why(r);
      L.say(IF(denom),tag+'R1 DENOMINATOR, AT A DIFFERENT PLY SO IT CANNOT WARM THE ONE UNDER TEST: with no second caller on the worker the refutation clause IS on screen, so this fixture can satisfy R4 and a red there is about the race',denom);

      await back(r,D-(T-1),80);await r.settle(4000);
      const atPrev=await plyTxt(r);
      L.say(!!atPrev&&atPrev.indexOf((T-1)+'/85')>=0,tag+'R2 walked back to ply '+(T-1)+' with the engine still off',atPrev);
      /* FILTERED TO THE CONFOUNDER, not to "no errors at all" [antagonist A's F6, upheld]. A trap is exactly
         what must not have happened - it is what makes a red meaningless - but an unrelated page error is
         not, and the gate's own closing assertion allows the trap by the same exact text. */
      const trapsBefore=r.errs.filter(e=>/RuntimeError: unreachable/.test(e));
      L.say(trapsBefore.length===0,tag+'R2b PRECONDITION: the engine-off walk trapped the WASM worker ZERO times, so the worker is HEALTHY before the race - a trapped worker answers nothing and would redden this arm on every bundle for a reason that is not the defect',{traps:trapsBefore.length,otherErrs:r.errs.length-trapsBefore.length});

      await r.tapText(/^⋯$/,{wait:500}).catch(()=>{});
      await r.tapText(/Analyze with the engine/,{wait:900}).catch(()=>{});
      await r.settle(6000);
      const eng=await r.rect('[data-ct="rev-engline"]');
      L.say(!!eng,tag+'R3 COMPANION: the engine line row is actually on screen, so there really are two analysis callers from here on',eng&&eng.text);

      await fwd(r,1,120);
      /* THE STEP-AWAY IS TIMED OFF THE ENGINE LINE'S OWN ARRIVAL, read at 50ms granularity. */
      const t0=Date.now();
      const engVar=async()=>{const t=await r.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});return {txt:t,got:hasVar(t)};};
      /* R3c CONTROLS THE YIELD HALF, AND IT NEEDS NO STEP-AWAY AT ALL.
         The yield's job is to stop sacRun ABORTING the engine line's query. Its observable is therefore the
         ENGINE LINE, not the sentence: without the yield, sacRun's sfEval1 kills the engline's in-flight
         sfBestLine on exactly the Brilliant and Great plies sacRun fires on, and the engline is left with a
         bare number and no variation. Antagonist B measured precisely that on MAIN over an 85-ply walk -
         'rows 38 and 74, precisely the two sacrifice plies, showed a bare number with no variation' - and
         antagonist A's cache-only run reddened the pre-existing ply-25 revisit assertion for the same
         reason from the other door. So this one poll controls the yield half on a healthy worker.
         WHY THIS REPLACED A SECOND ARM, and it is the more useful half of the story. The first version of
         this block had a 'waiting' arm that stepped away at ~500ms, while the engline query was still
         running, in order to catch sacRun yielding. MEASURED: that step-away ABORTS A LIVE ENGLINE QUERY,
         which is #356's abort-before-readyok, and it TRAPPED THE WASM - so the arm went RED on the
         SHIPPING bundle (37 pass / 2 fail, one PAGEERROR) for a reason that is not the defect. An arm that
         reliably reddens a correct build is worse than one that cannot redden a broken one, and no
         precondition can save it because the trap happens DURING the race, after the precondition passed.
         The route below never interrupts a live engline query and measured ZERO page errors. */
      let arrivedMs=null,lastTxt=null;
      for(let i=0;i<160;i++){const e=await engVar();lastTxt=e.txt;if(e.got){arrivedMs=Date.now()-t0;break;}await r.page.waitForTimeout(50);}
      L.say(arrivedMs!==null,tag+'R3c THE YIELD HALF: on this Brilliant ply the ENGINE LINE produces a real variation, so sacRun did not abort it. Without the yield, sacRun kills the engline mid-search on exactly these plies and it is left with a bare number.',{englineArrivedMs:arrivedMs,engline:lastTxt});
      /* Stepping away NOW catches sacRun IN FLIGHT: the worker has just been freed by the engline, sacRun
         has been yielding for it and takes it at once for 700ms. That is the only state in which an aborted
         search can be stored as an answer, so this is what the CACHE and TOKEN half exists for. Timed off
         the observed arrival rather than a wall-clock literal [antagonist B's cross-read]. */
      await r.page.waitForTimeout(200);
      await fwd(r,1,120);await r.settle(4000);
      await back(r,1,120);await r.settle(12000);
      const atT=await plyTxt(r);
      L.say(!!atT&&atT.indexOf(T+'/85')>=0&&/Brilliant/.test(atT),tag+'R4a back on ply '+T+' AND it really is the Brilliant - sacRun only fires on Brilliant or Great, so this names the state R4 reads',atT);
      const raced=await why(r);
      L.say(IF(raced),tag+'R4 THE CACHE AND TOKEN HALF: stepping off the Brilliant ply while sacRun HOLDS the worker aborts its search mid-flight, and that aborted search used to be stored as the answer - so the "If they take it" clause never came back. It must be here on return.',raced);

      await fwd(r,1,120);await r.settle(2000);await back(r,1,120);await r.settle(12000);
      const raced2=await why(r);
      L.say(IF(raced2),tag+'R5 and it is STILL here on a second return, so the entry is a real answer and not a one-off recovery',raced2);
      /* R6 IS BOTH AN ASSERTION AND A VALIDITY FLAG, AND ITS FIRST WORDING TOLD THE READER TO THROW AWAY
         FOUR TRUE POSITIVES. It said "a red here would mean nothing". MEASURED on main: R2b passes (zero
         traps before the race) and R6 then reads traps:1 - so the trap happens DURING the race and it is
         CAUSED BY THE DEFECT, because sacRun's abort of the engine line IS #356's abort-before-readyok.
         On main the one cause produces all four reds at once: the engline loses its variation (R3c), the
         worker traps (R6), and the clause never returns (R4, R5). A reader who took the old wording at
         face value would have discarded the whole control.
         SO READ R6 WITH R3c, AND THE PAIR IS UNAMBIGUOUS:
           R6 red  AND R3c red  -> THE DEFECT. The abort killed the variation and trapped the worker. This
                                   is main's signature and antagonist B measured the same thing from the
                                   other door (2 traps on an 85-ply engine-on walk, both at sacrifice plies).
           R6 red  AND R3c green -> THE CONFOUNDER. Something else trapped the worker, the clause is then
                                   permanently absent on EVERY bundle, and R4's verdict is worthless. That
                                   is the case that killed this block's first second arm, which trapped the
                                   worker with its own step-away and so reddened the SHIPPING bundle.
           R6 green              -> the fix also removes the trap, which is a real property of it and not
                                   merely hygiene: this is antagonist B's measured benefit asserted. */
      const trapsAfter=r.errs.filter(e=>/RuntimeError: unreachable/.test(e));
      L.say(trapsAfter.length===0,tag+'R6 the WASM worker did not trap at any point during the race, which is a PROPERTY OF THE FIX and not only a validity check - sacRun no longer aborts the engine line, so it no longer trips #356. READ THIS WITH R3c: red here AND red at R3c is the defect\u2019s own signature (one abort, both effects); red here with R3c GREEN is an unrelated trap and then R4 means nothing',{traps:trapsAfter.length,errs:r.errs.slice(0,3)});
      await r.close();
    }
  }

  L.note('page errors seen (the WASM trap is EXPECTED and allowed by exact text): '+JSON.stringify(b.errs.slice(0,6)));
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  // ── THE NON-VACUITY LINE THE RECOVERY ASSERTIONS ABOVE DEPEND ON [#544, item (25)]. ──────────────────────
  // IT IS READ HERE AND NOT BEFORE THE FIVE, and the reason is mechanical rather than stylistic: b.errs
  // accumulates across the whole run, so this is the first point at which the count is authoritative for all
  // of it. The unit control sits above L.run's browser work so a reader meets the instrument first.
  // IT IS NOT A RED WHEN THE COUNT IS ZERO, and that is a decision with a cost on both sides. A red would
  // make this gate - and so the suite, and so every push - fail on a container property rather than on the
  // tree, which is the trade #508 declined and the reason gate 75 sat in gates/pending/ for twelve builds.
  // What the job asks for instead is exactly what happens: 'the honest form is an explicit NOTE that the run
  // did not enter the state, so the log says so, rather than five silent passes'. So a zero emits NO PASS AT
  // ALL - reported, never credited - and names the five assertions it governs.
  // AND THE NON-ZERO BRANCH IS A NOTE TOO, NOT A PASS [antagonist A of #544, finding F2, UPHELD].
  // It was `if(nTrap>0){ L.say(nTrap>0, ...) }` - THE ASSERTION'S CONDITION WAS THE GUARD'S CONDITION, so it
  // was a PASS line that could not fail, credited to the suite total, inside the repair for a vacuity job.
  // CLAUDE.md's rule for this class is explicit and it covers both halves: a missing denominator is
  // "REPORTED, never credited: a red, or an explicit note that says it did not run, and NEVER A PASS". The
  // zero branch obeyed it and the non-zero branch broke it.
  // SO NEITHER BRANCH ASSERTS, AND THAT IS THE RIGHT ANSWER RATHER THAN A RETREAT: the count is a fact about
  // the CONTAINER, and the paragraph above gives the reason a zero may not redden a push. A quantity that must
  // not gate anything has nothing to assert about it - what the job asked for is that the log always SAY which
  // happened, and it does, in both directions. The instrument above (trapCount, unit-tested over four inputs
  // including the empty list) is what is asserted, and it is asserted where it can fail.
  // ════════ TC-R83 (US-R78), #547 item (116): AT A GAME-OVER PLY THE ENGINE ROW SAYS WHY THERE IS NO LINE ════════
  // jobs/terminal-ply-engine-line-bare-ellipsis-2026-09-27. Pre-fix the row read "0.0 …" at the stalemate's 19/19 and "0-1 …"
  // at Fool's Mate's 4/4, unchanged over 12s - the shape of a dead query (#389). These are the first drawn and lost games
  // this suite has ever imported. Ply 8 of the same stalemate game is the must-stay-green control: a live position, where
  // the reason must NOT appear and a real line must arrive. (NOT ply 10: measured on both the fixed and the pre-fix bundle, ply
  // 10 - after 5.Qxc7 - never gets a line, '+5.1 …' for 24s+ even when reached directly while 9 and 8 answer in 5s. That is
  // a separate dead-query finding, recorded in the #547 run report, and a control must not stand on a defect.)
  // [#549 item (91): ply 10 measured with a line in 1.0 s on HEAD ('+5.2 6. Qxb8 f5 …'), fixed by the same cedb498; ply 8 stays the control.]
  {const GAMES=[{k:'stalemate',want:/^Stalemate — /,pgn:'[Result "1/2-1/2"]\n\n1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2',n:19},
                {k:'checkmate',want:/^Checkmate — /,pgn:'[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1',n:4}];
   for(const G of GAMES){
    const t=await L.launch({geo:'kunal730',name:'engline-terminal-'+G.k,store:{ct_pool:'3'}});await t.open();
    let ok=true;
    try{await t.tile('Review');await t.page.locator('textarea').first().fill(G.pgn);await t.tapText(/^⚡ Analyze Game$/,{wait:300});
      await t.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await t.settle(600);
      await t.tapText(/^Start review/,{wait:900});await t.tapText(/^⋯$/,{wait:500}).catch(()=>{});await t.tapText(/Analyze with the engine/,{wait:900}).catch(()=>{});await t.settle(1200);
      for(let i=0;i<G.n+4;i++){await t.page.keyboard.press('ArrowRight');await t.page.waitForTimeout(80);}}catch(e){ok=false;}
    const rd=()=>t.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');const pl=(document.body.innerText||'').match(/(\d+)\s*\/\s*(\d+)/);
      return {txt:e?(e.innerText||'').replace(/\s+/g,' ').trim():null,sw:e?e.scrollWidth:0,cw:e?e.clientWidth:0,ply:pl?pl[0]:null};});
    const r0=await rd();
    if(!L.say(ok&&r0.txt!==null&&r0.ply===G.n+'/'+G.n,'TC-R83 '+G.k+' PRECONDITION the review reached the last ply '+G.n+'/'+G.n+' with the engine row on',r0)){await t.close();continue;}
    const reads=[];for(let k=0;k<3;k++){await t.page.waitForTimeout(4000);reads.push(await rd());}
    L.say(reads.every(r=>G.want.test(r.txt||'')),'TC-R83 '+G.k+' at the game-over ply the row SAYS WHY there is no line, on all three reads over 12s',reads.map(r=>r.txt));
    L.say(reads.every(r=>!/…/.test(r.txt||'')),'TC-R83 '+G.k+' and it is not the dead-query shape: no ellipsis anywhere in the row',reads.map(r=>r.txt));
    L.say(reads.every(r=>r.sw<=r.cw+1),'TC-R83 '+G.k+' the whole reason is visible in its one-line row (scrollWidth '+reads[0].sw+' <= clientWidth '+reads[0].cw+')',reads.map(r=>[r.sw,r.cw]));
    if(G.k==='stalemate'){
      for(let i=0;i<G.n-8;i++){await t.page.keyboard.press('ArrowLeft');await t.page.waitForTimeout(80);}
      let c=await rd();for(let k=0;k<60&&!/[a-h][1-8]/.test(c.txt||'');k++){await t.page.waitForTimeout(500);c=await rd();}   // 30s: under the suite's load the ply-8 line took more than the 12s first allowed (#547 h3c), unloaded it came in ~5s
      L.say(c.ply==='8/'+G.n,'TC-R83 control PRECONDITION the walk came back to ply 8, a live position',{ply:c.ply});
      /* #547, the full suite: this control also required "a real engine line arrives" at ply 8 within 30s, and that half has NEVER held in
         this container on ANY bundle - measured red on main 29b60c2, on 7ac2cfa (the commit that wrote it) and on c7f6a1228e43, including
         going STRAIGHT to ply 8 without visiting the game-over ply ('+1.3 …' for 30s each time). It is a pre-existing engine-liveness fault
         on this route, not part of item (116)'s claim, and it is filed as its own job rather than left as a red that names the wrong change.
         The control keeps its one assertion and asserts what (116) is about: the reason row is confined to the game-over plies. */
      L.say(c.ply==='8/'+G.n&&!/^(Stalemate|Checkmate) — /.test(c.txt||'')&&!!(c.txt||'').trim(),'TC-R83 control at ply 8 the game-over reason does NOT appear - the row shows the live position\'s evaluation, so the fix is confined to game-over plies',{txt:c.txt});
      /* #549, item (91), jobs/review-engine-line-never-arrives-at-ply-8-of-the-stalemate-game-2026-11-03: THE LINE HALF, RESTORED.
         The dead search above was a STALE bestmove: the previous search's answer to `stop` (here 'bestmove a6a5', a Black move with
         White to move) arrived just after this query's `go` and finished it, so uciToMove rejected it and the line came out empty.
         cedb498 (#549 item (26)) made sfBestLine ignore everything before its own search's depth-1 line. Measured with a worker-traffic
         probe at 375x761, ct_pool 3: main 7340372 '+1.3 …' after 35.8 s; cedb498 '+1.4 5. d4 Rg6 …' in 2.1 s; HEAD '+1.4 5. d4 …' in
         1.0 s direct, and in 1.0 s after the 19/19 walk and back. A separate assertion, not a conjunct, so the reason half above
         still reports on its own (#493). */
      L.say(c.ply==='8/'+G.n&&hasVar(c.txt),'TC-R83 control at ply 8 a real engine line arrives within 30s (a numbered move in real SAN after the evaluation), not the dead-query \'…\' shape',{txt:c.txt});
    }
    /* TC-R83b [#548, item (29); the stalemate Analyze prompt folded into jobs/terminal-ply-engine-line-bare-ellipsis-2026-09-27]:
       analysing FROM the game-over ply, before any move is played, the analysis line used to read 'your board · play any move' -
       at a position with no legal move. Walk to the last ply, open analysis there, and read the analysis line's prompt. Arrival
       first (#385): the last ply was reached and the analysis prompt is on screen; then it names the terminal kind and does not
       invite a move. */
    {let a={ply:null,line:null};
     try{for(let i=0;i<G.n+4;i++){await t.page.keyboard.press('ArrowRight');await t.page.waitForTimeout(60);}await t.settle(400);
       await t.tapCt('rev-fab',900);
       a=await t.page.evaluate(()=>{const l=document.querySelector('[data-ct="rev-move-line"]');const pl=(document.body.innerText||'').match(/(\d+)\s*\/\s*(\d+)/);return {ply:pl?pl[0]:null,line:l?(l.innerText||'').replace(/\s+/g,' ').trim():null};});}catch(e){a.err=String(e&&e.message||e);}
     L.say(!!a.line&&/your board/.test(a.line),'TC-R83b '+G.k+' PRECONDITION analysis opened at the game-over ply with no move played - the line reads the "your board" prompt',a);
     L.say(!!a.line&&new RegExp(G.k+', no legal move').test(a.line)&&!/play any move/.test(a.line),'TC-R83b '+G.k+' the analysis prompt at the game-over ply names the '+G.k+' and does NOT say "play any move"',a);}
    L.say(t.errs.length===0,'TC-R83 '+G.k+' no console errors',{errs:t.errs.slice(0,2)});
    await t.close();
   }}
  const nTrap=trapCount(b.errs);
  if(nTrap>0){
    L.note('TC-SUITE-236 THE WASM TRAP FIRED '+nTrap+' time(s) on this run (of '+b.errs.length+' page error(s)), so the five recovery assertions above - the first-visit number, the revisit variation and the revisit sign at each of plies 19 and 25 - are about a REAL event rather than a non-event. No PASS is emitted: this is a property of the container, not of the tree, and the same rule that forbids reddening on a zero forbids crediting on a non-zero.');
  }else{
    L.note('TC-SUITE-236 NOT CHECKED: ZERO /RuntimeError: unreachable/ page errors were observed on this run, so there was NOTHING TO RECOVER FROM and the five recovery assertions above passed over a NON-EVENT. No PASS is emitted for this line - a missing denominator is reported and never credited. The reference reading in this container is SIX traps against an allowed count of 7, measured at #504 in the 22-engline-recovery section of that run, which this repository does not archive, so a zero here means the trap has stopped firing and this gate has stopped guarding #389.');
  }
  // TC-R105 [#548 item (114); jobs/explain-engine-lines-in-plain-words, Kunal's feature 1 for batch 8]: THE ENGINE LINE SAYS IN PLAIN
  // WORDS WHAT EACH MOVE IS FOR. Review, Opera Game, ply 10 with the engine on, at 375x730 and 320x568: wait for the line, tap the row,
  // and read the reading it opens. It states who is better and roughly by how much, gives at least two of the line's moves a phrase,
  // cuts nothing (each line wraps inside its box), moves nothing (the board's top and width are unchanged), and a tap closes it. The
  // generator's own truth-by-rule and its 25% fan-out cap are the unit layer's (gates/unit-drill-why.js, the #548 item (114) block).
  {const R=require('../drive/review');
   for(const geo of ['kunal730','se']){const b=await L.launch({geo,store:R.SEED,name:'engwhy-'+geo});await b.open();let ok=true;
    try{await R.states['moves-ply10'](b);await R.engineSet(b,true);await b.page.waitForFunction(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return !!e&&/\d\.\S/.test(e.innerText||'');},{timeout:60000});await b.settle(500);}catch(e){ok=false;}
    const bd=()=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(e=>e.getBoundingClientRect()).sort((x,c)=>c.width-x.width)[0];return g?[+g.top.toFixed(1),+g.width.toFixed(1)]:null;});
    const b0=await bd();
    const rowTxt=await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-engline"]')||{}).innerText||'').replace(/\s+/g,' '));
    await b.page.click('[data-ct="rev-engline"]').catch(()=>{});await b.settle(600);
    const r=await b.page.evaluate(()=>{const p=document.querySelector('[data-ct="rev-engwhy"]');if(!p)return null;const q=p.getBoundingClientRect();
      const ev=p.querySelector('[data-ct="rev-engwhy-eval"]');const mv=[...p.querySelectorAll('[data-ct="rev-engwhy-move"]')];
      const cut=[p,...mv].filter(e=>e.scrollWidth>e.clientWidth+1).length;
      return {ev:ev?(ev.innerText||'').trim():null,moves:mv.map(m=>(m.innerText||'').replace(/\s+/g,' ').trim()),withWhy:mv.filter(m=>(m.children[1]&&(m.children[1].innerText||'').trim().length>2)).length,cut,inView:q.top>=-0.5&&q.bottom<=innerHeight+0.5,right:q.right,vw:innerWidth};});
    const b1=await bd();
    L.say(ok&&!!r,geo+': TC-R105 PRECONDITION the engine line arrived and a tap on it opened its plain-words reading',r);
    if(r){
     L.say(/^(About level|(White|Black) (is better by about .+|is winning|has a forced mate))$/.test(r.ev||''),geo+': TC-R105 it says in words who is better and roughly by how much ("'+r.ev+'")',{ev:r.ev});
     L.say(r.moves.length>=2&&r.withWhy>=2,geo+': TC-R105 and at least two of the line\'s moves carry a phrase saying what they are for ('+r.withWhy+' of '+r.moves.length+')',{moves:r.moves});
     L.say(r.cut===0&&r.inView&&r.right<=r.vw+0.5,geo+': TC-R105 nothing in it is cut and it is inside the screen',{cut:r.cut,inView:r.inView,right:r.right,vw:r.vw});
     L.say(!!b0&&!!b1&&b0[0]===b1[0]&&b0[1]===b1[1],geo+': TC-R105 opening it moved nothing - the board top and width are unchanged ('+JSON.stringify(b0)+' -> '+JSON.stringify(b1)+')',{b0,b1});
     // THE NUMBERS ARE THE GAME'S [#548 round-1 antagonist A veto]: the first draft numbered the reading from move 1 at every ply, because
     // toFEN always writes ' 0 1'. Pinned to the DOMAIN first (ply 10 is after 5...; White plays move 6) and to the row beside it second.
     const rn=(rowTxt.match(/(?:^|\s)(\d+)\.+\s*[KQRBNOa-h]/)||[])[1] /* a MOVE number: digits, dots, then a SAN letter - not the '1.3' inside the evaluation '+1.3', which the first draft read */,en=((r.moves[0]||'').match(/^(\d+)(\.|\u2026)/)||[])[1];
     L.say(en==='6'&&rn==='6','TC-R105 '+geo+': the reading numbers its moves from the GAME - its first move is 6., as the row\'s is (reading "'+(r.moves[0]||'').slice(0,20)+'", row "'+rowTxt.slice(0,30)+'")',{reading:en,row:rn});
     await b.page.click('[data-ct="rev-engwhy"]').catch(()=>{});await b.settle(400);
     L.say(!(await b.page.locator('[data-ct="rev-engwhy"]').count()),geo+': TC-R105 and a tap on it closes it');}
    await b.close();}}

  // ── BLOCK P [#549, item (26); jobs/review-engine-line-recommends-the-losing-recapture-at-opera-ply-29-2026-11-05, P1]. TC-R109.
  // THE ENGINE LINE AT OPERA PLY 29 (after 15.Bxd7+) MUST NOT RECOMMEND THE RECAPTURE THE REVIEW CALLS A BLUNDER. #548's antagonist B read
  // '+2.5 15... Nxd7 16. Qb7' there, through Review and through the drill's 'Analyse this position' board, and Nxd7 loses to 16.Qb8+
  // Nxb8 17.Rd8#. MEASURED at #549 with a worker-message log: the lite engine prefers Nxd7 at every depth to 15 and finds Qxd7 only at
  // depth 16, the review's own grading depth - so a 900 ms search that stopped short of 16 printed it; and on this container the line
  // read a bare '+6.5 ...' for the whole visit instead, because the aborted previous search's `bestmove b5d7` arrived AFTER readyok and
  // was taken as this query's answer. THE PIN IS THE STORED ANALYSIS, NOT A SIBLING READOUT: the move the review's best chip names at
  // ply 30 (a separate pooled search) on the Review door, and the card's own stored move on the drill door. At 0.5, 2 and 5 s after
  // landing the row either shows a variation that begins with that move or is still pending ('<eval> ...' with no move after it); and
  // within 25 s it must show the variation (a search that never finishes is a red, not a pass over nothing).
  {const R=require('../drive/review');
   const ELT=()=>b.page.evaluate(()=>((document.querySelector('[data-ct="rev-engline"]')||{}).innerText||'').replace(/\s+/g,' ').trim());
   let b=null;
   const firstMv=(s)=>{const m=String(s||'').match(/15\.\.\.\s*(\S+)/);return m?m[1].replace(/[+#!?]+$/,''):null;};
   const pending=(s)=>/^([+-]?\d+\.\d|M\d*|-M\d*)\s*…$/.test(String(s||''));
   const marks=async(tag,want)=>{const t0=Date.now();const seen=[];
     for(const ms of [500,2000,5000]){const w=ms-(Date.now()-t0);if(w>0)await b.page.waitForTimeout(w);seen.push({ms,eng:await ELT()});}
     for(const x of seen)L.say(!!want&&(pending(x.eng)||firstMv(x.eng)===want),'TC-R109 '+tag+' at '+(x.ms/1000)+' s the engine line is still pending or begins 15... '+want+' as the stored analysis does - never 15... Nxd7, which the review calls a blunder ("'+x.eng.slice(0,60)+'")',{eng:x.eng,want,first:firstMv(x.eng)});
     let fin='';for(let k=0;k<40;k++){fin=await ELT();if(firstMv(fin))break;await b.page.waitForTimeout(500);}
     L.say(!!want&&firstMv(fin)===want,'TC-R109 '+tag+' and the search FINISHES: within 25 s the line shows its variation and it begins 15... '+want+' ("'+fin.slice(0,60)+'")',{fin,want});};
   // DOOR 1: Review, Opera Game, engine on.
   b=await L.launch({geo:'kunal761',store:{...R.SEED,ct_pool:'3'},name:'engline-ply29'});await b.open();let ok=true,best=null,ml30='';
   try{await R.states['moves-ply10'](b);await R.engineSet(b,true);await R.goPly(b,30);await b.settle(800);
     ml30=await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-move-line"]')||{}).innerText||'').replace(/\s+/g,' ').trim());
     best=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-best"]');const m=e&&(e.innerText||'').match(/(O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)/);return m?m[1]:null;});
     await R.goPly(b,29);}catch(e){ok=false;}
   const ml29=await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-move-line"]')||{}).innerText||'').replace(/\s+/g,' ').trim());
   L.say(ok&&/Nxd7/.test(ml30)&&/Blunder/.test(ml30)&&!!best&&best!=='Nxd7','TC-R109 PRECONDITION review: at ply 30 the stored analysis calls 15...Nxd7 a Blunder and its best chip names another move ('+best+')',{ml30,best});
   L.say(/29\/33/.test(ml29),'TC-R109 PRECONDITION review: the board is on ply 29, after 15.Bxd7+',{ml29});
   await marks('review ply 29',best);
   L.note('TC-R109 review errors: '+JSON.stringify(b.errs.slice(0,3)));await b.close();
   // DOOR 2: the drill card for 15...Nxd7, solved, then 'Analyse this position'.
   b=await L.launch({geo:'kunal761',name:'engline-drill29',store:{ct_pool:'3',ct_mymistakes:[{fen:'4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 1',no:15,uci:'e6d7',label:'Blunder',played:'Nxd7',ts:1791000000000,last:null,why:'the queen takes back',hint:'which piece recaptures?'}]}});
   await b.open();await b.tile('Review');await b.settle(700);ok=true;
   try{await b.tapText(/find the move you missed/,{wait:1800});await b.move('e6','d7',900);await b.settle(1200);await b.tapCt('drill-analyse',300);}catch(e){ok=false;}
   const onAna=ok&&await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-engline"]'));
   L.say(!!onAna,'TC-R109 PRECONDITION drill: the 15...Nxd7 card was solved with 15...Qxd7 and "Analyse this position" opened a board with the engine line',{ok,onAna});
   await marks('drill analyse',onAna?'Qxd7':null);
   await b.close();}

  // ── BLOCK Q [#549, item (26), antagonist A round 2, A2-R2 P1 on cedb498]. TC-R109, THE HANDSHAKE HALF: NO `go` IS EVER POSTED TO A
  // STOCKFISH WORKER WHILE ANOTHER `go` ON THAT WORKER HAS NOT ANSWERED `bestmove`. cedb498's anaIdle waited for the stopped search's
  // bestmove, but (a) a SECOND query arriving inside that wait replaced the first waiter and left its 2.5 s timer armed, and the orphan
  // timer then cleared the running flag while a newer search ran; and (b) a late bestmove of a search already given up on cleared it too.
  // Either way the next query took the bare readyok path and posted `go` into a running search - the #356 violation - and the WASM
  // trapped (RuntimeError: unreachable), 2/2 for the antagonist on a double-step then 300 ms steps. THE INSTRUMENT IS THE PROTOCOL
  // ITSELF, NOT A READOUT: an init script wraps window.Worker before the app loads and counts, per worker, every `go` posted while that
  // worker's previous `go` has no `bestmove` yet. DENOMINATORS, each its own assertion: the walk really ran the engine (gos were posted
  // on the review's worker, and more than one step's worth), so a page that never searched cannot pass the zero.
  // SCOPE, said out loud: the protocol assertion is over the REVIEW's workers (the analysis worker and the pool). The app's MAIN worker
  // (sfRef: the eval bar's `go depth 12` and the computer's moves in Play) still uses the bare readyok handshake, which is the same #356
  // class, and on this walk it posts a go before its stopped search's bestmove in some runs (measured at #549: 1 of 3 runs on the fixed
  // bundle, 2 of 2 on cedb498's). It is EXCLUDED BY ITS MECHANISM, not by position: exactly one worker may be excluded, it must be the one
  // created before the review opened, and it must be the one posting `go depth 12`; its count is printed as a NOTE, never credited.
  {const R=require('../drive/review');
   const b=await L.launch({geo:'kunal761',store:{...R.SEED,ct_pool:'3'},name:'engline-handshake'});
   await b.ctx.addInitScript(()=>{if(window.__ctWk)return;const W=window.Worker;const log=window.__ctWk={workers:[],viol:[]};
     window.Worker=function(url,o){const w=new W(url,o);const rec={url:String(url),born:Math.round(performance.now()),gos:0,best:0,out:0,viol:0,d12:0,err:0};log.workers.push(rec);w.addEventListener('error',()=>{rec.err++;});
       w.addEventListener('message',(e)=>{const m=String(e.data||'');if(m.startsWith('bestmove')){rec.best++;if(rec.out>0)rec.out--;}});
       const pm=w.postMessage.bind(w);w.postMessage=(m,...a)=>{const t=String(m);if(/^go\b/.test(t)){rec.gos++;if(t==='go depth 12')rec.d12++;if(rec.out>0){rec.viol++;if(log.viol.length<8)log.viol.push({w:log.workers.indexOf(rec),go:t,out:rec.out,at:Math.round(performance.now())});}rec.out++;}return pm(m,...a);};
       return w;};window.Worker.prototype=W.prototype;});
   await b.open();let ok=true,steps=0;const revAt=await b.page.evaluate(()=>Math.round(performance.now()));
   try{await R.states['moves-ply10'](b);await R.engineSet(b,true);await b.settle(1500);
     for(let k=0;k<3;k++){await b.page.keyboard.press('ArrowRight');await b.page.waitForTimeout(10);await b.page.keyboard.press('ArrowRight');steps+=2;
       for(let i=0;i<5;i++){await b.page.waitForTimeout(300);await b.page.keyboard.press('ArrowRight');steps++;}}
     await b.settle(4000);}catch(e){ok=false;}
   const wk=await b.page.evaluate(()=>window.__ctWk||null);
   const all=wk?wk.workers.filter(w=>/stockfish/i.test(w.url)):[];const mainW=all.filter(w=>w.d12>0);
   L.say(mainW.length===1&&mainW[0]===all[0]&&mainW[0].born<revAt,'TC-R109 handshake EXCLUSION PINNED the one worker left out is the main one: exactly one worker posts the eval bar\'s go depth 12, and it is the first, created before the review opened',{mainW:mainW.map(w=>({born:w.born,d12:w.d12})),revAt,n:all.length});
   const sf=all.filter(w=>!mainW.includes(w));const gos=sf.reduce((a,w)=>a+w.gos,0),viol=sf.reduce((a,w)=>a+w.viol,0);
   L.note('TC-R109 handshake NOT ASSERTED, the main worker (eval bar and Play): '+(mainW[0]?mainW[0].viol+' go(s) posted before the previous go answered, of '+mainW[0].gos+', worker errors '+mainW[0].err:'not found')+' - the same #356 class, outside this fix');
   L.say(ok&&!!wk&&steps===21,'TC-R109 handshake PRECONDITION the Worker wrap was installed before the app loaded and the walk ran: engine on at ply 10, three double-steps (two ArrowRight 10 ms apart) each followed by five steps 300 ms apart ('+steps+' steps)',{ok,steps,workers:wk&&wk.workers.length});
   L.say(gos>steps,'TC-R109 handshake DENOMINATOR the walk made the engine search: '+gos+' go(s) posted to the review\'s '+sf.length+' Stockfish worker(s), more than the '+steps+' steps',{gos,workers:sf.map(w=>({gos:w.gos,best:w.best}))});
   L.say(!!wk&&viol===0,'TC-R109 handshake no go is posted to a review worker while its previous go has not answered bestmove ('+viol+' of '+gos+')',{viol,first:wk&&wk.viol.filter(v=>!mainW.includes(wk.workers[v.w]))});
   const pe=b.errs.filter(e=>/^PAGEERROR/.test(e));
   L.say(pe.length===0,'TC-R109 handshake 0 PAGEERRORs on the walk - the WASM worker never traps (RuntimeError: unreachable) ('+pe.length+')',{pe:pe.slice(0,3),workerErrs:all.map(w=>w.err)});
   await b.close();}
  // ── BLOCK S [#549, item (81); jobs/a-trapped-analysis-worker-leaves-the-brilliant-explanation-permanently-short-and-two-fast-taps-reach-it-2026-10-10, P1].
  // TC-R115. THE ANALYSIS WORKER DIES UNDER sacRun's SEARCH AND THE READER STAYS ON THE PLY. Measured on the pre-fix HEAD bundle (d335e71dffd4)
  // at 375x730, Kunal's game ply 38 (19...Bxh3!!): the sentence read "You give up a piece. Black is clearly better." for the whole 20 s, 2 of 2,
  // and the clause came back only on a revisit. THE DEATH IS INJECTED, NOT RACED: an init script wraps window.Worker and, once armed, fires an
  // `error` event on the review's analysis worker 150 ms after it receives sacRun's own `go movetime 700`, then terminates it - the shape a
  // real WASM trap takes (measured on main's #548 bundle: one worker `error` event plus the PAGEERROR). A race would make the state a coin
  // flip (#391); the injection makes it certain, and S1/S2 prove it was entered. Pool workers are told apart by their `Hash value 16`.
  // NOT COVERED, said out loud: a worker that dies SILENTLY (no `error`, still marked ready) stays short for ever on every bundle - measured
  // 3 visits of 20 s on HEAD - and is the worker-recovery half the job excludes.
  {const KPGN=require('fs').readFileSync(__dirname+'/../../claude/agents/bench/pgn/184024052818.pgn','utf8');
   const T=38, IF=(x)=>!!x&&/\bIf\s+\S+,\s+\S+/.test(x);
   const why=(bb)=>bb.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
   const b=await L.launch({geo:'kunal761',store:{ct_pool:'3',ct_safe:'51,31'},name:'engline-sac-worker-death'});
   await b.ctx.addInitScript(()=>{if(window.__ctDie)return;const W=window.Worker;const log=window.__ctDie={n:0,err:0,killed:0,armed:false};
     window.Worker=function(u,o){const w=new W(u,o);log.n++;let pool=false;w.addEventListener('error',()=>{log.err++;});const pm=w.postMessage.bind(w);
       w.postMessage=(m,...a)=>{const t=String(m);if(/Hash value 16/.test(t))pool=true;
         if(log.armed&&!log.killed&&!pool&&t==='go movetime 700'){log.killed=Math.round(performance.now());log.nAtKill=log.n;setTimeout(()=>{try{w.dispatchEvent(new ErrorEvent('error',{message:'injected worker death'}));w.terminate();}catch(e){}},150);}
         return pm(m,...a);};return w;};window.Worker.prototype=W.prototype;});
   await b.open();let ok=true,short=null,landed=null,got=null,atT=null;
   try{await b.tile('Review');await b.page.locator('textarea').first().fill(KPGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
     await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(600);
     await b.tapText(/^Start review/,{wait:900});
     await fwd(b,T-2,80);await b.settle(4000);
     await b.tapText(/^⋯$/,{wait:500}).catch(()=>{});await b.tapText(/Analyze with the engine/,{wait:900}).catch(()=>{});await b.settle(5000);
     await b.page.evaluate(()=>{window.__ctDie.armed=true;});
     await fwd(b,1,150);await fwd(b,1,60);atT=await plyTxt(b);
     for(let i=0;i<60&&!(await b.page.evaluate(()=>window.__ctDie.killed));i++)await b.page.waitForTimeout(100);
     await b.page.waitForTimeout(450);short=await why(b);
     const t0=Date.now();for(let i=0;i<40;i++){landed=await why(b);if(IF(landed)){got=Date.now()-t0;break;}await b.page.waitForTimeout(500);}
   }catch(e){ok=false;}
   const d=await b.page.evaluate(()=>window.__ctDie||null);const atEnd=await plyTxt(b);
   L.say(ok&&!!atT&&atT.indexOf(T+'/85')>=0&&/Brilliant/.test(atT)&&!!(await b.rect('[data-ct="rev-engline"]')),'TC-R115 PRECONDITION the review reached ply '+T+', the Brilliant 19...Bxh3, with the engine line on screen',{atT});
   L.say(!!d&&!!d.killed&&d.err>=1,'TC-R115 DENOMINATOR the analysis worker really died under sacRun\'s search: an error event 150 ms after its go movetime 700, then terminate',d);
   L.say(!!short&&!IF(short)&&/give up/.test(short),'TC-R115 STATE ENTERED half a second after the death the sentence is the short one - the sacrifice named, no "If they take it" clause ("'+short+'")',{short});
   L.say(IF(landed)&&atEnd===atT,'TC-R115 WITHOUT STEPPING OFF THE PLY the clause still arrives: sacRun asks again on a fresh worker after the one under it died (in '+(got===null?'never, 20 s watched':got+' ms')+'; was never on the pre-fix bundle)',{landed,got,atEnd});
   L.say(!!d&&d.n>(d.nAtKill||0),'TC-R115 and it was asked on a NEW worker - '+(d?d.n-(d.nAtKill||0):0)+' created after the death - not on the dead one',d);
   await b.close();}
},'ENGLINE-RECOVERY');
