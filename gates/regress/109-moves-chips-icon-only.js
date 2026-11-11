'use strict';
// gates/regress/109-moves-chips-icon-only.js - THE MOVES ROW'S ANALYZE AND COPY ARE SMALL ICON BUTTONS WITH A FULL 44PT TAP BOX. TC-R189a..c, US-R122.
//
// WHY [#550 answer a6; jobs/copy-chip-flash-slides-analyze-under-the-finger-2026-09-29; Kunal in chat, Wed 11 Nov 2026 about 9:10 to 9:20am
// EST: "I thought we discussed making those buttons icons and making them smaller"; the answer: "Analyze and Copy become small icon-only buttons
// that keep a full-size tap area (44 points)"]. The second half of the answer (move them into the row above) waits on run question q34.
//
// WHAT IT ASSERTS, at kunal761 and se, a lesson's demo end (drive/lesson demo-end), moves-analyze and moves-copy:
//  (a) TC-R189a DENOMINATOR both controls are on screen; each draws an svg and NO text, and carries an aria-label naming it (Analyze / Copy).
//  (b) TC-R189b each tap box (the button's border box) is at least 44 wide and 44 tall, and the visible chip inside it is at most 32px wide.
//  (c) TC-R189c the two tap boxes do not overlap (min of x- and y-overlap <= 0), so neither steals the other's tap.
const L=require('../lib');const D=require('../drive/lesson');
L.run(async()=>{
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'chips-'+geo});await b.open();
    let ok=true;try{await D.states['demo-end'](b);await b.settle(800);}catch(e){ok=false;}
    const m=ok?await b.page.evaluate(()=>{const q=k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return null;const r=e.getBoundingClientRect(),sp=e.querySelector('span'),sr=sp?sp.getBoundingClientRect():null;
      return {txt:(e.innerText||'').trim(),aria:e.getAttribute('aria-label')||'',svg:!!e.querySelector('svg'),l:r.left,r:r.right,t:r.top,b:r.bottom,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,chipW:sr?Math.round(sr.width*10)/10:null};};
      return {an:q('moves-analyze'),cp:q('moves-copy'),vw:innerWidth,vh:innerHeight};}):null;
    const both=!!m&&!!m.an&&!!m.cp;
    L.say(both&&[m.an,m.cp].every(x=>x.b>0&&x.t<m.vh&&x.l>=0&&x.r<=m.vw),geo+': TC-R189a DENOMINATOR the moves row\'s Analyze and Copy are on screen at the demo end',m);
    if(both){
      L.say(m.an.svg&&m.cp.svg&&m.an.txt===''&&m.cp.txt===''&&/^Analyze/.test(m.an.aria)&&/^Copy/.test(m.cp.aria),geo+': TC-R189a both are ICON-ONLY - an svg, no text ("'+m.an.txt+'", "'+m.cp.txt+'"), and an aria-label naming each ("'+m.an.aria+'", "'+m.cp.aria+'")',{an:m.an,cp:m.cp});
      L.say([m.an,m.cp].every(x=>x.w>=44&&x.h>=44&&x.chipW!=null&&x.chipW<=32),geo+': TC-R189b each keeps a full tap box (Analyze '+m.an.w+'x'+m.an.h+', Copy '+m.cp.w+'x'+m.cp.h+', at least 44x44) around a small chip (at most 32 wide: '+m.an.chipW+', '+m.cp.chipW+')',{an:m.an,cp:m.cp});
      const ov=Math.min(Math.min(m.an.r,m.cp.r)-Math.max(m.an.l,m.cp.l),Math.min(m.an.b,m.cp.b)-Math.max(m.an.t,m.cp.t));
      L.say(ov<=0,geo+': TC-R189c the two tap boxes do not overlap (overlap '+Math.round(ov*10)/10+'px)',{ov});
    }
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'109-moves-chips-icon-only');
