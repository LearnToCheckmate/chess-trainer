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
// CONTROL-RECORD: 755c349 2026-11-06 total=199 red=34 scope=trial:8a0d0c859f86 how=the pre-#549-(31) bundle (chess.jsx at 376ccde, acctStore replaces M[id]=rows, localStorage store, months-of-play and cap wording): every rewritten wording assertion (A3b x6, A7b, A7h, A8a, A9a, A18a, A10a, A10c, A11d, A11h, A14a-c) and A19-0..A22c red - A22a reads 400 on screen over 200 stored; good trial f33a953130de 199/0
// CONTROL-RECORD: 755c349 2026-11-06 total=199 red=4 scope=trial:d53f721a50f1 how=merge reverted in acctStore (M[id]=fresh.slice(0,cap)): A19a 200 -> 5, A20b 197 of 200 lost, A20c, A20e red, every other assertion green
// CONTROL-RECORD: 755c349 2026-11-06 total=199 red=3 scope=trial:50e187b68c0a how=acctGamesSave's return value ignored in acctStore (lost=[]): A22a 400 on screen over 200 stored, A22b no dropped account named, A22c red, every other assertion green
// CONTROL-RECORD: 46340d1 2026-11-06 total=206 red=3 scope=trial:50246f099c20 how=the pre-#549-(32) bundle (chess.jsx at 755c349, the walk reads every month of the window on every refresh): A23b 5 requests where 2 are wanted, A23c 377474 bytes against 377474, A23d 6 requests and months 2026/10..2026/06; good trial ee1bb03cbbf7
// CONTROL-RECORD: 46340d1 2026-11-06 total=206 red=2 scope=trial:5d1f5e82b19f how=acctStore does not map the walk's 'held' bound to the recorded one (the `if(_reached)_base=...` line disabled): A20d and A23e, no limit line after a walk that stopped at the newest held game; every other assertion green
// CONTROL-RECORD: f462559 2026-11-06 total=231 red=14 scope=trial:041ea4fdd29b how=loadOlderGames walks from the NEWEST archive and takes every game (start index and the <=oldest filter removed): A26a 200 -> 200, A26b, A26e, A26f, A26g, A26i, A26j, A27-0b, A27a, A27b, A27d, A27e, A27f, A27g red
// CONTROL-RECORD: f462559 2026-11-06 total=231 red=4 scope=trial:8e94360be93b how=the list renders every held row (no GLIST_PAGE slice, no Show-more control): A27d 2000 rows rendered, A27e, A27f, A27g red
// CONTROL-RECORD: f462559 2026-11-06 total=231 red=1 scope=trial:b880f0d07c42 how=acctCanGrow ignores the store cap: A27b the Load-older control still offered at 2000 held
// CONTROL-RECORD: f462559 2026-11-06 total=231 red=2 scope=trial:5574ca736b57 how=the Lichess older request omits until=: A28a, A28b 200 held after 6 taps
// CONTROL-RECORD: 1b67302 2026-11-06 total=256 red=4 scope=trial:4cde1e176f99 how=the pre-fix bundle (chess.jsx at 46340d1: acctGamesSave evicts on ANY failed IndexedDB transaction): A31a x2 (gateold deleted by one UnknownError; by two, BOTH accounts deleted), A31b ('There wasn't room' claimed), A31e; A31c (quota still evicts) green on both; good trial 79d5e29b11eb
// CONTROL-RECORD: 2c51085 2026-11-06 total=256 red=2 scope=trial:79d5e29b11eb how=the A2-R5 bundle without A3-R5 (no ACCT_UNREAD sentence, no removal queue): A32a (said null on a launch whose IndexedDB open errors), A32b (the removed account's 50 games back in IndexedDB and on screen next launch); good trial 7245a5bf39e8
// CONTROL-RECORD: 37a5666 2026-11-07 total=258 red=1 scope=trial:2e510f25bcfb how=#549 run fix A1-R6: the run-branch tree at 2c51085 with 37a5666's chess.jsx hunk reverted (Show N more rendered while the Load-older walk is busy) - A27h TC-R145 red alone, 16 samples offering "Show 199 more games" over 200 rows (257 PASS 1 FAIL); the fix bundle ba7df5011ab6 goes 258 PASS 0 FAIL
// CONTROL-RECORD: 5220073 2026-11-07 total=267 red=3 scope=trial:97124148b518 how=the pre-#549-(103) bundle (chess.jsx at 2c51085: no follow refresh, only the box account is fetched): A24a 0 requests for the 50h account and 3 held, A24d and A24g no followed account asked; good trial ac23469a710d
// CONTROL-RECORD: 5220073 2026-11-07 total=267 red=2 scope=trial:609f37bd9935 how=acctRefreshStale loops over every stale account instead of one: A24b the 30h account asked on launch 1, A24d nothing left stale on launch 2
// CONTROL-RECORD: 5220073 2026-11-07 total=267 red=5 scope=trial:cb76366f7859 how=ACCT_STALE_MS=0, every followed account always stale: A24f a followed account asked on launch 3, plus A14-0 and A31-0 x3 (their fresh-stamped old account refreshed)
// CONTROL-RECORD: 5220073 2026-11-07 total=267 red=1 scope=trial:28f5d47b9ac1 how=a quiet walk keeps setCcErr (fetchChessCom and fetchLichess): A24e 'Chess.com answered' on screen after the unrequested 503 refresh
// CONTROL-RECORD: 5220073 2026-11-07 total=267 red=1 scope=trial:a049649c94dc how=fetchChessCom does not stamp the attempt (acctFreshMark(...,false) removed): A24f the failed 30h account asked again on launch 3
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
// ── #549 item (31), jobs/refetching-an-account-replaces-its-stored-list-instead-of-merging-2026-09-29, Kunal's
//    merge-big [Amber: flags/amber-549-merged-list-limit-line]. A refresh now MERGES into what is held, so the line
//    names what is held - "Games back to <oldest held date>[ for <account>]; older ones aren't loaded." -
//    and no longer the walk's own window ("your 6 most recent months of play", "up to 200 games"), which is true of
//    one walk and false of a merged list. The assertions below that pinned those words now pin the DATE, and the date
//    is checked against a MEASURED quantity: the oldest row the store actually holds for that account (r.heldDates,
//    read out of IndexedDB by L.acctGames), never against a number this file computes from its own fixture.
//    HELD_CLAIM parses the line into [{d,u}]: a bare date is a claim about every cut account, "d for u" about one.
const OLDER_RE=/older (?:ones|games) aren.t loaded/i;
const ANY_LIMIT_RE=/(?:up to|at most|limit)\s+[\d][\d,]*\s+games|last\s*\d+\s*months|\d+\s*most recent months of play|older (?:ones|games) aren.t loaded|games back to/i;
function HELD_CLAIM(text){
  const m=String(text||'').match(/Games back to (.*?); older ones aren.t loaded\./i);if(!m)return null;
  const out=[];const re=/([A-Z][a-z]{2} \d{1,2}, \d{4})(?: for ([A-Za-z0-9_.-]+))?/g;let x;
  while((x=re.exec(m[1])))out.push({d:x[1],u:x[2]||null});
  return out;
}
// every cut account is covered by the claim with ITS OWN oldest date, and the claim names nothing else
function HELD_OK(text,heldDates,cutIds){
  const c=HELD_CLAIM(text);if(!c||!c.length)return {ok:false,why:'no "Games back to <date>; older ones aren\'t loaded." on the line',line:text};
  const user=(id)=>id.slice(id.indexOf(':')+1);
  const bad=[];
  for(const id of cutIds){const want=heldDates[id];
    const hit=c.find(e=>e.u===user(id))||c.find(e=>!e.u);
    if(!want||!hit||hit.d!==want)bad.push({acct:id,want:want||'no dated row',stated:hit?hit.d:'not named'});}
  const extra=c.filter(e=>e.u&&!cutIds.some(id=>user(id)===e.u));
  return {ok:!bad.length&&!extra.length,claim:c,bad,extra,expect:cutIds.map(id=>({acct:id,oldest:heldDates[id]}))};
}
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
    // #549 item (103): ONE PLAYER's every request answers 503, the others are served (A24's quiet failed refresh)
    if(state.failWho&&u.indexOf('/player/'+state.failWho+'/')>=0)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
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
      // #549 item (31) EXTRA: one more month AFTER the newest, so a second walk brings in games the first never saw
      if(state.extra)ar.push('https://api.chess.com/pub/player/'+who+'/games/'+state.extra.y+'/'+String(state.extra.m).padStart(2,'0'));
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
    // #549 item (31) THE BAD MORNING antagonist A measured: every month but one answers 503.
    if(state.failExcept&&state.failExcept!==(y+'/'+String(mo).padStart(2,'0')))
      return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    let n=0;
    if(state.extra&&y===state.extra.y&&mo===state.extra.m)n=state.extra.n;
    else if(state.mixed)n=(who===state.mixed.thin)?state.mixed.per:state.mixed.busyPer;   // #432 two accounts, two bounds
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
// #549 item (31): THE STORE IS READ THROUGH L.acctGames, because the app now keeps the games in IndexedDB and
// migrates ct_acctgames out of localStorage on launch - reading localStorage here would report every store as empty.
// `held` is per account {n, old}: the row count and the oldest row's date, passed INTO the page so the date string
// is formatted by the same browser, locale and time zone that formats the app's own line.
// #549 item (78): THE LIST RENDERS ONE PAGE (GLIST_PAGE) and offers "Show N more games" below it, so `rows` here is every row a
// player can REACH: the page control is tapped until it is gone before anything is counted, and how many taps that took rides on
// the reading (r.pages). Without this every assertion below that compares rows on screen with rows stored would be measuring the
// page size. The page itself is asserted where it is the subject, in A24.
async function showAll(b){let n=0;
  for(;n<40;n++){const hit=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^Show \d+ more games/.test((e.textContent||'').trim()));if(!x)return false;x.click();return true;});
    if(!hit)break;await b.settle(120);}
  return n;}
async function READ(b){
  const pages=await showAll(b);
  const AG=await L.acctGames(b.page);
  const held={};Object.keys(AG.map).forEach(id=>{const rs=AG.map[id]||[];let old=0;rs.forEach(g=>{const d=(g&&g.date)||0;if(d>0&&(!old||d<old))old=d;});held[id]={n:rs.length,old};});
  const r=await b.page.evaluate(([NEW_LABEL,AGM,held])=>{
    const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
    const labels=rows.map(r=>{const m=(r.innerText||'').replace(/\s+/g,' ').match(/·\s([A-Z][a-z]{2})\s(\d{1,2})/);return m?m[1]:null;});
    let bytes=0,keys={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const v=localStorage.getItem(k)||'';bytes+=k.length+v.length;keys[k]=v.length;}
    let stored=0,storedMonths={};try{const M=AGM||{};Object.keys(M).forEach(id=>{(M[id]||[]).forEach(g=>{stored++;const d=new Date(g.date||0);storedMonths[d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')]=1;});});}catch(e){}
    const heldDates={};Object.keys(held||{}).forEach(id=>{if(held[id].old>0)heldDates[id]=new Date(held[id].old).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});});
    // the OLDEST ROW ON SCREEN, as the row prints it ("Aug 1"): the readout A11h checks the line's date against
    const lastMD=(()=>{const rr=[...document.querySelectorAll('[data-ct="game-row"]')];if(!rr.length)return null;const m=(rr[rr.length-1].innerText||'').replace(/\s+/g,' ').match(/·\s([A-Z][a-z]{2}\s\d{1,2})/);return m?m[1]:null;})();
    const body=(document.body.innerText||'').replace(/\s+/g,' ');
    const sc=document.querySelector('[data-ct="game-row"]')?document.querySelector('[data-ct="game-row"]').parentElement:null;
    return {rows:rows.length, outside:labels.filter(x=>x&&x!==NEW_LABEL).length, inNewest:labels.filter(x=>x===NEW_LABEL).length,
      distinct:[...new Set(labels.filter(Boolean))].sort(), bytes, acctBytes:JSON.stringify(AGM||{}).length, lsAcctBytes:keys['ct_acctgames']||0, stored, heldDates, lastMD,
      storedMonths:Object.keys(storedMonths).sort(),
      // THE WHOLE BODY, NOT ITS FIRST 2000 CHARACTERS [#547, item (14); jobs/gate-61-a15b-cannot-be-red-while-a15a-is-
      // green-and-its-comment-names-an-impossible-mechanism-2026-10-06]. A15a, A15c, A7b, A7c and A14b test the body for a
      // limit or gap sentence, and with the cap a sentence rendered after 2000 characters of row text was invisible to all of
      // them - safe only because the games-cap div precedes the row list in DOM order, which nothing asserted. Every print of
      // r.body in this file slices its own excerpt, so the log does not grow. bodyLen is reported so a reader can see
      // whether the old cap would have bitten.
      body, bodyLen:body.length,
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
        // #549 item (31) and the merged-list wording ("Games back to <date>; older ones aren't loaded.").
        const LIMIT=/(?:up to|at most|limit)\s+[\d][\d,]*\s+games|last\s*\d+\s*months|months of play|couldn.t be loaded|older (?:ones|games) aren.t loaded|games back to/i;
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
        // ── #544, item (5) of this job's remainder: IS THE LINE READABLE, measured rather than inferred.
        // [jobs/gate-61-storage-and-cap-assertions-cannot-fail-as-written-2026-09-29, the A3b half.] A3b's name
        // is "a cap of at least N is stated on screen as READABLE TEXT" and it matched CAP_RE against
        // document.body.innerText alone - no element, no rect, no visibility, no reachability. Antagonist B
        // measured the sentence it certifies at 4.37:1 contrast and, at 320x568 on first paint, 93% below the
        // fold, and A3b passed 6 of 6. The string is genuinely present; present in innerText is not readable.
        // THIS IS COMPUTED INSIDE THE SAME EVALUATE AS EVERY OTHER NUMBER IN THIS READING, and `cap` is the LAST
        // key of the returned object, so the scroll probe below runs after everything else is captured. Doing it
        // in a second evaluate after input() returns would have measured a DIFFERENT SCREEN: input() reloads the
        // page with the stub refusing before it returns (that is what A5 reads), so the live page at assertion
        // time is the post-reload state and r.cap is the state before it.
        // AND IT IS REACHABILITY, NOT ABOVE-THE-FOLD, WHICH IS WHERE THIS JOB'S OWN PRESCRIPTION IS WRONG. The
        // job asks for "rect, visibility, above-the-fold and contrast terms". CLAUDE.md: "'Below the fold' is
        // not 'unreachable'" - asserting above-the-fold produced TWO false P0s in one night (#380's ... sheet,
        // #382's Review entry screen), and this app scrolls inside #root by design. So the fold is REPORTED
        // (top, bottom, vh) and the ASSERTION is the empirical test gates/regress/40-reachability.js is the
        // reference for: collect only the USER-scrollable ancestors (computed overflowY auto or scroll, with
        // room to scroll), actually scroll them, re-read the rect, and put every scrollTop back. Not
        // scrollIntoView, which scrolls an overflow:hidden box a finger cannot move and therefore always says
        // yes; and not "some scrollable ancestor exists", which certifies content it does not contain.
        // CONTRAST IS ALREADY ASSERTED BY A7e, A7f, A9b AND A12c over this same element, so `ratio` is carried
        // into A3b's data and A3b asserts it too - the same measurement, not a second instrument.
        const vis=(()=>{
          if(!el)return {painted:false,visible:false,onScreen:false,reachable:false,scrollers:0,vh:innerHeight};
          let hidden=false;
          for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s2=getComputedStyle(n);
            if(s2.display==='none'||s2.visibility==='hidden'||parseFloat(s2.opacity)===0){hidden=true;break;}}
          const r0=el.getBoundingClientRect(), vh=innerHeight, vw=innerWidth;
          const painted=r0.width>0.5&&r0.height>0.5;
          const onScreen=r0.bottom>0.5&&r0.top<vh-0.5&&r0.right>0.5&&r0.left<vw-0.5;
          const scs=[];let q=el.parentElement;
          while(q&&q!==document.documentElement){const s3=getComputedStyle(q);
            if(/auto|scroll/.test(s3.overflowY)&&q.scrollHeight>q.clientHeight+1)scs.push(q);q=q.parentElement;}
          const saved=scs.map(x=>x.scrollTop);
          for(let i=scs.length-1;i>=0;i--){const x=scs[i];
            const xr=x.getBoundingClientRect(),er=el.getBoundingClientRect();
            x.scrollTop=Math.max(0,Math.min(x.scrollHeight-x.clientHeight,x.scrollTop+(er.bottom-xr.bottom)+8));}
          const r1=el.getBoundingClientRect();
          const reached=onScreen||(r1.bottom<=vh+0.5&&r1.top>=-0.5&&r1.height>0.5);
          scs.forEach((x,i)=>{x.scrollTop=saved[i];});
          return {painted,visible:!hidden,onScreen,reachable:!!reached,scrollers:scs.length,
                  top:Math.round(r0.top),bottom:Math.round(r0.bottom),
                  afterTop:Math.round(r1.top),afterBottom:Math.round(r1.bottom),vh,
                  movedByScrolling:Math.round(r0.top-r1.top)};})();
        return {vis, present:!!el, text:el?(el.textContent||'').trim():null, h:el?Math.round(el.getBoundingClientRect().height*10)/10:0,
                lh:el?Math.round((parseFloat(getComputedStyle(el).lineHeight)||0)*10)/10:0,
                ratio:ratio(el), countRatio:ratio(cnt)};})()};
  },[NEWEST.label,AG.map,held]);
  r.storeFrom=AG.from; r.migrated=AG.migrated; r.idbMap=AG.idb; r.pages=pages;
  return r;
}

// one input: seed s, n accounts. Returns the reading plus the post-reload reading (A5).
// THE READING WAITS FOR THE ROWS, NOT FOR A CLOCK [#546, item (73); jobs/gate-61-a7a-at-three-accounts-and-a9a-differ-
// between-two-identical-runs-2026-10-03]. Two runs of this gate on one bundle disagreed on A7a at three accounts and on A9a,
// because the read was taken a fixed settle after the LAST Fetch tap while that account's fetch could still be landing.
// This polls until the Fetch control is back (the app paints '…' while ccLoading) AND the total row count in
// ct_acctgames has held still for three reads 250ms apart - or it times out at 20s, which
// the caller NOTES so a reading taken anyway is never silent.
async function rowsSettled(b,nAccts){
  let last=-1,same=0,read=null;
  for(let i=0;i<80;i++){
    const _AG=await L.acctGames(b.page);   // #549 item (31): the store is IndexedDB now
    read=await b.page.evaluate((M)=>{
      const ids=Object.keys(M);let rows=0;ids.forEach(id=>{rows+=(M[id]||[]).length;});
      // THE ACCOUNT COUNT IS REPORTED, NOT WAITED ON: an account whose fetch returns no games is stored in NEITHER
      // ct_acctgames NOR ct_accts (measured on the 'empty-window' input, which waited the full 20s on both), so the
      // settle condition is 'Fetch is idle and the row count held still', and accts rides along for the reader.
      let A=[];try{A=JSON.parse(localStorage.getItem('ct_accts')||'[]');}catch(e){}
      const idle=[...document.querySelectorAll('button')].some(x=>(x.textContent||'').trim()==='Fetch'&&x.offsetParent!==null&&!x.disabled);
      return {accts:Array.isArray(A)?A.length:0,rows,idle};},_AG.map);
    if(read.idle&&read.rows===last){if(++same>=3)return Object.assign({ok:true,polls:i+1,acctsWanted:nAccts},read);}else same=0;
    last=read.rows;await b.settle(250);
  }
  return Object.assign({ok:false,polls:80},read||{});
}
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
  const settled=await rowsSettled(b,added);
  // A SETTLE THAT TIMED OUT IS A RED, NOT A NOTE [#547, item (25); jobs/gate-61-a7a-at-three-accounts-and-a9a-differ-between-
  // two-identical-runs-2026-10-03]. It was an L.note, so an unsettled three-account reading was taken anyway and every
  // assertion below it judged an unstable state silently. The reading is still taken, so the rest of the file runs.
  L.say(settled.ok,'A0s '+name+': the rows SETTLED before the reading - Fetch idle and the stored row count held still for three reads 250ms apart, inside 20s',settled);
  const r=await READ(b);
  r.settled=settled;
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
    // ── A3b REWRITTEN [#544, item (7) of directOpening_2026_10_28_batch4; the A3b half of
    //    jobs/gate-61-storage-and-cap-assertions-cannot-fail-as-written-2026-09-29].
    //    IT WAS `!!capN&&capN>=MIN_CAP` over document.body.innerText, under the name "stated on screen as
    //    READABLE TEXT". Four things it did not ask: which element says it, whether that element is painted,
    //    whether it is visible, and whether a finger can reach it. Antagonist B measured the sentence it
    //    certifies at 4.37:1 and 93% below the fold at 320x568 on first paint, and A3b passed 6 of 6.
    //    IT NOW ASKS THE LINE. capLine is CAP_RE against the located element's own text, and the terms are the
    //    element's: painted (a non-degenerate rect), visible (no display:none, visibility:hidden or opacity 0
    //    on it or any ancestor), reachable (user-scrollable ancestors actually scrolled and the rect re-read -
    //    NOT above-the-fold, see the comment in READ), and contrast at AA, which is the same reading A7e
    //    asserts over the same element rather than a second instrument.
    //    THE BODY TEXT IS KEPT AS A SEPARATE, REPORTED READING AND A3b-x IS WHAT TELLS THE TWO APART: a cap
    //    stated somewhere in the body but NOT on the located line is the state where the old assertion was
    //    satisfied and the new one is not, so it is named rather than folded into A3b's own data.
    //    #549 item (31): THE CLAIM IS NOW WHAT IS HELD, NOT A CAP. Every account in these inputs is cut (300+ games
    //    against a walk of 200), so the line must name the date of each account's oldest HELD game, measured out of
    //    the store; the readability terms are unchanged.
    const capLine=((r.cap&&r.cap.text)||'').match(CAP_RE);
    const capLineN=capLine?parseInt(capLine[1].replace(/,/g,''),10):null;
    const cv=(r.cap&&r.cap.vis)||{};
    const h3=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},Object.keys(r.heldDates||{}));
    L.say(h3.ok&&cv.painted===true&&cv.visible===true&&cv.reachable===true
          &&!!r.cap.ratio&&r.cap.ratio.r>=4.5,
      'A3b TC-R35(ii) '+tag+': what the list HOLDS is stated as READABLE text - the located line names the date of each account\'s oldest held game and says older ones are not loaded, painted, visible, reachable by a finger and at WCAG AA',
      {held:h3,statedOnLine:capLine?capLine[0]:'NONE',statedInBody:cap||'NONE',line:r.cap&&r.cap.text,
       painted:cv.painted,visible:cv.visible,onScreenAtRest:cv.onScreen,reachable:cv.reachable,
       userScrollableAncestors:cv.scrollers,movedByScrolling:cv.movedByScrolling,
       top:cv.top,bottom:cv.bottom,viewportH:cv.vh,ratio:r.cap&&r.cap.ratio?r.cap.ratio.r:null,minRatio:4.5,
       accepts:'Games back to <oldest held date>; older ones aren\'t loaded.'});
    L.say(!(capN&&!capLineN),'A3b-x TC-R35(ii) '+tag+': the cap is not stated SOMEWHERE IN THE BODY while the located limit line says something else - which is the state the old body-text-only A3b could not tell from a readable sentence',{inBody:cap||'NONE',onLine:capLine?capLine[0]:'NONE',line:r.cap&&r.cap.text});
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
      // #549 item (31): the month window is no longer printed; what is stated is the oldest held date, which in
      // this input IS the month window's reach (nothing older was ever fetched), so the claim is still the bound.
      const h7=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},Object.keys(r.heldDates||{}));
      // A7b GAINS A3b's READABILITY TERMS [#544, item (7)]: this job's remainder says "A7b and A7c need the
      // same". A7b yes - it is a POSITIVE claim that the screen states something, and an unreadable sentence
      // does not state it. A7c NO, AND THAT IS A DELIBERATE DEPARTURE FROM THE JOB'S WORDING, measured
      // against the mechanism rather than taken as a prescription: A7c is a NEGATIVE claim ("the screen does
      // NOT state a games cap as the bound"), and narrowing a negative from the whole body to one element
      // WEAKENS it - a cap sentence anywhere on the screen is the defect, wherever it is painted. That is
      // #394's containment trap pointed the other way: the thing being excluded must not be allowed to hide
      // outside the box the assertion looks in. A7c stays body-wide, and this is the record of why.
      const a7v=(r.cap&&r.cap.vis)||{};
      L.say(h7.ok&&!mn&&a7v.painted===true&&a7v.visible===true&&a7v.reachable===true,'A7b US-R25 '+tag+': the screen states how far back the HELD list reaches - the oldest held date of each account, which is where the month window stopped the walk - and no longer a months-of-play window, which is not true of a merged list; READABLY: painted, visible and reachable by a finger',{held:h7,monthsOfPlay:mn?+mn[1]:null,calendarClaim:(r.body||'').match(CAL_RE)?((r.body||'').match(CAL_RE))[0]:'none',locatedLine:r.cap.text,painted:a7v.painted,visible:a7v.visible,onScreenAtRest:a7v.onScreen,reachable:a7v.reachable,userScrollableAncestors:a7v.scrollers,movedByScrolling:a7v.movedByScrolling});
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
      L.say(!!r.afterBody&&HELD_OK(r.afterCap&&r.afterCap.text,r.heldDates||{},Object.keys(r.heldDates||{})).ok&&!(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i).test(r.afterBody),'A7h US-R25 '+tag+': after the reload the screen STILL states the held list\'s reach (the same oldest dates) and still does NOT state a games cap - the wording does not degrade to the games wording on the persisted path',{afterLine:r.afterCap&&r.afterCap.text,afterReloadMonths:(r.afterBody||'').match(PLAY_RE)?((r.afterBody||'').match(PLAY_RE))[0]:'none',afterReloadGamesCap:(r.afterBody||'').match(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i)?((r.afterBody||'').match(/(?:up to|at most|limit)\s+[\d][\d,]*\s+games/i))[0]:'no'});
      L.say(!gc,'A7c US-R25 '+tag+': the screen does NOT state a games cap as the bound, because the games cap is not what stopped the walk',{matchedGamesCap:gc?gc[0]:'no',locatedLine:r.cap.text});
      L.say(!!r.cap.ratio&&r.cap.ratio.r>=4.5,'A7e '+tag+': the limit line meets WCAG AA for normal text (>= 4.5:1) against everything painted behind it',r.cap.ratio?{...r.cap.ratio,min:4.5}:{ratio:null,min:4.5});
    }else{
      // A7d IS THE 24.8px, AS A PROPERTY RATHER THAN AS A PIXEL COUNT. Nothing was cut, so there is no limit
      // to state, so the line must not be rendered at all - which is what gives the shortest screens their
      // height back. Asserting "absent" is only safe because A7b above proves the same element IS rendered
      // in the state that needs it; absence with no presence anywhere is the unfalsifiable shape [#385].
      // Absence is asserted on BOTH the element and the body [R: absence must list what was checked]: a
      // missing data-ct alone is satisfied by any bundle that never had the attribute, #431 included.
      L.say(r.cap.present===false&&!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),'A7d '+tag+': NO limit line is rendered and NO limit sentence is anywhere on the screen when nothing bound the list, so it costs no height on a history that fits',{element:r.cap.present,heightPx:r.cap.h,gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthsInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
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
          const h8=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},['cc:me']);
          L.say(h8.ok,'A8a US-R25 '+tag+': the cut is STILL stated after an upgrade - an account at the cap was cut by the cap, which is inferable from the old store alone, so the line says how far back the held games reach and that older ones are not loaded [#549 item (31): the date, not the cap]',{held:h8,gamesCap:gc?gc[0]:'none',note:t.why,store:r.storeFrom});
        }else{
          L.say(!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),'A8b US-R25 '+tag+': NO limit is stated when the old store cannot say which bound applied - a limit the app cannot know bound is not one it may claim',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthsInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no',note:t.why});
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
    const settledM=await rowsSettled(b,2);
    L.say(settledM.ok,'A0s mixed-bounds: the rows SETTLED before the reading (Fetch idle, row count still for three reads, inside 20s), so A9 below reads a stable state [#547 item (25)]',settledM);
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
      // #549 item (31): the two accounts were cut by different bounds and so reach back to DIFFERENT dates; the only
      // sentence true of both names each account with its own oldest held date. A bare single date is false for one.
      const h9=HELD_OK(t,r.heldDates||{},Object.keys(r.heldDates||{}));
      const dd9=[...new Set(Object.values(r.heldDates||{}))];
      L.say(h9.ok&&dd9.length===2,
        'A9a US-R25 MIXED: with accounts stopped by different bounds the line names EACH account with how far back ITS held games reach, because that is the only statement true of every account - one date "per account" would be false for the other',
        {held:h9,distinctOldestDates:dd9,line:t});
      L.say(r.cap&&r.cap.ratio&&r.cap.ratio.r>=4.5,'A9b MIXED: the line still meets WCAG AA',r.cap&&r.cap.ratio?{...r.cap.ratio,min:4.5}:{ratio:null});
    }
    await b.close();
  }

  // ── A18 #547 item (61), MIXED SOURCES [jobs/mixed-source-accounts-get-one-limit-sentence-that-is-false-for-one-of-them-2026-09-29].
  //    A9 mixes two CHESS.COM accounts. The case the job is about mixes SOURCES: a thin chess.com account stopped by the
  //    month window beside a LICHESS account stopped by games - and Lichess has no month window at all (one request,
  //    max=ACCT_GMAX), so a line naming months alone is false for it. No gate stubbed lichess.org before this block: the
  //    stub below serves ACCT_GMAX (200) ndjson games for one user and counts its own requests, which is the vacuity
  //    guard. The wording was settled at #432 as "name both limits"; this is the input that exercises it across sources.
  {
    const LIU='listubuser';let liHits=0;
    const state={seed:'b',hits:[],refuse:false,thin:{months:24,per:5}};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_liuser:LIU,ct_accts:'[]',ct_acctgames:'{}'},name:'mixed-source'});
    await stub(b,state);
    await b.ctx.route(/lichess\.org\/api\/games\/user\//,route=>{liHits++;const lines=[];
      for(let i=0;i<200;i++){const dd=String(1+i%27).padStart(2,'0');
        const pgn='[Event "Rated blitz game"]\n[Site "https://lichess.org/stub'+i+'"]\n[Date "2026.08.'+dd+'"]\n[White "'+LIU+'"]\n[Black "liopp'+i+'"]\n[Result "1-0"]\n\n'+MOVES+'\n';
        const t=Date.UTC(2026,7,1+i%27,12,i%60);
        lines.push(JSON.stringify({id:'stub'+i,pgn,players:{white:{user:{name:LIU}},black:{user:{name:'liopp'+i}}},winner:'white',speed:'blitz',createdAt:t,lastMoveAt:t}));}
      return route.fulfill({status:200,contentType:'application/x-ndjson',body:lines.join('\n')+'\n'});});
    await b.open(); await b.tile('Review'); await b.settle(2500);
    const settledS=await rowsSettled(b,2);
    L.say(settledS.ok,'A0s mixed-source: the rows SETTLED before the reading (Fetch idle, row count still for three reads, inside 20s)',settledS);
    const r=await READ(b);
    const caps=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_acctcap')||'{}');}catch(e){return {};}});
    L.note('MIXED SOURCES  rows '+r.rows+'  lichess requests '+liHits+'  ct_acctcap '+JSON.stringify(caps)+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    L.say(settledS.accts===2,'A18-0c MIXED-SOURCE: BOTH accounts are in the account list (ccAccts) - on main the two fetches raced and the second store rebuilt the list from a stale [] and dropped the first, so the line was computed over one account [#547 item (61)]',{accts:settledS.accts,wanted:2});
    L.say(liHits>=1,'A18-0a vacuity MIXED-SOURCE: the Lichess stub was actually asked ('+liHits+' request(s)), so a Lichess account is in the list',{liHits});
    const ks=Object.keys(caps);const liK=ks.filter(k=>/^li/i.test(k)),ccK=ks.filter(k=>!/^li/i.test(k));
    const a0=L.say(liK.some(k=>caps[k]==='games')&&ccK.some(k=>caps[k]==='months'),
      'A18-0b vacuity MIXED-SOURCE: the Lichess account was stopped by GAMES and the chess.com account by MONTHS, so the line is made to cover two sources with two different bounds',{acctcap:caps});
    if(a0){
      const t=(r.cap&&r.cap.text)||'';
      const h18=HELD_OK(t,r.heldDates||{},Object.keys(r.heldDates||{}));
      L.say(h18.ok&&Object.keys(r.heldDates||{}).length===2,
        'A18a US-R25 MIXED-SOURCE: the line covers BOTH accounts - the chess.com one the month window cut and the Lichess one its 200-game request cut - each with the date its held games reach back to, so it is not false for either [#549 item (31)]',
        {held:h18,line:t});
    }
    L.say(b.errs.length===0,'A18 mixed-source: zero app errors',b.errs.slice(0,3));
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
          L.say(OLDER_RE.test(r.body||''),'A10a US-R25 '+tag+': a cut IS stated - a legacy account sitting at the cap of the build that wrote it was cut by that cap, and that is inferable without a re-fetch',{stated:(r.body||'').match(OLDER_RE)?((r.body||'').match(OLDER_RE))[0]:'NONE',line:r.cap&&r.cap.text,note:t.why});
          // #433 A10c. A10a ASKS ONLY WHETHER A SENTENCE IS THERE, AND THAT IS HOW THE WRONG NUMBER GOT
          // THROUGH IT. #432 inferred 'games' from this exact store and then printed today's ACCT_GMAX, so
          // 40 rows cut at 40 read "Showing up to 200 games per account." - A10a is green on that, because
          // a limit is indeed stated. The number a legacy store can justify is the cap of the build that
          // WROTE it, and the only one it can ever have been is 40. Asserted against the ROW COUNT on
          // screen rather than against a constant this gate holds: whatever number the line names must be
          // the number of rows the store was cut at, which is a fact about this input and not about the app.
          // #549 item (31): what is stated is no longer a cap number but the date the held games reach back to, and
          // the same rule applies to it: it must be the store's OWN oldest row, measured, and no cap number may be
          // printed - neither ACCT_GMAX nor the legacy 40 is a limit on what a merged list holds.
          {const gcm=(r.body||'').match(CAP_RE);const stated=gcm?+String(gcm[1]).replace(/,/g,''):null;
           const h10=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},['cc:me']);
           L.say(h10.ok&&stated===null,'A10c US-R25 '+tag+': the date stated is the oldest game THIS store holds, and no cap number is printed as the bound of a held list',{held:h10,capNumberStated:stated,rowsOnScreen:r.rows,line:r.cap&&r.cap.text});}
        }else
          L.say(!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),'A10b US-R25 '+tag+': NO limit is stated below every cap this app has shipped, because nothing is known to have been cut',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',note:t.why});
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
      // #549 item (31): the bound is stated as the oldest HELD date, measured from the store - which on a sparse index
      // is the oldest of the 6 entries walked, so the units question A11c guards cannot arise from this wording.
      const h11=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},Object.keys(r.heldDates||{}));
      L.say(h11.ok&&!pl,'A11d US-R25 '+tag+': the bound IS stated, as the date the held games reach back to (the oldest of the '+GMONTHS+' entries walked), and no months-of-play count is printed',{held:h11,monthsOfPlay:pl?+pl[1]:null,line:r.cap&&r.cap.text});
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
      // #549 item (31): THE DATE IS THE MEASURED ONE, against a second readout: the oldest ROW ON SCREEN prints its own
      // month and day ("Aug 1"), so the line's date must begin with exactly that.
      {const c11=HELD_CLAIM(r.cap&&r.cap.text)||[];const md=c11.length===1?c11[0].d.replace(/, \d{4}$/,''):null;
       L.say(GAP_RE.test(r.body||'')||(!!md&&md===r.lastMD),'A11h US-R25 '+tag+': THE DATE IS THE MEASURED ONE - the date the line names is the date the oldest row on screen prints',{claimed:c11,claimedMonthDay:md,oldestRowOnScreen:r.lastMD,gapClaimed:GAP_RE.test(r.body||'')});}
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
      L.say(!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),'A12b US-R25 '+tag+': and it names NO limit as the bound, because neither bound was reached - the index ran out',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthClaimInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
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
      L.say(!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),'A13b US-R25 '+tag+': and names no limit, because the index ran out rather than either bound being reached',{gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthClaimInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
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
      // #549 item (103): kunalold is stamped as fetched just now, so the once-a-day follow refresh (A24) leaves it alone and this
      // block still reads a legacy store beside one fetched account - which is its subject - and not a refreshed legacy store.
      store:{ct_ccuser:ACCTS[0],ct_accts:['cc:kunalold'],ct_acctgames:{'cc:kunalold':legacy},ct_acctfresh:{'cc:kunalold':{ok:Date.now(),at:Date.now()}}}});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2400);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='LEGACY 40 (no ct_acctcap) BESIDE a fetched account the MONTH window bound';
    L.note(tag+'  rows '+r.rows+'  limit line '+JSON.stringify(r.cap&&r.cap.text));
    // the precondition, asserted rather than assumed: both shapes really are present at once.
    if(L.say(r.rows===40+GMONTHS*THIN_PER,'A14-0 vacuity '+tag+': both accounts are on screen at once - 40 legacy rows plus the '+(GMONTHS*THIN_PER)+' the month window allowed',{rows:r.rows,expect:40+GMONTHS*THIN_PER})){
      // #549 item (31): both accounts are cut, by different bounds, back to different dates - so each is named with its own.
      const gc=(r.body||'').match(CAP_RE);const stated=gc?+String(gc[1]).replace(/,/g,''):null;
      const hAll=HELD_OK(r.cap&&r.cap.text,r.heldDates||{},Object.keys(r.heldDates||{}));
      const ent=(u)=>((HELD_CLAIM(r.cap&&r.cap.text)||[]).find(e=>e.u===u)||null);
      const hL={entry:ent('kunalold'),want:(r.heldDates||{})['cc:kunalold']},hF={entry:ent(ACCTS[0]),want:(r.heldDates||{})['cc:'+ACCTS[0]]};
      L.say(!!hL.entry&&hL.entry.d===hL.want&&hL.want!==hF.want,'A14a US-R25 '+tag+': the LEGACY account is named with the date ITS held games reach back to - not a cap, and not the other account\'s date',{held:hL,line:r.cap&&r.cap.text});
      L.say(!!hF.entry&&hF.entry.d===hF.want&&hAll.ok,'A14b US-R25 '+tag+': and the FETCHED account is named with its own date too, so the sentence is true of both and names nothing else',{fetched:hF,all:hAll,line:r.cap&&r.cap.text});
      const pl2=(r.body||'').match(PLAY_RE);
      L.say(stated===null&&!pl2,'A14c US-R25 '+tag+': and neither the legacy cap of 40, nor the walk\'s 200, nor its month window is printed - none of them bounds what a merged list holds',{capNumberStated:stated,monthsOfPlay:pl2?+pl2[1]:null,line:r.cap&&r.cap.text});
    }
    await b.close();
  }

  // ── A15 #478, EXACTLY AT THE CAP WITH THE INDEX EXHAUSTED. TC-R35's FIRST INPUT, WHICH HAS NEVER BEEN
  //    BUILT, and the only assertion in this file that can hold the #433 guard
  //    `cutByGames = games.length>=ACCT_GMAX && (leftover||i>=0)` [chess.jsx:4219].
  //    JOB: jobs/the-bound-records-how-the-walk-exited-not-whether-anything-was-cut-2026-09-29, whose
  //    outcome.whatIsLeft names this input in exactly these words: "no fetched fixture reaches exactly
  //    ACCT_GMAX with the index exhausted and asserts that NO limit is stated".
  //
  //    WHY NO EXISTING ASSERTION REACHES IT, counted rather than asserted [R07]: of the 51 assertion ids in
  //    this file, THREE touch the no-limit-stated state and none of them is at the cap. A7d is an EXHAUSTED
  //    index UNDER the cap (T2: 3 months x 5 = 15 rows, so games.length>=ACCT_GMAX is false and the guard is
  //    never evaluated). A12b and A13b are exhausted indexes with a month that FAILED, so `missed` is
  //    non-zero and the suffix, not the bound, is what those rows are about. The nine dense inputs all
  //    concentrate 300+ games in the five months before the newest, so the walk always stops on GAMES with
  //    rows left behind - `leftover` true - which is the arm that SHOULD state a cap. The one state where
  //    the left operand is true and the right operand is false has no input in this file, so
  //    `&&(leftover||i>=0)` can be deleted today and all 51 assertions stay green.
  //
  //    THE FIXTURE IS FOUR ENTRIES OF FIFTY, AND THE ARITHMETIC IS THE WHOLE DESIGN. 4 x 50 = 200 = the
  //    pinned MIN_CAP, which equals ACCT_GMAX on main. Four entries is under ACCT_GMONTHS=6, so the month
  //    window cannot bind and cannot be confused for the cap. Fifty divides the cap exactly, so the inner
  //    `for(k=0;k<mg.length&&games.length<ACCT_GMAX;k++)` consumes the last month WHOLE and `leftover`
  //    stays false - the single condition that distinguishes this input from every other one here. The
  //    index then exhausts (i reaches -1) and `bound` must read 'all'.
  //
  //    THE CAP IS A PINNED NUMBER AND A15-0 IS WHAT MAKES THAT SAFE. This gate has no access to the app's
  //    constants (see the note at A7a) and on this input the screen states NO cap by design, so there is
  //    nothing on screen to read the cap off - the fixture has to pin it. If a build moves ACCT_GMAX, the
  //    fixture no longer lands exactly on it, rows stop equalling MIN_CAP, and A15-0 goes red and skips the
  //    rest rather than letting A15a pass for the wrong reason. A pinned number whose vacuity guard detects
  //    its own staleness is not the same thing as a pinned number that is trusted [R18].
  {
    const EXACT_MONTHS=4, EXACT_PER=MIN_CAP/EXACT_MONTHS;          // 4 x 50 = 200, exactly the cap
    const state={seed:'b',hits:[],refuse:false,thin:{months:EXACT_MONTHS,per:EXACT_PER}};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'exact-cap-exhausted'});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2600);
    const r=await READ(b); r.hitCount=state.hits.length;
    const tag='EXACT CAP: '+EXACT_MONTHS+' entries x '+EXACT_PER+' = '+MIN_CAP+' games, the index exhausted and nothing left behind';
    L.note(tag+'  rows '+r.rows+'  requests '+r.hitCount+'  limit line '+JSON.stringify(r.cap&&r.cap.text)+'  months on screen '+JSON.stringify(r.distinct));
    // A15-0 IS THE VACUITY GUARD AND THE PROOF THE STATE WAS REACHED, and it carries three facts rather
    // than one, because each of the three is a different way this input could silently become a different
    // input: the row count lands EXACTLY on the cap (not above, which would mean rows were left behind, and
    // not below, which would mean the walk stopped early or ACCT_GMAX moved); every listed month was asked
    // for, so the index really did exhaust rather than the walk stopping on the month window; and all four
    // months are on screen, so nothing was dropped.
    const reqd=1+EXACT_MONTHS;                                     // the archives index, then each month once
    if(L.say(r.rows===MIN_CAP&&r.hitCount===reqd&&r.distinct.length===EXACT_MONTHS,
       'A15-0 vacuity '+tag+': the walk landed EXACTLY on '+MIN_CAP+' rows with all '+EXACT_MONTHS+' listed months requested and on screen, which is the state the guard is about',
       {rows:r.rows,expect:MIN_CAP,requests:r.hitCount,expectRequests:reqd,monthsOnScreen:r.distinct,hits:state.hits.slice(0,6)})){
      // A15a IS THE ASSERTION THE JOB ASKS FOR. Reaching the cap is not being cut by it: the fourth entry
      // was consumed whole and the index ran out, so nothing was withheld from this player and there is no
      // limit to state. Read off the BODY as well as the element, because #432's own negative control
      // proved that an assertion reading only the attribute the fix adds goes PASS on the bundle that
      // states the cap wrongly.
      L.say(r.cap.present===false&&!CAP_RE.test(r.body||'')&&!ANY_LIMIT_RE.test(r.body||''),
        'A15a US-R25 '+tag+': NO limit line is rendered and NO limit sentence is anywhere on screen - the whole history was fetched, so a cap that was reached but did not withhold anything may not be claimed as the bound',
        {element:r.cap.present,line:r.cap.text,heightPx:r.cap.h,bodyLen:r.bodyLen,gamesCapInBody:(r.body||'').match(CAP_RE)?((r.body||'').match(CAP_RE))[0]:'no',monthClaimInBody:(r.body||'').match(MONTH_RE)?((r.body||'').match(MONTH_RE))[0]:'no'});
      // A15b: and no GAP is claimed either. Every one of the four months answered 200 with 50 usable rows, so
      // `missed` is 0 and the '+gap' suffix must be absent. A REDUNDANT ARM OVER A15a, AND SAID SO [#545, item (72);
      // jobs/gate-61-a15b-cannot-be-red-while-a15a-is-green-and-its-comment-names-an-impossible-mechanism-2026-10-06].
      // This comment used to claim A15b catches what A15a would miss - "a build that made `missed` count successful
      // months would turn A15a's silence into a gap sentence and A15a alone would still be green". The app cannot
      // produce that: the gap sentence has ONE source and renders ONLY inside <div data-ct="games-cap">, and this
      // gate's locator (with LIMIT itself matching "couldn't be loaded") finds that element whenever GAP_RE matches
      // the body, which falsifies A15a's own r.cap.present===false. So A15b can never be red while A15a is green.
      // It is kept because it is cheap and names the gap half explicitly in the log, NOT as an independent guard.
      // The guard that would be independent - the gap suffix's absence after a month that failed and then
      // recovered - needs a recovery state the drivers here do not have, and is recorded on that job.
      L.say(!GAP_RE.test(r.body||''),'A15b US-R25 '+tag+': and NO gap is claimed - all four listed months answered with their full fifty rows, so there is nothing to disclose (a redundant arm over A15a, which already fails if a gap sentence renders; see the comment)',{bodyHasGap:GAP_RE.test(r.body||''),line:r.cap.text});
      // A15c THE SAME STATE AFTER A RELOAD WITH THE NETWORK REFUSING, which is where this input collides
      // with A8a and why it is worth the extra reading. A8a requires that an account sitting at ACCT_GMAX
      // rows in a LEGACY store (no ct_acctcap entry) still states the cap, because at the cap and with no
      // recorded bound the cut IS inferable. This account also holds exactly ACCT_GMAX rows - and it was
      // NOT cut. The two are only compatible because the recorded bound exists here and governs; if the
      // row-count fallback were ever allowed to override a recorded 'all', A8a's rule would start printing
      // a limit over a complete history. THAT IS THE CONTRADICTION THIS ASSERTION PINS [R45], and it is the
      // one pair of rules in this file that can be jointly impossible.
      state.refuse=true;
      await b.open(); await b.tile('Review'); await b.settle(1600);
      const after=await READ(b);
      if(L.say(after.rows===MIN_CAP,'A15c-0 vacuity '+tag+': the reload re-rendered all '+MIN_CAP+' rows out of localStorage with the network refusing, so the reading below is of the stored state and not of a re-fetch',{rows:after.rows,expect:MIN_CAP,err:after.err})){
        L.say(after.cap.present===false&&!CAP_RE.test(after.body||''),
          'A15c US-R25 '+tag+': and STILL no limit after a reload from the store - the recorded bound governs, so the at-the-cap row-count fallback A8a relies on does not override a history that was complete',
          {element:after.cap.present,line:after.cap.text,storedRows:after.stored,gamesCapInBody:(after.body||'').match(CAP_RE)?((after.body||'').match(CAP_RE))[0]:'no'});
      }
    }
    await b.close();
  }

  // ── A6, the geometry sweep. This gate's subject is data, not pixels, so the matrix above runs at Kunal's
  //    375x730 and the WIDTH-sensitive part runs here: nothing on the list is cut off and the first row is
  //    hit-testable at its own centre after scrolling ITS OWN scroller (measurement rules 1, 3, 4).
  // ── A19..A21 #549 item (31), jobs/refetching-an-account-replaces-its-stored-list-instead-of-merging-2026-09-29, Kunal's
  //    merge-big on questions/B8B-MERGED-GAMES. EVERY INPUT ABOVE FETCHES ONCE PER CONTEXT, so none of them could see what a
  //    SECOND fetch does to what the first one stored - and acctStore REPLACED it (M[id]=rows): antagonist A measured 200 -> 5
  //    with 5 of 6 months answering 503, and 200 -> 4 on a clean network with a thin recent window. TC-R119 is the refresh,
  //    TC-R120 the move of the store from localStorage into IndexedDB, TC-R121 the folded-in
  //    jobs/store-eviction-drops-accounts-while-the-screen-keeps-counting-2026-09-29. NOTHING HERE TOUCHES chess.com: the same
  //    ctx.route stub as above answers every request. Each refresh is a RELOAD, because the auto-fetch on entering Review
  //    is what refreshes an account on every launch - the path a player takes without asking for it.
  const refresh=async(b,state,patch)=>{Object.keys(patch).forEach(k=>{state[k]=patch[k];});const h0=state.hits.length;
    await b.open();await b.tile('Review');await b.settle(1800);const st=await rowsSettled(b,1);const r=await READ(b);r.settled=st;r.newHits=state.hits.length-h0;return r;};
  const keysOf=(r)=>{const ks=[];Object.keys(r.idbMap||{}).forEach(id=>(r.idbMap[id]||[]).forEach(g=>ks.push((g.src||'')+':'+(g.date||0)+':'+(g.white||'')+':'+(g.black||''))));return ks;};
  {
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'merge-outage'});
    await stub(b,state);
    const r0=await refresh(b,state,{});
    // #549 item (32) THE BAD MORNING MOVED ONE MONTH NEWER, AND THE REASON IS THE FIX. The second walk used to put its 5 games in
    // the NEWEST month and fail the 5 older ones; since (32) a walk stops at the newest held game, and those 5 games are all
    // older than it (the 200 reach Sep 27), so the walk ends with that month and never asks for the failing ones - A19b's
    // "the failed months are disclosed" then had nothing to disclose. The 5 games are now in a NEW month (Oct) and every other
    // month answers 503, so the walk reaches Sep, is refused, and stops at Aug without asking (Aug ends before the newest
    // held game). A merge reverted to a replace still reads 200 -> 5 here, so A19a stays able to fail.
    const tag='TC-R119 MERGE, A BAD MORNING: 200 stored, then a walk where a newer month holds 5 and every other month answers 503';
    if(L.say(r0.rows===MIN_CAP&&r0.storeFrom==='idb'&&keysOf(r0).length===MIN_CAP,'A19-0 vacuity '+tag+': the first walk stored '+MIN_CAP+' games, in IndexedDB',{rows:r0.rows,store:r0.storeFrom,idbRows:keysOf(r0).length,settled:r0.settled.ok})){
      const r1=await refresh(b,state,{extra:{y:2026,m:10,n:5},failExcept:'2026/10'});
      L.say(r1.newHits>=2&&r1.settled.ok,'A19a-0 vacuity '+tag+': the second walk really ran - the index and the months were asked again',{newRequests:r1.newHits,settled:r1.settled});
      L.say(r1.rows>=r0.rows&&keysOf(r1).length>=keysOf(r0).length,'A19a '+tag+': THE REFRESH REMOVES NOTHING - the list and the store still hold every game they held before the half-failed walk (antagonist A measured 200 -> 5)',{before:r0.rows,after:r1.rows,storedBefore:keysOf(r0).length,storedAfter:keysOf(r1).length});
      L.say(GAP_RE.test(r1.body||''),'A19b '+tag+': and the months that failed are still DISCLOSED, because the newest walk asked for them and did not get them',{line:r1.cap&&r1.cap.text});
      const r2=await refresh(b,state,{refuse:true});
      L.say(r2.rows===r1.rows,'A19c '+tag+': and the held list survives the next launch with the network refusing - the store, not the last walk, is what the screen shows',{afterMerge:r1.rows,afterReload:r2.rows});
    }
    await b.close();
  }
  {
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'merge-grow'});
    await stub(b,state);
    const tag='TC-R119 MERGE, A CLEAN NETWORK';
    const r0=await refresh(b,state,{});
    if(L.say(r0.rows===MIN_CAP,'A20-0 vacuity '+tag+': the first walk stored '+MIN_CAP,{rows:r0.rows})){
      // the CONTROL the antagonist ran: the same walk again changes nothing and duplicates nothing
      const r1=await refresh(b,state,{});
      const k1=keysOf(r1);
      L.say(r1.rows===MIN_CAP&&k1.length===MIN_CAP&&new Set(k1).size===MIN_CAP,'A20a '+tag+': the same walk twice holds '+MIN_CAP+' -> '+MIN_CAP+', with no game stored or shown twice - the merge dedupes on the game key',{rows:r1.rows,stored:k1.length,distinct:new Set(k1).size});
      // a THIN recent window: the same 24-month index, one game a month, so the 6-month walk returns 6 games
      // (an index that suddenly listed ONE month would be a different account's history: chess.com lists every month
      // that has games, so an exhausted index is a statement that nothing older exists)
      const r2=await refresh(b,state,{thin:{months:24,per:1}});
      // Three of those 6 are games the first walk never took (the day-1 games of Jun, May and Apr, which the 200 cut off).
      // #549 item (32): the walk now stops at the newest held game (Sep 27), so it reads Sep's one game and ends, and those
      // three older games are not asked for at all - the list holds 200 -> 200. What is asserted is unchanged and is the
      // point of the input: nothing held is lost, and the count is measured off the store rather than assumed.
      const k2=keysOf(r2),s2=new Set(k2),lost2=k1.filter(k=>!s2.has(k));
      L.say(r2.newHits>=2&&lost2.length===0&&r2.rows===k2.length&&r2.rows>=MIN_CAP,'A20b '+tag+': a thin recent window (6 months of 1 game) leaves EVERY one of the '+MIN_CAP+' held games in place and adds only what was new (antagonist A measured 200 -> 4)',{rows:r2.rows,stored:k2.length,lostFromBefore:lost2.length,newRequests:r2.newHits});
      // a NEWER month with 30 games: the walk takes 200 again, newest first, and the union is LARGER than any walk
      const r3=await refresh(b,state,{thin:null,extra:{y:2026,m:10,n:30}});
      const k3=keysOf(r3);
      L.say(r3.rows===r2.rows+30&&k3.length===r2.rows+30&&new Set(k3).size===k3.length&&r3.rows>MIN_CAP,'A20c '+tag+': a walk that brings in 30 newer games ADDS them to what is held - '+(r2.rows+30)+' games, more than one walk of '+MIN_CAP+' can return, each once',{rows:r3.rows,stored:k3.length,distinct:new Set(k3).size,expect:r2.rows+30});
      const h20=HELD_OK(r3.cap&&r3.cap.text,r3.heldDates||{},Object.keys(r3.heldDates||{}));
      L.say(h20.ok&&!CAP_RE.test(r3.body||'')&&!PLAY_RE.test(r3.body||''),'A20d US-R25 '+tag+': the line names what is HELD - the date of the oldest of the '+r3.rows+' games - and neither the walk\'s 200 nor its month window, which are no longer true of the list',{held:h20,line:r3.cap&&r3.cap.text});
      const r4=await refresh(b,state,{refuse:true});
      L.say(r4.rows===r3.rows&&r4.rows>MIN_CAP,'A20e '+tag+': and the '+r3.rows+' survive a launch with the network refusing',{afterMerge:r3.rows,afterReload:r4.rows});
    }
    await b.close();
  }
  {
    // TC-R120 THE MOVE TO INDEXEDDB, WITHOUT LOSS. A player who upgrades has their games in localStorage['ct_acctgames'];
    // the app must carry every one of them into IndexedDB, and remove the localStorage copy only after reading it back.
    const PGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[White "me"]\n[Black "opp"]\n[Result "1-0"]\n\n'+MOVES+'\n';
    const mk=(i,day)=>({src:'cc',acct:'me',pgn:PGN,white:'me',black:'mig'+i,wr:'win',tc:'blitz',date:Date.UTC(2026,6,day,12,i%60,0)});
    const rows=[];for(let i=0;i<50;i++)rows.push(mk(i,1+(i%28)));
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_accts:['cc:me'],ct_acctgames:{'cc:me':rows}},name:'migrate'});
    await b.open();await b.tile('Review');await b.settle(1200);
    const r=await READ(b);const tag='TC-R120 MIGRATION, 50 games in localStorage from an earlier build';
    L.say(r.rows===50,'A21-0 vacuity '+tag+': the 50 stored games are on screen',{rows:r.rows});
    L.say(!!r.idbMap&&(r.idbMap['cc:me']||[]).length===50&&new Set(keysOf(r)).size===50,'A21a '+tag+': IndexedDB holds every one of the 50, each once',{idbRows:r.idbMap?(r.idbMap['cc:me']||[]).length:null,store:r.storeFrom});
    const ls=await b.page.evaluate(()=>({g:localStorage.getItem('ct_acctgames'),m:localStorage.getItem('ct_acctgames_migrated')}));
    L.say(ls.g===null&&!!ls.m,'A21b '+tag+': and only then is the localStorage copy gone - removed after the read-back, with the migration stamped',{lsCopy:ls.g===null?'removed':('still '+ls.g.length+' chars'),migrated:ls.m});
    // a localStorage copy that turns up AFTER the move (an older build ran in between) is merged in, not ignored
    const extra=[];for(let i=50;i<60;i++)extra.push(mk(i,1+(i%28)));extra.push(rows[0]);
    await b.page.evaluate((x)=>localStorage.setItem('ct_acctgames',JSON.stringify({'cc:me':x})),extra);
    await b.open();await b.tile('Review');await b.settle(1200);
    const r2=await READ(b);
    L.say(r2.rows===60&&(r2.idbMap&&(r2.idbMap['cc:me']||[]).length)===60,'A21c '+tag+': a localStorage copy written later by an older build is UNIONED into the store - 50 held + 10 new + 1 already held = 60, nothing lost and nothing twice',{rows:r2.rows,idbRows:r2.idbMap?(r2.idbMap['cc:me']||[]).length:null});
    L.say(b.errs.length===0,'A21d '+tag+': zero app errors across the migration and the re-migration',b.errs.slice(0,3));
    await b.close();
  }
  {
    // TC-R121 A FULL DEVICE, on the store a device without IndexedDB still uses (localStorage, byte-bounded, oldest account
    // first). Antagonist B's state on #433: the second account does not fit, the writer drops the first to fit it, and the
    // screen went on counting 400 while the store held 200 - and after a reload an account chip read 0. The writer's
    // RETURN VALUE is what the screen must show, and the account it could not keep must be said.
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'store-full'});
    await b.ctx.addInitScript(()=>{try{Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});}catch(e){}});
    await stub(b,state);
    const r0=await refresh(b,state,{});
    const tag='TC-R121 STORE FULL (no IndexedDB, localStorage filled to leave room for half an account)';
    if(L.say(r0.rows===MIN_CAP&&r0.storeFrom==='ls','A22-0 vacuity '+tag+': the first account is stored in localStorage, the fallback store',{rows:r0.rows,store:r0.storeFrom})){
      const fill=await b.page.evaluate(()=>{const A=(localStorage.getItem('ct_acctgames')||'').length;let lo=0,hi=12e6;
        while(hi-lo>2000){const mid=Math.floor((lo+hi)/2);try{localStorage.setItem('zz_fill','x'.repeat(mid));lo=mid;}catch(e){hi=mid;}}
        const keep=Math.max(0,lo-Math.floor(A/2));try{localStorage.setItem('zz_fill','x'.repeat(keep));}catch(e){}return {A,fill:keep};});
      await b.page.locator('input[placeholder="Chess.com username"]').fill(ACCTS[1]);await b.settle(150);
      await b.tapText(/^Fetch$/,{wait:2400});await b.settle(800);await rowsSettled(b,2);
      const r1=await READ(b);const stored=r1.stored;
      L.say(r1.rows===stored&&stored>0,'A22a '+tag+': the rows on screen are the rows STORED - the screen does not count games the device could not keep',{onScreen:r1.rows,stored,fill});
      L.say(/There wasn.t room on this device to keep/i.test(r1.body||'')&&new RegExp(ACCTS[0]).test((r1.cap&&r1.cap.text)||''),'A22b '+tag+': and the account that was dropped is NAMED on the line, instead of vanishing on the next launch',{line:r1.cap&&r1.cap.text});
      const r2=await refresh(b,state,{refuse:true});
      L.say(r2.rows===r1.rows,'A22c '+tag+': after a reload the list is what it was - nothing counted before the reload disappears with it',{before:r1.rows,afterReload:r2.rows});
    }
    await b.close();
  }
  {
    // ── A23 TC-R131 / TC-R132 #549 item (32), jobs/review-entry-costs-seven-requests-and-623kb-with-no-progress-shown-2026-09-29,
    //    direction (b): A REFRESH ASKS ONLY FOR WHAT IT DOES NOT HOLD. Every launch with a connected account walked the index
    //    plus up to six months (antagonist B, #431: 5 requests and ~623KB before the list could change), although since #549
    //    item (31) everything behind the newest held game is merged into what is already held and adds nothing. Seed (c): the
    //    first walk reads the index and Sep, Aug, Jul, Jun (200 games, cut by games, the newest held game Sep 27). Then:
    //    (TC-R132) Home and back to Review in the SAME launch - the question the job left open, per launch or per visit;
    //    (TC-R131) a relaunch with nothing new must ask the index and Sep only, and a relaunch with 10 games in a new month
    //    (Oct) the index, Oct and Sep only - and the line must still say what is held (the bound recorded for the account is
    //    kept, because the walk said nothing about anything older than what it held). Bytes are the stub's response bodies.
    //    Nothing leaves the container: the same ctx.route stub as above answers every request.
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'refresh-cost'});
    await stub(b,state);
    let bytes=0;b.page.on('response',async(res)=>{if(!/api\.chess\.com/.test(res.url()))return;try{bytes+=(await res.body()).length;}catch(e){}});
    const months=(hs)=>hs.filter(h=>/games\/\d{4}\/\d{2}$/.test(h)).map(h=>h.slice(-7));
    const tag='TC-R131 REFRESH COST';
    const r0=await refresh(b,state,{});const b0=bytes,m0=months(state.hits);
    if(L.say(r0.rows===MIN_CAP&&r0.newHits===5&&r0.settled.ok,'A23-0 vacuity '+tag+': the first walk read the index and four months ('+m0.join(', ')+') and stored '+MIN_CAP+' games - the cost a refresh used to pay every launch',{rows:r0.rows,requests:r0.newHits,months:m0,bytes:b0})){
      const line0=(r0.cap&&r0.cap.text)||'';
      // TC-R132 PER VISIT: leaving Review and coming back within one launch
      const h1=state.hits.length;await b.home();await b.settle(400);await b.tile('Review');await b.settle(1800);
      const rv=await READ(b);
      L.say(state.hits.length===h1&&rv.rows===r0.rows,'A23a TC-R132 PER LAUNCH, NOT PER VISIT: Home and back to Review in the same launch asks chess.com for nothing and shows the same '+r0.rows+' games',{newRequests:state.hits.length-h1,rows:rv.rows,before:r0.rows});
      const hb=state.hits.length,bb=bytes;
      const r1=await refresh(b,state,{});const m1=months(state.hits.slice(hb)),b1=bytes-bb;
      L.say(r1.newHits===2&&m1.length===1&&m1[0]==='2026/09'&&r1.rows===r0.rows&&r1.settled.ok,'A23b '+tag+': a relaunch with nothing new asks for the index and the newest month only (2 requests, not '+r0.newHits+') and still holds all '+r0.rows,{requests:r1.newHits,months:m1,rows:r1.rows,bytes:b1,firstWalkBytes:b0});
      L.say(b1>0&&b1*2<b0,'A23c '+tag+': and downloads less than half of what the first walk did',{bytes:b1,firstWalkBytes:b0});
      const hc=state.hits.length,bc=bytes;
      const r2=await refresh(b,state,{extra:{y:2026,m:10,n:10}});const m2=months(state.hits.slice(hc));
      L.say(r2.newHits===3&&m2.join(',')==='2026/10,2026/09'&&r2.rows===r0.rows+10,'A23d '+tag+': a relaunch with 10 games in a new month asks for the index, that month and the month of the newest held game, nothing older, and adds the 10 ('+(r0.rows+10)+')',{requests:r2.newHits,months:m2,rows:r2.rows,expect:r0.rows+10,bytes:bytes-bc});
      L.say(!!line0&&((r2.cap&&r2.cap.text)||'')===line0&&!GAP_RE.test(r2.body||''),'A23e US-R25 '+tag+': and the line still says what is held - the same oldest date as after the first walk, and no gap - because a walk that stopped at what it holds says nothing about anything older',{first:line0,now:r2.cap&&r2.cap.text});
      L.say(b.errs.length===0,'A23f '+tag+': zero app errors',b.errs.slice(0,3));
    }
    await b.close();
  }

  // ── A31..A32 #549, antagonist A round 5 on 755c349 (job 31's IndexedDB store). FAILURES ARE INJECTED BY A SEAM IN THE
  //    PAGE, NOT BY AN APP HOOK: an addInitScript wraps IDBDatabase.prototype.transaction and IDBFactory.prototype.open, armed
  //    by localStorage['zz_idbseam'] = {rw:N, kind:'unknown'|'quota', openFail:bool}. Each armed readwrite transaction is the
  //    REAL transaction, aborted one microtask after the app queued its requests, with tx.error set to a DOMException named
  //    UnknownError (iOS Safari's transient failure) or QuotaExceededError - so the app's own handlers, not a mock of them, see
  //    the failure. The count left is written back, so an armed failure fires once and survives no reload. openFail makes every
  //    indexedDB.open in the page error; the gate turns it off on window before it reads the store itself (L.acctGames opens too).
  const SEAM=()=>{try{
    const cfg=JSON.parse(localStorage.getItem('zz_idbseam')||'null');if(!cfg)return;
    const S=window.__idbSeam={rw:cfg.rw|0,kind:cfg.kind||'unknown',openFail:!!cfg.openFail,fired:0,opensRefused:0};
    const save=()=>{try{localStorage.setItem('zz_idbseam',JSON.stringify({rw:S.rw,kind:S.kind,openFail:S.openFail}));}catch(e){}};
    const tx0=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(os,mode,...r){const tx=tx0.call(this,os,mode,...r);
      if(mode==='readwrite'&&S.rw>0){S.rw--;S.fired++;save();
        const err=new DOMException('injected by gate 61',S.kind==='quota'?'QuotaExceededError':'UnknownError');
        try{Object.defineProperty(tx,'error',{get:()=>err,configurable:true});}catch(e){}
        queueMicrotask(()=>{try{tx.abort();}catch(e){}});}
      return tx;};
    const op0=IDBFactory.prototype.open;
    IDBFactory.prototype.open=function(...a){if(!S.openFail)return op0.apply(this,a);S.opensRefused++;
      const rq={result:null,error:new DOMException('injected by gate 61','UnknownError')};setTimeout(()=>{try{rq.onerror&&rq.onerror({target:rq});}catch(e){}},0);return rq;};
  }catch(e){}};
  const seamArm=(b,cfg)=>b.page.evaluate((c)=>{if(c)localStorage.setItem('zz_idbseam',JSON.stringify(c));else localStorage.removeItem('zz_idbseam');},cfg);
  const seamRead=(b)=>b.page.evaluate(()=>{const S=window.__idbSeam;if(!S)return null;S.openFail=false;return {fired:S.fired,opensRefused:S.opensRefused,left:S.rw};});
  const OLD='gateold', OLDID='cc:'+OLD, OLDN=50;
  const oldRows=()=>{const P='[Event "Live Chess"]\n[Site "Chess.com"]\n[White "'+OLD+'"]\n[Black "opp"]\n[Result "1-0"]\n\n'+MOVES+'\n';const a=[];
    for(let i=0;i<OLDN;i++)a.push({src:'cc',acct:OLD,pgn:P,white:OLD,black:'old'+i,wr:'win',tc:'blitz',date:Date.UTC(2026,6,1+(i%28),12,i%60,0)});return a;};
  const NOROOM=/There wasn.t room on this device to keep/i;
  // TC-R143 (A2-R5): ONLY A QUOTA FAILURE EVICTS. Three inputs, one context each: one UnknownError, two in a row, one quota error.
  for(const cfg of [{rw:1,kind:'unknown'},{rw:2,kind:'unknown'},{rw:1,kind:'quota'}]){
    const state={seed:'c',hits:[],refuse:false};
    // #549 item (103): gateold is stamped as fetched just now, so the once-a-day follow refresh (A24) leaves it alone and this block's
    // OLDEST account still holds exactly its seeded games when the failure is injected (unstamped it is refreshed to 170 and A31-0 reds).
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:[OLDID],ct_acctgames:{[OLDID]:oldRows()},ct_acctfresh:{[OLDID]:{ok:Date.now(),at:Date.now()}}},name:'idb-fail-'+cfg.kind+cfg.rw});
    await b.ctx.addInitScript(SEAM);await stub(b,state);
    const tag='TC-R143 A2-R5, '+cfg.rw+' '+(cfg.kind==='quota'?'QuotaExceededError':'UnknownError')+' on the write after a refresh, with '+OLD+' ('+OLDN+' games) held as the OLDEST account';
    const r0=await refresh(b,state,{});
    const i0=r0.idbMap||{};
    if(!L.say((i0[OLDID]||[]).length===OLDN&&(i0['cc:'+ACCTS[0]]||[]).length===MIN_CAP,'A31-0 vacuity '+tag+': before any failure IndexedDB holds both accounts ('+OLDN+' + '+MIN_CAP+')',{old:(i0[OLDID]||[]).length,fetched:(i0['cc:'+ACCTS[0]]||[]).length,store:r0.storeFrom})){await b.close();continue;}
    await seamArm(b,cfg);
    const r1=await refresh(b,state,{extra:{y:2026,m:10,n:5}});
    const sm=await seamRead(b);
    const r1b=await READ(b);const i1=r1b.idbMap||{};
    const accts=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_accts')||'[]');}catch(e){return null;}});
    L.say(!!sm&&sm.fired===cfg.rw&&r1.newHits>=2,'A31-0b vacuity '+tag+': the seam failed exactly '+cfg.rw+' readwrite transaction(s) and the refresh walk ran',{seam:sm,newRequests:r1.newHits});
    const st={old:(i1[OLDID]||[]).length,fetched:(i1['cc:'+ACCTS[0]]||[]).length,rows:r1b.rows,accts,line:(r1b.cap&&r1b.cap.text)||null};
    if(cfg.kind==='quota'){
      L.say(st.old===0&&NOROOM.test(r1b.body||'')&&new RegExp(OLD).test(st.line||''),'A31c '+tag+': a GENUINE quota error still evicts the oldest account, as designed, and says so on the line',st);
    }else{
      L.say(st.old===OLDN&&Array.isArray(accts)&&accts.indexOf(OLDID)>=0,'A31a '+tag+': a failure that is not QuotaExceededError deletes NOTHING - '+OLD+' still holds all '+OLDN+' games in IndexedDB and is still listed (antagonist A measured it deleted for good)',st);
      L.say(!NOROOM.test(r1b.body||''),'A31b '+tag+': and the screen does not claim there was no room - the failure was not about room',st);
      if(cfg.rw===1)L.say(st.fetched===MIN_CAP+5,'A31d '+tag+': one transient failure is retried once and the refresh lands - '+(MIN_CAP+5)+' games held for the fetched account',st);
      else L.say(st.fetched===MIN_CAP&&st.rows===OLDN+MIN_CAP+5,'A31e '+tag+': two in a row write nothing and delete nothing - the store keeps its '+MIN_CAP+', the session keeps the '+(OLDN+MIN_CAP+5)+' it has',st);
    }
    L.say(b.errs.length===0,'A31f '+tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  {
    // TC-R144 (A3-R5): A STORE THAT CANNOT BE READ IS NOT AN EMPTY STORE. After the migration has removed ct_acctgames, a launch
    // on which IndexedDB will not open used to load {} and present the held account with no games and no word about it; and
    // removing the account in that session deleted it from localStorage only, so its IndexedDB record came back next launch.
    const state={seed:'c',hits:[],refuse:true};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_accts:[OLDID],ct_acctgames:{[OLDID]:oldRows()}},name:'idb-unreadable'});
    await b.ctx.addInitScript(SEAM);await stub(b,state);
    const tag='TC-R144 A3-R5, IndexedDB will not open on a launch after the migration, with '+OLD+' ('+OLDN+' games) held';
    await b.open();await b.tile('Review');await b.settle(1200);
    const r0=await READ(b);
    const ls0=await b.page.evaluate(()=>({g:localStorage.getItem('ct_acctgames'),m:localStorage.getItem('ct_acctgames_migrated')}));
    if(L.say(r0.rows===OLDN&&((r0.idbMap||{})[OLDID]||[]).length===OLDN&&ls0.g===null&&!!ls0.m,'A32-0 vacuity '+tag+': the first launch migrated the '+OLDN+' games into IndexedDB and removed the localStorage copy',{rows:r0.rows,idb:((r0.idbMap||{})[OLDID]||[]).length,ls:ls0})){
      await seamArm(b,{openFail:true});
      await b.open();await b.tile('Review');await b.settle(1200);
      const sm=await seamRead(b);
      const r1=await READ(b);
      L.say(!!sm&&sm.opensRefused>=1&&((r1.idbMap||{})[OLDID]||[]).length===OLDN,'A32-0b vacuity '+tag+': the app\'s open was refused, and the '+OLDN+' games are still in IndexedDB',{seam:sm,idb:((r1.idbMap||{})[OLDID]||[]).length,rows:r1.rows});
      const un1=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="acct-unread"]');return e?(e.innerText||'').trim():null;});
      L.say(/saved games couldn.t be read/i.test(r1.body||''),'A32a '+tag+': the screen SAYS the saved games could not be read, instead of showing the account as if it held none',{rows:r1.rows,said:un1});
      L.say(!/saved games couldn.t be read/i.test(r0.body||''),'A32a-0 '+tag+': and it is NOT said on the launch before, when the store read normally - the sentence is keyed to the failed read, not always on',{said:null});
      // remove the account in THIS session, then a launch on which IndexedDB opens again
      const x=b.page.locator('[aria-label="Remove '+OLD+'"]');
      const nx=await x.count();
      if(L.say(nx===1,'A32-0c vacuity '+tag+': the account chip\'s remove button is there to tap',{count:nx})){
        await x.click();await b.settle(400);
        await seamArm(b,null);
        await b.open();await b.tile('Review');await b.settle(1200);
        const r2=await READ(b);
        const q=await b.page.evaluate(()=>localStorage.getItem('ct_acctforget'));
        L.say(!((r2.idbMap||{})[OLDID])&&r2.rows===0,'A32b '+tag+': an account removed while the store could not be read STAYS removed - on the next launch IndexedDB no longer holds it and no game of it is listed (it used to come back)',{idb:r2.idbMap?((r2.idbMap[OLDID]||[]).length):null,rows:r2.rows,queue:q});
        L.say(q===null,'A32c '+tag+': and the queued delete was carried out and cleared',{queue:q});
        L.say(!/saved games couldn.t be read/i.test(r2.body||''),'A32e '+tag+': and once the store reads again the sentence is gone',{rows:r2.rows});
      }
    }
    L.say(b.errs.length===0,'A32d '+tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  {
    // TC-R174 (#549 antagonist B final read, B1-F and B2-F): AN UNREAD SESSION MUST NOT CUT THE LIST OR THE BOUNDS. Two accounts
    // migrate into IndexedDB: gateold (50 games, bound 'months', stamped fresh so the follow refresh leaves it alone) and the box
    // account gateacct1 (5 games, bound 'all'). Then a launch on which every indexedDB.open errors (the TC-R144 seam) and the
    // network answers, so entering Review fetches the box account into an EMPTY map. Pre-fix, acctStore filtered the list by
    // `x in M` and wrote ct_accts as the box account alone and dropped gateold's ct_acctcap entry (B1-F), and recorded the walk's
    // 'games' over the box account's 'all' (B2-F).
    const BOX='cc:'+ACCTS[0];
    const boxRows=oldRows().slice(0,5).map(g=>({...g,acct:ACCTS[0],white:ACCTS[0]}));
    const state={seed:'c',hits:[],refuse:true};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:[OLDID,BOX],ct_acctgames:{[OLDID]:oldRows(),[BOX]:boxRows},ct_acctcap:{[OLDID]:'months',[BOX]:'all'},ct_acctfresh:{[OLDID]:{ok:Date.now(),at:Date.now()}}},name:'idb-unread-store'});
    await b.ctx.addInitScript(SEAM);await stub(b,state);
    const tag='TC-R174 B1-F/B2-F, a box-account fetch on a launch whose IndexedDB will not open, with '+OLD+' (bound months) and '+ACCTS[0]+' (bound all) held';
    const LSR=()=>b.page.evaluate(()=>{const j=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return 'unparsable';}};return {accts:j('ct_accts'),cap:j('ct_acctcap'),g:localStorage.getItem('ct_acctgames'),m:localStorage.getItem('ct_acctgames_migrated')};});
    await b.open();await b.tile('Review');await b.settle(1200);
    const r0=await READ(b);const ls0=await LSR();
    if(L.say(((r0.idbMap||{})[OLDID]||[]).length===OLDN&&((r0.idbMap||{})[BOX]||[]).length===5&&ls0.g===null&&!!ls0.m&&Array.isArray(ls0.accts)&&ls0.accts.indexOf(OLDID)>=0&&ls0.cap&&ls0.cap[OLDID]==='months'&&ls0.cap[BOX]==='all','A34-0 vacuity '+tag+': the first launch migrated both accounts into IndexedDB, both are listed and both bounds are recorded',{idb:Object.keys(r0.idbMap||{}).map(k=>k+'='+(r0.idbMap[k]||[]).length),ls:{accts:ls0.accts,cap:ls0.cap,g:ls0.g&&ls0.g.length,m:!!ls0.m}})){
      await seamArm(b,{openFail:true});
      const h0=state.hits.length;state.refuse=false;
      await b.open();await b.tile('Review');await b.settle(1800);
      const sm=await seamRead(b);
      const r1=await READ(b);const ls1=await LSR();
      const boxHits=state.hits.slice(h0).filter(h=>h.indexOf(ACCTS[0]+'/')===0).length;
      if(L.say(!!sm&&sm.opensRefused>=1&&boxHits>=2&&/saved games couldn.t be read/i.test(r1.body||''),'A34-0b vacuity '+tag+': the app\'s open was refused, the screen says the saved games could not be read, and the box account WAS fetched in that session',{seam:sm,boxRequests:boxHits,rows:r1.rows})){
        L.say(Array.isArray(ls1.accts)&&ls1.accts.indexOf(OLDID)>=0&&ls1.accts.indexOf(BOX)>=0,'A34a '+tag+': ct_accts still lists '+OLD+' after the fetch (pre-fix it was written as the box account alone)',{accts:ls1.accts});
        L.say(!!ls1.cap&&ls1.cap[OLDID]==='months','A34b '+tag+': '+OLD+'\'s recorded bound survives in ct_acctcap (pre-fix _caps dropped it)',{cap:ls1.cap});
        L.say(!!ls1.cap&&String(ls1.cap[BOX]||'')==='all','A34c '+tag+': and the box account keeps its recorded \'all\' - a walk made against an unread store records no bound (pre-fix it wrote the walk\'s own)',{cap:ls1.cap});
        await seamArm(b,null);state.refuse=true;
        await b.open();await b.tile('Review');await b.settle(1500);
        const r2=await READ(b);const ls2=await LSR();
        const nx=await b.page.locator('[aria-label="Remove '+OLD+'"]').count();
        L.say(nx===1&&((r2.idbMap||{})[OLDID]||[]).length===OLDN,'A34d '+tag+': on the next good launch '+OLD+' is still a chip that can be removed, over its '+OLDN+' games',{chips:nx,idb:((r2.idbMap||{})[OLDID]||[]).length,accts:ls2.accts});
        const c2=HELD_CLAIM((r2.cap&&r2.cap.text)||'')||[];
        L.say(!!ls2.cap&&String(ls2.cap[BOX]||'').split('+')[0]==='all'&&!c2.some(e=>e.u===ACCTS[0]),'A34e '+tag+': and the next good launch still records '+ACCTS[0]+' as all held, and its line names no older '+ACCTS[0]+' games as not loaded',{bound:(ls2.cap||{})[BOX],line:(r2.cap&&r2.cap.text)||null});
      }
    }
    L.say(b.errs.length===0,'A34f '+tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }

  {
    // ── A24 TC-R141 / TC-R142 #549 item (103), jobs/follow-a-player-not-reimport-2026-09-23, work[3]: A FOLLOWED PLAYER IS
    //    REFRESHED ON OPEN, ONE ACCOUNT PER OPEN, ONLY WHEN STALE. Before this the auto-fetch on entering Review asked only for
    //    the account typed in the username box, so another stored account (peter-patzer in Kunal's own words) changed only
    //    when he typed it in and fetched again. The seed: the box account gateacct1 with nothing held, and three followed
    //    accounts holding 3 games each (Aug 28-30) whose last fetch (ct_acctfresh) is 2h, 30h and 50h old. Launch 1 must ask
    //    for the box account and for the 50h one ONLY (the stalest; the 30h one waits, one per open; the 2h one is fresh).
    //    Launch 2: the 30h one's every request answers 503 - it is asked, nothing is said on screen, nothing it holds is lost.
    //    Launch 3: no followed account is asked (all touched inside a day). Launch 4: the 2h one's stamp is aged to 25h and it
    //    is asked. Nothing leaves the container: the same ctx.route stub answers every request.
    const NOW=Date.now(), HR=3600*1000, FA='gatefollowa', FB='gatefollowb', FC='gatefollowc';
    const heldRow=(who,d)=>({src:'cc',acct:who,pgn:'[Event "Live Chess"]\n[Site "Chess.com"]\n[White "'+who+'"]\n[Black "'+who+'_held'+d+'"]\n[Result "1-0"]\n\n'+MOVES+'\n',white:who,black:who+'_held'+d,wr:'win',tc:'blitz',date:Date.UTC(2026,7,d,12,0,0)});
    const seedG={};[FA,FB,FC].forEach(w=>{seedG['cc:'+w]=[30,29,28].map(d=>heldRow(w,d));});
    const fresh={['cc:'+FA]:{ok:NOW-2*HR,at:NOW-2*HR},['cc:'+FB]:{ok:NOW-30*HR,at:NOW-30*HR},['cc:'+FC]:{ok:NOW-50*HR,at:NOW-50*HR}};
    const state={seed:'c',hits:[],refuse:false};
    const b=await L.launch({geo:'kunal761',store:{ct_ccuser:ACCTS[0],ct_accts:JSON.stringify(['cc:'+FA,'cc:'+FB,'cc:'+FC]),ct_acctgames:JSON.stringify(seedG),ct_acctfresh:JSON.stringify(fresh)},name:'follow-refresh'});
    await stub(b,state);
    const asked=(hs,who)=>hs.filter(h=>h.indexOf(who+'/')===0).length;
    const tag='TC-R141 FOLLOW';
    // the follow refresh runs AFTER the box walk and paints no busy state, so rowsSettled cannot see it: wait on the STORE
    const until=async(pred,ms)=>{let AG=null;for(let w=0;w<ms/250;w++){AG=await L.acctGames(b.page);if(pred(AG.map||{}))return {ok:true,AG};await b.settle(250);}return {ok:false,AG};};
    const n=(M,w)=>((M||{})['cc:'+w]||[]).length;
    const ERR_RE=/Couldn.t reach Chess\.com|Chess\.com has no account|Chess\.com answered/;
    const h0=state.hits.length;
    await b.open();await b.tile('Review');await b.settle(1800);await rowsSettled(b,1);
    const w1=await until(M=>n(M,FC)===63,20000);await b.settle(2500);
    const hs1=state.hits.slice(h0);const r1=await READ(b);
    // AT LEAST 3, not exactly: a build that refreshes every stale account grows FB too, and that must reach A24b and go red THERE
    if(L.say(asked(hs1,ACCTS[0])>=2&&n(r1.idbMap,FA)>=3&&n(r1.idbMap,FB)>=3&&n(r1.idbMap,FC)>=3,'A24-0 vacuity '+tag+': the box account was walked and the three seeded followed accounts are held (at least their 3 seeded games each) in the store',{boxRequests:asked(hs1,ACCTS[0]),held:{[FA]:n(r1.idbMap,FA),[FB]:n(r1.idbMap,FB),[FC]:n(r1.idbMap,FC)},store:r1.storeFrom})){
      L.say(w1.ok&&asked(hs1,FC)===3&&n(r1.idbMap,FC)===63,'A24a '+tag+': the STALEST followed account (last fetched 50h ago) is refreshed on open without being typed in - its index, Sep and Aug asked (3 requests, the walk stops at its newest held game) and Sep\'s 60 games added to the 3 it held (63)',{requests:asked(hs1,FC),held:n(r1.idbMap,FC),expect:63,waited:w1.ok});
      L.say(asked(hs1,FB)===0&&asked(hs1,FA)===0,'A24b '+tag+': ONE ACCOUNT PER OPEN - the other stale account (30h) is not asked this launch, and the fresh one (2h) is not asked',{[FB+' (30h)']:asked(hs1,FB),[FA+' (2h)']:asked(hs1,FA)});
      const keep1=(r1.idbMap['cc:'+FC]||[]).filter(g=>/_held\d+$/.test(g.black||'')).length;
      L.say(keep1===3,'A24c '+tag+': the refresh merged - the 3 games the followed account held are all still held',{heldKept:keep1});
      // launch 2: the next-stalest is refreshed, and its every request fails
      // what FB holds going in: A24e compares against THIS, so a build that already refreshed FB a launch early reds A24b and A24d and not A24e
      const heldB=n(r1.idbMap,FB);
      const h2=state.hits.length;state.failWho=FB;
      await b.open();await b.tile('Review');await b.settle(1800);await rowsSettled(b,1);
      await until(M=>false,4000);
      const hs2=state.hits.slice(h2);const r2=await READ(b);
      L.say(asked(hs2,FB)>=1&&asked(hs2,FC)===0&&asked(hs2,FA)===0,'A24d '+tag+': the next launch refreshes the NEXT stalest (30h) and not the one refreshed a launch ago',{[FB]:asked(hs2,FB),[FC]:asked(hs2,FC),[FA]:asked(hs2,FA)});
      L.say(!ERR_RE.test(r2.body||'')&&heldB>=3&&n(r2.idbMap,FB)>=heldB,'TC-R142 A24e '+tag+': A REFRESH HE DID NOT ASK FOR FAILS QUIETLY - the followed account answering 503 puts no error sentence on the Review screen, and every game it held going in stays',{errorOnScreen:((r2.body||'').match(ERR_RE)||['none'])[0],heldBefore:heldB,held:n(r2.idbMap,FB)});
      // launch 3: every followed account was touched inside a day (FB's failed try counts), so none is asked
      const h3=state.hits.length;state.failWho=null;
      await b.open();await b.tile('Review');await b.settle(1800);await rowsSettled(b,1);await until(M=>false,4000);
      const hs3=state.hits.slice(h3);
      L.say(asked(hs3,FA)+asked(hs3,FB)+asked(hs3,FC)===0&&asked(hs3,ACCTS[0])>=1,'A24f '+tag+': ONLY WHEN STALE - with every followed account touched inside a day (a failed try counts, so a failing account cannot take the slot every launch) no followed account is asked; the box account still is',{followed:{[FA]:asked(hs3,FA),[FB]:asked(hs3,FB),[FC]:asked(hs3,FC)},box:asked(hs3,ACCTS[0])});
      // launch 4: the 2h account's stamp aged past a day
      await b.page.evaluate(([id,t])=>{const o=JSON.parse(localStorage.getItem('ct_acctfresh')||'{}');o[id]={ok:t,at:t};localStorage.setItem('ct_acctfresh',JSON.stringify(o));},['cc:'+FA,Date.now()-25*HR]);
      const h4=state.hits.length;
      await b.open();await b.tile('Review');await b.settle(1800);await rowsSettled(b,1);await until(M=>false,4000);
      const hs4=state.hits.slice(h4);const r4=await READ(b);
      L.say(asked(hs4,FA)>=1&&n(r4.idbMap,FA)===63,'A24g '+tag+': and once that account\'s last fetch is more than a day old (25h) it is refreshed too, adding its 60 new games',{requests:asked(hs4,FA),held:n(r4.idbMap,FA)});
      L.say(b.errs.length===0,'A24h '+tag+': zero app errors',b.errs.slice(0,3));
    }
    await b.close();
  }

  const GEOS7=[{w:320,h:568},{w:360,h:640},{w:375,h:667},{w:375,h:730},{w:390,h:844},{w:414,h:896},{w:440,h:956}];
  // ── ALL SEVEN GEOMETRIES BY DEFAULT [#544, item (7); this job's remainder, "run the default sweep at all
  //    seven geometries rather than three"]. It was three unless CT_FULL=1, so four of the seven never ran in
  //    any suite - and a fit assertion that never runs at a width is not a fit assertion at that width.
  //    THE COST IS MEASURED, NOT ESTIMATED, because that is the only thing that could argue against it: this
  //    gate takes 2m39s over three geometries and 2m52s over seven, against a suite of about two hours. THIRTEEN
  //    SECONDS for twelve more assertions (129 -> 141). Both figures are this container, this bundle
  //    (049b41dfb6f1), one run each, `time node gates/regress/61-...js` with and without CT_FULL=1.
  //    CT_FULL=1 IS KEPT AND NOW MEANS THE SAME SET, so no caller that passes it breaks; it is no longer the
  //    difference between a partial sweep and a full one, because there is no partial sweep any more.
  const sweep=GEOS7;
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
  // ── A16 THE EMPTY WALKED WINDOW [#544, item (7); the second half of this job's own coverageHole, measured by
  //    its antagonist B as "across 41 suites and 2694 PASS lines, ZERO assertions exercise an account thinner
  //    than 200-games-in-6-months or an EMPTY WALKED WINDOW"].
  //    THE FIXTURE IS ALREADY REACHABLE AND NOBODY DROVE IT: state.thin with per:0 makes every listed month
  //    answer 200 with games:[], so the walk succeeds, requests all six months of the window, and finds
  //    nothing. Measured at #544 on main's bundle (app.js 049b41dfb6f1): rows 0, requests 7 (the index plus
  //    six months), nothing stored, and NO limit line located at all.
  //    WHAT IS ASSERTED HERE IS WHAT STAYS TRUE IF THE SCREEN IS LATER IMPROVED, which is deliberate and is
  //    #544 item (5)'s lesson applied one file over: an assertion pinned to today's wording would go red on a
  //    better bundle. So A16b asserts there is no limit line - nothing is claimed as the bound when nothing
  //    was found - and A16c asserts the reload does not invent rows out of storage. Both survive any rewording.
  //    AND WHAT IS NOT ASSERTED IS RECORDED RATHER THAN DROPPED: the message on this screen today reads
  //    "Couldn't reach Chess.com (no recent games found). Fetching works once this app is on a real website -
  //    the preview sandbox blocks outside connections." The headline blames the network for a walk in which
  //    every request SUCCEEDED, with the true cause in parentheses after it. That is
  //    jobs/review-fetch-blames-the-network-for-an-empty-month-2026-09-28, it is an app-side defect in
  //    chess.jsx and not a gate defect, and #544 built no bundle - so it is a NOTE here, carrying the measured
  //    string, and the measurement goes on that job. Asserting the right wording before the app has it would
  //    plant a red on main's own bundle and block every push, which this project has paid for before.
  {
    const r=await input('b',1,GEO,'empty-window',{months:GMONTHS,per:0});
    const a16=L.say(r.rows===0&&r.hitCount>=GMONTHS+1,'A16a vacuity EMPTY WINDOW: every month of the window was requested and all of them answered 200 with no games, so the list is empty because the walk found nothing - not because it never ran',{rows:r.rows,requests:r.hitCount,expectAtLeast:GMONTHS+1,hits:r.hits,stored:r.stored});
    if(a16){
      L.say(!(r.cap&&r.cap.present),'A16b EMPTY WINDOW: NO limit line is on screen - with nothing found, neither a games cap nor a month window is claimed as the bound (a limit that did not bind is the whole subject of this file)',{limitLine:r.cap&&r.cap.text,present:r.cap&&r.cap.present,body:(r.body||'').slice(0,200)});
      L.say(r.afterReload===0,'A16c EMPTY WINDOW: the reload with the network refusing still shows zero rows - an empty walk stores nothing and nothing is invented out of localStorage',{afterReload:r.afterReload,afterErr:r.afterErr,stored:r.stored});
      L.note('       A16 NOTE, MEASURED AND NOT ASSERTED [jobs/review-fetch-blames-the-network-for-an-empty-month-2026-09-28]: errorCard='+r.err+'  message='+JSON.stringify((r.body||'').replace(/^.*?(Couldn.t reach[^—]*)/,'$1').slice(0,180))+' - every request in this input SUCCEEDED, so the headline is wrong and the parenthetical is right. An app-side defect; #544 built no bundle, and an assertion on the wording would redden main.');
    } else {
      L.note('       A16a failed - A16b and A16c SKIPPED rather than measured on a screen whose walk never ran');
    }
    await r.b.close();
  }
  // ── A17 A MONTH THAT FAILED AND THEN RECOVERED [#546, item (19); option (b) of
  //    jobs/gate-61-a15b-cannot-be-red-while-a15a-is-green-and-its-comment-names-an-impossible-mechanism-2026-10-06].
  //    A15b asserts "no gap is claimed" where nothing ever failed, so it cannot be red while A15a is green (its own
  //    comment says so since #545). The state where "no gap" is a real question is a gap that WAS true: one month
  //    answers 503, the screen says months could not be loaded, then the month answers and the app is reloaded.
  //    MEASURED at #546 on main's bundle (app.js 049b41dfb6f1) before this block was written: 10 rows and the gap
  //    sentence, then 15 rows and no gap sentence after the reload - so the state exists and the app recovers.
  //    A17-0 and A17a are the denominators (the failure was real and was said; the recovery really refetched the
  //    month), so A17b - no gap claimed once nothing is missing - is red on any build that keeps a stale gap.
  //    CONTROLLED at #546: a CT_OUT trial bundle whose chess.jsx keeps '+gap' whenever ct_acctcap already carried
  //    one (the stored-bound line's `(missed?'+gap':'')` widened to also test localStorage, md5 054755c392d0) reads
  //    153 pass / 1 fail with the ONE red A17b; main's 049b41dfb6f1 reads 154 / 0. A15b stays green on it.
  {
    const PER=5, MONTHS=3, FAILM=NEWEST.y+'/'+String(NEWEST.m-1).padStart(2,'0');
    const state={seed:'b',hits:[],refuse:false,thin:{months:MONTHS,per:PER},fail:FAILM};
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'gap-recovered'});
    await stub(b,state); await b.open(); await b.tile('Review'); await b.settle(2200);
    const r1=await READ(b);
    const tag='RECOVERED: '+MONTHS+' months x '+PER+' with '+FAILM+' answering 503, then 200 after a reload';
    const failed=L.say(r1.rows===(MONTHS-1)*PER&&GAP_RE.test(r1.body||''),'A17-0 vacuity '+tag+': the month really failed and the screen said so - '+((MONTHS-1)*PER)+' rows and the gap sentence',{rows:r1.rows,gap:GAP_RE.test(r1.body||'')});
    if(failed){
      if(!process.env.CT_A17_KEEPFAIL)state.fail=null;   // CT_A17_KEEPFAIL=1 is this block's own control: the month never recovers
      const h0=state.hits.length;
      await b.page.reload(); await b.settle(1500); await b.tile('Review'); await b.settle(2200);
      const r2=await READ(b); const refetched=state.hits.slice(h0).some(h=>h.indexOf(FAILM)>=0);
      const rec=L.say(r2.rows===MONTHS*PER&&refetched,'A17a vacuity '+tag+': after the reload the failed month was requested again and every row is present ('+(MONTHS*PER)+')',{rows:r2.rows,refetched,newRequests:state.hits.length-h0});
      if(rec) L.say(!GAP_RE.test(r2.body||''),'A17b US-R25 '+tag+': and NO gap is claimed any more - nothing is missing, so a lingering "months couldn\'t be loaded" would be a false statement about the list',{gapText:((r2.body||'').match(GAP_RE)||[''])[0]});
      else L.note('       A17a failed - A17b SKIPPED rather than measured on a screen that never recovered');
    } else {
      L.note('       A17-0 failed - A17a and A17b SKIPPED rather than measured on a walk that never failed');
    }
    await b.close();
  }
  // TC-R91 (US-R93), #547 item (144): A FETCH THAT WORKED IS NOT CALLED A NETWORK FAILURE. Pre-fix every failure, including two 200s
  // with an empty month, printed 'Couldn't reach Chess.com ... the preview sandbox blocks outside connections'. Four inputs, each its
  // own route registered after launch (it wins over lib.js's BLOCK): an index of 3 months each holding no games; the index 404; the
  // index 500; the request aborted (a real fetch rejection). The four sentences must differ, and the empty one must not blame the net.
  {const CASES=[['empty',async(route)=>{const u=route.request().url();if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['2026/08','2026/09','2026/10'].map(m=>'https://api.chess.com/pub/player/r91/games/'+m)})});return route.fulfill({status:200,contentType:'application/json',body:'{"games":[]}'});}],
     ['404',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'})],['500',route=>route.fulfill({status:500,contentType:'application/json',body:'{}'})],['abort',route=>route.abort()]];
   const said={};
   for(const [k,h] of CASES){const b=await L.launch({geo:'kunal730',name:'r91-'+k});await b.ctx.route(/api\.chess\.com/,h);await b.open();
     let ok=true;try{await b.tile('Review');await b.settle(500);await b.page.locator('input[placeholder="Chess.com username"]').fill('r91');await b.settle(150);await b.tapText(/^Fetch$/,{wait:2500});}catch(e){ok=false;}
     let t=null;for(let w=0;w<20&&!t;w++){t=await b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/(Couldn.t reach Chess\.com|Chess\.com has no account|Chess\.com answered)[^\n]*/);return m?m[0]:null;});if(!t)await b.settle(250);}
     said[k]=ok?t:null;await b.close();}
   if(L.say(Object.values(said).every(x=>!!x),'TC-R91 PRECONDITION each of the four fetch outcomes put a Chess.com sentence on the Review screen',said)){
     // compared on the WORDING before any '(...)': pre-fix the four differed only in the error text in brackets, which a plain
     // inequality counted as four different sentences on the very bundle that told the player the same wrong thing four times.
     const lead=Object.values(said).map(x=>x.split('(')[0].trim());
     L.say(new Set(lead).size===4,'TC-R91 the four outcomes - empty months, no such account, a server error, no connection - produce FOUR DIFFERENT sentences, not one sentence with a different code in brackets',{lead});
     L.say(!/Couldn.t reach|sandbox/.test(said.empty),'TC-R91 a fetch that succeeded and found no games does NOT blame the network or the sandbox',{empty:said.empty});
     L.say(/Couldn.t reach Chess\.com/.test(said.abort),'TC-R91 and a real network failure still says it could not reach Chess.com',{abort:said.abort});}}
  // TC-R95 (US-R97), #547 item (166): THE WALK SAYS WHAT IT IS DOING. Pre-fix the 2.2s walk showed only the Fetch button collapsed to
  // an ellipsis. Stub: an index of 4 months, 3 games each, every request held 900ms so the walk is observable. Sampled every 150ms
  // from the tap, the screen must carry a status line reading which month it is on, and it must be gone once the rows are in.
  // LOCATED BY WHAT IT SAYS, not by the data-ct hook this build adds, so the pre-fix bundle reads null and goes red.
  {const b=await L.launch({geo:'kunal730',name:'r95'});
   const mk=(m,n)=>({games:Array.from({length:n},(_,k)=>({pgn:'[Event "r95"]\n\n1. e4 e5 *',end_time:1790000000+m*100000+k,time_class:'blitz',white:{username:'r95',result:'win'},black:{username:'opp'+k,result:'checkmated'}}))});
   await b.ctx.route(/api\.chess\.com/,async(route)=>{const u=route.request().url();await new Promise(r=>setTimeout(r,900));
     if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['2026/07','2026/08','2026/09','2026/10'].map(m=>'https://api.chess.com/pub/player/r95/games/'+m)})});
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mk(+u.slice(-2),3))});});
   await b.open();let ok=true;
   try{await b.tile('Review');await b.settle(500);await b.page.locator('input[placeholder="Chess.com username"]').fill('r95');await b.settle(150);await b.tapText(/^Fetch$/,{wait:50});}catch(e){ok=false;}
   const seen=[];let rowsAt=-1;
   for(let w=0;w<60&&ok;w++){const r=await b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/(Reading Chess\.com|Asking Chess\.com)[^\n]*/);return {line:m?m[0]:null,rows:document.querySelectorAll('[data-ct="game-row"],[data-ct="games-row"]').length,fetchBtn:[...document.querySelectorAll('button')].some(x=>(x.innerText||'').trim()==='Fetch')};});
     if(r.line&&seen[seen.length-1]!==r.line)seen.push(r.line);if(r.fetchBtn&&w>3){rowsAt=w;break;}await b.page.waitForTimeout(150);}
   const after=await b.page.evaluate(()=>/(Reading Chess\.com|Asking Chess\.com)/.test(document.body.innerText||''));
   L.say(ok&&rowsAt>0,'TC-R95 PRECONDITION the fetch ran to the end: Fetch was tapped and the button came back ('+rowsAt+' samples of 150ms)',{ok,rowsAt});
   L.say(seen.some(x=>/month \d+ of up to 4/.test(x)),'TC-R95 while the months are fetched the screen says which month it is reading, of how many',{seen});
   L.say(seen.some(x=>/month [2-4] of up to 4 · [1-9]\d* games? so far/.test(x)),'TC-R95 and, after the first month, how many games it has so far',{seen});
   L.say(!after,'TC-R95 the status line is gone once the walk ends',{after});
   await b.close();}
  // ── A26..A28 #549 item (78), jobs/review-list-caps-at-about-40-games-2026-09-23 work[3] [Amber: flags/amber-549-review-load-older-games].
  //    LOAD OLDER GAMES. Every walk starts at the newest month, so even with job (31)'s merged store (2000 per account) the list
  //    could never reach further back than one walk of 200 games / 6 archive months from today. TC-R138 is the chess.com walk
  //    back from the oldest held game, to the end of the account's history; TC-R139 the store cap, where the control must go
  //    and the cap must be said; TC-R140 the same for Lichess (`until=`). THE CONTROL IS LOCATED BY WHAT IT SAYS ("Load older
  //    games"), never by the data-ct this build adds, so a bundle without it reads "absent", not "selector missing".
  //    The index is SPARSE-SHAPED (only months that have games), which is what api.chess.com returns, so no listed month is
  //    empty and no gap sentence is owed; 45 games a month, so the first walk is cut by games INSIDE a month (4 x 45 + 20).
  const olderBtn=(b)=>b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^(Load older games|Reading older Chess\.com games|Asking Chess\.com|Downloading up to \d+ older games|Loading older games)/.test((e.textContent||'').trim()));
    return x?{present:true,text:(x.textContent||'').trim(),disabled:!!x.disabled,w:Math.round(x.getBoundingClientRect().width),h:Math.round(x.getBoundingClientRect().height)}:{present:false};});
  const tapOlder=async(b)=>{const loc=b.page.locator('button',{hasText:/^Load older games$/});
    if(!(await loc.count()))return false;try{await loc.first().click({timeout:4000});}catch(e){return false;}
    await b.settle(400);await rowsSettled(b,1);
    for(let w=0;w<40;w++){const o=await olderBtn(b);if(!o.present||o.text==='Load older games')break;await b.settle(250);}
    return true;};
  // TC-R145 (A1-R6): a SAMPLER in the page, every 40ms from before the tap until tapOlder has seen the walk end, recording the
  // "Show N more" control and the Load-older control. A tap is answered by EITHER the busy control or the grown list, never by
  // "Show N more" over the list the tap started from: acctStore publishes the merged rows before its store write is awaited and
  // the page used to grow only when loadOlderGames returned, so for 100-475ms an enabled "Show 199 more games" stood over an
  // unchanged list. tapOlder's own waits step over that window, which is why nothing saw it.
  const sampStart=(b)=>b.page.evaluate(()=>{const W=window;W.__olderSamp=[];clearInterval(W.__olderSampT);
    W.__olderSampT=setInterval(()=>{const bs=[...document.querySelectorAll('button')];
      const m=bs.find(e=>/^Show \d+ more games/.test((e.textContent||'').trim()));
      const o=bs.find(e=>/^(Load older games|Reading older Chess\.com games|Asking Chess\.com|Downloading up to \d+ older games|Loading older games)/.test((e.textContent||'').trim()));
      W.__olderSamp.push({t:Math.round(performance.now()),more:m?(m.textContent||'').trim().slice(0,48)+(m.disabled?'[disabled]':''):null,
        older:o?(o.textContent||'').trim().slice(0,32):null,busy:!!(o&&(o.disabled||o.getAttribute('aria-busy')==='true')),rows:document.querySelectorAll('[data-ct="game-row"]').length});},40);});
  const sampStop=(b)=>b.page.evaluate(()=>{clearInterval(window.__olderSampT);const r=window.__olderSamp||[];window.__olderSamp=[];return r;});
  const spanMonths=(n)=>{const out=[];for(let i=n-1;i>=0;i--){const t=new Date(Date.UTC(NEWEST.y,NEWEST.m-1-i,1));out.push([t.getUTCFullYear(),t.getUTCMonth()+1]);}return out;};
  const oldestOf=(r)=>{let o=0;Object.keys(r.idbMap||{}).forEach(id=>(r.idbMap[id]||[]).forEach(g=>{const d=g.date||0;if(d>0&&(!o||d<o))o=d;}));return o;};
  {
    const PER=45, NM=15, TOTAL=PER*NM;
    const state={seed:'c',hits:[],refuse:false,sparse:{list:spanMonths(NM),per:PER}};
    const b=await L.launch({geo:'kunal761',store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'older-all'});
    await stub(b,state);
    const tag='TC-R138 LOAD OLDER, '+NM+' listed months x '+PER+' = '+TOTAL+' games';
    const r0=await refresh(b,state,{});const o0=await olderBtn(b);
    if(L.say(r0.rows===MIN_CAP&&o0.present,'A26-0 vacuity '+tag+': the first walk stored '+MIN_CAP+' games (cut inside a month) and the list offers "Load older games"',{rows:r0.rows,button:o0,line:r0.cap&&r0.cap.text})){
      L.say(o0.h>=44,'A26-0b '+tag+': the control is a 44px-tall tap target',{button:o0});
      const k0=keysOf(r0),old0=oldestOf(r0),h0=state.hits.length;
      const t1=await tapOlder(b);const r1=await READ(b);const k1=keysOf(r1),s1=new Set(k1);
      const asked=state.hits.slice(h0).filter(h=>/games\/\d{4}\/\d{2}$/.test(h));
      const fresh1=r1.rows-r0.rows;
      L.say(t1&&asked.length>0,'A26a-0 vacuity '+tag+': the tap ran a walk - '+asked.length+' month(s) requested',{tapped:t1,asked});
      L.say(k0.every(k=>s1.has(k))&&s1.size===k1.length&&r1.rows===k1.length&&fresh1>0,'A26a '+tag+': one tap ADDS older games - '+r0.rows+' -> '+r1.rows+', every game held before still held, each once, and the list shows what is stored',{before:r0.rows,after:r1.rows,stored:k1.length,distinct:s1.size,lost:k0.filter(k=>!s1.has(k)).length});
      // the games it added are OLDER than anything held before the tap: it walked back from the oldest held game, not from today
      const added=[];Object.keys(r1.idbMap||{}).forEach(id=>(r1.idbMap[id]||[]).forEach(g=>{const k=(g.src||'')+':'+(g.date||0)+':'+(g.white||'')+':'+(g.black||'');if(k0.indexOf(k)<0)added.push(g.date||0);}));
      L.say(added.length===fresh1&&added.every(d=>d<=old0)&&oldestOf(r1)<old0,'A26b '+tag+': and every game it added is OLDER than the oldest game held before the tap - the walk went back from what is held, not again from the newest month',{added:added.length,oldestBefore:new Date(old0).toISOString(),oldestAfter:new Date(oldestOf(r1)).toISOString(),newestAdded:added.length?new Date(Math.max(...added)).toISOString():null});
      L.say(fresh1<=MIN_CAP,'A26c '+tag+': one tap brings at most one walk\'s worth ('+MIN_CAP+') - the control pages, it does not walk the whole history at once',{added:fresh1});
      const h11=HELD_OK(r1.cap&&r1.cap.text,r1.heldDates||{},Object.keys(r1.heldDates||{}));
      L.say(h11.ok,'A26d US-R25 '+tag+': the limit line moves with it - it names the date of the NEW oldest held game',{held:h11,line:r1.cap&&r1.cap.text});
      let taps=1,rN=r1;
      while(taps<12){const o=await olderBtn(b);if(!o.present)break;if(!(await tapOlder(b)))break;taps++;rN=await READ(b);}
      const kN=keysOf(rN),oN=await olderBtn(b);
      L.say(rN.rows===TOTAL&&kN.length===TOTAL&&new Set(kN).size===TOTAL,'A26e '+tag+': tapping until the control goes reaches EVERY game the account has - '+TOTAL+', each once ('+taps+' taps)',{rows:rN.rows,stored:kN.length,distinct:new Set(kN).size,taps});
      L.say(!oN.present,'A26f '+tag+': and once the history is exhausted the control is gone - it never offers a walk that can bring nothing',{button:oN});
      L.say(!(rN.cap&&rN.cap.present)&&!GAP_RE.test(rN.body||''),'A26g US-R25 '+tag+': and with every game held there is no limit to state: no "older ones aren\'t loaded", no gap',{line:rN.cap&&rN.cap.text});
      L.say(b.errs.length===0,'A26h '+tag+': zero app errors across '+taps+' taps',b.errs.slice(0,3));
      const rR=await refresh(b,state,{refuse:true});
      L.say(rR.rows===TOTAL,'A26i '+tag+': and the '+TOTAL+' survive a launch with the network refusing',{afterReload:rR.rows});
      // a refresh on a clean network walks the newest months again; the whole history stays, and it stays "all" (no line)
      const rF=await refresh(b,state,{refuse:false});
      L.say(rF.rows===TOTAL&&!(rF.cap&&rF.cap.present)&&!(await olderBtn(b)).present,'A26j '+tag+': a later refresh keeps all '+TOTAL+' and does not bring back a limit or the control - the history is still complete',{rows:rF.rows,line:rF.cap&&rF.cap.text});
    }
    await b.close();
  }
  {
    // TC-R139 THE STORE CAP. 50 listed months x 45 = 2250 games against ACCT_GMAX_STORE (2000, read off the screen's own sentence).
    // At the cap a further walk would be cut straight back off by the store, so the control must go and the cap must be said.
    const PER=45, NM=50, TOTAL=PER*NM;
    const state={seed:'c',hits:[],refuse:false,sparse:{list:spanMonths(NM),per:PER}};
    const b=await L.launch({geo:'kunal761',store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'older-cap'});
    await stub(b,state);
    const tag='TC-R139 LOAD OLDER TO THE STORE CAP, '+NM+' months x '+PER+' = '+TOTAL+' games';
    const r0=await refresh(b,state,{});
    if(L.say(r0.rows===MIN_CAP&&(await olderBtn(b)).present,'A27-0 vacuity '+tag+': first walk '+MIN_CAP+', control offered',{rows:r0.rows})){
      let taps=0,rN=r0;const tapMs=[];
      const samp=[];   // TC-R145: every sample of every tap's walk, tagged with the tap
      while(taps<20){const o=await olderBtn(b);if(!o.present)break;const t=Date.now();await sampStart(b);const ok=await tapOlder(b);await b.settle(700);const ss=await sampStop(b);   // 700ms past tapOlder's end: wider than the 475ms window measured
        if(!ok)break;ss.forEach(x=>{x.tap=taps+1;samp.push(x);});tapMs.push(Date.now()-t);taps++;rN=await READ(b);}
      const sMore=samp.filter(x=>x.more!==null),sBusy=samp.filter(x=>x.busy),sTaps=new Set(sBusy.map(x=>x.tap)).size;
      L.say(samp.length>=taps*5&&taps>0&&sTaps===taps,'A27-0c vacuity TC-R145 '+tag+': the 40ms sampler ran through every walk - '+samp.length+' samples over '+taps+' taps, and it saw the busy control on every one of the '+taps+' taps, so the window after the busy state is inside what it read',{samples:samp.length,taps,tapsSeenBusy:sTaps,busySamples:sBusy.length});
      L.say(sMore.length===0,'A27h TC-R145 '+tag+': no tap is answered by "Show N more" over the list the tap started from - sampled every 40ms from the tap until the walk ended, the busy control or the grown list is all that ever shows',{samplesOfferingShowMore:sMore.length,first:sMore.slice(0,3),tapsAffected:[...new Set(sMore.map(x=>x.tap))]});
      const capM=((rN.body||'').match(/This app keeps up to ([\d,]+) games per account/)||[])[1];const capN=capM?parseInt(capM.replace(/,/g,''),10):null;
      L.say(!!capN&&capN>MIN_CAP&&capN<TOTAL,'A27-0b vacuity '+tag+': the store cap is stated on the line and lies between one walk and the seeded total, so this input reaches it',{capStated:capN,line:rN.cap&&rN.cap.text});
      const kN=keysOf(rN);
      L.say(!!capN&&rN.rows===capN&&kN.length===capN&&new Set(kN).size===capN,'A27a '+tag+': the list fills to the stated cap and no further - '+rN.rows+' rows, '+kN.length+' stored, each once ('+taps+' taps)',{rows:rN.rows,stored:kN.length,capN,taps});
      L.say(!(await olderBtn(b)).present,'A27b '+tag+': at the cap the control is gone - a walk would be cut back off by the store',{button:await olderBtn(b)});
      L.say(OLDER_RE.test((rN.cap&&rN.cap.text)||''),'A27c US-R25 '+tag+': and the line still says older games are not loaded, beside the cap that is why',{line:rN.cap&&rN.cap.text});
      // work[3]'s "paginate ... with an explicit 'load more' ... so the first paint stays fast". A launch with the full store and the
      // network refusing: the count says every held game, the list RENDERS one page, and a control says how many are not shown.
      state.refuse=true;const t0=Date.now();await b.open();await b.tile('Review');
      let pg=null;for(let w=0;w<80;w++){pg=await b.page.evaluate(()=>{const c=[...document.querySelectorAll('span')].find(x=>/^\d[\d,]* loaded$/.test((x.textContent||'').trim()));
          const m=[...document.querySelectorAll('button')].find(e=>/^Show \d+ more games/.test((e.textContent||'').trim()));
          return {loaded:c?parseInt((c.textContent||'').replace(/[^\d]/g,''),10):0,rows:document.querySelectorAll('[data-ct="game-row"]').length,more:m?(m.textContent||'').trim():null,
            moreH:m?Math.round(m.getBoundingClientRect().height):0};});
        if(pg.loaded>=(capN||1)&&pg.rows>0)break;await b.settle(100);}
      const ms=Date.now()-t0;
      const blk=await b.page.evaluate(()=>new Promise(res=>{const t=performance.now();requestAnimationFrame(()=>res(Math.round(performance.now()-t)));}));
      L.note('       A27 FIRST PAINT, measured not asserted: '+pg.rows+' rows rendered of '+pg.loaded+' held, '+ms+'ms after open(), next frame '+blk+'ms; per Load-older tap '+JSON.stringify(tapMs)+'ms (includes this gate\'s own settle polls)');
      const mm=(pg.more||'').match(/^Show (\d+) more games · ([\d,]+) not shown/);
      const shownN=mm?+mm[1]:null,hidN=mm?parseInt(mm[2].replace(/,/g,''),10):null;
      L.say(pg.loaded===capN&&pg.rows>0&&pg.rows<pg.loaded&&pg.rows<=MIN_CAP,'A27d '+tag+': a launch with '+capN+' held RENDERS ONE PAGE - '+pg.rows+' rows, no more than one walk ('+MIN_CAP+') - while the count still says all '+capN,{rows:pg.rows,loaded:pg.loaded,ms});
      L.say(!!mm&&hidN===pg.loaded-pg.rows&&shownN===Math.min(pg.rows,hidN)&&pg.moreH>=44,'A27e '+tag+': and below it a 44px control states how many more it shows and how many are not shown ('+(pg.loaded-pg.rows)+'), so nothing is cut without saying so',{button:pg.more,h:pg.moreH,expectHidden:pg.loaded-pg.rows});
      const r1rows=pg.rows;await b.page.locator('button',{hasText:/^Show \d+ more games/}).first().click({timeout:4000}).catch(()=>{});await b.settle(400);
      const r2rows=await b.page.evaluate(()=>document.querySelectorAll('[data-ct="game-row"]').length);
      L.say(shownN!==null&&r2rows===r1rows+shownN,'A27f '+tag+': one tap shows exactly the '+shownN+' it promised, in the oldest direction ('+r1rows+' -> '+r2rows+')',{before:r1rows,after:r2rows,promised:shownN});
      const rAll=await READ(b);
      L.say(rAll.rows===capN&&rAll.pages>0,'A27g '+tag+': and tapping on reaches every held game - '+rAll.rows+' of '+capN+' after '+rAll.pages+' more tap(s)',{rows:rAll.rows,pages:rAll.pages});
    }
    await b.close();
  }
  {
    // TC-R140 LICHESS: one request per tap with until=<oldest held>, 450 games, newest first. The stub honours max and until.
    const LIU='lioldstub';const liReq=[];const N=450;
    const T=(i)=>Date.UTC(2026,8,28,12,0)-i*3600*1000*7;   // game i is i*7 hours before the newest
    const b=await L.launch({geo:'kunal761',store:{ct_liuser:LIU,ct_accts:'[]',ct_acctgames:'{}'},name:'older-li'});
    await b.ctx.route(/lichess\.org\/api\/games\/user\//,route=>{const u=new URL(route.request().url());liReq.push(u.search);
      const max=+(u.searchParams.get('max')||N),until=u.searchParams.get('until');const lines=[];
      for(let i=0;i<N&&lines.length<max;i++){const t=T(i);if(until&&t>+until)continue;
        const pgn='[Event "Rated blitz game"]\n[Site "https://lichess.org/old'+i+'"]\n[White "'+LIU+'"]\n[Black "liold'+i+'"]\n[Result "1-0"]\n\n'+MOVES+'\n';
        lines.push(JSON.stringify({id:'old'+i,pgn,players:{white:{user:{name:LIU}},black:{user:{name:'liold'+i}}},winner:'white',speed:'blitz',createdAt:t,lastMoveAt:t}));}
      return route.fulfill({status:200,contentType:'application/x-ndjson',body:lines.join('\n')+(lines.length?'\n':'')});});
    await b.open();await b.tile('Review');await b.settle(1800);await rowsSettled(b,1);
    const tag='TC-R140 LOAD OLDER, LICHESS, '+N+' games';
    const r0=await READ(b);
    if(L.say(r0.rows===MIN_CAP&&(await olderBtn(b)).present,'A28-0 vacuity '+tag+': the first request stored '+MIN_CAP+' and the control is offered',{rows:r0.rows,requests:liReq})){
      let taps=0,rN=r0;
      while(taps<6){const o=await olderBtn(b);if(!o.present)break;if(!(await tapOlder(b)))break;taps++;rN=await READ(b);}
      const kN=keysOf(rN);
      L.say(liReq.slice(1).length>0&&liReq.slice(1).every(q=>/[?&]until=\d+/.test(q)),'A28a '+tag+': every tap asked Lichess for games UNTIL the oldest held one',{requests:liReq});
      L.say(rN.rows===N&&new Set(kN).size===N&&!(await olderBtn(b)).present,'A28b '+tag+': and tapping until the control goes holds all '+N+', each once ('+taps+' taps), with the control gone',{rows:rN.rows,distinct:new Set(kN).size,taps});
    }
    await b.close();
  }
  {
    // ── A33 TC-R154 / TC-R155 #549 item (104), jobs/finished-chesscom-daily-games-come-into-review-by-username-when-each-ends-2026-11-03:
    //    A CHESS.COM DAILY GAME COMES INTO REVIEW ONCE IT HAS ENDED, AND NEVER WHILE IT IS BEING PLAYED. Chess.com's fair-play rules
    //    count outside help in a game in progress as a breach whatever the reason, so the engine must never see one: no game in
    //    progress may be stored, listed or analysed. The stub is this block's own (same ctx.route discipline, nothing leaves the
    //    container). The box account gatedaily has an index of 2026/10 and 2026/11. Oct holds three finished live blitz games and
    //    one finished DAILY game. Nov holds one daily game STILL IN PROGRESS, in the in-progress shape chess.com uses for a daily
    //    game being played (players named by URL, no end_time, no result, move_by/turn, PGN Result "*"). Launch 1 must list the
    //    four finished games and nothing of the game in progress, store nothing of it, and not call Nov a month that could not be
    //    loaded (declining a game in progress is not a failed read). Launch 2 - the one check after it ends - the same game is
    //    served ended (end_time, both results, Result "1-0"), and it must be in the list, once, labelled Daily, with no manual
    //    import. Throughout, no request may go to the in-progress lists (/games, /games/to-move).
    // CONTROL-RECORD: 33b93b0 2026-11-07 total=9 red=4 scope=blocks:A33 how=pre-fix source (HEAD 7dbf76d) takes every archive entry with a pgn: A33a A33b A33e A33f red, trial md5 e1459b794abe
    // CONTROL-RECORD: 33b93b0 2026-11-07 total=9 red=1 scope=blocks:A33 how=a month of games in progress only counted as a gap again (missed++): A33c red alone, trial md5 2e7645fe91c4
    // CONTROL-RECORD: 33b93b0 2026-11-07 total=9 red=1 scope=blocks:A33 how=fetchChessCom also asks /player/<u>/games (the in-progress list): A33g red alone, trial md5 b7d04797106f
    // CONTROL-RECORD: 33b93b0 2026-11-07 total=9 red=4 scope=blocks:A33 how=time_class daily dropped from the walk: A33a A33b A33d A33e red, trial md5 927356604fce
    const DU='gatedaily', OPP='dailyopp', T=(y,mo,d,h)=>Math.floor(Date.UTC(y,mo-1,d,h||12,0,0)/1000);
    const dstate={ended:false,hits:[]};
    const pgnOf=(white,black,res,ev,tcs,date)=>['[Event "'+ev+'"]','[Site "Chess.com"]','[Date "'+date+'"]','[Round "-"]','[White "'+white+'"]','[Black "'+black+'"]','[Result "'+res+'"]','[TimeControl "'+tcs+'"]','[Termination "'+(res==='*'?'':white+' won by resignation')+'"]','',(res==='*'?'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *':MOVES)].join('\n');
    const b=await L.launch({geo:'kunal761',store:{ct_ccuser:DU,ct_accts:'[]',ct_acctgames:'{}'},name:'daily-ended'});
    await b.ctx.route(/api\.chess\.com/,async(route)=>{const u=route.request().url();dstate.hits.push(u.replace('https://api.chess.com/pub/player/',''));
      if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['2026/10','2026/11'].map(m=>'https://api.chess.com/pub/player/'+DU+'/games/'+m)})});
      const m=u.match(/games\/(\d{4})\/(\d{2})$/);
      if(!m)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
      const games=[];
      if(m[2]==='10'){
        for(let i=0;i<3;i++)games.push({url:'https://www.chess.com/game/live/9'+i,pgn:pgnOf(DU,'liveopp'+i,'1-0','Live Chess','180','2026.10.'+(10+i)),time_control:'180',end_time:T(2026,10,10+i),rated:true,time_class:'blitz',rules:'chess',white:{username:DU,result:'win',rating:1400},black:{username:'liveopp'+i,result:'resigned',rating:1390}});
        games.push({url:'https://www.chess.com/game/daily/8001',pgn:pgnOf(DU,'dailydone','1-0',"Let's Play!",'1/86400','2026.10.20'),time_control:'1/86400',end_time:T(2026,10,20),rated:true,time_class:'daily',rules:'chess',white:{username:DU,result:'win',rating:1400},black:{username:'dailydone',result:'resigned',rating:1390}});
      }else if(m[2]==='11'){
        if(dstate.ended)games.push({url:'https://www.chess.com/game/daily/8002',pgn:pgnOf(DU,OPP,'1-0',"Let's Play!",'1/86400','2026.11.05'),time_control:'1/86400',end_time:T(2026,11,5),rated:true,time_class:'daily',rules:'chess',white:{username:DU,result:'win',rating:1400},black:{username:OPP,result:'resigned',rating:1390}});
        else games.push({url:'https://www.chess.com/game/daily/8002',move_by:T(2026,11,6),pgn:pgnOf(DU,OPP,'*',"Let's Play!",'1/86400','2026.11.01'),time_control:'1/86400',last_activity:T(2026,11,4),rated:true,turn:'white',fen:'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',start_time:T(2026,11,1),time_class:'daily',rules:'chess',white:'https://api.chess.com/pub/player/'+DU,black:'https://api.chess.com/pub/player/'+OPP});
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games})});});
    const tag='TC-R154 DAILY GAME IN PROGRESS';
    // a held row of the game IN PROGRESS: its PGN Result is "*", or it carries no end date (the in-progress shape has no end_time);
    // `named` also counts any held row whose PGN names its opponent, which before it ends must be none
    const inProg=(r,named)=>{let n=0;Object.keys(r.idbMap||{}).forEach(id=>(r.idbMap[id]||[]).forEach(g=>{if(/\[Result\s+"\*"\]/.test(g.pgn||'')||!(g.date>0)||(named&&new RegExp('\\[Black "'+OPP+'"\\]').test(g.pgn||'')))n++;}));return n;};
    const oppRows=(r)=>{let n=0;Object.keys(r.idbMap||{}).forEach(id=>(r.idbMap[id]||[]).forEach(g=>{if(g.black===OPP)n++;}));return n;};
    const rowTexts=()=>b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="game-row"]')].map(x=>(x.innerText||'').replace(/\s+/g,' ').trim()));
    const nov=(hs)=>hs.filter(h=>/games\/2026\/11$/.test(h)).length;
    const live=(hs)=>hs.filter(h=>/\/games(\/to-move)?\/?$/.test(h)).length;
    await b.open();await b.tile('Review');await b.settle(1800);const st1=await rowsSettled(b,1);
    const r1=await READ(b);const t1=await rowTexts();const hs1=dstate.hits.slice();
    if(L.say(st1.ok&&nov(hs1)>=1&&r1.rows>=1,'A33-0 vacuity '+tag+': the walk ran and asked for Nov - the month holding the game in progress - and the Review list rendered',{settled:st1.ok,requests:hs1,rows:r1.rows})){
      L.say(r1.rows===4&&!t1.some(x=>x.indexOf(OPP)>=0||/White vs Black/.test(x)),'A33a '+tag+': THE GAME IN PROGRESS IS NOT LISTED - the four finished games are, and no row names its opponent',{rows:r1.rows,expect:4,rowTexts:t1});
      L.say(inProg(r1,true)===0&&r1.stored===4,'A33b '+tag+': and NOTHING of it is stored - no held game carries Result "*" or its opponent - so the background pass, which analyses held games only, can never put the engine on it',{inProgressHeld:inProg(r1,true),stored:r1.stored});
      L.say(!GAP_RE.test(r1.body||''),'A33c '+tag+': and the month that held only the game in progress is NOT called a month that could not be loaded - declining a game being played is not a failed read',{gapSaid:((r1.body||'').match(GAP_RE)||['none'])[0],line:r1.cap&&r1.cap.text});
      L.say(t1.some(x=>/vs dailydone/.test(x)&&/Daily/.test(x)),'A33d '+tag+': and the finished daily game IS listed, labelled Daily',{rowTexts:t1});
      // launch 2: the one check after the game ends
      dstate.ended=true;const h2=dstate.hits.length;
      await b.open();await b.tile('Review');await b.settle(1800);const st2=await rowsSettled(b,1);
      const r2=await READ(b);const t2=await rowTexts();const hs2=dstate.hits.slice(h2);
      L.say(st2.ok&&nov(hs2)===1&&r2.rows===5&&oppRows(r2)===1&&t2.filter(x=>x.indexOf('vs '+OPP)>=0&&/Daily/.test(x)).length===1,'A33e TC-R155 DAILY GAME ENDED: on the first launch after it ended the same daily game IS in Review without a manual import - listed once, as vs '+OPP+', labelled Daily, beside the four it held (5)',{rows:r2.rows,heldOnce:oppRows(r2),requests:hs2,rowTexts:t2});
      L.say(inProg(r2)===0,'A33f TC-R155: and what is held of it is the ENDED game - nothing with Result "*" was kept from the launch before',{inProgressHeld:inProg(r2)});
    }
    L.say(live(dstate.hits)===0,'A33g '+tag+': no request at any point went to chess.com\'s lists of games IN PROGRESS (/games, /games/to-move) - only the archive index and its months',{inProgressListRequests:live(dstate.hits),requests:dstate.hits});
    L.say(b.errs.length===0,'A33h '+tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  L.done('61-review-list-month-independence');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('61-review-list-month-independence');});
