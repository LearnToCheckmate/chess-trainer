'use strict';
// gates/regress/222-puzzles-half-width-phone-layout.js - PUZZLES IN A HALF-WIDTH COMPUTER WINDOW SHOW THE PHONE LAYOUT; A WIDE ONE THE
// COMPUTER LAYOUT; AND RESIZING ACROSS THE SWITCH DOES NOT FLICKER. TC-R368..TC-R370 (US-R233). #553 B3,
// jobs/puzzles-in-a-computer-window-at-half-width-switch-to-the-phone-layout-below-a-set-width-2026-11-18 (Kunal's pick on questions/FB-15,
// 17 Nov: "Below a set width, switch to the phone layout").
// THE SWITCH, MEASURED RATHER THAN CHOSEN: the app has one layout switch for every page, DSK-12's rule (chess.jsx, search 'wideMemRef'):
// the two-sided computer layout only when the window is wider than tall (outside a 4 percent dead band at square, where it keeps the layout
// it had) and there is room for a rail beside a board of at least min(360, 0.75 x height). So for a window of height H the set width is H
// (plus 4 percent coming from the narrow side). WHY THERE: the two sides draw a bigger board than the phone layout wherever the window is
// wider than tall (1000x900: 718 two-sided, about 520 stacked), and every half of a common screen is TALLER than wide (960x1080, 840x1050,
// 720x900), so each of them gets the phone layout. Measured on e38269df5c30 and on the bundle main served on 16 Nov (e26a2b329de9, the day of
// his report): the phone layout at all three half widths on both, so the report is not reproduced at these sizes.
// WHAT IT READS: the bundle under test (CT_APP). Home -> Puzzles -> Start training, settled; the board (lib's widest 8-column grid) and the
// five controls found by their names (Previous puzzle, Hint, Show, Reset, Next puzzle).
// TC-R368 PHONE LAYOUT at 960x1080, 840x1050, 720x900 and 375x761 (kunal761): every control lies under the board and inside its width, all
//         five on screen, none overlapping another or the board, and the page does not scroll.
// TC-R369 COMPUTER LAYOUT at 1280x800 and 1920x1080: every control lies to the right of the board, on screen, none overlapping, no scroll.
// TC-R370 RESIZE: one window walked from 1000x1080 to 1180x1000 in 20px steps and back - the layout changes exactly once each way; and
//         jiggled 10px either side of square (1000x1000 <-> 1010x1000 <-> 990x1000, four times) it never changes.
const L=require('../lib');
const Z=require('../drive/puzzles');
const PHONE=[['960x1080',{w:960,h:1080,safe:'',label:'960x1080 half of 1920x1080'}],['840x1050',{w:840,h:1050,safe:'',label:'840x1050 half of 1680x1050'}],['720x900',{w:720,h:900,safe:'',label:'720x900 half of 1440x900'}],['375x761','kunal761']];
const COMPUTER=[['1280x800',{w:1280,h:800,safe:'',label:'1280x800'}],['1920x1080',{w:1920,h:1080,safe:'',label:'1920x1080'}]];
const NAMES=[['prev',/Previous puzzle/],['hint',/Hint/],['show',/Show/],['reset',/Reset/],['next',/Next puzzle/]];
const read=(b)=>b.page.evaluate((names)=>{const out={};for(const [k,src] of names){const re=new RegExp(src);const e=[...document.querySelectorAll('button')].find(x=>re.test((x.getAttribute('aria-label')||'')+' '+(x.innerText||''))&&x.getBoundingClientRect().width>0);
    out[k]=e?(q=>({l:q.left,t:q.top,r:q.right,b:q.bottom}))(e.getBoundingClientRect()):null;}
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((x,y)=>y.getBoundingClientRect().width-x.getBoundingClientRect().width)[0];
  const q=g&&g.getBoundingClientRect();const root=document.getElementById('root');
  return {c:out,bd:q?{l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width}:null,vw:innerWidth,vh:innerHeight,scroll:root?root.scrollHeight-root.clientHeight:0};},NAMES.map(([k,re])=>[k,re.source]));
const kind=(m)=>{const cs=Object.values(m.c);if(!m.bd||cs.some(x=>!x))return 'unknown';if(cs.every(x=>x.l>=m.bd.r-0.5))return 'computer';if(cs.every(x=>x.t>=m.bd.b-0.5&&x.l>=m.bd.l-0.5&&x.r<=m.bd.r+0.5))return 'phone';return 'mixed';};   // computer first: there the controls can also sit below the board's bottom edge (1180x1000: board 862 tall, Hint at 903), so 'under' alone does not make a phone layout
const overlap=(a,c)=>a.l<c.r-0.5&&a.r>c.l+0.5&&a.t<c.b-0.5&&a.b>c.t+0.5;
const tidy=(m)=>{const cs=Object.values(m.c).filter(Boolean);const on=cs.every(x=>x.l>=-0.5&&x.t>=-0.5&&x.r<=m.vw+0.5&&x.b<=m.vh+0.5);let ov=0;for(let i=0;i<cs.length;i++){if(m.bd&&overlap(cs[i],m.bd))ov++;for(let j=i+1;j<cs.length;j++)if(overlap(cs[i],cs[j]))ov++;}return {on,ov,scroll:m.scroll};};
L.run(async()=>{
  for(const [nm,geo,want] of [...PHONE.map(x=>[...x,'phone']),...COMPUTER.map(x=>[...x,'computer'])]){
    const id=want==='phone'?'TC-R368':'TC-R369';
    const b=await L.launch({geo,name:'g222-'+nm});await b.open();let ok=true;try{await Z.states['train'](b);await b.settle(1200);}catch(e){ok=false;L.note(nm+': drive threw '+String(e).slice(0,120));}
    const m=await read(b);const k=kind(m),t=tidy(m);
    L.say(ok&&!!m.bd&&Object.values(m.c).every(Boolean),nm+' '+id+' PRECONDITION the puzzle board and its five controls are up',{bd:m.bd,c:m.c});
    L.say(k===want,nm+' '+id+' the '+want+' layout: '+(want==='phone'?'every control under the board':'every control right of the board')+' (read: '+k+')',{bd:m.bd,c:m.c});
    if(want==='phone')L.say(Object.values(m.c).every(x=>x&&x.l>=m.bd.l-0.5&&x.r<=m.bd.r+0.5),nm+' '+id+' and inside the board\'s width',{bd:m.bd,c:m.c});
    L.say(t.on&&t.ov===0&&t.scroll<=1,nm+' '+id+' all five on screen, none over another or the board, and the page does not scroll ('+JSON.stringify(t)+')',t);
    L.say(b.errs.length===0,nm+' '+id+' zero app errors',b.errs.slice(0,2));await b.close();
  }
  { const b=await L.launch({geo:{w:1000,h:1080,safe:'',label:'1000x1080 resize walk'},name:'g222-resize'});await b.open();let ok=true;try{await Z.states['train'](b);await b.settle(1000);}catch(e){ok=false;}
    const at=async(w,h)=>{await b.page.setViewportSize({width:w,height:h});await b.settle(1200);const a=kind(await read(b));await b.settle(500);const c=kind(await read(b));return a===c?a:'unsettled';};
    const up=[],down=[];for(let w=1000,h=1080;w<=1180;w+=20,h=Math.max(1000,h-10))up.push(await at(w,h));for(let w=1180,h=1000;w>=1000;w-=20,h=Math.min(1080,h+10))down.push(await at(w,h));
    const flips=(s)=>s.slice(1).filter((x,i)=>x!==s[i]).length;
    L.say(ok&&up[0]==='phone'&&up[up.length-1]==='computer'&&down[down.length-1]==='phone','resize TC-R370 PRECONDITION the walk starts in the phone layout, reaches the computer layout and comes back ('+up.join(',')+' | '+down.join(',')+')',{up,down});
    L.say(!up.includes('unsettled')&&!down.includes('unsettled')&&flips(up)===1&&flips(down)===1,'resize TC-R370 the layout changes exactly once each way and holds still at every step ('+flips(up)+' up, '+flips(down)+' down)',{up,down});
    await b.page.setViewportSize({width:1000,height:1000});await b.settle(600);const j0=kind(await read(b));const js=[];
    for(let i=0;i<4;i++)for(const w of [1010,990,1000])js.push(await at(w,1000));
    L.say(js.length===12&&js.every(x=>x===j0),'resize TC-R370 jiggled 10px either side of square it never changes ('+j0+': '+js.join(',')+')',{j0,js});
    L.say(b.errs.length===0,'resize TC-R370 zero app errors',b.errs.slice(0,2));await b.close();
  }
},'222-puzzles-half-width-phone-layout');
