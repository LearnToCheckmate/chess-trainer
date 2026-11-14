'use strict';
// gates/regress/162-tab-switch-menu-holds.js - THE MENU BUTTON DOES NOT MOVE WHEN THE PLAYER SWITCHES BETWEEN HOME AND THE TABS. TC-R219j..k, US-R151.
//
// WHY [#550 helper B; jobs/movement-check-2026-11-12, whatIsLeft "MOV-08 and MOV-09"; docs/movement-check-2026-11-12 MOV-09: "the Menu and
// settings button moves 2 px vertically on a tab switch ... (use the same top padding on every tab's header)"]. MEASURED on the tip before
// this change (trial 7edf52c583ef): Home's menu sat at y 15, 260 from the left at 375 (205 at 320), every tab screen's at y 2, 323 (268) -
// so it jumped 13px down and 63px left on every switch between Home and a tab. MOV-08 (the puzzle back button changing width on Hint) was
// already gone: the back is the 44x44 corner button in both states (8,2,44x44 before and after Hint), measured by the same probe.
// WHAT IT ASSERTS at kunal761, 320x568 and 390x844: Home -> Puzzles -> Review -> Discover -> Home -> Review -> Home, each switch made by a tap
// (the tab bar, or Home's tile), and the visible, hit-testable 'Menu and settings' button's rect read on EVERY animation frame for 1 s after
// it:
//  TC-R219j DENOMINATOR every screen shows exactly one hit-testable menu button on every sampled frame.
//  TC-R219k across all screens and frames the menu's rect is ONE rect (left, top, width, height within 0.5).
//  TC-R219l on Home the account button sits beside it on the same row, not overlapping it, and on screen.
// CONTROL-RECORD: 54d9a51 2026-11-14 total=13 red=3 scope=trial:7edf52c583ef how=#550 helper B: the tree before the change (54d9a51's chess.jsx, built as m2) - TC-R219k red at all three sizes (Home 260/15 against the tabs' 323/2 at 375, 205/15 against 268/2 at 320, 275/15 against 338/2 at 390); the denominators, TC-R219l and error lines green. On v1 (a61953d7ffa6) 13 of 13 green
const L=require('../lib');
const SEQ=['Puzzles','Review','Discover','Home','Review','Home'];
const sample=(b,ms)=>b.page.evaluate((ms)=>new Promise(res=>{const out=[];const t0=performance.now();const f=()=>{
  const m=[...document.querySelectorAll('button[aria-label="Menu and settings"]')].filter(e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.top<200&&r.bottom>0))return false;const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===e||e.contains(h));})
    .map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.left*2)/2,Math.round(r.top*2)/2,Math.round(r.width*2)/2,Math.round(r.height*2)/2].join('/');});
  out.push(m.join(','));if(performance.now()-t0<ms)requestAnimationFrame(f);else res([...new Set(out)]);};requestAnimationFrame(f);}),ms);
L.run(async()=>{
  for(const [gn,geo] of [['375x761','kunal761'],['320x568','se'],['390x844','390']]){
    const b=await L.launch({geo,name:'menu162'});await b.open();await b.settle(800);
    const seen={};seen.Home=await sample(b,600);
    const acct=await b.page.evaluate(()=>{const m=document.querySelector('[data-ct="home-menu"]');const a=[...document.querySelectorAll('button')].find(x=>/^(Account|Sign in)$/.test(x.getAttribute('title')||''));if(!m||!a)return null;const q=m.getBoundingClientRect(),r=a.getBoundingClientRect();
      return {m:[q.left,q.top,q.right,q.bottom].map(v=>Math.round(v)),a:[r.left,r.top,r.right,r.bottom].map(v=>Math.round(v)),vw:innerWidth};});
    for(const t of SEQ){try{const tb=b.page.locator('[data-ct="tabbar"] button',{hasText:new RegExp('^'+t+'$')});if(await tb.count())await tb.first().click({timeout:3000});else await b.tile(t);}catch(e){L.note(gn+' '+t+': '+String(e).slice(0,100));}
      seen[t+'#'+Object.keys(seen).length]=await sample(b,1000);}
    const all=Object.values(seen).flat();const one=all.every(x=>x&&!x.includes(','));
    L.say(one&&Object.keys(seen).length===SEQ.length+1,'TC-R219j '+gn+' DENOMINATOR one hit-testable menu button on every frame of every screen ('+Object.entries(seen).map(([k,v])=>k.replace(/#\d+$/,'')+' '+v.join(' | ')).join('; ')+')',seen);
    const rects=new Set(all.filter(x=>x));
    L.say(one&&rects.size===1,'TC-R219k '+gn+' the menu button is in one place on Home and on every tab, frame by frame ('+[...rects].join(' ; ')+')',[...rects]);
    L.say(!!acct&&Math.abs(acct.a[1]+acct.a[3]-acct.m[1]-acct.m[3])<=4&&(acct.a[2]<=acct.m[0]||acct.a[0]>=acct.m[2])&&acct.a[0]>=0&&acct.a[2]<=acct.vw,'TC-R219l '+gn+' Home\'s account button sits beside the menu on its row, not over it ('+JSON.stringify(acct)+')',acct);
    L.say(b.errs.length===0,'TC-R219j '+gn+' zero app errors',b.errs.slice(0,3));await b.close();}
},'162-tab-switch-menu-holds');
