// gates/measure-review-vs-chesscom.js - #549 item (34), jobs/reconcile-kevitsch-review-vs-chesscom.
// REPORT-ONLY: not a gate, not in gates/regress or the manifest, changes nothing. It is the runnable form of the job's two
// acceptance cases, TC-R167 and TC-R168, which are RED BY DESIGN today: they go green only when the accuracy, opening-book
// and Great fixes the job names have landed, and none of those is this job's to make (Kunal's word sets every grading
// constant). So it prints a verdict per case and exits 0; it must never be wired into gates.sh as a gate.
//
// THE FIXTURE. The eight games whose chess.com review panel was read in ONE sitting (2026-09-27, harvest-chesscom__1790474916630)
// and which the job names: the seven of docs/benchmark-answerkey-7-pgn plus Kunal2023 v Kevitsch (184179360928). Counts,
// panel accuracy and PGN come from gates/fixtures/chesscom-panels.json (#549 item (33)), so this file carries no copy of them.
// Job (33)'s gates/measure-grading-convergence.js is the distance over all 32 games; this tool is the job's case over these
// eight, and it keeps what (33)'s run does not: the engine's second line (ct_evalcache ev2W), which the Great case needs.
//
// WHAT IT RUNS. `run`: the bundle's own Review (window.__ctReview, #549 item (55)) on each game at 375x761, ct_pool 2, graded by
// the bundle default (rule 1), with the game's cached engine output read back from ct_evalcache. `report`: for each side the ten
// grades, chess.com's beside ours under rule 1 (the review's own summary) and under rule 2 (sfGradePly read out of chess.jsx by
// gates/engine-extract.js, run with rule 2 over the SAME cached engine numbers, so the difference is the rule's alone; the same
// call with rule 1 must reproduce the browser's labels ply for ply, and the report prints the mismatch count to prove it).
//
// TC-R167 (the parameterised case, input count 16 side-readings): per game, the accuracy ordering of the two sides agrees with
// chess.com's; Brilliant equal per side; Book within 1 per side; over all 16, accuracy MAE at most 5.7 AND mean signed error
// within +/-3.0 (ours minus chess.com's panel reading). Best, Excellent and Great are reported, not asserted.
// TC-R168 (the Great property, input every ply of the eight games): no move is labelled Great when the best line and the second
// line are both above 90% or both below 10% winning chances (Win% = 50+50*(2/(1+exp(-0.00368208*cp))-1), chess.jsx winPct).
//
// USAGE:
//   CT_APP=<bundle> node gates/measure-review-vs-chesscom.js run <out.jsonl>     (resumes: a game already in out.jsonl is skipped)
//   node gates/measure-review-vs-chesscom.js report <out.jsonl>                  (CT_SRC=<chess.jsx> to regrade with another source)
// Never fetches chess.com.
'use strict';
const fs=require('fs'),path=require('path');
const FIX=path.join(__dirname,'fixtures','chesscom-panels.json');
const IDS=['184024052818','180000436342','174540842570','174433078044','174431023868','174386847848','174331795882','184179360928'];
const CATS=['Brilliant','Great','Best','Excellent','Good','Book','Inaccuracy','Mistake','Miss','Blunder'];
const rowsOf=()=>{const F=JSON.parse(fs.readFileSync(FIX,'utf8'));return IDS.map(id=>{const r=F.rows.find(x=>x.gameId===id);if(!r||!r.pgn)throw new Error('fixture has no row with a PGN for '+id);return r;});};

async function run(OUT){
  const L=require('./lib.js'),R=require('./drive/review.js');
  const done=new Set();try{for(const l of fs.readFileSync(OUT,'utf8').split('\n'))if(l.trim()){const o=JSON.parse(l);if(!o.err)done.add(o.gameId);}}catch(e){}
  const b=await L.launch({geo:'kunal761',store:{ct_pool:process.env.CT_POOL||'2'}});await b.open();
  for(const fr of rowsOf()){
    if(done.has(fr.gameId))continue;const t0=Date.now();
    try{
      await R.importPgn(b,fr.pgn,600000);
      const v=await b.page.evaluate(()=>{const v=window.__ctReview;if(!v)return null;let cache=null;
        try{const all=JSON.parse(localStorage.getItem('ct_evalcache')||'{}');for(const k in all){const e=all[k];if(e&&e.evW&&e.evW.length===v.plies.length+1&&(!cache||(e.at||0)>(cache.at||0)))cache=e;}}catch(e){}
        let rule=null;try{rule=localStorage.getItem('ct_bril_rule');}catch(e){}
        return {rule,engine:v.engine||null,book:v.summary.book,
          sum:{w:{accuracy:v.summary.w.accuracy,counts:v.summary.w.counts},b:{accuracy:v.summary.b.accuracy,counts:v.summary.b.counts}},
          an:v.analysis.map(o=>({cls:o.cls&&o.cls.label,loss:o.loss,macc:o.macc,wdrop:o.wdrop,eb:o.evalBefore,ea:o.evalAfter})),
          cache:cache&&{evW:cache.evW,ev2W:cache.ev2W,bU:cache.bU,aU:cache.aU}};});
      if(!v)throw new Error('window.__ctReview is absent: this bundle predates #549 item (55)');
      if(!v.cache)throw new Error('no ct_evalcache entry of this game\'s length');
      fs.appendFileSync(OUT,JSON.stringify({gameId:fr.gameId,secs:Math.round((Date.now()-t0)/1000),at:new Date().toISOString(),...v})+'\n');
      console.log(fr.gameId,'ours W',v.sum.w.accuracy,'B',v.sum.b.accuracy,'| engine',v.engine&&v.engine.path,'| '+Math.round((Date.now()-t0)/1000)+'s');
    }catch(e){console.log('ERR',fr.gameId,String(e).slice(0,300));fs.appendFileSync(OUT,JSON.stringify({gameId:fr.gameId,err:String(e).slice(0,300)})+'\n');try{await b.open();}catch(_){}}
  }
  await b.browser.close();L.done();
}

function report(IN){
  const E=require('./engine-extract.js');
  const got=new Map();for(const l of fs.readFileSync(IN,'utf8').split('\n'))if(l.trim()){const o=JSON.parse(l);if(!o.err)got.set(o.gameId,o);}
  console.log('# REVIEW v CHESS.COM, the eight one-sitting answer-key games - #549 item (34) | source',E.SRC_PATH,'md5',E.SOURCE_MD5,'| run file',IN);
  console.log('# chess.com side: gates/fixtures/chesscom-panels.json (panel counts and panel accuracy, read 2026-09-27; the page drifts between readings, flag bench-chesscom-review-page-drifts-across-time-2026-09-18)');
  const reads=[],great=[],games=[];let mism=0,missing=[];
  for(const fr of rowsOf()){
    const r=got.get(fr.gameId);if(!r){missing.push(fr.gameId);continue;}
    const res=E.loadSANs(E.parsePGN(fr.pgn)),N=res.plies.length,bookN=r.book,c=r.cache;
    const evW=c.evW.slice();for(let i=0;i<=N;i++){const p=res.positions[i];try{if(E.getStatus(p)==='checkmate')evW[i]=(p.turn==='w')?-99950:99950;}catch(e){}}   // importGame's read patch, as regradeGame applies it
    const shown=(L,i)=>(i<bookN&&L!=='Brilliant'&&L!=='Great')?'Book':L;   // effLabel
    const g={id:fr.gameId,white:tag(fr.pgn,'White'),black:tag(fr.pgn,'Black'),N,bookN,sides:{},rule2:[]};
    for(const side of ['w','b']){
      const S=side==='w'?'white':'black',cc={};CATS.forEach(k=>cc[k]=fr[S][k.toLowerCase()]);
      const o1=r.sum[side].counts,o2={};CATS.forEach(k=>o2[k]=0);
      const mine=[];for(let i=0;i<N;i++)if(res.positions[i].turn===side)mine.push(i);
      for(const i of mine){
        const a=E.sfGradePly(res.positions[i],res.plies[i].move,evW[i],evW[i+1],c.ev2W[i],c.bU[i],c.aU[i],null,1);
        const b2=E.sfGradePly(res.positions[i],res.plies[i].move,evW[i],evW[i+1],c.ev2W[i],c.bU[i],c.aU[i],null,2);
        const l1=shown(a.cls.label,i),l2=shown(b2.cls.label,i);o2[l2]++;
        if(l1!==shown(r.an[i].cls,i))mism++;
        if(l1!==l2)g.rule2.push({ply:i,san:res.plies[i].san,side,from:l1,to:l2});
        if(a.cls.label==='Great'){
          const mv=side==='w'?1:-1,best=mv*evW[i],sec=c.ev2W[i]==null?null:mv*c.ev2W[i];
          const wb=E.winPct(best),ws=sec==null?null:E.winPct(sec);
          const pm=i>0?res.plies[i-1].move:null,pl=res.plies[i].move;
          const recapture=!!pm&&/x/.test(res.plies[i-1].san)&&/x/.test(res.plies[i].san)&&pm.tr===pl.tr&&pm.tc===pl.tc;
          great.push({id:fr.gameId,side,ply:i,san:res.plies[i].san,best,sec,wb,ws,
            decided:ws!=null&&((wb>90&&ws>90)||(wb<10&&ws<10)),mateBoth:sec!=null&&Math.abs(best)>=90000&&Math.abs(sec)>=90000,recapture,
            king:/^K/.test(res.plies[i].san)});
        }
      }
      const panel=fr.accPanel[side],api=fr.accApi?fr.accApi[side]:null,ours=r.sum[side].accuracy;
      // accuracy with chess.com's Book moves left out too: this side's first max(their Book, our Book) moves dropped from gameAcc's inputs
      const winsW=[E.winPct((r.an[0].eb||0)*100)].concat(r.an.map(o=>E.winPct((o.ea||0)*100)));
      const ourBookSide=mine.filter(i=>i<bookN).length,keep=mine.slice(Math.max(cc.Book,ourBookSide));
      const ga=E.gameAcc(winsW,keep.map(i=>typeof r.an[i].macc==='number'?r.an[i].macc:E.moveAcc(r.an[i].wdrop||0)),keep);
      const oursX=Math.round(Math.max(15,Math.min(99.5,ga==null?100:ga))*10)/10;
      const ccBookPlies=new Set(mine.slice(0,cc.Book));
      const bestOnCcBook=mine.filter(i=>ccBookPlies.has(i)&&i>=bookN&&r.an[i].cls==='Best').length;
      // a Best that is NOT the engine's first choice (loss above 0): the Best band (a Win% drop under CLS_BANDS' first edge) let it in,
      // where chess.com's Best is the engine's move. Counted off the moves chess.com calls Book, so the two parts do not overlap.
      const bestByBand=mine.filter(i=>!ccBookPlies.has(i)&&i>=bookN&&r.an[i].cls==='Best'&&r.an[i].loss>0).length;
      g.sides[side]={player:side==='w'?g.white:g.black,cc,o1,o2,panel,api,ours,oursX,bestGap:o1.Best-cc.Best,bestOnCcBook,bestByBand,ourBookSide};
      reads.push({id:fr.gameId,side,err:ours-panel,errApi:api==null?null:ours-api,errX:oursX-panel});
    }
    games.push(g);
  }
  if(missing.length)console.log('# NOT IN THE RUN FILE (so not measured):',missing.join(' '));
  console.log('# node regrade under rule 1 against the browser review, plies whose label differs:',mism,'(0 means the rule-2 column is the rule\'s change alone)');
  const pad=(s,n)=>String(s).padStart(n);
  for(const g of games){
    console.log(`\n## ${g.id} ${g.white} v ${g.black}: ${g.N} plies, our book ${g.bookN} plies`);
    console.log('   '+pad('',22)+CATS.map(k=>pad(k.slice(0,5),6)).join('')+'   accuracy');
    for(const side of ['w','b']){const x=g.sides[side];
      console.log('   '+pad(x.player+' chess.com',22)+CATS.map(k=>pad(x.cc[k],6)).join('')+'   '+x.panel+(x.api!=null?' (api '+x.api+')':''));
      console.log('   '+pad('ours, rule 1',22)+CATS.map(k=>pad(x.o1[k],6)).join('')+'   '+x.ours+'  (chess.com Book left out: '+x.oursX+')');
      console.log('   '+pad('ours, rule 2',22)+CATS.map(k=>pad(x.o2[k],6)).join(''));
      console.log(`   ${x.player}: Best ${x.bestGap>=0?'+':''}${x.bestGap} against chess.com = ${x.bestOnCcBook} on moves chess.com calls Book + ${x.bestByBand} that are not the engine's move (the Best band let them in) ${(r=>r<0?'- '+(-r):'+ '+r)(x.bestGap-x.bestOnCcBook-x.bestByBand)} left over; the Excellent fold is gone (split since #421)`);}
    for(const c of g.rule2)console.log(`   rule 2 changes ply ${c.ply} ${c.san} (${c.side}): ${c.from} -> ${c.to}`);
  }
  // TC-R167
  const n=reads.length,avg=f=>reads.reduce((a,x)=>a+f(x),0)/n;
  const mae=avg(x=>Math.abs(x.err)),ms=avg(x=>x.err),maeX=avg(x=>Math.abs(x.errX)),msX=avg(x=>x.errX);
  const apiR=reads.filter(x=>x.errApi!=null);
  const fails=[];let ord=0,bril1=0,bril2=0,book=0;
  for(const g of games){const w=g.sides.w,b=g.sides.b;
    const okO=Math.sign(w.ours-b.ours)===Math.sign(w.panel-b.panel);if(okO)ord++;else fails.push(`${g.id} ordering: ours ${w.ours}/${b.ours}, chess.com ${w.panel}/${b.panel}`);
    for(const s of [w,b]){if(s.o1.Brilliant===s.cc.Brilliant)bril1++;else fails.push(`${g.id} ${s.player} Brilliant ${s.o1.Brilliant} v ${s.cc.Brilliant}`);
      if(s.o2.Brilliant===s.cc.Brilliant)bril2++;
      if(Math.abs(s.o1.Book-s.cc.Book)<=1)book++;else fails.push(`${g.id} ${s.player} Book ${s.o1.Book} v ${s.cc.Book}`);}}
  const accOk=mae<=5.7&&Math.abs(ms)<=3.0;if(!accOk)fails.push(`accuracy MAE ${mae.toFixed(2)} (<= 5.7) and mean signed ${ms>=0?'+':''}${ms.toFixed(2)} (within 3.0)`);
  console.log(`\n# TC-R167 over ${games.length} games, ${n} side-readings (rule 1, the bundle default):`);
  console.log(`#   ordering agrees on ${ord} of ${games.length}; Brilliant equal on ${bril1} of ${n} (rule 2: ${bril2} of ${n}); Book within 1 on ${book} of ${n}`);
  console.log(`#   accuracy vs the panel: MAE ${mae.toFixed(2)}, mean signed ${ms>=0?'+':''}${ms.toFixed(2)}, ours higher on ${reads.filter(x=>x.err>0).length} of ${n}; chess.com Book left out: MAE ${maeX.toFixed(2)}, mean signed ${msX>=0?'+':''}${msX.toFixed(2)}`);
  if(apiR.length)console.log(`#   accuracy vs ApiAccuracy where the fixture has it (${apiR.length}): MAE ${(apiR.reduce((a,x)=>a+Math.abs(x.errApi),0)/apiR.length).toFixed(2)}`);
  console.log(`#   Best: ours above chess.com on ${reads.length?games.reduce((a,g)=>a+(g.sides.w.bestGap>0)+(g.sides.b.bestGap>0),0):0} of ${n}, by ${games.reduce((a,g)=>a+g.sides.w.bestGap+g.sides.b.bestGap,0)} in all = ${games.reduce((a,g)=>a+g.sides.w.bestOnCcBook+g.sides.b.bestOnCcBook,0)} on chess.com Book moves + ${games.reduce((a,g)=>a+g.sides.w.bestByBand+g.sides.b.bestByBand,0)} not the engine's move + ${games.reduce((a,g)=>a+g.sides.w.bestGap+g.sides.b.bestGap-g.sides.w.bestOnCcBook-g.sides.b.bestOnCcBook-g.sides.w.bestByBand-g.sides.b.bestByBand,0)} left over`);
  console.log(`#   Great: ours ${great.length}, chess.com ${games.reduce((a,g)=>a+g.sides.w.cc.Great+g.sides.b.cc.Great,0)}`);
  console.log(`CASE TC-R167: ${fails.length?'RED':'GREEN'}${fails.length?' - '+fails.length+' failing: '+fails.join('; '):''}`);
  // TC-R168
  console.log(`\n# TC-R168, every move we label Great (rule 1), best line v second line in the mover's centipawns and Win%:`);
  for(const x of great)console.log(`#   ${x.id} ply ${x.ply} ${x.san} (${x.side}): best ${x.best}, second ${x.sec}, Win% ${x.wb.toFixed(1)} v ${x.ws==null?'-':x.ws.toFixed(1)}${x.decided?'  DECIDED':''}${x.mateBoth?' (both lines are mate scores)':''}${x.recapture?' [recapture]':''}${x.king?' [king move]':''}`);
  const dec=great.filter(x=>x.decided);
  console.log(`#   ${great.length} Greats: ${dec.length} decided (${dec.filter(x=>x.mateBoth).length} of them between two mate scores), ${great.filter(x=>x.recapture).length} recaptures, ${great.filter(x=>x.king).length} king moves, ${great.filter(x=>!x.decided&&x.ws!=null&&x.wb-x.ws>=14).length} undecided with the second line at least 14 Win% worse`);
  console.log(`CASE TC-R168: ${dec.length?'RED':'GREEN'} - ${dec.length} of ${great.length} Greats sit where both lines are decided${dec.length?': '+dec.map(x=>x.id+' '+x.san).join(', '):''}`);
}
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};

const [,,CMD,F]=process.argv;
if(CMD==='run'&&F)run(F).catch(e=>{console.log('FATAL',e);process.exit(1);});
else if(CMD==='report'&&F)report(F);
else{console.log('usage: CT_APP=<bundle> node gates/measure-review-vs-chesscom.js run <out.jsonl> | report <out.jsonl>');process.exit(2);}
