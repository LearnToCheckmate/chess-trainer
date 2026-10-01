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
// against `git show origin/main:chess.jsx` (the shipped #439 source) goes RED on A1-A4, A6 and B3 and GREEN
// on every assertion in blocks B1/B2 and C - which is the shape that proves the gate is reading the measure
// and not its own wiring. Both md5s are printed below on every run so a reader can always tell what was
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
    ok('C8c', g.sac<2 && g.isSac===false, `a pawn-for-pawn e.p. capture is not a sacrifice: sac=${g.sac} isSac=${g.isSac}`);
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
  const gc=E.brilliantGate(pos,move(pos,'b7','c8','q'),0,3.0,3.0);
  ok('A5', gc.sac===0 && gc.ok===false, `bxc8=Q stays 0 and not Brilliant (sac=${gc.sac} ok=${gc.ok}) - it was already correct and must not move`);
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
    const loss=Math.round(Math.max(0,av-scored[0].v<0?scored[0].v-av:av-scored[0].v));
    const lossB=Math.round(Math.max(0, side==='w'?scored[0].v-av:av-scored[0].v));
    const g=E.brilliantGate(pos,pl,lossB,E.evalPawns(res.positions[idx+1]),E.evalPawns(pos));
    eq(id+'c', g.sac, wantSac, `${want}: sac is UNCHANGED from the shipped measure`);
    ok(id+'d', g.ok===true, `${want} is still Brilliant (ok=${g.ok}) - a fix that bought the false positive back by killing this is not a fix`);
    void loss;
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
