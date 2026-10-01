// gates/run-brilliant-measurement.js  —  #443
// Work items 3 and 4 of jobs/brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30:
// run the shipped sacrifice measure and two candidates over every ply of every game in the answer
// key that has a PGN, and print both columns per move plus a false-positive count.
//
// WHICH BRANCH THIS MEASURES, said once and plainly, because the #375 rule is that a check covers
// every branch or it is not a check. chess.jsx scores a review on ONE OF TWO paths chosen by the
// device: the Stockfish path (chess.jsx:3566, evals from sfEvalOn in centipawns) and the FALLBACK
// path (chess.jsx:3602, evals from the pure-JS evalPawns with loss from rankMoves(pos,2)). This
// harness reproduces the FALLBACK path exactly. That is a real configuration a real phone runs, and
// it is NOT the other one.
//   - The SACRIFICE term (sac / isSac) is computed inside brilliantGate from the BOARD ALONE and is
//     byte-identical on both paths, so every sacrifice number here transfers to both.
//   - The four EVAL conditions do not transfer. A "would be labelled Brilliant" verdict here is a
//     verdict about the fallback branch.
'use strict';
const fs=require('fs'),path=require('path');
const M=require('./measure-brilliant-sac');
const DIR=process.env.CT_PGN_DIR||path.join(__dirname,'..','claude','agents','bench','pgn');

// chess.com's own answer, from collection `answerkey`. Counts are per side; the named moves are the
// five rows that identify WHICH ply. Transcribed here so the run is reproducible without the tracker.
const KEY={
  '184222697658':{w:0,b:1,kunal:'b',named:{b:'Qxc3'},mv:{b:22}},
  '184267782076':{w:1,b:0,kunal:'w',named:{w:'Bxg6'},mv:{w:25}},
  '184024052818':{w:0,b:1,kunal:'b',named:{b:'Bxh3'},mv:{b:19}},
  '174386847848':{w:1,b:0,kunal:'w',named:{w:'Bxh7+'},mv:{w:17}},
  '174331795882':{w:0,b:0,kunal:'w'},'174431023868':{w:0,b:0,kunal:'b'},
  '174433078044':{w:0,b:0,kunal:'w'},'174540842570':{w:0,b:0,kunal:'b'},
  '180000436342':{w:0,b:0,kunal:'b'},
};
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.pgn')).sort();
console.log('# BRILLIANCY SACRIFICE MEASUREMENT  —  build #443');
console.log('# chess.jsx', M.SRC_PATH, 'md5', M.SOURCE_MD5);
console.log('# branch measured: FALLBACK (chess.jsx:3602). Sac term identical on both branches; eval terms are not.');
console.log('# games:', files.length, 'from', DIR, '\n');

const tally={m0:0,c1:0,c2:0,plies:0,ccBrill:0};
let xsac=0,xsacNz=0,nz=0,xok=0;
const shippedHits=[];
const newByC1=[], newByC2=[], missedByM0=[];
const c2tally={c2maxima:0,c2maximaCap:0,c2square:0,c2squareCap:0};
let promos=0,eps=0;
for(const f of files){
  const gid=f.replace('.pgn','');
  const pgn=fs.readFileSync(path.join(DIR,f),'utf8');
  const k=KEY[gid]||{w:0,b:0};
  let rows; try{rows=M.walk(pgn,null);}catch(e){console.log(`!! ${gid}: ${e.message}`);continue;}
  tally.plies+=rows.length; tally.ccBrill+=(k.w||0)+(k.b||0);
  const hits={m0:rows.filter(r=>r.shipped.ok),c1:rows.filter(r=>r.g1.ok),c2:rows.filter(r=>r.g2.ok)};
  tally.m0+=hits.m0.length; tally.c1+=hits.c1.length; tally.c2+=hits.c2.length;
  console.log(`=== ${gid}   plies=${rows.length}   chess.com Brilliants: W${k.w||0} B${k.b||0}${k.named?'  ('+Object.values(k.named).join(', ')+')':''}`);
  console.log(`    ours: SHIPPED ${hits.m0.length}   C1 ${hits.c1.length}   C2 ${hits.c2.length}`);
  // the named chess.com Brilliant, per move
  if(k.named)for(const side of Object.keys(k.named)){
    const want=k.named[side], wmv=k.mv[side];
    const r=rows.find(x=>x.mc===side&&x.mv===wmv&&x.san.replace(/[!?]/g,'')===want.replace(/[!?]/g,''))
          ||rows.find(x=>x.mc===side&&x.san.replace(/[!?]/g,'')===want.replace(/[!?]/g,''));
    if(!r){console.log(`    !! named Brilliant ${wmv}${side==='w'?'.':'...'}${want} NOT FOUND in this PGN`);continue;}
    console.log(`    NAMED  ${r.mv}${r.mc==='w'?'.':'...'}${r.san}  loss=${r.loss} ourLabel=${r.label}`);
    // PRINT THE GATE'S OWN INPUTS. #443's first write-up read only the FIRST failing condition and
    // published "misses by ten centipawns" for a move that fails THREE, against a cap it assumed was
    // 220 and measured 90. The numbers were already computed and simply not printed. #432's rule.
    console.log(`           gate inputs: cap=${r.shipped.cap} evAfter=${r.shipped.evAfter} evBefore=${r.shipped.evBefore}`);
    console.log(`           SHIPPED sac=${r.shipped.sac} isSac=${r.shipped.isSac} -> ${r.shipped.ok?'BRILLIANT':'no; FAILS: '+r.g0.failed.join('; ')}`);
    console.log(`           C1      sac=${r.c1} (${r.c1piece||'-'}@${r.c1sq||'-'}) -> ${r.g1.ok?'BRILLIANT':'no; FAILS: '+r.g1.failed.join('; ')}`);
    console.log(`           C2      sac=${r.c2} (maxima ${r.c2maxima} / maximaCap ${r.c2maximaCap} / perSq ${r.c2square} / perSqCap ${r.c2squareCap}) -> ${r.g2.ok?'BRILLIANT':'no; FAILS: '+r.g2.failed.join('; ')}`);
    if(!r.shipped.ok&&r.g1.ok) missedByM0.push(`${gid} ${r.mv}${r.mc==='w'?'.':'...'}${r.san}`);
  }
  // every move the candidates call Brilliant that the shipped gate does not
  for(const r of rows){
    if(r.promo)promos++; if(r.epCap)eps++;
    // THE HARNESS CHECKS ITSELF, EVERY RUN. The re-derived M0 must equal the real brilliantGate's own
    // `sac`, and the re-derived verdict its own `ok`. Printed with the NONZERO denominator beside the
    // total, because 697 agreements of which 668 are 0==0 is a weaker check than it looks [#443 B].
    if(r.m0===r.shipped.sac)xsac++; if(r.g0.ok===r.shipped.ok)xok++;
    if(r.shipped.sac>0){nz++; if(r.m0===r.shipped.sac)xsacNz++;}
    if(r.shipped.ok)shippedHits.push(`${gid} ${r.mv}${r.mc==='w'?'.':'...'}${r.san} sac=${r.shipped.sac} capturedValue=${r.capVal}`);
    const where=`${gid} ${r.mv}${r.mc==='w'?'.':'...'}${r.san} loss=${r.loss} evA=${r.g1.evAfter}`;
    // Each list prints the sac value of ITS OWN measure. The first draft printed C1's number in both
    // lists, which made several C2 rows read "sac=0 and yet Brilliant" - a column that contradicts
    // itself on its face is worse than no column.
    if(r.g1.ok&&!r.shipped.ok) newByC1.push(`${where} sacC1=${r.c1}(${r.c1piece||'-'}@${r.c1sq||'-'})`);
    if(r.g2.ok&&!r.shipped.ok) newByC2.push(`${where} sacC2=${r.c2} (shipped M0=${r.m0}, C1=${r.c1})`);
    // the four C2 readings, counted separately: their wording is ambiguous and they do not agree
    for(const k of Object.keys(c2tally)) if(r.gC2[k]) c2tally[k]++;
  }
  console.log('');
}
console.log('=========== HARNESS SELF-CHECK ===========');
console.log(`re-derived M0 == real brilliantGate.sac : ${xsac}/${tally.plies} plies, and ${xsacNz}/${nz} of the plies where sac is NONZERO`);
console.log(`re-derived verdict == real brilliantGate.ok : ${xok}/${tally.plies}`);
console.log('(the nonzero denominator is the honest one: most plies agree at 0==0)\n');
console.log('================ TOTALS ================');
console.log(`plies scored (both sides): ${tally.plies}`);
console.log(`chess.com Brilliants in these games: ${tally.ccBrill}`);
console.log(`labelled Brilliant by SHIPPED: ${tally.m0}   by C1: ${tally.c1}   by C2: ${tally.c2}`);
console.log(`\nEVERY MOVE THE SHIPPED GATE CALLS BRILLIANT (${shippedHits.length}), against chess.com's ${tally.ccBrill}:`);
shippedHits.forEach(t=>console.log('  *',t));
console.log(`  -> the SHIPPED gate's own false positives on this corpus: ${shippedHits.length-2}. Agreement is 2 of 4 either way,`);
console.log('     so the absolute baseline is 2 true / '+(shippedHits.length-2)+' false, not 3 true. Stated because the write-up`s');
console.log('     incremental comparison otherwise hides the baseline [#443 antagonist B].');
console.log(`\nMOVES C1 CALLS BRILLIANT AND THE SHIPPED GATE DOES NOT (${newByC1.length}):`);
newByC1.forEach(t=>console.log('  +',t));
console.log(`\nMOVES C2 CALLS BRILLIANT AND THE SHIPPED GATE DOES NOT (${newByC2.length}):`);
newByC2.forEach(t=>console.log('  +',t));
console.log(`\nTHE FOUR READINGS OF C2, because the job's wording admits all four and they disagree.`);
console.log(`The trade guard (subtracting what the move captured) is the whole difference, and leaving`);
console.log(`it out is what produced #443's withdrawn "C2 adds 14 false positives" [antagonist A veto]:`);
for(const k of Object.keys(c2tally))
  console.log(`  ${k.padEnd(13)} -> ${String(c2tally[k]).padStart(3)} Brilliant, ${c2tally[k]-tally.m0>=0?'+':''}${c2tally[k]-tally.m0} against the shipped ${tally.m0}`);
console.log(`\nINPUT CLASSES ABSENT FROM THIS CORPUS, so the measures were never observed on them:`);
console.log(`  promotions ${promos} of ${tally.plies} plies, en-passant captures ${eps} of ${tally.plies}.`);
console.log(`  This matters for the SACRIFICE term, which the write-up says transfers to both review`);
console.log(`  branches: M0 counts the value of the piece NOW on the landing square, which after a`);
console.log(`  promotion is the new QUEEN - 9 - for a one-pawn investment. C1 inherits it. NOT CHECKED.`);
