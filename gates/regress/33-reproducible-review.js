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
//
// #377, AND WHAT THIS GATE CAUGHT BY GOING RED ON ITS OWN AUTHOR'S FIX. Two more faults were found through this
// gate, in this order. First, by reading the source: #375 only ever fixed the POOL path. The review falls back to
// sfEval1 whenever the pool has one worker (hardwareConcurrency 2 or 3, or ct_pool=1), and that fallback was
// still 'go movetime' behind a 4 s guard - the exact pair #375 was written to remove. This gate could not have
// seen it, because it forced ct_pool=3 for both of its runs: it exercised the fixed path twice. It runs a third
// review at ct_pool=1 now.
// Second, that third run then FAILED against the fix, and it was right to. Putting both paths on depth 16 was not
// enough, because what differed was the transposition TABLE and not the search: the table was cleared only at
// each worker's block start, and block boundaries fall wherever (positions)/(workers) puts them, so a position's
// depth-16 score was a function of the DEVICE. Three workers and one worker returned Best 5,5 vs 7,6 and Black
// 57.7 vs 58.8 on the same build. The app now clears the table on a fixed cadence tied to the position index and
// aligns the blocks to it. The lesson worth keeping: the assertion that looked too strong was the true one, and
// weakening it to match the code would have buried a real defect.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const PGN='[Event "Opera Game"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const CATS=['Brilliant','Great','Best','Good','Book','Inaccuracy','Mistake','Miss','Blunder'];

// One review from a clean slate. Returns {ms, accuracy:[w,b], counts:{cat:[w,b]}, verdict19}.
async function reviewOnce(geo,tag,pool){
  const b=await L.launch({geo,name:'repro-'+tag,store:{ct_pool:String(pool||3)}});
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
  // THREE sites share the shape Math.max(N, movetime*8) and only ONE of them is the review pool's. The other two
  // guard the single analysis worker, whose searches are bounded by `go movetime`, so 8x movetime is a sane
  // ceiling there and 4 s is correct. The pool's search is bounded by DEPTH, so its duration is unbounded and 4 s
  // truncated it. Matching the first occurrence in file order reads an analysis site and calls a healthy bundle
  // broken - which is exactly what it did on the first record run. The pool site is the one immediately followed
  // by the depth constant, so both halves of the #375 reproducibility fix are asserted together: if either the
  // timeout or the depth moves, the verdicts rot and this line goes red.
  const bundle=process.env.CT_APP||path.join(L.ROOT,'app.js');
  const src=fs.readFileSync(bundle,'utf8');
  const m=src.match(/Math\.max\((\d+(?:e\d+)?)\s*,\s*\w+\*8\)\)\s*,\s*\w+\s*=\s*(\d+)\s*[,;]/);
  const guard=m?Number(m[1]):null, depth=m?Number(m[2]):null;
  L.say(!!m,'the review pool\'s search is identifiable in the bundle under test (its guard followed by its depth)',m&&m[0]);
  L.say(guard!==null&&guard>=20000,'the pool\'s stuck-worker timeout is at least 20 s ('+guard+' ms). At 4 s it cut real searches short and stored a shallow opinion as the answer, which is what made a move that walks into mate read as Great.',bundle);
  L.say(depth===16,'the pool searches to depth 16 ('+depth+'). At 14 the engine prefers 15...Nxd7, never sees the mate, and the famous move is mislabelled; 18 is correct but takes 36 s on this machine.',bundle);

  /* #377: THE SINGLE-WORKER PATH, WHICH THIS GATE USED TO BE BLIND TO.
     The review uses the pool only when it has more than one worker; otherwise it falls back to sfEval1, and
     poolWanted() returns 1 for hardwareConcurrency 2 or 3 and for the ct_pool=1 override. Up to #377 that
     fallback was still the pre-#375 code: 'go movetime' behind a 4 s guard. This gate forced ct_pool=3 for both
     of its runs, so it exercised the fixed path twice and would have gone green on every build that shipped the
     broken one. Both halves are covered now. In the bundle, esbuild hoists the ternary guard, so a depth-mode
     search reads Math.max(<depth>?2e4:4e3, <movetime>*8): the SAME variable must also choose 'go depth' over
     'go movetime', which is what ties the 20 s guard to the fixed-depth search rather than leaving two
     unrelated edits that happen to both be present. */
  const g1=src.match(/Math\.max\((\w+)\?2e4:4e3,\w+\*8\)/);
  const dv=g1&&g1[1];
  const esc=(x)=>x.replace(/\$/g,'\\$');
  const wired=dv?new RegExp('\\('+esc(dv)+'\\?"go depth "\\+'+esc(dv)+':"go movetime "').test(src):false;
  L.say(!!g1,'the single-worker search takes a depth, and gets a 20 s guard when it does (was a flat 4 s)',g1&&g1[0]);
  L.say(wired,'the same depth argument chooses "go depth" over "go movetime", so the fixed depth and the 20 s guard are one change and not two',dv);
  L.say(/\.positions\[\w+\]\),\w+,16\)/.test(src),'the review asks the single-worker path for depth 16, the same depth the pool uses',(src.match(/\.positions\[\w+\]\),\w+,16\)/)||[])[0]);
  L.say(!/trimming to keep this under/.test(src),'the review no longer tells the user it is "trimming" to hit a time target. It was printing that on the pool path, where the budget it claimed to be trimming had been inert since #375 and nothing was trimmed.');

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

  /* #377: run C is the same game on ONE worker - the path an older phone actually gets. Before #377 this run
     searched by time behind a 4 s guard and could not agree with A; agreeing with it now is the proof that both
     paths search identically, which is the thing the fix claims. Its RUN TIME is deliberately not compared:
     one worker doing the work of three is slower and that is correct - it is currently only fast because it is
     thinking less. What must match is every published verdict. */
  const C=await reviewOnce(geo,'C-1worker',1);
  L.note('run C (ct_pool=1): '+Math.round(C.ms/1000)+' s, accuracy '+JSON.stringify(C.acc)+', ply19 "'+C.ply19+'"');
  const readC=CATS.filter(c=>A.counts[c]&&C.counts[c]);
  L.say(readC.length===CATS.length,'all '+CATS.length+' verdict counts were read from the single-worker run too',{read:readC});
  const differC=readC.filter(c=>A.counts[c][0]!==C.counts[c][0]||A.counts[c][1]!==C.counts[c][1]);
  L.say(differC.length===0,'the SINGLE-WORKER review returns the same verdict counts as the pool review. Until #377 this path was the pre-#375 code and an older phone got a different review out of the same build, with nothing on screen to say which one it had.',differC.map(c=>c+': pool '+A.counts[c]+' vs 1-worker '+C.counts[c]));
  if(A.acc.length===2&&C.acc.length===2){
    const dW=Math.abs(A.acc[0]-C.acc[0]),dB=Math.abs(A.acc[1]-C.acc[1]);
    L.say(dW<=1.0&&dB<=1.0,'the single-worker run agrees with the pool run on accuracy within 1.0 point (white '+dW.toFixed(1)+', black '+dB.toFixed(1)+')',{pool:A.acc,one:C.acc});
  }
  L.say(!!C.ply19&&C.ply19===A.ply19,'10.Nxb5 gets the same verdict on one worker as on three',{pool:A.ply19,one:C.ply19});
  L.say(C.errs.length===0,'no app error beyond the allowed engine trap on the single-worker path',C.errs.slice(0,1));
},'REPRODUCIBLE-REVIEW');
