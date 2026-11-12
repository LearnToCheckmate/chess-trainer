'use strict';
// gates/regress/103-online-flag-auto-end.js - AN ONLINE GAME WHOSE FLAG FELL ENDS BY ITSELF, ONCE. TC-PL-070a..c, US-PL-26.
//
// WHY [#550, item (101) of directOpening_2026_11_11_batch10; jobs/online-clock-flag-fall-auto-end; Kunal's Desk answer 'it should be
// automatic' (decisions/desk-answers-2026-09-22-1316), in scope on his word of 10 Nov 2026]. An online game whose clock ran out stayed live
// until the WINNER tapped Claim win, so the games list showed finished games in progress. Now whichever phone has the game open records the
// loss on time FLAG_GRACE_MS (15s) after the flag fell, with the same fields Claim win writes.
//
// HOW, AND ITS LIMIT: gate 96's stand-in window.CTCloud (the real bridge is blocked here), a live 1-minute game (tc blitz, clk 60000 each)
// with White to move and moveAt set so White's flag fell a chosen time ago; game ABCDE joined through ?g=. It proves this phone's
// behaviour, not two real phones racing (the stand-in has one phone; the result fields are identical from either, so a second write is the
// same write).
// THE CASE THE JOB OWES (correction 025), over both phones and both timings:
//  (a) TC-PL-070a the LOSER's phone (Me = White) opened 20s after the flag: within 5s the game document carries result 0-1, status over,
//      endBy time - written exactly once by this phone.
//  (b) TC-PL-070b the WINNER's phone (Me = Black) opened 20s after the flag: the same, once.
//  (c) TC-PL-070c opened 5s after the flag (Me = Black): NOTHING is written in the first 4s (the 15s grace is honoured - the opponent may
//      still be about to claim or the clock to be read), and the result is written by 15s later, once.
// DENOMINATOR per arm: the game was joined and is on screen (the clock panel's game, the Video call control is the stand-in's marker).
// CONTROL-RECORD: ad54e8f 2026-11-11 total=9 red=3 scope=trial:3ab724514641 how=#550 item (101): origin/main's bundle - nothing ever writes the loss on time, so all three 'recorded once' lines are red; the grace line (070c, nothing in 4s) and the DENOMINATORS green
// CONTROL-RECORD: ad54e8f 2026-11-11 total=9 red=1 scope=trial:a2a1a4d0bd3a how=#550 item (101): c101, FLAG_GRACE_MS 0 (gate run with CT_SRC = the real source) - TC-PL-070c's 'nothing inside the grace' line red (written 5s after the flag); every other line green
const L=require('../lib');
const fs=require('fs'),path=require('path');
const STUB=(cfg)=>{
  const me={uid:'u-me',name:'Me'},them={uid:'u-them',name:'Them'};const meW=cfg.meWhite;
  const doc={id:'g1',code:'ABCDE',status:'active',moves:[],chat:[],tc:{kind:'blitz',init:60,inc:0,label:'1 min'},clk:{w:60000,b:60000},moveAt:Date.now()-cfg.sinceMs,w:meW?{uid:me.uid,name:me.name}:{uid:them.uid,name:them.name},b:meW?{uid:them.uid,name:them.name}:{uid:me.uid,name:me.name}};
  const watchers=[];const pushes=[];
  const deliver=()=>{const snap=JSON.parse(JSON.stringify(doc));for(const cb of watchers)try{cb(snap);}catch(e){}};
  const base={ready:Promise.resolve(true),onAuth(cb){setTimeout(()=>cb(me),50);return ()=>{};},
    gameJoin:async()=>({id:'g1',color:meW?'w':'b'}),gameWatch(id,cb){watchers.push(cb);setTimeout(deliver,30);return ()=>{};},
    gamePush:async(id,d)=>{pushes.push(JSON.parse(JSON.stringify(d)));Object.assign(doc,d);setTimeout(deliver,20);return true;}};
  window.__vc={doc,pushes,them,deliver,push(d){Object.assign(doc,d);deliver();}};
  const stub=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null;}});
  // index.html's own bridge script assigns window.CTCloud AFTER this init script; a setter that ignores the write keeps the stand-in
  Object.defineProperty(window,'CTCloud',{configurable:false,get(){return stub;},set(v){}});
  try{const c=document.createElement('canvas');c.width=64;c.height=48;
    navigator.mediaDevices.getUserMedia=async()=>{const s=c.captureStream(5);return s;};}catch(e){}
};

const results=(b)=>b.page.evaluate(()=>window.__vc.pushes.filter(p=>p.result).map(p=>({result:p.result,status:p.status,endBy:p.endBy})));
L.run(async()=>{
  const src=fs.readFileSync(process.env.CT_SRC||path.join(__dirname,'..','..','chess.jsx'),'utf8');const mm=src.match(/const FLAG_GRACE_MS=(\d+);/);
  L.say(!!mm&&+mm[1]===15000,'TC-PL-070 the grace is 15 seconds (FLAG_GRACE_MS: '+(mm?mm[1]:'absent')+')',{m:mm&&mm[1]});
  for(const [id,meWhite,sinceMs,who] of [['TC-PL-070a',true,80000,'loser'],['TC-PL-070b',false,80000,'winner'],['TC-PL-070c',false,65000,'winner, early']]){
    const b=await L.launch({geo:'kunal761',name:'flag-'+id,store:{}});await b.ctx.addInitScript(STUB,{meWhite,sinceMs});await b.open('index.html?g=ABCDE');
    const ok=await b.page.waitForSelector('[data-ct="vc-start"]',{state:'attached',timeout:20000}).then(()=>true).catch(()=>false);   // #550 BSA-P-01: Video call now sits in the closed Chat & video call sheet - present in the page once the game is joined, not visible
    L.say(ok,id+' DENOMINATOR the stand-in game (1 min, White\'s flag fell '+(sinceMs-60000)/1000+'s before opening) was joined on the '+who+'\'s phone',{ok});
    if(ok){
      if(sinceMs<75000){await b.settle(4000);const r0=await results(b);L.say(r0.length===0,id+' nothing is written inside the 15s grace (read 4s after opening, '+(sinceMs-60000)/1000+'s after the flag)',r0);await b.settle(13000);}
      else await b.settle(5000);
      const r=await results(b);
      L.say(r.length===1&&r[0].result==='0-1'&&r[0].status==='over'&&r[0].endBy==='time',id+' the loss on time is recorded once by this phone: '+JSON.stringify(r),r);
    }
    await b.close();
  }
},'103-online-flag-auto-end');
