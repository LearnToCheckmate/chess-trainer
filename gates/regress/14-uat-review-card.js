// regress/14-uat-review-card.js  The UAT card for the Review screen (gallery card 6, id US-R) plays the
// journey by itself: import + analysis, summary, ply 0, 10.Nxb5!!, 17.Rd8#, analysis board, exit. This gate
// runs the card and checks every checkpoint's caption (data-ct rec-cap carries the item id) and the state it
// claims, at Kunal's geometry. The caption strip must sit inside the viewport at every checkpoint.
'use strict';
const L=require('../lib');
const cap=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rec-cap"]');if(!e)return null;const r=e.getBoundingClientRect();return {text:(e.innerText||'').replace(/\s+/g,' ').trim(),bottom:Math.round(r.bottom),top:Math.round(r.top)};});
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'uat-review',store:{ct_pool:'3'}});await b.open();
  const titles=await b.cardTitles();L.say(titles.some(t=>/US-R/.test(t)),'the Review journey card is in the gallery',titles);
  const t0=Date.now();await b.card(/US-R · The Review journey/,1000);
  const c0=await cap(b);L.say(!!c0&&/US-R01/.test(c0.text),'caption at start names US-R01',c0&&c0.text);
  const waitUntil=async(ms)=>{const d=ms-(Date.now()-t0);if(d>0)await b.settle(d);};
  await waitUntil(54500);const c3=await cap(b);const sum=await b.rect('[data-ct="rev-summary"]');const foot=await b.rect('[data-ct="rev-summary-foot"]');
  L.say(!!c3&&/US-R03/.test(c3.text),'52 s: caption names US-R03',c3&&c3.text);
  L.say(!!sum&&!!foot&&foot.y+foot.h<=b.geo.h+0.5,'52 s: the summary is up with its footer pinned',foot&&Math.round(foot.y+foot.h));
  L.say(!!c3&&c3.bottom<=b.geo.h,'52 s: the caption strip is inside the viewport',c3&&c3.bottom);
  await b.shot('uat-review-summary');
  await waitUntil(60500);const c4=await cap(b);const m4=await b.metrics();const ml4=await b.rect('[data-ct="rev-move-line"]');
  L.say(!!c4&&/US-R04/.test(c4.text),'58 s: caption names US-R04',c4&&c4.text);
  L.say(!!m4.board&&Math.abs(m4.board.w-349)<0.6&&m4.over.over<=0,'58 s: move screen, board 349, no scroll',{board:m4.board,over:m4.over.over});
  await waitUntil(66500);const c6=await cap(b);const ml6=await b.rect('[data-ct="rev-move-line"]');const why={text:(await b.text('[data-ct="rev-why"]'))||''};
  L.say(!!c6&&/US-R06/.test(c6.text)&&!!ml6&&/Nxb5/.test(ml6.text),'64 s: US-R06 at 10.Nxb5',ml6&&ml6.text);
  L.say(!!why&&/cxb5|Bxb5/.test(why.text),'64 s: the reason names the forcing line',why&&why.text.slice(0,80));
  await b.shot('uat-review-brilliant');
  await waitUntil(72500);const c12=await cap(b);const num=await b.rect('[data-ct="eval-bar-num"]');
  L.say(!!c12&&/k12/.test(c12.text)&&!!num&&/1-0/.test(num.text),'70 s: k12 at 17.Rd8# with the label 1-0',{cap:c12&&c12.text,num:num&&num.text});
  await b.shot('uat-review-mate');
  await waitUntil(79000);const c7=await cap(b);const tx=await b.texts();
  L.say(!!c7&&/US-R07/.test(c7.text)&&tx.some(t=>/Undo/.test(t))&&tx.some(t=>/Exit analysis/.test(t)),'76 s: US-R07 analysis board with Undo and Exit',{cap:c7&&c7.text,btns:tx.filter(t=>/Undo|Exit/.test(t))});
  await b.shot('uat-review-analysis');
  await waitUntil(85500);const c9=await cap(b);const sum9=await b.rect('[data-ct="rev-summary"]');
  L.say(!!c9&&/US-R09/.test(c9.text)&&!!sum9,'82 s: US-R09 back on the summary',c9&&c9.text);
  await waitUntil(90500);const cEnd=await cap(b);L.say(!cEnd,'88 s: the caption clears after the card\'s hold');
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));L.say(bad.length===0,'zero app errors beyond the allowed engine trap',bad.slice(0,2));
  await b.close();
},'UAT-REVIEW-CARD');
