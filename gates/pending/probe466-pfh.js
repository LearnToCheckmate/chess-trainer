// #466 reproduction probe for jobs/play-from-here-at-a-terminal-ply-starts-a-lost-game-2026-09-27.
// NOT a suite gate. Measures the job's three harms on the bundle under test, because the job's own
// evidence is from #424/#427 and #434/#435 later rewrote the status-line behaviour harm 3 is about [R35].
'use strict';
const L=require('../lib'), R=require('../drive/review');
const MATE='[Event "T"]\n[Site "Chess.com"]\n[Date "2026.09.02"]\n[White "Jsmiller1112"]\n[Black "DukeKarlCountIsouard99"]\n[Result "0-1"]\n[WhiteElo "1523"]\n[BlackElo "1487"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
const STALE='[Event "T"]\n[Site "Chess.com"]\n[Date "2026.09.03"]\n[White "Jsmiller1112"]\n[Black "DukeKarlCountIsouard99"]\n[Result "1/2-1/2"]\n[WhiteElo "1523"]\n[BlackElo "1487"]\n\n1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. Qxc7 Rah6 5. h4 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2';

async function arm(b,pgn,kind){
  await R.importPgn(b,pgn,180000);
  await R.startReview(b);
  const N=await R.goPly(b,999);
  const root=await b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' '));
  L.note(kind+' PRE1 strip plies='+N+'  review says: '+((root.match(/won by checkmate|Checkmate|Stalemate\. The game is drawn|Draw ½|Draw/)||['NONE'])[0]));
  await b.tapCt('rev-more',500);
  const sheet=await b.texts();
  L.note(kind+' PRE2 sheet offers "Play from here": '+sheet.some(x=>/^Play from here$/.test(x)));
  await b.tapText(/^Play from here$/,{wait:900});
  const banner=await b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' ').slice(0,320));
  L.note(kind+' HARM1 setup-sheet banner: '+banner.slice(0,220));
  const warned=/no legal move|already over|game is over|finished|last position with a legal move|nothing to play/i.test(banner);
  L.say(warned, kind+' HARM1 the setup sheet WARNS the position is terminal');
  await b.tapText(/^▶ Play this position$/,{wait:1500});
  const rc=await b.rect('[data-ct="result-card"]');
  L.note(kind+' PRE3 result card: '+(rc?JSON.stringify({x:Math.round(rc.x*100)/100,y:Math.round(rc.y*100)/100,w:Math.round(rc.w*100)/100,h:Math.round(rc.h*100)/100,text:rc.text}):'NULL'));
  const po0=await b.text('[data-ct="play-opening"]');
  L.note(kind+' HARM2 play-opening at t0: '+JSON.stringify(po0));
  L.say(!/Strength now/.test(po0||''), kind+' HARM2 a 0-ply game does NOT move the adaptive strength');
  const elo=await b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return 'ERR';}});
  L.note(kind+' HARM2b stored ct_elo after the instant result: '+elo);
  await b.settle(4300);
  const rc2=await b.rect('[data-ct="result-card"]');
  L.note(kind+' PRE4 result card at +4.3s: '+(rc2?'STILL UP':'faded'));
  const po=await b.text('[data-ct="play-opening"]');
  L.note(kind+' HARM3 play-opening at +4.3s: '+JSON.stringify(po));
  L.say(/Checkmate|Stalemate|wins|Draw|lose|Resigned|Time!/i.test(po||''), kind+' HARM3 after the card fades the screen still NAMES THE OUTCOME');
}

L.run(async()=>{
  for(const [kind,pgn] of [['mate',MATE],['stalemate',STALE]]){
    const b=await L.launch({geo:'kunal730',store:{ct_pool:'3'},name:'probe466-'+kind});
    await b.open();
    L.note('=== '+kind+' :: bundle stamp '+(await b.stamp())+'  '+b.geo.w+'x'+b.geo.h);
    try{ await arm(b,pgn,kind); }
    catch(e){ L.say(false,kind+': harness threw (NOT an app result)',String(e).slice(0,200)); }
    L.say(b.errs.length===0,kind+': 0 console errors',b.errs.slice(0,2));
    await b.close();
  }
},'probe466-pfh');
