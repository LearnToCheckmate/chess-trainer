'use strict';
// gates/regress/145-accounts-follow-across-devices.js - TWO DEVICES ON ONE ACCOUNT AGREE, AND THE NEWER CHANGE WINS. US-R153 / TC-R221a..l.
//
// WHY [#550, docs/accounts-devices-check-2026-11-12, Kunal's pick "Batch 10, serious first", Thu 12 Nov 2026]: SYN-01 (P1) the accounts he
// follows (ct_accts) and which of them are his (ct_acctmine) stayed on the phone, so a second device had nothing to fetch; SYN-02 (P1) the
// pull wrote localStorage only, so the streak, cards and brilliant moves stayed empty until a reload and the next change could write the
// stale state back; SYN-03 (P1) "the longer string wins": a fresh device's default rating {r:400,n:0} replaced the cloud's {r:845,n:9} and a
// stale streak beat a newer one; SYN-04 (P1) drill cards and brilliant moves were replaced as whole lists, so one device's cards wiped the
// other's and a card solved on one came back from the other; SYN-05 (P1, with SEC-15) sign-out must leave the next account a clean device.
// HOW: two devices are two launches in sequence, and the ACCOUNT is an in-memory document in this Node process. Each device's window.CTCloud
// has _load stubbed to return that document and _save captured; captured saves are merged into it field by field inside ctProgress, which
// is what Firestore's setDoc(..., {merge:true}) does to a nested map. Nothing reaches Firebase; api.chess.com is stubbed as gate 138 stubs it.
// WHAT IT ASSERTS, at kunal761:
//  (a) TC-R221a device 1 (two followed accounts, one switched to "not mine") saves ct_accts and ct_acctmine to the account.
//  (b) TC-R221b a fresh device 2 signing in ON HOME fetches both followed accounts at once (requests to api.chess.com for each), and
//      TC-R221c files both on its own list, with the "not mine" switch carried over.
//  (c) TC-R221d device 2's Home shows the account's 7-day streak (the streak chip) with no reload, and TC-R221e its next backup still
//      carries the account's 3 cards and the 7-day streak (nothing written back over by the pre-pull state).
//  (d) TC-R221f a fresh device's default rating does not replace the account's {r:845,n:9}; TC-R221g a device whose streak (4, three days
//      ago) is older than the account's (7, yesterday) takes the account's; TC-R221h a newer engine-strength change on the account (900,
//      stamped later) wins over this device's older one (1250) though it is no longer a string.
//  (e) TC-R221i drill cards merge as a union: this device's 5 and the account's 3 are all kept; TC-R221j a card removed on the other device
//      (a tombstone in the account's ct_syncmeta) leaves this one, and so does a followed account removed there; TC-R221k brilliant moves
//      likewise keep both sides.
//  (f) TC-R221l sign-out on device 1 with a different account then signing in leaves none of the first player's followed accounts, switches,
//      sync record or cards in what the new account saves.
// KNOW ITS LIMIT: the real Firestore round trip and two devices open AT ONCE (SYN-07, no live listener) are not exercised; chess.com only.
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=20 red=10 scope=trial:ee1e228e0899 how=#550 the branch tip before SYN-01..05 (accounts not synced, longer-string rule, whole-list replace, pull not applied to state): TC-R221a,b,c,d,f,g,h,i,j,k red; e and l stay green there (l is SEC-15's wipe, already on the tip: named, not credited; e reads the pushed cards and streak, which the tip also pushes in this input because it is a fresh device: named, not credited); on t2 f9918762b587 20/0
const L=require('../lib');
const PGN=(w,b,d)=>'[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "'+d+'"]\n[White "'+w+'"]\n[Black "'+b+'"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
async function stub(b){const hits=[];
  await b.ctx.route(/api\.chess\.com/,async(route)=>{const u=route.request().url();hits.push(u);const who=(u.match(/player\/([^/]+)\//)||[])[1]||'x';
    if(/\/games\/archives$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:['https://api.chess.com/pub/player/'+who+'/games/2026/10']})});
    if(/games\/2026\/10$/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games:[1,2].map(i=>({url:'https://www.chess.com/game/live/'+(9100+i)+who.length,pgn:PGN(who,'opp'+i,'2026.10.0'+i),end_time:1791000000+i*3600,time_class:'blitz',rules:'chess',white:{username:who,result:'win'},black:{username:'opp'+i,result:'checkmated'}}))})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});});return hits;}
// the account document, merged as Firestore merges {merge:true}: top-level fields, and ctProgress field by field
function mergeInto(doc,saves){for(const d of saves){for(const k of Object.keys(d)){if(k==='ctProgress'){doc.ctProgress=Object.assign({},doc.ctProgress||{},d.ctProgress);}else doc[k]=d[k];}}return doc;}
const signIn=(b,doc,uid)=>b.page.evaluate(([doc,uid])=>{const C=window.CTCloud;window.__saved=[];C._load=()=>Promise.resolve(doc?JSON.parse(JSON.stringify(doc)):null);C._save=(d)=>{window.__saved.push(JSON.parse(JSON.stringify(d)));return Promise.resolve();};
  C.signOut=()=>{C._emit(null);return Promise.resolve();};C._emit({uid:uid||'gate-uid',name:'Gate',email:'gate@example.test',photo:null});},[doc,uid]);
const saves=(b)=>b.page.evaluate(()=>window.__saved||[]);
const lastProg=(sv)=>{for(let i=sv.length-1;i>=0;i--)if(sv[i]&&sv[i].ctProgress)return sv[i].ctProgress;return null;};
const J=(s)=>{try{return JSON.parse(s);}catch(e){return null;}};
// every card is gate 134's real blunder (Qd2 leaves the queen when Qxd5 wins one), so the app's own re-grade pass keeps it; the black
// king's square keeps each side's positions distinct (row 0 = the 8th rank, file i)
const FILES=['k7','1k6','2k5','3k4','4k3','5k2','6k1','7k'];
const ROWS={m:[0,0],t:[1,0],c:[2,4],x:[1,0],bm:[1,0],bt:[2,4],u1:[2,4]};   // [row, file offset]: on the 6th rank only f6..h6, clear of the queen on d5
const fenN=(i,tag)=>{const [row,off]=ROWS[tag]||[0,0];const r=['8','8','8'];r[row]=FILES[(i+off)%8];return r.join('/')+'/3q4/8/8/8/3QK3 w - - 0 1';};
const card=(i,tag)=>({fen:fenN(i,tag),uci:'d1d5',label:'Blunder',played:'Qd2',ts:1791000000000+i,last:null,why:'Qxd5 was stronger.'});
const SEED={ct_regrade550:{at:1,before:0,after:0,dropped:0},ct_bril_reset_v1:'1',ct_pool:'3'};
const ymd=(off)=>{const d=new Date();d.setDate(d.getDate()+off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
L.run(async()=>{
  const doc={};
  { // (a) device 1 follows two accounts and switched one off; it signs in to an empty account and saves
    const b=await L.launch({geo:'kunal761',name:'acct145d1',store:Object.assign({},SEED,{ct_accts:['cc:kunal2023','cc:friendx'],ct_acctmine:{'cc:friendx':false},ct_acctasked:{'cc:kunal2023':1,'cc:friendx':1}})});
    await stub(b);await b.open();await signIn(b,null,'gate-uid');
    let p=null;for(let i=0;i<20;i++){await b.settle(500);p=lastProg(await saves(b));if(p&&p.ct_accts)break;}
    const ac=J(p&&p.ct_accts)||[],am=J(p&&p.ct_acctmine)||{};
    L.say(ac.indexOf('cc:kunal2023')>=0&&ac.indexOf('cc:friendx')>=0&&am['cc:friendx']===false,'TC-R221a device 1 saves its followed accounts and the "not mine" switch to the account (ct_accts '+JSON.stringify(ac)+', ct_acctmine '+JSON.stringify(am)+')',p&&Object.keys(p));
    mergeInto(doc,await saves(b));L.say(b.errs.length===0,'TC-R221 zero app errors (device 1)',b.errs.slice(0,3));await b.close();
  }
  { // (b)(c) a fresh device 2 signs in on Home; the account also carries a streak, cards and brilliant moves from device 1
    doc.ctProgress=Object.assign({},doc.ctProgress||{},{ct_daily:JSON.stringify({date:ymd(-1),count:2,streak:7}),ct_mymistakes:JSON.stringify([card(1,'c'),card(2,'c'),card(3,'c')])});
    const b=await L.launch({geo:'kunal761',name:'acct145d2',store:SEED});const hits=await stub(b);await b.open();await b.settle(800);
    const h0=hits.length;const risk0=await b.page.evaluate(()=>/(^|\D)7\s*DAYS\b/i.test(document.body.innerText));
    L.say(h0===0&&!risk0,'TC-R221 PRECONDITION device 2 fresh on Home, signed out: nothing fetched, no streak shown ('+h0+' requests)',{h0,risk0});
    await signIn(b,doc,'gate-uid');
    let n1=0,n2=0;for(let i=0;i<40;i++){await b.settle(500);n1=hits.filter(u=>/player\/kunal2023\//.test(u)).length;n2=hits.filter(u=>/player\/friendx\//.test(u)).length;if(n1>=2&&n2>=2)break;}
    L.say(n1>=2&&n2>=2,'TC-R221b device 2 fetches both followed accounts as soon as they arrive, on Home ('+n1+' requests for kunal2023, '+n2+' for friendx)',hits.slice(0,6));
    let st=null;for(let i=0;i<10;i++){st=await b.page.evaluate(()=>({a:localStorage.getItem('ct_accts'),m:localStorage.getItem('ct_acctmine')}));const a=J(st.a)||[];if(a.length>=2)break;await b.settle(500);}
    const a2=J(st.a)||[],m2=J(st.m)||{};
    L.say(a2.indexOf('cc:kunal2023')>=0&&a2.indexOf('cc:friendx')>=0&&m2['cc:friendx']===false,'TC-R221c both are on device 2\'s list, friendx still switched to "not mine" ('+st.a+', '+st.m+')',st);
    const risk1=await b.page.evaluate(()=>/(^|\D)7\s*DAYS\b/i.test(document.body.innerText));
    L.say(risk1,'TC-R221d device 2\'s Home shows the account\'s streak at once, with no reload (the 7 DAYS streak chip '+(risk1?'shown':'absent')+')',risk1);
    await b.settle(3500);const p=lastProg(await saves(b));const pm=J(p&&p.ct_mymistakes)||[],pd=J(p&&p.ct_daily)||{};
    L.say(pm.length===3&&pd.streak===7,'TC-R221e device 2\'s backup carries the account\'s 3 cards and 7-day streak, not its own pre-pull empties ('+pm.length+' cards, streak '+pd.streak+')',{cards:pm.length,daily:pd});
    L.say(b.errs.length===0,'TC-R221 zero app errors (device 2)',b.errs.slice(0,3));await b.close();
  }
  { // (d) the newer value wins, not the longer string
    const t0=Date.now()-3*24*3600*1000,t1=Date.now()-3600*1000;
    const acct={ctProgress:{ct_rating:JSON.stringify({r:845,n:9}),ct_daily:JSON.stringify({date:ymd(-1),count:1,streak:7}),ct_elo:'900',
      ct_syncmeta:JSON.stringify({t:{ct_rating:t1,ct_daily:t1,ct_elo:t1},s:{}})}};
    // a device used three days ago: streak 4 then, engine strength 1250 then (both stamped then); its rating is the untouched default
    const b=await L.launch({geo:'kunal761',name:'acct145d3',store:Object.assign({},SEED,{ct_daily:{date:ymd(-3),count:1,streak:4},ct_elo:'1250',ct_syncmeta:{t:{ct_daily:t0,ct_elo:t0},s:{}}})});
    await stub(b);await b.open();await signIn(b,acct,'gate-uid');
    let st=null;for(let i=0;i<10;i++){await b.settle(500);st=await b.page.evaluate(()=>({r:localStorage.getItem('ct_rating'),d:localStorage.getItem('ct_daily'),e:localStorage.getItem('ct_elo')}));if((J(st.r)||{}).r===845)break;}
    await b.settle(3000);const p=lastProg(await saves(b))||{};
    L.say((J(st.r)||{}).r===845&&(J(p.ct_rating)||{}).r===845,'TC-R221f a fresh device\'s default rating does not replace the account\'s 845 (device '+st.r+', saved '+p.ct_rating+')',{st,saved:p.ct_rating});
    L.say((J(st.d)||{}).streak===7&&(J(p.ct_daily)||{}).streak===7,'TC-R221g the account\'s newer streak (7, yesterday) beats this device\'s older one (4, three days ago) (device '+st.d+')',{st:st.d,saved:p.ct_daily});
    L.say(st.e==='900'&&p.ct_elo==='900','TC-R221h the newer engine-strength change (900) wins over this device\'s older 1250 (device '+st.e+', saved '+p.ct_elo+')',{st:st.e,saved:p.ct_elo});
    L.say(b.errs.length===0,'TC-R221 zero app errors (newer wins)',b.errs.slice(0,3));await b.close();
  }
  { // (e) lists merge as unions that keep removals
    const now=Date.now();const X=card(7,'x');
    const mine=[card(1,'m'),card(2,'m'),card(3,'m'),card(4,'m'),card(5,'m'),X];
    const theirs=[card(1,'t'),card(2,'t'),card(3,'t')];
    const brMine=[{fen:card(1,'bm').fen,uci:'e1e2',ts:1},{fen:card(2,'bm').fen,uci:'e1e2',ts:2}],brTheirs=[{fen:card(3,'bt').fen,uci:'e1e2',ts:3}];
    const acct={ctProgress:{ct_mymistakes:JSON.stringify(theirs),ct_mybrilliancies:JSON.stringify(brTheirs),ct_accts:JSON.stringify(['cc:kunal2023']),
      ct_syncmeta:JSON.stringify({t:{ct_mymistakes:now-1000,ct_accts:now-1000},s:{ct_mymistakes:{[X.fen]:[0,now-2000]},ct_accts:{'cc:oldfriend':[1,now-2000]}}})}};
    const b=await L.launch({geo:'kunal761',name:'acct145d4',store:Object.assign({},SEED,{ct_mymistakes:mine,ct_mybrilliancies:brMine,ct_accts:['cc:kunal2023','cc:oldfriend']})});
    await stub(b);await b.open();await b.settle(2500);
    const pre=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_mymistakes')||'[]').map(x=>x.fen);}catch(e){return [];}});
    L.say(pre.indexOf(X.fen)>=0&&pre.length===6,'TC-R221 PRECONDITION before sign-in this device holds its 6 cards, the one removed elsewhere among them ('+pre.length+')',pre.length);
    await signIn(b,acct,'gate-uid');
    let st=null;for(let i=0;i<12;i++){await b.settle(500);st=await b.page.evaluate(()=>({m:localStorage.getItem('ct_mymistakes'),br:localStorage.getItem('ct_mybrilliancies'),a:localStorage.getItem('ct_accts')}));if((J(st.m)||[]).length>=8)break;}
    await b.settle(3000);const p=lastProg(await saves(b))||{};
    const mm=(J(st.m)||[]).map(x=>x.fen),pm=(J(p.ct_mymistakes)||[]).map(x=>x.fen);
    const want=[...mine.slice(0,5),...theirs].map(x=>x.fen);
    L.say(want.every(f=>mm.indexOf(f)>=0)&&want.every(f=>pm.indexOf(f)>=0),'TC-R221i drill cards keep both sides: this device\'s 5 and the account\'s 3 ('+mm.length+' on the device, '+pm.length+' saved)',{device:mm.length,saved:pm.length});
    const acc=J(st.a)||[];
    L.say(mm.indexOf(X.fen)<0&&pm.indexOf(X.fen)<0&&acc.indexOf('cc:oldfriend')<0,'TC-R221j a card and a followed account removed on the other device leave this one too (card '+(mm.indexOf(X.fen)<0?'gone':'still here')+', accounts '+st.a+')',{acc});
    const bb=(J(st.br)||[]).map(x=>x.fen);
    L.say([...brMine,...brTheirs].every(x=>bb.indexOf(x.fen)>=0),'TC-R221k brilliant moves keep both sides ('+bb.length+' of 3)',bb.length);
    L.say(b.errs.length===0,'TC-R221 zero app errors (unions)',b.errs.slice(0,3));await b.close();
  }
  { // (f) a different account on the same device starts clean
    const b=await L.launch({geo:'kunal761',name:'acct145d5',store:Object.assign({},SEED,{ct_owner:'gate-uid',ct_accts:['cc:kunal2023'],ct_acctmine:{'cc:kunal2023':false},ct_acctasked:{'cc:kunal2023':1},ct_syncmeta:{t:{ct_elo:1},s:{}},ct_mymistakes:[card(1,'u1')]})});
    await stub(b);await b.open();
    await signIn(b,null,'other-uid');await b.settle(2500);   // the ct_owner check wipes and reloads
    await b.page.waitForLoadState('load').catch(()=>{});await b.settle(1500);
    await signIn(b,null,'other-uid');await b.settle(4000);
    const left=await b.page.evaluate(()=>['ct_accts','ct_acctmine','ct_acctasked','ct_syncmeta','ct_mymistakes'].filter(k=>{const v=localStorage.getItem(k);return v!=null&&v!=='[]'&&v!=='{}'&&!(k==='ct_syncmeta'&&!/u1|kunal2023|"ct_elo":1\b/.test(v));}));
    const p=lastProg(await saves(b))||{};const carried=['ct_accts','ct_acctmine','ct_acctasked','ct_mymistakes'].filter(k=>p[k]&&/kunal2023|u1/.test(p[k]));
    L.say(left.length===0&&carried.length===0,'TC-R221l a different account signing in on device 1 gets a clean device: nothing of the first player\'s accounts, switches or cards stays or is saved (left '+JSON.stringify(left)+', saved '+JSON.stringify(carried)+')',{left,carried});
    L.say(b.errs.length===0,'TC-R221 zero app errors (second account)',b.errs.slice(0,3));await b.close();
  }
},'145-accounts-follow-across-devices');
