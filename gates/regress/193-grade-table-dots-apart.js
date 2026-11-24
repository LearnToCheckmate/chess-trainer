'use strict';
// gates/regress/193-grade-table-dots-apart.js - THE GRADE TABLE'S DOTS TELL BEST, EXCELLENT AND GOOD APART, AND ITS HEADERS SIT OVER THEIR
// COLUMNS. US-R203 / TC-R321..323.
//
// WHY [#553 B1, jobs/review-grade-table-header-and-colour; antagonist B at #422, findings grade-table-headers-not-over-their-columns and
// excellent-dot-indistinguishable]: at #422 the three green rows' dots were rgb(123,216,143), rgb(139,209,143), rgb(156,203,143) - CIELAB dE76
// about 8 apart, "three shades of one green", so the Excellent row was carried by its word alone. #547 item 84 moved the dots to the
// classifier colours (CLS_BANDS: Best #6fd66f, Excellent #9fcf6f, Good #c9d06a, about 17 to 19 apart) and item 139 fixed the header grid
// (gate 20 TC-R89), but no decision was recorded for the colours and nothing asserted the dots stay apart. The default taken at #553
// (Amber: flags/amber-553-grade-dot-colours) keeps those colours and pins the distance here.
// WHAT IT READS: the bundle under test (CT_APP), the Opera Game imported and reviewed (drive/review summary), at 375x761 with his insets
// (kunal761) and 320x568 (se). Each dot is [data-ct="sum-dot"] with its data-grade; its colour is the PAINTED pixel at the dot's centre, read
// from a screenshot (not its style), so a dot that paints something other than its declared colour is measured as painted.
//  TC-R321 DENOMINATOR the summary's grade table shows ten dots, one per grade, each painted (a pixel read at its centre).
//  TC-R322 Best, Excellent and Good: each pair's painted dots differ by CIELAB dE76 >= 15; and each of the three differs from every other
//          grade's dot by >= 10.
//  TC-R323 the White and Black headers' ink is centred over their column's digits within 1px (the header half of the job; gate 20's TC-R89
//          checks it at the superseded 730 column and 320x568; this gate checks it at kunal761).
// CONTROL-RECORD: 6558346f 2026-11-24 total=8 red=2 scope=trial:837976ecee8c how=#553 B1, THE SUBJECT REMOVED: pairs break dots-back-to-three-shades-of-green (the #422 dot colours rgb(123,216,143) / (139,209,143) / (156,203,143)) - TC-R322 red at 375x761 and 320x568
// CONTROL-RECORD: 6558346f 2026-11-24 total=8 red=2 scope=trial:2a6e09e91716 how=#553 pairs break excellent-dot-painted-as-best - TC-R322 red at both sizes
// CONTROL-RECORD: 6558346f 2026-11-24 total=8 red=2 scope=trial:0362ffe27f15 how=#553 pairs break header-grid-48-again (header grid 1fr 48px 48px) - TC-R323 red at both sizes
// The grading machine on 6558346f: CHECKED, real 4/4 at kunal761 and 4/4 at 320x568 (bundle dad553e492f2), the three breaks CAUGHT.
const L=require('../lib');const RV=require('../drive/review');
const lab=(rgb)=>{const f=(c)=>{c/=255;return c>0.04045?Math.pow((c+0.055)/1.055,2.4):c/12.92;};const [r,g,b]=rgb.map(f);
  const X=(r*0.4124+g*0.3576+b*0.1805)/0.95047,Y=(r*0.2126+g*0.7152+b*0.0722),Z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;
  const t=(v)=>v>0.008856?Math.cbrt(v):(7.787*v+16/116);return [116*t(Y)-16,500*(t(X)-t(Y)),200*(t(Y)-t(Z))];};
const dE=(a,b)=>{const p=lab(a),q=lab(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);};
const GREENS=['Best','Excellent','Good'];
L.run(async()=>{
  for(const [gn,geo] of [['375x761','kunal761'],['320x568','se']]){
    const b=await L.launch({geo,name:'g193-'+geo});await b.open();let ok=true;
    try{await RV.states['summary'](b);await b.settle(1000);}catch(e){ok=false;L.note(gn+' summary: '+String(e).slice(0,140));}
    const dots=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="sum-dot"]')].map(e=>{e.scrollIntoView({block:'center'});const q=e.getBoundingClientRect();return {g:e.getAttribute('data-grade'),x:q.left+q.width/2,y:q.top+q.height/2,w:q.width,h:q.height};}));
    // read each dot's painted centre: scroll it into view, screenshot a 1px clip at its centre
    const painted={};
    for(const d of dots){try{const r=await b.page.evaluate((g)=>{const e=document.querySelector('[data-ct="sum-dot"][data-grade="'+g+'"]');e.scrollIntoView({block:'center'});const q=e.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};},d.g);
        await b.settle(120);const png=await b.page.screenshot({clip:{x:Math.floor(r.x),y:Math.floor(r.y),width:1,height:1}});
        const src='data:image/png;base64,'+png.toString('base64');
        painted[d.g]=await b.page.evaluate(async(src)=>{const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=src;});
          const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const v=x.getImageData(0,0,1,1).data;return [v[0],v[1],v[2]];},src);}catch(e){L.note(gn+' dot '+d.g+': '+String(e).slice(0,100));}}
    const n=Object.keys(painted).length;
    L.say(ok&&dots.length===10&&n===10&&new Set(dots.map(d=>d.g)).size===10,gn+' TC-R321 DENOMINATOR the grade table shows ten dots, one per grade, each read where it paints ('+n+' of '+dots.length+')',painted);
    const pairs=[];for(let i=0;i<GREENS.length;i++)for(let j=i+1;j<GREENS.length;j++){const a=painted[GREENS[i]],c=painted[GREENS[j]];pairs.push({p:GREENS[i]+'/'+GREENS[j],dE:a&&c?+dE(a,c).toFixed(1):null});}
    const others=[];for(const g of GREENS)for(const o of Object.keys(painted))if(!GREENS.includes(o)&&painted[g])others.push({p:g+'/'+o,dE:+dE(painted[g],painted[o]).toFixed(1)});
    const minO=others.length?others.reduce((m,x)=>x.dE<m.dE?x:m):null;
    L.say(n===10&&pairs.every(x=>x.dE!=null&&x.dE>=15)&&!!minO&&minO.dE>=10,gn+' TC-R322 Best, Excellent and Good are told apart by their dots: '+pairs.map(x=>x.p+' dE '+x.dE).join(', ')+' (each >= 15), and the nearest other grade is '+(minO?minO.p+' dE '+minO.dE:'-')+' (>= 10)',{pairs,minO,painted});
    const r=await b.page.evaluate(()=>{const ink=e=>{const rg=document.createRange();rg.selectNodeContents(e);const q=rg.getBoundingClientRect();return Math.round((q.left+q.right)/2*10)/10;};
      const head=[...document.querySelectorAll('div')].find(d=>/^1fr \d+px \d+px$/.test(d.style.gridTemplateColumns||'')&&/^\s*White\s*Black\s*$/.test(d.innerText||''));if(!head||!head.nextElementSibling)return null;
      const hc=[...head.children],rc=[...head.nextElementSibling.children];if(hc.length<3||rc.length<3)return null;return {white:ink(hc[1]),black:ink(hc[2]),wDig:ink(rc[1]),bDig:ink(rc[2])};});
    L.say(!!r&&Math.abs(r.white-r.wDig)<=1&&Math.abs(r.black-r.bDig)<=1,gn+' TC-R323 the White and Black headers sit over their digits within 1px ('+(r?'White '+r.white+' vs '+r.wDig+', Black '+r.black+' vs '+r.bDig:'header not found')+')',r);
    L.say(b.errs.length===0,gn+' TC-R321 zero app errors',b.errs.slice(0,3));
    await b.close();}
},'193-grade-table-dots-apart');
