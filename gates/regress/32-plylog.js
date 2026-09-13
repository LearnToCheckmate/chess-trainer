// regress/32-plylog.js  The ply log is TEMPORARY and DEV-GATED. This gate holds it to both of those.
// Kunal, 2026-09-13: keep the instrumentation, because his phone is the one place with no other visibility, but
// gate it behind the same switch as the Layout readout so it never runs for an ordinary user, and give it a
// retirement condition: it comes out when he certifies k12 closed on his own phone.
//
// HOW THE SURFACE ACTUALLY WORKS, learned by gating it wrong the first time: the Layout readout is a block INSIDE
// THE MENU SHEET, under its toggle row. The switch keeps recording after the sheet is closed, which is the whole
// point (turn it on, close the menu, reproduce, reopen the menu and read the last three ply changes), but the text
// is only on screen while the menu is open. A gate that looks for it on a board screen finds nothing and says the
// switch is off. Read it with the menu open.
//
// The OFF case is proved without a back door: step plies with the switch off, THEN turn the readout on. If
// recording had been happening while off, the buffer would already hold those plies and the readout would print
// them on the very render that turns it on. It must print nothing.
//   1. plies stepped with the switch OFF leave no entry behind when the readout is later switched on
//   2. plies stepped with the readout ON are recorded, and the readout prints its last entries
//   3. switching it off and on again clears the buffer, so nothing lingers for a user who tried it once
// Run at his real 375x730 and at the shorter 375x679.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';

// Open the menu WITHOUT leaving the screen. This matters: the readout switch is plain state, so any route that
// reloads the page (the harness's home() falls back to a reload when no tab bar is on screen) silently turns it
// off again, and the gate then measures an app that is not in the state it thinks it is. From the review move
// screen the ... sheet has a "Menu and settings" row, so the whole journey happens without a navigation.
const openMenu=async(b)=>{
  if(await b.page.locator('[data-ct="home-menu"]').first().isVisible().catch(()=>false)){await b.tapCt('home-menu',600);return;}
  if(await b.page.locator('[data-ct="rev-more"]').first().isVisible().catch(()=>false)){
    await b.tapCt('rev-more',400);await b.tapText(/^Menu and settings$/,{wait:600});return;}
  await b.tapText(/^☰$/,{wait:600});
};
// Read the Layout readout block with the menu open. Returns {shown, plyLine}; leaves the menu OPEN.
const openReadout=async(b)=>{
  await openMenu(b);
  return b.page.evaluate(()=>{
    const anchor=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/what THIS device computes/.test(d.innerText||''));
    if(!anchor)return {shown:false,plyLine:null};
    const box=anchor.parentElement;
    const ply=[...box.querySelectorAll('div')].find(d=>d.children.length===0&&/^ply log /.test((d.innerText||'').trim()));
    return {shown:true,plyLine:ply?(ply.innerText||'').trim():null};
  });
};
const closeMenu=async(b)=>{await b.page.mouse.click(4,4);await b.settle(400);};
const toggle=async(b)=>{await b.tapText(/^Layout readout$/,{wait:500});};
const step=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(170);}await b.settle(400);};
const toReview=async(b)=>{
  if(await b.page.locator('[aria-label="Next move"]').first().isVisible().catch(()=>false))return;   // already there
  await b.tile('Review');
  const ta=b.page.locator('textarea').first();
  if(await ta.isVisible().catch(()=>false)){await ta.fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(400);}
  await b.tapText(/^Start review/,{wait:800}).catch(()=>{});
  await b.page.locator('[aria-label="First move"]').first().click().catch(()=>{});await b.settle(400);
};

L.run(async()=>{
  for(const geo of ['kunal730','kunal']){
    const b=await L.launch({geo,name:'plylog-'+geo,store:{ct_pool:'3'}});await b.open();
    // an ordinary user: the switch is off. Step plies, then turn the readout on and look at the same render.
    await toReview(b);await step(b,4);
    let r=await openReadout(b);
    L.say(r.shown===false,geo+': with the switch off there is no Layout readout block in the menu');
    await toggle(b);
    r=await b.page.evaluate(()=>{
      const anchor=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/what THIS device computes/.test(d.innerText||''));
      if(!anchor)return {shown:false,plyLine:null};
      const ply=[...anchor.parentElement.querySelectorAll('div')].find(d=>d.children.length===0&&/^ply log /.test((d.innerText||'').trim()));
      return {shown:true,plyLine:ply?(ply.innerText||'').trim():null};
    });
    L.say(r.shown===true,geo+': tapping Layout readout shows the readout block');
    L.say(r.plyLine===null,geo+': plies stepped with the switch OFF left nothing in the buffer',r.plyLine);
    await closeMenu(b);
    // now it is on: step again and the entries appear
    await toReview(b);await step(b,4);
    r=await openReadout(b);
    L.say(!!r.plyLine&&/^ply log /.test(r.plyLine),geo+': with the readout on, ply changes are recorded and printed',r.plyLine);
    L.say(!!r.plyLine&&/ \d+@/.test(r.plyLine),geo+': the entries name the ply they became, not "fn", and how long after the last touch',r.plyLine);
    await b.shot('plylog-'+geo+'-on');
    // off, then on again: the buffer is empty
    await toggle(b);await closeMenu(b);
    await toReview(b);await step(b,2);
    r=await openReadout(b);
    L.say(r.shown===false,geo+': switching it off hides the readout again');
    await toggle(b);
    const after=await b.page.evaluate(()=>{
      const anchor=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/what THIS device computes/.test(d.innerText||''));
      if(!anchor)return null;
      const ply=[...anchor.parentElement.querySelectorAll('div')].find(d=>d.children.length===0&&/^ply log /.test((d.innerText||'').trim()));
      return ply?(ply.innerText||'').trim():null;
    });
    L.say(after===null,geo+': plies stepped while it was off again left nothing behind (the buffer is cleared)',after);
    await closeMenu(b);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }
},'PLYLOG');
