// gates/pending/75-fit-loop-one-way-ratchet.js
// TC-R64 (US-R72) - THE PORTRAIT FIT LOOP IS A ONE-WAY RATCHET: it shrinks the board on a real overflow and
// can then never grow it back, so a board stays smaller for the rest of the visit.
//
// WHY IT IS IN gates/pending/ AND NOT IN gates/regress/, SAID FIRST BECAUSE IT IS THE MOST IMPORTANT FACT
// ABOUT THIS FILE. The defect is LIVE ON origin/main and this gate REDS on main by design. L.run exits
// non-zero, so in regress/ it would fail its section and block every push on a tree no build broke - the
// trade #508 declined on its own G5-occlusion finding. gates.sh enumerates "$G"/regress/*.js only, so this
// file is inert here, and gates/gate-manifest.tsv carries an `absent` row naming the job so
// gatemanifest.sh reports the gap on EVERY run instead of the gap being a silence. It moves to regress/ and
// the row flips to `required` IN THE SAME COMMIT as the app fix, never before - the route gate 50 waits on.
// gates/audit/cited-not-run.sh carries the matching ADMIT roster row, declared, because the moment a record
// document cites this file it joins that audit's set and an unaccounted member breaches a hard ceiling of 0.
//
// THE JOB: jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29, priority 16, band 16, unblocked by
// Kunal's own Desk answer questions/q-latch-detector-blocking (2026-10-04, choice fix-app-first). The CAUSE
// is fingerprints/94a2c0fe0b10aab2, chess.jsx|boardTrim - the loop, not the screen.
//
// THE NAME CHANGED AND THAT IS A FINDING, NOT A TIDY-UP. This file shipped its first draft as
// 75-lesson-demo-board-latch.js, scoped to the lesson. `_fitScreen` (chess.jsx, search _fitScreen) covers
// FOUR screen families - compact review, play, puzzle browse/online, and lesson - and antagonist B measured
// the IDENTICAL one-way ratchet on PLAY (375x568, 272.00 -> 256.00, 16px lost) and PUZZLE (259.03 -> 235.03,
// 24px lost), with `over` 0 in both arms exactly as here. Compact review did not reproduce with a ply-change
// trigger, which is NOT REPRODUCED and not immune. A lesson-scoped gate would have certified one screen and
// stayed blind on two the moment the row flipped to `required`, which is the failure the `absent` row exists
// to prevent. PLAY AND PUZZLE ARE MEASURED-AFFECTED AND UNCOVERED BY THIS FILE: adding their cells is owed
// work and is filed, not claimed here.
//
// WHAT WAS NOT REPRODUCIBLE BEFORE THIS FILE. The job records the symptom as firing "2 of 6 observed full
// runs" and "about 1 run in 5", mechanism "NOT established"; #468 could not provoke it in 36 launches and
// the headless-gallery lane could not in 11. This gate does not wait for the trigger, it CAUSES one, and
// then asks whether the board comes back.
//
// AND A TRANSIENT OF THE SIZE THAT LATCHES HIS PHONE IS SOMETHING THIS APP REALLY PUTS INTO THE FLOW -
// with one important qualification that the cross-read supplied and that is easy to get wrong.
// gates/regress/16-cpu-result-line.js records at :424 that at game over "its 62px in-flow spacer
// (chess.jsx:7175) entered the flow, the fit loop read it as content and trimmed the board 224.00 -> 192.00
// - 14%", with the irreversibility in its own figures: "live 224.00 -> card-up 192.00 -> card-gone 192.00".
// THE QUALIFICATION: that measurement sits under that file's "E: LANDSCAPE, 730x375" header and was taken on
// the #434 bundle, and #436 then took the loop OUT of landscape entirely (`_fitScreen` opens with `!wide`).
// So gate 16 is a HISTORICAL RECORD of a bundle two builds dead; it does NOT assert the portrait ratchet
// today, and this file remains the only gate over the PORTRAIT ratchet. What gate 16 does establish, and it
// is the part that matters, is that a 62px in-flow spacer entering the flow on a content change is a REAL
// pattern in this codebase and not a synthetic one - which is why the 60-90px band that latches Kunal's own
// phone is reachable rather than hypothetical. Antagonist B found the citation; antagonist A corrected its
// scope in the cross-read, and the build verified both before writing this. The honest open question is
// therefore narrower than "the trigger is unidentified" and sharper than "it is already measured":
// WHICH PORTRAIT SCREEN STILL PUTS MORE THAN ABOUT 60px INTO THE FLOW ON A CONTENT CHANGE.
//
// THE SIZE OF THE TRANSIENT IS AN INPUT AXIS, AND THE FIRST DRAFT OF THIS FILE DROVE ONE VALUE OF IT AND
// PUBLISHED THE RESULT AS A PROPERTY. That is the single worst thing this build did and it is corrected
// here [R18]. The first draft measured 0px of latch at 375x730 and 375x761 with a 16px injection and wrote
// into its assertion text that "the latch cannot occur here" and that the job's claim about Kunal's phone
// was "FALSE and withdrawn". IT IS NOT FALSE. Measured on main's own bundle at the lesson demo end,
// injection alone, board read AFTER the content is removed:
//     375x730   16px -> 0.00 lost      56px -> 0.00      64px -> 0.00      88px -> 29.20 LATCHED (345.83)
//     375x761  120px -> 32.80 LATCHED (342.23)
//     375x568   88px -> 78.88 LATCHED (192.00)
// So the board latches on his phone above a threshold between 64 and 88px at the demo end, and chess.jsx's
// own #436 comment said so all along in a clause the first draft dropped: "At 375x730 width binds instead
// and the trim cannot move the board at all UNTIL IT EXCEEDS ~145px". The withdrawal is withdrawn.
//
// AND THE MAGNITUDE SCALES WITH THE TRANSIENT, so "16-24px" was an artefact of a 16px probe. At 375x568 an
// 88px transient lands the board on 192.00 - EXACTLY the floor gates/regress/48-lesson-flow.js records from
// the wild against a usual 270.88, "about 2 runs in 6" - which is 78.88px, 29% of the board. That is the
// only magnitude this project has ever observed in the field, and it reproduces here at one input size.
// A LIMIT ON THE SEVERITY, measured by antagonist B and worth publishing beside it: repeated identical
// transients do NOT accumulate. 14 inject/remove cycles at 375x568 moved the board once and 0 times after.
// Magnitude of a SINGLE transient is what decides it, so there is no unbounded ratchet from repetition.
//
// AND AT 320x540 IT COSTS MORE THAN BOARD WIDTH. gate 48 publishes the arithmetic: the MOVES row's residual
// is its min-content (231.55px, geometry-independent) minus the board, and #430 closed the #424 overflow by
// taking the board 212.39 -> 236.39 there, "where the row now FITS with 4.84px to spare". The latched board
// at 320x540 is 212.39 - the exact pre-#430 value - and 231.55 - 212.39 = 19.16 is #424's PINNED residual at
// that height to the hundredth. So the latch RE-OPENS the "Other lines" button overflow #430 closed. The
// clean board 236.39 reproduces that -4.84 exactly. Found by antagonist A by reading gate 48 from the diff.
//
// THE MECHANISM, MEASURED RATHER THAN READ:
//   (a) `over` - the only quantity the loop acts on - reads EXACTLY 0 in every settled state, because #root
//       has exactly ONE in-flow child whose height EQUALS the viewport. Measured 0 on lesson at four
//       geometries and, by antagonist B, on play, puzzle AND compact review as well. So #364's growth branch
//       (`over < -24`), added for "Kunal's phone sat at board 319 with trim 0 and 56px of slack nobody could
//       claim", CANNOT FIRE ON ANY PORTRAIT SCREEN. That is a landed fix that never executes, and it is a
//       larger and separate item than this latch; filed, not claimed here.
//   (b) The loop's `spacers` term reads 0 here: its predicate needs a DIRECT child of #root that is
//       aria-hidden with flex-grow and no children, and the only grow-capable box is one level deeper, is
//       not aria-hidden and has six children.
//   (c) The slack a single shrink leaves is ceil(over/8)*8+8-over, which lies in [8,16) for EVERY possible
//       over>0 - 8 is attained at over=8,16,24..., and 16 is approached as over->0+ and never reached -
//       against a growth branch requiring over<-24. The ratchet is one-way BY CONSTRUCTION. (The first
//       draft wrote (8,16]; both endpoints were wrong and the conclusion is unaffected.)
//   (d) WHERE THE SLACK GOES IS KNOWN, and the first draft wrongly published it as the open half: the MOVES
//       PANEL absorbs it. data-ct="moves-panel" goes 64.61 -> 88.61 at 320x540 and 74.13 -> 90.13 at
//       375x568, i.e. +24.00 and +16.00, EXACTLY the board lost in each cell - and chess.jsx's own comment
//       at that panel says it "ABSORBS THE SLACK". A probe looking for flex FREE SPACE cannot see it,
//       because free space is identically 0 wherever a flex-grow child exists: the grow child expands to
//       consume exactly that space, so such a probe cannot print anything else on any bundle. So a
//       measurement-based fix is NOT ruled out, which is the opposite of what the first draft concluded.
//       Both antagonists found this independently, in the build's own frozen log.
//
// THE ASSERTION CARRIES ITS OWN CONTROL, IN THE SAME RUN, AT THE SAME GEOMETRY. Every block drives the same
// path twice - once clean, once with a transient - and asserts the two boards are EQUAL, so there is no
// expected board width anywhere in this file. That matters because every absolute board pin in this suite is
// a function of this container's fonts (gates/lib.js's #480 note measures the app's stack and bare
// sans-serif 53.84px apart on one line, and six consecutive containers once could not gate any tree because
// of it). BUT "IMMUNE" IS TOO STRONG: the ASSERTION is container-independent and its ability to FAIL is not.
// The latch step at 375x568 fires on an `over` of 2.88px, so a container whose lesson text lays out 3px
// shorter makes that cell stop reproducing and the assertion would go green on a broken bundle with nothing
// saying so. That is what A5 and E0 are for - they measure the peak `over` the transient produced, so a
// vanished margin reports itself instead of passing quietly.
//
// GEOMETRY. 320x540 and 375x568 are the two cells where a SMALL transient latches; 320x540 is not invented
// here, gates/regress/48-lesson-flow.js already drives it, labelled "inside the overflow band, not at its
// floor" (#424). 375x761 is Kunal's phone (R19's settled figure) and 375x730 is the legacy lib.js
// GEOS.kunal730 entry - a deliberate wording change, because R19's own text says "USE 375 x 761. The figure
// 730 is wrong and should be corrected wherever it appears, including the GEOS entry labelled kunal730", so
// citing R19 as the authority FOR 730 cites it against itself. #507 removed that exact miscitation from gate
// 73 and this file's first draft reproduced it; both antagonists caught it.

const L=require('../lib.js');
const D=require('../drive/lesson.js');

// [geometry label, geo, the SMALL transient that latches here or 0 if none, the LARGE transient that does]
const CELLS=[
  {n:'320x540', g:{w:320,h:540,safe:''}, small:16,  large:null},
  {n:'375x568', g:L.GEOS.short375,       small:16,  large:null},
  {n:'375x730', g:L.GEOS.kunal730,       small:16,  large:88 },
  {n:'375x761', g:L.GEOS.kunal761,       small:16,  large:120},
];

const bw=async(b)=>{const x=await b.board();return x?Math.round(x.w*100)/100:null;};

const overOf=(b)=>b.page.evaluate(()=>{
  const r=document.getElementById('root'),de=document.documentElement;
  if(!r)return null;
  const rb=r.getBoundingClientRect(); let bottom=0,sp=0,inflow=0;
  for(const c of r.children){const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
    if(q.height<=0)continue;
    if(cs.position==='fixed'||cs.position==='absolute')continue;
    inflow++;
    if(c.getAttribute('aria-hidden')==='true'&&parseFloat(cs.flexGrow)>0&&c.children.length===0){sp+=q.height;continue;}
    if(q.bottom-rb.top>bottom)bottom=q.bottom-rb.top;}
  const pb=parseFloat(getComputedStyle(r).paddingBottom)||0;
  const over=bottom>0?(bottom-sp+pb-de.clientHeight):(de.scrollHeight-de.clientHeight);
  return {over:Math.round(over*100)/100,spacers:Math.round(sp*100)/100,inflow};
});

// IS THE "Now I'll try it" BUTTON GONE? That is how we know practice was REACHED rather than that a click
// returned true. toPractice clicks inside page.evaluate, which is a synthetic DOM click that bypasses hit
// testing entirely, so it reports success even where the control is occluded - which is gate 74 / TC-R60's
// P0 at exactly these short geometries. Antagonist B's finding: without this, a click swallowed in BOTH
// arms leaves both measuring the DEMO board, and every other assertion in the block still passes on it.
const inPractice=(b)=>b.page.evaluate(()=>
  ![...document.querySelectorAll('button')].some(x=>/Now I'll try it/.test(x.innerText||'')));

const toPractice=(b)=>b.page.evaluate(()=>{
  const t=[...document.querySelectorAll('button')].find(x=>/Now I'll try it/.test(x.innerText||''));
  if(!t)return false; t.click(); return true;});

const armInner=async(geo,px)=>{
  const b=await L.launch({geo});
  await b.open();
  await D.states['endgame-demo-end'](b);
  await b.settle(900);
  const demo=await bw(b);
  let nInflow=null;
  if(px){
    nInflow=await b.page.evaluate((n)=>{const r=document.getElementById('root');
      const inflow=[...r.children].filter(c=>{const cs=getComputedStyle(c);
        return cs.position!=='fixed'&&cs.position!=='absolute'&&c.getBoundingClientRect().height>0;});
      const host=inflow.length===1?inflow[0]:r;
      const d=document.createElement('div');d.id='ct510inj';
      d.style.cssText='height:'+n+'px;flex:0 0 '+n+'px;width:100%';host.appendChild(d);
      return inflow.length;},px);
    await b.settle(700);
  }
  // sample `over` per frame across the dependency change: the branch acts on the value at the frame the rAF
  // loop RESTARTS, not on what an interval sample catches. Measured at #510: a 700ms sample reads 0.39 at
  // 320x540 and 0.00 at 375x568 while the branch consumes 12.39 and 2.88 [#416].
  await b.page.evaluate(()=>{window.__ct75=[];window.__ct75stop=false;
    const read=()=>{const r=document.getElementById('root'),de=document.documentElement;
      if(!r)return null; const rb=r.getBoundingClientRect(); let bottom=0,sp=0;
      for(const c of r.children){const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
        if(q.height<=0)continue; if(cs.position==='fixed'||cs.position==='absolute')continue;
        if(c.getAttribute('aria-hidden')==='true'&&parseFloat(cs.flexGrow)>0&&c.children.length===0){sp+=q.height;continue;}
        if(q.bottom-rb.top>bottom)bottom=q.bottom-rb.top;}
      const pb=parseFloat(getComputedStyle(r).paddingBottom)||0;
      return bottom>0?(bottom-sp+pb-de.clientHeight):(de.scrollHeight-de.clientHeight);};
    const tick=()=>{if(window.__ct75stop)return;const o=read();if(o!==null)window.__ct75.push(Math.round(o*100)/100);requestAnimationFrame(tick);};
    requestAnimationFrame(tick);});
  const injRect=px?await b.page.evaluate(()=>{const e=document.getElementById('ct510inj');
    if(!e)return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    return {h:Math.round(r.height*100)/100,pos:cs.position,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'};}):null;
  const clicked=await toPractice(b);
  await b.settle(1400);
  const peak=await b.page.evaluate(()=>{window.__ct75stop=true;
    return window.__ct75.length?Math.max.apply(null,window.__ct75):null;});
  const during=px?await bw(b):null;
  if(px){await b.page.evaluate(()=>{const e=document.getElementById('ct510inj');if(e)e.remove();});await b.settle(1500);}
  await b.page.waitForTimeout(2000);
  const board=await bw(b), ov=await overOf(b), practice=await inPractice(b);
  const errs=b.errs.length;
  await b.close();
  return {demo,board,during,injRect,ov,clicked,practice,nInflow,errs,peak};
};

// #393: a harness throw in one arm must go red on its OWN assertion and let the rest of the file run.
// L.run catches exactly one throw and exits, so without this a failure in the first arm hides every
// assertion after it. Antagonist A's finding.
const arm=async(geo,px)=>{
  try{ return await armInner(geo,px); }
  catch(e){ return {demo:null,board:null,during:null,injRect:null,ov:null,clicked:false,practice:false,nInflow:null,errs:-1,peak:null,threw:String(e&&e.message||e)}; }
};

const pair=(n,tag,clean,inj,px,engages)=>{
  L.say(!clean.threw&&!inj.threw,'TC-R64 '+tag+'0 '+n+' neither arm threw'+(clean.threw||inj.threw?' - '+(clean.threw||inj.threw):''),{clean:clean.threw||null,injected:inj.threw||null});
  L.say(clean.clicked===true&&inj.clicked===true,'TC-R64 '+tag+'1 '+n+' the practice tap was accepted in BOTH arms',{clean:clean.clicked,injected:inj.clicked});
  L.say(clean.practice===true&&inj.practice===true,'TC-R64 '+tag+'2 '+n+' PRACTICE WAS ACTUALLY REACHED in both arms - the "Now I\'ll try it" button is gone. toPractice clicks inside page.evaluate, which bypasses hit testing and returns true even where the control is occluded, so without this a swallowed click leaves both arms measuring the DEMO board and every assertion below passes on it [antagonist B]',{clean:clean.practice,injected:inj.practice});
  L.say(typeof clean.board==='number'&&clean.board>40,'TC-R64 '+tag+'3 '+n+' a board is painted in the clean arm - the denominator',{board:clean.board});
  L.say(typeof inj.board==='number'&&inj.board>40,'TC-R64 '+tag+'4 '+n+' a board is painted in the injected arm. `lost` is 0 when BOTH boards are null, so the recovery assertion would pass over two absent boards',{board:inj.board});
  L.say(clean.demo===inj.demo,'TC-R64 '+tag+'5 '+n+' THE TWO ARMS ARE COMPARABLE: they agree at the demo end, measured BEFORE either diverges. An L.note in the first draft, and both antagonists called it a precondition and therefore a verdict - gate 48 records this board as BISTABLE between runs ("192 then 192 in one run and 270.9 then 270.9 in the next", about 2 runs in 6), so two independent draws could both be low and report a recovery that never happened',{cleanDemo:clean.demo,injectedDemo:inj.demo});
  // THE NON-VACUITY OF THE RECOVERY ASSERTION, AND IT TOOK THREE TRIES TO GET RIGHT [R18]. The versions
  // that were wrong are recorded because the mistake is the instructive part and both were caught, not
  // reasoned away.
  //   TRY 1 asserted the transient had moved the peak `over` this file samples per frame. It went RED ON A
  //   WORKING CONTROL at three of six cells - at 375x568 the injected and clean peaks are BOTH 2.88 while
  //   only the injected arm latches, and at the two sub-threshold cells both read 0 - because an outside
  //   sampler and the loop never see the same DOM: the loop measures inside its OWN rAF callback, after its
  //   own setBoardTrim has applied. Caught by running it.
  //   TRY 2 asserted the BOARD had moved while the transient was in flow. That passes on main at all six
  //   cells, and it is still wrong, because it is a claim about the APP: a fix that absorbed the transient
  //   without shrinking the board at all would REDDEN IT WHILE BEING CORRECT. That is precisely the fault
  //   antagonist A vetoed in this file's first C1/C2, one level along, and A caught it again in the
  //   cross-read before the suite finished.
  // SO THE PRECONDITION IS NOW A FACT ABOUT THE CONTROL AND NOT ABOUT THE APP, which is antagonist A's own
  // prescription: the injected element really did sit IN THE FLOW with its full height at the moment of the
  // dependency change. No bundle, broken or fixed, can make that false, and without it two equal boards
  // would prove only that the injection never happened.
  if(px){
    L.say(!!inj.injRect&&inj.injRect.inFlow===true&&Math.abs(inj.injRect.h-px)<1,'TC-R64 '+tag+'6 '+n+' THE CONTROL REALLY WAS APPLIED: the '+px+'px transient sat IN THE FLOW with its full height at the moment of the dependency change. A fact about the injection, not about the app, so no correct bundle can redden it [#385, and antagonist A twice]',{measured:inj.injRect,px});
  } else {
    L.say(inj.injRect===null,'TC-R64 '+tag+'6 '+n+' the clean arm injected nothing',{injRect:inj.injRect});
  }
  L.note(n+' '+px+'px board WHILE the transient was in flow (after the dependency change, before removal): '+inj.during+'  against a clean '+clean.board+'. Printed and NOT asserted: see the comment above. On main this is where the shrink has already landed, so it equals the final latched board; a fix that absorbed the transient without shrinking would read the clean value here and must not be called a failure for it.');
  // A7/A8 RESTORED AT 09:1xZ AFTER THE RE-RUN ON THE FINAL FILE COUNTED 52 ASSERTIONS WHERE EVERY DOCUMENT SAID 64.
  // These two were an UPHELD ANTAGONIST FIX - b430f0e asserted `clean.errs===0&&inj.errs===0` as one conjunct, the veto
  // said a conjunct over both arms cannot say which one errored, and a336836 split them. My own cross-read commit
  // b111ce9, which replaced the A6 precondition eight lines above, DELETED BOTH as collateral - 2 per pair x 6 pairs = 12
  // assertions, and nothing noticed, because the file still ran and still went red in the four places it should.
  // THE ONLY REASON THIS WAS CAUGHT is that the figures were re-measured on the final file instead of carried from the
  // file they were taken on [#504]: 48 pass / 4 fail against a published 60 / 4 is a 12-assertion hole, and the count was
  // the only thing that showed it. A deleted assertion is invisible in a green run - which is this project's own
  // gates-green-does-not-say-which-gates-RAN finding, one level down: inside a gate, nothing counts its own assertions.
  L.say(clean.errs===0,'TC-R64 '+tag+'7 '+n+' zero console errors, clean arm',{errs:clean.errs});
  L.say(inj.errs===0,'TC-R64 '+tag+'8 '+n+' zero console errors, injected arm - asserted separately from the clean arm, because a conjunct over both cannot say which one errored',{errs:inj.errs});
  const lost=Math.round((clean.board-inj.board)*100)/100;
  L.say(Math.abs(lost)<0.5,'TC-R64 '+tag+'9 '+n+' THE BOARD COMES BACK after a '+px+'px transient. A transient piece of in-flow content across one loop-dependency change must not cost board for the rest of the visit: the board after the injection cycle equals the board with no injection. NO pixel literal - the control is the other arm of the same run'+(engages?'':' (this cell is BELOW the threshold on main, so it is green on the broken bundle too and its job is to show the instrument can report both answers [#385])'),{cleanBoard:clean.board,afterInjectCycle:inj.board,lostPx:lost,transientPx:px});
  L.note(n+' '+px+'px peak `over` sampled per frame: injected='+inj.peak+'  clean='+clean.peak+'   -- printed, NOT asserted: see the comment above A6. At 375x568 these are EQUAL at 2.88 while only the injected arm latches, which is why a predicate over them reddens a working control.');
  L.note(n+' '+px+'px mechanism, final settled state: over='+(inj.ov&&inj.ov.over)+'  spacers='+(inj.ov&&inj.ov.spacers)+'  inflowChildrenOfRoot='+(inj.ov&&inj.ov.inflow)+'   -- over 0 means the growth branch has no signal at ANY threshold; spacers 0 means the loop cannot see the slack. These are facts about the implementation under test, NOT requirements on it, which is why they are printed and not asserted: the surviving candidate fixes make `over` signed or widen the `spacers` predicate, so asserting them would have REDDENED A CORRECTLY FIXED BUNDLE and the gate would have vetoed the only fix it exists to enable [antagonist A].');
  return lost;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// BLOCK D, ADDED BY #522: THE PER-FRAME CHECK. It is the third item of Kunal's own bar for this fix
// (jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29, START_HERE_2026_10_13_KUNALS_SHAPE.bar):
// "A per-frame check that no wrong-size board is painted at 375x568 and at 320x540."
//
// WHAT "WRONG-SIZE" MEANS, STATED BEFORE ANY ASSERTION, BECAUSE THE OBVIOUS READING IS UNFALSIFIABLE. The board
// legitimately CHANGES size across this sequence - practice chrome takes real height, and a transient in the flow
// genuinely needs room - so "every frame equals one number" would redden a correct bundle. What must never be
// painted is either half of the trade Kunal was asked to price:
//   D1 NO OVERSHOOT. No frame may be WIDER than that arm's own settled board for that phase. An overshoot is the
//      #355 blink, the board jumping to full size and back, which is what "re-fit the board from scratch" costs
//      if it is done in the rAF loop instead of before paint.
//   D3 NO LATCH, AND NO OSCILLATION. The injected arm must reach the clean arm's settled board after the
//      transient leaves, and once it reaches it, it must never leave it again (the wrong-size frames must form a
//      PREFIX). The prefix form is deliberate and threshold-free: a recovery cannot precede the removal that
//      causes it, so SOME wrong frames are owed; what is not owed is a board that wanders afterwards.
//
// NEITHER ASSERTION CARRIES A PIXEL LITERAL. Every reference is the OTHER ARM of the same run at the same
// geometry in the same container, which is this file's own construction and the reason it carries no expected
// board width: every absolute board pin in this suite is a function of this container's fonts (gates/lib.js's
// #480 note measures the app's stack and bare sans-serif 53.84px apart on one line).
//
// HOW EACH ONE WAS SHOWN ABLE TO FAIL, which is the part this project insists on [CLAUDE.md, #385].
//   D3 reddens on main: measured on main's own bundle f47aa0197967, 209 of 209 removed-phase frames at 320x540
//      and 210 of 210 at 375x568 sit at 192.00 against a clean 236.39 / 254.88 - the latch, every frame of it.
//   D1 does NOT redden on main, because main never overshoots: it only gets stuck. So it is controlled against a
//      BUNDLE BUILT TO FAIL IT, and the recipe is stated here rather than cited, because a citation to a file
//      this repository does not carry is the STALE-ROSTER red that gates/audit/cited-not-run.sh exists to find.
//      THE CONTROL, reproducible in one edit: in chess.jsx's #522 refit, replace the converging branch's
//      `setBoardTrim(...)`/`setFitPass(...)` pair with `setFitBump(b=>b+1)` and return - i.e. reset the trim on a
//      content change and let the rAF loop re-settle, which is exactly what this job's own outcome.whatIsLeft
//      proposed. That bundle recovers the latch AND paints the full-size board on the way, so D4 and D6 go red
//      while D8 and D9 stay green. #522's close-out records the md5 it measured. A check that has never seen its
//      defect proves nothing, and an uncontrolled assertion in this file would be the thing its header warns of.
//   AND D1 ALREADY CAUGHT SOMETHING NOBODY HAD FILED: on main, at 375x568, the CLEAN arm paints one frame at
//      270.88 when the settled practice board is 254.88 - a one-frame board jump on the ordinary lesson path,
//      with no injection at all, against the project's first rule that the board must never jump. #522's
//      pre-paint refit removes it (0 of 98 frames), which is why this assertion covers the clean arm too.
const DCELLS=[
  {n:'320x540', g:{w:320,h:540,safe:''}, px:88},
  {n:'375x568', g:L.GEOS.short375,       px:88},
];

// the painted board, measured exactly as gates/lib.js board() does: the widest div whose own
// gridTemplateColumns is a repeat(8, ...). A bad selector is a reading, not a measurement [CLAUDE.md].
const SAMPLER=()=>{
  window.__ct522=[];window.__ct522stop=false;window.__ct522phase='demo';
  const bwid=()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best)best=r.width;}return best;};
  const tick=()=>{if(window.__ct522stop)return;const w=bwid();
    if(w!=null)window.__ct522.push([window.__ct522phase,Math.round(w*100)/100]);requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
};
const dphase=(b,p)=>b.page.evaluate((x)=>{window.__ct522phase=x;},p);

const framesArmInner=async(geo,px)=>{
  const b=await L.launch({geo});
  await b.open();
  await D.states['endgame-demo-end'](b);
  await b.settle(900);
  const demo=await bw(b);
  await b.page.evaluate(SAMPLER);
  await b.settle(120);
  let injRect=null;
  if(px){
    await dphase(b,'injected');
    injRect=await b.page.evaluate((n)=>{const r=document.getElementById('root');
      const inflow=[...r.children].filter(c=>{const cs=getComputedStyle(c);
        return cs.position!=='fixed'&&cs.position!=='absolute'&&c.getBoundingClientRect().height>0;});
      const host=inflow.length===1?inflow[0]:r;
      const d=document.createElement('div');d.id='ct510inj';
      d.style.cssText='height:'+n+'px;flex:0 0 '+n+'px;width:100%';host.appendChild(d);
      const q=d.getBoundingClientRect(),cs=getComputedStyle(d);
      return {h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'};},px);
    await b.settle(700);
  }
  await dphase(b,'practice');
  const clicked=await toPractice(b);
  await b.settle(1600);
  const practiceSettled=await bw(b);
  await dphase(b,'removed');
  if(px)await b.page.evaluate(()=>{const e=document.getElementById('ct510inj');if(e)e.remove();});
  await b.settle(1500);
  await b.page.waitForTimeout(2000);
  const frames=await b.page.evaluate(()=>{window.__ct522stop=true;return window.__ct522;});
  const final=await bw(b), practice=await inPractice(b), errs=b.errs.length;
  await b.close();
  return {demo,practiceSettled,final,frames,clicked,practice,injRect,errs};
};
// #393: a harness throw in one arm must go red on its OWN assertion and let the rest of the file run.
const framesArm=async(geo,px)=>{
  try{ return await framesArmInner(geo,px); }
  catch(e){ return {demo:null,practiceSettled:null,final:null,frames:[],clicked:false,practice:false,injRect:null,errs:-1,threw:String((e&&e.message)||e)}; }
};
const byPhase=(fr,p)=>fr.filter(f=>f[0]===p).map(f=>f[1]);
const uniqW=(a)=>[...new Set(a)].sort((x,y)=>x-y);

const blockD=(n,px,clean,inj)=>{
  L.say(!clean.threw&&!inj.threw,'TC-R64 D0 '+n+' neither per-frame arm threw'+(clean.threw||inj.threw?' - '+(clean.threw||inj.threw):''),{clean:clean.threw||null,injected:inj.threw||null});
  L.say(clean.practice===true&&inj.practice===true,'TC-R64 D1 '+n+' PRACTICE WAS REACHED in both per-frame arms - without this both arms sample the DEMO board and every frame assertion below passes on it [antagonist B\'s finding on block A]',{clean:clean.practice,injected:inj.practice});
  // THE DENOMINATORS, EACH IN ITS OWN L.say [prompts/common R18's non-empty-collection rule]. every() and a
  // negated test() are both TRUE over nothing, so an empty frame list would make D4..D7 report PASS loudest
  // exactly when the sampler had stopped working. A conjunct would not say WHICH list was empty.
  const cP=byPhase(clean.frames,'practice'), cR=byPhase(clean.frames,'removed');
  const iP=byPhase(inj.frames,'practice'),   iR=byPhase(inj.frames,'removed');
  L.say(cP.length>20&&cR.length>20,'TC-R64 D2 '+n+' the CLEAN arm actually sampled frames in both asserted phases - the denominator for D4 and D5',{practiceFrames:cP.length,removedFrames:cR.length});
  L.say(iP.length>20&&iR.length>20,'TC-R64 D3 '+n+' the INJECTED arm actually sampled frames in both asserted phases - the denominator for D6 and D7',{practiceFrames:iP.length,removedFrames:iR.length});
  L.say(!!inj.injRect&&inj.injRect.inFlow===true&&Math.abs(inj.injRect.h-px)<1,'TC-R64 D3b '+n+' THE CONTROL REALLY WAS APPLIED in the per-frame arm: the '+px+'px transient sat IN THE FLOW with its full height. A fact about the injection, not about the app, so no correct bundle can redden it',{measured:inj.injRect,px});
  // D4..D7 NO OVERSHOOT, per arm per phase, against that ARM's OWN settled board. This is the blink.
  const over=(ws,ref)=>(typeof ref==='number'?ws.filter(w=>w>ref+0.5):[]);
  const o1=over(cP,clean.practiceSettled), o2=over(cR,clean.final), o3=over(iP,inj.practiceSettled), o4=over(iR,inj.final);
  L.say(typeof clean.practiceSettled==='number'&&o1.length===0,'TC-R64 D4 '+n+' NO WRONG-SIZE BOARD IS PAINTED on the ORDINARY lesson path: no practice-phase frame of the clean arm is wider than its own settled '+clean.practiceSettled+'. On main at 375x568 this is RED - one frame paints 270.88 against a settled 254.88, a one-frame board jump with no injection at all',{settled:clean.practiceSettled,frames:cP.length,wider:uniqW(o1)});
  L.say(typeof clean.final==='number'&&o2.length===0,'TC-R64 D5 '+n+' no removed-phase frame of the clean arm is wider than its own settled '+clean.final,{settled:clean.final,frames:cR.length,wider:uniqW(o2)});
  L.say(typeof inj.practiceSettled==='number'&&o3.length===0,'TC-R64 D6 '+n+' no practice-phase frame of the injected arm is wider than its own settled '+inj.practiceSettled+' - a re-fit that resets the trim and re-settles in the rAF loop paints the full-size board here, which is the blink',{settled:inj.practiceSettled,frames:iP.length,wider:uniqW(o3)});
  L.say(typeof inj.final==='number'&&o4.length===0,'TC-R64 D7 '+n+' no removed-phase frame of the injected arm is wider than its own settled '+inj.final,{settled:inj.final,frames:iR.length,wider:uniqW(o4)});
  // D8/D9 THE LATCH AND THE OSCILLATION, per frame, in the phase where the two arms are in the same state.
  const good=(w)=>typeof clean.final==='number'&&Math.abs(w-clean.final)<=0.5;
  const firstGood=iR.findIndex(good);
  L.say(firstGood>=0,'TC-R64 D8 '+n+' THE BOARD COMES BACK WITHIN THE OBSERVED WINDOW: some removed-phase frame of the injected arm reaches the clean arm\'s settled '+clean.final+'. On main this is RED at both short cells - every one of 209 / 210 removed-phase frames sits at 192.00 and the board never returns',{cleanFinal:clean.final,injectedFinal:inj.final,framesBeforeRecovery:firstGood,removedFrames:iR.length,widths:uniqW(iR)});
  L.say(firstGood>=0&&iR.slice(firstGood).every(good),'TC-R64 D9 '+n+' AND IT STAYS BACK: once the board reaches the clean size it is never painted at another size again, so the wrong-size frames are a PREFIX and not a wander. Threshold-free on purpose: a recovery cannot precede the removal that causes it, so some wrong frames are owed; an oscillation is not',{firstGoodFrame:firstGood,afterThat:iR.slice(firstGood<0?0:firstGood).length,distinctAfter:uniqW(iR.slice(firstGood<0?0:firstGood))});
  L.say(clean.errs===0,'TC-R64 D10 '+n+' zero console errors, clean per-frame arm',{errs:clean.errs});
  L.say(inj.errs===0,'TC-R64 D11 '+n+' zero console errors, injected per-frame arm - asserted separately, because a conjunct over both arms cannot say which one errored',{errs:inj.errs});
  L.note(n+' per-frame widths  clean practice='+JSON.stringify(uniqW(cP))+' removed='+JSON.stringify(uniqW(cR))+'   injected practice='+JSON.stringify(uniqW(iP))+' removed='+JSON.stringify(uniqW(iR))+'   settled clean practice/final='+clean.practiceSettled+'/'+clean.final+'  injected practice/final='+inj.practiceSettled+'/'+inj.final);
};

L.run(async()=>{
  for(const c of CELLS){
    const clean=await arm(c.g,0);
    const small=await arm(c.g,c.small);
    pair(c.n,'A',clean,small,c.small,c.large===null);   // engages iff this is a short-phone cell (large===null)
    L.say(c.large===null?clean.board<c.g.w-1:clean.board>=c.g.w-1,'TC-R64 B0 '+c.n+' the clean board is '+(c.large===null?'HEIGHT':'WIDTH')+'-bound, which is this cell\'s regime and the reason its threshold is where it is: where WIDTH binds, a transient must exceed the width margin before the trim can move the board at all',{board:clean.board,vw:c.g.w});
    if(c.large!=null){
      const big=await arm(c.g,c.large);
      pair(c.n+' LARGE','C',clean,big,c.large,true);    // a large transient engages at every geometry
    }
  }
  // BLOCK D, #522: the per-frame check, at the two cells Kunal's bar names. Two further browser launches per
  // cell, which is why it is scoped to the two short cells rather than to all four: 320x540 and 375x568 are
  // where a small transient latches, and they are the two the bar asks for by name.
  for(const c of DCELLS){
    const cleanF=await framesArm(c.g,0);
    const injF=await framesArm(c.g,c.px);
    blockD(c.n,c.px,cleanF,injF);
  }
},'75-fit-loop-one-way-ratchet');
