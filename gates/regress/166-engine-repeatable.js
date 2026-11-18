'use strict';
// gates/regress/166-engine-repeatable.js - UNDER TEST THE ENGINE PLAYS THE SAME LINE EVERY TIME; ON A REAL DEVICE IT IS UNCHANGED.
// TC-R228a..f / US-R158. #551 batch 12, jobs/the-engine-plays-the-same-line-every-time-under-test-2026-11-15.
//
// WHY. On one build the engine's line differed between runs: on 15 Nov 2026 gate 21 read 14.Bxe7 Kxe7 15.Bxd7 at the Opera Game's
// ply 25, a legal line its list did not have, and the archived logs show the king recapture nine times. The app's line searches were
// cut by a wall clock ('go movetime 700'), so a busy machine searched less deeply than a quiet one and chose differently. Under test
// (localStorage ct_engdet = '1', which gates/lib.js now seeds on every launch) a timed search is a node-count search on a cleared
// table (chess.jsx, search engDetSearch). This gate proves the two halves of the job's close condition:
//   TC-R228a  real play keeps its normal settings: launched as a device runs it (L.launch engDet:false), the analysis worker is sent
//              'go movetime' and never 'go nodes', and ct_engdet is not set.
//   TC-R228b  under test the same review sends 'go nodes' (never 'go movetime') and clears the table before each line search.
//   TC-R228c  the same position searched in FIVE fresh browsers on a quiet machine gives the same principal variation every time,
//   TC-R228d  and in FIVE more with the machine kept busy beside it (one node process spinning per core, so the search is slowed
//              far more than the one busy core of the overnight runs): the same line again, equal to the quiet one.
//   TC-R228e  and what the player reads is the same: the ply-25 sentence on the review is byte-identical in all ten runs.
// The position is the Opera Game's 13.Rxd7 (ply 25), the ply whose refutation line varied, reached by the review drive. Every timed
// search the worker answered is recorded through a wrapper on window.Worker (installed before the app loads), keyed by FEN, so the
// assertions read the engine's own answers and not the sentence alone.
// CT_G166_RUNS=<n> changes the five (for a quick look); the suite runs five.
const L=require('../lib');const RV=require('../drive/review');const cp=require('child_process');const os=require('os');
const RUNS=Math.max(2,parseInt(process.env.CT_G166_RUNS||'5',10));
const REC=()=>{const W=window.Worker;if(!W||window.__engRec)return;const all=window.__engRec=[];
  window.Worker=function(u,o){const w=new W(u,o);const rec={url:String(u),searches:[],cur:null,cleared:false,fen:null};all.push(rec);const pm=w.postMessage.bind(w);
    w.postMessage=function(m){try{const s=String(m);if(s==='ucinewgame')rec.cleared=true;else if(s.indexOf('position fen ')===0)rec.fen=s.slice(13);
      else if(s.indexOf('go ')===0){rec.cur={go:s,fen:rec.fen,cleared:rec.cleared,pv:null,best:null};rec.cleared=false;}}catch(e){}return pm(m);};
    w.addEventListener('message',e=>{try{const s=String(e.data);const c=rec.cur;if(!c)return;
      if(/ pv /.test(s)&&!/ multipv [2-9]/.test(s))c.pv=s.split(' pv ')[1];
      else if(s.indexOf('bestmove')===0){c.best=s.split(' ')[1];rec.searches.push(c);rec.cur=null;}}catch(e){}});
    return w;};window.Worker.prototype=W.prototype;};
const whyFull=async(x)=>{try{return await x.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]')||document.querySelector('[data-ct="rev-why"]');if(!e)return '';
  const t=(e.innerText||'').replace(/\s+/g,' ').trim(),m=(e.getAttribute('data-more')||'').trim();return (t&&t!==' '?t:'')+(m?(' '+m):'');});}catch(e){return '';}};
async function oneRun(name,opts){
  const b=await L.launch(Object.assign({geo:'kunal761',name,store:{ct_pool:'3'}},opts||{}));await b.ctx.addInitScript(REC);await b.open();
  let ok=true;try{await RV.ensureReview(b,'opera');await RV.startReview(b);await RV.goPly(b,25);await b.settle(2500);}catch(e){ok=false;}
  const head=ok?await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-move-line"]');return e?(e.innerText||'').split('\n')[0]:'';}):'';
  const why=ok?await whyFull(b):'';
  const eng=await b.page.evaluate(()=>(window.__engRec||[]).map(r=>({url:r.url,searches:r.searches})));
  const det=await b.page.evaluate(()=>{try{return localStorage.getItem('ct_engdet');}catch(e){return 'unreadable';}});
  await b.close();return {ok,head,why,eng,det};
}
const timed=r=>{const out=[];for(const w of r.eng)for(const s of w.searches)if(!/^go depth /.test(s.go)||/movetime/.test(s.go))out.push(s);return out;};
const gos=r=>{const out=[];for(const w of r.eng)for(const s of w.searches)out.push(s.go);return out;};
L.run(async()=>{
  // ── TC-R228f: THE ONE PLACE A TIMED SEARCH IS WRITTEN, ON chess.jsx ITSELF (gates/engine-extract.js; control CT_SRC) ─────────
  {const E=require('../engine-extract');L.note('    chess.jsx read by engine-extract: md5 '+E.SOURCE_MD5);
   const had=Object.prototype.hasOwnProperty.call(globalThis,'localStorage'),prev=globalThis.localStorage;
   try{delete globalThis.localStorage;}catch(e){}const off=E.engDetSearch(700);
   globalThis.localStorage={getItem:k=>k==='ct_engdet'?'0':null};const zero=E.engDetSearch(700);
   globalThis.localStorage={getItem:k=>k==='ct_engdet'?'1':null};const on=E.engDetSearch(700),on300=E.engDetSearch(300),det=E.engDet();
   if(had)globalThis.localStorage=prev;else delete globalThis.localStorage;
   L.say(off==='go movetime 700'&&zero==='go movetime 700','TC-R228f with no ct_engdet (or any value but 1) a timed search is the clock it always was: '+JSON.stringify([off,zero]),{off,zero});
   L.say(det===true&&on==='go nodes '+(700*E.ENGDET_NODES_PER_MS)&&on300==='go nodes '+(300*E.ENGDET_NODES_PER_MS),'TC-R228f with ct_engdet = 1 the same search is a node count, '+E.ENGDET_NODES_PER_MS+' a millisecond: '+JSON.stringify([on,on300]),{on,on300});}
  // ── TC-R228a: REAL PLAY, UNCHANGED ──────────────────────────────────────────────────────────────────────────────────────
  const real=await oneRun('engine-real',{engDet:false});
  const rg=gos(real);const rMt=rg.filter(g=>/^go movetime \d+$/.test(g)).length,rNd=rg.filter(g=>/^go nodes /.test(g)).length;
  L.say(real.ok&&/Rxd7/.test(real.head),'TC-R228a PRECONDITION the real-device run reached the Opera Game ply 25, 13.Rxd7',{head:real.head});
  L.say(real.det===null,'TC-R228a a real device has no ct_engdet: it reads '+JSON.stringify(real.det),real.det);
  L.say(rMt>0&&rNd===0,'TC-R228a real play keeps its normal settings: the engine was sent '+rMt+" 'go movetime' searches and "+rNd+" 'go nodes' (it must be at least one and zero)",{gos:rg.slice(0,12)});
  // ── TC-R228b..05: UNDER TEST ────────────────────────────────────────────────────────────────────────────────────────────
  const runs=[];for(let k=0;k<RUNS;k++)runs.push(Object.assign({arm:'quiet',k:k+1},await oneRun('engine-quiet-'+(k+1))));
  const ncpu=Math.max(1,os.cpus().length);const spin=[];for(let i=0;i<ncpu;i++)spin.push(cp.spawn(process.execPath,['-e','for(;;){}'],{stdio:'ignore'}));
  L.note('    busy arm: '+ncpu+' spinning node processes beside the browser (one per core)');
  try{for(let k=0;k<RUNS;k++)runs.push(Object.assign({arm:'busy',k:k+1},await oneRun('engine-busy-'+(k+1))));}finally{spin.forEach(p=>{try{p.kill('SIGKILL');}catch(e){}});}
  const reached=runs.filter(r=>r.ok&&/Rxd7/.test(r.head));
  L.say(reached.length===runs.length,'TC-R228b PRECONDITION every test run ('+runs.length+') reached ply 25, 13.Rxd7: '+reached.length,{heads:runs.map(r=>r.head)});
  const tNd=runs.map(r=>gos(r).filter(g=>/^go nodes \d+$/.test(g)).length),tMt=runs.map(r=>gos(r).filter(g=>/movetime/.test(g)).length);
  L.say(tNd.every(n=>n>0)&&tMt.every(n=>n===0),"TC-R228b under test every run sent 'go nodes' searches ("+tNd.join(',')+") and no search with a clock ("+tMt.join(',')+')',{nodes:tNd,movetime:tMt});
  // the analysis worker is the one that answers 'go nodes' line searches; each of them must have had the table cleared before it
  const unclear=runs.map(r=>timed(r).filter(s=>/^go nodes /.test(s.go)&&!s.cleared).length);
  L.say(unclear.every(n=>n===0),'TC-R228b and every node-count search had its table cleared first (searches without a ucinewgame before them, per run: '+unclear.join(',')+')',{unclear});
  // the ply-25 refutation search: the FEN searched with 'go nodes' whose answered line starts with the bishop taking on e7 (g5e7)
  // every timed search, whatever its command: under test they are all 'go nodes' (TC-R228b), and on a copy that keeps the clock the
  // same comparison is what shows the lines drifting, rather than finding nothing to compare
  const byFen=runs.map(r=>{const m={};for(const s of timed(r))if(s.fen){(m[s.fen]=m[s.fen]||[]).push((s.pv||s.best||'').trim());}return m;});
  const common=Object.keys(byFen[0]||{}).filter(f=>byFen.every(m=>m[f]));
  const target=common.find(f=>byFen[0][f].some(pv=>/^g5e7\b/.test(pv)));
  L.say(!!target,'TC-R228c PRECONDITION the refutation search of ply 25 (a timed search answered with g5e7, Bxe7) was found in all '+runs.length+' runs; '+common.length+' positions were searched in every run',{target,common:common.length});
  const quiet=runs.filter(r=>r.arm==='quiet'),busy=runs.filter(r=>r.arm==='busy');
  const lineOf=(r)=>{const m=byFen[runs.indexOf(r)];return target&&m[target]?m[target][m[target].length-1]:null;};
  const ql=quiet.map(lineOf),bl=busy.map(lineOf);
  L.say(!!target&&ql.every(x=>x&&x===ql[0]),'TC-R228c quiet machine: the same position searched in '+quiet.length+' fresh browsers gives the same line every time ('+(ql[0]||'').split(' ').slice(0,6).join(' ')+' ...; '+new Set(ql).size+' distinct)',{lines:ql.map(x=>(x||'').split(' ').slice(0,8).join(' '))});
  L.say(!!target&&bl.every(x=>x&&x===ql[0]),'TC-R228d busy machine ('+ncpu+' cores spinning): the same line again in all '+busy.length+', equal to the quiet one ('+new Set(bl).size+' distinct; equal to quiet: '+bl.filter(x=>x===ql[0]).length+')',{lines:bl.map(x=>(x||'').split(' ').slice(0,8).join(' '))});
  // every position searched in every run, not only ply 25: the whole set of answers is one function of the position
  const diverge=common.filter(f=>new Set(byFen.map(m=>m[f][m[f].length-1])).size>1);
  L.say(common.length>0&&diverge.length===0,'TC-R228d and every one of the '+common.length+' positions given a timed search in all '+runs.length+' runs got one answer ('+diverge.length+' differ)',{diverge:diverge.slice(0,3)});
  const whys=runs.map(r=>r.why);
  L.say(/If \.\.\.Nxd7, 14\.Bxe7/.test(whys[0]||''),'TC-R228e PRECONDITION the ply-25 sentence carries its refutation: '+JSON.stringify((whys[0]||'').slice(0,90)),{why:whys[0]});
  L.say(whys.every(w=>w===whys[0]),'TC-R228e what the player reads is the same: the ply-25 sentence is byte-identical in all '+runs.length+' runs ('+new Set(whys).size+' distinct)',{distinct:[...new Set(whys)].map(w=>w.slice(0,120))});
  L.say(runs.every(r=>r.det==='1'),'TC-R228b every test run had ct_engdet = 1 seeded by the harness',runs.map(r=>r.det));
},'166-engine-repeatable');
