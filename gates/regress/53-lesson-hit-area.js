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
  return {found:true,hasAnalyze:true,hasCopy:true,
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

L.run(async()=>{
 let firstWrapped=null;
 for(const [state,g,wraps,why] of COLS){
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

  if(wraps){
    // ── W1. The column really is the wrapping one. Asserted so a layout change that stops it wrapping shows
    //    up as THIS red - "the fixture moved" - rather than as A2 going quietly green for the wrong reason.
    L.say(h.found&&h.wrapped===true,
      tag+': (fixture) the row really does WRAP here, so A2/A3 above are measuring the state this gate was written for. If this goes red while A2 goes green, the fixture moved and the defect was not fixed',
      {wrapped:h.wrapped,lineAdvance:h.lineAdvance,board:m.board&&m.board.w});
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
