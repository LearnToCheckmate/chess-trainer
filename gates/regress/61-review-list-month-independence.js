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
//   footprint is a LOWER bound on the real one and A4b is the assertion that carries the budget.
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
      const NM=state.thin?state.thin.months:24;
      const ar=[];for(let i=0;i<NM;i++){const t=new Date(Date.UTC(NEWEST.y,NEWEST.m-1-(NM-1-i),1));ar.push('https://api.chess.com/pub/player/'+who+'/games/'+t.getUTCFullYear()+'/'+String(t.getUTCMonth()+1).padStart(2,'0'));}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:ar})});
    }
    const m=u.match(/games\/(\d{4})\/(\d{2})$/);
    if(!m)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    const y=+m[1],mo=+m[2];
    let n=0;
    if(state.thin)n=state.thin.per;                                  // #432 every month equally thin
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
        const LIMIT=/(?:up to|at most|limit)\s+[\d][\d,]*\s+games|last\s*\d+\s*months/i;
        const el=document.querySelector('[data-ct="games-cap"]')||
          [...document.querySelectorAll('div,span,p')].find(x=>x.children.length===0&&LIMIT.test((x.textContent||'').trim()));
        const cnt=[...document.querySelectorAll('span')].find(x=>/^\d+ loaded$/.test((x.textContent||'').trim()));
        const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
        const lum=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
        // #432 THE RATIO PRINTS ITS OWN INPUTS, because the first version returned 4.51 where both the
        // antagonist's report and a hand calculation over rgb(26,33,42) said 4.37, and a threshold of 4.5
        // sits between those two numbers. `bg` is the EFFECTIVE background: every translucent layer between
        // the text and the first opaque ancestor is composited in order, which is what the browser paints
        // and what the first draft skipped by taking the opaque ancestor alone.
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
        return {present:!!el, text:el?(el.textContent||'').trim():null, h:el?Math.round(el.getBoundingClientRect().height*10)/10:0,
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
  for(let i=1;i<n;i++){
    await b.page.locator('input[placeholder="Chess.com username"]').fill(ACCTS[i]);
    await b.settle(150);
    await b.tapText(/^Fetch$/,{wait:1800});
  }
  await b.settle(700);
  const r=await READ(b);
  r.hits=state.hits.slice(0,4); r.hitCount=state.hits.length;
  // A5: the same context, the stub now refusing, reloaded. Whatever is on screen came out of localStorage.
  state.refuse=true;
  await b.open(); await b.tile('Review'); await b.settle(1200);
  const after=await READ(b);
  r.afterReload=after.rows; r.afterErr=after.err;
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
    if(r.stored>0)L.say(proj>0&&proj<BUDGET,'A4b TC-R35(iii) '+tag+': projected footprint at the cap x '+ACCT_SLOTS+' account slots stays under the budget',{bytesPerRow:per,cap:capUsed,slots:ACCT_SLOTS,projected:proj,budget:BUDGET});
    else L.note('       A4b NOT ASSERTED for this input: nothing is in ct_acctgames, so there is no per-row size to project from. A5 below is what reports that.');
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
  const MONTH_RE=/last\s*(\d+)\s*months/i;
  for(const t of [{months:T1_MONTHS,n:1},{months:T1_MONTHS,n:3},{months:T2_MONTHS,n:1}]){
    const total=t.months*THIN_PER;
    const binds=total>GMONTHS*THIN_PER&&t.months>GMONTHS;          // months bind only if older months exist
    const tag='THIN '+t.months+' months x '+THIN_PER+' ('+total+' per account) x '+t.n+' account'+(t.n>1?'s':'');
    const r=await input('b',t.n,{w:375,h:730,safe:''},'thin-'+t.months+'-'+t.n,{months:t.months,per:THIN_PER});
    const expect=t.n*(binds?GMONTHS*THIN_PER:total);
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  months on screen '+JSON.stringify(r.distinct)+'  limit line '+JSON.stringify(r.cap));
    const a0=L.say(r.hitCount>=t.n&&(r.rows>0||r.err==='yes'),'A7-0 vacuity '+tag+': the stubbed archives index was requested and the Review list rendered',{requests:r.hitCount,rows:r.rows,err:r.err});
    if(!a0){L.note('     A7-0 failed - A7a..A7f SKIPPED for this input');await r.b.close();continue;}
    // A7a IS THE PRECONDITION FOR EVERYTHING BELOW, and it is asserted rather than assumed: without it a
    // green A7b could mean "the month wording is there" on a screen where months never bound [#385's rule].
    L.say(r.rows===expect,'A7a '+tag+': rows == accounts x '+(binds?'(ACCT_GMONTHS x per month) - the MONTH window is what bound':'the whole account - NOTHING bound'),{rows:r.rows,expect,boundExpected:binds?'months':'all',perAccountTotal:total});
    if(binds){
      // A7b AND A7c READ THE WHOLE SCREEN (r.body), not the line element. The element is the fix's own
      // handiwork; the body is what the player sees on either bundle, and it is the only reading that makes
      // these two falsifiable against #431. r.cap is still printed beside them as the located line.
      const mn=(r.body||'').match(MONTH_RE);
      L.say(!!mn&&+mn[1]===GMONTHS,'A7b US-R25 '+tag+': the screen states the MONTH window, which is the limit that actually bound',{months:mn?+mn[1]:null,expect:GMONTHS,locatedLine:r.cap.text});
      // A7c is the other half and is NOT a restatement of A7b: a screen could name both and still mislead.
      // On the #431 bundle this is the defect itself - "Showing up to 200 games per account." while 200
      // never bound - so this assertion is the one that had to be read off the body to be able to fail.
      const gc=(r.body||'').match(CAP_RE);
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
