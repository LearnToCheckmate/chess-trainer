// regress/86-review-function-of-the-game.js  THE REVIEW IS A FUNCTION OF THE GAME, NOT OF HOW BUSY THE PHONE IS.
// #549 item (30), jobs/review-accuracy-and-grade-counts-depend-on-machine-load-2026-10-04. US-R109, TC-R148..TC-R151.
//
// WHAT WAS WRONG, MEASURED AT #549 ON THE RUN TREE (51f47e7, trial bundle 687f2e4ed455), THE OPERA GAME AT 375x761:
//   at rest, ct_pool 3 and ct_pool 1 both give White 97.6 / Black 88.9, byte-identical engine output (ct_evalcache evW);
//   - six busy processes sharing the browser's core: the review is graded by the BUILT-IN depth-2 engine instead
//     (White 75.1, Great 6 -> 0, a Blunder from nowhere), because the review took Stockfish only if it had said readyok
//     by the tap (sfReadyRef) and the analysis worker within 5 s (ensureAna);
//   - ten busy processes, the engine given 60 s to load first: 28 searches cut off by the 20 s WALL-CLOCK guard and
//     graded from their partial score, 19 of 34 positions moved, Black 88.9 -> 86.4, Best 7 -> 6, Excellent 3 -> 4;
//   - the harness's engineFail:'pool' route (no pool worker, so sfEval1 on the analysis worker): White 98.7 / Black 87.1
//     and Black's Blunder 1 -> 0, because that loop never cleared its table and skipped the mate-boundary re-search.
// CDP's Emulation.setCPUThrottlingRate does NOT reach the engine (it throttles the page thread, not the workers: a rate
// of 8 changed neither the time nor a number), so real load was made with busy loops pinned to the browser's core, and
// this gate makes the same three conditions DETERMINISTICALLY by wrapping window.Worker before the page's scripts run:
//   S  every Stockfish worker's output is held for its first 7 s (slow to load: past the old 5 s and the tap)
//   H  the 6th review-pool search is held silent for 22 s (past the 20 s guard), then flushed
//   T  the 6th review-pool search's output is dripped one line every 1.5 s, so it takes > 20 s and is never silent
//   F  engineFail:'pool' (gates/lib.js): no pool worker, the review runs on the analysis worker
// and asserts each review equals an undisturbed reference run R: the accuracy pair, all ten grade counts, and the
// engine's own per-position output (evW, read back from ct_evalcache). Equality, not a tolerance: a fixed-depth search
// from the same table is deterministic, and that is the claim.
// KNOW ITS LIMIT: one game, one geometry; the build-run measurements under real load are in the job's outcome. A
// device with no Stockfish at all (engineFail:'all') still gets the built-in engine - that is a capability, not load,
// and it is not asserted equal here.
// CONTROL-RECORD: 95094b0 2026-11-07 total=20 red=11 scope=trial:687f2e4ed455 how=the run tree before the fix (51f47e7): R3 and every TC-R148 TC-R149 TC-R150 TC-R151 arm but their preconditions red
// CONTROL-RECORD: 95094b0 2026-11-07 total=20 red=2 scope=trial:849ddc2472ba how=the ok check removed (_okR accepts any result): TC-R149 retried and TC-R149 engine output red
// CONTROL-RECORD: 95094b0 2026-11-07 total=20 red=1 scope=trial:77051399c0d1 how=sfEvalOn's guard back to a wall clock (tick does nothing): TC-R150 waited-for red (retried 6)
// CONTROL-RECORD: 95094b0 2026-11-07 total=20 red=2 scope=trial:692b47b7c043 how=the no-pool loop without a fresh start per group: TC-R151 summary and engine output red (98.7/86.4)
// CONTROL-RECORD: 95094b0 2026-11-07 total=20 red=4 scope=trial:9f950296ecf2 how=useSF back to sfReadyRef and ensureAna's 5 s: TC-R148 precondition and its three arms red (built-in engine, 75.1/87)
'use strict';
const L=require('../lib');
const PGN='[Event "Opera Game"] [White "Morphy"] [Black "Duke"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const N1=34;   // 33 plies, 34 positions
const CATS=[...L.GRADES];

// The Worker wrapper. `cfg`: {readyHoldMs} | {holdNth,holdMs} | {dripNth,dripMs}. window.__ctSlow reports what it did.
function slowEngine(cfg){try{
  const RW=window.Worker;if(!RW||window.__ctSlow)return;
  const S=window.__ctSlow={cfg,workers:0,readyHeld:0,poolGos:0,held:0,heldMs:0,dripped:0,dripSpanMs:0};
  const W=function(url,o){
    if(!/stockfish/i.test(String(url)))return new RW(url,o);
    const w=new RW(url,o);S.workers++;
    const born=Date.now();let user=null,isPool=false,q=[],mode=null,until=0,timer=null,dripT0=0;
    Object.defineProperty(w,'onmessage',{configurable:true,get(){return user;},set(f){user=f;}});
    const deliver=(ev)=>{try{if(typeof user==='function')user.call(w,ev);}catch(e){}};
    const flush=()=>{timer=null;const qq=q;q=[];mode=null;qq.forEach(deliver);};
    const drip=()=>{timer=null;const ev=q.shift();if(!ev){timer=setTimeout(drip,cfg.dripMs);return;}deliver(ev);S.dripped++;S.dripSpanMs=Date.now()-dripT0;   // span so far, whether or not the bestmove has come through yet
      if(String(ev.data||'').startsWith('bestmove')){mode=null;const qq=q;q=[];qq.forEach(deliver);return;}
      timer=setTimeout(drip,cfg.dripMs);};
    if(cfg.readyHoldMs){mode='hold';until=born+cfg.readyHoldMs;S.readyHeld++;timer=setTimeout(flush,cfg.readyHoldMs);}
    w.addEventListener('message',(ev)=>{if(mode){q.push(ev);return;}deliver(ev);});
    const pm=w.postMessage.bind(w);
    w.postMessage=function(m){
      if(typeof m==='string'){
        if(/^setoption name Hash value /.test(m))isPool=true;   // only ensurePool sets Hash (gates/lib.js engineFail says the same)
        if(isPool&&/^go depth /.test(m)){S.poolGos++;
          if(cfg.holdNth&&S.poolGos===cfg.holdNth&&!mode){mode='hold';S.held++;S.heldMs=cfg.holdMs;timer=setTimeout(flush,cfg.holdMs);}
          if(cfg.dripNth&&S.poolGos===cfg.dripNth&&!mode){mode='drip';dripT0=Date.now();timer=setTimeout(drip,cfg.dripMs);}
        }
      }
      return pm(m);
    };
    return w;
  };
  W.prototype=RW.prototype;window.Worker=W;
}catch(e){}}

async function reviewOnce(tag,opts){
  const lo={geo:'kunal761',name:'g86-'+tag,store:{ct_pool:'3'}};if(opts.engineFail)lo.engineFail=opts.engineFail;
  const b=await L.launch(lo);
  if(opts.slow)await b.ctx.addInitScript(slowEngine,opts.slow);
  await b.open();
  await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:200});
  let shown=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:420000});}catch(e){shown=false;}
  const ms=Date.now()-t0;
  await b.settle(700);
  const r=await b.page.evaluate(()=>{
    const s=document.querySelector('[data-ct="rev-summary"]');const txt=s?(s.innerText||'').replace(/ /g,' '):'';
    let c={};try{c=JSON.parse(localStorage.getItem('ct_evalcache')||'{}')||{};}catch(e){}
    const ks=Object.keys(c);const v=ks.length===1?c[ks[0]]:null;
    const rv=window.__ctReview;
    return {txt,evW:v&&Array.isArray(v.evW)?v.evW:null,nCache:ks.length,engine:rv&&rv.engine?Object.assign({},rv.engine):null,slow:window.__ctSlow?Object.assign({},window.__ctSlow,{cfg:null}):null};});
  const ef=opts.engineFail?await b.engineFail():null;
  const acc=(r.txt.match(/(\d{1,3}(?:\.\d)?)\s*%/g)||[]).slice(0,2).map(x=>parseFloat(x));
  const rows=r.txt.split('\n').map(x=>x.trim());const counts={};
  for(const c of CATS){const i=rows.indexOf(c);const w=i>=0?parseInt(rows[i+1],10):NaN,k=i>=0?parseInt(rows[i+2],10):NaN;counts[c]=(Number.isInteger(w)&&Number.isInteger(k))?[w,k]:null;}
  const errs=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  await b.close();
  L.note('run '+tag+': '+Math.round(ms/1000)+' s, accuracy '+JSON.stringify(acc)+', engine '+JSON.stringify(r.engine)+(r.slow?', harness '+JSON.stringify(r.slow):'')+(ef?', engineFail '+JSON.stringify(ef):''));
  return {tag,shown,ms,acc,counts,evW:r.evW,nCache:r.nCache,engine:r.engine,slow:r.slow,ef,errs};
}
const sameSummary=(A,B)=>A.acc.length===2&&B.acc.length===2&&A.acc[0]===B.acc[0]&&A.acc[1]===B.acc[1]&&CATS.every(c=>A.counts[c]&&B.counts[c]&&A.counts[c][0]===B.counts[c][0]&&A.counts[c][1]===B.counts[c][1]);
const evDiff=(A,B)=>(A.evW&&B.evW)?A.evW.map((v,i)=>v===B.evW[i]?null:i+':'+v+'/'+B.evW[i]).filter(Boolean):['missing evW: '+(!A.evW?A.tag:'')+' '+(!B.evW?B.tag:'')];
const sumOf=(X)=>({acc:X.acc,counts:CATS.map(c=>c+' '+(X.counts[c]||'-')).join(', ')});

L.run(async()=>{
  // R: the undisturbed reference. Everything below is compared to it, so it must itself be a whole reading.
  const R=await reviewOnce('R',{});
  L.say(R.shown&&R.acc.length===2&&CATS.every(c=>R.counts[c]),'the reference review R shows an accuracy for each side and all '+CATS.length+' grade counts (a partial reading would make every equality below vacuous)',sumOf(R));
  L.say(!!R.evW&&R.evW.length===N1,'the reference review cached the engine\'s output for all '+N1+' positions (the per-position comparison below reads it)',{n:R.evW&&R.evW.length,entries:R.nCache});
  L.say(!!R.engine&&R.engine.path==='pool'&&R.engine.workers>=1&&R.engine.retried===0&&R.engine.abandoned===0,'the reference review ran on the review pool with no search repeated or abandoned (review.engine)',R.engine);

  // S: slow to load.
  const S=await reviewOnce('S-slow-load',{slow:{readyHoldMs:7000}});
  L.say(!!S.slow&&S.slow.readyHeld>=1&&S.slow.readyHeld===S.slow.workers,'TC-R148 the harness held the engine\'s first 7 s of output on every Stockfish worker it saw ('+(S.slow&&S.slow.readyHeld)+' of '+(S.slow&&S.slow.workers)+'), so the engine was still loading when the review was asked for',S.slow);
  L.say(!!S.engine&&S.engine.path!=='builtin','TC-R148 a review asked for while Stockfish is still loading WAITS for it and is graded by Stockfish, not handed to the built-in engine (it was, whenever the engine had not answered by the tap or within 5 s)',S.engine);
  L.say(sameSummary(S,R),'TC-R148 the slow-to-load review shows the same accuracy pair and the same ten grade counts as the reference',{slow:sumOf(S),ref:sumOf(R)});
  {const d=evDiff(S,R);L.say(d.length===0,'TC-R148 the slow-to-load review\'s engine output equals the reference position by position',d.slice(0,8));}

  // H: one search goes silent past the guard.
  const H=await reviewOnce('H-held-search',{slow:{holdNth:6,holdMs:22000}});
  L.say(!!H.slow&&H.slow.held===1&&H.slow.heldMs>20000,'TC-R149 the harness held one review-pool search ('+(H.slow&&H.slow.poolGos)+' pool searches seen) silent for '+(H.slow&&H.slow.heldMs)+' ms, past the 20 s guard',H.slow);
  L.say(!!H.engine&&H.engine.retried>=1&&H.engine.abandoned===0,'TC-R149 the search the guard gave up on was SEARCHED AGAIN (its table group from the start), never graded from its partial score',H.engine);
  L.say(sameSummary(H,R),'TC-R149 with one search held past the guard the review shows the same accuracy pair and grade counts as the reference',{held:sumOf(H),ref:sumOf(R)});
  {const d=evDiff(H,R);L.say(d.length===0,'TC-R149 with one search held past the guard the engine output equals the reference position by position (and was cached)',d.slice(0,8));}

  // T: one search is slow but keeps talking.
  const T=await reviewOnce('T-slow-search',{slow:{dripNth:6,dripMs:1500}});
  L.say(!!T.slow&&T.slow.dripSpanMs>20000&&T.slow.dripped>=14,'TC-R150 the harness slowed one review-pool search to '+(T.slow&&T.slow.dripSpanMs)+' ms ('+(T.slow&&T.slow.dripped)+' lines, one every 1.5 s), longer than the 20 s guard but never 20 s silent',T.slow);
  L.say(!!T.engine&&T.engine.retried===0&&T.engine.abandoned===0,'TC-R150 a search that is slow but still talking is WAITED FOR: the guard is a silence ceiling, so nothing was cut off or repeated (a 20 s wall clock cut it off)',T.engine);
  {const d=evDiff(T,R);L.say(d.length===0&&sameSummary(T,R),'TC-R150 the slowed search\'s review equals the reference: engine output position by position, accuracy and grade counts',{diff:d.slice(0,8),slow:sumOf(T),ref:sumOf(R)});}

  // F: no pool worker.
  const F=await reviewOnce('F-no-pool',{engineFail:'pool'});
  L.say(!!F.ef&&F.ef.failed>0,'TC-R151 the harness made the review-pool workers fail ('+(F.ef&&F.ef.failed)+' of '+(F.ef&&F.ef.created)+' Stockfish workers), so the review had to run on the analysis worker',F.ef);
  L.say(!!F.engine&&F.engine.path==='one'&&F.engine.workers===0,'TC-R151 with no pool worker the review ran on the analysis worker (review.engine path one)',F.engine);
  L.say(sameSummary(F,R),'TC-R151 the analysis-worker review shows the same accuracy pair and grade counts as the pool review (it was White 98.7 against 97.6, and Black\'s Blunder went)',{one:sumOf(F),pool:sumOf(R)});
  {const d=evDiff(F,R);L.say(d.length===0,'TC-R151 the analysis-worker review\'s engine output equals the pool\'s position by position (the same table cadence and the same mate re-search)',d.slice(0,8));}

  const bad=[R,S,H,T,F].filter(X=>X.errs.length).map(X=>X.tag+': '+X.errs[0]);
  L.say(bad.length===0,'no app error beyond the allowed engine trap in any of the five reviews',bad);
},'REVIEW-FUNCTION-OF-THE-GAME');
