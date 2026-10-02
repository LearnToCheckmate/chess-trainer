// regress/18-drill-credit-provenance.js   TC-R42 (US-R32): a DRILL SOLVE IS NOT A LICHESS SOLVE.
//
// THE DEFECT, measured on origin/main 50a21b7 before the fix and reproduced by block A below.
// chess.jsx's solve path ends:  if(p.ext){onlineSolved(p); setPuzMsg('🎉 '+...)}
// Every drill card is p.ext, because puzzleFromMistake builds it through _lichessObj - which also prepends
// its own 'lichess:' to the id it is handed, so a drill card's id is literally 'lichess:mine:<fen>'.
// onlineSolved banked that id into onlineIds beside real Lichess puzzles and incremented pzOSolved, so the
// Puzzles screen printed "Online puzzles (Lichess) · N solved" to a player who has opened none of them.
// ON THE BRILLIANCIES DRILL IT IS ALSO UNBOUNDED, and that is the half #459 could not reach: the delete
// effect keys on drillKindRef.current==='mistake', so a BRILLIANT card is RETAINED and every re-solve banks
// another streak, a new pzBest, +3 XP and another bumpDaily('puz'). #459's guard (drillGradedAcceptRef) is
// computed only for a graded accept on a `p.mine && !p.brill` card, so on a brilliant card the ref is false
// and the guard lets onlineSolved straight through - correctly by its own logic, which is exactly why the
// job says the mechanism is wider than that fix. jobs/the-brilliant-drill-banks-online-puzzle-credit-
// without-bound-on-main-2026-10-02, raised by antagonist A at #459's diff door.
//
// THE FIX THIS GUARDS: one condition, `if(!p.mine)onlineSolved(p)`, keyed on the card's PROVENANCE rather
// than on how the accept was reached. That is what closes BOTH drills at once.
//
// WHY THIS GATE CAN BE CONTROLLED, WHICH IS THE POINT CLAUDE.md MAKES ABOUT #432. Every assertion here reads
// things that ALREADY EXIST ON MAIN: the localStorage store 'chesstrainer.progress.v1' and the verdict text
// on screen. The fix adds NO selector and NO hook, so the ideal negative control is free - the real shipped
// bundle - and it is what blocks A and B were first run against. An assertion keyed to something the fix
// introduced would have gone green on the broken build by looking through a hole the fix drilled.
//
// BLOCK C IS NOT DECORATION, IT IS WHAT STOPS THE LAZY FIX PASSING. A and B assert that counters do NOT
// move. Deleting onlineSolved outright, or guarding it on p.ext, satisfies both and destroys the feature.
// C drives a REAL non-drill external puzzle through the SAME onlineSolved and requires the counters DO move.
// C must be GREEN ON BOTH BUNDLES; if it ever goes red, the fix has over-reached. (The Lichess daily API is
// served from a route handler, because gates/lib.js blocks lichess.org by design and this sandbox has no
// egress either way. The JSON is the shape lichessFromApi parses, and _lichessSolvePos tries initialPly,
// +1 and -1, so the fixture is robust to an off-by-one in the ply.)
//
// AND BLOCK D IS THE ONE THAT MAKES A GREEN MEAN ANYTHING, per CLAUDE.md's #385 rule: "when an assertion
// says X is absent in state S, assert FIRST that X was present just before, and that S was actually
// reached". A and B are ABSENCE assertions over a counter, so a drive where the solve silently never
// happened would satisfy them perfectly. Every solve below therefore proves itself first: the drill screen
// was reached, the verdict box carries the app's own 🎉 string, and the board accepted the move. If any of
// those fails the gate goes red on ITS OWN assertion rather than passing by not looking.
//
// GEOMETRY: 375x730, Kunal's phone [R19], and ONE geometry deliberately. The decision under test is
// arithmetic on a localStorage object with no viewport term anywhere in its expression - stated rather than
// implied, so this is not read as a sweep it did not run. The three FIT/paint questions on this screen
// belong to jobs/board-jumps-on-drill-verdict and are not touched here.
'use strict';
const L=require('../lib');

const PZKEY='chesstrainer.progress.v1';
const ZERO={solved:{},streak:0,best:0,xp:0,online:0,onlineIds:{}};

// NO REVIEW IS DRIVEN, AND THE REASON IS A DISTINCTION WORTH STATING RATHER THAN A SHORTCUT.
// Gate 51 must review a real game, because the thing IT tests is the CAPTURE - whether the app stores a
// `why` - and a seeded fixture would satisfy its render assertions while the capture site stayed broken.
// Nothing of the sort is true here. What this gate tests is the CREDIT DECISION, taken in one expression
// against one field of the card (p.mine). A seeded card goes through the identical path -
// puzzleFromMistake -> _lichessObj -> loadExternal - and is handed the identical id, 'lichess:mine:<fen>',
// so the decision under test cannot tell a seeded card from a captured one. Seeding is therefore faithful
// HERE and would not have been there. It also keeps the gate fast and byte-deterministic [R36], where a
// Stockfish review is neither. The capture path stays gate 51's to guard.
//
// REACHING THE DRILLS: both buttons live on the mode==='analyze' screen, which is what the Review TILE
// opens - NOT on rev-summary, which is an opaque fixed overlay that covers them. This gate's first draft
// reviewed a game and then looked for the buttons underneath the summary and found nothing, which is the
// "below the fold / covered by another screen" family CLAUDE.md records twice. tile('Review') is the one
// route, and it needs no review at all.
//
// The two positions are deliberately DIFFERENT, so the two drills produce DIFFERENT card ids and block B
// cannot be satisfied by a row block A already wrote.

// Brilliancy: White Qd2 takes a free rook on d5. Non-mating and not even check (d5 does not bear on e8),
// so the solve goes through the ordinary path rather than the isMate branch. puzzleFromMistake's guards
// are satisfied by construction: the side NOT to move is not in check, and d2d5 is legal.
const BFEN='4k3/8/8/3r4/8/8/3Q4/4K3 w - - 0 1';
const bcard=()=>({fen:BFEN,uci:'d2d5',label:'Brilliant',played:'Qd3',why:'Qxd5 wins a whole rook for nothing.',hint:'A free piece.',last:null,ts:Date.now()});
// THREE COPIES OF THE SAME POSITION, and the reason is stated rather than left to look like sloppiness.
// The farm needs the SAME card solved repeatedly, and a real player does that by leaving the drill and
// re-entering it, because a brilliant card is never deleted. Seeding the one card three times walks the
// SAME code path with the SAME card id, which is the only thing onlineSolved keys on - so the `already`
// branch is exercised exactly as a real re-entry exercises it, and 'Next >' drives it without navigating
// away. The identical id is what makes the substitution faithful, and A4 asserts on that id.
const BRIL=[bcard(),bcard(),bcard()];

// Mistake: White Qa2 takes a free rook on a5. A DIFFERENT position, so a different card id.
const MFEN='7k/8/8/r7/8/8/Q7/6K1 w - - 0 1';
const MIST=[{fen:MFEN,uci:'a2a5',label:'Mistake',played:'Qb2',why:'Qxa5 just wins the rook; Qb2 left it alone.',hint:'Count the defenders.',last:null,ts:Date.now()}];

// The Lichess daily, as lichessFromApi parses it. 1.e4 e5 2.Nf3 Nc6 3.Bb5 then ...a6 is the solution's
// first (and only solving) move: _walkUci puts index 0 in sol and index 1 in reply, so one move solves it.
// _lichessSolvePos tries initialPly, +1 and -1 and keeps whichever makes solution[0] legal, so the fixture
// is robust to an off-by-one in the ply rather than depending on one.
const DAILY={game:{pgn:'1. e4 e5 2. Nf3 Nc6 3. Bb5'},puzzle:{id:'ctgate18',initialPly:5,solution:['a7a6','b5a4'],rating:1500,themes:['mix']}};

const store=(b)=>b.page.evaluate((k)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}},PZKEY);
const mineIds=(s)=>Object.keys((s&&s.onlineIds)||{}).filter(k=>/(^|:)mine:/.test(k));
// the drill verdict box: the childless descendant of pz-top whose own text is the verdict. Located
// structurally because that box carries no data-ct (jobs/pz-verdict-box-has-no-data-ct); gate 51 does the
// same and says so, and the charter forbids inventing a selector.
const verdict=(b)=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;
  const all=[...top.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^(?:🎉|✗|👁|💡)/.test((e.innerText||'').trim()));
  return all.length?(all[all.length-1].innerText||'').replace(/\s+/g,' ').trim():null;});

L.run(async()=>{
  // ================= LAUNCH 1: both drills, after one real review =====================================
  const b=await L.launch({geo:'kunal730',name:'drill-credit',store:Object.assign({},{
    ct_mymistakes:MIST,
    ct_mybrilliancies:BRIL,
    ct_bril_reset_v1:'1',   // chess.jsx:2730 empties ct_mybrilliancies once per install unless this is set.
                            // Without it the brilliancies drill cannot be reached at all and block A would
                            // be unrunnable - the #457 handover note names this trap and it is real.
    [PZKEY]:ZERO})});
  await b.open();
  L.note('bundle on the page: '+(await b.stamp()));
  L.note('GEOMETRY: 375x730 only (Kunal). The decision under test has no viewport term; see the header.');

  const seeded=await store(b);
  L.say(!!seeded&&seeded.online===0&&seeded.streak===0&&seeded.xp===0,
    'TC-R42 D0 INSTRUMENT: the puzzle store starts at zero, so every later reading is a delta from a known baseline',seeded);
  const bril0=await b.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mybrilliancies')||'[]'));
  L.say(bril0.length===3,'TC-R42 D1 INSTRUMENT: the brilliancies store survived the ct_bril_reset_v1 migration (3 seeded)',{len:bril0.length});

  const mist0=await b.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
  L.say(mist0.length===1,'TC-R42 D1b INSTRUMENT: the mistakes store seeded (1 card, a different position from the brilliancy so the two card ids differ)',{len:mist0.length});

  // The Review TILE opens mode==='analyze', which is where both drill buttons live. See the header note.
  await b.tile('Review');await b.settle(900);
  const btns=await b.page.evaluate(()=>({bril:/Your brilliant moves/i.test(document.body.innerText||''),mis:/find the move you missed/i.test(document.body.innerText||'')}));
  L.say(btns.bril&&btns.mis,'TC-R42 D2 ARRIVAL: the analyze screen offers BOTH drills, so blocks A and B each have a door and a red below is about the credit rather than about navigation',btns);
  const beforeAny=await store(b);
  L.say(!!beforeAny&&beforeAny.online===0&&beforeAny.streak===0&&beforeAny.xp===0,
    'TC-R42 D2b INSTRUMENT: reaching the analyze screen credits nothing by itself, so every delta below belongs to a SOLVE',beforeAny);

  // ---------- BLOCK A: the brilliancies drill. THE FILED DEFECT, AND THE UNBOUNDED ONE. ----------------
  await b.tapText(/^Your brilliant moves$/,{wait:1800}).catch(async()=>{await b.tapText(/Your brilliant moves/,{wait:1800});});
  await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  L.say(true,'TC-R42 A0 ARRIVAL: the brilliancies drill opened (pz-top is on screen)');

  const seen=[];
  for(let i=1;i<=3;i++){
    if(i>1){ await b.tapText(/^Next ›$/,{wait:1400});
             await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000}); }
    const bd=await b.board();
    L.say(!!bd,'TC-R42 A1['+i+'/3] ARRIVAL: solve '+i+' has a board to play on',bd?{w:Math.round(bd.w*100)/100,flip:bd.flip}:null);
    if(!bd)break;
    await b.move('d2','d5',900);await b.settle(1200);
    const v=await verdict(b);
    // THE PROOF THE SOLVE HAPPENED. Without this, "the counters did not move" is satisfied by a drive that
    // never solved anything, which is the whole #385 lesson.
    L.say(!!v&&/^🎉/.test(v),'TC-R42 A2['+i+'/3] THE SOLVE REGISTERED: the app painted its own 🎉 verdict, so the absence assertions below are about the credit and not about a failed drive',{verdict:v});
    const s=await store(b);seen.push(s);
    L.say(!!s&&s.online===0,'TC-R42 A3['+i+'/3] a brilliancies-drill solve does NOT count as a Lichess puzzle solved',{online:s&&s.online,expected:0});
    // F3, from antagonist A: mineIds() is a REGEX-FILTERED SUBSET, so a future change that banked a drill
    // card under a different prefix ('lichess:drill:<fen>') would leave this green. Launch 1 starts from a
    // zeroed store and never loads a real Lichess card, so the available invariant is the TOTAL key count,
    // which this assertion already PRINTED in its detail and did not check. Both are asserted now: the
    // prefix arm names the defect, the total arm cannot be dodged by renaming it.
    const allIds=Object.keys((s&&s.onlineIds)||{});
    L.say(mineIds(s).length===0&&allIds.length===0,'TC-R42 A4['+i+'/3] NO id of any shape is banked into onlineIds by a drill solve - asserted as the TOTAL and not only as the "lichess:mine:" prefix, so renaming the prefix cannot satisfy it',{mineIds:mineIds(s),allIds:allIds,totalExpected:0});
    L.say(!!s&&s.streak===0,'TC-R42 A5['+i+'/3] the puzzle streak does not advance on a drill solve',{streak:s&&s.streak,expected:0});
    L.say(!!s&&s.xp===0,'TC-R42 A6['+i+'/3] no puzzle XP is banked on a drill solve',{xp:s&&s.xp,expected:0});
    L.say(!!s&&s.best===0,'TC-R42 A7['+i+'/3] pzBest is not raised by a drill solve',{best:s&&s.best,expected:0});
  }
  // THE UNBOUNDEDNESS ITSELF, as one assertion over the series rather than three readings that each look
  // fine alone. On the bundle main carries (md5 4dd3b4aa09ed) this series reads streak 1,2,3 and xp
  // 120,123,126 while online sticks at 1 - the `already` guard bounds the COUNT and nothing bounds the rest.
  // That is the shape of the farm.
  //   THE xp FIGURES WERE WRONG IN THIS COMMENT UNTIL #460's ANTAGONIST A VETOED THEM, AND THE SLIP IS
  //   WORTH LEAVING ON THE RECORD. It read "xp 150,153,156". 150 is BLOCK C's number: the daily fixture
  //   below carries rating:1500 and onlineSolved banks max(8, rating/10), so a real Lichess card pays 150.
  //   A DRILL CARD CARRIES NO RATING - puzzleFromMistake passes null - so it falls back to 1200 and pays
  //   120, then +3 on each `already` re-solve. I had written the Lichess paragraph's figure into the drill
  //   paragraph, in the same file whose own control log prints 120/123/126 fourteen lines down. A reader
  //   taking the 150 at face value would have concluded a drill card is rated 1500.
  //   AND CITE THE md5, NOT THE BUILD NUMBER. This comment and A8 below both said "shipped #459". The
  //   bundle on main is md5 4dd3b4aa09ed and its embedded stamp reads #452, because #453 to #459 all shipped
  //   records only and never rebuilt app.js. Four build numbers in this project already name more than one
  //   artefact (#440, #441, #451, #452), which is why the md5 is the reference and the number is not.
  if(seen.length===3){
    const mono=seen.map(s=>(s&&s.streak)||0);
    L.say(mono[0]===0&&mono[1]===0&&mono[2]===0,
      'TC-R42 A8 THE FARM IS CLOSED: three solves of the SAME retained brilliant card bank nothing cumulatively (the bundle on main, md5 4dd3b4aa09ed, reads a rising streak 1,2,3 and xp 120,123,126 here while the online count stays at 1)',{streakAfterEachSolve:mono,xp:seen.map(s=>(s&&s.xp)||0)});
  }
  const dailyAfterA=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_daily')||'null');}catch(e){return null;}});
  // NOTE WHAT null MEANS HERE, because "the counters stay 0" is not quite true and A disputed it correctly:
  // under the fix bumpDaily is never called, so ct_daily is never CREATED and reads null rather than 0.
  // On the bundle main carries it reads {date,count:3,streak:1} after these three solves.
  L.note('ct_daily after block A (bumpDaily(\'puz\') is the fourth thing onlineSolved does; null = never written): '+JSON.stringify(dailyAfterA));

  // ---------- BLOCK B: the MISTAKES drill, on the app's OWN captured card ------------------------------
  // The SECOND instance of the class. #459 closed the graded-accept path on this drill; the credit itself
  // was still being banked here on main, because the guard it added keys on how the accept was reached.
  const mis=await b.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
  L.say(mis.length>=1,'TC-R42 B0 INSTRUMENT: a mistakes card is still available to drill (the mistakes drill DELETES its card on solve, which is exactly why this instance is bounded and the brilliancies one is not)',{available:mis.length});
  if(mis.length>=1){
    await b.home();await b.settle(500);
    await b.tile('Review');await b.settle(900);
    const before=await store(b);
    await b.tapText(/find the move you missed/,{wait:1800});
    await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
    const u=mis[0].uci;
    const bd=await b.board();
    L.say(!!bd,'TC-R42 B1 ARRIVAL: the mistakes drill opened with a board',bd?{w:Math.round(bd.w*100)/100}:null);
    await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1200);
    const v=await verdict(b);
    L.say(!!v&&/^🎉/.test(v),'TC-R42 B2 THE SOLVE REGISTERED on the mistakes drill',{verdict:v,uci:u});
    const after=await store(b);
    L.say(!!after&&after.online===((before&&before.online)||0),'TC-R42 B3 a MISTAKES-drill solve does NOT count as a Lichess puzzle solved either - the guard is on the card, not on the drill kind',{before:before&&before.online,after:after&&after.online});
    L.say(mineIds(after).length===0&&Object.keys((after&&after.onlineIds)||{}).length===0,'TC-R42 B4 the mistakes card is not banked into onlineIds, asserted as the TOTAL key count (F3)',{mineIds:mineIds(after),allIds:Object.keys((after&&after.onlineIds)||{}),totalExpected:0});
    L.say(!!after&&after.xp===((before&&before.xp)||0),'TC-R42 B5 no puzzle XP from a mistakes-drill solve',{before:before&&before.xp,after:after&&after.xp});
  }
  L.note('console errors in launch 1: '+b.errs.length+(b.errs.length?('  '+JSON.stringify(b.errs.slice(0,3))):''));
  L.say(b.errs.length===0,'TC-R42 D3 no console errors across both drills',{errs:b.errs.slice(0,3)});
  await b.close();

  // ================= LAUNCH 2: BLOCK C, THE LEAK GUARD. MUST BE GREEN ON BOTH BUNDLES. ================
  const c=await L.launch({geo:'kunal730',name:'drill-credit-leak',store:{[PZKEY]:ZERO}});
  // registered AFTER lib's BLOCK abort route, so this handler wins for the daily endpoint; everything else
  // on lichess.org stays aborted exactly as the harness intends.
  await c.ctx.route(/lichess\.org\/api\/puzzle\/daily/,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(DAILY)}));
  await c.open();
  const c0=await store(c);
  L.say(!!c0&&c0.online===0,'TC-R42 C0 INSTRUMENT: launch 2 starts from a zeroed store',c0);
  await c.tile('Puzzles');await c.settle(1000);
  // THE CONTROL THIS GATE'S OWN FIRST RUN NEEDED, and it is the lesson CLAUDE.md records for gates 42 and
  // 23 rather than a new one. '🌐 Online puzzles (Lichess) - N solved' sits BELOW THE FOLD on the
  // roadmap (measured: top 560 only AFTER scrolling, on a 730 viewport). tapText picks the smallest
  // VISIBLE match, so with the button off screen it clicked a visible ANCESTOR whose text contained the
  // same words: the tap "succeeded", loadDaily was never called, the route handler never fired and the
  // gate timed out waiting for a board. Scroll the control in, assert it is on screen, THEN tap.
  const ob=c.page.locator('button',{hasText:/^🌐 Online puzzles/}).last();
  await ob.scrollIntoViewIfNeeded();
  const obox=await ob.boundingBox();
  L.say(!!obox&&obox.y>=0&&(obox.y+obox.height)<=c.geo.h,
    'TC-R42 C0b INSTRUMENT: the Online-puzzles control is fully on screen before it is tapped, so a red below is the credit and not a tap that landed on nothing',obox?{y:Math.round(obox.y),h:Math.round(obox.height),vh:c.geo.h}:null);
  await ob.click();await c.settle(2600);
  await c.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:20000});
  const cb=await c.board();
  L.say(!!cb,'TC-R42 C1 ARRIVAL: a real (non-drill) Lichess puzzle loaded and has a board',cb?{w:Math.round(cb.w*100)/100,flip:cb.flip}:null);
  if(cb){
    await c.move('a7','a6',900);await c.settle(1200);
    const cv=await verdict(c);
    L.say(!!cv&&/^🎉/.test(cv),'TC-R42 C2 THE SOLVE REGISTERED on a real Lichess puzzle',{verdict:cv});
    const c1=await store(c);
    // THE ASSERTIONS THAT STOP THE OVER-BROAD FIX. If a future change guards onlineSolved on p.ext, or
    // deletes the call, A and B stay green and these three go red. That asymmetry is the whole design.
    L.say(!!c1&&c1.online===1,'TC-R42 C3 LEAK GUARD: a genuine Lichess solve STILL counts - the fix must key on the card\'s provenance, not remove the credit',{online:c1&&c1.online,expected:1});
    L.say(!!c1&&c1.streak===1,'TC-R42 C4 LEAK GUARD: a genuine Lichess solve still advances the streak',{streak:c1&&c1.streak,expected:1});
    L.say(!!c1&&c1.xp>0,'TC-R42 C5 LEAK GUARD: a genuine Lichess solve still banks XP',{xp:c1&&c1.xp});
    L.say(!!c1&&Object.keys((c1&&c1.onlineIds)||{}).some(k=>k==='lichess:ctgate18'),'TC-R42 C6 LEAK GUARD: the real puzzle\'s own id is banked, so onlineIds still does its job of not re-counting',{ids:Object.keys((c1&&c1.onlineIds)||{})});
  }
  L.note('console errors in launch 2: '+c.errs.length);
  await c.close();

  /* ================= LAUNCH 3: BLOCK E, THE STREAK SINK. =================================================
     THIS BLOCK EXISTS BECAUSE ANTAGONIST A NAMED THE STATE AS THE ONE THE GATE COULD NOT REACH, AND IT WAS
     RIGHT: every other launch here seeds streak 0, so `pzBreakStreak`'s own guard `if(pzStreakRef.current>0)`
     could never be entered, and no block ever played a WRONG move - so the miss branch of the solve handler
     (chess.jsx:3991), which writes to the very store blocks A and B read, was never executed on any bundle.
     WHAT IT CAUGHT, which is why it is worth more than the assertions it adds: guarding only the CREDIT left
     the drill a pure streak SINK. A drill fumble broke a streak built on real Lichess puzzles, and after the
     credit guard it could no longer be rebuilt by drilling - so the first version of this build made that one
     state WORSE than the defect it was fixing. The repair is the same provenance predicate at the sibling
     site, and this block is its control. Measured by A on the first candidate at 375x730: streak 5 -> 0 on
     one fumble, then 0 after solving. ================================================================== */
  const e=await L.launch({geo:'kunal730',name:'drill-credit-sink',store:{
    ct_mybrilliancies:[bcard()],
    ct_bril_reset_v1:'1',
    // FOUR REAL LICHESS ROWS AND A LIVE STREAK. The rows matter: they are what makes the streak this block
    // protects a record of real Lichess work rather than an empty number.
    [PZKEY]:{solved:{},streak:5,best:5,xp:500,online:4,onlineIds:{'lichess:aaaa1':1,'lichess:bbbb2':1,'lichess:cccc3':1,'lichess:dddd4':1}}}});
  await e.open();
  const e0=await store(e);
  L.say(!!e0&&e0.streak===5&&e0.online===4&&e0.xp===500,'TC-R42 E0 INSTRUMENT: launch 3 starts from a store with a LIVE streak of 5 built on 4 real Lichess puzzles, which is the precondition pzBreakStreak needs and which every other launch here lacks',e0);
  await e.tile('Review');await e.settle(900);
  await e.tapText(/^Your brilliant moves$/,{wait:1800}).catch(async()=>{await e.tapText(/Your brilliant moves/,{wait:1800});});
  await e.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  const ebd=await e.board();
  L.say(!!ebd,'TC-R42 E1 ARRIVAL: the brilliancies drill opened with a board',ebd?{w:Math.round(ebd.w*100)/100}:null);
  if(ebd){
    // A WRONG MOVE, not the solution and not a mate: Ke1-e2 is legal here and e2 is attacked by nothing.
    await e.move('e1','e2',900);await e.settle(1100);
    const ev=await verdict(e);
    // THE INSTRUMENT, and it is the whole reason this block is not vacuous: the MISS branch must actually
    // have run. Without this, "the streak survived" is satisfied by a drive whose move was never rejected.
    L.say(!!ev&&/^\u2717/.test(ev),'TC-R42 E2 THE MISS REGISTERED: the app painted its own rejection, so the miss branch at chess.jsx:3991 really executed and E3 is about provenance rather than about a move that quietly succeeded',{verdict:ev});
    const e1=await store(e);
    L.say(!!e1&&e1.streak===5,'TC-R42 E3 A DRILL FUMBLE DOES NOT BREAK A LICHESS STREAK: the drill neither builds nor breaks puzzle progress, which is the whole point of keying on the card and not on the outcome (the bundle on main, md5 4dd3b4aa09ed, reads 0 here)',{streak:e1&&e1.streak,expected:5});
    L.say(!!e1&&e1.best===5&&e1.online===4&&e1.xp===500,'TC-R42 E4 and the fumble moves nothing else either',{best:e1&&e1.best,online:e1&&e1.online,xp:e1&&e1.xp,expected:{best:5,online:4,xp:500}});
    // then SOLVE it, which is the asymmetry the sink was made of: break on a miss, no rebuild on a solve.
    await e.move('d2','d5',900);await e.settle(1200);
    const ev2=await verdict(e);
    L.say(!!ev2&&/^\ud83c\udf89/.test(ev2),'TC-R42 E5 THE SOLVE REGISTERED after the fumble',{verdict:ev2});
    const e2=await store(e);
    L.say(!!e2&&e2.streak===5&&e2.online===4&&e2.xp===500,'TC-R42 E6 THE SINK IS CLOSED IN BOTH DIRECTIONS: after a fumble AND a solve on a drill card the Lichess streak, count and XP are exactly what the player earned on real puzzles (main reads streak 1, online 5, xp 620 - it destroys 5 and hands back 1)',{streak:e2&&e2.streak,online:e2&&e2.online,xp:e2&&e2.xp,expected:{streak:5,online:4,xp:500}});
    L.say(Object.keys((e2&&e2.onlineIds)||{}).length===4&&mineIds(e2).length===0,'TC-R42 E7 the four real Lichess rows are untouched and no drill row joined them',{ids:Object.keys((e2&&e2.onlineIds)||{})});
  }
  L.note('console errors in launch 3: '+e.errs.length);
  L.say(e.errs.length===0,'TC-R42 E8 no console errors in the streak-sink walk',{errs:e.errs.slice(0,3)});
  await e.close();
},'18-drill-credit-provenance');
