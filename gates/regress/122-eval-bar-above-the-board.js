'use strict';
// gates/regress/122-eval-bar-above-the-board.js - THE EVAL BAR SITS ABOVE THE BOARD, SO THE PLAY BOARD IS EDGE TO EDGE. US-R130 / TC-R198a..e.
//
// WHY [#550 item (64), move 1; jobs/board-is-too-small-against-chesscom-2026-09-23. The job names US-R38 and TC-R48, and both were
// taken long ago (#496's promotion picker and #476's narrowed list), so this is US-R130 / TC-R198]: Kunal's answer B9C-BOARD-SIZE "all-three: also
// move the eval bar above the board". Beside the board the bar cost Play against the computer 22px of width (353 of 375 on his phone).
// chess.jsx moves it above once on every store (ct_evalmig550), and the menu's Eval bar row still puts it back beside.
// WHAT IT READS: the bundle under test (CT_APP), Play against the computer at move 0, the board found as the widest repeat(8,...) grid.
// HIS FINAL RULE (run-answers a35, chat about 7:45pm EST Wed 11 Nov 2026): portrait above where that gives the bigger board, and beside on
// short portrait screens (320x568, 375x667: above made the board 272 and 339 against 298 and 353 beside); in landscape the bar is upright
// on the board's RIGHT. chess.jsx draws the line at a height/width ratio of 1.87 (EVAL_ABOVE_MIN_RATIO). Block D asserts both halves.
// CONTROL-RECORD: 64afd33 2026-11-12 total=17 red=2 scope=trial:b8b9d170d5e9 how=#550 item (64): the migration run on every load - both TC-R198c lines red (a choice of beside does not stand)
// CONTROL-RECORD: 64afd33 2026-11-12 total=17 red=8 scope=trial:b06b4a724838 how=#550 item (64): the tree before the migration - TC-R198a and TC-R198b red, the preconditions and TC-R198c green
// CONTROL-RECORD: 976131a 2026-11-12 total=21 red=4 scope=trial:fa0485d4646e how=#550 a35: the trial before his final rule (portrait above everywhere, landscape bar on the left) - both TC-R198d and both TC-R198e lines red
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
  // D. a35: short portrait keeps the bar beside at its old width; landscape puts it on the board's right, upright
  for(const [g,want] of [[{w:320,h:568,safe:'',label:'320x568'},298],[{w:375,h:667,safe:'',label:'375x667'},353]]){
    const b=await L.launch({geo:g,name:'r198-short',store:{ct_pool:'3'}});await b.open();let ok=true;try{await P.states['cpu-m0'](b);await b.settle(900);}catch(e){ok=false;}
    const r=await board(b);
    L.say(ok&&r.beside&&!r.above&&Math.abs(r.w-want)<=1,'TC-R198d '+g.label+' a short portrait screen keeps the bar BESIDE, so the board keeps its '+want+' (above would make it smaller): '+r.w,r);
    await b.close();}
  for(const g of [{w:761,h:375,safe:'',label:'761x375'},{w:730,h:375,safe:'',label:'730x375'}]){
    const b=await L.launch({geo:g,name:'r198-land',store:{ct_pool:'3'}});await b.open();let ok=true;try{await P.states['cpu-m0'](b);await b.settle(900);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const v=document.querySelector('[data-ct="eval-bar-v"]'),h=document.querySelector('[data-ct="eval-bar-h"]');const q=v&&v.getBoundingClientRect();
      return {board:bd?[Math.round(bd.left),Math.round(bd.right)]:null,v:q?[Math.round(q.left),Math.round(q.right),Math.round(q.height)]:null,h:!!h,upright:!!q&&q.height>q.width,sw:document.documentElement.scrollWidth,vw:innerWidth};});
    L.say(ok&&!!r.v&&!r.h&&r.upright&&!!r.board&&r.v[0]>=r.board[1]-1&&r.sw<=r.vw,'TC-R198e '+g.label+' in landscape the bar is upright on the board\'s RIGHT (bar '+(r.v&&r.v.join('-'))+', board '+(r.board&&r.board.join('-'))+'), never above, and nothing runs off the side',r);
    await b.close();}
},'122-eval-bar-above-the-board');
