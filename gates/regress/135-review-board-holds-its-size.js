'use strict';
// gates/regress/135-review-board-holds-its-size.js - THE REVIEW BOARD KEEPS ONE SIZE AFTER A MOVE. US-R143 / TC-R211a..d.
//
// WHY [#550, Kunal 12 Nov, Review on his computer: "Every time I click on the next move button at the bottom right, the board keeps
// shaking for a few seconds"]: the compact Review's engine-row reservation (chess.jsx, `_engRes` beside rev-why) read its slack off the
// TRIMMED board, so the fit loop's own trim switched it. At a 1063x1134 page the reserved row put the page 2px over at board 820, the loop
// trimmed 16, the slack became 26, the reservation lapsed and gave its 20px back to the board column, _fitOver's compact-Review term
// (fixr3e) counted that as slack, `over` read -34, and the loop grew back to trim 0 - where the row was reserved again. Measured per frame
// on origin/main's #549 bundle and on 9a6a5c6: 820 -> 804 -> 820, 18 changes in about 1.2 s after every move, at pages 1063x1133..1135
// only (a 3px band; 1063x1132 and 1063x1136 are steady at 820). Trim 0 read over at all because the "bars can pay" test assumed the two
// player bars share slack+103 (the phone layout); the portrait-tablet compact review has 3px more chrome and they share slack+100.
// A Chromium window 1063x1267 at 150% (the checker's report) is a page of about 1063x1134 once the tab strip and toolbar are taken off -
// INFERRED from where the band sits, not measured on his machine; the 1063x1267 page itself is steady on both bundles and is read too.
// WHAT IT READS: the bundle under test (CT_APP). The Opera Game reviewed (drive/review.js), the eval graph on (ct_evalgraph 1), ply 4,
// then the toolbar's Next move tapped several times; after each tap the widest repeat(8,...) grid's width is sampled every animation frame
// for 3 s. At 1063x1134 at deviceScaleFactor 1.5, then the same page resized to 1063x1133, 1135, 1132 and 1267 (a resize is a geometry
// change, so the fit loop starts again from trim 0, as a fresh launch does), and at kunal761 (375x761, insets 51/31, the streamlined
// phone review).
// KNOW ITS LIMIT: headless Chromium with mobile emulation and the gate's fonts, not his Windows Chrome; the band's position depends on the
// chrome's exact pixel heights, so a font or row change can move it - which is why three heights around it are read and not one.
// It reads the board's size, not every other row; a row that jitters while the board holds is not seen here.
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=60 red=12 scope=trial:a54447410b45 how=the tree before the fix (engine-row reservation keyed on the trimmed board, bars' share slack+103 everywhere): 820/804(/788) with 18 to 35 changes per tap at 1063x1133..1135, TC-R211a/b/c red there, 1132, 1267 and kunal761 green; on t1 1a08ef13b16d 60/0
// HALF-FIX RECORD: part (1) alone (the reservation keyed on the untrimmed board, slack+103 kept), trial 4ac0b45c43bb: total=60 red=3 - no shaking (TC-R211a/b green), but the board holds 804 at 1133..1135 (the three TC-R211c lines red) - so each half of the fix is pinned by its own case.
const L=require('../lib');
const R=require('../drive/review');
const sample=(b,ms)=>b.page.evaluate((ms)=>new Promise(res=>{const s=[];const t0=performance.now();
  const f=()=>{let m=0;for(const e of document.querySelectorAll('div'))if(/repeat\(8,/.test(e.style.gridTemplateColumns||'')){const r=e.getBoundingClientRect();if(r.width>m)m=r.width;}
    s.push(Math.round(m*100)/100);if(performance.now()-t0<ms)requestAnimationFrame(f);else res(s);};requestAnimationFrame(f);}),ms);
// the current ply, read off the move strip: the one chip painted with the inset ring (chess.jsx, isCur), 1-based; 0 = none current
const curPly=(b)=>b.page.evaluate(()=>{const s=[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')];return s.findIndex(x=>x.style.boxShadow&&x.style.boxShadow!=='none')+1;});
const sizes=(s)=>[...new Set(s)];
const changes=(s)=>{let c=0;for(let k=1;k<s.length;k++)if(s[k]!==s[k-1])c++;return c;};
// one tap of Next move, then 3 s of per-frame widths. The sampler starts BEFORE the tap so the first frame after it is seen.
async function tapAndWatch(b){
  const p=sample(b,3000);await b.page.waitForTimeout(30);
  let tapped=true;await b.page.locator('[aria-label="Next move"]:visible').last().click({timeout:5000}).catch(()=>{tapped=false;});
  const s=await p;return {tapped,s};
}
async function column(b,tag,taps){
  const before=(await sample(b,400));const w0=before[before.length-1];
  const graph=await b.page.evaluate(()=>!!document.querySelector('[data-ct="eval-graph"]'));
  L.say(w0>100&&graph,tag+': TC-R211 PRECONDITION the board is found ('+w0+') and the eval graph is on',{w0,graph});
  const seen=[];let prev=w0;
  for(let i=0;i<taps;i++){
    const strip0=await curPly(b);const {tapped,s}=await tapAndWatch(b);const strip1=await curPly(b);
    const u=sizes(s);seen.push(...u);
    L.say(tapped&&strip1===strip0+1,tag+' tap '+(i+1)+': TC-R211 PRECONDITION Next move was tapped and the strip advanced one move ('+strip0+' -> '+strip1+')',{tapped,strip0,strip1});
    L.say(s.length>=60&&u.length===1,tag+' tap '+(i+1)+': TC-R211a the board holds one size for 3 s after Next move ('+s.length+' frames, sizes '+u.join('/')+', '+changes(s)+' changes)',{u,changes:changes(s),head:s.slice(0,40)});
    L.say(Math.abs(s[0]-prev)<0.5,tag+' tap '+(i+1)+': TC-R211b and it is the size it had before the tap ('+prev+' -> '+s[0]+')',{prev,first:s[0]});
    prev=s[s.length-1];
  }
  return {w0,min:Math.min(w0,...seen)};
}
L.run(async()=>{
  const geo={w:1063,h:1134,safe:'',label:'1063x1134 (a 1063x1267 window at 150%)'};
  {const b=await L.launch({geo,dpr:1.5,name:'rev-hold-1063',store:{ct_pool:'3',ct_evalgraph:'1'}});await b.open();
    let ok=true;try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,4);await b.settle(1500);}catch(e){ok=false;}
    L.say(ok,'TC-R211 PRECONDITION the Opera Game is reviewed and on ply 4 at 1063x1134');
    const lay=await b.page.evaluate(()=>({tb:!!document.querySelector('[data-ct="rev-row1"][data-tb]'),cmp:!!document.querySelector('[data-ct="rev-compact"]')}));
    L.say(lay.cmp&&!lay.tb,'TC-R211 PRECONDITION 1063 wide is the portrait-tablet compact review (rev-compact, no streamlined phone toolbar)',lay);
    const main=await column(b,'1063x1134 @1.5',4);
    const res={};
    for(const h of [1132,1133,1135,1267]){await b.page.setViewportSize({width:1063,height:h});await b.settle(1500);
      res[h]=await column(b,'1063x'+h+' @1.5',h===1132?1:2);}
    // TC-R211c: a taller page never gets a smaller board. At 1132 the board is steady on both bundles; the band above it must not dip under.
    for(const h of [1133,1135])L.say(res[h].min>=res[1132].min-0.5,'TC-R211c at 1063x'+h+' the board never dips under the 1063x1132 board ('+res[h].min+' vs '+res[1132].min+')',{h,min:res[h].min,ref:res[1132].min});
    L.say(main.min>=res[1132].min-0.5,'TC-R211c at 1063x1134 the board never dips under the 1063x1132 board ('+main.min+' vs '+res[1132].min+')',{min:main.min,ref:res[1132].min});
    L.say(b.errs.length===0,'TC-R211 1063 zero app errors',b.errs.slice(0,3));await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'rev-hold-761',store:{ct_pool:'3',ct_evalgraph:'1'}});await b.open();
    let ok=true;try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,4);await b.settle(1500);}catch(e){ok=false;}
    L.say(ok,'TC-R211 PRECONDITION the Opera Game is reviewed and on ply 4 at kunal761');
    await column(b,"kunal761 (TC-R211d)",4);
    L.say(b.errs.length===0,'TC-R211 kunal761 zero app errors',b.errs.slice(0,3));await b.close();}
},'135-review-board-holds-its-size');
