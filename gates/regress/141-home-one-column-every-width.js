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
// AND DSK-06 (TC-R217e/f): Discover takes the upright layout at computer window sizes, and the tab bar's tabs sit in the centred 660 column.
// CONTROL-RECORD: 33c1546 2026-11-12 total=52 red=6 scope=trial:4470ec9e how=#550 DSK-06 arm: t143, the tree before it - at 1920x970, 1440x780 and 1280x600 Discover's tiles stop at y 359 (TC-R217e) and the tabs span the window (TC-R217f); on t144 6694a8b0 52/0
// AND DSK-08 (TC-R217g): the Openings list and the Puzzles roadmap are the same centred 660 column on a computer window.
// CONTROL-RECORD: a5691bb 2026-11-12 total=59 red=2 scope=trial:6694a8b0 how=#550 DSK-08 arm: t144, the tree before it - at 1920x970 the Openings rows are 872 wide and the roadmap 838 (TC-R217g); on t145 315c163e 59/0
// KNOW ITS LIMIT: Home, Discover and two lists; the other no-board pages (DSK-08) and the sideways board group (DSK-03/04) are separate jobs.
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
  // DSK-06: Discover takes the upright layout at a computer window size (rows fill to the tab bar), and the tab bar's five tabs sit in the 660
  // column, centred, on any window wider than 660. Found by words: the tile labels and the tab labels.
  for(const sz of [[1920,970],[1440,780],[1280,600],['kunal761']]){
    const geo=sz[0]==='kunal761'?'kunal761':{w:sz[0],h:sz[1],safe:'',label:sz[0]+'x'+sz[1]};const tag=geo.label||geo;
    const b=await L.launch({geo,name:'disc141'});await b.open();let ok=true;try{await b.tile('Discover');}catch(e){ok=false;}await b.settle(1500);
    const m=await b.page.evaluate(()=>{const lab=(w)=>[...document.querySelectorAll('div,span')].filter(d=>d.children.length===0&&(d.textContent||'').trim()===w&&d.getBoundingClientRect().width>0);
      const tile=lab('Endgames')[0];const tabs=['Home','Discover','Puzzles','Review','Play'].map(w=>{const e=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()===w&&x.getBoundingClientRect().width>0&&x.getBoundingClientRect().top>innerHeight-90);return e?e.getBoundingClientRect():null;});
      return {vw:innerWidth,vh:innerHeight,endB:tile?Math.round(tile.getBoundingClientRect().bottom):null,tabT:tabs[0]?Math.round(tabs[0].top):null,tabL:tabs[0]?Math.round(tabs[0].left):null,tabR:tabs[4]?Math.round(tabs[4].right):null};});
    L.say(ok&&m.endB!=null&&m.tabT!=null,tag+': TC-R217 PRECONDITION Discover is up, its tiles and the tab bar found by their words',m);
    if(tag!=='kunal761'){
      L.say(m.endB!=null&&m.tabT!=null&&m.tabT-m.endB<=160,tag+': TC-R217e Discover\'s tiles fill the page down to the tab bar, as upright (lowest tile label '+m.endB+', tab bar '+m.tabT+')',m);
      L.say(m.tabL!=null&&m.tabR!=null&&m.tabR-m.tabL<=662&&Math.abs((m.tabL+m.tabR)/2-m.vw/2)<=2,tag+': TC-R217f the five tabs sit in a centred column no wider than 660 ('+m.tabL+' to '+m.tabR+')',m);}
    else L.say(m.tabL!=null&&m.tabL<=4&&m.tabR>=m.vw-4,'kunal761: TC-R217f his phone\'s tab bar still spans the screen ('+m.tabL+' to '+m.tabR+')',m);
    L.say(b.errs.length===0,tag+': TC-R217 Discover zero app errors',b.errs.slice(0,3));await b.close();}
  // DSK-08: the lists without a board (Openings, the Puzzles roadmap) are the same 660 column on a computer window, centred; read as the widest
  // list button above the tab bar.
  for(const sz of [[1920,970],['kunal761']]){
    const geo=sz[0]==='kunal761'?'kunal761':{w:sz[0],h:sz[1],safe:'',label:sz[0]+'x'+sz[1]};const tag=geo.label||geo;
    const b=await L.launch({geo,name:'lists141'});await b.open();
    const widest=()=>b.page.evaluate(()=>{let w=0,l=0,r=0;for(const d of document.getElementById('root').querySelectorAll('button')){const q=d.getBoundingClientRect();if(q.top>innerHeight-80||q.height<=40)continue;if(q.width>w&&q.width<innerWidth-2){w=q.width;l=q.left;r=q.right;}}return {w:Math.round(w),c:Math.round((l+r)/2),vw:innerWidth};});
    let ok=true,op=null,rm=null;try{await b.tile('Discover');await b.settle(800);await b.tapText(/^Openings$/,{wait:900});op=await widest();await b.tile('Puzzles');await b.settle(900);rm=await widest();}catch(e){ok=false;}
    L.say(ok&&!!op&&!!rm&&op.w>0&&rm.w>0,tag+': TC-R217 PRECONDITION the Openings list and the Puzzles roadmap opened, their rows read',{op,rm});
    if(tag!=='kunal761')for(const [n,x] of [['Openings',op],['Puzzles roadmap',rm]])L.say(!!x&&x.w<=662&&Math.abs(x.c-x.vw/2)<=12,tag+': TC-R217g the '+n+' rows sit in the centred 660 column ('+(x&&x.w)+' wide, centre '+(x&&x.c)+')',x);
    // #550 re-keyed for the formatting audit A-08/B-05 (Kunal's pick 12 Nov): pages with no board take a 12px gutter, so the rows are
    // 375-24 = 351 on his phone (were 367 at the old 3.8 gutter); measured 351, centre 188 on t163 7719e5a7fd39. Still the full column, centred.
    else L.say(!!op&&op.w>=349&&Math.abs(op.c-op.vw/2)<=2,'kunal761: TC-R217g his phone\'s Openings rows keep the screen width less the 12px gutters ('+(op&&op.w)+', centre '+(op&&op.c)+')',op);
    L.say(b.errs.length===0,tag+': TC-R217 lists zero app errors',b.errs.slice(0,3));await b.close();}
},'141-home-one-column-every-width');
