'use strict';
// regress/53-lesson-hit-area.js   TC-R18 (US-R15): a control's HIT AREA is its own.
//
// AUTHORED BY THE TEST-AUTHORING LANE (docs/patch-lesson-action-row-hit-area-2026-09-28, run
// test-authoring__1790614517775) for jobs/lesson-action-row-wraps-and-analyze-taps-fire-copy-moves-2026-09-28,
// the P0 raised by #427's antagonist B. IT IS RED ON THE SHIPPED BUILD BY DESIGN. It is the "what does done
// look like" gate: it asserts the TARGET state (zero lost ink, both ways) rather than pinning today's number,
// so the build that fixes the row watches it go green and does not have to work out the finish line first.
// It is handed over as a PATCH, to land WITH the fix, exactly as gate 51 landed with #426 - so the suite is
// never red on main over an unfixed item. Gate 48's own pins stay where they are and are amended separately
// (see docs/patch-lesson-action-row-hit-area-2026-09-28, amendment A); the two do different jobs:
//     gate 48  PINS the defect at its measured value, every run, so it cannot move in silence.
//     gate 53  ASSERTS the target, so a fix has a green to reach and a partial fix has a red to explain.
//
// WHAT THE DEFECT IS. The lesson's secondary action row (MOVES · 🔍 Analyze · 📋 Copy moves) is a
// display:flex, flex-wrap:wrap row keyed to the BOARD's width. Its two buttons (chess.jsx:6618, :6619 at #428 - LINE NUMBERS DRIFT, the data-ct marks do not) are
// 43px tall and each carries margin:'-10px 0', so when the row WRAPS the two lines sit 29px apart while the
// boxes are 43px tall: they overlap by 14.00px and 📋 Copy moves, later in the DOM and also zIndex 1, wins
// the hit test over the overlap. A TAP ON THE PAINTED PILL OF "Analyze" FIRES "Copy moves" (the chip, not the letters - see #428 note below) - two legitimate
// actions with no error between them, so a player concludes the Analyze button is broken.
//
// ── THE QUANTITY THIS GATE IS PINNED TO, AND WHY IT IS NOT THE 14.00px ──────────────────────────────────
// #427's antagonist A, on #427's own pins, and it is the reason this gate exists in this shape: the 14.00px
// overlap is a SYMPTOM. Change the two margins from -10px to -8px and the overlap becomes 10.00 - which turns
// a 14.00 pin RED while a finger still lands on the wrong button. The load-bearing quantity is the LOST-INK
// COUNT and its target is ZERO, not "some other number". So this gate asserts lost ink == 0, and prints the
// overlap, the line advance and the whole-box row counts as DIAGNOSTICS beside it. NC2 below is that exact
// -8px bundle, and it is the control that proves the difference rather than arguing it.
//
// AND THE REMEDY THAT WAS MEASURED AND REJECTED, kept so the next reader does not re-derive it: asserting the
// row's scrollHeight > clientHeight (#398's "assert the squeeze") reads 10px at EVERY column, wrapped or not,
// because that 10px IS the two negative margins surfacing in scrollHeight. An assertion on it would be
// reading the mechanism that CAUSES the defect and calling it the detector - the sixth costume of "the check
// and the thing being checked were the same object". #398's rule does not apply here at all: the row is
// overflow:visible and nothing is being clipped.
//
// ── THE SAMPLING CONVENTION, SAID OUT LOUD (#411: a count with no scope cannot be checked) ──────────────
// Ink rows are sampled at INTEGER y over the half-open interval [ceil(inkTop), floor(inkBot)) down the
// button's own centre line. At 320x520 Analyze's ink runs 349.000..372.000 and Copy's box top is 368.000, so
// the geometric ink overlap is exactly 4.00px and the lost rows are 368/369/370/371 with 372.00 the exclusive
// bottom edge - four rows. Stepping the boundary at 0.125px the hit test flips from Analyze to Copy at
// y = 367.125, which is 0.875px ABOVE the geometric edge, because Chromium snaps the hit rect to LayoutUnits.
// So 4.00px of ink is geometrically covered and 4.875px of it is actually UNHITTABLE. Both numbers are
// printed; the FLIP BOUNDARY is asserted separately (D4) with a tolerance that does not straddle 368, so a
// later change of sampling convention cannot move the number in silence. #427 published 4 (integer sampling)
// and antagonist B published 5 (half-pixel centres); that disagreement was a half-open-interval off-by-one
// and it is settled here in the code rather than in a comment on a job.
//
// ── WHY THE INK SCAN RUNS BOTH WAYS ─────────────────────────────────────────────────────────────────────
// Designed against NC4 BEFORE the assertion was written, which is this lane's own correction from
// test-authoring__1790581882086 ("design each control against a NAMED assertion before writing the
// assertion, not after"). A one-line patch that gives 🔍 Analyze zIndex 2 makes Analyze win the whole
// overlap: a one-way scan goes GREEN while the boxes still overlap by 14.00px and Copy moves' own ink is now
// the half that is stolen. The defect would have moved, not closed. So A2 scans Analyze's ink and A3 scans
// Copy's, and NC4 reddens A3 while leaving A2 green - which is the gate saying, in its own log, that a
// z-order patch is not the fix.
//
// ── WHAT MAKES IT A P0 RATHER THAN A GEOMETRY RESIDUAL, ASSERTED AND NOT ARGUED ─────────────────────────
// #428, MEASURED: what this file calls INK is a Range over the button's contents, which returns the SPAN PILL
// (349..372 at 375x520), NOT the letters. The text box is 353..368 and the glyphs paint 354..367 against Copy's
// hit top at 368, so the letters are ~1px clear and a click at the glyph centre fires Analyze. The 4 lost rows are
// the chip's bottom padding/border band. Still P0 - a real click 2px under the word, on the chip, raises "Copied!".
// E1 is a REAL CLICK on the painted chip with a negative control click 9.5px higher at the button's own
// centre. The two land in different worlds and the app tells them apart itself: the centre click leaves the
// lesson for Game review (mode changes), the ink click raises the "Copied!" label on the OTHER button. That
// is the whole defect in one assertion and it needs no pixel arithmetic to read.
// This is also the line between this defect and #398's FLIP button, and the two must not merge: #398 is a
// latent geometry fault with NO ink lost ("this could be cut"), this one loses ink to the hit test TODAY
// ("this was cut"). Filing them under one banner would let the mild one set the priority for the live one.
//
// ── THE COLUMNS, AND WHY THE HEALTHY ONES ARE HERE ──────────────────────────────────────────────────────
// Five wrapping columns (the defect) and three non-wrapping ones (the contrast). The healthy columns are not
// decoration: they are the instrument's own control INSIDE the gate. If lost ink came back 0 everywhere the
// gate would be measuring nothing, and if it came back non-zero everywhere the probe would be broken rather
// than the app. C1/C2 assert that the same probe reads 0 at 375x568, 390x568 and Kunal's own 375x730 - which
// is also the answer to "why has he never seen it": at the demo end his phone does not wrap. He CAN reach it
// in PRACTICE at 375x568 (board 230.9), which is W4/W5 below.
//
// GEOMETRY COUNT, SAID PLAINLY (R18, correction 014): 8 columns x 2 scans = 16 measured hit states, plus one
// real click pair. That is the sweep this gate ran; it is not a claim about any geometry not in the list.

const L=require('../lib');
const D=require('../drive/lesson');

// The two controls carry REAL data-ct marks (chess.jsx:6618, :6619 at #428 - LINE NUMBERS DRIFT, the data-ct marks do not) - nothing is invented and nothing is
// matched on a label, which matters here because 📋 Copy moves RENAMES ITSELF to the copied message the
// moment it fires, and a label-matched probe would lose the element in exactly the state E1 creates.
const AN='[data-ct="moves-analyze"]', CP='[data-ct="moves-copy"]';

const hit=(b)=>b.page.evaluate(([AN,CP])=>{
  const r2=n=>n==null?null:Math.round(n*100)/100;
  const an=document.querySelector(AN), cp=document.querySelector(CP);
  if(!an||!cp) return {found:false,hasAnalyze:!!an,hasCopy:!!cp};
  const ar=an.getBoundingClientRect(), cr=cp.getBoundingClientRect();
  const owns=(el,t)=>!!(el&&(el===t||t.contains(el)));
  // ink of one element: the union of its content rects, which is the PAINT and not the box (rule 2).
  const inkOf=(el)=>{const g=document.createRange();g.selectNodeContents(el);
    const q=[...g.getClientRects()].filter(x=>x.width>0&&x.height>0);
    return q.length?{top:Math.min(...q.map(x=>x.top)),bot:Math.max(...q.map(x=>x.bottom))}:null;};
  // half-open [ceil(top), floor(bot)) at integer y, down the element's OWN centre line.
  const scan=(el)=>{const r=el.getBoundingClientRect(),ink=inkOf(el);
    if(!ink) return {rows:0,lost:0,lostYs:[],top:null,bot:null};
    const cx=r.left+r.width/2; let rows=0,lost=0; const lostYs=[];
    for(let y=Math.ceil(ink.top); y<Math.floor(ink.bot); y++){
      rows++; if(!owns(document.elementFromPoint(cx,y),el)){lost++; if(lostYs.length<8)lostYs.push(y);} }
    return {rows,lost,lostYs,top:ink.top,bot:ink.bot};};
  // whole-box rows, kept as a DIAGNOSTIC only (it is the 14-of-43 number, a symptom of the margins).
  const boxScan=(el,other)=>{const r=el.getBoundingClientRect();const cx=r.left+r.width/2;
    let own=0,toOther=0,toX=0,total=0;
    for(let y=Math.ceil(r.top); y<Math.floor(r.bottom); y++){
      const e=document.elementFromPoint(cx,y); total++;
      if(owns(e,el))own++; else if(owns(e,other))toOther++; else toX++; }
    return {own,toOther,toX,total};};
  // the flip boundary, stepped at 0.125px INSIDE Analyze's own box, from its top downwards: the first y at
  // which the box stops answering for itself. null when it never stops, which is the fixed state.
  let flipY=null;
  {const cx=ar.left+ar.width/2;
   for(let y=Math.ceil(ar.top); y<ar.bottom; y+=0.125){
     if(!owns(document.elementFromPoint(cx,y),an)){flipY=Math.round(y*1000)/1000;break;} }}
  const a=scan(an), c=scan(cp);
  // ── THE FIT MEASUREMENT (amendment B, 2026-09-28: the no-wrap route). The row is
  //    chess.jsx:6621  <div flex space-between>  [ MOVES ]  [ <div flex wrap gap 6> chip chip </div> ]
  //    so the question "do the chips fit beside the label" is arithmetic on four boxes and needs no
  //    invented selector: the label carries data-ct="moves-head" and the chip box is the buttons' parent.
  const head=document.querySelector('[data-ct="moves-head"]');
  const chipBox=an.parentElement, row=head?head.parentElement:null;
  const cs=chipBox?getComputedStyle(chipBox):null, rs=row?getComputedStyle(row):null;
  const inner=(el,st)=>el?el.getBoundingClientRect().width-parseFloat(st.paddingLeft||0)-parseFloat(st.paddingRight||0):null;
  const chipGap=cs?(parseFloat(cs.columnGap)||parseFloat(cs.gap)||0):null;
  const rowGap =rs?(parseFloat(rs.columnGap)||parseFloat(rs.gap)||0):null;
  const anW=ar.width, cpW=cr.width;
  const chipsNeeded=(anW!=null&&cpW!=null&&chipGap!=null)?anW+cpW+chipGap:null;
  const chipsHave=inner(chipBox,cs);
  const rowHave=inner(row,rs);
  const rowNeeded=(head&&chipsNeeded!=null&&rowGap!=null)?head.getBoundingClientRect().width+rowGap+chipsNeeded:null;
  return {found:true,
    headFound:!!head, chipBoxFound:!!chipBox, rowFound:!!row,
    anW:r2(anW), cpW:r2(cpW), chipGap:r2(chipGap), rowGap:r2(rowGap),
    labelW:head?r2(head.getBoundingClientRect().width):null,
    chipsNeeded:r2(chipsNeeded), chipsHave:r2(chipsHave),
    chipSlack:(chipsNeeded!=null&&chipsHave!=null)?r2(chipsHave-chipsNeeded):null,
    rowNeeded:r2(rowNeeded), rowHave:r2(rowHave),
    rowSlack:(rowNeeded!=null&&rowHave!=null)?r2(rowHave-rowNeeded):null,
    chipWrapCss:cs?cs.flexWrap:null, chipOverflowX:chipBox?r2(chipBox.scrollWidth-chipBox.clientWidth):null,
hasAnalyze:true,hasCopy:true,
    wrapped:cr.top>ar.top+1,
    anTop:r2(ar.top),anBot:r2(ar.bottom),anH:r2(ar.height),cpTop:r2(cr.top),cpH:r2(cr.height),
    lineAdvance:cr.top>ar.top+1?r2(cr.top-ar.top):null,
    overlap:cr.top>ar.top+1?r2(ar.bottom-cr.top):null,
    anInkTop:r2(a.top),anInkBot:r2(a.bot),anInkRows:a.rows,anInkLost:a.lost,anLostYs:a.lostYs,
    cpInkTop:r2(c.top),cpInkBot:r2(c.bot),cpInkRows:c.rows,cpInkLost:c.lost,cpLostYs:c.lostYs,
    anBox:boxScan(an,cp),cpBox:boxScan(cp,an),
    flipY,
    vw:innerWidth,vh:innerHeight};
},[AN,CP]);

// E1's instrument. Reads the state the app itself distinguishes: is the lesson still on screen, and has the
// copy control renamed itself. Deliberately NOT a read of any rect - the point of E1 is that it needs none.
const appState=(b)=>b.page.evaluate(([CP])=>{
  const cp=document.querySelector(CP);
  return {copyLabel:cp?(cp.innerText||'').replace(/\s+/g,' ').trim():null,
          stillInLesson:!!document.querySelector('[data-ct="moves-analyze"]')};
},[CP]);

const COLS=[
  // state,                geo,                                                 wraps, why this column is here
  ['endgame-demo-end',{w:375,h:520,safe:'',label:'375x520'},              true ,'the demo end at the short corner: board 192.00'],
  ['endgame-demo-end',{w:320,h:520,safe:'',label:'320x520'},              true ,'narrow AND short - the worst case, and the column every published number was measured at'],
  ['endgame-demo-end',{w:320,h:540,safe:'',label:'320x540'},              true ,'inside the band rather than at its floor: board 212.39'],
  ['practice-m0'     ,{w:320,h:568,safe:'',label:'320x568'},              true ,'PRACTICE at a height the demo end is healthy at (board 230.9) - this is not confined to the short corner'],
  ['practice-m0'     ,{w:375,h:568,safe:'',label:'375x568'},              true ,'PRACTICE at the wide-and-short corner: the row wraps here while the demo end does not'],
  ['endgame-demo-end',{w:375,h:568,safe:'',label:'375x568'},              false,'THE CONTRAST, one step across the boundary: board 270.88, no wrap'],
  ['endgame-demo-end',{w:390,h:568,safe:'',label:'390x568'},              false,'THE CONTRAST, wider still'],
  ['endgame-demo-end',{w:375,h:730,safe:'',label:"375x730 = Kunal's real phone"},false,"KUNAL'S OWN PHONE at the demo end - healthy, and this is why he has never reported it from here"],
];

// The margin floor for N2b, and the fast form for suite admission [R36]: CT_COLS=320x520,375x568 runs those
// columns only (the two decisive ones - the worst wrapping column and the 0.06px contrast), CT_COLS unset runs
// all eight. Every column list is printed in the footer so a short run cannot be mistaken for a full one.
const MARGIN=Number(process.env.CT_MARGIN||8);
const WANT=(process.env.CT_COLS||'').split(',').map(x=>x.trim()).filter(Boolean);
const COLS2=WANT.length?COLS.filter(c=>WANT.includes(c[1].w+'x'+c[1].h)):COLS;

L.run(async()=>{
 L.note('LESSON-HIT-AREA amendment B: '+COLS2.length+' of '+COLS.length+' columns ('+COLS2.map(c=>c[1].w+'x'+c[1].h).join(' ')+'), margin floor '+MARGIN+'px');
 let firstWrapped=null;
 for(const [state,g,wraps,why] of COLS2){
  const tag=g.label+' ['+state+']';
  const b=await L.launch({geo:g,name:'lesson-hit-area-'+g.w+'x'+g.h+'-'+state});await b.open();
  L.note(tag+': bundle stamp in the page = '+(await b.stamp())+'   | '+why);
  await D.states[state](b);
  await b.settle(400);
  const h=await hit(b);
  const m=await b.metrics();

  // ── A1. NON-VACUITY FIRST (#385). If the drive lands elsewhere or a selector goes, that is a FAILURE and
  //    never a quiet skip - which is the failure mode every assertion below depends on not having.
  L.say(h.found===true,
    tag+': both controls of the row are in the DOM by their own data-ct (moves-analyze, moves-copy), so the hit assertions below are not vacuous',
    {found:h.found,analyze:h.hasAnalyze,copy:h.hasCopy,board:m.board&&m.board.w,vw:h.vw,vh:h.vh});

  // ── A2. THE ASSERTION, forwards. Target ZERO. Red today at the five wrapping columns.
  L.say(h.found&&h.anInkLost===0,
    tag+': every painted pixel row of "🔍 Analyze" reaches 🔍 Analyze - '+h.anInkLost+' of '+h.anInkRows+
    ' ink rows are lost to another control (TARGET 0; this is the assertion, and it is what must reach zero - '+
    'NOT the 14.00px overlap, which is a symptom that a -8px margin would move without fixing anything). '+
    'Sampled at integer y over [ceil(inkTop), floor(inkBot)) down the button\'s own centre line; ink '+
    h.anInkTop+'..'+h.anInkBot+', lost rows '+(h.anLostYs.join(',')||'none'),
    {anInkLost:h.anInkLost,anInkRows:h.anInkRows,lostYs:h.anLostYs,target:0});

  // ── A3. THE ASSERTION, backwards. Written against NC4 before it was needed: a zIndex patch moves the
  //    theft rather than ending it, and a one-way scan would call that green.
  L.say(h.found&&h.cpInkLost===0,
    tag+': and every painted pixel row of "📋 Copy moves" reaches 📋 Copy moves - '+h.cpInkLost+' of '+
    h.cpInkRows+' lost (TARGET 0). THE SCAN RUNS BOTH WAYS ON PURPOSE: raising 🔍 Analyze\'s zIndex makes A2 '+
    'green while the boxes still overlap and it is this half that is then stolen. A fix that moves the theft '+
    'is not a fix, and this is the assertion that says so',
    {cpInkLost:h.cpInkLost,cpInkRows:h.cpInkRows,lostYs:h.cpLostYs,target:0});

  // ── D1..D3. DIAGNOSTICS, printed beside the assertion rather than asserted (antagonist A's amendment 1).
  L.note(tag+': DIAGNOSTIC wrapped='+h.wrapped+'  overlap='+h.overlap+'px  lineAdvance='+h.lineAdvance+
    '  boxes '+h.anH+'/'+h.cpH+'px  Analyze box rows to Copy '+h.anBox.toOther+' of '+h.anBox.total+
    '  Copy box rows to Analyze '+h.cpBox.toOther+' of '+h.cpBox.total+'  board='+(m.board&&m.board.w));

  // ── D4. THE FLIP BOUNDARY, pinned with a tolerance that does not straddle 368 (#411). Today it sits at
  //    367.125 at 320x520: 0.875px ABOVE the geometric ink edge, because Chromium snaps hit rects to
  //    LayoutUnits. AFTER THE FIX there is no boundary inside the box at all and this asserts null.
  L.say(h.found&&h.flipY===null,
    tag+': and there is NO y inside 🔍 Analyze\'s own box at which it stops answering for itself (stepped at '+
    '0.125px from its top; today the flip is at y='+h.flipY+', which is '+
    (h.flipY!=null&&h.anInkTop!=null?Math.round((h.flipY-h.anInkTop)*1000)/1000+'px into its ink':'n/a')+
    '). The 0.125px step is the published convention: an integer-y scan and a half-pixel-centre scan '+
    'disagree by one row at this boundary, and that disagreement is why the count is published with its '+
    'interval rather than alone',
    {flipY:h.flipY,anTop:h.anTop,anBot:h.anBot,cpTop:h.cpTop,step:0.125,target:null});

  // ── N1. THE NO-WRAP ASSERTION, AT EVERY COLUMN (amendment B). This is the route Kunal chose and it is the
  //    property a fix must produce: the two chips sit on ONE line beside the MOVES label. Red at the five
  //    wrapping columns on the shipped bundle, green at the three healthy ones, so it is falsifiable in both
  //    directions on unmodified main without any control bundle.
  L.say(h.found&&h.wrapped===false,
    tag+': the two chips of the MOVES row sit on ONE line - wrapped='+h.wrapped+
    (h.wrapped?(' (line advance '+h.lineAdvance+'px against '+h.anH+'px boxes, overlap '+h.overlap+'px)'):'')+
    '. THIS IS THE ROUTE, not a symptom: with no second line there is no overlap to lose ink to',
    {wrapped:h.wrapped,lineAdvance:h.lineAdvance,overlap:h.overlap,board:m.board&&m.board.w,target:false});

  // ── N2. THE FIT ARITHMETIC, AT EVERY COLUMN. The one assertion that can fail BEFORE a wrap and that a
  //    "forbid wrapping" non-fix cannot satisfy: flexWrap:nowrap stops the second line and leaves the chips
  //    overflowing their box, which N1 alone would sign off. Needed = both chip widths + the box's own gap;
  //    Have = the box's content width. Printed as a slack so a build can see how close it is.
  /* THE MEASURE IS THE ROW AND NOT THE CHIP BOX, and this run's first draft got it wrong - stated here
     because it is the trap CLAUDE.md names and the one this lane has now hit on six consecutive runs. The
     chip box is a shrink-to-fit flex CHILD: while the chips fit, its width IS their width, so
     chipsHave - chipsNeeded is 0.00 BY CONSTRUCTION at every geometry (measured: 113.36 of 113.36 at all
     eight columns of the candidate fix). An assertion on that slack could only ever fail once the row had
     already wrapped, i.e. it would restate N1 in different words. The available width lives one level up:
     the row's content width against MOVES + the row's own gap + the pair. Measured on SHIPPED #428 that
     reads -78.81px at 320x520 and +0.06px at 375x568 - the "healthy contrast" column is six hundredths of a
     pixel from the defect, which is why N2b asserts a MARGIN and not merely a fit. */
  L.say(h.found&&h.rowNeeded!=null&&h.rowHave!=null&&h.rowNeeded<=h.rowHave+0.5,
    tag+': and the pair FITS beside the label - MOVES '+h.labelW+'px + '+h.rowGap+'px gap + chips '+
    h.chipsNeeded+'px ('+h.anW+' + '+h.cpW+' + '+h.chipGap+'px) = '+h.rowNeeded+' of '+h.rowHave+
    'px of row, slack '+h.rowSlack+'px. A negative slack is the defect BEFORE it becomes a second line, and '+
    'it is what tells a nowrap-only patch apart from a real one: flexWrap='+h.chipWrapCss+' with the chips '+
    'overflowing their box by '+h.chipOverflowX+'px keeps N1 green and fails HERE',
    {labelW:h.labelW,rowGap:h.rowGap,chipsNeeded:h.chipsNeeded,rowNeeded:h.rowNeeded,rowHave:h.rowHave,
     rowSlack:h.rowSlack,overflowX:h.chipOverflowX,flexWrap:h.chipWrapCss,tol:0.5});

  // ── N2b. AND IT FITS WITH MARGIN. Kunal's route says the build "picks whichever fits with margin and says
  //    which and why", so the margin is asserted rather than left to a reading of a log. MARGIN px is the
  //    floor: Apple line-breaking and a different font fallback move a label by more than 0.06px, which is
  //    all the slack the shipped build has at 375x568.
  L.say(h.found&&h.rowSlack!=null&&h.rowSlack>=MARGIN,
    tag+': and it fits WITH MARGIN - row slack '+h.rowSlack+'px against a floor of '+MARGIN+'px. The shipped '+
    'bundle reads +0.06px at 375x568 with the SAME probe, so "it does not wrap on my phone" and "it fits" '+
    'are not the same statement and this line is the difference between them',
    {rowSlack:h.rowSlack,floor:MARGIN,shippedAt375x568:0.06});

  // ── N2c. ADDED BY THE BUILD LANE AT #430, NOT BY TEST-AUTHORING, AND FLAGGED FOR ITS REVIEW.
  //    THE STATE EVERY ASSERTION ABOVE MEASURES AROUND: the Copy chip RENAMES ITSELF when it fires. N1/N2/N2b
  //    read the row AT REST, where the chip says "Copy" (46.00px). In flight it says "✓ Copied!" and on a
  //    clipboard failure it said "⚠ Long-press list" - 116.34px, needing +70.34px against 58.2px of slack at
  //    375x520. The row re-wrapped there and the P0 came back WITH EVERY ASSERTION ABOVE GREEN, because none of
  //    them is ever taken in that state. CLAUDE.md's "measure after interaction" and #391's "enumerate what the
  //    code can legally produce" in one place.
  /* MY OWN FIRST DRAFT OF THIS ASSERTION FAILED ITS OWN NEGATIVE CONTROL AND THE REASON IS WORTH THE LINES.
     It carried a hardcoded list of the three labels, set the chip's text to each, and asserted the widest fits.
     Run against a control bundle with "⚠ Long-press list" PUT BACK, the width half stayed GREEN at all five
     columns - because the widest label it knew about was still "⚠ Copy failed". The assertion's expected value
     was read from my list rather than from the thing under test, which is the trap CLAUDE.md names five times
     over (clip-intersection, "the covering element is big", the bubble satisfying grid.contains, flex-shrink
     absorbing the overrun, a log footer computed from the log). Only the companion bundle-string guard caught
     it, so the pair worked and the assertion did not. REPLACED with the state itself: stub the clipboard so the
     failure path is FORCED, tap Copy for real, and measure the row with whatever label the app actually painted.
     There is no list left to be wrong about. */
  {
   const fitIn=async(what)=>b.page.evaluate(()=>{
     const q=s=>document.querySelector('[data-ct="'+s+'"]');
     const an=q('moves-analyze'),cp=q('moves-copy'),hd=q('moves-head');
     if(!an||!cp||!hd)return {err:'no row'};
     const box=an.parentElement, row=box.parentElement;
     const rs=getComputedStyle(row), bs=getComputedStyle(box), rr=row.getBoundingClientRect();
     const have=rr.width-parseFloat(rs.paddingLeft||0)-parseFloat(rs.paddingRight||0);
     const A=an.getBoundingClientRect(),C=cp.getBoundingClientRect(),H=hd.getBoundingClientRect();
     const cg=parseFloat(bs.columnGap)||parseFloat(bs.gap)||0, rg=parseFloat(rs.columnGap)||parseFloat(rs.gap)||0;
     const need=H.width+rg+A.width+cg+C.width, r2=n=>Math.round(n*100)/100;
     return {label:(cp.innerText||'').trim(), cpW:r2(C.width), slack:r2(have-need),
             oneLine:Math.abs(C.top-A.top)<=1, dTop:r2(C.top-A.top),
             /* THE OVERLAP IS A RECT INTERSECTION AND NOT A VERTICAL ONE, and my first draft of this line got it
                wrong and went red on a CORRECT bundle at 42px. Two chips sitting SIDE BY SIDE on one line share
                their whole vertical extent by definition, so the vertical span alone reads ~43px - the box height -
                on exactly the healthy layout this fix creates. What steals a tap is an intersection in BOTH axes,
                so the quantity is min(xOverlap, yOverlap) and it is <= 0 whenever the chips are merely beside each
                other. Caught by running it against the fixed bundle before trusting it. */
             overlap:r2(Math.min(Math.min(A.bottom,C.bottom)-Math.max(A.top,C.top),
                                 Math.min(A.right,C.right)-Math.max(A.left,C.left)))};
   });
   const rest=await fitIn('rest');
   /* THE FLASH STATE IS NOT REACHABLE AT EVERY COLUMN, AND THAT IS THE APP'S OWN GUARD RATHER THAN A GAP.
      copyMoves opens `const h=boardGame.history; if(!h||!h.length)return;` - so with no moves played it returns
      WITHOUT flashing and the chip cannot change its label at all. practice-m0 is exactly that: the practice
      position at move 0. Found by running this assertion's own non-vacuity check, which reported the label going
      from "Copy" to "Copy" there and refused to pass - the behaviour #385's rule asks for. So the three
      assertions below run where the state EXISTS (the demo end, which is every column that carries the defect:
      375x520, 320x520 and 320x540 all wrap there) and print a fixture note where it does not. They are not
      skipped quietly and they are not passed vacuously. The reachability is ASSERTED, not assumed: the first of
      the three is the label actually changing. */
   const movesPlayed=await b.page.evaluate(()=>{
     const hd=document.querySelector('[data-ct="moves-head"]'); if(!hd)return null;
     const panel=hd.parentElement&&hd.parentElement.parentElement;
     if(!panel)return null;
     return (panel.innerText||'').match(/\b[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]\b|\bO-O(-O)?\b/g)?
            ((panel.innerText||'').match(/\b[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]\b|\bO-O(-O)?\b/g)||[]).length:0;
   });
   if(!movesPlayed){
     L.note(tag+': (fixture) the flash state is UNREACHABLE here - '+movesPlayed+' move tokens in the MOVES '+
       'panel, and copyMoves returns before flashing when the history is empty, so the chip cannot rename '+
       'itself at all. N2c is not run at this column and is not counted as a pass.');
   } else {
   // FORCE the failure branch of copyMoves: no async clipboard, and execCommand returns false. Both are what
   // the source's own catch/else path keys on, so the label that appears is the app's, not this gate's.
   await b.page.evaluate(()=>{try{Object.defineProperty(navigator,'clipboard',{get:()=>undefined,configurable:true});}catch(e){}
                              document.execCommand=()=>false;});
   await b.page.click('[data-ct="moves-copy"]');
   await b.page.waitForTimeout(220);
   const flash=await fitIn('flash');
   L.say(!!flash&&!flash.err&&flash.label!==rest.label,
     tag+': the forced clipboard-failure tap really did change the chip\'s label, from "'+rest.label+'" to "'+
     flash.label+'" - the non-vacuity check for the two assertions below, because a stub that failed to take '+
     'would leave them measuring the resting row again and passing for the wrong reason',
     {restLabel:rest.label,flashLabel:flash.label});
   L.say(!!flash&&flash.oneLine===true&&flash.slack!=null&&flash.slack>=MARGIN,
     tag+': and the row STILL fits on one line with margin while that label is up - "'+flash.label+'" makes the '+
     'chip '+flash.cpW+'px against '+rest.cpW+'px at rest, and the slack falls from '+rest.slack+'px to '+
     flash.slack+'px against a floor of '+MARGIN+'px. MEASURED at #430: "⚠ Long-press list" was 116.34px here '+
     'and took this to -12.14px at 375x520, wrapping the row and returning the P0 in the one state nothing else '+
     'in this file visits',
     {flashLabel:flash.label,restCpW:rest.cpW,flashCpW:flash.cpW,restSlack:rest.slack,flashSlack:flash.slack,
      floor:MARGIN,oneLine:flash.oneLine,dTop:flash.dTop});
   L.say(!!flash&&flash.oneLine===true&&flash.overlap<=0,
     tag+': and the two hit boxes do not intersect in that state either - the smaller of their x and y overlaps '+
     'is '+flash.overlap+'px (<= 0), which is N3 taken in the flash state rather than only at rest',
     {overlap:flash.overlap,oneLine:flash.oneLine,movesPlayed:movesPlayed});
   }
  }

  // ── N3. AND THE OVERLAP ASSERTION IS KEPT, so it can still fail if anything ever wraps again (the
  //    decision's own words). Vacuously true while N1 is green - which is the point: it is the guard for the
  //    day N1 goes red, and it is the assertion that would have caught the -8px margin "fix".
  L.say(h.found&&(h.wrapped===false||(h.overlap!=null&&h.overlap<=0)),
    tag+': and IF the row ever wraps again the two hit boxes must not overlap - wrapped='+h.wrapped+
    ', overlap='+h.overlap+'px (a positive overlap with a wrap is the 14.00px defect returning; this line is '+
    'deliberately satisfied by not wrapping at all)',
    {wrapped:h.wrapped,overlap:h.overlap,lineAdvance:h.lineAdvance,target:'no wrap, or overlap <= 0'});

  if(wraps){
    /* ── W1, WITHDRAWN AS AN ASSERTION BY AMENDMENT B (2026-09-28) AND THE REASON IS A MEASUREMENT, NOT A
       PREFERENCE. It asserted wrapped===true, i.e. "this column really is the wrapping one". Kunal chose the
       NO-WRAP ROUTE on 2026-09-28 (decisions/next-build-takes-kunals-own-defects-2026-09-27,
       kunalChoseTheNoWrapRoute_2026-09-28T23-25Z): the fix shrinks the chips so the row never wraps. Run
       VERBATIM against a built candidate of that route (bundle md5 d44839c5028c: chips at padding 3px 7px,
       font 12px, labels "Analyze" and "Copy"), this gate scored 34 pass / 5 FAIL - and all five failures were
       THIS line, at the five wrapping columns, on a bundle where every assertion the gate exists for is green.
       A gate that goes red on a correct fix is a gate the next build has to argue with. So the wrap state is
       PRINTED here and the property is asserted by N1/N2 below, which hold in the target state instead. */
    L.note(tag+': (fixture) wrapped='+h.wrapped+'  lineAdvance='+h.lineAdvance+'  board='+(m.board&&m.board.w)+
      ' - on the SHIPPED bundle this column wraps, which is the state A2/A3 were written for; on the no-wrap '+
      'fix it does not, and N1/N2 are what must be green then.');
    if(!firstWrapped) firstWrapped={tag,h,b:true};
  } else {
    // ── C1/C2. THE INSTRUMENT'S OWN CONTROL, inside the gate. These must be GREEN on the shipped build.
    //    If they are not, the probe is broken and every red above is worthless.
    /* NOT AN ASSERTION, AND THE CONTROL RUN IS WHY. NC1 - the obvious fix, both margins removed - makes the
       row 20px taller, and this row is keyed to the board while the board is fit to HEIGHT, so the board at
       these two columns drops 270.88 -> 198.90 and the row THEN WRAPS here as well. It wraps HARMLESSLY
       (line advance 49 against 43px boxes, overlap -6.00, zero ink lost either way) - but an assertion on
       `wrapped===false` would have gone RED on a correct fix, for a reason that has nothing to do with what
       this gate guards. So the wrap state is a printed fixture note at these columns and the ASSERTION is
       C2 below, which is the property that must hold whether the row wraps or not. */
    L.note(tag+': (fixture) wrapped='+h.wrapped+' at board '+(m.board&&m.board.w)+
      ' - on the shipped bundle this column does not wrap; if a fix makes it wrap it must still satisfy C2.');
    L.say(h.found&&h.anInkLost===0&&h.cpInkLost===0&&h.flipY===null,
      tag+': (control) and the SAME probe reads zero lost ink in both directions with no flip boundary - '+
      'which is what makes the reds above a measurement of the app rather than of this instrument. '+
      'Analyze keeps '+h.anBox.own+' of '+h.anBox.total+' of its own box rows',
      {anInkLost:h.anInkLost,cpInkLost:h.cpInkLost,flipY:h.flipY,ownRows:h.anBox.own,total:h.anBox.total});
  }

  // ── E1. THE REAL CLICK, at the worst column only (one drive, not eight). The pair is the whole point:
  //    a click 9.5px higher, at the button's own centre, must do something DIFFERENT and correct.
  if(wraps && g.w===320 && g.h===520 && state==='endgame-demo-end'){
    const cx=(h.anTop!=null)?await b.page.evaluate((AN)=>{const r=document.querySelector(AN).getBoundingClientRect();return r.left+r.width/2;},AN):null;
    // (a) the CONTROL click: the button's own geometric centre, which is above the overlap.
    const cyCentre=Math.round(((h.anTop+h.anBot)/2)*100)/100;
    await b.page.mouse.click(cx,cyCentre); await b.settle(900);
    const after1=await appState(b);
    L.say(after1.stillInLesson===false||after1.copyLabel===null,
      tag+' E1a (control click): a click at 🔍 Analyze\'s own CENTRE ('+cx+','+cyCentre+') leaves the lesson for Game review, which is the correct action and the proof that this click pair can tell two outcomes apart',
      {cx,cy:cyCentre,stillInLesson:after1.stillInLesson,copyLabel:after1.copyLabel});
    // (b) THE DEFECT CLICK: on the painted glyphs, inside the overlap. Re-driven from scratch so (a) cannot
    //     leave state behind - #427's own control pair did the same.
    await D.states[state](b); await b.settle(400);
    const h2=await hit(b);
    const cy=(h2.anLostYs&&h2.anLostYs.length)?h2.anLostYs[h2.anLostYs.length-1]:null;
    if(cy!=null){
      const cx2=await b.page.evaluate((AN)=>{const r=document.querySelector(AN).getBoundingClientRect();return r.left+r.width/2;},AN);
      await b.page.mouse.click(cx2,cy); await b.settle(900);
      const after2=await appState(b);
      L.say(!/Copied/i.test(after2.copyLabel||''),
        tag+' E1b (THE DEFECT, as a user meets it): a real click on the lower PAINTED CHIP of "🔍 Analyze" at ('+
        cx2+','+cy+') must not fire 📋 Copy moves. The copy control reads "'+after2.copyLabel+'" after it. '+
        'This is the assertion that makes this a P0 rather than a geometry residual: two legitimate actions, '+
        'no error between them, and the wrong one fires 9.5px below a click that works',
        {cx:cx2,cy,copyLabel:after2.copyLabel,stillInLesson:after2.stillInLesson,centreClickWas:cyCentre});
      L.say(after2.stillInLesson===false,
        tag+' E1c: and that same click should have LEFT the lesson for Game review, as the centre click did. '+
        'stillInLesson='+after2.stillInLesson+' is the other half of the wrong action: the player stays where '+
        'they are with no error, which is why they conclude the button is broken rather than that they missed it',
        {stillInLesson:after2.stillInLesson,copyLabel:after2.copyLabel});
    } else {
      L.say(h2.anInkLost===0,
        tag+' E1b: no ink row of 🔍 Analyze is lost, so there is no defect pixel to click. This is the fixed state and E1b has nothing to drive',
        {anInkLost:h2.anInkLost});
    }
  }

  await b.shot('lesson-hit-area-'+g.w+'x'+g.h+'-'+state);
  await b.close();
 }
},'LESSON-HIT-AREA');

