'use strict';
// gates/regress/217-puzzle-prev-next-named-and-clear.js - THE PUZZLE PREV AND NEXT ARE NAMED, ON SCREEN AND CLEAR OF THE TAB BAR AT
// REST, SIDEWAYS AND UPRIGHT, AND A REAL TAP ON EACH DOES WHAT IT SAYS. TC-R353..355, US-R227.
//
// WHY [#553 batch 14 B2; jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03]. Found at #547: sideways the pair
// read '‹ Prev' / 'Next ›' with no accessible name, and at 730x375 it sat at 330.5-382.5 under a tab bar starting at 319, so a tap at
// rest landed on a tab. #548 named it; #550 (Kunal's Option A, answer a8) moved the tabs to a rail on the right. Gate 114 holds the rail
// sideways and gate 39 TC-PZ-LAND the names at two sizes; neither taps the pair, and neither looks upright, where the same pair
// must also stay clear of the bottom tab row. This gate is the job's whole close condition in one place, at every size the job names
// plus his phone and the 320 floor.
//
// WHAT IT ASSERTS on the first training puzzle (gates/drive/puzzles.js 'train'), at 730x375, 844x390, 667x375 and 761x375 sideways and
// kunal761 (375x761, insets 51/31) and 320x568 upright:
//  TC-R353 (DENOMINATOR, its own line) the puzzle screen is up, the board is measured, and the nav pair is found by WHAT IT IS - sideways
//          by its painted words, upright by its row's data-ct (pz-prev / pz-next) - not by the name under test.
//  TC-R354 exactly one painted button is named 'Previous puzzle' and one 'Next puzzle', and they are the pair TC-R353 found.
//  TC-R355a each is wholly on screen, 44px or taller, its box does not intersect the tab bar's, and its centre hit-tests to itself -
//          at REST: nothing is scrolled first, so a pair that is only reachable after a scroll is red.
//  TC-R355b a real mouse tap at Next's centre changes the position on the board, and a real tap at Prev's centre brings the first back.
// CONTROL-RECORD: 0b17d54 2026-11-24 total=36 red=12 scope=trial:df4719c8bd5f how=#553 B2, the pair gates/pairs/jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03.json: the sideways pair's row moved 60px down (position relative, top 60) - TC-R355a Prev and Next and TC-R355b red at 730x375, 844x390, 667x375 and 761x375, upright green; the aria-labels removed (trial:65186643fed3) reds TC-R354 and TC-R355b (the second tap finds Prev by its name) at the four sideways sizes; Next without from (trial:0381a205e925, the tree before #553) reds TC-R355b alone at the four; the tree (trial:fac6db05d4e9) 36/0. Pairs verdict CHECKED at base 0b17d54
const L=require('../lib');
const Z=require('../drive/puzzles');
const SIZES=[{k:{w:730,h:375,safe:''},n:'730x375'},{k:{w:844,h:390,safe:''},n:'844x390'},{k:{w:667,h:375,safe:''},n:'667x375'},
  {k:{w:761,h:375,safe:''},n:'761x375'},{k:'kunal761',n:'375x761'},{k:'se',n:'320x568'}];
const only=process.env.CT_G217_GEOS?process.env.CT_G217_GEOS.split(','):null;
L.run(async()=>{
  for(const g of SIZES){if(only&&only.indexOf(g.n)<0)continue;const tag=g.n;
    const b=await L.launch({geo:g.k,name:'pz217-'+g.n});await b.open();
    let ok=true;try{await Z.states['train'](b);await b.settle(500);}catch(e){ok=false;L.note(tag+': the train state threw: '+String(e).slice(0,140));}
    const m=ok?await b.page.evaluate(()=>{
      const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
      const bs=[...document.querySelectorAll('button')].filter(vis);
      const side=innerWidth>innerHeight;
      // found by what it IS, not by the name under test
      const fp=side?bs.filter(x=>/^‹ Prev$/.test((x.innerText||'').trim())):[...document.querySelectorAll('[data-ct="pz-prev"]')].filter(vis);
      const fn=side?bs.filter(x=>/^Next ›$/.test((x.innerText||'').trim())):[...document.querySelectorAll('[data-ct="pz-next"]')].filter(vis);
      const np=bs.filter(x=>x.getAttribute('aria-label')==='Previous puzzle'),nn=bs.filter(x=>x.getAttribute('aria-label')==='Next puzzle');
      const tb=document.querySelector('[data-ct="tabbar"]');const t=tb?tb.getBoundingClientRect():null;
      const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const one=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        const inter=!!t&&r.left<t.right-0.5&&r.right>t.left+0.5&&r.top<t.bottom-0.5&&r.bottom>t.top+0.5;
        return {x:+r.left.toFixed(1),y:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),h:+r.height.toFixed(1),cx:r.left+r.width/2,cy:r.top+r.height/2,
          hit:!!h&&(h===e||e.contains(h)),hitWhat:h?(h.getAttribute('aria-label')||(h.innerText||'').trim().slice(0,16)||h.tagName):null,underTab:inter};};
      return {side,vw:innerWidth,vh:innerHeight,board:!!bd&&bd.width>100,fp:fp.length,fn:fn.length,np:np.length,nn:nn.length,
        samePrev:fp.length===1&&np.length===1&&fp[0]===np[0],sameNext:fn.length===1&&nn.length===1&&fn[0]===nn[0],
        tab:t?{x:+t.left.toFixed(1),y:+t.top.toFixed(1),r:+t.right.toFixed(1),b:+t.bottom.toFixed(1)}:null,
        prev:one(fp[0]||np[0]),next:one(fn[0]||nn[0])};}):null;
    L.say(ok&&!!m&&m.board&&m.fp===1&&m.fn===1,tag+': TC-R353 DENOMINATOR the puzzle screen is up, the board measured, and one Prev and one Next found by what they are ('+(m&&(m.side?'their words':'their row'))+')',m&&{board:m.board,fp:m.fp,fn:m.fn});
    if(m&&m.prev&&m.next){
      L.say(m.np===1&&m.nn===1&&m.samePrev&&m.sameNext,tag+': TC-R354 the pair is named "Previous puzzle" / "Next puzzle", once each, on the buttons found',{np:m.np,nn:m.nn,samePrev:m.samePrev,sameNext:m.sameNext});
      const good=(x)=>x.x>=-0.5&&x.y>=-0.5&&x.r<=m.vw+0.5&&x.b<=m.vh+0.5&&x.h>=43.5&&!x.underTab&&x.hit;
      for(const [k,x] of [['Prev',m.prev],['Next',m.next]])
        L.say(good(x),tag+': TC-R355a at rest '+k+' is wholly on screen, '+x.h+' tall, clear of the tab bar and owns its centre ('+x.y+'..'+x.b+' of '+m.vh+', tab bar '+(m.tab?m.tab.x+','+m.tab.y+'..'+m.tab.r+','+m.tab.b:'none')+', centre hits '+x.hitWhat+')',{x,tab:m.tab});
      const s0=await Z.sig(b);
      await b.page.mouse.click(m.next.cx,m.next.cy);await b.settle(900);const s1=await Z.sig(b);
      const after=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Previous puzzle'&&x.getBoundingClientRect().width>0);
        if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
      if(after){await b.page.mouse.click(after[0],after[1]);await b.settle(900);}const s2=await Z.sig(b);
      L.say(!!s0&&!!s1&&s0!==s1&&!!after&&s2===s0,tag+': TC-R355b a real tap on Next shows another puzzle and a real tap on Prev brings the first back',{next:s0!==s1,prevBack:s2===s0,prevFound:!!after});
    }
    L.say(b.errs.length===0,tag+': TC-R353 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'217-puzzle-prev-next-named-and-clear');
