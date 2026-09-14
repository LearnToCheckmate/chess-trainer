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
    await b.card('k8',900);const m0=await b.metrics();await b.settle(6500);const m4=await b.metrics();
    L.say(!!m0.board&&!!m4.board&&Math.abs(m0.board.w-m4.board.w)<0.6&&Math.abs(m0.board.top-m4.board.top)<0.6,geo+': card k8 board unchanged over four plies (w '+(m0.board&&m0.board.w)+' -> '+(m4.board&&m4.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(m4.board&&m4.board.top)+')');
    // real Pass & Play from New Game
    await b.home();await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
    const p0=await b.metrics();const tops=new Set([p0.board&&p0.board.top]),ws=new Set([p0.board&&p0.board.w]);
    for(const [f,t] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','b5']]){await b.move(f,t,500);const m=await b.metrics();tops.add(m.board&&m.board.top);ws.add(m.board&&m.board.w);}
    const p5=await b.metrics();await b.shot('k8-'+geo+'-passplay-5plies');
    L.say(ws.size===1&&tops.size===1,geo+': Pass & Play board has ONE width and ONE top across five plies',{ws:[...ws],tops:[...tops]});
    // #388 PIN THE NUMBER, per geometry and per configuration. This replaces a kunal-only 351 check that was the
    // gate's ONLY defence against a board that had been the wrong size all along - see control A in the header.
    const P=PIN[geo];
    L.say(!!m4.board&&Math.abs(m4.board.w-P.card.w)<0.6,geo+': card k8 board is PINNED at '+P.card.w+' after four plies',m4.board&&m4.board.w);
    L.say(!!m4.board&&Math.abs(m4.board.top-P.card.top)<0.6,geo+': card k8 board top is PINNED at '+P.card.top+' after four plies',m4.board&&m4.board.top);
    L.say(!!p5.board&&Math.abs(p5.board.w-P.pp.w)<0.6,geo+': Pass & Play board is PINNED at '+P.pp.w+' after five plies',p5.board&&p5.board.w);
    L.say(!!p5.board&&Math.abs(p5.board.top-P.pp.top)<0.6,geo+': Pass & Play board top is PINNED at '+P.pp.top+' after five plies',p5.board&&p5.board.top);
    const moved=await b.page.evaluate(()=>(document.body.innerText.match(/Bb5/)||[]).length>0);
    L.say(moved,geo+': the five plies registered (Bb5 in the move list)');
    L.say(p5.over.over<=0&&p5.over.docScroll===0,geo+': no scroll after five plies',p5.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'PLAY-AFTER-MOVES');
