// regress/30-p1-fixes.js  The open P1s from the #371/#372 agents that #373 closes, each as a measurement:
//   A-04 Home has a ☰ (data-ct home-menu, >= 40px) that opens the menu
//   A-16 the menu sheet reaches the bottom of the screen (sheet bottom within 11px of the viewport bottom)
//   A-13 the Play setup sheet with Pass & Play selected does not scroll; Start game and the build line are on screen
//   A-10 Next puzzle changes the puzzle before it is solved (and Previous returns)
//   A-11 tap boxes >= 40px: moves-analyze, moves-copy (live game), piece chips and footer links (menu)
//   A-12 toggling Moves in a live game leaves the board's width and top unchanged (panel reserves its space)
//   TC-PL-044 (#547) at 375x640 the setup sheet's build line is one line, uncut, and ends with the stamp's (src <12 hex>)
// A-09 (rank-8 badge) is asserted by 20-review.js TC-R07; X-07 (wrong-move text) by the puzzles drive when it lands.
// CONTROL-RECORD: 62be827 2026-11-13 total=39 red=2 scope=trial:5d648bc20064 how=#550 job five-gates-enter-their-state-by-tapping-a-dev-gallery-card (gate 30's A-11/A-12 live game moved off card k8 onto drive/play.js cpu-4ply): the Play board 8px narrower - A-12's width pin red at kunal (345 vs 353) and 390 (382 vs 390); with the k10, k8 and both k11 cards DELETED (trial:e9020df7aebb) 39/0 on the new route; on 77ffccc15668 39/0 by both routes, PASS/FAIL lines identical except the kunal A-12 pin, 375 on the card's dev-only 'demo' opponent and 353 against the computer, re-pinned
'use strict';
const L=require('../lib');
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'p1-'+geo});await b.open();
    // A-04
    const hm=await b.rect('[data-ct="home-menu"]');
    L.say(!!hm&&hm.w>=40&&hm.h>=40,geo+': A-04 Home has a ☰ button of at least 40px',hm);
    await b.tapCt('home-menu',500);const sheet=await b.rect('[data-ct="menu-sheet"]');
    L.say(!!sheet,geo+': A-04 the ☰ on Home opens the menu sheet');
    // A-16 (the sheet from Home is the same sheet; measure it here and again from Discover)
    // #550 jobs/build-menu-one-screen RE-PIN of A-16: the sheet's content FITS now (gate 47 TC-MN-054), so the sheet is as tall as its
    // content. A-16's defect was a cap short of the screen while content still scrolled: the sheet stays inside the screen, and it reaches
    // the bottom whenever its content overflows.
    const fit=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');return s?{sh:s.scrollHeight,ch:s.clientHeight}:null;});
    L.say(!!sheet&&!!fit&&sheet.y+sheet.h<=b.geo.h+0.5&&(fit.sh<=fit.ch||sheet.y+sheet.h>=b.geo.h-11),geo+': A-16 menu sheet stays inside the screen and reaches the bottom whenever it overflows (bottom '+(sheet&&Math.round(sheet.y+sheet.h))+' of '+b.geo.h+', content '+(fit&&fit.sh)+' in '+(fit&&fit.ch)+')');
    // A-11 in the menu: piece chips and footer links
    const links=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] a')].filter(x=>/^(Privacy|Terms|Refunds|Delete account)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().height)));
    L.say(links.length===4&&links.every(h=>h>=40),geo+': A-11 the four footer links are at least 40px tall',links);
    await b.page.mouse.click(4,4);await b.settle(300);L.say(!(await b.rect('[data-ct="menu-sheet"]')),geo+': the menu closes on a backdrop tap');
    // #550 jobs/build-menu-one-screen: the five piece chips live on the Look and feel screen only (one home), so A-11 reads them there
    await b.tapCt('home-menu',500);await b.tapCt('menu-look',700);
    const chips=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="look"] button[data-ct^="look-pc-"]')].map(x=>Math.round(x.getBoundingClientRect().height)));
    L.say(chips.length===5&&chips.every(h=>h>=40),geo+': A-11 the five piece chips (on the Look and feel screen) are at least 40px tall',chips);
    await b.page.mouse.click(4,4);await b.settle(300);
    await b.tile('Discover');await b.tapText(/^☰$/,{wait:500});const sheet2=await b.rect('[data-ct="menu-sheet"]');
    const fit2=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');return s?{sh:s.scrollHeight,ch:s.clientHeight}:null;});
    L.say(!!sheet2&&!!fit2&&sheet2.y+sheet2.h<=b.geo.h+0.5&&(fit2.sh<=fit2.ch||sheet2.y+sheet2.h>=b.geo.h-11),geo+': A-16 from Discover the sheet stays inside the screen and reaches the bottom whenever it overflows (bottom '+(sheet2&&Math.round(sheet2.y+sheet2.h))+', content '+(fit2&&fit2.sh)+' in '+(fit2&&fit2.ch)+')');
    await b.page.mouse.click(4,4);await b.settle(300);
    // A-13
    await b.home();await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.settle(400);
    const setup=await b.rect('[data-ct="setup-sheet"]');const start=await b.rect('button:has-text("Start game")').catch(()=>null);
    const bl=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>/^Build #/.test((d.innerText||'').trim())&&d.children.length===0);if(!e)return null;const r=e.getBoundingClientRect();return {y:r.top,h:r.height};});
    const overSetup=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');const p=s&&s.parentElement;return p?Math.round((p.scrollHeight-p.clientHeight)*10)/10:null;});
    L.say(overSetup!==null&&overSetup<=0,geo+': A-13 the Pass & Play setup sheet does not scroll (overflow '+overSetup+')');
    L.say(!!bl&&bl.y+bl.h<=b.geo.h+0.5,geo+': A-13 the build line is on screen (bottom '+(bl&&Math.round(bl.y+bl.h))+')',bl);
    await b.shot('p1-'+geo+'-setup-passplay');
    // A-12 + A-11 in a live game (card k8: four plies, then toggle Moves twice)
    // THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#550; jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-
    // 2026-10-01]. This was b.card('k8',6500) (a scripted four-ply game); it is now gates/drive/play.js states['cpu-4ply']: Home ->
    // Play -> Computer (Pip) -> Start, 1.e4, the reply, 2.Nf3, the reply - the same four-ply live game, played the way a player plays it.
    await require('../drive/play').states['cpu-4ply'](b);const m0=await b.metrics();
    /* fb-controls (#378): Analyze and Copy moves are rows in the More sheet now, not chips in the MOVES row.
       A-11 MOVES WITH THEM rather than being deleted - the rule it guards (a tap target is at least 40px) did
       not stop applying because the control moved. Measured with the sheet OPEN, since that is the only state
       in which they exist on this screen; b.rect returns null for a selector that is not in the DOM, so left
       unchanged this line would simply have gone FAIL on the first build that shipped the move. */
    await b.tapText(/^More$/,{wait:600});
    const an=await b.rect('[data-ct="moves-analyze"]');const cp=await b.rect('[data-ct="moves-copy"]');
    L.say(!!an&&an.h>=40&&!!cp&&cp.h>=40,geo+': A-11 Analyze and Copy moves rows are at least 40px tall in the More sheet',{analyze:an&&an.h,copy:cp&&cp.h});
    await b.page.mouse.click(4,4);await b.settle(400);   // shut the sheet: it is zIndex 9990 and covers the board
    await b.tapText(/^Moves$/,{wait:700});const m1=await b.metrics();const vis1=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');return e?getComputedStyle(e).visibility:null;});
    await b.tapText(/^Moves$/,{wait:700});const m2=await b.metrics();const vis2=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');return e?getComputedStyle(e).visibility:null;});
    L.say(m0.board&&m1.board&&m2.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.w-m2.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6&&Math.abs(m0.board.top-m2.board.top)<0.6,geo+': A-12 the board keeps its width and top across Moves closed and open',{w:[m0.board&&m0.board.w,m1.board&&m1.board.w,m2.board&&m2.board.w],top:[m0.board&&m0.board.top,m1.board&&m1.board.top,m2.board&&m2.board.top]});
    // #381 re-gate: A-12's board assertion compares the board only against ITSELF across the three samples,
    // which is the exact shape that left 10-gameover unable to see a board 16px wrong. Pinned here for the same
    // reason. Measured on #381: 351 at 375x679, 390 at 390x844.
    // SAID PLAINLY, because it is a gap and not a proof: no negative control has been found for A-12's
    // board claim. Breaking the panel's space reservation (visibility:hidden -> display:none) moves the
    // VISIBILITY assertion below but leaves the board at 353/368/288/353 across 375x679, 390x844, 320x568 and
    // 375x730 - identical on both bundles. So the panel's reservation is not what holds the board steady here,
    // and the comment that says it does is describing an intention rather than the mechanism. The pin below is
    // a real guard against a board that is the wrong size throughout; the unchanged-across-toggle claim above
    // still has nothing proving it can fail.
    // #548 item (92) MOVED IT: the phone's top row took the strip under the board's place, so at 375x679 the board is 367 (was 351) - the same
    // figure gates 10 and 13 were re-pinned to; 390x844 stays 390. Caught red in #548's round-1 suite.
    // #550 THE PLAYER'S ROUTE RE-KEYS IT [jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-2026-10-01]: the live game is now
    // a game against the computer (drive/play.js cpu-4ply), whose top bar names the bot, so at 375x679 the board is 353 - measured on
    // 77ffccc15668 after the toggle - where the dev card's 'demo' opponent, a configuration no player can choose, read 375. 390x844 stays 390.
    const A12={kunal:353,   /* was 375 on card k8:    /* #550 re-keyed: 367 -> 375 at 375x679, measured on t163 7719e5a7fd39 (the board is full width, as gate 13's card k8) */ '390':390};
    if(A12[geo]!=null)L.say(!!m2.board&&Math.abs(m2.board.w-A12[geo])<0.6,geo+': A-12 the board is '+A12[geo]+' wide after the toggle, the measured size - not merely the same as before it',{measured:m2.board&&m2.board.w,want:A12[geo]});
    L.say(vis1!==vis2&&(vis1==='hidden'||vis2==='hidden'),geo+': A-12 the Moves toggle hides and shows the panel content',{closed:vis1,open:vis2});
    L.say(m2.over.over<=0,geo+': A-12 no scroll after toggling',m2.over);
    // A-10
    await b.home();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});
    const s0=await gridSig(b);await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(800);const s1=await gridSig(b);
    L.say(s0&&s1&&s0!==s1,geo+': A-10 Next puzzle shows a different puzzle before the first is solved');
    await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(800);const s2=await gridSig(b);
    L.say(s2===s0,geo+': A-10 Previous puzzle returns to the first');
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // A-13 where it is real: a 640px-tall phone (at 375x679 the sheet fitted before the fix; at 320x568 it scrolls either way)
  {const b=await L.launch({geo:{w:375,h:640,safe:'',label:'375x640'},name:'p1-640'});await b.open();await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.settle(500);
   const ov=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');const p=s&&s.parentElement;return p?Math.round(p.scrollHeight-p.clientHeight):null;});
   L.say(ov!==null&&ov<=0,'375x640: A-13 the Pass & Play setup sheet does not scroll (overflow '+ov+', was 16 on #372)');
   // TC-PL-044 (#547): item (1) put ' (src <12 hex>)' in the stamp; the line wrapped to two and A-13 above went 12 over. The line must stay ONE
   // line AND carry the whole stamp - an ellipsis that ate the hash would pass a height check and lose the very thing item (1) added.
   const sbl=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('[data-ct="setup-sheet"] div')].find(d=>/^Build #/.test((d.innerText||'').trim())&&d.children.length===0);if(!e)return null;const cs=getComputedStyle(e);return {t:e.innerText.trim(),h:Math.round(e.getBoundingClientRect().height*10)/10,lh:parseFloat(cs.fontSize)*1.6,sw:e.scrollWidth,cw:e.clientWidth,fs:cs.fontSize};});
   L.say(!!sbl,'375x640: TC-PL-044 PRECONDITION the setup sheet\'s build line is found',sbl);
   L.say(!!sbl&&/\(src [0-9a-f]{12}\)$/.test(sbl.t),'375x640: TC-PL-044 the build line carries the source md5 the stamp now ends with',sbl&&sbl.t);
   L.say(!!sbl&&sbl.h<=sbl.lh&&sbl.sw<=sbl.cw,'375x640: TC-PL-044 the build line is ONE line and nothing of it is cut (height '+(sbl&&sbl.h)+' within one line of '+(sbl&&Math.round(sbl.lh*10)/10)+', scrollWidth '+(sbl&&sbl.sw)+' <= '+(sbl&&sbl.cw)+')',sbl);
   await b.close();}
},'P1-FIXES');
// SELECTOR-OPENED: home-menu reading=presence round 4: A-04 needs the button at least 40px
// SELECTOR-OPENED: moves-analyze reading=presence round 4: A-11 needs both rows at least 40 tall
// SELECTOR-OPENED: moves-copy reading=presence round 4: A-11 needs both rows at least 40 tall
// SELECTOR-OPENED: moves-panel reading=presence round 4: A-12 needs one of two visibilities to be hidden; null against null is red
// SELECTOR-OPENED: setup-sheet reading=presence round 4: A-13 requires an overflow reading, which needs the sheet
