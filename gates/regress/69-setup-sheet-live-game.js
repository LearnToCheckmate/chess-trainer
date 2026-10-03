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
const hasBtn=(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);return [...document.querySelectorAll('button')].some(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1&&r.test((x.innerText||'').trim());});},[re.source,re.flags]);

// a live 3-ply Pass & Play game, left by the house, with the Play setup sheet open over it
async function liveGameThenSheet(b){
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.settle(400);
  const plies=await P.plies(b), row=await moverow(b);
  await b.tapCt('play-home',650);
  await b.tile('Play'); await b.settle(700);
  return {plies,row};
}

L.run(async()=>{
  for(const g of (ONLY?GEOS.filter(x=>x.k===ONLY):GEOS)){
   try{
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:'',label:g.k},name:'setupsheet-'+g.k});
    await b.open();
    if(g.k===KUNAL)L.note('page stamp at '+KUNAL+': '+(await b.stamp()));

    const live=await liveGameThenSheet(b);
    // A1/A2/A3 are PREMISES. Without them every "nothing moved" below is satisfied by never reaching the state.
    L.say(live.plies===3,'A1 ['+g.k+'] the live Pass & Play game is 3 plies before the house tap (got '+live.plies+', row '+JSON.stringify(live.row)+')');
    const up=await sheetUp(b);
    L.say(up===true,'A2a ['+g.k+'] the Play setup sheet is open over the live game');
    L.say(await hasBtn(b,/^Computer$/)===true,'A2b ['+g.k+'] the sheet carries a Computer opponent tile to tap');
    const pOpen=await P.plies(b);
    L.say(pOpen===3,'A3 ['+g.k+'] opening the sheet over the live game loses nothing (plies '+pOpen+')');

    // ── THE DEFECT: one tap on the opponent tile, and nothing else ────────────────────────────────
    await P.tapBtn(b,/^Computer$/,900);
    await b.settle(SETTLE_NOMOVE);
    const pTap=await P.plies(b), rTap=await moverow(b);
    L.say(pTap===3,'A4a ['+g.k+'] tapping Computer on the sheet plays NO move in the game behind it (plies '+pTap+', expected 3)');
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
      L.say(pRes===3,'A6b ['+g.k+'] after resume the game is still 3 plies - the engine did not move into it (got '+pRes+')');
      L.say(rRes===live.row,'A6c ['+g.k+'] after resume the move row is byte-identical to the game that was left (got '+JSON.stringify(rRes)+')');
      const bar=await evalBar(b);
      L.say(bar===null,'A7 ['+g.k+'] the resumed game is still Pass & Play: the vs-Computer eval bar is absent (got '+JSON.stringify(bar)+')');
    }else{
      L.say(false,'A6a ['+g.k+'] SKIPPED - no resume row to tap (A6p red)');
      L.say(false,'A6b ['+g.k+'] SKIPPED');
      L.say(false,'A6c ['+g.k+'] SKIPPED');
      L.say(false,'A7 ['+g.k+'] SKIPPED');
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
    await b.close();
  }catch(e){L.say(false,'B-THREW the adaptive-strength scenario threw: '+(e&&e.message||e));}

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
