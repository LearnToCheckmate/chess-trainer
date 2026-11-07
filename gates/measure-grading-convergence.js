// gates/measure-grading-convergence.js - #549 item (33), jobs/grading-convergence-index-2026-09-23.
// REPORT-ONLY: not a gate, asserts nothing, changes nothing. Kunal, 2026-09-23: "as we refine this we should see how much
// closer we're getting to the chess.com outcomes, not just brilliant moves but all the other numbers also". This is the
// one number (three, per the job's theMeasure) that says whether a grading change moved the review toward chess.com.
//
// WHAT IT MEASURES. THE APP, not a model of it: the bundle's own Review (window.__ctReview, #549 item (55)) is driven over
// every game in gates/fixtures/chesscom-panels.json - chess.com's review-panel grade counts per side (tracker collection
// `answerkey`) joined to the PGN of the same game in docs/chesscom-reviewed-games-kunal2023-since-2026-09-01. So the
// grader, the engine (Stockfish 18 lite, depth 16, table groups of four - #549 item (30)), the opening book (lessons.js)
// and the Book/Great/Miss overlays are all the shipped ones. A node-side re-grade would miss the book, which is a tier-1
// grade here, and would clear the hash on a different cadence.
//
// RULE 1 AND RULE 2. `run` grades with whatever the bundle grades by DEFAULT (BRIL_RULE_DEFAULT, rule 1 today). With
// CT_BRIL_RULE=2 it seeds localStorage ct_bril_rule=2, the app's own switch for the one Brilliant rule (#549 item (28)),
// so the second file says what rule 2 would change, measured the same way. `report` then compares the two files ply by
// ply, and prints how many plies' EVALUATIONS differ between the two runs: if any do, a label change is not the rule's
// alone and the report says so instead of crediting it.
//
// THE MEASURE (job field theMeasure). Per game per side: grade distance = sum over the ten grades of |ours - theirs|.
// Headline: total grade distance, accuracy MAE and accuracy mean SIGNED error (ours minus theirs), over the panel
// accuracy (the review page's own reading, same sitting as the counts) and, beside it, over ApiWhite/BlackAccuracy
// (the public record). TIER GUARD: a change is an improvement only if the total falls AND no tier-1 grade (Brilliant,
// Blunder, Book) gets worse on any game.
//
// WHAT THE TARGET IS NOT. Every panel is a timestamped reading (readAt), and chess.com's review page drifts between
// readings (flag bench-chesscom-review-page-drifts-across-time-2026-09-18; rows with a priorReading carry the drift). The
// report states that on every run. AND chess.com's panel does not count every move: its ten counts sum to fewer than the side's
// moves on 20 of the 64 side-readings at the #549 baseline (33 moves), which the report sets against the side's FORCED moves (one legal
// reply), a grade the app has no row for. The deficit is reported, never filled or subtracted.
//
// USAGE:
//   CT_APP=<bundle> [CT_BRIL_RULE=2] [CT_POOL=2] node gates/measure-grading-convergence.js run <out.jsonl> [maxGames]
//       one JSON line per game; resumes (a game already in out.jsonl is skipped).
//   node gates/measure-grading-convergence.js report <rule1.jsonl> [<rule2.jsonl>] [--series <sha> <label>]
//       the per-game table, the three headline numbers, the tier guard, and (with a second file) every move whose
//       label changed, by game and ply, old and new. --series prints one TSV row for
//       claude/agents/bench/grading-convergence-series.tsv.
'use strict';
const fs=require('fs'),path=require('path');
const FIX=path.join(__dirname,'fixtures','chesscom-panels.json');
const GRADES=['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder'];
const LABEL={brilliant:'Brilliant',great:'Great',best:'Best',excellent:'Excellent',good:'Good',book:'Book',inaccuracy:'Inaccuracy',mistake:'Mistake',miss:'Miss',blunder:'Blunder'};
const TIER1=['brilliant','blunder','book'];
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
const fx=()=>JSON.parse(fs.readFileSync(FIX,'utf8'));

async function run(OUT,MAX){
  const L=require('./lib.js'),R=require('./drive/review.js');
  const rule=process.env.CT_BRIL_RULE==='2'?'2':null;
  const store={ct_pool:process.env.CT_POOL||'2'};if(rule)store.ct_bril_rule=rule;
  const done=new Set();try{for(const l of fs.readFileSync(OUT,'utf8').split('\n'))if(l.trim()){const o=JSON.parse(l);if(!o.err)done.add(o.gameId);}}catch(e){}
  const F=fx();
  const b=await L.launch({geo:'kunal761',store});
  await b.open();
  console.log('# GRADING CONVERGENCE RUN - #549 item (33) | bundle',process.env.CT_APP||'(default)','| ct_bril_rule',rule||'unset (the bundle default)','| games',F.rows.length);
  let n=0;
  for(const r of F.rows){
    if(n>=MAX)break;if(!r.pgn||done.has(r.gameId))continue;
    const t0=Date.now();
    try{
      await R.importPgn(b,r.pgn,600000);
      const v=await b.page.evaluate(()=>{const v=window.__ctReview;if(!v)return null;
        let rule=null;try{rule=localStorage.getItem('ct_bril_rule');}catch(e){}
        return {rule,book:v.summary.book,engine:v.engine||null,
          sum:{w:{accuracy:v.summary.w.accuracy,counts:v.summary.w.counts},b:{accuracy:v.summary.b.accuracy,counts:v.summary.b.counts}},
          an:v.analysis.map((o,i)=>({i,side:v.positions[i].turn,san:v.plies[i]&&v.plies[i].san,cls:o.cls&&o.cls.label,eb:o.evalBefore,ea:o.evalAfter,loss:o.loss}))};});
      if(!v)throw new Error('window.__ctReview is absent: this bundle predates #549 item (55)');
      const row={gameId:r.gameId,readAt:r.readAt,secs:Math.round((Date.now()-t0)/1000),at:new Date().toISOString(),...v};
      fs.appendFileSync(OUT,JSON.stringify(row)+'\n');
      console.log(`${n+1} ${r.gameId} ours W ${v.sum.w.accuracy} B ${v.sum.b.accuracy} | engine ${v.engine?v.engine.path:'?'} | ${row.secs}s`);
    }catch(e){console.log('ERR',r.gameId,String(e).slice(0,200));fs.appendFileSync(OUT,JSON.stringify({gameId:r.gameId,err:String(e).slice(0,300)})+'\n');
      if(/has been closed/.test(String(e))){console.log('STOP: the browser is gone; re-run to resume');break;}try{await b.open();}catch(_){}}
    n++;
  }
  await b.browser.close();
  L.done('CONVERGENCE RUN');
}

// ---- report ----
const load=(f)=>{const m=new Map();for(const l of fs.readFileSync(f,'utf8').split('\n'))if(l.trim()){const o=JSON.parse(l);if(!o.err)m.set(o.gameId,o);}return m;};
const ours=(o,side)=>{const c=o.sum[side].counts||{};const x={};for(const g of GRADES)x[g]=+(c[LABEL[g]]||0);return x;};
const effL=(a,bookN)=>(a.i<bookN&&a.cls!=='Brilliant'&&a.cls!=='Great')?'Book':a.cls;   // chess.jsx effLabel, the grade a ply is SHOWN as
let E=null;const eng=()=>E||(E=require('./engine-extract'));
function forced(pgn){   // per side: moves with exactly one legal reply (chess.com grades those Forced and leaves them out of its ten)
  const X=eng();const res=X.loadSANs(X.parsePGN(pgn.split('\n\n').slice(1).join('\n\n')));const f={w:0,b:0},m={w:0,b:0};
  if(!res)return {f,m};for(let i=0;i<res.plies.length;i++){const p=res.positions[i];m[p.turn]++;if(X.getLegal(p).length===1)f[p.turn]++;}return {f,m};
}
function measure(M,F){
  const games=[];let dist=0;const acc={panel:[],api:[]};const per={};for(const g of GRADES)per[g]=0;let excl=[];
  for(const r of F.rows){
    const o=M.get(r.gameId);if(!r.pgn){excl.push(r.gameId+' (no PGN)');continue;}if(!o){excl.push(r.gameId+' (not measured in this file)');continue;}
    const fm=forced(r.pgn);const sides={};
    for(const [s,k] of [['w','white'],['b','black']]){
      const a=ours(o,s),t=r[k];let d=0;const diff={};
      for(const g of GRADES){const v=a[g]-t[g];diff[g]=v;d+=Math.abs(v);per[g]+=Math.abs(v);}
      dist+=d;
      const ap=r.accPanel[s],us=o.sum[s].accuracy;let aa=r.accApi[s];if(typeof aa!=='number'){const t=tag(r.pgn,s==='w'?'ApiWhiteAccuracy':'ApiBlackAccuracy');aa=t==null?null:+t;}   // the public record, from the answerkey row or else the PGN's own tag
      if(typeof ap==='number')acc.panel.push(us-ap);if(typeof aa==='number')acc.api.push(us-aa);
      const sumT=GRADES.reduce((x,g)=>x+t[g],0),sumO=GRADES.reduce((x,g)=>x+a[g],0);
      sides[s]={ours:a,theirs:t,diff,dist:d,accOurs:us,accPanel:ap,accApi:aa,moves:fm.m[s],forced:fm.f[s],sumTheirs:sumT,sumOurs:sumO};
    }
    games.push({gameId:r.gameId,readAt:r.readAt,drift:!!r.drift,kc:r.kunalColour,sides,dist:sides.w.dist+sides.b.dist});
  }
  const mae=a=>a.length?a.reduce((x,y)=>x+Math.abs(y),0)/a.length:null,msg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  return {games,dist,per,excl,accPanel:{n:acc.panel.length,mae:mae(acc.panel),signed:msg(acc.panel)},accApi:{n:acc.api.length,mae:mae(acc.api),signed:msg(acc.api)}};
}
const f1=x=>x==null?'-':x.toFixed(2);
function printMeasure(name,X){
  console.log(`\n## ${name}: per game, per side - ours / chess.com (difference) for each grade, then grade distance and accuracy`);
  const ab=g=>({brilliant:'Bril',great:'Grt',best:'Best',excellent:'Exc',good:'Good',book:'Book',inaccuracy:'Inac',mistake:'Mist',miss:'Miss',blunder:'Blun'})[g];
  console.log('game          side '+GRADES.map(g=>ab(g).padStart(11)).join('')+'  dist  acc ours/panel/api   moves forced cc-sum');
  for(const G of X.games)for(const s of ['w','b']){const S=G.sides[s];
    console.log(`${G.gameId.padEnd(13)} ${s}${G.kc&&G.kc[0]===s?'*':' '}  `+GRADES.map(g=>`${S.ours[g]}/${S.theirs[g]}${S.diff[g]?'('+(S.diff[g]>0?'+':'')+S.diff[g]+')':''}`.padStart(11)).join('')+
      `  ${String(S.dist).padStart(4)}  ${S.accOurs}/${S.accPanel==null?'-':S.accPanel}/${S.accApi==null?'-':S.accApi}`.padEnd(26)+`   ${S.moves} ${S.forced} ${S.sumTheirs}${S.sumTheirs<S.moves?' (-'+(S.moves-S.sumTheirs)+')':''}`);}
  console.log('(* = Kunal\'s side. cc-sum = the sum of chess.com\'s ten counts; (-n) = moves its panel does not count)');
  console.log(`\n# ${name} HEADLINE over ${X.games.length} games / ${2*X.games.length} side-readings:`);
  console.log(`#   TOTAL GRADE DISTANCE ${X.dist}   (per grade: ${GRADES.map(g=>ab(g)+' '+X.per[g]).join(', ')})`);
  console.log(`#   ACCURACY vs the panel reading: MAE ${f1(X.accPanel.mae)}, mean signed ${f1(X.accPanel.signed)} (ours minus theirs, n=${X.accPanel.n})`);
  console.log(`#   ACCURACY vs ApiAccuracy:       MAE ${f1(X.accApi.mae)}, mean signed ${f1(X.accApi.signed)} (n=${X.accApi.n})`);
  const short=X.games.flatMap(G=>['w','b'].map(s=>G.sides[s])).filter(S=>S.sumTheirs<S.moves);
  const expl=short.filter(S=>S.moves-S.sumTheirs<=S.forced).length;
  console.log(`#   chess.com's panel counts fewer moves than were played on ${short.length} side-readings (${short.reduce((x,S)=>x+S.moves-S.sumTheirs,0)} moves); on ${expl} of them the side had at least that many forced moves`);
  if(X.excl.length)console.log('#   EXCLUDED: '+X.excl.join(', '));
}
function report(f1n,f2n,series){
  const F=fx();const M1=load(f1n);const X1=measure(M1,F);
  const rule1=[...M1.values()].map(o=>o.rule||'default');
  console.log('# GRADING CONVERGENCE INDEX - #549 item (33) | fixture',path.relative(path.join(__dirname,'..'),FIX),'('+F.withPgn+' of '+F.answerkeyDocs+' answerkey rows carry a PGN)');
  console.log('# THE TARGET IS A SET OF TIMESTAMPED READINGS, NOT A FIXED ANSWER: chess.com\'s review page drifts between readings (flag bench-chesscom-review-page-drifts-across-time-2026-09-18);',F.rows.filter(r=>r.drift).length,'rows carry a measured drift since a prior reading. Readings span',F.rows.map(r=>r.readAt).filter(Boolean).sort()[0],'to',F.rows.map(r=>r.readAt).filter(Boolean).sort().pop());
  console.log('# file 1:',f1n,'| ct_bril_rule',[...new Set(rule1)].join(','));
  printMeasure('RULE '+(rule1.every(x=>x==='2')?'2':'1 (the bundle default)'),X1);
  let X2=null;
  if(f2n){
    const M2=load(f2n);X2=measure(M2,F);
    console.log('\n# file 2:',f2n,'| ct_bril_rule',[...new Set([...M2.values()].map(o=>o.rule||'default'))].join(','));
    const r2=[...M2.values()].map(o=>o.rule||'default');printMeasure(r2.every(x=>x==='2')?'RULE 2 (ct_bril_rule=2)':'FILE 2 (ct_bril_rule '+[...new Set(r2)].join(',')+')',X2);
    // every move whose label changed, by game and ply; and whether the engine numbers under it moved
    console.log('\n## EVERY MOVE WHOSE GRADE CHANGED, rule 1 -> rule 2 (the grade the ply is SHOWN as, effLabel)');
    let evalDiff=0,plies=0,changed=0;const tierWorse=[];
    for(const r of F.rows){const a=M1.get(r.gameId),c=M2.get(r.gameId);if(!a||!c)continue;
      for(let i=0;i<a.an.length;i++){const p=a.an[i],q=c.an[i];if(!q)continue;plies++;
        if(p.eb!==q.eb||p.ea!==q.ea)evalDiff++;
        const l1=effL(p,a.book),l2=effL(q,c.book);
        if(l1!==l2){changed++;console.log(`  ${r.gameId} ply ${i} ${Math.floor(i/2)+1}${p.side==='w'?'.':'...'}${p.san} (${p.side==='w'?'White':'Black'}${r.kunalColour&&r.kunalColour[0]===p.side?', Kunal':''}): ${l1} -> ${l2}${p.eb!==q.eb||p.ea!==q.ea?'   [EVALS DIFFER: '+p.eb+'/'+p.ea+' vs '+q.eb+'/'+q.ea+']':''}`);}}}
    console.log(`#   ${changed} moves changed grade over ${plies} plies; ${evalDiff} plies have different engine numbers between the two runs${evalDiff?' - THOSE changes are not the rule\'s alone':' - so every change above is the rule\'s alone'}`);
    console.log('\n## RULE 2 AGAINST RULE 1 (negative = closer to chess.com)');
    console.log(`#   total grade distance ${X1.dist} -> ${X2.dist} (${X2.dist-X1.dist>=0?'+':''}${X2.dist-X1.dist}); Brilliant distance ${X1.per.brilliant} -> ${X2.per.brilliant}`);
    console.log(`#   accuracy MAE vs panel ${f1(X1.accPanel.mae)} -> ${f1(X2.accPanel.mae)}, signed ${f1(X1.accPanel.signed)} -> ${f1(X2.accPanel.signed)}`);
    for(const G1 of X1.games){const G2=X2.games.find(g=>g.gameId===G1.gameId);if(!G2)continue;
      for(const s of ['w','b'])for(const g of TIER1){const d1=Math.abs(G1.sides[s].diff[g]),d2=Math.abs(G2.sides[s].diff[g]);if(d2>d1)tierWorse.push(`${G1.gameId} ${s} ${g} |${G1.sides[s].diff[g]}| -> |${G2.sides[s].diff[g]}|`);}}
    const better=X2.dist<X1.dist&&!tierWorse.length;
    console.log(`#   TIER GUARD (no tier-1 grade - Brilliant, Blunder, Book - worse on any game): ${tierWorse.length?'BROKEN on '+tierWorse.length+': '+tierWorse.join('; '):'held'}`);
    console.log(`#   VERDICT by the job's rule: rule 2 is ${better?'an IMPROVEMENT':X2.dist===X1.dist&&!tierWorse.length?'NEUTRAL (distance unchanged)':'NOT an improvement'} on this fixture set`);
  }
  if(series){const [sha,label]=series;const row=(X,rl)=>[new Date().toISOString().slice(0,19)+'Z',sha,label+(rl?' '+rl:''),X.games.length,X.dist,f1(X.accPanel.mae),f1(X.accPanel.signed),f1(X.accApi.mae),f1(X.accApi.signed),X.per.brilliant,X.per.blunder,X.per.book].join('\t');
    console.log('\n# SERIES ROWS (at\tsha\trule change\tgames\tdistance\taccMAE panel\taccSigned panel\taccMAE api\taccSigned api\tbril dist\tblun dist\tbook dist)');
    console.log(row(X1,'rule 1'));if(X2)console.log(row(X2,'rule 2'));}
}
const [,,cmd,a1,a2,...rest]=process.argv;
if(cmd==='run'){if(!a1){console.error('usage: run <out.jsonl> [maxGames]');process.exit(2);}run(a1,parseInt(a2||'999',10)).catch(e=>{console.log('FATAL',e);process.exit(1);});}
else if(cmd==='report'){if(!a1){console.error('usage: report <rule1.jsonl> [<rule2.jsonl>] [--series <sha> <label>]');process.exit(2);}
  const args=[a2,...rest].filter(x=>x!==undefined);const si=args.indexOf('--series');const series=si>=0?args.slice(si+1,si+3):null;const f2=si===0?null:args[0]&&args[0]!=='--series'?args[0]:null;
  report(a1,f2,series);}
else{console.error('usage: node gates/measure-grading-convergence.js run|report ...');process.exit(2);}
