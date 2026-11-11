'use strict';
// gates/regress/101-review-summary-you-left.js - ON THE REVIEW SUMMARY HIS SIDE IS ALWAYS THE LEFT COLUMN. TC-R185a..b, US-R118.
//
// WHY [#550, item (94) of directOpening_2026_11_11_batch10; jobs/the-review-summary-puts-kunal-on-the-left-whichever-colour-he-played-
// 2026-11-11; the audit's AUD-R08]. Kunal, about 12:53am EST Wed 11 Nov 2026, with a screenshot of a Game Review summary: "I should always
// be on the left respect of whether or not it's black or white". The accuracy cards, the count columns and the Skills columns were
// White then Black, fixed, so in every game he played as Black his own numbers sat on the right.
//
// WHAT IT ASSERTS, at kunal761, the Opera game (drive/review's PGN) stored under ONE account and reviewed from the games list, so the
// app itself decides which side is his (gameInfo, the account against the PGN's names):
//  (a) TC-R185a as WHITE (account jsmiller1112): the left accuracy card is White's (rev-acc-w left of rev-acc-b), the grade header and
//      the Skills header read White then Black.
//  (b) TC-R185b as BLACK (account dukekarlcountisouard99): the left accuracy card is Black's, the grade header and the Skills header
//      read Black then White.
// DENOMINATOR per arm: the summary is reached and both accuracy cards are on screen.
// NOT ASSERTED, named: the count CELLS' values against their header (the rows and the headers are driven by one ORD list in chess.jsx,
// so they move together, but this gate reads the headers and the cards only).
// CONTROL-RECORD: ced9bcb 2026-11-11 total=9 red=3 scope=trial:3ab724514641 how=#550 item (94): origin/main's bundle - for the game reviewed as Black the White card is left and both headers read White, Black, so all three TC-R185b lines are red; the White arm, both DENOMINATORS and the font pin green
const L=require('../lib');const R=require('../drive/review');
const ACCT=(u)=>({ct_accts:['cc:'+u],ct_acctgames:{['cc:'+u]:[{src:'cc',acct:u,pgn:R.PGN_OPERA,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:u==='jsmiller1112'?'win':'loss',tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3',ct_bril_reset_v1:'1'});
L.run(async()=>{
  for(const [id,u,mine] of [['TC-R185a','jsmiller1112','w'],['TC-R185b','dukekarlcountisouard99','b']]){
    const b=await L.launch({geo:'kunal761',name:'you-left-'+mine,store:ACCT(u)});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(700);await b.page.locator('[data-ct="game-row"]').first().click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(1200);}catch(e){ok=false;L.note(id+' '+String(e).slice(0,120));}
    const m=ok?await b.page.evaluate(()=>{const x=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.width>0?r.left+r.width/2:null;};
      const gh=document.querySelector('[data-ct="grade-head"]');const ghT=gh?[...gh.children].map(c=>c.textContent.trim()).filter(Boolean):[];
      const sk=[...document.querySelectorAll('span')].find(e=>e.textContent==='Skills');const skT=sk?[...sk.parentElement.children].map(c=>c.textContent.trim()).filter(t=>t&&t!=='Skills'):[];
      return {w:x('[data-ct="rev-acc-w"]'),b:x('[data-ct="rev-acc-b"]'),ghT,skT};}):null;
    const other=mine==='w'?'b':'w';const nm={w:'White',b:'Black'};
    L.say(ok&&!!m&&m.w!=null&&m.b!=null,id+' DENOMINATOR the summary of the game played as '+nm[mine]+' is reached with both accuracy cards',m);
    if(m&&m.w!=null&&m.b!=null){
      L.say(m[mine]<m[other],id+' his ('+nm[mine]+') accuracy card is the LEFT one (x '+Math.round(m[mine])+' against '+Math.round(m[other])+')',m);
      L.say(m.ghT.join(',')===nm[mine]+','+nm[other],id+' the count columns are headed '+nm[mine]+' then '+nm[other]+' (read: '+m.ghT.join(', ')+')',m.ghT);
      L.say(m.skT.join(',')===nm[mine]+','+nm[other],id+' the Skills columns are headed '+nm[mine]+' then '+nm[other]+' (read: '+m.skT.join(', ')+')',m.skT);
    }
    await b.close();
  }
},'101-review-summary-you-left');
