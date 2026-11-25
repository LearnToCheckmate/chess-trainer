// gates/measure-brilliant-clause-e.js - #553 seat B2, jobs/the-brilliant-rule-does-not-grade-famous-brilliant-moves-brilliant-2026-11-19.
// REPORT-ONLY: asserts nothing and changes nothing. usage: node gates/measure-brilliant-clause-e.js (about a minute; prints chess.jsx md5).
// FINDING it was written for: Marshall 23...Qg3, Nezhmetdinov 12.Qxf6 and Adams 18.Qg4 are each refused by rule 3's clause E ALONE (the
// queen could already be won where it stood, originPre 4 / 9 / 6, and the second-best move is within BRIL_A of it, gapWin 6.75 / 0.92 /
// 1.29 against 8.21). With E off, every other clause passes for all three.
// What each candidate change to clause E would do, measured with the SHIPPED gate (engine-extract) over
// (a) Kunal's 39 recorded games (gates/fixtures/kunal/kunal-40-evals.json: the app's own review-cache, no engine run) and
// (b) the 28 classics games (engine run only at the plies where clause E can matter: the moved piece could already be won for 3+
//     where it stood, the landing square gives up 2+, the mover is not in check - every other ply's verdict cannot move).
// Options are computed OUTSIDE the gate; chess.jsx is not changed.
//   E-off  : clause E removed.
//   NET    : E keeps the landing arm only for what is offered BEYOND what was already attacked (sacLand - originPre >= 2).
//   ESCAPE : E fires only when the piece had nowhere safe to go (every other legal move of that piece lands where it can be won).
'use strict';
const W=require('path').join(__dirname,'..');const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require(path.join(W,'gates/engine-extract'));const C=require(path.join(W,'gates/make-brilliancy-classics.js'));
const SF=path.join(W,'stockfish-18-lite-single.js');const DEPTH=16;
const same=(a,b)=>a.fr===b.fr&&a.fc===b.fc&&a.tr===b.tr&&a.tc===b.tc&&(a.promo||'')===(b.promo||'');
function hasEscape(pos,pl){   // another legal move of the same piece to a square where it cannot be won (seeSq 0 there)
  for(const m of E.getLegal(pos)){if(m.fr!==pl.fr||m.fc!==pl.fc||same(m,pl))continue;const g2=E.makeMove(pos,m);if(!g2)continue;
    if(E.seeSq(g2,m.tr,m.tc,g2.turn)===0)return E.toSAN(pos,m,E.applyMove(pos.board,m));}
  return null;}
// one ply through the shipped sfGradePly, then the three options on the same numbers
function grade(pos,pl,evW,ev2W,bU,aU,i,R){
  const h=E.gradeHist(R,evW,bU,i);const a=E.sfGradePly(pos,pl,evW[i],evW[i+1],ev2W[i],bU[i],aU[i],null,undefined,false,h);
  const today=a.cls.label==='Brilliant';const g=a.gate||{};
  const bm=bU[i]&&E.uciToMove(pos,bU[i]);const was=!!bm&&same(bm,pl);
  const mover=pos.turn;const wd=was?0:E.winDrop(evW[i],evW[i+1],mover);
  const loss=was?0:Math.min(1500,Math.max(0,mover==='w'?(evW[i]-evW[i+1]):(evW[i+1]-evW[i])));
  const evA=Math.max(-99,Math.min(99,evW[i+1]/100)),evB=Math.max(-99,Math.min(99,evW[i]/100));
  const nb=E.nextBestW(evW[i],ev2W[i],was);
  const full=E.brilliantGate(pos,pl,loss,evA,evB,nb==null?null:Math.max(-99,Math.min(99,nb/100)),3,{lossWin:wd,playedIsBest:was,positions:R.positions,i});
  const efired=!E.isInCheck(pos.board,pos.turn)&&full.originPre>=3&&full.gapWin!=null&&full.gapWin<E.BRIL_A&&full.sacLand>=2;
  let off=today,net=today,esc=today,escSq=null;
  if(!today&&efired){
    const noE=E.brilliantGate(pos,pl,loss,evA,evB,null,3,{lossWin:wd,playedIsBest:was,positions:R.positions,i});   // gapWin Infinity: E cannot fire
    const okNoE=noE.ok&&noE.arm==='land';
    off=okNoE;net=okNoE&&(full.sacLand-full.originPre)>=2;escSq=hasEscape(pos,pl);esc=okNoE&&!!escSq;
  }
  return {label:a.cls.label,today,off,net,esc,efired,escSq,g:full,wd,loss};
}
function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});let buf='',waiter=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const line=buf.slice(0,k).trim();buf=buf.slice(k+1);if(waiter)waiter(line);}});
  const send=s=>p.stdin.write(s+'\n');const until=(pred)=>new Promise(res=>{waiter=(l)=>{if(pred(l)){waiter=null;res(l);}};});
  return {async init(){send('uci');await until(l=>l==='uciok');send('setoption name MultiPV value 2');send('setoption name Hash value 16');send('isready');await until(l=>l==='readyok');},
    eval(fen){return new Promise(res=>{const sign=fen.split(' ')[1]==='w'?1:-1;let cpv=null,mate=null,cp2=null,mate2=null,alt=null;
      waiter=(l)=>{if(l.startsWith('info ')&&/ score /.test(l)){const mpv=+((/ multipv (\d+)/.exec(l)||[])[1]||1);const m=/ score (cp|mate) (-?\d+)/.exec(l);if(!m)return;const v=+m[2],first=(/ pv (\S+)/.exec(l)||[])[1];
        if(mpv===1){if(m[1]==='mate'){mate=E.mateW(v,sign);cpv=null;}else{cpv=sign*v;mate=null;}}else if(mpv===2){if(m[1]==='mate'){mate2=E.mateW(v,sign);cp2=null;}else{cp2=sign*v;mate2=null;}if(first)alt=first;}}
        else if(l.startsWith('bestmove')){waiter=null;const bm=l.split(/\s+/)[1];res({cp:cpv,mate,cp2,mate2,alt,bestmove:bm&&bm!=='(none)'?bm:null});}};
      send('ucinewgame');send('position fen '+fen);send('go depth '+DEPTH);});},quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}};}
function toW(pos,r){let cpW;if(!r)cpW=Math.round(E.evalPawns(pos)*100);else if(r.mate!=null)cpW=r.mate>0?(100000-r.mate*100):(-100000-r.mate*100);else cpW=(r.cp==null?Math.round(E.evalPawns(pos)*100):r.cp);
  try{if(E.getStatus(pos)==='checkmate')cpW=(pos.turn==='w')?-99950:99950;}catch(e){}
  let cp2W=null;if(r){if(r.mate2!=null)cp2W=r.mate2>0?(100000-r.mate2*100):(-100000-r.mate2*100);else if(r.cp2!=null)cp2W=r.cp2;}return {cpW,cp2W,bm:r?r.bestmove:null};}
const tally={};const add=(set,k,row)=>{tally[set]=tally[set]||{plies:0,today:0,off:0,net:0,esc:0,changed:[]};const t=tally[set];t.plies+=k?0:0;};
(async()=>{
  console.log('# chess.jsx md5',E.SOURCE_MD5,'| rule',E.BRIL_RULE,'| BRIL_A',E.BRIL_A);
  // (a) Kunal's 39 games, recorded evals
  const P=fs.readFileSync(path.join(W,'gates/fixtures/kunal/kunal-40.pgn'),'utf8').split(/(?=\[Event )/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
  const D=JSON.parse(fs.readFileSync(path.join(W,'gates/fixtures/kunal/kunal-40-evals.json'),'utf8'));
  const K={plies:0,today:0,off:0,net:0,esc:0,efired:0,rows:[]};
  for(const url of Object.keys(D.games)){const G=D.games[url];const sans=E.parsePGN(P[G.gi]);const R=E.loadSANs(sans);if(!R.ok){console.log('unparsed',url);continue;}
    const e=G.entry;const N=R.plies.length;if(e.evW.length<N+1){console.log('short evals',url,e.evW.length,N);continue;}
    const me=/\[White "Kunal2023"\]/.test(P[G.gi])?'w':'b';
    for(let i=0;i<N;i++){const r=grade(R.positions[i],R.plies[i].move,e.evW,e.ev2W,e.bU,e.aU,i,R);K.plies++;
      if(r.today)K.today++;if(r.off)K.off++;if(r.net)K.net++;if(r.esc)K.esc++;if(r.efired&&!r.today){K.efired++;console.log("  E-refused",url.split("/").pop(),i,R.plies[i].san,r.label,JSON.stringify({ok:r.g.ok,sac:r.g.sac,sacLand:r.g.sacLand,originPre:r.g.originPre,gapWin:r.g.gapWin,lossWin:r.g.lossWin,loss:r.g.loss,cap:r.g.cap,evAfter:r.g.evAfter,esc:hasEscape(R.positions[i],R.plies[i].move)}));}
      if(r.off!==r.today||r.net!==r.today||r.esc!==r.today){const no=Math.floor(i/2)+1+(i%2?'...':'.')+R.plies[i].san;
        K.rows.push({game:url.split('/').pop(),move:no,who:R.positions[i].turn===me?'Kunal':'opponent',label:r.label,off:r.off,net:r.net,esc:r.esc,escape:r.escSq,originPre:r.g.originPre,sacLand:r.g.sacLand,gapWin:r.g.gapWin,evAfter:r.g.evAfter,lossWin:Math.round(r.wd*100)/100});}}}
  console.log('\n## KUNAL 39 GAMES (recorded app evals) plies',K.plies,'| Brilliant today',K.today,'| E-off',K.off,'| NET',K.net,'| ESCAPE',K.esc,'| plies where E alone refused',K.efired);
  for(const r of K.rows)console.log('  '+JSON.stringify(r));
  // (b) the classics, engine only at E-candidate plies
  const {games}=C.load();const eng=engine();await eng.init();const Cl={plies:0,cand:0,today:0,off:0,net:0,esc:0,rows:[]};
  for(const g of games){const RR=C.replay(g);const R=RR.r;const N=R.plies.length;Cl.plies+=N;
    for(let i=0;i<N;i++){const pos=R.positions[i],pl=R.plies[i].move;if(E.isInCheck(pos.board,pos.turn))continue;
      const b=E.brilliantGate(pos,pl,0,0,0,null,3,{lossWin:0,playedIsBest:true});if(!(b.originPre>=3&&b.sacLand>=2))continue;Cl.cand++;
      const evW=[],ev2W=[],bU=[],aU=[];for(const j of [i-1,i,i+1]){if(j<0)continue;const p=R.positions[j];const st=E.getStatus(p);const r=(st==='checkmate'||st==='stalemate')?null:await eng.eval(E.toFEN(p));const w=toW(p,r);evW[j]=w.cpW;ev2W[j]=w.cp2W;bU[j]=w.bm;aU[j]=r?r.alt:null;}
      const r=grade(pos,pl,evW,ev2W,bU,aU,i,R);if(r.today)Cl.today++;if(r.off)Cl.off++;if(r.net)Cl.net++;if(r.esc)Cl.esc++;
      Cl.rows.push({game:g.id,move:RR.name(i),explained:!!(g.why||{})[RR.name(i)],label:r.label,today:r.today,off:r.off,net:r.net,esc:r.esc,escape:r.escSq,originPre:r.g.originPre,sacLand:r.g.sacLand,gapWin:r.g.gapWin,evBefore:r.g.evBefore,evAfter:r.g.evAfter,lossWin:Math.round(r.wd*100)/100});}}
  eng.quit();
  console.log('\n## CLASSICS 28 GAMES plies',Cl.plies,'| E-candidate plies searched',Cl.cand,'| of those Brilliant today',Cl.today,'| E-off',Cl.off,'| NET',Cl.net,'| ESCAPE',Cl.esc);
  for(const r of Cl.rows)console.log('  '+JSON.stringify(r));

})().catch(e=>{console.error(e);process.exit(1);});
