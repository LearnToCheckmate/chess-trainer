'use strict';
// gates/regress/137-no-browser-pro-switch.js - PRO COMES ONLY FROM THE SUBSCRIPTION; AN ACCOUNT CAN BE DELETED; SIGNING OUT LEAVES NOTHING
// BEHIND. US-R145 / TC-R213a..h.
//
// WHY [#550; docs/security-privacy-2026-11-12, Kunal's pick "All 20, serious first", Thu 12 Nov 2026]: SEC-01 (P1) - Pro was decided in the
// browser: localStorage ct_pro=1 gave every Pro feature with no sign-in and no payment, and ct_protest=1 brought back an "Unlock Pro (test
// mode)" button that wrote it. SEC-13 (P1) - there was no way to delete an account: no button, no code, and a page pointing at a placeholder
// email. SEC-15 (P2) - signing out cleared nothing, and the next account to sign in on the phone inherited the last player's data and pushed
// it into the new account.
//
// HOW, AND ITS LIMIT, NAMED: the real CTCloud lives in index.html's module importing from gstatic.com, which gates/lib.js BLOCKS, so the app
// half runs against a STAND-IN window.CTCloud (gates 96/100/103's shape, pinned with a setter that ignores index.html's own assignment). Its
// calls are counted in sessionStorage so they survive the reload that sign-out and deletion end with. The CLOUD half of deletion - which
// documents index.html's _deleteAccount removes or scrubs - is exercised in plain Node, by lifting that function's source out of the
// index.html under test (CT_INDEX, default the repository's) and running it over an in-memory Firestore with the same call shapes. That
// proves what the function ASKS Firestore to do; whether the live rules permit each step is rules-test/firestore.rules.test.js's job, and
// that file needs the emulator, which this sandbox does not have.
//
// WHAT IT ASSERTS, at kunal761:
//  (a) TC-R213a with ct_pro=1 AND ct_protest=1 seeded and nobody signed in, the Account sheet offers both paid plans (DENOMINATOR: the sheet
//      opened), does NOT show Manage subscription, Turn off Pro (test) or Unlock Pro (test mode), the Home style button still says (Pro),
//      and the two keys are gone from the store after load.
//  (b) TC-R213b the same reads DO see Pro when it is real: with the stand-in's proWatch answering true (a live subscription), the sheet shows
//      Manage subscription and no plans, and the style button is unlocked - so (a)'s absence is the switch, not a blind read.
//  (c) TC-R213c the bundle under test carries no read of ct_pro or ct_protest (getItem('ct_pro'), getItem('ct_protest')).
//  (d) TC-R213d signed in, the sheet has Delete account; tapping it opens a confirm (DENOMINATOR) and calls nothing; Delete my account then
//      calls CTCloud.deleteAccount exactly once, and the device's synced data is gone afterwards while its settings stay.
//  (e) TC-R213e index.html's _deleteAccount, over an in-memory Firestore holding one player's footprint, confirms identity FIRST, then deletes
//      users, mm, nearby, both friend requests, the friendship, the hosted tournament, the checkout session, the waiting game and the call
//      document; scrubs the seat and only this player's chat in the started game; removes only their own entry from another tournament;
//      and deletes the Auth user LAST. With the Google confirmation closed it deletes nothing.
//  (f) TC-R213f Sign out opens a confirm whose "Remove my data from this device" box is ticked by default; confirming signs out and the
//      synced keys, linked usernames and puzzle progress are gone after the reload while the theme stays.
//  (g) TC-R213g the same with the box unticked keeps the data (the wipe is the choice, not an accident of the reload).
//  (h) TC-R213h a DIFFERENT account signing in on a device stamped with another uid (ct_owner) starts clean: the old progress is gone
//      before any save, and no save carries it.
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=22 red=16 scope=trial:79d0124fe952 how=#550 SEC batch: the bundle built from 9a6a5c6 before the change, with CT_INDEX=9a6a5c6's index.html (no _deleteAccount) - ct_pro/ct_protest grant Pro and the test buttons show (TC-R213a 4 red, TC-R213c red), no Delete account (TC-R213d 4 red, TC-R213e's DENOMINATOR red and the gate stops there), no sign-out confirm (TC-R213f 3 red, TC-R213g red), and a different account inherits and SAVES the old player's puzzles (TC-R213h 2 red); TC-R213b, the theme-kept line and both zero-error lines green; on e617c6bd93cb 28/0
const L=require('../lib');
const fs=require('fs'),path=require('path');
const IDX=process.env.CT_INDEX||path.join(__dirname,'..','..','index.html');

// a signed-in stand-in; sessionStorage 'st_' keys count calls across reloads; st_out=1 makes onAuth report signed out after a sign-out
const STUB=(cfg)=>{
  const ss=(k,d)=>{try{const v=sessionStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
  const put=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}};
  const bump=(k)=>put(k,ss(k,0)+1);
  const me={uid:cfg.uid||'u-me',name:'Me',email:'',photo:''};
  const base={ready:true,user:null,
    onAuth(cb){setTimeout(()=>{const u=ss('st_out',0)?null:me;base.user=u;try{cb(u);}catch(e){}},40);return ()=>{};},
    proWatch(cb){setTimeout(()=>{try{cb(!!cfg.pro);}catch(e){}},40);return ()=>{};},
    load:async()=>null,
    save:async(d)=>{const a=ss('st_saves',[]);a.push(JSON.stringify(d).slice(0,4000));put('st_saves',a);},
    signOut:async()=>{bump('st_signout');put('st_out',1);},
    deleteAccount:async()=>{bump('st_delete');put('st_out',1);return {ok:true};},
    nearbyLeave:async()=>{bump('st_nearbyleave');},
    gameList:async()=>[],friendId(){return me.uid;},
    friendsWatch(cb){setTimeout(()=>{try{cb({incoming:[],friends:[]});}catch(e){}},0);return ()=>{};},
    gameWatch(){return ()=>{};},nearbyList(){return ()=>{};},tourList(){return ()=>{};},tourWatch(){return ()=>{};},gameLeave(){},mmCancel(){}};
  const stub=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null;}});
  Object.defineProperty(window,'CTCloud',{configurable:false,get(){return stub;},set(v){}});
};
const SEED={ct_learnprog:'{"MARK":{"learned":true,"days":["2026-11-01"]}}',ct_rating:'{"r":1234,"n":9}',ct_mymistakes:'[{"fen":"MARK"}]',
  ct_ccuser:'markplayer',ct_accts:'[{"id":"cc:markplayer"}]','chesstrainer.progress.v1':'{"solved":{"MARK":1}}',ct_theme:'3',ct_sound:'0'};
const WIPED=['ct_learnprog','ct_rating','ct_mymistakes','ct_ccuser','ct_accts','chesstrainer.progress.v1'],KEPT=['ct_theme','ct_sound'];
// GONE = the seeded value is no longer there. The app writes its own DEFAULTS for some keys again on the next load ('{}', a 400 rating),
// so "gone" is read as "carries none of the seeded marks", never as "the key is absent".
const OLD=/MARK|markplayer|1234/;const gone=(s)=>WIPED.filter(k=>s[k]!=null&&OLD.test(s[k]));
const store=(b,ks)=>b.page.evaluate((ks)=>{const o={};for(const k of ks){try{o[k]=localStorage.getItem(k);}catch(e){o[k]='ERR';}}return o;},ks);
const sess=(b,k)=>b.page.evaluate((k)=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return null;}},k);
const READ=(b)=>b.page.evaluate(()=>{const vis=(x)=>{const r=x.getBoundingClientRect();return r.width>2&&r.height>2;};
  const btns=[...document.querySelectorAll('button')].filter(vis);const has=(re)=>btns.some(x=>re.test((x.innerText||'').trim()));
  const t=document.body.innerText||'';const sty=document.querySelector('[aria-label^="Style:"]');
  return {plans:has(/^Monthly\b/)&&has(/^Annual\b/),manage:has(/^\W*Manage subscription/),testOff:/Turn off Pro \(test\)/.test(t),testOn:/Unlock Pro \(test mode\)/.test(t),
    style:sty?sty.getAttribute('aria-label'):null,del:!!document.querySelector('[data-ct="acct-delete"]'),out:!!document.querySelector('[data-ct="acct-signout"]')};});
async function openSheet(b){try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);return true;}catch(e){return false;}}
async function tap(b,sel){const ok=await b.page.waitForSelector(sel,{timeout:4000}).then(()=>true).catch(()=>false);if(!ok)return false;try{await b.page.click(sel);}catch(e){return false;}return true;}
async function launch(name,st,cfg){const b=await L.launch({geo:'kunal761',name,store:st||{}});if(cfg)await b.ctx.addInitScript(STUB,cfg);await b.open();await b.settle(500);return b;}
async function afterReload(b){await b.settle(2500);try{await b.page.waitForFunction(()=>{const r=document.getElementById('root');return r&&r.children.length&&!document.getElementById('boot');},null,{timeout:20000});}catch(e){}await b.settle(900);}

// ── (e) the cloud half, in Node: lift C._deleteAccount out of index.html and run it over an in-memory Firestore
function liftDelete(src){const i=src.indexOf('C._deleteAccount = async function(){');if(i<0)return null;const j=src.indexOf('\n      onAuthStateChanged(',i);if(j<0)return null;return src.slice(i,j);}
function fakeFs(seedDocs){
  const D=new Map(Object.entries(JSON.parse(JSON.stringify(seedDocs))));const log=[];
  const REMOVE=Symbol('arrayRemove');
  const doc=(db,...p)=>({path:p.join('/')});const collection=(db,...p)=>({path:p.join('/'),coll:true,wh:[]});
  const where=(f,op,v)=>({f,op,v});const query=(c,...w)=>({path:c.path,coll:true,wh:w});
  const snapOf=(path)=>({exists:()=>D.has(path),data:()=>D.has(path)?JSON.parse(JSON.stringify(D.get(path))):undefined,ref:{path}});
  const getDoc=async(r)=>{log.push(['get',r.path]);return snapOf(r.path);};
  const getDocs=async(q)=>{log.push(['list',q.path]);const out=[];for(const [p,v] of D){const rest=p.slice(q.path.length+1);if(!p.startsWith(q.path+'/')||rest.includes('/'))continue;
      if(q.wh.every(w=>w.op==='=='?v[w.f]===w.v:(w.op==='array-contains'?Array.isArray(v[w.f])&&v[w.f].includes(w.v):false)))out.push(snapOf(p));}
    return {forEach:(fn)=>out.forEach(fn),size:out.length};};
  const deleteDoc=async(r)=>{log.push(['delete',r.path]);D.delete(r.path);};
  const updateDoc=async(r,u)=>{log.push(['update',r.path,Object.keys(u).sort().join(',')]);if(!D.has(r.path))throw Object.assign(new Error('not-found'),{code:'not-found'});const v=D.get(r.path);
    for(const k of Object.keys(u)){const x=u[k];if(x&&x[REMOVE]){v[k]=(v[k]||[]).filter(e=>!x.items.some(it=>JSON.stringify(it)===JSON.stringify(e)));}else v[k]=JSON.parse(JSON.stringify(x));}};
  const setDoc=async(r,d)=>{log.push(['set',r.path]);D.set(r.path,JSON.parse(JSON.stringify(d)));};
  const arrayRemove=(...items)=>({[REMOVE]:true,items});
  return {D,log,fns:{doc,collection,where,query,getDoc,getDocs,deleteDoc,updateDoc,setDoc,arrayRemove}};
}
async function runDelete(body,seedDocs,reauthFails){
  const F=fakeFs(seedDocs);const C={};const u={uid:'u-me'};const auth={currentUser:u};
  const reauthenticateWithPopup=async()=>{F.log.push(['reauth']);if(reauthFails){const e=new Error('closed');e.code='auth/popup-closed-by-user';throw e;}};
  const deleteUser=async()=>{F.log.push(['deleteUser']);};
  const names=['C','auth','db','provider','reauthenticateWithPopup','deleteUser',...Object.keys(F.fns)];
  const fn=new Function(...names,body+'\nreturn C._deleteAccount;');
  const del=fn(C,auth,{},{},reauthenticateWithPopup,deleteUser,...Object.values(F.fns));
  let err=null;try{await del();}catch(e){err=(e&&(e.code||e.message))||String(e);}
  return {D:F.D,log:F.log,err};
}
const FOOT={
  'users/u-me':{games:['G1','G2'],ctProgress:{}},
  'games/G1':{code:'G1',status:'active',moves:['e2e4'],w:{uid:'u-me',name:'Me',photo:'https://lh3.googleusercontent.com/x'},b:{uid:'u-op',name:'Op',photo:''},
    chat:[{uid:'u-me',name:'Me',text:'hi',t:1},{uid:'u-op',name:'Op',text:'hello',t:2}]},
  'games/G1/call/signal':{rtc:{from:'u-me',offer:{sdp:'v=0 IP'}}},
  'games/G2':{code:'G2',status:'waiting',moves:[],w:{uid:'u-me',name:'Me'},chat:[]},
  'games/G3':{code:'G3',status:'active',moves:[],w:{uid:'u-x',name:'X'},b:{uid:'u-y',name:'Y'},chat:[]},
  'mm/u-me':{uid:'u-me',status:'waiting'},'mm/u-op':{uid:'u-op',status:'waiting'},
  'nearby/u-me':{uid:'u-me',geo:'zip:sw1'},'nearby/u-op':{uid:'u-op',geo:'zip:sw1'},
  'friendReqs/R1':{from:'u-me',to:'u-a',status:'pending'},'friendReqs/R2':{from:'u-b',to:'u-me',status:'pending'},'friendReqs/R3':{from:'u-a',to:'u-b',status:'pending'},
  'friends/F1':{users:['u-me','u-c'],names:{}},'friends/F2':{users:['u-a','u-c'],names:{}},
  'tournaments/T1':{host:'u-me',players:[{uid:'u-me',name:'Me'}]},
  'tournaments/T2':{host:'u-op',players:[{uid:'u-op',name:'Op'},{uid:'u-me',name:'Me',photo:''}]},
  'customers/u-me/checkout_sessions/S1':{price:'p'},
};

L.run(async()=>{
  // (a) the switches grant nothing
  {const b=await launch('pro-switch',{ct_pro:'1',ct_protest:'1',ct_skin:'2'});const k0=await store(b,['ct_pro','ct_protest']);const ok=await openSheet(b);const r=await READ(b);
    L.say(ok&&r.plans,'TC-R213a DENOMINATOR the Account sheet opened from Home (both paid plans on screen) on a store holding ct_pro=1 and ct_protest=1',{ok,...r});
    L.say(ok&&r.plans&&!r.manage&&!r.testOff&&!r.testOn,'TC-R213a ct_pro=1 and ct_protest=1 grant nothing: no Manage subscription, no Turn off Pro (test), no Unlock Pro (test mode)',r);
    L.say(!!r.style&&/\(Pro\)/.test(r.style),'TC-R213a the Home style button is still locked ("'+r.style+'") - the Medieval skin seeded with ct_pro does not apply',r.style);
    L.say(k0.ct_pro==null&&k0.ct_protest==null,'TC-R213a both keys are removed from the store on load',k0);
    L.say(b.errs.length===0,'TC-R213a zero app errors',b.errs.slice(0,3));await b.close();}
  // (b) the reads can see real Pro
  {const b=await L.launch({geo:'kunal761',name:'pro-real',pro:true,store:{ct_skin:'2'}});await b.open();await b.settle(700);const ok=await openSheet(b);const r=await READ(b);
    const st=await b.page.evaluate(()=>window.__ctProStub?Object.assign({},window.__ctProStub):null);
    L.say(ok&&r.manage&&!r.plans&&!!st&&st.proWatchCalls>0,'TC-R213b with a live subscription (proWatch true) the same sheet shows Manage subscription and no plans - the read can see Pro',{ok,...r,st});
    L.say(!!r.style&&!/\(Pro\)/.test(r.style),'TC-R213b and the style button is unlocked ("'+r.style+'")',r.style);await b.close();}
  // (c) the bundle
  {const app=fs.readFileSync(process.env.CT_APP||path.join(__dirname,'..','..','app.js'),'utf8');
    const hits=(app.match(/getItem\(\s*["'`]ct_pro(test)?["'`]\s*\)/g)||[]);
    L.say(hits.length===0,'TC-R213c the bundle under test reads neither ct_pro nor ct_protest ('+hits.length+' reads)',hits);}
  // (d) Delete account in the app
  {const b=await launch('acct-delete',SEED,{uid:'u-me'});const ok=await openSheet(b);const r=await READ(b);
    L.say(ok&&r.del,'TC-R213d signed in, the Account sheet has Delete account',{ok,...r});
    const t1=r.del&&await tap(b,'[data-ct="acct-delete"]');await b.settle(400);
    const conf=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="acct-delete-confirm"]');const g=document.querySelector('[data-ct="acct-delete-go"]');if(!e||!g)return null;const rr=g.getBoundingClientRect();return {txt:(e.innerText||'').slice(0,400),go:rr.width>2&&rr.height>2&&rr.bottom<=innerHeight+0.5};});
    const n0=await sess(b,'st_delete');
    L.say(!!t1&&!!conf&&conf.go&&!n0,'TC-R213d DENOMINATOR tapping it opens a confirm with its Delete button on screen, and nothing is deleted yet ('+(n0||0)+' calls)',{conf,n0});
    const t2=conf&&await tap(b,'[data-ct="acct-delete-go"]');await afterReload(b);
    const n1=await sess(b,'st_delete');const s=await store(b,WIPED.concat(KEPT));
    L.say(!!t2&&n1===1,'TC-R213d confirming calls CTCloud.deleteAccount exactly once ('+n1+')',n1);
    L.say(gone(s).length===0&&KEPT.every(k=>s[k]==='3'||s[k]==='0'),'TC-R213d and the device\'s synced data is gone afterwards while its settings stay',s);await b.close();}
  // (e) the cloud half
  {const src=fs.readFileSync(IDX,'utf8');const body=liftDelete(src);
    L.say(!!body,'TC-R213e DENOMINATOR index.html under test ('+path.basename(IDX)+') defines C._deleteAccount',{len:body?body.length:0});
    if(body){const r=await runDelete(body,FOOT,false);const D=r.D;const ops=r.log.map(x=>x.join(' '));
      const gone=['users/u-me','mm/u-me','nearby/u-me','friendReqs/R1','friendReqs/R2','friends/F1','tournaments/T1','customers/u-me/checkout_sessions/S1','games/G2','games/G1/call/signal'];
      const kept=['mm/u-op','nearby/u-op','friendReqs/R3','friends/F2','tournaments/T2','games/G1','games/G3'];
      L.say(!r.err&&ops[0]==='reauth'&&ops[ops.length-1]==='deleteUser','TC-R213e Google confirms identity FIRST and the Auth user is deleted LAST ('+ops[0]+' ... '+ops[ops.length-1]+(r.err?', error '+r.err:'')+')',{err:r.err,first:ops[0],last:ops[ops.length-1]});
      L.say(gone.every(p=>!D.has(p)),'TC-R213e every document keyed to the player is deleted: '+gone.filter(p=>D.has(p)).length+' of '+gone.length+' left',gone.filter(p=>D.has(p)));
      L.say(kept.every(p=>D.has(p)),'TC-R213e and nobody else\'s is: '+kept.filter(p=>!D.has(p)).length+' of '+kept.length+' removed',kept.filter(p=>!D.has(p)));
      const g1=D.get('games/G1')||{};const t2=D.get('tournaments/T2')||{};
      L.say(g1.w&&g1.w.uid==='u-me'&&g1.w.name==='Deleted player'&&!g1.w.photo&&Array.isArray(g1.chat)&&g1.chat.length===1&&g1.chat[0].uid==='u-op','TC-R213e the started game keeps its record with this seat scrubbed (name, photo) and only this player\'s chat removed',{w:g1.w,chat:g1.chat});
      L.say(Array.isArray(t2.players)&&t2.players.length===1&&t2.players[0].uid==='u-op','TC-R213e another host\'s tournament loses only this player\'s entry',t2.players);
      const r2=await runDelete(body,FOOT,true);const muts=r2.log.filter(x=>/^(delete|update|set|deleteUser)$/.test(x[0]));
      L.say(r2.err==='auth/popup-closed-by-user'&&muts.length===0,'TC-R213e with the Google confirmation closed nothing is deleted ('+muts.length+' writes, error '+r2.err+')',{err:r2.err,muts});}}
  // (f) sign out, box ticked by default
  {const b=await launch('signout-wipe',SEED,{uid:'u-me'});const ok=await openSheet(b);const r=await READ(b);
    const t1=r.out&&await tap(b,'[data-ct="acct-signout"]');await b.settle(400);
    const box=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="acct-signout-wipe"]');return e?{checked:e.checked}:null;});
    L.say(ok&&!!t1&&!!box&&box.checked===true,'TC-R213f DENOMINATOR Sign out opens a confirm whose "Remove my data from this device" box is ticked by default',{ok,out:r.out,box});
    const t2=box&&await tap(b,'[data-ct="acct-signout-go"]');await afterReload(b);
    const n=await sess(b,'st_signout');const s=await store(b,WIPED.concat(KEPT));
    L.say(!!t2&&n===1,'TC-R213f confirming signs out ('+n+' signOut calls)',n);
    L.say(gone(s).length===0,'TC-R213f the synced keys, linked usernames and puzzle progress are gone after sign-out: '+(gone(s).join(', ')||'none')+' left',s);
    L.say(s.ct_theme==='3'&&s.ct_sound==='0','TC-R213f and the device\'s own settings stay (theme, sound)',s);await b.close();}
  // (g) unticked keeps
  {const b=await launch('signout-keep',SEED,{uid:'u-me'});await openSheet(b);const r=await READ(b);
    const t1=r.out&&await tap(b,'[data-ct="acct-signout"]');await b.settle(400);
    const un=t1&&await tap(b,'[data-ct="acct-signout-wipe"]');await b.settle(200);
    const t2=un&&await tap(b,'[data-ct="acct-signout-go"]');await b.settle(1500);const s=await store(b,WIPED);const n=await sess(b,'st_signout');
    L.say(!!t2&&n===1&&gone(s).length===WIPED.length,'TC-R213g with the box unticked, signing out keeps this device\'s data',{t2,n,s});await b.close();}
  // (h) a different account starts clean
  {const b=await launch('owner-stamp',Object.assign({},SEED,{ct_owner:'u-someone-else'}),{uid:'u-me'});await afterReload(b);
    const s=await store(b,WIPED.concat(['ct_owner']));const saves=(await sess(b,'st_saves'))||[];const leaked=saves.filter(x=>OLD.test(x));
    L.say(s.ct_owner==='u-me'&&gone(s).length===0,'TC-R213h a different account signing in on a device stamped for another uid starts clean (ct_owner '+s.ct_owner+')',s);
    L.say(leaked.length===0,'TC-R213h and none of the '+saves.length+' saves to the new account carries the old player\'s data',leaked.slice(0,2));
    L.say(b.errs.length===0,'TC-R213 zero app errors across sign-in, sign-out and deletion',b.errs.slice(0,3));await b.close();}
},'137-no-browser-pro-switch');
// SELECTOR-OPENED: acct-delete reading=presence round 4: TC-R213d needs Delete account in the sheet
// SELECTOR-OPENED: acct-delete-confirm reading=presence round 4: the DENOMINATOR needs the confirm and its button
// SELECTOR-OPENED: acct-delete-go reading=presence round 4: the DENOMINATOR needs the button on screen and the tap to land
// SELECTOR-OPENED: acct-signout reading=presence round 4: TC-R213f's DENOMINATOR needs the tap to land
// SELECTOR-OPENED: acct-signout-go reading=presence round 4: TC-R213f and g need the confirm tap to land
// SELECTOR-OPENED: acct-signout-wipe reading=presence round 4: the DENOMINATOR needs the box ticked
