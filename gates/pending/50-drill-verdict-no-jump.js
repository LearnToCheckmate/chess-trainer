// regress/50-drill-verdict-no-jump.js  jobs/board-jumps-on-drill-verdict (P0, found by Kunal on his phone:
// "Board jumps when the message in red comes up."). Implements TC-R15 (story US-R12; ids continue the repo id space per prompts/test-authoring step 6). Authored by the
// test-authoring lane 2026-09-22; handed to build as a patch, never committed by that lane.
//
// THE DEFECT. The puzzle screen has TWO renderers for the same verdict box. The browse/training view reserves
// its space - height:(vp.h<820?30:74), #364 - and gate 39 already proves the board does not move there. The
// ONLINE view, which is also the view the "Practice your mistakes" and "Your brilliant moves" drills load into
// (startMistakes/startBrilliant -> loadExternal -> pzView 'online'), uses maxHeight:74. maxHeight collapses to
// 0 while there is no message and grows when the verdict arrives, so the board is pushed down (and, because the
// fit loop then trims it, shrunk). Measured on #416 at 375x730: board top 198 -> 245.9, width 339 -> 291.
//
// THE SHAPE THIS ADDS. A jump is not a property of one state, it is a DIFFERENCE between two, so every input
// here is a PAIR: board rect BEFORE the move, board rect AFTER the red ✗ verdict has rendered, top/left/width delta
// asserted 0 (<0.6px, the house tolerance), at seven geometries: 7 pairs, 14 measured states. The 30-vs-74 reserve
// is chosen by vp.h<820: 568, 640, 667, 730 run the 30 branch; 844, 896, 956 run the 74 branch. Both run.
// Also asserted per pair: the drill opened with no verdict, and the verdict actually rendered (a pair where nothing
// appeared proves nothing).
//
// NOT IN THIS GATE, AND WHY (authoring run 2026-09-22): (a) the SOLVED path - with the reserve fixed the board still
// moves on a correct move (320x568 top +14.5, 390x844 +26, 375x730 width 325 -> 375) because the Hint/Show/Reset
// row collapses (pz-bottom 104 -> 52) and the centring spacers / fit loop re-lay the stack. A different cause; filed
// as its own job (jobs/drill-solved-board-jumps-bottom-row-collapse) with its case, not asserted green here.
// (b) the brilliant drill - seeding ct_mybrilliancies did not surface the "Your brilliant moves" entry in this run;
// not reached.
//
// MEASUREMENT RULES OBSERVED: the rect is read by b.board() (the painted 8-column grid) before any tap; the move is
// b.move (piece tap then target tap, mouse at measured centres, no locator auto-scroll); the bundle stamp is
// printed by lib.serve and read back from the page before the first measurement.
//
// NEGATIVE CONTROLS (see docs/board-jumps-on-drill-verdict-lane): NC1 the fix reverted (maxHeight:74) - the
// shipped #416 tree, red at every pair; NC2 reserve 0 (height:0) - red; NC3 reserve only the tall branch
// (height:(vp.h<820?0:74)) - red at the four short geometries only; NC4 the verdict never set on a wrong move -
// red on the "verdict rendered" assertion.
// ── #500 LANDED THIS GATE WITH THE FIX IT GUARDS. THE BANNER THAT STOOD HERE IS NOW FALSE AND IS WITHDRAWN. ───
// It read: "#428 STOOD DOWN. NOTHING BELOW IS ON main, AND THIS GATE IS RED ON main BY DESIGN. DO NOT LAND IT
// ALONE." Every word of that was correct for 16 days and it is quoted rather than deleted, because the next
// reader needs to see that it was overtaken rather than ignored [R18]. WHAT CHANGED: the condition it was
// waiting on - gate-manifest.tsv row 78's "Do NOT flip this to required before that question is answered",
// the question being the board-height decision - WAS ANSWERED BY KUNAL on 2026-10-04 (questions/q-drill-third-
// line, choice `fixed-reserve-and-scroll`). So this gate is no longer red on main by design; it is red on main
// because main still carries the defect, and #500 lands the fix in the same commit. The manifest row is
// promoted from `absent` to `required` in that same commit, which takes the suite's known-absent count from 3
// to 2.
// WHAT #500 MEASURED, so nobody re-derives it: on main's bundle c37f70f2e989 this gate reads 84 pass / 14 fail
// and every one of the 14 is the no-jump pair - at 375x730 the board goes 339 -> 291 when the ✗ verdict lands
// and 339 -> 265 when the hint does. On the shipped fix it reads 98 pass / 0 fail. THE HINT JUMP IS THE BIGGER
// ONE (+74 against the verdict's +48) and the original gate did not have a hint pair at all; it was added by
// burst agent 15 on 2026-10-03, could not be pushed, and survived only as a field on
// jobs/gate-50-hint-pair-is-written-and-measured-and-its-only-copy-is-an-unpushed-commit-2026-10-03. This file
// is that version plus #500's three readability assertions.
// THE TRAP BELOW IS STILL REAL AND STILL WORTH READING: all fourteen no-jump states put the same message in
// the box, so a reserved height and a capped height are indistinguishable once a message is up, and BOTH of
// #428's candidates scored 35/35 on the version of this gate that existed then. #500's additions are what
// finally separate them - see the #500 block above `readable` - and gate 51 remains the other half of the pair.
// #428 built the fix, proved this gate red on main (28 pass / 7 fail) and green on the fix (35/35 at seven
// geometries), and then did NOT push, because the fix introduces a SECOND user-visible defect. Measured, with a
// control across all three bundles: at 320x568 a constant 74px reserve moves the drill's Reset button to y 512..556,
// exactly under the position:fixed tab bar, so elementFromPoint at its centre returns the tab bar and a TAP ON RESET
// FIRES A TAB AND LEAVES THE DRILL. Live main: Reset at 438..482, hit-tests to itself, 6/6 green. And the board at
// REST (not post-verdict, which is the comparison #428 first published) goes 276 -> 200 at 375x667 and 265 -> 192 at
// 360x640 - onto the 192px floor, -27.5%.
//
// THE TRAP THIS GATE ITSELF SETS, and it is the reason to read this before trusting a green: ALL FOURTEEN of its
// states put the SAME 36-character one-line verdict in the box, so once the message is up a reserved height and a
// capped height are INDISTINGUISHABLE and the whole 35/35 comes from the REST state. Both candidate fixes scored
// 35/35 here and only one of them was shippable. A green from this gate is necessary and nowhere near sufficient:
// run gate 51 (truncation) and a Reset hit-test at 320x568 alongside it.
//
// The decision is routed as jobs/drill-verdict-reserve-costs-more-board-than-a-short-phone-has-2026-09-28. The fix
// that costs no board is Kunal's own answer of 2026-09-22: once solved, the goal card yields its 71px.
//
// ── THE CANDIDATE THIS GATE WAS PROVEN AGAINST (on the branch, NOT on main) ────────────────────────────────────
// chess.jsx:6293  maxHeight:74 -> height:74.  A CONSTANT 74 AT EVERY GEOMETRY, and deliberately
// NOT the height:(vp.h<820?30:74) branch that the sibling renderer at :6221 uses and that this job's brief
// prescribed. Both pass THIS gate at 35/35 - the board stops moving either way - so this gate alone cannot tell
// you which fix is on the tree, and that is exactly why the note is here rather than in a commit message.
//
// The 30px branch was built, measured and REJECTED at #428: it carries whiteSpace:nowrap + textOverflow:ellipsis,
// and this renderer has carried the two-clause drill EXPLANATION since #426, so the branch truncates it to a single
// line. gates/regress/51-drill-explain-why.js B6 goes RED on it at 320x568, 360x640, 375x667 and 375x730 -
// scrollWidth 455 against clientWidth 362 at Kunal's own geometry. #364 reasoned about that 30 for a ONE-LINE
// verdict on the OTHER renderer, where it is still correct; it does not transfer here.
//
// SO: 50 green + 51 green is the pair that pins this fix. If you change :6293, run BOTH. Rejected candidate bundle
// md5 6b7dbe7bccec; shipped bundle md5 7515c47ee8ad (as #992 locally, pushed as #428).
//
// COST, MEASURED AND NOT HIDDEN: reserving 74px always costs board size at rest. At 375x730 the board is 281 wide
// after this fix; on the pre-fix tree it is 339 before the first move and 291 once the verdict lands. Recorded as an
// amber default (flags/amber-428-drill-verdict-reserve-costs-board-width-at-rest); the width is meant to come back
// via Kunal's own answer for this screen (once solved, the goal card yields its 71px), which is queued separately.

// ── 2026-10-03, process-burst agent (runledger process-burst__1791057642923) ─────────────────────────────────
// TWO THINGS WERE ADDED HERE AND NEITHER OF THEM LANDS THIS GATE ON main.
//
// (1) THE RED ON main IS NOW MEASURED, NOT INFERRED. jobs/gate-50-exists-on-one-branch-only-2026-09-28 has
// carried "whether the gate would in fact go red on main - I did not run it" under notChecked for eleven days.
// Run on the #473 bundle on main (app.js md5 96c21b94df25c791fb4e5edddbcba717, page stamp
// "#473 - 2026-10-03 12:55 ET"): 28 PASS / 7 FAIL, exactly one fail per geometry, all of them the no-jump
// assertion. Board top delta, measured: 320x568 +47.8 w 0; 360x640 +47.9 w -48; 375x667 +47.9 w -48;
// 375x730 (Kunal) +53.9 w -60; 390x844 +23.9 w 0; 414x896 +23.9 w 0; 440x956 +23.9 w 0. So the defect this gate
// reproduces is LIVE on main at all seven geometries and the gate is red on main as the #428 note says.
// NOTE FOR WHOEVER RECONCILES NUMBERS [R18, R45(1)]: the figure in circulation for Kunal's geometry is
// "the drill verdict shrinks the board 70.00px at 375x730" (#457 antagonist B). This run measures, on the #473
// bundle, top +53.9 and width -60 at that geometry. Those are different bundles AND different quantities
// (top displacement vs width loss), so this is not filed as a contradiction; it IS filed as a warning that the
// 70.00 has been repeated without a bundle attached to it.
//
// (2) THE HINT PAIR, which is jobs/gate-50-never-enters-the-state-where-the-reserve-matters-2026-09-28's theFix
// verbatim: "tap the hint before the move, assert the board does not move AND that the hint's painted character
// count equals its source length (a Range walk over the text node)". That job's point is that all fourteen of
// this gate's original states put the SAME 36-character one-line verdict in the box, so once the message is up a
// reserved height and a capped height are INDISTINGUISHABLE - both #428 candidates scored 35/35 and only one was
// shippable. The hint is the state where they differ, because the hint sentence is long enough to overflow the
// box. The pair seeds a 99-character hint on the card (HINT below) so the state is entered deterministically
// rather than depending on whatever sentence the app would generate, and a guard asserts the fixture is still
// long enough to be the discriminating input if anybody shortens it.
//
// DETERMINISM, THE R36 ADMISSION TEST, WHICH THIS GATE HAS NEVER HAD. Three consecutive runs on the same tree
// and the same bundle: 57 pass / 20 fail every time, the SAME twenty assertions, and the Range walk returned the
// identical painted counts (74 / 85 / 90 / 90 / 95 / 95 / 102 of 102, in geometry order) on all three. So it is
// deterministic. It is NOT fast: 14 browser launches, about 4.5 minutes wall clock per run, which is the second
// R36 condition and the one a reviewer should weigh before admitting it - the verdict pairs and the hint pairs
// are separable and could be admitted as two gates if the cost matters.
// The twenty fails on main are 7 verdict-jump + 7 hint-jump + 6 hint-clipping (440x956 paints all 102).
//
// STILL NOT LANDED, AND DELIBERATELY SO. gates/gate-manifest.tsv row 78 records this file as absent with
// "Do NOT flip this to required before that question is answered", the question being the board-height decision
// in jobs/drill-verdict-reserve-costs-more-board-than-a-short-phone-has-2026-09-28 /
// jobs/route-to-kunal-the-drill-verdicts-third-line-costs-22px-of-board-2026-10-02, which has no Desk item.
// Adding this file to gates/regress/ on main turns the suite red for every other lane, so this version lives on
// claude/burst-art-gates-regress-50-drill-verdict-no-jump-js and the integration run MUST NOT take it to main
// until that decision lands. The improvement is to the gate, not to its admission.

'use strict';
const L=require('../lib');
// One seeded card per drill. The position is White to move with Qxf7# available (uci f3f7). The wrong move a2a3
// is legal and not the solution. Seeded under the app's own key (chess.jsx: ct_mymistakes).
const FEN='r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
// The hint is seeded, and its length is the point: 99 characters, long enough that a 74px box with a cap and a
// 74px box with a reserve paint DIFFERENT amounts of it. A short hint would make the hint pair as blind as the
// verdict pairs already are.
const HINT='Look for a check the king cannot answer: your queen and bishop already aim at the same weak square.';
const CARD=(label)=>[{fen:FEN,uci:'f3f7',label,ts:1,played:'Qe2',hint:HINT}];
const KINDS=[
  {kind:'mistake',  key:'ct_mymistakes',     btn:/^Practice your mistakes/},
];
const GEOS=[
  {w:320,h:568,label:'320x568'},{w:360,h:640,label:'360x640'},{w:375,h:667,label:'375x667'},
  {w:375,h:730,label:'375x730 (Kunal)'},{w:390,h:844,label:'390x844'},{w:414,h:896,label:'414x896'},{w:440,h:956,label:'440x956'},
];
const verdictText=(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);const d=[...document.querySelectorAll('div')].filter(x=>{const t=(x.innerText||'').trim();const q=x.getBoundingClientRect();return r.test(t)&&q.height>0;});return d.length?(d[d.length-1].innerText||'').trim().slice(0,60):null;},[re.source,re.flags]);
// The verdict must be SEEN, not merely present: its box intersected with every clipping ancestor (overflow not
// visible) must leave at least 18px of height (one 14px line at lineHeight 1.3), and elementFromPoint at the centre
// of that visible area must land inside the verdict (measurement rule 1: hit-test, do not trust layout). Without this,
// a reserve of 0px passes the no-jump assertion by hiding the verdict (negative control NC2, green before this line).
// #500, AND KNOW THIS BEFORE YOU TRUST A GREEN FROM IT: this hit test asks whether elementFromPoint at the
// verdict's centre lands inside the verdict, and AN ELEMENT GIVEN position:absolute OVER EVERYTHING ELSE PASSES
// IT BY CONSTRUCTION. #500's fix did exactly that and this assertion stayed green while the verdict was being
// painted on top of the goal sentence and neither was readable. It is the #394 trap in a new costume - the check
// and the thing being checked were the same object - and it is the reason 98/0 coexisted with an unreadable
// screen. The assertion that WOULD have caught it is an ink delta, not a hit test: make the goal title's text
// colour transparent and require that no bright pixel in its own band changes. Antagonist A demonstrated it at
// 26-74% of the title band's ink belonging to the goal card and showing through the message.
const verdictSeen=(b)=>b.page.evaluate(()=>{
  const d=[...document.querySelectorAll('div')].filter(x=>/^✗/.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>0);
  const el=d[d.length-1];if(!el)return {ok:false,why:'no ✗ element'};
  let r=el.getBoundingClientRect();let top=r.top,bot=r.bottom,left=r.left,right=r.right;
  for(let a=el.parentElement;a;a=a.parentElement){const st=getComputedStyle(a);if(st.overflowY!=='visible'||st.overflowX!=='visible'){const q=a.getBoundingClientRect();top=Math.max(top,q.top);bot=Math.min(bot,q.bottom);left=Math.max(left,q.left);right=Math.min(right,q.right);}}
  top=Math.max(top,0);bot=Math.min(bot,innerHeight);
  const vis=Math.round((bot-top)*10)/10;if(vis<18||right-left<40)return {ok:false,vis,why:'clipped'};
  const hit=document.elementFromPoint((left+right)/2,(top+bot)/2);
  return {ok:!!hit&&(el===hit||el.contains(hit)),vis,hit:hit?(hit.tagName+' '+(hit.innerText||'').slice(0,20)):null};
});

// THE RANGE WALK. "Painted" is not "present": a character inside a box that clips is in the DOM, has a rect, and
// is invisible. So every character of the hint gets its own Range rect, and is counted painted only if that rect
// lies inside the intersection of every clipping ancestor and the viewport (0.5px tolerance, the house figure).
// Returns {src, painted, text, clip} so a failure prints how many characters were lost and where the cut was.
const hintPainted=(b)=>b.page.evaluate(()=>{
  const top=document.querySelector('[data-ct="pz-top"]')||document.body;
  const leaves=[...top.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^\u{1F4A1}/u.test((e.innerText||'').trim()));
  const el=leaves[leaves.length-1];
  if(!el)return {ok:false,why:'no hint element under pz-top'};
  let cl={top:0,bottom:innerHeight,left:0,right:innerWidth};
  for(let a=el;a;a=a.parentElement){const st=getComputedStyle(a);if(st.overflowY!=='visible'||st.overflowX!=='visible'){const q=a.getBoundingClientRect();
    cl.top=Math.max(cl.top,q.top);cl.bottom=Math.min(cl.bottom,q.bottom);cl.left=Math.max(cl.left,q.left);cl.right=Math.min(cl.right,q.right);}}
  const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let full='',painted=0;const nodes=[];
  while(walk.nextNode())nodes.push(walk.currentNode);
  for(const n of nodes){const t=n.nodeValue||'';full+=t;
    for(let i=0;i<t.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const q=r.getBoundingClientRect();
      if(q.width===0&&q.height===0)continue;
      if(q.top>=cl.top-0.5&&q.bottom<=cl.bottom+0.5&&q.left>=cl.left-0.5&&q.right<=cl.right+0.5)painted++;}}
  const box=el.getBoundingClientRect();
  return {ok:true,text:full,srcLen:full.length,painted,clip:{top:Math.round(cl.top),bottom:Math.round(cl.bottom)},
          box:{top:Math.round(box.top*10)/10,h:Math.round(box.height*10)/10},
          outer:(()=>{const o=el.closest('[style*="overflow"]')||el.parentElement;return o?{sh:o.scrollHeight,ch:o.clientHeight}:null;})()};
});

// ── #500. READABILITY IS "REACHABLE", NOT "ALL PAINTED AT ONCE", AND THAT IS NOT A WEAKENING. ──────────────────
// The assertion this replaces was `painted === srcLen`: every character of the hint visible simultaneously. It can
// ONLY be satisfied by a box that GROWS to its content (which is this gate's own defect) or by a constant box at
// least as tall as the tallest message (91px for the seeded hint, which #428 measured as burying the drill's Reset
// button under the tab bar at 320x568). So it was in direct conflict with the fix, and with Kunal's 2026-10-04
// ruling on this exact box: "Don't change the size just allow the player to scroll through the text. Is that
// possible?" It is - overflowY:auto was already on the box. CLAUDE.md's own rule says the same thing in general
// terms: "below the fold is not unreachable ... measured by ACTUALLY SCROLLING that ancestor and re-reading the
// rect", and "vertical spill inside a scroller is fine".
// SO ONE ASSERTION BECOMES THREE. THE WORD "STRICTLY" WAS IN THIS LINE AND IS WITHDRAWN [R18, #500's
// antagonist A, which measured it rather than arguing it]. THE TWO SETS ARE INCOMPARABLE, and here are the
// reds that show it, per bundle: main c37f70f2e989 - old 1 red (320x568), new 0; candidate a1815520dede -
// old 4 red, new 0; a 30px reserve eab3bcbe0f0d - old 7 red, new 14. So the new set is STRONGER against an
// undersized reserve and WEAKER against clipping-without-scrolling, and neither contains the other. The
// honest statement is that the old assertion was retired on an explicit ruling of Kunal's and replaced with
// three that do different work - not that nothing was given up. WHAT WAS GIVEN UP, with the number, because
// a trade stated without its number is not stated: at Kunal's own 375x730 the whole 102-character hint is on
// screen at rest on main (102 of 102 painted, and its 91-v-74 overflow removes no ink - checked) and 36 of
// 102 on the reserved candidate, so he would see 35% of it and scroll for the rest. The three assertions are:
//   (a) ONE FULL LINE WITHOUT SCROLLING. Computed from the box's OWN lineHeight, padding and borders rather than
//       hard-coded, so it tracks the type. This is the assertion that rejects a 30px reserve, which paints ZERO
//       characters here (measured: 30 - 24 padding - 2 border = 4px of content) and which this job's own theFix
//       told the build to copy from the sibling renderer. The old assertion could not see that at all: 0 of 102
//       and 102 of 102 were both simply "not equal", one a disaster and one a pass.
//   (b) THE OVERFLOW IS A REAL SCROLLER. scrollHeight > clientHeight must come with a computed overflow-y of auto
//       or scroll - a clipped box with hidden overflow draws no ellipsis and loses the text silently (#387/#396).
//   (c) THE TAIL IS ACTUALLY REACHED. The box is scrolled to its own bottom and the characters are re-counted, and
//       the LAST character of the message must be painted there. Scripted scrolling of an overflow:hidden box
//       would succeed where a finger fails, which is why (b) is asserted separately and first.
// WHAT THESE THREE DO NOT DO: they do not prove the fix. They are green on main as well (main's box is 74 tall and
// scrolls), and that is correct - the DISCRIMINATOR against main is the no-jump pair below, which is red at all
// seven geometries on main and green on the fix. Read them as the guard that stopped this build shipping a 30px
// reserve, not as evidence for 48.
const readableVerdict=(b)=>_readable(b,'\u2717');
const readable=(b)=>_readable(b,'\u{1F4A1}');
const _readable=(b,lead)=>b.page.evaluate((lead)=>{
  const top=document.querySelector('[data-ct="pz-top"]')||document.body;
  const leaves=[...top.querySelectorAll('div,span')].filter(e=>e.children.length===0&&(e.innerText||'').trim().startsWith(lead));
  const el=leaves[leaves.length-1];
  if(!el)return {ok:false,why:'no hint element under pz-top'};
  // the nearest ancestor that actually clips vertically - the reserved box
  let box=null;for(let a=el.parentElement;a;a=a.parentElement){const st=getComputedStyle(a);
    if(st.overflowY==='auto'||st.overflowY==='scroll'||st.overflowY==='hidden'){box=a;break;}}
  if(!box)return {ok:false,why:'no clipping ancestor - the box no longer reserves or clips anything'};
  const bs=getComputedStyle(box), es=getComputedStyle(el);
  const lh=parseFloat(es.lineHeight)||parseFloat(es.fontSize)*1.5;
  const need=Math.ceil(lh+parseFloat(es.paddingTop)+parseFloat(es.paddingBottom)
                       +parseFloat(es.borderTopWidth)+parseFloat(es.borderBottomWidth));
  const count=()=>{
    let cl={top:0,bottom:innerHeight,left:0,right:innerWidth};
    for(let a=el;a;a=a.parentElement){const st=getComputedStyle(a);if(st.overflowY!=='visible'||st.overflowX!=='visible'){const q=a.getBoundingClientRect();
      cl.top=Math.max(cl.top,q.top);cl.bottom=Math.min(cl.bottom,q.bottom);cl.left=Math.max(cl.left,q.left);cl.right=Math.min(cl.right,q.right);}}
    const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const ns=[];let full='';
    while(w.nextNode())ns.push(w.currentNode);
    let painted=0,lastPainted=false,idx=0,total=0;
    for(const n of ns){const t=n.nodeValue||'';full+=t;total+=t.length;}
    for(const n of ns){const t=n.nodeValue||'';
      for(let i=0;i<t.length;i++){idx++;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const q=r.getBoundingClientRect();
        if(q.width===0&&q.height===0)continue;
        const inside=q.top>=cl.top-0.5&&q.bottom<=cl.bottom+0.5&&q.left>=cl.left-0.5&&q.right<=cl.right+0.5;
        if(inside){painted++;if(idx===total)lastPainted=true;}}}
    return {painted,full,lastPainted};
  };
  const atRest=count();
  const overflows=box.scrollHeight>box.clientHeight+1;
  const isScroller=bs.overflowY==='auto'||bs.overflowY==='scroll';
  box.scrollTop=box.scrollHeight;            // ACTUALLY scroll it, then re-read
  const atBottom=count();
  box.scrollTop=0;
  return {ok:true,srcLen:atRest.full.length,paintedAtRest:atRest.painted,
          ch:box.clientHeight,sh:box.scrollHeight,need,overflows,isScroller,overflowY:bs.overflowY,
          tailReached:overflows?atBottom.lastPainted:atRest.lastPainted,
          paintedAtBottom:atBottom.painted,
          text:atRest.full.replace(/\s+/g,' ').slice(0,56)};
},lead);
const same=(a,b)=>!!a&&!!b&&Math.abs(a.y-b.y)<0.6&&Math.abs(a.w-b.w)<0.6&&Math.abs(a.x-b.x)<0.6;
const fmt=(r)=>r?('top '+Math.round(r.y*10)/10+' w '+Math.round(r.w*10)/10):'no board';

L.run(async()=>{
  for(const g of GEOS){
    for(const K of KINDS){
      for(const path of ['wrong','hint']){
        const tag=g.label+' '+K.kind+' '+path;
        const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'dv-'+g.w+'x'+g.h+'-'+K.kind+'-'+path,store:{[K.key]:CARD(K.kind==='brilliant'?'Brilliant':'Mistake')}});
        await b.open();
        if(path==='wrong'&&K.kind==='mistake'&&g.w===375&&g.h===730)L.note('page stamp '+(await b.stamp()));
        await b.tapCt('tile-ic-analyze');await b.settle(500);   // data-ct tile-ic-analyze (chess.jsx); the tile's text label is absent at 320 wide
        await b.tapText(K.btn);await b.settle(900);
        const before=await b.board();
        const pre=await verdictText(b,/^(✗|🎉)/);
        L.say(!!before&&pre===null,tag+': the drill opened on a board with no verdict yet',{board:fmt(before),verdict:pre});
        if(path==='hint'){
          // THE DISCRIMINATING STATE. No move is played: the hint button is pressed, which is the only way a
          // player reaches o.hint (gate 51 established that; pz-top's innerText is the goal line, not the hint).
          let reached=true;
          try{await b.tapText(/^\u{1F4A1} Hint$/u,{wait:900});}catch(e){reached=false;L.note(tag+': hint button not reached - '+e.message.slice(0,80));}
          await b.settle(700);
          const after=await b.board();
          const hp=await hintPainted(b);
          L.say(reached&&hp.ok,tag+': the hint button was reachable and put a hint line on screen',hp.ok?{text:String(hp.text).slice(0,60),srcLen:hp.srcLen}:hp);
          L.say(hp.ok&&hp.srcLen>=90,tag+': the hint on screen is still long enough to discriminate a reserve from a cap (>=90 chars; the fixture is '+HINT.length+')',hp.ok?{srcLen:hp.srcLen}:hp);
          const rd=await readable(b);
          L.say(rd.ok&&rd.ch>=rd.need,tag+': the verdict box holds ONE FULL LINE of its own type without scrolling (clientHeight '+(rd.ok?rd.ch:'n/a')+' >= '+(rd.ok?rd.need:'n/a')+' required by its own lineHeight+padding+border) [#500 (a): this is what rejects a 30px reserve, which paints 0 characters]',rd);
          L.say(rd.ok&&(!rd.overflows||rd.isScroller),tag+': where the hint overflows the reserve, the box is a REAL SCROLLER and not a silent clip (overflow-y '+(rd.ok?rd.overflowY:'n/a')+', sh '+(rd.ok?rd.sh:'n/a')+' v ch '+(rd.ok?rd.ch:'n/a')+') [#500 (b)]',rd);
          L.say(rd.ok&&rd.tailReached,tag+': the END of the hint is REACHED after actually scrolling the box to its bottom ('+(rd.ok?(rd.paintedAtRest+' of '+rd.srcLen+' painted at rest, '+rd.paintedAtBottom+' at the bottom'):'n/a')+') [#500 (c), CLAUDE.md: below the fold is not unreachable - scroll it and re-read]',rd);
          L.say(same(before,after),tag+': the board did not move when the hint appeared ('+fmt(before)+' -> '+fmt(after)+')',
                before&&after?{dTop:Math.round((after.y-before.y)*10)/10,dW:Math.round((after.w-before.w)*10)/10}:null);
        }else{
        // #500 / antagonist A: THIS LINE USED TO READ `if(path==='wrong')...;else await b.move('f3','f7',900);`
        // and that else was DEAD CODE - this block is already inside the `else` of `if(path==='hint')`, and
        // GEOS x KINDS x path has only 'wrong' and 'hint', so `path` cannot be anything but 'wrong' here. The
        // consequence is the headline limit of this gate and it is now stated where the code is rather than
        // only in the header: THE SOLVE IS NEVER PLAYED, AT ANY GEOMETRY. That matters more since #500 than it
        // did before, because the solved state is where the absolute-overlay half of the fix is the only thing
        // running - and it is exactly where #500's two antagonists found the explanation painted on top of the
        // goal sentence while this gate read 98 pass / 0 fail. A third path ('solve') belongs here and is on
        // jobs/500-the-drill-reserve-is-measured-and-held-on-an-unreadable-solved-overlay-2026-10-08.
        await b.move('a2','a3',900);
        await b.settle(700);
        const v=await verdictText(b,path==='wrong'?/^✗/:/^🎉/);
        const after=await b.board();
        L.say(!!v,tag+': the verdict rendered ('+(path==='wrong'?'✗ line':'🎉 line')+')',v);
        if(path==='wrong'){const vs=await verdictSeen(b);L.say(vs.ok,tag+': the verdict is visible and on top (>=18px unclipped, hit-test lands on it)',vs);
          // #500: THE MESSAGE KUNAL ACTUALLY REPORTED. The red line is 36 characters and must need NO scroll at
          // any geometry - a reserve that makes the player scroll to read 'a3 isn't it' would be a worse defect
          // than the jump. The gate had no assertion over this state's TEXT at all before #500.
          const rv=await readableVerdict(b);
          L.say(rv.ok&&rv.paintedAtRest===rv.srcLen&&!rv.overflows,tag+': the red verdict is FULLY painted with no scroll needed ('+(rv.ok?rv.paintedAtRest+' of '+rv.srcLen+', sh '+rv.sh+' v ch '+rv.ch:'n/a')+')',rv);}
        L.say(same(before,after),tag+': the board did not move when the verdict appeared ('+fmt(before)+' -> '+fmt(after)+')',
              before&&after?{dTop:Math.round((after.y-before.y)*10)/10,dW:Math.round((after.w-before.w)*10)/10}:null);
        }
        const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
        L.say(bad.length===0,tag+': no app error beyond the allowed engine trap',bad.slice(0,2));
        await b.close();
      }
    }
  }
},'50-drill-verdict-no-jump');
