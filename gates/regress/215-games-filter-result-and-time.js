'use strict';
// gates/regress/215-games-filter-result-and-time.js - THE REVIEW LIST'S FILTER NARROWS BY RESULT AND BY TIME CONTROL, AND SAYS N OF M.
// US-R225 / TC-R348..350.
//
// WHY [#553 B1, jobs/search-and-filter-your-games-2026-11-15, his pick at about 9:59am EST Tue 17 Nov 2026, "Keep only the missing bits"]:
// #550's Filter panel on Your games (brilliant / blunder / mistake chips, account chips, Clear, the player-name box) stays as it is, and
// gains (1) a Result group - Won, Draw, Lost - and (2) a Time control group - Bullet, Blitz, Rapid, Daily, from each game's time class (a
// game without one matches none). Picks inside a group widen the list (any of them); groups narrow each other and the existing chips and the
// name box; Clear clears the new chips too; (3) while anything is active the header reads "N of M". Amber (placement, Lichess classes):
// flags/amber-553-games-filter-result-and-time-rows.
// WHAT IT READS: the bundle under test (CT_APP), an offline fixture of NINE games seeded into ct_accts / ct_acctgames / ct_gamestats
// (ct_ccuser and ct_liuser empty, so nothing is fetched; PGNs carry headers and no moves, so the background pass grades nothing and the
// tallies below are the only ones), on the Review list, at kunal761 and se (320x568), in the Classic and Medieval skins
// (CT_G215_GEOS / CT_G215_SKINS override). The expected sets are written out by hand per case, not computed by the app's rule.
//      game  account          white / black       result for the account  time class        tally
//      g1    cc:alpha         alpha / opp1        won                      blitz             bril 1
//      g2    cc:alpha         opp2 / alpha        lost                     blitz             blun 1
//      g3    cc:alpha         alpha / opp3        draw                     rapid             -
//      g4    cc:alpha         alpha / opp4        lost (resigned)          bullet            blun 1
//      g5    cc:alpha         alpha / opp5        won                      daily             -
//      g6    cc:beta          beta / opp6         won                      rapid             bril 1
//      g7    li:gamma         gamma / opp7        won                      ultraBullet       -    (counts as Bullet)
//      g8    li:gamma         opp8 / gamma        draw                     classical         -    (no Time control chip matches)
//      g9    li:gamma         gamma / opp9        lost (resigned)          correspondence    -    (counts as Daily)
//  TC-R348 PRECONDITION nine rows and "9 loaded"; the panel carries the seven new chips at 44px or taller. Each Result chip and each Time
//          control chip alone shows exactly its games, and the header reads "N of 9".
//  TC-R349 inside a group picks widen (Won + Lost, Bullet + Daily); across groups they narrow (Won + Bullet, Lost + Blitz), and with the
//          existing chips (Won + !! brilliant), the account chip (Won + gamma) and the name box (Draw + "opp3"; Won + "opp3" shows none).
//  TC-R350 Clear clears the new chips too: nine rows, "9 loaded", no chip pressed; zero app errors.
const L=require('../lib');
const GV=require('../engine-extract.js').GRADE_VER;
const GEOS=(process.env.CT_G215_GEOS||'kunal761,se').split(',').filter(Boolean);
const SKINS=(process.env.CT_G215_SKINS||'classic,medieval').split(',').filter(Boolean);
const pgn=(w,b,res)=>['[Event "Game"]','[Date "2026.09.01"]','[White "'+w+'"]','[Black "'+b+'"]','[Result "'+res+'"]',''].join('\n');
const G=[
  {n:'g1',src:'cc',acct:'alpha',white:'alpha',black:'opp1',wr:'win',     tc:'blitz'},
  {n:'g2',src:'cc',acct:'alpha',white:'opp2', black:'alpha',wr:'win',    tc:'blitz'},
  {n:'g3',src:'cc',acct:'alpha',white:'alpha',black:'opp3',wr:'draw',    tc:'rapid'},
  {n:'g4',src:'cc',acct:'alpha',white:'alpha',black:'opp4',wr:'resigned',tc:'bullet'},
  {n:'g5',src:'cc',acct:'alpha',white:'alpha',black:'opp5',wr:'win',     tc:'daily'},
  {n:'g6',src:'cc',acct:'beta', white:'beta', black:'opp6',wr:'win',     tc:'rapid'},
  {n:'g7',src:'li',acct:'gamma',white:'gamma',black:'opp7',wr:'win',     tc:'ultraBullet'},
  {n:'g8',src:'li',acct:'gamma',white:'opp8', black:'gamma',wr:'draw',   tc:'classical'},
  {n:'g9',src:'li',acct:'gamma',white:'gamma',black:'opp9',wr:'resigned',tc:'correspondence'}];
G.forEach((g,i)=>{g.date=1757000001000+i*1000;});
const row=(g)=>({src:g.src,acct:g.acct,white:g.white,black:g.black,wr:g.wr,tc:g.tc,date:g.date,pgn:pgn(g.white,g.black,g.wr==='win'?'1-0':(g.wr==='draw'?'1/2-1/2':'0-1'))});
const gk=(g)=>g.src+':'+g.date+':'+g.white+':'+g.black;
const T=(o)=>Object.assign({bril:0,great:0,inacc:0,mist:0,blun:0,src:'review',gv:GV},o);
const STATS={};STATS[gk(G[0])]=T({bril:1});STATS[gk(G[1])]=T({blun:1});STATS[gk(G[3])]=T({blun:1});STATS[gk(G[5])]=T({bril:1});
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:alpha','cc:beta','li:gamma'],
  ct_acctgames:{'cc:alpha':G.slice(0,5).map(row),'cc:beta':[row(G[5])],'li:gamma':G.slice(6).map(row)},ct_gamestats:STATS};
const OPP=(g)=>g.white===g.acct?g.black:g.white;
const set=(...ns)=>ns.map(n=>OPP(G[+n.slice(1)-1])).sort().join(',');
L.run(async()=>{
  for(const geo of GEOS)for(const sk of SKINS){
    const med=sk==='medieval';const tag=(geo==='se'?'320x568':'375x761')+' '+sk;
    const b=await L.launch({geo,dev:false,name:'g215-'+geo+'-'+sk,...(med?{pro:true}:{}),store:{...STORE,...(med?{ct_skin:'2'}:{})}});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(1500);}catch(e){ok=false;L.note(tag+' open: '+String(e).slice(0,120));}
    const read=()=>b.page.evaluate(()=>{const rows=[...document.querySelectorAll('[data-ct="game-row"]')].filter(r=>r.getBoundingClientRect().height>0);
      const opp=rows.map(r=>{const m=(r.innerText||'').match(/\bopp\d\b/);return m?m[0]:'?';}).sort().join(',');
      const c=document.querySelector('[data-ct="glist-count"]');
      const chips=[...document.querySelectorAll('[data-ct^="gf-res-"],[data-ct^="gf-tc-"]')].map(x=>({ct:x.getAttribute('data-ct'),h:Math.round(x.getBoundingClientRect().height*10)/10,on:x.getAttribute('aria-pressed')==='true',txt:(x.innerText||'').trim()}));
      return {n:rows.length,opp,count:c?(c.innerText||'').trim():null,chips,empty:!!document.querySelector('[data-ct="glist-empty"]')};});
    const tap=async(ct)=>{await b.page.locator('[data-ct="'+ct+'"]').first().click({timeout:4000});await b.settle(400);};
    const name=async(v)=>{await b.page.locator('[data-ct="glist-search"]').first().fill(v);await b.settle(500);};
    let r0=ok?await read():null;
    try{await tap('gf-toggle');}catch(e){L.note(tag+' gf-toggle: '+String(e).slice(0,120));}
    const r1=await read();
    const want7=['gf-res-win','gf-res-draw','gf-res-loss','gf-tc-bullet','gf-tc-blitz','gf-tc-rapid','gf-tc-daily'];
    L.say(ok&&!!r0&&r0.n===9&&r0.count==='9 loaded'&&want7.every(ct=>r1.chips.some(c=>c.ct===ct&&c.h>=44&&!c.on)),tag+': TC-R348 PRECONDITION nine rows and "9 loaded"; the panel carries the seven new chips, each 44px or taller and off',{r0:r0&&{n:r0.n,count:r0.count},chips:r1.chips});
    // one case: press chips (and a name), read, then un-press them so the next case starts from nothing
    const kase=async(id,cts,nm,want,label)=>{let err=null;try{for(const ct of cts)await tap(ct);if(nm)await name(nm);}catch(e){err=String(e).slice(0,140);}
      const r=await read();const wn=want?want.split(',').length:0;
      L.say(!err&&r.opp===(want||'')&&r.n===wn&&r.count===(wn+' of 9'),tag+': '+id+' '+label+' shows exactly '+(want||'no game')+' and the header reads "'+wn+' of 9" (got '+r.opp+', "'+r.count+'")',{err,got:r.opp,count:r.count,empty:r.empty});
      try{if(nm)await name('');for(const ct of cts)await tap(ct);}catch(e){}};
    await kase('TC-R348',['gf-res-win'],null,set('g1','g5','g6','g7'),'Won alone');
    await kase('TC-R348',['gf-res-draw'],null,set('g3','g8'),'Draw alone');
    await kase('TC-R348',['gf-res-loss'],null,set('g2','g4','g9'),'Lost alone');
    await kase('TC-R348',['gf-tc-bullet'],null,set('g4','g7'),'Bullet alone (Lichess ultraBullet counts)');
    await kase('TC-R348',['gf-tc-blitz'],null,set('g1','g2'),'Blitz alone');
    await kase('TC-R348',['gf-tc-rapid'],null,set('g3','g6'),'Rapid alone (Lichess classical does not count)');
    await kase('TC-R348',['gf-tc-daily'],null,set('g5','g9'),'Daily alone (Lichess correspondence counts)');
    await kase('TC-R349',['gf-res-win','gf-res-loss'],null,set('g1','g5','g6','g7','g2','g4','g9'),'Won + Lost widen');
    await kase('TC-R349',['gf-tc-bullet','gf-tc-daily'],null,set('g4','g7','g5','g9'),'Bullet + Daily widen');
    await kase('TC-R349',['gf-res-win','gf-tc-bullet'],null,set('g7'),'Won + Bullet narrow');
    await kase('TC-R349',['gf-res-loss','gf-tc-blitz'],null,set('g2'),'Lost + Blitz narrow');
    await kase('TC-R349',['gf-res-win','gf-bril'],null,set('g1','g6'),'Won + !! brilliant narrow');
    await kase('TC-R349',['gf-res-win','gf-acct-gamma'],null,set('g7'),'Won + the gamma account narrow');
    await kase('TC-R349',['gf-res-draw'],'opp3',set('g3'),'Draw + the name "opp3" narrow');
    await kase('TC-R349',['gf-res-win'],'opp3','','Won + the name "opp3" leave none');
    // Clear clears the new chips: three on, then Clear
    let cerr=null;try{await tap('gf-res-draw');await tap('gf-tc-rapid');await tap('gf-tc-blitz');await tap('gf-clear');}catch(e){cerr=String(e).slice(0,140);}
    const rc=await read();
    L.say(!cerr&&rc.n===9&&rc.count==='9 loaded'&&rc.chips.length===7&&rc.chips.every(c=>!c.on),tag+': TC-R350 Clear clears the Result and Time control chips too: nine rows, "9 loaded", no new chip pressed (got '+rc.n+', "'+rc.count+'")',{cerr,chips:rc.chips});
    L.say(b.errs.length===0,tag+': TC-R350 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
});
