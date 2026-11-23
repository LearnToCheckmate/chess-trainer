'use strict';
// gates/regress/147-speed-with-his-data.js - REVIEW, THE DRILL AND HOME STAY FAST WITH HIS DATA ON A SLOW PHONE. US-R155 / TC-R223a..d.
//
// WHY [#550, run-answers build__1794388896663-hold-landing, THE SPEED CHECK; docs/speed-check-2026-11-12 SPD-01..03, three regressions of
// this batch to be fixed before landing]: with his data (465 reviewed games whose stored tallies predate GRADE_VER 13, 60 drill cards, 12
// brilliant moves) entering Review froze ~83 s on a 4x-throttled phone (main 0.5 s), the drill took 4.8 s to open and 2.0 s per Next card
// (main 0.42 / 0.06), and Home took 2.9 s to start (main 0.3 to 0.8).
// WHAT IT READS: the bundle under test (CT_APP) at kunal761 with the page's CPU throttled 4x through CDP (Emulation.setCPUThrottlingRate),
// seeded with that data shape: 465 stored games under one account (one PGN, distinct dates, so distinct keys) with a 'review' tally of grade
// version 1 each, one unrelated eval-cache entry (so the cache is NOT empty and the regrade scan does run), 60 playable drill cards (generated
// puzzle positions read from chess.jsx's own PZGEN_RAW, each marked re-graded so the Home pass leaves them) and 12 brilliant moves. Timing is
// read in the page: tap to the thing on screen, and the longest main-thread task (PerformanceObserver 'longtask') in that window.
// WHAT IT ASSERTS SINCE #553 [batch 14, jobs/gate-147-speed-is-red-at-its-limits-on-both-builds-make-it-compare-new-against-old-2026-11-21]:
// NEW AGAINST OLD, NOT AGAINST A FIXED LIMIT. The bundle under test and origin/main's app.js are timed in one process, interleaved
// (one warm-up each, discarded, then N=5 blocks alternating new-old / old-new), and each of (a) the Review list on screen after the tap,
// (a) the longest task in the 3 s after, (b) the drill open, (c) Next card (median of 5 per session) and (d) Home up after navigation is
// red only when the new is CLEARLY slower: the median paired difference above a floor AND the median ratio above a ratio (RULE below),
// or the new above an absolute catastrophe ceiling, or any reading 0. CT_G147_GEO picks the geometry (default kunal761; se is 320x568),
// CT_G147_N the blocks, CT_G147_REF a reference bundle path, CT_G147_SELF=1 the bundle against itself.
// WHY: at #552 the fixed limits below sat at the edge on BOTH builds (552c and 552f: Home 2030 new / 2073 old at 2000, the longest task
// 557 at 500, Next 111 at 100), so a red measured the machine's load, not the build.
// CALIBRATION, MEASURED #553 on this container (4 cores, other seats running, load 1.6 to 4.1), the same trial bundle against itself
// (CT_G147_SELF=1) three times at kunal761, N=5: ratios Home 1.04/0.95/1.03, Review list 1.05/1.08/0.93, longest task 1.10/1.01/0.85,
// drill 0.93/1.27/0.91, Next 1.02/0.94/1.07; paired median diffs within -105..+120 (Home), -76..-5 (Review), -62..+28 (longest), -47..+69
// (drill), +1..+6 (Next). Each floor is about twice the worst self diff and each ratio sits above the worst self ratio, so noise alone
// does not cross both, and a regression of about 250-400 ms at 4x does.
// RETIRED, NOT DELETED (the job's close condition (4)): the absolute limits Home <= 2000, Review list <= 1000, longest task <= 500, drill
// <= 1000 and Next <= 100 below are history; they now survive only as the catastrophe ceilings 8000/5000/5000/5000/1000.
// THE BARS ARE CALIBRATED ON THIS INSTRUMENT, NOT COPIED FROM THE CHECKER'S (CLAUDE.md, 'a threshold belongs to the instrument'): this gate's
// stopwatch polls the DOM from node, so it reads main's own #549 bundle (3ab724514641) at Home 1623 ms, Review list 571 ms (longest task 322)
// and drill 516 ms on this container - the checker's 0.3-0.8 s / 0.5 s / 0.42 s on its profile. Each bar sits above main's reading here and
// far below the regression's.
// CONTROL-RECORD: c8fd052 2026-11-15 total=8 red=2 scope=trial:ad820f8bdd63 how=#550 lead: the bundle before 90866c7 (q45's games box re-rendering the app), measured in three sessions - both TC-R223a lines red on their medians (Review list 1094 ms, longest task 984), Home green
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=7 red=4 scope=trial:fb5726af how=#550 the tree before the SPD fixes (t152): Home 3422 ms (TC-R223d), a 60307 ms task after entering Review (TC-R223a), the drill 2566 ms (TC-R223b), Next 1165 ms median (TC-R223c); on t153 7f6c50f2: Home 1864, Review 764 (longest task 443), drill 598, Next 53 - 7/0
// LOAD SENSITIVITY, MEASURED: with two other gate runs on the machine (load average 6) the same two bundles read Home at 2090-2330 ms in
// alternation, so TC-R223d reads honestly only on a quiet machine - which is how the suite runs it (one suite, nothing else).
// KNOW ITS LIMIT: a headless Chromium on this container, throttled - not his phone; network not throttled (SPD-04/05 are download findings).
const L=require('../lib');const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','..','chess.jsx'),'utf8');const _i=src.indexOf('const PZGEN_RAW=');
const RAW=JSON.parse(src.slice(_i+16,src.indexOf('\n',_i)).replace(/;\s*$/,''));
const E=require('../engine-extract');
const PGN=(d)=>'[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "'+d+'"]\n[White "Kunal2023"]\n[Black "Opp"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
function seed(){
  const games=[],stats={};const t0=1760000000000;
  for(let i=0;i<465;i++){const date=t0+i*3600000;const g={src:'cc',acct:'kunal2023',pgn:PGN('2025.10.01'),white:'Kunal2023',black:'Opp',wr:'win',tc:'blitz',date};games.push(g);
    stats['cc:'+date+':Kunal2023:Opp']={src:'review',bril:0,great:1,inacc:2,mist:1,blun:0,acc:80};}
  const cards=[];for(const r of RAW){if(cards.length>=60)break;try{const g=E.fromFEN(r.f);const m=E.findMoveBySAN(g,r.s[0]);if(!m)continue;
    const uci='abcdefgh'[m.fc]+(8-m.fr)+'abcdefgh'[m.tc]+(8-m.tr);cards.push({fen:r.f,uci,label:'Blunder',played:'??',ts:1791000000000+cards.length,last:null,wc:{g:'Blunder',drop:30}});}catch(e){}}
  const brils=cards.slice(0,12).map((c,i)=>({...c,label:'Brilliant',ts:1792000000000+i}));
  return {ct_accts:['cc:kunal2023'],ct_acctgames:{'cc:kunal2023':games},ct_gamestats:stats,ct_evalcache:{'h-unrelated':{a:[]}},ct_mymistakes:cards,ct_mybrilliancies:brils,ct_bril_reset_v1:'1',ct_pool:'3'};
}
const watch=(b)=>b.page.evaluate(()=>{window.__lt=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt=Math.max(window.__lt,e.duration);}).observe({type:'longtask'});}catch(e){}});
// THE REFERENCE BUNDLE: origin/main's app.js (git show), or CT_G147_REF=<path>; CT_G147_SELF=1 times the bundle under test against
// ITSELF (the control that must stay green). A reference that cannot be had is a red, never a quiet pass at absolute limits.
function refBundle(){
  if(process.env.CT_G147_SELF==='1')return {path:path.resolve(process.env.CT_APP||path.join(L.ROOT,'app.js')),how:'the bundle under test itself (CT_G147_SELF=1)'};
  if(process.env.CT_G147_REF)return {path:path.resolve(process.env.CT_G147_REF),how:'CT_G147_REF'};
  try{const buf=require('child_process').execFileSync('git',['show','origin/main:app.js'],{cwd:L.ROOT,maxBuffer:64<<20});
    const f=path.join(require('os').tmpdir(),'ct147-ref-'+process.pid+'.js');fs.writeFileSync(f,buf);return {path:f,how:'git show origin/main:app.js',tmp:true};}
  catch(e){return {path:null,how:'git show origin/main:app.js FAILED: '+String(e.message||e).split('\n')[0]};}
}
const md5=(f)=>require('crypto').createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0,12);
const median=(a)=>{const x=a.slice().sort((p,q)=>p-q);if(!x.length)return 0;const m=x.length>>1;return x.length%2?x[m]:Math.round((x[m-1]+x[m])/2);};
// ONE SESSION: a fresh browser on one bundle, CPU 4x, his data; Home, the Review list and its longest task, the drill, Next card x5.
async function session(app,geo,S,name){
  const b=await L.launch({geo,name,store:S,app});
  try{
    const cdp=await b.page.context().newCDPSession(b.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const tNav=Date.now();await b.open();
    let home=0;for(let i=0;i<240;i++){const ok=await b.page.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.children.length===0&&d.textContent.trim()==='Review'&&d.getBoundingClientRect().width>0));if(ok){home=Date.now()-tNav;break;}await b.page.waitForTimeout(50);}
    await b.settle(1500);
    await watch(b);
    const tR=Date.now();await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent.trim()==='Review'&&d.getBoundingClientRect().width>0);let x=e;while(x&&x.tagName!=='BUTTON')x=x.parentElement;if(x||e)(x||e).click();});
    let rv=0;for(let i=0;i<800;i++){const ok=await b.page.evaluate(()=>document.querySelectorAll('[data-ct="game-row"]').length>0);if(ok){rv=Date.now()-tR;break;}await b.page.waitForTimeout(25);}
    await b.page.waitForTimeout(3000);const lt=await b.page.evaluate(()=>Math.round(window.__lt||0));
    await watch(b);
    const tD=Date.now();let okD=true;try{await b.tapText(/find the move you missed/,{wait:0});}catch(e){okD=false;}
    let dr=0;for(let i=0;i<800&&okD;i++){const ok=await b.page.evaluate(()=>!!document.querySelector('[data-ct="pz-top"]')&&/you played/.test(document.querySelector('[data-ct="pz-top"]').innerText));if(ok){dr=Date.now()-tD;break;}await b.page.waitForTimeout(25);}
    const nx=[];for(let k=0;k<5&&dr>0;k++){const before=await b.page.evaluate(()=>(document.querySelector('[data-ct="drill-counter"]')||{}).innerText||'');const t=Date.now();
      await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Next/.test(e.getAttribute('aria-label')||e.innerText||'')&&e.getBoundingClientRect().width>0&&!e.disabled);if(x)x.click();});
      let d=0;for(let i=0;i<400;i++){const now=await b.page.evaluate(()=>(document.querySelector('[data-ct="drill-counter"]')||{}).innerText||'');if(now&&now!==before){d=Date.now()-t;break;}await b.page.waitForTimeout(10);}nx.push(d);}
    const nxm=(nx.length===5&&nx.every(x=>x>0))?median(nx):0;
    return {home,rv,lt,dr,nx:nxm,errs:b.errs.slice(0,3)};
  }finally{await b.close();}
}
// THE RULE [batch 14, jobs/gate-147-speed-is-red-at-its-limits-on-both-builds-make-it-compare-new-against-old-2026-11-21; Kunal, 21 Nov
// 2026: "make test 147 trustworthy first in batch 14" - the new and old builds timed side by side, red only when the new is clearly
// slower]. The bundle under test (NEW) and the reference (OLD, origin/main's app.js) are measured in ONE process, in N blocks of one
// session each, the order alternating new-old / old-new so a machine that slows down over the run slows both. A line is red only when
// BOTH (i) the median of the N paired differences (new minus old, each pair adjacent in time) is above the floor, AND (ii) the new
// median is above the old median by the ratio. Floors and ratios come from the SAME-BUNDLE spread measured here (CT_G147_SELF=1; see
// CALIBRATION in the header). A CEILING per line stays as the catastrophe bar (the ~83 s Review freeze class), far above any honest
// reading. A reading of 0 (the thing never appeared) on either bundle is red: a missing denominator is never credited.
const RULE={
  home:{id:'TC-R223d',what:'Home is up after navigation',floor:400,ratio:1.25,ceil:8000},
  rv:{id:'TC-R223a',what:'the Review list is on screen after the tap',floor:250,ratio:1.30,ceil:5000},
  lt:{id:'TC-R223a',what:'the longest single task in the 3 s after the Review tap',floor:250,ratio:1.40,ceil:5000},
  dr:{id:'TC-R223b',what:'the drill opens after the tap',floor:250,ratio:1.30,ceil:5000},
  nx:{id:'TC-R223c',what:'Next card answers (median of 5 per session)',floor:60,ratio:1.60,ceil:1000},
};
L.run(async()=>{
  const S=seed();
  const GEO=process.env.CT_G147_GEO||'kunal761';const N=Math.max(3,parseInt(process.env.CT_G147_N||'5',10)||5);
  const lab=(L.GEOS[GEO]||{}).label||GEO;
  L.say(S.ct_mymistakes.length===60&&S.ct_acctgames['cc:kunal2023'].length===465,'TC-R223 PRECONDITION his data shape is seeded: 465 stored games of grade version 1, 60 playable drill cards, 12 brilliant moves ('+S.ct_mymistakes.length+' cards)',{cards:S.ct_mymistakes.length});
  const NEWP=path.resolve(process.env.CT_APP||path.join(L.ROOT,'app.js'));const REF=refBundle();const refOk=!!REF.path&&fs.existsSync(REF.path);
  L.say(refOk,'TC-R223 PRECONDITION a reference bundle to time against: '+REF.how+(refOk?' md5 '+md5(REF.path):''),{new:fs.existsSync(NEWP)?md5(NEWP):null});
  if(!refOk)return;
  L.note('NEW '+NEWP+' md5 '+md5(NEWP)+'  against OLD md5 '+md5(REF.path)+' ('+REF.how+'), '+lab+', '+N+' blocks, CPU 4x');
  // one warm-up session per bundle, discarded: the first browser of a process pays cold caches the later ones do not
  for(const [tag,app] of [['old',REF.path],['new',NEWP]]){const w=await session(app,GEO,S,'speed147-warm-'+tag);L.note('warm-up '+tag+' (discarded): '+JSON.stringify(w));}
  const A={new:[],old:[]};const errs=[];
  for(let i=0;i<N;i++){
    const order=i%2===0?['new','old']:['old','new'];
    for(const tag of order){const r=await session(tag==='new'?NEWP:REF.path,GEO,S,'speed147-'+tag+'-'+i);A[tag].push(r);if(tag==='new')errs.push(...r.errs);
      L.note('block '+(i+1)+' of '+N+' '+tag+': Home '+r.home+' ms, Review list '+r.rv+' ms, longest task '+r.lt+' ms, drill '+r.dr+' ms, Next '+r.nx+' ms (4x)');}
  }
  if(REF.tmp)try{fs.unlinkSync(REF.path);}catch(e){}
  const vs=REF.how.startsWith('git')?'main':'the reference';
  for(const k of Object.keys(RULE)){const R=RULE[k];
    const nv=A.new.map(r=>r[k]),ov=A.old.map(r=>r[k]);const allN=nv.every(v=>v>0),allO=ov.every(v=>v>0);
    const mn=median(nv),mo=median(ov);const dmed=median(nv.map((v,i)=>v-ov[i]));const ratio=mo>0?mn/mo:0;
    const slower=dmed>R.floor&&ratio>R.ratio;
    L.say(allN&&allO&&!slower&&mn<=R.ceil,R.id+' '+lab+': '+R.what+' is not clearly slower than '+vs+' at 4x (new median '+mn+' ms vs old '+mo+' ms, ratio '+ratio.toFixed(2)+', paired median diff '+dmed+' ms; red when the diff > '+R.floor+' ms AND the ratio > '+R.ratio+', or new > '+R.ceil+' ms, or any reading 0; new '+nv.join(',')+' / old '+ov.join(',')+')',{k,new:nv,old:ov,ratio:+ratio.toFixed(3),dmed});
  }
  L.say(errs.length===0,'TC-R223 '+lab+' zero app errors on the bundle under test',errs.slice(0,3));
},'147-speed-with-his-data');
// SELECTOR-OPENED: drill-counter reading=presence round 2: a renamed hook never changes, so the time is 0 and TC-R223c is red
