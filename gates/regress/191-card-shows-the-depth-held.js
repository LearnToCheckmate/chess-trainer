'use strict';
// gates/regress/191-card-shows-the-depth-held.js - THE GAME CARD SHOWS THE DEPTH THE GRADES WERE MADE AT. TC-R286..TC-R289, US-R201.
//
// WHY [#553, batch 14 entry 32; jobs/picking-quick-after-a-deeper-review-keeps-the-deeper-grades-under-the-quick-label-2026-11-20;
// Amber: flags/amber-553-card-shows-the-depth-held]. A review reuses the deepest finished pass for the game, so after Deep, picking Quick shows
// the Deep grades (engine level 1, depth 18) and the review's More sheet honestly reads 'Review depth: Deep' - while the game card's button
// still read 'Quick'. The card now shows the depth held (the stored tally's dp), and says in its title and aria-label that the shallower pick
// was set aside.
//
// WHAT IT ASSERTS, at 375x761 (kunal761) and 320x568 (se). The Opera Game is reviewed at Quick (a first game), a second game is left unreviewed.
//   TC-R286 after Deep then Quick on the card, the button's face reads 'Deep', its data-level is 1, data-kept is 1 and its aria-label names
//           both ('Deep', 'Quick was picked'); the review it opens is at level 1 depth 18 and its More sheet reads Deep: card and review agree.
//           The untouched second game's card still reads 'Quick' with data-kept 0 (the control: the label is not simply 'Deep' everywhere).
//   TC-R287 the card's depth menu ticks Deep (the held level), once only.
//   TC-R288 the face is still 30px tall and its word is not cut (scrollWidth <= clientWidth), the card's own height unchanged by the kept note.
//   TC-R289 zero app errors.
const L=require('../lib');const R=require('../drive/review');
const D0=1763000000000,DAY=86400000;const ME=['cc','jsmiller1112','Jsmiller1112'];
const G=[{src:'cc',acct:ME[1],white:ME[2],black:'DukeKarl',wr:'win',tc:'blitz',date:D0-DAY,pgn:R.PGN_OPERA},
  {src:'cc',acct:ME[1],white:ME[2],black:'magnus',wr:'win',tc:'blitz',date:D0-2*DAY,pgn:'[White "Jsmiller1112"]\n[Black "magnus"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *'}];
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':G},ct_pool:'3',ct_bril_reset_v1:'1'};
const cards=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="game-row"]')].map(r=>{const bt=r.querySelector('[data-ct="game-depth"]');const f=r.querySelector('[data-ct="game-depth-face"]');const fr=f.getBoundingClientRect();
  return {face:f.textContent.replace(/[^A-Za-z]/g,''),level:bt.getAttribute('data-level'),kept:bt.getAttribute('data-kept'),aria:bt.getAttribute('aria-label'),h:fr.height,sw:f.scrollWidth,cw:f.clientWidth,rowH:r.getBoundingClientRect().height};}));
L.run(async()=>{
  for(const [gn,geo] of [['kunal761','kunal761'],['320x568','se']]){
    const b=await L.launch({geo,name:'g191-'+geo,store:STORE});await b.open();
    let ok=false,eng=null,row=null,menu=null,c=null,c0=null;
    const pick=async(l)=>{await b.page.locator('[data-ct="game-depth"]').first().click();await b.settle(400);await b.page.locator('[data-ct="depth-opt"][data-level="'+l+'"]').click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(900);};
    try{await b.tile('Review');await b.settle(1300);c0=await cards(b);
      await pick(1);await b.tapText(/^‹ Back to games$/);await b.settle(900);
      await pick(0);
      eng=await b.page.evaluate(()=>window.__ctReview&&window.__ctReview.engine);
      await R.startReview(b);await b.tapCt('rev-more',500);
      row=await b.page.evaluate(()=>{const d=document.querySelector('[data-ct="rev-depth-level"]');return d&&d.textContent;});
      await b.page.mouse.click(8,8);await b.settle(300);await b.tapCt('rev-back',500);await b.tapText(/^‹ Back to games$/);await b.settle(900);
      c=await cards(b);
      await b.page.locator('[data-ct="game-depth"]').first().click();await b.settle(500);
      menu=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="depth-opt"]')].map(o=>o.getAttribute('aria-checked')==='true'));
      await b.page.mouse.click(8,8);await b.settle(300);ok=true;}catch(e){L.note(gn+' setup: '+String(e).slice(0,200));}
    const f=c&&c[0],s=c&&c[1];
    L.say(ok&&!!c0&&c0.length>=2&&c0[0].face==='Quick'&&c0[0].kept==='0','TC-R286 '+gn+' PRECONDITION the first game starts at Quick, nothing kept',c0&&c0[0]);
    L.say(!!f&&f.face==='Deep'&&f.level==='1'&&f.kept==='1'&&/Deep/.test(f.aria||'')&&/Quick was picked/.test(f.aria||''),'TC-R286 '+gn+' after Deep then Quick the card reads "'+(f&&f.face)+'" (level '+(f&&f.level)+', kept '+(f&&f.kept)+'): "'+(f&&f.aria)+'"',f);
    L.say(!!eng&&eng.level===1&&eng.depth===18&&row==='Deep'&&!!f&&row===f.face,'TC-R286 '+gn+' the review it opens is at level '+(eng&&eng.level)+' depth '+(eng&&eng.depth)+', its sheet reads "'+row+'", and the card reads "'+(f&&f.face)+'": they agree',{eng,row});
    L.say(!!s&&s.face==='Quick'&&s.kept==='0','TC-R286 '+gn+' the untouched second game still reads "'+(s&&s.face)+'" (kept '+(s&&s.kept)+')',s);
    L.say(!!menu&&menu.length===4&&menu[1]===true&&menu.filter(Boolean).length===1,'TC-R287 '+gn+' the card\'s depth menu ticks Deep, once only',menu);
    L.say(!!f&&!!c0&&Math.abs(f.h-30)<=0.6&&f.sw<=f.cw+1&&Math.abs(f.rowH-c0[0].rowH)<=0.6,'TC-R288 '+gn+' the face is '+(f&&f.h)+'px tall, its word is not cut ('+(f&&f.sw)+' in '+(f&&f.cw)+') and the card is as tall as before ('+(f&&f.rowH)+' vs '+(c0&&c0[0].rowH)+')',f);
    L.say(b.errs.length===0,'TC-R289 '+gn+' zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  L.done();
});
// SELECTOR-OPENED: game-depth-face control=pairs the face's text and size are read in every state; absent, TC-R286 reds
// SELECTOR-OPENED: rev-depth-level reading=presence the review sheet's level word; absent it reads null and TC-R286 reds
