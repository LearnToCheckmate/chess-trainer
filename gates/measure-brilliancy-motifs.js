// gates/measure-brilliancy-motifs.js  -  #549 item (35)
// jobs/brilliancy-library-and-motif-coverage-2026-09-23, work item 1: "re-run his own archive. Report how many motifs his brilliancies
// span before and after [the gate fix]. If the answer moves a lot, tell Kunal before building anything else here."
//
// WHAT IT READS. gates/fixtures/brilliancy-motif-sample.json: every move of his 196 chess.com games since 1 Sep 2026 (tracker
// docs/chesscom-reviewed-games-kunal2023-since-2026-09-01, recorded - nothing is fetched) that the one Brilliant rule's measurement
// (gates/measure-brilliant-one-rule.js, #549 item (28), the app's own engine at depth 16) found Brilliant under EITHER rule, with the
// numbers the engine gave the gate. Each row is RE-GRADED here by the SHIPPED brilliantGate under rule 1 (what the app grades by
// today, BRIL_RULE_DEFAULT) and rule 2 (the one rule, ct_bril_rule='2', which is the "gate fix" of
// decisions/brilliant-is-not-gated-by-who-is-winning-2026-09-23), then tagged by the SHIPPED brilMotifs. Both are read out of chess.jsx
// through gates/engine-extract.js, so the thing measured is the thing that ships.
// WHAT IT CANNOT SEE, said plainly: the rows carry no engine line, so the three mate shapes (which read the line) never fire here and
// every count below is of the board-only tags. A brilliant under neither rule at measurement time is not in the sample.
//
// USAGE:  node gates/measure-brilliancy-motifs.js [fixture.json]               (CT_SRC=<chess.jsx> to measure another source)
//         node gates/measure-brilliancy-motifs.js --make <all.json> <out.json>  (rebuild the fixture from a measure-brilliant-one-rule run)
'use strict';
const fs=require('fs'),path=require('path');
const E=require('./engine-extract');
const FIX=path.join(__dirname,'fixtures','brilliancy-motif-sample.json');
const PLAYER='kunal2023';

function resolve(r){const pos=E.fromFEN(r.fen);const pl=E.getLegal(pos).find(m=>E.toSAN(pos,m,E.applyMove(pos.board,m))===r.san);return {pos,pl};}
function grade(r,rule){const {pos,pl}=resolve(r);if(!pl)return null;const s=r.side==='w'?1:-1;
  return {pos,pl,g:E.brilliantGate(pos,pl,r.loss,s*r.evAfter,s*r.evBefore,r.evNext==null?null:s*r.evNext,rule)};}
function make(src,out){
  const d=JSON.parse(fs.readFileSync(src,'utf8'));
  const rows=d.rows.filter(r=>r.old||r.new).map(r=>({game:r.game,white:r.white,black:r.black,no:r.no,side:r.side,san:r.san,fen:r.fen,
    loss:r.g.loss,evAfter:r.g.evAfter,evBefore:r.g.evBefore,evNext:r.g.evNext}));
  fs.writeFileSync(out,JSON.stringify({what:'Brilliant under rule 1 or rule 2 at measurement, his 196 chess.com games since 1 Sep 2026',
    source:'tracker docs/chesscom-reviewed-games-kunal2023-since-2026-09-01 (recorded; nothing fetched)',
    measuredBy:'gates/measure-brilliant-one-rule.js (#549 item 28), stockfish-18-lite-single depth '+d.depth+', chess.jsx md5 '+d.srcMd5,
    frame:'loss in centipawns; evAfter, evBefore, evNext in pawns in the MOVER\'s frame, as brilliantGate returns them',
    plies:d.plies,searched:d.searched,rows},null,0).replace(/\},\{/g,'},\n{'));
  console.log('# fixture written',out,'rows',rows.length);
}
function spread(L){const by={};for(const x of L)by[x.m.primary]=(by[x.m.primary]||0)+1;
  const top=Object.entries(by).sort((a,b)=>b[1]-a[1]);const pc={};for(const x of L)pc[x.m.piece||'-']=(pc[x.m.piece||'-']||0)+1;
  const gg=by['greek-gift']||0;
  return {n:L.length,motifs:top.length,specific:top.filter(([k])=>k!=='sacrifice').length,top,topShare:L.length?Math.round(100*top[0][1]/L.length):0,
    greekShare:L.length?Math.round(100*gg/L.length):0,pieces:Object.entries(pc).sort((a,b)=>b[1]-a[1])};}
function main(){
  if(process.argv[2]==='--make')return make(process.argv[3],process.argv[4]);
  const fix=JSON.parse(fs.readFileSync(process.argv[2]||FIX,'utf8'));
  console.log('# BRILLIANCY MOTIF SPREAD - #549 item (35) | chess.jsx',E.SRC_PATH,'md5',E.SOURCE_MD5,'| fixture rows',fix.rows.length);
  console.log('# sample: '+fix.what+' | '+fix.measuredBy);
  const all=[];let unresolved=0;
  for(const r of fix.rows){const a=grade(r,1),b=grade(r,2);if(!a||!b){unresolved++;continue;}
    const kunal=(r.side==='w'?r.white:r.black).toLowerCase()===PLAYER;
    for(const [rule,x] of [[1,a],[2,b]])if(x.g.ok)all.push({rule,kunal,r,g:x.g,m:E.brilMotifs(x.pos,x.pl,x.g)});}
  if(unresolved)console.log('# UNRESOLVED rows (move not legal in its FEN): '+unresolved);
  const res={};
  for(const who of ['his','opponents'])for(const rule of [1,2]){
    const L=all.filter(x=>x.rule===rule&&x.kunal===(who==='his'));const s=spread(L);res[who+rule]=s;
    console.log(`\n## ${who==='his'?'HIS OWN':'HIS OPPONENTS\''} brilliants, RULE ${rule}${rule===1?' (what the app grades by)':' (the one rule, off by default)'}: ${s.n} moves, ${s.motifs} primary motifs (${s.specific} specific), top ${s.top.length?s.top[0][0]:'-'} ${s.topShare}%, greek-gift ${s.greekShare}%`);
    console.log('   motifs: '+s.top.map(([k,v])=>k+' '+v).join(', '));
    console.log('   piece given: '+s.pieces.map(([k,v])=>(E.PNAME[k]||k)+' '+v).join(', '));
    {const H=L.filter(x=>x.g.arm==='hang'),Ld=L.filter(x=>x.g.arm!=='hang'),sl=spread(Ld);
     console.log(`   by arm: ${H.length} on the hanging arm (a piece left en prise; rule 2 only), ${Ld.length} on the landing arm - which span ${sl.motifs} primary motifs, greek-gift ${sl.greekShare}%`);}
    if(who==='his')for(const x of L)console.log(`     ${x.r.game} ${x.r.no}${x.r.side==='w'?'.':'...'}${x.r.san}  ${x.m.primary}  [${x.m.tags.map(t=>t.tag+':'+t.conf).join(' ')}] arm=${x.g.arm} gave=${x.g.gT}${x.g.gSq}`);
  }
  const h1=res.his1,h2=res.his2;
  console.log(`\n# VERDICT ON WORK ITEM 1: his own brilliants ${h1.n} -> ${h2.n} moves, ${h1.motifs} -> ${h2.motifs} primary motifs, greek-gift share ${h1.greekShare}% -> ${h2.greekShare}%, top-motif share ${h1.topShare}% -> ${h2.topShare}%`);
  return res;
}
if(require.main===module)main();
module.exports={spread,grade,resolve};
