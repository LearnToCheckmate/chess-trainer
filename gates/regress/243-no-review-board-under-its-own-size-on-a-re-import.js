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
// THE ROUTE IS THE GALLERY'S ASK CARDS, AND THAT IS A DEPENDENCY, STATED (the lead's rule: reproduce the state directly unless no other
// route reaches it). No real-tap route does, measured: a stored game re-opened from the Review list (08:12Z), 'Analyze this line' from
// Play after a review (08:22Z), a lesson's 'Analyze this line' after a review (08:58Z) and the same chip tapped AGAIN on an analysed line
// (09:05Z) all paint the waiting board at its own fitted size (240 at 375x679, 359 at 375x812) on today's bundle - none reaches the floor.
// So this gate taps the EXP card (a first import: a review now in state) and then the AUD card (its lesson, then an import of the same
// game). WHEN EITHER CARD LEAVES THE ASK QUEUE this gate goes RED on its ROUTE line by name - never green over nothing - and the route
// must move to whichever card then imports while a review is in state.
// WHAT IT ASSERTS, at 375x679, 375x812 and 375x761, with a requestAnimationFrame recorder of the widest 8-column grid on every frame:
//  TC-R441 ROUTE       both cards exist in the ask queue and were tapped.
//  TC-R441a DENOMINATOR EXP's first import painted its waiting board (its own fitted size, W0) and then a review (a review in state), and
//                       AUD's import made a NEW review object (window.__ctReview, marked before the tap) - so the re-import happened.
//  TC-R441b            no frame of AUD's whole card paints a board narrower than W0 (less 0.6): the floor flash (192) is red here.
const L=require('../lib');
const GEOS=[['375x679','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}],['375x761','kunal761']];
const TOL=0.6;
const REC=()=>{window.__g243=[];const t0=performance.now();let on=true;window.__g243Stop=()=>{on=false;};
  const f=()=>{const gs=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const g=gs.sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
    const w=g?Math.round(g.getBoundingClientRect().width*100)/100:null;const last=window.__g243[window.__g243.length-1];const aw=!!document.querySelector('[data-ct="ana-wait"]');
    if(!last||last.w!==w||last.aw!==aw)window.__g243.push({t:Math.round(performance.now()-t0),w,aw});if(on)requestAnimationFrame(f);};requestAnimationFrame(f);};
const tapAsk=(b,id)=>b.page.evaluate((id)=>{const c=[...document.querySelectorAll('button[data-ct="ask-card"]')].find(x=>new RegExp('\\u00b7\\s*'+id+'\\s*\\u00b7').test(x.innerText||''));if(!c)return false;c.click();return true;},id);
const openGallery=async(b)=>{await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.waitFor({state:'visible',timeout:15000});await gb.click();await b.settle(500);};
const capGone=(b)=>b.page.evaluate(()=>!document.querySelector('[data-ct="rec-cap"]'));
L.run(async()=>{
  for(const [lab,geo] of GEOS){
    const b=await L.launch({geo,name:'g243-'+lab,store:{ct_pool:'3'}});await b.open();
    let route={exp:false,aud:false},err=null,exp=[],aud=[],marked=false,fresh=false;
    try{
      await openGallery(b);await b.page.evaluate(REC);
      route.exp=await tapAsk(b,'EXP');
      if(route.exp){for(let i=0;i<70;i++){await b.settle(2000);if(await capGone(b))break;}}
      exp=await b.page.evaluate(()=>{window.__g243Stop();return window.__g243;});
      marked=await b.page.evaluate(()=>{if(!window.__ctReview)return false;try{window.__ctReview.__g243old=1;}catch(e){return false;}return true;});
      await openGallery(b);await b.page.evaluate(REC);
      route.aud=await tapAsk(b,'AUD');
      if(route.aud){for(let i=0;i<70;i++){await b.settle(2000);if(await capGone(b))break;}}
      aud=await b.page.evaluate(()=>{window.__g243Stop();return window.__g243;});
      fresh=await b.page.evaluate(()=>!!window.__ctReview&&!window.__ctReview.__g243old);
    }catch(e){err=String(e).slice(0,160);}
    L.say(!err&&route.exp&&route.aud,lab+': TC-R441 ROUTE the gallery\'s EXP and AUD ask cards exist and were tapped - when either leaves the queue this line is red by name and the route must move (see the header)',{route,err});
    const expWait=exp.filter(x=>x.aw&&x.w!=null).map(x=>x.w);const W0=expWait.length?Math.min(...expWait):null;
    const expRev=exp.some(x=>!x.aw&&x.w!=null&&W0!=null&&x.w>W0+TOL);
    L.say(W0!=null&&expRev&&marked&&fresh&&aud.length>=10,lab+': TC-R441a DENOMINATOR EXP\'s first import painted its waiting board ('+W0+') and then a review (a review in state), and AUD\'s import made a NEW review ('+aud.length+' recorded changes over AUD\'s card)',{W0,expRev,marked,fresh,expN:exp.length,audN:aud.length});
    const under=aud.filter(x=>x.w!=null&&W0!=null&&x.w<W0-TOL);
    L.say(W0!=null&&under.length===0,lab+': TC-R441b no frame of AUD\'s card paints a board narrower than the waiting screen\'s own size ('+W0+'), so a re-import while a review is in state never flashes the board at the fit loop\'s floor (192 before the fix)',{under:under.slice(0,6),minAud:aud.filter(x=>x.w!=null).reduce((m,x)=>Math.min(m,x.w),1e9)});
    await b.close();
  }
},'243-no-review-board-under-its-own-size-on-a-re-import');
