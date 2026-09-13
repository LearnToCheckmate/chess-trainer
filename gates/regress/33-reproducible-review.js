// regress/33-reproducible-review.js  THE ONLY GUARD ON THE STUCK-WORKER TIMEOUT. Rebuilt from repro373.js, which
// lived in a sandbox that no longer exists and was never in git.
//
// What it protects, in the retiring build chat's own words: the review's stuck-worker timeout was
// `Math.max(4000, movetime*8)`, and at 4 seconds it was cutting real searches short and STORING A SHALLOW
// DEPTH-14 OPINION AS THE ANSWER. That is what made a move that walks into mate read as "Great", and what made
// the same game score 84.6% on one run and 58.4% on the next. It is 20 seconds now. If anyone lowers it again,
// verdicts rot silently and nothing else in this suite notices, because every other gate reviews a game once and
// believes whatever comes back.
//
// The method has to be two FRESH contexts, sequentially, with localStorage cleared: the eval cache (ct_evalcache)
// would otherwise hand the second run the first run's answers and the gate would pass on a broken engine.
//   - the two accuracy figures agree within 1.0 point
//   - the verdict counts are identical, category by category
//   - the two run times are within 12 s of each other
// About two minutes. Run at his real 375x730.
//
// NEGATIVE CONTROL, RUN 2026-09-13, AND WHAT IT CHANGED. BUILD-CONTEXT asks every suite to prove it still fails
// against a deliberately broken build. A bundle was built with the guard put back to 4 s and this gate was run
// against it: IT PASSED, 8 of 8. The behavioural half cannot see the regression on this machine, because a whole
// 33-ply review finishes here in 9 to 10 seconds with a 3-worker pool, so no single search ever approaches even
// the broken 4-second ceiling. The bug bit on a slower device. Two conclusions were drawn rather than one:
//   1. the reproducibility assertions stay - they are the right shape and would catch non-determinism from any
//      cause - but they must not be described as protecting the timeout, because they measurably do not;
//   2. the constant itself is guarded DIRECTLY, in the BUNDLE UNDER TEST rather than in the source, since the
//      bundle is what ships. That check fails against the broken bundle, which is what makes this gate honest.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const PGN='[Event "Opera Game"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const CATS=['Brilliant','Great','Best','Good','Book','Inaccuracy','Mistake','Miss','Blunder'];

// One review from a clean slate. Returns {ms, accuracy:[w,b], counts:{cat:[w,b]}, verdict19}.
async function reviewOnce(geo,tag){
  const b=await L.launch({geo,name:'repro-'+tag,store:{ct_pool:'3'}});
  await b.open();
  await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
  await b.open();                                   // reload so the app starts with no cached review
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:200});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
  const ms=Date.now()-t0;
  await b.settle(700);
  const txt=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');return s?(s.innerText||'').replace(/ /g,' '):'';});
  // accuracy: the two percentages on the accuracy row, in board order (White then Black)
  const acc=(txt.match(/(\d{1,3}(?:\.\d)?)\s*%/g)||[]).slice(0,2).map(x=>parseFloat(x));
  // counts: the summary prints the label on its own line and the two numbers on the next two lines, so read it
  // line by line with EXACT label matching ("Miss" must not match inside "Mistake"). A regex across newlines is
  // what made the first version of this gate report "0 of 9 categories" and then pass its own comparison on an
  // empty list - a green that asserted nothing, which is the exact failure this suite exists to prevent.
  const rows=txt.split('\n').map(x=>x.trim());
  const counts={};
  for(const c of CATS){
    const i=rows.indexOf(c);
    const w=i>=0?parseInt(rows[i+1],10):NaN, b2=i>=0?parseInt(rows[i+2],10):NaN;
    counts[c]=(Number.isInteger(w)&&Number.isInteger(b2))?[w,b2]:null;
  }
  // the verdict on 10.Nxb5!! (ply 19), the move the shallow-search bug mislabelled
  await b.tapText(/^Start review/,{wait:900});
  await b.page.locator('[aria-label="First move"]').first().click().catch(()=>{});
  await b.settle(400);
  for(let i=0;i<19;i++){await b.page.locator('[aria-label="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(130);}
  await b.settle(700);
  const ml=await b.rect('[data-ct="rev-move-line"]');
  const errs=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  await b.close();
  return {ms,acc,counts,ply19:(ml&&ml.text||'').replace(/\s+/g,' ').trim(),errs};
}

L.run(async()=>{
  // The direct guard, first, because it is instant and it is the one that catches an edit to the constant.
  // esbuild minifies 20000 to 2e4, so match either spelling and read the number back.
  const bundle=process.env.CT_APP||path.join(L.ROOT,'app.js');
  const src=fs.readFileSync(bundle,'utf8');
  const m=src.match(/Math\.max\((\d+(?:e\d+)?)\s*,\s*\w+\*8\)/);
  const guard=m?Number(m[1]):null;
  L.say(!!m,'the stuck-worker guard is present in the bundle under test',m&&m[0]);
  L.say(guard!==null&&guard>=20000,'the stuck-worker timeout is at least 20 s in the bundle ('+guard+' ms). At 4 s it cut real searches short and stored a shallow depth-14 opinion as the answer, which is what made a move that walks into mate read as Great.',bundle);

  const geo='kunal730';
  const A=await reviewOnce(geo,'A');
  L.note('run A: '+Math.round(A.ms/1000)+' s, accuracy '+JSON.stringify(A.acc)+', ply19 "'+A.ply19+'"');
  const B=await reviewOnce(geo,'B');
  L.note('run B: '+Math.round(B.ms/1000)+' s, accuracy '+JSON.stringify(B.acc)+', ply19 "'+B.ply19+'"');

  L.say(A.acc.length===2&&B.acc.length===2,'both runs reported an accuracy for each side',{A:A.acc,B:B.acc});
  if(A.acc.length===2&&B.acc.length===2){
    const dW=Math.abs(A.acc[0]-B.acc[0]),dB=Math.abs(A.acc[1]-B.acc[1]);
    L.say(dW<=1.0&&dB<=1.0,'the two runs agree on accuracy within 1.0 point (white '+dW.toFixed(1)+', black '+dB.toFixed(1)+')',{A:A.acc,B:B.acc});
  }
  const readable=CATS.filter(c=>A.counts[c]&&B.counts[c]);
  L.say(readable.length===CATS.length,'all '+CATS.length+' verdict counts were read from the summary in both runs (a partial read would make the comparison below vacuous)',{read:readable,A:A.counts,B:B.counts});
  const differ=readable.filter(c=>A.counts[c][0]!==B.counts[c][0]||A.counts[c][1]!==B.counts[c][1]);
  L.say(differ.length===0,'every verdict count is identical across the two runs',differ.map(c=>c+': A '+A.counts[c]+' vs B '+B.counts[c]));
  const dt=Math.abs(A.ms-B.ms)/1000;
  L.say(dt<=12,'the two run times are within 12 s of each other ('+dt.toFixed(1)+' s apart: '+Math.round(A.ms/1000)+' s and '+Math.round(B.ms/1000)+' s)');
  L.say(!!A.ply19&&A.ply19===B.ply19,'10.Nxb5 gets the same verdict in both runs',{A:A.ply19,B:B.ply19});
  L.say(/Nxb5/.test(A.ply19)&&!/Blunder|Mistake|Inaccuracy/.test(A.ply19),'10.Nxb5 is not scored as a mistake (the shallow-search symptom)',A.ply19);
  L.say(A.errs.length===0&&B.errs.length===0,'no app error beyond the allowed engine trap in either run',[A.errs.slice(0,1),B.errs.slice(0,1)]);
},'REPRODUCIBLE-REVIEW');
