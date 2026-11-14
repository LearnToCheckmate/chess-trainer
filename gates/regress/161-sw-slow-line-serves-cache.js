// gates/regress/161-sw-slow-line-serves-cache.js - ON A SLOW LINE THE SERVICE WORKER SERVES THE CACHED APP AFTER 3 s. TC-R222o..t, US-R154.
//
// WHY [#550 helper B; jobs/errors-offline-check-2026-11-12, whatIsLeft "ERR-09 has no gate"]. ERR-09 (bcc4eff): on a slow line a returning
// player waited the whole 9 s download of app.js with a copy in the cache. sw.js now still asks the network first, but serves the cached copy
// if the network has not answered in FRESH_WAIT_MS (3000), and lets the network refresh the cache behind it. Nothing gated that.
// HOW: no browser. sw.js is run in a node vm with a stand-in `self`, `caches` and `fetch` (a headless browser's service worker sits under
// the harness's network block, and its timing would be the machine's). Every request is driven through the worker's own fetch listener and
// the response it hands to respondWith() is read with its time. CT_SW=<path> runs it against another copy of sw.js (the control).
// WHAT IT ASSERTS:
//  TC-R222o DENOMINATOR sw.js loads and registers a fetch listener; TC-R222o2 its FRESH_WAIT_MS is 3000.
//  TC-R222p a network that never answers, with app.js in the cache: the cached copy is served at about 3 s (2.9 to 3.6) - not never.
//  TC-R222q a network that answers in 100 ms: its answer is served (not the cache), at about 0.1 s, and the cache is refreshed with it.
//  TC-R222r a network that fails at once, with a cached copy: the cached copy is served at once.
//  TC-R222s a network that never answers and NO cached copy: nothing is served at 3.6 s (no empty answer); the network's late answer is
//           served when it comes.
//  TC-R222t a cross-origin request (Firestore) is not touched: respondWith is not called.
// CONTROL-RECORD: 54d9a51 2026-11-14 total=7 red=2 scope=env:CT_SW=sw.js@21494ed how=[sha re-pointed from c95453c, the tree the run used, at which the gate did not exist: 54d9a51 is the commit that added this gate, its L.say lines are identical to today's, and sw.js is byte-identical between c95453c and 54d9a51 (only chess.jsx differs, by cfbae1a). Scope repaired #550 test-system helper B: written 'env:CT_SW=<sw.js at 21494ed>', with spaces, which made the line unparsable] #550 helper B: sw.js before ERR-09 (21494ed, no fallback timer) - TC-R222o2 (no FRESH_WAIT_MS) and TC-R222p (never served while the network hangs, still waiting at 3700 ms) red; the denominator, q, r, s and t green. On the tree's sw.js 7 of 7 green
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const L=require('../lib.js');
const SW=process.env.CT_SW||path.join(__dirname,'..','..','sw.js');
const ORIGIN='https://example.test';
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
function load(netPlan,cached){
  const store=new Map(Object.entries(cached||{}));const puts=[];const listeners={};
  const key=(r)=>typeof r==='string'?new URL(r,ORIGIN+'/').href:r.url;
  const caches={open:async()=>({put:async(r,res)=>{puts.push(key(r));store.set(key(r),res);},addAll:async()=>{}}),
    match:async(r)=>store.get(key(r)),keys:async()=>[],delete:async()=>true};
  const fetch=(req)=>netPlan(req);
  const self={location:new URL(ORIGIN+'/'),addEventListener:(t,f)=>{listeners[t]=f;},skipWaiting:()=>{},clients:{claim:()=>{}}};
  const ctx={self,caches,fetch,URL,Promise,setTimeout,clearTimeout,console};
  vm.runInNewContext(fs.readFileSync(SW,'utf8')+'\n;this.__wait=typeof FRESH_WAIT_MS!=="undefined"?FRESH_WAIT_MS:null;',ctx);
  return {listeners,puts,wait:ctx.__wait};
}
const res=(body)=>({ok:true,status:200,type:'basic',body,clone(){return res(body);}});
function drive(w,url,mode){let called=false,t0=Date.now(),out={settled:false};
  const ev={request:{method:'GET',url:ORIGIN+url,mode:mode||'no-cors'},respondWith:(p)=>{called=true;Promise.resolve(p).then(v=>{out.settled=true;out.v=v;out.ms=Date.now()-t0;});},waitUntil:()=>{}};
  w.listeners.fetch(ev);out.called=()=>called;return out;}
(async()=>{
  L.note('sw.js under test: '+path.relative(process.cwd(),SW));
  const w0=load(()=>new Promise(()=>{}),{});
  L.say(typeof w0.listeners.fetch==='function','TC-R222o DENOMINATOR sw.js loads and registers its fetch listener');
  L.say(w0.wait===3000,'TC-R222o2 FRESH_WAIT_MS is 3000 ('+w0.wait+')',{wait:w0.wait});
  if(typeof w0.listeners.fetch!=='function'){L.done();return;}
  {const w=load(()=>new Promise(()=>{}),{[ORIGIN+'/app.js']:res('cached')});const o=drive(w,'/app.js');await wait(3700);
   L.say(o.settled&&o.v&&o.v.body==='cached'&&o.ms>=2900&&o.ms<=3600,'TC-R222p a network that never answers: the cached app.js is served at '+(o.settled?o.ms+' ms':'never (still waiting at 3700 ms)'),{settled:o.settled,ms:o.ms,body:o.v&&o.v.body});}
  {const w=load(()=>wait(100).then(()=>res('fresh')),{[ORIGIN+'/app.js']:res('cached')});const o=drive(w,'/app.js');await wait(600);
   L.say(o.settled&&o.v&&o.v.body==='fresh'&&o.ms<600&&w.puts.includes(ORIGIN+'/app.js'),'TC-R222q a network that answers in 100 ms: its answer is served at '+o.ms+' ms and the cache is refreshed',{body:o.v&&o.v.body,ms:o.ms,puts:w.puts});}
  {const w=load(()=>Promise.reject(new TypeError('Failed to fetch')),{[ORIGIN+'/app.js']:res('cached')});const o=drive(w,'/app.js');await wait(300);
   L.say(o.settled&&o.v&&o.v.body==='cached'&&o.ms<300,'TC-R222r a network that fails at once: the cached copy is served at '+(o.settled?o.ms+' ms':'never'),{body:o.v&&o.v.body,ms:o.ms});}
  {let answer;const w=load(()=>new Promise(r=>{answer=r;}),{});const o=drive(w,'/app.js');await wait(3600);const early=o.settled;answer(res('late'));await wait(100);
   L.say(!early&&o.settled&&o.v&&o.v.body==='late','TC-R222s a never-answering network with nothing cached serves nothing at 3.6 s (no empty answer) and then the late network answer',{early,body:o.v&&o.v.body});}
  {const w=load(()=>new Promise(()=>{}),{});const ev={request:{method:'GET',url:'https://firestore.googleapis.com/x',mode:'cors'},respondWith:()=>{ev.called=true;},waitUntil:()=>{}};w.listeners.fetch(ev);
   L.say(!ev.called,'TC-R222t a cross-origin request is left to the network (respondWith not called)',{called:!!ev.called});}
  L.done();
})().catch(e=>{L.say(false,'harness threw: '+String(e&&e.stack||e).slice(0,300));L.done();});
