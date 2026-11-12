'use strict';
// gates/regress/127-landscape-eval-graph.js - IN LANDSCAPE THE EVAL GRAPH SITS IN THE RIGHT-HAND SPACE, ON REVIEW AND AGAINST THE COMPUTER,
// AND NOTHING ELSE IS REMOVED TO MAKE ROOM FOR IT. US-R135 / TC-R203a..e.
//
// WHY [#550, jobs/landscape-eval-graph-in-the-right-hand-space-2026-11-12, run-answers build__1794388896663-a36]: Kunal, 11 Nov, beside a
// picture of an eval graph: "for landscape can we add this kind of thing on the space on the right since we have a lot more real estate";
// on the mockups: "I like option B, but I don't want you to remove everything ... keep the buttons, the move list, the graph, everything.
// You just make them fit better. I don't think the buttons all need to be that wide." So: Review, the graph under the move's explanation, a
// tap jumps to that move; against the computer, the graph under the toolbar, growing move by move from the evaluations the bar showed,
// with the opening line, the move strip, the toolbar, the MOVES row and both player bars all kept. Never in a game against a person.
// WHAT IT READS: the bundle under test (CT_APP), at 761x375, 730x375 and 667x375 (the shortest landscape width this suite tests). The board
// is the widest repeat(8,...) grid. Found by what existed before this build (#432): the review's move counter ('10/33') in rev-compact, the
// sideways rail (.ctside), the player bars (pbar-top/-bottom), the play toolbar by its six titles, the ● LIVE readout; the graph by the svg
// inside the rail that draws EvalGraph's dashed midline, so a tree without the graph reds for the graph being absent, not for a hook.
// KNOW ITS LIMIT: whether the graph reads well on his phone in landscape is his look after the landing (the run question with the pictures).
// CONTROL-RECORD: cea4753 2026-11-12 total=53 red=24 scope=trial:37182d5aca90 how=#550 a36: the tree before the graph - TC-R203a, TC-R203b, TC-R203c and Review's rail-scroll TC-R203d red at all three geometries; the preconditions, the kept-rows and board-size lines and TC-R203e green
// CONTROL-RECORD: ef54d07 2026-11-12 total=57 red=2 scope=trial:10a6845dd946 how=#550 antagonist A F1: the graph before the fix (the player's-move points filled with the static material count) - B2's value lines red (largest gap 0.625, newest -0.69 against the bar's -0.9); on 764a0b1dc097 57/0
const L=require('../lib');
const P=require('../drive/play'),R=require('../drive/review');
const GEOS=[[761,375],[730,375],[667,375]];
const BOARD={play:344,review:216};   // the board at 375 tall before this build (trial 37182d5aca90), the same at all three widths
const read=(b)=>b.page.evaluate(()=>{const rail=document.querySelector('.ctside');if(!rail)return null;const rr=rail.getBoundingClientRect();
  const svgs=[...rail.querySelectorAll('svg')].filter(s=>s.querySelector('line[stroke-dasharray="4 3"]')&&s.getBoundingClientRect().width>0);
  const g=svgs[0]||null;const gq=g&&g.getBoundingClientRect();const line=g&&[...g.querySelectorAll('path')].find(p=>p.getAttribute('fill')==='none');
  const pts=line?((line.getAttribute('d')||'').match(/[ML]/g)||[]).length:0;
  const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  const box=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return q.height>0?{t:Math.round(q.top),b:Math.round(q.bottom),l:Math.round(q.left),r:Math.round(q.right),h:Math.round(q.height)}:null;};
  const tb=['Moves','Back','Forward','Hint','Flip','More'].map(t=>rail.querySelector('button[title="'+t+'"]'));
  const live=[...rail.querySelectorAll('span')].find(s=>/● LIVE|^Move \d+\/\d+$/.test((s.innerText||'').trim()));
  const cnt=(()=>{const rc=document.querySelector('[data-ct="rev-compact"]');const m=rc&&(rc.innerText||'').match(/\b(\d+)\/(\d+)\b/);return m?+m[1]:null;})();
  const expl=(()=>{const rc=document.querySelector('[data-ct="rev-compact"]');return box(rc);})();
  return {rail:{t:Math.round(rr.top),b:Math.round(rr.bottom),sh:rail.scrollHeight,ch:rail.clientHeight},graph:g?{...box(g),w:Math.round(gq.width),pts}:null,
    board:bd?Math.round(bd.width*100)/100:null,tb:tb.map(box),pbt:box(document.querySelector('[data-ct="pbar-top"]')),pbb:box(document.querySelector('[data-ct="pbar-bottom"]')),
    live:live?{...box(live),t2:(live.innerText||'').trim()}:null,strip:box(rail.querySelector('[data-ct="play-moverow"]')),cnt,expl,vh:innerHeight,vw:innerWidth,docw:document.documentElement.scrollWidth};});
const tapGraph=async(b,frac)=>{const q=await b.page.evaluate((f)=>{const rail=document.querySelector('.ctside');const s=rail&&[...rail.querySelectorAll('svg')].find(x=>x.querySelector('line[stroke-dasharray="4 3"]')&&x.getBoundingClientRect().width>0);if(!s)return null;const r=s.getBoundingClientRect();return {x:r.left+r.width*f,y:r.top+r.height/2};},frac);
  if(!q)return false;await b.page.mouse.click(q.x,q.y);await b.settle(700);return true;};
L.run(async()=>{
  for(const [w,h] of GEOS){const geo={w,h,safe:'',label:w+'x'+h};
    // ── A. REVIEW: under the explanation, the rail's width, a tap jumps ────────────────────────────────────────────────────────────
    {const tag='review '+w+'x'+h;const b=await L.launch({geo,name:'land-graph-rev-'+w,store:{ct_pool:'3'}});await b.open();let ok=true;
     try{await R.states['moves-ply10'](b);await b.settle(1800);}catch(e){ok=false;}
     const r=await read(b);
     L.say(ok&&!!r&&r.cnt===10,'TC-R203 '+tag+' PRECONDITION the review is open at move 10 with its sideways rail',r&&{cnt:r.cnt,rail:r.rail});
     L.say(!!r&&!!r.graph&&!!r.expl&&r.graph.t>=r.expl.b-1,'TC-R203a '+tag+' the eval graph is in the rail UNDER the move\'s explanation (graph top '+(r&&r.graph&&r.graph.t)+', explanation bottom '+(r&&r.expl&&r.expl.b)+')',r&&{graph:r.graph,expl:r.expl});
     L.say(!!r&&!!r.graph&&r.graph.w>=r.vw*0.45&&r.graph.h>=40&&r.graph.b<=r.vh&&r.graph.pts>=20,'TC-R203a '+tag+' it is drawn full size: '+(r&&r.graph&&(r.graph.w+'x'+r.graph.h))+' with '+(r&&r.graph&&r.graph.pts)+' points, on screen',r&&r.graph);
     L.say(!!r&&r.rail.sh<=r.rail.ch+1&&r.docw<=r.vw,'TC-R203d '+tag+' the rail does not scroll to show it ('+(r&&r.rail.sh)+' of '+(r&&r.rail.ch)+') and nothing spills sideways',r&&r.rail);
     L.say(!!r&&Math.abs(r.board-BOARD.review)<=1,'TC-R203d '+tag+' the board keeps its size ('+(r&&r.board)+' against '+BOARD.review+')');
     const t1=await tapGraph(b,0.02);const r1=await read(b);const t2=await tapGraph(b,0.98);const r2=await read(b);
     L.say(t1&&t2&&!!r1&&!!r2&&r1.cnt!=null&&r1.cnt<=2&&r2.cnt!=null&&r2.cnt>=30,'TC-R203b '+tag+' a tap on the graph jumps to that move: near its left end '+(r1&&r1.cnt)+', near its right end '+(r2&&r2.cnt),{a:r1&&r1.cnt,b:r2&&r2.cnt});
     L.say(b.errs.length===0,'TC-R203 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
    // ── B. AGAINST THE COMPUTER: under the toolbar, one point per move, nothing removed ─────────────────────────────────────────────
    {const tag='vs computer '+w+'x'+h;const b=await L.launch({geo,name:'land-graph-cpu-'+w,store:{ct_pool:'3'}});await b.open();let ok=true;
     try{await P.states['cpu-4ply'](b);await b.settle(2500);}catch(e){ok=false;}
     const r=await read(b);
     L.say(ok&&!!r&&!!r.pbt&&!!r.pbb,'TC-R203 '+tag+' PRECONDITION a 4-ply game against the computer in the sideways rail',r&&r.rail);
     const tbb=r&&Math.max(...r.tb.filter(Boolean).map(x=>x.b));
     L.say(!!r&&!!r.graph&&!!r.live&&r.graph.t>=tbb-1&&r.graph.b<=r.live.t+1,'TC-R203c '+tag+' the eval graph sits under the toolbar and above the MOVES row (toolbar bottom '+tbb+', graph '+(r&&r.graph&&(r.graph.t+'-'+r.graph.b))+', MOVES row top '+(r&&r.live&&r.live.t)+')',r&&{graph:r.graph,live:r.live});
     L.say(!!r&&!!r.graph&&r.graph.h>=36&&r.graph.w>=r.vw*0.3&&r.graph.pts===4,'TC-R203c '+tag+' it grows move by move: '+(r&&r.graph&&r.graph.pts)+' points for 4 plies, '+(r&&r.graph&&(r.graph.w+'x'+r.graph.h)),r&&r.graph);
     L.say(!!r&&!!r.strip&&r.tb.every(x=>!!x&&x.h>=43.5)&&!!r.live&&r.live.b<=r.vh&&!!r.pbb&&r.pbb.b<=r.vh&&!!r.pbt,'TC-R203d '+tag+' every row is kept and on screen: the move strip, the six toolbar buttons at 44 or more ('+(r&&r.tb.map(x=>x&&x.h).join(','))+'), the MOVES row, both player bars',r&&{tb:r.tb,live:r.live,pbb:r.pbb,strip:r.strip});
     L.say(!!r&&r.rail.sh<=r.rail.ch+1&&r.docw<=r.vw,'TC-R203d '+tag+' the rail does not scroll ('+(r&&r.rail.sh)+' of '+(r&&r.rail.ch)+') and nothing spills sideways',r&&r.rail);
     L.say(!!r&&Math.abs(r.board-BOARD.play)<=1,'TC-R203d '+tag+' the board keeps its size ('+(r&&r.board)+' against '+BOARD.play+')');
     const t1=await tapGraph(b,0.01);const r1=await read(b);
     L.say(t1&&!!r1&&!!r1.live&&r1.live.t2==='Move 1/4','TC-R203b '+tag+' a tap at the graph\'s first point previews that move, as Back does ("'+(r1&&r1.live&&r1.live.t2)+'")',r1&&r1.live);
     const t2=await tapGraph(b,0.985);/* inside the drawing: its last pixel column is the svg's edge */const r2=await read(b);
     L.say(t2&&!!r2&&!!r2.live&&/LIVE/.test(r2.live.t2),'TC-R203b '+tag+' a tap at its last point is the live position again ("'+(r2&&r2.live&&r2.live.t2)+'")',r2&&r2.live);
     L.say(b.errs.length===0,'TC-R203 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}}
  // ── B2. THE VALUES, NOT JUST THE COUNT (#550 antagonist A, F1: the first build filled the position after each of the player's moves,
  // which the bar never reads, with the static material count, so every other point was a different instrument - a 1.6-pawn sawtooth on
  // a quiet game that pts===4 could not see). A 16-ply quiet game at 761x375; the plotted values are read back out of the svg path. ───────
  {const b=await L.launch({geo:{w:761,h:375,safe:'',label:'761x375'},name:'land-graph-values',store:{ct_pool:'3'}});await b.open();let ok=true;
   try{await P.states['cpu-m0'](b);let n=0;for(const [f,t] of [['e2','e4'],['g1','f3'],['b1','c3'],['d2','d3'],['a2','a3'],['h2','h3'],['c1','e3'],['f1','e2']]){n+=2;await b.move(f,t,0);await P.waitPlies(b,n);await b.settle(1600);}await b.settle(2500);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const rail=document.querySelector('.ctside');const s=rail&&[...rail.querySelectorAll('svg')].find(x=>x.querySelector('line[stroke-dasharray="4 3"]'));if(!s)return null;
     const H=+s.getAttribute('height');const d=([...s.querySelectorAll('path')].find(p=>p.getAttribute('fill')==='none')||{getAttribute:()=>''}).getAttribute('d')||'';
     const ys=[...d.matchAll(/[ML][\d.]+,([\d.-]+)/g)].map(m=>+m[1]);const v=ys.map(y=>Math.round((H/2-y)/(H/2-4)*6*100)/100);
     const pill=[...document.querySelectorAll('[data-ct="pbar-top"] span')].map(e=>(e.innerText||'').trim()).find(t=>/^[+-]?\d+\.\d$/.test(t));return {v,pill:pill==null?null:+pill};});
   L.say(ok&&!!r&&r.v.length===16,'TC-R203c 761x375 PRECONDITION a 16-ply quiet game against the computer, its graph read back as values ('+(r&&r.v.length)+' points)',r);
   const dev=r?r.v.map((x,i)=>(i%2===0&&i>0&&i<r.v.length-1)?Math.abs(x-(r.v[i-1]+r.v[i+1])/2):0):[];const mx=dev.length?Math.max(...dev):null;
   L.say(!!r&&r.v.length===16&&mx!=null&&mx<=0.5,'TC-R203c 761x375 each point after the player\'s own move sits on the line between the bar\'s readings either side, not on another instrument (largest gap '+mx+' pawns, at most 0.5): '+(r&&r.v.join(' ')),{v:r&&r.v,dev});
   L.say(!!r&&r.pill!=null&&r.v.length>0&&Math.abs(r.v[r.v.length-1]-Math.max(-6,Math.min(6,r.pill)))<=0.15,'TC-R203c 761x375 the newest point is the bar\'s own reading ('+(r&&r.v[r.v.length-1])+' against the bar\'s '+(r&&r.pill)+')',r&&{last:r.v[r.v.length-1],pill:r.pill});
   L.say(b.errs.length===0,'TC-R203 761x375 values: zero app errors',b.errs.slice(0,3));await b.close();}
  // ── C. NEVER IN A GAME AGAINST A PERSON, AND NOT WHEN THE PLAYER HAS TURNED THE BAR OFF ───────────────────────────────────────────
  for(const [nm,go,store] of [['Pass & Play',b=>P.states['pp-1'](b),{ct_pool:'3'}],['vs computer with the eval bar turned off',b=>P.states['cpu-4ply'](b),{ct_pool:'3',ct_hideEval:'1'}]]){
    const b=await L.launch({geo:{w:761,h:375,safe:'',label:'761x375'},name:'land-graph-none',store});await b.open();let ok=true;try{await go(b);await b.settle(1500);}catch(e){ok=false;}
    const r=await read(b);
    L.say(ok&&!!r&&!!r.pbb,'TC-R203e 761x375 '+nm+' PRECONDITION the sideways game is on screen',r&&r.rail);
    L.say(!!r&&!r.graph,'TC-R203e 761x375 '+nm+': no eval graph',r&&r.graph);
    await b.close();}
},'127-landscape-eval-graph');
