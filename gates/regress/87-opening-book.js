// gates/regress/87-opening-book.js
// US-R110 / TC-R156..TC-R161. #549 item (98), jobs/opening-book-coverage-gap; Kunal, decisions/desk-round-1-2026-09-19 d05:
// "Widen the opening table, KEYED BY POSITION rather than by move prefix, so it survives transpositions."
//
// THE RULE UNDER TEST (chess.jsx openingBookPlies): a game's Book plies are the larger of (1) the lesson library's lines as a move
// prefix and (2) the last of its first 24 positions that is a NAMED opening position of lichess-org/chess-openings (gates/opening-book/,
// CC0), keyed by board, side to move and castling - at most 24.
//
// WHAT IT READS. Blocks A-E are NODE blocks over chess.jsx through gates/engine-extract.js (the bundle is minified and cannot be
// extracted, as gates 68 and 82 say; their control is CT_SRC=<a mutated chess.jsx>). Block F is a BROWSER block over the bundle under
// test (CT_APP): the 1.b3 answer-key game reviewed with ct_book_table='1', its two painted Book counts read off the summary.
// THE TABLE SHIPS OFF (BOOK_TABLE_DEFAULT 0): the run's ruling at the #549 cut line, since it moves accuracies Kunal has not seen.
//
// THE ORACLE IS THIS FILE'S OWN, NOT THE APP'S. The named positions are rebuilt here from the five vendored TSV files as FEN strings
// (the first three fields), with no hash and no BOOK_POS, and the lesson prefix is matched here over lessons.js; only the move
// generator (loadSANs, toFEN) is shared with the code under test. So a wrong key, a stale table, a lost transposition or a dropped
// max() disagrees with the oracle instead of agreeing with itself.
//
// THE ANSWER KEY. chess.com's per-side Book counts for the seven answer-key games (gates/opening-book/answerkey-book.json). Book is a
// Tier 1 quantity (d08: it never moved across five readings of chess.com's own review), so it is asserted on. Measured when this gate
// was written: 29 plies against chess.com's 37 (19 before), within one ply on 5 of 7 (3 before), never more than one ply longer. The
// two games still short are named and their shortfall is PINNED as the known residual (C3), not credited: 174386847848 (1.d4 c5 2.Nf3
// e6 3.c3 Nf6 4.e3 Nc6, 2 against 8) and 180000436342 (the Berlin with 4.Bxc6 dxc6, 6 against 8) - lines no named-opening list
// carries; chess.com's book reads a games database, which this project has no CC0 copy of.
// ── CONTROL-RECORD lines for gates/control-audit.js. Node controls are CT_SRC (a mutated chess.jsx; block F is skipped under CT_SRC);
// the bundle control is a CT_APP trial bundle.
// CONTROL-RECORD: 4798697 2026-11-07 total=41 red=13 scope=env:CT_SRC=nc1-ep how=bookKey hashes the en-passant field too - A2 A3 B1 B2 C1 (four games) C3 C4 C5 D0 D1 red
// CONTROL-RECORD: 4798697 2026-11-07 total=41 red=3 scope=env:CT_SRC=nc2-nomax how=openingBookPlies returns the table reading alone (no max with the lesson lines) - C8 E3 E4 red
// CONTROL-RECORD: 4798697 2026-11-07 total=41 red=1 scope=env:CT_SRC=nc3-cap how=the 24-ply cap removed (table read to 40) - D1 red
// CONTROL-RECORD: 4798697 2026-11-07 total=41 red=2 scope=env:CT_SRC=nc4-on how=BOOK_TABLE_DEFAULT 1 (the table on by default) - E2 E4 red
// CONTROL-RECORD: 4798697 2026-11-07 total=45 red=1 scope=trial:80233fa4c4ec how=the run tree's bundle without this change (no table, no switch): F1 red, Book painted 0/0 on the 1.b3 game with ct_book_table=1
// CONTROL-RECORD: d5ff37c 2026-11-07 total=47 red=1 scope=full how=#549 antagonist B final read B5-F: lessons.js and chess.jsx at 3ef9062 (no bookPlies; the 12-ply Petroff line counts whole): TC-R160 E5 red alone (got 12, want 10)
'use strict';
const path=require('path'),fs=require('fs');
const L=require('../lib');
const E=require('../engine-extract.js');
const ROOT=path.join(__dirname,'..','..');
const BOOKDIR=path.join(ROOT,'gates','opening-book');
console.log('87-opening-book: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-E); bundle '+(process.env.CT_APP||'app.js')+' (block F)');

// ── the oracle ──────────────────────────────────────────────────────────────────────────────────────────
const fen3=g=>E.toFEN(g).split(' ').slice(0,3).join(' ');
const NAMED=(()=>{const s=new Set();let lines=0;for(const f of 'abcde'){for(const row of fs.readFileSync(path.join(BOOKDIR,f+'.tsv'),'utf8').split('\n').slice(1)){
  if(!row.trim())continue;const r=E.loadSANs(E.parsePGN(row.split('\t')[2]));if(r.ok&&r.plies.length){lines++;s.add(fen3(r.positions[r.positions.length-1]));}}}
  return {set:s,lines};})();
const OPENINGS=(()=>{const g={};const prev=global.window;global.window=g;const LJ=path.join(ROOT,'lessons.js');
  try{delete require.cache[require.resolve(LJ)];}catch(e){}try{require(LJ);}finally{global.window=prev;}return (g.CTLESSONS&&g.CTLESSONS.OPENINGS)||[];})();
const lessonPrefix=(sans)=>{const cl=x=>E.cleanSAN(String(x));const p=sans.map(cl);let best=0;
  for(const o of OPENINGS){for(const line of [o.bookPlies>0?(o.line||[]).slice(0,o.bookPlies):o.line].concat((o.vars||[]).map(v=>v.line))){if(!line||!line.length)continue;let k=0;const n=Math.min(line.length,p.length);while(k<n&&p[k]===cl(line[k]))k++;if(k>best)best=k;}}
  return best;};
const tablePrefix=(positions,cap)=>{let last=0;for(let i=1;i<=Math.min(cap,positions.length-1);i++)if(NAMED.set.has(fen3(positions[i])))last=i;return last;};
const oracle=(sans,positions)=>Math.min(24,Math.max(lessonPrefix(sans),tablePrefix(positions,24)));
const load=(pgn)=>{const sans=E.parsePGN(pgn);const r=E.loadSANs(sans);return {sans:r.plies.map(p=>p.san),positions:r.positions,ok:r.ok};};
// the table ON unless a caller says otherwise: it SHIPS OFF (BOOK_TABLE_DEFAULT 0, the #549 cut-line ruling), and blocks A-D test what
// ct_book_table='1' turns on; block E tests the default.
const app=(g,table)=>E.openingBookPlies(g.sans,g.positions,OPENINGS,table===undefined?1:table);

const KEY=JSON.parse(fs.readFileSync(path.join(BOOKDIR,'answerkey-book.json'),'utf8')).games;
const GAMES=KEY.map(k=>({...k,...load(fs.readFileSync(path.join(ROOT,'claude','agents','bench','pgn',k.id+'.pgn'),'utf8'))}));

L.run(async()=>{
  // ── A. THE TABLE ────────────────────────────────────────────────────────────────────────────────────
  {const keys=new Set();for(let i=0;i+7<=E.BOOK_POS.length;i+=7)keys.add(E.BOOK_POS.slice(i,i+7));
   L.say(NAMED.lines>=3800&&NAMED.set.size>=3800,'TC-R156 A0 DENOMINATOR the vendored files give '+NAMED.lines+' playable lines and '+NAMED.set.size+' named positions (the oracle is not empty)');
   L.say(E.BOOK_POS.length%7===0&&keys.size===E.BOOK_POS.length/7,'TC-R156 A1 BOOK_POS is whole 7-character keys with no repeat ('+E.BOOK_POS.length+' chars, '+keys.size+' keys)');
   // every named position of the oracle answers yes through the app's own bookHas, and the table holds nothing else
   let miss=0;const want=new Set();for(const f of 'abcde'){for(const row of fs.readFileSync(path.join(BOOKDIR,f+'.tsv'),'utf8').split('\n').slice(1)){if(!row.trim())continue;
     const r=E.loadSANs(E.parsePGN(row.split('\t')[2]));if(!r.ok)continue;const end=r.positions[r.positions.length-1];want.add(E.bookKey(end));if(!E.bookHas(end))miss++;}}
   const extra=[...keys].filter(k=>!want.has(k)).length;
   L.say(miss===0&&extra===0&&keys.size===want.size,'TC-R156 A2 the app\'s table is exactly the vendored named positions: '+miss+' named positions the app misses, '+extra+' keys the files do not make ('+keys.size+' v '+want.size+')');
   const b=require(path.join(BOOKDIR,'build.js')).build();
   L.say(b.keys.join('')===E.BOOK_POS,'TC-R156 A3 BOOK_POS is current: gates/opening-book/build.js over the five files writes exactly the line chess.jsx carries');}

  // ── B. KEYED BY POSITION ────────────────────────────────────────────────────────────────────────────
  {const a=load('1. Nc3 e5 2. f4 exf4 3. e4'),b=load('1. e4 e5 2. f4 exf4 3. Nc3');   // one position (King's Gambit Accepted, Vienna by transposition) by two roads, both named lines
   const A=a.positions[5],B=b.positions[5];
   L.say(fen3(A)===fen3(B)&&E.toFEN(A)!==E.toFEN(B),'TC-R157 B0 PRECONDITION two move orders reach one position whose full FENs differ only in the en-passant field ('+E.toFEN(A).split(' ')[3]+' v '+E.toFEN(B).split(' ')[3]+')');
   L.say(E.bookKey(A)===E.bookKey(B),'TC-R157 B1 the book key is the position\'s, not the move order\'s: '+E.bookKey(A)+' = '+E.bookKey(B));
   L.say(NAMED.set.has(fen3(A))&&E.bookHas(A)&&E.bookHas(B),'TC-R157 B2 that position is a named opening position, and the app finds it by both roads ('+E.bookHas(A)+', '+E.bookHas(B)+')');
   const s=load('1. e4 e5 2. Ke2');   // the Bongcloud loses castling; the same board with castling rights is not the same position
   const noC=s.positions[3];const withC=E.fromFEN(E.toFEN(noC).replace(' w - ',' w KQkq ').replace(' b kq ',' b KQkq '));
   L.say(E.bookKey(noC)!==E.bookKey(withC),'TC-R157 B3 castling rights are part of the key ('+E.toFEN(noC).split(' ')[2]+' v '+E.toFEN(withC).split(' ')[2]+')');}

  // ── C. THE SEVEN ANSWER-KEY GAMES ───────────────────────────────────────────────────────────────────
  {let within=0,sum=0,key=0,old=0;const rows=[];
   L.say(GAMES.length===7&&GAMES.every(g=>g.ok&&g.sans.length>=24),'TC-R158 C0 DENOMINATOR all seven answer-key games load whole ('+GAMES.map(g=>g.sans.length).join(',')+' plies)');
   for(const g of GAMES){const ours=app(g),k=g.bookWhite+g.bookBlack,orc=oracle(g.sans,g.positions),was=app(g,0);
     rows.push(g.id+' ours '+ours+' oracle '+orc+' chess.com '+k+' (lessons alone '+was+')');sum+=ours;key+=k;old+=was;if(Math.abs(ours-k)<=1)within++;
     L.say(ours===orc,'TC-R158 C1 '+g.id+': the app\'s Book count is the oracle\'s ('+ours+' v '+orc+')');
     L.say(ours<=k+1,'TC-R158 C2 '+g.id+': never more than one ply longer than chess.com\'s book ('+ours+' v '+k+')');
     L.say(ours>=was,'TC-R158 C6 '+g.id+': never shorter than the lesson lines alone ('+ours+' v '+was+')');}
   L.note&&L.note(rows.join(' | '));
   L.say(within>=5,'TC-R158 C3 within one ply of chess.com\'s Book count on '+within+' of 7 (3 of 7 before); total '+sum+' v '+key+' (lessons alone '+old+')',rows);
   const short={'174386847848':2,'180000436342':6};
   for(const id of Object.keys(short)){const g=GAMES.find(x=>x.id===id);const ours=g?app(g):null;
     L.say(ours===short[id],'TC-R158 C4 KNOWN RESIDUAL '+id+' reads '+ours+' against chess.com\'s '+(g?g.bookWhite+g.bookBlack:'?')+', as measured when the table was vendored ('+short[id]+'): a change here is a change to the table, to be re-measured, not absorbed');}
   // the lesson library's own Evans Gambit line (gate 19's ALLBOOK), where the LESSON reading is the longer of the two: the max() must keep it
   {const ev=load('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. cxd4 d5 9. exd5 Nxd5 10. Ba3');const lp=lessonPrefix(ev.sans),tp=tablePrefix(ev.positions,24);
    L.say(lp===19&&tp<lp,'TC-R158 C7 PRECONDITION on the lessons\' Evans Gambit line the lesson prefix ('+lp+') is longer than the table\'s reading ('+tp+')');
    L.say(app(ev)===19,'TC-R158 C8 there the Book count keeps the lesson line\'s 19 plies, not the table\'s '+tp+' (got '+app(ev)+')');}
   const b3=GAMES.find(x=>x.id==='174540842570');
   L.say(!!b3&&app(b3,0)===0&&app(b3)===4&&b3.bookWhite+b3.bookBlack===4,'TC-R158 C5 the 1.b3 game, which no lesson line starts: 0 Book plies on the lessons alone, '+(b3&&app(b3))+' with the table, chess.com 4');}

  // ── D. THE CAP ──────────────────────────────────────────────────────────────────────────────────────
  {const shuffle=load(Array.from({length:10},(_,i)=>(2*i+1)+'. Nf3 Nf6 '+(2*i+2)+'. Ng1 Ng8').join(' '));   // the positions after 1.Nf3 and after 1.Nf3 Nf6 recur every 4 plies
   L.say(E.bookTablePlies(shuffle.positions,40)===38,'TC-R159 D0 PRECONDITION uncapped, the knight shuffle is book to ply '+E.bookTablePlies(shuffle.positions,40)+' (38 expected: 1.Nf3 and 1.Nf3 Nf6 recur every four plies)');
   L.say(app(shuffle)===22&&app(shuffle)<=24,'TC-R159 D1 capped at 24: the last named position at or before ply 24 is ply '+app(shuffle)+' (22 expected)');}

  // ── E. THE SWITCH ───────────────────────────────────────────────────────────────────────────────────
  {const tot=GAMES.reduce((n,g)=>n+app(g,0),0),lp=GAMES.reduce((n,g)=>n+Math.min(24,lessonPrefix(g.sans)),0);
   L.say(E.BOOK_TABLE_DEFAULT===0,'TC-R160 E2 the table SHIPS OFF until Kunal has seen what it does to accuracy (the #549 cut-line ruling), BOOK_TABLE_DEFAULT='+E.BOOK_TABLE_DEFAULT);
   const dflt=GAMES.map(g=>E.openingBookPlies(g.sans,g.positions,OPENINGS)),old=GAMES.map(g=>Math.min(24,lessonPrefix(g.sans)));
   L.say(JSON.stringify(dflt)===JSON.stringify(old),'TC-R160 E4 with no switch set the Book count is today\'s, game for game: '+JSON.stringify(dflt)+' v the lesson lines alone '+JSON.stringify(old));
   // #549 antagonist B final read (B5-F): E4 compares the app with THIS FILE's lesson prefix over the SAME lessons.js, so a lessons.js
   // edit moves both sides and E4 cannot see it. Job 65 folded the 12-ply Petroff line into OPENINGS where the removed Petrov had 10,
   // and a Petroff game following 6.Bd3 Nc6 went from 10 Book plies to 12 with the table off. E5 pins the count MEASURED on main
   // 7340372 (`git show 7340372:lessons.js`, the OPENINGS lines matched as a prefix: 10), so a lessons.js change that moves it reds here.
   {const pf=load('1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3 Nxe4 5. d4 d5 6. Bd3 Nc6 7. O-O Be7 8. c4 Nb4');
    const pl=OPENINGS.find(o=>/Petro/.test(o.name||''));
    L.say(pf.ok&&!!pl&&(pl.line||[]).length>=12&&pl.line.slice(0,12).join(' ')===pf.sans.slice(0,12).join(' '),'TC-R160 E5-0 PRECONDITION a Petroff game following 6.Bd3 Nc6 matches the Petroff lesson line for 12 plies ('+(pl?pl.name+', '+(pl.line||[]).length+' plies':'no Petroff in OPENINGS')+')');
    const got=E.openingBookPlies(pf.sans,pf.positions,OPENINGS,0);
    L.say(got===10,'TC-R160 E5 with the table off that Petroff game reads 10 Book plies, its count on main 7340372 before job 65 folded the 12-ply line in (got '+got+')');}
   L.say(tot===lp&&tot===19,'TC-R160 E3 with the table off (ct_book_table=0) the count is the lesson lines alone, the pre-#549 reading: '+tot+' over the seven (19 measured before)');}

  // ── F. THE BUNDLE: the 1.b3 game reviewed, Book read off the summary ────────────────────────────────
  // A CT_SRC run is a NODE control (a mutated chess.jsx); the bundle cannot reflect it, so block F is not run and says so.
  if(process.env.CT_SRC){L.note('block F NOT RUN: CT_SRC='+process.env.CT_SRC+' is a node control; the bundle under test does not carry it');}
  else {const pgn=fs.readFileSync(path.join(ROOT,'claude','agents','bench','pgn','174540842570.pgn'),'utf8');
   const b=await L.launch({geo:'kunal761',name:'book-b3',store:{ct_pool:'3',ct_book_table:'1'}});   // the switch on, as a phone that opts in has it
   await b.open();await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});await b.open();
   await b.tile('Review');await b.page.locator('textarea').first().fill(pgn);await b.tapText(/^⚡ Analyze Game$/,{wait:200});
   const up=await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000}).then(()=>true).catch(()=>false);await b.settle(700);
   L.say(up,'TC-R161 F0 PRECONDITION the review of 174540842570 reaches its summary');
   const book=up?await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return null;
     for(const g of s.querySelectorAll('div')){const bs=g.querySelectorAll('button');if(bs.length!==2)continue;const f=(g.firstElementChild&&g.firstElementChild.textContent||'').replace(/\s+/g,'').trim();
       if(f==='Book')return [...bs].map(x=>parseInt((x.textContent||'').trim(),10));}return null;}):null;
   L.say(!!book&&book[0]===2&&book[1]===2,'TC-R161 F1 the summary paints Book 2 for White and 2 for Black on the 1.b3 game with ct_book_table=1, chess.com\'s own count (painted '+JSON.stringify(book)+'; 0 and 0 before)');
   L.say(b.errs.length===0,'TC-R161 F2 zero app errors',b.errs.slice(0,2));
   await b.close();}
},'87-opening-book');
