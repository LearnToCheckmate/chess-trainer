// regress/29-draws.js   A DRAWN GAME MUST END. #414.
// CONTROL-RECORD: a0ebc70 2026-11-03 total=35 red=4 scope=trial:e950c3422e02 how=#547 item (106)'s pre-fix bundle without the insufficient-material draw: (G) and TC-PL-041 (F) red (run nc106) [#547 close-out, ratchet]
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
// (D) THE FIFTY-MOVE RULE, DRIVEN TO PLY 100 with a generated 106-ply knight sequence whose 107 positions are
//     all distinct, so repetition cannot fire first. Checkpoints at plies 20/40/60/80 must NOT be drawn, ply
//     100 must be, and the card must say "Fifty-move rule" rather than "Threefold repetition" - that string
//     is the only thing that proves which branch ended the game.
// (E) THE EN-PASSANT KEY DEVIATION, pinned at its measured plies: this app's key is finer than FIDE's, so a
//     draw that the rule would give at ply 11 arrives at ply 15. Safe direction, pinned so a change is loud.
//
// WHAT THIS GATE DOES NOT COVER, said out loud because absence is the hardest thing to measure:
//   * ONLINE, AND NOT FOR THE REASON THIS HEADER FIRST GAVE. It said an online game's result is the server's
//     to declare. There is no server game logic at all: `functions/index.js` is 88 lines exporting only
//     `feedbackRelay`, and the CLIENT declares online results (chess.jsx:3540-41 pushes endBy='mate' and
//     endBy='stalemate' with result='1/2-1/2'). So online is NOT DONE rather than not ours, it needs the same
//     check derived from `og.moves`, and it is filed as `draws-online-not-covered-2026-09-17`. This gate
//     asserts nothing there and no longer pretends that is somebody else's boundary.
//   * Insufficient material and dead positions: (G) since #547 and (H)-(J) since #549 item (92) - the dead-position predicate,
//     both rules driven through the UI from a [FEN] set-up position, and the online insufficient-material draw against a CTCloud
//     store. Online REPETITION and the FIFTY-MOVE rule are still not declared online (draws-online-not-covered-2026-09-17).
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
const R=require('../drive/review');

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

  // ── (G) INSUFFICIENT MATERIAL [#547 item (106); jobs/draws-insufficient-material-and-dead-positions]. The predicate is read out of
  // chess.jsx (one line, by name) and run over the job's property set PLUS the cases it must REJECT, so a predicate that answers
  // 'draw' to everything cannot pass. Unit layer: this proves the rule, not the wiring - the wiring is the drawBy memo's one line.
  {const src=require('fs').readFileSync(process.env.CT_SRC||require('path').join(__dirname,'..','..','chess.jsx'),'utf8');
   const m=/^function insufficientMaterial\(board\)\{.*\}$/m.exec(src);const fromF=/^function fromFEN\(fen\)\{.*\}$/m.exec(src);
   L.say(!!m&&!!fromF,'(G) the insufficient-material predicate and fromFEN are both found in chess.jsx',{found:!!m,fromFEN:!!fromF});
   if(m&&fromF){const fns=Function(fromF[0]+'\n'+m[0]+'\nreturn {fromFEN,insufficientMaterial};')();
     const CASES=[['K v K','8/8/4k3/8/8/4K3/8/8 w - - 0 1',true],['KB v K','8/8/4k3/8/8/4K3/2B5/8 w - - 0 1',true],['KN v K','8/8/4k3/8/8/4K3/8/1n6 b - - 0 1',true],
       ['KB v KB same colour (d6 and c1)','8/8/3bk3/8/8/4K3/8/2B5 w - - 0 1',true],['KB v KB opposite colour (c6 and c1)','8/8/2b1k3/8/8/4K3/8/2B5 w - - 0 1',false],
       ['KNN v K (can mate only with help: NOT called)','8/8/4k3/8/8/4K3/8/1NN5 w - - 0 1',false],['KBN v K','8/8/4k3/8/8/4K3/8/1NB5 w - - 0 1',false],
       ['K+P v K','8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',false],['KR v K','8/8/4k3/8/8/4K3/8/R7 w - - 0 1',false],['KQ v K','8/8/4k3/8/8/4K3/8/Q7 w - - 0 1',false]];
     const bad=CASES.filter(([n,f,want])=>fns.insufficientMaterial(fns.fromFEN(f).board)!==want).map(c=>c[0]);
     L.say(CASES.filter(c=>c[2]).length>=4&&CASES.filter(c=>!c[2]).length>=5,'(G) the case set is balanced - '+CASES.filter(c=>c[2]).length+' draws and '+CASES.filter(c=>!c[2]).length+' it must reject',{});
     L.say(bad.length===0,'(G) insufficient material is called for K v K, K + one minor v K and same-coloured bishops, and NOT for opposite bishops, two knights, B+N, a pawn, a rook or a queen',{bad});}}
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
      // ANY DRAW THE APP CAN PRINT, NOT ONLY ONE THAT SAYS "Draw" [#545, item (49)]. chess.jsx's result strings
      // include 'Stalemate', 'Threefold repetition' and '½–½' with no "Draw" in them; DRAW29 is checked both ways
      // against those and against loss and win cards just below, so a narrower pattern cannot come back silently.
      const DRAW29=/Draw|Stalemate|repetition|fifty|½/i;
      const drawForms29=['Draw agreed','Stalemate','Stalemate — draw','Threefold repetition','Draw / Fifty-move rule','½–½'];
      const notDraw29=['Checkmate · You win','Resigned · You lose','Time · White wins','1–0','0–1'];
      L.say(drawForms29.every(t=>DRAW29.test(t))&&!notDraw29.some(t=>DRAW29.test(t)),'TC-SUITE-265 (B2) the no-draw pattern catches every draw form the app prints and no win or loss card (checked both ways)',{missed:drawForms29.filter(t=>!DRAW29.test(t)),wronglyCaught:notDraw29.filter(t=>DRAW29.test(t))});
      L.say(!DRAW29.test(s2.card||''),'(B2) vs-computer: eight plies of ORDINARY PLAY against the engine do NOT produce a draw. The engine chooses Black, so no position repeats, and this is what fails if the repetition key is too coarse - one that ignored the side to move or castling rights would collide on normal play and end a game that is still going',s2);
      L.say(s2.live&&!s2.over,'(B2) vs-computer: and the game is still live after those eight plies, so the check has not quietly ended it some other way',s2);
    }
    await b.close();
  }

  // ── (D) THE FIFTY-MOVE RULE, DRIVEN ALL THE WAY TO PLY 100. #414's antagonist pass built this and the
  // gate adopts it, because the first version of this file SAID THE 100-PLY PATH WAS NOT DRIVEN and left the
  // whole rule resting on a predicate unit test. The problem was real: a hundred quiet plies in which no
  // position occurs three times cannot be produced by any simple shuttle, since a knight's moves alternate
  // square colour so every knight cycle is EVEN and the obvious ones repeat inside twenty plies. The sequence
  // below is generated (knight moves only, both sides, no capture, no pawn move, no king or rook move so
  // castling rights never change and ep is always null) and every one of its 107 positions is DISTINCT - so
  // repetition cannot fire first and what ends the game can only be the clock.
  // THE DISCRIMINATOR IS THE CARD'S OWN TEXT: it must say "Fifty-move rule" and not "Threefold repetition".
  // That one string is what proves this drove the branch it claims to drive.
const QUIET106=[
  ['b1','c3'],['b8','c6'],['c3','d5'],['c6','e5'],['d5','f4'],['e5','g6'],['f4','h5'],['g6','h4'],
  ['h5','g3'],['h4','f5'],['g3','h5'],['f5','h6'],['h5','g3'],['h6','g4'],['g3','h5'],['g4','e3'],
  ['h5','g3'],['e3','c4'],['g3','h5'],['c4','d6'],['h5','g3'],['d6','e4'],['g3','h5'],['e4','f6'],
  ['h5','g3'],['f6','h5'],['g3','e4'],['h5','g3'],['e4','g5'],['g3','h5'],['g5','h3'],['h5','g3'],
  ['h3','f4'],['g3','h5'],['f4','g6'],['h5','g3'],['g6','h4'],['g3','h5'],['h4','f3'],['h5','g3'],
  ['f3','d4'],['g3','h5'],['d4','e6'],['h5','g3'],['e6','c5'],['g3','h5'],['c5','d3'],['h5','g3'],
  ['d3','e5'],['g3','h5'],['e5','g4'],['h5','g3'],['g4','h6'],['g3','h5'],['h6','f5'],['h5','g3'],
  ['f5','e3'],['g3','h5'],['e3','c4'],['h5','g3'],['c4','a3'],['g3','h5'],['a3','b5'],['h5','g3'],
  ['b5','c3'],['g3','h5'],['c3','d5'],['h5','g3'],['d5','b4'],['g3','h5'],['b4','c6'],['h5','g3'],
  ['c6','a5'],['g3','h5'],['a5','b3'],['h5','g3'],['g1','h3'],['g3','h5'],['b3','c5'],['h5','g3'],
  ['c5','e6'],['g3','h5'],['e6','g5'],['h5','g3'],['g5','f3'],['g3','h5'],['f3','h4'],['h5','g3'],
  ['h4','f5'],['g3','h5'],['f5','h6'],['h5','g3'],['h6','g4'],['g3','h5'],['g4','e3'],['h5','g3'],
  ['e3','c4'],['g3','h5'],['c4','e5'],['h5','g3'],['e5','g6'],['g3','h5'],['g6','f4'],['h5','g3'],
  ['f4','h5'],['g3','e4']
];
  {
    const c=await L.launch({geo:'kunal730',name:'draws-fifty'});
    await c.open();
    await P.states['pp-m0'](c);
    const marks={};
    let fired=null;
    for(let i=0;i<QUIET106.length;i++){
      const [f,t]=QUIET106[i];
      await c.move(f,t,150);
      const ply=i+1;
      if(ply===20||ply===40||ply===60||ply===80) marks[ply]=await c.page.evaluate(S);
      if(ply>=96&&ply<=106){ const st=await c.page.evaluate(S); if(st.over&&!fired){fired={ply,st};} }
    }
    for(const ply of [20,40,60,80]){
      L.say(marks[ply]&&!marks[ply].over,'(D) the fifty-move clock has NOT ended the game at ply '+ply+' - four checkpoints on the way up, so a threshold set an order of magnitude low fails here rather than passing quietly',{ply,state:marks[ply]});
    }
    L.say(!!fired&&fired.ply===100,'(D) THE GAME IS DRAWN AT PLY 100 EXACTLY - a hundred plies with no capture and no pawn move. Not 99 and not 101, which is what pins the threshold rather than the direction',fired||{fired:null,drivenPlies:QUIET106.length});
    L.say(!!fired&&/fifty/i.test(fired.st.card||''),'(D) and the card says "Fifty-move rule", NOT "Threefold repetition" - which is the only thing that proves this drove the clock branch and not the repetition branch, since all 107 positions in the sequence are distinct',fired||{});
    L.say(!!fired&&fired.st.over&&!fired.st.live,'(D) the control row switched to the game-over row, so the fifty-move draw really ends the game',fired||{});
    await c.close();
  }

  // ── (E) THE EN-PASSANT KEY DEVIATION, PINNED WITH ITS MEASURED PLIES RATHER THAN HIDDEN.
  // `makeMove` records an ep square after EVERY double pawn push; FIDE counts it only when the capture is
  // actually available. So this app's repetition key is FINER than the rule's, and a position with a dangling
  // ep square does not match the same position without one. After 1.Nf3 Nf6 2.e4 (ep=e3) and two knight round
  // trips the FIDE position is on the board three times at PLY 11, and this app draws at PLY 15 - two full
  // moves late. THE ERROR IS ENTIRELY IN THE SAFE DIRECTION: a finer key can only delay a draw, never invent
  // one, which is why this is pinned and not urgent. Pinned exactly as 35-width-containment pins its own
  // 38.9px: if the key is ever made FIDE-exact this goes red and the pin comes out; if the deviation grows,
  // it goes red too. Measured by the antagonist pass at #414.
  {
    const EP=[['g1','f3'],['g8','f6'],['e2','e4'],
              ['f6','g4'],['f3','e5'],['g4','f6'],['e5','f3'],
              ['f6','h5'],['f3','d4'],['h5','f6'],['d4','f3'],
              ['f6','d5'],['f3','h4'],['d5','f6'],['h4','f3']];
    const d=await L.launch({geo:'kunal730',name:'draws-ep'});
    await d.open();
    await P.states['pp-m0'](d);
    let at=null;
    for(let i=0;i<EP.length;i++){ const [f,t]=EP[i]; await d.move(f,t,200); const st=await d.page.evaluate(S); if(st.over&&!at){at={ply:i+1,card:st.card};break;} }
    L.say(!!at&&at.ply===15,'(E) the pinned en-passant deviation is exactly where it was left: the draw fires at ply 15, where a FIDE-exact key would fire at ply 11, because a dangling ep square makes two otherwise-identical positions differ. RED here means the key CHANGED - made exact, and this pin comes out, or made coarser, which would be a false-positive risk',at||{fired:null});
    L.say(!!at&&/repetition/i.test(at.card||''),'(E) and when it does fire it is the REPETITION branch, so this pins the key rather than some other ending',at||{});
    await d.close();
  }
  // ── (F) DRAW BY AGREEMENT [#547 item (189); jobs/no-draw-offer-control-exists-anywhere-in-local-play-2026-09-30].
  // Pass & Play only: both players hold the phone, so arming the item and tapping again is the agreement. The FIRST
  // tap must not end the game (the same two-tap guard Resign carries), the second must, and the card must name it.
  // vs Computer carries NO such item - a draw offer to the bot needs an accept rule, which is a product choice not
  // built here - and that half is asserted too, so the item cannot leak into a game the bot cannot answer.
  {
    const b=await L.launch({geo:'kunal730',name:'draws-agreed'});
    await b.open();
    let reached=true;
    try{ await P.states['pp-m0'](b); }catch(e){ reached=false; L.say(false,'TC-PL-041 (F) pass-and-play: the state could not be reached - the agreement assertions are UNRUN, not green',String(e).slice(0,140)); }
    if(reached){
      await b.move('e2','e4',700);await b.move('e7','e5',700);
      const s0=await b.page.evaluate(S);
      L.say(s0.live&&!s0.over,'TC-PL-041 (F) pass-and-play: the game is live after 1.e4 e5, before the sheet is opened',s0);
      await b.tapText(/^More$/,{wait:600}).catch(()=>{});
      const item=await b.rect('[data-ct="more-draw"]');
      L.say(!!item&&/Agree a draw/.test(item.text||''),'TC-PL-041 (F) pass-and-play: the More sheet offers "Agree a draw"',item);
      if(item){
        await b.tapCt('more-draw',500).catch(()=>{});
        const s1=await b.page.evaluate(S);const armed=await b.rect('[data-ct="more-draw"]');
        L.say(s1.live&&!s1.over&&!!armed&&/Tap again/.test(armed.text||''),'TC-PL-041 (F) the FIRST tap only arms it ("Tap again to agree a draw") - the game is still live',{s1,armed:armed&&armed.text});
        // [#547 antagonist A] closing the sheet must DISARM: close by the backdrop, reopen within the 4s arm, tap once - still live
        await b.page.mouse.click(Math.round(b.geo.w/2),20);await b.settle(300);
        await b.tapText(/^More$/,{wait:500}).catch(()=>{});
        const re=await b.rect('[data-ct="more-draw"]');
        L.say(!!re&&/^Agree a draw/.test((re.text||'').trim()),'TC-PL-041 (F) closing the sheet by its backdrop DISARMS the draw - reopened at once it reads "Agree a draw" again, not "Tap again"',{text:re&&re.text});
        await b.tapCt('more-draw',500).catch(()=>{});const s1b=await b.page.evaluate(S);
        L.say(s1b.live&&!s1b.over,'TC-PL-041 (F) and one tap after reopening only arms it again - the game is still live',s1b);
        await b.tapCt('more-draw',800).catch(()=>{});await b.settle(500);
        const s2=await b.page.evaluate(S);
        L.say(s2.over&&!s2.live,'TC-PL-041 (F) the SECOND tap ends the game - the control row is the game-over row',s2);
        L.say(/Draw/.test(s2.card||'')&&/agreed/i.test(s2.card||''),'TC-PL-041 (F) and the result card says Draw and names the agreement',s2);
      }
    }
    L.say(b.errs.length===0,'TC-PL-041 (F) zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  {
    const b=await L.launch({geo:'kunal730',name:'draws-agreed-cpu'});
    await b.open();
    let reached=true;
    try{ await P.states['cpu-m0'](b); }catch(e){ reached=false; L.say(false,'TC-PL-041 (F) vs-computer: the state could not be reached',String(e).slice(0,140)); }
    if(reached){
      await b.tapText(/^More$/,{wait:600}).catch(()=>{});
      const sheet=await b.rect('[data-ct="more-sheet"]');const item=await b.rect('[data-ct="more-draw"]');
      L.say(!!sheet,'TC-PL-041 (F) vs-computer PRECONDITION: the More sheet is open',sheet&&{h:sheet.h});
      L.say(!!sheet&&!item,'TC-PL-041 (F) vs-computer: the sheet carries NO "Agree a draw" - the bot has no rule to accept one',{item});
    }
    await b.close();
  }
  // ── (H) DEAD POSITIONS, THE PREDICATE [#549 item (92); jobs/draws-insufficient-material-and-dead-positions]. Read out of chess.jsx by
  // name, as (G) reads insufficientMaterial, and run over two dead positions (the locked chain the job names, and two interlocked walls)
  // and the cases it must REJECT: the same chain one pawn move before it locks, facing walls where a capture is on, the dead chain plus a
  // bishop, lone blocked e-pawns a king can walk round to, bare kings (that is (G)'s rule, not this one), and the dead chain with an
  // en-passant square still set. Soundness beyond these cases was fuzzed when it was written (4000 K+P positions, 263 called dead,
  // 20 random 200-ply walks from each: no legal capture, pawn move or check ever appeared) - that run is in the commit, not here.
  const DEAD_CASES=[['D1 the locked chain (after 1.d4)','4k3/8/2p1p1p1/1pPpPpPp/pP1P1P1P/P7/8/4K3 b - - 0 1',true],
    ['D2 two interlocked walls','4k3/8/1p1p1p1p/pPpPpPpP/P1P1P1P1/8/8/4K3 w - - 0 1',true],
    ['R1 the chain one move before it locks (d3 still free)','4k3/8/2p1p1p1/1pPpPpPp/pP3P1P/P2P4/8/4K3 w - - 0 1',false],
    ['R2 facing walls with captures on','4k3/8/8/pppppppp/PPPPPPPP/8/8/4K3 w - - 0 1',false],
    ['R3 the dead chain plus a bishop','4k3/8/2p1p1p1/1pPpPpPp/pP1P1P1P/P7/8/2B1K3 b - - 0 1',false],
    ['R4 lone blocked e-pawns','8/8/4k3/4p3/4P3/4K3/8/8 w - - 0 1',false],
    ['R5 bare kings','8/8/4k3/8/8/4K3/8/8 w - - 0 1',false],
    ['R6 the dead chain with an en-passant square set','4k3/8/2p1p1p1/1pPpPpPp/pP1P1P1P/P7/8/4K3 b - d3 0 1',false]];
  {const src=require('fs').readFileSync(process.env.CT_SRC||require('path').join(__dirname,'..','..','chess.jsx'),'utf8');
   const m=/^function deadPosition\(game\)\{.*\}$/m.exec(src);const fromF=/^function fromFEN\(fen\)\{.*\}$/m.exec(src);const im=/^function insufficientMaterial\(board\)\{.*\}$/m.exec(src);
   L.say(!!m&&!!fromF&&!!im,'TC-PL-065 (H) the dead-position predicate, fromFEN and insufficientMaterial are all found in chess.jsx',{dead:!!m,fromFEN:!!fromF,insufficient:!!im});
   if(m&&fromF&&im){const fns=Function("const FILES='abcdefgh';\n"+fromF[0]+'\n'+im[0]+'\n'+m[0]+'\nreturn {fromFEN,insufficientMaterial,deadPosition};')();
     const bad=DEAD_CASES.filter(([n,f,want])=>fns.deadPosition(fns.fromFEN(f))!==want).map(c=>c[0]);
     L.say(DEAD_CASES.filter(c=>c[2]).length>=2&&DEAD_CASES.filter(c=>!c[2]).length>=5,'TC-PL-065 (H) the case set is balanced - '+DEAD_CASES.filter(c=>c[2]).length+' dead positions and '+DEAD_CASES.filter(c=>!c[2]).length+' it must reject',{});
     L.say(bad.length===0,'TC-PL-065 (H) a dead position is called for the locked chain and the interlocked walls, and NOT for a chain that can still move, a capture that is on, a bishop on the board, pawns a king can walk to, bare kings or a live en-passant square',{bad});
     L.say(DEAD_CASES.filter(c=>c[2]).every(([n,f])=>!fns.insufficientMaterial(fns.fromFEN(f).board)),'TC-PL-065 (H) and neither dead position is insufficient material, so the draw they end in can only come from the dead-position rule',{});}}

  // ── (I) BOTH RULES THROUGH THE UI, in Pass & Play, entered the way a player enters a set-up position: a PGN with [SetUp "1"] [FEN]
  // and one legal move, Analyze, ply 0, ⋯ > Play from here > Pass & Play > ▶ Play this position, then play that move on the board.
  // Until #549 (66) the review ignored [FEN], so this route did not exist and (G) was a unit test only. PRESENCE FIRST (#385): the game
  // is live on the set-up position before the move, so the draw after it is the move's doing.
  const pgnOf=(fen,mv)=>'[Event "T"]\n[White "A"]\n[Black "B"]\n[Result "*"]\n[SetUp "1"]\n[FEN "'+fen+'"]\n\n1. '+mv+' *';
  for(const [tag,fen,mv,fr,to,rule] of [['material','4k3/8/8/8/4p3/4K3/8/1N6 w - - 0 1','Kxe4','e3','e4',/Insufficient material/],
                                     ['dead','4k3/8/2p1p1p1/1pPpPpPp/pP3P1P/P2P4/8/4K3 w - - 0 1','d4','d3','d4',/Dead position/]]){
    const b=await L.launch({geo:'kunal761',store:{ct_pool:'3'},name:'draws-ui-'+tag});
    await b.open();
    let reached=false;
    try{ await R.importPgn(b,pgnOf(fen,mv),180000); await R.startReview(b); await R.goPly(b,0);
      await b.tapCt('rev-more',500); await b.tapText(/^Play from here$/,{wait:900});
      await b.tapText(/^Pass & Play$/,{wait:600}); await b.tapText(/^▶ Play this position$/,{wait:1600}); reached=true; }
    catch(e){ L.say(false,'TC-PL-066 (I) '+tag+': the set-up position could not be reached through the FEN route - the assertions below are UNRUN, not green',String(e&&e.message||e).slice(0,160)); }
    if(reached){
      const s0=await b.page.evaluate(S);
      L.say(s0.live&&!s0.over&&s0.card===null,'TC-PL-066 (I) '+tag+': PRESENCE the Pass & Play game is live on the set-up position before the move',s0);
      await b.move(fr,to,900); await b.settle(700);
      const s1=await b.page.evaluate(S);
      L.say(/Draw/.test(s1.card||'')&&rule.test(s1.card||''),'TC-PL-066 (I) '+tag+': '+fr+'-'+to+' ends the game as a draw and the card names the rule ('+rule.source+')',s1);
      L.say(s1.over&&!s1.live,'TC-PL-066 (I) '+tag+': and the control row is the game-over row, so the game really is over',s1);
    }
    L.say(b.errs.length===0,'TC-PL-066 (I) '+tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }

  // ── (J) ONLINE [the job's other half; flags/draws-online-not-covered-2026-09-17]. The real CTCloud lives in index.html and imports from
  // gstatic.com, which the harness blocks, so window.CTCloud is replaced by a STORE: it keeps one game record, merges what the app
  // pushes and hands the record back to the app's own watcher. It decides nothing - the result under test is what the APP pushes. The
  // record is seeded with a legal 84-ply game (generated from chess.jsx's own move generator) that leaves White, the player, one capture
  // from K+B v K. PRESENCE FIRST: the seeded game is on the board and live before the move.
  {const SEED=["b4","Nh6","h4","c5","bxc5","e5","Nc3","Qxh4","Rxh4","Bxc5","Rxh6","Bxf2+","Kxf2","gxh6","Ke3","d5","Nxd5","Bh3","Nxh3","Kd7","Ne7","Kxe7","d4","exd4+","Kxd4","Rf8","Bxh6","Re8","Kc5","Rf8","Bxf8+","Kxf8","a4","h5","Nf2","Ke8","c3","Nd7+","Qxd7+","Kxd7","Kb4","h4","Kc4","f5","Kd3","Rb8","Ra2","Ra8","a5","Rh8","g3","hxg3","a6","bxa6","Rxa6","gxf2","Rxa7+","Kd8","Ra1","Kd7","Rc1","Kd6","e4","fxe4+","Kxe4","Rd8","Re1","fxe1=B","Be2","Bxc3","Bf1","Rd7","Bb5","Bd4","Kxd4","Rc7","Kd3","Ke5","Ke2","Rh7","Ba6","Rh2+","Kd3","Re2"];
   const b=await L.launch({geo:'kunal761',name:'draws-online'});
   await b.page.addInitScript((seed)=>{const st={ready:true,_g:null,_cb:null,pushes:[],
     onAuth(cb){setTimeout(()=>cb({uid:'gate-uid',name:'Gate'}),60);},load(){return Promise.resolve(null);},save(){return Promise.resolve();},
     signIn(){return Promise.resolve();},signOut(){},gameList(){return Promise.resolve([]);},gameLeave(){},mmCancel(){},
     gameCreate(color,tc){st._g={status:'active',moves:seed.slice(),chat:[],tc:null,moveAt:Date.now(),result:null,w:{uid:'gate-uid',name:'Gate'},b:{uid:'opp-uid',name:'Opp'}};return Promise.resolve({id:'g-draw',code:'DRAW1'});},
     gameWatch(id,cb){st._cb=cb;setTimeout(()=>cb(JSON.parse(JSON.stringify(st._g))),300);return ()=>{};},
     gamePush(id,patch){st.pushes.push(JSON.parse(JSON.stringify(patch)));Object.assign(st._g,patch);const cb=st._cb;setTimeout(()=>cb&&cb(JSON.parse(JSON.stringify(st._g))),50);return Promise.resolve();}};
     Object.defineProperty(window,'CTCloud',{get(){return st;},set(v){},configurable:false});},SEED);
   await b.open();
   let reached=false;
   try{ await P.states['online-continue'](b); await b.tapText(/^♔ As White$/,{wait:1500}); reached=true; }
   catch(e){ L.say(false,'TC-PL-067 (J) online: the seeded game could not be reached - the assertions below are UNRUN, not green',String(e&&e.message||e).slice(0,160)); }
   if(reached){
     const ON=()=>b.page.evaluate(()=>{const t=(document.getElementById('root').innerText||'');const st=window.CTCloud;
       const pcs=[...document.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect();return r.width>20&&r.width<80&&/^data:image\/svg/.test(i.src||'');}).length;
       return {pieces:pcs,pushes:st.pushes.length,last:st.pushes[st.pushes.length-1]||null,drawHead:/(^|\n)Draw\s*(\n|$)/.test(t),agreed:/Draw agreed/.test(t),insuff:/Insufficient material/.test(t),moves:(st._g&&st._g.moves||[]).length};});
     const o0=await ON();
     L.say(o0.moves===SEED.length&&o0.pushes===0&&!o0.insuff&&!o0.drawHead,'TC-PL-067 (J) online PRESENCE: the seeded '+SEED.length+'-ply game is the live record, nothing has been pushed and no result is shown',o0);
     await b.move('d3','e2',1200); await b.settle(800);
     const o1=await ON();
     L.say(o1.pushes===1&&!!o1.last&&o1.last.result==='1/2-1/2'&&o1.last.status==='over'&&o1.last.endBy==='material'&&(o1.last.moves||[]).slice(-1)[0]==='Kxe2','TC-PL-067 (J) online: Kxe2, leaving K+B v K, is pushed WITH the draw - result 1/2-1/2, status over, endBy material - in the same write as the move, as stalemate already was',o1.last);
     L.say(o1.drawHead&&o1.insuff&&!o1.agreed,'TC-PL-067 (J) online: the result card heads it "Draw" and names "Insufficient material" - not "Draw agreed", which nobody did',o1);
   }
   L.say(b.errs.length===0,'TC-PL-067 (J) online: zero app errors',b.errs.slice(0,3));
   await b.close();}
},'29-draws');
