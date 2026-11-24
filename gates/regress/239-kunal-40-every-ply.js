'use strict';
// gates/regress/239-kunal-40-every-ply.js - THE REVIEW'S CONTENT HOLDS ON EVERY PLY OF FORTY OF HIS OWN GAMES. US-R246 / TC-R420..424.
//
// WHY [#553 B3, jobs/widen-the-input-space Part 1 and Part 2 (corpusChoice: settled 18 Sep, docs/fixtures-kunal-40)]: the review lane was
// tested against one game, the Opera Game, so a defect that lives only where the played move is the engine's SECOND choice (#420, the
// alternative that named the played move) was green on every build until Kunal found it on his phone. This gate runs PROPERTIES, not spot
// assertions, over every ply of every game in gates/fixtures/kunal/kunal-40.pgn: 40 games, 2405 plies, his own play (754-rated blitz).
// HOW IT STAYS CHEAP: the engine output for the corpus is RECORDED (gates/fixtures/kunal/kunal-40-evals.json, written by
// gates/record-kunal-40-evals.js: the app's own review-cache entries, evW/ev2W/bU/aU) and seeded back before each import, so the app takes its
// cache path. GRADING, THE TALLIES AND THE REVIEW'S DATA ARE COMPUTED LIVE IN THE BUNDLE UNDER TEST (CT_APP); only the Stockfish search is
// frozen. The sentences are the shipped reviewText (chess.jsx through gates/engine-extract.js) over the bundle's own analysis, with the
// ctx the move screen passes it (chess.jsx, the reviewText call beside sacRef) at 375 wide (maxw 150). KNOW ITS LIMIT: a change to the engine
// or to the cache key is not seen until the fixture is re-recorded, and the refutation search a Brilliant waits for is not run (refute null).
//  TC-R420 the seam: gates/lib.js readReview returns every game's review (analysis as long as the plies) and every game took the cache path.
//  TC-R421 (C1) no ply offers the played move as its own alternative - neither the data (altSan, bestSan) nor the sentence's comparison.
//  TC-R422 (C2) every move the review names as another try (bestSan, altSan) is a legal move in the position before the ply, and every
//          numbered move a sentence quotes ('12.Nxe5', '12…Qa5') is legal in the game position that number and side name, or on the
//          engine's line from it.
//  TC-R423 (C3) the standing clause ('White is winning', 'Black is clearly better', ...) never disagrees in category with the RECORDED engine
//          evaluation after the move (the fixture's evW, White-side centipawns: the input, not another output of the sentence builder).
//  TC-R424 (C4) each side's grade counts on the summary sum to the number of moves that side played.
// Every property prints its denominator in its own line (CLAUDE.md: before asserting a property of a collection, assert it is non-empty).
// THE CORPUS IS 39 OF 40: game 29 (174055211202, 103 plies) never reaches its review summary - it stalls at 'Analyzing move 68 of 103'
// with no app error, at pool 3 and pool 1 (measured 24 Nov 2026). That is a PRODUCT finding, reported, not a denominator: the fixture names it
// under `unrecorded` and the first TC-R420 line holds that list exact, so a second game that cannot be reviewed reddens here.
// TC-R424 AND FORCED: a move with one legal choice is graded Forced and is left out of the ten totals BY DESIGN (GRADE_LADDER, #550 item
// (20)); the first run here counted 18 of 78 sides short by exactly their Forced moves (31 in all). So the sum is held to the moves played
// LESS the moves that had one legal move, counted from the rules - not from the analysis's own Forced label.
// TC-R422'S POSITIONS ARE MEASURED, NOT GUESSED: the first run, which accepted a quoted move only in the game position its number names,
// reported 34 illegal moves, and every one was a hypothetical the sentence states plainly ('It threatens 4.Qxf7 mate', 'It stops 5.Qxf7
// mate', 'White could play 27.Rad1, and taking it with ...Qxd1 loses Black's queen to 28.Qxd1', 'Black plays ...Bg4, threatening ...Be2').
// So a quoted move may also be legal before the ply, after it, as a threat (the same side again) or stopped threat, or on a line that
// continues a quoted move - and in each it must carry the number and side that position has.
// ON THE REAL TREE: 13 pass, 0 fail on trial 3b7d2a2cc4bb (chess.jsx fdc6353e3c7f, branch at d6e7af51 on 5ae809ee), 24 Nov 2026, 4 min 17 s
// (the 39 imports 122 s, the sentences about 2 min in node) - one run alone, under the lead's 15-minute line.
// CONTROL-RECORD: d6e7af51 2026-11-24 total=13 red=6 scope=trial:b116fa772958 how=#553 B3 K0 the seam removed (all three window.__ctReview writes in chess.jsx): TC-R420 PRECONDITION 'readReview null: the seam is absent' at 0 of 39, the cache-path line and every DENOMINATOR red; the four property lines PASS over nothing, which is why each has its own denominator
// CONTROL-RECORD: d6e7af51 2026-11-24 total=13 red=1 scope=trial:ae0822380442 how=#553 B3 K1 the #420 guard removed from sfGradePly's altSan (the engine's runner-up may be the played move): TC-R421 red at 450 plies of the corpus ('2...Nc6 altSan Nc6', '5.c3 altSan c3', ...) - the Opera Game has none
// CONTROL-RECORD: d6e7af51 2026-11-24 total=13 red=1 scope=env:CT_G239_FROM=g239dump2.json how=(CT_SRC the K2 chess.jsx, md5 b8ffe9e533c2) #553 B3 K2 a slip's better move quoted under the next move number (rtN num+1 in reviewText): TC-R422 red, 38 of 4782 (the rest stay legal under a later number, so the line is a floor, not a census). Node half alone: the break touches only the sentence, which this gate reads from CT_SRC
// CONTROL-RECORD: d6e7af51 2026-11-24 total=13 red=1 scope=env:CT_G239_FROM=g239dump2.json how=(CT_SRC the K3 chess.jsx, md5 9a4eacbe8019) #553 B3 K3 rtStand names the wrong side: TC-R423 red at 1604 of 1687 standing clauses. Node half alone, for K2's reason
// CONTROL-RECORD: d6e7af51 2026-11-24 total=13 red=1 scope=trial:171bfd424d60 how=#553 B3 K4 the summary's _sideStats drops Excellent from the counts (the missing Excellent row the job's brief names for C4): TC-R424 red at 78 of 78 sides
// CT_G239_GAMES=n runs the first n games only and SAYS so (controls); gates.sh never sets it. CT_G239_DUMP=<file> writes the reviews read.
const L=require('../lib');const RV=require('../drive/review');const E=require('../engine-extract');
const fs=require('fs'),path=require('path');
const FX=path.join(__dirname,'..','fixtures','kunal');
const PGN=fs.readFileSync(path.join(FX,'kunal-40.pgn'),'utf8');
const REC=JSON.parse(fs.readFileSync(path.join(FX,'kunal-40-evals.json'),'utf8'));
const GAMES=PGN.split(/(?=\[Event )/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
const NG=process.env.CT_G239_GAMES?Math.min(GAMES.length,parseInt(process.env.CT_G239_GAMES,10)):GAMES.length;
const cs=(s)=>E.cleanSAN(String(s||''));
const _LS=new Map();const legalSans=(pos)=>{let k;try{k=E.toFEN(pos);}catch(e){k=null;}if(k&&_LS.has(k))return _LS.get(k);let r;try{r=new Set(E.getLegal(pos).map(m=>cs(E.toSAN(pos,m,E.applyMove(pos.board,m)))));}catch(e){r=new Set();}if(k)_LS.set(k,r);return r;};
// EVERY template reviewText can print that names ANOTHER move than the one played, read from all its branches (chess.jsx): the four of
// dropTxt (the alternative, on a Brilliant's 'more'), the Good rung's 'X was a little stronger.', and a slip's 'X was better: ...',
// 'X was the steadier move.' and 'Better for them was X' (the engine's best move). Each names one move, which must not be the played one.
const OTHER=[/([^\s:]+), the next best, throws the win away\./g,/Nothing else came close: ([^\s:]+) was [\d.]+ pawns worse\./g,/([^\s:]+) was the only other try, [\d.]+ worse\./g,/([^\s:]+) was as good on paper, but nothing like as forcing\./g,
  /([^\s:]+) was a little stronger\./g,/([^\s:]+) was better: /g,/([^\s:]+) was the steadier move\./g,/Better for them was ([^\s:.]+)/g];
const stripNo=(t)=>String(t).replace(/^(?:\d+)?(?:\.\.\.|…|\.)/,'');
// a move as reviewText quotes one (rtN, rtRun): '12.Nxe5' (White), '12...Qa5' or '12…Qa5' (Black), '...Qa5' (Black, the very next move,
// no number). rtSay drops the + and #. A bare White move with no number is not parsed: it cannot be told from prose.
const QUOTED=/(?:^|[\s(“"'])(\d+)?(\.\.\.|…|\.)((?:O-O(?:-O)?)|(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8])|(?:[a-h](?:x[a-h])?[1-8](?:=[QRBN])?))(?![\w])/g;
// THE POSITIONS A QUOTED MOVE MAY LIVE IN, each with the ply index its number and side must agree with. Measured over the corpus (#553):
// a sentence quotes the game's own moves, the move before the ply (the alternative, 'X was the steadier move'), the reply after it ('White
// could play X'), a THREAT ('It threatens X', the mover's next move as if the opponent passed: the position after the ply, the mover to
// move), a threat STOPPED ('It stops X', the opponent's move as if the mover passed), and a LINE that continues one of those ('and taking
// it with ...Y loses the queen to Z'): each quoted move that is legal starts a chain the next quoted move may continue.
const flip=(P)=>P?Object.assign({},P,{turn:P.turn==='w'?'b':'w',ep:null}):null;
const noOf=(rv,idx)=>Math.floor((E.revBase(rv)+idx)/2)+1;
function quotedLegal(rv,ai,txt){   // -> {n, bad:[...]}
  const P=rv.positions,cands=[[P[ai],ai],[P[ai+1],ai+1],[flip(P[ai+1]),ai+2],[flip(P[ai]),ai+1]].filter(c=>c[0]);
  let chain=[];const bad=[];let n=0;QUOTED.lastIndex=0;let q;
  while((q=QUOTED.exec(txt))){const num=q[1]?+q[1]:null,side=q[2]==='.'?'w':'b',san=cs(q[3]);
    if(!num&&side==='w')continue;   // a lone '.' before a move is a sentence end, not a quote
    n++;const k=num?((num-1)*2+(side==='b'?1:0)-E.revBase(rv)):null;
    const all=cands.concat(chain).concat(k!=null&&P[k]?[[P[k],k]]:[]);
    const fit=all.filter(([pos,idx])=>pos.turn===side&&(num==null||noOf(rv,idx)===num)&&legalSans(pos).has(san));
    if(!fit.length){bad.push({quoted:q[0].trim(),at:k,said:txt.slice(Math.max(0,q.index-40),q.index+40)});chain=[];continue;}
    chain=[];for(const [pos,idx] of fit){try{const mv=E.getLegal(pos).find(m=>cs(E.toSAN(pos,m,E.applyMove(pos.board,m)))===san);if(mv){const nx=E.makeMove(pos,mv);chain.push([nx,idx+1],[flip(nx),idx+2]);}}catch(e){}}}   // the line goes on, or the quoted move THREATENS the next one (the same side again)
  return {n,bad};}
const STAND=/(?:^|\. )(?:(White|Black) is (winning|clearly better|a little better)|(The game is about even))\./;
const cat=(t)=>{const m=STAND.exec(t||'');if(!m)return null;if(m[3])return {side:0,k:'even'};return {side:m[1]==='White'?1:-1,k:m[2]==='winning'?'winning':m[2]==='clearly better'?'clear':'little'};};
// gate 234's category rule (the bar there, the recorded engine number here), in pawns, White's side; a mate is 99
function disagree(c,v){if(!c||v==null)return null;const a=Math.abs(v);
  if(c.k==='even')return a>=1.5?'about even beside '+v:null;
  if(c.side*v<=-0.5)return 'one side better beside an engine '+v+' the other way';
  if(c.k==='winning'&&a<0.5)return 'winning beside a level engine '+v;
  return null;}
const cpToPawns=(cp)=>cp==null?null:(Math.abs(cp)>=90000?(cp>0?99:-99):cp/100);

function sentences(rv){   // the shipped reviewText at every ply, with the move screen's ctx
  const out=[];
  for(let ai=0;ai<rv.analysis.length;ai++){const a=rv.analysis[ai];if(!a){out.push(null);continue;}
    const book=(rv.summary&&rv.summary.book)||0;const cls=E.effCls(a.cls,ai,book);
    const pos=rv.positions&&rv.positions[ai],pl=rv.plies[ai];const _L=a.cls&&a.cls.label;
    const refuteDue=(_L==='Brilliant'||_L==='Great')&&!!(pos&&pl&&pl.move&&E.sacTaker(pos,pl.move));
    let r=null;try{r=E.reviewText(a,{mover:E.revMover(rv,ai)==='w'?'White':'Black',label:(cls&&cls.label)||null,moveNo:Math.floor((E.revBase(rv)+ai)/2)+1,opening:rv.openingName||null,
      userColor:(rv.summary&&rv.summary.userColor)||(rv.meta&&rv.meta.userColor)||null,pos,ply:pl,
      prev:(ai>0&&rv.plies[ai-1]&&rv.positions)?{move:rv.plies[ai-1].move,pos:rv.positions[ai-1],chain:E.revChain(rv,ai-1)}:null,
      next:rv.analysis[ai+1],nextPly:rv.plies[ai+1],nextPos:rv.positions&&rv.positions[ai+1],refute:null,refuteDue,maxw:150});}catch(e){r={err:String(e).slice(0,160)};}
    out.push(r);}
  return out;}

L.run(async()=>{
  console.log('     source: '+E.SRC_PATH+'  md5 '+E.SOURCE_MD5+'   fixture recorded on '+JSON.stringify(REC.recordedOn||null));
  if(NG<GAMES.length)L.note('CT_G239_GAMES='+NG+': the first '+NG+' of '+GAMES.length+' games only - a control or a probe, never the suite');
  const FROM=process.env.CT_G239_FROM;   // a dump of a previous run: the node half alone, no browser - a probe, never the suite, and SAID
  if(FROM)L.note('CT_G239_FROM='+FROM+': the reviews are READ FROM A DUMP, not from the bundle - the sentence and count lines only, never the suite');
  const b=FROM?null:await L.launch({geo:'kunal761',name:'g239',store:{ct_pool:'3'}});if(b)await b.open();
  const got=FROM?JSON.parse(fs.readFileSync(FROM,'utf8')).filter(x=>x.gi<NG):[];const t0=Date.now();
  for(let gi=0;gi<NG&&!FROM;gi++){const g=GAMES[gi],link=tag(g,'Link'),fx=REC.games[link];
    if(!fx){if(!(REC.unrecorded||{})[link])got.push({gi,link,err:'no recorded entry'});continue;}
    try{
      await b.page.evaluate(([k,e])=>{localStorage.setItem('ct_evalcache',JSON.stringify({[k]:Object.assign({},e,{at:Date.now()})}));},[fx.key,fx.entry]);
      await RV.importPgn(b,g,120000);
      const rv=await L.readReview(b.page);got.push({gi,link,fx,rv});
    }catch(e){got.push({gi,link,fx,err:String(e).slice(0,200)});if(/has been closed/.test(String(e)))break;}
  }
  const secs=Math.round((Date.now()-t0)/1000);
  const errs=b?b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)):[];
  if(b)await b.close();
  if(process.env.CT_G239_DUMP)fs.writeFileSync(process.env.CT_G239_DUMP,JSON.stringify(got));
  const UNREC=Object.keys(REC.unrecorded||{}),inRange=GAMES.slice(0,NG).map(g=>tag(g,'Link'));
  const missing=inRange.filter(l=>!REC.games[l]),expectN=inRange.length-missing.length;
  // THE GAMES THE FIXTURE COULD NOT RECORD ARE A FINDING, NOT A DENOMINATOR: the list is held exact, so one more stuck review reddens here
  L.say(missing.length===UNREC.filter(l=>inRange.includes(l)).length&&missing.every(l=>UNREC.includes(l)),'TC-R420 the corpus games with no recorded review are exactly the fixture\'s named unrecorded list ('+missing.length+': '+UNREC.map(l=>'game '+REC.unrecorded[l].gi+', '+REC.unrecorded[l].why.slice(0,70)).join('; ')+')',{missing,UNREC});
  const ok=got.filter(x=>x.rv&&!x.rv.unreadable&&Array.isArray(x.rv.analysis)&&x.rv.analysis.length===x.rv.plies.length&&x.rv.plies.length===x.fx.plies);
  const cachePath=ok.filter(x=>x.rv.engine&&x.rv.engine.path==='cache');
  const plies=ok.reduce((s,x)=>s+x.rv.plies.length,0);
  L.say(ok.length===expectN&&expectN>0,'TC-R420 PRECONDITION gates/lib.js readReview returned the review of every recorded game, analysis as long as its plies ('+ok.length+' of '+expectN+', '+plies+' plies, '+secs+' s)',got.filter(x=>!ok.includes(x)).slice(0,3).map(x=>({gi:x.gi,err:x.err||(x.rv===null?'readReview null: the seam is absent':(x.rv&&x.rv.unreadable)||'lengths differ')})));
  L.say(cachePath.length===ok.length&&ok.length>0,'TC-R420 every review took the cache path, so the recorded engine output is what was graded ('+cachePath.length+' of '+ok.length+')',ok.filter(x=>!cachePath.includes(x)).slice(0,3).map(x=>({gi:x.gi,path:x.rv.engine&&x.rv.engine.path})));

  // ---- C1 ----
  let c1Alt=0,c1Drop=0;const c1Bad=[];
  // ---- C2 ----
  let c2Named=0,c2Quoted=0;const c2Bad=[];
  // ---- C3 ----
  let c3With=0;const c3Bad=[];const c3Kinds=new Set();
  // ---- C4 ----
  const c4Bad=[];let c4Sides=0,c4Only=0;
  for(const x of ok){const rv=x.rv,S=sentences(rv),evW=x.fx.entry.evW;
    for(let ai=0;ai<rv.analysis.length;ai++){const a=rv.analysis[ai],pl=rv.plies[ai],pos=rv.positions[ai];if(!a||!pl)continue;
      const played=cs(pl.san),noTxt=Math.floor((E.revBase(rv)+ai)/2)+1+(E.revMover(rv,ai)==='w'?'.':'…');
      const s=S[ai];const txt=s&&!s.err?((s.line||'')+' '+(s.more||'')):'';
      if(s&&s.err)c1Bad.push({gi:x.gi,ply:ai+1,err:s.err});
      // C1: the data
      for(const k of ['altSan','bestSan'])if(a[k]){c1Alt++;if(cs(a[k])===played)c1Bad.push({gi:x.gi,ply:noTxt+pl.san,field:k,val:a[k]});}
      // C1: the sentence's comparison names a move other than the one played
      for(const re of OTHER){re.lastIndex=0;let m;while((m=re.exec(txt))){c1Drop++;if(cs(stripNo(m[1]))===played)c1Bad.push({gi:x.gi,ply:noTxt+pl.san,said:m[0].slice(0,80)});}}
      // C2: the data's other tries are legal before the ply
      const L0=legalSans(pos);
      for(const k of ['altSan','bestSan'])if(a[k]){c2Named++;if(!L0.has(cs(a[k])))c2Bad.push({gi:x.gi,ply:noTxt+pl.san,field:k,val:a[k]});}
      // C2: every move a sentence quotes is legal in a position the sentence can be talking about, under the number and side it prints
      {const r=quotedLegal(rv,ai,txt);c2Quoted+=r.n;for(const z of r.bad)c2Bad.push(Object.assign({gi:x.gi,ply:noTxt+pl.san},z));}
      // C3: the standing clause against the recorded engine number after the move
      const c=cat(txt);if(c){c3With++;c3Kinds.add(c.k);const v=cpToPawns(evW[ai+1]);const why=disagree(c,v);if(why)c3Bad.push({gi:x.gi,ply:noTxt+pl.san,why,said:txt.slice(0,90)});}
    }
    // C4: each side's counts sum to the moves it played
    const sum=rv.summary||{};
    for(const side of ['w','b']){const co=sum[side]&&sum[side].counts;const idx=rv.plies.map((p,i)=>i).filter(i=>E.revMover(rv,i)===side);
      // a move with ONE legal choice is Forced and stays out of the ten totals (GRADE_LADDER, #550 item (20): chess.com leaves it out too).
      // Counted from the POSITION (the rules), not from the analysis's own Forced label, so the sum is checked against the game.
      const only=idx.filter(i=>{try{return E.getLegal(rv.positions[i]).length===1;}catch(e){return false;}}).length;c4Only+=only;const moves=idx.length-only;
      if(!co){c4Bad.push({gi:x.gi,side,why:'no counts'});continue;}c4Sides++;
      const tot=Object.values(co).reduce((s,v)=>s+(+v||0),0);if(tot!==moves)c4Bad.push({gi:x.gi,side,tot,movesLessOnly:moves,counts:co});}
  }
  L.say(c1Alt>=2700&&c1Drop>=600,'TC-R421 DENOMINATOR the data names '+c1Alt+' other tries (altSan, bestSan) and the sentences print '+c1Drop+' comparisons',{c1Alt,c1Drop});
  L.say(c1Bad.length===0,'TC-R421 (C1) no ply of '+plies+' offers the played move as its own alternative, in the data or in the sentence ('+c1Bad.length+')',c1Bad.slice(0,4));
  L.say(c2Named>=2700&&c2Quoted>=1100,'TC-R422 DENOMINATOR '+c2Named+' named other tries and '+c2Quoted+' numbered moves quoted in the sentences',{c2Named,c2Quoted});
  L.say(c2Bad.length===0,'TC-R422 (C2) every move named is legal where it is named ('+c2Bad.length+' of '+(c2Named+c2Quoted)+' are not)',c2Bad.slice(0,4));
  L.say(c3With>=1350&&c3Kinds.has('winning')&&(c3Kinds.has('clear')||c3Kinds.has('little')),'TC-R423 DENOMINATOR '+c3With+' plies carry a standing clause ('+[...c3Kinds].join(', ')+')',{c3With});
  L.say(c3Bad.length===0,'TC-R423 (C3) the standing clause never disagrees in category with the recorded engine number after the move ('+c3Bad.length+' of '+c3With+')',c3Bad.slice(0,4));
  L.say(c4Sides===2*ok.length&&c4Sides>0&&c4Only>=20,'TC-R424 DENOMINATOR every review carries both sides\' grade counts ('+c4Sides+' of '+2*ok.length+'), and '+c4Only+' moves had one legal choice (out of the totals by design)',{c4Sides,c4Only});
  L.say(c4Bad.length===0,'TC-R424 (C4) each side\'s grade counts sum to the moves it played ('+c4Bad.length+' of '+c4Sides+' sides do not)',c4Bad.slice(0,3));
  L.say(errs.length===0,'TC-R420 no app error beyond the allowed engine trap',errs.slice(0,3));
},'239-kunal-40-every-ply');
