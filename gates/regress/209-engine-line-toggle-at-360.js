'use strict';
// gates/regress/209-engine-line-toggle-at-360.js - AT 360x640 THE ENGINE LINE MOVES NOTHING ON THE BOARD, AND LEAVING ANALYSIS TURNS IT OFF.
// US-R219 / TC-R333..334.
//
// WHY [#553 B1, jobs/exiting-analysis-leaves-the-engine-line-on-for-the-rest-of-the-review-2026-09-30]: the job's remainder (its whatIsLeft and
// #550's outcome) was the 360x640 corner of the folded 9.5px-shift job. #549 reserved the engine row's 20px at 320x568, 375x568 and 375x667
// (gate 22 TC-R116) but not at 360x640, where reserving cost the board 14px for good, so the toggle there shrank the board 334 -> 320 and
// moved it 2.5px - left as 'Kunal's word on a permanently smaller board or a one-time shrink'. MEASURED at #553 on 64040301 (trial
// 482e41154446): at 360x640 the board is 360 wide at top 64 and switching the line on and off moves it NOT AT ALL - batch 13's short-upright
// layout (the rows give way before the board narrows; the engine line takes the explanation's lines as an overlay, not an added row) removed
// the trade, so nothing waits on his word. Gate 22 still leaves 360x640 out of TC-R116; this gate holds the corner, and the exit-analysis
// restore (gate 20 TC-R71 holds it at se and kunal761) at the same size.
// WHAT IT READS: the bundle under test (CT_APP), the Opera Game (drive/review SEED) on the move screen at ply 10, at 360x640 (w360):
//  TC-R333 PRECONDITION the line was off, on screen, then off again; the board's top and width do not move when it is switched ON, nor when
//          it is switched OFF (0.5px), and the board is the screen's full width.
//  TC-R334 a separate launch at ply 19: no engine row; Analyze turns it on (precondition); Exit analysis and a 1.5s settle: it is gone.
const L=require('../lib');const R=require('../drive/review');
const GEO=process.env.CT_G209_GEO||'w360';
L.run(async()=>{
  const G=L.GEOS[GEO];const tag=G.w+'x'+G.h;
  R.shareAnalysis(true);
  {const b=await L.launch({geo:GEO,store:{...R.SEED,ct_pool:'3'},name:'g209-toggle'});await b.open();let ok=true;
    const bd=()=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(e=>e.getBoundingClientRect()).sort((x,c)=>c.width-x.width)[0];return g?{top:+g.top.toFixed(2),w:+g.width.toFixed(2),vw:innerWidth,eng:!!document.querySelector('[data-ct="rev-engline"]')}:null;});
    let b0=null,b1=null,b2=null;
    try{await R.states['moves-ply10'](b);await R.engineSet(b,false);await b.settle(800);b0=await bd();
      await R.engineSet(b,true);await b.page.waitForSelector('[data-ct="rev-engline"]',{timeout:30000});await b.settle(1500);b1=await bd();
      await R.engineSet(b,false);await b.settle(1000);b2=await bd();}catch(e){ok=false;L.note(tag+': TC-R333 driver threw: '+String(e).slice(0,160));}
    L.say(ok&&!!b0&&!b0.eng&&!!b1&&b1.eng&&!!b2&&!b2.eng,tag+': TC-R333 PRECONDITION the engine line was off, then on screen, then off again',{b0,b1,b2});
    L.say(!!b0&&!!b1&&!!b2&&Math.abs(b0.top-b1.top)<=0.5&&Math.abs(b0.w-b1.w)<=0.5&&Math.abs(b1.top-b2.top)<=0.5&&Math.abs(b1.w-b2.w)<=0.5&&Math.abs(b0.w-b0.vw)<=0.5,tag+': TC-R333 switching the engine line on and off moves nothing: board top and width '+JSON.stringify(b0&&[b0.top,b0.w])+' -> '+JSON.stringify(b1&&[b1.top,b1.w])+' -> '+JSON.stringify(b2&&[b2.top,b2.w])+', the full '+(b0&&b0.vw)+'px width (it was 334 -> 320 before batch 13)',{b0,b1,b2});
    L.say(b.errs.length===0,tag+': TC-R333 zero app errors',b.errs.slice(0,3));await b.close();}
  {const b=await L.launch({geo:GEO,store:{...R.SEED,ct_pool:'3'},name:'g209-exit'});await b.open();let ok=true;
    const eng=()=>b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-engline"]'));
    try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,19);await b.settle(600);}catch(e){ok=false;}
    const e0=ok?await eng():null;let e1=null,e2=null;
    try{await b.tapCt('rev-fab',700);e1=await eng();}catch(e){}
    try{await b.tapText(/Exit analysis/,{wait:700});await b.settle(1500);e2=await eng();}catch(e){}
    L.say(ok&&e0===false&&e1===true,tag+': TC-R334 PRECONDITION at 10.Nxb5 there is no engine row, and Analyze turned it on',{e0,e1});
    L.say(e1===true&&e2===false,tag+': TC-R334 after Exit analysis the engine row is gone',{e2});
    L.say(b.errs.length===0,tag+': TC-R334 zero app errors',b.errs.slice(0,3));await b.close();}
  R.shareAnalysis(false);
},'209-engine-line-toggle-at-360');
