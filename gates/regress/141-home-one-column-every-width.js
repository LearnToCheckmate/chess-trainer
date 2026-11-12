'use strict';
// gates/regress/141-home-one-column-every-width.js - HOME IS ONE CENTRED COLUMN AT EVERY WINDOW SIZE, FITTED TO THE HEIGHT. US-R149 / TC-R217a..d.
//
// WHY [#550, run-answers build__1794388896663-hold-landing, THREE MORE CHECKS (1); docs/desktop-check-2026-11-12 DSK-01 (P1) and DSK-02;
// Kunal 12 Nov, two screenshots of Home on his computer: "Like the first look, which fits really nicely. It should continue to look like
// that, but for some reason, when I expand the screen, it looks like this and it looks messy and loses all alignment." He accepted the rule:
// pages without a board are one centred column, capped at 660, never two columns, fitted to the window height (scaled to 85 percent at
// most, then the compact 420 column)]. Home split into two columns whenever the window was wider than tall and at least 720 wide.
// WHAT IT READS: the bundle under test (CT_APP), Home as a new player sees it, at 1920x970, 1440x780, 1366x648, 1280x600 (laptops), 960x970
// (his half window), 820x1180 (iPad upright) and kunal761. the tiles are found by their words, and the column and scroller from the tiles (the hooks this build adds are not used, #432).
// WHAT IT ASSERTS: (a) the four tiles sit in ONE column's 2x2 grid whose centre is the window's centre (|dx| <= 2), never in a right-hand
// column; (b) the column is no wider than 660 (420 when compact); (c) nothing scrolls - the page fits the window; (d) his phone is unchanged:
// no zoom on the column at kunal761.
// CONTROL-RECORD: 1603f06 2026-11-12 total=37 red=13 scope=trial:b35a3777 how=#550 the tree before DSK-01 (t141): at 1920x970, 1440x780, 1366x648 and 1280x600 the tiles sit in a right-hand column (TC-R217a), the column is 1000 wide (TC-R217b) and Home overflows by 57, 247, 379 and 427 px (TC-R217c, the audit's own figures), and 960x970 overflows by 133; on t142 4e6cd77c 37/0
// KNOW ITS LIMIT: Home only; the other no-board pages (DSK-08) and the sideways board group (DSK-03/04) are separate jobs.
const L=require('../lib');
const SIZES=[[1920,970],[1440,780],[1366,648],[1280,600],[960,970],[820,1180],['kunal761']];
L.run(async()=>{
  for(const sz of SIZES){
    const geo=sz[0]==='kunal761'?'kunal761':{w:sz[0],h:sz[1],safe:'',label:sz[0]+'x'+sz[1]};const tag=geo.label||geo;
    const b=await L.launch({geo,name:'home141'});await b.open();await b.settle(1500);
    const m=await b.page.evaluate(()=>{const tiles={};for(const w of ['Discover','Puzzles','Review','Play']){const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent.trim()===w&&d.getBoundingClientRect().width>0);if(e){const r=e.getBoundingClientRect();tiles[w]={cx:Math.round((r.left+r.right)/2),cy:Math.round((r.top+r.bottom)/2)};}}
      /* found from the tiles, not from the hooks this build adds (#432): the column is the nearest ancestor of the Discover tile with a max-width,
         the scroller the nearest ancestor that is position:fixed */
      const d0=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent.trim()==='Discover'&&d.getBoundingClientRect().width>0);
      let c=null,s=null;for(let e=d0;e;e=e.parentElement){if(!c&&e.style&&e.style.maxWidth)c=e;if(!s&&getComputedStyle(e).position==='fixed'){s=e;break;}}
      const cr=c?c.getBoundingClientRect():null;
      return {vw:innerWidth,over:s?s.scrollHeight-s.clientHeight:null,col:cr?{l:Math.round(cr.left),w:Math.round(cr.width),cx:Math.round((cr.left+cr.right)/2)}:null,zoom:c?+getComputedStyle(c).zoom:null,maxW:c?c.style.maxWidth:null,tiles};});
    const t=m.tiles;const four=['Discover','Puzzles','Review','Play'].every(k=>t[k]);
    L.say(four&&!!m.col,tag+': TC-R217 PRECONDITION Home is up, with its four tiles found by their words',m);
    if(four&&m.col){const gx=(t.Discover.cx+t.Puzzles.cx)/2;const grid=Math.abs(t.Discover.cx-t.Review.cx)<=2&&Math.abs(t.Puzzles.cx-t.Play.cx)<=2&&t.Review.cy>t.Discover.cy+20&&Math.abs(t.Discover.cy-t.Puzzles.cy)<=2;
      L.say(grid&&Math.abs(gx-m.vw/2)<=2&&Math.abs(m.col.cx-m.vw/2)<=2,tag+': TC-R217a the tiles are one 2x2 grid in one column centred on the window (grid centre '+gx+', column centre '+m.col.cx+', window '+m.vw/2+')',{tiles:t,col:m.col});
      const cap=parseFloat(m.maxW)||9999;L.say(cap<=660&&m.col.w<=660,tag+': TC-R217b the column is at most 660 wide ('+m.col.w+', cap '+m.maxW+')',m.col);}
    L.say(m.over!=null&&m.over<=1,tag+': TC-R217c Home fits the window, nothing scrolls ('+m.over+'px over'+(m.zoom&&m.zoom<1?', column at '+m.zoom:'')+')',m);
    if(tag==='kunal761')L.say(m.zoom===1,'kunal761: TC-R217d his phone is unchanged - the column is not scaled ('+m.zoom+')',m.zoom);
    L.say(b.errs.length===0,tag+': TC-R217 zero app errors',b.errs.slice(0,3));await b.close();}
},'141-home-one-column-every-width');
