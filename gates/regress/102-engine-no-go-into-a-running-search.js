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
// THE PLAY ARM IS CONTROLLED SINCE #550 helper app A: its walk is now double steps (Back/Forward clicked twice 15ms apart) with the move
// going in 20ms after the last one, and with the eval bar's stop-and-wait removed it reds all three play lines (early go, a go left
// unanswered, a real "unreachable" trap) on 3 of 3 runs. KNOW ITS LIMITS, named: (1) the BOT's own stopIdle removed (mB, 114ab857f32d)
// stays green on 2 of 2 runs - the bot's search does not start inside the eval bar's on this machine (the move's own effect cleanup
// stops the eval search first), so that guard is still not shown able to fail; (2) the Review arm's control is a coin flip on this
// machine - red on c97 at a94b3a2, green on mA (the same mutant on today's tree) in the full run recorded below.
// CONTROL-RECORD: a94b3a2 2026-11-11 total=7 red=1 scope=trial:384422fdd7b6 how=#550 item (97): c97, the eval bar's query posted without stopIdle(S_MAIN) - the review walk's early-go line red (worker 0: 21 go, 10 early); the play arm, both DENOMINATORS and the trap lines green (the play walk does not overlap searches)
// CONTROL-RECORD: a633d93 2026-11-14 total=7 red=3 scope=trial:e9a6cfdc8024 how=#550 helper app A (whatIsLeft 'the Play arm has no overlapping control'): mA, the eval bar's go depth 12 posted without stopIdle(S_MAIN) - the play arm's DENOMINATOR (5 go, 4 bestmove), early-go (1 early) and trap ('RuntimeError: unreachable') lines red with the new double-step walk (play arm alone, CT_NOGO_WALKS=play: 3 of 3 runs red); the review arm green on this run; the tree's bundle 92b13a5b8746 reads 7/0 (play arm alone green 3 of 3)
const L=require('../lib');const R=require('../drive/review');const P=require('../drive/play');
const WRAP=()=>{const W=window.Worker;let n=0;window.__wk=[];
  window.Worker=function(url,opt){const w=new W(url,opt);const rec={id:n++,gos:0,bms:0,open:0,early:0};window.__wk.push(rec);
    const pm=w.postMessage.bind(w);w.postMessage=(m)=>{if(typeof m==='string'&&/^go\b/.test(m)){rec.gos++;if(rec.open>0)rec.early++;rec.open++;}return pm(m);};
    w.addEventListener('message',e=>{if(/^bestmove/.test(String(e.data||''))){rec.bms++;rec.open=Math.max(0,rec.open-1);}});return w;};
  window.Worker.prototype=W.prototype;};
const read=(b)=>b.page.evaluate(()=>window.__wk.filter(r=>r.gos>0).map(r=>({id:r.id,gos:r.gos,bms:r.bms,early:r.early})));
L.run(async()=>{
  for(const walk of (process.env.CT_NOGO_WALKS||'review,play').split(',')){
    const b=await L.launch({geo:'kunal761',name:'nogo-'+walk,store:{ct_pool:'3'}});await b.ctx.addInitScript(WRAP);await b.open();
    let ok=true;try{
      if(walk==='review'){await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,1);await b.settle(400);
        // DOUBLE STEPS: the strip's next arrow clicked twice 15ms apart (one render apart - two clicks in one task batch into ONE render and one
        // search), then 300ms - so a search is asked for while the previous one is
        // still running, which a one-step-and-wait walk on a fast machine never does (this gate's first draft stayed green on its control)
        for(let i=0;i<10;i++){await b.page.evaluate(async()=>{const nx=()=>{const r=[...document.querySelectorAll('[data-ct="strip-row"]')].pop();return r?[...r.querySelectorAll('button')].pop():null;};const a=nx();if(a)a.click();await new Promise(r=>setTimeout(r,15));const c=nx();if(c)c.click();});await b.page.waitForTimeout(300);}}
      else{await P.states['cpu-4ply'](b);
        // #550 helper app A [jobs/the-main-engine-worker-...-2026-11-07, whatIsLeft 'the Play arm has no overlapping control']: the walk
        // that could not overlap two searches (single Back/Forward taps 60-250ms apart, then a move after them) is now the review arm's
        // DOUBLE STEP - Back or Forward clicked twice 15ms apart, then 300ms - so the eval bar is asked for a new position while its last
        // depth-12 search runs; and the player's move goes in the instant the last step lands, so the bot's search is asked for while
        // the eval bar's still runs on the same main worker. Each arm is now shown able to fail (control records below).
        const dbl=async(t)=>{const n=await b.page.evaluate(async(t)=>{const f=()=>[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()===t&&x.getBoundingClientRect().width>1);let k=0;const a=f();if(a){a.click();k++;}await new Promise(r=>setTimeout(r,15));const c=f();if(c){c.click();k++;}return k;},t);await b.page.waitForTimeout(300);return n;};
        let clicks=0;for(let i=0;i<4;i++)clicks+=await dbl('Back');for(let i=0;i<3;i++)clicks+=await dbl('Forward');
        // the last Forward lands on the live position and the move goes in 20ms later, inside the eval bar's search for it
        clicks+=await b.page.evaluate(async()=>{const f=()=>[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Forward'&&x.getBoundingClientRect().width>1);let k=0;for(let j=0;j<2;j++){const a=f();if(a){a.click();k++;}await new Promise(r=>setTimeout(r,15));}return k;});
        await b.page.waitForTimeout(20);
        L.note('play: '+clicks+' Back/Forward clicks in 8 double steps');
        await b.move('d2','d4',0);await P.waitPlies(b,6,20000);}
      await b.settle(3000);}catch(e){ok=false;L.note(walk+': '+String(e).slice(0,140));}
    const w=await read(b);const gos=w.reduce((t,r)=>t+r.gos,0),bms=w.reduce((t,r)=>t+r.bms,0),early=w.reduce((t,r)=>t+r.early,0);
    L.say(ok&&gos>=10&&bms===gos,'TC-R186 '+walk+' DENOMINATOR the engines searched: '+gos+' go, '+bms+' bestmove over '+w.length+' worker(s)',w);
    L.say(early===0,'TC-R186 '+walk+' no worker was sent "go" while its last search was still running ('+early+' early)',w);
    const traps=b.errs.filter(e=>/unreachable|RuntimeError/.test(e));
    L.say(traps.length===0,'TC-R186 '+walk+' and no engine trapped (no "unreachable"/RuntimeError page error)',traps.slice(0,2));
    await b.close();
  }
},'102-engine-no-go-into-a-running-search');
