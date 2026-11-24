'use strict';
// gates/regress/190-review-depth-inside-a-review.js - GOING DEEPER INSIDE AN OPEN REVIEW. TC-R280..TC-R285, US-R200.
//
// WHY [#553, batch 14 entry 22; jobs/review-depth-per-game-on-the-new-game-card-2026-11-15 part (4); Amber: flags/amber-553-review-depth-in-review].
// Kunal's design: "INSIDE A REVIEW: one compact row in the review sheet, 'Review depth: Quick' with a down arrow, goes deeper on that game without
// leaving; while it runs, a slim progress line sits under the Game review title ('Going deeper: Deeper, 14 of 33'); the board and the explanation
// do not move, and the numbers update as it goes." Gate 173 covers the game card's button and a review started from it; this gate covers the
// review sheet's control, the pass behind the open review, and the live engine line at the review's own depth.
//
// WHAT IT ASSERTS, at 375x761 (kunal761, ct_safe 51,31) and 320x568 (se). Every checked line starts with 'TC-R28N <geo> '.
//  The Opera Game (33 plies) is opened from the Review list at Quick, the moves view is put on ply 10 and the board is flipped (from the sheet).
//   TC-R280 the More sheet carries 'Review depth: Quick' with a 44px tap box on the opening's line; the opening's name is not cut (no text box
//           overflows its own height or width); and the sheet fits the screen without scrolling (scrollHeight <= clientHeight + 1).
//   TC-R281 tapping it opens the depth menu over the sheet with Quick ticked; picking Deep closes the menu and the sheet and leaves him in the
//           moves view on the same ply (no summary, no analysing panel); the 'Going deeper: Deep, N of 33' line shows (under the Game review
//           title where the moves view has one, in the bottom player bar's second line where it has none); and the board and the explanation
//           box did not move by a pixel.
//   TC-R282 every search of that pass is 'go depth 18' (the Worker's own messages, recorded at the Worker; at least 34 for 34 positions; none at
//           16 or any other depth); when it ends the progress line is gone, the open review is the depth-18 one (review.engine level 1, depth
//           18), he is still on ply 10 of the moves view with the board still flipped, the board did not move, and the game's pick is stored
//           (ct_gdepth 1).
//   TC-R283 the live engine line ('Analyze with the engine') of that review is searched at the review's own depth: at least one 'go depth 18'
//           and none at 16.
//   TC-R284 (kunal761 only) leaving the review while a Deeper pass runs stops it: no search is posted after leaving, and nothing of the
//           unfinished pass is stored (no '-d20' evaluation key).
//   TC-R285 zero app errors.
//
// CONTROLS: the pairs file gates/pairs/jobs/review-depth-per-game-on-the-new-game-card-2026-11-15--inside-a-review.json and its three breaks.
const L=require('../lib');const R=require('../drive/review');
const D0=1763000000000,DAY=86400000;const ME=['cc','jsmiller1112','Jsmiller1112'];
const G=[{src:'cc',acct:ME[1],white:ME[2],black:'DukeKarl',wr:'win',tc:'blitz',date:D0-DAY,pgn:R.PGN_OPERA},
  {src:'cc',acct:ME[1],white:ME[2],black:'magnus',wr:'win',tc:'blitz',date:D0-2*DAY,pgn:'[White "Jsmiller1112"]\n[Black "magnus"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *'}];
const KEY=G[0].src+':'+G[0].date+':'+G[0].white+':'+G[0].black;
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':G},ct_pool:'3',ct_bril_reset_v1:'1'};
const PLY=10,N=R.OPERA_PLIES;
function recordGo(){try{const RW=window.Worker;if(!RW||window.__ctGo)return;window.__ctGo=[];
  const W=function(url,o){const w=new RW(url,o);if(!/stockfish/i.test(String(url)))return w;const pm=w.postMessage.bind(w);w.postMessage=function(m){try{const x=/^go depth (\d+)$/.exec(String(m));if(x)window.__ctGo.push(+x[1]);}catch(e){}return pm.apply(null,arguments);};return w;};
  W.prototype=RW.prototype;window.Worker=W;}catch(e){}}
const goList=(b)=>b.page.evaluate(()=>(window.__ctGo||[]).slice());
const goReset=(b)=>b.page.evaluate(()=>{if(window.__ctGo)window.__ctGo.length=0;});
const near=(a,b,e)=>Math.abs(a-b)<=(e==null?0.6:e);
// the moves view's state: the ply counter ('10/33'), whether the move strip is up, the summary, the progress line and where it sits
const read=(b)=>b.page.evaluate((n)=>{const q=e=>{if(!e)return null;const x=e.getBoundingClientRect();return {l:x.left,t:x.top,r:x.right,b:x.bottom,w:x.width,h:x.height};};
  const vis=s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
  let ply=null;for(const e of document.querySelectorAll('span')){const m=/^(\d+)\/(\d+)$/.exec((e.textContent||'').trim());if(m&&+m[2]===n&&e.getBoundingClientRect().width>0){ply=+m[1];break;}}
  const dp=document.querySelector('[data-ct="deep-progress"]');const rv=window.__ctReview;
  return {ply,moves:vis('[data-ct="strip-row"]'),summary:vis('[data-ct="rev-summary"]'),sheet:!!document.querySelector('[data-ct="rev-sheet"]'),menu:!!document.querySelector('[data-ct="depth-menu"]'),
   prog:dp?dp.textContent.trim():null,progR:q(dp),inTitle:!!(dp&&dp.closest('[data-ct="top-title-box"]')),inBar:!!(dp&&dp.closest('[data-ct="pbar-bottom"]')),
   title:q(document.querySelector('[data-ct="rev-head"]')),why:q(document.querySelector('[data-ct="rev-why"]')),
   eng:rv&&rv.engine?{depth:rv.engine.depth,level:rv.engine.level}:null,gd:(()=>{try{return JSON.parse(localStorage.getItem('ct_gdepth')||'{}');}catch(e){return {};}})(),
   ec:(()=>{try{return Object.keys(JSON.parse(localStorage.getItem('ct_evalcache')||'{}'));}catch(e){return [];}})()};},N);
// a rect from read() is {l,t,w,h}; the board from b.board() is {x,y,w,h}
const same=(a,b)=>{if(!a||!b)return false;const L0=a.l!=null?a.l:a.x,T0=a.t!=null?a.t:a.y,L1=b.l!=null?b.l:b.x,T1=b.t!=null?b.t:b.y;return [L0,T0,L1,T1,a.w,a.h,b.w,b.h].every(v=>typeof v==='number')&&near(L0,L1)&&near(T0,T1)&&near(a.w,b.w)&&near(a.h,b.h);};

L.run(async()=>{
  for(const [gn,geo] of [['kunal761','kunal761'],['320x568','se']]){
    const b=await L.launch({geo,name:'g190-'+geo,store:STORE});await b.ctx.addInitScript(recordGo);await b.open();
    let ok=false;
    try{await b.tile('Review');await b.settle(1300);await b.page.locator('[data-ct="game-opp"]').first().click();
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(900);
      await R.startReview(b);await R.goPly(b,PLY);
      await b.tapCt('rev-more',500);await b.tapText(/^Flip board$/);await b.settle(600);ok=true;}catch(e){L.note(gn+' setup: '+String(e).slice(0,160));}
    const bd0=await b.board();const s0=await read(b);
    L.say(ok&&s0.moves&&s0.ply===PLY&&!!bd0&&bd0.flip===true&&!!s0.eng&&s0.eng.level===0&&s0.eng.depth===16,'TC-R281 '+gn+' PRECONDITION the Opera Game is open at Quick (depth '+(s0.eng&&s0.eng.depth)+') in the moves view on ply '+s0.ply+' with the board flipped ('+(bd0&&bd0.flip)+')',{s0:{ply:s0.ply,moves:s0.moves,eng:s0.eng}});
    // TC-R280 the sheet
    let sh=null;try{await b.tapCt('rev-more',500);sh=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-sheet"]');const d=document.querySelector('[data-ct="rev-depth"]');const o=document.querySelector('[data-ct="rev-opening"]');
      const r=d?d.getBoundingClientRect():null;const sr=s?s.getBoundingClientRect():null;
      return s?{sh:s.scrollHeight,ch:s.clientHeight,txt:d?d.textContent.replace(/\s+/g,' ').trim():null,h:r?r.height:0,inSheet:!!(d&&s.contains(d)),top:r&&sr?r.top-sr.top:null,
        open:o?{t:o.textContent.trim(),sh:o.scrollHeight,ch:o.clientHeight,sw:o.scrollWidth,cw:o.clientWidth}:null}:null;});}catch(e){L.note(gn+' sheet: '+String(e).slice(0,120));}
    L.say(!!sh&&/^Review depth: Quick\s*▾$/.test(sh.txt||'')&&sh.inSheet&&sh.h>=44-0.6&&sh.top<60,'TC-R280 '+gn+' the More sheet carries "'+(sh&&sh.txt)+'" at its top ('+(sh&&sh.top!=null?sh.top.toFixed(0):'-')+'px in) with a '+(sh&&sh.h)+'px tap box',sh);
    L.say(!!sh&&!!sh.open&&/Philidor/.test(sh.open.t)&&sh.open.sh<=sh.open.ch+1&&sh.open.sw<=sh.open.cw+1,'TC-R280 '+gn+' the opening\'s name beside it is not cut ("'+(sh&&sh.open&&sh.open.t)+'": '+(sh&&sh.open?sh.open.sh+' in '+sh.open.ch+' tall, '+sh.open.sw+' in '+sh.open.cw+' wide':'absent')+')',sh&&sh.open);
    L.say(!!sh&&sh.sh<=sh.ch+1,'TC-R280 '+gn+' the sheet fits the screen without scrolling: '+(sh&&sh.sh)+' in '+(sh&&sh.ch),sh&&{sh:sh.sh,ch:sh.ch});
    // TC-R281 pick Deep
    let menu=null;try{await b.tapCt('rev-depth',450);menu=await b.page.evaluate(()=>{const m=document.querySelector('[data-ct="depth-menu"]');if(!m)return null;return [...m.querySelectorAll('[data-ct="depth-opt"]')].map(o=>o.getAttribute('aria-checked')==='true');});}catch(e){L.note(gn+' menu: '+String(e).slice(0,120));}
    L.say(!!menu&&menu.length===4&&menu[0]===true&&menu.filter(Boolean).length===1,'TC-R281 '+gn+' the row opens the depth menu over the sheet with Quick ticked',menu);
    await goReset(b);const t0=Date.now();
    try{await b.page.locator('[data-ct="depth-opt"][data-level="1"]').click();}catch(e){L.note(gn+' pick: '+String(e).slice(0,120));}
    let s1=null;for(let i=0;i<40;i++){await b.settle(250);s1=await read(b);if(s1.prog&&/ [1-9]\d* of /.test(s1.prog))break;}
    const bd1=await b.board();
    L.say(!!s1&&!s1.menu&&!s1.sheet&&s1.moves&&!s1.summary&&s1.ply===PLY,'TC-R281 '+gn+' picking Deep closes the menu and the sheet and leaves him in the moves view on ply '+(s1&&s1.ply)+' (summary up: '+(s1&&s1.summary)+')',s1&&{menu:s1.menu,sheet:s1.sheet,moves:s1.moves,summary:s1.summary,ply:s1.ply});
    const where=L.geoIs(geo,320,568)?(s1&&s1.inBar):(s1&&s1.inTitle);
    L.say(!!s1&&/^Going deeper: Deep, \d+ of 33$/.test(s1.prog||'')&&!!where&&!!s1.progR&&s1.progR.r<=b.page.viewportSize().width+0.6,'TC-R281 '+gn+' the line reads "'+(s1&&s1.prog)+'" '+(L.geoIs(geo,320,568)?'in the bottom player bar (no title row here)':'under the Game review title'),s1&&{inTitle:s1.inTitle,inBar:s1.inBar,r:s1.progR});
    L.say(!!s1&&same(bd0,bd1)&&same(s0.why,s1.why)&&(L.geoIs(geo,320,568)||same(s0.title,s1.title)),'TC-R281 '+gn+' while it runs the board ('+(bd1&&bd1.y.toFixed(1))+', '+(bd1&&bd1.w.toFixed(1))+'), the explanation box'+(L.geoIs(geo,320,568)?'':' and the title row')+' did not move',{bd0,bd1,why0:s0.why,why1:s1&&s1.why,t0:s0.title,t1:s1&&s1.title});
    // TC-R282 the pass
    let s2=null;for(let i=0;i<240;i++){await b.settle(1000);s2=await read(b);if(!s2.prog&&s2.eng&&s2.eng.level===1)break;if(!s2.prog&&i>5)break;}
    const secs=(Date.now()-t0)/1000;const go=await goList(b);const bd2=await b.board();
    L.note(gn+' the Deep pass behind the open review took '+secs.toFixed(1)+' s; '+go.length+' searches; depths '+JSON.stringify([...new Set(go)]));
    L.say(go.filter(d=>d===18).length>=N+1&&go.every(d=>d===18),'TC-R282 '+gn+' every search of the pass is at depth 18: '+go.filter(d=>d===18).length+' at 18, '+go.filter(d=>d!==18).length+' at another depth',{depths:[...new Set(go)]});
    L.say(!!s2&&!s2.prog&&!!s2.eng&&s2.eng.level===1&&s2.eng.depth===18,'TC-R282 '+gn+' when it ends the line is gone and the open review is the depth-18 pass (engine '+JSON.stringify(s2&&s2.eng)+')',s2&&{prog:s2.prog,eng:s2.eng});
    L.say(!!s2&&s2.moves&&!s2.summary&&s2.ply===PLY&&!!bd2&&bd2.flip===true&&same(bd0,bd2),'TC-R282 '+gn+' and he is still on ply '+(s2&&s2.ply)+' of the moves view with the board flipped ('+(bd2&&bd2.flip)+') and unmoved',s2&&{moves:s2.moves,summary:s2.summary,ply:s2.ply});
    L.say(!!s2&&s2.gd[KEY]===1,'TC-R282 '+gn+' the game\'s pick is stored (ct_gdepth '+(s2&&s2.gd[KEY])+')',s2&&s2.gd);
    // TC-R283 the engine line at the review's depth
    await goReset(b);let el=null;try{await R.engineSet(b,true);for(let i=0;i<30;i++){await b.settle(500);el=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?e.textContent.trim():null;});if(el&&/\d/.test(el))break;}}catch(e){L.note(gn+' engine line: '+String(e).slice(0,120));}
    const go3=await goList(b);
    L.say(go3.includes(18)&&!go3.includes(16),'TC-R283 '+gn+' the engine line is searched at the review\'s depth: '+JSON.stringify(go3)+' (line "'+String(el||'').slice(0,40)+'")',go3);
    // TC-R284 leaving stops a pass (kunal761)
    if(L.geoIs(geo,375,761)){
      let s3=null,stopped=null;try{await R.engineSet(b,false);await b.tapCt('rev-more',500);await b.tapCt('rev-depth',450);await goReset(b);await b.page.locator('[data-ct="depth-opt"][data-level="2"]').click();
        for(let i=0;i<40;i++){await b.settle(500);s3=await read(b);if(s3.prog&&/ [1-9]\d* of /.test(s3.prog))break;}
        await b.tapCt('rev-back',600);await b.tapText(/^‹ Back to games$/);await b.settle(800);const n0=(await goList(b)).length;await b.settle(6000);const n1=(await goList(b)).length;const s4=await read(b);
        stopped={n0,n1,d20:s4.ec.filter(k=>/-d20$/.test(k)),gd:s4.gd[KEY]};}catch(e){L.note(gn+' leave: '+String(e).slice(0,140));}
      L.say(!!s3&&/^Going deeper: Deeper, [1-9]\d* of 33$/.test(s3.prog||'')&&!!stopped&&stopped.n1===stopped.n0&&stopped.d20.length===0,'TC-R284 '+gn+' leaving the review during a Deeper pass ("'+(s3&&s3.prog)+'") stops it: '+(stopped?(stopped.n1-stopped.n0)+' searches posted in the 6 s after leaving, '+stopped.d20.length+' depth-20 evaluations stored':'not reached'),stopped);
    }
    L.say(b.errs.length===0,'TC-R285 '+gn+' zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  L.done();
});
// SELECTOR-OPENED: rev-depth control=pairs the tree before part (4) has no row: the tap throws, TC-R280 and every line after it are red
// SELECTOR-OPENED: rev-opening reading=presence TC-R280 requires the opening's text, so a missing hook reads null and reds
// SELECTOR-OPENED: deep-progress control=pairs a pass that never reports leaves it absent and TC-R281 reds
// SELECTOR-OPENED: top-title-box reading=presence where it is absent at kunal761 the line is not under the title and TC-R281 reds
// SELECTOR-OPENED: rev-head reading=presence at kunal761 its rect must be read before and during the pass, so a missing hook reads null and reds
