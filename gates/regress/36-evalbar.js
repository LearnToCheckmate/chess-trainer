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
//   6. the whole bar is on the screen, and so is the whole board  (added #407)
//   7. barW + boardW is the same number in Play and in Review - the bar's width and the width the board gives
//      up for it are ONE quantity, and nothing used to compare them  (added #407)
// Run at his real 375x730, AND at 375x568 since #407 - see the geometry note in the control block below.
//
// ── NEGATIVE CONTROLS, #407. THIS GATE HAD NONE FOR TWENTY-EIGHT BUILDS. ─────────────────────────────────────
// Filed by the external UAT challenger (flag uat-ext-2026-09-16): 14 assertions, green on every build since
// #379, never once run against a bundle built to fail them, and checked in all three places control evidence
// lives - a grep for 'negative control' on this file returned 0, the only 'evalbar' in RUN-LOG.md is the
// fb-evalbar FEEDBACK item, and none of gates-without-a-negative-control's eight updates named it. It also ran
// at ONE geometry. So the gate guarding the eval bar - the component whose own contrast defect is still an open
// decision with Kunal - had never been shown able to fail.
//
// Each control is ONE verified line, built with CT_OUT so the repo's app.js is never touched, with chess.jsx
// restored and md5-verified afterwards. Baseline first: 30 pass, 0 fail.
//
//   NC-A  the track colour: '#8f8d9e' -> '#2b2932', the old value that painted at 1.12:1. (trial md5 2e0a1cda8831)
//         -> 26 pass, 5 FAIL, and exactly the five colour assertions: 'no longer the old #2b2932' and 'is
//            #8f8d9e' at BOTH geometries, and 'the Review bar DOES get the lighter track'. Width, outline,
//            board and on-screen assertions all stayed green, so the colour assertions fire on the colour and
//            on nothing else.
//
//   NC-B  evalW: 18 -> 14 for Play, putting the bar back to the 10px Kunal complained about. (md5 ec04989bdc44)
//         -> 26 pass, 5 FAIL: the four width assertions (10 at both geometries, at move 0 and at four plies)
//            AND the sum invariant, 363 against Review's 367. Colour and outline green. The row ledger shows
//            where the 4px went: left slack 3.98 and right slack 4.0 against the shipped 1.98/2.0, with the
//            board still 353 - a NARROWER bar does not give the board its width back, it wastes it.
//
//   NC-C  the same line widened instead: 18 -> 30, a 26px bar. (md5 76de0ceab915)
//         -> 24 pass, 7 FAIL. Measured at 375x730: THE BAR'S LEFT EDGE IS AT -4.02, painted off the screen, the
//            board's right edge at 379 on a 375 screen, and the board still 353 wide. Before #407 this gate
//            caught that only INCIDENTALLY, through 'the Play eval bar is 14px wide' - a pin on the literal
//            value - which is not good enough, because widening this bar is a LIVE PRODUCT QUESTION: Kunal's
//            fb-evalbar decision already widened it once from 10 to 14, and the next person to act on it would
//            update that pin to the new number and get a green gate with the bar hanging off the screen.
//         -> AND IT ONLY GOES OFF SCREEN AT THE TALL GEOMETRY. At 375x568 the board is fit to HEIGHT, so it is
//            280 wide with 32.5px of slack each side, and a 26px bar sits comfortably on the screen. The
//            geometry that finds this defect is the one where the board is fit to WIDTH. That is #406's
//            two-axis finding again, pointing the other way: a wider-and-shorter screen is not a strictly
//            harsher test, so neither column can be dropped.
//
//   NC-D  and NC-E control the assertions on the structure #407 actually ships, where the two literals are one
//         constant (below). They are worth reading together, because they FAIL DIFFERENTLY and that is the
//         finding: the sum invariant and the per-state board pins cover different halves of this, and neither
//         alone covers it.
//   NC-D  the board's reserve reads EVAL_BAR_W(inReview)-4, double-counting the 4px gutter. (md5 d64c5a8b7cbc)
//         -> 29 pass, 2 FAIL, AND THE SUM INVARIANT IS NOT ONE OF THEM. The edit is at the site BOTH states
//            read, so both sums move together - 371 in Play and 371 in Review - and an assertion that compares
//            them is blind to it BY CONSTRUCTION. What caught it is the pair of literal board pins: 357 where
//            353 is pinned, 353 where 349 is. So the pins are not redundant now that a relationship is
//            asserted; they are the half that catches a SYMMETRIC error, and the sum is the half that catches
//            an asymmetric one. Note also what stayed green: with 4px more board the row is 375.0 wide in a
//            375 viewport, so the bar's left edge is at exactly 0 and both on-screen assertions pass honestly.
//   NC-E  the other direction on the shipped structure: the bar's own site reads the constant back into a
//         literal, (inReview?22:30), which is the version of this mistake that survives the refactor - someone
//         in a hurry hardcoding one site. (md5 a46e495e45d4)
//         -> 24 pass, 7 FAIL, identical to NC-C: bar left edge -4.02, board right edge 379 on a 375 screen,
//            sum 379 against 367. This is the control the sum invariant needed on the code #407 ships.
//
// ── WHAT NC-C FOUND, AND WHAT #407 DID ABOUT IT ──────────────────────────────────────────────────────────────
// THE BAR'S WIDTH AND THE BOARD'S RESERVE WERE THE SAME QUANTITY WRITTEN TWICE, AND NOTHING COMPARED THEM.
//   the bar   const evalW=(_evalOn&&!evalUnder)?(inReview?22:18):0;       <- the bar paints evalW-4 wide
//   the board const reserved=(_evOn?4:0)+(_evOn?(inReview?22:18):0)+...   <- what the board gives up for it
// Change one and the other did not follow. Narrower (NC-B): the board stays 353 and 4px of screen width is
// simply wasted. Wider (NC-C): the row no longer fits and the centring pushes the BAR off the left edge.
// #407 makes them one constant, `EVAL_BAR_W` in chess.jsx, read by both sites - so the shipped numbers are
// unchanged (bar 14 with a 353 board in Play, 18 with 349 in Review) and the desync is no longer expressible
// in one edit. The assertions below stay, because a constant can be read back into a literal by the next
// person in a hurry, and NC-E is the proof they still bite when it is.
//
//   THE THREE ADDED, and each one is crossed by a control rather than argued for:
//     a. the WHOLE BAR is on the screen (left >= 0, right <= viewport). NC-C crosses it at left -4.02.
//     b. the WHOLE BOARD is on the screen. NC-C crosses it: the board's right edge lands at 379 on a
//        375 screen.
//     c. barW + boardW IS THE SAME NUMBER IN PLAY AND IN REVIEW. This is the two-writings invariant stated
//        as something measurable, and it needs no invented threshold. The algebra: bar = evalW-4 and
//        board = vw - reserved, and both expressions carry the SAME EVAL_BAR_W(inReview), so
//        bar + board = vw - 4 - edge in BOTH states - 14+353 in Play, 18+349 in Review, 367 either way.
//        Move one state's reading of it and the sum moves in that state only, which is exactly what NC-B
//        (363 against 367), NC-C and NC-E (379 against 367) do - while NC-D shows the limit of it: an error
//        at the one site both states read moves both sums equally and only the board pins catch it. Widen the
//        bar LEGITIMATELY - through the
//        constant, as fb-evalbar would - and the board shrinks by the same amount and the sum is unchanged,
//        so this assertion does not stand in the way of the decision it guards.
//     Deliberately NOT asserted, because no control could cross them and an assertion never shown able to
//     fail is what put this gate on gates-without-a-negative-control in the first place: the bar/board gap
//     (4.0 on every bundle including all five controls) and the left/right slack SYMMETRY (the row is centred,
//     so it is symmetric even when the row is 8px too wide for the screen - NC-C reads -4.02 on both sides).
//     Both are printed as a row ledger instead, so the numbers are in the log for whoever needs them.
//
// ── ONE DEAD SELECTOR REMOVED, #407 ──────────────────────────────────────────────────────────────────────────
// This gate carried `const rb=await b2.rect('[data-ct="rev-board"]')||null;` and never read rb. There IS no
// `data-ct="rev-board"` in chess.jsx - the Review board, like every board, is found by lib.js's widest
// `repeat(8,...)` grid - so that call could only ever return null. It asserted nothing, so it misled nobody,
// but it is #394's trap lying dormant: a selector that cannot match, one line away from an assertion someone
// would build on it. Deleted rather than left for the next reader to trust.
//
// ── GEOMETRY, #407 ───────────────────────────────────────────────────────────────────────────────────────────
// The other half of the same flag: this gate ran at ONE size. #406's finding is that a geometry list has two
// axes, so the Play half now also runs at `short375` (375x568), the wide-and-short corner. The Review half
// stays at 375x730 only: its analyze flow costs about a minute and the sum invariant above needs one state
// pair, not four. The board is fit to HEIGHT at 375x568, so its width is NOT the 353 of the taller phone and
// is pinned separately per geometry in BOARD_W below - a single pin across both would have been the #406
// mistake again.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

// The board is fit to WIDTH at 375x730 and to HEIGHT at 375x568, so it has one measured width per geometry.
const BOARD_W={kunal730:353,short375:280};

const barStyle=(b)=>b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="eval-bar-v"]');
  if(!e)return null;
  const s=getComputedStyle(e),r=e.getBoundingClientRect(),n=(v)=>Math.round(v*100)/100;
  return {w:n(r.width),l:n(r.left),r:n(r.right),bg:s.backgroundColor,border:s.borderTopWidth+' '+s.borderTopColor,radius:s.borderTopLeftRadius};
});
const rgb=(s)=>{const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s||'');return m?[+m[1],+m[2],+m[3]]:null;};
const n2=(v)=>Math.round(v*100)/100;

// The Play half. Returns the one pair the cross-state invariant needs, or null if the bar never appeared.
async function playAt(geo){
  const vw=L.GEOS[geo].w, tag=geo;
  const b=await L.launch({geo,name:'evalbar-'+geo,store:{ct_pool:'3'}});await b.open();

  // --- Play vs Computer, move 0
  await P.states['cpu-m0'](b);await b.settle(500);
  const at0=await b.metrics();const s0=await barStyle(b);
  L.say(!!s0,tag+': the eval bar is on the Play screen vs Computer',s0);
  L.say(!!s0&&Math.abs(s0.w-14)<0.6,tag+': the Play eval bar is 14px wide (it was 10 - "widen to 14px")',s0&&s0.w);

  const c=s0&&rgb(s0.bg);
  L.say(!!c,tag+': the track colour is readable from the computed style',s0&&s0.bg);
  L.say(!!c&&!(c[0]===43&&c[1]===41&&c[2]===50),tag+': the track is no longer the old #2b2932, which painted at 1.12:1 against the page and is the whole reason for this change',s0&&s0.bg);
  L.say(!!c&&c[0]===143&&c[1]===141&&c[2]===158,tag+': the track is #8f8d9e, the value chosen by SAMPLING six candidates on a running build (it paints rgb(112,110,124) for 3.62:1). The plan\'s #6b6978 computed over 3:1 and measured 2.36:1, so this number must be re-sampled and never re-computed.',s0&&s0.bg);

  const bwid=s0&&parseFloat(s0.border);
  L.say(!!bwid&&bwid>=1,tag+': the bar carries a hairline outline, which is what shows where it ENDS independently of the track colour',s0&&s0.border);

  // --- #407: the relationships NC-C proved were missing. The bar's width (evalW) and the width the board gives
  // up for it (reserved) are one quantity - two separate literals until #407 made them one EVAL_BAR_W; widen
  // only the bar and the centred row no longer fits, so the BAR is pushed off the left edge while every literal
  // pin in this gate except the width one stays green.
  L.say(!!s0&&s0.l>=-0.5&&s0.r<=vw+0.5,
        tag+': THE WHOLE BAR IS ON THE SCREEN - left edge not off the left of the viewport and right edge not past it. NC-C and NC-E (a 26px bar, from widening the bar without widening the board\'s reserve) put this at -4.02 at 375x730 and are the reason the assertion exists. At 375x568 the board is fit to height and the same bar still fits, so this fires at the TALL geometry only.',
        s0&&{left:s0.l,right:s0.r,vw});
  const bd0=at0.board;
  L.say(!!bd0&&bd0.left>=-0.5&&n2(bd0.left+bd0.w)<=vw+0.5,
        tag+': the whole board is on the screen too - the same row, measured from the other end',
        bd0&&{left:bd0.left,right:n2(bd0.left+bd0.w),vw});
  if(s0&&bd0){
    L.note(tag+' row ledger: leftSlack '+s0.l+' | bar '+s0.w+' | gap '+n2(bd0.left-s0.r)+' | board '+bd0.w+' | rightSlack '+n2(vw-(bd0.left+bd0.w))+' | viewport '+vw);
  }

  // --- after four plies: the board must not have moved. The 4px is a one-time cost, not a jump.
  await b.move('e2','e4',0);await P.waitPlies(b,2);await b.move('g1','f3',0);await P.waitPlies(b,4);await b.settle(700);
  const at4=await b.metrics();const s4=await barStyle(b);
  L.say(!!at0.board&&!!at4.board&&Math.abs(at0.board.w-at4.board.w)<0.6&&Math.abs(at0.board.top-at4.board.top)<0.6,
        tag+': the board does not move between move 0 and four plies (w '+(at0.board&&at0.board.w)+' -> '+(at4.board&&at4.board.w)+', top '+(at0.board&&at0.board.top)+' -> '+(at4.board&&at4.board.top)+')');
  const pin=BOARD_W[geo];
  if(pin===null||pin===undefined){
    L.note(tag+': board width measured at '+(at4.board&&at4.board.w)+' - NOT YET PINNED in BOARD_W, so nothing is asserted about it here.');
  }else{
    L.say(!!at4.board&&Math.abs(at4.board.w-pin)<0.6,
          tag+': the vs-Computer board is '+pin+' here'+(geo==='kunal730'?', 4px narrower than the 357 of #378 - the cost he accepted knowingly':' (fit to height at this size, which is why it is pinned per geometry)'),
          at4.board&&at4.board.w);
  }
  L.say(!!s4&&Math.abs(s4.w-14)<0.6,tag+': the bar is still 14 wide after four plies',s4&&s4.w);
  L.say(at4.over.over<=0&&at4.over.docScroll===0,tag+': nothing scrolls',at4.over);
  await b.shot('evalbar-play-4ply-'+geo);
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,tag+': no app error beyond the allowed engine trap',bad.slice(0,2));
  await b.close();
  return (s4&&at4.board)?{geo,vw,barW:s4.w,boardW:at4.board.w,sum:n2(s4.w+at4.board.w)}:null;
}

L.run(async()=>{
  const play730=await playAt('kunal730');
  const playShort=await playAt('short375');

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
  const m=await b2.metrics();
  L.say(!!m.board&&Math.abs(m.board.w-349)<0.6,'the review board is still 349 - Review\'s gutter did not change, so its pinned width must not either',m.board&&m.board.w);
  L.say(!!sr&&sr.l>=-0.5&&sr.r<=375.5,'the whole REVIEW bar is on the screen as well',sr&&{left:sr.l,right:sr.r});
  await b2.close();

  // --- #407: THE TWO READINGS MUST AGREE. bar = evalW-4 and board = vw-reserved both carry the same
  // EVAL_BAR_W(inReview), so barW+boardW is vw-4-edge in BOTH states and the two states measure it
  // independently: moving one state's reading of it moves the sum in that state alone. Compared at 375x730,
  // where the board is fit to width in both states (both widths are pinned above, so a symmetric change - the
  // one this cannot see, NC-D - is caught there instead).
  const revSum=(sr&&m.board)?n2(sr.w+m.board.w):null;
  const ok=!!(play730&&revSum!==null&&Math.abs(play730.sum-revSum)<0.6);
  L.say(ok,'BAR WIDTH + BOARD WIDTH IS THE SAME NUMBER IN PLAY AND IN REVIEW - the bar\'s width (evalW) and the width the board gives up for it (reserved) are ONE quantity, read from EVAL_BAR_W since #407, and this is the only assertion that compares them. It catches an ASYMMETRIC error: NC-B reads 363 against 367, NC-C and NC-E 379 against 367. A symmetric one (NC-D, 371 in both states) is invisible here and is caught by the board pins instead, and a legitimate widening through the constant moves both and leaves the sum alone.',
        {playBar:play730&&play730.barW,playBoard:play730&&play730.boardW,playSum:play730&&play730.sum,reviewBar:sr&&sr.w,reviewBoard:m.board&&m.board.w,reviewSum:revSum});
  if(playShort)L.note('375x568 for reference (board fit to height there, so the sum is a different number and is not compared): bar '+playShort.barW+' + board '+playShort.boardW+' = '+playShort.sum);
},'EVALBAR');
