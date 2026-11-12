'use strict';
// gates/regress/131-accuracy-near-chesscom.js - THE GAME ACCURACY READS NEAR CHESS.COM'S. US-R139 / TC-R207a..c.
//
// WHY [#550 item (44); run-answers build__1794388896663-a39, Kunal 12 Nov: "Change the formula";
// jobs/accuracy-reads-38-and-16-points-under-chesscom-on-a-game-that-ends-in-a-blunder-2026-10-11]: one blunder dragged a good game's accuracy
// far under chess.com's (the job's game read 16 against 54), because the harsh half of the average let a near-zero move count for everything.
// The change: in the harsh half no single move counts as worse than 25, and the result is lowered 10.
// WHAT IT READS: chess.jsx through gates/engine-extract.js (gameAcc, winPct, ACC_HARM_FLOOR, ACC_SHIFT) - NOT the bundle, which is minified so
// gameAcc has no name in it; gate 79 reads the same extractor for the same reason, and the extractor prints the source md5 it read. CT_SRC
// selects another chess.jsx (the control). The fixture gates/fixtures/accuracy-vs-chesscom-196.json is the 196 games of his account that
// gates/measure-accuracy-vs-chesscom.js reviewed in the app (per move: eval before, eval after, grade, move accuracy; per game: the book length
// and chess.com's own accuracy for each side) - evaluations and numbers only, no names or links.
// THE AGGREGATION IS THE APP'S: the per-move accuracies of one side outside the book (Brilliant and Great book moves kept), gameAcc over the
// White-POV win% series, clamped to 15..99.5 as review() clamps it.
// KNOW ITS LIMIT: the per-move accuracies were computed when the fixture was recorded (build #550, the shipped moveAcc); a change to moveAcc
// is not seen here.
const L=require('../lib');
const fs=require('fs'),path=require('path');
const E=require('../engine-extract');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','accuracy-vs-chesscom-196.json'),'utf8'));
L.run(async()=>{
  console.log('     source: '+E.SRC_PATH+'  md5 '+E.SOURCE_MD5);
  let n=0,se=0,w10=0,worst=0,wg=null;
  for(const r of D){const an=r.an;const ww=[E.winPct((an[0][0]||0)*100)].concat(an.map(o=>E.winPct((o[1]||0)*100)));
    for(const side of ['w','b']){const cc=side==='w'?r.ccW:r.ccB;if(cc==null)continue;const accs=[],idx=[];
      an.forEach((o,i)=>{if((i%2===0)!==(side==='w'))return;if(i<r.book&&!['Brilliant','Great'].includes(o[2]))return;if(typeof o[3]!=='number')return;accs.push(o[3]);idx.push(i);});
      if(!accs.length)continue;const g=E.gameAcc(ww,accs,idx);const a=Math.max(15,Math.min(99.5,g==null?100:g));const e=Math.abs(a-cc);n++;se+=e;if(e<=10)w10++;if(e>worst){worst=e;wg={ours:+a.toFixed(1),cc};}}}
  const mae=n?se/n:null;
  L.say(D.length===194&&n===388,'TC-R207 PRECONDITION the fixture holds 194 reviewed games and 388 player-games with a chess.com number ('+D.length+' games, '+n+' sides)',{games:D.length,n});
  L.say(mae!=null&&mae<=5.5,'TC-R207a the mean distance from chess.com\'s accuracy is at most 5.5 points ('+(mae!=null?mae.toFixed(2):'none')+'; the old formula read 10.09)',{mae});
  L.say(w10>=330,'TC-R207b at least 330 of the 388 are within 10 points of chess.com ('+w10+'; the old formula 220)',{w10});
  L.say(worst<=25,'TC-R207c no game is more than 25 points from chess.com (worst '+worst.toFixed(1)+', ours '+(wg&&wg.ours)+' against '+(wg&&wg.cc)+'; the old formula 39.8)',wg);
},'131-accuracy-near-chesscom');
