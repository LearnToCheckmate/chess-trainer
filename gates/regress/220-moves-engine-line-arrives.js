'use strict';
// gates/regress/220-moves-engine-line-arrives.js - IN THE MOVES VIEW THE ENGINE LINE SHOWS ITS NUMBER AT ONCE AND ITS VARIATION SOON,
// ON A REVIEWED PLY AND ON A FRESH POSITION. TC-R363..365, US-R231.
//
// WHY [#553 batch 14 B2; jobs/the-moves-view-engine-line-searches-to-depth-16-so-on-a-phone-the-line-takes-longer-than-main-2026-11-07].
// #549 moved the Moves-view engine line from a 900ms search to a search to the review's own depth (16 on Quick), and its antagonist
// feared a slower line on a phone and "a 20s wall clock that shows no line". #550 measured no slower first line; #553 re-measured on
// this container: plies 11-18 of the Opera Game show their variation in 1 to 113ms (the line is already cached from the review's
// neighbourhood) except ply 14, a live depth-16 search, at about 0.73s - and the same with the page's CPU throttled 4x by CDP (0.74s),
// which says the throttle does not reach the engine's worker, so it is no phone stand-in for engine time. WHAT THIS CONTAINER CANNOT
// MEASURE: the depth-16 search time on his phone's WASM engine; that is device-only (CLAUDE.md: engine timing on his phone).
// What CAN be held here is the shape the job feared losing: the stored number is on screen while the search runs, and the variation
// does arrive, on reviewed plies and on a position the review never searched (the analysis board after 1.d4 d5, the Opera being 1.e4).
//
// WHAT IT ASSERTS at kunal761 (CT_G220_GEO picks another GEOS name), the Opera Game reviewed (drive/review), engine line on:
//  TC-R363 (DENOMINATOR) the engine row is on screen in the Moves view, and the analysis board takes 1.d4 d5.
//  TC-R364 at each of plies 11..14 and on the fresh analysis position, within 200ms of arriving the row shows a number (measured 1 to 5ms; the first draft's 500ms could not see a number held back for a 290ms search - the pair read it BLIND) (+1.1, M2, ...),
//          never an empty row and never 'Stockfish is not loaded'.
//  TC-R365 at the same stops, within 10s the row shows a variation (a numbered move), so a search that never finishes is red.
//  The 10s bound is a ceiling against 'no line at all', not a speed target: this machine takes under 1s.
// CONTROL-RECORD: 3219e5b 2026-11-24 total=14 red=2 scope=trial:ca9cec7b445b how=#553 B2 (the pair gates/pairs/jobs/the-moves-view-engine-line-searches-to-depth-16-so-on-a-phone-the-line-takes-longer-than-main-2026-11-07.json, base 3219e5b): the stored number blanked while a live search runs - TC-R364 red on the live stops at kunal761 and 320x568; depth 40 (trial:8e92d28ff4c4) reds TC-R365 at five stops; the engine never asked (trial:aa3df642d369) reds TC-R364 and TC-R365 at five; the tree (trial:aa193eeacd95 at the first pair run) 14/0
const L=require('../lib');const R=require('../drive/review');
const GEO=process.env.CT_G220_GEO||'kunal761';
const read=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const NUM=/^([+-]?\d+\.\d|-?M\d*|1-0|0-1)/;
const hasVar=(t)=>/\d+\.+\s*[KQRBNO]?[a-h1-8x]/.test(String(t||'').replace(NUM,''));
async function stop(b,tag){
  const t0=Date.now();let n=null,first=null,t='';
  while(Date.now()-t0<10000){t=await read(b);const el=Date.now()-t0;
    if(n===null&&t&&NUM.test(t))n=el;if(hasVar(t)){first=el;break;}await b.page.waitForTimeout(50);}
  L.say(n!==null&&n<=200&&!/not loaded/i.test(t||''),'TC-R364 '+GEO+' '+tag+': the engine row shows its number within 200ms ('+n+'ms)',{n,row:t});
  L.say(first!==null,'TC-R365 '+GEO+' '+tag+': the engine row shows a variation within 10s ('+first+'ms)',{first,row:t});
}
L.run(async()=>{
  const b=await L.launch({geo:GEO,name:'eng220'});await b.open();
  let ok=true;try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,10);await R.engineSet(b,true);await b.settle(400);}catch(e){ok=false;L.note('setup: '+String(e).slice(0,140));}
  const on=ok&&(await read(b))!==null;
  L.say(on,'TC-R363 '+GEO+' DENOMINATOR the Moves view is up on the Opera Game at ply 10 with the engine row on',{row:await read(b)});
  if(on){for(let p=11;p<=14;p++){await R.goPly(b,p);await stop(b,'ply '+p);}
    let fresh=true;try{await R.goPly(b,0);await b.tapCt('rev-fab',600);await b.move('d2','d4',600);await b.move('d7','d5',100);}catch(e){fresh=false;L.note('analysis: '+String(e).slice(0,140));}
    const fr=fresh?await read(b):null;
    L.say(fresh&&fr!==null,'TC-R363 '+GEO+' DENOMINATOR the analysis board took 1.d4 d5 (a position the review never searched) with the engine row on',{row:fr});
    if(fresh&&fr!==null)await stop(b,'analysis 1.d4 d5');}
  L.say(b.errs.length===0,'TC-R363 '+GEO+' zero app errors',b.errs.slice(0,3));
  await b.close();
},'220-moves-engine-line-arrives');
