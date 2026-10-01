// gates/regress/65-promotion-after-gameover.js
// US-PL-14 / TC-PL-036. #439, from
// jobs/a-pawn-can-be-promoted-into-a-game-that-already-ended-on-time-2026-09-30, found by #438's auditor pass
// and measured by #438 as PRE-EXISTING on the #437 bundle (so not a #438 regression).
//
// ── THE DEFECT IS WIDER THAN THE JOB THAT ASKED FOR THIS GATE, AND THE WIDENING IS MEASURED ──────────────────
// The job says "the promotion dialog's own render and its handler" and that "the clock is the only route in".
// The first half is right and incomplete; the second half is right ONLY of the dialog. Measured on the REAL
// shipped #438 bundle (md5 166a99dd02e5) at 375x730, 0 console errors:
//   * THE DIALOG. Pass & Play, 1 min clock, 1.d4 e5 2.dxe5 a6 3.e6 b6 4.exf7+ Ke7, then f7-g8 to open the
//     picker, left open while White's clock ran out (57.5s). At the flag: result card 'Time! Black wins', the
//     control row correctly swapped to the game-over set (Moves/Back/Forward/Review/Rematch/More), AND the
//     picker still up with four ENABLED 52x52 buttons. Tapping the queen: move row 8 plies -> 9, appending
//     '5.fxg8=Q' to a game that had already ended, captured material +2 -> +13.
//   * THE BOARD, which the job does not name at all. The same flag with NO picker involved: a plain legal move
//     was accepted, plies 4 -> 5, '3.Bc4' appended. AND THE CLOCK IS NOT THE ONLY ROUTE - RESIGN IS ONE TOO,
//     and resign is one tap from the More sheet of every game: vs Computer, resigned, board accepted 3.Bc4
//     (plies 4 -> 5); Pass & Play, resigned, board accepted 1...e5 (plies 1 -> 2).
//   * THE COUNTER-EXAMPLE THAT LOCATES THE CAUSE. A MATED game correctly REFUSED the board (plies 4 -> 4).
//     That is what says the hole is in `playEnd` and not in the status check, and it is why D1/D2 below must
//     stay green on BOTH bundles.
//
// TWO SITES, TWO SEPARATE HOLES, AND THE SECOND IS NOT REACHED BY FIXING THE FIRST:
//   (1) humanCanMove() (chess.jsx, the play branch) tested getStatus(game) for checkmate/stalemate - the BOARD -
//       and never consulted playEnd, which is where resign, the clock flag and the #414 auto-draws live. It
//       governs every board tap and drag.
//   (2) the promotion picker's buttons call doMove(promo.g, m) DIRECTLY, so they never pass through
//       humanCanMove at all. Fixing (1) leaves the picker working perfectly on a dead game.
//
// ── WHY CLEARING THE STATE MATTERS AND A RENDER GUARD ALONE WOULD HAVE SHIPPED A NEW DEFECT ──────────────────
// The obvious fix is to stop PAINTING the picker when the game is over. Measured before writing it: fullReset -
// what Rematch and New game call - resets playEnd, the board, the clock and the move list but never touched
// `promo`. So a paint-only guard leaves the choice SET, and the next Rematch (where _gameOver is false again)
// raises a picker over the fresh game still holding the dead game's moves. A3 is the assertion for that, and it
// is the reason the fix clears the state in an effect and guards the paint only to close the one-frame race
// between the flag and a finger already on its way down.
//
// ── WHAT MAKES EACH ASSERTION ABLE TO FAIL, run against the REAL shipped #438 bundle rather than argued ──────
// MEASURED: the whole gate against gates/.trial/app-438-shipped.js (md5 166a99dd02e5) scores 38 pass / 9 FAIL.
//   A1 picker gone once the result card exists      -> #438: FAIL (up, 4 enabled 52x52 buttons)
//   A2 a tap where its pieces were changes nothing  -> #438: FAIL (plies 8 -> 9, '5.fxg8=Q' appended)
//   A2a no promotion in the row after the result    -> #438: FAIL ('5.fxg8=Q')
//   A2b captured material unchanged by that tap     -> #438: FAIL (+2 -> +13)
//   B1 board refuses a legal move after a flag      -> #438: FAIL (plies 4 -> 5, '3.Bc4')
//   C1 board refuses after resign, vs Computer      -> #438: FAIL (plies 4 -> 5) at BOTH geometries
//   C2 board refuses after resign, Pass & Play      -> #438: FAIL (plies 1 -> 2) at BOTH geometries
//
// A3 IS DIFFERENT AND THE FIRST DRAFT OF THIS TABLE GOT IT WRONG [R18]. It read "A3 -> #438: FAIL (stale picker
// survives fullReset)". MEASURED: A3 PASSES on #438, and it has to - on that bundle the A2 tap COMMITS the
// promotion and the handler's own setPromo(null) clears the state, so nothing stale is left for Rematch to find.
// A3 cannot be reddened by the shipped bundle at all. What it IS able to fail against is the PAINT-ONLY
// candidate - the fix a later run would naturally reach for - and that was built and run rather than argued:
// gates/.trial/app-nc2-paintonly.js (md5 14905f6f0ce3, the render guard kept and the clearing effect deleted)
// scores 12 pass / 1 FAIL, and the single red is A3. A1, A2, A2a and A2b all go GREEN on it. So the cheap fix
// closes the reported P0, looks complete to every other assertion in this gate, and raises a picker holding a
// dead game's moves over the next game. A3 is the only thing standing between those two outcomes, which is why
// it is here and why the fix clears the state rather than only hiding it.
//   A0, E1, E2, D1, D2 PASS ON BOTH BUNDLES BY DESIGN and are not part of the control count. They are what stops
//   this gate being satisfiable the cheap way - by disabling the board, or the picker, for everyone:
//     A0 INSTRUMENT VALIDATION. The picker must be UP, with four enabled buttons, on the LIVE game before the
//        flag. Every "it was gone / the tap did nothing" claim below is vacuous unless A0 passes first (#385's
//        rule that an absence assertion must first prove presence, and gate 64's B0).
//     A3b OVER-APPLICATION CONTROL, the rematch path. The rematched game must be PLAYABLE. It is here because A3
//        and A3a could not see its failure: the fix makes an ended game refuse the board by reading playEnd, so the
//        one way it could break the app is a playEnd outliving its game, and Rematch is the ONLY path where playEnd
//        was non-null the instant before. fullReset clears it synchronously so this passes - but that is a READING,
//        and the first version of this block asserted only "0 plies", which stays green on a stone-dead rematch.
//     E1 OVER-APPLICATION CONTROL, the board. A LIVE game must still ACCEPT a legal move. Without it, returning
//        false from humanCanMove unconditionally passes B1, C1 and C2 and breaks every game in the app.
//     E2 OVER-APPLICATION CONTROL, the picker. A LIVE promotion must still COMPLETE end to end and put the new
//        queen on the board. Without it, never rendering the picker passes A1/A2/A3 and makes promotion
//        impossible, which is strictly worse than the defect.
//     D1/D2 THE PREDICATE CONTROL. A MATED game refuses the board, and the control row is the game-over set.
//        Green on both bundles by construction; they are here so that a later change which swapped playEnd for
//        something coarser could not quietly pass.
//
// ── NOT CHECKED, said plainly ────────────────────────────────────────────────────────────────────────────────
//   * The FLAG block (A0..A3, B1) runs at 375x730 only, because each flag costs a real 60-second clock and two
//     geometries would put this gate past two minutes on its own. The picker is position:fixed inset:0 and
//     centred, so it is geometry-independent by construction - but that is a reading, not a measurement, and no
//     claim here is a claim at 320x568 for those assertions. The RESIGN, MATE and LIVE blocks run at both.
//   * An ONLINE game. Its own branch in humanCanMove already gates on og.status/og.result and the fix is a no-op
//     there, but sign-in and egress are both blocked in this sandbox so it is untraced rather than passed.
//   * Promotion in a vs-COMPUTER game - the job's own notChecked item. The picker is opened by the same single
//     call site for every opponent, which is why it is not duplicated here, but it is not driven.
//   * LANDSCAPE. Neither the auditor nor this gate drove 730x375.
//   * The #414 auto-draws by repetition and fifty-move. They set playEnd by the same path as resign, so the fix
//     covers them, and this gate does not reach them.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

const GEOS=['kunal730','se'];

const plies=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');if(!e)return -1;
  const t=(e.innerText||'').trim();const m=[...t.matchAll(/(\d+)(\.|…)\s*(\S+)/g)];if(!m.length)return 0;
  const last=m[m.length-1];return last[2]==='.'?2*(+last[1])-1:2*(+last[1]);});
const row=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const card=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="result-card"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const ctrls=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>(x.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).join(' | '));
// the captured-material readout, the "+13" the defect inflated
const taken=(b)=>b.page.evaluate(()=>[...new Set([...document.querySelectorAll('div,span')].map(d=>(d.innerText||'').trim()).filter(x=>/^[+-]\d+$/.test(x)))].join(','));
// the promotion picker: the position:fixed overlay whose own text starts "Promote to"
const picker=(b)=>b.page.evaluate(()=>{
  const ov=[...document.querySelectorAll('div')].find(d=>/^Promote to/.test((d.innerText||'').trim())&&getComputedStyle(d).position==='fixed');
  if(!ov)return null;
  const btns=[...ov.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;});
  return {n:btns.length,glyphs:btns.map(x=>(x.innerText||'').trim()).join(''),
          boxes:btns.map(x=>{const q=x.getBoundingClientRect();return Math.round(q.width)+'x'+Math.round(q.height);}).join(' '),
          enabled:btns.filter(x=>!x.disabled).length,
          centres:btns.map(x=>{const q=x.getBoundingClientRect();return [q.left+q.width/2,q.top+q.height/2];})};
});
// where the picker's four buttons WERE, remembered so a tap can be aimed there after it has gone (A2)
let PICKER_CENTRES=null;
// THE PIECE STANDING ON A SQUARE, identified by its own image rather than by text. Pieces are
// <img src="data:image/svg+xml;base64,…"> inside a transform:scale(1.06) wrapper, so a square's innerText is its
// rank/file LABEL and never its piece - the first draft of E2 counted '♕' glyphs off the 64 squares and returned 0
// Compared against the white queen's own image read off d1, which never moves in E's line.
// NOT via elementsFromPoint, which was the second draft and ALSO measured nothing: the piece images sit under
// pointer-events:none so the square itself takes the tap, so elementsFromPoint never returned the img and the helper
// gave null for BOTH squares - whereupon `a8After===wq` was null===null, a vacuous TRUE on every bundle. E1b is the
// assertion that caught it, which is why it is in the gate and not in a comment. The square's child index is computed
// from the board's own flip flag, because Pass & Play flips to whoever is to move and a fixed index is wrong after
// every ply; the arithmetic is lib.js's own sqCenter, reused rather than reinvented.
const pieceAt=async(b,sq)=>{const bd=await b.board();if(!bd)return null;
  return b.page.evaluate(([s,flip])=>{
    const f=s.charCodeAt(0)-97,r=parseInt(s[1],10)-1;
    const col=flip?7-f:f,row=flip?r:7-r;
    const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    let best=null;for(const e of g){const rc=e.getBoundingClientRect();if(rc.width<40)continue;if(!best||rc.width>best.w)best={w:rc.width,el:e};}
    if(!best)return null;
    const cell=best.el.children[row*8+col];if(!cell)return null;
    const img=cell.querySelector('img');return img?img.src:null;
  },[sq,bd.flip]);};

async function tapBtn(b,re,wait){
  const h=await b.page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;
    for(const el of document.querySelectorAll('button')){const t=(el.innerText||'').trim();if(!re.test(t))continue;
      const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}
    if(best)best.scrollIntoView({block:'center',inline:'center'});return best;},[re.source,re.flags]);
  const el=h.asElement();if(!el)return false;
  await b.page.waitForTimeout(150);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return true;
}
// Pass & Play with a 1-minute clock (drive/play's setup-passplay deliberately chooses No clock)
async function ppClock(b){
  await b.home();await b.tile('Play');await b.settle(500);
  await tapBtn(b,/^Pass & Play$/,400);
  await b.tapText(/^1 min$/,{wait:300});
  await b.page.evaluate(()=>{for(const el of document.querySelectorAll('div')){const st=getComputedStyle(el);if((st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1)el.scrollTop=0;}});
  await tapBtn(b,/^▶ Start game$/,900);
  if(!(await b.page.evaluate(()=>{const p=document.querySelector('[data-ct="moves-panel"]');return p?getComputedStyle(p).visibility==='visible':false;})))
    await tapBtn(b,/^Moves$/,400);
}
async function resignHere(b){await tapBtn(b,/^More$/,500);await tapBtn(b,/^Resign$/,600);await tapBtn(b,/^Tap again to resign$/,1100);}
async function waitFlag(b,ms){const t0=Date.now();while(Date.now()-t0<(ms||140000)){if(await card(b))return Date.now()-t0;await b.page.waitForTimeout(250);}return null;}

// ── A: the picker at a clock flag, and the Rematch resurrection. 375x730 only (each flag is a real 60s). ──────
async function blockA(){
  const b=await L.launch({geo:'kunal730',name:'65A'});await b.open();
  await ppClock(b);
  for(const [f,t] of [['d2','d4'],['e7','e5'],['d4','e5'],['a7','a6'],['e5','e6'],['b7','b6'],['e6','f7'],['e8','e7']]) await b.move(f,t,200);
  const p0=await plies(b);
  L.say(p0===8,'A0a the 8-ply promotion position was reached',{plies:p0,row:await row(b)});
  await b.move('f7','g8',400);
  const up=await picker(b);
  // A0 INSTRUMENT VALIDATION: the thing A1 asserts absent must be present, and usable, first
  L.say(!!up&&up.n===4&&up.enabled===4,'A0 INSTRUMENT: the picker is up with four enabled buttons on the LIVE game',up);
  if(up)PICKER_CENTRES=up.centres;
  const pDuring=await plies(b);
  L.say(pDuring===8,'A0b opening the picker commits no move',{plies:pDuring});
  const takenBefore=await taken(b);
  const ms=await waitFlag(b,140000);
  L.say(ms!==null,'A0c White'+"'"+'s clock flagged with the picker open',{ms});
  const cd=await card(b);
  L.say(/Time/i.test(cd||''),'A0d the game ended on time',{card:cd});
  const cr=await ctrls(b);
  L.say(/Rematch/.test(cr),'A0e the control row swapped to the game-over set',{ctrls:cr.slice(0,120)});
  // A1: THE HEADLINE
  const after=await picker(b);
  L.say(after===null,'A1 the picker is GONE once the result card exists',after||'absent');
  await b.shot('439-65-A1-picker-at-flag');
  // A2: and a tap where its pieces were changes nothing
  const pFlag=await plies(b);
  if(PICKER_CENTRES&&PICKER_CENTRES.length){await b.page.mouse.click(PICKER_CENTRES[0][0],PICKER_CENTRES[0][1]);await b.page.waitForTimeout(700);}
  const pTap=await plies(b),rTap=await row(b);
  L.say(pTap===pFlag,'A2 a tap where the queen button was appends no move',{before:pFlag,after:pTap,row:rTap});
  L.say(!/=Q/.test(rTap||''),'A2a the move row carries no promotion played after the result',{row:rTap});
  const takenAfter=await taken(b);
  L.say(takenAfter===takenBefore,'A2b the captured-material readout is unchanged by that tap',{before:takenBefore,after:takenAfter});
  // A3: Rematch must not resurrect the stale choice (fullReset never cleared `promo`)
  await tapBtn(b,/^Rematch$/,1200);
  const resurrect=await picker(b);
  const pFresh=await plies(b);
  L.say(resurrect===null,'A3 Rematch raises no picker on the fresh game',resurrect||'absent');
  L.say(pFresh===0,'A3a the rematch is a fresh game at 0 plies',{plies:pFresh});
  // A3b THE OVER-APPLICATION CONTROL FOR THE REMATCH PATH, and it exists because A3/A3a could not see its failure.
  // The fix makes an ENDED game refuse the board by reading playEnd, so the one way it could break the app is a
  // playEnd that outlives its game - and Rematch is the ONLY path where playEnd was non-null the instant before.
  // fullReset clears it synchronously, so this passes; but that is a READING of the source, and A3 and A3a would
  // both stay green on a build where the rematched game was stone dead. This is the assertion that would not.
  await b.move('e2','e4',400);
  const pPlayed=await plies(b);
  L.say(pPlayed===1,'A3b CONTROL: the rematched game is PLAYABLE - it accepts a legal move',{before:pFresh,after:pPlayed,row:await row(b)});
  L.say(b.errs.length===0,'A4 no console errors in the flag block',{errs:b.errs.length});
  await b.close();
}

// ── B: the BOARD at a clock flag - the half the job does not name. 375x730 only, same 60s reason. ─────────────
async function blockB(){
  const b=await L.launch({geo:'kunal730',name:'65B'});await b.open();
  await ppClock(b);
  for(const [f,t] of [['e2','e4'],['e7','e5'],['g1','f3']]) await b.move(f,t,200);
  const p0=await plies(b);
  await b.move('b8','c6',300);
  const pLive=await plies(b);
  L.say(pLive===p0+1,'B0 INSTRUMENT: the same tap advances a LIVE game',{before:p0,after:pLive});
  const ms=await waitFlag(b,140000);
  L.say(ms!==null,'B0a the game ended on time',{ms,card:await card(b)});
  const pFlag=await plies(b);
  await b.move('f1','c4',500);
  const pAfter=await plies(b),rAfter=await row(b);
  L.say(pAfter===pFlag,'B1 the board refuses a legal move after a clock flag',{before:pFlag,after:pAfter,row:rAfter});
  L.say(b.errs.length===0,'B2 no console errors in the board-flag block',{errs:b.errs.length});
  await b.shot('439-65-B1-board-after-flag');
  await b.close();
}

// ── C, D, E: resign, mate and live. No clock, so both geometries. ────────────────────────────────────────────
async function blockCDE(geo){
  const g=geo==='se'?'320x568':'375x730';
  // C1 vs Computer, resigned
  {
    const b=await L.launch({geo,name:'65C1-'+geo});await b.open();
    await P.states['cpu-resigned'](b);
    const cd=await card(b),p0=await plies(b);
    L.say(/Resign/i.test(cd||''),'C0 ['+g+'] the vs-Computer game is resigned',{card:cd});
    await b.move('f1','c4',500);
    const p1=await plies(b);
    L.say(p1===p0,'C1 ['+g+'] the board refuses a legal move after resign, vs Computer',{before:p0,after:p1,row:await row(b)});
    L.say(b.errs.length===0,'C1e ['+g+'] no console errors',{errs:b.errs.length});
    await b.close();
  }
  // C2 Pass & Play, resigned
  {
    const b=await L.launch({geo,name:'65C2-'+geo});await b.open();
    await P.states['pp-1'](b);
    await resignHere(b);
    const cd=await card(b),p0=await plies(b);
    L.say(/Resign/i.test(cd||''),'C2a ['+g+'] the Pass & Play game is resigned',{card:cd});
    await b.move('e7','e5',500);
    const p1=await plies(b);
    L.say(p1===p0,'C2 ['+g+'] the board refuses a legal move after resign, Pass & Play',{before:p0,after:p1,row:await row(b)});
    await b.close();
  }
  // D THE PREDICATE CONTROL: a mated game already refused, on both bundles
  {
    const b=await L.launch({geo,name:'65D-'+geo});await b.open();
    await P.states['pp-mate'](b);
    const p0=await plies(b),cd=await card(b);
    L.say(/Checkmate/i.test(cd||''),'D0 ['+g+'] the game is mated',{card:cd});
    await b.move('e1','e2',500);
    const p1=await plies(b);
    L.say(p1===p0,'D1 ['+g+'] CONTROL: a mated game refuses the board (green on both bundles)',{before:p0,after:p1});
    L.say(/Rematch/.test(await ctrls(b)),'D2 ['+g+'] CONTROL: the mated game carries the game-over row',{});
    await b.close();
  }
  // E THE OVER-APPLICATION CONTROLS: a live game still plays, and a live promotion still completes
  {
    const b=await L.launch({geo,name:'65E-'+geo});await b.open();
    await P.states['pp-m0'](b);
    const p0=await plies(b);
    await b.move('e2','e4',400);
    const p1=await plies(b);
    L.say(p1===p0+1,'E1 ['+g+'] CONTROL: a LIVE game still accepts a legal move',{before:p0,after:p1});
    // a live promotion, end to end: 1.e4 d5 2.exd5 c6 3.dxc6 a6 4.cxb7 a5 5.bxa8=Q
    for(const [f,t] of [['d7','d5'],['e4','d5'],['c7','c6'],['d5','c6'],['a7','a6'],['c6','b7'],['a6','a5']]) await b.move(f,t,200);
    const wq=await pieceAt(b,'d1');          // the white queen's own image, from the square she has not left
    const a8Before=await pieceAt(b,'a8');
    L.say(!!wq&&a8Before!==wq,'E1b ['+g+'] INSTRUMENT: a white queen is identifiable and a8 does not hold one yet',{d1:!!wq,a8IsQueen:a8Before===wq});
    await b.move('b7','a8',400);
    const up=await picker(b);
    L.say(!!up&&up.enabled===4,'E2a ['+g+'] CONTROL: a LIVE promotion still opens the picker',up);
    if(up&&up.centres.length){await b.page.mouse.click(up.centres[0][0],up.centres[0][1]);await b.page.waitForTimeout(700);}
    const a8After=await pieceAt(b,'a8'),rE=await row(b);
    L.say(!!wq&&!!a8After&&a8After===wq,'E2 ['+g+'] CONTROL: a LIVE promotion COMPLETES and a WHITE QUEEN now stands on a8',{matchesWhiteQueen:a8After===wq,a8Empty:a8After===null,row:rE});
    L.say(/=Q/.test(rE||''),'E2b ['+g+'] CONTROL: the promotion is written into the move row',{row:rE});
    L.say((await picker(b))===null,'E2c ['+g+'] CONTROL: the picker closes after a live choice',{});
    L.say(b.errs.length===0,'E3 ['+g+'] no console errors in the live block',{errs:b.errs.length});
    await b.shot('439-65-E2-live-promotion-'+geo);
    await b.close();
  }
}


// ── F: THE OVER-APPLICATION CONTROL THAT COSTS THE MOST TO REACH, AND THE REASON THE FIX IS SCOPED TO PLAY MODE ──
// `playEnd` is cleared by exactly ONE function, fullReset, and NOTHING clears it on the way into Review or Analyze
// (grep: 5 setPlayEnd sites, 4 of them setting an ending and 1 clearing it inside fullReset). `_gameOver` is
// `playEnd || getStatus(game)` and SHORT-CIRCUITS on playEnd, so after a resign or a flag it stays true for as long
// as the player stays out of a new game - INCLUDING once they walk Review -> Start review -> the round Analyze
// button onto a live analysis board. A picker guard written as `!_gameOver` with no mode term therefore suppresses
// the promotion picker on the ANALYSIS board too, where the game being over is irrelevant and the player is just
// trying moves: they push a pawn to the last rank and NOTHING HAPPENS. That is a silent dropped move, which is
// worse for that player than the defect this gate exists to fix. F1 is the assertion that catches it; the shipped
// fix scopes both the effect and the render guard to `mode==='play'`, and NC3 (gates/.trial/app-nc3-broadguard.js)
// is the unscoped version, on which F1 is the red.
async function blockF(){
  const b=await L.launch({geo:'kunal730',name:'65F'});await b.open();
  await P.states['cpu-resigned'](b);
  const cd=await card(b);
  L.say(/Resign/i.test(cd||''),'F0 the play game is over by resignation, so playEnd is set',{card:cd});
  /* #451: THIS ARRIVAL WAS UNDER-SETTLED AND IT MADE THIS GATE NON-DETERMINISTIC ACROSS MACHINES, not across runs -
     which is why "run it twice" never caught it. The review of a PLAYED game is engine-bound: it analyses the game
     before the summary mounts. The fixed 3000ms wait below was enough on the machine #450 ran on (its committed log
     has this gate green at 58 pass / 0 fail on bundle ce2d8b7896c3) and is NOT enough here: measured on that SAME
     bundle, `[data-ct="rev-summary"]` is ABSENT at +0ms after the 3000ms wait and PRESENT ~2000ms later, so the real
     arrival is around 5s. The gate then went 49 pass / 2 fail, reproducibly, twice, on the bundle its own log calls
     green - two readings of one bundle, which is the instrument fault this project has now hit twice (gate 26's
     short375 row is the other). F0a and F0b are ARRIVAL CHECKS whose whole job is to stop the assertions after them
     being vacuous, so a race in them is strictly worse than useless: it reds a healthy bundle and names the wrong
     cause. POLLED, not lengthened: a fixed 8000ms would be the same bug with a bigger number and would also spend
     5s on every run that does not need it. The ASSERTION IS UNCHANGED - the summary must open - and the bound is
     generous enough to be about the app rather than about the machine.
     Pre-existing: block F arrived at #439. Not caused by #451, measured on #450's own bundle before being touched.
     jobs/gate-65-block-f-arrival-is-engine-bound-and-was-fixed-wait-2026-10-01. */
  await b.tapText(/^Review$/,{wait:600});
  let onSummary=false;
  for(let i=0;i<30;i++){                                  // up to ~15s, polled; exits the moment it mounts
    onSummary=await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-summary"]'));
    if(onSummary)break;
    await b.settle(500);
  }
  L.say(onSummary,'F0a the review summary of the played game opened (polled - it is engine-bound, see the note above)',{onSummary});
  if(!onSummary){L.say(false,'F0a-guard block F cannot continue without the summary, so the rest of F is NOT reported as passing [#393]');return b.close();}
  await b.tapText(/^Start review ›$/,{wait:1500});
  await b.tapCt('rev-fab',900);
  const inAna=await b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>/Exit analysis/.test((x.innerText||''))));
  L.say(inAna,'F0b the analysis board is up (Exit analysis is offered), with the finished game still behind it',{});
  // 1.h4 a5 2.h5 a4 3.h6 a3 4.hxg7 axb2  then 5.gxh8 is a promotion with a choice
  for(const [f,t] of [['h2','h4'],['a7','a5'],['h4','h5'],['a5','a4'],['h5','h6'],['a4','a3'],['h6','g7'],['a3','b2']]) await b.move(f,t,260);
  await b.move('g7','h8',700);
  const up=await picker(b);
  L.say(!!up&&up.enabled===4,'F1 CONTROL: a promotion on the ANALYSIS board still opens the picker after the play game ended',up||'ABSENT - the picker was suppressed by a _gameOver guard with no mode term');
  if(up&&up.centres.length){await b.page.mouse.click(up.centres[0][0],up.centres[0][1]);await b.page.waitForTimeout(800);}
  const stillUp=await picker(b);
  L.say(stillUp===null,'F1b CONTROL: and choosing a piece closes it',{});
  // #356's allowed engine trap, EXACT TEXT ONLY, the same filter gates 14, 15, 20 and 21 already use. The
  // analysis board runs Stockfish, and this route produces 3 of these on the SHIPPED #438 bundle too - measured,
  // not assumed - so an assertion of "zero errors" here is red on a healthy build, which is how an assertion
  // becomes decoration. Everything that is NOT that exact trap still fails this.
  const badF=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(badF.length===0,'F2 no app error in the analysis block beyond the allowed engine trap (#356)',{allowed:b.errs.length-badF.length,other:badF.slice(0,3)});
  await b.shot('439-65-F1-analysis-promotion');
  await b.close();
}


// ── G: THE DRAG, which is the half of the board's input space b.move() cannot reach ──────────────────────────
// FOUND BY ANTAGONIST A, which vetoed the first version of this fix. lib.js's b.move() is tap-then-tap
// (two mouse.click calls), so the pointer is NEVER down across a state change and every assertion above is blind
// to a drag in flight. onPtrUp reaches commitOrPromote WITHOUT re-checking humanCanMove - only onPtrDown calls it -
// so on the first candidate a piece picked up while the game was live and released after the clock flagged still
// committed: A measured '3...Nf6' appended to a game whose card read 'Time! White wins', 0 console errors.
// This is an INPUT, not an assertion: the same G1 is red on that candidate and green once doMove itself is guarded.
async function blockG(){
  const b=await L.launch({geo:'kunal730',name:'65G'});await b.open();
  await ppClock(b);
  for(const [f,t] of [['e2','e4'],['e7','e5'],['g1','f3']]) await b.move(f,t,200);
  // INSTRUMENT: a press-drag-release must commit a move in a LIVE game, or G1 is vacuous
  const drag=async(from,to)=>{const a=await b.sqCenter(from),z=await b.sqCenter(to);
    await b.page.mouse.move(a.x,a.y);await b.page.mouse.down();
    await b.page.mouse.move(a.x+14,a.y+14,{steps:3});await b.page.mouse.move(z.x,z.y,{steps:8});
    await b.page.waitForTimeout(80);await b.page.mouse.up();await b.page.waitForTimeout(500);};
  const p0=await plies(b);
  await drag('b8','c6');
  const pLive=await plies(b);
  L.say(pLive===p0+1,'G0 INSTRUMENT: press-drag-release commits a move in a LIVE game',{before:p0,after:pLive,row:await row(b)});
  // now pick a piece UP and hold it while the clock runs out
  const a=await b.sqCenter('f1');
  await b.page.mouse.move(a.x,a.y);await b.page.mouse.down();
  await b.page.mouse.move(a.x+16,a.y+16,{steps:3});          // past the drag threshold, piece in hand
  const ms=await waitFlag(b,140000);
  L.say(ms!==null,'G0a the clock flagged WITH THE PIECE STILL HELD',{ms,card:await card(b)});
  const pFlag=await plies(b);
  const z=await b.sqCenter('c4');
  await b.page.mouse.move(z.x,z.y,{steps:8});await b.page.waitForTimeout(80);
  await b.page.mouse.up();await b.page.waitForTimeout(600);
  const pAfter=await plies(b),rAfter=await row(b);
  L.say(pAfter===pFlag,'G1 releasing a piece held across the ending appends NO move',{before:pFlag,after:pAfter,row:rAfter});
  L.say(b.errs.length===0,'G2 no console errors in the drag block',{errs:b.errs.length});
  await b.shot('439-65-G1-drag-across-the-flag');
  await b.close();
}

L.run(async()=>{
  const only=(process.env.CT_B65||'').split(',').filter(Boolean);
  const want=(x)=>!only.length||only.includes(x);
  if(want('A'))await blockA();
  if(want('B'))await blockB();
  if(want('CDE'))for(const g of GEOS)await blockCDE(g);
  if(want('F'))await blockF();
  if(want('G'))await blockG();
},'65-promotion-after-gameover');
