'use strict';
// gates/regress/243-no-review-board-under-its-own-size-on-a-re-import.js - A NEW IMPORT WHILE A REVIEW IS STILL IN STATE NEVER PAINTS A BOARD
// UNDER THE WAITING SCREEN'S OWN SIZE, ON ANY FRAME. TC-R441; US-R254.
//
// WHY [#553 B1; jobs/the-lesson-board-paints-half-width-for-its-first-half-second-on-entry-2026-11-25 (re-titled: Review's analysis-wait
// flash at the board floor); Amber: flags/amber-553-review-fit-loop-off-while-analysing]. Gate 15's walk imports the Opera Game three
// times. When EXP's review was still in state and AUD (or DSK) imported again from a lesson, inReview stayed true while analysing, so
// Review's fit loop measured the WAITING SCREEN (content 1114-1148px over a 679 page) and trimmed the board to its 192 floor; the waiting
// board and then the review painted that for 220-480ms before the full board came - a board jump. Measured per frame on 25 Nov
// (bundle a5c973667137): 375x679 192 at t=140700 and 243743, 375x812 192 at 140658 and 243666. The fix keeps the fit loop off while
// analysing (chess.jsx, _fitScreen).
// THE ROUTE IS THE GALLERY'S PLAY-ALL WALK, AND THAT IS A DEPENDENCY, STATED (the lead's rule: reproduce the state directly unless no
// other route reaches it). No real-tap route does, measured on 25 Nov: a stored game re-opened from the Review list (08:12Z), 'Analyze
// this line' from Play after a review (08:22Z), a lesson's 'Analyze this line' after a review (08:58Z) and the same chip tapped AGAIN on an
// analysed line (09:05Z) all paint the waiting board at its own fitted size. NOR DOES TAPPING THE TWO CARDS SEPARATELY: EXP, back to the
// gallery, then AUD, on the fix reverted (bundle 022238c41a10, 09:28-09:38Z) - AUD's lowest board was the waiting board's own 240 / 359 /
// 320. Only the walk's cards back to back (AUD and DSK following EXP's review with its moves view open) reach the floor. So this gate
// plays the walk, as gate 15 launches it (ct_pool 3), and reads AUD's and DSK's captions. WHEN THOSE CARDS LEAVE THE ASK QUEUE this gate
// goes RED on its ROUTE line by name - never green over nothing - and the route must move to whichever walk card then re-imports.
// WHAT IT ASSERTS, at 375x679 and 375x812 (where the floor frame was measured), with a requestAnimationFrame recorder of the widest
// 8-column grid on every frame and the caption it was under:
//  TC-R441 ROUTE       the walk holds EXP, AUD and DSK and reached RECORDING COMPLETE.
//  TC-R441a DENOMINATOR EXP's first import painted its waiting board (its own fitted size, W0) and then a review, and AUD's and DSK's
//                       imports each made a NEW review object (window.__ctReview, marked by the recorder when each caption appears).
//  TC-R441b            no frame under AUD's or DSK's caption paints a board narrower than W0 (less 0.6): the floor flash (192) is red here.
const L=require('../lib');
const GEOS=[['375x679','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}]];
const TOL=0.6;
const REC=()=>{window.__g243=[];window.__g243Fresh={};const t0=performance.now();let on=true,lastCap=null;window.__g243Stop=()=>{on=false;};
  const f=()=>{const ce=document.querySelector('[data-ct="rec-cap"]');const cap=ce?(ce.innerText||'').replace(/\s+/g,' '):'';const id=(/\s\d+\/\d+\s\u00b7\s([A-Z][A-Z0-9]*)/.exec(cap)||[])[1]||null;
    if(id!==lastCap){if(lastCap&&window.__g243Fresh[lastCap]&&window.__ctReview)window.__g243Fresh[lastCap].fresh=!window.__ctReview['__g243_'+lastCap];
      if(id){window.__g243Fresh[id]={marked:false,fresh:false};if(window.__ctReview){try{window.__ctReview['__g243_'+id]=1;window.__g243Fresh[id].marked=true;}catch(e){}}}lastCap=id;}
    if(id&&window.__g243Fresh[id]&&window.__ctReview&&!window.__ctReview['__g243_'+id]&&window.__g243Fresh[id].marked)window.__g243Fresh[id].fresh=true;
    const gs=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const g=gs.sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
    const w=g?Math.round(g.getBoundingClientRect().width*100)/100:null;const last=window.__g243[window.__g243.length-1];const aw=!!document.querySelector('[data-ct="ana-wait"]');
    if(!last||last.w!==w||last.aw!==aw||last.id!==id)window.__g243.push({t:Math.round(performance.now()-t0),w,aw,id});if(on)requestAnimationFrame(f);};requestAnimationFrame(f);};
L.run(async()=>{
  for(const [lab,geo] of GEOS){
    const b=await L.launch({geo,name:'g243-'+lab,store:{ct_pool:'3'}});await b.open();
    let err=null,done=false,rec=[],fresh={},ids=[];
    try{
      await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.waitFor({state:'visible',timeout:15000});await gb.click();await b.settle(500);
      ids=await b.page.evaluate(()=>[...document.querySelectorAll('button[data-ct="ask-card"]')].map(x=>((/\u00b7\s*([A-Z][A-Z0-9]*)\s*\u00b7/.exec(x.innerText||'')||[])[1])).filter(Boolean));
      await b.page.evaluate(REC);
      await b.page.locator('button',{hasText:/^Play( all \d+)? \(screen-record this\)$/}).first().click();
      for(let i=0;i<120;i++){await b.settle(5000);done=await b.page.evaluate(()=>{const c=document.querySelector('[data-ct="rec-cap"]');return !!c&&/RECORDING COMPLETE/i.test(c.innerText||'');});if(done)break;}
      ({rec,fresh}=await b.page.evaluate(()=>{window.__g243Stop();return {rec:window.__g243,fresh:window.__g243Fresh};}));
    }catch(e){err=String(e).slice(0,160);}
    const need=['EXP','AUD','DSK'];
    L.say(!err&&done&&need.every(x=>ids.includes(x)),lab+': TC-R441 ROUTE the walk holds EXP, AUD and DSK and reached RECORDING COMPLETE - when any of them leaves the queue this line is red by name and the route must move (see the header)',{ids,done,err});
    const expWait=rec.filter(x=>x.id==='EXP'&&x.aw&&x.w!=null).map(x=>x.w);const W0=expWait.length?Math.min(...expWait):null;
    const expRev=rec.some(x=>x.id&&x.id.startsWith('EXP')&&!x.aw&&x.w!=null&&W0!=null&&x.w>W0+TOL);
    const fr=['AUD','DSK'].map(x=>({id:x,marked:!!(fresh[x]&&fresh[x].marked),fresh:!!(fresh[x]&&fresh[x].fresh)}));
    L.say(W0!=null&&expRev&&fr.every(x=>x.marked&&x.fresh),lab+': TC-R441a DENOMINATOR EXP\'s first import painted its waiting board ('+W0+') and then a review, and AUD\'s and DSK\'s imports each made a NEW review while one was in state',{W0,expRev,fr});
    const under=rec.filter(x=>(x.id==='AUD'||x.id==='DSK')&&x.w!=null&&W0!=null&&x.w<W0-TOL);
    L.say(W0!=null&&under.length===0,lab+': TC-R441b no frame under AUD\'s or DSK\'s caption paints a board narrower than the waiting screen\'s own size ('+W0+'), so a re-import while a review is in state never flashes the board at the fit loop\'s floor (192 before the fix)',{under:under.slice(0,6)});
    await b.close();
  }
},'243-no-review-board-under-its-own-size-on-a-re-import');
// CONTROL-RECORD: 22ce1e17 2026-11-25 total=7 red=2 scope=trial:022238c41a10 how=#553 B1, the fit-loop fix reverted (_fitScreen without !(mode==='analyze'&&analyzing)) in a trial of this tree, 09:42-09:55Z: TC-R441b red at 375x679 (AUD 192 at t=140593 in the waiting screen; DSK 192 at 243616 and 243817, 237.03 at 244027) and at 375x812 (AUD 192 at 140604; DSK 192 at 243659 and 243779); ROUTE and DENOMINATOR green (W0 240 and 359, AUD and DSK each made a fresh review)
// CONTROL-RECORD (B1 #553), not a control: the fix (trial 070e4f16e7b2), 09:55-10:07Z: 7 pass 0 fail
// CONTROL-RECORD (B1 #553), not a control: the first version of this gate tapped EXP and then AUD as SEPARATE cards; on the fix reverted (09:28-09:38Z) AUD's lowest board was the waiting board's own size at all three geometries, so TC-R441b went green on the broken tree - which is why the route is the back-to-back walk
