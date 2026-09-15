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
const fwd=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(110);}};
const back=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000});await b.page.waitForTimeout(110);}};
L.run(async()=>{
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
  L.note('page errors seen (the WASM trap is EXPECTED and allowed by exact text): '+JSON.stringify(b.errs.slice(0,6)));
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();
},'ENGLINE-RECOVERY');
