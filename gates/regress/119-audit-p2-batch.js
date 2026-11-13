'use strict';
// gates/regress/119-audit-p2-batch.js - THE APP AUDIT'S P2 FINDINGS FIXED AT #550, ONE BLOCK EACH. US-HM-18 / TC-HM-059a..b.
//
// WHY [#550, jobs/app-audit-findings-2026-11-11, docs/app-audit-2026-11-11]:
//  AUD-H05 (P2): tapping the Style button (not Pro) or a locked skin opened the Account sheet with no sentence saying why, so it read as a
//  wrong turn. The audit's fix: open it with a line such as "Playful and Medieval are Pro skins", the Coach lock's pattern, naming the skin.
// WHAT IT READS: the bundle under test (CT_APP) at kunal761 on a fresh store (not Pro). The sentence is found by what it SAYS, not by a hook.
// CONTROL-RECORD: c33e447 2026-11-11 total=13 red=2 scope=trial:a0832813a26e how=#550 AUD-H05: the tree before the sentence (t74) - TC-HM-059a and TC-HM-059b red, the precondition and the error line green
// CONTROL-RECORD: c33e447 2026-11-11 total=13 red=2 scope=trial:2cc97627b2ab how=#550 AUD-L15: the tree before the road clip (t75) - both TC-HM-059c paint lines red (583 against 537 at kunal761, 390 against 344 at se); H05 and the node lines green
const L=require('../lib');
L.run(async()=>{
  const sheet=(b)=>b.page.evaluate(()=>{const o=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).position==='fixed'&&+getComputedStyle(d).zIndex===1100);
    return o?(o.innerText||'').replace(/\s+/g,' ').trim():null;});
  // A. the Home Style button
  {const b=await L.launch({geo:'kunal761',name:'aud-h05-style',store:{}});await b.open();
   const st=b.page.locator('button[aria-label^="Style:"]').first();const has=await st.count().catch(()=>0);
   L.say(has>0,'TC-HM-059a PRECONDITION the Home Style button is on screen for a player who is not Pro');
   if(has){await st.click().catch(()=>{});await b.settle(600);}
   const t=has?await sheet(b):null;
   L.say(!!t&&/Playful and Medieval are Pro skins\. Upgrade to use them\./.test(t),'TC-HM-059a AUD-H05 the Account sheet it opens says why: "Playful and Medieval are Pro skins" ('+(t&&t.slice(0,90))+')');
   L.say(b.errs.length===0,'TC-HM-059a zero app errors',b.errs.slice(0,3));
   await b.close();}
  // B. a locked skin in the menu's skin sheet
  {const b=await L.launch({geo:'kunal761',name:'aud-h05-skin',store:{}});await b.open();
   const MD=require('../drive/menu');let ok=true;
   try{await MD.states['menu-look'](b);await b.settle(400);await MD.lookTap(b,'^Style',600);
}catch(e){ok=false;}   // #550 jobs/build-menu-one-screen: the menu's own SKIN cards moved; the skins are on the Style screen Look and feel opens
   const row=b.page.locator('button',{hasText:'Bright, rounded and friendly'}).first();   // the Style screen's skin list: Playful's row, by its blurb
   const has=ok&&await row.count().catch(()=>0);
   if(has){await row.click().catch(()=>{});await b.settle(600);}
   const t=has?await sheet(b):null;
   L.say(!!t&&/Playful is a Pro skin\. Upgrade to use Playful and Medieval\./.test(t),'TC-HM-059b AUD-H05 a locked skin opens the Account sheet naming the skin tapped: "Playful is a Pro skin" ('+(t&&t.slice(0,90))+')',{found:has});
   await b.close();}
  // C. AUD-L15 (P2): the roadmap's scenery ran 20 to 44px past the road's own box and painted over the Free play button below it (its label
  // almost unreadable; it still took taps, the paths being pointer-events none, so a hit test cannot see this). Measured as PAINT: the lowest
  // point any of the road's drawings reaches, cut at the road's own edge when the road clips, against the top of Free play.
  {const Z=require('../drive/puzzles');
   for(const geo of ['kunal761','se']){const b=await L.launch({geo,name:'aud-l15-'+geo,store:{}});await b.open();let ok=true;
    try{await Z.states['roadmap-bottom'](b);await b.settle(700);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const fp=[...document.querySelectorAll('button')].find(x=>/Free play/.test(x.innerText||''));if(!fp)return null;
      let road=fp.previousElementSibling;while(road&&!road.querySelector('svg'))road=road.previousElementSibling;if(!road)return {fp:true,road:false};
      const rr=road.getBoundingClientRect(),fr=fp.getBoundingClientRect(),clip=/hidden|clip/.test(getComputedStyle(road).overflow);
      let low=0;for(const e of road.querySelectorAll('svg *')){const q=e.getBoundingClientRect();if(q.width>0||q.height>0)low=Math.max(low,q.bottom);}
      const painted=clip?Math.min(low,rr.bottom):low;
      const nodes=[...road.querySelectorAll('button')].map(x=>x.getBoundingClientRect()).filter(q=>q.width>0);
      return {fp:true,road:true,clip,low:Math.round(low*10)/10,painted:Math.round(painted*10)/10,fpTop:Math.round(fr.top*10)/10,roadBottom:Math.round(rr.bottom*10)/10,
        nodesIn:nodes.every(q=>q.top>=rr.top-0.5&&q.bottom<=rr.bottom+0.5&&q.left>=rr.left-0.5&&q.right<=rr.right+0.5),nodes:nodes.length};});
    L.say(ok&&!!r&&r.road&&r.nodes>0,'TC-HM-059c '+geo+' PRECONDITION the roadmap is scrolled to its end with Free play and the road ('+(r&&r.nodes)+' nodes) found',r);
    L.say(!!r&&r.road&&r.painted<=r.fpTop+0.5,'TC-HM-059c '+geo+' AUD-L15 nothing of the road paints into Free play: its drawings reach '+(r&&r.painted)+' against the button top '+(r&&r.fpTop)+(r&&r.clip?' (the road clips at its edge)':''),r);
    L.say(!!r&&r.road&&r.nodesIn,'TC-HM-059c '+geo+' and the clip cuts no tier node: every node of the road sits inside its box',r);
    L.say(b.errs.length===0,'TC-HM-059c '+geo+' zero app errors',b.errs.slice(0,3));
    await b.close();}}
},'119-audit-p2-batch');
