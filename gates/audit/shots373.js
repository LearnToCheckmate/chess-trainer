// audit/shots373.js  Before/after pairs for the tracker rows #373 closes, shot by the SAME harness at Kunal's
// geometry against the bundle named by CT_APP (run once with the live #372 bundle, once with #373):
//   node gates/audit/shots373.js before      (CT_APP = live app.js)
//   CT_APP=<373 bundle> node gates/audit/shots373.js after
// Screens: home (A-04 ☰), menu sheet from Discover (A-16), Pass & Play setup (A-13), live game with Moves
// closed (A-12), review at 17.Rd8# (A-09 badge). Files land in gates/shots/tracker373/<tag>-<screen>.png.
'use strict';
process.env.CT_SHOTS=require('path').join(__dirname,'..','shots','tracker373');
const L=require('../lib');
const tag=process.argv[2]||'x';
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'shots-'+tag,store:{ct_pool:'3'}});await b.open();
  await b.shot(tag+'-home');L.note('home: home-menu '+JSON.stringify(await b.rect('[data-ct="home-menu"]')));
  await b.tile('Discover');await b.tapText(/^☰$/,{wait:600});await b.shot(tag+'-menu');
  const sheet=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-sheet"]')||document.querySelector('div.scroll[style*="max-width: 380px"]');if(!e)return null;const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom)};});L.note('menu sheet: '+JSON.stringify(sheet)+' of '+b.geo.h);
  await b.page.mouse.click(4,4);await b.settle(300);
  await b.home();await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.settle(500);await b.shot(tag+'-setup-passplay');
  const ov=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]')||document.querySelector('div.scroll[style*="max-width: 420px"]');const p=s&&s.parentElement;return p?Math.round(p.scrollHeight-p.clientHeight):null;});L.note('setup overflow: '+ov);
  await b.card('k8',6500);const m0=await b.metrics();await b.tapText(/^Moves$/,{wait:800});const m1=await b.metrics();await b.shot(tag+'-play-moves-closed');L.note('play board open '+JSON.stringify(m0.board)+' -> Moves closed '+JSON.stringify(m1.board));
  await b.home();await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});await b.page.locator('[aria-label="First move"]').first().click();await b.settle(500);
  for(let i=0;i<33;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(100);}await b.settle(1200);
  const bd=await b.board();const badge=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const R=g.getBoundingClientRect();const e=[...g.querySelectorAll('div')].find(x=>x.getAttribute('data-ct')!=='rev-fab'&&/50%/.test(x.style.borderRadius||'')&&x.getBoundingClientRect().width<R.width/3&&x.getBoundingClientRect().width>8&&(x.innerText||'').trim());if(!e)return null;const r=e.getBoundingClientRect();return {top:Math.round(r.top*10)/10,boardTop:Math.round(R.top*10)/10,outside:Math.round((R.top-r.top)*10)/10};});
  await b.shot(tag+'-review-mate',{clip:{x:0,y:0,width:375,height:420}});L.note('review board '+JSON.stringify(bd&&{w:bd.w,top:bd.y})+' badge '+JSON.stringify(badge));
  L.say(true,tag+' shots done');await b.close();
},'SHOTS373');
