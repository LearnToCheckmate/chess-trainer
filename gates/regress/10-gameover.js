// regress/10-gameover.js  (port of gameover371.js)  k10 / A-02 / X-01: a finished game keeps the board.
// Gallery card 1 plays Scholar's mate in seven moves. The board's width and top mid-game must equal
// its width and top after the mate; nothing scrolls; the row reads Review · Rematch; zero app errors.
'use strict';
const L=require('../lib');
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'gameover-'+geo});await b.open();
    await b.card('k10',2600);                              // 750ms lead + one or two plies in
    const mid=await b.metrics();
    await b.settle(10500);                                 // the seventh move (Qxf7#) lands at ~8.7s
    const end=await b.metrics();const row=await b.texts();
    await b.shot('gameover-'+geo+'-end');
    L.say(!!mid.board&&!!end.board,geo+': board present mid-game and after the mate',{mid:mid.board,end:end.board});
    if(mid.board&&end.board){
      L.say(Math.abs(mid.board.w-end.board.w)<0.6,geo+': board width unchanged at game over ('+mid.board.w+' -> '+end.board.w+')');
      L.say(Math.abs(mid.board.top-end.board.top)<0.6,geo+': board top unchanged at game over ('+mid.board.top+' -> '+end.board.top+')');
    }
    L.say(end.over.over<=0&&end.over.docScroll===0,geo+': nothing scrolls at game over',end.over);
    L.say(row.includes('Review')&&row.includes('Rematch')&&!row.includes('Resign'),geo+': row reads Review · Rematch, no Resign',row.join(' | '));
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'GAMEOVER');
