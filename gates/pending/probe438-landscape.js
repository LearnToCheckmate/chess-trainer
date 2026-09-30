// probe438 - MEASURE the two halves of jobs/landscape-game-over-keeps-the-live-row-and-the-rail-clips-half-of-it
// against whatever bundle CT_APP names, BEFORE any fix. Not a gate; it prints, it does not assert.
'use strict';
const L=require('../lib');

const sigOf=(b)=>b.page.evaluate(()=>{
  const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.r.width)best={e,r};}
  if(!best)return null;
  return [...best.e.children].slice(0,64).map(k=>{
    const cs=getComputedStyle(k);
    const kids=[...k.children].map(c=>{const s=getComputedStyle(c);const r=c.getBoundingClientRect();
      return c.tagName+':'+s.backgroundColor+':'+s.backgroundImage.slice(0,40)+':'+s.opacity+':'+s.border+':'+Math.round(r.width)+'x'+Math.round(r.height);}).join(',');
    return cs.backgroundColor+'|'+cs.boxShadow+'|'+kids+'|'+(k.innerText||'').trim();
  }).join(';');
});

const rowOf=(b)=>b.page.evaluate(()=>{
  const want=['Moves','Back','Forward','Review','Rematch','Hint','Flip','More'];
  const all=[...document.querySelectorAll('button')].filter(x=>{const t=(x.title||'').trim();const r=x.getBoundingClientRect();
    return want.indexOf(t)>=0&&r.width>1&&r.height>1;})
    .map(x=>{const r=x.getBoundingClientRect();return {label:(x.title||'').trim(),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,dis:!!x.disabled};});
  if(!all.length)return {labels:[],items:[]};
  const ys=all.map(a=>a.y).sort((p,q)=>p-q);let bandY=ys[0],bandN=0;
  for(const y of ys){const n=all.filter(a=>Math.abs(a.y-y)<=3).length;if(n>bandN){bandN=n;bandY=y;}}
  const items=all.filter(a=>Math.abs(a.y-bandY)<=3).sort((p,q)=>p.x-q.x);
  return {labels:items.map(i=>i.label),items};
});

// EVERY scroller on screen, plus the one that looks like the wide side rail (overflowY auto + overflowX hidden)
const railOf=(b)=>b.page.evaluate(()=>{
  const out=[];
  for(const el of document.querySelectorAll('div')){
    const st=getComputedStyle(el);
    if(st.overflowY!=='auto'&&st.overflowY!=='scroll')continue;
    const r=el.getBoundingClientRect();
    if(r.width<60||r.height<60)continue;
    out.push({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
      ch:el.clientHeight,sh:el.scrollHeight,range:el.scrollHeight-el.clientHeight,scrollTop:Math.round(el.scrollTop),
      ox:st.overflowX,pt:st.paddingTop,
      kids:[...el.children].map(c=>{const cr=c.getBoundingClientRect();return (c.tagName+'['+(c.getAttribute('data-ct')||'')+']:'+Math.round(cr.height));}).join(' ')});
  }
  return out;
});

// hit-test DOWN each control's own height in 4px steps: is the full height reachable by a finger?
const hitMap=(b)=>b.page.evaluate(()=>{
  const want=['Moves','Back','Forward','Review','Rematch','Hint','Flip','More'];
  const res=[];
  for(const x of document.querySelectorAll('button')){
    const t=(x.title||'').trim();if(want.indexOf(t)<0)continue;
    const r=x.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    const cx=r.left+r.width/2;const pts=[];
    for(let dy=3;dy<r.height;dy+=4){
      const el=document.elementFromPoint(cx,r.top+dy);
      pts.push({dy,hit:!!(el&&(el===x||x.contains(el)))});
    }
    const ok=pts.filter(p=>p.hit).length;
    const deadFrom=pts.find(p=>!p.hit);
    res.push({label:t,h:Math.round(r.height*10)/10,centreHit:(()=>{const el=document.elementFromPoint(cx,r.top+r.height/2);return !!(el&&(el===x||x.contains(el)));})(),
      ok,total:pts.length,firstDeadDy:deadFrom?deadFrom.dy:null});
  }
  return res;
});

async function mate(b){
  await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
  await b.move('f2','f3',450);await b.move('e7','e5',450);await b.move('g2','g4',450);await b.move('d8','h4',900);
  await b.settle(700);
}
async function report(b,tag){
  const rail=await railOf(b);const row=await rowOf(b);const hm=await hitMap(b);
  console.log('\n---------- '+tag+' ----------');
  console.log('  row labels : '+JSON.stringify(row.labels));
  for(const i of row.items)console.log('    '+i.label.padEnd(9)+' x'+String(i.x).padStart(4)+' y'+String(i.y).padStart(4)+' '+i.w+'x'+i.h+' bottom '+i.bottom+(i.dis?'  DISABLED':''));
  console.log('  scrollers  : '+(rail.length?'':'(none)'));
  for(const r of rail)console.log('    ['+r.x+','+r.y+','+(r.x+r.w)+','+(r.y+r.h)+'] ch='+r.ch+' sh='+r.sh+' RANGE='+r.range+' ox='+r.ox+' pt='+r.pt+'\n        kids: '+r.kids);
  console.log('  hit map (4px steps down each control):');
  for(const h of hm)console.log('    '+h.label.padEnd(9)+' h='+h.h+'  reachable '+h.ok+'/'+h.total+'  centre '+(h.centreHit?'HIT':'*** DEAD ***')+(h.firstDeadDy!=null?'  first dead dy='+h.firstDeadDy:''));
  return {rail,row,hm};
}

L.run(async()=>{
  // ---------- ROUTE 1: portrait -> mate -> rotate (the route a real phone takes) ----------
  {
    const b=await L.launch({geo:{w:375,h:730,safe:''},name:'p438-rot'});await b.open();
    await mate(b);
    console.log('\n================ ROUTE 1: mated in PORTRAIT 375x730, then rotated ================');
    await report(b,'portrait 375x730, TERMINAL PLY (control)');
    await b.page.setViewportSize({width:730,height:375});await b.settle(1400);
    const at=await report(b,'landscape 730x375, TERMINAL PLY  <-- the defect');
    // instrument validation must come from a LIVE state; do it after, in its own session
    if(at.row.labels.indexOf('Hint')>=0){
      const before=await sigOf(b);
      const hint=await b.page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(x=>(x.title||'').trim()==='Hint'));
      const el=hint.asElement();const box=await el.boundingBox();
      await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(900);
      const afterMouse=await sigOf(b);
      await b.page.evaluate(()=>{const h=[...document.querySelectorAll('button')].find(x=>(x.title||'').trim()==='Hint');if(h)h.click();});
      await b.page.waitForTimeout(900);
      const afterDom=await sigOf(b);
      console.log('  HINT at the terminal ply: mouse-click moved the board? '+(afterMouse!==before)+'   element.click() moved it? '+(afterDom!==before));
    }
    await b.page.mouse.click(8,8);await b.settle(300);
    // step BACK twice and re-read (the trap: does the clip persist?)
    try{
      await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(b=>(b.title||'').trim()==='Back');if(x)x.click();});
      await b.settle(600);
      await report(b,'landscape 730x375, after BACK x1');
      await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(b=>(b.title||'').trim()==='Back');if(x)x.click();});
      await b.settle(600);
      await report(b,'landscape 730x375, after BACK x2');
    }catch(e){console.log('  back failed: '+e.message);}
    await b.close();
  }

  // ---------- ROUTE 2: a LIVE landscape game, as the control for the row and the rail ----------
  {
    const b=await L.launch({geo:{w:375,h:730,safe:''},name:'p438-live'});await b.open();
    await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
    await b.move('e2','e4',450);await b.move('e7','e5',450);await b.settle(400);
    await b.page.setViewportSize({width:730,height:375});await b.settle(1400);
    console.log('\n================ ROUTE 2: LIVE landscape game (the control) ================');
    const live=await report(b,'landscape 730x375, LIVE (2 plies)');
    const before=await sigOf(b);
    await b.page.evaluate(()=>{const h=[...document.querySelectorAll('button')].find(x=>(x.title||'').trim()==='Hint');if(h)h.click();});
    await b.page.waitForTimeout(1200);
    const after=await sigOf(b);
    console.log('  INSTRUMENT VALIDATION: Hint in a LIVE landscape game moved the 64-square signature? '+(after!==before)+'  (squares read: '+(before?before.split(';').length:null)+')');
    await b.close();
  }
  L.done();
});
