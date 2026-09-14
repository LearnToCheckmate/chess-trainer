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
      // #381 re-gate: THE WIDTH IS NOW PINNED, not merely held equal to itself. Found by running this gate against
      // a bundle with the MOVES header row's minHeight:23 removed - the #378 regression, where folding the chips
      // out let that row shrink and the board grew. The board read 367 instead of 351 and THIS GATE PASSED, because
      // "unchanged between mid-game and game over" is true of a board that is the wrong size the whole way through.
      // A gate that compares a value only against itself cannot see a change that arrives before its first sample.
      // Numbers measured on #381: 351 at 375x679, 390 at 390x844. If a deliberate change moves them, move them
      // here with it - the one thing never to do is re-pin them to whatever the build now happens to produce.
      const WANT={kunal:351,'390':390};
      if(WANT[geo]!=null)L.say(Math.abs(end.board.w-WANT[geo])<0.6,geo+': the board at game over is '+WANT[geo]+' wide, the measured size for this geometry - not merely the same as it was a moment ago',{measured:end.board.w,want:WANT[geo]});
    }
    L.say(end.over.over<=0&&end.over.docScroll===0,geo+': nothing scrolls at game over',end.over);
    L.say(row.includes('Review')&&row.includes('Rematch')&&!row.includes('Resign'),geo+': row reads Review · Rematch, no Resign',row.join(' | '));
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'GAMEOVER');
