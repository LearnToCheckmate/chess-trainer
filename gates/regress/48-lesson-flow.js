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
// #424: THE DEMO ROW AS A TWO-ELEMENT COMPARISON - the button against ITS OWN ROW, and both children's
// min-content against the row's width. This is the assertion docs/narrow-button-levers-measured-2026-09-19
// asked for in theGateThisNeeds ("NO BUTTON'S RENDERED BOX MAY EXTEND BEYOND THE RIGHT EDGE OF ITS CONTAINING
// ROW"), and the reason it is needed is that the defect survived #404, #405 and #406 with every gate green:
// those three closed the VIEWPORT overhang, and the ROW overhang is a different box. Measured on the #424
// bundle BEFORE this build's fix, at the demo end: 320x568 row 270.88 at 24.56..295.44 with the button at
// 189.73..312.30, so 16.86px past its own row while sitting 7.70px INSIDE the 320 viewport - which is why
// gate 35's containment sweep and this gate's own "inside the viewport" line were both correctly green over it.
// WHY MIN-CONTENT AND NOT JUST THE RECT: the row is `gridTemplateColumns:'1.8fr 1fr'`, and an fr track cannot
// resolve below its item's min-content while the item is `whiteSpace:nowrap`. So the row does not overflow
// because a box is too wide; it overflows because the two min-contents plus the gap exceed the row, and the
// grid then blows out. Reading min-content is reading the CAUSE, and it is what lets the assertion below decide
// from the app's own arithmetic which geometries the row can hold rather than from a geometry list (#410).
const demoRow=(b)=>b.page.evaluate(()=>{
  const el=document.querySelector('[data-ct="lesson-lines"]');if(!el)return null;
  const rowEl=el.parentElement,rr=rowEl.getBoundingClientRect(),er=el.getBoundingClientRect();
  const r2=(n)=>Math.round(n*100)/100;
  // max-content on a detached clone: the element is nowrap, so max-content IS its min-content, and cloning
  // detaches it from the grid track that is currently squeezing or stretching it.
  const minC=(e)=>{const c=e.cloneNode(true);c.style.position='absolute';c.style.left='-9999px';
    c.style.width='max-content';c.style.maxWidth='none';document.body.appendChild(c);
    const w=c.getBoundingClientRect().width;c.remove();return r2(w);};
  const kids=[...rowEl.children].map(k=>({t:(k.innerText||'').replace(/\s+/g,' ').trim(),minC:minC(k),
    w:r2(k.getBoundingClientRect().width)}));
  const cs=getComputedStyle(rowEl);
  const gap=parseFloat(cs.columnGap)||0;
  // #424, ANTAGONIST A: THE DETACHED CLONE IS 2.00px LOW AND THE FIRST VERSION OF THIS HELPER BELIEVED IT.
  // `needed` used to be the sum of the kids' cloned min-content, and at 320x520 that printed 229.55 against a
  // row of 192 - while the SAME log line printed the button 39.55px past that row, and 192 + 39.55 = 231.55.
  // The log contradicted itself by exactly 2.00px and nothing compared the two, which is the cross-check this
  // very assertion exists to make. The browser's own answer is the resolved track list: at that geometry
  // gridTemplateColumns reads "136.781px 88.7656px", summing with the gap to 231.55, which agrees with the rect
  // to the hundredth. The clone reads the lesson-lines button as 86.77 where its own resolved track floor is
  // 88.7656. So TRACKS are the measurement and the clone is kept only as a cross-check that is PRINTED, because
  // a 2.00px systematic understatement against a 0.5px tolerance is four times the tolerance - the assertion
  // could have gone green on a row genuinely blown out by up to 2.5px.
  const tracks=(cs.gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
  // AND THE FIRST FIX FOR THAT WAS VACUOUS, CAUGHT HERE BEFORE IT SHIPPED. Reading the RESOLVED tracks is the
  // browser's answer to "how wide are these tracks", which is NOT the question. An `fr` track expands to fill the
  // row whenever the content fits, so at 320x568 the resolved tracks sum to 270.86 against a row of 270.88 and
  // "needed <= rowW" becomes -0.02 BY CONSTRUCTION - an assertion that cannot fail wherever the row is fine,
  // which is every geometry it runs at. It is only equal to min-content in the blown-out case, which is why it
  // looked right at h=520 and was worthless at h=568. So ASK THE BROWSER THE ACTUAL QUESTION: set the row to
  // `min-content min-content`, read the resolved tracks back, and restore. That is the browser computing each
  // item's intrinsic minimum in its real context, which is the quantity the grid's automatic minimum size uses
  // and the quantity a detached clone gets 2.00px wrong.
  // THE RESTORE CHECK HAS TO SNAPSHOT THE STRING, and the first version of it did not - a third vacuous
  // assertion caught in this one build. getComputedStyle returns a LIVE object, so comparing
  // cs.gridTemplateColumns after the restore compares the current value with itself and is true whatever
  // happened. The resolved value is copied into a plain string BEFORE the override instead.
  const gtc0=String(cs.gridTemplateColumns||'');
  const prev=rowEl.style.gridTemplateColumns;
  rowEl.style.gridTemplateColumns='min-content min-content';
  const mcTracks=(getComputedStyle(rowEl).gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
  rowEl.style.gridTemplateColumns=prev;
  const restored=String(getComputedStyle(rowEl).gridTemplateColumns||'')===gtc0&&gtc0!=='';
  const needed=mcTracks.length?r2(mcTracks.reduce((a,b)=>a+b,0)+gap*(mcTracks.length-1)):null;
  const neededClone=r2(kids.reduce((s,k)=>s+k.minC,0)+gap*(kids.length-1));
  return {rowX:r2(rr.left),rowR:r2(rr.right),rowW:r2(rr.width),gap,kids,tracks,
    btnX:r2(er.left),btnR:r2(er.right),btnW:r2(er.width),text:(el.innerText||'').trim(),
    needed,neededClone,mcTracks,restored,cloneShortfall:needed===null?null:r2(needed-neededClone),
    gtc:gtc0,gtcNow:String(cs.gridTemplateColumns||''),isFrGrid:/^1\.8fr\s+1fr$/.test((rowEl.style.gridTemplateColumns||'').trim()),
    fs:getComputedStyle(el).fontSize,ls:getComputedStyle(el).letterSpacing,
    docSW:document.documentElement.scrollWidth,vw:window.innerWidth};
});
// #427: THE SAME MEASUREMENT FOR THE OTHER BRANCH OF THE SAME CELL. demoRow() above selects
// `[data-ct="lesson-lines"]`, which IS NOT IN THE DOM in the Flip branch (measured: `hasLines:false` at all six
// column-states below), so it cannot be reused here and this branch needs its own helper.
//
// I FIRST WROTE HERE THAT demoRow RETURNS null AND ITS ASSERTIONS ARE THEREFORE *SKIPPED* RATHER THAN FAILED.
// THAT WAS WRONG AND IS WITHDRAWN IN PLACE [R18]. Its call sites all read `L.say(!!_dr && ...)`, so a null goes
// RED. MEASURED, because this build's headline claim rested on it: the PRE-#427 copy of this file
// (`git show HEAD:gates/regress/48-lesson-flow.js`) run against a trial bundle with `_demoLinesSlot` forced
// false - so EVERY lesson shows the Flip branch at the demo end - goes 238 PASS / 36 FAIL (bundle md5
// 810e7900f286). The existing gate fails loudly. It was never the selector.
//
// AND A SECOND CLAIM OF MINE IS CORRECTED HERE TOO, BY THIS BUILD'S ANTAGONIST A, BEFORE IT SHIPPED. I wrote
// "no gate had ever ENTERED the Flip branch". FALSE, and measured: this gate's OWN main loop drives demo-m0,
// demo-m1 and demo-m4 at se/kunal730/390, and the Flip button is on screen in all of them - the laid-out
// control set there is exactly ["Now I'll try it","Flip","Analyze","Copy moves"], so two existing assertions
// ("no laid-out control is hidden under the fixed footer", "a tap at the centre of each one reaches that
// control") have been running OVER this button at three geometries since #403.
//
// THE DEFENSIBLE CLAIM, which is still worth the block: no gate had ever measured THE DEMO ROW'S CONTAINMENT
// in its Flip branch. The button was visited and hit-tested; the box it sits in was never compared with the row
// that holds it. That is the same distinction US-INV-05 was written for - the viewport box and the row box are
// different boxes - one level further out: "a control was touched by some assertion" is not "the property you
// care about was measured". grep -rn '⟳ Flip' gates/regress outside 48-* returned 0 hits before this build
// (the exact pattern, published beside the count per #411/#412; note that `Flip board`, the ⋯ sheet's and the
// practice row's control, is a DIFFERENT string and does hit gates 26 and 48).
//
// WHY NO COLUMN MEASURED IT: every lesson-demo state that reaches the containment assertions drives the Italian
// Game, which HAS variations, so at the demo end `_demoLinesSlot` is true and demoRow() measures the OTHER
// branch. Gate 35 is viewport-keyed and runs no column below h=568. The branch was never unreachable - one line
// of an existing drive state gets here - it was simply never MEASURED, on the branch 145 of 170 lessons show at
// the demo end and ALL 170 show at every ply before it (25 of 170 LIB entries have a `vars` array: OPENINGS
// 25/65, ENDGAMES 0/16, MORE 0/89 - re-derived independently by antagonist A from lessons.js, exact).
// A missing COLUMN and a missing SELECTOR look identical from a log - both are silence - and the cheap way to
// tell them apart is the one used here: force the state universally and see whether the old gate screams.
// It screamed.
// The Flip button carries no data-ct, so it is found by its label AND by its sibling being the practice CTA -
// the sheet's "Flip board" is a different string and a different row, and matching it would measure the sheet.
// #427, FROM ANTAGONIST B: the lesson's secondary action row, measured by WHAT A FINGER WOULD HIT rather than
// by any box. Every box on this row is 43px tall, on screen, unclipped and unellipsised - the row passes every
// containment and ink check in this suite - and yet when it wraps, 14 of Analyze's own 43 pixel rows, and 4
// rows of its painted glyphs, return "Copy moves" from elementFromPoint. The only instrument that sees it is a
// per-pixel-row hit test down the button's own centre line.
const actionRowHit=(b)=>b.page.evaluate(()=>{
  const r2=n=>Math.round(n*100)/100;
  const find=(re)=>[...document.querySelectorAll('button')].find(x=>re.test((x.innerText||'').replace(/\s+/g,' ').trim()));
  const an=find(/Analyze/), cp=find(/Copy moves/);
  if(!an||!cp) return {found:false,hasAnalyze:!!an,hasCopy:!!cp};
  const ar=an.getBoundingClientRect(), cr=cp.getBoundingClientRect();
  const wrapped=cr.top>ar.top+1;
  const cx=ar.left+ar.width/2;
  let hitA=0,hitC=0,hitX=0,total=0;
  for(let y=Math.ceil(ar.top); y<Math.floor(ar.bottom); y++){
    const el=document.elementFromPoint(cx,y); total++;
    if(el===an||an.contains(el))hitA++; else if(el===cp||cp.contains(el))hitC++; else hitX++;
  }
  const g=document.createRange(); g.selectNodeContents(an);
  const ir=[...g.getClientRects()].filter(q=>q.width>0&&q.height>0);
  const inkTop=ir.length?Math.min(...ir.map(q=>q.top)):null, inkBot=ir.length?Math.max(...ir.map(q=>q.bottom)):null;
  let inkLost=0,inkRows=0;
  if(inkTop!=null) for(let y=Math.ceil(inkTop); y<Math.floor(inkBot); y++){
    inkRows++; const el=document.elementFromPoint(cx,y);
    if(!(el===an||an.contains(el))) inkLost++;
  }
  // #428 (patch-lesson-action-row-hit-area EDIT 1): the flip boundary - the first y INSIDE Analyze's own box
  // at which it stops answering for itself. Stepped at 0.125px because Chromium snaps hit rects to LayoutUnits,
  // so an integer scan and a half-pixel scan disagree by one row at this edge. null = the box answers for
  // itself all the way down, which is the target.
  let flipY=null;
  {const cxF=ar.left+ar.width/2;
   for(let y=Math.ceil(ar.top); y<ar.bottom; y+=0.125){
     const e=document.elementFromPoint(cxF,y);
     if(!(e===an||an.contains(e))){flipY=Math.round(y*1000)/1000;break;} }}
  return {found:true,hasAnalyze:true,hasCopy:true,wrapped,flipY,
    anTop:r2(ar.top),anBot:r2(ar.bottom),anH:r2(ar.height),cpTop:r2(cr.top),
    lineAdvance:wrapped?r2(cr.top-ar.top):null,
    overlap:wrapped?r2(ar.bottom-cr.top):null,
    hitA,hitC,hitX,total,inkTop:r2(inkTop),inkBot:r2(inkBot),inkRows,inkLost};
});
// The demo row's min-content + gap in the Flip branch. TWO constants, because the button's horizontal
// padding is 9px/6px under rowNarrow and 9px/15px above it: 2 x 9 = 18.00 = 244.77 - 226.77, measured.
// Module scope so both the narrow loop and the wide block below read the same numbers.
const FLIP_NEEDED=226.77;
const flipRow=(b)=>b.page.evaluate(()=>{
  const r2=(n)=>Math.round(n*100)/100;
  const cand=[...document.querySelectorAll('button')].filter(x=>/^⟳\s*Flip$/.test((x.innerText||'').replace(/\s+/g,' ').trim()));
  let el=null;
  for(const c of cand){const p=c.parentElement;if(!p)continue;
    if([...p.children].some(k=>/Now I'll try it/.test(k.innerText||''))){el=c;break;}}
  if(!el)return {found:false,seen:cand.length,hasLines:!!document.querySelector('[data-ct="lesson-lines"]')};
  const rowEl=el.parentElement,rr=rowEl.getBoundingClientRect(),er=el.getBoundingClientRect();
  const cs=getComputedStyle(rowEl),gap=parseFloat(cs.columnGap)||0;
  // TRACKS, NOT A DETACHED CLONE, and the row set to `min-content min-content` rather than read as resolved -
  // both corrections demoRow() paid for at #424 and neither is re-derived here: a clone reads 2.00px low, and
  // an `fr` track expands to fill whenever the content fits, so reading the RESOLVED tracks gives
  // "needed <= rowW" by construction at every geometry where the row is fine. The restore check snapshots the
  // resolved string BEFORE the override, because getComputedStyle returns a LIVE object and comparing it
  // afterwards compares it with itself.
  const gtc0=String(cs.gridTemplateColumns||'');
  const prev=rowEl.style.gridTemplateColumns;
  rowEl.style.gridTemplateColumns='min-content min-content';
  const mcTracks=(getComputedStyle(rowEl).gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
  rowEl.style.gridTemplateColumns=prev;
  const restored=String(getComputedStyle(rowEl).gridTemplateColumns||'')===gtc0&&gtc0!=='';
  const needed=mcTracks.length?r2(mcTracks.reduce((a,x)=>a+x,0)+gap*(mcTracks.length-1)):null;
  return {found:true,hasLines:!!document.querySelector('[data-ct="lesson-lines"]'),
    rowR:r2(rr.right),rowW:r2(rr.width),btnR:r2(er.right),btnX:r2(er.left),btnW:r2(er.width),
    past:r2(er.right-rr.right),needed,restored,mcTracks,gap,
    kids:[...rowEl.children].map(k=>({t:(k.innerText||'').replace(/\s+/g,' ').trim(),w:r2(k.getBoundingClientRect().width),fs:getComputedStyle(k).fontSize})),
    fs:getComputedStyle(el).fontSize,vw:innerWidth,docSW:document.documentElement.scrollWidth};
});
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
    /* #410: THIS EXPECTATION WAS KEYED TO THE GEOMETRY'S NAME - `geo==='se' ? no count : count` - which is
       the third copy of the same fault in four builds: gate 35's was fixed at #406, this file's OTHER one (the
       practice row's Try again label) at #409, and this was the last one the suite had. An expectation chosen
       by the fixture agrees with itself at every fixture in its own list, so it cannot see a change in the rule
       it is supposed to be checking - which is precisely what the comment above this line already admitted
       ("the three geometries happen to agree with the old rule, so this assertion did NOT go red on the
       change").
       It now reads the rule the app implements, the way gate 35 does: the count is present exactly when the
       DEMO BOARD can hold it, measured in the same visit, with 340 being the app's own `rowNarrow` boundary
       (chess.jsx, boardPx<340). Found by sweeping the whole suite for expectations derived from a geometry name
       or the viewport - see the run report for what the sweep actually found, because the list it started from
       was wrong about two of the three gates it named. */
    const lines=await b.rect('[data-ct="lesson-lines"]');
    const lTxt=((lines&&lines.text)||'').trim();
    const dmBoard=(await b.metrics()).board;
    const wantCount=!!dmBoard&&dmBoard.w>=340;
    /* #424 UPDATES THE NARROW BRANCH OF THIS EXPECTATION, because the label itself changed: Kunal's Desk answer
       R2-NARROW-LEVERS (choice `icon-font-ls`, decisions/desk-answers-2026-09-22-1500) drops the PAWN GLYPH as
       well as the count on a narrow board, so the narrow label is "Other lines" and no longer "♟ Other lines".
       BOTH BRANCHES ARE STILL ASSERTED, which is the point: "it no longer hangs off" would also be satisfied by
       the button disappearing, or by the glyph and the count dropping at EVERY width - and the second of those
       breaks his Z-06 condition rather than meeting it. The wide branch pins the glyph AND the count. */
    L.say(!!lines&&(wantCount?/^♟ Other lines \(3\)$/.test(lTxt):/^Other lines$/.test(lTxt)),
      geo+': the demo board is '+(dmBoard&&dmBoard.w)+' wide, so the button reads '+(wantCount?'"♟ Other lines (3)" - the Italian Game\'s three variations, WITH the pawn glyph, because the row can hold them':'"Other lines" with NO glyph and NO count, because it cannot')+'. Keyed to the BOARD, which is what decides it, and not to the geometry\'s name.',
      {board:dmBoard&&dmBoard.w,wantCount,label:lTxt});
    /* #424: THE TWO ASSERTIONS THE FIVE EARLIER PASSES AT THIS DEFECT DID NOT HAVE. See demoRow's header for why
       the row is the box that matters. Measured before and after on the #424 bundle, at 320x568 and 375x568
       alike (they are identical to the hundredth, because the row is the board and the board is fit to HEIGHT):
       before 189.73..312.30 against a row ending at 295.44 = 16.86px past it; after 200.83..295.42 = 0.02px
       INSIDE it, with the button's min-content 86.77 against a track of 94.59, so 7.82px of slack rather than
       the 2.52px that rung 2 of his ladder alone would have left. That margin matters and is not padding for its
       own sake: the levers doc's theCaveatThatMatters is that these widths come from headless Chromium on Linux,
       where the font stack falls back instead of resolving to the SF Pro on his phone. */
    const dr=await demoRow(b);
    /* #424, ANTAGONIST A: ASSERT WHAT THE PARENT IS. `demoRow` takes el.parentElement as "its own row" and
       never checked it, so wrapping this button in any span or flex shim would turn the headline assertion into
       "the button is inside its own wrapper", which cannot fail - the same containment trap CLAUDE.md lists five
       costumes of (clip-intersection, "the covering element is big", grid.contains(), flex-shrink absorbing the
       overrun, a footer's own total). The row is the two-track 1.8fr/1fr grid the whole analysis is about, so
       that is what gets named. */
    L.say(!!dr&&dr.restored===true,
      geo+': the min-content probe put the row\'s grid back exactly as it found it, so nothing measured after this line is reading a row this gate mutated',
      dr&&{restored:dr.restored,gtc:dr.gtc});
    L.say(!!dr&&dr.isFrGrid&&dr.tracks.length===2,
      geo+': the element being called "its own row" IS the demo row - the inline two-track 1.8fr/1fr grid ('+(dr&&dr.gtc)+'), not whatever happens to be this button\'s parent. Without this, wrapping the button in a span would make the next assertion unable to fail.',
      dr&&{inlineGtc:dr.isFrGrid,resolved:dr.gtc,tracks:dr.tracks});
    /* #424, ANTAGONIST A: and print the clone-vs-tracks disagreement every run rather than letting it hide
       inside `needed`. It is 2.00px at every rowNarrow geometry today; if it ever moves, the helper is measuring
       something new and this line says so before any pass/fail does. */
    L.say(!!dr&&dr.cloneShortfall!==null&&Math.abs(dr.cloneShortfall)<=2.5,
      geo+': the detached-clone min-content and the browser\'s resolved tracks disagree by '+(dr&&dr.cloneShortfall)+'px (tracks '+(dr&&dr.needed)+', clone '+(dr&&dr.neededClone)+'). Printed, not buried: the clone was what the first version of this gate believed, and it is the low one.',
      dr&&{tracks:dr.needed,clone:dr.neededClone,shortfall:dr.cloneShortfall});
    L.say(!!dr&&dr.btnR<=dr.rowR+0.5,
      geo+': the "Other lines" button is inside ITS OWN ROW, not merely inside the viewport - the row ends at '+(dr&&dr.rowR)+' and the button at '+(dr&&dr.btnR)+'. This is the box that #404, #405 and #406 all left overflowing while every viewport-keyed check stayed green.',
      dr&&{rowR:dr.rowR,btnR:dr.btnR,past:Math.round((dr.btnR-dr.rowR)*100)/100,text:dr.text});
    /* AND THE CAUSE, not only the symptom, so a future change that makes the box fit by truncating the label
       rather than by shrinking it cannot satisfy this: the two children's min-content plus the gap must fit the
       row. #415 built exactly that wrong fix (minWidth:0 plus an ellipsis), measured it squeezing the button to
       26.83px at 320x520, and reverted it. A box-only assertion would have called that a pass. */
    L.say(!!dr&&dr.needed<=dr.rowW+0.5,
      geo+': and it fits because the row can HOLD it - its two children\'s MIN-CONTENT plus gap comes to '+(dr&&dr.needed)+'px against a row of '+(dr&&dr.rowW)+'px - rather than because anything was truncated to make it fit. Measured by asking the browser for min-content tracks and restoring, because a detached clone reads 2.00px low and the RESOLVED fr tracks are tautological (they expand to the row whenever it fits).',
      dr&&{neededFromTracks:dr.needed,neededFromClone:dr.neededClone,rowW:dr.rowW,tracks:dr.tracks,kids:dr.kids,fs:dr.fs,ls:dr.ls});

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
 // #415 ADDS A THIRD ENTRY, 375x520, AND IT IS THE ONLY ONE THAT REACHES THE DEFECT THIS BLOCK NOW ALSO GUARDS.
 // The practice row's spill was filed as a 375x568 defect and it is not one: measured on the shipped #414
 // bundle, the axis is viewport HEIGHT alone. 320x520, 375x520 and 414x520 are IDENTICAL TO THE HUNDREDTH
 // (row 192, button 36, ink 13.89px past each edge, 7.89px on top of the hint button), spill starts at h<=563
 // and reaches the hint button at h<=545, and 375x568 is clean with 5.55px of clearance. So none of this
 // gate's columns - 320x568, 375x730, 390x844, short375, 390x568 - could see it, and neither could any of
 // gate 26's. The headless UAT lane bisected the threshold and corrected the flag
 // (`uat413-practice-row-spill-is-a-height-threshold-not-375x568`); I re-measured it here before believing it.
 // 520 is not exotic: a phone with a 568 or 667 point screen loses 50 to 150 points to browser toolbars.
 /* #424, ANTAGONIST B: THE RESIDUAL IS A BAND AND THE PIN WAS ONE HEIGHT WIDE - #415's own antagonist lesson
    ("a pin at one point is a frozen denominator") arriving for the third time in this same block. Measured on the
    shipped bundle, the lesson-lines button past its own row, by viewport height at BOTH widths:
      h<=520  39.55     h=540  19.16     h=550  12.52     h=560  0.00 (fits)     h=568  -0.02 (fits)
    so the overflow is a continuous band roughly 521..556 wide, and pinning only h=520 left every height inside it
    able to get worse in silence. 320x540 is added as a second point IN the band. The arithmetic that predicts the
    whole band from one number is worth stating, because it is what makes these pins checkable rather than
    remembered: the two children's resolved tracks plus the gap come to 231.55px at every geometry under rowNarrow
    (both labels are fixed strings there), so the residual at any height is simply 231.55 minus the board width. */
 for(const geo of ['short375','390x568','375x520','320x520','320x540']){
   const g = geo==='390x568' ? {w:390,h:568,safe:'',label:'390x568 = the wide-and-short corner, one step up'}
           : geo==='375x520' ? {w:375,h:520,safe:'',label:'375x520 = short enough that the practice row starves'}
           : geo==='320x520' ? {w:320,h:520,safe:'',label:'320x520 = narrow AND short: the worst case of both rows'}
           : geo==='320x540' ? {w:320,h:540,safe:'',label:'320x540 = inside the overflow band, not at its floor'} : geo;
   const vw = typeof g==='object' ? g.w : L.GEOS[g].w;
   const b=await L.launch({geo:g,name:'lesson-flow-wideshort-'+geo});await b.open();
   L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
   await D.states['practice-m0'](b);
   /* CONTROLLED, #410, with a one-line trial bundle: chess.jsx:6161's demo label keyed back to `vp.w<NARROW`
      (md5 901531c8998f via CT_OUT, chess.jsx md5-verified restored after). 219 pass, 2 FAIL, and the two are
      the label assertion below at each of the two wide-and-short columns.
      THE DETAIL WORTH READING, because it is the whole argument for this column: THE RE-KEYED EXPECTATION IN
      THE MAIN LOOP STAYED GREEN ON THAT CONTROL. At 320x568, 375x730 and 390x844 a viewport rule and a board
      rule give the same answer, so reading the rule instead of the fixture removed the tautology but caught
      nothing on its own. The re-key and the column are two halves of one fix: the first makes the assertion
      mean something, the second gives it a fixture where the two rules disagree. An assertion keyed to the
      right variable, run only where every variable agrees, is still unable to fail. */
   /* #410: THE DEMO ROW'S COUNTED LABEL, at the two geometries that can tell the two rules apart. This is the
      column the re-keyed expectation above needed: at 320x568 and at 375x730 a viewport rule and a board rule
      AGREE, which is why keying it to `geo==='se'` stayed green through #406's change. Here they disagree - the
      viewport is 375 or 390 and the demo board is 270.88 - so the label must have NO count, and a bundle keyed
      to the viewport shows one. */
   await D.states['demo-end'](b);
   const dm=await b.metrics(), dl=await b.rect('[data-ct="lesson-lines"]');
   const dTxt=((dl&&dl.text)||'').trim();
   L.say(!!dm.board&&dm.board.w<340,geo+': the DEMO board is under 340 here too ('+(dm.board&&dm.board.w)+') while the viewport is '+vw,{board:dm.board&&dm.board.w,vw});
   L.say(!!dl&&/^Other lines$/.test(dTxt),geo+': so the demo end\'s button reads "Other lines" with NO glyph and NO count - the assertion a viewport-keyed rule gets wrong, because 375 and 390 are above any threshold anyone would set while the row is 270.88 wide. The glyph went at #424 on Kunal\'s Desk answer R2-NARROW-LEVERS; the count went at #404 on his earlier one.',dTxt);
   /* #415 PINS THIS AT 375x520 INSTEAD OF ASSERTING IT, because at that height the button really is off the
      screen and the fix is not this build's to make. MEASURED on the shipped #414 bundle at the demo end:
      320x520 puts it at 229.17..351.73, 31.73px past the right edge of a 320 viewport; 375x520 at
      256.67..379.23, 4.23px past; and documentElement.scrollWidth EQUALS the viewport at both, so nothing
      scrolls to recover it. It is `width320-gate-red-needs-kunal` (closed at #404) arriving at a geometry
      nobody had measured: #404 dropped the count below a VIEWPORT threshold so the label fits at 320 wide,
      #406 re-keyed the row to the BOARD, and at a short viewport the board is 192 rather than 270.88 so the
      two-column grid gives this button a 93px cell for a 122.56px nowrap label.
      THE OBVIOUS FIX WAS BUILT, MEASURED AND REVERTED IN THIS PASS: minWidth:0 plus an ellipsis stops the
      overflow and squeezes the button to 26.83px at 320x520 - the glyph and an ellipsis - and starts
      truncating at 375x568 too, where nothing was wrong. It destroys Kunal's own answer (the words "Other
      lines") at every short geometry to fix one. So it is filed with its options as
      `lesson-lines-off-screen-on-a-short-viewport-2026-09-18` and pinned here to its MEASURED value, the way
      35-width-containment pinned its own 38.9px: red if it is fixed and the pin should come out, red if it
      gets worse. It is NOT excused - the log carries the number every run. */
   /* #415's antagonist pass: THE PIN WAS ONE POINT WIDE AND IT WAS THE BEST CASE. Pinned only at 375x520
      (4.23px), the 320x520 case - 31.73px, SEVEN AND A HALF TIMES WORSE, and named in this build's own commit
      message - sat in no column of any gate and could never go red. That is #395's frozen denominator applied
      to a geometry list: fix 375x520 alone and the suite would go green with the worse case still broken. Each
      pinned geometry now carries its OWN measured value. Off-screen heights the antagonist bisected and that
      are still NOT pinned, said out loud rather than implied: 375x525 (3.00px), 375x530 (1.31) and 375x531
      (1.00), inside from 375x533. */
   /* ══ #424: BOTH PINS ARE GONE, BECAUSE THE DEFECT THEY PINNED IS FIXED - AND THE PIN'S OWN COMMENT SAID THIS
      IS HOW IT ENDS ("red if it is fixed and the pin should come out"). It went red on this build exactly as
      designed, which is what a pin is for.
      WHAT CLOSED IT: Kunal's Desk answer R2-NARROW-LEVERS, choice `icon-font-ls` (decisions/desk-answers-
      2026-09-22-1500), applied at chess.jsx's lesson-lines button under `rowNarrow` - drop the pawn glyph, font
      floor 14->12px, letter-spacing 0.3->0. His rule for the whole class is "shrink beats dropping content",
      which is why #415's minWidth:0-plus-ellipsis is still the wrong answer and is still not what shipped.
      MEASURED BEFORE AND AFTER ON THE #424 BUNDLE, at the demo end, past the RIGHT EDGE OF THE VIEWPORT:
        375x520   +4.23  ->  -51.95   (inside)
        320x520  +31.73  ->  -24.45   (inside)
      CORRECTED AT #424 BEFORE THE PUSH, AND BOTH BLIND ANTAGONISTS FOUND IT INDEPENDENTLY. The first draft of
      this block recorded -29.56 and -2.06. Those are the SUPERSEDED 12:02 ET bundle's numbers, taken when only
      the lesson-lines button had shrunk; the shipped bundle reads -51.95 and -24.45, and the 22.39px gap is
      exactly the FIRST button's own shrink, which landed afterwards. The other numbers in this block were
      re-measured and these two were not, so a reader had no way to tell which lines were current - which is
      CLAUDE.md's "when a rule quotes a source, the next reader will trust the quotation" pointed at a gate file.
      so the one kind of overflow CLAUDE.md calls unrecoverable is closed at every column this gate has, and the
      assertion below is now a real containment check at all four rather than a pin at two of them.
      WHAT IS NOT CLOSED, AND IS PINNED INSTEAD OF BEING DROPPED: at h=520 the board is 192 and the button is
      still 39.55px past ITS OWN ROW (it was 95.73). the ladder applied to the WHOLE row took the two children's
      resolved tracks from 287.73px to 231.55px against a row of 192, so it is still short by 39.55px. Shrinking has
      now been spent on every button in the row and cannot close it: it needs a wrap or a second row, which
      spends board height and is therefore his decision and not this lane's. The row residual
      is pinned per geometry at its OWN measured value - #415's antagonist lesson, that a pin at one point is a
      frozen denominator - and reported every run rather than excused. */
   const _lnOff = dl ? Math.round((dl.x+dl.w-vw)*100)/100 : null;
   L.say(!!dl&&dl.x>=-0.6&&dl.x+dl.w<=vw+0.6,geo+': the "Other lines" button is inside the viewport - '+_lnOff+'px past its right edge, so at or inside it. This was +4.23 at 375x520 and +31.73 at 320x520 before #424 and was PINNED as a live unrecoverable defect at both; his icon-font-ls ladder closed it.',{l:dl&&dl.x,r:dl&&dl.w!=null?Math.round((dl.x+dl.w)*100)/100:null,vw,was:{'375x520':4.23,'320x520':31.73}[geo]});
   const _dr=await demoRow(b);
   const _rowPin={'375x520':39.55,'320x520':39.55,'320x540':19.16}[geo];
   if(_rowPin!==undefined){
     L.say(!!_dr&&Math.abs(Math.round((_dr.btnR-_dr.rowR)*100)/100-_rowPin)<=0.6,
       geo+': the ROW residual is where #424 left it - the button runs '+(_dr&&Math.round((_dr.btnR-_dr.rowR)*100)/100)+'px past its own row (pinned at '+_rowPin+', down from 95.73 before the ladder) because at board 192 the row cannot hold both buttons\' min-content ('+(_dr&&_dr.needed)+'px against '+(_dr&&_dr.rowW)+'px). REPORTED, not excused: it needs a wrap or a second row, which is a board-height cost and so Kunal\'s call.',
       _dr&&{past:Math.round((_dr.btnR-_dr.rowR)*100)/100,pinned:_rowPin,needed:_dr.needed,rowW:_dr.rowW,kids:_dr.kids});
     /* #424, ANTAGONIST A (F4): THE CAUSE IS PINNED HERE TOO, not just the box. The main loop's "the row can HOLD
        it" assertion runs only at se/kunal730/390, so it does NOT run at either geometry where the row
        demonstrably cannot hold its children - which is exactly where #415 built and reverted the
        minWidth:0-plus-ellipsis. A box-only pin is satisfied by an ellipsis: truncate the label and the button
        fits its track, the residual changes, and nothing says the words were eaten. Pinning the SHORTFALL
        (resolved tracks plus gap, minus the row) makes that visible, because truncation drops `needed`. It equals
        the box residual here by construction - the overflowing button is the last track - and that agreement is
        itself the cross-check. */
     L.say(!!_dr&&_dr.needed!==null&&Math.abs(Math.round((_dr.needed-_dr.rowW)*100)/100-_rowPin)<=0.6,
       geo+': and the CAUSE is where it was left - the row\'s two resolved tracks plus gap need '+(_dr&&_dr.needed)+'px against a row of '+(_dr&&_dr.rowW)+'px, a shortfall of '+(_dr&&Math.round((_dr.needed-_dr.rowW)*100)/100)+'px (pinned at '+_rowPin+'). Nothing was truncated to make the box fit: an ellipsis would drop this number and leave the box one happy.',
       _dr&&{needed:_dr.needed,rowW:_dr.rowW,shortfall:Math.round((_dr.needed-_dr.rowW)*100)/100,pinned:_rowPin,clone:_dr.neededClone,tracks:_dr.tracks});
   } else {
     L.say(!!_dr&&_dr.btnR<=_dr.rowR+0.5,
       geo+': and it is inside ITS OWN ROW too ('+(_dr&&_dr.btnR)+' against a row ending at '+(_dr&&_dr.rowR)+') - the box that stayed overflowing through #404, #405 and #406 while every viewport check was green',
       _dr&&{btnR:_dr.btnR,rowR:_dr.rowR,needed:_dr.needed,rowW:_dr.rowW});
   }
   /* ══ #427: THE FLIP BRANCH, WHICH NO GATE HAD EVER ENTERED. jobs/flip-branch-overflows-its-row-and-no-gate-
      visits-it-2026-09-27, raised by BOTH of #424's blind antagonists (A's F1 and B's P1-B - one finding, two
      finders). The demo row's second cell holds "Other lines" when the demo has ended AND the lesson has
      variations, and "⟳ Flip" otherwise. Everything above measures the first. NOTHING measured the second's CONTAINMENT
      against its own row - the button itself IS visited and hit-tested by the main loop at three geometries,
      which the first draft of this comment denied and antagonist A measured - and NOT
      for the reason the first draft gave either. It said demoRow() returns null here so its assertions
      are SKIPPED rather than failed; that is WITHDRAWN [R18]. MEASURED: the pre-#427 copy of this file, run
      against a bundle with `_demoLinesSlot` forced false, goes 238 PASS / 36 FAIL - the old gate fails loudly.
      The real reason is that NO COLUMN ENTERS THE STATE: every lesson-demo state here and in gate 26 drives the
      Italian Game, which HAS variations, so the Flip branch never renders; gate 35 runs no column below h=568.
      It was never unreachable - one line of an existing drive state gets here - it was simply never visited.

      MEASURED THIS BUILD on the #427 bundle under test (md5 95fa1c00fcc8), which differs from the shipped #426
      bundle (b2f11ac43e82) ONLY by the three occurrences of the build stamp - antagonist A verified that
      independently by normalising the stamp out of both files and getting one md5, 726f7a5ad919. Two samples 500ms apart identical at
      every column, `needed` from the row's own min-content tracks:

        column            board     past its OWN row    needed    inside the viewport by
        375x568 (short375) 270.88        -0.02          226.77          52.08
        390x568            270.88        -0.02          226.77          59.58
        375x520            192.00        34.77          226.77          56.73
        320x520            192.00        34.77          226.77          29.23
        320x540            212.39        14.38          226.77          39.44

      THE BAND ARITHMETIC, and it is what makes this a band rather than #415's frozen point: `needed` is
      226.77px at EVERY column under rowNarrow, because both labels are fixed strings at 14px with 9px/6px
      padding, and the row is sized to the BOARD. So the residual at any height is simply 226.77 minus the
      board width, and the row overflows itself exactly while boardPx < 226.77. Bisected at 320 wide:
        h=520  34.77   h=530  28.94   h=540  14.38   h=548  9.09   h=550  7.73   h=552  6.45
        h=553   5.81   h=554   5.09   h=555   4.45   h=556  0.00 (board steps 222.31 -> 230.95)  h=568  -0.02
      so the band is every height <= 555 and it is contained from 556 up. Width is NOT an axis: 320x520,
      375x520 and 414x520 are identical to the hundredth, because the lesson board is fit to HEIGHT.
      (Not pinned, and said out loud rather than implied: heights 521-539, 541-547, 549, 551-555 are inside the
      band and have no column here. The formula assertion below is what covers them, which is precisely why it
      is worth having beside the per-geometry pins rather than instead of them.)

      WHY IT IS PINNED AND NOT FIXED. #424 built the fix and ANTAGONIST B VETOED IT, correctly: keying Kunal's
      icon-font-ls ladder to `rowNarrow` alone shrinks this branch's text on 145 of 170 lessons at 320x568,
      where it is ALREADY contained with 0.02px of slack, for no containment gain - so the floor is keyed to the
      SLOT instead. Antagonist A then measured that the floor would have taken h=520 from 34.77 to 4.03px, which
      HELPS AND DOES NOT CLOSE IT. Shrinking is spent; closing it needs a wrap or a second row, which costs
      board height, and board height is Kunal's call and not this lane's (CLAUDE.md: "if a fix costs board
      height, put it in a sheet"). Routed to the orchestrator for the Desk this build. So it is REPORTED every
      run, at its own measured value per column, the way the lesson-lines residual was from #415 to #424 - and
      that pin's own history is the argument for this one: it went red at #424 exactly when the defect was
      fixed, which is what a pin is for.

      AND IT IS NOT THE UNRECOVERABLE KIND, which is asserted rather than assumed: the button sits 29.23px
      INSIDE the viewport at its worst column. A row overflow and an off-screen control are different defects
      with different severities, and #415's "Other lines" was the second kind (31.73px PAST a 320 edge with
      documentElement.scrollWidth equal to the viewport). Saying which one this is, in the log, every run, is
      the difference between a reader acting on it tonight and a reader filing it. */
   const _flipStates = geo==='320x520' ? ['endgame-demo-end','demo-m1'] : ['endgame-demo-end'];
   for(const _fst of _flipStates){
     /* endgame-demo-end is the Flip branch at the DEMO END (Endgames: 0 of 16 entries have `vars`, so this is
        the 145-of-170 case, and it is where a player RESTS). demo-m1 is the same branch mid-demo on the
        ITALIAN GAME - a lesson that DOES have variations - which is the 170-of-170 half of the claim. Measured
        identical to the hundredth at 320x520, so the branch does not depend on how it was reached; it is run
        at one column rather than five because proving that costs one drive, not five. */
     await D.states[_fst](b);
     const _f1=await flipRow(b);
     await b.settle(500);
     const _f=await flipRow(b), _fm=await b.metrics();
     const _tag=geo+' ['+_fst+']';
     /* ASSERT THE STATE WAS REACHED BEFORE ASSERTING ANYTHING ABOUT IT (#385's rule). If the drive lands
        somewhere else, or the label changes, `found:false` must be a FAILURE and not a quiet skip - which is
        exactly the failure mode this whole block exists to remove. `hasLines` false is the other half: it
        proves this is the branch demoRow() cannot see, rather than a second reading of the one it can. */
     L.say(_f.found===true&&_f.hasLines===false,
       _tag+': the demo row is in its ⟳ Flip branch - the button is there AND [data-ct="lesson-lines"] is NOT in the DOM, which is why demoRow() cannot be reused here. The suite never measured THIS BRANCH\'S CONTAINMENT against its own row - the button is visited and hit-tested by the main loop, but the box it sits in was never compared with the row holding it - and not because that selector fails quietly: it does not, the pre-#427 gate goes 36 RED when forced into this branch. On the branch 145 of 170 lessons show',
       {found:_f.found,seen:_f.seen,hasLines:_f.hasLines,kids:_f.kids});
     L.say(_f.restored===true,_tag+': and the row\'s gridTemplateColumns was put back after the min-content probe (snapshotted as a string first - a live getComputedStyle compares with itself and passes whatever happened)',{restored:_f.restored});
     /* A FLAKY PIN IS WORSE THAN NO PIN (#387). My own bisect read the board 15px small at 320x551 once and
        monotonic on both re-runs, so the board CAN be read before it settles. Two samples 500ms apart must
        agree, and the SETTLED one is what every assertion below uses. */
     L.say(_f1.found&&_f.found&&Math.abs(_f1.past-_f.past)<=0.2,
       _tag+': two samples 500ms apart agree on the residual ('+_f1.past+' then '+_f.past+') - the board can be read before it settles, so this is measured twice and the settled sample is what is pinned below',
       {first:_f1.past,settled:_f.past});
     /* THE CAUSE, PINNED. An ellipsis or a minWidth:0 "fix" satisfies a box check by eating the label and
        DROPS this number - which is why the cause is pinned beside the box, exactly as it is for lesson-lines
        above. It is also the term that makes the band arithmetic checkable rather than remembered. */
     L.say(_f.needed!==null&&Math.abs(_f.needed-FLIP_NEEDED)<=0.6,
       _tag+': the row\'s two min-content tracks plus gap need '+_f.needed+'px (pinned at '+FLIP_NEEDED+', which is a ROWNARROW-ONLY constant). THE TERM IS THE FLIP BUTTON\'S HORIZONTAL PADDING, NOT ITS FONT - 9px/6px under rowNarrow against 9px/15px above it, and 2 x 9 = 18.00 = 244.77 - 226.77 to the hundredth. This build first printed "because both labels are fixed strings at 14px" and its OWN negative control disproved it: NC1 changes only that padding and moves needed to 244.77 at all six column-states, while at 375x730 the same strings at the same 14px and the same 0.3px letter-spacing give 244.77. Nothing was truncated to make a box fit either: an ellipsis would drop this number and leave the box one happy.',
       {needed:_f.needed,pinned:FLIP_NEEDED,tracks:_f.mcTracks,gap:_f.gap,fs:_f.fs});
     /* THE RESIDUAL, PER COLUMN, AT ITS OWN MEASURED VALUE - #415's antagonist lesson, that one pinned point is
        a frozen denominator and is usually the BEST case. Two columns are contained and are asserted as
        containment, not pinned; three carry a real number. */
     const _fp={'375x520':34.77,'320x520':34.77,'320x540':14.38}[geo];
     if(_fp!==undefined){
       L.say(Math.abs(_f.past-_fp)<=0.6,
         _tag+': ⟳ Flip runs '+_f.past+'px past its OWN row (pinned at '+_fp+'), because at board '+_fm.board.w+' the row cannot hold its two children\'s min-content ('+_f.needed+'px against '+_f.rowW+'px). REPORTED, not excused: shrinking is already spent here - #424 measured the font ladder taking this to 4.03 and not to zero - so closing it needs a wrap or a second row, which spends board height and is therefore Kunal\'s call.',
         {past:_f.past,pinned:_fp,needed:_f.needed,rowW:_f.rowW,board:_fm.board&&_fm.board.w});
     } else {
       L.say(_f.past<=0.5,
         _tag+': ⟳ Flip is inside its own row here ('+_f.btnR+' against a row ending at '+_f.rowR+') - this is the geometry antagonist B\'s veto turned on, where the branch is already contained with 0.02px of slack and a font floor would have bought nothing',
         {past:_f.past,btnR:_f.btnR,rowR:_f.rowR,needed:_f.needed,rowW:_f.rowW});
     }
     /* THE BAND, not the point. This is the assertion that covers the ~30 heights inside the band that have no
        column of their own. Its content is a fact about the MECHANISM rather than about this geometry list:
        the demo row is exactly the board's width (#406 re-keyed this row to the board), so residual =
        226.77 - boardPx at every height, and the two quantities are measured from different rects - the board
        grid on one side, the row and button on the other. If the board stops sizing this row, this goes red
        while the per-column pins above stay green, and that difference is the diagnosis. */
     const _pred=Math.round(Math.max(0,FLIP_NEEDED-_fm.board.w)*100)/100;
     const _seen=Math.max(0,_f.past);
     L.say(!!_fm.board&&Math.abs(_fm.board.w-_f.rowW)<=0.6&&Math.abs(_seen-_pred)<=0.6,
       _tag+': and the residual is the BAND and not this column - the row is the board\'s own width ('+_f.rowW+' against a board of '+_fm.board.w+'), so it is '+FLIP_NEEDED+' minus the board at every height, predicting '+_pred+' against a measured '+_seen+'. This is what covers heights 521-555, which have no column of their own; the band runs to h=555 and is contained from 556.',
       {board:_fm.board&&_fm.board.w,rowW:_f.rowW,predicted:_pred,measured:_seen});
     /* WHICH KIND OF OVERFLOW IT IS. Asserted, because the severity is the whole difference between this and
        the defect #424 closed, and a reader of the log should not have to go and find out. */
     L.say(_f.btnX>=-0.6&&_f.btnR<=_f.vw+0.6&&_f.docSW<=_f.vw+0.6,
       _tag+': and it is a ROW overflow and NOT the unrecoverable kind - the button ends at '+_f.btnR+' inside a '+_f.vw+' viewport ('+Math.round((_f.vw-_f.btnR)*100)/100+'px of clearance) with nothing scrolling. "Other lines" in this same cell was the other kind at #415: 31.73px PAST a 320 edge with documentElement.scrollWidth equal to the viewport.',
       {btnX:_f.btnX,btnR:_f.btnR,vw:_f.vw,docSW:_f.docSW});
     /* ══ #427, ANTAGONIST B'S VETO, AND IT IS A WRONG ACTION RATHER THAN A COSMETIC ONE. Seven pixels below
        the ⟳ Flip button this block was written for, the secondary action row (MOVES · 🔍 Analyze · 📋 Copy
        moves) WRAPS, and when it wraps its two lines sit 29px apart while the buttons are 43px tall - so the
        boxes overlap by exactly 14.00px (43 - 29) and "📋 Copy moves", later in the DOM, wins the hit test.
        A TAP ON THE PAINTED WORD "Analyze" FIRES "Copy moves". B confirmed it with a real click at (209.9,
        370.0) raising the "Copied!" toast, against a control click at the button's centre that correctly
        leaves the lesson - two distinguishable actions, and the wrong one fires.

        RE-MEASURED HERE RATHER THAN TAKEN ON TRUST, on the same bundle, and it reproduces:
          column    board    wraps   overlap   rows of Analyze's own box that hit Copy   rows of its INK that do
          375x568   270.88    no       -         0 of 42                                  0
          390x568   270.88    no       -         0 of 42                                  0
          375x520   192.00    yes     14.00     14 of 43                                  4
          320x520   192.00    yes     14.00     14 of 43                                  4
          320x540   212.39    yes     14.00     14 of 42                                  4
        and in PRACTICE it wraps at 320x568 and 375x568 too (board 230.9), which are columns this gate already
        drives - so this is not confined to the short corner.

        AND B'S PROPOSED REMEDY IS CORRECTED HERE, per CLAUDE.md's rule that a flag's fix is a hypothesis and
        not a prescription. B suggested asserting the row's `scrollHeight > clientHeight` (#398's "assert the
        squeeze"). MEASURED: that difference is 10px at EVERY column, wrapped or not, so it cannot tell the two
        apart and an assertion built on it would be green on the broken case and red on the healthy one alike.
        What discriminates is the HIT TEST - 0 rows lost when the row does not wrap, 4 rows of painted ink lost
        when it does - so that is what is asserted.

        THIS IS PRE-EXISTING AND NOT THIS BUILD'S DOING: no application code changed at #427, so it is #426's
        state too. It is PINNED at its measured value rather than asserted to zero, for the same reason the Flip
        residual above is: a pin reports the number every run and goes red in EITHER direction, where an
        assert-zero would put the suite red and block work that is unrelated to it. It is NOT excused - the log
        carries "a tap on the ink fires the wrong button" every run - and it is filed as its own P0 with these
        numbers, jobs/lesson-action-row-wraps-and-analyze-taps-fire-copy-moves-2026-09-28, named as the next
        run's first item. Same family as #395's container-is-not-its-contents pointed a third way: the container
        is fine (43px tall, on screen, nothing clipped, ink unellipsised) and what is silently lost is the HIT
        AREA. */
     if(_fst==='endgame-demo-end'){
       const _ar=await actionRowHit(b);
       L.say(_ar.found===true,
         geo+': the lesson\'s secondary action row is there with both 🔍 Analyze and 📋 Copy moves, so the hit assertions below are not vacuous',
         {found:_ar.found,analyze:_ar.hasAnalyze,copy:_ar.hasCopy,wrapped:_ar.wrapped,board:_fm.board&&_fm.board.w});
       const _wrapPin={'375x520':14,'320x520':14,'320x540':14}[geo];
       if(_wrapPin!==undefined){
         /* #428 AMENDED, AND THE AMENDMENT ITSELF IS AMENDED because the fix landed in the SAME build.
            docs/patch-lesson-action-row-hit-area-2026-09-28 wrote these two edits for a world where the
            amendment landed BEFORE the fix, so they re-pin the defect at its measured value. #428 fixes the
            row (chess.jsx:6602, rowGap:22), so a pin at 14.00px overlap and 4 lost ink rows would be a gate
            asserting the bug is still there - red on a healthy build. The SUBSTANCE of both amendments is
            adopted and only the direction changes:
              (1) antagonist A - the 14.00px overlap is a SYMPTOM and is DEMOTED to a printed diagnostic. A
                  -8px margin moves it to 10.00 with the defect standing (NC2, md5 8ec730fd8697).
              (2) antagonist B - the ink count travels WITH its interval convention, and the flip boundary is
                  asserted SEPARATELY, because a lost-ink count alone goes green on that same -8px bundle
                  while 10 of 43 box rows still fire the wrong button.
            AND THE PATCH'S OWN ABSOLUTE PIN IS NOT USED. It asked for Math.abs(flipY-367.125)<=0.4, and its
            closing note says that number is a 320x520/375x520 number: at 320x540 the same boundary measures
            387.500. This branch runs at all three columns, so that assertion would have been RED at 320x540
            on any bundle. The patch names the better form itself - assert the relation, not the absolute -
            and the fixed state's relation is simply that there is no flip inside the box at all. [R18] */
         L.say(_ar.found&&_ar.wrapped===true,
           geo+': (fixture) the action row WRAPS at board '+(_fm.board&&_fm.board.w)+', which is the state the hit assertions below are written for - they are about the wrapped side of the boundary and would be vacuous unwrapped',
           {wrapped:_ar.wrapped,board:_fm.board&&_fm.board.w});
         L.note(geo+': DIAGNOSTIC overlap='+_ar.overlap+'px (was PINNED at '+_wrapPin+' through #427; DEMOTED at #428 - it is a SYMPTOM, and -8px margins take it to 10.00 with the defect still live)  lineAdvance='+_ar.lineAdvance+'  boxes '+_ar.anH+'px  whole-box rows lost '+_ar.hitC+' of '+_ar.total);
         L.say(_ar.found&&_ar.inkLost===0,
           geo+': FIXED AT #428 - '+_ar.inkLost+' of '+_ar.inkRows+' pixel rows of the PAINTED WORD "Analyze" hit another control (TARGET 0, reached; it was 4 through #427). Sampled at integer y over the half-open interval [ceil(inkTop), floor(inkBot)) down the button\'s own centre line - an integer scan and a half-pixel-centre scan disagree by one row at this boundary, which is why #427 published 4 and antagonist B published 5, and why the convention travels with the number',
           {inkLost:_ar.inkLost,inkRows:_ar.inkRows,target:0,interval:'[ceil(inkTop), floor(inkBot))',hitC:_ar.hitC,total:_ar.total});
         L.say(_ar.found&&_ar.flipY===null,
           geo+': and there is NO y inside "Analyze"\'s own box at which it stops answering for itself (stepped at 0.125px from its top; flipY='+_ar.flipY+', target null, box '+_ar.anTop+'..'+_ar.anBot+', Copy\'s top '+_ar.cpTop+'). THIS IS THE ASSERTION THAT CATCHES A PARTIAL FIX: at -8px margins the ink count above reaches 0 and this one stays red, because 10 of 43 box rows still fire the wrong button (NC2, md5 8ec730fd8697) - and at rowGap:20, which clears the ink, it stayed red too because the hit rect snaps 0.875px above the touching edge. That measurement is why the shipped gap is 22 and not 20',
           {flipY:_ar.flipY,target:null,anTop:_ar.anTop,anBot:_ar.anBot,cpTop:_ar.cpTop,step:0.125});
       } else {
         L.say(_ar.found&&_ar.wrapped===false&&_ar.inkLost===0,
           geo+': the action row does NOT wrap at board '+(_fm.board&&_fm.board.w)+', so every pixel row of "Analyze" hits Analyze ('+_ar.hitA+' of '+_ar.total+') and none of its ink is lost. This is the healthy side of the boundary, and it is asserted so the pinned columns above are a contrast and not a lone number',
           {wrapped:_ar.wrapped,inkLost:_ar.inkLost,hitA:_ar.hitA,total:_ar.total});
       }
     }
   }
   await b.shot('lesson-flip-branch-'+geo);
   await D.states['practice-m0'](b);
   const r0=await row(b), ri=await rowInk(b), m=await b.metrics();
   L.say(r0.length===4,geo+': the practice row is there at all (four controls)',r0.map(x=>x.a).join(','));
   L.say(!!m.board&&m.board.w<340,geo+': and the board really is under 340 wide here ('+(m.board&&m.board.w)+') while the viewport is '+vw+' - which is why a viewport threshold cannot decide this row',{board:m.board&&m.board.w,vw});
   const budget=r0.length===4?Math.round((r0[3].right-r0[0].x-(3*46)-(3*6))*100)/100:null;
   /* #415 RE-KEYS THIS TO THE RULE THE APP NOW IMPLEMENTS, WHICH IS THREE-WAY RATHER THAN TWO-WAY, and the
      expectation is computed from the same arithmetic the app uses rather than from this geometry list -
      #410's rule, an expectation keyed to the fixture agrees with itself at every fixture in its own list.
      The app chooses on boardPx: < 229 the bare glyph, < 340 the short label, otherwise the long one. The row
      hands the flexible button boardPx - 3*46 - 3*6, so boardPx < 229 is budget < 73 and boardPx < 340 is
      budget < 184. The INK widths are what those thresholds are there to clear: 63.78px for "↻ Again" and
      92.52px for "↻ Try again". */
   const wantLabel = budget===null?null : budget<73 ? '↻' : budget<184 ? '↻ Again' : '↻ Try again';
   L.say(budget!==null&&r0[2].t===wantLabel,geo+': the ↻ button reads "'+wantLabel+'", computed from the budget the row actually leaves it ('+budget+'px) and the rule the app implements, not from this geometry list. Under 73px there is no room for a word at all - the short label needs 63.78px of ink plus its 4px of padding each side - so it falls back to the bare glyph, which is what chess.jsx:5221 already does for this action in the demo row.',{budget,label:r0.length===4?r0[2].t:null});
   const bad=(ri.btns||[]).filter(x=>x.inkR!==null&&(x.overR>0.5||x.overL>0.5));
   L.say(bad.length===0,geo+': every label paints INSIDE its own button (this is the assertion the defect crossed: 8.83px past the right edge, 8.81px past the left)',bad.map(x=>x.a+' overR '+x.overR).join(' | ')||'none');
   L.say(!!ri.worstOverlap&&ri.worstOverlap.inkBleed!==null&&ri.worstOverlap.inkBleed<=0,geo+': and no label\'s ink reaches the next button (it bled 2.83px onto the ⋯ before the fix)',ri.worstOverlap);
   L.say(r0.length===4&&r0.every(x=>x.x>=-0.6&&x.right<=vw+0.6),geo+': and every box is still inside the viewport - true BEFORE the fix as well, which is why this column needed the ink assertions above rather than another containment check',r0.map(x=>x.a+':'+x.right).join(' '));
   L.say(m.over.docScroll===0,geo+': nothing scrolls the page here',m.over);
   await b.shot('lesson-practice-row-'+geo);
   await b.close();
 }
 /* ══ #427, ANTAGONIST A: THE FLIP BRANCH ABOVE THE rowNarrow BOUNDARY, WHICH IS KUNAL'S OWN PHONE AND HAD NO
    ASSERTION OF ANY KIND. Everything in the block above runs inside the wide-and-short loop, so all of it
    measures boards of 192 to 270.88 - i.e. the Flip branch is pinned only where the row is narrow. A named the
    untested half and measured it: at 375x730, 375x679 and 375x761+insets the demo row's Flip branch has
    `needed` = 244.77, NOT the 226.77 the block above pins, because above rowNarrow the button's padding is
    9px/15px rather than 9px/6px (2 x 9 = 18.00 = 244.77 - 226.77). So the band formula would be wrong by 18px
    here, and the constant carries a scope it never stated.
    AND THE REASON IT WANTS A PIN RATHER THAN A FIX: at 375x730 the button's right edge is at EXACTLY 375.00 -
    flush with its row AND with the viewport, documentElement.scrollWidth 375, zero slack - in the state a
    player is in for every ply of every one of 170 lessons before a demo ends. Nothing is wrong today (the ink
    is 42.11px inside the box). One pixel there would be the unrecoverable kind, on the geometry CLAUDE.md
    calls his actual phone, and until this build nothing measured it. demo-m0 is used rather than the demo end
    because at the demo end the Italian Game shows the OTHER branch - which is the whole reason this state was
    never covered. */
 const FLIP_NEEDED_WIDE=244.77;   // the same row above rowNarrow: +18.00 of horizontal padding, measured
 for(const geo of ['kunal730','390']){
   const b=await L.launch({geo,name:'lesson-flip-wide-'+geo});await b.open();
   L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
   await D.states['demo-m0'](b);
   await b.settle(400);
   const _wf=await flipRow(b), _wm=await b.metrics();
   L.say(_wf.found===true&&_wf.hasLines===false,
     geo+' [demo-m0]: the demo row is in its ⟳ Flip branch ABOVE the rowNarrow boundary - board '+(_wm.board&&_wm.board.w)+', which is the state every lesson shows at every ply before its demo ends, and which no assertion reached before #427',
     {found:_wf.found,hasLines:_wf.hasLines,board:_wm.board&&_wm.board.w,kids:_wf.kids});
   L.say(_wf.found&&Math.abs(_wf.needed-FLIP_NEEDED_WIDE)<=0.6,
     geo+' [demo-m0]: the row needs '+_wf.needed+'px here (pinned at '+FLIP_NEEDED_WIDE+'), EIGHTEEN PIXELS MORE than the '+FLIP_NEEDED+' the narrow columns pin, because above rowNarrow this button\'s padding is 9px/15px and not 9px/6px. The narrow constant is rowNarrow-only and the band formula does not reach here.',
     {needed:_wf.needed,pinned:FLIP_NEEDED_WIDE,narrow:FLIP_NEEDED,fs:_wf.fs});
   L.say(_wf.found&&_wf.past<=0.5,
     geo+' [demo-m0]: and it is inside its own row ('+_wf.btnR+' against a row ending at '+_wf.rowR+') - the row is wide enough here, which is why this branch has never been reported as a defect at his geometry',
     {past:_wf.past,btnR:_wf.btnR,rowR:_wf.rowR,needed:_wf.needed,rowW:_wf.rowW});
   /* THE SLACK, PINNED AT ZERO. Not a defect and not excused: a pin on a quantity that is FINE, because it is
      fine by exactly 0.00px on his own phone and the next change to this row spends a margin that does not
      exist. This is the "reserve the space" half of CLAUDE.md's board rule pointed at a control row. */
   L.say(_wf.found&&_wf.btnR<=_wf.vw+0.6&&_wf.docSW<=_wf.vw+0.6,
     geo+' [demo-m0]: and the row ends '+Math.round((_wf.vw-_wf.btnR)*100)/100+'px from the viewport edge, with nothing scrolling (docScrollWidth '+_wf.docSW+' against '+_wf.vw+'). At 375 that slack is ZERO - correct today, and pinned because there is no margin left for the next change to this row.',
     {btnR:_wf.btnR,vw:_wf.vw,slack:Math.round((_wf.vw-_wf.btnR)*100)/100,docSW:_wf.docSW});
   await b.shot('lesson-flip-wide-'+geo);
   await b.close();
 }
},'LESSON-FLOW');
