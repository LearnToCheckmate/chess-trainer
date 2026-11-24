'use strict';
// gates/regress/200-review-graph-markers-inside.js - EVERY GRADE MARKER ON THE REVIEW EVAL GRAPH LIES WHOLLY INSIDE THE GRAPH'S OWN BOX.
// #553, batch 14 entry 37, jobs/the-review-graphs-last-ply-marker-is-clipped-to-a-sliver-by-the-svg-edge-2026-11-19, story US-R210, case TC-R300.
//
// WHY: antagonist B on #551 (375x761, Scholar's Mate): the button 'Great, move 4 (White)' for the LAST ply had rect x 366-390 inside an
// overflow:hidden SVG box x 3-372, so 6x16px of a 24x24 button showed and a crop showed no marker; at 844x390 it was cut in half. The
// first and last ply were drawn AT x=0 and x=width, so the svg's own clip took half of whatever sat there - and the last ply is usually
// the decisive one (a mate, a Brilliant).
// THE CAUSE, MEASURED: the graph is drawn width=boardPx wide but laid out in a box that can be narrower (369 for 375 at his phone, 290 for 320
// at 320x568), and an svg with no viewBox clips its drawing instead of shrinking it. THE FIX: EvalGraph (chess.jsx) has a viewBox (so the
// drawing shrinks with its box), spans its plies over [GX, width-GX], GX the 24px hit circle's radius, and keeps the painted shape off the
// top and bottom edges too; the line, area, cursor and the tap-to-ply mapping all use that one x.
// THE GRAPH READ IS OF A PAINTED GRAPH: the Review the summary hides is mounted behind it, so a graph counts only when its centre hit-tests to it.
//
// WHAT IT READS: the bundle under test (CT_APP), Scholar's Mate (1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#) imported and analysed, at his phone
// (kunal761, 375x761), 320x568 and 844x390. For every eval-graph-dot it measures, with getBoundingClientRect, (1) the 24px hit circle
// ([data-ct="eval-graph-hit"]) against the svg's box, horizontally, and (2) the PAINTED SHAPE (the dot's other child) against the svg's box,
// both axes. The box is the svg's own rect, which is what clips: the svg is overflow:hidden by default for an inline svg.
// TC-R300a PRECONDITION the graph is on screen with at least 2 marks, among them the last ply's 'move 4 (White)'. TC-R300b every hit circle
// is inside the box (x). TC-R300c every painted shape is inside the box (x and y). TC-R300d the LAST mark's centre hit-tests to that mark.
// TC-R300e the hit circles are still 24px (a fix that shrinks the drawing to fit would pass b and c and fail gate 144's 24px).
// NOT THE SAME OBJECT TWICE: the box is the svg's rect and the marks' rects are read off their own elements; no number from EvalGraph's code
// is used. The tap is a real mouse click at the mark's centre.
// KNOW ITS LIMIT: headless Chromium and the single-thread engine; the grades on Scholar's Mate may differ run to run, so the gate pins the
// geometry of whatever marks the game has (at least 3) and never one grade. His look on the phone is his.
// CONTROLS are the pairs file's three breaks (gates/pairs/jobs/the-review-graphs-last-ply-marker-...json). CT_G200_SHOT=<stem> saves a shot per geometry.
const L=require('../lib');
const RV=require('../drive/review');
const SCHOLAR='[Event "gate 200"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
const GEOS=[['kunal761','kunal761'],['se','se'],['844x390',{w:844,h:390,safe:'',label:'844x390'}]];
const read=(b)=>b.page.evaluate(()=>{
  const R=(e)=>{const q=e.getBoundingClientRect();return {l:+q.left.toFixed(2),t:+q.top.toFixed(2),r:+q.right.toFixed(2),b:+q.bottom.toFixed(2)};};
  /* PAINTED, not merely mounted: the app keeps several screens mounted at once (rev-summary is fixed, opaque, zIndex 500 over the Review it
     hides), so a graph is read only when a point in its own box hit-tests to that svg or something inside it (CLAUDE.md, the mounted-at-once rule) */
  const vis=(e)=>{const q=e.getBoundingClientRect();if(!(q.width>1&&q.height>1))return false;const sv=e.ownerSVGElement;if(!sv)return false;const k=sv.getBoundingClientRect();
    const x=k.left+k.width/2,y=k.top+k.height/2;if(y<0||y>innerHeight||x<0||x>innerWidth)return false;const h=document.elementFromPoint(x,y);return !!h&&(sv===h||sv.contains(h));};
  const dots=[...document.querySelectorAll('[data-ct="eval-graph-dot"]')].filter(vis);
  const svg=dots.length?dots[0].ownerSVGElement:null;
  const out=svg?[...svg.querySelectorAll('[data-ct="eval-graph-dot"]')].map(g=>{const hit=g.querySelector('[data-ct="eval-graph-hit"]');
    const shape=[...g.children].filter(c=>c!==hit&&c.tagName!=='title');
    let sr=null;for(const c of shape){const q=R(c);sr=sr?{l:Math.min(sr.l,q.l),t:Math.min(sr.t,q.t),r:Math.max(sr.r,q.r),b:Math.max(sr.b,q.b)}:q;}
    return {name:g.getAttribute('aria-label'),hit:hit&&R(hit),shape:sr};}):[];
  return {box:svg&&R(svg),dots:out,vw:innerWidth};});
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const G=tag+' ';
    const b=await L.launch({geo,name:'g200-'+tag,store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await RV.importPgn(b,SCHOLAR,240000);}catch(e){ok=false;L.note('200 import '+String(e).slice(0,120));}
    let r=ok?await read(b):null;
    const gotLast=(x)=>!!x&&x.dots.some(d=>/move 4 \(White\)/.test(d.name||''));
    if(ok){try{await RV.startReview(b);await b.settle(900);r=await read(b);}catch(e){L.note('200 startReview '+String(e).slice(0,100));}}
    if(ok&&!gotLast(r)){try{await b.tapCt('rev-more',700);r=await read(b);}catch(e){L.note('200 more sheet '+String(e).slice(0,100));}}
    const has=!!r&&r.dots.length>=2&&r.dots.some(d=>/move 4 \(White\)/.test(d.name||''));
    L.say(ok&&has,G+'TC-R300a PRECONDITION the Review eval graph is on screen with at least 2 grade marks, among them the last ply ("move 4 (White)")',r&&{n:r.dots.length,names:r.dots.map(d=>d.name),box:r.box});
    if(has){
      const B=r.box,e=0.5;
      const hitBad=r.dots.filter(d=>!d.hit||d.hit.l<B.l-e||d.hit.r>B.r+e).map(d=>d.name+' hit '+JSON.stringify(d.hit)+' vs box '+B.l+'..'+B.r);
      L.say(hitBad.length===0,G+'TC-R300b every mark\'s 24px hit circle lies inside the graph\'s box horizontally ('+r.dots.length+' marks, box x '+B.l+'..'+B.r+'; outside: '+hitBad.length+')',{hitBad});
      const small=r.dots.filter(d=>d.hit&&(d.hit.r-d.hit.l<23.9||d.hit.b-d.hit.t<23.9)).map(d=>d.name+' '+(d.hit.r-d.hit.l).toFixed(1)+'px');
      L.say(small.length===0,G+'TC-R300e the marks keep their 24px hit circle - the graph was made to fit its box by moving the marks in, not by shrinking them (smaller: '+small.length+')',{small});
      const shBad=r.dots.filter(d=>!d.shape||d.shape.l<B.l-e||d.shape.r>B.r+e||d.shape.t<B.t-e||d.shape.b>B.b+e).map(d=>d.name+' shape '+JSON.stringify(d.shape)+' vs box '+JSON.stringify(B));
      L.say(shBad.length===0,G+'TC-R300c every mark\'s painted shape lies wholly inside the graph\'s box, both axes (outside: '+shBad.length+')',{shBad});
      const last=r.dots.find(d=>/move 4 \(White\)/.test(d.name||''));
      const cx=(last.hit.l+last.hit.r)/2,cy=(last.hit.t+last.hit.b)/2;
      const ply=()=>b.page.evaluate(()=>[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')].findIndex(x=>x.style.boxShadow&&x.style.boxShadow!=='none')+1);
      if(process.env.CT_G200_SHOT){await b.page.evaluate((h)=>{const d=document.createElement('div');d.style.cssText='position:fixed;pointer-events:none;z-index:99999;border:2px solid red;left:'+(h.l-3)+'px;top:'+(h.t-3)+'px;width:'+(h.r-h.l+6)+'px;height:'+(h.b-h.t+6)+'px';document.body.appendChild(d);},last.hit);await b.shot(process.env.CT_G200_SHOT+'-'+tag);}
      const hit=await b.page.evaluate(([x,y])=>{const h=document.elementFromPoint(x,y);const g=h&&h.closest&&h.closest('[data-ct="eval-graph-dot"]');return g?g.getAttribute('aria-label'):(h?(h.tagName+'['+(h.getAttribute('data-ct')||'')+'] '+(h.className&&h.className.baseVal!==undefined?'':h.className)+' '+JSON.stringify((()=>{const q=h.getBoundingClientRect();return [q.left,q.top,q.right,q.bottom].map(Math.round);})())):null);},[cx,cy]);
      L.say(/move 4 \(White\)/.test(hit||''),G+'TC-R300d the centre of the last mark hit-tests to that mark ("'+hit+'")',{cx,cy});
    }
    L.say(b.errs.filter(x=>!/RuntimeError: unreachable/.test(x)).length===0,G+'TC-R300 zero app errors',b.errs.slice(0,2));
    await b.close();
  }
},'200-review-graph-markers-inside');
