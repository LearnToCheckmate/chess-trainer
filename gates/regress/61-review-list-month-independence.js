// regress/61-review-list-month-independence.js
// GUARDS: US-R25 - "The Review list offers every game the connected account has, bounded only by a limit the
// app states on screen, AND THE NUMBER OF GAMES IT CAN SHOW NEVER DEPENDS ON WHICH MONTH IT IS."
// IMPLEMENTS: TC-R35 (i), (ii), (iii) plus one assertion TC-R35 implies and does not name (A5, persistence).
// JOB: jobs/review-list-caps-at-about-40-games-2026-09-23, from Kunal, 2026-09-23: "Why are there only 47
// games in review. There should be thousands." Gates PHASE ONE only (walk the archives index backwards until
// N games or K months; raise ACCT_GMAX to match). Phase two - the compact-row storage change - is NOT gated
// here and this gate is deliberately written so that it does not have to be.
//
// THE DEFECT, RE-DERIVED IN THIS RUN RATHER THAN QUOTED (origin/main 90abeba, #427):
//   chess.jsx:3557  const gr=await fetch(archives[archives.length-1]);      <- ONLY the newest month, ever
//   chess.jsx:3558  (grj.games||[]).filter(g=>g.pgn).slice(-20).reverse()   <- 20 of that month
//   chess.jsx:3532  M[id]=rows.slice(0,ACCT_GMAX)   with ACCT_GMAX=40 (chess.jsx:230)
// Measured here, not read: with the archives index stubbed to 24 months, the app issues exactly TWO requests
// per account - the index and archives[23] - so months 0..22 are never asked for at all.
//
// WHY A1/A2 AND NOT "MORE THAN 40 GAMES". A cap is CORRECT on this screen (the public API serves one month
// per request, rows carry full PGNs, localStorage is ~5MB for the whole app), so the defect is the MONTH
// RULE, not the number. A gate asserting only "the list holds more than 40" goes GREEN on a fix that raises
// ACCT_GMAX and leaves the newest-month-only fetch in place - and that fix still shows a player who has not
// played this month an EMPTY Review tab. That exact bundle is built as CAPONLY below, and the gate prints
// the weak form's verdict beside its own on every run so the difference is a measurement, not an argument.
//
// PINNED CONSTANTS AND WHERE THEY COME FROM (a build that changes one of these must revisit this gate):
//   MIN_CAP   200  - the N named in the job's phase one, work[1]. The stated cap may be larger, never smaller.
//   ACCT_SLOTS  8  - ACCT_MAX at chess.jsx:230 as of #427. Used ONLY for the projected-footprint assertion.
//   BUDGET 4,000,000 chars - localStorage is about 5,000,000 UTF-16 chars per origin in Chrome; 4M leaves the
//                  rest of the app its room. A4 measures the real footprint, A4b projects it to a full house.
//   CAP_RE    the shape of the on-screen cap sentence. TC-R35 (ii) requires the cap to be "rendered on screen
//             as text a player can read" and the app states no cap at all today, so this gate PINS A SHAPE
//             rather than guessing one. Anything matching /(?:up to|at most|limit)\s+<number>\s+games/i is
//             accepted; "Showing up to 200 games per account." is the sentence this gate was written against.
//
// FIXTURE (TC-R35's six inputs, built here; NOTHING is fetched from the network - api.chess.com is stubbed
// with ctx.route and lib.js's own BLOCK abort stays in place underneath it [R21]):
//   24 monthly archives, 2024-10 .. 2026-09. Months 2026-04..2026-08 hold 60 games each = 300 "in older
//   months"; months 2024-10..2026-03 hold 0. The newest month (2026-09) is seeded three ways:
//     seed a: 0 games   seed b: 5 games   seed c: 60 games
//   crossed with 1 and 3 connected accounts = SIX inputs. Per-account totals 300 / 305 / 360.
//   THE DISTRIBUTION IS PART OF THE FIXTURE AND IS STATED BECAUSE IT MATTERS: the 300 sit in the five months
//   IMMEDIATELY BEFORE the newest, so a K=6 backward walk reaches them. A thin spread over all 24 months is
//   NOT covered by this gate and phase one would NOT satisfy US-R25 on it - see the notChecked list on the
//   handoff document; that residual is on the job, not in this file.
//   One fixture row is 1209 bytes of PGN. Real chess.com PGNs of a 40-move game run larger, so A4's measured
//   footprint is a LOWER bound on the real one - AND SO IS A4b's PROJECTION, WHICH IS THE CORRECTION THIS
//   HEADER OWED. Until #474 this file said A4b 'is the assertion that carries the budget'; it is not, and it
//   never was: A4b takes bytesPerRow from the run's own fixture and multiplies it by the cap and the slot
//   count, so its expected value and its measured value come from the SAME under-sized row and it is
//   arithmetically obliged to pass [jobs/a4b-bytes-per-row-is-a-fixture-number-2026-09-29,
//   jobs/gate-61-storage-and-cap-assertions-cannot-fail-as-written-2026-09-29]. The budget is carried by
//   A4c, which projects from the pinned CORPUS row sizes below, and the withdrawal of the old claim is
//   stated here rather than quietly dropped [R18].
//
// ── NEGATIVE CONTROLS - see the run record docs/review-list-caps-at-about-40-games-2026-09-23-lane for the
//    bundles, the md5s and the observed pass/fail of each. Summary of what each one proves:
//    NC1 revert the backward walk on the FIX      -> A1, A2 red; A3b stays green (the sentence is still there)
//    NC2 revert ACCT_GMAX 200 -> 40 on the FIX    -> A3a red ALONE; A1 and A2 STAY GREEN. This is the control
//        that proves A2 and A3a are not the same assertion in two shapes.
//    NC3 remove the cap sentence on the FIX       -> A3b red alone
//    NC4 make the acctGames write silently fail   -> A5 red (the quota catch at chess.jsx:232 swallows it, so
//        the list looks right and is gone on the next launch - the exact "silently break the app" TC-R35 (iii)
//        was written to stop)
//    CAPONLY a bundle with the cap raised and the month rule untouched -> A1, A2 red while "rows > 40" is GREEN
'use strict';
const L=require('../lib');

const MIN_CAP=200, ACCT_SLOTS=8, BUDGET=4000000;
// #474 THE CORPUS ROW SIZES, PINNED SO THE PROJECTION STOPS BEING A FIXTURE NUMBER. Provenance, because a
// number with no provenance is the defect this replaces: the seven real chess.com games in
// docs/benchmark-answerkey-7-pgn measure median 2612 chars, mean 2831, max 4670 (measured on #431 by the
// antagonist and re-stated on jobs/gate-61-storage-and-cap-assertions-cannot-fail-as-written-2026-09-29);
// a 40-move (66-ply) blitz game carrying chess.com's real 21-tag header and [%clk] on every move stores at
// 2472.8-2478.8 chars/row (measured on the #433 bundle, jobs/a4b-bytes-per-row-is-a-fixture-number-2026-09-29).
// BREAKEVEN is the arithmetic nobody in this file had done: the budget divided by what it is a budget FOR.
const REAL_ROW_MEDIAN=2612, REAL_ROW_MAX=4670, REAL_ROW_BLITZ=2475;
const BREAKEVEN=Math.floor(BUDGET/(MIN_CAP*ACCT_SLOTS));   // 2500 chars per row at the pinned cap x slots
const CAP_RE=/(?:up to|at most|limit)\s+([\d][\d,]*)\s+games/i;
const NEWEST={y:2026,m:9,label:'Sep'};
const ACCTS=['gateacct1','gateacct2','gateacct3'];
const SEEDN={a:0,b:5,c:60};
const OLDER_MONTHS=[4,5,6,7,8], PER_OLDER=60;           // 2026-04..2026-08, 60 each = 300
const MOVES="1. e4 {[%clk 0:02:59.9]} e5 {[%clk 0:02:59.8]} 2. Nf3 {[%clk 0:02:58.1]} d6 {[%clk 0:02:57.4]} 3. d4 {[%clk 0:02:55.2]} Bg4 {[%clk 0:02:54.6]} 4. dxe5 {[%clk 0:02:51.7]} Bxf3 {[%clk 0:02:50.9]} 5. Qxf3 {[%clk 0:02:49.0]} dxe5 {[%clk 0:02:48.2]} 6. Bc4 {[%clk 0:02:45.5]} Nf6 {[%clk 0:02:44.1]} 7. Qb3 {[%clk 0:02:41.8]} Qe7 {[%clk 0:02:39.6]} 8. Nc3 {[%clk 0:02:37.2]} c6 {[%clk 0:02:35.0]} 9. Bg5 {[%clk 0:02:31.9]} b5 {[%clk 0:02:28.7]} 10. Nxb5 {[%clk 0:02:24.4]} cxb5 {[%clk 0:02:21.2]} 11. Bxb5+ {[%clk 0:02:17.0]} Nbd7 {[%clk 0:02:13.8]} 12. O-O-O {[%clk 0:02:09.1]} Rd8 {[%clk 0:02:04.6]} 13. Rxd7 {[%clk 0:01:59.3]} Rxd7 {[%clk 0:01:54.0]} 14. Rd1 {[%clk 0:01:48.8]} Qe6 {[%clk 0:01:42.1]} 15. Bxd7+ {[%clk 0:01:36.0]} Nxd7 {[%clk 0:01:30.2]} 16. Qb8+ {[%clk 0:01:23.7]} Nxb8 {[%clk 0:01:17.4]} 17. Rd8# {[%clk 0:01:10.9]} 1-0";

// ── the stub. Registered AFTER launch, so it wins over lib.js's BLOCK abort (Playwright matches routes most
//    recently registered first). Nothing leaves the container; `hits` is the vacuity guard's evidence.
function stub(b,state){
  return b.ctx.route(/api\.chess\.com/,async(route)=>{
    const u=route.request().url();state.hits.push(u.replace('https://api.chess.com/pub/player/',''));
    if(state.refuse)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    const who=(u.match(/player\/([^/]+)\//)||[])[1]||'';
    if(/\/games\/archives$/.test(u)){
      // #432 THIN: `state.thin` replaces the concentrated distribution with `months` archives ending at
      // NEWEST, each holding `per` games. The concentrated fixture always stops the walk on GAMES, so it
      // cannot reach the state where ACCT_GMONTHS is what bound - which is exactly why this gate went 42/42
      // green over a build that printed the wrong limit in that state.
      // #433 SPARSE: an index whose entries are NOT contiguous. This is the shape api.chess.com actually
      // returns - it lists only months in which the player HAS games - and every fixture above builds a
      // DENSE run of months, which is why no assertion in this file could see that ACCT_GMONTHS counts
      // entries and not calendar months. The fixture encoded the same assumption as the code.
      if(state.sparse){
        const ar=state.sparse.list.map(([y,m])=>'https://api.chess.com/pub/player/'+who+'/games/'+y+'/'+String(m).padStart(2,'0'));
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:ar})});
      }
      const NM=state.thin?state.thin.months:(state.mixed?state.mixed.months:24);
      const ar=[];for(let i=0;i<NM;i++){const t=new Date(Date.UTC(NEWEST.y,NEWEST.m-1-(NM-1-i),1));ar.push('https://api.chess.com/pub/player/'+who+'/games/'+t.getUTCFullYear()+'/'+String(t.getUTCMonth()+1).padStart(2,'0'));}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:ar})});
    }
    const m=u.match(/games\/(\d{4})\/(\d{2})$/);
    if(!m)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    const y=+m[1],mo=+m[2];
    // #433 ONE month fails while the rest succeed - the 503 antagonist B measured, which the walk's
    // `continue` swallows. state.fail is 'YYYY/MM'.
    if(state.fail&&state.fail===(y+'/'+String(mo).padStart(2,'0')))
      return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    // #433 the OTHER way a listed month yields nothing: 200 with an empty games array. Antagonist A found
    // that the first #433 counted only !ok and a throw, so this path walked on in silence.
    if(state.empty&&state.empty===(y+'/'+String(mo).padStart(2,'0')))
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games:[]})});
    let n=0;
    if(state.mixed)n=(who===state.mixed.thin)?state.mixed.per:state.mixed.busyPer;   // #432 two accounts, two bounds
    else if(state.sparse)n=state.sparse.per;                          // #433 every listed month equally thin
    else if(state.thin)n=state.thin.per;                             // #432 every month equally thin
    else if(y===NEWEST.y&&mo===NEWEST.m)n=SEEDN[state.seed];
    else if(y===2026&&OLDER_MONTHS.indexOf(mo)>=0)n=PER_OLDER;
    const ai=Math.max(0,ACCTS.indexOf(who));
    const games=[];
    for(let i=0;i<n;i++){
      const day=1+(i%27), dd=String(day).padStart(2,'0'), mm=String(mo).padStart(2,'0');
      const opp=who+'_o'+y+mm+'_'+i;                                   // distinct per account AND per month
      const pgn=['[Event "Live Chess"]','[Site "Chess.com"]','[Date "'+y+'.'+mm+'.'+dd+'"]','[Round "-"]','[White "'+who+'"]','[Black "'+opp+'"]','[Result "1-0"]','[TimeControl "180"]','[WhiteElo "'+(1400+i%200)+'"]','[BlackElo "'+(1380+i%200)+'"]','[Termination "'+who+' won by checkmate"]','[ECO "C41"]','[UTCDate "'+y+'.'+mm+'.'+dd+'"]','[UTCTime "12:00:00"]','[StartTime "12:00:00"]','[EndDate "'+y+'.'+mm+'.'+dd+'"]','[EndTime "12:10:00"]','[Link "https://www.chess.com/game/live/'+(y*1e6+mo*1e4+i*4+ai)+'"]','',MOVES,''].join('\n');
      games.push({url:'https://www.chess.com/game/live/'+(y*1e6+mo*1e4+i*4+ai),pgn,white:{username:who,result:'win',rating:1400+i%200},black:{username:opp,result:'checkmated',rating:1380+i%200},time_class:'blitz',rules:'chess',end_time:Math.floor(Date.UTC(y,mo-1,day,12,ai,0)/1000)});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games})});
  });
}

// everything the assertions read, in ONE evaluate, so every number in a row comes from one screen state
async function READ(b){
  return b.page.evaluate((NEW_LABEL)=>{
    const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
    const labels=rows.map(r=>{const m=(r.innerText||'').replace(/\s+/g,' ').match(/·\s([A-Z][a-z]{2})\s(\d{1,2})/);return m?m[1]:null;});
    let bytes=0,keys={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const v=localStorage.getItem(k)||'';bytes+=k.length+v.length;keys[k]=v.length;}
    let stored=0,storedMonths={};try{const M=JSON.parse(localStorage.getItem('ct_acctgames')||'{}');Object.keys(M).forEach(id=>{(M[id]||[]).forEach(g=>{stored++;const d=new Date(g.date||0);storedMonths[d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')]=1;});});}catch(e){}
    const body=(document.body.innerText||'').replace(/\s+/g,' ');
    const sc=document.querySelector('[data-ct="game-row"]')?document.querySelector('[data-ct="game-row"]').parentElement:null;
    return {rows:rows.length, outside:labels.filter(x=>x&&x!==NEW_LABEL).length, inNewest:labels.filter(x=>x===NEW_LABEL).length,
      distinct:[...new Set(labels.filter(Boolean))].sort(), bytes, acctBytes:keys['ct_acctgames']||0, stored,
      storedMonths:Object.keys(storedMonths).sort(), body:body.slice(0,2000),
      err:(()=>{const e=[...document.querySelectorAll('div')].find(d=>/Couldn.t reach Chess\.com/.test(d.innerText||'')&&d.children.length===0);return e?'yes':'no';})(),
      scrollerH:sc?sc.scrollHeight:null, scrollerC:sc?sc.clientHeight:null,
      // #432 the limit line as an ELEMENT, so "no line at all" is a measurement and not the absence of a
      // substring, plus the contrast of it and of the count beside it. Ratio is computed from the COMPOSITED
      // colour: these are white at an alpha over an opaque card, so the alpha is the whole of the defect.
      cap:(()=>{
        // #432 FIND THE LINE BY WHAT IT SAYS, NOT BY THE ATTRIBUTE THIS BUILD ADDED. First draft queried
        // [data-ct="games-cap"] alone and its own negative control caught it: on the #431 bundle that
        // attribute does not exist, so `text` came back null, A7b/A7e went red for a MISSING SELECTOR rather
        // than for the wrong wording, and A7c - "the line does not state a games cap" - went PASS on the one
        // bundle where the screen does exactly that. A check that reads only the thing the fix added cannot
        // see the defect the fix removes. So: the attribute if it is there, else the leaf element whose own
        // text is a limit sentence, so the same instrument measures both bundles.
        // #433 the locator carries BOTH wordings - the calendar one #432 printed and the play-months one
        // #433 prints - plus the gap sentence, so one instrument finds the line on either bundle. A locator
        // that knows only the new wording is the "reads only what the fix added" trap of #432's A7b.
        const LIMIT=/(?:up to|at most|limit)\s+[\d][\d,]*\s+games|last\s*\d+\s*months|months of play|couldn.t be loaded/i;
        const el=document.querySelector('[data-ct="games-cap"]')||
          [...document.querySelectorAll('div,span,p')].find(x=>x.children.length===0&&LIMIT.test((x.textContent||'').trim()));
        const cnt=[...document.querySelectorAll('span')].find(x=>/^\d+ loaded$/.test((x.textContent||'').trim()));
        const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
        const lum=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
        // #432 THE RATIO PRINTS ITS OWN INPUTS, because the first version returned 4.51 where both the
        // antagonist's report and a hand calculation over rgb(26,33,42) said 4.37, and a threshold of 4.5
        // sits between those two numbers. `bg` composites every translucent background-COLOR between the
        // text and the first opaque ancestor, which the first draft skipped by taking the opaque ancestor
        // alone. IT IS A LOWER BOUND ON WHAT IS PAINTED, NOT WHAT IS PAINTED - said here because the first
        // version of this comment claimed the latter and antagonist A disproved it: the first opaque
        // ancestor also carries a backgroundIMAGE (chess.jsx, appBgImg: a skin texture plus a radial glow),
        // and a background-image paints ABOVE the background-color of the same element, so those layers are
        // invisible to this instrument. A computed the worst-case stack at rgb(45.2,57.5,70.6), where white
        // at the old .52 alpha gives 4.44:1 - UNDER AA, while this instrument read 5.36 and passed. The app
        // side is now .60, which clears AA at 5.35:1 even on that worst case, so the assertion is no longer
        // load-bearing on the instrument's blind spot. Compositing background-image properly is
        // jobs/the-contrast-instrument-cannot-see-background-image-2026-09-29.
        const effBg=(node)=>{
          const layers=[];let base=[0,0,0];
          for(let n=node;n&&n!==document.documentElement;n=n.parentElement){
            const m=getComputedStyle(n).backgroundColor.match(/[\d.]+/g);if(!m)continue;
            const a=m.length>3?parseFloat(m[3]):1;
            if(a===0)continue;
            if(a===1){base=[+m[0],+m[1],+m[2]];break;}
            layers.push([+m[0],+m[1],+m[2],a]);
          }
          let c=base;                                    // composite from the BOTTOM up
          for(let i=layers.length-1;i>=0;i--){const l=layers[i];c=[0,1,2].map(k=>l[k]*l[3]+c[k]*(1-l[3]));}
          return {c,base,layers:layers.length};};
        const ratio=(node)=>{if(!node)return null;const f=getComputedStyle(node).color.match(/[\d.]+/g);if(!f)return null;
          const a=f.length>3?parseFloat(f[3]):1, E=effBg(node), bg=E.c;
          const c=[0,1,2].map(i=>+f[i]*a+bg[i]*(1-a));
          const l1=lum(c[0],c[1],c[2]), l2=lum(bg[0],bg[1],bg[2]);
          return {r:Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100,
                  alpha:a, effBg:bg.map(v=>Math.round(v*10)/10), opaqueBase:E.base, translucentLayers:E.layers};};
        // #433 the LINE HEIGHT of the line, so "how many line boxes does this sentence occupy" is a
        // measurement rather than a magic pixel number. h/lh is what A11g reads.
        return {present:!!el, text:el?(el.textContent||'').trim():null, h:el?Math.round(el.getBoundingClientRect().height*10)/10:0,
                lh:el?Math.round((parseFloat(getComputedStyle(el).lineHeight)||0)*10)/10:0,
                ratio:ratio(el), countRatio:ratio(cnt)};})()};
  },NEWEST.label);
}

// one input: seed s, n accounts. Returns the reading plus the post-reload reading (A5).
async function input(seed,n,geo,name,thin){
  const state={seed,hits:[],refuse:false,thin:thin||null};
  const b=await L.launch({geo,store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name});
  await stub(b,state);
  await b.open();
  await b.tile('Review'); await b.settle(1800);                 // account 1 arrives on the auto-fetch
  // #474 THE ADD-ACCOUNT STEP WAITS FOR ITS OWN CONTROL AND NEVER THROWS, and this is a defect fix rather
  // than a tidy-up: measured TWICE on the #473 bundle (origin/main f3ae36a), this loop threw
  // "tapText: nothing visible matches /^Fetch$/" on the FIRST three-account input, and because a throw ends
  // the file, A7, A9, A10, A11, A12, A13 and A14 - every assertion #432 and #433 added - were never reached
  // at all. The cause is in chess.jsx:6525: the button's label is the string 'Fetch' only while ccLoading is
  // false and '…' while it is true, so a run that types into the row before account 1's fetch has settled
  // asks for a label that is not painted. 1800ms of settle after tile('Review') is not a guarantee; the
  // button's own text is. So: poll for the control, and if it never comes back, record it as an ASSERTION
  // (A0b below) instead of crashing - an instrument that cannot reach its state must fail loudly on that one
  // state, not take 100 assertions down with it [R18, and the vacuity rule A0 already states].
  let added=1;
  for(let i=1;i<n;i++){
    let ready=false;
    for(let w=0;w<60&&!ready;w++){
      ready=await b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>(x.textContent||'').trim()==='Fetch'&&x.offsetParent!==null&&!x.disabled));
      if(!ready)await b.settle(250);
    }
    if(!ready){L.note('       ADD-ACCOUNT BLOCKED after '+added+' of '+n+' accounts: no visible, enabled button reading exactly "Fetch" within 15s. A0b asserts this.');break;}
    try{
      await b.page.locator('input[placeholder="Chess.com username"]').fill(ACCTS[i]);
      await b.settle(150);
      await b.tapText(/^Fetch$/,{wait:1800});
      added++;
    }catch(e){L.note('       ADD-ACCOUNT THREW on account '+(i+1)+': '+String(e.message).slice(0,120)+'. A0b asserts this.');break;}
  }
  await b.settle(700);
  const r=await READ(b);
  r.hits=state.hits.slice(0,4); r.hitCount=state.hits.length;
  r.accountsAdded=added; r.accountsWanted=n;
  // A5: the same context, the stub now refusing, reloaded. Whatever is on screen came out of localStorage.
  state.refuse=true;
  await b.open(); await b.tile('Review'); await b.settle(1200);
  const after=await READ(b);
  r.afterReload=after.rows; r.afterErr=after.err;
  // #474 the limit LINE after the same reload, for A7g. input() already pays for this reading; nothing read
  // it [jobs/gate-61-a7-does-not-assert-the-bound-survives-a-reload-2026-09-29].
  r.afterCap=after.cap; r.afterBody=after.body;
  r.b=b;
  return r;
}

(async()=>{
  const seeds=(process.env.CT_SEEDS||'a,b,c').split(',');
  const accts=(process.env.CT_ACCTS||'1,3').split(',').map(Number);
  const GEO={w:375,h:730,safe:''};
  L.note('PINNED: MIN_CAP '+MIN_CAP+', ACCT_SLOTS '+ACCT_SLOTS+', BUDGET '+BUDGET+' chars, CAP_RE '+CAP_RE);
  for(const s of seeds)for(const n of accts){
    const total=PER_OLDER*OLDER_MONTHS.length+SEEDN[s];
    const tag='seed '+s+' (newest month '+SEEDN[s]+' games, '+total+' per account) x '+n+' account'+(n>1?'s':'');
    const r=await input(s,n,GEO,'in-'+s+'-'+n);
    const cap=(r.body.match(CAP_RE)||[])[1];
    const capN=cap?parseInt(cap.replace(/,/g,''),10):null;
    const capUsed=capN||MIN_CAP;
    const expect=n*Math.min(total,capUsed);
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+' '+JSON.stringify(r.hits)+'  months on screen '+JSON.stringify(r.distinct)+'  stored months '+JSON.stringify(r.storedMonths));
    // A0 vacuity guard: the stub was used and the screen is the games list, not an error card.
    const a0=L.say(r.hitCount>=n&&(r.rows>0||r.err==='yes'),'A0 vacuity: the stubbed archives index was requested and the Review list rendered a list or its error',{requests:r.hitCount,rows:r.rows,err:r.err,tag});
    if(!a0){L.note('     A0 failed - A1..A5 SKIPPED for this input rather than measured on a screen that never fetched');await r.b.close();continue;}
    // #474 A0b: the input the gate CLAIMS to be measuring is the input it reached. Added because the throw
    // this replaces was silent about how much of the file it cost.
    const a0b=L.say(r.accountsAdded===r.accountsWanted,'A0b vacuity '+tag+': every account this input names was actually connected, so an assertion over N accounts is measured over N accounts',{added:r.accountsAdded,wanted:r.accountsWanted});
    if(!a0b){L.note('     A0b failed - A1..A5 SKIPPED for this input: the screen holds fewer accounts than the input names, so every count below would be measuring a different input [R18]');await r.b.close();continue;}
    L.say(r.rows>0,'A1 TC-R35(i) '+tag+': the list is NON-EMPTY',{rows:r.rows});
    L.say(r.outside>0,'A2 TC-R35(i) '+tag+': the list holds rows dated OUTSIDE the newest month - the month rule',{outsideNewest:r.outside,inNewest:r.inNewest,months:r.distinct});
    L.note('       WEAK FORM, printed not asserted: "rows > 40" would say '+(r.rows>40?'PASS':'FAIL')+' here. A2 says '+(r.outside>0?'PASS':'FAIL')+'.');
    L.say(r.rows===expect,'A3a TC-R35(ii) '+tag+': rows == accounts x min(total seeded, the cap)',{rows:r.rows,expect,capUsed,capFrom:capN?'stated on screen':'MIN_CAP (no cap stated)'});
    L.say(!!capN&&capN>=MIN_CAP,'A3b TC-R35(ii) '+tag+': a cap of at least '+MIN_CAP+' is stated on screen as readable text',{stated:cap||'NONE',accepts:'Showing up to '+MIN_CAP+' games per account.'});
    L.say(r.bytes<BUDGET,'A4 TC-R35(iii) '+tag+': measured localStorage footprint under the pinned budget',{chars:r.bytes,budget:BUDGET,acctGames:r.acctBytes,storedRows:r.stored});
    // A4b and A5 need something to have been stored. With nothing stored they would only restate A1's failure,
    // so they are NOT asserted there - a cascade is not a second finding [R07]. The skip is printed, not silent.
    const per=r.stored?Math.round(r.acctBytes/r.stored):0;
    const proj=per*capUsed*ACCT_SLOTS;
    if(r.stored>0){
      // #474 A4b IS RE-LABELLED, NOT DELETED, and its payload now carries the two numbers that make it
      // readable: the break-even row size and how far the fixture sits below the corpus. It is a FIXTURE-SCALE
      // check - it fails only if the app stores something far larger than the fixture it was given - and it is
      // A4c that carries the budget.
      L.say(proj>0&&proj<BUDGET,'A4b TC-R35(iii) '+tag+': projected footprint AT THE FIXTURE ROW SIZE stays under the budget (a fixture-scale check, NOT the budget: see A4c)',{bytesPerRow:per,cap:capUsed,slots:ACCT_SLOTS,projected:proj,budget:BUDGET,breakEven:BREAKEVEN,corpusMedian:REAL_ROW_MEDIAN,fixtureIsThisFractionOfCorpus:Math.round(per/REAL_ROW_MEDIAN*100)/100});
      // #474 A4c, THE ASSERTION A4b WAS MISTAKEN FOR. The expected value no longer comes from the fixture:
      // it comes from the pinned corpus above, so the projection can go red on a real row size while the
      // miniature stays green. PRINTED ON EVERY RUN, ASSERTED UNDER CT_A4C=1, and the reason it is not
      // admitted to the default suite is recorded rather than left to be guessed [R36, R45]: at the corpus
      // median the projection is OVER the budget on the bundle on main, and that is an APP-side finding
      // (jobs/store-eviction-drops-accounts-while-the-screen-keeps-counting-2026-09-29 and the cap decision
      // behind it), not an instrument one. Admitting it here would turn every build red on somebody else's
      // open job, which is how a correct assertion gets reverted under time pressure. The number is in the
      // log of every run either way, which is the half that was missing.
      const projMed=REAL_ROW_MEDIAN*capUsed*ACCT_SLOTS, projMax=REAL_ROW_MAX*capUsed*ACCT_SLOTS;
      L.note('       A4c CORPUS PROJECTION '+tag+': fixture row '+per+' chars = '+(Math.round(per/REAL_ROW_MEDIAN*100)/100)+'x the corpus median '+REAL_ROW_MEDIAN+'; break-even at '+capUsed+' x '+ACCT_SLOTS+' is '+BREAKEVEN+' chars/row. Projected at the median '+projMed+' = '+(projMed<BUDGET?'UNDER':'OVER')+' the '+BUDGET+' budget; at the corpus max '+projMax+' = '+(projMax<BUDGET?'UNDER':'OVER')+'; at the measured blitz row '+REAL_ROW_BLITZ+' '+(REAL_ROW_BLITZ*capUsed*ACCT_SLOTS)+'. CT_A4C=1 asserts it.');
      if(process.env.CT_A4C==='1')
        L.say(projMed<BUDGET,'A4c TC-R35(iii) '+tag+': projected footprint at the cap x '+ACCT_SLOTS+' slots stays under the budget WHEN THE ROW IS CORPUS-SIZED rather than fixture-sized',{bytesPerRow:REAL_ROW_MEDIAN,fixtureRow:per,breakEven:BREAKEVEN,cap:capUsed,slots:ACCT_SLOTS,projected:projMed,projectedAtCorpusMax:projMax,budget:BUDGET,corpus:'docs/benchmark-answerkey-7-pgn, 7 real chess.com games: median 2612, mean 2831, max 4670'});
    }
    else L.note('       A4b AND A4c NOT ASSERTED for this input: nothing is in ct_acctgames, so there is no per-row size to project from. A5 below is what reports that.');
    // A5 COMPARES SCREEN TO SCREEN, NOT SCREEN TO STORAGE, AND THE DIFFERENCE IS THE WHOLE ASSERTION.
    // Written first as afterReload === storedRows, it was UNFALSIFIABLE by its own control: NC4 makes the
    // acctGames write throw, the quota catch at chess.jsx:232 swallows it, storedRows reads 0 - and a guard
    // that skipped the assertion when nothing was stored skipped precisely the case A5 exists to catch.
    // Measured that way it went 15 pass / 0 fail on a bundle that loses every fetched game on reload.
    if(r.rows>0)L.say(r.afterReload===r.rows,'A5 '+tag+': the fetch SURVIVES a reload - rows on screen after a reload with the network refusing == rows on screen before it (a swallowed quota failure fails here)',{before:r.rows,afterReload:r.afterReload,writtenToStorage:r.stored,errShown:r.afterErr});
    else L.note('       A5 NOT ASSERTED for this input: the list was empty before the reload, so there is nothing to persist. That is A1 failing, not a second finding.');
    await r.b.close();
  }
  // ── A7 #432, THE THIN FIXTURE. THE SEVENTH INPUT THIS GATE WAS MISSING, AND WHY IT WAS MISSING MATTERS.
  //    Every one of A1..A5's six inputs concentrates 300 games in the five months immediately before the
  //    newest, so the backward walk ALWAYS reaches ACCT_GMAX and stops on GAMES. The gate therefore went
  //    42/42 green over a bundle that prints "Showing up to 200 games per account." in a state where 200 was
  //    not the limit at all - a whole branch of the app's own behaviour that its only gate could not enter.
  //    That is the "measured in one configuration only" category pointed at a fixture rather than a claim.
  //
  //    US-R25 is the clause: the list is "bounded only by a limit the app STATES on screen". So the property
  //    is not "a cap is stated", it is "the limit that BOUND is the limit stated", and it needs all three
  //    exits to be reachable:
  //      T1 thin-long   24 months x 5 games = 120/account -> the MONTH window binds at 6x5 = 30 rows
  //      T2 short-whole  3 months x 5 games =  15/account -> NOTHING binds; the index ran out
  //      (the games exit is A1..A5's six inputs above, unchanged)
  //    T1 runs at 1 and 3 accounts because the union across accounts is its own decision in the render.
  const THIN_PER=5, T1_MONTHS=24, T2_MONTHS=3, GMONTHS=6;
  // #433 THREE REGEXES WHERE THERE WAS ONE, because at this build "the screen names the month bound" and
  // "the screen makes a CALENDAR claim" stopped being the same sentence. PLAY_RE pins the branch the app
  // can actually support; CAL_RE is the wording #432 shipped and is now a DEFECT wherever it appears, which
  // is what A11c asserts against the measured span; MONTH_RE is the union and is used only where the
  // assertion is "no month claim of any kind is on screen".
  const PLAY_RE=/(\d+)\s*most recent months of play/i;
  // #433 widened after antagonist A broke the first version with "games from the past 6 months", a false
  // calendar claim CAL_RE did not match while A11c stayed green. NO REGEX ENUMERATES EVERY FUTURE WORDING,
  // and that is exactly why A11h below pins the NUMBER against a measured quantity instead of the words.
  const CAL_RE=/(?:last|past|previous)\s*(\d+)\s*months/i;
  const MONTH_RE=/last\s*\d+\s*months|\d+\s*most recent months of play/i;
  const GAP_RE=/months couldn.t be loaded/i;
  for(const t of [{months:T1_MONTHS,n:1},{months:T1_MONTHS,n:3},{months:T2_MONTHS,n:1}]){
    const total=t.months*THIN_PER;
    const binds=total>GMONTHS*THIN_PER&&t.months>GMONTHS;          // months bind only if older months exist
    const tag='THIN '+t.months+' months x '+THIN_PER+' ('+total+' per account) x '+t.n+' account'+(t.n>1?'s':'');
    const r=await input('b',t.n,{w:375,h:730,safe:''},'thin-'+t.months+'-'+t.n,{months:t.months,per:THIN_PER});
    const expect=t.n*(binds?GMONTHS*THIN_PER:total);
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  months on screen '+JSON.stringify(r.distinct)+'  limit line '+JSON.stringify(r.cap));
    // #474 the account count joins A7-0's conjunction for the same reason A0b exists: a three-account input
    // that connected one account is a different input, and before #474 it was a throw that ended the file.
    const a0=L.say(r.hitCount>=t.n&&(r.rows>0||r.err==='yes')&&r.accountsAdded===r.accountsWanted,'A7-0 vacuity '+tag+': the stubbed archives index was requested, the Review list rendered, and every account this input names was connected',{requests:r.hitCount,rows:r.rows,err:r.err,accountsAdded:r.accountsAdded,accountsWanted:r.accountsWanted});
    if(!a0){L.note('     A7-0 failed - A7a..A7f SKIPPED for this input');await r.b.close();continue;}
    // A7a IS THE PRECONDITION FOR EVERYTHING BELOW, and it is asserted rather than assumed: without it a
    // green A7b could mean "the month wording is there" on a screen where months never bound [#385's rule].
    L.say(r.rows===expect,'A7a '+tag+': rows == accounts x '+(binds?'(ACCT_GMONTHS x per month) - the MONTH window is what bound':'the whole account - NOTHING bound'),{rows:r.rows,expect,boundExpected:binds?'months':'all',perAccountTotal:total});
    if(binds){
      // A7b AND A7c READ THE WHOLE SCREEN (r.body), not the line element. The element is the fix's own
      // handiwork; the body is what the player sees on either bundle, and it is the only reading that makes
      // these two falsifiable against #431. r.cap is still printed beside them as the located line.
      // #433 PLAY_RE, not MONTH_RE: the assertion is that the screen names the bound IN THE UNITS THE APP
      // HAS. The old wording ("your last 6 months") satisfied the old regex and was false on a sparse index,
      // so the regex moved with the string it pins and A11c below is what makes the distinction fail-able.
      const mn=(r.body||'').match(PLAY_RE);
      L.say(!!mn&&+mn[1]===GMONTHS,'A7b US-R25 '+tag+': the screen states the MONTH-OF-PLAY window, which is the limit that actually bound, in the units the walk actually counts',{monthsOfPlay:mn?+mn[1]:null,expect:GMONTHS,calendarClaim:(r.body||'').match(CAL_RE)?((r.body||'').match(CAL_RE))[0]:'none',locatedLine:r.cap.text});
      // A7c is the other half and is NOT a restatement of A7b: a screen could name both and still mislead.
      // On the #431 bundle this is the defect itself - "Showing up to 200 games per account." while 200
      // never bound - so this assertion is the one that had to be read off the body to be able to fail.
      const gc=(r.body||'').match(CAP_RE);
      // #474 A7g, jobs/gate-61-a7-does-not-assert-the-bound-survives-a-reload-2026-09-29, filed by #432
      // against its own work. The recorded walk bound is persisted (ct_acctcap, loaded at mount), so the
      // limit sentence is rendered from storage on every launch after the first and NOTHING asserted that
      // the same limit is still named afterwards. input() already performs the reload with the network
      // refusing - that is how A5 works - so this reading costs nothing. A5's shape is the precedent:
      // SCREEN TO SCREEN, not screen to storage, because a store that is right and a render that drops it
      // look identical from the storage side.
      L.say(!!r.afterCap&&r.afterCap.text===r.cap.text,'A7g US-R25 '+tag+': the limit the screen names SURVIVES a reload with the network refusing - the bound is read back from storage and still names the limit that actually bound',{before:r.cap&&r.cap.text,afterReload:r.afterCap&&r.afterCap.text,rowsBefore:r.rows,rowsAfterReload:r.afterReload});
      L.say(!!r.afterBody&&PLAY_RE.test(r.afterBody)&&!(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i).test(r.afterBody),'A7h US-R25 '+tag+': after the reload the screen STILL states the month-of-play window and still does NOT state a games cap - the wording does not degrade to the games wording on the persisted path',{afterReloadMonths:(r.afterBody||'').match(PLAY_RE)?((r.afterBody||'').match(PLAY_RE))[0]:'none',afterReloadGamesCap:(r.afterBody||'').match(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i)?((r.afterBody||'').match(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i))[0]:'no'});
      L.say(!gc,'A7c US-R25 '+tag+': the screen does NOT state a games cap as the bound, because the games cap is not what stopped the walk',{matchedGamesCap:gc?gc[0]:'no',locatedLine:r.cap.text});
      L.say(!!r.cap.ratio&&r.cap.ratio.r>=4.5,'A7e '+tag+': the limit line meets WCAG AA for normal text (>= 4.5:1) against everything painted behind it',r.cap.ratio?{...r.cap.ratio,min:4.5}:{ratio:null,min:4.5});
    }else{
      // A7d IS THE 24.8px, AS A PROPERTY RATHER THAN AS A PIXEL COUNT. Nothing was cut, so there is no limit
      // to state, so the line must not be rendered at all - which is what gives the shortest screens their
      // height back. Asserting "absent" is only safe because A7b above proves the same element IS rendered
      // in the state that needs it; absence with no presence anywhere is the unfalsifiable shape [#385].
      // Absence is asserted on BOTH the element and the body [R: absence must list what was checked]: a
      // missing data-ct alone is satisfied by any bundle that never had the attribute, #431 included.
      L.say(r.cap.present===false&&!CAP_RE.test(r.body||'')&&!MONTH_RE.test(r.body||''),'A7d '+tag+': NO limit line is rendered and NO limit sentence is anywhere on the screen when nothing bound the list, so it costs no height on a history that fits',{element:r.cap.present,heightPx:r.cap.h,gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthsInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
    }
    L.say(!!r.cap.countRatio&&r.cap.countRatio.r>=4.5,'A7f '+tag+': the "N loaded" count beside it meets WCAG AA (>= 4.5:1) - PRE-EXISTING and swept with the line rather than left [R06]',r.cap.countRatio?{...r.cap.countRatio,min:4.5}:{ratio:null,min:4.5});
    await r.b.close();
  }

  // ── A8 #432, THE RETURNING USER. The one input in this gate that does NOT fetch.
  //    #432 records which bound stopped each walk in its own key (ct_acctcap). An account imported by an
  //    EARLIER build has rows in ct_acctgames and no entry there, and that is the state every existing player
  //    is in on the launch after they upgrade. The first version of #432's render filtered on the missing
  //    entry and therefore drew NO limit line at all for them - dropping the statement US-R25 requires and
  //    that #431 got right, for every player who had already imported, until they re-fetched. Caught by
  //    asking what the fix does to a store it did not write, which no assertion in this gate could see
  //    because all nine of the other inputs create their store by fetching inside the same session.
  //    ct_ccuser is left UNSET so the auto-fetch at chess.jsx:3689 does not fire: this is the launch path.
  {
    // MIN_CAP, not the app's ACCT_GMAX - the gate has no access to the app's constants, and reaching for
    // one is what threw here on the first run and took the A6 sweep down with it before it ran.
    const ROWS=[{n:MIN_CAP,expect:'games',why:'at the cap, so the games cap is what cut it - inferable'},
                {n:12,expect:null,why:'below the cap; months vs exhausted is NOT knowable from an old store, so state nothing'}];
    const PGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.08.01"]\n[White "me"]\n[Black "opp"]\n[Result "1-0"]\n[TimeControl "180"]\n\n'+MOVES+'\n';
    for(const t of ROWS){
      const rows=[];for(let i=0;i<t.n;i++)rows.push({src:'cc',acct:'me',pgn:PGN,white:'me',black:'opp'+i,wr:'win',tc:'blitz',date:Date.UTC(2026,7,1+(i%28),12,0,0)});
      const b=await L.launch({geo:{w:375,h:730,safe:''},name:'returning-'+t.n,
        store:{ct_accts:['cc:me'],ct_acctgames:{'cc:me':rows}}});
      await b.open(); await b.tile('Review'); await b.settle(1200);
      const r=await READ(b);
      const tag='RETURNING USER, '+t.n+' rows stored by an earlier build, no ct_acctcap';
      L.note(tag+'  rows '+r.rows+'  limit line '+JSON.stringify(r.cap));
      const a0=L.say(r.rows===t.n,'A8-0 vacuity '+tag+': the stored games render from localStorage with no fetch',{rows:r.rows,expect:t.n});
      if(a0){
        if(t.expect==='games'){
          const gc=(r.body||'').match(CAP_RE);
          L.say(!!gc,'A8a US-R25 '+tag+': the games cap is STILL stated after an upgrade - an account at the cap was cut by the cap, and that is inferable from the old store alone',{stated:gc?gc[0]:'NONE',note:t.why});
        }else{
          L.say(!CAP_RE.test(r.body||'')&&!MONTH_RE.test(r.body||''),'A8b US-R25 '+tag+': NO limit is stated when the old store cannot say which bound applied - a limit the app cannot know bound is not one it may claim',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthsInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no',note:t.why});
        }
      }
      await b.close();
    }
  }

  // ── A9 #432, MIXED BOUNDS. THE STATE ANTAGONIST A BROKE THIS BUILD IN, ON THIS BUNDLE.
  //    A7's three-account input gives every account the SAME thin fixture, so the union across accounts is
  //    homogeneous and the one new decision in the render is never made to choose. A seeded one thin account
  //    (months-bound) beside one busy account (games-bound) and measured the screen saying "your last 6 months
  //    per account" while the busy account was showing FOUR months and 200 games with unrequested archives
  //    behind it - a limit stated that did not bind, which is the #431 defect this build exists to delete.
  //    Both limits apply to every account and whichever comes first stops that account, so when the accounts
  //    disagree the only sentence true of all of them names BOTH.
  {
    const state={seed:'b',hits:[],refuse:false,mixed:{thin:ACCTS[0],per:5,months:24,busyPer:60}};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'mixed-bounds'});
    await stub(b,state); await b.open();
    await b.tile('Review'); await b.settle(1800);                       // acct1 = thin, months-bound
    await b.page.locator('input[placeholder="Chess.com username"]').fill(ACCTS[1]);
    await b.settle(150); await b.tapText(/^Fetch$/,{wait:2600});        // acct2 = busy, games-bound
    await b.settle(800);
    const r=await READ(b);
    const caps=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_acctcap')||'{}');}catch(e){return {};}});
    const vals=Object.keys(caps).sort().map(k=>caps[k]);
    L.note('MIXED BOUNDS  rows '+r.rows+'  ct_acctcap '+JSON.stringify(caps)+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    // A9-0 IS THE PRECONDITION AND IT IS THE WHOLE POINT: without two DIFFERENT recorded bounds this input is
    // just A7 again with more accounts, and a green below would mean nothing [#385's rule].
    const a0=L.say(vals.includes('months')&&vals.includes('games'),
      'A9-0 vacuity MIXED: the two accounts really were stopped by DIFFERENT bounds - one months, one games - so the union is actually made to choose',
      {acctcap:caps,distinct:[...new Set(vals)].sort()});
    if(a0){
      const t=(r.cap&&r.cap.text)||'';
      L.say(MONTH_RE.test(t)&&CAP_RE.test(t),
        'A9a US-R25 MIXED: with accounts stopped by different bounds the line names BOTH limits, because that is the only statement true of every account - naming one of them "per account" is a limit stated that did not bind for the other',
        {line:t,namesMonths:MONTH_RE.test(t),namesGames:CAP_RE.test(t)});
      L.say(r.cap&&r.cap.ratio&&r.cap.ratio.r>=4.5,'A9b MIXED: the line still meets WCAG AA',r.cap&&r.cap.ratio?{...r.cap.ratio,min:4.5}:{ratio:null});
    }
    await b.close();
  }

  // ── A10 #432, THE LEGACY STORE. THE SECOND STATE ANTAGONIST A BROKE THIS BUILD IN.
  //    A8 seeds 200 rows and 12. ACCT_GMAX was 40 from #353 to #430, so NO store written by any shipped build
  //    before #431 can hold 200 rows - the entire installed base sits at or under 40, and inferring at today's
  //    ACCT_GMAX read every one of them as "nothing bound" and stated no limit on a list that HAD been cut.
  //    A8's 200-row input is the one row-count no real upgrading user is in.
  {
    const PGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.08.01"]\n[White "me"]\n[Black "opp"]\n[Result "1-0"]\n[TimeControl "180"]\n\n'+MOVES+'\n';
    // #433 THE BAND origin/main ITSELF WRITES. A10 seeded only 40 and 9, both at or under the legacy cap,
    // and antagonist A measured why that is the wrong population: ct_acctcap arrives in #432, which has
    // never shipped, so the bound-less stores were written by builds up to and INCLUDING #431 - which is on
    // main with ACCT_GMAX=200. 41..199 is the band the deployed app creates and no input reached it; the
    // first #433 inferred the cap as the row count and printed 137 back at the player as a limit.
    // #474 THE 39 FIXTURE, jobs/gate-61-a10c-asserts-the-forty-row-inference-2026-09-30: 39 and 41 now sit
    // either side of 40, so A10a/A10b/A10c cannot be satisfied by 'a line always' or by 'no line ever' -
    // each verdict has to turn on the row count rather than on a constant policy. 41 arrived at #433; 39 is
    // the other side of the same boundary and is the cheapest input that discriminates a cap from a count.
    for(const t of [{n:39,expect:null,why:'ONE ROW BELOW the legacy cap of 40: a store that stopped before any cap could have cut it, so nothing is known to have been cut'},
                    {n:40,expect:'games',why:'a full store at the LEGACY cap of 40 - the shape a pre-#432 account that was cut by the 40 cap has'},
                    {n:200,expect:'games',why:'a full store at the CURRENT cap, which #431 on main writes and records no bound for'},
                    {n:137,expect:null,why:'THE BAND origin/main CREATES: above the legacy cap so it cannot be a legacy cut, below the current one so nothing cut it - and a number this app has never capped at'},
                    {n:41,expect:null,why:'one row above the legacy cap: the cheapest case where a row count is not a cap'},
                    {n:9,expect:null,why:'below any cap this app has shipped, so nothing is known to have been cut'}]){
      const rows=[];for(let i=0;i<t.n;i++)rows.push({src:'cc',acct:'me',pgn:PGN,white:'me',black:'opp'+i,wr:'win',tc:'blitz',date:Date.UTC(2026,7,1+(i%28),12,0,0)});
      const b=await L.launch({geo:{w:375,h:730,safe:''},name:'legacy-'+t.n,store:{ct_accts:['cc:me'],ct_acctgames:{'cc:me':rows}}});
      await b.open(); await b.tile('Review'); await b.settle(1200);
      const r=await READ(b);
      // #474 THE TAG IS BUILT FROM THE FIXTURE'S OWN FACTS AND NEVER FROM A CONSTANT SENTENCE.
      // jobs/gate-61-a10c-asserts-the-forty-row-inference-2026-09-30: the old tag printed 'written by a
      // pre-#431 build (cap 40)' verbatim for EVERY fixture in this loop, including n=200 and n=137, which
      // a cap-40 build cannot write - and the block's own preamble three lines above says so. Prose that
      // contradicts the number beside it, inside the instrument, invisible to every value-shaped check
      // because nothing asserts a log string. The population is pre-#432, not pre-#431; `why` is already
      // correct per row, so the tag now carries it and the log cannot print a provenance its own fixture
      // disproves.
      const tag='LEGACY STORE, '+t.n+' rows, no ct_acctcap (written by a build up to and including #431, so pre-#432, NOT pre-#431): '+t.why;
      L.note(tag+'  rows '+r.rows+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
      if(L.say(r.rows===t.n,'A10-0 vacuity '+tag+': the stored games render from localStorage with no fetch',{rows:r.rows,expect:t.n})){
        if(t.expect==='games'){
          L.say(CAP_RE.test(r.body||''),'A10a US-R25 '+tag+': a limit IS stated - a legacy account sitting at the cap of the build that wrote it was cut by that cap, and that is inferable without a re-fetch',{stated:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'NONE',note:t.why});
          // #433 A10c. A10a ASKS ONLY WHETHER A SENTENCE IS THERE, AND THAT IS HOW THE WRONG NUMBER GOT
          // THROUGH IT. #432 inferred 'games' from this exact store and then printed today's ACCT_GMAX, so
          // 40 rows cut at 40 read "Showing up to 200 games per account." - A10a is green on that, because
          // a limit is indeed stated. The number a legacy store can justify is the cap of the build that
          // WROTE it, and the only one it can ever have been is 40. Asserted against the ROW COUNT on
          // screen rather than against a constant this gate holds: whatever number the line names must be
          // the number of rows the store was cut at, which is a fact about this input and not about the app.
          {const gcm=(r.body||'').match(CAP_RE);const stated=gcm?+String(gcm[1]).replace(/,/g,''):null;
           L.say(stated===t.n,'A10c US-R25 '+tag+': the number stated is the cap that ACTUALLY cut this account ('+t.n+'), not the cap of the build reading it',{stated,expect:t.n,rowsOnScreen:r.rows,line:r.cap&&r.cap.text});}
        }else
          L.say(!CAP_RE.test(r.body||'')&&!MONTH_RE.test(r.body||''),'A10b US-R25 '+tag+': NO limit is stated below every cap this app has shipped, because nothing is known to have been cut',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',note:t.why});
      }
      await b.close();
    }
  }

  // ── A11 #433, THE SPARSE INDEX. THE INPUT THAT MAKES THE UNITS BUG VISIBLE, AND THE REASON NO EXISTING
  //    ASSERTION COULD SEE IT IS THIS FILE'S OWN FIXTURE.
  //    Every index this gate has ever built is a CONTIGUOUS run of months ending at NEWEST (the stub's own
  //    `for(i<NM)` walk back from NEWEST). api.chess.com does not return that: /games/archives lists ONLY the
  //    months in which the player HAS games. So the fixture encoded exactly the assumption the code made -
  //    that an index entry is a calendar month - and every assertion reasoning from it inherited the error.
  //    #432 gated GREEN at 89 assertions over a screen reading "Showing your last 6 months per account."
  //    above 28 calendar months of games. Antagonist B found it from the shipped surface with no fixture at
  //    all. BEFORE YOU PIN A FIXTURE'S SHAPE, CHECK WHAT THE REAL API RETURNS.
  //    THE INPUT IS B'S MEASUREMENT REPRODUCED: 8 entries at 5 games each, spread over 28 calendar months.
  //    ACCT_GMONTHS=6 takes the six newest ENTRIES -> 30 rows spanning 2024-06..2026-09.
  //    A11c IS THE ASSERTION THE DEFECT IS ABOUT, and it is pinned to the DOMAIN rather than to a wording:
  //    if the screen makes a CALENDAR claim of N months, the calendar span of the games actually stored must
  //    be at most N. That is false by 4.7x on the #432 bundle whatever words it uses, and it stays true of
  //    any future wording, including one this lane has not thought of.
  {
    const SPARSE=[[2023,11],[2024,1],[2024,6],[2025,2],[2025,9],[2026,3],[2026,8],[2026,9]];   // oldest first
    const PER=5, TAKEN=Math.min(GMONTHS,SPARSE.length);
    const state={seed:'b',hits:[],refuse:false,sparse:{list:SPARSE,per:PER}};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'sparse-8-over-28'});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2200);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='SPARSE '+SPARSE.length+' archive entries over 28 calendar months, '+PER+' games each';
    // the span the app is actually showing, from the store rather than from the fixture, so a walk that
    // took different entries than expected is measured rather than assumed.
    const span=(()=>{const ms=r.storedMonths;if(ms.length<2)return ms.length;
      const p=(s)=>{const[y,m]=s.split('-').map(Number);return y*12+m;};
      return p(ms[ms.length-1])-p(ms[0])+1;})();
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  stored months '+JSON.stringify(r.storedMonths)+'  calendar span '+span+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    if(L.say(r.hitCount>=2&&r.rows>0,'A11-0 vacuity '+tag+': the sparse index was requested and the Review list rendered',{requests:r.hitCount,rows:r.rows,err:r.err})){
      // A11a is the precondition: without it a green A11b could mean "the month wording is there" on a
      // screen where the month window never bound [#385's rule, and A7a's].
      L.say(r.rows===TAKEN*PER,'A11a '+tag+': rows == the '+TAKEN+' newest INDEX ENTRIES x '+PER+' - the entry window is what bound, which is the precondition for everything below',{rows:r.rows,expect:TAKEN*PER,entriesAvailable:SPARSE.length});
      L.say(span>GMONTHS,'A11b '+tag+': the fixture really does separate the two quantities - the span on screen ('+span+' calendar months) exceeds the '+GMONTHS+'-entry window, so a units error is REACHABLE here (it is not on any dense fixture)',{span,window:GMONTHS,storedMonths:r.storedMonths});
      const cal=(r.body||'').match(CAL_RE);
      L.say(!cal||+cal[1]>=span,'A11c US-R25 '+tag+': THE UNITS. Any CALENDAR claim on screen must cover the calendar span actually shown - the screen may not say "last N months" over more than N months of games',{calendarClaim:cal?cal[0]:'none',claimedMonths:cal?+cal[1]:null,measuredSpan:span,line:r.cap&&r.cap.text});
      const pl=(r.body||'').match(PLAY_RE);
      L.say(!!pl&&+pl[1]===GMONTHS,'A11d US-R25 '+tag+': the bound IS stated, in the units the walk counts - '+GMONTHS+' most recent months of play',{monthsOfPlay:pl?+pl[1]:null,expect:GMONTHS,line:r.cap&&r.cap.text});
      L.say(!CAP_RE.test(r.body||''),'A11e US-R25 '+tag+': no games cap is named as the bound, because '+(TAKEN*PER)+' rows never reached it',{matchedGamesCap:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no'});
      // #433 A11g. THE FIX MUST NOT COST THE HEIGHT #432 SPENT AN ASSERTION BUYING BACK. Naming the bound in
      // the units the app has is longer than naming it wrongly, and the first #433 wording ran to TWO line
      // boxes at Kunal's own geometry - 33.6px against 16.8 - on the screen A7d exists to keep short. Dropping
      // "per account" where there is only one account fixes it and is the more accurate sentence anyway.
      // Pinned as line BOXES against the element's own lineHeight, not as a pixel count, so a font change
      // moves both sides together.
      // #433 A11h IS THE ASSERTION WITH DOMAIN CONTENT, AND IT EXISTS BECAUSE ANTAGONIST A SHOWED A11c AND
      // A11d BETWEEN THEM HAVE NONE ON THE BUNDLE THAT SHIPS. A11c can only fire on a calendar claim, and the
      // shipping bundle makes none, so its pass is vacuous here; A11d checks only that the number is 6, never
      // that six months of play are on screen. A measured the consequence: a month that answers 200 with
      // nothing usable leaves FIVE months of play under a six-months-of-play claim, and both assertions stay
      // green. So: whatever number the line names as months of play must EQUAL the number of distinct
      // calendar months actually in the store. Asserted only when no gap is claimed - a gap is precisely the
      // disclosure that the window was not fully realised, and A12 is what covers that case.
      L.say(GAP_RE.test(r.body||'')||(!!pl&&+pl[1]===r.storedMonths.length),'A11h US-R25 '+tag+': THE NUMBER IS THE MEASURED ONE - the months-of-play claim equals the distinct calendar months actually on screen',{claimed:pl?+pl[1]:null,monthsOnScreen:r.storedMonths.length,months:r.storedMonths,gapClaimed:GAP_RE.test(r.body||'')});
      L.say(!!r.cap.lh&&r.cap.h<=r.cap.lh*1.6,'A11g '+tag+': with ONE account the limit line occupies ONE line box at 375x730 - the units fix costs no height on the screen with least room',{h:r.cap.h,lineHeight:r.cap.lh,lineBoxes:r.cap.lh?Math.round(r.cap.h/r.cap.lh*100)/100:null,max:1.6,text:r.cap.text});
      L.say(!GAP_RE.test(r.body||''),'A11f '+tag+': no gap is claimed when every requested month answered - the gap sentence must not fire on a clean walk',{body:(r.body||'').slice(0,160)});
    }
    await b.close();
  }

  // ── A12 #433, THE MONTH THAT FAILED. Antagonist B's second veto ground, measured on the #432 bundle:
  //    a 503 on one month inside the window, the walk's `continue` swallows it, the index then runs out, and
  //    `bound` is reconstructed as 'all' - which the screen renders as NO LINE AT ALL, i.e. "nothing was
  //    cut", over a history with a hole in the middle of it. 50 of 60 rows and not a word.
  //    THE FIX IS A STATEMENT, NOT A RETRY, and this gate asserts exactly that and nothing more: the games
  //    are still missing. US-R25 requires the list to be bounded only by a limit the app STATES; an
  //    unstated hole is the same defect as an unstated cap.
  //    FIXTURE: 3 contiguous months x 5, so the index EXHAUSTS (nothing bounds the list) and the only reason
  //    the count is short is the failed month. That is the state where the old code is most confidently
  //    wrong, because 'all' is the one bound that asserts nothing was lost.
  {
    const PER=5, MONTHS=3, FAILM=NEWEST.y+'/'+String(NEWEST.m-1).padStart(2,'0');   // the middle month
    const state={seed:'b',hits:[],refuse:false,thin:{months:MONTHS,per:PER},fail:FAILM};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'gap-503-midwalk'});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2200);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='GAP: '+MONTHS+' months x '+PER+' with '+FAILM+' answering 503';
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  months on screen '+JSON.stringify(r.distinct)+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    // A12-0 is the vacuity guard AND the proof the hole is real: (MONTHS-1) x PER rows, not MONTHS x PER.
    if(L.say(r.rows===(MONTHS-1)*PER,'A12-0 vacuity '+tag+': a month really was dropped - '+((MONTHS-1)*PER)+' rows where an unbroken walk gives '+(MONTHS*PER),{rows:r.rows,expect:(MONTHS-1)*PER,ifNoGap:MONTHS*PER,requests:r.hitCount})){
      L.say(r.cap.present===true&&GAP_RE.test(r.body||''),'A12a US-R25 '+tag+': the screen SAYS a month could not be loaded, instead of rendering nothing and thereby claiming the whole history is here',{lineRendered:r.cap.present,line:r.cap.text,bodyHasGap:GAP_RE.test(r.body||'')});
      L.say(!CAP_RE.test(r.body||'')&&!MONTH_RE.test(r.body||''),'A12b US-R25 '+tag+': and it names NO limit as the bound, because neither bound was reached - the index ran out',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthClaimInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
      L.say(!!r.cap.ratio&&r.cap.ratio.r>=4.5,'A12c '+tag+': the gap sentence meets WCAG AA (>= 4.5:1) like every other state of this line',r.cap.ratio?{...r.cap.ratio,min:4.5}:{ratio:null,min:4.5});
    }
    await b.close();
  }

  // ── A13 #433, THE MONTH THAT ANSWERED 200 AND GAVE NOTHING. Antagonist A's second veto ground, and the
  //    reason it is a SEPARATE input from A12 rather than a second geometry of it: A12's 503 is the failure
  //    the code was written against, and passing it proved nothing about the three failures it was not.
  //    chess.com lists a month in /games/archives only when that month HAS games, so a listed month that
  //    returns an empty array is information the app asked for and did not get - identical in consequence
  //    to the 503 and, before this build, identical in silence.
  {
    const PER=5, MONTHS=3, EMPTYM=NEWEST.y+'/'+String(NEWEST.m-1).padStart(2,'0');
    const state={seed:'b',hits:[],refuse:false,thin:{months:MONTHS,per:PER},empty:EMPTYM};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'gap-empty-month'});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2200);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='GAP: '+MONTHS+' months x '+PER+' with '+EMPTYM+' answering 200 and an EMPTY games array';
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    if(L.say(r.rows===(MONTHS-1)*PER,'A13-0 vacuity '+tag+': a month really was lost - '+((MONTHS-1)*PER)+' rows where an unbroken walk gives '+(MONTHS*PER),{rows:r.rows,expect:(MONTHS-1)*PER,ifNoGap:MONTHS*PER,requests:r.hitCount})){
      L.say(r.cap.present===true&&GAP_RE.test(r.body||''),'A13a US-R25 '+tag+': the screen SAYS so - a 200 with nothing in it is not a reason to claim the whole history is present',{lineRendered:r.cap.present,line:r.cap.text});
      L.say(!CAP_RE.test(r.body||'')&&!MONTH_RE.test(r.body||''),'A13b US-R25 '+tag+': and names no limit, because the index ran out rather than either bound being reached',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthClaimInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
    }
    await b.close();
  }

  // ── A14 #433, A LEGACY STORE BESIDE A MONTH-BOUND ACCOUNT. BOTH ANTAGONISTS REACHED THIS STATE FROM
  //    DIFFERENT DOORS AND IT IS ONE FINDING WITH TWO FINDERS. A read it off the union expression in the
  //    diff; B measured it on the screen - "70 loaded" nine pixels above a sentence reading 40, with a chip
  //    reading 30 above that, so 70 > 40 and 30 < 40 are painted at once. No input in this file crossed the
  //    two shapes: A9 gives both accounts a recorded bound, A10 runs the legacy store alone. The union was
  //    therefore never asked to choose, and it chose wrong - a cap is a property of the ACCOUNT, not of
  //    whether it happened to be the thing that stopped that account's walk.
  {
    const PGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.08.01"]\n[White "me"]\n[Black "opp"]\n[Result "1-0"]\n[TimeControl "180"]\n\n'+MOVES+'\n';
    const legacy=[];for(let i=0;i<40;i++)legacy.push({src:'cc',acct:'kunalold',pgn:PGN,white:'kunalold',black:'opp'+i,wr:'win',tc:'blitz',date:Date.UTC(2026,7,1+(i%28),12,0,0)});
    const state={seed:'b',hits:[],refuse:false,thin:{months:T1_MONTHS,per:THIN_PER}};
    const b=await L.launch({geo:{w:375,h:730,safe:''},name:'legacy-plus-months',
      store:{ct_ccuser:ACCTS[0],ct_accts:['cc:kunalold'],ct_acctgames:{'cc:kunalold':legacy}}});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2400);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='LEGACY 40 (no ct_acctcap) BESIDE a fetched account the MONTH window bound';
    L.note(tag+'  rows '+r.rows+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    // the precondition, asserted rather than assumed: both shapes really are present at once.
    if(L.say(r.rows===40+GMONTHS*THIN_PER,'A14-0 vacuity '+tag+': both accounts are on screen at once - 40 legacy rows plus the '+(GMONTHS*THIN_PER)+' the month window allowed',{rows:r.rows,expect:40+GMONTHS*THIN_PER})){
      const gc=(r.body||'').match(CAP_RE);const stated=gc?+String(gc[1]).replace(/,/g,''):null;
      L.say(stated===MIN_CAP,'A14a US-R25 '+tag+': the games cap stated is the CURRENT one, not the legacy cap of the one account it happened to stop - naming 40 over '+r.rows+' rows on screen is a limit that did not bind',{stated,expect:MIN_CAP,rowsOnScreen:r.rows,line:r.cap&&r.cap.text});
      L.say(/\(\s*40\s*for accounts imported before/i.test(r.body||''),'A14b US-R25 '+tag+': and the legacy cap is still named, as the qualifier that makes the sentence true of the older account too',{line:r.cap&&r.cap.text});
      const pl2=(r.body||'').match(PLAY_RE);
      L.say(!!pl2&&+pl2[1]===GMONTHS,'A14c US-R25 '+tag+': the month bound is named as well, because it is what stopped the other account',{monthsOfPlay:pl2?+pl2[1]:null,expect:GMONTHS});
    }
    await b.close();
  }

  // ── A6, the geometry sweep. This gate's subject is data, not pixels, so the matrix above runs at Kunal's
  //    375x730 and the WIDTH-sensitive part runs here: nothing on the list is cut off and the first row is
  //    hit-testable at its own centre after scrolling ITS OWN scroller (measurement rules 1, 3, 4).
  const GEOS7=[{w:320,h:568},{w:360,h:640},{w:375,h:667},{w:375,h:730},{w:390,h:844},{w:414,h:896},{w:440,h:956}];
  const sweep=process.env.CT_FULL==='1'?GEOS7:GEOS7.filter(g=>(g.w===320&&g.h===568)||(g.w===375&&g.h===730)||(g.w===440&&g.h===956));
  for(const g of sweep){
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'fit-'+g.w+'x'+g.h});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(1800);
    const m=await b.page.evaluate(()=>{
      const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
      if(!rows.length)return {rows:0};
      // measurement rule 1: #root carries overflow-y:auto, so document.scrollingElement never moves. Scroll the
      // row into view through its REAL scrolling ancestors and re-measure there - not at one extreme of one
      // scroller, which is the reading that produced two false P0s on this project (#380, #382).
      rows[0].scrollIntoView({block:'center'});
      const r0=rows[0].getBoundingClientRect();
      const cx=Math.round(r0.left+r0.width/2), cy=Math.round(r0.top+r0.height/2);
      const hit=document.elementFromPoint(cx,cy);
      const inside=!!hit&&(hit===rows[0]||rows[0].contains(hit));
      let wide=0;for(const r of rows.slice(0,30)){const q=r.getBoundingClientRect();if(q.right>innerWidth+0.5||q.left<-0.5)wide++;}
      const hdr=[...document.querySelectorAll('span')].find(s=>/\d+ loaded$/.test((s.innerText||'').trim()));
      const hb=hdr?hdr.getBoundingClientRect():null;
      return {rows:rows.length,wide,inside,hitTag:hit?(hit.tagName+'.'+(hit.getAttribute('data-ct')||'')):null,hdrRight:hb?Math.round(hb.right*10)/10:null,vw:innerWidth,inView:r0.top>=0&&r0.bottom<=innerHeight};
    });
    L.say(m.rows>0&&m.wide===0,'A6a fit @'+g.w+'x'+g.h+': no game row runs off the screen horizontally',{rows:m.rows,offscreen:m.wide,vw:m.vw});
    L.say(!!m.inside,'A6b reach @'+g.w+'x'+g.h+': the first game row is hit-testable at its own centre (elementFromPoint), not covered',{hit:m.hitTag,inView:m.inView});
    L.say(m.hdrRight!==null&&m.hdrRight<=m.vw+0.5,'A6c fit @'+g.w+'x'+g.h+': the "N loaded" count is inside the viewport',{right:m.hdrRight,vw:m.vw});
    await b.close();
  }
  L.done('61-review-list-month-independence');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('61-review-list-month-independence');});
