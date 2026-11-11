// regress/17-drill-grade-arithmetic.js   TC-R146 (US-R108), the ARITHMETIC half of the mistakes-drill grade.
//
// LANDED AT #549 item (97), jobs/drill-accepts-one-move-only, rebuilt from the copy held at 67ca361 (#459), which no
// build ever shipped (gates/held-trees.tsv rows #456, #457, #459). The pieces that survived are its shape: a pure node
// gate over EVERY legal move of several positions, reading the shipped declarations out of chess.jsx (now through
// gates/engine-extract.js, which prints the source md5), with the #456 arithmetic recomputed INSIDE the gate as its own
// control (A4) so a revert of the repair reddens the gate rather than passing it. What changed against 67ca361, and why:
//   - THE LADDER MOVED UNDER IT. classify() takes the WIN-PERCENTAGE drop since #440; the held copy fed it centipawns.
//     Every band assertion here reads classify(winDrop(...)), the review's own expression.
//   - NO CHARACTER BUDGET. #459 was held because DRILL_MSG_MAXW sized a growing box and the board paid 70px. The drill
//     verdict now floats over the goal card at a fixed size and scrolls (Kunal, questions/q-drill-third-line and
//     questions/drill-verdict-float-or-slot-2026-10-10), so every A6 "selected rung" assertion became an assertion over
//     the ONE sentence each branch prints; the pixel side is gate 52's C7/C7b/C9.
//   - A TRUST GUARD (A8) the held tree did not have: a depth-2 ranking that cannot grade the stored depth-16 move
//     Excellent or better is not trusted to accept anything in that position, and the move the player made in the game
//     is never re-graded. Measured on the benchmark's own card (A8a): without it, Kunal's game Mistake cxb5 was told
//     "Best move. Nothing in the position beats it".
// DETERMINISM (R36): positions come from deterministic self-play through rankMoves; no FEN can rot. A few seconds.
// CONTROL-RECORD lines live at the foot of this header once the run lands them (deferred: see the job record).
// CONTROL-RECORD: 5f16aab 2026-11-07 total=30 red=1 scope=full how=CT_SRC=2f4e07a's chess.jsx (grades by default, no DRILL_GRADE_DEFAULT) - A0c red
// CONTROL-RECORD: 5f16aab 2026-11-07 total=30 red=1 scope=full how=CT_SRC=chess.jsx with DRILL_GRADE_DEFAULT=true - A0c red
'use strict';
const L=require('../lib');
const E=require('../engine-extract.js');

const sanOf=(g,mv)=>E.cleanSAN(E.toSAN(g,mv,E.applyMove(g.board,mv)));
// #550 item (20): the drill grader labels through classifyMove - Best is the ranking's own top move only (isTop), the rest by the
// item (20) bands - so the recompute uses the same shipped function with the same isTop, not the old band table.
const lbl=(g,best,v)=>E.classifyMove(E.winDrop(best,v,g.turn),v===best).label;
const ACC=['Brilliant','Best','Excellent'];

L.run(async()=>{
  L.note('17-drill-grade-arithmetic: chess.jsx md5 '+E.SOURCE_MD5+' ('+E.SRC_PATH+') | DRILL_RANK_DEPTH='+E.DRILL_RANK_DEPTH
    +' DRILL_ACCEPT='+JSON.stringify(E.DRILL_ACCEPT));
  L.say(E.DRILL_RANK_DEPTH===3&&JSON.stringify(E.DRILL_ACCEPT)===JSON.stringify(ACC),'A0 the drill grades at rankMoves depth 3 (minimax 2 per move) and accepts at Excellent or better - the held tree\'s numbers, unchanged [Kunal\'s design; job (106) owns the depth]',{depth:E.DRILL_RANK_DEPTH,accept:E.DRILL_ACCEPT});

  // A0c THE GRADER SHIPS SWITCHED OFF (#549, after job (106): the depth-3 grade disagrees with the review's label on 84.8% of
  // 132 cards). Everything below measures the grader as the switch ct_drill_grade='1' runs it; this line pins the default.
  L.say(E.DRILL_GRADE_DEFAULT===false&&E.DRILL_GRADE===false,'A0c the drill grader ships OFF: DRILL_GRADE_DEFAULT is false and, with no ct_drill_grade in storage, DRILL_GRADE is false',{DRILL_GRADE_DEFAULT:E.DRILL_GRADE_DEFAULT,DRILL_GRADE:E.DRILL_GRADE});

  // ── fixtures, derived not hardcoded ─────────────────────────────────────────────────────────────────
  let g=E.initGame();const POS=[];
  for(let ply=0;ply<26&&POS.length<8;ply++){
    const sc=E.rankMoves(g,3);if(!sc.length)break;
    if(ply>=6&&ply%2===0)POS.push(E.fromFEN(E.toFEN(g)));
    g=E.makeMove(g,sc[0].m);
    if(E.getStatus(g)!=='playing')break;
  }
  L.say(POS.length>=6,'A0b derived '+POS.length+' middlegame fixtures by deterministic self-play (the denominator for A1-A4, its own line)');

  // THE STORED MOVE IS AN EXCELLENT-BUT-NOT-BEST MOVE OF THE GRADER'S OWN RANKING. It must sit below the top so
  // #456's two-instrument arithmetic and this one disagree by construction (A4), and it must be Excellent or better
  // so the A8 trust guard lets the position be graded at all - a fixture the guard refuses would test nothing.
  const DEEP=[];
  for(const p of POS){
    const sc=E.rankMoves(p,3);if(sc.length<2)continue;
    const top=sc[0].v;
    const pick=sc.find(x=>x.v!==top&&lbl(p,top,x.v)==='Excellent');
    if(!pick)continue;
    DEEP.push({p,stored:sanOf(p,pick.m),trueBest:sanOf(p,sc[0].m)});
  }
  L.say(DEEP.length>=3,'A1a built '+DEEP.length+' fixtures whose stored move grades Excellent, below the depth-2 optimum');
  L.say(DEEP.length>0&&DEEP.every(d=>d.stored!==d.trueBest),'A1b in every fixture the stored move differs from the depth-2 optimum, so the cross-instrument gap #456 had is exercised by construction',DEEP.map(d=>d.stored+'/'+d.trueBest).join(' '));

  // ── A2/A3: the repair, over every legal non-mating move ─────────────────────────────────────────────
  let tot=0,neg=0,bestNew=0,atMax=0,nulls=0,untrusted=0,offLadder=0;
  const LADDER=new Set(['Brilliant','Best','Excellent','Good','Inaccuracy','Mistake','Blunder']);
  for(const {p,stored} of DEEP){
    const R=E.drillRanking(p);
    if(!R){L.say(false,'A2x drillRanking returned null on a legal middlegame position');continue;}
    for(const mv of E.getLegal(p)){
      if(E.getStatus(E.makeMove(p,mv))==='checkmate')continue;
      tot++;
      const gr=E.gradeDrillMove(p,mv,stored);
      if(!gr){nulls++;continue;}
      if(!gr.trusted)untrusted++;
      if(gr.loss<0)neg++;
      if(!LADDER.has(gr.label))offLadder++;
      if(gr.label==='Best')bestNew++;
      const v=R.bySan.get(sanOf(p,mv));
      if(lbl(p,R.best,v)==='Best'&&gr.label!=='Brilliant')atMax++;
    }
  }
  L.say(tot>0,'A2a graded '+tot+' non-mating legal moves across '+DEEP.length+' positions ('+nulls+' ungraded)');
  L.say(tot>0&&neg===0,'A2b no graded move has a negative loss - impossible by construction once both sides of the subtraction come from one ranking (#456 produced 23 in 482)',{neg});
  L.say(tot>0&&untrusted===0&&offLadder===0,'A2c every grade on these fixtures is TRUSTED (the stored move is Excellent in the same ranking) and carries a label from the review\'s own ladder',{untrusted,offLadder});
  L.say(tot>0&&bestNew===atMax,'A3 every Best comes from the ranking optimum, recomputed here as classify(winDrop(best,played)): '+bestNew+' labelled Best against '+atMax+' in the Best band of the ranking');

  // A2d THE WARMED RANKING IS THE SAME INSTRUMENT. The app ranks a card one move per task while the player looks at it
  // (drillRankWarm); a warm that computed anything other than rankMoves' own term would make the grade depend on how
  // fast the player moved. Compared to the centipawn on every fixture, the cache cleared between the two.
  let warmSame=0,warmN=0;const warmDiff=[];
  for(const {p} of DEEP){
    E._drillRank.clear();const S=E.drillRanking(p);E._drillRank.clear();
    const W=await new Promise(res=>{E.drillRankWarm(p,res);});
    warmN++;
    const same=!!S&&!!W&&S.best===W.best&&S.second===W.second&&S.bySan.size===W.bySan.size&&[...S.bySan].every(([k,v])=>W.bySan.get(k)===v);
    if(same)warmSame++;else warmDiff.push(E.toFEN(p));
  }
  L.say(warmN>0&&warmSame===warmN,'A2d the background-warmed ranking equals the synchronous one to the centipawn on '+warmSame+' of '+warmN+' fixtures',warmDiff);

  // ── A4: THE CONTROL. #456's arithmetic, recomputed here, must manufacture a Best this one does not. ──────
  let bestOld=0,negOld=0,bestNew4=0;
  for(const {p,stored} of DEEP){
    const bestMv=E.findMoveBySAN(p,stored);if(!bestMv)continue;
    const maxing=(p.turn==='w');
    const vBest=E.minimax(E.makeFast(p,bestMv),2,-Infinity,Infinity,!maxing);   // #456: the STORED move as the baseline
    for(const mv of E.getLegal(p)){
      if(E.getStatus(E.makeMove(p,mv))==='checkmate')continue;
      const vPlay=E.minimax(E.makeFast(p,mv),2,-Infinity,Infinity,!maxing);
      const raw=maxing?(vBest-vPlay):(vPlay-vBest);
      if(raw<0)negOld++;
      if(lbl(p,vBest,vPlay)==='Best')bestOld++;          // winDrop clamps a negative drop to 0, exactly #456's clamp
      const gr=E.gradeDrillMove(p,mv,stored);if(gr&&gr.label==='Best')bestNew4++;
    }
  }
  L.say(negOld>0,'A4a CONTROL: #456\'s two-instrument subtraction produces '+negOld+' negative raw losses over these same moves, so this gate can see the defect it pins');
  L.say(bestOld>bestNew4,'A4b CONTROL: #456 grades '+bestOld+' moves Best where the repair grades '+bestNew4+', so a revert of the repair reddens A3/A4b rather than passing them');

  // ── A5: the mate baseline names the mate and never a self-contradicting band ──────────────────────────
  const MATE=E.fromFEN('6k1/5ppp/8/8/8/8/5PPP/R6K w - - 0 1');
  let mFlag=0,mLeak=0,mNamesMate=0,mTot=0;const mShapes=new Set();
  for(const mv of E.getLegal(MATE)){
    if(E.getStatus(E.makeMove(MATE,mv))==='checkmate')continue;
    const gr=E.gradeDrillMove(MATE,mv,'Ra8#');if(!gr)continue;
    mTot++;if(gr.mateBaseline)mFlag++;
    const s=sanOf(MATE,mv);const msg=E.drillGradeMsg(s,gr,false);mShapes.add(msg.split(s).join('<SAN>'));
    if(/mate/i.test(msg))mNamesMate++;
    if(/Best|Excellent|Good|Inaccuracy|Mistake|Blunder/.test(msg))mLeak++;
  }
  L.say(mTot>0,'A5a the mate-baseline card graded '+mTot+' non-mating moves (the denominator, its own line)');
  L.say(mTot>0&&mFlag===mTot,'A5b all '+mTot+' carry mateBaseline, so the mate sentinel is read off the ranking correctly');
  L.say(mTot>0&&mNamesMate===mTot,'A5c every mate-card sentence names the mate ('+mNamesMate+' of '+mTot+')');
  L.say(mTot>0&&mLeak===0,'A5d no mate-card sentence names a grade band - #456 printed "Blunder: leaves you completely winning" on all 19 of these');
  // A5e the mate rule caps a slower win: when the stored move mates and the played move is not the ranking's top, the
  // drill must not say "Nothing in the position beats it". The fixture is K+Q v K with Qh8# on the board and slower
  // forced mates beside it; which moves score a slower mate is read off the ranking itself, not assumed.
  const M2=E.fromFEN('k7/8/1K6/8/8/8/8/7Q w - - 0 1');
  const r2=E.drillRanking(M2);let capped=0,capN=0,bestLeak=0;
  for(const mv of E.getLegal(M2)){
    const ng=E.makeMove(M2,mv);if(E.getStatus(ng)==='checkmate')continue;
    const gr=E.gradeDrillMove(M2,mv,'Qh8#');if(!gr||!gr.mateBaseline)continue;
    const v=r2.bySan.get(sanOf(M2,mv));
    if(Math.abs(v)>=90000&&v!==r2.best){capN++;if(gr.label==='Excellent')capped++;if(gr.label==='Best')bestLeak++;}
  }
  // NOT ASSERTED, AND WHY: at DRILL_RANK_DEPTH 3 a slower mate is beyond the search (measured: 0 such moves here), so
  // an assertion over them could not fail. The cap exists for job (106)'s deeper search; this note prints the count so
  // the day it becomes non-zero the line is promoted to an L.say with capN>0 as its own denominator.
  L.note('A5e NOT ASSERTED (input count '+capN+'): non-mating moves on k7/8/1K6/8/8/8/8/7Q w that score a forced mate below the top; '+capped+' of them capped at Excellent, '+bestLeak+' labelled Best');

  // ── A6: the sentences ────────────────────────────────────────────────────────────────────────────────
  const SANS=['Bxh3','Qxc3','Bxg6','Bxh7+','e4','Nf3','Qxd5','Rxh7+','Bb5','O-O','exd5','Ng1','R1xd5','cxb8=Q+'];
  const BANDS=['level','slightly better','clearly better','winning','completely winning','slightly worse','clearly worse','losing','completely losing'];
  let gWorstDistinct=99,gQ=0,gC=0,gN=0;
  for(const san of SANS){const set=new Set();
    for(const band of BANDS)for(const takenBack of [false,true]){
      const m=E.drillGradeMsg(san,{label:'Good',bandAfter:band,takenBack,mateBaseline:false},false);
      set.add(m);gN++;
      if(/Can you find it\?/.test(m)&&/There is more here/.test(m))gQ++;
      if(m.includes(takenBack?'straight back':band))gC++;
    }
    gWorstDistinct=Math.min(gWorstDistinct,set.size);
  }
  L.say(gN>0&&gWorstDistinct>=10,'A6g the Good band yields at least '+gWorstDistinct+' distinct sentences over the '+(BANDS.length*2)+' band x takenBack inputs at EVERY one of '+SANS.length+' SANs (#457: exactly 1)');
  L.say(gN>0&&gQ===gN&&gC===gN,'A6h every one of '+gN+' Good-band sentences carries Kunal\'s words "There is more here ... Can you find it?" ('+gQ+') and the clause that tells two moves apart ('+gC+')');
  let headOk=0,headN=0;const P0=E.fromFEN('6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w - - 0 1');const pm=E.findMoveBySAN(P0,'Rhxd5');
  for(const san of SANS){headN++;
    const b=E.drillAcceptMsg(san,{label:'Best'},P0,pm,'Rdxd5');
    const x=E.drillAcceptMsg(san,{label:'Excellent'},P0,pm,'Rdxd5');
    const br=E.drillAcceptMsg(san,{label:'Brilliant'},P0,pm,'Rdxd5');
    if(/Nothing in the position beats it/.test(b)&&/Rdxd5 is a shade sharper/.test(x)&&/Brilliant!/.test(br))headOk++;}
  L.say(headN>0&&headOk===headN,'A6e the headline sentences reach the screen for every SAN - "Best move. Nothing in the position beats it", the Excellent reveal of the stored move, "Brilliant!" ('+headOk+' of '+headN+'; #457 could print the first for none)');
  L.say(/: it wins material\./.test(E.drillAcceptMsg('Rhxd5',{label:'Best'},P0,pm,'Rdxd5')),'A6f the accept sentence says WHY with the shipped whyShape generator, not a second one',E.drillAcceptMsg('Rhxd5',{label:'Best'},P0,pm,'Rdxd5'));
  const a1=E.drillGradeMsg('g3',{label:'Blunder',bandAfter:'losing',takenBack:false,mateBaseline:false},false),a2=E.drillGradeMsg('g3',{label:'Blunder',bandAfter:'losing',takenBack:false,mateBaseline:false},true);
  L.say(!/👁/.test(a1)&&/Tap 👁 to see the move\.$/.test(a2),'A6k the second and later wrong try keeps the pointer to Show the flat string gave then, and the first does not',{first:a1,again:a2});

  // A6j THE ACCEPT BAND HAS A CEILING: an accept marks the card solved and reveals the answer.
  let accN=0,accYes=0,worstPos=0;
  for(const {p:dp,stored:dstored} of DEEP){
    let n=0,y=0;
    for(const mv of E.getLegal(dp)){
      if(E.getStatus(E.makeMove(dp,mv))==='checkmate')continue;
      const gr=E.gradeDrillMove(dp,mv,dstored);if(!gr)continue;
      n++;if(gr.accept)y++;
    }
    accN+=n;accYes+=y;if(n>0)worstPos=Math.max(worstPos,y/n);
  }
  const accPct=accN?(100*accYes/accN):0;
  L.say(accN>0&&accPct<50&&worstPos<0.75,'A6j the accept band is bounded: '+accYes+' of '+accN+' graded moves accepted ('+accPct.toFixed(1)+'%), worst single position '+(100*worstPos).toFixed(1)+'% - no threshold is changed by this build');

  // ── A7: gate 52's fixture: stale card, distinct shapes, the equal alternative ─────────────────────────
  const STALE=P0;
  L.say(E.gradeDrillMove(STALE,E.getLegal(STALE)[0],'Zz9')===null,'A7a a stored SAN that is not legal here grades null rather than guessing a baseline');
  const sent=new Map();let revealed=0;
  for(const mv of E.getLegal(STALE)){
    if(E.getStatus(E.makeMove(STALE,mv))==='checkmate')continue;
    const s=sanOf(STALE,mv);const gr=E.gradeDrillMove(STALE,mv,'Rdxd5');if(!gr)continue;
    const m=gr.accept?E.drillAcceptMsg(s,gr,STALE,mv,'Rdxd5'):E.drillGradeMsg(s,gr,false);
    if(!gr.accept&&/Rdxd5|Rxd5/.test(m))revealed++;
    sent.set(s,m);
  }
  L.say(sent.size>0,'A7b gate 52\'s own fixture grades '+sent.size+' moves (stored SAN Rdxd5)');
  const mask=(s)=>String(s).replace(/^\S+\s+/,'').replace(/^\S+\s+/,'<SAN> ');
  const maskedVerdicts=new Set([...sent.values()].map(mask));
  L.say(maskedVerdicts.size>=3,'A7c with the SAN MASKED, the fixture\'s moves do not all receive one interchangeable sentence (R10 item 5): '+maskedVerdicts.size+' distinct shapes over '+sent.size+' moves');
  const eq=[...sent].find(([k])=>/^Rhxd5/.test(k));
  L.say(!!eq&&/Best|Excellent|Brilliant/.test(eq[1]),'A7d the EQUAL alternative is accepted, which is the defect Kunal reported: '+(eq?eq[0]+' -> '+eq[1]:'not found'));
  L.say(sent.size>0&&revealed===0,'A7e no rejected move\'s sentence names the stored move (Kunal: the Good band asks "can you find it?", and revealing ends the drill) - '+revealed+' of '+sent.size);

  // ── A8: THE TRUST GUARD ──────────────────────────────────────────────────────────────────────────────
  // The benchmark's own card (jobs/drill-accepts-one-move-only, benchmarkVerdict_2026_09_28, POSITION 1): stored Qb4+
  // (depth 16), and Kunal played cxb5, which the review graded a Mistake. The depth-2 ranking puts cxb5 on top.
  const BEN=E.fromFEN('rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 1');
  const cx=E.findMoveBySAN(BEN,'cxb5');const gb=cx?E.gradeDrillMove(BEN,cx,'Qb4+','cxb5'):null;
  L.say(!!gb&&gb.trusted===false&&ACC.indexOf(gb.solLabel)<0,'A8a the benchmark card is NOT trusted: the depth-2 ranking grades the stored Qb4+ "'+(gb&&gb.solLabel)+'", so it may not accept anything there',gb&&{label:gb.label,solLabel:gb.solLabel,trusted:gb.trusted});
  L.say(!!gb&&gb.accept===true,'A8b CONTROL for A8a: without the guard the drill WOULD accept Kunal\'s game Mistake cxb5 as "'+(gb&&gb.label)+'" - so the guard is load-bearing, not decoration');
  const ge=E.gradeDrillMove(P0,pm,'Rdxd5','Rhxd5');
  L.say(!!ge&&ge.gameMove===true&&ge.trusted===false&&ge.accept===true,'A8c the move the player made in the game is never re-graded by the shallow search, even when it would be accepted (gameSan guard)',ge&&{gameMove:ge.gameMove,trusted:ge.trusted,accept:ge.accept});
},'GATE17-drill-grade-arithmetic');
