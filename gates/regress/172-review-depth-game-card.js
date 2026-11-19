'use strict';
// gates/regress/172-review-depth-game-card.js - THE THREE ROW GAME CARD, ITS DEPTH BUTTON AND MENU, AND A REVIEW AT THE PICKED DEPTH. TC-R242a..h, US-R170.
//
// WHY [batch 13; jobs/review-depth-per-game-on-the-new-game-card-2026-11-15; decisions/review-depth-is-picked-per-game-with-a-chip-and-a-row-
// in-the-review-sheet-2026-11-15, decisions/the-game-card-has-three-rows-and-the-games-list-gets-search-and-filter-2026-11-15,
// decisions/your-games-gets-its-own-section-under-import-2026-11-18]. Kunal approved the round-6 card ("Yes, this is good. Thanks.") and asked for
// a deeper engine ("I wouldn't mind if our engines ran on a deeper value too"): each game in the Review list carries a review depth he picks.
//
// WHAT IT ASSERTS. Every checked line starts with the geometry and the skin ('375x761 classic TC-R242a ...').
//  LAYOUT, at 375x761 (kunal761) and 320x568 (se), in the Classic and the Medieval skin, seeded games, read AFTER the depth menu was opened and
//  closed again (so after an interaction, not only at the first paint):
//   TC-R242a DENOMINATOR at least four cards, each with a result box, four move boxes and a depth button; then the cards are as wide as the
//            page's content (viewport less 24: 351 at 375, 296 at 320 - Your games is its own section, not a part of the Import box).
//   TC-R242b the grid: the result box's left and right edges are the brilliant box's; the four move boxes are one width, 10px apart; the
//            button's right edge is the blunder box's; the result box, the move boxes and the button are 30px tall; the button is 100px wide
//            (88 at 320); the first box starts 12px inside the card; cards are 10px apart.
//   TC-R242c no text is cut except a long opponent's name: every text in every card lies inside every box above it, the long name is the one
//            text that overflows its box (and draws an ellipsis), the short ones do not, and the account, time control and date are all shown.
//   TC-R242d no text under 15px anywhere in a card.
//   TC-R242e the move boxes read the stored tally ('!! 1', star 3, '! 2', '?? 1'); a zero count is dimmed (opacity .42) and a counted one is
//            not; a tally stored before Best and Great were counted apart reads a dash for those two; and the old card's estimate pill and
//            approximate mark are gone. The button reads each game's stored depth (Quick, Deep, Deepest).
//  THE MENU, same four launches:
//   TC-R242f tapping the button opens ONLY the menu (the list is still up, no review started), under or over the button and inside the
//            screen, with the 'Review depth' label and Quick (about 20 s), Deep (about 1 min), Deeper (about 3 min), Deepest (about 8 min),
//            exactly the game's own level ticked; a tap outside closes it and changes nothing; the first card did not move.
//  THE ENGINE, 375x761 Classic only (it is the same code at every size; one deep review costs about a minute):
//   TC-R242g tapping a Quick game's card opens its review and every search of that review is 'go depth 16' (the engine's own messages,
//            recorded at the Worker, not a field this build adds). Picking Deep in another game's menu runs that game's review with every
//            search 'go depth 18' and none at 16; the tally is stored as a review at level 1 and its evaluations under their own cache key;
//            back in the list the button reads Deep and the four boxes read that review's counts; the grid still holds.
//   TC-R242h the pick is kept per game across a reload (that game Deep, the other still Quick); and after picking Quick again the review
//            opens from the finished Deep pass (no new search; the counts stay the deepest finished pass's).
//  320x568 Classic also taps a card and reaches its review (TC-R242g, 'opens the review as today').
//
// THE MEASURED TIMES (the job asks for them). The Opera Game (33 plies, 34 positions), 375x761, three pool workers, this container (4 cores),
// stockfish-18-lite single-threaded, from the tap to the summary, one fresh launch per level, bundle 1df7e5ebe25a, 19 Nov 2026:
//   Quick   (depth 16)    8.4 s
//   Deep    (depth 18)   17.8 s     2.1 times Quick
//   Deeper  (depth 20)   45.5 s     5.4 times Quick
//   Deepest (depth 22)  125.4 s    14.9 times Quick
// The four levels gave the Opera Game's White side Brilliant 3 at every level, and Best/Great 6/3, 7/2, 6/3 and 5/3. A phone is slower than
// this machine by a factor this harness cannot measure: if a phone's Quick is his 20 s, the same ratios give about 40 s, 1 min 50 s and
// 5 min, under his rough 1, 3 and 8 minutes. The menu keeps his figures until they are read off his phone. The gate prints 'took N s' notes
// for its Quick and Deep reviews on every run (4.6 s for the 8-ply game, 17.8 to 21.4 s for the Opera Game at Deep).
//
// CONTROLS, each the whole gate on a trial bundle (the sha is this branch's head when they ran; the bundle is the broken one):
// CONTROL-RECORD: 3dd181fe 2026-11-19 total=25 red=18 scope=trial:77d872f466a3 how=batch 13, the tree before the change (1e0c21e8, the old card: a result tag beside the name, the dashed brilliant pill, no depth button): TC-R242f red at all four launches (there is no button to tap), the layout's DENOMINATOR red at all four, and every Deep line of TC-R242g and TC-R242h red at 375x761 Classic; the two 'tapping the card opens the review, searched at depth 16' lines and the four zero-errors lines stay green, as they should - that is the app as it was
// CONTROL-RECORD: 3dd181fe 2026-11-19 total=57 red=1 scope=trial:c766d064b301 how=batch 13, pairs break engine-ignores-the-picked-depth (gates/pairs/breaks/172-the-engine-ignores-the-picked-depth.diff): the one red line is 'picking Deep runs that game's review at depth 18' - all 35 recorded searches were at 16. Every line that reads what this build writes (ct_gdepth, the tally's dp, the -d18 cache key, review.engine's depth, the button's word) stayed GREEN on this bundle, which is why the search depth is read from the engine's own messages at the Worker and not from any of them
// CONTROL-RECORD: 3dd181fe 2026-11-19 total=25 red=19 scope=trial:99b8dc47ba0b how=batch 13, pairs break depth-button-also-opens-the-review (the button's stopPropagation removed): the review starts under the menu, so TC-R242f and everything read after it are red at all four launches (12 graded lines at 375x761, 7 at 320x568)
// CONTROL-RECORD: 3dd181fe 2026-11-19 total=57 red=5 scope=trial:3337ffb155f0 how=batch 13, pairs break result-box-not-one-column-wide (the result box a fixed 3.8em at the start of its column): TC-R242b red at all four launches and the after-the-review grid line red (3 at 375x761, 2 at 320x568)
// The grading machine on 3dd181fe: CHECKED, real 31/31 at kunal761 and 25/25 at 320x568 (bundle 6e2bccc93e3b), all three breaks CAUGHT.
const L=require('../lib');const R=require('../drive/review');
const DAY=86400000,D0=1763000000000;
const ME=['cc','jsmiller1112','Jsmiller1112'];
const SHORT='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *';
const mk=(n,opp,wr,tc,white,pgn)=>({src:ME[0],acct:ME[1],white:white?ME[2]:opp,black:white?opp:ME[2],wr,tc,date:D0-n*DAY,pgn:pgn||('[White "'+(white?ME[2]:opp)+'"]\n[Black "'+(white?opp:ME[2])+'"]\n[Result "*"]\n\n'+SHORT)});
// newest first: 0 the Opera Game (seeded review tally), 1 a short game (Quick, no tally the gate depends on), 2 a 25-character opponent at Deepest,
// 3 a tally from before the Best/Great split at Deep, 4 and 5 fillers.
const G=[mk(1,'DukeKarlCountIsouard99','win','blitz',true,R.PGN_OPERA),mk(2,'magnus','checkmated','rapid',true),mk(3,'AVeryLongOpponentHandle25ch','agreed','daily',true),mk(4,'bob','win','bullet',false),mk(5,'opp5','win','blitz',true),mk(6,'opp6','resigned','rapid',true)];
const gk=g=>g.src+':'+g.date+':'+g.white+':'+g.black;
const TALLY={[gk(G[0])]:{bril:1,great:5,best:3,grt:2,inacc:0,mist:4,blun:1,src:'review'},[gk(G[2])]:{bril:0,great:0,best:0,grt:0,inacc:0,mist:0,blun:0,src:'review'},[gk(G[3])]:{bril:0,great:4,inacc:0,mist:1,blun:2,src:'review'}};
const DEPTH={[gk(G[2])]:3,[gk(G[3])]:1};
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':G},ct_gamestats:TALLY,ct_gdepth:DEPTH,ct_pool:'3',ct_bril_reset_v1:'1'};
// records every 'go depth N' the app posts to a Stockfish worker: window.__ctGo is the list of N since the last reset
function recordGo(){try{const RW=window.Worker;if(!RW||window.__ctGo)return;window.__ctGo=[];
  const W=function(url,o){const w=new RW(url,o);if(!/stockfish/i.test(String(url)))return w;const pm=w.postMessage.bind(w);w.postMessage=function(m){try{const x=/^go depth (\d+)$/.exec(String(m));if(x)window.__ctGo.push(+x[1]);}catch(e){}return pm.apply(null,arguments);};return w;};
  W.prototype=RW.prototype;window.Worker=W;}catch(e){}}
const readCards=(b)=>b.page.evaluate(()=>{const q=e=>{const x=e.getBoundingClientRect();return {l:x.left,t:x.top,r:x.right,b:x.bottom,w:x.width,h:x.height};};
  const cards=[...document.querySelectorAll('[data-ct="game-row"]')];
  return {vw:innerWidth,vh:innerHeight,list:!!document.querySelector('[data-ct="glist-box"]'),summary:!!document.querySelector('[data-ct="rev-summary"]'),menu:!!document.querySelector('[data-ct="depth-menu"]'),
   importHoldsList:(()=>{const c=cards[0];const sel=document.querySelector('select[aria-label="Choose site"]');if(!c||!sel)return null;const box=sel.parentElement&&sel.parentElement.parentElement;return !!box&&box.contains(c);})(),
   cards:cards.map(c=>{const g=s=>c.querySelector('[data-ct="'+s+'"]');const tx=s=>{const e=g(s);return e?e.textContent.replace(/\s+/g,' ').trim():null;};const rq=s=>{const e=g(s);return e?q(e):null;};
    // every element holding its own text: its size, and whether it lies inside every box above it up to the card
    const texts=[];const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);let n;const seen=new Set();
    while((n=w.nextNode())){if(!n.nodeValue.trim())continue;const e=n.parentElement;if(seen.has(e))continue;seen.add(e);const r=e.getBoundingClientRect();let inside=true;
      for(let p=e.parentElement;p;p=p.parentElement){const pr=p.getBoundingClientRect();if(pr.width===0&&pr.height===0&&getComputedStyle(p).display==='contents'){continue;}if(r.left<pr.left-0.6||r.right>pr.right+0.6||r.top<pr.top-0.6||r.bottom>pr.bottom+0.6){inside=false;break;}if(p===c)break;}
      texts.push({ct:e.getAttribute('data-ct')||(e.parentElement&&e.parentElement.getAttribute('data-ct'))||'',t:n.nodeValue.trim().slice(0,30),fs:parseFloat(getComputedStyle(e).fontSize),inside,cut:e.scrollWidth>e.clientWidth+1,shown:r.width>0&&r.height>0});}
    const op=s=>{const e=g(s);return e?parseFloat(getComputedStyle(e).opacity):null;};const opp=g('game-opp');
    return {card:q(c),badge:rq('game-badge'),face:rq('game-depth-face'),btn:rq('game-depth'),bril:rq('gstat-bril'),best:rq('gstat-best'),great:rq('gstat-great'),blun:rq('gstat-blun'),
     tBadge:tx('game-badge'),tFace:tx('game-depth-face'),tBril:tx('gstat-bril'),tBest:tx('gstat-best'),tGreat:tx('gstat-great'),tBlun:tx('gstat-blun'),tOpp:tx('game-opp'),tSrc:tx('game-src'),tTc:tx('game-tc'),tDate:tx('game-date'),
     oBril:op('gstat-bril'),oBest:op('gstat-best'),oGreat:op('gstat-great'),oBlun:op('gstat-blun'),oppCut:!!opp&&opp.scrollWidth>opp.clientWidth+1,oppEll:!!opp&&getComputedStyle(opp).textOverflow==='ellipsis',
     old:!!c.querySelector('[data-ct="bril-pill-est"],[data-ct="bril-pill"],[data-ct="gstat-esttag"],[data-ct="gstat-bestgreat"],[data-ct="bril-downgrade"],[data-ct="game-go"]')||/brilliant\?|≈/.test(c.textContent),texts,all:c.innerText.replace(/\s+/g,' ')};})};});
const readMenu=(b)=>b.page.evaluate(()=>{const m=document.querySelector('[data-ct="depth-menu"]');if(!m)return null;const r=m.getBoundingClientRect();
  const opts=[...m.querySelectorAll('[data-ct="depth-opt"]')].map(o=>{const x=o.getBoundingClientRect();return {t:[...o.children].map(c=>c.textContent.trim()).filter(Boolean).join(' '),on:o.getAttribute('aria-checked')==='true',tick:/✓/.test(o.textContent),h:x.height,fs:parseFloat(getComputedStyle(o).fontSize),fit:o.scrollWidth<=o.clientWidth+1};});
  const lab=m.querySelector('[data-ct="depth-menu-label"]');return {l:r.left,t:r.top,r:r.right,b:r.bottom,label:lab?lab.textContent.trim():null,opts,vw:innerWidth,vh:innerHeight};});
const near=(a,b,e)=>Math.abs(a-b)<=(e==null?0.6:e);
const goList=(b)=>b.page.evaluate(()=>(window.__ctGo||[]).slice());
const goReset=(b)=>b.page.evaluate(()=>{if(window.__ctGo)window.__ctGo.length=0;});
const store=(b)=>b.page.evaluate(()=>{const j=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}');}catch(e){return {};}};const ec=j('ct_evalcache');const rv=window.__ctReview;
  return {gd:j('ct_gdepth'),gs:j('ct_gamestats'),ec:Object.keys(ec).map(k=>({k,n:ec[k]&&ec[k].evW?ec[k].evW.length:0})),engine:rv&&rv.engine?Object.assign({},rv.engine):null};});
const idxOf=(m,re)=>m.cards.findIndex(c=>re.test(c.tOpp||''));
const waitSummary=async(b,ms)=>{try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:ms});await b.settle(1200);return true;}catch(e){return false;}};
const backToList=async(b)=>{try{await b.tapText(/^‹ Back to games$/);await b.settle(900);return true;}catch(e){L.note('back to games: '+String(e).slice(0,100));return false;}};
const openMenu=async(b,i)=>{await b.page.locator('[data-ct="game-row"]').nth(i).scrollIntoViewIfNeeded();await b.settle(200);await b.page.locator('[data-ct="game-depth"]').nth(i).click();await b.settle(450);};

function layout(tag,m,narrow){
  const cs=m.cards;const full=cs.filter(c=>c.badge&&c.face&&c.bril&&c.best&&c.great&&c.blun);
  L.say(cs.length>=4&&full.length===cs.length,tag+' TC-R242a DENOMINATOR '+cs.length+' cards, each with a result box, four move boxes and a depth button',{n:cs.length,full:full.length});
  if(!full.length||full.length!==cs.length)return false;
  const cw=m.vw-24;
  L.say(cs.every(c=>near(c.card.w,cw,1))&&m.importHoldsList===false,tag+' TC-R242a the cards are the page\'s content width ('+cs[0].card.w.toFixed(1)+' of '+cw+') and Your games is not inside the Import box',{w:cs.map(c=>+c.card.w.toFixed(1)),importHoldsList:m.importHoldsList});
  const bad=[];const FW=narrow?88:100;
  cs.forEach((c,i)=>{const e=[];
    if(!near(c.badge.l,c.bril.l)||!near(c.badge.r,c.bril.r))e.push('result box '+c.badge.l.toFixed(1)+'..'+c.badge.r.toFixed(1)+' over brilliant '+c.bril.l.toFixed(1)+'..'+c.bril.r.toFixed(1));
    const ws=[c.bril.w,c.best.w,c.great.w,c.blun.w];if(Math.max(...ws)-Math.min(...ws)>0.6)e.push('box widths '+ws.map(x=>x.toFixed(1)).join(','));
    const gaps=[c.best.l-c.bril.r,c.great.l-c.best.r,c.blun.l-c.great.r];if(!gaps.every(g=>near(g,10)))e.push('gaps '+gaps.map(x=>x.toFixed(1)).join(','));
    if(!near(c.face.r,c.blun.r))e.push('button right '+c.face.r.toFixed(1)+' vs blunder right '+c.blun.r.toFixed(1));
    if(![c.badge.h,c.bril.h,c.best.h,c.great.h,c.blun.h,c.face.h].every(h=>near(h,30)))e.push('heights '+[c.badge.h,c.bril.h,c.best.h,c.great.h,c.blun.h,c.face.h].join(','));
    if(!near(c.face.w,FW))e.push('button width '+c.face.w.toFixed(1)+' not '+FW);
    if(!near(c.bril.l-c.card.l,13))e.push('left padding '+(c.bril.l-c.card.l).toFixed(1));
    if(!near(c.card.r-c.blun.r,13))e.push('right padding '+(c.card.r-c.blun.r).toFixed(1));
    if(!(near(c.badge.t,c.face.t)&&c.bril.t>c.badge.b&&near(c.bril.t,c.best.t)&&near(c.bril.t,c.blun.t)))e.push('rows');
    if(c.btn.h<44-0.6)e.push('tap box '+c.btn.h.toFixed(1)+' under 44');
    if(i>0&&!near(c.card.t-cs[i-1].card.b,10))e.push('gap to the card above '+(c.card.t-cs[i-1].card.b).toFixed(1));
    if(e.length)bad.push('card '+i+': '+e.join('; '));});
  L.say(bad.length===0,tag+' TC-R242b the grid holds on all '+cs.length+' cards: result box over the brilliant box ('+cs[0].badge.l.toFixed(1)+'..'+cs[0].badge.r.toFixed(1)+'), four equal boxes 10 apart, the button\'s right edge on the blunder box\'s ('+cs[0].face.r.toFixed(1)+'), 30px boxes, a '+FW+'px button, 12px padding, cards 10 apart',bad.slice(0,4));
  const iL=idxOf(m,/AVeryLong/);const out=[];cs.forEach((c,i)=>c.texts.forEach(t=>{if(t.ct==='game-opp')return;if(!t.inside||t.cut||!t.shown)out.push('card '+i+' '+t.ct+' "'+t.t+'"');}));
  const shortCut=cs.filter(c=>(c.tOpp||'').length<=8&&c.oppCut).length;const nShort=cs.filter(c=>(c.tOpp||'').length<=8).length;const miss=cs.filter(c=>!c.tSrc||!c.tTc||!c.tDate).length;
  L.say(iL>=0&&out.length===0&&cs[iL].oppCut&&cs[iL].oppEll&&nShort>=3&&shortCut===0&&miss===0,tag+' TC-R242c no text is cut but a long opponent\'s name (the 25-character one is cut with an ellipsis: '+(iL>=0&&cs[iL].oppCut)+'; none of the '+nShort+' short names is); '+cs.reduce((a,c)=>a+c.texts.length,0)+' texts read, every other one whole and inside its boxes; account, time control and date on every card',{out:out.slice(0,5),shortCut,miss,first:cs[0].all});
  const small=[];cs.forEach((c,i)=>c.texts.forEach(t=>{if(t.fs<15-0.01)small.push('card '+i+' '+t.ct+' "'+t.t+'" '+t.fs);}));
  L.say(cs.reduce((a,c)=>a+c.texts.length,0)>=cs.length*9&&small.length===0,tag+' TC-R242d no text under 15px in any card',small.slice(0,5));
  const i0=idxOf(m,/^DukeKarl/),i3=idxOf(m,/^bob$/);const a=cs[i0],z=cs[iL],o=cs[i3];
  L.say(i0>=0&&i3>=0&&a.tBril==='!! 1'&&a.tBest==='★ 3'&&a.tGreat==='! 2'&&a.tBlun==='?? 1'&&[a.oBril,a.oBest,a.oGreat,a.oBlun].every(x=>x===1)&&z.tBril==='!! 0'&&[z.oBril,z.oBest,z.oGreat,z.oBlun].every(x=>near(x,.42,.011))&&o.tBest==='★ –'&&o.tGreat==='! –'&&o.tBlun==='?? 2'&&near(o.oBest,.42,.011)&&o.oBlun===1&&cs.every(c=>!c.old),
    tag+' TC-R242e the move boxes read the stored tally ('+(a&&[a.tBril,a.tBest,a.tGreat,a.tBlun].join(' '))+'), a zero is dimmed to '+(z&&z.oBril)+', an uncounted Best and Great read a dash ('+(o&&[o.tBest,o.tGreat].join(' '))+'), and no estimate pill or approximate mark is left',{a:a&&a.all,z:z&&z.all,o:o&&o.all});
  L.say(i0>=0&&/^Quick/.test(a.tFace)&&/^Deepest/.test(z.tFace)&&/^Deep\b/.test(o.tFace)&&!/^Deeper|^Deepest/.test(o.tFace),tag+' TC-R242e the button reads each game\'s own depth: '+[a.tFace,z.tFace,o.tFace].join(', '),{});
  return true;
}

L.run(async()=>{
  for(const [gn,geo] of [['375x761','kunal761'],['320x568','se']])for(const [sk,skin] of [['classic',null],['medieval','2']]){
    const tag=gn+' '+sk;const narrow=geo==='se';const eng=geo==='kunal761'&&!skin;
    const b=await L.launch({geo,name:'depthcard-'+geo+'-'+sk,...(skin?{pro:true}:{}),store:{...STORE,...(skin?{ct_skin:skin}:{})}});await b.ctx.addInitScript(recordGo);await b.open();
    try{await b.tile('Review');await b.settle(1300);}catch(e){L.note(tag+' open: '+String(e).slice(0,100));}
    // THE MENU first: open it on the short Quick game, read it, close it by a tap outside
    const m0=await readCards(b);const i1=idxOf(m0,/^magnus$/);let menu=null,mOpen=null,mShut=null;
    try{if(i1>=0){await openMenu(b,i1);menu=await readMenu(b);mOpen=await readCards(b);await b.page.mouse.click(6,6);await b.settle(450);mShut=await readCards(b);}}catch(e){L.note(tag+' menu: '+String(e).slice(0,120));}
    const f=mOpen&&mOpen.cards[i1]?mOpen.cards[i1].face:null;
    L.say(!!menu&&!!mOpen&&mOpen.list&&!mOpen.summary&&(await b.page.locator('[data-ct="ana-fail"]').count())===0&&(await goList(b)).length===0,tag+' TC-R242f tapping the depth button opens the menu and ONLY the menu: the games list is still up and no review search started',{menu:!!menu,list:mOpen&&mOpen.list,summary:mOpen&&mOpen.summary});
    if(menu&&f){
      const want=['Quick (about 20 s)','Deep (about 1 min)','Deeper (about 3 min)','Deepest (about 8 min)'];const got=menu.opts.map(o=>o.t.replace(/^✓\s*/,''));
      L.say(menu.label==='Review depth'&&JSON.stringify(got)===JSON.stringify(want)&&menu.opts.filter(o=>o.on).length===1&&menu.opts[0].on&&menu.opts[0].tick&&menu.opts.filter(o=>o.tick).length===1,tag+' TC-R242f the menu reads "Review depth" then '+got.join(', ')+', with the game\'s own level (Quick) the one ticked',menu.opts);
      const under=near(menu.t,f.b+6,1.5),over=near(menu.b,f.t-6,1.5);
      L.say((under||over)&&menu.l>=7.4&&menu.r<=menu.vw-7.4&&menu.t>=7.4&&menu.b<=menu.vh-7.4&&menu.opts.every(o=>o.h>=44-0.6&&o.fs>=15&&o.fit),tag+' TC-R242f the menu sits '+(under?'under':over?'over':'AWAY FROM')+' its button ('+menu.t.toFixed(0)+'..'+menu.b.toFixed(0)+' against the button '+f.t.toFixed(0)+'..'+f.b.toFixed(0)+'), inside the screen, each level a 44px row of 15px text that fits',{menu:{l:menu.l,t:menu.t,r:menu.r,b:menu.b},f});
    }
    const gd=(await store(b)).gd;
    L.say(!!mShut&&!mShut.menu&&mShut.list&&!mShut.summary&&JSON.stringify(gd)===JSON.stringify(DEPTH)&&m0.cards.length>0&&mShut.cards.length===mOpen.cards.length&&mShut.cards.every((c,i)=>near(c.card.t,mOpen.cards[i].card.t)&&near(c.card.h,mOpen.cards[i].card.h)),tag+' TC-R242f a tap outside closes the menu and changes nothing: no review, the stored depths as seeded, every card where it was while the menu was open',{gd,menu:mShut&&mShut.menu});
    // LAYOUT, read after that interaction
    if(mShut)layout(tag,mShut,narrow);else L.say(false,tag+' TC-R242a DENOMINATOR the list could not be read after the menu closed',{});
    // THE CARD OPENS THE REVIEW (Quick): the short game, every search at depth 16
    if(!skin){
      await goReset(b);let ok=false;const t0=Date.now();try{await b.page.locator('[data-ct="game-row"]').nth(i1).scrollIntoViewIfNeeded();await b.page.locator('[data-ct="game-opp"]').nth(i1).click();ok=await waitSummary(b,180000);}catch(e){L.note(tag+' quick: '+String(e).slice(0,120));}
      const go=await goList(b);const s=await store(b);const N=9;   // 8 plies, 9 positions
      L.note(tag+' the Quick review of the 8-ply game took '+((Date.now()-t0)/1000).toFixed(1)+' s to its summary; go depths '+JSON.stringify(go));
      L.say(ok&&go.length>=N&&go.every(d=>d===16)&&!!s.engine&&s.engine.path==='pool',tag+' TC-R242g tapping the card opens the review as before, and a Quick game is searched at depth 16: '+go.length+' searches, all 16 (review.engine '+JSON.stringify(s.engine&&{path:s.engine.path,depth:s.engine.depth})+')',{go:go.slice(0,12),ok});
      await backToList(b);
    }
    if(eng){
      // PICK DEEP on the Opera Game
      await goReset(b);const m1=await readCards(b);const i0=idxOf(m1,/^DukeKarl/);let ok=false;const t0=Date.now();
      try{await openMenu(b,i0);await b.page.locator('[data-ct="depth-opt"][data-level="1"]').click();ok=await waitSummary(b,420000);}catch(e){L.note(tag+' deep: '+String(e).slice(0,120));}
      const secs=(Date.now()-t0)/1000;const go=await goList(b);const s=await store(b);const k0=gk(G[0]);const st=s.gs[k0]||{};const N=R.OPERA_PLIES+1;
      L.note(tag+' the Deep review of the Opera Game (33 plies) took '+secs.toFixed(1)+' s to its summary on three pool workers; '+go.length+' searches');
      L.say(ok&&go.filter(d=>d===18).length>=N&&go.every(d=>d===18),tag+' TC-R242g picking Deep runs that game\'s review at depth 18: '+go.filter(d=>d===18).length+' searches at 18 for its '+N+' positions, '+go.filter(d=>d!==18).length+' at any other depth',{go:go.slice(0,40),ok});
      L.say(ok&&s.gd[k0]===1&&st.src==='review'&&st.dp===1&&s.ec.some(e=>/-d18$/.test(e.k)&&e.n===N)&&!!s.engine&&s.engine.depth===18,tag+' TC-R242g the pick is stored for that game (ct_gdepth 1), its tally is a review at level 1 and its evaluations sit under their own cache key ('+JSON.stringify(s.ec.map(e=>e.k))+')',{gd:s.gd,st,ec:s.ec,engine:s.engine});
      await backToList(b);await b.settle(500);const m2=await readCards(b);const j0=idxOf(m2,/^DukeKarl/);const c=m2.cards[j0];
      L.say(!!c&&/^Deep\b/.test(c.tFace)&&!/^Deeper|^Deepest/.test(c.tFace)&&typeof st.best==='number'&&c.tBril==='!! '+st.bril&&c.tBest==='★ '+st.best&&c.tGreat==='! '+st.grt&&c.tBlun==='?? '+st.blun,tag+' TC-R242g back in the list its button reads "'+(c&&c.tFace)+'" and its boxes read the Deep review\'s counts: '+(c&&[c.tBril,c.tBest,c.tGreat,c.tBlun].join(' '))+' (stored '+[st.bril,st.best,st.grt,st.blun].join(',')+')',{st,card:c&&c.all});
      {const bad=[];m2.cards.forEach((c,i)=>{if(!c.badge||!c.bril||!c.face||!c.blun||!near(c.badge.l,c.bril.l)||!near(c.badge.r,c.bril.r)||!near(c.face.r,c.blun.r))bad.push(i);});
       L.say(m2.cards.length>=4&&bad.length===0,tag+' TC-R242g and after the review the grid still holds on all '+m2.cards.length+' cards (result box over brilliant, button edge on blunder)',bad);}
      // KEPT ACROSS A RELOAD
      let m3=null;try{await b.page.reload();await b.settle(1500);await b.tile('Review');await b.settle(1300);m3=await readCards(b);}catch(e){L.note(tag+' reload: '+String(e).slice(0,100));}
      const r0=m3?m3.cards[idxOf(m3,/^DukeKarl/)]:null,r1=m3?m3.cards[idxOf(m3,/^magnus$/)]:null;
      L.say(!!r0&&!!r1&&/^Deep\b/.test(r0.tFace)&&!/^Deeper|^Deepest/.test(r0.tFace)&&/^Quick/.test(r1.tFace),tag+' TC-R242h the pick is kept per game across a reload: the Opera Game reads "'+(r0&&r0.tFace)+'", the short game "'+(r1&&r1.tFace)+'"',{});
      // QUICK AGAIN: the review opens from the finished Deep pass
      await goReset(b);let ok2=false;try{await openMenu(b,idxOf(m3,/^DukeKarl/));await b.page.locator('[data-ct="depth-opt"][data-level="0"]').click();ok2=await waitSummary(b,180000);}catch(e){L.note(tag+' quick again: '+String(e).slice(0,120));}
      const go2=await goList(b);const s2=await store(b);const st2=s2.gs[k0]||{};
      L.say(ok2&&!(k0 in s2.gd)&&!!s2.engine&&s2.engine.cached===true&&s2.engine.depth===18&&go2.filter(d=>d===18).length===0&&st2.dp===1&&st2.best===st.best&&st2.grt===st.grt&&st2.bril===st.bril&&st2.blun===st.blun,tag+' TC-R242h picked Quick again, the review opens from the finished Deep pass (no new deep search, review.engine cached at depth '+(s2.engine&&s2.engine.depth)+') and the tally stays the deepest finished pass\'s',{gd:s2.gd,engine:s2.engine,go2:go2.slice(0,10),st2});
    }
    L.say(b.errs.length===0,tag+' TC-R242a zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  L.done();
});
// SELECTOR-OPENED: game-depth control=3dd181fe the tree before the change has no depth button: the tap throws, TC-R242f goes red at every launch and the layout is not read
// SELECTOR-OPENED: game-depth-face control=3dd181fe same control; and a card without it fails the DENOMINATOR (every card must carry a result box, four move boxes and a button)
// SELECTOR-OPENED: depth-menu control=3dd181fe same control: no menu, TC-R242f red
// SELECTOR-OPENED: depth-opt control=3dd181fe same control: picking Deep throws and every Deep line is red
// SELECTOR-OPENED: depth-menu-label reading=presence the label's text must equal 'Review depth', so a missing hook reads null and reds
// SELECTOR-OPENED: gstat-bril control=3dd181fe same control: the old card has no brilliant box and fails the DENOMINATOR
// SELECTOR-OPENED: game-tc reading=presence TC-R242c requires a time control text on every card, so a missing hook reads null and reds
// SELECTOR-OPENED: game-meta reading=fallback named only where a text's own hook is absent; no line depends on it
