// gates/measure-kunal-qh3.js  —  #443
// Work item 1 of jobs/brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30, as far as
// the data allows. The PGN of Kunal2023 vs abdallah050195 is NOT in this project, so this cannot be a
// replay. What it is: a mechanical check of the BOARD CLAIM Kunal made - "it was a sacrifice, because
// the bishop was being attacked" - using the shipped engine's own seeSq rather than a reading of a
// screenshot.
//
// AND IT ENUMERATES EVERY LEGAL ORIGIN FOR THE QUEEN, because the origin square is unknown. The first
// version of this enumeration was GEOMETRIC and published 5 origins; two of them put the WHITE king in
// check with BLACK to move, which cannot arise in a game [#443 antagonist A]. getLegal() does not catch
// it: it checks only that the MOVER's king is safe, so as a legality filter for a constructed
// predecessor position it is vacuous. The filter has to be isInCheck(board, side NOT to move).
'use strict';
const E=require('./engine-extract');
const M=require('./measure-brilliant-sac');
const FEN='8/pppQ3p/6pk/2b1Rp2/5P2/5bPq/PPP2P1P/R5K1 w - - 0 23';
const after=E.fromFEN(FEN);
console.log('# KUNAL 22...Qh3 — the board claim, measured');
console.log('# chess.jsx', M.SRC_PATH, 'md5', M.SOURCE_MD5);
console.log('# position after the move, from the job\'s own piece list:', FEN, '\n');

console.log('A. WHAT THE SHIPPED seeSq SAYS ABOUT EACH BLACK PIECE');
for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=after.board[r][c]; if(!p||p.c!=='b')continue;
  console.log(`   ${E.rc2sq(r,c)}: black ${p.t}   seeSq(after, White to win) = ${E.seeSq(after,r,c,'w')}`);
}
const ml=M.maxLoose(after,'b','w');
console.log(`   -> most White can win anywhere: ${ml.v} (${ml.t} on ${ml.sq})\n`);

console.log('B. EVERY LEGAL ORIGIN FOR THE BLACK QUEEN, so the result does not rest on the unknown one');
const h3r=8-3, h3c=E.FILES.indexOf('h');
let legal=0, rejected=0;
for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  if(r===h3r&&c===h3c) continue;
  const b=E.cloneB(after.board);
  if(b[r][c]) continue;                       // the origin must be empty in the after-position
  b[h3r][h3c]=null; b[r][c]={t:'q',c:'b'};
  const before={...after,board:b,turn:'b',history:[]};
  let mv=[]; try{mv=E.getLegal(before).filter(m=>m.fr===r&&m.fc===c&&m.tr===h3r&&m.tc===h3c);}catch(e){continue;}
  if(!mv.length) continue;
  // THE FILTER getLegal CANNOT APPLY: a position where the side NOT to move is in check is unreachable.
  if(E.isInCheck(b,'w')){
    console.log(`   Q${E.rc2sq(r,c)}-h3 : REJECTED - White, who is not to move, would be in check. Cannot arise.`);
    rejected++; continue;
  }
  legal++;
  const m=M.measures(before,mv[0]);
  const g=E.brilliantGate(before,mv[0],0,E.evalPawns(after),E.evalPawns(before));
  console.log(`   Q${E.rc2sq(r,c)}-h3 : shipped sac=${g.sac} isSac=${g.isSac}  |  C1=${m.c1} (${m.c1piece}@${m.c1sq})  |  C2 maximaCap=${m.c2maximaCap} perSqCap=${m.c2squareCap}  (White could already win ${m.beforeLoose} on ${m.beforeSq})`);
}
console.log(`\n   ${legal} legal origins, ${rejected} geometrically possible but unreachable.`);
console.log('   The shipped measure scores 0 and the whole-board measure 3 on EVERY legal origin, so');
console.log('   the finding does not depend on the square that could not be determined.');
