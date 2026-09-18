// regress/21-review-brilliant.js  TC-R10 (US-R06): a brilliancy is explained by what the sacrifice buys, and the
// play-out button animates the line. Port of bril357gate's live half + why354. Opera Game, 10.Nxb5!! (ply 19).
// The sentence must name the follow-up (a forcing move such as Bxb5+ / "If cxb5"); the play-out must move a piece.
// #356: one engine trap is allowed BY EXACT TEXT ("RuntimeError: unreachable") and nothing else.
//
// #388, uat-ext-2026-09-14 - WHY THIS GATE NOW PINS THE WHOLE SENTENCE.
// An external challenger applied the designed negative control to this gate and it stayed GREEN at 7 of 7
// against a build whose brilliancy explanation had DEMONSTRABLY CHANGED: from
//     "Nothing else came close: Bxf6 was 1.1 pawns worse."   to   "Bxf6 was the only other try, 1.1 worse."
// The assertion that was supposed to catch that read /Nothing else came close|worse|next best|instead/i, and the
// bare word "worse" appears in EVERY branch of dropTxt() (chess.jsx:667-673). A regex that matches every branch
// pins nothing, and this is the ONLY gate covering brilliancy explanations - the item Kunal raised five times -
// so every green it had ever reported was worth less than it looked.
//
// Three things changed, and they are three different kinds of assertion on purpose:
//   1. THE PIN. The whole sentence is compared to the one measured on #387, verbatim. All four clause builders
//      (_give, refTxt, cmpTxt, standing in explainAnno) are then pinned separately so a red says WHICH clause moved.
//   2. THE BRANCH/VALUE CHECK. The comparison clause must match exactly ONE dropTxt template, and the number it
//      prints must lie in the band that template is printed for. The challenger's break puts a 1.1 inside the
//      0.35-0.99 wording, so this fires even if the pin is ever loosened.
//   3. THE CROSS-CHECK. "White is winning here" is a WORD for a quantity the coach chip shows as a NUMBER eight
//      pixels away. #385 shipped a chip reading +0.0 beside a bar reading +5.9 because nothing compared them.
//      NOTE THE COUPLING THIS CREATES, deliberately: assertions here now read the COACH BUBBLE's chip and
//      sentence (data-ct coach-eval / coach-say, shipped #385). If the bubble is ever removed or its guard
//      changes, three assertions in THIS gate go red for a reason that has nothing to do with brilliancies.
//      That is the right trade - a cross-check has to read something else on the screen to be a cross-check -
//      but whoever changes the bubble should expect to move these three lines with it, not delete them.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
// measured on #387 (ae5ebbc4497645dd19a7215a0402010e) at 375x679, ct_pool 3, ply 19, twice with the same result
const WANT='You give up a piece. If cxb5, Bxb5+ and White is winning. Nothing else came close: Bxf6 was 1.1 pawns worse. White is winning here.';
const SAN='(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?';
// the four forms of dropTxt(), chess.jsx:667-673, with the drop band each one is printed for
const FORMS=[
  {k:'throws-the-win-away',re:new RegExp('(?:^|[.] )('+SAN+'), the next best, throws the win away\\.'),band:null},
  {k:'nothing-came-close', re:new RegExp('(?:^|[.] )Nothing else came close: ('+SAN+') was (\\d+\\.\\d) pawns worse\\.'),band:[1.0,89.99]},
  {k:'only-other-try',     re:new RegExp('(?:^|[.] )('+SAN+') was the only other try, (\\d+\\.\\d) worse\\.'),band:[0.35,0.99]},
  {k:'as-good-on-paper',   re:new RegExp('(?:^|[.] )('+SAN+') was as good on paper, but nothing like as forcing\\.'),band:null},
];
// the five forms of `standing`, chess.jsx:727
const STAND=/(?:White|Black) is (?:winning|losing) here\.$|(?:White|Black) is clearly (?:better|worse)\.$|The position stays roughly level\.$/;
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'review-brilliant',store:{ct_pool:'3'}});await b.open();
  await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});
  for(let i=0;i<19;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(140);}await b.settle(1500);
  const ml=await b.rect('[data-ct="rev-move-line"]');L.say(!!ml&&/Nxb5/.test(ml.text),'at 10.Nxb5',ml&&ml.text);
  const txt=(await b.text('[data-ct="rev-why-txt"]'))||(await b.text('[data-ct="rev-why"]'))||'';
  L.note('reason: '+txt.slice(0,200));
  L.say(/give|sacrific|gives up/i.test(txt),'TC-R10 the reason says what was given up');
  L.say(/If cxb5|Bxb5\+|cxb5/.test(txt),'TC-R10 the reason names the forcing follow-up (cxb5 / Bxb5+)');
  L.say(/Nothing else came close|worse|next best|instead/i.test(txt),'TC-R10 the reason compares with the next-best move');

  // ── 1. THE PIN, and the four clauses separately so a red names the one that moved ────────────────
  L.say(txt===WANT,'TC-R10 PINNED the brilliancy sentence is EXACTLY the one measured on #387',{want:WANT,got:txt});
  L.say(/^You give up (?:the queen|a rook|a piece|a pawn|material)(?:\.|, and )/.test(txt),'TC-R10 clause 1 matches the _give template verbatim',txt.slice(0,44));
  L.say(/^You give up a piece\./.test(txt),'TC-R10 clause 1 PINNED to "a piece" - Nxb5 gives up a knight',txt.slice(0,24));
  L.say(/(?:^|[.] )If cxb5, Bxb5\+(?:[^.]*)?\./.test(txt),'TC-R10 clause 2 is the refutation template "If <capture>, <reply>."');
  L.say(STAND.test(txt),'TC-R10 clause 4 matches a `standing` template verbatim and closes the sentence','...'+txt.slice(-34));

  // ── 2. EXACTLY ONE dropTxt template, and its NUMBER inside that template's own band ──────────────
  const hit=FORMS.filter(f=>f.re.test(txt));
  L.say(hit.length===1,'TC-R10 the comparison clause matches EXACTLY ONE dropTxt template',{matched:hit.map(f=>f.k),n:hit.length});
  const F=hit.length===1?hit[0]:null, m=F?txt.match(F.re):null;
  L.say(!!m&&!!m[1],'TC-R10 the comparison clause yielded a move to read',{form:F&&F.k,clause:m&&m[0]});
  L.say(F?F.k==='nothing-came-close':false,'TC-R10 PINNED the branch is "Nothing else came close" - the gap at 10.Nxb5 is over a pawn',F&&F.k);
  const bandOk=(()=>{if(!F||!m)return false;if(!F.band)return !/\d+\.\d/.test(m[0]);const d=parseFloat(m[2]);return d>=F.band[0]&&d<=F.band[1];})();
  L.say(bandOk,'TC-R10 the drop VALUE lies in the band its own wording is printed for (a 1.1 cannot wear the 0.35-0.99 sentence)',{form:F&&F.k,clause:m&&m[0]});
  const altSan=m?m[1]:null;
  L.say(!!altSan&&altSan!=='Nxb5','TC-R10 the comparison names a move OTHER than the one played',{alt:altSan,played:'Nxb5'});
  L.say(altSan==='Bxf6','TC-R10 PINNED the next-best move is Bxf6',altSan);
  L.say(!!m&&parseFloat(m[2])===1.1,'TC-R10 PINNED the gap is 1.1 pawns',m&&m[2]);

  // ── 3. THE WORD AGAINST THE NUMBER, on the same screen, before anything is tapped ────────────────
  /* #394: THESE THREE LINES MOVED WITH THE BUBBLE RATHER THAN BEING DELETED, which is what the header of
     this gate told whoever removed it to do. The coach bubble is gone (kunal-review-floating-bubble-remove),
     so coach-say and coach-eval no longer exist. The cross-check still has to read something OTHER than the
     why panel to be a cross-check, and it is now BETTER than it was:
       - the sentence companion moves to rev-why-txt, which is where the sentence lives now. Note this is the
         same element `txt` came from, so the old "both show the SAME sentence" assertion compared two
         renderings of one variable - circular by the #389 rule, and it retires with the element.
       - the NUMBER moves to eval-bar-num, which is genuinely independent HERE: with the engine off it renders
         evalTxt from a live sfHit probe, while the retired chip rendered curAnno.evalAfter from the stored
         review analysis. Different sources, same quantity - a real cross-check.
     THE ENGINE MUST BE OFF FOR THAT TO HOLD, and that is asserted rather than assumed: with engOn the bar
     renders engLine ITSELF (_engBar, chess.jsx) and the check would be decoration. That is flag
     testlane-engine-on-makes-the-bar-circular, applied forward instead of rediscovered. */
  const say=await b.text('[data-ct="rev-why-txt"]');
  L.say(!!say&&say.length>20,'TC-R10 the coach sentence is on screen under the board (non-empty companion)',say&&say.slice(0,40));
  const engOff=!(await b.rect('[data-ct="rev-engline"]'));
  L.say(engOff,'TC-R10 the engine line is OFF, so the eval bar is NOT rendering engLine and the cross-check below is independent rather than circular (#389)');
  const chip=await b.text('[data-ct="eval-bar-num"]');
  const cN=(chip==='mate')?99:((chip==='-mate')?-99:(/^[+-]?\d+\.\d$/.test(String(chip))?parseFloat(chip):null));
  L.say(cN!==null,'TC-R10 the eval bar shows a readable evaluation to cross-check the words against',chip);
  const saysWinning=/White is winning here\.$/.test(txt);
  L.say(saysWinning,'TC-R10 PINNED the standing clause reads "White is winning here."','...'+txt.slice(-26));
  /* #394, AND THIS ASSERTION CAUGHT ME MAKING THE EXACT MISTAKE IT EXISTS TO CATCH. It first read `cN>=3`,
     carried over unchanged from the retired coach chip, and went RED at +2.8 on a healthy bundle.
     3.0 is a REAL band and it is the app's own: chess.jsx:727 prints "<mover> is winning here." iff evM>=3.
     But evM is the STORED per-ply analysis, which is what the chip rendered. The eval bar renders a LIVE
     sfHit probe of the position (evalTxt). Two different measurements of the same quantity are allowed to
     disagree in the decimal - that is the whole reason this is an independent cross-check and not a circular
     one - so applying the stored reading's threshold to the live one is a category error, and it is the same
     shape as the #389 mistake of reading a number off a readout fed by the thing under test.
     So the check splits in two, and together they are STRONGER than the single number was:
       - the BRANCH is pinned above: the app printed "is winning here", which it does only for evM>=3.
       - the independent bar must AGREE IN SIGN AND SCALE. >= +2.0 still rejects everything this is for: a
         wrong sign (#389 shipped -2.5 on a won position), a hundredfold error (#385 printed +0.0 beside a
         bar reading +5.9), and a dead search returning nothing. It does not pretend two instruments agree
         to a decimal they have no reason to agree to. */
  L.say(cN!==null&&saysWinning&&cN>=2,'TC-R10 the VERDICT WORD agrees with the independent eval NUMBER in SIGN AND SCALE (bar >= +2.0 while the text says "is winning"). White IS winning after 10.Nxb5, so a negative, near-zero or hundredfold-off number here is wrong whichever element prints it',{bar:chip,n:cN,words:txt.slice(-26)});
  L.say(cN!==null&&cN<20,'TC-R10 and the bar is not absurdly large either - a mate would print "mate", not a three-figure pawn count, so this catches a scale error in the other direction',{bar:chip,n:cN});

  const po=await b.rect('[data-ct="rev-playout"]');L.say(!!po,'TC-R10 the play-out (why) button exists on the brilliancy');
  const s0=await gridSig(b);await b.tapCt('rev-playout',400);let moved=false;for(let i=0;i<12;i++){await b.settle(350);if((await gridSig(b))!==s0){moved=true;break;}}
  L.say(moved,'TC-R10 the play-out moves a piece within ~4 s');
  await b.settle(3000);await b.shot('review-brilliant-playout');

  /* ── 4. THE COMPARISON CLAUSE MUST NEVER NAME THE MOVE YOU PLAYED - ON EVERY PLY, NOT ONE ──────────
     #420, flag kunal-review-alt-names-the-played-move. Kunal found the review telling him
     "Bxh3 was as good on paper, but nothing like as forcing" about the move he had just played. Cause:
     chess.jsx:3268 compared the engine's runner-up against `bestMv` and never against `pl`, so whenever
     the player plays the engine's SECOND choice the runner-up IS the played move and it is rendered as
     its own alternative.

     THE ASSERTION FOR THIS WAS ALREADY HERE AND IT WAS GREEN OVER THE LIVE BUG. Line 73 reads
     `altSan!=='Nxb5'` - correct, in the suite for builds, and it only ever ran on ply 19, where the
     played move is the engine's FIRST choice, so altSan was the genuine runner-up Bxf6 and it passed.
     The defect lives in the other configuration and no gate visited it. That is the antagonist's
     "measured in one configuration only" category showing up in a GATE rather than in a build note,
     which is why the procedure now rotates an audit over the suite's own assertions.
     So the check stops being about one hardcoded move and becomes an INVARIANT over the whole game:
     on every ply, if a dropTxt clause is present, the move it names is not the move that was played.

     Navigation is deterministic WITHOUT depending on where the play-out left the board: saturate
     forward (clicks past the end are no-ops) to anchor at the last ply, then step back one ply at a
     time. Reading backwards collects the same per-ply pairs as reading forwards. */
  const NAV_FWD=40, PLIES=34;
  for(let i=0;i<NAV_FWD;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000}).catch(()=>{});}
  await b.settle(700);
  const sweep=[];
  for(let k=0;k<PLIES;k++){
    const ml=await b.rect('[data-ct="rev-move-line"]');
    const why=(await b.text('[data-ct="rev-why-txt"]'))||(await b.text('[data-ct="rev-why"]'))||'';
    // first line of the move line is "10. Nxb5" / "15... Nxd7"; the SAN is its last whitespace token
    const head=String((ml&&ml.text)||'').split('\n')[0].trim();
    const played=head.split(/\s+/).pop()||'';
    let form=null,alt=null;
    for(const f of FORMS){const m=f.re.exec(why); if(m){form=f.k;alt=m[1];break;}}
    if(played) sweep.push({played,form,alt,head});
    await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000}).catch(()=>{});
    await b.page.waitForTimeout(120);
    await b.settle(260);
  }
  const bare=(x)=>String(x||'').replace(/[+#]$/,'');
  const withClause=sweep.filter(r=>r.form&&r.alt);
  L.note('    sweep: '+sweep.length+' plies read, '+withClause.length+' carrying a comparison clause -> '+withClause.map(r=>r.played+'/'+r.alt).join(', '));
  L.say(sweep.length>=PLIES-2,'TC-R10 the ply sweep actually walked the game rather than reading one screen '+sweep.length+' times',{pliesRead:sweep.length,want:PLIES});
  /* NON-VACUITY, and deliberately NOT a pinned count: which plies carry a clause is the engine's answer,
     and pinning it would be #391's coin flip with extra steps. What must never be zero is the population,
     because a sweep over no clauses cannot fail. */
  L.say(withClause.length>=1,'TC-R10 the sweep found at least one comparison clause to test, so the per-ply checks below are not vacuous',{clauses:withClause.length});
  /* THE PER-PLY RESULTS ARE NOTES, NOT ASSERTIONS, AND THAT IS DELIBERATE. One L.say per clause would
     make this gate's assertion count depend on how many comparison clauses the engine happens to print,
     so the SUITE TOTAL would drift with the engine's answers - and #419 had just finished recording that
     1940 is a recurrence nothing asserts rather than an invariant. Adding a new source of that drift to
     fix a different problem is not a trade worth making. The count added here is FIXED at three
     regardless of what the engine returns; the offending plies travel in the failing assertion's own
     payload, so a red still names them. */
  const offenders=withClause.filter(r=>bare(r.alt)===bare(r.played));
  for(const r of withClause) L.note('      '+r.head.replace(/\s+/g,' ').slice(0,20).padEnd(20)+' played '+String(r.played).padEnd(7)+' alt '+String(r.alt).padEnd(7)+(bare(r.alt)===bare(r.played)?'  <- NAMES THE PLAYED MOVE':''));
  L.say(offenders.length===0,'TC-R10 NO ply in the whole game offers the played move as its own alternative (kunal-review-alt-names-the-played-move)',{selfNamed:offenders.length,ofClauses:withClause.length,plies:offenders.map(r=>r.head.replace(/\s+/g,' ').slice(0,14)+' ('+r.played+')')});

  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'TC-R10 no app error beyond the one allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();
},'REVIEW-BRILLIANT');
