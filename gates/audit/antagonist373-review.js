// gates/audit/antagonist373-review.js  ANTAGONIST #373: A-09 (verdict badge and label clamped inside the board).
// TC-R07 measured rank 8 (b8/d8) at kunal and 390, unflipped. Here: a 10-ply game whose moves land on a4, h5, h4,
// a5, a3, a6, h3, h6, h1 and a8 (the a-file, both corners), every ply measured unflipped AND flipped, at 320x568
// and 430x932; plus the Opera Game at 16.Qb8+ / 17.Rd8# flipped with the eval graph on (stored profile).
'use strict';
const L=require('../lib');const R=require('../drive/review');
const PGN_EDGE='[Event "Edge"] [White "A"] [Black "B"] [Result "*"] [WhiteElo "1500"] [BlackElo "1500"] 1. a4 h5 2. h4 a5 3. Ra3 Ra6 4. Rh3 Rh6 5. Rh1 Ra8 *';
const badges=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const R=g.getBoundingClientRect();const out=[];for(const id of ['rev-badge','rev-badge-label']){for(const e of document.querySelectorAll('[data-ct="'+id+'"]')){const r=e.getBoundingClientRect();if(r.width<2)continue;const st=getComputedStyle(e);const dx=Math.max(0,R.left-r.left,r.right-R.right),dy=Math.max(0,R.top-r.top,r.bottom-R.bottom);const par=e.parentElement;const clip=(()=>{let p=e.parentElement;while(p&&p!==document.body){const s=getComputedStyle(p);if(/hidden|clip/.test(s.overflow+s.overflowX+s.overflowY)){const q=p.getBoundingClientRect();return {ox:Math.max(0,q.left-r.left,r.right-q.right),oy:Math.max(0,q.top-r.top,r.bottom-q.bottom)};}p=p.parentElement;}return null;})();out.push({id,t:(e.innerText||'').trim().slice(0,10),dx:Math.round(dx*10)/10,dy:Math.round(dy*10)/10,clip,w:Math.round(r.width),h:Math.round(r.height),l:Math.round(r.left-R.left),tp:Math.round(r.top-R.top)});}}return {board:{w:Math.round(R.width),l:Math.round(R.left),t:Math.round(R.top)},items:out};});
async function flipTo(b,want){const bd=await b.board();if(!!(bd&&bd.flip)===!!want)return;await R.closeSheet(b);await b.tapCt('rev-more',400);await b.tapText(/^Flip board$/);await b.settle(600);}
L.run(async()=>{
  for(const [tag,geo] of [['se','se'],['430','430']]){
    const b=await L.launch({geo,name:'ant-rev-'+tag,store:{ct_pool:'3'}});await b.open();
    try{
      const t0=Date.now();await R.importPgn(b,PGN_EDGE,180000);L.note(tag+': edge game analysed in '+Math.round((Date.now()-t0)/1000)+' s');
      await R.startReview(b);
      for(const fl of [false,true]){
        await flipTo(b,fl);const rows=[];let worst=0,worstAt='';
        for(let p=1;p<=10;p++){await R.goPly(b,p);const bg=await badges(b);const ml=await b.text('[data-ct="rev-move-line"]');const outs=(bg&&bg.items||[]).map(x=>({id:x.id,t:x.t,dx:x.dx,dy:x.dy,clip:x.clip,l:x.l,tp:x.tp,w:x.w,h:x.h}));for(const o of outs){const m=Math.max(o.dx,o.dy,o.clip?Math.max(o.clip.ox,o.clip.oy):0);if(m>worst){worst=m;worstAt='ply '+p+' '+o.id+' '+o.t;}}rows.push({p,ml:(ml||'').slice(0,18),n:outs.length,outs});}
        const n=rows.reduce((a,r)=>a+r.n,0);
        L.say(n>=8&&worst<=0.5,tag+': A-09 '+(fl?'FLIPPED':'unflipped')+' edge game: '+n+' badges/labels over 10 plies, worst outside/clipped '+worst+'px'+(worstAt?' at '+worstAt:''),rows.filter(r=>r.outs.some(o=>o.dx>0.5||o.dy>0.5||(o.clip&&(o.clip.ox>0.5||o.clip.oy>0.5)))).map(r=>({p:r.p,ml:r.ml,outs:r.outs})).slice(0,6));
        const labels=rows.flatMap(r=>r.outs.filter(o=>o.id==='rev-badge-label').map(o=>({p:r.p,t:o.t,l:o.l,w:o.w})));L.note(tag+': '+(fl?'flipped':'unflipped')+' labels: '+JSON.stringify(labels).slice(0,300));
        await b.shot('rev-'+tag+'-edge-'+(fl?'flipped':'unflipped')+'-ply10');
      }
    }catch(e){L.say(false,tag+': edge game threw',String(e).slice(0,160));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // Opera flipped with the eval graph stored on, at kunal
  const b=await L.launch({geo:'kunal',name:'ant-rev-kunal-graph',store:{ct_pool:'3',ct_evalgraph:'1'}});await b.open();
  try{
    await R.states['moves-ply31'](b);await flipTo(b,true);await b.settle(400);const b31=await badges(b);
    L.say(!!b31&&b31.items.length>0&&b31.items.every(x=>x.dx<=0.5&&x.dy<=0.5),'kunal+graph: A-09 16.Qb8+ FLIPPED badge inside the board',b31&&b31.items);
    await R.goPly(b,33);const b33=await badges(b);const num=await b.text('[data-ct="eval-bar-num"]');
    L.say(!!b33&&b33.items.length>0&&b33.items.every(x=>x.dx<=0.5&&x.dy<=0.5),'kunal+graph: A-09 17.Rd8# FLIPPED badge inside the board (label '+num+')',b33&&b33.items);
    const g=await b.rect('[data-ct="eval-graph"]');L.note('kunal+graph: eval graph '+JSON.stringify(g&&{w:Math.round(g.w),h:Math.round(g.h)})+' board '+JSON.stringify(b33&&b33.board));
    await b.shot('rev-kunal-graph-flipped-ply33');
  }catch(e){L.say(false,'kunal+graph: threw',String(e).slice(0,160));}
  L.say(b.errs.length===0,'kunal+graph: zero app errors',b.errs.slice(0,3));
  await b.close();
},'ANT-REVIEW');
