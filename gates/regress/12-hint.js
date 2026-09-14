// regress/12-hint.js  (port of gallery372.js / hintcap372.js, the live-app half)  A-06 / Z-01: a puzzle hint takes
// the header row and never moves the board. Card 5 enters the first puzzle and sets its hint after 700ms: the
// board top before the hint must equal the board top with the hint showing; the hint header is on screen and its
// text is not clipped (scrollHeight == clientHeight).
'use strict';
const L=require('../lib');
L.run(async()=>{
  for(const geo of ['kunal','390','se']){
    const b=await L.launch({geo,name:'hint-'+geo});await b.open();
    await b.card('A-06',350);const before=await b.metrics();
    await b.settle(1800);const after=await b.metrics();await b.shot('hint-'+geo);
    const head=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,sh:e.scrollHeight,ch:e.clientHeight,text:(e.innerText||'').trim()};});
    L.say(!!before.board&&!!after.board,geo+': puzzle board present before and with the hint');
    if(before.board&&after.board){L.say(Math.abs(before.board.top-after.board.top)<0.6&&Math.abs(before.board.w-after.board.w)<0.6,geo+': board unmoved by the hint (top '+before.board.top+' -> '+after.board.top+', w '+after.board.w+')');}
      // #384 (derived test-lane item 6): the board-movement assertion above compares two MEASURED values and nothing else, so it is true of a board that has been the wrong size since before the first sample. That is exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. The width is pinned here for the same reason. Measured on #383.
      const WANT={kunal:375,'390':390,se:259};
      if(WANT[geo]!=null)L.say(!!after.board&&Math.abs(after.board.w-WANT[geo])<0.6,geo+': the puzzle board is '+WANT[geo]+' wide with the hint up - the measured size, not merely the same as a moment ago',{measured:after.board&&after.board.w,want:WANT[geo]});
    L.say(!!head&&head.text.length>10,geo+': hint header shows the hint',head&&head.text.slice(0,60));
    L.say(!!head&&head.sh<=head.ch+1,geo+': hint text not clipped (scroll '+(head&&head.sh)+' vs '+(head&&head.ch)+')');
    L.say(!!head&&head.y>=0&&head.y+head.h<=(after.board?after.board.top:1e9)+0.5,geo+': hint header sits above the board, on screen');
    L.say(after.over.over<=0&&after.over.docScroll===0,geo+': no scroll with the hint',after.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'HINT');
