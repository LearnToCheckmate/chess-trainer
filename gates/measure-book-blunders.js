// gates/measure-book-blunders.js  -  #553, jobs/a-lesson-library-book-move-that-allows-mate-is-graded-book-and-praised-2026-11-19
//
// WHAT IT FINDS. Every move the Review would call Book that the Review's own grader calls a Mistake, a Blunder or a Miss - the
// moves chess.jsx bookSound now refuses to present as Book (3...Nf6?? of the Scholar's Mate lesson, which allows 4.Qxf7#, is the
// one the job was filed on). Both books the Review reads are walked:
//   (1) the lesson library (lessons.js OPENINGS: each opening's line, cut at its bookPlies where it has one, and every variation), and
//   (2) the named-position table (gates/opening-book/a..e.tsv, the 3,865 lichess-org/chess-openings lines BOOK_POS is made of) -
//       every ply up to the line's last named position counts as Book there (chess.jsx bookTablePlies), capped at 24 as the Review is.
// Each ply is graded by the SHIPPED sfGradePly read out of chess.jsx (gates/engine-extract.js), on evaluations from THE APP'S OWN
// ENGINE (stockfish-18-lite-single at the repository root, MultiPV 2, Hash 16, `go depth D`), converted to White-frame centipawns
// exactly as gates/measure-brilliant-one-rule.js does (chess.jsx _store). Every distinct position is searched once.
//
// A row is a CASE when its grade is in BOOK_BREAKS (read from chess.jsx, so the list measured is the list that ships). `mate` on a
// row says whether the move ALLOWS A FORCED MATE (chess.jsx matesMover on the two evaluations: a mate score against the mover after
// the move, none before it).
//
// WHAT IS NOT THE SAME AS THE APP, said plainly: the review warms its hash across positions and this sends `ucinewgame` before each
// search, so a borderline grade can differ from a phone's; the depth is printed on every run. A move far inside a Mistake or a
// Blunder (every mate-allowing move is) does not sit near a boundary.
//
// USAGE:  node gates/measure-book-blunders.js [out.json]      CT_DEPTH (default 14), CT_JOBS engines in parallel (default 2),
//         CT_ONLY=lessons to walk the lesson library alone, CT_FIXTURE=<file> to write the gate's engine numbers (gate 186).
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require('./engine-extract');
const ROOT=path.join(__dirname,'..');
const SF=path.join(ROOT,'stockfish-18-lite-single.js');
const DEPTH=+(process.env.CT_DEPTH||14);
const BREAKS=E.BOOK_BREAKS;

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
function toW(pos,r){
  let cpW;
  if(!r)cpW=Math.round(E.evalPawns(pos)*100);
  else if(r.mate!=null)cpW=r.mate>0?(100000-r.mate*100):(-100000-r.mate*100);
  else cpW=(r.cp==null?Math.round(E.evalPawns(pos)*100):r.cp);
  try{if(E.getStatus(pos)==='checkmate')cpW=(pos.turn==='w')?-99950:99950;}catch(e){}
  let cp2W=null;if(r){if(r.mate2!=null)cp2W=r.mate2>0?(100000-r.mate2*100):(-100000-r.mate2*100);else if(r.cp2!=null)cp2W=r.cp2;}
  return {cpW,cp2W,bm:r?r.bestmove:null,alt:r?r.alt:null};
}
function lessonOpenings(){const g={};const prev=global.window;global.window=g;const LJ=path.join(ROOT,'lessons.js');
  try{delete require.cache[require.resolve(LJ)];}catch(e){}try{require(LJ);}finally{global.window=prev;}return (g.CTLESSONS&&g.CTLESSONS.OPENINGS)||[];}

// the lines, each with how many of its plies are Book. CT_NAMES=<a measurement's out.json>: the table lines are only those holding one of its cases
// (the lesson lines are always walked), so the gate's fixture is re-searched in minutes rather than the whole table's hour.
const NAMES=process.env.CT_NAMES?new Set(JSON.parse(fs.readFileSync(process.env.CT_NAMES,'utf8')).cases.filter(c=>c.src==='table').map(c=>c.line)):null;
function lines(){
  const out=[];
  for(const o of lessonOpenings()){
    const main=o.bookPlies>0?(o.line||[]).slice(0,o.bookPlies):(o.line||[]);
    if(main.length)out.push({src:'lesson',name:o.name,sans:main,book:Math.min(24,main.length)});
    for(const v of (o.vars||[]))if(v.line&&v.line.length)out.push({src:'lesson',name:o.name+' / '+v.name,sans:v.line,book:Math.min(24,v.line.length)});
  }
  if(process.env.CT_ONLY!=='lessons')for(const f of 'abcde'){
    const txt=fs.readFileSync(path.join(ROOT,'gates','opening-book',f+'.tsv'),'utf8');
    for(const row of txt.split('\n').slice(1)){if(!row.trim())continue;const [eco,name,pgn]=row.split('\t');
      const sans=E.parsePGN(pgn);if(sans&&sans.length&&(!NAMES||NAMES.has(eco+' '+name)))out.push({src:'table',name:eco+' '+name,sans,book:Math.min(24,sans.length)});}
  }
  return out;
}

async function main(){
  const L=lines();
  const games=[];const need=new Map();   // fen -> position
  const OPS=lessonOpenings();
  for(const l0 of L){const res=E.loadSANs(l0.sans);if(!res||!res.plies||res.plies.length<l0.book){continue;}
    // the Book plies are the SHIPPED openingBookPlies over the line (table on, as shipped), never more than the line: a named line
    // longer than 24 plies is Book only to the last named position inside the first 24 (C83 Tarrasch Trap: 19 of its 24)
    const l={...l0,book:Math.min(l0.book,E.openingBookPlies(res.plies.map(p=>p.san),res.positions,OPS,1))};
    games.push({...l,res});for(let i=0;i<=l.book;i++){const p=res.positions[i];const f=E.toFEN(p);if(!need.has(f))need.set(f,p);}}
  const fens=[...need.keys()];const ev=new Map();
  const K=Math.max(1,+(process.env.CT_JOBS||2));
  process.stderr.write('# lines '+L.length+' playable '+games.length+' distinct positions '+fens.length+' depth '+DEPTH+' engines '+K+'\n');
  let k=0,done=0;const t0=Date.now();
  const worker=async()=>{const eng=engine();await eng.init();
    while(k<fens.length){const f=fens[k++];const p=need.get(f);const st=E.getStatus(p);
      ev.set(f,toW(p,(st==='checkmate'||st==='stalemate')?null:await eng.eval(f)));
      if(++done%500===0)process.stderr.write(done+'/'+fens.length+' '+Math.round((Date.now()-t0)/1000)+'s\n');}
    eng.quit();};
  await Promise.all(Array.from({length:K},worker));
  const cases=[],seen=new Set(),fixture=[];let graded=0,fxCases=0,fxMates=0;
  for(const g of games){const res=g.res;const N=g.book;
    const W=res.positions.slice(0,N+1).map(p=>ev.get(E.toFEN(p)));
    const evW=W.map(w=>w.cpW),ev2W=W.map(w=>w.cp2W),bU=W.map(w=>w.bm),aU=W.map(w=>w.alt);
    let lineCases=0,lineMates=0;
    for(let i=0;i<N;i++){graded++;
      const r=E.sfGradePly(res.positions[i],res.plies[i].move,evW[i],evW[i+1],ev2W[i],bU[i],aU[i],null,undefined,false,E.gradeHist(res,evW,bU,i));
      const lab=r.cls.label;if(BREAKS.indexOf(lab)<0)continue;
      lineCases++;if(E.matesMover(evW[i+1],res.positions[i].turn,evW[i]))lineMates++;
      const key=E.toFEN(res.positions[i])+' '+res.plies[i].san;if(seen.has(key)){continue;}seen.add(key);
      const mover=res.positions[i].turn;
      cases.push({src:g.src,line:g.name,ply:i,moves:g.sans.slice(0,i+1).join(' '),san:res.plies[i].san,grade:lab,
        mate:E.matesMover(evW[i+1],mover,evW[i]),before:evW[i],after:evW[i+1],best:bU[i]});}
    // --fixture: the engine's numbers for every lesson line and every table line holding a case, so a gate can re-grade them with the
    // shipped grader and no engine (gates/fixtures/book-breaks.json)
    if(g.src==='lesson'||lineCases>0){fixture.push({src:g.src,line:g.name,sans:g.sans.slice(0,N),evW,ev2W,bU,aU});fxCases+=lineCases;fxMates+=lineMates;}
  }
  if(process.env.CT_FIXTURE)fs.writeFileSync(process.env.CT_FIXTURE,JSON.stringify({about:'gates/measure-book-blunders.js output: the engine numbers (White-frame centipawns, the review conversion) for each line\'s Book plies; stockfish-18-lite-single depth '+DEPTH+', MultiPV 2, Hash 16; chess.jsx md5 '+E.SOURCE_MD5,depth:DEPTH,cases:fxCases,mates:fxMates,lines:fixture}));
  const out={depth:DEPTH,sourceMd5:E.SOURCE_MD5,lines:L.length,positions:fens.length,graded,breaks:BREAKS,cases};
  console.log('# BOOK MOVES THE REVIEW GRADES '+BREAKS.join('/')+' | chess.jsx md5 '+E.SOURCE_MD5+' depth '+DEPTH+' | lines '+L.length+' positions '+fens.length+' plies graded '+graded+' | cases '+cases.length+' (allow mate: '+cases.filter(c=>c.mate).length+')');
  for(const c of cases)console.log([c.src,c.grade,c.mate?'MATE':'-',c.moves,'('+c.line+')',c.before+' -> '+c.after].join('\t'));
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
}
main().catch(e=>{console.error(e);process.exit(1);});
