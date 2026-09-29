// gates/regress/62-landscape-board-stable.js
// US-PL-11 clause 7 / TC-PL-033. #436, from
// jobs/landscape-board-shrinks-8px-on-a-rotation-round-trip-2026-09-29 (found by #435's antagonist A).
//
// THE DEFECT. On the shipped #435 bundle the landscape board was 224.00 on a FRESH landscape launch at
// 730x375, 844x390 AND 667x375 - three screens whose available heights differ - and took its correct,
// different size (216, 232, 216) only after the player rotated to portrait and back. 224 was not a
// derivation at all: it was a boardTrim written by the board-fit loop (chess.jsx:2763) from an UNSETTLED
// first-paint frame, which then survived because nothing later could correct it. `over`, the only quantity
// that loop acts on, measures exactly 0 in every settled landscape state, so the loop can neither grow
// (needs over<-24) nor shrink (needs over>0) there.
//
// WHY NO EXISTING GATE COULD SEE IT, and this is the half worth keeping. Gate 16's blocks E and F were the
// repo's ONLY landscape coverage and they `L.launch` DIRECTLY at 730x375 - a state no phone can be in. A
// real device is opened in portrait and turned. So every landscape number this suite published described a
// viewport no user enters, and it described the one value that happened to be an artifact. This gate's whole
// method is the round trip.
//
// WHAT MAKES IT ABLE TO FAIL, run against BOTH bundles rather than asserted (#435's own lesson, its note (3)):
//   A1/A2/A3 fresh==rotated     -> #435: 224 vs 216 / 224 vs 232 / 224 vs 216 = 3 FAIL.  #436: 3 PASS.
//   A4       the board RESPONDS -> #435 fresh: {224,224,224}, one distinct value = FAIL. #436: {216,232,216}.
//   A5       portrait control   -> 353.03 on BOTH; it is here to prove the fix did not reach portrait, so a
//                                 green on both bundles is exactly what it is for.
// A4 is the assertion that does not depend on knowing the right number. It says only that three screens with
// three different available heights must not all produce one board, which cannot be satisfied by an artifact
// and is not pinned to 216 or 232, so it survives a later change to the chrome budget.
// A1-A3 deliberately assert EQUALITY BETWEEN TWO MEASUREMENTS OF THE SAME BUNDLE rather than against a
// literal, for the same reason: they cannot be made green by moving a constant.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const PORT={w:375,h:730,safe:''};
// vp.h - 24 - 130, floored to a multiple of 8, is SQ's own wide branch (chess.jsx:2752) with boardTrim 0.
// Recorded per row so a reader can see WHY the three expected sizes differ rather than taking them on trust.
const LAND=[{w:730,h:375,cap:216},{w:844,h:390,cap:232},{w:667,h:375,cap:216}];

async function boardW(b){const bd=await b.board();return bd?+bd.w.toFixed(2):null;}
async function boardRect(b){const bd=await b.board();return bd?{w:+bd.w.toFixed(2),y:+bd.y.toFixed(2)}:null;}
async function liveGame(b){await P.states['setup'](b);await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);await b.settle(500);}
async function rotate(b,to){await b.page.setViewportSize({width:to.w,height:to.h});await b.settle(1400);}

L.run(async()=>{
  const fresh={};
  for(const g of LAND){
    const tag='A@'+g.w+'x'+g.h;
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'land-stable-'+g.w,store:{ct_pool:'3'}});
    await b.open();
    const vp=await b.page.evaluate(()=>innerWidth+'x'+innerHeight);
    L.say(vp===g.w+'x'+g.h,tag+'0: the viewport really is landscape - a harness self-check, because every assertion below is about the branch `wide` selects and not about the app',{viewport:vp});
    await liveGame(b);
    const f=await boardRect(b);
    L.say(!!f&&f.w>0,tag+'1a: a board is painted on a fresh landscape launch - the precondition, so a green below cannot come from there being no board to measure (#385)',{board:f});
    await rotate(b,PORT);
    const p=await boardRect(b);
    L.say(!!p&&p.w>f.w,tag+'1b: and rotating to portrait really did change the board, so the round trip is a round trip and not a no-op - the control that makes the return leg mean something',{landscape:f&&f.w,portrait:p&&p.w});
    await rotate(b,g);
    const r1=await boardRect(b);
    L.say(!!f&&!!r1&&Math.abs(f.w-r1.w)<0.05&&Math.abs(f.y-r1.y)<0.05,
      tag+'1: THE BOARD IS THE SAME SIZE AND IN THE SAME PLACE however the player reached landscape - fresh launch against portrait-and-back, to the hundredth. On the shipped #435 bundle this read 224.00/75.50 fresh and 216.00/79.50 rotated at 730x375, 224.00 against 232.00 at 844x390, and 224.00 against 216.00 at 667x375: three FAILs, and the direction is not even consistent - the wider phone LOST 8px by not rotating while the narrower one GAINED 8px it was not owed',
      {fresh:f,rotated:r1});
    await rotate(b,PORT);await rotate(b,g);
    const r2=await boardRect(b);
    L.say(!!r2&&!!r1&&Math.abs(r1.w-r2.w)<0.05,tag+'2: and a SECOND round trip leaves it there - it settles rather than drifting, which is the difference between a stale value and one that walks',{trip1:r1&&r1.w,trip2:r2&&r2.w});
    L.say(!!r1&&Math.abs(r1.w-g.cap)<0.05,tag+'3: the settled board equals vp.h-24-130 floored to a multiple of 8 = '+g.cap+' - the analytic cap SQ computes for this screen with no trim. Pinned to the DERIVATION and stated per row, so a reader can see why the three rows expect three different numbers',{board:r1&&r1.w,cap:g.cap});
    L.say(b.errs.length===0,tag+'4: zero app errors across two rotation round trips',b.errs.slice(0,3));
    fresh[g.w]=f?f.w:null;
    await b.close();
  }
  // A4: the assertion that needs no knowledge of the right answer.
  const distinct=[...new Set(Object.values(fresh).filter(v=>v!==null))];
  L.say(distinct.length>=2,
    'A4 THE FRESH LANDSCAPE BOARD RESPONDS TO THE SCREEN IT IS ON. Three landscape geometries whose available heights are 221, 236 and 221 must not all produce ONE board width. On #435 this set was {224} - a single value across three different screens, which is what identified 224 as an artifact rather than an answer, because no derivation from the geometry can be constant when the geometry is not. This assertion is pinned to no number and survives any later change to the 130px chrome budget',
    {freshByWidth:fresh,distinct});
  // A5: the portrait control. Green on BOTH bundles by design - it exists to prove the change did not reach portrait.
  const b=await L.launch({geo:'kunal730',name:'land-stable-portrait',store:{ct_pool:'3'}});
  await b.open();await liveGame(b);
  const pw=await boardW(b);
  L.say(pw!==null&&Math.abs(pw-353.03)<0.05,
    'A5 PORTRAIT IS UNTOUCHED: the play board at 375x730 is still 353.03. This is GREEN ON BOTH BUNDLES on purpose - it is the control proving #436 confined itself to `wide`, and portrait play runs through the `_edge` path where the fit loop trim is real (#364 measured 56px of slack it reclaims there). If this ever reddens, the landscape fix has reached the screen Kunal actually uses',
    {board:pw});
  L.say(b.errs.length===0,'A6 zero app errors on the portrait control',b.errs.slice(0,3));
  await b.close();
},'62-landscape-board-stable');
