// regress/13-play-after-moves.js  (port of jump370.js)  k8: the Play board is the same size after moves as at move 0.
// Two configurations: card 2 (a scripted opponent, four plies) and a real Pass & Play game from New Game through
// 1.e4 e5 2.Nf3 Nc6 3.Bb5 (five plies). One top, one width, no scroll, zero errors. On Kunal's phone the Pass &
// Play board is 351 (no eval bar) and the vs-Computer board 357 (eval bar on the left).
'use strict';
const L=require('../lib');
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
    if(geo==='kunal'&&p5.board)L.say(Math.abs(p5.board.w-351)<0.6,'kunal: Pass & Play board is 351 ('+p5.board.w+')');
    const moved=await b.page.evaluate(()=>(document.body.innerText.match(/Bb5/)||[]).length>0);
    L.say(moved,geo+': the five plies registered (Bb5 in the move list)');
    L.say(p5.over.over<=0&&p5.over.docScroll===0,geo+': no scroll after five plies',p5.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'PLAY-AFTER-MOVES');
