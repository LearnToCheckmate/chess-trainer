'use strict';
// gates/regress/238-lesson-board-full-in-the-home-screen-app.js - IN THE HOME SCREEN APP EVERY LESSON STATE SHOWS ITS BOARD AT FULL WIDTH.
// TC-R416..TC-R418; US-R244.
//
// WHY [#553 B3, P1, jobs/the-lesson-board-shrinks-to-half-width-in-the-home-screen-app-because-fit-measures-against-761-not-812-2026-11-24;
// docs/run-answers orchestrator-B14-LESSON-BOARD-FIRST-2026-11-24]. Kunal, 24 Nov 2026, the Two Bishops Mate lesson in the Home Screen app
// on his iPhone (375x812): "the screen is horribly distorted". Installed, iOS reports a 375x761 LAYOUT viewport on the 375x812 screen and
// index.html's shell sizes html and body to the 812 it paints (window.__ctFullH); the fit loop measured its overflow against
// documentElement.clientHeight (761), so it read 51px over at every trim and shrank the board to its floor: 192 of 375 on main 1c777c56.
// batch 14's 71879348 (card 72, Review in the Home Screen app) made _fitOver measure against __ctFullH when the shell sets it, which is
// the same loop the lesson screen uses - so on this batch the lesson board is already full width; nothing asserted it.
// WHY THE GATES MISSED IT: every lesson gate runs a 375x761 page with ct_safe insets and no shell (kunal761), where clientHeight IS the
// page height; gate 90 is the one shell gate before this batch and asserts bottom edges only, and gate 184 runs the shell for Review and
// Play, not for lessons.
// WHAT IT ASSERTS, in the shell (L.HOME_SCREEN_APP's shape: a layout viewport short by the top inset, the full screen as screen.height,
// real env() insets, ct_fullh standing in for an installed app) at four phones - 375x812 (his, 51/31), 320x568 (20/0), 390x844 (47/34),
// 430x932 (59/34) - over four lessons (the first Openings, Gambits and Endgames rows and Two Bishops Mate, his report's lesson) at four
// states each (intro card held, demo at ply 0, demo at its end, practice before the first move):
//  TC-R416 DENOMINATOR the shell is on (html carries ct-fullh, __ctFullH is the screen height, innerHeight the layout viewport) and each
//          state was reached with a board on screen.
//  TC-R417 the board is at least 90% of the screen's width in every state (the bug read 51..60%).
//  TC-R418 Puzzles (Start training) and the Puzzles board in the same shell, the other fit screen the job names: at least 90% wide.
const L=require('../lib');const D=require('../drive/lesson');const Z=require('../drive/puzzles');
const SH=(w,h,t,bt)=>({geo:{w,h:h-t,safe:'',label:w+'x'+h+' Home Screen app'},screen:{w,h},realInsets:t+','+bt,store:{ct_fullh:'1'}});
const PHONES=[['375x812',SH(375,812,51,31)],['320x568',SH(320,568,20,0)],['390x844',SH(390,844,47,34)],['430x932',SH(430,932,59,34)]];
const ONLY=process.env.CT_G238_PHONES?process.env.CT_G238_PHONES.split(','):null;
const LESSONS=[['Openings',0,'the first opening'],['Gambits',0,'the first gambit'],['Endgames',0,'the first endgame'],['Endgames',/^Two Bishops Mate$/,'Two Bishops Mate']];
const MIN=0.90;
const read=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  const q=g?g.getBoundingClientRect():null;return {vw:innerWidth,ih:innerHeight,fullH:window.__ctFullH||0,shell:document.documentElement.classList.contains('ct-fullh'),board:q&&q.width>0?Math.round(q.width*100)/100:null};});
async function tap(b,re,w){const ok=await b.page.evaluate((src)=>{const re=new RegExp(src);const x=[...document.querySelectorAll('button')].find(e=>re.test((e.innerText||e.getAttribute('aria-label')||'').trim())&&e.getBoundingClientRect().width>0);if(!x)return false;x.click();return true;},re.source);await b.settle(w||500);return ok;}
L.run(async()=>{
  for(const [pn,opts] of PHONES){
    if(ONLY&&!ONLY.includes(pn))continue;
    for(const [grp,which,ln] of LESSONS){
      const tag=pn+' '+ln;const b=await L.launch(Object.assign({},opts,{name:'g238-'+pn}));await b.open();const seen=[];let err=null;
      try{
        await D.openLesson(b,grp,which);await b.settle(900);seen.push(['intro',await read(b)]);
        await D.startDemoPaused(b);await b.settle(900);seen.push(['demo at ply 0',await read(b)]);
        await D.toEnd(b);await b.settle(900);seen.push(['demo at its end',await read(b)]);
        await D.tapBtn(b,/^(✋ Now I'll try it|Now I'll try it)$/,1200);seen.push(['practice before the first move',await read(b)]);
      }catch(e){err=String(e).slice(0,160);}
      const on=seen.length>0&&seen.every(([,m])=>m.shell&&m.fullH===opts.screen.h&&m.ih===opts.geo.h&&m.board);
      L.say(!err&&seen.length===4&&on,tag+': TC-R416 DENOMINATOR the Home Screen shell is on ('+opts.screen.h+' over a '+opts.geo.h+' layout viewport) and all four states were reached with a board ('+seen.map(([s])=>s).join(', ')+')',{err,seen});
      for(const [s,m] of seen){const r=m.board?m.board/m.vw:0;
        L.say(r>=MIN,tag+' '+s+': TC-R417 the lesson board is '+m.board+' of '+m.vw+' ('+Math.round(r*1000)/10+'%), at least '+(MIN*100)+'% of the width',m);}
      await b.close();}
    {const tag=pn+' Puzzles';const b=await L.launch(Object.assign({},opts,{name:'g238-pz-'+pn}));await b.open();let m=null,err=null;
      try{await Z.states['train'](b);await b.settle(1500);m=await read(b);}catch(e){err=String(e).slice(0,160);}
      const r=m&&m.board?m.board/m.vw:0;
      L.say(!err&&!!m&&m.shell&&m.fullH===opts.screen.h&&r>=MIN,tag+': TC-R418 in the same shell the Puzzles board is '+(m&&m.board)+' of '+(m&&m.vw)+' ('+Math.round(r*1000)/10+'%), at least '+(MIN*100)+'% of the width',{err,m});
      await b.close();}
  }
},'238-lesson-board-full-in-the-home-screen-app');
