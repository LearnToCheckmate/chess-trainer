'use strict';
// gates/regress/106-games-list-four-counts.js - EACH GAMES-LIST ROW SHOWS BRILLIANT, BEST, GREAT AND BLUNDER, EACH THE SUMMARY'S OWN. TC-R187a..d, US-R120.
//
// WHY [#550, batch 10 item (73); jobs/opponent-brilliancies-on-the-games-list-2026-09-30; Kunal's answer a9 on docs/run-questions
// build__1794388896663-q9, 11 Nov 2026: "Four numbers. Each game row shows four separate counts, Brilliant, Best, Great and Blunder, each
// matching the game summary, with Brilliant kept below Won" - his words on the card "What if you just put brilliant Best crate and
// blender"]. The row's star number added Best and Great together and the line carried a Mistake count he did not ask for.
//
// WHAT IT ASSERTS:
//  (a) TC-R187a END TO END, kunal761: the Opera game stored under his account (jsmiller1112, White) and reviewed from the games list.
//      DENOMINATOR the summary is reached and his column's Best and Great cells are read. Then the stored tally's bril, best, grt and blun
//      equal his column's Brilliant, Best, Great and Blunder - book plies kept out as the summary keeps them - and, after a reload, the
//      row prints those same numbers (gstat-best, gstat-great, gstat-blun; the brilliant pill below the result badge when it is non-zero).
//  (b) TC-R187b DISPLAY, kunal761 and se: a seeded split tally {bril 1, best 3, grt 2, mist 4, blun 1} reads '★ 3', '! 2', '?? 1', no
//      Mistake count, the '!! 1 brilliant' pill inside the badge column; and the counts line stays ONE line (every count on one top).
//  (c) TC-R187c a tally stored before the split (no best/grt) shows ONE combined '★! N' count, never a wrong split.
//  (e)..(k) TC-R187e..k WHOSE GAME [#550 item (74); jobs/games-list-card-whose-game-and-layout, second pass], kunal761 and se: every card names its
//      account (also with one account), a colour square for the side played, its own date, 'not mine' on a not-his account's cards, no 'Review'
//      word, line 2 and the counts line one line and uncut, and no card taller than on c2a816f.
// CONTROL-RECORD: c2a816f 2026-11-13 total=22 red=13 scope=block:TC-R187e-k trial:aa9cbca2cf01 how=#550 item (74): the branch tip before the card change (line 2 'acct · as White · Daily · Sep 4' cut on every card, 'Review ›' column, no date hook, no 'not mine') - e (one account reads 'Chess.com'), f, g line 2, h, i, j red at kunal761 and se, g counts line and k red at se (the estimate's counts wrap, 85.7/92.5); the e multi-account lines and the denominators green; on trial 08869263d133 22 of 22 green (the whole gate 40 of 40)
// CONTROL-RECORD: df7946d 2026-11-11 total=19 red=8 scope=trial:dc61a6344ca6 how=#550 antagonist A round 2, A2-9: the tree before the split, rerun with TC-R187d added - the estimate stores no best/grt, so both TC-R187d lines are red beside the six the record below names; on t56 (2f17c3b52792) 19 of 19 green
// CONTROL-RECORD: f4d2364 2026-11-11 total=17 red=6 scope=trial:dc61a6344ca6 how=#550 answer a9: the tree before the split, whose row reads '★ 5 ? 4 ?? 1' (Best and Great added, a Mistake count) - both TC-R187a tally/row lines, both TC-R187b split-row lines and both TC-R187c lines red; the DENOMINATORS, the pill, the one-line and zero-errors lines green; the a9 trial 105e9e214669 reads 17 pass, 0 fail
const L=require('../lib');const R=require('../drive/review');
const DAY=86400000;
const OPERA={src:'cc',acct:'jsmiller1112',pgn:R.PGN_OPERA,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'win',tc:'blitz'};
const readRow=(b,i)=>b.page.evaluate((i)=>{const r=document.querySelectorAll('[data-ct="game-row"]')[i];if(!r)return null;const t=s=>{const e=r.querySelector(s);return e?e.textContent.replace(/\s+/g,' ').trim():null;};
  const line=r.querySelector('[data-ct="gstat-rev"],[data-ct="gstat-est"]');const tops=line?[...new Set([...line.children].filter(c=>c.getBoundingClientRect().width>0).map(c=>Math.round(c.getBoundingClientRect().top)))]:[];
  const col=r.querySelector('[data-ct="game-badge-col"]');const pill=r.querySelector('[data-ct="bril-pill"],[data-ct="bril-pill-est"]');
  return {best:t('[data-ct="gstat-best"]'),great:t('[data-ct="gstat-great"]'),both:t('[data-ct="gstat-bestgreat"]'),blun:t('[data-ct="gstat-blun"]'),line:line?line.textContent.replace(/\s+/g,' ').trim():null,tops,pill:pill?pill.textContent.replace(/\s+/g,' ').trim():null,pillInCol:!!(pill&&col&&col.contains(pill))};},i);
L.run(async()=>{
  // (a) end to end
  {const store={ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':[{...OPERA,date:Date.now()-DAY}]},ct_pool:'3',ct_bril_reset_v1:'1'};
   const b=await L.launch({geo:'kunal761',name:'four-counts-e2e',store});await b.open();
   /* TC-R187d [#550 antagonist A round 2, A2-9]: THE ESTIMATE PATH. Before any review, the background pass grades the listed game with
      analyzeGameCounts (book plies kept out) and stores src 'est'; the row must print THAT tally's Best and Great, split. Read before the
      review below overwrites it - TC-R187a sees only the review's tally and R187b/c seed theirs by hand, so nothing else reaches it. */
   let est=null,estRow=null;try{await b.tile('Review');await b.settle(700);
     for(let i=0;i<60&&!est;i++){est=await b.page.evaluate(()=>{try{const g=JSON.parse(localStorage.getItem('ct_gamestats')||'{}');const k=Object.keys(g).find(x=>g[x]&&g[x].src==='est');return k?g[k]:null;}catch(e){return null;}});if(!est)await b.settle(500);}
     await b.settle(400);estRow=await readRow(b,0);}catch(e){L.note('estimate: '+String(e).slice(0,120));}
   L.say(!!est&&typeof est.best==='number'&&typeof est.grt==='number','TC-R187d DENOMINATOR the background estimate stored a SPLIT tally for the listed game (src est, best '+(est&&est.best)+', grt '+(est&&est.grt)+')',{est});
   L.say(!!est&&!!estRow&&estRow.best==='\u2605 '+est.best&&estRow.great==='! '+est.grt&&estRow.blun==='?? '+est.blun,'TC-R187d and the row prints the estimate\'s own Best, Great and Blunder ("'+(estRow&&estRow.line)+'")',{est,estRow});
   let ok=true;try{await b.page.locator('[data-ct="game-row"]').first().click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(1500);}catch(e){ok=false;L.note('e2e: '+String(e).slice(0,120));}
   const sum=ok?await b.page.evaluate(()=>{const o={};for(const d of document.querySelectorAll('[data-ct="sum-dot"]')){const row=d.parentElement&&d.parentElement.parentElement;if(!row)continue;const btn=row.querySelector('button');o[d.getAttribute('data-grade')]=btn?+btn.textContent.trim():null;}return o;}):{};
   const st=await b.page.evaluate(()=>{try{const g=JSON.parse(localStorage.getItem('ct_gamestats')||'{}');const k=Object.keys(g)[0];return k?g[k]:null;}catch(e){return null;}});
   L.say(ok&&sum.Best!=null&&sum.Great!=null&&sum.Brilliant!=null&&sum.Blunder!=null,'TC-R187a DENOMINATOR the Opera review summary is reached and his column is read: '+JSON.stringify(sum),{sum});
   L.say(!!st&&st.src==='review'&&st.best===sum.Best&&st.grt===sum.Great&&st.bril===sum.Brilliant&&st.blun===sum.Blunder,'TC-R187a the stored tally is the summary\'s own: best '+(st&&st.best)+'/'+sum.Best+', great '+(st&&st.grt)+'/'+sum.Great+', brilliant '+(st&&st.bril)+'/'+sum.Brilliant+', blunder '+(st&&st.blun)+'/'+sum.Blunder,{st,sum});
   let r=null;try{await b.page.reload();await b.settle(1500);await b.tile('Review');await b.settle(1200);r=await readRow(b,0);}catch(e){L.note('reload: '+String(e).slice(0,120));}
   L.say(!!r&&!!st&&r.best==='★ '+st.best&&r.great==='! '+st.grt&&r.blun==='?? '+st.blun&&(st.bril>0?(!!r.pill&&r.pill.startsWith('!! '+st.bril)&&r.pillInCol):!r.pill),'TC-R187a and the row prints those numbers: '+JSON.stringify(r&&{best:r.best,great:r.great,blun:r.blun,pill:r.pill}),{r,st});
   L.say(b.errs.length===0,'TC-R187a zero app errors',b.errs.slice(0,3));
   await b.close();}
  // (b)+(c) display, seeded
  const mk=(n,d)=>({src:'cc',acct:'alpha',white:'Alpha',black:'opp'+n,wr:'win',tc:'blitz',date:d,pgn:'[White "Alpha"]\n[Black "opp'+n+'"]\n[Result "1-0"]\n\n1. e4 e5 1-0'});
  const g1=mk(1,1757000001000),g2=mk(2,1757000002000);const gk=g=>g.src+':'+g.date+':'+g.white+':'+g.black;
  const TALLY={[gk(g1)]:{bril:1,great:5,best:3,grt:2,inacc:0,mist:4,blun:1,src:'review'},[gk(g2)]:{bril:0,great:4,inacc:0,mist:1,blun:2,src:'review'}};
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'four-counts-'+geo,store:{ct_ccuser:'',ct_liuser:'',ct_accts:['cc:alpha'],ct_acctgames:{'cc:alpha':[g2,g1]},ct_gamestats:TALLY}});await b.open();
    try{await b.tile('Review');await b.settle(1200);}catch(e){L.note(geo+' open: '+String(e).slice(0,100));}
    const rows=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="game-row"]')].map(r=>r.innerText.replace(/\s+/g,' ')));
    const i1=rows.findIndex(t=>/opp1\b/.test(t)),i2=rows.findIndex(t=>/opp2\b/.test(t));
    const a=i1>=0?await readRow(b,i1):null,c=i2>=0?await readRow(b,i2):null;
    L.say(!!a&&!!c,geo+': TC-R187b DENOMINATOR both seeded rows are on the list ('+rows.length+' rows)',{rows});
    L.say(!!a&&a.best==='★ 3'&&a.great==='! 2'&&a.blun==='?? 1'&&!/\? 4\b/.test(a.line||''),geo+': TC-R187b the split row reads ★ 3, ! 2, ?? 1 and no Mistake count ("'+(a&&a.line)+'")',{a});
    L.say(!!a&&!!a.pill&&a.pill.startsWith('!! 1')&&a.pillInCol,geo+': TC-R187b its Brilliant count is the pill below the result badge ("'+(a&&a.pill)+'")',{a});
    L.say(!!a&&a.tops.length===1,geo+': TC-R187b the counts line is ONE line (child tops '+JSON.stringify(a&&a.tops)+')',{a});
    L.say(!!c&&c.both==='★! 4'&&c.best==null&&c.great==null&&c.blun==='?? 2',geo+': TC-R187c a tally stored before the split shows one combined "★! 4" count, never a guessed split ("'+(c&&c.line)+'")',{c});
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // (e)..(k) TC-R187e..k WHOSE GAME, AND A CARD THAT IS NOT CUT [#550 item (74); jobs/games-list-card-whose-game-and-layout, second pass].
  // Three accounts (two his, peter-patzer marked NOT his), five games, three tallies (one large, on a not-mine card). Every card is located
  // by its OPPONENT'S name in its text, and its expected account, side and date come from the fixture, never from the card.
  // Pre-change heights with THIS fixture, measured on the branch tip c2a816f (trial aa9cbca2cf01): every card 85.7px at kunal761; at se
  // 85.7 (tallied by review) and 92.5 (the estimate's counts wrapping in 106px). Line 2 was cut by an ellipsis on all five cards at both
  // geometries (268..290px of text in 161px at 375 and 106px at 320).
  {const PRE={kunal761:85.7,se:92.5};
   const D0=1757000000000;
   const mk=(acct,opp,col,wr,tc,d)=>({src:'cc',acct,white:col==='w'?acct:opp,black:col==='w'?opp:acct,wr,tc,date:d,pgn:'[White "'+(col==='w'?acct:opp)+'"]\n[Black "'+(col==='w'?opp:acct)+'"]\n[Result "1-0"]\n\n1. e4 e5 1-0'});
   const GAMES={'cc:kunal2023':[mk('kunal2023','DukeKarlCountIsouard99','w','win','daily',D0+5e6),mk('kunal2023','Shortname','b','win','blitz',D0+4e6-40*DAY)],
     'cc:kunalschess':[mk('kunalschess','Abcdefghijklmnopqrstuvwxy','b','agreed','rapid',D0+3e6-90*DAY)],
     'cc:peter-patzer':[mk('peter-patzer','Kevitsch','w','resigned','bullet',D0+2e6-150*DAY),mk('peter-patzer','Xopp','b','timeout','daily',D0+1e6-200*DAY)]};
   const ALL=Object.entries(GAMES).flatMap(([id,gs])=>gs.map(g=>({...g,id,opp:g.white===g.acct?g.black:g.white,col:g.white===g.acct?'w':'b',mine:id!=='cc:peter-patzer'})));
   const T={[gk(ALL[0])]:{bril:2,great:9,best:5,grt:4,inacc:1,mist:2,blun:1,src:'review'},[gk(ALL[3])]:{bril:1,great:37,best:25,grt:12,mist:6,blun:10,src:'review'}};
   const readCards=(b)=>b.page.evaluate((ALL)=>[...document.querySelectorAll('[data-ct="game-row"]')].map(row=>{
     const txt=row.innerText.replace(/\s+/g,' ');const g=ALL.find(x=>new RegExp('vs\\s'+x.opp+'(\\s|$|…)').test(txt)||txt.includes('vs '+x.opp.slice(0,6)));
     const q=s=>row.querySelector(s);const sub=q('[data-ct="game-sub"]'),src=q('[data-ct="game-src"]'),sq=q('[data-ct="game-color"]'),dt=q('[data-ct="game-date"]'),nm=q('[data-ct="game-notmine"]');
     const cnt=q('[data-ct="gstat-rev"],[data-ct="gstat-est"],[data-ct="gstat-slot"]');
     const lines=(e)=>{if(!e)return 0;const rg=document.createRange();rg.selectNodeContents(e);const c=[...rg.getClientRects()].filter(x=>x.width>0).map(x=>(x.top+x.bottom)/2).sort((a,b)=>a-b);let n=0,l=-1e9;for(const y of c){if(y-l>6){n++;l=y;}}return n;};
     const rr=row.getBoundingClientRect(),inRow=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.left>=rr.left-0.5&&r.right<=rr.right+0.5&&r.top>=rr.top-0.5&&r.bottom<=rr.bottom+0.5;};
     // a visible 'Review' WORD: any element with its own text 'Review' painted wider than a 1px screen-reader-only box
     const word=[...row.querySelectorAll('*')].some(e=>[...e.childNodes].some(n=>n.nodeType===3&&/Review/.test(n.textContent))&&e.getBoundingClientRect().width>2);
     const kids=cnt?[...cnt.children].filter(c=>c.getBoundingClientRect().width>0):[];
     return {opp:g?g.opp:null,acct:src?src.textContent.trim():null,sq:sq?sq.getAttribute('data-color'):null,sqW:sq?+sq.getBoundingClientRect().width.toFixed(1):0,
       side:/as (White|Black)/.test(txt),date:dt?dt.textContent.trim():null,dateIn:inRow(dt),nm:!!nm&&nm.getBoundingClientRect().width>0,nmFirst:!!nm&&kids[0]===nm,
       sub:sub?{sw:sub.scrollWidth,cw:sub.clientWidth,lines:lines(sub),t:sub.textContent}:null,cnt:cnt?{sw:cnt.scrollWidth,cw:cnt.clientWidth,tops:lines(cnt),t:cnt.textContent.replace(/\s+/g,' ').trim()}:null,
       word,go:!!q('[data-ct="game-go"]')&&inRow(q('[data-ct="game-go"]')),h:+rr.height.toFixed(1)};}),ALL);
   for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'whose-game-'+geo,store:{ct_ccuser:'',ct_liuser:'',ct_accts:Object.keys(GAMES),ct_acctgames:GAMES,ct_gamestats:T,ct_acctmine:{'cc:peter-patzer':false},ct_acctasked:{'cc:kunal2023':1,'cc:kunalschess':1,'cc:peter-patzer':1}}});await b.open();
    try{await b.tile('Review');await b.settle(1500);}catch(e){L.note(geo+' open: '+String(e).slice(0,100));}
    const C=await readCards(b);const byOpp=Object.fromEntries(C.filter(c=>c.opp).map(c=>[c.opp,c]));
    L.say(C.length===5&&ALL.every(g=>byOpp[g.opp]),geo+': TC-R187e DENOMINATOR all five fixture games are on the list, each found by its opponent ('+C.length+' rows: '+C.map(c=>c.opp).join(', ')+')',{C});
    L.say(ALL.every(g=>byOpp[g.opp]&&byOpp[g.opp].acct===g.acct),geo+': TC-R187e every card names the account that played it ('+C.map(c=>c.opp+'->'+c.acct).join('; ')+')',C.map(c=>[c.opp,c.acct]));
    L.say(ALL.every(g=>byOpp[g.opp]&&byOpp[g.opp].sq===g.col&&byOpp[g.opp].sqW>4)&&C.every(c=>!c.side),geo+': TC-R187f each card shows a colour square for the side its account played, in place of the words "as White"/"as Black" ('+C.map(c=>c.opp+':'+c.sq).join(' ')+')',C.map(c=>[c.opp,c.sq,c.sqW,c.side]));
    L.say(C.length>0&&C.every(c=>c.sub&&c.sub.lines===1&&c.sub.sw<=c.sub.cw),geo+': TC-R187g line 2 (square, account, time control) is ONE line and is NOT cut on any card ('+C.map(c=>c.sub&&(c.sub.sw+'/'+c.sub.cw)).join(' ')+')',C.map(c=>c.sub));
    L.say(C.length>0&&C.every(c=>c.cnt&&c.cnt.tops<=1&&c.cnt.sw<=c.cnt.cw),geo+': TC-R187g the counts line is ONE line and not cut on any card, including "not mine" beside the largest tally ('+C.map(c=>c.cnt&&('"'+c.cnt.t+'" '+c.cnt.sw+'/'+c.cnt.cw)).join('; ')+')',C.map(c=>c.cnt));
    const want=g=>new Date(g.date).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    const dates=await b.page.evaluate((ds)=>ds.map(d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric'})),ALL.map(g=>g.date));
    L.say(ALL.every((g,i)=>byOpp[g.opp]&&byOpp[g.opp].date===dates[i]&&byOpp[g.opp].dateIn),geo+': TC-R187h each card shows its own date, inside the card ('+C.map(c=>c.opp+':'+c.date).join(' ')+')',{dates,C:C.map(c=>[c.opp,c.date,c.dateIn])});
    L.say(ALL.filter(g=>!g.mine).length===2&&ALL.every(g=>byOpp[g.opp]&&byOpp[g.opp].nm===!g.mine&&(g.mine||byOpp[g.opp].nmFirst)),geo+': TC-R187i exactly the two peter-patzer cards (the account marked not his) say "not mine", at the head of the counts line, tallied or not ('+C.filter(c=>c.nm).map(c=>c.opp).join(', ')+')',C.map(c=>[c.opp,c.nm,c.nmFirst]));
    L.say(C.length>0&&C.every(c=>!c.word&&c.go),geo+': TC-R187j no card spends its width on the word "Review": a chevron inside the card instead (the whole card is the button)',C.map(c=>[c.opp,c.word,c.go]));
    const hs=C.map(c=>c.h);
    L.say(C.length>0&&Math.max(...hs)<=PRE[geo]+0.5&&Math.max(...hs)-Math.min(...hs)<=1,geo+': TC-R187k no card is taller than before ('+PRE[geo]+'px measured on c2a816f) and every card is one height ('+[...new Set(hs)].join(', ')+')',{hs});
    L.say(b.errs.length===0,geo+': TC-R187e zero app errors',b.errs.slice(0,3));
    await b.close();}
   // ONE ACCOUNT: the card names it too (it used to read the site, 'Chess.com', whenever only one account was imported)
   {const one={'cc:kunal2023':GAMES['cc:kunal2023']};
    const b=await L.launch({geo:'kunal761',name:'whose-game-one',store:{ct_ccuser:'',ct_liuser:'',ct_accts:['cc:kunal2023'],ct_acctgames:one,ct_acctasked:{'cc:kunal2023':1}}});await b.open();
    try{await b.tile('Review');await b.settle(1200);}catch(e){L.note('one open: '+String(e).slice(0,100));}
    const C=await readCards(b);
    L.say(C.length===2&&C.every(c=>c.acct==='kunal2023'),'kunal761 one account: TC-R187e the card names the account even when it is the only one imported, not the site ('+C.map(c=>c.acct).join(', ')+')',C.map(c=>[c.opp,c.acct]));
    await b.close();}
  }
},'106-games-list-four-counts');
