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
  const want=['SAC_LINE_MAX','sacLine','refuteTxt','sacStore','uciToMove'];
  const missing=want.filter(n=>!blocks.has(n));
  if(missing.length) return {missing,md5,file};
  try{
    const E=require('../engine-extract');
    const code=want.map(n=>blocks.get(n)).join('\n')+'\nreturn {SAC_LINE_MAX:SAC_LINE_MAX,sacLine:sacLine,refuteTxt:refuteTxt,sacStore:sacStore};';
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
/* ── #504 NEGATIVE CONTROLS, RECORDED HERE BESIDE THE ASSERTIONS THEY PROVE, PER #401's RULE ───────────
   The gate reads 81 pass / 0 fail on the shipping bundle 1d434d3a871d over source 9728a5fbdebf. DETERMINISM,
   STATED AS MEASURED AND NOT ROUNDED UP [R36; #503's pointer 5]: TWO independent executions of this file at
   81 pass / 0 fail with the ply-25 sentence AND the 320x568 box reading byte-identical in both, plus a THIRD
   from the full suite's own section of this gate. The two were taken before this comment block was added, so
   they are executions of a file byte-identical to this one EXCEPT for this comment; the suite's is of the
   file as shipped. An earlier three-run figure in this run's records was taken on a 39-assertion-smaller
   version of the gate and is a fact about a file that no longer exists - which is exactly what #503's
   pointer 5 warns about, so it is withdrawn rather than carried. FIVE CONTROLS, AND THEY REDDEN DISJOINT SETS:

     NC1  CT_APP=origin/main's app.js  2fb1d7707780     79 pass /  2 FAIL   N3, N10
          THE IDEAL CONTROL - the control bundle IS the shipped defect rather than something built to fail.
          N2 still PASSES there, so N3's red is about the LENGTH of the line and not the clause's absence,
          which is the discrimination those two assertions exist to make. N9b is GREEN there, correctly.
     NC2  CT_SRC=origin/main's chess.jsx ef7a141bec38   54 pass / 27 FAIL   S0 + all 26 ids in SAC_S_IDS
          Fails SOFT rather than throwing, so the 54 assertions after it still run (#393).
     NC3  CT_SRC= the PARITY term removed               77 pass /  4 FAIL   S6, S23, S23b, S24
          The designed control for antagonist B's veto. It reddens exactly the parity assertions.
     NC4  CT_SRC= the whole trim-and-parity loop gone   76 pass /  5 FAIL   S6, S16b, S23, S23b, S24
     NC5  CT_APP= a BUNDLE with that loop gone, 006568487844
                                                        79 pass /  2 FAIL   N7 + the #387 PINNED sentence
          THE STRONGEST ONE HERE IS NOT ONE I WROTE. With the trim gone, ply 19 prints "Bxb5+ Kd8 O-O-O" -
          a quiet tail - which reddens N7 AND this gate's own long-standing #387 pinned sentence. The trim
          rule is proved load-bearing by an assertion written builds before it existed.

   CT_SRC AND CT_APP CONTROLS ARE NOT INTERCHANGEABLE, and that is a property of the gate rather than an
   omission: block S reads chess.jsx and block N reads the MINIFIED bundle, so CT_APP cannot redden S and
   CT_SRC cannot redden N. Gate 68 states the same caveat about itself and for the same reason. NC1 and NC5
   are the bundle-level half; NC2 to NC4 the source half.
   WHY FIVE AND NOT ONE: antagonist B measured that the first control moved ONE assertion of 66, and that
   N4 and N5 PASS on the shipped bundle because the pre-fix behaviour satisfies them. Both points upheld,
   and the trial bundles exist to give those assertions something they can actually fail against. */
const SAC_S_IDS=['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14','S15',
                 'S16a','S16b','S17','S18','S19','S20','S21','S22','S23','S23b','S24'];
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
    /* ── S17 to S21: THE STORE DECISION, WHICH IS WHERE THE UPHELD VETO LIVED ─────────────────────────
       Antagonist A found that the first version of this build cached a dead search FOR EVER in the common
       timing - the #389 defect, reproduced by the very guard written to fix it. The effect returns early
       on a truthy byPly[ai] BEFORE registering its cleanup, and the old write was guarded only by the GAME
       key, which stepping plies does not change; so a search dying after the user stepped off the ply (a
       ~5.6-second window, from sfBestLine's own 2500ms idle and 5600ms hard timeouts against a 450ms
       debounce) wrote `retryable` onto a ply nothing could ever clear.
       THE REASON THESE ASSERTIONS CAN EXIST AT ALL is that the decision was MOVED OUT of the component
       into the pure sacStore(). The veto's own words were that the guard "has no assertion in either new
       block and no control that can enter the state" - and it could not have one while it was four lines
       inline in a React callback. Making the thing under test a pure function is the fix for that, not an
       assertion written around it. */
    const St=SAC_SRC.sacStore, MK={pending:true,capSan:'Nxd7'}, REC={capSan:'Nxd7',replySan:'Bxe7',replyLine:['Bxe7','Bxe7','Bxd7+']};
    L.say(typeof St==='function','TC-R10/S17 #504 the store decision is a pure module-level function, which is what makes the dead-search path assertable at all',typeof St);
    const okSame=St(MK,MK,REC,0,3), okGone=St(undefined,MK,REC,0,3);
    L.say(!!okSame&&okSame.entry===REC&&!!okGone&&okGone.entry===REC,'TC-R10/S18 #504 a REAL answer is cached whether or not the user is still on the ply - a completed search is correct either way, and discarding it would cost a fresh query on every revisit',{stillThere:!!okSame,leftTheP1y:!!okGone});
    const dSame=St(MK,MK,null,0,3);
    L.say(!!dSame&&dSame.entry.retryable===true&&dSame.dead===1,'TC-R10/S19 #504 a dead search WHILE THE USER IS STILL ON THE PLY records a retryable marker and counts the attempt - the effect cleanup is registered in that case, so leaving clears it and the next visit asks again',dSame&&dSame.entry);
    const dGone=St(undefined,MK,null,0,3);
    L.say(dGone===null,'TC-R10/S20 #504 THE VETO CASE: a dead search that resolves AFTER the user left the ply writes NOTHING, so the entry the cleanup deleted stays deleted and the next visit re-queries. Before the fix this wrote a permanent retryable marker that no cleanup could ever reach, and the clause stayed absent for the rest of the session - #389 verbatim',{returned:dGone});
    const d2=St(MK,MK,null,1,3), d3=St(MK,MK,null,2,3);
    L.say(!!d2&&d2.entry.retryable===true&&d2.dead===2&&!!d3&&d3.entry.none===true&&d3.entry.deadTries===3,'TC-R10/S21 #504 the retry is BOUNDED at SAC_DEAD_TRIES=3: the third dead attempt stores the terminal {none} marker instead, so a permanently dead engine stops being asked rather than being retried on every visit for ever',{second:d2&&d2.entry,third:d3&&d3.entry});
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
  } else {
    /* THE FALLBACK USED TO START AT S2 AND SILENTLY DROP S1 [#504 antagonist A, upheld]. S1 is the
       non-vacuity assertion - the denominator - so the one id the NOT-RUN report lost was the one whose
       own text says "a missing denominator is REPORTED, never credited", and the two branches reported
       different totals (16 against 15). It now emits S1 through S21, so S0 plus these is 22 either way. */
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
       ply 25  13.Rxd7  Great      "If Nxd7, Bxe7 and White is winning"       1 ply on #503 (2fb1d7707780)
                                   "If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning"  3 plies on #504 (6b7dadfdccf6)
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
  L.say(!!P25.r&&P25.r.moves.length>=2,'TC-R10/N3 #504 the refutation line at ply 25 runs PAST the opponent capture - two or more plies, so the recovery is on screen. This is Kunal own test ("the line runs one move further so the recapture is on screen") and it is RED on the shipped #503 bundle, where sacRun read only sfEval1 bestmove so one ply was the structural maximum',{moves:P25.r&&P25.r.moves,n:P25.r&&P25.r.moves.length});
  L.say(!!P25.r&&P25.r.moves.length>0&&/[x+#]/.test(P25.r.moves[P25.r.moves.length-1]),'TC-R10/N4 #504 the displayed line ENDS on a forcing move - a capture, a check or mate - so it never trails off on a quiet move that shows nothing',{last:P25.r&&P25.r.moves[P25.r.moves.length-1],moves:P25.r&&P25.r.moves});
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
  L.say(P25.why==='The only move that keeps it. If Nxd7, Bxe7 Bxe7 Bxd7+ and White is winning. Chases the queen off e7 and takes the open d file.','TC-R10/N10 #504 PINNED the whole ply-25 sentence, so a clause silently entering or leaving it is a red rather than a diff. The shipped bundle prints 144 characters here and ends "...takes the open d file. It forks two pieces at once."; this prints 126 and the motif clause is displaced by the longer refutation - a recorded amber trade, not an accident',{got:P25.why,chars:P25.why.length});
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
