'use strict';
// gates/regress/107-ask-once-is-this-account-yours.js - AN ACCOUNT IS ASKED ABOUT ONCE, WHEN IT IS IMPORTED: IS IT HIS? TC-R188a..c, US-R121.
//
// WHY [#550 answer a19; jobs/follow-a-player-not-reimport-2026-09-23; Kunal on docs/run-questions build__1794388896663-q19, 11 Nov 2026:
// "Ask once when an account is imported whether it is his"]. Every imported account started as his (the #547 item (79) per-account switch),
// so a friend's games fed his mistakes drill and brilliant-moves list until he found the chip's switch. Now a NEW account is asked about once.
//
// HOW: api.chess.com is stubbed (nothing leaves the container): one archive month with two games for any player. Review, type the name in the
// Import box, tap Fetch.
// WHAT IT ASSERTS, at kunal761 (and the question's fit at se):
//  (a) TC-R188a DENOMINATOR the import landed (the account's chip is on the list); then the question "Is <name> your account?" is on screen
//      with Yes and No, each at least 44px tall and inside the viewport width.
//  (b) TC-R188b No switches the account off (ct_acctmine[id] === false, the chip's switch reads not-pressed) and the question is gone; a second
//      Fetch of the SAME account does not ask again.
//  (c) TC-R188c Yes keeps it his (no ct_acctmine entry) and the question is gone; an account imported before (already on ct_accts) is never asked.
// CONTROL-RECORD: ed44329 2026-11-11 total=11 red=4 scope=trial:d38107f4bf72 how=#550 answer a19: the tree before the question (a13 only) - no question appears, so both TC-R188a question lines are red at kunal761 and se; the answer lines are not reached there (total 11, not 15), and the two never-asked lines cannot go red on a bundle that never asks (named, not credited as controlled); the a19 trial 1aaa8b5f2858 reads 15 pass, 0 fail
const L=require('../lib');
const PGN=(w,b,d)=>'[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "'+d+'"]\n[White "'+w+'"]\n[Black "'+b+'"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
async function stub(b){
  const hits=[];
  await b.ctx.route(/api\.chess\.com/,async(route)=>{const u=route.request().url();hits.push(u);const who=(u.match(/player\/([^/]+)\//)||[])[1]||'x';
    if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['https://api.chess.com/pub/player/'+who+'/games/2026/10']})});
    if(/games\/2026\/10$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games:[1,2].map(i=>({url:'https://www.chess.com/game/live/'+(9000+i),pgn:PGN(who,'opp'+i,'2026.10.0'+i),end_time:1791000000+i*3600,time_class:'blitz',rules:'chess',white:{username:who,result:'win'},black:{username:'opp'+i,result:'checkmated'}}))})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});});
  return hits;
}
async function fetchAcct(b,name){
  await b.tile('Review');await b.settle(800);
  await b.page.locator('input[placeholder="Chess.com username"]').first().fill(name);
  await b.page.locator('button',{hasText:/^Fetch$/}).first().click();
  try{await b.page.locator('[data-ct="acct-chips"]').waitFor({state:'visible',timeout:20000});}catch(e){}
  await b.settle(1500);
}
// #550 [jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29]: the question is located by WHAT IT SAYS
// ("Is <name> your account?", painted) and its answers by their wording; the hooks acct-ask / acct-ask-yes / -no, added in the same
// build as this gate, are a fallback only. Keyed on the hook alone, every "the question is gone" / "does not ask again" line read
// PASS on any bundle where the question still showed under another name - the #432 costume (an absence check through the fix's hole).
const ask=(b)=>b.page.evaluate(()=>{const vis=x=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0;};
  const leaf=[...document.querySelectorAll('body *')].find(x=>x.children.length===0&&/^Is \S+ your account\?$/.test((x.textContent||'').trim())&&vis(x));
  let e=null;if(leaf){e=leaf.parentElement;while(e&&e.querySelectorAll('button').length<2)e=e.parentElement;}
  if(!e)e=document.querySelector('[data-ct="acct-ask"]');if(!e)return null;
  const r=x=>{const q=x.getBoundingClientRect();return {l:Math.round(q.left),r:Math.round(q.right),h:Math.round(q.height)};};
  const bt=[...e.querySelectorAll('button')];
  const y=bt.find(x=>/^Yes, it.s mine$/.test((x.innerText||'').trim()))||e.querySelector('[data-ct="acct-ask-yes"]'),n=bt.find(x=>/^No$/.test((x.innerText||'').trim()))||e.querySelector('[data-ct="acct-ask-no"]');
  return {txt:e.innerText.replace(/\s+/g,' '),yes:y?r(y):null,no:n?r(n):null,vw:innerWidth,byText:!!leaf};});
const tapAnswer=(b,answer)=>b.page.evaluate((a)=>{const re=a==='yes'?/^Yes, it.s mine$/:/^No$/;
  const leaf=[...document.querySelectorAll('body *')].find(x=>x.children.length===0&&/^Is \S+ your account\?$/.test((x.textContent||'').trim()));
  let e=leaf&&leaf.parentElement;while(e&&e.querySelectorAll('button').length<2)e=e.parentElement;
  const t=(e?[...e.querySelectorAll('button')].find(x=>re.test((x.innerText||'').trim())):null)||document.querySelector('[data-ct="acct-ask-'+a+'"]');if(!t)return false;t.click();return true;},answer);
const store=(b,k)=>b.page.evaluate((k)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}},k);
L.run(async()=>{
  for(const [geo,answer] of [['kunal761','no'],['se','yes']]){
    const b=await L.launch({geo,name:'ask-'+answer});const hits=await stub(b);await b.open();
    let ok=true;try{await fetchAcct(b,'friendacct');}catch(e){ok=false;L.note(geo+' fetch: '+String(e).slice(0,120));}
    const accts=await store(b,'ct_accts');
    L.say(ok&&hits.length>0&&Array.isArray(accts)&&accts.indexOf('cc:friendacct')>=0,geo+': TC-R188a DENOMINATOR the import of "friendacct" landed through the stub ('+hits.length+' request(s); ct_accts '+JSON.stringify(accts)+')',{accts,hits:hits.length});
    const q=await ask(b);
    L.say(!!q&&/Is friendacct your account\?/.test(q.txt)&&!!q.yes&&!!q.no,geo+': TC-R188a the question "Is friendacct your account?" is on screen with Yes and No ("'+(q&&q.txt.slice(0,90))+'")',{q});
    L.say(!!q&&!!q.yes&&!!q.no&&q.yes.h>=44&&q.no.h>=44&&q.yes.l>=0&&q.no.r<=q.vw,geo+': TC-R188a both answers are at least 44px tall and inside the '+(q&&q.vw)+'px width',{q});
    if(q&&q.yes&&q.no){
      await tapAnswer(b,answer);await b.settle(500);
      const mine=await store(b,'ct_acctmine'),gone=!(await ask(b));
      const pressed=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="acct-mine"]');return e?e.getAttribute('aria-pressed'):null;});
      if(answer==='no')L.say(gone&&!!mine&&mine['cc:friendacct']===false&&pressed==='false',geo+': TC-R188b No switches the account off (ct_acctmine '+JSON.stringify(mine)+', the chip\'s switch aria-pressed '+pressed+') and the question is gone',{mine,pressed,gone});
      else L.say(gone&&!(mine&&('cc:friendacct' in mine))&&pressed==='true',geo+': TC-R188c Yes keeps it his (no ct_acctmine entry; the switch aria-pressed '+pressed+') and the question is gone',{mine,pressed,gone});
      await b.page.locator('button',{hasText:/^Fetch$/}).first().click();await b.settle(2500);
      L.say(!(await ask(b)),geo+': TC-R188'+(answer==='no'?'b':'c')+' a second Fetch of the same account does not ask again');
    }
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // (c) an account already on the list before this build is never asked
  {const b=await L.launch({geo:'kunal761',name:'ask-old',store:{ct_accts:['cc:oldacct'],ct_acctgames:{'cc:oldacct':[]}}});await stub(b);await b.open();
   let ok=true;try{await fetchAcct(b,'oldacct');}catch(e){ok=false;}
   const accts=await store(b,'ct_accts');
   L.say(ok&&Array.isArray(accts)&&accts.indexOf('cc:oldacct')>=0,'kunal761: TC-R188c DENOMINATOR the already-imported account was fetched again ('+JSON.stringify(accts)+')',{accts});
   L.say(!(await ask(b)),'kunal761: TC-R188c an account imported before (already on the list) is not asked about');
   await b.close();}
},'107-ask-once-is-this-account-yours');
// CONTROL-RECORD: 4a79a54 2026-11-13 total=15 red=3 scope=trial:0100b5a554d7 how=#550 #432 sweep (acct-ask re-keyed by its words): c1, acct-ask/-yes/-no renamed AND the question asked on every fetch (the ct_acctasked and already-listed checks removed) - TC-R188b/c 'a second Fetch does not ask again' x2 and TC-R188c 'already on the list is not asked' red; the hook-keyed version (55ca2c7) on the same bundle is 7/4 with those three GREEN; on t0 6c4245e05ecc 15/0
