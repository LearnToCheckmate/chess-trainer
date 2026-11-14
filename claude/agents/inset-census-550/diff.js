// diff.js <census-A.json> <census-B.json>  -> per state: elements that moved (by key), new overflow, new overlaps between
// controls, and painted elements inside the top 0..51 or bottom 31 band, in A and in B. Prints JSON lines and a markdown table.
'use strict';
const fs=require('fs');const [fa,fb]=process.argv.slice(2);
const A=JSON.parse(fs.readFileSync(fa,'utf8')),B=JSON.parse(fs.readFileSync(fb,'utf8'));
const TOP=51,BOT=31;
const inter=(p,q)=>Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x)>1&&Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y)>1;
const contains=(p,q)=>p.x<=q.x+0.5&&p.y<=q.y+0.5&&p.x+p.w>=q.x+q.w-0.5&&p.y+p.h>=q.y+q.h-0.5;
const overlaps=(s)=>{const c=s.els.filter(e=>e.btn);const o=new Set();
  for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++){const p=c[i],q=c[j];if(inter(p,q)&&!contains(p,q)&&!contains(q,p))o.add(p.k+' x '+q.k);}return o;};
const band=(s)=>s.els.filter(e=>e.y<TOP-0.5||e.y+e.h>s.vh-BOT+0.5).filter(e=>!(e.y<=0.5&&e.h>=s.vh-1));   // drop full-height layers
const res=[];
for(const name of Object.keys(A.states)){
  const a=A.states[name],b=B.states[name];if(!b){res.push({name,missingB:true});continue;}
  const am=new Map(a.els.map(e=>[e.k,e])),bm=new Map(b.els.map(e=>[e.k,e]));
  const moved=[];for(const [k,e] of am){const f=bm.get(k);if(!f)continue;const dx=+(f.x-e.x).toFixed(1),dy=+(f.y-e.y).toFixed(1),dh=+(f.h-e.h).toFixed(1),dw=+(f.w-e.w).toFixed(1);if(Math.abs(dx)>0.5||Math.abs(dy)>0.5||Math.abs(dh)>0.5||Math.abs(dw)>0.5)moved.push({k,dx,dy,dw,dh,yA:e.y,yB:f.y});}
  const onlyA=[...am.keys()].filter(k=>!bm.has(k)),onlyB=[...bm.keys()].filter(k=>!am.has(k));
  const oa=overlaps(a),ob=overlaps(b);const newOv=[...ob].filter(x=>!oa.has(x));
  const bandA=band(a).map(e=>e.k+'@'+e.y+'+'+e.h),bandB=band(b).map(e=>e.k+'@'+e.y+'+'+e.h);
  const ovf=(s)=>({docX:s.docSW>s.vw,rootX:s.rootSW>s.rootCW,rootY:s.rootSH-s.rootCH});
  res.push({name,errA:a.err,errB:b.err,envA:[a.envTop,a.envBot],envB:[b.envTop,b.envBot],boardA:a.board,boardB:b.board,
    nA:a.els.length,nB:b.els.length,moved,onlyA,onlyB,newOverlaps:newOv,bandA,bandB,ovfA:ovf(a),ovfB:ovf(b)});
}
fs.writeFileSync(fb.replace(/census-B\.json$/,'census-diff.json'),JSON.stringify(res,null,1));
for(const r of res){
  const dys=[...new Set(r.moved.map(m=>m.dy))].sort((p,q)=>p-q);
  console.log('## '+r.name+'  env A '+JSON.stringify(r.envA)+' B '+JSON.stringify(r.envB)+'  els '+r.nA+'/'+r.nB+'  moved '+r.moved.length+' (dy values '+dys.join(',')+')  onlyA '+r.onlyA.length+' onlyB '+r.onlyB.length+'  newOverlaps '+r.newOverlaps.length+'  band A '+r.bandA.length+' B '+r.bandB.length+'  ovf A '+JSON.stringify(r.ovfA)+' B '+JSON.stringify(r.ovfB)+'  board A '+JSON.stringify(r.boardA)+' B '+JSON.stringify(r.boardB)+(r.errA||r.errB?'  ERR '+r.errA+' / '+r.errB:''));
}
