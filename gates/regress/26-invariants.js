// regress/26-invariants.js   THE INVARIANT GATE - INVARIANT 4: NO TEXT IS CUT BY ITS OWN CLIPPING ANCESTOR.
//
// Kunal commissioned the invariant gate on 2026-09-15 (~03:20 UTC), decision `invariant-gate`, choice
// "Yes - all four invariants", after asking a question worth repeating: when a session reported that Review's
// icon sizes are inconsistent he asked whether a test had found it. None had, and none could. Flag
// `build-the-invariant-gate`: the suite pins a VALUE on ONE element 1369 times and compares two elements to
// each other zero times, so a PROPERTY that ought to hold everywhere has no home in it.
//
// THIS FILE IS THE HOME FOR ALL FOUR AND TODAY IT IMPLEMENTS ONE. Stated plainly so nobody reads the filename
// as coverage it does not have:
//   1. TAP TARGETS (every visible interactive element >= 44x44 at every width)     NOT YET IMPLEMENTED
//   2. ONE ICON SIZE PER ROW (glyph heights equal within 1px in a control row)     NOT YET IMPLEMENTED
//   3. A SHORT LIST OF ICON SIZES (report today's count first, then assert it)     NOT YET IMPLEMENTED
//   4. INK INSIDE ITS OWN CLIPPING BOX                                             THIS FILE, BELOW
// 1-3 are the #403-#404 backlog and each needs its known-failure list pinned before it can go green; 4 is here
// first because its class is LIVE and was filed three times by three sessions while the other three were not.
//
// NUMBERED 26 AND NOT 47. Flag `class-ink-clipped-by-own-ancestor-2026-09-15` and `build-the-invariant-gate`
// both name `gates/regress/47-invariants.js`; both were written on 2026-09-15 and 47 was taken by `47-menu.js`
// at #399 the following night (claude/stories/README.md records the three-way 47 collision and its resolution).
// 26 is free, and 10-29 is the BUILD LANE range the register reserves - which is where an invariant gate the
// build session owns belongs anyway.
//
// ── WHY THIS ASSERTION EXISTS, AND WHY 1369 ASSERTIONS CANNOT SEE WHAT IT SEES ────────────────────────────────
// THE CLASS: text clipped by its own container, well inside the viewport, with no ellipsis and no clamp - so
// the screen shows a decapitated word or a sliced number and says nothing about it. It has been closed FOUR
// times, each time by pinning the INSTANCE:
//     #382 ac3084e  uat378-puzzle-header-clipped-320
//     #387 6e19f7e  uat385-coach-say-truncated-320
//     #395 e48d2a8  uat395-lesson-name-eaten-320
//     #397 0f4b728  uat394-rev-why-clips-fourth-line-320
// and it was live again this morning in two more places, 26 hours and five builds after being filed.
//
// EVERY CONTAINMENT GATE IN THIS SUITE MEASURES AGAINST THE VIEWPORT. `35-width-containment.js` walks the very
// same Review screen at 320x568 and is GREEN with both live instances on it, and it is RIGHT to be: its own
// header defines off-the-edge as "its right edge exceeds the viewport AND nothing between it and the root can
// scroll horizontally to reach it". Both of these boxes are clipped by their own PARENT hundreds of pixels
// inside the viewport. The assertion pins the wrong frame - the same shape as the gallery card that stayed
// green while a button hung 38.9px off a 320 screen, because it asserted a POSITION rather than a WIDTH.
//
// ── THE FOUR TRAPS THIS FILE IS BUILT AROUND, EVERY ONE OF WHICH HAS ALREADY COST A BUILD HERE ────────────────
//
// (a) GEOMETRY IS NOT PAINT. #398's own close-out: "THE ENGINE LINE WAS CLIPPED AS GEOMETRY AND NEVER AS PAINT".
//     `rev-engline` ran to 634 inside a parent ending at 632 at every ply and removed NO painted pixel: the row
//     is alignItems:'baseline', the line box sits at the cross-start, and the clipped band was empty in every
//     state. A rect-overflow assertion would have filed that as a defect for three builds - which is exactly
//     what happened. SO THIS GATE MEASURES INK: Range.selectNodeContents(textNode).getClientRects(), the method
//     `gates/regress/11-lesson.js` already uses, so every number here is comparable with the ones already in
//     the flags. A box that overflows its parent while painting nothing into the cut band is NOT a finding here.
//
// (b) A TRANSFORM IS PAINT, NOT LAYOUT, AND getBoundingClientRect INCLUDES IT. Every piece on the board is drawn
//     inside transform:scale(1.06); 46.875 x 1.06 = 49.6875, and that box was filed as a real defect
//     (`puzzle-board-square-1px-375`) before anyone read the source. Range rects include transforms too, so ink
//     and box are in the SAME space and a shared transform cancels - but the clipping ancestor's own content box
//     must not be built from unscaled layout numbers. `clientLeft`/`clientWidth` are LAYOUT px while its rect is
//     PAINT px, so they are scaled by rect.width/offsetWidth before use. A non-axis-aligned matrix (rotation or
//     skew) makes that arithmetic wrong rather than approximate, so such an ancestor is SKIPPED AND COUNTED, and
//     the count is asserted to be zero so a future rotation cannot silently shrink this gate's reach.
//
// (c) "BELOW THE FOLD" IS NOT "UNREACHABLE", AND THE SAME IS TRUE SIDEWAYS. An ancestor with overflow auto or
//     scroll can be scrolled by a finger, so its content is reachable and is NOT cut - `[data-ct="strip-row"]`'s
//     off-screen move tokens are correct behaviour, and this gate excuses them BY MECHANISM rather than by name:
//     the walk stops at the first ancestor that clips OR scrolls on that axis, and only `hidden`/`clip` counts.
//     Pinning it to the mechanism is deliberate: a selector-named exclusion excuses whatever later moves inside
//     it, which is how "the covering element is big" hid the defect it was written for at #393.
//
// (d) IS THE THING I AM TRYING TO DETECT ABSORBED BY THE MECHANISM I AM ASSERTING OVER? (#398's fourth costume.)
//     Here: no. The assertion is per TEXT NODE against the box that clips THAT node, so a sibling absorbing the
//     squeeze cannot excuse it - a squeezed sibling simply cuts its own ink and is reported on its own row. The
//     failure count is over text nodes, not over containers, which is why the control below reads 2 and not 1.
//
// ── NEGATIVE CONTROL. Recorded here, beside the assertions it proves, per #401's rule. ────────────────────────
// See the CONTROL block at the foot of this header - it is filled in from the run, not from an estimate.
//
// WHAT THIS GATE DOES NOT COVER, said out loud because absence is the hardest thing to measure: it sweeps the
// states listed in SCREENS below at two geometries (320x568 and 375x730). Landscape is not swept
// (`uat397-rev-why-clips-landscape` is a separate open flag). 375x679, 375x761, 390x844 and 430x932 are not
// swept by this gate - 35-width-containment carries the width matrix. Text inside <canvas> or an <img> alt is
// not text to a Range and is invisible here. A box that clips an IMAGE rather than text is not covered.
//
// ── NEGATIVE CONTROLS, both run at #404. A green that has never been disproved is worth nothing. ─────────────
//
//   NC-A  THE SHIPPED RELEASE ITSELF, which is the strongest form of control available here and needs no trial
//         bundle at all: `git cat-file -p 3b7a4c2:app.js`, md5 4e59a9f4a4ed, stamp '#400 - 2026-09-15 16:56 ET'.
//         -> 61 pass, 3 FAIL, and the three are exactly the three screens that carry the three defects #404
//            fixed, all at 320x568, measured to the hundredth of a pixel:
//              se lesson-demo      "♟ Other lines (" 6.17px, "3" 16.22px, ")" 22.92px  (clipper: the 320-wide
//                                  root box, client 320 scroll 359)
//              se rev-last-engine  "10" 15px in [pbar-taken-b], client 116 scroll 131, ink 248.91..267 vs box
//                                  136..252 - the same number standing checks B and the recurrence job each
//                                  measured independently, 26 hours apart
//              se rev-why-open     "why" 8.37px in [rev-playout], client 47 scroll 66
//         -> AND WHAT STAYED GREEN IS THE HALF THAT MATTERS: home, play-captures, play-gameover, puzzles,
//            rev-summary, rev-ply31 and rev-more-sheet at 320, and ALL TEN SCREENS at 375x730, plus every
//            excuse assertion on every screen. So the gate fires on the states that contain the defects and on
//            no others - it is not simply red everywhere at 320.
//         The same run on the #404 bundle: 64 pass, 0 fail.
//
//   NC-B  chess.jsx:6191, the player-bar name span: textOverflow:'ellipsis' REMOVED, nothing else changed.
//         Trial bundle md5 ecefca169ff0 built with CT_OUT; chess.jsx restored and md5-verified afterwards.
//         WHY THIS ONE AND NOT A SECOND 320 BREAK: every NC-A failure is at 320, so the 375x730 half of this
//         gate was GREEN AND UNDISPROVED - silence, not evidence. This break makes a real cut appear at
//         375x730, and it breaks precisely the mechanism the E1 excuse rests on: 'DukeKarlCountIsouard99'
//         overflows its own span by 30.2px at 375 and 115.23px at 320, and with the ellipsis gone that stops
//         being a SIGNALLED row and becomes a plain CUT.
//         -> 56 pass, 8 FAIL: 4 red at 320x568 ('DukeKarlCountIsouard99' cut 115.23px, client 82 scroll 198)
//            AND 4 RED AT 375x730 (cut 30.2px, ink 120.98..318.52 vs box 120.98..288.31, client 167 scroll 198),
//            on exactly the four screens that show a long imported player name: rev-summary is not among them
//            because its header row is a different element. THE 375 HALF OF THIS GATE IS THEREFORE EVIDENCE AND
//            NOT SILENCE, which is what NC-A on its own could not establish.
//         -> and the excuse assertions stayed green throughout: with the ellipsis gone the row is correctly
//            reclassified from SIGNALLED to CUT rather than being excused on the strength of the inner span.
'use strict';
const L=require('../lib');
const R=require('../drive/review');
const P=require('../drive/play');
const LS=require('../drive/lesson');
const PZ=require('../drive/puzzles');

// ── THE SCANNER ───────────────────────────────────────────────────────────────────────────────────────────────
// Returns one row per TEXT NODE whose painted ink crosses the content box of the nearest ancestor that clips it
// on that axis. `cut` is in PIXELS OF INK, which is the number that distinguishes a real defect from geometry.
const SCAN = function(){
  const out=[], other=[], skipped=[];
  let nodes=0, inked=0, clipped=0, scrollable=0;
  const vis=(el)=>{
    for(let e=el;e&&e!==document.documentElement;e=e.parentElement){
      const s=getComputedStyle(e);
      if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return false;
      if(parseFloat(s.opacity)===0)return false;
    }
    return true;
  };
  // the nearest ancestor (self included) that CLIPS on this axis. Stops - and returns null - at the first one
  // that SCROLLS on it, because a finger can bring that content back and it is therefore not cut.
  const clipper=(el,axis)=>{
    for(let e=el;e&&e!==document.documentElement;e=e.parentElement){
      const s=getComputedStyle(e);
      const o=axis==='x'?s.overflowX:s.overflowY;
      if(o==='auto'||o==='scroll'){scrollable++;return null;}
      if(o==='hidden'||o==='clip')return e;
    }
    return null;
  };
  // the ancestor's PADDING box in viewport px. clientLeft/clientWidth are the padding box in LAYOUT px, which
  // is what overflow:hidden actually clips to; they are scaled into paint space by the element's own transform.
  const contentBox=(e)=>{
    const r=e.getBoundingClientRect();
    if(!e.offsetWidth||!e.offsetHeight)return null;
    const m=new DOMMatrixReadOnly(getComputedStyle(e).transform==='none'?'':getComputedStyle(e).transform);
    if(Math.abs(m.b)>1e-6||Math.abs(m.c)>1e-6)return 'rotated';
    const sx=r.width/e.offsetWidth, sy=r.height/e.offsetHeight;
    return {l:r.left+e.clientLeft*sx, t:r.top+e.clientTop*sy, r:r.left+(e.clientLeft+e.clientWidth)*sx, b:r.top+(e.clientTop+e.clientHeight)*sy};
  };
  const path=(el)=>{const p=[];for(let e=el;e&&e!==document.body&&p.length<4;e=e.parentElement){const d=e.getAttribute&&e.getAttribute('data-ct');p.push(d?'['+d+']':e.tagName.toLowerCase());}return p.join('<');};
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n=w.nextNode();n;n=w.nextNode()){
    const t=(n.nodeValue||'').trim(); if(!t) continue;
    const el=n.parentElement; if(!el) continue;
    nodes++;
    if(!vis(el)) continue;
    const rg=document.createRange(); rg.selectNodeContents(n);
    const rects=[...rg.getClientRects()].filter(r=>r.width>0.2&&r.height>0.2);
    if(!rects.length) continue;
    inked++;
    const ink={l:Math.min(...rects.map(r=>r.left)),t:Math.min(...rects.map(r=>r.top)),r:Math.max(...rects.map(r=>r.right)),b:Math.max(...rects.map(r=>r.bottom))};
    for(const axis of ['x','y']){
      const anc=clipper(el,axis); if(!anc) continue;
      clipped++;
      const cb=contentBox(anc);
      if(cb==='rotated'){skipped.push({why:'rotated ancestor',el:path(el)});continue;}
      if(!cb) continue;
      const cut = axis==='x' ? Math.max(cb.l-ink.l, ink.r-cb.r) : Math.max(cb.t-ink.t, ink.b-cb.b);
      if(cut<=1.0) continue;
      const sA=getComputedStyle(anc);
      // (E1) SIGNALLED. The clipping box itself draws an ellipsis on the inline axis, so the truncation is
      //      visible and #387's rule is satisfied: what must never happen is cutting WITHOUT SAYING SO.
      //      The excuse is pinned to the CLIPPING box and not to the text's own element, because a clamp and a
      //      clip are two different boxes (#396) - an ellipsis on an inner span does not excuse an outer box
      //      that cuts. Range rects report the UNTRUNCATED extent, which is why these appear here at all.
      // (E2) OVERSHOOT. The box had no LAYOUT overflow on this axis (scrollSize == clientSize): the content fit,
      //      and what crosses the edge is the glyph's own ink overshooting its line box - font metrics, not lost
      //      information. The 38x38 avatar holding a 35px chess glyph is the example: 1.5px of the crown's tips
      //      are shaved at every geometry and no word, digit or letter is lost. Counted, never silent.
      // (E3) AVATAR GLYPH OVERSHOOT, a REAL but cosmetic residual, pinned to its MECHANISM and its NUMBER
      //      rather than to a loosened threshold - #395's rule, because a threshold slack enough to pass is
      //      slack enough to hide a real defect appearing beside it. `_avBox` (chess.jsx:6148) is a 38x38
      //      overflow:hidden box holding ONE chess glyph at fontSize 35, lineHeight 1, and that glyph's INK box
      //      is 40px tall in this font, so 1.5px of the crown's tip and 1.5px of its base are shaved. It is
      //      symmetric, identical at every geometry (the box is a fixed 38), and loses no word, digit or
      //      letter. Every condition below must hold or the row is a plain `cut`: the y axis, a 38x38 clipping
      //      box, a SINGLE ♔/♚ glyph, no more than 2px, at most 1.5px of LAYOUT overflow, and over at BOTH
      //      ENDS - which is the condition that actually discriminates, because a truncated run of text is cut
      //      at ONE end (its start inside the box, its tail outside) while ink overshooting a line box it is
      //      centred in bleeds out at both. Flag `inv4-avatar-glyph-overshoot-cosmetic` carries it so it is
      //      named rather than absorbed.
      //      SELF-CAUGHT: the first version of this exception required the two ends to be over within a
      //      quarter-pixel of each other, which is what the earlier log APPEARED to show - because that log's
      //      note line printed the X extents for a Y-axis row. Measured properly the overshoot is 1.5px at the
      //      top and 0.5px at the bottom, so the symmetry condition never fired and the exception did nothing.
      //      A condition read off a mislabelled readout, which is the "shape is not a value" rule in miniature.
      const overT=cb.t-ink.t, overB=ink.b-cb.b;
      const isAvatar = axis==='y' && anc.clientWidth===38 && anc.clientHeight===38 &&
        /^[\u2654\u265a]$/.test(t) && cut<=2.0 && overT>0 && overB>0 && (anc.scrollHeight-anc.clientHeight)<=1.5;
      const layoutOver = axis==='x' ? (anc.scrollWidth-anc.clientWidth>0.5) : (anc.scrollHeight-anc.clientHeight>0.5);
      const kind = isAvatar ? 'avatar' : (axis==='x'&&sA.textOverflow==='ellipsis') ? 'signalled' : (!layoutOver ? 'overshoot' : 'cut');
      const row={kind, axis, cut:Math.round(cut*100)/100, text:t.slice(0,28),
        el:path(el), anc:(anc.getAttribute('data-ct')||anc.tagName.toLowerCase()), ancSame:(anc===el),
        ink:axis==='x'?[Math.round(ink.l*100)/100,Math.round(ink.r*100)/100]:[Math.round(ink.t*100)/100,Math.round(ink.b*100)/100],
        box:axis==='x'?[Math.round(cb.l*100)/100,Math.round(cb.r*100)/100]:[Math.round(cb.t*100)/100,Math.round(cb.b*100)/100],
        cs:axis==='x'?anc.clientWidth:anc.clientHeight, ss:axis==='x'?anc.scrollWidth:anc.scrollHeight,
        cw:anc.clientWidth, ch:anc.clientHeight, sym:[Math.round(overT*100)/100,Math.round(overB*100)/100],
        teAnc:sA.textOverflow, teEl:getComputedStyle(el).textOverflow, ov:axis==='x'?sA.overflowX:sA.overflowY};
      if(kind==='cut') out.push(row); else other.push(row);
    }
  }
  return {rows:out, other, skipped, seen:{nodes,inked,clipped,scrollable}};
};

// ── THE SCREENS. Every state is named here rather than inline so "what was checked" is one list. ──────────────
const SCREENS=[
  ['home',            async(b)=>{await b.home();}],
  ['play-captures',   async(b)=>{await P.states['pp-captures'](b);}],
  ['play-gameover',   async(b)=>{await P.states['pp-mate'](b);}],
  ['lesson-demo',     async(b)=>{await LS.states['demo-end'](b);}],
  ['puzzles',         async(b)=>{await PZ.states['train'](b);}],
  ['rev-summary',     async(b)=>{await R.states['summary'](b);}],
  ['rev-ply31',       async(b)=>{await R.states['moves-ply31'](b);}],
  ['rev-last-engine', async(b)=>{await R.states['moves-last-engine'](b);}],
  ['rev-why-open',    async(b)=>{await R.states['why-open'](b);}],
  ['rev-more-sheet',  async(b)=>{await R.states['more-sheet'](b);}],
];

const GEOS=['se','kunal730'];

L.run(async()=>{
  for(const g of GEOS){
    const b=await L.launch({geo:g,store:R.SEED,name:'inv-'+g});
    await b.open();
    L.note(g+' ('+L.GEOS[g].label+')  stamp '+(await b.stamp()));
    let totalRows=0, totalSkipped=0, seenAny=0;
    for(const [name,go] of SCREENS){
      let reached=true, res=null;
      try{ await go(b); }catch(e){ reached=false; L.say(false,g+' '+name+': the state could not be reached at all - every ink assertion on this screen is UNRUN, not green',String(e).slice(0,140)); }
      if(!reached) continue;
      await b.settle(450);
      res=await b.page.evaluate(SCAN);
      seenAny+=res.seen.inked;
      totalRows+=res.rows.length; totalSkipped+=res.skipped.length;
      // PRESENCE FIRST: an empty screen scans clean, so a zero-ink screen is not evidence of anything (#385).
      L.say(res.seen.inked>=6, g+' '+name+': the screen actually painted text for the scanner to measure - a clean result on an empty screen is not a green', res.seen);
      const worst=res.rows.slice().sort((a,c)=>c.cut-a.cut)[0];
      L.say(res.rows.length===0, g+' '+name+': NO text node is cut by the box that clips it - ink measured against the nearest overflow:hidden/clip ancestor, not the viewport',
        res.rows.length? {cuts:res.rows.length, worst} : {cuts:0, inked:res.seen.inked, clippedChecks:res.seen.clipped, excused:res.other.length});
      for(const r of res.rows) L.note('    CUT '+r.cut+'px '+r.axis+'  "'+r.text+'"  in '+r.anc+'  ('+r.el+')  ink '+r.ink.join('..')+' vs box '+r.box.join('..')+'  client '+r.cs+' scroll '+r.ss+'  text-overflow(clipper):'+r.teAnc);
      // THE EXCUSES, ASSERTED RATHER THAN TRUSTED. An excuse nobody checks is how "the covering element is big"
      // hid the very defect it was written for (#393). Every SIGNALLED row must carry the ellipsis ON THE BOX
      // THAT CLIPS - not on some inner span - and every OVERSHOOT row must genuinely have had no layout overflow.
      const badSig=res.other.filter(r=>r.kind==='signalled'&&r.teAnc!=='ellipsis');
      const badOver=res.other.filter(r=>r.kind==='overshoot'&&(r.ss-r.cs)>0.5);
      const badAv=res.other.filter(r=>r.kind==='avatar'&&!(r.axis==='y'&&r.cw===38&&r.ch===38&&r.cut<=2&&/^[\u2654\u265a]$/.test(r.text)&&r.sym[0]>0&&r.sym[1]>0&&(r.ss-r.cs)<=1.5));
      L.say(badSig.length===0&&badOver.length===0&&badAv.length===0, g+' '+name+': every excused row is excused by the mechanism claimed for it - the ellipsis sits on the CLIPPING box, an overshoot box really had no layout overflow, and an avatar row is a single chess glyph bleeding out of BOTH ends of a 38x38 box by under 2px with at most 1.5px of layout overflow',
        {signalled:res.other.filter(r=>r.kind==='signalled').length, overshoot:res.other.filter(r=>r.kind==='overshoot').length, avatar:res.other.filter(r=>r.kind==='avatar').length, badSig:badSig.length, badOver:badOver.length, badAv:badAv.length});
      for(const r of res.other) L.note('    '+r.kind.toUpperCase()+' '+r.cut+'px '+r.axis+'  "'+r.text+'"  in '+r.anc+'  client '+r.cs+' scroll '+r.ss+'  text-overflow(clipper):'+r.teAnc);
    }
    // (b): a rotated ancestor is skipped rather than measured wrong, so the skip count must stay zero or the
    // gate has quietly stopped covering something.
    L.say(totalSkipped===0, g+': no clipping ancestor was skipped for a rotated/skewed transform (a skip is coverage silently lost, not a pass)', {skipped:totalSkipped});
    L.say(seenAny>=60, g+': the sweep as a whole measured a real quantity of ink across the screens', {inkedTextNodes:seenAny});
    await b.close();
  }
},'26-invariants');
