// gates/measure-brilliant-sac.js  —  #443
// THE MEASUREMENT jobs/brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30 asks for,
// and the measurement Kunal's Desk answer q-brilliant-widen ("measure", 2026-09-19) has been waiting
// eleven days for. It does NOT change the app. It runs the SHIPPED brilliantGate and two candidate
// sacrifice measures over the same positions and prints both columns.
//
// THE DEFECT, in one sentence: brilliantGate (chess.jsx:1002) computes the sacrifice from ONE SQUARE,
// the square the moved piece landed on, so a sacrifice made by ABANDONING a piece elsewhere scores 0
// and the gate exits on its first condition.
//
// THE THREE MEASURES, written down before any of them was run:
//   M0  SHIPPED. sac = max(0, value of the piece now on the landing square - value of what it
//       captured), counted only when seeSq(after, landing square, opponent) > 0.
//   C1  WHOLE-BOARD. sac = max(0, (the most the opponent can win by force on ANY square holding one
//       of the mover's pieces, after the move) - value of what the move captured). M0 is exactly C1
//       restricted to the landing square, so C1 can only ever score a move >= M0.
//   C2  THE JOB'S OWN SUGGESTION, quoted: "the material the opponent can win by force that they could
//       NOT have won before it". C1 minus the same quantity measured in the position BEFORE the move
//       with the turn handed to the opponent.
// C2 is measured because the job proposed it, not because this lane expects it to work; CLAUDE.md's
// rule is that a flag's proposed fix is a hypothesis to break, not a prescription.
'use strict';
const E=require('./engine-extract');
const {makeMove,seeSq,SEEVAL,brilliantGate,loadSANs,parsePGN,rankMoves,classify,evalPawns,toSAN,opp}=E;

// THE MATERIAL THE MOVER LEAVES WINNABLE, over the whole board, in M0's own currency.
// NOTE WHICH QUANTITY THIS IS, because the first draft of C1 got it wrong and the Opera Game caught it.
// `seeSq` returns the NET gain of the exchange sequence; M0 does not use that number. M0 uses it only as
// a YES/NO ("can the opponent win this square at all?") and then counts the FULL VALUE of the piece
// standing there. Scoring C1 off the net gain instead made 10.Nxb5 read 1 where the shipped gate reads 2
// - a candidate that scored the project's reference brilliancy LOWER than the measure it generalises,
// which is not a generalisation at all. Same currency, or the two columns cannot be compared.
// Returns {v, sq, t} so a caller can say WHICH piece: the difference between a number and evidence.
function maxLoose(game,me,side){
  let best=0,bsq=null,bt=null;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=game.board[r]&&game.board[r][c];
    if(!p||p.c!==me||p.t==='k')continue;          // the king is not material; SEEVAL gives it 99
    let net=0; try{net=seeSq(game,r,c,side);}catch(e){net=0;}
    if(net<=0)continue;                            // same yes/no test M0 applies to the landing square
    const v=SEEVAL[p.t]||0;
    if(v>best){best=v;bsq=E.rc2sq(r,c);bt=p.t;}
  }
  return {v:best,sq:bsq,t:bt};
}

// All three measures for one (position, move). `pos.turn` is the mover.
function measures(pos,pl){
  const me=pos.turn, them=opp(me);
  const out={m0:0,c1:0,c2:0,c2maxima:0,c2maximaCap:0,c2square:0,c2squareCap:0,c1sq:null,c1piece:null,capVal:0,landSee:0,beforeLoose:0,beforeSq:null};
  const g2=makeMove(pos,pl);
  if(!g2)return out;
  const before=pos.board[pl.tr]&&pos.board[pl.tr][pl.tc];
  const capVal=before?(SEEVAL[before.t]||0):0;
  out.capVal=capVal;

  // M0 — exactly what ships, re-derived here rather than copied, and cross-checked below against the
  // real brilliantGate's own `sac` so a divergence is caught instead of assumed away.
  const seeOpp=seeSq(g2,pl.tr,pl.tc,g2.turn);
  out.landSee=seeOpp;
  if(seeOpp>0){
    const cell=g2.board[pl.tr]&&g2.board[pl.tr][pl.tc];
    out.m0=Math.max(0,(cell?(SEEVAL[cell.t]||0):0)-capVal);
  }
  // C1 — the same question asked of the whole board.
  const after=maxLoose(g2,me,them);
  out.c1=Math.max(0,after.v-capVal); out.c1sq=after.sq; out.c1piece=after.t;
  // C2, ALL FOUR READINGS. `bef` asks the same question of the position BEFORE the move with the turn
  // handed to the opponent: what could they already have won?
  const bef=maxLoose({...pos,turn:them},me,them);
  out.beforeLoose=bef.v; out.beforeSq=bef.sq;
  out.c2maxima    = Math.max(0,after.v-bef.v);
  out.c2maximaCap = Math.max(0,after.v-bef.v-capVal);
  // Per-square, which is the job's literal wording: count a piece only where the opponent can win it
  // NOW and could not win it on that same square before. A piece that was not on the square before
  // trivially qualifies, so the trade guard still has to go on top - the moved piece is the commonest
  // such case, and that is exactly the recapture that must not read as a sacrifice.
  let sq=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=g2.board[r][c]; if(!p||p.c!==me||p.t==='k')continue;
    let now=0; try{now=seeSq(g2,r,c,them);}catch(e){}
    if(now<=0)continue;
    const q=pos.board[r][c]; let was=0;
    if(q&&q.c===me&&q.t===p.t){try{was=seeSq({...pos,turn:them},r,c,them);}catch(e){}}
    if(was>0)continue;
    const v=SEEVAL[p.t]||0; if(v>sq)sq=v;
  }
  out.c2square    = sq;
  out.c2squareCap = Math.max(0,sq-capVal);
  out.c2 = out.c2maximaCap;     // the column the gate uses: this file's own stated definition
  return out;
}

// The shipped gate's four eval conditions, with the sacrifice term swapped for a candidate. Everything
// except `isSac` and the `cap` that depends on it is byte-for-byte the shipped arithmetic.
function gateWith(sacVal,pos,loss,evalAfterWhite,evalBeforeWhite){
  const sgn=pos.turn==='w'?1:-1;
  const isSac=sacVal>=2;
  const evAfter=sgn*evalAfterWhite, evBefore=sgn*(evalBeforeWhite!=null?evalBeforeWhite:evalPawns(pos));
  const cap=(isSac&&evAfter>=1.2)?220:90;
  return {ok:(loss<cap && isSac && evAfter>=0.8 && evBefore>-1.0 && evBefore<4.5),
          isSac, evAfter:+evAfter.toFixed(2), evBefore:+evBefore.toFixed(2), cap,
          // EVERY failing condition, not the first. Reporting only the first turned a move that
          // fails THREE conditions into a "misses by ten centipawns" near-miss in #443's first
          // write-up, and would have pointed the follow-up job at the wrong constant.
          failed:[ !isSac&&'isSac', !(loss<cap)&&('loss<cap ('+loss+' vs '+cap+')'),
                   !(evAfter>=0.8)&&('evAfter>=0.8 ('+(+evAfter.toFixed(2))+')'),
                   !(evBefore>-1.0)&&('evBefore>-1.0 ('+(+evBefore.toFixed(2))+')'),
                   !(evBefore<4.5)&&('evBefore<4.5 ('+(+evBefore.toFixed(2))+')') ].filter(Boolean),
          get first(){return this.failed[0]||null;}};
}

// Walk a game and score every ply (or only `side`'s plies). Mirrors analyzeGameCounts (chess.jsx:1036):
// same rankMoves(pos,2), same loss arithmetic, same evalPawns for evA/evB.
function walk(pgn,side){
  const sans=parsePGN(pgn); const res=loadSANs(sans);
  const rows=[];
  for(let i=0;i<res.plies.length;i++){
    const mc=i%2===0?'w':'b';
    if(side&&mc!==side)continue;
    const pos=res.positions[i], pl=res.plies[i].move;
    const scored=rankMoves(pos,2); if(!scored||!scored.length)continue;
    const bestVal=scored[0].v;
    const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
    const actualVal=actual?actual.v:(pos.turn==='w'?-9999:9999);
    const loss=Math.round(Math.max(0,mc==='w'?bestVal-actualVal:actualVal-bestVal));
    const evA=evalPawns(res.positions[i+1]), evB=evalPawns(pos);
    const m=measures(pos,pl);
    const shipped=brilliantGate(pos,pl,loss,evA,evB);
    rows.push({i,ply:i+1,mv:Math.floor(i/2)+1,mc,san:res.plies[i].san||sans[i],loss,promo:!!pl.promo,epCap:!!pl.epCap,
      m0:m.m0,c1:m.c1,c2:m.c2,c2maxima:m.c2maxima,c2maximaCap:m.c2maximaCap,c2square:m.c2square,c2squareCap:m.c2squareCap,c1sq:m.c1sq,c1piece:m.c1piece,capVal:m.capVal,
      landSee:m.landSee,beforeLoose:m.beforeLoose,beforeSq:m.beforeSq,
      shipped, g0:gateWith(m.m0,pos,loss,evA,evB), g1:gateWith(m.c1,pos,loss,evA,evB),
      g2:gateWith(m.c2,pos,loss,evA,evB), label:classify(loss).label,
      // the four C2 readings carried as verdicts, so a caller never has to rebuild a position
      gC2:{c2maxima:gateWith(m.c2maxima,pos,loss,evA,evB).ok,
           c2maximaCap:gateWith(m.c2maximaCap,pos,loss,evA,evB).ok,
           c2square:gateWith(m.c2square,pos,loss,evA,evB).ok,
           c2squareCap:gateWith(m.c2squareCap,pos,loss,evA,evB).ok}});
  }
  return rows;
}
module.exports={measures,gateWith,walk,maxLoose,SOURCE_MD5:E.SOURCE_MD5,SRC_PATH:E.SRC_PATH};
