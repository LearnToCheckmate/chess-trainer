'use strict';
// gates/regress/158-sideways-pages-tab-rail.js - SIDEWAYS, EVERY TAB PAGE TAKES THE RIGHT-HAND TAB RAIL; THE PUZZLE COLUMN CUTS NOTHING AT 667x375.
// TC-PZ-LAND4a..e, US-INV-05.
//
// WHY [#550 helper B; jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03, its whatIsLeft: "the tab rail on the other
// sideways screens (Discover, Review list, the roadmap) is not built - his card was the Puzzles screen; 'Novice 0/10' clips at 667x375".
// Kunal's Option A (answer a8): "When you make it sideways one that floating row at the bottom should not be there because that takes up the
// space of the board. It should only be on the right side"]. Gate 114 covers the Puzzles board screen; this covers the rest.
//
// WHAT IT ASSERTS, on a phone turned (761x375 his phone, 667x375, 844x390):
//  (a) TC-PZ-LAND4a on Discover, the Openings list, the Review games list and the Puzzles roadmap the tab bar is a full-height rail on the
//      RIGHT edge with its five tabs (no bottom row), found by data-ct="tabbar" AND checked by its five tab words.
//  (b) TC-PZ-LAND4b nothing on the page sits under the rail: every visible button and text box of the page ends left of the rail, and the
//      page's menu (aria-label 'Menu and settings') hit-tests to itself.
//  (c) TC-PZ-LAND4c sideways Discover fits: its four tiles on one row, all on screen, and the page does not scroll (#root and every
//      overflow-y scroller: scrollHeight <= clientHeight + 1).
//  (d) TC-PZ-LAND4d the puzzle screen's column at 667x375, 730x375 and 844x390: back, the tier chip ('Novice 0/10') and the menu end left of
//      the tab rail and the menu hit-tests to itself; Hint, Show move and Reset each show all their words (scrollWidth <= clientWidth, so no
//      ellipsis and no cut), found by their accessible names.
//  (e) TC-PZ-LAND4e a desktop window (1280x800) keeps the bottom tab bar on Discover (DSK-06): the rail is a phone-turned layout only.
// DENOMINATORS: each page is reached (its words are on screen) before anything is asserted of it.
// CONTROL-RECORD: 29bb4ce 2026-11-14 total=65 red=30 scope=trial:db17e342153a how=#550 helper B: the branch tip before the change (29bb4ce, built as t0) - the bottom tab row on Discover, the Openings list, the Review list and the roadmap at all three sizes (4a 12 red, 4b 12 red), Discover's tiles on two rows and the page scrolling 488/375 (4c 3), the 667x375 menu ending at 603.3 past the rail at 597 and Hint/Show/Reset 65..68 in 61 (4d 2), '👁 Show move' 121 in 113 at 844x390 (4d 1); denominators, the desktop line and error lines green. On t4 (3dd2dbacf85a) 65 of 65 green
const L=require('../lib');const H=require('../drive/home'),Z=require('../drive/puzzles'),R=require('../drive/review');
const PHONES=[[761,375],[667,375],[844,390]];
const PAGES=[['Discover',b=>H.states.discover(b),/What do you want to learn/],['Openings list',b=>H.states['discover-openings'](b),/Openings/],
  ['Review list',b=>R.states['list-stored'](b),/Review any game/],['Puzzles roadmap',b=>Z.states.roadmap(b),/puzzles · \d+ of \d+/i]];
const TABS=/Home[\s\S]*Discover[\s\S]*Puzzles[\s\S]*Review[\s\S]*Play/;
const read=(b,wre)=>b.page.evaluate((src)=>{const vw=innerWidth,vh=innerHeight;const tb=document.querySelector('[data-ct="tabbar"]');const t=tb?tb.getBoundingClientRect():null;
  const reached=new RegExp(src).test(document.body.innerText||'');
  const onScr=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<vh&&r.right>0&&r.left<vw;};
  const own=[...document.querySelectorAll('button,input,select')].filter(e=>!(tb&&tb.contains(e))&&onScr(e)&&getComputedStyle(e).visibility!=='hidden');
  const over=t?own.map(e=>({w:(e.getAttribute('aria-label')||e.innerText||e.placeholder||e.tagName).trim().slice(0,24),r:+e.getBoundingClientRect().right.toFixed(1)})).filter(x=>x.r>t.left+0.5):[];
  const menu=[...document.querySelectorAll('button[aria-label="Menu and settings"]')].find(onScr);let menuHit=null;
  if(menu){const r=menu.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);menuHit=!!h&&(h===menu||menu.contains(h));}
  const scr=[...document.querySelectorAll('*')].filter(e=>(e.id==='root'||/auto|scroll/.test(getComputedStyle(e).overflowY))&&onScr(e)&&e.scrollHeight>e.clientHeight+1).map(e=>({id:e.id||e.getAttribute('data-ct')||e.className||e.tagName,sh:e.scrollHeight,ch:e.clientHeight}));
  const tiles=[...document.querySelectorAll('[data-ct="discover-tiles"] > button')].map(e=>{const r=e.getBoundingClientRect();return {y:Math.round(r.top),b:+r.bottom.toFixed(1),r:+r.right.toFixed(1)};});
  return {vw,vh,reached,tab:t?{x:+t.left.toFixed(1),y:+t.top.toFixed(1),w:+t.width.toFixed(1),h:+t.height.toFixed(1),n:tb.querySelectorAll('button').length,words:TABSRC.test(tb.innerText||'')}:null,over,menu:!!menu,menuHit,scr,tiles};
},wre.source).catch(e=>({err:String(e)}));
L.run(async()=>{
  for(const [W,Hh] of PHONES){const tag=W+'x'+Hh;
    for(const [nm,go,wre] of PAGES){const t2=nm+' '+tag;
      const b=await L.launch({geo:{w:W,h:Hh,safe:'',label:tag},name:'side158',store:{ct_pool:'3'}});await b.ctx.addInitScript('window.TABSRC='+TABS.toString());await b.open();let ok=true;
      try{await go(b);await b.settle(900);}catch(e){ok=false;L.note(t2+': '+String(e).slice(0,140));}
      const m=await read(b,wre);
      L.say(ok&&!!m.reached,'TC-PZ-LAND4 '+t2+' DENOMINATOR the page is reached (its words are on screen)',{reached:m.reached,err:m.err});
      if(m.reached){
        L.say(!!m.tab&&m.tab.x>m.vw/2&&m.tab.y<=0.5&&m.tab.h>=m.vh-1&&m.tab.n===5&&m.tab.words,'TC-PZ-LAND4a '+t2+' the five tabs are a full-height rail on the right edge, not a bottom row ('+(m.tab?m.tab.x+'..'+(m.tab.x+m.tab.w)+' x '+m.tab.y+'..'+(m.tab.y+m.tab.h):'no tab bar')+')',m.tab);
        L.say(!!m.tab&&m.over.length===0&&m.menu&&m.menuHit===true,'TC-PZ-LAND4b '+t2+' nothing on the page sits under the rail and the menu hit-tests to itself ('+(m.over.length?'under it: '+m.over.map(x=>x.w+' to '+x.r).join(', '):'none under')+'; menu '+(m.menu?(m.menuHit?'hits':'COVERED'):'MISSING')+')',{over:m.over,menuHit:m.menuHit});
        if(nm==='Discover'){const ys=new Set(m.tiles.map(x=>x.y));
          L.say(m.tiles.length===4&&ys.size===1&&m.tiles.every(x=>x.b<=m.vh+0.5&&(!m.tab||x.r<=m.tab.x+0.5))&&m.scr.length===0,'TC-PZ-LAND4c '+t2+' the four tiles sit on one row on screen and the page does not scroll ('+m.tiles.length+' tiles on '+ys.size+' row(s), bottoms '+m.tiles.map(x=>x.b).join('/')+'; scrolling: '+(m.scr.map(x=>x.id+' '+x.sh+'/'+x.ch).join(', ')||'none')+')',{tiles:m.tiles,scr:m.scr});}
      }
      L.say(b.errs.length===0,'TC-PZ-LAND4 '+t2+' zero app errors',b.errs.slice(0,3));await b.close();}
  }
  for(const [W,Hh] of [[667,375],[730,375],[844,390]]){const tag='puzzle '+W+'x'+Hh;
    const b=await L.launch({geo:{w:W,h:Hh,safe:'',label:tag},name:'side158pz'});await b.open();let ok=true;try{await Z.states.train(b);await b.settle(1200);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const m=await b.page.evaluate(()=>{const tb=document.querySelector('[data-ct="tabbar"]');const t=tb?tb.getBoundingClientRect():null;
      const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
      const row=[...document.querySelectorAll('[data-ct="pz-toprow"]')].find(vis);
      const kids=row?[...row.children].filter(vis).map(e=>({w:(e.getAttribute('aria-label')||e.innerText||'').trim().slice(0,20),r:+e.getBoundingClientRect().right.toFixed(1)})):[];
      const chip=kids.find(k=>/\d+\/\d+$/.test(k.w))||null;
      const menu=row&&[...row.querySelectorAll('button[aria-label="Menu and settings"]')].find(vis);let menuHit=null;
      if(menu){const r=menu.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);menuHit=!!h&&(h===menu||menu.contains(h));}
      const hs=['Hint','Show move','Reset'].map(n=>{const e=[...document.querySelectorAll('button[aria-label="'+n+'"]')].find(vis);return e?{n,sw:e.scrollWidth,cw:e.clientWidth,txt:(e.innerText||'').replace(/\n/g,' '),r:+e.getBoundingClientRect().right.toFixed(1)}:{n,miss:true};});
      return {tab:t?+t.left.toFixed(1):null,side:tb?tb.getAttribute('data-side'):null,kids,chip,menuHit,hs};});
    L.say(ok&&m.side==='1'&&!!m.chip&&m.hs.every(x=>!x.miss),'TC-PZ-LAND4d '+tag+' DENOMINATOR the puzzle screen is up with the tab rail, the tier chip and Hint/Show move/Reset',m);
    L.say(m.tab!=null&&m.kids.length>=3&&m.kids.every(k=>k.r<=m.tab+0.5)&&m.menuHit===true,'TC-PZ-LAND4d '+tag+' back, the chip ('+(m.chip&&m.chip.w)+') and the menu end left of the rail at '+m.tab+' and the menu hit-tests to itself (rights '+m.kids.map(k=>k.r).join('/')+'; menu '+(m.menuHit?'hits':'COVERED')+')',m.kids);
    L.say(m.hs.every(x=>!x.miss&&x.sw<=x.cw&&x.r<=m.tab+0.5),'TC-PZ-LAND4d '+tag+' Hint, Show move and Reset show all their words ('+m.hs.map(x=>x.miss?x.n+' MISSING':'"'+x.txt+'" '+x.sw+'/'+x.cw).join(', ')+')',m.hs);
    L.say(b.errs.length===0,'TC-PZ-LAND4d '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  {const b=await L.launch({geo:{w:1280,h:800,safe:'',label:'1280x800'},name:'side158dsk',store:{ct_pool:'3'}});await b.ctx.addInitScript('window.TABSRC='+TABS.toString());await b.open();let ok=true;try{await H.states.discover(b);await b.settle(900);}catch(e){ok=false;}
    const m=await read(b,/What do you want to learn/);
    L.say(ok&&m.reached&&!!m.tab&&m.tab.w>600&&m.tab.y>m.vh/2,'TC-PZ-LAND4e Discover at 1280x800 keeps the bottom tab bar (DSK-06) ('+(m.tab?m.tab.w+' wide at y '+m.tab.y:'none')+')',m.tab);
    await b.close();}
},'158-sideways-pages-tab-rail');
// SELECTOR-OPENED: pz-toprow reading=presence #550 test-system helper A, opened by reading and confirmed on m6 46c1c43522a4 (the tip with the six last unopened hooks renamed; tip trial aae17ede75ff green): the row's children are read from it, so a missing hook leaves no chip and no menu and both TC-PZ-LAND4d lines red at all three geometries (65/0 -> 59/6)
