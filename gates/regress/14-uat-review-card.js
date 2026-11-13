// regress/14-uat-review-card.js  THE REVIEW JOURNEY, END TO END, BY THE PLAYER'S ROUTE: import + analysis, summary, ply 0,
// 10.Nxb5!!, 17.Rd8#, analysis board, exit, back to the summary - at 375x679.
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [#550 item (59); jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21]: every launch in this file passes ct_pool, so the app runs its POOLED Stockfish path and the single-worker and built-in fallbacks (the harness route is the launch option engineFail 'pool' or 'all', driven by gate 34) are NOT exercised here. Its assertions DEPEND on that branch: the review it imports and grades is the engine's, so its grade and ply readings are the pooled path's.
//
// THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#550; jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-2026-10-01].
// Until #550 this gate RAN gallery card 6 (US-R, "The Review journey"): the card imported the Opera Game, then a timer stepped the
// screen to each checkpoint and a caption strip (data-ct rec-cap) named the story id, and the gate read the caption and the state at
// fixed seconds. It now drives the same journey the way a player does, through gates/drive/review.js: Home -> Review -> paste the
// PGN -> Analyze Game (summary), Start review (ply 0), the move strip (10.Nxb5 at ply 19, 17.Rd8# at the last ply), the round
// Analyze button, Exit analysis, the back arrow (summary). WHAT WENT WITH THE CARD, said rather than left to be noticed: the caption
// lines (the card's own strip, its story ids and its clear-after-hold) and the 'card is in the gallery' line - those are facts about
// the gallery, which gate 15 covers, not about the Review screen. Every state line is kept with its words, less the card's timestamp.
// The move-screen board pin is unchanged: 343 by both routes.
// CONTROL-RECORD: 41b53b4 2026-11-13 total=9 red=2 scope=trial:844bba6021d6 how=#550 job five-gates-enter-their-state-by-tapping-a-dev-gallery-card (gate 14 moved off gallery card 6, US-R, onto drive/review.js): the analysis board's '\u2715 Exit analysis' relabelled '\u2715 Leave' - 'US-R07 analysis board with Undo and Exit' and 'US-R09 back on the summary' red, the guarded exit carrying on; with EVERY state card the job names DELETED (k10, k8, k11 x2, A-06, US-R01, y3 x2; trial:6c107ff5381c) 9/0 on the new route where the old card route read 1/2 and threw; on 77ffccc15668 9/0 here against 15/0 on the old route - the 7 state lines agree verdict for verdict (the board 343 by both), and the 7 caption and gallery lines went with the card. Two board-size controls did NOT red the 343 pin (boardPx-8 in analyze, trial:dd2002730d30; REV_CHROME 304 -> 320, trial:c00ad8a905cd): the streamlined review's board is sized by neither, so that line is not yet shown able to fail by this route
// WHY THOSE TWO DID NOT MOVE IT, MEASURED [#550 round 2, CLAUDE.md #416 rule: the MEASURED value before and after]: SQ's inputs printed from an
// instrumented trial at 375x679, ply 0. Tip (c218f97093d9): widthCap 375, heightCap 375, fit-loop trim 32, cap 343, board 343. REV_CHROME 320
// (3ea938a1f043): heightCap 375 -> 359, trim 32 -> 16, cap 343, board 343 - the cap moved and stayed ABOVE the board, and the fit loop took 16
// less off. boardPx-8 in analyze (ff5b6e3bc0b9): trim 32 -> 24, cap 351, boardPx 351-8 = 343, board 343 - the loop saw 8px of room and gave
// it back. Both controls disturbed a real input and left the measured number where it was, because at this geometry the board is set by the
// room the rows under it leave, and the loop reconciles every non-binding change to the pixel. The pin was never unable to fail; the controls
// did not cross its line. The two that do, and the rows now printed beside the pin so a red names what took the room:
// CONTROL-RECORD: 15d0723 2026-11-13 total=9 red=1 scope=trial:6d68f3ae4ef2 how=REV_CHROME 304 -> 344, so heightCap 335 binds below 343: 'move screen, board 343, no scroll' red at board 335 (rev-compact 106 -> 114 takes the slack), every other line green; tip trial:489840ab49bb 9/0 at 343
// CONTROL-RECORD: 15d0723 2026-11-13 total=9 red=1 scope=trial:ae1f4d7f12c3 how=the streamlined rev-compact floor 93 -> 109 (a row under the board takes 16px more): 'move screen, board 343, no scroll' red at board 327, rows printed {rev-compact 122, min 109px}, every other line green
'use strict';
const L=require('../lib');const R=require('../drive/review');
const WANT_W=343;   // measured on 77ffccc15668 by this route: the streamlined phone review is height-bound at 343 here with or without the card's caption strip (the card route read 343 too)
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'uat-review',store:{ct_pool:'3'}});await b.open();
  let ok=true;try{await R.states['summary'](b);}catch(e){ok=false;L.note('summary drive: '+String(e).slice(0,140));}
  const sum=await b.rect('[data-ct="rev-summary"]');const foot=await b.rect('[data-ct="rev-summary-foot"]');
  L.say(ok&&!!sum&&!!foot&&foot.y+foot.h<=b.geo.h+0.5,'the summary is up with its footer pinned',foot&&Math.round(foot.y+foot.h));
  await b.shot('uat-review-summary');
  await R.states['moves-ply0'](b);const m4=await b.metrics();
  const ply0=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="rev-move-line"]');return t?(t.innerText||'').replace(/\s+/g,' ').trim():null;});
  // WHAT SETS THE 343, measured rather than read [#550 round 2]: at 375x679 the board is placed by the FIT LOOP, not by a cap - SQ's
  // caps are 375 wide and 375 tall (heightCap = vh-REV_CHROME) and the loop trims 32 so the rows under the board fit. So the pin moves
  // only when the room those rows leave moves, or when a cap binds below 343; a cap change that stays above 343 is reconciled by the loop
  // to the pixel. The rows are printed beside the pin so a red says which one took the room.
  const rows=await b.page.evaluate(()=>{const o={};for(const k of ['pbar-top','pbar-bottom','strip-row','rev-compact','rev-row1']){const e=[...document.querySelectorAll('[data-ct="'+k+'"]')].pop();if(!e){o[k]=null;continue;}const r=e.getBoundingClientRect();o[k]={h:Math.round(r.height*10)/10,min:getComputedStyle(e).minHeight};}return o;});
  L.say(!!m4.board&&Math.abs(m4.board.w-WANT_W)<0.6&&m4.over.over<=0,'move screen, board '+WANT_W+', no scroll',{board:m4.board,over:m4.over.over,line:ply0,rows});
  await R.goPly(b,19);const ml6=await b.rect('[data-ct="rev-move-line"]');await b.settle(1500);const why={text:(await b.text('[data-ct="rev-why"]'))||''};
  L.say(!!ml6&&/Nxb5/.test(ml6.text),'US-R06 at 10.Nxb5',ml6&&ml6.text);
  L.say(!!why&&/cxb5|Bxb5/.test(why.text),'the reason names the forcing line',why&&why.text.slice(0,80));
  await b.shot('uat-review-brilliant');
  await R.goPly(b,R.OPERA_PLIES);await b.settle(800);const num=await b.rect('[data-ct="eval-bar-num"]');
  L.say(!!num&&/1-0/.test(num.text),'k12 at 17.Rd8# with the label 1-0',{num:num&&num.text});
  await b.shot('uat-review-mate');
  await R.goPly(b,19);await b.tapCt('rev-fab',900);const tx=await b.texts();
  L.say(tx.some(t=>/Undo/.test(t))&&tx.some(t=>/Exit analysis/.test(t)),'US-R07 analysis board with Undo and Exit',{btns:tx.filter(t=>/Undo|Exit/.test(t))});
  await b.shot('uat-review-analysis');
  // GUARDED, per the #393 rule: a missing Exit goes red on its own line below rather than throwing and hiding the rest.
  let exited=true;try{await b.tapText(/Exit analysis$/);await b.settle(600);await R.closeSheet(b).catch(()=>{});await b.tapCt('rev-back',600);}catch(e){exited=false;L.note('exit/back: '+String(e).slice(0,100));}
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:5000}).catch(()=>{});const sum9=await b.rect('[data-ct="rev-summary"]');
  L.say(exited&&!!sum9,'US-R09 back on the summary',{exited,summary:!!sum9});
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));L.say(bad.length===0,'zero app errors beyond the allowed engine trap',bad.slice(0,2));
  await b.close();
},'UAT-REVIEW-CARD');
