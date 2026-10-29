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
'use strict';
const L=require('../lib');
// measured on #387 (ae5ebbc4497645dd19a7215a0402010e). Board width and top, per geometry, for BOTH configurations.
const PIN={kunal:{card:{w:351,top:78},pp:{w:351,top:78}},'390':{card:{w:390,top:103},pp:{w:390,top:103}}};
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'k8-'+geo});await b.open();
    // #545 item (84) [jobs/gate-13-k8-takes-its-move-0-baseline-one-ply-late-2026-09-30]: m0 used to be sampled at 900ms, and
    // the card's runner plays e4 at 750ms (chess.jsx _autogame, setTimeout 750 then 1150 per ply). So "move 0" was already
    // one ply in, and the move-0 -> ply-1 transition, the ONLY one #370 ever broke, was never compared. m0 is now taken at
    // 200ms and is PROVED to be move 0 (no e4 on screen yet); m1 is taken after the first ply and PROVED to be after it.
    const plyText=()=>b.page.evaluate(()=>/\be4\b/.test(document.body.innerText||''));
    await b.card('k8',200);const m0=await b.metrics();const e4at0=await plyText();
    await b.settle(900);const m1=await b.metrics();const e4at1=await plyText();
    await b.settle(5600);const m4=await b.metrics();
    L.say(!!m0.board&&!e4at0,geo+': PRECONDITION the move-0 sample is really move 0 - a board is painted and e4 has not been played yet',{board:!!m0.board,e4Shown:e4at0});
    L.say(e4at1,geo+': PRECONDITION the ply-1 sample is really after the first move - e4 is on screen',{e4Shown:e4at1});
    L.say(!!m0.board&&!!m1.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6,geo+': card k8 board unchanged from MOVE 0 to the first ply - the transition #370 broke (w '+(m0.board&&m0.board.w)+' -> '+(m1.board&&m1.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(m1.board&&m1.board.top)+')');
    L.say(!!m0.board&&!!m4.board&&Math.abs(m0.board.w-m4.board.w)<0.6&&Math.abs(m0.board.top-m4.board.top)<0.6,geo+': card k8 board unchanged over four plies (w '+(m0.board&&m0.board.w)+' -> '+(m4.board&&m4.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(m4.board&&m4.board.top)+')');
    // real Pass & Play from New Game
    await b.home();await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
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
    L.say(p5.over.over<=0&&p5.over.docScroll===0,geo+': no scroll after five plies',p5.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'PLAY-AFTER-MOVES');
