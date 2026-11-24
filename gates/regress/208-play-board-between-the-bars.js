'use strict';
// gates/regress/208-play-board-between-the-bars.js - AGAINST THE COMPUTER THE BOARD SITS BETWEEN ITS TWO PLAYER BARS, ON NEITHER. US-R218 / TC-R328..329.
//
// WHY [#553 B1, jobs/at-375x568-the-board-overlaps-the-top-of-the-bottom-player-bar-against-the-bot-2026-11-07]: #549's run notes filed, from
// one screenshot of its run branch at 375x568 vs Pip, "the board overlaps the top of the bottom 'You' player bar (~6px) and the top bar sits
// under the board". #550 measured it and did not reproduce it (a 2px gap above and below at 375x568, 320x568 and 375x761), and read the
// screenshot as the pieces' paint: every piece is drawn at transform:scale(1.06), so the bottom rank's pieces paint ~1.4px past the board's
// box (CLAUDE.md "a transform is paint, not layout"). No gate held it, so this gate is that measurement, kept: the board's LAYOUT box and the
// pieces' PAINTED boxes against both bars, after moves as well as at move 0.
// WHAT IT READS: the bundle under test (CT_APP), vs Pip (drive/play cpu-m0, then cpu-4ply: 1.e4, 2.Nf3 and the replies), at 375x568 (short375,
// the job's own size), 320x568 (se) and 375x761 with his insets (kunal761). The board is lib's b.board() (the widest 8-column grid); the bars
// are [data-ct="pbar-top"] and [data-ct="pbar-bottom"]; the pieces are the <img>s inside the board's 64 cells.
//  TC-R328 DENOMINATOR the game is up with both bars and a board, at move 0 and after 4 plies.
//  TC-R328 the board's box starts at or below the top bar's bottom and ends at or above the bottom bar's top (gaps printed; >= 0).
//  TC-R329 no piece's PAINTED box crosses into either bar: the highest piece's top is at or below the top bar's bottom, the lowest piece's
//          bottom at or above the bottom bar's top (the 1.06 overhang printed).
//  TC-R328 zero app errors.
const L=require('../lib');const P=require('../drive/play');
const read=(b)=>b.page.evaluate(()=>{const R=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {t:+q.top.toFixed(1),b:+q.bottom.toFixed(1),l:+q.left.toFixed(1),r:+q.right.toFixed(1),h:+q.height.toFixed(1)};};
  const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));let grid=null,bw=0;for(const e of els){const q=e.getBoundingClientRect();if(q.width>bw){bw=q.width;grid=e;}}
  const vis=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return q.width>0&&q.height>0?e:null;};
  const top=vis(document.querySelector('[data-ct="pbar-top"]')),bot=vis(document.querySelector('[data-ct="pbar-bottom"]'));
  const imgs=grid?[...grid.querySelectorAll('img')].map(i=>i.getBoundingClientRect()).filter(q=>q.width>0):[];
  return {board:R(grid),top:R(top),bot:R(bot),nImg:imgs.length,pTop:imgs.length?+Math.min(...imgs.map(q=>q.top)).toFixed(1):null,pBot:imgs.length?+Math.max(...imgs.map(q=>q.bottom)).toFixed(1):null};});
L.run(async()=>{
  for(const [gn,geo] of [['375x568','short375'],['320x568','se'],['375x761','kunal761']]){
    const b=await L.launch({geo,name:'g208-'+geo,store:{ct_pool:'3'}});await b.open();
    for(const st of ['cpu-m0','cpu-4ply']){const tag=gn+' '+st;let ok=true;
      try{await P.states[st](b);await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
      const m=await read(b);
      L.say(ok&&!!m.board&&!!m.top&&!!m.bot&&m.nImg>=24,tag+': TC-R328 DENOMINATOR the game is up: board '+(m.board&&m.board.t+'..'+m.board.b)+', top bar '+(m.top&&m.top.t+'..'+m.top.b)+', bottom bar '+(m.bot&&m.bot.t+'..'+m.bot.b)+', '+m.nImg+' pieces',m);
      if(m.board&&m.top&&m.bot){
        const gT=+(m.board.t-m.top.b).toFixed(1),gB=+(m.bot.t-m.board.b).toFixed(1);
        L.say(gT>=-0.5&&gB>=-0.5,tag+': TC-R328 the board sits between its bars: '+gT+'px under the top bar, '+gB+'px above the bottom bar (neither below 0)',{gT,gB});
        const oT=m.pTop==null?null:+(m.top.b-m.pTop).toFixed(1),oB=m.pBot==null?null:+(m.pBot-m.bot.t).toFixed(1);
        L.say(m.pTop!=null&&m.pTop>=m.top.b-0.5&&m.pBot<=m.bot.t+0.5,tag+': TC-R329 no piece is painted onto a bar: the highest piece at '+m.pTop+' (top bar ends '+m.top.b+'), the lowest ends '+m.pBot+' (bottom bar starts '+m.bot.t+'); paint past the board box '+(m.board.t-m.pTop).toFixed(1)+' / '+(m.pBot-m.board.b).toFixed(1)+'px',{pTop:m.pTop,pBot:m.pBot,oT,oB});
      }}
    L.say(b.errs.length===0,gn+' TC-R328 zero app errors',b.errs.slice(0,3));
    await b.close();}
},'208-play-board-between-the-bars');
