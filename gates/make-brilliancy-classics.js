// gates/make-brilliancy-classics.js - THE BUNDLED CLASSICS SET OF THE BRILLIANT LIBRARY, MEASURED BY THE APP'S OWN RULE.
//
// WHY [batch 13, jobs/brilliancy-library-and-motif-coverage-2026-09-23, seeding source 3: "a small bundled classics set ... positions
// from famous games, stored in the same entry shape, shipped in the repo. Game scores are facts; the explanations are written fresh"]:
// the library showed him only his own Brilliants, so a player whose Brilliants are all one kind met no other kind. The job's own rule
// for a seed ("re-score every candidate through our own brilliantGate so the app keeps one definition of brilliant") is what this
// script does: every ply of every game in gates/fixtures/brilliancy-classics-games.json is searched by THE APP'S OWN ENGINE
// (stockfish-18-lite-single, MultiPV 2, Hash 16, go depth 16 - the settings gates/measure-brilliant-one-rule.js uses) and graded by
// the SHIPPED sfGradePly on the app's default rule. A move enters the set only when the app itself calls it Brilliant AND a fresh
// explanation is written for it in the games file; nothing is picked by reputation.
//
// USAGE
//   node gates/make-brilliancy-classics.js --measure     search and grade every ply; writes gates/fixtures/brilliancy-classics-measured.json
//   node gates/make-brilliancy-classics.js --emit        print the BRIL_CLASSICS rows for chess.jsx from the measured file and the games file
//   node gates/make-brilliancy-classics.js --check       no engine: replay every game, and say whether chess.jsx's table equals --emit's (exit 1 if not)
// It prints which chess.jsx it read (engine-extract SOURCE_MD5). CT_DEPTH overrides the depth, CT_JOBS the number of engines.
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require('./engine-extract');
const ROOT=path.join(__dirname,'..');
const SF=path.join(ROOT,'stockfish-18-lite-single.js');
const DEPTH=+(process.env.CT_DEPTH||16);
const GAMES=path.join(__dirname,'fixtures','brilliancy-classics-games.json');
const MEAS=path.join(__dirname,'fixtures','brilliancy-classics-measured.json');
const LINE_MATE=16,LINE_PLIES=6;   // the line a card carries: the game's own continuation to mate when the game ends in mate within 16 plies AND every further move of the mover is a check (a forced mate, not a mate that happened seven moves later); else 6 plies

const toks=(p)=>p.replace(/\d+\.(\.\.)?/g,' ').trim().split(/\s+/);
function replay(g){
  const sans=toks(g.pgn);const start=g.fen?E.fromFEN(g.fen):E.initGame();const r=E.loadSANs(sans,g.fen?start:undefined);
  if(!r.ok)throw new Error(g.id+': '+r.error);
  r.plies.forEach((p,i)=>{const s=E.toSAN(r.positions[i],p.move,E.applyMove(r.positions[i].board,p.move));if(s!==p.san)throw new Error(g.id+': ply '+i+' is written '+p.san+' and the position gives '+s);});
  const first=g.fen?+(/^(\d+)\./.exec(g.pgn)||[0,1])[1]:1;const off=start.turn==='b'?1:0;
  const name=(i)=>{const k=i+off;return (first+Math.floor(k/2))+(k%2?'...':'.')+r.plies[i].san;};
  const no=(i)=>first+Math.floor((i+off)/2);
  return {sans,r,name,no,status:E.getStatus(r.positions[r.positions.length-1])};
}
function lineOf(R,i,g){const thr=g&&g.threat&&g.threat[R.name(i)];if(thr&&R.sans.length===i+1)return toks(thr);   // the game ended on this move: the line is the threat it carried, written in the games file
  const rest=R.sans.slice(i+1);const mate=R.status==='checkmate'&&rest.length<=LINE_MATE&&rest.every((s,k)=>k%2===0||/[+#]$/.test(s));return mate?rest:rest.slice(0,LINE_PLIES);}
function rowsFrom(games,meas){
  const out=[],unwritten=[],refused=[];
  for(const g of games){const R=replay(g);const M=(meas.games||{})[g.id];if(!M)continue;
    for(const k of Object.keys(g.why||{}))if(!M.brilliant.some(b=>b.move===k))refused.push(g.id+' '+k);   // an explanation written for a move the app does not grade Brilliant: it stays out
    for(const b of M.brilliant){const i=b.i;const nm=R.name(i);if(nm!==b.move)throw new Error(g.id+': the measured file says ply '+i+' is '+b.move+' and the game gives '+nm);
      const why=(g.why||{})[nm];if(!why){unwritten.push(g.id+' '+nm);continue;}
      const pos=R.r.positions[i],m=R.r.plies[i].move;
      out.push({id:g.id+':'+nm.replace(/[.+#]/g,'').replace(/=/g,''),who:g.who,fen:E.toFEN(pos),uci:E.rc2sq(m.fr,m.fc)+E.rc2sq(m.tr,m.tc)+(m.promo||''),no:R.no(i),line:lineOf(R,i,g).join(' '),why});}}
  return {out,unwritten,refused};
}
const emitRow=(c)=>'  ['+[c.id,c.who,c.fen,c.uci,c.no,c.line,c.why].map(x=>JSON.stringify(x)).join(',')+'],';

function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});
  let buf='',waiter=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const line=buf.slice(0,k).trim();buf=buf.slice(k+1);if(waiter)waiter(line);}});
  const send=s=>p.stdin.write(s+'\n');
  const until=(pred)=>new Promise(res=>{waiter=(l)=>{if(pred(l)){waiter=null;res(l);}};});
  return {
    async init(){send('uci');await until(l=>l==='uciok');send('setoption name MultiPV value 2');send('setoption name Hash value 16');send('setoption name UCI_LimitStrength value false');send('isready');await until(l=>l==='readyok');},
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
// chess.jsx _store, as gates/measure-brilliant-one-rule.js writes it
function toW(pos,r){
  let cpW;
  if(!r)cpW=Math.round(E.evalPawns(pos)*100);
  else if(r.mate!=null)cpW=r.mate>0?(100000-r.mate*100):(-100000-r.mate*100);
  else cpW=(r.cp==null?Math.round(E.evalPawns(pos)*100):r.cp);
  try{if(E.getStatus(pos)==='checkmate')cpW=(pos.turn==='w')?-99950:99950;}catch(e){}
  let cp2W=null;if(r){if(r.mate2!=null)cp2W=r.mate2>0?(100000-r.mate2*100):(-100000-r.mate2*100);else if(r.cp2!=null)cp2W=r.cp2;}
  return {cpW,cp2W,bm:r?r.bestmove:null};
}
async function measure(){
  const games=JSON.parse(fs.readFileSync(GAMES,'utf8')).games;const K=Math.max(1,+(process.env.CT_JOBS||2));
  console.log('# CLASSICS MEASUREMENT | chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| engine',path.basename(SF),'depth',DEPTH,'MultiPV 2 Hash 16 | engines',K,'| games',games.length,'| rule',E.BRIL_RULE);
  const res={};let k=0;const t0=Date.now();
  const worker=async()=>{const eng=engine();await eng.init();
    while(k<games.length){const g=games[k++];const R=replay(g);const N=R.r.plies.length;const evW=new Array(N+1),ev2W=new Array(N+1),bU=new Array(N),aU=new Array(N);
      for(let i=0;i<=N;i++){const p=R.r.positions[i];const st=E.getStatus(p);const r=(st==='checkmate'||st==='stalemate')?null:await eng.eval(E.toFEN(p));
        const w=toW(p,r);evW[i]=w.cpW;ev2W[i]=w.cp2W;if(i<N){bU[i]=w.bm;aU[i]=r?r.alt:null;}}
      const bril=[],labels=[];
      for(let i=0;i<N;i++){const h=E.gradeHist(R.r,evW,bU,i);const a=E.sfGradePly(R.r.positions[i],R.r.plies[i].move,evW[i],evW[i+1],ev2W[i],bU[i],aU[i],null,undefined,false,h);
        labels.push(a.cls.label);if(a.cls.label==='Brilliant')bril.push({i,move:R.name(i),evBefore:evW[i],evAfter:evW[i+1],best:bU[i]});}
      res[g.id]={plies:N,status:R.status,brilliant:bril,labels:labels.map(l=>l[0]+l[1]).join(' ')};
      process.stderr.write(g.id+' '+N+' plies, Brilliant: '+(bril.map(b=>b.move).join(' ')||'none')+' ('+Math.round((Date.now()-t0)/1000)+'s)\n');}
    eng.quit();};
  await Promise.all(Array.from({length:K},worker));
  const ord={};games.forEach(g=>{ord[g.id]=res[g.id];});
  fs.writeFileSync(MEAS,JSON.stringify({srcMd5:E.SOURCE_MD5,engine:path.basename(SF),depth:DEPTH,rule:E.BRIL_RULE,games:ord},null,1)+'\n');
  console.log('# written',path.relative(ROOT,MEAS),'| Brilliant moves',Object.values(ord).reduce((s,x)=>s+x.brilliant.length,0),'of',Object.values(ord).reduce((s,x)=>s+x.plies,0),'plies');
}
function load(){return {games:JSON.parse(fs.readFileSync(GAMES,'utf8')).games,meas:JSON.parse(fs.readFileSync(MEAS,'utf8'))};}
module.exports={replay,rowsFrom,lineOf,load,emitRow,GAMES,MEAS};
if(require.main===module){
  const a=process.argv[2];
  if(a==='--measure')measure().catch(e=>{console.error(e);process.exit(1);});
  else if(a==='--emit'){const {games,meas}=load();const {out,unwritten,refused}=rowsFrom(games,meas);out.forEach(c=>console.log(emitRow(c)));
    console.error('# '+out.length+' rows from '+games.length+' games (measured at depth '+meas.depth+', rule '+meas.rule+', chess.jsx '+meas.srcMd5+'); Brilliant by the app with no explanation written, left out: '+(unwritten.join(', ')||'none')+' | explained but NOT Brilliant by the app, left out: '+(refused.join(', ')||'none'));}
  else if(a==='--check'){const {games,meas}=load();const {out}=rowsFrom(games,meas);const have=(E.BRIL_CLASSICS||[]).map(r=>JSON.stringify(r));const want=out.map(c=>JSON.stringify([c.id,c.who,c.fen,c.uci,c.no,c.line,c.why]));
    const same=have.length===want.length&&have.every((x,i)=>x===want[i]);console.log('# chess.jsx',E.SOURCE_MD5,'| table rows',have.length,'| generated rows',want.length,'|',same?'SAME':'DIFFERENT');process.exit(same?0:1);}
  else{console.error('usage: node gates/make-brilliancy-classics.js --measure | --emit | --check');process.exit(2);}
}
