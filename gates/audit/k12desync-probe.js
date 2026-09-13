// audit/k12desync-probe.js  Kunal's #372 recording: at 17.Rd8# the board re-rendered one ply earlier with no tap.
// Reproduction attempt: the k12 path (import, jump to the last ply) at his geometry with a 1-worker pool (slow
// analysis, closer to the phone), then the board grid sampled every 400 ms for 25 s: any change in the signature
// while the move row still says 33/33 is the desync. Also with the engine line on, and with the graph on.
'use strict';
process.env.CT_SHOTS=require('path').join(__dirname,'..','shots','audit','k12desync');
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const sig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map((c,i)=>{const im=c.querySelector('img');return im?(i+':'+im.getAttribute('src').slice(-8)):'';}).filter(Boolean).join(' ');});
L.run(async()=>{
  for(const cfg of [{store:{ct_pool:'1'},label:'pool1'},{store:{ct_pool:'1',ct_evalgraph:'1'},label:'pool1+graph'},{store:{ct_pool:'3'},label:'pool3 engine-on',eng:true}]){
    const b=await L.launch({geo:'kunal',store:cfg.store,app:process.env.CT_APP||require('path').join(L.ROOT,'app.js'),name:'k12'});await b.open();
    await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
    const t0=Date.now();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});const tA=Math.round((Date.now()-t0)/1000);
    await b.tapText(/^Start review/,{wait:800});await b.page.locator('[aria-label="First move"]').first().click();await b.settle(300);
    for(let i=0;i<33;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.page.waitForTimeout(90);}await b.settle(800);
    if(cfg.eng){await b.tapCt('rev-more',400);await b.tapText(/^Analyze with the engine$/,{wait:800});}
    const s0=await sig(b);const num0=(await b.rect('[data-ct="eval-bar-num"]')||{}).text;const changes=[];
    for(let i=0;i<62;i++){await b.settle(400);const s=await sig(b);const ml=await b.rect('[data-ct="rev-move-line"]');const num=(await b.rect('[data-ct="eval-bar-num"]')||{}).text;if(s!==s0||num!==num0){changes.push({t:i*0.4,ply:ml&&(ml.text.match(/\d+\/\d+/)||[])[0],num,diff:s.split(' ').filter(x=>!s0.split(' ').includes(x)).slice(0,4)});if(changes.length===1)await b.shot('k12-'+cfg.label+'-changed');}}
    L.say(changes.length===0,cfg.label+': board and label stable for 25 s at 17.Rd8# (analysis took '+tA+' s; label '+num0+')',changes.slice(0,4));
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,cfg.label+': no app error beyond the allowed trap',b.errs.slice(0,2));
    await b.close();
  }
},'K12DESYNC');
