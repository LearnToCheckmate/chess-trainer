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
// ── THE RESIDUAL. THIS BUILD DOES NOT CLOSE THE CLASS, AND THE CARD IT DOES NOT CLOSE IS IN THE SET ───────
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
// CT_APP=<origin/main's own app.js, md5 01387f706cea>  ->  B1 RED. That is the ideal control: free, and the
// actual broken build. On it, A3 is red too (the mechanism), B3 stays GREEN (the cards still reach the bar,
// which is what makes B1 able to fail), and C1 is red on the lessons whose centre is lost.
// Published with the command, per #411: `CT_APP=gates/.trial/mainbundle.js node gates/regress/74-lesson-card-hit-area.js`
//
'use strict';
const L=require('../lib');

const GEOS=(process.env.CT_74_GEOS||'se,short375,kunal730').split(',');
// geometries at which no measured card reached the fixed bar, so B1 could not have failed there
const VACUOUS=[];
// Controls that extend outside the viewport. THE OVERFLOW FAULT, which this build does not fix: the per-card
// ceiling is 2 because Petroff at 320x568 has exactly two (its CTA, 16.28px below the screen, and its close X,
// 23.27px above it). It is a CEILING and not an allow-list so a third cannot appear in silence, and the ids are
// printed either way. Raising it needs a measurement and a reason, in the commit that raises it.
const OFFSCREEN_CEILING_PER_CARD=2;
const offScreenSeen=[];
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
  return {modalZ:top?zOf(top):null,hasModal:!!top,overlayCount:overlays.length,bars,
          modalHoldsTheCTA:!!(top&&cta&&top.contains(cta)),
          els:els.map(sample),vw:innerWidth,vh:innerHeight};
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
  let measured=0,lost=0,reachingTheBar=0;const lostDetail=[];
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
    // B1b THE OVERFLOW, which this build does NOT fix and does not claim to. Ceiling of ONE, named, with its job.
    const off=ly.els.filter(x=>!x.fullyOnScreen);
    offScreenSeen.push(...off.map(x=>geo+'/'+o.name+'/'+x.t+' rect '+JSON.stringify(x.rect)));
    L.say(off.length<=OFFSCREEN_CEILING_PER_CARD,
      '74 B1b ['+geo+'] '+o.name+': at most '+OFFSCREEN_CEILING_PER_CARD+' control(s) of this card extend outside the viewport ('+off.length+'). THIS IS THE OVERFLOW FAULT, NOT THE HIT-TEST ONE - z-index cannot move a rect, and Petroff at 320x568 is the known residual: panel 634.55 tall in 568, CTA 16.28px below the screen, close X 6.73px of 30 on it. Carried on jobs/the-lesson-intro-card-can-be-taller-than-the-viewport-and-nothing-scrolls-it-2026-10-08',
      off.length?off.map(x=>x.t+'@'+JSON.stringify(x.rect)):'all '+ly.els.length+' fully on screen');
    // C: THE CONSEQUENCE, BY A REAL TAP. On the broken bundle the tap went to the footer and the card STAYED UP.
    if(c){
      const wasIn=await inLesson(b);
      await b.page.mouse.click(c.x,c.y);await b.settle(900);
      const stillCard=await cardUp(b), stillIn=await inLesson(b);
      L.say(wasIn&&!stillCard&&stillIn,
        '74 C1 ['+geo+'] '+o.name+': a REAL TAP at the CTA\'s own centre dismisses the card and leaves the player in the lesson. On #496 this tap reached the footer instead and the card STAYED UP',
        {inLessonBefore:wasIn,cardUpAfter:stillCard,inLessonAfter:stillIn});
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
}
// B3G: THE ONE HARD ANTI-VACUITY ASSERTION, over the whole run rather than per geometry. At least one geometry
// in the list must put a card into the bar's band, or B1 and C1 are decoration everywhere and the gate cannot
// fail at all - which is exactly the shape this suite has shipped before (#395's closed flag, #391's predicate).
// It is a GLOBAL check so that adding a tall-screen geometry can never silently disarm the gate.
L.say(true,'74 B1bG THE OVERFLOW RESIDUAL, counted once for the run rather than implied: '+offScreenSeen.length+' control(s) across all cards and geometries extend outside the viewport, and every one is the OVERFLOW fault this build does NOT fix: '+(offScreenSeen.join(' | ')||'none'),{count:offScreenSeen.length,items:offScreenSeen});
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
