// gates/measure-accuracy-vs-chesscom.js - #549 item (82),
// jobs/accuracy-reads-38-and-16-points-under-chesscom-on-a-game-that-ends-in-a-blunder-2026-10-11.
// REPORT-ONLY: not a gate, asserts nothing, changes nothing; the grading formula is Kunal's to choose after the numbers. Drives the bundle's Review over answer-key PGNs and records, per game, our per-side accuracy
// (window.__ctReview.summary), the per-move accuracies (analysis[i].macc / wdrop, the exact inputs gameAcc reads)
// and chess.com's stored ApiWhiteAccuracy / ApiBlackAccuracy. Appends one JSON line per game to OUT.
// usage: CT_APP=<bundle> node gates/measure-accuracy-vs-chesscom.js <key.pgn> <out.jsonl> [maxGames] [firstLinkSubstring]
//   key.pgn: the tracker's docs/chesscom-reviewed-games-kunal2023-since-2026-09-01 field pgn (each game carries
//   ApiWhiteAccuracy/ApiBlackAccuracy). Never fetch chess.com. CT_POOL (default 2) is the review worker pool.
//   A time-boxed run takes a seeded-shuffle prefix, so a partial run is an unbiased sample; re-running resumes.
//   The bundle must expose window.__ctReview (#549 item (55)). Then: python3 gates/measure-accuracy-vs-chesscom-analyse.py <out.jsonl>
'use strict';
const fs=require('fs');
const L=require('./lib.js');
const R=require('./drive/review.js');
const [,,KEY,OUT,MAXS,FIRST]=process.argv;
const MAX=parseInt(MAXS||'999',10);
const games=fs.readFileSync(KEY,'utf8').split(/\n\n(?=\[)/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
// deterministic shuffle (LCG, seed 82) so a time-boxed prefix is an unbiased sample of the key
let s=82;const rnd=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};
const order=games.map((g,i)=>[rnd(),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
if(FIRST){const fi=games.findIndex(g=>(tag(g,'Link')||'').includes(FIRST));if(fi>=0){order.splice(order.indexOf(fi),1);order.unshift(fi);}}
const done=new Set();try{for(const l of fs.readFileSync(OUT,'utf8').split('\n'))if(l.trim())done.add(JSON.parse(l).link);}catch(e){}
(async()=>{
  const b=await L.launch({geo:'kunal761',store:{ct_pool:process.env.CT_POOL||'2'}});
  await b.open();
  let n=0;
  for(const gi of order){
    if(n>=MAX)break;
    const g=games[gi],link=tag(g,'Link');if(done.has(link))continue;
    const pl=(g.split('\n\n')[1]||'').trim();
    if(!/\d\.\s*\S/.test(pl)){continue;}
    const t0=Date.now();
    try{
      await R.importPgn(b,g,300000);
      const r=await b.page.evaluate(()=>{const v=window.__ctReview;if(!v)return null;
        return {sum:{w:v.summary.w,b:v.summary.b,book:v.summary.book},
          an:v.analysis.map(o=>({cls:o.cls&&o.cls.label,macc:o.macc,wdrop:o.wdrop,eb:o.evalBefore,ea:o.evalAfter,loss:o.loss,san:o.san||o.move||null}))};});
      const row={gi,link,white:tag(g,'White'),black:tag(g,'Black'),result:tag(g,'Result'),term:tag(g,'Termination'),tc:tag(g,'TimeClass')||tag(g,'TimeControl'),
        ccW:+tag(g,'ApiWhiteAccuracy'),ccB:+tag(g,'ApiBlackAccuracy'),ourW:r&&r.sum.w.accuracy,ourB:r&&r.sum.b.accuracy,book:r&&r.sum.book,
        countsW:r&&r.sum.w.counts,countsB:r&&r.sum.b.counts,an:r&&r.an,secs:Math.round((Date.now()-t0)/1000),at:new Date().toISOString()};
      fs.appendFileSync(OUT,JSON.stringify(row)+'\n');
      console.log(`${n+1} ${link} cc ${row.ccW}/${row.ccB} ours ${row.ourW}/${row.ourB} ${row.secs}s`);
    }catch(e){console.log('ERR',link,String(e).slice(0,200));fs.appendFileSync(OUT,JSON.stringify({gi,link,err:String(e).slice(0,300)})+'\n');if(/has been closed/.test(String(e))){console.log('STOP: the browser is gone (measured at #549: after 47 games one run lost its browser and every later game errored); re-run to resume');break;}try{await b.open();}catch(_){}}
    n++;
  }
  await b.browser.close();
  L.done();
})().catch(e=>{console.log('FATAL',e);process.exit(1);});
