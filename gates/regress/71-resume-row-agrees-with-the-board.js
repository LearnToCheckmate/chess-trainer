// gates/regress/71-resume-row-agrees-with-the-board.js
// #474, for jobs/playhist-goes-stale-when-another-mode-replaces-the-board-so-resume-offers-a-phantom-game-2026-10-03.
// Story US-R16 (clause 6, added at #474), case TC-R46.
//
// WHAT IS UNDER TEST. #469 added the Play setup sheet's "Resume your game in progress (N moves played)" row and
// rendered it on `playHist.length>0`. `playHist` is a SEPARATE piece of state from the board: selectOpening
// (chess.jsx:3627) calls setGame(...) directly and never touches playHist, so after a lesson replaces the board
// the row is computed from one quantity and the board from another, and THE TWO DISAGREE ON SCREEN NINE PIXELS
// APART. Measured on the real shipped #473 bundle (96c21b94df25) at 375x730, driven, with an arrival assertion
// at both ends: a live Pass & Play at 3 plies, then Home -> Discover -> Openings -> Italian Game -> the lesson's
// ✕ -> the Play tile gives [data-ct="setup-resume"] reading "▶ Resume your game in progress (2 moves played)"
// while [data-ct="play-moverow"] ALREADY READS EMPTY. The app promised a game that was already gone, which is
// worse than the pre-#469 sheet that promised nothing.
//
// WHY THE ASSERTIONS ARE SHAPED THIS WAY - each one is a trap this project has already paid for:
//
//  1. BOTH HALVES, OR A PERMANENTLY DEAD ROW PASSES. #469's D2 lesson and #471's rule 1: an assertion that the
//     row is ABSENT after a mode switch is satisfied by a row that never renders at all, which would be a
//     regression destroying the affordance #469 was built for. So block A asserts the row is PRESENT over a
//     genuine live game and that tapping it gives the game back WITH ITS MOVES, and block B asserts it is gone
//     once the board is no longer that game. Neither block is evidence on its own.
//
//  2. THE ARRIVAL ASSERTIONS ARE THE POINT, AND THIS GATE'S OWN FIRST DRAFT NEEDED THEM. My first probe printed
//     "no disagreement" on all three doors. It was a FALSE NEGATIVE: the navigation back to the sheet had
//     failed, so play-moverow read null because the screen was never reached, not because the row was honest.
//     That is CLAUDE.md's #385 rule - when an assertion says "X is absent in state S", assert first that X was
//     present just before AND that S was actually reached. A2a asserts the sheet is up before anything is read
//     about it, and B2a asserts it again after the mode switch.
//
//  3. A RELOAD WOULD MAKE EVERY READING VACUOUS, AND ONE DRIVER DOES RELOAD. A page reload destroys React state,
//     playHist included, so the row would be absent for the wrong reason and this gate would go green over the
//     shipped defect. `window.__ctLive` is set after the live game is built and re-read after the mode switch;
//     B2z asserts it survived. Measured: gates/drive/puzzles' `train` state DOES reload (the sentinel caught it),
//     which is why the lesson door is the one driven here and the puzzle door is named as not covered below.
//
//  4. A COUNT IS CROSS-CHECKED AGAINST THE OTHER READOUT OF THE SAME QUANTITY, not asserted against a regex.
//     #469 shipped this row printing `playHist.length` and calling it "moves" - "3 moves played" over a move row
//     showing two - and its gate was green because the string satisfies any regex for a move count perfectly
//     (#385's shape-is-not-a-value). A3 parses the highest move NUMBER out of play-moverow and requires the
//     row's own figure to equal it. This is a legitimate cross-check and not a circular one: after this build the
//     two are derived from the same board, so a disagreement means the derivation broke, which is the thing worth
//     catching.
//
//  5. THE ARM IS THE SAME LIE IN THE SAME SHEET. setup-start armed off raw `playHist.length` too, so after a
//     lesson it demanded "Tap again to discard your game and start" about a game that no longer existed - a
//     sentence that is simply false, which is the shape #471's veto was about. B4 requires one tap to apply when
//     there is nothing to lose; A4 is its other half, requiring the arm to still fire when there is.
//
// NEGATIVE CONTROL. The real shipped #473 bundle, which is the actual broken build and costs nothing to keep:
//   CT_APP=gates/.trial/app-473-shipped.js node gates/regress/71-resume-row-agrees-with-the-board.js
// Measured there: B1 and B1b RED (row present at "(2 moves played)" over an empty move row) and B4 RED (the
// start button arms over the gone game). Block A is GREEN on both bundles and must be - the affordance works on
// #473 for a game that really is live; it is block B that separates them.
//
// NOT COVERED, STATED RATHER THAN IMPLIED. The PUZZLE and REVIEW doors, which also call setGame and are the
// job's own open notChecked items: driving the Puzzles tile reached the roadmap WITHOUT replacing the board (the
// move row still read "1.f3 1…e5 2.g4", so the probe never exercised the class) and the puzzles driver reloads.
// Those two doors are therefore NOT EXERCISED here, not clean. The fix is keyed on the board rather than on any
// one door, so it covers them by construction - and a construction argument is not a measurement, which is why
// it is written here as the gap it is.
'use strict';
const L=require('../lib'), P=require('../drive/play'), LE=require('../drive/lesson');

const GEOS=[{k:'kunal730',w:375,h:730},{k:'se',w:320,h:568}];
const onSheet=(b)=>b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-start"]'));
const alive=(b)=>b.page.evaluate(()=>window.__ctLive===1);
// the highest MOVE number the move row prints: "1.f3 1…e5 2.g4" -> 2
const rowMoves=(s)=>{const m=String(s||'').match(/(\d+)\s*[.…]/g);if(!m)return 0;return Math.max(...m.map(x=>parseInt(x,10)));};
const stated=(s)=>{const m=String(s||'').match(/\((\d+)\s+moves?\s+played\)/);return m?parseInt(m[1],10):null;};

async function liveGame(b){
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.page.evaluate(()=>{window.__ctLive=1;});
}
async function openSheet(b){ await b.tapCt('play-home').catch(()=>{}); await b.settle(400); await b.tile('Play'); await b.settle(800); }

/* ▶ Start game SITS BELOW THE FOLD at 320x568 - gates/drive/play.js carries tapStart() for exactly that
   reason, and #386/#390 is the rule that says to go and look before writing a new tap. My first draft tapped
   it with a bare tapCt and the click landed on nothing: A4 went red at `se` on BOTH bundles (an instrument
   fault reported as a defect), and WORSE, B4 went green on the CONTROL there - a vacuous pass, because no tap
   means no arm means "does not demand a second tap" is satisfied by a button that was never pressed.
   tapStart() is not the fix either: it taps TWICE by design, which is the opposite of what A4 and B4 measure.
   So: scroll the sheet's own scroller, ASSERT the button is on screen, then tap exactly once. */
async function tapStartOnce(b,geoH){
  await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-start"]');if(e)e.scrollIntoView({block:'center'});});
  await b.settle(250);
  const r=await b.rect('[data-ct="setup-start"]');
  const onScreen=!!r&&r.y>=-0.5&&(r.y+r.h)<=geoH+0.5;
  const before=r?String(r.text||''):null;
  if(onScreen)await b.tapCt('setup-start',800).catch(()=>{});
  const after=await b.text('[data-ct="setup-start"]');
  return {onScreen,rect:r,before,after};
}

L.run(async()=>{
for(const g of GEOS){
  const G=g.k;

  /* ── BLOCK A: THE AFFORDANCE STILL WORKS. The other half of block B, and without it B is satisfied by a row
     that never renders - which would silently undo the whole point of #469. ── */
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b71-live-'+G}); await b.open();
    await liveGame(b);
    const row=await b.text('[data-ct="play-moverow"]');
    const plies=await P.plies(b);
    L.say(plies===3&&rowMoves(row)===2,G+' A1 ARRIVAL: a live Pass & Play game of 3 plies is on the board',{plies,row});
    await openSheet(b);
    const sheet=await onSheet(b), resume=await b.text('[data-ct="setup-resume"]');
    L.say(sheet,G+' A2a ARRIVAL: the Play setup sheet is up, so what follows is read about the right screen',{sheet});
    L.say(sheet&&resume!==null,G+' A2 the resume row IS offered over a game that really is live',{resume});
    L.say(stated(resume)===rowMoves(row),G+' A3 CROSS-CHECK: the count the row states equals the highest move number the move row prints (not merely regex-shaped)',{stated:stated(resume),moveRow:rowMoves(row),resume});
    const s0=await b.text('[data-ct="setup-start"]');
    const t=await tapStartOnce(b,g.h);
    L.say(t.onScreen,G+' A4a ARRIVAL: the Start button was scrolled on screen before being tapped, so A4 measures the app and not a click that missed',{rect:t.rect});
    L.say(t.onScreen&&/Start game/.test(String(s0))&&/Tap again/.test(String(t.after)),G+' A4 one tap on Start ARMS rather than destroying a game that is genuinely live',{before:s0,after:t.after,onScreen:t.onScreen});
    // and resume gives the game back WITH its moves
    await b.tapCt('setup-resume',800).catch(()=>{});
    const back=await b.text('[data-ct="play-moverow"]');
    L.say(rowMoves(back)===2,G+' A5 tapping resume returns the game WITH its moves, not a fresh board',{back});
    L.say(b.errs.length===0,G+' A9z zero app console errors',b.errs.slice(0,3));
    await b.close();
  }

  /* ── BLOCK B: THE DEFECT. A lesson replaces the board; the row must not go on offering the game. ── */
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b71-stale-'+G}); await b.open();
    await liveGame(b);
    // prove the row is up FIRST, so its later absence is a change and not a constant
    await openSheet(b);
    const pre=await b.text('[data-ct="setup-resume"]');
    L.say(await onSheet(b)&&pre!==null,G+' B0 ARRIVAL: the resume row is present BEFORE the mode switch, so block B measures a change',{pre});
    await b.tapCt('setup-resume',800).catch(()=>{});

    let entered=true; try{ await LE.states['intro'](b); }catch(e){ entered=false; }
    L.say(entered,G+' B1a ARRIVAL: the lesson opened, so selectOpening ran and the board was replaced');
    await b.tapText(/^✕$/).catch(()=>{}); await b.settle(600);
    await b.tile('Play').catch(()=>{}); await b.settle(800);

    const sheet=await onSheet(b), live=await alive(b);
    L.say(live,G+' B2z NOT VACUOUS: the page did not reload, so playHist was not cleared by a remount',{live});
    L.say(sheet,G+' B2a ARRIVAL: the Play setup sheet was reached after the lesson',{sheet});
    if(sheet&&live&&entered){
      const resume=await b.text('[data-ct="setup-resume"]');
      const row=await b.text('[data-ct="play-moverow"]');
      L.say(row===''||row===null||rowMoves(row)===0,G+' B1b the board is genuinely no longer that game: the move row is empty',{row});
      L.say(resume===null,G+' B1 THE DEFECT: no resume row is offered once the board is no longer that game',{resume,row});
      const s0=await b.text('[data-ct="setup-start"]');
      const t=await tapStartOnce(b,g.h);
      L.say(t.onScreen,G+' B4a ARRIVAL: the Start button was on screen when tapped - without this B4 passes on the BROKEN bundle at 320x568, because a tap that misses produces no arm either',{rect:t.rect});
      L.say(t.onScreen&&!/Tap again/.test(String(s0))&&!/Tap again/.test(String(t.after)),G+' B4 Start does not demand a second tap to "discard your game" when the game is already gone',{before:s0,after:t.after,onScreen:t.onScreen});
    }else{
      L.say(false,G+' B1 NOT RUN: preconditions failed',{sheet,live,entered});
      L.say(false,G+' B1b NOT RUN',{sheet,live,entered});
      L.say(false,G+' B4a NOT RUN',{sheet,live,entered});
      L.say(false,G+' B4 NOT RUN',{sheet,live,entered});
    }
    L.say(b.errs.length===0,G+' B9z zero app console errors',b.errs.slice(0,3));
    await b.close();
  }
}
},'71-resume-row-agrees-with-the-board');
