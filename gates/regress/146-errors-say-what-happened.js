'use strict';
// gates/regress/146-errors-say-what-happened.js - WHEN SOMETHING FAILS OR THE NETWORK IS GONE, THE APP SAYS WHAT HAPPENED. US-R154 / TC-R222a..i.
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
// KNOW ITS LIMIT: the slow-download case of ERR-01 is reached through a worker that cannot start, not through a real 120s wait (gate 99
// holds the engine file and times the wait line); the service worker is checked by its cache, not by a cold start with the network off.
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=20 red=10 scope=trial:ee1e228e0899 how=#550 the branch tip before ERR-01..07, served with HEAD's sw.js (v4, shell only): TC-R222a,b,d,e(x3),f,g,h,i red; TC-R222c (no notice with Stockfish working) stays green by design - it is the control that (a) is not shown every time; on t2 f9918762b587 with this sw.js 20/0
const L=require('../lib');const R=require('../drive/review');const fs=require('fs'),path=require('path');
const txt=(b)=>b.page.evaluate(()=>document.body.innerText||'');
async function review(b){await b.tile('Review');await b.page.locator('textarea').first().fill(R.PGN_OPERA);await b.tapText(/^⚡ Analyze Game$/,{wait:1200});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(800);}
async function openSheet(b){try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);return true;}catch(e){return false;}}
L.run(async()=>{
  { // (a) no engine
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
  { // (b) engine working: no notice; (c) the service worker cached the engine on this first visit
    const b=await L.launch({geo:'kunal761',name:'err146-eng',store:{ct_pool:'1'}});await b.open();
    // the cache is read BEFORE anything asks for the engine again: the start-up worker fetched it before the service worker was in control,
    // so only the install's own precache can put it there (a review run first would fetch it under control and fill the cache either way)
    let c=null;for(let i=0;i<40;i++){c=await b.page.evaluate(async()=>{try{if(!navigator.serviceWorker)return {sw:false};const reg=await navigator.serviceWorker.getRegistration();const act=!!(reg&&reg.active&&reg.active.state==='activated');const keys=await caches.keys();const out={sw:!!reg,act,keys,js:false,wasm:false};
      for(const k of keys){const cc=await caches.open(k);if(await cc.match('./stockfish-18-lite-single.js'))out.js=true;if(await cc.match('./stockfish-18-lite-single.wasm'))out.wasm=true;}return out;}catch(e){return {err:String(e)};}});
      if(c&&c.act&&c.keys&&c.keys.length)break;await b.settle(500);}
    L.say(!!c&&c.act,'TC-R222 PRECONDITION the service worker installed and activated on this first visit ('+JSON.stringify(c)+')',c);
    L.say(!!c&&c.act&&c.js&&c.wasm&&c.keys.indexOf('chess-trainer-v4')<0,'TC-R222d after one visit the service worker cache already holds both engine files, under a new cache name ('+JSON.stringify(c&&{keys:c.keys,js:c.js,wasm:c.wasm})+')',c);
    let ok=true;try{await review(b);}catch(e){ok=false;L.note('review: '+String(e).slice(0,160));}
    const r=await b.page.evaluate(()=>({p:window.__ctReview&&window.__ctReview.engine&&window.__ctReview.engine.path,n:!!document.querySelector('[data-ct="rev-noengine"]')}));
    L.say(ok&&r.p&&r.p!=='builtin'&&!r.n,'TC-R222c with Stockfish working the summary carries no "without Stockfish" notice (engine path "'+r.p+'", notice '+(r.n?'shown':'absent')+')',r);
    L.say(b.errs.length===0,'TC-R222 zero app errors (engine)',b.errs.slice(0,3));await b.close();
  }
  { // (d) fetch failures
    const b=await L.launch({geo:'kunal761',name:'err146-net'});
    await b.ctx.route(/api\.chess\.com/,r=>r.abort('internetdisconnected'));
    await b.ctx.route(/lichess\.org/,r=>r.fulfill({status:503,contentType:'text/plain',body:'busy'}));
    await b.open();await b.tile('Review');await b.settle(800);
    const fetchAs=async(ph,u)=>{await b.page.locator('select[aria-label="Choose site"]').first().selectOption(ph.indexOf('Lichess')===0?'li':'cc');await b.settle(300);
      const i=b.page.locator('input[placeholder="'+ph+'"]').first();await i.fill(u);await b.settle(200);await i.press('Enter');
      let t='';for(let k=0;k<20;k++){await b.settle(400);t=await txt(b);if(/Couldn.t reach|answered with an error|You are offline/.test(t))break;}return t;};
    const t1=await fetchAs('Chess.com username','gatecc');
    const m1=(t1.match(/[^\n]*Couldn.t reach Chess\.com[^\n]*/)||[''])[0];
    L.say(/Couldn.t reach Chess\.com\. Check your connection/.test(m1)&&!/sandbox|real website|preview/i.test(t1),'TC-R222e chess.com unreachable says to check the connection, and nothing about a sandbox ("'+m1.slice(0,150)+'")',m1);
    const t2=await fetchAs('Lichess username','gateli');
    const m2=(t2.match(/[^\n]*Lichess[^\n]*(error|reach)[^\n]*/)||[''])[0];
    L.say(/Lichess answered with an error \(server 503\)/.test(t2)&&!/sandbox|real website|preview/i.test(t2),'TC-R222e Lichess answering 503 says the site answered with an error ("'+m2.slice(0,150)+'")',m2);
    await b.ctx.setOffline(true);await b.settle(300);
    const t3=await fetchAs('Chess.com username','gatecc2');
    const m3=(t3.match(/[^\n]*You are offline[^\n]*/)||[''])[0];
    L.say(/You are offline\. Your saved games are below/.test(m3),'TC-R222e offline says so, and that saved games stay ("'+m3.slice(0,150)+'")',m3);
    L.say(b.errs.length===0,'TC-R222 zero app errors (network)',b.errs.slice(0,3));await b.close();
  }
  { // (e) sign-in offline, from the Account sheet on Home
    const b=await L.launch({geo:'kunal761',name:'err146-signin'});await b.open();await b.settle(800);
    await b.ctx.setOffline(true);await b.settle(300);
    let so=await openSheet(b);let tS='';if(so){try{await b.tapText(/Sign in with Google/,{wait:800});}catch(e){so=false;L.note('sign-in tap: '+String(e).slice(0,120));}tS=await txt(b);}
    const mS=(tS.match(/[^\n]*Signing in needs a connection[^\n]*/)||[''])[0];
    L.say(so&&/You are offline\. Signing in needs a connection/.test(tS),'TC-R222f Sign in with Google while offline says signing in needs a connection ("'+mS.slice(0,140)+'")',{so,mS});
    await b.ctx.setOffline(false);
    L.say(b.errs.length===0,'TC-R222 zero app errors (sign-in)',b.errs.slice(0,3));await b.close();
  }
  for(const [kind,re,id] of [['blocked',/not saving your progress/,'TC-R222g storage that throws on every write raises a warning'],['quota',/out of storage space/,'TC-R222h a full storage (quota error) raises a warning']]){
    const b=await L.launch({geo:'kunal761',name:'err146-st-'+kind});
    await b.ctx.addInitScript((kind)=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(kind==='blocked')throw new DOMException('The operation is insecure.','SecurityError');if(String(k).indexOf('ct_')===0&&k!=='ct_safe'&&k!=='ct_seeded')throw new DOMException('The quota has been exceeded.','QuotaExceededError');return o.call(this,k,v);};},kind);
    await b.open();let t='';for(let i=0;i<12;i++){await b.settle(500);t=await txt(b);if(re.test(t))break;}
    const m=(t.match(new RegExp('[^\\n]*'+re.source+'[^\\n]*'))||[''])[0];
    L.say(re.test(t),id+' ("'+m.slice(0,150)+'")',m);
    L.say(b.errs.length===0,'TC-R222 zero app errors (storage '+kind+')',b.errs.slice(0,3));await b.close();
  }
  { // (g) the bundle
    const app=path.resolve(process.env.CT_APP||path.join(__dirname,'..','..','app.js'));let src='';try{src=fs.readFileSync(app,'utf8');}catch(e){}
    const BAD=[/isn.t authorized in Firebase/,/add the domain in Auth settings/,/database rules need a tweak/,/publish the \/tournaments rule/,/the preview sandbox blocks/,/in this in-app preview/];
    const hit=BAD.filter(r=>r.test(src)).map(r=>r.source);
    L.say(src.length>100000&&hit.length===0,'TC-R222i no player-facing sentence asks him to set up Firebase or blames a preview sandbox ('+(hit.length?hit.join(' | '):'none of '+BAD.length+' found')+')',hit);
  }
},'146-errors-say-what-happened');
