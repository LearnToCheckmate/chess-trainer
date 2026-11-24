'use strict';
// gates/regress/231-moves-chips-leave-the-move-list.js - A TAP ON THE MOVE LIST IS NEVER TAKEN BY THE ANALYZE OR COPY BUTTON ABOVE IT, AND
// THE TWO BUTTONS STILL ANSWER OVER THEIR CHIPS AND THE ROW. TC-R392..394, US-R239.
//
// WHY [#553 batch 14 B2; jobs/copy-chip-flash-slides-analyze-under-the-finger-2026-09-29, its folded job moves-chip-padding-band-covers-the-
// move-list-2026-09-29, the part the 15 Nov check (checkVerdict_orch1115) found NOT addressed]. The MOVES row's Analyze and Copy keep a 44x44
// tap box around a 22px-tall chip by padding and an equal negative margin (#430, #550 a6), and the box is stacked above the page (zIndex 1),
// so its lower 11px reached down over the move list's first line: at 320x568 on an endgame lesson's demo end the token Kh8 lay wholly inside
// Analyze's box, and a tap on it opened the analysis board. Kunal's comment on the question (Desk B10-Q6, 11 Nov 2026) asked for small icon
// buttons and chose no trade; the run's pick, "keep them 44pt wide but trim the part that reaches down over the move list", is built here by
// stacking the list above the two buttons' boxes, so wherever the two meet the list answers and everywhere else the buttons do.
// Amber: flags/amber-553-moves-chips-leave-the-list.
//
// WHAT IT ASSERTS, at kunal761 on a lesson's demo end and at 320x568 (se) on the first endgame lesson's demo end (drive/lesson):
//  TC-R392 DENOMINATOR the move list shows at least 3 move tokens on screen, and both buttons are on screen.
//  TC-R393 no point of any move token's visible part (scanned every 2px, clipped to the list's own scroll box) hits moves-analyze or
//          moves-copy by elementFromPoint; and no point of the list's visible box does either.
//  TC-R394 each button still answers: every point of its painted chip hits it, and so does every point of its tap box ABOVE the list's
//          top edge (the part that covers nothing); the box is still at least 44 wide.
const L=require('../lib');const D=require('../drive/lesson');
const SPECS=[{geo:'kunal761',lbl:'375x761',state:'demo-end'},{geo:'se',lbl:'320x568',state:'endgame-demo-end'}];
L.run(async()=>{
  for(const sp of SPECS){const P=sp.lbl+' '+sp.state+' ';
    const b=await L.launch({geo:sp.geo,name:'231-'+sp.geo});await b.open();
    let ok=true;try{await D.states[sp.state](b);await b.settle(900);}catch(e){ok=false;L.note(P+'drive: '+String(e).slice(0,140));}
    const m=ok?await b.page.evaluate(()=>{
      const an=document.querySelector('[data-ct="moves-analyze"]'),cp=document.querySelector('[data-ct="moves-copy"]');if(!an||!cp)return {err:'no buttons'};
      const head=document.querySelector('[data-ct="moves-head-row"]');let list=head?head.nextElementSibling:null;while(list&&!list.classList.contains('scroll'))list=list.nextElementSibling;
      if(!list)return {err:'no list'};
      const lr=list.getBoundingClientRect();const vw=innerWidth,vh=innerHeight;
      const own=(x,y)=>{const e=document.elementFromPoint(x,y);if(!e)return null;return e.closest('[data-ct="moves-analyze"]')?'an':e.closest('[data-ct="moves-copy"]')?'cp':'other';};
      const toks=[...list.querySelectorAll('span')].filter(s=>s.children.length===0&&/\S/.test(s.textContent));
      let tokPts=0,tokHits=0;const hitToks=[];let onScreen=0;
      for(const t of toks){const r=t.getBoundingClientRect();const x0=Math.max(r.left,lr.left+1),x1=Math.min(r.right,lr.right-1),y0=Math.max(r.top,lr.top+1),y1=Math.min(r.bottom,lr.bottom-1);
        if(x1<=x0||y1<=y0||y0>=vh||x0>=vw)continue;onScreen++;let h=0;
        for(let x=x0+0.5;x<x1;x+=2)for(let y=y0+0.5;y<y1;y+=2){tokPts++;const o=own(x,y);if(o==='an'||o==='cp'){tokHits++;h++;}}
        if(h)hitToks.push(t.textContent+':'+h);}
      // the list's box as painted: its rounded corners (border-radius) are outside it, and a hit test there falls through to what is behind
      const rad=parseFloat(getComputedStyle(list).borderTopLeftRadius)||0;
      const inRound=(x,y)=>{const cx=x<lr.left+rad?lr.left+rad:x>lr.right-rad?lr.right-rad:x,cy=y<lr.top+rad?lr.top+rad:y>lr.bottom-rad?lr.bottom-rad:y;return (x-cx)*(x-cx)+(y-cy)*(y-cy)<=(rad-1)*(rad-1)||(cx===x||cy===y);};
      let boxPts=0,boxHits=0;for(let x=lr.left+1.5;x<lr.right-1;x+=3)for(let y=lr.top+0.5;y<Math.min(lr.bottom,vh)-1;y+=2){if(!inRound(x,y))continue;boxPts++;const o=own(x,y);if(o==='an'||o==='cp')boxHits++;}
      const btn=(el,k)=>{const r=el.getBoundingClientRect(),c=el.querySelector('span').getBoundingClientRect();let cP=0,cH=0,aP=0,aH=0;
        for(let x=c.left+0.5;x<c.right;x+=1.5)for(let y=c.top+0.5;y<c.bottom;y+=1.5){cP++;if(own(x,y)===k)cH++;}
        const top=Math.min(r.bottom,lr.top);for(let x=r.left+0.5;x<r.right;x+=2)for(let y=r.top+0.5;y<top;y+=2){aP++;if(own(x,y)===k)aH++;}
        return {w:r.width,h:r.height,t:r.top,b:r.bottom,chip:[c.left,c.top,c.width,c.height].map(v=>Math.round(v*10)/10),cP,cH,aP,aH,below:Math.max(0,r.bottom-lr.top)};};
      return {toks:toks.length,onScreen,tokPts,tokHits,hitToks,boxPts,boxHits,listTop:lr.top,an:btn(an,'an'),cp:btn(cp,'cp'),vw,vh};}):{err:'not reached'};
    const good=ok&&!m.err;
    L.say(good&&m.onScreen>=3,P+'TC-R392 DENOMINATOR the move list shows '+(good?m.onScreen:0)+' move tokens on screen and both buttons are there',good?{toks:m.toks,onScreen:m.onScreen}:m);
    if(good){
      L.say(m.tokPts>0&&m.tokHits===0,P+'TC-R393 no point of a move token hits Analyze or Copy ('+m.tokHits+' of '+m.tokPts+' points'+(m.hitToks.length?': '+m.hitToks.join(', '):'')+')',{hitToks:m.hitToks});
      L.say(m.boxPts>0&&m.boxHits===0,P+'TC-R393 and no point of the list\'s visible box does ('+m.boxHits+' of '+m.boxPts+')');
      for(const [k,n] of [['an','Analyze'],['cp','Copy']]){const x=m[k];
        L.say(x.cP>0&&x.cH===x.cP&&x.aP>0&&x.aH===x.aP&&x.w>=44,P+'TC-R394 '+n+' still answers over its whole chip ('+x.cH+' of '+x.cP+') and over its tap box above the list ('+x.aH+' of '+x.aP+'), box '+Math.round(x.w*10)/10+' wide; its box reaches '+Math.round(x.below*10)/10+'px into the list, which the list now answers',x);}
    }
    L.say(b.errs.length===0,P+'TC-R392 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'231-moves-chips-leave-the-move-list');
