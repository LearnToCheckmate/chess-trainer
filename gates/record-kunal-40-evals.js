// gates/record-kunal-40-evals.js - #553 jobs/widen-the-input-space part (c): RECORD THE ENGINE'S OUTPUT FOR THE 40-GAME CORPUS ONCE, so the
// gate that walks every ply of it (gate 239) does not run Stockfish 2405 times on every suite.
//
// REPORT-ONLY: not a gate, asserts nothing. It reviews each game of gates/fixtures/kunal/kunal-40.pgn in the bundle under test (CT_APP),
// through the Review screen's own import (gates/drive/review.js importPgn), and keeps the review cache entry the app wrote for it
// (localStorage ct_evalcache: evW, ev2W, bU, aU - the raw engine output, BEFORE grading). Gate 239 seeds each entry back and imports the
// game again, so the app takes its cache path and GRADES, EXPLAINS AND COUNTS LIVE in the bundle under test: only the engine search is
// frozen. What a change to sfGradePly, the tallies or the sentences does is therefore seen; what a change to the engine itself does is not
// (re-record to see it - the file names the bundle and stamp it was recorded on).
// usage: CT_APP=<bundle> node gates/record-kunal-40-evals.js [out.json] [maxGames]   (default out gates/fixtures/kunal/kunal-40-evals.json)
//   resumes: games already in out are skipped. CT_POOL (default 3) is the review worker pool.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('./lib.js');
const R=require('./drive/review.js');
const OUT=process.argv[2]||path.join(__dirname,'fixtures','kunal','kunal-40-evals.json');
const MAX=parseInt(process.argv[3]||'999',10);
const PGN=fs.readFileSync(path.join(__dirname,'fixtures','kunal','kunal-40.pgn'),'utf8');
const games=PGN.split(/(?=\[Event )/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
let rec={about:'raw review-cache entries (ct_evalcache) for gates/fixtures/kunal/kunal-40.pgn, written by gates/record-kunal-40-evals.js; gate 239 seeds them back',games:{}};
try{rec=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch(e){}
(async()=>{
  const fresh=async()=>{const b=await L.launch({geo:'kunal761',store:{ct_pool:process.env.CT_POOL||'3'}});await b.open();return b;};
  let b=await fresh();
  const stamp=await b.page.evaluate(()=>{try{return (document.body.innerText.match(/#\d{3}[^\n]*ET/)||[''])[0];}catch(e){return '';}});
  for(const v of Object.values(rec.games))if(!v.bundleMd5&&rec.recordedOn)v.bundleMd5=rec.recordedOn.bundleMd5;   // a resumed run: each game keeps the bundle it was recorded on
  rec.recordedOn={bundleMd5:(()=>{try{return require('crypto').createHash('md5').update(fs.readFileSync(process.env.CT_APP||path.join(__dirname,'..','app.js'))).digest('hex').slice(0,12);}catch(e){return null;}})(),stamp,pool:process.env.CT_POOL||'3',at:new Date().toISOString()};
  let n=0;
  for(let gi=0;gi<games.length;gi++){
    if(n>=MAX)break;
    const g=games[gi],link=tag(g,'Link');if(rec.games[link])continue;
    const t0=Date.now();
    try{
      await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
      await R.importPgn(b,g,300000);
      const got=await b.page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('ct_evalcache')||'{}');const k=Object.keys(a);
        const v=window.__ctReview;return {keys:k,entry:k.length===1?a[k[0]]:null,plies:v&&v.plies?v.plies.length:null};});
      if(!got.entry){console.log('ERR',gi,link,'cache holds '+got.keys.length+' keys after the review, not 1');continue;}
      const e=got.entry;delete e.at;
      rec.games[link]={gi,key:got.keys[0],plies:got.plies,det:e.det||0,entry:e,secs:Math.round((Date.now()-t0)/1000),bundleMd5:rec.recordedOn.bundleMd5};
      fs.writeFileSync(OUT,JSON.stringify(rec));
      console.log(`${n+1} game ${gi} ${link} plies ${got.plies} det ${e.det} ${rec.games[link].secs}s`);
    }catch(err){console.log('ERR',gi,link,String(err).slice(0,200));
      // one stuck review leaves the screen where toList cannot find the list (measured: a 300 s timeout at game 29, then 10 'did not open'), so start a fresh browser
      try{await b.browser.close();}catch(e){}b=await fresh();}
    n++;
  }
  await b.browser.close();
  console.log('recorded '+Object.keys(rec.games).length+' of '+games.length+' games in '+OUT);
  L.done();
})().catch(e=>{console.log('FATAL',e);process.exit(1);});
