// regress/20-review.js  The Review screen's regression suite: TC-R01..TC-R09 and TC-R11..TC-R14 of
// claude/stories/TEST-CASES.md, executed on the bundle under test at THREE geometries: 375x730, which is
// Kunal's actual phone (lib.js GEOS.kunal730, and R19); 375x679, which is NOT his phone and is kept only as a
// shorter-phone column (the 679 came from subtracting the 51pt status bar twice - CLAUDE.md corrects it by name,
// and the header of this file asserted the wrong one from #348 to 2026-10-03); and 390x844. The Opera Game (33 plies, 10.Nxb5!! at ply 19, 14.Rd1 at ply 27, 17.Rd8# at ply 33) is the
// fixture; its PGN carries WhiteElo/BlackElo so the rating pills render (#348). Every line is a measured claim.
'use strict';
const L=require('../lib');
const PGN='[Event "Opera Game"] [Site "Paris"] [Date "1858.11.02"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [WhiteElo "2600"] [BlackElo "1800"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
// THE TEN-GRADE LADDER, in the order the summary prints it. #421 un-folded Excellent; Book has always been a
// row of its own. This file carried EIGHT names and a comment saying Excellent was folded into Best, which went
// false at #421 and stayed in the file until 2026-10-03 (jobs/20-review-cats-frozen-at-eight).
// IT IS RESTATED HERE ON PURPOSE AND MUST NOT BE DERIVED FROM THE APP'S OWN CATS ARRAY: test-authoring measured
// that deriving it makes the assertion vacuous - it then agrees with any ladder the bundle happens to render,
// which is the defect, not the check. The literal is the expectation; the count below is what stops it freezing.
const LADDER=['Brilliant','Great','Best','Excellent','Good','Book','Inaccuracy','Miss','Mistake','Blunder'];
// The Opera Game is 33 plies: White played 17, Black 16, and every ply gets exactly one grade, so each side's
// ten counts must sum to its own ply count. That is a VALUE assertion over the counters and it is what tells a
// broken counter from a correct one - the old assertion could not (it only looked for the words on the panel).
const PLIES_W=17, PLIES_B=16;
const step=async(b,n)=>{for(let i=0;i<n;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(140);}await b.settle(400);};
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):(c.innerText||'').trim().slice(0,2);}).join('|');});
const badgesOutside=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const R=g.getBoundingClientRect();const out=[];for(const e of g.querySelectorAll('div,span')){if(e.getAttribute('data-ct')==='rev-fab')continue;const st=getComputedStyle(e);if(st.borderRadius!=='50%'&&!/50%/.test(e.style.borderRadius||''))continue;const r=e.getBoundingClientRect();if(r.width<8||r.width>R.width/3)continue;const dx=Math.max(0,R.left-r.left,r.right-R.right),dy=Math.max(0,R.top-r.top,r.bottom-R.bottom);out.push({t:(e.innerText||'').trim().slice(0,3),dx:Math.round(dx*10)/10,dy:Math.round(dy*10)/10,top:Math.round(r.top*10)/10,left:Math.round(r.left*10)/10,w:Math.round(r.width)});}return {board:{top:R.top,left:R.left,w:R.width},badges:out};});
const barInfo=(b)=>b.page.evaluate(()=>['pbar-top','pbar-bottom'].map(k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return null;const r=e.getBoundingClientRect();let spill=0;for(const c of e.querySelectorAll('*')){const q=c.getBoundingClientRect();if(q.width===0)continue;spill=Math.max(spill,q.right-r.right,r.left-q.left,q.bottom-r.bottom,r.top-q.top);}return {h:Math.round(r.height*10)/10,spill:Math.round(spill*10)/10,text:(e.innerText||'').replace(/\s+/g,' ').slice(0,60)};}));
// One row per grade in the summary's count table: the label span plus the two per-side count buttons. Read
// PER ROW rather than as substring containment over the panel's concatenated innerText, because 'Book' appears
// twice on the panel (the ladder row and the 'Book moves' skills row) and containment is satisfied by either.
const ladderRows=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return null;
  // The Skills panel below uses the SAME '1fr 56px 56px' grid, so the grid alone picks up twenty rows, not ten
  // (measured 2026-10-03: 20 rows, the last ten being Skills). A ladder row - and only a ladder row - leads with
  // the 9px round colour dot for its grade, so that is the discriminator.
  const isLadder=(d)=>{const f=d.firstElementChild;if(!f)return false;const dot=f.firstElementChild;if(!dot)return false;
    const st=getComputedStyle(dot);return /50%/.test(st.borderRadius||'')&&Math.round(parseFloat(st.width))<=12;};
  return [...s.querySelectorAll('div')].filter(d=>/^1fr\s+56px\s+56px$/.test((d.style.gridTemplateColumns||'').trim())&&isLadder(d))
    .map(d=>{const lab=((d.firstElementChild&&d.firstElementChild.innerText)||'').replace(/\s+/g,' ').trim();
      const n=[...d.querySelectorAll('button')].map(x=>{const t=(x.innerText||'').trim();return /^\d+$/.test(t)?Number(t):null;});
      return {label:lab,w:n[0],b:n[1]};});});
const summaryCounts=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');return s?(s.innerText||'').replace(/\s+/g,' ').slice(0,8000):'';});

L.run(async()=>{
  // kunal730 ADDED 2026-10-03: this suite had never once run at Kunal's real 375x730. 679 stays as the
  // shorter-phone column [CLAUDE.md], and the one literal pin in this file (the 349 board width) stays bound to
  // 679 by its own geo check below rather than being moved - which reading changed has not been established.
  for(const geo of ['kunal','kunal730','390']){
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
    /* #393 (uat390-review-summary-menu-covered): THE SUMMARY MUST OFFER A WAY INTO THE MENU, AND IT MUST
       ACTUALLY OPEN. The panel is position:fixed inset:0 zIndex:500 and opaque, so the shared header row and
       its ☰ sit BEHIND it - measured at (337,-4) with no ink painted anywhere in that box. It was reported as
       a visible control that could not be tapped; it was not visible at all. The fix follows the one this
       codebase already chose for Home (chess.jsx:4276): a dedicated button INSIDE the overlay.
       The last assertion is BEHAVIOURAL on purpose - a button in the right place that opens nothing would
       satisfy a rect check, and this whole defect is about a control that looked present and did nothing. */
    const revMenu=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-summary-menu"]');
      if(!e)return null;const q=e.getBoundingClientRect();
      const h=document.elementFromPoint(Math.round(q.left+q.width/2),Math.round(q.top+q.height/2));
      return {x:Math.round(q.left),y:Math.round(q.top),w:Math.round(q.width),h:Math.round(q.height),
              press:!!h&&(h===e||e.contains(h))};});
    L.say(!!revMenu,geo+': the review summary has its own menu button (rev-summary-menu)',revMenu);
    // 'fully on screen' used to be y>=0 alone, so an element at y=5000 or x=-40 passed under that label
    // (jobs/fix-two-gate-comments-that-mislead part 2). All four edges are bounded now, against the geometry.
    L.say(!!revMenu&&revMenu.y>=0&&revMenu.x>=0&&revMenu.y+revMenu.h<=b.geo.h+0.5&&revMenu.x+revMenu.w<=b.geo.w+0.5&&revMenu.w>=30&&revMenu.h>=28,
      geo+': it is fully on screen - all four edges inside '+b.geo.w+'x'+b.geo.h+' - and a real tap target',revMenu);
    L.say(!!revMenu&&revMenu.press,geo+': elementFromPoint at its centre returns the button - nothing covers it',revMenu);
    /* GUARDED so a MISSING button goes red HERE and does not abort the other ninety assertions below.
       The first version of this block threw on the control bundle, which is red either way - but a gate that
       stops at the first absence hides every regression after it, and this gate is the Review screen's only
       coverage. Red, then carry on. */
    let menuOpened=false,menuBox=null;
    if(revMenu){
      try{await b.tapCt('rev-summary-menu',700);
        menuOpened=await b.page.evaluate(()=>!!document.querySelector('[data-ct="menu-sheet"]'));
        // Remember a point the OPEN menu covered, so closing it can be asserted at that point rather than by
        // asking whether the summary still exists - which it always does (see the assertion below).
        menuBox=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-sheet"]');if(!e)return null;
          const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return null;
          return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};});
        await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>(e.innerText||'').trim()==='✕');if(x)x.click();});
        await b.settle(500);
      }catch(e){L.note(geo+': tapping rev-summary-menu threw: '+((e&&e.message)||e));}
    }
    L.say(menuOpened,geo+': and TAPPING IT OPENS THE MENU - behaviour, not position',menuOpened);
    // WAS: `!!(await b.rect('[data-ct="rev-summary"]'))`. rect() does no visibility or coverage test and
    // rev-summary is position:fixed inset:0 zIndex:500 mounted on inReview && reviewView==='summary', which
    // opening the menu does not change - so the old line returned a full-viewport rect WITH THE MENU STILL OPEN,
    // and passed trivially when no menu was ever opened. It restated a precondition
    // (jobs/gate-20-review-two-assertions-that-cannot-fail-2026-09-29). Now: the sheet must be GONE, and the
    // summary must be what a tap lands on at a point the menu was covering.
    const closed=await b.page.evaluate((pt)=>{const m=document.querySelector('[data-ct="menu-sheet"]');
      const gone=!m||getComputedStyle(m).display==='none'||m.getBoundingClientRect().width<2;
      let back=null;if(pt){const h=document.elementFromPoint(pt.x,pt.y);const s=document.querySelector('[data-ct="rev-summary"]');
        back=!!(h&&s&&(h===s||s.contains(h)));}
      return {gone,back,hadPoint:!!pt};},menuBox);
    L.say(!!closed&&closed.gone&&(!closed.hadPoint||closed.back===true),
      geo+': and closing the menu returns to the summary - the sheet is gone and the summary is what a tap at the menu\'s old centre reaches',closed);
    const sumText=await summaryCounts(b);const foot=await b.rect('[data-ct="rev-summary-foot"]');
    const rows=await ladderRows(b);const labels=(rows||[]).map(r=>r.label);
    L.say(/Accuracy/i.test(sumText),geo+': TC-R04 the summary names Accuracy');
    // (a) the COUNT, which is what stops the expectation freezing while the summary grows: ten rows, not eight.
    L.say(!!rows&&rows.length===LADDER.length,geo+': TC-R04 the summary prints all '+LADDER.length+' grade rows ('+((rows&&rows.length)||0)+')',labels);
    // (b) per row, in order, so a label that only appears elsewhere on the panel (Book, twice) cannot satisfy it.
    L.say(!!rows&&labels.join('|')===LADDER.join('|'),geo+': TC-R04 the grade rows are the ten-grade ladder, in order',{got:labels,want:LADDER});
    // (c) a VALUE: every ply carries exactly one grade, so each side's row counts sum to its own ply count. The
    // old assertion was label containment and could not tell a correct counter from a broken one.
    const sumW=(rows||[]).reduce((a,r)=>a+(r.w||0),0),sumB=(rows||[]).reduce((a,r)=>a+(r.b||0),0);
    L.say(!!rows&&rows.length>0&&sumW===PLIES_W&&sumB===PLIES_B,
      geo+': TC-R04 the grade counts account for every ply of the Opera Game (white '+sumW+'/'+PLIES_W+', black '+sumB+'/'+PLIES_B+')',
      {rows:(rows||[]).map(r=>r.label+':'+r.w+'/'+r.b)});
    L.say(!!foot&&foot.y+foot.h<=b.geo.h+0.5&&foot.y>b.geo.h*0.5,geo+': TC-R04 summary footer pinned inside the viewport (bottom '+(foot&&Math.round(foot.y+foot.h))+' of '+b.geo.h+')');
    const skills=await b.rect('[data-ct="rev-skills"]');L.say(!!skills,geo+': TC-R05 Skills panel present');
    // TC-R05 skills jump: Morphy's rook to an open file, 14.Rd1 = ply 27
    const jumped=await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="skill-rooks-to-open-files"]');if(!row)return 'norow';const bt=row.querySelector('button');if(!bt)return 'nobutton';bt.click();return 'clicked';});
    await b.settle(900);const mlJump=await b.rect('[data-ct="rev-move-line"]');
    L.say(jumped==='clicked'&&!!mlJump&&/Rd1/.test(mlJump.text),geo+': TC-R05 tapping the Skills number opens the review at 14.Rd1',{jumped,text:mlJump&&mlJump.text});
    await b.tapCt('rev-back',500);L.say(!!(await b.rect('[data-ct="rev-summary"]')),geo+': TC-R13 back arrow from the move screen returns to the summary');
    // TC-R06 plies
    // TC-RL-033 / R-03. The line that used to be here tapped "Start review" and then clicked First move, with a
    // comment saying "Start review resumes at the last viewed ply". That was true BEFORE #373 and has been false
    // since: #375 made the button do what it says ("it says Start, so it starts at move 0"). So the helper click
    // was landing on a review that was already at ply 0 and doing nothing - which meant this gate would have gone
    // green on a build where Start review silently went back to resuming, and R-03 could re-regress unseen.
    // The click is gone and the behaviour is now ASSERTED instead. Measured on #381: after a Skills jump to ply 27
    // and back to the summary, Start review lands at "Start position 0/33" with no helper of any kind.
    await b.tapText(/^Start review/,{wait:900});await b.settle(700);
    const startAt=await b.text('[data-ct="rev-move-line"]');
    L.say(!!startAt&&/Start position/.test(startAt)&&/\b0\/33\b/.test(startAt),geo+': TC-RL-033 (R-03) "Start review" starts at the START, even though the Skills jump just left the review at ply 27. Asserted, not helped along by a click.',startAt);
    const at={};const rec=async(k)=>{const m=await b.metrics();const bars=await barInfo(b);const num=await b.rect('[data-ct="eval-bar-num"]');const ml=await b.rect('[data-ct="rev-move-line"]');at[k]={board:m.board,over:m.over,bars,num:num&&num.text,ml:ml&&ml.text,why:(await b.rect('[data-ct="rev-why"]'))};};
    await rec('p0');await step(b,10);await rec('p10');await step(b,9);await rec('p19');await b.shot('review-'+geo+'-ply19');
    /* #489 TC-R09c: THE FIRST LABEL PAINTED ON A NEW PLY IS THE STORED-ANALYSIS ONE, AND IT USED TO BE A NUMBER.
       The walk to ply 33 used to be one `step(b,14)` and recorded only the SETTLED label, which is why this suite
       never saw the defect: sfHit is null by construction for at least one render after every ply change (it is
       keyed on sfEval.fen === dispFen), so the fallback at chess.jsx:4920 is ALWAYS what paints first, and the
       live search then overwrites it within about 60 ms in this container. A settled read can only ever see the
       winner of that race. So the last four plies are walked one at a time and the label is sampled back to back
       from the first paint, and the assertion is over the SET of labels seen rather than over the final one.
       MEASURED both ways before this was written: on the shipped #488 bundle (md5 8d8785ea40c4) this collects
       NINE paints of "+9.9" across the four plies; on #489 (81b4ad945f8e) it collects none. That is the negative
       control and it is a real one - the ideal control, the bundle actually on main, per #432.
       WHY THE ASSERTION IS A PAIR AND NOT JUST THE ABSENCE. "never +-9.9" alone is satisfied by a bundle that
       paints nothing at all, which is #394's trap; so the second half requires every sample to be a label the
       app is allowed to print here, and the mate branch to actually be reached. The EXACT mate label is NOT
       pinned, deliberately: which of "M", "M1", "M2" or the result appears at sample k depends on whether the
       live search has landed, and pinning it would make this assertion a coin flip - the #391 trap. What is
       deterministic, and what the player cares about, is that a forced mate is never reported as the number 9.9. */
    const MATEISH=/^(1-0|0-1|-?M\d*)$/;
    const mateTail={};
    /* ───── HOW THIS SAMPLES, AND WHY THE FIRST VERSION'S GREEN WAS NOT EVIDENCE [#489 antagonist A] ─────
       The first version took six back-to-back polled reads after each click and asserted over the SET. That
       is still a race, and the antagonist MEASURED it losing: on one run of the FIXED bundle, ply 30 returned
       `M2 M2 M2 M2 M2 M2` - and `M2` cannot come from the fallback, because _fbMate can only ever emit
       M, -M, M1, -M1, 1-0 or 0-1. So that ply collected ZERO stored-analysis paints out of six. If all four
       plies behaved that way on a run, every sample would be mateLbl output, mate-shaped and never +-9.9, and
       BOTH ASSERTIONS WOULD HAVE GONE GREEN ON THE #488 CONTROL. The gate would have reproduced, in itself,
       the exact vacuity it was written to end. That is CLAUDE.md's rule verbatim: when an assertion says
       "X is absent in state S", assert FIRST that S was actually reached.
       SO THE RACE IS REMOVED RATHER THAN SAMPLED AGAINST. A MutationObserver records EVERY value the element
       takes, including one that exists for a single frame, which polling can miss and an observer cannot.
       seq[0] is therefore the FIRST label painted on the new ply, and that is the stored-analysis fallback BY
       CONSTRUCTION - sfHit is keyed on sfEval.fen === dispFen and the search is a worker round trip, so it
       cannot resolve in the same commit as the ply change. Asserting on seq[0] rather than on the set also
       disposes of a second trap the antagonist named: 4 of every 7 polled samples were post-search, so the
       old assertion was pinning the KIND of the live search's answer too, and would have reddened on a
       HEALTHY bundle had that 900 ms probe ever returned a cp instead of a mate [the #391 shape]. */
    /* The walk is at ply 19 here and the old single `step(b,14)` carried it to 33. Ten of those fourteen are
       still a bulk step; only the last four are walked singly so their first paint can be sampled. THE FIRST
       VERSION OF THIS BLOCK OMITTED THIS LINE and therefore sampled plies 20-23, where the stored eval is an
       ordinary +4.6 and "never +-9.9" is true for a reason that has nothing to do with the fix - a vacuous
       green. It was caught by the paired mate-shaped assertion below going red, which is the whole reason that
       assertion is a pair, and by the pre-existing TC-R09 at ply 33 going red because `rec('p33')` was recording
       ply 23. Both tells fired on the first run. */
    await step(b,10);
    for(const p of [30,31,32,33]){
      await b.page.evaluate(()=>{
        window.__ctSeq=[];
        const read=()=>{const e=document.querySelector('[data-ct="eval-bar-num"]');
          const t=e?(e.innerText||'').trim():null;const a=window.__ctSeq;
          if(!a.length||a[a.length-1]!==t)a.push(t);};
        window.__ctObs=new MutationObserver(read);
        window.__ctObs.observe(document.body,{subtree:true,childList:true,characterData:true});
      });
      await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});
      await b.page.waitForTimeout(1500);
      mateTail[p]=await b.page.evaluate(()=>{try{window.__ctObs.disconnect();}catch(e){}
        const e=document.querySelector('[data-ct="eval-bar-num"]');
        return {seq:window.__ctSeq||[],settled:e?(e.innerText||'').trim():null};});
    }
    const firsts=[30,31,32,33].map(p=>(mateTail[p].seq||[])[0]);
    const tailAll=[].concat(...[30,31,32,33].map(p=>(mateTail[p].seq||[]).concat([mateTail[p].settled])));
    const tailClamped=tailAll.filter(x=>/^[+-]?9\.9$/.test(String(x||'').trim()));
    // (A) THE DEFECT. Deterministic: seq[0] is the stored-analysis paint on every one of the four plies.
    L.say(tailClamped.length===0,geo+': TC-R09c a forced mate is never painted as the clamped +-9.9 - not as the FIRST label on the ply, which is the stored-analysis one by construction, and not at any later value the element took',{clamped:tailClamped.length,firsts,seen:mateTail});
    // (B) NON-VACUITY, pinned to the first paint only so it cannot redden on what the live search happens to return.
    L.say(firsts.length===4&&firsts.every(x=>x&&MATEISH.test(x)),geo+': TC-R09c the first label painted on each of the four plies IS mate-shaped, so (A) cannot be satisfied by an empty, missing or unpainted readout',{firsts});
    // (C) THE STATE WAS REACHED. Without this, (A) and (B) are both satisfiable by mateLbl output alone and
    // the whole block goes green on the broken bundle - which the antagonist measured happening at ply 30.
    // A BARE M or -M identifies _fbMate UNIQUELY during this walk: mateLbl (chess.jsx:121) always appends a
    // digit for |m|>=1 and otherwise returns 1-0/0-1, and the _engBar and _mateTxt producers are both gated
    // on engOn, which is off until TC-R09b switches it on later in this gate. Plies 30 and 31 are the two
    // where no mate-in-1 exists, so they are where the bare label can appear.
    // IF A LATER BUILD CARRIES MATE DISTANCE THROUGH review.analysis - which is the remaining half of
    // jobs/review-mate-label-not-plus9-9 - the fallback will legitimately start printing M2 here and this
    // assertion must be REVISITED, not deleted: it would need a new signature for the same question.
    L.say(firsts.some(x=>/^-?M$/.test(String(x||''))),geo+': TC-R09c and at least one of those first paints is a BARE M, which only the stored-analysis fallback can produce - so the three assertions are measuring that branch and not the live search that overwrites it',{firsts});
    await b.settle(400);await rec('p33');await b.shot('review-'+geo+'-ply33');
    const ws=new Set(Object.values(at).map(x=>x.board&&x.board.w)),tops=new Set(Object.values(at).map(x=>x.board&&x.board.top));
    L.say(ws.size===1&&tops.size===1&&!ws.has(null),geo+': TC-R06 one board width and one top across plies 0/10/19/33',{ws:[...ws],tops:[...tops]});
    if(geo==='kunal')L.say(at.p0.board&&Math.abs(at.p0.board.w-349)<0.6,'kunal: TC-R06 review board is 349 wide ('+(at.p0.board&&at.p0.board.w)+')');
    // The docScroll===0 conjunct that used to sit beside this one is GONE. index.html:39 sets body{overflow:hidden}
    // and makes #root the scroller, so documentElement scrollHeight minus clientHeight is 0 on every screen in
    // every state BY DESIGN and that half could never redden - while reading as though it covered reachability.
    // The remaining half is the real measurement: the bottom-most laid-out child of #root against the viewport.
    // Reachability on this screen is gate 40's job (gates/regress/40-reachability.js), which scrolls the ancestor
    // and re-reads the rect. Filed as jobs/gate-20-docscroll-conjunct-is-true-by-construction-2026-10-01.
    L.say(Object.values(at).every(x=>x.over.over<=0),geo+': TC-R06 no laid-out content overflows the viewport at any ply (bottom-most child vs viewport)',Object.values(at).map(x=>x.over.over));
    L.say(Object.values(at).every(x=>x.bars&&x.bars[0]&&x.bars[1])&&new Set(Object.values(at).map(x=>x.bars[0].h+'/'+x.bars[1].h)).size===1,geo+': TC-R14 player bars keep one height across plies',Object.values(at).map(x=>x.bars&&x.bars.map(y=>y.h)));
    L.say(Object.values(at).every(x=>x.bars.every(y=>y.spill<=0.5)),geo+': TC-R14 nothing spills out of a player bar',Object.values(at).map(x=>x.bars.map(y=>y.spill)));
    const rat=await b.page.evaluate(()=>['w','b'].map(c=>{const e=document.querySelector('[data-ct="pbar-rating-'+c+'"]');return e?(e.innerText||'').trim():null;}));
    L.say(rat[0]&&/2600/.test(rat[0])&&rat[1]&&/1800/.test(rat[1]),geo+': TC-R14 rating pills carry the PGN Elo headers',rat);
    // TC-R09 mate label
    L.say(/1-0/.test(at.p33.num||'')&&at.p33.num!==at.p0.num,geo+': TC-R09 eval label reads 1-0 at 17.Rd8# and differs from ply 0',{p0:at.p0.num,p33:at.p33.num});
    // TC-R09b (audit N-review-2): the label must still read 1-0 with the engine line switched on from the ⋯ sheet
    // #382: this used to tap and then sleep a flat 2500 ms before reading. The test lane measured rev-engline
    // taking up to 8 s on a real device, so on anything slower than this container the read happened before the
    // line existed and the assertion below tested nothing. Wait for the ELEMENT, with a timeout well past the
    // measured worst case, and say so out loud if it never arrives rather than reading an empty string.
    await b.tapCt('rev-more',400);await b.tapText(/^Analyze with the engine$/,{wait:0});
    const engOk=await b.page.locator('[data-ct="rev-engline"]').last().waitFor({state:'visible',timeout:12000}).then(()=>true).catch(()=>false);
    if(!engOk)L.note('rev-engline never appeared within 12 s; the TC-R09b assertion below is not measuring the engine-line case');
    await b.settle(300);
    const numEng=await b.rect('[data-ct="eval-bar-num"]');const engl=await b.text('[data-ct="rev-engline"]');
    L.say(engOk,geo+': TC-R09b the engine line actually appears when it is switched on (measured 8 ms in this container; the lane measured up to 8 s on a device, which is why the wait is 12 s and not a flat sleep)',{engline:(engl||'').slice(0,40)});
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
    // a negative verdict with a best-move chip somewhere in the game: scan back from 10.Nxb5 (9...b5?? is the usual one,
    // but the review's wall-clock budget shortens the search under CPU load and a single ply's verdict can flip - #374)
    let neg=null;for(let k=18;k>=1&&!neg;k--){await b.page.locator('[aria-label="Previous move"], [title="Previous move"]').first().click();await b.settle(350);const mlk=await b.rect('[data-ct="rev-move-line"]');const bk=await b.rect('[data-ct="rev-best"]');if(mlk&&/Blunder|Mistake|Inaccuracy|Miss|\?/.test(mlk.text)&&bk)neg={ply:k,ml:mlk.text.replace(/\s+/g,' ')};}
    L.say(!!neg,geo+': TC-R08 a negative verdict carries a best-move chip (found at ply '+(neg&&neg.ply)+')',neg);
    for(let k=(neg?neg.ply:0);k<18;k++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click();await b.page.waitForTimeout(120);}await b.settle(400);
    const colours=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="strip-row"]');if(!s)return [];const set=new Set();for(const e of s.querySelectorAll('*')){const st=getComputedStyle(e);const c=st.backgroundColor+'|'+st.color;if(e.children.length===0&&(e.innerText||'').trim())set.add(c);}return [...set];});
    L.say(colours.length>=3,geo+': TC-R08 the move strip uses at least three distinct colours ('+colours.length+')');
    // TC-R10 (the why text) is asserted in 21-review-brilliant.js; here only that the reason exists on the brilliancy
    await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click();await b.settle(500);
    const why={text:(await b.text('[data-ct="rev-why"]'))||''};L.say(why.text.length>20,geo+': TC-R08 the reason line is present on 10.Nxb5',why&&why.text.slice(0,70));
    // TC-R11 analysis board from the round button at ply 19 (Black to move)
    // #381 A-08: this assertion MOVED WITH THE BUTTON rather than being deleted. It used to read "42x42 in the
    // board's bottom corner", which was the defect: the button sat ON the board over h1 and part of g1, and in
    // this very game it covered the white rook from the first ply to the twenty-second. Kunal's answer was to
    // move it to "the right edge of Morphy's box", the player bar directly under the board. So the assertion now
    // says where it IS and, more importantly, where it must NOT be - anything that puts it back over the board
    // fails here. 40x40, not 42: A-11 (tap targets under 40px) is still unanswered, so the button keeps a size
    // at the 40px threshold rather than dropping to the 34x30 of its siblings in the bar.
    const fab=await b.rect('[data-ct="rev-fab"]');const bd=await b.board();
    const bar=await b.rect('[data-ct="pbar-bottom"]');
    L.say(!!fab&&Math.abs(fab.w-40)<1&&Math.abs(fab.h-40)<1,geo+': TC-R11 the round Analyze button is 40x40',fab);
    L.say(!!fab&&!!bd&&fab.y>=bd.y+bd.h-0.5,geo+': TC-R11 A-08 - the Analyze button is BELOW the board and no longer covers h1/g1 (fab top '+(fab&&fab.y)+' vs board bottom '+(bd&&(bd.y+bd.h))+')',{fab,boardBottom:bd&&(bd.y+bd.h)});
    L.say(!!fab&&!!bar&&fab.y>=bar.y-0.5&&fab.y+fab.h<=bar.y+bar.h+0.5,geo+': TC-R11 it sits inside the bottom player bar - "the right edge of Morphy\'s box", which is the answer he asked us to read',{fab,bar});
    L.say(!!fab&&!!bar&&Math.abs((bar.x+bar.w)-(fab.x+fab.w)-9)<1.5,geo+': TC-R11 it is flush to the bar\'s right edge, on the same 9px gutter as ⋯ in the top bar (gap '+(fab&&bar&&Math.round(((bar.x+bar.w)-(fab.x+fab.w))*10)/10)+')',{fabRight:fab&&(fab.x+fab.w),barRight:bar&&(bar.x+bar.w)});
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

  // ---- #382 TC-R04 (test-lane item 10): THE STORED-ROW VERDICT VOCABULARY, which is the app telling you whether
  // you won. Two separate things were found here and only one of them was the app's.
  //
  // THE HARNESS TRAP, which is what the lane actually reported: a stored row shows no verdict at all unless
  // ct_ccuser is seeded, because that is how the code works out which side you were. Seed it and the row reads
  // "WON vs mr_dhanzzxnsx".
  //
  // THE APP FINDING, measured on #382: gameInfo's loss vocabulary listed 'lose' - Chess.com's real code, handled
  // correctly - but not 'loss'. A row carrying 'loss' fell through to DRAW and reported a lost game as a draw,
  // silently. No source sends 'loss' today, so this was not live harm; it is a wrong answer waiting for one that
  // does, and one word closes it. Measured before: lose -> LOST, win -> WON, loss -> DRAW. After: all three right.
  // Asserted here because "did I win" is user-facing truth, and a silent draw is worse than a visible error.
  {
    const b3=await L.launch({geo:'kunal730',name:'row-verdicts',store:{}});await b3.open();
    for(const [wr,want] of [['win','WON'],['lose','LOST'],['loss','LOST'],['agreed','DRAW']]){
      await b3.page.evaluate((wr)=>{
        localStorage.setItem('ct_ccuser','jsmiller1112');
        localStorage.setItem('ct_accts',JSON.stringify(['cc:jsmiller1112']));
        localStorage.setItem('ct_acctgames',JSON.stringify({'cc:jsmiller1112':[
          {src:'cc',white:'jsmiller1112',black:'mr_dhanzzxnsx',wr:wr,pgn:'[White "jsmiller1112"] [Black "mr_dhanzzxnsx"] 1. e4 e5 *',end:1757000000}]}));
      },wr);
      await b3.open();
      await b3.tile('Review');await b3.settle(700);
      const row=await b3.page.evaluate(()=>{const t=(document.getElementById('root').innerText||'').replace(/\s+/g,' ');
        const m=t.match(/(WON|LOST|DRAW|DREW)[^|]{0,30}mr_dhanzzxnsx/i);return m?m[0].trim():'no verdict row';});
      L.say(new RegExp('^'+want,'i').test(row),'TC-R04 a stored game with wr="'+wr+'" reads '+want+' (seeding ct_ccuser is what makes the verdict appear at all)',row);
    }
    await b3.close();
  }
},'REVIEW');
