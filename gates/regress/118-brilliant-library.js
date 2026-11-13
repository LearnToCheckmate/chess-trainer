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
// CONTROL-RECORD: c33e447 2026-11-11 total=13 red=10 scope=trial:e19888a745d8 how=#550 item (21): the tree before the library (t69: the tile starts the drill on every card, no sheet, no switch) - TC-R197a-f red, the kinds precondition and the one-kind start green
// CONTROL-RECORD: 359de94 2026-11-13 total=25 red=6 scope=trial:aee112168086 how=#550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: the branch tip's bundle (before the fix) - TC-R197g folded/one-tap/fold-again red at kunal761 and se (a line cut at the 44px box's edge, the chip over line 1, one tap scrolling 20px); the precondition, board and error lines and TC-R197a-f green; on t4 28bf2e8d6190 25/0
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
   L.say(!!s0&&s0.chips.every(c=>c.h>=43.5&&c.y>=0&&c.b<=s0.vh+0.5)&&/Practi[cs]e all 5/.test(s0.go||''),'TC-R197c every kind is a 44px chip on screen, and with none chosen the button offers all five ("'+(s0&&s0.go)+'")');
   for(const k of ['played|greek-gift','played|queen-sac','missed|quiet-sac','played|exchange-sac'])await chip(b,k);
   const s1=await sheet(b);const on=s1?s1.chips.filter(c=>c.on).map(c=>c.k):[];
   L.say(on.length===3&&on.indexOf('played|exchange-sac')<0&&/Practi[cs]e these 4/.test(s1.go||''),'TC-R197d at most three kinds: the fourth tap is refused, and the button counts the chosen cards ('+on.join(', ')+'; "'+(s1&&s1.go)+'")',s1&&{on,go:s1.go});
   await chip(b,'played|queen-sac');const s2=await sheet(b);
   L.say(!!s2&&/Practi[cs]e these 3/.test(s2.go||''),'TC-R197d a chosen kind taps off again ("'+(s2&&s2.go)+'")');
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
  // TC-R197g [#550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13]: the Opera Game's 16.Qb8+ as a one-card
  // drill (a one-line goal, so the message float is the 44px of that card at kunal761 and 38 at 320x568). Solved, the explanation (three lines
  // at 375) showed one and a half lines, the 'more' chip sat over the end of line 1, and 'more' scrolled 20px against a 21.75 pitch. Asserted:
  // folded, every painted line is WHOLE (a line box is inside the visible text box or wholly outside it) and the chip covers no line; one tap
  // shows every line inside the message and the screen; tapping again folds it; the board never moves.
  for(const geo of ['kunal761','se']){
    const OP={fen:'1n2kb1r/p2r1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',uci:'b3b8',why:"Qb8+ gives up the queen to drag the knight off d7's guard, and Rd8 is mate next move.",label:'Brilliant',ts:1791000000000,last:null,no:20};
    const b=await L.launch({geo,name:'bril-opera-'+geo,store:{ct_mybrilliancies:[OP],ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(800);await b.page.locator('[data-ct="bril-tile"]').click();await b.settle(1500);}catch(e){ok=false;}
    const bd0=await b.board();if(ok){try{await b.move('b3','b8',0);await b.settle(2500);}catch(e){ok=false;}}
    // the text's own line boxes: the text node inside the message (the inner box where the fix adds one, the message itself before it)
    const rd=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-msg"]');if(!e)return null;const t=e.querySelector('[data-ct="pz-msg-text"]')||e;const tn=[...t.childNodes].find(n=>n.nodeType===3);
      const g=document.createRange();g.selectNodeContents(tn||t);const L=[...g.getClientRects()].filter(x=>x.width>0.5).map(x=>({t:x.top,b:x.bottom,l:x.left,r:x.right}));
      const cs=getComputedStyle(e);const er=e.getBoundingClientRect();const tr=t.getBoundingClientRect();
      // the visible text area: the inner box, clipped to the message's padding box (overflow clips there)
      const vr={top:Math.max(tr.top,er.top+parseFloat(cs.borderTopWidth)),bottom:Math.min(t===e?er.bottom-parseFloat(cs.borderBottomWidth):tr.bottom,er.bottom-parseFloat(cs.borderBottomWidth))};
      const mo=document.querySelector('[data-ct="pz-msg-more"]');const m=mo&&mo.getBoundingClientRect();
      const vis=L.filter(x=>x.b>vr.top+0.5&&x.t<vr.bottom-0.5);
      return {txt:(e.innerText||'').trim(),n:L.length,vis:vis.length,whole:vis.every(x=>x.t>=vr.top-0.5&&x.b<=vr.bottom+0.5),
        all:L.every(x=>x.t>=er.top-0.5&&x.b<=er.bottom+0.5&&x.b<=innerHeight&&x.r<=innerWidth),chip:mo?(mo.innerText||'').trim():null,
        cover:m?vis.filter(x=>x.l<m.right&&x.r>m.left&&x.t<m.bottom&&x.b>m.top).length:0,box:Math.round(er.height),lines:L.map(x=>Math.round(x.t)+'-'+Math.round(x.b)).join(',')};});
    const f=await rd();
    L.say(ok&&!!f&&/Rd8 is mate/.test(f.txt)&&f.n>=2&&!!bd0,'TC-R197g '+geo+' PRECONDITION the Opera Game\'s Qb8+ was solved and its explanation runs to '+(f&&f.n)+' lines in a '+(f&&f.box)+'px box',f);
    L.say(!!f&&f.vis>=1&&f.whole&&f.cover===0&&/more/.test(f.chip||''),'TC-R197g '+geo+' folded, the lines that show are whole ('+(f&&f.vis)+' of '+(f&&f.n)+'), the "more" chip covers none of them, and it says there is more ('+JSON.stringify(f)+')',f);
    let o=null;if(f&&f.chip){await b.page.locator('[data-ct="pz-msg-more"]').click().catch(()=>{});await b.settle(500);o=await rd();}
    L.say(!!o&&o.all&&o.vis===o.n&&o.cover===0,'TC-R197g '+geo+' one tap on it shows the whole explanation: every line inside the message and the screen, none under the chip ('+JSON.stringify(o)+')',o);
    const bd1=await b.board();
    if(o){await b.page.locator('[data-ct="pz-msg-more"]').click().catch(()=>{});await b.settle(500);}const c=await rd();
    L.say(!!c&&c.whole&&c.vis<c.n&&/more/.test(c.chip||''),'TC-R197g '+geo+' a second tap folds it again to whole lines',c);
    const bd2=await b.board();
    L.say(!!bd0&&!!bd1&&!!bd2&&[bd1,bd2].every(x=>Math.abs(x.y-bd0.y)<0.5&&Math.abs(x.w-bd0.w)<0.5),'TC-R197g '+geo+' the board did not move (solve, open, fold)',{bd0,bd1,bd2});
    L.say(b.errs.length===0,'TC-R197g '+geo+' zero app errors',b.errs.slice(0,3));await b.close();}
},'118-brilliant-library');
// SELECTOR-OPENED: bril-kind reading=presence round 4: TC-R197b counts four chips by kind
// SELECTOR-OPENED: bril-lib-go reading=presence round 4: TC-R197c to d read the button's words
// SELECTOR-OPENED: bril-tile reading=presence round 4: TC-R197a reads the tile's words
// SELECTOR-OPENED: drill-counter reading=presence round 4: TC-R197e and f need the counter to read 1 of N
// SELECTOR-OPENED: pz-msg-more reading=presence round 4: the cover count is conjoined with the chip saying more in the same line
// SELECTOR-OPENED: pz-msg-text reading=fallback round 4: falls back to the message box itself
