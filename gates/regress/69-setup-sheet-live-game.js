// regress/69-setup-sheet-live-game.js   NOTHING ON THE PRE-GAME SETUP SCREEN MAY ACT ON THE GAME BEHIND IT.
// Written at #470 for jobs/tapping-computer-on-the-new-game-sheet-plays-a-move-into-the-live-game-behind-it-
// 2026-10-03 (antagonist B at #469's shipped-surface door) and for the SECOND instance of the same class that
// the R06 sweep found and this gate's own author drove: the adaptive-Elo effect.
//
// ══ WHAT IT GUARDS, AND THE TWO MEASUREMENTS IT WAS BUILT FROM ════════════════════════════════════════
// The setup screen is a position:fixed overlay over a game that is STILL MOUNTED (that is the premise of
// #469's resume row), and its Opponent tiles write the SHARED `opponent` state with no draft copy
// (chess.jsx:5657). Two effects are gated on that state and ACT rather than render:
//   (1) the AI auto-move effect. MEASURED on origin/main's shipped bundle af44e6a3b231 at 375x730: live
//       Pass & Play 1.f3 e5 2.g4 (play-moverow "1.f3 1...e5 2.g4", 3 plies), house, Play tile (still 3),
//       then the Computer tile AND NOTHING ELSE -> "1...e5 2.g4 2...Qh4#", 4 plies. Qh4# is mate. The player
//       chose an opponent on a sheet and was mated in the game behind it.
//   (2) the adaptive-Elo effect. MEASURED on the same bundle, same geometry: seed ct_elo 800, play the
//       Pass & Play fool's mate (the COMPUTER never moved in it), house, Play tile, Computer tile -> ct_elo
//       800 -> 750, persisted. #466 guarded this effect against an INHERITED board by requiring
//       game.history.length === playHist.length; a Pass & Play game is played through doMove and satisfies
//       that invariant at 4 and 4, so #466's guard passes and the strength still moves. eloMsg measured null
//       on both sides of the tap, so the player is never told.
//
// ══ WHY A6/A7 EXIST, AND IT IS THE TRAP THIS GATE WAS ALMOST BUILT ON ════════════════════════════════
// The obvious fix is `playSetup` on the two guards, and the obvious gate asserts the plies do not move while
// the sheet is up. THAT PAIR IS GREEN ON A BUNDLE THAT STILL LOSES THE GAME. #469's resume row is
// setPlaySetup(false) and nothing else, so the sheet closes, the guard lifts, `opponent` is still 'computer',
// and the engine plays into the game the player just asked to go back to. The damage MOVES to the tap nobody
// was asserting over - CLAUDE.md's flex-shrink trap, fifth costume. NC2 below is that bundle and it reddens
// A6/A7 while A4 stays green, which is what proves A4 alone is not the finish line.
//
// ══ THE INSTRUMENT FOR "IS IT STILL MY GAME", AND WHY IT IS NOT A HOOK THIS BUILD ADDED ══════════════
// A7 reads [data-ct="eval-bar-v"], which chess.jsx:7586 paints iff (inReview || (mode==='play' &&
// opponent==='computer')) && !hideEval && !evalUnder. It is the app's own pre-existing readout of `opponent`,
// so a bundle that resumes with opponent='computer' paints it and a correctly resumed Pass & Play game does
// not. #432's rule: a check that reads only what the fix added cannot see the defect the fix removes - so
// nothing here queries an attribute this build drilled, and A7's ability to fail is proved by NC2 rather than
// assumed. A7 is asserted TOGETHER with A7p, which measures the bar PRESENT in a real vs-Computer game at the
// same geometry in the same run: without A7p, "the bar is absent" is satisfied by a bundle where hideEval
// happens to be on and the assertion could not fail (#385's rule - assert X was present just before).
//
// ══ C IS A POSITIVE CONTROL ON THE FIX ITSELF ════════════════════════════════════════════════════════
// A guard on `playSetup` could stop the engine for ever. C starts a real game from the sheet as Computer +
// Black and requires the engine to move. A gate that only asserts "no move" would be green on a bundle with
// the engine deleted, which is the same shape as #385's bubble assertion passing because the state was never
// reached.
//
// ══ MEASUREMENT RULES OBEYED ═════════════════════════════════════════════════════════════════════════
//  1. #root is the scroller, so nothing here reads docScrollY and nothing uses L.over() on the fixed overlay
//     (45-play-setup.js established that it cannot see it).
//  2. Plies are counted from data-ct play-moverow via drive/play.js's own parser, never from the board.
//  3. Every "nothing happened" assertion settles PAST the thing it is racing. The engine's own move time is
//     1100ms at cpuElo<1500 (chess.jsx) plus the built-in engine's 300ms timeout, so SETTLE_NOMOVE is 3500ms
//     - more than three times the longest path - and A4/A6 re-read after it. A 500ms settle would pass on the
//     broken bundle by arriving before the move.
//  4. tapStart() is used and never tapBtn(/Start game/), because #469 made that button arm over a live game.
//
// ══ NEGATIVE CONTROLS - three designed, three built, three RUN. Every figure below is this run's own, at
//    CT_GEO=375x730, one node process per bundle (two L.launch calls with different bundles in ONE process
//    serve the first bundle twice - the #469 pen note). The shipped tree reads 21 PASS / 0 FAIL.
//  NC1  origin/main's shipped bundle af44e6a3b231 - the REAL broken build, and free
//        -> 13 PASS / 8 FAIL. A4a RED at plies 4, A4b RED at "1...e5 2.g4 2...Qh4#", B5 RED at ct_elo 750.
//           C2 GREEN, which is correct: the positive control is about the feature, not about the fix.
//  NC2  the two `playSetup` guards WITHOUT the liveSettingsRef restore on resume
//        -> 18 PASS / 3 FAIL, and THIS IS THE CONTROL THAT MATTERS. A4 GREEN - the headline assertion is
//           satisfied - while A6b RED at plies 4, A6c RED at "1...e5 2.g4 2...Qh4#" and A7 RED with the eval
//           bar painted at {"w":14,"h":353.03}, the SAME figure A7p measures in a real vs-Computer game. So
//           the obvious fix passes the obvious assertion and still loses the game on the Resume tap, and A7's
//           instrument is shown able to be present and absent on two bundles rather than assumed.
//  NC3  the restore WITHOUT the AI auto-move guard
//        -> 14 PASS / 7 FAIL. A4a/A4b RED at plies 4.
//        A CORRECTION TO THIS GATE'S OWN FIRST HEADER, made before it was committed [R18]: I wrote that NC3
//        would leave "A6/A7 green", and it does not - A6p goes RED too, and consequentially rather than by a
//        second defect. With the AI guard gone the engine's move IS the mate, so `_gameOver` is true, and
//        #469's resume row CORRECTLY stays away from a finished game; there is then no resume row to tap and
//        A6a/A6b/A6c/A7 report SKIPPED as red. So NC3 does NOT demonstrate "A6 green while A4 red", and the
//        pair that establishes independence is NC2 (A4 green, A6 red) plus NC3 (A4 red) read together -
//        not NC3 alone. Stated this way because a control's claimed result is worth nothing if the next
//        reader cannot reproduce it from the file.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

const GEOS=[{k:'320x568',w:320,h:568},{k:'375x730',w:375,h:730},{k:'390x844',w:390,h:844}];
const KUNAL='375x730';
const ONLY=process.env.CT_GEO;
// Settle past the engine, not up to it: 1100ms search + 300ms built-in timeout + slack. See rule 3 above.
const SETTLE_NOMOVE=3500;

const moverow=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const sheetUp=(b)=>b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-sheet"]'));
const evalBar=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="eval-bar-v"]');if(!e)return null;const r=e.getBoundingClientRect();return {w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100};});
const elo=(b)=>b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return 'ERR';}});
const bars=(b)=>b.page.evaluate(()=>{const g=(k)=>{const e=document.querySelector('[data-ct="pbar-'+k+'"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;};return {top:g('top'),bottom:g('bottom')};});
const hasBtn=(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);return [...document.querySelectorAll('button')].some(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1&&r.test((x.innerText||'').trim());});},[re.source,re.flags]);

// A LIVE 2-PLY Pass & Play game (1.f3 e5), left by the house, with the Play setup sheet open over it.
// TWO PLIES AND NOT THREE, and the number is the single most important line in this file. At 3 plies it is
// Black to move and the engine's reply IS 2...Qh4# - so on any bundle where the engine gets a move, the game
// ends, `_gameOver` goes true, #469's resume row CORRECTLY disappears, and every assertion about the resume
// path reports SKIPPED instead of measuring anything. That is exactly why this gate's first version could not
// see the `‹ Home` defect and why NC3 had an unreachable control cell. At 2 plies it is WHITE to move, the
// engine's move is an ordinary one, the game stays live, and the resume row stays on screen - so the resume
// assertions are evaluated on every bundle rather than being skipped on the broken ones.
async function liveGameThenSheet(b){
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5');
  await b.settle(400);
  const plies=await P.plies(b), row=await moverow(b), board=await b.board();
  await b.tapCt('play-home',650);
  await b.tile('Play'); await b.settle(700);
  return {plies,row,boardW:board?Math.round(board.w*100)/100:null,flip:board?board.flip:null};
}

L.run(async()=>{
  for(const g of (ONLY?GEOS.filter(x=>x.k===ONLY):GEOS)){
   try{
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:'',label:g.k},name:'setupsheet-'+g.k});
    await b.open();
    if(g.k===KUNAL)L.note('page stamp at '+KUNAL+': '+(await b.stamp()));

    const live=await liveGameThenSheet(b);
    // A1/A2/A3 are PREMISES. Without them every "nothing moved" below is satisfied by never reaching the state.
    L.say(live.plies===2,'A1 ['+g.k+'] the live Pass & Play game is 2 plies before the house tap (got '+live.plies+', row '+JSON.stringify(live.row)+')');
    const up=await sheetUp(b);
    L.say(up===true,'A2a ['+g.k+'] the Play setup sheet is open over the live game');
    L.say(await hasBtn(b,/^Computer$/)===true,'A2b ['+g.k+'] the sheet carries a Computer opponent tile to tap');
    const pOpen=await P.plies(b);
    L.say(pOpen===2,'A3 ['+g.k+'] opening the sheet over the live game loses nothing (plies '+pOpen+')');

    // ── THE DEFECT: one tap on the opponent tile, and nothing else ────────────────────────────────
    await P.tapBtn(b,/^Computer$/,900);
    await b.settle(SETTLE_NOMOVE);
    const pTap=await P.plies(b), rTap=await moverow(b);
    L.say(pTap===2,'A4a ['+g.k+'] tapping Computer on the sheet plays NO move in the game behind it (plies '+pTap+', expected 2)');
    L.say(rTap===live.row,'A4b ['+g.k+'] the move row behind the sheet is byte-identical after the tap (got '+JSON.stringify(rTap)+')');
    L.say(await sheetUp(b)===true,'A5 ['+g.k+'] the sheet is still up after the tap, so A4 read the game and not a new one');

    // ── THE HALF THE OBVIOUS FIX HANDS BACK: resume returns the player to THEIR game ──────────────
    const hasResume=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-resume"]'));
    L.say(hasResume===true,'A6p ['+g.k+'] the sheet offers the resume row (#469), which is the route A6 tests');
    if(hasResume){
      await b.tapCt('setup-resume',800);
      await b.settle(SETTLE_NOMOVE);
      const pRes=await P.plies(b), rRes=await moverow(b);
      L.say(await sheetUp(b)===false,'A6a ['+g.k+'] resume closed the sheet, so what follows is measured on the live board');
      L.say(pRes===2,'A6b ['+g.k+'] after resume the game is still 2 plies - the engine did not move into it (got '+pRes+')');
      L.say(rRes===live.row,'A6c ['+g.k+'] after resume the move row is byte-identical to the game that was left (got '+JSON.stringify(rRes)+')');
      const bar=await evalBar(b);
      L.say(bar===null,'A7 ['+g.k+'] the resumed game is still Pass & Play: the vs-Computer eval bar is absent (got '+JSON.stringify(bar)+')');
      // A8 IS THE ONE THAT CATCHES A POISONED RESTORE, and it is antagonist A's V6 turned into an assertion.
      // A7 reads the bar at the instant of the resume; if `opponent` came back as 'computer' the player's own
      // NEXT move wakes the engine and the game is lost one tap later. So play a legitimate move and require
      // that nothing answers it.
      const pBefore=await P.plies(b);
      await b.move('g2','g4'); await b.settle(SETTLE_NOMOVE);
      const pAfter=await P.plies(b);
      L.say(pAfter===pBefore+1,'A8 ['+g.k+'] after resume the player\'s own move is answered by NOBODY: plies '+pBefore+' -> '+pAfter+' (expected '+(pBefore+1)+', an engine reply would make it '+(pBefore+2)+')');
      const bd=await b.board();
      const bw=bd?Math.round(bd.w*100)/100:null;
      L.say(bw!==null&&live.boardW!==null&&Math.abs(bw-live.boardW)<0.6,'A9 ['+g.k+'] the board is the width it was before the sheet was opened (before '+live.boardW+', after '+bw+') - the vs-Computer eval bar takes board width, so a restore that leaves opponent=computer shrinks it');
    }else{
      L.say(false,'A6a ['+g.k+'] SKIPPED - no resume row to tap (A6p red)');
      L.say(false,'A6b ['+g.k+'] SKIPPED');
      L.say(false,'A6c ['+g.k+'] SKIPPED');
      L.say(false,'A7 ['+g.k+'] SKIPPED');
      L.say(false,'A8 ['+g.k+'] SKIPPED');
      L.say(false,'A9 ['+g.k+'] SKIPPED');
    }
    await b.shot('69-resumed-'+g.k);
    await b.close();
   }catch(e){L.say(false,'A-THREW ['+g.k+'] the A scenario threw and its remaining assertions did not run: '+(e&&e.message||e));}
  }

  // ── A7p: THE EVAL BAR IS PRESENT IN A REAL vs-COMPUTER GAME, so A7 is not a vacuous absence ──────
  // Separate process-level browser, Kunal's geometry only: A7's instrument must be shown able to be present.
  try{
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'setupsheet-evalbar-present'});
    await b.open();
    await P.states['cpu-1e4'](b);
    await b.settle(1200);
    const bar=await evalBar(b);
    L.say(bar!==null&&bar.w>0&&bar.h>0,'A7p ['+KUNAL+'] the vs-Computer eval bar IS painted in a real vs-Computer game, so A7 above can fail (got '+JSON.stringify(bar)+')');
    await b.close();
  }catch(e){L.say(false,'A7p-THREW the eval-bar presence control threw: '+(e&&e.message||e));}

  // ── B: THE SECOND INSTANCE OF THE CLASS - the adaptive strength ──────────────────────────────────
  // No viewport term in the expression, so Kunal's geometry only and the job's notChecked says the same.
  try{
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'setupsheet-elo'});
    await b.open();
    await b.page.evaluate(()=>{try{localStorage.setItem('ct_elo','800');}catch(e){}});
    await b.page.reload(); await b.settle(1200);
    const e0=await elo(b);
    L.say(e0==='800','B1 ct_elo seeds at 800 (got '+e0+'), the baseline the rest of B is read against');
    await P.states['pp-mate'](b);                 // the COMPUTER plays no move in a Pass & Play fool's mate
    const pm=await P.plies(b);
    L.say(pm===4,'B2 the Pass & Play game reached the 4-ply fool\'s mate (got '+pm+'), so a result exists to be mis-scored');
    const eMate=await elo(b);
    L.say(eMate==='800','B3 the Pass & Play result on its own does NOT move the computer\'s strength (ct_elo '+eMate+')');
    await b.tapCt('play-home',650);
    await b.tile('Play'); await b.settle(700);
    L.say(await sheetUp(b)===true,'B4p the setup sheet is open over the finished game, which is the state B5 tests');
    await P.tapBtn(b,/^Computer$/,900);
    await b.settle(2500);
    const eTap=await elo(b);
    L.say(eTap==='800','B5 tapping Computer does NOT score a game the computer never played against its strength (ct_elo '+eTap+', expected 800)');
    // B6 IS B5's SECOND DOOR, and on the first #470 candidate B5 passed while B6 failed - the guard held the
    // strength only while the sheet was up and handed it over the moment the sheet closed by ‹ Home.
    // Antagonist A's Y4: ct_elo 800 -> 750, persisted, with eloMsg never shown.
    await P.tapBtn(b,/^‹ Home$/,900);
    await b.settle(2500);
    const eHome=await elo(b);
    L.say(eHome==='800','B6 closing the sheet by its own ‹ Home button does not score it either (ct_elo '+eHome+', expected 800)');
    await b.close();
  }catch(e){L.say(false,'B-THREW the adaptive-strength scenario threw: '+(e&&e.message||e));}


  // ── D: THE SECOND DOOR OFF THE SHEET. This block is antagonist A's veto on #470's FIRST candidate. ──────
  // The sheet has its own `‹ Home` button (chess.jsx:5607, `setPlaySetup(false);setHomeScreen(true);`). The
  // first fix restored inside the setup-resume onClick only, so this door closed the sheet with `opponent`
  // still 'computer' and the guard lifted: measured on bundle db62f6bd58ce at 375x730, plies 3 -> 4 and
  // "1...e5 2.g4 2...Qh4#", with the resume row then gone because the game was over. NOTE WHO ELSE PREFERS
  // THIS DOOR: gates/lib.js's own b.home() tries /^‹ Home$/ first when the sheet is up, so the harness takes
  // the unguarded exit by default - which is part of why nothing had noticed it.
  for(const g of (ONLY?GEOS.filter(x=>x.k===ONLY):GEOS.filter(x=>x.k===KUNAL))){
   try{
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:'',label:g.k},name:'setupsheet-homedoor-'+g.k});
    await b.open();
    const live=await liveGameThenSheet(b);
    L.say(live.plies===2,'D1p ['+g.k+'] premise: a live 2-ply game with the sheet open (got '+live.plies+')');
    L.say(await hasBtn(b,/^‹ Home$/)===true,'D1q ['+g.k+'] premise: the sheet carries its own ‹ Home button, which is the door D tests');
    await P.tapBtn(b,/^Computer$/,900);
    await b.settle(SETTLE_NOMOVE);
    L.say(await P.plies(b)===2,'D2 ['+g.k+'] still 2 plies with the sheet up (the A4 state, re-established inside D)');
    await P.tapBtn(b,/^‹ Home$/,900);
    await b.settle(SETTLE_NOMOVE);
    L.say(await sheetUp(b)===false,'D3p ['+g.k+'] the sheet\'s ‹ Home button closed the sheet');
    const pHome=await P.plies(b), rHome=await moverow(b);
    L.say(pHome===2,'D3 ['+g.k+'] THE VETO ASSERTION: closing the sheet by its own ‹ Home button plays NO move in the live game (plies '+pHome+', expected 2; the first #470 candidate read 4 here with the move 2...Qh4#)');
    L.say(rHome===live.row||rHome===null,'D3b ['+g.k+'] the move row is unchanged or off screen behind Home (got '+JSON.stringify(rHome)+')');
    await b.tile('Play'); await b.settle(700);
    const hasR=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-resume"]'));
    L.say(hasR===true,'D4 ['+g.k+'] the game is still RESUMABLE after the ‹ Home round trip - the resume row is offered (on the broken bundle the engine\'s move ended the game and this row was gone, making it unrecoverable)');
    if(hasR){
      await b.tapCt('setup-resume',800); await b.settle(SETTLE_NOMOVE);
      L.say(await P.plies(b)===2,'D5a ['+g.k+'] resumed at 2 plies after the ‹ Home round trip');
      L.say(await evalBar(b)===null,'D5b ['+g.k+'] and it is still Pass & Play - no vs-Computer eval bar (this is the SECOND-OPENING case: the snapshot must not have been re-taken while opponent was already computer)');
      const p0=await P.plies(b);
      await b.move('g2','g4'); await b.settle(SETTLE_NOMOVE);
      const p1=await P.plies(b);
      L.say(p1===p0+1,'D6 ['+g.k+'] and the player\'s own next move is answered by nobody: plies '+p0+' -> '+p1+' (expected '+(p0+1)+')');
    }else{
      L.say(false,'D5a ['+g.k+'] SKIPPED - no resume row');L.say(false,'D5b ['+g.k+'] SKIPPED');L.say(false,'D6 ['+g.k+'] SKIPPED');
    }
    await b.shot('69-homedoor-'+g.k);
    await b.close();
   }catch(e){L.say(false,'D-THREW ['+g.k+'] the ‹ Home door scenario threw: '+(e&&e.message||e));}
  }

  // ── E: THE ONLINE TILE, which replaces the live game with a sign-in screen on a poisoned restore ────────
  // Antagonist A's Z-series: Online tile -> the resume row DISAPPEARS (its own condition is opponent!=='online')
  // -> ‹ Home -> back -> Pass & Play tile -> the row returns -> Resume restored opponent='online', and the
  // board was replaced by "Play a friend online / Sign in with Google" with only ‹ Back out of it.
  try{
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'setupsheet-onlinedoor'});
    await b.open();
    const live=await liveGameThenSheet(b);
    L.say(live.plies===2,'E1p premise: a live 2-ply game with the sheet open (got '+live.plies+')');
    await P.tapBtn(b,/^Online$/,900); await b.settle(1200);
    const rowGone=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-resume"]'));
    L.say(rowGone===false,'E1 selecting Online hides the resume row, which is the app\'s own existing rule (opponent!==online) and is asserted so E2 is known to be a RE-appearance rather than a row that never left');
    await P.tapBtn(b,/^‹ Home$/,900); await b.settle(600);
    await b.tile('Play'); await b.settle(700);
    await P.tapBtn(b,/^Pass & Play$/,700);
    const rowBack=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-resume"]'));
    L.say(rowBack===true,'E2 the resume row is back once a non-online opponent is selected');
    if(rowBack){
      await b.tapCt('setup-resume',900); await b.settle(SETTLE_NOMOVE);
      const mr=await moverow(b), pl=await P.plies(b);
      L.say(mr!==null&&pl===2,'E3 THE LIVE GAME COMES BACK, not the online sign-in screen: play-moverow present and 2 plies (got '+JSON.stringify(mr)+', plies '+pl+'). On the first #470 candidate the snapshot had been re-taken while opponent was online, so Resume restored online and the board was replaced by the sign-in screen.');
    }else{L.say(false,'E3 SKIPPED - no resume row to tap');}
    await b.close();
  }catch(e){L.say(false,'E-THREW the Online door scenario threw: '+(e&&e.message||e));}


  // -- F: THE COLOUR-CHIP DOOR. This block is ANTAGONIST B's, found independently at the shipped-surface --
  // door while A was at the diff door, and it is a THIRD route distinct from A's 'Home' button and from the
  // Resume row. B's measurement on origin/main's shipped bundle af44e6a3b231 at 375x730: live Pass & Play
  // 1.f3 e5 (2 plies, bars "White" / "Black", White to move) -> house -> Play tile -> Computer tile ->
  // ONE COLOUR CHIP, no Start and no confirm -> the game behind the sheet is already at 3 plies, move row
  // "1.f3 1...e5 2.e4": THE ENGINE PLAYED FOR THE COLOUR THE HUMAN OWNED. Resume then returns a vs-Computer
  // game with the player reassigned to Black, bars "Computer 800" / "You", flip true, permanently. With
  // "White" chosen instead B measured TWO injected plies, "1...e5 2.d4 2...Qh4+".
  // B ENDED ITS REPORT BY NAMING THIS AS THE REGRESSION TEST MAIN CURRENTLY FAILS, and this is that test.
  //
  // TWO HARNESS TRAPS B PAID FOR AND THIS BLOCK INHERITS RATHER THAN REDISCOVERS:
  //  (1) after ANY colour-chip or bot tap the sheet is scrolled down and [data-ct="setup-resume"] sits at
  //      y=-247, off the top of the sheet's own scroller. tapCt taps the rect CENTRE, so the tap lands off
  //      screen and silently hits the sheet instead - which contaminated two of B's own probes. So this block
  //      scrolls the sheet to the top and ASSERTS rect.y>0 before tapping, and F3p is that assertion.
  //  (2) an unset CT_APP in a compound shell line expands to empty and lib.js falls back to the repo's own
  //      app.js while the log tag still claims a control bundle. Not a gate problem, but it cost B nine
  //      minutes and it is why every control result in this file names the md5 the launch banner printed.
  try{
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'setupsheet-colourchip'});
    await b.open();
    const live=await liveGameThenSheet(b);
    L.say(live.plies===2,'F1p premise: a live 2-ply Pass & Play game with the sheet open (got '+live.plies+')');
    const barsBefore=await bars(b);
    L.say(/White/.test(String(barsBefore.top)+String(barsBefore.bottom))&&/Black/.test(String(barsBefore.top)+String(barsBefore.bottom)),'F1q premise: the live game\'s player bars name the two humans (top '+JSON.stringify(barsBefore.top)+', bottom '+JSON.stringify(barsBefore.bottom)+')');
    await P.tapBtn(b,/^Computer$/,700);
    await P.tapBtn(b,/^Black$/,700);
    await b.settle(SETTLE_NOMOVE);
    const pChip=await P.plies(b);
    L.say(pChip===2,'F2 THE COLOUR CHIP PLAYS NO MOVE EITHER: after Computer + the Black chip the game behind the sheet is still 2 plies (got '+pChip+'; on origin/main B measured 3, the engine having played 2.e4 for the human who owned White)');
    await P.scrollSheetTop(b);
    const rr=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-resume"]');if(!e)return null;const r=e.getBoundingClientRect();return {y:Math.round(r.y*10)/10,h:Math.round(r.height*10)/10};});
    L.say(rr!==null&&rr.y>0,'F3p the resume row is ON SCREEN before it is tapped (rect '+JSON.stringify(rr)+') - B measured y=-247 after a chip tap, where tapCt silently hits the sheet instead and the measurement that follows is worthless');
    if(rr&&rr.y>0){
      await b.tapCt('setup-resume',900); await b.settle(SETTLE_NOMOVE);
      const pRes=await P.plies(b), barsAfter=await bars(b), bd=await b.board();
      L.say(pRes===2,'F4a after Resume the game is still 2 plies (got '+pRes+'; on origin/main B measured 3 with Black chosen and 4 with White)');
      L.say(!/Computer/.test(String(barsAfter.top)+String(barsAfter.bottom)),'F4b and it is still the two-human game: neither player bar names the Computer (top '+JSON.stringify(barsAfter.top)+', bottom '+JSON.stringify(barsAfter.bottom)+')');
      L.say(!!bd&&bd.flip===live.flip,'F4c and the player has not been reassigned a colour: board flip '+(bd?bd.flip:null)+' equals the flip before the sheet was opened ('+live.flip+')');
    }else{
      L.say(false,'F4a SKIPPED - resume row off screen');L.say(false,'F4b SKIPPED');L.say(false,'F4c SKIPPED');
    }
    await b.close();
  }catch(e){L.say(false,'F-THREW the colour-chip scenario threw: '+(e&&e.message||e));}

  // ── C: POSITIVE CONTROL. The guard must not stop the engine on the legitimate path. ──────────────
  try{
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'setupsheet-start-still-works'});
    await b.open();
    await P.states['setup-black'](b);             // Computer + Black on a FRESH sheet (no live game)
    L.say(await sheetUp(b)===true,'C1p the sheet is up with Computer + Black selected, which is the state C2 starts from');
    await P.tapStart(b,1200);
    L.say(await sheetUp(b)===false,'C1 Start closed the sheet and began the game');
    let moved=0;
    try{await P.waitPlies(b,1,20000);moved=await P.plies(b);}catch(e){moved=await P.plies(b);}
    L.say(moved>=1,'C2 POSITIVE CONTROL: with Computer + Black the engine still moves first once the game has actually started (plies '+moved+')');
    await b.close();
  }catch(e){L.say(false,'C-THREW the positive control threw, so the fix is UNPROVEN on the legitimate path: '+(e&&e.message||e));}

},'69-setup-sheet-live-game');
