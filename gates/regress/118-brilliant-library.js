'use strict';
// gates/regress/118-brilliant-library.js - THE BRILLIANT LIBRARY: TWO SHELVES BY KIND, UP TO THREE KINDS PRACTISED TOGETHER. US-R129 / TC-R197a..f.
//
// WHY [#550 item (21), jobs/brilliancy-library-and-motif-coverage-2026-09-23]: his answer B9C-BRIL-LIBRARY "now" (the orchestrator's
// ruling on his chat words, Tue 10 Nov 2026: "figure out the styles of the brilliant that it identifies"; on practising them by kind with
// the ones he missed, "Yes, I would like to see those") and B10-SHIP-ON "on". The brilliant-moves tile opens a sheet with the Brilliants
// he played and the ones he missed (item 18), each grouped by kind (brilMotifs' primary tag); he picks up to three kinds and practises
// only those. With a single kind on a single shelf there is nothing to choose and the drill starts at once, as before.
// WHAT IT READS: the bundle under test (CT_APP) at kunal761, a store of real chess.com Brilliants from gates/brilliant-fixed-tests.json
// (their kinds read by the shipped brilKind through gates/engine-extract.js, so the fixture's shelves are the app's own).
const L=require('../lib');
const E=require('../engine-extract.js');
const T=require('../brilliant-fixed-tests.json').tests;
const card=(id,extra)=>{const t=T.find(x=>x.id===id);const pos=E.fromFEN(t.fen);const m=E.getLegal(pos).find(x=>E.cleanSAN(E.toSAN(pos,x,E.applyMove(pos.board,x)))===E.cleanSAN(t.san));
  return Object.assign({fen:t.fen,uci:E.rc2sq(m.fr,m.fc)+E.rc2sq(m.tr,m.tc)+(m.promo||''),label:'Brilliant',ts:1791000000000,last:null,why:'You give up a piece here, and it holds.',no:20},extra||{});};
const MIX=[card('FT01'),card('FT02'),card('FT03'),card('FT12'),card('FT06',{missed:true,played:'Nb3'})];   // played: greek-gift x2, queen-sac, exchange-sac; missed: quiet-sac
const ONE=[card('FT01')];
L.run(async()=>{
  const kinds=MIX.map(c=>(c.missed?'missed':'played')+'|'+E.brilKind(c));
  L.say(kinds.join(',')==='played|greek-gift,played|greek-gift,played|queen-sac,played|exchange-sac,missed|quiet-sac','TC-R197 PRECONDITION the fixture\'s kinds, read by the shipped brilKind: '+kinds.join(', '));
  const sheet=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="bril-lib"]');if(!s)return null;
    const chips=[...s.querySelectorAll('[data-ct="bril-kind"]')].map(e=>{const r=e.getBoundingClientRect();return {k:e.getAttribute('data-k'),t:(e.innerText||'').replace(/\s+/g,' ').trim(),on:e.getAttribute('aria-pressed')==='true',h:r.height,y:r.top,b:r.bottom};});
    const go=s.querySelector('[data-ct="bril-lib-go"]');
    return {shelves:[...s.querySelectorAll('[data-ct^="bril-shelf-"]')].map(e=>e.getAttribute('data-ct')),chips,go:go?(go.innerText||'').trim():null,vh:innerHeight};});
  const chip=async(b,k)=>{await b.page.locator('[data-ct="bril-kind"][data-k="'+k+'"]').click({timeout:3000}).catch(()=>{});await b.settle(250);};
  {const b=await L.launch({geo:'kunal761',name:'bril-lib',store:{ct_mybrilliancies:MIX,ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
   let ok=true;try{await b.tile('Review');await b.settle(800);}catch(e){ok=false;}
   const tile=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="bril-tile"]');return t?(t.innerText||'').replace(/\s+/g,' ').trim():null;});
   L.say(ok&&!!tile&&/4 brilliant moves you found · 1 you missed/.test(tile),'TC-R197a the tile counts the Brilliants he found and the ones he missed apart ("'+tile+'")');
   if(tile)await b.page.locator('[data-ct="bril-tile"]').click();await b.settle(700);
   const s0=await sheet(b);
   L.say(!!s0&&s0.shelves.join(',')==='bril-shelf-played,bril-shelf-missed','TC-R197b a tap opens the library with two shelves, played then missed',s0&&s0.shelves);
   const want=['played|greek-gift','played|queen-sac','played|exchange-sac','missed|quiet-sac'];
   L.say(!!s0&&want.every(k=>s0.chips.some(c=>c.k===k))&&s0.chips.length===4&&/Greek gift 2/.test((s0.chips.find(c=>c.k==='played|greek-gift')||{}).t||''),'TC-R197b each shelf lists its kinds with their counts ('+(s0&&s0.chips.map(c=>c.t).join(' | '))+')',s0&&s0.chips);
   L.say(!!s0&&s0.chips.every(c=>c.h>=43.5&&c.y>=0&&c.b<=s0.vh+0.5)&&/Practise all 5/.test(s0.go||''),'TC-R197c every kind is a 44px chip on screen, and with none chosen the button offers all five ("'+(s0&&s0.go)+'")');
   for(const k of ['played|greek-gift','played|queen-sac','missed|quiet-sac','played|exchange-sac'])await chip(b,k);
   const s1=await sheet(b);const on=s1?s1.chips.filter(c=>c.on).map(c=>c.k):[];
   L.say(on.length===3&&on.indexOf('played|exchange-sac')<0&&/Practise these 4/.test(s1.go||''),'TC-R197d at most three kinds: the fourth tap is refused, and the button counts the chosen cards ('+on.join(', ')+'; "'+(s1&&s1.go)+'")',s1&&{on,go:s1.go});
   await chip(b,'played|queen-sac');const s2=await sheet(b);
   L.say(!!s2&&/Practise these 3/.test(s2.go||''),'TC-R197d a chosen kind taps off again ("'+(s2&&s2.go)+'")');
   await b.page.locator('[data-ct="bril-lib-go"]').click({timeout:3000}).catch(()=>{});await b.settle(1500);
   const d=await b.page.evaluate(()=>{const c=document.querySelector('[data-ct="drill-counter"]');return {lib:!!document.querySelector('[data-ct="bril-lib"]'),counter:c?(c.innerText||'').trim():null,fen:(window.__ctPuzzle&&window.__ctPuzzle.fen)||null};});
   L.say(!d.lib&&!!d.counter&&/\b1 of 3\b/.test(d.counter),'TC-R197e the drill opens on the chosen kinds only: three cards, the two Greek gifts and the missed quiet sacrifice ("'+d.counter+'")',d);
   L.say(b.errs.length===0,'TC-R197e zero app errors',b.errs.slice(0,3));
   await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'bril-lib-one',store:{ct_mybrilliancies:ONE,ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
   await b.tile('Review').catch(()=>{});await b.settle(800);await b.page.locator('[data-ct="bril-tile"]').click().catch(()=>{});await b.settle(1500);
   const r=await b.page.evaluate(()=>({lib:!!document.querySelector('[data-ct="bril-lib"]'),top:!!document.querySelector('[data-ct="pz-top"]')}));
   L.say(!r.lib&&r.top,'TC-R197f one kind on one shelf: nothing to choose, the drill starts at once',r);
   await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'bril-lib-off',store:{ct_mybrilliancies:MIX,ct_bril_reset_v1:'1',ct_pool:'3',ct_bril_lib:'0'}});await b.open();
   await b.tile('Review').catch(()=>{});await b.settle(800);await b.page.locator('[data-ct="bril-tile"]').click().catch(()=>{});await b.settle(1500);
   const r=await b.page.evaluate(()=>{const c=document.querySelector('[data-ct="drill-counter"]');return {lib:!!document.querySelector('[data-ct="bril-lib"]'),counter:c?(c.innerText||'').trim():null};});
   L.say(!r.lib&&!!r.counter&&/\b1 of 5\b/.test(r.counter),'TC-R197f with the switch off (ct_bril_lib 0) the tile starts the drill on all five, as before ("'+r.counter+'")',r);
   const MD=require('../drive/menu');await b.home().catch(()=>{});
   let row=null;try{await MD.states['menu-bottom'](b);await b.settle(400);row=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^Brilliant library/.test((e.innerText||'').trim()));return x?(x.innerText||'').replace(/\s+/g,' ').trim():null;});}catch(e){}
   L.say(!!row&&/OFF$/.test(row),'TC-R197f the menu\'s New features section carries the Brilliant library switch, reading OFF here ("'+row+'")');
   await b.close();}
},'118-brilliant-library');
