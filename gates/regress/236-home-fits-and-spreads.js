'use strict';
// gates/regress/236-home-fits-and-spreads.js - HOME ON A PHONE FITS THE SCREEN AND SPREADS EVENLY DOWN TO ITS FOOT, THE COLOURS AND STYLE
// ROW LAST. TC-R413..414, US-R240.
//
// WHY [#553 batch 14 B2; jobs/home-spread-down-to-the-tab-bar-with-a-board-and-play-sign-as-the-play-icon-2026-11-18]. Kunal, FB-06 (17 Nov
// 2026): spread Home's content evenly over the whole height; card 86, his pick A (run-answers orchestrator-B14-Q13-2026-11-24): the colours
// and style row stays the last item, spaced like everything else, and the 320x568 overflow is fixed first. Amber:
// flags/amber-553-home-phone-fit-and-spread. Measured on 475be0b8 before the change: a returning player's Home ended 137px above the foot at
// 375x761 and 188px at 375x812, and ran 56px past the screen at 320x568 (a brand-new player: 21, 72 and 172 over).
//
// HOW: Home on a fresh launch (the store: a returning player has ct_demodone set, so the New here card is gone; a brand-new player has
// nothing), settled 2.5s. The column is [data-ct="home-col"] and its items are its laid-out children; the colours and style row is the
// one holding the button whose aria-label begins 'Colors & pieces' (found by what it says, not by a hook this build added).
// WHAT IT ASSERTS, each line prefixed with its geometry and player:
//  TC-R413 at 320x568 a returning player's Home does not scroll (the scroller's scrollHeight within 1px of its height) and the colours and
//          style row ends inside it; a brand-new player's Home is scaled no smaller than 85 percent and its colours and style row is
//          reached by scrolling Home's own scroller.
//  TC-R414 at 375x761 (his phone), 375x812 and 390x844, both players: Home does not scroll, the colours and style row is the LAST item and
//          ends within 2px of the column's foot (the scroller's height less its bottom padding), and every gap between two items is at
//          least what it was before the change (0 between the pawns, the Today card and the tiles; 16 under New here; 12 above the
//          colours and style row) - and where the free space allows (a returning player at all three, a brand-new player at 375x812 and
//          390x844), the gaps are within 8px of each other.
const L=require('../lib');
const STORES={returning:{ct_demodone:'1'},fresh:{}};
const BASE={returning:[0,0,0,12],fresh:[0,0,16,0,12]};   // the gaps on 475be0b8, measured (claude/agents notes in the commit)
const CASES=[['kunal761','375x761'],[{w:375,h:812,safe:''},'375x812'],['390','390x844'],['se','320x568']];
const read=(b)=>b.page.evaluate(()=>{const sc=document.querySelector('[data-ct="home-scroller"]');const col=document.querySelector('[data-ct="home-col"]');if(!sc||!col)return null;
  const kids=[...col.children].filter(x=>{const cs=getComputedStyle(x);return cs.position!=='absolute'&&cs.position!=='fixed'&&x.getBoundingClientRect().height>0;});
  const r=kids.map(x=>x.getBoundingClientRect());const gaps=r.slice(1).map((q,i)=>Math.round((q.top-r[i].bottom)*10)/10);
  const look=[...document.querySelectorAll('button')].find(x=>/^Colors & pieces/.test(x.getAttribute('aria-label')||''));
  const lastHasLook=!!look&&kids.length>0&&kids[kids.length-1].contains(look);
  const cs=getComputedStyle(sc);const foot=sc.getBoundingClientRect().top+sc.clientHeight-parseFloat(cs.paddingBottom);
  return {n:kids.length,gaps,lastBottom:r.length?Math.round(r[r.length-1].bottom*10)/10:null,foot:Math.round(foot*10)/10,scH:sc.scrollHeight,scC:sc.clientHeight,zoom:parseFloat(getComputedStyle(col).zoom)||1,lastHasLook,
    lookTop:look?look.getBoundingClientRect().top:null,lookBottom:look?look.getBoundingClientRect().bottom:null};});
L.run(async()=>{
  for(const [geo,lbl] of CASES){for(const who of ['returning','fresh']){const P=lbl+' '+who+' ';
    const b=await L.launch({geo,name:'236-'+lbl+'-'+who,store:STORES[who],dev:false});await b.open();await b.settle(2500);   // the PLAYER's Home: the developer tools add a dev row and the build stamp under the colours and style row
    const m=await read(b);
    L.say(!!m&&m.n===BASE[who].length+1&&m.lastHasLook,P+'TC-R413 DENOMINATOR Home is up with its '+(BASE[who].length+1)+' items and the colours and style row last ('+(m?m.n:0)+' items)',m);
    if(m&&lbl==='320x568'){
      if(who==='returning')L.say(m.scH<=m.scC+1&&m.lookBottom!=null&&m.lookBottom<=m.foot+1,P+'TC-R413 Home fits the screen: no scrolling ('+m.scH+' in '+m.scC+'), the colours and style row ends at '+Math.round(m.lookBottom)+' within the foot '+m.foot+' (scale '+m.zoom+')',m);
      else{const re=await b.page.evaluate(()=>{const sc=document.querySelector('[data-ct="home-scroller"]');sc.scrollTop=sc.scrollHeight;return new Promise(r=>setTimeout(()=>{const look=[...document.querySelectorAll('button')].find(x=>/^Colors & pieces/.test(x.getAttribute('aria-label')||''));const q=look.getBoundingClientRect();r({top:q.top,bottom:q.bottom,vh:innerHeight});},300));});
        L.say(m.zoom>=0.85&&re.bottom<=re.vh&&re.top>=0,P+'TC-R413 a brand-new player\'s Home is scaled no smaller than 85 percent ('+m.zoom+') and its colours and style row is reached by scrolling Home ('+Math.round(re.top)+'..'+Math.round(re.bottom)+' of '+re.vh+')',{zoom:m.zoom,re});}
    }else if(m){
      const base=BASE[who];const ok1=m.scH<=m.scC+1&&m.lastHasLook&&Math.abs(m.lastBottom-m.foot)<=2;
      L.say(ok1,P+'TC-R414 Home does not scroll and its last item, the colours and style row, ends at the column\'s foot ('+m.lastBottom+' against '+m.foot+')',m);
      const notLess=m.gaps.length===base.length&&m.gaps.every((v,i)=>v>=base[i]-0.6);
      L.say(notLess,P+'TC-R414 no gap is smaller than it was ('+JSON.stringify(m.gaps)+' against '+JSON.stringify(base)+')',m.gaps);
      const even=!(who==='fresh'&&lbl==='375x761');
      if(even)L.say(Math.max(...m.gaps)-Math.min(...m.gaps)<=8,P+'TC-R414 the gaps are even, within 8px of each other ('+JSON.stringify(m.gaps)+')',m.gaps);
      else L.note(P+'a brand-new player on his phone has 21px free, not enough to even every gap; the gaps read '+JSON.stringify(m.gaps));
    }
    L.say(b.errs.length===0,P+'TC-R413 zero app errors',b.errs.slice(0,3));
    await b.close();}}
},'236-home-fits-and-spreads');
