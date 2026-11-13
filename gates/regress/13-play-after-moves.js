// regress/13-play-after-moves.js  (port of jump370.js)  k8: the Play board is the same size after moves as at move 0.
// Two configurations: card 2 (a scripted opponent, four plies) and a real Pass & Play game from New Game through
// 1.e4 e5 2.Nf3 Nc6 3.Bb5 (five plies). One top, one width, no scroll, zero errors.
//
// #388 - THE FIRST DELIBERATE NEGATIVE CONTROL THIS GATE HAS EVER HAD, and it found the same weakness that has
// now been fixed in six other gates. Until today this was the only suite whose single red had been an ACCIDENT:
// it went 1 of 12 at #380 on a bundle nobody meant to gate. Two controls were run at #388:
//
//   (A) every board 90% of its computed size, CONSTANTLY (`boardPx=SQ*8` -> `*0.9`). Board 338 instead of 351 at
//       375x679 and 351 instead of 390 at 390x844 - and BOTH of the gate's headline assertions PASSED, at both
//       geometries, because "unchanged over four plies" and "ONE width and ONE top" compare the board to ITSELF.
//       Only the single pinned line (kunal 351) fired. A board that had been wrong since before the first sample
//       was invisible to nine of this gate's eleven assertions.
//   (B) the MOVES panel's reservation removed (`_pLive` -> false), so the panel appears after the first move and
//       takes its height out of the board. 2 of 11 red at 375x679, on exactly the right lines: the board jumps
//       375 -> 279 and its top 103 -> 80.2 across the five plies. That is k8 itself, and the gate does catch it.
//       [R18, #545 item (84)] RE-MEASURED with the command published this time: CT_OUT trial 7dd1567637b4
//       (`const _pLive=false;`), `CT_APP=<it> node gates/regress/13-play-after-moves.js`. Those numbers are the PASS & PLAY
//       row at 375x679 (ws [375,279], tops [103,80.2]), not card k8, whose board goes 375 -> 319, top 103 -> 78.2. And the
//       k8 headline line PASSED on it (319 -> 319): its "move 0" sample was taken after e4. On the old gate the trial reads
//       15 / 4, and the four red lines are Pass & Play plus the pins. On this gate it reads 19 / 6, adding the two k8 lines.
//       390x844 is unaffected (390 -> 390), because _pLive is false there for !wide reasons too.
//
// So the subject was guarded and the SIZE was not. Every board number is now pinned per geometry AND per
// configuration, measured on #387 (ae5ebbc4497645dd19a7215a0402010e): card k8 and Pass & Play are both 351 @ 78
// at 375x679 and 390 @ 103 at 390x844. Two honest notes on control A: at 390x844 nothing about the board fires
// even now-a shrunken-but-constant board there is caught only by the new pins; and its red on "the five plies
// registered" is an ARTEFACT, not an isolation - the smaller board made b.move miss its squares, the same thing
// 34-takeback hit at #383. The header used to claim the vs-Computer board is 357. Measured, it is 351.
// CONTROL-RECORD: a22f527 2026-11-13 total=25 red=6 scope=trial:5d648bc20064 how=#550 job five-gates-enter-their-state-by-tapping-a-dev-gallery-card (gate 13's 'card' configuration moved off card k8 onto a computer game played by hand, drive/play.js cpu-m0 + moves): the Play board 8px narrower - the four card/PP width and top pins at kunal and both width pins at 390 red; with the k10, k8 and both k11 cards DELETED (trial:e9020df7aebb) 25/0 on the new route; on 77ffccc15668 25/0 by both routes, PASS/FAIL lines identical except the card configuration's numbers (375@100 / 390@128 on the dev-only 'demo' opponent, 353@109 / 390@150 against the computer), re-pinned
// CONTROL-RECORD: a22f527 2026-11-13 total=25 red=2 scope=trial:4d7c8dd016f1 how=#550 same move, control (B) of the header re-run on the new route (_pLive=false): the card top pin (128 vs 109) and the Pass & Play top pin (124 vs 103.7) red at kunal; the 'unchanged from move 0' lines stay green on the computer game too (the board sits at 353@128 from move 0), so as on the dev card the pins, not the unchanged lines, are what see it
// WHY _pLive=false IS NOT A CONTROL FOR THE 'unchanged' LINES ANY MORE, AND THE ONE THAT IS [#550 round 2]. In portrait movesOpen starts
// true, and the moves panel renders when history>0 OR _pFill OR movesOpen - so with _pLive false the panel is still laid out from move 0, it
// merely stops filling (no flex), and the board sits at 353@128 (computer) and 375@124 (Pass & Play) for the WHOLE game. Nothing appears
// after the first move, so the 'unchanged' lines are RIGHT to stay green on it: it is a constant-layout control, which is the pins' job
// (control A above). The k8 defect is a row that is absent at move 0 and appears after it, and that control is the panel's own condition
// cut to history>0 alone (`(boardGame.history.length>0||_pFill||_pLand)` -> `(boardGame.history.length>0)`): at 375x679 the computer
// board goes 353@128 at move 0 -> 353@109 after e4, and the two 'unchanged' lines and Pass & Play's ONE-top line go red ON THEIR OWN while
// all four kunal pins stay GREEN (the after-move state is the tip's). 390x844 does not move on it (390@150 and 390@128 throughout).
// CONTROL-RECORD: e2692c0 2026-11-13 total=25 red=3 scope=trial:eb30ab8b8b18 how=#550 round 2: the moves panel rendered only once history>0 (the #370 k8 shape: a row that appears after the first move): 'kunal: card k8 board unchanged from MOVE 0 to the first ply' (top 128 -> 109), 'kunal: card k8 board unchanged over four plies' (128 -> 109) and 'kunal: Pass & Play board has ONE width and ONE top' (tops 124, 103.7) red; every pin green; tip trial:489840ab49bb 25/0
'use strict';
const L=require('../lib');
// measured on #387 (ae5ebbc4497645dd19a7215a0402010e). Board width and top, per geometry, for BOTH configurations.
// #548 item (92) RE-PINNED ON PURPOSE, as jobs/chrome-row-still-unbuilt-2026-09-28 says this pin must be: Home and Menu left the top
// player bar for a 44px row of their own and the move strip under the board went (Kunal's 'everywhere'). Measured on the #548 trial:
// 375x679 card k8 and Pass & Play 351@78 -> 367@102 (WIDER by 16 and 24px lower), 390x844 390@103 -> 390@128 (same width, 25px lower).
// #550 short upright (BSA-P-36, q42): at 375x679 Pass & Play folds 'vs Human' into the top row and trims its gaps, so its board is the full 375 at 103.7 (measured on the round-7 bundle c5269256d63e); the card k8 board is unchanged.
// #550 RE-KEYED: card k8 at 375x679 measured 375@100 on the batch-10 tree (t163 7719e5a7fd39; already 375@100 on the tip 342f7329901b before the
// formatting merge, per two helpers) - the board is now full width there like every other board on his phone, 8px wider and 2px higher.
// #550 THE PLAYER'S ROUTE RE-KEYS 'card' [jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-2026-10-01]: the 'card' configuration
// is now a game against the computer (Pip) played by hand, not the gallery's dev-only 'demo' opponent. Its top bar names the bot, so the board
// is 353 at 109 at 375x679 and 390 at 150 at 390x844 - measured on 77ffccc15668 at move 0 and after four plies, both - where card k8 read
// 375@100 and 390@128. Pass & Play is unchanged.
const PIN={kunal:{card:{w:353,top:109},pp:{w:375,top:103.7}},'390':{card:{w:390,top:150},pp:{w:390,top:128}}};
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'k8-'+geo});await b.open();
    // #545 item (84) [jobs/gate-13-k8-takes-its-move-0-baseline-one-ply-late-2026-09-30]: m0 used to be sampled at 900ms, and
    // the card's runner plays e4 at 750ms (chess.jsx _autogame, setTimeout 750 then 1150 per ply). So "move 0" was already
    // one ply in, and the move-0 -> ply-1 transition, the ONLY one #370 ever broke, was never compared. m0 is now taken at
    // 200ms and is PROVED to be move 0 (no e4 on screen yet); m1 is taken after the first ply and PROVED to be after it.
    const plyText=()=>b.page.evaluate(()=>/\be4\b/.test(document.body.innerText||''));
    // THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#550; jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-
    // 2026-10-01]. This was b.card('k8',200) - the gallery's scripted four-ply game, sampled at 200ms, +900ms and +5600ms. It is now a
    // computer game played by hand (gates/drive/play.js): cpu-m0 (Home -> Play -> Computer, Pip, Start) is the move-0 sample, 1.e4 is
    // the ply-1 sample, and the reply, 2.Nf3 and the reply make the four plies. The 'card k8' wording in the lines below names the
    // configuration (a live game against an opponent), kept so the PASS lines read the same by both routes.
    const PD=require('../drive/play');
    await PD.states['cpu-m0'](b);const m0=await b.metrics();const e4at0=await plyText();
    await b.move('e2','e4',0);await b.settle(900);const m1=await b.metrics();const e4at1=await plyText();
    await PD.waitPlies(b,2);await b.settle(500);await b.move('g1','f3',0);await PD.waitPlies(b,4);await b.settle(500);const m4=await b.metrics();
    L.say(!!m0.board&&!e4at0,geo+': PRECONDITION the move-0 sample is really move 0 - a board is painted and e4 has not been played yet',{board:!!m0.board,e4Shown:e4at0});
    L.say(e4at1,geo+': PRECONDITION the ply-1 sample is really after the first move - e4 is on screen',{e4Shown:e4at1});
    L.say(!!m0.board&&!!m1.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6,geo+': card k8 board unchanged from MOVE 0 to the first ply - the transition #370 broke (w '+(m0.board&&m0.board.w)+' -> '+(m1.board&&m1.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(m1.board&&m1.board.top)+')');
    L.say(!!m0.board&&!!m4.board&&Math.abs(m0.board.w-m4.board.w)<0.6&&Math.abs(m0.board.top-m4.board.top)<0.6,geo+': card k8 board unchanged over four plies (w '+(m0.board&&m0.board.w)+' -> '+(m4.board&&m4.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(m4.board&&m4.board.top)+')');
    // real Pass & Play from New Game
    await b.home();await b.tile('Play');await b.tapText(/^Pass & Play$/);await PD.tapStart(b,900);   // tapStart: a live computer game is on the board now, so Start arms first (#469)
    const p0=await b.metrics();const tops=new Set([p0.board&&p0.board.top]),ws=new Set([p0.board&&p0.board.w]);
    for(const [f,t] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','b5']]){await b.move(f,t,500);const m=await b.metrics();tops.add(m.board&&m.board.top);ws.add(m.board&&m.board.w);}
    const p5=await b.metrics();await b.shot('k8-'+geo+'-passplay-5plies');
    // #545 item (84), alsoInThisFileNotFiledSeparately: the five-plies check moved ABOVE every line that claims "across / after
    // five plies" (the #385 rule: assert the state was reached first).
    const moved=await b.page.evaluate(()=>(document.body.innerText.match(/Bb5/)||[]).length>0);
    L.say(moved,geo+': the five plies registered (Bb5 in the move list)');
    L.say(ws.size===1&&tops.size===1,geo+': Pass & Play board has ONE width and ONE top across five plies',{ws:[...ws],tops:[...tops]});
    // #388 PIN THE NUMBER, per geometry and per configuration. This replaces a kunal-only 351 check that was the
    // gate's ONLY defence against a board that had been the wrong size all along - see control A in the header.
    const P=PIN[geo];
    L.say(!!m4.board&&Math.abs(m4.board.w-P.card.w)<0.6,geo+': card k8 board is PINNED at '+P.card.w+' after four plies',m4.board&&m4.board.w);
    L.say(!!m4.board&&Math.abs(m4.board.top-P.card.top)<0.6,geo+': card k8 board top is PINNED at '+P.card.top+' after four plies',m4.board&&m4.board.top);
    L.say(!!p5.board&&Math.abs(p5.board.w-P.pp.w)<0.6,geo+': Pass & Play board is PINNED at '+P.pp.w+' after five plies',p5.board&&p5.board.w);
    L.say(!!p5.board&&Math.abs(p5.board.top-P.pp.top)<0.6,geo+': Pass & Play board top is PINNED at '+P.pp.top+' after five plies',p5.board&&p5.board.top);
    L.say(p5.over.over<=0,geo+': no scroll after five plies',p5.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'PLAY-AFTER-MOVES');
