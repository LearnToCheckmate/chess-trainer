// #466: ANTAGONIST A's SIX-TAP REPRO, driven rather than reasoned about.
// A found a fourth route to this build's harm that the class sweep missed and that #466's FIRST guard sailed
// past: an endgame lesson that ends in mate, played out in PRACTICE, then closed, then the Play tab - the
// adaptive-Elo effect wakes with a mated `game` whose history came in with the board, while playHist is EMPTY,
// and moves ct_elo SILENTLY (the setup sheet is up, so eloMsg is never seen).
// NEITHER A NOR I HAD DRIVEN IT. A reasoned it from source and proposed the fix; I verified the invariant across
// all five setPlayHist sites and shipped it. This probe is the measurement that turns that into evidence, and it
// is needed because the suite CANNOT see the new term: 16-cpu-result-line drives a RESIGN, so `playEnd` is set
// and the `!playEnd` short-circuit means the term is never evaluated there. A established that in the cross-read
// and it withdrew A's own claim that nc1 proved the guard live (nc1's A9 is tautological - on the setup sheet
// `game` is the initial position, so the effect hits `else return` either way, which is antagonist B's B-4).
// RUN IT TWICE: CT_APP=/tmp/main465-app.js must MOVE ct_elo, and the #466 bundle must NOT.
'use strict';
const L=require('../lib'), D=require('../drive/lesson');
L.run(async()=>{
  const b=await L.launch({geo:'kunal730',name:'lessonelo466'});
  await b.open();
  L.note('bundle '+(await b.stamp())+'  '+b.geo.w+'x'+b.geo.h);
  const elo=()=>b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return 'ERR';}});
  try{
    // 1-2. Discover -> the Endgames group -> Back-Rank Mate (fen 6k1/5ppp/8/8/8/8/8/R6K w, line ["Ra8#"]).
    await D.openLesson(b,'Endgames',/^Back-Rank Mate$/);  /* openRow takes a NUMBER or a RegExp - it does new RegExp(src[0],src[1]) on anything else, so a plain string gives 'Invalid flags supplied to RegExp constructor'. My first run threw on both bundles for that reason and the harness correctly labelled it NOT an app result. */
    L.say(await D.inLesson(b), 'PRECONDITION the lesson opened');
    // 3. demo to the end, then into practice.
    await D.startDemoPaused(b); await D.toEnd(b);
    await D.tapBtn(b,/^✋ Now I'll try it$/,600);
    const e0=await elo();
    L.say(e0!==null&&e0!=='ERR', 'PRECONDITION ct_elo is readable before the mate', e0);
    // 4. play the single mating move Ra8#. piece-tap then target-tap, never the source twice [lib header].
    await b.move('a1','a8',1400);
    const note=await D.noteText(b);
    L.note('practice note after Ra8#: '+JSON.stringify((note||'').slice(0,120)));
    const mated=await b.page.evaluate(()=>/Complete!|mate|Mate/.test(document.getElementById('root').innerText));
    L.say(mated, 'PRECONDITION the mate was actually delivered on the board', (note||'').slice(0,60));
    const e1=await elo();
    L.say(e1===e0, 'the mate inside the LESSON itself does not move ct_elo', 'before='+e0+' after='+e1);
    // 5. close the lesson, 6. the Play tab - A's route, no fullReset anywhere in it.
    await D.tapBtn(b,/^✕$/,500).catch(async()=>{ await b.tapText(/^✕/,{wait:500}); });
    await b.settle(400);
    await b.tab('Play'); await b.settle(1200);
    const e2=await elo();
    L.note('ct_elo after the Play tab: '+e2);
    L.say(e2===e0, 'THE FINDING: after close + the Play tab, ct_elo is STILL unmoved - a mate the player never played in a GAME does not touch the computer strength', 'cold='+e0+' afterMate='+e1+' afterPlayTab='+e2);
  }catch(e){ L.say(false,'harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,220)); }
  L.say(b.errs.length===0,'0 console errors',b.errs.slice(0,2));
  await b.close();
},'probe466-lessonelo');
