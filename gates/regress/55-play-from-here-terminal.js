// gates/regress/55-play-from-here-terminal.js
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
'use strict';
const L=require('../lib'), R=require('../drive/review');
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
// THE STATE ANTAGONIST A NAMED AS UNCOVERED: `opponent` is a user-tappable pill eight rows above the confirm
// button, and the refusal is deliberately OFF for 'online'. The note and the button must agree at EVERY value,
// which is the defect B found - they used to read two different expressions, so switching to Online left the
// amber "there is no move to play from it" above an ENABLED "Continue -> ".
const noteAndButton=async(b)=>{
  const note=await vis(b,'[data-ct="setup-terminal-note"]');
  const btn=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-start"]');return e?{txt:(e.innerText||'').trim(),dis:!!e.disabled}:null;});
  return {note,btn};};
async function openRoute(b){ await b.tapCt('rev-more',500); const sheet=await b.texts();
  const offers=sheet.some(x=>/^Play from here$/.test(x));
  if(offers) await b.tapText(/^Play from here$/,{wait:900});
  return offers; }

// ---- A/B: the TERMINAL ply. The route must refuse, and say why. ----
async function terminal(b,pgn,kind,tag){
  await R.importPgn(b,pgn,180000);
  await R.startReview(b);
  const N=await R.goPly(b,999);
  const root=await b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' '));
  const saysTerminal=kind==='mate'?/won by checkmate|Checkmate/.test(root):/Stalemate\. The game is drawn|Draw ½|Stalemate/.test(root);
  L.say(saysTerminal, tag+': PRECONDITION the review itself says this ply is terminal', 'plies='+N);
  L.say(await openRoute(b), tag+': PRECONDITION the ⋯ sheet offers "Play from here"');
  L.say(await vis(b,'[data-ct="setup-sheet"]'), tag+': PRECONDITION the setup sheet opened');

  const note=await b.text('[data-ct="setup-terminal-note"]');
  L.say(!!note, tag+': A1 the setup sheet carries the TERMINAL note', note&&note.slice(0,90));
  L.say(!!note&&new RegExp(kind==='mate'?'checkmate':'stalemate','i').test(note), tag+': A2 the note names the terminal KIND', note&&note.slice(0,70));
  L.say(!!note&&/[Ss]tep back a move/.test(note), tag+': A3 the note names the REMEDY, so the refusal is not a dead end');
  L.say((await ordinaryNote(b))===null, tag+': A4 the ordinary "Continuing from your reviewed position" note is ABSENT here (found by TEXT, not by a hook)');

  const btn=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-start"]');return e?{txt:(e.innerText||'').trim(),dis:!!e.disabled}:null;});
  L.say(!!btn&&btn.dis===true, tag+': A5 the confirm button is DISABLED', btn&&JSON.stringify(btn));
  L.say(!!btn&&/already over/i.test(btn.txt), tag+': A6 the confirm button SAYS the position is over', btn&&btn.txt);

  const e0=await elo(b);
  await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-start"]');if(e)e.click();});
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
  L.say(await openRoute(b), tag+': PRECONDITION the ⋯ sheet offers "Play from here"');
  const on=await ordinaryNote(b);
  L.say(!!on&&/Continuing from your reviewed position/.test(on), tag+': C1 the ordinary "Continuing from your reviewed position" note IS shown (found by TEXT)', on&&on.slice(0,60));
  L.say(!(await vis(b,'[data-ct="setup-terminal-note"]')), tag+': C2 the TERMINAL note is absent at a playable ply');
  const btn=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-start"]');return e?{txt:(e.innerText||'').trim(),dis:!!e.disabled}:null;});
  L.say(!!btn&&btn.dis===false, tag+': C3 the confirm button is ENABLED', btn&&JSON.stringify(btn));
  L.say(!!btn&&/Play this position/.test(btn.txt), tag+': C4 and still reads "▶ Play this position"', btn&&btn.txt);
  await b.tapText(/^▶ Play this position$/,{wait:1600});
  L.say(!(await vis(b,'[data-ct="setup-sheet"]')), tag+': C5 the setup sheet closed, so the route COMMITTED');
  const bd=await b.board();  /* b.board() is ASYNC. The first version of this line omitted the await, so the assertion read a Promise - bd.w was undefined, NaN>200 was false, and it reported FAIL with a detail of "null" on a bundle where the board was fine. A false red from my own gate, caught by my own control block. */
  L.say(!!bd&&bd.w>200, tag+': C6 a playable board is on screen', bd&&Math.round(bd.w*100)/100);
  L.say((await b.rect('[data-ct="result-card"]'))===null, tag+': C7 and the new game is NOT over');
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

  // STALEMATE at Kunal's geometry only: its value is the DIFFERENT terminal kind, not a third width, and
  // each arm costs a full cold analysis. Said here rather than left for a reader to infer [R18].
  const b=await L.launch({geo:'kunal730',store:{ct_pool:'3'},name:'pfh-stale'});
  await b.open(); L.note('bundle '+(await b.stamp())+'  '+b.geo.w+'x'+b.geo.h);
  try{ await terminal(b,STALE,'stalemate','stale@kunal730'); }
  catch(e){ L.say(false,'stale@kunal730: harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,180)); }
  L.say(b.errs.length===0,'stale@kunal730: 0 console errors',b.errs.slice(0,2));
  await b.close();
},'55-play-from-here-terminal');
