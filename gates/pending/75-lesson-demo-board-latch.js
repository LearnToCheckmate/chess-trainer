// gates/pending/75-lesson-demo-board-latch.js
// TC-R64 (US-R21 clause: the board is maximised and must never jump) - THE LESSON BOARD LATCHES SMALLER
// FOR THE REST OF A VISIT, and this is the first deterministic reproduction of it.
//
// WHY IT IS IN gates/pending/ AND NOT IN gates/regress/, SAID FIRST BECAUSE IT IS THE MOST IMPORTANT FACT
// ABOUT THIS FILE. The defect is LIVE ON origin/main and this gate REDS on main by design. Landing it in
// regress/ would redden the suite on a tree no build broke and block every push, which is the trade #508
// recorded against its own G5-occlusion finding and declined to take. So it lands here, with a `absent`
// row in gates/gate-manifest.tsv naming this job, so gatemanifest.sh reports the gap on EVERY run instead
// of the gap being invisible. It moves to regress/ and the manifest row flips to `required` IN THE SAME
// COMMIT as the app fix, never before - the same route gate 50 is waiting on.
//
// THE JOB: jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29, priority 16, band 16 order 3,
// unblocked by Kunal's Desk answer questions/q-latch-detector-blocking (2026-10-04, choice fix-app-first).
//
// WHAT WAS NOT REPRODUCIBLE BEFORE THIS FILE, AND WHY THAT IS THE WHOLE VALUE. The job records the symptom
// as firing "2 of 6 observed full runs" and "about 1 run in 5", mechanism "NOT established"; #468 could not
// provoke it in 36 launches; the headless-gallery lane could not provoke it in 11. Eleven launches that fail
// to provoke an unidentified trigger measure the trigger's rarity, not its absence. This gate does not wait
// for the trigger: it CAUSES one, with the 16px in-flow injection the job's own #468 block established, and
// it then asks whether the board comes back. That turns an intermittent into a deterministic red.
//
// THE ASSERTION CARRIES ITS OWN CONTROL, IN THE SAME RUN, AT THE SAME GEOMETRY, AND THAT IS DELIBERATE.
// Block B drives the SAME path TWICE - once clean, once with the injection - and asserts the two practice
// boards are EQUAL. So there is no expected pixel value anywhere in this file. That matters twice over:
//   (1) It cannot go stale. Every absolute board pin in this suite is a function of this container's fonts
//       (gates/lib.js's #480 note: the app's stack and bare sans-serif differ by 53.84px on one line here),
//       and six consecutive containers once could not gate any tree because of exactly that. A relation
//       between two measurements taken in one run is immune to it.
//   (2) It cannot be satisfied by the defect. #510's own first fix PASSED every arithmetic check I had and
//       FAILED this comparison, which is how the fix was caught before it was pushed.
// The cost is stated rather than hidden: this shape cannot detect a board that is wrong in BOTH arms. Block
// A is the denominator that closes that - it asserts the clean board is HEIGHT-bound (strictly narrower than
// the viewport), because where WIDTH binds the trim cannot move the board at all and the whole cell is inert.
//
// THE MECHANISM, MEASURED AT #510 ON BUNDLE 227126b82b81 AND NOT READ OUT OF THE SOURCE:
//   (a) `over` - the ONLY quantity the fit loop acts on - reads 0 in every settled lesson state, because
//       #root has exactly ONE in-flow child whose height EQUALS the viewport. Measured 0 at 320x540,
//       375x568, 375x730 and 375x761, clean and latched.
//   (b) The loop's own `spacers` term reads 0 on this screen: its predicate needs a DIRECT child of #root
//       that is aria-hidden with flex-grow and no children, and the only grow-capable box is one level
//       deeper, is not aria-hidden and has six children. So the slack is invisible to it.
//   (c) The slack a single shrink leaves is ceil(over/8)*8+8-over, which lies in (8,16] for EVERY possible
//       over>0, while the growth branch requires over<-24. So the trim is a one-way ratchet BY CONSTRUCTION
//       and not by accident, independently of (a) and (b).
//   Together: the board loses 24px at 320x540 and 16px at 375x568 and nothing in the app can reclaim it.
//
// AND ONE PUBLISHED CLAIM ON THE JOB IS FALSE AND IS WITHDRAWN HERE [R18]. Its band16Evidence reads "at
// 375x730 which is Kunal's own phone". MEASURED at #510 with the one-variable control at FOUR geometries on
// BOTH bundles: the latch is 24px at 320x540, 16px at 375x568, and EXACTLY 0px at 375x730 AND 375x761.
// Where width binds, the trim cannot move the board, which the job's own #468 block already says. The defect
// is real and it is NOT on Kunal's phone, so block D asserts the zero at his two geometries rather than
// leaving the correction as prose - a withdrawal recorded everywhere except where a reader looks is still a
// gap [#450].
//
// GEOMETRY. 320x540 and 375x568 are the two cells where the latch reproduces; 375x730 and 375x761 are
// Kunal's own (R19, settled 2026-10-03) and are driven as the POSITIVE CONTROL that the instrument can
// report "no latch" as well as "latch". A gate that only ever visits cells where the defect fires cannot
// tell a fix from a geometry change.

const L=require('../lib.js');
const D=require('../drive/lesson.js');

const LATCH=[{n:'320x540',g:{w:320,h:540,safe:''}},{n:'375x568',g:L.GEOS.short375}];
const CLEAN=[{n:'375x730',g:L.GEOS.kunal730},{n:'375x761',g:L.GEOS.kunal761}];

const bw=async(b)=>{const x=await b.board();return x?Math.round(x.w*100)/100:null;};

// the fit loop's own measurement, re-implemented so the gate and the code are asking one question
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
  return {over:Math.round(over*100)/100,spacers:Math.round(sp*100)/100,inflow,
          bottom:Math.round(bottom*100)/100,clientH:de.clientHeight};
});

const toPractice=(b)=>b.page.evaluate(()=>{
  const t=[...document.querySelectorAll('button')].find(x=>/Now I'll try it/.test(x.innerText||''));
  if(!t)return false; t.click(); return true;});

const inject=(b)=>b.page.evaluate(()=>{
  const r=document.getElementById('root');
  const inflow=[...r.children].filter(c=>{const cs=getComputedStyle(c);
    return cs.position!=='fixed'&&cs.position!=='absolute'&&c.getBoundingClientRect().height>0;});
  const host=inflow.length===1?inflow[0]:r;
  const d=document.createElement('div');d.id='ct510inj';
  d.style.cssText='height:16px;flex:0 0 16px;width:100%';host.appendChild(d);
  return inflow.length;});

// ONE ARM: reach the lesson demo end, optionally inject, go to practice, remove the injection, settle.
// Returns the practice board and the loop's own `over` in the final state.
const arm=async(geo,doInject)=>{
  const b=await L.launch({geo});
  await b.open();
  await D.states['endgame-demo-end'](b);
  await b.settle(900);
  const demo=await bw(b);
  let nInflow=null;
  if(doInject){nInflow=await inject(b);await b.settle(700);}
  const clicked=await toPractice(b);
  await b.settle(1400);
  if(doInject){await b.page.evaluate(()=>{const e=document.getElementById('ct510inj');if(e)e.remove();});await b.settle(1500);}
  await b.page.waitForTimeout(2000);
  const board=await bw(b), ov=await overOf(b);
  const errs=b.errs.length;
  await b.close();
  return {demo,board,ov,clicked,nInflow,errs};
};

L.run(async()=>{
  // ── BLOCK A + B: the two latch cells ───────────────────────────────────────────────────────────────
  for(const {n,g} of LATCH){
    const clean=await arm(g,false);
    const inj  =await arm(g,true);

    // A - DENOMINATORS, each in its OWN L.say so none of them can be satisfied by a conjunct
    L.say(clean.clicked===true,'TC-R64 A0 '+n+' the practice state was actually REACHED in the clean arm - the "Now I\'ll try it" button was found and clicked. Without this, two equal boards prove only that nothing happened',{clicked:clean.clicked});
    L.say(inj.clicked===true,'TC-R64 A0b '+n+' the practice state was actually REACHED in the injected arm too',{clicked:inj.clicked});
    L.say(typeof clean.board==='number'&&clean.board>40,'TC-R64 A1 '+n+' a board is painted in the clean practice state - the denominator every assertion below divides by',{board:clean.board});
    L.say(typeof inj.board==='number'&&inj.board>40,'TC-R64 A1b '+n+' a board is painted in the injected arm',{board:inj.board});
    L.say(clean.board<g.w-1,'TC-R64 A2 '+n+' the clean board is HEIGHT-bound, strictly narrower than the viewport. This is the cell\'s non-vacuity: where WIDTH binds, boardTrim cannot move the board at all and no amount of latching would show, so a green here would mean nothing',{board:clean.board,vw:g.w});
    L.say(inj.nInflow===1,'TC-R64 A3 '+n+' #root has EXACTLY ONE in-flow child, which is the structural reason `over` can never read negative on this screen - measured, not read from source',{inflowChildren:inj.nInflow});

    // B - THE ASSERTION. One variable between the two arms, measured in the same run at the same geometry.
    const lost=Math.round((clean.board-inj.board)*100)/100;
    L.say(Math.abs(lost)<0.5,'TC-R64 B1 '+n+' THE BOARD COMES BACK. A transient 16px of in-flow content across one loop-dependency change must not cost board for the rest of the visit: the practice board after the injection cycle equals the practice board with no injection. NO pixel literal - the control is the other arm of the same run',{cleanBoard:clean.board,afterInjectCycle:inj.board,lostPx:lost});

    // C - THE MECHANISM. Asserted, not noted, because a fix that returns the pixels while leaving the loop
    // blind to slack has not closed the class - the next transient latches again.
    L.say(inj.ov&&inj.ov.over===0,'TC-R64 C1 '+n+' in the final settled state the loop\'s own `over` reads EXACTLY 0, so the growth branch has no signal to act on whatever its threshold is. This is why a threshold change alone cannot fix this, and why #510\'s first fix did not',{over:inj.ov&&inj.ov.over});
    L.say(inj.ov&&inj.ov.spacers===0,'TC-R64 C2 '+n+' the loop\'s `spacers` term reads 0 on this screen - the one grow-capable box is a level deeper than its predicate reaches, so the reclaimable slack is invisible to the instrument that is supposed to find it',{spacers:inj.ov&&inj.ov.spacers});
    L.say(clean.errs===0&&inj.errs===0,'TC-R64 C3 '+n+' zero console errors across both arms',{clean:clean.errs,injected:inj.errs});
    L.note(n+' demo boards: clean '+clean.demo+'  injected '+inj.demo+'   (the demo end is measured BEFORE either arm diverges, so an inequality here would mean the two arms were never comparable)');
  }

  // ── BLOCK D: KUNAL'S OWN GEOMETRIES, THE POSITIVE CONTROL ────────────────────────────────────────
  // These must read ZERO on the BROKEN bundle as well as the fixed one. That is the point: it proves the
  // instrument can report "no latch", and it is where the job's band16Evidence claim is withdrawn.
  for(const {n,g} of CLEAN){
    const clean=await arm(g,false);
    const inj  =await arm(g,true);
    const lost=Math.round((clean.board-inj.board)*100)/100;
    L.say(typeof clean.board==='number'&&clean.board>40,'TC-R64 D0 '+n+' a board is painted - the denominator',{board:clean.board});
    L.say(clean.board>=g.w-1,'TC-R64 D1 '+n+' at Kunal\'s own geometry the board is WIDTH-bound (it fills the viewport), which is the measured reason the latch cannot occur here and the reason the job\'s band16Evidence claim "at 375x730 which is Kunal\'s own phone" is FALSE and withdrawn',{board:clean.board,vw:g.w});
    L.say(Math.abs(lost)<0.5,'TC-R64 D2 '+n+' and the board is unmoved by the injection cycle - this assertion is GREEN ON THE BROKEN BUNDLE TOO, by design, which is what makes the instrument able to report both answers [#385: assert first that the thing was present]',{cleanBoard:clean.board,afterInjectCycle:inj.board,lostPx:lost});
  }
},'75-lesson-demo-board-latch');
