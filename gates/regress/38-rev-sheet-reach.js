// regress/38-rev-sheet-reach.js  TC-RL-070: every row of the review ⋯ sheet must be reachable AND tappable.
//
// WHY THIS GATE EXISTS, AND WHAT IT FOUND. The test-lane queue carried this as a defect: "the ⋯ sheet's content is
// below the fold at 5 of 6 geometries", with last-row bottoms of 847/833/842/848/863/909 against viewports of
// 568/679/730/761/844/932. Measured here, it is NOT a defect. The sheet is `maxHeight:82vh; overflowY:auto`, pinned
// to the bottom of a fixed overlay, so the rows below the fold are the ones you scroll the sheet to reach. Those
// numbers are the last row's bottom BEFORE the sheet is scrolled, which is a reading of where a row happens to sit,
// not a measurement of whether it can be reached - the same mistake that made gate 35's first version pass over an
// `overflow:hidden` ancestor and the same class CLAUDE.md names when it says a bad selector is a reading.
// Measured on #380, sheet scrolled to its end:  320x568 last row bottom 545 (vh 568) · 375x679 656 (679) ·
// 375x730 707 (730) · 390x844 821 (844) · 430x932 909 (932, and it needs no scroll at all - maxScroll is 0).
//
// So the gate is kept and the claim is inverted: this is the guard that the reachability the app currently HAS is
// not lost. Take away the maxHeight or the overflowY and the rows really would go off the bottom with no way back,
// and nothing else in the suite would notice.
//
// WHAT IT PROVES, at five geometries from 320x568 to 430x932:
//   1. The sheet is inside the viewport: bottom pinned to the viewport bottom, top at or below 0.
//   2. It is a real scroll container - computed overflowY scrolls, and its maxHeight is under the viewport height -
//      so ANY amount of content is reachable, not just this fixture's.
//   3. Scrolled to its end, the LAST row's box is fully on screen. Asserted on the last BUTTON, never the
//      container: a container that is 82vh tall is on screen by construction and proves nothing about its rows.
//   4. EVERY row can be brought fully on screen, one at a time, by scrolling the sheet - measured per row.
//   5. Each row is then genuinely TAPPABLE where it sits: elementFromPoint at its centre lands on that button.
//      On screen and under the finger are two different claims and the overlay above the sheet is why.
//
// NEGATIVE CONTROL: proved RED against a bundle built with `maxHeight:'82vh',overflowY:'auto'` deleted from the
// rev-sheet panel. See claude/agents/REGRESSION-LOG.md.
'use strict';
const L=require('../lib');

const PGN='[White "Morphy"] [Black "Duke"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 *';

const sheet=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="rev-sheet"]');
  if(!s)return null;
  const r=s.getBoundingClientRect(),st=getComputedStyle(s);
  return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),
          scrollH:s.scrollHeight,clientH:s.clientHeight,maxScroll:s.scrollHeight-s.clientHeight,
          overflowY:st.overflowY,maxHeight:st.maxHeight,vh:innerHeight};
});

// Walk every painted row. For each: scroll the SHEET (not the page) until the row is centred, then measure the row
// where it now sits and ask the document what is under its centre point.
const rows=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="rev-sheet"]');
  if(!s)return [];
  const btns=[...s.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;});
  const out=[];
  for(const el of btns){
    const want=el.offsetTop-(s.clientHeight-el.offsetHeight)/2;
    s.scrollTop=Math.max(0,Math.min(s.scrollHeight-s.clientHeight,want));
    const r=el.getBoundingClientRect();
    const hit=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    out.push({label:(el.innerText||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,34),
              top:Math.round(r.top),bottom:Math.round(r.bottom),
              onScreen:r.top>=-0.5&&r.bottom<=innerHeight+0.5,
              tappable:!!hit&&(hit===el||el.contains(hit))});
  }
  return out;
});
const toEnd=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="rev-sheet"]');if(!s)return null;
  s.scrollTop=s.scrollHeight;
  const btns=[...s.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;});
  const el=btns[btns.length-1];if(!el)return null;
  const r=el.getBoundingClientRect();
  return {label:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,34),top:Math.round(r.top),bottom:Math.round(r.bottom),vh:innerHeight,scrollTop:Math.round(s.scrollTop)};
});

L.run(async()=>{
  for(const geo of ['se','kunal','kunal730','390','430']){
    L.note('--- '+geo);
    const b=await L.launch({geo,name:'revsheet-'+geo,store:{ct_pool:'3',ct_revmig339:'1',ct_revCompact:'1'}});
    await b.open();
    await b.tile('Review');
    await b.page.locator('textarea').first().fill(PGN);
    await b.tapText(/^⚡ Analyze Game$/,{wait:300});
    await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
    await b.settle(500);
    await b.tapText(/^Start review/,{wait:900}).catch(()=>{});
    await b.settle(600);
    await b.tapCt('rev-more',800);
    await b.settle(400);

    const s=await sheet(b);
    L.say(!!s,geo+': the ⋯ sheet opened',s);
    L.say(!!s&&s.bottom<=s.vh+0.6&&s.top>=-0.6,geo+': the sheet itself is inside the viewport (top '+(s&&s.top)+', bottom '+(s&&s.bottom)+', vh '+(s&&s.vh)+')',s);
    L.say(!!s&&/auto|scroll/.test(s.overflowY),geo+': the sheet is a scroll container, which is what makes content taller than the screen reachable AT ALL - this is the property the queue item mistook for a defect',s&&s.overflowY);
    L.say(!!s&&parseFloat(s.maxHeight)<s.vh,geo+': its maxHeight ('+(s&&s.maxHeight)+') is under the viewport ('+(s&&s.vh)+'), so it can never grow past the screen however many rows it gains',s&&s.maxHeight);

    const last=await toEnd(b);
    L.say(!!last&&last.bottom<=last.vh+0.5&&last.top>=-0.5,
          geo+': scrolled to its end, the LAST ROW ("'+(last&&last.label)+'") is fully on screen - bottom '+(last&&last.bottom)+' vs vh '+(last&&last.vh)+'. Asserted on the last BUTTON, not the container (TC-RL-070).',last);

    const rr=await rows(b);
    L.say(rr.length>=8,geo+': the sheet has '+rr.length+' painted rows, so "every row" is a real claim',rr.map(x=>x.label));
    const offs=rr.filter(x=>!x.onScreen);
    L.say(offs.length===0,geo+': EVERY row can be brought fully on screen by scrolling the sheet',offs.slice(0,3));
    const untap=rr.filter(x=>!x.tappable);
    L.say(untap.length===0,geo+': and every row is genuinely under the finger where it sits - elementFromPoint at its centre lands on the row itself, not on the overlay above it',untap.slice(0,3));

    await b.shot('revsheet-'+geo);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }
},'REV-SHEET-REACH');
