// regress/16-cpu-result-line.js  #434, extended by #435.  THE ONE STATUS SLOT ABOVE THE BOARD STATES THE
// RESULT AFTER THE RESULT CARD HAS GONE, IN EVERY ORIENTATION, AND THE BOARD DOES NOT MOVE WHEN IT DOES.
// #434 (blocks A-D, portrait): vs the COMPUTER an adaptive-strength note held that slot for ever.
// #435 (blocks E-F, landscape 730x375): the row was not rendered AT ALL once the game was over and `wide`,
//   so NEITHER opponent stated a result - and the bottom tab bar returning at game over put a 62px spacer
//   into the flow, which the board-fit loop paid for by shrinking the board 224.00 -> 192.00.
//
// THE DEFECT THIS GUARDS (jobs/cpu-game-over-says-nothing-three-seconds-later-2026-09-29, the #433 auditor's
// P1). chess.jsx:5616 is the only status line a phone has, and its done-branch read
//   (opponent==='computer'&&eloMsg) ? eloMsg : (resultCardGone ? (_res||_op) : _op)
// so vs the computer the strength note pre-empted the result unconditionally. MEASURED on the shipped #433
// bundle at 375x730, vs Pip, resign at move 0: at +1.8s the card reads 'Resigned You lose' and the slot reads
// '▼ Strength now ~450 Elo'; at +6.8s the card is gone, the slot STILL reads the strength note, and a scan of
// every painted element under 44 chars matching the result vocabulary returns ZERO hits. Pass & Play, same
// geometry, same probe, reads 'Resigned · Black wins' in the same slot. The two messages now split by TIME.
//
// THE CONTROL IS FREE AND IT IS THE REAL BROKEN BUILD, which is the strongest kind (#432's lesson: a control
// that only exercises what the fix added cannot see the defect the fix removes):
//   CT_APP=<the #433 bundle> gates/gates.sh '#433' '16-cpu-result-line'
// MEASURED there, and the count below is the run's own, not an estimate: 6 RED of 28 (this header said "of 27"
// from #434 until antagonist A counted the A-D PASS/FAIL lines on a real run and got 28 - off by one, carried
// forward unchanged into #435 and corrected here [R18]), and they are exactly
// A2b, A3, A4 at 375x730 and B2b, B3, B4 at 320x568 - every vs-computer assertion about what the slot says
// after the fade, at both geometries. C (the eloMsg-EMPTY branch) and D (Pass & Play) stay GREEN, which is
// the point of carrying them: they are the two inputs #433 already got right, so the control localises the
// defect to the pre-emption and to nothing else. Each red reads the strength note where the result belongs,
// or an empty hit list - the RIGHT reason, never a missing hook.
// (An earlier draft of this header said "4 red of 26" before the control had been run. Withdrawn [R18].)
// AND IT CANNOT GO RED FOR THE WRONG REASON: this build adds NO selector. [data-ct="play-opening"] is #370's
// and has been in every bundle since, so a red here is wrong TEXT and never a missing hook.
//
// WHY EACH ASSERTION IS SHAPED THE WAY IT IS:
//  * PRESENCE BEFORE ABSENCE (#385). A1/B1 assert the strength note IS in the slot while the card is up. Without
//    that, C's green would be indistinguishable from a build where eloMsg never gets set at all, and the whole
//    assertion would be about a state it never entered.
//  * THE TEMPLATE, NOT A REGEX (#388). A2 requires the slot to equal the app's own two-part result string
//    exactly - head + ' · ' + sub - and A3 pins the sub to a FACT ABOUT THE GAME: this side resigned as White,
//    so the player lost, whatever any readout says. A bare /win|lose/ alternation would pass on either.
//  * WHAT DID THE CUTTING (#387/#394). A6/B6 assert the slot is not silently truncated (scrollWidth <=
//    clientWidth + 1 on a nowrap ellipsis span). A FIRST DRAFT OF THIS COMMENT CLAIMED THAT MAKES ANY
//    ATTEMPT TO CONCATENATE THE TWO MESSAGES FAIL HERE, AND THAT IS WRONG AT KUNAL'S OWN GEOMETRY [R18].
//    MEASURED in this very span, by writing each string into it and reading scrollWidth against clientWidth:
//    'Resigned · You lose' is 143, '▼ Strength now ~450 Elo' is 183, and the two joined are 340. The slot's
//    maxWidth is 96vw, so it is 360 at 375 and 307.2 at 320. 340 therefore FITS at 375 and is cut by 33px at
//    320 - so B6 catches a concatenation and A6 does not, and the honest reason for not concatenating is the
//    320 phone plus the fact that 340px of two joined messages at 13px buries the one fact the player needs,
//    NOT that it overflows his phone. (The draft also carried 159.2px for the result, which is the Pass & Play
//    string 'Resigned · Black wins'; the vs-computer string is 142.6.)
//  * THE BOARD IS SACRED. A7/B7 assert the board's width and top are identical across the card fade, so a fix
//    that bought the result by moving the board would go red here. THIS BULLET SAID "A4" UNTIL ANTAGONIST A
//    CAUGHT IT [R18]: A4 is the painted-element scan and is one of the six published reds, so naming it here
//    told a reader auditing the control that #433's board MOVED across the fade - which that same log disproves,
//    its A7 PASS reading {"up":{"w":353.03,"y":93.75},"down":{"w":353.03,"y":93.75}}. One id, inverted meaning.
//    AND WHAT A7 CAN ACTUALLY SEE IS NARROWER THAN IT LOOKS, also A's measurement: chess.jsx:5617 gives the
//    status row height:18 with flexShrink:0 and the slot is one nowrap line inside it, so on the shipped bundle
//    the board reads 353.03/93.75 with the real text, with 400 characters in the slot, with whiteSpace:normal
//    wrapping to many lines, AND at fontSize:40px. No change confined to _txt or to this span's type can move
//    the board, so A7 is NOT the evidence for "the fix costs no board height" - it is a guard against a future
//    fix that ADDS A ROW. The evidence for the height claim is the 353.03/93.75 pair plus the fact that the
//    diff adds no element.
//  * FOUR INPUTS, NOT ONE (R18): two geometries, the eloMsg-empty branch at the Elo floor, and Pass & Play.
// CONTROL-RECORD: d411122 2026-11-11 total=214 red=4 scope=trial:22d06e1d82b1 how=#550 item (26): the played game's end line naming the WINNER as the one who resigned (_nm(_pe.winner)+' resigned') - the four resigned-result lines red; every other line green
// CONTROL-RECORD: 341b0b4 2026-11-06 total=192 red=14 scope=trial:37e784f6bfd4 how=#549 item (2): the default --pcfilter put back to the keyword 'none' (the original defect) - TC-PL-049 and TC-PL-049b's black-shadow lines red in all four image skins at both geometries, the 049b captured line, and TC-PL-049c's four captured lines (classic, merida, chessnut, spatial); Medieval stays green
// CONTROL-RECORD: 341b0b4 2026-11-06 total=192 red=5 scope=trial:18d73ab430a0 how=#549 item (2): the Medieval skin's pcf set to 'none' - exactly TC-PL-049c's five Medieval shadow lines red (black and white at kunal761 and se, and the captured line)
// CONTROL-RECORD: 519c499 2026-11-06 total=214 red=4 scope=trial:9c675c029fe8 how=#549 (49) A4-R3: HEAD a9e66ac's bundle, which puts the private CTEnded tag in Copy PGN and in pgnText: TC-PL-064 red at kunal761 and se (copied PGN and paste-box PGN both carry [CTEnded "You resigned"]), preconditions green. Trial 8c38127af12b green; subset total 214 on fda728bd1f56
// CONTROL-RECORD: ae81691 2026-11-12 total=214 red=2 scope=trial:c3792a12131c how=#550 re-control of the gate as it stands today (ASSERTIONS-MOVED; main's own bundle leaves it green): the a23 land-result card's headline blanked, so the sideways result is stated nowhere - first red: E6 730x375: the painted-element scan finds it - this returned [] on #4
'use strict';
const L=require('../lib');const P=require('../drive/play');
const RES_RE=/won|win|lose|lost|Time!|Resigned|Checkmate|Stalemate|draw/i;

// every painted element whose OWN text is a short result-shaped string; head/style/invisible excluded
async function resultHits(b){
  return b.page.evaluate((src)=>{
    const re=new RegExp(src,'i'),out=[];
    for(const el of document.querySelectorAll('body *')){
      if(el.tagName==='STYLE'||el.tagName==='SCRIPT')continue;
      let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.textContent;
      t=t.replace(/\s+/g,' ').trim();
      if(!t||t.length>44||!re.test(t))continue;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
      out.push({t,y:+r.y.toFixed(1),w:+r.width.toFixed(1)});
    }
    return out;
  },RES_RE.source);
}
// #435, ON ANTAGONIST A'S VETO. E3/F3 originally filtered resultHits() for /Strength (now|stays)/, and
// resultHits() pre-filters every element by RES_RE - which does not contain the words "strength", "now" or
// "Elo". So the string the assertion was hunting could never reach the filter, strengthUp was [] on EVERY
// bundle, and [].length<=1 CANNOT FAIL. A measured it on the one build in existence where the duplicate chip
// is actually painted (#434, 730x375, card up): resultHits() returned only [{"t":"Resigned"},{"t":"You lose"}],
// the honest scan returned [{"t":"▼ Strength now ~450 Elo",x:373.3,y:47.5,w:207.4,h:23}], and
// RES_RE.test("▼ Strength now ~450 Elo") is false. The assertion the amber record cited as "counts painted
// elements rather than trusting the diff" counted nothing, on the build where the thing it counts was on
// screen. Sixth costume of the trap CLAUDE.md records five times, in its narrowest form: THE FILTER THAT
// SELECTS THE CASE WAS THE SAME OBJECT AS THE PROPERTY BEING ASSERTED. Its own scan now, keyed to its own
// vocabulary. Verified after the repair: 1 hit at card-up on #434 and on #435, 0 from +2.6s on #435.
async function strengthHits(b){
  return b.page.evaluate(()=>{
    // ANY wording of the adaptive strength, not one phrasing: the note above the board says
    // "▼ Strength now ~450 Elo" and the landscape rail says "≈450 Elo", and the whole finding is that
    // BOTH were on screen at once while the result was on screen not at all. A regex for the note alone
    // returns 1 on the broken bundle and 1 on the fixed one and discriminates nothing - which is what the
    // first repair of this assertion did, caught here by measuring it rather than by arguing about it.
    const re=/(strength (now|stays))|([≈~]\s*\d{3,4}\s*Elo)|(\d{3,4}\s*Elo)/i,out=[];
    for(const el of document.querySelectorAll('body *')){
      if(el.tagName==='STYLE'||el.tagName==='SCRIPT')continue;
      let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.textContent;
      t=t.replace(/\s+/g,' ').trim();
      if(!t||t.length>44||!re.test(t))continue;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
      out.push({t,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});
    }
    return out;
  });
}
async function slot(b){
  return b.page.evaluate(()=>{
    const el=document.querySelector('[data-ct="play-opening"]');if(!el)return null;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    return {t:(el.textContent||'').replace(/ /g,' ').replace(/\s+/g,' ').trim(),
            x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),
            sw:el.scrollWidth,cw:el.clientWidth,nowrap:cs.whiteSpace,ell:cs.textOverflow,op:+cs.opacity};
  });
}
// #473: the three helpers block G needs. fwdState is its WITNESS - see the block header for why the 64
// squares were rejected as one. tapBack/tapFwd are GUARDED because P.tapBtn throws on a missing target and
// #393 measured that taking a whole gate down hides every assertion after it.
async function fwdState(b){
  return b.page.evaluate(()=>{
    for(const x of document.querySelectorAll('button')){
      if((x.textContent||'').replace(/\s+/g,' ').trim()!=='Forward')continue;
      const r=x.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      return {found:true,dis:!!x.disabled,x:+r.x.toFixed(1),y:+r.y.toFixed(1)};
    }
    return {found:false,dis:null};
  });
}
async function cardBox(b){return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="result-card"]');if(!e)return null;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return null;return {t:(e.textContent||'').replace(/\s+/g,' ').trim(),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});}
async function moveRow(b){return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.textContent||'').replace(/\s+/g,' ').trim():null;});}
async function tapBack(b){try{const r=await P.tapBtn(b,/^Back$/,500);return {ok:true,box:r&&r.x!=null?{x:+r.x.toFixed(2),y:+r.y.toFixed(2)}:null};}catch(e){return {ok:false,err:e.message};}}
async function tapFwd(b){try{await P.tapBtn(b,/^Forward$/,500);return {ok:true};}catch(e){return {ok:false,err:e.message};}}
async function resign(b){
  await P.tapBtn(b,/^More$/,700);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1200);
}

L.run(async()=>{
  // ══ A and B: vs the COMPUTER (Pip, 500 Elo), resigning as White at move 0, at two geometries ══
  // Resign is the fastest deterministic decisive termination vs the computer and it is one of the two the
  // auditor measured; it sets eloMsg because 500-50 = 450 != 500, which is the state under test.
  for(const [tag,geo] of [['A','kunal730'],['B','se']]){
    const b=await L.launch({geo,name:'cpu-result-'+geo,store:{ct_pool:'3'}});await b.open();
    await P.states['setup'](b);await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);
    await b.settle(250);
    await resign(b);
    await b.settle(600);                                   // card still up (it fades at ~3s)
    const upCard=await b.text('[data-ct="result-card"]'),upSlot=await slot(b),upBd=await b.board();
    L.say(!!upCard&&/Resigned/.test(upCard),tag+'1a '+geo+': resigning as White at move 0 puts the result CARD up, reading Resigned',{card:upCard});
    L.say(!!upSlot&&/Strength now ~\d+ Elo/.test(upSlot.t),tag+'1b '+geo+': and while the card is up the status slot carries the adaptive-strength note - asserted BEFORE the absence below, so a green here cannot come from eloMsg never being set (#385). The number is deliberately NOT pinned: a literal ~450 couples this gate to Pip being 500 and the step being 50, so changing either constant would redden an assertion that is about the slot and not about the ladder (antagonist A, F12)',{slot:upSlot&&upSlot.t});
    await b.settle(5000);                                  // card gone
    const goneCard=await b.text('[data-ct="result-card"]'),dn=await slot(b),hits=await resultHits(b),dnBd=await b.board();
    L.say(goneCard===null,tag+'2a '+geo+': ~6.8s after the resignation (measured with Date.now() from the confirm tap to the read: 6.81s at both geometries) the result card has gone',{card:goneCard});
    const want='Resigned · You lose';
    L.say(!!dn&&dn.t===want,tag+'2b '+geo+': and the status slot now states the result, as the app\'s own two-part string head + " · " + sub - not a regex any wording would satisfy (#388)',{slot:dn&&dn.t,want});
    L.say(!!dn&&/You lose/.test(dn.t),tag+'3 '+geo+': and the outcome it names is the one the GAME had - this side resigned as White, so the player lost, which is a fact about the game and not a reading off a sibling element (#389)',{slot:dn&&dn.t});
    L.say(hits.length>=1&&hits.some(h=>h.t===want),tag+'4 '+geo+': a scan of every painted element under 44 chars matching the result vocabulary finds the result on screen - this returned ZERO hits on the shipped #433 bundle',{hits});
    L.say(!!dn&&dn.op===1,tag+'5 '+geo+': the slot is actually painted (opacity 1), not present-and-invisible',{opacity:dn&&dn.op});
    L.say(!!dn&&dn.nowrap==='nowrap'&&dn.sw<=dn.cw+1,tag+'6 '+geo+': and nothing in that slot is silently cut - it is a nowrap ellipsis span whose scrollWidth fits its clientWidth. MEASURED in this span: the result is 143, the strength note 183, the two joined 340, and the slot is 96vw = 360 at 375 but 307.2 at 320 - so this assertion catches a concatenation at 320 and NOT at 375 (#387, #394)',{sw:dn&&dn.sw,cw:dn&&dn.cw,white:dn&&dn.nowrap,ell:dn&&dn.ell}); /* #435 pays a debt #434 left on the pen deliberately, being antagonist A's closing refinement on the run that gated this file: THIS ASSERTION IS THINNEST EXACTLY WHERE NOTHING REACHES IT. The longest string the code can put in this slot is the DRAW strength note 'Draw - strength stays ~N Elo' at 235.7px against B's 307.19px cap at 320 - about nine characters of margin - and the draw branch is the one input neither antagonist could drive (see the eloMsg-branches note at the foot of this file). So a green B6 is evidence about the loss wording and near-silent about the draw wording. #434 left it out because editing a gate file AFTER the run that gated it is the discrepancy A's own F4 caught; it goes in here with the first change to this file, so the file is still byte-identical to the log that gates it. */
    L.say(!!upBd&&!!dnBd&&Math.abs(upBd.w-dnBd.w)<0.05&&Math.abs(upBd.y-dnBd.y)<0.05,tag+'7 '+geo+': and the board did not move across the card fade, to the hundredth of a pixel - the tolerance is 0.05 rather than 0.6 so that the gate asserts what the build CLAIMS (measured delta: exactly 0.0000) - the slot changing its text must never cost board geometry',{up:upBd&&{w:+upBd.w.toFixed(2),y:+upBd.y.toFixed(2)},down:dnBd&&{w:+dnBd.w.toFixed(2),y:+dnBd.y.toFixed(2)}});
    L.say(b.errs.length===0,tag+'8 '+geo+': zero app errors across the termination',b.errs.slice(0,3));
    await b.shot('cpu-result-'+geo);
    await b.close();
  }

  // ══ C: THE eloMsg-EMPTY BRANCH, which the job named as the unmeasured one ══
  // At the Elo FLOOR a loss cannot lower the strength: chess.jsx:3143 gives ne = max(400, 400-50) = 400,
  // equal to cpuElo, so chess.jsx:3144 never fires and eloMsg stays ''. No bot is tapped, because picking
  // one calls setCpuElo(bot.elo) and would overwrite the seeded floor. This input was ALREADY correct on
  // #433 and must stay green on both bundles: it is what proves the defect was the pre-emption and nothing else.
  {
    const b=await L.launch({geo:'kunal730',name:'cpu-result-elofloor',store:{ct_pool:'3',ct_elo:'400'}});await b.open();
    await P.states['setup'](b);await P.tapBtn(b,/^▶ Start game$/,900);await b.settle(250);
    const elo=await b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return null;}});
    L.say(elo==='400','C0 375x730: the floor is READ BACK, not inferred - ct_elo is 400 going into the termination, so ne = max(400, 400-50) = 400 == cpuElo and chess.jsx:3144 cannot fire. Without this the whole C block explained an empty slot by a state it never checked (antagonist A, F10)',{ct_elo:elo});
    await resign(b);
    await b.settle(600);const upSlot=await slot(b);
    // ANY STRENGTH NOTE, IN EITHER CASE [#545, item (49)]. chess.jsx's three notes are '▲ Strength now ~N Elo',
    // '▼ Strength now ~N Elo' and 'Draw — strength stays ~N Elo'; /Strength/ was case-sensitive and missed the third.
    const STR16=/strength/i;
    {const yes=['▲ Strength now ~840 Elo','▼ Strength now ~380 Elo','Draw — strength stays ~400 Elo'],no=['Resigned · You lose','Checkmate · You win','Draw agreed'];
     L.say(yes.every(t=>STR16.test(t))&&!no.some(t=>STR16.test(t)),'TC-SUITE-265 C1 the strength-note pattern catches all three notes the app prints and no result line (checked both ways)',{missed:yes.filter(t=>!STR16.test(t)),wronglyCaught:no.filter(t=>STR16.test(t))});}
    L.say(!!upSlot&&!STR16.test(upSlot.t),'C1 375x730: at the Elo floor a loss changes no strength, so the slot carries NO strength note while the card is up - the branch the job called unmeasured',{slot:upSlot&&upSlot.t});
    await b.settle(5000);const dn=await slot(b),hits=await resultHits(b);
    L.say(!!dn&&dn.t==='Resigned · You lose','C2 375x730: and with the slot free the result appears there exactly as it does for Pass & Play',{slot:dn&&dn.t});
    L.say(!!dn&&!STR16.test(dn.t)&&hits.some(h=>h.t==='Resigned · You lose'),'C3 375x730: with no strength note to pre-empt it, this input was already correct on #433 and stays correct here',{slot:dn&&dn.t,hits});
    L.say(b.errs.length===0,'C4 375x730: zero app errors at the Elo floor',b.errs.slice(0,3));
    await b.close();
  }

  // ══ D: PASS & PLAY, the auditor's own control - the same slot, the same code path, no eloMsg ever ══
  {
    const b=await L.launch({geo:'kunal730',name:'cpu-result-passplay',store:{ct_pool:'3'}});await b.open();
    await P.states['pp-m0'](b);await b.settle(250);
    await resign(b);
    await b.settle(5600);const dn=await slot(b),hits=await resultHits(b);
    L.say(!!dn&&dn.t==='Resigned · Black wins','D1 375x730: Pass & Play states its result in the same slot - White resigned, so BLACK wins, and the sentence names the winner rather than a first person who does not exist in a two-player game',{slot:dn&&dn.t});
    L.say(hits.some(h=>h.t==='Resigned · Black wins'),'D2 375x730: and the painted-element scan finds it, which it did on #433 too - this is the control that made the vs-computer absence a defect rather than a design',{hits});
    L.say(b.errs.length===0,'D3 375x730: zero app errors across a Pass & Play resignation',b.errs.slice(0,3));
    await b.close();
  }


  // ══ G: ONE BACK TAP MUST NOT TAKE THE RESULT AWAY (TC-PL-037) ══════════════════════════════════════
  // jobs/play-status-slot-loses-the-result-on-one-back-tap-2026-09-30, the uat-internal-challenger's P1.
  // THE CASE ID IS TC-PL-037 AND NOT THE TC-PL-035 THE JOB PROPOSES: that id was taken by #438's landscape
  // case six days before this job was written. This project has already paid for one id collision it has not
  // fully unwound (TC-R05 names two different cases in two documents), so the id was checked against BOTH
  // homes - claude/stories/TEST-CASES.md and a grep of gates/regress - before being used. 037 is free in both.
  // #473. THE DEFECT: chess.jsx's status row opened with `_done=(isOver||playEnd)`, and `isOver` reads
  // `boardGame` = playHist[pvIdx], which is the ply being PREVIEWED. So the row's question was "is the
  // position on the board terminal" when the answer it needed was "is the GAME finished", and one tap on
  // Back emptied the slot the result owns. MEASURED on the shipped #471 bundle (40c8cdb1bcff) at three
  // geometries: slot "Checkmate! · Black wins" -> "", result-vocabulary hits 1 -> 0, at 375x730, 375x568
  // and 320x568 alike. #434 bought this slot and #435 extended it; one Back tap restored #434's own
  // zero-hit state on Kunal's geometry.
  //
  // WHY THE MATE ARM AND THE RESIGN ARM ARE BOTH HERE, AND WHICH ONE IS THE CONTROL. `playEnd` is set by a
  // resignation and is NOT ply-keyed, so the resign arm was always green and STAYS green on every bundle in
  // this episode - it is the negative control that localises the defect to the ply-keyed half and proves a
  // red in the mate arm is not this block's own wiring. Every input in blocks A-D resigns, which is exactly
  // why 2831 assertions could read green over this: no input in the suite had ever reached a real checkmate
  // and then stepped back.
  //
  // THE JOB'S PRESCRIBED FIX WAS INSUFFICIENT AND THE CONTROL IS WHAT SHOWED IT, which is the reason this
  // header carries three bundle hashes instead of one. The job says "move :5671's _done to _gameOver" and
  // stop. Built as NC1 (71b9a016cc61) and measured: slot "Checkmate! · Black wins" -> "", hits 1 -> 0,
  // BYTE-FOR-BYTE the shipped defect - because `_res` reads `(_done&&gameResult)` and `gameResult` is
  // ITSELF gated on `(isOver||playEnd)`, so the repaired `_done` had nothing to render. NC2 (8a462df91126)
  // additionally gated gameResult on `_gameOver` but left `head` and `_winSide` reading the previewed ply:
  // hits 1 -> 2, painting "Stalemate" at y251.8 and "Draw" at y276.8 over a game Black had won by
  // checkmate - a WRONG result, which is worse than an absent one. The shipped fix (acaa5090955e) reads
  // 1 -> 1 at every input. CLAUDE.md: "the fix a flag proposes is a hypothesis, not a prescription."
  //
  // G2 IS THE ASSERTION THAT STOPS G3 BEING VACUOUS, and it is here because of #416's lesson - a control
  // that disturbs something real and leaves the MEASURED quantity untouched reads exactly like a gate that
  // cannot fail. "The result is still on screen after a tap" passes trivially if the tap did nothing. So the
  // tap is WITNESSED independently of the slot: at the terminal ply `Forward` is disabled (nothing ahead of
  // it) and after one Back tap it is ENABLED. Measured on the fixed bundle, both endings, all three
  // geometries: dis true -> false. If that ever reads false->false the ply never moved and G3 is withdrawn.
  // The 64 squares were tried first as the witness and REJECTED by measurement, not by argument: the pieces
  // are images, so the grid's text is 16 characters of rank and file labels and is byte-identical before and
  // after the tap - a witness that cannot witness.
  // AND G2c EARNED ITS KEEP ON ITS VERY FIRST RUN, AGAINST THIS BLOCK'S OWN CONTROL. The resign arm first
  // resigned at move 0, copying blocks A-D. At move 0 there is no earlier ply, so Back has nowhere to go:
  // measured dis true -> TRUE at all three geometries, 3 red. The slot assertion G3 was GREEN in all three,
  // because an unchanged slot across a tap that did nothing is indistinguishable from a working fix. Had the
  // witness not been there the resign arm would have been three vacuous passes presenting themselves as a
  // negative control. The arm now plays 1.f3 e5 2.g4 before resigning. This is #416's rule catching the
  // author of the gate that cites it, which is the most useful thing in this block.
  //
  // G5 IS A SECOND INSTANCE OF THE SAME CLASS, FOUND BY SWEEPING `isOver` RATHER THAN BY DRIVING IT [R06].
  // `_resultKey` was also `(isOver||playEnd)`, so Back flipped it 1->0 (whose effect RESETS resultCardFade
  // and resultCardGone and returns early) and Forward flipped it back to 1, RESTARTING both timers - so the
  // dismissed result card re-opened over the board on every Back/Forward round trip, for ever. Measured on
  // #471: cardAfterForward "Checkmate!Black wins" on the mate arm at all three geometries, null on the
  // resign arm. The job does not mention it.
  //
  // NOT COVERED, said rather than implied [R18]: the vs-COMPUTER mate (the job proposed 12 inputs over two
  // opponents; this is 6 over one). Driving Pip into a real mate is not deterministic at a per-build cost,
  // and the ply-keyed mechanism is opponent-independent - `isOver`, `gameResult` and `_resultKey` never read
  // `opponent`. Blocks A-C already carry the vs-computer arm of this slot at two geometries. AND THAT
  // OPPONENT-INDEPENDENCE IS NO LONGER AN ARGUMENT: antagonist A drove the vs-computer mate in BOTH
  // directions (I mate Pip, and Pip mates me, via Play-from-here) at 375x730 and at 730x375, and the slot
  // held 'Checkmate! · You win! 🎉' and 'Checkmate! · You lose' across the Back tap with the board
  // unchanged at 353.03 and 216 - while #471 read "" on the same input. So the generalisation this paragraph
  // makes is now a measurement. It is still not a per-build assertion, which is why it stays listed here.
  // A STALEMATE STEPPED BACK IS NOW COVERED, in block L below - it was named here as uncovered until
  // antagonist A pointed out it is the ONLY input that evaluates `_gameTermStatus==='stalemate'` and the
  // `_winSide===null` fall-through, i.e. half of the new gameResult expression. STILL not covered: a TIME
  // loss stepped back, a DRAW BY AGREEMENT or threefold stepped back (A drove threefold by hand and the slot
  // held 'Draw · Threefold repetition', so it is measured once but not gated), stepping back MORE than one
  // ply (A drove 25 taps to ply 0 and the slot held), and landscape (blocks E/F own that viewport).
  for(const [tag,geo] of [['G','kunal730'],['H','short375'],['I','se']]){
    for(const ending of ['mate','resign']){
      const t=tag+(ending==='mate'?'m':'r');
      const b=await L.launch({geo,name:'back-keeps-result-'+geo+'-'+ending,store:{ct_pool:'3'}});await b.open();
      if(ending==='mate')await P.states['pp-mate'](b);       // 1.f3 e5 2.g4 Qh4# in Pass & Play
      else{await P.states['pp-m0'](b);                      // TWO PLIES FIRST, and that is not decoration:
        await b.move('f2','f3');await b.settle(250);        // resigning at move 0 leaves NOWHERE for Back to
        await b.move('e7','e5');await b.settle(250);        // go, so G2c read dis true->true and G3 passed on
        await resign(b);}                                   // a tap that did nothing - see the header. TWO and
                                                            // not three because resign() resigns the SIDE TO
                                                            // MOVE: after 1.f3 e5 that is White, so Black wins
                                                            // and both arms of this block end "Black wins".

      await b.settle(4400);                                  // past resultCardGone (3300ms)
      const want=ending==='mate'?'Checkmate! · Black wins':'Resigned · Black wins';
      const pre=await slot(b),preHits=await resultHits(b),preFwd=await fwdState(b);
      // PRESENCE BEFORE ABSENCE (#385): without this a build whose slot never states a result at all would
      // satisfy the "unchanged across the tap" assertion below with two empty strings.
      L.say(!!pre&&pre.t===want,t+'1 '+geo+' '+ending+': the slot states the result BEFORE any tap, as the app\'s own two-part string head + " · " + sub, not a regex any wording would satisfy (#388). BLACK wins at both endings - by Qh4# on the mate arm, and because resign() resigns the side to move and after 1.f3 e5 that is White - which is a fact about the game, true whatever any readout says (#389)',{slot:pre&&pre.t,want});
      L.say(preFwd.found&&preFwd.dis===true,t+'2a '+geo+' '+ending+': and we are genuinely AT the last ply - Forward is present and DISABLED, so the Back tap below has somewhere to go and this block is not measuring a mid-game position',{forward:preFwd});
      const tap=await tapBack(b);                            // guarded: a missing control goes red HERE and
      L.say(tap.ok,t+'2b '+geo+' '+ending+': the painted Back control exists and takes the tap',tap);
      await b.settle(900);                                   // does not take the rest of the block down (#393)
      const post=await slot(b),postHits=await resultHits(b),postFwd=await fwdState(b);
      L.say(tap.ok&&postFwd.found&&postFwd.dis===false,t+'2c '+geo+' '+ending+': THE WITNESS - Forward is now ENABLED, so the tap really moved the previewed ply. Without this, G3 passes on a tap that did nothing, which is #416 exactly',{before:preFwd,after:postFwd});
      // THE DEFECT ITSELF, asserted on the slot ELEMENT rather than on a substring of body text, so "no slot
      // at all" is a measurement and not a silence (#393/#394).
      // #548, the follow-up to item (126) [e4ed497]: Kunal's choice questions/B8B-BACK-AFTER-GAME-OVER ('final-only') - THE RESULT IS STATED
      // ONLY AT THE LAST MOVE. G3/G4 asserted the opposite (#471's 'the row answers whether the GAME is finished'), which was right until
      // he chose; they are inverted, and G1 (stated at the terminal ply) and G6 (stated again after the round trip) still hold the other half.
      // NOT TIGHTENED TO 'non-empty' (#548 round-1 antagonist A, note 7, tried and withdrawn): MEASURED on the trial, one ply back in
      // these mate and resign games the slot is EMPTY because they reach no named opening, so an empty slot is the right reading here -
      // the non-empty pin went red 5 times on a correct build. What the slot shows one ply back is pinned by 4b, which has an opening.
      L.say(!!post&&post.t!==want,t+'3 '+geo+' '+ending+': one Back tap after the game ended, the slot does NOT state the result - it is stated only at the last move (Kunal, final-only)',{slot:post&&post.t,want});
      L.say(!postHits.some(h=>h.t===want),t+'4 '+geo+' '+ending+': and an independent painted-element scan finds that string NOWHERE on screen one ply back',{hits:postHits,want});
      // G5: the second instance of the class - the dismissed card must not re-open on the way back.
      const fwd=await tapFwd(b);await b.settle(800);
      const card=await b.text('[data-ct="result-card"]'),back=await slot(b);
      L.say(fwd.ok&&card===null,t+'5 '+geo+' '+ending+': stepping Forward again does NOT re-open the dismissed result card. `_resultKey` was ply-keyed too, so on #471 this read "Checkmate!Black wins" on the mate arm - the card the player had already watched fade came back over the board, and would on every round trip',{card,fwd});
      L.say(!!back&&back.t===want,t+'6 '+geo+' '+ending+': and the slot still states the result at the terminal ply after the round trip',{slot:back&&back.t,want});
      L.say(b.errs.length===0,t+'7 '+geo+' '+ending+': zero app errors across the whole round trip',b.errs.slice(0,3));
      await b.close();
    }
  }

  // ══ L: A STALEMATE STEPPED BACK - the ONE input class antagonist A found block G could not reach ══
  // #473, on antagonist A's finding at the diff door. Every input in G-K is a CHECKMATE or a RESIGNATION, so
  // nothing exercised `_gameTermStatus==='stalemate'` or the `_winSide===null` fall-through to `_winTxt='Draw'`
  // - which is to say half of the new `gameResult` expression was never evaluated by any assertion on any
  // bundle. A drove it and measured the fix GREEN and the three broken bundles RED (#471 and NC1 both
  // 'Stalemate · Draw' -> '' after one Back; NC2 '' with the card re-opening), so it is a real input class
  // and not a hypothetical. It is added here rather than merely named in NOT COVERED because this build was
  // re-gating anyway for antagonist B's veto, so the input cost nothing extra.
  // AND NOTE WHERE THE DRIVE CAME FROM: `gates/regress/55-play-from-here-terminal.js:34` has carried this
  // exact Sam Loyd line since it was written, as a PGN. A found it there. That is CLAUDE.md's #386/#390 rule
  // paying off - "before tapping anything in a new gate, ask whether an existing gate already had to fight
  // that control" - and it is the second time in this one build that an existing artefact saved a rediscovery.
  // ONE GEOMETRY, deliberately: its value is the different TERMINAL KIND, not a third width, which is the
  // same reasoning gate 55 states for its own stalemate input.
  {
    const b=await L.launch({geo:'kunal730',name:'stalemate-stepped-back',store:{ct_pool:'3'}});await b.open();
    await P.states['setup-passplay'](b);await P.tapStart(b,900);await P.ensureMovesShown(b);
    // 1.e3 a5 2.Qh5 Ra6 3.Qxa5 h5 4.Qxc7 Rah6 5.h4 f6 6.Qxd7+ Kf7 7.Qxb7 Qd3 8.Qxb8 Qh7 9.Qxc8 Kg6 10.Qe6
    const MV=[['e2','e3'],['a7','a5'],['d1','h5'],['a8','a6'],['h5','a5'],['h7','h5'],['a5','c7'],['a6','h6'],
              ['h2','h4'],['f7','f6'],['c7','d7'],['e8','f7'],['d7','b7'],['d8','d3'],['b7','b8'],['d3','h7'],
              ['b8','c8'],['f7','g6'],['c8','e6']];
    for(const [f,t] of MV) await b.move(f,t,170);
    await b.settle(4400);
    const want='Stalemate \u00b7 Draw';
    const pre=await slot(b),preFwd=await fwdState(b);
    L.say(!!pre&&pre.t===want,'L1 375x730 stalemate: the slot states the result BEFORE any tap, as the app\'s own two-part string. Black is not in check and has no legal move, so it is a STALEMATE and therefore a DRAW - a fact about the position, not about any readout',{slot:pre&&pre.t,want});
    L.say(preFwd.found&&preFwd.dis===true,'L2a 375x730 stalemate: and we are at the last ply - Forward present and disabled',{forward:preFwd});
    const tap=await tapBack(b);
    L.say(tap.ok,'L2b 375x730 stalemate: the Back control takes the tap',tap);
    await b.settle(900);
    const postFwd=await fwdState(b),post=await slot(b),hits=await resultHits(b);
    L.say(tap.ok&&postFwd.found&&postFwd.dis===false,'L2c 375x730 stalemate: THE WITNESS - Forward is now enabled, so the ply moved',{before:preFwd,after:postFwd});
    // #548 follow-up to item (126): final-only (see G3) - inverted the same way.
    L.say(!!post&&post.t!==want,'L3 375x730 stalemate: one Back tap after the stalemate, the slot does NOT state the result - final-only',{slot:post&&post.t,want});
    L.say(!hits.some(h=>h.t===want),'L4 375x730 stalemate: and no painted element shows that string one ply back',{hits,want});
    L.say(b.errs.length===0,'L5 375x730 stalemate: zero app errors across a 19-ply stalemate and a step back',b.errs.slice(0,3));
    await b.close();
  }

  // ══ J: THE CARD IS PLY-KEYED EVEN THOUGH THE STATUS LINE IS NOT (antagonist B's upheld veto, #473) ══
  // THE SPLIT THIS BLOCK EXISTS TO PIN: the status row answers "is the GAME finished" (blocks G-I above, and
  // US-PL-12), and the result CARD answers "am I LOOKING at the result position". #473's first bundle got that
  // split wrong in one direction: making `gameResult` game-keyed - which the status row needs and which is the
  // whole point of that build - also handed the CARD a non-null result at every previewed ply, so inside the
  // ~3s before the fade one Back tap left the card PAINTED OVER THE BOARD on a position that is not the
  // result position.
  //
  // THE CONTROL IS THIS BUILD'S OWN FIRST BUNDLE, which is the strongest kind available here: 
  //   CT_APP=gates/.trial/app-473-v1-cardleak.js gates/gates.sh '#473' '16-cpu-result-line'
  // MEASURED on acaa5090955e at 375x730, Scholar's mate 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#, one Back tap at
  // t+836ms: card still at x=95.9 y=237.8 w=183.2 h=69 while the move row read "2...Nc6 3.Qh5 3...Nf6" - two
  // readouts of the same quantity 150px apart disagreeing. The shipped #471 bundle reads card=null at that
  // instant, so it was a REGRESSION and not a pre-existing leak. Antagonist B found it at the shipped-surface
  // door with a pixel diff (>=83% of the pixels of EIGHT squares replaced, three of them holding pieces), and
  // this build RE-MEASURED it independently before upholding the veto. Fixed by `&&!_pvLive` on the card.
  //
  // WHY THE WINDOW IS THE WHOLE POINT, and why this is a separate block from G. Blocks G-I settle 4400ms
  // first, PAST the 3300ms fade, where `resultCardGone` is true and the card is absent on every bundle - so
  // no assertion in G-I can see this defect, and none of them went red on it. The defect lives only in the
  // ~3 seconds a player is most likely to be looking at the screen. A gate that samples the settled state
  // cannot see a transient one, which is this file's own "measure after interaction" rule pointed at TIME.
  //
  // THREE OF ANTAGONIST B'S FOUR REQUESTED ASSERTIONS ARE DELIBERATELY NOT HERE, and the reasons are on the
  // run report rather than hidden: B asked that the status line NOT state the result at ply 0, that the
  // opening name still be present at a middle ply, and that the card RETURN at the final ply after a Back and
  // Forward round trip. All three contradict US-PL-12 and the job this build closes - the first two ask for
  // exactly the defect #473 was written to remove, and the third asks for the card resurrection G5 pins as a
  // defect. B came at the bundle blind, by design, and so could not know the clause; that is the cost of the
  // blind door and not a fault in the pass. Its FOURTH point was right and is this block.
  for(const [tag,geo] of [['J','kunal730'],['K','se']]){
    const b=await L.launch({geo,name:'card-is-ply-keyed-'+geo,store:{ct_pool:'3'}});await b.open();
    await P.states['setup-passplay'](b);await P.tapStart(b,900);await P.ensureMovesShown(b);
    for(const [f,t] of [['e2','e4'],['e7','e5'],['f1','c4'],['b8','c6'],['d1','h5'],['g8','f6'],['h5','f7']]) await b.move(f,t,200);
    await b.settle(400);                                   // INSIDE the ~3s window, deliberately
    const upCard=await cardBox(b);
    // PRESENCE BEFORE ABSENCE (#385): without this, J2's null could mean the card never appeared at all.
    L.say(!!upCard&&/Checkmate/.test(upCard.t),tag+'1 '+geo+': the result card IS up at the mate, inside the ~3s window before the fade - asserted before the absence below, so a green on J2 cannot come from a build where the card never renders',{card:upCard});
    const tap=await tapBack(b);
    L.say(tap.ok,tag+'2a '+geo+': the painted Back control takes the tap inside the window',tap);
    await b.settle(150);
    const row=await moveRow(b),dnCard=await cardBox(b);
    L.say(tap.ok&&!!row&&!/#/.test(row),tag+'2b '+geo+': and the position shown is NOT the mate - the move row carries no "#", which is what makes the next assertion about a non-result position rather than about the result position',{moveRow:row});
    L.say(tap.ok&&dnCard===null,tag+'3 '+geo+': THE CARD IS GONE. It answers "am I looking at the result position", so it must not paint over a board showing some other ply. The measured rect of whatever IS there is in the payload and NO coordinate is hardcoded in this message, because it runs at two geometries: the leaked card sits at x=95.9 y=237.8 at 375x730 and x=68.4 y=164.5 at 320x568, so one pair of numbers in the text would be wrong at one of them. Antagonist B pixel-diffed it at 375x730: >=83%% of the pixels of EIGHT squares replaced, three of them holding pieces',{card:dnCard});
    // and the build's actual fix must still hold at the same instant - the two are not in tension
    // J4 WAS WRONG AND THIS BLOCK'S OWN CONTROL RUN CAUGHT IT BEFORE THE PUSH. It first asserted the slot
    // states the RESULT at this instant. It does not, on any bundle, and it should not: #434 split the card
    // and the slot BY TIME - the card carries the result for the ~3s it is up, so the slot is free to show the
    // opening name then, and the result takes the slot back after the fade. So the first draft was red on the
    // control AND would have been red on the shipped fix, which is the one kind of gate this project treats as
    // worse than no gate. What is asserted instead is the time-split itself, which is a real property and
    // reddens if anyone makes the slot game-keyed DURING the window as well.
    const slIn=await slot(b);
    L.say(!!slIn&&slIn.t==="Scholar's Mate",tag+'4a '+geo+': WHILE THE CARD IS UP the slot carries the OPENING NAME, not the result - #434\'s time-split, measured at this frame on both bundles',{slot:slIn&&slIn.t});
    await b.settle(4200);                                  // past the 3300ms fade, same previewed ply
    const slOut=await slot(b);
    // #548, the follow-up to item (126): FINAL-ONLY (Kunal, questions/B8B-BACK-AFTER-GAME-OVER) - at a NON-final ply the result is not
    // stated, so after the fade this previewed ply keeps the opening name. 4b asserted the opposite until he chose.
    L.say(!!slOut&&slOut.t!=="Checkmate! \u00b7 White wins"&&slOut.t==="Scholar's Mate",tag+'4b '+geo+': AFTER THE FADE, STILL AT THAT PREVIEWED (non-final) PLY, the slot does NOT state the result - final-only - and keeps the opening name',{slot:slOut&&slOut.t});
    L.say(b.errs.length===0,tag+'5 '+geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }

  // ══ E: LANDSCAPE, 730x375 - THE ROW THAT WAS NOT RENDERED AT ALL, AND THE BOARD JUMP BESIDE IT ══
  // #435, jobs/landscape-drops-the-status-row-at-game-over-...-2026-09-29. This is a DIFFERENT mechanism from
  // A-D and needs its own inputs: A-D fail when the slot says the wrong THING, E fails when the slot DOES NOT
  // EXIST. On the shipped #434 bundle chess.jsx:5616's guard read (!(isOver||playEnd)||!wide), so at 730x375 -
  // where `wide` (chess.jsx:2744) is true - the row was not rendered once the game was over and NEITHER
  // opponent stated a result. MEASURED there, vs Pip and Pass & Play alike: scan returns [] at +4.4s and +6.8s.
  //
  // E5 IS THE ASSERTION THIS JOB EXISTS FOR AND IT IS NOT ABOUT TEXT. The job's own brief said to establish what
  // moved the board BEFORE deciding where the result goes, and the answer, measured here and not read: at game
  // over in landscape the bottom tab bar returned, its 62px in-flow spacer (chess.jsx:7175) entered the flow, the
  // fit loop (chess.jsx:2763) read it as content and trimmed the board 224.00 -> 192.00 - 14%, for BOTH
  // opponents, Pass & Play included, which is what ruled the adaptive-strength pill out as the cause. So E5
  // spans LIVE -> OVER, not merely the card fade the way A7/B7 do, and THAT IS THE DIFFERENCE THAT MATTERS:
  // A7/B7 could not have caught this, because on the old bundle the board had already finished shrinking before
  // the card came up (measured: live 224.00 -> card-up 192.00 -> card-gone 192.00).
  //
  // THE CONTROL IS AGAIN THE REAL BROKEN BUILD, free and with no hook the fix invented (#432):
  //   CT_APP=<the shipped #434 bundle, md5 f301b19b9727> gates/gates.sh '#434' '16-cpu-result-line'
  // [data-ct="play-opening"] is #370's and predates every change here, so a red is a missing ROW or wrong TEXT,
  // never a missing selector.
  // MEASURED, AND THE SCOPE IS THE GATE'S OWN LOG (gates/logs/434-subset-16-cpu-result-line.log), NOT the [R18 #550: that path was never in this repository - no commit in any history holds it - so the citation is kept and listed with its reason in gates/verify-log.sh --citations ALLOW]
  // -all.log, because the -all.log adds mountcheck's 16 and an earlier draft of this build quoted 56/14 from it
  // - a count with no scope cannot be checked, which is this repo's own rule and was broken here first [R18]:
  //   #434 control: 39 PASS / 15 FAIL of 54. The fifteen are E2,E3,E5,E6,E7,E9,E10,E11 and F2,F5,F6,F7,F9,F10,F11.
  //   #435:         54 PASS / 0 FAIL.
  //   Blocks A-D: 28 PASS / 0 FAIL on the control, which localises every failure to landscape and proves
  //   #434's portrait fix is untouched. (28, not the 27 this header carried from #434 - see above.)
  // THE HONEST DENOMINATOR OF THE NEW BLOCKS, because antagonist A asked for it and a count with no scope
  // cannot be checked. E and F add 26 assertions. FIFTEEN go red on the real broken build. THREE of the
  // remaining eleven cannot fail by construction and are named here rather than counted as evidence:
  //   E0/F0 - "the viewport really is 730x375". A harness self-check, not a claim about the app. It is here
  //           because every other assertion in the block is about the branch a computed flag selects, and a
  //           silently-wrong viewport would make all of them green and meaningless.
  //   F3    - "zero elements state an Elo in Pass & Play". 0 on both bundles, deliberately: see below.
  // The other eight (E1/F1, E4/F4, E8/F8, E12/F12) are live but were already satisfied on #434 - the row did
  // exist while the game was LIVE there, the card did fade, the board did not move across the fade alone
  // (it had already finished shrinking), and neither build throws. They are preconditions and guards, and
  // they are what stop the fifteen above being green for the wrong reason.
  //
  // F3 IS THE ONE NEW ASSERTION THAT DOES NOT MOVE BETWEEN THE BUNDLES, AND THAT IS ITS JOB: Pass & Play has
  // no computer, so zero elements state an Elo on either build. It is a control, and it is named as one rather
  // than counted as evidence.
  for(const [tag,opp] of [['E','cpu'],['F','pp']]){
    const geo={w:730,h:375,safe:''};
    const b=await L.launch({geo,name:'result-land-'+opp,store:{ct_pool:'3'}});await b.open();
    const vpw=await b.page.evaluate(()=>innerWidth+'x'+innerHeight);
    L.say(vpw==='730x375',tag+'0 730x375: the viewport really is landscape - asserted because `wide` is a computed flag and every other assertion in this block is about the branch it selects',{viewport:vpw});
    if(opp==='pp'){await P.states['pp-m0'](b);}
    else{await P.states['setup'](b);await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);}
    await b.settle(400);
    const liveBd=await b.board(),liveSlot=await slot(b);
    L.say(!!liveSlot,tag+'1 730x375: the status row is rendered while the game is LIVE - the precondition, so a green below cannot come from a row that was never there in either state (#385)',{slot:liveSlot&&liveSlot.t});
    await resign(b);
    await b.settle(600);
    const upSlot=await slot(b),upBd=await b.board();
    // THE TWO STRENGTH ASSERTIONS ARE OPPONENT-SPECIFIC AND THE FIRST DRAFT APPLIED THEM TO BOTH BLOCKS,
    // which went red on F for the right reason: Pass & Play has no computer, so eloMsg never exists and no
    // Elo is stated anywhere at any time. Split, which makes F a genuine control rather than a copy of E -
    // E proves the strength is stated once and no longer twice, F proves it is never stated at all.
    if(opp==='cpu'){
      L.say(!!upSlot&&/Strength now ~\d+ Elo/.test(upSlot.t),tag+'2 730x375: and while the card is up the row CARRIES the adaptive-strength note. Asserts the TEXT, not merely that the element exists: antagonist A pointed out that an existence-only check makes every green in this block compatible with a build where eloMsg is never set at all, so the block would never prove it entered the state it is about (the A1b analogue, #385). The number is not pinned, for the reason A1b gives',{slot:upSlot&&upSlot.t});
    }else{
      L.say(!!upSlot&&!/Elo/.test(upSlot.t),tag+'2 730x375: and while the card is up the row is rendered and carries NO Elo of any kind - Pass & Play has no computer, so the whole adaptive-strength mechanism is absent and this block is the control that proves the landscape fix is not about that mechanism',{slot:upSlot&&upSlot.t});
    }
        await b.settle(5000);
    const dn=await slot(b),hits=await resultHits(b),dnBd=await b.board(),card=await b.text('[data-ct="result-card"]');
    const want=opp==='cpu'?'Resigned · You lose':'Resigned · Black wins';
    L.say(card===null,tag+'4 730x375: the result card has gone, so the slot is the only thing left that can state the result',{card});
    L.say(!!dn&&dn.t===want,tag+'5 730x375: and it states it, as the app\'s own head + " · " + sub. On the shipped #434 bundle this element DID NOT EXIST at this moment, for either opponent',{slot:dn&&dn.t,want});
    /* #550 a23 (Option A, his pick): sideways, the finished game states its result in the land-result card, head and sub as two painted
       lines ('Resigned' over 'You lose'), so the scan accepts the joined slot text OR those two lines inside land-result. */
    const _lr=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="land-result"]');if(!e)return null;const r=e.getBoundingClientRect();return {t:(e.innerText||'').replace(/\s+/g,' ').trim(),w:r.width,h:r.height,y:r.top,b:r.bottom,vh:innerHeight};});
    const _two=want.split(' · ');
    L.say(hits.some(h=>h.t===want)||(!!_lr&&_lr.w>0&&_lr.y>=0&&_lr.b<=_lr.vh+0.5&&_lr.t.indexOf(_two[0])===0&&_lr.t.indexOf(_two[1])>0&&hits.some(h=>h.t===_two[1])),tag+'6 730x375: the painted-element scan finds it - this returned [] on #434 for BOTH opponents, which is the defect in one number (since a23 the land-result card paints it as two lines: '+(_lr&&_lr.t)+')',{hits,landResult:_lr});
    const strengthDn=await strengthHits(b);
    L.say(strengthDn.length===(opp==='cpu'?1:0),tag+'3 730x375: ONCE THE CARD HAS GONE exactly ONE painted element states the adaptive strength vs the computer, and ZERO in Pass & Play - the rail - where #434 had TWO and stated the result zero times. MEASURED on both bundles at this frame: #434 gives [{"▼ Strength now ~450 Elo",x:373.3,y:47.5,w:207.4},{"≈450 Elo",x:317.8,y:95}] and #435 gives [{"≈450 Elo",x:365.8,y:108}]. THREE THINGS ABOUT THIS ASSERTION WERE WRONG BEFORE THEY WERE MEASURED, and all three are the same mistake. (a) It first filtered resultHits(), whose vocabulary cannot match the word "strength", so it was [] on every bundle and COULD NOT FAIL - antagonist A vetoed the push on it. (b) The repair scanned for /strength (now|stays)/ alone, which returns 1 on the broken bundle AND 1 on the fixed one, so it still discriminated nothing. (c) It was taken while the card was UP, where both bundles legitimately show the note. It is now the widest wording, at the frame where the finding lives. The lesson is the file\'s own: an instrument has to be shown to move between the two cases, and neither draft was',{strengthHits:strengthDn});
    L.say(!!liveBd&&!!dnBd&&Math.abs(liveBd.w-dnBd.w)<0.05&&Math.abs(liveBd.y-dnBd.y)<0.05,tag+'7 730x375: THE BOARD DOES NOT MOVE FROM LIVE TO OVER, to the hundredth. On #434 this read 224.00/75.50 live and 192.00/60.50 over - a 32px, 14% shrink at the instant the game ended, for both opponents. Spans the whole transition and not just the card fade, because the shrink had already happened by the time the card was up',{live:liveBd&&{w:+liveBd.w.toFixed(2),y:+liveBd.y.toFixed(2)},over:dnBd&&{w:+dnBd.w.toFixed(2),y:+dnBd.y.toFixed(2)}});
    L.say(!!upBd&&!!dnBd&&Math.abs(upBd.w-dnBd.w)<0.05,tag+'8 730x375: and it does not move across the card fade either - the half A7/B7 cover at the portrait geometries',{up:upBd&&+upBd.w.toFixed(2),down:dnBd&&+dnBd.w.toFixed(2)});
    L.say(!!dn&&dn.sw<=dn.cw+1,tag+'9 730x375: nothing in the slot is silently cut at this geometry. Landscape is the WIDEST viewport this gate visits, so this is the weakest of the three truncation checks and is here to catch a slot whose width is keyed to the board column rather than the viewport, which is the one way landscape could cut where 375 does not',{sw:dn&&dn.sw,cw:dn&&dn.cw});
    const tabs=await b.tabBarVisible();
    L.say(tabs===false,tag+'10 730x375: and the bottom tab bar is NOT back. This is the mechanism assertion for E7: the bar returning is what put the 62px spacer into the flow and paid for it out of the board. If a later change restores the bar here, this goes red beside E7 and names the cause rather than leaving a bare geometry failure',{tabBarVisible:tabs});
    const homeBtn=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.title==='Home'&&x.getBoundingClientRect().width>0);return !!e;});
    L.say(homeBtn===true,tag+'11 730x375: and Home is still reachable. #435 hid the tab bar at game over in landscape, so this asserts the route that replaced it is actually there. MEASURED, one process per bundle, buttons on screen at this moment: #434 gave [menu,-,+,Moves,Back,Forward,Hint,Flip,More,Home,Discover,Puzzles,Review,Play] with tabBarVisible=true and board=192; #435 gives [HOME,menu,-,+,Moves,Back,Forward,Hint,Flip,More] with tabBarVisible=false and board=224. So this is a TRADE and not a free win - the four non-Home tab destinations go from one tap to two, via Home - and this assertion pins the half that must not silently become zero taps to anywhere. An earlier draft of this line said the amber record claimed NO capability was lost; that claim was too strong and was withdrawn in the record itself before the push (flags/amber-435-landscape-game-over-matches-portrait) [R18]',{homeButton:homeBtn});
    L.say(b.errs.length===0,tag+'12 730x375: zero app errors across a landscape termination',b.errs.slice(0,3));
    await b.shot('result-land-'+opp);
    await b.close();
  }

  // ══ NOT COVERED HERE, AND NAMED SO IT IS NOT MISTAKEN FOR COVERED ══
  // A CHALLENGE TO THIS CONTROL THAT WAS MEASURED AND REFUTED, recorded because the claim is plausible and
  // the next reader may well raise it again. Antagonist B reported that #434's missing line and its 224->192
  // shrink are MOVE-0-ONLY - that on #434 with 4 plies played the result line WAS present at 730x375 and the
  // board stayed 224.00 - which would make E5/F5 and E7/F7 describe a far narrower defect than their text
  // claims. MEASURED HERE, vs Pip, P.states['cpu-4ply'] then resign, one process per bundle with the harness
  // provenance line printed:
  //     #434, 4 plies: LIVE 224.00/75.50 -> OVER 192.00/60.50, [data-ct="play-opening"] NULL, scan []
  //     #435, 4 plies: LIVE 224.00/75.50 -> OVER 224.00/75.50, slot "Resigned - You lose"
  // Identical to the move-0 readings, so the defect is NOT move-count dependent and the assertion text stands.
  // The likely source of the challenge is worth keeping: B reported the line at y=27, and y=27 is exactly what
  // the #435 slot reads when the column is left SCROLLED by the More-sheet taps (it is y=65 at scrollTop 0),
  // which is the reading B's own P1-1 warns about. An antagonist's finding is evidence, not a verdict, and the
  // cheapest response to one is the measurement, not the argument.
  //
  // AND B'S P1-1 IS REAL AND IS THIS BLOCK'S NEAREST WEAKNESS: the column carrying this row is a scroller
  // (scrollHeight 410 against clientHeight 224 at game over in Pass & Play), and gates/drive/play.js tapBtn
  // calls scrollIntoView, so the resign sequence leaves it scrolled by up to 38px. These assertions survive
  // that because they pin TEXT and board geometry, never the row's y - but a future assertion here that pins
  // y would be measuring the harness's scroll position and not the app. Filed as its own job.
  //
  // LANDSCAPE REACHED BY ROTATING. Blocks E and F `L.launch` DIRECTLY at 730x375, which is not a state an
  // iPhone can be in - the app is opened in portrait and the phone is turned. Antagonist A measured the
  // difference on #435 and on #434 alike, vs Pip, 2 plies, resigned:
  //     730x375 launched          board 224.00 / 75.50
  //     -> rotate to 375x730      board 353.03 / 93.75
  //     -> back to 730x375        board 216.00 / 79.50   <- not 224.00, and stable, it does not oscillate
  // So every landscape number in this file describes a viewport the user never actually enters, and the whole
  // subject of this block is landscape. It reproduces identically on #434, so it is NOT a #435 regression and
  // did not veto this push; it is filed as its own job (see the run report). Adding one setViewportSize round
  // trip to E/F would close it and is deliberately NOT done in the build that found it, because the assertion
  // would then be pinned to 216.00 - a number that is itself probably the defect.
  //
  // LANDSCAPE WAS THIS BLOCK'S FIRST ENTRY AND IS NOW BLOCK E ABOVE, which is what closes
  // jobs/landscape-drops-the-status-row-at-game-over-so-no-result-survives-the-card-2026-09-29. Left here as a
  // pointer rather than deleted, because the sentence it used to carry is the evidence that #434 named its own
  // gap instead of letting a green suite imply coverage it did not have.
  // A TIME LOSS. The auditor measured one (a 1-minute clock flags at t+56s) and it is the same slot and the
  // same branch; it is not gated here because 56 seconds of wall clock per geometry is not a per-build cost.
  // Antagonist B DID drive one on this bundle and the slot read 'Time! - You lose' (116.5px) by t+4.24s.
  //
  // THE OTHER TWO eloMsg BRANCHES, and this is the gap both antagonists landed on independently. chess.jsx:3142
  // sets 'Draw - strength stays ~N Elo' on a DRAW, and 3144 sets the up-arrow wording on a WIN. Every input here
  // terminates by resignation as White, so only the down-arrow loss branch is reached. Post-fade behaviour is safe
  // by construction rather than by test - antagonist A enumerated all 96 rows of opponent x eloMsg x
  // resultCardGone x _res x _op x _done, found 48 reachable (gameResult at chess.jsx:4308 is non-null exactly
  // when the game is over, so _res is non-empty exactly when _done) and 0 of them fall through _res||_fin to
  // _fin - so the result takes the slot on a draw too, and B confirmed it by driving real ones in Pass & Play:
  // 'Draw - Threefold repetition' 199.9px and 'Stalemate - Draw' 127.0px. What is NOT covered is the CONTESTED
  // slot on a vs-computer draw, where 3142 fires unconditionally: B tried 20 plies of knight shuffling against
  // Pip and the engine never repeats, and the fifty-move branch needs 100 quiet plies, so it is expensive rather
  // than skipped. jobs/two-elomsg-branches-are-unreachable-by-every-input-in-the-suite-2026-09-29.
  //
  // AND A TRAP IN THE PROBE THAT WROTE THIS GATE'S EVIDENCE, recorded where the next reader will hit it: the scan
  // vocabulary contains 'draw', and the draw branch's strength note is 'Draw - strength stays ~500 Elo', so it
  // MATCHES - measured by A at 235.7px where both arrow wordings return []. A hits.length>0 verdict is therefore
  // satisfied by the very message that hides the result, and had the #433 auditor drawn instead of resigning, the
  // probe would have printed 'result on screen = true' over a screen saying nothing about it. The assertions here
  // are immune because A4/B4/C3/D2 test EXACT equality with the expected string;
  // claude/agents/probes/434-cpu-result-line.js was not, and is fixed. 'A shape is not a value' reaches into the
  // instrument, not only into the app.
  //
  // ROTATION. Antagonist B, on THIS bundle: resizing a finished game from 375x730 to 730x375 and back makes the
  // result disappear and reappear, because landscape has no slot at all. On #433 both orientations agreed (neither
  // showed it), so this build creates that disagreement. Recorded on the landscape job.
  // ══ G: THE PLAYER BAR STATES THE STRENGTH THE ENGINE IS GIVEN [#547, item (68), TC-PL-040;
  // jobs/bench-the-player-bar-prints-the-stale-bot-label-for-every-live-game-2026-10-08; Kunal chose "name-stays"]. ══
  // The adaptive ladder moves cpuElo after every result while the chosen bot (ct_bot) stays, so from the second game on
  // the bar printed the bot's NOMINAL Elo while the engine played the adapted one. Seeded here as the state the ladder
  // leaves: ct_bot pip (nominal 500) and ct_elo 640. The bar must print 640 and must still name Pip. Two arrivals first:
  // a game against the computer is running, and ct_elo still reads 640 once it has started (nothing re-seated it).
  {
    const b=await L.launch({geo:'kunal730',name:'cpu-bar-elo',store:{ct_pool:'3',ct_bot:'pip',ct_elo:'640'}});await b.open();
    await P.states['setup'](b);await P.tapBtn(b,/^▶ Start game$/,900);await b.settle(400);
    const r=await b.page.evaluate(()=>{const els=[...document.querySelectorAll('[data-ct^="pbar-rating-"]')].map(e=>({ct:e.getAttribute('data-ct'),t:(e.innerText||'').trim()}));
      const bars=[...document.querySelectorAll('[data-ct="pbar-top"],[data-ct="pbar-bottom"]')].map(e=>(e.innerText||'').replace(/\s+/g,' ').trim());
      let elo=null;try{elo=localStorage.getItem('ct_elo');}catch(e){}return {els,bars,elo};});
    L.say(r.elo==='640'&&r.bars.some(t=>/\bPip\b/.test(t)),'G0 375x730: PRECONDITION a game against Pip is running and ct_elo still reads 640 after the start, so the bar below is judged against the strength the engine was given',r);
    L.say(r.els.length===1&&r.els[0].t==='640','G1 375x730: TC-PL-040 the computer\'s bar prints 640, the strength the engine plays, not Pip\'s nominal 500 - and the bot\'s name stays its name',r.els);
    L.say(b.errs.length===0,'G2 375x730: zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // TC-PL-045 (US-PL-17), #547 item (126): IN THE LANDSCAPE RAIL THE RESULT ROW CANNOT BE SCROLLED AWAY. The rail scrolls (380 vs 216
  // at 730x375 after a resign); pre-fix the row went y 68 -> 16 (cut by the rail's clip at 26) -> -96 as it scrolled. Measured
  // against the rail's own clip box at scrollTop 0, 52 and the end - not against the viewport, which would excuse the cut.
  {const b=await L.launch({geo:{w:730,h:375,safe:'',label:'730x375'},name:'cpu-result-rail-pin'});await b.open();
   let ok=true;try{await P.states['cpu-resigned'](b);await b.settle(1500);}catch(e){ok=false;}
   /* #550 a23: sideways, the finished game's result is the land-result card (head, sub and its Back/Forward chevrons) above the moves,
      and the rail's play-context row is not laid out there; the card is what must never scroll away, so it is the one read when present. */
   const rd=(st)=>b.page.evaluate((st)=>{const r=document.querySelector('[data-ct="land-result"]')||document.querySelector('[data-ct="play-context"]');let x=r&&r.parentElement;while(x&&!(/auto|scroll/.test(getComputedStyle(x).overflowY)&&x.scrollHeight>x.clientHeight+1))x=x.parentElement;
     if(r&&!x){const rr=r.getBoundingClientRect();return {row:true,scroller:false,sh:0,ch:0,st:0,rowY:[Math.round(rr.top*10)/10,Math.round(rr.bottom*10)/10],clip:[0,innerHeight],txt:(r.innerText||'').trim(),fixed:true};}
     if(!r||!x)return {row:!!r,scroller:!!x};x.scrollTop=st==='max'?x.scrollHeight:st;const xr=x.getBoundingClientRect(),rr=r.getBoundingClientRect();
     return {row:true,scroller:true,sh:x.scrollHeight,ch:x.clientHeight,st:Math.round(x.scrollTop),rowY:[Math.round(rr.top*10)/10,Math.round(rr.bottom*10)/10],clip:[Math.round(xr.top*10)/10,Math.round(xr.bottom*10)/10],txt:(r.innerText||'').trim()};},st);
   const r0=await rd(0);
   if(L.say(ok&&r0.row&&(r0.fixed||(r0.scroller&&r0.sh>r0.ch))&&!!r0.txt&&r0.rowY[1]>r0.rowY[0],'730x375: TC-PL-045 PRECONDITION after a resign the result row is found, laid out, it says something, and either its rail really scrolls ('+r0.sh+' > '+r0.ch+') or it sits in no scroller at all (the a23 card)',r0)){
     for(const st of [0,52,'max']){const r=await rd(st);
       L.say(r.rowY[0]>=r.clip[0]-0.5&&r.rowY[1]<=r.clip[1]+0.5,'730x375: TC-PL-045 at rail scrollTop '+r.st+' the result row is wholly inside the rail\'s visible window (row '+r.rowY.join('..')+', window '+r.clip.join('..')+')',r);}
   }
   await b.close();}
  // TC-PL-046 (US-PL-18), #547 item (127): THE REVIEW OF A GAME YOU JUST PLAYED NAMES THE OPPONENT AND THE RESULT. Pre-fix its
  // header read 'White vs Black' with no result, where an imported PGN on the same screen reads '<White> vs <Black> · 1-0'.
  for(const geo of ['kunal730','se']){
   const b=await L.launch({geo,name:'cpu-review-header-'+geo});await b.open();
   let ok=true;try{await P.states['cpu-resigned'](b);await b.settle(1500);await P.closeSheet(b).catch(()=>{}); /* #548 item (92): (8,8) is the top row's Home now */await b.settle(400);await P.tapBtn(b,/^(🔍 )?Review$/,1200);
     await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(800);}catch(e){ok=false;}
   const lines=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');return s?(s.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,6):[];});
   const hd=lines.find(x=>/ vs /.test(x))||null;
   if(L.say(ok&&!!hd,geo+': TC-PL-046 PRECONDITION resigning vs the computer and tapping Review reached the summary, and its "A vs B" header line is found',{lines})){
     L.say(!/^White vs Black\b/.test(hd)&&/^You vs \S/.test(hd),geo+': TC-PL-046 the header names you and the opponent you played, not the colours ("'+hd+'")',{hd});
     L.say(/· 0-1$/.test(hd),geo+': TC-PL-046 and states the result - you resigned as White, so 0-1 ("'+hd+'")',{hd});
   }
   await b.close();}
  // TC-PL-063 (US-PL-18), #549 item (49): THE REVIEW OF A GAME YOU JUST PLAYED SAYS HOW IT ENDED, AND A RESIGNED GAME IS NOT 'A CLEAN
  // GAME'. #547 gave the header the players and the result; the ending itself was still nowhere on the summary, and a game the player
  // resigned at move 2 was summed up 'A clean game: no mistakes or blunders on your side.' (547b-all.log:736). Three arrivals, each from
  // its own game-over screen: a resignation vs Pip (the human White, so 'You resigned'), Pass & Play's fool's mate (no playEnd: the
  // getStatus half), and a Pass & Play threefold-repetition auto-draw (playEnd reason 'draw'). The line is located by its hook AND its
  // text is pinned to a fact about the game, so a missing hook reads as a red precondition, not as a pass.
  {const ends=[
    {id:'resign',geos:['kunal761','se'],want:'You resigned',drive:async(b)=>{await P.states['cpu-resigned'](b);}},
    {id:'mate',geos:['kunal761'],want:'Checkmate',drive:async(b)=>{await P.states['pp-mate'](b);}},
    {id:'draw',geos:['kunal761'],want:'Draw by threefold repetition',drive:async(b)=>{await P.states['pp-m0'](b);
      for(let i=0;i<5;i++){for(const [f,t] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])await b.move(f,t,380);
        const r=await b.page.evaluate(()=>!!document.querySelector('[data-ct="result-card"]'));if(r)break;}}},
  ];
  for(const k of ends)for(const geo of k.geos){
   const b=await L.launch({geo,name:'review-ended-'+k.id+'-'+geo});await b.open();
   let ok=true;try{await k.drive(b);await b.settle(1500);await P.closeSheet(b).catch(()=>{});await b.settle(400);
     await P.tapBtn(b,/^(🔍 )?Review$/,1200);
     await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(800);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return null;const e=s.querySelector('[data-ct="rev-ended"]');
     const q=e&&e.getBoundingClientRect();const c=[...s.querySelectorAll('div')].find(d=>(d.innerText||'').trim()==="Coach's take");
     return {ended:e?(e.innerText||'').trim():null,rect:q?[Math.round(q.left),Math.round(q.top),Math.round(q.width),Math.round(q.height)]:null,vw:innerWidth,
       coach:c&&c.nextElementSibling?(c.nextElementSibling.innerText||'').trim():null};});
   if(L.say(ok&&!!r&&r.ended!==null,geo+': TC-PL-063 PRECONDITION ('+k.id+') the game-over Review reached the summary and it carries a rev-ended line',r)){
     L.say(r.ended===k.want,geo+': TC-PL-063 ('+k.id+') the summary says how the game ended: "'+r.ended+'" (want "'+k.want+'")',r);
     L.say(!!r.rect&&r.rect[2]>0&&r.rect[3]>0&&r.rect[0]>=0&&r.rect[0]+r.rect[2]<=r.vw+0.5,geo+': TC-PL-063 ('+k.id+') and that line is painted inside the viewport',{rect:r.rect,vw:r.vw});
     // The grading of these few moves is not fixed across launches (measured over four launches: a move graded a mistake once, every move
     // still in book once, no graded mistake twice), so the coach may take any of its three branches; none may call the game clean, and
     // the no-mistake branch must name the resignation. The control's kunal761 launch landed on the 'A clean game' branch and went red.
     if(k.id==='resign')L.say(!!r.coach&&!/^A clean game/.test(r.coach)&&(/^You resigned, yet none of your moves/.test(r.coach)||/^Most of your trouble came in /.test(r.coach)||/^Nothing to score yet/.test(r.coach)),geo+': TC-PL-063 (resign) the coach does not call the resigned game "a clean game" ("'+r.coach+'")',{coach:r.coach});
   // TC-PL-064 (US-PL-18), #549 (49) A4-R3: CTEnded IS THE APP'S PRIVATE TAG AND NEVER LEAVES IT. The summary above reads it; the PGN a
   // player takes away must not carry it - not Copy PGN (the review's ⋯ sheet) and not the paste box the game is put in. Copy is caught
   // at both of the app's clipboard routes (navigator.clipboard.writeText and the execCommand fallback's textarea). Each export is
   // first shown to BE the game's PGN (its Result tag), so an empty or missing export reads as a red precondition, not as a pass.
   if(k.id==='resign'){
    const RV=require('../drive/review');let ok2=true;
    // The paste box is NOT painted on this route (MEASURED: sampled every 25ms from the Review tap to the summary, no textarea was ever
    // visible - the import panel renders only with no review, and '‹ Back to games' clears it). What setPgnText carries is therefore read
    // from the app's own state: every string held in a component state hook, found by walking the React fiber tree from #root. Read-only.
    const ta=await b.page.evaluate(()=>{const host=document.getElementById('root');if(!host)return null;const ck=Object.keys(host).find(x=>x.indexOf('__reactContainer$')===0);
      let f=ck?host[ck]:null;if(!f)return null;const out=[],stack=[f],seen=new Set();
      while(stack.length){const n=stack.pop();if(!n||seen.has(n))continue;seen.add(n);let h=n.memoizedState;let g=0;
        while(h&&typeof h==='object'&&'memoizedState' in h&&g++<400){if(typeof h.memoizedState==='string'&&/\[Result "/.test(h.memoizedState))out.push(h.memoizedState);h=h.next;}
        if(n.child)stack.push(n.child);if(n.sibling)stack.push(n.sibling);}
      return out.length?out.join('\n----\n'):null;});
    try{await b.page.evaluate(()=>{window.__ctCopied=[];try{navigator.clipboard.writeText=(t)=>{window.__ctCopied.push(String(t));return Promise.resolve();};}catch(e){}
        const ex=document.execCommand.bind(document);document.execCommand=function(c){try{const a=document.activeElement;if(c==='copy'&&a&&a.tagName==='TEXTAREA')window.__ctCopied.push(a.value);}catch(e){}return ex.apply(document,arguments);};});
      await RV.startReview(b);await b.tapCt('rev-more',500);await b.tapText(/^Copy PGN$/);await b.settle(400);}catch(e){ok2=false;}
    const cp=await b.page.evaluate(()=>(window.__ctCopied||[]).slice());
    if(L.say(ok2&&cp.length>0&&cp.every(t=>/\[Result "0-1"\]/.test(t)&&/1\. /.test(t)),geo+': TC-PL-064 PRECONDITION Copy PGN on the resigned game put its PGN on the clipboard ('+cp.length+' write(s), Result 0-1 and moves present)',{n:cp.length,head:cp[0]&&cp[0].slice(0,160)}))
      L.say(cp.every(t=>!/CTEnded/.test(t)),geo+': TC-PL-064 and the copied PGN carries no CTEnded tag',{copied:cp[0]&&cp[0].slice(0,200)});
    if(L.say(ta!==null&&/\[Result "0-1"\]/.test(ta),geo+': TC-PL-064 PRECONDITION the paste box\'s state (pgnText) holds the resigned game\'s PGN (Result 0-1)',{ta:ta&&ta.slice(0,160)}))
      L.say(!/CTEnded/.test(ta),geo+': TC-PL-064 and the paste box\'s PGN carries no CTEnded tag',{ta:ta&&ta.slice(0,200)});}
   }
   await b.close();}}
  // TC-PL-048 (US-PL-20), #547 item (150): A DOUBLE TAP CANNOT RESIGN. 'Tap again to resign' takes the same rect as 'Resign', so two
  // clicks 100ms apart on one pixel used to arm and confirm. A deliberate second tap (700ms) must still resign - both halves asserted.
  for(const gap of [100,700]){
   const b=await L.launch({geo:'kunal730',name:'resign-dwell-'+gap});await b.open();
   let ok=true;try{await P.states['cpu-more'](b);await b.settle(400);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^Resign$/.test((e.innerText||'').trim()));if(!x)return null;const q=x.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};});
   if(L.say(ok&&!!r,'375x730: TC-PL-048 PRECONDITION the More sheet offers Resign ('+gap+'ms input)',r)){
     await b.page.mouse.click(r.x,r.y);await b.page.waitForTimeout(gap);await b.page.mouse.click(r.x,r.y);await b.settle(900);
     const over=await b.page.evaluate(()=>/Resigned|You lose/.test(document.body.innerText||''));
     if(gap<400)L.say(!over,'375x730: TC-PL-048 two clicks 100ms apart on the same pixel do NOT resign - the confirm needs the arm to be 400ms old',{resigned:over});
     else L.say(over,'375x730: TC-PL-048 and a deliberate second tap 700ms later still resigns',{resigned:over});}
   await b.close();}
  // TC-PL-049 (US-PL-21), #547 item (160): BLACK PIECES GET THE SEPARATION SHADOW THEIR STYLE DECLARES. Each black piece's inline
  // filter is 'var(--pcfilter) drop-shadow(...) drop-shadow(...)'; --pcfilter defaulted to the keyword 'none', which cannot be combined
  // with filter functions, so the whole list was invalid and computed to 'none' on all 16. Read from the COMPUTED style.
  {const b=await L.launch({geo:'kunal730',name:'piece-shadow'});await b.open();
   let ok=true;try{await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});await b.settle(600);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const imgs=[...document.querySelectorAll('img')].filter(i=>/var\(--pcfilter\) drop-shadow/.test(i.getAttribute('style')||''));return {n:imgs.length,computed:imgs.map(i=>getComputedStyle(i).filter)};});
   if(L.say(ok&&r.n===16,'375x730: TC-PL-049 PRECONDITION the start position paints 16 black pieces whose style declares the white separation shadows',{n:r.n}))
     L.say(r.computed.every(f=>(f.match(/drop-shadow\(/g)||[]).length===2),'375x730: TC-PL-049 and every one of them actually COMPUTES both drop-shadows - not "none" from an invalid filter list',{sample:r.computed[0]});
   await b.close();}
  // TC-PL-049b [#548 item (40); jobs/every-black-piece-loses-its-two-white-drop-shadows-because-pcfilter-resolves-to-the-keyword-none-
  // 2026-10-09]: THE SAME RULE OVER THE REST OF ITS INPUT SPACE. TC-PL-049 reads the 16 board pieces at the Pass and Play start, at one
  // geometry, in the default skin. Here: the four IMAGE skins (classic, merida, chessnut, spatial - symbol draws glyphs, not images, and
  // is excluded) at 375x730 and 320x568, the WHITE pieces as the control the rule must not touch (no white separation shadow), and the
  // CAPTURED black pieces in the player bar after a capture (pp-captures). Read from the COMPUTED style, never the inline one.
  {const P=require('../drive/play');
   const read=(b)=>b.page.evaluate(()=>{const all=[...document.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect();return r.width>2&&r.height>2&&/var\(--pcfilter\)/.test(i.getAttribute('style')||'');});
     const blk=all.filter(i=>/drop-shadow/.test(i.getAttribute('style')||'')),wht=all.filter(i=>!/drop-shadow/.test(i.getAttribute('style')||''));
     const wsh=(f)=>(f.match(/drop-shadow\([^)]*rgba\(255, 255, 255/g)||[]).length;
     return {nb:blk.length,nw:wht.length,blackOk:blk.filter(i=>(getComputedStyle(i).filter.match(/drop-shadow\(/g)||[]).length>=2).length,
       whiteWithWhiteShadow:wht.filter(i=>wsh(getComputedStyle(i).filter)>0).length,sample:blk[0]?getComputedStyle(blk[0]).filter:null};});
   for(const geo of ['kunal730','se'])for(const skin of ['classic','merida','chessnut','spatial']){
     const b=await L.launch({geo,name:'piece-shadow-'+skin+'-'+geo,store:{ct_pieceSet:skin}});await b.open();
     let ok=true;try{await P.states['pp-m0'](b);await b.settle(600);}catch(e){ok=false;}
     const r=await read(b);const tag=geo+' '+skin+': TC-PL-049b ';
     if(L.say(ok&&r.nb===16&&r.nw===16,tag+'PRECONDITION the start position paints 16 black and 16 white image pieces',{nb:r.nb,nw:r.nw}))
       {L.say(r.blackOk===16,tag+'every black piece COMPUTES both drop-shadows',{blackOk:r.blackOk,sample:r.sample});
        L.say(r.whiteWithWhiteShadow===0,tag+'and no white piece computes a white separation shadow - the rule is for black pieces only',{whiteWithWhiteShadow:r.whiteWithWhiteShadow});}
     await b.close();}
   {const b=await L.launch({geo:'kunal730',name:'piece-shadow-captured'});await b.open();let ok=true;
    try{await P.states['pp-captures'](b);await b.settle(700);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const imgs=[...document.querySelectorAll('[data-ct^="pbar-taken"] img')].filter(i=>/drop-shadow/.test(i.getAttribute('style')||''));
      return {n:imgs.length,ok:imgs.filter(i=>(getComputedStyle(i).filter.match(/drop-shadow\(/g)||[]).length>=2).length};});
    if(L.say(ok&&r.n>0,'kunal730 captured: TC-PL-049b PRECONDITION a captured black piece is painted in a player bar ('+r.n+')',r))
      L.say(r.ok===r.n,'kunal730 captured: TC-PL-049b and every captured black piece computes both drop-shadows',r);
    await b.close();}}
  // TC-PL-049c [#549 item (2); same job, the remainder its #548 review left]: (1) the CAPTURED surface in the three image skins 049b's
  // captured launch never set (merida, chessnut, spatial; classic re-read too), at kunal761; (2) the MEDIEVAL board skin, the one skin
  // whose pcf is a real filter function, so its black pieces must compute THREE drop-shadows (its dark one plus the two white ones) and
  // its white pieces exactly ONE, the dark one, and no white one. The skin is entered by ct_skin plus Pro (since #550 SEC-01 the lib's pro:true subscription stand-in; ct_pro is gone) and PROVEN entered by reading
  // the root's --head font (Cinzel is Medieval's alone), because a Pro skin without Pro silently falls back to classic. The proof is
  // deliberately NOT --pcfilter itself: a bundle whose medieval pcf is broken must redden the shadow assertions, not this precondition.
  {const P=require('../drive/play');
   const cap=(b)=>b.page.evaluate(()=>{const imgs=[...document.querySelectorAll('[data-ct^="pbar-taken"] img')].filter(i=>/drop-shadow/.test(i.getAttribute('style')||''));
     return {n:imgs.length,ok:imgs.filter(i=>(getComputedStyle(i).filter.match(/drop-shadow\(/g)||[]).length>=2).length,sample:imgs[0]?getComputedStyle(imgs[0]).filter:null};});
   for(const skin of ['classic','merida','chessnut','spatial']){
     const b=await L.launch({geo:'kunal761',name:'piece-shadow-captured-'+skin,store:{ct_pieceSet:skin}});await b.open();let ok=true;
     try{await P.states['pp-captures'](b);await b.settle(700);}catch(e){ok=false;}
     const r=await cap(b);const tag='kunal761 '+skin+' captured: TC-PL-049c ';
     if(L.say(ok&&r.n>0,tag+'PRECONDITION a captured black piece is painted in a player bar ('+r.n+')',{n:r.n}))
       L.say(r.ok===r.n,tag+'every captured black piece computes both drop-shadows',r);
     await b.close();}
   const MED=(f)=>/^drop-shadow\(rgba\(0, 0, 0, 0\.45\) 0px 2px 2px\)$/.test(f);
   const wsh=(f)=>(f.match(/drop-shadow\(rgba\(255, 255, 255/g)||[]).length, nds=(f)=>(f.match(/drop-shadow\(/g)||[]).length;
   for(const geo of ['kunal761','se']){
     const b=await L.launch({geo,name:'piece-shadow-medieval-'+geo,pro:true,store:{ct_skin:'2'}});await b.open();let ok=true;
     try{await P.states['pp-m0'](b);await b.settle(600);}catch(e){ok=false;}
     const r=await b.page.evaluate(()=>{const root=[...document.querySelectorAll('div')].find(d=>(d.getAttribute('style')||'').includes('--pcfilter'));
       const all=[...document.querySelectorAll('img')].filter(i=>{const q=i.getBoundingClientRect();return q.width>2&&q.height>2&&/var\(--pcfilter\)/.test(i.getAttribute('style')||'');});
       const blk=all.filter(i=>/drop-shadow/.test(i.getAttribute('style')||'')),wht=all.filter(i=>!/drop-shadow/.test(i.getAttribute('style')||''));
       return {head:root?getComputedStyle(root).getPropertyValue('--head').trim():null,pcf:root?getComputedStyle(root).getPropertyValue('--pcfilter').trim():null,bf:blk.map(i=>getComputedStyle(i).filter),wf:wht.map(i=>getComputedStyle(i).filter)};});
     const tag=geo+' medieval: TC-PL-049c ';
     if(L.say(ok&&/Cinzel/.test(r.head||'')&&r.bf.length===16&&r.wf.length===16,tag+'PRECONDITION the Medieval skin is ACTIVE (root --head is its Cinzel font, not the classic fallback) and the start paints 16 black and 16 white pieces',{head:r.head,pcf:r.pcf,nb:r.bf.length,nw:r.wf.length})){
       L.say(r.bf.every(f=>nds(f)===3&&wsh(f)===2&&/^drop-shadow\(rgba\(0, 0, 0, 0\.45\)/.test(f)),tag+'every black piece computes THREE drop-shadows: the skin\'s dark one first, then both white separation shadows',{ok:r.bf.filter(f=>nds(f)===3&&wsh(f)===2).length,sample:r.bf[0]});
       L.say(r.wf.every(MED),tag+'and every white piece computes exactly the skin\'s one dark drop-shadow and no white one',{ok:r.wf.filter(MED).length,sample:r.wf[0]});}
     await b.close();}
   {const b=await L.launch({geo:'kunal761',name:'piece-shadow-medieval-captured',pro:true,store:{ct_skin:'2'}});await b.open();let ok=true;
    try{await P.states['pp-captures'](b);await b.settle(700);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const root=[...document.querySelectorAll('div')].find(d=>(d.getAttribute('style')||'').includes('--pcfilter'));const head=root?getComputedStyle(root).getPropertyValue('--head').trim():null;const imgs=[...document.querySelectorAll('[data-ct^="pbar-taken"] img')].filter(i=>/drop-shadow/.test(i.getAttribute('style')||''));
      return {head,n:imgs.length,ok:imgs.filter(i=>(getComputedStyle(i).filter.match(/drop-shadow\(/g)||[]).length===3).length,sample:imgs[0]?getComputedStyle(imgs[0]).filter:null};});
    if(L.say(ok&&r.n>0&&/Cinzel/.test(r.head||''),'kunal761 medieval captured: TC-PL-049c PRECONDITION the Medieval skin is active (Cinzel) and a captured black piece is painted in a player bar ('+r.n+')',{head:r.head,n:r.n}))
      L.say(r.ok===r.n,'kunal761 medieval captured: TC-PL-049c and every captured black piece computes all three drop-shadows',r);
    await b.close();}}
}, 'CPU-RESULT-LINE');
