'use strict';
// gates/regress/94-review-cache-keeps-every-review.js - EVERY REVIEW HE RUNS IS KEPT, NOT THE 24 MOST RECENT. TC-R182a..b, US-R115.
//
// WHY [#550, item (79) of directOpening_2026_11_11_batch10; jobs/precompute-reviews-while-the-app-is-open-2026-09-23, part (2) of its
// remainder]. The review cache (ct_evalcache, evalCacheSet in chess.jsx) evicted to the 24 most recently touched games, so a player who
// had reviewed more than 24 games paid the full Stockfish pass again on reopening an older one - the job's step 1 is "cache every review
// he actually runs". And when the browser refused the write (storage full), the catch swallowed it and the review JUST RUN was the one
// lost. Now the bound is the store: a soft cap (EVAL_CACHE_MAX) far above 24, and on a quota refusal the least recently touched
// reviews go, a tenth at a time, until the new one fits.
//
// WHAT IT ASSERTS, at kunal761, reviewing the Opera game through the import path (drive/review importPgn):
//  (a) TC-R182a: with 30 OLDER reviews already cached (seeded, each with an older `at`), after the review the cache holds all 30 AND
//      the new one - 31 keys. (Main keeps 24.) Denominator: the seed really put 30 in, read back before the review.
//  (b) TC-R182b: with the store FULL (20 cached reviews of about 150KB each - UNDER the old cap of 24, so the count cap cannot make
//      the room and only the quota path is tested - then a filler key grown until the browser refuses a write,
//      then 512 bytes given back), the review just run IS in the cache afterwards, at least one old review was evicted to make room,
//      and every evicted one is OLDER than every survivor (least recently touched first). Denominator: the fill really reached the
//      quota (a write of 4KB more is refused before the review).
const L=require('../lib');const R=require('../drive/review');

async function cacheKeys(b){return b.page.evaluate(()=>{try{const a=JSON.parse(localStorage.getItem('ct_evalcache')||'{}');return Object.keys(a).map(k=>({k,at:a[k].at||0,n:(a[k].evW||[]).length}));}catch(e){return null;}});}

L.run(async()=>{
  // (a) 30 older reviews survive a new one
  {
    const b=await L.launch({geo:'kunal761',name:'cache-30',store:{ct_pool:'3'}});await b.open();
    const seeded=await b.page.evaluate(()=>{const all={};const t=Date.now()-86400000*30;for(let i=0;i<30;i++)all['gseed'+i+'-40']={evW:new Array(41).fill(0.1),at:t+i*1000};localStorage.setItem('ct_evalcache',JSON.stringify(all));return Object.keys(JSON.parse(localStorage.getItem('ct_evalcache'))).length;});
    L.say(seeded===30,'TC-R182a DENOMINATOR 30 older reviews are in the cache before the review (read back: '+seeded+')',{seeded});
    let ok=true;try{await R.ensureReview(b,'opera');await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(800);}catch(e){ok=false;L.say(false,'TC-R182a the Opera review reached its summary',String(e).slice(0,160));}
    if(ok){const ks=await cacheKeys(b)||[];const old=ks.filter(x=>/^gseed/.test(x.k)).length,fresh=ks.filter(x=>!/^gseed/.test(x.k));
      L.say(fresh.length===1&&fresh[0].n>10,'TC-R182a the review just run is cached, with its evaluations ('+(fresh[0]?fresh[0].n:0)+' plies)',fresh);
      L.say(old===30&&ks.length===31,'TC-R182a and all 30 older reviews are still cached - '+old+' of 30, '+ks.length+' keys (it used to keep 24)',{old,total:ks.length});}
    await b.close();
  }
  // (b) a full store evicts the oldest, never the review just run
  {
    const b=await L.launch({geo:'kunal761',name:'cache-full',store:{ct_pool:'3'}});await b.open();
    const fill=await b.page.evaluate(()=>{const all={};const t=Date.now()-86400000*30;const pad='x'.repeat(150000);
      for(let i=0;i<20;i++)all['gseed'+i+'-40']={evW:new Array(41).fill(0.1),pad,at:t+i*1000};
      localStorage.setItem('ct_evalcache',JSON.stringify(all));
      let fillLen=0;let step=1<<20;localStorage.setItem('ct_fill','');
      while(step>=256){try{localStorage.setItem('ct_fill','f'.repeat(fillLen+step));fillLen+=step;}catch(e){step>>=1;}}
      localStorage.setItem('ct_fill','f'.repeat(Math.max(0,fillLen-512)));
      let refused=false;try{localStorage.setItem('ct_probe','p'.repeat(4096));localStorage.removeItem('ct_probe');}catch(e){refused=true;}
      return {fillLen,refused,cached:Object.keys(JSON.parse(localStorage.getItem('ct_evalcache'))).length};});
    L.say(fill.refused&&fill.cached===20,'TC-R182b DENOMINATOR the store is full before the review: 20 reviews of ~150KB cached (under the old cap of 24, so only the quota path can make room), filler '+fill.fillLen+' chars, and a 4KB write is refused',fill);
    let ok=true;try{await R.ensureReview(b,'opera');await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(800);}catch(e){ok=false;L.say(false,'TC-R182b the Opera review reached its summary on a full store',String(e).slice(0,160));}
    if(ok){const ks=await cacheKeys(b)||[];const seeds=ks.filter(x=>/^gseed/.test(x.k)),fresh=ks.filter(x=>!/^gseed/.test(x.k));
      const gone=[];for(let i=0;i<20;i++)if(!seeds.find(x=>x.k==='gseed'+i+'-40'))gone.push(i);
      L.say(fresh.length===1&&fresh[0].n>10,'TC-R182b on a full store the review just run IS cached ('+(fresh[0]?fresh[0].n:0)+' plies) - before, the refused write lost it',fresh);
      L.say(gone.length>=1&&gone.length<20,'TC-R182b room was made by evicting old reviews: '+gone.length+' of 20 went',gone);
      const maxGone=gone.length?Math.max(...gone):-1,minKept=seeds.length?Math.min(...seeds.map(x=>+x.k.match(/^gseed(\d+)/)[1])):99;
      L.say(gone.length>=1&&maxGone<minKept,'TC-R182b and the ones evicted were the least recently touched: evicted '+(gone.join(',')||'none')+', oldest survivor gseed'+minKept,{gone,minKept});}
    await b.close();
  }
},'94-review-cache-keeps-every-review');
