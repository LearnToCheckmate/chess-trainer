'use strict';
// gates/regress/125-fit-loop-idle-wake.js - A TRANSIENT OVERFLOW THAT ENDS WITH NO RE-RENDER NO LONGER LEAVES THE BOARD SHRUNK. US-R133 / TC-R201a..c.
//
// WHY [#550 item (91), jobs/a-transient-overflow-that-ends-without-a-re-render-leaves-the-board-shrunk-on-tall-phones-2026-11-07, #549's
// antagonist A residual A4-F]: the Play/Review/Puzzles fit loop is re-armed by #root's ResizeObserver (fitBump). Once the loop has trimmed
// the board to fit, #root sits at its minHeight, so when the content that overflowed goes away the content shrinks inside a root that does
// not change, nothing re-arms the loop, and the board stays trimmed. chess.jsx's idle wake (#550, beside fitIdleRef) asks every 600ms
// while the loop is idle whether the board is trimmed with room to grow, or overflows, and wakes the loop - never twice on one reading.
// WHAT IT READS: the bundle under test (CT_APP). Each screen is reached by its driver, settled, then an in-flow block is put at the top of
// the app's root (the transient), the board is read once the loop has trimmed for it, the block is removed with NO re-render, and the board
// is read again 3.5 s later. A separate launch per screen reads the board three times at rest (1.5, 3 and 6 s) to prove the wake does not
// move a board nothing disturbed.
const L=require('../lib');
const P=require('../drive/play'),R=require('../drive/review'),Z=require('../drive/puzzles');
const bw=(b)=>b.page.evaluate(()=>{let m=0,t=0;for(const e of document.querySelectorAll('div'))if(/repeat\(8,/.test(e.style.gridTemplateColumns||'')){const r=e.getBoundingClientRect();if(r.width>m){m=r.width;t=r.top;}}
  const root=document.getElementById('root');let bot=0;for(const k of root.children){const s=getComputedStyle(k);if(s.position==='fixed'||s.position==='absolute')continue;bot=Math.max(bot,k.getBoundingClientRect().bottom);}
  return {w:Math.round(m*100)/100,top:Math.round(t*10)/10,sh:root.scrollHeight,ch:root.clientHeight};});
const SCREENS=[['Play vs the computer at 4 plies',b=>P.states['cpu-4ply'](b)],['the review move screen',b=>R.states['moves-ply10'](b)],['a library puzzle',b=>Z.states['train'](b)]];
const GEOS=[['kunal761','kunal761'],['375x667',{w:375,h:667,safe:'',label:'375x667'}]];
L.run(async()=>{
  for(const [nm,go] of SCREENS)for(const [gn,geo] of GEOS){const tag=gn+' '+nm;
    const b=await L.launch({geo,name:'idle-wake-'+gn,store:{ct_pool:'3'}});await b.open();let ok=true;try{await go(b);await b.settle(1500);}catch(e){ok=false;}
    const fresh=await bw(b);
    await b.page.evaluate(()=>{const root=document.getElementById('root');const d=document.createElement('div');d.id='ct-idle-wake-kick';d.style.cssText='height:120px;flex:0 0 120px';root.firstElementChild.prepend(d);});
    await b.page.waitForTimeout(2500);const shrunk=await bw(b);
    const gone=await b.page.evaluate(()=>{const d=document.getElementById('ct-idle-wake-kick');if(d)d.remove();return !document.getElementById('ct-idle-wake-kick');});
    await b.page.waitForTimeout(3500);const after=await bw(b);
    L.say(ok&&gone&&shrunk.w<fresh.w-20,'TC-R201a '+tag+' PRECONDITION the transient really shrank the board ('+fresh.w+' -> '+shrunk.w+') and was removed with no re-render',{fresh,shrunk,gone});
    L.say(after.w>=fresh.w-1,'TC-R201a '+tag+' once it is gone the board comes back to at least its fresh width within 3.5 s ('+shrunk.w+' -> '+after.w+', fresh '+fresh.w+')',{fresh,shrunk,after});
    L.say(after.sh<=after.ch+1,'TC-R201b '+tag+' and nothing overflows the app root where it lands (scrollHeight '+after.sh+' of '+after.ch+')',after);
    L.say(b.errs.length===0,'TC-R201 '+tag+' zero app errors',b.errs.slice(0,3));
    await b.close();}
  for(const [nm,go] of SCREENS){const tag='kunal761 '+nm;
    const b=await L.launch({geo:'kunal761',name:'idle-wake-rest',store:{ct_pool:'3'}});await b.open();try{await go(b);}catch(e){}
    const seq=[];for(const t of [1500,1500,3000]){await b.page.waitForTimeout(t);seq.push(await bw(b));}
    L.say(seq.every(x=>x.w===seq[0].w&&x.top===seq[0].top)&&seq[0].w>0,'TC-R201c '+tag+' a board nothing disturbed does not move at rest: '+seq.map(x=>x.w+'@'+x.top).join(' -> '),seq);
    await b.close();}
},'125-fit-loop-idle-wake');
