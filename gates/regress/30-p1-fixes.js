// regress/30-p1-fixes.js  The open P1s from the #371/#372 agents that #373 closes, each as a measurement:
//   A-04 Home has a ☰ (data-ct home-menu, >= 40px) that opens the menu
//   A-16 the menu sheet reaches the bottom of the screen (sheet bottom within 11px of the viewport bottom)
//   A-13 the Play setup sheet with Pass & Play selected does not scroll; Start game and the build line are on screen
//   A-10 Next puzzle changes the puzzle before it is solved (and Previous returns)
//   A-11 tap boxes >= 40px: moves-analyze, moves-copy (live game), piece chips and footer links (menu)
//   A-12 toggling Moves in a live game leaves the board's width and top unchanged (panel reserves its space)
// A-09 (rank-8 badge) is asserted by 20-review.js TC-R07; X-07 (wrong-move text) by the puzzles drive when it lands.
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
    L.say(!!sheet&&sheet.y+sheet.h>=b.geo.h-11&&sheet.y+sheet.h<=b.geo.h+0.5,geo+': A-16 menu sheet reaches the bottom (bottom '+(sheet&&Math.round(sheet.y+sheet.h))+' of '+b.geo.h+')');
    // A-11 in the menu: piece chips and footer links
    const chips=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] button')].filter(x=>/^(Classic|Merida|Chessnut|Spatial|Symbol)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().height)));
    const links=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] a')].filter(x=>/^(Privacy|Terms|Refunds|Delete account)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().height)));
    L.say(chips.length===5&&chips.every(h=>h>=40),geo+': A-11 the five piece chips are at least 40px tall',chips);
    L.say(links.length===4&&links.every(h=>h>=40),geo+': A-11 the four footer links are at least 40px tall',links);
    await b.page.mouse.click(4,4);await b.settle(300);L.say(!(await b.rect('[data-ct="menu-sheet"]')),geo+': the menu closes on a backdrop tap');
    await b.tile('Discover');await b.tapText(/^☰$/,{wait:500});const sheet2=await b.rect('[data-ct="menu-sheet"]');
    L.say(!!sheet2&&sheet2.y+sheet2.h>=b.geo.h-11,geo+': A-16 from Discover the sheet reaches the bottom too (bottom '+(sheet2&&Math.round(sheet2.y+sheet2.h))+')');
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
    await b.card('k8',6500);const m0=await b.metrics();const an=await b.rect('[data-ct="moves-analyze"]');const cp=await b.rect('[data-ct="moves-copy"]');
    L.say(!!an&&an.h>=40&&!!cp&&cp.h>=40,geo+': A-11 Analyze and Copy moves tap boxes are at least 40px tall',{analyze:an&&an.h,copy:cp&&cp.h});
    await b.tapText(/^Moves$/,{wait:700});const m1=await b.metrics();const vis1=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');return e?getComputedStyle(e).visibility:null;});
    await b.tapText(/^Moves$/,{wait:700});const m2=await b.metrics();const vis2=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-panel"]');return e?getComputedStyle(e).visibility:null;});
    L.say(m0.board&&m1.board&&m2.board&&Math.abs(m0.board.w-m1.board.w)<0.6&&Math.abs(m0.board.w-m2.board.w)<0.6&&Math.abs(m0.board.top-m1.board.top)<0.6&&Math.abs(m0.board.top-m2.board.top)<0.6,geo+': A-12 the board keeps its width and top across Moves closed and open',{w:[m0.board&&m0.board.w,m1.board&&m1.board.w,m2.board&&m2.board.w],top:[m0.board&&m0.board.top,m1.board&&m1.board.top,m2.board&&m2.board.top]});
    L.say(vis1!==vis2&&(vis1==='hidden'||vis2==='hidden'),geo+': A-12 the Moves toggle hides and shows the panel content',{closed:vis1,open:vis2});
    L.say(m2.over.over<=0&&m2.over.docScroll===0,geo+': A-12 no scroll after toggling',m2.over);
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
   L.say(ov!==null&&ov<=0,'375x640: A-13 the Pass & Play setup sheet does not scroll (overflow '+ov+', was 16 on #372)');await b.close();}
},'P1-FIXES');
