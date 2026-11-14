// lprobe.js - one Opera Game review at kunal761, ct_pool 3, eval cache cleared, printed as one JSON line (LPROBE {...}).
//   CT_APP=<bundle> LP_TAP=early|late [LP_THROTTLE=<cdp rate>] node lprobe.js
// early: Analyze is tapped as soon as the Review screen is up after open (the engine may still be loading - the old tree's
//        sfReadyRef / ensureAna 5 s path). late: 10 s settle after open first (engine ready), as gate 163 effectively does.
'use strict';
const R='/home/user/chess-trainer/.claude/worktrees/agent-a166f5d9d7a715906/gates/';
const L=require(R+'lib');
const PGN='[Event "Opera Game"] [White "Morphy"] [Black "Duke"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const CATS=[...L.GRADES];
L.run(async()=>{
  const b=await L.launch({geo:'kunal761',name:'lprobe',store:{ct_pool:'3'}});
  if(process.env.LP_THROTTLE){const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:+process.env.LP_THROTTLE});}
  const tOpen=Date.now();await b.open();
  await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
  if(process.env.LP_TAP==='late')await b.page.waitForTimeout(10000);
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN);
  const t0=Date.now();await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:100});
  let shown=null;
  try{await b.page.waitForFunction(()=>!!document.querySelector('[data-ct="rev-summary"]')||/The review stopped before it finished/.test(document.body.innerText||''),null,{timeout:900000,polling:250});
    shown=await b.page.evaluate(()=>document.querySelector('[data-ct="rev-summary"]')?'summary':'refused');}catch(e){shown=/Timeout/i.test(String(e))?'timeout':'error';}
  const ms=Date.now()-t0;await b.settle(700);
  const r=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');const txt=s?(s.innerText||'').replace(/ /g,' '):'';
    let c={};try{c=JSON.parse(localStorage.getItem('ct_evalcache')||'{}')||{};}catch(e){}const ks=Object.keys(c);const v=ks.length===1?c[ks[0]]:null;
    const rv=window.__ctReview;return {txt,evW:v&&Array.isArray(v.evW)?v.evW:null,engine:rv&&rv.engine?Object.assign({},rv.engine):null};});
  const acc=(r.txt.match(/(\d{1,3}(?:\.\d)?)\s*%/g)||[]).slice(0,2).map(x=>parseFloat(x));
  const rows=r.txt.split('\n').map(x=>x.trim());const counts={};
  for(const c of CATS){const i=rows.indexOf(c);const w=i>=0?parseInt(rows[i+1],10):NaN,k=i>=0?parseInt(rows[i+2],10):NaN;counts[c]=(Number.isInteger(w)&&Number.isInteger(k))?[w,k]:null;}
  const out={app:(process.env.CT_APP||'').split('/').pop(),tap:process.env.LP_TAP||'late',throttle:process.env.LP_THROTTLE||null,shown,s:Math.round(ms/1000),openToTap:Math.round((t0-tOpen)/1000),acc,
    counts:CATS.map(c=>(counts[c]||['-','-']).join('/')).join(' '),evWn:r.evW?r.evW.length:null,evW:r.evW,engine:r.engine,errs:b.errs.filter(e=>!/unreachable/.test(e)).length};
  console.log('LPROBE '+JSON.stringify(out));
  L.say(!!shown,'probe ran');
  await b.close();
},'LPROBE');
