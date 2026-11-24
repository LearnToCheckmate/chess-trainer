'use strict';
// gates/regress/142-play-setup-fits-wide-windows.js - PLAY SETUP FITS A LAPTOP WINDOW WITH START GAME ON SCREEN. US-R150 / TC-R218a..c.
//
// WHY [#550, run-answers build__1794388896663-hold-landing, THREE MORE CHECKS (1); docs/desktop-check-2026-11-12 DSK-09: "The setup sheet is a
// 420 column that scrolls: 335 px hidden at 1280x600 (Start game is off screen), 287 at 1366x648, 213 at 1440x780, 173 at 1180x820, 23 at
// 1920x970, while 860 px or more of width is empty beside it." Proposal: inside the 660 column, opponent and bots on the left half, colour, clock
// and strength on the right half, so Start game stays on screen]. Kunal accepted the desktop rule (one centred 660 column for a page without a
// board, fitted to the height).
// WHAT IT READS: the bundle under test (CT_APP), Play setup with the computer opponent (gates/drive/play.js state 'setup'), at 1280x600,
// 1366x648, 1440x780, 1180x820, 1920x970 and kunal761. Everything is found by its words - the Start game button, the OPPONENT and TIME CONTROL
// labels - and the scroller as the Start button's nearest position:fixed ancestor; no hook this build adds is read.
// WHAT IT ASSERTS: (a) the Start game button is wholly on screen and nothing scrolls on a window wider than tall; (b) there, OPPONENT and TIME
// CONTROL sit in two halves (Time control starts at least 120px right of Opponent) of one column no wider than 660, centred on the window; (c) his phone keeps the one 420 column.
// CONTROL-RECORD: 368b7f1 2026-11-12 total=24 red=10 scope=trial:4e6cd77c how=#550 the tree before DSK-09 (t142): the 420 single column at every size - Start game off screen and the sheet scrolling by 335/287/213/173/23 px (TC-R218a, the audit's own figures) and no two halves (TC-R218b) at all five window sizes; on t143 4470ec9e 24/0
// CONTROL-RECORD: d2fe7af 2026-11-14 total=24 red=6 scope=trial:edd11cff34ef how=#550 helper B, the q44 re-key: aaefbb5 with every setup section put in the left grid column and the phone column widened 420 -> 460 - TC-R218b red at all five window sizes (the Time control at the Opponent's x) and TC-R218c red at kunal761 (460px), the only reds; aaefbb5 itself (trial:8af83ffc1c70) is 24 pass 0 fail
// KNOW ITS LIMIT: the computer opponent's sheet (the tallest); online and Pass and Play are shorter.
// RE-KEYED TO q44 [#550 helper B; Kunal's q44 answer, 08f5354]: the time control is ONE dropdown now, a select whose accessible name is
// 'Time control', and the TIME CONTROL heading it was found by is gone, so the PRECONDITION and TC-R218b/c were red on every size by a
// missing reading, not a layout fault. MEASURED on aaefbb5 (trial 8af83ffc1c70) at 1280x600: one 660 column centred (310..970), OPPONENT
// and PLAY AS in its left half (x 310, tops 58 and 269), the Time control dropdown in its right half (x 651, top 269) beside the Scan and
// Upload row, Start game across both; at kunal761 the 420 column (351 wide) with OPPONENT, PLAY AS and Time control stacked at one left edge
// (tops 130, 297, 372). So: the time control is found by its ACCESSIBLE NAME (the control he operates), OPPONENT and PLAY AS by their
// words; (b) asserts the halves as q44 left them; (c) asserts his phone's one stacked column. TC-R218a is unchanged.
const L=require('../lib');const P=require('../drive/play');
/* #550 helper A, r19 audit A4 [jobs/r19-phone-geometry-audit-is-red-on-the-branch-and-a4c-reads-short-as-a-dead-geos-key-2026-11-14]:
   a geometry is asked by its ENTRY (w, h), never its key or label, so a renamed GEOS key throws here instead of silently skipping a branch. */
const geoOf=(geo)=>{const g=typeof geo==='string'?L.GEOS[geo]:geo;if(!g||!(g.w>0))throw new Error('no geometry '+JSON.stringify(geo));return g;};
const isPhone=(geo)=>{const g=geoOf(geo);return g.w===375&&g.h===761;};   // Kunal's phone, R19
L.run(async()=>{
  for(const sz of [[1280,600],[1366,648],[1440,780],[1180,820],[1920,970],['kunal761']]){
    const geo=typeof sz[0]==='string'?sz[0]:{w:sz[0],h:sz[1],safe:'',label:sz[0]+'x'+sz[1]};const tag=geo.label||geo;
    const b=await L.launch({geo,name:'setup142'});await b.open();let ok=true;try{await P.states['setup'](b);}catch(e){ok=false;}await b.settle(700);
    const m=await b.page.evaluate(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),w:Math.round(r.width)};};
      const st=[...document.querySelectorAll('button')].find(x=>/^Start game$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);
      const lab=(re)=>{const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&re.test((d.textContent||'').trim())&&d.getBoundingClientRect().width>0);return e?R(e):null;};
      let sc=st;while(sc&&getComputedStyle(sc).position!=='fixed')sc=sc.parentElement;
      let col=st;while(col&&!(col.style&&col.style.maxWidth))col=col.parentElement;
      return {vw:innerWidth,vh:innerHeight,start:st?R(st):null,over:sc?sc.scrollHeight-sc.clientHeight:null,opp:lab(/^Opponent$/i),pa:lab(/^Play as$/i),tc:(()=>{const e=[...document.querySelectorAll('[aria-label]')].find(x=>/^Time control$/i.test(x.getAttribute('aria-label')||'')&&x.getBoundingClientRect().width>0);return e?R(e):null;})(),col:col?{...R(col),max:col.style.maxWidth}:null};});
    L.say(ok&&!!m.start&&!!m.opp&&!!m.pa&&!!m.tc&&!!m.col,tag+': TC-R218 PRECONDITION Play setup is up with Start game, OPPONENT and PLAY AS found by their words and the Time control by its accessible name',m);
    if(isPhone(geo)){const st=!!m.opp&&!!m.pa&&!!m.tc&&m.pa.t>m.opp.b&&m.tc.t>m.pa.b&&Math.abs(m.pa.l-m.opp.l)<=2&&Math.abs(m.tc.l-m.opp.l)<=2;
      L.say(!!m.col&&parseFloat(m.col.max)===420&&m.col.w<=420&&st,'kunal761: TC-R218c his phone keeps the one 420 column ('+(m.col&&m.col.max)+', '+(m.col&&m.col.w)+' wide), OPPONENT, PLAY AS and the Time control stacked at one left edge (tops '+[m.opp,m.pa,m.tc].map(x=>x&&x.t).join(', ')+')',{col:m.col,opp:m.opp,pa:m.pa,tc:m.tc});}
    else{
      L.say(!!m.start&&m.start.b<=m.vh&&m.start.t>=0&&m.over!=null&&m.over<=1,tag+': TC-R218a Start game is wholly on screen ('+(m.start&&m.start.b)+' of '+m.vh+') and nothing scrolls ('+m.over+'px over)',{start:m.start,over:m.over});
      const mid=m.col?(m.col.l+m.col.r)/2:null;
      const two=!!m.opp&&!!m.pa&&!!m.tc&&mid!=null&&m.opp.r<=mid&&m.pa.r<=mid&&Math.abs(m.pa.l-m.opp.l)<=2&&m.tc.l>=mid&&m.tc.r<=m.col.r+1&&m.tc.l>=m.opp.l+120;
      L.say(two&&!!m.col&&m.col.w<=660&&Math.abs(mid-m.vw/2)<=2,tag+': TC-R218b q44 halves: OPPONENT and PLAY AS in the left half and the Time control in the right half of one column at most 660 wide, centred (opponent x '+(m.opp&&m.opp.l)+', play as x '+(m.pa&&m.pa.l)+', time control x '+(m.tc&&m.tc.l)+', column '+(m.col&&m.col.l)+'..'+(m.col&&m.col.r)+')',{opp:m.opp,pa:m.pa,tc:m.tc,col:m.col});}
    L.say(b.errs.length===0,tag+': TC-R218 zero app errors',b.errs.slice(0,3));await b.close();}
},'142-play-setup-fits-wide-windows');
