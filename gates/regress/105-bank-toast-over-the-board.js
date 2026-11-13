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
// CONTROL-RECORD: f4d2364 2026-11-11 total=9 red=2 scope=trial:2f43024ddf91 how=#550 answer a11: the tree before the move, whose bank toast sits at the top of the screen (centre y 22.5) - both TC-LS-060b lines red, the DENOMINATORS, TC-LS-060c and zero-errors green; the a11 trial dc61a6344ca6 reads 9 pass, 0 fail
// CONTROL-RECORD: 3e082a9 2026-11-13 total=23 red=4 scope=trial:fadbd1530b3f how=#550 TC-LS-060d (jobs/suite-never-asserts-after-a-success theFix (4)): the seam ignored - the bank auto-clear back at a fixed 2800ms whatever ct_celebrate_ms says - the 'STILL on screen 4.5s after' and 'a tap closes it' lines red at kunal761 and se, everything else green; on 08ba147127fb 23/0
// CONTROL-RECORD: 3e082a9 2026-11-13 total=23 red=14 scope=trial:19c1f0124d97 how=#550 TC-LS-060d: the bank celebration suppressed (both setCelebrate({kind:'bank'}) calls voided) - 060a/b/c and the 060d denominator, still-on-screen, board-under and tap lines red at both geometries; 060d's 'Complete!' and no-scroll lines stay green (they read the screen, not the celebration, and no control here reddens them). Run before the by-text locator learned the <b> title, which changes no line this control reds
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
  // TC-LS-060d [#550; jobs/suite-never-asserts-after-a-success-2026-09-27 theFix (4)]: THE STATE AFTER THE SUCCESS, HELD STILL. The bank
  // celebration clears itself after 2800ms, so until the ct_celebrate_ms seam (chess.jsx CELEB_MS; '0' = never auto-clear) no gate could take
  // an assertion on the screen it sits over. With the seam at '0' the celebration is read 4.5s after it appeared - past the shipped 2800 -
  // and must still be there, found by its WORDS as well as its hook; the board under it must be where it was in the frame it appeared, the
  // lesson must say the line is complete, nothing may scroll, and a tap must close it without moving the board.
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'bank-held-'+geo,store:{ct_celebrate_ms:'0'}});await b.open();
    await b.page.evaluate(()=>{window.__bank=null;new MutationObserver(()=>{const e=document.querySelector('[data-ct="celebrate"][data-kind="bank"]');if(e&&!window.__bank){const r=e.getBoundingClientRect();const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((p,q)=>q.getBoundingClientRect().width-p.getBoundingClientRect().width)[0];const gr=g?g.getBoundingClientRect():null;window.__bank={x:r.left+r.width/2,y:r.top+r.height/2,t:Date.now(),txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,60),bx:gr?gr.left+gr.width/2:null,by:gr?gr.top+gr.height/2:null};}}).observe(document.body,{subtree:true,childList:true});});
    let ok=true;try{await D.states['practice-complete'](b);}catch(e){ok=false;L.note(geo+' drive (held): '+String(e).slice(0,120));}
    const seen=await b.page.evaluate(()=>window.__bank);
    L.say(ok&&!!seen,geo+': TC-LS-060d DENOMINATOR with ct_celebrate_ms=0 the bank celebration appeared after a flawless practice run',{seen});
    const t0=seen?seen.t:Date.now();await b.page.waitForTimeout(Math.max(0,4500-(Date.now()-t0)));
    const held=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="celebrate"][data-kind="bank"]');
      const RE=/(banked|Line learned) \u00b7 flawless/,byText=[...document.querySelectorAll('div,span,b,strong,p')].filter(d=>RE.test(d.textContent||'')&&![...d.children].some(c=>RE.test(c.textContent||''))).filter(d=>{const r=d.getBoundingClientRect();return r.width>1&&r.height>1;});
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((p,q)=>q.getBoundingClientRect().width-p.getBoundingClientRect().width)[0];const gr=g?g.getBoundingClientRect():null;
      const root=document.getElementById('root');
      return {hook:!!e,text:byText.map(d=>d.textContent.trim().slice(0,50)),inHook:!!e&&byText.some(d=>e.contains(d)),bx:gr?gr.left+gr.width/2:null,by:gr?gr.top+gr.height/2:null,
        complete:/Complete!/.test(document.body.innerText||''),scroll:root?root.scrollHeight-root.clientHeight:null};});
    L.say(!!seen&&held.hook&&held.text.length>0&&held.inHook,geo+': TC-LS-060d 4.5s after it appeared - past the shipped 2800ms - the celebration is STILL on screen, by its hook and by its words ('+JSON.stringify(held.text)+')',held);
    L.say(!!seen&&seen.bx!=null&&held.bx!=null&&Math.abs(held.bx-seen.bx)<=0.5&&Math.abs(held.by-seen.by)<=0.5,geo+': TC-LS-060d the board under the held celebration is where it was in the frame the celebration appeared (centre '+(held.bx&&Math.round(held.bx))+','+(held.by&&Math.round(held.by))+' against '+(seen&&Math.round(seen.bx))+','+(seen&&Math.round(seen.by))+')',{seen,held});
    L.say(held.complete,geo+': TC-LS-060d under the celebration the lesson says the line is complete ("Complete!")',{complete:held.complete});
    L.say(held.scroll!=null&&held.scroll<=0,geo+': TC-LS-060d nothing scrolls under the held celebration ('+held.scroll+')',held.scroll);
    let closed=null;if(held.hook){await b.page.locator('[data-ct="celebrate"][data-kind="bank"]').first().click({timeout:3000}).catch(()=>{});await b.settle(500);
      closed=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((p,q)=>q.getBoundingClientRect().width-p.getBoundingClientRect().width)[0];const gr=g?g.getBoundingClientRect():null;
        return {gone:!document.querySelector('[data-ct="celebrate"][data-kind="bank"]'),bx:gr?gr.left+gr.width/2:null,by:gr?gr.top+gr.height/2:null};});}
    L.say(!!seen&&!!closed&&closed.gone&&closed.bx!=null&&Math.abs(closed.bx-seen.bx)<=0.5&&Math.abs(closed.by-seen.by)<=0.5,geo+': TC-LS-060d a tap closes the held celebration and the board does not move',closed);
    L.say(b.errs.length===0,geo+': TC-LS-060d zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'105-bank-toast-over-the-board');
