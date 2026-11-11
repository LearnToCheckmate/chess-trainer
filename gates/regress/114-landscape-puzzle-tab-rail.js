'use strict';
// gates/regress/114-landscape-puzzle-tab-rail.js - SIDEWAYS PUZZLES: THE TABS ARE A RAIL ON THE RIGHT, THE BOARD FILLS THE HEIGHT, NOTHING SCROLLS. TC-PZ-LAND3a..c, US-INV-05.
//
// WHY [#550, answer a8 of directOpening_2026_11_11_batch10; Kunal in chat, 11 Nov 2026, Option A of docs/mockup-q8-sideways-2026-11-11:
// "When you make it sideways one that floating row at the bottom should not be there because that takes up the space of the board. It
// should only be on the right side ... on sideways, there's enough space to fit everything without scrolling";
// jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03]. The bottom tab row took the board's height (280) and pushed
// Prev and Next under the fold behind a "More below" chip.
//
// WHAT IT ASSERTS on the first puzzle at 761x375 (his phone turned), 730x375, 844x390 and 667x375:
//  (a) TC-PZ-LAND3a the tab bar is a rail on the RIGHT edge (its left past the middle, full height) with its five tabs, and nothing
//      sits under the board (no bottom bar).
//  (b) TC-PZ-LAND3b the board is at least 352 tall (the height less its margins) and wholly on screen, left of the tab rail.
//  (c) TC-PZ-LAND3c Roadmap, Hint, Show, Reset, Prev and Next are all on screen, 44px or taller, left of the tab rail, each centre
//      hit-tests to its own button, and the panel does not scroll.
// DENOMINATOR per size: the puzzle screen is reached and the board is measured.
// CONTROL-RECORD: 6180c2b 2026-11-11 total=21 red=12 scope=trial:2f17c3b52792 how=#550 answer a8: the tree before the tab rail (the bottom tab row, a 280 board, Prev and Next below the fold) - TC-PZ-LAND3a, b and c red at all four sizes; the denominators and the error lines green. On t58 21 of 21 green
// CONTROL-RECORD: 386d5b5 2026-11-11 total=21 red=12 scope=trial:2f17c3b52792 how=the same pre-rail tree re-run on the gate whose tab-word regexes now accept the words with their emoji (antagonist A round 3, A3-10): TC-PZ-LAND3a, b and c red at all four sizes, as before; the denominators and error lines green
const L=require('../lib');
const SIZES=[[761,375],[730,375],[844,390],[667,375]];
L.run(async()=>{
  for(const [W,H] of SIZES){const tag=W+'x'+H;
    const b=await L.launch({geo:{w:W,h:H,safe:''},name:'pzrail-'+W});await b.open();
    let ok=true;try{await b.tile('Puzzles');await b.settle(900);try{await b.tapText(/^(▶ )?(Continue|Start|Solve|Next puzzle)/i,{wait:900});}catch(e){}await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,120));}
    const m=ok?await b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8/.test(d.style.gridTemplateColumns)).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const tb=document.querySelector('[data-ct="tabbar"]');const t=tb?tb.getBoundingClientRect():null;
      const want=[['Roadmap',/Roadmap/],['Hint',/^(💡 )?Hint$/],['Show',/^(👁 )?Show( move)?$/],['Reset',/^(↺ )?Reset$/],['Prev',/^Previous puzzle$/],['Next',/^Next puzzle$/]];   // A3-11: matched by what each SAYS (aria-label or text), so the tree before a8 is found too - its red is the fold, not a missing hook
      const btn=(re)=>[...document.querySelectorAll('button')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&(re.test(x.getAttribute('aria-label')||'')||re.test((x.innerText||'').trim()));});
      const bs=want.map(([k,re])=>{const e=btn(re);if(!e)return {k,miss:true};const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {k,h:r.height,y:r.top,b:r.bottom,r:r.right,hit:!!hit&&(hit===e||e.contains(hit))};});
      const rail=document.querySelector('.ctside');
      return {vw:innerWidth,vh:innerHeight,board:bd?{x:bd.left,y:bd.top,w:bd.width,b:bd.bottom,r:bd.right}:null,tab:t?{x:t.left,y:t.top,w:t.width,h:t.height,n:tb.querySelectorAll('button').length}:null,bs,rail:rail?{sh:rail.scrollHeight,ch:rail.clientHeight}:null};}):null;
    L.say(ok&&!!m&&!!m.board,tag+': TC-PZ-LAND3 DENOMINATOR the puzzle screen is up and the board measured',m&&m.board);
    if(m&&m.board){
      L.say(!!m.tab&&m.tab.x>m.vw/2&&m.tab.h>=m.vh-1&&m.tab.n===5&&m.board.b<=m.vh+0.5,tag+': TC-PZ-LAND3a the five tabs are a full-height rail on the right edge ('+(m.tab&&(Math.round(m.tab.x)+'..'+Math.round(m.tab.x+m.tab.w)+', '+Math.round(m.tab.h)+' tall'))+'), not a row under the board',m.tab);
      L.say(m.board.w>=352&&m.board.y>=0&&m.board.b<=m.vh+0.5&&!!m.tab&&m.board.r<=m.tab.x+0.5,tag+': TC-PZ-LAND3b the board is '+Math.round(m.board.w)+' tall, on screen and left of the tab rail',{board:m.board,tab:m.tab});
      L.say(m.bs.every(x=>!x.miss&&x.h>=43.5&&x.y>=0&&x.b<=m.vh+0.5&&x.hit&&(!m.tab||x.r<=m.tab.x+0.5))&&!!m.rail&&m.rail.sh-m.rail.ch<=1,tag+': TC-PZ-LAND3c Roadmap, Hint, Show move, Reset, Prev and Next are on screen, 44px or taller, hit-testable and left of the rail, and the panel does not scroll ('+m.bs.map(x=>x.miss?x.k+' MISSING':x.k+' '+Math.round(x.h)).join(', ')+'; '+(m.rail&&(m.rail.sh+'/'+m.rail.ch))+')',{bs:m.bs,rail:m.rail});
    }
    L.say(b.errs.length===0,tag+': TC-PZ-LAND3 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'114-landscape-puzzle-tab-rail');
