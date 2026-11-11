'use strict';
// gates/regress/102-engine-no-go-into-a-running-search.js - NO ENGINE WORKER IS SENT 'go' WHILE ITS LAST SEARCH IS STILL RUNNING. TC-R186, US-R119.
//
// WHY [#550, item (97) of directOpening_2026_11_11_batch10; jobs/the-main-engine-worker-still-posts-go-before-the-stopped-search-answers-
// in-the-eval-bar-and-play-2026-11-07, #549 antagonist A's A2-R3]. A 'go' posted into a search that has not answered 'bestmove' is what
// trapped the WASM engine ("RuntimeError: unreachable"), and #549 measured the MAIN worker (eval bar, Play) doing it 1-2 times per walk in
// 5 of 5 runs while gate 22's zero-PAGEERROR line was a coin flip over it. Re-measured at #550 on HEAD: 0 early 'go' on every worker over
// three 24-ply Review walks and three Play games with rapid Back/Forward - the eval bar and the bot both go through stopIdle(S_MAIN) now -
// but NOTHING ASSERTED IT. This gate does, from outside the app: window.Worker is wrapped before the app loads, and for each worker it
// counts every 'go' posted while an earlier 'go' has had no 'bestmove' yet.
//
// WHAT IT ASSERTS, at kunal761: (a) a Review walk of the Opera game in ten DOUBLE steps (the strip's next arrow clicked twice 15ms apart,
// then 300ms); (b) a Play game vs Pip
// (drive/play cpu-4ply), eight Back and eight Forward taps at mixed speed, then one more move and the reply. Per walk: DENOMINATOR the
// workers really searched (at least 10 'go' in total, every 'go' answered by the end); no worker was sent an early 'go'; no
// "unreachable"/RuntimeError page error.
// THE PLAY ARM IS NOT CONTROLLED, named: its walk did not overlap two searches on this machine even with the eval bar's stop-and-wait
// removed (c97 left it green), so only the Review arm is shown able to fail.
const L=require('../lib');const R=require('../drive/review');const P=require('../drive/play');
const WRAP=()=>{const W=window.Worker;let n=0;window.__wk=[];
  window.Worker=function(url,opt){const w=new W(url,opt);const rec={id:n++,gos:0,bms:0,open:0,early:0};window.__wk.push(rec);
    const pm=w.postMessage.bind(w);w.postMessage=(m)=>{if(typeof m==='string'&&/^go\b/.test(m)){rec.gos++;if(rec.open>0)rec.early++;rec.open++;}return pm(m);};
    w.addEventListener('message',e=>{if(/^bestmove/.test(String(e.data||''))){rec.bms++;rec.open=Math.max(0,rec.open-1);}});return w;};
  window.Worker.prototype=W.prototype;};
const read=(b)=>b.page.evaluate(()=>window.__wk.filter(r=>r.gos>0).map(r=>({id:r.id,gos:r.gos,bms:r.bms,early:r.early})));
L.run(async()=>{
  for(const walk of ['review','play']){
    const b=await L.launch({geo:'kunal761',name:'nogo-'+walk,store:{ct_pool:'3'}});await b.ctx.addInitScript(WRAP);await b.open();
    let ok=true;try{
      if(walk==='review'){await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,1);await b.settle(400);
        // DOUBLE STEPS: the strip's next arrow clicked twice 15ms apart (one render apart - two clicks in one task batch into ONE render and one
        // search), then 300ms - so a search is asked for while the previous one is
        // still running, which a one-step-and-wait walk on a fast machine never does (this gate's first draft stayed green on its control)
        for(let i=0;i<10;i++){await b.page.evaluate(async()=>{const nx=()=>{const r=[...document.querySelectorAll('[data-ct="strip-row"]')].pop();return r?[...r.querySelectorAll('button')].pop():null;};const a=nx();if(a)a.click();await new Promise(r=>setTimeout(r,15));const c=nx();if(c)c.click();});await b.page.waitForTimeout(300);}}
      else{await P.states['cpu-4ply'](b);for(let i=0;i<8;i++){try{await P.tapBtn(b,/^Back$/,i%2?60:250);}catch(e){}}for(let i=0;i<8;i++){try{await P.tapBtn(b,/^Forward$/,i%2?60:250);}catch(e){}}await b.move('d2','d4',0);await P.waitPlies(b,6,20000);}
      await b.settle(3000);}catch(e){ok=false;L.note(walk+': '+String(e).slice(0,140));}
    const w=await read(b);const gos=w.reduce((t,r)=>t+r.gos,0),bms=w.reduce((t,r)=>t+r.bms,0),early=w.reduce((t,r)=>t+r.early,0);
    L.say(ok&&gos>=10&&bms===gos,'TC-R186 '+walk+' DENOMINATOR the engines searched: '+gos+' go, '+bms+' bestmove over '+w.length+' worker(s)',w);
    L.say(early===0,'TC-R186 '+walk+' no worker was sent "go" while its last search was still running ('+early+' early)',w);
    const traps=b.errs.filter(e=>/unreachable|RuntimeError/.test(e));
    L.say(traps.length===0,'TC-R186 '+walk+' and no engine trapped (no "unreachable"/RuntimeError page error)',traps.slice(0,2));
    await b.close();
  }
},'102-engine-no-go-into-a-running-search');
