// gates/audit/antagonist373-label.js  ANTAGONIST #373: A-09's LABEL half (rev-badge-label, only Brilliant/Blunder get
// one) on the a-file and the h-file, unflipped and flipped, at 320x568 and kunal - the edge game of antagonist373-review
// had no Blunder so it measured zero labels; here White hangs the queen on h7 (3.Qxh7??) and a bishop on a6 (6.Ba6??).
// Plus N-review-2 where the gate did not look: the label at 17.Rd8# with the engine line on and the board FLIPPED, and a
// mate played on the ANALYSIS board (from ply 32, Rd1-d8#) with the engine line on: does the label say 1-0 there?
'use strict';
const L=require('../lib');const R=require('../drive/review');
const PGN_BL='[Event "Bl"] [Site "?"] [Date "2026.01.01"] [White "A"] [Black "B"] [Result "*"] [WhiteElo "1500"] [BlackElo "1500"] 1. e4 e5 2. Qh5 Nf6 3. Qxh7 Rxh7 4. d4 exd4 5. Bd3 Nc6 6. Ba6 bxa6 *';
const items=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const Rb=g.getBoundingClientRect();const out=[];for(const id of ['rev-badge','rev-badge-label']){for(const e of document.querySelectorAll('[data-ct="'+id+'"]')){const r=e.getBoundingClientRect();if(r.width<2)continue;const dx=Math.max(0,Rb.left-r.left,r.right-Rb.right),dy=Math.max(0,Rb.top-r.top,r.bottom-Rb.bottom);let clip=null,p=e.parentElement;while(p&&p!==document.body){const s=getComputedStyle(p);if(/hidden|clip/.test(s.overflow+s.overflowX+s.overflowY)){const q=p.getBoundingClientRect();clip={ox:Math.round(Math.max(0,q.left-r.left,r.right-q.right)*10)/10,oy:Math.round(Math.max(0,q.top-r.top,r.bottom-q.bottom)*10)/10};break;}p=p.parentElement;}out.push({id,t:(e.innerText||'').trim().slice(0,10),dx:Math.round(dx*10)/10,dy:Math.round(dy*10)/10,clip,w:Math.round(r.width),h:Math.round(r.height),l:Math.round(r.left-Rb.left),r:Math.round(Rb.right-r.right),tp:Math.round(r.top-Rb.top)});}}return {sq:Math.round(Rb.width/8*10)/10,items:out};});
async function flipTo(b,want){const bd=await b.board();if(!!(bd&&bd.flip)===!!want)return;await R.closeSheet(b);await b.tapCt('rev-more',400);await b.tapText(/^Flip board$/);await b.settle(600);}
L.run(async()=>{
  for(const [tag,geo] of [['se','se'],['kunal','kunal']]){
    const b=await L.launch({geo,name:'ant-label-'+tag,store:{ct_pool:'3'}});await b.open();
    try{
      await R.importPgn(b,PGN_BL,180000);await R.startReview(b);
      for(const fl of [false,true]){await flipTo(b,fl);
        for(const p of [5,6,11,12]){await R.goPly(b,p);const it=await items(b);const ml=await b.text('[data-ct="rev-move-line"]');
          const labels=(it&&it.items||[]).filter(x=>x.id==='rev-badge-label');const all=it&&it.items||[];
          const worst=all.reduce((m,x)=>Math.max(m,x.dx,x.dy,x.clip?Math.max(x.clip.ox,x.clip.oy):0),0);
          L.say(worst<=0.5,tag+' '+(fl?'FLIPPED':'unflipped')+' ply '+p+' ('+(ml||'').slice(0,22).replace(/\n/g,' ')+'): '+all.length+' badge/label items, '+labels.length+' labels, worst outside/clipped '+worst+'px (sq '+(it&&it.sq)+')',all);
        }}
    }catch(e){L.say(false,tag+': blunder game threw',String(e).slice(0,200));}
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // N-review-2 off the gate's path: flipped at 17.Rd8# with the engine on; a mate played on the analysis board
  const b=await L.launch({geo:'kunal',name:'ant-label-mate',store:{ct_pool:'3'}});await b.open();
  try{
    await R.states['moves-last-engine'](b);await b.settle(1500);const n0=await b.text('[data-ct="eval-bar-num"]');const e0=await b.text('[data-ct="rev-engline"]');
    L.say(/1-0/.test(n0||''),'kunal: N-review-2 label at 17.Rd8# with the engine line on, unflipped ('+n0+'; engline '+(e0||'').slice(0,30)+')');
    await flipTo(b,true);await b.settle(1500);const n1=await b.text('[data-ct="eval-bar-num"]');
    L.say(/1-0/.test(n1||''),'kunal: N-review-2 label at 17.Rd8# with the engine line on, FLIPPED ('+n1+')');
    await flipTo(b,false);await R.goPly(b,32);await b.settle(800);const n32=await b.text('[data-ct="eval-bar-num"]');
    await b.tapCt('rev-fab',700);const tx=await b.texts();L.note('analysis board buttons: '+tx.join(' | ').slice(0,160)+'; label at ply 32 was '+n32);
    await b.move('d1','d8',600);await b.settle(3000);const nA=await b.text('[data-ct="eval-bar-num"]');const eA=await b.text('[data-ct="rev-engline"]');const mlA=await b.text('[data-ct="rev-move-line"]');
    L.say(/1-0/.test(nA||''),'kunal: N-review-2 a mate played on the ANALYSIS board (Rd8# from ply 32) with the engine line on reads 1-0',{num:nA,engline:(eA||'').slice(0,50),moveline:(mlA||'').slice(0,40)});
    await b.shot('label-kunal-analysis-mate');
    // the other side mated on the analysis board: from ply 0 play 1.f3 e5 2.g4 Qh4#
    await R.exitAnalysis(b);await R.goPly(b,0);await b.settle(500);await b.tapCt('rev-fab',700);
    await b.move('f2','f3',400);await b.move('e7','e5',400);await b.move('g2','g4',400);await b.move('d8','h4',600);await b.settle(3000);
    const nB=await b.text('[data-ct="eval-bar-num"]');const eB=await b.text('[data-ct="rev-engline"]');
    L.say(/0-1/.test(nB||''),'kunal: N-review-2 Fool\'s mate on the ANALYSIS board with the engine line on reads 0-1',{num:nB,engline:(eB||'').slice(0,50)});
    await b.shot('label-kunal-analysis-foolsmate');
  }catch(e){L.say(false,'kunal mate: threw',String(e).slice(0,200));}
  L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,'kunal mate: zero app errors',b.errs.slice(0,3));
  await b.close();
},'ANT-LABEL');
