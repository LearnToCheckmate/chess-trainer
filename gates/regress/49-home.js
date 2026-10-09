// regress/49-home.js  THE HOME SCREEN - the overlay every session starts on, the four tiles that are the whole
// navigation of the app, the Daily 3 / streak cards, the coach line and the foot of the column. Authored
// 2026-09-15 by the test authoring lane (claude/stories/HOME-LANE-2026-09-15.md, US-HM-01 … US-HM-10 /
// TC-HM-001 … TC-HM-046).
//
// Every number below was MEASURED on the running build: the committed bundle #398 - 2026-09-15 03:18 ET, and
// re-measured identical on a local build of chess.jsx at commit fdb8c0b (stamp #921). Nothing here is inferred
// from source; where a line cites chess.jsx it is citing the REASON for a number, never the evidence for it.
//
// NUMBERING. 46 is the highest number in gates/regress on fdb8c0b, so 47 and 48 LOOK free and are NOT: the Menu
// lane published gates/regress/47-menu.js on 2026-09-15 01:50 ET and the Lesson lane published
// gates/regress/48-lesson-flow.js at 08:06 ET (docs/menu-lane and docs/lesson-lane in the tracker artifact).
// Neither has been pasted yet, so neither appears in a fresh clone. This file is 49 so that all three can land
// without any of them being renumbered - the clean-up 46-play.js records having had to do after the fact.
// gates.sh runs gates/regress/*.js in NAME order, so the number is ordering only.
//
// WHY THIS FILE EXISTS. Home is the screen the app boots on and the ONLY route to Discover, Puzzles, Review and
// Play - four tiles that are the entire navigation of the product. One gate touches this screen today:
// 42-home-devrow.js, and it guards the two 34x34 DEV buttons (🎬 and 💬) and nothing else. Grepped on fdb8c0b:
// `tile-ic-learn`, `tile-ic-puzzle`, `tile-ic-analyze`, `tile-ic-play`, `home-menu` and `home-look` appear in NO
// gate in gates/regress/. So the four primary navigation targets, the menu button, the Daily 3 card, the streak
// card, the goal bar and the coach line were all unguarded, while the two developer buttons beside them had a
// gate of their own. A regression that dropped a tile, swapped two of them, or stranded the bottom row would
// have reached Kunal's phone with the suite green.
//
// WHAT IT GUARDS
//   US-HM-01  the Home overlay is a fixed, self-scrolling layer whose column is min(vw-36, 420) wide, and
//             NOTHING escapes it sideways at any width
//   US-HM-02  the card set and its ORDER on a fresh store - intro, Daily 3, NEW HERE, tiles, coach line, look
//             row, dev row, build stamp - asserted as an exact signature, so a card that appears or disappears
//             is a red line rather than a silent change of screen
//   US-HM-03  four tiles, their labels, their subtitles, their 84x84 icon boxes and their #366 ink scales,
//             measured BEFORE any tap
//   US-HM-04  every tile is reachable and hit-testable, including the bottom row at 320x568 where it is 88px
//             below the fold at rest
//   US-HM-05  each tile opens ITS screen and Home comes down with it
//   US-HM-06  the ☰ and the 👋 open the menu sheet and the account sheet OVER Home, without dismounting it
//   US-HM-07  the streak card: it is absent on a fresh store, present once anything is earned, and its three
//             chips and goal bar read the stored numbers
//   US-HM-08  the Daily 3 card: three dots, ticked from ct_daily3, and "Continue: <lesson>" from ct_lastlesson
//   US-HM-09  the coach line is one row of three spans and it changes to the at-risk wording when the streak is
//             at risk
//   US-HM-10  the foot of the column - the look row, the dev row and the build stamp - is reachable
//
// PINNED, NOT SELF-COMPARED - the #381 rule that 10-gameover.js, 46-play.js and 39-pz-streak.js were all fixed
// for. A screen compared only against itself is true of a screen that has been wrong since before its first
// sample. If a deliberate change moves one of these numbers, move it HERE with the change; never re-pin it to
// whatever the build now happens to produce. NC2 below is the proof this matters on THIS screen.
//
// THE FIVE MEASUREMENT RULES, AND WHERE EACH ONE BITES HERE
//  1. #root carries overflow-y:auto BY DESIGN (index.html: "The app scrolls inside here if its content ever
//     overflows - the page never does"), so document.scrollingElement NEVER scrolls in this app. Nothing in this
//     file reads docScrollY to conclude anything. Measured and recorded so the next author does not have to
//     rediscover it: at 320x568 L.over() reads over:0 and docScroll:0 WHILE the Home overlay still has 304px of
//     travel in it. A check that read the document would call the bottom half of this screen - the Review tile,
//     the Play tile, the look row, the build stamp - unreachable. That is the exact shape of the two false P0s.
//     Reach is measured by finding the USER-scrollable ancestor, scrolling IT, re-reading the rect, and then
//     hit-testing with document.elementFromPoint at the centre of the visible area.
//  2. getBoundingClientRect() includes CSS transforms. Nothing on Home is transformed today and no piece box is
//     measured anywhere in this file; the tiles are plain buttons and the icons are <span data-ct="tile-ic-*">.
//  3. locator.click() auto-scrolls its target into view, so a control a thumb cannot reach passes for the
//     harness. EVERY tile rect in block B is taken before anything on this screen is tapped, and every drive tap
//     in this file is either an in-page el.click() (honest about being programmatic) or a raw mouse.click at a
//     rect measured first.
//  4. L.over() walks only the STATIC children of #root and is therefore blind to position:fixed - and the whole
//     Home screen IS one (chess.jsx:4312, zIndex 500). So over() <= 0 proves NOTHING about this screen, and a
//     gate built on it would be measuring the DISCOVER screen rendered underneath. TC-HM-005 asserts that
//     blindness out loud rather than leaving it as a trap: over() reads 0 at all four geometries while the
//     overlay's own travel is 304 / 142 / 13 / 0.
//  5. The bundle stamp is printed by lib.js on every launch and read back with b.stamp() in block A. If a run's
//     output does not name the bundle it measured, the numbers in it are not evidence.
//
// AND A SIXTH, SPECIFIC TO THIS SCREEN AND NEW: THE DISCOVER SCREEN IS IN THE DOM UNDERNEATH. Home is an overlay
// drawn over Discover, so Discover's own ☰ and its four group cards are live DOM nodes at every moment Home is
// up. Measured at 375x730: two buttons whose text is exactly "☰" - the Home one at 259,14 (46x46) and Discover's
// at 334,4 (38x30) - and lib's tapText()/drive tapBtn() both choose the SMALLEST matching element, which is
// Discover's. A gate that addresses anything on Home by rendered text alone will sooner or later tap a control
// the user cannot see or reach. Everything in this file is therefore scoped inside the overlay or addressed by
// data-ct, and TC-HM-008 asserts the hit test both ways round.
//
// NEGATIVE CONTROLS - SIX, ALL RUN, because a green that has never been disproved is worth nothing and two gates
// in this repo were caught passing their own breakage on 2026-09-14. Each is a one-line edit to a SCRATCH copy
// of chess.jsx, built to a trial bundle OUTSIDE the repo with CT_OUT and served through CT_APP; chess.jsx was
// restored and md5-verified after every build and the repo is untouched. BASELINE BOTH WAYS: 158 pass / 0 fail
// on the committed #398 AND on a #921 built from chess.jsx at fdb8c0b. Runtime 1m46s over four geometries.
// Results below are the runs against THIS file, not against a draft of it.
//   NC1  the Home overlay  overflowY:'auto' -> 'hidden'   (chess.jsx:4312)
//        -> blocks A,B,C: 85 pass, 11 fail. THIS IS THE ONE THAT MATTERS, and it discriminates in the right
//           direction. Every AT-REST number stays byte-identical: TC-HM-004 (872px of content, 304px of travel),
//           TC-HM-008 (every card's top and height) and TC-HM-016 (every tile's rect) stay GREEN at all four
//           geometries, because scrollHeight does not care whether the box can scroll. Only the REACH assertions
//           move, to onScreen:false and hit:false - TC-HM-001 at all four, TC-HM-019/020/021 at the two
//           geometries where the foot of the column is genuinely off screen, and TC-HM-018 at 320x568 ONLY.
//           That last one is worth saying out loud rather than counting as coverage: at 375x730 and above all
//           four tiles are already on screen at rest, so the tile-reach claim is VACUOUS there and stays green
//           on a build with no scroller at all. A reachability assertion is only a test where something is
//           genuinely out of reach. This is the proof the gate tests reachability and not position.
//   NC2  the tile icon box  84*(hbig?1.32:(hLand?1.74:1)) -> 70*(...)   (chess.jsx:4374)
//        -> blocks A,B: 65 pass, 15 fail, and it is the #381 lesson on this screen. TC-HM-014 goes first
//           (70x70 against 84x84, all four geometries) - and then the whole column goes with it: the tiles lose
//           28px of height, so the coach line moves 656 -> 628, the dev row 795 -> 767, the build stamp
//           839 -> 811 and the overlay's scrollHeight 872 -> 844. TC-HM-008 red at all four and TC-HM-004 at
//           three (at 430x932 the content is shorter than the screen either way, so scrollHeight is the
//           viewport on both bundles and that one is correctly unmoved). 14px off an icon silently reflows
//           every card beneath it, and nothing that compared this screen with itself would have noticed.
//   NC3  the NEW HERE guard  const isNew=!(pzXP>0||…) -> const isNew=true   (chess.jsx:4324)
//        -> block E: 32 pass, 2 fail. Only TC-HM-037, the EARNED signature, at both geometries. The fresh-store
//           block stays green throughout and correctly so: on a fresh store the card is supposed to be there,
//           so that half of the claim is vacuous under this control.
//   NC4  the goal bar  const _pct=Math.max(0,Math.min(1,_cnt/DAILY_GOAL)) -> const _pct=1   (chess.jsx:4323)
//        -> block E: 32 pass, 2 fail. Only TC-HM-040 - the 40% assertion - at both geometries. TC-HM-041, the
//           100%-and-green one, stays GREEN, which is exactly why TC-HM-040 exists: a bar pinned only at its
//           full value passes on a bar that is always full.
//   NC5  the tiles array: the Review and Play entries swapped   (chess.jsx:4350-4351)
//        -> block B: 24 pass, 12 fail. TC-HM-012 (order), TC-HM-013 (subtitles) and TC-HM-016 (the pinned
//           rects), at all four geometries. TC-HM-011 (arity) and TC-HM-015 (ink) stay green and should: the
//           count is unchanged and each ink scale travels with its own glyph.
//           AND THIS CONTROL CAUGHT A DEFECT IN THIS GATE, which is the reason to run controls at all. The
//           first version of TILES() mapped over a hardcoded ['learn','puzzle','analyze','play'] and looked
//           each tile up by its hook, so TC-HM-012's claim "in that DOM ORDER" was IMPOSED BY THE HELPER and
//           NC5 left it green - only the pinned rects moved. A helper that sorts its own input cannot test
//           order. It now walks document.querySelectorAll('[data-ct^="tile-ic-"]') in document order.
//   NC6  THE FIX, RUN AS A CONTROL. _newhere  onClick={()=>selectOpening(start)}
//                                          -> onClick={()=>{setHomeScreen(false);selectOpening(start);}}
//        -> block F: 7 pass, 2 fail. ONLY TC-HM-050, at both geometries. This is deliberate: TC-HM-050 is the
//           defect's own tripwire. When the build session fixes the NEW HERE handler, that one line goes red,
//           and that red IS the confirmation the fix landed. Flip it then; do not flip it before.
//
// RUNTIME 1m46s at four geometries, thirty browser launches, well inside gates.sh's 900s per-gate timeout.
// CT_HM_BLOCKS=A,B runs a subset; see the note above L.run(). No engine runs on this screen, so there is no
// Stockfish allowance here and zero app errors means zero.
// ── LANDED IN THE REPO AT #411, AND WHAT WAS RE-MEASURED RATHER THAN CITED ───────────────────────────────────
// This file was published COMPLETE in the authoring lane's document (tracker artifact, docs/home-lane, "The
// gate, in full - paste as-is. 158 pass / 0 fail, four geometries") on 2026-09-15 against bundle #398, and sat
// outside git for twelve builds - which is flag standing-a-c2-gates-claimed-not-in-git, and the reason a fresh
// clone did not have it. Pasted here unchanged. Two things were then checked in THIS repo, because a claim
// carried in a document is not evidence in a suite:
//
//   THE BASELINE STILL HOLDS. 158 pass / 0 fail on #410 (app.js md5 b08736511d71), twelve builds after the run
//   that authored it. Nothing on Home has moved since #398.
//
//   ONE OF ITS SIX CONTROLS WAS RE-RUN HERE, NOT TAKEN ON TRUST - NC2, the tile icon box 84 -> 70, built as a
//   one-line trial bundle (md5 cfe6b6e31f65 via CT_OUT, chess.jsx md5-verified restored to
//   3832598c243fee38793f1487319996d5 after). It bites, and it bites harder than the document says: 27 red on
//   the full gate, across exactly the families the document names - TC-HM-014 x4 (the icon box itself),
//   TC-HM-016 x4 (every tile's rect), TC-HM-008 x4 (every card's top), TC-HM-004 x3 (the column's height and
//   travel, correctly NOT at 430x932, where the content is shorter than the screen either way) and the reach
//   assertions at 320x568.
//   THE DOCUMENT RECORDS "15 red", AND THAT NUMBER IS A SUBSET RUN. Measured: `CT_HM_BLOCKS=A,B` gives exactly
//   15 red on the same bundle (and 80/0 on the shipped one), so the published count was taken with the run
//   restricted to two blocks and printed as a bare number. Same family as the thin-gatelog finding at #405 and
//   gate 47's wrong control line numbers at #399: a recorded control result is only as good as the SCOPE it
//   names, and this one did not name it. NC1 and NC3..NC6 remain the lane's recorded results, re-run by nobody
//   here - said plainly rather than counted as coverage.
//
// ── ALL SIX RECORDED CONTROLS, RE-RUN HERE AT #412 EXCEPT ONE, AND TWO OF THE SIX COUNTS ARE SUBSET RUNS ─────
// #411 pasted this file and re-ran ONE control. #412 re-ran four more, each as a one-line trial bundle via
// CT_OUT with chess.jsx md5-verified restored to 3832598c243fee38793f1487319996d5 after every build. The point
// was not to doubt the lane's work - it is to make its numbers reproducible, because a count with no scope
// cannot be checked by the next reader. Baseline throughout: 158 pass / 0 fail.
//
//   NC1  the Home overlay overflowY:'auto' -> 'hidden'        (md5 d78e49194100)
//        -> 11 red, THE DOCUMENT'S NUMBER TO THE LINE, and its named assertions exactly: TC-HM-001 x4 and
//           TC-HM-019/020/021 at 375x730 and 320x568, plus TC-HM-018 at 320x568 ONLY. Its own note is right
//           that at 375 and above all four tiles are on screen at rest, so that claim is vacuous there and
//           stays green on a build with no scroller at all - the document says so itself, which is the
//           opposite of the problem below.
//   NC3  const isNew=!(pzXP>0||...) -> const isNew=true       (md5 7fb8444a035e)  -> 2 red, TC-HM-037 x2. Exact.
//   NC4  the goal bar _pct -> 1                               (md5 9fe911030890)  -> 2 red, TC-HM-040 x2. Exact,
//        and TC-HM-041 (the 100%-and-green one) stays GREEN exactly as the document predicts: a bar pinned only
//        at its full value passes on a bar that is always full, which is why TC-HM-040 exists.
//   NC5  the tiles array, Review and Play swapped             (md5 41fcb9bc4146)
//        -> 14 red on the full gate where THE DOCUMENT RECORDS 12. Measured: CT_HM_BLOCKS=B gives exactly 12,
//           so that count is a block-B-only run. The two the subset hides are TC-HM-025 and TC-HM-026 in block
//           D - "the analyze tile opens Game review AND Home comes down with it" and the same for play - which
//           are the assertions that most directly prove the swap happened, because after it the analyze tile
//           opens Play. So the subset did not merely undercount; it dropped the most on-point failures.
//   NC2  the tile icon box 84 -> 70 (re-run at #411)          -> 27 red on the full gate where the document
//        records 15, and CT_HM_BLOCKS=A,B gives exactly 15. Same shape as NC5.
//   NC6  NOT RE-RUN, and said so rather than counted: it reverts a shipped fix to trip its own tripwire
//        (TC-HM-050), and its 2-red claim is the narrowest of the six. The lane's recorded result stands.
//
// SO: FOUR OF THE FIVE COUNTS CHECKED REPRODUCE, AND TWO OF THEM WERE TAKEN AT A SCOPE THE DOCUMENT DOES NOT
// NAME. NC1, NC3 and NC4 are exact and their own notes even name their vacuities. NC2 and NC5 are correct
// numbers for a restricted run, printed as bare counts that read as the whole gate. The gate is sound either
// way - it goes red on all five breakages - and what was unfalsifiable was the RECORD, not the coverage.
//
// ── CONTROL-RECORD lines for gates/control-audit.js (#418). Converted from this gate's own control block
// WITHOUT re-running anything, which is legitimate only because that block was itself re-run and corrected
// at #412 - the pass that found two of its six published counts were SUBSET runs. Those two are recorded
// here under their real scopes rather than as full-scope numbers, which is exactly what the field is for.
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=158 red=11 scope=full how=Home overlay overflowY auto->hidden, trial md5 d78e49194100
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=158 red=2 scope=full how=NEW HERE guard isNew forced true, trial md5 7fb8444a035e
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=158 red=2 scope=full how=goal bar _pct forced to 1, trial md5 9fe911030890
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=158 red=14 scope=full how=tiles array Review and Play swapped, trial md5 41fcb9bc4146
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=158 red=27 scope=full how=tile icon box 84->70, trial md5 cfe6b6e31f65
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=15 red=15 scope=blocks:A,B how=tile icon box 84->70 with CT_HM_BLOCKS=A,B - the published 15 that the full gate gives as 27
// CONTROL-RECORD: 08d8cb0 2026-09-17 total=12 red=12 scope=blocks:B how=Review and Play swapped with CT_HM_BLOCKS=B - the published 12 that the full gate gives as 14
'use strict';
const L=require('../lib');
const H=require('../drive/home');

// ── the screen under test ────────────────────────────────────────────────────────────────────────────────
// The Home overlay has no data-ct of its own (chess.jsx:4312). position:fixed + zIndex 500 is its unique mark,
// and it is the same identification gates/drive/home.js uses, kept identical on purpose so the two cannot drift.
const HOME=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const st=getComputedStyle(ov),r=ov.getBoundingClientRect();
  const col=[...ov.children].find(x=>x.tagName==='DIV'&&/max-width/.test(x.getAttribute('style')||''));
  return {pos:st.position,z:ov.style.zIndex,overflowY:st.overflowY,
    x:r1(r.left),y:r1(r.top),w:r1(r.width),h:r1(r.height),
    sh:ov.scrollHeight,ch:ov.clientHeight,travel:ov.scrollHeight-ov.clientHeight,
    colW:col?r1(col.getBoundingClientRect().width):null,nkids:col?col.children.length:null,
    vw:innerWidth,vh:innerHeight,
    docScrollY:Math.round(scrollY),                                      // rule 1: recorded, never concluded from
    docScroll:document.documentElement.scrollHeight-document.documentElement.clientHeight,
    docScrollW:document.documentElement.scrollWidth};});

// The column's direct children, in paint order, as a SIGNATURE. This is the assertion that makes a card
// appearing or disappearing a red line: three blocks in this screen's source (_risk, _coach, _continue) are
// computed and never rendered, so "eight children, these eight" is the only thing that would notice one of them
// being wired back in - or a fifth card being wired in beside them.
const CARDS=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const col=[...ov.children].find(x=>x.tagName==='DIV'&&/max-width/.test(x.getAttribute('style')||''));
  if(!col)return null;
  const id=(k)=>{const t=(k.innerText||'').replace(/\s+/g,' ').trim();
    if(k.getAttribute('data-ct'))return k.getAttribute('data-ct');
    if(!t)return 'intro';                                                // the animated title block: no text at all
    if(/^🔥 /.test(t))return 'streak';
    if(/^Daily 3/.test(t))return 'daily3';
    if(/^NEW HERE/.test(t))return 'newhere';
    if(/Discover/.test(t)&&/Puzzles/.test(t)&&/Review/.test(t)&&/Play/.test(t))return 'tiles';
    if(/^(🎓|⚠️)/.test(t))return 'coachline';
    if(/^Colours & pieces/.test(t))return 'lookrow';
    return 'UNKNOWN:'+t.slice(0,28);};
  return [...col.children].map(k=>{const r=k.getBoundingClientRect();
    return {id:id(k),tag:k.tagName.toLowerCase(),y:r1(r.top),h:r1(r.height),w:r1(r.width)};});});

// THE MEASUREMENT (rule 1's second half). USER-scrollable ancestors only - computed overflow auto|scroll AND
// real room to move - the scroll is actually PERFORMED, the rect re-read, the centre of the VISIBLE area
// hit-tested, and every scroll position put back so the next measurement starts from rest. Never
// scrollIntoView(): script can scroll an overflow:hidden box and a finger cannot, which is the fault
// 40-reachability.js's own first version had.
const REACH=(b,sel)=>b.page.evaluate((s)=>{
  const r1=(n)=>Math.round(n*10)/10;
  const el=s[0]==='#'?(()=>{const ic=document.querySelector('[data-ct="tile-ic-'+s.slice(1)+'"]');return ic?ic.closest('button'):null;})()
                     :document.querySelector(s);
  if(!el)return {found:false};
  const r0=el.getBoundingClientRect();
  const scs=[];let p=el.parentElement;
  while(p&&p!==document.documentElement){const st=getComputedStyle(p);
    if(/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1)scs.push({el:p,was:p.scrollTop});
    p=p.parentElement;}
  for(let pass=0;pass<2;pass++)for(let i=scs.length-1;i>=0;i--){
    const q=scs[i].el,pr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
    q.scrollTop=Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop+(er.bottom-pr.bottom)+8));}
  const r=el.getBoundingClientRect();
  const hx=Math.round(r.left+r.width/2),hy=Math.round((Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2);
  const hit=document.elementFromPoint(hx,hy);
  const out={found:true,scrollers:scs.length,
    restTop:r1(r0.top),restBottom:r1(r0.bottom),restOn:r0.top>=-0.5&&r0.bottom<=innerHeight+0.5,
    top:r1(r.top),bottom:r1(r.bottom),onScreen:r.top>=-0.5&&r.bottom<=innerHeight+0.5,
    hit:!!(hit&&(hit===el||el.contains(hit))),
    hitWas:hit?(hit.tagName.toLowerCase()+(hit.getAttribute('data-ct')?'['+hit.getAttribute('data-ct')+']':'')):null,
    vh:innerHeight};
  scs.forEach(s2=>{s2.el.scrollTop=s2.was;});
  return out;},sel);

// The four tiles, addressed by their icon hooks (chess.jsx:4374, data-ct={'tile-ic-'+k}) rather than by text,
// so the group cards on the Discover screen UNDER the overlay cannot be picked up by mistake. data-ink is the
// #366 y3b ink-match scale the app computes per glyph on this device; it is pinned because it is the only
// number that says the icon was measured rather than guessed.
// WALKED IN DOCUMENT ORDER, not fetched key by key. The first version of this helper mapped over a hardcoded
// ['learn','puzzle','analyze','play'] and looked each one up by its hook - which meant TC-HM-012's claim "in
// that DOM ORDER" was imposed by the helper rather than measured, and NC5 (Review and Play swapped in the
// source) left it GREEN while only the pinned rects moved. A helper that sorts its own input cannot test order.
const TILES=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  return [...document.querySelectorAll('[data-ct^="tile-ic-"]')].map(ic=>{
    const k=ic.getAttribute('data-ct').replace('tile-ic-','');
    const btn=ic.closest('button'),box=ic.parentElement;
    if(!btn)return {k,found:false};
    const r=btn.getBoundingClientRect(),br=box.getBoundingClientRect();
    const lines=(btn.innerText||'').trim().split('\n').map(x=>x.trim()).filter(Boolean);
    return {k,found:true,glyph:(ic.innerText||'').trim(),ink:ic.getAttribute('data-ink'),
      label:lines[1]||'',sub:lines[2]||'',
      x:r1(r.left),y:r1(r.top),w:r1(r.width),h:r1(r.height),right:r1(r.right),bottom:r1(r.bottom),
      boxW:r1(br.width),boxH:r1(br.height)};});});
const KS=['learn','puzzle','analyze','play'];

// Everything inside the overlay that escapes the viewport sideways. Nothing on Home scrolls horizontally on
// purpose, so unlike gate 45 there is no scroller exemption here: any element past an edge is a finding.
// Vertical spill inside the overlay's own scroller is fine and is what block C measures; horizontal spill past
// the viewport cannot be recovered on a phone (flag sweep372-other-lines-320).
const HSPILL=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;const vw=innerWidth,bad=[];
  for(const e of ov.querySelectorAll('*')){
    const st=getComputedStyle(e);if(st.display==='none'||st.visibility==='hidden')continue;
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)continue;
    if(r.right>vw+0.5||r.left<-0.5)bad.push({t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,26),l:r1(r.left),r:r1(r.right)});}
  return {vw,scrollW:document.documentElement.scrollWidth,bad:bad.slice(0,5)};});

// The three blocks this screen's source builds and never paints. Each is looked for by a mark that belongs to
// IT and to nothing else on the screen, because the coach line carries wording close to two of them:
//   _risk      the banner with the 30px 🔥, the "<n>-day streak at risk" heading and its own ✕ Dismiss button
//   _coach     the "YOUR COACH" card with the Coach avatar and the PRO 🔒 pill
//   _continue  the card headed "CONTINUE" with the last lesson's name and a ›
const DEAD=(b)=>b.page.evaluate(()=>{
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;const t=ov.innerText||'';
  const col=[...ov.children].find(x=>x.tagName==='DIV'&&/max-width/.test(x.getAttribute('style')||''));
  return {riskHeading:/\d+-day streak at risk/.test(t),
    riskBody:/Do one lesson or puzzle today to keep it going/.test(t),
    riskDismiss:!!ov.querySelector('button[aria-label="Dismiss"]'),
    yourCoach:/YOUR COACH/i.test(t),
    continueCard:!!(col&&[...col.children].some(k=>/^CONTINUE$/i.test(((k.innerText||'').trim().split('\n')[0])||'')))};});

const STREAK=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const card=[...ov.querySelectorAll('div')].find(x=>x.getAttribute('title')==="Today's progress");
  if(!card)return {present:false};
  const r=card.getBoundingClientRect();
  const chips=[...card.children].filter(c=>/^1( 1 0%)?$/.test(c.style.flex||'')).map(c=>(c.innerText||'').replace(/\s+/g,' ').trim());
  const outer=[...card.querySelectorAll('div')].find(d=>d.style.height==='4px');
  return {present:true,y:r1(r.top),h:r1(r.height),w:r1(r.width),chips,
    bar:outer&&outer.firstElementChild?{fill:outer.firstElementChild.style.width,bg:outer.firstElementChild.style.background}:null};});

const DAILY3=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const btn=[...ov.querySelectorAll('button')].find(x=>/^Daily 3/.test((x.innerText||'').trim()));
  if(!btn)return null;const r=btn.getBoundingClientRect();
  const dots=[...btn.querySelectorAll('span')].filter(s=>s.style.width==='18px'&&s.style.height==='18px');
  return {y:r1(r.top),h:r1(r.height),w:r1(r.width),
    sub:((btn.innerText||'').replace(/\s+/g,' ').trim().match(/^Daily 3 ([^✓]*?)(?: ✓| \d| Continue| puzzle| 1 lesson)/)||[])[1]||null,
    full:(btn.innerText||'').replace(/\s+/g,' ').trim(),
    n:dots.length,marks:dots.map(s=>(s.innerText||'').trim()),
    labels:dots.map(s=>s.nextElementSibling?(s.nextElementSibling.innerText||'').trim():null)};});

// The coach line: one row of exactly three spans - the glyph, the message, and the affordance word. Asserted as
// a shape plus the affordance, not as a pinned sentence: the message is the coach's recommendation and depends
// on the lesson library, so pinning it would turn this red for a library edit that is not a regression. What IS
// pinned is that a fresh store gets the new-user recommendation and not the "Your coach is ready" fallback.
const COACHLINE=(b)=>b.page.evaluate(()=>{
  const r1=(n)=>Math.round(n*10)/10;
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const el=[...ov.querySelectorAll('button')].find(x=>/^(🎓|⚠️)/.test((x.innerText||'').trim()));
  if(!el)return null;const r=el.getBoundingClientRect();
  const mid=el.children[1];
  return {y:r1(r.top),h:r1(r.height),w:r1(r.width),
    spans:[...el.children].map(s=>(s.innerText||'').trim()),
    sw:mid?mid.scrollWidth:-1,cw:mid?mid.clientWidth:-1};});

// (rule 3) a drive tap inside the overlay: programmatic, deliberately NOT locator.click(), and never evidence of
// reachability - REACH() answers that, and it is asserted separately. Scoped to the overlay so the Discover
// screen underneath cannot be tapped by mistake.
const TAP=async(b,re,wait)=>{const ok=await b.page.evaluate((s)=>{
    const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
    if(!ov)return false;const r=new RegExp(s);
    const el=[...ov.querySelectorAll('button')].find(x=>r.test((x.innerText||'').replace(/\s+/g,' ').trim()));
    if(!el)return false;el.click();return true;},re.source);
  await b.settle(wait==null?900:wait);return ok;};
const TAPTILE=async(b,k,wait)=>{await b.page.evaluate((kk)=>{const ic=document.querySelector('[data-ct="tile-ic-'+kk+'"]');
    if(ic)ic.closest('button').click();},k);await b.settle(wait==null?1200:wait);};
const homeUp=(b)=>b.page.evaluate(()=>!![...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500'));
const rootText=(b)=>b.page.evaluate(()=>(document.getElementById('root').innerText||'').replace(/\s+/g,' ').trim());
const LS=(b,k)=>b.page.evaluate((k)=>{try{return localStorage.getItem(k);}catch(e){return 'THREW';}},k);
// seeded states: launch with a store and go to Home WITHOUT drive/home.js's fresh(), which nulls ct_daily,
// ct_daily3, ct_lastlesson and the puzzle progress - the four keys these blocks are seeding.
const SEEDED=async(b)=>{await b.home();await H.scrollHome(b,'top');await b.settle(250);};
const near=(a,c,tol)=>a!=null&&c!=null&&Math.abs(a-c)<(tol==null?0.6:tol);
const dstr=(d)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const TODAY=dstr(new Date());
const YDAY=(()=>{const d=new Date();d.setDate(d.getDate()-1);return dstr(d);})();

// ── MEASURED, #398 and #921 alike, on a FRESH store ───────────────────────────────────────────────────────
// colW is min(vw-36, 420): the overlay's own 18px side padding, uncapped at every phone width in this set.
// sh is the overlay's scrollHeight. It is the same 872 at 320 and 375 because the tile subtitles wrap at both,
// 857 at 390 where they fit on one line, and equal to the viewport at 430 where the content is shorter than the
// screen and there is nothing to scroll.
const M={
  se      :{colW:284,sh:872,travel:304,intro:{y:12,h:94},daily3:{y:106,h:68},newhere:{y:174,h:100},
            tiles:{y:290,h:366},coach:{y:656,h:39},look:{y:713,h:30},devrow:{y:795},build:{y:839}},
  kunal730:{colW:339,sh:872,travel:142,intro:{y:12,h:94},daily3:{y:106,h:68},newhere:{y:174,h:100},
            tiles:{y:290,h:366},coach:{y:656,h:39},look:{y:713,h:30},devrow:{y:795},build:{y:839}},
  '390'   :{colW:354,sh:857,travel:13, intro:{y:12,h:94},daily3:{y:106,h:68},newhere:{y:174,h:100},
            tiles:{y:290,h:350.5},coach:{y:640.5,h:39},look:{y:697.5,h:30},devrow:{y:779.5},build:{y:823.5}},
  '430'   :{colW:394,sh:932,travel:0,  intro:{y:12,h:94},daily3:{y:106,h:68},newhere:{y:174,h:102},
            tiles:{y:292,h:357.8},coach:{y:649.8,h:39},look:{y:706.8,h:30},devrow:{y:750.8},build:{y:794.8}}};
// Per-tile rects, measured before any tap. The two columns and the two rows are the whole grid: gridTemplate
// '1fr 1fr' with a 16px gap, so the right column's x is 18 + w + 16 at every width.
const T={
  se      :{learn:{x:18,y:290,w:134,h:175},  puzzle:{x:168,y:290,w:134,h:175},
            analyze:{x:18,y:481,w:134,h:175},play:{x:168,y:481,w:134,h:175}},
  kunal730:{learn:{x:18,y:290,w:161.5,h:175},puzzle:{x:195.5,y:290,w:161.5,h:175},
            analyze:{x:18,y:481,w:161.5,h:175},play:{x:195.5,y:481,w:161.5,h:175}},
  '390'   :{learn:{x:18,y:290,w:169,h:176},  puzzle:{x:203,y:290,w:169,h:176},
            analyze:{x:18,y:482,w:169,h:158.5},play:{x:203,y:482,w:169,h:158.5}},
  '430'   :{learn:{x:18,y:292,w:189,h:180.5},puzzle:{x:223,y:292,w:189,h:180.5},
            analyze:{x:18,y:488.5,w:189,h:161.3},play:{x:223,y:488.5,w:189,h:161.3}}};
const LABELS=['Discover','Puzzles','Review','Play'];
const SUBS=['Openings, gambits & endgames','890+ tactical puzzles','Free unlimited game reviews','vs Computer or Human'];
const INK={learn:'1',puzzle:'1',analyze:'0.99',play:'1.11'};   // #366 y3b, per glyph, identical at every width
// The coach line's middle span is nowrap with an ellipsis, so whether the recommendation survives is a question
// about the WIDTH. Measured with the fresh-store recommendation, "New to chess? Lock in the endgame basics":
// 240px of text in a 193px box at 320, and 248 in 248 at 375 - which fits with ZERO slack. Pinned both ways.
const CLIP={se:{clipped:true},kunal730:{clipped:false}};
const FRESH_SIG=['intro','daily3','newhere','tiles','coachline','lookrow','home-devrow','home-build'];
const EARNED_SIG=['intro','streak','daily3','tiles','coachline','lookrow','home-devrow','home-build'];
const GEOS=['se','kunal730','390','430'];

// CT_HM_BLOCKS=A,B runs only the named blocks. It exists for the NEGATIVE CONTROLS - proving six one-line
// breakages red means six gate runs, and this file launches thirty browsers. Unset (the suite's own case, and
// gates.sh's) runs everything, so the suite can never be selective by accident. Same idiom as 45-play-setup.js's
// CT_PS_BLOCKS and 47-menu.js's CT_BLK.
const ONLY=(process.env.CT_HM_BLOCKS||'').split(',').map(x=>x.trim()).filter(Boolean);
const blk=(k)=>!ONLY.length||ONLY.indexOf(k)>=0;

L.run(async()=>{

// =========================================================================================================
// HM-A  The overlay, the column, and what is and is not on this screen.  TC-HM-001 … TC-HM-008.
// Four geometries: the 568 floor, Kunal's real phone, the wider column, and 430x932 - the one width where the
// Home column is shorter than the screen and nothing scrolls at all. That last one is kept deliberately: it is
// where every reachability claim below is VACUOUS, and a gate that only ran there would prove nothing.
// =========================================================================================================
if(blk('A'))for(const geo of GEOS){
  const W=M[geo],vw=L.GEOS[geo].w,vh=L.GEOS[geo].h;
  const b=await L.launch({geo,name:'home-a-'+geo});await b.open();
  await H.states['home'](b);
  L.note(geo+': bundle stamp in the page = '+(await b.stamp()));

  const h=await HOME(b);
  L.say(!!h&&h.pos==='fixed'&&h.z==='500'&&/auto|scroll/.test(h.overflowY),
    geo+': TC-HM-001 Home is a position:fixed layer at zIndex 500 that scrolls ITSELF (overflowY '+(h&&h.overflowY)+'). It has no data-ct of its own, so that pair is its identity - and it is why L.over(), which walks only the STATIC children of #root, cannot see this screen at all',h);
  L.say(!!h&&near(h.x,0)&&near(h.y,0)&&near(h.w,vw)&&near(h.h,vh),
    geo+': TC-HM-002 and it covers the whole viewport ('+(h&&h.w)+'x'+(h&&h.h)+' at 0,0), so nothing behind it is on screen even though it is all still in the DOM',h);
  L.say(!!h&&near(h.colW,W.colW),
    geo+': TC-HM-003 the content column is '+W.colW+' wide - min(viewport - 36, 420), the overlay\'s own 18px side padding, uncapped at every phone width in this set',{measured:h&&h.colW,want:W.colW});
  L.say(!!h&&h.sh===W.sh&&h.travel===W.travel,
    geo+': TC-HM-004 the column is '+W.sh+'px of content in a '+vh+'px screen, so the overlay has '+W.travel+'px of travel. PINNED: a screen compared only against itself is true of a screen that has been wrong since before its first sample (#381)',{sh:h&&h.sh,travel:h&&h.travel,want:W});

  // --- TC-HM-005: rule 1 and rule 4, asserted out loud rather than left as a trap.
  const ov=await b.over();
  L.say(ov.over<=0&&ov.docScroll===0&&ov.scrollY===0,
    geo+': TC-HM-005 L.over() reads over '+ov.over+' and docScroll '+ov.docScroll+' on this screen - and the overlay still has '+W.travel+'px of travel in it. #root carries overflow-y:auto BY DESIGN and the Home overlay is a fixed child of it, so BOTH of these numbers are blind here. A check that read either one would call the bottom half of this screen unreachable, which is the exact shape of the two false P0s',{over:ov,overlayTravel:W.travel});
  const sp=await HSPILL(b);
  L.say(!!sp&&sp.bad.length===0&&sp.scrollW===vw,
    geo+': TC-HM-006 nothing on Home escapes the viewport sideways and the document gains no horizontal scroll (scrollWidth '+(sp&&sp.scrollW)+' = '+vw+'). Measured over every painted element in the overlay with no scroller exemption, because nothing here scrolls sideways on purpose - vertical spill inside the overlay is fine and recoverable, horizontal spill past the edge is not',sp);

  // --- TC-HM-007: the card set AND its order. This is the assertion that notices a card appearing.
  const cards=await CARDS(b);
  L.say(!!cards&&cards.map(c=>c.id).join(',')===FRESH_SIG.join(','),
    geo+': TC-HM-007 on a fresh store the column is exactly '+FRESH_SIG.join(' · ')+', in that order. Asserted as a signature rather than as "the cards I expected are present", so a NEW card - or one of the three dead blocks below being wired back in - is a red line rather than a silent change of screen',cards&&cards.map(c=>c.id+'@'+c.y));
  const byId=Object.fromEntries((cards||[]).map(c=>[c.id,c]));
  L.say(!!byId.intro&&near(byId.intro.y,W.intro.y)&&near(byId.intro.h,W.intro.h)
      &&!!byId.daily3&&near(byId.daily3.y,W.daily3.y)&&near(byId.daily3.h,W.daily3.h)
      &&!!byId.newhere&&near(byId.newhere.y,W.newhere.y)&&near(byId.newhere.h,W.newhere.h)
      &&!!byId.tiles&&near(byId.tiles.y,W.tiles.y)&&near(byId.tiles.h,W.tiles.h,1),
    geo+': TC-HM-008 and each card is where it was measured - intro '+W.intro.y+'/'+W.intro.h+', Daily 3 '+W.daily3.y+'/'+W.daily3.h+', NEW HERE '+W.newhere.y+'/'+W.newhere.h+', tiles '+W.tiles.y+'/'+W.tiles.h+'. Pinned tops and heights are what sees a padding change: NC2 moved every card below the tiles 28px and nothing that compared the screen with itself noticed',
    {measured:cards&&cards.map(c=>c.id+' '+c.y+'/'+c.h),want:W});

  // --- TC-HM-009: the three blocks the source builds and never paints. RECORDED, NOT ENDORSED.
  const dead=await DEAD(b);
  L.say(!!dead&&!dead.riskHeading&&!dead.riskBody&&!dead.riskDismiss&&!dead.yourCoach&&!dead.continueCard,
    geo+': TC-HM-009 RECORDED, NOT ENDORSED - the streak-at-risk banner, the "YOUR COACH" card and the "CONTINUE" card are built by this screen and never rendered. All three are assigned inside the Home IIFE (chess.jsx:4325 _risk, 4362 _coach, 4371 _continue) and neither of the two returns below them mentions one: the portrait return is {_streak}{_daily3}{_newhere}{_tiles}{_coachline} and the landscape return is the same five in two columns - whose own comment at chess.jsx:3914 says "Continue/streak left". The comment is true of an intention, not of the build. NEEDS-KUNAL HM-K1/K2/K3',dead);

  // --- TC-HM-010: the Discover screen is live underneath. Both halves of the hit test.
  const hams=await b.page.evaluate(()=>{
    const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
    return [...document.querySelectorAll('button')].filter(x=>(x.innerText||'').trim()==='☰').map(x=>{
      const r=x.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {ct:x.getAttribute('data-ct'),inHome:!!(ov&&ov.contains(x)),
        area:Math.round(r.width*r.height),own:!!(hit&&(hit===x||x.contains(hit)))};});});
  const inHome=hams.filter(x=>x.inHome),under=hams.filter(x=>!x.inHome);
  L.say(hams.length===2&&inHome.length===1&&inHome[0].ct==='home-menu'&&inHome[0].own===true
      &&under.length===1&&under[0].own===false,
    geo+': TC-HM-010 there are TWO buttons reading "☰" - Home\'s own [data-ct="home-menu"], which a tap at its centre reaches, and the Discover screen\'s, which renders under the overlay and which a tap at its centre does NOT reach. Home is drawn over Discover, so Discover\'s whole header and its four group cards are live DOM nodes the entire time. The under-overlay one is the SMALLER of the two ('+(under[0]&&under[0].area)+' against '+(inHome[0]&&inHome[0].area)+'), and both lib.tapText() and drive tapBtn() choose the smallest match - so a gate that addressed anything on Home by rendered text alone would tap the control the user cannot see',hams);

  L.say(b.errs.length===0,geo+': zero app errors on Home',b.errs.slice(0,3));
  await b.shot('home-'+geo);
  await b.close();
}

// =========================================================================================================
// HM-B  The four tiles.  TC-HM-011 … TC-HM-018.
// These four buttons ARE the navigation of this app: there is no other route to Discover, Puzzles, Review or
// Play from a cold start. Every rect here is taken BEFORE anything on this screen is tapped (rule 3).
// =========================================================================================================
if(blk('B'))for(const geo of GEOS){
  const vw=L.GEOS[geo].w,vh=L.GEOS[geo].h,W=T[geo];
  const b=await L.launch({geo,name:'home-b-'+geo});await b.open();
  await H.states['home'](b);

  const t=await TILES(b);
  L.say(t.length===4&&t.every(x=>x.found),
    geo+': TC-HM-011 all four tile icon hooks are present - tile-ic-learn, tile-ic-puzzle, tile-ic-analyze, tile-ic-play. Addressed by data-ct and not by text, so the Discover group cards rendered UNDER this overlay cannot be picked up instead',t.map(x=>x.k+':'+x.found));
  L.say(t.map(x=>x.k).join(',')===KS.join(',')&&t.map(x=>x.label).join(',')===LABELS.join(','),
    geo+': TC-HM-012 the tiles are '+LABELS.join(' · ')+', in that DOM ORDER - which is the painted order, top-left to bottom-right. WALKED in document order rather than fetched key by key: the first version of this helper mapped over a hardcoded key list, so it imposed the order it claimed to be testing and NC5 walked straight past it. Order and not just arity',{ks:t.map(x=>x.k).join(','),labels:t.map(x=>x.label).join(',')});
  L.say(t.map(x=>x.sub).join('|')===SUBS.join('|'),
    geo+': TC-HM-013 and each carries its own subtitle - the only text on this screen that says what is behind a tile',t.map(x=>x.sub));
  L.say(t.every(x=>near(x.boxW,84)&&near(x.boxH,84)),
    geo+': TC-HM-014 every tile\'s icon box is 84x84 at every width - the tiles do not grow with the phone, the gaps do',t.map(x=>x.k+':'+x.boxW+'x'+x.boxH).join(' '));
  L.say(t.every(x=>x.ink===INK[x.k]),
    geo+': TC-HM-015 and each glyph carries its measured ink scale (#366 y3b: the app measures the glyph on THIS device rather than trusting the font) - 🔭 1, 🧩 1, 🔍 0.99, ♟️ 1.11, identical at all four widths',t.map(x=>x.k+':'+x.ink).join(' '));
  L.say(t.every(x=>near(x.x,W[x.k].x)&&near(x.y,W[x.k].y)&&near(x.w,W[x.k].w)&&near(x.h,W[x.k].h,1)),
    geo+': TC-HM-016 and each tile is the rect measured for THIS geometry, before any tap - '+JSON.stringify(W),{measured:t.map(x=>x.k+' '+x.x+','+x.y+' '+x.w+'x'+x.h),want:W});
  L.say(t.every(x=>x.x>=-0.5&&x.right<=vw+0.5),
    geo+': TC-HM-017 no tile hangs off either edge (left '+t[0].x+', right '+t[1].right+' against '+vw+'). This is the sweep372-other-lines-320 class - an element pinned to an absolute x fits at 375 and hangs off at 320, with no horizontal scroll to recover it',t.map(x=>x.x+'..'+x.right).join(' '));

  // --- TC-HM-018: reach. At 320x568 the bottom row is 88px below the fold at rest.
  const reaches=[];for(const k of KS)reaches.push(Object.assign({k},await REACH(b,'#'+k)));
  const below=reaches.filter(x=>!x.restOn).map(x=>x.k);
  L.say(reaches.every(x=>x.found&&x.onScreen&&x.hit),
    geo+': TC-HM-018 every tile can be brought fully on screen by scrolling the overlay - the one ancestor a finger can scroll - and document.elementFromPoint at the centre of its visible area then returns that tile. Below the fold at rest here: '+(below.length?below.join(', ')+' (Review and Play end at '+reaches[2].restBottom+' in a '+vh+'px screen)':'none, so this claim is VACUOUS at this geometry and proves nothing on its own'),reaches.map(x=>x.k+' rest '+x.restTop+'..'+x.restBottom+(x.restOn?' (on)':' (below)')+' -> '+x.top+'..'+x.bottom+' hit='+x.hit));

  L.say(b.errs.length===0,geo+': zero app errors across the tile sweep',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// HM-C  The foot of the column.  TC-HM-019 … TC-HM-022.
// The look row, the dev row and the build stamp sit at 713 / 795 / 839 in a 730px phone. 42-home-devrow.js
// already guards the two dev buttons; what is added here is the LOOK row, which is the only route to the board
// colours from Home, and the build stamp, which is what every bug report is read off.
// =========================================================================================================
if(blk('C'))for(const geo of GEOS){
  const W=M[geo],vh=L.GEOS[geo].h;
  const b=await L.launch({geo,name:'home-c-'+geo});await b.open();
  await H.states['home'](b);

  const look=await REACH(b,'[data-ct="home-look"]');
  const dev =await REACH(b,'[data-ct="home-devrow"]');
  const bld =await REACH(b,'[data-ct="home-build"]');
  const vac=(r)=>r.restOn?' (already on screen at this geometry, so the claim is vacuous here)':'';
  L.say(look.found&&near(look.restTop,W.look.y,1)&&look.onScreen&&look.hit,
    geo+': TC-HM-019 the "Colours & pieces" row sits at '+W.look.y+' at rest and is reachable and hit-testable'+vac(look)+'. It is the only route from Home to the board colours, and at 320x568 and 375x730 it is below the fold',look);
  L.say(dev.found&&near(dev.restTop,W.devrow.y,1)&&dev.onScreen&&dev.hit,
    geo+': TC-HM-020 the dev row sits at '+W.devrow.y+' and is reachable and hit-testable'+vac(dev),dev);
  L.say(bld.found&&near(bld.restTop,W.build.y,1)&&bld.onScreen&&bld.hit,
    geo+': TC-HM-021 and so is the build stamp at '+W.build.y+', which is the line every bug report is read off - unreachable, and nobody can tell you which bundle they are looking at'+vac(bld),bld);
  const stamp=await b.text('[data-ct="home-build"]');
  L.say(/^Build #\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET$/.test(stamp||''),
    geo+': TC-HM-022 and it reads a real stamp in the house format',stamp);
  await b.close();
}

// =========================================================================================================
// HM-D  Where the tiles and the chrome actually go.  TC-HM-023 … TC-HM-030.
// One geometry: these are state assertions, not layout ones, and the layout half is pinned per geometry above.
// Kunal's own phone.
// =========================================================================================================
if(blk('D')){
  const NAV=[
    ['learn',  /What do you want to learn\?/,               'Discover'],
    ['puzzle', /Rank 0 \/ 8 · 0 solved/,                    'the puzzle roadmap'],
    ['analyze',/Review any game, from anywhere/,            'Game review'],
    ['play',   null,                                        'the New Game setup sheet'],
  ];
  let n=23;
  for(const [k,re,what] of NAV){
    const b=await L.launch({geo:'kunal730',name:'home-d-'+k});await b.open();
    await H.states['home'](b);
    // CLAUDE.md, #393: a gate that throws on a missing element leaves every assertion after it unrun - a real
    // regression on a real build would stop this file at the first absence. Anything that NAVIGATES goes red on
    // its own line and the run carries on.
    let navErr=null;
    try{await TAPTILE(b,k,1400);}catch(e){navErr=String(e).slice(0,140);}
    L.say(!navErr,'375x730: the '+k+' tile could be tapped (navigation, not an assertion about where it goes)',navErr);
    const up=await homeUp(b),txt=await rootText(b);
    const sheet=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-sheet"]'));
    const ok=(k==='play')?(sheet&&!up):(re.test(txt)&&!up);
    L.say(ok,'375x730: TC-HM-0'+(n++)+' the '+k+' tile opens '+what+' AND Home comes down with it. Both halves matter: a tile that navigates but leaves the overlay up has loaded a screen nobody can see - which is exactly what TC-HM-040 below records happening to the NEW HERE card',{homeStillUp:up,setupSheet:sheet,saw:txt.slice(0,70)});
    L.say(b.errs.length===0,'375x730: zero app errors opening '+what,b.errs.slice(0,3));
    await b.close();
  }
  {
    const b=await L.launch({geo:'kunal730',name:'home-d-menu'});await b.open();await H.states['home'](b);
    let e1=null;try{await b.tapCt('home-menu',900);}catch(e){e1=String(e).slice(0,140);}
    L.say(!e1,'375x730: [data-ct="home-menu"] could be tapped (navigation, not an assertion)',e1);
    const st=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;
      const r=s.getBoundingClientRect();const hit=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+20));
      return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),overHome:!!(hit&&s.contains(hit))};});
    L.say(!!st&&st.overHome&&await homeUp(b),
      '375x730: TC-HM-027 ☰ opens [data-ct="menu-sheet"] OVER Home - the overlay stays mounted underneath and the sheet wins the hit test. #373 (audit A-04): Home had no way into the menu at all, because every other ☰ in the app sits under this overlay',st);
    await b.close();
  }
  {
    const b=await L.launch({geo:'kunal730',name:'home-d-acct'});await b.open();await H.states['home'](b);
    const btn=await b.page.evaluate(()=>{const e=document.querySelector('button[title="Sign in"]');if(!e)return null;
      const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:Math.round(r.width),h:Math.round(r.height),t:(e.innerText||'').trim()};});
    L.say(!!btn&&btn.w===46&&btn.h===46&&btn.t==='👋',
      '375x730: TC-HM-028 signed out, the account button is a 46x46 👋 beside the ☰',btn);
    await b.page.mouse.click(btn.x,btn.y);await b.settle(900);
    const sheet=await b.page.evaluate(()=>{const d=[...document.querySelectorAll('div')].find(x=>x.style.position==='fixed'&&x.style.zIndex==='1100');
      if(!d)return null;const r=d.getBoundingClientRect();
      return {z:d.style.zIndex,w:Math.round(r.width),h:Math.round(r.height),t:(d.innerText||'').replace(/\s+/g,' ').trim().slice(0,60)};});
    L.say(!!sheet&&sheet.z==='1100'&&/^Account/.test(sheet.t)&&await homeUp(b),
      '375x730: TC-HM-029 and it opens the account sheet at zIndex 1100, ABOVE Home\'s 500, so it is actually visible. A sheet numbered below 500 would mount, pass every presence check, and be behind the screen that opened it',sheet);
    await b.close();
  }
  {
    const b=await L.launch({geo:'kunal730',name:'home-d-look'});await b.open();await H.states['home'](b);
    let e2=null;try{await H.tapCtScroll(b,'home-look',900);}catch(e){e2=String(e).slice(0,140);}
    L.say(!e2,'375x730: [data-ct="home-look"] could be scrolled to and tapped (navigation, not an assertion)',e2);
    const st=await b.page.evaluate(()=>({look:!!document.querySelector('[data-ct="look"]'),
      board:(()=>{const e=document.querySelector('[data-ct="look-board"]');return e?e.children.length:null;})()}));
    L.say(st.look&&st.board===64,
      '375x730: TC-HM-030 "Colours & pieces" opens the Look screen with a real 64-cell preview board, not an icon',st);
    L.say(b.errs.length===0,'375x730: zero app errors opening Look',b.errs.slice(0,3));
    await b.close();
  }
}

// =========================================================================================================
// HM-E  The cards that read the store.  TC-HM-031 … TC-HM-042.
// Two geometries: the 568 floor and his phone. These blocks SEED the store and must therefore not go through
// drive/home.js's fresh(), which nulls exactly the four keys being seeded.
// =========================================================================================================
if(blk('E'))for(const geo of ['se','kunal730']){
  const W=M[geo];

  // --- TC-HM-031/032: the empty state. No streak card at all until something is earned.
  {
    const b=await L.launch({geo,name:'home-e-fresh-'+geo});await b.open();
    await H.states['home'](b);
    const s=await STREAK(b),d=await DAILY3(b);
    L.say(!!s&&s.present===false,
      geo+': TC-HM-031 on a fresh store there is NO streak card - it is not a card reading zero, it is absent (chess.jsx:4323 returns null when xp, streak and today\'s count are all 0), which is why the fresh signature has eight children and the earned one also has eight',s);
    L.say(!!d&&d.n===3&&d.marks.join('|')==='||'&&d.labels.join('|')==='1 lesson|puzzle|puzzle',
      geo+': TC-HM-032 and the Daily 3 card carries three empty dots labelled "1 lesson", "puzzle", "puzzle"',d);
    L.say(!!d&&/keep the streak alive/.test(d.full),
      geo+': TC-HM-033 headed "keep the streak alive" while anything is outstanding',d&&d.full.slice(0,44));
    const c=await COACHLINE(b);
    L.say(!!c&&near(c.h,W.coach.h)&&c.spans.length===3&&c.spans[0]==='🎓'&&c.spans[2]==='open',
      geo+': TC-HM-034 the coach line is one '+W.coach.h+'px row of exactly three spans - the glyph, the message, and the word that says it is tappable. Asserted as a shape with a pinned affordance rather than as a pinned sentence: the message is the coach\'s recommendation and moves with the lesson library',c);
    L.say(!!c&&/^New to chess\?/.test(c.spans[1]||''),
      geo+': TC-HM-035 and with nothing learned it is the new-user recommendation rather than the "Your coach is ready" fallback - measured "'+(c&&c.spans[1])+'"',c&&c.spans[1]);
    // TC-HM-036: the first run of this gate asserted "not clipped" at every width and went RED at 320x568 on a
    // correct build. It was not the gate that was wrong. Measured, and now pinned per geometry.
    const clipped=!!c&&c.sw>c.cw+1;
    L.say(clipped===CLIP[geo].clipped,
      geo+': TC-HM-036 '+(CLIP[geo].clipped
        ?('DEFECT, RECORDED NOT ENDORSED - the coach\'s recommendation IS CLIPPED at this width: '+(c&&c.sw)+'px of text in a '+(c&&c.cw)+'px box, so '+((c&&c.sw)-(c&&c.cw))+'px of it is behind an ellipsis. The middle span is nowrap + textOverflow:ellipsis (chess.jsx:4339) and the row is fixed at 39 tall, so it cannot wrap out of trouble. The only coaching a new user is offered on this screen arrives cut in half on a 320-wide phone. HM-K5')
        :('the recommendation fits at this width - '+(c&&c.sw)+'px of text in a '+(c&&c.cw)+'px box, which is exactly '+((c&&c.cw)-(c&&c.sw))+'px of slack. Pinned BOTH ways round on purpose: at 320x568 the same sentence overflows by 47px, so this assertion is the tripwire on both the defect and on any message long enough to push this width over too')),
      {sw:c&&c.sw,cw:c&&c.cw,clipped,want:CLIP[geo],msg:c&&c.spans[1]});
    await b.close();
  }

  // --- TC-HM-037/038: the earned state. The streak card appears and NEW HERE goes.
  {
    const b=await L.launch({geo,name:'home-e-earned-'+geo,
      store:{ct_daily:{date:TODAY,streak:4,count:2},
             'chesstrainer.progress.v1':{solved:{g0:1,g1:1},streak:2,best:3,xp:120,online:0,onlineIds:{}}}});
    await b.open();await SEEDED(b);
    const cards=await CARDS(b),s=await STREAK(b),h=await HOME(b);
    L.say(!!cards&&cards.map(c=>c.id).join(',')===EARNED_SIG.join(','),
      geo+': TC-HM-037 once anything is earned the column becomes '+EARNED_SIG.join(' · ')+' - the streak card takes the top slot and the NEW HERE card GOES, because "new" is defined as no XP and nothing learned (chess.jsx:4324). Still eight children, which is why this is asserted as a signature and not as a count',cards&&cards.map(c=>c.id));
    L.say(!!s&&s.present&&near(s.y,106)&&near(s.h,68)&&near(s.w,W.colW),
      geo+': TC-HM-038 the streak card is 68 tall at the top of the column, the column\'s own width',s);
    L.say(!!s&&s.chips.join('|')==='🔥 4 DAYS|⭐ 120 XP|🎯 2/5 TODAY',
      geo+': TC-HM-039 and its three chips read the STORED numbers - a 4-day streak from ct_daily, 120 XP from the puzzle progress, and 2 of today\'s 5 (DAILY_GOAL, chess.jsx:2391). The chips are the only place on Home those three numbers appear',s&&s.chips);
    L.say(!!s&&s.bar&&s.bar.fill==='40%'&&/245, 158, 11/.test(s.bar.bg),
      geo+': TC-HM-040 the goal bar is filled to 2/5 = 40% and is amber while the goal is unmet. Pinned at a PARTIAL value on purpose: a bar checked only at 100% passes on a bar that is always full - NC4 proved exactly that',s&&s.bar);
    L.say(b.errs.length===0,geo+': zero app errors in the earned state',b.errs.slice(0,3));
    await b.close();
  }
  {
    const b=await L.launch({geo,name:'home-e-goal-'+geo,
      store:{ct_daily:{date:TODAY,streak:9,count:5},
             'chesstrainer.progress.v1':{solved:{g0:1},streak:1,best:1,xp:60,online:0,onlineIds:{}}}});
    await b.open();await SEEDED(b);
    const s=await STREAK(b);
    L.say(!!s&&s.present&&s.chips[2]==='🎯 5/5 TODAY'&&s.bar&&s.bar.fill==='100%'&&/74, 222, 128/.test(s.bar.bg),
      geo+': TC-HM-041 at the goal the bar is full AND changes colour, amber to green - the only thing on Home that says the day is done',s);
    await b.close();
  }

  // --- TC-HM-042/043: the Daily 3 dots read ct_daily3, and the first one reads ct_lastlesson.
  {
    const b=await L.launch({geo,name:'home-e-d3-'+geo,store:{ct_daily3:{date:TODAY,lesson:1,puz:1}}});
    await b.open();await SEEDED(b);
    const d=await DAILY3(b);
    L.say(!!d&&d.marks.join('|')==='✓|✓|'&&/keep the streak alive/.test(d.full),
      geo+': TC-HM-042 one lesson and one puzzle done ticks the first two dots and leaves the third, and the card still says "keep the streak alive"',d);
    await b.close();
  }
  {
    const b=await L.launch({geo,name:'home-e-d3done-'+geo,store:{ct_daily3:{date:TODAY,lesson:1,puz:2}}});
    await b.open();await SEEDED(b);
    const d=await DAILY3(b);
    L.say(!!d&&d.marks.join('|')==='✓|✓|✓'&&/done for today/.test(d.full),
      geo+': TC-HM-043 all three done ticks all three and the card says "done for today" - the state the whole card exists to reach',d);
    await b.close();
  }
  {
    const b=await L.launch({geo,name:'home-e-cont-'+geo,store:{ct_lastlesson:'0'}});
    await b.open();await SEEDED(b);
    const d=await DAILY3(b);
    L.say(!!d&&d.labels[0]==='Continue: Italian Game'&&d.marks[0]==='',
      geo+': TC-HM-044 with a lesson in progress the first dot names it - "Continue: Italian Game" instead of "1 lesson", truncated at 18 characters (chess.jsx:4342). This is the ONLY place on Home that a half-finished lesson is surfaced, because the CONTINUE card that would have done it is one of the three dead blocks in TC-HM-009',d&&d.labels);
    await b.close();
  }

  // --- TC-HM-045: the at-risk wording, and the dead banner that should have carried it.
  {
    const b=await L.launch({geo,name:'home-e-risk-'+geo,
      store:{ct_daily:{date:YDAY,streak:6,count:3},
             'chesstrainer.progress.v1':{solved:{g0:1},streak:1,best:1,xp:60,online:0,onlineIds:{}}}});
    await b.open();await SEEDED(b);
    const c=await COACHLINE(b),dead=await DEAD(b);
    L.say(!!c&&c.spans[0]==='⚠️'&&c.spans[1]==='Streak at risk - do your Daily 3 today'&&c.spans[2]==='dismiss',
      geo+': TC-HM-045 with yesterday\'s streak unextended the coach line becomes the warning - ⚠️, "Streak at risk - do your Daily 3 today", and the affordance changes from "open" to "dismiss"',c&&c.spans);
    L.say(!!dead&&!dead.riskHeading&&!dead.riskBody&&!dead.riskDismiss,
      geo+': TC-HM-046 and even in the state it was written for, the full at-risk BANNER stays absent - no "<n>-day streak at risk" heading, no "Do one lesson or puzzle today to keep it going", no ✕ Dismiss button. A 39px line of text is carrying what the source builds a 30px-🔥 card for. RECORDED, NOT ENDORSED (HM-K1)',dead);
    await b.close();
  }
}

// =========================================================================================================
// HM-F  Taps on the cards, including the one that does not work.  TC-HM-047 … TC-HM-050.
// =========================================================================================================
if(blk('F')){
  const b=await L.launch({geo:'kunal730',name:'home-f-streaktap',store:{ct_daily:{date:TODAY,streak:4,count:2}}});
  await b.open();await SEEDED(b);
  await b.page.evaluate(()=>{const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
    const c=[...ov.querySelectorAll('div')].find(x=>x.getAttribute('title')==="Today's progress");if(c)c.click();});
  await b.settle(1400);
  const txt=await rootText(b);
  L.say(!await homeUp(b)&&/4-day streak 2 \/ 5/.test(txt),
    '375x730: TC-HM-047 the streak card is tappable and goes to the puzzle roadmap, which restates the same two numbers - "4-day streak 2 / 5". Two screens, one source of truth',txt.slice(0,110));
  await b.close();
}
if(blk('F')){
  const b=await L.launch({geo:'kunal730',name:'home-f-d3tap'});await b.open();await H.states['home'](b);
  await TAP(b,/^Daily 3/,1400);
  L.say(!await homeUp(b)&&/What do you want to learn\?/.test(await rootText(b)),
    '375x730: TC-HM-048 with no lesson in progress the Daily 3 card goes to Discover to pick one, and Home comes down',(await rootText(b)).slice(0,80));
  await b.close();
}
if(blk('F')){
  const b=await L.launch({geo:'kunal730',name:'home-f-coachtap'});await b.open();await H.states['home'](b);
  await TAP(b,/^🎓/,2200);
  L.say(!await homeUp(b)&&await b.page.evaluate(()=>!!document.querySelector('[data-ct="lesson-note"]')),
    '375x730: TC-HM-049 the coach line opens the lesson it recommends and Home comes down with it - chess.jsx:4567 calls setHomeScreen(false) before selectOpening() - the cite read 4339 until #425 and had drifted, in the same block that corrected two other stale cites. Since #425 it also calls setMode(learn), which is what TC-HM-050c pins',(await rootText(b)).slice(0,80));
  await b.close();
}
// --- TC-HM-050: WAS THE DEFECT'S TRIPWIRE, NOW ASSERTS THE FIX. Measured at both geometries with a real mouse
// click at a rect taken first. FLIPPED AT #425, which is what the previous version of this comment asked for:
// "THIS ASSERTION IS THE DEFECT'S TRIPWIRE - when the handler is fixed it goes RED, and that red is the
// confirmation the fix landed. Flip it then, not before." The handler is now
// onClick={()=>{setHomeScreen(false);setMode('learn');selectOpening(start);}} at chess.jsx:4552.
// TWO LINE NUMBERS IN THE OLD COMMENT HAD DRIFTED and are corrected here rather than repeated: it cited the
// handler at chess.jsx:4324 and selectOpening at chess.jsx:2899; they are 4552 and 2971 on this tree. That is the
// #399 / gate-47 class - a control recipe naming line numbers that have moved - and a comment is the one place
// nothing re-derives the number, so it is the place it rots.
if(blk('F'))for(const geo of ['se','kunal730']){
  const b=await L.launch({geo,name:'home-f-newhere-'+geo});await b.open();
  await H.states['home'](b);
  const before={ll:await LS(b,'ct_lastlesson'),home:await homeUp(b),
    lesson:await b.page.evaluate(()=>!!document.querySelector('[data-ct="lesson-note"]'))};
  const box=await b.page.evaluate(()=>{const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
    const el=ov?[...ov.querySelectorAll('button')].find(x=>/^NEW HERE/.test((x.innerText||'').trim())):null;
    if(!el)return null;const r=el.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2,h:Math.round(r.height),top:Math.round(r.top)};});
  L.say(!!box,geo+': the NEW HERE card is on the fresh-store Home screen and has a rect to tap (precondition; without it everything below passes by measuring an absent card)',box);
  if(box)await b.page.mouse.click(box.x,box.y);
  await b.settle(3000);
  const after=await b.page.evaluate(()=>{
    const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
    const mid=ov?document.elementFromPoint(Math.round(innerWidth/2),Math.round(innerHeight/2)):null;
    return {home:!!ov,lesson:!!document.querySelector('[data-ct="lesson-note"]'),
      board:[...document.querySelectorAll('div')].some(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')),
      homeCoversMiddle:!!(ov&&mid&&ov.contains(mid)),
      ll:(()=>{try{return localStorage.getItem('ct_lastlesson');}catch(e){return null;}})()};});
  // The two halves are asserted SEPARATELY and deliberately. "The lesson loaded" was already true while the
  // defect was live - that is exactly why the card looked dead - so a single combined assertion would not say
  // which half regressed. The load half is the precondition for the dismissal half meaning anything at all.
  L.say(!!box&&before.ll===null&&!before.lesson&&after.ll==='0'&&after.lesson===true&&after.board===true,
    geo+': TC-HM-050a the NEW HERE card LOADS the lesson - ct_lastlesson null -> "0", [data-ct="lesson-note"] and a painted 8x8 board both appear. This half was ALREADY TRUE while the defect was live and is kept as the precondition for 050b: without it, "Home came down" could pass on a card that navigated nowhere',
    {before,after,box});
  L.say(!!box&&after.home===false&&after.homeCoversMiddle===false,
    geo+': TC-HM-050b FIXED AT #425 - and Home COMES DOWN with it, so a brand-new user\'s one primary call to action visibly does something. Until #425 the Home overlay stayed mounted and stayed the element at the centre of the screen three seconds after the tap, so the only visible change was the Daily 3 dot switching to "Continue: Italian Game". Measured here as the zIndex-500 overlay being absent AND not the elementFromPoint at the viewport centre - two readings, because "absent" and "not covering" fail differently',
    {home:after.home,homeCoversMiddle:after.homeCoversMiddle});
  L.say(b.errs.length===0,geo+': zero app errors across the NEW HERE tap',b.errs.slice(0,3));
  await b.close();
}

// --- TC-HM-050c: THE UNTESTED HALF OF 050's INPUT SPACE, and the assertion that pins setMode rather than only
// setHomeScreen. Everything above taps a card on a FRESH BOOT, where `mode` is already 'learn' by its own
// useState default (chess.jsx:1972), so setHomeScreen(false) alone is sufficient there and the gate cannot tell
// the two fixes apart. But Home is re-openable from inside Play, Puzzles and Review (chess.jsx:5013, 5014, 6518
// and the play-setup back button at 4864), and the cards still render, so there is a reachable state where mode
// is NOT 'learn' and a card that only dismisses Home reveals whatever screen `mode` names instead of the lesson.
// This is #385's rule: a gate that enters a state by the shortest route often enters the wrong one.
//
// IT RUNS OVER ALL THREE LESSON-REACHING CARDS, AND THAT IS THE WHOLE POINT OF THE #425 ANTAGONIST VETO.
// #425's first draft fixed NEW HERE alone and published classSwept {found:9, fixed:1, left:0}. Both blind
// antagonists independently measured that as FALSE: under this assertion's own criterion the class has THREE
// portrait members, and on the #425 pre-veto bundle the other two landed the player IN A COMPUTER GAME rather
// than on a lesson - strictly worse than the P0 being fixed, because selectOpening calls setGame(), so a live
// game would be destroyed. A brand-new user reaches it in five taps. Looping the assertion over the three cards
// is what stops "the class was swept" from being a sentence rather than a measurement.
if(blk('F'))for(const geo of ['se','kunal730']){
  // {label, seed, match, why} - the seed is what makes each card RENDER, stated per card so a card that stops
  // rendering fails its own precondition instead of silently dropping out of the loop.
  const CARDS=[
    {id:'NEW HERE',      seed:{},                  re:/^NEW HERE/,   src:'chess.jsx:4552'},
    {id:'coach line',    seed:{},                  re:/^\u{1F393}\s/u, src:'chess.jsx:4567'},
    {id:'Daily 3',       seed:{ct_lastlesson:'0'}, re:/^Daily 3\s/,  src:'chess.jsx:4570'},
  ];
  for(const card of CARDS){
    const b=await L.launch({geo,name:'home-f-mode-'+geo+'-'+card.id.replace(/\s+/g,'')});await b.open();
    await H.fresh(b,card.seed);
    await b.tile('Play');await b.settle(900);
    const inPlay=await b.page.evaluate(()=>({home:!![...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500'),
      setupSheet:!!document.querySelector('[data-ct="setup-sheet"]')}));
    // BOTH conditions, and the second carries the claim. The first draft asserted only that Home was down while
    // its message said "the app is genuinely in mode play" - which Home being down does not establish. That is
    // load-bearing: this precondition is the ONLY thing keeping the landing assertion non-vacuous, because in
    // mode 'learn' every card lands on the lesson for the wrong reason. [data-ct="setup-sheet"] renders only
    // under mode==='play' && playSetup && !homeScreen (chess.jsx:4861), so its presence entails the mode.
    L.say(inPlay.home===false&&inPlay.setupSheet===true,
      geo+' ['+card.id+']: TC-HM-050c precondition 1 - the Play tile took Home down AND the play setup sheet is mounted, which is what establishes mode==="play". Asserting Home is down alone would NOT establish the mode',inPlay);
    // back to Home via the setup sheet's own '‹ Home' (chess.jsx:4864): no aria-label, no title, only that
    // inner text, and scoped to [data-ct="setup-sheet"] because a second '‹ Home' exists at chess.jsx:4639.
    // The first version matched aria-label/title =~ /back|home/ and hit another sheet's "Back", so the tap never
    // reached Home - caught by this precondition going red rather than by the assertion below passing wrongly.
    const back=await b.page.evaluate(()=>{const sheet=document.querySelector('[data-ct="setup-sheet"]');
      const bs=[...(sheet||document).querySelectorAll('button')].filter(x=>/^‹\s*Home$/.test((x.innerText||'').trim()));
      if(bs.length!==1)return {n:bs.length};bs[0].click();return {n:1};});
    const reHome=await b.page.evaluate((rs)=>{const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
      if(!ov)return {home:false,card:false};
      const r=new RegExp(rs,'u');
      const el=[...ov.querySelectorAll('button'),...ov.querySelectorAll('div[onclick],div')].find(x=>r.test((x.innerText||'').replace(/\s+/g,' ').trim()));
      if(!el)return {home:true,card:false};
      el.scrollIntoView({block:'center'});const q=el.getBoundingClientRect();
      return {home:true,card:true,x:q.left+q.width/2,y:q.top+q.height/2};},card.re.source);
    L.say(back&&back.n===1&&reHome.home===true&&reHome.card===true,
      geo+' ['+card.id+']: TC-HM-050c precondition 2 - Home re-opens from the play setup sheet with mode still "play", and this card is STILL on it. Both preconditions are asserted because if either fails the assertion below passes by never reaching the state it names',
      {back,reHome});
    if(reHome.card)await b.page.mouse.click(reHome.x,reHome.y);
    await b.settle(3000);
    const land=await b.page.evaluate(()=>{const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
      const t=((document.querySelector('#root')||document.body).innerText||'').replace(/\s+/g,' ');
      return {home:!!ov,lesson:!!document.querySelector('[data-ct="lesson-note"]'),
        inGame:!!document.querySelector('[data-ct="play-home"]')||/\u{1F916}\s*Computer\s*\d+/u.test(t),
        txt:t.slice(0,110)};});
    // THREE clauses, and inGame is the one the veto added. "lesson===true" alone would have caught the two
    // broken cards here, but it would not have SAID what went wrong; inGame names the screen the player is
    // actually dropped onto, which is the difference between "this did not work" and a defect report.
    L.say(land.home===false&&land.lesson===true&&land.inGame===false,
      geo+' ['+card.id+']: TC-HM-050c this card lands on the LESSON, not on whatever screen mode already named, when mode was "play" when Home opened ('+card.src+'). This is the assertion that pins setMode(\'learn\') specifically: a fix that added only setHomeScreen(false) passes TC-HM-050a and 050b and FAILS HERE, because selectOpening (chess.jsx:2971) sets openIdx, lastLesson and the whole lesson state but never touches mode. Proved non-vacuous at #425 against a bundle built by removing exactly the setMode token (md5 adb1bb5eceb7): 14 PASS / 1 FAIL, the one FAIL being this line',
      land);
    L.say(b.errs.length===0,geo+' ['+card.id+']: zero app errors across the mode-play tap',b.errs.slice(0,3));
    await b.close();
  }
}

// =========================================================================================================
// HM-G  US-HM-11 OVER ITS WHOLE CLASS, ENUMERATED AT RUNTIME, ON BOTH STORE SHAPES.  TC-HM-051a … TC-HM-051d.
// jobs/class-clause-instance-case-2026-09-28, band-14 remainder. Authored by test-authoring__1791103076029 on
// 2026-10-04 against origin/main 2e5f30b; default geometry set corrected and R36 criterion 1 re-derived by
// test-authoring__1791275896214 on 2026-10-06; THE SECOND ROSTER, FOR THE EARNED STORE, added by
// test-authoring__1791362299920 on 2026-10-07 against origin/main 97393a6, app.js md5 d0d4206809ae,
// stamp '#490 - 2026-10-06 23:33 ET' read from the SERVED page on every launch [measurement rule 5].
//
// WHY THIS BLOCK EXISTS AND WHY IT IS NOT MORE INPUTS IN BLOCK F. US-HM-11's heading quantifies over a class -
// "Every card on Home that opens a screen brings Home down with it, and lands on the screen it named" - and
// block F's TC-HM-050c drives a HAND-WRITTEN THREE-MEMBER ARRAY (NEW HERE, coach line, Daily 3). A literal list
// is the shape the clause was filed against: it cannot notice a control that was added, and it cannot notice a
// control that stopped rendering, so "the class was swept" stays a sentence. This block enumerates the controls
// OFF THE RUNNING SCREEN and asserts the population itself, which is what makes the loop a measurement.
//
// THE COUNTS, MEASURED, AND THE FIRST READING OF THEM CORRECTED IN PLACE [R18]. MEASURED by enumerating every
// clickable control in the Home overlay and then TAPPING each one from the mode==='play' state: ON A FRESH
// STORE the overlay holds FOURTEEN clickable controls, of which SEVEN take Home down and SEVEN leave it up.
// Block F drives three of the seven, so FOUR navigating controls - the four tiles - had no dismissal coverage
// of any kind before this block.
//
// WITHDRAWN BEFORE IT WAS HANDED OVER, because it was wrong in the direction that flattered the finding: this
// header first read "the denominator is seven, not nine", calling the job's and US-HM-11's own figure of nine
// navigating controls an error. IT IS NOT AN ERROR. US-HM-11's prose names its nine - "the four tiles, the
// streak card, the Daily 3 card, the coach line, Continue, and NEW HERE" - and TWO of those render only on an
// EARNED store: the streak card (EARNED_SIG above carries 'streak' and no 'newhere') and the Daily 3 card in
// its 'Continue: …' form, which is what it becomes when ct_lastlesson is set.
//
// AND THAT WITHDRAWAL IS NOW DISCHARGED, which is the whole of this 2026-10-07 change. The 2026-10-04 and
// 2026-10-06 versions ran ONE store shape, H.fresh(b,{}), so 7 was the fresh-store navigating population and 9
// was the population across both - and the two earned-store variants stayed UNDRIVEN for dismissal, named as
// "the concrete next step on this job" in this header for three days. The remedy is A SECOND ROSTER AND A SEED,
// not a bigger roster for the fresh store: the loop, the kind declaration, the scroll-and-hit precondition and
// all four assertions below take it unchanged. HOME_STORES is what drives them twice.
//
// THE EARNED ROSTER IS MEASURED AND THEN DECLARED, NEVER THE OTHER WAY ROUND. Enumerated at kunal730 on
// #490 BEFORE a line of it was written, with the earned store seeded:
//   fresh   ☰ · 👋 · "Daily 3 … 1 lesson" · "NEW HERE? START HERE" · 🔭 · 🧩 · 🔍 · ♟ · 🎓 · Colours & pieces
//           · Style · 🎬 · 💬 · intro(div)                                                        = 14
//   earned  ☰ · 👋 · "Daily 3 … Continue: …" ·        (NEW HERE GONE)        · 🔭 · 🧩 · 🔍 · ♟ · 🎓
//           · Colours & pieces · Style · 🎬 · 💬 · intro(div) · "🔥 4 DAYS ⭐ 120 XP 🎯 2/5 TODAY"(div) = 14
// So the earned shape is not "the fresh shape plus two": it TRADES newhere for streak, and the counts are
// equal by coincidence. Asserting a count would have been green on either roster; the population assertion
// compares the id SET, which is why it can tell them apart.
//
// AND THE SECOND ROSTER IS WORTH MORE THAN THE TWO CONTROLS IT ADDS, which was not obvious before measuring:
// THE DAILY 3 CARD CHANGES WHERE IT GOES. chess.jsx:5642's handler is
//   setHomeScreen(false); if(!L&&lastLesson!=null&&LIB[lastLesson]){setMode('learn');selectOpening(lastLesson);}
//   else if(!L){setMode('learn');setOpenIdx(null);} else {setMode('puzzle');}
// so on a fresh store it lands on DISCOVER and on an earned store it opens THAT LESSON. One control, two
// declared destinations, and the one-store form could only ever assert one of them. TC-HM-051d is the
// assertion that now distinguishes them, and a handler that stopped honouring ct_lastlesson would red in the
// earned pass while staying green in the fresh one.
//
// The seven that leave Home up on a fresh store are not a gap: ☰, 👋,
// Colours & pieces, Style, 🎬, 💬 and the intro block all open a sheet OVER Home or do nothing, and
// chess.jsx's ☰ handler is `onClick={()=>setMenuOpen(true)}` with no setHomeScreen call at all. US-HM-11's
// clause does not reach them, so counting them as uncovered would have widened the gate onto controls the
// story does not speak about.
//
// THE KIND IS A DECLARATION ASSERTED IN BOTH DIRECTIONS, not a requirement to navigate. This is the shape
// 40-reachability.js's DENOM_KIND and HDR_DEPTH_KIND already use in this suite, and it is the only form that
// is falsifiable both ways: a 'sheet' control that starts dismissing Home reds, and a 'screen' control that
// stops dismissing it reds. A one-sided loop over the navigating controls alone would have been satisfied by
// the app dismissing Home on every tap, which is a worse screen than the one the clause is about.
const HOME_ROSTER=[
  // id              kind      lands            what it is, and the measurement behind the declaration
  {id:'home-menu',     kind:'sheet'                }, // chess.jsx: onClick={()=>setMenuOpen(true)}, no setHomeScreen
  {id:'wave',          kind:'sheet'                }, // the sign-in / account sheet, fixed in the overlay's top-right
  {id:'daily3',        kind:'screen', lands:'learn'}, // on a FRESH store (ct_lastlesson null) it goes to Discover
  {id:'newhere',       kind:'screen', lands:'lesson'},
  {id:'tile-discover', kind:'screen', lands:'learn'},
  {id:'tile-puzzles',  kind:'screen', lands:'puzzle'},
  {id:'tile-review',   kind:'screen', lands:'review'},
  {id:'tile-play',     kind:'screen', lands:'play'},
  {id:'coachline',     kind:'screen', lands:'lesson'},
  {id:'home-look',     kind:'sheet'                }, // the Look and feel picker, [data-ct="look"], drawn over Home
  {id:'stylerow',      kind:'sheet'                },
  {id:'home-preview',  kind:'sheet'                }, // 🎬 the preview gallery (dev)
  {id:'home-feedback', kind:'sheet'                }, // 💬 the feedback sheet
  {id:'intro',         kind:'sheet'                }, // the animated title block: it carries an onclick and does not navigate
];
// THE EARNED ROSTER. Same loop, same kinds, same assertions - a roster and a seed, which is what the job asked
// for. newhere is GONE (chess.jsx:5651, "new" is defined as no XP and nothing learned), streak is PRESENT as a
// DIV WITH AN onclick rather than a button (chess.jsx:5620 returns a <div onClick={goPz}>), and daily3's
// declared landing changes from 'learn' to 'lesson' for the reason quoted in the header above.
const HOME_ROSTER_EARNED=[
  {id:'home-menu',     kind:'sheet'                },
  {id:'wave',          kind:'sheet'                },
  {id:'daily3',        kind:'screen', lands:'lesson'}, // 'Continue: <lesson>' - setMode('learn'); selectOpening(lastLesson)
  {id:'streak',        kind:'screen', lands:'puzzle'}, // chess.jsx:5620 goPz(): setMode('puzzle'), pzView 'roadmap'
  {id:'tile-discover', kind:'screen', lands:'learn'},
  {id:'tile-puzzles',  kind:'screen', lands:'puzzle'},
  {id:'tile-review',   kind:'screen', lands:'review'},
  {id:'tile-play',     kind:'screen', lands:'play'},
  {id:'coachline',     kind:'screen', lands:'lesson'},
  {id:'home-look',     kind:'sheet'                },
  {id:'stylerow',      kind:'sheet'                },
  {id:'home-preview',  kind:'sheet'                },
  {id:'home-feedback', kind:'sheet'                },
  {id:'intro',         kind:'sheet'                },
];
// THE EARNED SEED IS THE ONE BLOCK E ALREADY USES, deliberately, so this block introduces no new fixture to
// disagree with: ct_daily {date:TODAY,streak:4,count:2} plus the puzzle progress at xp 120 is TC-HM-037's own
// store (49-home.js block E), and ct_lastlesson:'0' is TC-HM-044's. date is TODAY and not YDAY on purpose -
// yesterday's date would raise the streak-at-risk path (chess.jsx:5648) and change the coach line's kind
// mid-loop, which would make this roster measure a third store shape without declaring it.
const HOME_STORES=[
  {store:'fresh',  roster:HOME_ROSTER,        seed:{}},
  {store:'earned', roster:HOME_ROSTER_EARNED, seed:{ct_daily:{date:TODAY,streak:4,count:2},
    'chesstrainer.progress.v1':{solved:{g0:1,g1:1},streak:2,best:3,xp:120,online:0,onlineIds:{}},
    ct_lastlesson:'0'}},
];
// Enumerated off the screen, never from a list. Buttons plus divs carrying their own onclick, because the intro
// block is a div and a control that stops being a <button> must not drop silently out of the population - and
// because the streak card is a div too, so a button-only walk would have reported the earned store as thirteen
// controls with the one this change exists for missing, and the population assertion would have named it.
const HOME_CTRLS=(b)=>b.page.evaluate(()=>{
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  if(!ov)return null;
  const idOf=(e)=>{const ct=e.getAttribute('data-ct');if(ct)return ct;
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(!t)return e.tagName==='DIV'?'intro':'blank';
    if(/^☰$/.test(t))return 'menu';
    if(/^\u{1F44B}$/u.test(t))return 'wave';
    if(/^\u{1F525}/u.test(t))return 'streak';
    if(/^Daily 3/.test(t))return 'daily3';
    if(/^NEW HERE/.test(t))return 'newhere';
    if(/^\u{1F52D}\s*Discover/u.test(t))return 'tile-discover';
    if(/^\u{1F9E9}\s*Puzzles/u.test(t))return 'tile-puzzles';
    if(/^\u{1F50D}\s*Review/u.test(t))return 'tile-review';
    if(/^♟/u.test(t))return 'tile-play';
    if(/^(\u{1F393}|⚠️)/u.test(t))return 'coachline';
    if(/^Colours & pieces/.test(t))return 'lookrow';
    if(/Style:/.test(t))return 'stylerow';
    return 'UNKNOWN:'+t.slice(0,24);};
  const all=[...ov.querySelectorAll('button')]
    .concat([...ov.querySelectorAll('div')].filter(d=>typeof d.onclick==='function'));
  return all.map(e=>{const r=e.getBoundingClientRect();
    return {id:idOf(e),tag:e.tagName.toLowerCase(),x:r.left+r.width/2,y:r.top+r.height/2,
      w:Math.round(r.width),h:Math.round(r.height),y0:Math.round(r.top)};});});
// WHERE AM I. Each landing is read by a MARKER OF THE SCREEN rather than by the absence of Home, because
// "Home came down" is the clause's FIRST half and would make the second half vacuous if it were also its test.
const WHERE=(b)=>b.page.evaluate(()=>{
  const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
  const mid=ov?document.elementFromPoint(Math.round(innerWidth/2),Math.round(innerHeight/2)):null;
  const t=((document.querySelector('#root')||document.body).innerText||'').replace(/\s+/g,' ');
  const q=(s)=>!!document.querySelector(s);
  return {home:!!ov,homeCoversMiddle:!!(ov&&mid&&ov.contains(mid)),
    lesson:q('[data-ct="lesson-note"]'),
    learn:/What do you want to learn\?/.test(t),
    puzzle:/Daily goal/.test(t)&&/Rank/.test(t),
    review:/Review any game, from anywhere/.test(t)||q('[data-ct="rev-row1"]'),
    play:q('[data-ct="setup-sheet"]')||q('[data-ct="play-home"]'),
    look:q('[data-ct="look"]'),
    txt:t.slice(0,90)};});
const LANDED={lesson:(w)=>w.lesson,learn:(w)=>w.learn,puzzle:(w)=>w.puzzle,review:(w)=>w.review,play:(w)=>w.play};

// ONE BROWSER PER GEOMETRY, deliberately: fourteen controls times a launch each is fourteen bundles' worth of
// boot time and would put this block outside R36's "fast enough to run on every build" on its own. H.fresh()
// plus b.home() returns to the Home overlay from wherever a tap landed, so the loop re-enters the state, and
// H.fresh(b,seed) is also what switches store shape WITHOUT a second launch - which is why the earned roster
// costs one more pass over the controls and not one more browser.
// THE DEFAULT IS se,kunal730 AND NOT kunal730, CHANGED 2026-10-06 BY test-authoring__1791275896214 UNDER R36.
// This block's author measured, and wrote into this file's own header, that at se (320x568) five of the fourteen
// controls sit below the fold and that a tap which never happened satisfies "Home STAYS UP" perfectly - five
// vacuous greens beside three false reds, from one missing scroll. The author then wrote "CT_HM_GEOS=se,kunal730
// is the form this gate should carry" into the handoff AND LEFT THE DEFAULT AT kunal730, so gates/gates.sh - which
// sets no CT_HM_* variable, measured again on 2026-10-07 at 97393a6 and still true - would have run this block at
// ONE geometry: the geometry in which that whole class of fault is invisible. A recommendation in a header is not
// a default. CT_HM_STORES is the same shape and ITS default is both shapes, for the same reason.
if(blk('G'))for(const geo of (process.env.CT_HM_GEOS||'se,kunal730').split(',').map(x=>x.trim()).filter(Boolean)){
  const b=await L.launch({geo,name:'home-g-class-'+geo});await b.open();
  const stores=HOME_STORES.filter(s=>(process.env.CT_HM_STORES||'fresh,earned').split(',').map(x=>x.trim()).indexOf(s.store)>=0);
  for(const S of stores){
  const tag=geo+'/'+S.store;
  await H.fresh(b,S.seed);
  const seen=await HOME_CTRLS(b);
  const ids=(seen||[]).map(c=>c.id), want=S.roster.map(r=>r.id);
  const missing=want.filter(x=>ids.indexOf(x)<0), extra=ids.filter(x=>want.indexOf(x)<0);
  // G1 IS THE ASSERTION THE HAND-WRITTEN ARRAY COULD NOT MAKE, and it is the whole reason this block is not
  // three more inputs in block F: it reds when a control is ADDED to Home and reds when one stops rendering,
  // so US-HM-11's "every card" has a denominator that is re-derived on every run instead of restated. It is
  // also the assertion that tells the two STORE SHAPES apart: both hold 14 controls, so a count is green on
  // either and only the id SET distinguishes an earned Home from a fresh one.
  L.say(!!seen&&missing.length===0&&extra.length===0&&ids.length===want.length,
    tag+': TC-HM-051a US-HM-11 POPULATION - the Home overlay on a '+S.store+' store holds exactly the '+want.length+' clickable controls that store shape\'s roster declares, enumerated off the screen. Measured '+ids.length+'. A control added to Home, one that stopped rendering, or one that renders on the wrong store shape reds HERE, which is what gives "every card on Home" a denominator rather than a sentence',
    {store:S.store,n:ids.length,want:want.length,missing,extra,ids});
  let nav=0, sheet=0;
  for(const r of S.roster){
    await H.fresh(b,S.seed);
    await b.tile('Play');await b.settle(900);
    const inPlay=await WHERE(b);
    // PRECONDITION, kept from TC-HM-050c and for its reason: [data-ct="setup-sheet"] renders only under
    // mode==='play' && playSetup && !homeScreen, so its presence is what establishes the mode. Home being
    // down would NOT establish it, and in mode 'learn' a card lands on a lesson for the wrong reason.
    const modeIsPlay=inPlay.play===true&&inPlay.home===false;
    await b.home();await b.settle(500);
    const here=await HOME_CTRLS(b);
    const t=(here||[]).find(x=>x.id===r.id);
    L.say(modeIsPlay&&!!t,
      tag+' ['+r.id+']: TC-HM-051b precondition - mode was "play" when Home re-opened (the play setup sheet was mounted before the return) and this control is on the re-opened Home with a rect to tap. Without both, every verdict below passes by never reaching the state it names',
      {store:S.store,modeIsPlay,found:!!t,rect:t||null});
    if(!(modeIsPlay&&t))continue;
    // SCROLL IT INTO VIEW, RE-READ THE RECT, AND ASSERT THE POINT IS HIT-TESTABLE BEFORE TAPPING IT
    // [measurement rules 1 and 3]. THIS BLOCK'S FIRST VERSION DID NOT, and the cost is recorded rather than
    // quietly repaired: run at se (320x568) on UNMODIFIED origin/main it read 71 pass / 5 FAIL, and the five
    // were tile-review, tile-play and coachline, whose rect centres are y 568.5, 568.5 and 675.5 on a
    // 568-high viewport. The clicks landed OUTSIDE the viewport, nothing was tapped, Home stayed up, and the
    // assertion reported the app failing US-HM-11. The HALF THAT IS WORSE: the sheet-kind controls at y 713,
    // 766 and 812 PASSED at se, because "Home stays up" is satisfied by a tap that never happened - five
    // vacuous greens and three false reds out of one missing scroll. Home is an overflow-y:auto fixed layer,
    // so its own box is the scroller and the document never moves; scrollIntoView is correct here and is NOT
    // the 40-reachability.js fault, because this assertion is about what a tap DOES and not about whether a
    // finger could reach it - reachability is block B's subject and has its own instrument.
    const hit=await b.page.evaluate((id)=>{
      const ov=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');
      if(!ov)return {ok:false,why:'no overlay'};
      const all=[...ov.querySelectorAll('button')]
        .concat([...ov.querySelectorAll('div')].filter(d=>typeof d.onclick==='function'));
      const el=all.find(e=>(e.getAttribute('data-ct')||'')===id)||all.find(e=>{
        const t=(e.innerText||'').replace(/\s+/g,' ').trim();
        return (id==='daily3'&&/^Daily 3/.test(t))||(id==='newhere'&&/^NEW HERE/.test(t))
          ||(id==='streak'&&e.tagName==='DIV'&&/^\u{1F525}/u.test(t))
          ||(id==='tile-discover'&&/^\u{1F52D}\s*Discover/u.test(t))||(id==='tile-puzzles'&&/^\u{1F9E9}\s*Puzzles/u.test(t))
          ||(id==='tile-review'&&/^\u{1F50D}\s*Review/u.test(t))||(id==='tile-play'&&/^♟/u.test(t))
          ||(id==='coachline'&&/^(\u{1F393}|⚠️)/u.test(t))||(id==='stylerow'&&/Style:/.test(t))
          ||(id==='wave'&&/^\u{1F44B}$/u.test(t))||(id==='intro'&&e.tagName==='DIV'&&!t);});
      if(!el)return {ok:false,why:'gone after scroll'};
      el.scrollIntoView({block:'center'});
      const r=el.getBoundingClientRect(), x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
      const inView=x>=0&&y>=0&&x<=innerWidth&&y<=innerHeight;
      const at=document.elementFromPoint(x,y);
      return {ok:inView&&!!at&&(el===at||el.contains(at)),inView,x,y,vw:innerWidth,vh:innerHeight,
        onTop:!!at&&(el===at||el.contains(at)),top:Math.round(r.top),h:Math.round(r.height)};},r.id);
    L.say(hit.ok===true,
      tag+' ['+r.id+']: TC-HM-051b precondition 2 - the control was scrolled into Home\'s own scroller, its rect RE-READ after the scroll, the tap point is inside the viewport and elementFromPoint at that point IS this control. Without this line a tap at a point below the fold lands nowhere: measured at se before it existed, three screen-kind controls reported the APP failing US-HM-11 and three sheet-kind controls reported a vacuous PASS, from one missing scroll',
      Object.assign({store:S.store},hit));
    if(!hit.ok)continue;
    await b.page.mouse.click(hit.x,hit.y);
    await b.settle(2500);
    const w=await WHERE(b);
    if(r.kind==='screen'){
      nav++;
      // THE CLAUSE'S FIRST HALF, over the whole class rather than over three of it.
      L.say(w.home===false&&w.homeCoversMiddle===false,
        tag+' ['+r.id+']: TC-HM-051c US-HM-11 first half - this control opens a screen, so Home COMES DOWN with it. Two readings, because "the overlay is absent" and "the overlay is not the element at the viewport centre" fail differently',
        {store:S.store,home:w.home,homeCoversMiddle:w.homeCoversMiddle,txt:w.txt});
      // THE CLAUSE'S SECOND HALF, read by a marker of the destination and NOT by the absence of Home, so the
      // two halves cannot be satisfied by one fact. AND THE DESTINATION IS DECLARED PER STORE SHAPE: daily3
      // lands on Discover with no last lesson and on THAT LESSON with one, so this line is the only assertion
      // in the suite that can tell a Daily 3 card which has stopped honouring ct_lastlesson from one that has not.
      L.say(LANDED[r.lands](w)===true,
        tag+' ['+r.id+']: TC-HM-051d US-HM-11 second half - it lands on the screen it NAMED ('+r.lands+' on a '+S.store+' store), not on whatever screen `mode` already named. mode was "play" on entry, so a handler that only calls setHomeScreen(false) reveals the game instead and reds here',
        {store:S.store,lands:r.lands,w});
    }else{
      sheet++;
      // THE OTHER DIRECTION OF THE SAME DECLARATION. This is what stops the block being satisfied by an app
      // that dismisses Home on every tap, which would be a worse screen than the one US-HM-11 describes.
      L.say(w.home===true,
        tag+' ['+r.id+']: TC-HM-051c US-HM-11 EXCLUSION - this control opens a sheet OVER Home or does nothing, so it is outside the clause and Home must STAY UP. The roster\'s kind is asserted in both directions: a sheet control that starts dismissing Home reds here, so the exclusion is a measurement and not an exemption',
        {store:S.store,home:w.home,look:w.look,txt:w.txt});
    }
  }
  L.say(nav===S.roster.filter(r=>r.kind==='screen').length&&sheet===S.roster.filter(r=>r.kind==='sheet').length,
    tag+': TC-HM-051a the loop actually ran over every roster member of the '+S.store+' store - '+nav+' screen-kind and '+sheet+' sheet-kind reached, against '+S.roster.filter(r=>r.kind==='screen').length+' and '+S.roster.filter(r=>r.kind==='sheet').length+' declared. A precondition failure skips a control, so without this line the block could report green having driven two of fourteen',
    {store:S.store,nav,sheet});
  L.say(b.errs.length===0,tag+': zero app errors across all '+S.roster.length+' Home control taps on the '+S.store+' store',b.errs.slice(0,3));
  }
  // THE STORE SHAPES RAN, AND THIS IS THE LINE THAT SAYS SO. Without it, CT_HM_STORES or a filter typo narrows
  // the block to one shape and every assertion above still passes - which is exactly how the GEOMETRY default
  // went unnoticed for three days on this same block. A scope variable needs an assertion that reads it back.
  L.say(stores.length===HOME_STORES.length,
    geo+': TC-HM-051a US-HM-11 was driven over BOTH store shapes - '+stores.map(s=>s.store).join(' and ')+' - against the '+HOME_STORES.length+' declared. The streak card and the Daily 3 "Continue" variant, 2 of US-HM-11\'s own nine navigating controls, exist ONLY on the earned store, so a run that silently drops that shape leaves the clause covered at 7 of 9 while reading green',
    {ran:stores.map(s=>s.store),declared:HOME_STORES.map(s=>s.store)});
  await b.close();
}

},'HOME');
