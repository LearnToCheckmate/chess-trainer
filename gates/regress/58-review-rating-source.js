// regress/58-review-rating-source.js  THE SUMMARY PRINTS A RATING IT INVENTED AND HIDES THE ONE IT PARSED.
// RENUMBERED BY THE BUILD THAT LANDED IT: the patch allocated US-R17 and TC-R20a..d at 21:24Z, and #428 landed
// at 22:53Z taking BOTH (USER-STORIES.md US-R17 is now the puzzle explanation, TEST-CASES.md TC-R20 A..H is
// gate 57's). Measured by grep on origin/main 890b8eb before writing, not read off the patch. This gate is
// US-R18 / TC-R21a..d. The patch's own id reasoning was sound when written and expired 89 minutes later.
//
//
// GUARDS: US-R18 "the rating on my review summary is the rating the game carries"
// IMPLEMENTS: TC-R21a (the header rating is shown), TC-R21b (no invented EST rating), TC-R21c (no fallback
//             number where the header is absent), TC-R21d (whatever is shown fits its own column),
//             TC-R21e (the sentence under the panel does not contradict the number above it - added on a veto),
//             TC-R21f (one side rated: exactly one rating, the unrated side invents nothing).
// FROM: jobs/bench-should-est-be-shown-at-all-2026-09-28, Desk item q-est-rating-shown-at-all, ANSWERED BY
//       KUNAL 2026-09-28T18:13Z: "show-header. Drop EST from the review summary and show the PGN header rating
//       where the game carries one; show nothing where it does not."
//
// MEASURED ON #427 (90abeba, app.js md5 95fa1c00fcc8), Opera fixture from gates/drive/review.js whose headers
// read WhiteElo 1523 / BlackElo 1487:
//   the summary prints "≈1945 EST" for White and "≈948 EST" for Black.
//   White is +422 HIGH and Black is -539 LOW. The job says "wrong by about 450 points"; it is wrong by about
//   450 IN BOTH DIRECTIONS, which the job does not say, and the two errors have opposite signs on the same
//   game, so no single recalibration constant fixes it. That is measured here, not argued [R18].
// The number is rendered at chess.jsx:5589 as `≈{d.rating}` with an `est` label (textTransform uppercase, so
// innerText reads EST). IT HAS NO data-ct - the same defect class as flag pz-verdict-box-has-no-data-ct - so
// this gate locates it by its own rendered pattern, /≈\s*\d{3,4}\s*EST/, and by walking the accuracy column.
// A data-ct on that line is asked for on the job; nothing here invents one.
//
// WHY THE IMPORT HAPPENS ONCE. A PGN import plus analysis takes 19 s (measured). Seven of them is over two
// minutes and R36 asks for a gate fast enough to run on every build. So the gate imports ONCE per fixture at
// Kunal's 375x730 and then resizes the viewport through the seven geometries - verified to re-render: the app
// reads vp on resize, and the summary text and boxes change with it. Resizing is not a substitute for a fresh
// mount and this gate says so rather than implying otherwise; what it buys is the fit sweep at 7 widths for
// the price of one analysis.
//
// WHAT WILL BREAK A NAIVE FIX, AND IT IS WHY TC-R21d EXISTS. The worker's own pre-measurement on this job
// (preMeasuredByWorker_2026-09-28T20-50Z) found that the label in the job's mockup OVERFLOWS the summary
// column at all three geometries it tried. A fix that shows the header rating with a wider label and lets it
// run past its column has replaced a wrong number with a clipped one, and TC-R21a alone would go green on it.
// NUMBERED 58, NOT 56, AND THE RENUMBERING IS ITSELF A FINDING. Four runs of this lane were live within four
// minutes tonight (20:37:50Z, 20:38:01Z, 20:40:50Z, 21:02:05Z) and every one of them took "the next free number
// in gates/regress/". R02's claim register locks the JOB; nothing locks the number space. 55, 56 and 57 were all
// taken while this gate was being written. Recorded on jobs/two-lane-runs-can-claim-the-same-gate-number-2026-09-28.
'use strict';
const L=require('../lib');
const R=require('../drive/review');

const G=[{w:320,h:568},{w:360,h:640},{w:375,h:667},{w:375,h:730},{w:390,h:844},{w:414,h:896},{w:440,h:956}];
const gl=g=>g.w+'x'+g.h;
const HDR={w:'1523',b:'1487'};        // the Elo headers PGN_OPERA and PGN_CORNER both carry

// the same game with every rating header stripped: Kunal's "show nothing where it does not" branch.
// Built here rather than found, because the repository has no headerless fixture - stated, not hidden.
const PGN_NOELO=R.PGN_OPERA.replace(/\[(White|Black)Elo "[^"]*"\]\s*/g,'');
// #429, FROM BOTH ANTAGONISTS: the MIXED case, which the gate did not enter and which is the common one -
// [BlackElo "?"] is what Lichess and chess.com write for an unrated or bot opponent, and /^\\d{3,4}$/ rejects
// "?" so it renders exactly as a missing header. Antagonist A measured the two column BOXES equal and called
// it sound; antagonist B measured the INK and found 21px of dead space under the unrated side. Both numbers
// are right - it is the container-is-not-its-contents split - so this fixture PINS THE BEHAVIOUR rather than
// asserting either verdict: exactly one rating line, it carries the side that has a header, and it fits.
const PGN_ONESIDE=R.PGN_OPERA.replace(/\[BlackElo "[^"]*"\]/,'[BlackElo "?"]');

const summaryText=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="rev-summary"]');
  return s?(s.innerText||'').replace(/\s+/g,' ').trim():null;});

// the rating line and the column that must hold it, found structurally because the line carries no data-ct
const ratingBoxes=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="rev-summary"]');if(!s)return {found:false};
  const out=[];
  for(const el of s.querySelectorAll('span,div')){
    const t=(el.innerText||'').replace(/\s+/g,' ').trim();
    // THE PATTERN IS ≈NNNN OR BARE NNNN, AND THAT IS NOT A DETAIL. The first version matched only the ≈ form,
    // so on a bundle carrying the fix - which prints a bare "1523" - it found NO rating line and TC-R21d never
    // fired at all: 19 assertions instead of 33, and a fit rule that silently stops existing the moment the
    // defect is fixed is worse than no fit rule. Caught by reading the assertion COUNT on the fix bundle.
    if(!/^≈?\s*\d{3,4}$/.test(t))continue;
    const line=el.parentElement;                              // the flex row holding the number and its label
    const col=line&&line.parentElement;                       // the accuracy column with the border box
    // and it must be IN the accuracy column, so a move count or a skills figure elsewhere cannot pose as a rating
    if(!col||!/ACCURACY/i.test(col.innerText||''))continue;
    const cr=col?col.getBoundingClientRect():null;
    // MEASURE THE PIECES, NOT THE ROW. The row is a flex box inside a fixed-width column, so its rect STOPS at
    // the column edge while a nowrap child runs straight past it: negative control NC2 put a 31-character label
    // on this line and the ROW still read 36..148.5 inside a column of 33..151.5, spill -3, GREEN. That is the
    // box-not-the-ink error US-INV-05b was written for and jobs/invariant-2-measures-the-box-not-the-ink names
    // again, reproduced inside a gate written by the lane that keeps finding it. So every CHILD's own rect is
    // compared with the column, and the worst is reported.
    const kids=[...line.children].length?[...line.children]:[line];
    let worst=null,wr=null;
    for(const k of kids){const kr=k.getBoundingClientRect();
      const sp=cr?Math.max(kr.right-cr.right,cr.left-kr.left):null;
      if(sp!==null&&(worst===null||sp>worst)){worst=sp;wr=kr;}}
    out.push({text:(line.innerText||'').replace(/\s+/g,' ').trim(),
              n:parseInt(t.replace(/[^\d]/g,''),10),
              worstChild:wr?[Math.round(wr.left*10)/10,Math.round(wr.right*10)/10]:null,
              colLeft:cr?Math.round(cr.left*10)/10:null,colRight:cr?Math.round(cr.right*10)/10:null,
              spill:worst===null?null:Math.round(worst*10)/10});
  }
  return {found:true,items:out};});

async function importFixture(b,pgn,tag){
  await b.home();await b.tile('Review');
  await b.page.locator('textarea').first().fill(pgn);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  let ok=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:150000});}catch(e){ok=false;}
  await b.settle(900);
  // the elapsed seconds go in a NOTE, not in the assertion text: it is the only part of this gate's output that
  // varies run to run (19 to 21 s measured), and R36 asks for a deterministic PASS/FAIL, not a deterministic clock.
  L.note(tag+': import + analysis took '+Math.round((Date.now()-t0)/1000)+' s');
  L.say(ok,tag+': the PGN imported and the summary rendered');
  return ok;
}

L.run(async()=>{
  // ---- fixture 1: the game carries WhiteElo 1523 / BlackElo 1487 -------------------------------------
  const b=await L.launch({geo:{w:375,h:730},name:'rating-hdr',store:{ct_pool:'3'}});await b.open();
  L.note('bundle stamp on the page: '+await b.stamp());
  if(await importFixture(b,R.PGN_OPERA,'headers')){
    for(const g of G){
      await b.page.setViewportSize({width:g.w,height:g.h});await b.settle(500);
      const t=await summaryText(b),rb=await ratingBoxes(b);
      const shown=rb.items.map(x=>x.n);
      L.note(gl(g)+' rating lines: '+JSON.stringify(rb.items.map(x=>x.text+' [spill '+x.spill+']')));

      // TC-R21a THE HEADER RATING IS WHAT THE PANEL SHOWS
      L.say(t.includes(HDR.w)&&t.includes(HDR.b),'21a '+gl(g)+': the summary shows the PGN header ratings '+HDR.w+' and '+HDR.b,
            {hasWhite:t.includes(HDR.w),hasBlack:t.includes(HDR.b),shown});

      // TC-R21b NO INVENTED RATING, AND THE ERROR IS PRINTED RATHER THAN ASSERTED AWAY
      const est=/≈\s*\d{3,4}\s*EST/i.test(t);
      // STRENGTHENED AFTER ANTAGONIST A's DISPUTE C, #429. This assertion's own clause is "no COMPUTED
      // rating on the panel", and testing only for the literal string "≈NNNN EST" does not test that: it
      // pins #428's defect SHAPE, so a build that kept the invented number and merely relabelled it
      // "RATING" passed here. Measured on the NC-B bundle, which prints 1945 and 948 under a RATING
      // label. So the property is asserted directly: every number rendered on a rating line must BE one
      // of the two header values. Same family as "an alternation that matches every branch pins nothing".
      const onlyHdr=shown.length>0&&shown.every(n=>n===+HDR.w||n===+HDR.b);
      // THE CLAUSE IS CONDITIONAL, and that is not pedantry. Printed unconditionally it read "White 0, Black 0 -
      // opposite signs on one game" on the FIXED bundle, which is a false sentence in a log this project cites.
      if(shown.length===2){const ew=shown[0]-(+HDR.w),eb=shown[1]-(+HDR.b);
        L.note(gl(g)+' error against the headers: White '+ew+', Black '+eb+
               ((ew>0&&eb<0)||(ew<0&&eb>0)?' - OPPOSITE SIGNS on one game, so no single constant recalibrates it':
                (ew===0&&eb===0?' - both exact, the panel is showing the headers themselves':'')));}
      L.say(!est&&onlyHdr,'21b '+gl(g)+': no computed rating on the summary - every number on a rating line is one of the headers '+HDR.w+'/'+HDR.b,
            {estShown:est,shown,onlyHeaderValues:onlyHdr});

      // TC-R21e THE SENTENCE UNDER THE PANEL MUST NOT CONTRADICT THE NUMBER ABOVE IT.
      // ADDED AT #429 ON ANTAGONIST A's VETO, and it is the defect this gate could not see: the fix
      // replaced an invented number with the PGN's own rating and left chess.jsx:5640 reading "Accuracy
      // and rating are rough estimates from average centipawn loss, not official ratings" - so the panel
      // showed a real, official rating and told the player it was neither. The INVERSE of the defect
      // being fixed. No .rating grep could reach it: the string holds the word "rating" with no dot.
      const note=await b.page.evaluate(()=>{const n=document.querySelector('[data-ct="rev-summary-note"]');
        return n?(n.innerText||'').replace(/\s+/g,' ').trim():null;});
      const claimsEstimatedRating=!!note&&/rating[s]?\b[^.]*\b(rough|estimate|not official)/i.test(note);
      L.say(note!==null&&!claimsEstimatedRating,
            '21e '+gl(g)+': the note does not call the shown rating an estimate',{note});

      // TC-R21d WHATEVER IS SHOWN FITS ITS OWN COLUMN (US-INV-05's rule, applied to this line)
      for(const it of rb.items)
        L.say(it.spill!==null&&it.spill<=0.5,'21d '+gl(g)+': "'+it.text+'" is inside its accuracy column',
              {worstChild:it.worstChild,col:[it.colLeft,it.colRight],spill:it.spill});
    }
  }
  await b.close();

  // ---- fixture 2: the same game with the rating headers removed ---------------------------------------
  const c=await L.launch({geo:{w:375,h:730},name:'rating-nohdr',store:{ct_pool:'3'}});await c.open();
  if(await importFixture(c,PGN_NOELO,'no headers')){
    for(const g of [G[0],G[3],G[6]]){                        // 320x568, 375x730, 440x956
      await c.page.setViewportSize({width:g.w,height:g.h});await c.settle(500);
      const t=await summaryText(c),rb=await ratingBoxes(c);
      L.note(gl(g)+' no-header rating lines: '+JSON.stringify(rb.items.map(x=>x.text)));
      // TC-R21c NOTHING IS INVENTED WHERE THE GAME CARRIES NO RATING (Kunal, 18:13Z: "show nothing")
      L.say(rb.items.length===0&&!/≈\s*\d{3,4}/.test(t),'21c '+gl(g)+': a game with no Elo header shows no rating at all',
            {linesFound:rb.items.length,shown:rb.items.map(x=>x.n)});
      // 21e in the OTHER branch: with no rating on screen the note must not mention one at all.
      const note2=await c.page.evaluate(()=>{const n=document.querySelector('[data-ct="rev-summary-note"]');
        return n?(n.innerText||'').replace(/\s+/g,' ').trim():null;});
      L.say(note2!==null&&!/rating/i.test(note2),'21e '+gl(g)+': with no rating shown the note does not mention one',{note:note2});
    }
  }
  await c.close();

  // ---- fixture 3: ONE side carries a rating, the other is [BlackElo "?"] ------------------------------
  const d=await L.launch({geo:{w:375,h:730},name:'rating-oneside',store:{ct_pool:'3'}});await d.open();
  if(await importFixture(d,PGN_ONESIDE,'one side rated')){
    for(const g of [G[0],G[3]]){                             // 320x568, 375x730
      await d.page.setViewportSize({width:g.w,height:g.h});await d.settle(500);
      const t=await summaryText(d),rb=await ratingBoxes(d);
      L.note(gl(g)+' one-sided rating lines: '+JSON.stringify(rb.items.map(x=>x.text+' [spill '+x.spill+']')));
      // TC-R21f EXACTLY ONE RATING, AND IT IS THE RATED SIDE'S
      L.say(rb.items.length===1&&rb.items[0].n===+HDR.w,
            '21f '+gl(g)+': one side rated shows exactly one rating and it is White\'s '+HDR.w,
            {linesFound:rb.items.length,shown:rb.items.map(x=>x.n)});
      // the unrated side must not have acquired a number from anywhere
      L.say(!t.includes(HDR.b)&&!/\u2248\s*\d{3,4}/.test(t),
            '21f '+gl(g)+': the unrated side shows no rating and nothing invented one',{text:t.slice(0,160)});
      // and the one that IS shown still fits
      for(const it of rb.items)
        L.say(it.spill!==null&&it.spill<=0.5,'21f '+gl(g)+': "'+it.text+'" is inside its accuracy column',
              {worstChild:it.worstChild,col:[it.colLeft,it.colRight],spill:it.spill});
      // the note must still be the rating-bearing wording, because a rating IS on screen
      const n3=await d.page.evaluate(()=>{const n=document.querySelector('[data-ct="rev-summary-note"]');
        return n?(n.innerText||'').replace(/\s+/g,' ').trim():null;});
      L.say(n3!==null&&!/rating[s]?\b[^.]*\b(rough|estimate|not official)/i.test(n3),
            '21f '+gl(g)+': with one side rated the note still does not call it an estimate',{note:n3});
    }
  }
  await d.close();
},'GATE 58 review-rating-source');
