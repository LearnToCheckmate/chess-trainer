'use strict';
// gates/regress/96-video-call-timeout-and-optout.js - AN UNANSWERED CALL GIVES UP, AND A PLAYER CAN REFUSE CALLS ONCE. TC-PL-068a..c, US-PL-24.
//
// WHY [#550, item (87) of directOpening_2026_11_11_batch10; jobs/video-call-timeout-and-optout; decisions/desk-round-1-2026-09-19,
// Q-VC-2 = 20 seconds, Q-VC-3 = switch (Kunal overruled 'Decline is enough'), Q-VC-1 = never a relay server; unparked into the current
// scope on his word of 10 Nov 2026]. There was no timer: an unanswered call said Connecting for ever and Hang up was the only way out;
// and the only refusal was Decline, once per game. Now a call gives up after VC_TIMEOUT_MS with words that do not claim to know whether
// nobody answered or the call never reached the other network, and ct_vc_noring declines an incoming call without ringing.
//
// HOW, AND ITS LIMIT, NAMED: the real CTCloud lives in an index.html module importing from gstatic.com, which gates/lib.js BLOCKS (gate 25
// records the same hole), so this gate installs a STAND-IN window.CTCloud before the app loads: onAuth signs in a fake player, gameJoin
// returns one game, gameWatch/gamePush keep that game's document in memory and deliver every push back through the watch callback (as
// Firestore would), and every other method is an async no-op; it is pinned with a setter that ignores index.html's own bridge assignment. getUserMedia is stood in by a canvas stream. So this proves the APP's
// state machine - the timer, the words, the hangup it pushes, the switch, the ring clearing - not that two phones connect; that half is
// Kunal's two-phone check. The timer is shortened with ct_vc_timeout_ms (read by the app for gates only) so the run is not 20s per arm;
// the 20000 default is read out of chess.jsx's source (TC-PL-068a's first line), so a changed default cannot hide behind the override.
//
// WHAT IT ASSERTS, at kunal761, joining game ABCDE through ?g= (the invite-link path):
//  (a) TC-PL-068a: chess.jsx's VC_TIMEOUT_MS is 20000; tapping Video call shows Connecting; after the (shortened) timeout the call is
//      gone, a hangup from this player is in the game document, and the words say BOTH possibilities ('not have picked up' and 'could
//      not reach'); the Video call button is back.
//  (b) TC-PL-068b: with 'Let opponents video call me' switched Off (and the store holding ct_vc_noring '1' afterwards), an incoming
//      offer from the opponent never shows the ring, and the game document carries a hangup by this player marked declined:'noring'.
//  (c) TC-PL-068c: switched back On, an incoming offer rings (vc-ring present - the arrival is proven before its absence is asserted
//      anywhere), and when the caller hangs up the ring is gone (before #550 only an answered session cleared, so the ring outlived it).
// CONTROL-RECORD: f671638 2026-11-11 total=13 red=3 scope=trial:7821d85142ef how=#550 item (87): c87, the timeout effect removed and the ring-clear reverted - TC-PL-068a's give-up and words lines red (still live, no hangup), TC-PL-068c's ring-gone line red; 068b and both DENOMINATORS green
// CONTROL-RECORD: f671638 2026-11-11 total=13 red=1 scope=trial:459f910ff381 how=#550 item (87): c87b, the no-ring branch removed - TC-PL-068b's decline line red (the call rang, no hangup); every other line green
// CONTROL-RECORD: f671638 2026-11-11 total=6 red=3 scope=trial:3ab724514641 how=#550 item (87): origin/main's bundle - the invite link leaves Home over the joined game, so both DENOMINATORS (button on screen and taking the tap) and the switch line red; the gate stops there
const L=require('../lib');
const fs=require('fs'),path=require('path');
const SRC=process.env.CT_SRC||path.join(__dirname,'..','..','chess.jsx');

const STUB=()=>{
  const me={uid:'u-me',name:'Me'},them={uid:'u-them',name:'Them'};
  const doc={id:'g1',code:'ABCDE',status:'active',moves:[],chat:[],tc:null,moveAt:Date.now(),w:{uid:them.uid,name:them.name},b:{uid:me.uid,name:me.name}};
  const watchers=[];const pushes=[];
  const deliver=()=>{const snap=JSON.parse(JSON.stringify(doc));for(const cb of watchers)try{cb(snap);}catch(e){}};
  const base={ready:Promise.resolve(true),onAuth(cb){setTimeout(()=>cb(me),50);return ()=>{};},
    gameJoin:async()=>({id:'g1',color:'b'}),gameWatch(id,cb){watchers.push(cb);setTimeout(deliver,30);return ()=>{};},
    gamePush:async(id,d)=>{pushes.push(JSON.parse(JSON.stringify(d)));Object.assign(doc,d);setTimeout(deliver,20);return true;}};
  window.__vc={doc,pushes,them,deliver,push(d){Object.assign(doc,d);deliver();}};
  const stub=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null;}});
  // index.html's own bridge script assigns window.CTCloud AFTER this init script; a setter that ignores the write keeps the stand-in
  Object.defineProperty(window,'CTCloud',{configurable:false,get(){return stub;},set(v){}});
  try{const c=document.createElement('canvas');c.width=64;c.height=48;
    navigator.mediaDevices.getUserMedia=async()=>{const s=c.captureStream(5);return s;};}catch(e){}
};

// joined = the call button is not only in the DOM but ON SCREEN and hit-tests as itself: before #550 an invite link left Home (a fixed
// overlay) over the joined game, so the button existed and nothing could tap it
async function joined(b){/* #550 BSA-P-01: video call and chat sit behind the 'Chat & video call' button; open it first where it exists */
  const op=await b.page.waitForSelector('[data-ct="online-talk-open"]',{timeout:20000}).then(()=>true).catch(()=>false);if(op){await b.page.click('[data-ct="online-talk-open"]');await b.settle(400);}
  const ok=await b.page.waitForSelector('[data-ct="vc-start"]',{timeout:20000}).then(()=>true).catch(()=>false);if(!ok)return false;
  await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="vc-start"]');if(e)e.scrollIntoView({block:'center'});});await b.settle(300);
  return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="vc-start"]');if(!e)return false;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===e||e.contains(h));});}
const has=(b,sel)=>b.page.evaluate(s=>!!document.querySelector(s),sel);
const txt=(b,sel)=>b.page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:null;},sel);

L.run(async()=>{
  const src=fs.readFileSync(SRC,'utf8');const mm=src.match(/const VC_TIMEOUT_MS=(\d+);/);
  L.say(!!mm&&+mm[1]===20000,'TC-PL-068a the app\'s give-up time is 20 seconds (VC_TIMEOUT_MS in '+path.basename(SRC)+': '+(mm?mm[1]:'absent')+')',{m:mm&&mm[1]});
  // (a) timeout
  {
    const b=await L.launch({geo:'kunal761',name:'vc-timeout',store:{ct_vc_timeout_ms:'1500'}});await b.ctx.addInitScript(STUB);await b.open('index.html?g=ABCDE');
    const ok=await joined(b);L.say(ok,'TC-PL-068a DENOMINATOR the stand-in game was joined through ?g= and its Video call button is ON SCREEN and takes the tap (an invite link opens on the game, not under Home)',{ok});
    if(ok){await b.page.click('[data-ct="vc-start"]');await b.settle(400);
      const conn=await b.page.evaluate(()=>/Connecting/.test(document.body.innerText));
      L.say(conn,'TC-PL-068a tapping Video call shows Connecting (the call is placed)',{conn});
      await b.settle(2600);
      const st=await b.page.evaluate(()=>({live:!!document.querySelector('[data-ct="vc-live"]'),start:!!document.querySelector('[data-ct="vc-start"]'),hang:(window.__vc.doc.rtc||{}).hangup||null,err:(document.querySelector('[data-ct="vc-err"]')||{}).textContent||''}));
      L.say(!st.live&&st.start&&st.hang==='u-me','TC-PL-068a after the timeout the call is given up: no call screen, Video call back, and a hangup by this player in the game ('+st.hang+')',st);
      L.say(/not have picked up/.test(st.err)&&/could not reach/.test(st.err),'TC-PL-068a and the words say both things it could be: "'+st.err+'"',st);}
    await b.close();
  }
  // (b) and (c) the switch, and the ring clearing
  {
    const b=await L.launch({geo:'kunal761',name:'vc-noring',store:{}});await b.ctx.addInitScript(STUB);await b.open('index.html?g=ABCDE');
    const ok=await joined(b);L.say(ok,'TC-PL-068b DENOMINATOR the stand-in game was joined and the call controls are on screen',{ok});
    const sw=ok&&await has(b,'[data-ct="vc-noring"]');
    L.say(!!sw,'TC-PL-068b a switch "Let opponents video call me" is under the Video call button',{sw,text:sw?await txt(b,'[data-ct="vc-noring"]'):null});
    if(sw){
      await b.page.click('[data-ct="vc-noring"]');await b.settle(300);
      const stored=await b.page.evaluate(()=>localStorage.getItem('ct_vc_noring'));
      await b.page.evaluate(()=>window.__vc.push({rtc:{from:'u-them',id:'s1',offer:{type:'offer',sdp:'v=0'},answer:null,hangup:null,ts:Date.now()}}));await b.settle(900);
      const r=await b.page.evaluate(()=>({ring:!!document.querySelector('[data-ct="vc-ring"]'),rtc:window.__vc.doc.rtc}));
      L.say(stored==='1'&&!r.ring&&r.rtc&&r.rtc.hangup==='u-me'&&r.rtc.declined==='noring','TC-PL-068b switched Off (ct_vc_noring '+stored+'), an incoming call does not ring and is declined at once (hangup '+(r.rtc&&r.rtc.hangup)+', '+(r.rtc&&r.rtc.declined)+')',r);
      // a broken build rings here, which replaces the switch with the ring: decline it so the next arm still runs (a missing control is a red, never a throw)
      if(await has(b,'[data-ct="vc-ring"]')){await b.page.evaluate(()=>{const x=[...document.querySelectorAll('[data-ct="vc-ring"] button')].find(e=>/Decline/.test(e.textContent));if(x)x.click();});await b.settle(500);}
      const sw2=await has(b,'[data-ct="vc-noring"]');L.say(sw2,'TC-PL-068c the switch is on screen again to turn calls back on',{sw2});
      if(sw2){await b.page.click('[data-ct="vc-noring"]');await b.settle(300);}
      await b.page.evaluate(()=>window.__vc.push({rtc:{from:'u-them',id:'s2',offer:{type:'offer',sdp:'v=0'},answer:null,hangup:null,ts:Date.now()}}));await b.settle(900);
      const rang=await has(b,'[data-ct="vc-ring"]');
      L.say(rang,'TC-PL-068c switched back On, the same incoming call rings',{rang});
      await b.page.evaluate(()=>window.__vc.push({rtc:Object.assign({},window.__vc.doc.rtc,{hangup:'u-them'})}));await b.settle(900);
      const gone=!(await has(b,'[data-ct="vc-ring"]'));
      L.say(rang&&gone,'TC-PL-068c and when the caller hangs up (or its call times out) the ring is gone',{rang,gone});
    }
    L.say(b.errs.length===0,'TC-PL-068 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'96-video-call-timeout-and-optout');
