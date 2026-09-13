// regress/20-review.js  The Review screen's regression suite: TC-R01..TC-R09 and TC-R11..TC-R14 of
// claude/stories/TEST-CASES.md, executed on the bundle under test at Kunal's geometry (375x679, insets 51/31)
// and at 390x844. The Opera Game (33 plies, 10.Nxb5!! at ply 19, 14.Rd1 at ply 27, 17.Rd8# at ply 33) is the
// fixture; its PGN carries WhiteElo/BlackElo so the rating pills render (#348). Every line is a measured claim.
'use strict';
const L=require('../lib');
const PGN='[Event "Opera Game"] [Site "Paris"] [Date "1858.11.02"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const CATS=['Brilliant','Great','Best','Good','Inaccuracy','Mistake','Miss','Blunder']; // the summary folds Excellent into Best (analyzeGameCounts)
const step=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(140);}await b.settle(400);};
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):(c.innerText||'').trim().slice(0,2);}).join('|');});
const badgesOutside=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const R=g.getBoundingClientRect();const out=[];for(const e of g.querySelectorAll('div,span')){if(e.getAttribute('data-ct')==='rev-fab')continue;const st=getComputedStyle(e);if(st.borderRadius!=='50%'&&!/50%/.test(e.style.borderRadius||''))continue;const r=e.getBoundingClientRect();if(r.width<8||r.width>R.width/3)continue;const dx=Math.max(0,R.left-r.left,r.right-R.right),dy=Math.max(0,R.top-r.top,r.bottom-R.bottom);out.push({t:(e.innerText||'').trim().slice(0,3),dx:Math.round(dx*10)/10,dy:Math.round(dy*10)/10,top:Math.round(r.top*10)/10,left:Math.round(r.left*10)/10,w:Math.round(r.width)});}return {board:{top:R.top,left:R.left,w:R.width},badges:out};});
const barInfo=(b)=>b.page.evaluate(()=>['pbar-top','pbar-bottom'].map(k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return null;const r=e.getBoundingClientRect();let spill=0;for(const c of e.querySelectorAll('*')){const q=c.getBoundingClientRect();if(q.width===0)continue;spill=Math.max(spill,q.right-r.right,r.left-q.left,q.bottom-r.bottom,r.top-q.top);}return {h:Math.round(r.height*10)/10,spill:Math.round(spill*10)/10,text:(e.innerText||'').replace(/\s+/g,' ').slice(0,60)};}));
const summaryCounts=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');return s?(s.innerText||'').replace(/\s+/g,' ').slice(0,8000):'';});

L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'review-'+geo,store:{ct_pool:'3'}});await b.open();
    // TC-R01 import
    await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);
    const t0=Date.now();await b.tapText(/^⚡ Analyze Game$/,{wait:300});
    let ok=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});}catch(e){ok=false;}
    const tImport=Date.now()-t0;
    L.say(ok&&tImport<90000,geo+': TC-R01 PGN import reaches the summary in under 90 s ('+Math.round(tImport/1000)+' s)');
    L.say(b.errs.length===0,geo+': TC-R01 zero app errors during import',b.errs.slice(0,3));
    await b.settle(800);await b.shot('review-'+geo+'-summary');
    // TC-R04 summary
    const sumText=await summaryCounts(b);const foot=await b.rect('[data-ct="rev-summary-foot"]');
    L.say(/Accuracy/i.test(sumText)&&CATS.every(c=>sumText.includes(c)),geo+': TC-R04 accuracy and the eight verdict categories are on the summary',CATS.filter(c=>!sumText.includes(c)));
    L.say(!!foot&&foot.y+foot.h<=b.geo.h+0.5&&foot.y>b.geo.h*0.5,geo+': TC-R04 summary footer pinned inside the viewport (bottom '+(foot&&Math.round(foot.y+foot.h))+' of '+b.geo.h+')');
    const skills=await b.rect('[data-ct="rev-skills"]');L.say(!!skills,geo+': TC-R05 Skills panel present');
    // TC-R05 skills jump: Morphy's rook to an open file, 14.Rd1 = ply 27
    const jumped=await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="skill-rooks-to-open-files"]');if(!row)return 'norow';const bt=row.querySelector('button');if(!bt)return 'nobutton';bt.click();return 'clicked';});
    await b.settle(900);const mlJump=await b.rect('[data-ct="rev-move-line"]');
    L.say(jumped==='clicked'&&!!mlJump&&/Rd1/.test(mlJump.text),geo+': TC-R05 tapping the Skills number opens the review at 14.Rd1',{jumped,text:mlJump&&mlJump.text});
    await b.tapCt('rev-back',500);L.say(!!(await b.rect('[data-ct="rev-summary"]')),geo+': TC-R13 back arrow from the move screen returns to the summary');
    // TC-R06 plies
    await b.tapText(/^Start review/,{wait:900});await b.page.locator('[aria-label="First move"]').first().click();await b.settle(700); // Start review resumes at the last viewed ply (the Skills jump left it at 27)
    const at={};const rec=async(k)=>{const m=await b.metrics();const bars=await barInfo(b);const num=await b.rect('[data-ct="eval-bar-num"]');const ml=await b.rect('[data-ct="rev-move-line"]');at[k]={board:m.board,over:m.over,bars,num:num&&num.text,ml:ml&&ml.text,why:(await b.rect('[data-ct="rev-why"]'))};};
    await rec('p0');await step(b,10);await rec('p10');await step(b,9);await rec('p19');await b.shot('review-'+geo+'-ply19');await step(b,14);await rec('p33');await b.shot('review-'+geo+'-ply33');
    const ws=new Set(Object.values(at).map(x=>x.board&&x.board.w)),tops=new Set(Object.values(at).map(x=>x.board&&x.board.top));
    L.say(ws.size===1&&tops.size===1&&!ws.has(null),geo+': TC-R06 one board width and one top across plies 0/10/19/33',{ws:[...ws],tops:[...tops]});
    if(geo==='kunal')L.say(at.p0.board&&Math.abs(at.p0.board.w-349)<0.6,'kunal: TC-R06 review board is 349 wide ('+(at.p0.board&&at.p0.board.w)+')');
    L.say(Object.values(at).every(x=>x.over.over<=0&&x.over.docScroll===0),geo+': TC-R06 nothing scrolls at any ply',Object.values(at).map(x=>x.over.over));
    L.say(Object.values(at).every(x=>x.bars&&x.bars[0]&&x.bars[1])&&new Set(Object.values(at).map(x=>x.bars[0].h+'/'+x.bars[1].h)).size===1,geo+': TC-R14 player bars keep one height across plies',Object.values(at).map(x=>x.bars&&x.bars.map(y=>y.h)));
    L.say(Object.values(at).every(x=>x.bars.every(y=>y.spill<=0.5)),geo+': TC-R14 nothing spills out of a player bar',Object.values(at).map(x=>x.bars.map(y=>y.spill)));
    const rat=await b.page.evaluate(()=>['w','b'].map(c=>{const e=document.querySelector('[data-ct="pbar-rating-'+c+'"]');return e?(e.innerText||'').trim():null;}));
    L.say(rat[0]&&/2600/.test(rat[0])&&rat[1]&&/1800/.test(rat[1]),geo+': TC-R14 rating pills carry the PGN Elo headers',rat);
    // TC-R09 mate label
    L.say(/1-0/.test(at.p33.num||'')&&at.p33.num!==at.p0.num,geo+': TC-R09 eval label reads 1-0 at 17.Rd8# and differs from ply 0',{p0:at.p0.num,p33:at.p33.num});
    // TC-R09b (audit N-review-2): the label must still read 1-0 with the engine line switched on from the ⋯ sheet
    await b.tapCt('rev-more',400);await b.tapText(/^Analyze with the engine$/,{wait:2500});const numEng=await b.rect('[data-ct="eval-bar-num"]');const engl=await b.text('[data-ct="rev-engline"]');
    L.say(!!numEng&&/1-0/.test(numEng.text),geo+': TC-R09 eval label still reads 1-0 at 17.Rd8# with the engine line on (was +99.0 on #372)',{num:numEng&&numEng.text,engline:(engl||'').slice(0,40)});
    await b.tapCt('rev-more',400);await b.tapText(/^Engine line: on$/,{wait:600});
    // TC-R07 badges on rank 8 at ply 33 (Rd8#) and ply 31 (Qb8+)
    const b33=await badgesOutside(b);
    L.say(!!b33&&b33.badges.length>0,geo+': TC-R07 a verdict badge is drawn at 17.Rd8#',b33&&b33.badges);
    L.say(!!b33&&b33.badges.every(x=>x.dx<=0.5&&x.dy<=0.5),geo+': TC-R07 the rank-8 badge is entirely inside the board (A-09)',b33&&b33.badges);
    // TC-R08 verdicts: walk back to ply 19 (brilliant) and 18 (blunder)
    for(let i=0;i<14;i++){await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click({timeout:5000});await b.page.waitForTimeout(120);}await b.settle(400);
    const ml19=await b.rect('[data-ct="rev-move-line"]');const best19=await b.rect('[data-ct="rev-best"]');const why19=await b.rect('[data-ct="rev-why-txt"]')||await b.rect('[data-ct="rev-why"]');
    L.say(!!ml19&&/Nxb5/.test(ml19.text)&&/Brilliant|!!/.test(ml19.text)&&!best19,geo+': TC-R08 10.Nxb5 reads Brilliant with no best-move chip',{ml:ml19&&ml19.text,best:!!best19});
    await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click();await b.settle(500);
    const ml18=await b.rect('[data-ct="rev-move-line"]');const best18=await b.rect('[data-ct="rev-best"]');
    L.say(!!ml18&&/b5/.test(ml18.text)&&/Blunder|Mistake|\?\?|\?/.test(ml18.text)&&!!best18,geo+': TC-R08 9...b5 carries a negative verdict and a best-move chip',{ml:ml18&&ml18.text,best:!!best18});
    const colours=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="strip-row"]');if(!s)return [];const set=new Set();for(const e of s.querySelectorAll('*')){const st=getComputedStyle(e);const c=st.backgroundColor+'|'+st.color;if(e.children.length===0&&(e.innerText||'').trim())set.add(c);}return [...set];});
    L.say(colours.length>=3,geo+': TC-R08 the move strip uses at least three distinct colours ('+colours.length+')');
    // TC-R10 (the why text) is asserted in 21-review-brilliant.js; here only that the reason exists on the brilliancy
    await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click();await b.settle(500);
    const why={text:(await b.text('[data-ct="rev-why"]'))||''};L.say(why.text.length>20,geo+': TC-R08 the reason line is present on 10.Nxb5',why&&why.text.slice(0,70));
    // TC-R11 analysis board from the round button at ply 19 (Black to move)
    const fab=await b.rect('[data-ct="rev-fab"]');const bd=await b.board();
    L.say(!!fab&&Math.abs(fab.w-42)<1&&Math.abs(fab.h-42)<1&&fab.x>=bd.x-0.5&&fab.x+fab.w<=bd.x+bd.w+0.5&&fab.y+fab.h<=bd.y+bd.h+0.5&&fab.y>bd.y+bd.h/2,geo+': TC-R11 round Analyze button 42x42 in the board\'s bottom corner',fab);
    const sig0=await gridSig(b);await b.tapCt('rev-fab',700);const tx=await b.texts();
    L.say(tx.some(t=>/Undo/.test(t))&&tx.some(t=>/Exit analysis/.test(t)),geo+': TC-R11 analysis board offers Undo and Exit analysis',tx.join(' | ').slice(0,200));
    await b.move('a7','a6',500);await b.move('h2','h3',500);const sig2=await gridSig(b);
    L.say(sig2!==sig0,geo+': TC-R11 two moves register on the analysis board');
    await b.tapText(/Undo/,{wait:500});const sig1=await gridSig(b);L.say(sig1!==sig2,geo+': TC-R11 Undo takes one move back');
    await b.tapText(/Exit analysis/,{wait:700});const after=await b.metrics();const ml19b=await b.rect('[data-ct="rev-move-line"]');
    L.say(!!after.board&&Math.abs(after.board.w-bd.w)<0.6&&!!ml19b&&/Nxb5/.test(ml19b.text),geo+': TC-R11 Exit returns to 10.Nxb5 with the board unchanged ('+(after.board&&after.board.w)+')');
    // TC-R13 sheet + navigation out
    await b.tapCt('rev-more',500);L.say(!!(await b.rect('[data-ct="rev-sheet"]')),geo+': TC-R13 the ⋯ sheet opens');
    await b.page.mouse.click(8,120);await b.settle(400);const sheetGone=!(await b.rect('[data-ct="rev-sheet"]'));const afterSheet=await b.metrics();
    L.say(sheetGone&&afterSheet.board&&Math.abs(afterSheet.board.w-bd.w)<0.6,geo+': TC-R13 the sheet closes and the board is unchanged');
    await b.tapCt('rev-back',600);await b.tapText(/^‹ Back to games|Back to games/,{wait:600});
    L.say(await b.page.locator('textarea').first().isVisible().catch(()=>false),geo+': TC-R13 Back to games returns to the list');
    {const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));L.say(bad.length===0,geo+': no app error across the review beyond the one allowed engine trap (#356)',{allowed:b.errs.length-bad.length,other:bad.slice(0,3)});}
    // TC-R02 + TC-R12: reload with the graph on, re-import (cache), compare counts, check the graph
    await b.page.evaluate(()=>{localStorage.setItem('ct_evalgraph','1');});await b.open();await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);
    const t1=Date.now();await b.tapText(/^⚡ Analyze Game$/,{wait:200});let ok2=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:60000});}catch(e){ok2=false;}const tCache=Date.now()-t1;
    L.say(ok2&&tCache<8000,geo+': TC-R02 the cached re-analysis reaches the summary in under 8 s ('+Math.round(tCache/100)/10+' s)');
    const sum2=await summaryCounts(b);const nums=(s)=>(s.match(/\d+/g)||[]).slice(0,40).join(',');
    L.say(nums(sum2)===nums(sumText),geo+': TC-R02 the cached summary carries identical numbers');
    await b.tapText(/^Start review/,{wait:900});const g=await b.rect('[data-ct="eval-graph"]');const bars2=await barInfo(b);const m2=await b.metrics();
    L.say(!!g&&g.w>60,geo+': TC-R12 the eval graph renders in the player bar with the switch on',g&&{w:g.w,h:g.h});
    L.say(bars2[1]&&at.p0.bars[1]&&Math.abs(bars2[1].h-at.p0.bars[1].h)<0.6&&m2.board&&Math.abs(m2.board.w-at.p0.board.w)<0.6,geo+': TC-R12 graph on: bar height and board width unchanged',{bar:bars2[1]&&bars2[1].h,was:at.p0.bars[1].h,board:m2.board&&m2.board.w});
    if(g){await b.page.mouse.click(g.x+g.w*0.7,g.y+g.h/2);await b.settle(500);const mlg=await b.rect('[data-ct="rev-move-line"]');L.say(!!mlg&&mlg.text!==(at.p0.ml||''),geo+': TC-R12 a tap on the graph jumps to a later ply',mlg&&mlg.text);}
    await b.close();
  }
  // TC-R03 stored accounts survive a reload and name both players
  const games=(u)=>[{src:'cc',acct:u,pgn:PGN.replace('Morphy',u).replace('Duke Karl / Count Isouard','DukeKarlCountIsouard99'),white:u,black:'DukeKarlCountIsouard99',wr:'win',tc:'rapid',date:1789000000000}];
  const b=await L.launch({geo:'kunal',name:'review-accounts',store:{ct_accts:['cc:jsmiller1112','cc:kunal2023'],ct_acctgames:{'cc:jsmiller1112':games('jsmiller1112'),'cc:kunal2023':games('kunal2023')}}});await b.open();await b.tile('Review');await b.settle(600);
  const chips=await b.rect('[data-ct="acct-chips"]');const body=await b.page.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
  L.say(!!chips&&/jsmiller1112/.test(chips.text)&&/kunal2023/.test(chips.text),'kunal: TC-R03 two account chips render',chips&&chips.text);
  L.say(/DukeKarlCountIsouard99/.test(body),'kunal: TC-R03 a stored game names its opponent in the list');
  await b.shot('review-kunal-accounts');await b.open();await b.tile('Review');await b.settle(600);const chips2=await b.rect('[data-ct="acct-chips"]');
  L.say(!!chips2&&/jsmiller1112/.test(chips2.text)&&/kunal2023/.test(chips2.text),'kunal: TC-R03 both accounts survive a reload');
  L.say(b.errs.length===0,'kunal: TC-R03 zero app errors',b.errs.slice(0,3));
  await b.close();
},'REVIEW');
