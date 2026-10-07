// gates/regress/66-winprob-ladder.js - #440. TC-R40 / US-R30.
//
// WHAT THIS GUARDS. Kunal, 2026-09-23, on a game between 2000-strength players: "you're saying they
// committed like a bunch of blunders, especially at the end." classify() saw only the centipawn loss, so
// one identical 350cp slip was a Blunder at eval 0 - a 28.4-point drop in winning chances, genuinely a
// blunder - and STILL a Blunder at -1000, where the same slip costs 1.77 points and scores 92.4% move
// accuracy. #440 re-keys the ladder to the Lichess-published win-percentage drop. Desk
// q-classify-on-winprob, answered 2026-09-28 "labels-and-accuracy".
//
// WHY BLOCK A READS THE BUNDLE RATHER THAN THE SOURCE. The five cut-offs are numeric constants, so the
// only honest place to assert them is the artefact that ships. It also dodges the #432 trap - "an
// assertion keyed to a hook your own build adds cannot be controlled" - because nothing here is keyed to
// anything #440 introduced into the DOM: block B locates every number by the words already on screen.
//
// WHY BLOCK A CANNOT PASS VACUOUSLY. A0 asserts every extraction FOUND something before any assertion
// uses it. That is the E1b discipline from gate 65: a regex that cannot match reports a defect that is
// not there, and here it would instead report a ladder that is not there. Measured while writing this:
// esbuild minifies 0.00368208 to `.00368208`, so a pattern anchored on the leading zero matches NOTHING
// and every assertion built on it would have been a vacuous true.
//
// THE NEGATIVE CONTROL IS THE SHIPPED BUNDLE, WHICH COSTS NOTHING AND IS THE ACTUAL BROKEN BUILD:
//   CT_APP=<#439 app.js> node gates/regress/66-winprob-ladder.js
// Measured on #439 (md5 0099cb784ca0) at 375x730 on PGN_OPERA, against #440:
//   Black accuracy 62.4% -> 88.9%   Black Blunder 1 -> 1   Black Mistake 1 -> 0   Black Inaccuracy 1 -> 3
//   White: all ten grade rows IDENTICAL (1,6,5,1,1,3,0,0,0,0), accuracy 98% -> 97.6%
// So B2, B3 and B7 go RED on #439 and every block-A input goes red there too (no bands to find).
// B1 IS NO LONGER IN THAT LIST, and the correction is deliberate [R18, #491]. #439 charged Black one
// Blunder and so does #491, for different reasons, so B1 is green on both and is NOT a discriminator any
// more. Block C carries the discrimination instead, and it is red on #439 (no mate rule at all) and red
// on the #442-#447 pile (an unconditional floor, no rungs). Measured at #491: Black grade vector on the
// shipped bundle is [0,0,7,3,1,2,2,0,0,1] over
// [Brilliant,Great,Best,Excellent,Good,Book,Inaccuracy,Miss,Mistake,Blunder], totalling 16.
// Black is being MATED in that game, so his closing moves are played in a dead-lost position: that is
// precisely the state Kunal screenshotted, and the winning side barely moving is the other half of the
// claim.
// WHICH ENGINE BRANCHES THIS GATE DRIVES, STATED IN THE HEADER BECAUSE THE GAP MUST BE A RECORD RATHER THAN A
// SILENT DEFAULT. That wording is the doneWhen of
// jobs/four-gates-force-a-three-worker-pool-and-never-test-the-fallback-2026-09-27, which names gates 34, 35, 36
// and 37 for exactly this shape; this gate is a fifth instance and is declaring itself rather than waiting to be
// found. #440 changed the ladder at THREE call sites and they are not all reachable from here:
//   DRIVEN - the Stockfish path (chess.jsx, the `before`/`after` site), at a 3-worker pool and again at
//            ct_pool=1, which is block B's two columns.
//   NOT DRIVEN - the depth-2 minimax fallback, the `}else{` branch taken when Stockfish is unavailable
//            ENTIRELY. #440 re-keyed its classify() call too, with the same winDrop() over the same
//            white-POV centipawn operands, so the arithmetic is shared and unit-covered by block A - but the
//            WIRING at that site is asserted by nothing here. THERE IS NO HARNESS ROUTE TO IT: ct_pool accepts
//            only 1..6 (chess.jsx poolWanted), so it sizes the pool and cannot switch the engine off, and a
//            grep of the whole gates/ tree for any mechanism that blocks the worker returns nothing. Building
//            that route is test-authoring's job above, not something to fake here.
//   NOT DRIVEN - the background summary pass (the third call site), which runs off the review screen.
// This is CLAUDE.md's #375 rule and the reason it is written down: a gate that covers one branch of a
// device-chosen path would have gone green on every broken build.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const R=require('../drive/review');

const BUNDLE=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
// The five cut-offs #440 ships, and the centipawn cut-off each one is the eval-0 equivalent of.
const WANT=[[1.3804,15,'Best'],[3.6754,40,'Excellent'],[8.2096,90,'Good'],[14.3166,160,'Inaccuracy'],[26.4635,320,'Mistake']];
// 8.2096 AND 26.4635, NOT ...97 AND ...36, AND THE LAST DIGIT IS THE WHOLE ASSERTION [antagonist, #440].
// Rounded up, those two bands invert to 90.000150cp and 320.000286cp - just ABOVE their integers - so at
// eval 0 a loss of exactly 90 graded Good where #439 said Inaccuracy, and 320 graded Mistake where #439
// said Blunder. Both reachable: loss is an integer in the Stockfish path. A27 below is the assertion that
// would have caught it and A6..A10 could not, because their tolerance is 0.01cp against a 1.5e-4cp error.

L.run(async()=>{
  // ════════ BLOCK A - THE LADDER, AS SHIPPED, PER INPUT ════════
  const src=fs.readFileSync(BUNDLE,'utf8');
  // Extract rather than assume. Each of these is a number the bundle must carry for #440 to be in it.
  const mBands=src.match(/\[\[1\.3804,"[^"]+","[^"]+","[^"]+"\](?:,\[[^\]]*\])*\]/);
  const mWin=src.match(/\(2\/\(1\+Math\.exp\(-\.?0*\.?00368208\*/);
  const mAccA=src.match(/103\.1668/);
  const mAccB=src.match(/-\.?0*\.?04354\*/);
  const nums=mBands?(mBands[0].match(/\d+\.\d+/g)||[]).map(Number):[];
  // A0 THE INSTRUMENT WORKS BEFORE ANY ASSERTION USES IT.
  L.say(!!mBands&&nums.length===5&&!!mWin&&!!mAccA&&!!mAccB,
        'A0 INSTRUMENT: the bundle under test carries the band table, the win% constant and both accuracy constants',
        {bundle:path.basename(BUNDLE),bandsFound:!!mBands,bandCount:nums.length,winConst:!!mWin,acc1:!!mAccA,acc2:!!mAccB});
  if(!mBands||nums.length!==5){
    // Guard everything that would TAP or READ through a thing that may not be there, then carry on:
    // 89 pass / 8 fail says far more than 2 pass / 4 fail (#393).
    L.note('A1..A26 NOT RUN: no band table in '+path.basename(BUNDLE)+' - expected on a pre-#440 bundle');
  }else{
    const winPct=cp=>50+50*(2/(1+Math.exp(-0.00368208*cp))-1);
    const drop=(bW,aW,mv)=>{const b=mv==='w'?bW:-bW,a=mv==='w'?aW:-aW;return Math.max(0,winPct(b)-winPct(a));};
    const lab=d=>{for(let k=0;k<nums.length;k++)if(d<nums[k])return WANT[k][2];return 'Blunder';};
    // A1..A5 the shipped constants ARE the ones the amber record names.
    WANT.forEach(([want,,name],k)=>L.say(Math.abs(nums[k]-want)<1e-9,
      'A'+(k+1)+' the shipped '+name+' cut-off is '+want+' points of win chance',{shipped:nums[k],want}));
    // A6..A10 AND THEY INVERT TO OUR OLD CENTIPAWN LADDER AT EVAL 0, which is the whole claim that a
    // LEVEL position grades exactly as it did before #440. Proved by bisection, not asserted.
    WANT.forEach(([d,cp,name],k)=>{
      let lo=0,hi=6000;for(let i=0;i<300;i++){const m=(lo+hi)/2;if(drop(0,-m,'w')<nums[k])lo=m;else hi=m;}
      const got=(lo+hi)/2;
      L.say(Math.abs(got-cp)<0.01,'A'+(6+k)+' at eval 0 the '+name+' cut-off is still '+cp+'cp (level positions unchanged)',
            {invertedTo:Math.round(got*1000)/1000,oldCutoff:cp});});
    // A11..A24 TC-R40: ONE identical 350cp slip, seven standing evaluations, both movers. 14 inputs, never
    // aggregated - the job's own case says a mean or a count is green on the broken build and on the fix alike.
    let n=11;
    for(const mv of ['w','b']) for(const eb of [0,-200,-400,-600,-800,-1000,1000]){
      const bW=mv==='w'?eb:-eb, aW=mv==='w'?eb-350:-(eb-350);
      const d=drop(bW,aW,mv), got=lab(d);
      // clause (i): at eval 0 a 350cp slip IS a blunder and must stay one.
      // clause (ii): nothing costing under 10 points of win chance may be called a Blunder.
      const ok=(eb===0?got==='Blunder':true)&&(d<10?got!=='Blunder':true);
      L.say(ok,'A'+n+' TC-R40 '+mv+' at evalBefore '+eb+'cp: a 350cp slip drops '+d.toFixed(2)+' points -> '+got,
            {mover:mv,evalBefore:eb,drop:Math.round(d*100)/100,label:got,
             clause:eb===0?'(i) must be Blunder':(d<10?'(ii) must NOT be Blunder':'unconstrained')});
      n++;
    }
    // A27 THE SWEEP THAT ACTUALLY DISCRIMINATES, added after the antagonist broke the headline claim.
    // A6..A10 invert each band and compare to 0.01cp, which cannot see an error of 1.5e-4cp - and an error
    // that small still moves a LABEL, because loss is an integer and a band can land on the wrong side of
    // one. So assert the thing the claim actually says: at eval 0 the shipped win-percentage ladder and the
    // old centipawn ladder agree at EVERY integer loss. 1501 inputs, and it goes red on the ...97/...36
    // constants at exactly two of them.
    const oldLadder=(l)=>l<15?'Best':l<40?'Excellent':l<90?'Good':l<160?'Inaccuracy':l<320?'Mistake':'Blunder';
    const mismatches=[];
    for(let l=0;l<=1500;l++){const a=lab(drop(0,-l,'w')),b=oldLadder(l);if(a!==b)mismatches.push({loss:l,shipped:a,pre440:b});}
    L.say(mismatches.length===0,
      'A27 at eval 0 the shipped ladder agrees with the pre-#440 centipawn ladder at all 1501 integer losses - the claim that a LEVEL position is unchanged, asserted over its whole input space rather than at five boundaries',
      {inputs:1501,mismatches:mismatches.length,first:mismatches.slice(0,4)});

    // A25 THE CAP, which is a product statement and not a bug: a drop is bounded by the chances you had.
    const capped=lab(drop(-1200,-100000,'w'));
    L.say(capped==='Best','A25 at -1200cp every move grades Best - the cap is real and is the published behaviour',
          {worstReachableAtMinus1200:capped});
    // A26 and the asymmetry: from +1000, throwing the game away is STILL a Blunder.
    const fromWinning=lab(drop(1000,-100000,'w'));
    L.say(fromWinning==='Blunder','A26 from +1000cp throwing the whole game away is still a Blunder (the ladder is not symmetric)',
          {worstReachableAtPlus1000:fromWinning});
  }

  // ════════ BLOCK C - THE MATE LADDER, KUNAL'S DECISION, AND THE CONTROL THAT SEPARATES IT FROM A FLOOR ════════
  // #491. Desk questions/q-mate-floor-is-allowing-mate-a-blunder, answered 2026-10-04T08:55Z, choice
  // `lichess-ladder`. Replicating Lichess's published mate path (lila modules/tree/src/main/Advice.scala):
  // allowing a forced mate is a Blunder when you were 700cp down or better, a Mistake from 701 to 999, and
  // an Inaccuracy at 1000 down or worse, read from the eval BEFORE the move from the mated side's POV.
  //
  // WHY THIS BLOCK EXISTS AND WHY B1 ALONE IS NOT ENOUGH. B1 counts Black's blunders on PGN_OPERA and reads
  // 1 under the NEW ladder AND under the OLD #441 always-Blunder floor alike, because Black stands -649cp
  // before 15...Nxd7 and that is on the >=-700 rung, where the two rules AGREE. So B1 cannot tell a working
  // ladder from the floor it replaced - it is CLAUDE.md's "check the control moved the quantity the
  // assertion reads" trap, and a build that reverted the ladder to a floor would keep B1 green. The two
  // inputs that discriminate are -850 (floor says Blunder, ladder says Mistake) and -1500 (floor says
  // Blunder, ladder says Inaccuracy), and they are asserted by name below.
  {
    const srcC=fs.readFileSync(BUNDLE,'utf8');
    // Extract rather than assume, exactly as A0 does. esbuild keeps these literal: the shipped expression is
    // `ur>=-700?F0(1/0):ur>=-999?Eb("Mistake"):Eb("Inaccuracy")` and the mate predicate is `>=9e4`.
    const hasMatePred=/Math\.abs\([A-Za-z_$][\w$]*\)>=9e4/.test(srcC);
    const mBlun=srcC.match(/>=\s*-700\s*\?/);
    const mMist=srcC.match(/>=\s*-999\s*\?/);
    const mNames=/Eb?\w*\("Mistake"\)|\("Mistake"\)/.test(srcC)&&/\("Inaccuracy"\)/.test(srcC);
    L.say(hasMatePred&&!!mBlun&&!!mMist&&mNames,
      'C0 INSTRUMENT: the bundle under test carries the mate predicate and BOTH rung thresholds of the decided ladder',
      {bundle:path.basename(BUNDLE),matePredicate:hasMatePred,blunderRung:!!mBlun,mistakeRung:!!mMist,bandNamesLookedUp:mNames});
    if(!mBlun||!mMist){
      // #393: guard anything that READS through a thing that may not be there, then carry on.
      L.note('C1..C9 NOT RUN: no mate-ladder thresholds in '+path.basename(BUNDLE)+
             ' - expected on any bundle before #491 (a pre-#441 bundle has no mate rule at all; the #442-#447 pile has an unconditional floor)');
    }else{
      // The rung function, built from the thresholds EXTRACTED above so the shipped constants are what is pinned.
      const blunRung=Number(mBlun[0].match(/-\d+/)[0]), mistRung=Number(mMist[0].match(/-\d+/)[0]);
      L.say(blunRung===-700&&mistRung===-999,
        'C1 the shipped rungs are Lichess\'s published ones: Blunder at >= -700cp, Mistake at >= -999cp',
        {shippedBlunderRung:blunRung,shippedMistakeRung:mistRung,want:[-700,-999]});
      const rung=b=>b>=blunRung?'Blunder':b>=mistRung?'Mistake':'Inaccuracy';
      const floor=()=>'Blunder'; // the #441 rule this replaced, for the discrimination assertions
      // C2..C7 ONE INPUT EACH, NEVER AGGREGATED - the same discipline as A11..A24.
      const CASES=[
        [-300,'Blunder',   'a playable position thrown into a mate: #375\'s case, still charged'],
        [-649,'Blunder',   'PGN_OPERA 15...Nxd7, the move B1 counts - inverting the app\'s own win% formula from the 8.4% the pile recorded gives -648.9cp, so it sits on the Blunder rung and B1\'s 1 is right for the right reason'],
        [-700,'Blunder',   'the boundary itself, inclusive'],
        [-701,'Mistake',   'one centipawn past it'],
        [-850,'Mistake',   'DISCRIMINATOR: the old #441 floor called this a Blunder'],
        [-1500,'Inaccuracy','DISCRIMINATOR: the old #441 floor called this a Blunder; Lichess clamps at -1000 so the win% drop here is EXACTLY ZERO and pure win-chances grading cannot see this move at all'],
      ];
      let cn=2;
      for(const [before,want,why] of CASES){
        const got=rung(before);
        L.say(got===want,'C'+cn+' allowing mate at evalBefore '+before+'cp (mated side\'s POV) grades '+want+' - '+why,
              {evalBefore:before,got,want,oldFloorWouldSay:floor(),discriminates:floor()!==want});
        cn++;
      }
      // C8 THE LADDER IS MONOTONE. A rule that got softer as you got LESS lost would be the floor's mistake
      // inverted, and no single input above would catch it.
      const ord={Blunder:3,Mistake:2,Inaccuracy:1};
      let mono=true,firstBad=null;
      for(let b=-2000;b<=0;b++){const a=ord[rung(b)],c=ord[rung(b-1)];if(a<c){mono=false;if(!firstBad)firstBad={at:b};break;}}
      L.say(mono,'C8 the mate ladder never grades a move MORE softly as the position you played it from was LESS lost, over all 2001 integer readings',
            {inputs:2001,monotone:mono,firstViolation:firstBad});
      // C9 AND IT MUST NOT HAVE BECOME A FLOOR AGAIN. Stated as its own assertion so a later "simplification"
      // back to classify(Infinity) is a named red rather than a silent one.
      const asFloor=CASES.every(([b])=>rung(b)==='Blunder');
      L.say(!asFloor,'C9 the shipped rule is a LADDER and not the #441 floor: at least one input that the floor called a Blunder is now softer',
            {everyInputBlunder:asFloor,softerInputs:CASES.filter(([b])=>rung(b)!=='Blunder').map(([b])=>b)});
    }
  }

  // ════════ BLOCK B - A REAL DECIDED GAME, END TO END ════════
  const b=await L.launch({geo:{w:375,h:730},name:'winprob-ladder',store:{ct_pool:'3'}});
  await b.open();
  L.note('bundle stamp on the page: '+await b.stamp());
  await b.home(); await b.tile('Review');
  await b.page.locator('textarea').first().fill(R.PGN_OPERA);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  let up=true;
  try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});}catch(e){up=false;}
  await b.settle(1200);
  L.note('import + analysis took '+Math.round((Date.now()-t0)/1000)+' s');
  L.say(up,'B0 the Opera Game imported and the review summary rendered');
  if(!up){ L.note('B1..B7 NOT RUN: no summary to read'); return; }

  const txt=await b.page.locator('[data-ct="rev-summary"]').innerText();
  // Locate every number by THE WORDS ALREADY ON SCREEN, never by a hook #440 added (#432).
  const accs=[...txt.matchAll(/([\d.]+)%\s*\n\s*ACCURACY/g)].map(m=>parseFloat(m[1]));
  const ROWS=['Brilliant','Great','Best','Excellent','Good','Book','Inaccuracy','Miss','Mistake','Blunder'];
  const grade={};
  for(const r of ROWS){
    const m=txt.match(new RegExp('\\n'+r+'\\s*\\n\\s*(\\d+)\\s*\\n\\s*(\\d+)'));
    grade[r]=m?{w:+m[1],b:+m[2]}:null;
  }
  const missing=ROWS.filter(r=>!grade[r]);
  // B0b THE PARSE WORKED - again, before anything reads it.
  L.say(accs.length===2&&missing.length===0,'B0b INSTRUMENT: both accuracies and all ten grade rows parsed off the panel',
        {accuracies:accs,missingRows:missing});
  if(accs.length!==2||missing.length){ L.note('B1..B7 NOT RUN: panel did not parse'); return; }
  const [accW,accB]=accs;
  L.note('White grade vector '+JSON.stringify(ROWS.map(r=>grade[r].w))+'  accuracy '+accW+'%');
  L.note('Black grade vector '+JSON.stringify(ROWS.map(r=>grade[r].b))+'  accuracy '+accB+'%');

  // B1, B2 THE HEADLINE, AND B1 CHANGED AT #491 ON KUNAL'S OWN DECISION [R18 - the old expectation is
  // WITHDRAWN here, in the document that carried it, rather than quietly edited].
  // IT USED TO READ `grade.Blunder.b===0` with the reason "a move made with no winning chances left to lose
  // cannot cost a game that was already gone". That was the pure win-chances reading, and it is the single
  // assertion that stopped EIGHT consecutive builds: it contradicted #441's mate floor, which called the
  // same move a Blunder, and neither side could ship while both were on record (R45's worked example).
  // Desk questions/q-mate-floor-is-allowing-mate-a-blunder, answered 2026-10-04T08:55Z, choice
  // `lichess-ladder`, dissolves it: Lichess charges a Blunder for allowing mate at anything better than
  // 700cp down, and only softens below that. Black stands -649cp before 15...Nxd7 - MEASURED by inverting
  // the app's own published win% formula from the 8.4% the pile recorded, and corroborated by the pile's
  // own "about -6.5 pawns" - so this move is on the >=-700 rung and ONE Black blunder is now the correct
  // and intended reading. B2 is unchanged and still 0: no Black move lands on the Mistake rung.
  // THIS ASSERTION NO LONGER DISCRIMINATES THE LADDER FROM A FLOOR, and block C above is what does; see
  // the reason written at the head of block C.
  L.say(grade.Blunder.b===1,'B1 Black is charged with exactly ONE blunder - 15...Nxd7, which allows mate from -649cp, on the >=-700 Blunder rung of the decided ladder (#439 also charged 1, for the wrong reason)',{blackBlunder:grade.Blunder.b,rung:'>=-700',decidedBy:'q-mate-floor-is-allowing-mate-a-blunder / lichess-ladder'});
  L.say(grade.Mistake.b===0,'B2 Black, who is being mated, is charged with NO mistake (#439 charged 1)',{blackMistake:grade.Mistake.b});
  // B3 and the number he actually reads.
  L.say(accB>=80,'B3 Black accuracy is at least 80% on a game he never had chances in (#439 read 62.4%)',{blackAccuracy:accB});

  // B4, B5 THE OTHER HALF OF THE CLAIM: the side that was WINNING must not be softened by this change.
  // Green on #439 as well as on #440 - it is a regression guard, not a discriminator, and it is what stops
  // a later "simplification" of the ladder from quietly excusing the winner's real errors too.
  const wBad=grade.Inaccuracy.w+grade.Miss.w+grade.Mistake.w+grade.Blunder.w;
  L.say(wBad===0,'B4 White, who won, still has no inaccuracy, miss, mistake or blunder',{whiteBadRows:wBad});
  L.say(accW>=90,'B5 White accuracy is still at least 90% (#439 read 98%)',{whiteAccuracy:accW});
  // B6 LABELS REDISTRIBUTE, THEY DO NOT VANISH. A per-side total that drops would mean moves fell out of
  // the table altogether, which is how a softening change could hide a counting bug inside a good result.
  const sw=ROWS.reduce((a,r)=>a+grade[r].w,0), sb=ROWS.reduce((a,r)=>a+grade[r].b,0);
  L.say(sw===17&&sb===16,'B6 every graded move is still counted: White 17 and Black 16 rows, as on #439',{whiteTotal:sw,blackTotal:sb});
  // B7 THE SENTENCE THE CHANGE MADE FALSE. It described the formula #440 replaced, and nothing asserted it
  // before, which is how a wrong sentence survives builds.
  L.say(!/average centipawn loss/i.test(txt)&&/changed your chances of winning/i.test(txt),
        'B7 the panel no longer explains accuracy as average centipawn loss',
        {saysCentipawn:/average centipawn loss/i.test(txt),saysChances:/changed your chances of winning/i.test(txt)});
});
