// census.js - #550 inset census for jobs/kunal761-emulates-ct-safe-only-so-css-env-positions-sit-51px-off-his-phone-2026-11-14.
// MEASUREMENT ONLY. For each state of gates/vocab.js, in vocab's own order and with vocab's own drivers, at kunal761:
//   mode A: ct_safe '51,31' only (what lib.js's kunal761 does today: env() reads 0)
//   mode B: ct_safe '51,31' PLUS CDP Emulation.setSafeAreaInsetsOverride top 51 bottom 31 (as gates/regress/77-empty-bands.js:226)
// After each state it snapshots every painted [data-ct] element, button, and leaf text element (rect, key), the page/root overflow,
// and writes one JSON per mode. diff.js compares them.
//   CT_APP=<bundle> CENSUS_MODE=A|B CENSUS_OUT=<file> node census.js
'use strict';
const R='/home/user/chess-trainer/.claude/worktrees/agent-a166f5d9d7a715906/gates/';
const L=require(R+'lib');const fs=require('fs');
const MODE=process.env.CENSUS_MODE||'A';const OUT=process.env.CENSUS_OUT;
const SNAP=()=>{
  const vh=innerHeight,vw=innerWidth;const seen={};const els=[];
  const key=(e)=>{const ct=e.getAttribute('data-ct')||'';const t=(e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40);return (ct?('['+ct+']'):'')+e.tagName.toLowerCase()+':'+t;};
  for(const e of document.querySelectorAll('[data-ct],button,a,input,textarea,div,span')){
    const isLeaf=!e.children.length&&((e.innerText||'').trim().length>0);
    if(!(e.hasAttribute('data-ct')||/^(BUTTON|A|INPUT|TEXTAREA)$/.test(e.tagName)||isLeaf))continue;
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)continue;
    const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
    if(r.bottom<=0||r.top>=vh||r.right<=0||r.left>=vw)continue;   // painted on screen
    let k=key(e);seen[k]=(seen[k]||0)+1;k+='#'+seen[k];
    els.push({k,x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),btn:/^(BUTTON|A|INPUT|TEXTAREA)$/.test(e.tagName)||e.hasAttribute('data-ct')});
  }
  const root=document.getElementById('root');
  return {vh,vw,els,docSW:document.documentElement.scrollWidth,docSH:document.documentElement.scrollHeight,
    rootSW:root?root.scrollWidth:null,rootCW:root?root.clientWidth:null,rootSH:root?root.scrollHeight:null,rootCH:root?root.clientHeight:null,
    envTop:(()=>{const p=document.createElement('div');p.style.cssText='position:fixed;top:0;height:env(safe-area-inset-top,0px);width:1px';document.body.appendChild(p);const h=p.getBoundingClientRect().height;p.remove();return h;})(),
    envBot:(()=>{const p=document.createElement('div');p.style.cssText='position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);width:1px';document.body.appendChild(p);const h=p.getBoundingClientRect().height;p.remove();return h;})()};
};
const out={mode:MODE,app:process.env.CT_APP,states:{}};
L.run(async()=>{
  const b=await L.launch({geo:'kunal761',name:'census-'+MODE});
  if(MODE==='B'){const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:51,bottom:31,left:0,right:0}});}
  await b.open();
  const st=async(name,fn)=>{let err=null;try{await fn();await b.settle(700);}catch(e){err=String(e).split('\n')[0];}
    const s=await b.page.evaluate(SNAP);s.err=err;s.board=(await b.metrics()).board;out.states[name]=s;
    await b.shot('census-'+MODE+'-'+name);
    L.say(!err,MODE+' '+name+': reached',err||{els:s.els.length,envTop:s.envTop,envBot:s.envBot});};
  await st('home',async()=>{});
  await st('discover',async()=>{await b.tile('Discover');});
  await st('puzzles-roadmap',async()=>{await b.home();await b.tile('Puzzles');});
  await st('puzzles-browse',async()=>{await require(R+'drive/puzzles').states['free-play'](b);});
  await st('review-list',async()=>{await b.home();await b.tile('Review');});
  await st('play-setup',async()=>{await b.home();await b.tile('Play');});
  await st('play-setup-passplay',async()=>{await b.tapText(/^Pass & Play$/);});
  await st('play-live-computer',async()=>{await b.home();await require(R+'drive/play').states['cpu-4ply'](b);});
  await st('play-gameover',async()=>{await b.home();await require(R+'drive/play').states['k10'](b);});
  await st('lesson-demo-end',async()=>{await b.home();await require(R+'drive/lesson').states['kg-demo-end'](b);});
  await st('puzzle-hint',async()=>{await b.home();await require(R+'drive/puzzles').states['a06'](b);});
  await st('menu',async()=>{await b.home();await b.tile('Discover');await b.settle(300);const t=await b.texts();const m=t.find(x=>/^(☰|Menu)$/.test(x));if(m)await b.tapText(m);else await b.tapText(/☰/);});
  fs.writeFileSync(OUT,JSON.stringify(out));
  await b.close();
},'CENSUS-'+MODE);
