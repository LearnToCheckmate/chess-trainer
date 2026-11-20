'use strict';
// gates/regress/165-play-option-b.js - THE GAME SCREENS TAKE HIS OPTION B: THE MOVE LIST STRAIGHT UNDER THE BOARD, THE BUTTONS AT THE FOOT.
// US-R125 / TC-R227a..d.
//
// WHY [#550, jobs/a-streamlined-board-view-like-chesscoms-2026-11-11; Kunal's answer run-answers q48 (Option B, after the pictures in
// claude/agents/PLAY-OPTION-B-550.md), the same shape as his a21 pick on Review]: on the game screens - against the computer and Pass & Play,
// upright on a phone - the button row (Moves, Back, Forward, Hint, Flip, More) sat straight under the bottom player bar and the move list at
// the foot. Now the move list sits straight under the bottom bar and the button row at the foot of the screen; the board keeps its size and
// its place.
// WHAT IT READS: the bundle under test (CT_APP), at kunal761 and 320x568, in the middle of a game: vs Pip after 1.e4 2.Nf3 3.Bc4 4.d3 with
// Pip's replies, and the 18-ply Pass & Play game with nine captures (drive/play pp-captures). The rows are found by their hooks
// (pbar-bottom, moves-panel, both older than this build) and the button row by its Moves button's words; the board by its 8-column grid.
// WHAT IT ASSERTS: (a) the move list's top is within 16px under the bottom player bar; (b) the button row is below the move list; (c) the
// button row ends within 16px of the screen's foot and not past it; (d) the board's width and top are the ones the layout before this
// build had (BOARD_PIN, measured on 22725cc's tree), so nothing about the board moved.
// KNOW ITS LIMIT: two games and two upright geometries; sideways play is the rail layout and is untouched by this change.
// CONTROL-RECORD: 22725cc 2026-11-14 total=25 red=12 scope=trial:4f86589d5ec9 how=#550 helper app A, q48 Option B: 22725cc's own bundle (the layout before it) - the move list sits under the button row and the buttons under the bottom bar, so TC-R227a, b and c are red at both geometries for both games (12); TC-R227d green (the board does not move); on the fix's bundle ba183c13359f 25/0
// CONTROL-RECORD: 54754943 2026-11-20 total=24 red=2 scope=trial:a5a69f3a4462 how=batch 13, his q29 (the Play part of job 12): the tree before playFit - TC-R227a (no sheet at se vs the computer) and TC-R227d (298 @88 against the new 320 @129) red; the fix's trial a4e4b10faa66 reads 24/0. The OLD gate on that trial read 13/4: its four PRECONDITION lines were already red there, because the button row went icons-only and Moves has no words (found by 'Moves' text), so TC-R227b and c had not run since; the finder now reads the aria-label too
const L=require('../lib');
const P=require('../drive/play');
// board {w, top} per geometry and game, measured on the tree before this build (22725cc's chess.jsx, bundle 4f86589d5ec9)
// batch 13 (jobs/short-upright-boards-sized-to-height-2026-11-12, the Play part, his q29 of 20 Nov 2026): se/cpu re-pinned 298 @88 -> 320 @129 -
// the eval bar above and the board the full width, the move list behind its Moves button as a sheet (chess.jsx playFit). On the tree before
// (54754943, trial a5a69f3a4462) the old pin held; the new one is red there (see the CONTROL-RECORD).
const BOARD_PIN={'kunal761/cpu':{w:375,top:140.5},'kunal761/pp':{w:375,top:120.5},'se/cpu':{w:320,top:129},'se/pp':{w:320,top:82.8}};
L.run(async()=>{
  for(const geo of ['kunal761','se'])for(const st of ['cpu','pp']){const tag=geo+' '+(st==='cpu'?'vs the computer':'Pass & Play');
    const b=await L.launch({geo,name:'optb-'+st,store:{ct_pool:'3'}});await b.open();let ok=true;
    try{if(st==='cpu'){await P.states['cpu-4ply'](b);await b.move('f1','c4',0);await P.waitPlies(b,6);await b.settle(400);await b.move('d2','d3',0);await P.waitPlies(b,8);await b.settle(1500);}
        else{await P.states['pp-captures'](b);await b.settle(900);}}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const m=await b.page.evaluate(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width*10)/10};};
      const grid=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
      /* batch 13: the button row went icons-only (jobs/every-button-row-is-icons-only-...-2026-11-18), so Moves has no words - its name is its aria-label */
      const mv=[...document.querySelectorAll('button')].find(x=>((x.innerText||'').trim()==='Moves'||x.getAttribute('aria-label')==='Moves')&&x.getBoundingClientRect().width>0);
      const mp=document.querySelector('[data-ct="moves-panel"]');
      return {vh:innerHeight,board:R(grid),bar:R(document.querySelector('[data-ct="pbar-bottom"]')),list:R(mp),sheet:!!mp&&mp.getAttribute('data-sheet')==='1'&&getComputedStyle(mp).position==='fixed',tools:R(mv&&mv.parentElement)};});
    const key=geo+'/'+st;
    L.say(ok&&!!m.board&&!!m.bar&&!!m.list&&!!m.tools,'TC-R227 '+tag+' PRECONDITION a game in progress, with the board, the bottom player bar, the move list and the button row found',m);
    /* batch 13 (his q29): on 320x568 vs the computer the move list is a sheet behind its Moves button (gate 183 reads it), so there the
       button row sits straight under the bottom bar; everywhere else the list is in the column, as before */
    const sheetHere=key==='se/cpu';
    if(sheetHere)L.say(m.sheet&&!!m.tools&&!!m.bar&&m.tools.top>=m.bar.bottom-0.5&&m.tools.top-m.bar.bottom<=16,'TC-R227a '+tag+': the move list is a sheet behind its Moves button (batch 13, q29), and the button row sits straight under the bottom player bar',{sheet:m.sheet,tools:m.tools,bar:m.bar});
    else if(m.bar&&m.list)L.say(!m.sheet&&m.list.top>=m.bar.bottom-0.5&&m.list.top-m.bar.bottom<=16,'TC-R227a '+tag+': the move list sits straight under the bottom player bar (list top '+m.list.top+', bar bottom '+m.bar.bottom+')',{list:m.list,bar:m.bar});
    if(m.list&&m.tools&&!sheetHere)L.say(m.tools.top>=m.list.bottom-0.5,'TC-R227b '+tag+': the button row is below the move list (buttons top '+m.tools.top+', list bottom '+m.list.bottom+')',{list:m.list,tools:m.tools});
    if(m.tools)L.say(m.tools.bottom<=m.vh+0.5&&m.vh-m.tools.bottom<=16,'TC-R227c '+tag+': the button row is at the foot of the screen (its bottom '+m.tools.bottom+' of '+m.vh+')',m.tools);
    const pin=BOARD_PIN[key];
    if(m.board)L.say(!!pin&&Math.abs(m.board.w-pin.w)<=0.5&&Math.abs(m.board.top-pin.top)<=0.5,'TC-R227d '+tag+': the board keeps its size and place ('+m.board.w+' @'+m.board.top+', before this build '+(pin?pin.w+' @'+pin.top:'not pinned')+')',{board:m.board,pin});
    L.say(b.errs.length===0,'TC-R227 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
},'165-play-option-b');
