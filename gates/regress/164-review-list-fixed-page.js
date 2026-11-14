'use strict';
// gates/regress/164-review-list-fixed-page.js - THE REVIEW GAMES LIST IS A FIXED PAGE: ONLY THE GAMES BOX SCROLLS, AND IT FILLS THE REST. TC-INV-08w.
//
// WHY [#550 helper B; jobs/pages-that-scroll-must-fit-on-one-screen-2026-11-11; Kunal's q45 answer (run-answers q45-answer): of the Review games
// list, option (a) "a fixed page where only the games box scrolls, filling the rest of the screen"]. The list page scrolled as a whole (root
// 763 in 568 at 320x568 with three games) with the games box a second scroller inside it, capped at min(46vh, 340) (AUD-R10).
// WHAT IT ASSERTS, with a LONG list (40 stored games, so the box must scroll) at 375x761 (kunal761) and 320x568, player view:
//  DENOMINATOR the list is up with its games box ([data-ct="glist-box"], or the old box found as the scroller holding the game rows).
//  (a) TC-INV-08w the page does not scroll: #root's scrollHeight <= clientHeight + 1.
//  (b) TC-INV-08w the games box fills the rest: its bottom sits within 32px above the tab bar's top (and not under it) - the 32 is the games
//      card's own bottom padding, the root's bottom padding and the 6px the tab-bar spacer is taller than the bar (27 measured at 375x761),
//      not empty page; and it holds at least ONE whole game row with the next one showing (box height >= one row + 12px; the lead's ruling
//      for 320x568, where the short-phone compaction gives the box about 140px). The box's height is printed at both sizes.
//  (c) TC-INV-08w only the box scrolls, and it reaches its last game: the box overflows, and scrolling the box itself to its end brings the
//      last row fully into the box's visible part, where it takes a tap.
const L=require('../lib');const R=require('../drive/review');
const DAY=86400000;
const games=[];for(let i=0;i<40;i++)games.push({src:'cc',acct:'jsmiller1112',pgn:R.PGN_OPERA,white:'Jsmiller1112',black:'Opponent'+i,wr:(i%3?'win':'checkmated'),tc:'blitz',date:Date.now()-(i+1)*DAY});
const STORE={ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':games},ct_pool:'3',ct_bril_reset_v1:'1'};
L.run(async()=>{
  for(const [gn,geo] of [['375x761','kunal761'],['320x568','se']]){const tag='TC-INV-08w Review games list '+gn;
    const b=await L.launch({geo,dev:false,name:'glist164',store:STORE});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(1500);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,120));}
    const m=await b.page.evaluate(()=>{const rows=[...document.querySelectorAll('[data-ct="game-row"]')];if(!rows.length)return {rows:0};
      let box=document.querySelector('[data-ct="glist-box"]');if(!box){box=rows[0].parentElement;while(box&&!/auto|scroll/.test(getComputedStyle(box).overflowY))box=box.parentElement;}
      const root=document.getElementById('root');const tb=document.querySelector('[data-ct="tabbar"]');const tbt=tb&&tb.getBoundingClientRect().height>0?tb.getBoundingClientRect().top:innerHeight;
      if(!box)return {rows:rows.length,box:null};const q=box.getBoundingClientRect();
      const rowH=+rows[0].getBoundingClientRect().height.toFixed(1);
      const out={rowH,rows:rows.length,root:{sh:root.scrollHeight,ch:root.clientHeight},box:{top:+q.top.toFixed(1),bot:+q.bottom.toFixed(1),sh:box.scrollHeight,ch:box.clientHeight},tab:+tbt.toFixed(1)};
      box.scrollTop=box.scrollHeight;const last=rows[rows.length-1];{const r0=last.getBoundingClientRect(),qb=box.getBoundingClientRect();if(r0.top<qb.top)box.scrollTop-=Math.ceil(qb.top-r0.top);}   /* scrolled to its end, then back just far enough that the last game is whole (the 'more' buttons follow it inside the box) */
      const r=last.getBoundingClientRect();const q2=box.getBoundingClientRect();
      const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      out.last={top:+r.top.toFixed(1),bot:+r.bottom.toFixed(1),inBox:r.top>=q2.top-0.5&&r.bottom<=q2.bottom+0.5&&r.bottom<=tbt+0.5,hit:!!h&&(h===last||last.contains(h))};return out;});
    L.say(ok&&m.rows>0&&!!m.box,tag+' DENOMINATOR the list is up with '+m.rows+' game rows in its games box',m);
    if(m.box){
      L.say(m.root.sh<=m.root.ch+1,tag+' the page does not scroll (#root '+m.root.sh+' in '+m.root.ch+')',m.root);
      L.say(m.box.bot<=m.tab+0.5&&m.tab-m.box.bot<=32&&m.box.ch>=m.rowH+12,tag+' the games box fills the rest: '+m.box.ch+'px tall ('+m.box.top+'..'+m.box.bot+'), the tab bar starts at '+m.tab+', and it shows one whole game ('+m.rowH+'px) with the next one starting',{box:m.box,tab:m.tab,rowH:m.rowH});
      L.say(m.box.sh>m.box.ch+1&&!!m.last&&m.last.inBox&&m.last.hit,tag+' only the box scrolls (it holds '+m.box.sh+' in '+m.box.ch+') and scrolling it brings the last game fully into view, where it takes a tap',{box:m.box,last:m.last});
    }
    L.say(b.errs.length===0,tag+' zero app errors',b.errs.slice(0,3));await b.close();}
},'164-review-list-fixed-page');
