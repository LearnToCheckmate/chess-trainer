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
// WHAT IT ASSERTS: (a) Review list on screen within 1000 ms of the tap and no single task over 500 ms for 3 s after; (b) the drill opens
// within 1000 ms; (c) Next card under 100 ms median of 5 (the job's bar); (d) Home mounted within 2000 ms of navigation.
// THE BARS ARE CALIBRATED ON THIS INSTRUMENT, NOT COPIED FROM THE CHECKER'S (CLAUDE.md, 'a threshold belongs to the instrument'): this gate's
// stopwatch polls the DOM from node, so it reads main's own #549 bundle (3ab724514641) at Home 1623 ms, Review list 571 ms (longest task 322)
// and drill 516 ms on this container - the checker's 0.3-0.8 s / 0.5 s / 0.42 s on its profile. Each bar sits above main's reading here and
// far below the regression's.
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
L.run(async()=>{
  const S=seed();
  L.say(S.ct_mymistakes.length===60&&S.ct_acctgames['cc:kunal2023'].length===465,'TC-R223 PRECONDITION his data shape is seeded: 465 stored games of grade version 1, 60 playable drill cards, 12 brilliant moves ('+S.ct_mymistakes.length+' cards)',{cards:S.ct_mymistakes.length});
  /* #550 lead, the landing's second final suite: on this container one sample of Home and of the Review list's longest task swings by
     about 200 ms on the same bundle (measured alone: Home 1824 to 2137, longest 357 to 656), so a single reading near the line is a coin
     flip. Home and the Review list are now measured in THREE fresh sessions and the MEDIAN is asserted; the limits are unchanged. The
     control is the bundle before 90866c7 (ad820f8bdd63, longest 819 to 1001 on every reading), which the median still fails. */
  const H=[],RV=[],LT=[];let b=null;
  for(let run=0;run<3;run++){
    if(b)await b.close();
    b=await L.launch({geo:'kunal761',name:'speed147-'+run,store:S});
    const cdp=await b.page.context().newCDPSession(b.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const tNav=Date.now();await b.open();
    let home=0;for(let i=0;i<120;i++){const ok=await b.page.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.children.length===0&&d.textContent.trim()==='Review'&&d.getBoundingClientRect().width>0));if(ok){home=Date.now()-tNav;break;}await b.page.waitForTimeout(50);}
    await b.settle(1500);
    await watch(b);
    const tR=Date.now();await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent.trim()==='Review'&&d.getBoundingClientRect().width>0);let x=e;while(x&&x.tagName!=='BUTTON')x=x.parentElement;(x||e).click();});
    let rv=0;for(let i=0;i<400;i++){const ok=await b.page.evaluate(()=>document.querySelectorAll('[data-ct="game-row"]').length>0);if(ok){rv=Date.now()-tR;break;}await b.page.waitForTimeout(25);}
    await b.page.waitForTimeout(3000);const ltR=await b.page.evaluate(()=>Math.round(window.__lt||0));
    H.push(home);RV.push(rv);LT.push(ltR);
    L.note('session '+(run+1)+' of 3: Home '+home+' ms, Review list '+rv+' ms, longest task '+ltR+' ms (4x)');
  }
  const mid=(a)=>a.slice().sort((x,y)=>x-y)[1];
  const home=mid(H),rv=mid(RV),ltR=mid(LT);
  L.say(H.every(x=>x>0)&&home<=2000,'TC-R223d Home is up within 2000 ms with his data at 4x (median of 3: '+home+' ms; '+H.join(', ')+'; it was 2.9 s, main 0.3 to 0.8 s)',H);
  L.say(RV.every(x=>x>0)&&rv<=1000,'TC-R223a the Review list is on screen within 1000 ms of the tap at 4x (median of 3: '+rv+' ms; '+RV.join(', ')+'; it was ~83 s)',RV);
  L.say(RV.every(x=>x>0)&&ltR<=500,'TC-R223a and no single task blocks the page for more than 500 ms in the 3 s after (median of 3: longest '+ltR+' ms; '+LT.join(', ')+')',LT);
  // (b) the drill
  await watch(b);
  const tD=Date.now();let okD=true;try{await b.tapText(/find the move you missed/,{wait:0});}catch(e){okD=false;}
  let dr=0;for(let i=0;i<400&&okD;i++){const ok=await b.page.evaluate(()=>!!document.querySelector('[data-ct="pz-top"]')&&/you played/.test(document.querySelector('[data-ct="pz-top"]').innerText));if(ok){dr=Date.now()-tD;break;}await b.page.waitForTimeout(25);}
  L.say(dr>0&&dr<=1000,'TC-R223b the drill opens within 1000 ms at 4x ('+dr+' ms; it was 4.8 s, main 0.42 s)',dr);
  // (c) Next card x5
  const nx=[];for(let k=0;k<5&&dr>0;k++){const before=await b.page.evaluate(()=>(document.querySelector('[data-ct="drill-counter"]')||{}).innerText||'');const t=Date.now();
    await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Next/.test(e.getAttribute('aria-label')||e.innerText||'')&&e.getBoundingClientRect().width>0&&!e.disabled);if(x)x.click();});
    let d=0;for(let i=0;i<200;i++){const now=await b.page.evaluate(()=>(document.querySelector('[data-ct="drill-counter"]')||{}).innerText||'');if(now&&now!==before){d=Date.now()-t;break;}await b.page.waitForTimeout(10);}nx.push(d);}
  const med=nx.slice().sort((a,c)=>a-c)[2];
  L.say(nx.length===5&&nx.every(x=>x>0)&&med<=100,'TC-R223c Next card answers in under 100 ms (median of 5 at 4x: '+med+' ms; '+nx.join(', ')+'; it was 2.0 s, main 0.06 s)',nx);
  L.say(b.errs.length===0,'TC-R223 zero app errors',b.errs.slice(0,3));await b.close();
},'147-speed-with-his-data');
// SELECTOR-OPENED: drill-counter reading=presence round 2: a renamed hook never changes, so the time is 0 and TC-R223c is red
