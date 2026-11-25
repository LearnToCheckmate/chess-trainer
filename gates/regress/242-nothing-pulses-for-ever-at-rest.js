'use strict';
// gates/regress/242-nothing-pulses-for-ever-at-rest.js - A SCREEN LEFT ALONE STOPS ANIMATING. US-R252 / TC-R436.
//
// WHY [#553 B3, jobs/speed-check-regressions-2026-11-12, SPD-10 of docs/speed-check-2026-11-12]: the Puzzles roadmap's active tier glow (the
// ctGlow keyframes in index.html) pulsed for ever - 134 style recalculations and 0.18 s of main thread a minute on a screen nobody touches. It
// now pulses four times (about 9 s) and rests (amber flags/amber-553-roadmap-glow-stops).
// WHAT IT READS: the bundle under test (CT_APP), Puzzles roadmap on a fresh store at kunal761 and 320x568. The animations are found by WHAT
// THEY ARE (document.getAnimations(), animationName ctGlow), not by a hook this build added (CLAUDE.md, #432), so the tree before is read the
// same way.
//  TC-R436 PRECONDITION the roadmap runs at least one ctGlow animation (the active tier); every one has a finite iteration count; and 11 s
//          later (four pulses of 2.2 s plus slack) none is still running.
// KNOW ITS LIMIT: other screens' animations are not swept; the 600 ms fit watchdog SPD-10 also names is kept on purpose (it clears with its
// screen and does nothing at rest unless the board overflows) and is not read here. Reduced motion is not set, so the animation exists.
// CONTROL-RECORD: 12d4b83d 2026-11-25 total=8 red=4 scope=trial:059dfa672fd1 how=#553 B3 THE SUBJECT REMOVED: the tree before (the glow 'infinite') - both finite-repeat lines (Infinity) and both still-running lines red at kunal761 and se; the preconditions and error lines green
const L=require('../lib');const Z=require('../drive/puzzles');
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
},'242-nothing-pulses-for-ever-at-rest');
