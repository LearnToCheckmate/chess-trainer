// regress/36-evalbar.js  fb-evalbar (Kunal, choice "B: A, plus widen to 14px"). THE ONLY GUARD ON THIS CHANGE.
//
// His words: "maybe we need some background coloring because it's pretty clean now. But since the background is
// just black, the one thing I'm noticing is that it's hard to see where the bar... the points bar... ends."
// Measured behind that: the bar's dark TRACK painted rgb(32,30,37) against a page of rgb(22,22,24) for a contrast
// ratio of 1.12:1, where 3:1 is the accepted floor for a UI element. You could see where WHITE ended and could
// not see the bar at all. It was also 10px wide.
//
// #379 ships his option B: a lighter track, a hairline outline, and the bar widened from 10 to 14. The 4px comes
// off the board and he accepted that knowingly ("The 4px of width beside the board is accepted knowingly").
//
// WHY THE COLOUR IN THE SOURCE IS NOT THE COLOUR ON THE SCREEN, and why this gate reads the source anyway. The
// plan for this change proposed #6b6978 and computed it at over 3:1. Sampled from a screenshot of the running
// build it paints rgb(84,82,94) for 2.36:1 - it FAILS the very floor that motivated the change. Six candidates
// were built and sampled before #8f8d9e was chosen, which paints rgb(112,110,124) for 3.62:1. A ratio computed
// from a hex literal is a reading, not a measurement, and this one was wrong by a whole category.
// A gate cannot sample painted pixels without a screenshot pipeline it does not have, so it pins the SOURCE
// values that were arrived at by measurement, and this comment carries the measurement that justifies them. If
// anyone changes the colour, they must re-sample rather than re-compute.
//
// WHAT IT PROVES
//   1. the Play bar is 14 wide (it was 10)
//   2. the Review bar is still 18 - the decision named the 10px Play bar and Review's was already 18
//   3. the track is no longer the old #2b2932, and it is the measured #8f8d9e
//   4. the bar carries a hairline outline
//   5. the board is 353 on his phone and DOES NOT MOVE between move 0 and after four plies - the 4px is a
//      one-time cost, not a jump
// Run at his real 375x730.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

const barStyle=(b)=>b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="eval-bar-v"]');
  if(!e)return null;
  const s=getComputedStyle(e),r=e.getBoundingClientRect();
  return {w:Math.round(r.width*100)/100,bg:s.backgroundColor,border:s.borderTopWidth+' '+s.borderTopColor,radius:s.borderTopLeftRadius};
});
const rgb=(s)=>{const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s||'');return m?[+m[1],+m[2],+m[3]]:null;};

L.run(async()=>{
  const b=await L.launch({geo:'kunal730',name:'evalbar',store:{ct_pool:'3'}});await b.open();

  // --- Play vs Computer, move 0
  await P.states['cpu-m0'](b);await b.settle(500);
  const at0=await b.metrics();const s0=await barStyle(b);
  L.say(!!s0,'the eval bar is on the Play screen vs Computer',s0);
  L.say(!!s0&&Math.abs(s0.w-14)<0.6,'the Play eval bar is 14px wide (it was 10 - "widen to 14px")',s0&&s0.w);

  const c=s0&&rgb(s0.bg);
  L.say(!!c,'the track colour is readable from the computed style',s0&&s0.bg);
  L.say(!!c&&!(c[0]===43&&c[1]===41&&c[2]===50),'the track is no longer the old #2b2932, which painted at 1.12:1 against the page and is the whole reason for this change',s0&&s0.bg);
  L.say(!!c&&c[0]===143&&c[1]===141&&c[2]===158,'the track is #8f8d9e, the value chosen by SAMPLING six candidates on a running build (it paints rgb(112,110,124) for 3.62:1). The plan\'s #6b6978 computed over 3:1 and measured 2.36:1, so this number must be re-sampled and never re-computed.',s0&&s0.bg);

  const bw=s0&&parseFloat(s0.border);
  L.say(!!bw&&bw>=1,'the bar carries a hairline outline, which is what shows where it ENDS independently of the track colour',s0&&s0.border);

  // --- after four plies: the board must not have moved. The 4px is a one-time cost, not a jump.
  await b.move('e2','e4',0);await P.waitPlies(b,2);await b.move('g1','f3',0);await P.waitPlies(b,4);await b.settle(700);
  const at4=await b.metrics();const s4=await barStyle(b);
  L.say(!!at0.board&&!!at4.board&&Math.abs(at0.board.w-at4.board.w)<0.6&&Math.abs(at0.board.top-at4.board.top)<0.6,
        'the board does not move between move 0 and four plies (w '+(at0.board&&at0.board.w)+' -> '+(at4.board&&at4.board.w)+', top '+(at0.board&&at0.board.top)+' -> '+(at4.board&&at4.board.top)+')');
  L.say(!!at4.board&&Math.abs(at4.board.w-353)<0.6,'the vs-Computer board is 353 on his phone, 4px narrower than the 357 of #378 - the cost he accepted knowingly',at4.board&&at4.board.w);
  L.say(!!s4&&Math.abs(s4.w-14)<0.6,'the bar is still 14 wide after four plies',s4&&s4.w);
  L.say(at4.over.over<=0&&at4.over.docScroll===0,'nothing scrolls',at4.over);
  await b.shot('evalbar-play-4ply');
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'no app error beyond the allowed engine trap',bad.slice(0,2));
  await b.close();

  // --- Review keeps its 18. The decision named the 10px PLAY bar; Review's bar was already 18 and is not part
  // of it. The restyle DOES reach Review, because both placements are the same element - said out loud here
  // rather than left for someone to discover.
  const b2=await L.launch({geo:'kunal730',name:'evalbar-review',store:{ct_pool:'3'}});await b2.open();
  await b2.tile('Review');
  await b2.page.locator('textarea').first().fill('[White "A"] [Black "B"] 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *');
  await b2.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b2.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b2.settle(400);
  await b2.tapText(/^Start review/,{wait:900}).catch(()=>{});
  await b2.settle(600);
  const sr=await barStyle(b2);
  L.say(!!sr&&Math.abs(sr.w-18)<0.6,'the REVIEW bar is still 18 wide - the decision named the 10px Play bar, and widening Review was never asked for',sr&&sr.w);
  const cr=sr&&rgb(sr.bg);
  L.say(!!cr&&cr[0]===143,'the Review bar DOES get the lighter track, because both placements are one element - a consequence of the change, recorded rather than hidden',sr&&sr.bg);
  const rb=await b2.rect('[data-ct="rev-board"]')||null;
  const m=await b2.metrics();
  L.say(!!m.board&&Math.abs(m.board.w-349)<0.6,'the review board is still 349 - Review\'s gutter did not change, so its pinned width must not either',m.board&&m.board.w);
  await b2.close();
},'EVALBAR');
