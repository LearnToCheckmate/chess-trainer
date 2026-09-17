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
// ── NEGATIVE CONTROL FOR THE #406 COLUMN, and it is the shipped release again. ───────────────────────────────
//   NC-B  THE SHIPPED #405 BUNDLE (git cat-file -p 6821aea:app.js, md5 e9eeb7ee95df) against this gate as it
//         now stands.
//         -> 73 pass, 3 FAIL, AND ALL THREE ARE AT `short375` AND NOWHERE ELSE:
//              containment on lesson-demo-end: "♟ Other lines (2)" left 217.2 right 386.4, over 11.4, w 169.2
//              the FIXED pin: the same element, not contained
//              the label rule: board 270.88px wide and the count still present
//         -> `se` (320x568) and `kunal730` (375x730) STAYED GREEN ON THE BROKEN BUNDLE. That is the finding
//            rather than a footnote: those two columns are narrow-and-short and wide-and-tall, and this defect
//            needs wide AND short together, so no number of runs at those two geometries could ever have found
//            it. The suite grew from 51 to 76 assertions here and 25 of them are the new column.
//         -> the external challenger (flag uat-ext-2026-09-16) also caught that this gate's recorded control
//            was run at #401 while the file was last modified at #404, leaving 3 assertions never controlled.
//            NC-B re-runs the control against the current file, so that gap is closed rather than noted.
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

// ── THE BLOCKED PIN IS GONE, BECAUSE THE DEFECT IS FIXED. #404. ──────────────────────────────────────────────
// It used to read: `const BLOCKED={state:'lesson-demo-end',geo:'se',ct:'lesson-lines',over:38.9,tol:0.6}` -
// "Other lines (2)" hanging 38.9px off a 320 screen, excluded from the containment assertion for its state and
// asserted as a KNOWN value instead, because the three available fixes all moved the row at 375 too and
// choosing between them was Kunal's call under his own Z-06 condition. That pin said "a fix cannot land
// silently"; this is the fix, and it is not landing silently.
//
// HE ANSWERED IT on 2026-09-15 02:08 UTC, decision `lesson-lines-320-label`, choice "Other lines" - the COUNT
// DROPS. #404 shipped that as a VIEWPORT-WIDTH threshold and #405 widened it to 360 after measuring the band
// it left open; #406 REPLACED IT ENTIRELY, and the reason is the point of this gate.
//
// SIT run 5: "a geometry list has TWO axes and this project has only ever laddered one." The lesson board is
// fit to HEIGHT and the button row is sized to the BOARD, not to the viewport - so at vp.h=568 the board is
// 270.88px wide at EVERY width from 320 to 390, and the counted label still ran 18.91px off a 360x568 screen,
// 11.41px off 375x568 and 3.91px off 390x568, with documentElement.scrollWidth equal to the viewport and
// nothing able to scroll. A viewport-width threshold cannot reach that however wide it is set, because the
// viewport is not the quantity that decides whether the row fits. The condition is now `boardPx<340`, keyed on
// the fit loop's own output. Decision `width320-gate-red` - "Fix 'Other lines (2)' first, then land the gate" -
// is what makes this the pin's proper end rather than a convenience.
//
// AND THIS GATE NOW SWEEPS THAT CORNER. It ran 'se' (320x568) and 'kunal730' (375x730) only: narrow-and-short,
// wide-and-tall. Both were green throughout, correctly, and neither could see a defect that needs wide AND
// short together. `short375` (375x568) is the third column, and it is where the assertion below goes red on
// the #405 bundle.
//
// So `lesson-lines` is no longer excluded from anything: the general containment assertion for
// se/lesson-demo-end now covers it like every other element, and the two assertions below replace the pin by
// asserting the FIX rather than the defect - the label at 320 carries no count, the label at 375 still does,
// and its width is no longer the 169.19px that was identical at every viewport.
const FIXED={state:'lesson-demo-end',ct:'lesson-lines',wasOver:38.9};

L.run(async()=>{
  const report={};
  for(const geo of ['se','short375','kunal730']){
    const b=await L.launch({geo,name:'width-'+geo,store:{ct_pool:'3'}});
    const rows=[];
    for(const [name,go] of STATES){
      try{
        await go(b);await b.settle(350);
        const res=await overhang(b);const ps=await pageScroll(b);
        // #404: read the lesson-lines label text in the same pass, so the label half of his answer is asserted
        // from the same visit as the geometry half rather than from a second, differently-driven run.
        const lines=name===FIXED.state?await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-lines"]');return e?(e.innerText||'').trim():null;}):undefined;
        // #406: the board width comes from the SAME visit as the label and the geometry, because the whole
        // finding is that these three are not interchangeable and a gate that reads them from different runs
        // cannot tell them apart.
        const bd=name===FIXED.state?await b.board():null;
        rows.push({state:name,off:res.off,ex:res.excused,ps,lines,boardW:bd?Math.round(bd.w*100)/100:null});
        if(res.off.length)await b.shot('width-'+geo+'-'+name+'-overhang');
      }catch(e){rows.push({state:name,err:String(e).slice(0,120)});}
    }
    report[geo]=rows;
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap while walking the states',bad.slice(0,2));
    await b.close();
  }

  for(const geo of ['se','short375','kunal730']){
    const w=L.GEOS[geo].w;
    for(const r of report[geo]){
      if(r.err){L.say(false,geo+' ('+w+' wide): the state "'+r.state+'" could not be reached, so containment there is UNMEASURED rather than green',r.err);continue;}
      const off=r.off;   // #404: nothing is excluded any more - the one exclusion this gate had was `lesson-lines`, and it is fixed
      L.say(off.length===0,geo+' ('+w+' wide): nothing runs off the right edge on "'+r.state+'"',off);
      L.say(r.ps.sw<=r.ps.iw+0.5,geo+' ('+w+' wide): the page does not scroll sideways on "'+r.state+'" (scrollWidth '+r.ps.sw+' vs '+r.ps.iw+')');
    }
  }

  // WHAT REPLACED THE PIN. The defect is gone from the containment sweep above by not being excluded from it any
  // more, which is necessary and not sufficient: "it no longer hangs off" would also be satisfied by the button
  // disappearing, or by the count dropping at EVERY width - and the second of those breaks Kunal's Z-06
  // condition rather than meeting it. So both halves of his answer are asserted, at both widths.
  for(const geo of ['se','short375','kunal730']){
    const fRow=report[geo].find(r=>r.state===FIXED.state);
    const hit=fRow&&!fRow.err&&fRow.off.find(o=>o.ct===FIXED.ct);
    L.say(!!fRow&&!fRow.err&&!hit,
      geo+': "'+FIXED.ct+'" is contained - the #404 fix for the one defect this gate used to pin as BLOCKED at '+FIXED.wasOver+'px off the right edge at 320 (decision lesson-lines-320-label)',
      hit||(fRow&&fRow.err)||'contained');
    // THE LABEL ASSERTION, AND WHY ITS FIRST VERSION COULD NOT SEE #406's DEFECT. It keyed off the GEOMETRY
    // NAME - "at se expect no count, otherwise expect one" - which is a restatement of the geometry list, so it
    // stayed green at both columns while the mechanism underneath it was wrong. It now asserts the RULE the app
    // actually implements: the count is present exactly when the board is wide enough to hold it, measured from
    // the board rather than assumed from the viewport. On the #405 bundle this goes RED at short375, which is
    // what makes it an assertion rather than a description.
    const lab=fRow&&fRow.lines, bw=fRow&&fRow.boardW;
    if(lab!==undefined&&bw){
      const wantCount=bw>=340;
      const hasCount=lab!==null&&/\(\d+\)/.test(lab);
      L.say(hasCount===wantCount,
        geo+' (board '+bw+'px wide): the count is present exactly when the board can hold it - his answer was that the count DROPS on a narrow phone, and the thing that decides is the board width, not the viewport (#406, SIT run 5: a geometry list has two axes)',
        {label:lab, boardW:bw, wantCount, hasCount});
    }
  }

  // THE TRANSFORM EXCLUSION, PINNED TO ITS MECHANISM RATHER THAN TO A COUNT. Every piece on the board is drawn
  // inside scale(1.06), so a board screen excuses a handful of boxes and a screen with no board excuses none.
  //
  // A COUNT WOULD BE THE WEAK VERSION OF THIS, and the first draft of this assertion was exactly that: "at most
  // 8 boxes". It went red at 10 - four h-file pieces, each a wrapper div and an img - which told me nothing
  // except that my guess was low, and a cap loose enough to pass would have been loose enough to hide a real
  // defect appearing beside the pieces. So the assertion is on WHAT is excused instead: every excused box must
  // be a piece-sized box whose layout reference is the board square it sits in. Anything else - a button, a
  // label, a box of the wrong size - fails here even if the count never moves.
  for(const geo of ['se','short375','kunal730']){
    const w=L.GEOS[geo].w;
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
