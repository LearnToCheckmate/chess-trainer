'use strict';
// gates/regress/159-pages-fit-one-screen.js - PAGES THAT NEED NO SCROLL FIT HIS PHONE: NONE SCROLLS AT 375x761. TC-INV-08p..u, US-INV-07.
//
// WHY [#550 helper B; jobs/pages-that-scroll-must-fit-on-one-screen-2026-11-11; Kunal, about 12:48am EST Wed 11 Nov 2026: "there's no
// reason for a page like this to have to scroll. It should all fit on a single page ... I think there are some other pages like this on
// the app which need to be scrolled ... figure those out and fix them all", and of Play setup "This layout should also be updated so it all
// fits on one page without scrolling"]. The audit measured Play setup 1003 in 761 vs the computer and 961 online (AUD-R17), Review's More
// sheet 681 in 623 (AUD-R06) and Look and feel 856 in 677 (AUD-H12). Home is gate 49/42's (df7946d), the menu gate 47 block N's.
//
// WHAT IT ASSERTS, in the PLAYER view (dev tools off: the build stamp and the dev rows are his alone) at kunal761:
//  for each page - Play setup vs the computer (p), Play setup online (q), Review's More sheet (r), Look and feel (s), the Review games list
//  with three stored games (t), Discover (u) -
//  DENOMINATOR the page is up (found by its words);
//  (1) nothing on it scrolls: #root and every painted overflow-y auto/scroll box has scrollHeight <= clientHeight + 1 (each scroller that
//      does is named with its two numbers);
//  (2) its last control is on screen and hit-tests to itself (Start game; New game; Style; the last game card; the Tactics tile) - so
//      "fits" is not satisfied by a page that clips its foot.
// MEASURED AND NOT ASSERTED (a note each run, the numbers printed): the Game Review summary (AUD-R07 - its layout is three options waiting
// on Kunal's pick) and the Puzzles roadmap (AUD-L16 - whether a 890-puzzle journey is meant to scroll is a question for him). Neither is
// squeezed here; the board is never made smaller for any of this.
// CONTROL-RECORD: e324617 2026-11-14 total=25 red=8 scope=trial:0cb1d9d44e51 how=#550 helper B: the branch tip before this change (e324617, built as c0) - Play setup 935 in 761 vs the computer and 893 online with Start game / Continue below the fold (p, q 2 red each), the More sheet 719 in 623 with New game at 789 (r 2), Look and feel 854 in 739 with Style at 815 (s 2); denominators, the games list, Discover and error lines green. On p1 (0348366e60d8) 25 of 25 green
const L=require('../lib');const H=require('../drive/home'),R=require('../drive/review'),P=require('../drive/play'),M=require('../drive/menu'),Z=require('../drive/puzzles');
const PAGES=[
  ['p','Play setup vs the computer',b=>P.states.setup(b),/Choose your opponent/i,/^▶?\s*Start game/i],
  ['q','Play setup online',b=>P.states['setup-online'](b),/Time per move/i,/^▶?\s*(Start game|Continue)/i],
  ['r','Review More sheet',b=>R.states['more-sheet'](b),/Copy PGN|Copied/,/^New game$/],
  ['s','Look and feel',b=>M.states['menu-look'](b),/Board colours/i,/^Style · fonts, icons, finish/],
  ['t','Review games list',b=>R.states['list-stored'](b),/Your games/,null],
  ['u','Discover',b=>H.states.discover(b),/What do you want to learn/,/^Tactics/]];
const scrollers=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;
  return (e.id==='root'||/auto|scroll/.test(getComputedStyle(e).overflowY))&&e.scrollHeight>e.clientHeight+1;}).map(e=>({who:e.id||e.getAttribute('data-ct')||String(e.className||e.tagName).slice(0,20),sh:e.scrollHeight,ch:e.clientHeight})));
L.run(async()=>{
  for(const [id,nm,go,wre,last] of PAGES){const tag='TC-INV-08'+id+' '+nm+' kunal761';
    const b=await L.launch({geo:'kunal761',dev:false,name:'fit159-'+id,store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await go(b);await b.settle(1200);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const up=await b.page.evaluate((src)=>new RegExp(src,'i').test(document.body.innerText||''),wre.source);
    L.say(ok&&up,tag+' DENOMINATOR the page is up (its words are on screen)',{ok,up});
    const sc=await scrollers(b);
    L.say(up&&sc.length===0,tag+' nothing scrolls ('+(sc.map(x=>x.who+' '+x.sh+' in '+x.ch).join(', ')||'no scroller overflows')+')',sc);
    const lc=await b.page.evaluate((src)=>{const vh=innerHeight;const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
      let e=null;if(src){const re=new RegExp(src);e=[...document.querySelectorAll('button')].filter(vis).filter(x=>re.test((x.innerText||'').trim().replace(/\n/g,' '))).pop()||null;}
      else{const cards=[...document.querySelectorAll('button,div[role="button"]')].filter(vis).filter(x=>/^(WON|LOST|DRAW)/.test((x.innerText||'').trim()));e=cards.pop()||null;}
      if(!e)return null;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,Math.min(vh-1,r.top+r.height/2));
      return {w:(e.innerText||'').trim().slice(0,24).replace(/\n/g,' '),top:+r.top.toFixed(1),bot:+r.bottom.toFixed(1),vh,hit:!!h&&(h===e||e.contains(h))};},last?last.source:null);
    L.say(up&&!!lc&&lc.bot<=lc.vh+0.5&&lc.hit,tag+' its last control is on screen and answers a tap ('+(lc?'"'+lc.w+'" '+lc.top+'..'+lc.bot+' of '+lc.vh+(lc.hit?'':' COVERED'):'not found')+')',lc);
    L.say(b.errs.length===0,tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  for(const [nm,go,code] of [['Game Review summary',b=>R.states.summary(b),'AUD-R07'],['Puzzles roadmap',b=>Z.states.roadmap(b),'AUD-L16']]){
    const b=await L.launch({geo:'kunal761',dev:false,name:'fit159-m',store:{ct_pool:'3'}});await b.open();try{await go(b);await b.settle(1200);}catch(e){}
    const sc=await scrollers(b);L.note('MEASURED, NOT ASSERTED ('+code+', waits on Kunal): '+nm+' at kunal761 - '+(sc.map(x=>x.who+' '+x.sh+' in '+x.ch).join(', ')||'nothing scrolls'));await b.close();}
},'159-pages-fit-one-screen');
