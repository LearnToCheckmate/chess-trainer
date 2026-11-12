'use strict';
// gates/regress/138-usernames-follow-the-account.js - HIS USERNAMES FOLLOW HIS ACCOUNT, AND HIS GAMES ARRIVE ON A NEW DEVICE. US-R146 / TC-R214a..d.
//
// WHY [#550, run-answers build__1794388896663-hold-landing, his report (a), Kunal 12 Nov on his computer, live #549: "I'm signed in. Why is
// it asking me to pull in my games again? The user IDs have already been put in on the app, so shouldn't all of those get pulled in
// automatically?"]: ct_ccuser and ct_liuser were not in SYNC_KEYS, so his usernames stayed on his phone and the Review auto-pull never
// started on another device.
// WHAT IT READS: the bundle under test (CT_APP). A fresh device (no ct_ccuser) opens Review signed out, so nothing is fetched; then the account
// is signed in through window.CTCloud (its _load stubbed to return the progress his phone saved, with ct_ccuser 'kunal2023'; its _save
// captured). api.chess.com is stubbed as gate 107 stubs it (nothing leaves the container).
// KNOW ITS LIMIT: chess.com only (Lichess takes the same path); the real Firestore round trip is not exercised.
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=7 red=3 scope=trial:edd93ac94af9 how=#550 the tree before report (a) (t139, usernames not in SYNC_KEYS): the box stays empty, nothing is fetched for kunal2023, and the saves carry no ct_ccuser - TC-R214a, b, c red; TC-R214d cannot go red on a bundle that never pulls a name (named, not credited); on t140 0b494f6c50db 7/0
const L=require('../lib');
const PGN=(w,b,d)=>'[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "'+d+'"]\n[White "'+w+'"]\n[Black "'+b+'"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
async function stub(b){const hits=[];
  await b.ctx.route(/api\.chess\.com/,async(route)=>{const u=route.request().url();hits.push(u);const who=(u.match(/player\/([^/]+)\//)||[])[1]||'x';
    if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['https://api.chess.com/pub/player/'+who+'/games/2026/10']})});
    if(/games\/2026\/10$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games:[1,2].map(i=>({url:'https://www.chess.com/game/live/'+(9100+i),pgn:PGN(who,'opp'+i,'2026.10.0'+i),end_time:1791000000+i*3600,time_class:'blitz',rules:'chess',white:{username:who,result:'win'},black:{username:'opp'+i,result:'checkmated'}}))})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});});return hits;}
const signIn=(b,prog)=>b.page.evaluate((prog)=>{const C=window.CTCloud;window.__saved=[];C._load=()=>Promise.resolve({ctProgress:prog});C._save=(d)=>{window.__saved.push(JSON.parse(JSON.stringify(d)));return Promise.resolve();};
  C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null});},prog);
const box=(b)=>b.page.evaluate(()=>{const i=document.querySelector('input[placeholder="Chess.com username"]');return i?i.value:null;});
L.run(async()=>{
  { // (a)(b)(c) a fresh device, already on Review when the account arrives
    const b=await L.launch({geo:'kunal761',name:'names138'});const hits=await stub(b);await b.open();
    await b.tile('Review');await b.settle(1200);
    const before=hits.length;const b0=await box(b);
    L.say(before===0&&(b0===''||b0===null),'TC-R214 PRECONDITION a fresh device on Review, signed out: no username and nothing fetched ('+before+' requests, box "'+b0+'")',{before,b0});
    await signIn(b,{ct_ccuser:'kunal2023'});
    let n=0;for(let i=0;i<30;i++){await b.settle(500);n=hits.filter(u=>/player\/kunal2023\//.test(u)).length;if(n>=2)break;}
    const b1=await box(b);
    L.say(b1==='kunal2023','TC-R214a the account\'s chess.com username fills the box on this device ("'+b1+'")',b1);
    L.say(n>=2,'TC-R214b his games are pulled at once, while he is already on Review ('+n+' requests for kunal2023)',hits.slice(0,4));
    await b.settle(3500);
    const saved=await b.page.evaluate(()=>window.__saved||[]);const empt=saved.filter(d=>d&&d.ctProgress&&d.ctProgress.ct_ccuser==='');
    const last=saved.length?saved[saved.length-1].ctProgress:null;
    L.say(saved.length>0&&empt.length===0&&!!last&&last.ct_ccuser==='kunal2023','TC-R214c what this device saves back carries the name and never an empty one ('+saved.length+' saves, last ct_ccuser "'+(last&&last.ct_ccuser)+'")',{saves:saved.length,empty:empt.length});
    L.say(b.errs.length===0,'TC-R214 zero app errors (fresh device)',b.errs.slice(0,3));await b.close();
  }
  { // (d) a name typed on this device is kept; the account's does not replace it
    const b=await L.launch({geo:'kunal761',name:'names138b',store:{ct_ccuser:'friendacct'}});await stub(b);await b.open();
    await signIn(b,{ct_ccuser:'kunal2023'});await b.settle(2500);
    const v=await b.page.evaluate(()=>localStorage.getItem('ct_ccuser'));
    L.say(v==='friendacct','TC-R214d a username already on this device is kept, not replaced by the account\'s ("'+v+'")',v);
    L.say(b.errs.length===0,'TC-R214 zero app errors (typed name)',b.errs.slice(0,3));await b.close();
  }
},'138-usernames-follow-the-account');
