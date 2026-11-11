'use strict';
// gates/regress/106-games-list-four-counts.js - EACH GAMES-LIST ROW SHOWS BRILLIANT, BEST, GREAT AND BLUNDER, EACH THE SUMMARY'S OWN. TC-R187a..c, US-R120.
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
   let ok=true;try{await b.tile('Review');await b.settle(700);await b.page.locator('[data-ct="game-row"]').first().click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(1500);}catch(e){ok=false;L.note('e2e: '+String(e).slice(0,120));}
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
},'106-games-list-four-counts');
