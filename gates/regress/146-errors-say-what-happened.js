'use strict';
// gates/regress/146-errors-say-what-happened.js - WHEN SOMETHING FAILS OR THE NETWORK IS GONE, THE APP SAYS WHAT HAPPENED. US-R154 / TC-R222a..m.
//
// WHY [#550, docs/errors-offline-check-2026-11-12, Kunal's pick "Batch 10, serious first", Thu 12 Nov 2026]: ERR-01 (P1) on a slow line the
// review waited 120s for the 7MB engine and then showed a review graded WITHOUT Stockfish as if it were a normal one; ERR-02/ERR-03 (P2) the
// service worker precached only the app shell, so after one visit offline Review had no engine either; ERR-04 (P2) a chess.com or Lichess
// network failure said "the preview sandbox blocks outside connections", false on the live site; ERR-05 (P2) "Sign in with Google" offline
// gave no reason; ERR-07 (P2) with storage blocked or full nothing was saved and nothing said so. And no message may ask a player to set up
// Firebase (the unauthorized-domain line said "add the domain in Auth settings").
// WHAT IT READS: the bundle under test (CT_APP) and the repository's sw.js (served beside it). Engine failure is lib.js's engineFail:'all'
// (every Stockfish worker throws, so the review takes the built-in engine, as it does when the engine never loads). Offline is Playwright's
// context.setOffline(true), which also makes navigator.onLine false. chess.com and Lichess are routed inside the browser (aborted, or a 503);
// nothing leaves the container. Storage failure is an init script that makes Storage.prototype.setItem throw.
// WHAT IT ASSERTS, at kunal761:
//  (a) TC-R222a a review graded without Stockfish says so on its summary and offers "Grade it again with Stockfish" (DENOMINATOR: the summary
//      opened, and review.engine.path is 'builtin'); TC-R222b tapping it grades the game again (a NEW review object, summary back).
//  (b) TC-R222c with Stockfish working the same summary carries NO such notice (so (a) is the engine, not a notice shown every time).
//  (c) TC-R222d after ONE visit the service worker's cache holds both engine files, under a cache name that is not the old v4.
//  (d) TC-R222e chess.com unreachable: "Couldn't reach Chess.com. Check your connection..." with no "sandbox"/"real website"; Lichess 503:
//      "Lichess answered with an error (server 503)"; offline: "You are offline" and the saved games kept.
//  (e) TC-R222f Sign in with Google while offline says signing in needs a connection.
//  (f) TC-R222g storage that throws on every write raises "not saving your progress"; TC-R222h a quota error raises "out of storage space".
//  (g) TC-R222i the bundle carries none of the setup sentences (Firebase Auth settings, database rules, publish the rule, preview sandbox,
//      in-app preview).
//  (h) TC-R222j (#550 ERR-06) a game against Astrid (1900, meant for Stockfish) with every Stockfish worker failing: the status line reads
//      "Engine not loaded: Astrid is playing at reduced strength"; with Stockfish working (the control launch) there is no such line.
//  (i) TC-R222k (ERR-08) offline shows a fixed notice naming what still works; the board, every button and the page scroll keep their place,
//      the notice takes no tap, and it goes when the network is back.
//  (j) TC-R222l (ERR-11) a pasted game whose PGN says Chess.com looks its players up (precondition); one from anywhere else sends no request.
//  (k) TC-R222m (ERR-13) a render error planted after mount shows "Something went wrong", Reload and the build stamp instead of a blank page.
// KNOW ITS LIMIT: the slow-download case of ERR-01 is reached through a worker that cannot start, not through a real 120s wait (gate 99 ERR-08's engine reload when the network returns, and ERR-09's 3 s cached fallback in sw.js, are not exercised here (no gate here drives a slow line through the service worker); ERR-12 (the blocked Firebase and Fonts requests) is not built.
// holds the engine file and times the wait line); the service worker is checked by its cache, not by a cold start with the network off.
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=20 red=10 scope=trial:ee1e228e0899 how=#550 the branch tip before ERR-01..07, served with HEAD's sw.js (v4, shell only): TC-R222a,b,d,e(x3),f,g,h,i red; TC-R222c (no notice with Stockfish working) stays green by design - it is the control that (a) is not shown every time; on t2 f9918762b587 with this sw.js 20/0
// CONTROL-RECORD: bcc4eff 2026-11-13 total=36 red=5 scope=trial:9f4f6f823150 how=#550 ERR-06/08/11/13 arms on t0, the branch tip before them (faa82a9): TC-R222j (no line), TC-R222k x2 (no notice), TC-R222l (2 requests, gatepariswhite and gateparisblack, sent to Chess.com for a Paris game), TC-R222m (blank page, root text 0 chars) red; the older arms stay green; on t3 450fed03791b 36/0
// CONTROL-RECORD: fbd9ff8 2026-11-13 total=90 red=28 scope=trial:aee112168086 how=#550 jobs/notices-cut-their-own-key-words-on-kunals-phone-2026-11-13: the branch tip (fbd9ff8) - TC-R222j x4 (the ERR-06 line 413px in a 255/200 slot, old words) and TC-R222k x24 (the offline pill cut to one line, over the play status, the lesson prompt and the Puzzles top row at kunal761 and se; no edge line) red; every other arm green; on t1 c6f678df4c68 (this fix) 90/0
// ERR-08 words [#550 helper B, jobs/offline-notice-words-cover-bottom-controls-for-five-seconds-2026-11-13]: for their first 5 s the offline words sat in the app's toast place over the bottom controls (it was printed as a note); they now sit over the centre of the board and TC-R222k ASSERTS they cover no text and no control, as it asserts of the 2px edge line that stays. TC-R222n: the puzzle counter is whole at 320x568.
// CONTROL-RECORD: 4077844 2026-11-13 total=63 red=5 scope=env:CT_146_OFF_ONLY=1 how=#550 helper B (jobs/offline-notice-words-cover-bottom-controls-for-five-seconds-2026-11-13): the branch tip's bundle (f901598, trial 1b47cb7113e5) - TC-R222k 'the words notice covers no text and no control' red in pass and play at kunal761 (Moves, Back, Forward, Hint, Flip, More at 590) and se, lesson practice at se (moves panel, Analyze this line, Copy moves) and puzzle training at se (Previous..Next at 432), and TC-R222n red (the counter '1 / 890 · 600', 93 in a 90 box); lesson practice and puzzle training at kunal761 and every older line green. On t5 4ab71e8e6ef3 63/0
const L=require('../lib');const R=require('../drive/review');const fs=require('fs'),path=require('path');
const txt=(b)=>b.page.evaluate(()=>document.body.innerText||'');
async function review(b){await b.tile('Review');await b.page.locator('textarea').first().fill(R.PGN_OPERA);await b.tapText(/^⚡ Analyze Game$/,{wait:1200});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(800);}
async function openSheet(b){try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);return true;}catch(e){return false;}}
L.run(async()=>{
  const OFF_ONLY=!!process.env.CT_146_OFF_ONLY;   // CT_146_OFF_ONLY=1 runs block (i), the offline notice, alone
  if(!OFF_ONLY){ // (a) no engine
    const b=await L.launch({geo:'kunal761',name:'err146-noeng',engineFail:'all',store:{ct_pool:'1'}});await b.open();
    let ok=true;try{await review(b);}catch(e){ok=false;L.note('review: '+String(e).slice(0,160));}
    const path0=await b.page.evaluate(()=>{const r=window.__ctReview;if(r)r.__gate146=1;return r&&r.engine&&r.engine.path;});
    L.say(ok&&path0==='builtin','TC-R222 PRECONDITION the review finished with no Stockfish (summary open, engine path "'+path0+'")',{ok,path0});
    const n=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-noengine"]');return e?e.innerText:'';});
    const retry=await b.page.locator('[data-ct="rev-noengine-retry"]').count();
    L.say(/Stockfish engine/.test(n)&&/quick review without it/.test(n)&&retry===1,'TC-R222a the summary says it was graded without Stockfish and offers to grade it again ("'+n.replace(/\s+/g,' ').slice(0,160)+'")',{n,retry});
    let again=false;if(retry){try{await b.page.locator('[data-ct="rev-noengine-retry"]').click();await b.settle(600);await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(800);
      again=await b.page.evaluate(()=>{const r=window.__ctReview;return !!r&&!r.__gate146;});}catch(e){L.note('retry: '+String(e).slice(0,160));}}
    L.say(again,'TC-R222b "Grade it again with Stockfish" reviews the game again (a new review, summary back)',again);
    L.say(b.errs.length===0,'TC-R222 zero app errors (no engine)',b.errs.slice(0,3));await b.close();
  }
  if(!OFF_ONLY){ // (b) engine working: no notice; (c) the service worker cached the engine on this first visit
    const b=await L.launch({geo:'kunal761',name:'err146-eng',store:{ct_pool:'1'}});await b.open();
    // the cache is read BEFORE anything asks for the engine again: the start-up worker fetched it before the service worker was in control,
    // so only the install's own precache can put it there (a review run first would fetch it under control and fill the cache either way)
    let c=null;for(let i=0;i<40;i++){c=await b.page.evaluate(async()=>{try{if(!navigator.serviceWorker)return {sw:false};const reg=await navigator.serviceWorker.getRegistration();const act=!!(reg&&reg.active&&reg.active.state==='activated');const keys=await caches.keys();const out={sw:!!reg,act,keys,js:false,wasm:false};
      for(const k of keys){const cc=await caches.open(k);if(await cc.match('./stockfish-18-lite-single.js'))out.js=true;if(await cc.match('./stockfish-18-lite-single.wasm'))out.wasm=true;}return out;}catch(e){return {err:String(e)};}});
      if(c&&c.act&&c.keys&&c.keys.length)break;await b.settle(500);}
    L.say(!!c&&c.act,'TC-R222 PRECONDITION the service worker installed and activated on this first visit ('+JSON.stringify(c)+')',c);
    L.say(!!c&&c.act&&c.js&&c.wasm&&c.keys.indexOf('chess-trainer-v4')<0,'TC-R222d after one visit the service worker cache already holds both engine files, under a new cache name ('+JSON.stringify(c&&{keys:c.keys,js:c.js,wasm:c.wasm})+')',c);
    let ok=true;try{await review(b);}catch(e){ok=false;L.note('review: '+String(e).slice(0,160));}
    // #550 [jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29]: the notice is found by WHAT IT SAYS on the
    // painted page, the hook rev-noengine (added in this gate's own build) as a fallback only. Keyed on the hook alone this absence line read
    // "absent" on any bundle that showed the notice under another name - the #432 costume.
    const r=await b.page.evaluate(()=>{const re=/Stockfish engine (could not load|did not load in time)|quick review without it/;
      const byText=[...document.querySelectorAll('body *')].some(x=>x.children.length===0&&re.test(x.textContent||'')&&x.getBoundingClientRect().height>0);
      return {p:window.__ctReview&&window.__ctReview.engine&&window.__ctReview.engine.path,n:byText||!!document.querySelector('[data-ct="rev-noengine"]'),byText};});
    L.say(ok&&r.p&&r.p!=='builtin'&&!r.n,'TC-R222c with Stockfish working the summary carries no "without Stockfish" notice (engine path "'+r.p+'", notice '+(r.n?'shown':'absent')+')',r);
    L.say(b.errs.length===0,'TC-R222 zero app errors (engine)',b.errs.slice(0,3));await b.close();
  }
  if(!OFF_ONLY){ // (d) fetch failures
    const b=await L.launch({geo:'kunal761',name:'err146-net'});
    await b.ctx.route(/api\.chess\.com/,r=>r.abort('internetdisconnected'));
    await b.ctx.route(/lichess\.org/,r=>r.fulfill({status:503,contentType:'text/plain',body:'busy'}));
    await b.open();await b.tile('Review');await b.settle(800);
    const fetchAs=async(ph,u)=>{await b.page.locator('select[aria-label="Choose site"]').first().selectOption(ph.indexOf('Lichess')===0?'li':'cc');await b.settle(300);
      const i=b.page.locator('input[placeholder="'+ph+'"]').first();await i.fill(u);await b.settle(200);await i.press('Enter');
      let t='';for(let k=0;k<20;k++){await b.settle(400);t=await txt(b);if(/Couldn.t reach|answered with an error|You are offline\. Your saved/.test(t))break;}return t;};
    const t1=await fetchAs('Chess.com username','gatecc');
    const m1=(t1.match(/[^\n]*Couldn.t reach Chess\.com[^\n]*/)||[''])[0];
    L.say(/Couldn.t reach Chess\.com\. Check your connection/.test(m1)&&!/sandbox|real website|preview/i.test(t1),'TC-R222e chess.com unreachable says to check the connection, and nothing about a sandbox ("'+m1.slice(0,150)+'")',m1);
    const t2=await fetchAs('Lichess username','gateli');
    const m2=(t2.match(/[^\n]*Lichess[^\n]*(error|reach)[^\n]*/)||[''])[0];
    L.say(/Lichess answered with an error \(server 503\)/.test(t2)&&!/sandbox|real website|preview/i.test(t2),'TC-R222e Lichess answering 503 says the site answered with an error ("'+m2.slice(0,150)+'")',m2);
    await b.ctx.setOffline(true);await b.settle(300);
    const t3=await fetchAs('Chess.com username','gatecc2');
    const m3=(t3.match(/[^\n]*You are offline\. Your saved[^\n]*/)||[''])[0];   // #550 ERR-08: the offline notice also starts 'You are offline', so the Review line is matched by its own words
    L.say(/You are offline\. Your saved games are below/.test(m3),'TC-R222e offline says so, and that saved games stay ("'+m3.slice(0,150)+'")',m3);
    L.say(b.errs.length===0,'TC-R222 zero app errors (network)',b.errs.slice(0,3));await b.close();
  }
  if(!OFF_ONLY){ // (e) sign-in offline, from the Account sheet on Home
    const b=await L.launch({geo:'kunal761',name:'err146-signin'});await b.open();await b.settle(800);
    await b.ctx.setOffline(true);await b.settle(300);
    let so=await openSheet(b);let tS='';if(so){try{await b.tapText(/Sign in with Google/,{wait:800});}catch(e){so=false;L.note('sign-in tap: '+String(e).slice(0,120));}tS=await txt(b);}
    const mS=(tS.match(/[^\n]*Signing in needs a connection[^\n]*/)||[''])[0];
    L.say(so&&/You are offline\. Signing in needs a connection/.test(tS),'TC-R222f Sign in with Google while offline says signing in needs a connection ("'+mS.slice(0,140)+'")',{so,mS});
    await b.ctx.setOffline(false);
    L.say(b.errs.length===0,'TC-R222 zero app errors (sign-in)',b.errs.slice(0,3));await b.close();
  }
  for(const [kind,re,id] of (OFF_ONLY?[]:[['blocked',/not saving your progress/,'TC-R222g storage that throws on every write raises a warning'],['quota',/out of storage space/,'TC-R222h a full storage (quota error) raises a warning']])){
    const b=await L.launch({geo:'kunal761',name:'err146-st-'+kind});
    await b.ctx.addInitScript((kind)=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(kind==='blocked')throw new DOMException('The operation is insecure.','SecurityError');if(String(k).indexOf('ct_')===0&&k!=='ct_safe'&&k!=='ct_seeded')throw new DOMException('The quota has been exceeded.','QuotaExceededError');return o.call(this,k,v);};},kind);
    await b.open();let t='';for(let i=0;i<12;i++){await b.settle(500);t=await txt(b);if(re.test(t))break;}
    const m=(t.match(new RegExp('[^\\n]*'+re.source+'[^\\n]*'))||[''])[0];
    L.say(re.test(t),id+' ("'+m.slice(0,150)+'")',m);
    L.say(b.errs.length===0,'TC-R222 zero app errors (storage '+kind+')',b.errs.slice(0,3));await b.close();
  }
  if(!OFF_ONLY){ // (g) the bundle
    const app=path.resolve(process.env.CT_APP||path.join(__dirname,'..','..','app.js'));let src='';try{src=fs.readFileSync(app,'utf8');}catch(e){}
    const BAD=[/isn.t authorized in Firebase/,/add the domain in Auth settings/,/database rules need a tweak/,/publish the \/tournaments rule/,/the preview sandbox blocks/,/in this in-app preview/];
    const hit=BAD.filter(r=>r.test(src)).map(r=>r.source);
    L.say(src.length>100000&&hit.length===0,'TC-R222i no player-facing sentence asks him to set up Firebase or blames a preview sandbox ('+(hit.length?hit.join(' | '):'none of '+BAD.length+' found')+')',hit);
  }
  // WHOLE: a text element is readable whole when its own box is not cut (scrollWidth/scrollHeight within the client box) and every line box of
  // its text lies inside the element and the viewport. #550 jobs/notices-cut-their-own-key-words-on-kunals-phone-2026-11-13.
  const whole=(b,sel)=>b.page.evaluate((sel)=>{const e=document.querySelector(sel);if(!e)return null;const q=e.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(e);
    const lines=[...g.getClientRects()].filter(x=>x.width>0.5);const ys=[...new Set(lines.map(x=>Math.round(x.top)))];
    const inside=lines.every(x=>x.left>=q.left-1&&x.right<=q.right+1&&x.top>=q.top-1&&x.bottom<=q.bottom+1&&x.left>=-1&&x.right<=innerWidth+1&&x.bottom<=innerHeight+1);
    return {t:(e.innerText||'').trim(),w:Math.round(q.width),h:Math.round(q.height),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,lines:ys.length,inside,
      ok:lines.length>0&&inside&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1};},sel);
  if(!OFF_ONLY){ // (h) ERR-06: Astrid (1900) is meant to be Stockfish; with the engine blocked the status line says the built-in engine is playing
    const P=require('../drive/play');
    for(const [fail,id,geo] of [['all','TC-R222j','kunal761'],['all','TC-R222j','se'],[null,'TC-R222j control','kunal761']]){
      const b=await L.launch({geo,name:'err146-astrid-'+(fail||'ok')+'-'+geo,...(fail?{engineFail:fail}:{})});await b.open();let ok=true;
      try{await P.states['setup-bot-astrid'](b);await P.tapStart(b,1500);}catch(e){ok=false;L.note('astrid: '+String(e).slice(0,140));}
      let t='';for(let i=0;i<10;i++){await b.settle(500);t=await txt(b);if(/Engine not loaded/.test(t))break;}
      const named=/Astrid/.test(t);const m=(t.match(/[^\n]*Engine not loaded[^\n]*/)||[''])[0];
      if(fail){const ef=await b.engineFail();L.say(ok&&named&&ef.failed>0,'TC-R222 PRECONDITION a game against Astrid has started with every Stockfish worker failing at '+geo+' ('+JSON.stringify(ef)+')',{ok,named,ef});
        L.say(/Engine not loaded, so Astrid plays weaker/.test(t),id+' an opponent rated for Stockfish says when the built-in engine plays in its place, at '+geo+' ("'+m.slice(0,140)+'")',m);
        const w=await whole(b,'[data-ct="play-opening"]');
        L.say(!!w&&w.ok&&/^Engine not loaded, so Astrid plays weaker$/.test(w.t),id+' the line is readable whole at '+geo+': every line box inside its box and the screen, nothing cut ('+JSON.stringify(w)+')',w);}
      else{L.say(ok&&named,'TC-R222 PRECONDITION a game against Astrid has started with Stockfish working',{ok,named});
        L.say(!/Engine not loaded/.test(t),id+': with Stockfish working there is no such line (so the line is the engine, not shown every time)',m);}
      L.say(b.errs.length===0,'TC-R222 zero app errors (Astrid '+(fail||'engine')+' '+geo+')',b.errs.slice(0,3));await b.close();}
  }
  { // (i) ERR-08: going offline shows the words whole for a few seconds and a line along the top edge that covers nothing; nothing moves; both go when
    // the network is back. On a Pass and Play board, in lesson practice and in puzzle training (the three screens the checker found covered), at kunal761 and 320x568.
    const P=require('../drive/play'),D=require('../drive/lesson'),Z=require('../drive/puzzles');
    for(const geo of ['kunal761','se'])for(const [nm,go] of [['pass and play',b=>P.states['pp-m0'](b)],['lesson practice',b=>D.states['practice-correct'](b)],['puzzle training',b=>Z.states['train'](b)]]){
    const b=await L.launch({geo,name:'err146-offline-'+geo+'-'+nm.split(' ')[0]});await b.open();let ok=true;try{await go(b);await b.settle(800);}catch(e){ok=false;L.note('offline '+nm+': '+String(e).slice(0,140));}
    const snap=()=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((x,y)=>y.getBoundingClientRect().width-x.getBoundingClientRect().width)[0];
      const r=g?g.getBoundingClientRect():null;const bt=[...document.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>{const q=x.getBoundingClientRect();return Math.round(q.left)+','+Math.round(q.top);});
      const ban=document.querySelector('[data-ct="offline-banner"]'),edge=document.querySelector('[data-ct="offline-edge"]');
      // what the offline UI covers: every painted text line box and every control that any offline element intersects. The set is found by its
      // WORDS as well as by the hooks (any fixed element whose text starts 'You are offline'), so the bundle before the fix, which has no edge
      // line, is measured on the same terms [CLAUDE.md: an assertion keyed to a hook its own build adds cannot be controlled]
      const offEls=[...new Set([edge,ban,...[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).position==='fixed'&&/^You are offline/.test((d.innerText||'').trim()))].filter(Boolean))];
      let cov=[];for(const oe of offEls){const q=oe.getBoundingClientRect();for(const el of document.querySelectorAll('body *')){if(oe.contains(el)||el.contains(oe)||offEls.indexOf(el)>=0)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
        const ctl=/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName);let rr=[];if(ctl)rr=[el.getBoundingClientRect()];else for(const n of el.childNodes)if(n.nodeType===3&&n.textContent.trim()){const k=document.createRange();k.selectNodeContents(n);rr.push(...k.getClientRects());}
        for(const x of rr)if(x.width>=1&&x.height>=1&&x.left<q.right&&x.right>q.left&&x.top<q.bottom&&x.bottom>q.top){cov.push((oe.getAttribute('data-ct')||'pill')+' over '+el.tagName+':'+((el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,24))+'@'+Math.round(x.top));break;}}}
      return {board:r?[Math.round(r.left*100)/100,Math.round(r.top*100)/100,Math.round(r.width*100)/100]:null,btns:bt.join(' '),scroll:[...document.querySelectorAll('*')].filter(e=>e.scrollTop>0).map(e=>(e.getAttribute('data-ct')||e.tagName)+':'+e.scrollTop).join(','),
        banner:ban?{t:(ban.innerText||'').trim(),pe:getComputedStyle(ban).pointerEvents}:null,edge:edge?{r:[edge.getBoundingClientRect().top,edge.getBoundingClientRect().height],pe:getComputedStyle(edge).pointerEvents,label:edge.getAttribute('aria-label')}:null,cov,offN:offEls.length,
        /* #550 #432 sweep round 4: the notice counted by its WORDS - painted text or an accessible name starting 'You are offline' - so the two
           absence lines below (no notice while online, the notice goes when the network is back) do not read only the hooks this build added */
        words:[...document.querySelectorAll('body *')].filter(x=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0&&(/^You are offline/.test((x.innerText||'').trim())||/^You are offline/.test(x.getAttribute('aria-label')||''));}).length};});
    if(nm==='puzzle training'){   // TC-R222n [#550 helper B, the offline job's aside]: the puzzle counter is whole ('1 / 890 · 6…' at 320x568), found by its words
      const ct=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('span')].find(x=>/^\d+ ?\/ ?\d+ · /.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);return e?{t:e.innerText.trim(),sw:e.scrollWidth,cw:e.clientWidth}:null;});
      L.say(!!ct&&ct.sw<=ct.cw,'TC-R222n puzzle training at '+geo+': the counter is whole, not cut ('+(ct?JSON.stringify(ct):'not found')+')',ct);}
    const a=await snap();L.say(ok&&!!a.board&&!a.banner&&!a.edge&&a.words===0,'TC-R222 PRECONDITION '+nm+' at '+geo+': a board is up online, with no offline notice (by hook, and by its words: '+a.words+')',{board:a.board,banner:a.banner,edge:a.edge,words:a.words});
    await b.ctx.setOffline(true);await b.settle(600);const c=await snap();const w=await whole(b,'[data-ct="offline-banner"]');
    L.say(!!c.banner&&/^You are offline\. Lessons, puzzles and saved games still work\.$/.test(c.banner.t),'TC-R222k '+nm+' at '+geo+': going offline says so and names what still works ("'+(c.banner&&c.banner.t)+'")',c.banner);
    L.say(!!w&&w.ok,'TC-R222k '+nm+' at '+geo+': the words are readable whole, every line inside the notice and the screen ('+JSON.stringify(w)+')',w);
    L.say(!!c.banner&&c.cov.length===0,'TC-R222k '+nm+' at '+geo+': for its first 5 s the words notice covers no text and no control ('+(c.cov.join(' | ')||'nothing')+') [#550 helper B, jobs/offline-notice-words-cover-bottom-controls-for-five-seconds-2026-11-13: it sat in the toast place over the bottom controls]',c.cov);
    L.say(!!c.board&&JSON.stringify(c.board)===JSON.stringify(a.board)&&c.btns===a.btns&&c.scroll===a.scroll&&c.banner&&c.banner.pe==='none','TC-R222k '+nm+' at '+geo+': nothing moves: the board, every button and every scroller stay where they were, and it takes no tap (board '+JSON.stringify(a.board)+' -> '+JSON.stringify(c.board)+')',{a:a.board,c:c.board,same:c.btns===a.btns});
    await b.settle(5200);const e=await snap();
    L.say(e.offN>0,'TC-R222k '+nm+' at '+geo+' DENOMINATOR after 5 s offline the app still shows it is offline ('+e.offN+' element(s))',e.offN);
    L.say(e.offN>0&&e.cov.length===0,'TC-R222k '+nm+' at '+geo+': what stays while offline covers no text and no control ('+(e.cov.join(' | ')||'nothing')+')',e.cov);
    L.say(!e.banner&&!!e.edge&&e.edge.pe==='none'&&/You are offline\. Lessons, puzzles and saved games still work/.test(e.edge.label||''),'TC-R222k '+nm+' at '+geo+': after 5 s the words go and the line along the top edge stays (takes no tap, and carries the words for a screen reader)',{banner:e.banner,edge:e.edge});
    await b.ctx.setOffline(false);await b.settle(600);const d=await snap();
    L.say(e.words>0&&!d.banner&&!d.edge&&d.words===0,'TC-R222k '+nm+' at '+geo+': the notice goes when the network is back (by hook, and by its words: '+e.words+' offline -> '+d.words+' online)',{banner:d.banner,edge:d.edge,words:[e.words,d.words]});
    L.say(b.errs.length===0,'TC-R222 zero app errors (offline notice, '+nm+', '+geo+')',b.errs.slice(0,3));await b.close();}
  }
  if(!OFF_ONLY){ // (j) ERR-11: a pasted game looks names up only on the site its PGN names
    const b=await L.launch({geo:'kunal761',name:'err146-site',store:{ct_pool:'3'}});const hits=[];
    await b.ctx.route(/api\.chess\.com|lichess\.org\/api\/user/,r=>{hits.push(r.request().url());return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
    await b.open();
    const paste=async(pgn)=>{const n0=hits.length;await b.tile('Review');await b.page.locator('textarea').first().fill(pgn);await b.tapText(/^⚡ Analyze Game$/,{wait:1200});
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(2500);const n=hits.slice(n0);await b.home();await b.settle(500);return n;};
    let cc=[],other=[];try{cc=await paste(R.PGN_OPERA);other=await paste(R.PGN_OPERA.replace('[Site "Chess.com"]','[Site "Paris"]').replace(/Jsmiller1112/g,'GateParisWhite').replace(/DukeKarlCountIsouard99/g,'GateParisBlack'));/* new names: the first paste's 404s are cached as answers, so the same names would ask nothing on either bundle */}catch(e){L.note('paste: '+String(e).slice(0,140));}
    L.say(cc.filter(u=>/pub\/player\//.test(u)).length>=1,'TC-R222 PRECONDITION a game whose PGN says Chess.com looks its players up there ('+cc.length+' requests)',cc.slice(0,2));
    L.say(other.length===0,'TC-R222l a game from anywhere else sends no name to Chess.com or Lichess ('+other.length+' requests'+(other.length?': '+other[0]:'')+')',other.slice(0,3));
    L.say(b.errs.length===0,'TC-R222 zero app errors (site lookups)',b.errs.slice(0,3));await b.close();
  }
  if(!OFF_ONLY){ // (k) ERR-13: a render error shows a page that says so, with Reload and the build stamp, instead of a blank screen
    const b=await L.launch({geo:'kunal761',name:'err146-boundary'});await b.open();await b.settle(800);
    const up=await b.page.evaluate(()=>(document.getElementById('root').innerText||'').length);
    // the next render throws: for 1.2 s every Array.prototype.map call fails, and a 1px resize makes the app render (its lists are maps). A map
    // called outside a render in that window fails too and is only a page error; the assertion is that the RENDER error reached the boundary
    await b.page.evaluate(()=>{const om=Array.prototype.map;window.__boomN=0;Array.prototype.map=function(...a){window.__boomN++;throw new Error('gate 146 render error');};
      setTimeout(()=>{Array.prototype.map=om;},1200);});
    await b.page.setViewportSize({width:376,height:761});   // a real size change, so the app's resize handler sets new state and renders
    await b.settle(1500);
    const m=await b.page.evaluate(()=>{const r=document.getElementById('root');const t=(r&&r.innerText)||'';const btn=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Reload');return {t:t.replace(/\s+/g,' ').slice(0,200),len:t.length,btn:!!btn,fired:window.__boomN>0};});
    L.say(up>50&&m.fired,'TC-R222 PRECONDITION the app was up and the planted render error fired (root text '+up+' chars)',{up,fired:m.fired});
    L.say(/Something went wrong/.test(m.t)&&m.btn&&/Build /.test(m.t),'TC-R222m a render error shows "Something went wrong" with Reload and the build stamp, not a blank page ("'+m.t.slice(0,120)+'")',m);
    L.note('TC-R222m: the planted error is counted in the page errors by design; the zero-errors line is not asserted for this launch');await b.close();
  }
},'146-errors-say-what-happened');
// CONTROL-RECORD: 4a79a54 2026-11-13 total=36 red=2 scope=trial:0100b5a554d7 how=#550 #432 sweep (rev-noengine re-keyed by its words): c1, rev-noengine renamed AND the without-Stockfish notice drawn on EVERY review - TC-R222c red (notice shown, found by text) and TC-R222a red on the renamed hook; the hook-keyed version (55ca2c7) is 35/1 with TC-R222c GREEN; on t0 6c4245e05ecc 36/0
// SELECTOR-OPENED: rev-noengine control=4a79a54 round 1: the notice found by its words; c1 renamed the hook and drew the notice on every review, TC-R222c red
// SELECTOR-OPENED: rev-noengine-retry reading=presence round 4: TC-R222a requires exactly one retry button
// CONTROL-RECORD: 9d0a1a9 2026-11-13 total=90 red=12 scope=trial:3411b30335fc how=#550 #432 sweep round 4 (the offline notice counted by its words): c1, offline-edge and offline-banner renamed AND the edge line rendered whether or not the network is up - the PRECONDITION (no notice online) and TC-R222k 'the notice goes when the network is back' red at all six inputs (3 screens x kunal761, se); the hook-keyed version (00304f6) on the same bundle is 54/36 with those twelve GREEN (its reds are the presence lines, the missing hooks); on t0 6924012f2b2c 90/0
// SELECTOR-OPENED: offline-banner control=9d0a1a9 the two absence lines also count the notice by its words; c1 renamed both hooks and left the notice up online, red
// SELECTOR-OPENED: offline-edge control=9d0a1a9 the two absence lines also count the edge by its accessible name; same c1 control
