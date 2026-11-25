'use strict';
// gates/regress/242-nothing-pulses-for-ever-at-rest.js - A SCREEN LEFT ALONE STOPS ANIMATING. US-R252 / TC-R436.
//
// WHY [#553 B3, jobs/speed-check-regressions-2026-11-12, SPD-10 of docs/speed-check-2026-11-12]: the Puzzles roadmap's active tier glow (the
// ctGlow keyframes in index.html) pulsed for ever - 134 style recalculations and 0.18 s of main thread a minute on a screen nobody touches. It
// now pulses four times (about 9 s) and rests (amber flags/amber-553-roadmap-glow-stops).
// WHAT IT READS: the bundle under test (CT_APP), Puzzles roadmap on a fresh store at kunal761 and 320x568. The animations are found by WHAT
// THEY ARE (document.getAnimations(), animationName ctGlow), not by a hook this build added (CLAUDE.md, #432), so the tree before is read the
// same way.
//  TC-R438 the engine is not fetched in Home's first 2 s, is fetched by 6 s on Home alone, and at once on leaving Home for Play (SPD-05).
//  TC-R436 PRECONDITION the roadmap runs at least one ctGlow animation (the active tier); every one has a finite iteration count; and 11 s
//          later (four pulses of 2.2 s plus slack) none is still running.
// KNOW ITS LIMIT: other screens' animations are not swept; the 600 ms fit watchdog SPD-10 also names is kept on purpose (it clears with its
// screen and does nothing at rest unless the board overflows) and is not read here. Reduced motion is not set, so the animation exists.
// CONTROL-RECORD: 12d4b83d 2026-11-25 total=8 red=4 scope=trial:059dfa672fd1 how=#553 B3 THE SUBJECT REMOVED: the tree before (the glow 'infinite') - both finite-repeat lines (Infinity) and both still-running lines red at kunal761 and se; the preconditions and error lines green
// CONTROL-RECORD: 998df569 2026-11-25 total=14 red=2 scope=trial:10a45e6e4ec4 how=#553 B3 SPD-05 THE SUBJECT REMOVED: the tree before (the engine started at mount) - TC-R438 'not fetched in the first 2 s on Home' (first request 1052 ms BEFORE open() returned) and 'leaving Home for Play fetches it at once' (0 after the tap, 1 before) red; the TC-R436 lines and the 'fetched by 6 s' line green
// CONTROL-RECORD: 4cb95133 2026-11-25 total=15 red=2 scope=trial:f23f541d2f01 how=#553 B3, TC-R438 re-clocked from the mount: the engine at mount (sfWant starts true, SPD-05 undone) - the idle line red (first request 37 ms after mount) and the Play line red (fetched before the tap); 15/0 three times on e370bd84's app 80f8304d4a5d (gaps 2978, 2979, 2977 ms)
// CONTROL-RECORD: 4cb95133 2026-11-25 total=15 red=1 scope=trial:877c313319ab how=#553 B3, SF_IDLE_MS cut to 1500 - the idle line red (1469 ms after mount, under 2800)
// CONTROL-RECORD: 4cb95133 2026-11-25 total=15 red=1 scope=trial:3b69b1cdcfbb how=#553 B3, SF_IDLE_MS cut to 2600, just under the 2800 line - the idle line red (2573 ms after mount): the 200 ms tolerance bites
const L=require('../lib');const Z=require('../drive/puzzles');
const IDLE_MS=(()=>{try{const m=/const SF_IDLE_MS=(\d+);/.exec(require('fs').readFileSync(require('path').join(L.ROOT,'chess.jsx'),'utf8'));return m?+m[1]:0;}catch(e){return 0;}})();   // SPD-05's idle start, read from the source (a trial bundle built with another value is graded against the contract)
const READ=`(()=>document.getAnimations().filter(a=>a.animationName==='ctGlow').map(a=>{const t=a.effect&&a.effect.getComputedTiming?a.effect.getComputedTiming():{};return {play:a.playState,iter:t.iterations===Infinity?'Infinity':t.iterations};}))()`;
L.run(async()=>{
  for(const geo of ['kunal761','se']){const b=await L.launch({geo,name:'g242-'+geo});await b.open();await b.settle(800);
    let ok=true;try{await Z.states['roadmap'](b);}catch(e){ok=false;L.say(false,'TC-R436 '+geo+' reached the Puzzles roadmap',String(e).slice(0,160));}
    if(!ok){await b.close();continue;}
    await b.settle(600);const a0=await b.page.evaluate(READ);
    L.say(a0.length>=1,'TC-R436 '+geo+' PRECONDITION the roadmap runs a ctGlow animation on the active tier ('+a0.length+')',a0);
    L.say(a0.length>=1&&a0.every(x=>x.iter!=='Infinity'&&x.iter<=4),'TC-R436 '+geo+' every glow has a finite repeat, at most four ('+a0.map(x=>x.iter).join(', ')+')',a0);
    await b.page.waitForTimeout(11000);const a1=await b.page.evaluate(READ);
    L.say(a0.length>=1&&a1.every(x=>x.play!=='running'),'TC-R436 '+geo+' 11 s later no glow is still running ('+a1.map(x=>x.play).join(', ')+')',a1);
    L.say(b.errs.length===0,'TC-R436 '+geo+' zero app errors',b.errs.slice(0,3));await b.close();}
  // TC-R438 [#553 B3, SPD-05, amber flags/amber-553-engine-starts-after-home]: the engine is not fetched while Home sits on a cold start for its
  // first 2 s; it IS fetched by 6 s on Home alone (the idle start), and at once when he leaves Home for Play. Requests are read from the network
  // (the worker script stockfish-*.js), installed before open(), so the tree before - which fetched it at mount - reads the same way.
  for(const geo of ['kunal761']){
    /* #553 B3 RE-CLOCKED [the landing's pre-check red, 25 Nov: 'first at 1996 ms after open']: the 2 s used to be counted from when b.open()
       RETURNS, which is the app's mount plus a 900 ms settle and the text-metrics read (1306-1314 ms after navigation, measured three times),
       while SPD-05's idle start counts its 3 s from the mount - so the engine's on-time fetch (2960-2976 ms after mount) landed 1958-1984 ms
       'after open', about 30 ms inside the old line, and the line flipped. Both ends are now read in the page on one clock: the mount (#root
       holding the app, polled every 5 ms from before the page's scripts) and the worker script's resource-timing start. THE BAR IS THE
       CONTRACT: the first engine request comes at least SF_IDLE_MS (chess.jsx, SPD-05's 3000 ms, read from the source) less a stated 200 ms
       tolerance after mount. The player-facing promise - nothing in Home's first 2 s - is inside that with room to spare. */
    {const b=await L.launch({geo,name:'g242-eng-home'});const seen=[];b.page.on('request',r=>{if(/stockfish-[^/]*\.js(\?|$)/.test(r.url()))seen.push(Date.now());});
     await b.ctx.addInitScript(()=>{const iv=setInterval(()=>{const r=document.getElementById('root');if(r&&r.children.length&&!document.getElementById('boot')){window.__ctMount=performance.now();clearInterval(iv);}},5);});
     await b.open();await b.page.waitForTimeout(6000);const at6=seen.length;
     const tm=await b.page.evaluate(()=>{const e=performance.getEntriesByType('resource').filter(x=>/stockfish-[^/]*\.js/.test(x.name)).map(x=>x.startTime);return {mount:window.__ctMount==null?null:Math.round(window.__ctMount),first:e.length?Math.round(Math.min(...e)):null};});
     const gap=(tm.mount!=null&&tm.first!=null)?tm.first-tm.mount:null;
     L.say(IDLE_MS>0&&tm.mount!=null,'TC-R438 '+geo+' PRECONDITION the app mount was read in the page ('+tm.mount+' ms after navigation) and SF_IDLE_MS from chess.jsx ('+IDLE_MS+' ms)',tm);
     L.say(tm.mount!=null&&(tm.first==null||gap>=IDLE_MS-200),'TC-R438 '+geo+' the engine is not fetched while Home sits idle - nothing in its first 2 s: the first engine request is '+(gap==null?'none':gap+' ms')+' after the app mounted (at least '+(IDLE_MS-200)+': SPD-05\'s '+IDLE_MS+' ms idle start less 200 ms)',{gap,mount:tm.mount,first:tm.first});
     L.say(at6>=1,'TC-R438 '+geo+' and it is fetched by 6 s on Home alone, with nothing tapped ('+at6+')');
     L.say(b.errs.length===0,'TC-R438 '+geo+' zero app errors (Home)',b.errs.slice(0,3));await b.close();}
    {const b=await L.launch({geo,name:'g242-eng-play'});const seen=[];b.page.on('request',r=>{if(/stockfish-[^/]*\.js(\?|$)/.test(r.url()))seen.push(Date.now());});
     await b.open();await b.page.waitForTimeout(300);const before=seen.length;const tTap=Date.now();let ok=true;try{await b.tile('Play');}catch(e){ok=false;}
     await b.page.waitForTimeout(1500);const after=seen.filter(t=>t>=tTap).length;
     L.say(ok&&after>=1,'TC-R438 '+geo+' leaving Home for Play fetches the engine at once ('+after+' within 1.5 s of the tap, '+before+' before it)',{before,after});
     L.say(b.errs.length===0,'TC-R438 '+geo+' zero app errors (Play)',b.errs.slice(0,3));await b.close();}
  }
},'242-nothing-pulses-for-ever-at-rest');
