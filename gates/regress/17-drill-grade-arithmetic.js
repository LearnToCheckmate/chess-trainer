// regress/17-drill-grade-arithmetic.js   TC-R17 (US-R14), the ARITHMETIC half of the mistakes-drill grade.
//
// WHY A PURE GATE AND NOT MORE OF 52. Gate 52 drives the drill in a browser and asserts what the player
// SEES for five inputs at one position. That is the right shape for the screen and the wrong shape for this
// defect, which is a property of a subtraction over every legal move in many positions - 482 of them here,
// against 52's five. Running it in a browser would cost minutes to measure nothing extra. So this reads the
// shipped declarations straight out of chess.jsx by the gates/engine-extract.js method and runs in node,
// exactly as gates/unit-drill-why.js already does for the WORDING. The thing measured is the thing that
// ships: the md5 of chess.jsx is printed, and if a run's output does not say what it measured it is not
// evidence. Placed at 17 because 10-29 is the build lane's reserved range (claude/stories/README.md) and
// 17, 18 and 19 were the free numbers in it.
//
// THE DEFECT IT PINS, measured at #457 and NOT inherited from the note that raised it. #456 took the
// baseline from the STORED move - picked by the review's depth-16 engine when the card was captured - and
// scored it with a depth-2 local search, then subtracted a depth-2 score of the PLAYED move from it and
// clamped to [0,1500]. Two instruments, so the difference was not a loss: wherever the shallow search
// preferred another move to the stored one, the played move out-scored the baseline, the raw loss went
// negative, the clamp pulled it to 0, and classify(0) returns Best - printing "Best move. Nothing beats
// it." over an ordinary move. (CORRECTED #459: this header quoted "Nothing in the position beats it",
// which measures 52 characters against the 48 budget and so has never been printable - A6e/A6f now pin
// that. The string the box actually shows is the shorter one.) Measured over 14 middlegame positions and 482 non-mating legal
// moves: the deep and shallow searches disagree about the best move in 7 of 14 positions; 23 of 482 moves
// (4.8%) produced a negative raw loss; 61 moves graded Best under #456 against 34 under the repair, so 27
// were MANUFACTURED, and in the worst position 15 of 26 legal moves all read "Nothing beats it". A position
// cannot have fifteen best moves, and that is the tell.
//
// THE CONTROL IS INSIDE THIS GATE, WHICH IS THE POINT. A4 recomputes #456's own arithmetic over the SAME
// positions and REQUIRES it to manufacture at least one Best that the repair does not. A gate that only
// asserts the good behaviour cannot tell a fix from a no-op; this one fails if the repair is reverted AND
// fails if it is applied to an arithmetic that never had the defect. CLAUDE.md: "prove a gate against a
// deliberately broken build before trusting its green" - here the broken build is four lines of this file,
// so the proof ships with the assertion instead of living in a log nobody re-runs.
//
// DETERMINISM (R36). Every position is derived by self-play from initGame() through rankMoves, which carries
// no randomness (bestMove's `randomness` argument is the random one and is not used here), so the fixtures
// are reproducible without a single hardcoded FEN that could rot. Runtime is a few seconds.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SRC=process.env.CT_SRC||path.join(__dirname,'..','..','chess.jsx');
const src=fs.readFileSync(SRC,'utf8');
const MD5=crypto.createHash('md5').update(src).digest('hex').slice(0,12);
const lines=src.split('\n');const starts=[];
for(let i=0;i<lines.length;i++) if(/^(function|const|let|var)\s/.test(lines[i])) starts.push(i);
const blocks=new Map();
for(let s=0;s<starts.length;s++){const a=starts[s],b=(s+1<starts.length?starts[s+1]:lines.length);
  const m=/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
  if(m&&!blocks.has(m[1]))blocks.set(m[1],{text:lines.slice(a,b).join('\n'),order:a});}
const WANT=['FILES','rc2sq','inB','opp','initBoard','initGame','fromFEN','toFEN','cloneB','isAttacked','findKing',
 'isInCheck','pseudoMoves','applyMove','getLegal','getMovesFrom','disambig','toSAN','makeMove','getStatus','VAL',
 'mateW','PST','evaluate','makeFast','orderMoves','QDEPTH','quiesce','minimax','evalPawns','cleanSAN','rankMoves',
 'classify','SEEVAL','seeSq','brilliantGate','findMoveBySAN','whyBand','DRILL_RANK_DEPTH','DRILL_LOSS_CAP',
 '_drillRankMax','_drillRank','drillRanking','DRILL_ACCEPT_LOSS','gradeDrillMove','DRILL_MSG_MAXW',
 'drillMsgPick','drillGradeCands','drillGradeMsg','drillAcceptCands','drillAcceptMsg'];
const miss=WANT.filter(n=>!blocks.has(n));
if(miss.length){console.log('FAIL 17-A0 missing declaration(s) in chess.jsx: '+miss.join(', '));process.exit(1);}
const code=WANT.map(n=>blocks.get(n)).sort((x,y)=>x.order-y.order).map(b=>b.text).join('\n')
  +'\nmodule.exports={'+WANT.join(',')+',__setQ:v=>{QDEPTH=v;},__q:()=>QDEPTH};';
const mod={exports:{}};new Function('module','window',code)(mod,{});const E=mod.exports;

let fails=0;
const PASS=(id,msg)=>console.log('PASS 17-'+id+' '+msg);
const FAIL=(id,msg)=>{fails++;console.log('FAIL 17-'+id+' '+msg);};
const ok=(c,id,msg)=>c?PASS(id,msg):FAIL(id,msg);
console.log('17-drill-grade-arithmetic: chess.jsx md5 '+MD5+' | DRILL_RANK_DEPTH='+E.DRILL_RANK_DEPTH
  +' DRILL_MSG_MAXW='+E.DRILL_MSG_MAXW+' DRILL_ACCEPT_LOSS='+E.DRILL_ACCEPT_LOSS+' cap='+E.DRILL_LOSS_CAP);
const sanOf=(g,mv)=>E.cleanSAN(E.toSAN(g,mv,E.applyMove(g.board,mv)));

// ── fixtures, derived not hardcoded ───────────────────────────────────────────────────────────────────
E.__setQ(2);
let g=E.initGame();const POS=[];
for(let ply=0;ply<26&&POS.length<8;ply++){
  const sc=E.rankMoves(g,3);if(!sc.length)break;
  if(ply>=6&&ply%2===0)POS.push(E.fromFEN(E.toFEN(g)));
  g=E.makeMove(g,sc[0].m);
  if(E.getStatus(g)!=='playing')break;
}
ok(POS.length>=6,'A0','derived '+POS.length+' middlegame fixtures by deterministic self-play');

// THE STORED MOVE IS THE RUNNER-UP AT THE GRADER'S OWN DEPTH, AND THAT CHOICE IS THE WHOLE DESIGN OF THIS
// FIXTURE. The obvious thing is to stand in for the review's depth-16 pick with a deeper search here
// (rankMoves(p,5)) and that is what this gate did first. Two things were wrong with it. It is SLOW - a
// depth-5 ranking ran past two minutes a position on the build container, which fails R36's "fast enough to
// run on every build". And worse, it is LUCK: the defect only fires when the stored move is not the shallow
// optimum, which the deeper search delivers in about half of positions (measured 7 of 14), so on an
// unlucky draw of fixtures the control would silently have nothing to detect and A4 would go red on a
// perfectly good build. Taking the runner-up from the ranking the grader ALREADY computes makes the
// precondition true BY CONSTRUCTION and costs nothing: the stored move is, by definition, not the depth-2
// best, which is exactly the condition under which #456's two instruments diverge. It is also faithful to
// the real case - the whole point is that a depth-16 pick need not be the shallow pick.
// AND IT IS NOT MERELY THE RUNNER-UP: it is the best move that is at least one Best-band (15cp) BELOW the
// top. That extra condition is what makes A4b's control GUARANTEED rather than probable. With the stored
// move 15cp or more off the top, #456's arithmetic scores the stored move itself at raw loss 0 and calls it
// Best, while this one scores it at the real gap and does not - so the two necessarily disagree about at
// least one move per fixture. A runner-up only 3cp off the top would be Best under both and the control
// would have nothing to show, which is the "a negative control must CROSS THE THRESHOLD, not merely
// disturb the mechanism" rule applied to the fixture rather than to the assertion.
const DEEP=[];
for(const p of POS){
  const sc=E.rankMoves(p,3);
  if(sc.length<2)continue;
  const maxing=(p.turn==='w');const top=sc[0].v;
  const pick=sc.find(x=>(maxing?(top-x.v):(x.v-top))>=15);
  if(!pick)continue;
  DEEP.push({p,stored:sanOf(p,pick.m),trueBest:sanOf(p,sc[0].m),
             gap:Math.round(maxing?(top-pick.v):(pick.v-top))});
}
ok(DEEP.length>=4,'A1a','built '+DEEP.length+' fixtures whose stored move sits a full Best-band below the '
  +'depth-2 optimum (gaps '+DEEP.map(d=>d.gap).join(',')+'cp)');
ok(DEEP.every(d=>d.stored!==d.trueBest),'A1b','in every fixture the stored move differs from the depth-2 '
  +'optimum, so the cross-instrument gap #456 had is exercised by construction and not by luck');

// ── A2/A3: the repair, over every legal non-mating move ───────────────────────────────────────────────
let tot=0,neg=0,bestNew=0,atMax=0,nulls=0;
for(const {p,stored} of DEEP){
  const R=E.drillRanking(p);
  if(!R){FAIL('A2x','drillRanking returned null on a legal middlegame position');continue;}
  for(const mv of E.getLegal(p)){
    if(E.getStatus(E.makeMove(p,mv))==='checkmate')continue;
    tot++;
    const gr=E.gradeDrillMove(p,mv,stored);
    if(!gr){nulls++;continue;}
    if(gr.loss<0)neg++;
    if(gr.label==='Best')bestNew++;
    const v=R.bySan.get(sanOf(p,mv));
    const raw=(p.turn==='w')?(R.best-v):(v-R.best);
    if(raw<15)atMax++;                       // the Best band, measured off the ranking itself
  }
}
ok(tot>0,'A2a','graded '+tot+' non-mating legal moves across '+DEEP.length+' positions ('+nulls+' ungraded)');
ok(neg===0,'A2b','no graded move has a negative loss - impossible by construction once both sides of the '
  +'subtraction come from one rankMoves call (#456 produced 23 in 482)');
ok(bestNew===atMax,'A3','every Best comes from the ranking optimum, not from the clamp: '+bestNew
  +' labelled Best against '+atMax+' within 15cp of the ranking maximum');

// ── A4: THE CONTROL. #456's arithmetic, recomputed here, must manufacture a Best this one does not. ──
let bestOld=0,negOld=0;
for(const {p,stored} of DEEP){
  const bestMv=E.findMoveBySAN(p,stored);if(!bestMv)continue;
  const maxing=(p.turn==='w');const _q=E.__q();
  let vBest;try{E.__setQ(2);vBest=E.minimax(E.makeFast(p,bestMv),2,-Infinity,Infinity,!maxing);}finally{E.__setQ(_q);}
  for(const mv of E.getLegal(p)){
    if(E.getStatus(E.makeMove(p,mv))==='checkmate')continue;
    let vPlay;const _q2=E.__q();
    try{E.__setQ(2);vPlay=E.minimax(E.makeFast(p,mv),2,-Infinity,Infinity,!maxing);}finally{E.__setQ(_q2);}
    const raw=maxing?(vBest-vPlay):(vPlay-vBest);
    if(raw<0)negOld++;
    if(E.classify(Math.min(E.DRILL_LOSS_CAP,Math.max(0,raw))).label==='Best')bestOld++;
  }
}
ok(negOld>0,'A4a','CONTROL: #456\'s two-instrument subtraction still produces '+negOld
  +' negative raw losses over these same moves, so this gate can see the defect it is pinning');
ok(bestOld>bestNew,'A4b','CONTROL: #456 grades '+bestOld+' moves Best where the repair grades '+bestNew
  +', so a revert of the repair reddens A3 rather than passing it');

// ── A5: the mate baseline names the mate and never a self-contradicting band ──────────────────────────
const MATE=E.fromFEN('6k1/5ppp/8/8/8/8/5PPP/R6K w - - 0 1');
let mFlag=0,mLeak=0,mNamesMate=0,mTot=0;const mSent=new Set();
for(const mv of E.getLegal(MATE)){
  if(E.getStatus(E.makeMove(MATE,mv))==='checkmate')continue;
  const gr=E.gradeDrillMove(MATE,mv,'Ra8#');if(!gr)continue;
  mTot++;if(gr.mateBaseline)mFlag++;
  const msg=E.drillGradeMsg(sanOf(MATE,mv),gr);mSent.add(msg);
  if(/mate/i.test(msg))mNamesMate++;
  if(/leaves you|now (level|slightly|clearly|winning|completely)/.test(msg))mLeak++;
}
ok(mTot>0,'A5a','mate-baseline card graded '+mTot+' non-mating moves');
ok(mFlag===mTot,'A5b','all '+mTot+' carry mateBaseline, so the mate sentinel is read correctly '
  +'(minimax scores mate at +/-99999-(10-depth), not via mateW, which is a FUNCTION in this file)');
ok(mNamesMate===mTot,'A5c','every mate-card sentence names the mate');
ok(mLeak===0,'A5d','no mate-card sentence pairs a band with a position consequence - #456 printed '
  +'"Blunder: leaves you completely winning" on all 19 of these');

// ── A6: the budget is asserted on the SELECTED string, never on "some candidate fits" ────────────────
/* THE SAN LIST IS WEIGHTED TOWARDS WHAT THE GRADER ACTUALLY SEES, and before #459 it was not. Five of the
   original ten are 3-character quiet moves, and the Brilliant lead fits only a SAN of 3 or fewer - so A6e
   passed over a rung that is dead for every brilliancy this project has measured (Bxh3, Qxc3, Bxg6, Bxh7+,
   all 4 or 5 characters: #432/#433's fixture-agrees-with-the-code trap, found by #459's antagonist A).
   A brilliancy is a sacrifice, so it is a capture or a check; those shapes are now first in the list. */
const SANS=['Bxh3','Qxc3','Bxg6','Bxh7+','e4','Nf3','Qxd5','Rxh7+','Bb5','O-O','exd5','Ng1','R1xd5','cxb8=Q+'];
const BANDS=['level','slightly better','clearly better','winning','completely winning','slightly worse',
  'clearly worse','losing','completely losing'];
let rN=0,rOver=0,rKunal=0,rGood=0;const rUniq=new Set();
for(const san of SANS)for(const band of BANDS)for(const label of ['Good','Inaccuracy','Mistake','Blunder'])
  for(const takenBack of [false,true]){
    const m=E.drillGradeMsg(san,{label,bandAfter:band,takenBack,mateBaseline:false,loss:100});
    rN++;rUniq.add(m);
    if(m.length>E.DRILL_MSG_MAXW)rOver++;
    /* THE DENOMINATOR IS THE NUMBER OF GOOD-BAND SELECTIONS, NOT THE san x band GRID. The first version of
       this printed "180 of 90", because the numerator ran over the whole label x takenBack loop and the
       denominator only over SANs x bands - a ratio above 1 is not a rounding problem, it is two different
       populations in one sentence, and this project has paid for published counts with no stated scope. */
    if(label==='Good'){rGood++;if(/Can you find it\?/.test(m))rKunal++;}
  }
ok(rOver===0,'A6a','all '+rN+' SELECTED reject sentences are within the '+E.DRILL_MSG_MAXW
  +'-char budget (the selection, not merely some candidate - #456\'s own control tested the wrong one)');
let aN=0,aOver=0,aSplice=0;const aUniq=new Set();
const FAKE={sol:['Qxf7+'],explain:'E'.repeat(52)};   // mistakeWhy already packs explain to 52 for this box
for(const san of SANS)for(const label of ['Brilliant','Best','Excellent']){
  const m=E.drillAcceptMsg(san,{label},FAKE);aN++;aUniq.add(m);
  if(('\u{1F389} '+m).length>E.DRILL_MSG_MAXW)aOver++;
  if(/EEEE/.test(m))aSplice++;
}
ok(aOver===0,'A6b','all '+aN+' SELECTED accept sentences fit the same box (#456 budgeted only the reject half)');
ok(aSplice===0,'A6c','no accept sentence splices p.explain, which on a mine: card was written about the '
  +'move the player ORIGINALLY played and not the one just found');
ok(rKunal===rGood&&rGood>0,'A6d','Kunal\'s own "Can you find it?" survives the budget in '+rKunal+' of '
  +rGood+' Good-band selections (0 of '+rGood+' before #457: his wording sat only in candidates that never fit)');

/* ── A6e..A6h, ADDED #459. THE RUNG THAT WAS SELECTED, NOT MERELY THE RUNG THAT FITS ──────────────────
   A6a and A6b above assert that the SELECTED sentence is inside the budget. That is true of a ladder whose
   top rung is unreachable for every input in the universe, which is precisely what #457 shipped: measured
   50, 52 and 60 characters against 48, so drillAcceptMsg could only ever return candidate 2 and the string
   named in chess.jsx, in this gate's own header and in US-R14 could not be printed at all. Two green
   assertions sat over it. So these four read the LADDERS THEMSELVES - drillGradeCands and drillAcceptCands,
   the shipped lists, not a copy kept here, because a gate holding its own copy of the strings is the
   #432/#433 trap where the fixture agrees with the code by construction.
   EACH ONE CARRIES ITS CONTROL, in A4's shape: the control recomputes the PREVIOUS build's ladder and
   REQUIRES it to fail, so reverting the repair reddens the gate and applying it to something that never had
   the defect also reddens it. The control strings are a historical fact about #457's tree, not a fixture
   for this one. */
const selIdx=(cands,pre)=>{for(let i=0;i<cands.length;i++)if((pre+cands[i]).length<=E.DRILL_MSG_MAXW)return i;return -1;};
const TICK='\u2713 ',PARTY='\u{1F389} ';
let deadLead=0,ladders=0;const idxSeen=[];
for(const label of ['Brilliant','Best','Excellent'])for(const sol of [['Qxf7+'],null]){
  ladders++;const seen=new Set();
  for(const san of SANS){const c=E.drillAcceptCands(san,{label},sol?{sol}:{});const i=selIdx(c,PARTY);if(i>=0)seen.add(i);}
  if(!seen.has(0))deadLead++;
  idxSeen.push(label+(sol?'/sol':'/none')+'={'+[...seen].sort().join(',')+'}');
}
ok(deadLead===0,'A6e','no accept ladder has a dead lead: the top rung is the SELECTED rung for at least one '
  +'of '+SANS.length+' real SANs in all '+ladders+' ladders - '+idxSeen.join(' '));
/* THE CONTROL. #457's own three lead candidates, verbatim, at the SHORTEST SAN in the set. If the budget or
   the strings ever drift back to a state where these would fit, this assertion goes red and A6e stops being
   evidence - which is the point: it pins WHY the leads were shortened, not merely that they were. */
const C457=['e4 \u2014 Brilliant! A real sacrifice, and it works.',
            'e4 \u2014 Best move. Nothing in the position beats it.',
            'e4 \u2014 Excellent, all but the best. Qxf7+ is a shade sharper.'];
const c457over=C457.filter(c=>(PARTY+c).length>E.DRILL_MSG_MAXW).length;
ok(c457over===C457.length,'A6f','CONTROL: all '+C457.length+' of #457\'s lead candidates are still over the '
  +E.DRILL_MSG_MAXW+'-char budget ('+C457.map(c=>(PARTY+c).length).join('/')+'), so A6e is measuring a real '
  +'constraint and not a budget that quietly grew');
/* THE GOOD BAND DISCRIMINATES, over the same grid A6a walks. */
let gWorstDistinct=99,gQ=0,gC=0,gN=0;
for(const san of SANS){const set=new Set();
  for(const band of BANDS)for(const takenBack of [false,true]){
    const m=E.drillGradeMsg(san,{label:'Good',bandAfter:band,takenBack,mateBaseline:false,loss:100});
    set.add(m);gN++;
    if(/Can you find it\?/.test(m))gQ++;
    if(m.includes(takenBack?'taken straight back':band))gC++;
  }
  gWorstDistinct=Math.min(gWorstDistinct,set.size);
}
ok(gWorstDistinct>=10,'A6g','the Good band yields at least '+gWorstDistinct+' distinct sentences over the '
  +(BANDS.length*2)+' band x takenBack inputs at EVERY one of '+SANS.length+' SANs (#457: exactly 1, against '
  +'10 for Mistake, Blunder and Inaccuracy - R10 item 5 in the one band Kunal wrote the words for)');
ok(gQ===gN&&gC===gN,'A6h','every one of '+gN+' Good-band selections carries BOTH Kunal\'s question ('+gQ+') '
  +'and the clause that tells two mistakes apart ('+gC+'): the grade label is what the budget cuts, never '
  +'his wording and never the discriminator');
/* THE CONTROL for A6g: #457's Good ladder read only the head, so it could not tell the inputs apart. */
const g457=(played,gr)=>{const head=played+' \u2014 '+gr.label;
  return [head+', but there is more here. Can you find it?',head+' \u2014 more here. Can you find it?',
          head+'. Can you find it?',head+', but there is more here.',head+'.'];};
const g457set=new Set();
for(const band of BANDS)for(const takenBack of [false,true]){
  const c=g457('Nf3',{label:'Good',bandAfter:band,takenBack});const i=selIdx(c,TICK);
  g457set.add(TICK+c[i<0?c.length-1:i]);
}
ok(g457set.size===1,'A6i','CONTROL: #457\'s Good ladder collapses '+(BANDS.length*2)+' inputs to '
  +g457set.size+' sentence, so A6g fails if the repair is reverted');

/* ── A6j, ADDED #459. THE ACCEPT BAND HAS A CEILING, because an accept is not a cosmetic verdict: it marks
   the drill solved and reveals the stored move. Nothing in this gate or gate 52 bounded it, and job 457 item
   4 asks for exactly this. THE NUMBER IS NOT MOVED HERE - DRILL_ACCEPT_LOSS stays at 40, which is Kunal's to
   change - so this pins the CONSEQUENCE of the current threshold rather than endorsing it: if a later tweak
   to the ranking depth or the band edges starts accepting most of the board, this goes red and somebody looks.
   The ceiling is deliberately loose (half the legal moves) because the honest tight value is unknown until
   he rules; a loose assertion that can fail beats a tight one invented here. */
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
ok(accN>0&&accPct<50&&worstPos<0.75,'A6j','the accept band is bounded: '+accYes+' of '+accN+' graded moves '
  +'accepted ('+accPct.toFixed(1)+'%), worst single position '+(100*worstPos).toFixed(1)+'% - an accept reveals '
  +'the answer and marks the card solved, so an unbounded one is the "a position cannot have fifteen best '
  +'moves" defect wearing the accept predicate. DRILL_ACCEPT_LOSS is NOT changed by this build [Kunal\'s call]');

// ── A7: a failed ranking is not cached, and distinct moves do not share one sentence ─────────────────
const STALE=E.fromFEN('6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w - - 0 1');
ok(E.gradeDrillMove(STALE,E.getLegal(STALE)[0],'Zz9')===null,'A7a',
  'a stored SAN that is not legal here grades null rather than guessing a baseline');
const sent=new Map();
for(const mv of E.getLegal(STALE)){
  if(E.getStatus(E.makeMove(STALE,mv))==='checkmate')continue;
  const s=sanOf(STALE,mv);const gr=E.gradeDrillMove(STALE,mv,'Rdxd5');if(!gr)continue;
  sent.set(s,gr.accept?E.drillAcceptMsg(s,gr,{sol:['Rdxd5']}):E.drillGradeMsg(s,gr));
}
ok(sent.size>0,'A7b','gate 52\'s own fixture grades '+sent.size+' moves (stored SAN Rdxd5)');
/* A7c MASKS THE SAN, AND WITHOUT THE MASK IT COULD NOT FAIL. Every sentence begins with the move's own
   name, so a set over the raw strings is distinct BY THE PREFIX and says nothing about the ladder: measured
   by #459's antagonist A, 25 of 25 distinct on this build AND 25 of 25 on the #457 control whose Good ladder
   collapses 18 inputs to one sentence - identical numbers on a good tree and a broken one. The masking
   technique is not new here; gate 52's C4 already does exactly this, in the file next door, with a comment
   saying why, and this gate did not use it [the rule about a lesson not travelling between gates by itself].
   SAN-masked the honest figure on this fixture is 4 distinct over 25.
   AND THE BAR IS 3, NOT 1, BECAUSE A CONTROL HAD TO CROSS IT. Masking alone was not enough: with every
   reject branch collapsed to a single `head+'.'` string the masked count is still 2, because the LABEL
   differs (Best for the two accepted moves, Blunder for the rest), so a `>1` bar passes a bundle whose
   reject ladder says one thing. Measured: good tree 4, one-string tree 2. The bar sits between them - which
   is the rule that a negative control must cross the threshold and not merely disturb the mechanism. */
const mask=(s)=>String(s).replace(/^\S+\s+/,'').replace(/^\S+\s+/,'<SAN> ');
const maskedVerdicts=new Set([...sent.values()].map(mask));
ok(maskedVerdicts.size>=3,'A7c','with the SAN MASKED, the fixture\'s moves do not all receive one '
  +'interchangeable sentence (R10 item 5): '+maskedVerdicts.size+' distinct verdict SHAPES over '+sent.size
  +' moves (unmasked reads '+new Set([...sent.values()]).size+', which is distinctness by move name and is '
  +'what #459\'s antagonist A proved cannot fail)');
const eq=[...sent].find(([k])=>/^Rhxd5|^R5xd5/.test(k));
ok(!!eq&&/Best|Excellent|Brilliant/.test(eq[1]),'A7d',
  'the EQUAL alternative is accepted, which is the defect Kunal reported: '+(eq?eq[0]+' -> '+eq[1]:'not found'));

console.log(fails?('\n<<< 17-drill-grade-arithmetic: '+fails+' FAILURES'):'\n17-drill-grade-arithmetic: ok');
process.exit(fails?1:0);
