'use strict';
// gates/regress/90-full-screen.js - THE SHELL PAINTS THE WHOLE SCREEN. TC-INV-14a..e, US-INV-09.
//
// WHY [#550, item (1) of directOpening_2026_11_11_batch10;
// jobs/a-51-point-strip-at-the-bottom-of-every-page-is-never-painted-on-kunals-phone-2026-11-11]. Kunal, about 12:46am EST
// Wed 11 Nov 2026, with a screenshot: a plain strip about 51pt tall at the bottom of nearly every page. His phone is a
// 375x812 screen and the installed app is handed a 375x761 page (R19): with a black-translucent status bar iOS draws the
// page from the top of the screen and reports a layout viewport short by the status bar's height. html, body, #root and
// every position:fixed inset:0 layer took the 761, so the last 51pt were never painted, and the tab bar, sitting 51pt
// above the bottom edge, still added the 31pt home-indicator inset on top. No gate saw it because Chromium, given a
// 375x812 viewport, paints all 812: every suite geometry has screen == page.
//
// HOW THIS GATE GETS THE PHONE'S CONDITION IN CHROMIUM. The page is 375x761 (lib's kunal761: ct_safe 51,31) and
// window.screen is 375x812 (lib's new `screen` option), so screen and page differ by exactly the top inset, which is the
// installed-app signature index.html looks for. Chromium is never an installed app, so ct_fullh=1 stands in for
// navigator.standalone. CSS env(safe-area-inset-*) reads 51/31 through Emulation.setSafeAreaInsetsOverride, as gate 77
// does, so the tab bar's own `calc(6px + env(safe-area-inset-bottom))` is the real one. Painted below 761 here is off the
// emulator's viewport, so this gate reads RECTS (the boxes the phone paints into), never elementFromPoint.
//
// KNOW ITS LIMIT. It proves the shell sizes itself to the screen whenever the signature holds and only then. It cannot
// prove iOS paints those 51pt - that is his phone check of gallery card 'full screen' after the landing (the job's
// whatIsLeft), because no rig in this container renders an installed iOS app.
const L=require('../lib');

const FULL={w:375,h:812};
async function shot(b){return b.page.evaluate(()=>{
  const R=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,h:Math.round(r.height*10)/10};};
  const home=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  const tb=document.querySelector('[data-ct="tabbar"]');
  return {cls:document.documentElement.classList.contains('ct-fullh'),full:window.__ctFullH||0,inner:innerHeight,scr:screen.height,
    html:R(document.documentElement),body:R(document.body),root:R(document.getElementById('root')),home:R(home),tab:R(tb),
    tabPadB:tb?parseFloat(getComputedStyle(tb).paddingBottom):null};});}
async function open(c){
  const b=await L.launch({geo:'kunal761',screen:c.screen,store:Object.assign({},c.store||{}),name:c.name});
  const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:51,bottom:31,left:0,right:0}});
  await b.open();return b;
}

(async()=>{
  // ── A: the installed-app signature. Home first, then a tab screen.
  {
    const b=await open({name:'installed',screen:FULL,store:{ct_fullh:'1'}});
    let s=await shot(b);
    L.say(s.inner===761&&s.scr===812,'TC-INV-14a the emulator reproduces his condition: a 761 page on an 812 screen',{inner:s.inner,screen:s.scr});
    L.say(s.cls&&s.full===812,'TC-INV-14b the shell detects the installed-app signature (screen less page equals the 51 top inset) and takes the screen height',{cls:s.cls,full:s.full});
    L.say(!!s.body&&s.body.top===0&&s.body.bottom===812&&!!s.root&&s.root.bottom===812,'TC-INV-14c body and #root run from 0 to 812, the bottom of his screen, not to 761',{body:s.body,root:s.root});
    L.say(!!s.home&&s.home.top===0&&s.home.bottom===812,'TC-INV-14c Home (the fixed inset:0 layer) paints to 812: the bottom 51pt band is no longer left unpainted',{home:s.home});
    // a tab screen: Discover via its Home tile
    let reached=false;try{await b.tapText(/^Discover$/);await b.settle(700);s=await shot(b);reached=!!s.tab&&!s.home;}catch(e){}
    L.say(reached,'TC-INV-14d a tab screen was reached (Discover, the tab bar mounted and Home gone) - the denominator for the tab bar reading',{tab:s.tab,home:s.home});
    L.say(reached&&s.tab.bottom===812,'TC-INV-14d the tab bar sits on the bottom edge of the screen (812), not 51pt above it',{tab:s.tab});
    L.say(reached&&Math.abs(s.tabPadB-37)<0.6&&Math.abs((812-s.tab.bottom))<0.6,'TC-INV-14d the home-indicator inset is counted once: 6 + 31 of padding at the screen edge, with no 51pt band under the bar',{padB:s.tabPadB,under:reached?812-s.tab.bottom:null});
    await b.browser.close();
  }
  // ── B: the guard. Anything that is not exactly that signature keeps the page height, so no other device changes.
  {
    const b=await open({name:'tab',screen:FULL,store:{}});   // a Safari tab: not installed
    const s=await shot(b);
    L.say(!s.cls&&s.full===0&&!!s.body&&s.body.bottom===761&&!!s.home&&s.home.bottom===761,'TC-INV-14e a browser tab (not installed) on the same screen keeps the 761 page: the class is absent and nothing is resized',{cls:s.cls,body:s.body,home:s.home});
    await b.browser.close();
  }
  {
    const b=await open({name:'gap-not-inset',screen:{w:375,h:900},store:{ct_fullh:'1'}});   // installed, but short by 139, not by the 51 inset
    const s=await shot(b);
    L.say(!s.cls&&s.full===0&&!!s.body&&s.body.bottom===761,'TC-INV-14e an installed app whose page is short by something other than the top inset (139 here) is left alone',{cls:s.cls,body:s.body});
    await b.browser.close();
  }
  {
    const b=await open({name:'same-size',screen:{w:375,h:761},store:{ct_fullh:'1'}});   // installed, screen == page: every other phone
    const s=await shot(b);
    L.say(!s.cls&&!!s.body&&s.body.bottom===761&&!!s.home&&s.home.bottom===761,'TC-INV-14e an installed app whose page already equals its screen is unchanged',{cls:s.cls,body:s.body,home:s.home});
    await b.browser.close();
  }
  L.done('90-full-screen');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('90-full-screen');});
