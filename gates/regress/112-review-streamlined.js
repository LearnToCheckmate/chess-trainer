'use strict';
// gates/regress/112-review-streamlined.js - THE STREAMLINED REVIEW: BOARD EDGE TO EDGE, THE MOVE LIST UNDER IT, A BOTTOM TOOLBAR. TC-R192a..e, US-R125.
//
// WHY [#550, answer a21 of directOpening_2026_11_11_batch10; Kunal on the Desk, B10-Q21: "Option B: the move list under the board";
// jobs/a-streamlined-board-view-like-chesscoms-2026-11-11, mockup claude/agents/shots/550-65-mock-B-375x761.png]. Review on a phone was a
// board narrowed by an eval bar beside it, an eval graph band, a transport row and the move strip at the foot of the screen. His pick:
// a header (back, Game Review, more) where the height allows, the eval bar ABOVE an edge-to-edge board, the move strip straight under
// the board, the move's explanation, and a bottom toolbar of Back, Analyze, Key move and Forward.
//
// WHAT IT ASSERTS on the Opera game at 10.Nxb5 (ply 19), at kunal761 (his phone), 390x844 and se (320x568):
//  (a) TC-R192a the board is as wide as the screen where the width binds (375 at kunal761, 390 at 390x844) and the eval bar is the
//      horizontal one above it (eval-bar-h, no eval-bar-v).
//  (b) TC-R192b the move strip is straight under the bottom player bar (within 12px), and the explanation (rev-compact) under the strip.
//  (c) TC-R192c the toolbar is Back, Analyze, Key move, Forward, every button at least 44px tall, on screen and below rev-compact.
//  (d) TC-R192d the header row (rev-head: back, Game Review, more) is there at 700px tall and over, and on a shorter screen back and more
//      sit in the top player bar instead - either way exactly one back and one more are on screen.
//  (e) TC-R192e the board does not move: its width and top are the same at plies 0, 19 and 33, after the engine line is switched on
//      and off, and in and out of analysis.
// DENOMINATOR per geometry: the review was reached at ply 19 and the board is measured.
// CONTROL-RECORD: 6180c2b 2026-11-11 total=25 red=12 scope=trial:28378590a526 how=#550 answer a21: the tree before the streamlined review (eval bar beside a 349 board, the strip at the foot) - TC-R192a, b, c and d red at all three geometries; the denominators, TC-R192e and the error lines green. On t61 (the build that carries the engine-off regrowth) 25 of 25 green
const L=require('../lib');const R=require('../drive/review');
const GEOS=[{g:'kunal761',w:375,head:true},{g:{w:390,h:844},w:390,head:true,label:'390x844'},{g:'se',w:null,head:false}];
const read=(b)=>b.page.evaluate(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.height>0?{x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom}:null;};
  const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8/.test(d.style.gridTemplateColumns)).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  const tb=document.querySelector('[data-ct="rev-toolbar"]');const btns=tb?[...tb.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {l:x.getAttribute('aria-label')||'',y:r.top,b:r.bottom,h:r.height,x:r.left,r:r.right};}):[];
  const vis=s=>[...document.querySelectorAll(s)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;}).length;
  return {vw:innerWidth,vh:innerHeight,board:bd?{y:bd.top,w:Math.round(bd.width*100)/100,b:bd.bottom}:null,evh:q('[data-ct="eval-bar-h"]'),evv:q('[data-ct="eval-bar-v"]'),pb:q('[data-ct="pbar-bottom"]'),strip:q('[data-ct="strip-row"]'),cmp:q('[data-ct="rev-compact"]'),tb:q('[data-ct="rev-toolbar"]'),btns,head:q('[data-ct="rev-head"]'),backs:vis('[data-ct="rev-back"]'),mores:vis('[data-ct="rev-more"]')};});
L.run(async()=>{
  for(const G of GEOS){const tag=G.label||G.g;
    const b=await L.launch({geo:G.g,name:'stream-'+tag,store:{ct_pool:'3'}});await b.open();
    let ok=true;try{await R.importPgn(b,R.PGN_OPERA);await b.tapText(/^Start review ›$/,{wait:900});await R.goPly(b,19);await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const m=ok?await read(b):null;
    L.say(ok&&!!m&&!!m.board,tag+': TC-R192 DENOMINATOR the review is at 10.Nxb5 and the board is measured',m&&m.board);
    if(!m||!m.board){await b.close();continue;}
    L.say(!!m.evh&&!m.evv&&(G.w==null||Math.abs(m.board.w-G.w)<0.6),tag+': TC-R192a the eval bar is above the board and the board is '+(G.w==null?'as wide as the height allows':'the screen\'s full '+G.w)+' ('+m.board.w+')',{board:m.board,evh:m.evh,evv:m.evv});
    L.say(!!m.pb&&!!m.strip&&m.strip.y>=m.pb.b-0.5&&m.strip.y-m.pb.b<=12&&!!m.cmp&&m.cmp.y>=m.strip.b-0.5,tag+': TC-R192b the move strip is straight under the bottom player bar ('+(m.strip&&m.pb&&Math.round((m.strip.y-m.pb.b)*10)/10)+'px) and the explanation under the strip',{pb:m.pb,strip:m.strip,cmp:m.cmp});
    const order=m.btns.map(x=>x.l);
    L.say(order.length===4&&/^Previous move$/.test(order[0])&&/^Analyze/.test(order[1])&&/key moment/i.test(order[2])&&/^Next move$/.test(order[3])&&m.btns.every(x=>x.h>=43.5&&x.y>=0&&x.b<=m.vh+0.5)&&!!m.cmp&&m.tb.y>=m.cmp.b-0.5,tag+': TC-R192c the toolbar is Back, Analyze, Key move, Forward, each 44px or taller, on screen and below the explanation ('+order.join(' | ')+')',{btns:m.btns,cmp:m.cmp,tb:m.tb});
    L.say((G.head?!!m.head:!m.head)&&m.backs===1&&m.mores===1,tag+': TC-R192d '+(G.head?'the header row is there':'no header row on a short screen')+' and exactly one back and one more are on screen ('+m.backs+', '+m.mores+')',{head:m.head,backs:m.backs,mores:m.mores});
    const seen=[];const pin=async(why)=>{const x=await read(b);seen.push({why,y:x.board&&Math.round(x.board.y*100)/100,w:x.board&&x.board.w});};
    await pin('ply 19');await R.goPly(b,0);await pin('ply 0');await R.goPly(b,33);await pin('ply 33');await R.goPly(b,19);
    try{await b.tapCt('rev-fab',800);await pin('analysis');await b.tapText(/Exit analysis$/,{wait:800});await b.settle(900);await pin('after analysis');}catch(e){L.note(tag+' analysis: '+String(e).slice(0,100));}
    const ys=new Set(seen.map(s=>s.y)),ws=new Set(seen.map(s=>s.w));
    L.say(seen.length>=5&&ys.size===1&&ws.size===1,tag+': TC-R192e the board does not move across plies 0, 19 and 33 or in and out of analysis ('+seen.length+' readings: '+[...ws].join('/')+' wide, top '+[...ys].join('/')+')',seen);
    // the engine line is a SETTING (the more sheet): switched on it may take its row from the board, and switched off the board is back exactly
    let eOn=null,eOff=null;try{await R.engineSet(b,true);await b.settle(1200);eOn=(await read(b)).board;await R.engineSet(b,false);await b.settle(1200);eOff=(await read(b)).board;}catch(e){L.note(tag+' engine: '+String(e).slice(0,100));}
    L.say(!!eOn&&!!eOff&&Math.abs(eOff.w-seen[0].w)<0.6&&Math.abs(eOff.y-seen[0].y)<0.6&&seen[0].w-eOn.w<=32,tag+': TC-R192e switching the engine line on takes at most its row from the board ('+(eOn&&eOn.w)+' against '+seen[0].w+') and switching it off puts the board back exactly ('+(eOff&&eOff.w)+')',{eOn,eOff,was:seen[0]});
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+': TC-R192 no app error',b.errs.slice(0,3));
    await b.close();
  }
},'112-review-streamlined');
