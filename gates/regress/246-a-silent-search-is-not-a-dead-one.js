'use strict';
// gates/regress/246-a-silent-search-is-not-a-dead-one.js - A REVIEW SEARCH THAT IS SILENT BUT ALIVE IS WAITED FOR, A DEAD ONE IS STILL
// ABANDONED. US-R257 / TC-R448..R450.
//
// WHY [#553 B2, jobs/one-of-his-games-never-finishes-its-review-it-stalls-at-move-68-of-103-2026-11-24 (P1)]: his game chess.com 174055211202
// (game 29 of gates/fixtures/kunal/kunal-40.pgn) never finished its review: 'Analyzing move 68 of 103' for minutes, then no summary. Measured
// on the tree before (trial d889a3c7d0f6, run-branch 9f95c414) with a Worker wrapper logging every go, stop and bestmove: the late endgame
// positions (queen and bishop each, checks, seldepth 71) run one depth iteration with NO output for longer than sfEvalOn's 20 s silence
// ceiling once three pool searches share the cores (10.7 s silent on an idle lone worker; the searches took 35 to 96 s), so the guard
// abandoned live searches, every retry of the group met the same wall, and the analysis worker took 17 searches and 23 stops. The fix
// (chess.jsx sfEvalOn, PING): after 4 s quiet the slot is asked 'isready', which Stockfish answers at once mid-search, and the answer is
// progress. On the fixed trial 6b2cff176ab5 the game reaches its summary (about 300 s here), 0 stops, every search at depth 16.
// WHAT IT READS: the bundle under test (CT_APP), kunal761, ct_pool 3, a fresh review (no cache) of the gallery's corner game (drive/review
// PGN_CORNER, 7 plies). The game's own slowness is not reproducible on demand, so the MECHANISM is driven: a Worker wrapper installed before
// the app loads (addInitScript) holds back every message of ONE pool search (the first 'go' on a pool worker after position index 1,
// 1.e4) for 24 s after its go - longer than the 20 s ceiling - then delivers them in order. Launch 'alive' lets readyok through, as a live
// Stockfish does; launch 'dead' holds readyok too, as a stuck worker would.
//  TC-R448 DENOMINATOR per launch: the wrapper held exactly one search, for at least 24 s, on a pool worker; the review reached its summary,
//      took the pool path, and has the game's plies.
//  TC-R449 alive: the held search was waited for, not abandoned - the review's engine.retried and engine.abandoned are 0, and no 'stop' was
//      posted to the held worker during the hold.
//  TC-R450 dead: the guard still catches a worker that answers nothing - engine.retried is at least 1, and the held search is stopped between 20 s and the hold's end (the ping does not keep a silent, unanswering worker alive).
// ON THE REAL TREE: 8 pass, 0 fail on trial 6b2cff176ab5 (worktree 1f873e84 on 4bab8cec), 25 Nov 2026, about 60 s.
// CONTROL-RECORD: 9f95c414 2026-11-25 total=8 red=1 scope=trial:d889a3c7d0f6 how=#553 B2 the tree before the fix (no liveness ping): TC-R449 red - the held live search stopped at 21.1 s and its group retried (retried 2); TC-R448 and TC-R450 stay green (the dead worker is abandoned on both trees)
// KNOW ITS LIMIT: a wrapper's silence, not Stockfish's own; his game itself is walked by gate 239 from its recorded output, which this
// fix let us record; his phone is his.
const L=require('../lib');const RV=require('../drive/review');
const HOLD=24000;
const wrap=({mode,hold})=>{const RW=window.Worker;const st={held:0,heldMs:0,heldOn:null,stopsDuring:0,gos:0,pool:new Set(),posIdx:{}};window.__gH=st;let n=0;
  function W(u,o){const w=new RW(u,o);const id=n++;let isPool=false,lastPos='',holding=false,q=[],seenPos=[];
    const pm=w.postMessage.bind(w);
    w.postMessage=(m)=>{const s=String(m);if(s.startsWith('setoption name Hash')){isPool=true;st.pool.add(id);}
      if(s.startsWith('position')){lastPos=s;if(!seenPos.includes(s))seenPos.push(s);}
      if(s==='stop'&&holding){st.stopsDuring++;if(st.stopAt==null)st.stopAt=Date.now()-st.goAt;}
      if(s.startsWith('go')){st.gos++;if(isPool&&!st.held&&/\/4P3\/8\/PPPP1PPP\/RNBQKBNR b KQkq /.test(lastPos)){st.held=1;st.heldOn=id;holding=true;const t0=Date.now();st.goAt=t0;setTimeout(()=>{holding=false;st.heldMs=Date.now()-t0;const qq=q;q=[];for(const f of qq)f();},hold);}}
      return pm(m);};
    const deliver=(fn,ev)=>{if(holding&&!(mode==='alive'&&String(ev.data)==='readyok'))q.push(()=>fn(ev));else fn(ev);};
    let userOn=null;Object.defineProperty(w,'onmessage',{configurable:true,get(){return userOn;},set(f){userOn=f;}});
    RW.prototype.addEventListener.call(w,'message',(ev)=>{if(userOn)deliver(userOn.bind(w),ev);});
    return w;}
  W.prototype=RW.prototype;window.Worker=W;};
L.run(async()=>{
  for(const mode of ['alive','dead']){const tag=mode;let b=null,r=null,err=null;
    try{b=await L.launch({geo:'kunal761',name:'g246-'+mode,store:{ct_pool:'3'}});await b.ctx.addInitScript(wrap,{mode,hold:HOLD});
      await b.open();const t0=Date.now();await RV.importPgn(b,RV.PGN_CORNER,180000);
      r=await b.page.evaluate(()=>{const v=window.__ctReview;const h=window.__gH;return {engine:v&&v.engine,plies:v&&v.plies?v.plies.length:-1,held:h.held,heldMs:h.heldMs,heldOnPool:h.heldOn!=null&&h.pool.has(h.heldOn),stopsDuring:h.stopsDuring,stopAt:h.stopAt==null?null:h.stopAt,gos:h.gos};});
      r.secs=Math.round((Date.now()-t0)/100)/10;}catch(e){err=String(e.message||e).slice(0,160);}
    L.say(!err&&!!r&&r.held===1&&r.heldMs>=HOLD-50&&r.heldOnPool&&r.engine&&r.engine.path==='pool'&&r.plies===RV.CORNER_PLIES,'TC-R448 '+tag+' DENOMINATOR: one pool search held '+(r?r.heldMs:0)+' ms (at least '+HOLD+'), the review reached its summary on the pool path with '+(r?r.plies:'-')+' plies in '+(r?r.secs:'-')+' s',err||r);
    if(r&&mode==='alive')L.say(!!r.engine&&r.engine.retried===0&&r.engine.abandoned===0&&r.stopsDuring===0,'TC-R449 alive: the silent but answering search was waited for - retried '+(r.engine&&r.engine.retried)+', abandoned '+(r.engine&&r.engine.abandoned)+', stops during the hold '+r.stopsDuring,r);
    if(r&&mode==='dead'){L.say(!!r.engine&&r.engine.retried>=1,'TC-R450 dead: a worker that answers nothing is still abandoned - retried '+(r.engine&&r.engine.retried),r);
      L.say(r.stopAt!=null&&r.stopAt>=20000&&r.stopAt<HOLD,'TC-R450 dead: the ping does not keep it alive - the held search is stopped at '+r.stopAt+' ms, at the 20 s ceiling and before its output would have come ('+HOLD+')',r);}
    if(b){L.say(b.errs.length===0,'TC-R448 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}}
},'246-a-silent-search-is-not-a-dead-one');
