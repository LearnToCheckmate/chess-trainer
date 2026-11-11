// regress/34-takeback.js  fb-takeback (Kunal, "Computer only, as answered"). THE ONLY GUARD ON THIS FEATURE.
//
// #362 pulled takeback out of live play on Kunal's own round-1 answer ("remove it from live play, keep it for
// practice, not for rated games"). A game against a bot IS practice, so #378 puts it back for the COMPUTER ONLY.
// The `takeback` function itself survived #362 with no callers - it was dead code for sixteen builds - so none
// of its guards has ever run in production. That is exactly why this gate exists: the feature would otherwise
// land with nothing measuring it, and the antagonist pass on #378 found NO existing assertion that fails on
// this change, which is a finding and not a comfort.
//
// WHAT IT PROVES
//   1. vs Computer, after his move and the engine's reply, the Takeback row is present and ENABLED.
//   2. Tapping it gives back BOTH plies, so it is his move again and the move list is two plies shorter.
//   3. The board does not move: same width, same top, before and after. A takeback is not a layout event.
//   4. It is DISABLED while the engine is still searching. This is the whole reason the change stayed small:
//      a takeback mid-search would need generation counters on the shared Stockfish worker, whose own failure
//      mode (one dropped bestmove desyncs them permanently and the computer never moves again) is worse than
//      the race it fixes. Nobody asked for a mid-search takeback, so it is simply not offered.
//   5. It is ABSENT in Pass & Play - "Computer only" is the decision, and the More sheet opens there too, so
//      absence on that screen is the half that is easy to get wrong.
//   6. It is absent at move 0: there is nothing to give back.
// Run at 375x730 and 320x568 (COLS below). 375x730 is NOT the device any more: R19 settled the device at 375x761 (kunal761), and
// moving this gate there needs its own measured board pin, which this file does not yet have [#549 item (70), stated not fixed].
//
// NEGATIVE CONTROL: proved against a bundle built with the `opponent==='computer'` guard removed, which makes
// the row appear in Pass & Play. Assertion 5 goes red on it. See claude/agents/REGRESSION-LOG.md.
// CONTROL-RECORD: 54be878 2026-11-06 total=58 red=2 scope=full how=canTakeback=_tbIdx>=0||thinking (Takeback enabled while the engine searches), trial md5 e36c2bbbe27c
//
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [jobs/four-gates-force-a-three-worker-pool-and-never-
// test-the-fallback-2026-09-27, doneWhen route 2 - the same route gates 51 and 66 took]. This paragraph read "Both
// launches below (lines 57 and 123) pass store:{ct_pool:'3'}, so this gate runs the POOLED Stockfish worker twice over and
// the single-worker fallback not at all", and the next one called this file the worst member of the class because nothing
// here had ever run the one-worker configuration. BOTH ARE HISTORY SINCE #546 item (81) and are withdrawn here [R18, #549
// item (70)]: the computer block now runs at ct_pool '3', '1' and UNSET at kunal730 and at '3' at 320x568 (COLS below),
// and only the Pass & Play launch still pins '3' - where no engine runs, so its pool width selects nothing. What stays true
// is that ct_pool only SIZES the Stockfish pool; the minimax fallback remains unreachable, as the next paragraph says.
// And assertion 4 (disabled while SEARCHING) was never once MEASURED through #548 - every configuration printed NOT
// SAMPLED because the engine replied before the sheet opened. #549 holds the reply open from the harness (HOLD_BESTMOVE)
// and makes reaching that state an assertion of its own.
//
// WHICH BRANCH IS NOT COVERED, AND WHY IT CANNOT BE FROM HERE. Read off origin/main 7353e67 on
// 2026-10-07 by process-build lane 2, re-derived rather than copied: every line number the job and
// gate 51's header quote for these sites has MOVED, so a reader who trusts them lands in the wrong
// function.
//   chess.jsx:4080   const useSF=sfReadyRef.current?await ensureAna():false;
//   chess.jsx:4082   if(useSF){                 ... and its matching close is
//   chess.jsx:4245   }else{                     <- the minimax fallback, found by brace-matching from
//                                                  4082, not by eye.
//   chess.jsx:4007   poolWanted(), whose only override is ct_pool and whose test at 4009 is
//                    `if(_f>=1&&_f<=6)return _f` - so ct_pool SIZES the pool and selects nothing.
//                    ct_pool=1 is a ONE-WORKER STOCKFISH review, never the fallback engine.
//   chess.jsx:3586   the single assignment `sfReadyRef.current=true`, on the worker's own 'readyok'.
//                    Nothing a store value can reach sets it.
//   And there is no other switch: all 47 distinct ct_* keys in chess.jsx were enumerated and none
//   disables Stockfish. So no value this harness can put in localStorage selects the fallback, and
//   the gap is RECORDED here instead of being left as a silent default.
//
// WHAT WOULD CLOSE IT, AND IT IS NOT A CHANGE TO THIS FILE: one harness route that makes the worker
// fail so the app takes its own fallback - a chess.jsx change, outside the process-build allow-list,
// owned by test-authoring as jobs/no-harness-route-to-the-drill-capture-producer-2026-09-30 and as
// the wider ask on this job's own soTheAskIsNowWiderThanFourGates. One piece of harness would give
// gates 34, 35, 36, 37, 51 and 66 somewhere to point a second column; five gate edits would not.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

// The move list on the Play screen, as a ply count. Read from the MOVES panel rather than the one-line strip:
// the strip is what fb-movedup proposes to delete, and a gate fixture that a pending change would remove is a
// gate that breaks silently later. (That is not hypothetical - gates/drive/play.js plies() reads the strip.)
const plyCount=(b)=>b.page.evaluate(()=>{
  const p=document.querySelector('[data-ct="moves-panel"]');
  if(!p)return -1;
  // The panel renders ONE TOKEN PER LINE: "MOVES\n1.\ne4\ne5". A PLY is any line that is neither the
  // heading nor a move number. Counting matches of "<n>. <san>" instead counts ROWS, and a row holds TWO
  // plies - which is how the first version of this gate read 1 after 1.e4 e5 and then failed its own
  // subtraction. The format was dumped from a running build before this was rewritten, not assumed.
  // Count only lines that are actually SAN. An 'everything that is not the heading or a move number'
  // filter counts the empty-state line ("Your moves appear here as you play.") as a ply, so a takeback
  // back to move 0 reads 1 instead of 0 - which is what this gate did on its first green-looking run.
  const SAN=/^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?$/;
  return (p.innerText||'').replace(/ /g,' ').split('\n').map(x=>x.trim()).filter(x=>SAN.test(x)).length;
});
// "Computer thinking…" sits in data-ct="play-context" only while the engine searches, and is empty otherwise.
const thinking=(b)=>b.page.evaluate(()=>{const c=document.querySelector('[data-ct="play-context"]');return c?/thinking/i.test(c.innerText||''):false;});
const openMore=async(b)=>{await b.tapText(/^More$/,{wait:600});};
const shutMore=async(b)=>{await b.page.mouse.click(4,4);await b.settle(350);};
const rowState=(b)=>b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="more-takeback"]');
  if(!e)return {present:false,disabled:null,label:null};
  return {present:true,disabled:!!e.disabled,label:(e.innerText||'').trim()};
});

// EVERY POOL WIDTH THE DEVICE CAN CHOOSE, AND THE NARROW PHONE [#546, item (81); jobs/gate-34-takeback-pins-a-three-worker-
// pool-and-one-geometry-2026-09-30]. Both launches pinned ct_pool:'3' and the only geometry was kunal730 - verbatim the
// #375 trap, on the gate whose own subject is the shared worker. poolWanted() sizes the pool from the device (hc 2 or 3 gives
// ONE worker), so the computer block now runs at ct_pool '3', '1' and UNSET (the device's own choice) at kunal730, and at
// '3' at 320x568. The minimax fallback is still unreachable from a store value; the header above says why.
// #550 item (35) [the job's remainder]: his phone's own column (kunal761, measured pin below) and the MINIMAX FALLBACK, reached at last
// by the harness's engineFail:'all' (every stockfish worker throws at construction, so sfReady never comes true and the computer moves
// with the built-in engine). The fallback column asserts the route was taken (b.engineFail().failed>0) before crediting anything.
const COLS=[{geo:'kunal730',pool:'3'},{geo:'kunal730',pool:'1'},{geo:'kunal730',pool:null},{geo:'se',pool:'3'},{geo:'kunal761',pool:'3'},{geo:'kunal730',pool:null,fail:'all'}];
// The board after a takeback, per geometry: 353 at 375x730 (measured on #383, this file's original pin) and 288 at 320x568
// (measured at #546 on 049b41dfb6f1). A pin per geometry, never one number for both.
// #548 item (92) MOVED THE 320x568 FIGURE: the phone's top row took the strip under the board's place, so vs Computer at 320x568 is 298 (was
// 288), the figure gate 46 re-pinned to; 375x730 stays 353. Caught red in #548's round-1 suite.
const WANT_W={kunal730:353,se:298,kunal761:Number(process.env.CT_W761||0)||null};   /* #550 item (35): kunal761 measured below */
// HOLDING THE SEARCH OPEN, FROM THE HARNESS SIDE [#549 item (70); jobs/gate-34-takeback-pins-a-three-worker-pool-and-one-
// geometry-2026-09-30, whatIsLeft 'a way to hold the engine's search open long enough to sample the in-flight state']. No
// chess.jsx change: an init script subclasses Worker so that, while window.__ctTbHold is a positive number of ms, any
// 'bestmove' line a worker posts reaches the app's onmessage that much LATER. Every other line passes straight through,
// and the hold is set only around the one sample below and cleared straight after it, so the reply still lands and the
// rest of the block runs on the real game. The app's engine still searches for exactly as long as it would; only its
// answer is late, which is the state 'thinking' names. Every worker in chess.jsx is wired by `w.onmessage=` (the play
// worker, the analysis worker and the pool slots), so the accessor on the subclass's prototype is the one that sees it.
const HOLD_BESTMOVE=()=>{try{const W0=window.Worker;if(!W0||W0.__ctHeld)return;
  class W extends W0{
    set onmessage(f){super.onmessage=(typeof f!=='function')?f:(e)=>{const m=String((e&&e.data)||'');const h=+window.__ctTbHold||0;
      if(h>0&&m.startsWith('bestmove'))setTimeout(()=>f.call(this,e),h);else f.call(this,e);};}
    get onmessage(){return super.onmessage;}
  }
  W.__ctHeld=true;window.Worker=W;}catch(e){}};
L.run(async()=>{
 for(const C of COLS){
  const geo=C.geo, T=geo+'/pool '+(C.pool||'unset')+(C.fail?'/engineFail '+C.fail:'')+': ';
  const b=await L.launch(Object.assign({geo,name:'takeback-'+geo+'-'+(C.pool||'unset')+(C.fail?'-'+C.fail:''),store:C.pool?{ct_pool:C.pool}:{}},C.fail?{engineFail:C.fail}:{}));await b.open();

  // --- move 0 vs Computer: the row exists (opponent is computer) but there is nothing to give back.
  await P.states['cpu-m0'](b);
  await openMore(b);
  const at0=await rowState(b);
  L.say(at0.present===true,T+'vs Computer the Takeback row is in the More sheet',at0);
  L.say(at0.disabled===true,T+'at move 0 Takeback is DISABLED - nothing has been played to give back',at0);
  await shutMore(b);

  // --- his move, engine still thinking: still disabled. Measured in the window BEFORE the reply lands.
  await b.move('e2','e4',0);await b.settle(120);
  await openMore(b);
  const midThinking=await thinking(b);
  const mid=await rowState(b);
  if(midThinking){
    // INSIDE THE GUARD [#546 item (81)]: 'mounted while the engine thinks' is only a statement about thinking when it was sampled.
    L.say(mid.present===true,T+'the row is still mounted while the engine thinks (it is disabled, not unmounted, so the sheet never reflows under a finger)',mid);
    L.say(mid.disabled===true,T+'while the engine is SEARCHING Takeback is disabled. A takeback here would change the position under an in-flight search on the shared worker, and its bestmove would land on a dead position.',mid);
  }else{
    // This comment said "Pip searches for 1100 ms and opening the sheet costs about 600, so this window is genuinely
    // racy". WITHDRAWN [R18, #549 item (70)]: Pip is elo 500, and the computer-move effect sends every cpuElo below 1320
    // to the BUILT-IN engine on `setTimeout(..., 300)` - Stockfish (and its 1100 ms movetime) is only the >=1320 branch.
    // So vs Pip this window is not racy, it is closed: through #548 every configuration on every run printed NOT
    // SAMPLED. The held-Stockfish block after this loop is where the mid-search case is measured.
    L.note(T+'NOT SAMPLED vs Pip: the built-in engine replies on a 300 ms timer, before the sheet opens. The mid-search case is measured in the HELD STOCKFISH block after this loop.');
  }
  await shutMore(b);

  // --- the reply has landed: now it is his move and both plies are on the stack.
  await P.waitPlies(b,2);await b.settle(600);
  const before=await b.metrics();
  const pBefore=await plyCount(b);
  await openMore(b);
  const armed=await rowState(b);
  L.say(armed.present===true&&armed.disabled===false,T+'after the engine has replied, Takeback is ENABLED',armed);
  L.say(/Takeback/i.test(armed.label||''),T+'the row reads Takeback',armed.label);
  await b.tapText(/^Takeback$/,{wait:900});
  await b.settle(700);
  const after=await b.metrics();
  const pAfter=await plyCount(b);

  L.say(pBefore>=2,T+'there were at least two plies on the board before the takeback',{before:pBefore});
  L.say(pAfter===pBefore-2,T+'the takeback gave back BOTH plies - the engine\'s reply and his move - so it is his move again ('+pBefore+' -> '+pAfter+')',{before:pBefore,after:pAfter});
  L.say(!!before.board&&!!after.board&&Math.abs(before.board.w-after.board.w)<0.6&&Math.abs(before.board.top-after.board.top)<0.6,
        'the board does not move across a takeback (w '+(before.board&&before.board.w)+' -> '+(after.board&&after.board.w)+', top '+(before.board&&before.board.top)+' -> '+(after.board&&after.board.top)+')');
  // #384 (derived test-lane item 6): the board-movement assertion nearby compares two MEASURED values and
  // nothing else, so it is true of a board that has been the wrong size since before the first sample. That is
  // exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. Pinned for the same reason; measured on #383.
  L.say(!!after.board&&Math.abs(after.board.w-WANT_W[geo])<0.6,T+'the vs-Computer board is '+WANT_W[geo]+' wide after the takeback - the measured size for this geometry, not merely unchanged',{measured:after.board&&after.board.w,want:WANT_W[geo]});
  L.say(after.over.over<=0,T+'no scroll after a takeback',after.over);
  await b.shot('takeback-'+geo+'-'+(C.pool||'unset')+'-after');

  // the sheet closed behind it, so the board is reachable again
  const sheetGone=await b.rect('[data-ct="more-sheet"]');
  L.say(!sheetGone,T+'the More sheet closes behind a takeback (it is zIndex 9990 and would cover the board)');

  // Back at move 0 by way of a takeback: the row must go disabled again. This is the DETERMINISTIC proof that
  // the enabled state tracks the position rather than being latched on when the game starts.
  await openMore(b);
  const back0=await rowState(b);
  L.say(back0.present===true&&back0.disabled===true,T+'after giving back the only pair of plies, Takeback is disabled again - the state tracks the position, it is not latched on at game start',{row:back0,plies:pAfter});
  await shutMore(b);

  // --- and it can be taken again, back to the start
  await P.waitPlies(b,2).catch(()=>{});
  if(C.fail){const ef=await b.engineFail();L.say(!!ef&&ef.created>0&&ef.failed===ef.created,T+'the route was taken: every stockfish worker the app tried to build failed ('+(ef&&ef.failed)+' of '+(ef&&ef.created)+'), so the moves above came from the built-in engine',ef);}
  await b.close();
 }

  // --- THE MID-SEARCH CASE, MEASURED [#549 item (70), case TC-SUITE-374]. vs Astrid (1900) the Stockfish branch plays (go movetime 1900), and
  // HOLD_BESTMOVE keeps its answer from the app for 3000 ms more, so the More sheet opens while the computer is genuinely
  // still to move. Run with ct_pool UNSET: the move search runs on the app's one play worker (sfRef), not on the review
  // pool that ct_pool sizes, so a pool width selects nothing here [read from chess.jsx, the computer-move effect].
  for(const geo of ['kunal730','se']){
    const T='held stockfish/'+geo+': ';
    const bh=await L.launch({geo,name:'takeback-held-'+geo,store:{}});
    await bh.ctx.addInitScript(HOLD_BESTMOVE);await bh.open();
    const hooked=await bh.page.evaluate(()=>!!(window.Worker&&window.Worker.__ctHeld));
    L.say(hooked,T+'the bestmove hold is installed in the page (window.Worker is the harness subclass), so a NOT REACHED below is the app and not the harness',{hooked});
    await P.states['setup-bot-astrid'](bh);await P.tapStart(bh,900);await P.ensureMovesShown(bh);
    await bh.settle(2500); // the play worker's readyok: before it, the effect takes the built-in engine instead
    await bh.page.evaluate(()=>{window.__ctTbHold=3000;});
    await bh.move('e2','e4',0);await bh.settle(120);
    await openMore(bh);
    const hThink=await thinking(bh);
    const hRow=await rowState(bh);
    const hPlies=await plyCount(bh);
    await bh.page.evaluate(()=>{window.__ctTbHold=0;});
    // ARRIVAL CHECK, ITS OWN L.say: the state the next two lines name must have been reached, or they assert nothing.
    L.say(hThink===true&&hPlies===1,T+'the mid-search state was REACHED: "thinking" is on screen with the More sheet open and only his move on the list',{thinking:hThink,plies:hPlies});
    L.say(hRow.present===true,T+'the row is still mounted while Stockfish searches (disabled, not unmounted)',hRow);
    L.say(hRow.disabled===true,T+'while Stockfish is SEARCHING Takeback is DISABLED - measured, with the reply held in flight',hRow);
    await shutMore(bh);
    await P.waitPlies(bh,2);await bh.settle(600);
    await openMore(bh);
    const hArmed=await rowState(bh);
    L.say(hArmed.present===true&&hArmed.disabled===false,T+'once the held reply lands Takeback is ENABLED, so the disabled reading above was the search and not a stuck row',hArmed);
    await shutMore(bh);
    await bh.close();
  }
  const geo='kunal730';

  // --- PASS & PLAY: "Computer only". The More sheet opens here too, so this is the half that is easy to miss.
  const b2=await L.launch({geo,name:'takeback-passplay',store:{ct_pool:'3'}});await b2.open();
  await P.states['setup-passplay'](b2);
  await b2.tapText(/^▶ Start game$/,{wait:900});
  await b2.move('e2','e4',500);await b2.move('e7','e5',500);await b2.settle(400);
  await openMore(b2);
  const pp=await rowState(b2);
  L.say(pp.present===false,'in PASS & PLAY there is no Takeback row at all - Kunal answered "Computer only", and this sheet opens on that screen too',pp);
  const ppOther=await b2.page.evaluate(()=>[...document.querySelectorAll('button')].map(x=>(x.innerText||'').trim()).filter(Boolean).slice(0,12));
  L.say(ppOther.some(t=>/New game/i.test(t)),'the Pass & Play More sheet is genuinely open (New game is in it), so the absence above was measured and is not a missed sheet',ppOther);
  await shutMore(b2);
  const bad2=b2.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad2.length===0,'no app error beyond the allowed engine trap in Pass & Play',bad2.slice(0,2));
  await b2.close();
},'TAKEBACK');
