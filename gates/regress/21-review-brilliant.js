// regress/21-review-brilliant.js  TC-R10 (US-R06): a brilliancy is explained by what the sacrifice buys, and the
// play-out button animates the line. Port of bril357gate's live half + why354. Opera Game, 10.Nxb5!! (ply 19).
// The sentence must name the follow-up (a forcing move such as Bxb5+ / "If cxb5"); the play-out must move a piece.
// #356: one engine trap is allowed BY EXACT TEXT ("RuntimeError: unreachable") and nothing else.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'review-brilliant',store:{ct_pool:'3'}});await b.open();
  await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});
  for(let i=0;i<19;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(140);}await b.settle(1500);
  const ml=await b.rect('[data-ct="rev-move-line"]');L.say(!!ml&&/Nxb5/.test(ml.text),'at 10.Nxb5',ml&&ml.text);
  const txt=(await b.text('[data-ct="rev-why-txt"]'))||(await b.text('[data-ct="rev-why"]'))||'';
  L.note('reason: '+txt.slice(0,200));
  L.say(/give|sacrific|gives up/i.test(txt),'TC-R10 the reason says what was given up');
  L.say(/If cxb5|Bxb5\+|cxb5/.test(txt),'TC-R10 the reason names the forcing follow-up (cxb5 / Bxb5+)');
  L.say(/Nothing else came close|worse|next best|instead/i.test(txt),'TC-R10 the reason compares with the next-best move');
  const po=await b.rect('[data-ct="rev-playout"]');L.say(!!po,'TC-R10 the play-out (why) button exists on the brilliancy');
  const s0=await gridSig(b);await b.tapCt('rev-playout',400);let moved=false;for(let i=0;i<12;i++){await b.settle(350);if((await gridSig(b))!==s0){moved=true;break;}}
  L.say(moved,'TC-R10 the play-out moves a piece within ~4 s');
  await b.settle(3000);await b.shot('review-brilliant-playout');
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'TC-R10 no app error beyond the one allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();
},'REVIEW-BRILLIANT');
