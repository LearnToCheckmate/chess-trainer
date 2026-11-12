'use strict';
// gates/regress/129-content-positions-hold.js - THE TACTICS AND STRATEGY CARDS SHOW CHESS THAT IS TRUE. US-R137 / TC-R205a..c.
//
// WHY [#550, run-answers build__1794388896663-a37 and -hold-landing; docs/hint-audit-2026-11-12 HEX-T-10 and HEX-T-11;
// jobs/tactics-strategy-wrong-chess-and-messages-2026-11-12]: the audit found the Tactics "Pawn fork" card losing its pawn to Bxd5
// (Stockfish -1.7 after the stored move), three Strategy cards with mate in one for the side to move while the text talks about a slow
// plan (open files Rxc8, the 7th rank Ra8, trading when ahead Qd8), and "The opposition" calling a dead draw a win. Kunal: "the wrong chess
// first". This build also found two the audit did not: "Keep your queen home early" had no black queen, "King safety first" had White a
// rook down.
// WHAT IT READS: the bundle under test (CT_APP, else ../app.js), not chess.jsx - the card rows are plain string literals in the bundle
// (motif:"...",level:"...",fen:"...",from:"..",to:".." and title:"...",fen:"..."), and the app's own engine,
// stockfish-18-lite-single.js, run in node exactly as gates/measure-brilliant-one-rule.js runs it.
// WHAT IT ASSERTS: (a) every Tactics card's stored move does not leave the mover worse (score >= -0.5 at depth 16, the move searched
// alone with searchmoves) and is within 0.5 of the engine's best; (b) no Strategy position has mate in one for the side to move (a card
// about a slow plan must not hide a mate); (c) "The opposition" is a win for White, as its look line says.
// KNOW ITS LIMIT: it checks that the chess is true, not that the words describe it well (that is the hint audit's other findings).
// CONTROL-RECORD: ce025ff 2026-11-12 total=47 red=5 scope=trial:3ab724514641 how=#550 origin/main's own #549 bundle, the cards as the audit found them: Pawn fork -190 (TC-R205a), mate in one on Put rooks on open files, Rooks love the 7th rank and Trade pieces when you are ahead (TC-R205b), The opposition 0 cp (TC-R205c); on t124 47/0
const L=require('../lib');
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const SF=path.join(__dirname,'..','..','stockfish-18-lite-single.js');
const src=fs.readFileSync(APP,'utf8');
console.log('     bundle: '+APP+'  md5 '+crypto.createHash('md5').update(src).digest('hex').slice(0,12));
const TAC=[...src.matchAll(/\{motif:"([^"]+)",level:"[^"]+",fen:"([^"]+)",from:"([a-h][1-8])",to:"([a-h][1-8])"(?:,promo:"([qrbn])")?/g)].map(m=>({name:m[1],fen:m[2],uci:m[3]+m[4]+(m[5]||'')}));
const STR=[...src.matchAll(/\{title:"([^"]+)",fen:"([^"]+)",text:"/g)].map(m=>({name:m[1],fen:m[2]}));
function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});let buf='',w=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const l=buf.slice(0,k).trim();buf=buf.slice(k+1);if(w)w(l);}});
  const send=s=>p.stdin.write(s+'\n');const until=pr=>new Promise(r=>{w=l=>{if(pr(l)){w=null;r(l);}};});
  const go=(fen,extra)=>new Promise(res=>{let sc=null,mate=null;w=l=>{if(l.startsWith('info ')&&/ score /.test(l)){const m=/ score (cp|mate) (-?\d+)/.exec(l);if(m){if(m[1]==='mate'){mate=+m[2];sc=mate>0?100000-mate:-100000-mate;}else{mate=null;sc=+m[2];}}}else if(l.startsWith('bestmove')){w=null;res({sc,mate,bm:l.split(' ')[1]});}};send('ucinewgame');send('position fen '+fen);send('go depth 16'+(extra||''));});
  return {async init(){send('uci');await until(l=>l==='uciok');send('isready');await until(l=>l==='readyok');},go,quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}};
}
L.run(async()=>{
  L.say(TAC.length===13,'TC-R205 PRECONDITION the bundle carries the 13 Tactics cards ('+TAC.length+' read)',TAC.map(t=>t.name));
  L.say(STR.length===18,'TC-R205 PRECONDITION the bundle carries the 18 Strategy positions ('+STR.length+' read)',STR.map(t=>t.name));
  const E=engine();await E.init();
  for(const t of TAC){
    const best=await E.go(t.fen);const mine=await E.go(t.fen,' searchmoves '+t.uci);
    L.say(mine.sc!=null&&mine.sc>=-50,'TC-R205a Tactics "'+t.name+'": the stored move '+t.uci+' does not leave the mover worse ('+mine.sc+' cp, side to move)',{mine,best});
    L.say(mine.sc!=null&&best.sc!=null&&(t.uci===best.bm||mine.sc>=best.sc-50) /* two searches of the same move differ by tens of cp, so the engine naming it best is a pass */,'TC-R205a Tactics "'+t.name+'": the stored move is the best or within 0.5 of it ('+mine.sc+' against '+best.sc+', engine best '+best.bm+')',{mine,best});
  }
  for(const s of STR){
    const r=await E.go(s.fen);
    L.say(r.sc!=null&&r.mate!==1,'TC-R205b Strategy "'+s.name+'": the side to move has no mate in one ('+(r.mate===1?'MATE IN ONE with '+r.bm:(r.mate!=null?'mate in '+r.mate:r.sc+' cp'))+')',r);
    if(s.name==='The opposition'){const wpov=s.fen.split(' ')[1]==='w'?r.sc:-r.sc;L.say(wpov>=300,'TC-R205c "The opposition": the position is a win for White, as the card says ('+wpov+' cp for White)',r);}
  }
  E.quit();
},'129-content-positions-hold');
