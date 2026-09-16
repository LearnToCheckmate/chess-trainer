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
// ── NEGATIVE CONTROL, run 2026-09-16 at #401. ────────────────────────────────────────────────────────────────
// This gate had NONE until tonight, and it is one of only two in the suite that genuinely did not - the audit
// that said seven gates were uncontrolled was wrong about five of them (45-play-setup records eight controls in
// its own header, 46-play four, and 41/22/23 have theirs in RUN-LOG rows). See flag
// gates-without-a-negative-control update6. A green that has never been disproved is worth nothing, and this is
// the gate Kunal's Z-06 condition rests on, so it should not have been the last to get one.
//
//   NC-A  chess.jsx:1462  _CBtn  flex:1 -> flex:1,minWidth:90
//         Five control buttons at a 90px floor force a 450px row into a 375 and a 320 viewport. Trial bundle
//         md5 09646906bf03, built with CT_OUT; chess.jsx restored and md5-verified to 688815d19019 after.
//         -> 7 FAIL. "nothing runs off the right edge" goes red on play-setup, play-live and play-gameover at
//            BOTH 320 and 375 - the More button measured left 504, right 594, over 274 at 320x568 and over 195
//            at 375x730 - plus the Z-06 assertion that his own phone stays clean while 320 is supported.
//         -> AND WHAT STAYED GREEN IS THE HALF THAT MATTERS: lesson-demo-end, lesson-practice, puzzles and
//            review-paste are untouched by this break and all stayed green, the page-scrollWidth assertions
//            stayed green (the row spills without making the document scroll, which is exactly the
//            unrecoverable case this gate exists for), the transform-exclusion assertions stayed green, and the
//            PINNED lesson-lines 38.9 defect stayed green rather than being disturbed. So the gate fires on the
//            states that contain the broken element and on no others.
//
// STILL UNCONTROLLED AFTER TONIGHT: gates/regress/43-tcrl-analysis.js (32 assertions) is now the only gate in
// the suite with no recorded control in its header and none in any RUN-LOG row. Named here rather than left for
// another audit to rediscover.

'use strict';
const L=require('../lib');

// Every visible element whose right edge is past the viewport and which no scrollable ancestor can reach.
// Scoped to painted elements: zero-area boxes, hidden nodes and the head are all excluded, because a bad
// selector produced two false P0s in one day and "it is off the edge" is a claim about PAINT.
//
// A TRANSFORM IS NOT LAYOUT SPILL, AND THIS GATE'S FIRST VERSION DID NOT KNOW THAT. It reported a 49.69px box
// overhanging 1.4px at 375 on four separate states, and flag puzzle-board-square-1px-375 was filed against it
// as a real defect. It is not one. Every piece on the board is drawn inside `transform:scale(1.06)`
// (chess.jsx, three places: the board square, the preview and the move animation), and 46.875 x 1.06 is
// 49.6875 - the measured number to the fourth decimal. getBoundingClientRect() includes transforms, so the
// gate was reading a deliberate 6% visual scale as a layout failure. The board grid clips at 374.98, INSIDE
// the 375 viewport, so not one pixel of it ever reached the screen edge.
//
// Clip-intersection alone cannot separate the two cases, and it is worth writing down why, because it is the
// obvious fix and it is wrong: the board grid clips at 374.98 and the lesson column clips at exactly 320, so
// BOTH overhangs are cut off at what is effectively the viewport edge. Intersecting with the clip rect
// excuses the real defect just as readily as the false one.
//
// What actually separates them is that one is a transform and the other is layout. So: an element is excused
// only when its nearest UNTRANSFORMED ancestor is itself within the viewport - meaning the layout fits and
// only a painted effect hangs over. A transformed thing inside a container that genuinely overhangs still
// fails, because the container is measured on its own account. Every exclusion is counted and asserted
// below rather than dropped silently, because absence is the hardest thing to measure.
const overhang=(b)=>b.page.evaluate(()=>{
  const W=window.innerWidth,out=[],excused=[];
  // STOP AT THE FIRST CLIPPING ANCESTOR. The first version of this walk kept climbing past an overflow:hidden
  // ancestor looking for a scroller further up, and so excused the very defect this gate was written to catch:
  // "Other lines (2)" sits inside a hidden container with a scroller above it, and was reported as reachable.
  // It is not reachable - hidden means the overhang is simply gone. Only a scroller met BEFORE any hidden
  // ancestor makes content reachable, and only if it can ACTUALLY scroll: the lesson column carries
  // overflow-x:auto with scrollWidth equal to clientWidth, which scrolls nowhere.
  const reachable=(el)=>{
    for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
      const ox=getComputedStyle(p).overflowX;
      if(ox==='visible')continue;
      if(ox==='auto'||ox==='scroll')return p.scrollWidth>p.clientWidth+0.5;   // a scroller that cannot scroll is a clip
      return false;                                                          // hidden/clip eats it
    }
    return false;
  };
  // The box that LAYOUT put where it is, for an element a transform has moved or scaled. Walk from the element
  // up to the first clipping ancestor; if anything in that span carries a transform, the honest reference is
  // the first box ABOVE the outermost transformed one, because everything below it was placed by paint.
  //
  // Asking "does this element have a transform" is not enough, and getting that wrong is what made the first
  // run of this version still report the piece IMAGES. The img sits inside the scaled div and has
  // transform:none itself, so a walk that stops at the first untransformed element stops on the img and
  // excuses nothing. The scale is on its parent.
  const layoutRef=(el)=>{
    let outermost=null;
    for(let p=el;p&&p!==document.documentElement;p=p.parentElement){
      if(getComputedStyle(p).transform!=='none')outermost=p;
      const ox=getComputedStyle(p).overflowX;
      if(p!==el&&ox!=='visible')break;          // the clip bounds the span: past it is a different question
    }
    return outermost?outermost.parentElement:null;
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
    const u=layoutRef(el);
    if(u&&u.getBoundingClientRect().right<=W+0.5){
      excused.push({tag:tag.toLowerCase(),w:Math.round(r.width*100)/100,ref:Math.round(u.getBoundingClientRect().width*100)/100});
      continue;
    }
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
  return {off:out.slice(0,8),excused};
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

// THE ONE DEFECT THAT IS NOT MINE TO FIX, PINNED RATHER THAN HIDDEN. "Other lines (2)" at 320 is blocked on
// Kunal - flag width320-gate-red-needs-kunal puts three options to him and none of them can be chosen here,
// because the row is a grid of '1.8fr 1fr' whose second track is blown out by the button's min-content width,
// and every available fix also moves the row at 375 where it is already flush to the screen edge. Z-06's
// condition ("i want to make sure it doesn't impact the display on the larger screens") is exactly what he
// has to weigh, so he weighs it.
//
// Leaving the gate RED on it would keep the whole suite red and block every future build, and deleting the
// assertion would lose the defect. So it is pinned instead: the exact overhang is asserted as a KNOWN value.
// If it is fixed, this goes red and must be updated - a fix cannot land silently. If it gets WORSE, this goes
// red too. It is the one element excluded from the containment assertion for its state, named by data-ct so
// the exclusion cannot widen to cover a second defect that appears next to it.
const BLOCKED={state:'lesson-demo-end',geo:'se',ct:'lesson-lines',over:38.9,tol:0.6};

L.run(async()=>{
  const report={};
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'width-'+geo,store:{ct_pool:'3'}});
    const rows=[];
    for(const [name,go] of STATES){
      try{
        await go(b);await b.settle(350);
        const res=await overhang(b);const ps=await pageScroll(b);
        rows.push({state:name,off:res.off,ex:res.excused,ps});
        if(res.off.length)await b.shot('width-'+geo+'-'+name+'-overhang');
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
      const isBlocked=(o)=>geo===BLOCKED.geo&&r.state===BLOCKED.state&&o.ct===BLOCKED.ct;
      const off=r.off.filter(o=>!isBlocked(o));
      L.say(off.length===0,geo+' ('+w+' wide): nothing runs off the right edge on "'+r.state+'"',off);
      L.say(r.ps.sw<=r.ps.iw+0.5,geo+' ('+w+' wide): the page does not scroll sideways on "'+r.state+'" (scrollWidth '+r.ps.sw+' vs '+r.ps.iw+')');
    }
  }

  // The pinned known defect, asserted on its own so it is visible in the log every run rather than implied by
  // a filter nobody reads.
  const bRow=report[BLOCKED.geo].find(r=>r.state===BLOCKED.state);
  const bHit=bRow&&!bRow.err&&bRow.off.find(o=>o.ct===BLOCKED.ct);
  L.say(!!bHit&&Math.abs(bHit.over-BLOCKED.over)<BLOCKED.tol,
    'the one blocked defect is EXACTLY where it was left: "'+BLOCKED.ct+'" still hangs '+BLOCKED.over+'px off the right edge at 320 on "'+BLOCKED.state+'". It is blocked on Kunal (flag width320-gate-red-needs-kunal, three options, none of them mine to pick). If this line is red the defect MOVED - either it was fixed, and this pin comes out, or it got worse.',
    bHit||'no overhang found on '+BLOCKED.ct+' at all');

  // THE TRANSFORM EXCLUSION, PINNED TO ITS MECHANISM RATHER THAN TO A COUNT. Every piece on the board is drawn
  // inside scale(1.06), so a board screen excuses a handful of boxes and a screen with no board excuses none.
  //
  // A COUNT WOULD BE THE WEAK VERSION OF THIS, and the first draft of this assertion was exactly that: "at most
  // 8 boxes". It went red at 10 - four h-file pieces, each a wrapper div and an img - which told me nothing
  // except that my guess was low, and a cap loose enough to pass would have been loose enough to hide a real
  // defect appearing beside the pieces. So the assertion is on WHAT is excused instead: every excused box must
  // be a piece-sized box whose layout reference is the board square it sits in. Anything else - a button, a
  // label, a box of the wrong size - fails here even if the count never moves.
  for(const geo of ['se','kunal730']){
    const w=geo==='se'?320:375;
    const all=[];for(const r of report[geo]){if(!r.err)for(const e of (r.ex||[]))all.push({state:r.state,...e});}
    const withBoard=[...new Set(all.map(e=>e.state))];
    // the scaled box is the square x 1.06, so the ratio is the mechanism and it holds at any board width
    const wrong=all.filter(e=>!(e.tag==='div'||e.tag==='img')||!(e.ref>0&&Math.abs(e.w/e.ref-1.06)<0.02));
    L.say(wrong.length===0,geo+' ('+w+' wide): every box the transform rule excused is a piece - a div or img exactly 1.06x the square it sits in, which is the scale(1.06) in chess.jsx and nothing else. '+all.length+' excused across '+(withBoard.join(', ')||'nowhere')+'.',wrong.slice(0,4));
    L.say(all.every(e=>/^(play-live|play-gameover|lesson-demo-end|lesson-practice|puzzles|review-paste)$/.test(e.state)),geo+' ('+w+' wide): the exclusion only ever fires on a screen that paints a board, never on home, the menu or a picker',withBoard);
  }

  // his condition, stated as an assertion rather than left to a reader: 375 must be clean too, not merely
  // "no worse". If this gate is ever green at 320 and red at 375, the 320 fix cost him the large screen.
  const wide=report['kunal730'].filter(r=>!r.err&&r.off.length);
  L.say(wide.length===0,'375x730, his own phone, is clean at the same time as 320 - his condition on Z-06 was that supporting the small screen must not cost anything on the large one',wide.map(r=>r.state+': '+JSON.stringify(r.off.slice(0,2))));
},'WIDTH-CONTAINMENT');
