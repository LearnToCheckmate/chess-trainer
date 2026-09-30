// probe438-cpu - the configuration gate 64 never enters: vs COMPUTER, landscape, game over.
// The three wide-only sites at chess.jsx:6270/6271/6277 mount the bot chip, the Elo pill and the Elo slider when
// !(opponent&&!isOver&&!playEnd) - i.e. AT GAME OVER - and only in wide. Pass & Play never mounts them
// (opponent==='human'), so gate 64's six sessions cannot see them. The job's own notChecked names them.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const ROW=['Moves','Back','Forward','Review','Rematch','Hint','Flip','More'];
const rowOf=(b)=>b.page.evaluate((want)=>{
  const all=[...document.querySelectorAll('button')].filter(x=>{const t=(x.title||'').trim();const r=x.getBoundingClientRect();
    return want.indexOf(t)>=0&&r.width>1&&r.height>1;})
    .map(x=>{const r=x.getBoundingClientRect();return {label:(x.title||'').trim(),x:Math.round(r.left),y:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10};});
  if(!all.length)return {labels:[],bottom:null};
  const ys=all.map(a=>a.y).sort((p,q)=>p-q);let bandY=ys[0],bandN=0;
  for(const y of ys){const n=all.filter(a=>Math.abs(a.y-y)<=3).length;if(n>bandN){bandN=n;bandY=y;}}
  const items=all.filter(a=>Math.abs(a.y-bandY)<=3).sort((p,q)=>p.x-q.x);
  return {labels:items.map(i=>i.label),bottom:Math.max.apply(null,items.map(i=>i.bottom)),items};
},ROW);
const hitMap=(b)=>b.page.evaluate((want)=>{
  const res=[];
  for(const x of document.querySelectorAll('button')){
    const t=(x.title||'').trim();if(want.indexOf(t)<0)continue;
    const r=x.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    const cx=r.left+r.width/2;const pts=[];
    for(let dy=3;dy<r.height;dy+=4){const el=document.elementFromPoint(cx,r.top+dy);pts.push(!!(el&&(el===x||x.contains(el))));}
    const c=document.elementFromPoint(cx,r.top+r.height/2);
    res.push({label:t,ok:pts.filter(Boolean).length,total:pts.length,centre:!!(c&&(c===x||x.contains(c)))});
  }
  return res;
},ROW);
const railOf=(b)=>b.page.evaluate(()=>{
  let best=null;
  for(const el of document.querySelectorAll('div')){
    const st=getComputedStyle(el);if(st.overflowY!=='auto'&&st.overflowY!=='scroll')continue;
    const r=el.getBoundingClientRect();if(r.width<60||r.height<60||r.left<20)continue;
    if(!best||r.top>best.y)best={y:Math.round(r.top),ch:el.clientHeight,sh:el.scrollHeight,clipBottom:Math.round(r.top+el.clientHeight),
      kids:[...el.children].map(c=>(c.getAttribute('data-ct')||c.tagName)+':'+Math.round(c.getBoundingClientRect().height)).join(' ')};
  }
  return best;
});
// is the wide bot chip / Elo pill / Elo slider mounted?
const eloChrome=(b)=>b.page.evaluate(()=>{
  const sl=[...document.querySelectorAll('input[type=range]')].filter(x=>{const r=x.getBoundingClientRect();return r.width>2&&r.height>2;});
  const elo=[...document.querySelectorAll('span')].filter(x=>/≈\s*\d+\s*Elo/.test(x.innerText||'')).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),y:Math.round(r.top),h:Math.round(r.height)};});
  const bot=[...document.querySelectorAll('span')].filter(x=>/vs Computer|^Pip$|^Rosa$|^Milo$/.test((x.innerText||'').trim())).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),y:Math.round(r.top),h:Math.round(r.height)};});
  return {sliders:sl.length, sliderH:sl.length?Math.round(sl[0].getBoundingClientRect().height):null, eloPills:elo, botChips:bot};
});
async function report(b,tag){
  const row=await rowOf(b),hm=await hitMap(b),rail=await railOf(b),ec=await eloChrome(b);
  const bad=hm.filter(h=>h.ok<h.total||!h.centre);
  console.log('\n---- '+tag+' ----');
  console.log('  row      : '+JSON.stringify(row.labels)+'   bottom '+row.bottom);
  console.log('  rail     : ch='+(rail&&rail.ch)+' sh='+(rail&&rail.sh)+' clipBottom='+(rail&&rail.clipBottom));
  console.log('  rail kids: '+(rail&&rail.kids));
  console.log('  wide Elo chrome mounted: sliders='+ec.sliders+' (h='+ec.sliderH+')  eloPills='+JSON.stringify(ec.eloPills)+'  botChips='+JSON.stringify(ec.botChips));
  console.log('  REACHABLE: '+(bad.length===0?'ALL '+hm.length+' controls 100%':'*** '+bad.map(h=>h.label+' '+h.ok+'/'+h.total+(h.centre?'':' CENTRE DEAD')).join(' | ')+' ***'));
  console.log('  INSIDE RAIL: '+(!rail?'n/a (no rail - portrait)':(row.bottom!=null&&row.bottom<=rail.clipBottom?'yes':'*** NO - row bottom '+row.bottom+' > clip '+rail.clipBottom+' ***')));
}
L.run(async()=>{
  const b=await L.launch({geo:{w:375,h:730,safe:''},name:'p438cpu'});await b.open();
  await P.states['cpu-resigned'](b);                       // vs Pip, resigned: playEnd set, opponent==='computer'
  console.log('\n============ vs COMPUTER, resigned, PORTRAIT (the control) ============');
  await report(b,'portrait 375x730');
  await b.page.setViewportSize({width:730,height:375});await b.settle(1500);
  console.log('\n============ vs COMPUTER, resigned, LANDSCAPE 730x375 ============');
  await report(b,'landscape 730x375 TERMINAL');
  await b.shot('p438-cpu-landscape-over');
  await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>(e.title||'').trim()==='Back');if(x)x.click();});
  await b.settle(700);
  await report(b,'landscape 730x375 after BACK x1');
  await b.close();
  L.done();
});
