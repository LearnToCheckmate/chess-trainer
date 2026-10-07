// gates/regress/67-sel-cls-consumers.js - #442. TC-SELCLS-CONSUMERS / US-R13, US-R30.
//
// WHAT THIS GUARDS. #440 split the grade in two: `sel` (the old centipawn ladder, which SELECTS which
// moves go in a pool) and `cls` (the win-percentage label, which is DISPLAYED). It migrated the four
// SELECTION sites and left the label's other two kinds of consumer where they were, and both then read a
// number that no longer means what they were written against:
//   (1) DECISIONS taken from the label - the Great and Miss overlays. Great's condition was calibrated
//       when Best/Excellent meant the player had played within 40cp of the engine's move, which is the
//       whole premise of the sentence it prints, "The only move that keeps it." Under the new ladder a
//       move losing 1.8 pawns in a decided position still reads Best/Excellent, so GREAT FIRED ON A MOVE
//       THAT WAS NOT THE ENGINE'S: ply 19 of the game below rendered "! Great ... The only move that
//       keeps it." with the rev-best button 7px away offering a DIFFERENT move. That is not an
//       inconsistency, it is FALSE ABOUT CHESS, and it is on Kunal's own geometry.
//   (2) SENTENCES built from the label - the drill capture, which stored cls.label and interpolates it
//       as "you played <san> here, a <label>." It produced "a great." and "a inaccuracy".
// jobs/the-sel-cls-split-migrated-selectors-but-not-every-label-consumer-2026-09-30, two P0s, one cause.
//
// WHICH HALF OF EACH DEFECT THIS GATE DRIVES, DECLARED RATHER THAN LEFT TO BE FOUND (the gate-66 header's
// discipline, and CLAUDE.md's #375 rule):
//   DRIVEN - instance 1 END TO END, on the real game, through the DOM, at 375x730, over every ply.
//            Block D is the assertion, and it goes red on the pre-fix bundle.
//   >>> THE TWO CLAIMS THAT STOOD HERE ARE WITHDRAWN AT #493 [R18], AND THEY ARE WITHDRAWN IN THE FILE
//   >>> THAT CARRIED THEM RATHER THAN CORRECTED SOMEWHERE ELSE. This header read "DRIVEN - instance 2's
//   >>> CONSUMER half: the drill card's rendered sentence, over a seeded store..." and "`label:_S` is
//   >>> asserted by block U's enumeration of what the pool filter can emit". NEITHER WAS TRUE OF THIS
//   >>> FILE WHEN IT WAS WRITTEN. No block here opens a drill card: the D3 note at the foot of this very
//   >>> file records that attempt being CUT after it went red on both bundles on navigation, so the
//   >>> header promised a rendered card the file does not read. And block U asserted nothing whatever
//   >>> about `label:_S` - it compared a gate-declared copy of artic() against itself. A file whose
//   >>> header contradicts its own footer is the carrier problem CLAUDE.md records at #441: the warning
//   >>> lived in prose nothing greps.
//   DRIVEN - instance 2's ARTICLE, through the bundle's own shipped mechanism, read out of the drill
//            goal sentence's call site and exercised over all ten emittable grades. Block U, rebuilt at
//            #493; it reddens 4 of 14 on the free control. SOURCE-LEVEL, NOT RENDERED - see block U's
//            own header for why the rendered route does not exist and who owns getting one.
//   DRIVEN AT SOURCE, NOT RENDERED - instance 2's PRODUCER half, `label:_S` itself. Before #493 NOTHING
//            in this file asserted it: block U proved the ARTICLE is chosen from the word, block D proved
//            the ROW does not contradict itself, and neither read what the capture stored, so the
//            one-token revert of `label:_S` to `label:L` was invisible to the whole suite. Block P now
//            reads the grade the capture stores out of the shipped bundle and reddens on the control.
//            BE PRECISE ABOUT THE LIMIT: it is a structural assertion over source, NOT the rendered card
//            that jobs/gate-67-has-no-assertion-over-the-stored-drill-label-2026-09-30 asks for in its
//            `case` field, and it does not replace it.
//            >>> AND THE REASON THIS FILE USED TO GIVE FOR THAT WAS FALSE. #493's first draft said here
//            >>> that "the rendered route needs a seeded chess.com account and does not exist". BOTH BLIND
//            >>> ANTAGONISTS VETOED IT AND THE VETO WAS UPHELD [R18]. The route exists twice over, in this
//            >>> same suite, today: 51-drill-explain-why.js:101 is a ONE-LINE localStorage fixture, 51:170
//            >>> launches with it and 51:186 asserts the app captured two of the user's own mistakes from a
//            >>> REAL review (the PRODUCER), while 51:307 and 72-drill-prev.js:84 drive the RENDERED card -
//            >>> the latter with no account at all. The stronger instrument was two `store:` lines away.
//            >>> WHAT IS ACTUALLY MISSING is narrower: no gate anywhere asserts the GOAL SENTENCE a drill
//            >>> card paints. jobs/no-harness-route-to-the-drill-capture-producer-2026-09-30 is re-keyed to
//            >>> that and is a far cheaper job than "no route exists".
//   NOT DRIVEN - the depth-2 minimax fallback, for the same reason gate 66 states: ct_pool accepts only
//            1..6 and cannot switch Stockfish off, so there is no route to that branch from a gate.
//
// THE NEGATIVE CONTROL IS FREE AND IS THE ACTUAL BROKEN BUILD - #441's own head, which is every commit of
// this tree except the fix:
//   git show origin/claude/cool-noether-0ya5ft:app.js > /tmp/441.js
//   CT_APP=/tmp/441.js node gates/regress/67-sel-cls-consumers.js
// Measured, and the numbers are in the run report rather than only here.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const R=require('../drive/review');
const BUNDLE=process.env.CT_APP||path.join(__dirname,'..','..','app.js');

// The game Kunal's own complaint family comes from: White hangs the queen on move 3 and is lost from
// there, so every later White move is played in a decided position - which is exactly the state that
// softens under #440 and the state both defects need.
const PGN_LOST='[Event "Live Chess"]\n[White "Jsmiller1112"]\n[Black "Crusher9000"]\n[Result "0-1"]\n\n'+
  '1. e4 e5 2. Qh5 Nc6 3. Qxf7+ Kxf7 4. Nc3 d5 5. exd5 Qxd5 6. Be2 Qxg2 7. Nf3 Qxh1+ 8. Bf1 Nf6 '+
  '9. d3 Bd6 10. Bg5 Qg2 11. Bxf6 gxf6 12. Ne4 Bb4+ 13. c3 Bxc3+ 14. bxc3 Qxf1+ 15. Kd2 Qxa1 0-1';

// EVERY GRADE THE APP CAN LEGALLY PUT IN THAT SENTENCE, enumerated from the two ladders rather than
// sampled - #391's rule: when an assertion parses something a producer wrote, list what the producer can
// legally produce and unit-test the predicate against it, INCLUDING the cases it must reject.
// classifyByLoss emits six; classify/CLS_BANDS emits the same six; the overlays add Great, Miss and
// Brilliant; Book is a seventh display label. `ct_mymistakes` survives a build, so a store written by
// ANY of them can reach the card whatever this build now writes.
const ALL_GRADES=['Best','Excellent','Good','Inaccuracy','Mistake','Blunder','Great','Miss','Brilliant','Book'];
const PRAISE=['Best','Excellent','Good','Great','Brilliant'];   // a drill card may never name one of these
const VOWEL=['Excellent','Inaccuracy'];                          // ...and these two need "an", not "a"

L.run(async()=>{
  // ════════ BLOCK U - THE ARTICLE, DRIVEN THROUGH THE BUNDLE'S OWN SHIPPED MECHANISM ════════
  // REBUILT #493. The first version of this block DECLARED ITS OWN COPY of artic() at the line below
  // this one and asserted U1..U11 against THAT; `mArtic`, the only thing it read out of the bundle,
  // was extracted and never asserted on; and U0 was a literal `L.say(true,...)`. So twelve of this
  // gate's seventeen assertions were a unit test of three lines the gate itself wrote, and on the free
  // control - #441's own head, bundle 4d539dea5ca9 - only D1 reddened. The gate was promoted from
  // `absent` to `required` at #491 on the stated grounds that it is the only gate that reddens on the
  // sel/cls consumer P0s, which was true of block D alone.
  // jobs/gate-67-block-u-is-circular-and-u0-is-an-unconditional-pass-2026-10-07, found by #491's
  // antagonist A from the diff door. Same family as gate 66's block C, which #491 had to rewrite for
  // exactly this, and the tenth costume of the trap CLAUDE.md records: the check and the thing being
  // checked were the same object.
  //
  // WHAT IT DRIVES NOW, AND WHY IT IS NOT THAT SHAPE ONE LEVEL UP. The article is not a property of a
  // helper; it is a property of THE SENTENCE THE DRILL CARD PAINTS. That sentence is built at one site
  // in the bundle and exists in exactly two shapes, both MEASURED rather than assumed:
  //     fixed    "here, "   + oS(String(a.label||"mistake").toLowerCase()) + ". Find the stronger move."
  //     broken   "here, a " +    String(a.label||"mistake").toLowerCase()  + ". Find the stronger move."
  // So the mechanism is read OUT OF THE CALL SITE and then exercised, whichever shape it is in: a
  // helper is resolved from the bundle BY THE NAME THE SITE ACTUALLY CALLS and instantiated, and a
  // baked-in article becomes the constant function it is. Every U below is then a statement about the
  // shipped bundle, and every one of them can fail.
  //
  // MEASURED ON BOTH BUNDLES at #493, which is the whole reason to trust the rebuild:
  //     main 431326911ca7   chooses by helper `oS`   -> 0 of 10 grades wrong, 14 of 14 green
  //     #441 4d539dea5ca9   bakes in "a "            -> 2 of 10 grades wrong, 4 red (U1, U2,
  //                                                     Excellent, Inaccuracy)
  // and those two wrong grades are "a excellent" and "a inaccuracy". The second is VERBATIM the card
  // antagonist B and the auditor each read off the screen by hand, from two different doors, on the
  // #441 bundles. This block now reproduces from source what two independent human passes found in the
  // DOM, which is the cross-check the old one could not make from a copy of its own helper.
  //
  // WHY NOT READ THE RENDERED CARD, WHICH WOULD BE BETTER: there is no harness route to it. The capture
  // only runs when meta.userColor is set, which needs a stored chess.com account, and the D3 note at
  // the foot of this file records that attempt going red on BOTH bundles on navigation - a fault in the
  // navigation, not in either build. jobs/no-harness-route-to-the-drill-capture-producer-2026-09-30
  // owns that. This is the next best instrument, and U0 pins it to the call site so that a refactor of
  // the sentence reddens the gate instead of quietly blinding it [#432].
  const src=fs.readFileSync(BUNDLE,'utf8');
  const GOAL_TAIL='. Find the stronger move.';
  const callSite=src.match(/"here, "\+([A-Za-z_$][\w$]*)\(String\(/);
  const litSite =src.match(/"here, (an? )"\+String\(/);

  // U0 THE INSTRUMENT, AND IT IS AN ASSERTION NOW RATHER THAN A REPORT. If neither shape is present the
  // sentence has moved and every U below it is unanchored, which must read as a RED and never as a
  // silent walk over nothing. This is the assertion the old U0 should have been.
  L.say(!!(callSite||litSite)&&src.indexOf(GOAL_TAIL)>=0,
    'U0 the drill goal sentence is located in this bundle, so block U is anchored to the shipped call site',
    {bundle:path.basename(BUNDLE),tailPresent:src.indexOf(GOAL_TAIL)>=0,
     shape:callSite?('calls '+callSite[1]):(litSite?('article baked into the literal "'+litSite[1]+'"'):'NOT FOUND'),
     gradesUnderTest:ALL_GRADES.length});

  // U1 THE STRUCTURAL ONE, AND IT IS THE DEFECT ITSELF. The article must be chosen from the word by a
  // call; carrying it in the sentence literal is what printed "a inaccuracy".
  L.say(!!callSite,
    'U1 the article is chosen by a call on the label, not carried in the sentence literal',
    {callee:callSite?callSite[1]:null,bakedLiteral:litSite?litSite[1]:null});

  // U2 A HELPER THAT EXISTS AND IS NOT CALLED STILL SHIPS THE DEFECT. So the thing under test is the
  // function THE SITE NAMES, resolved out of the same bundle by that name - not any helper that happens
  // to be present somewhere in the file. Without this, adding a correct artic() and failing to wire it
  // would pass U3..U13, which is the #432 hole: a check that reads only what the fix added.
  //
  // #493's FIRST VERSION OF THIS BLOCK WAS VETOED BY BOTH BLIND ANTAGONISTS AND THE VETO WAS UPHELD.
  // It CONSTRUCTED the helper and never CALLED it inside the try. `new Function` evaluates no function
  // body at construction, so U2's own text asserted the callee "resolves ... AND RUNS" while nothing had
  // run it, and the first real call was U3 in the loop below, OUTSIDE any guard. gates/lib.js:316 wraps a
  // whole gate in ONE try/catch whose handler calls done() -> process.exit, so a throw in that loop
  // collapses this gate from 21 assertions to about three AND TAKES BLOCKS P AND D DOWN WITH IT -
  // including D1, the only assertion in this project that reddens on instance 1 of the band-16 P0 this
  // gate was promoted to `required` for. That is #393's halt-on-first-absence trap landing on exactly the
  // gate that must not have it.
  //   HOW IT IS REACHED: `new Function` gives the helper NONE of the bundle's closure, so a helper
  //   referencing anything module-scope throws ReferenceError on first call.
  //   AND IT IS LATENT, NOT LIVE - the distinction matters and it was measured rather than assumed. On
  //   this bundle the helper is `function oS(e){let t=String(e||"").trim();return(/^[aeiou]/i.test(t)?
  //   "an ":"a ")+t}`: the regex literal is INLINE and the only free name is the global `String`, so it
  //   both instantiates and runs cleanly here and this gate's 21/0 figures are uncontaminated. It is
  //   triggered by a future SOURCE change - hoisting the vowel test to a module constant beside artic()
  //   at chess.jsx:498, a refactor this file has precedent for (EVAL_BAR_W, LESSON_FOOT_GLYPH). Antagonist
  //   A found the mechanism from the diff door and rated it live; antagonist B measured that it is latent;
  //   B is right and the remedy is mandatory either way.
  // SO: the helper is INVOKED inside the try, every per-grade call below is guarded individually, and a
  // failure to resolve or to run is a RED and never a note - the same rule this build applied to D2.
  let shipped=null,shippedHow='none',shippedSrc=null,shippedWhy=null;
  if(callSite){
    const nm=callSite[1];
    const mFn=src.match(new RegExp('function '+nm.replace(/\$/g,'\\$')+'\\(\\w\\)\\{.*?\\}(?=[,;a-zA-Z])'));
    if(mFn){
      try{
        const fn=new Function('"use strict";return ('+mFn[0]+')')();
        const probe=fn('best');                 // CALL it inside the guard: construction proves nothing
        if(typeof probe!=='string')throw new Error('it returned '+typeof probe+', not a string');
        shipped=fn; shippedHow='helper '+nm; shippedSrc=mFn[0];
      }catch(e){ shippedWhy='resolved `function '+nm+'` out of the bundle but it would not instantiate or run: '+e.message+'  (if this is a ReferenceError the helper depends on the bundle closure, which new Function does not provide - see KNOWN LIMITS)'; }
    }else{ shippedWhy='the goal site calls '+nm+' and no `function '+nm+'(x){...}` resolved in this bundle - see KNOWN LIMITS, this is a shape the resolver cannot read rather than proof the helper is absent'; }
  }else if(litSite){
    const lit=litSite[1]; shipped=(w)=>lit+String(w||'').trim(); shippedHow='baked literal "'+lit+'"';
  }
  L.say(shippedHow.indexOf('helper ')===0,
    'U2 the callee named at the goal site resolves to a real function in the same bundle AND RUNS when it is called',
    {how:shippedHow,helperSrc:shippedSrc,why:shippedWhy});

  // U3..U12 THE SHIPPED MECHANISM ITSELF, over every grade the producer can emit - enumerated from the
  // two ladders rather than sampled [#391], and NOT a copy of the mechanism. Each call is guarded so one
  // throw reddens ONE grade instead of ending the gate [#393].
  let n=3;
  for(const g of ALL_GRADES){
    const want=(VOWEL.indexOf(g)>=0?'an ':'a ')+g.toLowerCase();
    let got=null,threw=null;
    try{ got=shipped?shipped(g.toLowerCase()):null; }catch(e){ threw=e.message; }
    L.say(got===want,'U'+n+' this bundle writes "'+want+'" for the grade '+g,
          {grade:g,got,want,via:shippedHow,threw});
    n++;
  }
  // U13 AND THE ONE THAT REJECTS: the mechanism must NOT put "an" in front of a consonant. Without this
  // the block is satisfied by a helper that always says "an", which is the alternation trap (#388).
  const cons=ALL_GRADES.filter(g=>VOWEL.indexOf(g)<0);
  let consOK=false,consOff=null,consThrew=null;
  try{ consOff=cons.filter(g=>shipped(g.toLowerCase()).slice(0,2)!=='a '); consOK=consOff.length===0; }
  catch(e){ consThrew=e.message; }
  L.say(consOK,
        'U13 and it does NOT say "an" before any of the '+cons.length+' consonant-initial grades',
        {consonantGrades:cons,via:shippedHow,offenders:consOff,threw:consThrew});

  // KNOWN LIMITS OF BLOCKS U AND P, MEASURED BY THIS BUILD'S TWO ANTAGONISTS AND WRITTEN DOWN SO THE NEXT
  // RUN DOES NOT REDISCOVER THEM. Both regexes read MINIFIED OUTPUT. Everything hard-coded in them is an
  // object-literal key or a data property - `fen:`, `uci:`, `label:`, `ts:Date.now()`, `.sel` - which
  // esbuild does not mangle, and every mangled identifier is CAPTURED. But they also encode EXPRESSION
  // SHAPES, and those are the brittle part. Antagonist A measured, on correct bundles:
  //   the helper resolver needs a `function NAME(x){...}` DECLARATION with a single-character parameter and
  //   no nested `}`, so an arrow refactor, a two-parameter helper, or a braced `if` guard inside the body
  //   each take U2 red and U3..U13 eleven red ON A GOOD BUNDLE;
  //   the capture regex false-reds on a nested call in the fen argument, an inline-built uci, a plain
  //   variable fen, any key added before fen, or label moved after ts.
  // These fail in the SAFE direction - they false-RED, never false-pass - and U0/P0 anchor on the sentence
  // and the capture object precisely so that a refactor reddens this gate instead of silently blinding it
  // [#432]. They are NOT fixed here: making the regexes permissive is how a loose pattern stops
  // discriminating, which is this project's #388 lesson. jobs/gate-67-block-u-is-circular-and-u0-is-an-
  // unconditional-pass-2026-10-07 carries the list.
  //   AND THE DENOMINATOR OF THIS GATE IS INPUT-DEPENDENT, which no close-out should report as a
  //   regression: D2 emits an L.say only when a Miss row renders, so this gate is 23 assertions on a
  //   bundle that renders one and 22 on a bundle that renders none. Say the Miss-row count with the total.

  // ════════ BLOCK P - THE PRODUCER: WHICH LADDER THE DRILL CAPTURE STORES ════════
  // NEW AT #493, and it is the assertion jobs/gate-67-has-no-assertion-over-the-stored-drill-label-
  // 2026-09-30 says does not exist. That job's ifNotDone is precise about what it fears: "a later build
  // reverts `label:_S` to `label:L` - a one-token change in a line nothing asserts over - and the drill
  // goes back to telling the player 'you played Bg5 here, a great.' with the full suite green." Blocks U
  // and D cannot see that revert. U proves the ARTICLE is chosen from the word, D proves the review ROW
  // does not contradict itself, and neither reads what the capture stored.
  //
  // THE INSTRUMENT IS SOURCE-LEVEL, NOT RENDERED, AND THAT IS A CHOICE THIS BUILD GOT WRONG FIRST TIME.
  // #493 originally justified it with "the rendered route needs a seeded chess.com account and does not
  // exist". THAT WAS FALSE, both antagonists caught it, and the veto was upheld. MEASURED: the route
  // exists twice over, in this same suite, today.
  //   gates/regress/51-drill-explain-why.js:101 is a ONE-LINE localStorage fixture,
  //     `ACCT={ct_accts:['cc:dukekarlcountisouard99'],ct_acctgames:{...}}` - no network, no real account;
  //   51:170 launches with `store:ACCT` and 51:186 then asserts the app CAPTURED AT LEAST 2 OF THE USER'S
  //     OWN MISTAKES FROM A REAL REVIEW, which is the PRODUCER running with meta.userColor set - the exact
  //     thing the old comment called unreachable;
  //   51:307 launches `store:{ct_mymistakes:[mis[i]]}` and drillSolve at 51:156 taps
  //     /find the move you missed/ across seven geometries - the rendered CONSUMER;
  //   gates/regress/72-drill-prev.js:84 does the rendered drill with `store:{ct_mymistakes:rows('Blunder')}`
  //     and NO ACCOUNT AT ALL.
  // So the stronger instrument was two `store:` lines away, copied out of a sibling gate, and CLAUDE.md's
  // #386/#390 rule said so in advance: before fighting a control in a new gate, ask whether an existing
  // gate already had to fight it. WHAT IS ACTUALLY MISSING is narrower and is now stated correctly: no
  // gate anywhere asserts the GOAL SENTENCE a drill card paints - `"Find the stronger move."` appears in
  // gates/ only inside this file's own source-matching regexes. That is the re-keyed scope of
  // jobs/no-harness-route-to-the-drill-capture-producer-2026-09-30, which was carried as "no route exists"
  // and is a far cheaper job than that.
  //
  // WHY IT IS KEYED THE WAY IT IS. See KNOWN LIMITS above. The minified names differ between the two
  // bundles measured here (`k` on main, `G` on the control) and between builds, which is exactly why none
  // of them appears in this file.
  const capSite=src.match(/\{fen:[\w$]+\([^()]*\),uci:[\w$]+,label:([\w$]+),ts:Date\.now\(\)/);

  // P0 THE ANCHOR, same discipline as U0: if the capture object has moved, P1..P3 are unanchored and that
  // is a RED, never a quiet pass. This is the guard against the gate going blind on a refactor [#432].
  L.say(!!capSite,'P0 the drill capture object is located in this bundle, so P1..P3 are anchored to the shipped store',
        {bundle:path.basename(BUNDLE),labelVar:capSite?capSite[1]:null});

  if(capSite){
    const v=capSite[1].replace(/\$/g,'\\$');
    const at=src.indexOf(capSite[0]);
    const region=src.slice(Math.max(0,at-6000),at);
    // #493: the prefix class was `[,;{(}]`, which omits WHITESPACE - so two semantics-preserving
    // reorderings of correct source turned P1 red, and it also matched an arrow parameter as an
    // assignment. Antagonist A measured both. `(?:^|[^\w$])` is the correct left boundary.
    const re=new RegExp('(?:^|[^\\w$])'+v+'=([^,;]{0,120})','g');
    let x,capFrom=null; while((x=re.exec(region))) if(/\.sel\s*\|\|/.test(x[1])) capFrom=x[1];

    // P1 THE ONE-TOKEN ASSERTION. The grade the capture STORES must be the grade the pool was SELECTED on
    // (`sel`, the centipawn ladder) and not the grade the row DISPLAYS (`cls.label`, the win-percentage
    // ladder). Read from the assignment of the variable the site actually stores.
    //   WHY A 6000-CHARACTER WINDOW RATHER THAN THE WHOLE FILE, corrected [R18]: this comment used to say
    //   "there are three `.sel` and only one of them is this one". MEASURED on this bundle, `.sel` occurs
    //   ELEVEN times and only THREE are `.sel||`; the other EIGHT are `B.sel`/`h.sel`, the board's
    //   drag-selection [row,col] - a homonym of an entirely different type. That makes the window more
    //   load-bearing, not less. Of the three `.sel||`, the offsets from the capture site are -401 (this
    //   one), +62156 and +236258, so exactly one falls inside the window, and THAT is the fact that
    //   justifies it.
    L.say(!!capFrom,
      'P1 the drill capture stores the SELECTION grade (`sel`), not the displayed win-percentage label - the one-token revert that brings back "you played Bg5 here, a great." is now visible to this gate',
      {labelVar:capSite[1],assignedFrom:capFrom,
       note:capFrom?null:'no assignment of the stored-label variable in the 6000 chars before the capture site derives it from `.sel||`'});

    // P2 TOKEN IDENTITY, AND IT IS THE ASSERTION P1 CANNOT MAKE. chess.jsx:4322 rests its whole structural
    // guarantee on one sentence: "`_S` is the very expression the `if` above filters on, so the card can
    // only ever say 'a mistake' or 'a blunder'." P1 reads the ASSIGNMENT and never the enclosing `if`, so
    // antagonist B broke it and antagonist A reproduced the break: swap ONLY the filter's variable to the
    // display label and leave `label:k` alone, and P0, P1, U and D ALL STAY GREEN while the decided-position
    // drill pool empties - which is #440's own first-cut regression (gate 51 went to "captured: 0, inputs:
    // 0", chess.jsx:489). Grade membership cannot catch it either, because the broken bundle still tests
    // the literals "Mistake" and "Blunder"; only TOKEN IDENTITY can. Kept as its own L.say rather than a
    // conjunct of P1 or P3, because a compound whose halves cannot fail independently is the tautology
    // antagonist A filed this same run at 25-online-clocks.js:137.
    // THE FILTER PATTERN PRESUPPOSES NO GRADE NAME, and that took two tries. The first version matched
    // `if((X==="Mistake"||X==="Blunder")` literally, which would false-RED the moment the filter was
    // legitimately widened, and made P3 below TAUTOLOGICAL - reading the two grade names out of a pattern
    // that required them cannot fail. This matches the SHAPE instead: a disjunction of equality tests on
    // one identifier. The grade set is then whatever the bundle's own filter contains.
    const mFilt=region.match(/if\(\(([\w$]+)===("[A-Za-z]+"(?:\|\|\1==="[A-Za-z]+")*)\)/);
    L.say(!!mFilt&&mFilt[1]===capSite[1],
      'P2 the grade the capture FILTERS on is the SAME TOKEN it stores, so the card can only ever name a grade the filter admitted',
      {filterVar:mFilt?mFilt[1]:null,storedVar:capSite[1],
       note:mFilt?null:'no `if((X==="Mistake"||X==="Blunder")` found in the 6000 chars before the capture site'});

    // P3 THE INVARIANT THIS FILE USED TO DECLARE AND NEVER ASSERT. `PRAISE` was defined at the top as
    // "a drill card may never name one of these" and `grep -n PRAISE` returned that ONE line - the file
    // stated the rule and then, ten lines later, U3/U4/U5/U9/U11 certified that the bundle correctly
    // writes "a best", "an excellent", "a good", "a great" and "a brilliant". Antagonist B found it.
    // Now the admissible set is read out of the bundle's own filter and checked against PRAISE.
    //   WHAT THIS DOES NOT COVER, stated because it is the whole of B's §2 and it is a LIVE defect: this
    //   asserts what the capture may WRITE from now on. It says nothing about the rows ALREADY IN THE
    //   INSTALLED STORE, which a #441-era bundle wrote with the display label - so a real player can still
    //   be shown "you played Bg5 here, an excellent." today. `puzzleFromMistake` (chess.jsx ~5480) has no
    //   label guard, the merge at chess.jsx:4349 patches only `why`/`hint` and never `label`, and a row
    //   leaves only by being solved or evicted off `.slice(0,150)`. That is
    //   jobs/a-legacy-drill-row-still-praises-the-move-it-asks-you-to-improve-and-nothing-migrates-it-2026-10-07
    //   and it needs a guard in the app, not an assertion here.
    //   CONTROLLED BEFORE THE RE-GATE, four injections into the bundle text, so neither P2 nor P3 is
    //   published as a green nobody has tried to break:
    //     filter admits "Good" (a praise grade)      -> P3 FAIL, P2 pass      the defect P3 exists for
    //     filter widened to "Inaccuracy" (legitimate) -> P3 pass, P2 pass      NOT a false red
    //     filter variable swapped to the display label -> P2 FAIL, P3 pass     antagonist B's break
    //     the #441 control bundle                      -> P2 FAIL, P3 pass     stored G vs filtered S
    // READ THE GRADES OUT OF THE MATCHED FILTER, NOT OUT OF THE REGION. Scanning the 6000-char window for
    // `<var>==="X"` was this assertion's first form and it was POLLUTED: minified names are reused across
    // scopes, so on this bundle it returned ["w","Mistake","Blunder"] - `w` came from an unrelated
    // `k==="w"` colour test sharing the identifier. Caught by this build's own pre-verification before the
    // re-gate, and it is the same homonym disease antagonist A measured in the `.sel` count above.
    const admits=mFilt?(mFilt[2].match(/"([A-Za-z]+)"/g)||[]).map(t=>t.replace(/"/g,'')):[];
    const praised=admits.filter(g=>PRAISE.indexOf(g)>=0);
    L.say(admits.length>0&&praised.length===0,
      'P3 every grade the capture filter admits is OUTSIDE the PRAISE set, so no drill card written by this bundle can name a move the app praised',
      {admits,praise:PRAISE,praised,
       note:admits.length?null:'the filter admitted no grades this instrument could read - unanchored, so this is a red and not a pass'});
  }else{
    // The not-anchored case is a NOTE and is NOT credited as a pass, exactly as D2 does below. P0 above
    // already carries the red; restating it as three more reds would report one fault four times, and
    // asserting P1's sentence with no capture site would assert something false ABOUT THE BUNDLE when the
    // only thing that happened is that the shape moved. Antagonist A caught that asymmetry: this build
    // added the guard to D2 and not to P.
    L.note('P1..P3 NOT RUN and NOT COUNTED AS PASSES: the capture object did not match, so there is no '+
           'stored-label variable to trace. P0 is the red. This is a shape the regex cannot read, not '+
           'proof the capture is wrong - see KNOWN LIMITS above.');
  }

  // ════════ BLOCK D - THE REVIEW ROW, EVERY PLY OF A DECIDED GAME, ON KUNAL'S PHONE ════════
  const b=await L.launch({geo:{w:375,h:730},name:'sel-cls-consumers',store:{ct_pool:'3',ct_revCompact:'1'}});
  await b.open();
  L.note('bundle stamp on the page: '+await b.stamp());
  await b.home(); await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN_LOST);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  let up=true;
  try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});}catch(e){up=false;}
  await b.settle(1200);
  L.note('import + analysis took '+Math.round((Date.now()-t0)/1000)+' s');
  L.say(up,'D0 the lost game imported and the review summary rendered');
  if(!up){ L.note('D1..D3 NOT RUN: no summary to read'); return; }

  await R.startReview(b);
  const N=await b.page.evaluate(()=>document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]').length);
  L.say(N>=28,'D0b INSTRUMENT: the move strip carries every ply of the game, so the walk below has a real denominator',{plies:N});

  // Walk EVERY ply and record what the row says. Measured, never inferred: the label comes off the
  // rendered pill and the offered move off the rendered rev-best button.
  const rows=[];
  for(let p=1;p<=N;p++){
    await R.goPly(b,p);
    const r=await b.page.evaluate(()=>{
      const line=document.querySelector('[data-ct="rev-move-line"]');
      const best=document.querySelector('[data-ct="rev-best"]');
      return {line:line?line.innerText.replace(/\s+/g,' ').trim():null,
              best:best?best.innerText.replace(/\s+/g,' ').trim():null};
    });
    rows.push({ply:p,...r});
  }
  L.say(rows.filter(r=>r.line).length===N,'D0c INSTRUMENT: every one of the '+N+' plies rendered a move line - nothing below is a vacuous pass over an empty walk',
        {pliesWalked:N,linesRead:rows.filter(r=>r.line).length});

  // D1 THE HEADLINE. "Great" means the player found the ONLY move that holds - so the screen may not, in
  // the same breath, offer a different move as the better one. Assert the CONTRADICTION, not the label:
  // this stays correct however the display ladder is later re-banded, and it is exactly what a player sees.
  const san=(s)=>{const m=String(s||'').match(/^\s*\d+\s*[.…]+\s*(\S+)/);return m?m[1]:null;};
  const bestSan=(s)=>{const m=String(s||'').match(/best\s+(\S+)/i);return m?m[1]:null;};
  const greats=rows.filter(r=>r.line&&/\bGreat\b/.test(r.line));
  const bad=greats.filter(r=>{const o=bestSan(r.best);return o&&o!==san(r.line);});
  L.say(bad.length===0,
    'D1 no ply is labelled Great while the row itself offers a DIFFERENT move as the better one - the sentence "The only move that keeps it" is never printed beside a refutation of itself',
    {pliesWalked:N,greatRows:greats.length,contradictions:bad.length,first:bad.slice(0,3)});

  // D2 THE SAME SHAPE FOR MISS, which broke in the other direction: it needs the old Mistake/Blunder band
  // and stopped firing when those softened. A Miss row must still be offering a better move, or the
  // overlay has fired on a move that was fine.
  // #493: D2 WAS VACUOUS AND READ AS A PASS. `misses.every(...)` returns TRUE on an empty list and
  // nothing asserted missRows > 0, so on any bundle where no ply renders a Miss row - which is the
  // state the Miss HALF OF THIS DEFECT IS, since Miss stopped firing when the bands softened - D2
  // printed PASS over nothing. A green that is loudest exactly when the defect is present is worse
  // than no assertion [CLAUDE.md, #405's "0 PASS is the tell"]. The precondition is now explicit and
  // the not-run case is a NOTE, never a PASS: a missing denominator is reported, not credited.
  const misses=rows.filter(r=>r.line&&/\bMiss\b/.test(r.line));
  if(misses.length>0){
    L.say(misses.every(r=>{const o=bestSan(r.best);return !o||o!==san(r.line);}),
      'D2 no ply is labelled Miss while the row names the played move as the best one',
      {missRows:misses.length,pliesWalked:N,
       offenders:misses.filter(r=>{const o=bestSan(r.best);return o&&o===san(r.line);}).slice(0,3)});
  }else{
    L.note('D2 NOT RUN and NOT COUNTED AS A PASS: no ply of this game rendered a Miss row, so the '+
           'assertion has no denominator (pliesWalked='+N+', missRows=0). The old version of this line '+
           'scored that state PASS via .every() over an empty list. If no bundle ever fires Miss on this '+
           'input, the Miss half of the sel/cls defect needs a DIFFERENT INPUT rather than a greener log: '+
           'jobs/gate-67-block-u-is-circular-and-u0-is-an-unconditional-pass-2026-10-07 records it.');
  }

  // D3 IS NOT IN THIS GATE, AND THE REASON IS A MEASUREMENT RATHER THAN A JUDGEMENT. I wrote it: seed
  // `ct_mymistakes` with all ten grades, reload, open "Practice your mistakes" and read the goal sentence
  // the app paints. It went RED ON BOTH BUNDLES - the shipped one and the control - with
  // "locator.waitFor: Timeout 8000ms exceeded" on the Review tab after the reload, so the card never
  // opened and D3b..D3d never ran. That is a fault in MY navigation, not in either build, and a gate that
  // is red on a good build is worse than no gate. Cut rather than weakened, and cut rather than left
  // throwing: this gate now covers instance 1 END TO END and instance 2's ARTICLE only.
  //
  // WHAT IS THEREFORE UNCOVERED, named so nobody reads this gate as covering the drill end to end.
  // THIS PARAGRAPH SAID "NOTHING HERE ASSERTS IT" ABOUT THE STORED LABEL AND #493 MADE THAT FALSE IN THE
  // SAME COMMIT THAT WITHDREW TWO OTHER FALSE HEADER CLAIMS [R18]. Antagonist A caught it: block P, a
  // hundred lines above, asserts exactly that token, so the file's footer had come to contradict its own
  // header - the carrier problem CLAUDE.md records at #441, inverted, and installed by the build that was
  // advertising its repair. Corrected here rather than anywhere else.
  // WHAT IS COVERED NOW: P1 the stored grade derives from `sel`, P2 the stored token IS the filtered
  // token, P3 no admitted grade is in PRAISE - all three SOURCE-LEVEL, over the producer.
  // WHAT IS STILL NOT COVERED, and the first of these is a LIVE player-visible defect:
  //   (1) THE INSTALLED STORE. Every assertion here is about rows this bundle WRITES. A #441-era bundle
  //       wrote the DISPLAY label into ct_mymistakes, those rows are in real stores now, and nothing
  //       migrates them - chess.jsx:4349 patches only `why`/`hint`, puzzleFromMistake (~5480) has no label
  //       guard, and a row leaves only by being solved or evicted off `.slice(0,150)`. A player can read
  //       "you played Bg5 here, an excellent. Find the stronger move." today. Found by antagonist B, filed
  //       as jobs/a-legacy-drill-row-still-praises-the-move-it-asks-you-to-improve-and-nothing-migrates-
  //       it-2026-10-07. It needs a guard in the APP; no assertion here can fix it.
  //   (2) THE RENDERED GOAL SENTENCE. No gate in this project asserts the text a drill card paints, and
  //       the route to do it exists (see the header). jobs/no-harness-route-to-the-drill-capture-producer-
  //       2026-09-30, re-keyed.
  //   (3) THE `||"mistake"` FALLBACK inside the goal site's own argument. Block U locates that expression
  //       and never evaluates it, so deleting the fallback would paint "a undefined" with U0..U13 green.
  //       Antagonist A found it; antagonist B measured that NO producer can write a label-less row
  //       (`git log -S` shows every version of the capture carrying `label:`), so it is a gate blindness
  //       rather than a reachable defect, and it is recorded on job (1) rather than asserted here.
});
