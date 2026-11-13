// regress/10-gameover.js  (port of gameover371.js)  k10 / A-02 / X-01: a finished game keeps the board.
// A Pass & Play game of Scholar's mate in seven plies (was gallery card 1, k10, until #550). The board's width and top mid-game must equal
// its width and top after the mate; nothing scrolls; the row reads Review · Rematch; zero app errors.
// CONTROL-RECORD: ccbe925 2026-10-30 total=17 red=4 scope=full how=gate mutant pads #root's top by 10px after open - the WANT_TOP pin is red at both geometries while the width pin and 'top unchanged' stay green; 'nothing scrolls' also reddens because the pad overflows [#546 item (72)]
// CONTROL-RECORD: 02c92a8 2026-11-05 total=17 red=2 scope=trial:9fd16ca819b5 how=#548 control for item (84): a zero-height in-flow box whose 1px relative child sits at 110vh, so #root's content runs past the viewport with nothing moved - 'nothing scrolls at game over' red at kunal and 390 (the conjunct-free assertion (84) left)
// CONTROL-RECORD: b2aa9ef 2026-11-13 total=17 red=3 scope=trial:5d648bc20064 how=#550 re-key of card k10 at 375x679 (367@102 -> 375@100): the Play board 8px narrower (boardPx=SQ*8-8 in play) - it reads exactly the old 367@102 at kunal and 382 at 390, and the kunal width and top pins and the 390 width pin go red; on the tip trial 77ffccc15668 17/0, where the gate before this re-key read 15/2 (measured 375@100 against 367@102)
// CONTROL-RECORD: 0d80350 2026-11-13 total=17 red=3 scope=trial:5d648bc20064 how=#550 job five-gates-enter-their-state-by-tapping-a-dev-gallery-card (gate 10 moved off card k10 onto Pass & Play Scholar's mate, drive/play.js pp-scholar-2ply + scholarFinish): the Play board 8px narrower - kunal width (367) and top (105.7 vs 103.7) and 390 width (382) red; with the k10, k8 and both k11 gallery cards DELETED (trial:e9020df7aebb) 17/0 on the new route; on 77ffccc15668 17/0 by both routes, PASS/FAIL lines identical except the kunal top, 100 on the dev card's 'demo' opponent and 103.7 in Pass & Play (BSA-P-36's folded top row), re-pinned
'use strict';
const L=require('../lib');
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'gameover-'+geo});await b.open();
    // THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#550; jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-
    // 2026-10-01]. This was b.card('k10',2600) - the gallery's scripted Scholar's mate against the dev-only 'demo' opponent, sampled
    // two plies in and again 10.5s later. It now plays the same game by hand: Home -> Play -> Pass & Play -> Start, 1.e4 e5 (the
    // mid-game sample), then 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7# (gates/drive/play.js pp-scholar-2ply and scholarFinish). The card's 'demo'
    // opponent is not a configuration a player can choose; Pass & Play is the one with the same chrome (no bot bar), and a game against
    // the computer is a third layout (353@109 at 375x679, 390@150 at 390x844 on 77ffccc15668) that gate 13 pins.
    const P=require('../drive/play');
    await P.states['pp-scholar-2ply'](b);
    const mid=await b.metrics();
    await P.scholarFinish(b);
    const end=await b.metrics();const row=await b.texts();
    await b.shot('gameover-'+geo+'-end');
    L.say(!!mid.board&&!!end.board,geo+': board present mid-game and after the mate',{mid:mid.board,end:end.board});
    if(mid.board&&end.board){
      L.say(Math.abs(mid.board.w-end.board.w)<0.6,geo+': board width unchanged at game over ('+mid.board.w+' -> '+end.board.w+')');
      L.say(Math.abs(mid.board.top-end.board.top)<0.6,geo+': board top unchanged at game over ('+mid.board.top+' -> '+end.board.top+')');
      // #381 re-gate: THE WIDTH IS NOW PINNED, not merely held equal to itself. Found by running this gate against
      // a bundle with the MOVES header row's minHeight:23 removed - the #378 regression, where folding the chips
      // out let that row shrink and the board grew. The board read 367 instead of 351 and THIS GATE PASSED, because
      // "unchanged between mid-game and game over" is true of a board that is the wrong size the whole way through.
      // A gate that compares a value only against itself cannot see a change that arrives before its first sample.
      // Numbers measured on #381: 351 at 375x679, 390 at 390x844. If a deliberate change moves them, move them
      // here with it - the one thing never to do is re-pin them to whatever the build now happens to produce.
      // #548 item (92) MOVED THEM, deliberately: the phone's top row (Home and the menu) took the strip under the board's place, and this
      // gate's own report on the #548 trial measured 367 at 375x679 (was 351) and 390 at 390x844. Missed in (92)'s checks; caught re-running
      // this gate as a control. Same numbers as gate 13's (92) re-pin.
      // #550 RE-KEYED, as gates 13 and 30 were at cfe4543: card k10 at 375x679 measured 375 wide at top 100 on the tip trial 77ffccc15668
      // (mid-game and at mate, both), against the 367 at 102 pinned here - the board is full width there now, like every other board on his
      // phone, 8px wider and 2px higher. Same numbers as gate 13's card k8 re-key.
      const WANT={kunal:375,'390':390};
      if(WANT[geo]!=null)L.say(Math.abs(end.board.w-WANT[geo])<0.6,geo+': the board at game over is '+WANT[geo]+' wide, the measured size for this geometry - not merely the same as it was a moment ago',{measured:end.board.w,want:WANT[geo]});
      // THE TOP IS PINNED TOO [#546, item (72); jobs/gate-10-compares-board-top-only-against-itself-while-pinning-width-2026-10-02].
      // #381's lesson was applied to the width in this file and not to the top beside it: 'top unchanged' compares two samples
      // that can both be wrong, so a board sitting at the wrong height for the whole card passed. MEASURED, not chosen: 78 at
      // 375x679 and 103 at 390x844 in every archived full-suite log from #520 to #545. Same rule as WANT: move it with a
      // deliberate change, never re-pin it to whatever a build produces.
      // #550 the player's route: Pass & Play at 375x679 folds 'vs Human' into the top row (BSA-P-36, gate 13's pp pin), so the board sits at
      // 103.7, not the dev card's 100 - measured on 77ffccc15668 mid-game and at mate. The width is the same 375.
      const WANT_TOP={kunal:103.7,'390':128};   // #548 item (92): 78 -> 102 and 103 -> 128, measured (see WANT); #550: 102 -> 100 at 375x679, measured (see WANT)
      if(WANT_TOP[geo]!=null)L.say(Math.abs(end.board.top-WANT_TOP[geo])<0.6,geo+': the board at game over sits at top '+WANT_TOP[geo]+', the measured position for this geometry - not merely where it was a moment ago',{measured:end.board.top,want:WANT_TOP[geo]});
    }
    L.say(end.over.over<=0,geo+': nothing scrolls at game over',end.over);
    L.say(row.includes('Review')&&row.includes('Rematch')&&!row.includes('Resign'),geo+': row reads Review · Rematch, no Resign',row.join(' | '));
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'GAMEOVER');
