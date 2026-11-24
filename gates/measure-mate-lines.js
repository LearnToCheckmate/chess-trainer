// gates/measure-mate-lines.js  #553, batch 14 entry 27, jobs/when-the-app-says-mate-in-n-show-the-moves-on-the-board-2026-11-19.
// EVERY MATE LINE THE APP SHOWS GOES THROUGH chess.jsx mateLineCheck (each move legal, no earlier mate, the last move mate, the mating
// side's moves exactly N). This walks MANY POSITIONS whose mate length is a fact of the position - every mate-in-N puzzle in the app's own
// pool (PZGEN_RAW, n>0; the Lichess open database, each verified unique by the generator), plus Kunal's card - asks the app's engine
// (stockfish-18-lite-single, the worker the app runs) for its line, and runs the SHIPPED check (engine-extract) over it, in both shapes the
// app shows: (D) the mate from the puzzle position, lead 0; (R) the refutation shape the Puzzles card writes ("If <reply>, ... mate in N"):
// from the position after the puzzle's first move, the defender's stored reply then the engine's mate in n-1, lead 1.
// For every line the check accepts it also runs three broken copies that MUST be refused: the last move dropped, N claimed one higher,
// and an illegal move put in. Writes the accepted lines to gates/fixtures/mate-lines.json (gate 187 re-checks them in node).
// USAGE: node gates/measure-mate-lines.js [fixture.json]   CT_MOVETIME (default 600 ms), CT_LIMIT (positions, default all)
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require('./engine-extract');
const ROOT=path.join(__dirname,'..');
const SF=path.join(ROOT,'stockfish-18-lite-single.js');
const MT=+(process.env.CT_MOVETIME||600);
const OUT=process.argv[2]||path.join(__dirname,'fixtures','mate-lines.json');
function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});
  let buf='',waiter=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const line=buf.slice(0,k).trim();buf=buf.slice(k+1);if(waiter)waiter(line);}});
  const send=s=>p.stdin.write(s+'\n');
  const until=(pred)=>new Promise(res=>{waiter=(l)=>{if(pred(l)){waiter=null;res(l);}};});
  return {
    async init(){send('uci');await until(l=>l==='uciok');send('setoption name Hash value 16');send('isready');await until(l=>l==='readyok');},
    line(fen,ms){return new Promise(res=>{let pv=null,mate=null;
      waiter=(l)=>{if(l.startsWith('info ')&&/ pv /.test(l)&&!/ multipv [2-9]/.test(l)){const m=/ score (cp|mate) (-?\d+)/.exec(l);mate=(m&&m[1]==='mate')?+m[2]:null;pv=l.split(' pv ')[1].trim().split(/\s+/);}
        else if(l.startsWith('bestmove')){waiter=null;res({pv,mate});}};
      send('ucinewgame');send('position fen '+fen);send('go movetime '+ms);});},
    quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}
  };
}
const src=fs.readFileSync(path.join(ROOT,'chess.jsx'),'utf8');
const PZ=JSON.parse(/const PZGEN_RAW=(\[.*?\]);\n/s.exec(src)[1]).filter(p=>p.n>0);
const KUNAL={f:'r2qr3/1ppb1p1R/p1nbpk2/8/3P4/2PB1N2/PPQ2PPP/R5K1 w - - 0 1',s:['Ng5+'],y:['Kxg5'],n:5,m:'Kunal card (1.Ng5, If Kxg5 mate in 4)',kunal:true};
function controls(g,ucis,n,lead){
  const bad=[];
  if(E.mateLineCheck(g,ucis.slice(0,-1),n,lead).ok)bad.push('last dropped');
  if(E.mateLineCheck(g,ucis,n+1,lead).ok)bad.push('N+1');
  const ill=ucis.slice();ill[Math.max(lead,ucis.length-2)]='a1a1';if(E.mateLineCheck(g,ill,n,lead).ok)bad.push('illegal');
  return bad;
}
(async()=>{
  console.log('# measure-mate-lines: chess.jsx md5 '+E.SOURCE_MD5+', stockfish-18-lite-single movetime '+MT+' ms, '+PZ.length+' mate puzzles + Kunal\'s card');
  const eng=engine();await eng.init();
  const lim=+(process.env.CT_LIMIT||0)||PZ.length;
  const rows=[],ref={D:{}, R:{}},ctl=[];let tried={D:0,R:0},ok={D:0,R:0};
  const run=async(shape,g,fen,lead,n,pre,tag)=>{
    tried[shape]++;
    let r=await eng.line(fen,MT);let ucis=pre.concat(r.pv||[]);let c=E.mateLineCheck(g,ucis,n,lead);
    if(!c.ok){r=await eng.line(fen,MT*4);ucis=pre.concat(r.pv||[]);c=E.mateLineCheck(g,ucis,n,lead);}
    if(c.ok){ok[shape]++;const b=controls(g,ucis,n,lead);if(b.length)ctl.push(tag+': '+b.join(','));rows.push({tag,shape,fen:E.toFEN(g),lead,n,ucis,sans:c.plies.map(p=>p.san)});}
    else{ref[shape][c.why]=(ref[shape][c.why]||0)+1;if(process.env.CT_VERBOSE)console.log('  refused '+shape+' '+tag+' '+c.why+' engine mate '+r.mate+' pv '+(r.pv||[]).join(' '));}
  };
  const all=[KUNAL,...PZ.slice(0,lim)];
  for(let i=0;i<all.length;i++){const p=all[i];const g0=E.fromFEN(p.f);const tag=p.kunal?'kunal':('pz'+i+' '+p.f);
    if(!p.kunal)await run('D',g0,p.f,0,p.n,[],tag);
    if(p.n>=2&&p.s&&p.y&&p.y[0]){const m1=E.findMoveBySAN(g0,p.s[0]);if(!m1)continue;const g1=E.makeMove(g0,m1);const rm=E.findMoveBySAN(g1,p.y[0]);if(!rm)continue;
      const ru=E.rc2sq(rm.fr,rm.fc)+E.rc2sq(rm.tr,rm.tc)+(rm.promo||'');const g2=E.makeMove(g1,rm);
      await run('R',g1,E.toFEN(g2),1,p.n-1,[ru],tag);}
    if(i%40===0)process.stdout.write('  '+i+'/'+all.length+'\n');
  }
  eng.quit();
  console.log('D (mate from the puzzle position): '+ok.D+' of '+tried.D+' engine lines pass the check; refused by reason '+JSON.stringify(ref.D));
  console.log('R (the reply, then the mate - the card shape): '+ok.R+' of '+tried.R+' pass; refused by reason '+JSON.stringify(ref.R));
  console.log('controls: '+(rows.length*3)+' broken copies of the '+rows.length+' accepted lines; ACCEPTED by mistake: '+ctl.length+(ctl.length?(' '+ctl.slice(0,5).join('; ')):''));
  const k=rows.find(r=>r.tag==='kunal');console.log('Kunal\'s card: '+(k?k.sans.join(' '):'NOT ACCEPTED'));
  fs.writeFileSync(OUT,JSON.stringify({about:'gates/measure-mate-lines.js: engine lines (stockfish-18-lite-single, movetime '+MT+' ms) the shipped mateLineCheck accepted; chess.jsx md5 '+E.SOURCE_MD5,tried,ok,refused:ref,rows},null,0)+'\n');
  console.log('wrote '+OUT+' ('+rows.length+' lines)');
})();
