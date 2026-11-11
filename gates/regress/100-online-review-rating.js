'use strict';
// gates/regress/100-online-review-rating.js - THE REVIEW OF AN ONLINE GAME SHOWS THE RATINGS THE PLAYER BARS SHOW. TC-R57 (US-R46).
//
// WHY [#550, item (93) of directOpening_2026_11_11_batch10; jobs/played-game-review-shows-no-rating-though-the-app-holds-one-2026-09-28].
// Part 1 of the job, "cheap and clearly right": an online game's ratings are held (og.w/og.b.rating, which the player bars print), and
// #547 (8a40f10) made reviewPlayedGame carry them as WhiteElo/BlackElo - but it was NEVER DRIVEN, because an online game needs the real
// Firebase bridge, which this container cannot reach (#548's outcome: 'built and cannot be driven here'). Gate 96 (#550) built a stand-in
// window.CTCloud for exactly that hole; this gate reuses its shape to drive the case the job wrote: the rating on the review summary EQUALS
// the rating the player bar shows for the same side of the same game, read off both surfaces in one run (so neither can be satisfied by a
// constant). Part 2 (vs Computer and Pass & Play) is Kunal's Desk question and is NOT asserted here.
//
// WHAT IT ASSERTS, at kunal761 and se, joining a FINISHED stand-in online game (Rival 1512 as White beat Me 1437 by resignation, 6 plies)
// through ?g=: the bars print 1512 and 1437 (DENOMINATOR: both read, and they differ, so a swapped side cannot pass); 'Review this game'
// opens the review; its summary's rev-rating-w and rev-rating-b equal the White and Black bar ratings respectively.
// CONTROL-RECORD: ef99d00 2026-11-11 total=9 red=2 scope=trial:4a34f48c886a how=#550 item (93): c93, reviewPlayedGame writing no WhiteElo/BlackElo for an online game - the summary's ratings are absent, so both 'summary shows the bars' ratings' lines are red (kunal761, se); the DENOMINATORS, review-opens and zero-errors lines green
const L=require('../lib');
const STUB=()=>{
  const me={uid:'u-me',name:'Me'},them={uid:'u-them',name:'Them'};
  const doc={id:'g1',code:'ABCDE',status:'done',moves:['e4','e5','Nf3','Nc6','Bc4','Bc5'],chat:[],tc:null,moveAt:Date.now(),w:{uid:them.uid,name:'Rival',rating:1512},b:{uid:me.uid,name:'Me',rating:1437},result:{winner:'w',reason:'resign'}};
  const watchers=[];const pushes=[];
  const deliver=()=>{const snap=JSON.parse(JSON.stringify(doc));for(const cb of watchers)try{cb(snap);}catch(e){}};
  const base={ready:Promise.resolve(true),onAuth(cb){setTimeout(()=>cb(me),50);return ()=>{};},
    gameJoin:async()=>({id:'g1',color:'b'}),gameWatch(id,cb){watchers.push(cb);setTimeout(deliver,30);return ()=>{};},
    gamePush:async(id,d)=>{pushes.push(JSON.parse(JSON.stringify(d)));Object.assign(doc,d);setTimeout(deliver,20);return true;}};
  window.__vc={doc,pushes,them,deliver,push(d){Object.assign(doc,d);deliver();}};
  const stub=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null;}});
  // index.html's own bridge script assigns window.CTCloud AFTER this init script; a setter that ignores the write keeps the stand-in
  Object.defineProperty(window,'CTCloud',{configurable:false,get(){return stub;},set(v){}});
  try{const c=document.createElement('canvas');c.width=64;c.height=48;
    navigator.mediaDevices.getUserMedia=async()=>{const s=c.captureStream(5);return s;};}catch(e){}
};

L.run(async()=>{
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'online-rating-'+geo,store:{ct_pool:'3'}});await b.ctx.addInitScript(STUB);await b.open('index.html?g=ABCDE');
    let ok=true;try{await b.page.waitForSelector('[data-ct="pbar-rating-w"],[data-ct="pbar-rating-b"]',{timeout:20000});await b.settle(800);}catch(e){ok=false;}
    const bars=ok?await b.page.evaluate(()=>{const t=s=>{const e=document.querySelector(s);return e?e.textContent.trim():null;};return {w:t('[data-ct="pbar-rating-w"]'),b:t('[data-ct="pbar-rating-b"]')};}):{};
    L.say(ok&&/^\d{3,4}$/.test(bars.w||'')&&/^\d{3,4}$/.test(bars.b||'')&&bars.w!==bars.b,geo+': TC-R57 DENOMINATOR the finished online game is on screen and its player bars print two different ratings (White '+bars.w+', Black '+bars.b+')',bars);
    let rev=false;if(ok){try{await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Review this game/.test(e.textContent));if(x)x.scrollIntoView({block:'center'});});await b.tapText(/Review this game$/,{wait:1500});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(800);rev=true;}catch(e){L.note(geo+' review: '+String(e).slice(0,120));}}
    L.say(rev,geo+': TC-R57 "Review this game" opens the review summary of the online game',{rev});
    const sum=rev?await b.page.evaluate(()=>{const t=s=>{const e=document.querySelector(s);return e?e.textContent.trim():null;};return {w:t('[data-ct="rev-rating-w"]'),b:t('[data-ct="rev-rating-b"]')};}):{};
    L.say(rev&&sum.w===bars.w&&sum.b===bars.b,geo+': TC-R57 the review summary shows the ratings the player bars showed for the same sides (summary White '+sum.w+', Black '+sum.b+')',{bars,sum});
    L.say(b.errs.length===0,geo+': TC-R57 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'100-online-review-rating');
