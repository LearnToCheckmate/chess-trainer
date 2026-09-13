// gates/audit/antagonist373-menu2.js  ANTAGONIST #373 follow-up on A-04: the ☰ is round, so its bounding-box corners
// are not the button; probe points INSIDE the circle instead, and measure what actually shares its pixels: the
// heading's glyph boxes (Range.getClientRects) and any other fixed button (the 🏠 seen at landscape).
'use strict';
const L=require('../lib');
const GEOS=[['se','se'],['kunal','kunal'],['430','430'],['land',{w:844,h:390,safe:'',label:'844x390 landscape'}],['land-se',{w:568,h:320,safe:'',label:'568x320 landscape SE'}]];
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const b=await L.launch({geo,name:'ant-menu2-'+tag});await b.open();
    const r=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="home-menu"]');if(!e)return null;const R=e.getBoundingClientRect();const cx=R.left+R.width/2,cy=R.top+R.height/2,rad=R.width/2-4;const pts=[[cx,cy],[cx-rad*0.7,cy-rad*0.7],[cx+rad*0.7,cy+rad*0.7],[cx-rad,cy],[cx+rad,cy],[cx,cy-rad],[cx,cy+rad]];const cover=pts.map(([x,y])=>{const t=document.elementFromPoint(x,y);return t?(t===e||e.contains(t)?'self':(t.tagName+'.'+((t.getAttribute&&(t.getAttribute('data-ct')||t.getAttribute('title')))||(t.innerText||'').trim().slice(0,12)))):'none';});
      // glyph boxes of every text node that shares pixels with the button's circle box
      const glyphs=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(!n.nodeValue.trim())continue;if(e.contains(n))continue;const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects()){const ox=Math.min(R.right,q.right)-Math.max(R.left,q.left),oy=Math.min(R.bottom,q.bottom)-Math.max(R.top,q.top);if(ox>0.5&&oy>0.5)glyphs.push({t:n.nodeValue.trim().slice(0,20),ox:Math.round(ox),oy:Math.round(oy),gl:Math.round(q.left),gr:Math.round(q.right),gt:Math.round(q.top),gb:Math.round(q.bottom)});}}
      const btns=[...document.querySelectorAll('button,a,[role=button]')].filter(x=>x!==e&&!e.contains(x)).map(x=>{const q=x.getBoundingClientRect();const ox=Math.min(R.right,q.right)-Math.max(R.left,q.left),oy=Math.min(R.bottom,q.bottom)-Math.max(R.top,q.top);return {t:(x.innerText||x.getAttribute('title')||x.getAttribute('aria-label')||'').trim().slice(0,14),ox:Math.round(ox),oy:Math.round(oy),z:getComputedStyle(x).zIndex,pos:getComputedStyle(x).position,vis:q.width>0&&q.height>0&&getComputedStyle(x).visibility!=='hidden',x:Math.round(q.left),y:Math.round(q.top),w:Math.round(q.width),h:Math.round(q.height)};}).filter(x=>x.ox>0.5&&x.oy>0.5);
      return {btn:{x:Math.round(R.left),y:Math.round(R.top),w:Math.round(R.width),h:Math.round(R.height),z:getComputedStyle(e).zIndex},cover,glyphs,btns};});
    L.say(!!r&&r.cover.every(c=>c==='self'),tag+': A-04 seven points inside the ☰ circle all hit the ☰',r&&r.cover);
    L.say(!!r&&r.glyphs.length===0,tag+': A-04 no text glyph box shares pixels with the ☰',r&&r.glyphs);
    L.say(!!r&&r.btns.length===0,tag+': A-04 no other button/link shares pixels with the ☰',r&&r.btns);
    L.note(tag+': ☰ '+JSON.stringify(r&&r.btn));
    // does the ☰ open the menu when tapped at its left edge (the side nearest the heading / the 🏠)?
    if(r){await b.page.mouse.click(r.btn.x+6,r.btn.y+r.btn.h/2);await b.settle(500);const s=await b.rect('[data-ct="menu-sheet"]');L.say(!!s,tag+': A-04 a tap 6px inside the ☰ left edge opens the menu');if(s){await b.page.mouse.click(4,4);await b.settle(200);}}
    await b.shot('menu2-'+tag+'-home');
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-MENU2');
