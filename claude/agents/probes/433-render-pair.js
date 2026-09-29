// claude/agents/probes/433-render-pair.js
// The #433 before/after render at Kunal's 375x730, with a red box on the one thing that changed.
// BEFORE is the #432 bundle (the code both antagonists vetoed); AFTER is #433. Both are driven through the
// SAME sparse archives index - the shape api.chess.com actually returns, 8 entries spread over 28 calendar
// months - because that is the state in which the two bundles differ and every dense fixture hides it.
// ONE BUNDLE PER PROCESS, DELIBERATELY. The first version of this file looped over both bundles in one
// process and shot the SAME bundle twice: gates/lib.js caches its http server in a module global (`_srv`)
// and returns it for every later launch unless `opts.fresh`, so setting CT_APP again between launches
// changes nothing. It was caught only because the probe prints the sentence it read and the "after" shot
// still carried the "before" wording - CLAUDE.md's stale-bundle rule, reproduced by the instrument rather
// than by the harness default it was written about.
//   node claude/agents/probes/433-render-pair.js  <bundle> <label> <outDir>
'use strict';
const path=require('path');
const L=require(path.join(__dirname,'../../../gates/lib'));

const SPARSE=[[2023,11],[2024,1],[2024,6],[2025,2],[2025,9],[2026,3],[2026,8],[2026,9]];
const PER=5, WHO='gateacct1';
const MOVES="1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0";

function stub(b){
  return b.ctx.route(/api\.chess\.com/,async(route)=>{
    const u=route.request().url();
    if(/\/games\/archives$/.test(u))
      return route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({archives:SPARSE.map(([y,m])=>'https://api.chess.com/pub/player/'+WHO+'/games/'+y+'/'+String(m).padStart(2,'0'))})});
    const m=u.match(/games\/(\d{4})\/(\d{2})$/);
    if(!m)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    const y=+m[1],mo=+m[2],games=[];
    for(let i=0;i<PER;i++){
      const dd=String(1+i).padStart(2,'0'), mm=String(mo).padStart(2,'0');
      const pgn=['[Event "Live Chess"]','[Site "Chess.com"]','[Date "'+y+'.'+mm+'.'+dd+'"]','[White "'+WHO+'"]',
        '[Black "opp'+y+mm+i+'"]','[Result "1-0"]','[TimeControl "180"]','',MOVES,''].join('\n');
      games.push({url:'x',pgn,white:{username:WHO,result:'win'},black:{username:'opp'+y+mm+i,result:'checkmated'},
        time_class:'blitz',end_time:Math.floor(Date.UTC(y,mo-1,1+i,12,0,0)/1000)});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games})});
  });
}

(async()=>{
  const [app,label,outDir]=process.argv.slice(2);
  {
    process.env.CT_APP=app;
    const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:WHO,ct_accts:'[]',ct_acctgames:'{}'},name:'render-'+label});
    await stub(b); await b.open(); await b.tile('Review'); await b.settle(2400);
    // the red box goes on the limit line, located BY WHAT IT SAYS so the same code finds it on both bundles
    // (the data-ct attribute exists on both here, but locating by attribute is the trap #432's own gate hit).
    const m=await b.page.evaluate(()=>{
      const LIMIT=/(?:up to|at most|limit)\s+[\d][\d,]*\s+games|last\s*\d+\s*months|months of play|couldn.t be loaded/i;
      const el=[...document.querySelectorAll('div,span,p')].find(x=>x.children.length===0&&LIMIT.test((x.textContent||'').trim()));
      if(!el)return {text:null,rows:document.querySelectorAll('[data-ct="game-row"]').length};
      const r=el.getBoundingClientRect();
      const box=document.createElement('div');
      Object.assign(box.style,{position:'fixed',left:(r.left-4)+'px',top:(r.top-4)+'px',width:(r.width+8)+'px',
        height:(r.height+8)+'px',border:'2px solid #ff3b30',borderRadius:'4px',zIndex:99999,pointerEvents:'none'});
      document.body.appendChild(box);
      let months={};document.querySelectorAll('[data-ct="game-row"]').forEach(x=>{const mm=(x.innerText||'').match(/·\s([A-Z][a-z]{2})\s\d/);if(mm)months[mm[1]]=1;});
      return {text:(el.textContent||'').trim(),rect:{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10},
              rows:document.querySelectorAll('[data-ct="game-row"]').length,monthLabels:Object.keys(months)};
    });
    await b.page.screenshot({path:path.join(outDir,'433-limit-line-'+label+'-375x730.png')});
    console.log(label.toUpperCase()+'  '+JSON.stringify(m));
    await b.close();
  }
  process.exit(0);
})();
