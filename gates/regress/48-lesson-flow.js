// regress/48-lesson-flow.js   THE LESSON SCREEN AS A FLOW: the note box, the demo transport, the practice
// control row, the hint, and the fixed footer that sits over all of them. Authored 2026-09-15 by the test
// authoring lane (claude/stories/LESSON-LANE-2026-09-15.md, US-LS-01 … US-LS-10 / TC-LS-001 … TC-LS-034).
//
// Every number below was MEASURED on the running build - the committed bundle #397 - 2026-09-14 22:56 ET,
// served by gates/lib.js's default path, and then re-measured identical on a local build of chess.jsx at
// commit 0f4b728 (stamp #900). Nothing here is inferred from source; where a line cites chess.jsx it is citing
// the REASON for a number, never the evidence for it.
//
// WHY A SECOND LESSON GATE. 11-lesson.js guards ONE property and guards it well: the board's SIZE and the
// note box's 75px height across five geometries, plus the footer glyph sizes from #394. It drives the screen
// through the PREVIEW GALLERY (cards 3 and 4), so it never opens a lesson the way Kunal does, never reaches
// practice past the first move, never touches the hint, the ⋯ sheet, the note sheet or the transport, and has
// no assertion that fails if any of them breaks. This file is that guard. It drives the screen the long way -
// Home → Discover → Openings → the Italian Game row - through gates/drive/lesson.js.
//
// NUMBERING: 46 is the highest number in gates/regress on 0f4b728, so 47 LOOKS free and is NOT. The Menu and
// settings lane published gates/regress/47-menu.js on 2026-09-15 01:50 ET (docs/menu-lane in the tracker
// artifact) and it has not been pasted yet, so it does not appear in the clone. This file is 48 so that both
// can land without either being renumbered - the mistake 46-play.js records having had to fix after the fact.
// gates.sh runs gates/regress/*.js in NAME order, so the number is ordering only.
//
// WHAT IT GUARDS
//   US-LS-01  the demo board is a PINNED size per geometry and its top is 92 at every geometry
//   US-LS-02  nothing scrolls on either axis, in demo or practice
//   US-LS-03  the note box is EXACTLY 75 tall on every ply, whatever the note says (#366), and its width is
//             min(98vw, board+44)
//   US-LS-04  a note too long for three lines gets the "more ▾" badge, and only then; tapping it opens a sheet
//             in which the whole note fits UNCLIPPED; closing it leaves the board where it was
//   US-LS-05  the demo transport: ▶ paused, ⏸ playing, ↻ at the end; Back at ply 0 is a no-op; ten Forwards
//             walk the Italian Game line exactly
//   US-LS-06  the fixed footer is 61 tall, pinned to the bottom, and carries five buttons in demo and TWO in
//             practice - and NO laid-out control is hidden underneath it
//   US-LS-07  the practice control row is ⟳ 💡 ↻Try-again ⋯, 44 tall, the board's own width, and fits inside
//             a 320 screen with the short label (#384)
//   US-LS-08  hints are on by default and paint EXACTLY the two squares of the book move; 💡 turns them off
//             and on again, and the board does not move either way
//   US-LS-09  a wrong move changes nothing on the board and does not advance the progress bar; ↻ Try again
//             puts the lesson back to move 0; a correct move advances it one step and moves the hint on
//   US-LS-10  the ⋯ sheet's prev/next row names the neighbouring lessons and disables the end it is at
//
// PINNED, NOT SELF-COMPARED - the #381 rule that 10-gameover.js and 46-play.js were both fixed for. A board
// compared only against itself is true of a board that has been the wrong size since before its first sample.
// If a deliberate change moves one of these, move it HERE with the change; never re-pin it to whatever the
// build now happens to produce. The three 320x568 numbers agree with 11-lesson.js by measurement, not by
// import: if the two ever disagree one of them has been re-pinned and that is the finding.
//
// THE FIVE MEASUREMENT RULES, AND WHERE EACH ONE BITES HERE
//  1. #root carries overflow-y:auto by design, so document.scrollingElement NEVER scrolls in this app. Reach
//     is measured with L.over() and hit-testability with elementFromPoint; nothing here reads docScrollY to
//     conclude anything is unreachable. NOTE the note box has its OWN scroller (chess.jsx:5058, className
//     "scroll"): scrollHeight > clientHeight there means the note is long, NOT that it is unreachable - it
//     scrolls, and the sheet is the other way to it. TC-LS-010 measures the affordance, not a false P0.
//  2. getBoundingClientRect() includes CSS transforms and every piece sits in scale(1.06) (measured in the DOM
//     above: <div style="transform: scale(1.06)"> wrapping each <img>). NOTHING here measures a piece box. The
//     board is the CSS grid (L.board()) and the position is read as a per-square PIECE IDENTITY signature, so
//     "the board did not change" is a fact about pieces rather than about pixels.
//  3. locator.click() auto-scrolls its target into view, so a control a thumb cannot reach passes for the
//     harness. Every control-row rect in TC-LS-018…021 is taken BEFORE anything on that row is tapped.
//  4. L.over() is blind to position:fixed children of #root - and the lesson footer IS one (chess.jsx:6311,
//     zIndex 471). So over() <= 0 proves NOTHING about the footer, and a gate that stopped there would be
//     measuring the screen behind the overlay. TC-LS-016 measures the footer separately and asserts no
//     laid-out control's bottom passes its top.
//  5. The bundle stamp is printed by lib.js on every launch and read back by b.stamp() - if a run's output
//     does not say what it measured, it is not evidence.
//
// NEGATIVE CONTROLS - NINE, ALL RUN, because a green that has never been disproved is worth nothing and two
// gates in this repo were caught passing their own breakage. Each is a one-line edit to a SCRATCH copy of
// chess.jsx, built to a trial bundle OUTSIDE the repo and served through CT_APP; chess.jsx was restored after
// every build and the repo is untouched. Baseline both ways: 189 pass / 0 fail on the committed #397 AND on a
// #900 built from chess.jsx at 0f4b728.
//   NC1  note box  height:75 -> height:95
//        -> 27 red. The note assertions go first, then the BOARD: top 92 -> 112 and, at 320, w 270.9 -> 222.9.
//           This is the #381 lesson again - 20px added to a box silently resizes the board, and only a pinned
//           number sees it.
//   NC2  {noteOver&&<span data-ct="lesson-note-more" -> {false&&...
//        -> 3 red, one per geometry, and ONLY 'the "more ▾" badge appears'. The long note still overflows and
//           the sheet still opens; what is lost is the only thing that tells Kunal there is more to read.
//   NC3  the ↻ label threshold  vp.w<=340 -> vp.w<=300
//        -> 1 red, and only at 320: the label reads "↻ Try again". THE ROW-FITS ASSERTION STAYS GREEN, which
//           is a fact about the app worth writing down: minWidth:0 alone is enough to keep the row on a 320
//           screen. See NC9.
//   NC4  hintMove  return findMoveBySAN(game,learnLine[openStep]) -> return null
//        -> 12 red, all four hint assertions at all three geometries, and nothing else.
//   NC5  Back a move  setDemoPly(p=>Math.max(0,p-1)) -> setDemoPly(p=>p-1)
//        -> 12 red. The ply-0 boundary goes red as intended, but so do the line walk, the ↻ label and the
//           "Other lines (3)" button, because drive/lesson.js rewinds with Back and the demo ends up at ply
//           -40. Recorded as an OVER-BROAD control: it proves those four assertions are live, it is not a
//           clean single-property disproof of the boundary one.
//   NC6  the footer's own padding  '8px 12px calc(8px + …)' -> '2px 12px calc(2px + …)'
//        -> 9 red, exactly the three footer-geometry assertions at three geometries.
//   NC7  the ↻ button  flex:1,minWidth:0 -> flex:1   (the #384 defect, half of it)
//        -> 0 red. 189 pass. THE DEFECT DOES NOT REPRODUCE from this edit alone, because the label has
//           already shortened to "↻ Again" by then and its min-content fits. Written down rather than
//           quietly dropped: #384 shipped two fixes and EITHER ONE alone holds the row on a 320 screen.
//   NC8  the footer's bottom padding  calc(8px + …) -> calc(120px + …)   (the footer grows to 173 tall)
//        -> 16 red, and this is the one that disproves the rule-4 assertions. L.over() still reads over<=0 at
//           every geometry - the column still ends at the viewport - while four demo controls sit UNDER the
//           footer and none of them is hit-testable. A gate that had stopped at over()<=0 would have been
//           green on a screen whose "✋ Now I'll try it" cannot be tapped.
//   NC9  NC3 AND NC7 together (long label at 320 AND no minWidth:0)
//        -> 3 red at 320, and the row's right edge measures 323.1 on a 320 screen. That is #384's own number,
//           3.1px off, reproduced exactly. This is the control that disproves 'the whole row is inside the
//           viewport'; NC3 and NC7 each alone do not, and that is a property of the app, not of the gate.
// ── PASTED AND CONTROLLED BY THE BUILD SESSION, 2026-09-16 at #403. ─────────────────────────────────────────
// Recovered from claude/stories/LESSON-LANE-2026-09-15.md (staged in the tracker's docs collection as
// `lesson-lane`), which had been published as run since 2026-09-15 and executed nowhere -
// standing-a-c2-gates-claimed-not-in-git. The paste is faithful: it returned the lane document's own baseline
// of 189 PASS / 0 fail on first run, against the #400 bundle rather than the #397 one it was measured on.
//
// THEN IT ABORTED TWICE UNDER ITS OWN STRONGEST CONTROL, AND THAT CHANGES A NUMBER IN THE LANE DOCUMENT.
// D.tapBtn throws when no button matches and L.run catches at the top level, so one absent control ended the
// whole run. Two sites did it: the /^Hints$/ taps (TC-LS-024..026) and /^Try again$/ (TC-LS-030/031). Both are
// now guarded the way CLAUDE.md requires - a separate assertion that the control is tappable at all, then the
// dependent assertions failing closed rather than the file stopping. #393 lost ninety assertions to exactly
// this and the rule was written down then; it did not travel into a gate authored two weeks later.
//
// WHAT THE ABORTS WERE HIDING, measured on the same NC8 bundle three times as the guards went in:
//     as pasted      16 FAIL / 32 PASS   -  48 of 189 assertions ran, aborted at /^Hints$/
//     one guard in   23 FAIL / 34 PASS   -  57 ran, aborted at /^Try again$/
//     both guarded   38 FAIL / 157 PASS  - 195 ran, no throw
// So the lane document's "NC8 -> 16 red" is 16 of the 48 that RAN, not of 189, and 141 assertions were never
// exercised by the control it calls its most important one. The true figure is 38 of 195. The document does not
// mention the abort, which is the #402 class candidate exactly: a control result recorded without the caveat
// that the run stopped early. Its CONCLUSION survives intact and is the reason this gate is worth having - see
// below - but the number did not.
//
// NC8 REPRODUCED, and it is the control that justifies the whole file. Footer bottom padding
// calc(8px + inset) -> calc(120px + inset) at chess.jsx:6378, trial bundle md5 b910273b8584:
//   -> the footer measures 173 tall, and FOUR demo controls sit at y 417.9 underneath it, none hit-testable.
//   -> AND `nothing scrolls vertically in the demo` STAYS GREEN THROUGHOUT:
//      {"bottom":568,"vh":568,"over":0,"scrollY":0,"docScroll":0}
//      A gate that had stopped at L.over() <= 0 would have reported green on a screen whose
//      "✋ Now I'll try it" cannot be tapped. That is the lane document's central claim and it is exact.
// chess.jsx restored and md5-verified to 688815d19019 after every trial build; app.js never written.
//
// NOT RE-RUN HERE, said plainly rather than implied: NC1..NC7 and NC9 rest on the lane document's recorded
// evidence. NC9 is the one worth doing next - it is the only control that disproves `the whole row is inside
// the viewport`, and the document notes that neither NC3 nor NC7 alone does.

'use strict';
const L=require('../lib');
const D=require('../drive/lesson');

// ── local helpers ────────────────────────────────────────────────────────────────────────────────────────
// The fixed lesson footer. It has no data-ct (chess.jsx:6311); zIndex 471 is its only unique mark, so that is
// what identifies it. Deliberately NOT matched on its height, which is one of the things under test.
const footer=(b)=>b.page.evaluate(()=>{const f=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='471');
  if(!f)return null;const r=f.getBoundingClientRect();
  return {top:+r.top.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1),vh:innerHeight,
          btns:[...f.querySelectorAll('button')].map(x=>x.getAttribute('aria-label'))};});
// Every LAID-OUT (non-fixed) button, with its rect, whether it is under the fixed footer, and whether a tap at
// its centre would actually reach it. Rule 1's second half: reachability is elementFromPoint, never scrollY.
const laidOut=(b)=>b.page.evaluate(()=>{
  const f=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='471');
  const ft=f?f.getBoundingClientRect().top:1e9;
  return [...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      let p=x;while(p&&p!==document.body){if(getComputedStyle(p).position==='fixed')return false;p=p.parentElement;}return true;})
    .map(x=>{const r=x.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {t:((x.innerText||'').replace(/\s+/g,' ').trim()||x.getAttribute('aria-label')||'').slice(0,26),
              bottom:+r.bottom.toFixed(1),underFoot:r.bottom>ft+0.5,own:!!(hit&&(hit===x||x.contains(hit)))};});});
// The practice control row, matched on its aria-labels (chess.jsx:5995-6006) so the ⋯ sheet's rows and the
// demo's own buttons cannot be picked up by mistake. DOM order is the painted order.
const row=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')]
  .filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&/^(Flip board|Hints|Try again|More actions)$/.test(x.getAttribute('aria-label')||'');})
  .map(x=>{const r=x.getBoundingClientRect();return {a:x.getAttribute('aria-label'),t:(x.innerText||'').trim(),
    x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};}));
// #409: THE INK OF EACH CONTROL ON THAT ROW, AND WHETHER ANY TWO OF THEM OVERLAP. A Range over the button's
// contents, because the defect this was written for is a label painting OUTSIDE its own button and over the next
// one while every box stays inside the viewport - so neither a viewport-containment check (gate 35) nor an
// ink-versus-the-box-that-clips-it check (gate 26, invariant 4) could see it: nothing here clips at all.
const rowInk=(b)=>b.page.evaluate(()=>{
  const bs=[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();
    return r.width>1&&r.height>1&&/^(Flip board|Hints|Try again|More actions)$/.test(x.getAttribute('aria-label')||'');});
  const n=(v)=>Math.round(v*100)/100;
  const out=bs.map(x=>{const r=x.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(x);
    const rects=[...g.getClientRects()].filter(q=>q.width>0&&q.height>0);
    const il=rects.length?Math.min(...rects.map(q=>q.left)):null, ir=rects.length?Math.max(...rects.map(q=>q.right)):null;
    return {a:x.getAttribute('aria-label'),t:(x.innerText||'').trim(),l:n(r.left),r:n(r.right),w:n(r.width),
            inkL:il==null?null:n(il),inkR:ir==null?null:n(ir),
            overL:il==null?null:n(r.left-il),overR:ir==null?null:n(ir-r.right)};});
  let worstOverlap=null;
  for(let i=1;i<out.length;i++){const gap=n(out[i].l-out[i-1].r);
    const inkBleed=(out[i-1].inkR!=null)?n(out[i-1].inkR-out[i].l):null;
    if(worstOverlap===null||(inkBleed!==null&&inkBleed>worstOverlap.inkBleed))worstOverlap={pair:out[i-1].a+' -> '+out[i].a,gap,inkBleed};}
  return {btns:out,worstOverlap,vw:innerWidth};
});
// The note box and its own inner scroller. h is the thing #366 fixed at 75; sh vs ch says whether the note is
// longer than the three lines it gets; `more` is the badge that says so to Kunal.
const note=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-note"]');if(!e)return null;
  const r=e.getBoundingClientRect(),i=e.querySelector('.scroll');
  return {h:+r.height.toFixed(1),w:+r.width.toFixed(1),top:+r.top.toFixed(1),
          sh:i?i.scrollHeight:-1,ch:i?i.clientHeight:-1,len:i?(i.innerText||'').replace(/\s+/g,' ').trim().length:-1,
          more:!!document.querySelector('[data-ct="lesson-note-more"]'),vw:innerWidth};});
const noteSheet=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-note-sheet"]');if(!e)return null;
  const inner=e.firstElementChild;const r=inner.getBoundingClientRect();
  return {sh:inner.scrollHeight,ch:inner.clientHeight,len:(inner.innerText||'').replace(/\s+/g,' ').trim().length,
          w:+r.width.toFixed(1),bottom:+r.bottom.toFixed(1),vh:innerHeight};});
// The squares painted with HL_HINT (chess.jsx:1114 'rgba(255,200,30,.75)', painted at 6190), by ALGEBRAIC NAME
// rather than counted. There is no data-ct on the hint; naming the squares is the only measurement that can
// tell "the hint is on" from "the hint is on the right move".
const hintSquares=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''))
    .sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const kids=[...g.children].slice(0,64);
  const bl=kids[56]?(kids[56].innerText||''):'',br=kids[63]?(kids[63].innerText||''):'';
  const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);
  const nm=(i)=>{const c=i%8,rw=Math.floor(i/8);const f=flip?7-c:c,r=flip?rw:7-rw;return String.fromCharCode(97+f)+(r+1);};
  const out=[];kids.forEach((k,i)=>{if([...k.children].some(d=>d.style&&d.style.background==='rgba(255, 200, 30, 0.75)'))out.push(nm(i));});
  return out.sort();});
// A 64-character signature of WHICH PIECE stands on each square: the piece <img>'s data URI hashed to one
// base36 char, '.' for an empty square. Rule 2: this reads piece IDENTITY, never a piece's box, so scale(1.06)
// cannot make a still position look like a moved one.
const position=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''))
    .sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;
  const h=(s)=>{let x=5381;for(let i=0;i<s.length;i++)x=((x*33)^s.charCodeAt(i))>>>0;return x.toString(36)[0];};
  return [...g.children].slice(0,64).map(k=>{const im=k.querySelector('img');return im?h(im.getAttribute('src')||''):'.';}).join('');});
const bar=(b)=>b.page.evaluate(()=>{const o=[...document.querySelectorAll('div')].find(d=>d.style.height==='4px'&&d.style.borderRadius==='2px'&&d.style.overflow==='hidden');
  return o&&o.firstElementChild?o.firstElementChild.style.width:null;});
const sheetNav=(b)=>b.page.evaluate(()=>{const n=document.querySelector('[data-ct="lesson-sheet-nav"]');if(!n)return null;
  return [...n.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();
    return {t:(x.innerText||'').replace(/\s+/g,' ').trim(),dis:!!x.disabled,h:+r.height.toFixed(1)};});});
const near=(a,c,tol)=>a!=null&&c!=null&&Math.abs(a-c)<(tol==null?0.6:tol);

// MEASURED, #397 and #900 alike. Demo and practice differ because practice carries the progress bar and the
// control row and demo carries the "✋ Now I'll try it" pair, so the square the height allows is not the same
// one. left is the centring the leftover width buys. top is 92 in EVERY column - that is the invariant.
const DEMO={se:{w:270.9,left:24.6},kunal730:{w:375,left:0},'390':{w:390,left:0}};
const PRAC={se:{w:230.9,left:44.6},kunal730:{w:375,left:0},'390':{w:390,left:0}};
const BOARD_TOP=92, NOTE_H=75, FOOT_H=61;
const LINE=['1. e4','1… e5','2. Nf3','2… Nc6','3. Bc4','3… Bc5','4. c3','4… Nf6','5. d3','5… d6']; // LIB 0, the Italian Game
const ROW=['Flip board','Hints','Try again','More actions'];
const GEOS=['se','kunal730','390'];

L.run(async()=>{

 for(const geo of GEOS){
  const vw=L.GEOS[geo].w, vh=L.GEOS[geo].h, Dm=DEMO[geo], Pr=PRAC[geo];

  // ══ A. THE DEMO PHASE ════════════════════════════════════════════════════════════════════════════════
  {
    const b=await L.launch({geo,name:'lesson-flow-demo-'+geo});await b.open();
    L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
    await D.states['demo-m0'](b);

    // --- TC-LS-001/002: the board is the size measured for THIS geometry, at the top every column shares.
    const m0=await b.metrics();
    L.say(!!m0.board&&near(m0.board.w,Dm.w)&&near(m0.board.left,Dm.left),
      geo+': the demo board is '+Dm.w+' wide at left '+Dm.left+' - the measured size for this geometry, not merely the size it was a moment ago',{measured:m0.board,want:Dm});
    L.say(!!m0.board&&near(m0.board.top,BOARD_TOP,1),
      geo+': the demo board top is '+BOARD_TOP+'. This is the one number that is the SAME in every column - the note box above it is fixed at '+NOTE_H+', so the board starts in the same place on a 320 phone and a 390 one',m0.board&&m0.board.top);

    // --- TC-LS-003/004: nothing scrolls. Rule 1: over() is the bottom-most laid-out child of #root, not
    // scrollHeight; docScroll is asserted to be ZERO rather than read for a conclusion.
    L.say(m0.over.over<=0&&m0.over.docScroll===0,geo+': nothing scrolls vertically in the demo',m0.over);
    const sw=await b.page.evaluate(()=>document.documentElement.scrollWidth);
    L.say(sw===vw,geo+': nothing scrolls sideways either (scrollWidth '+sw+' = viewport '+vw+')');

    // --- TC-LS-005/006: the note box, #366's contract. Fixed at 75 so the board cannot move under it.
    const n0=await note(b);
    L.say(!!n0&&near(n0.h,NOTE_H),geo+': the note box is exactly '+NOTE_H+' tall at ply 0 (#366: fixed height whatever the note says, so the board sits in the same place on every ply)',n0&&n0.h);
    L.say(!!n0&&near(n0.w,Math.min(0.98*vw,Dm.w+44),1),
      geo+': the note box is min(98vw, board+44) = '+(+Math.min(0.98*vw,Dm.w+44).toFixed(1))+' wide',{measured:n0&&n0.w,vw98:+(0.98*vw).toFixed(1),board44:Dm.w+44});
    L.say(!!n0&&n0.more===false&&n0.sh===n0.ch,geo+': a note that fits in its three lines carries NO "more ▾" badge and its inner scroller has nothing to scroll',{more:n0&&n0.more,sh:n0&&n0.sh,ch:n0&&n0.ch});

    // --- TC-LS-007: the footer. Rule 4 - L.over() cannot see it, so it is measured on its own.
    const f0=await footer(b);
    L.say(!!f0&&near(f0.h,FOOT_H),geo+': the lesson footer is '+FOOT_H+' tall',f0&&f0.h);
    L.say(!!f0&&near(f0.bottom,vh)&&near(f0.top,vh-FOOT_H),geo+': and is pinned to the bottom of the viewport (top '+(f0&&f0.top)+' = '+vh+' - '+FOOT_H+')',f0);
    L.say(!!f0&&f0.btns.join(',')==='Back a move,Play or pause,Forward a move,Close lesson,More for this lesson',
      geo+': in the demo the footer carries all five - the transport, the ✕ and the ⋯',f0&&f0.btns.join(','));

    // --- TC-LS-008: THE ASSERTION L.over() CANNOT MAKE. over() <= 0 above says the column ends at the
    // viewport; it says nothing about the 61px of it the fixed footer covers. Every laid-out control must end
    // ABOVE the footer's top, and a tap at its centre must actually land on it.
    const lo0=await laidOut(b);
    L.say(lo0.length>0&&lo0.every(x=>!x.underFoot),geo+': no laid-out control in the demo is hidden under the fixed footer',lo0.filter(x=>x.underFoot).map(x=>x.t+'@'+x.bottom).join(' ')||'none of '+lo0.length);
    L.say(lo0.length>0&&lo0.every(x=>x.own),geo+': and a tap at the centre of each one reaches that control rather than something layered over it',lo0.filter(x=>!x.own).map(x=>x.t).join(' ')||'all '+lo0.length+' hit-testable');

    // --- TC-LS-009: Back at ply 0 is a no-op. chess.jsx:6312 clamps with Math.max(0,p-1); the boundary is
    // that the note still reads the ply-0 prompt rather than going negative or blanking.
    await D.tapBtn(b,/^Back a move$/,300);
    L.say((await D.demoPly(b))===0&&/Press Play/.test((await D.noteText(b))||''),
      geo+': Back at ply 0 does nothing - the note still reads the ply-0 prompt',{ply:await D.demoPly(b),note:((await D.noteText(b))||'').slice(0,30)});

    // --- TC-LS-010/011: the transport labels, and ten Forwards walking the line EXACTLY. This is a content
    // assertion, not a shape one: a gate that only counts plies passes a demo playing the wrong opening.
    L.say((await D.playBtnLabel(b))==='▶',geo+': paused at ply 0 the play button reads ▶',await D.playBtnLabel(b));
    const sans=[];
    for(let i=0;i<LINE.length;i++){await D.tapBtn(b,/^Forward a move$/,160);sans.push(((await D.noteText(b))||'').split(' — ')[0]);}
    L.say(sans.join('|')===LINE.join('|'),geo+': ten Forwards walk the Italian Game exactly - '+LINE.join(' '),{measured:sans.join(' '),want:LINE.join(' ')});
    L.say((await D.playBtnLabel(b))==='↻',geo+': at the end of the line the play button becomes ↻ (replay), which is how the harness and Kunal both know the demo is over',await D.playBtnLabel(b));

    // --- TC-LS-012: the note box is STILL exactly 75 at the end of the line, with a much longer note in it.
    const nEnd=await note(b);
    L.say(!!nEnd&&near(nEnd.h,NOTE_H),geo+': the note box is still exactly '+NOTE_H+' tall at the end of the line, with a '+(nEnd&&nEnd.len)+'-character note in it',nEnd&&nEnd.h);
    const mEnd=await b.metrics();
    L.say(!!mEnd.board&&near(mEnd.board.w,Dm.w)&&near(mEnd.board.top,BOARD_TOP,1),
      geo+': and the board has not moved across the whole demo (w '+(mEnd.board&&mEnd.board.w)+' top '+(mEnd.board&&mEnd.board.top)+')',mEnd.board);

    // --- TC-LS-013: at the demo end the "other lines" button names how many there are (#371: on phones the
    // lines live behind this button instead of a 100px box that cost the board 103px).
    //
    // #404: THE COUNT IS DELIBERATELY ABSENT ON A NARROW ROW, and this assertion moved with the change rather
    // than being deleted. Kunal answered it on 2026-09-15 02:08 UTC, decision `lesson-lines-320-label`, choice
    // "Other lines": the count drops on a narrow phone, because at 375x730 the button is already flush to the
    // screen edge and his Z-06 condition is that supporting 320 must not cost the larger screens anything.
    // #406: the CONDITION is no longer a viewport width. It is `boardPx<340` - the board is fit to HEIGHT and
    // this row is sized to the board, so at vp.h=568 the board is 270.88px wide at every width from 320 to 390
    // and a viewport-width threshold could not reach it. This gate's three geometries (se, kunal730, 390) all
    // happen to agree with the old rule, so this assertion did NOT go red on the change; gates/regress/
    // 35-width-containment.js carries the `short375` column that does.
    // Before #404 the counted label was 169.19px wide at EVERY viewport and hung 38.9px off a 320 screen with
    // nothing able to scroll to it. THIS GATE IS WHAT CAUGHT THE PIN: the first full #404 suite went RED here,
    // on exactly this line, at `se` - which is the whole point of pinning a label rather than a shape.
    // The narrow branch is asserted as tightly as the wide one: the count must be ABSENT, not merely optional.
    const lines=await b.rect('[data-ct="lesson-lines"]');
    const lTxt=((lines&&lines.text)||'').trim();
    L.say(!!lines&&(geo==='se'?/^♟ Other lines$/.test(lTxt):/^♟ Other lines \(3\)$/.test(lTxt)),
      geo+': the demo end offers '+(geo==='se'?'"♟ Other lines" with NO count, per decision lesson-lines-320-label (320 is below the 340 threshold)':'"♟ Other lines (3)" - the Italian Game\'s three variations, counted'),lTxt);

    // --- TC-LS-014: the ⋯ sheet's prev/next row. The Italian Game is the FIRST opening, so prev is the
    // boundary: disabled and saying so rather than silently dead.
    await D.tapBtn(b,/^More for this lesson$/,600);
    const nav=await sheetNav(b);
    L.say(!!nav&&nav.length===2,geo+': the ⋯ sheet carries a two-button prev/next row',nav&&nav.map(x=>x.t));
    L.say(!!nav&&nav[0].dis===true&&/^‹ First lesson$/.test(nav[0].t),geo+': on the first lesson of the group the ‹ button is DISABLED and reads "‹ First lesson" - the boundary says what it is instead of being a dead control',nav&&nav[0]);
    L.say(!!nav&&nav[1].dis===false&&/›$/.test(nav[1].t)&&nav[1].t.length>2,geo+': and the › button names the lesson it goes to',nav&&nav[1].t);
    L.say(!!nav&&nav.every(x=>x.h>=44),geo+': both are at least 44 tall',nav&&nav.map(x=>x.h));
    L.say(!!(await b.rect('[data-ct="lesson-sheet-lines"]')),geo+': and the sheet carries the lines box for a lesson that has variations');

    L.say(b.errs.length===0,geo+': zero app errors across the demo',b.errs.slice(0,3));
    await b.shot('lesson-flow-'+geo+'-demo-end');
    await b.close();
  }

  // ══ B. THE LONG NOTE - the overflow boundary and the way out of it ═══════════════════════════════════
  {
    const b=await L.launch({geo,name:'lesson-flow-longnote-'+geo});await b.open();
    await D.states['longnote'](b);          // Endgames → Back-Rank Mate, ply 1: the longest 1-ply note
    const n=await note(b);
    const before=await b.metrics();
    L.say(!!n&&n.len>=200,geo+': the Back-Rank Mate note is '+(n&&n.len)+' characters - longer than three lines can hold (precondition; without it everything below passes by measuring a short note)',n&&n.len);
    L.say(!!n&&near(n.h,NOTE_H),geo+': the box is STILL exactly '+NOTE_H+' tall - a long note does not push the board down',n&&n.h);
    // Rule 1, stated out loud: sh > ch here does NOT mean the text is unreachable. The box has its own
    // scroller. What is asserted is the AFFORDANCE that tells Kunal there is more, which is the defect a
    // silent clip would be.
    L.say(!!n&&n.sh>n.ch,geo+': the note overflows its box ('+(n&&n.sh)+' of content in '+(n&&n.ch)+'). The box scrolls, so this is NOT unreachable text - it is the condition the badge below exists for',{sh:n&&n.sh,ch:n&&n.ch});
    L.say(!!n&&n.more===true,geo+': and exactly then the "more ▾" badge appears',n&&n.more);

    // --- TC-LS-017: the sheet is the other way to the note, and the WHOLE note must fit in it unclipped.
    await b.tapCt('lesson-note',700);
    const sh=await noteSheet(b);
    L.say(!!sh,geo+': tapping an overflowing note opens the note sheet',sh);
    L.say(!!sh&&sh.sh<=sh.ch,geo+': and in the sheet the whole note is laid out UNCLIPPED (scrollHeight '+(sh&&sh.sh)+' <= clientHeight '+(sh&&sh.ch)+') - the sheet is the answer to the clip, so a sheet that clips too would be no answer',sh);
    L.say(!!sh&&!!n&&sh.len>=n.len,geo+': the sheet carries at least as much text as the box ('+(sh&&sh.len)+' vs '+(n&&n.len)+')',{sheet:sh&&sh.len,box:n&&n.len});
    L.say(!!sh&&sh.bottom<=sh.vh+0.6,geo+': and the sheet ends at the bottom of the screen rather than past it',sh);

    await b.page.mouse.click(5,5);await b.settle(400);
    const after=await b.metrics();
    L.say(!!after.board&&!!before.board&&near(after.board.w,before.board.w)&&near(after.board.top,before.board.top),
      geo+': closing the sheet leaves the board exactly where it was (w '+(after.board&&after.board.w)+' top '+(after.board&&after.board.top)+')',{before:before.board,after:after.board});
    L.say(b.errs.length===0,geo+': zero app errors across the long note',b.errs.slice(0,3));
    await b.shot('lesson-flow-'+geo+'-longnote');
    await b.close();
  }

  // ══ C. PRACTICE ═════════════════════════════════════════════════════════════════════════════════════
  {
    const b=await L.launch({geo,name:'lesson-flow-practice-'+geo});await b.open();
    await D.states['practice-m0'](b);

    // --- TC-LS-018…021: the control row, measured BEFORE anything on it is tapped. Rule 3: a click would
    // scroll a control into view first and a row a thumb cannot reach would pass.
    const r0=await row(b);
    L.say(r0.length===4&&r0.map(x=>x.a).join(',')===ROW.join(','),geo+': the practice row is exactly ⟳ · 💡 · ↻ Try again · ⋯',r0.map(x=>x.a).join(','));
    L.say(r0.length===4&&r0.every(x=>near(x.h,44)),geo+': every button on it is 44 tall',r0.map(x=>x.a+':'+x.h).join(' '));
    L.say(r0.length===4&&r0.every(x=>x.x>=-0.6&&x.right<=vw+0.6),
      geo+': and the whole row is inside the viewport BEFORE any tap. #384: the flexible ↻ button defaulted to min-width:auto, refused to shrink, and pushed the ⋯ 3.1px off a 320 screen with no page scroll to recover it',{left:r0[0]&&r0[0].x,right:r0[3]&&r0[3].right,vw});
    L.say(r0.length===4&&near(r0[0].x,Pr.left)&&near(r0[3].right,Pr.left+Pr.w),
      geo+': the row is the board\'s own width ('+Pr.left+' to '+(Pr.left+Pr.w)+')',{rowLeft:r0[0]&&r0[0].x,rowRight:r0[3]&&r0[3].right});
    /* #384's other half: the label shortens when it does not fit and ONLY then. THIS EXPECTATION USED TO READ
       `vw<=340`, WHICH IS THE VIEWPORT, AND THE VIEWPORT NEVER DECIDED IT - the same fault #406 fixed in the
       app for six sites and in gate 35's own label assertion, sitting here unfixed in the expectation. The row
       is the board's width and the lesson board is fit to HEIGHT, so at 375x568 the viewport is wide, the row
       is 230.88, and the long label painted 8.83px outside its own button and 2.83px over the ⋯ next to it
       while this line happily expected the long one. It now computes the BUDGET the way the row does - the
       row's width less the three 46px buttons and their three 6px gaps - and compares it with the long label's
       measured min-content width of 92.52px, so it follows the rule rather than the geometry table. #409. */
    const budget=Pr.w-(3*46)-(3*6);
    const wantLabel=budget<92.52?'↻ Again':'↻ Try again';
    L.say(r0.length===4&&r0[2].t===wantLabel,geo+': at '+vw+' wide the ↻ button reads "'+wantLabel+'" (#384: the full label needs 92.52px and the budget at 320 is 74.88, so it shortens at <=340 and only there)',r0[2]&&r0[2].t);

    /* #409: AND THE INK, not only the boxes. The defect that produced these two assertions painted the long
       label 8.83px past its own right edge and 2.83px OVER the ⋯ button beside it, at 375x568 and 390x568,
       while every box stayed inside the viewport - so the row-containment assertion above was green, gate 35
       was green (nothing leaves the viewport) and gate 26 was green (nothing clips, so there is nothing to
       clip against). Measured with a Range over each button's own contents. */
    const ri=await rowInk(b);
    const bad=(ri.btns||[]).filter(x=>x.inkR!==null&&(x.overR>0.5||x.overL>0.5));
    L.say(bad.length===0,geo+': every label on the practice row paints INSIDE its own button - measured as a Range over the button\'s contents, not as its box',bad.map(x=>x.a+' overR '+x.overR+' overL '+x.overL).join(' | ')||'none');
    L.say(!!ri.worstOverlap&&ri.worstOverlap.inkBleed!==null&&ri.worstOverlap.inkBleed<=0,geo+': and no label\'s ink reaches the next button\'s box (worst pair '+(ri.worstOverlap&&ri.worstOverlap.pair)+')',ri.worstOverlap);
    // --- TC-LS-022/023: the practice board, pinned; and the footer loses the transport.
    const p0=await b.metrics();
    L.say(!!p0.board&&near(p0.board.w,Pr.w)&&near(p0.board.left,Pr.left)&&near(p0.board.top,BOARD_TOP,1),
      geo+': the practice board is '+Pr.w+' wide at left '+Pr.left+', top '+BOARD_TOP+' - a different square from the demo\'s '+Dm.w+', because practice carries the progress bar and the control row',{measured:p0.board,want:Pr});
    L.say(p0.over.over<=0&&p0.over.docScroll===0,geo+': nothing scrolls in practice either',p0.over);
    const fp=await footer(b);
    L.say(!!fp&&fp.btns.join(',')==='Close lesson,More for this lesson',
      geo+': in practice the footer drops the transport and carries only ✕ and ⋯ - there is no demo to step through',fp&&fp.btns.join(','));
    L.say(!!fp&&near(fp.h,FOOT_H)&&near(fp.bottom,vh),geo+': and it is the same '+FOOT_H+'px bar pinned to the same place, so the screen does not jump when the phase changes',fp);
    const lo=await laidOut(b);
    L.say(lo.length>0&&lo.every(x=>!x.underFoot),geo+': no practice control is hidden under the fixed footer',lo.filter(x=>x.underFoot).map(x=>x.t+'@'+x.bottom).join(' ')||'none of '+lo.length);
    L.say(lo.length>0&&lo.every(x=>x.own),geo+': and each one is hit-testable at its centre',lo.filter(x=>!x.own).map(x=>x.t).join(' ')||'all '+lo.length);

    // --- TC-LS-024…026: the hint. Named squares, not a count: counting cannot tell the right hint from a
    // wrong one, and this lesson exists to teach 1.e4.
    L.say(JSON.stringify(await hintSquares(b))==='["e2","e4"]',geo+': hints are ON by default and paint exactly e2 and e4 - the book move\'s own two squares',await hintSquares(b));
    // #403: THESE TWO TAPS WERE UNGUARDED AND THEY TOOK THE WHOLE GATE DOWN. D.tapBtn THROWS when no button
    // matches, and L.run catches the throw at the top level - so one absent control ended the run and left 141
    // of 189 assertions UNRUN. That is #393's lesson verbatim ("a gate that halts on the first missing element
    // hides every regression after it"), and it is not hypothetical here: the lane document's own NC8 records
    // "16 red", which is 16 of the 48 that ran rather than of 189, on a run that aborted at this exact line
    // without saying so. Guarded the way CLAUDE.md requires: go red on its own assertion, then carry on.
    const beforeToggle=await b.metrics();
    let hintsTappable=true;
    try{ await D.tapBtn(b,/^Hints$/,500); }catch(e){ hintsTappable=false; }
    L.say(hintsTappable,geo+': the 💡 Hints control is present and tappable at all - asserted separately because the two assertions below are meaningless if it is not, and because a throw here used to end the run',{tappable:hintsTappable});
    if(hintsTappable){
      L.say(JSON.stringify(await hintSquares(b))==='[]',geo+': 💡 turns the hint off - no square is painted',await hintSquares(b));
      const afterToggle=await b.metrics();
      L.say(near(afterToggle.board.w,beforeToggle.board.w)&&near(afterToggle.board.top,beforeToggle.board.top),
        geo+': and toggling it does not move the board',{before:beforeToggle.board,after:afterToggle.board});
      let back=true;
      try{ await D.tapBtn(b,/^Hints$/,500); }catch(e){ back=false; }
      L.say(back&&JSON.stringify(await hintSquares(b))==='["e2","e4"]',geo+': and 💡 again brings the same two squares back',{back,sq:await hintSquares(b)});
    } else {
      L.say(false,geo+': 💡 turns the hint off - no square is painted  [NOT RUN: the Hints control could not be tapped]',null);
      L.say(false,geo+': and toggling it does not move the board  [NOT RUN: the Hints control could not be tapped]',null);
      L.say(false,geo+': and 💡 again brings the same two squares back  [NOT RUN: the Hints control could not be tapped]',null);
    }

    // --- TC-LS-027…029: a WRONG move. Rule 2: the position is compared by piece identity per square, never
    // by a pixel, so scale(1.06) cannot make a still board look like a moved one.
    const pos0=await position(b);
    L.say(await bar(b)==='0%',geo+': the progress bar is at 0% before the first practice move',await bar(b));
    await b.move('d2','d4',900);
    L.say((await position(b))===pos0,geo+': 1.d4 is not the book move, so NOTHING moves on the board - the same piece stands on all 64 squares',{same:(await position(b))===pos0});
    L.say(await bar(b)==='0%',geo+': and the progress bar does not advance for a wrong move',await bar(b));
    L.say(/^✗ /.test((await D.noteText(b))||''),geo+': the note says so, starting with ✗',((await D.noteText(b))||'').slice(0,60));
    const nW=await note(b);
    L.say(!!nW&&near(nW.h,NOTE_H),geo+': and the box is still exactly '+NOTE_H+' tall with the miss message in it - the board must not jump when Kunal gets it wrong',nW&&nW.h);

    // --- TC-LS-030/031: ↻ Try again puts it back to move 0.
    // #403: guarded for the same reason as the Hints taps above. This was the SECOND abort in this file and it
    // only became visible once the first was fixed - guarding one unguarded tap reveals the next, which is why
    // #393's rule is about every tap rather than the one that happened to fail.
    let againTappable=true;
    try{ await D.tapBtn(b,/^Try again$/,800); }catch(e){ againTappable=false; }
    L.say(againTappable,geo+': the ↻ Try again control is present and tappable at all - asserted separately, because the two below cannot mean anything if it is not',{tappable:againTappable});
    if(againTappable){
      L.say(await bar(b)==='0%'&&/^Your move/.test((await D.noteText(b))||''),
        geo+': ↻ Try again puts the lesson back to move 0 - bar at 0% and the note back to the prompt',{bar:await bar(b),note:((await D.noteText(b))||'').slice(0,30)});
      L.say(JSON.stringify(await hintSquares(b))==='["e2","e4"]',geo+': with the hint back on the first move',await hintSquares(b));
    } else {
      L.say(false,geo+': ↻ Try again puts the lesson back to move 0  [NOT RUN: the control could not be tapped]',null);
      L.say(false,geo+': with the hint back on the first move  [NOT RUN: the control could not be tapped]',null);
    }

    // --- TC-LS-032…034: the CORRECT move.
    await b.move('e2','e4',1500);
    L.say((await position(b))!==pos0,geo+': 1.e4 IS the book move, so the position changes',{changed:(await position(b))!==pos0});
    L.say(await bar(b)==='20%',geo+': the progress bar advances to 20% - one of the five moves Kunal plays in this ten-ply line',await bar(b));
    L.say(/^✓ e4/.test((await D.noteText(b))||''),geo+': and the note confirms it',((await D.noteText(b))||'').slice(0,40));
    L.say(JSON.stringify(await hintSquares(b))==='["f3","g1"]',geo+': and the hint has MOVED ON to the next book move, Nf3 (g1-f3) - a hint that stayed on e2/e4 would still count two squares and be wrong',await hintSquares(b));
    const pAfter=await b.metrics();
    L.say(!!pAfter.board&&near(pAfter.board.w,Pr.w)&&near(pAfter.board.top,BOARD_TOP,1),
      geo+': and the board has not moved across the whole practice sequence',pAfter.board);
    L.say(b.errs.length===0,geo+': zero app errors across practice',b.errs.slice(0,3));
    await b.shot('lesson-flow-'+geo+'-practice');
    await b.close();
  }
 }

 // CONTROLLED AGAINST THE SHIPPED #408 RELEASE (b95fa49, md5 ab89460652aa, recovered with git cat-file):
 // 209 pass, 6 FAIL, and the six are exactly these three assertions at each of the two wide-and-short columns -
 // the label ("↻ Try again" where the budget is 74.8px and the label needs 92.52), the ink 8.83px outside its
 // own button, and 2.83px of it bleeding onto the ⋯. Every other assertion in this gate stayed green, including
 // the same three ink checks at 320x568, 375x730 and 390x844, which is what says they fire on the defect rather
 // than on the row. AND "every box is still inside the viewport" STAYED GREEN AT BOTH on that bundle: that is
 // the reason this column exists as ink assertions and not as another containment check.
 // ══ D. THE WIDE-AND-SHORT COLUMN, #409 ════════════════════════════════════════════════════════════════════
 // This gate's three geometries are 320x568, 375x730 and 390x844 - narrow-and-short, and two tall ones. None
 // of them has width >= 360 AND height <= 600, which is #406's two-axis finding, and it is exactly where the
 // practice row breaks: the row is the board's width, the lesson board is fit to HEIGHT, so a WIDE and SHORT
 // viewport gives a wide screen and a 230.88px row. Measured on the shipped #408 bundle at 375x568: the long
 // label's ink ran 167.25..259.77 inside a button of 176.06..250.94 - 8.83px past its own right edge, 8.81px
 // past its left, and 2.83px over the ⋯ button's left edge at 256.94 - with documentElement.scrollWidth equal
 // to the viewport, so nothing scrolls to recover it and no viewport-keyed assertion can see it.
 // ONE ROW, not the whole gate: adding a fourth column to the loop above would mean re-measuring every pinned
 // board width, left and top in DEMO and PRAC for a geometry nothing else asserts about. This block asserts
 // only what the defect was about, and says so.
 for(const geo of ['short375','390x568']){
   const g = geo==='390x568' ? {w:390,h:568,safe:'',label:'390x568 = the wide-and-short corner, one step up'} : geo;
   const vw = typeof g==='object' ? g.w : L.GEOS[g].w;
   const b=await L.launch({geo:g,name:'lesson-flow-wideshort-'+geo});await b.open();
   L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
   await D.states['practice-m0'](b);
   const r0=await row(b), ri=await rowInk(b), m=await b.metrics();
   L.say(r0.length===4,geo+': the practice row is there at all (four controls)',r0.map(x=>x.a).join(','));
   L.say(!!m.board&&m.board.w<340,geo+': and the board really is under 340 wide here ('+(m.board&&m.board.w)+') while the viewport is '+vw+' - which is why a viewport threshold cannot decide this row',{board:m.board&&m.board.w,vw});
   const budget=r0.length===4?Math.round((r0[3].right-r0[0].x-(3*46)-(3*6))*100)/100:null;
   L.say(budget!==null&&budget<92.52&&r0[2].t==='↻ Again',geo+': the ↻ button reads "↻ Again", because the budget the row leaves it is '+budget+'px and the long label needs 92.52px. It read "↻ Try again" on the shipped #408 bundle, keyed to the VIEWPORT.',{budget,label:r0.length===4?r0[2].t:null});
   const bad=(ri.btns||[]).filter(x=>x.inkR!==null&&(x.overR>0.5||x.overL>0.5));
   L.say(bad.length===0,geo+': every label paints INSIDE its own button (this is the assertion the defect crossed: 8.83px past the right edge, 8.81px past the left)',bad.map(x=>x.a+' overR '+x.overR).join(' | ')||'none');
   L.say(!!ri.worstOverlap&&ri.worstOverlap.inkBleed!==null&&ri.worstOverlap.inkBleed<=0,geo+': and no label\'s ink reaches the next button (it bled 2.83px onto the ⋯ before the fix)',ri.worstOverlap);
   L.say(r0.length===4&&r0.every(x=>x.x>=-0.6&&x.right<=vw+0.6),geo+': and every box is still inside the viewport - true BEFORE the fix as well, which is why this column needed the ink assertions above rather than another containment check',r0.map(x=>x.a+':'+x.right).join(' '));
   L.say(m.over.docScroll===0,geo+': nothing scrolls the page here',m.over);
   await b.shot('lesson-practice-row-'+geo);
   await b.close();
 }
},'LESSON-FLOW');
