// regress/19-review-grade-counts.js  #464, jobs/review-grade-counts-vs-the-moves-they-name, case TC-R30,
// story US-R20. THE NUMBER ON THE SUMMARY AND THE MOVES IT NAMES MUST BE COMPUTED BY ONE RULE.
//
// WHAT IT GUARDS. The grade counter reassigns every ply below the opening-book prefix to Book. Two other
// consumers presented the same ply and did not know: the summary row's jump handler matched on cls.label, and
// the per-ply verdict chip painted cls.label directly. So on any game with a book prefix - 5 of 7 real games,
// per the benchmark - 'Best 5' navigated to a move the same table counted under Book, walking the moves showed
// 8 white moves badged Best against a 5 on the summary, and the Book row could never match anything so its
// number was a dead control rendering identically to the nine that work.
//
// THE TWO CLAUSES, both from the case, zero tolerance:
//   (a) for every rendered grade row, the displayed count equals the number of plies the MOVE SCREEN badges with
//       that same grade for that side - COUNTED FROM THE PAINTED BADGES, never from a fixture constant;
//   (b) for every rendered row whose count is > 0 and which is not disabled, a real click changes the view away
//       from the summary AND lands on a ply whose painted badge equals that row's label.
//
// HOW THE BADGE IS LOCATED, AND WHY NOT BY A data-ct. #432's rule: an assertion keyed to a hook its own build
// adds cannot be controlled, and its control will look like it worked - run against the old bundle the selector
// returns null, and a null reads as "the defect is absent". The verdict chip carries NO data-ct on main and this
// build does not give it one. The badge is therefore found by WHAT IT SAYS: the span inside rev-move-line whose
// text is one of the ten grade names, optionally behind its 1-2 character icon. 'Miss' is tested before
// 'Mistake' and by endsWith, so '?Mistake' cannot be read as a Miss - gate 33's own warning, earned.
//
// WHY THE BOOK PREFIX IS MEASURED AND NEVER ASSUMED. openingBookPlies reads the lesson library's lines, so a
// fixture's book length is a property of a table that can change under this gate. Pinning "the Opera Game has 4
// book plies" would make the gate go red the day a line is edited and would teach the next reader to loosen it.
// So every fixture REPORTS the prefix it measured (the two painted Book counts) and the clauses are asserted
// whatever it is. The anti-vacuity guard is separate and explicit: assertion Z requires that across the run at
// least one fixture measured a prefix of ZERO and at least one measured a prefix ABOVE zero, so a green can
// never mean "the book path was never entered". That is the #405 frozen-denominator lesson applied to a fixture
// set rather than to a count.
//
// FIXTURES, and the first is the negative control the case asks for:
//   NOBOOK   28 plies of single-step pawn moves from 1.a3 a6. Measured: no line in the library starts with a3,
//            so the prefix is 0 and BOTH clauses must be green here even on the broken bundle - which is what
//            proves this gate measures the book reassignment and not merely that something is red everywhere.
//   OPERA    the Opera Game, the fixture the defect was measured on at #422.
//   EVANS    19 plies of the Evans Gambit main line plus 3, so the prefix is long and spans both sides heavily.
//
// NEGATIVE CONTROL, RUN THIS BUILD: CT_APP=<main's app.js> on the same gate. Expected RED on OPERA and EVANS
// (clause (a) disagrees and the Book row's click leaves the view on the summary) and GREEN on NOBOOK.
'use strict';
const path=require('path');
const L=require('../lib');

const LBL=['Brilliant','Great','Best','Excellent','Good','Book','Inaccuracy','Miss','Mistake','Blunder'];

const FIX={
  NOBOOK:'[Event "No book"] [White "A"] [Black "B"] [WhiteElo "1500"] [BlackElo "1500"] [Result "*"] 1. a3 a6 2. b3 b6 3. c3 c6 4. d3 d6 5. e3 e6 6. f3 f6 7. g3 g6 8. h3 h6 9. Bb2 Bb7 10. Bg2 Bg7 11. Nf3 Nf6 12. Nc3 Nc6 13. Qc2 Qc7 14. O-O-O O-O *',
  OPERA:'[Event "Opera Game"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0',
  EVANS:'[Event "Evans"] [White "A"] [Black "B"] [WhiteElo "1800"] [BlackElo "1800"] [Result "*"] 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. cxd4 d5 9. exd5 Nxd5 10. Ba3 Be6 11. Re1 O-O *',
};

// the number of plies in a PGN, counted off the movetext, so the walk covers every one of them
function plyCount(pgn){
  const mt=pgn.replace(/\[[^\]]*\]/g,' ').replace(/\{[^}]*\}/g,' ');
  const toks=mt.split(/\s+/).filter(t=>t&&!/^\d+\.*$/.test(t)&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  return toks.length;
}

// The painted badge on the move screen for whatever ply is showing. Located by its TEXT, per #432.
const BADGE=(labels)=>{
  const row=document.querySelector('[data-ct="rev-move-line"]');
  if(!row)return {err:'no rev-move-line'};
  const spans=Array.prototype.slice.call(row.querySelectorAll('span'));
  for(const s of spans){
    const t=(s.textContent||'').replace(/\s+/g,'').trim();
    if(!t)continue;
    for(const l of labels){
      if(t===l)return {label:l,raw:t};
      if(t.length-l.length<=2&&t.length>l.length&&t.slice(-l.length)===l)return {label:l,raw:t};
    }
  }
  return {err:'no badge',txt:(row.innerText||'').replace(/\s+/g,' ').slice(0,120)};
};

// The move-number token the row paints for the ply it is showing ("12." or "12…"), so the WALK itself can be
// proved exact. Without this a click that fails to advance makes the gate read one ply twice and miss another,
// which redistributes the tally and reads EXACTLY like the defect under test. #416's rule: check the control
// moved the quantity the assertion reads.
const MOVENO=()=>{
  const row=document.querySelector('[data-ct="rev-move-line"]');
  if(!row)return null;
  const m=(row.innerText||'').match(/(\d+)\s*(\.|\u2026)/);
  return m?(m[1]+(m[2]==='.'?'w':'b')):null;
};

// the ten rows of the summary table: label -> per side {n, disabled}
const ROWS=(labels)=>{
  const s=document.querySelector('[data-ct="rev-summary"]');
  if(!s)return {err:'no rev-summary'};
  const out={};
  // Each row paints its label then exactly two buttons, White then Black. Find the row by its own text.
  const grids=Array.prototype.slice.call(s.querySelectorAll('div'));
  for(const l of labels){
    for(const g of grids){
      const btns=Array.prototype.slice.call(g.querySelectorAll('button'));
      if(btns.length!==2)continue;
      const first=(g.firstElementChild&&g.firstElementChild.textContent||'').replace(/\s+/g,'').trim();
      if(first!==l)continue;
      out[l]=btns.map(b=>({n:parseInt((b.textContent||'').trim(),10),disabled:!!b.disabled}));
      break;
    }
  }
  return out;
};

async function openReview(b,pgn){
  await b.open();
  await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
  await b.open();
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(pgn);
  await b.tapText(/^⚡ Analyze Game$/,{wait:200});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
  await b.settle(700);
}

async function backToSummary(b){
  const bk=b.page.locator('[data-ct="rev-back"]').first();
  if(await bk.count().catch(()=>0)){await bk.click({timeout:4000}).catch(()=>{});}
  else{await b.tapText(/^Summary$/,{wait:200}).catch(()=>{});}
  await b.settle(260);
  return await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-summary"]'));
}

async function runFixture(geo,name,pgn,acc){
  const tag=name+'-'+geo;
  const n=plyCount(pgn);
  const b=await L.launch({geo,name:'rgc-'+tag,store:{ct_pool:'3'}});
  await openReview(b,pgn);

  const rows=await b.page.evaluate(ROWS,LBL);
  const okRows=!rows.err&&LBL.every(l=>Array.isArray(rows[l]));
  L.say(okRows,tag+' A1 the summary paints all ten grade rows with two numbers each'+(rows.err?' ('+rows.err+')':''));
  if(!okRows){await b.close();return null;}

  const bookPrefix=(rows.Book[0].n||0)+(rows.Book[1].n||0);
  L.say(Number.isInteger(bookPrefix),tag+' A2 MEASURED book prefix from the painted Book counts = '+bookPrefix+' (w '+rows.Book[0].n+' b '+rows.Book[1].n+'), over '+n+' plies');
  acc.prefixes.push({tag,bookPrefix});

  // ---- clause (b) FIRST, while the summary is the live view ----
  let bTested=0,bBad=[];
  for(const l of LBL){
    for(let sd=0;sd<2;sd++){
      const r=rows[l][sd];
      if(!(r.n>0)||r.disabled)continue;
      const back=await backToSummary(b);
      if(!back){bBad.push(l+'/'+(sd?'b':'w')+': could not return to the summary');continue;}
      // locate the button the same way a reader does: the row whose own first cell says this label, then its
      // White or Black button. No index arithmetic over a flat button list, which would silently follow a
      // row-order change rather than go red on it.
      const clicked=await b.page.evaluate(({l,sd})=>{
        const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return false;
        const grids=Array.prototype.slice.call(s.querySelectorAll('div'));
        for(const g of grids){
          const bs=Array.prototype.slice.call(g.querySelectorAll('button'));
          if(bs.length!==2)continue;
          const first=(g.firstElementChild&&g.firstElementChild.textContent||'').replace(/\s+/g,'').trim();
          if(first!==l)continue;
          bs[sd].click();return true;
        }
        return false;
      },{l,sd});
      if(!clicked){bBad.push(l+'/'+(sd?'b':'w')+': row button not found');continue;}
      await b.settle(420);
      bTested++;
      const left=await b.page.evaluate(()=>!document.querySelector('[data-ct="rev-summary"]'));
      if(!left){bBad.push(l+'/'+(sd?'b':'w')+' n='+r.n+': the click left the view on the summary (dead control)');continue;}
      const bg=await b.page.evaluate(BADGE,LBL);
      if(bg.label!==l)bBad.push(l+'/'+(sd?'b':'w')+' n='+r.n+': landed on a ply badged '+(bg.label||('['+(bg.err||'?')+' '+(bg.txt||'')+']')));
    }
  }
  L.say(bTested>0,tag+' B0 at least one enabled grade row was actually clicked (clicked '+bTested+')');
  L.say(bBad.length===0,tag+' B1 clause (b): every enabled grade row navigates to a ply badged with its own label'+(bBad.length?' -- '+bBad.join(' | '):''));

  // ---- clause (a): walk every ply and tally the PAINTED badges ----
  await backToSummary(b);
  await b.tapText(/^Start review/,{wait:900}).catch(()=>{});
  await b.page.locator('[aria-label="First move"]').first().click({timeout:6000}).catch(()=>{});
  await b.settle(380);
  // THE WALK LENGTH IS MEASURED, NOT TAKEN FROM THE PGN, AND THE FIRST VERSION OF THIS GATE GOT THAT WRONG IN A
  // WAY THAT LOOKED EXACTLY LIKE THE DEFECT. It stepped Next the PGN's own ply count times. The review covers
  // FEWER plies than some PGNs carry (measured this build: 20 of NOBOOK's 28 and 21 of EVANS's 22), so the last
  // click did nothing, the row went on showing the final ply, and the gate read that one badge eight more times.
  // Excellent/w read 2 on the summary against 6 "badged" - a 4-apart disagreement with real numbers, on the
  // ZERO-BOOK fixture where the code under test cannot have any effect. Believing it would have filed the app
  // for a fault in the gate's own stepping. So: step until the painted move number STOPS CHANGING, count the
  // plies actually visited, and refuse to tally a ply twice.
  const tally={};for(const l of LBL)tally[l]=[0,0];
  const missing=[],dup=[];
  const seen=Object.create(null);
  let visited=0,last=null;
  for(let i=1;i<=n+2;i++){
    const mvBefore=await b.page.evaluate(MOVENO);
    await b.page.locator('[aria-label="Next move"]').first().click({timeout:6000}).catch(()=>{});
    await b.page.waitForTimeout(150);
    let mv=await b.page.evaluate(MOVENO);
    if(mv===mvBefore){await b.page.waitForTimeout(320);mv=await b.page.evaluate(MOVENO);}
    if(mv===null||mv===mvBefore)break;          // the review has no further ply: the walk is over
    if(seen[mv]){dup.push('the row showed '+mv+' twice');break;}
    seen[mv]=1;last=mv;visited++;
    const bg=await b.page.evaluate(BADGE,LBL);
    const sd=/w$/.test(mv)?0:1;                 // the side comes from the PAINTED move number, not from a counter
    if(bg.label&&tally[bg.label])tally[bg.label][sd]++;
    else missing.push(mv+': '+(bg.err||'?')+' '+(bg.txt||''));
  }
  L.say(missing.length===0,tag+' A3 every one of the '+visited+' reviewed plies paints a badge this gate can read'+(missing.length?' -- '+missing.slice(0,3).join(' | '):''));
  L.say(dup.length===0&&visited>0,tag+' A3b THE WALK IS EXACT: '+visited+' distinct plies visited, none twice, last '+last+' (the PGN carries '+n+')'+(dup.length?' -- '+dup.join(' | '):''));
  // The summary must account for every reviewed ply exactly once. This is what makes A4 a real comparison
  // rather than two tallies over different populations - the trap the first version fell into.
  const sumAll=LBL.reduce((t,l)=>t+(rows[l][0].n||0)+(rows[l][1].n||0),0);
  L.say(sumAll===visited,tag+' A3c the summary accounts for every reviewed ply exactly once: its twenty counts sum to '+sumAll+' against '+visited+' plies walked');
  const dis=[];
  for(const l of LBL)for(let sd=0;sd<2;sd++){
    if(rows[l][sd].n!==tally[l][sd])dis.push(l+'/'+(sd?'b':'w')+': summary says '+rows[l][sd].n+', the moves badge '+tally[l][sd]);
  }
  L.say(dis.length===0,tag+' A4 clause (a): all 20 grade counts equal the badges the move screen paints'+(dis.length?' -- '+dis.join(' | '):''));
  acc.checked.push({tag,bookPrefix,clauseA:dis.length===0,clauseB:bBad.length===0,plies:n});
  const errs=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(errs.length===0,tag+' A5 no page errors during the walk'+(errs.length?' -- '+errs.slice(0,2).join(' | '):''));
  await b.close();
  return {bookPrefix};
}

L.run(async()=>{
  const acc={prefixes:[],checked:[]};
  // 375x730 is Kunal's phone and is where the defect was measured; 320x568 is the narrow column, run on the
  // long-book fixture because that is the one whose Book row is largest and whose rows are most crowded.
  await runFixture('kunal730','NOBOOK',FIX.NOBOOK,acc);
  await runFixture('kunal730','OPERA', FIX.OPERA, acc);
  await runFixture('kunal730','EVANS', FIX.EVANS, acc);
  await runFixture('se',     'EVANS', FIX.EVANS, acc);

  // THE ANTI-VACUITY GUARD. A green here must mean the book path was entered AND the no-book path was entered.
  const zero=acc.prefixes.filter(p=>p.bookPrefix===0);
  const some=acc.prefixes.filter(p=>p.bookPrefix>0);
  L.say(zero.length>0,'Z1 at least one fixture measured a book prefix of ZERO (the control half) -- '+JSON.stringify(zero));
  L.say(some.length>0,'Z2 at least one fixture measured a book prefix ABOVE zero (the half the defect lives in) -- '+JSON.stringify(some));
  L.say(acc.checked.length===4,'Z3 all four fixture runs completed and were asserted over (got '+acc.checked.length+')');
  L.done();
});
