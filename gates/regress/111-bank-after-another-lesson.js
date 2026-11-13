'use strict';
// gates/regress/111-bank-after-another-lesson.js - ANOTHER LESSON UNLOCKS A SECOND BANK TODAY; A CLEAN HINTS-ON RUN OFFERS "BANK IT". TC-R191a..d, US-R124.
//
// WHY [#550, answer a33 of directOpening_2026_11_11_batch10; Kunal on build__1794388896663-q33, 11 Nov 2026: "build both. Finishing a
// different lesson can bank the day, and after a clean run with hints on a line suggests a hint-free run to bank it"; FEEDBACK-INBOX
// 12 Sep, "playing another lesson should also unlock banking a flawless day (then drop the time limit)"]. Before #550 a line banked once
// per calendar day ("Today is already banked, tomorrow counts next.") and a clean hints-on run ended on a sentence only.
//
// WHAT IT ASSERTS, at kunal761, the Italian Game's main line played to Complete! (drive/lesson practice-complete), one launch per store:
//  (a) TC-R191a banked today, NO other lesson finished since (ct_lessonfin by: only the Italian Game): no second bank - the note says to
//      finish a different lesson, and ct_learnprog's days are unchanged (1).
//  (b) TC-R191b banked today, King's Gambit finished AFTER that bank: the run banks again - days 2, the new one 'YYYY-MM-DD#2' - and
//      the note counts day 2 toward Mastered.
//  (c) TC-R191c a bank stored before #550 (no bseq) waits for tomorrow as it did, even with another lesson finished since.
//  (d) TC-R191d no bank yet, Hints switched ON at move 0, the line played clean: the note says hints were on, the row offers
//      [data-ct=lesson-bank-it] on screen and at least 44px tall; tapping it restarts the line with the hint off, and playing it
//      through banks today (days 1).
// DENOMINATOR per launch: the run reached Complete!.
// CONTROL-RECORD: d11f418 2026-11-11 total=11 red=4 scope=trial:a4e7036429a0 how=#550 answer a33: the tree before it (a32 only) - 'Today is already banked, tomorrow counts next' with or without another lesson, so TC-R191a and TC-R191b are red; no Bank it, so both TC-R191d lines are red; the four DENOMINATORS, TC-R191c (the legacy bank still waits) and zero-errors green. On t52 (28378590a526) 11 of 11 green
const L=require('../lib');const D=require('../drive/lesson');
const KEY='Italian Game';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const MOVES=[['e2','e4'],['g1','f3'],['f1','c4'],['c2','c3'],['d2','d3']];
const playThrough=async(b)=>{for(const [f,t] of MOVES){await b.move(f,t,1100);if(/Complete!/.test((await D.noteText(b))||''))break;}await b.settle(700);};
const days=(b)=>b.page.evaluate((k)=>{try{const p=JSON.parse(localStorage.getItem('ct_learnprog')||'{}');return (p[k]&&p[k].days)||[];}catch(e){return null;}},KEY);
L.run(async()=>{
  const T=today();
  const CASES=[
    {id:'TC-R191a',store:{ct_learnprog:{[KEY]:{learned:true,days:[T],bseq:5}},ct_lessonfin:{n:5,by:{[KEY]:5}}},
     want:(n,d)=>/finish a different lesson, then come back/.test(n)&&d.length===1,what:'no second bank without another lesson: the note says so and days stay 1'},
    {id:'TC-R191b',store:{ct_learnprog:{[KEY]:{learned:true,days:[T],bseq:5}},ct_lessonfin:{n:6,by:{[KEY]:5,"King's Gambit":6}}},
     want:(n,d)=>d.length===2&&d[1]===T+'#2'&&/day 2 of 10/.test(n),what:'another lesson finished after the bank: a second day banks today ('+T+'#2) and the note counts day 2'},
    {id:'TC-R191c',store:{ct_learnprog:{[KEY]:{learned:true,days:[T]}},ct_lessonfin:{n:6,by:{"King's Gambit":6}}},
     want:(n,d)=>/Today is already banked/.test(n)&&d.length===1,what:'a bank stored before #550 (no bseq) still waits: days stay 1'},
  ];
  for(const c of CASES){
    const b=await L.launch({geo:'kunal761',name:'bank-'+c.id,store:Object.assign({ct_pool:'3'},c.store)});await b.open();
    let ok=true;try{await D.states['practice-complete'](b);}catch(e){ok=false;L.note(c.id+': '+String(e).slice(0,120));}
    const n=(await D.noteText(b))||'';const d=await days(b)||[];
    L.say(ok&&/Complete!/.test(n),c.id+' DENOMINATOR the Italian Game reached Complete!',{n:n.slice(0,160)});
    L.say(ok&&c.want(n,d),c.id+' '+c.what,{note:n.slice(0,200),days:d});
    await b.close();
  }
  // (d) the hints-on clean run and Bank it
  const b=await L.launch({geo:'kunal761',name:'bank-it',store:{ct_pool:'3'}});await b.open();
  let ok=true;try{await D.states['practice-m0'](b);await D.tapBtn(b,/^Hints$/,400);await playThrough(b);}catch(e){ok=false;L.note('TC-R191d: '+String(e).slice(0,120));}
  const n1=(await D.noteText(b))||'';
  L.say(ok&&/Complete!/.test(n1)&&/Hints were on during this run/.test(n1),'TC-R191d DENOMINATOR a clean run with hints on reached Complete! and says hints were on',{n1:n1.slice(0,200)});
  const bk=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-bank-it"]');if(!e)return null;const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right,h:r.height,txt:e.textContent,vw:innerWidth,vh:innerHeight};});
  L.say(!!bk&&bk.t>=0&&bk.b<=bk.vh&&bk.l>=0&&bk.r<=bk.vw&&bk.h>=44&&/Bank it/.test(bk.txt),'TC-R191d the row offers "Bank it" on screen, 44px or taller ("'+(bk&&bk.txt)+'")',bk);
  const d0=await days(b)||[];
  let again=false;if(bk){try{await b.page.locator('[data-ct="lesson-bank-it"]').click();await b.settle(700);const n2=(await D.noteText(b))||'';again=!/Complete!/.test(n2);await playThrough(b);}catch(e){L.note('bank-it: '+String(e).slice(0,120));}}
  const n3=(await D.noteText(b))||'';const d1=await days(b)||[];
  L.say(d0.length===0&&again&&/Complete!/.test(n3)&&!/Hints were on/.test(n3)&&d1.length===1&&d1[0]===T,'TC-R191d Bank it restarts the line with the hint off, and the clean run banks today (days '+d0.length+' -> '+d1.length+')',{d0,again,n3:n3.slice(0,200),d1});
  L.say(b.errs.length===0,'TC-R191 zero app errors',b.errs.slice(0,3));
  await b.close();
},'111-bank-after-another-lesson');
// SELECTOR-OPENED: lesson-bank-it reading=presence round 2: TC-R191d needs the row on screen and reading Bank it, so a missing hook is red
