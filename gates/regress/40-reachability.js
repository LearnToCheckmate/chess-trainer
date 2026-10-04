// regress/40-reachability.js  "below the fold" is NOT "unreachable". THE RULE, WRITTEN AS A GATE.
//
// WHY THIS EXISTS. In one night the overnight test lane raised three reachability defects against #378. Two of the
// three were the SAME measurement error and neither was a defect:
//   - "the ⋯ sheet's content is below the fold at five of six geometries" (TC-RL-070). The sheet is maxHeight 82vh
//     with overflowY auto. Scrolled to its end, every row is on screen and tappable. See gate 38.
//   - "the Review ENTRY screen overflows 80.2px at 320x568 with docScrollY 0, so the Chess.com help text is
//     unreachable on the smallest phones." Measured here: the content past the fold sits inside a scroll container
//     whose maxScroll is EXACTLY 80px, and "Getting your game from Chess.com" scrolls to top 385 / bottom 401 in a
//     568-tall viewport. Reachable, and the 80.2 in the report is the scroller's own range read as if it were spill.
//
// THE ERROR IS THE SAME BOTH TIMES, and it is subtle enough to keep recurring: `document.scrollingElement` does not
// scroll, so the reporter concluded nothing scrolls. But an inner div with overflow:auto scrolls WITHOUT the
// document scrolling at all. An element whose rect is below the viewport is only unreachable when NO ancestor can
// bring it into view. CLAUDE.md says a crop is a reading and a bad selector is a reading; this is the third member
// of that family - a bottom coordinate is a reading too, until you have asked what can scroll.
//
// So this gate does not guard one screen. It guards the RULE, by doing the measurement correctly on the screen
// where the lane got it wrong, and it fails loudly if that screen ever really does strand content.
//
// WHAT IT PROVES, at 320x568 (where the report was filed) and at his 375x730:
//   1. Whatever sits below the fold on the Review entry screen has a scrollable ancestor that can reach it, and
//      the gate names that ancestor and its range rather than asserting an absence.
//   2. The specific text the report named is reachable, measured after scrolling rather than at rest.
//      CORRECTED 2026-10-03 BY THE RUN THAT MEASURED IT, in the document that carried it [R18]: "rather than at
//      rest" is FALSE as written on the #473 bundle. The text is on screen AT REST at BOTH swept geometries (se
//      468-485 of 568, kunal730 448-465 of 730), so assertion 2 would pass without any scroll at either one. The
//      scroll still happens and still moves it (se 468 -> 385), but the assertion does not depend on it, so it is
//      a layout statement here and not a reachability one. Not repaired in this run because repairing it needs a
//      geometry where the text really is below the fold: jobs/gate-40s-named-help-text-assertion-is-on-screen-at-rest-at-both-geometries-2026-10-03.
//   3. The DOCUMENT still does not scroll - which is a deliberate design property here, not a defect, and is
//      exactly the signal that was misread. Asserting it makes the misreading impossible to repeat silently.
//   4. Nothing overflows horizontally, which IS unrecoverable on a phone and is the real version of this bug -
//      see flag sweep372-other-lines-320, where a button hardcoded to end at x=375 hung 55px off a 320 screen
//      with no scroll to recover it. The contrast is the point: vertical spill inside a scroller is fine,
//      horizontal spill past the viewport is not.
//
// NEGATIVE CONTROL, and it took two attempts, both worth recording.
//   FIRST CONTROL, WORTHLESS: overflowY set to hidden on a `.scroll` div inside the screen. The gate stayed green
//   and so did every measured number, byte for byte - because that div is not the scroller serving this screen. A
//   control that does not move the measurement proves nothing about the gate either way, and reading it as "the
//   gate is fine" would have been the mistake.
//   THE REAL SCROLLER IS `#root`, styled from index.html, not from chess.jsx, and index.html says so in a comment:
//   "The app scrolls inside here if its content ever overflows - the page never does." That single line is the
//   whole explanation of the two false reports: docScrollY is 0 BY DESIGN, so a reporter who checks the document
//   and stops concludes nothing scrolls.
//   SECOND CONTROL, REAL: #root given overflow-y hidden, so the app genuinely cannot scroll anywhere. The gate
//   goes red at 320x568 with scrollers:0 and reached:false on three boxes.
//   WHICH ASSERTION DISCRIMINATES: the below-the-fold sweep. The named-help-text assertion stays GREEN on the
//   broken build, because the leaf element carrying that phrase happens to sit at top 385 and is on screen at
//   rest - it is the block BELOW it that gets stranded. Said out loud so nobody reads that green as coverage.
//   AND THIS GATE'S FIRST VERSION WENT GREEN ON THE REAL CONTROL TOO, 12 of 12, for both reasons above. A gate
//   written to warn about a measurement error, making exactly that error, is the most useful thing in this file.
'use strict';
const L=require('../lib');
const Z=require('../drive/puzzles');

// The correct reachability measurement, and the reference implementation of the rule. Two things make it correct,
// and BOTH were wrong in this gate's first version, which went green against a bundle built to fail it:
//
//   (a) A user can only scroll a container whose COMPUTED overflowY is auto or scroll. Script is not so limited:
//       assigning scrollTop, and scrollIntoView(), will happily scroll an overflow:hidden box. The first version
//       used scrollIntoView and therefore reported "reachable" on a build with the scroller removed - the exact
//       fault gate 35 had, reproduced here by the same reflex.
//   (b) Finding SOME scrollable ancestor proves nothing. It has to be an ancestor that, when scrolled, actually
//       brings THIS element on screen. The first version climbed until it found any box with room to scroll and
//       called that reachable, so an unrelated scroller elsewhere in the tree certified content it does not
//       contain.
//
// So the measurement is empirical: collect only the USER-scrollable ancestors, actually scroll them, re-read the
// element's rect, then put every scrollTop back. What comes out is the truth rather than an inference about it.
const scan=(b)=>b.page.evaluate(()=>{
  const vh=innerHeight;
  const userScrollables=(el)=>{const out=[];let p=el.parentElement;
    while(p&&p!==document.documentElement){const s=getComputedStyle(p);
      if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+1)out.push(p);
      p=p.parentElement;}
    return out;};
  const targets=[];
  const walk=(el,d)=>{for(const c of el.children){const r=c.getBoundingClientRect();
    if(r.height>0&&r.bottom>vh+0.5)targets.push(c);
    if(d<6)walk(c,d+1);}};
  walk(document.getElementById('root'),0);
  const items=[];
  for(const el of targets){
    const r0=el.getBoundingClientRect();
    // An element taller than the viewport can never be fully on screen and is not a defect on its own; what
    // matters is that its CONTENTS are reachable, and they are walked as their own targets.
    const tallerThanScreen=r0.height>vh;
    const scs=userScrollables(el);
    const saved=scs.map(p=>p.scrollTop);
    for(let i=scs.length-1;i>=0;i--){const p=scs[i];
      const pr=p.getBoundingClientRect(),er=el.getBoundingClientRect();
      p.scrollTop=Math.max(0,Math.min(p.scrollHeight-p.clientHeight,p.scrollTop+(er.bottom-pr.bottom)+8));}
    const r=el.getBoundingClientRect();
    items.push({ct:el.getAttribute('data-ct'),t:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),
                scrollers:scs.length,tall:tallerThanScreen,
                restBottom:Math.round(r0.bottom),afterBottom:Math.round(r.bottom),
                reached:tallerThanScreen||r.bottom<=vh+0.5});
    scs.forEach((p,i)=>{p.scrollTop=saved[i];});
  }
  return {vh,docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight),items};
});
// The named text, reached the way a finger would: only user-scrollable ancestors, never scrollIntoView.
const reach=(b,re)=>b.page.evaluate((src)=>{
  const r=new RegExp(src[0],src[1]);
  const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&r.test(e.textContent||''));
  if(!el)return {found:false};
  const r0=el.getBoundingClientRect();
  const scs=[];let p=el.parentElement;
  while(p&&p!==document.documentElement){const s=getComputedStyle(p);
    if(/auto|scroll/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+1)scs.push(p);
    p=p.parentElement;}
  for(let i=scs.length-1;i>=0;i--){const q=scs[i];
    const pr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
    q.scrollTop=Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop+(er.top-pr.top)-Math.max(0,(pr.height-er.height)/2)));}
  const g=el.getBoundingClientRect();
  return {found:true,scrollers:scs.length,top:Math.round(g.top),bottom:Math.round(g.bottom),vh:innerHeight,
          restTop:Math.round(r0.top),restBottom:Math.round(r0.bottom),
          onScreenAtRest:r0.top>=-0.5&&r0.bottom<=innerHeight+0.5,
          onScreen:g.top>=-0.5&&g.bottom<=innerHeight+0.5};
},[re.source,re.flags]);
const hspill=(b)=>b.page.evaluate(()=>{
  const vw=innerWidth,bad=[];
  for(const e of document.querySelectorAll('body *')){
    if(e.closest('[data-mstrip]'))continue;            // the move strip scrolls sideways on purpose
    if(/^(head|style|script|title|meta|link)$/i.test(e.tagName))continue;
    const s=getComputedStyle(e);
    if(s.visibility==='hidden'||s.display==='none')continue;
    const r=e.getBoundingClientRect();
    if(r.width<1||r.height<1)continue;
    if(r.right>vw+0.5)bad.push({ct:e.getAttribute('data-ct'),tag:e.tagName.toLowerCase(),right:Math.round(r.right*10)/10,vw,t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,30)});
  }
  return {docScrollW:Math.round(document.documentElement.scrollWidth),vw,bad:bad.slice(0,5)};
});

// ════ THE DENOMINATOR, DECLARED AND ASSERTED RATHER THAN PRINTED AND FORGOTTEN ══════════════════════════════
// jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28, raised by #426's
// antagonist A against this gate, measured not read: re-running this gate at #426 (18 pass / 0 fail) its own
// L.note lines said "se: 4 painted boxes sit below the fold at rest" and "kunal730: 0 painted boxes sit below
// the fold at rest". So at Kunal's own geometry `stranded.length===0` was an EMPTY-SET PASS - the headline
// assertion of the gate this project cites most could not fail at the geometry that matters most - and the
// count that would have revealed it was printed with L.note and asserted by nothing.
//
// WHY THIS IS A DECLARATION AND NOT A PINNED COUNT. Pinning se to 4 would red the moment the Review entry
// screen gains or loses a box, which is a layout change and not a reachability defect, and this project has
// paid for brittle literal pins repeatedly (gate 26's ICON_PIN, gate 15's baseline, gate 47's line numbers).
// What is actually load-bearing is the CLASS of the denominator: does this geometry contribute inputs to the
// headline assertion at all? That is declared here, and it is falsifiable in BOTH directions:
//   - if kunal730 ever starts stranding boxes below the fold, its kind flips to 'some' and this reds, which is
//     the stronger signal because it means the headline assertion has become live there;
//   - if se ever stops contributing, its kind flips to 'none' and this reds, which is the exact failure the
//     job was filed about - the headline PASS going vacuous without anybody noticing.
// EMPTY IS NOT A PASS, IT IS A DECLARED FACT, and a declared fact that changes is a finding either way.
// ── ITEM 2 OF THIS GATE'S OWN AUDIT, AND THE PREDICATE IS LIFTED OUT SO A CONTROL CAN DRIVE IT ──────────────
// jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28, alsoFromTheSameAudit
// item 2: the puzzle-header measurement below used `kids:[...r.children]`, which is DEPTH-1. Only the direct
// children of the first div inside pz-top were measured, so a spilling DESCENDANT - a badge inside a wrapper,
// a span inside a button - was invisible to the one assertion in this file about the spill that CANNOT be
// recovered. The walk is now depth-general.
//
// THE PREDICATE IS A NAMED FUNCTION, NOT AN INLINE FILTER, for the reason this project has now paid for twice:
// a control that re-implements the comparison proves that a COPY of the check can fire, which is not the same
// claim. The live assertions and the controls below both call spillPast, so the controls constrain the live
// check [jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02].
//
// 0.5px is the existing tolerance and is kept deliberately: subpixel layout puts a box's right edge a fraction
// past the viewport on screens where nothing is actually clipped, and this gate's sibling assertion at :190 uses
// the same figure. Changing it is a separate decision from deepening the walk.
const spillPast=(boxes,vw)=>(boxes||[]).filter(k=>k.right>vw+0.5);

// AND THE DEPTH OF EACH HEADER IS DECLARED, NOT REQUIRED TO BE DEEP. This started life as `deeper>0` in both
// views and the first real run RED-flagged the online header at 0 of 2 - correctly, because that header IS flat.
// A vacuity guard written as "there must be deep boxes" is a layout pin wearing a coverage message, and pinning
// today's layout as the requirement is the exact error recorded on
// jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02. So the shape borrowed is the
// one burst 10 used for DENOM_KIND one block above: declare the kind per view and assert the measurement against
// the declaration, which is falsifiable in BOTH directions. 'deep' flipping to 'flat' means the right-edge claim
// has quietly become a depth-1 claim again; 'flat' flipping to 'deep' means a wrapper has appeared on a screen
// whose spill was only ever measured at depth 1, which is the condition this whole item was filed about.
const HDR_DEPTH_KIND={browse:'deep',online:'flat'};
const hdrKind=(all)=>((all||[]).some(k=>k.depth>=2)?'deep':'flat');

// THE CONTROL SET. No browser, no bundle: fabricated readings driven through the SAME function the live
// assertions call, in BOTH directions. The count is fixed at 6 so the suite total cannot drift with the app's
// answers, which is what block 4 required of the denominator assertion above. Eight after C7 and C8 were added.
//
// The case that matters is C2. Under the old depth-1 walk the spilling box was not in the array at all, so the
// filter returned empty and the assertion read PASS - the detector could not fire on the only input it exists
// to catch. C2 is that input, and it is the one line that would have gone red before this change and goes red
// after it only if the walk is depth-general.
{
  const V=375;
  const flat=[{t:'a',right:100,depth:1},{t:'b',right:200,depth:1}];
  const deepSpill=[{t:'a',right:100,depth:1},{t:'wrapper',right:300,depth:1},{t:'badge',right:391.2,depth:2}];
  const shallowSpill=[{t:'a',right:100,depth:1},{t:'b',right:380.4,depth:1}];
  L.say(spillPast(flat,V).length===0,'CONTROL C1: nothing past the edge -> the predicate is SILENT. A detector that fires on a clean reading is useless.',spillPast(flat,V));
  L.say(spillPast(deepSpill,V).length===1&&spillPast(deepSpill,V)[0].depth===2,'CONTROL C2 - THE WHOLE POINT OF THIS CHANGE: a box at depth 2 whose right edge is 391.2 on a 375 viewport IS caught, and the caught box is the depth-2 one. Under the depth-1 walk this reading could not exist, so the live assertion read PASS over a header that was clipping a grandchild.',spillPast(deepSpill,V));
  L.say(spillPast(shallowSpill,V).length===1,'CONTROL C3: a depth-1 box past the edge is still caught, so deepening the walk did not lose the coverage it already had.',spillPast(shallowSpill,V));
  L.say(spillPast([{t:'edge',right:V+0.5,depth:2}],V).length===0,'CONTROL C4: a box ending at EXACTLY vw+0.5 is within the existing subpixel tolerance and is not reported. The boundary is asserted rather than assumed.',V+0.5);
  L.say(spillPast([{t:'edge',right:V+0.6,depth:2}],V).length===1,'CONTROL C5: and vw+0.6 IS reported, so the tolerance is a threshold rather than a hole. C4 and C5 together are what make the 0.5 a measured choice.',V+0.6);
  L.say(hdrKind(deepSpill)==='deep'&&hdrKind(flat)==='flat','CONTROL C7: the depth classifier itself, both directions - a reading with a depth-2 box reads deep, a reading with only depth-1 boxes reads flat. Without this the two declared-kind assertions could be satisfied by a classifier that always returns one answer.',{deep:hdrKind(deepSpill),flat:hdrKind(flat)});
  L.say(hdrKind([])==='flat'&&hdrKind(null)==='flat','CONTROL C8: and an EMPTY reading classifies as flat rather than throwing, so a view whose header failed to render reds on the declared-kind line of a \'deep\' view instead of crashing the gate. That is the difference between a measurement and an exception.',hdrKind(null));
  L.say(spillPast([],V).length===0&&spillPast(null,V).length===0,'CONTROL C6: an EMPTY reading returns empty - which is a PASS the live assertion must never be allowed to earn on its own, which is why the live block asserts its own denominator below rather than only this filter.',0);
}

const DENOM_KIND={se:'some',kunal730:'none'};
const DENOM={};           // geo -> {below, moved, stranded}
const HELP_REST={};       // geo -> was the named help text already on screen at rest (so no scrolling exercised)

L.run(async()=>{
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'reach-'+geo,store:{}});await b.open();
    await b.tile('Review');await b.settle(700);

    const bf=await scan(b);
    const stranded=bf.items.filter(x=>!x.reached);
    // A box a scroll ACTUALLY MOVED, which is the only kind that exercises the measurement this gate is for.
    // `tall` boxes are excluded because the gate already rules them out as non-defects by construction.
    const moved=bf.items.filter(x=>!x.tall&&x.afterBottom<x.restBottom);
    DENOM[geo]={below:bf.items.length,moved:moved.length,stranded:stranded.length};
    L.note(geo+': '+bf.items.length+' painted boxes sit below the fold at rest; docScroll '+bf.docScroll);
    for(const x of bf.items.slice(0,4))L.note('   '+JSON.stringify(x));
    const kind=bf.items.length>0?'some':'none';
    L.say(kind===DENOM_KIND[geo],geo+': THE DENOMINATOR OF THE HEADLINE ASSERTION, asserted rather than noted - this geometry contributed '+bf.items.length+' box(es) below the fold ('+kind+'), and it is DECLARED to contribute '+DENOM_KIND[geo]+'. At kunal730 that number is ZERO, so the headline PASS below is an EMPTY-SET pass at Kunal\'s own geometry and proves nothing there; saying so is the point of this line [jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28].',DENOM[geo]);
    L.say(stranded.length===0,geo+': over '+bf.items.length+' input(s) - and that count is the assertion above, not decoration - every box below the fold on the Review entry screen can be SCROLLED onto the screen by a finger - measured by actually scrolling its user-scrollable ancestors and re-reading the rect, not by finding one and assuming. "Below the fold" is not "unreachable", and that is the measurement the test lane got wrong twice in one night.',stranded.slice(0,3));

    const help=await reach(b,/Getting your game from Chess\.com/i);
    HELP_REST[geo]=help.found?!!help.onScreenAtRest:null;
    L.say(help.found,geo+': the help text the report named is on this screen at all',help);
    // THE SECOND VACUITY IN THE SAME FILE, from the same audit's first alsoFromTheSameAudit item: at kunal730
    // this gate's own note read "scrollers:0, top 466, bottom 482, vh 730", i.e. the text is on screen AT REST,
    // so the next assertion certifies no scrolling there either. Recorded per geometry and asserted across the
    // sweep after the loop rather than declared per geometry, because which geometry happens to need a scroll
    // is a layout fact and pinning it here would be the brittle-pin mistake again.
    L.note(geo+': help text at rest top '+help.restTop+' bottom '+help.restBottom+' of '+help.vh+' - onScreenAtRest '+help.onScreenAtRest+', so the reachability assertion below '+(help.onScreenAtRest?'exercises NO scrolling at this geometry':'does exercise scrolling at this geometry')+'.');
    L.say(help.found&&help.onScreen,geo+': and a finger can reach it (top '+help.top+', bottom '+help.bottom+', viewport '+help.vh+', via '+help.scrollers+' user-scrollable ancestor(s)). The report called it unreachable at 320x568; the 80.2px it cites is the scroller\'s own range.',help);

    L.say(bf.docScroll===0,geo+': the DOCUMENT still does not scroll - which is the design here, not the defect. It is the signal that was misread into two false reports, so it is pinned rather than left to be rediscovered.',bf.docScroll);

    const hs=await hspill(b);
    L.say(hs.bad.length===0&&hs.docScrollW<=hs.vw+0.5,geo+': nothing hangs off the RIGHT - the spill that genuinely cannot be recovered on a phone, unlike vertical spill inside a scroller',hs);

    await b.shot('reach-'+geo);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }

  // ════ NON-VACUITY ACROSS THE SWEEP, which is what the per-geometry declaration cannot give on its own ══════
  // The declaration above says kunal730 legitimately contributes nothing. That is fine for one geometry and
  // fatal for all of them: if the day comes when NO geometry has anything below the fold, every headline PASS
  // in this file is an empty-set pass and the gate reports green over no measurement at all. These two lines
  // are the floor under that, and both are falsifiable by deleting the scroller rather than only by layout:
  // the #426 control (#root at overflow-y hidden) leaves boxes below the fold and moves none of them, so
  // `moved` goes to 0 and the second line reds - which is the discrimination the first version of this gate
  // did not have at all [jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28].
  const totBelow=Object.values(DENOM).reduce((a,d)=>a+d.below,0);
  const totMoved=Object.values(DENOM).reduce((a,d)=>a+d.moved,0);
  L.say(totBelow>0,'ACROSS THE SWEPT GEOMETRIES the below-the-fold sweep measured '+totBelow+' box(es) in total, so the headline reachability claim is made over a NON-EMPTY set at at least one geometry. A green gate over zero inputs everywhere is the frozen-denominator failure this project records, and this is the line that would catch it.',DENOM);
  L.say(totMoved>0,'AND AT LEAST ONE OF THOSE BOXES WAS ACTUALLY MOVED BY SCROLLING ('+totMoved+' of '+totBelow+'), so "reachable" was earned by scrolling a user-scrollable ancestor and re-reading the rect rather than by nothing being below the fold in the first place.',DENOM);
  // THE THIRD LINE THIS RUN WROTE IS **NOT** AN ASSERTION, AND THAT IS A DELIBERATE CHOICE RECORDED RATHER THAN
  // HIDDEN. I wrote it as `L.say(helpScrolled.length>0, ...)` first and MEASURED IT RED at both geometries on the
  // #473 bundle: the named help text is already on screen AT REST at se (rest top 468, bottom 485 of 568) AND at
  // kunal730 (448/465 of 730), so the named-help-text assertion exercises NO scrolling at EITHER geometry and is
  // non-discriminating as a reachability check everywhere, not only at 375x730. That is a real pre-existing
  // coverage gap in this gate and it is NOT a defect this change introduced, so landing it as a red would stop
  // every build on somebody else's finding [R16: file it, do not block on it]. It is therefore printed as a
  // measurement and filed as a job with an owner:
  //   jobs/gate-40s-named-help-text-assertion-is-on-screen-at-rest-at-both-geometries-2026-10-03
  // Whoever fixes it should make the assertion require a scroll (name a geometry where the text IS below the
  // fold, or assert onScreenAtRest===false before asserting onScreen), not delete the check.
  const helpScrolled=Object.keys(HELP_REST).filter(g=>HELP_REST[g]===false);
  L.note('HELP-TEXT REST STATE across the sweep: '+JSON.stringify(HELP_REST)+' - geometries where a scroll was actually needed: '+(helpScrolled.join(', ')||'NONE, so this gate\'s named-help-text assertion is a layout statement rather than a reachability one at every geometry it visits. Filed as jobs/gate-40s-named-help-text-assertion-is-on-screen-at-rest-at-both-geometries-2026-10-03'));

  // ---- THE PUZZLE HEADER AT 320, which is the OTHER half of this gate's subject: the spill that really cannot
  // be recovered. uat378 measured the tier badge ending at 336.44 on a 320 screen with document.scrollWidth
  // pinned at 320 and an ancestor at overflow-x hidden - 16.44px simply gone, no scroll to reach it. Reproduced
  // on #381 at 336.84. #382 shrinks the Roadmap label to a chevron at 340 and below, which is what the HINT
  // branch of this same row already does, and the badge ends at 316.
  // 375 is measured too and asserted to be UNCHANGED by that fix, because Kunal's Z-06 condition is that fixing
  // 320 must not move the larger screens.
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'pzhdr-'+geo,store:{}});
    await b.open();
    await Z.states['train'](b);await b.settle(500);
    const row=await b.page.evaluate(()=>{
      const top=document.querySelector('[data-ct="pz-top"]');const r=top&&top.querySelector('div');
      if(!r)return null;
      const box=(c,depth)=>{const q=c.getBoundingClientRect();
        return {t:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,24),x:Math.round(q.left),w:Math.round(q.width),
                right:Math.round(q.right*100)/100,depth,tag:c.tagName.toLowerCase(),painted:q.width>0.5&&q.height>0.5};};
      // DEPTH-GENERAL. `kids` stays depth-1 and unchanged, because the Z-06 position pin below is written
      // against the three direct children and deepening THAT would be a different assertion. `all` is every
      // painted descendant, which is what the right-edge claim is now made over.
      const all=[];(function walk(el,d){for(const c of el.children){const bx=box(c,d);if(bx.painted)all.push(bx);walk(c,d+1);}})(r,1);
      return {vw:innerWidth,docScrollW:document.documentElement.scrollWidth,
              kids:[...r.children].map(c=>{const q=c.getBoundingClientRect();
                return {t:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,24),x:Math.round(q.left),w:Math.round(q.width),right:Math.round(q.right*100)/100};}),
              all,maxDepth:all.reduce((m,k)=>Math.max(m,k.depth),0)};
    });
    L.say(!!row,geo+': the puzzle header row is on screen',row);
    // THE DENOMINATOR OF THE NEXT LINE, ASSERTED RATHER THAN PRINTED - the same failure this whole job is about,
    // one block further down the file. The depth-general claim is only worth making if the walk actually went
    // deeper than the old one did: if the header ever flattens to three leaf children, `deeper` falls to 0 and
    // the deep half of the assertion below is measuring nothing. That must go red rather than stay quietly green.
    const deeper=((row&&row.all)||[]).filter(k=>k.depth>=2);
    L.say(hdrKind(row&&row.all)===HDR_DEPTH_KIND.browse,geo+': THE DENOMINATOR OF THE RIGHT-EDGE ASSERTION, asserted rather than printed. The browse puzzle-header walk is DEPTH-GENERAL and reached '+(((row&&row.all)||[]).length)+' painted descendant(s) to a maximum depth of '+(row&&row.maxDepth)+', of which '+deeper.length+' lie BELOW depth 1 and were INVISIBLE to this gate until now - so the depth-1 walk was missing a real box on this screen, not a hypothetical one. It is DECLARED \'deep\'; if it ever measures \'flat\' the line below has silently become a depth-1 claim again [jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28 item 2].',{n:((row&&row.all)||[]).length,deeper:deeper.length,maxDepth:row&&row.maxDepth,kind:hdrKind(row&&row.all),declared:HDR_DEPTH_KIND.browse});
    const past=spillPast(row&&row.all,row&&row.vw);
    L.say(past.length===0,geo+': NOTHING in the puzzle header runs off the right edge - measured over all '+(((row&&row.all)||[]).length)+' painted descendant(s) rather than over the 3 direct children, which is the correction this line needed. This is the spill that cannot be recovered - the row sits inside an ancestor with overflow-x hidden and document.scrollWidth stays at the viewport width, so anything past the edge is gone rather than scrollable.',{past,docScrollW:row&&row.docScrollW,over:((row&&row.all)||[]).length});
    if(geo==='kunal730'){
      // Z-06's condition, asserted rather than promised: the 320 fix must not move 375.
      const want=[{w:119,x:4},{w:93,x:148},{w:105,x:266}];
      const got=(row&&row.kids)||[];
      const same=got.length===want.length&&want.every((wv,i)=>Math.abs(got[i].w-wv.w)<1.5&&Math.abs(got[i].x-wv.x)<1.5);
      L.say(same,'kunal730: the header is UNCHANGED at 375 by the 320 fix - Roadmap 119@4, counter 93@148, tier badge 105@266. His Z-06 condition was that fixing the small screen must not move the large one, so it is measured here rather than asserted in a commit message.',got);
    }
    // NOT asserted here, and said out loud so nobody reads its absence as coverage: at 375x730 a board-square box
    // inside the grid measures 49.69 wide ending at 376.39, 1.39px past the viewport, clipped by an ancestor at
    // overflow-x hidden. It reproduces in a clean browser and is NOT this row. See flag
    // puzzle-board-square-1px-375. Scoping this check to the header row keeps the two findings apart.
    await b.shot('pzhdr-'+geo);
    await b.close();
  }

  // ── THE SECOND HALF OF ITEM 2: THIS GATE NEVER VISITED pzView==='online', THE SCREEN #426 CHANGED ──────────
  // The loop above drives Z.states['train'], which is pzView==='browse'. The audit's item 2 says the gate "only
  // ever runs the local-puzzle state, never pzView==='online'", and a grep for 'online' over this file returned
  // nothing before this block. The online view renders its OWN pz-top (chess.jsx:7554, a second element carrying
  // the same data-ct), with its own header row - the ‹ Roadmap button and the '🌐 Lichess · ✓ N solved' span -
  // so every selector the block above uses resolves there and measured nothing there.
  //
  // WHAT IS COVERED HERE AND WHAT IS NOT, said plainly so the absence is not read as coverage. The view is
  // entered from the roadmap and its header is measured depth-general, at both swept geometries. The LOADED
  // puzzle state is NOT measured, because reaching it needs lichess.org and this harness's egress proxy refuses
  // it [R21: the network block is recorded, never worked around]. What the app shows instead is its own offline
  // message - "Couldn't reach Lichess. This works on the deployed site with internet - it may be blocked in this
  // in-app preview." - so this block measures the state a player with no connection actually sees, which had no
  // coverage of any kind, and declares the connected state as owed rather than quietly skipping it.
  const openOnline=async(b)=>{
    await Z.states['roadmap-bottom'](b);
    await Z.tapBtn(b,/^🌐 Online puzzles/,1500);
    await b.settle(1200);
  };
  for(const geo of ['se','kunal730']){
    const b=await L.launch({geo,name:'pzonline-'+geo,store:{}});
    await b.open();
    await openOnline(b);
    const row=await b.page.evaluate(()=>{
      const tops=[...document.querySelectorAll('[data-ct="pz-top"]')];
      const top=tops[tops.length-1];const r=top&&top.querySelector('div');
      if(!r)return null;
      const box=(c,depth)=>{const q=c.getBoundingClientRect();
        return {t:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,24),x:Math.round(q.left),w:Math.round(q.width),
                right:Math.round(q.right*100)/100,depth,tag:c.tagName.toLowerCase(),painted:q.width>0.5&&q.height>0.5};};
      const all=[];(function walk(el,d){for(const c of el.children){const bx=box(c,d);if(bx.painted)all.push(bx);walk(c,d+1);}})(r,1);
      return {vw:innerWidth,docScrollW:document.documentElement.scrollWidth,tops:tops.length,
              viewText:(top.innerText||'').replace(/\s+/g,' ').trim().slice(0,160),
              all,maxDepth:all.reduce((m,k)=>Math.max(m,k.depth),0)};
    });
    // (a) THE STATE IS THE ONE CLAIMED. Without this the three lines below could all be measuring the browse
    //     header again - which is exactly how this gate came to report on a screen it had never opened.
    L.say(!!row&&/Lichess/.test(row.viewText||''),geo+': the ONLINE puzzle view is open and this is its own pz-top, not the browse one - the header names Lichess. Asserted first because every other line in this block is worthless if the view did not change.',row&&{tops:row.tops,viewText:row.viewText});
    const deeper=((row&&row.all)||[]).filter(k=>k.depth>=2);
    L.say(hdrKind(row&&row.all)===HDR_DEPTH_KIND.online,geo+' ONLINE: the denominator again, and this one is DECLARED \'flat\' because that is what it measures - '+(((row&&row.all)||[]).length)+' painted descendant(s), maximum depth '+(row&&row.maxDepth)+', '+deeper.length+' below depth 1. MEASURED FIRST AND DECLARED SECOND: this line was written as \'there must be deep boxes\' and went RED here on its first real run, which is a layout pin rather than a coverage guard. A flip to \'deep\' means a wrapper has appeared inside the online header, whose right-edge spill nothing measured at any depth before this block.',{n:((row&&row.all)||[]).length,deeper:deeper.length,maxDepth:row&&row.maxDepth,kind:hdrKind(row&&row.all),declared:HDR_DEPTH_KIND.online});
    const past=spillPast(row&&row.all,row&&row.vw);
    L.say(past.length===0,geo+' ONLINE: NOTHING in the online puzzle header runs off the right edge, over all '+(((row&&row.all)||[]).length)+' painted descendant(s). This screen had no right-edge coverage at any depth before this block; the browse header has had it since #382.',{past,docScrollW:row&&row.docScrollW});
    await b.shot('pzonline-'+geo);
    await b.close();
  }
  L.note('ONLINE VIEW, WHAT IS STILL OWED AND IT IS NOT IN THIS FILE: the LOADED online puzzle (curPuz.ext set, board showing, chess.jsx:5037) is unreachable from this harness because lichess.org is refused by the egress proxy, so a fixture would have to come from a CT_* override in chess.jsx - which this lane may not write. Until then the connected state of pzView===\'online\' has NO coverage and this note is the record of that, not a claim about it [R18, R21].');
},'REACHABILITY');
