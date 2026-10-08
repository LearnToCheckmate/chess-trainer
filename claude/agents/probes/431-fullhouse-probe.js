// #431 THE FULL HOUSE AT REAL PGN SIZE: ACCT_MAX=8 accounts, each fetched to ACCT_GMAX.
// Row size is the variable. Reports what reaches the store and what survives a reload.
// Reached from __dirname rather than from an absolute path, for the reason measured on 2026-10-08 in
// gates/regress/19-review-grade-counts.js: /home/user/chess-trainer resolves in the build lane's container
// only, so this probe could never run anywhere else. __dirname is claude/agents/probes.
const L=require(require('path').join(__dirname,'..','..','..','gates','lib'));
const ACCTS=['acct1','acct2','acct3','acct4','acct5','acct6','acct7','acct8'];
const NEW={y:2026,m:9}, OLDER=[4,5,6,7,8], PER=60;
const PAD=+(process.env.PGN_CHARS||2612);
const BASE="1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0";
function pgn(who,opp,y,mm,dd){
  let head=['[Event "Live Chess"]','[Site "Chess.com"]','[Date "'+y+'.'+mm+'.'+dd+'"]','[White "'+who+'"]','[Black "'+opp+'"]','[Result "1-0"]','[TimeControl "180"]','[WhiteElo "1400"]','[BlackElo "1380"]','[ECO "C41"]','',''].join('\n');
  let body=BASE;
  // pad with realistic clock comments until the whole PGN reaches PAD chars
  let i=0; while((head+body).length<PAD){ body+=" {[%clk 0:0"+(i%10)+":"+(10+i%50)+"."+(i%10)+"]}"; i++; }
  return (head+body).slice(0,Math.max(PAD,(head+BASE).length));
}
function stub(b,st){return b.ctx.route(/api\.chess\.com/,async(r)=>{
  const u=r.request().url(); st.hits++;
  if(st.refuse)return r.fulfill({status:503,contentType:'application/json',body:'{}'});
  const who=(u.match(/player\/([^/]+)\//)||[])[1]||'';
  if(/\/games\/archives$/.test(u)){const ar=[];for(let i=0;i<24;i++){const t=new Date(Date.UTC(2024,9+i,1));ar.push('https://api.chess.com/pub/player/'+who+'/games/'+t.getUTCFullYear()+'/'+String(t.getUTCMonth()+1).padStart(2,'0'));}
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({archives:ar})});}
  const m=u.match(/games\/(\d{4})\/(\d{2})$/); if(!m)return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  const y=+m[1],mo=+m[2]; let n=0;
  if(y===NEW.y&&mo===NEW.m)n=PER; else if(y===2026&&OLDER.indexOf(mo)>=0)n=PER;
  const g=[]; for(let i=0;i<n;i++){const dd=String(1+(i%27)).padStart(2,'0'),mm=String(mo).padStart(2,'0'),opp=who+'_o'+mm+i;
    g.push({url:'https://www.chess.com/game/live/'+(y*1e6+mo*1e4+i),pgn:pgn(who,opp,y,mm,dd),white:{username:who,result:'win'},black:{username:opp,result:'checkmated'},time_class:'blitz',end_time:Math.floor(Date.UTC(y,mo-1,1+(i%27),12,0,0)/1000)});}
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({games:g})});});}
const READ=(b)=>b.page.evaluate(()=>{
  let chars=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);chars+=k.length+(localStorage.getItem(k)||'').length;}
  let stored=0,accts=0,ids=[];try{const M=JSON.parse(localStorage.getItem('ct_acctgames')||'{}');ids=Object.keys(M);accts=ids.length;ids.forEach(k=>stored+=(M[k]||[]).length);}catch(e){}
  return {rows:document.querySelectorAll('[data-ct="game-row"]').length,stored,accts,ids,chars,acctBytes:(localStorage.getItem('ct_acctgames')||'').length};
});
(async()=>{
  const st={hits:0,refuse:false};
  const b=await L.launch({geo:{w:375,h:730,safe:''},store:{ct_ccuser:ACCTS[0],ct_accts:'[]',ct_acctgames:'{}'},name:'fullhouse'});
  await stub(b,st); await b.open(); await b.tile('Review'); await b.settle(2200);
  for(let i=1;i<ACCTS.length;i++){
    await b.page.locator('input[placeholder="Chess.com username"]').fill(ACCTS[i]);
    await b.settle(120); await b.tapText(/^Fetch$/,{wait:2200});
  }
  await b.settle(900);
  const before=await READ(b);
  st.refuse=true; await b.open(); await b.tile('Review'); await b.settle(1500);
  const after=await READ(b);
  console.log(JSON.stringify({pgnChars:PAD,bundle:(process.env.CT_APP||'app.js').split('/').pop(),
    onScreen:before.rows, storedAccounts:before.accts+'/8', storedRows:before.stored,
    acctGamesChars:before.acctBytes, totalChars:before.chars,
    rowsAfterReload:after.rows, storedAfterReload:after.stored, accountsAfterReload:after.accts+'/8', WHICH_ACCOUNTS_SURVIVE:after.ids.join(','),
    survives: after.stored===before.stored && before.stored>0}));
  await b.close(); process.exit(0);
})();
