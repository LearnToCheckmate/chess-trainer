// regress/186-book-ends-at-a-blunder.js  #553, batch 14 entry 26,
// jobs/a-lesson-library-book-move-that-allows-mate-is-graded-book-and-praised-2026-11-19, story US-R189, case TC-R270.
//
// THE DEFECT. The Review's Book prefix is how far a game follows a lesson line (lessons.js OPENINGS) or reaches a named opening position
// (gates/opening-book, BOOK_POS). The lesson library teaches TRAPS, so a move that loses the game was inside the prefix: in the Scholar's
// Mate game (1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#) the eval bar read M1 while 3...Nf6 was badged Book, its line read "An opening move
// (Scholar's Mate). It attacks your queen...", the summary counted Black Blunder 0 / Book 3 and left Black NOT SCORED.
// THE FIX (chess.jsx bookSound): the prefix ends at the first ply the engine grades Mistake, Blunder or Miss; that ply shows its grade and
// every later ply is graded as an ordinary move. No grade, band or threshold changed.
//
// TWO PARTS.
//  N (node, no browser): EVERY CASE THE MEASUREMENT FOUND. gates/measure-book-blunders.js walked both books the Review reads (the lesson
//    library and the 3,865 named-position lines) with the app's own engine, and wrote the engine's numbers for every lesson line and every
//    table line holding a case to gates/fixtures/book-breaks.json. Here each line is RE-GRADED by the shipped sfGradePly (engine-extract)
//    on those numbers, its Book prefix is the shipped openingBookPlies (table on, as shipped) cut by the shipped bookSound, and for every
//    ply the shipped grader calls Mistake/Blunder/Miss inside the uncut prefix it is asserted (N1) the cut prefix ends at or before it
//    and its presented grade (effLabel) is the engine's, never Book; (N2) every ply before the line's first such ply stays Book (or its
//    own Brilliant/Great/Forced); (N3) every lesson line with no such ply keeps its WHOLE prefix as Book - the positions that must stay
//    Book; (N4) the case count is the measurement's own, and the mate-allowing cases (the job's title) are each a mate score after the
//    move, verified from the board where it is a mate in one.
//  B (browser): the WIRING, on Kunal's phone (kunal761, 375x761 with insets 51/31) and 320x568. The Scholar's Mate game reviewed: 3...Nf6
//    is badged Blunder and its line does not say "An opening move"; 4.Qxf7# is not Book; plies 1-5 are Book; the summary counts Black
//    Blunder 1 and Book 2, White Book 3, and Black is scored. And a sound book line (the Italian, 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5) stays Book
//    on all six plies.
// CT_186_NODE_ONLY=1 runs part N alone; CT_186_GEOS=kunal761,se picks the geometries of part B.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const E=require('../engine-extract');
const FIX=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','book-breaks.json'),'utf8'));
const OPENINGS=(()=>{const g={};const prev=global.window;global.window=g;const LJ=path.join(__dirname,'..','..','lessons.js');
  try{delete require.cache[require.resolve(LJ)];}catch(e){}try{require(LJ);}finally{global.window=prev;}return (g.CTLESSONS&&g.CTLESSONS.OPENINGS)||[];})();
const BREAKS=['Mistake','Blunder','Miss'];   // the job's close condition, typed HERE and not read from chess.jsx's BOOK_BREAKS (the thing under test)
const EXEMPT=['Brilliant','Great','Forced'];

function partN(){
  console.log('# part N: '+FIX.lines.length+' lines from '+FIX.about);
  let cases=0,mates=0,bad1=[],bad2=[],bad3=[],sound=0,m1bad=[];
  for(const ln of FIX.lines){
    const res=E.loadSANs(ln.sans);if(!res||res.plies.length!==ln.sans.length){bad1.push(ln.line+': did not load');continue;}
    const N=ln.sans.length;
    const rows=[];for(let i=0;i<N;i++)rows.push(E.sfGradePly(res.positions[i],res.plies[i].move,ln.evW[i],ln.evW[i+1],ln.ev2W[i],ln.bU[i],ln.aU[i],null,undefined,false,E.gradeHist(res,ln.evW,ln.bU,i)));
    const raw=E.openingBookPlies(res.plies.map(p=>p.san),res.positions,OPENINGS,1);
    const cut=E.bookSound(raw,(i)=>rows[i]&&rows[i].cls.label);
    let first=-1;for(let i=0;i<Math.min(raw,N);i++)if(BREAKS.indexOf(rows[i].cls.label)>=0){first=i;break;}
    for(let i=0;i<Math.min(raw,N);i++){const lab=rows[i].cls.label;if(BREAKS.indexOf(lab)<0)continue;cases++;
      const shown=E.effLabel(rows[i].cls,i,cut);
      if(!(cut<=i&&shown===lab))bad1.push(ln.line+' ply '+(i+1)+' '+res.plies[i].san+': engine '+lab+', shown '+shown+' (book '+cut+' of '+raw+')');
      if(E.matesMover(ln.evW[i+1],res.positions[i].turn,ln.evW[i])){mates++;
        // from the board: where the mate is in one, the reply that mates is legal
        const mIn=Math.abs(ln.evW[i+1])>=90000?Math.round((100000-Math.abs(ln.evW[i+1]))/100):null;
        if(mIn===1){const p=res.positions[i+1];if(!E.getLegal(p).some(mv=>E.getStatus(E.makeMove(p,mv))==='checkmate'))m1bad.push(ln.line+' ply '+(i+1)+': the engine says mate in one, no legal reply mates');}}}
    const keep=first<0?Math.min(raw,N):first;
    for(let i=0;i<keep;i++){const lab=rows[i].cls.label,shown=E.effLabel(rows[i].cls,i,cut);
      if(!(shown==='Book'||(EXEMPT.indexOf(lab)>=0&&shown===lab)))(first<0?bad3:bad2).push(ln.line+' ply '+(i+1)+' '+res.plies[i].san+': shown '+shown+' (engine '+lab+', book '+cut+' of '+raw+')');}
    if(first<0&&ln.src==='lesson'){sound++;if(cut!==raw)bad3.push(ln.line+': book '+cut+' of '+raw+' with no Mistake/Blunder/Miss in it');}
  }
  L.say(cases===FIX.cases&&FIX.cases>0,'TC-R270 N0 the measured cases are all here: '+cases+' book plies the shipped grader calls Mistake/Blunder/Miss (the measurement found '+FIX.cases+', '+FIX.mates+' allowing a forced mate)',{cases,want:FIX.cases});
  L.say(bad1.length===0&&cases>0,'TC-R270 N1 every one of the '+cases+' is shown with the engine\'s grade and the book ends at or before it - none is Book'+(bad1.length?' -- '+bad1.slice(0,4).join(' | '):''),{bad:bad1.slice(0,20)});
  L.say(mates>=FIX.mates&&FIX.mates>0&&m1bad.length===0,'TC-R270 N1m '+mates+' of them allow a forced mate (a mate score against the mover after the move, none before); every mate in one is a legal mating reply on the board'+(m1bad.length?' -- '+m1bad.join(' | '):''),{mates,m1bad});
  L.say(bad2.length===0,'TC-R270 N2 on those lines every ply before the first such move stays Book (or its own Brilliant/Great/Forced)'+(bad2.length?' -- '+bad2.slice(0,4).join(' | '):''),{bad:bad2.slice(0,20)});
  L.say(sound>=20&&bad3.length===0,'TC-R270 N3 the '+sound+' lesson lines with no such move keep their whole Book prefix, every ply Book (or its own Brilliant/Great/Forced) - the positions that must stay Book'+(bad3.length?' -- '+bad3.slice(0,4).join(' | '):''),{bad:bad3.slice(0,20)});
}

// ---- part B ----
const SCHOLAR='[Event "Scholar"] [White "A"] [Black "B"] [WhiteElo "1200"] [BlackElo "1200"] [Result "1-0"] 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
const ITALIAN='[Event "Italian"] [White "A"] [Black "B"] [WhiteElo "1500"] [BlackElo "1500"] [Result "*"] 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *';
const LBL=[...L.GRADES,'Forced'];
const BADGE=(labels)=>{const row=document.querySelector('[data-ct="rev-move-line"]');if(!row)return {err:'no rev-move-line'};
  for(const s of row.querySelectorAll('span')){const t=(s.textContent||'').replace(/\s+/g,'').trim();if(!t)continue;
    for(const l of labels){if(t===l||(t.length>l.length&&t.length-l.length<=2&&t.slice(-l.length)===l))return {label:l,line:(row.innerText||'').replace(/\s+/g,' ').trim()};}}
  /* at 320 the chip drops its word when the row is tight and keeps the grade's icon alone (measured: '3… Nf6 ?? g6'); the chip names its
     grade in its own aria-label and title (chess.jsx, the rev-move-line verdict chip, there since before this build), so read that then */
  for(const s of row.querySelectorAll('span[aria-label]')){const a=s.getAttribute('aria-label');if(labels.indexOf(a)>=0&&s.getAttribute('title')===a)return {label:a,byName:true,line:(row.innerText||'').replace(/\s+/g,' ').trim()};}
  return {err:'no badge',line:(row.innerText||'').replace(/\s+/g,' ').trim()};};
const MOVENO=()=>{const row=document.querySelector('[data-ct="rev-move-line"]');if(!row)return null;const m=(row.innerText||'').match(/(\d+)\s*(\.|…)/);return m?(m[1]+(m[2]==='.'?'w':'b')):null;};
const ROWS=(labels)=>{const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return null;const out={};
  for(const l of labels)for(const g of s.querySelectorAll('div')){const bs=g.querySelectorAll('button');if(bs.length!==2)continue;
    if(((g.firstElementChild&&g.firstElementChild.textContent)||'').replace(/\s+/g,'').trim()!==l)continue;out[l]=[...bs].map(b=>parseInt((b.textContent||'').trim(),10));break;}
  const labs=[...s.querySelectorAll('div')].filter(d=>d.children.length===0&&/^(Accuracy|Not scored)$/.test((d.textContent||'').trim()));
  out._acc=labs.slice(0,2).map(l=>(l.textContent||'').trim());return out;};
const PANEL=()=>{const s=document.querySelector('[data-ct="rev-summary"]');return s?(s.innerText||'').replace(/\s+/g,' '):'';};

async function review(geo,name,pgn){
  const b=await L.launch({geo,name:'g186-'+name+'-'+geo,store:{ct_pool:'3'}});
  await b.open();
  await b.page.evaluate(()=>{try{localStorage.removeItem('ct_evalcache');}catch(e){}});
  await b.open();
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(pgn);
  await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:200});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
  await b.settle(700);
  const rows=await b.page.evaluate(ROWS,L.GRADES),panel=await b.page.evaluate(PANEL);
  await b.tapText(/^Start review/,{wait:900}).catch(()=>{});
  await require('../drive/review').navTap(b,'First move').catch(()=>{});
  await b.settle(380);
  const walk=[];const seen={};
  for(let i=0;i<12;i++){const before=await b.page.evaluate(MOVENO);
    await b.page.locator('[aria-label="Next move"]').first().click({timeout:6000}).catch(()=>{});
    await b.page.waitForTimeout(150);let mv=await b.page.evaluate(MOVENO);
    if(mv===before){await b.page.waitForTimeout(400);mv=await b.page.evaluate(MOVENO);}
    if(mv===null||mv===before||seen[mv])break;seen[mv]=1;
    await b.settle(500);   // the line can grow a moment after landing (CLAUDE.md, #387)
    const why=await b.page.evaluate(()=>{const w=document.querySelector('[data-ct="rev-why-txt"]')||document.querySelector('[data-ct="rev-why"]');return w?(w.innerText||'').replace(/\s+/g,' ').trim():null;});
    walk.push({mv,...(await b.page.evaluate(BADGE,LBL)),why});}
  const errs=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  await b.close();
  return {rows,panel,walk,errs};
}

async function partB(geo){
  const tag=geo==='se'?'320x568':geo;
  const S=await review(geo,'scholar',SCHOLAR);
  const w=S.walk.map(x=>x.label);
  L.say(S.walk.length===7,'TC-R270 PRECONDITION '+tag+' the Scholar\'s Mate review walks all 7 plies ('+S.walk.length+': '+w.join(' ')+')',S.walk);
  L.say(w.slice(0,5).every(x=>x==='Book'),'TC-R270 B1 '+tag+' 1.e4 e5 2.Bc4 Nc6 3.Qh5 stay Book ('+w.slice(0,5).join(' ')+')');
  const nf6=S.walk[5]||{};
  L.say(nf6.label==='Blunder','TC-R270 B2 '+tag+' 3...Nf6, which allows 4.Qxf7# mate in one, is badged Blunder, not Book (badge '+(nf6.label||nf6.err)+')',nf6);
  // B3: the words. The instrument is shown able to see the praise first (B3a: a Book ply's explanation says "An opening move"), then
  // 3...Nf6's row and explanation must not say it (B3b). Read, never written here: the sentences are the Review explanation's own.
  const bk=S.walk[4]||{};
  L.say(!!bk.why&&/An opening move/i.test(bk.why),'TC-R270 B3a PRECONDITION '+tag+' a Book ply\'s explanation (3.Qh5) reads "An opening move..." - the phrase B3b looks for is visible to this reader ("'+String(bk.why||'').slice(0,120)+'")',bk);
  L.say(!!nf6.line&&/Nf6/.test(nf6.line)&&!!nf6.why&&!/An opening move/i.test(nf6.line+' '+nf6.why),'TC-R270 B3b '+tag+' 3...Nf6 is not praised as an opening move: row "'+String(nf6.line||'').slice(0,60)+'", explanation "'+String(nf6.why||'').slice(0,120)+'"',nf6);
  const qf7=S.walk[6]||{};
  L.say(!!qf7.label&&qf7.label!=='Book','TC-R270 B4 '+tag+' 4.Qxf7#, the move after the book ended, is graded as a move, not Book (badge '+(qf7.label||qf7.err)+')',qf7);
  const r=S.rows||{};
  L.say(!!r.Blunder&&r.Blunder[1]===1&&!!r.Book&&r.Book[0]===3&&r.Book[1]===2,'TC-R270 B5 '+tag+' the summary counts Black Blunder 1 and Book 2, White Book 3 (Blunder '+JSON.stringify(r.Blunder)+', Book '+JSON.stringify(r.Book)+')',r);
  L.say(Array.isArray(r._acc)&&r._acc[1]==='Accuracy','TC-R270 B6 '+tag+' Black has a graded move now and is scored ('+JSON.stringify(r._acc)+')',r._acc);
  L.say(S.errs.length===0,'TC-R270 B7 '+tag+' no page errors on the Scholar review'+(S.errs.length?' -- '+S.errs.slice(0,2).join(' | '):''));
  const I=await review(geo,'italian',ITALIAN);
  L.say(I.walk.length===6&&I.walk.every(x=>x.label==='Book'),'TC-R270 B8 '+tag+' a sound book line (the Italian, 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5) stays Book on all six plies ('+I.walk.map(x=>x.label||x.err).join(' ')+')',I.walk);
  L.say(!!I.rows&&!!I.rows.Book&&I.rows.Book[0]===3&&I.rows.Book[1]===3,'TC-R270 B9 '+tag+' and its summary counts Book 3 and 3 ('+JSON.stringify(I.rows&&I.rows.Book)+')');
}

L.run(async()=>{
  partN();
  if(process.env.CT_186_NODE_ONLY){L.done();return;}
  for(const g of (process.env.CT_186_GEOS||'kunal761,se').split(','))await partB(g.trim());
  L.done();
});
