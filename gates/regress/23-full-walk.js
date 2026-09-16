// regress/23-full-walk.js  #390, procedure section 6d. Kunal, 2026-09-14: "Did the recording get put into the
// preview gallery? Because I can do that now." He is holding the phone, and his phone is the only place real
// fonts, real Apple emoji ink, real safe-area insets and real iOS Safari behaviour exist.
//
// WHAT THIS GUARDS, and why each assertion is here rather than a screenshot review:
//   1. The walk button EXISTS and is distinct from "Play all". The eight existing cards are a "what I still
//      need" list that gate 15 asserts; the walk is an ordered pass over every SCREEN. Both must survive.
//   2. The walk REACHES ITS SCREENS. A recording aid that silently stops three screens in is worse than none,
//      because he will not know until he has recorded it and sent it. So this drives the real walk and checks
//      the caption id actually changes to the expected screens, in order.
//   3. Every frame is SELF-DESCRIBING: the caption carries the build stamp AND the measured viewport, so a
//      frame pulled out of the video says which build and which geometry it came from without any other context.
//   4. NO DEV-ONLY CHROME IS IN SHOT. The Preview and feedback buttons sit on the home screen; during a
//      recording they must not be. This is the assertion most likely to rot, because the dev row is added back
//      by anything that forgets the recCap guard.
//
// A MEASURED CORRECTION TO THE BRIEF, recorded here because the next person will read the brief and not the code:
// section 6d says the gallery holds SIX cards, all Review, and that Play, Lesson, Puzzles, Home and Menu have no
// card at all. Counted in chess.jsx, SC holds EIGHT and they already cover Play, Lesson, Puzzles, Review, Home
// and Menu. What was genuinely missing is the ORDERED WALK and the viewport in the caption. The brief was right
// about what to build and wrong about why, which is worth knowing before anyone "restores" the six.
// ── CONTROL RE-VERIFIED 2026-09-16 at #402, AND A SECOND ONE FOUND BY GETTING THE FIRST ONE WRONG. ──────────
// The recorded control (RUN-LOG #390, "the !recCap guard removed, 2 of 22 red") reproduces EXACTLY:
//   chess.jsx:4395  {!preview&&!fbOpen&&!recCap&&  ->  {!preview&&!fbOpen&&   (trial md5 bf8d7a165eae)
//   -> 2 FAIL, both "NO dev-only chrome in shot", one per geometry, {"w":76,"h":34}. Nothing else moved.
// This gate file has ONE commit and has not changed since its control was recorded, so this is the clean case:
// same gate, same break, same numbers, six builds later.
//
// AND A SECOND CONTROL, which exists only because I first reproduced the wrong break - I suppressed the caption
// ELEMENT (chess.jsx:4165, {recCap&&(<div data-ct="rec-cap") rather than the guard at 4395. Worth keeping
// because it is strictly stronger and it documents a dependency the gate never states:
//   caption element suppressed (trial md5 7c4a3a51cba4) -> 8 FAIL / 14 PASS, and the payload is the finding:
//   seen:[] against want:["BUILD","HOME","MENU","LOOK","PLAY-SETUP",...]. THE CAPTION IS HOW THIS WALK
//   IDENTIFIES SCREENS. Remove it and the gate cannot tell which screen it is on, so "reached at least 6
//   screens" and "in the declared order" fail along with the two caption assertions. That is correct behaviour
//   and not a defect - but it means the caption is load-bearing for the WHOLE gate rather than for the two
//   assertions that name it, and nothing said so before now.
'use strict';
const L=require('../lib');
// the first screens of the walk, in order. Deliberately NOT all fourteen: the Review leg alone is ~84s and this
// gate runs in the suite. The Review leg has its own coverage in 20-review, 21-review-brilliant and 22.
const WANT=['BUILD','HOME','MENU','LOOK','PLAY-SETUP','PLAY-LIVE'];
const cap=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rec-cap"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
L.run(async()=>{
  for(const geo of ['kunal730','se']){
    const b=await L.launch({geo,name:'full-walk-'+geo});await b.open();
    // the gallery is reached from the home dev row, which is exactly what must NOT be in the recording
    const dev=await b.rect('[data-ct="home-devrow"]');
    L.say(!!dev,geo+': the dev row is on the home screen BEFORE any recording (non-empty companion - the absence check below is vacuous without this)',dev&&dev.text);
    // the row sits BELOW THE FOLD at these geometries - gate 42 found that the hard way, with a tap that
    // landed on nothing and a green that meant nothing. Scroll the finger-scrollable ancestor first, then tap.
    const scrolled=await b.page.evaluate(()=>{
      const el=document.querySelector('[data-ct="home-preview"]');if(!el)return false;
      for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
        const oy=getComputedStyle(p).overflowY;
        if((oy==='auto'||oy==='scroll')&&p.scrollHeight>p.clientHeight+1){p.scrollTop=p.scrollHeight;return true;}
      }
      return false;});
    await b.settle(400);
    const pv=await b.rect('[data-ct="home-preview"]');
    L.say(!!pv&&pv.y>=0&&pv.y+pv.h<=b.geo.h+0.5,geo+': the Preview button is fully on screen before it is tapped (scrolled='+scrolled+')',pv);
    await b.tapCt('home-preview',900);
    const walk=await b.rect('[data-ct="preview-walk"]');
    L.say(!!walk,geo+': the gallery offers a "Walk every screen" button distinct from "Play all"',walk&&walk.text);
    const playAll=await b.page.evaluate(()=>{const els=[...document.querySelectorAll('button')];const x=els.find(e=>/Play all/.test(e.innerText||''));return x?(x.innerText||'').trim():null;});
    L.say(!!playAll,geo+': "Play all" still exists - the walk is an ADDITION, not a replacement (gate 15 asserts those cards)',playAll);
    L.say(!!walk&&/\d+, about [\d.]+ min/.test(walk.text),geo+': the button says how many screens and roughly how long, because he has to hold the phone for it',walk&&walk.text);
    await b.tapCt('preview-walk',1500);
    // the opening frame names the build
    const c0=await cap(b);
    L.say(!!c0&&/FULL WALK of #\d+/.test(c0),geo+': the opening frame names the BUILD this recording is of',c0);
    L.say(!!c0&&c0.indexOf(b.geo.w+'x'+b.geo.h)>=0,geo+': the caption carries the MEASURED viewport, so a single extracted frame says which geometry it came from',c0);
    // the dev row must be gone now
    const dev2=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="home-devrow"]');if(!e)return null;const r=e.getBoundingClientRect();return {w:r.width,h:r.height};});
    L.say(dev2===null,geo+': NO dev-only chrome in shot - the Preview and feedback buttons are gone while recording',dev2);
    // and the walk actually reaches its screens, in order
    const seen=[];const t0=Date.now();
    while(Date.now()-t0<42000&&seen.length<WANT.length){
      const c=await cap(b);
      if(c){const m=c.match(/·\s*([A-Z][A-Z0-9-]*)\s*·/);const id=m?m[1]:null;if(id&&seen[seen.length-1]!==id)seen.push(id);}
      await b.page.waitForTimeout(400);
    }
    L.note(geo+': caption ids seen in order: '+JSON.stringify(seen));
    L.say(seen.length>=WANT.length,geo+': the walk reached at least '+WANT.length+' screens without stalling',{seen:seen,want:WANT});
    L.say(JSON.stringify(seen.slice(0,WANT.length))===JSON.stringify(WANT),geo+': and it reached them IN THE ORDER the walk declares',{seen:seen.slice(0,WANT.length),want:WANT});
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error during the walk beyond the allowed engine trap',{other:bad.slice(0,2)});
    await b.close();
  }
},'FULL-WALK');
