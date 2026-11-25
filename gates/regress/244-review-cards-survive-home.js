'use strict';
// gates/regress/244-review-cards-survive-home.js - A CARD A REVIEW SAVES TO THE DRILL IS STILL THERE AFTER HOME. US-R255 / TC-R442..R444.
//
// WHY [#553 B2, jobs/a-mistakes-card-stored-with-its-played-move-can-be-dropped-by-the-home-screens-regrade-2026-11-24; amber
// flags/amber-553-review-cards-keep-their-grade]: the Home screen's re-check pass (chess.jsx, ct_regrade550, #550 a41 "Ship, re-check my
// cards") re-grades every card with no `wc` from a quick search of its own (depth 12, 400ms) and drops any it does not call Mistake or
// Blunder. A card the review captures carried no `wc`, so the pass re-checked cards the review had JUST chosen by that same win-chance rule,
// and a quick second opinion disagreeing at a band edge removed them before he ever saw them. Measured on the tree before (trial
// 15636c28c017, run-branch 9667c723): the first three games of gates/fixtures/kunal/kunal-40.pgn captured 12 cards, all carrying `played`;
// going Home dropped 3 of the 12, one a review-graded Blunder (Ba5).
// WHAT IT READS: the bundle under test (CT_APP), at kunal761. The three games are stored under one account (cc:kunal2023, his own name in the
// PGNs, so each game's userColor is set and its cards are captured - a pasted PGN captures none) and each is opened from the games list with
// its RECORDED engine output seeded (gates/fixtures/kunal/kunal-40-evals.json, as gate 239 does), so the review takes its cache path and
// the cards are the ones his phone would store. Then Home, in the session (up to 40 s, ending early when ct_regrade550 is written); then
// the store is reopened (a page reload, the app opening on Home as it does on his phone) with two OLD-LADDER cards added beside the captured
// ones - gate 134's pair, no `wc`: Qd2 leaving the queen (a real Blunder) and Qxd5, the best move itself - and the pass is waited for.
//  TC-R442 DENOMINATOR: every game was reviewed from its recorded output and the reviews captured cards, each carrying its played move.
//  TC-R443 every captured card is still in the deck after both Home visits, and the second pass is seen to RUN (its record is written).
//  TC-R444 a41 still holds for an old card: the Qxd5 card (the best move, not a mistake) leaves, the Qd2 card stays re-graded Blunder or
//          Mistake, and the pass checked exactly those two (a review card re-checked would raise `checked`).
// KNOW ITS LIMIT: three games; the band-edge disagreement depends on the quick search, so the count the tree before drops is a measurement
// on this container, not a constant (TC-R443 reddens on any drop at all).
const L=require('../lib');const RV=require('../drive/review');
const fs=require('fs'),path=require('path');
const FX=path.join(__dirname,'..','fixtures','kunal');
const PGN=fs.readFileSync(path.join(FX,'kunal-40.pgn'),'utf8');
const REC=JSON.parse(fs.readFileSync(path.join(FX,'kunal-40-evals.json'),'utf8'));
const GAMES=PGN.split(/(?=\[Event )/).map(s=>s.trim()).filter(s=>/^\[/.test(s));
const tag=(g,k)=>{const m=g.match(new RegExp('\\['+k+' "([^"]*)"\\]'));return m?m[1]:null;};
const NG=3;
const FEN='4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1';
const OLD=[{fen:FEN,uci:'d1d5',label:'Blunder',played:'Qd2',ts:1791000000001,last:null,why:'Qxd5 was stronger.'},
           {fen:FEN,uci:'d1d5',label:'Mistake',played:'Qxd5',ts:1791000000002,last:null,why:'Qxd5 was stronger.'}];
const readSt=(b)=>b.page.evaluate(()=>{let m=null,r=null;try{m=JSON.parse(localStorage.getItem('ct_mymistakes')||'null');}catch(e){}try{r=JSON.parse(localStorage.getItem('ct_regrade550')||'null');}catch(e){}return {m:m||[],r};});
L.run(async()=>{
  const now=Date.now();
  const list=GAMES.slice(0,NG).map((g,i)=>({src:'cc',acct:'kunal2023',pgn:g,white:tag(g,'White'),black:tag(g,'Black'),wr:'win',tc:'blitz',date:now-(i+1)*3600000}));
  const links=GAMES.slice(0,NG).map(g=>tag(g,'Link'));
  const b=await L.launch({geo:'kunal761',name:'g244',store:{ct_pool:'3',ct_accts:['cc:kunal2023'],ct_acctgames:{'cc:kunal2023':list}}});await b.open();
  await b.tile('Review');await b.settle(800);
  const got=[];
  for(let gi=0;gi<NG;gi++){
    const fx=REC.games[links[gi]];if(!fx){got.push({gi,err:'no recorded output'});continue;}
    try{await RV.toList(b);
      await b.page.evaluate(([k,e])=>{localStorage.setItem('ct_evalcache',JSON.stringify({[k]:Object.assign({},e,{at:Date.now()})}));},[fx.key,fx.entry]);
      const rows=b.page.locator('[data-ct="game-row"]');if((await rows.count())<=gi){got.push({gi,err:'row missing'});continue;}
      await rows.nth(gi).scrollIntoViewIfNeeded();await rows.nth(gi).click();
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(900);
      const r=await b.page.evaluate(()=>{const rv=window.__ctReview;return {path:rv&&rv.engine&&rv.engine.path,plies:rv&&rv.plies?rv.plies.length:-1};});
      got.push({gi,expPlies:fx.plies,...r});
    }catch(e){got.push({gi,err:String(e.message||e).slice(0,120)});}
  }
  const s0=await readSt(b);const cards=s0.m;const key=c=>c.fen+'|'+c.uci;
  const okG=got.filter(x=>x.path==='cache'&&x.plies===x.expPlies);
  L.say(okG.length===NG,'TC-R442 PRECONDITION every one of the '+NG+' games was reviewed from its recorded engine output, opened from the games list ('+okG.length+' of '+NG+')',got);
  L.say(cards.length>0&&cards.every(c=>c.played&&(c.label==='Mistake'||c.label==='Blunder')),'TC-R442 DENOMINATOR the reviews captured '+cards.length+' cards, each a Mistake or Blunder carrying its played move ('+cards.filter(c=>c.played).length+' with played)',cards.slice(0,3).map(c=>({label:c.label,played:c.played,wc:c.wc})));
  // Home in the session: the pass runs over every card with no wc
  await b.home();let s1=null;for(let i=0;i<80;i++){await b.settle(500);s1=await readSt(b);if(s1.r&&s1.r.at)break;}
  const k1=new Set(s1.m.map(key));const gone1=cards.filter(c=>!k1.has(key(c)));
  // reopen the app with two old-ladder cards beside the captured ones
  await b.page.evaluate(([old])=>{const m=JSON.parse(localStorage.getItem('ct_mymistakes')||'[]');localStorage.setItem('ct_mymistakes',JSON.stringify([...m,...old]));localStorage.removeItem('ct_regrade550');},[OLD]);
  await b.page.reload();await b.settle(1500);
  let s2=null;for(let i=0;i<120;i++){await b.settle(500);s2=await readSt(b);if(s2.r&&s2.r.at)break;}
  const k2=new Set(s2.m.map(key));const gone2=cards.filter(c=>!k2.has(key(c)));const r2=s2.r;
  L.say(!!r2&&!!r2.at,'TC-R443 PRECONDITION the re-check pass ran to its end on the reopened Home ('+(r2?JSON.stringify(r2):'no record')+')',r2);
  L.say(cards.length>0&&gone1.length===0&&gone2.length===0,'TC-R443 every card the reviews captured is still in the deck after Home ('+(cards.length-Math.max(gone1.length,gone2.length))+' of '+cards.length+'; gone in the session '+gone1.length+', after reopening '+gone2.length+')',[...gone1,...gone2].slice(0,4).map(c=>({label:c.label,played:c.played,uci:c.uci,fen:c.fen})));
  const qd2=s2.m.find(x=>x.fen===FEN&&x.played==='Qd2'),qx=s2.m.find(x=>x.fen===FEN&&x.played==='Qxd5');
  L.say(!qx,'TC-R444 an old card where the move played WAS the best move (Qxd5) is still re-checked and leaves the deck',s2.m.filter(x=>x.fen===FEN).map(x=>x.played));
  L.say(!!qd2&&!!qd2.wc&&(qd2.wc.g==='Blunder'||qd2.wc.g==='Mistake'),'TC-R444 the old real blunder (Qd2, the queen left) stays, re-graded '+(qd2&&qd2.wc?qd2.wc.g+' at a '+qd2.wc.drop+'-point drop':'(no re-grade)'),qd2);
  L.say(!!r2&&r2.checked===2&&r2.dropped===1,'TC-R444 the reopened pass checked exactly the two old cards and dropped one ('+(r2?('checked '+r2.checked+', dropped '+r2.dropped):'no record')+'): a review card re-checked would raise the count',r2);
  L.say(b.errs.length===0,'TC-R442 zero app errors',b.errs.slice(0,3));await b.close();
},'244-review-cards-survive-home');
