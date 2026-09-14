// regress/35-width-containment.js  NOTHING MAY RUN OFF THE RIGHT EDGE, AT ANY WIDTH THE APP CLAIMS TO SUPPORT.
//
// Kunal, 2026-09-13, twice. First as a question - "are you just trying to fix this for my phone. Because it
// needs to be playable on any standard phone" (flag phone-width-matrix) - and then as a decision on Z-06:
// "Support 320 properly, fix all three", with the condition "i want to make sure it doesn't impact the display
// on the larger screens that we've so painstakingly tried to improve... Doesn't make sense to say you can only
// use our app on larger screen displays."
//
// WHY A WHOLE GATE RATHER THAN THREE FIXES. The build gates run at 375x730 and the headless UAT ran 375x679 and
// 375x812: two heights at ONE width. Width had never been swept on a schedule, and the app has been caught
// baking 375 in. Flag sweep372-other-lines-320: the "Other lines (2)" button is laid out against a hardcoded
// 375, so it ends at x=375 at EVERY viewport - fitting to the pixel at 375 and hanging 55px off the right at
// 320, with document.scrollWidth equal to the viewport so the cut-off part cannot even be scrolled to. The
// gallery card covering that button stayed GREEN the whole time, because it asserts a POSITION ("Other lines
// where Flip was") rather than a WIDTH. A position assertion against a 375 viewport cannot tell a fitted layout
// from a hardcoded one. This gate asserts CONTAINMENT instead, which is the property that actually matters, and
// it catches the whole class rather than one instance.
//
// WHAT COUNTS AS A FAILURE. An element is off the edge when its right edge exceeds the viewport AND nothing
// between it and the root can scroll horizontally to reach it. Content inside a deliberate horizontal scroller
// (the bot row) is reachable and is not a defect, so an ancestor with overflow-x auto or scroll excuses it; an
// ancestor with overflow hidden does NOT, because that content is simply gone. Page-level horizontal scroll is
// a separate failure and is asserted on its own: a phone layout should never scroll sideways.
//
// Measured at 320x568, the floor, AND at 375x730, his own phone, in the same run - because his condition is
// that fixing the small screen must not cost anything on the large one, and a before-and-after at one width
// cannot show that. The 375 numbers are recorded next to the 320 ones for exactly that comparison.
'use strict';
const L=require('../lib');

// Every visible element whose right edge is past the viewport and which no scrollable ancestor can reach.
// Scoped to painted elements: zero-area boxes, hidden nodes and the head are all excluded, because a bad
// selector produced two false P0s in one day and "it is off the edge" is a claim about PAINT.
const overhang=(b)=>b.page.evaluate(()=>{
  const W=window.innerWidth,out=[];
  // STOP AT THE FIRST CLIPPING ANCESTOR. The first version of this walk kept climbing past an overflow:hidden
  // ancestor looking for a scroller further up, and so excused the very defect this gate was written to catch:
  // "Other lines (2)" sits inside a hidden container with a scroller above it, and was reported as reachable.
  // It is not reachable - hidden means the overhang is simply gone. Only a scroller met BEFORE any hidden
  // ancestor makes content reachable.
  const reachable=(el)=>{
    for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
      const ox=getComputedStyle(p).overflowX;
      if(ox==='visible')continue;
      return ox==='auto'||ox==='scroll';              // first clip decides: scroller reaches it, hidden eats it
    }
    return false;
  };
  for(const el of document.body.querySelectorAll('*')){
    const tag=el.tagName;
    if(tag==='STYLE'||tag==='SCRIPT'||tag==='DEFS'||tag==='LINK'||tag==='META')continue;
    // SKIP THE INSIDE OF AN SVG, MEASURE THE SVG ITSELF. A path or ellipse drawn outside its own viewBox is
    // clipped by the svg element by design - that is how scenery is drawn - and reporting it is a false
    // positive. The giveaway in the first run of this gate: the same shapes reported identical absolute
    // coordinates (left 474.3) at 320 AND at 375, which is a fixed user-space coordinate, not a layout that
    // failed to fit. What matters for containment is where the <svg> BOX sits, and that is still measured.
    if(el.ownerSVGElement)continue;
    const st=getComputedStyle(el);
    if(st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity||'1')===0)continue;
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1)continue;
    if(r.bottom<=0||r.top>=window.innerHeight)continue;   // off-screen vertically: not this gate's business
    if(r.right<=W+0.5)continue;
    if(reachable(el))continue;
    out.push({
      ct:el.getAttribute('data-ct')||null,
      tag:tag.toLowerCase(),
      text:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),
      left:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,
      over:Math.round((r.right-W)*10)/10,w:Math.round(r.width*10)/10,
    });
  }
  // the outermost offender per overhang is the useful one; children repeat their parent's overflow
  out.sort((a,b)=>b.over-a.over);
  return out.slice(0,8);
});
const pageScroll=(b)=>b.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));

// The screens and states to visit. Each returns having LANDED on the state; the walker measures after.
const STATES=[
  ['home',            async(b)=>{await b.open();}],
  ['play-setup',      async(b)=>{await b.home();await b.tile('Play');await b.settle(500);}],
  ['play-live',       async(b)=>{await b.home();await b.card('k8',6500);}],
  ['play-gameover',   async(b)=>{await b.home();await b.card('k10',6500);}],
  ['puzzles',         async(b)=>{await b.home();await b.tile('Puzzles');await b.settle(800);}],
  ['review-paste',    async(b)=>{await b.home();await b.tile('Review');await b.settle(600);}],
  ['menu',            async(b)=>{await b.home();await b.tapText(/^☰$/,{wait:700}).catch(()=>{});}],
  // The lesson states are reached by GALLERY CARD, not by a tile: card 3 is the King's Gambit demo AT ITS END,
  // which is the state that holds "Other lines (2)" - the button flag sweep372-other-lines-320 measured at 55px
  // off the right edge at 320. Card 4 is practice, where Z-06's 239px board lives. Reaching them by tile failed
  // outright on the first run of this gate, and an unreached state is recorded as UNMEASURED below rather than
  // counted as green, which is the only reason that failure was visible at all.
  ['lesson-demo-end', async(b)=>{await b.open();await b.card(3,2500);}],
  ['lesson-practice', async(b)=>{await b.open();await b.card(4,2500);}],
  ['look-picker',     async(b)=>{await b.home();await b.tapCt('home-look',700);}],
];

L.run(async()=>{
  const report={};
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'width-'+geo,store:{ct_pool:'3'}});
    const rows=[];
    for(const [name,go] of STATES){
      try{
        await go(b);await b.settle(350);
        const off=await overhang(b);const ps=await pageScroll(b);
        rows.push({state:name,off,ps});
        if(off.length)await b.shot('width-'+geo+'-'+name+'-overhang');
      }catch(e){rows.push({state:name,err:String(e).slice(0,120)});}
    }
    report[geo]=rows;
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap while walking the states',bad.slice(0,2));
    await b.close();
  }

  for(const geo of ['se','kunal730']){
    const w=geo==='se'?320:375;
    for(const r of report[geo]){
      if(r.err){L.say(false,geo+' ('+w+' wide): the state "'+r.state+'" could not be reached, so containment there is UNMEASURED rather than green',r.err);continue;}
      L.say(r.off.length===0,geo+' ('+w+' wide): nothing runs off the right edge on "'+r.state+'"',r.off);
      L.say(r.ps.sw<=r.ps.iw+0.5,geo+' ('+w+' wide): the page does not scroll sideways on "'+r.state+'" (scrollWidth '+r.ps.sw+' vs '+r.ps.iw+')');
    }
  }
  // his condition, stated as an assertion rather than left to a reader: 375 must be clean too, not merely
  // "no worse". If this gate is ever green at 320 and red at 375, the 320 fix cost him the large screen.
  const wide=report['kunal730'].filter(r=>!r.err&&r.off.length);
  L.say(wide.length===0,'375x730, his own phone, is clean at the same time as 320 - his condition on Z-06 was that supporting the small screen must not cost anything on the large one',wide.map(r=>r.state+': '+JSON.stringify(r.off.slice(0,2))));
},'WIDTH-CONTAINMENT');
