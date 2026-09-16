// regress/43-tcrl-analysis.js  TC-RL BATCH 1: US-R04, a pasted game is analysed with visible progress.
//
// The first batch of the 92-case Review lane suite (TEST-CASES-REVIEW.md, staged in the tracker artifact's
// `docs` collection as `test-cases-review` after the build session flagged that it could not read it).
// Cases TC-RL-001 .. TC-RL-011.
//
// CODED HERE: 001, 002, 003, 005, 006, 007, 010, 011 — eight of the eleven.
// DELIBERATELY NOT CODED, and named so the absence is a record rather than a gap:
//   TC-RL-004  NEEDS-KUNAL (K15): a 200-ply review takes 93 s and TEST-CASES.md calls >40 plies uncovered.
//              His call whether that is a supported case, so it is not coded against a guess.
//   TC-RL-008  NEEDS-KUNAL: backgrounding the app. The doc's own note says headless Chromium would not stop
//              the run, so the sandbox CANNOT measure it - it needs a phone recording.
//   TC-RL-009  NEEDS-KUNAL: no failure state is defined in the build, so there is nothing to assert.
//
// WHAT IS PINNED AND WHAT IS DELIBERATELY NOT. The doc measured the summary arriving in 15-27 s across six
// geometries. That number is a property of the MACHINE, not of the app, so pinning it here would make this
// gate red on a slow container and green on a fast one - the opposite of a regression test. What is pinned
// instead is what the app CONTROLS: the exact shape of the progress line, that the engine element is on
// screen, that the percentage never goes backwards, that no second analysis can be started over a running
// one, and that two cold runs of the same game give byte-identical accuracy. Elapsed time is REPORTED on
// every run so a real slowdown is visible to a reader without being asserted against.
// ── NEGATIVE CONTROL, run 2026-09-16 at #401. ────────────────────────────────────────────────────────────────
// This gate was the LAST in the suite with no recorded control anywhere - not in this header, not in any
// RUN-LOG row. The audit that named seven uncontrolled gates was wrong about five of them and right about this
// one and 35-width-containment; see flag gates-without-a-negative-control update6.
//
//   NC-A  chess.jsx:5335  the progress line  {pct}% -> {100-pct}%
//         Chosen deliberately so the SHAPE of the line is byte-identical and only the VALUE regresses. Trial
//         bundle md5 7994b6f156d0, built with CT_OUT; chess.jsx restored and md5-verified to 688815d19019.
//         -> 2 FAIL, and only these two: TC-RL-002 (samples came back 94, 79, 68, 53, 47, 24, 12, 9, 3, 0 -
//            monotonically DOWN) and TC-RL-006 (six taps in the middle of the progress screen took it 94 -> 6).
//         -> AND TC-RL-001 STAYED GREEN, which is the whole point of choosing this break. That assertion reads
//            the line as "Analyzing your game <n>% · checking every move, in those words" - a SHAPE - and a
//            percentage running backwards satisfies it perfectly. This is #385's coach chip in miniature: the
//            regex was never the thing doing the work, and if this gate had only had TC-RL-001 it would have
//            reported green on a progress bar counting down to zero. The value assertions are what earn the
//            green here, and now that is demonstrated rather than assumed.

'use strict';
const L=require('../lib');
const R=require('../drive/review');

// one ply, for TC-RL-003. Result '*' so the head reads "A vs B · *".
const PGN_ONEPLY='[Event "t"]\n[White "A"]\n[Black "B"]\n[Result "*"]\n\n1. e4 *\n';

// start an analysis and DO NOT wait for it - every in-flight case needs the progress screen, not the summary
async function startAnalysis(b,pgn){
  await R.toList(b);
  await b.page.locator('textarea').fill(pgn);
  await b.settle(150);
  await b.tapText(/^⚡ Analyze Game$/);
}
const pct=(b)=>b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/(\d+)%\s*·\s*checking/);return m?+m[1]:null;});
const progressText=(b)=>b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/Analyzing your game\s+\d+%\s*·\s*checking every move/);return m?m[0]:null;});
const seen=(b,sel)=>b.page.locator(sel).last().isVisible().catch(()=>false);
const waitSummary=(b,ms)=>b.page.locator('[data-ct="rev-summary"]').last().waitFor({state:'visible',timeout:ms||240000});

L.run(async()=>{
  // ---- RUN 1: one cold analysis serves 001, 002, 005 and 011 at the reference geometry -------------------
  const b=await L.launch({geo:'kunal730',name:'tcrl-b1',store:{ct_pool:'3'}});
  await b.open();
  const t0=Date.now();
  await startAnalysis(b,R.PGN_OPERA);

  // TC-RL-001a: the progress line, in the exact words, within 0.8 s of the tap
  await b.settle(800);
  const pt=await progressText(b);
  L.say(!!pt,'TC-RL-001: within 0.8 s the progress line reads "Analyzing your game <n>% · checking every move", in those words',pt);
  L.say(await seen(b,'[data-ct="ana-engines"]'),'TC-RL-001: the engine readout [data-ct="ana-engines"] is on the progress screen');

  // TC-RL-005: no second analysis can be started over a running one
  const inflight=await b.page.evaluate(()=>({
    textareas:document.querySelectorAll('textarea').length,
    analyze:[...document.querySelectorAll('button')].filter(x=>/Analyze Game/.test(x.innerText||'')).length,
    buttons:document.querySelectorAll('button').length}));
  L.say(inflight.textareas===0,'TC-RL-005: the PGN box is gone while the analysis runs (textarea count 0), so a second review cannot be pasted over the first',inflight);
  L.say(inflight.analyze===0,'TC-RL-005: there is no "Analyze Game" button on screen while one is running',inflight);
  L.say(inflight.buttons===6,'TC-RL-005: exactly six buttons during the analysis - the hamburger and the five tab-bar buttons. Pinned, because "some buttons" is not an assertion',inflight);

  // TC-RL-011 at the reference geometry: the progress screen does not overflow
  // metrics().over is an OBJECT ({bottom,vh,over,scrollY,docScroll}), not a number. The first run of this
  // gate compared the object to 0 and went red on a screen that overflows by exactly nothing.
  const m1=await b.metrics();
  const sx1=await b.page.evaluate(()=>document.documentElement.scrollLeft||document.body.scrollLeft||0);
  L.say(m1.over.over<=0,'TC-RL-011 (375x730): the progress screen does not overflow the viewport (over '+m1.over.over+')',m1.over);
  L.say(sx1===0,'TC-RL-011 (375x730): the progress screen does not scroll sideways');

  // TC-RL-002: the percentage never goes backwards, sampled every 900 ms until the summary
  const samples=[];
  let done=false;
  const poll=(async()=>{ for(let i=0;i<300&&!done;i++){ const p=await pct(b).catch(()=>null); if(p!=null)samples.push(p); await b.settle(900);} })();
  await waitSummary(b,240000); done=true; await poll;
  const elapsed=Math.round((Date.now()-t0)/1000);
  L.say(true,'TC-RL-001: the summary arrived after '+elapsed+' s (the doc measured 15-27 s on its machine). REPORTED, NOT ASSERTED: this number belongs to the container, not to the app');
  const backwards=samples.map((v,i)=>i&&v<samples[i-1]?{at:i,from:samples[i-1],to:v}:null).filter(Boolean);
  L.say(samples.length>=3,'TC-RL-002: the percentage was sampled at least three times before the summary ('+samples.length+' samples) - fewer than that cannot show a direction',samples);
  L.say(backwards.length===0,'TC-RL-002: every sample is >= the one before it, so the progress percentage never goes backwards',{samples,backwards});

  // the summary text, kept for TC-RL-010
  const sum1=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-summary"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
  const acc=(s)=>{const m=(s||'').match(/White\s+[\d.]+%[\s\S]*?Black\s+[\d.]+%\s*ACCURACY\s*[≈~]?\s*\d+/);return m?m[0].replace(/\s+/g,' '):null;};
  L.say(!!sum1&&/ACCURACY/.test(sum1),'TC-RL-001: the summary carries the accuracy table',sum1&&sum1.slice(0,90));
  const bad1=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad1.length===0,'TC-RL-001: zero app errors through a whole cold analysis',bad1.slice(0,3));
  await b.close();

  // ---- TC-RL-011 at two more geometries, abandoned as soon as the progress screen is measured ------------
  for(const g of [{k:'se',label:'320x568'},{k:{w:390,h:844},label:'390x844'}]){
    const c=await L.launch({geo:g.k,name:'tcrl-b1-'+g.label,store:{ct_pool:'3'}});
    await c.open();
    await startAnalysis(c,R.PGN_OPERA);
    await c.settle(1200);
    const onProgress=await seen(c,'[data-ct="ana-engines"]');
    L.say(onProgress,'TC-RL-011 ('+g.label+'): the progress screen was actually reached, so the two measurements below are of the state the case names');
    const m=await c.metrics();
    const sx=await c.page.evaluate(()=>document.documentElement.scrollLeft||document.body.scrollLeft||0);
    L.say(m.over.over<=0,'TC-RL-011 ('+g.label+'): the progress screen does not overflow the viewport (over '+m.over.over+')',m.over);
    L.say(sx===0,'TC-RL-011 ('+g.label+'): the progress screen does not scroll sideways');
    await c.close();   // abandoned on purpose: waiting out five more full analyses buys nothing this case needs
  }

  // ---- TC-RL-003: a one-ply game --------------------------------------------------------------------------
  const d=await L.launch({geo:'kunal730',name:'tcrl-003',store:{ct_pool:'3'}});
  await d.open();
  await startAnalysis(d,PGN_ONEPLY);
  await waitSummary(d,120000);
  await d.settle(600);
  const one=await d.page.evaluate(()=>{
    const e=document.querySelector('[data-ct="rev-summary"]');
    return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;
  });
  L.say(!!one,'TC-RL-003: a one-ply game produces a summary at all');
  L.say(!!one&&/A\s*vs\s*B/.test(one),'TC-RL-003: the summary head names both players, "A vs B"',one&&one.slice(0,80));
  L.say(!!one&&/\*/.test(one),'TC-RL-003: an unfinished game shows its result as *',one&&one.slice(0,80));
  const badd=d.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(badd.length===0,'TC-RL-003: zero app errors on a one-ply review',badd.slice(0,3));
  await d.close();

  // ---- TC-RL-006: tapping during the analysis does not disturb it -----------------------------------------
  const e6=await L.launch({geo:'kunal730',name:'tcrl-006',store:{ct_pool:'3'}});
  await e6.open();
  await startAnalysis(e6,R.PGN_OPERA);
  await e6.settle(900);
  const before6=await pct(e6);
  for(let i=0;i<6;i++){ await e6.page.mouse.click(187,365); await e6.settle(1000); }
  const after6=await pct(e6);
  L.say(before6!=null&&after6!=null&&after6>=before6,'TC-RL-006: six taps in the middle of the progress screen do not send the percentage backwards ('+before6+' -> '+after6+')',{before6,after6});
  await waitSummary(e6,240000);
  L.say(true,'TC-RL-006: the summary still arrives after the taps');
  const bad6=e6.errs.filter(x=>!/RuntimeError: unreachable/.test(x));
  L.say(bad6.length===0,'TC-RL-006: the taps raised no page error',bad6.slice(0,3));
  await e6.close();

  // ---- TC-RL-007: leaving the tab and coming back does not restart or lose the run ------------------------
  const e7=await L.launch({geo:'kunal730',name:'tcrl-007',store:{ct_pool:'3'}});
  await e7.open();
  await startAnalysis(e7,R.PGN_OPERA);
  await e7.settle(900);
  await e7.home(); await e7.settle(600);
  await e7.tile('Review'); await e7.settle(800);
  const back=await e7.page.evaluate(()=>({
    progress:/Analyzing your game/.test(document.body.innerText||''),
    textareas:document.querySelectorAll('textarea').length}));
  L.say(back.progress,'TC-RL-007: going Home and back to Review during an analysis returns to the PROGRESS screen, not to a fresh entry screen',back);
  L.say(back.textareas===0,'TC-RL-007: and the PGN box is still absent, so the run cannot be started over from there',back);
  await waitSummary(e7,240000);
  L.say(true,'TC-RL-007: the summary still arrives after leaving the tab and returning');
  const sum7=await e7.page.evaluate(()=>{const x=document.querySelector('[data-ct="rev-summary"]');return x?(x.innerText||'').replace(/\s+/g,' ').trim():null;});
  const bad7=e7.errs.filter(x=>!/RuntimeError: unreachable/.test(x));
  L.say(bad7.length===0,'TC-RL-007: zero app errors across the navigation',bad7.slice(0,3));
  await e7.close();

  // ---- TC-RL-010: the same game, cold, gives the same answer ----------------------------------------------
  // The doc ran eight fresh contexts. Three are run here - run 1, the TC-RL-007 run, and one more - because
  // each is a full cold analysis and the suite has to finish. THREE IS THE NUMBER THIS GATE CHECKED, said
  // plainly rather than implied: a fourth divergence would not be caught here.
  const e10=await L.launch({geo:'kunal730',name:'tcrl-010',store:{ct_pool:'3'}});
  await e10.open();
  await startAnalysis(e10,R.PGN_OPERA);
  await waitSummary(e10,240000);
  await e10.settle(600);
  const sum10=await e10.page.evaluate(()=>{const x=document.querySelector('[data-ct="rev-summary"]');return x?(x.innerText||'').replace(/\s+/g,' ').trim():null;});
  await e10.close();
  const a1=acc(sum1),a7=acc(sum7),a10=acc(sum10);
  L.say(!!a1&&!!a7&&!!a10,'TC-RL-010: an accuracy line was read from all three cold runs',{a1,a7,a10});
  L.say(a1===a7&&a7===a10,'TC-RL-010: three INDEPENDENT cold browser contexts give a byte-identical accuracy line for the same game - the reproducibility fix still holds',{a1,a7,a10});
  L.say(sum1===sum7&&sum7===sum10,'TC-RL-010: and the whole summary block matches across those three runs, not just the accuracy line',{len:[sum1&&sum1.length,sum7&&sum7.length,sum10&&sum10.length]});
},'TCRL-BATCH-1');
