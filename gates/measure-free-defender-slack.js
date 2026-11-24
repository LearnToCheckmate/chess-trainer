'use strict';
// gates/measure-free-defender-slack.js - ONE-OFF MEASUREMENT (#553 B3, jobs/the-two-bishops-free-defender-trial-ships-on-with-a-slack-
// calibrated-on-a-fast-node-and-may-reject-a-correct-move-on-a-phone-2026-11-07). Not a gate; it asserts nothing.
// THE QUESTION: the Two Bishops free-defender lesson judges each learner move with ONE search of the position after it (chess.jsx
// FREE_MS 500 ms on the analysis worker, ucinewgame first) and freeNetVerdict(K, score): refused when the mate distance M >= K+3, or the
// mate is lost at K<=5, or the score falls under 150cp. A slower device searches fewer nodes in the same 500 ms. Does a CORRECT move get
// refused, and how often, as the node budget falls?
// HOW: the engine the app runs (stockfish-18-lite-single, in node), Hash 16, ucinewgame before every search, as sfBestLine does.
//  - The learner plays only CORRECT moves (its best move while the truth sees no mate yet): from a ground-truth search of the position (CT_TRUTH_MS, MultiPV 3) a move whose mate distance
//    is at most the best's + 1 (it keeps the net by any reading). Which of those is drawn by a seeded generator, so runs repeat.
//  - The verdict search runs at each budget: 'go movetime 500' (this container), and 'go nodes N' for N = this container's measured
//    nodes in 500 ms times each factor in CT_FACTORS (1 = this machine; 0.5, 0.25, 0.125 = a phone 2x, 4x, 8x slower).
//  - The defender answers with the verdict search's own best move (the app's rule), so K carries forward exactly as the app's does
//    (K = the M of the last kept move).
// OUTPUT: per budget, verdicts given and false refusals (a correct move refused), with each refusal's position and reason.
// RUN: node gates/measure-free-defender-slack.js  (CT_GAME0=0 CT_GAMES=6 CT_TRUTH_MS=1000 CT_FACTORS=1,0.5,0.25,0.125 CT_SEED=553)
const fs=require('fs'),path=require('path'),cp=require('child_process');
const E=require('./engine-extract');
const ROOT=path.join(__dirname,'..');
const SF=path.join(ROOT,'stockfish-18-lite-single.js');
const src=fs.readFileSync(path.join(ROOT,'chess.jsx'),'utf8');
const fv=/function freeNetVerdict\(K,sc\)\{[\s\S]*?return \{ok:true,M\};\}/.exec(src);if(!fv)throw new Error('freeNetVerdict not found in chess.jsx');
const freeNetVerdict=new Function(fv[0]+';return freeNetVerdict;')();   // the SHIPPED verdict, read from the source under test
const FREE_MS=+(/const FREE_MS=(\d+)/.exec(src)||[])[1];
const START='8/8/4k3/8/3BK3/8/4B3/8 w - - 0 1';
const GAMES=+(process.env.CT_GAMES||6),TRUTH=+(process.env.CT_TRUTH_MS||1000),FACT=(process.env.CT_FACTORS||'1,0.5,0.25,0.125').split(',').map(Number);
let seed=+(process.env.CT_SEED||553);const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});let buf='',waiter=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const l=buf.slice(0,k).trim();buf=buf.slice(k+1);if(waiter)waiter(l);}});
  const send=s=>p.stdin.write(s+'\n');const until=(f)=>new Promise(r=>{waiter=(l)=>{if(f(l)){waiter=null;r(l);}};});
  return {async init(){send('uci');await until(l=>l==='uciok');send('setoption name Hash value 16');send('isready');await until(l=>l==='readyok');},
    go(fen,cmd,mpv){return new Promise(res=>{const lines={};let nodes=0;
      waiter=(l)=>{if(l.startsWith('info ')&&/ pv /.test(l)){const k=+((/ multipv (\d+)/.exec(l)||[0,1])[1]);const m=/ score (cp|mate) (-?\d+)/.exec(l);const n=/ nodes (\d+)/.exec(l);if(n)nodes=+n[1];
          lines[k]={cp:m&&m[1]==='cp'?+m[2]:null,mate:m&&m[1]==='mate'?+m[2]:null,pv:l.split(' pv ')[1].trim().split(/\s+/)};}
        else if(l.startsWith('bestmove')){waiter=null;res({lines,nodes,best:l.split(/\s+/)[1]});}};
      send('ucinewgame');send('setoption name MultiPV value '+(mpv||1));send('position fen '+fen);send(cmd);});},
    quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}};
}
const after=(fen,uci)=>{const g=E.fromFEN(fen);const m=E.uciToMove(g,uci);if(!m)return null;return E.toFEN(E.makeMove(g,m));};
(async()=>{
  const eng=engine();await eng.init();
  // this container's speed on this ending: nodes searched in FREE_MS from the start position after Be5 (a typical verdict position)
  const probe=after(START,'d4e5');let nps=[];for(let i=0;i<3;i++){const r=await eng.go(probe,'go movetime '+FREE_MS);nps.push(r.nodes);}
  nps.sort((a,b)=>a-b);const N500=+(process.env.CT_N500||nps[1]);   // CT_N500 fixes the node budgets across short runs (the measured median moves 440k-650k with load)
  console.log('# chess.jsx md5 '+E.SOURCE_MD5+'; FREE_MS '+FREE_MS+'; this container searches '+nps[1]+' nodes (budgets from '+N500+') in '+FREE_MS+' ms here (median of '+nps.join(', ')+')');
  const budgets=[{name:'movetime '+FREE_MS+' (this container)',cmd:'go movetime '+FREE_MS}].concat(FACT.map(f=>({name:'nodes '+Math.round(N500*f)+' (x'+f+')',cmd:'go nodes '+Math.max(1000,Math.round(N500*f))})));
  const stat=budgets.map(b=>({b:b.name,n:0,refused:[]}));
  const G0=+(process.env.CT_GAME0||0);   // a run of games G0..G0+GAMES-1, so a long measurement goes in short runs (this container kills long ones)
  for(let gi=G0;gi<G0+GAMES;gi++){
    // one game per budget, from the same seed per game so the learner's choices start alike
    for(let bi=0;bi<budgets.length;bi++){
      seed=553+gi*7919;let fen=START,K=null,moves=0;
      while(moves<40){
        const t=await eng.go(fen,'go movetime '+TRUTH,3);const L=Object.values(t.lines).filter(x=>x.mate!=null&&x.mate>0);
        // before the truth search sees a mate (the first moves: KBB v K is mate in about 19) the learner plays the truth's best move only
        let pick,best=null;if(L.length){best=Math.min(...L.map(x=>x.mate));const ok=L.filter(x=>x.mate<=best+1);pick=ok[Math.floor(rnd()*ok.length)];}else pick=t.lines[1];
        if(!pick||!pick.pv)break;
        const mv=pick.pv[0];const f2=after(fen,mv);if(!f2)break;moves++;
        const g2=E.fromFEN(f2);if(E.getStatus(g2)==='checkmate'){break;}
        const v=await eng.go(f2,budgets[bi].cmd,1);const sc=v.lines[1]||null;const verdict=freeNetVerdict(K,sc);stat[bi].n++;
        if(!verdict.ok){const _r={game:gi,move:moves,fen,uci:mv,truthMate:pick.mate,best,K,M:verdict.M,why:verdict.why,score:sc&&(sc.mate!=null?'mate '+sc.mate:'cp '+sc.cp),nodes:v.nodes,budget:budgets[bi].name};stat[bi].refused.push(_r);console.log('REFUSED '+JSON.stringify(_r));
          // the app would refuse and the learner would try again; here the game goes on as if kept, so the rest of the line is still measured
        }
        K=verdict.ok?verdict.M:K;   // the app keeps K from the last KEPT move
        const rep=(v.lines[1]&&v.lines[1].pv&&v.lines[1].pv[0])||v.best;const f3=after(f2,rep);if(!f3)break;fen=f3;
      }
      process.stdout.write('  game '+gi+' '+budgets[bi].name+': verdicts so far '+stat[bi].n+', refused so far '+stat[bi].refused.length+'\n');
    }
  }
  eng.quit();
  console.log('RESULT');for(const s of stat){console.log('  '+s.b+': '+s.refused.length+' correct move(s) refused of '+s.n+' verdicts');for(const r of s.refused)console.log('    '+JSON.stringify(r));}
})();
