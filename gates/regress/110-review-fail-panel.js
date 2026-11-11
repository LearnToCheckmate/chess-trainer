'use strict';
// gates/regress/110-review-fail-panel.js - A REVIEW WHOSE ENGINE STOPS ANSWERING SAYS SO, WITH TRY AGAIN AND BACK TO GAMES. TC-R190a..d, US-R123.
//
// WHY [#550, answer a32 of directOpening_2026_11_11_batch10; Kunal 2026-11-11, "a short message with Try again and Back to games when a
// review's analysis fails, as in your mockup (550-136-k14-2)"]. Until #550 no failure state existed (TC-RL-009 "could not induce one"):
// a throw inside importGame left "Analyzing your game" on screen for ever, and a table group that failed on every engine after all its
// retries was graded from a partial or static score and shown as a whole review. Now both end on [data-ct=ana-fail].
//
// HOW: gates/lib.js engineFail:'review' kills every Stockfish worker on its first `go depth 16` (the review's search and nothing
// else's), so every review engine - pool slots and the analysis worker - dies mid-review. The Opera game is imported through Review.
// WHAT IT ASSERTS, at kunal761:
//  (a) TC-R190a the failure panel appears (within 120s), reads "The review stopped before it finished." and "The engine stopped
//      answering. Nothing you did caused it.", and NO review summary is shown (a review graded from no engine is not a review).
//  (b) TC-R190b both buttons are on screen, inside the viewport, at least 44px tall, and the progress line is gone.
//  (c) TC-R190c Try again starts the review again (more engine workers are built and fail) and ends on the panel again.
//  (d) TC-R190d Back to games leaves the panel and returns to the Review entry screen (its paste box is visible).
// DENOMINATOR: the harness really killed engines (engineFail().failed>0) and the review really started.
// CONTROL-RECORD: 1decf98 2026-11-11 total=8 red=5 scope=trial:87014810e439 how=#550 answer a32: the tree before the failure panel, same engineFail:'review' route (4 workers killed) - the dead groups are graded from static scores and a review summary is shown, so both TC-R190a lines, TC-R190b, TC-R190c and TC-R190d are red; the DENOMINATOR, the font pin and zero-errors green. On t51 (a4e7036429a0) 8 of 8 green
const L=require('../lib');const R=require('../drive/review');
L.run(async()=>{
  const b=await L.launch({geo:'kunal761',name:'review-fail',engineFail:'review',store:{ct_pool:'3'}});
  await b.open();
  let started=true;try{await b.tile('Review');await b.page.locator('textarea').first().fill(R.PGN_OPERA);await b.tapText(/^⚡ Analyze Game$/,{wait:1200});}catch(e){started=false;L.note('import: '+String(e).slice(0,120));}
  let shown=false;try{await b.page.locator('[data-ct="ana-fail"]').waitFor({state:'visible',timeout:120000});shown=true;}catch(e){}
  const ef1=await b.engineFail();
  L.say(started&&!!ef1&&ef1.failed>0,'TC-R190 DENOMINATOR the review started and the harness killed '+(ef1&&ef1.failed)+' engine worker(s) on their review search',{started,ef1});
  const st=await b.page.evaluate(()=>{const q=(s)=>document.querySelector(s);const t=(s)=>{const e=q(s);return e?e.textContent:'';};const r=(s)=>{const e=q(s);if(!e)return null;const x=e.getBoundingClientRect();return {t:x.top,b:x.bottom,l:x.left,r:x.right,h:x.height};};
    return {title:t('[data-ct="ana-fail-title"]'),why:t('[data-ct="ana-fail-why"]'),retry:r('[data-ct="ana-fail-retry"]'),back:r('[data-ct="ana-fail-back"]'),prog:!!q('[data-ct="ana-progress"]'),summ:!!q('[data-ct="rev-summary"]'),vw:innerWidth,vh:innerHeight,seam:window.__ctAnaFail||null};});
  L.say(shown&&st.title==='The review stopped before it finished.'&&st.why==='The engine stopped answering. Nothing you did caused it.','TC-R190a the failure panel says the review stopped and that the engine stopped answering ("'+st.title+'" / "'+st.why+'")',st);
  L.say(shown&&!st.summ,'TC-R190a no review summary is shown for a review no engine finished',{summ:st.summ,seam:st.seam});
  const inV=(x)=>!!x&&x.t>=0&&x.b<=st.vh&&x.l>=0&&x.r<=st.vw&&x.h>=44;
  L.say(inV(st.retry)&&inV(st.back)&&!st.prog,'TC-R190b Try again and Back to games are on screen, 44px or taller, and the progress line is gone',{retry:st.retry,back:st.back,prog:st.prog});
  let again=false;
  if(shown){try{await b.page.locator('[data-ct="ana-fail-retry"]').click();await b.page.locator('[data-ct="ana-fail"]').waitFor({state:'detached',timeout:5000});await b.page.locator('[data-ct="ana-fail"]').waitFor({state:'visible',timeout:120000});again=true;}catch(e){L.note('retry: '+String(e).slice(0,120));}}
  const ef2=await b.engineFail();
  L.say(again&&!!ef2&&ef2.failed>ef1.failed,'TC-R190c Try again ran the review again (engine workers failed '+(ef1&&ef1.failed)+' -> '+(ef2&&ef2.failed)+') and ended on the panel again',{again,ef1,ef2});
  let back=false;
  if(shown){try{await b.page.locator('[data-ct="ana-fail-back"]').click();await b.page.locator('[data-ct="ana-fail"]').waitFor({state:'detached',timeout:5000});await b.page.locator('textarea').first().waitFor({state:'visible',timeout:5000});back=true;}catch(e){L.note('back: '+String(e).slice(0,120));}}
  L.say(back,'TC-R190d Back to games leaves the panel and the Review entry screen (its paste box) is back',{back});
  L.say(b.errs.length===0,'TC-R190 zero app errors',b.errs.slice(0,3));
  await b.close();
},'110-review-fail-panel');
