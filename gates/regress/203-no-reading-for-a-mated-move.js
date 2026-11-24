'use strict';
// gates/regress/203-no-reading-for-a-mated-move.js - A MOVE THAT LOSES TO MATE IN ONE GETS NO FORK, PIN, THREAT OR ATTACK READING.
// US-R213 / TC-R306..R307. Job: jobs/fork-reading-fires-on-a-move-that-is-mated-2026-11-13 (batch 14 entry 43). Node-only: the shipped
// concreteRead through gates/engine-extract.js over every library puzzle position (PZGEN_RAW, read out of the source) plus the job's fixtures,
// EVERY legal move of each, checked against a fact computed HERE from the board (does the opponent have a mating reply?), never from concreteRead.
// WHY A SCAN: the job's defect was one position (Nc6 on 1r1q2k1/5ppp/8/4N3/8/8/5PPP/6K1 w, a fork of queen and rook that Rb1 mates), and
// gates 132/133 had pinned that very fixture. Pinning one position pins one branch; the fix is a guard at the top of concreteRead, so the claim
// is a property of ALL positions and moves.
// Branches of concreteRead read first: mate1 (the move mates), mate2, forkcheck, threat, take, save, matethreat, fork, pin, attack/short-of-defenders
// and the general nulls. A mated move may carry none of them: each says something positive about a move that loses. mate1 is not in play
// (a move that mates leaves the opponent no reply, so it is never "mated"; the scan skips it).
const L=require('../lib');const E=require('../engine-extract.js');const fs=require('fs');
console.log('203-no-reading-for-a-mated-move: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
const src=fs.readFileSync(E.SRC_PATH,'utf8');
const raw=JSON.parse(/const PZGEN_RAW=(\[.*?\]);\s*\n/s.exec(src)[1]);
const FIX=[['job fixture (Nc6 is mated by Rb1)','1r1q2k1/5ppp/8/4N3/8/8/5PPP/6K1 w - - 0 1'],
 ['job fixture, real fork (Nc7)','r2nr1k1/pp3ppp/8/3N4/8/8/PP3PPP/R4RK1 w - - 0 1'],
 ['mate threat','5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 1']];
const POS=FIX.map(x=>({n:x[0],f:x[1]}));
// the first 150 of the library by default (the whole 879 reads 0 bad as well, measured 6m33s); CT_G203_N=0 runs all
raw.slice(0,Number(process.env.CT_G203_N||150)||raw.length).forEach((p,i)=>POS.push({n:'lib'+i,f:p.f}));
// the independent fact: after the move, can the side to move (the opponent) mate in one?
const matedBy=(g2)=>{for(const r of E.getLegal(g2)){const g3=E.makeMove(g2,r);if(g3&&E.getStatus(g3)==='checkmate')return r;}return null;};
const stats={pos:0,moves:0,mated:0,reads:0,kinds:{}};
const bad=[];
L.run(async()=>{
 for(const P of POS){
  let p;try{p=E.fromFEN(P.f);}catch(e){continue;}stats.pos++;
  for(const mv of E.getLegal(p)){
   const g2=E.makeMove(p,mv);if(!g2)continue;stats.moves++;
   if(E.getStatus(g2)==='checkmate')continue;   // the move itself mates: mate1, correctly read
   const r=matedBy(g2);
   // concreteRead is dear (it searches for mate in two), so it runs on EVERY mated move and on every 5th unmated one (the blanket-null precondition)
   if(!r&&(stats.moves%5)!==0)continue;
   let cr;try{cr=E.concreteRead(p,mv);}catch(e){bad.push({pos:P.n,err:e.message});continue;}
   if(r){stats.mated++;if(cr)bad.push({pos:P.n,mv:E.toSAN(p,mv,E.applyMove(p.board,mv)),mate:E.toSAN(g2,r,E.applyMove(g2.board,r)),k:cr.k,hint:cr.hint,say:cr.say});}
   else if(cr){stats.reads++;stats.kinds[cr.k]=(stats.kinds[cr.k]||0)+1;}
  }
 }
 const j=(a)=>JSON.stringify(a.slice(0,3));
 L.say(stats.pos>=100&&stats.moves>3000,'TC-R306 PRECONDITION the scan has a denominator: '+stats.pos+' positions, '+stats.moves+' legal moves',stats);
 L.say(stats.mated>=20,'TC-R306 PRECONDITION the scan met moves that allow mate in one ('+stats.mated+'); without them the assertion below could not fail',stats);
 L.say(stats.reads>=100&&((stats.kinds.fork||0)+(stats.kinds.matethreat||0)+(stats.kinds.threat||0))>=3,'TC-R306 PRECONDITION the guard is not a blanket null: '+stats.reads+' unmated moves still carry a reading, of kinds '+JSON.stringify(stats.kinds),stats);
 L.say(bad.length===0,'TC-R306 no move that allows a mate in one carries a concreteRead reading of any kind ('+bad.length+' do)',j(bad));
 // the two pinned sentences: the mated move says nothing, the real fork still says its sentence
 const p1=E.fromFEN(FIX[0][1]),p2=E.fromFEN(FIX[1][1]);
 const nc6=E.findMoveBySAN(p1,'Nc6'),nc7=E.findMoveBySAN(p2,'Nc7');
 const c6=nc6?E.concreteRead(p1,nc6):'no move',c7=nc7?E.concreteRead(p2,nc7):null;
 L.say(!!nc6&&c6===null,'TC-R307 the job position: Nc6 (Rb1 mates) reads nothing ('+JSON.stringify(c6)+')',c6);
 L.say(!!c7&&c7.k==='fork'&&c7.hint==='Your knight can attack the rook on a8 and the rook on e8 at once.','TC-R307 the real fork, Nc7, still reads its sentence ('+(c7&&c7.hint)+')',c7);
},'203-no-reading-for-a-mated-move');
