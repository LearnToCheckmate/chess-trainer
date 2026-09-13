// regress/32-plylog.js  The ply log is TEMPORARY and DEV-GATED. This gate holds it to both of those.
// Kunal, 2026-09-13: keep the instrumentation, because his phone is the one place with no other visibility, but
// gate it behind the same switch as the Layout readout so it never runs for an ordinary user, and give it a
// retirement condition: it comes out when he certifies k12 closed on his own phone.
//
// The assertions use only shipped surfaces, and the OFF case is proved without a back door: step plies with the
// switch off, THEN turn the readout on without stepping again. If recording had been happening while off, the
// buffer would already hold those plies and the readout would print them. It must print nothing.
//   1. plies stepped with the switch OFF leave no entry behind when the readout is later switched on
//   2. plies stepped with the readout ON are recorded, and the readout prints its last entries
//   3. switching it off and on again clears the buffer, so nothing lingers for a user who tried it once
// Run at his real 375x730 and at the shorter 375x679.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const plyLine=(b)=>b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/^ply log /.test((d.innerText||'').trim()));return e?(e.innerText||'').trim():null;});
const readoutShown=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.children.length===0&&/^board .* vw /.test((d.innerText||'').replace(/\s+/g,' ').trim())));
const step=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(170);}await b.settle(400);};
const toggleReadout=async(b)=>{await b.home();await b.tapCt('home-menu',500);await b.tapText(/^Layout readout$/,{wait:400});await b.page.mouse.click(4,4);await b.settle(500);};
const toReview=async(b)=>{
  await b.tile('Review');
  if(!(await b.page.locator('[aria-label="Next move"]').first().isVisible().catch(()=>false))){
    const ta=b.page.locator('textarea').first();
    if(await ta.isVisible().catch(()=>false)){await ta.fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(400);}
    await b.tapText(/^Start review/,{wait:800}).catch(()=>{});
    await b.page.locator('[aria-label="First move"]').first().click().catch(()=>{});await b.settle(400);
  }
};
L.run(async()=>{
  for(const geo of ['kunal730','kunal']){
    const b=await L.launch({geo,name:'plylog-'+geo,store:{ct_pool:'3'}});await b.open();
    // 1. OFF: step plies, then switch the readout on WITHOUT stepping. Nothing may have been kept.
    await toReview(b);await step(b,4);
    await toggleReadout(b);
    L.say(await readoutShown(b),geo+': the Layout readout is on');
    const leaked=await plyLine(b);
    L.say(leaked===null,geo+': plies stepped with the switch OFF left nothing in the buffer',leaked);
    // 2. ON: step again, the entries appear
    await toReview(b);await step(b,4);
    const onLine=await plyLine(b);
    L.say(!!onLine&&/^ply log /.test(onLine),geo+': with the readout on, ply changes are recorded and printed',onLine);
    L.say(!!onLine&&/\d/.test(onLine),geo+': the printed entries carry ply numbers',onLine);
    await b.shot('plylog-'+geo+'-on');
    // 3. off and on again clears it
    await toggleReadout(b);await b.settle(300);await toggleReadout(b);
    const cleared=await plyLine(b);
    L.say(cleared===null,geo+': switching it off clears the buffer',cleared);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }
},'PLYLOG');
