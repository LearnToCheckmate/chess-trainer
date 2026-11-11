'use strict';
// gates/regress/105-bank-toast-over-the-board.js - THE "LINE LEARNED" TOAST SHOWS OVER THE BOARD AND CLOSES ITSELF. TC-LS-060a..c, US-LS-14.
//
// WHY [#550, batch 10 item (84); jobs/explanation-boxes-must-not-time-out-2026-09-24; the orchestrator's answer a11 on docs/run-questions
// build__1794388896663-q11, from Kunal's card (11 Nov 2026): "Yes. And instead of at the top can you show it over the board for those 3
// seconds. Similar to how you show black wins"]. The 2.8s 'Line learned · flawless' bank toast sat fixed at the top of the screen; it now
// sits over the centre of the board, as a game result does, and still closes by itself.
//
// WHAT IT ASSERTS, at kunal761 and se, a lesson's practice line played through flawless (drive/lesson 'practice-complete', hints off):
//  (a) TC-LS-060a DENOMINATOR the toast ([data-ct=celebrate][data-kind=bank]) appeared, read within its 2.8s.
//  (b) TC-LS-060b its centre lies inside the board's rect, within 2px of the board's centre (over the board, not at the top).
//  (c) TC-LS-060c it is gone 3.5s later without a tap (it may close by itself).
// CONTROL-RECORD: 5bab9b7 2026-11-11 total=9 red=2 scope=trial:2f43024ddf91 how=#550 answer a11: the tree before the move, whose bank toast sits at the top of the screen (centre y 22.5) - both TC-LS-060b lines red, the DENOMINATORS, TC-LS-060c and zero-errors green; the a11 trial dc61a6344ca6 reads 9 pass, 0 fail
const L=require('../lib');const D=require('../drive/lesson');
L.run(async()=>{
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'bank-'+geo});await b.open();
    await b.page.evaluate(()=>{window.__bank=null;new MutationObserver(()=>{const e=document.querySelector('[data-ct="celebrate"][data-kind="bank"]');if(e&&!window.__bank){const r=e.getBoundingClientRect();const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((p,q)=>q.getBoundingClientRect().width-p.getBoundingClientRect().width)[0];const gr=g?g.getBoundingClientRect():null;window.__bank={x:r.left+r.width/2,y:r.top+r.height/2,t:Date.now(),txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,60),bx:gr?gr.left+gr.width/2:null,by:gr?gr.top+gr.height/2:null};}}).observe(document.body,{subtree:true,childList:true});});
    let ok=true;try{await D.states['practice-complete'](b);}catch(e){ok=false;L.note(geo+' drive: '+String(e).slice(0,120));}
    const seen=await b.page.evaluate(()=>window.__bank);
    const bd=(await b.metrics()).board;
    L.say(ok&&!!seen,geo+': TC-LS-060a DENOMINATOR the "Line learned" bank toast appeared after a flawless practice run',{seen});
    const cx=seen&&seen.bx!=null?seen.bx:null,cy=seen&&seen.by!=null?seen.by:null;   // the board read in the same frame the toast appeared, since the board settles after the line ends
    L.say(!!seen&&!!bd&&cx!=null&&Math.abs(seen.x-cx)<=2&&Math.abs(seen.y-cy)<=2,geo+': TC-LS-060b the toast sits over the CENTRE of the board ('+(seen&&Math.round(seen.x))+','+(seen&&Math.round(seen.y))+' against the board centre '+(cx&&Math.round(cx))+','+(cy&&Math.round(cy))+'), not at the top of the screen',{seen,board:bd});
    await b.page.waitForTimeout(3500);
    const still=await b.page.evaluate(()=>!!document.querySelector('[data-ct="celebrate"][data-kind="bank"]'));
    L.say(!!seen&&!still,geo+': TC-LS-060c and it is gone 3.5s later without a tap (it closes by itself)',{still});
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'105-bank-toast-over-the-board');
