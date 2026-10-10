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
// AND THE TRIGGER IS NOT UNIDENTIFIED - THE REPOSITORY HELD A MEASURED INSTANCE ALL ALONG, which this
// file's first draft published as an open question. gates/regress/16-cpu-result-line.js:424 - a REQUIRED
// gate - records that at game over "its 62px in-flow spacer (chess.jsx:7175) entered the flow, the fit loop
// read it as content and trimmed the board 224.00 -> 192.00 - 14%", and the irreversibility is in its own
// measurement: "live 224.00 -> card-up 192.00 -> card-gone 192.00". card-gone 192.00 IS the latch. So the
// trigger CLASS is known - a fixed bar's in-flow spacer entering the flow on a content change - and 62px
// sits inside the band that latches Kunal's own phone below. The honest open question is much narrower than
// "trigger unidentified": WHICH PORTRAIT SCREEN STILL PUTS >60px INTO THE FLOW ON A CONTENT CHANGE.
// Found by antagonist B; the build never grepped its own suite for the loop it was characterising.
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
  return {demo,board,during,ov,clicked,practice,nInflow,errs,peak};
};

// #393: a harness throw in one arm must go red on its OWN assertion and let the rest of the file run.
// L.run catches exactly one throw and exits, so without this a failure in the first arm hides every
// assertion after it. Antagonist A's finding.
const arm=async(geo,px)=>{
  try{ return await armInner(geo,px); }
  catch(e){ return {demo:null,board:null,during:null,ov:null,clicked:false,practice:false,nInflow:null,errs:-1,peak:null,threw:String(e&&e.message||e)}; }
};

const pair=(n,tag,clean,inj,px,engages)=>{
  L.say(!clean.threw&&!inj.threw,'TC-R64 '+tag+'0 '+n+' neither arm threw'+(clean.threw||inj.threw?' - '+(clean.threw||inj.threw):''),{clean:clean.threw||null,injected:inj.threw||null});
  L.say(clean.clicked===true&&inj.clicked===true,'TC-R64 '+tag+'1 '+n+' the practice tap was accepted in BOTH arms',{clean:clean.clicked,injected:inj.clicked});
  L.say(clean.practice===true&&inj.practice===true,'TC-R64 '+tag+'2 '+n+' PRACTICE WAS ACTUALLY REACHED in both arms - the "Now I\'ll try it" button is gone. toPractice clicks inside page.evaluate, which bypasses hit testing and returns true even where the control is occluded, so without this a swallowed click leaves both arms measuring the DEMO board and every assertion below passes on it [antagonist B]',{clean:clean.practice,injected:inj.practice});
  L.say(typeof clean.board==='number'&&clean.board>40,'TC-R64 '+tag+'3 '+n+' a board is painted in the clean arm - the denominator',{board:clean.board});
  L.say(typeof inj.board==='number'&&inj.board>40,'TC-R64 '+tag+'4 '+n+' a board is painted in the injected arm. `lost` is 0 when BOTH boards are null, so the recovery assertion would pass over two absent boards',{board:inj.board});
  L.say(clean.demo===inj.demo,'TC-R64 '+tag+'5 '+n+' THE TWO ARMS ARE COMPARABLE: they agree at the demo end, measured BEFORE either diverges. An L.note in the first draft, and both antagonists called it a precondition and therefore a verdict - gate 48 records this board as BISTABLE between runs ("192 then 192 in one run and 270.9 then 270.9 in the next", about 2 runs in 6), so two independent draws could both be low and report a recovery that never happened',{cleanDemo:clean.demo,injectedDemo:inj.demo});
  // THE NON-VACUITY OF THE RECOVERY ASSERTION, AND MY FIRST VERSION OF IT WAS UNSOUND AND THE RUN CAUGHT IT
  // [R18]. That version asserted the transient had moved the peak `over` I sample per frame, and it went RED
  // ON A WORKING CONTROL at three of six cells: at 375x568 the injected and clean peaks are BOTH 2.88 while
  // only the injected arm latches, and at the two sub-threshold cells both are 0. Sampled `over` does not
  // capture what the loop acts on - the loop measures inside its OWN rAF callback, after its own setBoardTrim
  // has applied, so an outside sampler and the loop never see the same DOM. "An assertion you cannot ground is
  // worse than no assertion", so the peaks are now printed and the non-vacuity is pinned to a quantity I CAN
  // ground: the board WHILE the transient is in flow. On ANY bundle, broken or fixed, content that needs room
  // must take it - so a dip is the control engaging, and its absence means the transient did nothing.
  if(engages){
    L.say(typeof inj.during==='number'&&inj.during<clean.board-0.5,'TC-R64 '+tag+'6 '+n+' THE '+px+'px TRANSIENT ACTUALLY TOOK BOARD ROOM while it was in flow, which is the non-vacuity of the recovery assertion below: without it, two equal boards would prove only that nothing happened. Grounded in the board itself rather than in a sampled `over` [#416, #385]',{duringInjection:inj.during,cleanBoard:clean.board,px});
  } else {
    L.say(typeof inj.during==='number'&&Math.abs(inj.during-clean.board)<0.5,'TC-R64 '+tag+'6 '+n+' a '+px+'px transient is ABSORBED at this geometry and never takes board room at all - the board is unmoved even while the content is in flow. This is the sub-threshold regime and it is why the recovery assertion below is green on the broken bundle here [#385: the instrument is shown able to report both answers]',{duringInjection:inj.during,cleanBoard:clean.board,px});
  }
  L.say(clean.errs===0,'TC-R64 '+tag+'7 '+n+' zero console errors, clean arm',{errs:clean.errs});
  L.say(inj.errs===0,'TC-R64 '+tag+'8 '+n+' zero console errors, injected arm - asserted separately from the clean arm, because a conjunct over both cannot say which one errored',{errs:inj.errs});
  const lost=Math.round((clean.board-inj.board)*100)/100;
  L.say(Math.abs(lost)<0.5,'TC-R64 '+tag+'9 '+n+' THE BOARD COMES BACK after a '+px+'px transient. A transient piece of in-flow content across one loop-dependency change must not cost board for the rest of the visit: the board after the injection cycle equals the board with no injection. NO pixel literal - the control is the other arm of the same run'+(engages?'':' (this cell is BELOW the threshold on main, so it is green on the broken bundle too and its job is to show the instrument can report both answers [#385])'),{cleanBoard:clean.board,afterInjectCycle:inj.board,lostPx:lost,transientPx:px});
  L.note(n+' '+px+'px peak `over` sampled per frame: injected='+inj.peak+'  clean='+clean.peak+'   -- printed, NOT asserted: see the comment above A6. At 375x568 these are EQUAL at 2.88 while only the injected arm latches, which is why a predicate over them reddens a working control.');
  L.note(n+' '+px+'px mechanism, final settled state: over='+(inj.ov&&inj.ov.over)+'  spacers='+(inj.ov&&inj.ov.spacers)+'  inflowChildrenOfRoot='+(inj.ov&&inj.ov.inflow)+'   -- over 0 means the growth branch has no signal at ANY threshold; spacers 0 means the loop cannot see the slack. These are facts about the implementation under test, NOT requirements on it, which is why they are printed and not asserted: the surviving candidate fixes make `over` signed or widen the `spacers` predicate, so asserting them would have REDDENED A CORRECTLY FIXED BUNDLE and the gate would have vetoed the only fix it exists to enable [antagonist A].');
  return lost;
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
},'75-fit-loop-one-way-ratchet');
