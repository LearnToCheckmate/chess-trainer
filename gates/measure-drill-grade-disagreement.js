// gates/measure-drill-grade-disagreement.js - #549 item (106),
// jobs/drill-grading-uses-a-shallow-local-search-2026-10-01.
// REPORT-ONLY: not a gate, asserts nothing, changes nothing. It answers the job's one question with a number: how often
// does the mistakes drill's grader (gradeDrillMove: rankMoves at DRILL_RANK_DEPTH, the local search) name a different
// band from the review's own depth-16 verdict on the SAME move?
//
// TWO STEPS, so the expensive one runs once:
//   1. capture  CT_APP=<bundle> node gates/measure-drill-grade-disagreement.js capture <key.pgn> <cards.jsonl> [first N=30] [user=Kunal2023]
//      Drives the bundle's Review (headless Chromium, kunal761) over the first N games of the key IN FILE ORDER and, from
//      window.__ctReview (#549 item (55)), writes one line per drill card the review would capture: the user's plies whose
//      selection grade _S (analysis.sel, else classifyByLoss(loss)) is Mistake or Blunder and that carry a bestMove - the
//      capture rule of chess.jsx's importGame, reproduced from the same fields. Each line carries the card's FEN, the stored
//      move (uci + SAN), the move played, _S (the card's m.label), the review row's display label (cls.label) and which
//      engine graded the ply (sf when the entry carries altSan, the Stockfish path's field; fallback otherwise).
//      key.pgn is the tracker's docs/chesscom-reviewed-games-kunal2023-since-2026-09-01 field pgn. Never fetch chess.com.
//      Re-running resumes (games already in cards.jsonl are skipped).
//   2. grade    node gates/measure-drill-grade-disagreement.js grade <cards.jsonl> [depth]
//      Grades each card's PLAYED move with the shipped gradeDrillMove (gates/engine-extract.js reads chess.jsx; its md5 is
//      printed) and reports the disagreement rates. [depth] overrides DRILL_RANK_DEPTH for this comparison only, by
//      rebuilding the extract with that one constant replaced in a temporary copy of the source - the measurement of
//      direction (a), never a change to the app.
// The rule the job and the 2026-11-04 ruling set: more than 1 card in 10 disagreeing takes direction (a).
// MEASURED at #549 (7 Nov 2026), trial bundle md5 e2a2a4168362 from chess.jsx 4cda03df82c1 (run branch 2f4e07a), the first 30
// games of the key in file order, CT_POOL=2, every game graded by Stockfish: 132 cards. Per depth (rankMoves depth, minimax
// is one less), label != the review row's label / of the 92 cards the review row itself calls Mistake, Blunder or Miss, the
// drill ladder grades Excellent or better / node time per card median and max on this container:
//   depth 3 (shipped)  112/132 = 84.8%   39/92 = 42%   279ms   1.3s
//   depth 4            100/132 = 75.8%   27/92 = 29%   817ms   6.6s
//   depth 5            101/132 = 76.5%   25/92 = 27%   9.6s    69s
// So deepening the local search moves the rate a few points at many times the cost and never near 1 in 10.
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const [,,MODE,A1,A2,A3,A4]=process.argv;
if(MODE==='capture') capture(); else if(MODE==='grade') grade(); else {console.log('usage: capture <key.pgn> <cards.jsonl> [N] [user] | grade <cards.jsonl> [depth]');process.exit(2);}

function capture(){
  const L=require('./lib.js'),R=require('./drive/review.js');
  const KEY=A1,OUT=A2,N=parseInt(A3||'30',10),USER=(A4||'Kunal2023').toLowerCase();
  const games=fs.readFileSync(KEY,'utf8').split(/\n\n(?=\[)/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
  const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
  const done=new Set();try{for(const l of fs.readFileSync(OUT,'utf8').split('\n'))if(l.trim())done.add(JSON.parse(l).gi);}catch(e){}
  (async()=>{
    const b=await L.launch({geo:'kunal761',store:{ct_pool:process.env.CT_POOL||'2'}});
    await b.open();
    for(let gi=0;gi<Math.min(N,games.length);gi++){
      if(done.has(gi))continue;
      const g=games[gi],link=tag(g,'Link');
      const side=(tag(g,'White')||'').toLowerCase()===USER?'w':((tag(g,'Black')||'').toLowerCase()===USER?'b':null);
      const t0=Date.now();
      try{
        await R.importPgn(b,g,300000);
        const r=await b.page.evaluate(()=>{const v=window.__ctReview;if(!v)return null;
          return v.analysis.map((o,i)=>({i,pos:v.positions[i],move:v.plies[i]&&v.plies[i].move,sel:o.sel||null,loss:o.loss,cls:o.cls&&o.cls.label,
            bestSan:o.bestSan||null,bestMove:o.bestMove||null,sf:Object.prototype.hasOwnProperty.call(o,'altSan')}));});
        if(!r)throw new Error('no window.__ctReview');
        const row={gi,link,side,plies:r.length,engine:r.every(x=>x.sf)?'sf':(r.some(x=>x.sf)?'mixed':'fallback'),plyData:r.filter(x=>x.pos&&x.pos.turn===side),secs:Math.round((Date.now()-t0)/1000)};
        fs.appendFileSync(OUT,JSON.stringify(row)+'\n');
        console.log(`${gi} ${link} side ${side} plies ${r.length} engine ${row.engine} ${row.secs}s`);
      }catch(e){console.log('ERR',gi,link,String(e).slice(0,200));fs.appendFileSync(OUT,JSON.stringify({gi,link,err:String(e).slice(0,300)})+'\n');
        if(/has been closed/.test(String(e))){console.log('STOP: the browser is gone; re-run to resume');break;}try{await b.open();}catch(_){}}
    }
    await b.browser.close();
    L.done();
  })().catch(e=>{console.log('FATAL',e);process.exit(1);});
}

function grade(){
  const IN=A1,DEPTH=A2?parseInt(A2,10):null;
  if(DEPTH!=null){
    const src=fs.readFileSync(path.join(__dirname,'..','chess.jsx'),'utf8');
    const re=/^const DRILL_RANK_DEPTH=\d+;/m;
    if(!re.test(src)){console.log('cannot find "const DRILL_RANK_DEPTH=<n>;" in chess.jsx');process.exit(2);}
    const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ct106-')),'chess.jsx');
    fs.writeFileSync(tmp,src.replace(re,'const DRILL_RANK_DEPTH='+DEPTH+';'));
    process.env.CT_SRC=tmp;
  }
  const E=require('./engine-extract.js');
  const rows=fs.readFileSync(IN,'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  console.log('source',E.SRC_PATH,'md5',E.SOURCE_MD5,'DRILL_RANK_DEPTH',E.DRILL_RANK_DEPTH,'cards from',IN);
  const C={games:0,gamesErr:0,engines:{},cards:0,graded:0,ungraded:0,vsSel:0,vsCls:0,acceptWrong:0,untrustedSol:0,solOk:0,solOkAccept:0,bandClash:0,ms:0,maxMs:0};
  const per=[];
  for(const g of rows){
    if(g.err){C.gamesErr++;continue;}
    C.games++;C.engines[g.engine]=(C.engines[g.engine]||0)+1;
    for(const p of g.plyData){
      const S=p.sel||E.classifyByLoss(p.loss||0);
      if(!(S==='Mistake'||S==='Blunder')||!p.bestMove)continue;
      C.cards++;
      // the card as importGame stores it and puzzleFromMistake rebuilds it: FEN, uci of the stored move, the move played
      const fen=E.toFEN(p.pos),pos=E.fromFEN(fen);
      const bm=p.bestMove,uci=E.rc2sq(bm.fr,bm.fc)+E.rc2sq(bm.tr,bm.tc)+(bm.promo||'');
      const solMv=E.uciToMove(pos,uci);const sol=solMv?E.cleanSAN(E.toSAN(pos,solMv,E.applyMove(pos.board,solMv))):null;
      const mv=p.move,played=E.cleanSAN(E.toSAN(pos,mv,E.applyMove(pos.board,mv)));
      const pm=E.getLegal(pos).find(m=>m.fr===mv.fr&&m.fc===mv.fc&&m.tr===mv.tr&&m.tc===mv.tc&&(m.promo||'')===(mv.promo||''));
      const t0=Date.now();
      const gr=pm&&sol?E.gradeDrillMove(pos,pm,sol,played):null;
      const ms=Date.now()-t0;C.ms+=ms;if(ms>C.maxMs)C.maxMs=ms;
      if(!gr){C.ungraded++;per.push({gi:g.gi,ply:p.i,played,sol,S,cls:p.cls,label:null});continue;}
      C.graded++;
      const dSel=gr.label!==S, dCls=gr.label!==p.cls;
      if(dSel)C.vsSel++; if(dCls)C.vsCls++;
      if(gr.accept)C.acceptWrong++;                       // the drill's ladder would ACCEPT a move the review captured as a mistake
      if(!(gr.solLabel&&E.DRILL_ACCEPT.includes(gr.solLabel)))C.untrustedSol++;   // the shallow search does not rate the stored move Excellent+
      else{C.solOk++;if(gr.accept)C.solOkAccept++;}    // the trust check passes on this position, so the drill WOULD act on a grade of
                                                       // any move other than the game's own; the played move stands in for such a move
      const bad=l=>l==='Mistake'||l==='Blunder'||l==='Miss';
      if(!bad(gr.label))C.bandClash++;                    // not even in the bad bands: the #385-family disagreement the job names
      per.push({gi:g.gi,ply:p.i,played,sol,S,cls:p.cls,label:gr.label,solLabel:gr.solLabel,loss:gr.loss,accept:gr.accept,trusted:gr.trusted,ms});
    }
  }
  for(const x of per)console.log(JSON.stringify(x));
  const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'n/a';
  console.log(`SUMMARY games ${C.games} (errors ${C.gamesErr}) engines ${JSON.stringify(C.engines)} cards ${C.cards} graded ${C.graded} ungraded ${C.ungraded}`);
  console.log(`SUMMARY label != card m.label (_S): ${C.vsSel}/${C.graded} = ${pct(C.vsSel,C.graded)}`);
  console.log(`SUMMARY label != review row label (cls): ${C.vsCls}/${C.graded} = ${pct(C.vsCls,C.graded)}`);
  console.log(`SUMMARY label outside Mistake/Blunder/Miss (the review called it bad, the drill does not): ${C.bandClash}/${C.graded} = ${pct(C.bandClash,C.graded)}`);
  console.log(`SUMMARY drill ladder would accept the played move (Excellent+): ${C.acceptWrong}/${C.graded} = ${pct(C.acceptWrong,C.graded)}`);
  console.log(`SUMMARY trust check fails (stored move not Excellent+ at this depth): ${C.untrustedSol}/${C.graded} = ${pct(C.untrustedSol,C.graded)}`);
  console.log(`SUMMARY where the trust check passes, the played move (a depth-16 Mistake/Blunder) is graded Excellent+ anyway: ${C.solOkAccept}/${C.solOk} = ${pct(C.solOkAccept,C.solOk)}`);
  console.log(`SUMMARY grading time: total ${C.ms}ms, mean ${C.graded?Math.round(C.ms/C.graded):0}ms, max ${C.maxMs}ms per card (node, this container)`);
}
