'use strict';
// gates/regress/171-signin-home-screen.js - SIGN IN WITH GOOGLE FROM THE HOME SCREEN ICON NEVER ENDS IN SILENCE. US-R165 / TC-R236a..h.
//
// WHY [batch 13, jobs/sign-in-with-google-does-nothing-from-the-ipad-home-screen-icon-2026-11-18; Kunal, Mon 16 Nov 2026: "I'm trying to
// sign in on my ipad using the google accout. it doesn't do anything", opened from the Home Screen icon]. index.html signs an app opened
// from the Home Screen icon in by REDIRECT (since c63218bc, June 2026; the path his iPhone takes too) and read the result with
// `getRedirectResult(auth).catch(function(){})`: a redirect that came back with no account - what Firebase documents for Safari when the
// sign-in helper (chess-trainer-d3664.firebaseapp.com) is on another site than the app (learntocheckmate.github.io) - or with an error
// changed nothing on screen and the next tap went round the same redirect again. The fix: the redirect leaves a mark, the start-up read of
// the result checks it, a failed return is SAID (CTCloud.onSignInIssue -> the menu's sign-in line), and the next tap uses the pop-up.
// HOW: Firebase cannot be reached from this sandbox, so the four Firebase modules index.html imports from www.gstatic.com are answered here
// with small stand-ins (routed in the browser; the CSP still sees www.gstatic.com). The auth stand-in RECORDS every call (popup, redirect,
// getRedirectResult) in window.__ctAuthCalls and answers from a plan in localStorage __ct_authplan, so one launch can tap, "come back from
// the redirect" (a reload with the plan's redirect result) and tap again. Display mode is emulated before the page's scripts run:
// navigator.standalone true and matchMedia('(display-mode: standalone)') matching (the two things index.html reads), or neither (a tab).
// WHAT IT ASSERTS, per geometry (kunal761, se, and ipad 820x1180 for the Home Screen journey; kunal761 for the rest):
//  (a) TC-R236a Home Screen, first tap: the REDIRECT is called and the pop-up is not (the path his iPhone takes, unchanged; preserved,
//      named not credited), and TC-R236a2 the redirect mark is left in localStorage.
//  (b) TC-R236b back from a redirect that brought no account: getRedirectResult is called at start-up with no tap, and TC-R236c the menu's
//      sign-in line says sign-in did not come back to the app (the old build: nothing).
//  (c) TC-R236d the next tap calls the POP-UP and not the redirect (the old build: the redirect again), and TC-R236e the pop-up's account
//      signs the app in (the menu shows the account's name).
//  (d) TC-R236f back from a redirect that brought an ERROR: the line says sign-in did not finish and names the service's code.
//  (e) TC-R236g back from a redirect that brought the account: signed in, no message, no pop-up (preserved, named not credited).
//  (f) TC-R236h after a failed redirect, a pop-up that closes before it finished says so (the old build had no second route at all).
//  (g) TC-R236i a Safari TAB: the first tap calls the pop-up; a pop-up closed early falls back to the redirect, as before (preserved, named
//      not credited); TC-R236j a tab's pop-up that succeeds signs in with no redirect.
// KNOW ITS LIMIT: the real Google and Firebase round trip, Safari's storage partitioning and what iPadOS does with a pop-up opened from a Home
// Screen app are NOT exercised - no browser here is WebKit on an iPad. What this proves is which sign-in method the app calls in each display
// mode, that a redirect's return is read at start-up and a failed one is said, and that the second route is the pop-up. His check on his
// iPad from the Home Screen icon is what proves the round trip.
// CONTROL-RECORD: ee291588 2026-11-19 total=31 red=14 scope=shipped:dd8b009fc3f8 how=batch 13, the tree before the fix: ee291588's index.html served with its committed app.js (#551): TC-R236a2, c, d, e red at all three sizes (no mark; the sign-in line empty after the empty return; the second tap the redirect again, so no account), f and h red at kunal761 (the error and the closed window both silent); TC-R236a, g, i, j and the zero-errors lines stay green there by design (the redirect-first Home Screen path, a successful return and the Safari tab are what the fix keeps - named, not credited); on the fix's trial 933e06068a31 31/0
// CONTROL-RECORD: bb094f75 2026-11-19 total=23 red=11/7/4 scope=pairs how=batch 13, gates/pairs/jobs/sign-in-with-google-...-2026-11-18.json on bb094f75 (graded lines only, kunal761 11, se 6, ipad 6): redirect-return-swallowed 5+3+3 FAIL (7daf04f8149e), home-screen-always-redirects 3+2+2 (55a8c5bf6e1c), app-never-hears-the-return 2+1+1 (5e46668f1dc4); real a0577d4fcfe6 23/0 - CHECKED
const L=require('../lib');
const GS='https://www.gstatic.com/firebasejs/10.12.2/';
const STUB={
  'firebase-app.js':'export function initializeApp(c){return {options:c};}',
  'firebase-functions.js':'export function getFunctions(){return {};} export function httpsCallable(){return async function(){return {data:null};};}',
  'firebase-firestore.js':['getFirestore','doc','collection','query','where','arrayUnion','arrayRemove'].map(n=>'export function '+n+'(){return {};}').join('\n')+'\n'+
    'export async function getDoc(){return {exists(){return false;},data(){return null;}};}\nexport async function getDocs(){return {docs:[],empty:true,forEach(){}};}\n'+
    ['setDoc','updateDoc','addDoc','deleteDoc','runTransaction'].map(n=>'export async function '+n+'(){return null;}').join('\n')+'\nexport function onSnapshot(){return function(){};}',
  'firebase-auth.js':`
const P=(()=>{try{return JSON.parse(localStorage.getItem('__ct_authplan')||'{}');}catch(e){return {};}})();
const calls=window.__ctAuthCalls=[];const subs=[];
const A={currentUser:null,authStateReady(){return Promise.resolve();}};
const USER={uid:'u-gate-171',displayName:'Gate Ipad',email:'gate171@example.test',photoURL:null,getIdToken(){return Promise.resolve('t');}};
function signedIn(){A.currentUser=USER;subs.forEach(cb=>{try{cb(USER);}catch(e){}});return {user:USER};}
export function getAuth(){return A;}
export class GoogleAuthProvider{setCustomParameters(p){this.p=p;}}
export function signInWithPopup(){calls.push('popup');const r=P.popup||'ok';if(r==='ok')return Promise.resolve(signedIn());return Promise.reject({code:r});}
export function signInWithRedirect(){calls.push('redirect');return new Promise(()=>{});}
export function getRedirectResult(){calls.push('getRedirectResult');const r=P.redirect||'none';
  if(r==='user')return Promise.resolve(signedIn());if(r==='none'||r==='empty')return Promise.resolve(null);return Promise.reject({code:r});}
export function onAuthStateChanged(a,cb){subs.push(cb);setTimeout(()=>{try{cb(A.currentUser);}catch(e){}},0);return ()=>{};}
export async function signOut(){A.currentUser=null;subs.forEach(cb=>cb(null));}
export async function reauthenticateWithPopup(){} export async function deleteUser(){}
`};
async function launch(geo,mode,name){
  const b=await L.launch({geo,name});
  await b.ctx.route(u=>u.href.startsWith(GS),r=>{const f=r.request().url().slice(GS.length);const body=STUB[f];
    return body!=null?r.fulfill({status:200,contentType:'application/javascript',body}):r.abort();});
  await b.ctx.addInitScript((m)=>{if(m!=='standalone')return;try{Object.defineProperty(Navigator.prototype,'standalone',{configurable:true,get(){return true;}});}catch(e){}
    const mm=window.matchMedia.bind(window);window.matchMedia=function(q){if(/display-mode:\s*standalone/.test(String(q)))return {matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},onchange:null,dispatchEvent(){return false;}};return mm(q);};},mode);
  return b;
}
const plan=(b,p)=>b.page.evaluate((p)=>localStorage.setItem('__ct_authplan',JSON.stringify(p)),p);
const calls=(b)=>b.page.evaluate(()=>(window.__ctAuthCalls||[]).slice());
const mark=(b)=>b.page.evaluate(()=>localStorage.getItem('ct_signin_redirect'));
const via=(b)=>b.page.evaluate(()=>window.CTCloud&&window.CTCloud._signInVia);
async function openSheet(b){try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);return true;}catch(e){L.note('open sheet: '+String(e).slice(0,120));return false;}}
async function closeSheet(b){try{await b.page.keyboard.press('Escape');}catch(e){}await b.settle(300);}
// the BUTTON, never the message: after a failed return the sign-in line itself reads "Tap Sign in with Google again", and a smallest-element
// text match picks that line on a wide screen (measured at 820x1180 on the first run of this gate)
async function tapSignIn(b){try{await b.page.locator('button:visible',{hasText:/^\s*(G\s*)?Sign in with Google\s*$/}).first().click({timeout:3000});await b.settle(700);return true;}catch(e){L.note('sign-in tap: '+String(e).slice(0,120));return false;}}
const text=(b)=>b.page.evaluate(()=>document.body.innerText||'');
async function reloadBack(b){await b.page.reload({waitUntil:'domcontentloaded'});
  await b.page.waitForFunction(()=>{const r=document.getElementById('root');return r&&r.children.length&&!document.getElementById('boot');},null,{timeout:30000});await b.settle(1200);}
const RE_EMPTY=/Sign-in did not come back to the app\. Tap Sign in with Google again/;
const ONLY=(process.env.CT_171_BLOCKS||'').split(',').filter(Boolean);const on=(x)=>!ONLY.length||ONLY.indexOf(x)>=0;
const GEOS=[['kunal761','kunal761'],['se','se'],['ipad',{w:820,h:1180,safe:'',label:'820x1180 iPad (portrait)'}]];
L.run(async()=>{
  if(ONLY.length)L.note('CT_171_BLOCKS='+ONLY.join(',')+': a SUBSET of this gate ran');
  // (a)-(c) the Home Screen journey, at every geometry
  if(on('a'))for(const [gn,geo] of GEOS){
    const b=await launch(geo,'standalone','g171-'+gn);await b.open();await plan(b,{redirect:'none'});
    const v0=await via(b);L.note(gn+' Home Screen: the bridge reads display mode as '+JSON.stringify(v0));
    let so=await openSheet(b),t1=so&&await tapSignIn(b);const c1=await calls(b),m1=await mark(b);
    // the method is read from the calls the stand-in recorded, never from the bridge's own _signInVia (a hook this build adds: a check that
    // read it could not see the old build at all)
    L.say(t1&&c1.indexOf('redirect')>=0&&c1.indexOf('popup')<0,gn+' TC-R236a Home Screen first tap calls the redirect, not the pop-up - the path his iPhone takes, unchanged (calls '+JSON.stringify(c1)+') [preserved: named, not credited]',{c1,v0});
    L.say(!!m1&&Math.abs(Date.now()-Number(m1))<120000,gn+' TC-R236a2 the redirect leaves its mark for the return (ct_signin_redirect '+JSON.stringify(m1)+')',m1);
    // come back from Google with nothing: the reload is the redirect's return
    await plan(b,{redirect:'empty',popup:'ok'});await reloadBack(b);
    const c2=await calls(b);
    L.say(c2.indexOf('getRedirectResult')>=0&&c2.indexOf('redirect')<0&&c2.indexOf('popup')<0,gn+' TC-R236b back from the redirect, getRedirectResult is read at start-up with no tap (calls '+JSON.stringify(c2)+')',c2);
    so=await openSheet(b);const tx=so?await text(b):'';const mm=(tx.match(/Sign-in did not[^\n]*|The sign-in window[^\n]*/)||[''])[0];
    L.say(so&&RE_EMPTY.test(tx),gn+' TC-R236c a redirect that came back with no account is said on the sign-in line ("'+mm.slice(0,110)+'")',{so,mm});
    const t3=so&&await tapSignIn(b);const c3=await calls(b);const tx3=await text(b);
    L.say(t3&&c3.filter(x=>x==='popup').length===1&&c3.indexOf('redirect')<0,gn+' TC-R236d the next tap calls the pop-up, not the redirect again (calls '+JSON.stringify(c3)+')',c3);
    L.say(/Gate Ipad/.test(tx3),gn+' TC-R236e the pop-up\'s account signs the app in (name on screen: '+/Gate Ipad/.test(tx3)+')');
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
  }
  if(on('b')){ // (d) the redirect came back with an error
    const b=await launch('kunal761','standalone','g171-err');await b.open();await plan(b,{redirect:'none'});
    await openSheet(b);const t1=await tapSignIn(b);await plan(b,{redirect:'auth/internal-error'});await reloadBack(b);
    await openSheet(b);const tx=await text(b);const mm=(tx.match(/Sign-in did not[^\n]*/)||[''])[0];
    L.say(t1&&/Sign-in did not finish\..*\(auth\/internal-error\)/.test(tx),'kunal761 TC-R236f a redirect that came back with an error says sign-in did not finish and names the code ("'+mm.slice(0,110)+'")',mm);
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
  }
  if(on('c')){ // (e) the redirect came back with the account: preserved
    const b=await launch('kunal761','standalone','g171-ok');await b.open();await plan(b,{redirect:'none'});
    await openSheet(b);const t1=await tapSignIn(b);await plan(b,{redirect:'user'});await reloadBack(b);
    const c=await calls(b);await openSheet(b);const tx=await text(b);
    L.say(t1&&/Gate Ipad/.test(tx)&&!/Sign-in did not|The sign-in window/.test(tx)&&c.indexOf('popup')<0,'kunal761 TC-R236g a redirect that came back with the account signs in with no message and no pop-up (calls '+JSON.stringify(c)+') [preserved: named, not credited]',c);
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
  }
  if(on('d')){ // (f) after a failed redirect, the pop-up is closed early
    const b=await launch('kunal761','standalone','g171-closed');await b.open();await plan(b,{redirect:'none'});
    await openSheet(b);await tapSignIn(b);await plan(b,{redirect:'empty',popup:'auth/popup-closed-by-user'});await reloadBack(b);
    await openSheet(b);const t2=await tapSignIn(b);const c=await calls(b);const tx=await text(b);const mm=(tx.match(/The sign-in window[^\n]*|Sign-in did not[^\n]*/)||[''])[0];
    L.say(t2&&c.indexOf('popup')>=0&&/The sign-in window closed before sign-in finished/.test(tx),'kunal761 TC-R236h after a failed redirect, a pop-up closed early says so (calls '+JSON.stringify(c)+', "'+mm.slice(0,100)+'")',{c,mm});
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
  }
  if(on('e')){ // (g) a Safari tab: unchanged
    let b=await launch('kunal761','tab','g171-tab');await b.open();await plan(b,{popup:'auth/popup-closed-by-user'});await reloadBack(b);
    await openSheet(b);const t1=await tapSignIn(b);const c=await calls(b);const v=await via(b);
    L.say(t1&&c.indexOf('popup')>=0&&c.indexOf('redirect')>c.indexOf('popup'),'kunal761 TC-R236i a Safari tab calls the pop-up first and falls back to the redirect when it closes early (via '+v+', calls '+JSON.stringify(c)+') [preserved: named, not credited]',{c,v});
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
    b=await launch('kunal761','tab','g171-tab2');await b.open();await plan(b,{popup:'ok'});await reloadBack(b);
    await openSheet(b);const t2=await tapSignIn(b);const c2=await calls(b);const tx=await text(b);
    L.say(t2&&c2.indexOf('popup')>=0&&c2.indexOf('redirect')<0&&/Gate Ipad/.test(tx),'kunal761 TC-R236j a Safari tab\'s pop-up signs in with no redirect (calls '+JSON.stringify(c2)+')',c2);
    L.say(b.errs.length===0,b.name+' TC-R236 zero app errors',b.errs.slice(0,3));await b.close();
  }
},'171-signin-home-screen');
