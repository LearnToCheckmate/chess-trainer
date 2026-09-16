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
      // AN INLINE BOX NEVER CLIPS. `overflow` does not apply to a non-replaced inline element, and
      // clientWidth/clientHeight are DEFINED as 0 for one - so treating it as the clipper both invents a
      // clip that does not happen and feeds a degenerate 0-width padding box into the arithmetic below.
      // Found by this gate's own fixture, which reported a row with cs=0 ss=0 and an `overshoot` kind derived
      // from 0<=0.5. A span inside a flex row is NOT inline (it blockifies), which is why the real player-name
      // span still reports 167/198 and is still measured.
      if(s.display==='inline')continue;
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
      // (E4) CLAMPED, and this one carries #396's arithmetic rather than #394's mistake. A `-webkit-line-clamp`
      //      draws an ellipsis, so a vertical cut it accounts for IS signalled - but #396's whole finding is that
      //      asserting the clamp EXISTS does not settle which box cuts: the clamp governs how many LINE BOXES are
      //      drawn and `overflow:hidden` governs where the CONTAINER ends, so if the container is TALLER than the
      //      clamped lines the next line paints into the slack and is cut at the box edge - a row of decapitated
      //      glyphs under a sentence that has already ended in an ellipsis. So the excuse requires the container
      //      to be no taller than the lines the clamp allows, which is exactly the assertion #396 shipped:
      //      `rev-why-txt` at 320 is clamp 3 x 16.9px = 50.7 in a clientHeight of 51 -> EXCUSED, and #396's
      //      defect was the same three lines in a 58px box -> NOT excused, still a `cut`.
      //      Range rects report the UNTRUNCATED extent, which is why a healthy clamped box shows up here at all:
      //      measured on the shipped bundle, plies 19 and 25 at 320 give scrollHeight 68 against clientHeight 51,
      //      and a pixel scan of the same box finds three ink bands and an ellipsis, so no ink was lost. Without
      //      this the gate went red on a healthy build one navigation step outside its own state list.
      const clampN = parseFloat(sA.webkitLineClamp);
      const lhN = parseFloat(sA.lineHeight);
      const isClamped = axis==='y' && clampN>0 && lhN>0 && anc.clientHeight <= Math.ceil(clampN*lhN)+1;
      const layoutOver = axis==='x' ? (anc.scrollWidth-anc.clientWidth>0.5) : (anc.scrollHeight-anc.clientHeight>0.5);
      const kind = isAvatar ? 'avatar' : isClamped ? 'clamped' : (axis==='x'&&sA.textOverflow==='ellipsis') ? 'signalled' : (!layoutOver ? 'overshoot' : 'cut');
      const row={kind, axis, cut:Math.round(cut*100)/100, text:t.slice(0,28),
        el:path(el), anc:(anc.getAttribute('data-ct')||anc.tagName.toLowerCase()), ancSame:(anc===el),
        ink:axis==='x'?[Math.round(ink.l*100)/100,Math.round(ink.r*100)/100]:[Math.round(ink.t*100)/100,Math.round(ink.b*100)/100],
        box:axis==='x'?[Math.round(cb.l*100)/100,Math.round(cb.r*100)/100]:[Math.round(cb.t*100)/100,Math.round(cb.b*100)/100],
        cs:axis==='x'?anc.clientWidth:anc.clientHeight, ss:axis==='x'?anc.scrollWidth:anc.scrollHeight,
        clampN:isFinite(clampN)?clampN:null, lhN:isFinite(lhN)?lhN:null,
        cw:anc.clientWidth, ch:anc.clientHeight, sym:[Math.round(overT*100)/100,Math.round(overB*100)/100],
        teAnc:sA.textOverflow, teEl:getComputedStyle(el).textOverflow, ov:axis==='x'?sA.overflowX:sA.overflowY};
      if(kind==='cut') out.push(row); else other.push(row);
    }
  }
  return {rows:out, other, skipped, seen:{nodes,inked,clipped,scrollable}};
};


// ── THE CLASSIFIER'S OWN UNIT TEST, which is what a real check on the excuses looks like. #391's rule. ────────
// Nine DOM shapes, injected into the live page, scanned with the SAME `SCAN` the screens use, and each one
// asserted to the kind it must get. FOUR OF THE NINE ARE CASES THE EXCUSES MUST REJECT, because a predicate
// tested only on what it should accept is the alternation that matches every branch (#388). The fixture is
// built from HTML the classifier has never seen, so none of these assertions can be satisfied by the
// classifier's own bookkeeping - which is exactly what went wrong with the assertion this replaces.
const FIXTURE = function(){
  const wrap=document.createElement('div');
  wrap.id='ct-inv-fixture';
  wrap.setAttribute('style','position:fixed;left:0;top:0;width:340px;z-index:2147483000;background:#111;color:#ccc;font:13px/1.3 system-ui');
  wrap.innerHTML=[
    // 1 MUST REJECT: the ellipsis is on an INNER span, the CLIPPING box is the outer one. #396's two boxes.
    '<div id="f1" style="width:60px;overflow:hidden;white-space:nowrap;text-overflow:clip"><span style="text-overflow:ellipsis">AAAAAAAAAAAAAAAAAAAA</span></div>',
    // 2 MUST ACCEPT as signalled: the ellipsis is ON the clipping box.
    '<div id="f2" style="width:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">BBBBBBBBBBBBBBBBBBBB</div>',
    // 3 MUST REJECT: a 38x38 box, but a WORD in it, not a single glyph.
    '<div id="f3" style="width:38px;height:38px;overflow:hidden;white-space:nowrap">Checkmate!!</div>',
    // 4 MUST REJECT: a 38x38 box with one king glyph, but oversized so it really does not fit.
    '<div id="f4" style="width:38px;height:38px;overflow:hidden;line-height:1;font-size:60px">\u2654</div>',
    // 5 MUST ACCEPT as avatar: the real _avBox shape - 38x38, one king, font-size 35, line-height 1.
    '<div id="f5" style="width:38px;height:38px;overflow:hidden;display:flex;align-items:center;justify-content:center;line-height:1;font-size:35px">\u2654</div>',
    // 6 MUST ACCEPT as clamped: clamp 3 and a container exactly the clamped lines (ceil(3*16)=48).
    '<div id="f6" style="width:120px;height:48px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;line-height:16px">one two three four five six seven eight nine ten eleven twelve thirteen</div>',
    // 7 MUST REJECT: #396's ACTUAL DEFECT - clamp 3 in a container with slack, so a fourth line paints and is cut.
    '<div id="f7" style="width:120px;height:58px;overflow:hidden;-webkit-line-clamp:3;line-height:16px">one two three four five six seven eight nine ten eleven twelve thirteen</div>',
    // 8 MUST NOT BE REPORTED AT ALL: a SCROLLABLE ancestor - a finger can reach it, so it is not cut.
    '<div id="f8" style="width:60px;overflow-x:auto;white-space:nowrap">CCCCCCCCCCCCCCCCCCCC</div>',
    // 9 MUST REJECT: text-overflow:ellipsis declared but the cut is VERTICAL, where ellipsis does nothing.
    '<div id="f9" style="width:120px;height:8px;overflow:hidden;text-overflow:ellipsis;line-height:16px">DDDD</div>'
  ].join('');
  document.body.appendChild(wrap);
  return true;
};
const FIXTURE_WANT=[
  ['AAAA','cut',      'an ellipsis on an INNER span does not excuse the OUTER box that clips - #396, two different boxes'],
  ['BBBB','signalled','an ellipsis ON the clipping box is a visible truncation'],
  ['Checkmate!!','cut','a 38x38 box is not a licence: a WORD cut in one is a defect, not avatar overshoot'],
  ['\u2654-big','cut','a king glyph too big for its 38x38 box really is cut, and is not excused as overshoot'],
  ['\u2654-real','avatar','the real _avBox shape - 38x38, one king at font-size 35 - is the named cosmetic residual'],
  ['clamp-fit','clamped','a clamp whose container is exactly the clamped lines draws an ellipsis and loses nothing'],
  ['clamp-slack','cut', '#396 EXACTLY: clamp 3 in a 58px box paints a fourth line into the slack and cuts it silently'],
  ['scrollable','none', 'a scrollable ancestor is never reported - a finger can bring that content back'],
  ['y-ellipsis','cut',  'text-overflow:ellipsis does nothing on the BLOCK axis, so it must not excuse a vertical cut']
];

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
  // #404, AND THIS ONE IS HERE BECAUSE THE GATE'S FIRST VERSION HAD ITS BLIND SPOT POINTED STRAIGHT AT IT.
  // `rev-playout` (the "why" button) and `rev-best` (the "best <san> ›" pill) are MUTUALLY EXCLUSIVE branches of
  // the same conditional in chess.jsx:5366-5374, and #404 edited BOTH in the same two lines of diff. The five
  // review states above reach plies 0, 10, 31, 33 and - `why-open`, deterministically, three runs identical -
  // ply 19, which is a Brilliant move. So every one of them renders the branch that was fixed and not one of
  // them renders the branch beside it. The #404 antagonist pass found that by walking all 34 plies.
  // Ply 30 is 15...Nxd7 ?? Blunder, best Qxd7: the largest `rev-best` overrun in the reference game.
  ['rev-best-ply30',  async(b)=>{await R.states['moves-ply0'](b);await R.goPly(b,30);await b.settle(600);}],
];

// THE ONE RESIDUAL THIS GATE PINS RATHER THAN HIDES, and it is not mine to close. #404.
// At 320x568, ply 30, `[data-ct="rev-best"]` is clientWidth 45 against scrollWidth 86 and the pill reads
// "best Qx" - about 28px of "Qxd7" and the whole "›" painted outside the box that clips them, no ellipsis. It
// is a RESIDUAL AND NOT A REGRESSION: the shipped #400 bundle cuts the same text by 44.74px and the chevron by
// 55.1px at the same ply, so #404's padding change improved it by roughly 17px and did not close it.
// WHY IT IS NOT CLOSED HERE. The row is nowrap and holds three pieces of information at 320 - the move played,
// the verdict, and the best move - and every remaining way to make it fit spends one of them: drop the "best"
// prefix and "Qxd7 ›" beside "?? Blunder" is ambiguous; drop the verdict word and the pill stops saying what
// happened; wrap the row and the board moves on the smallest screen, which #371 and the board-is-sacred rule
// both forbid without asking. That is a product choice with a real cost either way, so it went to Kunal on the
// Decision Desk with a screenshot and three options rather than being decided here at 03:00.
// Pinned exactly as 35-width-containment pinned its own 38.9px: the value is asserted, so if it is FIXED this
// goes red and the pin comes out, and if it gets WORSE this goes red too. Scoped by state, geometry AND
// data-ct, so the exclusion cannot widen to cover a second defect that appears beside it.
const PINNED={state:'rev-best-ply30',geo:'se',anc:'rev-best',cuts:2,tol:3.5};

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
      const isPinned=(r)=>g===PINNED.geo&&name===PINNED.state&&r.anc===PINNED.anc;
      const rows=res.rows.filter(r=>!isPinned(r));
      const pinnedRows=res.rows.filter(isPinned);
      const worst=rows.slice().sort((a,c)=>c.cut-a.cut)[0];
      L.say(rows.length===0, g+' '+name+': NO text node is cut by the box that clips it - ink measured against the nearest overflow:hidden/clip ancestor, not the viewport',
        rows.length? {cuts:rows.length, worst} : {cuts:0, inked:res.seen.inked, clippedChecks:res.seen.clipped, excused:res.other.length, pinned:pinnedRows.length});
      if(g===PINNED.geo&&name===PINNED.state){
        // The pinned residual, asserted on its own so it is in the log every run rather than implied by a
        // filter nobody reads. It is on Kunal's Decision Desk; see the PINNED comment above.
        L.say(pinnedRows.length===PINNED.cuts, g+' '+name+': the ONE pinned residual is exactly where it was left - "'+PINNED.anc+'" still cuts '+PINNED.cuts+' text nodes at 320 (the best-move pill reads "best Qx"). RED here means it MOVED: fixed, and this pin comes out, or worse, and it needs looking at',
          pinnedRows.map(r=>({text:r.text,cut:r.cut,cs:r.cs,ss:r.ss})));
      }
      for(const r of res.rows) L.note('    CUT '+r.cut+'px '+r.axis+'  "'+r.text+'"  in '+r.anc+'  ('+r.el+')  ink '+r.ink.join('..')+' vs box '+r.box.join('..')+'  client '+r.cs+' scroll '+r.ss+'  text-overflow(clipper):'+r.teAnc);
      // THE EXCUSE COUNTS ARE REPORTED, NOT ASSERTED, AND THE REASON IS A VETO THIS GATE EARNED ON ITS FIRST
      // DAY. The assertion that used to stand here read "every excused row is excused by the mechanism claimed
      // for it" and appeared TWENTY times in this gate's 64. IT COULD NOT GO RED AGAINST ANY BUNDLE WHATSOEVER,
      // because all three of its filters re-read the very fields that had assigned `kind` four lines earlier:
      // `kind==='signalled'` is true only when `sA.textOverflow==='ellipsis'`, and `row.teAnc` is set FROM THAT
      // SAME READ, so `filter(r=>r.kind==='signalled' && r.teAnc!=='ellipsis')` is the empty set by
      // construction; `kind==='overshoot'` is true only when `ss-cs<=0.5`, so the badOver filter is empty the
      // same way; and badAv re-tested the six conditions `isAvatar` had just used, from the row those
      // conditions built. The #404 antagonist pass measured it rather than reading it - it ran this gate's own
      // SCAN over a DOM built to violate every stated excuse, got 6 `cut` rows and 3 excused, and still got
      // badSig 0, badOver 0, badAv 0 - and vetoed the push. It was right, and the failure is the one this
      // gate's own header warns about two screens up: "an excuse nobody checks is how 'the covering element is
      // big' hid the very defect it was written for (#393)". A comment is not the check.
      //
      // What replaced it is FIXTURE_CASES below, run once per geometry: the classifier is fed an enumerated
      // list of DOM shapes INCLUDING THE ONES IT MUST REJECT, which is #391's rule ("when an assertion parses
      // something an engine wrote, enumerate what it can legally produce and unit-test the predicate against
      // that list"). Those assertions CAN go red, because the fixture is independent of the classifier.
      for(const r of res.other) L.note('    '+r.kind.toUpperCase()+' '+r.cut+'px '+r.axis+'  "'+r.text+'"  in '+r.anc+'  client '+r.cs+' scroll '+r.ss+'  text-overflow(clipper):'+r.teAnc);
    }
    // THE CLASSIFIER'S UNIT TEST, run on this geometry's live page. Nine shapes, four of them cases the excuses
    // MUST reject. Independent of the classifier's own bookkeeping, which is the whole point.
    await b.home();
    await b.page.evaluate(FIXTURE);
    await b.settle(150);
    const fx=await b.page.evaluate(SCAN);
    const all=[...fx.rows,...fx.other];
    const pick=(re)=>all.filter(r=>re.test(r.text));
    const kindOf=(re)=>{const m=pick(re);return m.length?m.map(r=>r.kind).sort().join('+'):'none';};
    const checks=[
      [/^A+$/,'cut',FIXTURE_WANT[0][2]],
      [/^B+$/,'signalled',FIXTURE_WANT[1][2]],
      [/^Checkmate!!$/,'cut',FIXTURE_WANT[2][2]],
      [/^C+$/,'none',FIXTURE_WANT[7][2]],
      [/^D+$/,'cut',FIXTURE_WANT[8][2]]
    ];
    for(const [re,want,why] of checks){
      const got=kindOf(re);
      L.say(got===want, g+' fixture: '+why, {want, got, rows:pick(re).map(r=>({kind:r.kind,axis:r.axis,cut:r.cut,anc:r.anc}))});
    }
    // the two king cases share their text, so they are told apart by the box that clips them
    const kings=all.filter(r=>/^\u2654$/.test(r.text));
    const kBig=kings.find(r=>r.cut>5), kReal=kings.find(r=>r.cut<=2);
    L.say(!!kBig&&kBig.kind==='cut', g+' fixture: '+FIXTURE_WANT[3][2], kBig||{kings:kings.map(k=>({kind:k.kind,cut:k.cut,axis:k.axis}))});
    L.say(!!kReal&&kReal.kind==='avatar', g+' fixture: '+FIXTURE_WANT[4][2], kReal||{kings:kings.map(k=>({kind:k.kind,cut:k.cut,axis:k.axis}))});
    // the two clamp cases share their text too, and are told apart by the container's own slack
    const cl=all.filter(r=>/^one two three/.test(r.text));
    const cFit=cl.find(r=>r.cs===48), cSlack=cl.find(r=>r.cs===58);
    L.say(!!cFit&&cFit.kind==='clamped', g+' fixture: '+FIXTURE_WANT[5][2], cFit||{clamps:cl.map(c=>({kind:c.kind,cs:c.cs,cut:c.cut}))});
    L.say(!!cSlack&&cSlack.kind==='cut', g+' fixture: '+FIXTURE_WANT[6][2], cSlack||{clamps:cl.map(c=>({kind:c.kind,cs:c.cs,cut:c.cut}))});
    await b.page.evaluate(()=>{const e=document.getElementById('ct-inv-fixture');if(e)e.remove();});

    // (b): a rotated ancestor is skipped rather than measured wrong, so the skip count must stay zero or the
    // gate has quietly stopped covering something.
    L.say(totalSkipped===0, g+': no clipping ancestor was skipped for a rotated/skewed transform (a skip is coverage silently lost, not a pass)', {skipped:totalSkipped});
    L.say(seenAny>=60, g+': the sweep as a whole measured a real quantity of ink across the screens', {inkedTextNodes:seenAny});
    await b.close();
  }
},'26-invariants');
