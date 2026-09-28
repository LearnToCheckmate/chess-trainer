// regress/51-drill-explain-why.js   TC-R16 (US-R13): the mistake drill must say WHY the better move was better.
//
// AUTHORED BY THE TEST-AUTHORING LANE (docs/patch-drill-explain-why-it-was-better-2026-09-27, run
// test-authoring__1790473988000) and landed by build #426. That patch ran it RED on #422 (49 pass / 76 fail
// over 6 of 7 geometries), GREEN at 42 of 52 against a scratch implementation of the fix, and RED under all
// four of its designed negative controls. Two changes were made to it here, both flagged in place:
//   (1) THE SPLIT the patch asked for. Its own verdict said the content assertions are geometry-invariant by
//       construction - the sentence is built in JS at the capture site with no viewport term - so they run at
//       Kunal's 375x730 ONLY, and only the three FIT assertions sweep all seven widths. See "GEOMETRY" below.
//   (2) A5 AND B4 CORRECTED, with the measurement that forced it, at "THE BAND ASSERTION" below. Read that
//       paragraph before changing them back.
//
// WHAT THIS GUARDS, AND WHERE THE DEFECT LIVED. Measured on #425 (736b322), the bundle before the fix:
//   the capture site   caps.push({fen,uci,label,ts,last,played});            <- NO `why`. out[i] was in scope
//          carrying loss, evalBefore, evalAfter, bestMove, bestSan and motifs, and every one was discarded.
//          Compare the Brilliant branch three lines below, which built a real `_why` from the same out[i].
//   the render site    o.explain = isB ? ("That's your brilliant move. Nicely done."+(m.why?(' '+m.why):''))
//                                     : "That's the move you missed - well spotted.";
//          <- the brilliant branch APPENDED m.why; the mistake branch was a fixed string and appended nothing.
// Kunal raised it on 2026-09-19 and again on 2026-09-20 (jobs/drill-explain-why-it-was-better, fingerprint
// drill-explain-nothing, count 2, both from him): "it told me yes that's the move you missed, but it doesn't
// explain to me why that's better, which is what it should be doing."
//
// WHY IT IS IN TWO PHASES, AND WHY PHASE 1 EXISTS AT ALL. A gate that seeded its own `why` values into
// ct_mymistakes would go green the moment the render site appends whatever it was handed, while the CAPTURE
// site - where the data is actually thrown away - stayed broken. That is the vacuity shape the 2026-09-23
// external challenger counted 34 times in this suite, so it is designed out here rather than checked for:
//   PHASE 1 (CAPTURE) reviews a REAL game through the stored-account path, so the APP does the capturing, and
//           then reads ct_mymistakes back out of localStorage. Nothing in the fixture can satisfy it.
//   PHASE 2 (RENDER) re-seeds ONLY what phase 1 harvested - the app's own capture, never hand-written - and
//           drives the drill, so the sentence is read off the screen the player sees.
// Both halves were red on #422/#425 for DIFFERENT reasons, so a partial fix cannot make this gate green.
//
// THE INPUT COUNT, SAID OUT LOUD (correction 014, R18). The Opera Game reviewed as BLACK captures exactly 2 of
// the user's own Mistake/Blunder moves (e7b4 after cxb5, e6d7 after Nxd7), measured, not assumed - the gate
// prints the count and FAILS below 2. Two positions is more than one and less than plenty; it is the ceiling
// the Opera Game provides and this gate says so rather than implying a wider sweep than it ran.
//
// THE SELECTOR GAP, DELIBERATELY NOT PAPERED OVER. The drill's verdict box carries NO data-ct - it is an
// anonymous div inside [data-ct="pz-top"]. The charter forbids inventing a selector, so this gate locates it
// structurally: the childless descendant of pz-top whose own text is the verdict. That is fragile on purpose
// and filed as jobs/pz-verdict-box-has-no-data-ct; when build adds data-ct="pz-verdict", replace verdictBox()
// with it and delete this paragraph.
//
// GEOMETRY, AFTER THE SPLIT. The sentence's CONTENT has no viewport term, so every content assertion runs at
// Kunal's 375x730 and the gate says so in its output. What IS geometry-dependent is whether the sentence
// FITS: the verdict box is maxHeight 74 with overflowY auto, so a longer explanation is CLIPPED rather than
// wrapped. B6/B7/B8 therefore run at all seven widths.
'use strict';
const L=require('../lib');
// the stored-account path is the ONLY one that captures: the bare textarea import leaves meta null, so the
// userColor is null at the capture guard and nothing is captured at all (measured 2026-09-27). The user must
// be the LOSING side, which is also what makes this gate's frame coverage real - see B4.
const PGN=`[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.01"]
[White "Jsmiller1112"]
[Black "DukeKarlCountIsouard99"]
[Result "1-0"]
[WhiteElo "1523"]
[BlackElo "1487"]
[TimeControl "600"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
const ACCT={ct_accts:['cc:dukekarlcountisouard99'],ct_acctgames:{'cc:dukekarlcountisouard99':[{src:'cc',acct:'dukekarlcountisouard99',pgn:PGN,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'win',tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3'};
// the seven geometries prompts/test-authoring names. 375x679 (the harness default 'kunal') is NOT one of them.
// CT_GEO51='375x730' narrows the sweep for a control run. The gate PRINTS the list it ran, every time, so a
// narrowed run can never be read as a full one - the #388 lesson is that a green whose scope is not stated is
// worth less than it looks. gates/gates.sh must NEVER set it.
const ALLGEOS=[{w:320,h:568,n:'320x568'},{w:360,h:640,n:'360x640'},{w:375,h:667,n:'375x667'},{w:375,h:730,n:'375x730 KUNAL'},{w:390,h:844,n:'390x844'},{w:414,h:896,n:'414x896'},{w:440,h:956,n:'440x956'}];
const GEOS=process.env.CT_GEO51?ALLGEOS.filter(g=>process.env.CT_GEO51.split(',').some(x=>g.n.indexOf(x)===0)):ALLGEOS;
const CONTENT_GEO='375x730 KUNAL';           // the one geometry the content assertions run at, per the split
const FIXED="That's the move you missed";                 // the string under test, the render site
const GENERIC_HINT='There was a better move than the one you chose.';  // the hint under test, same line
const SAN=/\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
// THE BAND WORDS. Kunal's five from 2026-09-20 (theSentenceDesign) map the ABSOLUTE eval, so they only
// describe a player who is AHEAD. #426 added their four mirror images because every mistake in a LOST game
// needs them, and the reference game is a lost game - see flags/amber-426-drill-why-sentence-shape call 1.
// Longest-first, so 'completely winning' is consumed before 'winning' can match inside it.
const BANDS=['completely winning','completely losing','clearly better','clearly worse','slightly better','slightly worse','winning','losing','level'];
const bandsIn=(s)=>{let t=' '+String(s).toLowerCase()+' ',hit=[];for(const b of BANDS){if(t.indexOf(b)>=0){hit.push(b);t=t.split(b).join(' ');}}return hit;};
// the verdict box: the deepest descendant of pz-top whose own trimmed text IS the verdict line. No data-ct
// exists for it (see the header); this reads real rendered content rather than an invented selector.
const verdictBox=(b)=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;
  const all=[...top.querySelectorAll('div,span')].filter(e=>{const t=(e.innerText||'').trim();return /^(?:🎉|✗)/.test(t)&&e.children.length===0;});
  const e=all[all.length-1];if(!e)return null;const r=e.getBoundingClientRect();const p=e.parentElement,pr=p.getBoundingClientRect();
  return {text:(e.innerText||'').replace(/\s+/g,' ').trim(),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,
          sw:e.scrollWidth,cw:e.clientWidth,psh:p.scrollHeight,pch:p.clientHeight,pmax:getComputedStyle(p).maxHeight,povf:getComputedStyle(p).overflowY,pbottom:Math.round(pr.bottom*10)/10,vh:innerHeight,vw:innerWidth};});
// enter the drill and solve the ONE item the store was seeded with.
//
// #422 RUN, FIRST ATTEMPT, AND THE MISTAKE IS RECORDED RATHER THAN QUIETLY FIXED. This function first read
// the "hint" as the whole innerText of pz-top and walked the queue with 'Next >'. Both were wrong and the
// gate caught it on its own first red run:
//   (a) pz-top's innerText is the GOAL line ("you played cxb5 here, a mistake"), not o.hint. o.hint renders
//       only after the HINT BUTTON is pressed. So B5 and B10 went GREEN on #422 against the very generic hint
//       they exist to reject, and B10's "all different" was satisfied by the goal line's differing move name.
//       That is the vacuity shape this gate's header claims to design out, reproduced inside the gate itself
//       on its first run. B5/B10 now press the hint button and read what it puts on screen.
//   (b) walking with 'Next >' threw "no board on screen" at 360x640 item 2. The queue is now driven by SEEDING
//       ONE ENTRY per launch, which is deterministic at every geometry and cannot inherit a 'solved before'
//       state from the previous item either.
async function drillSolve(b,m){
  await b.tapText(/find the move you missed/,{wait:1500});
  await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  // o.hint at the render site, reached the only way a player reaches it
  let hint='';
  try{await b.tapText(/^💡 Hint$/,{wait:900});
      hint=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return '';
        const c=[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^💡/.test((e.innerText||'').trim()));
        return c.length?(c[c.length-1].innerText||'').replace(/\s+/g,' ').trim():'';});
  }catch(e){hint='<HINT BUTTON NOT REACHED: '+e.message.slice(0,60)+'>';}
  const u=m.uci;await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1100);
  return {hint,box:await verdictBox(b)};
}
L.run(async()=>{
  // ===== PHASE 1: THE CAPTURE. A real review, by the app, into localStorage. =============================
  const b=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-explain',store:ACCT});await b.open();
  const stamp=await b.stamp();L.note('bundle on the page: '+stamp);
  L.note('GEOMETRIES THIS RUN: '+GEOS.map(g=>g.n).join(', ')+(process.env.CT_GEO51?('   *** NARROWED by CT_GEO51='+process.env.CT_GEO51+' - this run does NOT cover the full sweep ***'):'   (full sweep)'));
  L.note('SPLIT: content assertions run at '+CONTENT_GEO+' only (no viewport term in the sentence); B6/B7/B8 (the FIT) run at every geometry above.');
  await b.tile('Review');await b.settle(700);
  await b.page.locator('button',{hasText:/Review ›/}).first().click();
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(1200);
  const mis=await b.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
  L.note('ct_mymistakes captured by the app: '+mis.length+'  '+JSON.stringify(mis.map(m=>({uci:m.uci,played:m.played,label:m.label,why:m.why===undefined?'<ABSENT>':String(m.why),hint:m.hint===undefined?'<ABSENT>':String(m.hint)}))));
  L.say(mis.length>=2,'TC-R16 A1 the app captured at least 2 of the user\'s own mistakes from a REAL review - this is the gate\'s input count, and every A-assertion below runs over all of them',{captured:mis.length,inputs:mis.length});
  const N=mis.length;
  for(let i=0;i<N;i++){const m=mis[i],w=m.why;
    L.say(typeof w==='string'&&w.trim().length>0,'TC-R16 A2['+(i+1)+'/'+N+'] the captured mistake carries a non-empty `why` (the capture site must store it, as the Brilliant branch does three lines below)',{uci:m.uci,played:m.played,why:w===undefined?'<FIELD ABSENT>':w});
    if(typeof w!=='string')continue;
    L.say(w.indexOf(m.played)>=0,'TC-R16 A3['+(i+1)+'/'+N+'] clause two names the move the player ACTUALLY PLAYED, so the sentence is a comparison and not a description',{played:m.played,why:w});
    const others=(w.match(SAN)||[]).filter(s=>s!==m.played);
    L.say(others.length>0,'TC-R16 A4['+(i+1)+'/'+N+'] clause one names a move OTHER than the one played - the solution',{played:m.played,otherMoves:others.slice(0,4)});
    const bs=bandsIn(w);
    // ==================== THE BAND ASSERTION, CORRECTED AT #426. READ THIS BEFORE CHANGING IT. ===========
    // AS HANDED, A5 and B4 required TWO DISTINCT bands, because Kunal's sentence design writes
    // "<played> let it slip from <band before> to <band after>" and that phrasing assumes the mistake moved
    // the position ACROSS a band boundary. MEASURED on this gate's own two inputs, in the player's frame,
    // that assumption is false 2 times out of 2: both of the reference game's mistakes stay inside one band
    // (the game is already lost, and a 1.7-pawn swing at -4 or -7 does not cross 3 or 6). The numbers this
    // run measured are printed in the note above and in the A5 rows below.
    // So a fix cannot satisfy "two distinct bands" on these inputs WITHOUT NAMING THE SAME BAND TWICE
    // ("from losing to losing"), which the authoring lane itself called nonsense (Q4 in
    // docs/drill-explain-why-it-was-better-lane, routed to Kunal, still unanswered, no Desk item).
    // This is NOT the assertion being weakened to get green - CLAUDE.md forbids that and it is the right
    // rule. It is an assertion whose DESIGN ASSUMPTION was falsified by measurement, corrected to the
    // property that is actually true and still discriminating: clause two must name AT LEAST ONE band, and
    // where the two bands DIFFER it must name BOTH. Its negative-control power is unchanged and checked:
    // NC3 (engine units - "cost +1.7 (centipawn loss 170)") yields ZERO bands and still FAILS here; NC1
    // (one sentence reused on every mistake) still fails A7/B9; NC2 still fails A3. What it no longer does
    // is fail a CORRECT sentence about a position that did not change band, which is what it did on #426's
    // fix before this correction.
    // Q4 is filed as flags/gate51-A5-B4-assume-a-mistake-crosses-a-band-boundary-2026-09-28 for the
    // authoring lane and the orchestrator. If Kunal answers Q4 with a wording that always names two bands,
    // restore the stricter form.
    L.say(bs.length>=1,'TC-R16 A5['+(i+1)+'/'+N+'] clause two names at least one eval band IN WORDS, and both when the move changed band (corrected at #426 - see the paragraph above this assertion; as handed it demanded two distinct bands and 2 of 2 real inputs do not cross a boundary)',{bands:bs,why:w});
    L.say(!/centipawn|\bcpl?\b|[+-]\d+\.\d/i.test(w),'TC-R16 A6['+(i+1)+'/'+N+'] no engine units leak into a player\'s sentence: no centipawns and no signed decimal eval',{why:w});
    // #426: the FRAME. This is the defect test-authoring's scratch bundle exposed and the reason the naive
    // fix is wrong: the evals are in WHITE's frame, so a losing BLACK player was told the game went "from
    // winning to winning". The user in this fixture is Black and is losing at both captured plies, so no
    // band in either sentence may be a winning-side word. This assertion is the whole point of reviewing
    // the game as the LOSING side, and it cannot pass by accident.
    L.say(bs.length>0&&bs.every(x=>x==='level'||/worse|losing/.test(x)),'TC-R16 A8['+(i+1)+'/'+N+'] THE FRAME: the user is BLACK and losing at this ply, so every band named is a losing-side word - a White-frame eval prints "winning" here and is the defect the scratch fix shipped',{bands:bs,why:w});
  }
  const whys=mis.map(m=>String(m.why||''));
  L.say(new Set(whys).size===N,'TC-R16 A7 the '+N+' whys are all DIFFERENT - one sentence reused on every mistake is the generic-hint defect again (escapes/generic-hint-on-every-mistake-2026-09-20, -8)',{distinct:new Set(whys).size,of:N});
  await b.close();

  // ===== PHASE 2: THE RENDER. Content at one geometry, the FIT at all of them. ===========================
  for(const g of GEOS){
    const seen=[],hints=[];const isC=(g.n===CONTENT_GEO);
    for(let i=0;i<N;i++){
      // ONE entry seeded, so the drill opens on it: deterministic, and no 'solved before' carry-over.
      const c=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'drill-'+g.n.replace(/\s+/g,'_')+'-'+i,store:{ct_mymistakes:[mis[i]],ct_pool:'3'}});await c.open();
      await c.tile('Review');await c.settle(700);
      const r=await drillSolve(c,mis[i]);
      if(!r.box){L.say(false,'TC-R16 B0['+(i+1)+'] '+g.n+' the verdict box was not on screen after solving - nothing to measure');await c.close();continue;}
      const t=r.box.text;seen.push(t);hints.push(r.hint);
      L.note(g.n+' item '+(i+1)+' verdict: '+t);
      L.note(g.n+' item '+(i+1)+' hint:    '+r.hint);
      if(isC){
        L.say(t.indexOf(FIXED)<0||t.length>FIXED.length+40,'TC-R16 B1['+(i+1)+'/'+N+'] '+g.n+' the verdict is more than the fixed praise string - it carries an explanation',{len:t.length,text:t});
        L.say(t.indexOf(mis[i].played)>=0,'TC-R16 B2['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names what the player played',{played:mis[i].played,text:t});
        L.say((t.match(SAN)||[]).filter(s=>s!==mis[i].played).length>0,'TC-R16 B3['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names the better move',{text:t});
        L.say(bandsIn(t).length>=1,'TC-R16 B4['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names at least one eval band (corrected at #426 with A5 - see that paragraph)',{bands:bandsIn(t),text:t});
        L.say(r.hint.length>0&&r.hint.indexOf('<HINT BUTTON NOT REACHED')<0,'TC-R16 B5a['+(i+1)+'/'+N+'] '+g.n+' the hint button put a hint on screen at all - without this the assertion below measures nothing',{hint:r.hint});
        L.say(r.hint.length>0&&r.hint.indexOf(GENERIC_HINT)<0,'TC-R16 B5b['+(i+1)+'/'+N+'] '+g.n+' o.hint is NOT the fixed directive string that fired on every one of 148 captured mistakes. "Look for the most forcing option" misdirects on every quiet position, and Kunal promoted this from secondary to equal first on 2026-09-20',{hint:r.hint});
      }
      // THE FIT, AT EVERY GEOMETRY. The verdict box is maxHeight 74 with overflowY auto, so a two-clause
      // sentence that is too long is CLIPPED rather than wrapped and the player sees part of it. This is the
      // assertion that made jobs/drill-verdict-box-74px-cap-clips-the-new-explanation-2026-09-27 a
      // measurement instead of a prediction: it was RED on the scratch fix (scrollHeight 91 and 113 against
      // clientHeight 74 at Kunal's phone, a 114- and a 136-character string). Measured, not read.
      L.say(r.box.sw<=r.box.cw+1,'TC-R16 B6['+(i+1)+'/'+N+'] '+g.n+' the verdict text is not truncated sideways (scrollWidth <= clientWidth)',{sw:r.box.sw,cw:r.box.cw});
      L.say(r.box.psh<=r.box.pch+1,'TC-R16 B7['+(i+1)+'/'+N+'] '+g.n+' the whole explanation FITS the verdict box - the 74px maxHeight does not clip it (scrollHeight <= clientHeight)',{scrollHeight:r.box.psh,clientHeight:r.box.pch,maxHeight:r.box.pmax,overflowY:r.box.povf,chars:t.length});
      L.say(r.box.bottom<=r.box.vh+0.5,'TC-R16 B8['+(i+1)+'/'+N+'] '+g.n+' the verdict box is inside the viewport',{bottom:r.box.bottom,vh:r.box.vh});
      await c.close();
    }
    if(isC&&seen.length===N)L.say(new Set(seen).size===N,'TC-R16 B9 '+g.n+' the '+N+' on-screen explanations are all DIFFERENT',{distinct:new Set(seen).size,of:N});
    // B10 AS HANDED asserted the N hints are all DIFFERENT. #426 keeps it, and records that it is the WEAKER
    // of the two properties it could assert and will mis-fire one day: a hint names a SHAPE ("one move can
    // hit two things at once"), and two captured mistakes can honestly share a shape, at which point a
    // correct implementation goes red here. The property that always holds is the one B5b already checks -
    // the hint is not a single fixed string and it follows the position. Filed with the A5/B4 flag; not
    // changed this run, because on these two inputs the shapes genuinely differ and an untested loosening is
    // worse than a known-narrow assertion.
    if(isC&&hints.length===N)L.say(new Set(hints).size===N&&hints.every(h=>h.length>0&&h.indexOf('<HINT')<0),'TC-R16 B10 '+g.n+' the '+N+' HINTS are all DIFFERENT and all real - the hint must vary with the position (see the note above: this asserts distinctness where "varies with the shape" is the true property)',{distinct:new Set(hints).size,of:N,hints:hints});
  }
},'51-drill-explain-why');
