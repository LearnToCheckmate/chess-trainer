// regress/22-engline-recovery.js  #389, flag uat387-engine-wasm-trap-ply25 (headless UAT lane, P2).
//
// THE DEFECT, measured on #387 before a line was changed. Stepping the Opera Game review with the engine
// line on, the single-file Stockfish traps ("RuntimeError: unreachable") on two positions - ply 19 (10.Nxb5)
// and ply 25 (13.Rxd7). The trap is inside the WASM and is not ours to fix. What WAS ours:
//
//   const val={line:line.trim()};engCacheRef.current[fen]=val;
//
// sfBestLine (chess.jsx:2952) RESOLVES NULL on every failure path - worker not ready, idle check failed,
// postMessage threw, abort, or a trap mid-search. It never rejects. So on a trap `line` is '' and the old
// code stored {line:''} in the cache as though it were the engine's reply. Next visit: cache HIT, no query,
// bare ellipsis. For ever. Measured three revisits each on plies 19 and 25 - never recovered, twice, with
// two independently written probes.
//
// AND THE NUMBER WAS WRONG TOO, which the original report did not have. The trapped search delivers a
// partial score before it dies, so ply 19 read "-3.0" on a position the coach chip and eval bar both call
// about +3 for White. That wrong number was cached permanently beside the empty line. On the fixed bundle
// the revisit returns "+2.8" WITH its variation, so the retry corrects the sign as well as the line.
//
// RESIDUAL, STATED SO NOBODY READS THIS GATE AS MORE THAN IT IS: on the visit where the trap actually
// fires, the number is still wrong-signed and the line is still absent. The fix makes that self-heal on
// the next visit instead of persisting. A first-visit fix means recovering the worker after a trap, which
// is a bigger change and is NOT in #389.
//
// WHY NO EXISTING GATE SAW IT: the gallery's Review card visits plies 0, 19, 33 and 19 again, and the
// suite's other Review gates stop at a handful of plies. 29 of the 33 plies had never been rendered by
// anything. This gate does not walk all 33 either - that costs two minutes a geometry - it goes straight
// to the two positions the trap is reproducible on and asserts the RECOVERY, which is the part we fixed.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const TRAP_PLIES=[19,25];   // measured on #387: the two positions the WASM traps on, in both directions
const engTxt=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const plyTxt=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-move-line"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
// a variation is present when something after the leading evaluation looks like SAN
const hasVar=(s)=>{if(!s)return false;const rest=s.replace(/^\S+\s*/,'');return /\d+\.+\s*[KQRBNO]?[a-h1-8]/.test(rest);};
const num=(s)=>{if(!s)return null;const m=String(s).match(/^([+-]?\d+\.\d)/);return m?parseFloat(m[1]):null;};
const fwd=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(110);}};
const back=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000});await b.page.waitForTimeout(110);}};
L.run(async()=>{
  const b=await L.launch({geo:'kunal730',name:'engline-recovery',store:{ct_pool:'3'}});await b.open();
  await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});
  await b.tapText(/^⋯$/,{wait:500}).catch(()=>{});
  await b.tapText(/Analyze with the engine/,{wait:900}).catch(()=>{});
  await b.settle(1200);
  const el=await b.rect('[data-ct="rev-engline"]');
  L.say(!!el,'the engine line row is on screen at all (non-empty companion: everything below is vacuous without it)',el&&el.text);
  for(const target of TRAP_PLIES){
    await b.tapText(/^⏮$/,{wait:800}).catch(()=>{});await b.settle(500);
    await fwd(b,target);await b.settle(5000);
    const at=await plyTxt(b);
    L.say(!!at&&at.indexOf(target+'/33')>=0,'reached ply '+target+' (state-reached check, not assumed)',at);
    const first=await engTxt(b);
    L.note('ply '+target+' first visit: '+JSON.stringify(first));
    // step away and back - this is the revisit the old build could never recover from
    await fwd(b,1);await b.settle(2500);await back(b,1);await b.settle(5000);
    const again=await engTxt(b);
    L.note('ply '+target+' after revisit: '+JSON.stringify(again));
    L.say(hasVar(again),'ply '+target+': a REVISIT yields a variation, not a bare ellipsis (#389: a failed query is no longer cached as an answer)',again);
    // THE SIGN, PINNED TO THE GAME RATHER THAN TO ANOTHER READOUT. The obvious cross-check is the eval bar,
    // and it is CIRCULAR here: with engOn the bar renders engLine itself (chess.jsx:3809 _engBar), so the two
    // can never disagree. The coach chip is the independent source and it reads empty in this state. So the
    // assertion is pinned to a fact about the GAME instead: after 10.Nxb5 and after 13.Rxd7 White is winning,
    // measured +2.8 and +5.5 on the fixed bundle and agreed by the coach chip (+3.0) and the stored analysis.
    // A trapped search used to leave -2.8 and -5.0 here, so the sign alone separates a real answer from the
    // wreckage of a dead one. Band rather than exact value: an engine number moves a little run to run.
    const n=num(again);
    L.say(n!==null,'ply '+target+': the revisited engine line still leads with a readable number',again);
    L.say(n!==null&&n>=1.0,'ply '+target+': that number is POSITIVE and over a pawn - White is winning both of these positions, and a trapped search used to leave a negative here',{engline:n,wasOnBrokenBuild:(target===19?-2.8:-5.0)});
  }
  L.note('page errors seen (the WASM trap is EXPECTED and allowed by exact text): '+JSON.stringify(b.errs.slice(0,6)));
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();
},'ENGLINE-RECOVERY');
