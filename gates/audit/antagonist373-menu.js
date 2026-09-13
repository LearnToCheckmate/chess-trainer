// gates/audit/antagonist373-menu.js  ANTAGONIST #373: A-04 (Home ☰), A-16 (menu sheet fills the viewport), A-11
// (piece chips / footer links) in configurations 30-p1-fixes.js did not use: 320x568, 430x932, landscape 844x390,
// and the footer links reached by scrolling the sheet (do they open?). CT_APP selects the bundle.
'use strict';
const L=require('../lib');
const GEOS=[['se','se'],['430','430'],['land',{w:844,h:390,safe:'',label:'844x390 landscape'}],['kunal','kunal']];
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const b=await L.launch({geo,name:'ant-menu-'+tag});await b.open();
    const vh=b.geo.h,vw=b.geo.w;
    // A-04: the ☰ itself, what covers it, and what it overlaps
    const hm=await b.rect('[data-ct="home-menu"]');
    L.say(!!hm&&hm.w>=44&&hm.h>=44&&hm.x>=0&&hm.x+hm.w<=vw,tag+': A-04 Home ☰ is >=44px and inside the viewport',hm);
    const cover=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="home-menu"]');if(!e)return null;const r=e.getBoundingClientRect();const pts=[[r.left+r.width/2,r.top+r.height/2],[r.left+3,r.top+3],[r.right-3,r.bottom-3]];return pts.map(([x,y])=>{const t=document.elementFromPoint(x,y);return t?(t===e||e.contains(t)?'self':(t.tagName+'.'+(t.getAttribute('data-ct')||t.getAttribute('title')||(t.innerText||'').trim().slice(0,12)))):'none';});});
    L.say(!!cover&&cover.every(c=>c==='self'),tag+': A-04 nothing covers the ☰ (centre, top-left, bottom-right)',cover);
    const overlaps=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="home-menu"]');if(!e)return null;const r=e.getBoundingClientRect();const out=[];for(const x of document.querySelectorAll('button,a,[role=button],h1,h2,div')){if(x===e||e.contains(x)||x.contains(e))continue;const q=x.getBoundingClientRect();if(q.width<2||q.height<2)continue;if(x.children.length>0&&!(x.tagName==='BUTTON'||x.tagName==='A'))continue;const ox=Math.min(r.right,q.right)-Math.max(r.left,q.left),oy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);if(ox>0.5&&oy>0.5)out.push({t:(x.innerText||x.getAttribute('title')||'').trim().slice(0,16),ox:Math.round(ox),oy:Math.round(oy)});}return out;});
    L.say(!!overlaps&&overlaps.length===0,tag+': A-04 the ☰ overlaps no other leaf element / button',overlaps);
    const acct=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="home-menu"]');const r=e.getBoundingClientRect();const c=[...document.querySelectorAll('button')].filter(x=>x!==e&&getComputedStyle(x).position==='fixed'&&Math.abs(x.getBoundingClientRect().top-r.top)<2).map(x=>{const q=x.getBoundingClientRect();return {t:(x.innerText||x.getAttribute('title')||'').trim().slice(0,12),x:Math.round(q.left),w:Math.round(q.width),gap:Math.round(q.left-r.right)};});return c;});
    L.note(tag+': buttons on the ☰ row: '+JSON.stringify(acct));
    await b.shot('menu-'+tag+'-home');
    await b.tapCt('home-menu',500);
    const sheet=await b.rect('[data-ct="menu-sheet"]');
    const pad=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;const p=s.parentElement;const st=getComputedStyle(p);return {pt:st.paddingTop,pb:st.paddingBottom,sh:s.scrollHeight,ch:s.clientHeight,inner:s.scrollHeight-s.clientHeight};});
    L.say(!!sheet&&sheet.y+sheet.h>=vh-11&&sheet.y+sheet.h<=vh+0.5&&sheet.y<=11,tag+': A-16 sheet spans top to bottom minus <=10px (top '+(sheet&&Math.round(sheet.y))+', bottom '+(sheet&&Math.round(sheet.y+sheet.h))+' of '+vh+')',pad);
    L.note(tag+': sheet '+JSON.stringify(sheet&&{x:Math.round(sheet.x),y:Math.round(sheet.y),w:Math.round(sheet.w),h:Math.round(sheet.h)})+' scrolls internally by '+(pad&&pad.inner)+'px');
    const chips=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] button')].filter(x=>/^(Classic|Merida|Chessnut|Spatial|Symbol)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().height)));
    L.say(chips.length===5&&chips.every(h=>h>=40),tag+': A-11 five piece chips >=40px',chips);
    const links=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] a')].filter(x=>/^(Privacy|Terms|Refunds|Delete account)$/.test((x.innerText||'').trim())).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),h:Math.round(r.height*10)/10,w:Math.round(r.width),top:Math.round(r.top)};}));
    L.say(links.length===4&&links.every(l=>l.h>=40),tag+': A-11 four footer links >=40px (claim says 41)',links.map(l=>l.h));
    // reach the footer by scrolling the sheet; is the link the top-most element where the finger lands?
    await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');s.scrollTop=s.scrollHeight;});await b.settle(300);
    const reach=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');const out=[];for(const a of s.querySelectorAll('a')){const t=(a.innerText||'').trim();if(!/^(Privacy|Terms|Refunds|Delete account)$/.test(t))continue;const r=a.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const eTop=document.elementFromPoint(r.left+r.width/2,r.top+2),eBot=document.elementFromPoint(r.left+r.width/2,r.bottom-2);out.push({t,inView:r.top>=0&&r.bottom<=innerHeight,bottom:Math.round(r.bottom),hitC:e===a||a.contains(e),hitT:eTop===a||a.contains(eTop),hitB:eBot===a||a.contains(eBot)});}return {links:out,scrollTop:Math.round(s.scrollTop),vh:innerHeight};});
    L.say(reach.links.length===4&&reach.links.every(l=>l.inView&&l.hitC&&l.hitT&&l.hitB),tag+': A-11 after scrolling the sheet every footer link is in view and is the hit target at its centre/top/bottom',reach);
    // does the link open (target=_blank -> a popup page)?
    let popup=null;try{const pp=b.ctx.waitForEvent('page',{timeout:2500});const pr=reach.links.find(l=>l.t==='Privacy');const a=b.page.locator('[data-ct="menu-sheet"] a',{hasText:/^Privacy$/}).first();const box=await a.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+2);popup=await pp;}catch(e){}
    L.say(!!popup,tag+': A-11 tapping the top edge of Privacy opens a page',popup?await popup.url():'no popup');
    if(popup){try{await popup.close();}catch(e){}}
    await b.shot('menu-'+tag+'-sheet-bottom');
    await b.page.mouse.click(4,4);await b.settle(300);L.say(!(await b.rect('[data-ct="menu-sheet"]')),tag+': backdrop tap closes the sheet');
    // Discover ☰ (the other entry) at this geometry
    try{await b.tile('Discover');await b.tapText(/^☰$/,{wait:500});const s2=await b.rect('[data-ct="menu-sheet"]');L.say(!!s2&&s2.y+s2.h>=vh-11&&s2.y<=11,tag+': A-16 from Discover the sheet spans the viewport (top '+(s2&&Math.round(s2.y))+', bottom '+(s2&&Math.round(s2.y+s2.h))+')');await b.page.mouse.click(4,4);await b.settle(200);}catch(e){L.say(false,tag+': Discover ☰ path threw',String(e).slice(0,120));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-MENU');
