'use strict';
// gates/regress/183-play-short-phone-board-full-width.js - PLAY AGAINST THE COMPUTER ON A SHORT UPRIGHT PHONE: THE EVAL BAR ABOVE, THE
// BOARD THE FULL WIDTH, THE ROWS GIVING WAY (playFit). US-R174 (the Play clause) / TC-R260a..e.
//
// WHY: jobs/short-upright-boards-sized-to-height-2026-11-12 and jobs/every-screen-stays-clean-at-every-phone-width-and-text-size-2026-11-19,
// the Play part, on Kunal's answer to run-question q29 (about 3:01-3:05pm EST Fri 20 Nov 2026, "The run's picks (Recommended)"): Play
// against the computer on the short phones (375x667, 360x640, 320x568 at normal text), live and finished, gets the eval bar ABOVE the
// board and a FULL-WIDTH board, the player bars thinner and, on 320x568, the move list behind its Moves button - as Review does. It
// REVERSES his 11 Nov 2026 pick a35 (the bar beside the board on short screens), on his own word. Before it, those boards were 353, 338
// and 298 wide, 20px from the left edge and 2px from the right (trial a5a69f3a4462 of 54754943).
// WHAT IT READS: the bundle under test (CT_APP), vs Pip at 4 plies (drive/play cpu-4ply) and the same game resigned (cpu-resigned), at
// 375x667, 360x640, 320x568 (no insets) and his 375x761 (insets 51,31) to show the tall phone unchanged. The board by its 8-column grid;
// the rows by their hooks (eval-bar-h, eval-bar-v, pbar-top, pbar-bottom, moves-panel, play-toolbar), all older than this build except
// the panel's data-sheet, which is why (e) also reads the panel's painted visibility and its words, not only the attribute.
// WHAT IT ASSERTS:
//  a  the board is the full width: left and right gaps to the screen 1.5px or less
//  b  the eval bar is the horizontal one, between the top player bar and the board; no bar beside the board
//  c  the rows stack in order and on screen: top bar, eval bar, board, bottom bar, (move list,) button row ending inside the screen
//  d  his 375x761 is unchanged: board 375 at top 140.5 and the bars 64.5 tall, as on 54754943's tree (trial a5a69f3a4462)
//  e  the move list: on 320x568 it is a sheet (out of the column), closed; Moves opens it with the game's moves in it and closes it,
//     and the board does not move by 0.5px either way; on the other phones it is in the column, shown, under the bottom bar
// KNOW ITS LIMIT: one game, two states, four phones at normal text; the text sizes and the other screens are gates 177 and 178's
// (they read play-cpu and play-cpu-resigned in all 32 cells). Headless Chromium, not his phone.
// CONTROL-RECORD: 54754943 2026-11-20 total=55 red=18 scope=trial:a5a69f3a4462 how=batch 13, the tree before playFit (bar beside on the short phones): TC-R260a and b red at 375x667, 360x640 and 320x568 in both states (353, 338 and 298 wide, 20px from the left, eval-bar-v), TC-R260e red at 320x568 (the list in the column, no sheet) - 18; the 375x761 lines, TC-R260d among them, green; the fix's trial a4e4b10faa66 reads 55/0
// CONTROL-RECORD: (pairs) the two Play breaks of gates/pairs/jobs/short-upright-boards-sized-to-height-2026-11-12.json are graded on gates 177/178 by the grading machine; see that job's report line
const L=require('../lib');
const P=require('../drive/play');
const PHONES=[['375x667',{w:375,h:667,safe:'',label:'375x667'}],['360x640',{w:360,h:640,safe:'',label:'360x640'}],['320x568','se'],['375x761','kunal761']];
const read=(b)=>b.page.evaluate(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();if(r.width<=0)return null;return {l:Math.round(r.left*100)/100,t:Math.round(r.top*100)/100,r:Math.round(r.right*100)/100,b:Math.round(r.bottom*100)/100,w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100};};
  const q=s=>document.querySelector('[data-ct="'+s+'"]');
  const grid=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  const mp=q('moves-panel');const cs=mp?getComputedStyle(mp):null;
  return {vw:innerWidth,vh:innerHeight,board:R(grid),evH:R(q('eval-bar-h')),evV:R(q('eval-bar-v')),top:R(q('pbar-top')),bot:R(q('pbar-bottom')),tb:R(q('play-toolbar')),
    mp:mp?{rect:R(mp),sheet:mp.getAttribute('data-sheet')==='1',pos:cs.position,vis:cs.visibility,txt:(mp.innerText||'').replace(/\s+/g,' ').trim().slice(0,80)}:null};});
L.run(async()=>{
  for(const [name,geo] of PHONES)for(const st of ['cpu-4ply','cpu-resigned']){const tag=name+' '+(st==='cpu-4ply'?'vs Pip at 4 plies':'resigned');
    const b=await L.launch({geo,name:'g183-'+name+'-'+st});await b.open();let ok=true;
    try{await P.states[st](b);await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,160));}
    const m=await read(b);
    L.say(ok&&!!m.board&&!!m.top&&!!m.bot&&!!m.tb&&!!m.mp,'TC-R260 '+tag+': DENOMINATOR - the state was reached and the board, both player bars, the button row and the move list were found',{ok,board:m.board,mp:!!m.mp});
    if(!m.board||!m.top||!m.bot||!m.tb||!m.mp){await b.close();continue;}
    const gl=m.board.l,gr=m.vw-m.board.r;
    L.say(gl<=1.5&&gl>=-1.5&&gr<=1.5&&gr>=-1.5,'TC-R260a '+tag+': the board is the full width ('+m.board.w+' of '+m.vw+', '+gl+'px from the left and '+Math.round(gr*100)/100+'px from the right)',{board:m.board,vw:m.vw});
    L.say(!!m.evH&&!m.evV&&m.evH.t>=m.top.b-0.5&&m.evH.b<=m.board.t+0.5&&m.evH.w>=m.board.w-1,'TC-R260b '+tag+': the eval bar is the horizontal one, between the top player bar and the board, and none is beside the board',{evH:m.evH,evV:m.evV,top:m.top,board:m.board});
    const inCol=!m.mp.sheet;
    const order=m.top.b<=(m.evH?m.evH.t:m.board.t)+0.5&&m.bot.t>=m.board.b-0.5&&(inCol?(m.mp.rect.t>=m.bot.b-0.5&&m.tb.t>=m.mp.rect.b-0.5):m.tb.t>=m.bot.b-0.5)&&m.tb.b<=m.vh+0.5;
    L.say(order,'TC-R260c '+tag+': the rows stack in order and on screen (top bar, eval bar, board, bottom bar, '+(inCol?'move list, ':'')+'buttons ending at '+m.tb.b+' of '+m.vh+')',{top:m.top,evH:m.evH,board:m.board,bot:m.bot,mp:m.mp.rect,tb:m.tb});
    if(name==='375x761')L.say(Math.abs(m.board.w-375)<0.5&&Math.abs(m.board.t-140.5)<0.5&&Math.abs(m.top.h-64.5)<0.6&&Math.abs(m.bot.h-64.5)<0.6&&inCol,'TC-R260d '+tag+': his phone is unchanged - board '+m.board.w+' at top '+m.board.t+', bars '+m.top.h+' and '+m.bot.h+' (54754943: 375 at 140.5, 64.5 and 64.5), the move list in the column',{board:m.board,top:m.top,bot:m.bot,sheet:m.mp.sheet});
    if(name==='320x568'){
      L.say(m.mp.sheet&&m.mp.pos==='fixed'&&m.mp.vis==='hidden','TC-R260e '+tag+': the move list is behind its Moves button - a sheet out of the column, closed',{mp:m.mp});
      let opened=null,closed=null;
      try{await P.tapBtn(b,/^Moves$/,700);opened=await read(b);await P.tapBtn(b,/^Moves$/,700);closed=await read(b);}catch(e){L.note(tag+': Moves tap: '+String(e).slice(0,140));}
      const same=(x)=>!!x&&!!x.board&&Math.abs(x.board.t-m.board.t)<0.5&&Math.abs(x.board.w-m.board.w)<0.5&&Math.abs(x.board.l-m.board.l)<0.5;
      L.say(!!opened&&opened.mp.vis==='visible'&&/\b1\.\s*e4\b/.test(opened.mp.txt)&&opened.mp.rect.b<=opened.tb.t+0.5&&same(opened),'TC-R260e '+tag+': Moves opens the sheet, with the game\'s moves in it, above the button row, and the board does not move',{mp:opened&&opened.mp,board:opened&&opened.board,before:m.board});
      L.say(!!closed&&closed.mp.vis==='hidden'&&same(closed),'TC-R260e '+tag+': Moves again closes it, and the board does not move',{mp:closed&&closed.mp,board:closed&&closed.board});
    }else L.say(inCol&&m.mp.vis==='visible'&&m.mp.pos!=='fixed'&&/\b1\.\s*e4\b/.test(m.mp.txt),'TC-R260e '+tag+': the move list is in the column, shown, with the game\'s moves',{mp:m.mp});
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));L.say(bad.length===0,'TC-R260 '+tag+': no app error',{errs:bad.slice(0,3)});
    await b.close();
  }
},'PLAY-SHORT-PHONE-FULL-WIDTH');
