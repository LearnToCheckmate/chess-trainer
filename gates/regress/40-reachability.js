// regress/40-reachability.js  "below the fold" is NOT "unreachable". THE RULE, WRITTEN AS A GATE.
//
// WHY THIS EXISTS. In one night the overnight test lane raised three reachability defects against #378. Two of the
// three were the SAME measurement error and neither was a defect:
//   - "the ⋯ sheet's content is below the fold at five of six geometries" (TC-RL-070). The sheet is maxHeight 82vh
//     with overflowY auto. Scrolled to its end, every row is on screen and tappable. See gate 38.
//   - "the Review ENTRY screen overflows 80.2px at 320x568 with docScrollY 0, so the Chess.com help text is
//     unreachable on the smallest phones." Measured here: the content past the fold sits inside a scroll container
//     whose maxScroll is EXACTLY 80px, and "Getting your game from Chess.com" scrolls to top 385 / bottom 401 in a
//     568-tall viewport. Reachable, and the 80.2 in the report is the scroller's own range read as if it were spill.
//
// THE ERROR IS THE SAME BOTH TIMES, and it is subtle enough to keep recurring: `document.scrollingElement` does not
// scroll, so the reporter concluded nothing scrolls. But an inner div with overflow:auto scrolls WITHOUT the
// document scrolling at all. An element whose rect is below the viewport is only unreachable when NO ancestor can
// bring it into view. CLAUDE.md says a crop is a reading and a bad selector is a reading; this is the third member
// of that family - a bottom coordinate is a reading too, until you have asked what can scroll.
//
// So this gate does not guard one screen. It guards the RULE, by doing the measurement correctly on the screen
// where the lane got it wrong, and it fails loudly if that screen ever really does strand content.
//
// WHAT IT PROVES, at 320x568 (where the report was filed) and at his 375x730:
//   1. Whatever sits below the fold on the Review entry screen has a scrollable ancestor that can reach it, and
//      the gate names that ancestor and its range rather than asserting an absence.
//   2. The specific text the report named is reachable, measured after scrolling rather than at rest.
//   3. The DOCUMENT still does not scroll - which is a deliberate design property here, not a defect, and is
//      exactly the signal that was misread. Asserting it makes the misreading impossible to repeat silently.
//   4. Nothing overflows horizontally, which IS unrecoverable on a phone and is the real version of this bug -
//      see flag sweep372-other-lines-320, where a button hardcoded to end at x=375 hung 55px off a 320 screen
//      with no scroll to recover it. The contrast is the point: vertical spill inside a scroller is fine,
//      horizontal spill past the viewport is not.
//
// NEGATIVE CONTROL, and it took two attempts, both worth recording.
//   FIRST CONTROL, WORTHLESS: overflowY set to hidden on a `.scroll` div inside the screen. The gate stayed green
//   and so did every measured number, byte for byte - because that div is not the scroller serving this screen. A
//   control that does not move the measurement proves nothing about the gate either way, and reading it as "the
//   gate is fine" would have been the mistake.
//   THE REAL SCROLLER IS `#root`, styled from index.html, not from chess.jsx, and index.html says so in a comment:
//   "The app scrolls inside here if its content ever overflows - the page never does." That single line is the
//   whole explanation of the two false reports: docScrollY is 0 BY DESIGN, so a reporter who checks the document
//   and stops concludes nothing scrolls.
//   SECOND CONTROL, REAL: #root given overflow-y hidden, so the app genuinely cannot scroll anywhere. The gate
//   goes red at 320x568 with scrollers:0 and reached:false on three boxes.
//   WHICH ASSERTION DISCRIMINATES: the below-the-fold sweep. The named-help-text assertion stays GREEN on the
//   broken build, because the leaf element carrying that phrase happens to sit at top 385 and is on screen at
//   rest - it is the block BELOW it that gets stranded. Said out loud so nobody reads that green as coverage.
//   AND THIS GATE'S FIRST VERSION WENT GREEN ON THE REAL CONTROL TOO, 12 of 12, for both reasons above. A gate
//   written to warn about a measurement error, making exactly that error, is the most useful thing in this file.
'use strict';
const L=require('../lib');
const Z=require('../drive/puzzles');

// The correct reachability measurement, and the reference implementation of the rule. Two things make it correct,
// and BOTH were wrong in this gate's first version, which went green against a bundle built to fail it:
//
//   (a) A user can only scroll a container whose COMPUTED overflowY is auto or scroll. Script is not so limited:
//       assigning scrollTop, and scrollIntoView(), will happily scroll an overflow:hidden box. The first version
//       used scrollIntoView and therefore reported "reachable" on a build with the scroller removed - the exact
//       fault gate 35 had, reproduced here by the same reflex.
//   (b) Finding SOME scrollable ancestor proves nothing. It has to be an ancestor that, when scrolled, actually
//       brings THIS element on screen. The first version climbed until it found any box with room to scroll and
//       called that reachable, so an unrelated scroller elsewhere in the tree certified content it does not
//       contain.
//
// So the measurement is empirical: collect only the USER-scrollable ancestors, actually scroll them, re-read the
// element's rect, then put every scrollTop back. What comes out is the truth rather than an inference about it.
const scan=(b)=>b.page.evaluate(()=>{
  const vh=innerHeight;
  const userScrollables=(el)=>{const out=[];let p=el.parentElement;
    while(p&&p!==document.documentElement){const s=getComputedStyle(p);
      if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+1)out.push(p);
      p=p.parentElement;}
    return out;};
  const targets=[];
  const walk=(el,d)=>{for(const c of el.children){const r=c.getBoundingClientRect();
    if(r.height>0&&r.bottom>vh+0.5)targets.push(c);
    if(d<6)walk(c,d+1);}};
  walk(document.getElementById('root'),0);
  const items=[];
  for(const el of targets){
    const r0=el.getBoundingClientRect();
    // An element taller than the viewport can never be fully on screen and is not a defect on its own; what
    // matters is that its CONTENTS are reachable, and they are walked as their own targets.
    const tallerThanScreen=r0.height>vh;
    const scs=userScrollables(el);
    const saved=scs.map(p=>p.scrollTop);
    for(let i=scs.length-1;i>=0;i--){const p=scs[i];
      const pr=p.getBoundingClientRect(),er=el.getBoundingClientRect();
      p.scrollTop=Math.max(0,Math.min(p.scrollHeight-p.clientHeight,p.scrollTop+(er.bottom-pr.bottom)+8));}
    const r=el.getBoundingClientRect();
    items.push({ct:el.getAttribute('data-ct'),t:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),
                scrollers:scs.length,tall:tallerThanScreen,
                restBottom:Math.round(r0.bottom),afterBottom:Math.round(r.bottom),
                reached:tallerThanScreen||r.bottom<=vh+0.5});
    scs.forEach((p,i)=>{p.scrollTop=saved[i];});
  }
  return {vh,docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight),items};
});
// The named text, reached the way a finger would: only user-scrollable ancestors, never scrollIntoView.
const reach=(b,re)=>b.page.evaluate((src)=>{
  const r=new RegExp(src[0],src[1]);
  const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&r.test(e.textContent||''));
  if(!el)return {found:false};
  const scs=[];let p=el.parentElement;
  while(p&&p!==document.documentElement){const s=getComputedStyle(p);
    if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+1)scs.push(p);
    p=p.parentElement;}
  for(let i=scs.length-1;i>=0;i--){const q=scs[i];
    const pr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
    q.scrollTop=Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop+(er.top-pr.top)-Math.max(0,(pr.height-er.height)/2)));}
  const g=el.getBoundingClientRect();
  return {found:true,scrollers:scs.length,top:Math.round(g.top),bottom:Math.round(g.bottom),vh:innerHeight,
          onScreen:g.top>=-0.5&&g.bottom<=innerHeight+0.5};
},[re.source,re.flags]);
const hspill=(b)=>b.page.evaluate(()=>{
  const vw=innerWidth,bad=[];
  for(const e of document.querySelectorAll('body *')){
    if(e.closest('[data-mstrip]'))continue;            // the move strip scrolls sideways on purpose
    if(/^(head|style|script|title|meta|link)$/i.test(e.tagName))continue;
    const s=getComputedStyle(e);
    if(s.visibility==='hidden'||s.display==='none')continue;
    const r=e.getBoundingClientRect();
    if(r.width<1||r.height<1)continue;
    if(r.right>vw+0.5)bad.push({ct:e.getAttribute('data-ct'),tag:e.tagName.toLowerCase(),right:Math.round(r.right*10)/10,vw,t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,30)});
  }
  return {docScrollW:Math.round(document.documentElement.scrollWidth),vw,bad:bad.slice(0,5)};
});

L.run(async()=>{
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'reach-'+geo,store:{}});await b.open();
    await b.tile('Review');await b.settle(700);

    const bf=await scan(b);
    const stranded=bf.items.filter(x=>!x.reached);
    L.note(geo+': '+bf.items.length+' painted boxes sit below the fold at rest; docScroll '+bf.docScroll);
    for(const x of bf.items.slice(0,4))L.note('   '+JSON.stringify(x));
    L.say(stranded.length===0,geo+': every box below the fold on the Review entry screen can be SCROLLED onto the screen by a finger - measured by actually scrolling its user-scrollable ancestors and re-reading the rect, not by finding one and assuming. "Below the fold" is not "unreachable", and that is the measurement the test lane got wrong twice in one night.',stranded.slice(0,3));

    const help=await reach(b,/Getting your game from Chess\.com/i);
    L.say(help.found,geo+': the help text the report named is on this screen at all',help);
    L.say(help.found&&help.onScreen,geo+': and a finger can reach it (top '+help.top+', bottom '+help.bottom+', viewport '+help.vh+', via '+help.scrollers+' user-scrollable ancestor(s)). The report called it unreachable at 320x568; the 80.2px it cites is the scroller\'s own range.',help);

    L.say(bf.docScroll===0,geo+': the DOCUMENT still does not scroll - which is the design here, not the defect. It is the signal that was misread into two false reports, so it is pinned rather than left to be rediscovered.',bf.docScroll);

    const hs=await hspill(b);
    L.say(hs.bad.length===0&&hs.docScrollW<=hs.vw+0.5,geo+': nothing hangs off the RIGHT - the spill that genuinely cannot be recovered on a phone, unlike vertical spill inside a scroller',hs);

    await b.shot('reach-'+geo);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }

  // ---- THE PUZZLE HEADER AT 320, which is the OTHER half of this gate's subject: the spill that really cannot
  // be recovered. uat378 measured the tier badge ending at 336.44 on a 320 screen with document.scrollWidth
  // pinned at 320 and an ancestor at overflow-x hidden - 16.44px simply gone, no scroll to reach it. Reproduced
  // on #381 at 336.84. #382 shrinks the Roadmap label to a chevron at 340 and below, which is what the HINT
  // branch of this same row already does, and the badge ends at 316.
  // 375 is measured too and asserted to be UNCHANGED by that fix, because Kunal's Z-06 condition is that fixing
  // 320 must not move the larger screens.
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'pzhdr-'+geo,store:{}});
    await b.open();
    await Z.states['train'](b);await b.settle(500);
    const row=await b.page.evaluate(()=>{
      const top=document.querySelector('[data-ct="pz-top"]');const r=top&&top.querySelector('div');
      if(!r)return null;
      return {vw:innerWidth,docScrollW:document.documentElement.scrollWidth,
              kids:[...r.children].map(c=>{const q=c.getBoundingClientRect();
                return {t:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,24),x:Math.round(q.left),w:Math.round(q.width),right:Math.round(q.right*100)/100};})};
    });
    L.say(!!row,geo+': the puzzle header row is on screen',row);
    const past=(row&&row.kids||[]).filter(k=>k.right>row.vw+0.5);
    L.say(past.length===0,geo+': NOTHING in the puzzle header runs off the right edge. This is the spill that cannot be recovered - the row sits inside an ancestor with overflow-x hidden and document.scrollWidth stays at the viewport width, so anything past the edge is gone rather than scrollable.',{past,docScrollW:row&&row.docScrollW});
    if(geo==='kunal730'){
      // Z-06's condition, asserted rather than promised: the 320 fix must not move 375.
      const want=[{w:119,x:4},{w:93,x:148},{w:105,x:266}];
      const got=(row&&row.kids)||[];
      const same=got.length===want.length&&want.every((wv,i)=>Math.abs(got[i].w-wv.w)<1.5&&Math.abs(got[i].x-wv.x)<1.5);
      L.say(same,'kunal730: the header is UNCHANGED at 375 by the 320 fix - Roadmap 119@4, counter 93@148, tier badge 105@266. His Z-06 condition was that fixing the small screen must not move the large one, so it is measured here rather than asserted in a commit message.',got);
    }
    // NOT asserted here, and said out loud so nobody reads its absence as coverage: at 375x730 a board-square box
    // inside the grid measures 49.69 wide ending at 376.39, 1.39px past the viewport, clipped by an ancestor at
    // overflow-x hidden. It reproduces in a clean browser and is NOT this row. See flag
    // puzzle-board-square-1px-375. Scoping this check to the header row keeps the two findings apart.
    await b.shot('pzhdr-'+geo);
    await b.close();
  }
},'REACHABILITY');
