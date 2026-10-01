// gates/regress/68-brilliant-sac-empty-square.js
// US-R31 / TC-R41. #448, from
// jobs/a-non-sacrifice-on-an-empty-landing-square-scores-full-value-2026-10-01 (priority 10, live P1 on
// main), found by #443's antagonist B on the shipped surface and verified by the build lane before filing.
//
// ── WHAT THE DEFECT WAS, MEASURED ON THE SHIPPED #439 ────────────────────────────────────────────────────
// brilliantGate's sacrifice term read:  sac = SEEVAL[piece now on the landing square] - SEEVAL[what it
// captured there]. When the landing square was EMPTY, capVal is 0 and the subtraction does nothing, so the
// gate charged the FULL value of the piece standing there as material given up. Measured on the shipped
// bundle, FEN 2r4k/1P6/8/8/8/8/8/K7 w with loss=0 and evA=evB=3.0:
//     b8=Q  sac=9 isSac=true cap=220 ok=TRUE      b8=R  sac=5 ok=TRUE
//     b8=B  sac=3 ok=TRUE                         b8=N  sac=3 ok=TRUE
//     bxc8=Q  sac=0 ok=false   <- the capture-promotion, already correct
// So a player who queened a pawn and lost it was congratulated for a brilliant nine-pawn queen sacrifice.
// AND IT IS NOT HYPOTHETICAL AND NOT ABOUT PROMOTIONS: in the live answer-key corpus, 174540842570
// 37.Qf6+ - a queen trade offered with check, no promotion anywhere - scored sac=9 and ok=TRUE by the same
// mechanism, in a game chess.com records ZERO Brilliants in. That is why this gate asserts BOTH arms in one
// file, which is work item 3 of the job in its own words: "a promotion and a quiet queen check must score 0,
// and an abandoned bishop must not. Any fix that closes one and opens the other has to be visible."
//
// ── WHY NO GATE SAW IT, AND WHY BLOCK C EXISTS ──────────────────────────────────────────────────────────
// There are 0 promotions and 0 en-passant captures in all 697 plies of the answer-key corpus, so the input
// class the defect lives in was never present in anything that measured this. That is #432/#433's fixture
// lesson exactly - "a fixture that encodes the same assumption as the code cannot see that assumption" - so
// block C asserts the INPUT CLASS IS REALLY THERE (the constructed moves are legal AND carry .promo, the
// e.p. move carries .epCap) before blocks A and B read anything off it. Without block C, A1-A4 would pass
// just as happily on a bundle where the move was never found at all.
//
// ── THE ONE THING THIS GATE CANNOT DO, SAID LOUDLY RATHER THAN BURIED ───────────────────────────────────
// IT MEASURES chess.jsx, NOT THE BUNDLE NAMED BY CT_APP. gates/build.sh runs esbuild with --minify, so every
// name in app.js is mangled and the engine cannot be extracted from it; gates/unit-drill-why.js and the #443
// measurement harness read chess.jsx for the same reason. The consequence is specific and must not be
// forgotten: a trial-bundle negative control (CT_APP=/path/to/broken-bundle.js gates/gates.sh) CANNOT redden
// this gate, because this gate never looks at that file. This gate's negative control is therefore CT_SRC,
// not CT_APP, and it is a real one that was actually run:
//     CT_SRC=<pre-fix chess.jsx> node gates/regress/68-brilliant-sac-empty-square.js
// against `git show df79fb7:chess.jsx` (the shipped #439 source) goes RED on EXACTLY these eleven assertions:
// A1i A1ii A2i A2ii A3i A3ii A4i A4ii A6d B3c B3f - 30 pass / 11 fail. NOTE THE PRECISION, because an earlier
// version of this line read "A1-A4, A6 and B3", which is wrong at block granularity and would send anyone
// reproducing the control straight to a mismatch: A6a/A6b/A6c and B3a/B3b/B3d/B3e all stay GREEN. Measured by
// #448's antagonist A and corrected here [R18]. Blocks B1/B2 and C stay green on BOTH sources, which is the
// shape that proves the gate is reading the measure and not its own wiring. Both md5s are printed below on every run so a reader can always tell what was
// measured [CLAUDE.md: "if a run's output does not say what it measured, it is not evidence"].
'use strict';
const path=require('path'), fs=require('fs'), crypto=require('crypto');
const E=require('../engine-extract.js');

let pass=0, fail=0;
const ok=(id,cond,msg)=>{ if(cond){pass++;console.log(`PASS ${id}  ${msg}`);} else {fail++;console.log(`FAIL ${id}  ${msg}`);} };
const eq=(id,got,want,what)=>ok(id, got===want, `${what}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const appMd5=fs.existsSync(APP)?crypto.createHash('md5').update(fs.readFileSync(APP)).digest('hex').slice(0,12):'(absent)';
console.log(`68-brilliant-sac-empty-square: MEASURING chess.jsx ${E.SRC_PATH} md5 ${E.SOURCE_MD5}`);
console.log(`  NOTE: CT_APP is ${APP} md5 ${appMd5} and is NOT what this gate reads (bundle is minified; see header).`);

const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
const PROMO_FEN='2r4k/1P6/8/8/8/8/8/K7 w - - 0 1';
function move(pos,from,to,promo){
  const [fr,fc]=sq(from),[tr,tc]=sq(to);
  return E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&(promo?m.promo===promo:!m.promo));
}

// ── C. THE INSTRUMENT AND THE INPUT CLASS, BEFORE ANYTHING IS READ OFF THEM ─────────────────────────────
console.log('\n-- C. the instrument works and the input class is present');
{
  const pos=E.fromFEN(PROMO_FEN);
  ok('C1', !!pos && Array.isArray(pos.board) && pos.board.length===8 && pos.turn==='w',
     'the promotion FEN parses to a White-to-move 8-row board');
  const legal=E.getLegal(pos);
  ok('C2', legal.length>0, `the position has legal moves (${legal.length})`);
  const promos=legal.filter(m=>m.promo);
  ok('C3', promos.length===8, `the input class EXISTS: 8 promotion moves are legal here, got ${promos.length}`);
  for(const [id,to,p] of [['C4a','b8','q'],['C4b','b8','r'],['C4c','b8','b'],['C4d','b8','n'],['C4e','c8','q']]){
    const m=move(pos,'b7',to,p);
    ok(id, !!m && m.promo===p, `b7-${to}=${p.toUpperCase()} is found AND carries .promo='${p}'`);
  }
  // The landing square really is empty on b8 and really is occupied on c8 - the whole mechanism.
  ok('C5', !pos.board[0][1], 'b8 is EMPTY before the move (the branch under test)');
  ok('C6', !!pos.board[0][2] && pos.board[0][2].t==='r', 'c8 carries a rook (the capture arm, as a contrast)');
  const g=E.brilliantGate(pos,move(pos,'b7','b8','q'),0,3.0,3.0);
  ok('C7', g && typeof g.sac==='number' && typeof g.ok==='boolean' && typeof g.isSac==='boolean',
     'brilliantGate returns {sac,ok,isSac} - the instrument is reachable and shaped as expected');
}

// ── C8. EN PASSANT IS A CAPTURE AND MUST NOT FALL INTO THE EMPTY-SQUARE ARM ─────────────────────────────
// The e.p. target square is empty, so a naive "was the landing square empty" test routes an e.p. capture
// to the wrong arm. 0 e.p. captures exist in the corpus, so nothing else in this suite covers it.
console.log('\n-- C8. en passant: landing square empty, but it IS a capture');
{
  const pos=E.fromFEN('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const m=move(pos,'e5','d6');
  ok('C8a', !!m && m.epCap===true, 'exd6 e.p. is legal AND carries .epCap');
  if(m){
    ok('C8b', !pos.board[2][3], 'the e.p. landing square d6 is empty before the move');
    const g=E.brilliantGate(pos,m,0,3.0,3.0);
    // HONEST LABEL, because antagonist A PROVED this cannot fail: delete the e.p. term from chess.jsx
    // outright and this gate still reads 41/0. The reason is arithmetic rather than luck - the moving
    // piece in an e.p. capture is a pawn, so movedVal is 1, and BOTH routings yield at most 1, which is
    // under isSac>=2 either way. The e.p. term can therefore change no verdict this app can reach: it is
    // correct, it documents intent, and it is INERT. C8c is a companion proving the input class is
    // reachable, NOT a test of that branch. Stated here rather than left for the next reader to discover.
    ok('C8c', g.sac<2 && g.isSac===false, `COMPANION, cannot fail by construction (see comment): e.p. sac=${g.sac} isSac=${g.isSac}`);
  }
}

// ── A. THE DEFECT: AN EMPTY LANDING SQUARE IS NOT A SACRIFICE OF WHAT NOW STANDS THERE ──────────────────
// Pinned as a VALUE, not merely a branch: queening a pawn and losing it gives up A PAWN, so sac must be 1.
// Asserting only "sac < 2" would stay green on a measure that returned 0 for everything.
console.log('\n-- A. the empty landing square (RED on the shipped #439 source)');
{
  const pos=E.fromFEN(PROMO_FEN);
  for(const [id,p,label] of [['A1','q','b8=Q'],['A2','r','b8=R'],['A3','b','b8=B'],['A4','n','b8=N']]){
    const g=E.brilliantGate(pos,move(pos,'b7','b8',p),0,3.0,3.0);
    eq(id+'i', g.sac, 1, `${label}: material given up is ONE PAWN (shipped #439 read ${p==='q'?9:p==='r'?5:3})`);
    ok(id+'ii', g.isSac===false && g.ok===false, `${label}: not a sacrifice and not Brilliant (isSac=${g.isSac} ok=${g.ok})`);
  }
  // A5 USED TO LIVE HERE AND COULD NOT FAIL, and BOTH of #448's antagonists proved it independently
  // from different doors. On THIS FEN seeSq after bxc8=Q returns 0, so the `if(seeOpp>0)` guard skips
  // the entire block and sac is 0 for ANY formula whatsoever - including every formula in which the
  // defect is live. Its old message asserted in prose that the capture arm "was already correct and
  // must not move", which was both unmeasured and FALSE. Kept only as the guard-path companion it
  // really is; the capture arm is actually tested in A5b/A5c below.
  const gc=E.brilliantGate(pos,move(pos,'b7','c8','q'),0,3.0,3.0);
  ok('A5a', gc.sac===0 && gc.ok===false, `COMPANION: bxc8=Q here is 0 via the seeOpp>0 GUARD, not via the capture arm (sac=${gc.sac})`);
}

// ── A5b/A5c. THE CAPTURE ARM, ACTUALLY EVALUATED. THIS IS THE VETO THAT CHANGED THE SHIPPED CODE. ──────
// Both antagonists found the same defect from different doors: #448's first candidate applied the promotion
// credit ONLY to the empty-square arm, so a CAPTURE-promotion still charged the promoted piece's full value
// as material given up. Measured on that candidate: bxc8=Q on 2rr3k/1P6/8/8/8/8/8/K7 w - a move that WINS A
// ROOK FOR A PAWN - read sac=4 isSac=true ok=TRUE. Antagonist A then drove 479 generated promotion-captures
// through the real fallback pipeline and found 57 scoring isSac=true, 6 of them reaching ok=true, and found
// the same shape one eval-tenth from live in this repo's own Lasker Trap lesson. Every FEN below is one of
// theirs, and each is chosen so seeOpp>0, which is precisely what A5 never had.
console.log('\n-- A5b/A5c. the CAPTURE arm, where seeOpp>0 so the arm is really reached');
{
  const CAPS=[
    ['A5b1','2rr3k/1P6/8/8/8/8/8/K7 w - - 0 1','b7','c8','q',0,3.0,3.0,'bxc8=Q wins a rook for a pawn (first candidate: sac=4 ok=TRUE)'],
    ['A5b2','2n4k/1P6/8/8/8/K7/2r5/8 w - - 0 1','b7','c8','q',0,3.0,3.0,'bxc8=Q wins a knight (antagonist A: sac=6 ok=TRUE)'],
    ['A5b3','2n4k/1P6/8/8/8/K7/2r5/8 w - - 0 1','b7','c8','r',0,3.0,3.0,'bxc8=R wins a knight (antagonist A: sac=2 ok=TRUE)'],
    ['A5c1','5r2/4Pk2/1p2R1p1/2P5/7K/8/5P2/8 w - - 0 1','e7','f8','q',0,14.00,1.60,'exf8=Q+ real pipeline (antagonist A: sac=4 ok=true)'],
    ['A5c2','3b4/4P3/8/b5K1/2p5/4k3/1B4B1/8 w - - 0 1','e7','d8','q',0,11.45,0.80,'exd8=Q real pipeline (antagonist A: sac=6 ok=true)'],
    ['A5c3','3kr3/5P2/1p4n1/5Q2/6K1/8/2p5/8 w - - 0 1','f7','e8','q',0,12.00,-0.50,'fxe8=Q+ real pipeline (antagonist A: sac=4 ok=true)'],
    ['A5c4','4n3/3P1Q2/7K/6N1/8/3k4/4rb2/8 w - - 0 1','d7','e8','q',105,13.00,2.65,'dxe8=Q real pipeline (antagonist A: sac=6 ok=true)'],
  ];
  for(const [id,fen,f,t,p,loss,evA,evB,why] of CAPS){
    const pos=E.fromFEN(fen); const pl=move(pos,f,t,p);
    ok(id+'-legal', !!pl && pl.promo===p, `${why}: legal and promotes`);
    if(!pl) continue;
    const seeOpp=E.seeSq(E.makeMove(pos,pl),pl.tr,pl.tc,E.makeMove(pos,pl).turn);
    ok(id+'-reach', seeOpp>0, `seeOpp=${seeOpp}>0 so the capture arm is REACHED - the thing A5 never managed`);
    ok(id+'-cap', !!pos.board[pl.tr][pl.tc], 'the landing square is OCCUPIED, so this is the capture arm');
    const g=E.brilliantGate(pos,pl,loss,evA,evB);
    ok(id, g.isSac===false && g.ok===false,
       `a promotion that WINS material is not a sacrifice and not Brilliant: sac=${g.sac} given=${g.given} isSac=${g.isSac} ok=${g.ok}`);
  }
}

// ── D. THE MISSING QUADRANT: A GENUINE SACRIFICE ONTO AN EMPTY SQUARE MUST STILL FIRE. ─────────────────
// Antagonist B's P1-1: block A says an empty square must NOT fire and block B says a real sacrifice MUST
// fire - but every assertion in block B is a CAPTURE, i.e. the arm this fix leaves alone. So there was no
// assertion anywhere that a genuine sacrifice on an EMPTY square still fires, which is exactly the quadrant
// the new net-SEE measure could damage. This block is that quadrant, and its input is this repo's own
// canonical queen sacrifice (chess.jsx:1181, whose lesson text reads "Qg8+!! is a stunning sacrifice").
// IT ALSO PINS THE SENTENCE, which is the other half of B's finding: the ladders at chess.jsx:947 and :3663
// are keyed on gross piece value, so feeding them the NET cost made this very move print "You give up a
// rook" for a queen. brilliantGate now returns `given` (material handed over) alongside `sac` (net cost),
// and the ladders read `given`.
console.log('\n-- D. a genuine sacrifice on an EMPTY square still fires, and still names the right piece');
{
  const rung=v=>v>=9?'the queen':v>=5?'a rook':v>=2?'a piece':v>=1?'a pawn':'material';
  const pos=E.fromFEN('5r1k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1');
  const pl=move(pos,'d5','g8');
  ok('D1', !!pl, 'Qg8+ is legal in the lesson position');
  if(pl){
    ok('D2', !pos.board[pl.tr][pl.tc], 'g8 is EMPTY before the move, so this is the arm #448 changed');
    const g=E.brilliantGate(pos,pl,0,3.0,3.0);
    ok('D3', g.isSac===true, `a real queen sacrifice onto an empty square IS still a sacrifice (sac=${g.sac} isSac=${g.isSac})`);
    ok('D4', g.ok===true, `and it is still Brilliant (ok=${g.ok}) - the quadrant block B never covered`);
    eq('D5', g.given, 9, 'the material HANDED OVER is a queen, which is what the sentence ladder reads');
    eq('D6', rung(g.given), 'the queen', 'so the review still says "You give up the queen" and not "a rook"');
    ok('D7', g.sac < g.given, `and the two quantities are genuinely different here (net ${g.sac} < handed over ${g.given}) - which is why one expression could not serve both`);
  }
}

// ── A6. THE SAME MECHANISM WITH NO PROMOTION ANYWHERE, FROM THE LIVE CORPUS ────────────────────────────
console.log('\n-- A6. 174540842570 37.Qf6+, a queen trade offered with check (no promotion)');
{
  const PGN=path.join(__dirname,'..','..','claude','agents','bench','pgn','174540842570.pgn');
  if(!fs.existsSync(PGN)){
    console.log('SKIP A6  corpus PGN absent at '+PGN+' - NOT counted as a pass');
    fail++; console.log('FAIL A6  the corpus fixture this assertion needs is missing');
  } else {
    const res=E.loadSANs(E.parsePGN(fs.readFileSync(PGN,'utf8')));
    let found=null;
    for(let i=0;i<res.plies.length;i++){
      const san=String(res.plies[i].san||'').replace(/[!?]/g,'');
      if(san==='Qf6+'&&Math.floor(i/2)+1===37) found=i;
    }
    ok('A6a', found!==null, '37.Qf6+ is present in the fixture (the input class is really here)');
    if(found!==null){
      const pos=res.positions[found], pl=res.plies[found].move;
      ok('A6b', !pos.board[pl.tr][pl.tc], 'f6 is EMPTY before 37.Qf6+ - same branch as the promotions above');
      ok('A6c', !pl.promo, '37.Qf6+ is NOT a promotion, so a promotion-only fix could not reach it');
      const scored=E.rankMoves(pos,2);
      const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
      const av=actual?actual.v:(pos.turn==='w'?-9999:9999);
      const loss=Math.round(Math.max(0,scored[0].v-av));
      const g=E.brilliantGate(pos,pl,loss,E.evalPawns(res.positions[found+1]),E.evalPawns(pos));
      ok('A6d', g.ok===false, `37.Qf6+ is NOT Brilliant (sac=${g.sac} ok=${g.ok}; shipped #439 read sac=9 ok=true)`);
      // A6d on its own is a five-term conjunction, so a build whose sac fix regressed but whose evAfter
      // happened to land below 0.8 would pass it green. Antagonist B caught that this one corpus-sourced
      // case was the only A assertion not pinning its value, while the header demands exactly that.
      eq('A6e', g.sac, 1, '37.Qf6+ net material given up is ONE PAWN (shipped #439 read 9)');
      ok('A6f', g.isSac===false, `37.Qf6+ is not a sacrifice at all (isSac=${g.isSac})`);
    }
  }
}

// ── B. THE OTHER DIRECTION: A REAL SACRIFICE MUST STILL FIRE ───────────────────────────────────────────
// This is the half that makes the fix falsifiable in both directions. These two are the only moves the
// project publishes as agreeing with chess.com, and 19...Bxh3 is the one Kunal found by hand at #420.
console.log('\n-- B. real sacrifices still fire (GREEN on the shipped source too - that is the point)');
{
  const CASES=[['B1','184024052818','Bxh3',19,'b',2],['B2','184222697658','Qxc3',22,'b',8]];
  const DIR=path.join(__dirname,'..','..','claude','agents','bench','pgn');
  for(const [id,gid,want,mv,side,wantSac] of CASES){
    const P=path.join(DIR,gid+'.pgn');
    if(!fs.existsSync(P)){ fail++; console.log(`FAIL ${id}  fixture ${gid}.pgn missing`); continue; }
    const res=E.loadSANs(E.parsePGN(fs.readFileSync(P,'utf8')));
    let idx=null;
    for(let i=0;i<res.plies.length;i++){
      const san=String(res.plies[i].san||'').replace(/[!?+#]/g,'');
      const mc=i%2===0?'w':'b';
      if(san===want&&mc===side&&Math.floor(i/2)+1===mv) idx=i;
    }
    ok(id+'a', idx!==null, `${gid} ${mv}...${want} is present in the fixture`);
    if(idx===null) continue;
    const pos=res.positions[idx], pl=res.plies[idx].move;
    ok(id+'b', !!pos.board[pl.tr][pl.tc], `${want} is a CAPTURE, so it takes the arm this fix leaves byte-identical`);
    const scored=E.rankMoves(pos,2);
    const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
    const av=actual?actual.v:(pos.turn==='w'?-9999:9999);
    const lossB=Math.round(Math.max(0, side==='w'?scored[0].v-av:av-scored[0].v));
    const g=E.brilliantGate(pos,pl,lossB,E.evalPawns(res.positions[idx+1]),E.evalPawns(pos));
    eq(id+'c', g.sac, wantSac, `${want}: sac is UNCHANGED from the shipped measure`);
    ok(id+'d', g.ok===true, `${want} is still Brilliant (ok=${g.ok}) - a fix that bought the false positive back by killing this is not a fix`);
  }
}

// ── B3. THE WHOLE CORPUS FIRES ON EXACTLY THOSE TWO ────────────────────────────────────────────────────
// The shipped #439 fires on THREE over these 697 plies while the project publishes agreement with chess.com
// on TWO, and #443's own log never reconciled the difference. The third was 37.Qf6+. This pins the count AND
// the identities, because a bare count of 2 could be satisfied by the wrong two.
console.log('\n-- B3. the corpus-wide count and identities');
{
  const DIR=path.join(__dirname,'..','..','claude','agents','bench','pgn');
  const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>f.endsWith('.pgn')).sort():[];
  ok('B3a', files.length===9, `the corpus is the nine games the answer key covers (got ${files.length})`);
  const hits=[]; let plies=0;
  for(const f of files){
    const res=E.loadSANs(E.parsePGN(fs.readFileSync(path.join(DIR,f),'utf8')));
    for(let i=0;i<res.plies.length;i++){
      const mc=i%2===0?'w':'b', pos=res.positions[i], pl=res.plies[i].move;
      const scored=E.rankMoves(pos,2); if(!scored||!scored.length)continue;
      plies++;
      const actual=scored.find(s=>s.m.fr===pl.fr&&s.m.fc===pl.fc&&s.m.tr===pl.tr&&s.m.tc===pl.tc);
      const av=actual?actual.v:(pos.turn==='w'?-9999:9999);
      const loss=Math.round(Math.max(0,mc==='w'?scored[0].v-av:av-scored[0].v));
      if(E.brilliantGate(pos,pl,loss,E.evalPawns(res.positions[i+1]),E.evalPawns(pos)).ok)
        hits.push(`${f.replace('.pgn','')} ${Math.floor(i/2)+1}${mc==='w'?'.':'...'}${res.plies[i].san}`);
    }
  }
  ok('B3b', plies===697, `all 697 plies scored (got ${plies}) - the denominator is pinned, not assumed`);
  console.log('     fires on: '+(hits.join(' | ')||'(none)'));
  eq('B3c', hits.length, 2, 'the gate fires on exactly two moves across the corpus');
  ok('B3d', hits.some(h=>h.includes('Bxh3')), 'one of them is 184024052818 19...Bxh3');
  ok('B3e', hits.some(h=>h.includes('Qxc3')), 'the other is 184222697658 22...Qxc3');
  ok('B3f', !hits.some(h=>h.includes('Qf6')), '37.Qf6+ is NOT among them');
}

console.log(`\n68-brilliant-sac-empty-square: ${pass} pass, ${fail} fail`);
process.exit(fail?1:0);
