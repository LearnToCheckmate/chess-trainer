'use strict';
// gates/regress/167-pro-owner-grant.js - KUNAL'S OWN ACCOUNT GETS PRO WITHOUT PAYING, FROM A GRANT ONLY THE FIREBASE CONSOLE CAN WRITE.
// TC-R230a..g / US-R160. #551 batch 12, jobs/kunals-own-account-gets-pro-without-paying-2026-11-17
// (decisions/kunals-own-account-gets-pro-without-paying-2026-11-17: his "yes" at about 10:02am EST Tue 17 Nov 2026).
//
// WHAT IT READS, in plain Node with no browser and no network: index.html's CTCloud bridge function C._proWatch, lifted out of the
// file by balanced braces and run against stand-ins for auth.currentUser, onSnapshot, collection and doc that record what is
// listened to and let the gate push snapshots; and the two source files for what may WRITE a grant (nothing). The Firestore rules
// themselves are proven by the emulator test in rules-test/firestore.rules.test.js ('ownerGrants: ...'), which the grading machine
// runs (gates/pairs/jobs/kunals-own-account-gets-pro-without-paying-2026-11-17.json); this gate also checks the rule's text.
// KNOW ITS LIMIT: whether his phone opens Pro once he adds his grant is his phone check after the landing (docs/run-questions).
const L=require('../lib');const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..','..');
const HTML=fs.readFileSync(process.env.CT_HTML_SRC||path.join(ROOT,'index.html'),'utf8');
const RULES=fs.readFileSync(process.env.CT_RULES_SRC||path.join(ROOT,'firestore.rules'),'utf8');
const JSX=fs.readFileSync(path.join(ROOT,'chess.jsx'),'utf8');
function lift(src,head){const i=src.indexOf(head);if(i<0)return null;let j=src.indexOf('{',i+head.length),d=0;for(let k=j;k<src.length;k++){const c=src[k];if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,k+1);}}return null;}
L.run(async()=>{
  const fnSrc=lift(HTML,'C._proWatch = function(cb)');
  L.say(!!fnSrc,'TC-R230 PRECONDITION index.html carries the bridge function C._proWatch',fnSrc&&fnSrc.slice(0,80));
  if(!fnSrc)return;
  // a stand-in Firestore: each onSnapshot records its target and hands back a pusher; unsubscribing is recorded
  const mk=(uid)=>{const lis=[];const env={auth:{currentUser:uid?{uid}:null},db:{},lis,
      collection:(db,...p)=>({kind:'col',path:p.join('/')}),doc:(db,...p)=>({kind:'doc',path:p.join('/')}),
      onSnapshot:(ref,ok,bad)=>{const l={ref,ok,bad,off:false};lis.push(l);return ()=>{l.off=true;};}};
    const C={};const f=new Function('C','auth','db','onSnapshot','collection','doc','let _psub=null;'+fnSrc+';return C;');f(C,env.auth,env.db,env.onSnapshot,env.collection,env.doc);env.C=C;return env;};
  const subSnap=(statuses)=>({forEach:(fn)=>statuses.forEach(s=>fn({data:()=>({status:s})}))});
  const grantSnap=(data)=>({exists:()=>data!==undefined,data:()=>data});
  const watch=(env)=>{const got=[];const un=env.C._proWatch(v=>got.push(v));return {got,un};};
  // a listener the bridge never opened answers nothing, so a bridge without the grant read fails these checks instead of throwing
  const NONE={ok(){},bad(){},ref:{path:undefined},off:true};
  const sub=env=>env.lis.find(l=>l.ref.kind==='col')||NONE,grant=env=>env.lis.find(l=>l.ref.kind==='doc')||NONE;
  // TC-R230a: what is listened to
  {const e=mk('u-k');watch(e);
   L.say(sub(e).ref.path==='customers/u-k/subscriptions','TC-R230a the subscription is still read from customers/{uid}/subscriptions ('+sub(e).ref.path+')');
   L.say(grant(e).ref.path==='ownerGrants/u-k','TC-R230a and the owner grant is read from ownerGrants/{uid}, the signed-in account\'s own document ('+grant(e).ref.path+')');}
  // TC-R230b: the answers, one case per row - [what the subscription says, what the grant says, the answer]
  const CASES=[
    ['no subscription, no grant document',[],undefined,false],
    ['an active subscription, no grant (unchanged: a subscriber has Pro)',['active'],undefined,true],
    ['a trialing subscription, no grant (unchanged)',['trialing'],undefined,true],
    ['a cancelled subscription, no grant (unchanged: no Pro)',['canceled'],undefined,false],
    ['no subscription, a grant {pro: true}',[],{pro:true},true],
    ['no subscription, a grant {pro: false}',[],{pro:false},false],
    ['no subscription, a grant {pro: "true"} (a string is not a grant)',[],{pro:'true'},false],
    ['no subscription, a grant {pro: 1} (a number is not a grant)',[],{pro:1},false],
    ['no subscription, a grant document with no pro field',[],{note:'x'},false],
    ['an active subscription and a grant {pro: true}',['active'],{pro:true},true]];
  for(const [name,st,g,want] of CASES){const e=mk('u-k');const w=watch(e);sub(e).ok(subSnap(st));grant(e).ok(grantSnap(g));const last=w.got[w.got.length-1];
    L.say(last===want,'TC-R230b '+name+': Pro reads '+last+' (must be '+want+')',{answers:w.got});}
  // TC-R230c: a grant that cannot be read is no grant; a subscription read error is no subscription; both are answered, never silent
  {const e=mk('u-k');const w=watch(e);sub(e).ok(subSnap([]));grant(e).bad(new Error('permission-denied'));L.say(w.got.length>0&&w.got[w.got.length-1]===false,'TC-R230c a grant read that fails (rules not yet published, offline) reads as no grant: Pro '+w.got[w.got.length-1],w.got);}
  {const e=mk('u-k');const w=watch(e);grant(e).ok(grantSnap({pro:true}));sub(e).bad(new Error('offline'));L.say(w.got[w.got.length-1]===true,'TC-R230c and a subscription read that fails does not take away a grant: Pro '+w.got[w.got.length-1],w.got);}
  // TC-R230d: the answer follows changes either way
  {const e=mk('u-k');const w=watch(e);sub(e).ok(subSnap([]));grant(e).ok(grantSnap(undefined));const a0=w.got[w.got.length-1];grant(e).ok(grantSnap({pro:true}));const a1=w.got[w.got.length-1];grant(e).ok(grantSnap({pro:false}));const a2=w.got[w.got.length-1];
   L.say(a0===false&&a1===true&&a2===false,'TC-R230d Pro follows the grant as it is added in the console and taken away again (false, true, false: read '+[a0,a1,a2].join(', ')+')',w.got);}
  // TC-R230e: signed out, and the unsubscribe
  {const e=mk(null);const w=watch(e);L.say(w.got.length===1&&w.got[0]===false&&e.lis.length===0,'TC-R230e signed out: Pro is false at once and nothing is listened to',{got:w.got,listeners:e.lis.length});}
  {const e=mk('u-k');const w=watch(e);if(typeof w.un==='function')w.un();L.say(e.lis.length===2&&e.lis.every(l=>l.off),'TC-R230e the unsubscribe the bridge returns stops BOTH listeners',e.lis.map(l=>({path:l.ref.path,off:l.off})));}
  // TC-R230f: nothing in the app can turn Pro on - no client code writes a grant, and no new key, flag or address reaches it
  {const writes=[];for(const [f,src] of [['index.html',HTML],['chess.jsx',JSX]]){const re=/(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction)\s*\([^;]*ownerGrants/g;let m;while((m=re.exec(src)))writes.push(f+': '+m[0].slice(0,80));}
   const reads=(HTML.match(/ownerGrants/g)||[]).length,jsx=(JSX.match(/ownerGrants/g)||[]).length;
   L.say(writes.length===0,'TC-R230f no client code writes an owner grant (setDoc, updateDoc, addDoc, deleteDoc, a batch or a transaction naming ownerGrants: '+writes.length+')',writes);
   L.say(jsx===0&&reads>=1,'TC-R230f the app itself never names ownerGrants (chess.jsx: '+jsx+'); only the bridge\'s read in index.html does ('+reads+' mentions, the read and its comment)',{jsx,reads});
   const keyReads=(HTML+JSX).match(/getItem\(\s*['"](ct_pro|ct_protest|ct_owner_pro|ct_grant)['"]|[?&]pro=|searchParams\.get\(\s*['"]pro['"]/g)||[];
   L.say(keyReads.length===0,'TC-R230f and no browser key or address turns Pro on (reads of ct_pro, ct_protest, ct_owner_pro, ct_grant, ?pro= or a pro URL parameter: '+keyReads.length+')',keyReads);}
  // TC-R230g: the rule's text (the emulator test is the proof; this is the line a reader looks for)
  {const blk=lift(RULES,'match /ownerGrants/{uid}');
   L.say(!!blk&&/allow get: if signedIn\(\) && me\(\) == uid;/.test(blk)&&/allow list, create, update, delete: if false;/.test(blk)&&!/allow (read|write)\b/.test(blk),'TC-R230g firestore.rules: ownerGrants/{uid} is readable by its signed-in owner only and no client may list, create, update or delete it',blk);}
},'167-pro-owner-grant');
