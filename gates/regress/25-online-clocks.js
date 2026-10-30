// regress/25-online-clocks.js   ONLINE CLOCKS - the New Game sheet's Online branch.
//
// WHY THIS GATE EXISTS. Online play had ZERO assertions in this repository before this file: no gate in
// gates/regress/ drove gates/drive/play.js state 'setup-online', and the string 'setup-online' appears in no
// other gate. So every part of the online setup screen was unguarded, on a screen that decides what kind of
// game two people are about to play.
//
// WHAT #400 CHANGED, and what this file is the negative control for. build-spec-online-clocks found that online
// minute clocks were BUILT AND UNREACHABLE: the game document already seeded clk from tc.init, a move already
// debited the mover and wrote clk back, a move that exhausted the clock already wrote result/status:'over'/
// endBy:'time', both panel clocks and both player-bar clocks already ticked, and flag-fall already raised a
// claim control - but one {opponent!=='online'} guard at chess.jsx:4690 hid the minute-clock row, so a player
// could never CHOOSE a minute clock, tc.kind!=='corr' && tc.init was never true for an online game, and clk was
// always null. Measured on the #399 bundle at BOTH 375x730 and 320x568 before the change: the only pills on
// this branch were No limit / 1 day / 3 days / 7 days.
//
// WHAT IT GUARDS
//   1. R-OC-1: all eight live controls are choosable for an online game, at three widths.
//   2. R-OC-1's other half, which my own first attempt got WRONG: EXACTLY ONE pill reads as selected. Both rows
//      render now and both null pills keyed off the same !timeCtrl state, so 'No clock' and 'No limit' both lit
//      up at once. That is a cross-element inconsistency, the class this suite has no assertions for, and it is
//      why this gate counts selected pills instead of just checking that the labels exist.
//   3. R-OC-2: the clock a player picked survives the switch to Online, and a DAY limit - meaningless offline -
//      does not survive the switch away from it.
//   4. R-OC-3: the 'still coming' notice is gone, because R-OC-1 makes that sentence false.
//   5. The correspondence row is NOT collateral damage: its three day limits are still choosable.
//   6. CONTAINMENT AT 320, which is the risk this change actually carries: it adds NINE pills to a sheet that
//      was already tight, and phone-width-matrix / sweep372-other-lines-320 are what happens when nobody checks.
//      Horizontal spill past the viewport is the unrecoverable one, so it is asserted per geometry.
//
// MEASUREMENT RULES OBSERVED
//   (1) Selection is read from the COMPUTED background, because pill(on) is the only difference between a chosen
//       and an unchosen pill: background rgba(var(--acr),.25) when on, 'transparent' when off. Reading the label
//       text alone cannot tell them apart - #385's 'a shape is not a value' in its cheapest form.
//   (2) Every tap is guarded. tapBtn throws when its target is absent, and #393 lost NINETY assertions to one
//       missing element; each block goes red on its own assertion and the file carries on.
//   (3) Nothing here reads docScrollY. #root is overflow-y:auto by design, so the document never scrolls; the
//       sheet is its own scroller. See CLAUDE.md and gate 40.
//   (4) L.launch prints the bundle and stamp it measured. If a run's output does not say what it measured, it is
//       not evidence.
//
// #416, AND IT IS THE ONE THIS FILE MOST NEEDS SOMEBODY TO READ: THE CLOCK USED TO START WHEN THE INVITE WAS
// WRITTEN, NOT WHEN THE GAME BEGAN. _gameCreate seeds clk and writes moveAt while status is still 'waiting';
// _gameJoin flipped status to 'active' and never touched moveAt. So the whole time an invite sat unaccepted
// was charged to White - the first move debits _now-(og.moveAt||_now) and writes endBy:'time' the moment the
// remainder hits zero, and onlineClaimFlag offers the opponent a Claim win button on the same arithmetic.
// On a 1 min game a friend who took a minute to tap Join had already won it before either player moved.
// It was harmless until the minute-clock pills shipped, which made it the feature's primary path, and it was
// live on main from then until #416. FIXED in index.html (_gameJoin re-seeds moveAt and clk) and in the
// rematch push, which had inherited the finished game's clocks. NEITHER FIX IS GATED, and cannot be from
// here: the whole CTCloud implementation lives in an index.html module importing from gstatic.com, which
// gates/lib.js BLOCKS, so _gameCreate/_gameJoin/_gamePush never execute in the sandbox and a double would
// only be this file's own code proving things about itself. It is a NAMED residual for the two-context
// harness and for Kunal's live two-phone test, which decision cov-online already anticipates.
//
// NOT COVERED, NAMED SO NOBODY READS THIS GREEN AS MORE THAN IT IS: R-OC-4 (the moveAt skew fix), R-OC-5 (losing
// on time), R-OC-6 (data-ct on the clocks) and R-OC-7 (the flag row must not move the board) are all about a
// LIVE online game, which needs sign-in and Firestore and, per the spec's own notChecked, a two-context relay
// harness nobody has written. R-OC-5 is additionally blocked on two unanswered questions to Kunal. This file
// asserts that a player can CHOOSE a clock, not that the clock then behaves.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

const PILL=/^(No clock|No limit|\d+ min|\d\+\d|\d+ days? \/ move)$/;
const LIVE=['1 min','2 min','3 min','5 min','10 min','1+1','2+1','3+1'];
const CORR=['1 day / move','3 days / move','7 days / move'];
const geos=[{k:'kunal730',n:'375x730'},{k:'se',n:'320x568'},{k:'390',n:'390x844'}];

const READ=(b)=>b.page.evaluate((src)=>{
  const re=new RegExp(src);
  const vis=[...document.querySelectorAll('span,button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;});
  const pills=vis.filter(x=>re.test((x.innerText||'').trim()));
  const rect=(x)=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),l:Math.round(r.left*10)/10,r:Math.round(r.right*10)/10};};
  return {
    labels:pills.map(x=>(x.innerText||'').trim()),
    selected:pills.filter(x=>getComputedStyle(x).backgroundColor!=='rgba(0, 0, 0, 0)').map(x=>(x.innerText||'').trim()),
    heads:[...new Set([...document.querySelectorAll('div')].map(x=>(x.innerText||'').split('\n')[0].trim()).filter(t=>/Time control|Time per move/i.test(t)))],
    stillComing:document.body.innerText.includes('still coming'),
    spill:pills.map(rect).filter(o=>o.r>innerWidth+0.5),
    // the summary line under the Start button - the app's OWN statement of what game is about to be played,
    // which is the readout that catches a clock the pills cannot show (see TC-OC-010)
    summary:[...new Set([...document.querySelectorAll('div')].map(x=>(x.innerText||'').trim())
      .filter(t=>/·/.test(t)&&t.length<90&&/Computer|Human|Pass|Online/i.test(t)))].slice(0,3),
    // the vertical cost of nine more pills, which is what this change actually spends (TC-OC-006)
    // ── THE CANDIDATE SET IS EVERY ELEMENT AND NOT EVERY DIV [antagonist A of #544, finding F1, UPHELD].
    // TC-OC-006c below asserts `!isDoc`, and with the set built from querySelectorAll('div') THAT CONJUNCT
    // COULD NEVER BE TRUE - documentElement is HTML and body is BODY, neither of them a div - so item (31)
    // replaced one constant-true conjunct with another, in the item whose whole subject is that class. A
    // measured it in real Chromium over four constructed pages. Widening to '*' can only ADD elements that
    // genuinely overflow AND carry overflow-y auto or scroll, which is what makes isDoc an assertion.
    sheetScroll:(()=>{const sc=[...document.querySelectorAll('*')].filter(x=>{const st=getComputedStyle(x);
      return /auto|scroll/.test(st.overflowY)&&x.scrollHeight>x.clientHeight+1;});
      // ── THE SCROLLER'S IDENTITY, NOT ONLY ITS SIZE [#544 item (31)]. TC-OC-006b used to assert
      // `sheetScroll.sh > sheetScroll.ch` on an object this filter only produced BECAUSE scrollHeight was
      // already greater than clientHeight + 1, so that half of the conjunct was true by construction and the
      // assertion read as two checks while being one. What the assertion is actually about is WHICH element
      // pays for the pills, so the element is identified here: whether it is the document or the body, and a
      // short readable signature a reader can take back to the DOM.
      const m=sc.map(x=>({sh:x.scrollHeight,ch:x.clientHeight,
        isDoc:(x===document.documentElement||x===document.body),
        id:(x.getAttribute('data-ct')||x.id||'')+'/'+x.tagName.toLowerCase()+(x.className&&typeof x.className==='string'?'.'+x.className.trim().split(/\s+/)[0]:''),
        top:Math.round(x.getBoundingClientRect().top),h:Math.round(x.getBoundingClientRect().height)}))
        .sort((a,b)=>b.sh-a.sh)[0];return m||null;})(),
    onlineSelected:(()=>{const btn=[...document.querySelectorAll('button')].find(x=>/^Online$/.test((x.innerText||'').trim()));
      if(!btn)return null;const st=getComputedStyle(btn);return {border:st.borderColor,bg:st.backgroundColor};})(),
    docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight),
    vw:innerWidth,vh:innerHeight};
},PILL.source);

L.run(async()=>{

// ── R-OC-1, R-OC-3 and containment, at three widths ────────────────────────────────────────────────────────
for(const g of geos){
  const b=await L.launch({geo:g.k,name:'oc-'+g.n});await b.open();
  let reached=true;
  try{ await P.states['setup-online'](b); }catch(e){ reached=false; }
  const o0=reached?await READ(b):null;
  // #400 antagonist: `reached` alone is only "the driver did not throw" - it never asserted we are on the ONLINE
  // branch, and what actually proved that was TC-OC-002 (the corr row renders only for online). The assertion
  // named for the job was not the one doing it, so it now checks the thing it claims.
  L.say(reached&&!!o0&&o0.labels.some(x=>/\/ move$/.test(x)),
    g.n+': TC-OC-000 the ONLINE branch of the New Game sheet was actually reached - the driver did not throw AND a day-per-move pill is on screen, which renders for no other opponent. Asserted FIRST so every red below means the assertion failed rather than the screen never arriving',{reached,dayPills:o0&&o0.labels.filter(x=>/\/ move$/.test(x))});
  if(!reached){ await b.close(); continue; }

  const o=o0;
  const missing=LIVE.filter(x=>!o.labels.includes(x));
  L.say(missing.length===0,
    g.n+': TC-OC-001 all eight live time controls are choosable for an ONLINE game - '+LIVE.join(', ')+'. On #399 this set was empty here and the only pills were No limit / 1 day / 3 days / 7 days, so this assertion is red before #400 and green after',{missing,labels:o.labels});

  const corrMissing=CORR.filter(x=>!o.labels.includes(x));
  L.say(corrMissing.length===0,
    g.n+': TC-OC-002 the correspondence row survived the change - its three day limits are still choosable, because adding live clocks must not cost the feature that already worked',{corrMissing});

  L.say(o.heads.length===2&&/time control/i.test(o.heads.join('|'))&&/time per move/i.test(o.heads.join('|')),
    g.n+': TC-OC-003 both headings are present and distinct - the live row under its own heading and the day limits under theirs, because they are Kunal-facing copy that means two different things',o.heads);

  L.say(o.selected.length===1,
    g.n+': TC-OC-004 EXACTLY ONE pill reads as selected, not two. This is the assertion my own first attempt at R-OC-1 failed: both rows render now and both null pills keyed off !timeCtrl, so No clock and No limit both lit up and the screen showed two selections for one setting',{selected:o.selected});

  L.say(o.stillComing===false,
    g.n+': TC-OC-005 the "Live ticking clocks for online are still coming" notice is gone - it became false the moment the live row shipped',{stillComing:o.stillComing});

  L.say(o.spill.length===0,
    g.n+': TC-OC-006 no time-control pill is painted past the right edge of a '+o.vw+'px viewport - sweep372-other-lines-320 is what it looks like when nobody checks. HONEST LIMIT, measured by the antagonist pass: the row is flexWrap:wrap with 3.3x slack at 320, so adding pills CANNOT spill horizontally and this assertion cannot fail for that mechanism. It is kept because a nowrap control does turn it red 3x, and because the cost this change really carries is VERTICAL, recorded next',o.spill);
  // #400, SELF-CAUGHT: the first version of this asserted sheetScroll.sh > sheetScroll.ch - "the sheet must
  // overflow". That went red on the #399 control at 390x844, CORRECTLY, because with nine fewer pills the sheet
  // fits there and not overflowing is not a defect. An assertion that a build with LESS content fails is pinning
  // an incidental fact, and a future build that trims this sheet would go red for being better. So the property
  // asserted is the durable one - the document is never the scroller, the sheet is - and the vertical cost is
  // RECORDED rather than thresholded, which is what the antagonist actually asked for.
  L.note(g.n+': sheet scroll '+(o.sheetScroll?o.sheetScroll.sh+' in '+o.sheetScroll.ch:'fits, no overflow')+'  (the vertical price of nine more pills: +127px at 320x568 and +112px at 375x679 against #399)');
  // ── TC-OC-006b WAS A COMPOUND WHOSE SECOND HALF COULD NOT FAIL, AND IT IS NOW TWO ASSERTIONS
  // [#544 item (31); jobs/three-suite-assertions-read-an-empty-or-constant-denominator-as-a-pass-2026-10-07,
  // P1, found by antagonist A of #493 and still live four weeks later].
  // WHAT WAS HERE: `o.docScroll===0 && (o.sheetScroll===null || o.sheetScroll.sh>o.sheetScroll.ch)`. The
  // selector above only KEEPS an element when scrollHeight > clientHeight + 1, so any non-null sheetScroll
  // satisfies sh > ch BY CONSTRUCTION: the assertion reduced to `docScroll===0` while reading as two checks.
  // That is this project's own named anti-pattern - a conjunct whose halves cannot fail independently is the
  // missing-denominator trap one level down - inside an assertion that was itself rewritten at #400 to escape
  // a different one.
  // THE SPLIT IS NOT COSMETIC: the first half is the durable property (#root is the app's scroller, so the
  // document never scrolls BY DESIGN and a gate reading document.scrollingElement would call this sheet
  // unreachable - CLAUDE.md's two false P0s). The second is about WHICH element pays, which is what the
  // sentence always claimed and never tested, so it asserts the scroller's IDENTITY and not its size.
  L.say(o.docScroll===0,
    g.n+': TC-OC-006b the DOCUMENT does not scroll - docScroll '+o.docScroll+' by design, because #root is the app\'s own scroller and index.html says the page never scrolls. It CANNOT FAIL (html and body are overflow:hidden) and is kept as the record of that design, not as a reachability check - the scroll that used to be claimed here is TC-OC-006e below, which performs it [#545]',{docScroll:o.docScroll});
  // AND THE DENOMINATOR IS REPORTED, NEVER CREDITED: with the sheet short enough to fit there is no scroller to
  // identify, and that is a legitimate state (#400 measured it at 390x844 with nine fewer pills), so it is an
  // L.note and not a PASS. A PASS here would be the very thing this item removes.
  if(o.sheetScroll===null){
    // THE SENTENCE IS NARROWED TO WHAT WAS LOOKED AT [antagonist A of #544, F1]. It used to read "so no
    // element overflows", which is a claim about the page; the collector asks only about elements whose
    // computed overflow-y is auto or scroll, so an element that overflows with overflow-y hidden or visible is
    // outside it and the old wording was a false measurement in a note.
    L.note(g.n+': TC-OC-006c NOT CHECKED - at '+o.vw+'x'+o.vh+' no element whose computed overflow-y is auto or scroll overflows its own box, so there is no scroller to identify. #400 measured exactly this at 390x844 with nine fewer pills, which is why it is a note and not a red');
  }else{
    // THE `id!=='/'` CONJUNCT IS GONE [antagonist A of #544, F1]. `id` is built as
    // (data-ct or DOM id or '') + '/' + tagName + (first class), so the tagName is ALWAYS interpolated and the
    // comparison could never be false - a third decoration reading as a check. What is asserted is what can
    // turn: the payer is not the document or the body, and it has a real box. Its identity is PRINTED, which is
    // what a reader needs, and printing is not asserting.
    L.say(!o.sheetScroll.isDoc&&o.sheetScroll.h>0,
      g.n+': TC-OC-006c and the element that pays for the pills is a box INSIDE the page and not the document or the body - '+o.sheetScroll.id+' at top '+o.sheetScroll.top+', '+o.sheetScroll.h+'px tall, scrolling '+o.sheetScroll.sh+' in '+o.sheetScroll.ch+'. The old form asserted sh>ch, which the selector above had already guaranteed',o.sheetScroll);
  }

  // ── TC-OC-006e: THE SCROLL TC-OC-006b's MESSAGE CLAIMED AND NEVER PERFORMED [#545, item (39); jobs/tc-oc-006b-unfalsifiable].
  // That message read "Continue and Start game were both confirmed on screen after actually scrolling that ancestor, not by
  // scrollIntoView", and no scroll was done and no rect was read anywhere in it. On the ONLINE branch the sheet's only action
  // is "Continue →", and it rests BELOW the fold (measured at #545: top 885.75 on a 568-tall phone, 831.75 on 730). So this
  // does what the sentence said: find the button, walk to its nearest ancestor that a FINGER can scroll (computed overflow-y
  // auto or scroll, room to scroll, and no touch-action:none on the chain - gate 74's lesson), move that ancestor's scrollTop
  // just far enough, then re-read: the button must sit fully inside the viewport and own the point at its own centre. Two
  // lines, the denominator first, so a missing button reads red and never as a reachability pass.
  const reach=await b.page.evaluate(()=>{
    const btn=[...document.querySelectorAll('button')].find(x=>/^Continue/.test((x.innerText||'').trim()));
    if(!btn)return {found:false};
    const r0=btn.getBoundingClientRect();
    let sc=null;for(let p=btn.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);
      if(st.touchAction==='none')return {found:true,top0:r0.top,blocked:'touch-action:none on '+(p.getAttribute('data-ct')||p.tagName)};
      if(/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1){sc=p;break;}}
    const need=Math.max(0,r0.bottom-innerHeight+2);
    let moved=0;if(sc&&need>0){const before=sc.scrollTop;sc.scrollTop=before+need;moved=sc.scrollTop-before;}
    const r=btn.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const hit=(cy>=0&&cy<innerHeight)?document.elementFromPoint(cx,cy):null;
    return {found:true,top0:Math.round(r0.top*100)/100,scroller:sc?(sc.getAttribute('data-ct')||sc.id||sc.tagName.toLowerCase()):null,
      need:Math.round(need*100)/100,moved:Math.round(moved*100)/100,top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100,vh:innerHeight,
      owns:!!hit&&(hit===btn||btn.contains(hit))};});
  L.say(reach.found,g.n+': TC-OC-006e the ONLINE sheet carries its action button, "Continue →" - the denominator for the reachability line below, so a missing button reads red rather than as reachable',reach);
  L.say(reach.found&&!reach.blocked&&reach.top>=0&&reach.bottom<=reach.vh&&reach.owns,
    g.n+': TC-OC-006e "Continue →" is REACHABLE BY A FINGER - it rests at top '+reach.top0+' on a '+reach.vh+'px viewport; its scroller ('+reach.scroller+') was actually scrolled '+reach.moved+'px and the button then sits fully on screen and owns its own centre',reach);
  await b.close();
}

// ── R-OC-2, both directions, at Kunal's geometry ───────────────────────────────────────────────────────────
{
  const b=await L.launch({geo:'kunal730',name:'oc-r2'});await b.open();
  const pick=(t)=>b.page.evaluate((s)=>{const e=[...document.querySelectorAll('span')].find(x=>(x.innerText||'').trim()===s);if(e){e.click();return true;}return false;},t);

  let ok=true;
  try{ await b.home(); await b.tile('Play'); await b.settle(500); await P.tapBtn(b,/^Computer$/,400); }catch(e){ ok=false; }
  const got31=ok?await pick('3+1'):false;
  await b.settle(300);
  const underCpu=got31?await READ(b):null;
  L.say(!!underCpu&&underCpu.selected.length===1&&underCpu.selected[0]==='3+1',
    'TC-OC-007 precondition: 3+1 really is the single selected clock under Computer before the switch - asserted so that TC-OC-008 cannot pass by the selection having been absent all along',underCpu&&underCpu.selected);

  let tapped=true;
  try{ await P.tapBtn(b,/^Online$/,700); }catch(e){ tapped=false; }
  const underOnline=tapped?await READ(b):null;
  // #400 antagonist correction: this assertion's old message claimed the Online pill used to null the clock and
  // that this read 'No limit' on #399. BOTH WRONG, measured. The SHEET's Online button (chess.jsx:4656) never
  // nulled anything - the clock was preserved at #399 too - and on #399 this read [] rather than 'No limit',
  // because with 3+1 set !timeCtrl is false so the null pill is not lit either. It goes red on #399 only because
  // the live row is hidden, i.e. it was TC-OC-001 wearing R-OC-2's label. Kept, honestly titled: it is the
  // end-to-end statement that a chosen clock is still chosen after picking Online, which is what a player cares
  // about however the code gets there. The nulling that R-OC-2 removed lives on the MENU's Online span
  // (chess.jsx:4900), which no assertion in this file reaches - P.tapBtn matches <button> and those are <span>.
  L.say(tapped&&!!underOnline&&underOnline.selected.length===1&&underOnline.selected[0]==='3+1',
    'TC-OC-008 the clock the player chose is STILL CHOSEN after picking Online, end to end from the sheet - exactly one pill selected and it is 3+1. Red on #399 because the live row is hidden there, so this also fails closed if R-OC-1 regresses',underOnline&&underOnline.selected);

  // the other direction: a day limit is meaningless offline and must not follow the player out
  const got3d=await pick('3 days / move');
  await b.settle(250);
  const corrOn=got3d?await READ(b):null;
  L.say(!!corrOn&&corrOn.selected.length===1&&corrOn.selected[0]==='3 days / move',
    'TC-OC-009 precondition: 3 days / move is the single selection while still on Online',corrOn&&corrOn.selected);
  let back=true;
  try{ await P.tapBtn(b,/^Computer$/,700); }catch(e){ back=false; }
  const afterBack=back?await READ(b):null;
  // ── #545 item (8): THE TWO DENOMINATOR SITES DRIVEN WITH THE CONSTRUCTED INPUTS THE JOB ASKED FOR
  // [jobs/three-suite-assertions-read-an-empty-or-constant-denominator-as-a-pass-2026-10-07]. Each control is a
  // COPY of this file with one line changed, run in full against the shipped bundle 049b41dfb6f1:
  //   (a) `const summ=''` - the empty summary: TC-OC-010c and TC-OC-010 both FAIL, no PASS for either (32/2).
  //   (b) o.sheetScroll forced to the DOCUMENT ({isDoc:true}) at each geometry: TC-OC-006c FAILs at all three (31/3).
  //   (c) o.sheetScroll forced to null (no scroller at all): TC-OC-006c becomes three NOT CHECKED notes and scores
  //       no PASS (31 pass, 0 fail - the three are absent from the count, not credited). (c) has red=0, so it is
  //       recorded here in prose and not as a CONTROL-RECORD, which requires red > 0.
  // RE-RUN AT #545 item (39), because that item changed TC-OC-006b's message and added TC-OC-006e, which moved the L.say set
  // the two 777aa06 records were keyed to: (a) 38 pass / 2 fail of 40, red TC-OC-010 and TC-OC-010c; (b) 37 / 3 of 40, red
  // TC-OC-006c at all three - the same red sets as before, at the new total. And a BUNDLE control for TC-OC-006e: trial
  // 64bccfe007b8 (the play-setup overlay's overflowY auto -> hidden, one change) reads 36 / 2, red TC-OC-006e at 320x568 and
  // 375x730 only (at 390x844 the button fits, correctly green), while TC-OC-006b PASSES on it - the vacuity, measured.
  // The CONTROL-RECORD lines are re-added at #545's close-out: control-audit bounds a full-scope record by the count the
  // newest archived log runs, and 544-all.log runs this gate at 34.
  // LANDED AT #546 item (89), not at #545's close-out, which deferred them so the gated tree would not change. 545-all.log
  // runs this gate at 40. The two gate-mutant records are #545's own measurement on 991357c, the commit that last changed this
  // file, so their L.say set is today's. The bundle control was REBUILT at #546, because 64bccfe007b8 did not survive #545's container.
  // CONTROL-RECORD: 991357c 2026-10-29 total=40 red=2 scope=full how=a-copy-with-const-summ-set-to-the-empty-string,the-empty-summary-denominator-TC-OC-010-and-010c-red,measured-at-545-item-39
  // CONTROL-RECORD: 991357c 2026-10-29 total=40 red=3 scope=full how=a-copy-with-o.sheetScroll-forced-to-the-document,TC-OC-006c-red-at-all-three,measured-at-545-item-39
  // CONTROL-RECORD: a35524b 2026-10-30 total=38 red=2 scope=trial:1275f308ef27 how=the play-setup overlay's overflowY auto -> hidden, one change - TC-OC-006e red at 320x568 and 375x730, green at 390x844 where the button fits, and TC-OC-006b still PASSES on it [#546 item (89), rebuild of #545's 64bccfe007b8]
  // ── TC-OC-010 WAS VACUOUS AND THIS IS THE REPLACEMENT. ────────────────────────────────────────────────────
  // The old assertion was `!selected.includes('3 days / move')`, and it PASSED on three bundles that behave three
  // different ways: #399 (no fix), the menu-only #400 (fix on the wrong call site) and the fully fixed build. It
  // could not fail, because under Computer that pill IS NOT RENDERED - so absence satisfied it, not clearing.
  // Fourth costume of CLAUDE.md's containment trap: the thing being detected is excused by the mechanism
  // asserting over it. Found by the antagonist pass, which ran the designed control I had not.
  //
  // What discriminates is the app's OWN summary line under the Start button, because it prints the clock whether
  // or not a pill for it exists. On the unfixed builds it reads 'vs Computer · White · 3 days / move' with ZERO
  // pills selected; fixed, 'vs Computer · White · No clock' with exactly one. Both halves are asserted: the
  // summary must not advertise a per-move limit off-line, AND the selection must not silently become nothing.
  const summ=(afterBack&&afterBack.summary||[]).join(' | ');
  // ── THE DENOMINATOR, IN ITS OWN L.say, BECAUSE A NEGATED REGEX IS TRUE OVER NOTHING [#544 item (31)].
  // `summary` is selected at the top of this file by a middot test plus a 90-character cap, so dropping the
  // middot from the copy or pushing the line past 90 characters empties it - and then summ is '' and
  // `!/\/ move/.test('')` PASSES, loudest exactly when the readout this assertion exists to watch has gone.
  // The job calls that out by name and it is the third of its three live sites. REPORTED, NEVER CREDITED: the
  // emptiness is asserted here so a red says WHICH thing broke, rather than letting the next line go green
  // over a string nobody found.
  L.say(back&&!!afterBack&&summ.length>0,
    'TC-OC-010c DENOMINATOR: the app\'s own summary line under the Start button was FOUND, so the assertion below is about what it says and not about its absence - measured "'+summ+'" ('+summ.length+' chars). An empty string satisfies a negated regex, which is how this site could report a correspondence clock on a computer game as clean',{summary:afterBack&&afterBack.summary,len:summ.length});
  L.say(back&&!!afterBack&&summ.length>0&&!/\/ move/.test(summ),
    'TC-OC-010 R-OC-2 the other way: after switching from Online to Computer the app\'s own summary line does NOT advertise a day-per-move limit - measured "'+summ+'". On #399 and on the menu-only build this read "vs Computer · White · 3 days / move", a correspondence clock on a computer game, and the same string reached a live Pass & Play board',{summary:afterBack&&afterBack.summary});
  L.say(back&&!!afterBack&&afterBack.selected.length===1,
    'TC-OC-010b and the switch leaves EXACTLY ONE pill selected rather than none - 0 selected is how the stale corr clock hid: it was still set, and no pill for it renders off-line, so the screen showed no selection at all while the summary printed one',{selected:afterBack&&afterBack.selected});
  await b.close();
}

},'ONLINE-CLOCKS');
