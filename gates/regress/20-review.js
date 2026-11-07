// regress/20-review.js  The Review screen's regression suite: TC-R01..TC-R09 and TC-R11..TC-R14 of
// claude/stories/TEST-CASES.md, executed on the bundle under test at THREE geometries: 375x730 (lib.js GEOS.kunal730,
// the column R19 superseded - R19 settled 375x761, which this loop does not yet visit [#549 item (23)]); 375x679, which is NOT his phone and is kept only as a
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
const LADDER=[...L.GRADES];
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
    // #547 item (56): the eval graph is ON by default now, so this walk pins it OFF to keep its baseline the graph-off bar
    // that TC-R12 below compares the graph-on reload against (otherwise that comparison would read graph-on against itself).
    const b=await L.launch({geo,name:'review-'+geo,store:{ct_pool:'3',ct_evalgraph:'0'}});await b.open();
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
    if(L.GEOS[geo].w===375&&L.GEOS[geo].h===679)L.say(/* dimensions, not the name [#545 item (4)] */at.p0.board&&Math.abs(at.p0.board.w-349)<0.6,'kunal: TC-R06 review board is 349 wide ('+(at.p0.board&&at.p0.board.w)+')');
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
    /* #549 item (102): until its "If ..." refutation arrives the Brilliant reason stops at its opening clause ('You give up a piece.',
       20 characters) so the arrival only appends; read the reason once it has settled (up to 6 s), not at a fixed 500 ms. */
    const why={text:''};for(let k=0;k<13;k++){why.text=(await b.text('[data-ct="rev-why"]'))||'';if(why.text.length>20)break;await b.page.waitForTimeout(500);}L.say(why.text.length>20,geo+': TC-R08 the reason line is present on 10.Nxb5',why&&why.text.slice(0,70));
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
    // TC-R71 (#547 item (188)): leaving analysis puts the engine-line switch back. Read BEFORE the round button.
    const eng71a=await b.rect('[data-ct="rev-engline"]');const cmp71a=await b.rect('[data-ct="rev-compact"]');
    L.say(!eng71a&&!!cmp71a,geo+': TC-R71 PRECONDITION at 10.Nxb5 before analysis there is NO engine-line row, and rev-compact is measured',{eng:eng71a,cmp:cmp71a&&cmp71a.h});
    const sig0=await gridSig(b);await b.tapCt('rev-fab',700);const tx=await b.texts();
    L.say(tx.some(t=>/Undo/.test(t))&&tx.some(t=>/Exit analysis/.test(t)),geo+': TC-R11 analysis board offers Undo and Exit analysis',tx.join(' | ').slice(0,200));
    {const e=await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-engline"]'));L.say(e,geo+': TC-R71 PRECONDITION analysis turned the engine line ON - the row is in the DOM inside analysis',{inAnalysis:e});}
    await b.move('a7','a6',500);await b.move('h2','h3',500);const sig2=await gridSig(b);
    L.say(sig2!==sig0,geo+': TC-R11 two moves register on the analysis board');
    await b.tapText(/Undo/,{wait:500});const sig1=await gridSig(b);L.say(sig1!==sig2,geo+': TC-R11 Undo takes one move back');
    await b.tapText(/Exit analysis/,{wait:700});const after=await b.metrics();const ml19b=await b.rect('[data-ct="rev-move-line"]');
    L.say(!!after.board&&Math.abs(after.board.w-bd.w)<0.6&&!!ml19b&&/Nxb5/.test(ml19b.text),geo+': TC-R11 Exit returns to 10.Nxb5 with the board unchanged ('+(after.board&&after.board.w)+')');
    await b.settle(1500);{const eng=await b.rect('[data-ct="rev-engline"]');const cmp=await b.rect('[data-ct="rev-compact"]');const m={board:await b.board()};
      L.say(!eng,geo+': TC-R71 after Exit analysis and a 1.5s settle the engine-line row is GONE again - the switch went back to what it read before analysis',{eng});
      L.say(!!cmp&&!!cmp71a&&Math.abs(cmp.h-cmp71a.h)<0.6&&!!m.board&&Math.abs(m.board.y-bd.y)<0.6&&Math.abs(m.board.w-bd.w)<0.6,geo+': TC-R71 rev-compact is the height it was before analysis, and the board top and width are unchanged',{cmp:cmp&&cmp.h,was:cmp71a&&cmp71a.h,board:m.board&&[m.board.y,m.board.w],wasBoard:[bd.y,bd.w]});}
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
    L.say(!!g&&g.w>60,geo+': TC-R12 the eval graph renders with the switch on - in the band under the board where the band holds it, else in the player bar (#547 items (56), (184))',g&&{w:g.w,h:g.h});
    L.say(bars2[1]&&at.p0.bars[1]&&Math.abs(bars2[1].h-at.p0.bars[1].h)<0.6&&m2.board&&Math.abs(m2.board.w-at.p0.board.w)<0.6,geo+': TC-R12 graph on: bar height and board width unchanged',{bar:bars2[1]&&bars2[1].h,was:at.p0.bars[1].h,board:m2.board&&m2.board.w});
    if(g){await b.page.mouse.click(g.x+g.w*0.7,g.y+g.h/2);await b.settle(500);const mlg=await b.rect('[data-ct="rev-move-line"]');L.say(!!mlg&&mlg.text!==(at.p0.ml||''),geo+': TC-R12 a tap on the graph jumps to a later ply',mlg&&mlg.text);}
    await b.close();
  }
  // TC-R12b THE GRAPH IS ON BY DEFAULT [#547, item (56); jobs/eval-graph-into-the-band; Kunal answered this on 14 and 15 Sep,
  // and what shipped at #369 was the switch, not the answer]. At 375x730 with NO ct_evalgraph key seeded the graph renders in
  // the player bar, and the board's width and top are identical to the same review with the graph switched off - the graph
  // lives in the band and costs the board nothing. Both readings are taken in one session, off after on, at ply 0.
  {
    const b=await L.launch({geo:'kunal730',name:'review-graph-default',store:{ct_pool:'3'}});await b.open();
    const key0=await b.page.evaluate(()=>localStorage.getItem('ct_evalgraph'));
    await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);
    await b.tapText(/^⚡ Analyze Game$/,{wait:200});
    let ok=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:90000});}catch(e){ok=false;}
    L.say(ok,'kunal730: TC-R12b PRECONDITION the review reached its summary with no ct_evalgraph key in the store (key read at launch: '+JSON.stringify(key0)+')',{key0});
    if(ok){
      await b.tapText(/^Start review/,{wait:900});
      const gOn=await b.rect('[data-ct="eval-graph"]');const mOn=await b.metrics();
      L.say(!!gOn&&gOn.w>60,'kunal730: TC-R12b with nothing seeded the eval graph RENDERS - on by default',gOn&&{w:gOn.w,h:gOn.h});
      // TC-R72 [#547 items (56) and (184)]: AT HIS PHONE THE GRAPH IS IN THE BAND - below the bottom player bar and above
      // rev-compact, and NOT inside the bar. The 60px rule (Kunal, 11 Oct) is met by moving a real element into the band.
      {const pb=await b.rect('[data-ct="pbar-bottom"]');const cp=await b.rect('[data-ct="rev-compact"]');
       const inBar=await b.page.evaluate(()=>!!document.querySelector('[data-ct="pbar-bottom"] [data-ct="eval-graph"]'));
       L.say(!!gOn&&!!pb&&!!cp&&!inBar&&gOn.y>=pb.y+pb.h-0.5&&gOn.y+gOn.h<=cp.y+0.5,'kunal730: TC-R72 the graph sits IN THE BAND - under the bottom player bar ('+(pb&&(pb.y+pb.h))+') and over rev-compact ('+(cp&&cp.y)+'), not inside the bar',{g:gOn&&[gOn.y,gOn.h],barBottom:pb&&pb.y+pb.h,cmpTop:cp&&cp.y,inBar});
       const ink=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="eval-graph"] svg');if(!e)return null;const r=e.getBoundingClientRect();return {y:r.y,h:r.height};});
       L.say(!!ink&&!!pb&&!!cp&&(ink.y-(pb.y+pb.h))<=60&&(cp.y-(ink.y+ink.h))<=60,'kunal730: TC-R72 and neither the gap above the drawn graph nor the gap below it is over 60px',{ink,above:ink&&pb&&Math.round((ink.y-(pb.y+pb.h))*10)/10,below:ink&&cp&&Math.round((cp.y-(ink.y+ink.h))*10)/10});}
      // TC-R68 [#547, item (161)]: the review just opened asked for both players' countries and the harness REFUSED both
      // requests (it aborts chess.com and lichess). A refused lookup must not be cached as an answer - before the fix it was
      // written as '' ("no country") and that player's flag was gone for good. Read the cache after the lookups settled.
      await b.settle(1500);
      const ccache=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_country')||'{}');}catch(e){return {bad:true};}});
      L.say(!Object.prototype.hasOwnProperty.call(ccache,'cc:morphy')&&!Object.prototype.hasOwnProperty.call(ccache,'cc:duke karl / count isouard'),'kunal730: TC-R68 a REFUSED country lookup is not cached - the review asked for both players and the harness refused both, and ct_country holds no entry for either, so the next review asks again',ccache);
      await b.page.evaluate(()=>{localStorage.setItem('ct_evalgraph','0');});await b.open();await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);
      await b.tapText(/^⚡ Analyze Game$/,{wait:200});try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:60000});}catch(e){}
      await b.tapText(/^Start review/,{wait:900});
      const gOff=await b.rect('[data-ct="eval-graph"]');const mOff=await b.metrics();
      L.say(!gOff,'kunal730: TC-R12b and switched off it is gone, so the reading above was the default and not a stale render',{gOff:!!gOff});
      L.say(!!mOn.board&&!!mOff.board&&Math.abs(mOn.board.w-mOff.board.w)<0.6&&Math.abs(mOn.board.top-mOff.board.top)<0.6,
        'kunal730: TC-R12b the board is the same width and top with the graph on as off - the graph sits in the band ('+(mOn.board&&mOn.board.w)+'/'+(mOn.board&&mOn.board.top)+' on, '+(mOff.board&&mOff.board.w)+'/'+(mOff.board&&mOff.board.top)+' off)',{on:mOn.board,off:mOff.board});
      // TC-R107 [#549 item (3); jobs/a-failed-country-lookup-is-cached-as-an-answer-...-2026-10-10, the job's "TC-R27" seeded
      // arm - that id is already a case in the register]. TC-R68 above proves a refused lookup leaves no answer behind; this proves the
      // other half, that an ANSWER in the cache paints. Three arms in this one session, graph off, ply 0 of the Opera Game:
      // UNSEEDED (the reading just taken: TC-R68 left no entry, so no flag), SEEDED with 'us' (lowercase, so flagOf must
      // uppercase it) and 'DE', and REJECTS with 'USA' and '1A', which flagOf must refuse. Flags are counted as text nodes
      // made of regional-indicator letters inside the two player bars, and the names are found by WHAT THEY SAY, not by any
      // data-ct - #432's rule. A painted flag must push its own player's name right by the flag's width plus the computed gap of the row they share (6px today; read, not hard-coded).
      // CONTROL-RECORD: 5fec51b 2026-11-06 total=217 red=2 scope=full how=flagOf without toUpperCase (seeded us paints nothing), trial md5 7995a040f477; red: TC-R107 two-flags and Morphy's name shift. The good trial 0ec547e8eecc reads 217 PASS 0 FAIL.
      // CONTROL-RECORD: 5fec51b 2026-11-06 total=217 red=2 scope=full how=flag span position absolute (flag paints, names do not move), trial md5 5e5a52a68228; red: both TC-R107 name shifts, while the two-flags assertion stays green. NOT controlled: the USA/1A arm.
      {const NAMES={w:'Morphy',b:'Duke Karl / Count Isouard'};
       const readBars=async()=>b.page.evaluate((NAMES)=>{const out={flags:[],names:{}};
         for(const sel of ['[data-ct="pbar-top"]','[data-ct="pbar-bottom"]']){const bar=document.querySelector(sel);if(!bar)continue;
           const tw=document.createTreeWalker(bar,NodeFilter.SHOW_TEXT);let n;
           while((n=tw.nextNode())){const t=(n.nodeValue||'').trim();if(!t)continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();
             if(/^(?:[\u{1F1E6}-\u{1F1FF}]{2})+$/u.test(t)){const row=n.parentElement&&n.parentElement.parentElement;const gap=row?parseFloat(getComputedStyle(row).columnGap):NaN;out.flags.push({t,x:r.x,w:r.width,h:r.height,bar:sel,gap});}
             for(const k of Object.keys(NAMES))if(t===NAMES[k])out.names[k]={x:r.x,y:r.y,bar:sel};}}
         return out;},NAMES);
       const reopen=async(cc)=>{await b.page.evaluate((cc)=>{localStorage.setItem('ct_country',JSON.stringify(cc));},cc);await b.open();await b.tile('Review');
         await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:200});
         let s=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:60000});}catch(e){s=false;}
         if(s){await b.tapText(/^Start review/,{wait:900});await b.settle(600);}return s;};
       const un=await readBars();
       L.say(!!un.names.w&&!!un.names.b&&un.flags.length===0,'kunal730: TC-R107 PRECONDITION unseeded arm: both names are found by their text in the player bars and no flag is painted',un);
       const okS=await reopen({'cc:morphy':'us','cc:duke karl / count isouard':'DE'});const se=await readBars();
       const want={w:String.fromCodePoint(0x1F1FA,0x1F1F8),b:String.fromCodePoint(0x1F1E9,0x1F1EA)};
       L.say(okS&&se.flags.length===2&&se.flags.some(f=>f.t===want.w)&&se.flags.some(f=>f.t===want.b),'kunal730: TC-R107 seeded with us and DE: EXACTLY TWO flags paint in the player bars, US (from lowercase us) and DE',{flags:se.flags.map(f=>[f.t,Math.round(f.w*10)/10,f.bar])});
       for(const k of ['w','b']){const f=se.flags.find(x=>x.t===want[k]);const d=(se.names[k]&&un.names[k])?se.names[k].x-un.names[k].x:null;
         L.say(!!f&&d!=null&&d>=10&&isFinite(f.gap)&&Math.abs(d-(f.w+f.gap))<=1.5&&se.names[k].bar===f.bar,'kunal730: TC-R107 seeded: '+NAMES[k]+'\'s name moves right by its own flag\'s width plus its row\'s computed gap ('+(d==null?'?':Math.round(d*10)/10)+'px, flag '+(f?Math.round(f.w*10)/10:'?')+'px + gap '+(f?f.gap:'?')+'px), in the same bar',{d,flag:f,name:se.names[k],was:un.names[k]});}
       const okR=await reopen({'cc:morphy':'USA','cc:duke karl / count isouard':'1A'});const rj=await readBars();
       const dR=['w','b'].map(k=>(rj.names[k]&&un.names[k])?Math.abs(rj.names[k].x-un.names[k].x):99);
       L.say(okR&&rj.flags.length===0&&dR.every(d=>d<0.6),'kunal730: TC-R107 seeded with USA and 1A, which are not two-letter codes: NO flag paints and neither name moves ('+dR.map(d=>Math.round(d*10)/10).join(', ')+'px)',{flags:rj.flags,dR});}
    }
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,'kunal730: TC-R12b no app error beyond the allowed engine trap',b.errs.slice(0,3));
    await b.close();
  }
  // TC-R66 A SET-UP GAME IS REVIEWED FROM ITS [FEN] HEADER, AND A HEADER THAT CANNOT BE READ IS REFUSED [#547 item (78) built the
  // refusal; #549 item (66), jobs/honour-fen-header, the honoured half]. Kunal: "honour it, and refuse a header we cannot parse
  // rather than silently starting from move 1". The job's case (it named it TC-R44, which the register holds for US-R34), at
  // Kunal's 375x761 only - every assertion is on state, not layout [R36]. (a) THREE LEGAL SET-UP GAMES whose moves fit only from
  // the header - a study chapter with Black to move at 23, a K+R endgame at 40, an Italian middlegame with castling rights at 4:
  // the review's first position equals the header's placement, side to move, castling and en-passant fields (the app keeps no
  // clocks), the move strip's first entry carries the header's number and side ('23…', '40.', '4.'), and each side's move count
  // is that side's own plies (the study game is 3 Black, 2 White - with i%2 parity it reads the other way round). (b) THREE
  // MALFORMED HEADERS (a '9' in a rank, two white kings, the side not to move in check) with moves that fit only from the
  // position they meant: refused with a sentence naming the [FEN] header, and no summary, accuracy or review object at all.
  // Controls for this block: four negative-control bundles, recorded by the run (deferred from #549 item (66)).
  // CONTROL-RECORD: e982dcb 2026-11-06 total=31 red=12 scope=blocks:TC-R66 how=importGame calls loadSANs(sans) without the header's start (startFen ignored), trial md5 0b4c001bac29; red: all four honoured-half assertions (summary, first position, per-side counts, strip entry) for each of the three legal set-up games. The good trial 144c84708965 reads 31 PASS 0 FAIL on the block and 298 PASS 0 FAIL on the whole gate.
  // CONTROL-RECORD: e982dcb 2026-11-06 total=31 red=3 scope=blocks:TC-R66 how=revMover/revNo back to i%2 parity with no plyBase, trial md5 76cb387796a6; red: the strip's first-entry assertion for all three legal set-up games ('1…Ke4', '1.Ra5+', '1.O-O').
  // CONTROL-RECORD: e982dcb 2026-11-06 total=31 red=1 scope=blocks:TC-R66 how=the summary's per-side tally back to i%2 parity, trial md5 5df7077ef37f; red: the study chapter's per-side count (read White 3, Black 2). NOT controlled by it: the endgame and middlegame, whose counts are parity-blind.
  // CONTROL-RECORD: e982dcb 2026-11-06 total=31 red=3 scope=blocks:TC-R66 how=pgnStart never refuses (an unreadable header is treated as no header), trial md5 8cefc700806a; red: the refusal-names-FEN assertion for all three malformed headers. The no-review assertion stays green there because those moves do not fit the opening position either.
  {
    const OK=[
      ['study chapter, Black to move','8/8/8/3k4/8/8/3PK3/8 b - - 0 23','[Event "Study: King and pawn"]\n[Site "https://lichess.org/study/abcdEFGH/ijklMNOP"]\n[ChapterName "Opposition"]\n[Result "*"]\n[Variant "Standard"]\n[SetUp "1"]\n[FEN "8/8/8/3k4/8/8/3PK3/8 b - - 0 23"]\n\n23... Ke4 24. d3+ Kd4 25. Kd2 Ke5 *','23…','Ke4',{w:2,b:3}],
      ['endgame, White to move','8/8/8/4k3/8/8/4K3/R7 w - - 0 40','[Event "Set-up endgame"]\n[SetUp "1"]\n[FEN "8/8/8/4k3/8/8/4K3/R7 w - - 0 40"]\n[Result "*"]\n\n40. Ra5+ Kd4 41. Ra4+ Kc5 42. Kd3 Kb5 *','40.','Ra5',{w:3,b:3}],
      ['middlegame with castling rights','r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4','[Event "Set-up middlegame"]\n[SetUp "1"]\n[FEN "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"]\n[Result "*"]\n\n4. O-O Nf6 5. d3 d6 6. c3 *','4.','O-O',{w:3,b:2}]];
    for(const [tag,fen,pgn,no,san,per] of OK){
      const b=await L.launch({geo:'kunal761',name:'review-fen-'+no.replace(/\W/g,''),store:{ct_pool:'3'}});await b.open();
      await b.tile('Review');const ta=b.page.locator('textarea').first();await ta.fill(pgn);
      const took=await ta.inputValue().catch(()=>'');
      L.say(took.indexOf('[FEN "'+fen+'"]')>=0,'kunal761: TC-R66 '+tag+' PRECONDITION the paste box holds the PGN with its [FEN] header',{len:took.length});
      await b.tapText(/^⚡ Analyze Game$/,{wait:300});
      let sum=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:90000});}catch(e){sum=false;}
      const st=await b.page.evaluate(()=>{const rv=window.__ctReview;if(!rv||!rv.positions||!rv.positions[0])return null;const g=rv.positions[0];const F='abcdefgh';
        const rows=g.board.map(row=>{let s='',e=0;for(const p of row){if(!p){e++;continue;}if(e){s+=e;e=0;}s+=p.c==='w'?p.t.toUpperCase():p.t;}return s+(e?e:'');});
        const ca=g.castling||{};const cs=(ca.wK?'K':'')+(ca.wQ?'Q':'')+(ca.bK?'k':'')+(ca.bQ?'q':'')||'-';const ep=g.ep?F[g.ep[1]]+(8-g.ep[0]):'-';
        const S=rv.summary||{};return {fen4:rows.join('/')+' '+g.turn+' '+cs+' '+ep,plies:rv.plies.length,w:S.w&&S.w.moves,b:S.b&&S.b.moves};});
      const err=await b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/[^.\n]*\[FEN\][^.\n]*\./);return m?m[0]:null;});
      L.say(sum&&!err,'kunal761: TC-R66 '+tag+': the game is ANALYSED and reaches the summary, with no refusal',{summary:sum,err});
      const want4=fen.split(' ').slice(0,4).join(' ');
      L.say(!!st&&st.fen4===want4,'kunal761: TC-R66 '+tag+': the review\'s first position IS the header\'s ('+want4+'), not the opening position',{got:st&&st.fen4,want:want4});
      L.say(!!st&&st.w===per.w&&st.b===per.b,'kunal761: TC-R66 '+tag+': each side\'s move count is its own plies, White '+per.w+' and Black '+per.b,{st,want:per});
      let first=null;if(sum){await b.tapText(/^Start review/,{wait:900});await b.settle(500);
        first=await b.page.evaluate(()=>{const m=document.querySelector('[data-mstrip]');if(!m)return null;const row=m.firstElementChild;const e=row&&row.firstElementChild;return e?(e.innerText||'').replace(/\s+/g,''):null;});}
      L.say(!!first&&first.indexOf(no)===0&&first.slice(no.length).indexOf(san)===0,'kunal761: TC-R66 '+tag+': the move strip\'s first entry carries the header\'s move number and side ('+no+' '+san+'), not 1. and White',{first,want:no+san});
      L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,'kunal761: TC-R66 '+tag+': no app error beyond the allowed engine trap',b.errs.slice(0,2));
      await b.close();
    }
    const BAD=[
      ['a 9 in a rank','[Event "Malformed set-up"]\n[SetUp "1"]\n[FEN "8/8/8/4k3/8/9/4K3/R7 w - -"]\n[Result "*"]\n\n40. Ra5+ Kd4 41. Ra4+ Kc5 *'],
      ['two white kings','[Event "Two kings"]\n[SetUp "1"]\n[FEN "8/8/8/4k3/8/8/4K3/R3K3 w - - 0 40"]\n[Result "*"]\n\n40. Ra5+ Kd4 41. Ra4+ Kc5 *'],
      ['the side not to move in check','[Event "Impossible check"]\n[SetUp "1"]\n[FEN "8/8/8/R3k3/8/8/4K3/8 w - - 0 40"]\n[Result "*"]\n\n40. Ra4 Kd5 41. Kd3 Kc5 *']];
    for(const [tag,pgn] of BAD){
      const b=await L.launch({geo:'kunal761',name:'review-badfen-'+tag.replace(/\W/g,''),store:{ct_pool:'3'}});await b.open();
      await b.tile('Review');const ta=b.page.locator('textarea').first();await ta.fill(pgn);
      const took=await ta.inputValue().catch(()=>'');
      L.say(/\[FEN /.test(took),'kunal761: TC-R66 malformed FEN, '+tag+' PRECONDITION the paste box holds the PGN with its [FEN] header',{len:took.length});
      await b.tapText(/^⚡ Analyze Game$/,{wait:2500});
      const r=await b.page.evaluate(()=>{const t=(document.body.innerText||'').replace(/\s+/g,' ');
        return {summary:!!document.querySelector('[data-ct="rev-summary"]'),err:(t.match(/This game's \[FEN\] header could not be read[^.]*\./)||[null])[0],acc:/Accuracy/i.test(t),review:!!window.__ctReview};});
      L.say(!!r.err&&/FEN/.test(r.err),'kunal761: TC-R66 malformed FEN, '+tag+': the import is REFUSED with a sentence that names the [FEN] header, not the first move',r);
      L.say(!r.summary&&!r.acc&&!r.review,'kunal761: TC-R66 malformed FEN, '+tag+': and no summary, accuracy, grade count or review is produced for it',r);
      L.say(b.errs.length===0,'kunal761: TC-R66 malformed FEN, '+tag+': zero app errors',b.errs.slice(0,2));
      await b.close();
    }
    // THE OTHER DIRECTION [#547 antagonist A on item (78)]: a refusal that fires on ORDINARY games would block reviews, and no
    // input above could see it. A [FEN] equal to the standard start (SetUp 1), and SetUp "0" with a junk FEN, are NOT set-up
    // games: each must reach the summary with no refusal sentence.
    const STD='[Event "Standard start in a FEN header"]\n[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';
    const SU0='[Event "SetUp zero"]\n[SetUp "0"]\n[FEN "8/8/8/4k3/8/8/4K3/R7 w - - 0 40"]\n[Result "*"]\n\n1. d4 d5 2. c4 e6 3. Nc3 Nf6 *';
    for(const [tag,pgn] of [['standard-start FEN',STD],['SetUp 0',SU0]]){
      const b=await L.launch({geo:'kunal730',name:'review-fen-ok-'+tag.replace(/ /g,'-'),store:{ct_pool:'3'}});await b.open();
      await b.tile('Review');await b.page.locator('textarea').first().fill(pgn);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
      let sum=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:90000});}catch(e){sum=false;}
      const refused=await b.page.evaluate(()=>/\[FEN\] header could not be read|This game starts from a set-up position/.test(document.body.innerText||''));
      L.say(sum&&!refused,'kunal730: TC-R66 '+tag+': NOT refused - it reaches the summary, because it is not a set-up game',{summary:sum,refused});
      await b.close();
    }
  }
  // TC-R36 [#547 item (103); Kunal's 'drop-word', desk round 1]: THE BEST MOVE IS SHOWN IN FULL ON A NARROW BOARD. Walk the stored
  // review at 320x568 and 375x568 (a WIDE viewport over a NARROW board - the row is sized to the board) and 375x730; at every ply that
  // shows a best-move chip, the chip's text is not cut and it ends inside its row. On the narrow boards the verdict word yields (the ??
  // and its colour stay); at 375x730 it stays. Denominator first: plies with a chip were found.
  {const RV=require('../drive/review');
   for(const g of ['se','short375','kunal730']){const b=await L.launch({geo:g,name:'r36-'+g,store:RV.SEED});await b.open();
     let ok=true;try{await RV.states['moves-ply0'](b);await b.settle(500);}catch(e){ok=false;}
     let n=0;const bad=[];const pills=new Set();
     if(ok)for(let k=0;k<70;k++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click().catch(()=>{});await b.page.waitForTimeout(140);
       const r=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-best"]');if(!e)return null;const row=e.parentElement.getBoundingClientRect();const q=e.getBoundingClientRect();const p=e.previousElementSibling;
         return {sw:e.scrollWidth,cw:e.clientWidth,inRow:q.right<=row.right+0.5,pill:p?(p.innerText||'').replace(/\s+/g,' ').trim():'',glyph:p?/[?!]/.test(p.innerText||''):false};});
       if(r){n++;pills.add(r.pill);if(r.sw>r.cw+0.5||!r.inRow||!r.glyph)bad.push(k+1+':'+r.sw+'/'+r.cw+(r.inRow?'':' out')+(r.glyph?'':' no-glyph'));}}
     L.say(n>0,g+': TC-R36 DENOMINATOR the walk found plies with a best-move chip ('+n+')',{n});
     L.say(n>0&&bad.length===0,g+': TC-R36 at every such ply the best move is shown in full and inside its row, and the verdict glyph stays',{n,bad,pills:[...pills]});
     await b.close();}
  }
  // TC-R79 [#547 item (107); jobs/review-summary-runs-under-the-status-bar-2026-09-22]: THE SUMMARY STAYS BELOW THE STATUS BAR. At
  // 375x761 with ct_safe 51,31 (Kunal's insets): the summary's scroller starts at or below the 51px inset, the menu button sits below
  // it, and with the summary scrolled to the bottom no VISIBLE text is above 51 (text the scroller clips is not painted, so it is not
  // counted). The inset used to be padding inside the scroller, which scrolled away with the content.
  {const RV=require('../drive/review');const b=await L.launch({geo:'kunal761',name:'r79-summary-inset',store:RV.SEED});await b.open();
   let ok=true;try{await RV.states['summary'](b);await b.settle(800);}catch(e){ok=false;}
   const rd=()=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return null;const sc=[...s.querySelectorAll('div')].find(d=>/auto|scroll/.test(getComputedStyle(d).overflowY)&&d.scrollHeight>d.clientHeight);
     const scr=sc?sc.getBoundingClientRect():null;const mb=document.querySelector('[data-ct="rev-summary-menu"]');let vis=1e9;const tw=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);let n;
     while((n=tw.nextNode())){if(!n.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);const q=rg.getBoundingClientRect();if(q.height<=0)continue;
       const inSc=sc&&sc.contains(n.parentElement);const top=inSc?Math.max(q.top,scr.top):q.top;if(inSc&&q.bottom<=scr.top)continue;if(top<vis)vis=top;}
     return {scTop:scr&&scr.top,menuTop:mb?mb.getBoundingClientRect().top:null,visTop:vis};});
   const r0=await rd();
   L.say(ok&&!!r0&&r0.scTop!=null,'kunal761: TC-R79 PRECONDITION the summary is up and its scroller is found',r0);
   await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');const sc=s&&[...s.querySelectorAll('div')].find(d=>/auto|scroll/.test(getComputedStyle(d).overflowY)&&d.scrollHeight>d.clientHeight);if(sc)sc.scrollTop=sc.scrollHeight;});await b.settle(400);
   const r1=await rd();
   L.say(!!r0&&r0.scTop>=50.5&&r0.menuTop>=50.5,'kunal761: TC-R79 the summary scroller and its menu button both start below the 51px status bar ('+(r0&&Math.round(r0.scTop))+', '+(r0&&Math.round(r0.menuTop))+')',r0);
   L.say(!!r1&&r1.visTop>=50.5,'kunal761: TC-R79 scrolled to the bottom, no visible text of the summary is under the status bar (top visible text at '+(r1&&Math.round(r1.visTop))+')',r1);
   await b.close();}
  // CONTROL-RECORD: 18de6cc 2026-11-06 total=225 red=2 scope=full how=HEAD 7982ed8's own bundle (menu button position absolute over the scroller), trial md5 3a181ac1b381; red: both TC-R111 no-cover lines (kunal761 56 of 237, kunal730 56 of 232). The good trial 9a0f44fae251 reads 225 PASS 0 FAIL.
  // TC-R111 [#549 item (44); jobs/review-summary-runs-under-the-status-bar-2026-09-22, the job's case (b) and (a) over every scroll
  // position]: THE ☰ NEVER SITS ON SUMMARY TEXT. It used to be position:absolute over the scroller, so at 56 of 237 positions (4px
  // steps) it covered the players line, the coach sentence, 'Black' and '2/10', at BOTH insets. Scanned at 375x761 with 51/31 and at
  // 375x730 with no inset (the control the job names: the overlap never depended on the inset). Painted text = a text rect clipped to
  // the scroller. DENOMINATOR, its own assertion: some text passes through the button's own column (x band) during the scan, so a
  // summary that lost its text cannot pass.
  for(const g of ['kunal761','kunal730']){const RV=require('../drive/review');const b=await L.launch({geo:g,name:'r111-menu-over-text-'+g,store:RV.SEED});await b.open();
   let ok=true;try{await RV.states['summary'](b);await b.settle(800);}catch(e){ok=false;}
   // The top inset is a PROPERTY OF THE GEOMETRY ENTRY (L.GEOS[g].safe, 'top,bottom'), never inferred from its name [#549 veto A1-R2].
   const inset=+(String((L.GEOS[g]||{}).safe||'').split(',')[0])||0;
   const r=ok?await b.page.evaluate((inset)=>{const s=document.querySelector('[data-ct="rev-summary"]');const mb=document.querySelector('[data-ct="rev-summary-menu"]');if(!s||!mb)return null;
     const sc=[...s.querySelectorAll('div')].find(d=>/auto|scroll/.test(getComputedStyle(d).overflowY)&&d.scrollHeight>d.clientHeight);if(!sc)return null;
     const max=sc.scrollHeight-sc.clientHeight;const o={max,positions:0,hitPos:0,colPos:0,underInset:0,ex:[],minTop:1e9};
     for(let st=0;st<=max+4;st+=4){sc.scrollTop=st;const scr=sc.getBoundingClientRect();const m=mb.getBoundingClientRect();let hit=0,col=0;
       const tw=document.createTreeWalker(sc,NodeFilter.SHOW_TEXT);let n;
       while((n=tw.nextNode())){if(!n.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);
         for(const q of rg.getClientRects()){const t=Math.max(q.top,scr.top),bt=Math.min(q.bottom,scr.bottom);if(bt<=t||q.width<=0)continue;
           if(t<o.minTop)o.minTop=t;if(t<inset-0.5)o.underInset++;
           if(q.left<m.right&&q.right>m.left){col=1;if(t<m.bottom&&bt>m.top){hit=1;if(o.ex.length<6)o.ex.push(st+':'+n.nodeValue.trim().slice(0,24));}}}}
       o.positions++;if(hit)o.hitPos++;if(col)o.colPos++;}
     sc.scrollTop=0;return o;},inset):null;
   L.say(ok&&!!r&&r.positions>0,g+': TC-R111 PRECONDITION the summary, its scroller and its menu button are found and the scroll was scanned ('+(r&&r.positions)+' positions)',r&&{max:r.max,positions:r.positions});
   L.say(!!r&&r.colPos>0,g+': TC-R111 DENOMINATOR summary text passes through the menu button\'s column during the scan ('+(r&&r.colPos)+' positions)',r&&{colPos:r.colPos});
   L.say(!!r&&r.positions>0&&r.hitPos===0,g+': TC-R111 at no scroll position does the menu button cover painted summary text ('+(r&&r.hitPos)+' of '+(r&&r.positions)+')',r&&{hitPos:r.hitPos,ex:r.ex});
   L.say(!!r&&r.positions>0&&r.underInset===0,g+': TC-R111 at every scroll position no painted summary text is above the '+inset+'px top inset (highest at '+(r&&Math.round(r.minTop))+')',r&&{underInset:r.underInset,minTop:r.minTop});
   await b.close();}
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
  // TC-R88 (US-R86), #547 item (129): WHILE THE BEST LINE PLAYS, THE PLAYED MOVE'S BADGE AND TINT ARE NOT ON THE BOARD. Pre-fix at
  // ply 30 of the reference game the blunder badge and its red tint stayed on squares 11 and 21 throughout the replay of a line
  // that never played that move. The tint must follow the board (the plain last-move colour, on the line's own moves).
  {const RV=require('../drive/review');const b=await L.launch({geo:'kunal730',name:'r88-bestline-badge'});await b.open();
   let ok=true;try{await RV.states['moves-ply0'](b);await RV.goPly(b,30);await b.settle(900);}catch(e){ok=false;}
   const rd=()=>b.page.evaluate(()=>{const bd=document.querySelector('[data-ct="rev-badge"]');const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
     const tints=g?[...g.children].slice(0,64).map((c,i)=>{const o=[...c.children].find(x=>x.style&&x.style.position==='absolute'&&/inset/.test(x.getAttribute('style')||'')&&x.style.zIndex==='1');return o?{i,bg:o.style.background}:null;}).filter(Boolean):[];
     return {badge:bd?(bd.innerText||'').trim():null,tints};});
   const r0=await rd();
   if(L.say(ok&&!!r0.badge&&r0.tints.length===2,'TC-R88 PRECONDITION at ply 30 the played move carries its verdict badge and its two tinted squares, and rev-best is offered',r0)){
     const graded=r0.tints[0].bg;let t=true;try{await b.page.click('[data-ct="rev-best"]');}catch(e){t=false;}
     await b.page.waitForTimeout(2500);const r1=await rd();
     L.say(t&&r1.badge===null,'TC-R88 while the best line plays, the played move\'s verdict badge is gone',r1);
     L.say(t&&r1.tints.every(x=>x.bg!==graded)&&JSON.stringify(r1.tints.map(x=>x.i))!==JSON.stringify(r0.tints.map(x=>x.i)),'TC-R88 and no square carries the played move\'s grade tint: the tint is on the line\'s own last move, in the plain last-move colour',{before:r0.tints,during:r1.tints});
   }
   await b.close();}
  // TC-R89 (US-R88), #547 item (139): THE GRADE TABLE'S COLUMN HEADERS SIT OVER THEIR COLUMNS. Pre-fix the header grid was 1fr 48px
  // 48px over rows of 1fr 56px 56px: at 375x730 'White' inked at 262 over digits at 250, 'Black' at 318 over 314. Located by structure
  // (the header's own text), not by the data-ct this build added - so the pre-fix bundle reds on the misalignment, not a selector.
  for(const geo of ['kunal730','se']){const RV=require('../drive/review');const b=await L.launch({geo,name:'r89-grade-head-'+geo});await b.open();
   let ok=true;try{await RV.states['summary'](b);await b.settle(800);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const ink=e=>{const rg=document.createRange();rg.selectNodeContents(e);const q=rg.getBoundingClientRect();return Math.round((q.left+q.right)/2*10)/10;};
     const head=[...document.querySelectorAll('div')].find(d=>/^1fr \d+px \d+px$/.test(d.style.gridTemplateColumns||'')&&/^\s*White\s*Black\s*$/.test(d.innerText||''));if(!head||!head.nextElementSibling)return null;
     const hc=[...head.children],rc=[...head.nextElementSibling.children];if(hc.length<3||rc.length<3)return null;return {white:ink(hc[1]),black:ink(hc[2]),wDig:ink(rc[1]),bDig:ink(rc[2])};});
   if(L.say(ok&&!!r,geo+': TC-R89 PRECONDITION the summary\'s grade table and its White/Black header are found',r))
     L.say(Math.abs(r.white-r.wDig)<=1&&Math.abs(r.black-r.bDig)<=1,geo+': TC-R89 each header\'s ink is centred over its column\'s digits, within 1px (White '+r.white+' vs '+r.wDig+', Black '+r.black+' vs '+r.bDig+')',r);
   await b.close();}
  // TC-R93 (US-R95), #547 item (170): THE VERDICT BADGE NEVER PAINTS OVER ITS WORD PILL. Pre-fix the pill was centred on the square and
  // the round badge sat on the square's corner: 18x13px of overlap at ply 30 at 375x730, 'Blunder' read 'Blund'. Every ply of the
  // reference game is walked, so the clamped edge squares are in the population; plies with no pill are not counted.
  for(const geo of ['kunal730','se']){const RV=require('../drive/review');const b=await L.launch({geo,name:'r93-pill-'+geo});await b.open();
   let ok=true;try{await RV.states['moves-ply0'](b);}catch(e){ok=false;}
   const hits=[],bad=[];
   for(let p=1;ok&&p<=33;p++){try{await RV.goPly(b,p);await b.settle(500);}catch(e){break;}
     const r=await b.page.evaluate(()=>{const bd=document.querySelector('[data-ct="rev-badge"]'),lb=document.querySelector('[data-ct="rev-badge-label"]');if(!bd||!lb)return null;const sp=lb.querySelector('span')||lb;const a=bd.getBoundingClientRect(),c=sp.getBoundingClientRect();
       return {area:Math.max(0,Math.min(a.right,c.right)-Math.max(a.left,c.left))*Math.max(0,Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top)),t:(sp.innerText||'').trim()};});
     if(r){hits.push(p);if(r.area>0.5)bad.push({ply:p,area:Math.round(r.area),t:r.t});}}
   if(L.say(ok&&hits.length>=1,geo+': TC-R93 PRECONDITION the walk met at least one ply that paints both the badge and its word pill ('+hits.length+': plies '+hits.join(',')+')',{hits}))
     L.say(bad.length===0,geo+': TC-R93 at every such ply the badge and the pill do not overlap',bad);
   await b.close();}
  // TC-R94 (US-R96), #547 item (171): ON THE ANALYSIS BOARD THE ENGINE LINE IS NUMBERED FROM THE POSITION ANALYSED. Drive 'analysis'
  // enters analysis at ply 0 and plays 1.e4 e5, so the engine's line starts with White's SECOND move. Pre-fix it read '1. Nf3 ...':
  // the number of the ply analysis was entered at, drifting a full move every two plies played.
  {const RV=require('../drive/review');const b=await L.launch({geo:'kunal730',name:'r94-ana-num'});await b.open();
   let ok=true;try{await RV.states['analysis'](b);}catch(e){ok=false;}
   let t=null;for(let k=0;k<40&&!/\d+\.\s/.test(t||'');k++){await b.page.waitForTimeout(500);t=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});}
   const m=/(\d+)(\.{1,3})\s/.exec(t||'');
   if(L.say(ok&&!!m,'TC-R94 PRECONDITION after 1.e4 e5 on the analysis board the engine row printed a numbered line',{line:t}))
     L.say(+m[1]===2&&m[2]==='.','TC-R94 the line starts at White\'s move 2 ("2. ..."), the move after 1.e4 e5 - not at the move analysis was entered on ("'+m[0].trim()+'")',{line:t});
   await b.close();}
  // TC-R114 (US-R104), #549 item (68), jobs/transport-row-icon-only: THE TRANSPORT ROW'S ICONS ARE THE BUTTONS, AND THE TARGET
  // CONTROL-RECORD: 729b4d4 2026-11-06 total=245 red=4 scope=trial:7cce11ece74a how=cb() phone minHeight 36 with border, gradient and shadow off, trial md5 7cce11ece74a; red: TC-R114 44 x 44 at all four geometries, the chrome line stays green.
  // CONTROL-RECORD: 729b4d4 2026-11-06 total=245 red=4 scope=trial:3c77598400b0 how=cb() phone minHeight 44 with border, gradient and shadow kept, trial md5 3c77598400b0; red: TC-R114 chrome at all four geometries, the 44 x 44 line stays green. The pre-fix HEAD bundle 780a57efc6f9 reds both lines (8). The good trial ec4bcdbf1098 reads gate 20 245 PASS 0 FAIL.
  // DOES NOT SHRINK. Kunal: "do we need the outline, or can we just make the icons look like buttons themselves to save space".
  // Pre-fix every control in rev-row1 was 42.00px tall (2px under the 44px floor) with a 1px border, a gradient and a box-shadow,
  // at every geometry. The pairing is the point: chrome off AND 44x44 kept AND the centre still hits the control - neither half
  // alone. The board-width floor is the shipped width at that size (keyed by dimensions, never by geometry name), so the 2px the
  // row gained cannot be taken from the board unnoticed. Row width is NOT asserted: flex 1 1 0 makes it a constant here
  // (jobs/row-fit-needs-a-glyph-rect-instrument-2026-09-29).
  for(const geo of ['kunal761','se','kunal730','390']){const RV=require('../drive/review');const b=await L.launch({geo,name:'r114-transport-'+geo});await b.open();
   const G=L.GEOS[geo],dim=G.w+'x'+G.h;const BOARD_FLOOR={'375x761':349,'320x568':264,'375x730':349,'390x844':364}[dim];
   let ok=true;try{await RV.states['moves-ply10'](b);await b.settle(500);}catch(e){ok=false;}
   const m=ok?await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="rev-row1"]');if(!row)return null;
     return [...row.children].filter(c=>{const q=c.getBoundingClientRect();return q.width>1&&q.height>1;}).map(c=>{const q=c.getBoundingClientRect(),st=getComputedStyle(c);
       const hit=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);
       return {t:(c.getAttribute('aria-label')||c.innerText||'').trim().slice(0,24),w:+q.width.toFixed(2),h:+q.height.toFixed(2),bottom:+q.bottom.toFixed(2),
         bw:parseFloat(st.borderTopWidth)||0,bs:st.borderTopStyle,img:st.backgroundImage,sh:st.boxShadow,hit:!!(hit&&(hit===c||c.contains(hit)))};});}):null;
   const bd=ok?await b.board():null;
   if(L.say(!!m&&m.length>=3,geo+': TC-R114 PRECONDITION the review transport row is on screen at ply 10 with its controls ('+(m?m.map(k=>k.t).join(' | '):'none')+')',m)){
     const small=m.filter(k=>k.h<43.99||k.w<43.99);
     L.say(small.length===0,geo+': TC-R114 every transport control is at least 44 x 44 ('+m.map(k=>k.w+'x'+k.h).join(' ')+')',small);
     const chrome=m.filter(k=>k.bw>0.01||k.bs!=='none'||k.img!=='none'||k.sh!=='none');
     L.say(chrome.length===0,geo+': TC-R114 no transport control carries a border, a gradient or a box-shadow ('+chrome.length+' of '+m.length+' do)',chrome);
     const blind=m.filter(k=>!k.hit||k.bottom>G.h+0.5);
     L.say(blind.length===0,geo+': TC-R114 the centre of every control hit-tests to it and the control is on screen',blind);
     L.say(!!bd&&BOARD_FLOOR!=null&&bd.w>=BOARD_FLOOR,geo+': TC-R114 the board keeps its shipped width at '+dim+' ('+(bd&&bd.w.toFixed(2))+' >= '+BOARD_FLOOR+')',{board:bd&&bd.w});}
   await b.close();}
  // TC-R09d [#549 item (79); jobs/review-mate-label-not-plus9-9]: A FORCED MATE IS LABELLED AS A MATE AT EVERY REVIEW RENDER SITE, AT
  // THREE MATE DISTANCES, AND A GENUINE +9.9 IS NOT. TC-R09/TC-R09c cover the Opera Game only, whose mates are M2 and shorter, so a
  // long mate and a real large number were never inputs. Two more games, both from the opening position (a [FEN] game is refused, TC-R66):
  // Edward Lasker v Thomas 1912, whose 11.Qxh7+!! starts a forced mate, and a queen-and-two-knights blunder game that sits at a REAL +9.7 to
  // +10.3. MEASURED BEFORE WRITING with this repo's own stockfish-18-lite-single.js under node, at depth 16 (the review pool's DCAP) and
  // depth 12 (the live bar's), White's point of view [jobs/79/sf/line.js]: Lasker ply 21 (after 11.Qxh7+) M8 and M8, ply 22 M8 and M8,
  // ply 28 (after 14...Kf4) M3 and M3, ply 33 (after 17.Rh2+) M1 and M1, ply 35 18.Kd2# mate delivered; blunder game ply 15 (after 8.exd5)
  // +9.77 and +9.86, ply 16 (after 8...a6) +9.88 and +10.31. The long mate is M8, not the M7 the job's case names: no ply of a real game
  // tried held M7 at both depths, and M8 held at both on two consecutive plies, which is the property the case needs (a mate far past M1).
  // Plies where the two depths DISAGREE (Lasker 20, 24, 27, 30: e.g. ply 24 is M6 at 16 and +8.04 at 12) are deliberately not inputs.
  // RENDER SITES, every one the review paints an evaluation in: eval-bar-num (first paint = stored analysis, via a MutationObserver, and
  // the settled value), rev-engline's leading evaluation with the engine line on, and rev-engwhy-eval (the words the engine line's
  // explanation opens with). rev-cmp is read wherever it renders and its count is printed. Sites x positions is the denominator.
      // CONTROL-RECORD: da06472 2026-11-06 total=276 red=1 scope=full how=chess.jsx #549 item (79) hunk reverted (sfBar back to sfHit at evalNow and evalTxt), trial md5 951516fa818f; red: TC-R09d Lasker ply 21 every-value assertion (DETECTION IS PROBABILISTIC, A7-R4: the control races the live search, so one run of a broken build can read green by luck; dev runs of the block alone gave 1 and 3 red, never 0). The fixed trial 34cb657a90c3 reads 276 PASS 0 FAIL.
  {
    const LASKER='[Event "London"] [White "Edward Lasker"] [Black "George Thomas"] [Result "1-0"] 1. d4 e6 2. Nf3 f5 3. Nc3 Nf6 4. Bg5 Be7 5. Bxf6 Bxf6 6. e4 fxe4 7. Nxe4 b6 8. Ne5 O-O 9. Bd3 Bb7 10. Qh5 Qe7 11. Qxh7+ Kxh7 12. Nxf6+ Kh6 13. Neg4+ Kg5 14. h4+ Kf4 15. g3+ Kf3 16. Be2+ Kg2 17. Rh2+ Kg1 18. Kd2# 1-0';
    const BIG='[Event "Queen and two knights"] [White "W"] [Black "B"] [Result "*"] 1. e4 e5 2. Nf3 Qh4 3. Nxh4 Nf6 4. Qf3 Ng4 5. Qxg4 Nc6 6. Nf3 Nb4 7. a3 Nd5 8. exd5 a6 *';
    // kind: 'mate' with an N band for the settled label, or 'num' with a pawn band. Bands, not exact values: the live bar's N is an
    // engine answer and pinning it exactly would be the #391 coin flip; the band still rejects M1-for-M8 and every number.
    const CASES=[
      {pgn:LASKER,tag:'Lasker',plies:[[21,'mate',6,10],[22,'mate',6,10],[24,'hold',4,8],[28,'mate',2,4],[33,'mate',1,1]]},
      {pgn:BIG,tag:'blunder',plies:[[15,'num',8.5,12],[16,'num',8.5,12]]}];
    const geo='kunal761';
    const rows=[];
    for(const C of CASES){
      const b=await L.launch({geo,name:'r09d-'+C.tag,store:{ct_pool:'3',ct_evalgraph:'0'}});await b.open();
      await b.tile('Review');await b.page.locator('textarea').first().fill(C.pgn);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
      let ok=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});}catch(e){ok=false;}
      L.say(ok,geo+': TC-R09d '+C.tag+' PRECONDITION the game is analysed and reaches the summary');
      if(!ok){await b.close();continue;}
      await b.settle(600);await b.tapText(/^Start review/,{wait:900});await b.settle(700);
      let at=0;
      for(const [p,kind,lo,hi] of C.plies){
        while(at<p-1){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(120);at++;}
        await b.settle(300);
        await b.page.evaluate(()=>{window.__ctSeq=[];const read=()=>{const e=document.querySelector('[data-ct="eval-bar-num"]');const t=e?(e.innerText||'').trim():null;
          const a=window.__ctSeq;if(!a.length||a[a.length-1]!==t)a.push(t);};window.__ctObs=new MutationObserver(read);
          window.__ctObs.observe(document.body,{subtree:true,childList:true,characterData:true});});
        await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});at++;
        await b.page.waitForTimeout(2500);
        const bar=await b.page.evaluate(()=>{try{window.__ctObs.disconnect();}catch(e){}const e=document.querySelector('[data-ct="eval-bar-num"]');
          const c=document.querySelector('[data-ct="rev-cmp"]');const ml=document.querySelector('[data-ct="rev-move-line"]');
          return {seq:(window.__ctSeq||[]).filter(x=>x),settled:e?(e.innerText||'').trim():null,cmp:c?(c.innerText||'').replace(/\s+/g,' ').trim():null,ml:ml?(ml.innerText||'').replace(/\s+/g,' ').trim().slice(0,40):null};});
        // engine line on, read it, open its explanation, read the words, close both
        await b.tapCt('rev-more',400);await b.tapText(/^Analyze with the engine$/,{wait:0});
        const engOk=await b.page.locator('[data-ct="rev-engline"]').last().waitFor({state:'visible',timeout:12000}).then(()=>true).catch(()=>false);
        let eng=null,why=null;
        if(engOk){await b.page.waitForFunction(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e&&/\S/.test((e.innerText||'').replace(/…/g,''))&&!!document.querySelector('[data-ct="rev-engwhy-open"]');},null,{timeout:15000}).catch(()=>{});
          eng=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engline"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
          await b.page.locator('[data-ct="rev-engline"]').last().click({timeout:3000}).catch(()=>{});await b.page.waitForTimeout(400);
          why=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-engwhy-eval"]');return e?(e.innerText||'').trim():null;});
          if(why!=null){await b.page.locator('[data-ct="rev-engwhy"]').click({timeout:3000}).catch(()=>{});await b.page.waitForTimeout(250);}}
        await b.tapCt('rev-more',400);await b.tapText(/^Engine line: on$/,{wait:500});
        rows.push({tag:C.tag,p,kind,lo,hi,first:bar.seq[0]||null,seq:bar.seq,settled:bar.settled,eng,engLead:eng?(eng.split(' ')[0]):null,why,cmp:bar.cmp,ml:bar.ml});
      }
      L.say(b.errs.length===0,geo+': TC-R09d '+C.tag+' zero app errors',b.errs.slice(0,3));
      await b.close();
    }
    L.note('TC-R09d readings: '+JSON.stringify(rows));
    const want=CASES.reduce((n,C)=>n+C.plies.length,0);
    // DENOMINATOR, in its own assertion: every planned ply was reached and every one of the three always-present sites was read.
    L.say(rows.length===want&&rows.every(r=>r.first&&r.settled&&r.engLead&&r.why),geo+': TC-R09d DENOMINATOR '+rows.length+' of '+want+' plies reached, each with a first paint, a settled label, an engine-line evaluation and its explanation words read ('+rows.length*4+' readings; rev-cmp rendered on '+rows.filter(r=>r.cmp).length+')',rows.map(r=>({p:r.tag+r.p,first:r.first,settled:r.settled,eng:r.engLead,why:r.why})));
    const MATE=/^(-?M\d*|1-0|0-1)$/, NUM=/^[+-]?\d+\.\d$/;
    const nOf=(s)=>{const m=/^M(\d+)$/.exec(String(s||''));return m?Number(m[1]):null;};
    for(const r of rows.filter(r=>r.kind==='mate')){
      const id=geo+': TC-R09d '+r.tag+' ply '+r.p+' (a forced mate, measured M'+r.lo+(r.hi!==r.lo?'..'+r.hi:'')+')';
      const paints=r.seq.concat([r.settled]);
      L.say(paints.length>0&&paints.every(x=>MATE.test(x))&&!paints.some(x=>NUM.test(x)),id+': every value the eval label took, first paint to settled, is a mate label and never a number',{seq:r.seq,settled:r.settled});
      L.say(nOf(r.settled)!=null&&nOf(r.settled)>=r.lo&&nOf(r.settled)<=r.hi,id+': the settled eval label says mate in N with N in the measured band ('+r.settled+')',{settled:r.settled});
      L.say(!!r.engLead&&/^M\d+$/.test(r.engLead)&&nOf(r.engLead)>=r.lo&&nOf(r.engLead)<=r.hi,id+': the engine line leads with mate in N, not a number ('+r.engLead+')',{eng:r.eng});
      L.say(r.why==='White has a forced mate',id+': the engine line\'s explanation says White has a forced mate ('+r.why+')',{why:r.why});
      if(r.cmp)L.say(!/[+-]?9\.9\b|[+-]?99\.0/.test(r.cmp),id+': the comparison strip prints no clamped 9.9 or 99.0 ('+r.cmp+')',{cmp:r.cmp});
      // A7-R4 [antagonist A round 4]: a missing denominator is reported, never credited (#493) - rev-cmp has rendered on none of these
      // plies in any run so far, so this site's clamp check has never executed, and that is now printed on every run, not inferred.
      else L.note(id+': TC-R09d rev-cmp NOT RUN - rev-cmp did not render at this ply, so the 9.9/99.0 clamp check on the comparison strip had no input here (NOT A PASS)');
    }
    // THE DEPTH DISAGREEMENT, as its own input: Lasker ply 24 (12...Kh6) is M6 at depth 16 and +8.04 at depth 12, so the stored analysis
    // says mate and the live bar's own search NEVER finds it. Before #549 the label settled on that number; it must hold the mate.
    // Precondition first, in its own line: the stored analysis really is a mate here (the first paint is mate-shaped), else not run.
    for(const r of rows.filter(r=>r.kind==='hold')){
      const id=geo+': TC-R09d '+r.tag+' ply '+r.p+' (stored M6 at depth 16, +8.04 at the live bar\'s depth 12)';
      if(L.say(MATE.test(String(r.first||'')),id+': PRECONDITION the first paint, which is the stored analysis, is a mate label ('+r.first+')',{first:r.first})){
        const paints=r.seq.concat([r.settled]);
        L.say(paints.every(x=>MATE.test(x)),id+': the eval label never leaves the mate for the shallower search\'s number, first paint to settled',{seq:r.seq,settled:r.settled});}
    }
    for(const r of rows.filter(r=>r.kind==='num')){
      const id=geo+': TC-R09d '+r.tag+' ply '+r.p+' (a REAL evaluation of about +9.9, NOT a mate)';
      const paints=r.seq.concat([r.settled]);const v=parseFloat(r.settled);
      L.say(paints.length>0&&paints.every(x=>NUM.test(x)),id+': every value the eval label took is a number and none is a mate label',{seq:r.seq,settled:r.settled});
      L.say(v>=r.lo&&v<=r.hi,id+': and the settled number is in the measured band '+r.lo+'..'+r.hi+' ('+r.settled+')',{settled:r.settled});
      L.say(!!r.engLead&&NUM.test(r.engLead)&&parseFloat(r.engLead)>=r.lo&&parseFloat(r.engLead)<=r.hi,id+': the engine line leads with that number, not a mate ('+r.engLead+')',{eng:r.eng});
      L.say(r.why==='White is winning',id+': the explanation says White is winning, not that White has a forced mate ('+r.why+')',{why:r.why});
    }
  }
},'REVIEW');
