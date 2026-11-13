// regress/31-antagonist373.js  What the antagonist broke on #373 and #374 fixes, kept as measurements:
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [#550 item (59); jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21]: every launch in this file passes ct_pool, so the app runs its POOLED Stockfish path and the single-worker and built-in fallbacks (the harness route is the launch option engineFail 'pool' or 'all', driven by gate 34) are NOT exercised here. Its assertions DEPEND on that branch: the labels it places (Brilliant, Blunder) are the review's, so which plies carry them is the pooled path's.
//   the Brilliant/Blunder LABEL stays inside the board on the h-file (3.Qxh7?? in a short game) - it was 16.5px out
//   a mate delivered by Black on the analysis board (fool's mate) reads 0-1, not M1
//   the Analyze / Copy moves tap boxes are effective for their full height (elementFromPoint 6px below the chip)
//   the Online lobby without sign-in has a way back (audit N-play-1, P0)
// CONTROL-RECORD: 39ef1e3 2026-11-13 total=15 red=2 scope=trial:bf3e611a11a8 how=#550 job five-gates-enter-their-state-by-tapping-a-dev-gallery-card (gate 31 moved off the k8 card onto drive/play.js cpu-more): the More sheet's Analyze row given marginBottom -20 so Copy covers its bottom band - 'Analyze and Copy are effective across their full height' red at kunal and se (moves-analyze bot3 false); with the k8 gallery card DELETED (trial:5d0fdc266f6d) the gate is 15/0 on the new route; on 342f7329901b 15/0, PASS/FAIL lines byte-identical to the old b.card('k8') route
'use strict';
const L=require('../lib');
const PGN_BL='[Event "Bl"] [White "A"] [Black "B"] [Result "*"] 1. e4 e5 2. Qh5 Nf6 3. Qxh7 Rxh7 4. d4 exd4 5. Bd3 Nc6 6. Ba6 bxa6 *';
const inside=(b,sel)=>b.page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return null;const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const R=g.getBoundingClientRect();const r=e.getBoundingClientRect();return {left:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,bl:Math.round(R.left*10)/10,br:Math.round(R.right*10)/10,outR:Math.round((r.right-R.right)*10)/10,outL:Math.round((R.left-r.left)*10)/10,text:(e.innerText||'').trim()};},sel);
L.run(async()=>{
  for(const geo of ['kunal','se']){
    const b=await L.launch({geo,name:'anta-'+geo,store:{ct_pool:'3'}});await b.open();
    await b.tile('Review');await b.page.locator('textarea').first().fill(PGN_BL);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
    await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(500);
    await b.tapText(/^Start review/,{wait:800});await require('../drive/review').navTap(b,'First move');await b.settle(300);
    for(let i=0;i<5;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(120);}await b.settle(900);
    const ml=await b.rect('[data-ct="rev-move-line"]');const lab=await inside(b,'[data-ct="rev-badge-label"]');
    L.say(!!ml&&/Qxh7/.test(ml.text),geo+': at 3.Qxh7',ml&&ml.text);
    L.say(!!lab&&lab.outR<=0.5&&lab.outL<=0.5,geo+': the verdict label on h7 is inside the board (was 16.5px out on #373)',lab);
    await b.shot('anta373-'+geo+'-label-h7');
    // fool's mate on the analysis board from ply 0
    await require('../drive/review').navTap(b,'First move');await b.settle(400);   /* #550 a21: First move is in the more sheet in the streamlined review */await b.tapCt('rev-fab',700);
    for(const [f,t] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])await b.move(f,t,500);await b.settle(2500);
    const num=await b.rect('[data-ct="eval-bar-num"]');L.say(!!num&&/0-1/.test(num.text),geo+': fool\'s mate on the analysis board reads 0-1 (was M1)',num&&num.text);
    await b.tapText(/Exit analysis/,{wait:500});
    /* Analyze / Copy effective tap box in a live game. THE ASSERTION MOVED WITH THE CONTROLS IN #378 rather
       than being deleted: fb-controls ("Just those two") folded both into the More sheet, so the 23px chip with
       a 43px padded tap box is gone from this screen and with it the thing the old probe measured. What the
       objection was actually about survives unchanged - that a tap landing anywhere on the control's visible
       height does something - so it is measured the same way, by elementFromPoint, against the row's own box.
       A sheet row IS the button, so the probe is taken INSIDE its top and bottom edges rather than 6px outside
       them, and a row that reports a hit at both ends has no dead band. */
    // THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#550; jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-
    // card-2026-10-01]. This used to be b.home(); b.card('k8',6500) (a scripted two-move game) then More. It now plays the game
    // the way a player does - Home -> Play -> Computer (Pip) -> Start, 1.e4, the reply, 2.Nf3, the reply - and opens More:
    // gates/drive/play.js states['cpu-more']. Equivalence on one bundle (342f7329901b): the PASS line reads the same rows at the
    // same heights at kunal and se (moves-analyze and moves-copy h 45, top3/mid/bot3 all true) by both routes.
    await require('../drive/play').states['cpu-more'](b);
    const hit=await b.page.evaluate(()=>{const out={};for(const k of ['moves-analyze','moves-copy']){const e=document.querySelector('[data-ct="'+k+'"]');if(!e){out[k]=null;continue;}const r=e.getBoundingClientRect();const x=r.left+r.width/2;const probe=(y)=>{const t=document.elementFromPoint(x,y);return !!(t&&(t===e||e.contains(t)));};out[k]={h:Math.round(r.height*10)/10,top3:probe(r.top+3),mid:probe(r.top+r.height/2),bot3:probe(r.bottom-3)};}return out;});
    const eff=(k)=>!!hit[k]&&hit[k].h>=40&&hit[k].top3&&hit[k].mid&&hit[k].bot3;
    L.say(eff('moves-analyze')&&eff('moves-copy'),geo+': Analyze and Copy are effective across their full height as More-sheet rows (#378 moved them there)',hit);
    await b.page.mouse.click(4,4);await b.settle(400);
    // Online lobby without sign-in has a way back
    await b.home();await b.tile('Play');await b.tapText(/^Online$/);await b.tapText(/^Continue/,{wait:800});
    const back=await b.rect('[data-ct="online-back"]');L.say(!!back&&back.h>=40,geo+': the Online lobby without sign-in has a ‹ Back of at least 40px (N-play-1)',back&&{w:back.w,h:back.h});
    if(back){await b.tapCt('online-back',600);const t=await b.texts();L.say(t.some(x=>/^‹ Home$/.test(x)),geo+': ‹ Back returns to the setup sheet');}
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,geo+': no app error beyond the allowed trap',b.errs.slice(0,2));
    await b.close();
  }
},'ANTAGONIST-373');
