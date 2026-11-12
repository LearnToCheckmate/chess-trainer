'use strict';
// gates/regress/128-board-as-big-as-the-screen.js - THE BOARD IS AS BIG AS THE SCREEN ALLOWS, SIDEWAYS ON EVERY SCREEN AND ON THE ONLINE GAME
// UPRIGHT. US-R136 / TC-R204a..d.
//
// WHY [#550, run-answers build__1794388896663-a38; decisions/the-board-is-as-big-as-the-screen-allows-on-every-screen-2026-11-11;
// docs/board-size-audit-2026-11-12]: Kunal, 11 Nov: "The prime guidance on every screen is to maximize the chessboard size." The audit
// measured sideways boards of 216 (Review, analysis, the online game), 176 (Tactics & Strategy), 280 (lessons), 344 (the game, Pass and
// Play) and 360 (Puzzles) against a 375 limit at 761x375, and the online game upright at 192 of 375 on his phone.
// WHAT IT READS: the bundle under test (CT_APP). The board is the widest repeat(8,...) grid, or [data-ct=tactics-board] on Tactics. Each
// screen is reached by its driver (the online game by gate 103's stand-in cloud, ?g=ABCDE) at 761x375 and 667x375, and the online game
// upright at kunal761. LIMIT: sideways the viewport height; a sideways game keeps a 300pt rail from 600 wide (its six 44pt controls), so
// there it is min(vp.h, vp.w-320); Tactics keeps a 240 column beside the 62 tab rail, min(vp.h, vp.w-318); upright the viewport width. Every screen must also not scroll the page and keep its buttons on screen.
// KNOW ITS LIMIT: the short upright screens (320x568, 375x667) are not asserted - their job is open (short-upright-boards-sized-to-height).
const L=require('../lib');
const P=require('../drive/play'),R=require('../drive/review'),Z=require('../drive/puzzles'),D=require('../drive/lesson');
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'103-online-flag-auto-end.js'),'utf8');
const STUB=new Function('return ('+src.slice(src.indexOf('const STUB=')+'const STUB='.length,src.indexOf('\nconst results=')).trim().replace(/;$/,'')+')')();
const SCREENS=[['Review',b=>R.states['moves-ply10'](b),'side'],['Review analysis',b=>R.states['analysis'](b),'side'],['Play vs computer',b=>P.states['cpu-4ply'](b),'game'],
  ['Pass and Play',b=>P.states['pp-1'](b),'game'],['Puzzles',b=>Z.states['train'](b),'side'],['Tactics',b=>D.states['tactics'](b),'tac'],['Lesson',b=>D.states['demo-end'](b),'side'],['Online game',null,'game']];
const read=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="tactics-board"]');const bd=t?t.getBoundingClientRect():[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  const off=[...document.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();if(!(q.width>0&&q.height>0))return false;let e=x;while(e&&e!==document.body){const s=getComputedStyle(e);if(/(auto|scroll)/.test(s.overflowY)&&e.id!=='root'&&e.scrollHeight>e.clientHeight+1)return false;e=e.parentElement;}return q.bottom>innerHeight+0.5||q.right>innerWidth+0.5||q.top<-0.5;}).map(x=>(x.getAttribute('aria-label')||x.innerText||'').trim().slice(0,16));
  const root=document.getElementById('root');return {board:bd?{w:Math.round(bd.width*100)/100,h:Math.round(bd.height*100)/100,t:Math.round(bd.top),b:Math.round(bd.bottom)}:null,sh:root.scrollHeight,ch:root.clientHeight,sw:document.documentElement.scrollWidth,vw:innerWidth,vh:innerHeight,off};});
const open=async(geo,go)=>{const b=await L.launch({geo,name:'board-max',store:{ct_pool:'3'}});let ok=true;
  if(!go){await b.ctx.addInitScript(STUB,{meWhite:true,sinceMs:1000});await b.open('index.html?g=ABCDE');await b.settle(4000);}
  else{await b.open();try{await go(b);}catch(e){ok=false;}await b.settle(2000);}return {b,ok};};
L.run(async()=>{
  for(const [nm,go,kind] of SCREENS)for(const [w,h] of [[761,375],[667,375]]){const tag=nm+' '+w+'x'+h;
    const {b,ok}=await open({w,h,safe:'',label:w+'x'+h},go);const r=await read(b);
    const lim=kind==='game'?Math.min(h,w-320):kind==='tac'?Math.min(h,Math.floor(w-62-16-240)):h;   // Tactics keeps a 240 column beside the 62 tab rail
    L.say(ok&&!!r.board&&r.board.w>100,'TC-R204 '+tag+' PRECONDITION the screen is open with its board ('+(r.board&&r.board.w)+')',r.board);
    L.say(!!r.board&&Math.abs(r.board.w-lim)<=1,'TC-R204a '+tag+' sideways the board is as big as the screen allows: '+(r.board&&r.board.w)+' against '+lim+(lim<h?' (the screen height less what the right-hand column needs)':' (the screen height)'),r.board);
    L.say(r.sh<=r.ch+1&&r.sw<=r.vw,'TC-R204c '+tag+' the page does not scroll ('+r.sh+' of '+r.ch+')',{sh:r.sh,ch:r.ch,sw:r.sw});
    L.say(r.off.length===0,'TC-R204c '+tag+' no button is off the screen outside a scroller'+(r.off.length?(': '+r.off.join(', ')):''),r.off);
    L.say(b.errs.length===0,'TC-R204 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  {const {b,ok}=await open('kunal761',null);const r=await read(b);
   L.say(ok&&!!r.board,'TC-R204 online game 375x761 PRECONDITION the stand-in game is open with its board',r.board);
   L.say(!!r.board&&Math.abs(r.board.w-r.vw)<=1,'TC-R204b online game upright on his phone: the board is the screen width ('+(r.board&&r.board.w)+' of '+r.vw+'), not its 192 minimum',r.board);
   const t=await b.page.evaluate(()=>{const o=document.querySelector('[data-ct="online-talk-open"]'),a=document.querySelector('[data-ct="online-actions"]');const q=a&&a.getBoundingClientRect();return {open:!!o&&o.getBoundingClientRect().height>=43.5,row:q?{h:Math.round(q.height),n:a.querySelectorAll('button').length}:null};});
   L.say(r.sh<=r.ch+1&&t.open&&!!t.row&&t.row.n===4&&t.row.h<=50,'TC-R204d online game 375x761: the page does not scroll ('+r.sh+' of '+r.ch+'), the four actions are one row and chat and video call open from one 44pt button',t);
   await b.page.click('[data-ct="online-talk-open"]').catch(()=>{});await b.settle(500);
   const s=await b.page.evaluate(()=>{const v=document.querySelector('[data-ct="vc-start"]');const q=v&&v.getBoundingClientRect();return {vc:!!q&&q.height>0&&q.bottom<=innerHeight};});
   L.say(s.vc,'TC-R204d online game 375x761: the button opens chat and video call, with Video call on screen',s);
   L.say(b.errs.length===0,'TC-R204 online game 375x761 zero app errors',b.errs.slice(0,3));await b.close();}
},'128-board-as-big-as-the-screen');
