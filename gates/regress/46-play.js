// RENUMBERED BY THE BUILD SESSION, 2026-09-14. This file was authored as 44-play.js. The build session had
// already committed and pushed gates/regress/43-tcrl-analysis.js (TC-RL batch 1) the same afternoon,
// so 43 AND 44 were both spoken for by the time these two lanes arrived. Theirs moved rather than mine
// because 43-tcrl-analysis is referenced by name in a pushed commit, in gates/logs/, in RUN-LOG.md and
// in claude/stories/README.md, and renaming it would rewrite the record of what was measured and when.
// Nothing else changed: gates.sh runs gates/regress/*.js in NAME order, so the number is ordering only.
//
// regress/46-play.js  (authored as 44-play.js)  THE PLAY SCREEN IN A LIVE GAME. Authored 2026-09-14. Every number below was MEASURED
// on the running build - first on a local build of chess.jsx at commit 06502c7, then re-run and confirmed
// identical against the committed bundle #386 - 2026-09-14 10:17 ET. 128 PASS, 0 FAIL on both. Nothing here
// is inferred from source; where a line cites chess.jsx it is citing the reason, not the evidence.
//
// WHY THIS FILE EXISTS. Play is the screen Kunal is in every session and until today it had ZERO user stories
// and ZERO test cases. The antagonist pass recorded in gate 34's header found NO existing assertion that fails
// on a live-play change: 13-play-after-moves guards the board's SIZE across four plies, 10-gameover guards it
// across a mate, 34-takeback guards one sheet row. Nothing guarded the control row, the preview, the hint, the
// flip, the clock, the status line or what the screen becomes when the game ends. This gate is that guard.
//
// WHAT IT GUARDS (US-PL-01 … US-PL-10 / TC-PL-001 … TC-PL-030, claude/stories/PLAY-LANE-2026-09-14.md)
//   1  the board is a PINNED size per geometry in a live game, and nothing scrolls on either axis
//   2  the two player bars are the board's width and carry the ⌂ and ☰ chrome
//   3  the control row is exactly Moves Back Forward Hint Flip More, 51 tall, fully inside the viewport
//   4  Moves toggles the list's VISIBILITY and the board does not move (the #373 rule)
//   5  Back/Forward step the painted position; Forward is dead at the live head, Back at move 0
//   6  a board tap while previewing returns to live and plays NO move
//   7  Hint paints exactly two squares and clears on the next move, without moving the board
//   8  Flip turns the board and swaps the bars, without moving the board
//   9  a clock counts down the side to move only, and not before the first move
//  10  at game over the row becomes Moves Back Forward Review Rematch More, the result card shows, fades at
//      2600ms and UNMOUNTS at 3300ms (chess.jsx:3333) - there is no "8s fade" and block 11b says why,
//      Resign leaves the sheet, and the board is the same PINNED size it was mid-game
//
// PINNED, NOT SELF-COMPARED. Every size below is the number measured for that geometry, in the spirit of the
// #381 note in 10-gameover.js: a gate that compares a value only against itself is true of a board that has
// been the wrong size since before its first sample. If a deliberate change moves one of these, move it here
// with the change - never re-pin it to whatever the build now happens to produce.
//
// THREE MEASUREMENT RULES OBEYED HERE, because breaking them produced three false findings in one night:
//   - #root carries overflow-y:auto by design, so document.scrollingElement never scrolls in this app. Reach is
//     measured with L.over() (bottom-most laid-out child of #root vs the viewport), never docScrollY.
//   - getBoundingClientRect() includes transforms, and every piece sits in scale(1.06). Nothing here measures a
//     piece box; the board is the CSS grid (L.board()) and the pieces are counted, not measured.
//   - locator.click() auto-scrolls its target into view, so a control a thumb cannot reach passes for the
//     harness. Every control-row rect below is asserted BEFORE anything is clicked.
//
// NUMBERING: 40 was NOT free (40-reachability.js). 43 was taken by the Play SETUP lane, which published
// gates/regress/43-play-setup.js the same afternoon and got there first, so this file is 44. The two lanes do
// not overlap: 43 covers the New Game sheet up to "Start game"; 44 starts the moment a game is running.
//
// NEGATIVE CONTROLS. A green that has never been disproved is worth nothing, and two gates were caught blind
// that way. Four one-line edits were applied to a SCRATCH copy of chess.jsx, built to a trial bundle outside the
// repo and run through CT_APP; chess.jsx was restored before each run and the repo is untouched. All four went
// red, each on the assertions it should and on no others:
//   NC1  _CBtn  padding:'7px 2px' -> '3px 2px'
//        -> "every control button is 51 tall" reads 43, AND the board grows 288 -> 298, so the PINNED board
//           assertion goes red too. This is the #381 lesson exactly: 8px off a button silently resizes the
//           board, and only a pinned number sees it.
//   NC2  const _pLive=(...) -> const _pLive=false      (un-reserves the moves panel: the #373 regression)
//        -> "Moves toggles VISIBILITY" reads null (the row unmounted) and the board jumps top 66.8 -> 103
//           and collapses 288 -> 192, the pre-#371 number.
//   NC3  onPtrDown  pvIdxRef.current!=null -> false    (drops the preview-tap guard)
//        -> "one board tap while previewing ... plays NO move" goes red at all three geometries, and nothing
//           else does.
//   NC4  requestHint  if(mv)setPlayHintMv(mv) -> setPlayHintMv(null)
//        -> "Hint paints exactly TWO squares" reads 0. One assertion, only that one.
// The remaining controls are named per property in claude/stories/PLAY-LANE-2026-09-14.md; they were not run.
'use strict';
const L=require('../lib');
const P=require('../drive/play');

// ── local helpers, because two of drive/play.js's are blind on this build (both reported in the doc) ──
// movesShown() there reads !!document.querySelector('[data-ct="moves-head"]'), but #373 made the panel
// ALWAYS laid out and merely visibility:hidden when Moves is off (chess.jsx:5885), so the head never leaves
// the DOM and that helper returns true in BOTH states. Measure the computed visibility instead.
const movesVis=(b)=>b.page.evaluate(()=>{const p=document.querySelector('[data-ct="moves-panel"]');return p?getComputedStyle(p).visibility:null;});
// Plies from the MOVES panel, one token per line, SAN only - the 34-takeback idiom, kept identical on purpose
// so the two gates cannot drift apart. NOTE it follows the PREVIEWED position, not the whole game.
const plyCount=(b)=>b.page.evaluate(()=>{const p=document.querySelector('[data-ct="moves-panel"]');if(!p)return -1;
  const SAN=/^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?$/;
  return (p.innerText||'').replace(/ /g,' ').split('\n').map(x=>x.trim()).filter(x=>SAN.test(x)).length;});
// The six control buttons, in DOM order, with rects. Matched on their own text so the sheet's rows cannot
// be picked up by mistake.
const rowBtns=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')]
  .filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&/^(Moves|Back|Forward|Hint|Flip|More|Review|Rematch)$/.test((x.innerText||'').trim());})
  .map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,right:Math.round(r.right*10)/10,dis:!!x.disabled};}));
// The hint paints HL_HINT (chess.jsx:1111, 'rgba(255,200,30,.75)') on the from and to squares. There is no
// data-ct on the hint - counting the painted squares is the only measurement available, and it is exact.
const hintSquares=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('div')].filter(d=>d.style.background==='rgba(255, 200, 30, 0.75)').length);
// The clock pill has NO data-ct either (chess.jsx:6016); it is the m:ss inside a player bar.
const clockOf=(b,bar)=>b.page.evaluate((s)=>{const e=document.querySelector('[data-ct="'+s+'"]');if(!e)return null;const m=(e.innerText||'').match(/\d+:\d\d/);return m?m[0]:null;},bar);
const barText=(b,bar)=>b.text('[data-ct="'+bar+'"]');
const sheetRows=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="more-sheet"]');if(!s)return null;
  return [...s.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,dis:!!x.disabled};});});
const shutSheet=async(b)=>{await b.page.mouse.click(4,4);await b.settle(350);};
const near=(a,c)=>a!=null&&c!=null&&Math.abs(a-c)<0.6;

// Measured on #900, 2026-09-14. vs Computer the eval bar takes 18px off the left, so the board is narrower
// than in Pass & Play at the same width; the bars are flex:1 1 0 and absorb the leftover height, so they are
// taller where the board is narrower. Both facts are why every number here is per-geometry.
const CPU={se:{bw:288,bx:25,by:62.5,barW:288,barH:33.5},kunal730:{bw:353,bx:20,by:93.8,barW:353,barH:64.8},'390':{bw:368,bx:20,by:103,barW:368,barH:74}};
const PP ={se:{bw:272,bx:24,by:63,barW:272,barH:34},kunal730:{bw:375,bx:0,by:84.8,barW:375,barH:55.8},'390':{bw:390,bx:0,by:103,barW:390,barH:74}};
const ROW_LIVE=['Moves','Back','Forward','Hint','Flip','More'];
const ROW_OVER=['Moves','Back','Forward','Review','Rematch','More'];

L.run(async()=>{

  // ══ 1-6: the live screen, vs Computer, at three widths ══════════════════════════════════════════════
  for(const geo of ['se','kunal730','390']){
    const W=CPU[geo];
    const b=await L.launch({geo,name:'play-'+geo,store:{ct_pool:'3'}});await b.open();
    await P.states['cpu-m0'](b);

    // --- TC-PL-005/006: at move 0 there is nothing to step through.
    const r0=await rowBtns(b);
    L.say(r0.length===6&&r0.map(x=>x.t).join(',')===ROW_LIVE.join(','),geo+': at move 0 the control row is exactly '+ROW_LIVE.join(' · '),r0.map(x=>x.t).join(','));
    L.say(r0[1]&&r0[1].dis===true&&r0[2]&&r0[2].dis===true,geo+': at move 0 Back AND Forward are disabled - there is no position behind and none ahead',{back:r0[1]&&r0[1].dis,forward:r0[2]&&r0[2].dis});
    L.say((await plyCount(b))===0,geo+': the MOVES panel holds no plies at move 0 (the empty-state line is not a ply)',await plyCount(b));

    await P.states['cpu-4ply'](b);
    const m=await b.metrics();

    // --- TC-PL-001: the board is the size measured for THIS geometry, not merely the size it was a moment ago.
    L.say(!!m.board&&near(m.board.w,W.bw)&&near(m.board.left,W.bx)&&near(m.board.top,W.by),
      geo+': the vs-Computer board is '+W.bw+' wide at ('+W.bx+','+W.by+') - the measured size for this geometry',{measured:m.board,want:W});
    L.say(m.over.over<=0&&m.over.docScroll===0,geo+': nothing scrolls vertically in a live game',m.over);
    const sw=await b.page.evaluate(()=>document.documentElement.scrollWidth);
    L.say(sw===b.geo.w,geo+': nothing scrolls sideways either (scrollWidth '+sw+' = viewport '+b.geo.w+')');

    // --- TC-PL-002: the player bars.
    const pt=await b.rect('[data-ct="pbar-top"]'),pb=await b.rect('[data-ct="pbar-bottom"]');
    L.say(!!pt&&!!pb&&near(pt.w,W.barW)&&near(pb.w,W.barW),geo+': both player bars are '+W.barW+' wide - the board\'s own width',{top:pt&&pt.w,bottom:pb&&pb.w,want:W.barW});
    L.say(!!pt&&!!pb&&near(pt.h,W.barH)&&near(pb.h,W.barH),geo+': both player bars are '+W.barH+' tall',{top:pt&&pt.h,bottom:pb&&pb.h,want:W.barH});
    const chrome=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pbar-top"]');return {home:!!(t&&t.querySelector('[data-ct="play-home"]')),menu:!!(t&&t.querySelector('[data-ct="play-menu"]'))};});
    L.say(chrome.home&&chrome.menu,geo+': the ⌂ and ☰ live in the TOP player bar (#351: they were a 40px row of their own and every pixel of it went to the board)',chrome);

    // --- TC-PL-003: the control row, measured BEFORE anything is clicked. locator.click() would scroll a
    // control into view and pass a row a thumb cannot reach; these rects are the pre-tap truth.
    const r4=await rowBtns(b);
    L.say(r4.length===6&&r4.map(x=>x.t).join(',')===ROW_LIVE.join(','),geo+': in a live game the row is '+ROW_LIVE.join(' · '),r4.map(x=>x.t).join(','));
    L.say(r4.every(x=>near(x.h,51)),geo+': every control button is 51 tall',r4.map(x=>x.t+':'+x.h).join(' '));
    L.say(r4.every(x=>x.bottom<=b.geo.h+0.5&&x.y>=0),geo+': the whole control row is inside the viewport before any tap (bottom '+(r4[0]&&r4[0].bottom)+' <= '+b.geo.h+')',{bottom:r4[0]&&r4[0].bottom,vh:b.geo.h});
    L.say(r4.every(x=>x.right<=b.geo.w+0.5&&x.x>=0),geo+': no control button hangs off either edge',r4.map(x=>x.x+'..'+x.right).join(' '));
    L.note(geo+': narrowest control button is '+Math.min(...r4.map(x=>x.w))+' wide x 51 tall (NEEDS-KUNAL K-PL-1: 44px)');

    // --- TC-PL-007: Back is live after moves, Forward is dead at the head.
    L.say(r4[1].dis===false&&r4[2].dis===true,geo+': after four plies Back is live and Forward is dead - the board is at the head of the game',{back:r4[1].dis,forward:r4[2].dis});

    // --- TC-PL-009 (US-PL-04): the #373 rule. Moves toggles the CONTENT, never the row: the panel is always
    // laid out and only its visibility changes, so the fit loop never hands its ~64px to the board. Before
    // #373 the board moved 23px on every toggle. This is the assertion that would have caught it.
    const v1=await movesVis(b),g1=await b.metrics();
    await P.tapBtn(b,/^Moves$/,600);
    const v2=await movesVis(b),g2=await b.metrics();
    await P.tapBtn(b,/^Moves$/,600);
    const v3=await movesVis(b),g3=await b.metrics();
    L.say(v1==='visible'&&v2==='hidden'&&v3==='visible',geo+': Moves toggles the list\'s VISIBILITY (visible -> hidden -> visible), it does not unmount the row',{v1,v2,v3});
    const tops=new Set([g1.board&&g1.board.top,g2.board&&g2.board.top,g3.board&&g3.board.top]);
    const wids=new Set([g1.board&&g1.board.w,g2.board&&g2.board.w,g3.board&&g3.board.w]);
    L.say(tops.size===1&&wids.size===1,geo+': the board has ONE top and ONE width across the Moves toggle (#373: it used to move 23px)',{tops:[...tops],wids:[...wids]});
    L.say(near(g2.board&&g2.board.w,W.bw),geo+': and that width is still the pinned '+W.bw+' with the list hidden',{measured:g2.board&&g2.board.w,want:W.bw});

    // --- TC-PL-010/011 (US-PL-05): Back steps the painted position back one ply and Forward returns.
    const liveP=await plyCount(b);
    await P.tapBtn(b,/^Back$/,600);
    const backP=await plyCount(b),rb=await rowBtns(b),gb=await b.metrics();
    L.say(backP===liveP-1,geo+': Back steps the painted position back exactly one ply ('+liveP+' -> '+backP+')',{live:liveP,back:backP});
    L.say(rb[2].dis===false,geo+': Forward comes alive as soon as the board is behind the head',{forward:rb[2].dis});
    L.say(near(gb.board&&gb.board.w,W.bw)&&near(gb.board&&gb.board.top,W.by),geo+': the board does not move when a past ply is previewed',{measured:gb.board,want:W});

    // --- TC-PL-012 (US-PL-06): a board tap while previewing returns to LIVE and plays NO move. onPtrDown
    // (chess.jsx:3679) consumes the tap for exactly this reason. A gate that used b.move() here would read a
    // rising ply count and report a phantom defect - the count rises because the PREVIEW ENDED, not because a
    // move was made. Measured that way first, on purpose, and it is why this assertion taps ONE square.
    await b.tapSq('d2');await b.settle(500);
    const afterTap=await plyCount(b),rt=await rowBtns(b);
    L.say(afterTap===liveP,geo+': one board tap while previewing returns to the live position and plays NO move ('+backP+' -> '+afterTap+', the game still has '+liveP+' plies)',{back:backP,afterTap,live:liveP});
    L.say(rt[2].dis===true,geo+': and Forward is dead again, because the board is back at the head',{forward:rt[2].dis});
    L.say(b.errs.length===0,geo+': zero app errors across the live screen',b.errs.slice(0,3));
    await b.shot('play-'+geo+'-live');
    await b.close();
  }

  // ══ 7-8: Hint and Flip. One geometry is enough - both are state, not layout, and the board-does-not-move
  // half of each is already pinned per geometry above. Kunal's own phone. ══════════════════════════════
  {
    const geo='kunal730',W=CPU[geo];
    const b=await L.launch({geo,name:'play-hintflip',store:{ct_pool:'3'}});await b.open();
    await P.states['cpu-4ply'](b);

    // --- TC-PL-014/015/016 (US-PL-07)
    L.say((await hintSquares(b))===0,'no square is hint-painted before Hint is asked for',await hintSquares(b));
    const preHint=await b.metrics();
    await P.tapBtn(b,/^Hint$/,1400);
    const hs=await hintSquares(b),postHint=await b.metrics();
    L.say(hs===2,'Hint paints exactly TWO squares - the piece to move and where it goes',{painted:hs});
    L.say(near(postHint.board.w,preHint.board.w)&&near(postHint.board.top,preHint.board.top)&&near(postHint.board.w,W.bw),
      'the board does not move for a hint, and is still the pinned '+W.bw,{before:preHint.board,after:postHint.board});
    L.say(postHint.over.over<=0,'nothing scrolls when a hint is shown',postHint.over);
    await b.shot('play-hint');
    // the hint is spent by the next move (doMove clears playHintMv, chess.jsx:3453)
    await b.move('d2','d4',0);await b.settle(700);
    L.say((await hintSquares(b))===0,'the hint clears the moment a move is played - it never survives onto a position it was not computed for',await hintSquares(b));

    // --- TC-PL-017/018 (US-PL-08)
    await P.waitPlies(b,6).catch(()=>{});await b.settle(600);
    const topBefore=await barText(b,'pbar-top'),botBefore=await barText(b,'pbar-bottom'),gPre=await b.metrics();
    await P.tapBtn(b,/^Flip$/,700);
    const bdF=await b.board(),topAfter=await barText(b,'pbar-top'),botAfter=await barText(b,'pbar-bottom'),gPost=await b.metrics();
    L.say(bdF&&bdF.flip===true,'Flip turns the board round',{flip:bdF&&bdF.flip});
    L.say(topBefore!==topAfter&&botBefore!==botAfter,'Flip swaps which player is in which bar',{topBefore,topAfter,botBefore,botAfter});
    L.say(near(gPost.board.w,gPre.board.w)&&near(gPost.board.top,gPre.board.top)&&near(gPost.board.w,W.bw),
      'the board does not change size or position when it is flipped',{before:gPre.board,after:gPost.board});
    await P.tapBtn(b,/^Flip$/,700);
    const bdU=await b.board();
    L.say(bdU&&bdU.flip===false,'Flip again puts it back',{flip:bdU&&bdU.flip});
    L.say(b.errs.length===0,'zero app errors across Hint and Flip',b.errs.slice(0,3));
    await b.close();
  }

  // ══ 9: the clock. Pass & Play, because there both sides are human and the wait is under the gate's
  // control - against the engine the reply can land inside one clock tick and prove nothing. ═══════════
  {
    const b=await L.launch({geo:'kunal730',name:'play-clock',store:{ct_pool:'3'}});await b.open();
    await b.home();await b.tile('Play');await b.settle(500);
    await P.tapBtn(b,/^Pass & Play$/,400);
    await b.tapText(/^1 min$/,{wait:300});           // the time chips are spans, not buttons
    await P.scrollSheetTop(b);
    await P.tapBtn(b,/^▶ Start game$/,900);
    // --- TC-PL-019: the clock does not start before the first move (clock.run is false until a move lands).
    const c0={top:await clockOf(b,'pbar-top'),bot:await clockOf(b,'pbar-bottom')};
    L.say(c0.top==='1:00'&&c0.bot==='1:00','a 1 min clock shows 1:00 on both sides at move 0',c0);
    await b.settle(3000);
    const c1={top:await clockOf(b,'pbar-top'),bot:await clockOf(b,'pbar-bottom')};
    L.say(c1.top==='1:00'&&c1.bot==='1:00','and neither side loses a second before the first move is played - three seconds of sitting still cost nothing',c1);
    // --- TC-PL-020: after a move only the side TO MOVE is charged. Pass & Play turns the board after every
    // ply, so the side to move is always the BOTTOM bar; that is what makes this measurable without flipping.
    await b.move('e2','e4',300);
    await b.settle(4000);
    const c2={top:await clockOf(b,'pbar-top'),bot:await clockOf(b,'pbar-bottom')};
    const botSecs=(s)=>{const m=/^(\d+):(\d\d)$/.exec(s||'');return m?(+m[1])*60+(+m[2]):null;};
    L.say(c2.top==='1:00','after 1.e4 the side that MOVED is not charged for the opponent\'s thinking time',c2);
    L.say(botSecs(c2.bot)<=57&&botSecs(c2.bot)>=53,'the side TO MOVE is charged - about 4s gone after a 4s wait',c2);
    L.note('the clock pill carries NO data-ct (chess.jsx:6016): it can only be read as the m:ss inside pbar-top / pbar-bottom. Flagged so a later gate does not assert the wrong element.');
    L.say(b.errs.length===0,'zero app errors with a clock running',b.errs.slice(0,3));
    await b.shot('play-clock');
    await b.close();
  }

  // ══ 10: game over. Fool's mate in Pass & Play, at two widths. ════════════════════════════════════════
  for(const geo of ['se','kunal730']){
    const W=PP[geo];
    const b=await L.launch({geo,name:'play-over-'+geo,store:{ct_pool:'3'}});await b.open();
    await P.states['pp-m0'](b);
    const mid=await b.metrics();
    L.say(!!mid.board&&near(mid.board.w,W.bw)&&near(mid.board.left,W.bx),geo+': the Pass & Play board is '+W.bw+' wide at x='+W.bx+' - wider than the vs-Computer board, which gives 18px to the eval bar',{measured:mid.board,want:W});

    await P.states['pp-mate'](b);
    const end=await b.metrics(),card=await b.text('[data-ct="result-card"]');
    // --- TC-PL-022/023 (US-PL-09)
    L.say(card==='Checkmate! Black wins',geo+': the result card names the result in full',{card});
    L.say(!!end.board&&near(end.board.w,W.bw)&&near(end.board.top,W.by),geo+': the board at game over is still the pinned '+W.bw+' at y='+W.by+' - the mate is not a layout event',{measured:end.board,want:W});
    L.say(end.over.over<=0&&end.over.docScroll===0,geo+': nothing scrolls at game over',end.over);
    const rE=await rowBtns(b);
    L.say(rE.length===6&&rE.map(x=>x.t).join(',')===ROW_OVER.join(','),geo+': at game over the row is '+ROW_OVER.join(' · ')+' - Hint and Flip give their two slots to Review and Rematch, same row, same height (#371)',rE.map(x=>x.t).join(','));
    L.say(rE.every(x=>near(x.h,51)),geo+': and every one of them is still 51 tall, so the row below the board did not change height',rE.map(x=>x.t+':'+x.h).join(' '));
    L.say(rE.every(x=>x.bottom<=b.geo.h+0.5),geo+': the whole game-over row is inside the viewport before any tap',{bottom:rE[0]&&rE[0].bottom,vh:b.geo.h});
    // --- TC-PL-024: Review is live once there are moves to review.
    L.say(rE[3].t==='Review'&&rE[3].dis===false,geo+': Review is live on a finished four-ply game',{review:rE[3]});

    // --- TC-PL-025: the sheet at game over. Resign has gone; the rows that remain all fit ON SCREEN.
    // The container fitting is not the test - the Review lane's ⋯ sheet ends exactly at the viewport bottom
    // at every geometry while its last ROW hangs below the fold at five of six. Measure the last ROW.
    await P.tapBtn(b,/^More$/,700);
    const rows=await sheetRows(b);
    L.say(!!rows&&rows.length===3&&rows.map(x=>x.t).join(',')==='New game,Analyze,Copy moves',geo+': the More sheet on a finished game is New game · Analyze · Copy moves - Resign has left, and it was the LAST row so nothing above it moved',rows&&rows.map(x=>x.t).join(','));
    L.say(!!rows&&!rows.some(x=>/Resign/i.test(x.t)),geo+': there is no way to resign a game that is already over',rows&&rows.map(x=>x.t));
    L.say(!!rows&&rows[rows.length-1].bottom<=b.geo.h+0.5,geo+': the LAST row of the sheet ends inside the viewport ('+(rows&&rows[rows.length-1].bottom)+' <= '+b.geo.h+') - the content, not just the container',{last:rows&&rows[rows.length-1],vh:b.geo.h});
    L.say(!!rows&&rows.every(x=>x.h>=44),geo+': every sheet row is at least 44 tall',rows&&rows.map(x=>x.t+':'+x.h).join(' '));
    // --- TC-PL-026: Flip is NOT reachable once the game is over. Measured, and it contradicts the comment at
    // chess.jsx:5319 ("Flip is still in More"). Asserted as the BUILD behaves so the gate is honest; if Kunal
    // rules the comment is right, this assertion is the one that moves. NEEDS-KUNAL K-PL-4.
    const anyFlip=await b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;}).some(x=>/^Flip$/.test((x.innerText||'').trim())));
    L.say(anyFlip===false,geo+': RECORDED, NOT ENDORSED - after the game ends there is no Flip anywhere: not in the row, not in the More sheet. chess.jsx:5319 says "Flip is still in More"; it is not. K-PL-4',{flipAnywhere:anyFlip});
    await shutSheet(b);

    // --- TC-PL-027: the result card leaves the board, and the board is unchanged when it goes. THE 8000 BELOW
    // IS THIS ARM'S OWN SETTLE AND NOT A PROPERTY OF THE APP [R18]: the fade is 2600ms and the unmount is
    // 3300ms (chess.jsx:3333), and b.text reads the UNMOUNT. Reading the 8000 as "the fade" is what put an
    // unfailable 8000ms conjunct on two of block 11b's assertions and cost build #501 its payload. The
    // assertion's own wording still says "within 8s", which is true, and is left alone on purpose - see the
    // second L.note in block 11b.
    const kidsWithCard=(await b.board()).kids;
    await b.settle(8000);
    const cardGone=await b.text('[data-ct="result-card"]'),after=await b.metrics(),kidsAfter=(await b.board()).kids;
    L.say(cardGone===null,'the result card fades off the board within 8s, so it never sits over the position for good',{card:cardGone});
    L.say(kidsWithCard===kidsAfter+1,geo+': the card is the board grid\'s one extra child while it is up ('+kidsWithCard+' -> '+kidsAfter+') - compare x/y/w/h, never the whole board object, or this legitimate change reads as a false difference',{withCard:kidsWithCard,after:kidsAfter});
    L.say(near(after.board.w,W.bw)&&near(after.board.top,W.by),geo+': and the board is untouched by the card leaving',{measured:after.board,want:W});
    await b.shot('play-over-'+geo);
    L.say(b.errs.length===0,geo+': zero app errors across the game ending',b.errs.slice(0,3));
    await b.close();
  }

  // ══ 11: resign - the two-tap arm, and the EMPTY STATE at game over (a finished game with no moves in it) ══
  // #375 (audit A2-03) made Resign a two-tap arm because a 45px row under "New game" ended the game on one
  // tap. NOTE FOR WHOEVER MAINTAINS drive/play.js: its 'cpu-resigned' state taps Resign ONCE, which only ARMS
  // it on this build - measured, the row still reads Moves·Back·Forward·Hint·Flip·More, the sheet is still
  // open and there is no result card. 'cpu-resigned', 'cpu-resigned-more' and 'cpu-rematch' therefore do not
  // reach the states their names claim. This section drives the arm itself rather than through that helper.
  {
    const geo='kunal730',W=CPU[geo];
    const b=await L.launch({geo,name:'play-resign',store:{ct_pool:'3'}});await b.open();
    await P.states['cpu-m0'](b);
    await P.tapBtn(b,/^More$/,700);
    const live=await sheetRows(b);
    L.say(!!live&&live.map(x=>x.t).join(',')==='Takeback,New game,Resign,Analyze,Copy moves','vs Computer the live More sheet is Takeback · New game · Resign · Analyze · Copy moves',live&&live.map(x=>x.t).join(','));
    await P.tapBtn(b,/^Resign$/,600);
    const armed=await sheetRows(b),rowArmed=await rowBtns(b);
    L.say(!!armed&&armed.some(x=>x.t==='Tap again to resign'),'one tap only ARMS Resign - the row reads "Tap again to resign" (#375: a 45px row under New game used to end the game on one tap)',armed&&armed.map(x=>x.t).join(','));
    L.say(rowArmed.map(x=>x.t).join(',')===ROW_LIVE.join(','),'and the game is still LIVE while it is armed - the control row has not changed',rowArmed.map(x=>x.t).join(','));
    await P.tapBtn(b,/^Tap again to resign$/,1100);
    const rowOver=await rowBtns(b),card=await b.text('[data-ct="result-card"]'),m=await b.metrics();
    L.say(card==='Resigned You lose','the second tap resigns and the card says so',{card});
    L.say(rowOver.map(x=>x.t).join(',')===ROW_OVER.join(','),'a resigned game gets the same game-over row as a mated one',rowOver.map(x=>x.t).join(','));
    // THE EMPTY STATE: a game with nothing in it cannot be reviewed.
    L.say(rowOver[3].t==='Review'&&rowOver[3].dis===true,'resigning at move 0 leaves Review DISABLED - there is no game to review',{review:rowOver[3]});
    L.say(rowOver[1].dis===true&&rowOver[2].dis===true,'and Back and Forward are dead too, because no ply was ever played',{back:rowOver[1].dis,forward:rowOver[2].dis});
    L.say(near(m.board.w,W.bw)&&near(m.board.top,W.by),'the board is still the pinned '+W.bw+' after a resignation at move 0',{measured:m.board,want:W});
    L.say(m.over.over<=0&&m.over.docScroll===0,'nothing scrolls after a resignation',m.over);
    await b.shot('play-resign-m0');
    L.say(b.errs.length===0,'zero app errors across a resignation',b.errs.slice(0,3));
    await b.close();
  }

  // ══ 11b: THE SAME TWO-PLY COMPOSITION ON A NON-BOARD ENDING. A SECOND LAUNCH, DELIBERATELY. ═════════
  // RE-CUT 2026-10-08T22:xxZ AFTER BUILD #501's DOUBLE VETO WAS UPHELD IN FULL AND THIS BLOCK WAS REVERTED.
  // The substance survived the veto - the driver alias is right and the three withdrawn premises are genuinely
  // stale - and what did not was the part that matters most in a gate: the two headline assertions were
  // guarded by conjuncts that CANNOT FAIL. Every repair below is one of the five items on
  // jobs/tc-pl-030s-headline-assertions-are-guarded-by-conjuncts-that-time-the-harness-own-sleep-2026-10-08,
  // which is antagonist A's own list, and each is marked [FIX n] where it lands.
  //
  // WHAT THIS CLOSES. jobs/no-gate-mates-a-game-and-then-steps-the-ply-2026-09-30 asks for a game-over
  // assertion that MATES (or ends) and then STEPS THE PLY, so that the ply-keyed half of (isOver||playEnd)
  // is the operative half. Block 10 now does that on the BOARD ending (fool's mate) and its own arm says in
  // terms that the non-board ending was still owed, because block 11 above resigns at MOVE 0 where Back and
  // Forward are both dead and there is no ply to step. This is that arm.
  //
  // THE PREMISE THE JOB GAVE FOR WHY IT COULD NOT BE DONE IS FALSE AND IS WITHDRAWN HERE [R18]. It reads
  // "a resign-with-moves drive state is needed and gates/drive/play.js has none". MEASURED 2026-10-08T12:41Z
  // against origin/main's own committed app.js, and RE-MEASURED at 2026-10-08T21:57Z against main's bundle
  // md5 bd8f31ddbc47 at cd15f28: drive/play.js's 'cpu-resigned' composes 'cpu-more' -> 'cpu-4ply', so it has
  // always resigned a FOUR-PLY game, and it reaches the ending (card "Resigned You lose", row
  // Moves·Back·Forward·Review·Rematch·More). The state existed; nothing asked for it by name. It is now named
  // 'cpu-resigned-with-moves' there. #501's antagonist A went further and measured cpu-resigned-more and
  // cpu-rematch too, so the withdrawal is correct for all THREE states and not only the one measured here.
  // THE COMMENT AT THE HEAD OF BLOCK 11 ABOVE IS STALE: it says 'cpu-resigned' taps Resign ONCE and so does
  // not reach the state its name claims. That was true when block 11 was authored and was fixed at #387 -
  // the driver plays both taps of the #375 arm today. Corrected by L.note below rather than by deleting the
  // paragraph, because the paragraph records a real failure and only its present tense is wrong.
  //
  // [FIX 3] THE TIMER NUMBERS, STATED ONCE AND CORRECTLY, BECAUSE THE FIRST CUT OF THIS BLOCK HAD THEM WRONG.
  // There is no "8s fade". The card's FADE is 2600ms and its UNMOUNT is 3300ms (chess.jsx:3333), and what
  // b.text('[data-ct="result-card"]') reads is the UNMOUNT - a faded-but-mounted card still returns its text.
  // The 8000 in block 10's TC-PL-027 is that arm's own generous SETTLE, not a property of the app, and reading
  // it as "the fade" is what put an 8000ms conjunct on two assertions whose real round trip is 1.1 seconds.
  // So every clock below is measured against CARD_UNMOUNT_MS and nothing below mentions 8s.
  //
  // [FIX 1] AND THE CLOCK IS THE RESIGNATION'S, NOT THE TAP'S. The vetoed cut timed each tap (backMs, fwdMs)
  // and bounded it under 8000. A tap cannot take 8000ms: tapBtn's own settle floor is 400-600ms, so those two
  // conjuncts were satisfied by the harness's own sleep and could not fail on any bundle, healthy or broken.
  // MEASURED on main at 21:57Z, exactly as the veto says: 561ms and 564ms against a budget of 8000.
  // What ACTUALLY governs whether the card may be read is time since the GAME ENDED, because the unmount is
  // keyed to that. tRet below is the moment the driver returned; the true ending is EARLIER than tRet by the
  // driver's own trailing settle, which is the 1100 in gates/drive/play.js's S['cpu-resigned'], so
  // sinceOver() = (now - tRet) + DRIVE_TAIL_MS is a CONSERVATIVE OVER-ESTIMATE of elapsed-since-ending and
  // the bound it is tested against is therefore safe in the right direction. The job's fix list proposed a
  // flat 2000ms; THAT FIGURE IS NOT USED AND THE DISAGREEMENT IS RECORDED RATHER THAN SPLIT [R18, R45]:
  // 1100 of trailing settle plus a measured 1.13s round trip is already about 2.2s, so a 2000ms budget would
  // redden this arm on a healthy bundle - the same defect as the 8000 pointed the other way. The budget is
  // CARD_UNMOUNT_MS less CLOCK_MARGIN_MS, derived from the unmount rather than chosen, and the ACTUAL elapsed
  // figure is printed on every reading so the next reader can see the headroom instead of trusting it.
  //
  // [FIX 4] THE GRID CHILD COUNT IS A CONSISTENCY CHECK, NOT AN INDEPENDENT WITNESS, and the vetoed cut
  // claimed the #389 cross-check rule for it. It cannot have that rule: block 10's own assertion twenty lines
  // above (TC-PL-027, "the card is the board grid's one extra child while it is up") establishes that the
  // extra child IS the card, so the count and the card selector read the same React subtree and agree by
  // construction. That is still worth asserting - it catches a card that is present in the DOM but detached
  // from the grid, and a grid that loses a child for some OTHER reason - and it is worth exactly that much.
  // The #389 citation is removed from here; it is honoured where it belongs, in the eval cross-checks.
  //
  // [FIX 5] AND THE FORWARD ARM GETS A PRECONDITION. The vetoed cut's own M1 control had already found that
  // the Forward reading passes vacuously when the Back step did not happen - a card that never left is a card
  // that is still there to be "brought back" - and it RECORDED that rather than fixing it. It is now a
  // separate PASS line of its own, asserted before the Forward verdict is believed, per the project rule that
  // a missing denominator is reported and never credited.
  //
  // [FIX 2] THE STATE NOTHING COVERED: PAST THE UNMOUNT. TC-PL-030 proves the card comes back when the ply
  // comes back, INSIDE the unmount window. It says nothing about the other side of 3300ms, and that silence
  // is what a ply-keyed _resultKey would walk through - the #473 regression. TC-PL-031 settles past the
  // unmount at the live head, asserts the card has gone, then runs the SAME Back/Forward round trip and
  // asserts it does NOT return. Every figure in it is measured below, not predicted here.
  {
    const geo='kunal730',W=CPU[geo];
    const CARD_UNMOUNT_MS=3300;   // chess.jsx:3333 - the card UNMOUNTS here. The fade starts at 2600.
    const DRIVE_TAIL_MS=1100;     // gates/drive/play.js S['cpu-resigned'], the settle after the second tap.
    const CLOCK_MARGIN_MS=250;    // headroom, so a slow container reddens on the CLOCK line and says why.
    const CARD_BUDGET_MS=CARD_UNMOUNT_MS-CLOCK_MARGIN_MS;
    const b=await L.launch({geo,name:'play-resign-card',store:{ct_pool:'3'}});await b.open();
    const t0=Date.now();
    await P.states['cpu-resigned-with-moves'](b);
    const tRet=Date.now(),driveMs=tRet-t0;
    const sinceOver=()=>(Date.now()-tRet)+DRIVE_TAIL_MS;
    // THE CHEAP READS FIRST AND THE HEAVY ONES AFTER THE ROUND TRIP, deliberately [FIX 1]. The vetoed cut read
    // the row and the full metrics object BEFORE tapping Back, which put four page round trips inside the
    // unmount window for no reason. The row and the board geometry are read at the RESTORED head below, which
    // is the same state, and that is said in the assertions rather than left for a reader to notice.
    const card0=await b.text('[data-ct="result-card"]'),since0=sinceOver();
    const plies0=await plyCount(b),kids0=(await b.board()).kids;

    // --- TC-PL-030: ONE PLY BACK AND THE RESULT CARD GOES. The ply-keyed half, on a non-board ending.
    await P.tapBtn(b,/^Back$/,400);
    const cardB=await b.text('[data-ct="result-card"]'),sinceB=sinceOver();
    const pliesB=await plyCount(b),kidsB=(await b.board()).kids,rowB=await rowBtns(b);
    const backHappened=(cardB===null&&pliesB===plies0-1);
    // --- and ONE PLY FORWARD BRINGS IT BACK, which is the half a timer can never explain.
    await P.tapBtn(b,/^Forward$/,400);
    const cardF=await b.text('[data-ct="result-card"]'),sinceF=sinceOver();
    const pliesF=await plyCount(b),kidsF=(await b.board()).kids;
    // the head as restored: the row and the geometry, read after the round trip and asserted as the head.
    const row0=await rowBtns(b),m0=await b.metrics();

    // --- TC-PL-028: the state is the state. A resigned game WITH MOVES, reached by name, not merely armed.
    L.say(plies0===4,
      'the named drive state reaches a RESIGNED game with FOUR plies on the board - so there is a ply to step, which the move-0 ending above does not have',
      {plies:plies0,driveMs});
    L.say(card0==='Resigned You lose',
      'and the ending is REACHED and not merely armed: the result card reads "Resigned You lose" at the live head',{card:card0,msSinceGameOver:since0});
    L.say(row0.length===6&&row0.map(x=>x.t).join(',')===ROW_OVER.join(','),
      'and it is a real game-over row, the same one a mate gives: '+ROW_OVER.join(' · ')+' (read at the head as restored by the Forward tap below, which is the same state)',row0.map(x=>x.t).join(','));
    // --- TC-PL-029: the discriminator. Review is LIVE here and DEAD in the move-0 ending asserted above, so
    // that block's empty-state assertion is falsifiable rather than merely true. One field, two endings.
    L.say(row0[3].t==='Review'&&row0[3].dis===false,
      'Review is LIVE on a resigned game that HAS moves - the mirror of "resigning at move 0 leaves Review DISABLED" twenty lines above, and what makes that assertion mean something',{review:row0[3]});
    L.say(row0[1].dis===false&&row0[2].dis===true,
      'Back is live and Forward is dead at the live head of a resigned game - the head is a head, not a preview',{back:row0[1].dis,forward:row0[2].dis});

    // [FIX 1] THE CLOCK LINE. Its own assertion, not a conjunct, so a slow container reddens HERE and the
    // message says the reading was late rather than leaving a card verdict to be read as an app regression.
    L.say(sinceB<CARD_BUDGET_MS&&sinceF<CARD_BUDGET_MS,
      'BOTH card readings below were taken inside the card\'s own lifetime - '+sinceB+'ms and '+sinceF+'ms since the game ended, against the '+CARD_UNMOUNT_MS+'ms unmount at chess.jsx:3333 less a '+CLOCK_MARGIN_MS+'ms margin. IF THIS LINE IS THE RED ONE, the container was slow and the two card verdicts below say nothing about the app',
      {msSinceGameOver:{atBack:sinceB,atForward:sinceF},budget:CARD_BUDGET_MS,unmount:CARD_UNMOUNT_MS,driveTail:DRIVE_TAIL_MS,method:'(now - driver return) + the driver\'s own 1100ms trailing settle, so an OVER-estimate'});
    L.say(cardB===null&&pliesB===plies0-1,
      'ONE Back tap takes the resignation card off the board, at one ply back - and the clock line above says the card was still inside its own lifetime, so this null is the PREVIEWED PLY and not the unmount timer',
      {card:cardB,plies:pliesB,msSinceGameOver:sinceB});
    L.say(kidsB===kids0-1,
      'and the board grid loses exactly one child with it ('+kids0+' -> '+kidsB+') - a CONSISTENCY check and not an independent witness: TC-PL-027 above establishes that the extra child IS the card, so these two readings share a subtree. What it catches is a card detached from the grid, or a grid losing a child for another reason',{withCard:kids0,back:kidsB});
    L.say(rowB[2].dis===false,'Forward comes alive the moment there is something ahead of the previewed ply',{forward:rowB[2].dis});

    // [FIX 5] the precondition, as its own PASS line, before the Forward verdict is believed.
    L.say(backHappened,
      'PRECONDITION for the Forward arm: the Back tap actually removed the card AND moved the ply ('+plies0+' -> '+pliesB+'). Without this, "the card came back" is satisfied by a card that never left - which this arm\'s own M1 control found and recorded rather than fixed',
      {cardAfterBack:cardB,pliesAfterBack:pliesB,wantPlies:plies0-1});
    L.say(backHappened&&cardF==='Resigned You lose'&&pliesF===plies0,
      'ONE Forward tap brings the resignation card BACK at '+sinceF+'ms since the game ended - a card removed by its own timer could not return, so with the precondition and the clock line above this is the assertion that separates the two explanations',
      {card:cardF,plies:pliesF,msSinceGameOver:sinceF,backHappened});
    L.say(kidsF===kids0,'the grid child count returns to '+kids0+' with it',{back:kidsB,forward:kidsF});
    L.say(near(m0.board.w,W.bw)&&near(m0.board.top,W.by),
      'and the board never moved across the whole round trip - still the pinned '+W.bw+' at y='+W.by+', so stepping the ply at game over is not a layout event',{after:m0.board,want:W});

    // [FIX 2] TC-PL-031: PAST THE UNMOUNT. The state no assertion covered, and the one a ply-keyed
    // _resultKey walks through. Settle past 3300ms at the LIVE HEAD, then the same round trip.
    await b.settle((CARD_UNMOUNT_MS-sinceF)+900);
    const cardU=await b.text('[data-ct="result-card"]'),sinceU=sinceOver(),kidsU=(await b.board()).kids;
    L.say(sinceU>CARD_UNMOUNT_MS,
      'PRECONDITION for TC-PL-031: this reading is past the unmount - '+sinceU+'ms since the game ended against '+CARD_UNMOUNT_MS+'ms. If this is the red line, the settle was short and the two verdicts below say nothing',
      {msSinceGameOver:sinceU,unmount:CARD_UNMOUNT_MS});
    L.say(cardU===null,
      'the result card is GONE at the live head once the unmount at chess.jsx:3333 has fired ('+sinceU+'ms) - which is the other end of TC-PL-027\'s "it never sits over the position for good", measured against the real number instead of a generous settle',
      {card:cardU,msSinceGameOver:sinceU,kids:kidsU});
    await P.tapBtn(b,/^Back$/,400);
    const cardUB=await b.text('[data-ct="result-card"]'),pliesUB=await plyCount(b);
    await P.tapBtn(b,/^Forward$/,400);
    const cardUF=await b.text('[data-ct="result-card"]'),pliesUF=await plyCount(b);
    L.say(pliesUB===plies0-1&&pliesUF===plies0,
      'PRECONDITION for the line below: the post-unmount round trip really stepped the ply and came back ('+plies0+' -> '+pliesUB+' -> '+pliesUF+'). An absent card proves nothing if the taps did nothing',
      {pliesBack:pliesUB,pliesForward:pliesUF,want:plies0});
    L.say(cardUB===null&&cardUF===null,
      'and once it has unmounted, stepping the ply does NOT bring it back - so the card is keyed to the RESULT with a one-shot lifetime and not re-rendered from the previewed ply. THIS IS THE LINE THAT REDDENS IF _resultKey IS MADE PLY-KEYED AGAIN, which is the #473 regression, and it is the state TC-PL-030 alone cannot see',
      {afterBack:cardUB,afterForward:cardUF,msSinceGameOver:sinceOver()});
    L.note('WITHDRAWN [R18]: the paragraph at the head of block 11 says drive/play.js\'s cpu-resigned "taps Resign ONCE, which only ARMS it on this build" and that cpu-resigned, cpu-resigned-more and cpu-rematch "do not reach the states their names claim". True when block 11 was authored; fixed at #387. Measured on this bundle for cpu-resigned-with-moves, and by #501\'s antagonist A for cpu-resigned-more and cpu-rematch as well, so the withdrawal covers all three. The paragraph is kept because the failure it records is real and recurring - only its tense is wrong.');
    L.note('ALSO WITHDRAWN [R18], and it was this block\'s own error rather than somebody else\'s: the first cut of these assertions bounded each TAP under 8000ms and called 8000 "the 8s fade". There is no 8s fade. The fade is 2600ms, the unmount is 3300ms (chess.jsx:3333), b.text reads the unmount, and the 8000 in TC-PL-027 above is that arm\'s own settle. Block 10\'s TC-PL-027 message still says "within 8s": that assertion is TRUE (a 3300ms unmount is within 8s) and is LEFT UNCHANGED on purpose, because re-wording a shipped green assertion is a different job from this one - named here with its line rather than left for the next reader to find.');
    L.note('STILL NOT COVERED, named rather than left to be rediscovered: there is no drive state for the MOVE-0 resignation (block 11 drives that arm by hand, on purpose), and the harness-level rule that would make "end the game, then step the ply" a composition every game-over gate inherits belongs in gates/lib.js, which is outside the process-build allow-list. Both are on jobs/no-gate-mates-a-game-and-then-steps-the-ply-2026-09-30.');
    await b.shot('play-resign-card');
    L.say(b.errs.length===0,'zero app errors across a resignation and two two-ply round trips',b.errs.slice(0,3));
    await b.close();
  }
},'PLAY');