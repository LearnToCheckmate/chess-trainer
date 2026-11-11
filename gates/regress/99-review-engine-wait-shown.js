'use strict';
// gates/regress/99-review-engine-wait-shown.js - WHILE A REVIEW WAITS FOR STOCKFISH, THE SCREEN SAYS SO. TC-R184a..b, US-R117.
//
// WHY [#550, item (90) of directOpening_2026_11_11_batch10; jobs/a-review-can-wait-up-to-120s-for-stockfish-with-no-visible-waiting-state-
// 2026-11-07; #549 antagonist B's residual B3, accepted then and filed]. #549 item (30) made a review wait up to REVIEW_ENGINE_WAIT (120s at
// rest) for Stockfish instead of falling back to the built-in engine after 5s, so a busy phone no longer hands the game to a different
// grader - and for that whole wait the screen read "0% · checking every move", a progress line that does not move. Now the analysing
// panel says "Loading the Stockfish engine… Ns" with a count that rises, and why it waits, until the engine answers.
//
// HOW: the engine's worker script (stockfish-18-lite-single.js) is HELD by a CONTEXT route (a page route does not see a Worker's fetch) for HOLD_MS before it is served, which is what a
// slow phone does to the load, and the Opera game is imported through drive/review's import path.
// WHAT IT ASSERTS, at kunal761:
//  (a) TC-R184a during the hold, [data-ct=ana-progress] reads "Loading the Stockfish engine" and its seconds count RISES between two
//      readings 2s apart (a frozen line is the defect), and NOT "% · checking every move".
//  (b) TC-R184b once the engine is served, the review still completes: its summary is reached, and the progress line no longer says
//      it is loading (the wait ends when the engine answers).
// DENOMINATOR: the route really held the worker (it was requested, and the hold was observed before it was served).
const L=require('../lib');const R=require('../drive/review');
const HOLD_MS=6000;
L.run(async()=>{
  const b=await L.launch({geo:'kunal761',name:'engine-wait',store:{ct_pool:'1'}});
  let held=0,served=0;
  await b.ctx.route('**/stockfish-18-lite-single.js*',async(route)=>{held++;await new Promise(r=>setTimeout(r,HOLD_MS));served++;await route.continue();});
  await b.open();
  let started=true;try{await b.tile('Review');await b.page.locator('textarea').first().fill(R.PGN_OPERA);await b.tapText(/^⚡ Analyze Game$/,{wait:1200});}catch(e){started=false;L.note('import: '+String(e).slice(0,120));}
  const read=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="ana-progress"]');return e?e.textContent:(document.body.innerText.match(/\d+% · checking every move/)||[''])[0];});
  const r1=started?await read():'';await b.settle(2000);const r2=started?await read():'';
  L.say(started&&held>=1&&served===0,'TC-R184a DENOMINATOR the review started and the engine worker was requested and is still being HELD ('+held+' held, '+served+' served)',{started,held,served});
  const n=(t)=>{const m=String(t||'').match(/engine… (\d+)s/);return m?+m[1]:null;};
  L.say(/Loading the Stockfish engine/.test(r1)&&!/checking every move/.test(r1),'TC-R184a while the engine loads the screen says so: "'+r1+'"',{r1});
  L.say(n(r1)!==null&&n(r2)!==null&&n(r2)>n(r1),'TC-R184a and its seconds count rises ('+n(r1)+'s, then '+n(r2)+'s two seconds later)',{r1,r2});
  let done=false;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});done=true;}catch(e){}
  const r3=await read();
  L.say(done&&served>=1&&!/Loading the Stockfish engine/.test(r3||''),'TC-R184b once the engine is served the review completes and the loading line is gone',{done,served,r3});
  L.say(b.errs.length===0,'TC-R184 zero app errors',b.errs.slice(0,3));
  await b.close();
},'99-review-engine-wait-shown');
