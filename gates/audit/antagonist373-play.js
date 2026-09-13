// gates/audit/antagonist373-play.js  ANTAGONIST #373: A-11 (Analyze / Copy 43px tap boxes via negative margins)
// and A-12 (moves panel always laid out; Moves toggles visibility; the board never moves). The gate measured card
// k8 (4 plies) at kunal and 390. Here: 320x568, 430x932, kunal with a stored profile (ct_evalunder 0), at 0 plies
// and at 20 plies; the tap box's top and bottom edges are probed with elementFromPoint and real clicks.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const GEOS=[['se','se',{}],['430','430',{}],['kunal-prof','kunal',{ct_evalunder:'0',ct_hideEval:'1'}]];
const panelState=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');if(!e)return null;const r=e.getBoundingClientRect();const st=getComputedStyle(e);return {vis:st.visibility,h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,inner:Math.round((e.scrollHeight-e.clientHeight)*10)/10};});
const edgeProbe=(b,ct)=>b.page.evaluate((id)=>{const e=document.querySelector('[data-ct="'+id+'"]');if(!e)return null;const r=e.getBoundingClientRect();const cx=r.left+r.width/2;const who=(x,y)=>{const t=document.elementFromPoint(x,y);if(!t)return 'none';if(t===e||e.contains(t))return 'self';const bt=t.closest('button,a,[data-ct]');return (bt?(bt.getAttribute('data-ct')||(bt.innerText||'').trim().slice(0,14)):t.tagName)+'';};const span=e.querySelector('span');const sr=span?span.getBoundingClientRect():null;return {h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,chipH:sr&&Math.round(sr.height*10)/10,atTop1:who(cx,r.top+1),atBot1:who(cx,r.bottom-1),aboveTop:who(cx,r.top-2),belowBot:who(cx,r.bottom+2),atMid:who(cx,r.top+r.height/2)};},ct);
L.run(async()=>{
  for(const [tag,geo,store] of GEOS){
    const b=await L.launch({geo,name:'ant-play-'+tag,store});await b.open();
    // 0 plies: Pass & Play, move 0, Moves shown
    try{
      await P.states['pp-m0'](b);await b.settle(300);
      const m0=await b.metrics();const p0=await panelState(b);const an0=await b.rect('[data-ct="moves-analyze"]');
      L.note(tag+': 0 plies: board '+JSON.stringify(m0.board)+' panel '+JSON.stringify(p0)+' analyze present '+(!!an0));
      await P.tapBtn(b,/^Moves$/,600);const m1=await b.metrics();const p1=await panelState(b);
      await P.tapBtn(b,/^Moves$/,600);const m2=await b.metrics();const p2=await panelState(b);
      L.say(m0.board&&m1.board&&m2.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.w-m2.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6&&Math.abs(m0.board.top-m2.board.top)<0.6,tag+': A-12 at 0 plies the board keeps width and top across Moves off/on',{w:[m0.board.w,m1.board&&m1.board.w,m2.board&&m2.board.w],top:[m0.board.top,m1.board&&m1.board.top,m2.board&&m2.board.top]});
      L.say(!!p1&&!!p2&&p1.vis!==p2.vis,tag+': A-12 at 0 plies the panel is laid out and its visibility toggles',{off:p1,on:p2});
      L.say(m1.over.over<=0&&m2.over.over<=0&&m2.over.docScroll===0,tag+': A-12 at 0 plies nothing scrolls',[m1.over.over,m2.over.over]);
    }catch(e){L.say(false,tag+': 0-ply section threw',String(e).slice(0,160));}
    // 20 plies
    try{
      await P.states['pp-captures'](b);await b.move('g1','f3',220);await b.move('b8','c6',220);await b.settle(500);
      const n=await P.plies(b);L.note(tag+': plies on the board: '+n);
      await P.ensureMovesShown(b);await b.settle(300);
      const m0=await b.metrics();const p0=await panelState(b);
      const an=await edgeProbe(b,'moves-analyze'),cp=await edgeProbe(b,'moves-copy');
      L.say(!!an&&an.h>=40&&!!cp&&cp.h>=40,tag+': A-11 at 20 plies Analyze/Copy tap boxes >=40px',{analyze:an&&an.h,copy:cp&&cp.h,chip:an&&an.chipH});
      L.say(!!an&&an.atTop1==='self'&&an.atBot1==='self'&&!!cp&&cp.atTop1==='self'&&cp.atBot1==='self',tag+': A-11 the top and bottom edges of both tap boxes hit the button itself (nothing overlaps)',{analyze:an,copy:cp});
      L.note(tag+': what sits just above / below the tap boxes: analyze '+(an&&an.aboveTop)+' / '+(an&&an.belowBot)+', copy '+(cp&&cp.aboveTop)+' / '+(cp&&cp.belowBot));
      const before=await b.text('[data-ct="moves-copy"]');await b.page.mouse.click((await b.rect('[data-ct="moves-copy"]')).x+30,cp.top+1);await b.settle(250);const afterTop=await b.text('[data-ct="moves-copy"]');
      await b.settle(2200);const cr=await b.rect('[data-ct="moves-copy"]');await b.page.mouse.click(cr.x+30,cr.y+cr.h-1);await b.settle(250);const afterBot=await b.text('[data-ct="moves-copy"]');
      L.say(before!==afterTop&&before!==afterBot,tag+': A-11 a click at the top edge and at the bottom edge of Copy both fire (label changes)',{before,afterTop,afterBot});
      await b.shot('play-'+tag+'-20ply');
      await P.tapBtn(b,/^Moves$/,600);const m1=await b.metrics();const p1=await panelState(b);
      await P.tapBtn(b,/^Moves$/,600);const m2=await b.metrics();const p2=await panelState(b);
      L.say(m0.board&&m1.board&&m2.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.w-m2.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6&&Math.abs(m0.board.top-m2.board.top)<0.6,tag+': A-12 at 20 plies the board keeps width and top across Moves off/on',{w:[m0.board.w,m1.board&&m1.board.w,m2.board&&m2.board.w],top:[m0.board.top,m1.board&&m1.board.top,m2.board&&m2.board.top]});
      L.say(!!p1&&!!p2&&p1.vis==='hidden'&&p2.vis==='visible',tag+': A-12 at 20 plies Moves hides then shows the panel content',{off:p1,on:p2});
      L.say(m0.over.over<=0&&m1.over.over<=0&&m2.over.over<=0&&m2.over.docScroll===0,tag+': A-12 at 20 plies nothing scrolls (shown / hidden / shown)',[m0.over.over,m1.over.over,m2.over.over]);
      L.say(!!p2&&p2.inner<=0||(p2&&p2.inner>0),tag+': info: the moves panel scrolls internally by '+(p2&&p2.inner)+'px at 20 plies (panel h '+(p2&&p2.h)+')');
      await b.shot('play-'+tag+'-20ply-moves-hidden');
      // the Analyze tap box top edge: does it fire?
      const ar=await b.rect('[data-ct="moves-analyze"]');await b.page.mouse.click(ar.x+ar.w/2,ar.y+1);await b.settle(1500);
      const left=!(await b.page.locator('[data-ct="play-moverow"]').last().isVisible().catch(()=>false));const txt=await b.texts();
      L.say(left,tag+': A-11 a click at the top edge of Analyze leaves the game (analysis/import opens)',txt.slice(0,6).join(' | '));
    }catch(e){L.say(false,tag+': 20-ply section threw',String(e).slice(0,160));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-PLAY');
