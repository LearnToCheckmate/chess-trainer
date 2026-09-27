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
//   1. TAP TARGETS (every visible interactive element >= 44x44 at every width)     REPORTED, NOT ASSERTED
//      (#423 MEASURES, per geometry and printed in this log: 70 at 320x568, 66 at 375x730, 72 at 375x568,
//       against the SIX the commission named by hand. An earlier draft of this header said "90", which is a
//       union across three geometries under a different dedupe key and is a number this gate never emits -
//       #411/#412's "a count with no scope cannot be checked", committed inside the file that was fixing it.
//       A meaningful part of the gap is population rather than defect; see the invariant 1 note at the foot of
//       the geometry loop. jobs/invariant-1-tap-targets owns settling the population and pinning the list.)
//   2. ONE ICON SIZE PER ROW (glyph heights equal within 1px in a control row)     THIS FILE, #423
//   3. A SHORT LIST OF ICON SIZES (report today's count first, then assert it)     THIS FILE, #423 (set pinned)
//   4a. INK INSIDE ITS OWN CLIPPING BOX (text cut by the box that clips it)        THIS FILE, BELOW
//   4b. INK INSIDE ITS OWN BOX (text painted outside itself, onto a sibling)       THIS FILE, #413
// 2 and 3 landed at #423 with their known failures pinned, which is how 4 landed; 1 is reported and not asserted
// for the reason given above. 4 went first because its class was LIVE - filed three times by three sessions
// while the other three were not.
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
// states listed in SCREENS below at THREE geometries (320x568, 375x730 and, since #413, 375x568). Landscape
// is not swept (`uat397-rev-why-clips-landscape` is a separate open flag). 375x679, 375x761, 390x844 and
// 430x932 are not swept by this gate - 35-width-containment carries the width matrix. Text inside <canvas> or an <img> alt is
// not text to a Range and is invisible here. A box that clips an IMAGE rather than text is not covered.
//
// ── NEGATIVE CONTROLS, both run at #404. A green that has never been disproved is worth nothing. ─────────────
//
//   NC-A  THE SHIPPED RELEASE ITSELF, which is the strongest form of control available here and needs no trial
//         bundle at all: `git cat-file -p 3b7a4c2:app.js`, md5 4e59a9f4a4ed, stamp '#400 - 2026-09-15 16:56 ET'.
//         -> RE-RUN AGAINST THE FINAL GATE (the numbers below are the final ones; the pre-veto gate scored
//            61/3 and that figure is superseded - a control number that does not match the gate it is printed
//            beside is the frozen denominator again): 63 pass, 4 FAIL, all at 320x568, to the hundredth:
//              se lesson-demo      "♟ Other lines (" 6.17px, "3" 16.22px, ")" 22.92px  (clipper: the 320-wide
//                                  root box, client 320 scroll 359)
//              se rev-last-engine  "10" 15px in [pbar-taken-b], client 116 scroll 131, ink 248.91..267 vs box
//                                  136..252 - the same number standing checks B and the recurrence job each
//                                  measured independently, 26 hours apart
//              se rev-why-open     "why" 8.37px in [rev-playout], client 47 scroll 66
//              se rev-best-ply30   THE PINNED RESIDUAL ASSERTION GOES RED, and it is supposed to: #400 cuts
//                                  THREE text nodes there ("best" 1.95px, "Qxd7" 44.74px, "›" 55.1px, client 35
//                                  scroll 100) where #404 cuts two. So the pin is not a blanket exclusion - it
//                                  detects the residual MOVING in either direction, which is the whole reason
//                                  35-width-containment pinned its own 38.9px the same way. It also puts a
//                                  number on the improvement: "Qxd7" 44.74 -> 27.74 is 17.00px exactly.
//         -> AND WHAT STAYED GREEN IS THE HALF THAT MATTERS: home, play-captures, play-gameover, puzzles,
//            rev-summary, rev-ply31 and rev-more-sheet at 320, and ALL ELEVEN SCREENS at 375x730, plus all
//            nine fixture cases at both geometries - the fixture is bundle-independent by construction and
//            proving that it does not move with the bundle is part of trusting it.
//            So the gate fires on the states that contain the defects and on no others; it is not simply red
//            everywhere at 320.
//         The same run on the #404 bundle: 67 pass, 0 fail.
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
//
// ── 4b's OWN CONTROLS, all three run at #413. Every number below is from a run, not an estimate. ────────────
//
//   NC-E  THE SHIPPED #407 RELEASE, and it needs no trial bundle: `git cat-file -p 5332a8d:app.js`, md5
//         e719c5842b43, stamp '#407 - 2026-09-17 00:53 ET'. This is 4b's headline control because the defect
//         it was written for is IN that bundle and was fixed at #409 by re-keying the label to the row
//         (`amber-409-try-again-keyed-to-the-row`), so the same gate reads red on one and green on the other.
//         -> 199 pass, 1 FAIL. The one red is 4b at 375x568 on lesson-practice: "↻ Try again" painted
//            167.25..259.77 against its own padding box of 176.06..250.94 - 8.83px past its right edge -
//            and 2.81 x 16px of that landed on the ⋯ button beside it, with the row measured 230.88 =
//            [46, 46, 74.88, 46]. THE SAME 8.83px THE EXTERNAL SUPERVISOR MEASURED BY HAND on that bundle
//            (`class-spilled-ink-and-viewport-keyed-board-rows-2026-09-17`), to the hundredth, from a
//            different instrument - which is the cross-check that makes this control worth more than a
//            number this gate produced and then agreed with.
//         -> Head (#412, md5 b5d8188374fb) on the same gate: 200 pass, 0 fail.
//         -> AND NOTHING ELSE MOVED: 4a stayed exactly as it is at head on that bundle, both pinned rows
//            included, so the gate fires on the one state that holds the defect and on no other.
//
//   NC-F  THE PLAYER-BAR NAME SPAN, `overflow:'hidden'` -> `'visible'` (chess.jsx, the span carrying {name}
//         in the pbar row). Trial bundle md5 75d2c18501ec; chess.jsx restored and md5-verified afterwards.
//         INTENDED to make a 198px name paint across the rating in an 82px box at every geometry, so that
//         4b's 375x730 half stopped being silence. IT DID NOT, AND THE REASON IS THE CONTROL'S WHOLE VALUE:
//         -> 190 pass, 10 FAIL - and all ten are 4a `cut` rows, with ZERO 4b rows. TWO elements, not one:
//            [pbar-rating-b] (the rating: 47.23px at 320x568, 19.73px at 375x568, none at 375x730) and the
//            name div itself (13.53px), which the first write-up of this control did not name. `overflow:hidden` is what lets a flex
//            item shrink below its min-content width: the automatic minimum size of a flex item is zero only
//            when its overflow is NOT visible. So flipping that one word does not make the span spill - it
//            makes the span REFUSE TO SHRINK, grow to its full 198px, and push the rating out of the row,
//            where 4a catches the rating being cut. The break moved to a different element and a different
//            invariant. A control that changes the very mechanism it was meant to stress is not a failed
//            control, it is a measurement of the CSS - but it proves nothing about 4b, so NC-G was built.
//
//   NC-G  THE PRACTICE ROW'S TRAILING ⋯ BUTTON, `width:46,minWidth:46` -> `190,190` (chess.jsx, the button
//         with aria-label "More actions"). Trial bundle md5 0540434ab567; chess.jsx restored and verified.
//         This starves the one flexible child of the row at EVERY geometry instead of only in the
//         wide-and-short corner, which is what the 375x730 half needed.
//         -> 197 pass, 3 FAIL, one per geometry, all of them 4b on lesson-practice:
//              kunal730   "↻ Try again"  8.77px right, onto the ⋯ button by 2.75 x 16, row 375 = [46,46,75,190]
//              se         "↻ Again"     27.89px left,  onto the 💡 button by 21.89 x 16, row 230.88 = [46,46,8,190]
//              short375   "↻ Again"     27.89px left,  onto the 💡 button by 21.89 x 16, row 230.88 = [46,46,8,190]
//         -> SO 4b's GREEN AT 375x730 IS EVIDENCE AND NOT SILENCE, which is the same thing NC-B does for 4a
//            and the reason both are here. Note also that the spill goes LEFT when the box is starved to 8px:
//            the label is centred, so the side it escapes on is an artefact of the budget, and an assertion
//            that only looked right would have missed two of these three.
'use strict';
const L=require('../lib');
const R=require('../drive/review');
const P=require('../drive/play');
const LS=require('../drive/lesson');
const PZ=require('../drive/puzzles');

// ── INVARIANT 2 AND 3's SCANNER: CONTROLS, THE ROWS THEY SIT IN, AND THEIR GLYPH HEIGHTS ──────────────────────
// Invariant 2: "in any container whose direct children include two or more interactive controls laid out as a
// row, every glyph box has the same height within 1px". Invariant 3: "across the whole app there are at most
// N distinct glyph heights" - where the commission is explicit that the N it names (four) is a PLACEHOLDER and
// the first job is to REPORT today's count.
//
// THE GLYPH IS MEASURED THE WAY 11-lesson.js ALREADY MEASURES IT - the SVG box where there is an SVG, else
// Range.selectNodeContents(el).getBoundingClientRect(). The commission says so in terms, and for a reason: the
// numbers already in the flags (a 9.2pt close x, 13.8x18.3 chevrons, pbar-top 28 against 21) come from that
// method, and a second method would make this whole exercise incomparable with the record it is meant to close.
//
// ── WHAT THE CONTROL POPULATION IS, AND THE TWO EXCLUSIONS IT COST ME A PROBE TO FIND ─────────────────────────
// A control is: button, input, select, textarea, [role=button], a[href], [onclick], or an element whose computed
// `cursor` is `pointer`. That last one is a PROXY AND IT IS THE ONLY ONE AVAILABLE: React attaches click
// handlers at the root, so the 354 onClick props in chess.jsx are INVISIBLE in the DOM. A div with onClick and
// no cursor:pointer is therefore NOT covered by invariants 1-3, and that is a stated hole, not an oversight.
//
// AND `cursor` IS INHERITED, WHICH IS THE WHOLE TRAP. Every div, span, <path>, <circle> and <ellipse> inside a
// pointer-cursored button reports cursor:pointer too. Measured on this bundle 2026-09-27, before the exclusions:
// the naive population reported 263 distinct "undersized interactive elements", most of them SVG internals like
// `svg>g>circle 1.6x1.6` and `div>svg>ellipse 1.3x2.1`, and it manufactured FALSE ROWS for invariant 2 - two
// <div>s inside one button ("Daily 3 16 | keep the streak alive 12", spread 4) and two <span>s inside the
// rev-best pill ("best 13 | › 15", spread 2) both read as two-control rows and would have been filed as real
// inconsistencies. This is the project's own "a bad selector is a reading" rule, and it produced numbers that
// looked exactly like measurements. Two exclusions, both COUNTED so they can never shrink the gate's reach in
// silence:
//   - an element in the SVG namespace is never a control (it is paint inside one);
//   - only the OUTERMOST control counts: a control with a control ancestor is nested, not its own row member.
// After both, the same sweep reports 90 undersized controls and SIX spread classes, every one of which survives
// inspection - and both of the failures the commission named by hand are among them.
//
// THE BOARD IS EXCLUDED BY MECHANISM. Its 64 squares take taps and its pieces are drawn inside
// transform:scale(1.06), so they would flood every board screen with eight-control rows of piece glyphs whose
// heights are a paint effect. The board is found the way lib.js finds it - the widest div whose INLINE
// gridTemplateColumns matches /repeat\(8,/ - and the count of what that dropped is returned, never assumed.
//
// ── WHAT INVARIANT 2 IS BLIND TO BY CONSTRUCTION, AND IT IS NOT A SMALL HOLE ───────────────────────────────────
// Because the measured quantity for an SVG is its BOX, a row whose controls are all SVG icons of the same box
// size reports spread 0 however different the strokes inside them are. The #423 antagonist measured the worked
// example on a screen this gate already sweeps: the bottom TAB BAR's five icons are all a 22x22 box, so this
// invariant reports spread 0, while their painted ink runs Review 13.93, Home 15.40, Play 15.49, Discover 16.50,
// Puzzles 18.15 - a 4.22px spread, 30% between largest and smallest, in a five-icon row present on nearly every
// screen in the app. So the rows invariant 2 CAN flag are, structurally, the rows that MIX an SVG box with a
// text line box, which is what three of its five pins are.
// THIS IS THIS FILE'S OWN TRAP (d) ASKED OF A DIFFERENT INVARIANT: is the thing I am trying to detect absorbed
// by the mechanism I am asserting over? For 4a the header asks it and answers no. For invariant 2 nobody asked,
// and the answer is partly yes. The box method is KEPT because the commission mandates it for comparability with
// every number already in the flags, and changing what this invariant measures is a design change with its own
// control work - jobs/invariant-2-measures-the-box-not-the-ink owns it. Meanwhile the ink is measured and
// printed beside every row, so the hole is visible in the log rather than implied by a green.
//
// A ROW REQUIRES CONTROLS SIDE BY SIDE, NOT MERELY TWO OF THEM. Two controls are a row when their vertical
// bands overlap by more than half the shorter one AND their horizontal bands do not overlap. A vertical stack
// of buttons is not a row; asserting one glyph size down a column is not what was commissioned, and a predicate
// loose enough to call a column a row is loose enough to go red on a healthy screen.
const ROWS = function(){
  const vw=innerWidth, vh=innerHeight;

  let board=null, bw=-1;
  for(const d of document.querySelectorAll('div')){
    if(!/repeat\(8,/.test(d.style.gridTemplateColumns||''))continue;
    const r=d.getBoundingClientRect(); if(r.width<40)continue;
    if(r.width>bw){bw=r.width;board=d;}
  }

  const why=(e)=>{
    const t=e.tagName;
    if(t==='BUTTON')return 'button';
    if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return t.toLowerCase();
    if(e.getAttribute&&e.getAttribute('role')==='button')return 'role';
    if(t==='A'&&e.hasAttribute('href'))return 'a';
    if(e.hasAttribute('onclick'))return 'onclick';
    if(getComputedStyle(e).cursor==='pointer')return 'pointer';
    return null;
  };
  const vis=(r)=>r.width>=1&&r.height>=1&&r.bottom>0&&r.top<vh&&r.right>0&&r.left<vw;

  // THE BOX IS THE MANDATED MEASUREMENT AND THE INK IS THE HONEST ONE, SO BOTH ARE RETURNED.
  // The commission requires the 11-lesson.js method - the SVG's own box, else a Range over the contents - in
  // terms, and for a stated reason: every number already in the flags comes from it, and a second method would
  // make this incomparable with the record it exists to close. So `gh` stays the box and is what invariant 2
  // asserts on. But an SVG's box is its viewBox, NOT its strokes, and the #423 antagonist measured the gap:
  // the lesson footer's chevrons are a 27x27 box carrying a 10.8 x 16.2 polyline, and the puzzle arrows a 20x20
  // box carrying 8 x 12. In both rows the arrows are the SMALLEST ink and the box says they are the largest, so
  // the first version of this file's pin prose described both rows backwards and a fixer acting on it would have
  // shrunk the arrows and made the row worse. `ink` is the union of the painted leaf rects, reported in the log
  // beside every pinned row so the number a fixer reads is the number a player sees.
  const inkH=(e)=>{
    const svg=e.querySelector('svg');
    if(!svg)return null;
    let top=Infinity, bot=-Infinity, n=0;
    for(const k of svg.querySelectorAll('path,line,circle,ellipse,rect,polyline,polygon,text')){
      for(const r of k.getClientRects()){ if(r.height<0.01&&r.width<0.01)continue; top=Math.min(top,r.top); bot=Math.max(bot,r.bottom); n++; }
    }
    return n? +(bot-top).toFixed(2) : null;
  };
  const glyph=(e)=>{
    const svg=e.querySelector('svg');
    if(svg){const g=svg.getBoundingClientRect();return {gh:+g.height.toFixed(1),gw:+g.width.toFixed(1),via:'svg',ink:inkH(e)};}
    const rg=document.createRange(); rg.selectNodeContents(e);
    const g=rg.getBoundingClientRect();
    if(g.height<0.5)return null;
    return {gh:+g.height.toFixed(1),gw:+g.width.toFixed(1),via:'range',ink:+g.height.toFixed(2)};
  };
  const label=(e)=>{
    const a=e.getAttribute('aria-label')||e.getAttribute('data-ct')||'';
    if(a)return a.slice(0,34);
    return ((e.innerText||e.textContent||'').trim().replace(/\s+/g,' ')||'<no text>').slice(0,34);
  };
  const path=(e)=>{const b=[];for(let n=e;n&&n!==document.body&&b.length<3;n=n.parentElement){
    b.unshift(n.getAttribute('data-ct')?('['+n.getAttribute('data-ct')+']'):n.tagName.toLowerCase());}return b.join('>');};

  const ctls=[], byWhy={}; let inBoard=0, nested=0, svgKid=0, covered=0; const coveredList=[];
  const isCtl=(e)=>!!why(e);
  for(const e of document.querySelectorAll('*')){
    if(!why(e))continue;
    if(board&&board.contains(e)){inBoard++;continue;}
    if(e.namespaceURI&&e.namespaceURI.indexOf('svg')>=0){svgKid++;continue;}
    let anc=false; for(let n=e.parentElement;n;n=n.parentElement){if(isCtl(n)){anc=true;break;}}
    if(anc){nested++;continue;}
    const r=e.getBoundingClientRect(); if(!vis(r))continue;
    // THE THIRD EXCLUSION, AND IT COST A FALSE DEFECT TO FIND. See the header: this app keeps several screens
    // MOUNTED AT ONCE, so laid-out-and-on-screen is not usable. Excluded only when the point at the control's
    // own centre lands on an element that is neither the control, nor inside it, nor an ancestor of it - an
    // ancestor hit means the centre fell on the control's own padding, which is still the control. Excluding
    // shrinks the population, so it can never manufacture a defect; it can only hide one, which is why the
    // count is PINNED per geometry and screen below rather than merely reported.
    const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    if(hit && hit!==e && !e.contains(hit) && !hit.contains(e)){
      covered++;
      if(coveredList.length<12) coveredList.push({lab:label(e),box:+r.width.toFixed(1)+'x'+r.height.toFixed(1),hitWas:(hit.getAttribute('data-ct')||hit.tagName)});
      continue;
    }
    byWhy[why(e)]=(byWhy[why(e)]||0)+1;
    ctls.push({e,w:+r.width.toFixed(1),h:+r.height.toFixed(1),x:+r.left.toFixed(1),y:+r.top.toFixed(1),
               bot:+r.bottom.toFixed(1),rt:+r.right.toFixed(1),g:glyph(e),lab:label(e),p:path(e),
               fs:parseFloat(getComputedStyle(e).fontSize)});
  }

  const kids=new Map();
  for(const c of ctls){const par=c.e.parentElement; if(!par)continue;
    if(!kids.has(par))kids.set(par,[]); kids.get(par).push(c);}
  const rows=[];
  for(const [par,cs] of kids){
    if(cs.length<2)continue;
    const wg=cs.filter(c=>c.g); if(wg.length<2)continue;
    const sorted=wg.slice().sort((a,b)=>a.x-b.x);
    let side=0;
    for(let i=1;i<sorted.length;i++){
      const a=sorted[i-1],b=sorted[i];
      const vOv=Math.min(a.bot,b.bot)-Math.max(a.y,b.y);
      if(vOv>Math.min(a.h,b.h)*0.5&&(b.x-a.rt)>-1)side++;
    }
    if(side<1)continue;
    const hs=wg.map(c=>c.g.gh);
    rows.push({par:path(par), n:wg.length,
               spread:+(Math.max(...hs)-Math.min(...hs)).toFixed(1),
               heights:hs.slice().sort((a,b)=>a-b),
               sig:wg.map(c=>c.lab).sort().join('|'),
               kids:wg.map(c=>({lab:c.lab,gh:c.g.gh,ink:c.g.ink,via:c.g.via,box:c.w+'x'+c.h,fs:c.fs}))});
  }

  // INVARIANT 3's POPULATION IS ICONS, NOT EVERY GLYPH, AND THE DIFFERENCE IS THE WHOLE NUMBER. Measured here:
  // over every glyph the distinct-height count is 20 PER GEOMETRY (22 as a union across three, and an earlier
  // draft of this comment published the union with no scope) and includes 155px, 137.5px and 120.3px entries - those are
  // whole Home CARDS measured through a Range over their multi-line contents. Publishing that as "the app has 22
  // icon sizes" would be #395's container-is-not-its-contents trap with the labels swapped. An icon is an SVG
  // box, or a text node that is ONE grapheme - which is this app's own idiom for an icon (the header hamburger,
  // the wave, the chevron, the pawn). Both counts are reported; only the icon one is asserted.
  const iconH={}, allH={};
  for(const c of ctls){ if(!c.g)continue;
    allH[String(c.g.gh)]=1;
    const txt=(c.e.innerText||c.e.textContent||'').trim();
    const one=[...txt].length<=2&&txt.length>0&&!/^[0-9A-Za-z]+$/.test(txt);
    if(c.g.via==='svg'||one){ if(!iconH[String(c.g.gh)])iconH[String(c.g.gh)]=[];
      if(iconH[String(c.g.gh)].length<3)iconH[String(c.g.gh)].push(c.lab); }
  }

  // INVARIANT 1 IS REPORTED HERE AND NOT ASSERTED - see the header. The list is what makes the deferral a
  // measurement rather than an estimate.
  const small=ctls.filter(c=>c.w<43.95||c.h<43.95).map(c=>({lab:c.lab,box:c.w+'x'+c.h,p:c.p}));

  return {ctls:ctls.length, byWhy, inBoard, nested, svgKid, covered, coveredList, boardFound:!!board,
          withGlyph:ctls.filter(c=>c.g).length,
          rows:rows.sort((a,b)=>b.spread-a.spread), iconH, allH:Object.keys(allH).map(Number), small};
};

// ── INVARIANTS 2 AND 3: THE NEGATIVE CONTROLS, WITH THEIR SCOPE, BECAUSE A COUNT WITH NO SCOPE CANNOT BE CHECKED
// Command for every row: `CT_INV_GEOS=<geo> CT_APP=<bundle> node gates/regress/26-invariants.js`. One geometry
// per run, 13 screens. BASELINES on the shipped #423 bundle at the same scope: kunal730 120/0, se 121/0; all
// three geometries together 364/0.
//   NC-A  rev-back fontSize 25->19 (pbar-top made UNIFORM)   md5 ecf82b971bc0   kunal730 119/1   se 120/1
//         -> the pin-LOCATION assertion only, `missing` half, naming every review screen the pin left. This is
//            a control over the REVERSE direction: a pinned known failure being silently FIXED. Note it does
//            NOT trip the per-screen pin-VALUE check, because a uniform row drops below the spread filter
//            before that check sees it - so the aggregate half is the only thing guarding that direction.
//   NC-B  rev-more fontSize 19->23                           md5 8b71e6249254   kunal730 115/5
//         -> pin-VALUE on 4 review screens (want [21,28] got [26,28]) + invariant 3's set, naming added 26.
//   NC-C  rev-summary-foot clamp 16px->22px                   md5 2dfc051c12aa   kunal730 119/1   se 119/2
//         -> the HEADLINE unpinned-spread assertion at rev-summary. At se it ALSO trips a 4b spill assertion,
//            which is a genuine second consequence of a 22px button at 320 wide and not a false red, so NC-C
//            is single-assertion at 375 and not at 320. Said rather than rounded off.
//   NC-D (rev-more 19->31) is NOT KEPT as a distinct control: it tripped the identical assertion set to NC-B at
//         #423's first pass, so counting it would inflate the number this ledger exists to measure.
// TWO GEOMETRY AXES, which the first pass did not have: the #423 antagonist pointed out that 178 of the then-266
// assertions lived at se and short375 and no control had ever touched them. NC-A and NC-C now run at se too.
// short375 is still uncontrolled and that is a named hole, not a silence.
//
// TWO ASSERTIONS IN THIS FILE HAVE NO DELIBERATE CONTROL, NAMED HERE RATHER THAN LEFT TO BE DISCOVERED:
//  (1) the `appearedSomewhereNew` half of the pin-location assertion. No trial bundle makes a pinned spread
//      appear on a NEW screen. It HAS been observed firing, on the geometry axis: running this gate at 390x844
//      before the pins were width-keyed reported every pinned class as appearedSomewhereNew. That is evidence
//      the half can fail, and it is not the screen-axis control the assertion is for.
//  (2) the `gone` direction of invariant 3's set. NC-B and NC-D only ever ADD a height.
// Also recorded: the `missing` half DID fail for real during this build, on my own change - the occlusion
// exclusion removed pbar-top from behind the ⋯ sheet and the assertion caught the stale `at` list.

// ── INVARIANT 2's PINS. NOTHING RED GOES ON MAIN, AND EVERY KNOWN FAILURE IS PINNED TO ITS MEASURED VALUE ─────
// The commission is explicit: "EXPECT THIS GATE TO GO RED IMMEDIATELY, ON THINGS NOBODY HAS LOOKED AT... Pin
// every known failure to its CURRENT MEASURED VALUE, exactly as 35-width-containment pins lesson-lines at
// over:38.9 with tol:0.6. The suite stays green today, and goes RED THE DAY A PINNED VALUE MOVES IN EITHER
// DIRECTION - including the day someone fixes it, which is correct, because a fix should have to update the pin
// deliberately."
//
// SIX CLASSES, MEASURED 2026-09-27 ON 8cd81ec (#422) AT ALL THREE GEOMETRIES. Two of them are the two the
// commission named by hand a fortnight ago and nothing had measured since; four are new.
//   pbar-top        Back 28 / More 21          spread 7    <- named in the flag: "Review pbar-top, 28 against 21"
//   lesson footer   27 / 22 / 27 / 22 / 22     spread 5    <- named in the flag: "Lesson footer, 27 / 22 / 22"
//   CHESS TRAINER   21.6 svg / 17 hamburger    spread 4.6  (20.7 / 17 at 320x568: the wordmark is font-sized)
//   pz-bottom       20 / 16 / 16 / 16 / 20     spread 4
//   home greeting   22 / 25 wave               spread 3
//   lesson practice 18 / 18 / 16 / 18          spread 2
//
// KEYED BY THE ROW'S MEMBER LABELS, NOT BY ITS DOM PATH. Five of these six rows sit at a path of `div>div>div`,
// so a path key would not tell them apart, and a gate that cannot tell two rows apart cannot pin one of them.
// The sorted label list is stable, unique and diagnostic - the log prints it, so a red says which row moved.
//
// AND THE PIN ASSERTS THE SET OF PLACES THE CLASS OCCURS, not merely that it is excused where it is found. A
// bare exclusion list would let pbar-top's 7px spread APPEAR ON A SIXTH SCREEN in silence, which is the
// frozen-denominator failure (#395) in miniature. `at` is the exact set of (geometry, screen) pairs where the
// class was measured; a new occurrence and a disappeared one both go red, and the log names which.
const PIN_ROWS=[
  {sig:'Back|More', h:{'*':[21,28]}, spread:7,
   // rev-more-sheet IS NOT IN THIS LIST AND WAS, UNTIL THE OCCLUSION EXCLUSION LANDED. pbar-top sits BEHIND the
   // ⋯ sheet, so its two buttons are now excluded as unreachable and the class legitimately stops occurring
   // there - 15 of 15 (geo, screen) pairs became 12. The `missing` half of the pin-set assertion is what caught
   // that, on my own change, which is the first evidence that half can fail at all.
   at:['kunal730/rev-ply31','kunal730/rev-last-engine','kunal730/rev-why-open','kunal730/rev-best-ply30',
       'se/rev-ply31','se/rev-last-engine','se/rev-why-open','se/rev-best-ply30',
       'short375/rev-ply31','short375/rev-last-engine','short375/rev-why-open','short375/rev-best-ply30'],
   why:'Review pbar-top: the Back chevron is 28px of ink and the More dots are 21. Named by hand in flag build-the-invariant-gate a fortnight before any test could see it; job lesson-footer-icons-consistent owns the fix.'},
  {sig:'Back a move|Close lesson|Forward a move|More for this lesson|Play or pause', h:{320:[22,22,22,27,27],375:[22,22,22,27,27],390:[23,23,23,27,27]}, spread:null,
   at:['kunal730/lesson-demo','se/lesson-demo','short375/lesson-demo'],
   why:'Lesson footer. THE BOX SAYS 27 AND THE INK SAYS 16.2, AND THE FIRST VERSION OF THIS LINE HAD IT BACKWARDS: it read "two 27px SVG arrows beside three 22px glyphs", which would send a fixer to shrink the arrows. The 27 is the chevrons viewBox; the polyline inside each paints 10.8 x 16.2, so the arrows are the SMALLEST ink in the bar and the three text glyphs at 22 are the largest. The flag names this row ("27 / 22 / 22 against one shared 20.25px font") from the same box method. 11-lesson.js asserts all five are >=20 and share a font size - which they do, fontSize 20.25 to the decimal - so it is green over exactly this spread, which is the finding gate11-is-green-over-the-very-glyph-spread-kunal-reported-2026-09-27. Heights are per WIDTH because the three text glyphs track fontSize (20 at 320, 20.25 at 375, 21.06 at 390) while the two SVG boxes do not scale at all.'},
  // THE `CHESS TRAINER|☰` PIN WAS HERE AND IT WAS NOT A DEFECT. Removed at #423 after both antagonists
  // measured it independently. It is the header of the TAB SCREEN mounted underneath Home's position:fixed
  // layer: elementFromPoint at each member's centre returns an unrelated div (25 of 25 and 15 of 15 sample
  // points), so a finger cannot reach either. Its 4.6px "spread" was also almost entirely viewBox padding - the
  // "wordmark SVG" is a 21.56 box around a pawn mark painting 17.28, against the hamburger's 17.00, a real
  // difference of 0.28px. Published in this build's first claim set as one of four newly-found inconsistencies;
  // it was three. The occlusion exclusion in ROWS() now removes both members from the population, so the row
  // does not appear at all and needs no pin. This is #393's rule - "in the DOM, laid out, on screen is NOT the
  // user can use it" - which this file's header cites for invariant 4a and which invariant 2 shipped without.
  {sig:'Next puzzle|Previous puzzle|↺ Reset|👁 Show|💡 Hint', h:{'*':[16,16,16,20,20]}, spread:4,
   at:['kunal730/puzzles','se/puzzles','short375/puzzles'],
   why:'Puzzle bottom row, and the same inversion as the lesson footer: the two arrows are a 20px BOX carrying 8 x 12 of ink, so they are the smallest thing in the row, not the largest, and the 16 is the line box of the whole string "💡 Hint" rather than of the emoji. Both numbers are reported in the log now (box and INK) so a fix is driven off the one a player sees.'},
  {sig:'Menu and settings|👋', h:{'*':[22,25]}, spread:3,
   at:['kunal730/home','se/home','short375/home'],
   why:'Home greeting row, and this one IS user-visible and hittable - the 46x46 home-menu button, glyph 22, whose centre elementFromPoint returns itself. The waving hand paints 25 against the menu glyph 22, at font size 13.33 against 20: the same shape as #347, a bare glyph left at a size chosen for something else.'},
  // #423, FOUND BY THE ANTAGONIST ON A SCREEN THE GATE COULD NOT REACH, which makes it the single most useful
  // entry in this table: it is the proof that "six rows, zero unpinned" was a statement about twelve screens and
  // not about the app. Solve the puzzle and pz-bottom re-renders from five controls to two.
  {sig:'Next puzzle|Previous puzzle', h:{'*':[16,20]}, spread:4,
   at:['kunal730/pz-solved','se/pz-solved','short375/pz-solved'],
   why:'Solved-puzzle bottom row: the back chevron is a 20px box painting 12px of ink, beside a full-width "Next >" whose line box is 16 and whose ink is 16 - so here the arrow really is the smaller of the two on BOTH measures, unlike its unsolved sibling. Reached only through PZ.states["train-solved"], which the twelve original screens did not include, so this row had a red the gate was structurally unable to produce on the commonest outcome in the Puzzles tab.'},
  {sig:'Flip board|Hints|More actions|Try again', h:{'*':[16,18,18,18]}, spread:2,
   at:['kunal730/lesson-practice','se/lesson-practice','short375/lesson-practice'],
   why:'Lesson practice row: "Try again" is 16px where its three neighbours are 18px.'}
];
const pinRow=(sig)=>PIN_ROWS.find(p=>p.sig===sig)||null;
// KEYED BY VIEWPORT WIDTH, NOT BY GEOMETRY NAME, and that is a correction the #423 antagonist forced. The first
// version keyed `h` and ICON_PIN on the geometry's NAME, so at any geometry the gate does not sweep by default
// the pin had no entry and the gate went RED ON A HEALTHY BUNDLE: measured `CT_INV_GEOS=kunal` (375x679, the
// shorter-phone column CLAUDE.md orders kept) 85 pass / 3 fail, and `CT_INV_GEOS=390` 84/4. Worse, one of those
// reds was the pin reporting `got [17,21.6]` - EXACTLY the value its own `why` text predicts for a 375-wide
// screen - because 'kunal' is not 'kunal730' though both are 375 wide. Width is the quantity the mechanism
// actually depends on: the text glyphs track fontSize, which this app scales with width (320 -> fs20,
// 375 -> fs20.25, 390 -> fs21.06), while an SVG's box does not scale at all. So a pin keyed on width expresses
// the mechanism, and a pin keyed on a name expressed only where it happened to be measured.
const widthOf=(g)=>L.GEOS[g].w;

// INVARIANT 3's PINNED SETS, one per geometry, measured on #422/8cd81ec by this gate's own first run. They
// differ between geometries only in the wordmark, which is font-sized (21.6 at 375 wide, 20.7 at 320).
const ICON_PIN={320:[16,17,18,19,20,21,22,24,25,27,28],
                375:[17,18,19,20,21,22,24,25,27,28],
                390:[17,18,19,20,21,22,23,25,27,28]};

// ── THE TWO POPULATION PINS THE ANTAGONIST'S VACUITY PROOF FORCED ──────────────────────────────────────────────
// V1: the headline assertion ("no unpinned row spreads more than 1px") was checked against ZERO rows on Home at
// all three swept geometries, because BOTH of Home's rows were pinned exceptions - so `unpinned` was the empty
// set and the assertion could not fail on the screen this project's own audit ranks #1 by risk. The antagonist
// then proved the predicate is satisfied by an empty set generally, using this file's OWN scanner extracted
// verbatim: break only the side-by-side test and `play-captures` goes from 2 rows to 0 with every assertion
// green. The aggregate floors did not catch it - `ivRows>=30` against 44 measured is 14 rows of slack, and
// play-captures and play-gameover carry 2 rows each and no pins, so 2 of 12 screens could lose their entire
// invariant-2 coverage in silence. This is the trap the header lists five costumes of, in its sixth: the pin
// list excused every row on Home, so THE PIN LIST WAS THE REASON THE ASSERTION COULD NOT FIRE THERE.
// The fix is to pin the POPULATION per screen, not a floor over the sweep: a screen that loses a row goes red
// and names it. A floor is what let this through; an exact count per (geometry, screen) cannot.
const ROW_PIN={
  'se/home':1,'se/play-captures':2,'se/play-gameover':2,'se/lesson-demo':3,'se/lesson-practice':2,
  'se/puzzles':2,'se/pz-solved':2,'se/rev-summary':2,'se/rev-ply31':3,'se/rev-last-engine':3,
  'se/rev-why-open':3,'se/rev-more-sheet':0,'se/rev-best-ply30':3,
  'kunal730/home':1,'kunal730/play-captures':2,'kunal730/play-gameover':2,'kunal730/lesson-demo':3,
  'kunal730/lesson-practice':3,'kunal730/puzzles':2,'kunal730/pz-solved':2,'kunal730/rev-summary':9,
  'kunal730/rev-ply31':3,'kunal730/rev-last-engine':3,'kunal730/rev-why-open':3,'kunal730/rev-more-sheet':0,
  'kunal730/rev-best-ply30':3,
  'short375/home':1,'short375/play-captures':2,'short375/play-gameover':2,'short375/lesson-demo':3,
  'short375/lesson-practice':2,'short375/puzzles':2,'short375/pz-solved':2,'short375/rev-summary':4,
  'short375/rev-ply31':3,'short375/rev-last-engine':3,'short375/rev-why-open':3,'short375/rev-more-sheet':0,
  'short375/rev-best-ply30':3};
const COVERED_PIN={
  'se/home':6,'se/play-captures':0,'se/play-gameover':0,'se/lesson-demo':0,'se/lesson-practice':0,
  'se/puzzles':0,'se/pz-solved':0,'se/rev-summary':23,'se/rev-ply31':1,'se/rev-last-engine':0,
  'se/rev-why-open':0,'se/rev-more-sheet':15,'se/rev-best-ply30':2,
  'kunal730/home':6,'kunal730/play-captures':0,'kunal730/play-gameover':0,'kunal730/lesson-demo':0,
  'kunal730/lesson-practice':0,'kunal730/puzzles':0,'kunal730/pz-solved':0,'kunal730/rev-summary':24,
  'kunal730/rev-ply31':0,'kunal730/rev-last-engine':1,'kunal730/rev-why-open':1,'kunal730/rev-more-sheet':17,
  'kunal730/rev-best-ply30':1,
  'short375/home':6,'short375/play-captures':0,'short375/play-gameover':0,'short375/lesson-demo':0,
  'short375/lesson-practice':0,'short375/puzzles':0,'short375/pz-solved':0,'short375/rev-summary':23,
  'short375/rev-ply31':1,'short375/rev-last-engine':0,'short375/rev-why-open':0,'short375/rev-more-sheet':17,
  'short375/rev-best-ply30':2};
// TWO OF THESE NUMBERS ARE THE INTERESTING ONES AND BOTH ARE STATED RATHER THAN LEFT TO BE NOTICED.
// `rev-more-sheet` pins 0 ROWS at every geometry. That is not the exclusion eating the sheet: the sheet's own 15
// buttons ARE hittable (elementFromPoint returns each one), they simply do not form a side-by-side row - the five
// action buttons are 345px full-width and stacked, and the five category chips are each wrapped so they are not
// direct siblings. What the occlusion exclusion removed there is the REVIEW SCREEN BEHIND THE SHEET, which is
// correct and is why `covered` is 15-17 on that state. Net: this screen contributes ZERO invariant-2 coverage
// and the sheet's own chip row is invisible to the invariant. Named, not hidden - jobs/invariant-2-sheet-rows.
// `rev-summary` pins 2 / 9 / 4 at 320 / 375x730 / 375x568 because the grade-table cells are pairs of NUMBERS in
// a scroller, so how many are in view is a property of the viewport. They are also vacuous as invariant-2 rows
// by construction: two digits at one font size cannot disagree. They inflate the count and prove nothing, and
// deciding whether to exclude them is a population question rather than a fix - same job.

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


// ── THE SECOND SCANNER: INK THAT SPILLS ONTO A SIBLING (invariant 4b) ─────────────────────────────────────────
// 4a above measures ink CUT BY a clipping ancestor. This one measures the other half of the same class, and
// the external supervisor filed it because 1553 assertions could not see an 8.83px instance of it live at
// HEAD: `class-spilled-ink-and-viewport-keyed-board-rows-2026-09-17`. Its words, and they are the spec:
// "Ink that overlaps a sibling is as invisible to a player as ink that is cut, and neither is covered today."
//
// THE MECHANISM, and every condition below is one clause of it: a box whose text cannot wrap (`nowrap`) and
// does not clip (`overflow-x: visible`) and does not fit (`scrollWidth > clientWidth`) paints its overflow
// OUTSIDE ITSELF, and where a sibling sits in that space two texts are drawn in the same place.
//
// FOUR THINGS THIS SCANNER GETS RIGHT THAT THE FIRST DRAFT OF IT DID NOT. All four were measured, on the
// #407 bundle at 375x568, with the probe that became this code - not reasoned about:
//
// (i) RANGE INK REPORTS THE UNTRUNCATED EXTENT, so a box that clips its own text reports ink where NOTHING IS
//     PAINTED. 4a's header already says this and it is exactly what makes a naive spill scan lie: the
//     player-bar name span reports "DukeKarlCountIsouard99" running 115.23px past its own box and 27.7px
//     across [pbar-rating-b] - and it paints not one of those pixels, because the span itself is
//     overflow:hidden with an ellipsis at 245.8. So the ink is CLAMPED to every ancestor whose overflow-x is
//     not `visible` before anything is measured, and a holder that clips on x is skipped outright: that row
//     belongs to 4a, which classifies it `signalled`.
//     A SCROLLER CLAMPS TOO, and deliberately: a finger can bring scrolled content back, which is what makes
//     it "not cut" for 4a - but it does not change what is painted on top of the neighbour RIGHT NOW.
//
// (ii) A SPILL INTO A GAP IS NOT A COLLISION, so the sibling clause is not decoration. THE EXAMPLE THIS
//     COMMENT USED TO GIVE WAS WRONG AND THE ANTAGONIST PASS MEASURED IT: it said the lesson row's title
//     "Italian Game" (nowrap, 73px box, scroll 80, 6.97px past its right edge) "is reported as a NEAR row
//     every run". There are ZERO near rows anywhere - `"near":0` in all 36 head screen-scans and in 48 more
//     of the antagonist's - because that title's holder CLIPS on x, so 4a owns it (it is logged SIGNALLED,
//     with an ellipsis) and 4b skips it before the gap ever comes up. The 6.97px is never painted. The gap
//     case is real, it is what `near` exists for, and today the only thing that exercises it is the fixture's
//     s2 - which is the honest statement and is why that fixture case is not optional.
//
// (ii-bis) TWO PRACTICE STATES ARE NOT SWEPT AND THEY DO FIRE. `practice-wrong` and `practice-complete` at
//     375x568 carry a REAL spill on the shipped #413 bundle - "↻ Again" 13.89px to the left of its 36px
//     button, 7.89 x 16px of it over the 💡 beside it, in a 192px row of [46, 46, 36, 46] - and it survives
//     BOTH samples, so it is not the settling frame that produced the same numbers once at `practice-m0`
//     (see the two-sample comment in the run loop). Adding those states would make this gate RED on a
//     healthy bundle, and the fix is a product change to a label that a player reads, which is an amber call
//     wanting a written default first. So the states are named here and filed as
//     `spill-practice-row-after-a-wrong-move-375x568` rather than absorbed into a green, and the next build
//     takes them. Two things are measured and worth carrying: no ink-on-ink was found under that overlap (it
//     is a box collision, not two texts on top of each other), and the same row is clean at 320x568 and
//     375x730, so it is the wide-and-short corner again.
//
// (iii) THE Y AXIS IS SOMEBODY ELSE'S. Every vertical row this scanner would see is ink overshooting its own
//     line box by 2-3px - the tile emoji, the player-bar kings, a stat number - which is E2/E3 in 4a above,
//     already named and already bound to its mechanism. Asserting over it here would re-file the avatar
//     residual as a new defect under a second name. So 4b is INLINE AXIS ONLY, said out loud rather than
//     left as an accident of the predicate.
//
// (iv) THE SIBLING MUST BE UNDER THE PART THAT IS OUTSIDE THE BOX, not merely near it. The overlap is
//     computed against the spill REGIONS ([painted.l, box.l] and [box.r, painted.r]) rather than against the
//     ink as a whole, or every text in a tight row overlaps its neighbour by construction.
//
// (v) `scrollWidth > clientWidth` IS NOT A USABLE TEST FOR "THE TEXT DOES NOT FIT", and this one cost a
//     control run. The first version of 4b required it, on the reasoning that a box whose content fits has
//     nothing to spill - and it read TRUE on the #407 button (75 against 84) and FALSE on a `<span>` whose
//     text overflows it by 115px, because the scrolling area is only defined for a scroll container and
//     Chromium reports `scrollWidth == clientWidth` for an `overflow:visible` span. So NC-C below - the
//     player-bar name span with its `overflow:hidden` removed, which paints an untruncated 22-character name
//     straight across the rating beside it - went TEN RED ON 4a AND ZERO ON 4b, and the half the control was
//     built to prove was the half it could not reach. The clause is gone: the ink and the padding box are
//     measured directly, which is what the assertion is about, and the element's type no longer decides
//     whether it is eligible. `cs`/`ss` are still REPORTED on every row, because they are useful to read and
//     useless to branch on.
//
// WHAT 4b DOES NOT COVER, because absence is the hardest thing to measure: a spill into a gap (reported, not
// asserted); the block axis (above); ink-on-ink, so a spill onto a sibling whose own text happens to sit
// elsewhere in its box still counts - deliberately, since the neighbour's text can move with one string
// change; a box that wraps its text and grows instead; and anything on a screen not in SCREENS.
// FOUR OF THOSE GAPS WERE MEASURED BY THE ANTAGONIST PASS AT #413 RATHER THAN REASONED ABOUT, through this
// gate's own SPILL scanner at 375x761, and the numbers are here so nobody has to rediscover them:
//   - a spill onto a SIBLING fires (20.80px), and so does one onto a NEPHEW - a child of a sibling - (25.53px)
//     and one onto an ABSOLUTELY POSITIONED element (12.22px), because all three still leave the sibling's
//     RECT under the ink. Good: the predicate is wider than its name suggests.
//   - a spill onto a sibling's WRAPPED content is DEMOTED TO A NEAR MISS (33.06px) even though 3.72px of real
//     ink-on-ink was measured under it, because the sibling's rect had moved out from under the spill region
//     while its text had not. That is the one shape 4b gets wrong today. None was found live in 84 screen-scans.
// THE ANTI-FLAKE FILTER HAS A HOLE OF ITS OWN, also measured: it keys rows on `holder|text|side`, so a label
// whose STRING changes between the two samples is demoted twice and the spill disappears. Proved on the #407
// bundle - untouched it reports the 8.83px defect, and with only the label's text changed between samples the
// same gate reads 200/0 on that broken bundle. No natural instance exists on these screens (zero key changes
// across 2/8/7/93 labels on four states), but a debounced engine sentence is exactly the shape that would.
//
// AND ONE THAT IS A POTENTIAL FALSE POSITIVE RATHER THAN A GAP, so it is named here instead of being
// discovered by whoever next reads a red: this app keeps several screens MOUNTED AT ONCE (Home is a fixed
// full-viewport layer, `rev-summary` is `fixed inset:0 zIndex:500` and opaque, and menu/look/setup are
// sheets), and both scanners walk the whole of `document.body`. So a spill on a screen the player cannot
// currently see would be reported as though it were on screen. 4a has had exactly this property since #404
// and it has never mis-fired, because `vis()` still rejects `display:none` and the app unmounts most of
// what it hides - and the alternative is the probe #393 tried three times and shipped none of, where "is
// this element still the thing under your finger" reported six screens of false defects and then EXCUSED
// the real one because the covering element was big. An assertion that cannot be grounded is worse than no
// assertion; a named limitation is neither.
const SPILL = function(){
  const out=[], near=[];
  let nowrapBoxes=0, inked=0;
  const vis=(el)=>{
    for(let e=el;e&&e!==document.documentElement;e=e.parentElement){
      const s=getComputedStyle(e);
      if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return false;
      if(parseFloat(s.opacity)===0)return false;
    }
    return true;
  };
  // the nearest non-inline box the text sits in. `overflow` does not apply to an inline box and its
  // clientWidth is defined as 0, which is the degenerate case 4a's own fixture caught.
  const holder=(el)=>{for(let e=el;e&&e!==document.body;e=e.parentElement){if(getComputedStyle(e).display!=='inline')return e;}return null;};
  const padBox=(e)=>{
    const r=e.getBoundingClientRect();
    if(!e.offsetWidth||!e.offsetHeight)return null;
    const t=getComputedStyle(e).transform;
    const m=new DOMMatrixReadOnly(t==='none'?'':t);
    if(Math.abs(m.b)>1e-6||Math.abs(m.c)>1e-6)return 'rotated';
    const sx=r.width/e.offsetWidth, sy=r.height/e.offsetHeight;
    return {l:r.left+e.clientLeft*sx, t:r.top+e.clientTop*sy, r:r.left+(e.clientLeft+e.clientWidth)*sx, b:r.top+(e.clientTop+e.clientHeight)*sy};
  };
  // (i): the x range this ink can actually PAINT into - clamped by every ancestor that does not let it out.
  const paintedX=(el,ink)=>{
    let l=ink.l, r=ink.r;
    for(let e=el;e&&e!==document.documentElement;e=e.parentElement){
      const s=getComputedStyle(e);
      if(s.display==='inline')continue;
      if(s.overflowX==='visible')continue;
      const cb=padBox(e);
      if(!cb||cb==='rotated')continue;
      l=Math.max(l,cb.l); r=Math.min(r,cb.r);
    }
    return {l,r};
  };
  const path=(el)=>{const p=[];for(let e=el;e&&e!==document.body&&p.length<4;e=e.parentElement){const d=e.getAttribute&&e.getAttribute('data-ct');p.push(d?'['+d+']':e.tagName.toLowerCase());}return p.join('<');};
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n=w.nextNode();n;n=w.nextNode()){
    const t=(n.nodeValue||'').trim(); if(!t) continue;
    const el=n.parentElement; if(!el||!vis(el)) continue;
    const h=holder(el); if(!h) continue;
    const hs=getComputedStyle(h);
    if(hs.whiteSpace!=='nowrap'&&hs.whiteSpace!=='pre') continue;   // the mechanism: text that cannot wrap
    nowrapBoxes++;
    if(hs.overflowX!=='visible') continue;                          // it clips its own text -> 4a's row, see (i)
    const hb=padBox(h); if(!hb||hb==='rotated') continue;
    const rg=document.createRange(); rg.selectNodeContents(n);
    const rects=[...rg.getClientRects()].filter(r=>r.width>0.2&&r.height>0.2);
    if(!rects.length) continue;
    inked++;
    const ink={l:Math.min(...rects.map(r=>r.left)),t:Math.min(...rects.map(r=>r.top)),r:Math.max(...rects.map(r=>r.right)),b:Math.max(...rects.map(r=>r.bottom))};
    const px=paintedX(el,ink);
    const overL=hb.l-px.l, overR=px.r-hb.r;
    const over=Math.max(overL,overR);
    if(over<=1.0) continue;
    // (iv) the sibling must be under the part that is OUTSIDE the box.
    const par=h.parentElement;
    const regions=[];
    if(overL>1.0) regions.push([px.l,hb.l]);
    if(overR>1.0) regions.push([hb.r,px.r]);
    let hit=null;
    if(par) for(const c of par.children){
      if(c===h||c.contains(h)) continue;
      const cr=c.getBoundingClientRect();
      if(cr.width<0.5||cr.height<0.5) continue;
      if(getComputedStyle(c).visibility==='hidden') continue;
      const oy=Math.min(ink.b,cr.bottom)-Math.max(ink.t,cr.top);
      if(oy<=1.0) continue;
      for(const [a,z] of regions){
        const ox=Math.min(z,cr.right)-Math.max(a,cr.left);
        if(ox>1.0){ hit={sib:(c.getAttribute('data-ct')||c.tagName.toLowerCase()), ox:Math.round(ox*100)/100, oy:Math.round(oy*100)/100}; break; }
      }
      if(hit) break;
    }
    // THE PARENT'S OWN WIDTH AND CHILD WIDTHS GO IN THE ROW, because a spill is a budget failure and the
    // budget is a property of the ROW - #412's rule, publish the scope with the count. The first run of this
    // gate reported a 36px button where the same state measured in isolation gives 74.88, and the row width
    // is the number that says which layout was on screen.
    const pr=par?par.getBoundingClientRect():null;
    const row={over:Math.round(over*100)/100, text:t.slice(0,28), el:path(el),
      holder:(h.getAttribute('data-ct')||h.tagName.toLowerCase()), tag:h.tagName.toLowerCase(),
      cs:h.clientWidth, ss:h.scrollWidth,
      parW:pr?Math.round(pr.width*100)/100:null,
      kids:par?[...par.children].map(c=>Math.round(c.getBoundingClientRect().width*100)/100):null,
      ink:[Math.round(px.l*100)/100,Math.round(px.r*100)/100], box:[Math.round(hb.l*100)/100,Math.round(hb.r*100)/100],
      side:(overR>overL?'right':'left'), onSib:hit};
    if(hit) out.push(row); else near.push(row);
  }
  return {rows:out, near, seen:{nowrapBoxes, inked}};
};

// ── 4b's OWN UNIT TEST. Six shapes: ONE must be reported as a spill, ONE must be demoted to a near miss,
// and FOUR must not be reported at all. #388/#391's rule. (The first write-up of this said "four of them
// cases the predicate must reject", which undercounts: five of the six must not come out as a defect.) ──────
// Built from HTML the scanner has never seen, so no assertion here can be satisfied by the scanner's own
// bookkeeping - which is the fault the #404 antagonist vetoed in this very file.
const FIXTURE2 = function(){
  const wrap=document.createElement('div');
  wrap.id='ct-spill-fixture';
  wrap.setAttribute('style','position:fixed;left:0;top:300px;width:360px;z-index:2147483000;background:#111;color:#ccc;font:13px/1.3 system-ui');
  const btn='padding:0;border:0;font:13px/1.3 system-ui;background:#222;color:#ccc;height:20px';
  wrap.innerHTML=[
    // s1 MUST ACCEPT: the #407 defect's shape - nowrap, does not fit, does not clip, and a sibling under the spill.
    '<div style="display:flex;width:120px"><button style="'+btn+';width:40px;white-space:nowrap;flex:0 0 40px">SPILLONE</button><button style="'+btn+';width:80px;flex:0 0 80px">r1</button></div>',
    // s2 MUST REJECT: the same spill landing in a GAP. "Italian Game" on the shipped bundle, every geometry.
    '<div style="display:flex;width:200px"><button style="'+btn+';width:40px;white-space:nowrap;flex:0 0 40px">SPILLTWO</button><button style="'+btn+';width:40px;margin-left:70px;flex:0 0 40px">r2</button></div>',
    // s3 MUST REJECT: the holder clips its own text, so 4a owns the row and nothing is painted outside.
    '<div style="display:flex;width:120px"><div style="width:40px;white-space:nowrap;overflow:hidden;flex:0 0 40px">SPILLTHREE</div><div style="width:80px;flex:0 0 80px">r3</div></div>',
    // s4 MUST REJECT: the text WRAPS. A box that grows instead of spilling is not this defect.
    '<div style="display:flex;width:120px"><div style="width:40px;white-space:normal;flex:0 0 40px">SPILLFOUR SPILLFOUR</div><div style="width:80px;flex:0 0 80px">r4</div></div>',
    // s5 MUST REJECT: nowrap and a sibling, but the text FITS its own box.
    '<div style="display:flex;width:200px"><button style="'+btn+';width:120px;white-space:nowrap;flex:0 0 120px">S5</button><button style="'+btn+';width:80px;flex:0 0 80px">r5</button></div>',
    // s6 MUST REJECT, and this is the one that proves the PAINT CLAMP in (i) is doing something: the sibling
    // IS under the spill, and an ancestor clips the spill away before it reaches the sibling. Without the
    // clamp this reads as a 10px collision; with it the painted ink stops at the holder's own right edge.
    '<div style="width:40px;overflow:hidden"><div style="display:flex;width:90px"><button style="'+btn+';width:40px;white-space:nowrap;flex:0 0 40px">SPILLSIX</button><button style="'+btn+';width:50px;flex:0 0 50px">r6</button></div></div>'
  ].join('');
  document.body.appendChild(wrap);
  return true;
};
const FIXTURE2_WANT=[
  [/^SPILLONE$/,  'spill', 'the #407 shape: nowrap, does not fit, does not clip, a sibling under the spill - THE defect 4b exists for'],
  [/^SPILLTWO$/,  'near',  'a spill into a GAP is not a collision - "Italian Game" does this on the shipped bundle at every geometry'],
  [/^SPILLTHREE$/,'none',  'a holder that clips its own text is 4a\'s row, not 4b\'s, and paints nothing outside itself (Range ink lies here)'],
  [/^SPILLFOUR/,  'none',  'text that WRAPS does not spill - the box grows instead'],
  [/^S5$/,        'none',  'nowrap with a sibling but the text FITS: no layout overflow, no spill'],
  [/^SPILLSIX$/,  'none',  'the spill is clipped away by an ancestor before it reaches the sibling - this is what the paint clamp is for']
];

// ── THE SCREENS. Every state is named here rather than inline so "what was checked" is one list. ──────────────
const SCREENS=[
  ['home',            async(b)=>{await b.home();}],
  ['play-captures',   async(b)=>{await P.states['pp-captures'](b);}],
  ['play-gameover',   async(b)=>{await P.states['pp-mate'](b);}],
  ['lesson-demo',     async(b)=>{await LS.states['demo-end'](b);}],
  // #413, AND THE GATE COULD NOT HAVE SEEN 4b's DEFECT WITHOUT IT. The 8.83px spill the external supervisor
  // measured is on the lesson PRACTICE row - the four buttons under the board after "Now I'll try it" - and
  // this file's eleven states did not include it. `48-lesson-flow.js` drives that row with 221 assertions and
  // pins each button's rect at four geometries; what it does not do is compare a label's ink to its own box,
  // which is the whole of 4b. Two gates over one row, each blind to the other's question.
  ['lesson-practice', async(b)=>{await LS.states['practice-m0'](b);}],
  ['puzzles',         async(b)=>{await PZ.states['train'](b);}],
  // #423, AND IT IS THE ANTAGONIST'S FINDING RATHER THAN A TIDY-UP. The twelve screens had the UNSOLVED puzzle
  // board only. The moment the player solves it, `pz-bottom` re-renders from five controls to two - a 46x44
  // back chevron and a full-width `Next >` - and that row's glyph heights are 20 against 16, a spread of 4 at
  // all three geometries, whose signature was in no pin. So the headline invariant-2 assertion had a RED it was
  // structurally unable to produce, on the commonest outcome in the Puzzles tab. Twelve screens is not the app,
  // and "zero unpinned spreads" is a claim about what was visited.
  ['pz-solved',       async(b)=>{await PZ.states['train-solved'](b);}],
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
// #413 MAKES IT A TABLE, ONE ROW PER GEOMETRY, AND THE SECOND ROW IS THE FINDING OF THE PASS. Adding the
// 375x568 column put this residual on a SECOND geometry, and the numbers there are not merely similar to the
// 320x568 ones - they are THE SAME NUMBERS: [data-ct="rev-best"] is clientWidth 45 against scrollWidth 86 at
// both, "Qxd7" cut 27.74px and "›" 36.1px at both. THE ROW EXPLAINS IT AND I MEASURED THE WRONG ROW FIRST:
// [data-ct="rev-move-line"] and [data-ct="rev-compact"] are 286.00px at BOTH 320x568 and 375x568, and
// 371.03px at 375x679 and 375x730. The first version of this comment said "both have the same 230.88px
// board" - 230.88 is the LESSON practice row, measured in the same pass for the other half of this work and
// carried across into an explanation of a different screen. The antagonist pass disputed it with a
// measurement and it was wrong by 33.12px, INSIDE THE ASSERTION STRING BELOW, which the log prints twice a
// run. The thesis survives the correction: the review row follows the board, the board is fit to HEIGHT, so
// two viewports of the same height give the same row whatever their width.
// AND THE CLAIM THAT FOLLOWED IT WAS TOO BROAD. "Every SHORT phone" is not what this measures: at 375x679
// `rev-best` is clientWidth 100 against scrollWidth 100 and nothing is cut at all. So it is the two 568-tall
// columns that carry it, and what a taller viewport buys is a wider row (371.03) rather than a wider phone.
// Either way a defect filed as "at 320 the Review screen says the best move was Q" is NOT a smallest-phone
// defect, and the flag `rev-best-reads-best-Q-at-320` says "nobody on Kunal's phone would ever see it" on the
// strength of one geometry. Pinned per geometry with its own count so it still goes red if it moves in either
// direction at either size, which is what a pin is for; it is Kunal's to close (needsKunal, P1, on the Desk).
const PINNED=[{state:'rev-best-ply30',geo:'se',anc:'rev-best',cuts:2,tol:3.5},
              {state:'rev-best-ply30',geo:'short375',anc:'rev-best',cuts:2,tol:3.5}];
const pinFor=(g,name)=>PINNED.find(p=>p.geo===g&&p.state===name)||null;

// #413 ADDS short375 (375x568), AND IT IS THE POINT OF THE PASS RATHER THAN A TIDY-UP: 4b's defect is
// INVISIBLE at 320x568 and at 375x730 and appears only in the wide-and-short corner, because the label's
// branch is chosen by the BOARD width (which is the same 230.88 at 375x568 and 320x568) while the row's own
// width is not. `35-width-containment.js` gained this column at #406 for the same corner. It is the only
// size in lib.js GEOS with width >= 360 AND height <= 600.
// CT_INV_GEOS narrows the geometry loop for the negative-control loop ONLY. It is opt-in, it is printed
// loudly when set, and gates.sh never sets it - a filter that could reduce coverage in silence is the
// stale-bundle trap wearing another costume. Any control result taken with it set MUST publish the command
// alongside its count: two of six control results published for gate 49 turned out to be subset runs with
// bare numbers (#411, #412), which nobody could reproduce.
const ALL_GEOS=['se','kunal730','short375'];
const GEOS=process.env.CT_INV_GEOS?process.env.CT_INV_GEOS.split(','):ALL_GEOS;

L.run(async()=>{
  if(process.env.CT_INV_GEOS) L.note('!! CT_INV_GEOS='+process.env.CT_INV_GEOS+' - GEOMETRY-NARROWED RUN, NOT full coverage. '+GEOS.length+' of '+ALL_GEOS.length+' geometries.');
  for(const g of GEOS){
    const b=await L.launch({geo:g,store:R.SEED,name:'inv-'+g});
    await b.open();
    L.note(g+' ('+L.GEOS[g].label+')  stamp '+(await b.stamp()));
    let totalRows=0, totalSkipped=0, seenAny=0, totalSpill=0, nowrapSeen=0, totalTransient=0, measuredScreens=0;
    let ivRows=0, ivCtls=0, ivNested=0, ivSvgKid=0, ivCovered=0, ivBoardExcluded=0, ivSeenPins=new Set(), ivIcon={}, ivAllH=new Set(), ivSmall=new Map();
    for(const [name,go] of SCREENS){
      let reached=true, res=null;
      try{ await go(b); }catch(e){ reached=false; L.say(false,g+' '+name+': the state could not be reached at all - every ink assertion on this screen is UNRUN, not green',String(e).slice(0,140)); }
      if(!reached) continue;
      await b.settle(450);
      res=await b.page.evaluate(SCAN);

      /* ── INVARIANT 2: ONE ICON SIZE PER CONTROL ROW ──────────────────────────────────────────────────
         Every control row's glyph heights must agree within 1px. Unpinned spread is a FAIL; the six
         classes measured on #422 are pinned to their exact heights per geometry, so this goes red the
         day one of them moves in EITHER direction - a fix included, deliberately, so the pin has to be
         retired by hand rather than decaying into an excuse. */
      const iv=await b.page.evaluate(ROWS);
      ivRows+=iv.rows.length; ivCtls+=iv.ctls; ivNested+=iv.nested; ivSvgKid+=iv.svgKid; for(const h of iv.allH) ivAllH.add(h);
      for(const k of Object.keys(iv.iconH)){ if(!ivIcon[k])ivIcon[k]=new Set(); iv.iconH[k].forEach(x=>ivIcon[k].add(x)); }
      for(const sm of iv.small) ivSmall.set(sm.lab+' '+sm.box, sm.p);
      L.note('    inv2 population: '+iv.ctls+' outermost controls '+JSON.stringify(iv.byWhy)+', '+iv.withGlyph+' with a glyph, '+iv.rows.length+' side-by-side rows; excluded '+iv.nested+' nested, '+iv.svgKid+' svg-internal, '+iv.covered+' occluded, '+iv.inBoard+' in the board (board found: '+iv.boardFound+')');
      for(const c of iv.coveredList) L.note('      OCCLUDED (not a control a finger can reach) '+c.lab+' '+c.box+'  centre hits '+c.hitWas);
      ivCovered+=iv.covered; ivBoardExcluded+=iv.inBoard;
      const rk=g+'/'+name;
      if(Object.prototype.hasOwnProperty.call(ROW_PIN,rk)){
        L.say(iv.rows.length===ROW_PIN[rk], g+' '+name+': the screen still presents the '+ROW_PIN[rk]+' side-by-side control rows it presented on #423 - pinned per screen because the headline assertion below is satisfied by an empty set, and a floor over the whole sweep had 14 rows of slack to hide a screen going silent in',
          {want:ROW_PIN[rk], got:iv.rows.length, rows:iv.rows.map(r=>r.sig)});
        L.say(iv.covered===COVERED_PIN[rk], g+' '+name+': exactly '+COVERED_PIN[rk]+' controls are excluded as occluded, as on #423 - an exclusion that grows is coverage lost, and this one can only ever hide a defect rather than invent one, so it is pinned and not merely counted',
          {want:COVERED_PIN[rk], got:iv.covered, which:iv.coveredList});
      } else {
        L.note('      NOT PINNED at this geometry: row and occlusion counts are REPORTED here, not asserted (rows '+iv.rows.length+', occluded '+iv.covered+'). Only the three swept geometries carry population pins.');
      }

      const spread=iv.rows.filter(r=>r.spread>1.05);
      const unpinned=[], pinMoved=[];
      for(const r of spread){
        const pin=pinRow(r.sig);
        if(!pin){ unpinned.push(r); continue; }
        ivSeenPins.add(pin.sig+'@'+g+'/'+name);
        const want=pin.h[widthOf(g)]||pin.h['*'];
        const got=r.heights;
        const same=want&&want.length===got.length&&want.every((v,i)=>Math.abs(v-got[i])<=0.6);
        if(!same) pinMoved.push({sig:r.sig,want,got});
      }
      L.say(unpinned.length===0, g+' '+name+': every control row that is not a pinned known failure has ONE glyph height across the row, within 1px - the relationship assertion this suite had none of (invariant 2, Kunal 2026-09-15)',
        unpinned.length? {rows:unpinned.map(r=>({row:r.par,spread:r.spread,kids:r.kids}))}
                        : {rowsChecked:iv.rows.length, pinnedHere:spread.length, worstAllowed:spread.length?Math.max(...spread.map(r=>r.spread)):0});
      L.say(pinMoved.length===0, g+' '+name+': every pinned invariant-2 failure still measures EXACTLY what it measured on #422 - a pin that moves is red whether it got better or worse, so a fix has to retire its pin on purpose',
        pinMoved.length? pinMoved : {pinsHere:spread.map(r=>r.sig)});
      for(const r of spread) L.note('    INV2 PINNED spread '+r.spread+'px  '+r.par+'  '+r.kids.map(k=>k.lab+' box '+k.gh+' INK '+k.ink+' ('+k.via+',fs'+k.fs+')').join(' | '));
      for(const r of unpinned) L.note('    INV2 UNPINNED spread '+r.spread+'px  '+r.par+'  '+r.kids.map(k=>k.lab+' box '+k.gh+' INK '+k.ink+' ('+k.via+',fs'+k.fs+')').join(' | '));

      /* ── THE GRADE LADDER MUST ACCOUNT FOR EVERY MOVE (#421) ────────────────────────────────────────
         jobs/split-excellent-out-of-best. `classify()` (chess.jsx:347) produces SIX grades including
         Excellent, and `_sideStats` (chess.jsx:3339) used to fold it away with
         `else if(L==='Best'||L==='Excellent')c.Best++;` - so every Excellent move in every game was
         counted as Best, the summary showed NINE grades where US-R03 (chess.jsx:4425) and chess.com both
         say ten, and the Best column the user read was not a Best count. Measured on the Opera Game: White
         Best was 6 and is now Best 5 + Excellent 1; Black was 9 and is now 7 + 2.

         THIS IS THE INVARIANT THAT WOULD HAVE CAUGHT IT THE DAY THE BRANCH WAS WRITTEN, and it is worth
         more than another hand-written expectation because it needs no known-good answer - only internal
         consistency. Every ply lands in exactly ONE bucket: `_sideStats` counts Book with an early return,
         and `Miss` RELABELS Mistake or Blunder (chess.jsx:3266) rather than sitting on top of one, so the
         buckets PARTITION. That was measured by the orchestrator across seven real games before this gate
         was written (the brief's warning that Miss might overlay was withdrawn), which is why the form
         here is the simple sum and not sum-minus-Miss. Getting that backwards would have produced a gate
         that fails on correct output, which is worse than no gate.

         The per-side ply counts are the FIXTURE's: R.states['summary'] imports the Opera Game, 17 white
         moves and 16 black. If that fixture ever changes these two numbers go red, and that is correct -
         they are not a property of the app, they are a property of the game being graded, and the gate
         says so rather than deriving them from the thing under test. */
      if(name==='rev-summary'){
        const LADDER=['Brilliant','Great','Best','Excellent','Good','Book','Inaccuracy','Miss','Mistake','Blunder'];
        const grades=await b.page.evaluate((LAD)=>{
          const panel=document.querySelector('[data-ct="rev-summary"]');
          if(!panel)return null;
          const rows=[...panel.querySelectorAll('div')]
            .filter(d=>/1fr 56px 56px/.test(d.style.gridTemplateColumns||''))
            .map(d=>(d.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean))
            .filter(c=>c.length>=3&&LAD.indexOf(c[0])>=0);
          const out={};
          for(const c of rows){const w=parseInt(c[c.length-2],10),bk=parseInt(c[c.length-1],10);
            if(Number.isFinite(w)&&Number.isFinite(bk))out[c[0]]={w,b:bk};}
          return out;
        },LADDER);
        L.say(!!grades,g+' rev-summary: the grade table was found and read, so the ladder assertions below are not vacuous',grades&&Object.keys(grades).length);
        if(grades){
          const got=Object.keys(grades);
          L.say(got.length===10,g+' rev-summary: the summary shows all TEN grades US-R03 specifies - Excellent is its own row and is not folded into Best (#421)',{rows:got.length,got});
          L.say(got.indexOf('Excellent')>=0,g+' rev-summary: Excellent has its own bucket',got.join(','));
          L.say(JSON.stringify(got)===JSON.stringify(LADDER),g+' rev-summary: the ten rows are in LADDER order, best to worst',got.join(','));
          const sum=(sd)=>LADDER.reduce((a,k)=>a+((grades[k]&&grades[k][sd])||0),0);
          const W=sum('w'), B=sum('b');
          L.note('      grade ladder: '+LADDER.map(k=>k+' '+(grades[k]?grades[k].w+'/'+grades[k].b:'-')).join(', '));
          L.say(W===17,g+' rev-summary: WHITE grade counts sum to the 17 moves White played - every ply is in exactly one bucket, so no category is silently dropped (#421)',{sum:W,movesPlayed:17});
          L.say(B===16,g+' rev-summary: BLACK grade counts sum to the 16 moves Black played (#421)',{sum:B,movesPlayed:16});
        }
      }
      seenAny+=res.seen.inked;
      totalRows+=res.rows.length; totalSkipped+=res.skipped.length;
      // PRESENCE FIRST: an empty screen scans clean, so a zero-ink screen is not evidence of anything (#385).
      L.say(res.seen.inked>=6, g+' '+name+': the screen actually painted text for the scanner to measure - a clean result on an empty screen is not a green', res.seen);
      const pin=pinFor(g,name);
      const isPinned=(r)=>!!pin&&r.anc===pin.anc;
      const rows=res.rows.filter(r=>!isPinned(r));
      const pinnedRows=res.rows.filter(isPinned);
      const worst=rows.slice().sort((a,c)=>c.cut-a.cut)[0];
      L.say(rows.length===0, g+' '+name+': NO text node is cut by the box that clips it - ink measured against the nearest overflow:hidden/clip ancestor, not the viewport',
        rows.length? {cuts:rows.length, worst} : {cuts:0, inked:res.seen.inked, clippedChecks:res.seen.clipped, excused:res.other.length, pinned:pinnedRows.length});
      if(pin){
        // The pinned residual, asserted on its own so it is in the log every run rather than implied by a
        // filter nobody reads. It is on Kunal's Decision Desk; see the PINNED comment above.
        L.say(pinnedRows.length===pin.cuts, g+' '+name+': the pinned residual is exactly where it was left - "'+pin.anc+'" still cuts '+pin.cuts+' text nodes at '+L.GEOS[g].label+' (the best-move pill reads "best Qx"). The SAME two cuts to the hundredth at 320x568 and 375x568, because [data-ct="rev-move-line"] measures 286.00px at both - it follows the board and the board is fit to HEIGHT - against 371.03px at 375x679 and 375x730, where the pill is client 100 / scroll 100 and nothing is cut. So this is not a narrow-phone defect. RED here means it MOVED: fixed, and this pin comes out, or worse, and it needs looking at',
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

      // ── INVARIANT 4b, THE OTHER HALF OF THE SAME CLASS. #413. ──────────────────────────────────────────
      // TWO SAMPLES, AND THE SECOND ONE IS NOT CEREMONY - IT IS THE FIRST THING THIS ASSERTION GOT WRONG.
      // Its first run at head reported a 13.89px spill on the practice row: "↻ Again" in a 36px button
      // (scroll 50) painting 7.89px over the 💡 beside it, with the row measured at 192px. Real numbers, a
      // real element, and NOT A DEFECT: the same state measured in isolation gives a 230.88px row and a
      // 74.88px button that fits, and the spill did not reappear in three single-geometry runs or two further
      // full runs. The lesson board is FIT TO HEIGHT, so between mount and the final layout pass the row is
      // briefly narrower, and a scan can land in that frame. #387's rule is "settle past the thing you are
      // racing, then prove it by running twice and getting the same numbers" - so the gate does the running
      // twice ITSELF, per screen, and reports only what is in BOTH samples. A spill is a static property of a
      // layout; one that appears in a single frame is the fit in progress. The transients are NOTED rather
      // than dropped silently, because "it was flaky" is a measurement too and the next reader needs the
      // number. Without this the assertion is worse than no assertion (CLAUDE.md), and it would have gone red
      // on a healthy bundle roughly one run in five.
      const sp1=await b.page.evaluate(SPILL);
      await b.settle(260);
      const sp=await b.page.evaluate(SPILL);
      const skey=(r)=>r.holder+'|'+r.text+'|'+r.side;
      const inBoth=sp.rows.filter(r=>sp1.rows.some(x=>skey(x)===skey(r)));
      const oneFrame=[...sp1.rows,...sp.rows].filter(r=>!inBoth.some(x=>skey(x)===skey(r)));
      sp.rows=inBoth;
      for(const r of oneFrame) L.note('    TRANSIENT (one sample only, NOT asserted - the board fit was still settling) '+r.over+'px '+r.side+'  "'+r.text+'"  '+r.holder+' client '+r.cs+' scroll '+r.ss+'  row '+r.parW+' = ['+(r.kids||[]).join(', ')+']');
      totalSpill+=sp.rows.length; nowrapSeen+=sp.seen.nowrapBoxes; totalTransient+=oneFrame.length;
      // PRESENCE, AND IT ASSERTED THE WRONG POPULATION IN ITS FIRST VERSION. It read `nowrapBoxes>=1` and
      // claimed that meant "the predicate was actually exercised here" - but `nowrapBoxes` is counted BEFORE
      // the two filters that follow it (the holder must not clip on x, and the text must have ink), so a
      // screen where every nowrap box clips passes that check having measured NOTHING. The antagonist pass
      // found exactly that on HOME: 2 nowrap boxes, both clipping, `measured: 0` at all three swept
      // geometries and all four it tried besides, with the green reading as coverage. `inked` is the honest
      // number - text nodes that reached the ink comparison - so it is what the log reports per screen and
      // what the geometry-level assertion below counts. It is NOT asserted per screen, because Home
      // legitimately measures nothing and a per-screen floor would go red on a healthy bundle for a true
      // reason; the assertion that can fail is "almost every screen was measured", at the foot of the loop.
      if(sp.seen.inked>=1) measuredScreens++;
      L.note('    4b population: '+sp.seen.nowrapBoxes+' nowrap boxes, '+sp.seen.inked+' of them eligible and measured'+(sp.seen.inked?'':'  <- NOTHING MEASURED HERE, so this screen\'s 4b green is not coverage'));
      const worstSp=sp.rows.slice().sort((a,c)=>c.over-a.over)[0];
      L.say(sp.rows.length===0, g+' '+name+': NO text paints outside its own box and onto a sibling - measured as PAINTED ink (clamped by every ancestor that clips it) against the holder\'s own padding box, which is a frame no other gate in this suite uses',
        sp.rows.length? {spills:sp.rows.length, worst:worstSp} : {spills:0, nowrapBoxes:sp.seen.nowrapBoxes, measured:sp.seen.inked, near:sp.near.length});
      for(const r of sp.rows) L.note('    SPILL '+r.over+'px '+r.side+'  "'+r.text+'"  '+r.holder+' client '+r.cs+' scroll '+r.ss+'  painted '+r.ink.join('..')+' vs own box '+r.box.join('..')+'  ONTO '+r.onSib.sib+' by '+r.onSib.ox+'x'+r.onSib.oy+'  row '+r.parW+' = ['+(r.kids||[]).join(', ')+']  ('+r.el+')');
      // the near misses are the record that the gap case is SEEN and deliberately not asserted over.
      for(const r of sp.near) L.note('    NEAR  '+r.over+'px '+r.side+'  "'+r.text+'"  '+r.holder+' client '+r.cs+' scroll '+r.ss+'  spills into a gap, no sibling under it  ('+r.el+')');
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

    // 4b's CLASSIFIER UNIT TEST. Six shapes, four of them cases the predicate must REJECT.
    await b.page.evaluate(FIXTURE2);
    await b.settle(150);
    const sx=await b.page.evaluate(SPILL);
    const kind2=(re)=>{
      const a=sx.rows.filter(r=>re.test(r.text)), n=sx.near.filter(r=>re.test(r.text));
      return a.length? 'spill' : n.length? 'near' : 'none';
    };
    for(const [re,want,why] of FIXTURE2_WANT){
      const got=kind2(re);
      L.say(got===want, g+' spill fixture: '+why, {want, got,
        rows:[...sx.rows,...sx.near].filter(r=>re.test(r.text)).map(r=>({over:r.over,cs:r.cs,ss:r.ss,onSib:r.onSib}))});
    }
    await b.page.evaluate(()=>{const e=document.getElementById('ct-spill-fixture');if(e)e.remove();});

    // (b): a rotated ancestor is skipped rather than measured wrong, so the skip count must stay zero or the
    // gate has quietly stopped covering something.
    L.say(totalSkipped===0, g+': no clipping ancestor was skipped for a rotated/skewed transform (a skip is coverage silently lost, not a pass)', {skipped:totalSkipped});
    L.say(seenAny>=60, g+': the sweep as a whole measured a real quantity of ink across the screens', {inkedTextNodes:seenAny});
    // 11 of the 12 screens measure at least one eligible text node today; HOME is the one that measures none
    // (its two nowrap boxes both clip), and that is named in the header rather than hidden in a green. A floor
    // of 10 leaves room for one more screen to legitimately stop qualifying and still goes red if 4b quietly
    // stops reaching the screens it is supposed to cover - which is the failure `nowrapBoxes>=1` could not see.
    /* ── INVARIANT 2's ANTI-VACUITY, AND IT IS THE ASSERTION THAT MATTERS MOST HERE ─────────────────────
       "Zero unpinned spreads" is satisfied perfectly by a scanner that finds no rows at all, which is how
       this project's worst greens have always been produced. So the population is asserted too:
         - a floor on rows and controls actually measured, so a broken selector cannot read as a clean app;
         - the two exclusions must each have EXCLUDED something, because an exclusion that stops firing means
           the DOM moved under the predicate and the reach shrank in silence;
         - and the pin set must be found EXACTLY where it was measured - a pinned class that vanishes
           (fixed, or no longer reached) is red, and one that appears on a NEW screen is red. That last half
           is what stops this pin table becoming a frozen denominator (#395). */
    const wantPins=[]; for(const p of PIN_ROWS) for(const at of p.at) if(at.split('/')[0]===g) wantPins.push(p.sig+'@'+at);
    const missing=wantPins.filter(x=>!ivSeenPins.has(x));
    const extra=[...ivSeenPins].filter(x=>!wantPins.includes(x));
    L.say(missing.length===0&&extra.length===0, g+': invariant 2 found its pinned failures in EXACTLY the states they were measured in - nothing fixed without retiring its pin, and no pinned spread has appeared on a new screen',
      (missing.length||extra.length)? {missing, appearedSomewhereNew:extra} : {pinsFound:wantPins.length});
    // RE-DERIVED AT #423 AFTER THE OCCLUSION EXCLUSION MOVED THE INSTRUMENT, and the rule that says to is this
    // project's own: a threshold belongs to the instrument it was calibrated on, and when an assertion you just
    // moved goes red you find out WHICH of the two readings changed before you touch the number. Here it is the
    // population, legitimately: excluding controls a finger cannot reach took se from 36 rows / 176 controls to
    // 28 / 137 and short375 from 38 / 181 to 30 / 140, so the old 30/150 floor went red on a HEALTHIER bundle.
    // Floors per geometry, from the measurement, with a little room below: this is now the weakest of the three
    // population guards, because ROW_PIN and COVERED_PIN pin every screen exactly and a floor cannot see a
    // screen going silent while another grows. It is kept as the backstop for the whole sweep collapsing.
    const FLOOR={320:[26,130],375:[28,135],390:[28,135]};
    const fl=FLOOR[widthOf(g)]||[20,100];
    L.say(ivRows>=fl[0]&&ivCtls>=fl[1], g+': invariant 2 measured a real population rather than an empty one - a scanner that finds no rows reports "no inconsistent rows" and would be believed. Floor re-derived at #423 from the post-occlusion population, not carried over from the pre-occlusion one',
      {rowsMeasured:ivRows, controlsMeasured:ivCtls, floor:fl, width:widthOf(g), screens:SCREENS.length});
    // THE EXCLUSIONS MUST STILL FIRE, and this assertion had 99.7% slack in its first version (`>0` against 114
    // and 300). It is now pinned per geometry like everything else, because "an exclusion still fired at all" is
    // the same shape of floor that let the row population go silent.
    L.say(ivNested>0&&ivSvgKid>0, g+': both structural control-population exclusions still fired, so the gate is measuring OUTERMOST, non-SVG controls rather than having quietly lost the distinction. cursor:pointer is inherited, and before these two the same sweep at this geometry reported roughly four times as many undersized "controls", most of them SVG internals like svg>g>circle 1.6x1.6',
      {nestedExcluded:ivNested, svgInternalsExcluded:ivSvgKid, occludedExcluded:ivCovered});
    // AND THE BOARD EXCLUSION IS AN UNTESTED HYPOTHESIS, SAID SO RATHER THAN LEFT AS PROSE. The header argued at
    // length that the board's 64 squares would flood every board screen with eight-control rows of piece glyphs.
    // MEASURED at #423: it excludes ZERO elements on 36 of 36 (geometry, screen) pairs, because the squares are
    // not controls under this predicate at all - they carry no cursor:pointer and are not buttons. The exclusion
    // is kept because it is cheap and correct if that ever changes, but the reasoning behind it is a prediction
    // and this assertion is what would tell us it had come true.
    L.say(ivBoardExcluded===0, g+': the board exclusion still excludes nothing, so the header\'s reasoning for it remains a prediction rather than a measurement - the 64 squares are not controls under this predicate. RED here means the board became tappable under this predicate and the exclusion started doing real work, which is worth knowing about',
      {boardElementsExcluded:ivBoardExcluded});

    /* ── INVARIANT 3: REPORT THE COUNT, THEN PIN IT. The commission is explicit that the "at most four" it
       names is a PLACEHOLDER and that the first job is to report today's count and let Kunal choose the
       target set. So this asserts the SET, not a threshold: 13 distinct ICON glyph heights across the twelve
       swept screens and three geometries, enumerated below. Asserting the set rather than the count is the
       #388 lesson - a bare count loose enough to pass is loose enough to hide a swap - and it makes the log
       say WHICH height appeared or vanished. It is a DRIFT GUARD and not a target: nothing here claims 13 is
       right, only that it must not change without someone noticing. The target set is Kunal's
       (jobs/invariant-3-icon-size-target-set). */
    const iconKeys=Object.keys(ivIcon).map(Number).sort((a,b)=>a-b);
    L.note('    invariant 3, '+g+': '+iconKeys.length+' distinct ICON glyph heights (svg box, or a one-grapheme text node): '+iconKeys.join(', '));
    for(const k of iconKeys) L.note('        '+k+'px  '+[...ivIcon[String(k)]].slice(0,3).join(' ; '));
    L.note('    invariant 3, '+g+': over ALL glyphs including multi-line labels and whole cards the count is '+ivAllH.size+', which is NOT an icon count and is reported only so the difference is on the record');
    const wantIcons=ICON_PIN[widthOf(g)];
    if(wantIcons){
      L.say(JSON.stringify(iconKeys)===JSON.stringify(wantIcons), g+': the set of distinct ICON glyph heights is exactly what #423 measured at '+widthOf(g)+'px wide - a drift guard, not a target ('+wantIcons.length+' icon sizes where the commission\'s placeholder was four; the target set is Kunal\'s to choose, jobs/invariant-3-icon-size-target-set)',
        {width:widthOf(g), want:wantIcons, got:iconKeys, added:iconKeys.filter(x=>!wantIcons.includes(x)), gone:wantIcons.filter(x=>!iconKeys.includes(x))});
    } else {
      // NOT AN ASSERTION AT AN UNPINNED WIDTH, DELIBERATELY. The first version did `ICON_PIN[g]||[]`, so every
      // geometry the suite does not sweep went red reporting "the app has 0 icon sizes" - red on a healthy
      // bundle, which is worse than no assertion (#391). An unmeasured width is reported and named instead.
      L.note('    invariant 3, '+g+': width '+widthOf(g)+' carries NO pinned set, so this is REPORTED and NOT asserted here. Measured now: ['+iconKeys.join(', ')+']');
    }

    /* ── INVARIANT 1 IS NOT ASSERTED, AND THIS IS THE MEASUREMENT THAT SIZES THE DEFERRAL ────────────────
       "Before deferring something user-visible, open the code and look" (#392). Looked: this sweep finds the
       undersized controls below at this geometry. The commission named SIX by hand and said "expect more";
       the measured number is an order of magnitude larger, and a meaningful part of it is population rather
       than defect - tappable move-strip tokens, grade-table cells, and divs that are headers rather than
       buttons. Pinning ninety values over a population that has not been settled would bake the population
       into the suite, which is the "frozen denominator" failure the same commission warns about. So the list
       is REPORTED here and owned by a job, and invariant 1 stays honestly unbuilt in the header. */
    L.note('    invariant 1 (REPORTED, NOT ASSERTED), '+g+': '+ivSmall.size+' distinct visible controls under 44x44');
    for(const [k,v] of [...ivSmall.entries()].sort()) L.note('        '+k+'   '+v);
    L.say(measuredScreens>=10, g+': 4b actually measured ink against its own box on at least 10 of the 12 screens, so its zeros are measurements rather than an empty set (Home measures none: its two nowrap boxes both clip)', {screensMeasured:measuredScreens, nowrapBoxes:nowrapSeen, spills:totalSpill, transientsSeen:totalTransient});
    await b.close();
  }
  // THE GRACEFUL PATH MUST NOT BECOME THE NORMAL PATH. Invariant 3 and the population pins report instead of
  // asserting at an unpinned width, which is right for an ad-hoc run and would be a silent hole if the suite's
  // own geometries ever drifted out of the pin table. So: every geometry this suite sweeps by DEFAULT must be
  // pinned. A narrowed CT_INV_GEOS run is exempt, because narrowing is opt-in and prints its own warning.
  if(!process.env.CT_INV_GEOS){
    const unpinnedW=ALL_GEOS.filter(g=>!ICON_PIN[L.GEOS[g].w]);
    const unpinnedPop=[]; for(const g of ALL_GEOS) for(const [n] of SCREENS) if(!Object.prototype.hasOwnProperty.call(ROW_PIN,g+'/'+n)) unpinnedPop.push(g+'/'+n);
    L.say(unpinnedW.length===0, 'every geometry the suite sweeps by default carries a pinned icon set, so invariant 3 never silently downgrades to a report on a full run',{unpinnedWidths:unpinnedW});
    L.say(unpinnedPop.length===0, 'every (geometry, screen) the suite sweeps by default carries a pinned row and occlusion count, so the population guard never silently downgrades to a report on a full run',{unpinned:unpinnedPop});
  }
},'26-invariants');
