'use strict';
// gates/regress/159-pages-fit-one-screen.js - PAGES THAT NEED NO SCROLL FIT HIS PHONE: NONE SCROLLS AT 375x761. TC-INV-08p..u, US-INV-07.
//
// WHY [#550 helper B; jobs/pages-that-scroll-must-fit-on-one-screen-2026-11-11; Kunal, about 12:48am EST Wed 11 Nov 2026: "there's no
// reason for a page like this to have to scroll. It should all fit on a single page ... I think there are some other pages like this on
// the app which need to be scrolled ... figure those out and fix them all", and of Play setup "This layout should also be updated so it all
// fits on one page without scrolling"]. The audit measured Play setup 1003 in 761 vs the computer and 961 online (AUD-R17), Review's More
// sheet 681 in 623 (AUD-R06) and Look and feel 856 in 677 (AUD-H12). Home is gate 49/42's (df7946d), the menu gate 47 block N's.
//
// WHAT IT ASSERTS, in the PLAYER view (dev tools off: the build stamp and the dev rows are his alone) at kunal761, and for the pages fitted
// there also at 320x568 (the More sheet, r):
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
// CONTROL-RECORD: 08f5354 2026-11-14 total=45 red=6 scope=trial:03fd6b5bafb0 how=#550 helper B, Kunal's q44: a88ba8c (before the Time dropdown and the opponent screen, built as r0c) - Play setup vs the computer, online and its opponent pick at 320x568 scroll (808, 822, 808 in 568) with Start game / Continue below the fold, so TC-INV-08p, q and v at 320x568 red (6); every other line green. On r1 (490ee70b5ab6, 08f5354's tree) 45 of 45
// CONTROL-RECORD: e324617 2026-11-14 total=25 red=8 scope=trial:0cb1d9d44e51 how=#550 helper B: the branch tip before this change (e324617, built as c0) - Play setup 935 in 761 vs the computer and 893 online with Start game / Continue below the fold (p, q 2 red each), the More sheet 719 in 623 with New game at 789 (r 2), Look and feel 854 in 739 with Style at 815 (s 2); denominators, the games list, Discover and error lines green. On p1 (0348366e60d8) 25 of 25 green
// CONTROL-RECORD: 62ac4a1 2026-11-14 total=29 red=2 scope=trial:aebd8f5a71c1 how=#550 helper B, the 320x568 More-sheet run and the touchable-scroller rule: c0c87b1 (before the short-phone More fit, built as x0) - TC-INV-08r at 320x568 red twice (rev-sheet 703 in 511, New game 692..737 under the fold); every kunal761 line green. On x3 (5e8257d09c75, 62ac4a1's app on c0c87b1) 29 of 29
const L=require('../lib');const H=require('../drive/home'),R=require('../drive/review'),P=require('../drive/play'),M=require('../drive/menu'),Z=require('../drive/puzzles');
const PAGES=[
  ['p','Play setup vs the computer',b=>P.states.setup(b),/Play as/i,   /* #550 q44: the opponents moved to their own screen (v); the sheet's computer-only row is Play as */
  /^▶?\s*Start game/i],
  ['q','Play setup online',b=>P.states['setup-online'](b),/You'll create a game/i,   /* #550 q44: the day limits are in the one Time dropdown; the online note is the online-only text */
  /^▶?\s*(Start game|Continue)/i],
  ['r','Review More sheet',b=>R.states['more-sheet'](b),/Copy PGN|Copied/,/^New game$/],
  ['s','Look and feel',b=>M.states['menu-look'](b),/Board colou?rs/i,/^Style · fonts, icons, finish/],
  ['t','Review games list',b=>R.states['list-stored'](b),/Your games/,null],
  ['u','Discover',b=>H.states.discover(b),/What do you want to learn/,/^Tactics/],
  // #550 helper B, Kunal's q44: the computer's opponents and Strength on their own screen, opened by the Computer tile
  ['v','Choose your opponent',async b=>{await P.states.setup(b);await P.tapBtn(b,/^Computer$/,500);},/Choose your opponent/,/^▶?\s*Start game/]];
// A scroller counts only where the player can touch it: the centre of its on-screen part must hit-test into it. A page under an open sheet's
// backdrop is not the page being looked at (found at 320x568: the Review board's rev-compact, 115 in 102, behind the More sheet's backdrop).
const scrollers=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;
  {const x0=Math.max(0,r.left),x1=Math.min(innerWidth,r.right),y0=Math.max(0,r.top),y1=Math.min(innerHeight,r.bottom);if(x1<=x0||y1<=y0)return false;
   const h=document.elementFromPoint((x0+x1)/2,(y0+y1)/2);if(!h||!(h===e||e.contains(h)))return false;}
  return (e.id==='root'||/auto|scroll/.test(getComputedStyle(e).overflowY))&&e.scrollHeight>e.clientHeight+1;}).map(e=>({who:e.id||e.getAttribute('data-ct')||String(e.className||e.tagName).slice(0,20),sh:e.scrollHeight,ch:e.clientHeight})));
L.run(async()=>{
  // #550 helper B (seat 1's check at 320x568): the pages FITTED at 320x568 are asserted there too - the Review More sheet (r), and since Kunal's
  // q44 Play setup both ways (p, q) and its 'Choose your opponent' screen (v). The Review list (q45) and Look and feel (q50) come next.
  const RUNS=[...PAGES.map(p=>[p,'kunal761','kunal761']),...PAGES.filter(p=>/^[pqrsv]$/.test(p[0])).map(p=>[p,'se','320x568'])];   /* #550 q50: Look and feel (s) fits 320x568 too */   // #550 q44: Play setup both ways and its opponent screen fit 320x568 too
  for(const [[id,nm,go,wre,last],geo,gn] of RUNS){const tag='TC-INV-08'+id+' '+nm+' '+gn;
    const b=await L.launch({geo,dev:false,name:'fit159-'+id,store:{ct_pool:'3'}});await b.open();let ok=true;
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
    // (3) TC-INV-08s Q50 [#550 helper B; Kunal's q50 answer]: at 320x568 ONLY, the twelve swatches and five piece chips lose their names and sit
    //     side by side in rows of six, and the intro line goes; the preview board keeps its size, min(vw-52, 290). At 375x761 every word stays:
    //     the intro line and all seventeen chip names are painted. Each chip keeps its name as its title either way.
    if(id==='s'){const q=await b.page.evaluate(()=>{const o=document.querySelector('[data-ct="look"]');if(!o)return null;const txt=o.innerText||'';
        const cols=[...document.querySelectorAll('[data-ct="look-colours"] > button')],pcs=[...document.querySelectorAll('[data-ct="look-pieces"] > button')];
        const row1=(list)=>{if(!list.length)return 0;const t0=list[0].getBoundingClientRect().top;return list.filter(e=>Math.abs(e.getBoundingClientRect().top-t0)<2).length;};
        const NAMES=[...cols.map(e=>(e.getAttribute('title')||'').trim()).filter(Boolean),'Classic','Merida','Chessnut','Spatial','Symbol'];
        const named=(list)=>list.filter(e=>{const t=(e.innerText||'');return NAMES.some(n=>t.includes(n));}).length;   /* a chip's name PAINTED, read by the words (colour titles predate q50; the piece names are the app's five) - not by a hook the q50 build added; Symbol's chip paints a bare ♞ glyph either way */const bd=document.querySelector('[data-ct="look-board"]');
        return {intro:/Every screen uses what you pick here/.test(txt),cols:cols.length,pcs:pcs.length,colRow:row1(cols),pcRow:row1(pcs),colNamed:named(cols),pcNamed:named(pcs),
          titled:[...cols,...pcs].filter(e=>(e.getAttribute('title')||'').length>0).length,board:bd?Math.round(bd.getBoundingClientRect().width):null,vw:innerWidth};});
      const pbWant=Math.min(b.geo.w-52,290);
      if(gn==='320x568')L.say(!!q&&!q.intro&&q.cols===12&&q.pcs===5&&q.colRow===6&&q.pcRow===5&&q.colNamed===0&&q.pcNamed===0&&q.titled===17&&Math.abs(q.board-pbWant)<=1,
        tag+' Q50 the chips are name-less in rows of six (first rows '+(q&&q.colRow)+' and '+(q&&q.pcRow)+', '+(q&&q.colNamed)+'+'+(q&&q.pcNamed)+' painted names, '+(q&&q.titled)+' titles), the intro line is gone ('+(q&&q.intro)+') and the preview board keeps its size ('+(q&&q.board)+' for '+pbWant+')',q);
      else L.say(!!q&&q.intro&&q.cols===12&&q.pcs===5&&q.colNamed===12&&q.pcNamed===5&&Math.abs(q.board-pbWant)<=1,
        tag+' Q50 every word stays on a taller phone: the intro line ('+(q&&q.intro)+') and all '+(q?q.colNamed+q.pcNamed:0)+' of 17 chip names are painted, and the preview board is '+(q&&q.board)+' for '+pbWant,q);}
    L.say(b.errs.length===0,tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  for(const [nm,go,code] of [['Game Review summary',b=>R.states.summary(b),'AUD-R07'],['Puzzles roadmap',b=>Z.states.roadmap(b),'AUD-L16']]){
    const b=await L.launch({geo:'kunal761',dev:false,name:'fit159-m',store:{ct_pool:'3'}});await b.open();try{await go(b);await b.settle(1200);}catch(e){}
    const sc=await scrollers(b);L.note('MEASURED, NOT ASSERTED ('+code+', waits on Kunal): '+nm+' at kunal761 - '+(sc.map(x=>x.who+' '+x.sh+' in '+x.ch).join(', ')||'nothing scrolls'));await b.close();}
},'159-pages-fit-one-screen');
