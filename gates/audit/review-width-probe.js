// audit/review-width-probe.js  Why is the review board 293 and not 349 at 375x679 on the live bundle?
// Same PGN, several paths into the move screen; prints the board width/top, the bars, the eval bar and the
// overflow for each. One context so the eval cache makes every import after the first fast.
'use strict';
process.env.CT_SHOTS=require('path').join(__dirname,'..','shots','audit','review-probe');
const L=require('../lib');
const PGN_H='[Event "Opera Game"] [Site "Paris"] [Date "1858.11.02"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const PGN_B='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const geo=process.argv[2]||'kunal';
const info=async(b)=>{const m=await b.metrics();const bars=await b.page.evaluate(()=>['pbar-top','pbar-bottom','eval-bar-v','rev-move-line','rev-why','rev-row1','strip-row'].map(k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return k+':none';const r=e.getBoundingClientRect();return k+':'+Math.round(r.top)+'+'+Math.round(r.height)+'x'+Math.round(r.width);}).join(' '));const ml=await b.rect('[data-ct="rev-move-line"]');return {board:m.board,over:m.over.over,ply:ml&&(ml.text.match(/(\d+)\/(\d+)/)||[])[0],bars};};
const importPgn=async(b,pgn)=>{await b.home();await b.tile('Review');await b.page.locator('textarea').first().fill(pgn);await b.tapText(/^⚡ Analyze Game$/,{wait:300});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(700);};
L.run(async()=>{
  const b=await L.launch({geo,name:'probe',store:{ct_pool:'3'}});await b.open();
  // path A: headers PGN, Start review, then First move
  await importPgn(b,PGN_H);await b.tapText(/^Start review/,{wait:1200});let r=await info(b);L.note('A1 start review (headers PGN): '+JSON.stringify(r));
  await b.page.locator('[aria-label="First move"]').first().click();await b.settle(900);r=await info(b);L.note('A2 after First move: '+JSON.stringify(r));await b.shot('probe-'+geo+'-A2');
  for(let i=0;i<19;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(120);}await b.settle(900);r=await info(b);L.note('A3 ply 19: '+JSON.stringify(r));await b.shot('probe-'+geo+'-A3');
  for(let i=0;i<14;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(120);}await b.settle(900);r=await info(b);L.note('A4 ply 33: '+JSON.stringify(r));await b.shot('probe-'+geo+'-A4');
  await b.page.locator('[aria-label="First move"]').first().click();await b.settle(1200);r=await info(b);L.note('A5 back to ply 0: '+JSON.stringify(r));
  // path B: bare PGN (no headers), Start review, First move
  await b.tapCt('rev-back',500);await importPgn(b,PGN_B);await b.tapText(/^Start review/,{wait:1200});await b.page.locator('[aria-label="First move"]').first().click();await b.settle(900);r=await info(b);L.note('B1 bare PGN, ply 0: '+JSON.stringify(r));await b.shot('probe-'+geo+'-B1');
  for(let i=0;i<33;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(100);}await b.settle(900);r=await info(b);L.note('B2 bare PGN, ply 33: '+JSON.stringify(r));
  // path C: the Skills jump from the summary
  await b.tapCt('rev-back',500);await importPgn(b,PGN_H);await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="skill-rooks-to-open-files"]');const bt=row&&row.querySelector('button');if(bt)bt.click();});await b.settle(1200);r=await info(b);L.note('C1 skills jump (ply 27): '+JSON.stringify(r));await b.shot('probe-'+geo+'-C1');
  // path D: the gallery card (k12 path, pvJumpRef last)
  const titles=await b.cardTitles();const kc=titles.find(t=>/k12|US-R/.test(t));if(kc){await b.card(new RegExp(kc.slice(0,12).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),3000);for(let i=0;i<60;i++){if(await b.rect('[data-ct="rev-move-line"]'))break;await b.settle(1000);}await b.settle(1500);r=await info(b);L.note('D1 gallery card path: '+JSON.stringify(r));await b.shot('probe-'+geo+'-D1');}
  L.say(true,'probe done');await b.close();
},'PROBE');
