'use strict';
// gates/regress/230-review-waiting-screen.js - A REVIEW'S WAITING SCREEN: THE BOARD STEPS THROUGH THE GAME, THE REAL TIME, KEEP THE APP
// OPEN, TODAY'S PUZZLE, STOP THAT ASKS ONCE AND KEEPS THE MOVES CHECKED, AND A READY BANNER ON ANOTHER SCREEN. TC-R386..391, US-R238.
//
// WHY [#553 batch 14 B2; jobs/long-reviews-keep-running-in-the-app-and-say-plainly-that-the-app-must-stay-open-with-the-real-time-a-puzzle-
// while-waiting-and-a-ready-banner-2026-11-22]. Kunal, 22 Nov 2026, after a Deeper review sat at 38% while he was in another app: the
// screen said "This takes a few seconds." even at Deepest (about 8 minutes) and nothing told him when it was done. His picks: card 71
// "build-as-shown" (docs/run-answers orchestrator-B14-PREP3-2026-11-23), its progress display replaced by card 75 option 3 "board" - the
// board steps through each move as it is analysed, with a thin progress strip (orchestrator-B14-PREP6-2026-11-24) - and his "cross out of
// it" (orchestrator-B14-CANCEL-REVIEW-2026-11-23): a close control that asks once, Stop review or Keep going, and stopping keeps the moves
// already graded so a restart resumes where it stopped.
//
// HOW: the Opera Game (33 plies) pasted and reviewed at Quick on ONE pool worker (ct_pool 1, so the groups are searched in order from move
// 0 and the review lasts long enough to watch); between the two reviews of a geometry the cache and the kept groups are cleared.
// WHAT IT ASSERTS, at 375x761 (kunal761) and 320x568 (se), each line prefixed with its geometry:
//  TC-R386 the board STEPS: [data-ct=ana-board] is a painted 8x8 board, and over the review it shows at least 8 different positions
//          (data-ply and the squares' occupancy both change), and the strip [data-ct=ana-strip-fill] grows.
//  TC-R387 the words: "Analyzing move K of 33 · P%" (K and P rising), "Quick review · " then a time ("in all" or "left"), and the
//          words "a few seconds" are nowhere on the screen.
//  TC-R388 the box says "Keep the app open" and that the phone pauses the review; today's puzzle is offered with a Try it of 44px or
//          more; Stop is reachable by scrolling the page's own scroller (at 320x568 it is below the fold).
//  TC-R389 Stop asks once (Stop review / Keep going); Keep going leaves the review running (the percentage rises after it); Stop review
//          goes straight to the games list (the Analyze button is back within 1s) and no review summary arrives after it.
//  TC-R390 the moves checked are kept (localStorage ct_anapart holds the stopped review's groups), and the same review started again
//          picks up there: its first reading is at or past the kept share, and it finishes.
//  TC-R391 a review keeps running on another screen (Puzzles) and says so there: "Your review is ready" (rev-ready) appears on
//          Puzzles, and its Open goes to the finished review (rev-summary).
//  and zero app errors at each geometry.
const L=require('../lib');const R=require('../drive/review');
const GEOS=(process.env.CT_G230_GEOS||'kunal761,se').split(',');
const LBL={kunal761:'375x761',se:'320x568'};
const st=(b)=>b.page.evaluate(()=>{const q=s=>document.querySelector(s);const bd=q('[data-ct="ana-board"]');const f=q('[data-ct="ana-strip-fill"]');const sq=bd?[...bd.children]:[];
  return {on:!!q('[data-ct="ana-wait"]'),ply:bd?bd.dataset.ply:null,n:sq.length,occ:sq.map(x=>x.querySelector('img,svg,span')?1:0).join(''),bw:bd?Math.round(bd.getBoundingClientRect().width):0,
    fill:f?f.getBoundingClientRect().width:0,prog:(q('[data-ct="ana-progress"]')||{}).textContent||'',eng:(q('[data-ct="ana-engines"]')||{}).textContent||'',
    summary:!!q('[data-ct="rev-summary"]'),body:document.body.innerText};});
const pctOf=(t)=>{const m=String(t).match(/(\d+)%$/);return m?+m[1]:null;};
async function start(b){await b.page.locator('textarea').first().fill(R.PGN_OPERA);await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:100});}
async function clearStore(b){await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');localStorage.removeItem('ct_anapart');}catch(e){}});}
L.run(async()=>{
  for(const G of GEOS){const P=(LBL[G]||G)+' ';
    const b=await L.launch({geo:G,name:'230-wait-'+G,store:{ct_pool:'1'}});
    await b.open();await b.tile('Review');await clearStore(b);
    // ── review 1: watch it, ask to stop, keep going, then stop ──
    await start(b);
    const seen=[];let s=null;const t0=Date.now();
    while(Date.now()-t0<60000){s=await st(b);if(s.on&&s.n===64)seen.push(s);if(s.on&&(pctOf(s.prog)||0)>=30)break;if(s.summary)break;await b.page.waitForTimeout(300);}
    const plies=new Set(seen.map(x=>x.ply)),occs=new Set(seen.map(x=>x.occ));
    L.say(seen.length>0&&seen.every(x=>x.n===64&&x.bw>=150),P+'TC-R386 DENOMINATOR the waiting screen paints an 8x8 board ('+(seen[0]?seen[0].bw:0)+'px, '+seen.length+' readings)',{n:seen.length});
    L.say(plies.size>=8&&occs.size>=8,P+'TC-R386 the board steps through the game: '+plies.size+' positions by data-ply, '+occs.size+' by the squares',{plies:[...plies]});
    const f0=seen.length?seen[0].fill:0,f1=seen.length?seen[seen.length-1].fill:0;
    L.say(f1>f0+5,P+'TC-R386 the progress strip grows ('+f0.toFixed(1)+' -> '+f1.toFixed(1)+'px)',{f0,f1});
    const last=seen[seen.length-1]||{prog:'',eng:'',body:''};
    const pm=String(last.prog).match(/^Analyzing move (\d+) of 33 · (\d+)%$/);
    const pFirst=seen.map(x=>pctOf(x.prog)).find(x=>x!=null);
    L.say(!!pm&&(pctOf(last.prog)>(pFirst||0)),P+'TC-R387 the line reads "Analyzing move K of 33 · P%" and rises: "'+last.prog+'" (first '+pFirst+'%)',{prog:last.prog});
    L.say(/^Quick review · (about 20 seconds in all|less than a minute left|about \d+ minutes? left)$/.test(last.eng),P+'TC-R387 the time line names the level and a real time: "'+last.eng+'"',{eng:last.eng});
    L.say(seen.length>0&&seen.every(x=>!/few seconds/i.test(x.body)),P+'TC-R387 "a few seconds" is nowhere on the waiting screen');
    const box=await b.page.evaluate(()=>{const k=document.querySelector('[data-ct="ana-keep-open"]');const t=document.querySelector('[data-ct="ana-suggest-title"]');const tr=document.querySelector('[data-ct="ana-suggest-try"]');
      return {keep:k?k.innerText:'',sug:t?t.textContent:'',tryH:tr?tr.getBoundingClientRect().height:0,tryT:tr?tr.textContent:''};});
    L.say(/^Keep the app open/.test(box.keep)&&/pauses the review when you leave the app/.test(box.keep),P+'TC-R388 the box says to keep the app open and why',{keep:box.keep});
    L.say(/^(Today's puzzle: \d of 5|Puzzle goal done today)$/.test(box.sug)&&box.tryT==='Try it'&&box.tryH>=44,P+'TC-R388 today\'s puzzle is offered: "'+box.sug+'", Try it '+box.tryH+'px',box);
    // Stop is reached by scrolling the nearest finger-scrollable ancestor, then it must sit above the tab bar
    const reach=await b.page.evaluate(async()=>{const el=document.querySelector('[data-ct="ana-stop"]');if(!el)return {ok:false,why:'no stop'};let a=el.parentElement;
      while(a&&a!==document.body){const cs=getComputedStyle(a);if(/(auto|scroll)/.test(cs.overflowY)&&a.scrollHeight>a.clientHeight)break;a=a.parentElement;}
      const tb=document.querySelector('[data-ct="tabbar"]');const lim=tb?tb.getBoundingClientRect().top:innerHeight;
      const r0=el.getBoundingClientRect();if(r0.bottom<=lim&&r0.top>=0)return {ok:true,scrolled:false,bottom:r0.bottom,lim};
      if(!a||a===document.body)return {ok:false,why:'below the fold with no scroller',bottom:r0.bottom,lim};
      a.scrollTop=a.scrollHeight;await new Promise(r=>setTimeout(r,250));const r1=el.getBoundingClientRect();return {ok:r1.bottom<=lim&&r1.top>=0,scrolled:true,bottom:r1.bottom,lim};});
    L.say(reach.ok,P+'TC-R388 Stop is on screen above the tab bar'+(reach.scrolled?' after scrolling the page':'')+' (bottom '+Math.round(reach.bottom||0)+', tab bar '+Math.round(reach.lim||0)+')',reach);
    let asked=false,kept=false,stopped=false,noSum=false,pBefore=null,pAfter=null,partN=0,partFrac=0;
    try{
      await b.page.locator('[data-ct="ana-stop"]').click();await b.page.waitForTimeout(250);
      asked=await b.page.evaluate(()=>{const y=document.querySelector('[data-ct="ana-stop-yes"]'),n=document.querySelector('[data-ct="ana-stop-no"]');return !!(y&&n&&y.textContent==='Stop review'&&n.textContent==='Keep going'&&document.querySelector('[data-ct="ana-wait"]'));});
      await b.page.locator('[data-ct="ana-stop-no"]').click();pBefore=pctOf((await st(b)).prog);
      const tk=Date.now();while(Date.now()-tk<15000){const x=await st(b);if(!x.on)break;pAfter=pctOf(x.prog);if(pAfter>pBefore&&pAfter>=35)break;await b.page.waitForTimeout(300);}
      kept=(await st(b)).on&&pAfter>pBefore&&!(await b.page.locator('[data-ct="ana-stop-ask"]').count());
      await b.page.locator('[data-ct="ana-stop"]').click();await b.page.waitForTimeout(200);
      const ts=Date.now();await b.page.locator('[data-ct="ana-stop-yes"]').click();
      try{await b.page.getByText(/^⚡ Analyze [Gg]ame$/).first().waitFor({state:'visible',timeout:1000});stopped=!(await st(b)).on&&Date.now()-ts<=1500;}catch(e){stopped=false;}
      await b.page.waitForTimeout(4000);noSum=!(await st(b)).summary&&!(await st(b)).on;
      const pp=await b.page.evaluate(()=>{try{const a=JSON.parse(localStorage.getItem('ct_anapart')||'{}');const k=Object.keys(a);return k.length?Object.keys(a[k[0]].r||{}).length:0;}catch(e){return -1;}});
      partN=pp;partFrac=pp/34;
    }catch(e){L.note(P+'stop drive: '+String(e).slice(0,160));}
    L.say(asked,P+'TC-R389 Stop asks once: "Stop review" and "Keep going", the review still on screen');
    L.say(kept,P+'TC-R389 Keep going leaves the review running ('+pBefore+'% -> '+pAfter+'%)',{pBefore,pAfter});
    L.say(stopped,P+'TC-R389 Stop review goes straight back to the games list');
    L.say(noSum,P+'TC-R389 and no review summary arrives after it (4s later)');
    L.say(partN>=8,P+'TC-R390 the moves checked are kept: '+partN+' of 34 positions in ct_anapart',{partN});
    // ── the same review again: it picks up where it stopped ──
    let first=null,done2=false;
    try{await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:50});const tr=Date.now();
      while(Date.now()-tr<30000){const x=await st(b);const p=pctOf(x.prog);if(x.on&&p!=null&&p>0){first=p;break;}if(x.summary)break;await b.page.waitForTimeout(100);}
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});done2=true;}catch(e){L.note(P+'resume drive: '+String(e).slice(0,160));}
    L.say(first!=null&&partN>=8&&first>=Math.floor(partFrac*100)-1,P+'TC-R390 started again it picks up there: first reading '+first+'% against '+Math.round(partFrac*100)+'% kept',{first,partFrac});
    L.say(done2,P+'TC-R390 and the resumed review finishes (its summary is reached)');
    // ── review 2: leave for Puzzles; the banner says it is ready there ──
    let away=false,ready=false,opened=false,rtxt='';
    try{await b.tapText(/Back to games/,{wait:400});}catch(e){try{await b.page.locator('[data-ct="rev-back"]').first().click();}catch(_){}}
    await clearStore(b);
    try{await start(b);const ta=Date.now();while(Date.now()-ta<30000){const x=await st(b);if(x.on&&(pctOf(x.prog)||0)>=1)break;await b.page.waitForTimeout(200);}
      away=(await st(b)).on;await b.tab('Puzzles');
      const tw=Date.now();while(Date.now()-tw<180000){if(await b.page.locator('[data-ct="rev-ready"]').count())break;await b.page.waitForTimeout(400);}
      const onPz=await b.page.evaluate(()=>!document.querySelector('[data-ct="ana-wait"]')&&/Puzzle goal/.test(document.body.innerText));
      rtxt=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-ready"]');return e?e.innerText:'';});ready=onPz&&/^Your review is ready/.test(rtxt);
      if(ready){await b.page.locator('[data-ct="rev-ready-open"]').click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:5000});opened=!(await b.page.locator('[data-ct="rev-ready"]').count());}
    }catch(e){L.note(P+'away drive: '+String(e).slice(0,160));}
    L.say(away,P+'TC-R391 DENOMINATOR a fresh review was running when he left for Puzzles');
    L.say(ready,P+'TC-R391 on Puzzles the banner says "Your review is ready": "'+rtxt.replace(/\n/g,' / ')+'"',{rtxt});
    L.say(opened,P+'TC-R391 its Open goes to the finished review, and the banner is gone');
    L.say(b.errs.length===0,P+'TC-R386 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'230-review-waiting-screen');
