'use strict';
// gates/regress/145-accounts-follow-across-devices.js - TWO DEVICES ON ONE ACCOUNT AGREE, AND THE NEWER CHANGE WINS. US-R153 / TC-R221a..q.
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
//  (g) SYN-06/SYN-11 (#550): TC-R221m a fresh device takes the account's piece set, eval-off and chosen opponent, and keeps them in its backup;
//      TC-R221n the running board is drawn in that piece set at once; TC-R221o rated online games, puzzles shown and lessons finished are unions.
//  (h) SYN-07: TC-R221p a device left open pulls the account again when it is come back to (focus / visibilitychange, 20 s after the last
//      pull), and TC-R221q its next backup carries the other device's newer engine strength and card instead of rolling them back.
//  (i) #550 cg5 SYN-11 (the puzzle streak): TC-R221r a fresh device takes the account's streak 5 (best 7) into the running app (its puzzle store)
//      and TC-R221s no puzzle backup from it carries its own 0; TC-R221t an older device streak (2, three days ago) gives way to the account's
//      (5, yesterday); TC-R221u a streak broken HERE after the account's was set (0, a minute ago) is the newer change and wins, best the max.
// KNOW ITS LIMIT: the real Firestore round trip is not exercised (the pull on return is a load, not a live listener); chess.com only. Where the
// eval bar sits (ct_evalunder) is deliberately left per device until he says otherwise, so it is not asserted.
// CONTROL-RECORD: bcc4eff 2026-11-13 total=30 red=6 scope=trial:9f4f6f823150 how=#550 SYN-06/07/11 arms on t0, the branch tip before them (faa82a9): TC-R221m (device classic/0/none), n (32 piece pictures), o x2 (one side only), p (2 -> 2 loads, ct_elo 1250), q (saved 1250, card lost) red; the older arms stay green; on t3 450fed03791b 30/0
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=20 red=10 scope=trial:ee1e228e0899 how=#550 the branch tip before SYN-01..05 (accounts not synced, longer-string rule, whole-list replace, pull not applied to state): TC-R221a,b,c,d,f,g,h,i,j,k red; e and l stay green there (l is SEC-15's wipe, already on the tip: named, not credited; e reads the pushed cards and streak, which the tip also pushes in this input because it is a fresh device: named, not credited); on t2 f9918762b587 20/0
// CONTROL-RECORD: f41cd92 2026-11-13 total=8 red=3 scope=trial:03e9426693ab how=#550 cg5 SYN-11 block (i) alone (CT_145_BLOCKS=i) on t0, the branch tip f41cd92 (streak never pulled): TC-R221r (device streak 0), TC-R221s (saved [0]), TC-R221t (device 2, saved 2) red; TC-R221u stays green there by design (named, not credited); on t1 f44399342fff 8/0
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
// CT_145_BLOCKS=a,i runs only those blocks (a subset is a diagnosis aid; the suite runs every block). Unset: all.
const ONLY=(process.env.CT_145_BLOCKS||'').split(',').filter(Boolean);const on=(x)=>!ONLY.length||ONLY.indexOf(x)>=0;
L.run(async()=>{
  if(ONLY.length)L.note('CT_145_BLOCKS='+ONLY.join(',')+': a SUBSET of this gate ran');
  const doc={};
  if(on('a')){ // (a) device 1 follows two accounts and switched one off; it signs in to an empty account and saves
    const b=await L.launch({geo:'kunal761',name:'acct145d1',store:Object.assign({},SEED,{ct_accts:['cc:kunal2023','cc:friendx'],ct_acctmine:{'cc:friendx':false},ct_acctasked:{'cc:kunal2023':1,'cc:friendx':1}})});
    await stub(b);await b.open();await signIn(b,null,'gate-uid');
    let p=null;for(let i=0;i<20;i++){await b.settle(500);p=lastProg(await saves(b));if(p&&p.ct_accts)break;}
    const ac=J(p&&p.ct_accts)||[],am=J(p&&p.ct_acctmine)||{};
    L.say(ac.indexOf('cc:kunal2023')>=0&&ac.indexOf('cc:friendx')>=0&&am['cc:friendx']===false,'TC-R221a device 1 saves its followed accounts and the "not mine" switch to the account (ct_accts '+JSON.stringify(ac)+', ct_acctmine '+JSON.stringify(am)+')',p&&Object.keys(p));
    mergeInto(doc,await saves(b));L.say(b.errs.length===0,'TC-R221 zero app errors (device 1)',b.errs.slice(0,3));await b.close();
  }
  if(on('b')){ // (b)(c) a fresh device 2 signs in on Home; the account also carries a streak, cards and brilliant moves from device 1
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
  if(on('d')){ // (d) the newer value wins, not the longer string
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
  if(on('e')){ // (e) lists merge as unions that keep removals
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
  if(on('f')){ // (f) a different account on the same device starts clean
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
  if(on('g')){ // (g) SYN-06: the board look and eval settings follow the account; SYN-11: rated games, lessons finished and puzzles shown are unions
    const t1=Date.now()-3600*1000;
    const acct={ctProgress:{ct_pieceSet:'symbol',ct_hideEval:'1',ct_bot:'astrid',ct_rated:JSON.stringify(['og-acct-1']),ct_pzshown:JSON.stringify({pzA:1}),ct_lessonfin:JSON.stringify({n:1,at:t1,by:{'Italian Game':t1}}),
      ct_syncmeta:JSON.stringify({t:{ct_pieceSet:t1,ct_hideEval:t1,ct_bot:t1,ct_rated:t1,ct_pzshown:t1,ct_lessonfin:t1},s:{}})}};
    const b=await L.launch({geo:'kunal761',name:'acct145d6',store:Object.assign({},SEED,{ct_rated:['og-dev-1'],ct_pzshown:{pzB:1},ct_lessonfin:{n:1,at:t1-1000,by:{'London System':t1-1000}}})});
    await stub(b);await b.open();await b.settle(1200);
    const pre=await b.page.evaluate(()=>({p:localStorage.getItem('ct_pieceSet'),h:localStorage.getItem('ct_hideEval')}));
    L.say(pre.p!=='symbol'&&pre.h!=='1','TC-R221 PRECONDITION before sign-in this fresh device has its own defaults ('+JSON.stringify(pre)+')',pre);
    await signIn(b,acct,'gate-uid');
    let st=null;for(let i=0;i<12;i++){await b.settle(500);st=await b.page.evaluate(()=>({p:localStorage.getItem('ct_pieceSet'),h:localStorage.getItem('ct_hideEval'),bot:localStorage.getItem('ct_bot'),r:localStorage.getItem('ct_rated'),z:localStorage.getItem('ct_pzshown'),f:localStorage.getItem('ct_lessonfin')}));if(st.p==='symbol')break;}
    await b.settle(3000);const p=lastProg(await saves(b))||{};
    L.say(st.p==='symbol'&&st.h==='1'&&st.bot==='astrid'&&p.ct_pieceSet==='symbol'&&p.ct_hideEval==='1','TC-R221m the account\'s piece set, eval bar off and chosen opponent come down to a fresh device and stay in its backup (device '+JSON.stringify({p:st.p,h:st.h,bot:st.bot})+', saved '+JSON.stringify({p:p.ct_pieceSet,h:p.ct_hideEval})+')',{st,p:{p:p.ct_pieceSet,h:p.ct_hideEval,bot:p.ct_bot}});
    // the running app took them, not only the store: the board is drawn in the symbol set (no piece pictures) with no reload
    let imgs=-1,glyphs=-1;try{const P=require('../drive/play');await P.states['pp-m0'](b);await b.settle(800);
      ({imgs,glyphs}=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((x,y)=>y.getBoundingClientRect().width-x.getBoundingClientRect().width)[0];if(!g)return {imgs:-1,glyphs:-1};
        return {imgs:g.querySelectorAll('img').length,glyphs:(g.innerText.match(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g)||[]).length};}));}catch(e){L.note('pp-m0: '+String(e).slice(0,120));}
    L.say(imgs===0&&glyphs>=30,'TC-R221n the running app draws the board in the account\'s piece set at once, with no reload ('+imgs+' piece pictures, '+glyphs+' symbol pieces)',{imgs,glyphs});
    const R=J(st.r)||[],Z=J(st.z)||{},F=J(st.f)||{};const pr=J(p.ct_rated)||[];
    L.say(R.indexOf('og-acct-1')>=0&&R.indexOf('og-dev-1')>=0&&pr.indexOf('og-acct-1')>=0&&pr.indexOf('og-dev-1')>=0,'TC-R221o the online games already rated are a union of both devices ('+st.r+', saved '+p.ct_rated+')',{R,pr});
    L.say(Z.pzA&&Z.pzB&&F.by&&F.by['Italian Game']&&F.by['London System'],'TC-R221o puzzles shown and lessons finished keep both devices\' entries ('+st.z+', '+st.f+')',{Z,F});
    L.say(b.errs.length===0,'TC-R221 zero app errors (settings)',b.errs.slice(0,3));await b.close();
  }
  if(on('h')){ // (h) SYN-07: two devices open - coming back to the app pulls the account first, so the copy left open does not roll the cloud back
    const now=Date.now();
    const b=await L.launch({geo:'kunal761',name:'acct145d7',store:Object.assign({},SEED,{ct_elo:'1250',ct_syncmeta:{t:{ct_elo:now-7200*1000},s:{}}})});
    await stub(b);await b.open();await b.settle(800);
    await b.page.evaluate(()=>{const C=window.CTCloud;window.__saved=[];window.__doc={ctProgress:{}};window.__loads=0;C._load=()=>{window.__loads++;return Promise.resolve(JSON.parse(JSON.stringify(window.__doc)));};
      C._save=(d)=>{window.__saved.push(JSON.parse(JSON.stringify(d)));return Promise.resolve();};C.signOut=()=>{C._emit(null);return Promise.resolve();};C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null});});
    let l0=0;for(let i=0;i<12;i++){await b.settle(500);l0=await b.page.evaluate(()=>window.__loads);if(l0>=1)break;}await b.settle(2500);l0=await b.page.evaluate(()=>window.__loads);
    L.say(l0>=1,'TC-R221 PRECONDITION device A pulled the account at sign-in ('+l0+' loads; the app reads the document more than once there)',l0);
    // meanwhile device B changed the engine strength and made a card; device A is still open on its old copy
    await b.page.evaluate(([now,c])=>{window.__doc={ctProgress:{ct_elo:'900',ct_mymistakes:JSON.stringify([c]),ct_syncmeta:JSON.stringify({t:{ct_elo:now,ct_mymistakes:now},s:{ct_mymistakes:{[c.fen]:[now,0]}}})}};},[now,card(5,'c')]);
    await b.settle(21000);   // past the 20 s guard on a fresh pull
    await b.page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
    let st=null;for(let i=0;i<12;i++){await b.settle(500);st=await b.page.evaluate(()=>({loads:window.__loads,e:localStorage.getItem('ct_elo'),m:localStorage.getItem('ct_mymistakes')}));if(st.e==='900')break;}
    await b.settle(3500);const p=lastProg(await saves(b))||{};const pm=(J(p.ct_mymistakes)||[]).map(x=>x.fen);
    L.say(st.loads>l0&&st.e==='900','TC-R221p coming back to the app pulls the account again: the other device\'s newer engine strength (900) is on this one ('+l0+' -> '+st.loads+' loads, ct_elo '+st.e+')',st);
    L.say(p.ct_elo==='900'&&pm.indexOf(card(5,'c').fen)>=0,'TC-R221q and this device\'s next backup carries the other device\'s changes instead of rolling them back (saved ct_elo '+p.ct_elo+', the other device\'s card '+(pm.indexOf(card(5,'c').fen)>=0?'kept':'lost')+')',{elo:p.ct_elo,cards:pm.length});
    L.say(b.errs.length===0,'TC-R221 zero app errors (live pull)',b.errs.slice(0,3));await b.close();
  }
  if(on('i')){ // (i) #550 cg5 SYN-11: the puzzle streak follows the account - the newer real change wins, a fresh device's 0 never does, best is the max
    const PZK='chesstrainer.progress.v1';const yday=Date.now()-24*3600*1000,old=Date.now()-3*24*3600*1000;
    const pzOf=(sv)=>sv.filter(x=>x&&x.pz).map(x=>x.pz);
    const run=async(name,dev,acctPz)=>{const b=await L.launch({geo:'kunal761',name,store:Object.assign({},SEED,dev?{[PZK]:dev}:{})});await stub(b);await b.open();await b.settle(1200);
      const pre=await b.page.evaluate((k)=>localStorage.getItem(k),PZK);
      await signIn(b,{ctProgress:{},pz:acctPz},'gate-uid');let st=null;
      for(let i=0;i<12;i++){await b.settle(500);st=J(await b.page.evaluate((k)=>localStorage.getItem(k),PZK))||{};if(st.streak===acctPz.streak)break;}
      await b.settle(2500);st=J(await b.page.evaluate((k)=>localStorage.getItem(k),PZK))||{};const ps=pzOf(await saves(b));const errs=b.errs.slice(0,3);await b.close();return {pre,st,ps,errs};};
    { const r=await run('acct145d8',null,{solved:{},streak:5,streakAt:yday,best:7,xp:60,online:0,onlineIds:{}});
      L.say(r.pre==null||(J(r.pre)||{}).streak===0||(J(r.pre)||{}).streak==null,'TC-R221r PRECONDITION the fresh device starts with no streak of its own ('+r.pre+')',r.pre);
      L.say(r.st.streak===5&&r.st.best===7,'TC-R221r a fresh device signing in takes the account\'s puzzle streak 5 (best 7) into the running app (device store streak '+r.st.streak+', best '+r.st.best+')',r.st);
      const zero=r.ps.filter(x=>x.streak!==5);
      L.say(r.ps.length>0&&zero.length===0,'TC-R221s and its puzzle backup never writes its own 0 over the account\'s 5 ('+r.ps.length+' puzzle saves, streaks '+JSON.stringify(r.ps.map(x=>x.streak))+')',r.ps.map(x=>({s:x.streak,at:x.streakAt})));
      L.say(r.errs.length===0,'TC-R221 zero app errors (streak, fresh device)',r.errs); }
    { const r=await run('acct145d9',{solved:{},streak:2,streakAt:old,best:2,xp:10,online:0,onlineIds:{}},{solved:{},streak:5,streakAt:yday,best:7,xp:60,online:0,onlineIds:{}});
      const last=r.ps[r.ps.length-1]||{};
      L.say(r.st.streak===5&&r.st.best===7&&last.streak===5,'TC-R221t a device whose streak (2, three days ago) is older than the account\'s (5, yesterday) takes the account\'s, and backs it up (device '+r.st.streak+', best '+r.st.best+', last saved '+last.streak+')',{st:r.st,last});
      L.say(r.errs.length===0,'TC-R221 zero app errors (streak, older device)',r.errs); }
    { // the other direction: this device missed a puzzle a minute ago, which is newer than the account's streak of 5 - its 0 is a real change and wins; best stays the max
      const r=await run('acct145d10',{solved:{},streak:0,streakAt:Date.now()-60000,best:3,xp:10,online:0,onlineIds:{}},{solved:{},streak:5,streakAt:yday,best:7,xp:60,online:0,onlineIds:{}});
      const last=r.ps[r.ps.length-1]||{};
      L.say(r.st.streak===0&&r.st.best===7&&last.streak===0&&last.best===7,'TC-R221u a streak broken on this device after the account\'s was set (0, a minute ago) is the newer change and wins; best is the max of both, 7 (device '+r.st.streak+'/'+r.st.best+', saved '+last.streak+'/'+last.best+') [named, not credited: the tip also keeps it, since it never pulled the streak]',{st:r.st,last});
      L.say(r.errs.length===0,'TC-R221 zero app errors (streak, newer device)',r.errs); }
  }
},'145-accounts-follow-across-devices');
