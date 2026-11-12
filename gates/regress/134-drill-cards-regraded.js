'use strict';
// gates/regress/134-drill-cards-regraded.js - THE CARDS ALREADY IN THE DRILL ARE RE-GRADED BY WIN CHANCE. US-R142 / TC-R210a..c.
//
// WHY [#550, run-answers build__1794388896663-a41, Kunal 12 Nov: "Ship, re-check my cards"; jobs/drill-cards-blunders-and-mistakes-only-
// 2026-11-12]: the drill now takes Blunders and Mistakes by win chance, but the cards already on his phone were chosen on the old centipawn
// ladder and hold only that label. He asked for them to be re-checked now, not only when a game is reviewed again.
// WHAT IT READS: the bundle under test (CT_APP). Two cards are seeded into ct_mymistakes, both on 4k3/8/8/3q4/8/8/8/3QK3 w with best Qxd5:
// one where he played Qd2 (the queen left en prise: a Blunder by win chance), one where he played Qxd5 itself (the best move: not a mistake
// at all - the shape of a card the old ladder could carry). The app opens on Home at kunal761 and the gate waits there, as he would, for the
// re-grade pass (the app's Stockfish, about 600ms a card).
// KNOW ITS LIMIT: two cards; the pass stops when Home is left, which this gate does not exercise.
const L=require('../lib');
const FEN='4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1';
const CARDS=[{fen:FEN,uci:'d1d5',label:'Blunder',played:'Qd2',ts:1791000000001,last:null,why:'Qxd5 was stronger.'},
             {fen:FEN,uci:'d1d5',label:'Mistake',played:'Qxd5',ts:1791000000002,last:null,why:'Qxd5 was stronger.'}];
L.run(async()=>{
  const b=await L.launch({geo:'kunal761',name:'regrade134',store:{ct_mymistakes:CARDS,ct_pool:'3'}});await b.open();
  let st=null;for(let i=0;i<60;i++){await b.settle(500);st=await b.page.evaluate(()=>{let m=null,r=null;try{m=JSON.parse(localStorage.getItem('ct_mymistakes')||'null');}catch(e){}try{r=JSON.parse(localStorage.getItem('ct_regrade550')||'null');}catch(e){}return {m,r,home:!!document.querySelector('[data-ct="home"]')||/Home/.test(document.title)};});if(st.r&&st.r.at)break;}
  const m=(st&&st.m)||[];const r=st&&st.r;
  L.say(!!r&&!!r.at,'TC-R210 PRECONDITION the re-grade pass ran to its end on Home ('+(r?JSON.stringify(r):'no record')+')',r);
  const kept=m.find(x=>x.played==='Qd2'),gone=!m.find(x=>x.played==='Qxd5');
  L.say(!!kept&&!!kept.wc&&(kept.wc.g==='Blunder'||kept.wc.g==='Mistake'),'TC-R210a the real blunder (Qd2, the queen left) stays, re-graded '+(kept&&kept.wc?kept.wc.g+' at a '+kept.wc.drop+'-point drop':'(no re-grade)'),kept);
  L.say(gone,'TC-R210b the card where the move played WAS the best move leaves the deck',m.map(x=>x.played));
  L.say(!!r&&r.before===2&&r.after===1&&r.dropped===1,'TC-R210c the deck count is recorded before and after (ct_regrade550: '+(r?(r.before+' -> '+r.after+', '+r.dropped+' dropped'):'none')+')',r);
  L.say(b.errs.length===0,'TC-R210 zero app errors',b.errs.slice(0,3));await b.close();
},'134-drill-cards-regraded');
