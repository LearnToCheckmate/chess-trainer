'use strict';
// gates/regress/201-book-only-bubble.js - THE REVIEW SUMMARY'S SPEECH BUBBLE IS HONEST ABOUT A GAME THAT NEVER LEFT THE OPENING BOOK.
// #553, batch 14 entry 38, jobs/a-review-of-a-book-only-game-says-the-key-moments-below-show-where-it-turned-and-there-are-none-2026-11-19,
// story US-R211, case TC-R301. Amber flags/amber-553-book-only-bubble-not-lost.
//
// WHY: antagonist B on #551: Pass & Play 1.e4 Nc6 2.d4 d5, resign, Review: Coach's take said "Nothing to score yet: the game never left the
// opening book" and the bubble under it said "A tough one. The key moments below show where it turned." with no key moments anywhere.
// STATE BEFORE THIS BUILD: batch 13 (TC-R251c in gate 169) fixed the LOST branch only; a book-only game that was WON or DRAWN fell through
// revBubble to "Solid, accurate game throughout." - a claim of accuracy about moves nothing graded, beside a Coach's take saying nothing was
// scored. This build adds the branch (chess.jsx revBubble): no graded move and not lost -> "Your moves all came from the opening book, so
// none was graded. Start the review to step through the game."
// Since this batch a book move graded Mistake, Blunder or Miss ends the book (BOOK_BREAKS), so a game where every move is sound book is the
// only game that reads this way; a game with a graded move never does (the last check below).
//
// WHAT IT READS: the bundle under test (CT_APP), a three-move-a-side book game (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5) reviewed from the games list as
// White, as a LOSS (0-1), a WIN (1-0) and a DRAW (1/2-1/2), at kunal761 and 320x568. The bubble is found by WHAT IT IS (the speech-bubble
// glyph and its sentence), never by a hook this build added. TC-R301a PRECONDITION White reads "Not scored" and Coach's take says the game never
// left the book. TC-R301b the bubble says all moves were book and none graded, and points at no list ("key moments", "below show", "See them
// below"), and does not claim accuracy ("accurate"). TC-R301c the Opera Game (graded moves) never reads as a book game.
const L=require('../lib');
const RV=require('../drive/review');
const mk=(res)=>'[Event "gate 201"]\n[White "Bookwhite201"]\n[Black "Bookblack201"]\n[Result "'+res+'"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 '+res;
const CASES=[['lost','0-1','loss'],['won','1-0','win'],['drawn','1/2-1/2','agreed']];
const ACCT=(u,pgn,white,black,wr)=>({ct_accts:['cc:'+u],ct_acctgames:{['cc:'+u]:[{src:'cc',acct:u,pgn,white,black,wr,tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3',ct_bril_reset_v1:'1'});
const LIST=/key moments|below show|(Step through|See) (it|them) below|blunders? below\./;
const sumRead=(b)=>b.page.evaluate(()=>{const tx=(e)=>e?(e.innerText||'').replace(/\s+/g,' ').trim():null;
  const bub=[...document.querySelectorAll('[data-ct="rev-summary"] div')].find(d=>d.children.length===2&&(d.firstElementChild.textContent||'').trim()==='\u{1F4AC}');
  const s=document.querySelector('[data-ct="rev-summary"]');const c=s&&[...s.querySelectorAll('div')].find(d=>(d.innerText||'').trim()==="Coach's take");
  return {bub:tx(bub&&bub.lastElementChild),coach:tx(c&&c.nextElementSibling),acc:tx(document.querySelector('[data-ct="rev-acc-w"]'))};});
const openFromList=async(b)=>{await b.tile('Review');await b.settle(700);await b.page.locator('[data-ct="game-row"]').first().click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(1500);};
const SAY='Your moves all came from the opening book, so none was graded. Start the review to step through the game.';
L.run(async()=>{
  for(const geo of ['kunal761','se']){
    for(const [nm,res,wr] of CASES){
      const G=geo+' '+nm+' ';
      const b=await L.launch({geo,name:'g201-'+nm+'-'+geo,store:ACCT('bookwhite201',mk(res),'Bookwhite201','Bookblack201',wr)});await b.open();let ok=true;
      try{await openFromList(b);}catch(e){ok=false;L.note('201 '+nm+' '+String(e).slice(0,120));}
      const r=ok?await sumRead(b):null;
      L.say(ok&&!!r&&!!r.bub&&/^-/.test(r.acc||'')&&/never left the opening book/.test(r.coach||''),G+'TC-R301a PRECONDITION the book-only game ('+nm+') reviewed as White shows the bubble, White is "Not scored" ('+(r&&r.acc)+') and Coach\'s take says the game never left the book',r);
      if(r&&r.bub){
        const want=(nm==='lost'?'A tough one. ':'')+SAY;
        L.say(r.bub===want&&!LIST.test(r.bub)&&!/accurate/i.test(r.bub),G+'TC-R301b the bubble says the moves were all book and none was graded, points at no list and claims no accuracy: "'+r.bub+'"',r);}
      if(nm==='won'&&process.env.CT_G201_SHOT){await b.page.evaluate(()=>{const bub=[...document.querySelectorAll('[data-ct="rev-summary"] div')].find(d=>d.children.length===2&&(d.firstElementChild.textContent||'').trim()==='\u{1F4AC}');if(!bub)return;const q=bub.getBoundingClientRect();const d=document.createElement('div');d.style.cssText='position:fixed;pointer-events:none;z-index:99999;border:2px solid red;left:'+(q.left-3)+'px;top:'+(q.top-3)+'px;width:'+(q.width+6)+'px;height:'+(q.height+6)+'px';document.body.appendChild(d);});await b.shot(process.env.CT_G201_SHOT+'-'+geo);}
      await b.close();}
    {const G=geo+' graded ';
     const b=await L.launch({geo,name:'g201-opera-'+geo,store:ACCT('dukekarlcountisouard99',RV.PGN_OPERA,'Jsmiller1112','DukeKarlCountIsouard99','loss')});await b.open();let ok=true;
     try{await openFromList(b);}catch(e){ok=false;L.note('201 opera '+String(e).slice(0,120));}
     const r=ok?await sumRead(b):null;
     L.say(ok&&!!r&&!!r.bub,G+'TC-R301c PRECONDITION the Opera Game (graded moves) shows a bubble',r);
     if(r&&r.bub)L.say(!/opening book/.test(r.bub)&&!/none was graded/.test(r.bub),G+'TC-R301c a game with graded moves never reads as a book game: "'+r.bub+'"',r);
     await b.close();}
  }
},'201-book-only-bubble');
