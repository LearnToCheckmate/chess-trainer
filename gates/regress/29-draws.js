// regress/29-draws.js   A DRAWN GAME MUST END. #414.
//
// WHY THIS GATE EXISTS. `getStatus` (chess.jsx:110) knows exactly one of the four ways a game can be drawn:
// no legal moves and no check is a stalemate, and that DOES end the game. Threefold repetition and the
// fifty-move rule were detected nowhere, so a game that was drawn never finished at all. Measured on the
// shipped #413 bundle (md5 7e62220d45a8) at 375x730 in Pass & Play: twelve plies of 1.Nf3 Nf6 2.Ng1 Ng8 put
// the start position on the board for the FOURTH time with [data-ct="result-card"] null after every cycle and
// the control row still reading Hint/Flip - a live game. The #413 auditor pass measured the fifty-move half:
// 110 plies with no capture and no pawn move, result-card null at plies 100, 102 and 110.
// Raised as `auditor-413`. The ENDING is an amber product call (auto-draw, as chess.com does and as stalemate
// already does here, rather than a Claim draw button), recorded BEFORE it was built in
// `amber-414-auto-draw-on-repetition-and-fifty` and Desk default D-AUTODRAW.
//
// NUMBERED 29: the register reserves 10-29 for the build lane and 28 was the last one taken (#408).
//
// ── WHAT IT ASSERTS, AND WHY IN THIS SHAPE ────────────────────────────────────────────────────────────────────
// (A) THE TWO SAN PREDICATES, UNIT-TESTED AGAINST WHAT `toSAN` CAN ACTUALLY EMIT. The fifty-move clock is
//     derived from the SANs in `game.history`: a capture is the only thing that puts an 'x' in one, and a pawn
//     move is the only SAN that starts with a lowercase file. That is a claim about a generator, and #391's
//     rule is that when an assertion parses something a generator wrote you enumerate what it can legally
//     produce and unit-test the predicate against that list INCLUDING the cases it must reject. Eight strings
//     took a minute at #391 and would have caught a live defect on the day. `toSAN` (chess.jsx:90-97) can emit:
//     a pawn push "e4", a pawn capture "exd5", a promotion "e8=Q", a capturing promotion "exd8=Q", a piece move
//     "Nf3", a piece capture "Nxe5", a disambiguated piece move "Nbd2" and "R1e2" and "Qh4e1", castling "O-O"
//     and "O-O-O", and any of those with a "+" or "#" suffix. The list below is that enumeration.
// (B) REPETITION, DRIVEN THROUGH THE UI. #375's rule says a gate covers every branch the DEVICE or the
//     SETTINGS can choose, so the first version of this gate asserted the true positive in Pass & Play AND in
//     vs Computer - and the vs-Computer half went 3 RED against the fixed bundle. THE APP WAS RIGHT AND THE
//     ASSERTION WAS UNBUILDABLE: in vs Computer the ENGINE chooses Black's replies, so a scripted shuttle
//     cannot put the same position on the board three times - my Black moves are never played and the game
//     wanders off into whatever the engine likes. You cannot drive that configuration to a true positive from
//     outside without an engine that agrees to repeat.
//     So the two configurations assert what each can actually prove, and the split is stated rather than
//     hidden: Pass & Play carries the TRUE POSITIVE (the third occurrence ends the game), and vs Computer
//     carries the NO-FALSE-POSITIVE (eight plies of real play, with the engine replying, must NOT produce a
//     draw) - which is worth having on its own, because a repetition check that misfires on ordinary play
//     would end games that are still going. What is NOT measured here, and is a code fact rather than a
//     measurement: the check is a single `useMemo` with no branch on `opponent` beyond excluding online, so
//     there is one path and not two. That argument is weaker than a measurement and is labelled as such.
// (C) THE BOUNDARY, asserted from the game's own side: the draw must NOT fire at the SECOND occurrence. That
//     is the assertion that fails if somebody writes `>=2`, and without it "a draw appeared" is satisfied by a
//     rule that ends every game the moment a position comes round once.
// (D) A QUIET RUN WELL SHORT OF 100 PLIES MUST NOT END THE GAME. Cheap, and it fails if the fifty-move
//     threshold is set an order of magnitude low.
//
// WHAT THIS GATE DOES NOT COVER, said out loud because absence is the hardest thing to measure:
//   * THE 100-PLY FIFTY-MOVE PATH IS NOT DRIVEN. Reaching it needs a hundred consecutive quiet plies in which
//     no position occurs three times - otherwise repetition fires first and the fifty-move branch is never
//     tested - and a knight's moves alternate square colour, so every knight cycle is EVEN and the obvious
//     shuttles all repeat inside twenty plies. Building a pair of cycles whose combined period exceeds 51
//     moves is possible and is not free, so what stands here is (A) the predicate that decides the clock and
//     (D) the low-side boundary, plus the auditor's own 110-ply measurement as evidence the state is
//     reachable. The 100-ply integration is named in the flag as the next thing to add, NOT claimed here.
//   * ONLINE. An online game's result is the server's to declare (`og.result`, pushed with `endBy`), so the
//     client-side check deliberately excludes `opponent==='online'` and this gate asserts nothing there.
//   * Insufficient material and dead positions: not implemented in the app, not asserted here, still open.
//   * The fifty-move rule's interaction with a pawn move or capture resetting the clock mid-run: covered by
//     (A) at the predicate level only.
//
// ── NEGATIVE CONTROL. Recorded from the run, not estimated. ───────────────────────────────────────────────────
//   NC-A  THE SHIPPED #413 RELEASE ITSELF, which needs no trial bundle and is the strongest form available:
//         `git cat-file -p 2b75508:app.js`, md5 7e62220d45a8b8f3e17bab950fa50c76, stamp
//         '#413 - 2026-09-17 15:09 ET'. It has no draw detection at all, so every repetition assertion must
//         go red on it while the predicate unit tests - which are pure strings and bundle-independent - stay
//         green. That split is the control's whole value: it shows the integration assertions are measuring
//         the app and the unit tests are measuring the predicate.
//         -> 9 pass, 3 FAIL, and the three reds are EXACTLY the repetition true-positive rows in Pass & Play:
//            the third occurrence does not end the game, the card does not name the rule, and the control row
//            never switches - card null, over false, live true after eight plies. On the #414 bundle the same
//            gate reads 12 pass / 0 fail with the card reading "Draw / Threefold repetition".
//         -> AND WHAT STAYED GREEN IS THE PART THAT MATTERS FOR READING THIS CONTROL. The three predicate unit
//            tests pass on both bundles, because they are pure strings and do not touch the app at all - which
//            is how you can tell the three reds are about the application and not about the predicate.
//         -> HONEST LIMIT OF THIS CONTROL, because a control that cannot fail is the thing this project keeps
//            catching: assertions (C), (B2) and (D) are all of the form "the game is NOT drawn", so a bundle
//            with no draw detection whatsoever satisfies them trivially. They are SILENT on this control and
//            their value is entirely on the fixed bundle, where they are the difference between a rule that
//            works and a rule that ends every game it touches. The true positive is what this control proves.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

// (A) the enumeration. [san, isCapture, isPawnMove] - what toSAN can emit, including what must be REJECTED.
const SANS=[
  ['e4',        false, true ],   // a pawn push
  ['exd5',      true,  true ],   // a pawn capture - both true, and the reason the two predicates are separate
  ['e8=Q',      false, true ],   // a promotion
  ['exd8=Q',    true,  true ],   // a capturing promotion
  ['Nf3',       false, false],   // a piece move
  ['Nxe5',      true,  false],   // a piece capture
  ['Nbd2',      false, false],   // disambiguated by file - MUST NOT read as a pawn move
  ['R1e2',      false, false],   // disambiguated by rank
  ['Qh4e1',     false, false],   // disambiguated by both
  ['O-O',       false, false],   // castling - neither a capture nor a pawn move
  ['O-O-O',     false, false],
  ['Nf3+',      false, false],   // with a check suffix
  ['exd5+',     true,  true ],
  ['Qxf7#',     true,  false],   // with a mate suffix
  ['a3',        false, true ],   // the a-file pawn: the boundary of /^[a-h]/
  ['h6',        false, true ],
  ['Ka2',       false, false],   // a king move: an uppercase letter that happens to precede a file
  ['Bb5',       false, false]
];
const IS_CAP=(s)=>/x/.test(s);
const IS_PAWN=(s)=>/^[a-h]/.test(s);

const S=function(){
  const rc=document.querySelector('[data-ct="result-card"]');
  const btns=[...document.querySelectorAll('button')].map(b=>(b.textContent||'').trim());
  return {card: rc?(rc.textContent||'').trim():null,
    over: btns.some(t=>t==='Rematch'), live: btns.some(t=>t==='Hint')};
};
const SHUTTLE=[['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']];

L.run(async()=>{
  // ── (A) the predicates, before anything is driven. Pure strings, so bundle-independent BY DESIGN: they stay
  // green on the control, which is what tells you the red rows below are about the app and not about these.
  let capOk=0, pawnOk=0;
  const capBad=[], pawnBad=[];
  for(const [san,cap,pawn] of SANS){
    if(IS_CAP(san)===cap)capOk++; else capBad.push({san,want:cap,got:IS_CAP(san)});
    if(IS_PAWN(san)===pawn)pawnOk++; else pawnBad.push({san,want:pawn,got:IS_PAWN(san)});
  }
  L.say(capBad.length===0,'(A) "a capture is the only thing that puts an x in a SAN" holds for all '+SANS.length+' strings toSAN can emit, including the ones it must reject - castling, disambiguated piece moves and a king move that precedes a file letter',{checked:SANS.length,ok:capOk,bad:capBad});
  L.say(pawnBad.length===0,'(A) "a pawn move is the only SAN that starts with a lowercase file" holds for all '+SANS.length+' strings, so "Nbd2" and "R1e2" do not reset the fifty-move clock and "exd8=Q" does',{checked:SANS.length,ok:pawnOk,bad:pawnBad});
  L.say(SANS.filter(r=>r[1]).length>=5&&SANS.filter(r=>!r[1]).length>=5&&SANS.filter(r=>r[2]).length>=5&&SANS.filter(r=>!r[2]).length>=5,
    '(A) the enumeration itself is balanced - at least five strings on each side of both predicates, so neither is tested only on what it should accept (#388)',
    {captures:SANS.filter(r=>r[1]).length,notCaptures:SANS.filter(r=>!r[1]).length,pawns:SANS.filter(r=>r[2]).length,notPawns:SANS.filter(r=>!r[2]).length});

  // ── (B) and (C): repetition through the UI, in both local configurations.
  for(const [label,state] of [['pass-and-play','pp-m0']]){
    const b=await L.launch({geo:'kunal730',name:'draws-'+label});
    await b.open();
    let reached=true;
    try{ await P.states[state](b); }catch(e){ reached=false; L.say(false,label+': the state could not be reached at all - every draw assertion in this block is UNRUN, not green',String(e).slice(0,140)); }
    if(!reached){ await b.close(); continue; }
    const s0=await b.page.evaluate(S);
    L.say(s0.live&&!s0.over,label+': the game is actually live before anything is driven, so a "no draw yet" result below is a measurement rather than a screen that was never playing',s0);

    // cycle 1: four plies returns the start position for the SECOND time. A draw here would be wrong.
    for(const [f,t] of SHUTTLE) await b.move(f,t,label==='vs-computer'?900:700);
    await b.settle(500);
    const s1=await b.page.evaluate(S);
    L.say(!s1.over,'(C) '+label+': the SECOND occurrence of a position does NOT end the game - this is the assertion that fails if the rule is written >=2, and without it "a draw appeared" would be satisfied by a rule that ends every game the first time a position comes round',s1);

    // cycle 2: four more plies is the THIRD occurrence. The game must be drawn now.
    for(const [f,t] of SHUTTLE) await b.move(f,t,label==='vs-computer'?900:700);
    await b.settle(700);
    const s2=await b.page.evaluate(S);
    L.say(/Draw/i.test(s2.card||''),'(B) '+label+': the THIRD occurrence of the same position ends the game as a draw, and the result card says so',s2);
    L.say(/repetition/i.test(s2.card||''),'(B) '+label+': the card names the RULE rather than only saying "Draw" - a player whose game has just ended needs to know why',s2);
    L.say(s2.over&&!s2.live,'(B) '+label+': the control row switched to the game-over row (Rematch present, Hint gone), so the game really is over and not merely wearing a card',s2);
    await b.close();
  }

  // (B2) vs COMPUTER: the no-false-positive half. The engine picks Black's moves, so the same scripted shuttle
  // does NOT repeat a position - and the game must therefore stay live. This is the assertion that fails if the
  // repetition key is too coarse (a key that ignored whose turn it is, or castling rights, would collide on
  // ordinary play and end a live game), which is a failure mode the Pass & Play true positive cannot see.
  {
    const b=await L.launch({geo:'kunal730',name:'draws-vs-computer'});
    await b.open();
    let reached=true;
    try{ await P.states['cpu-m0'](b); }catch(e){ reached=false; L.say(false,'vs-computer: the state could not be reached at all - the no-false-positive assertion is UNRUN, not green',String(e).slice(0,140)); }
    if(reached){
      const s0=await b.page.evaluate(S);
      L.say(s0.live&&!s0.over,'vs-computer: the game is live before anything is driven',s0);
      for(const [f,t] of SHUTTLE) await b.move(f,t,900);
      for(const [f,t] of SHUTTLE) await b.move(f,t,900);
      await b.settle(700);
      const s2=await b.page.evaluate(S);
      L.say(!/Draw/i.test(s2.card||''),'(B2) vs-computer: eight plies of ORDINARY PLAY against the engine do NOT produce a draw. The engine chooses Black, so no position repeats, and this is what fails if the repetition key is too coarse - one that ignored the side to move or castling rights would collide on normal play and end a game that is still going',s2);
      L.say(s2.live&&!s2.over,'(B2) vs-computer: and the game is still live after those eight plies, so the check has not quietly ended it some other way',s2);
    }
    await b.close();
  }

  // ── (D) the low-side boundary of the fifty-move clock.
  const c=await L.launch({geo:'kunal730',name:'draws-quiet'});
  await c.open();
  await P.states['pp-m0'](c);
  // sixteen quiet plies that do NOT repeat a position three times: two knights out and back on different
  // squares each time. Distinct positions, no capture, no pawn move.
  const QUIET=[['g1','f3'],['g8','f6'],['b1','c3'],['b8','c6'],['f3','g5'],['f6','g4'],['c3','b5'],['c6','b4'],
               ['g5','h3'],['g4','h6'],['b5','a3'],['b4','a6'],['h3','g1'],['h6','g8'],['a3','b1'],['a6','b8']];
  let played=0;
  for(const [f,t] of QUIET){ await c.move(f,t,260); played++; const st=await c.page.evaluate(S); if(st.over)break; }
  const sq=await c.page.evaluate(S);
  L.say(played===QUIET.length&&!sq.over,'(D) '+QUIET.length+' consecutive QUIET plies (no capture, no pawn move, no position three times) do NOT end the game - this fails if the fifty-move threshold is set an order of magnitude low, and it is the only thing in this gate that touches the clock through the UI',{played,state:sq});
  await c.close();
},'29-draws');
