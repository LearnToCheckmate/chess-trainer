// regress/24-opponent-handshake.js  THE OPPONENT'S MOVE SEARCH MUST HANDSHAKE BEFORE IT POSTS.
//
// #396, Kunal's decision of 2026-09-15: "fix the cause, and add the gate that can see it", chosen over three
// alternatives including doing nothing, explicitly so this project stops building a third fallback for the
// same crash. Found by SIT run 1 against #392.
//
// THE DEFECT. chess.jsx posted `setoption` / `position` / `go` for the opponent's move DIRECTLY on sfRef,
// about 1 ms after a `stop` issued by the Play eval bar's own cleanup. The #356 comment in that same file
// says what that costs: "Sending setoption and position straight after stop is a UCI protocol violation
// while a search is still unwinding, and Stockfish answers it by trapping (RuntimeError: unreachable)."
// The #356 fix was applied to the ANALYSIS callers and never to this one - so #389 and #392 were both spent
// surviving a crash whose cause nobody had touched in five builds.
//
// WHY NO EXISTING GATE COULD SEE IT, which is the part worth more than this one bug. The Stockfish opponent
// branch needs cpuElo >= 1320. EVERY Play gate in this suite uses Pip (500) or the 800 default, and both
// take the homemade-engine branch, which never sends a single UCI message to that worker. Nearly a thousand
// assertions, and not one of them had ever exercised the path. That is asserted here explicitly, as the
// third check below, so the blind spot itself is now guarded: if someone "simplifies" this gate onto a
// weaker bot it goes red rather than quietly testing nothing.
//
// HOW IT MEASURES. Worker.postMessage is wrapped by an init script BEFORE the app builds its workers, so
// this is the real traffic rather than a reading of the source - which is the point, since the source looked
// fine to five builds and to everyone who read it. The assertion is on the ORDER of the real messages.
//
// NOT IN THIS FILE, deliberately. SIT run 1 made three findings and Kunal commissioned ONE. The other two -
// the Preview walk rewriting ct_lastlesson (a SYNC_KEYS key, so it backs over his cloud progress) and a
// card-6 tap removing Home's Preview and feedback buttons for 86 seconds - are real, measured, and still
// unfixed. Landing assertions for them would put RED on main for behaviour nobody has commissioned a fix
// for, and nothing red goes on main. They stay in the SIT log until their fixes ship.
'use strict';
const L=require('../lib');
const D=require('../drive/play');

// Drive to a live game against a named bot, recording every Worker.postMessage from before the app starts.
async function traffic(geo,botName){
  const b=await L.launch({geo,name:'handshake-'+botName.toLowerCase()});
  await b.page.addInitScript(()=>{
    window.__uci=[];
    const P=Worker.prototype.postMessage;
    Worker.prototype.postMessage=function(m){try{window.__uci.push(String(m).slice(0,80));}catch(e){}return P.apply(this,arguments);};
  });
  await b.open();
  await D.states['setup'](b);
  await b.settle(400);
  await b.page.evaluate((n)=>{const v=[...document.querySelectorAll('button')].find(e=>new RegExp(n).test(e.innerText||''));if(v)v.click();},botName);
  await b.settle(300);
  await b.page.evaluate(()=>{const s=[...document.querySelectorAll('button')].find(e=>/Start game/.test(e.innerText||''));if(s)s.click();});
  await b.settle(1200);
  const elo=await b.page.evaluate(()=>localStorage.getItem('ct_elo'));
  await b.page.evaluate(()=>{window.__uci.length=0;});   // from here on is the opponent's turn only
  const bd=await b.board();
  const tap=async(file,rank)=>{await b.page.mouse.click(Math.round(bd.x+(file+0.5)*bd.sq),Math.round(bd.y+(7-rank+0.5)*bd.sq));await b.settle(260);};
  await tap(4,1); await tap(4,3);            // 1.e4, so it is the computer's move
  await b.settle(7000);
  const uci=await b.page.evaluate(()=>window.__uci.slice());
  const errs=b.errs.slice();
  await b.close();
  return {elo:parseInt(elo||'0',10),uci,errs};
}

L.run(async()=>{
  // ── VIKTOR (2350): the only routinely reachable bot on the Stockfish opponent path ────────────────
  const V=await traffic('kunal730','Viktor');
  L.say(V.elo>=1320,'COMPANION: the opponent really is on the STOCKFISH path (ct_elo '+V.elo+' >= 1320). Without this the order check below passes on air, because the homemade branch sends no UCI at all',V.elo);

  const iElo=V.uci.findIndex(m=>/^setoption name UCI_Elo/.test(m));
  L.say(iElo>=0,'COMPANION: the opponent search actually posted UCI_Elo, so there is a real search to check the order of',{msgs:V.uci.length,first8:V.uci.slice(0,8)});

  // THE ASSERTION. Walking back from the opponent's own setoption block: the most recent control message
  // before it must be `isready`, not `stop`. Recorded traffic, not source.
  let prior=null;
  for(let i=iElo-1;i>=0;i--){ if(/^(isready|stop)$/.test(V.uci[i])){prior=V.uci[i];break;} }
  L.say(prior==='isready','THE FIX: the opponent search handshakes - the last control message before its setoption block is `isready`, not `stop`. Posting setoption straight after stop is the UCI violation the #356 comment says makes Stockfish trap, and it is what #389 and #392 were both built to survive',{prior:prior,window:V.uci.slice(Math.max(0,iElo-4),iElo+2)});

  const iReady=V.uci.lastIndexOf('isready',iElo);
  L.say(iReady>=0&&iReady<iElo,'and that isready is genuinely BEFORE the setoption block rather than somewhere after it',{isready:iReady,uciElo:iElo});

  L.say(V.errs.filter(e=>/RuntimeError: unreachable/.test(e)).length===0,'no engine trap fired during the strong-bot move',V.errs.slice(0,3));

  // ── PIP (500): the reason 27 suites could not see this. Guarding the blind spot itself. ───────────
  const P=await traffic('kunal730','Pip');
  L.say(P.elo<1320,'CONTROL: Pip is below the Stockfish floor (ct_elo '+P.elo+' < 1320)',P.elo);
  const pipElo=P.uci.filter(m=>/^setoption name UCI_Elo/.test(m)).length;
  L.say(pipElo===0,'CONTROL: and on Pip the opponent posts ZERO UCI_Elo messages - it takes the homemade-engine branch. THIS IS WHY NEARLY A THOUSAND ASSERTIONS NEVER SAW THE DEFECT: every Play gate in the suite uses Pip or the 800 default. If someone moves this gate onto a weaker bot to make it faster, this check goes red rather than letting it test nothing',{pipUciElo:pipElo,msgs:P.uci.length});
},'OPPONENT-HANDSHAKE');
