// detail.js <census-diff.json> [state]  -> per state: moved elements grouped by dy (count + up to 4 sample keys), elements only in A/B,
// new overlaps, and the band contents in A and B.
const fs=require('fs');const R=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const only=process.argv[3];
const sk=(k)=>k.replace(/#\d+$/,'').slice(0,46);
for(const r of R){if(only&&r.name!==only)continue;
  console.log('\n### '+r.name);
  const g={};for(const m of r.moved){const d=m.dy+(m.dh?(' dh'+m.dh):'')+(m.dx?(' dx'+m.dx):'');(g[d]=g[d]||[]).push(m);}
  for(const [d,ms] of Object.entries(g).sort((a,b)=>b[1].length-a[1].length))console.log('  dy '+d+': '+ms.length+'  e.g. '+ms.slice(0,4).map(m=>sk(m.k)+'('+m.yA+'->'+m.yB+')').join(' | '));
  if(r.onlyA.length)console.log('  only A: '+r.onlyA.slice(0,6).map(sk).join(' | '));
  if(r.onlyB.length)console.log('  only B: '+r.onlyB.slice(0,6).map(sk).join(' | '));
  if(r.newOverlaps.length)console.log('  NEW OVERLAPS in B: '+r.newOverlaps.slice(0,8).map(x=>x.replace(/#\d+/g,'').slice(0,110)).join(' || '));
  console.log('  band A: '+r.bandA.map(x=>x.replace(/#\d+/,'')).slice(0,20).join(' | '));
  console.log('  band B: '+r.bandB.map(x=>x.replace(/#\d+/,'')).slice(0,20).join(' | '));
}
