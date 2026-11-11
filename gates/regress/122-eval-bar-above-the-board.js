'use strict';
// gates/regress/122-eval-bar-above-the-board.js - THE EVAL BAR SITS ABOVE THE BOARD, SO THE PLAY BOARD IS EDGE TO EDGE. US-R130 / TC-R198a..c.
//
// WHY [#550 item (64), move 1; jobs/board-is-too-small-against-chesscom-2026-09-23. The job names US-R38 and TC-R48, and both were
// taken long ago (#496's promotion picker and #476's narrowed list), so this is US-R130 / TC-R198]: Kunal's answer B9C-BOARD-SIZE "all-three: also
// move the eval bar above the board". Beside the board the bar cost Play against the computer 22px of width (353 of 375 on his phone).
// chess.jsx moves it above once on every store (ct_evalmig550), and the menu's Eval bar row still puts it back beside.
// WHAT IT READS: the bundle under test (CT_APP), Play against the computer at move 0, the board found as the widest repeat(8,...) grid.
// KNOW ITS LIMIT: on screens where the board is limited by height (320x568, 375x667) the bar above makes the board SMALLER (272 against
// 298, 339 against 353), and on every screen the board starts 12 to 23px lower. That is his answer's cost, put to him as run question
// q35 with pictures; this gate pins the geometries where the board is edge to edge and asserts nothing about the short ones.
const L=require('../lib');
const P=require('../drive/play');
const board=(b)=>b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  return {vw:innerWidth,w:bd?Math.round(bd.width*100)/100:null,above:!!document.querySelector('[data-ct="eval-bar-h"]'),beside:!!document.querySelector('[data-ct="eval-bar-v"]'),key:localStorage.getItem('ct_evalunder')};});
L.run(async()=>{
  // A. a fresh store: the bar above, the board the full width, at his phone and two wider ones
  for(const geo of ['kunal761',{w:375,h:730,safe:'',label:'375x730'},{w:430,h:932,safe:'',label:'430x932'}]){
    const b=await L.launch({geo,name:'r48-fresh',store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await P.states['cpu-m0'](b);await b.settle(900);}catch(e){ok=false;}
    const r=await board(b);const g=typeof geo==='string'?geo:geo.label;
    L.say(ok&&r.w!==null,'TC-R198a '+g+' PRECONDITION a game against the computer is on screen with its board',r);
    L.say(r.above&&!r.beside,'TC-R198a '+g+' on a fresh store the eval bar is ABOVE the board, not beside it',r);
    L.say(r.w!==null&&r.w>=r.vw-0.5,'TC-R198a '+g+' and the board is the full width, edge to edge: '+r.w+' of '+r.vw,r);
    L.say(b.errs.length===0,'TC-R198a '+g+' zero app errors',b.errs.slice(0,3));
    await b.close();}
  // B. a store from before #550 with the bar beside (the #361 migration done, ct_evalunder 0): moved above once
  {const b=await L.launch({geo:'kunal761',name:'r48-migrate',store:{ct_pool:'3',ct_evalmig361:'1',ct_evalunder:'0'}});await b.open();let ok=true;
   try{await P.states['cpu-m0'](b);await b.settle(900);}catch(e){ok=false;}
   const r=await board(b);
   L.say(ok&&r.above&&!r.beside&&r.key==='1','TC-R198b a store that kept the bar beside before #550 has it ABOVE now, written once (ct_evalunder '+r.key+')',r);
   L.say(r.w!==null&&r.w>=r.vw-0.5,'TC-R198b and its board is edge to edge: '+r.w+' of '+r.vw,r);
   await b.close();}
  // C. a choice made after the migration stands: beside, with the #550 migration done, stays beside
  {const b=await L.launch({geo:'kunal761',name:'r48-chosen',store:{ct_pool:'3',ct_evalmig361:'1',ct_evalmig550:'1',ct_evalunder:'0'}});await b.open();let ok=true;
   try{await P.states['cpu-m0'](b);await b.settle(900);}catch(e){ok=false;}
   const r=await board(b);
   L.say(ok&&r.beside&&!r.above&&r.key==='0','TC-R198c beside, chosen after the migration ran, stays beside: the migration runs once and never again',r);
   L.say(r.w!==null&&r.w<r.vw-10,'TC-R198c and there the board gives the bar its width back ('+r.w+' of '+r.vw+'), so A\'s full width is the placement and not the screen',r);
   await b.close();}
},'122-eval-bar-above-the-board');
