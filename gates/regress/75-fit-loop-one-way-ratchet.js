// gates/regress/75-fit-loop-one-way-ratchet.js
// TC-R64 (US-R72) - THE PORTRAIT FIT LOOP IS A ONE-WAY RATCHET: it shrinks the board on a real overflow and
// can then never grow it back, so a board stays smaller for the rest of the visit.
//
// WHERE IT LIVES AND HOW IT GOT HERE. This file is in gates/regress/ and its manifest row reads `required`.
// It arrived by the route its own header prescribed: it was written into gates/pending/ at #510 with an
// `absent` manifest row naming the job, because the defect was LIVE ON main and this gate RED on main by
// design - L.run exits non-zero, so in regress/ it would have failed its section and blocked every push on a
// tree no build broke, the trade #508 declined on its own G5-occlusion finding - and it MOVED to regress/
// with the row flipped to `required` IN THE SAME COMMIT as the app fix, at #522 (the pre-paint refit of the
// lesson board, Kunal's refit-no-blink answer of 13 Oct). That is still the route gate 50 waits on, and the
// paragraph is kept as HISTORY rather than deleted, because the manifest row cites this header as the route
// it followed. IT IS NO LONGER AN INSTRUCTION: nothing here should be read as saying the file belongs in
// pending/ or is inert. [#544, item (18): lines 1 and 5-11 said the opposite of what the tree does from #522
// until now - the path line still read gates/pending/ and this paragraph was headed "WHY IT IS IN
// gates/pending/ ... SAID FIRST BECAUSE IT IS THE MOST IMPORTANT FACT ABOUT THIS FILE".]
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
// floor" (#424). 375x761 is R19's settled figure for the device, and 375x730 is the legacy lib.js
// GEOS.kunal730 entry - a deliberate wording change, because R19's own text says "USE 375 x 761. The figure
// 730 is wrong and should be corrected wherever it appears, including the GEOS entry labelled kunal730", so
// citing R19 as the authority FOR 730 cites it against itself. #507 removed that exact miscitation from gate
// 73 and this file's first draft reproduced it; both antagonists caught it.

// CONTROL-RECORD: 1888a7d 2026-10-29 total=121 red=20 scope=trial:745743860a42 how=the #522 refit's idle branch resets the trim and bumps the rAF loop (setFitBump) instead of converging before paint, so the full-size board is painted on entry and on removal; reddens D4 D6 D7 D9 at both short cells, A9 x2, C9 x2, and D6 D8 D9b D9 at both of Kunal's cells [#545 item (34)]
// CONTROL-RECORD: bd4ecb7 2026-11-07 total=224 red=4 scope=trial:92b3a14f2064 how=the fit loop's non-Play growth branch (else if(over<-24), #364) deleted and nothing else - the compact Review board stays shrunk after the transient, TC-R64-D16 THE REVIEW BOARD COMES BACK red at all four cells (208 vs 264 at 375x568 and 320x568, 299.03 vs 349.03 at 375x667, 255.03 vs 349.03 at 375x761); D15 and D17 stay green [#549 item (96)]
// CONTROL-RECORD: aba4af0 2026-11-07 total=236 red=2 scope=trial:358042b5d8c1 how=the aba4af0 bundle itself, whose fit-loop growth branch outside Play and the compact Review is not clamped at the width-cap trim, so a width-bound puzzle launch parks the trim at -480 - reddens TC-R64-D18 THE OVERFLOW AFTER A PUZZLE MOVE IS TAKEN OUT AT ONCE at both cells (10 of 90 frames at 375x730 peak 28px, 10 at 375x761 peak 17px) and nothing else [#549 run fix fixpz]
// CONTROL-RECORD: 56c3fc1 2026-11-06 total=152 red=6 scope=trial:b1e1d4a06f70 how=the #547 item (73) fix reverted (the fit wake's ResizeObserver reads es[0].contentRect again, data-fitwake hook kept); with 4px padding injected on the moves panel it wakes 1/2/1 times on fresh/lesson-to-lesson/play-to-lesson against 0 unpadded - reddens exactly the six TC-R64-D14 per-route lines at 320x540 and 375x568, while D12 stays green [#549 item (40)]
// CONTROL-RECORD: cc1262b 2026-11-06 total=152 red=6 scope=trial:1a505e703b1f how=#549 item (57)'s D5 control: a late idle re-fit 2.6s into practice (setBoardTrim(0) then setFitBump) paints the full-size board inside the removed phase of both arms; reddens D5 D7 D9 at 320x540 and 375x568, two runs of two [#549 item (57), block D control (iv)]
// CONTROL-RECORD: 92bb2c4 2026-11-06 total=182 red=5 scope=trial:5a6c918bebaf how=#549 run fix fixr3d: the pre-fix bundle (376ccde, 1029033 not applied), where the player bars and moves panel swallow the room a transient leaves; reddens only TC-R64-D15 THE PHONE-GAME BOARD COMES BACK at 320x540, 375x568, 320x568, 375x730 and 375x761
// CONTROL-RECORD: 68020d0 2026-11-06 total=206 red=4 scope=trial:c5d747d1576f how=#549 run fix fixr3e: the pre-fix bundle (1b6b89e, the Review half of _fitOver not applied), where the compact Review's board column and bars swallow the room a transient leaves; reddens only TC-R64-D16 THE REVIEW BOARD COMES BACK at 375x568, 320x568, 375x667 and 375x761 (fix da691d8d12e0: 206 PASS 0 FAIL)
// CONTROL-RECORD: 76b40e9 2026-11-06 total=218 red=2 scope=trial:1f1d1d2b4acc how=#549 run fix fixr5a (A1-R5): the run-head 46340d1 bundle, where Play's growth branch parks the trim at -480 on a width-bound phone - TC-R64-D17 THE SMALL OVERFLOW IS CORRECTED WITHIN THE WAKE red at 375x730 (13.03) and 375x761 (12.03), the only reds
// CONTROL-RECORD: 76b40e9 2026-11-06 total=218 red=7 scope=trial:125a75dde92f how=#549 run fix fixr5a, D15 re-control: the fix tree with 1029033's Play absorbed-slack term switched off - TC-R64-D15 THE PHONE-GAME BOARD COMES BACK red at all five cells and the two TC-R64-D17 recovery tails
// CONTROL-RECORD: bd4ecb7 2026-11-07 total=224 red=3 scope=trial:1e0c67e7dbd3 how=f462559's own bundle (the fit loop before fixr6b: growth claims all slack and no fresh-trim memory); reddens TC-R64-D15's recovery line at 320x540 (268 vs 276), 320x568 (296 vs 298) and 375x568-4ply (304 vs 296), 221 pass 3 fail [#549 run fix fixr6b, antagonist A round 6 A2-R6]
// CONTROL-RECORD: 64afd33 2026-11-12 total=236 red=4 scope=trial:b06b4a724838 how=#550 item (64): the tree before the eval bar moved above - D17's re-calibrated blocks (56, 86) reach no overflow there, so both state-reached and both corrected lines red
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
// THE LABELS IN THIS BLOCK ARE THE FILE'S OWN ASSERTION IDS AND THEY USED TO BE WRONG [#544, item (18)].
// This paragraph called the no-overshoot property "D1" and the no-latch property "D3". The real D1 is
// "PRACTICE WAS REACHED" and the real D3 is the injected arm's frame-count denominator; the no-overshoot
// property is D4..D7 and the latch pair is D8..D9. So anyone auditing "does D1 redden on main?" read an
// unrelated precondition about the practice tap and could conclude the overshoot half had never been shown
// able to fail. The ids below are now this file's own.
//   D8 and D9 redden on main: measured on main's own bundle f47aa0197967, 209 of 209 removed-phase frames at
//      320x540 and 210 of 210 at 375x568 sit at 192.00 against a clean 236.39 / 254.88 - the latch, every
//      frame of it. (This is the property this paragraph used to call D3.)
//   D4 AND D5 ARE CONTROLLED BY MAIN AT BOTH CELLS; D6 AND D7 ARE UNCONTROLLED. That sentence replaces
//      "D1 does NOT redden on main, because main never overshoots", which was the FALSE one of two published
//      statements that disagreed in this same header - the next paragraph and the D4 assertion string itself
//      both said main paints a wider frame at 375x568. #522's antagonist B then measured main painting THREE
//      wider frames at 320x540 on EVERY lesson entry (320.00 then 260.39 against a settled 236.39) plus two
//      more returning from landscape, and one of 97 at 375x568. #522's own commit message repeated the false
//      version and withdrew it in its close-out. THE SPLIT MATTERS AND THE FIRST DRAFT OF THIS CORRECTION
//      OVERSTATED IT, caught by that run's antagonist A in the cross-read: every overshoot either antagonist
//      measured is on the CLEAN entry path, and the clean path is what D4 and D5 assert over. D6 and D7
//      assert over the INJECTED arm and NOTHING HAS SHOWN EITHER ABLE TO FAIL - they rest on the recipe
//      below and on a close-out md5 that is not in this tree. A correction that fixed a false sentence by
//      overclaiming in the other direction would leave the next reader believing four assertions are
//      controlled when two are.
//   D6 AND D7 are therefore controlled only against a
//      BUNDLE BUILT TO FAIL THEM, and the recipe is stated here rather than cited, because a citation to a file
//      this repository does not carry is the STALE-ROSTER red that gates/audit/cited-not-run.sh exists to find.
//      THE CONTROL, reproducible in one edit: in chess.jsx's #522 refit, replace the converging branch's
//      `setBoardTrim(...)`/`setFitPass(...)` pair with `setFitBump(b=>b+1)` and return - i.e. reset the trim on a
//      content change and let the rAF loop re-settle, which is exactly what this job's own outcome.whatIsLeft
//      proposed. That bundle recovers the latch AND paints the full-size board on the way, so D4 and D6 go red
//      while D8 and D9 stay green. #522's close-out records the md5 it measured. A check that has never seen its
//      defect proves nothing, and an uncontrolled assertion in this file would be the thing its header warns of.
//      [#528, MEASURED: over #527's tree the recipe's bundle (md5 2a5556c8f281 in the orchestrator's scratch
//      build) reddens D4, D8 and D9 at both cells, plus A9 at 375x568 and C9 at 375x730 and 375x761, 9 FAIL
//      of 90, while D6 PASSES; the same 9 under this file before and after #528's label fix. So what this
//      recipe controls today is D4, D8 and D9, not D6; the sentence above is #522's reading and is kept.
//      #528's P1 is on main, verified here at #544 by git rather than from its own note: commit
//      6a2fc6cded2b2695aea78e461d5d10ffa8577c48 is an ancestor of origin/main.
//      THE BRACKET USED TO SIT MID-SENTENCE, between "its" and "defect" in "A check that has never seen its
//      defect proves nothing", which #528's own appended note asked the next run to move. Moved, #544.]
//   WHICH CONTROL REDDENS WHICH BLOCK-D ASSERTION, DECLARED PER CONTROL AND MEASURED [#545, item (34);
//      jobs/block-ds-only-negative-control-reddens-d4-d8-and-d9-so-d5-d6-and-d7-are-uncontrolled-2026-10-21]. The
//      comment above recorded what the one recipe covers and never what it does not, which is how three assertions
//      sat uncontrolled in a required gate. Every line here is a run with its command, not a reading of the code.
//      (i) #528's recipe bundle 2a5556c8f281 (orchestrator scratch build, not in this tree): D4, D8, D9 at both
//          short cells; D6 PASSES. Recorded above and not re-run here.
//      (ii) #545's reading of the same recipe, bundle 745743860a42: in chess.jsx's idle branch of the pre-paint
//          refit, KEEP `if(boardTrimRef.current!==0)setBoardTrim(0);`, replace `fitRefitRef.current=1;` plus
//          `setFitPass(p=>p+1);` with `setFitBump(b=>b+1);`, and return. The trim resets and the rAF loop
//          re-settles, so the full-size board is PAINTED. Driven over block D alone at 320x540 and 375x568, 88px,
//          TWELVE runs, three at a time (under load): 12 of 12 identical, 21 pass / 8 fail, red = D4, D6, D7, D9
//          at both cells. D6's offending frame is practice frame 0 at the full viewport width (320 at 320x540,
//          358.88 at 375x568) against a settled 192 - the blink D6's own text describes. So D6 IS ABLE TO FAIL, and
//          the by-construction claim antagonist A first made (reference read after settle, so no transient
//          visible) is refuted by measurement: the reference is 192 and frame 0 is wider. D7 reddens on removal
//          (252.39 and 320 against 228.39; 358.88 against 254.88). D8 PASSES on this bundle, because it recovers.
//          THE WHOLE GATE on that bundle (all four D cells and blocks A to C): 101 pass / 20 fail of 121 - the eight above,
//          plus A9 at 320x540 and 375x568, C9 at 375x730 and 375x761 LARGE, and D6, D8, D9b and D9 at each of 375x730
//          and 375x761. Recorded as this file's CONTROL-RECORD.
//      (iii) main's own bundle 049b41dfb6f1 at 375x761 with an 88px transient - the cell the #544 note below
//          EXCLUDES from DCELLS - three runs, 3 of 3 identical, 11 pass / 4 fail, red = D6, D8, D9, D9b. D6's
//          practice frames oscillate 374.23 / 358.23 against a settled 358.23. A natural control on main, recorded
//          and not added as a cell, for the reason #544 gives.
//      (iv) #549's control for D5, bundle 1a505e703b1f [#549, item (57); same job]: D5 USED TO BE NAMED HERE AS
//          UNCONTROLLED - none of (i), (ii) or (iii) reddens it. The defect D5 exists for is a wrong-size board painted
//          on the ORDINARY path after the board has settled, with nothing injected. THE RECIPE, one edit with CT_OUT:
//          in chess.jsx, immediately above the pre-paint refit's `useLayoutEffect` (search `const _lessonFit=`), add
//          `useEffect(()=>{if(!(mode==='learn'&&learnPhase==='practice'))return;const t=setTimeout(()=>{setBoardTrim(0);setFitBump(b=>b+1);},2600);return()=>clearTimeout(t);},[mode,learnPhase]);`
//          - a late idle re-fit 2.6s into practice that resets the trim and lets the rAF loop re-settle, so it lands
//          inside the removed phase (labelled at click + 1600ms) of BOTH arms. Whole gate on HEAD b12fd21, two runs
//          (finished 11:03Z and 11:10Z, 6 Nov 2026): 146 pass / 6 fail of 152 both times, red = D5, D7 and D9 at 320x540 and
//          375x568 and nothing else. D5's offending frame is the full-size board, 320 against a settled 236.39 and
//          358.88 against 270.88. D5 stays GREEN at 375x730, 375x761 and 375x761 104, because the board is width-bound
//          there and the full-size board IS the settled one (375.03), so no wider frame can exist to catch - a limit
//          of the geometry, not of the assertion. So no block-D detector is now uncontrolled. The denominators D2, D3,
//          D9b and the error lines D10 and D11 are preconditions, not detectors, and are not listed as controlled.
//   AND D4 ALREADY CAUGHT SOMETHING NOBODY HAD FILED (this paragraph called it D1): on main, at 375x568, the CLEAN arm paints one frame at
//      270.88 when the settled practice board is 254.88 - a one-frame board jump on the ordinary lesson path,
//      with no injection at all, against the project's first rule that the board must never jump. #522's
//      pre-paint refit removes it (0 of 98 frames), which is why this assertion covers the clean arm too.
//      [#528: 270.88 is the DEMO board's own width at 375x568, and a frame of it at the first practice index is
//      what the label race described at the sampler produces; whether #522's observation was that race was not
//      measured, so this note is left standing and the clean arm stays covered.]
// #544, item (18), fixAddendum (5): KUNAL'S OWN TWO GEOMETRIES ARE NOW IN THIS BLOCK, AND THE ONE CELL THAT IS
// NOT IS NAMED WITH ITS NUMBERS RATHER THAN LEFT AS A SILENCE.
// THE GAP #522's ANTAGONIST A FOUND: this list drove 320x540 and 375x568 and NEITHER of the two candidates for
// his actual phone, so the project's only per-frame fit-loop gate covered neither the geometry the player uses
// nor the geometry the residual is about. The job asked for both cells plus a measured runtime decision.
// THE RUNTIME, MEASURED RATHER THAN ESTIMATED, two full runs of this gate on main's own bundle 049b41dfb6f1
// back to back in one container: two D cells 160s at 92 assertions, FOUR D cells 206s at 120. So the two cells
// cost 46 SECONDS and 28 assertions - about 29% of this gate and well under one per cent of a 110-minute suite.
// Affordable, so they are in; the px per cell is that geometry's own measured threshold from this file's
// manifest row (375x730 loses 29.20px at 88px, 375x761 loses 32.80px at 120px), not a shared constant.
// WHAT IS EXCLUDED AND WHY, AND IT IS A RED AND NOT A COST. 375x761 AT AN 88px TRANSIENT IS A LIVE DEFECT ON
// main AND IS DELIBERATELY NOT A CELL HERE. Driven at #544 as its own single-cell run: 74 pass / 4 fail, with
// D6, D8, D9 and D9b all RED - the clean arm settles at 375.03, the injected arm settles at 358.23 and NEVER
// returns across all 211 removed-phase frames. That confirms, with numbers, the one line #522's antagonist A
// left as a claim: 375x761 is the cell where #522's fix does not recover the 88px transient. ADDING IT WOULD
// REDDEN A REQUIRED GATE ON A TREE NO BUILD BROKE, which is the exact trade #508 declined and the reason this
// whole file sat in gates/pending/ until its app fix landed - so the residual stays with its owning job,
// jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29 (cause fingerprints/94a2c0fe0b10aab2,
// chess.jsx|boardTrim), and this comment is where a reader finds it instead of finding nothing.
const DCELLS=[
  {n:'320x540', g:{w:320,h:540,safe:''}, px:88},
  {n:'375x568', g:L.GEOS.short375,       px:88},
  {n:'375x730', g:L.GEOS.kunal730,       px:88},
  {n:'375x761', g:L.GEOS.kunal761,       px:120},
  // #548, jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29: THE EXCLUDED CELL, NOW IN, AT THE SIZE THAT
  // REDDENS IT IN THIS CONTAINER. The #544 note above excluded 375x761 at 88px because main was red there. Re-driven
  // at #548 on main's own bundle c7f6a1228e43 (#547), the 88px transient NO LONGER LATCHES in this container (the
  // absorber's slack is container-dependent, #480's text-metrics note) - 375.03 throughout - while 104px reproduces
  // the residual exactly: injected practice 374.23 -> 358.23 and 358.23 for every removed-phase frame, two runs of
  // two. THE CAUSE, measured with an instrumented _fitOver rather than inferred: the board is WIDTH-bound here, so
  // the first ~111px of trim move nothing; an overflow of 6.03 takes 16px steps and the pre-paint refit's eight-pass
  // cap stopped at trim 112, inside the dead zone; the rAF loop finished the shrink, the moves-panel observer read
  // that as a flow change and restarted the refit, four times, which spent the wake budget, so the removal could not
  // wake it. #548 raised the cap to forty (chess.jsx, search CAPPED AT FORTY PASSES). The fixed bundle sweeps clean
  // at 64, 80, 96, 100, 104, 108, 112, 120 and 140px here. `engage` makes the cell prove the transient bit: a cell
  // whose transient no longer costs board would otherwise go green on a bundle that never exercised the latch.
  {n:'375x761 104', g:L.GEOS.kunal761,   px:104, engage:true},
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
// THE LABEL AND THE ACTION IT NAMES SHARE ONE TASK [#528, jobs/gate-75s-d4-reddens-under-suite-load-on-mains-own-bundle-so-any-push-can-be-reddened-by-a-commit-that-cannot-have-caused-it-2026-10-21].
// This was a helper that set window.__ct522phase in one page.evaluate, followed by the click (or the injection,
// or the removal) in the next: two CDP round trips, and under suite load a rAF tick fell between them, so the
// board still on screen from the PREVIOUS phase was sampled under the NEW label. #527's red was one practice
// frame of 236.39, the DEMO board's own width at 320x540, which is exactly what this race samples: a frame from
// before the click, read as a board jump. MEASURED in a scratch clone of #527's tree over main's own bundle
// ec31de9fe6c5, three busy loops on two CPUs: the two-step order put a wider frame in 7 of 20 runs at 320x540
// and 3 of 10 at 375x568, every one at the first practice index (one run, the first three) and equal to that
// geometry's DEMO board, 236.39 and 270.88; with the label set inside the same evaluate as the click, under
// heavier load, 0 of 20 and 0 of 10.
// Idle, both orders read 0. So each label below is written by the evaluate that performs its action, before
// the action, so no frame from BEFORE THE CLICK can be sampled under the practice label. A D4 red after #528
// is a real board jump or a cause not found here.
// [#544, item (18): that clause used to read "and no frame can be sampled under a label its board does not
// belong to" - a general claim about frames and labels, which #528's own patches document contradicted in
// terms ("a red of D4 ... is a real board jump or a cause not found here"). #528's antagonist A proposed this
// exact wording and gave the reason I accept: a 236.39 frame at practice index 0 is EQUALLY the signature of
// a first post-click repaint at the carried-over demo-derived width before the rAF loop re-trims, and index 0
// is MORE natural for that mechanism than for a CDP-gap frame, which could land anywhere in the phase. What
// discriminates is the LOAD-DEPENDENCE measured two lines above - 14 of 40 loaded two-step against 0 of 70
// loaded one-task, 0 idle in both orders - because a post-click repaint would not care about load.]

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
    injRect=await b.page.evaluate((n)=>{window.__ct522phase='injected';const r=document.getElementById('root');   // one task [#528]
      const inflow=[...r.children].filter(c=>{const cs=getComputedStyle(c);
        return cs.position!=='fixed'&&cs.position!=='absolute'&&c.getBoundingClientRect().height>0;});
      const host=inflow.length===1?inflow[0]:r;
      const d=document.createElement('div');d.id='ct510inj';
      d.style.cssText='height:'+n+'px;flex:0 0 '+n+'px;width:100%';host.appendChild(d);
      const q=d.getBoundingClientRect(),cs=getComputedStyle(d);
      return {h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'};},px);
    await b.settle(700);
  }
  const clicked=await b.page.evaluate(()=>{   // the label and the click in one task [#528]
    const t=[...document.querySelectorAll('button')].find(x=>/Now I'll try it/.test(x.innerText||''));
    window.__ct522phase='practice'; if(!t)return false; t.click(); return true;});
  await b.settle(1600);
  const practiceSettled=await bw(b);
  await b.page.evaluate((x)=>{window.__ct522phase='removed';   // the label and the removal in one task [#528]
    if(x){const e=document.getElementById('ct510inj');if(e)e.remove();}},px);
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
  L.say(typeof clean.practiceSettled==='number'&&o1.length===0,'TC-R64 D4 '+n+' NO WRONG-SIZE BOARD IS PAINTED on the ORDINARY lesson path: no practice-phase frame of the clean arm is wider than its own settled '+clean.practiceSettled+'. #522 recorded a 270.88 frame here at 375x568 on main, which is that geometry\'s DEMO board width; since #528 the label and the click share one task, so a frame from before the click can no longer count as practice',{settled:clean.practiceSettled,frames:cP.length,wider:uniqW(o1)});
  L.say(typeof clean.final==='number'&&o2.length===0,'TC-R64 D5 '+n+' no removed-phase frame of the clean arm is wider than its own settled '+clean.final,{settled:clean.final,frames:cR.length,wider:uniqW(o2)});
  L.say(typeof inj.practiceSettled==='number'&&o3.length===0,'TC-R64 D6 '+n+' no practice-phase frame of the injected arm is wider than its own settled '+inj.practiceSettled+' - a re-fit that resets the trim and re-settles in the rAF loop paints the full-size board here, which is the blink',{settled:inj.practiceSettled,frames:iP.length,wider:uniqW(o3)});
  L.say(typeof inj.final==='number'&&o4.length===0,'TC-R64 D7 '+n+' no removed-phase frame of the injected arm is wider than its own settled '+inj.final,{settled:inj.final,frames:iR.length,wider:uniqW(o4)});
  // D8/D9 THE LATCH AND THE OSCILLATION, per frame, in the phase where the two arms are in the same state.
  const good=(w)=>typeof clean.final==='number'&&Math.abs(w-clean.final)<=0.5;
  const firstGood=iR.findIndex(good);
  L.say(firstGood>=0,'TC-R64 D8 '+n+' THE BOARD COMES BACK WITHIN THE OBSERVED WINDOW: some removed-phase frame of the injected arm reaches the clean arm\'s settled '+clean.final+'. On main this is RED at both short cells - every one of 209 / 210 removed-phase frames sits at 192.00 and the board never returns',{cleanFinal:clean.final,injectedFinal:inj.final,framesBeforeRecovery:firstGood,removedFrames:iR.length,widths:uniqW(iR)});
  // D9b IS D9's DENOMINATOR AND IT IS ITS OWN L.say, NOT A CONJUNCT OF D9 [#544, item (18);
  // jobs/522-gate-75-block-d-hygiene-...-2026-10-14, item 4]. D9's persistence half is
  // `iR.slice(firstGood).every(good)`, and `every()` is TRUE over nothing: D3 above requires only that iR has
  // more than 20 frames IN TOTAL, and nothing required frames AFTER firstGood. If recovery landed on the last
  // sampled frame the slice would have length 1 and "it stays back" would be asserted over a single element -
  // the empty-denominator class this file's own header cites R18 about. LATENT RATHER THAN LIVE on the measured
  // bundle (firstGood read 1 and 2 of 210 frames), which is why it is a P2 and why it is fixed by ADDING a
  // check rather than by changing D9's condition: D9 still says what it said. A CONJUNCT WOULD HAVE BEEN THE
  // SAME TRAP ONE LEVEL UP, because its halves could not fail independently and the pair would read as two
  // checks while being one. The 20 is D2/D3's own figure, so the three denominators in this block agree.
  // WHEN D8 IS RED THIS IS RED TOO AND THAT IS DELIBERATE: there is then no window at all, and a PASS here
  // would be the credit an absent denominator must never get. The message says which of the two it is.
  L.say(firstGood>=0&&iR.length-firstGood>20,'TC-R64 D9b '+n+' THE PERSISTENCE WINDOW IS NON-EMPTY: more than 20 removed-phase frames of the injected arm were sampled AFTER the first recovered one, so D9 below is asserted over a real window and not over a slice of length 1'+(firstGood<0?' - RED BECAUSE THE BOARD NEVER CAME BACK AT ALL, which is D8 and not this check':''),{firstGoodFrame:firstGood,removedFrames:iR.length,windowAfterRecovery:firstGood<0?0:iR.length-firstGood});
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
  // BLOCK D, #522: the per-frame check. Two further browser launches per cell. IT WAS SCOPED TO THE TWO SHORT
  // CELLS - 320x540 and 375x568, where a small transient latches and the two the bar asks for by name - and
  // since #544 it also drives Kunal's own two geometries at their own thresholds, for 46 measured seconds.
  // See the comment above DCELLS for the runtime figures and for the one cell that is excluded and why.
  for(const c of DCELLS){
    const cleanF=await framesArm(c.g,0);
    const injF=await framesArm(c.g,c.px);
    if(c.engage)L.say(typeof injF.practiceSettled==='number'&&typeof cleanF.practiceSettled==='number'&&injF.practiceSettled<cleanF.practiceSettled-0.5,'TC-R64-D13 '+c.n+' THE TRANSIENT ENGAGED: with the '+c.px+'px transient in the flow the practice board settled SMALLER than the clean arm\'s, so D6 to D9 below are asserted over a board that really lost width and not over a no-op [#548]',{clean:cleanF.practiceSettled,injected:injF.practiceSettled});
    blockD(c.n,c.px,cleanF,injF);
  }
  // TC-R64-D12 [#547 item (73); jobs/522-the-fit-wake-compares-two-different-boxes-and-keeps-its-refs-across-screens-2026-10-14].
  // A LESSON REACHED FROM ANOTHER SCREEN SETTLES WHERE A FRESH ENTRY DOES. The fit wake's refs (the panel height the last
  // refit left, the epoch's wake budget) used to survive the observer re-attaching on another screen, so lesson-to-lesson and
  // play-to-lesson began their epoch with a height from a DIFFERENT screen. Harmless while the refit is idempotent; this pins
  // the property the reset protects. Two routes x 320x540 and 375x568, each against a fresh entry to the SAME lesson.
  {
    const P=require('../drive/play.js');
    const lessonBoard=async(b)=>{await D.startDemoPaused(b);await b.settle(1200);const m=await b.metrics();return m.board?Math.round(m.board.w*10)/10:null;};
    // TC-R64-D14's instrument: the moves panel's data-fitwake attribute is the `fitWake` counter itself (#549 item (40)),
    // i.e. how many times the ResizeObserver woke the refit since the lesson screen mounted. null when the hook is absent.
    const wakeOf=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');const v=e?e.getAttribute('data-fitwake'):null;return v==null?null:+v;});
    const padOf=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');return e?parseFloat(getComputedStyle(e).paddingTop):null;});
    const PADPX=4;
    for(const [n,g] of [['320x540',{w:320,h:540,safe:''}],['375x568',L.GEOS.short375]]){
      const W={},WK={},WKP={},PADM={};
      for(const [route,pad] of [['fresh',0],['lesson-to-lesson',0],['play-to-lesson',0],['fresh',PADPX],['lesson-to-lesson',PADPX],['play-to-lesson',PADPX]]){
        const b=await L.launch({geo:g,name:'d12-'+n+'-'+route+(pad?'-pad':'')});await b.open();let ok=true;
        if(pad)await b.page.addStyleTag({content:'[data-ct="moves-panel"]{padding:'+pad+'px !important}'});
        try{
          if(route==='lesson-to-lesson'){await D.openLesson(b,'Openings',0);await D.startDemoPaused(b);await b.settle(600);await D.tapBtn(b,/^Close lesson$/,500).catch(()=>{});
            const lab=await b.page.evaluate(()=>{const e=document.querySelector('[aria-label="Close lesson"]');return !!e;});if(lab){const el=b.page.locator('[aria-label="Close lesson"]').first();await el.click();await b.settle(500);}}
          if(route==='play-to-lesson'){await P.states['pp-m0'](b);await b.move('e2','e4',400);await b.settle(400);}
          await D.openLesson(b,'Openings',1);const bd=await lessonBoard(b);
          if(pad){WKP[route]=await wakeOf(b);PADM[route]=await padOf(b);}else{W[route]=bd;WK[route]=await wakeOf(b);}
        }catch(e){ok=false;if(pad){WKP[route]=null;PADM[route]=null;}else W[route]=null;}
        await b.close();
      }
      L.say(W.fresh!=null&&W['lesson-to-lesson']!=null&&W['play-to-lesson']!=null,'TC-R64-D12 '+n+' DENOMINATOR all three routes reached the second Openings lesson and measured its settled board',W);
      L.say(W.fresh!=null&&W['lesson-to-lesson']!=null&&Math.abs(W['lesson-to-lesson']-W.fresh)<0.6,'TC-R64-D12 '+n+' lesson-to-lesson settles the board where a fresh entry does ('+W['lesson-to-lesson']+' vs '+W.fresh+')',W);
      L.say(W.fresh!=null&&W['play-to-lesson']!=null&&Math.abs(W['play-to-lesson']-W.fresh)<0.6,'TC-R64-D12 '+n+' play-to-lesson settles the board where a fresh entry does ('+W['play-to-lesson']+' vs '+W.fresh+')',W);
      // TC-R64-D14 [#549 item (40); jobs/522-the-fit-wake-compares-two-different-boxes-and-keeps-its-refs-across-screens-2026-10-14].
      // THE PADDING CONTROL D12 COULD NOT BE. D12 reads the board, and a wake that re-runs an idempotent refit leaves the
      // board where it was, so D12 is green on a bundle whose observer reads contentRect while the settle records the
      // border box. That defect costs RE-RENDERS, not pixels, so this reads the wake counter (data-fitwake) directly, with
      // 4px of padding injected on the moves panel - the one condition under which the two boxes differ (by 8px, past the
      // 2px threshold). ASSERTED AGAINST THE SAME ROUTE UNPADDED rather than against 0, so a legitimate wake (a flow change
      // React cannot see) is owed to both arms equally and only the padding's own wakes count. MEASURED at #549 on
      // e171a71bddbd: 0 wakes on every route at both cells, padded and unpadded; on the contentRect control b1e1d4a06f70
      // padded: 1 fresh, 2 lesson-to-lesson, 1 play-to-lesson, at both cells, and 0 unpadded.
      L.say(Object.keys(PADM).length===3&&Object.values(PADM).every(v=>v===PADPX),'TC-R64-D14 '+n+' THE CONTROL WAS APPLIED: the moves panel computed '+PADPX+'px padding on all three padded routes. A fact about the injection, not about the app',PADM);
      L.say(['fresh','lesson-to-lesson','play-to-lesson'].every(r=>typeof WK[r]==='number'&&typeof WKP[r]==='number'),'TC-R64-D14 '+n+' DENOMINATOR the wake counter (data-fitwake on the moves panel) was read on all three routes in both arms - a missing hook is red here, never a pass below',{unpadded:WK,padded:WKP});
      for(const r of ['fresh','lesson-to-lesson','play-to-lesson'])
        L.say(typeof WK[r]==='number'&&typeof WKP[r]==='number'&&WKP[r]===WK[r],'TC-R64-D14 '+n+' '+r+': '+PADPX+'px of padding on the moves panel adds NO fit wake ('+WKP[r]+' padded vs '+WK[r]+' unpadded) - the observer and the settle measure the same box',{route:r,padded:WKP[r],unpadded:WK[r]});
    }
  }
  // TC-R64-D15 [#549 run fix fixr3d, over 1029033 (fixr3c)]. A PHONE GAME'S BOARD COMES BACK AFTER A TRANSIENT, the PLAY
  // half of the class this file's header names as "measured-affected and uncovered". THE MECHANISM IS NOT THE LESSON'S: in a
  // phone game the two player bars (pbar-top/pbar-bottom, flex 1 1 0 over their minHeight) and the moves panel and its list
  // grow into whatever room the board leaves, so after ONE transient overflow trims the board they absorb the room that comes
  // back, _fitOver reads 0 for ever and the growth branch (over < -24) never fires. 1029033 makes _fitOver subtract that
  // swallowed slack in mode play. THE DRIVE: vs Computer at move 0, a PX-tall in-flow block prepended to #root's first child
  // while Moves is toggled (movesOpen is a fit-loop dependency), then the block removed and Moves toggled back. PX is a
  // property of the cell, not of its name: 60 where the board is height-bound, 180 at the two tall cells, where the board is
  // width-bound and 60 (and, on the fix, 120 at 375x761) never moves it, so the shrink assertion would have no state to stand
  // on. MEASURED at #549, pre-fix trial 5a6c918bebaf (376ccde) vs fix trial 8332d8e5c3a8: 375x568 296 -> 232 -> 232 vs
  // 296 -> 232 -> 296; 320x568 298 -> 232 -> 232 vs 298 -> 232 -> 296 (2px under fresh: the loop grows in 8px steps); 375x730
  // 353 -> 250 -> 250 vs 353 -> 250 -> 353; 375x761 353 -> 281 -> 281 vs 353 -> 289 -> 353.
  {
    const P=require('../drive/play.js');
    const PCELLS=[
      {n:'320x540', g:{w:320,h:540,safe:''}, px:60},
      {n:'375x568', g:L.GEOS.short375,       px:60},
      {n:'320x568', g:L.GEOS.se,             px:60},
      {n:'375x730', g:L.GEOS.kunal730,       px:180},
      {n:'375x761', g:L.GEOS.kunal761,       px:180},
      // A2-R6 [#549 run fix fixr6b]: the cell where a board fitted from BELOW came back one whole step LARGER than fresh. At move 0
      // with a 60px block the shrink happens to land on fresh's residue; at 4 plies with a 40px block it does not. MEASURED on
      // f462559's bundle 1e0c67e7dbd3: 296 -> 256 -> 304 (bars 34.5 -> 32.5, move list 39 -> 35); on the fix 296 -> 256 -> 296.
      {n:'375x568-4ply', g:L.GEOS.short375, px:40, st:'cpu-4ply'},
    ];
    const STEP=8,SAME=1;   // the fit loop moves in 8px steps, and a tolerance of one step admitted A2-R6 (304 vs 296); since fixr6b the board comes back to its fresh size exactly, so the recovery is asserted to under 1px
    const tapMoves=(b)=>b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Moves');if(!e)return false;e.click();return true;});
    for(const c of PCELLS){
      const R={};
      const b=await L.launch({geo:c.g,name:'d15-'+c.n,store:{ct_pool:'3'}});
      try{
        await b.open();await P.states[c.st||'cpu-m0'](b);await b.settle(c.st?800:500);
        R.fresh=await bw(b);
        R.injRect=await b.page.evaluate((px)=>{const r=document.getElementById('root');const d=document.createElement('div');d.id='ct-d15-kick';d.style.cssText='height:'+px+'px;flex:0 0 '+px+'px';r.firstElementChild.prepend(d);
          const q=d.getBoundingClientRect(),cs=getComputedStyle(d);return {h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'&&cs.display!=='none'};},c.px);
        R.tap1=await tapMoves(b);await b.settle(800);
        R.during=await bw(b);
        R.removed=await b.page.evaluate(()=>{const d=document.getElementById('ct-d15-kick');if(d)d.remove();return !document.getElementById('ct-d15-kick');});
        R.tap2=await tapMoves(b);await b.settle(1200);
        R.after=await bw(b);
      }catch(e){R.threw=String(e&&e.message||e).slice(0,200);}
      await b.close();
      L.say(!R.threw,'TC-R64-D15 '+c.n+' the play arm ran without throwing'+(R.threw?' - '+R.threw:''),R);
      L.say(typeof R.fresh==='number'&&R.fresh>40,'TC-R64-D15 '+c.n+' DENOMINATOR a fresh vs-Computer board is painted at '+(c.st==='cpu-4ply'?'4 plies':'move 0')+' ('+R.fresh+')',{fresh:R.fresh});
      L.say(!!R.injRect&&R.injRect.inFlow===true&&Math.abs(R.injRect.h-c.px)<1&&R.tap1===true,'TC-R64-D15 '+c.n+' THE CONTROL WAS APPLIED: the '+c.px+'px block sat in the flow at its full height while Moves was toggled',{injRect:R.injRect,tap1:R.tap1});
      L.say(typeof R.fresh==='number'&&typeof R.during==='number'&&R.during<R.fresh-STEP,'TC-R64-D15 '+c.n+' THE STATE WAS REACHED: with the '+c.px+'px block in the flow the fit loop shrank the board ('+R.fresh+' -> '+R.during+'), so the recovery below is asserted over a board that really lost width',{fresh:R.fresh,during:R.during});
      L.say(R.removed===true&&R.tap2===true,'TC-R64-D15 '+c.n+' the block was removed and Moves toggled back (the dependency change the recovery needs)',{removed:R.removed,tap2:R.tap2});
      L.say(typeof R.fresh==='number'&&typeof R.after==='number'&&Math.abs(R.after-R.fresh)<SAME,'TC-R64-D15 '+c.n+' THE PHONE-GAME BOARD COMES BACK TO ITS FRESH SIZE: after the block is gone the board is within '+SAME+'px of its fresh-launch width ('+R.after+' vs '+R.fresh+'), so one state has one board size whatever its history. A tolerance of the loop\'s '+STEP+'px step admitted A2-R6 (f462559: 304 against a fresh 296 at 375x568, and 268 against 276 at 320x540). Pre-fix the player bars and moves panel swallowed the room and it stayed at the shrunk size for good',{fresh:R.fresh,during:R.during,after:R.after});
    }
  }
  // TC-R64-D16 [#549 run fix fixr3e]. THE COMPACT REVIEW'S BOARD COMES BACK AFTER A TRANSIENT - the Review cell D15 named as
  // affected and uncovered. THE MECHANISM IS ONE LEVEL WIDER THAN PLAY'S: the board column (pbar-top's parent: bar, board row,
  // bar) is itself flex 1 1 auto over minHeight 0, so it fills the room the rows under it leave and _fitOver reads ~0 at ANY
  // board size - a positive trim was permanent. And the engine-row reservation (37f44ea) keys on the trimmed board, so once
  // trimmed it lapses and its 20px joins the swallow. THE DRIVE: Opera Game at ply 10 (gates/drive/review.js moves-ply10), a
  // PX-tall in-flow block prepended to #root's first child, one ply change (ply is a fit-loop dependency) to ply 11, the block
  // removed, back to ply 10. The board must come back to its fresh width; since the fix clamps Review's growth at trim 0 it
  // must also NOT come back LARGER, so the recovery line is an equality within the step on both sides. PX 60 where the board
  // is height-bound; 200 at 375x761, where it is width-bound and 60 never moves it. MEASURED at #549, pre-fix trial
  // c5d747d1576f (1b6b89e) vs fix trial da691d8d12e0: 375x568 264 -> 208 -> 208 vs 264 -> 240 -> 264; 320x568 the same;
  // 375x667 349 -> 299 -> 299 pre-fix.
  {
    const RV=require('../drive/review.js');
    const RCELLS=[
      {n:'375x568', g:L.GEOS.short375,       px:60},
      {n:'320x568', g:L.GEOS.se,             px:60},
      {n:'375x667', g:L.GEOS.w375h667,       px:60},
      {n:'375x761', g:L.GEOS.kunal761,       px:200},
    ];
    const STEP=8;
    for(const c of RCELLS){
      const R={};
      const b=await L.launch({geo:c.g,name:'d16-'+c.n,store:{ct_pool:'3'}});
      try{
        await b.open();await RV.states['moves-ply10'](b);await b.settle(900);
        R.fresh=await bw(b);
        R.injRect=await b.page.evaluate((px)=>{const r=document.getElementById('root');const d=document.createElement('div');d.id='ct-d16-kick';d.style.cssText='height:'+px+'px;flex:0 0 '+px+'px';r.firstElementChild.prepend(d);
          const q=d.getBoundingClientRect(),cs=getComputedStyle(d);return {h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'&&cs.display!=='none'};},c.px);
        await RV.goPly(b,11);await b.settle(900);
        R.during=await bw(b);
        R.removed=await b.page.evaluate(()=>{const d=document.getElementById('ct-d16-kick');if(d)d.remove();return !document.getElementById('ct-d16-kick');});
        await RV.goPly(b,10);await b.settle(1500);
        R.after=await bw(b);
      }catch(e){R.threw=String(e&&e.message||e).slice(0,200);}
      await b.close();
      L.say(!R.threw,'TC-R64-D16 '+c.n+' the review arm ran without throwing'+(R.threw?' - '+R.threw:''),R);
      L.say(typeof R.fresh==='number'&&R.fresh>40,'TC-R64-D16 '+c.n+' DENOMINATOR a fresh compact-Review board is painted at ply 10 ('+R.fresh+')',{fresh:R.fresh});
      L.say(!!R.injRect&&R.injRect.inFlow===true&&Math.abs(R.injRect.h-c.px)<1,'TC-R64-D16 '+c.n+' THE CONTROL WAS APPLIED: the '+c.px+'px block sat in the flow at its full height across the ply change',{injRect:R.injRect});
      L.say(typeof R.fresh==='number'&&typeof R.during==='number'&&R.during<R.fresh-STEP,'TC-R64-D16 '+c.n+' THE STATE WAS REACHED: with the '+c.px+'px block in the flow the fit loop shrank the Review board ('+R.fresh+' -> '+R.during+'), so the recovery below is asserted over a board that really lost width',{fresh:R.fresh,during:R.during});
      L.say(R.removed===true,'TC-R64-D16 '+c.n+' the block was removed before the ply change back',{removed:R.removed});
      L.say(typeof R.fresh==='number'&&typeof R.after==='number'&&Math.abs(R.after-R.fresh)<=STEP,'TC-R64-D16 '+c.n+' THE REVIEW BOARD COMES BACK: after the block is gone the board is within the loop\'s '+STEP+'px step of its fresh-launch width ('+R.after+' vs '+R.fresh+'), neither smaller nor larger. Pre-fix the board column and its bars swallowed the room and it stayed at the shrunk size for good',{fresh:R.fresh,during:R.during,after:R.after});
    }
  }
  // TC-R64-D17 [#549 run fix fixr5a, antagonist A round 5 A1-R5, over 1029033]. A SMALL OVERFLOW AT THE WIDTH CAP IS CORRECTED
  // WITHIN THE WAKE. D15 needs a block big enough to shrink the board at all; this cell is the other half - a phone game whose
  // board already sits at its WIDTH cap meets an overflow of 20px or less, and the loop must take it out before its 36-pass wake
  // ends. 1029033's absorbed-slack term made "over" read well under -24 at rest on those phones, so the growth branch parked the
  // trim at -480, where no trim moves SQ; the next small overflow then spent the whole wake climbing back out of that dead zone and
  // was never corrected. MEASURED (vs Computer at 4 plies, every frame for 90 frames after the Moves toggle): run head 46340d1
  // trial 1f1d1d2b4acc, 375x761 130px 353/12 for all 90 frames, 375x730 100px 353/13 for all 90; fix cf754436d9be, 353/12 x14 then
  // 337/0, and 353/13 x12 then 330/0 - what #548 does. PX is a property of the cell (it is what puts the overflow in the 1..20
  // band at that cell's height); the band itself is asserted as the state-reached line, so a layout change that moves it says so.
  {
    const P=require('../drive/play.js');
    const SCELLS=[
      // #550 item (64) move 1 RE-CALIBRATED: the eval bar sits above the board now and the board is 375 wide, so each cell has 44px less
      // slack (measured on trial 4beae0ee40d6: 100px gave a 57px overflow at 375x730, 130px gave 56 at 375x761). Was 100 and 130.
      {n:'375x730', g:L.GEOS.kunal730, px:56},
      {n:'375x761', g:L.GEOS.kunal761, px:86},
    ];
    const STEP=8,SAME=1,FRAMES=90,SMALL=20;
    for(const c of SCELLS){
      const R={};
      const b=await L.launch({geo:c.g,name:'d17-'+c.n,store:{ct_pool:'3'}});
      try{
        await b.open();await P.states['cpu-4ply'](b);await b.settle(800);
        R.fresh=await bw(b);
        Object.assign(R,await b.page.evaluate(async(a)=>{const root=document.getElementById('root');
          const tm=()=>{const e=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Moves');if(!e)return false;e.click();return true;};
          const bwf=()=>{let m=0;for(const e of document.querySelectorAll('div'))if(/repeat\(8,/.test(e.style.gridTemplateColumns||''))m=Math.max(m,e.getBoundingClientRect().width);return Math.round(m*100)/100;};
          const ovf=()=>{const de=document.documentElement;let bot=0;for(const k of root.children){const s=getComputedStyle(k);if(s.position==='fixed'||s.position==='absolute')continue;bot=Math.max(bot,k.getBoundingClientRect().bottom);}return Math.round((bot-de.clientHeight)*100)/100;};
          const d=document.createElement('div');d.id='ct-d17-kick';d.style.cssText='height:'+a.px+'px;flex:0 0 '+a.px+'px';root.firstElementChild.prepend(d);
          const q=d.getBoundingClientRect(),cs=getComputedStyle(d);const injRect={h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'&&cs.display!=='none'};
          const tap1=tm();const fr=[];for(let i=0;i<a.frames;i++){await new Promise(r=>requestAnimationFrame(r));fr.push([bwf(),ovf()]);}
          d.remove();const removed=!document.getElementById('ct-d17-kick');const tap2=tm();
          for(let i=0;i<a.frames;i++)await new Promise(r=>requestAnimationFrame(r));
          return {injRect,tap1,tap2,removed,first:fr[0],peak:Math.max(...fr.map(x=>x[1])),last:fr[fr.length-1],fixedAt:fr.findIndex(x=>x[1]<=0)};},{px:c.px,frames:FRAMES}));
        await b.settle(600);R.after=await bw(b);
      }catch(e){R.threw=String(e&&e.message||e).slice(0,200);}
      await b.close();
      L.say(!R.threw,'TC-R64-D17 '+c.n+' the play arm ran without throwing'+(R.threw?' - '+R.threw:''),R);
      L.say(typeof R.fresh==='number'&&R.fresh>40,'TC-R64-D17 '+c.n+' DENOMINATOR a fresh vs-Computer board is painted at 4 plies ('+R.fresh+')',{fresh:R.fresh});
      L.say(!!R.injRect&&R.injRect.inFlow===true&&Math.abs(R.injRect.h-c.px)<1&&R.tap1===true,'TC-R64-D17 '+c.n+' THE CONTROL WAS APPLIED: the '+c.px+'px block sat in the flow at its full height while Moves was toggled',{injRect:R.injRect,tap1:R.tap1});
      L.say(typeof R.peak==='number'&&R.peak>0&&R.peak<=SMALL&&!!R.first&&R.first[0]===R.fresh,'TC-R64-D17 '+c.n+' THE STATE WAS REACHED: a SMALL overflow ('+R.peak+'px, in 1..'+SMALL+') with the board still at its fresh width on the first frame ('+(R.first&&R.first[0])+' vs '+R.fresh+')',{first:R.first,peak:R.peak});
      L.say(!!R.last&&R.last[1]<=0&&R.last[0]<R.fresh&&R.fixedAt>=0,'TC-R64-D17 '+c.n+' THE SMALL OVERFLOW IS CORRECTED WITHIN THE WAKE: by frame '+FRAMES+' the overflow is '+(R.last&&R.last[1])+' (first <= 0 at frame '+R.fixedAt+') and the board took it ('+R.fresh+' -> '+(R.last&&R.last[0])+'). On 46340d1 the trim sat parked at -480 and the overflow stood for all '+FRAMES+' frames',{last:R.last,fixedAt:R.fixedAt});
      L.say(R.removed===true&&R.tap2===true&&typeof R.after==='number'&&Math.abs(R.after-R.fresh)<SAME,'TC-R64-D17 '+c.n+' and after the block is gone the board comes back to its fresh size, within '+SAME+'px ('+R.after+' vs '+R.fresh+')',{removed:R.removed,tap2:R.tap2,after:R.after});
    }
  }
  // TC-R64-D18 [#549 run fix fixpz, found by item (96) at aba4af0]. THE PUZZLE TRAINER'S GROWTH STOPS AT THE WIDTH CAP TOO, so a
  // small overflow after a puzzle move is taken out at once. Where the training board is WIDTH-bound (375x730, 375x761, 390) the
  // fit loop's non-Play growth branch (else if(over<-24), #364) fired 19 times per launch and walked the trim to -480 with no
  // board change - the dead zone fixr5a (76b40e9) closed for Play. A later overflow then spent its first frames climbing out of
  // it. MEASURED (PZ[0], a block prepended to the root's first child, then Re8+, every frame for 120 frames; trim read through a
  // control-only bundle exposing window.__ctTrim, never the shipped code): aba4af0 trial a3a63f6328e1 launch trim -480 at both
  // cells, 375x761 100px 375/17 x13 frames then 345/0, 375x730 80px 375/28 x7 and 349/2 x2 then 333/0; fix trial 0e2f9284ab7e
  // launch trim 0 (floor 34 and 54), 345/0 and 333/0 from the first frame. The assertion is behavioural (frames with an
  // overflow), so it needs no hook. PX is a property of the cell: it is the block that makes the board give up width there;
  // the state-reached line asserts the board really shrank, so a layout change that moves that says so.
  {
    const Z=require('../drive/puzzles.js');
    const PCELLS=[
      {n:'375x730', g:L.GEOS.kunal730, px:80},
      {n:'375x761', g:L.GEOS.kunal761, px:100},
    ];
    const FRAMES=90,MAXOVF=3,SAME=1;
    for(const c of PCELLS){
      const R={};
      const b=await L.launch({geo:c.g,name:'d18-'+c.n,store:{ct_pool:'3'}});
      try{
        await b.open();await Z.states['train'](b);await b.settle(1200);
        R.fresh=await bw(b);R.vw=c.g.w;
        R.injRect=await b.page.evaluate((px)=>{const root=document.getElementById('root');const d=document.createElement('div');d.id='ct-d18-kick';d.style.cssText='height:'+px+'px;flex:0 0 '+px+'px';root.firstElementChild.prepend(d);
          const q=d.getBoundingClientRect(),cs=getComputedStyle(d);return {h:Math.round(q.height*100)/100,inFlow:cs.position!=='fixed'&&cs.position!=='absolute'&&cs.display!=='none'};},c.px);
        await b.move('e1','e8',0);
        Object.assign(R,await b.page.evaluate(async(a)=>{const root=document.getElementById('root');
          const bwf=()=>{let m=0;for(const e of document.querySelectorAll('div'))if(/repeat\(8,/.test(e.style.gridTemplateColumns||''))m=Math.max(m,e.getBoundingClientRect().width);return Math.round(m*100)/100;};
          const fr=[];for(let i=0;i<a.frames;i++){await new Promise(r=>requestAnimationFrame(r));fr.push([bwf(),Math.round((root.scrollHeight-root.clientHeight)*100)/100]);}
          return {ovfFrames:fr.filter(x=>x[1]>0).length,peak:Math.max(...fr.map(x=>x[1])),last:fr[fr.length-1],fixedAt:fr.findIndex(x=>x[1]<=0)};},{frames:FRAMES}));
        R.removed=await b.page.evaluate(()=>{const d=document.getElementById('ct-d18-kick');if(d)d.remove();return !document.getElementById('ct-d18-kick');});
        await b.settle(900);await b.move('e8','f8',0);await b.settle(1600);R.after=await bw(b);
      }catch(e){R.threw=String(e&&e.message||e).slice(0,200);}
      await b.close();
      L.say(!R.threw,'TC-R64-D18 '+c.n+' the puzzle arm ran without throwing'+(R.threw?' - '+R.threw:''),R);
      L.say(typeof R.fresh==='number'&&Math.abs(R.fresh-R.vw)<1,'TC-R64-D18 '+c.n+' DENOMINATOR the fresh training board (PZ[0]) sits at its WIDTH cap, the viewport width ('+R.fresh+' vs '+R.vw+') - the case this cell exists for',{fresh:R.fresh,vw:R.vw});
      L.say(!!R.injRect&&R.injRect.inFlow===true&&Math.abs(R.injRect.h-c.px)<1,'TC-R64-D18 '+c.n+' THE CONTROL WAS APPLIED: the '+c.px+'px block sat in the flow at its full height before Re8+',{injRect:R.injRect});
      L.say(!!R.last&&R.last[1]<=0&&typeof R.fresh==='number'&&R.last[0]<R.fresh-8,'TC-R64-D18 '+c.n+' THE STATE WAS REACHED: the block made the board give up width ('+R.fresh+' -> '+(R.last&&R.last[0])+') and by frame '+FRAMES+' nothing overflows ('+(R.last&&R.last[1])+')',{last:R.last,fixedAt:R.fixedAt});
      L.say(typeof R.ovfFrames==='number'&&R.ovfFrames<=MAXOVF,'TC-R64-D18 '+c.n+' THE OVERFLOW AFTER A PUZZLE MOVE IS TAKEN OUT AT ONCE: '+R.ovfFrames+' of '+FRAMES+' frames overflow (at most '+MAXOVF+', peak '+R.peak+'px). On the aba4af0 bundle (358042b5d8c1) the launch had parked the trim at -480 and this cell read 10 frames at 375x761 (peak 17px) and 6 to 10 at 375x730 (peak 28px), two runs while the loop climbed back out',{ovfFrames:R.ovfFrames,peak:R.peak,fixedAt:R.fixedAt});
      L.say(R.removed===true&&typeof R.after==='number'&&Math.abs(R.after-R.fresh)<SAME,'TC-R64-D18 '+c.n+' and after the block is gone and the next move is played the board comes back to its fresh width, within '+SAME+'px ('+R.after+' vs '+R.fresh+') - the clamp stops growth at the width cap, not short of it',{removed:R.removed,after:R.after});
    }
  }
},'75-fit-loop-one-way-ratchet');
