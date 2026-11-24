'use strict';
// gates/regress/234-review-standing-agrees-with-the-bar.js - THE REVIEW SENTENCE'S STANDING CLAUSE NEVER DISAGREES IN CATEGORY WITH THE
// EVAL BAR, AT ANY PLY OF A REAL REVIEW. TC-R399; US-R85.
//
// WHY [#553 B3, jobs/a-missing-eval-and-a-level-position-print-the-same-sentence-2026-09-29, the remainder #548/#549/#550 left: "the case's
// second half, that the sentence and the eval readout never disagree in category at any ply, is not asserted anywhere"]. The unit layer
// (gate 21 TC-R87) proves reviewText says nothing about the standing when a.evalAfter is not a number. Nothing walked a REAL review.
//  TC-R399 THE WALK, at CT_G234_GEO (kunal761 default; gates/pairs also runs se), the Opera Game pasted (no account, so the sentence names
//          White and Black), engine line OFF so the bar is not rendering the engine line (gate 21's #389 rule): at EVERY ply 1..33 read
//          the standing clause from rev-why-txt's line AND its data-more (a slip's standing sits behind the tap) and eval-bar-num after
//          1.4 s (the bar's live probe). The two are different instruments (the sentence reads the stored per-ply analysis, the bar a live
//          probe), so they are held to CATEGORY, not decimals [CLAUDE.md, "a threshold belongs to the instrument"]: a sentence that says
//          "about even" beside a bar at 1.5 or more, a side said to be better or winning while the bar reads 0.5 or more the other way,
//          or "winning" (3+) beside a bar under 0.5, is a disagreement.
//          DENOMINATOR: at least 20 plies carry a standing clause (25 at kunal761, line and data-more; 18 in the line alone), 'winning' and a smaller edge
//          both seen. 'About even' is seen on none: reviewText drops it on most branches (evenSt).
// WHY THERE IS NO UNANALYSED-PLY ARM, MEASURED [#553 B3]: a cut cache (ct_evalcache evW[k]=null, re-imported on the cache path) does not
// make an unanalysed ply - sfGradePly reads null/100 as 0, so the ply is stored as evalAfter 0 (a number), the sentence's clause is the
// dropped 'about even', and the move is REGRADED (Opera ply 12: Inaccuracy with 'White is clearly better.' behind the tap, cut: 'Black's
// good move', Excellent). An arm asserting 'no standing clause' there passed on a break that restored the old 0 default (pairs BLIND),
// so it was removed rather than counted. The live path never stores a null (a failed search stores the static eval). Reported as a finding.
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
    const t=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]');return e?((e.innerText||'')+' '+(e.getAttribute('data-more')||'')).trim():null;});const bar=await b.text('[data-ct="eval-bar-num"]');
    rows.push({n,c:cat(t),v:num(bar),bar,t:(t||'').slice(-60)});}
  const withC=rows.filter(r=>r.c);const bad=rows.map(r=>({r,why:disagree(r.c,r.v)})).filter(x=>x.why);
  L.say(N===33&&withC.length>=20&&withC.some(r=>r.c.k==='winning')&&withC.some(r=>r.c.k==='little'||r.c.k==='clear')&&rows.every(r=>r.v!=null),tag+'TC-R399 DENOMINATOR all 33 plies walked, '+withC.length+' carry a standing clause ("winning" and a smaller edge among them; the app drops "about even" on most plies) and every ply shows a bar number',{N,withC:withC.length,kinds:withC.map(r=>r.n+(r.c.side>0?"W":r.c.side<0?"B":"")+":"+r.c.k+"@"+r.bar).join(" "),noBar:rows.filter(r=>r.v==null).map(r=>r.n)});
  L.say(bad.length===0,tag+'TC-R399 at no ply does the standing clause disagree in category with the eval bar ('+bad.length+' of '+withC.length+')',bad.slice(0,4).map(x=>({ply:x.r.n,why:x.why,t:x.r.t})));
  L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+'TC-R399 no app error beyond the allowed engine trap',b.errs.slice(0,3));
  await b.close();
},'234-review-standing-agrees-with-the-bar');
