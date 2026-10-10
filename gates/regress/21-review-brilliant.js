// regress/21-review-brilliant.js  TC-R10 (US-R06): a brilliancy is explained by what the sacrifice buys, and the
// play-out button animates the line. Port of bril357gate's live half + why354. Opera Game, 10.Nxb5!! (ply 19).
// The sentence must name the follow-up (a forcing move such as Bxb5+ / "If cxb5"); the play-out must move a piece.
// #356: one engine trap is allowed BY EXACT TEXT ("RuntimeError: unreachable") and nothing else.
// GEOMETRIES, added 2026-10-04 (process-build lane 1, jobs/gate-20-and-gate-21-never-visit-kunals-actual-
// geometry-2026-10-01): TWO columns. 375x679, which is this gate's whole history and is NOT Kunal's phone -
// it is the shorter-phone column, kept because every text pin below was measured there (#387) - and 375x761
// with ct_safe 51,31, which is the geometry R19 settled on 2026-10-03 as his, superseding the 375x730 this
// job's own text asks for. The 761 column is block 5 at the foot of the file and it deliberately does NOT
// re-run the text assertions; block 5's header counts why. Before this change the gate ran at 375x679 only.
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
/* ── #504 BLOCK S SUPPORT. jobs/the-brilliant-sentence-prices-the-move-instead-of-explaining-it-2026-10-04,
   part (b), from KUNAL on 2026-10-04: "the why preview stops short before actually taking the knight".
   WHAT BLOCK S IS FOR, AND WHY A DRIVEN BLOCK ALONE WOULD NOT DO. The displayed line is built from
   whatever principal variation the engine happens to return, and CLAUDE.md's #391 rule is explicit about
   that shape: "when an assertion parses something an engine wrote, enumerate what the engine can legally
   produce and unit-test the predicate against that list, including the cases it must REJECT." Gate 22
   shipped a variation test that went green twice on a coin flip and reddened a healthy build four builds
   later because nobody had done that. So the trim rule is tested here over ELEVEN enumerated pv inputs at
   one real position, and the plumbing is tested in block N against the bundle.
   HOW IT READS THE CODE, and the caveat is the same one gate 68 states loudly: IT MEASURES chess.jsx, NOT
   THE BUNDLE NAMED BY CT_APP, because gates/build.sh minifies and the names are mangled. So block S's
   negative control is CT_SRC and block N's is CT_APP, and neither substitutes for the other.
   AND IT FAILS SOFT ON ABSENCE RATHER THAN THROWING. engine-extract's need() throws when a name is
   missing, which would take this whole gate down against a pre-#504 chess.jsx and hide the 90-odd
   assertions after it - the #393 trap. So S0 goes RED on its own assertion and blocks S and N carry on. */
const SAC_SRC=(()=>{
  const fs=require('fs'),path=require('path'),crypto=require('crypto');
  const file=process.env.CT_SRC||path.join(__dirname,'..','..','chess.jsx');
  let src='';try{src=fs.readFileSync(file,'utf8');}catch(e){return {err:String(e.message),file,missing:['<unreadable>']};}
  const md5=crypto.createHash('md5').update(src).digest('hex').slice(0,12);
  const lines=src.split('\n'),starts=[];
  for(let i=0;i<lines.length;i++) if(/^(function|const|let|var)\s/.test(lines[i])) starts.push(i);
  const blocks=new Map();
  for(let i=0;i<starts.length;i++){
    const a=starts[i],z=(i+1<starts.length?starts[i+1]:lines.length);
    const m=/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
    if(m&&!blocks.has(m[1])) blocks.set(m[1],lines.slice(a,z).join('\n'));
  }
  const want=['SAC_LINE_MAX','sacLine','refuteTxt','sacKeep','uciToMove','dropTxt','moveMotifs','explainAnno'];
  const missing=want.filter(n=>!blocks.has(n));
  if(missing.length) return {missing,md5,file};
  try{
    const E=require('../engine-extract');
    const code=want.map(n=>blocks.get(n)).join('\n')+'\nreturn {SAC_LINE_MAX:SAC_LINE_MAX,sacLine:sacLine,refuteTxt:refuteTxt,sacKeep:sacKeep,explainAnno:explainAnno};';
    const api=new Function('FILES','getLegal','applyMove','toSAN','makeMove',code)(E.FILES,E.getLegal,E.applyMove,E.toSAN,E.makeMove);
    return Object.assign({missing:[],md5,file,E},api);
  }catch(e){return {missing:['<eval: '+e.message+'>'],md5,file};}
})();
/* The position the #504 probe measured, derived rather than typed: the Opera fixture's ply 25 is 13.Rxd7,
   sacTaker takes the CHEAPEST capture of d7 (Nxd7, a knight before the rook and the queen), and this is
   the FEN after it. The engine's pv from here is Bxe7 Bxe7 Bxd7+ - White wins the queen and recovers the
   bishop - which is exactly the "the piece comes back" shape Kunal's report is about. */
/* #504 THE ID LIST, DEFINED ONCE AND READ BY BOTH BRANCHES. The fallback and the happy path reported
   DIFFERENT TOTALS in the first version of this block (16 against 15) because the fallback was a
   numeric loop that started at the wrong index and silently dropped S1 - the non-vacuity assertion
   [#504 antagonist A, upheld]. A loop over a literal range cannot stay in step with a hand-written
   list of ids; one list that both branches read can. */
/* ── NEGATIVE CONTROLS, RECORDED HERE BESIDE THE ASSERTIONS THEY PROVE, PER #401's RULE ───────────────
   *** THIS REGISTER DESCRIBED THE PRE-VETO FILE AND IS REWRITTEN HERE. SELF-CAUGHT, AFTER COMMIT. ***
   The version committed at 8704fa2 opened "this gate is 76 assertions, the shipping bundle is
   f6770938d081 over source b1eddfc83e32" and published THREE control rows summing to 76. Every one of
   those figures was true of the file the two antagonists read and NONE of them is true of the file that
   ships: the veto fixes took the gate to 88 assertions over 30 S-ids and added three more controls. Worse,
   its closing paragraph described the store condition as `r.ok -> sanLine.length`, which is EXACTLY the
   change both antagonists vetoed - so the register documented the vetoed design as shipped, in a file
   whose own text warns against "#508's V1/V2 defect, a file describing its previous version". I found it
   by reading the file to re-derive figures for the close-out, after the commit and after the suite had
   launched. It was never going to be caught by a count: it is a COMMENT, so no assertion reads it, the
   totals it misstates are its own, and `verify-log.sh` has no view of it.
   WHY IT WAS NOT FIXED THE MOMENT IT WAS FOUND, which matters more than the error: the full suite was
   mid-run and this is a suite-read file. Editing it would have made the gated log describe a file that no
   longer existed [#461, where two mid-run edits cost a complete 48-section green its footer]. So it was
   held until the suite finished and applied as a COMMENT-ONLY change, proved comment-only mechanically
   rather than asserted - see the close-out record for the stripped-source hash on both sides.

   *** EVERY FIGURE #504 PUBLISHED HERE IS WITHDRAWN AND RE-DERIVED [R18]. *** Not because any of it was
   wrong when written - it was measured and honest - but because all of it is a fact about a bundle built on
   a sacRun THAT NO LONGER EXISTS. #511 rewrote that function (the yield to the analysis worker, the
   per-attempt token, the ownership re-validation) and #512 grafted part (b) onto #511's version rather than
   replaying #504's, so the file under test, the bundle, the total and the id list have all moved.

   THE TOTAL IS 88 AND ITS WHOLE HISTORY IS DECLARED, because #510 measured that a deleted assertion inside
   a gate is invisible in a green run and that the ONLY tell is the total. 42 on main -> 81 at #504 -> 76
   here when S17 to S21 went (they unit-tested sacStore, which this build deliberately does not ship; the
   reason is at SAC_S_IDS) -> 88 after the veto fixes added S25 to S33, N3b, N3c and N3d. A reader comparing
   trees therefore sees -5 and then +12, and is owed both explanations rather than left to assume.

   FOUR GENERATIONS OF THIS FILE EXIST AND EVERY ROW BELOW NAMES THE ONE IT WAS MEASURED ON [#510: a figure
   taken on a different file is not a figure for this one]. `c` = 85 assertions, the graft's first full gate.
   `f` = 86, S32's input rebuilt. `g` = 88, N3c and N3d added. `h` = 88, the dead third sample moved to its
   own arm - THE FILE THAT SHIPS. Promoting an `f` figure to an `h` row would be the frozen-denominator
   defect [#405] committed inside a register, so the generation is part of the citation.

     SHIPPING  gen h, bundle a33b9f8c6931 over source 98e60c9b98ca     88 pass /  0 FAIL
          R36: THREE runs, 88/0 each, IDENTICAL VERDICT on all 88 assertions. The logs are NOT
          byte-identical and the narrow claim is the true one: det1 and det3 hash ccb10c436f2abd9ffdff6703
          9a690d16, det2 differs in FIVE payloads (N2, N3, N3b, N4, N5) with `samples` [1,3,3] against
          [3,3,3] twice, because that run's ply-25 sample came back one ply. The known ply-25 variance fired
          INSIDE the determinism set and every verdict held over it, which is what N3c exists to do.
     NC1  gen g. CT_SRC + CT_APP = origin/main's OWN source and bundle
          (b6b7fbb25df0 / f47aa0197967)                                55 pass / 33 FAIL
          THE IDEAL CONTROL AND IT IS FREE [#432]: not something built to fail, but the bundle a player is
          running right now. Both doors driven at once deliberately, so the row measures the whole feature.
          The 33 reds are the S-series reporting `NOT RUN: chess.jsx declares no refutation-line machinery`,
          plus S0, N3 and N10. N2 still PASSES there, so N3's red is about the LENGTH of the line and not
          the absence of the clause - the discrimination those two assertions exist to make.
          AND ITS FIRST RUN WAS AN INSTRUMENT FAILURE THAT READ LIKE A CATASTROPHIC BUNDLE: 0 pass / 32 FAIL
          with a `harness threw`, because CT_APP was given as `<(git show origin/main:app.js)` and the
          process substitution's /dev/fd path is gone before the browser opens. Re-run from real files on
          disk. Published because 0/32 and 55/33 are the same control and only one of them is a measurement.
     NC2  gen f. CT_SRC = this tree with the PARITY TERM alone removed,
          source md5 0a1ff8f02a4a                                      82 pass /  4 FAIL   S6, S23, S23b, S24
          THE SOURCE MD5 IS PUBLISHED BECAUSE A COUNT WITHOUT ITS INPUT CANNOT BE RE-DERIVED [#411/#412, and
          antagonist A's F4]. NOTE THE HASH CHANGED WITH THE GENERATION: the pre-veto NC2 cut was
          2027fb7a8b98 and A re-derived that one independently; 0a1ff8f02a4a is the same control re-cut
          against the post-veto tree, and quoting the old hash beside a new count would make the row
          uncheckable. Its S23b payload prints the defect verbatim - "If Qxf7+, Kxf7 Rf1+ and Black is
          winning." - which is WHITE checking Kunal's own king in his own game, the exact inverse of the
          report this build answers.
     NC3  gen h. CT_APP = a bundle with sfEval1 RESTORED in sacRun,
          everything else identical                                    87 pass /  1 FAIL   N3c
          THE ONE-VARIABLE CONTROL FOR THE MECHANISM, and the sharpest row here. sacLine, refuteTxt and the
          explainAnno wiring are all PRESENT and correct in that bundle's source, so the whole S block stays
          GREEN - and the screen still shows the one-ply line, because sfEval1 keeps only a bestmove. It
          isolates the claim that the SWAP, not the new module functions, puts the recovery on screen.
          Without this row NC1 could not tell the two apart.
          AND THIS ROW WAS DESTROYED ONCE AND RESTORED, WHICH IS THE REASON N3c IS A MAXIMUM AND NOT A PIN:
          ply 25's pv is not stable (measured 6 of 8 runs three-ply, 2 of 8 one-ply), and the obvious repair
          - widen N3 and N10 to admit either shape - made this row score 86 / 0. An assertion loose enough
          to pass whatever the engine returns is loose enough to pass with the feature removed, which is
          antagonist A's #511 veto ground re-created by my own fix one build later.
     NC4  gen f. CT_SRC = the explainAnno BRILLIANT branch reverted,
          source md5 101d571ad636                                      85 pass /  1 FAIL   S26
          Closes antagonist A's F2: that branch had NO control anywhere, and A measured 76 pass / 0 fail
          with the hunk reverted, because the Opera fixture's only Brilliant clause is ONE ply and the two
          sentence templates are byte-identical at length 1.
     NC5  gen f. CT_SRC = sacKeep ignoring its `ok` argument,
          source md5 c203a23d5be7                                      85 pass /  1 FAIL   S30
          THE VETO CASE FOR THE ONE FINDING BOTH DOORS REACHED INDEPENDENTLY. sfBestLine's stuck-worker path
          resolves whatever partial pv has arrived, so a NON-EMPTY line can come out of a search that never
          answered; keying the store on the line being non-empty would cache it for the session. Strictly
          worse than the defect #511 cured, because gate 22 can see a poisoned EMPTY record and cannot see a
          plausible partial one.
     NC6  gen f. CT_SRC = the PER-PLY forcing rule reverted,
          source md5 988f1c7bdba1                                      85 pass /  1 FAIL   S32
          Closes antagonist B's F2. AND ITS FIRST VERSION SCORED 85 / 0 - a control that proved nothing,
          because the pv handed to S32 had an ILLEGAL third ply, so both bundles truncated it for an
          unrelated reason and the thing under test was never reached. S32's input was rebuilt by
          ENUMERATING 49 legal triples from the real position. A control over a vacuous input is a green you
          cannot spend.

   WHAT THE SIX ROWS PROVE BETWEEN THEM, said once so the set is not read as repetition: NC1 that the
   feature is absent on main; NC2 that the parity term is load-bearing rather than decorative; NC3 that the
   engine-call swap is the mechanism and the module functions alone are not sufficient; NC4 that the
   rendering branch is reached; NC5 that the store refuses a dead search's partial line; NC6 that no quiet
   ply can sit inside the line. The sentence each one prints at Opera ply 25 is the whole story:
        main / NC1   "The only move that keeps it. If Nxd7, Bxe7 and White is winning. Chases the queen off
                      e7 and takes the open d file. It forks two pieces at once."
        NC3          "The only move that keeps it. If Nxd7, Bxe7 and White is winning. ..."
        SHIPPING     "The only move that keeps it. If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning. Chases the
                      queen off e7 and takes the open d file."
   READ THE THIRD CLAUSE OF THE FIRST ROW AND THE ABSENCE OF IT IN THE THIRD: pack() is a greedy 150-char
   budget in portrait, so the longer line pushes "It forks two pieces at once." OUT - 126 characters against
   main's 144. That is a real trade, it is Kunal's to reverse in one word, and N10 pins the whole string so
   it can never move silently again.

   WHAT IS NOT CONTROLLED HERE, AND IT IS NOT A HOLE THIS RUN LEFT: the poisoned-cache / token half of
   sacRun is #511's and is controlled by gates/regress/22-engline-recovery.js block R over FOUR bundles each
   one hunk-group from the next. This gate does not duplicate it. **WHAT #512 CHANGED IS THE STORE
   CONDITION, AND THE PRE-VETO TEXT HERE NAMED THE VETOED VERSION:** it is `sacKeep(ok,line)`, NOT
   `sanLine.length`, and NOT #511's bare `r.ok` - the return type changed from an object to an
   array-or-null, so the success signal had to become explicit (an additive fourth parameter `onDone(ok)` on
   sfBestLine, whose resolved value is unchanged for its two other callers) rather than inferred from the
   line's length. S28 to S31 assert sacKeep directly and NC5 is its control, so that claim is measured HERE
   while the cache/token machinery stays measured where its own control already is, and gate 22 is run
   beside this one rather than restated.

   CT_SRC AND CT_APP CONTROLS ARE NOT INTERCHANGEABLE, and that is a property of the gate rather than an
   omission: block S reads chess.jsx and block N reads the MINIFIED bundle, so CT_APP cannot redden S and
   CT_SRC cannot redden N. Gate 68 states the same caveat about itself and for the same reason.
   WHICH ROW IS WHICH [antagonist A's F4, upheld, and RE-STATED AGAIN because A's correction was itself
   written against a three-row tree]: NC1 drives BOTH doors at once (CT_SRC and CT_APP together, main's own
   source and bundle); NC3 is CT_APP only; NC2, NC4, NC5 and NC6 are CT_SRC only. A's veto was that the
   sentence here read "NC1 and NC5 are the bundle-level half; NC2 to NC4 the source half" - #504's mapping,
   wrong twice over about that tree. The fix it received named three rows, and there are now six, which is
   why this sentence is written as a rule about each row rather than as a range.
   WHY SIX AND NOT ONE: no single control can separate the six claims above, and NC3 exists precisely
   because NC1 cannot tell the second from the third. */
/* #512 S17 TO S21 ARE REMOVED, AND THIS IS THE ONE PLACE A READER WILL LOOK TO ASK WHY A PUBLISHED
   ASSERTION SET SHRANK. They unit-tested #504's sacStore() - a pure module-level store decision with a
   `mark` identity and a SAC_DEAD_TRIES bound - and #512 DELIBERATELY DOES NOT SHIP sacStore. #511 landed a
   different and simpler guard for the same concern (a per-attempt token on the marker and on the request,
   plus an ownership re-validation and a bounded yield, all inside sacRun), and carrying both would be two
   mechanisms for one concern, which is the contradiction R45 forbids. An assertion must test what SHIPS:
   five assertions over a function that is not in the bundle would be the #432 trap exactly - a check that
   reads only what its own build added, passing over a defect it cannot see.
   THE CONCERN IS NOT LEFT UNCONTROLLED, WHICH IS THE ONLY THING THAT WOULD MAKE THIS A LOSS. #511 shipped
   gates/regress/22-engline-recovery.js block R for it - 8 assertions over FOUR bundles each one hunk-group
   from the next, with main's own bundle as the negative control reddening R4 and R5 - so the poisoned-cache
   path is measured, by a control set this run did not have to build. What is genuinely lost is the
   SAC_DEAD_TRIES retry bound, which #511's guard does not have an equivalent of: it deletes and re-queries
   on the next visit instead of counting attempts. That is a real difference, it is a deliberate choice of
   #511's mechanism over #504's, and it is named on the job rather than hidden here.
   SO THE TOTAL FALLS 26 -> 21 BY DESIGN AND THE DROP IS DECLARED. gates.sh:9 and :304 both say a gate's
   total must only rise, and #510's own pointer 1 records that a deleted assertion is invisible in a green
   run and that the ONLY tell is the total. This is that tell, fired on purpose, with the reason beside it. */
const SAC_S_IDS=['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14','S15',
                 'S16a','S16b','S22','S23','S23b','S24',
                 /* #512 veto fixes, both doors. S25-S27 close antagonist A's F2 (the explainAnno
                    BRILLIANT branch had NO control anywhere - A measured 76 pass / 0 fail with that
                    hunk reverted, because the Opera fixture's only Brilliant clause is ONE ply and the
                    two templates are byte-identical at length 1). S28-S31 close the COMMON finding both
                    antagonists reached independently: the store decision accepted a dead search's
                    partial line. S32-S33 close antagonist B's F2 (an intermediate QUIET ply could sit
                    inside the line). */
                 'S25','S26','S27','S28','S29','S30','S31','S32','S33'];
/* #512: N3b is new - the per-ply forcing invariant at the bundle level. It is in block N, not SAC_S_IDS. */
const SAC_FEN25='3rkb1r/p2nqppp/8/1B2p1B1/4P3/1Q6/PPP2PPP/2K4R w k - 0 1';
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
L.run(async()=>{
  /* ── #504 BLOCK S. THE TRIM RULE, OVER ENUMERATED ENGINE OUTPUT ─────────────────────────────────── */
  L.note('    #504 block S reads chess.jsx '+SAC_SRC.file+' md5 '+(SAC_SRC.md5||'?')+'  (NOT the CT_APP bundle - see the header)');
  L.say(SAC_SRC.missing.length===0,'TC-R10/S0 #504 chess.jsx declares the refutation-line machinery at module level (SAC_LINE_MAX, sacLine, refuteTxt) so the sentence can be exercised without a browser',{missing:SAC_SRC.missing,src:SAC_SRC.md5});
  if(SAC_SRC.missing.length===0){
    const E=SAC_SRC.E, g25=E.fromFEN(SAC_FEN25), sl=SAC_SRC.sacLine, rt=SAC_SRC.refuteTxt;
    const F='abcdefgh', uci=(m)=>F[m.fc]+(8-m.fr)+F[m.tc]+(8-m.tr)+(m.promo?String(m.promo).toLowerCase():'');
    const sanOf=(g,m)=>E.toSAN(g,m,E.applyMove(g.board,m));
    const LINE=['g5e7','f8e7','b5d7'];
    /* NON-VACUITY FIRST, AND AS ITS OWN ASSERTION RATHER THAN A CONJUNCT [the eleventh-costume rule]:
       every S assertion below reads a list sacLine produced, and every one of them would pass loudest if
       the fixture position were wrong and the list were always empty. */
    L.say(!!g25&&g25.turn==='w','TC-R10/S1 #504 the fixture position parsed and it is White to move after Nxd7, so the pv below is a legal input rather than an empty set',{turn:g25&&g25.turn});
    const base=sl(g25,LINE);
    L.say(base.length===3&&base.join(' ')==='Bxe7 Bxe7 Bxd7+','TC-R10/S2 #504 the engine pv Bxe7/Bxe7/Bxd7+ renders as THREE plies of SAN - this is the line Kunal asked to see run one move further, and the recapture Bxd7+ is the ply that was being cut',{got:base});
    /* THE CAP. A fourth legal ply is computed rather than invented, so this is a real input and not a stub. */
    let g4=g25;for(const u of LINE)g4=E.makeMove(g4,E.getLegal(g4).find(m=>uci(m)===u));
    const nxt=E.getLegal(g4)[0], four=LINE.concat([uci(nxt)]);
    L.say(sl(g25,four).length===3,'TC-R10/S3 #504 a FOUR-ply pv is capped at SAC_LINE_MAX=3, which is pvShow own existing cap in the same function rather than a new number',{got:sl(g25,four),fourth:nxt?sanOf(g4,nxt):null});
    L.say(SAC_SRC.SAC_LINE_MAX===3,'TC-R10/S4 #504 SAC_LINE_MAX is 3',SAC_SRC.SAC_LINE_MAX);
    /* THE TRIM. A quiet third ply must be DROPPED, so the line never ends on a move that shows nothing. */
    const quiet3=E.getLegal(E.makeMove(E.makeMove(g25,E.getLegal(g25).find(m=>uci(m)===LINE[0])),E.getLegal(E.makeMove(g25,E.getLegal(g25).find(m=>uci(m)===LINE[0]))).find(m=>uci(m)===LINE[1]))).find(m=>!/[x+#]/.test(sanOf(E.makeMove(E.makeMove(g25,E.getLegal(g25).find(x=>uci(x)===LINE[0])),E.getLegal(E.makeMove(g25,E.getLegal(g25).find(x=>uci(x)===LINE[0]))).find(x=>uci(x)===LINE[1])),m)));
    const trimmed=quiet3?sl(g25,[LINE[0],LINE[1],uci(quiet3)]):null;
    L.say(!!quiet3,'TC-R10/S5 #504 a QUIET third ply exists in that position, so the trim assertion below has a real input and is not vacuous',quiet3?uci(quiet3):null);
    /* S6 EXPECTED LENGTH 2 UNTIL THE PARITY TERM LANDED, AND IT WENT RED ON MY OWN BUNDLE WHEN IT DID -
       which is the assertion doing its job on a stale expectation of mine rather than a defect. The chain
       is now three pops and worth spelling out because it is not obvious: length 3, index 2 is the mover's
       but QUIET -> pop; length 2, index 1 is the OPPONENT'S -> pop; length 1, index 0 is the mover's and
       forcing -> keep. So a quiet third ply does not leave a two-ply line, it collapses the line to the
       mover's first reply, which is exactly the pre-#504 output. The parity term makes the rule STRICTER,
       never looser, and this is the case that shows it. */
    L.say(!!trimmed&&trimmed.length===1&&trimmed[0]==='Bxe7','TC-R10/S6 #504 a pv whose third ply is QUIET collapses to the MOVER own first forcing reply - not to a two-ply line, because an even length would end on the opponent. The displayed line therefore never ends on a move that shows nothing AND never on a move that is not the player own',{got:trimmed});
    /* NEVER BELOW ONE. A single quiet ply is what shipped before #504 and must still render. */
    L.say(sl(g25,['b5a6']).join(' ')==='Ba6','TC-R10/S7 #504 a pv of ONE quiet ply is kept, not trimmed to nothing - this is the pre-#504 behaviour and the change can only ever ADD plies',{got:sl(g25,['b5a6'])});
    /* THE CASES IT MUST REJECT - #391: enumerate what the engine can legally produce, including failure. */
    L.say(sl(g25,[]).length===0&&sl(g25,null).length===0&&sl(g25,undefined).length===0,'TC-R10/S8 #504 an EMPTY or absent pv yields no line at all, which is what makes the dead-search guard in sacRun reachable',{empty:sl(g25,[]),nul:sl(g25,null)});
    L.say(sl(g25,['e2e4']).length===0,'TC-R10/S9 #504 a pv whose FIRST move is illegal in this position yields no line rather than a wrong one',{got:sl(g25,['e2e4'])});
    L.say(sl(g25,['g5e7','zzzz']).join(' ')==='Bxe7','TC-R10/S10 #504 a pv that goes illegal at its SECOND move stops at the first, rather than throwing or skipping ahead',{got:sl(g25,['g5e7','zzzz'])});
    /* refuteTxt, the ONE definition both the Brilliant and the Great branch now read. */
    L.say(rt(null)===''&&rt(undefined)===''&&rt({})==='','TC-R10/S11 #504 refuteTxt renders nothing from nothing, so an absent refutation cannot print a half sentence');
    L.say(rt({capSan:'Nxd7'})==='','TC-R10/S12 #504 refuteTxt renders nothing from a capture with no reply - the state sacRun stores while the search is still running');
    L.say(rt({capSan:'Nxd7',replySan:'Bxe7'})==='If Nxd7, Bxe7.','TC-R10/S13 #504 refuteTxt still renders the SINGLE-ply form from replySan alone, so a record stored by a pre-#504 bundle does not break',rt({capSan:'Nxd7',replySan:'Bxe7'}));
    L.say(rt({capSan:'Nxd7',replyLine:['Bxe7','Bxe7','Bxd7+'],verdict:'and White is winning'})==='If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning.','TC-R10/S14 #504 refuteTxt renders the multi-ply form with its verdict, byte for byte',rt({capSan:'Nxd7',replyLine:['Bxe7','Bxe7','Bxd7+'],verdict:'and White is winning'}));
    L.say(rt({capSan:'Nxd7',replyLine:[],replySan:'Bxe7'})==='If Nxd7, Bxe7.','TC-R10/S15 #504 an EMPTY replyLine falls back to replySan rather than printing "If Nxd7, ."',rt({capSan:'Nxd7',replyLine:[],replySan:'Bxe7'}));
    /* ── S16: THE LIMIT OF THE TRIM RULE, ASSERTED SO IT IS RECORDED RATHER THAN DISCOVERED ──────────
       #504 antagonist A measured, and I reproduced, that the first version of this build's comment and
       commit claimed the rule "ends on the recovery". IT DOES NOT. Trimming happens INSIDE the 3-ply
       window, so where the recovery sits at ply 4 - or at ply 3 behind a quiet ply 2 - the quiet tail is
       popped and the line falls back to ONE ply, byte-identical to pre-#504. The pv below is legal and
       enumerated, not invented: Bxe7 Rc8 Bd8 Rxc2+, where Rxc2+ IS the recovery and is never shown.
       This is a SAFE fallback and the "can only ever ADD" claim survives it (1 >= 1). It is asserted
       because an unasserted limit is the thing the next reader will not know, and because if anyone later
       raises the cap this assertion is what tells them what they changed. */
    const deepPv=['g5e7','d8c8','e7d8','c8c2'];
    let gd=g25, deepSan=[];
    for(const u of deepPv){const mv=E.getLegal(gd).find(m=>uci(m)===u); if(!mv)break; deepSan.push(sanOf(gd,mv)); gd=E.makeMove(gd,mv);}
    const deepOut=sl(g25,deepPv);
    L.say(deepSan.length===4&&/[x+#]/.test(deepSan[3]),'TC-R10/S16a #504 the deep-recovery input class EXISTS and is legal - a four-ply pv whose FORCING recovery is the fourth ply - so S16b below is a real reading and not a vacuous one',{pv:deepSan});
    L.say(deepOut.length===1&&deepOut[0]===deepSan[0],'TC-R10/S16b #504 THE RULE LOSES A RECOVERY THAT SITS AT PLY 4: the cap drops it, the trim then pops the two quiet plies, and the line falls back to the single pre-#504 ply. Asserted as the KNOWN LIMIT of the trim rule, not as a success - the comment that claimed the rule "ends on the recovery" was withdrawn on this measurement',{got:deepOut,fullPv:deepSan});
    /* ── S22 to S24: THE PARITY RULE, ON KUNAL'S OWN GAME, BECAUSE THIS IS WHERE THE SECOND VETO LANDED ──
       Antagonist B measured, and I reproduced, that the first trim rule tested only `x|+|#` - a property
       of the STRING, as true of the OPPONENT'S check as of the player's recapture. The position handed to
       sacLine is the one AFTER the opponent's capture, so the mover is to play and out[i] is the mover's
       exactly when i is EVEN; every EVEN-length line therefore ended on the opponent's move. On
       claude/agents/bench/pgn/184024052818.pgn ply 74 - 37...Rf7, Great, and Kunal2023 is BLACK, so this
       is his own game - the line read "If Qxf7+, Kxf7 Rf1+ and Black is winning", where Rf1+ is WHITE
       checking Kunal's king. The previous bundle already got that ply right at "Kxf7". That is the exact
       inverse of the feedback this build exists to answer, so the fix is the parity term and this is its
       control. The pv below is built from LEGAL MOVES of the real game, not invented. */
    const kPgn=require('path').join(__dirname,'..','..','claude','agents','bench','pgn','184024052818.pgn');
    let KG=null;
    try{
      const st=E.loadSANs(E.parsePGN(require('fs').readFileSync(kPgn,'utf8')));
      const ai=73, pos=st.positions[ai], pl=st.plies[ai], g1=E.makeMove(pos,pl.move);
      const caps=E.getLegal(g1).filter(m=>m.tr===pl.move.tr&&m.tc===pl.move.tc);
      caps.sort((a,b)=>(E.VAL[(g1.board[a.fr][a.fc]||{}).t]||0)-(E.VAL[(g1.board[b.fr][b.fc]||{}).t]||0));
      const cap=caps[0];
      KG={san:pl.san,capSan:sanOf(g1,cap),after:E.makeMove(g1,cap)};
      KG.pv=[];let gg=KG.after;
      for(const w of ['Kxf7','Rf1+']){const mv=E.getLegal(gg).find(m=>sanOf(gg,m)===w);if(!mv){KG.pv=null;break;}KG.pv.push(uci(mv));gg=E.makeMove(gg,mv);}
    }catch(e){KG={err:String(e.message)};}
    L.say(!!KG&&KG.san==='Rf7'&&KG.capSan==='Qxf7+'&&!!KG.pv&&KG.pv.length===2,'TC-R10/S22 #504 the veto fixture EXISTS and is the real game - ply 74 of Kunal own 184024052818 is 37...Rf7, its cheapest capture is Qxf7+, and the two-ply forcing continuation Kxf7/Rf1+ is legal from there. Without this S23 and S24 would read an empty list',KG&&{san:KG.san,cap:KG.capSan,pv:KG.pv,err:KG.err});
    const kOut=(KG&&KG.pv)?sl(KG.after,KG.pv):[];
    L.say(kOut.length===1&&kOut[0]==='Kxf7','TC-R10/S23 #504 THE VETO CASE: an EVEN-length forcing pv is trimmed back to the MOVER OWN last forcing ply, so Kunal ply 74 reads ["Kxf7"] and not ["Kxf7","Rf1+"]. Before the parity term this returned two plies and the sentence ended on WHITE checking his king while concluding "and Black is winning"',{got:kOut,fullPv:(KG&&KG.pv)||null});
    L.say(rt({capSan:'Qxf7+',replyLine:kOut,replySan:kOut[0],verdict:'and Black is winning'})==='If Qxf7+, Kxf7 and Black is winning.','TC-R10/S23b #504 and the rendered sentence for that ply is byte-identical to what the PREVIOUS bundle printed, so the parity fix removes the degradation rather than papering over it',rt({capSan:'Qxf7+',replyLine:kOut,replySan:kOut[0],verdict:'and Black is winning'}));
    /* THE INVARIANT, over every pv this gate has constructed, as ONE assertion with the population stated. */
    const parityIn=[[g25,LINE],[g25,four],[g25,['b5a6']],(quiet3?[g25,[LINE[0],LINE[1],uci(quiet3)]]:null),
                    [g25,deepPv],((KG&&KG.pv)?[KG.after,KG.pv]:null)].filter(Boolean);
    const parityOut=parityIn.map(([pos,pv])=>sl(pos,pv));
    const odd=parityOut.filter(o=>o.length>0&&o.length%2===1).length, nonEmpty=parityOut.filter(o=>o.length>0).length;
    L.say(nonEmpty>=5&&odd===nonEmpty,'TC-R10/S24 #504 EVERY non-empty line this gate constructs is ODD in length, which is the mechanical statement of "it ends on the mover own move" - out[0] is always the mover reply, so an odd length is necessary and sufficient. Asserted over the whole constructed population rather than one case, with the population size in the payload so it cannot pass over an empty set',{inputs:parityIn.length,nonEmpty:nonEmpty,odd:odd,lengths:parityOut.map(o=>o.length)});
    /* ── S25 to S27: THE BRILLIANT BRANCH OF explainAnno, WHICH HAD NO CONTROL ANYWHERE ───────────────
       #512 antagonist A, F2, veto upheld. A built the one-hunk-away bundle - the Brilliant branch alone
       reverted to main's inline single-ply template, with refuteTxt still defined and the Great branch
       still calling it - and scored this gate at 76 PASS / 0 FAIL, indistinguishable from the shipping
       bundle. The cause is structural and not an oversight anyone could see in the diff: the Opera
       fixture's ONLY Brilliant ply carrying a refutation clause is ply 19, its line is ONE ply on every
       bundle (N7 asserts exactly that), and for a one-element replyLine refuteTxt and the inline
       template emit byte-identical strings. Block S never called explainAnno at all, and nothing else
       in gates/ reads replyLine, refuteTxt or sacLine.
       WHY THAT MATTERED MORE THAN A COVERAGE GAP: Kunal's report is about a BRILLIANT - the build quotes
       him, "the move was brilliant BECAUSE the piece comes back" - and BOTH user-visible strings this
       build published as its headline evidence come from 13.Rxd7, which is a GREAT. So the branch the
       feature was asked for was the branch with zero coverage, and the evidence came from the other one.
       These three assertions render the real explainAnno, extracted from the real source, so the branch
       is now pinned without an engine or a browser. */
    const EA=SAC_SRC.explainAnno;
    L.say(typeof EA==='function','TC-R10/S25 #512 explainAnno is extractable from chess.jsx at module level, so the BRANCH WIRING can be asserted and not only the helper it calls - the denominator for S26 and S27',typeof EA);
    const annoB={cls:{label:'Brilliant'},gate:{given:3},altSan:'Bg6',altDrop:90,pv:[]};
    const brl3=EA(annoB,{refute:{capSan:'Nxd7',replySan:'Bxe7',replyLine:['Bxe7','Bxe7','Bxd7+'],verdict:'and White is winning'},maxw:400});
    const brl1=EA(annoB,{refute:{capSan:'Nxd7',replySan:'Bxe7',replyLine:['Bxe7'],verdict:'and White is winning'},maxw:400});
    L.say(typeof brl3==='string'&&brl3.indexOf('If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning.')>=0,'TC-R10/S26 #512 THE BRILLIANT BRANCH RENDERS THE MULTI-PLY LINE. This is the assertion antagonist A proved was missing: it reddens on a source whose Brilliant branch still carries main inline single-ply template, where the Great branch alone would keep this gate green',brl3);
    L.say(typeof brl1==='string'&&brl1.indexOf('If Nxd7, Bxe7 and White is winning.')>=0&&brl1.indexOf('Bxd7+')<0,'TC-R10/S27 #512 and the BRILLIANT branch still renders the SINGLE-ply form unchanged from what shipped before, so the change can only ever ADD the recovery on this branch too',brl1);
    /* ── S28 to S31: THE STORE DECISION, WHICH IS THE ONE FINDING BOTH ANTAGONISTS REACHED ────────────
       #512's first cut tested `sanLine.length` alone and published the reason as "sfBestLine resolves an
       ARRAY or NULL and all four failure paths resolve NULL". THAT IS FALSE: sfBestLine has SIX settle
       sites and the stuck-worker timeout resolves the PARTIAL pv. Antagonist A proved it by driving the
       verbatim source of sfBestLine against a stub worker that emits pv lines and never a bestmove -
       sfBestLine resolved ["g5e7","f8e7","b5d7"] after 5606ms where sfEval1 on the identical stub
       resolved ok:false with cp:260. Antagonist B proved the same thing from the screen, by capping the
       worker's pv depth: the fault-born sentence read "and White keeps a clear edge" from a depth-2
       score EIGHT WORDS BEFORE "White is winning here" - a sentence contradicting itself on one screen -
       and it was still there after the fault was lifted and the ply re-entered twice, while MAIN
       recovered the healthy sentence on every one of the same trials.
       AND IT WAS WORSE THAN A MISS: on main the poisoned entry had an EMPTY replySan, so no clause
       rendered and gate 22's R4/R5 could SEE it. #512's poisoned entry renders a clause, so R4/R5 PASS -
       the build had converted a detectable poisoning into an undetectable one and then cited gate 22 as
       the control for it. Both antagonists said so independently; B added that block R races the ABORT
       path, and abort still resolves null, so block R is green either way and cannot see this at all.
       THE FIX IS sfBestLine REPORTING WHETHER `best` FIRED, and the decision is sacKeep, which is pure
       and module-level SO THAT THESE FOUR ASSERTIONS CAN EXIST. B's own reachability measurement is why
       this is not theoretical: 16 of 58 analysis searches resolved with NO bestmove in ordinary use, and
       every one of them carried 26 to 36 pv info lines. */
    const KEEP=SAC_SRC.sacKeep;
    L.say(typeof KEEP==='function','TC-R10/S28 #512 the store decision is a pure module-level predicate, which is what makes the dead-search path assertable with no browser - the denominator for S29 to S31',typeof KEEP);
    L.say(KEEP(true,['Bxe7','Bxe7','Bxd7+'])===true,'TC-R10/S29 #512 a line from a search the engine ANSWERED is cached');
    L.say(KEEP(false,['Bxe7','Bxe7','Bxd7+'])===false,'TC-R10/S30 #512 THE VETO CASE, AND THE ONE FINDING BOTH DOORS FOUND: a NON-EMPTY line from a search that never delivered a bestmove is NOT cached. Before the fix this was stored, rendered a clause off a shallow pv and an untrustworthy partial score, and was never re-queried for the rest of the session - #389 and #392 by name, re-opened 28 minutes after #511 closed them on this same function',{ok:false,line:3,kept:KEEP(false,['Bxe7','Bxe7','Bxd7+'])});
    L.say(KEEP(true,[])===false&&KEEP(true,null)===false&&KEEP(false,[])===false,'TC-R10/S31 #512 and an answered search that yields no renderable line is not cached either, so the three refusing combinations are enumerated rather than one being assumed from another');
    /* ── S32 to S33: EVERY PLY PAST THE FIRST MUST BE FORCING ─────────────────────────────────────────
       #512 antagonist B, F2, veto upheld. The first trim loop tested only the LAST surviving ply, so an
       intermediate QUIET ply could sit inside the line if the ply after it was a capture. B measured two
       on real games, both SHIP-only where main printed one ply: 174540842570 ply 74 read
       "If exf6+, Kxf6 f5 gxf5" with f5 being White's quiet pawn push presented as what the opponent
       plays, and 174386847848 ply 31 read "If Bxe5, h3 Bc6 Bxc6" where neither h3 nor Bc6 is forcing.
       THE STANDARD WAS ALREADY IN THE FILE: explainAnno's pvForcing is `_pv.every(...)` and its comment
       says a continuation "is only an EXPLANATION when it is forcing ... EVERY move in it is a capture,
       a check or mate". So this was a contradiction with the app's own rule, not a judgement call. */
    /* THE INPUT HERE IS DISCRIMINATING AND MY FIRST ONE WAS NOT [#512, self-caught by my own control].
       S32 first used ['g5e7','b5a6','e7d8'], and control NC6 - the per-ply forcing break removed - scored
       85 pass / 0 FAIL, i.e. S32 PASSED WITH THE FIX REVERTED. The reason is that e7d8 is not legal after
       b5a6, so the walk broke at ply 2 anyway and the parity trim then popped back to one ply: the
       assertion was satisfied by the OLD code for a reason unrelated to the rule it was written for. That
       is this project's own trap - an assertion that cannot fail - caught here only because the control
       was actually run and its reds read rather than its exit code glanced at.
       THE REPLACEMENT WAS DERIVED, NOT GUESSED: I enumerated every legal pv triple from this FEN whose
       first ply is forcing, second QUIET and third forcing - there are 49 - and took one. With the fix the
       line is ["Bxe7"]; with the break removed it is ["Bxe7","Rc8","Bxd7+"], where Rc8 is Black's quiet
       rook move sitting inside the line. That is B's measured defect shape reproduced on this fixture. */
    const quietMid=sl(g25,['g5e7','d8c8','b5d7']);
    L.say(quietMid.length===1,'TC-R10/S32 #512 a pv whose SECOND ply is QUIET truncates at the first, rather than reaching past it to a later capture - so the displayed line never contains a move the opponent has no reason to play. Measured by antagonist B on two real games before this assertion existed',{got:quietMid});
    const allForcing=sl(g25,['g5e7','f8e7','b5d7']);
    L.say(allForcing.length===3,'TC-R10/S33 #512 and a pv whose plies are ALL forcing still runs to three, so S32 narrows the rule rather than disabling it - without this pair the fix for B F2 could have been "show one ply always", which would have deleted the feature',{got:allForcing});
  } else {
    /* THE FALLBACK USED TO START AT S2 AND SILENTLY DROP S1 [#504 antagonist A, upheld]. S1 is the
       non-vacuity assertion - the denominator - so the one id the NOT-RUN report lost was the one whose
       own text says "a missing denominator is REPORTED, never credited", and the two branches reported
       different totals (16 against 15). It now emits every id in SAC_S_IDS, so S0 plus these is 22 either
       way - and it reads the list rather than a numeric range, so removing S17 to S21 moved both branches
       together and neither can drift from the other. */
    for(const id of SAC_S_IDS) L.say(false,'TC-R10/'+id+' #504 NOT RUN: chess.jsx declares no refutation-line machinery ('+SAC_SRC.missing.join(', ')+'), so neither the trim rule nor the store decision could be exercised. A missing denominator is REPORTED, never credited.');
  }
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

  /* ── #504 BLOCK N. THE REFUTATION LINE, DRIVEN ON THE BUNDLE UNDER TEST ───────────────────────────
     Block S above proves the trim RULE over enumerated pv inputs, reading chess.jsx. It cannot prove the
     PLUMBING - that sfBestLine's pv reaches sacRun, survives the store, and is rendered - because it never
     opens the bundle. And a block that only read chess.jsx would be #432's trap exactly: an assertion that
     can only see what the fix added. So N locates the clause by WHAT IT SAYS, not by any new data-ct, which
     is why N3 below reddens on the SHIPPED #503 bundle with no code of mine in it at all.
     MEASURED BEFORE THIS BLOCK WAS WRITTEN, over all 33 plies of this fixture on both bundles:
       ply 19  10.Nxb5  Brilliant  "If cxb5, Bxb5+ and White is winning"      1 ply on BOTH
       ply 25  13.Rxd7  Great      "If Nxd7, Bxe7 and White is winning"       1 ply on #503 (2fb1d7707780),
                                   and RE-MEASURED BY #512: still 1 ply on main's own current bundle
                                   f47aa0197967 (#511), so the defect is live today and not only at #503
                                   "If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning"  3 plies on #504
                                   (6b7dadfdccf6) and on #512 (f6770938d081), two independently built trees
       ply 31  16.Qb8+  Great      "If Nxb8, Rd8#"                            1 ply on BOTH
     THREE plies in this game carry a refutation clause and exactly ONE of them changes, which is the whole
     point of the trim rule: a line grows only where the pv has a forcing continuation, so 19 and 31 are
     byte-identical and the #387 pin at the top of this gate is untouched.

     IT RUNS IN ITS OWN BROWSER, AND THAT IS A MEASUREMENT AND NOT TIDINESS. The first version of this block
     reused `b` after the play-out and the 34-ply backward sweep, and ply 25 then printed NO refutation
     clause at all - "The only move that keeps it. Nxd7 follows." - because the analysis worker was no
     longer answering, so sfBestLine resolved null and the Great branch fell back to pvShow. On a fresh
     browser the identical ply prints the three-ply line, reproducibly, on two separate probe runs. So the
     clause is a function of the engine's availability as well as of the code, and a block that measures it
     after an hour of engine abuse is measuring the abuse. WHAT CAUGHT IT WAS N2, the non-vacuity assertion:
     without it N3 to N5 would have read an empty list and every `<=` and `every`-shaped check would have
     passed loudest exactly where the thing under test had vanished.
     THE SETTLE IS 1800ms, NOT THE SWEEP'S 260ms, DELIBERATELY. The clause arrives from a DEBOUNCED engine
     query - 450ms of rest and then a 700ms search - so the sweep above cannot see it at all and a short
     settle here would measure the sentence before the clause lands [#387]. */
  const parseRefute=(w)=>{const m=/If ([^,]+), ([^.]*)\./.exec(String(w||''));if(!m)return null;
    const mv=m[2].replace(/\s+and\s+(?:White|Black|it)\b.*$/,'').trim();
    return {cap:m[1],moves:mv?mv.split(/\s+/):[]};};
  const RV=require('../drive/review');
  const n=await L.launch({geo:'kunal730',name:'review-brilliant-504',store:{ct_pool:'3'}});await n.open();
  await RV.ensureReview(n,'opera');await RV.startReview(n);
  const readPly=async(ply)=>{
    await RV.goPly(n,ply);await n.settle(1800);
    const ml=await n.rect('[data-ct="rev-move-line"]');
    const why=(await n.text('[data-ct="rev-why-txt"]'))||(await n.text('[data-ct="rev-why"]'))||'';
    const box=await n.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]')||document.querySelector('[data-ct="rev-why"]');if(!e)return null;const cs=getComputedStyle(e);const cl=parseInt(cs.webkitLineClamp,10),lh=parseFloat(cs.lineHeight);return {sh:e.scrollHeight,ch:e.clientHeight,clamp:cl||null,lh:lh||null,cap:(cl&&lh)?Math.ceil(cl*lh):null};});
    L.note('    #504 ply'+ply+' '+String((ml&&ml.text)||'').split('\n')[0].trim()+'  ->  '+why.replace(/\s+/g,' '));
    return {head:String((ml&&ml.text)||'').split('\n')[0],why,box,r:parseRefute(why)};
  };
  const P19=await readPly(19), P25=await readPly(25), P31=await readPly(31);
  /* THE STATE FIRST, THEN THE PROPERTY [#385]: an assertion that says "the line is long here" is worthless
     if the walk never arrived at the ply it names. */
  L.say(/Rxd7/.test(P25.head),'TC-R10/N1 #504 the walk reached ply 25, 13.Rxd7 - the one ply of this fixture whose pv has a forcing continuation',P25.head);
  /* AND THE DENOMINATOR AS ITS OWN ASSERTION, never as a conjunct: every N check below reads P25.r.moves,
     and all of them would pass loudest over an empty list if the clause had vanished entirely. This is the
     assertion that caught the stale-engine reading described in the header. */
  L.say(!!P25.r&&P25.r.moves.length>0,'TC-R10/N2 #504 ply 25 actually PRINTS a refutation clause, so N3 to N5 have a real reading rather than an absent one',{clause:P25.r,why:P25.why.slice(0,90)});
  /* ── N3 AND N10 WERE FLAKY AND ARE RE-DESIGNED, WITH THE RATE MEASURED [#512, self-caught] ──────────
     MEASURED over EIGHT runs of the shipping bundle in one container: ply 25 printed the THREE-ply line
     in six and the ONE-ply line in two. Both are CORRECT outputs - the one-ply run is a successful search
     whose pv's second ply was quiet, which the per-ply forcing rule (B's F2 fix) then truncates - so the
     app has TWO legal sentences here and the engine chooses which. Before that fix ply 25 was stable at
     three plies in every run, so this build INTRODUCED the variance by making the rule stricter, which is
     the honest statement and is on the job.
     SO A BYTE-PIN ON ONE OF THEM IS A COIN FLIP WITH EXTRA STEPS [#391], AND A FLAKY ASSERTION IS WORSE
     THAN NO ASSERTION [#387]. The remedy is #388's own prescription, not a loosening: pin EVERY template
     the code can legally print, assert that EXACTLY ONE of them matched, and reject anything else. A
     bundle that printed a fourth string, or a line ending on the opponent, or a quiet intermediate ply,
     still reddens - and that is what the old pin was protecting.
     WHAT THIS GIVES UP, SAID PLAINLY RATHER THAN HIDDEN: the N block no longer asserts Kunal's own test
     ("the line runs one move further") AT THIS PLY, because the app does not meet it on every run. That
     claim is instead asserted DETERMINISTICALLY at source level by S2, S14 and S26, which render the
     three-ply line with no engine involved. The division is deliberate: block S proves the capability,
     block N proves the app never renders anything illegal. */
  const P25OK=['The only move that keeps it. If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning. Chases the queen off e7 and takes the open d file.',
               'The only move that keeps it. If Nxd7, Bxe7 and White is winning. Chases the queen off e7 and takes the open d file. It forks two pieces at once.'];
  const P25hit=P25OK.filter(t=>P25.why===t).length;
  /* #512: THE PLY COUNT DERIVED FROM THE RENDERED SENTENCE, so an arm that has only the text can still
     contribute a sample. Validated against all four sentence shapes this fixture produces (3-ply, 1-ply,
     the mate line and ply 19) before it was used - a predicate that parses what the app wrote is #391's
     coin flip unless you enumerate what the app can legally write. */
  const clausePlies=(t)=>{const m=/If [^,]+, (.+?)(?: and [A-Z]| and it is mate|\.\s|\.$)/.exec(t||'');return m?m[1].trim().split(/\s+/).length:0;};
  const P25SAMPLES=[P25.r?P25.r.moves.length:0];
  L.say(!!P25.r&&(P25.r.moves.length===1||P25.r.moves.length===3),'TC-R10/N3 #512 the refutation line at ply 25 is ONE or THREE plies - odd, never even, so it never ends on the opponent move - and which of the two the engine yields is recorded in the payload rather than pinned. Eight runs of the shipping bundle gave three plies six times and one ply twice',{moves:P25.r&&P25.r.moves,n:P25.r&&P25.r.moves.length});
  L.say(!!P25.r&&P25.r.moves.slice(1).every(m=>/[x+#]/.test(m)),'TC-R10/N3b #512 and EVERY ply the line adds past the first is forcing - a capture, a check or mate - which is the invariant B F2 established and which holds whichever branch the engine returns. Vacuously true at one ply BY DESIGN: N3 above pins the length separately, so the two cannot both be satisfied by an empty set',{added:P25.r&&P25.r.moves.slice(1)});
  L.say(!!P25.r&&P25.r.moves.length>0&&/[x+#]/.test(P25.r.moves[P25.r.moves.length-1]),'TC-R10/N4 #512 the displayed MULTI-PLY line ENDS on a forcing move - a capture, a check or mate. SCOPED TO MULTI-PLY DELIBERATELY [#512 antagonist B F3, upheld]: the sweeping form of this message used to read "so it never trails off on a quiet move that shows nothing", and that is FALSE OF BOTH BUNDLES - the trim loop guards on out.length>1 so it never inspects out[0], and B measured byte-identical single quiet replies on main and on this build ("If Qxa4, Rd8", "If Kxf1, Re8", "If Kxg3, Rh8"). A single-ply line is the engine best reply, quiet or not, exactly as it shipped before; requiring otherwise would DELETE a clause main shows. The claim is narrowed to what is true rather than left as a general property this gate measures at one ply of one fixture',{last:P25.r&&P25.r.moves[P25.r.moves.length-1],moves:P25.r&&P25.r.moves});
  L.say(!!P25.r&&P25.r.moves.length<=3,'TC-R10/N5 #504 and it is capped at three plies, so a long pv cannot push the clauses after it out of the character budget without bound',{n:P25.r&&P25.r.moves.length});
  /* THE BOX, AND THE PREDICATE IS #396's OWN AND NOT THE ONE I FIRST WROTE [#504 antagonist B, upheld].
     My first version asserted `scrollHeight <= clientHeight+1` and called that "nothing is silently
     clipped by the container". THAT IS THE WRONG INSTRUMENT. `scrollHeight > clientHeight` is the NORMAL
     reading whenever the -webkit-line-clamp fires, and a clamp DRAWS AN ELLIPSIS - that is the whole
     distinction #387 was written about. B measured a byte-identical sentence at 320x568 reading sh 68 /
     ch 51 with the clamp drawing a visible ellipsis, which is a HEALTHY state, and my predicate called it
     a defect. #396's actual check is that the CONTAINER is no taller than the lines the clamp allows:
     clientHeight <= ceil(lines x lineHeight). That is what distinguishes "the clamp cut and said so" from
     "the box ended early and said nothing", which is the real #394/#396/#397/#398 family. */
  L.say(!!P25.box&&P25.box.cap!=null,'TC-R10/N6a #504 the clamp and line-height are readable, so N6b below is a real #396 check rather than a null comparison',P25.box);
  L.say(!!P25.box&&P25.box.cap!=null&&P25.box.ch<=P25.box.cap,'TC-R10/N6b #504 the CONTAINER is no taller than the lines its clamp allows - clientHeight <= ceil(clamp x lineHeight) - so whatever truncates is the clamp, which draws an ellipsis, and not the box, which would not [#396]',P25.box);
  L.say(!!P19.r&&P19.r.moves.length===1,'TC-R10/N7 #504 ply 19 is UNCHANGED at one ply, because the pv after cxb5 has no forcing continuation - the trim rule can only ever ADD the recovery and never rewrites a sentence that was already right',{moves:P19.r&&P19.r.moves,why:P19.why.slice(0,70)});
  L.say(/Qb8\+/.test(P31.head)&&!!P31.r&&P31.r.moves.length===1&&/#$/.test(P31.r.moves[0]),'TC-R10/N8 #504 ply 31, 16.Qb8+, still reads exactly "If Nxb8, Rd8#" - a line that ENDS IN MATE is one ply, is not extended past the mate, and gets no verdict clause appended after it',{at:P31.head,moves:P31.r&&P31.r.moves,why:P31.why});
  /* ── N10: THE WHOLE PLY-25 SENTENCE, PINNED, BECAUSE A LONGER CLAUSE SPENDS A SHARED BUDGET ────────
     Antagonist B's second veto ground: the longer refutation clause pushed "It forks two pieces at once."
     out of the sentence at 375x730 - 126 characters against the shipped 144 - and NOTHING in this gate
     asserted over that, because every N assertion read only the "If ..., ..." clause. B is right that a
     note is not a guard. pack() (chess.jsx, search _maxw) is a greedy CHARACTER budget of 150 in portrait
     and it stops at the first clause that would overflow, so spending 18 characters on the refutation
     costs a 29-character clause at the end. THE TRADE IS RECORDED AS AMBER, at
     flags/amber-504-how-far-the-brilliant-refutation-line-runs, and it is Kunal's to reverse in one word.
     WHAT IS PINNED HERE IS THE WHOLE STRING, in the idiom this gate already uses for the #387 sentence at
     ply 19: if any future change moves a clause in or out of this sentence, this assertion says so on the
     next run instead of a reader having to diff two logs. */
  L.say(P25hit===1,'TC-R10/N10 #512 the WHOLE ply-25 sentence is byte-identical to EXACTLY ONE of the two sentences this code can legally print, so a clause silently entering or leaving it is still a red rather than a diff - and a THIRD string, which is what a regression would produce, reddens here. Replaces a single-template pin that was measured flaky at 2 runs in 8',{hits:P25hit,got:P25.why,chars:P25.why&&P25.why.length,pinned:P25OK.length});
  /* ── #504 N9: THE NARROWEST SUPPORTED PHONE ───────────────────────────────────────────────────────
     CLAUDE.md: "375x730 is Kunal's phone, not the standard, and the app must be playable on any standard
     phone." Block N above drives 375x730 only, so 320x568 was measured on BOTH bundles.
     MY FIRST VERSION OF THIS BLOCK CLAIMED A DEFECT HERE AND THE CLAIM IS WITHDRAWN [#504 antagonist B,
     upheld]. I measured the SHIPPED bundle at 320x568 reading scrollHeight 68 in a clientHeight 51 box,
     144 characters, and wrote that as "about a whole line CUT with no ellipsis, because the box is
     overflow-y hidden". That was the wrong instrument twice over. The element carries BOTH a
     -webkit-line-clamp of 3 AND overflow-y:hidden, and the container is sized to EXACTLY the clamped
     lines: ceil(3 x 16.9) = ceil(50.7) = 51 = clientHeight. So the clamp is what truncates, the clamp
     DRAWS AN ELLIPSIS, and B's dpr-3 crop shows it on screen ("...Bxf6 was 1.1 pawns worse. White is..").
     sh > ch is simply what a fired clamp reads. There is no silent cut on main and there never was.
     WHAT THIS BLOCK ASSERTS INSTEAD is #396's real invariant at the narrowest width - the container never
     outgrows its own clamp - plus the character budget, which is the thing that actually changed. */
  const sePly=async()=>{
    const q=await L.launch({geo:'se',name:'review-brilliant-504-se',store:{ct_pool:'3'}});await q.open();
    await RV.ensureReview(q,'opera');await RV.startReview(q);await RV.goPly(q,25);await q.settle(1800);
    const box=await q.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]')||document.querySelector('[data-ct="rev-why"]');if(!e)return null;const cs=getComputedStyle(e);const cl=parseInt(cs.webkitLineClamp,10),lh=parseFloat(cs.lineHeight);return {sh:e.scrollHeight,ch:e.clientHeight,chars:(e.textContent||'').length,lh:lh||null,ofY:cs.overflowY,clamp:cl||null,cap:(cl&&lh)?Math.ceil(cl*lh):null};});
    const why=(await q.text('[data-ct="rev-why-txt"]'))||'';
    await q.shot('review-brilliant-504-se');await q.close();
    return {box,why};
  };
  const SE=await sePly();
  P25SAMPLES.push(clausePlies(SE.why));   /* #512 sample 2 of 3: an INDEPENDENT engine query, because this arm is its own browser and its own review */
  /* #512 SAMPLE 3 OF 3, IN ITS OWN ARM, AND THE FIRST ATTEMPT AT IT WAS WRONG [self-caught by N3d].
     I first took this sample by clicking six plies on from 19 inside the 375x761 arm, to avoid paying for
     a browser. It returned 0 on every bundle, because that point in the arm is AFTER its play-out test,
     which animates a line on the board - so the read was taken in a state with no refutation clause on
     screen. N3d, the denominator assertion, is what caught it: the samples read [3,3,0] and N3d went red
     on the SHIPPING bundle while N3c passed on the strength of the two good samples. That is precisely
     why the denominator is a separate assertion and not a conjunct - had I folded "all three are real"
     into N3c, a build with a silently dead third sample would have read green on two. */
  const extra25=await (async()=>{
    const x=await L.launch({geo:'kunal761',name:'review-brilliant-512-s3',store:{ct_pool:'3'}});await x.open();
    await RV.ensureReview(x,'opera');await RV.startReview(x);await RV.goPly(x,25);await x.settle(1800);
    const why=(await x.text('[data-ct="rev-why-txt"]'))||(await x.text('[data-ct="rev-why"]'))||'';
    await x.close();return why;
  })();
  P25SAMPLES.push(clausePlies(extra25));
  L.note('    #512 ply-25 line length, three INDEPENDENT engine queries: '+JSON.stringify(P25SAMPLES));
  /* ── N3c: THE BUNDLE-LEVEL CONTROL FOR THE ENGINE-CALL SWAP, WHICH IS THE CENTRE OF THIS BUILD ───────
     WHY IT IS A MAXIMUM OVER THREE SAMPLES AND NOT A PIN ON ONE [#512, self-caught, and it is the second
     correction to this pair in one run]. Ply 25's line is ONE or THREE plies depending on the engine's pv,
     measured at 6 of 8 runs three-ply and 2 of 8 one-ply, so a pin on three flakes at 25% and a tolerance
     of "one or three" cannot fail - and when I widened N3/N10 to stop the flake I MEASURED that control
     NC3 (sfEval1 restored, every other line identical) went from 2 reds to 86 pass / 0 fail. That is the
     whole feature's central hunk group losing its only bundle-level control, which is exactly the veto
     ground antagonist A raised and which I had just re-created by fixing something else.
     THE SAMPLES ARE GENUINELY INDEPENDENT, which is what makes the maximum legitimate: sacRef.byPly caches
     per game key and ply, so revisiting a ply inside one session CANNOT resample - it returns the cached
     answer. Each of these three readings is a separate browser, a separate review and therefore a separate
     engine query: kunal730, 320x568 and 375x761.
     THE ARITHMETIC, STATED SO THE TOLERANCE IS NOT MISTAKEN FOR A GUESS: at the measured 75% per sample,
     the chance that all three come back one-ply is 0.25^3 = 1.6%, so this assertion is green about 98.4%
     of the time on a correct bundle. On sfEval1 the stored line can never exceed ONE ply by construction,
     so the probability on NC3 or on main is ZERO - it reddens every time. It discriminates absolutely in
     the direction that matters and is near-deterministic in the other, which is the best available shape
     for a property the engine gets to vary. It is NOT determinism by assertion-weakening: the 1.6% is
     published here so a future red can be read against it rather than re-diagnosed. */
  L.say(Math.max.apply(null,P25SAMPLES)===3,'TC-R10/N3c #512 THE RECOVERY IS ON SCREEN IN AT LEAST ONE OF THREE INDEPENDENT ENGINE QUERIES at ply 25 - this is Kunal own test ("the line runs one move further so the recapture is on screen") asserted at the BUNDLE level, and it is the only assertion in this gate that can tell the sfBestLine swap from the sfEval1 it replaced. Measured RED on sfEval1 restored (where one ply is the structural maximum) and on main own bundle',{samples:P25SAMPLES,geoms:['kunal730','se','kunal761'],max:Math.max.apply(null,P25SAMPLES)});
  L.say(P25SAMPLES.length===3&&P25SAMPLES.every(n=>n>0),'TC-R10/N3d #512 all THREE samples actually produced a refutation clause, so N3c above is a maximum over three real readings and not over an array padded with zeros - a missing denominator is reported, never credited',{samples:P25SAMPLES});

  L.note('    #504 320x568 ply25 box '+JSON.stringify(SE.box)+'  ->  '+SE.why.replace(/\s+/g,' '));
  L.say(!!SE.box&&SE.box.chars>0&&SE.box.cap!=null,'TC-R10/N9a #504 the 320x568 reading is non-empty and its clamp and line-height are readable, so N9b below is a real check rather than a null comparison',SE.box);
  L.say(!!SE.box&&SE.box.cap!=null&&SE.box.ch<=SE.box.cap,'TC-R10/N9b #504 at 320x568 - the narrowest supported phone - the CONTAINER is still no taller than the lines its clamp allows, so whatever truncates there is the clamp and it draws an ellipsis [#396]. This is GREEN on the shipped bundle too, and that is correct: the 320 reading was never a defect, which is a claim this block made and withdrew',SE.box);
  /* LANDSCAPE IS MEASURED AND DELIBERATELY NOT ASSERTED. At 730x375 the box is 238x34 with a 2-line clamp
     and the content needs 94px on this build and 75px on the shipped one, so most of the sentence is
     unpainted on BOTH. That is flags/uat397-rev-why-clips-landscape - broken:true, open since 2026-09-15,
     a self-inflicted #397 regression the build lane accepted as its own: the 34px literal is ceil(2x16.9)
     and 16.9 is the line-height only below 465px wide, so above that two lines need 37.7px. gate 26's own
     header says landscape "is not swept" and names that flag. Asserting it here would redden the suite on
     a known open defect belonging to another job and block this push, so it is a NOTE with the citation
     instead - an explicit open is a record, a silent open is a leak. The geometry is IDENTICAL on both
     bundles (238x34, clamp 2), so this change alters only which words fall inside those two lines. */
  L.note('    #504 730x375 landscape ply25: box 238x34 clamp 2, content 94 here vs 75 on 2fb1d7707780 - BOTH clipped, pre-existing, flags/uat397-rev-why-clips-landscape (open); gate 26:85 says landscape is not swept');
  const badN=n.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.note('    #504 block N app errors beyond the allowed engine trap: '+badN.length+(badN.length?' '+JSON.stringify(badN.slice(0,2)):''));
  await n.shot('review-brilliant-504-ply25');
  await n.close();

  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'TC-R10 no app error beyond the one allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();

  /* ── 5. THE SECOND GEOMETRY COLUMN. This gate had never run at anything but 375x679 ────────────────
     [jobs/gate-20-and-gate-21-never-visit-kunals-actual-geometry-2026-10-01, work item 2, the gate-21 half;
      gate 20's half landed 2026-10-03 and this file was left untouched. R19 is the governing rule.]

     WORK ITEM 1 FIRST, BECAUSE IT DECIDES THE SHAPE OF THIS BLOCK [R07]. Counted over this file at
     origin/main 11abfaa: of its 28 assertions, ZERO pin an absolute position, width or fit. Twenty-three
     are text or value assertions on engine and template output (the pinned sentence, the four clause
     templates, the dropTxt branch and its band, the alt-move sweep) and five are presence or liveness
     (the play-out exists, the play-out moves a piece, the engine line is OFF, the bar is readable, no
     unexpected app error). There is not one px literal in the file. SO THE TRAP THE JOB WARNS ABOUT -
     'gate 20 carries literal pins measured AT 679, so swapping the geometry will redden them and the red
     will be the pin's, not the app's' - DOES NOT APPLY HERE, and that is a measured conclusion rather
     than an assumption. It also means duplicating the 23 text assertions at a second height would be 60
     more seconds of engine to re-measure quantities that cannot depend on viewport height. So this column
     does not duplicate them. It asserts the two things a second geometry CAN tell you - that nothing the
     679 column reads has become absent or clipped, and that the text is the SAME text - and it reads the
     board width across the two columns as a note.

     WHY kunal761 AND NOT kunal730, WHICH IS WHAT THE JOB'S OWN TEXT ASKS FOR. The job was filed
     2026-10-01 and quotes CLAUDE.md's 375x730. R19 SETTLED THIS ON 2026-10-03, AFTER the job was
     written, and settled it the other way: 'USE 375 x 761 ... The figure 730 is wrong and should be
     corrected wherever it appears, including the GEOS entry labelled kunal730; GEOS already carries
     kunal761 and that is the right one.' gates/regress/72-drill-prev.js:43 already reads R19 that way
     and runs GEOS.kunal761, so this file follows the rule and the one precedent on main rather than the
     older job text. 375x679 is KEPT as the shorter-phone column exactly as the job's trap demands:
     nothing above this line changed.

     AND THE DISAGREEMENT UNDER THAT CHOICE IS REPORTED, NOT RESOLVED HERE [R45]. gates/lib.js:24-26
     records a measurement that 375x761 WITH ct_safe 51,31 renders the review board 293 wide where
     Kunal's phone shows 349, because the app subtracts the insets a second time; R19 pins BOTH 375x761
     AND boardPx 349.04 from his own diagnostics. Those cannot both describe one emulation. The board
     width this column reads is printed as a note beside gate 20's 349-at-679 pin so the next reader has
     the number, and the contradiction is filed for the orchestrator. A gate is not the place to decide
     which of two of Kunal's own figures is the one to build against. */

  /* ── 5a. THE FOUR PREDICATES OF THIS COLUMN, NAMED, AND THEIR CONTROLS ─────────────────────────────
     THIS SUB-BLOCK EXISTS BECAUSE THE COLUMN BELOW FAILED ITS OWN FALSIFIABILITY TEST AND THE FAILURE IS
     RECORDED RATHER THAN REPAIRED QUIETLY. The six live assertions were first run with block 5's launch
     pointed at GEOS.short375 (375x568), the project's wide-and-short corner, as a negative control.
     MEASURED 2026-10-04T06:45Z: ONE of the six flipped - the viewport identity - and the other FIVE
     stayed green, because the Review screen scales down gracefully (board 264 wide at 568, nothing
     clipped, nothing absent, the sentence unchanged). So a geometry change is NOT a mutation that can
     exercise five of these six, and publishing them as six green geometry checks would have been the
     exact defect jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02
     describes: a control set indistinguishable from one that constrains nothing.
     The predicates are therefore lifted out by name and driven over fabricated readings in BOTH
     directions, with no browser. The controls below cost no engine time and they are what makes the
     greens above them mean something. Count fixed at 8 so the suite total cannot drift. */
  const EL761=['rev-move-line','rev-why-txt','eval-bar-num','rev-playout'];
  const absent761=(r)=>EL761.filter(k=>!r[k]);
  const over761of=(r)=>EL761.filter(k=>r[k]&&(r[k].over>0.5||r[k].cut));
  const samePin761=(a,z)=>typeof a==='string'&&a.length>20&&a===z;
  const barOk761=(n)=>n!==null&&n>=2&&n<20;
  const EL_OK={x:2,y:10,w:371,h:32,right:373,over:0,cut:false};
  const mk=(o={})=>{const r={};for(const k of EL761)r[k]=Object.assign({},EL_OK);for(const k in o)r[k]=o[k];return r;};
  L.say(absent761(mk()).length===0,'TC-R10 control: the absent-element detector is SILENT on a complete reading');
  L.say(absent761(mk({'rev-playout':null})).length===1,'TC-R10 control: the absent-element detector FIRES when the play-out button is gone',absent761(mk({'rev-playout':null})));
  L.say(over761of(mk()).length===0,'TC-R10 control: the overflow detector is SILENT on a reading that fits');
  L.say(over761of(mk({'rev-why-txt':Object.assign({},EL_OK,{right:400,over:25})})).length===1,'TC-R10 control: the overflow detector FIRES on an element 25px past the viewport width');
  L.say(over761of(mk({'rev-move-line':Object.assign({},EL_OK,{cut:true})})).length===1,'TC-R10 control: the overflow detector FIRES on an element clipping its own content (scrollWidth > clientWidth)');
  L.say(samePin761('You give up a piece. If cxb5, Bxb5+ and White is winning here.','You give up a piece. If cxb5, Bxb5+ and White is winning here.')&&!samePin761('You give up a piece. If cxb5, Bxb5+ and White is winning here.','You give up a piece. If cxb5, Bxb5+ and White is clearly better.')&&!samePin761('','' ),'TC-R10 control: the cross-geometry sentence comparator is silent on two identical sentences, FIRES on two that differ by their last clause, and FIRES on an empty pair rather than calling two blanks equal');
  L.say(barOk761(2.8)&&barOk761(2.0),'TC-R10 control: the eval-agreement predicate is SILENT on +2.8 and on the +2.0 boundary');
  L.say(!barOk761(-2.8)&&!barOk761(0.1)&&!barOk761(99)&&!barOk761(null),'TC-R10 control: the eval-agreement predicate FIRES on a wrong sign (-2.8, the #389 shipped defect), on a near-zero (+0.1, the #385 defect), on a hundredfold error (99) and on an unreadable bar');
  const c=await L.launch({geo:'kunal761',name:'review-brilliant-761',store:{ct_pool:'3'}});await c.open();
  await c.tile('Review');await c.page.locator('textarea').first().fill(PGN);await c.tapText(/^⚡ Analyze Game$/,{wait:300});
  await c.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await c.settle(600);
  await c.tapText(/^Start review/,{wait:900});
  for(let i=0;i<19;i++){await c.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await c.page.waitForTimeout(140);}await c.settle(1500);
  const vp761=await c.page.evaluate(()=>({w:innerWidth,h:innerHeight,sh:document.documentElement.scrollHeight}));
  L.say(vp761.w===375&&vp761.h===761,'TC-R10 geo 375x761: the column really ran at the geometry R19 names, read from the page rather than from the GEOS entry',vp761);
  const txt761=(await c.text('[data-ct="rev-why-txt"]'))||(await c.text('[data-ct="rev-why"]'))||'';
  const read761=await c.page.evaluate(()=>{
    const out={};
    for(const k of ['rev-move-line','rev-why-txt','eval-bar-num','rev-playout']){
      const e=document.querySelector('[data-ct="'+k+'"]');
      if(!e){out[k]=null;continue;}
      const r=e.getBoundingClientRect();
      out[k]={x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,
              right:Math.round(r.right*10)/10,over:Math.round(Math.max(0,r.right-innerWidth)*10)/10,
              cut:e.scrollWidth-e.clientWidth>1};
    }
    const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    out.board=g?{w:Math.round(g.getBoundingClientRect().width*100)/100,left:Math.round(g.getBoundingClientRect().left*100)/100}:null;
    return out;
  });
  L.note('    375x761 column: '+JSON.stringify(read761));
  /* THE BOARD WIDTH IS A NOTE AND NOT AN ASSERTION, ON PURPOSE. gate 20:80 pins the review board at 349
     to within 0.6px and guards that pin with if(geo==='kunal'), so 349 is a 375x679 reading. Kunal's own
     diagnostics report 349.04 on a device whose viewport reads 761. Until somebody decides which of those
     two is the configuration to build against, a number pinned here would be pinning one side of an open
     contradiction - which is the #395 shape the job itself warns about. The reading is published so the
     decision can be made on a measurement. */
  L.note('    board width: 375x761 reads '+(read761.board?read761.board.w:'ABSENT')+'  |  gate 20:80 pins 349 +/-0.6 at 375x679  |  gates/lib.js:25-26 predicts 293 at 761-with-ct_safe');
  const missing761=absent761(read761);
  L.say(missing761.length===0,'TC-R10 geo 375x761: every element the 375x679 column reads is still present - the move line, the why panel, the eval bar number and the play-out button',{missing:missing761});
  /* THE SAME TEXT, BYTE FOR BYTE. The pinned sentence at line 58 was measured on #387 at 375x679 and
     nothing has ever checked whether that pin is a claim about the app or a claim about a 679-high
     viewport. If the brilliancy sentence ever differs between two heights, the pin is geometry-bound and
     every reader of this gate has been misled about what it covers. This is the cross-geometry comparator
     R47 asks for: a thing we already print, compared against another reading of itself. */
  L.say(samePin761(txt761,txt),'TC-R10 geo 375x761: the brilliancy sentence is BYTE-IDENTICAL to the 375x679 reading, so the #387 pin is a claim about the app and not about a viewport height',{at679:txt.slice(0,60),at761:txt761.slice(0,60),same:txt761===txt});
  const over761=over761of(read761);
  L.say(over761.length===0,'TC-R10 geo 375x761: nothing the gate reads is cut off at 375 - no element runs past the viewport width and none is clipping its own content [R10 item 6]',{offenders:over761.map(k=>({el:k,over:read761[k].over,cut:read761[k].cut}))});
  const bar761=await c.text('[data-ct="eval-bar-num"]');
  const cN761=(bar761==='mate')?99:((bar761==='-mate')?-99:(/^[+-]?\d+\.\d$/.test(String(bar761))?parseFloat(bar761):null));
  L.say(barOk761(cN761),'TC-R10 geo 375x761: the independent eval bar agrees in SIGN AND SCALE with the 375x679 column (both >= +2.0 and < 20 on a position White is winning) - two heights, one verdict',{at679:chip,at761:bar761});
  const s761=await gridSig(c);await c.tapCt('rev-playout',400);let moved761=false;
  for(let i=0;i<12;i++){await c.settle(350);if((await gridSig(c))!==s761){moved761=true;break;}}
  L.say(moved761,'TC-R10 geo 375x761: the play-out still moves a piece within ~4 s at the taller viewport');
  await c.settle(1200);await c.shot('review-brilliant-761');
  const bad761=c.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.note('    375x761 app errors beyond the allowed engine trap: '+bad761.length+(bad761.length?' '+JSON.stringify(bad761.slice(0,2)):''));
  await c.close();
},'REVIEW-BRILLIANT');
