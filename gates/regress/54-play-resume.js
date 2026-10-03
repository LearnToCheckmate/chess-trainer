// regress/54-play-resume.js   A LIVE GAME MUST SURVIVE LEAVING THE PLAY SCREEN.
// Authored 2026-09-28 by the test-authoring lane for jobs/a-live-game-cannot-be-re-entered-2026-09-27
// (auditor pass, build #424). Implements US-R16 / TC-R19. Every number below was MEASURED on the shipped
// bundle #427 - 2026-09-28 03:16 ET (origin/main 90abeba, app.js md5 95fa1c00fcc8). Nothing is read off source.
//
// WHAT IT GUARDS. Kunal taps the house (⌂) mid-game to look at something else. The game is STILL MOUNTED
// behind Home - measured, playHist survives and play-moverow still reads 3 plies. But the only door back is
// Home -> the Play tile, which opens the New Game sheet, and that sheet:
//   (A) is INDISTINGUISHABLE from the sheet with no game at all,
//   (B) offers no way to resume,
//   (C) never says a game is in progress,
//   (D) and its '▶ Start game' REPLACES the running game with plies=0 and no confirmation.
// The app already has this pattern elsewhere - leaving a review and reselecting Review offers
// '‹ Back to your analysis' (TC-R24) - so this is a missing application of the app's own rule, not a new
// design question. That is why (B) is asserted as a REQUIREMENT rather than raised as a Desk question.
//
// THIS GATE IS RED ON #427 BY DESIGN. It is authored before the fix, so A, B, C and D fail on the shipped
// build with every failure explained, and go green on a bundle carrying the candidate fix (NC4 below).
// Do not "fix" the gate by re-pinning it to what #427 produces.
//
// ══ THE TRAP THIS GATE WAS ALMOST BUILT ON, AND WHY (A) IS NOT ASSERTED THE OBVIOUS WAY ═══════════════
// The job's doneWhen says: assert the setup sheet's button set DIFFERS between 'a game is live' and 'no
// game'. Written literally, THAT ASSERTION IS GREEN ON THE BROKEN BUILD. Measured at 375x730 on #427:
//   live-game sheet  : 26 visible buttons, Pass & Play variant   (343x649)
//   fresh sheet      : 29 visible buttons, Computer variant      (343x967)
// They differ - and not one pixel of the difference is about the running game. The app REMEMBERS the
// opponent tile inside a session (gates/drive/play.js says so in its header), the live game was started
// from Pass & Play, and the fresh control defaulted to Computer, which adds a persona row and a colour
// row. A gate built on the job's own wording would have signed this defect off as fixed.
// So the control here selects PASS & PLAY on the fresh sheet too, and with the one confounder removed the
// two sheets are BYTE-IDENTICAL: same 10 buttons, same 649.00 height, same innerText, md5 5f441135da94
// both sides. That identity is the finding in one number and it is what A asserts.
//
// ══ MEASUREMENT RULES OBEYED (each one paid for by a false finding) ═══════════════════════════════════
//  1. #root carries overflow-y:auto by design, so document.scrollingElement NEVER scrolls in this app.
//     Nothing here reads docScrollY. The setup sheet is a position:fixed overlay with its own overflowY,
//     so L.over() CANNOT SEE IT AT ALL (45-play-setup.js proved this) - no assertion below uses L.over().
//  2. getBoundingClientRect() includes transforms and every piece sits in scale(1.06). Nothing here
//     measures a piece; the board is the CSS grid via L.board() and plies are counted from play-moverow.
//  3. locator.click() auto-scrolls, so every rect asserted below is read BEFORE anything is clicked.
//  4. The bundle stamp is read from the PAGE on every launch and printed, per lib.js's own rule.
//
// ══ NEGATIVE CONTROLS - four designed, four built on their own scratch bundles, four RUN ══════════════
//  NC1  resume affordance only (a '▶ Resume your game' row when playHist.length>0)
//        -> A, B and C go GREEN; D STAYS RED. This is the control that matters most after the trap above:
//           it proves a PARTIAL fix passes three of the four assertions, which is why D is separate.
//  NC2  the sheet differs, uselessly (heading gets a marker when a game is live, nothing else)
//        -> A goes GREEN while B, C and D stay RED. This is the vacuity control for A: it proves that
//           "the sheets differ" is NOT sufficient and that B and C are not redundant with it.
//  NC3  tapping ⌂ calls fullReset (the game is destroyed on the way out)
//        -> E1 goes RED and A/B/C do not change. E1 is this gate's premise - if the game does not survive
//           the house, every other assertion here is about the wrong screen - and NC3 is what proves E1
//           can fail rather than being a fact about the harness.
//  NC4  the candidate fix: resume row + '▶ Start game' arms once over a live game
//        -> A, B, C and D all GREEN. The finish line exists and is reachable.
//
// ══ NOT ASSERTED, deliberately, and named rather than left silent ════════════════════════════════════
//  - The second route the job measured (Home -> Discover -> the bottom tab bar -> Play). lib's b.tab()
//    could not find the tab bar from Home on this build in a probe run; rather than assert through a
//    helper that did not reach the state (the exact mistake drive/play.js's own header records for
//    'cpu-resigned'), the route is left to the fix's own verification and named here.
//  - The same defect for a vs-Computer or an Online game. Pass & Play is driven because it needs no
//    engine and no network; the job's notChecked says the same.
//  - '‹ Back to your analysis' on the Review side (TC-R24). Cited as the app's own pattern, not re-measured.
'use strict';
const L=require('../lib');
const P=require('../drive/play');
const crypto=require('crypto');

// the seven geometries of the test-authoring lane. 375x679 is the HARNESS geometry and is never used here.
const GEOS=[
  {k:'320x568',w:320,h:568},{k:'360x640',w:360,h:640},{k:'375x667',w:375,h:667},
  {k:'375x730',w:375,h:730},  // Kunal's phone
  {k:'390x844',w:390,h:844},{k:'414x896',w:414,h:896},{k:'440x956',w:440,h:956}];
const KUNAL='375x730';
// CT_GEO=375x730 runs one column only. The SUITE always runs all seven (the env is unset in gates.sh);
// it exists so a negative-control pass can redden one column in seconds instead of re-driving fourteen
// browsers, and every control result below is therefore reported at the column it was run at.
const ONLY=process.env.CT_GEO;
const md5=s=>crypto.createHash('md5').update(String(s)).digest('hex').slice(0,12);

// the setup sheet, read as the player sees it: its own buttons, its own text, its own height.
// Scoped to [data-ct="setup-sheet"] so the player bars and the tab bar BEHIND the overlay are not counted.
async function sheetSig(b){return b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="setup-sheet"]');
  if(!e)return {present:false};
  const r=e.getBoundingClientRect();
  const btns=[...e.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;})
    .map(x=>({t:(x.innerText||'').replace(/\s+/g,' ').trim(),y:Math.round(q1(x))}));
  function q1(x){return x.getBoundingClientRect().top;}
  return {present:true,h:Math.round(r.height*100)/100,w:Math.round(r.width*100)/100,
          txt:(e.innerText||'').replace(/\s+/g,' ').trim(),
          btns:btns.map(x=>x.t)};
});}

// drive a live Pass & Play game of 3 plies and leave it by the house, then open the Play setup sheet again
async function liveThenPlayTile(b){
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.settle(350);
  const pliesBefore=await P.plies(b);
  const boardBefore=await b.board();
  await b.tapCt('play-home',650);
  const onHome=await b.onHome();
  const pliesBehindHome=await P.plies(b);
  await b.tile('Play'); await b.settle(650);
  return {pliesBefore,boardBefore,onHome,pliesBehindHome};
}
// the CONTROL: the same sheet with no game ever started, opponent selection made IDENTICAL (Pass & Play)
async function freshSheet(b){
  await b.tile('Play'); await b.settle(550);
  await P.tapBtn(b,/^Pass & Play$/,450);
  await b.settle(350);
  return sheetSig(b);
}

const RESUME=/resum|back to your game|continue your game|game in progress|still playing/i;
const INPROGRESS=/in progress|resum|you have a game|unfinished|moves played|\b3 moves\b/i;

L.run(async()=>{
  let kunalLive=null,kunalFresh=null;

  for(const g of (ONLY?GEOS.filter(x=>x.k===ONLY):GEOS)){
    // ── the live side ──────────────────────────────────────────────────────────────────────────────
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:'',label:g.k},name:'resume-live-'+g.k});
    await b.open();
    if(g.k===KUNAL)L.note('page stamp at '+KUNAL+': '+(await b.stamp()));
    const st=await liveThenPlayTile(b);
    const live=await sheetSig(b);

    // E1 - THE PREMISE. Reddened by NC3. If this is not true the rest of this gate measures nothing.
    L.say(st.pliesBefore===3,g.k+': E1a the Pass & Play game really has 3 plies before leaving',{plies:st.pliesBefore});
    L.say(st.onHome===true&&st.pliesBehindHome===3,
      g.k+': E1 THE GAME SURVIVES THE HOUSE - play-moverow still reads 3 plies while Home is up, so there IS something to resume',
      {onHome:st.onHome,plies:st.pliesBehindHome});
    L.say(live.present===true,g.k+': E2 the Play tile opens the setup sheet over the live game',{h:live.h});

    // ── the control side: a second browser, no game ever, same opponent selected ────────────────────
    const c=await L.launch({geo:{w:g.w,h:g.h,safe:'',label:g.k},name:'resume-fresh-'+g.k});
    await c.open();
    const fresh=await freshSheet(c);
    L.say(fresh.present===true,g.k+': E3 the control sheet is reached with Pass & Play selected',{h:fresh.h});
    L.say(JSON.stringify(fresh.btns)===JSON.stringify(['‹ Home','📷 Scan with camera','🖼 Upload a photo','Online','Computer','Pass & Play','👥 Friends','📍 Play nearby','🏆 Tournaments','▶ Start game']),
      g.k+': E4 the control is the Pass & Play variant and nothing else - the confounder is removed, not merely hoped away',
      {btns:fresh.btns});

    // ── A. THE FINDING IN ONE NUMBER ───────────────────────────────────────────────────────────────
    L.say(live.txt!==fresh.txt,
      g.k+': A1 the sheet over a LIVE GAME differs in TEXT from the sheet with no game at all (controlled for the remembered opponent tile)',
      {liveMd5:md5(live.txt),freshMd5:md5(fresh.txt),liveH:live.h,freshH:fresh.h});
    L.say(JSON.stringify(live.btns)!==JSON.stringify(fresh.btns),
      g.k+': A2 ... and in its BUTTON SET',{live:live.btns,fresh:fresh.btns});

    // ── B. A WAY BACK EXISTS. The app already does this on Review (TC-R24). ────────────────────────
    const resumeBtns=live.btns.filter(t=>RESUME.test(t));
    L.say(resumeBtns.length>=1,
      g.k+': B a RESUME AFFORDANCE exists on the sheet - some control offers the way back to the running game',
      {matched:resumeBtns,allButtons:live.btns});

    // ── C. THE SCREEN SAYS SO. A control the player cannot interpret is not an affordance. ─────────
    L.say(INPROGRESS.test(live.txt),
      g.k+': C the sheet SAYS a game is in progress, in words, rather than only offering a button',
      {txt:live.txt.slice(0,220)});

    if(g.k===KUNAL){kunalLive=live;kunalFresh=fresh;}
    await c.close();

    // ── D. START GAME DOES NOT SILENTLY DESTROY THE RUNNING GAME ───────────────────────────────────
    // Read the sheet BEFORE the tap (measurement rule 3), then tap Start once and look at what happened.
    const btnsBefore=live.btns;
    await P.tapBtn(b,/^▶ (Start game|Start a new game.*)$/,1100);
    const pliesAfter=await P.plies(b);
    const sheetAfter=await sheetSig(b);
    const armed=sheetAfter.present&&sheetAfter.btns.some(t=>/tap again|are you sure|discard|confirm/i.test(t));
    L.say(pliesAfter===3||armed===true,
      g.k+': D ONE TAP ON START DOES NOT THROW THE GAME AWAY - either the 3 plies survive, or the button arms first (the #375 Resign pattern)',
      {pliesAfter,armed,btnsBefore:btnsBefore.length,sheetStillUp:sheetAfter.present});

    // ── D2. AND THE ARM MUST STILL LET THE PLAYER THROUGH. Added at #469 on antagonist A's finding that
    //    this was the one state the gate could not see. D above is `pliesAfter===3||armed===true`, which the
    //    ARM ALONE satisfies - so a build whose disarm effect fired on the arm itself would make
    //    "Start game" a PERMANENT NO-OP for every player with a live game, and this gate would go green on
    //    it. The gate asked whether the destructive tap was prevented and never whether the intended action
    //    was still possible. One tap more answers it.
    if(armed===true){
      await P.tapBtn(b,/tap again|discard/i,1300);
      const pliesAfter2=await P.plies(b);
      const sheetAfter2=await sheetSig(b);
      L.say(pliesAfter2===0&&sheetAfter2.present===false,
        g.k+': D2 THE SECOND TAP STARTS THE NEW GAME - the arm is a confirmation, not a dead end',
        {pliesAfter2,sheetStillUp:sheetAfter2.present});
    }else{
      // NOT ARMED. Then Start must have STARTED - and this is the branch that catches the no-op, which the
      // first version of D2 got wrong and which is the whole reason A's finding mattered. That version
      // asserted `pliesAfter===3` here, i.e. "the game survived", which is exactly what a PERMANENTLY DEAD
      // Start button also produces: no arm, no new game, 3 plies intact, D green on its first disjunct and
      // D2 green here. The hole A named would have survived the assertion written to close it. A Start that
      // neither arms nor starts is broken, so the only acceptable unarmed outcome is that a game began.
      L.say(pliesAfter===0,
        g.k+': D2 START IS NOT A NO-OP - with no arm, one tap must actually have started a game',
        {pliesAfter,armed});
    }

    L.say(b.errs.length===0,g.k+': E5 zero app errors across leave-and-return',b.errs.slice(0,3));
    if(g.k===KUNAL)await b.shot('54-resume-sheet-kunal730');
    await b.close();
  }

  // ══ THE THREE STATES THE ROW MUST STAY OUT OF, all added at #469 and every one of them a VETO on this
  //    build's first bundle 9d92f4f5e2c6. The row first rendered on "a game exists" and the assertions above
  //    cannot tell that from "a game can be continued" - B's closing point, and it is the same shape as the
  //    #432 trap: an assertion that pins the row's PRESENCE goes green on all three of these.
  //    Run at Kunal's geometry only, deliberately: every predicate here is a condition on game state with no
  //    viewport term in its expression, so the other six columns would buy repetition. Said rather than
  //    implied, per #411 - publish the scope with the count.
  {
    // G1/G2 - THE COUNT IS A MOVE COUNT, CHECKED AGAINST THE APP'S OWN MOVE ROW ON THE SAME SCREEN.
    // B measured "2 moves played" over `1.e4 1...d5`, "3" over `1.f3 1...e5 2.g4` and "4" over a two-move
    // mate - a factor of about two. The move row is NOT a readout fed by the thing under test (#389): it is
    // the live game's own move list, rendered from playHist, and it is readable behind the sheet.
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'resume-count-375x730'});
    await b.open();
    await P.states['pp-m0'](b);
    await b.move('e2','e4'); await b.move('d7','d5'); await b.settle(350);
    await b.tapCt('play-home',650); await b.tile('Play'); await b.settle(650);
    const s=await sheetSig(b);
    const rowTxt=(s.btns||[]).find(t=>RESUME.test(t))||'';
    const printed=(rowTxt.match(/\((\d+)\s+moves?\s+played\)/)||[])[1];
    const movesOnRow=await b.page.evaluate(()=>{
      const e=document.querySelector('[data-ct="play-moverow"]');
      if(!e)return null;
      const ns=[...(e.innerText||'').matchAll(/(\d+)\s*\./g)].map(m=>+m[1]);
      return ns.length?Math.max(...ns):null;
    });
    L.say(printed!==undefined&&movesOnRow!==null,
      KUNAL+': G1 both readouts are present - the row prints a count and the move row shows move numbers (non-vacuity)',
      {rowTxt,printed,movesOnRow});
    L.say(String(printed)===String(movesOnRow),
      KUNAL+': G2 THE ROW\'S COUNT AGREES WITH THE MOVE ROW behind it - 2 plies of 1.e4 d5 is ONE move, not two',
      {printed,movesOnRow,rowTxt});
    await b.close();
  }
  {
    // G3 - A FINISHED GAME IS NOT "in progress". Driven through fool's mate, with the game-over chrome
    // asserted FIRST so the state is proved reached rather than assumed (#385: when asserting X is absent in
    // state S, prove S was reached).
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'resume-mate-375x730'});
    await b.open();
    await P.states['pp-m0'](b);
    await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4'); await b.move('d8','h4');
    await b.settle(550);
    const over=await b.page.evaluate(()=>[...document.querySelectorAll('button')]
      .filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;})
      .map(x=>(x.innerText||'').replace(/\s+/g,' ').trim()));
    L.say(over.some(t=>/^Review$/i.test(t))&&over.some(t=>/^Rematch$/i.test(t)),
      KUNAL+': G3a PRECONDITION the game really is over - Review and Rematch have replaced Hint and Flip',
      {buttons:over.slice(0,12)});
    await b.tapCt('play-home',650); await b.tile('Play'); await b.settle(650);
    const s=await sheetSig(b);
    L.say(s.present===true&&!(s.btns||[]).some(t=>RESUME.test(t)),
      KUNAL+': G3 NO RESUME ROW OVER A FINISHED GAME - a checkmated game cannot be resumed, and offering it was a no-op that lied',
      {btns:s.btns});
    L.say(s.present===true&&!/in progress/i.test(s.txt),
      KUNAL+': G3b and the sheet does not claim a game is IN PROGRESS when it is over',{txt:(s.txt||'').slice(0,160)});
    // AND THE ARM MUST STILL FIRE HERE - the asymmetry is deliberate. A finished game cannot be resumed but
    // it can still be DESTROYED, and Review is only reachable from the game-over screen one tap replaces
    // (fingerprint 8c887399f3704a18, filed 2026-09-28). So this is the one place the two conditions differ.
    const pliesBeforeTap=await P.plies(b);
    await P.tapBtn(b,/^▶ Start game$/,1100);
    const pliesAfterTap=await P.plies(b);
    const armedOver=(await sheetSig(b));
    L.say(pliesAfterTap===pliesBeforeTap||(armedOver.btns||[]).some(t=>/tap again|discard/i.test(t)),
      KUNAL+': G3c THE ARM STILL PROTECTS A FINISHED GAME - one tap does not throw away the game you were about to review',
      {pliesBeforeTap,pliesAfterTap,btns:armedOver.btns});
    await b.close();
  }
  {
    // G4 - WITH Online SELECTED THE ROW MUST BE GONE. The pair's one COMMON finding, reached from both doors:
    // A from the diff (the row's condition and the committer's disagreed on opponent==='online', which is the
    // exact second-disagreeing-condition the #466 comment beside the committer warns about), B from the
    // surface (play-moverow goes null the moment the tile is tapped, so the row was offering a screen that is
    // no longer mounted and delivering a Google sign-in wall, silently, two taps from Home).
    const b=await L.launch({geo:{w:375,h:730,safe:'',label:KUNAL},name:'resume-online-375x730'});
    await b.open();
    await P.states['pp-m0'](b);
    await b.move('e2','e4'); await b.move('d7','d5'); await b.settle(350);
    await b.tapCt('play-home',650); await b.tile('Play'); await b.settle(650);
    const before=await sheetSig(b);
    L.say((before.btns||[]).some(t=>RESUME.test(t)),
      KUNAL+': G4a PRECONDITION the row IS there with Pass & Play selected, so G4 is a claim about Online and not about the fixture',
      {btns:before.btns});
    await P.tapBtn(b,/^Online$/,650);
    const s=await sheetSig(b);
    L.say(s.present===true&&!(s.btns||[]).some(t=>RESUME.test(t)),
      KUNAL+': G4 NO RESUME ROW WITH Online SELECTED - the live Play screen is unmounted there, so the row promised a game and delivered a sign-in wall',
      {btns:s.btns});
    L.say(b.errs.length===0,KUNAL+': G4b zero app errors across the opponent switch',b.errs.slice(0,3));
    await b.close();
  }

  // ── the headline, printed once so the run report can quote a single number ───────────────────────
  if(kunalLive&&kunalFresh){
    L.note('AT KUNAL\'S 375x730: live sheet md5(txt)='+md5(kunalLive.txt)+' h='+kunalLive.h
      +'  |  no-game control md5(txt)='+md5(kunalFresh.txt)+' h='+kunalFresh.h
      +'  |  identical='+(kunalLive.txt===kunalFresh.txt));
  }
},'54-play-resume');
