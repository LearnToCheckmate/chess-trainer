'use strict';
// gates/regress/205-puzzle-board-at-larger-text.js - THE PUZZLE BOARD STAYS ON SCREEN, ABOVE THE TAB BAR AND STILL AT LARGER TEXT.
// US-R215 / TC-R318..R319. Job: jobs/the-suite-varies-seven-geometries-and-exactly-one-font-so-no-gate-covers-a-larger-accessibility-font-2026-10-06
// (owning lane test-authoring, "cannot" twice for want of a faithful larger-text input). THE SMALLEST REAL SLICE, and what it does not do:
//   * THE INPUT is gates/drive/textscale.js: every element that owns text has its font-size and px line-height multiplied by S from the first paint and
//     after every re-render. It is NOT a root font-size or a page zoom (the app sizes text in px, so those would leave the glyphs alone), and it is not
//     iOS Larger Text: fixed px boxes keep their heights as on a phone, but the platform's own layout is not reproduced. It is the closest honest
//     headless input, and the gate prints that it moved the quantity before it reads anything under it (precondition TC-R318).
//   * THE SCREEN is the one the job measured, the Puzzles trainer on a fresh store ("Start training"), whose board size comes from the text above and
//     below it (pzStackH feeds SQ's puzzle heightCap). Three geometries (320x568, 375x667, kunal761), three text scales (1, 1.6, 2.4).
//   * THE INVARIANTS are the job's theTESTCASE, relative and not absolute pixels: (a) the board's right edge is inside the viewport, (b) its bottom is
//     above the tab bar (the board is never trimmed under the bar), (c) its width is the same across two settles, (d) #root has nothing to scroll: the
//     fit loop trims the board until the column fits (measured: with the loop skipped for puzzles #root is 596 tall in a 568 box at 320x568 x2.4). Not covered: the other screens, the
//     other four of the drill seven, and the job's (c) "width >= gate 48's control-row budget" (gate 48's budget is not exported). All left on the job.
// CONTROL: the fit loop skipped for the puzzle screens, or never reading any overflow - (d) red at 320x568 x2.4 (the other two geometries still fit by
// the loop's own floor, so they are not asked to go red). Two breaks that LOOKED like controls were BLIND and are not shipped: leaving pzStackH unmeasured and
// dropping it from the height cap (the board is trimmed by the fit loop, not by that cap, at these sizes - measured).
const L=require('../lib');
const TS=require('../drive/textscale');
const Z=require('../drive/puzzles');
const GEOS=['se','w375h667','kunal761'],SCALES=[1,1.6,2.4];
const rd=(b)=>b.page.evaluate(()=>{const gs=[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).gridTemplateColumns.split(' ').length===8&&d.getBoundingClientRect().width>100).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width);
  const bar=document.querySelector('[data-ct="tabbar"]');if(!gs.length||!bar)return null;const r=gs[0].getBoundingClientRect();
  return {top:Math.round(r.top*10)/10,right:Math.round(r.right*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width*10)/10,barTop:Math.round(bar.getBoundingClientRect().top*10)/10,iw:innerWidth,sh:document.getElementById('root').scrollHeight,ch:document.getElementById('root').clientHeight};});
L.run(async()=>{
  for(const g of GEOS){
    const base={};
    for(const S of SCALES){
      const b=await L.launch({geo:g,name:'pz205-'+g+'-'+S});await TS.install(b,S);await b.open();let ok=true;
      try{await Z.states['train'](b);await b.settle(900);}catch(e){ok=false;}
      const m1=ok?await rd(b):null;await b.settle(700);const m2=ok?await rd(b):null;const st=await TS.stats(b);
      const tag=g+' text x'+S;
      if(S===1){base.top=m1&&m1.top;base.th=st.textHeight;}
      L.say(!!m1&&!!m2&&st.scaled>=10,'TC-R318 PRECONDITION '+tag+': the puzzle board is on screen and the text scaler reached '+st.scaled+' elements',{m1,m2,st});
      if(S>1&&m1){const grew=st.textHeight>=base.th*(1+(S-1)*0.3),moved=m1.top-base.top>=10;
        L.say(grew&&moved,'TC-R318 PRECONDITION '+tag+': the larger text moved the measured quantity - the text height grew '+base.th+' -> '+st.textHeight+' and the board\'s top moved '+(Math.round((m1.top-base.top)*10)/10)+'px',{base,m1,st});}
      if(m1&&m2){
        L.say(m1.right<=m1.iw+0.5&&m2.right<=m2.iw+0.5,'TC-R319a '+tag+': the board\'s right edge ('+m2.right+') is inside the viewport ('+m2.iw+')',{m1,m2});
        L.say(m1.bottom<=m1.barTop&&m2.bottom<=m2.barTop,'TC-R319b '+tag+': the board ends above the tab bar ('+m2.bottom+' against '+m2.barTop+')',{m1,m2});
        L.say(m1.sh<=m1.ch+1&&m2.sh<=m2.ch+1,'TC-R319d '+tag+': the screen needs no scrolling - #root holds its content ('+m2.sh+' of '+m2.ch+'): the fit loop trimmed the board until the column fitted',{m1,m2});
        L.say(Math.abs(m1.w-m2.w)<=0.5&&Math.abs(m1.top-m2.top)<=0.5,'TC-R319c '+tag+': the board is the same size and place across two settles ('+m1.w+' at '+m1.top+' then '+m2.w+' at '+m2.top+')',{m1,m2});}
      L.say(b.errs.length===0,'TC-R319 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}}
},'205-puzzle-board-at-larger-text');
