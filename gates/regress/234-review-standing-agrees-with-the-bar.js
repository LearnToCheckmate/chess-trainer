'use strict';
// gates/regress/234-review-standing-agrees-with-the-bar.js - THE REVIEW SENTENCE'S STANDING CLAUSE NEVER DISAGREES IN CATEGORY WITH THE
// EVAL BAR, AND A PLY WITH NO STORED EVALUATION IS NEVER CALLED LEVEL. TC-R399, TC-R400; US-R85 (the missing-eval clause).
//
// WHY [#553 B3, jobs/a-missing-eval-and-a-level-position-print-the-same-sentence-2026-09-29, the remainder #548/#549/#550 left: "the case's
// second half, that the sentence and the eval readout never disagree in category at any ply, is not asserted anywhere"]. The unit layer
// (gate 21 TC-R87) proves reviewText says nothing about the standing when a.evalAfter is not a number. Nothing walked a REAL review.
//  TC-R399 THE WALK, at CT_G234_GEO (kunal761 default; gates/pairs also runs se), the Opera Game pasted (no account, so the sentence names
//          White and Black), engine line OFF so the bar is not rendering the engine line (gate 21's #389 rule): at EVERY ply 1..33 read
//          rev-why-txt's standing clause and eval-bar-num after 1.4 s (the bar's live probe). The two are different instruments (the
//          sentence reads the stored per-ply analysis, the bar a live probe), so they are held to CATEGORY, not decimals [CLAUDE.md, "a
//          threshold belongs to the instrument"]: a sentence that says "about even" beside a bar at 1.5 or more, a side said to be better
//          or winning while the bar reads 0.5 or more the other way, or "winning" (3+) beside a bar under 0.5, is a disagreement.
//          DENOMINATOR: at least 15 plies carry a standing clause (18 measured at kunal761 and se: 6-18 a little or clearly better, 21-29
//          winning), 'winning' and a smaller edge both seen. 'About even' is seen on none: reviewText drops it on most branches (evenSt), so
//          that rule is held by the TC-R400 arm and gate 21's TC-R87 rather than by this walk.
//  TC-R400 THE UNANALYSED PLY: the stored analysis (ct_evalcache) is re-seeded with the evaluation after one ply removed (evW[k]=null),
//          the game re-imported from that cache: the sentence at ply k says nothing about the standing (no better, even, level, winning,
//          losing), while the same ply in the clean review DID carry one (so the clause was there to lose). Before #553 sfGradePly turned
//          a missing evaluation into 0 (null/100), and the sentence read "The game is about even." beside a bar on the live probe.
const L=require('../lib');const RV=require('../drive/review');
const GEO=process.env.CT_G234_GEO||'kunal761';
const STAND=/(?:^|\. )(?:(White|Black) is (winning|clearly better|a little better)|(The game is about even))\./;
const cat=(t)=>{const m=STAND.exec(t||'');if(!m)return null;if(m[3])return {side:0,k:'even'};return {side:m[1]==='White'?1:-1,k:m[2]==='winning'?'winning':m[2]==='clearly better'?'clear':'little'};};
const num=(s)=>{s=String(s||'').trim();if(/^-?M\d*$/.test(s)||s==='mate'||s==='-mate')return s[0]==='-'?-99:99;if(/^[01]-[01]$/.test(s))return s==='1-0'?99:-99;const v=parseFloat(s);return isFinite(v)?v:null;};
function disagree(c,v){if(!c||v==null)return null;const a=Math.abs(v);
  if(c.k==='even')return a>=1.5?'about even beside '+v:null;
  if(c.side*v<=-0.5)return 'one side better beside a bar '+v+' the other way';
  if(c.k==='winning'&&a<0.5)return 'winning beside a level bar '+v;
  return null;}
L.run(async()=>{
  const tag=GEO+': ';
  const b=await L.launch({geo:GEO,name:'g234-'+GEO,store:{ct_pool:'3',ct_evalgraph:'0'}});await b.open();
  await RV.importPgn(b,RV.PGN_OPERA);await RV.startReview(b);
  const engOff=!(await b.rect('[data-ct="rev-engline"]'));
  L.say(engOff,tag+'TC-R399 PRECONDITION the engine line is off, so the eval bar is not rendering it and the cross-check is independent',{engOff});
  const N=(await b.page.evaluate(()=>window.__ctReview&&window.__ctReview.plies?window.__ctReview.plies.length:0));
  const rows=[];
  for(let n=1;n<=N;n++){await RV.goPly(b,n);await b.settle(700);
    const t=await b.text('[data-ct="rev-why-txt"]');const bar=await b.text('[data-ct="eval-bar-num"]');
    rows.push({n,c:cat(t),v:num(bar),bar,t:(t||'').slice(-60)});}
  const withC=rows.filter(r=>r.c);const bad=rows.map(r=>({r,why:disagree(r.c,r.v)})).filter(x=>x.why);
  L.say(N===33&&withC.length>=15&&withC.some(r=>r.c.k==='winning')&&withC.some(r=>r.c.k==='little'||r.c.k==='clear')&&rows.every(r=>r.v!=null),tag+'TC-R399 DENOMINATOR all 33 plies walked, '+withC.length+' carry a standing clause ("winning" and a smaller edge among them; the app drops "about even" on most plies) and every ply shows a bar number',{N,withC:withC.length,kinds:withC.map(r=>r.n+(r.c.side>0?"W":r.c.side<0?"B":"")+":"+r.c.k+"@"+r.bar).join(" "),noBar:rows.filter(r=>r.v==null).map(r=>r.n)});
  L.say(bad.length===0,tag+'TC-R399 at no ply does the standing clause disagree in category with the eval bar ('+bad.length+' of '+withC.length+')',bad.slice(0,4).map(x=>({ply:x.r.n,why:x.why,t:x.r.t})));
  // TC-R400: one ply's stored evaluation removed from the cache
  const pick=rows.find(r=>r.n>=6&&r.n<=28&&r.c);
  L.say(!!pick,tag+'TC-R400 PRECONDITION a ply in the clean review carries a standing clause to lose ('+(pick?('ply '+pick.n+': '+pick.t):'none')+')',pick);
  if(pick){
    const k=pick.n;
    const cut=await b.page.evaluate((k)=>{try{const all=JSON.parse(localStorage.getItem('ct_evalcache')||'{}');let hit=0;
      for(const key of Object.keys(all)){const e=all[key];if(e&&Array.isArray(e.evW)&&e.evW.length===34){e.evW[k]=null;hit++;}}
      localStorage.setItem('ct_evalcache',JSON.stringify(all));return hit;}catch(e){return -1;}},k);
    await b.open();await RV.importPgn(b,RV.PGN_OPERA);await RV.startReview(b);
    const path=await b.page.evaluate(()=>{const r=window.__ctReview;return r&&r.engine?r.engine.path:null;});
    L.say(cut>=1&&path==='cache',tag+'TC-R400 PRECONDITION the re-import stood on the cut cache ('+cut+' entr'+(cut===1?'y':'ies')+' cut at ply '+k+', engine path '+path+')',{cut,path});
    await RV.goPly(b,k);await b.settle(900);
    const t=await b.text('[data-ct="rev-why-txt"]');
    L.say(!!t&&t.length>0&&!/\b(better|even|level|winning|losing)\b/i.test(t),tag+'TC-R400 the sentence at the ply with no stored evaluation says nothing about the standing (ply '+k+': "'+(t||'')+'")',{t,was:pick.t});
  }
  L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+'TC-R399 no app error beyond the allowed engine trap',b.errs.slice(0,3));
  await b.close();
},'234-review-standing-agrees-with-the-bar');
