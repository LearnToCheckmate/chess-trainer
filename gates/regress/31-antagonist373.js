// regress/31-antagonist373.js  What the antagonist broke on #373 and #374 fixes, kept as measurements:
//   the Brilliant/Blunder LABEL stays inside the board on the h-file (3.Qxh7?? in a short game) - it was 16.5px out
//   a mate delivered by Black on the analysis board (fool's mate) reads 0-1, not M1
//   the Analyze / Copy moves tap boxes are effective for their full height (elementFromPoint 6px below the chip)
//   the Online lobby without sign-in has a way back (audit N-play-1, P0)
'use strict';
const L=require('../lib');
const PGN_BL='[Event "Bl"] [White "A"] [Black "B"] [Result "*"] 1. e4 e5 2. Qh5 Nf6 3. Qxh7 Rxh7 4. d4 exd4 5. Bd3 Nc6 6. Ba6 bxa6 *';
const inside=(b,sel)=>b.page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return null;const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const R=g.getBoundingClientRect();const r=e.getBoundingClientRect();return {left:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,bl:Math.round(R.left*10)/10,br:Math.round(R.right*10)/10,outR:Math.round((r.right-R.right)*10)/10,outL:Math.round((R.left-r.left)*10)/10,text:(e.innerText||'').trim()};},sel);
L.run(async()=>{
  for(const geo of ['kunal','se']){
    const b=await L.launch({geo,name:'anta-'+geo,store:{ct_pool:'3'}});await b.open();
    await b.tile('Review');await b.page.locator('textarea').first().fill(PGN_BL);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
    await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(500);
    await b.tapText(/^Start review/,{wait:800});await b.page.locator('[aria-label="First move"]').first().click();await b.settle(300);
    for(let i=0;i<5;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(120);}await b.settle(900);
    const ml=await b.rect('[data-ct="rev-move-line"]');const lab=await inside(b,'[data-ct="rev-badge-label"]');
    L.say(!!ml&&/Qxh7/.test(ml.text),geo+': at 3.Qxh7',ml&&ml.text);
    L.say(!!lab&&lab.outR<=0.5&&lab.outL<=0.5,geo+': the verdict label on h7 is inside the board (was 16.5px out on #373)',lab);
    await b.shot('anta373-'+geo+'-label-h7');
    // fool's mate on the analysis board from ply 0
    await b.page.locator('[aria-label="First move"]').first().click();await b.settle(400);await b.tapCt('rev-fab',700);
    for(const [f,t] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']])await b.move(f,t,500);await b.settle(2500);
    const num=await b.rect('[data-ct="eval-bar-num"]');L.say(!!num&&/0-1/.test(num.text),geo+': fool\'s mate on the analysis board reads 0-1 (was M1)',num&&num.text);
    await b.tapText(/Exit analysis/,{wait:500});
    // Analyze / Copy effective tap box in a live game
    await b.home();await b.card('k8',6500);
    const hit=await b.page.evaluate(()=>{const out={};for(const k of ['moves-analyze','moves-copy']){const e=document.querySelector('[data-ct="'+k+'"]');if(!e){out[k]=null;continue;}const chip=e.firstElementChild.getBoundingClientRect();const x=chip.left+chip.width/2;const probe=(y)=>{const t=document.elementFromPoint(x,y);return !!(t&&(t===e||e.contains(t)));};out[k]={above6:probe(chip.top-6),below6:probe(chip.bottom+6),above9:probe(chip.top-9),below9:probe(chip.bottom+9)};}return out;});
    L.say(!!hit['moves-analyze']&&hit['moves-analyze'].above6&&hit['moves-analyze'].below6&&hit['moves-copy']&&hit['moves-copy'].above6&&hit['moves-copy'].below6,geo+': Analyze and Copy hit 6px above and below their chips (was: below did nothing)',hit);
    // Online lobby without sign-in has a way back
    await b.home();await b.tile('Play');await b.tapText(/^Online$/);await b.tapText(/^Continue/,{wait:800});
    const back=await b.rect('[data-ct="online-back"]');L.say(!!back&&back.h>=40,geo+': the Online lobby without sign-in has a ‹ Back of at least 40px (N-play-1)',back&&{w:back.w,h:back.h});
    if(back){await b.tapCt('online-back',600);const t=await b.texts();L.say(t.some(x=>/^‹ Home$/.test(x)),geo+': ‹ Back returns to the setup sheet');}
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,geo+': no app error beyond the allowed trap',b.errs.slice(0,2));
    await b.close();
  }
},'ANTAGONIST-373');
