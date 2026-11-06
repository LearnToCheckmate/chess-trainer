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
async function main(){
  if(process.argv[2]==='--cache')return cacheOne(process.argv[3],process.argv[4]);
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
