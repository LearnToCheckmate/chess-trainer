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
// KNOW ITS LIMIT: the computer opponent's sheet (the tallest); online and Pass and Play are shorter.
const L=require('../lib');const P=require('../drive/play');
L.run(async()=>{
  for(const sz of [[1280,600],[1366,648],[1440,780],[1180,820],[1920,970],['kunal761']]){
    const geo=sz[0]==='kunal761'?'kunal761':{w:sz[0],h:sz[1],safe:'',label:sz[0]+'x'+sz[1]};const tag=geo.label||geo;
    const b=await L.launch({geo,name:'setup142'});await b.open();let ok=true;try{await P.states['setup'](b);}catch(e){ok=false;}await b.settle(700);
    const m=await b.page.evaluate(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),w:Math.round(r.width)};};
      const st=[...document.querySelectorAll('button')].find(x=>/^▶ Start game$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);
      const lab=(re)=>{const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&re.test((d.textContent||'').trim())&&d.getBoundingClientRect().width>0);return e?R(e):null;};
      let sc=st;while(sc&&getComputedStyle(sc).position!=='fixed')sc=sc.parentElement;
      let col=st;while(col&&!(col.style&&col.style.maxWidth))col=col.parentElement;
      return {vw:innerWidth,vh:innerHeight,start:st?R(st):null,over:sc?sc.scrollHeight-sc.clientHeight:null,opp:lab(/^Opponent$/i),tc:lab(/Time control$/i),col:col?{...R(col),max:col.style.maxWidth}:null};});
    L.say(ok&&!!m.start&&!!m.opp&&!!m.tc&&!!m.col,tag+': TC-R218 PRECONDITION Play setup is up with Start game, OPPONENT and TIME CONTROL found by their words',m);
    if(tag==='kunal761'){L.say(!!m.col&&parseFloat(m.col.max)===420&&!!m.opp&&!!m.tc&&m.tc.t>m.opp.b,'kunal761: TC-R218c his phone keeps the one 420 column, sections stacked ('+(m.col&&m.col.max)+')',m.col);}
    else{
      L.say(!!m.start&&m.start.b<=m.vh&&m.start.t>=0&&m.over!=null&&m.over<=1,tag+': TC-R218a Start game is wholly on screen ('+(m.start&&m.start.b)+' of '+m.vh+') and nothing scrolls ('+m.over+'px over)',{start:m.start,over:m.over});
      const two=!!m.opp&&!!m.tc&&m.tc.l>=m.opp.l+120&&Math.abs(m.tc.t-m.opp.t)<300;
      L.say(two&&!!m.col&&m.col.w<=660&&Math.abs((m.col.l+m.col.r)/2-m.vw/2)<=2,tag+': TC-R218b OPPONENT and TIME CONTROL sit in two halves of one column at most 660 wide, centred (opponent x '+(m.opp&&m.opp.l)+', time control x '+(m.tc&&m.tc.l)+', column '+(m.col&&m.col.w)+')',{opp:m.opp,tc:m.tc,col:m.col});}
    L.say(b.errs.length===0,tag+': TC-R218 zero app errors',b.errs.slice(0,3));await b.close();}
},'142-play-setup-fits-wide-windows');
