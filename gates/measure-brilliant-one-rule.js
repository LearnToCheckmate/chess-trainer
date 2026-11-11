// gates/measure-brilliant-one-rule.js  -  #549 item (28)
// jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03, secondPassPlan_549 step (5).
//
// WHAT IT MEASURES. Every ply of every PGN in a directory, graded twice by the SHIPPED brilliantGate read out of
// chess.jsx (gates/engine-extract.js, so the thing measured IS the thing that ships): once under the rule this
// build replaces (its `ok` expression, reproduced from the fields the gate returns - see OLD below) and once
// under the one rule. The evaluations come from THE APP'S OWN ENGINE: stockfish-18-lite-single.js / .wasm at
// the repository root, the files the browser loads, run here under Node with the review's own options
// (MultiPV 2, Hash 16, `go depth 16`, UCI_LimitStrength false) and the review's own conversion of a score into
// White-frame centipawns (chess.jsx `_store`: mate n -> +/-(100000-100n), a checkmated side to move -> -/+99950).
//
// WHAT IS NOT THE SAME AS THE APP, said plainly. (1) The review clears the hash on a fixed cadence of four
// positions and warms it on the three between; this harness sends `ucinewgame` before EVERY position it searches,
// so a reading here can differ from a phone's in the last centipawn. (2) It searches only the plies that CAN be
// Brilliant: a ply whose sacrifice term is under 2 fails condition 2 on the board alone, under both rules, so its
// evaluation cannot change either verdict and it is not searched. That is a property of the gate (sac is
// computed from the board, never from an eval) and the harness prints how many plies it skipped that way.
//
// OUTPUT. One line per searched ply with both verdicts and every number the gate read, then the lists Kunal asked
// to see before this ships: the Brilliants the new rule ADDS and the ones it TAKES AWAY, game by game.
//
// USAGE:  node gates/measure-brilliant-one-rule.js <pgn-dir> [out.json]     (CT_SRC=<chess.jsx> to measure another source)
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require('./engine-extract');
const ROOT=path.join(__dirname,'..');
const SF=path.join(ROOT,'stockfish-18-lite-single.js');
const DEPTH=+(process.env.CT_DEPTH||16);

function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});
  let buf='',waiter=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const line=buf.slice(0,k).trim();buf=buf.slice(k+1);if(waiter)waiter(line);}});
  const send=s=>p.stdin.write(s+'\n');
  const until=(pred)=>new Promise(res=>{waiter=(l)=>{if(pred(l)){waiter=null;res(l);}};});
  return {
    async init(){send('uci');await until(l=>l==='uciok');send('setoption name MultiPV value 2');send('setoption name Hash value 16');send('setoption name UCI_LimitStrength value false');send('isready');await until(l=>l==='readyok');},
    // the review's own parse (chess.jsx sfEvalOn): multipv 1 and 2 scores from the side to move, turned to White's frame
    eval(fen){return new Promise(res=>{
      const sign=fen.split(' ')[1]==='w'?1:-1;let cpv=null,mate=null,cp2=null,mate2=null,alt=null;
      waiter=(l)=>{
        if(l.startsWith('info ')&&/ score /.test(l)){
          const mpv=+((/ multipv (\d+)/.exec(l)||[])[1]||1);const m=/ score (cp|mate) (-?\d+)/.exec(l);if(!m)return;
          const v=+m[2],first=(/ pv (\S+)/.exec(l)||[])[1];
          if(mpv===1){if(m[1]==='mate'){mate=E.mateW(v,sign);cpv=null;}else{cpv=sign*v;mate=null;}}
          else if(mpv===2){if(m[1]==='mate'){mate2=E.mateW(v,sign);cp2=null;}else{cp2=sign*v;mate2=null;}if(first)alt=first;}
        }else if(l.startsWith('bestmove')){waiter=null;const bm=l.split(/\s+/)[1];res({cp:cpv,mate,cp2,mate2,alt,bestmove:bm&&bm!=='(none)'?bm:null});}
      };
      send('ucinewgame');send('position fen '+fen);send('go depth '+DEPTH);
    });},
    quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}
  };
}
// chess.jsx _store, verbatim in effect
function toW(pos,r){
  let cpW;
  if(!r)cpW=Math.round(E.evalPawns(pos)*100);
  else if(r.mate!=null)cpW=r.mate>0?(100000-r.mate*100):(-100000-r.mate*100);
  else cpW=(r.cp==null?Math.round(E.evalPawns(pos)*100):r.cp);
  try{if(E.getStatus(pos)==='checkmate')cpW=(pos.turn==='w')?-99950:99950;}catch(e){}
  let cp2W=null;if(r){if(r.mate2!=null)cp2W=r.mate2>0?(100000-r.mate2*100):(-100000-r.mate2*100);else if(r.cp2!=null)cp2W=r.cp2;}
  return {cpW,cp2W,bm:r?r.bestmove:null};
}
const uciIs=(pl,u)=>!!u&&u.slice(0,2)===E.rc2sq(pl.fr,pl.fc)&&u.slice(2,4)===E.rc2sq(pl.tr,pl.tc);
// THE RULE THIS BUILD REPLACES, from the fields the gate still returns: cap and isSac are unchanged, and the three eval
// conditions are the pre-#549 expression (with isSac read off sacLand, the landing arm) `loss<cap && isSac && evAfter>=0.8 && evBefore>-1.0 && evBefore<4.5`.
// The old sacrifice term was the landing arm alone, which the gate returns as sacLand, and the old cap read that isSac.
const OLD=(g)=>{const s=g.sacLand>=2,cap=(s&&g.evAfter>=1.2)?220:90;return g.loss<cap&&s&&g.evAfter>=0.8&&g.evBefore>-1.0&&g.evBefore<4.5;};
const why=(g)=>{const w=[];if(!(g.loss<g.cap))w.push('loss '+g.loss+'>=cap '+g.cap);if(!g.isSac)w.push('sac '+g.sac+'<2');if(!(g.evAfter>=E.BRIL_FLOOR))w.push('after '+g.evAfter+'<'+E.BRIL_FLOOR);if(!g.needed)w.push('next best '+g.evNext+'>='+E.BRIL_NEEDED);return w.join(', ')||'-';};

// --cache <pgn> <out.json>: one game's engine output in the shape importGame stores in ct_evalcache ({evW,ev2W,bU,aU}), every
// position searched, so a gate can seed a stored review exactly as the app would have written it.
async function cacheOne(pgnFile,outFile){
  const res=E.loadSANs(E.parsePGN(fs.readFileSync(pgnFile,'utf8')));const N=res.plies.length;
  const evW=new Array(N+1),ev2W=new Array(N+1),bU=new Array(N),aU=new Array(N);
  const eng=engine();await eng.init();
  for(let i=0;i<=N;i++){const p=res.positions[i];const st=E.getStatus(p);const r=(st==='checkmate'||st==='stalemate')?null:await eng.eval(E.toFEN(p));
    const w=toW(p,r);evW[i]=w.cpW;ev2W[i]=w.cp2W;if(i<N){bU[i]=w.bm;aU[i]=r?r.alt:null;}}
  eng.quit();
  fs.writeFileSync(outFile,JSON.stringify({evW,ev2W,bU,aU}));
  console.log('# cache written',outFile,'plies',N,'| chess.jsx md5',E.SOURCE_MD5,'depth',DEPTH);
}
// --missed <pgn-dir> <out.json> [player]: #549 item (29), jobs/show-where-a-brilliant-move-was-available-and-the-player-did-not-play-it-2026-10-11.
// The list its close condition asks for: every MISSED BRILLIANT the review would mark across a set of games - at a move of the player's
// (header name, default Kunal2023, case-insensitive) where the engine's best move graded as if played (chess.jsx missedBrilliant, the
// SHIPPED function, read through engine-extract) is Brilliant and the player played something else - under rule 1 (what the app grades
// by today) and rule 2 (the one rule, behind ct_bril_rule). One search per position of the player's (the position's own eval, its second
// line and best move: exactly ct_evalcache's evW[i], ev2W[i], bU[i]), CT_JOBS engines in parallel (default 2). NOT EXCLUDED, said
// plainly: the opening-book plies the review leaves unmarked (the book is read from lessons.js, which this harness does not load), so
// a chance inside the book would be listed here and not marked in the app.
async function missedList(dir,out,player){
  player=(player||'Kunal2023').toLowerCase();
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.pgn')).sort();
  const jobs=[];
  for(const f of files){
    const pgn=fs.readFileSync(path.join(dir,f),'utf8');const gid=f.replace(/\.pgn$/,'');
    const hW=(/\[White "([^"]*)"/.exec(pgn)||[])[1]||'',hB=(/\[Black "([^"]*)"/.exec(pgn)||[])[1]||'';
    const uc=hW.toLowerCase()===player?'w':hB.toLowerCase()===player?'b':null;if(!uc)continue;
    const res=E.loadSANs(E.parsePGN(pgn));if(!res||!res.plies.length)continue;
    for(let i=0;i<res.plies.length;i++){const pos=res.positions[i];if(pos.turn!==uc)continue;jobs.push({gid,hW,hB,i,pos,pl:res.plies[i].move,san:res.plies[i].san});}
  }
  const K=Math.max(1,+(process.env.CT_JOBS||2));
  console.log('# MISSED BRILLIANT LIST - #549 item (29) | chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| depth',DEPTH,'engines',K,'| player',player,'| games',files.length,'positions',jobs.length);
  const rows=[];let k=0,done=0;const t0=Date.now();
  const worker=async()=>{const eng=engine();await eng.init();
    while(k<jobs.length){const j=jobs[k++];
      const st=E.getStatus(j.pos);if(st==='checkmate'||st==='stalemate'){done++;continue;}
      const w=toW(j.pos,await eng.eval(E.toFEN(j.pos)));done++;
      if(done%200===0)process.stderr.write(done+'/'+jobs.length+' '+Math.round((Date.now()-t0)/1000)+'s\n');
      if(!w.bm||uciIs(j.pl,w.bm))continue;
      const bm=E.uciToMove(j.pos,w.bm);if(!bm)continue;
      const evB=Math.max(-99,Math.min(99,w.cpW/100)),evN=w.cp2W==null?null:Math.max(-99,Math.min(99,w.cp2W/100));
      let m1=E.missedBrilliant(j.pos,bm,evB,evB,evN,1),m2=E.missedBrilliant(j.pos,bm,evB,evB,evN,2);
      if(!m1&&!m2)continue;
      // sfGradePly asks only when the move PLAYED was not itself Brilliant, so a flagged position's played move is graded too, the
      // review's way (its eval after, loss against the position's eval, next best = the engine's best line) - one more search, flagged rows only.
      {const nx=E.makeMove(j.pos,j.pl),s2=E.getStatus(nx);const a=toW(nx,(s2==='checkmate'||s2==='stalemate')?null:await eng.eval(E.toFEN(nx)));
       const loss=Math.min(1500,Math.max(0,j.pos.turn==='w'?(w.cpW-a.cpW):(a.cpW-w.cpW))),evA=Math.max(-99,Math.min(99,a.cpW/100));
       for(const rule of [1,2]){const g=E.brilliantGate(j.pos,j.pl,loss,evA,evB,evB,rule);if(g.ok){if(rule===1)m1=null;else m2=null;}}}
      if(!m1&&!m2)continue;
      const bestSan=E.toSAN(j.pos,bm,E.applyMove(j.pos.board,bm));
      rows.push({game:j.gid,white:j.hW,black:j.hB,ply:j.i,no:Math.floor(j.i/2)+1,side:j.pos.turn,played:j.san,missed:bestSan,fen:E.toFEN(j.pos),rule1:!!m1,rule2:!!m2,evB,evN,g:m2||m1});
    }
    eng.quit();};
  await Promise.all(Array.from({length:K},worker));
  rows.sort((a,b)=>a.game<b.game?-1:a.game>b.game?1:a.ply-b.ply);
  const fmt=r=>`${r.no}${r.side==='w'?'.':'...'}${r.played} (missed ${r.missed}, ${r.g.arm} ${r.g.gT}${r.g.gSq} sac ${r.g.sac}, eval ${r.side==='w'?r.evB:-r.evB}, next ${r.evN==null?'-':(r.side==='w'?r.evN:-r.evN)})`;
  for(const rule of [1,2]){const L=rows.filter(r=>r['rule'+rule]);const gs=[...new Set(L.map(r=>r.game))];
    console.log(`\n## RULE ${rule}: ${L.length} missed brilliants in ${gs.length} games`);
    for(const g of gs){const R=L.filter(r=>r.game===g);console.log(`  ${g} ${R[0].white} v ${R[0].black}: `+R.map(fmt).join(', '));}}
  console.log(`\n# positions ${jobs.length}, searched in ${Math.round((Date.now()-t0)/1000)}s`);
  if(out)fs.writeFileSync(out,JSON.stringify({srcMd5:E.SOURCE_MD5,depth:DEPTH,player,positions:jobs.length,rows},null,1));
}
// --rule3 <pgn-dir> <out.json> [saved-reviews.json]: #550 item (17), jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03.
// RULE 3 (docs/brilliant-rule-3-design-2026-11-10, the app's default from #550) beside rule 2 (#549's one rule) and rule 1 (the rule
// the app graded by before), every verdict from the SHIPPED brilliantGate with the review's own inputs: lossWin is sfGradePly's _wd
// (0 when the move is the engine's first line, else winDrop), playedIsBest its _wasBest, and the game's positions for clause C's
// look-back. Searched: every ply whose rule-2 sacrifice term is 2 or more (rule 3's land and hang arms are never larger than rule 2's)
// plus every in-check capture whose clause-K board arm reads 2 or more (the one arm rule 2 does not have). saved-reviews.json, when
// given, is docs/chesscom-saved-reviews-kunal2023-2026-11-10 and each row then carries chess.com's own grade for that ply.
async function rule3List(dir,out,ccFile){
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.pgn')).sort();
  let CC={};try{if(ccFile)CC=JSON.parse(fs.readFileSync(ccFile,'utf8')).games||{};}catch(e){CC={};}
  const LET={'!':'Brilliant',B:'Best',G:'Great',b:'Blunder',e:'Excellent',f:'Forced',g:'Good',i:'Inaccuracy',k:'Book',m:'Mistake',x:'Miss'};
  const jobs=[];let plies=0;
  for(const f of files){
    const pgn=fs.readFileSync(path.join(dir,f),'utf8');const gid=f.replace(/\.pgn$/,'');
    const hW=(/\[White "([^"]*)"/.exec(pgn)||[])[1]||'',hB=(/\[Black "([^"]*)"/.exec(pgn)||[])[1]||'';
    const res=E.loadSANs(E.parsePGN(pgn));if(!res||!res.plies.length)continue;
    for(let i=0;i<res.plies.length;i++){plies++;
      const pos=res.positions[i],pl=res.plies[i].move;
      const g0=E.brilliantGate(pos,pl,0,0,0,null,2);let k=false;
      if(!g0.isSac&&E.isInCheck(pos.board,pos.turn)&&pos.board[pl.tr]&&pos.board[pl.tr][pl.tc]){try{k=E.brilCheckArm(pos,pl,E.makeMove(pos,pl),pos.turn).v>=2;}catch(e){k=false;}}
      if(!g0.isSac&&!k)continue;
      jobs.push({gid,hW,hB,i,res,pos,pl,san:res.plies[i].san});
    }
  }
  const K=Math.max(1,+(process.env.CT_JOBS||1));
  console.log('# BRILLIANT RULE 3 MEASUREMENT - #550 item (17) | chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| engine',path.basename(SF),'depth',DEPTH,'MultiPV 2 Hash 16 | engines',K);
  console.log('# games',files.length,'plies',plies,'searched',jobs.length,'| saved reviews',Object.keys(CC).length);
  const rows=[];let k=0;const t0=Date.now();
  const worker=async()=>{const eng=engine();await eng.init();
    while(k<jobs.length){const j=jobs[k++];const N=j.res.positions[j.i+1];
      const a=toW(j.pos,await eng.eval(E.toFEN(j.pos)));
      const sN=E.getStatus(N);const b=toW(N,(sN==='checkmate'||sN==='stalemate')?null:await eng.eval(E.toFEN(N)));
      const mover=j.pos.turn,before=a.cpW,after=b.cpW;
      let loss=Math.min(1500,Math.max(0,mover==='w'?(before-after):(after-before)));
      const wasBest=uciIs(j.pl,a.bm);if(wasBest)loss=0;
      const evA=Math.max(-99,Math.min(99,after/100)),evB=Math.max(-99,Math.min(99,before/100));
      const nb=E.nextBestW(before,a.cp2W,wasBest),evN=nb==null?null:Math.max(-99,Math.min(99,nb/100));
      const lossWin=wasBest?0:E.winDrop(before,after,mover);
      const g2=E.brilliantGate(j.pos,j.pl,loss,evA,evB,evN,2);
      const g3=E.brilliantGate(j.pos,j.pl,loss,evA,evB,evN,3,{lossWin,playedIsBest:wasBest,positions:j.res.positions,i:j.i});
      const cg=CC[j.gid]&&CC[j.gid].grades?LET[CC[j.gid].grades[j.i]]||null:null;
      rows.push({game:j.gid,white:j.hW,black:j.hB,ply:j.i,no:Math.floor(j.i/2)+1,side:mover,san:j.san,fen:E.toFEN(j.pos),r1:OLD(g2),r2:g2.ok,r3:g3.ok,cc:cg,saved:!!CC[j.gid],
        g3:{arm:g3.arm,gT:g3.gT,gSq:g3.gSq,sac:g3.sac,loss:g3.loss,lossWin:g3.lossWin,gapWin:g3.gapWin,originPre:g3.originPre,hangAge:g3.hangAge,chk:g3.chk,evAfter:g3.evAfter,cap:g3.cap},
        g2:{arm:g2.arm,sac:g2.sac,needed:g2.needed,evNext:g2.evNext}});
      if(rows.length%50===0)process.stderr.write(rows.length+'/'+jobs.length+' '+Math.round((Date.now()-t0)/1000)+'s\n');
    }
    eng.quit();};
  await Promise.all(Array.from({length:K},worker));
  rows.sort((a,b)=>a.game<b.game?-1:a.game>b.game?1:a.ply-b.ply);
  const nm=r=>`${r.game} ${r.white}-${r.black} ${r.no}${r.side==='w'?'.':'...'}${r.san}${r.cc?' [chess.com '+r.cc+']':''}`;
  const c=(f)=>rows.filter(f).length;
  console.log(`\n# fires: rule 1 ${c(r=>r.r1)}, rule 2 ${c(r=>r.r2)}, rule 3 ${c(r=>r.r3)}`);
  for(const [h,f] of [['RULE 3 ADDS OVER RULE 2',r=>r.r3&&!r.r2],['RULE 3 REMOVES FROM RULE 2',r=>r.r2&&!r.r3],['RULE 3 ADDS OVER RULE 1',r=>r.r3&&!r.r1],['RULE 3 REMOVES FROM RULE 1',r=>r.r1&&!r.r3]]){
    const L=rows.filter(f);console.log(`\n## ${h}: ${L.length}`);for(const r of L)console.log('  '+nm(r)+'  '+r.g3.arm+' '+r.g3.gT+r.g3.gSq+' sac '+r.g3.sac+' lossWin '+r.g3.lossWin);}
  const sv=rows.filter(r=>r.saved);
  if(sv.length){let cb=0;for(const g of Object.keys(CC)){cb+=(CC[g].grades||'').split('').filter(x=>x==='!').length;}
    console.log(`\n## THE ${Object.keys(CC).length} SAVED REVIEWS: chess.com Brilliants ${cb}; rule 3 hits ${c(r=>r.saved&&r.r3&&r.cc==='Brilliant')}, extras ${c(r=>r.saved&&r.r3&&r.cc!=='Brilliant')}; rule 2 hits ${c(r=>r.saved&&r.r2&&r.cc==='Brilliant')}, extras ${c(r=>r.saved&&r.r2&&r.cc!=='Brilliant')}`);
    for(const r of sv.filter(r=>r.cc==='Brilliant'&&!r.r3))console.log('  MISSED BY RULE 3: '+nm(r));
    for(const r of sv.filter(r=>r.r3&&r.cc!=='Brilliant'))console.log('  RULE 3 EXTRA: '+nm(r)+' lossWin '+r.g3.lossWin);}
  console.log(`\n# searched ${jobs.length} positions in ${Math.round((Date.now()-t0)/1000)}s`);
  if(out)fs.writeFileSync(out,JSON.stringify({srcMd5:E.SOURCE_MD5,depth:DEPTH,plies,searched:jobs.length,rows},null,1));
}
// --grades <pgn-dir> <saved-reviews.json> [out.json]: #550 item (20), jobs/reconcile-kevitsch-review-vs-chesscom. Every position of every
// saved-review game searched (the review's own evW/ev2W/bU/aU), every ply graded by the SHIPPED sfGradePly with gradeHist, once with the
// item (20) grades (grades2 true) and once with the grades they replace (false), the summary's Book overlay (effLabel over
// openingBookPlies, the named-position table; the lesson lines are not loaded here) applied to both, and each compared with chess.com's
// letter for that ply. CT_JOBS engines (default 2), one game per engine at a time.
async function gradesList(dir,ccFile,out){
  const CC=JSON.parse(fs.readFileSync(ccFile,'utf8')).games||{};
  const LET={'!':'Brilliant',B:'Best',G:'Great',b:'Blunder',e:'Excellent',f:'Forced',g:'Good',i:'Inaccuracy',k:'Book',m:'Mistake',x:'Miss'};
  const ids=Object.keys(CC).filter(g=>fs.existsSync(path.join(dir,g+'.pgn'))).sort();
  const K=Math.max(1,+(process.env.CT_JOBS||2));
  console.log('# GRADES MEASUREMENT - #550 item (20) | chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| depth',DEPTH,'engines',K,'| games',ids.length);
  const per={};const conf={};let k=0;const t0=Date.now();
  const tally=(tag,app,cc)=>{const c=conf[tag]||(conf[tag]={n:0,same:0,byCc:{},byApp:{}});c.n++;if(app===cc)c.same++;
    c.byCc[cc]=(c.byCc[cc]||{n:0,same:0});c.byCc[cc].n++;if(app===cc)c.byCc[cc].same++;c.byApp[app]=(c.byApp[app]||0)+1;};
  const worker=async()=>{const eng=engine();await eng.init();
    while(k<ids.length){const gid=ids[k++];const pgn=fs.readFileSync(path.join(dir,gid+'.pgn'),'utf8');
      const res=E.loadSANs(E.parsePGN(pgn));const N=res.plies.length;const evW=new Array(N+1),ev2W=new Array(N+1),bU=new Array(N),aU=new Array(N);
      for(let i=0;i<=N;i++){const p=res.positions[i];const st=E.getStatus(p);const r=(st==='checkmate'||st==='stalemate')?null:await eng.eval(E.toFEN(p));
        const w=toW(p,r);evW[i]=w.cpW;ev2W[i]=w.cp2W;if(i<N){bU[i]=w.bm;aU[i]=r?r.alt:null;}}
      const bk=(()=>{try{return E.openingBookPlies(res.plies.map(p=>p.san),res.positions,[],1)||0;}catch(e){return 0;}})();
      const L=CC[gid].grades||'';const rows=[];
      for(let i=0;i<N;i++){const cc=LET[L[i]]||null;if(!cc)continue;
        const h=E.gradeHist(res,evW,bU,i);
        const a2=E.sfGradePly(res.positions[i],res.plies[i].move,evW[i],evW[i+1],ev2W[i],bU[i],aU[i],null,undefined,false,{...h,grades2:true});
        const a1=E.sfGradePly(res.positions[i],res.plies[i].move,evW[i],evW[i+1],ev2W[i],bU[i],aU[i],null,undefined,false,{...h,grades2:false});
        const l2=E.effLabel(a2.cls,i,bk),l1=E.effLabel(a1.cls,i,bk);tally('new',l2,cc);tally('old',l1,cc);rows.push([i,cc,l1,l2]);}
      per[gid]=rows;process.stderr.write(gid+' '+N+' plies, '+Math.round((Date.now()-t0)/1000)+'s\n');}
    eng.quit();};
  await Promise.all(Array.from({length:K},worker));
  for(const tag of ['old','new']){const c=conf[tag];console.log(`\n## ${tag==='new'?'ITEM (20) GRADES':'THE GRADES THEY REPLACE'}: ${c.same} of ${c.n} plies graded as chess.com graded them (${(100*c.same/c.n).toFixed(1)}%)`);
    for(const g of ['Brilliant','Great','Best','Excellent','Good','Book','Forced','Inaccuracy','Mistake','Miss','Blunder']){const b=c.byCc[g]||{n:0,same:0};console.log(`  ${g.padEnd(10)} chess.com ${String(b.n).padStart(4)}  app ${String(c.byApp[g]||0).padStart(4)}  both ${String(b.same).padStart(4)}`);}}
  console.log(`\n# ${ids.length} games in ${Math.round((Date.now()-t0)/1000)}s`);
  if(out)fs.writeFileSync(out,JSON.stringify({srcMd5:E.SOURCE_MD5,depth:DEPTH,conf,per},null,1));
}
async function main(){
  if(process.argv[2]==='--grades')return gradesList(process.argv[3],process.argv[4],process.argv[5]);
  if(process.argv[2]==='--rule3')return rule3List(process.argv[3],process.argv[4],process.argv[5]);
  if(process.argv[2]==='--cache')return cacheOne(process.argv[3],process.argv[4]);
  if(process.argv[2]==='--missed')return missedList(process.argv[3],process.argv[4],process.argv[5]);
  const dir=process.argv[2],out=process.argv[3];
  if(!dir){console.error('usage: node gates/measure-brilliant-one-rule.js <pgn-dir> [out.json]');process.exit(2);}
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.pgn')).sort();
  console.log('# BRILLIANT ONE RULE MEASUREMENT - #549 item (28)');
  console.log('# chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| engine',path.basename(SF),'depth',DEPTH,'MultiPV 2 Hash 16 | floor',E.BRIL_FLOOR,'needed',E.BRIL_NEEDED);
  console.log('# games',files.length,'from',dir);
  const eng=engine();await eng.init();
  const rows=[];let plies=0,searched=0;const t0=Date.now();
  for(const f of files){
    const pgn=fs.readFileSync(path.join(dir,f),'utf8');const gid=f.replace(/\.pgn$/,'');
    const hW=(/\[White "([^"]*)"/.exec(pgn)||[])[1]||'',hB=(/\[Black "([^"]*)"/.exec(pgn)||[])[1]||'';
    const res=E.loadSANs(E.parsePGN(pgn));if(!res||!res.plies.length)continue;
    for(let i=0;i<res.plies.length;i++){
      plies++;const pos=res.positions[i],pl=res.plies[i].move,mover=pos.turn;
      // board-only screen: sac is independent of every eval argument, so these numbers do not matter here
      const g0=E.brilliantGate(pos,pl,0,0,0,null,2);if(!g0.isSac)continue;
      searched++;
      const a=toW(pos,await eng.eval(E.toFEN(pos)));
      const b=toW(res.positions[i+1],(E.getStatus(res.positions[i+1])==='checkmate'||E.getStatus(res.positions[i+1])==='stalemate')?null:await eng.eval(E.toFEN(res.positions[i+1])));
      const before=a.cpW,after=b.cpW;
      let loss=Math.min(1500,Math.max(0,mover==='w'?(before-after):(after-before)));
      const wasBest=uciIs(pl,a.bm);if(wasBest)loss=0;
      const evA=Math.max(-99,Math.min(99,after/100)),evB=Math.max(-99,Math.min(99,before/100));
      const nb=E.nextBestW(before,a.cp2W,wasBest);
      const g=E.brilliantGate(pos,pl,loss,evA,evB,nb==null?null:Math.max(-99,Math.min(99,nb/100)),2);   // the one rule, explicitly: the app's default is still 1
      const r={game:gid,white:hW,black:hB,ply:i,no:Math.floor(i/2)+1,side:mover,san:res.plies[i].san,fen:E.toFEN(pos),old:OLD(g),new:g.ok,why:why(g),g};
      rows.push(r);
      if(r.old||r.new)console.log(`${r.old?'OLD':'   '} ${r.new?'NEW':'   '}  ${gid} ${r.no}${mover==='w'?'.':'...'}${r.san}  ${hW}-${hB}  loss=${g.loss} sac=${g.sac} given=${g.given} arm=${g.arm} ${g.gT}${g.gSq} after=${g.evAfter} before=${g.evBefore} next=${g.evNext} | ${r.why}`);
    }
    process.stderr.write(`${f} done, ${searched}/${plies} searched, ${Math.round((Date.now()-t0)/1000)}s\n`);
  }
  eng.quit();
  const added=rows.filter(r=>r.new&&!r.old),gone=rows.filter(r=>r.old&&!r.new),both=rows.filter(r=>r.old&&r.new);
  console.log(`\n# plies ${plies}, searched ${searched} (sacrifice term >= 2), skipped ${plies-searched} (cannot be Brilliant under either rule)`);
  console.log(`# OLD rule fires ${rows.filter(r=>r.old).length}, NEW rule fires ${rows.filter(r=>r.new).length}: kept ${both.length}, added ${added.length}, taken away ${gone.length}`);
  for(const [h,L] of [['ADDED',added],['TAKEN AWAY',gone]]){console.log('\n## '+h);for(const r of L)console.log(`  ${r.game} ${r.white}-${r.black} ${r.no}${r.side==='w'?'.':'...'}${r.san}`);}
  if(out)fs.writeFileSync(out,JSON.stringify({srcMd5:E.SOURCE_MD5,depth:DEPTH,plies,searched,rows},null,1));
}
main().catch(e=>{console.error(e);process.exit(1);});
