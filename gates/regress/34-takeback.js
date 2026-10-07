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
// Run at his real 375x730.
//
// NEGATIVE CONTROL: proved against a bundle built with the `opponent==='computer'` guard removed, which makes
// the row appear in Pass & Play. Assertion 5 goes red on it. See claude/agents/REGRESSION-LOG.md.
//
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [jobs/four-gates-force-a-three-worker-pool-and-never-
// test-the-fallback-2026-09-27, doneWhen route 2 - the same route gates 51 and 66 took]. Both launches below (lines 57 and 123) pass store:{ct_pool:'3'}, so this gate
// runs the POOLED Stockfish worker twice over and the single-worker fallback not at all.
//
// THIS FILE IS THE WORST MEMBER OF THE CLASS AND THE HEADER SHOULD SAY SO. Assertion 4 - Takeback is
// DISABLED while the engine is still searching - is a claim about the SHARED STOCKFISH WORKER, and it
// is measured only in the one pool width the launch pins. The #375/#377 rule CLAUDE.md states is that
// when a code path is chosen by the device, the gate covers every branch or it is not a gate; this
// gate's own subject is that path. On a cheap or busy phone poolWanted() returns 1 (hc 2 or 3), and
// nothing here has ever run that configuration.
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

L.run(async()=>{
  const geo='kunal730';
  const b=await L.launch({geo,name:'takeback-'+geo,store:{ct_pool:'3'}});await b.open();

  // --- move 0 vs Computer: the row exists (opponent is computer) but there is nothing to give back.
  await P.states['cpu-m0'](b);
  await openMore(b);
  const at0=await rowState(b);
  L.say(at0.present===true,'vs Computer the Takeback row is in the More sheet',at0);
  L.say(at0.disabled===true,'at move 0 Takeback is DISABLED - nothing has been played to give back',at0);
  await shutMore(b);

  // --- his move, engine still thinking: still disabled. Measured in the window BEFORE the reply lands.
  await b.move('e2','e4',0);await b.settle(120);
  await openMore(b);
  const midThinking=await thinking(b);
  const mid=await rowState(b);
  L.say(mid.present===true,'the row is still mounted while the engine thinks (it is disabled, not unmounted, so the sheet never reflows under a finger)',mid);
  if(midThinking){
    L.say(mid.disabled===true,'while the engine is SEARCHING Takeback is disabled. A takeback here would change the position under an in-flight search on the shared worker, and its bestmove would land on a dead position.',mid);
  }else{
    // Pip searches for 1100 ms and opening the sheet costs about 600, so this window is genuinely racy on a
    // fast machine. SAY SO rather than asserting on a sample that was never taken: a gate that reports a pass
    // it did not measure is the exact failure this suite exists to prevent.
    L.note('NOT SAMPLED: the engine finished before the sheet opened, so the mid-search case was not exercised on this run. The disabled path itself is proved by the move-0 and post-takeback cases.');
  }
  await shutMore(b);

  // --- the reply has landed: now it is his move and both plies are on the stack.
  await P.waitPlies(b,2);await b.settle(600);
  const before=await b.metrics();
  const pBefore=await plyCount(b);
  await openMore(b);
  const armed=await rowState(b);
  L.say(armed.present===true&&armed.disabled===false,'after the engine has replied, Takeback is ENABLED',armed);
  L.say(/Takeback/i.test(armed.label||''),'the row reads Takeback',armed.label);
  await b.tapText(/^Takeback$/,{wait:900});
  await b.settle(700);
  const after=await b.metrics();
  const pAfter=await plyCount(b);

  L.say(pBefore>=2,'there were at least two plies on the board before the takeback',{before:pBefore});
  L.say(pAfter===pBefore-2,'the takeback gave back BOTH plies - the engine\'s reply and his move - so it is his move again ('+pBefore+' -> '+pAfter+')',{before:pBefore,after:pAfter});
  L.say(!!before.board&&!!after.board&&Math.abs(before.board.w-after.board.w)<0.6&&Math.abs(before.board.top-after.board.top)<0.6,
        'the board does not move across a takeback (w '+(before.board&&before.board.w)+' -> '+(after.board&&after.board.w)+', top '+(before.board&&before.board.top)+' -> '+(after.board&&after.board.top)+')');
  // #384 (derived test-lane item 6): the board-movement assertion nearby compares two MEASURED values and
  // nothing else, so it is true of a board that has been the wrong size since before the first sample. That is
  // exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. Pinned for the same reason; measured on #383.
  L.say(!!after.board&&Math.abs(after.board.w-353)<0.6,'the vs-Computer board is 353 wide after the takeback - the measured size for his phone, not merely unchanged',{measured:after.board&&after.board.w,want:353});
  L.say(after.over.over<=0&&after.over.docScroll===0,'no scroll after a takeback',after.over);
  await b.shot('takeback-'+geo+'-after');

  // the sheet closed behind it, so the board is reachable again
  const sheetGone=await b.rect('[data-ct="more-sheet"]');
  L.say(!sheetGone,'the More sheet closes behind a takeback (it is zIndex 9990 and would cover the board)');

  // Back at move 0 by way of a takeback: the row must go disabled again. This is the DETERMINISTIC proof that
  // the enabled state tracks the position rather than being latched on when the game starts.
  await openMore(b);
  const back0=await rowState(b);
  L.say(back0.present===true&&back0.disabled===true,'after giving back the only pair of plies, Takeback is disabled again - the state tracks the position, it is not latched on at game start',{row:back0,plies:pAfter});
  await shutMore(b);

  // --- and it can be taken again, back to the start
  await P.waitPlies(b,2).catch(()=>{});
  await b.close();

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
