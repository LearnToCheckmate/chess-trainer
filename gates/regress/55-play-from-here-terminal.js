// gates/regress/55-play-from-here-terminal.js
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [#550 item (59); jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21]: every launch in this file passes ct_pool, so the app runs its POOLED Stockfish path and the single-worker and built-in fallbacks (the harness route is the launch option engineFail 'pool' or 'all', driven by gate 34) are NOT exercised here. Its assertions DEPEND on that branch: its reviews come from the pooled engine, and the terminal plies it reaches are found through them.
// CONTROL-RECORD: 6e56cfc 2026-11-11 total=77 red=1 scope=trial:5450c9f91a7a how=#550 item (12): the Play-from-here position read from boardGame instead of anaMode?game:review.positions[ply] - the one line that pins which position the sheet row tests red; every other line green
// CONTROL-RECORD: 6e56cfc 2026-11-11 total=77 red=6 scope=trial:16fa026d3593 how=#550 item (12), re-run of #549 job 12's deferred control on the committed 77-assertion gate: the review sheet's Play from here row's dis={_pfT} replaced by dis={false} - A14 and A15 red at mate@kunal730, mate@se and stale@kunal730; every other line green; the tree's trial d044eeb93e96 reads 77 pass 0 fail
// CONTROL-RECORD: faa82a9 2026-11-13 total=77 red=7 scope=trial:040edef055d0 how=#550 job gate-55s-changed-assertions-in-6e56cfc-carry-no-control-record (the third control, #549 job 12's 'HEAD source 67/7'): BOTH 6e56cfc fixes undone on the tip's chess.jsx (the row captures boardGame again, and dis={false}) - A14 and A15 red at mate@kunal730, mate@se and stale@kunal730 and D2 red at preview@kunal730, every other line green; on 342f7329901b 77/0
// CONTROL-RECORD: aaec56b 2026-11-13 total=77 red=4 scope=trial:9c7713635681 how=#550 #432 sweep round 2 (setup-terminal-note re-keyed by its words): c1, the hook renamed AND the terminal warning painted whenever the position is NOT blocked - C2 at control@kunal730 and A12 at mate@kunal730, mate@se, stale@kunal730 red; the hook-keyed version (a7f55b2) on the same bundle is 62/15 with those four GREEN (its reds are A1-A3/A10/A11, the missing hook); on t0 fb3bb7b31754 77/0
// jobs/play-from-here-at-a-terminal-ply-starts-a-lost-game-2026-09-27, whose `coverage` field read
// "NO GATE COVERS THIS ROUTE AT ALL". Landed at #466.
//
// PROVENANCE, because this gate was not written here: the SIT lane wrote a runnable version at
// tracker docs/sit-gate-play-from-here-terminal-ply-2026-09-28 (run 14, sit__1790631661025) and could
// not commit it - only the build lane holds the pen - so it sat unlanded for four days. Its shape, its
// two PGNs and its five precondition companions are kept. THREE THINGS CHANGED, all measured here:
//
//  1. ITS THIRD ASSERTION IS NO LONGER A DEFECT AND ITS expectedToday IS NOW WRONG. That document says
//     the mate arm fails the WARN, STRENGTH and OUTCOME assertions on #427. MEASURED on the shipped
//     #465 bundle (89bfb96fb381) at 375x730 by gates/pending/probe466-pfh.js: WARN fails and STRENGTH
//     fails, but OUTCOME **PASSES** - play-opening reads "Checkmate! · You lose" at +4.3s. #434 and
//     #435 fixed it in passing while working on something else ("the result OWNS this slot once the
//     result card has gone"). A run that landed the SIT file unchanged and saw 3 of 3 pass would have
//     read a stale expectation as a regression. This is R35: a claim is about the configuration it was
//     measured in, and that one was #427.
//  2. THE FIX REFUSES, so the shape inverts. SIT's gate asserted that a game STARTS and then checked
//     the strength and the outcome on it. #466 guards the committer, so at a terminal ply NO GAME
//     STARTS and the assertions are about the refusal.
//  3. A POSITIVE CONTROL AT A NON-TERMINAL PLY IS ADDED, and it is the most important block here. A
//     guard on the committer could break "Play from here" everywhere, and nothing in SIT's version
//     would have noticed. Block C drives the ordinary route end to end and requires it to still work.
//
// KNOW WHAT THIS GATE CANNOT SEE, stated rather than implied [the #449 inert-arm discipline]. #466 has a
// SECOND guard: the adaptive-Elo effect ignores a board ending with no moves played. While the
// committer's refusal stands, no UI path can reach that effect with a 0-move board ending, so this gate
// cannot exercise it and its green says nothing about it. It is proved live only by the negative control
// that reverts the refusal alone, where the game starts and ct_elo must STILL not move. That control's
// numbers are in the #466 run report; they are not re-derivable from this file.
//
// #549 item (12) CHANGED THE SHAPE AGAIN: the review's ⋯ "Play from here" row is DISABLED at a terminal ply, so the
// refusal happens where he already stands (A14, A15). The setup sheet's committer guard stays as the board-scan
// route's defence, and A1-A13 reach it through that route with the scan double. Block D covers the folded best-line
// preview capture. The full account and the controls are in TC-R43's #549 amendment (claude/stories/TEST-CASES.md).
'use strict';
const L=require('../lib'), R=require('../drive/review'), P=require('../drive/play');
const MATE='[Event "T"]\n[Site "Chess.com"]\n[Date "2026.09.02"]\n[White "Jsmiller1112"]\n[Black "DukeKarlCountIsouard99"]\n[Result "0-1"]\n[WhiteElo "1523"]\n[BlackElo "1487"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
const STALE='[Event "T"]\n[Site "Chess.com"]\n[Date "2026.09.03"]\n[White "Jsmiller1112"]\n[Black "DukeKarlCountIsouard99"]\n[Result "1/2-1/2"]\n[WhiteElo "1523"]\n[BlackElo "1487"]\n\n1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. Qxc7 Rah6 5. h4 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2';

const elo=(b)=>b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return 'ERR';}});
const vis=async(b,sel)=>!!(await b.rect(sel));
// THE ORDINARY BANNER IS LOCATED BY WHAT IT SAYS, NOT BY A data-ct, and that is not a stylistic choice.
// The first version of this gate read `[data-ct="setup-fen-note"]`, a hook #466 had added to that div for its
// own convenience - and gates/regress/45-play-setup.js:431 (TC-PS-038) asserts that this exact div carries NO
// data-ct, so the hook would have reddened a required gate at both its geometries. The hook is gone and this is
// how the element is found. It is also the rule #432 already wrote down: an assertion keyed to a selector its
// own build adds cannot be controlled.
const ordinaryNote=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="setup-sheet"]'); if(!s)return null;
  const d=[...s.querySelectorAll('div')].find(x=>/Continuing from your reviewed position/.test(x.innerText||'')&&x.children.length<=2);
  return d?(d.innerText||'').trim():null;});
// THE TERMINAL NOTE IS FOUND BY WHAT IT SAYS TOO [#550 #432 sweep, round 2; jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-
// cannot-control-2026-09-29]. The note carries a data-ct #466 added in the same build as C2 and A12, both of which assert its ABSENCE -
// so on a control that renamed the hook and painted "⚠ That position is already over" above an enabled button (at a playable ply, and
// at Online) the hook-keyed C2 and A12 PASSED, reading a hole the fix had drilled. This finds the innermost painted div inside the setup
// sheet whose text begins with the warning; the hook is a fallback only.
const termNote=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="setup-sheet"]'); if(!s)return null;
  const RE=/^\u26a0\s*That position is already over/;
  const on=(x)=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0;};
  const hits=[...s.querySelectorAll('div')].filter(x=>RE.test((x.innerText||'').trim())&&on(x));
  let d=hits.find(x=>!hits.some(y=>y!==x&&x.contains(y)));
  if(!d){const h=s.querySelector('[data-ct="setup-terminal-note"]');if(h&&on(h))d=h;}
  return d?(d.innerText||'').replace(/\s+/g,' ').trim():null;});
// THE STATE ANTAGONIST A NAMED AS UNCOVERED: `opponent` is a user-tappable pill eight rows above the confirm
// button, and the refusal is deliberately OFF for 'online'. The note and the button must agree at EVERY value,
// which is the defect B found - they used to read two different expressions, so switching to Online left the
// amber "there is no move to play from it" above an ENABLED "Continue -> ".
const noteAndButton=async(b)=>{
  const note=!!(await termNote(b));
  const btn=await confirmBtn(b);
  return {note,btn};};
// [#549 item (19), folded in by item (12)] THE CONFIRM BUTTON IS FOUND BY WHAT IT SAYS inside the setup sheet, not by the
// data-ct #466 added with these assertions: on the pre-#466 bundle that hook is absent, so a hook-keyed tap clicked NOTHING
// and A7-A9 ("tapping it starts nothing") PASSED on the one bundle where tapping it started a game. The hook is a FALLBACK
// only, and the reading says which locator found it (`by`).
const CONFIRM_RE=/^(\u25b6 Start game|\u25b6 Play this position|That position is already over|Continue \u2192|Tap again to discard your game and start|Tap again to discard your game)$/;
const confirmBtn=(b)=>b.page.evaluate((src)=>{const re=new RegExp(src);const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
  const xs=[...s.querySelectorAll('button')].filter(x=>re.test((x.innerText||'').trim()));let e=xs[xs.length-1],by='text';
  if(!e){e=s.querySelector('[data-ct="setup-start"]');by='hook';}
  if(!e)return null;document.querySelectorAll('[data-gate-confirm]').forEach(x=>x.removeAttribute('data-gate-confirm'));e.setAttribute('data-gate-confirm','1');
  return {txt:(e.innerText||'').trim(),dis:!!e.disabled,hook:e.getAttribute('data-ct'),by};},CONFIRM_RE.source);
async function openRoute(b){ await b.tapCt('rev-more',500); const sheet=await b.texts();
  const offers=sheet.some(x=>/^Play from here$/.test(x));
  if(offers) await b.tapText(/^Play from here$/,{wait:900});
  return offers; }
// #549 item (12): THE ROW IS FOUND BY WHAT IT SAYS, inside the review's ⋯ sheet, never by the data-ct this build adds
// (#432: a check keyed to a hook its own build adds cannot see the defect the build removes - on the #548 bundle
// the hook is absent and a hook-keyed "disabled" check would read null rather than "enabled").
const pfhRow=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-sheet"]');if(!s)return null;
  const e=[...s.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Play from here');if(!e)return null;
  const r=e.getBoundingClientRect();return {dis:!!e.disabled,op:getComputedStyle(e).opacity,x:r.x+r.width/2,y:r.y+r.height/2,h:Math.round(r.height)};});
// The board as 64 cells read in DOM order, each cell's piece by its image source or glyph. Orientation can differ
// between Review and Play, so a comparison accepts the snapshot or its reverse; what it may NOT match is a
// DIFFERENT position.
const cells=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null,bw=0;for(const e of els){const w=e.getBoundingClientRect().width;if(w>bw){bw=w;best=e;}}if(!best)return null;
  // the 64 SQUARES only (the grid also carries an animation overlay while a line plays), each square's piece by a
  // hash of its WHOLE image source: every piece is a data: URI and their tails are the same closing bytes.
  const h=(t)=>{let x=5381;for(let i=0;i<t.length;i++)x=((x*33)^t.charCodeAt(i))>>>0;return t?x.toString(36):'';};
  const sq=[...best.children].filter(c=>Math.abs(c.getBoundingClientRect().width-bw/8)<1.5);if(sq.length!==64)return null;
  return sq.map(c=>{const im=c.querySelector('img');return h(im?(im.getAttribute('src')||''):'')+((c.innerText||'').replace(/[a-h1-8\s]/g,''));});});
const same=(a,b)=>!!a&&!!b&&a.length===64&&b.length===64&&(a.join('|')===b.join('|')||a.join('|')===[...b].reverse().join('|'));
// THE SCAN DOUBLE, the same seam gates/regress/28-scan-client.js uses (window.CTCloud._scanBoard is what the
// deployed bridge assigns). Since #549 the review row refuses BEFORE the setup sheet, so the committer guard - which
// stays, as the defence for the scan route - is reached here the only way a player still can: a scan that reads a
// finished position.
const zlib=require('zlib');
function png8(){const w=8,h=8,raw=Buffer.alloc(h*(1+w*3));for(let y=0;y<h;y++){raw[y*(1+w*3)]=0;for(let x=0;x<w*3;x++)raw[y*(1+w*3)+1+x]=((x+y)%2)?200:40;}
  const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);T[n]=c>>>0;}
  const crc=(buf)=>{let c=0xffffffff;for(let i=0;i<buf.length;i++)c=T[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td),0);return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const FEN={mate:'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',stalemate:'5bnr/4p1pq/4Qpkr/7p/7P/4P3/PPPP1PP1/RNB1KBNR b KQ - 2 10'};
async function scanInto(b,fen){
  await P.states['setup'](b); await b.settle(200);
  await b.page.evaluate(()=>{const C=window.CTCloud;if(C&&C._emit)C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null});});
  await b.settle(250);
  await b.page.evaluate((fen)=>{window.CTCloud._scanBoard=function(){return Promise.resolve({ok:true,fen});};},fen);
  await b.page.locator('input[type=file]').nth(1).setInputFiles({name:'board.png',mimeType:'image/png',buffer:png8()});
  await b.settle(1200);
}

// ---- A/B: the TERMINAL ply. The route must refuse, and say why. ----
async function terminal(b,pgn,kind,tag){
  await R.importPgn(b,pgn,180000);
  await R.startReview(b);
  const N=await R.goPly(b,999);
  const root=await b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' '));
  const saysTerminal=kind==='mate'?/won by checkmate|Checkmate/.test(root):/Stalemate\. The game is drawn|Draw ½|Stalemate/.test(root);
  L.say(saysTerminal, tag+': PRECONDITION the review itself says this ply is terminal', 'plies='+N);
  // A14/A15 [#549 item (12)]: THE REFUSAL HAPPENS AT THE ROW. At a terminal ply the review's ⋯ sheet still SHOWS
  // "Play from here" (mounted, the Takeback pattern) but it is disabled, and tapping it leaves him in his review at
  // the same ply - where the remedy, stepping back a move, is one tap away. Until #549 the tap navigated into a
  // full-screen setup sheet to be refused there.
  await b.tapCt('rev-more',500);
  const row=await pfhRow(b);
  L.say(!!row, tag+': PRECONDITION the ⋯ sheet offers "Play from here" (found by TEXT)', JSON.stringify(row));
  L.say(!!row&&row.dis===true, tag+': A14 the "Play from here" row is DISABLED at a terminal ply', JSON.stringify(row));
  if(row){ await b.page.mouse.click(row.x,row.y); await b.settle(900); }
  const after=await b.page.evaluate(()=>({setup:!!document.querySelector('[data-ct="setup-sheet"]'),root:document.getElementById('root').innerText.replace(/\s+/g,' ')}));
  const stillTerminal=kind==='mate'?/won by checkmate|Checkmate/.test(after.root):/Stalemate\. The game is drawn|Draw ½|Stalemate/.test(after.root);
  L.say(!!row&&!after.setup&&stillTerminal, tag+': A15 tapping it does NOT navigate - no setup sheet, still on the review at the SAME terminal ply', JSON.stringify({setup:after.setup,stillTerminal}));
  await R.closeSheet(b);
  // The committer guard stays (it is the scan route's defence), so A1..A13 now reach it by the scan route.
  await scanInto(b,FEN[kind]);
  L.say(await vis(b,'[data-ct="setup-sheet"]'), tag+': PRECONDITION the setup sheet opened, from a scan of the finished position');

  const note=await termNote(b);
  L.say(!!note, tag+': A1 the setup sheet carries the TERMINAL note', note&&note.slice(0,90));
  L.say(!!note&&new RegExp(kind==='mate'?'checkmate':'stalemate','i').test(note), tag+': A2 the note names the terminal KIND', note&&note.slice(0,70));
  L.say(!!note&&/Scan or upload a board where it is still someone/.test(note), tag+': A3 the note names the REMEDY for its route (a scan: scan another board), so the refusal is not a dead end', note&&note.slice(-70));
  L.say((await ordinaryNote(b))===null, tag+': A4 the ordinary "Continuing from your reviewed position" note is ABSENT here (found by TEXT, not by a hook)');

  const btn=await confirmBtn(b);
  L.say(!!btn&&btn.dis===true, tag+': A5 the confirm button is DISABLED', btn&&JSON.stringify(btn));
  L.say(!!btn&&/already over/i.test(btn.txt), tag+': A6 the confirm button SAYS the position is over', btn&&btn.txt);

  const e0=await elo(b);
  const tapped=await b.page.evaluate(()=>{const e=document.querySelector('[data-gate-confirm="1"]');if(e){e.click();return true;}return false;});
  L.say(tapped, tag+': A7-FOUND the confirm button was located (by its TEXT, the hook only as fallback) and tapped - a tap on nothing cannot show that tapping starts nothing');
  await b.settle(1400);
  L.say(await vis(b,'[data-ct="setup-sheet"]'), tag+': A7 tapping it starts NOTHING - still on the setup sheet');
  L.say((await b.rect('[data-ct="result-card"]'))===null, tag+': A8 no result card, so no game was started');
  const e1=await elo(b);
  L.say(e0===e1, tag+': A9 the stored adaptive strength ct_elo is UNCHANGED', 'before='+e0+' after='+e1);

  // A10..A13: THE NOTE AND THE BUTTON READ ONE EXPRESSION, AT EVERY OPPONENT VALUE. Driven because antagonist
  // B found them reading two, and the disagreeing state is ONE TAP from here.
  const atComputer=await noteAndButton(b);
  L.say(atComputer.note===true&&atComputer.btn&&atComputer.btn.dis===true, tag+': A10 vs Computer - warning shown AND button disabled, i.e. they agree', JSON.stringify(atComputer));
  await b.tapText(/^Pass & Play$/,{wait:600});
  const atHuman=await noteAndButton(b);
  L.say(atHuman.note===true&&atHuman.btn&&atHuman.btn.dis===true, tag+': A11 Pass & Play - warning shown AND button disabled, i.e. they agree', JSON.stringify(atHuman));
  await b.tapText(/^Online$/,{wait:600});
  const atOnline=await noteAndButton(b);
  L.say(atOnline.note===false&&atOnline.btn&&atOnline.btn.dis===false, tag+': A12 Online - the refusal is OFF, so the warning must be GONE too: no warning above an enabled button', JSON.stringify(atOnline));
  L.say(!!atOnline.btn&&/Continue/.test(atOnline.btn.txt), tag+': A13 and that enabled button is the ONLINE one, not a Play-this-position', atOnline.btn&&atOnline.btn.txt);
}

// ---- C: the POSITIVE CONTROL. The ordinary route must still work. ----
async function nonTerminal(b,tag){
  await R.goPly(b,2);
  const root=await b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' '));
  L.say(!/won by checkmate|Stalemate\. The game is drawn/.test(root), tag+': PRECONDITION this ply is NOT terminal');
  await b.tapCt('rev-more',500);
  const row=await pfhRow(b);
  // C8 [#549 item (12)]: the polarity control for A14. A row disabled everywhere would pass A14 and break the route.
  L.say(!!row&&row.dis===false&&row.op==='1', tag+': C8 the "Play from here" row is ENABLED at a playable ply', JSON.stringify(row));
  const offered=(await b.texts()).some(x=>/^Play from here$/.test(x));
  if(offered) await b.tapText(/^Play from here$/,{wait:900});
  L.say(offered, tag+': PRECONDITION the ⋯ sheet offers "Play from here"');
  // C9 [#548 item (122), kept at #549]: the sheet's one exit still reads "Back to review" when Review opened it. Until #549
  // A14 asserted this at a terminal ply; the row refuses there now, so it is asserted where the route still opens the sheet.
  const exitB=await b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&/^\u2039 (Home|Back to review)$/.test((x.innerText||'').trim());}).map(x=>(x.innerText||'').trim()));
  L.say(exitB.includes('\u2039 Back to review')&&!exitB.includes('\u2039 Home'), tag+': C9 the setup sheet\'s exit reads "Back to review", not "Home"', JSON.stringify(exitB));
  const on=await ordinaryNote(b);
  L.say(!!on&&/Continuing from your reviewed position/.test(on), tag+': C1 the ordinary "Continuing from your reviewed position" note IS shown (found by TEXT)', on&&on.slice(0,60));
  L.say((await termNote(b))===null, tag+': C2 the TERMINAL note is absent at a playable ply');
  const btn=await confirmBtn(b);
  L.say(!!btn&&btn.dis===false, tag+': C3 the confirm button is ENABLED', btn&&JSON.stringify(btn));
  L.say(!!btn&&/Play this position/.test(btn.txt), tag+': C4 and still reads "▶ Play this position"', btn&&btn.txt);
  await b.tapText(/^▶ Play this position$/,{wait:1600});
  L.say(!(await vis(b,'[data-ct="setup-sheet"]')), tag+': C5 the setup sheet closed, so the route COMMITTED');
  const bd=await b.board();  /* b.board() is ASYNC. The first version of this line omitted the await, so the assertion read a Promise - bd.w was undefined, NaN>200 was false, and it reported FAIL with a detail of "null" on a bundle where the board was fine. A false red from my own gate, caught by my own control block. */
  L.say(!!bd&&bd.w>200, tag+': C6 a playable board is on screen', bd&&Math.round(bd.w*100)/100);
  L.say((await b.rect('[data-ct="result-card"]'))===null, tag+': C7 and the new game is NOT over');
}

// ---- D [#549 item (12), the folded jobs/play-from-here-captures-the-engines-hypothetical-board-during-a-best-line-preview-2026-10-02]:
// during a best-line preview the board shows the ENGINE'S line, and "Play from here" must still start from the ply
// he is on. D1 proves the preview was on screen at the moment of the tap (otherwise D2 measures nothing).
async function preview(b,tag){
  // "Show best" (rev-best), not "play this move out" (rev-playout): the play-out's FIRST step is the played move,
  // which IS this ply's position, so a tap landing on that frame would measure nothing. The best line's first step
  // differs from the played move by construction. Measured: 1.f3 (ply 1) carries it on this game.
  let btn=null,at=0;
  for(const p of [1,3,2]){ await R.goPly(b,p); await b.settle(300); if(await vis(b,'[data-ct="rev-best"]')){btn='rev-best';at=p;break;} }
  const pre=await cells(b);
  L.say(!!btn, tag+': PRECONDITION a "best move" play-out button is on screen at a playable ply', JSON.stringify({btn,ply:at}));
  if(!btn)return;
  await b.tapCt(btn,120);
  await b.tapCt('rev-more',350);
  const atTap=await cells(b);
  L.say(!!pre&&!!atTap&&pre.filter(Boolean).length>=30&&!same(pre,atTap), tag+': D1 PRECONDITION at the moment of the tap the board shows the PREVIEW, not the ply', JSON.stringify({prePieces:pre&&pre.filter(Boolean).length,atTapPieces:atTap&&atTap.filter(Boolean).length,differ:!!pre&&!!atTap&&!same(pre,atTap)}));
  const offered=(await b.texts()).some(x=>/^Play from here$/.test(x));
  if(offered) await b.tapText(/^Play from here$/,{wait:900});
  if(await vis(b,'[data-ct="setup-sheet"]')) await b.tapText(/^▶ Play this position$/,{wait:1600});
  const post=await cells(b);
  L.say(offered&&same(pre,post), tag+': D2 the game "Play from here" started is the ply he was ON, not the engine\'s preview board', JSON.stringify({offered,post:!!post,equalsPreview:same(atTap,post)}));
}

L.run(async()=>{
  for(const geo of ['kunal730','se']){
    // MATE at both geometries: the job's notChecked asks for a second geometry and SIT could not get one.
    const b=await L.launch({geo,store:{ct_pool:'3'},name:'pfh-mate-'+geo});
    await b.open(); L.note('bundle '+(await b.stamp())+'  '+b.geo.w+'x'+b.geo.h);
    try{ await terminal(b,MATE,'mate','mate@'+geo); }
    catch(e){ L.say(false,'mate@'+geo+': harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,180)); }
    L.say(b.errs.length===0,'mate@'+geo+': 0 console errors',b.errs.slice(0,2));
    await b.close();
  }
  // THE POSITIVE CONTROL GETS ITS OWN BROWSER, and the first version of this gate is why. It tried to reach a
  // non-terminal ply by walking BACK out of the setup sheet, and the harness threw on both geometries:
  // `locator('button[title="Last move"]')` timed out because after "Play from here" the app is on the setup
  // sheet in play mode and the review's transport row is not on screen at all. The terminal block deliberately
  // ends without committing, so there is nothing to undo - but there is also no route back that this driver
  // owns. A fresh launch is one more cold analysis and it is worth it, because block C is the assertion that
  // stops this build from having broken "Play from here" everywhere. All launches here serve the SAME bundle,
  // so the "two launches with different bundles in one process serve the first twice" trap does not apply.
  {
    const c=await L.launch({geo:'kunal730',store:{ct_pool:'3'},name:'pfh-control'});
    await c.open(); L.note('bundle '+(await c.stamp())+'  '+c.geo.w+'x'+c.geo.h+'  (positive control)');
    try{ await R.importPgn(c,MATE,180000); await R.startReview(c); await nonTerminal(c,'control@kunal730'); }
    catch(e){ L.say(false,'control@kunal730: harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,180)); }
    L.say(c.errs.length===0,'control@kunal730: 0 console errors',c.errs.slice(0,2));
    await c.close();
  }

  {
    const d=await L.launch({geo:'kunal730',store:{ct_pool:'3'},name:'pfh-preview'});
    await d.open(); L.note('bundle '+(await d.stamp())+'  '+d.geo.w+'x'+d.geo.h+'  (best-line preview capture)');
    try{ await R.importPgn(d,MATE,180000); await R.startReview(d); await preview(d,'preview@kunal730'); }
    catch(e){ L.say(false,'preview@kunal730: harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,180)); }
    L.say(d.errs.length===0,'preview@kunal730: 0 console errors',d.errs.slice(0,2));
    await d.close();
  }

  // STALEMATE at Kunal's geometry only: its value is the DIFFERENT terminal kind, not a third width, and
  // each arm costs a full cold analysis. Said here rather than left for a reader to infer [R18].
  const b=await L.launch({geo:'kunal730',store:{ct_pool:'3'},name:'pfh-stale'});
  await b.open(); L.note('bundle '+(await b.stamp())+'  '+b.geo.w+'x'+b.geo.h);
  try{ await terminal(b,STALE,'stalemate','stale@kunal730'); }
  catch(e){ L.say(false,'stale@kunal730: harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,180)); }
  L.say(b.errs.length===0,'stale@kunal730: 0 console errors',b.errs.slice(0,2));
  await b.close();
},'55-play-from-here-terminal');
// SELECTOR-OPENED: setup-terminal-note control=aaec56b round 2: the note found by its words; c1 renamed the hook and painted the warning at a playable ply, C2 and A12 red
// SELECTOR-OPENED: setup-start reading=fallback round 2: words first since #549, the hook a fallback
// SELECTOR-OPENED: setup-fen-note reading=comment round 2: named only in a comment, the hook is gone
