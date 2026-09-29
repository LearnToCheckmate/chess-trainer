// regress/16-cpu-result-line.js  #434.  THE ONE STATUS SLOT ABOVE THE BOARD STATES THE RESULT AFTER THE
// RESULT CARD HAS GONE - vs the COMPUTER, where an adaptive-strength note used to hold that slot for ever.
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
// MEASURED there, and the count below is the run's own, not an estimate: 6 RED of 27, and they are exactly
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
//  * THE BOARD IS SACRED. A4 asserts the board's width and top are identical across the card fade, so a fix
//    that bought the result by moving the board would go red here.
//  * FOUR INPUTS, NOT ONE (R18): two geometries, the eloMsg-empty branch at the Elo floor, and Pass & Play.
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
async function slot(b){
  return b.page.evaluate(()=>{
    const el=document.querySelector('[data-ct="play-opening"]');if(!el)return null;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    return {t:(el.textContent||'').replace(/ /g,' ').replace(/\s+/g,' ').trim(),
            x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),
            sw:el.scrollWidth,cw:el.clientWidth,nowrap:cs.whiteSpace,ell:cs.textOverflow,op:+cs.opacity};
  });
}
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
    L.say(!!upSlot&&/Strength now ~450 Elo/.test(upSlot.t),tag+'1b '+geo+': and while the card is up the status slot carries the adaptive-strength note - asserted BEFORE the absence below, so a green here cannot come from eloMsg never being set (#385)',{slot:upSlot&&upSlot.t});
    await b.settle(5000);                                  // card gone
    const goneCard=await b.text('[data-ct="result-card"]'),dn=await slot(b),hits=await resultHits(b),dnBd=await b.board();
    L.say(goneCard===null,tag+'2a '+geo+': ~6.6s after the resignation the result card has gone',{card:goneCard});
    const want='Resigned · You lose';
    L.say(!!dn&&dn.t===want,tag+'2b '+geo+': and the status slot now states the result, as the app\'s own two-part string head + " · " + sub - not a regex any wording would satisfy (#388)',{slot:dn&&dn.t,want});
    L.say(!!dn&&/You lose/.test(dn.t),tag+'3 '+geo+': and the outcome it names is the one the GAME had - this side resigned as White, so the player lost, which is a fact about the game and not a reading off a sibling element (#389)',{slot:dn&&dn.t});
    L.say(hits.length>=1&&hits.some(h=>h.t===want),tag+'4 '+geo+': a scan of every painted element under 44 chars matching the result vocabulary finds the result on screen - this returned ZERO hits on the shipped #433 bundle',{hits});
    L.say(!!dn&&dn.op===1,tag+'5 '+geo+': the slot is actually painted (opacity 1), not present-and-invisible',{opacity:dn&&dn.op});
    L.say(!!dn&&dn.nowrap==='nowrap'&&dn.sw<=dn.cw+1,tag+'6 '+geo+': and nothing in that slot is silently cut - it is a nowrap ellipsis span whose scrollWidth fits its clientWidth. MEASURED in this span: the result is 143, the strength note 183, the two joined 340, and the slot is 96vw = 360 at 375 but 307.2 at 320 - so this assertion catches a concatenation at 320 and NOT at 375 (#387, #394)',{sw:dn&&dn.sw,cw:dn&&dn.cw,white:dn&&dn.nowrap,ell:dn&&dn.ell});
    L.say(!!upBd&&!!dnBd&&Math.abs(upBd.w-dnBd.w)<0.6&&Math.abs(upBd.y-dnBd.y)<0.6,tag+'7 '+geo+': and the board did not move one pixel across the card fade - the slot changing its text must never cost board geometry',{up:upBd&&{w:+upBd.w.toFixed(2),y:+upBd.y.toFixed(2)},down:dnBd&&{w:+dnBd.w.toFixed(2),y:+dnBd.y.toFixed(2)}});
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
    await resign(b);
    await b.settle(600);const upSlot=await slot(b);
    L.say(!!upSlot&&!/Strength/.test(upSlot.t),'C1 375x730: at the Elo floor a loss changes no strength, so the slot carries NO strength note while the card is up - the branch the job called unmeasured',{slot:upSlot&&upSlot.t});
    await b.settle(5000);const dn=await slot(b),hits=await resultHits(b);
    L.say(!!dn&&dn.t==='Resigned · You lose','C2 375x730: and with the slot free the result appears there exactly as it does for Pass & Play',{slot:dn&&dn.t});
    L.say(!!dn&&!/Strength/.test(dn.t)&&hits.some(h=>h.t==='Resigned · You lose'),'C3 375x730: with no strength note to pre-empt it, this input was already correct on #433 and stays correct here',{slot:dn&&dn.t,hits});
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

  // ══ NOT COVERED HERE, AND NAMED SO IT IS NOT MISTAKEN FOR COVERED ══
  // LANDSCAPE. `wide` (chess.jsx:2744) is true at 730x375 and chess.jsx:5616 does not render this slot AT ALL
  // when a game is over and wide, so at 730x375 NEITHER opponent shows a result after the card fades - MEASURED
  // on this bundle, vs Pip and Pass & Play alike, scan returns []. That is a second instance of the same
  // complaint through a different mechanism (the row is suppressed, not pre-empted) and it is filed as
  // jobs/landscape-drops-the-status-row-at-game-over-so-no-result-survives-the-card-2026-09-29, with the
  // board shrinking 224.00 -> 192.00 at the same moment, which is a board jump and a bigger question.
  // A TIME LOSS. The auditor measured one (a 1-minute clock flags at t+56s) and it is the same slot and the
  // same branch; it is not gated here because 56 seconds of wall clock per geometry is not a per-build cost.
}, 'CPU-RESULT-LINE');
