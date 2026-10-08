'use strict';
// gates/regress/74-lesson-card-hit-area.js   TC-R60 (US-R50): a MODAL's own controls own their own centres.
//
// ARRIVED AT #497 for jobs/the-lesson-cta-centre-hit-tests-to-the-lesson-footer-and-a-tap-closes-the-lesson-at-
// 568-tall-2026-10-04 (band 16, P0). The job asked for exactly this and said so in its `case` field: "The case
// must assert, at every geometry, that EVERY interactive element's own centre hit-tests to itself with no
// scrolling, and must include a real tap that proves the consequence."
//
// ── WHAT THE DEFECT IS ────────────────────────────────────────────────────────────────────────────────────
// The lesson intro card (chess.jsx, search `introCard`) is a `position:fixed; inset:0` modal with a dim
// backdrop whose own onClick dismisses it. It carried zIndex 120. The lesson footer (search `lessonFocus`,
// the fixed bar) carries zIndex 471. So the footer painted OVER the modal and won the hit test on whatever
// part of the card reached its band. Measured on the shipped #496 bundle 01387f706cea at 320x568:
//     Four Knights Game   CTA 487.89..531.89, footer top 507, centre hits the footer bar, 75% hits "Forward a move"
//     Queen's Gambit      CTA 495.56..539.56, 25% already hits the bar, centre hits "Forward a move"
//     King's Gambit       CTA 506.41..550.41, 25% hits "Forward a move"
// A real tap at the CTA's own centre LEFT THE CARD UP - it went to the footer - and on Queen's Gambit it
// STEPPED THE DEMO. The fix is one integer: the overlay moves to 472, above the footer and below rev-summary's
// 500. Amber record: flags/amber-497-three-modals-sit-below-the-fixed-bottom-bars.
//
// ── IT IS PER-LESSON, AND THAT IS THE WHOLE REASON NOTHING CAUGHT IT ──────────────────────────────────────
// The overlay is alignItems:'center', so the CTA's y is a function of the CARD's height, which is a function
// of the LESSON's own content: the idea block is capped at 40vh, the plans block at 26vh, and the Related-
// lessons row is present for some lessons only. LESSON ROW 0, THE ITALIAN GAME, IS NOT AFFECTED - its CTA sits
// at 466.20..510.20 and owns its centre on the broken bundle. Every measurement anyone took on the first
// lesson therefore read clean, including this job's own re-check and this build's first probe. Driven over
// EVERY lesson row of ALL FOUR groups at 320x568 on the broken bundle: **46 of 170 cards** had at least one of
// their three sample points land off the CTA - Openings 8/97, Gambits 37/53, Endgames 1/20, and Tactics 0 of 0,
// which is an EMPTY DENOMINATOR and not a clean group: the Tactics tile routes to a trainer and has no lesson
// list, so it cannot show an intro card at all. Reported, never credited.
//   **OF THOSE 46, THE CENTRE ITSELF WAS LOST ON 27.** On the other 19 only the 25% or 75% sample strayed, which
//   is a fat-finger defect and not 'the button cannot be tapped'. Both numbers are published because the
//   stronger sentence is not supported by the stronger number. AND NO CARD'S CENTRE HITS 'Close lesson' AT
//   320x568 - zero of 46. The lesson-closing outcome is measured at 375x568, on King's Gambit and on Petroff,
//   and is claimed at that geometry only.
//   [AN EARLIER VERSION OF THIS HEADER READ '29 of 128' AND IS WITHDRAWN [R18]. That was a mid-run reading over
//   Openings and Gambits only, taken before the sweep finished, and it was left in the shipped header where a
//   reader would quote it. Antagonist B found it by checking the header against the published sweep; the
//   Openings+Gambits figure is 45 of 150 and the whole-sweep figure is 46 of 170.]
// So a gate that opens ONE lesson is a coin flip, and this one drives a NAMED set of SIX.
//   **AN EARLIER VERSION OF THIS LINE CLAIMED THE SET 'INCLUDES THE WORST'. IT DID NOT, AND THAT IS WITHDRAWN
//   [R18].** BOTH blind antagonists vetoed it independently, from the diff door and from the shipped-surface
//   door: the worst card is Petroff (Russian) Defense, Openings row 45, and the first draft of this gate left it
//   out while the header and the gate-manifest row both asserted it was in - naming the excluded card in the same
//   sentence. It is in the set now, and what makes it worst is a fault this build does NOT fix. See THE RESIDUAL.
//
// ── THE RESIDUAL #497 NAMED. CLOSED AT #498 - READ THE #498 SECTION BELOW BEFORE THIS ONE ────────────────
// Petroff (Russian) Defense, Openings row 45, at 320x568. MEASURED on BOTH bundles, inside the card's 4000ms
// auto-dismiss window so no hold is needed:
//     panel    -33.27 .. 601.28   (h 634.55) in a 568-tall viewport - off BOTH ends by about 33px
//     CTA       540.28 .. 584.28  - 16.28px of the button is below the screen
//     close X   -23.27 ..   6.73  - 6.73px of a 30px button is on the screen
// THE CARD IS SIMPLY TALLER THAN THE VIEWPORT, and z-index is paint and not layout, so this build changes none of
// those three numbers. What it DOES change, which is why the card is asserted over rather than excused: on main
// Petroff reads own 25/50/75 = false/false/false with the centre on the footer bar, and on this build it reads
// true / true / (outside the viewport). So the HIT-TEST fault is fixed for it and an OVERFLOW fault remains.
// Those are two different faults, and this gate asserts them separately - B1 over the sample points that are ON
// the screen, B1b over whether a control is on the screen at all, with a per-card ceiling of 2 (Petroff's CTA and
// its close X) and every instance printed by B1bG. The overflow is filed as
// jobs/the-lesson-intro-card-can-be-taller-than-the-viewport-and-nothing-scrolls-it-2026-10-08.
// AND IT COSTS THE HARNESS SOMETHING, recorded because it is the kind of thing that is rediscovered: Petroff's
// panel top is OFF SCREEN, so a hold-tap at panelTop+10 lands outside the viewport, the hold never registers and
// the card is gone before it can be measured - 'CARD GONE - hold failed' on BOTH bundles. openHeld therefore
// CLAMPS the hold point into the viewport, and reports when it clamped.
//   [#498: ON THIS BUNDLE PETROFF NO LONGER CLAMPS - measured holdClamped=false where main reads true, because the
//   panel top moved from -33.27 to 18. THE CLAMP STAYS ANYWAY. It is cheap, it is the only thing standing between
//   this gate and a silent 'card gone' on any future card that overflows upward, and removing a guard because the
//   one case that needed it was fixed is how a guard is lost.]
//
// ── #498. THE OVERFLOW HALF IS FIXED, AND THE ASSERTION THAT WAS WATCHING IT COULD NOT SEE ITS OWN FIX ────
// chess.jsx's intro-card PANEL now carries maxHeight:'100vh' and overflowY:'auto', and `*{box-sizing:border-box}`
// (chess.jsx:5934) makes the cap include the panel's own padding and border.
// EVERY NUMBER IN THE FIRST VERSION OF THIS BLOCK WAS THE REJECTED BUNDLE'S AND IS WITHDRAWN [R18, antagonist A's
// veto finding (b)]. It described `maxHeight:'calc(100vh - 36px)'` with a 532 cap and quoted 0cc8d3dc196f's rects -
// a bundle this build BUILT AND THREW AWAY, cited as the md5 of record against this project's own #454 rule that
// the md5 IS the reference. Five of its five figures were wrong for the tree being pushed. Re-measured:
// MEASURED, Petroff (Russian) Defense at 320x568, main's bundle e60f12585339 -> the SHIPPED 8f25da67c4e3:
//     panel     -33.27..601.28  h634.55  maxHeight none  ovf visible  scrollRoom 0   isUserScroller false
//            ->       0..568    h568     maxHeight 568px ovf auto     scrollRoom 67  (fits at BOTH ends)
//     close X   -23.27..  6.73  NOT fully on screen, 0 user-scrollers, moved 0.00  ->  UNREACHABLE
//            ->      10..40     FULLY ON SCREEN AT REST - a complete 30px button where 6.73px used to show
//     CTA       540.28..584.28  NOT fully on screen, 0 user-scrollers, moved 0.00  ->  UNREACHABLE
//            ->  573.55..617.55 below the fold, 1 user-scroller (the panel, room 67)                ->  REACHABLE
// ONE CARD, NOT TWO, HAS A CONTROL BELOW THE FOLD ON THE SHIPPED BUNDLE, and an earlier version of this header
// said "Petroff STILL has exactly two of those" [R18, antagonist A's finding (a)]. Measured: 4 controls in
// Petroff's panel at 320x568, exactly ONE not fully on screen - the CTA. The close X (10..40) and both Related
// chips are fully on screen. The "two" belonged to the rejected 532-cap bundle, where more content was pushed
// below the fold, and this build's OWN sweep log said 1 while four documents said 2. The CONCLUSION it was
// offered for survives untouched and is the reason B1b was rewritten: #497's `fullyOnScreen` ceiling of 2 reads
// 2<=2 on main and 1<=2 on the fix, so it never discriminates - it just does not do so for the reason first given.
// THE CTA IS REACHED BY SCROLLING AND IS NOT ON SCREEN AT REST, which is stated rather than glossed: US-R50
// sanctions exactly that ("a dialog whose content scrolls satisfies that by scrolling"), and it is not the same
// claim as "the button is visible". A card whose CTA is pinned below a scrolling content area would be better and
// is a structural design change to a shared overlay; it is nominated for Kunal, not taken.
// CLASS SWEPT [R06], all 170 lesson cards of all four groups at 320x568, one browser, THREE bundles:
//     e60f12585339  main          170 measured, 1 card with an UNREACHABLE control (2 controls), tallest 634.55
//     0cc8d3dc196f  REJECTED      170 measured, 0 unreachable, below-fold-but-reachable 2, tallest 532
//     8f25da67c4e3  SHIPPED       170 measured, 0 unreachable, below-fold-but-reachable 1, tallest 568
// The middle row is kept because it is WHY the cap is 100vh: calc(100vh-36px) is tighter than the VIEWPORT, and it
// moved Gambits row 50's CTA from 510.94..554.94 (fully on screen on main) to 532.86..576.86 - a card with nothing
// wrong with it made worse to fix a broken one [#398]. Only the 170-card tier caught it; the six lessons this gate
// drives do not include Gambits row 50 and went green on both caps.
// WHY THE OLD ASSERTION WENT: #497's B1b counted controls that are not `fullyOnScreen`, with a ceiling of 2.
// It reads 2<=2 on main and 1<=2 on the shipped fix, so it NEVER discriminates. (An earlier version of this
// paragraph said the fixed bundle "still has exactly 2 of those"; that was the REJECTED bundle's figure and is
// withdrawn [R18].) It was
// watching the right card and measuring the wrong property. B1b is now reachability with a ceiling of ZERO, B1c
// is the below-the-fold diagnostic as a NOTE (never a verdict, or the first lesson to gain a line reds a correct
// tree), B1d asserts the panel fits, and B5/B1bG2 are the anti-vacuity guards: B1b and B1d can only fail where a
// card's content exceeds the viewport, which is false at 375x730 for every card, so a run over tall geometries
// alone must not be able to report them green as though they had been exercised.
//
// ── WHY NO EXISTING GATE COULD SEE IT, MEASURED RATHER THAN ASSUMED, AND BOTH HALVES MATTER ───────────────
// (a) gates/drive/lesson.js's `intro` state could not hold the card. Its hold-tap walked UP from the CTA to
//     the first fixed-or-absolute ancestor and clicked THAT rect at top+14. The walk stops on the OVERLAY, not
//     on the card panel, and the overlay's own onClick is setIntroCard(false) - so the tap that was meant to
//     HOLD the card DISMISSED it. Measured: the CTA was absent at all five geometries after D.states['intro'].
//     THE DRIVER IS NOT CHANGED IN THIS BUILD AND THAT IS DELIBERATE. Ten gates call D.states, so repairing the
//     shared hold-tap is a wide change that would need the suite to clear it on its own merits; this build spent
//     its diff on the one integer that is the player-facing defect. Instead THIS GATE CARRIES ITS OWN CORRECT
//     HOLD (openHeld below clicks the PANEL, the child of the fixed overlay), and A1 is its control: the card
//     must still be up 4600ms later, past the 4000ms auto-dismiss. The driver repair is one line and is filed
//     as jobs/the-lesson-drivers-intro-state-dismisses-the-card-it-means-to-hold-2026-10-08 with the measurement
//     and the fix, so the next run can land it with the suite behind it.
// (b) gates/regress/48-lesson-flow.js's laidOut() filters out every button with a position:fixed ANCESTOR, so
//     even in a run that reached the state the CTA was excluded from TC-LS-008 - the assertion written for
//     exactly this property. The exclusion is correct for its own purpose (it stops the footer's five buttons
//     being compared against the footer) and it over-excludes. That is CLAUDE.md's recurring trap in its
//     eleventh costume: the guard written to handle fixed elements excused the real defect in a fixed element.
//     48 IS NOT CHANGED HERE. Widening its filter would make it report the #393 false positives this gate is
//     built to avoid; see the scoping note below.
//
// ── THE SCOPING, WHICH IS THE ONLY DIFFICULT PART OF THIS GATE ────────────────────────────────────────────
// A naive "does every button own its centre" sweep is WORTHLESS and this build measured why before writing a
// line of it: run over all seven lesson states at six geometries on main, it returns 12 of 42 states red, and
// ELEVEN of the twelve reds are the lesson's own action-row buttons sitting BEHIND the intro card or behind the
// ... sheet. That is a modal working correctly, and it is #393's trap verbatim - "a naive hit test reports SIX
// SCREENS of false defects, because every button on every screen underneath fails it". #393 tried three
// versions and shipped none of them.
// SO THIS GATE ASSERTS THE PROPERTY ONLY OVER THE TOPMOST MODAL LAYER. The live layer is defined mechanically:
// the full-viewport fixed overlays on screen are collected, the one with the highest effective z-index is the
// live modal, and the assertion runs over ITS OWN DESCENDANTS and nothing else. Everything behind it is
// deliberately unreachable and is not asserted over. When no modal is up, the live layer is the document and
// the fixed bars are part of it, so the footer's own five buttons are in scope and own their centres - which is
// what gate 48 already covers and what this gate's E block re-checks from the other direction.
// AND THE EXCLUSION IS PINNED TO ITS MECHANISM, not to a count [#416's rule about #35's exclusion]: a button is
// skipped only when a STRICTLY HIGHER full-viewport fixed overlay exists that does not contain it. B2 asserts
// the denominator is non-empty in its own L.say, and B3 asserts the assertion is CAPABLE OF FAILING.
//
// ── CONTROL (every assertion below was run both ways) ─────────────────────────────────────────────────────
// CT_APP=<the #496 bundle, md5 01387f706cea>  ->  B1 RED. That is the ideal control for the HIT-TEST half: free,
// and the actual broken build. On it, A3 is red too (the mechanism), B3 stays GREEN (the cards still reach the bar,
// which is what makes B1 able to fail), and C1 is red on the lessons whose centre is lost.
// AND FOR THE OVERFLOW HALF [#498], THERE ARE TWO CONTROLS AND THE SECOND ONE IS THE ONE THAT MATTERS.
// The first is #497's own shipped bundle e60f12585339, free because it is the tree this build was cut from.
// THE SECOND WAS BUILT BY ANTAGONIST A AND IS WHY ITS VETO WAS UPHELD: take the SHIPPED bundle and delete only
// `overflowY:'auto'`, keeping `maxHeight:'100vh'`. That is a 20-character deletion which leaves the panel CAPPED
// but NOT SCROLLING, i.e. the defect intact, and it is the only control that separates the two halves of this
// build's own fix. ON THE FIRST VERSION OF THIS GATE IT SCORED 56 pass / 1 fail WITH B1b, B1d, B1bG, B5 AND
// B1bG2 ALL GREEN - every assertion this build added, and both its anti-vacuity guards, passing on a bundle
// built to fail them. CLAUDE.md: "Prove a gate against a deliberately broken build before trusting its green."
//     sed 's/position:"relative",maxHeight:"100vh",overflowY:"auto"/position:"relative",maxHeight:"100vh"/' \
//         app.js > gates/.probe/nocontrol.js        # md5 598cbe4857d6
//     CT_APP=gates/.probe/nocontrol.js CT_74_GEOS=se node gates/regress/74-lesson-card-hit-area.js
// MEASURED THREE WAYS rather than asserted:
//     8f25da67c4e3  SHIPPED, all three geometries : 214 pass,  0 fail
//     e60f12585339  main, CT_74_GEOS=se           :  70 pass,  5 FAIL  (B1b 2 unreachable, B1d, B1e2, B1bG, B1bG2)
//     598cbe4857d6  capped but not scrolling, se  :  70 pass,  4 FAIL  (B1b 1 unreachable, C0, B1bG, B1bG2)
// NOTE WHAT THE THIRD ROW PROVES THAT THE SECOND CANNOT: on 598cbe4857d6 **B1d PASSES** - the panel genuinely
// does fit the viewport - while B1b reddens. So B1b and B1d are not two names for one measurement: one is about
// the box and the other about whether a finger can reach what is inside it.
// and THE FOUR REDS ARE ALL IN THE OVERFLOW BLOCK: B1b (2 unreachable controls, both scrollers=0, both movedBy=0),
// B1d (panel -33.27..601.28 h634.55 in 568, fits false, maxHeight none, isUserScroller false), B1bG (2 over the
// run) and B1bG2 (no card at a cap, because on that bundle there is no cap - the anti-vacuity guard correctly
// says this bundle cannot exercise the cap). A3, B1, C0 and C1 stay GREEN on it, because #497 fixed the hit test
// and not the overflow. Two bundles, two halves, and each control reddens only its own half - which is what says
// the two assertions measure two different faults rather than one.
//   AND THAT SEPARATION COST ONE ITERATION, recorded because the first version did not have it: C0 as first
//   written required the CTA's FULL RECT on screen, which is red on main (bottom 584.28) even though its CENTRE
//   (562.28) is tappable - so the overflow control produced a red in the hit-test block AND skipped C1 on the one
//   bundle whose hit-test behaviour C1 exists to pin. C0 now tests the centre, which is also what US-R50's clause
//   actually says, and that restored C1 on main. Main's current reds are B1b, B1d, B1e2, B1bG and B1bG2 - all
//   five in the overflow block, with A3, B1, C0 and C1 green.
// Published with the commands, per #411:
//   git show <sha>:app.js > gates/.trial/mainbundle.js
//   CT_APP=gates/.trial/mainbundle.js CT_74_GEOS=se node gates/regress/74-lesson-card-hit-area.js
//
'use strict';
const L=require('../lib');

const GEOS=(process.env.CT_74_GEOS||'se,short375,kunal730').split(',');
// geometries at which no measured card reached the fixed bar, so B1 could not have failed there
const VACUOUS=[];
// #498 CHANGED WHAT THIS BLOCK ASSERTS, AND THE REASON IS THAT THE OLD TEST COULD NOT SEE ITS OWN FIX.
// #497 asserted `fullyOnScreen` with a per-card ceiling of 2, Petroff's CTA and close X being the two. MEASURED on
// the SHIPPED bundle 8f25da67c4e3: Petroff has ONE control not fully on screen at rest - the CTA at 573.55..617.55;
// the close X (10..40) and both Related chips are fully on screen. So the old assertion reads 2<=2 on main and
// 1<=2 here and is blind IN BOTH DIRECTIONS to the difference between ink drawn off the screen with nothing to
// scroll it and ink below the fold inside a scroller. That is CLAUDE.md's "below the fold is not unreachable"
// rule, and the ceiling was measuring the wrong one of the two.
// [AN EARLIER VERSION OF THIS PARAGRAPH PUT THE COUNT AT 2 AND NAMED 0cc8d3dc196f - A BUNDLE THIS BUILD BUILT AND
// THREW AWAY - AS "#498's bundle". Both are withdrawn [R18]. Antagonist A found it, and noted that this build's
// OWN sweep log already said 1 while four documents said 2.]
// SO THE HARD ASSERTION IS NOW REACHABILITY, which is what TC-R62's pass condition asks for: a control passes if
// its rect is fully inside the viewport, OR if scrolling a USER-scrollable ancestor brings it fully inside. The
// ceiling is therefore ZERO and it is a real assertion rather than an allowance.
const UNREACHABLE_CEILING_PER_CARD=0;
const unreachableSeen=[];
// cards whose panel is actually AT its cap and scrolling, i.e. where B1b and B1d are exercised at all
const capBoundGlobal=[];
// Kept as a DIAGNOSTIC and never as a pass/fail: below-the-fold-but-reachable is correct behaviour under US-R50
// ("a dialog whose content scrolls satisfies that by scrolling"), so a red here would be a red on a correct tree.
// It is printed every run so a change in the population is visible without being punished.
const belowFoldSeen=[];
// NAMED, not positional: an index is meaningless if a lesson is added, and asserting the name is how this gate
// says "the state I measured is the state I meant" [#385: assert S was actually reached].
const LESSONS=[
  {group:'Openings',row:0, name:/^Italian Game$/,       note:'the control case: this card is SHORT and owns its centre even on the broken bundle'},
  {group:'Openings',row:4, name:/^Four Knights Game$/,  note:'measured 487.89..531.89 at 320x568 on #496, centre on the footer bar'},
  {group:'Openings',row:20,name:/^Queen.s Gambit$/,     note:'measured 495.56..539.56 at 320x568 on #496, centre on "Forward a move"'},
  {group:'Openings',row:45,name:/^Petroff \(Russian\) Defense$/,
                            note:'THE WORST CARD ON THE RECORD and the one this build does NOT fully fix. Its panel is 634.55 tall in a 568 viewport (-33.27..601.28), so 16.28px of the CTA is below the screen and 6.73px of the close X is above it. Added because the first draft of this gate EXCLUDED it while the header claimed the set included the worst - both antagonists vetoed that independently.'},
  {group:'Gambits', row:0, name:/^King.s Gambit$/,      note:'measured 506.41..550.41 at 320x568 on #496, 25% already on "Forward a move"; and at 375x568 all three of its sample points hit the close X, so a tap there CLOSED the lesson'},
  {group:'Gambits', row:10,name:/^L.gal Trap$/,         note:'a second Gambits row, because 37 of 53 Gambits cards are affected and one row was not a sample of that'},
];

// ---- the live modal layer, and every interactive element inside it ----------------------------------------
const layer=(b)=>b.page.evaluate(()=>{
  const r2=n=>Math.round(n*100)/100;
  const nm=e=>e?((e.innerText||'').replace(/\s+/g,' ').trim()||e.getAttribute('aria-label')||e.tagName):'(null)';
  const zOf=e=>{const z=getComputedStyle(e).zIndex;const n=parseInt(z,10);return isNaN(n)?0:n;};
  // full-viewport fixed overlays: the modal candidates
  const overlays=[...document.querySelectorAll('div')].filter(d=>{
    const s=getComputedStyle(d);if(s.position!=='fixed')return false;
    // A pointerEvents:'none' overlay cannot take a tap, so it is NOT a modal layer however high its z-index.
    // Without this, chess.jsx's data-ct="layout-grid" (position:fixed inset:0 zIndex:9990 pointerEvents:'none')
    // would WIN the z-index pick below, contribute ZERO buttons, and B1 would then assert over an empty set and
    // pass loudest with nothing measured. Antagonist A found that route; it is live behind the Layout readout.
    if(s.pointerEvents==='none')return false;
    const r=d.getBoundingClientRect();
    return r.width>=innerWidth-1&&r.height>=innerHeight-1&&r.left<=1&&r.top<=1;});
  let top=null;for(const o of overlays){if(!top||zOf(o)>=zOf(top))top=o;}
  // the fixed bottom bars, for the diagnostics and for E
  const bars=[...document.querySelectorAll('div')].filter(d=>{const s=getComputedStyle(d);const r=d.getBoundingClientRect();
      return s.position==='fixed'&&r.width>=innerWidth-1&&r.bottom>=innerHeight-1&&r.height>1&&r.height<innerHeight*0.4;})
    .map(d=>({z:zOf(d),top:r2(d.getBoundingClientRect().top),h:r2(d.getBoundingClientRect().height),txt:nm(d).slice(0,34)}));
  const scope=top||document.body;
  const els=[...scope.querySelectorAll('button,[role=button],a')].filter(x=>{
    const r=x.getBoundingClientRect();return r.width>=2&&r.height>=2&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;});
  // TWO DIFFERENT FAULTS, REPORTED SEPARATELY, because conflating them is what let this gate's first draft
  // exclude the worst card instead of asserting over it. `onScreen` says whether the sample point is inside the
  // viewport at all; `own` says whether a tap there reaches the control. A point off the screen is an OVERFLOW
  // fault and z-index cannot fix it; a point on the screen that hits something else is the HIT-TEST fault this
  // build fixes. B1 asserts over the on-screen points; B1b asserts over the overflow.
  const sample=(x)=>{
    const r=x.getBoundingClientRect();const cx=r.left+r.width/2;
    const pt=(fy)=>{const cy=r.top+r.height*fy;
      const on=!(cx<0||cx>=innerWidth||cy<0||cy>=innerHeight);
      if(!on)return {onScreen:false,own:false,what:'(OUTSIDE THE VIEWPORT)'};
      const e=document.elementFromPoint(cx,cy);
      return {onScreen:true,own:!!(e&&(e===x||x.contains(e))),what:nm(e).slice(0,34)};};
    const fully=r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
    return {t:nm(x).slice(0,30),rect:[r2(r.left),r2(r.top),r2(r.width),r2(r.height)],bottom:r2(r.bottom),
            fullyOnScreen:fully,p25:pt(.25),p50:pt(.5),p75:pt(.75)};};
  const cta=[...document.querySelectorAll('button')].find(z=>/^Got it/.test((z.innerText||'').trim()));
  // THE PANEL, which is the element this build's fix is ON, found BEFORE the reachability pass because that pass
  // now needs it to build its own denominator. Asserted directly rather than only through its children: the
  // mechanism is a height cap, so the thing to measure is whether the panel fits [#377].
  let panelEl=null;if(cta){panelEl=cta;while(panelEl&&panelEl.parentElement&&getComputedStyle(panelEl.parentElement).position!=='fixed')panelEl=panelEl.parentElement;}
  // ---- REACHABILITY [#498]. gate 40 is the reference implementation and its two traps are both live here ----
  // (a) a USER can only scroll a box whose COMPUTED overflow-y is auto|scroll AND which has room; script is not so
  //     limited, and scrollIntoView() happily scrolls an overflow:hidden box, which is how gate 40's first version
  //     reported "reachable" against a build with the scroller removed. So the scrollers are filtered, never asked.
  // (b) finding SOME scrollable ancestor proves nothing: it must be one that, when scrolled, actually moves THIS
  //     element on screen. So they are scrolled for real and the rect is RE-READ, then every scrollTop is restored.
  // Measured at rest FIRST and reachability SECOND, in two passes, so one element's scroll test cannot contaminate
  // another's resting rect.
  const userScrollables=(el)=>{const out=[];let p=el.parentElement;
    while(p&&p!==document.documentElement){const s=getComputedStyle(p);
      if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+1)out.push(p);
      p=p.parentElement;}
    return out;};
  const reach=(el,rest)=>{
    if(rest.fullyOnScreen)return {reachable:true,byScrolling:false,scrollers:userScrollables(el).length,movedBy:0};
    const r0=el.getBoundingClientRect();
    // A control TALLER than the viewport can never be fully inside it; that is a different fault and is reported
    // rather than counted as unreachable, so an accessibility font size cannot manufacture a false red here.
    if(r0.height>innerHeight||r0.width>innerWidth)return {reachable:true,tallerThanScreen:true,scrollers:userScrollables(el).length,movedBy:0};
    const scs=userScrollables(el);const saved=scs.map(q=>q.scrollTop);
    for(let i=scs.length-1;i>=0;i--){const q=scs[i];
      const qr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
      const d=(er.bottom>qr.bottom)?((er.bottom-qr.bottom)+8):((er.top<qr.top)?((er.top-qr.top)-8):0);
      q.scrollTop=Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop+d));}
    const r1=el.getBoundingClientRect();
    const ok=r1.top>=0&&r1.bottom<=innerHeight&&r1.left>=0&&r1.right<=innerWidth;
    scs.forEach((q,i)=>{q.scrollTop=saved[i];});
    return {reachable:ok,byScrolling:ok,scrollers:scs.length,movedBy:r2(r1.top-r0.top),
            afterTop:r2(r1.top),afterBottom:r2(r1.bottom)};
  };
  const rested=els.map(sample);
  els.forEach((el,i)=>{Object.assign(rested[i],reach(el,rested[i]));});
  // ---- THE REACHABILITY DENOMINATOR, AND IT IS A SEPARATE SET ON PURPOSE [#498, antagonist A's veto] ----
  // `els` above is filtered to controls that INTERSECT the viewport (r.bottom>0 && r.top<innerHeight), which is
  // right for the hit test - a sample point off the screen is not a hit-test failure - and CATASTROPHIC for the
  // reachability test, because the whole point of the overflow defect is a control that has left the viewport.
  // MEASURED: #498's own fix moves Petroff's CTA from 540.28 (intersecting, counted) to 573.55 (entirely below,
  // DROPPED), so B1b read "2 -> 0" partly because the element under test left its own input set. Proved on a
  // bundle built to fail it - the shipped bundle with `overflowY:'auto'` deleted and the cap kept, md5
  // 598cbe4857d6 - where the defect is intact (CTA 573.55, zero user-scrollable ancestors) and B1b, B1d, B1bG,
  // B5 and B1bG2 ALL PASSED. That is the trap this file already records in another costume: the check and the
  // thing being checked moved together. So the reachability set is every interactive descendant of the card
  // PANEL, size-filtered only, never viewport-filtered.
  const pcAll=panelEl?[...panelEl.querySelectorAll('button,[role=button],a')].filter(x=>{
    const r=x.getBoundingClientRect();return r.width>=2&&r.height>=2;}):[];
  const panelRested=pcAll.map(sample);
  pcAll.forEach((el,i)=>{Object.assign(panelRested[i],reach(el,panelRested[i]));});
  const ctaInSet=!!(cta&&pcAll.indexOf(cta)>=0);
  // THE PANEL, which is the element this build's fix is ON. Asserted directly rather than only through its
  // children: the mechanism is a height cap, so the thing to measure is whether the panel fits [#377].
  const pr=panelEl?panelEl.getBoundingClientRect():null;
  const ps=panelEl?getComputedStyle(panelEl):null;
  return {modalZ:top?zOf(top):null,hasModal:!!top,overlayCount:overlays.length,bars,
          modalHoldsTheCTA:!!(top&&cta&&top.contains(cta)),
          panelEls:panelRested,ctaInSet,
          panel:panelEl?{top:r2(pr.top),bottom:r2(pr.bottom),h:r2(pr.height),
                       fits:pr.top>=-0.5&&pr.bottom<=innerHeight+0.5,
                       maxHeight:ps.maxHeight,overflowY:ps.overflowY,
                       scrollRoom:panelEl.scrollHeight-panelEl.clientHeight,
                       isUserScroller:/auto|scroll/.test(ps.overflowY)&&(panelEl.scrollHeight>panelEl.clientHeight+1)}:null,
          els:rested,vw:innerWidth,vh:innerHeight};
});
const cta=(b)=>b.page.evaluate(()=>{const c=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));
  if(!c)return null;const r=c.getBoundingClientRect();
  return {x:r.left+r.width/2,y:r.top+r.height/2,top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100};});
const cardUp=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>/^Got it/.test((x.innerText||'').trim())));
const inLesson=(b)=>b.page.evaluate(()=>!!document.querySelector('[data-ct="lesson-note"]'));
const rowName=(b,i)=>b.page.evaluate((i)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);
  const el=bs[i];if(!el)return null;const n=el.querySelector('span[style*="block"]');return ((n||el).innerText||'').split('\n')[0].trim();},i);

// open a lesson row and HOLD the intro card by clicking its PANEL - not the overlay, whose onClick dismisses it
async function openHeld(b,group,i){
  await b.home();await b.tile('Discover');await b.settle(400);
  await b.tapText(new RegExp('^'+group+'$'),{wait:500});
  await b.page.evaluate(()=>window.scrollTo(0,0));await b.settle(150);
  const nm=await rowName(b,i);
  const h=await b.page.evaluateHandle((i)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);
    const el=bs[i];if(el)el.scrollIntoView({block:'center'});return el||null;},i);
  const el=h.asElement();if(!el)return {name:nm,ok:false,why:'no row '+i};
  const box=await el.boundingBox();if(!box)return {name:nm,ok:false,why:'row '+i+' has no box'};
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(360);
  // THE HOLD-TAP IS CLAMPED INTO THE VIEWPORT, which is not fussiness: Petroff's panel top is -33.27 at 320x568,
  // so an unclamped click at panelTop+10 lands OFF the screen, the hold never registers, the 4000ms auto-dismiss
  // fires and the card is gone before it can be measured. Measured: with the unclamped click, Petroff reports
  // "CARD GONE - hold failed" on BOTH bundles. The clamp keeps the click on the panel at every geometry.
  const panel=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;
    let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;
    const r=q.getBoundingClientRect();
    const y=Math.min(Math.max(r.top+10,6),innerHeight-6);
    return {x:r.left+r.width/2,y,panelTop:Math.round(r.top*100)/100,clamped:(r.top+10)!==y};});
  if(!panel)return {name:nm,ok:false,why:'no intro card'};
  await b.page.mouse.click(panel.x,panel.y);await b.page.waitForTimeout(140);
  return {name:nm,ok:true,panelTop:panel.panelTop,holdClamped:panel.clamped};
}

// OPEN THE CARD WITHOUT HOLDING IT. D CANNOT USE openHeld AND THE FIRST VERSION OF D DID, WHICH MADE D2 VACUOUS.
// openHeld CLICKS THE PANEL, and the panel's onClick is one of the two things that sets introHoldRef - so the card
// was already held before the drag and D2 passed on a control bundle with the onScroll hook DELETED (79 pass /
// 0 fail, measured). THE GATE'S OWN SETUP WAS SATISFYING THE PROPERTY UNDER TEST. That is the third instance in
// this one build of the trap CLAUDE.md records a dozen times, and the second in this gate: #385's rule is the
// remedy - when an assertion says "X survives in state S", reach S by the route the PLAYER takes, not the route
// the harness finds shortest.
async function openPlain(b,group,i){
  await b.home();await b.tile('Discover');await b.settle(350);
  await b.tapText(new RegExp('^'+group+'$'),{wait:450});
  await b.page.evaluate(()=>window.scrollTo(0,0));await b.settle(120);
  const nm=await rowName(b,i);
  const h=await b.page.evaluateHandle((i)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);
    const el=bs[i];if(el)el.scrollIntoView({block:'center'});return el||null;},i);
  const el=h.asElement();if(!el)return {name:nm,ok:false,why:'no row '+i};
  const box=await el.boundingBox();if(!box)return {name:nm,ok:false,why:'row '+i+' has no box'};
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(400);
  return {name:nm,ok:true};
}

// A REAL FINGER DRAG, via CDP touch events. NOT Input.synthesizeScrollGesture, which antagonist B established is
// INERT in this container - it produced 0px on the Openings list against 6124px of available root scroll, three
// times at three geometries - and NOT scrollIntoView or an assignment to scrollTop, because the whole question
// block D asks is what a TOUCH does, and a touch that scrolls fires no click.
async function fingerDrag(b,x,y0,y1){
  const cdp=await b.page.context().newCDPSession(b.page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*(i/12)}]});await b.page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
}

(async()=>{
for(const geo of GEOS){
  // ── A: INSTRUMENT VALIDATION. Assert the state was reached and the mechanism is as claimed, BEFORE B. ───
  {
    const b=await L.launch({geo,name:'74A-'+geo});await b.open();
    L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
    const o=await openHeld(b,'Openings',4);
    L.say(o.ok,'74 A1a ['+geo+'] the intro card opens on a named lesson row ('+o.name+')',o);
    // A1 IS THE PERMANENT CONTROL ON THE DRIVER REPAIR: the auto-dismiss is 4000ms, so a card still up at
    // 4600ms proves the hold-tap landed on the PANEL. Before this build it landed on the overlay and dismissed.
    await b.page.waitForTimeout(4600);
    const up=await cardUp(b);
    L.say(up,'74 A1 ['+geo+'] the card is STILL UP 4600ms after the hold-tap, so the hold landed on the PANEL and not on the backdrop (the 4000ms auto-dismiss did not fire). This is why this gate does not use D.states[\'intro\'], whose hold-tap lands on the overlay and dismisses the card it means to hold - measured absent at all five geometries',{cardUp:up});
    const ly=await layer(b);
    // A2/A2b ARE DIAGNOSTICS, NOT THE NON-VACUITY GUARD, and an earlier version of this gate described them as
    // the latter. Antagonist A measured why that was wrong: chess.jsx defines `lessonFocus` as exactly the intro
    // card's own first two conjuncts (mode==='learn' && openIdx!==null), and the footer renders on `lessonFocus`,
    // so the footer is present WHENEVER the card is, by construction. These two therefore cannot fail while A1a
    // passes. What actually makes this gate non-vacuous is B3/B3G - whether a card reaches the bar's band at all.
    L.say(ly.bars.length>=1,'74 A2 ['+geo+'] DIAGNOSTIC: a fixed bottom bar is on screen, so there is something that could cover the card',ly.bars);
    const foot=ly.bars.filter(x=>x.z===471)[0]||null;
    L.say(!!foot,'74 A2b ['+geo+'] DIAGNOSTIC: one of them is the lesson footer at zIndex 471',ly.bars);
    // A3 ASSERTS THE MECHANISM IN THE BUNDLE UNDER TEST, not only the symptom [#377: assert the thing itself].
    // AND IT IS PINNED TO THE CARD, NOT TO WHATEVER WON THE Z-INDEX PICK. Antagonist A's finding: `modalZ > foot.z`
    // says nothing about the intro card if some other full-viewport overlay is the top layer, so the day one joins
    // this screen A3 would pass on ITS z-index. A3b carries the identifying half separately, so a failure says
    // which half went. AND THE LABEL STATES THE MEASUREMENT, NOT THE DESIRED STATE: an earlier version read
    // '(120) is ABOVE the footer's (471)' on a FAIL, so every red printed the opposite of its own reading and a
    // reader skimming the control log met the defect backwards. Antagonist B found that one.
    const zOK=!!(ly.hasModal&&ly.modalZ!==null&&foot&&ly.modalZ>foot.z);
    L.say(ly.modalHoldsTheCTA,'74 A3b ['+geo+'] the overlay this gate measures is the INTRO CARD\'s - it contains the "Got it" CTA. Without this, A3 could be satisfied by any unrelated full-viewport overlay that happened to win the z-index pick',{modalHoldsTheCTA:ly.modalHoldsTheCTA,modalZ:ly.modalZ});
    L.say(zOK&&ly.modalZ===472,
      '74 A3 ['+geo+'] THE MECHANISM, the one integer the defect was: the intro card\'s overlay z-index reads '+ly.modalZ+' and the lesson footer\'s reads '+(foot&&foot.z)+', so the card is '+(zOK?'ABOVE':'BELOW')+' the footer. It must be ABOVE, and it must be exactly 472 - above the footer\'s 471 and below rev-summary\'s 500. On #496 it read 120 against 471',{modalZ:ly.modalZ,footZ:foot&&foot.z,cardIsAbove:zOK,isExactly472:ly.modalZ===472});
    await b.shot('74-'+geo+'-intro-card');
    await b.close();
  }
  // ── B and C: the headline over a RANGE of lessons, and the consequence by a real tap ────────────────────
  let measured=0,lost=0,reachingTheBar=0,capBound=0;const lostDetail=[];
  for(const ls of LESSONS){
    const b=await L.launch({geo,name:'74B-'+geo+'-'+ls.group+ls.row});await b.open();
    const o=await openHeld(b,ls.group,ls.row);
    if(!o.ok){L.say(false,'74 B0 ['+geo+'] could not reach '+ls.group+' row '+ls.row+' - a state this gate asserts over must be reachable, so this is a RED and not a skip',o);await b.close();continue;}
    L.say(ls.name.test(o.name||''),'74 B0b ['+geo+'] '+ls.group+' row '+ls.row+' is still '+ls.name+' ('+o.name+') - if the lesson list is reordered this gate must say so rather than silently measure another card',{got:o.name});
    await b.page.waitForTimeout(4600);
    if(!(await cardUp(b))){L.say(false,'74 B0c ['+geo+'] the card did not survive to be measured on '+o.name,{});await b.close();continue;}
    const ly=await layer(b);
    const c=await cta(b);
    const foot=ly.bars.filter(x=>x.z===471)[0]||null;
    measured++;
    if(c&&foot&&c.bottom>foot.top)reachingTheBar++;
    // B1a THE DENOMINATOR, IN ITS OWN L.say AND NOT INSIDE B1's MESSAGE STRING. Antagonist A's hardest finding:
    // B1 is `bad.length===0` over ly.els, and an EMPTY ly.els makes that its loudest PASS over nothing. The gate's
    // own header used to claim B2 covered this - B2 counts CARDS, a different denominator entirely. The E block had
    // it right and the B block did not.
    L.say(ly.els.length>0,'74 B1a ['+geo+'] '+o.name+': THE DENOMINATOR - the live modal layer offers controls to measure ('+ly.els.length+'), so B1 below is asserting over something',{controls:ly.els.length,modalZ:ly.modalZ});
    // B1 THE HIT TEST, over the sample points that are ON THE SCREEN. A point off the screen is not a hit-test
    // failure, it is an overflow failure, and B1b is where that is asserted.
    const bad=ly.els.filter(x=>[x.p25,x.p50,x.p75].some(pt=>pt.onScreen&&!pt.own));
    if(bad.length){lost+=bad.length;lostDetail.push(geo+'/'+o.name+': '+bad.map(x=>x.t+'@'+JSON.stringify(x.rect)+'->'+x.p50.what).join(' ; '));}
    L.say(bad.length===0,
      '74 B1 ['+geo+'] '+o.name+': every control in the LIVE MODAL LAYER owns every sample point of its own that is ON THE SCREEN ('+ly.els.length+' controls in the layer, modal z '+ly.modalZ+')',
      bad.length?bad:{controls:ly.els.length,ctaBottom:c&&c.bottom,footTop:foot&&foot.top});
    // B1b THE OVERFLOW FAULT, WHICH #498 FIXES. The question is REACHABILITY, not whether a rect is fully inside
    // the viewport: a control below the fold inside a scroller is correct under US-R50, a control that no
    // user-scrollable ancestor can bring on screen is the defect. Ceiling ZERO, a real assertion.
    // B1a2 IS THE ASSERTION THAT WOULD HAVE CAUGHT ANTAGONIST A's VETO, and non-emptiness would not have.
    // B1a asserts the hit-test set is non-empty. That is not enough when the FILTER PRODUCING THE SET IS
    // CORRELATED WITH THE DEFECT: the overflow fault moves a control out of the viewport, and a viewport filter
    // then removes exactly the control under test while the set stays comfortably non-empty. So the subject is
    // asserted BY NAME to be inside the set the verdict is computed over.
    L.say(ly.ctaInSet&&ly.panelEls.length>0,
      '74 B1a2 ['+geo+'] '+o.name+': THE REACHABILITY DENOMINATOR CONTAINS ITS OWN SUBJECT - the "Got it" CTA is one of the '+ly.panelEls.length+' panel controls this verdict is computed over. Without this, a control that leaves the viewport leaves the denominator and B1b reports ZERO UNREACHABLE because the thing it measures is gone',
      {ctaInSet:ly.ctaInSet,panelControls:ly.panelEls.length,hitTestControls:ly.els.length});
    const unreach=ly.panelEls.filter(x=>!x.reachable);
    const below=ly.panelEls.filter(x=>!x.fullyOnScreen&&x.reachable);
    unreachableSeen.push(...unreach.map(x=>geo+'/'+o.name+'/'+x.t+' rect '+JSON.stringify(x.rect)+' scrollers='+x.scrollers));
    belowFoldSeen.push(...below.map(x=>geo+'/'+o.name+'/'+x.t+' rect '+JSON.stringify(x.rect)+' movedBy='+x.movedBy));
    L.say(unreach.length<=UNREACHABLE_CEILING_PER_CARD,
      '74 B1b ['+geo+'] '+o.name+': ZERO controls of this card are UNREACHABLE ('+unreach.length+') over '+ly.panelEls.length+' panel controls - every one is either fully inside the viewport or is brought fully inside by scrolling a USER-scrollable ancestor, measured by actually scrolling it and re-reading the rect, never by scrollIntoView. On main\'s bundle Petroff at 320x568 had TWO unreachable with scrollers=0 that moved 0.00px (CTA 540.28..584.28 and close X -23.27..6.73); on a bundle capped but NOT scrolling (598cbe4857d6) it has ONE, the CTA at 573.55..617.55',
      unreach.length?unreach.map(x=>x.t+'@'+JSON.stringify(x.rect)+' scrollers='+x.scrollers+' movedBy='+x.movedBy):'all '+ly.panelEls.length+' panel controls reachable');
    // B1c IS A NOTE AND NEVER A PASS OR A FAIL. Below-the-fold-but-reachable is the sanctioned outcome of this
    // build's own fix, so asserting a count here would red a correct tree the first time a lesson gains a line.
    if(below.length)L.note('74 B1c ['+geo+'] '+o.name+': DIAGNOSTIC, not a verdict - '+below.length+' control(s) sit below the fold and are reached by scrolling the card: '+below.map(x=>x.t+' rest '+JSON.stringify(x.rect)+' -> moved '+x.movedBy).join(' ; '));
    // B1d THE MECHANISM ITSELF, in the bundle under test [#377: assert the thing, not only its symptom]. #498's fix
    // is a height cap on the panel, so the measurement is whether the panel fits the viewport at BOTH ends. On
    // main Petroff read -33.27..601.28 (h 634.55) in a 568 viewport - off both ends, because the overlay is
    // alignItems:'center'. A1/B0c already prove the card is up, so ly.panel cannot be null here.
    L.say(!!(ly.panel&&ly.panel.fits),
      '74 B1d ['+geo+'] '+o.name+': the card PANEL is entirely inside the viewport ('+(ly.panel?ly.panel.top+'..'+ly.panel.bottom+' h'+ly.panel.h+' in '+ly.vh:'NO PANEL')+'). This is the overflow mechanism: on main the panel carried maxHeight none and overflowed symmetrically off both ends',ly.panel||{panel:null});
    // AND THE ANTI-VACUITY COUNTER REQUIRES THE PANEL TO ACTUALLY SCROLL, NOT MERELY TO OVERFLOW [#498,
    // antagonist A's veto, cause 2]. The first version counted `scrollRoom>0` alone - scrollHeight>clientHeight -
    // which is TRUE of a capped panel whose overflow-y is `visible` and which therefore scrolls nowhere. Measured
    // on 598cbe4857d6: B5 and B1bG2 both PASSED reporting "at the cap and scrolling" about a panel with
    // overflow-y:visible and zero user-scrollable ancestors beneath it. isUserScroller now means auto|scroll AND
    // room, so the guard asserts the property its own sentence claims.
    if(ly.panel&&ly.panel.isUserScroller&&ly.panel.scrollRoom>0){capBound++;capBoundGlobal.push(geo+'/'+o.name+' scrollRoom '+ly.panel.scrollRoom+' maxHeight '+ly.panel.maxHeight+' ovf '+ly.panel.overflowY);}
    // B1e THE COST ANTAGONIST A FOUND, ASSERTED SO IT CANNOT CHANGE IN SILENCE. The close X is
    // position:absolute inside the panel that this build made the scroller, so it SCROLLS WITH THE CONTENT.
    // MEASURED on 8f25da67c4e3 at 320x568 on Petroff: at rest the X is 10..40, fully on screen; scrolled to the
    // end (67 of 67) it is -57..-27, 0.00px on screen and elementFromPoint at its centre returns nothing. There
    // is NO single scroll position showing both the X and the CTA: the X needs scrollTop <= 39 and the CTA needs
    // >= 49.55. THAT IS A COST AND NOT A DEFECT, and the distinction is US-R50's own: the clause requires each
    // control to BE REACHABLE, and the X is reachable by scrolling back up, which reach() verifies. What is
    // asserted here is the reachability of BOTH, independently - not that one position serves both, which the
    // clause does not ask for. Carried as a named cost on
    // jobs/the-intro-cards-close-x-scrolls-out-of-the-card-it-closes-2026-10-08.
    {
      const x=ly.panelEls.filter(e=>/^(✕|Close)/.test(e.t)||e.t==='Close');
      L.say(x.length>=1,'74 B1e ['+geo+'] '+o.name+': THE DENOMINATOR for the close-X claim - the panel offers a close control to measure ('+x.length+')',{found:x.map(e=>e.t)});
      L.say(x.every(e=>e.reachable),'74 B1e2 ['+geo+'] '+o.name+': the close X is REACHABLE ('+x.map(e=>e.t+' rest '+JSON.stringify(e.rect)+' fullyAtRest='+e.fullyOnScreen+' reachable='+e.reachable).join(' ; ')+'). On main at 320x568 it read -23.27..6.73 with zero user-scrollable ancestors, so 6.73px of a 30px button showed and nothing could bring the rest on',x.map(e=>({t:e.t,rect:e.rect,fullyOnScreen:e.fullyOnScreen,reachable:e.reachable,scrollers:e.scrollers})));
    }
    // C: THE CONSEQUENCE, BY A REAL TAP. On the broken bundle the tap went to the footer and the card STAYED UP.
    // #498: THE TAP NOW SCROLLS FIRST WHERE A FINGER WOULD HAVE TO, AND THAT IS A STRENGTHENING RATHER THAN A
    // WEAKENING. Why it had to change: #498 caps the panel at 100vh, so on Petroff at 320x568 the CTA sits at
    // 573.55..617.55 - below the fold, inside the card's own scroller - and its centre y is 595.55, OUTSIDE a 568
    // viewport. The old C1 clicked that coordinate unconditionally, so it tapped nothing and reported
    // cardUpAfter:true: A RED ON A CORRECT TREE, measured here before the push (141 pass / 1 fail). The defect it
    // was written for is "the tap reaches the wrong control"; it must not also fire on "the control is one scroll
    // away", which US-R50 permits in terms. So the finger does what a finger does - scroll the card, then tap -
    // and the assertion is unchanged: a real tap at the CTA's OWN CENTRE must dismiss the card.
    // IT IS STILL A REAL ASSERTION ON BOTH BUNDLES, which is the thing to check before changing a control:
    // on main there is NO user-scrollable ancestor, so scrollNeeded comes back false, the scroll is a no-op, the
    // centre is at 562.28 (inside 568) and the tap lands exactly as it did before. Nothing about the old
    // behaviour is excused - C1 went green on #497's bundle for Petroff and still does.
    if(c){
      const wasIn=await inLesson(b);
      // bring the CTA fully on screen by scrolling only what a FINGER can scroll, then RE-READ the rect [gate 40]
      const scrolled=await b.page.evaluate(()=>{
        const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));
        if(!g)return {found:false};
        const r0=g.getBoundingClientRect();
        // THE TEST IS THE CENTRE, NOT THE WHOLE RECT, and the difference decided an assertion. US-R50's clause is
        // "reachable at its own centre", and a finger can tap a partly-cut button at its visible centre. An earlier
        // version of this scroll required the FULL rect on screen; measured against main's bundle that made C0 red
        // on Petroff (centre 562.28 IS on screen, bottom 584.28 is not), which SKIPPED C1 on the one bundle where
        // C1's own defect lives and cost the control an assertion #497 had. It also broke this gate's claim that
        // each half reddens only its own half: the overflow control was producing a red in the hit-test block.
        const cy=r0.top+r0.height/2, cx=r0.left+r0.width/2;
        if(cy>=0&&cy<innerHeight&&cx>=0&&cx<innerWidth)return {found:true,scrollNeeded:false,scrollers:0};
        const scs=[];let q=g.parentElement;
        while(q&&q!==document.documentElement){const st=getComputedStyle(q);
          if(/auto|scroll/.test(st.overflowY)&&q.scrollHeight>q.clientHeight+1)scs.push(q);
          q=q.parentElement;}
        for(let i=scs.length-1;i>=0;i--){const z=scs[i];
          const zr=z.getBoundingClientRect(),er=g.getBoundingClientRect();
          const d=(er.bottom>zr.bottom)?((er.bottom-zr.bottom)+8):((er.top<zr.top)?((er.top-zr.top)-8):0);
          z.scrollTop=Math.max(0,Math.min(z.scrollHeight-z.clientHeight,z.scrollTop+d));}
        return {found:true,scrollNeeded:true,scrollers:scs.length};});
      await b.settle(160);
      const c2=await cta(b);                      // the tap point AFTER the scroll, never the stale one
      // THE SCROLL MUST HAVE WORKED, asserted separately so a failure says which half went: if the CTA is still
      // off screen after scrolling everything a finger can scroll, that IS the unreachability defect and C1's own
      // red below would otherwise be blamed on the tap.
      // The tap point must be INSIDE the viewport, or page.mouse.click sends the tap nowhere and C1's red would be
      // an artefact of the harness rather than a fact about the app. Asserted on the CENTRE for the reason above.
      const onScreen=!!(c2&&c2.y>=0&&c2.y<b.geo.h&&c2.x>=0);
      L.say(onScreen,'74 C0 ['+geo+'] '+o.name+': the CTA\'s OWN CENTRE is inside the viewport when the tap is made - at rest, or after scrolling only what a finger can scroll ('+JSON.stringify(scrolled)+'). This is the tap point C1 uses; if it is red the centre is unreachable and C1 below says nothing. The rect may still be partly cut, which is B1b\'s and B1d\'s business and not this assertion\'s',{ctaCentreY:c2&&c2.y,ctaRect:c2,scrolled,vh:b.geo.h});
      if(onScreen){
        await b.page.mouse.click(c2.x,c2.y);await b.settle(900);
        const stillCard=await cardUp(b), stillIn=await inLesson(b);
        L.say(wasIn&&!stillCard&&stillIn,
          '74 C1 ['+geo+'] '+o.name+': a REAL TAP at the CTA\'s own centre dismisses the card and leaves the player in the lesson. On #496 this tap reached the footer instead and the card STAYED UP'+(scrolled.scrollNeeded?' [the card was scrolled first, as a finger would have to: '+scrolled.scrollers+' finger-scrollable ancestor(s)]':' [no scroll needed]'),
          {inLessonBefore:wasIn,cardUpAfter:stillCard,inLessonAfter:stillIn,scrolled});
      }
    }
    await b.close();
  }
  // B2: THE DENOMINATOR, AS ITS OWN ASSERTION. every()/!test() are both TRUE over nothing, so an empty input
  // set would make B1 report PASS loudest exactly when the state had disappeared. Never a conjunct.
  L.say(measured===LESSONS.length,'74 B2 ['+geo+'] THE DENOMINATOR: all '+LESSONS.length+' named lesson cards were actually measured ('+measured+')',{measured,want:LESSONS.length});
  // B3: AND THE ASSERTION MUST BE CAPABLE OF FAILING. If no card reaches the bar's band, B1 cannot fail at this
  // geometry and its green says nothing about the defect. THIS IS REPORTED AND NEVER CREDITED, and it is
  // deliberately a NOTE per geometry rather than a per-geometry FAIL: at 375x730 - Kunal's own phone - NO lesson
  // card reaches the footer (the tallest of the four ends at 627.22 against a footer top of 669), so a red there
  // would be a permanent red on a correct tree, which is how a guard gets switched off. The hard anti-vacuity
  // assertion is B3G below, over the whole run. This is the empty-denominator rule: "make it a red, or an
  // explicit note that says it did not run, and never a PASS".
  if(reachingTheBar>=1){
    L.say(true,'74 B3 ['+geo+'] ANTI-VACUITY: '+reachingTheBar+' of '+measured+' measured cards have their CTA reaching INTO the fixed bar\'s band, so B1 is capable of failing at this geometry',{reachingTheBar,measured});
  }else{
    VACUOUS.push(geo);
    L.note('74 B3 ['+geo+'] NOT EXERCISED HERE, reported rather than credited: 0 of '+measured+' measured cards reach the fixed bar\'s band at this geometry, so B1\'s green above is a POSITIVE CONTROL (nothing collides) and NOT evidence about the defect. This is expected at 375x730 and 375x679: the defect is a SHORT-SCREEN one and the job that raised it says so. No PASS is emitted for B3 at this geometry.');
  }
  L.say(lost===0,'74 B4 ['+geo+'] LOST-CONTROL COUNT over the whole named set is ZERO ('+lost+')',lostDetail.length?lostDetail:'none');
  // B5: ANTI-VACUITY FOR THE OVERFLOW HALF, the same shape as B3 for the hit-test half and for the same reason.
  // B1b and B1d can only fail where a card's content EXCEEDS the viewport; at 375x730 no card does, so their green
  // there is a positive control and not evidence. Reported per geometry, never credited as a PASS, and the hard
  // global assertion is B1bG2 below.
  if(capBound>=1){
    L.say(true,'74 B5 ['+geo+'] ANTI-VACUITY (overflow half): '+capBound+' of '+measured+' measured cards have a panel at its height cap and scrolling, so B1b and B1d are capable of failing at this geometry',{capBound,measured});
  }else{
    L.note('74 B5 ['+geo+'] NOT EXERCISED HERE, reported rather than credited: 0 of '+measured+' measured cards overflow the viewport at this geometry, so B1b\'s and B1d\'s green above is a POSITIVE CONTROL and NOT evidence about the overflow defect. Expected at 375x730 and 375x679 - the defect is a SHORT-SCREEN one. No PASS is emitted for B5 here.');
  }
}
// B3G: THE ONE HARD ANTI-VACUITY ASSERTION, over the whole run rather than per geometry. At least one geometry
// in the list must put a card into the bar's band, or B1 and C1 are decoration everywhere and the gate cannot
// fail at all - which is exactly the shape this suite has shipped before (#395's closed flag, #391's predicate).
// It is a GLOBAL check so that adding a tall-screen geometry can never silently disarm the gate.
// ── D: THE GESTURE THE CAP CREATED MUST NOT KILL THE CARD. ANTAGONIST B's V1, AS AN ASSERTION. ───────────
// THE DEFECT THIS EXISTS FOR WAS INTRODUCED BY THIS BUILD'S OWN FIRST FIX AND CAUGHT BEFORE THE PUSH.
// `introHoldRef` is set only by the panel's onClick, and a touch drag that scrolls produces NO CLICK. So capping
// the card put Petroff's CTA below the fold and made the only route to it a gesture that did not hold the card:
// MEASURED at 320x568 with real CDP touch drags - two drags move the panel scrollTop 0 -> 67 and the CTA centre
// 595.55 -> 528.55, the card is GONE at +4600ms anyway, and a real tap at that centre then lands on a lesson
// footer glyph and STEPS THE DEMO. That is #497's own player-visible symptom returned by timing instead of by
// paint order. The remedy is onScroll setting the same ref the onClick already sets.
// THE CONTROL IS FREE AND IS PUBLISHED WITH ITS COMMAND: delete the hook from the shipped bundle.
//     sed 's/onScroll:()=>{pp.current=!0},//' app.js > gates/.probe/nohold.js
//     CT_APP=gates/.probe/nohold.js CT_74_GEOS=se node gates/regress/74-lesson-card-hit-area.js
// D RUNS ONLY WHERE THE PANEL ACTUALLY SCROLLS, because where it does not there is no gesture to hold and the
// assertion would be a positive control. That is reported as a NOTE, never credited as a PASS.
for(const geo of GEOS){
  const b=await L.launch({geo,name:'74D-'+geo});await b.open();
  const o=await openPlain(b,'Openings',45);   // NOT openHeld: its click would hold the card and void D2
  if(!o.ok){L.say(false,'74 D0 ['+geo+'] could not reach Openings row 45 for the hold-on-scroll check',o);await b.close();continue;}
  const pi=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;
    let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;
    const r=q.getBoundingClientRect();const s2=getComputedStyle(q);
    return {x:r.left+r.width/2,room:q.scrollHeight-q.clientHeight,ovfY:s2.overflowY,ovfX:s2.overflowX};});
  if(!pi){L.say(false,'74 D0b ['+geo+'] the intro card was not up for the hold-on-scroll check',{});await b.close();continue;}
  // D3 is independent of whether the panel scrolls: the horizontal axis must stay pinned. Setting overflow-y to
  // auto makes the other axis compute to auto, which antagonist B measured clipping a Related chip by 33.5px at a
  // 256-wide viewport. Asserted at every geometry because the defect is width-dependent and invisible at 320.
  L.say(pi.ovfX==='hidden','74 D3 ['+geo+'] the card panel\'s computed overflow-x is pinned to hidden ('+pi.ovfX+'), so making it a vertical scroller did not silently give it a horizontal axis. On main it read visible; with overflow-y:auto alone it computes to auto, and at a 256-wide viewport that clipped a Related-lessons chip by 33.5px',{overflowX:pi.ovfX,overflowY:pi.ovfY});
  if(pi.room>0){
    // THE GESTURE IS ONE DRAG STARTED ON THE CARD'S OWN BODY TEXT, AND THAT CHANGE IS THE WHOLE POINT
    // [antagonist C, objection 2]. D's first gesture was TWO drags of 120px from y=420. y=420 is inside the
    // plans block, whose own scroll room (97) EXCEEDS the panel's (67), so 240px of travel exhausted the child
    // and chained the remainder to the panel - and D2 went green on a tree where the defect it names is still
    // reachable. MEASURED on the shipped bundle: ONE 80px drag at the plans block's centre gives panelScrollTop
    // 0, panelScrollEvents 0, childScrollTop 72, the CTA unmoved at 595.55, the card GONE at +4600ms and the
    // next tap toggling the lesson footer's play control. 3 of 3 trials. A gesture that only works when it is
    // long enough to exhaust a child scroller is not the gesture a reader makes.
    const sc=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));
      let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;
      const kids=[...q.children].filter(c=>{const s2=getComputedStyle(c);return /auto|scroll/.test(s2.overflowY)&&c.scrollHeight>c.clientHeight+1;});
      const ch=kids[kids.length-1]||null;const cr=ch?ch.getBoundingClientRect():null;const r2=n=>Math.round(n*100)/100;
      return {panelScrollTop:q.scrollTop,childRoom:ch?ch.scrollHeight-ch.clientHeight:null,
              startY:cr?r2(cr.top+cr.height/2):null,childBand:cr?[r2(cr.top),r2(cr.bottom)]:null};});
    const before=sc.panelScrollTop;
    // start on the inner scroller when there is one, which is the finger a reader uses; else mid-panel
    const startY=sc.startY!=null?sc.startY:Math.round(b.geo.h*0.6);
    L.note('74 D1a ['+geo+'] the drag starts at y='+startY+' on the card\'s body text'+(sc.childBand?(' (inner scroller '+JSON.stringify(sc.childBand)+', its own room '+sc.childRoom+' against the panel\'s '+pi.room+')'):' (no inner scroller found)'));
    await fingerDrag(b,pi.x,startY,startY-80);await b.settle(200);
    const after=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;return q.scrollTop;});
    // D1 THE DENOMINATOR: if the drag did not move the panel there is no gesture under test and D2's green would
    // mean nothing. This is the #416 rule - check the control moved the quantity the assertion reads.
    // D0c WAS AN UNCONDITIONAL L.say(true,...) CREDITED AS A PASS AND IS NOW A NOTE [antagonist C, objection 4].
    // It asserted nothing - it restated which helper the block called - and it passed on the hook-deleted bundle
    // too, so it was one of the 79. This file's own rule: "make it a red, or an explicit note that says it did
    // not run, and never a PASS."
    L.note('74 D0c ['+geo+'] ROUTE, not a verdict: the card was reached by openPlain, which taps no panel, so introHoldRef is false going in and the drag is the only thing that can hold it.');
    // D1 IS NO LONGER A DENOMINATOR FOR D2 AND MUST NOT BE READ AS ONE. Whether the PANEL moved is now part of
    // what is under test, not a precondition for it: the defect is precisely that a reader's drag moves a child
    // and not the panel. So D1 asserts the thing the player needs - that one ordinary drag brings the CTA into
    // the viewport - and D2 asserts the card survived it. Both must hold.
    const ctaNow=await cta(b);
    const ctaIn=!!(ctaNow&&ctaNow.y>=0&&ctaNow.y<b.geo.h);
    L.say(ctaIn,'74 D1 ['+geo+'] ONE ordinary finger drag on the card\'s body text brings the CTA\'s centre inside the viewport (panel '+before+' -> '+after+' of '+pi.room+', CTA centre now '+(ctaNow&&ctaNow.y)+' in '+b.geo.h+'). On the shipped #498 tree this is RED: the drag scrolls the inner plans block, whose room (97) exceeds the panel\'s (67), the panel sees no scroll event at all and the CTA never moves from 595.55',{before,after,room:pi.room,ctaCentre:ctaNow&&ctaNow.y,vh:b.geo.h});
    await b.page.waitForTimeout(4600);
    const stillUp=await cardUp(b);
    L.say(stillUp,'74 D2 ['+geo+'] THE CARD SURVIVES THE GESTURE THAT REACHES ITS OWN BUTTON: after a real finger drag the card is still up at +4600ms, past the 4000ms auto-dismiss. A drag fires no click, so without onScroll setting introHoldRef the card dies under the finger and the next tap reaches the lesson footer and steps the demo - measured on this build\'s own first fix, and on a bundle with the onScroll hook deleted',{cardUp:stillUp,scrolledTo:after});
  }else{
    L.note('74 D ['+geo+'] NOT EXERCISED HERE, reported rather than credited: the card\'s panel has no scroll room at this geometry ('+pi.room+'), so there is no scroll gesture to hold and D1/D2 would be positive controls. Expected wherever the cap does not bind. No PASS emitted.');
  }
  await b.close();
}

// B1bG IS NOW AN ASSERTION, NOT A TALLY. #497 printed the residual because it did not fix it; #498 fixes it, so the
// count must be ZERO and a regression must be a red rather than a longer list in a passing line.
L.say(unreachableSeen.length===0,
  '74 B1bG THE OVERFLOW FAULT, counted once over the whole run: '+unreachableSeen.length+' control(s) across every card and geometry are UNREACHABLE. It must be zero. #497 shipped with 2 (Petroff\'s CTA and close X at 320x568) and named them as a residual; #498 caps the panel at 100vh with overflow-y:auto, which is what makes them reachable: '+(unreachableSeen.join(' | ')||'none'),
  {count:unreachableSeen.length,items:unreachableSeen});
L.note('74 B1bG-note BELOW THE FOLD BUT REACHABLE, the sanctioned outcome of the cap, printed so a change in the population is visible: '+belowFoldSeen.length+' control(s) - '+(belowFoldSeen.join(' | ')||'none'));
// B1bG2: THE HARD ANTI-VACUITY FOR THE OVERFLOW HALF, global for the same reason B3G is global - adding a tall
// geometry must never be able to silently disarm B1b and B1d.
L.say(capBoundGlobal.length>=1,
  '74 B1bG2 ANTI-VACUITY, THE HARD ONE FOR THE OVERFLOW HALF: at least one card in this run has its panel AT the height cap and scrolling, so B1b and B1d are capable of failing somewhere. Without this, a run over tall geometries only would report B1b/B1d green over cards that never overflow: '+(capBoundGlobal.join(' | ')||'NONE'),
  {count:capBoundGlobal.length,items:capBoundGlobal});
L.say(VACUOUS.length<GEOS.length,
  '74 B3G ANTI-VACUITY, THE HARD ONE: at least one of the '+GEOS.length+' geometries exercises the defect - i.e. has a card whose CTA reaches the fixed bar - so B1 and C1 are capable of failing somewhere in this run. Geometries that did NOT exercise it: '+(VACUOUS.join(',')||'none'),
  {geometries:GEOS,notExercised:VACUOUS});

// ── E: THE OTHER DIRECTION. With NO modal up, the fixed bars are part of the live layer and their own
//    buttons must own their centres. This is what stops the fix being "raise everything until nothing collides":
//    if the card's overlay were raised so far that it swallowed the bars permanently, E would still pass, but a
//    bar that cannot be used in the ordinary demo state would fail here.
{
  const b=await L.launch({geo:'se',name:'74E'});await b.open();
  const D=require('../drive/lesson');
  await D.states['demo-m0'](b);
  const ly=await layer(b);
  L.say(!ly.hasModal,'74 E0 [se] in the plain demo state no full-viewport modal is up, so the live layer is the document and the fixed bars are in scope',{overlays:ly.overlayCount,modalZ:ly.modalZ});
  const bad=ly.els.filter(x=>!x.p50.own);
  L.say(ly.els.length>0,'74 E1 [se] THE DENOMINATOR: the demo state offers controls to measure ('+ly.els.length+')',{n:ly.els.length});
  L.say(bad.length===0,'74 E2 [se] and every one of them owns its own centre, the lesson footer\'s five included',bad.length?bad.map(x=>x.t+'->'+x.p50.what):'all '+ly.els.length);
  await b.close();
}
L.done();
})().catch(e=>{console.error('74 THREW',e);process.exit(1);});
