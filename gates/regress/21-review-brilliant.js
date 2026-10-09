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
  const want=['SAC_LINE_MAX','sacLine','refuteTxt','uciToMove'];
  const missing=want.filter(n=>!blocks.has(n));
  if(missing.length) return {missing,md5,file};
  try{
    const E=require('../engine-extract');
    const code=want.map(n=>blocks.get(n)).join('\n')+'\nreturn {SAC_LINE_MAX:SAC_LINE_MAX,sacLine:sacLine,refuteTxt:refuteTxt};';
    const api=new Function('FILES','getLegal','applyMove','toSAN','makeMove',code)(E.FILES,E.getLegal,E.applyMove,E.toSAN,E.makeMove);
    return Object.assign({missing:[],md5,file,E},api);
  }catch(e){return {missing:['<eval: '+e.message+'>'],md5,file};}
})();
/* The position the #504 probe measured, derived rather than typed: the Opera fixture's ply 25 is 13.Rxd7,
   sacTaker takes the CHEAPEST capture of d7 (Nxd7, a knight before the rook and the queen), and this is
   the FEN after it. The engine's pv from here is Bxe7 Bxe7 Bxd7+ - White wins the queen and recovers the
   bishop - which is exactly the "the piece comes back" shape Kunal's report is about. */
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
    L.say(!!trimmed&&trimmed.length===2&&/[x+#]/.test(trimmed[trimmed.length-1]),'TC-R10/S6 #504 a pv whose third ply is QUIET is trimmed back to the last FORCING ply, so the displayed line never ends on a move that shows nothing',{got:trimmed});
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
  } else {
    for(let i=0;i<14;i++) L.say(false,'TC-R10/S'+(i+2)+' #504 NOT RUN: chess.jsx declares no refutation-line machinery ('+SAC_SRC.missing.join(', ')+'), so the trim rule could not be exercised. A missing denominator is REPORTED, never credited.');
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
    const box=await n.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]')||document.querySelector('[data-ct="rev-why"]');if(!e)return null;return {sh:e.scrollHeight,ch:e.clientHeight};});
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
  /* THE BOX. The clause got longer, and this file records four separate episodes of a longer string being
     cut by a container rather than by its clamp (#394, #396, #397, #398). pack() bounds the sentence by
     CHARACTERS, which is not the same claim as the box fitting, so the box is measured. */
  L.say(!!P25.box&&P25.box.sh<=P25.box.ch+1,'TC-R10/N6 #504 the longer sentence does not overflow its own box at 375x730 - scrollHeight within 1px of clientHeight, so nothing is silently clipped by the container [#396]',P25.box);
  L.say(!!P19.r&&P19.r.moves.length===1,'TC-R10/N7 #504 ply 19 is UNCHANGED at one ply, because the pv after cxb5 has no forcing continuation - the trim rule can only ever ADD the recovery and never rewrites a sentence that was already right',{moves:P19.r&&P19.r.moves,why:P19.why.slice(0,70)});
  L.say(/Qb8\+/.test(P31.head)&&!!P31.r&&P31.r.moves.length===1&&/#$/.test(P31.r.moves[0]),'TC-R10/N8 #504 ply 31, 16.Qb8+, still reads exactly "If Nxb8, Rd8#" - a line that ENDS IN MATE is one ply, is not extended past the mate, and gets no verdict clause appended after it',{at:P31.head,moves:P31.r&&P31.r.moves,why:P31.why});
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
