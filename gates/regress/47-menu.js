// regress/47-menu.js   MENU AND SETTINGS - the sheet behind ☰, and the Look and feel screen it opens.
//
// WHY THIS GATE EXISTS. Menu and settings is #4 on the risk ranking in claude/stories/SUITE-AUDIT-2026-09-14.md §5
// and it had ZERO stories and ZERO cases before this file. It is not a leaf screen: it HOLDS the settings every
// other screen renders against. ct_hideEval decides whether Play and Review paint an eval bar at all; ct_theme
// and ct_pieceSet decide what every board on every screen looks like; ct_depth, ct_evalunder, ct_evalgraph,
// ct_sound and ct_coachstyle each change a screen the user reaches later, from a control they touched here. One
// bad write in this sheet is a defect on five screens, and none of those five gates would name this one.
//
// WHAT THE SUITE ALREADY COVERS, so this file does not duplicate it: gate 36-evalbar.js measures the eval bar's
// own geometry once it is on screen, and gate 35-width-containment.js measures widths on the play screens. Both
// assume the settings are at their defaults.
//
// #399 CORRECTION, AND IT WAS THE CENTRAL CLAIM OF THIS HEADER. The lines here used to read "NOTHING in
// gates/regress/ opened [data-ct="menu-sheet"] before this file - the string does not appear in any other gate -
// so every control in it was unguarded." THAT IS FALSE ON ONE GREP, and the antagonist pass ran the grep that
// nobody who read this file had:
//   grep -l menu-sheet gates/regress/*.js gates/drive/*.js  ->  20-review.js, 30-p1-fixes.js, drive/menu.js
// gates/regress/30-p1-fixes.js:13-28 already opens this sheet from home-menu and carries FOURTEEN passing
// assertions over it, AT THE TWO GEOMETRIES THIS FILE OMITS (375x679 and 390x844): A-04 the burger opens the
// sheet; A-16 the sheet reaches the bottom - WHICH IS THE SAME #373 FACT TC-MN-003 RE-ASSERTS; A-16 again from
// Discover; five piece chips >=40px; four footer links >=40px, the same four as TC-MN-039/040; A-11 the More
// sheet's rows >=40px; and THE SHEET CLOSES ON A BACKDROP TAP, which this file does not cover at all.
// gates/drive/menu.js is a 20-state driver for this screen that this file never calls, reaching states no block
// here enters. So the honest claim is NARROWER and still worth landing: this file is the first to cover the
// TOGGLES and their localStorage writes, the Look-and-feel screen, and the mode-awareness of the sheet. The
// sheet's own FIT and its footer LINKS were already guarded, at two widths this file does not use.
//
// The lesson is this project's own, twice over: "measure, do not read" applies to a claim about the SUITE just
// as much as to a claim about the app, and a count loose enough to pass is loose enough to hide a real defect.
// This header asserted an absence - the hardest thing to measure - without listing what had been checked.
//
// WHAT IT GUARDS
//   1. The sheet fits the padded viewport at every geometry (#373, audit A-16: it was 5vh + 88vh + 12px and left
//      36px of dead backdrop under itself on a 679-tall screen). Measured as sheet height === viewport - 20,
//      which is the overlay's own 10px top and bottom padding and nothing else.
//   2. Reachability of the FOOT of the sheet - the build stamp and the last toggle row - measured the way
//      CLAUDE.md and gate 40 require it and NOT by scrollIntoView or by docScrollY. See MEASUREMENT below.
//   3. That each toggle actually flips, and writes the localStorage key the rest of the app reads.
//   4. That the write survives a reload, which is the whole point of a settings screen.
//   5. That the setting reaches ANOTHER SCREEN - ct_hideEval off and the play board has no eval bar.
//   6. Look and feel: the live preview really repaints in the colours of the chip that was tapped.
//   7. That the sheet is mode-aware: GAME SETUP appears only when it is opened from a live game.
//
// MEASUREMENT RULES OBSERVED (charter, claude/agents/TEST-AUTHORING-LANE.md):
//   (1) #root carries overflow-y:auto by design, so document.scrollingElement NEVER scrolls. Nothing in this file
//       reads docScrollY or compares documentElement.scrollHeight with clientHeight. Measured here and recorded so
//       the next author does not have to: with the menu open, document.scrollingElement.scrollTop is 0 and
//       documentElement.scrollHeight - clientHeight is 0 at all three geometries WHILE the sheet has 944px of
//       scroll left in it at 320x568. A gate that read the document would call the whole sheet unreachable.
//       The real scroller is [data-ct="menu-sheet"] ITSELF (overflowY:auto, maxScroll 944 / 737 / 484 at
//       320x568 / 375x730 / 430x932); its parent - the fixed overlay - has maxScroll 0 and is NOT the scroller.
//   (2) getBoundingClientRect() includes transforms. Nothing in this file asserts a piece rect; the Look preview
//       is measured by its CELLS' background colours, which no transform touches.
//   (3) locator.click() auto-scrolls, so every reachability claim is measured by REACH() BEFORE any tap, and
//       every drive tap is a programmatic el.click() that is never treated as evidence of reachability.
//   (4) L.over() is blind to position:fixed children of #root. The menu overlay IS such a child, so L.over() is
//       not called anywhere in this file - it would be measuring the home screen behind the sheet.
//   (5) The bundle stamp is printed by L.serve() on every launch below. If a run's output does not name the
//       bundle it measured, the numbers in it are not evidence.
//
// CASES IMPLEMENTED (claude/stories/MENU-LANE-2026-09-15.md):
//   MN-A  TC-MN-001 002 003 004 005 006          MN-E  TC-MN-022 023 024 043 044 045
//   MN-B  TC-MN-007 008 009 010                  MN-F  TC-MN-025 026 027 028 029 030 031 032
//   MN-C  TC-MN-011 012 013 014 015 016 017 018  MN-G  TC-MN-033 034 035
//   MN-D  TC-MN-019 020 021                      MN-H  TC-MN-036 037 038 039 040
//
// NEGATIVE CONTROLS - each a one-line chess.jsx change applied to a SCRATCH COPY only, built with gates/build.sh
// into a trial bundle (CT_OUT) and served to this gate with CT_APP. The repo's own chess.jsx is never touched.
// Recorded results are in claude/stories/MENU-LANE-2026-09-15.md; the four that were RUN are marked there.
// All six were RUN. Results, block by block:
//   N1 sheet fits the viewport   chess.jsx:4858  menu-sheet  maxHeight:'100%' -> '88vh'
//        -> block A 18 pass, 3 fail: TC-MN-003 red at all three geometries (499.8/642.4/820.2 against the
//           548/710/912 a correct build measures). Nothing else moved, which is the point - see below.
//   N2 the foot is reachable     chess.jsx:4858  menu-sheet  overflowY:'auto' -> 'hidden'
//        -> block B 3 pass, 9 fail: TC-MN-007, 008 and 009 red at all three geometries. TC-MN-010 stays green
//           at all three, correctly: "Look and feel" is at 203 and already on screen, so the claim is vacuous
//           there. A reachability assertion is only a test where something is genuinely out of reach.
//   N3 a toggle writes its key   chess.jsx:2621  the ct_sound effect -> a no-op
//        -> block C 8 pass, 1 fail: TC-MN-011 red, ls ["1","1","1"] - the pill still flips, so the ROW half of
//           the assertion is satisfied and only the stored string catches it. That is the half that matters.
//   N4 the preview repaints      chess.jsx:4826  cell background TH.light/TH.dark -> the Ocean constants
//        -> block F 18 pass, 2 fail: TC-MN-029 red at both geometries. TC-MN-030 stays GREEN (ct_theme is still
//           written and the chip still reports itself pressed) - which is exactly why 029 reads the CELLS.
//   N5 hideEval reaches Play     chess.jsx:2098  useState(...) -> useState(false), ignoring the stored key
//        -> block E 2 pass, 1 fail: TC-MN-023 red. TC-MN-022 stays green because false is the default.
//   N6 menu-look opens Look      chess.jsx:4913  drop setLookOpen(true)
//        -> block F 2 pass, 18 fail: the whole Look screen, at both geometries.
//
// N2 IS THE ONE THAT MATTERS and it discriminates the right way: with the sheet's own scroll removed the REACH
// assertions move to onScreen:false and hit:false. That is the proof this gate tests reachability and not
// position, which is the distinction three false P0s turned on.
//
// #399 CORRECTION TO THAT PARAGRAPH TOO. It used to end "every AT-REST number stays byte-identical ... so the
// whole geometry block MN-A stays green", and MN-A DOES NOT stay green: N2 measures 12 fails, not 9, because
// TC-MN-005 asserts that the sheet IS the scroller and that is exactly what N2 removes. Re-measured at #399:
// 74 pass / 12 fail = TC-MN-005 x3 + TC-MN-007/008/009 x3. The conclusion survives, the arithmetic did not.
//
// THE GAP THIS FILE IS MOST BLIND TO, named by the #399 antagonist pass and measured rather than guessed:
// THE SHEET OPENED FROM A LIVE GAME, AT 320x568. The GAME SETUP block inserts ~364px above APPEARANCE, so the
// in-game sheet holds 1854px of content against 1490 from Home - 39% more scroll travel - and "Look and feel"
// moves from restTop 203 (on screen) to 567 in a 568-tall viewport (off the fold). That is the ONLY state in the
// app where TC-MN-010 is a real reachability test, and no block here enters it: MN-A/MN-B are Home-only, and
// MN-G is the only block that opens the in-game sheet but runs at kunal730 alone and asserts nothing but HEADS.
// The in-game sheet therefore has NO geometry, NO spill and NO reachability assertion at ANY width.
// The state was measured and is CLEAN as of #399 - h=548=vh-20, top=10, w=296, horizontal spill 0, docScrollW
// 320, no overflow:hidden box whose content does not fit, build stamp reachable at restTop 1836 -> top 539 hit
// true, and TC-MN-037/038/039 all still hold in-game, same at game over - so this is a coverage gap and not a
// live defect. Whoever closes it should drive the state with gates/drive/play.js state 'cpu-m0' and NOT with
// MN-G's ad-hoc taps: those cannot reach a live game at 320x568 at all (they time out waiting for play-menu,
// still on the setup screen), and MN-G only escapes that because it runs at one geometry. CLAUDE.md, unchanged
// since #390: before tapping anything in a new gate, ask whether an existing gate already had to fight it.
'use strict';
// CONTROL-RECORD: 7aeed0e 2026-10-29 total=10 red=1 scope=trial:c06079358221 how=CT_BLK=E only: the bar above the board ignores ct_hideEval, so TC-MN-045's bar-above line reddens alone while TC-MN-022 and TC-MN-023 stay green [#545 item (36)]
const L=require('../lib');

// ---------------------------------------------------------------------------------------------------------
// THE MEASUREMENT. One canonical reach function for every reachability claim in this file, in the shape gate
// 45 and gate 40 use: USER-scrollable ancestors only (computed overflow auto|scroll AND real room to move),
// the scroll is actually PERFORMED, the rect is re-read, the centre of the VISIBLE area is hit-tested, and
// every scroll position is put back so the next measurement starts from rest.
// `sel` addresses the row; rows in this sheet have no data-ct of their own, so they are found by their first
// line of rendered text inside [data-ct="menu-sheet"] - every string harvested from chess.jsx and confirmed
// in the live DOM. No selector in this file is invented.
// ---------------------------------------------------------------------------------------------------------
// `root` is the screen the row lives on: the menu sheet by default, [data-ct="look"] for the Look screen.
// `txt` addresses by first line of rendered text; a leading '@' addresses by data-ct instead, which is how the
// Look screen's chips are named (they carry look-th-n / look-pc-<set> and no unique text).
const REACH=(b,txt,root)=>b.page.evaluate(([t,rootSel])=>{
  const sh=document.querySelector(rootSel);
  if(!sh)return {found:false,noSheet:true};
  const first=(x)=>(x.innerText||'').trim().split('\n')[0];
  const cand=[...sh.querySelectorAll('button,a,div,span')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;});
  const el=t[0]==='@'?sh.querySelector('[data-ct="'+t.slice(1)+'"]')
                     :(cand.find(x=>first(x)===t)||cand.find(x=>first(x).startsWith(t)));
  if(!el)return {found:false,saw:cand.map(first).filter(Boolean).slice(0,24)};
  const r0=el.getBoundingClientRect();
  const scs=[];let p=el.parentElement;
  while(p&&p!==document.documentElement){const st=getComputedStyle(p);
    const y=/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1;
    const x=/auto|scroll/.test(st.overflowX)&&p.scrollWidth>p.clientWidth+1;
    if(y||x)scs.push({el:p,y,x});p=p.parentElement;}
  const saved=scs.map(s=>[s.el.scrollTop,s.el.scrollLeft]);
  for(let pass=0;pass<2;pass++)for(let i=scs.length-1;i>=0;i--){
    const q=scs[i].el,pr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
    if(scs[i].y)q.scrollTop =Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop +(er.bottom-pr.bottom)+8));
    if(scs[i].x)q.scrollLeft=Math.max(0,Math.min(q.scrollWidth -q.clientWidth ,q.scrollLeft+(er.right -pr.right )+8));}
  const r=el.getBoundingClientRect();
  const hx=Math.round(r.left+r.width/2),hy=Math.round((Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2);
  const hit=document.elementFromPoint(hx,hy);
  const out={found:true,label:(t[0]==='@'?t.slice(1):first(el)),
    restTop:Math.round(r0.top),restBottom:Math.round(r0.bottom),
    restOn:r0.top>=-0.5&&r0.bottom<=innerHeight+0.5,
    top:Math.round(r.top),bottom:Math.round(r.bottom),
    w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,
    onScreen:r.top>=-0.5&&r.bottom<=innerHeight+0.5,
    scrollers:scs.length,hit:!!(hit&&(hit===el||el.contains(hit))),
    hitWas:hit?(hit.tagName.toLowerCase()+(hit.getAttribute&&hit.getAttribute('data-ct')?'['+hit.getAttribute('data-ct')+']':'')):null,
    vh:innerHeight,vw:innerWidth};
  scs.forEach((s,i)=>{s.el.scrollTop=saved[i][0];s.el.scrollLeft=saved[i][1];});
  return out;},[txt,root||'[data-ct="menu-sheet"]']);

// The sheet and the overlay that carries it. Deliberately reports BOTH maxScrolls and BOTH document numbers,
// so the record shows which box is the scroller and shows the document numbers sitting at zero (rule 1).
const SHEET=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;
  const p=s.parentElement,ps=getComputedStyle(p),ss=getComputedStyle(s),r=s.getBoundingClientRect();
  return {w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,
    top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,
    overflowY:ss.overflowY,maxScroll:Math.round(s.scrollHeight-s.clientHeight),
    ovPos:ps.position,ovOverflowY:ps.overflowY,ovMaxScroll:Math.round(p.scrollHeight-p.clientHeight),
    vh:innerHeight,vw:innerWidth,
    docScrollY:Math.round(scrollY),                                   // rule 1: recorded, never asserted on
    docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight),
    docScrollW:document.documentElement.scrollWidth};});

// Everything that escapes the viewport sideways. Nothing in this sheet scrolls horizontally on purpose, so
// unlike gate 45 there is no scroller exemption here: any element past the edge is a finding.
const HSPILL=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;
  const vw=innerWidth,bad=[];
  for(const e of s.querySelectorAll('*')){
    const st=getComputedStyle(e);if(st.display==='none'||st.visibility==='hidden')continue;
    const q=e.getBoundingClientRect();if(q.width<1||q.height<1)continue;
    if(q.right>vw+0.5||q.left<-0.5)bad.push({t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,26),
      left:Math.round(q.left*10)/10,right:Math.round(q.right*10)/10});}
  return {vw,docScrollW:document.documentElement.scrollWidth,bad:bad.slice(0,5)};});

// A toggle row, addressed by its label. The VALUE is the pill on the right - the row's last line of text.
const ROW=(b,label)=>b.page.evaluate((t)=>{
  const sh=document.querySelector('[data-ct="menu-sheet"]');if(!sh)return null;
  const el=[...sh.querySelectorAll('button')].find(x=>((x.innerText||'').trim().split('\n')[0])===t);
  if(!el)return null;const lines=(el.innerText||'').trim().split('\n').map(x=>x.trim()).filter(Boolean);
  const q=el.getBoundingClientRect();
  return {label:lines[0],value:lines[lines.length-1],h:Math.round(q.height*10)/10,top:Math.round(q.top)};},label);

// (rule 3) a drive tap: programmatic, deliberately NOT locator.click(), and never evidence of reachability.
const TAP=async(b,label,wait)=>{const ok=await b.page.evaluate((t)=>{
    const sh=document.querySelector('[data-ct="menu-sheet"]');if(!sh)return false;
    const el=[...sh.querySelectorAll('button')].find(x=>((x.innerText||'').trim().split('\n')[0])===t);
    if(!el)return false;el.click();return true;},label);
  await b.settle(wait==null?300:wait);return ok;};

// A drive tap on a control addressed by data-ct. Programmatic for the same reason TAP is: b.tapCt() clicks at
// the element's layout coordinates, which on the Look screen is a click into empty space for anything below
// the fold - that is how the first run of this gate recorded TC-MN-032 as red against a working build. Where
// the point IS whether a finger can get there, REACH() answers it, and it is asserted separately.
const CTTAP=async(b,ct,wait)=>{const ok=await b.page.evaluate((c)=>{const el=document.querySelector('[data-ct="'+c+'"]');
    if(!el)return false;el.click();return true;},ct);
  await b.settle(wait==null?400:wait);return ok;};

const LS=(b,k)=>b.page.evaluate((k)=>{try{return localStorage.getItem(k);}catch(e){return 'THREW';}},k);
const HEADS=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;
  return [...s.querySelectorAll('div')].filter(x=>x.children.length===0&&/^[A-Z][A-Z ]{3,}$/.test((x.innerText||'').trim()))
    .map(x=>x.innerText.trim());});
// "Board colors · <name>" in the menu, "BOARD COLOURS · <name>" in the Look sheet (textTransform:uppercase
// reaches innerText in Chromium). Matched case-insensitively ON PURPOSE - the two spellings are a real
// inconsistency, recorded as a NEEDS-KUNAL question rather than silently pinned to one of them by this gate.
const SWATCH_NAME=(b,root)=>b.page.evaluate((sel)=>{const s=document.querySelector(sel);if(!s)return null;
  const d=[...s.querySelectorAll('div')].find(x=>/^board colou?rs · /i.test((x.innerText||'').trim()));
  return d?d.innerText.replace(/\s+/g,' ').trim():null;},root);

const geos=[{k:'se',n:'320x568'},{k:'kunal730',n:'375x730'},{k:'430',n:'430x932'}];
const only=process.env.CT_BLK?process.env.CT_BLK.split(','):null;
const blk=(x)=>!only||only.indexOf(x)>=0;

L.run(async()=>{

// =========================================================================================================
// MN-A  The sheet itself: it opens, it fits the padded viewport, nothing escapes it.  TC-MN-001..006.
// Three geometries, including the 568 floor and Kunal's real phone (charter: one width is not a test).
// =========================================================================================================
if(blk('A'))for(const g of geos){
  const b=await L.launch({geo:g.k,name:'mn-a-'+g.n});await b.open();
  const before=await b.page.evaluate(()=>!!document.querySelector('[data-ct="menu-sheet"]'));
  L.say(before===false,g.n+': TC-MN-001 the menu sheet is NOT in the DOM until ☰ is pressed - it is conditionally rendered, not merely hidden, so nothing behind it can be measured through it');
  await b.tapCt('home-menu',700);
  const sh=await SHEET(b);
  L.say(!!sh,g.n+': TC-MN-002 [data-ct="home-menu"] opens [data-ct="menu-sheet"]',sh);
  if(sh){
    L.say(Math.abs(sh.h-(sh.vh-20))<0.6&&Math.abs(sh.top-10)<0.6,
      g.n+': TC-MN-003 the sheet takes the padded viewport - height '+sh.h+' = '+sh.vh+' minus the overlay\'s own 10px top and bottom padding, and nothing else. This is #373 (audit A-16): it was 5vh + 88vh + 12px, which left 36px of dead backdrop under it on a 679-tall screen',sh);
    L.say(Math.abs(sh.w-Math.min(sh.vw-24,380))<0.6,
      g.n+': TC-MN-004 the sheet is min(viewport - 24, 380) wide = '+Math.min(sh.vw-24,380)+' - the overlay\'s 12px side padding, capped at maxWidth 380 so it does not sprawl on the wide phone',sh);
    L.say(sh.overflowY==='auto'&&sh.maxScroll>0&&sh.ovMaxScroll===0,
      g.n+': TC-MN-005 the SHEET is the scroller ('+sh.maxScroll+'px of travel) and the fixed overlay around it is not (0). Recorded because the document is not the scroller either: docScrollY '+sh.docScrollY+', document maxScroll '+sh.docScroll+' - #root carries overflow-y:auto by design, and a check that read those numbers would call this whole sheet unreachable',sh);
  }
  const sp=await HSPILL(b);
  L.say(!!sp&&sp.bad.length===0&&sp.docScrollW===sp.vw,
    g.n+': TC-MN-006 nothing in the sheet escapes the viewport sideways and the document gains no horizontal scroll - measured over every painted element in it, with no scroller exemption because nothing here scrolls sideways on purpose',sp);
  L.say(b.errs.length===0,g.n+': zero app errors opening the menu',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// MN-B  Reachability of the FOOT of the sheet.  TC-MN-007..010.
// The sheet is 1437 of content in a 730 phone. Everything below Sound is off screen at rest at every
// geometry, so this block is the one that decides whether the second half of the settings screen exists.
// =========================================================================================================
if(blk('B'))for(const g of geos){
  const b=await L.launch({geo:g.k,name:'mn-b-'+g.n});await b.open();
  await b.tapCt('home-menu',700);
  const stamp=await REACH(b,'Build ');
  L.say(stamp.found&&!stamp.restOn&&stamp.onScreen&&stamp.hit,
    g.n+': TC-MN-007 the build stamp at the very foot of the sheet can be brought on screen by a finger and is then HIT-TESTABLE - at rest it is at '+stamp.restTop+' in a '+stamp.vh+'-tall viewport, so the claim is not vacuous at any of the three geometries; after scrolling the one user-scrollable ancestor it sits at '+stamp.top+' and document.elementFromPoint at the centre of its visible area returns the element itself',stamp);
  // #399: !restOn ADDED TO 008 AND 009. TC-MN-007 already had it and 008/009 did not, which is a difference with
  // no reason behind it - and the antagonist pass showed what it costs: without it, a bundle whose sheet gets
  // SHORTER brings these rows on screen at rest, the assertion degrades silently into a presence check, and its
  // own text still claims "is reachable". Measured on the shipped #399 bundle so this cannot be a red on a
  // healthy build: restOn is FALSE for both at all three geometries (Sound 936/937/931, Delete account
  // 1418/1373/1322), with exactly one finger-scrollable ancestor. The guard pins the precondition the sentence
  // already asserts.
  const snd=await REACH(b,'Sound');
  L.say(snd.found&&!snd.restOn&&snd.onScreen&&snd.hit,
    g.n+': TC-MN-008 the Sound row - the last toggle before the piece and coach pickers - is genuinely off screen at rest ('+snd.restTop+' in a '+snd.vh+'-tall viewport) and a finger brings it to '+snd.top+', where it is hit-testable',snd);
  const del=await REACH(b,'Delete account');
  L.say(del.found&&!del.restOn&&del.onScreen&&del.hit&&del.h>=40,
    g.n+': TC-MN-009 the "Delete account" link is genuinely off screen at rest ('+del.restTop+'), reachable, hit-testable, and still carries the 40px tap box #373 (audit A-11) gave it - it was a bare 16px line box',del);
  // #399: TC-MN-010 WAS A VACUOUS REACHABILITY ASSERTION AND IS NOW AN HONEST PRESENCE ONE.
  // Its text said "is reachable and hit-testable"; its predicate was found && onScreen && hit, with no !restOn.
  // On the shipped bundle "Look and feel" sits at restTop 203 with restOn TRUE at 320x568, 375x730 AND 430x932 -
  // and at 375x679, 375x761 and 390x844 too - so nothing was ever scrolled and the assertion could not fail for
  // the reason it named. The proof it was vacuous rather than merely lucky: under control N2, with the sheet's
  // own scroller destroyed, TC-MN-005/007/008/009 go red twelve times and THIS ONE STAYS GREEN at all three.
  // It was counted in the 86 as reachability coverage it never provided.
  // So assert what is actually true and falsifiable: the row is ABOVE THE FOLD at rest. That goes red the moment
  // anything is inserted above it in the sheet, which is a real regression this screen can have.
  // THE REACHABILITY CASE FOR THIS ROW EXISTS AND THIS BLOCK CANNOT SEE IT: opened from a LIVE GAME the
  // GAME SETUP block adds ~364px above APPEARANCE and pushes this row to restTop 567 in a 568-tall viewport -
  // off the fold at 320x568 and at no other geometry. MN-B is Home-only and MN-G, the one block that reaches the
  // in-game sheet, runs at kunal730 alone and asserts nothing about geometry. Named in the gap list below.
  const look=await REACH(b,'Look and feel');
  L.say(look.found&&look.restOn&&look.hit,
    g.n+': TC-MN-010 [data-ct="menu-look"], the row that opens the Look screen, is ABOVE THE FOLD at rest (top '+look.restTop+' of '+look.vh+') and hit-testable where it sits - a PRESENCE assertion, deliberately not a reachability one, because from Home this row needs no scroll at any geometry',look);
  await b.close();
}

// =========================================================================================================
// MN-C  Every toggle flips, and writes the key the rest of the app reads.  TC-MN-011..018.
// The pass condition per row is the exact rendered pill text on each side and the exact stored string.
// =========================================================================================================
if(blk('C')){
  const TOGGLES=[
    ['Sound',                        'ct_sound',     'ON','OFF',                       '1','0',  'TC-MN-011'],
    ['Evaluation bar',               'ct_hideEval',  'ON','OFF',                       '0','1',  'TC-MN-012'],
    ['Cell depth & texture',         'ct_depth',     'OFF','ON',                       '0','1',  'TC-MN-013'],
    ['Eval bar sits',                'ct_evalunder', 'left of the board','above the board','0','1','TC-MN-014'],
    ['Eval graph in the player bars','ct_evalgraph', 'ON · try it in Review','OFF · option C','1','0','TC-MN-015'],   // #547 item (56): ON by default now, so its first tap turns it OFF
    ['Layout overlay',               'ct_layoutgrid','OFF','drawn on screen',          '0','1',  'TC-MN-016'],
  ];
  const b=await L.launch({geo:'kunal730',name:'mn-c'});await b.open();
  await b.tapCt('home-menu',700);
  for(const [label,key,offTxt,onTxt,offLS,onLS,tc] of TOGGLES){
    const r0=await ROW(b,label),ls0=await LS(b,key);
    await TAP(b,label,300);
    const r1=await ROW(b,label),ls1=await LS(b,key);
    await TAP(b,label,300);
    const r2=await ROW(b,label),ls2=await LS(b,key);
    L.say(!!r0&&!!r1&&r0.value===offTxt&&r1.value===onTxt&&ls1===onLS&&r2.value===offTxt&&ls2===offLS,
      '375x730: '+tc+' "'+label+'" reads "'+offTxt+'" at its default, one tap makes it "'+onTxt+'" and writes '+key+'='+onLS+', and a second tap puts both back. The stored string is what matters: it is what Play, Review and Puzzles read on their next render',
      {row:[r0&&r0.value,r1&&r1.value,r2&&r2.value],ls:[ls0,ls1,ls2]});
  }
  // Layout readout is the one switch with NO persisted key - it is deliberately per-session (chess.jsx has no
  // effect writing it), so it is asserted as such rather than being quietly left out of the table.
  const lr0=await ROW(b,'Layout readout');
  await TAP(b,'Layout readout',300);
  const lr1=await ROW(b,'Layout readout');
  const stored=await LS(b,'ct_layoutinfo');
  L.say(!!lr0&&lr0.value==='screenshot this'&&!!lr1&&lr1.value==='shown'&&stored===null,
    '375x730: TC-MN-017 "Layout readout" flips from "screenshot this" to "shown" and persists NOTHING - there is no ct_layoutinfo key and no effect writing one, so unlike every other switch in this sheet it is per-session by construction',{row:[lr0&&lr0.value,lr1&&lr1.value],stored});
  /* #451: THE ASSERTION BELOW READ A 200-CHARACTER SLICE OF THE VERY BLOCK IT ASSERTS OVER, so it could only see
     the readout's first few lines - and it went RED the moment the readout grew, naming the wrong cause. #451 added
     one line to that block ("inner WxH  vv WxH  app installed app|browser tab", which gallery card 1 exists to
     capture) and pushed `build #NNN` past character 200; the app still names the build, and the FAIL text printed
     the truncated string as if the build were missing. An instrument sized to the content it happened to see is the
     frozen-denominator shape (#405) pointed at a string length. The full text is asserted now and only the LOG
     DETAIL is truncated, which is what the slice was presumably for. The assertion itself is unchanged and still
     requires both facts, so this is not a weakening: proved by running it against a bundle whose readout omits the
     build stamp, where it still reds. */
  const readout=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    const d=[...s.querySelectorAll('div')].find(x=>/^what THIS device computes/.test((x.innerText||'').trim()));
    return d?d.innerText.replace(/\s+/g,' ').trim():null;});
  L.say(!!readout&&/screen 375x730/.test(readout)&&/build #/i.test(readout),
    '375x730: TC-MN-018 turning the readout on paints the live layout block, and it names the viewport it is actually running in and the bundle it was built from',readout&&readout.slice(0,240));
  await TAP(b,'Layout readout',250);
  L.say(b.errs.length===0,'375x730: zero app errors across the toggle sweep',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// MN-D  The write survives a reload.  TC-MN-019..021.
// A settings screen that forgets is not a settings screen. The reload is a real b.open(), not a state reset.
// =========================================================================================================
if(blk('D'))for(const g of [{k:'se',n:'320x568'},{k:'kunal730',n:'375x730'}]){
  const b=await L.launch({geo:g.k,name:'mn-d-'+g.n});await b.open();
  await b.tapCt('home-menu',700);
  await TAP(b,'Sound',300);
  await TAP(b,'Cell depth & texture',300);
  const wrote=await b.page.evaluate(()=>({s:localStorage.getItem('ct_sound'),d:localStorage.getItem('ct_depth')}));
  L.say(wrote.s==='0'&&wrote.d==='1',g.n+': TC-MN-019 the two taps wrote ct_sound=0 and ct_depth=1 before the reload',wrote);
  await b.open();                                        // a real page load, same origin, same localStorage
  await b.tapCt('home-menu',700);
  const back=await b.page.evaluate(()=>({s:localStorage.getItem('ct_sound'),d:localStorage.getItem('ct_depth')}));
  const rs=await ROW(b,'Sound'),rd=await ROW(b,'Cell depth & texture');
  L.say(back.s==='0'&&back.d==='1',g.n+': TC-MN-020 the keys survive a full reload',back);
  L.say(!!rs&&rs.value==='OFF'&&!!rd&&rd.value==='ON',
    g.n+': TC-MN-021 and the SHEET READS THEM BACK - the rows come up "Sound OFF" and "Cell depth & texture ON" on the fresh load rather than at their defaults, which is the half a storage-only assertion would miss',{sound:rs&&rs.value,depth:rd&&rd.value});
  await b.close();
}

// =========================================================================================================
// MN-E  A setting changed here changes ANOTHER SCREEN.  TC-MN-022..024.
// The reason this screen is #4 on the risk ranking. Driven by seeding the stored value rather than by tapping,
// so that what is under test is the CONSUMER of the setting, and MN-C already owns the producer.
// =========================================================================================================
if(blk('E'))for(const [val,want] of [['0',true],['1',false]]){
  const b=await L.launch({geo:'kunal730',name:'mn-e-'+val,store:{ct_hideEval:val},fresh:true});await b.open();
  await b.tile('Play');await b.settle(900);
  const ev=await b.page.evaluate(()=>({v:!!document.querySelector('[data-ct="eval-bar-v"]'),
    h:!!document.querySelector('[data-ct="eval-bar-h"]')}));
  L.say(ev.v===want,
    '375x730: '+(val==='0'?'TC-MN-022':'TC-MN-023')+' ct_hideEval='+val+' and the play screen '+(want?'paints':'does not paint')+' [data-ct="eval-bar-v"]. This is the whole claim behind guarding this screen: the control lives in the menu sheet and the consequence lives on a screen the menu gate is the only one that would notice',ev);
  // #545 item (36) [jobs/the-above-the-board-eval-bar-has-no-assertion-anywhere-in-the-suite-because-tc-mn-022-and-023-
  // assert-only-the-side-bar-2026-10-29]: `ev.h` was collected here and never read. In the default placement the bar ABOVE
  // the board must not paint whichever way ct_hideEval is set. TC-MN-041 and TC-MN-042 are drafted on
  // jobs/bench-no-gate-asserts-any-figure-the-layout-readout-prints-2026-10-07, so these take 043 to 045.
  L.say(ev.h===false,'375x730: TC-MN-043 ct_hideEval='+val+' in the DEFAULT placement (beside the board) and the bar ABOVE the board [data-ct="eval-bar-h"] does not paint either',ev);
  await b.close();
}
// #545 item (36): THE PLACEMENT ABOVE THE BOARD (ct_evalunder 1, the placement Kunal asked for at #340; the app paints it
// as [data-ct="eval-bar-h"]). Block MN-E never set ct_evalunder, so it only ever drove the placement beside the board,
// and hiding the eval could stop hiding the bar above the board with TC-MN-022 and TC-MN-023 both green.
// THE SEED CARRIES ct_evalmig361 TOO: without it, the app's #361 migration rewrites ct_evalunder to 0 on first load
// (chess.jsx, search ct_evalmig361), and the block would silently drive the placement beside the board again.
if(blk('E'))for(const [val,want] of [['0',true],['1',false]]){
  const b=await L.launch({geo:'kunal730',name:'mn-e-under-'+val,store:{ct_evalmig361:'1',ct_evalunder:'1',ct_hideEval:val},fresh:true});await b.open();
  await b.tile('Play');await b.settle(900);
  const ev=await b.page.evaluate(()=>({v:!!document.querySelector('[data-ct="eval-bar-v"]'),
    h:!!document.querySelector('[data-ct="eval-bar-h"]')}));
  // Two lines and not a conjunct, so each half reddens on its own.
  L.say(ev.h===want,
    '375x730: '+(val==='0'?'TC-MN-044':'TC-MN-045')+' ct_evalunder=1 ct_hideEval='+val+' and the bar ABOVE the board '+(want?'paints':'does NOT paint - hiding the eval hides it in this placement too'),ev);
  L.say(ev.v===false,
    '375x730: '+(val==='0'?'TC-MN-044':'TC-MN-045')+' ct_evalunder=1 ct_hideEval='+val+' and the bar BESIDE the board does not paint - the placement above replaces it, it does not add to it',ev);
  await b.close();
}
if(blk('E')){
  const b=await L.launch({geo:'kunal730',name:'mn-e-theme',store:{ct_theme:'5'},fresh:true});await b.open();
  await b.tapCt('home-menu',700);
  const nm=await SWATCH_NAME(b,'[data-ct="menu-sheet"]');
  L.say(!!nm&&/· Graphite$/.test(nm),
    '375x730: TC-MN-024 a stored ct_theme=5 is named in the menu\'s own heading - "'+nm+'" - so the sheet states the setting it is holding rather than only the default. Matched case-insensitively on the word colour/color on purpose: this heading and the Look screen\'s spell it differently (NEEDS-KUNAL, MENU-LANE Q3)',nm);
  await b.close();
}

// =========================================================================================================
// MN-F  Look and feel - the screen the menu hands off to.  TC-MN-025..032.
// The live preview is the whole idea of this screen (#367 y12c: "pick by looking"), so the assertion is that
// the preview really repaints IN THE COLOURS OF THE CHIP THAT WAS TAPPED - read off the chip's own swatch,
// not hardcoded, so the gate keeps working when a palette is retuned and still fails when the wiring breaks.
// =========================================================================================================
if(blk('F'))for(const g of [{k:'se',n:'320x568'},{k:'kunal730',n:'375x730'}]){
  const b=await L.launch({geo:g.k,name:'mn-f-'+g.n});await b.open();
  await b.tapCt('home-menu',700);
  await b.tapCt('menu-look',800);
  const st=await b.page.evaluate(()=>{
    const o=document.querySelector('[data-ct="look"]');if(!o)return {open:false};
    const bd=document.querySelector('[data-ct="look-board"]'),
          cols=document.querySelector('[data-ct="look-colours"]'),
          pcs=document.querySelector('[data-ct="look-pieces"]');
    const r=bd?bd.getBoundingClientRect():null;
    return {open:true,menuGone:!document.querySelector('[data-ct="menu-sheet"]'),
      cells:bd?bd.children.length:null,colours:cols?cols.children.length:null,pieces:pcs?pcs.children.length:null,
      colourCts:cols?[...cols.children].map(c=>c.getAttribute('data-ct')):null,
      pieceCts:pcs?[...pcs.children].map(c=>c.getAttribute('data-ct')):null,
      board:r?{w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right)}:null,
      vw:innerWidth};});
  L.say(st.open&&st.menuGone,
    g.n+': TC-MN-025 [data-ct="menu-look"] CLOSES the menu and opens [data-ct="look"] - one screen at a time, not two stacked overlays',st);
  L.say(st.cells===64,g.n+': TC-MN-026 the preview is a real 64-cell board, not an icon',{cells:st.cells});
  L.say(st.colours===12&&st.pieces===5,
    g.n+': TC-MN-027 twelve board colours and five piece sets, each chip carrying its own data-ct',{colourCts:st.colourCts,pieceCts:st.pieceCts});
  // #399: THIS ASSERTION PRINTED A FORMULA IT DID NOT CHECK. Its predicate was w===h plus inside-the-viewport,
  // and chess.jsx:4825 is style={{width:pb,height:pb,...}} - ONE VARIABLE IN BOTH SLOTS, so w===h is
  // structurally true, and margin:'0 auto' inside an already-contained card makes the bounds true as well.
  // Proved by control N7 (4817: min(vw-52,wide?360:290) -> 120): the board measured 120x120, 58% under, and this
  // assertion PASSED at both geometries while still printing "it is sized min(vw-52, 290)". That is #385's coach
  // chip exactly - a SHAPE asserted where a VALUE was claimed. Now the formula is the predicate. Shipped #399
  // measures 268 at 320 (min(268,290)) and 290 at 375 (min(323,290)), so both branches of the min are exercised
  // by the two geometries, which is why this case is run at 320 at all.
  const _pbWant=Math.min(st.vw-52,290);
  L.say(!!st.board&&st.board.left>=0&&st.board.right<=st.vw+0.5&&st.board.w===st.board.h&&Math.abs(st.board.w-_pbWant)<=0.5,
    g.n+': TC-MN-028 the preview board is square, inside the viewport, and ACTUALLY sized min(vw-52, 290) = '+_pbWant+' at '+st.vw+' wide - measured '+st.board.w+'. 320 is where the vw-52 branch binds and 375 where the 290 cap does',Object.assign({want:_pbWant},st.board));

  // the repaint, read off the chip's own swatch. Chip 5 is Graphite; chip 2 (Ocean) is the default it leaves.
  const tint=()=>b.page.evaluate(()=>{const bd=document.querySelector('[data-ct="look-board"]');if(!bd)return null;
    return {light:getComputedStyle(bd.children[0]).backgroundColor,dark:getComputedStyle(bd.children[1]).backgroundColor};});
  const chip=(n)=>b.page.evaluate((n)=>{const c=document.querySelector('[data-ct="look-th-'+n+'"]');if(!c)return null;
    const sw=c.querySelector('span');const kid=sw?sw.children:null;
    return {title:c.getAttribute('title'),pressed:c.getAttribute('aria-pressed'),
      light:kid&&kid[0]?getComputedStyle(kid[0]).backgroundColor:null,
      dark:kid&&kid[1]?getComputedStyle(kid[1]).backgroundColor:null};},n);
  const t0=await tint(),c5=await chip(5);
  await CTTAP(b,'look-th-5',500);
  const t1=await tint(),c5b=await chip(5);
  L.say(!!t0&&!!t1&&t0.light!==t1.light&&!!c5&&t1.light===c5.light&&t1.dark===c5.dark,
    g.n+': TC-MN-029 tapping the "'+(c5&&c5.title)+'" chip repaints the live preview IN THAT CHIP\'S OWN COLOURS - the cells go '+(t0&&t0.light)+'/'+(t0&&t0.dark)+' to '+(t1&&t1.light)+'/'+(t1&&t1.dark)+', read off the chip\'s swatch rather than hardcoded. Cell backgrounds are used and not piece rects, because every piece sits inside scale(1.06) and its box is not its paint',{before:t0,after:t1,chip:c5});
  L.say(c5b&&c5b.pressed==='true'&&await LS(b,'ct_theme')==='5',
    g.n+': TC-MN-030 the chip reports itself aria-pressed and the choice is stored as ct_theme=5 - the preview is the live setting, not a sandbox',{pressed:c5b&&c5b.pressed,ls:await LS(b,'ct_theme')});
  const hdr=await SWATCH_NAME(b,'[data-ct="look"]');
  L.say(!!hdr&&!!c5&&hdr.toLowerCase().endsWith('· '+c5.title.toLowerCase()),
    g.n+': TC-MN-031 the heading names the chosen colour - "'+hdr+'" against the chip\'s own title "'+(c5&&c5.title)+'"',{hdr,title:c5&&c5.title});
  // #399: !restOn ADDED, for the reason 008 and 009 got it. On the shipped bundle this one IS a real
  // reachability test - restOn false at 672 of 568 and 694 of 730, one scrollable ancestor - but the predicate
  // did not say so, and under control N7 (preview board shrunk to 120) the chips came ON screen at rest,
  // scrollers went to 0, and the assertion still PASSED while its text read "below the fold at this geometry".
  // The damage moves to the sentence when the geometry changes, which is the shape of every containment trap in
  // CLAUDE.md: the thing being detected is absorbed by the mechanism doing the asserting.
  const pr=await REACH(b,'@look-pc-merida','[data-ct="look"]');
  L.say(pr.found&&!pr.restOn&&pr.onScreen&&pr.hit,
    g.n+': TC-MN-032 the piece-set chips sit below the preview board and genuinely below the fold at this geometry (at rest '+pr.restTop+' of '+pr.vh+'), and a finger reaches them by scrolling the Look card - after which they are hit-testable',pr);
  await CTTAP(b,'look-pc-merida',500);
  const pset=await LS(b,'ct_pieceSet');
  const pressed=await b.page.evaluate(()=>{const p=document.querySelector('[data-ct="look-pc-merida"]');
    return p?p.getAttribute('aria-pressed'):null;});
  L.say(pset==='merida'&&pressed==='true',
    g.n+': TC-MN-032b a piece set chosen in the same way stores ct_pieceSet=merida and marks itself pressed',{pset,pressed});
  L.say(b.errs.length===0,g.n+': zero app errors on the Look screen',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// MN-G  The sheet is mode-aware, and it is reachable from the live game too.  TC-MN-033..035.
// The same component renders a different screen depending on where it was opened from. Nothing else in the
// suite touches that, and it is exactly the kind of thing a refactor silently drops.
// =========================================================================================================
if(blk('G')){
  const b=await L.launch({geo:'kunal730',name:'mn-g'});await b.open();
  await b.tapCt('home-menu',700);
  const onHome=await HEADS(b);
  L.say(Array.isArray(onHome)&&onHome.indexOf('ACCOUNT')>=0&&onHome.indexOf('APPEARANCE')>=0&&onHome.indexOf('GAME SETUP')<0,
    '375x730: TC-MN-033 opened from Home the sheet carries ACCOUNT, APPEARANCE and SKIN and NO "GAME SETUP" block - there is no game to configure',onHome);
  await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    const x=[...s.querySelectorAll('button')].find(b=>(b.innerText||'').trim()==='✕');x&&x.click();});
  await b.settle(400);
  L.say(await b.page.evaluate(()=>!document.querySelector('[data-ct="menu-sheet"]')),
    '375x730: TC-MN-034 the ✕ closes the sheet');
  // CLAUDE.md, #393: a gate that throws on a missing element leaves every assertion after it unrun. This
  // block navigates, so the navigation goes red on its own line and the run carries on either way.
  let navErr=null;
  try{
    await b.tile('Play');await b.settle(600);
    await b.tapText(/^Pass & Play$/,{wait:500});
    await b.tapText(/^▶ Start game$/,{wait:1500});
    await b.tapCt('play-menu',800);
  }catch(e){navErr=String(e).slice(0,160);}
  L.say(!navErr,'375x730: reached the menu from a live game (navigation, not an assertion about the menu)',navErr);
  const inGame=navErr?null:await HEADS(b);
  L.say(Array.isArray(inGame)&&inGame.indexOf('GAME SETUP')>=0&&inGame.indexOf('APPEARANCE')>=0,
    '375x730: TC-MN-035 [data-ct="play-menu"] in a live game opens the SAME sheet with the GAME SETUP block added - opponent, time control and strength, on top of everything Home showed',inGame);
  L.say(b.errs.length===0,'375x730: zero app errors reaching the menu from a live game',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// MN-H  What the sheet offers when there is no account and no PRO.  TC-MN-036..040.
// The empty state, which is the state Kunal's phone is in and the only one reachable in the sandbox: the
// network is blocked, so nothing here signs in or leaves the origin. What a blocked sign-in SHOULD say is a
// NEEDS-KUNAL question (MENU-LANE Q1), not a guess made by this gate.
// =========================================================================================================
if(blk('H'))for(const g of [{k:'se',n:'320x568'},{k:'kunal730',n:'375x730'}]){
  const b=await L.launch({geo:g.k,name:'mn-h-'+g.n});await b.open();
  await b.tapCt('home-menu',700);
  const acct=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    const btn=[...s.querySelectorAll('button')].find(x=>/Sign in with Google|Sign-in unavailable here/.test(x.innerText||''));
    if(!btn)return null;const q=btn.getBoundingClientRect();
    return {t:btn.innerText.replace(/\s+/g,' ').trim(),dis:btn.disabled,h:Math.round(q.height),
      blurb:btn.nextElementSibling?btn.nextElementSibling.innerText.replace(/\s+/g,' ').trim():null,
      signedIn:!!s.querySelector('img[referrerpolicy="no-referrer"]')};});
  L.say(!!acct&&!acct.signedIn&&acct.h>=40,
    g.n+': TC-MN-036 signed out, the ACCOUNT block is a single 40px-or-taller sign-in row and no profile card - "'+(acct&&acct.t)+'"',acct);
  const skins=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    const hdr=[...s.querySelectorAll('div')].find(x=>(x.innerText||'').trim()==='SKIN');
    const row=hdr?hdr.parentElement:null;if(!row)return null;
    // DIRECT children only, and only the three-or-more-span cards. The SKIN label shares its flex container
    // with every toggle row, the piece-style chips and the coach pickers, so `row.querySelectorAll('button')`
    // returns nineteen buttons - which is how the first run of this gate reported "three skins" as red on a
    // build with exactly three skins. A skin card is icon + (name, blurb) + badge, and the selected one adds
    // a tick; a toggle row is exactly two spans and a coach or piece chip fewer.
    return [...row.children].filter(x=>x.tagName==='BUTTON'&&x.children.length>=3)
      .map(x=>{const l=(x.innerText||'').trim().split('\n').map(y=>y.trim()).filter(Boolean);
      return {name:l[1]||l[0],pro:l.indexOf('PRO')>=0,on:l.indexOf('✓')>=0};});});
  L.say(Array.isArray(skins)&&skins.length===3&&skins.filter(x=>x.on).length===1&&skins.find(x=>x.on).name==='Classic',
    g.n+': TC-MN-037 three skins, exactly one selected, and with nothing stored the selected one is Classic',skins);
  L.say(Array.isArray(skins)&&skins.filter(x=>x.pro).length===2,
    g.n+': TC-MN-038 the other two are marked PRO for a free account - the badge is the only thing telling a user why a tap will not select them',skins);
  const legal=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    return [...s.querySelectorAll('a')].map(a=>({t:a.innerText.trim(),href:(a.getAttribute('href')||''),
      tgt:a.getAttribute('target'),rel:a.getAttribute('rel'),h:Math.round(a.getBoundingClientRect().height)}));});
  L.say(legal.length===4&&legal.map(x=>x.t).join('|')==='Privacy|Terms|Refunds|Delete account',
    g.n+': TC-MN-039 all four legal links are present in order',legal.map(x=>x.t));
  L.say(legal.every(x=>x.h>=40&&x.tgt==='_blank'&&/noopener/.test(x.rel||'')&&/^\.\//.test(x.href)),
    g.n+': TC-MN-040 each is a 40px tap box, opens in a new tab with rel=noopener, and points at a relative page in this app rather than off-origin',legal);
  await b.close();
}

// =========================================================================================================
// MN-R  THE LAYOUT READOUT, COMPARED FIGURE BY FIGURE AGAINST THE SAME PAGE [#545, item (57); TC-MN-042;
// jobs/bench-no-gate-asserts-any-figure-the-layout-readout-prints-2026-10-07]. Three gates touched this block and none
// asserted one of the figures it prints - the one surface in the app that exists to be believed. Every check below
// reads the printed figure and the truth in the SAME page.evaluate, so nothing is a literal and nothing goes stale
// when a geometry, an inset or a build number changes. INPUTS: 12 figures x 3 geometries (kunal761, kunal730, se).
// EXCLUDED BY NAME, with reasons: the four tile-ink ratios (glyph widths from an unpinned font resolution, #480 - they
// would measure the image, not the app); mode/wide/edge/compact and the eval/moves triple (app state, no independent
// truth on this screen); board as an absolute (no board is painted under the open menu, so it is checked for
// consistency instead: square x 8 = board, gap = (vw - board)/2 within the readout's rounding). THE SCREEN ROW IS NOT
// DISCRIMINATED HERE AND SAYS SO: it printed vp.w x vp.h until #547 (135) (it prints window.screen now, and TC-MN-048 discriminates
// it under an emulated 812-tall screen); and in this headless emulation window.screen equals the
// viewport, so a label that printed the inner viewport under 'screen' reads identical. It is compared, and a pass
// on it is not evidence about the label.
// =========================================================================================================
if(blk('R'))for(const geo of ['kunal761','kunal730','se']){
  const MD=require('../drive/menu');
  const b=await L.launch({geo,name:'menu-readout-'+geo});await b.open();
  await MD.states['menu-readout'](b);await b.settle(500);
  const r=await b.page.evaluate(()=>{
    const els=[...document.querySelectorAll('div,pre')].filter(e=>{const t=e.innerText||'';return /inner\s*\d+x\d+/.test(t)&&/safe top/.test(t)&&/board \d/.test(t);});
    els.sort((a,c)=>a.innerText.length-c.innerText.length);const t=els[0]?els[0].innerText.replace(/[ \t]+/g,' '):'';
    const n=(re)=>{const m=re.exec(t);return m?m.slice(1).map(Number):null;};
    const sf=(localStorage.getItem('ct_safe')||'').split(',').map(Number);
    return {t,screen:n(/screen (\d+)x(\d+)/),vw:n(/vw (\d+)/),dpr:n(/dpr ([\d.]+)/),inner:n(/inner (\d+)x(\d+)/),vv:n(/vv (\d+)x(\d+)/),
      safe:n(/safe top (\d+) bottom (\d+)/),bsq:n(/board (\d+) square (\d+) gap (\d+)/),build:(/build (#\d+ - [\d-]+ [\d:]+ ET)/.exec(t)||[])[1]||null,
      truth:{sw:screen.width,sh:screen.height,cw:document.documentElement.clientWidth,dpr:devicePixelRatio,iw:innerWidth,ih:innerHeight,
        vvw:visualViewport?Math.round(visualViewport.width):null,vvh:visualViewport?Math.round(visualViewport.height):null,st:sf[0]||0,sb:sf[1]||0}};});
  const T=r.truth,stamp=await b.stamp();
  L.say(!!r.t&&!!r.screen&&!!r.vw&&!!r.dpr&&!!r.inner&&!!r.vv&&!!r.safe&&!!r.bsq&&!!r.build,geo+': TC-MN-042 PRECONDITION the readout block was found and every compared figure parsed out of it',{text:r.t.slice(0,240)});
  if(r.screen&&r.vw&&r.dpr&&r.inner&&r.vv&&r.safe&&r.bsq){
    const chk=[['screen w (not discriminated: screen = viewport here)',r.screen[0],T.sw],['screen h (not discriminated)',r.screen[1],T.sh],['vw',r.vw[0],T.cw],['dpr',r.dpr[0],T.dpr],
      ['inner w',r.inner[0],T.iw],['inner h',r.inner[1],T.ih],['vv w',r.vv[0],T.vvw],['vv h',r.vv[1],T.vvh],['safe top',r.safe[0],T.st],['safe bottom',r.safe[1],T.sb]];
    for(const [name,printed,truth] of chk)L.say(printed===truth,geo+': TC-MN-042 the readout\'s '+name+' equals the page\'s own value',{printed,truth});
    const [bd,sq,gp]=r.bsq;
    L.say(sq*8===bd&&Math.abs(gp-(T.cw-bd)/2)<=0.5,geo+': TC-MN-042 board, square and gap agree with each other and with vw (square x 8 = board; gap = (vw - board)/2 within rounding)',{board:bd,square:sq,gap:gp,vw:T.cw});
    L.say(r.build===stamp,geo+': TC-MN-042 the readout\'s build is the stamp on the served bundle',{printed:r.build,stamp});
  }
  await b.close();
}

// BLOCK X [#547 item (180); jobs/landscape-menu-sheet-cannot-be-dismissed-by-an-outside-tap-2026-09-30]: the sheet is
// modal, so it must have a way out besides its own X - a tap outside it, and Escape. Both read from the sheet being
// GONE from the DOM, each after a separate precondition that it was open, at the landscape phone and at his phone.
if(blk('X'))for(const g of [{k:{w:730,h:375,safe:'',label:'730x375'},n:'730x375'},{k:'kunal730',n:'375x730'}]){
  const b=await L.launch({geo:g.k,name:'mn-x-'+g.n});await b.open();
  const up=()=>b.page.evaluate(()=>!!document.querySelector('[data-ct="menu-sheet"]'));
  await b.tapCt('home-menu',700);const o1=await up();
  L.say(o1,g.n+': TC-MN-046 PRECONDITION the menu sheet is open before the outside tap',{open:o1});
  const sr=await b.rect('[data-ct="menu-sheet"]');const pt=sr&&sr.x>16?[8,Math.round(sr.y+sr.h/2)]:[8,8];
  await b.page.mouse.click(pt[0],pt[1]);await b.settle(500);const c1=!(await up());
  L.say(c1,g.n+': TC-MN-046 a tap OUTSIDE the sheet, at ('+pt+'), closes it',{closed:c1,sheet:sr});
  await b.tapCt('home-menu',700);const o2=await up();
  L.say(o2,g.n+': TC-MN-047 PRECONDITION the menu sheet is open again before Escape',{open:o2});
  await b.page.keyboard.press('Escape');await b.settle(400);const c2=!(await up());
  L.say(c2,g.n+': TC-MN-047 Escape closes the menu sheet',{closed:c2});
  await b.close();
}
// BLOCK Y [#549 item (52); jobs/landscape-menu-sheet-cannot-be-dismissed-by-an-outside-tap-2026-09-30, the two gaps #547's
// verification left]: (TC-MN-051) at 730x375 WITH THE GAME OVER - the state the job measured both exits failing in, which block X
// (Home only) never enters - a real tap outside the sheet closes it, and so does Escape; (TC-MN-052) at 730x375, where the 380x355
// sheet shows a fraction of its content, EVERY button and link in it can be brought fully inside the sheet's visible box by REAL
// finger drags (CDP touch events, gate 74's instrument - no scrollIntoView, no scrollTop assignment) and is then hit-testable at
// its centre. The walk drags from rest until the scroller stops moving; each control counts once it was seen inside the sheet's
// clip and hit at its centre at some step. Preconditions are separate lines: the sheet overflows, the first drag moved it, and the
// control list is non-empty.
async function fingerDragY(b,x,y0,y1){
  const cdp=await b.page.context().newCDPSession(b.page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*(i/12)}]});await b.page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
}
const LAND={w:730,h:375,safe:'',label:'730x375'};
if(blk('Y')){
  const b=await L.launch({geo:LAND,name:'mn-y-over'});await b.open();
  const up=()=>b.page.evaluate(()=>!!document.querySelector('[data-ct="menu-sheet"]'));
  await b.card('k10',2600);await b.settle(10500);
  const over=await b.page.evaluate(()=>/Checkmate/.test(document.body.innerText)&&[...document.querySelectorAll('button')].some(x=>/(^|\n)\s*Rematch$/.test((x.innerText||'').trim()))/* #550 a23: sideways the Rematch button is an icon over its label */);
  L.say(over,'730x375: TC-MN-051 PRECONDITION the game is over (Checkmate on screen, Rematch offered) before the menu is opened',{over});
  const open=async()=>{const m=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Menu/.test(e.getAttribute('title')||'')&&(e.innerText||'').trim()==='☰'&&e.getBoundingClientRect().width>0);
    if(!x)return null;const q=x.getBoundingClientRect();return [q.left+q.width/2,q.top+q.height/2];});
    if(m){await b.page.mouse.click(m[0],m[1]);await b.settle(600);}return !!m&&await up();};
  const o1=await open();
  L.say(o1,'730x375: TC-MN-051 PRECONDITION a real tap on the game-over screen\'s ☰ opens the menu sheet',{open:o1});
  const sr=await b.rect('[data-ct="menu-sheet"]');const pt=sr&&sr.x>16?[8,Math.round(sr.y+sr.h/2)]:[8,8];
  await b.page.mouse.click(pt[0],pt[1]);await b.settle(500);const c1=o1&&!(await up());
  L.say(c1,'730x375: TC-MN-051 with the game over, a tap OUTSIDE the sheet, at ('+pt+'), closes it',{closed:c1,sheet:sr});
  const o2=await open();
  L.say(o2,'730x375: TC-MN-051 PRECONDITION the sheet is open again on the game-over screen before Escape',{open:o2});
  await b.page.keyboard.press('Escape');await b.settle(400);const c2=o2&&!(await up());
  L.say(c2,'730x375: TC-MN-051 with the game over, Escape closes the menu sheet',{closed:c2});
  L.say(b.errs.length===0,'730x375: TC-MN-051 zero app errors',b.errs.slice(0,2));
  await b.close();
}
if(blk('Y')){
  const b=await L.launch({geo:LAND,name:'mn-y-reach'});await b.open();
  await b.tapCt('home-menu',700);
  const sh0=await SHEET(b);
  const ids=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return 0;
    const els=[...s.querySelectorAll('button,a')].filter(e=>{const q=e.getBoundingClientRect();return q.width>1&&q.height>1;});
    els.forEach((e,i)=>e.setAttribute('data-gy',String(i)));return els.length;});
  L.say(ids>0,'730x375: TC-MN-052 PRECONDITION the sheet holds controls to reach ('+ids+' buttons and links)',{ids});
  L.say(!!sh0&&sh0.maxScroll>0,'730x375: TC-MN-052 PRECONDITION the sheet overflows ('+(sh0&&sh0.maxScroll)+'px hidden), so reaching its controls takes a swipe',sh0);
  const look=()=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;const c=s.getBoundingClientRect();
    const seen=[];for(const e of s.querySelectorAll('[data-gy]')){const q=e.getBoundingClientRect();
      if(q.top<c.top-0.5||q.bottom>c.bottom+0.5||q.top<0||q.bottom>innerHeight)continue;
      const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);if(h&&(h===e||e.contains(h)))seen.push(+e.getAttribute('data-gy'));}
    return {top:s.scrollTop,max:s.scrollHeight-s.clientHeight,seen,cx:c.left+c.width/2,y0:c.top+c.height*0.6,y1:c.top+c.height*0.6-90};});
  const got=new Set();let st=await look(),moved=null,steps=0,stuck=0;
  (st&&st.seen||[]).forEach(i=>got.add(i));
  while(st&&steps<80&&stuck<2){const t0=st.top;await fingerDragY(b,st.cx,st.y0,st.y1);await b.settle(450);st=await look();steps++;
    if(!st)break;if(moved===null)moved=st.top-t0;st.seen.forEach(i=>got.add(i));stuck=Math.abs(st.top-t0)<1?stuck+1:0;}
  L.say(moved!==null&&moved>20,'730x375: TC-MN-052 PRECONDITION the first finger drag scrolled the sheet ('+moved+'px)',{moved});
  const missed=await b.page.evaluate((g)=>[...document.querySelectorAll('[data-ct="menu-sheet"] [data-gy]')].filter(e=>g.indexOf(+e.getAttribute('data-gy'))<0)
    .map(e=>((e.innerText||'').trim().split('\n')[0]||e.getAttribute('aria-label')||e.getAttribute('title')||e.tagName).slice(0,30)),[...got]);
  L.say(ids>0&&missed.length===0,'730x375: TC-MN-052 every one of the sheet\'s '+ids+' buttons and links is brought fully inside its visible box by real finger drags and hit-tested at its centre ('+got.size+' reached in '+steps+' drags, scrollTop '+(st&&Math.round(st.top))+' of '+(st&&Math.round(st.max))+')',{missed});
  await b.close();
}
// TC-MN-052b [#550 item (28); jobs/landscape-menu-sheet-cannot-be-dismissed-by-an-outside-tap-2026-09-30, the gap batch 9's checker named]:
// THE SAME REAL-SWIPE WALK ON THE SHEET THE JOB MEASURED - the k10 game-over screen at 730x375, whose sheet adds Play's Game setup:
// the span pills (spans with a pointer cursor and no button above them) and the Strength range input. Every one of them must be brought
// fully inside the sheet's visible box by finger drags and hit-test to itself at its centre.
if(blk('Y')){
  const b=await L.launch({geo:LAND,name:'mn-y-over-reach'});await b.open();
  await b.card('k10',2600);await b.settle(10500);
  const over=await b.page.evaluate(()=>/Checkmate/.test(document.body.innerText)&&[...document.querySelectorAll('button')].some(x=>/(^|\n)\s*Rematch$/.test((x.innerText||'').trim()))/* #550 a23: sideways the Rematch button is an icon over its label */);
  const m=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Menu/.test(e.getAttribute('title')||'')&&(e.innerText||'').trim()==='☰'&&e.getBoundingClientRect().width>0);
    if(!x)return null;const q=x.getBoundingClientRect();return [q.left+q.width/2,q.top+q.height/2];});
  if(m){await b.page.mouse.click(m[0],m[1]);await b.settle(700);}
  const sh0=await SHEET(b);
  const ids=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return {n:0};
    const vis=e=>{const q=e.getBoundingClientRect();return q.width>1&&q.height>1;};
    const ctl=[...s.querySelectorAll('button,a,input[type="range"]')].filter(vis);
    const pills=[...s.querySelectorAll('span')].filter(e=>vis(e)&&getComputedStyle(e).cursor==='pointer'&&!e.closest('button,a')&&!e.parentElement.closest('span[data-gy]'));
    const els=[...ctl,...pills];els.forEach((e,i)=>e.setAttribute('data-gy',String(i)));
    return {n:els.length,pills:pills.length,ranges:ctl.filter(e=>e.tagName==='INPUT').length};});
  /* The job named a Strength range input in this sheet; measured on #550 trial t7 there is NONE here (0 range inputs: the k10 game is not
     against the computer), so the precondition requires what the sheet holds - the span pills - and REPORTS the slider count rather than
     requiring a control this state does not have. Any range input that is present is walked like every other control. */
  L.note('730x375: TC-MN-052b the game-over sheet holds '+ids.ranges+' range input(s) on this bundle');
  L.say(over&&ids.n>0&&ids.pills>0,'730x375: TC-MN-052b PRECONDITION the game is over and its menu sheet holds the Game setup span pills ('+ids.pills+') among '+ids.n+' controls (range inputs: '+ids.ranges+')',{over,ids});
  L.say(!!sh0&&sh0.maxScroll>0,'730x375: TC-MN-052b PRECONDITION the game-over sheet overflows ('+(sh0&&sh0.maxScroll)+'px hidden), so reaching its controls takes a swipe',sh0);
  const look=()=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');if(!s)return null;const c=s.getBoundingClientRect();
    const seen=[];for(const e of s.querySelectorAll('[data-gy]')){const q=e.getBoundingClientRect();
      if(q.top<c.top-0.5||q.bottom>c.bottom+0.5||q.top<0||q.bottom>innerHeight)continue;
      const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);if(h&&(h===e||e.contains(h)))seen.push(+e.getAttribute('data-gy'));}
    return {top:s.scrollTop,max:s.scrollHeight-s.clientHeight,seen,cx:c.left+c.width/2,y0:c.top+c.height*0.6,y1:c.top+c.height*0.6-90};});
  const got=new Set();let st=await look(),steps=0,stuck=0;
  (st&&st.seen||[]).forEach(i=>got.add(i));
  while(st&&steps<80&&stuck<2){const t0=st.top;await fingerDragY(b,st.cx,st.y0,st.y1);await b.settle(450);st=await look();steps++;
    if(!st)break;st.seen.forEach(i=>got.add(i));stuck=Math.abs(st.top-t0)<1?stuck+1:0;}
  const missed=await b.page.evaluate((g)=>[...document.querySelectorAll('[data-ct="menu-sheet"] [data-gy]')].filter(e=>g.indexOf(+e.getAttribute('data-gy'))<0)
    .map(e=>((e.innerText||'').trim().split('\n')[0]||e.getAttribute('aria-label')||e.getAttribute('title')||e.tagName).slice(0,30)),[...got]);
  L.say(ids.n>0&&missed.length===0,'730x375: TC-MN-052b on the game-over sheet every one of its '+ids.n+' controls, pills and the slider included, is brought fully inside its visible box by real finger drags and hit-tested at its centre ('+got.size+' reached in '+steps+' drags)',{missed});
  L.say(b.errs.length===0,'730x375: TC-MN-052b zero app errors',b.errs.slice(0,2));
  await b.close();
}
// TC-MN-048 (US-R89), #547 item (135): THE READOUT'S 'screen' ROW PRINTS THE SCREEN, NOT THE INNER VIEWPORT. TC-MN-042 cannot
// tell the two apart (headless screen = viewport, its own note says so). Here CDP emulates a 375x812 SCREEN over a 375x730 viewport, so a
// row that printed innerWidth x innerHeight under 'screen' reads 375x730 and reds. Pre-fix it did exactly that.
if(blk('S')){
  const MD=require('../drive/menu');
  const b=await L.launch({geo:'kunal730',name:'menu-readout-screen'});await b.open();
  let emu=true;try{const cdp=await b.page.context().newCDPSession(b.page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:730,deviceScaleFactor:1,mobile:true,screenWidth:375,screenHeight:812});}catch(e){emu=false;}
  await b.settle(300);
  let ok=true;try{await MD.states['menu-readout'](b);await b.settle(500);}catch(e){ok=false;}
  const r=await b.page.evaluate(()=>{const els=[...document.querySelectorAll('div,pre')].filter(e=>{const t=e.innerText||'';return /screen\s*\d+x\d+/.test(t)&&/inner\s*\d+x\d+/.test(t);});
    els.sort((a,c)=>a.innerText.length-c.innerText.length);const t=els[0]?els[0].innerText.replace(/[ \t]+/g,' '):'';
    const n=(re)=>{const m=re.exec(t);return m?m.slice(1).map(Number):null;};return {screen:n(/screen (\d+)x(\d+)/),inner:n(/inner (\d+)x(\d+)/),truth:{sw:screen.width,sh:screen.height,iw:innerWidth,ih:innerHeight}};});
  if(L.say(emu&&ok&&r.truth.sh===812&&r.truth.ih===730&&!!r.screen&&!!r.inner,'375x730 over a 375x812 screen: TC-MN-048 PRECONDITION the emulation took (screen.height 812, innerHeight 730) and the readout printed both rows',r)){
    L.say(r.screen[0]===375&&r.screen[1]===812,'375x730 over a 375x812 screen: TC-MN-048 the "screen" row prints the device SCREEN ('+r.screen.join('x')+'), not the inner viewport',r);
    L.say(r.inner[0]===375&&r.inner[1]===730,'375x730 over a 375x812 screen: TC-MN-048 and "inner" still prints the viewport the app lays out in ('+r.inner.join('x')+')',r);
  }
  await b.close();
}
  // TC-MN-049 [#548, item (113); jobs/ship-the-owl-coach-drawing-approved-14-sept-2026-10-10, Kunal's answer questions/B8B-OWL ('new')]:
  // THE COACH LOOK PICKER OFFERS THE OWL. At 375x730 and 320x568 the picker at the menu's foot shows five looks - the four human ones
  // and Owl - each a labelled button with a drawing inside it and inside the viewport's width; tapping Owl stores it and marks it
  // chosen. Found by label, not by any hook.
  {const MD=require('../drive/menu');
   for(const g of [L.GEOS.kunal730,{w:320,h:568,safe:''}]){
    const b=await L.launch({geo:g,name:'menu-owl-'+g.w});await b.open();let ok=true;
    try{await MD.states['menu-bottom'](b);await b.settle(500);}catch(e){ok=false;}
    const looks=await b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>/^(Side part|Receding|Balding|Combed back|Owl)$/.test((x.innerText||'').trim())).map(x=>{const q=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),svg:!!x.querySelector('svg'),l:Math.round(q.left),r:Math.round(q.right),vw:innerWidth};}));
    const tag=g.w+'x'+g.h;
    L.say(ok&&looks.length===5&&looks.some(x=>x.t==='Owl'),tag+': TC-MN-049 the Coach look picker offers five looks, Owl among them',looks.map(x=>x.t));
    L.say(looks.length===5&&looks.every(x=>x.svg&&x.l>=0&&x.r<=x.vw),tag+': TC-MN-049 every look is a drawing inside its button and inside the screen\'s width',looks);
    let st=null;const ow=b.page.locator('button',{hasText:/^Owl$/}).first();
    if(await ow.count()){await ow.scrollIntoViewIfNeeded();await ow.click();await b.settle(400);st=await b.page.evaluate(()=>localStorage.getItem('ct_coachstyle'));}
    L.say(st==='owl',tag+': TC-MN-049 tapping Owl chooses it (ct_coachstyle '+st+')',{st});
    L.say(b.errs.length===0,tag+': TC-MN-049 zero app errors',b.errs.slice(0,2));
    await b.close();}}
  // TC-MN-050 [#549, item (10); jobs/ship-the-owl-coach-drawing-approved-14-sept-2026-10-10, acceptance E]: EACH OF THE FIVE LOOKS
  // PAINTS ITS OWN DRAWING, AND THE CHOICE SURVIVES A RELOAD. TC-MN-049 proves five tiles exist and Owl is stored; it cannot see a
  // _Coach that ignores `style`, because the tiles carry their labels whatever they draw. Acceptance E named the Home 'Your coach'
  // card, but MEASURED at #549 that card is never rendered: chess.jsx defines `const _coach` beside the Home blocks and no JSX places
  // it (it has not been placed since #314, `git log -S"{_coach}"`), and the 58px coach sheet opens only from that card. A probe at
  // 375x761 on a fresh store finds no 'Your coach' text and no 46px svg on Home. So the only surface that draws the look is the picker,
  // and this case reads it there: ONE browser at his phone (375x761, one theme, one accent) picks each look by its label, RELOADS and
  // reads ct_coachstyle back; then the five tiles' svgs (found by their labels, not a hook) must be the SAME size and pairwise DIFFERENT.
  // Size and theme are held fixed; the look is the only thing varied. Reviving the Home card is NOT this job (mustNotDo: no new place).
  if(blk('O')){const MD=require('../drive/menu');
   const LOOKS=[['side','Side part'],['recede','Receding'],['bald','Balding'],['comb','Combed back'],['owl','Owl']];
   const b=await L.launch({geo:'kunal761',name:'menu-owl-reload'});await b.open();
   for(const [k,t] of LOOKS){let ok=true;
    try{await MD.states['menu-bottom'](b);await b.settle(400);const tl=b.page.locator('button',{hasText:new RegExp('^'+t+'$')}).first();
      await tl.scrollIntoViewIfNeeded();await tl.click();await b.settle(400);}catch(e){ok=false;}
    await b.open();await b.settle(700);
    const st=await b.page.evaluate(()=>localStorage.getItem('ct_coachstyle'));
    L.say(ok&&st===k,'375x761: TC-MN-050 '+t+' picked in the menu reads back as ct_coachstyle '+k+' after a reload (read '+st+')',{k,st,ok});}
   let ok=true;try{await MD.states['menu-bottom'](b);await b.settle(500);}catch(e){ok=false;}
   const got=await b.page.evaluate((names)=>names.map(t=>{const x=[...document.querySelectorAll('button')].find(e=>(e.innerText||'').trim()===t);
      const sv=x&&x.querySelector('svg');if(!sv)return {t,svg:null};const q=sv.getBoundingClientRect();return {t,svg:sv.innerHTML,w:Math.round(q.width),h:Math.round(q.height)};}),LOOKS.map(l=>l[1]));
   const sz=got.filter(g=>g.svg).map(g=>g.w+'x'+g.h);
   L.say(ok&&sz.length===5&&new Set(sz).size===1,'375x761: TC-MN-050 PRECONDITION all five look tiles carry a drawing, every one at the same size ('+[...new Set(sz)].join(',')+')',got.map(g=>g.t+':'+(g.svg?g.w+'x'+g.h:'none')));
   const n=new Set(got.filter(g=>g.svg).map(g=>g.svg)).size;
   L.say(n===5,'375x761: TC-MN-050 the five looks paint five DIFFERENT drawings at that one size ('+n+' distinct of 5)',got.map(g=>g.t+':'+(g.svg?g.svg.length:0)));
   L.say(b.errs.length===0,'375x761: TC-MN-050 zero app errors',b.errs.slice(0,2));
   await b.close();}
  // TC-MN-053 [#550, item (10); jobs/ship-the-owl-coach-drawing-approved-14-sept-2026-10-10, acceptance D, the gap the orchestrator's
  // check of 10 Nov named]: THE COACH LOOK PICKER, MEASURED at 320x568, 375x679 and 390x844. Each of the five look tiles (found by its
  // label) lies inside the menu sheet's own box horizontally, no two overlap, no label is cut (its scrollWidth fits its clientWidth),
  // each tile is at least 40 by 40 CSS px (the floor gate 30 holds the piece chips to), and no tile sits alone on a later row.
  if(blk('O2')){const MD=require('../drive/menu');
   const NAMES=['Side part','Receding','Balding','Combed back','Owl'];
   for(const geo of ['se','kunal','390']){
    const b=await L.launch({geo,name:'menu-owl-'+geo});await b.open();let ok=true;
    try{await MD.states['menu-bottom'](b);await b.settle(500);}catch(e){ok=false;}
    const m=await b.page.evaluate((names)=>{const tiles=names.map(t=>{const x=[...document.querySelectorAll('button')].find(e=>(e.innerText||'').trim()===t);if(!x)return {t,miss:true};
        const r=x.getBoundingClientRect();let cut=false;for(const el of [x,...x.querySelectorAll('*')]){if(el.children.length===0&&(el.textContent||'').trim()&&el.scrollWidth>el.clientWidth+0.5)cut=true;}
        let sh=x.parentElement;while(sh&&sh!==document.body){const st=getComputedStyle(sh);if(st.overflowY==='auto'||st.overflowY==='scroll')break;sh=sh.parentElement;}const q=sh?sh.getBoundingClientRect():{left:0,right:innerWidth};
        return {t,l:r.left,r:r.right,top:Math.round(r.top),w:r.width,h:r.height,cut,sl:q.left,sr:q.right};});return tiles;},NAMES);
    const tag=L.GEOS[geo].w+'x'+L.GEOS[geo].h;
    const miss=m.filter(x=>x.miss).map(x=>x.t);
    L.say(ok&&miss.length===0,tag+': TC-MN-053 PRECONDITION the menu bottom was reached and all five look tiles are there',{miss});
    if(miss.length===0){
     const out=m.filter(x=>x.l<x.sl-0.5||x.r>x.sr+0.5).map(x=>x.t);
     L.say(out.length===0,tag+': TC-MN-053 every look tile lies inside the sheet\'s box, left to right',{out,sheet:[m[0].sl,m[0].sr]});
     const ov=[];for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++){const A=m[i],B=m[j];const ix=Math.min(A.r,B.r)-Math.max(A.l,B.l),iy=Math.min(A.top+A.h,B.top+B.h)-Math.max(A.top,B.top);if(ix>0.5&&iy>0.5)ov.push(A.t+'/'+B.t);}
     L.say(ov.length===0,tag+': TC-MN-053 no two look tiles overlap',{ov});
     L.say(m.every(x=>!x.cut),tag+': TC-MN-053 no look label is cut',m.filter(x=>x.cut).map(x=>x.t));
     const small=m.filter(x=>x.w<40||x.h<40).map(x=>x.t+' '+Math.round(x.w)+'x'+Math.round(x.h));
     L.say(small.length===0,tag+': TC-MN-053 every look tile is at least 40 by 40',{small});
     const rows={};m.forEach(x=>{rows[x.top]=(rows[x.top]||0)+1;});const tops=Object.keys(rows).map(Number).sort((a,b)=>a-b);
     L.say(tops.length===1||tops.slice(1).every(t=>rows[t]>1),tag+': TC-MN-053 no look tile sits alone on a later row ('+tops.map(t=>rows[t]).join('+')+')',rows);
    }
    await b.close();}
  }
},'MENU');
// THE CONTROL RECORD gates/control-audit.js READS [#546 item (89)]. #545 measured this control and deferred the line so its gated
// tree would not change; its trial bundle did not survive its container, so it was REBUILT from the recipe at #546 with
// gates/build.sh + CT_OUT (app.js untouched) and re-run against this file at a35524b, whose L.say set is today's.
// CONTROL-RECORD: a35524b 2026-10-30 total=132 red=1 scope=trial:4f80bef2ed94 how=the Layout readout's safe top prints safeBot - TC-MN-042 red at kunal761 alone (printed 31, truth 51), every other readout figure green [rebuild of #545's 78fd19c1c246, now on the whole gate]
// CONTROL-RECORD: 529a2ca 2026-11-06 total=159 red=1 scope=trial:580bd0979f88 how=_Coach ignores `style` (const style='comb') - TC-MN-050 "five DIFFERENT drawings" red at 375x761 (1 distinct of 5), every other assertion green (control run with CT_BLK=O, which still runs the unblocked TC-MN-049 lines); good trial 3c8b24df7c01 green
// CONTROL-RECORD: 2bea40d 2026-11-06 total=169 red=3 scope=trial:3369b52e19fd how=#549 item (52) block Y: the menu backdrop's onClick emptied and the sheet's overflowY auto -> hidden - TC-MN-051 outside tap red at 730x375 with the game over, TC-MN-052 first-drag precondition (0px) and reach (9 of 41) red; run with CT_BLK=Y (19 lines, 16 pass 3 fail); a second trial fafa86f07ee3 (Escape key renamed) reds TC-MN-051 Escape alone
// CONTROL-RECORD: d2f6c67 2026-11-11 total=27 red=3 scope=trial:291fb522a568 how=#550 item (10), CT_BLK=O2: the Coach look labels given nowrap, overflow hidden and width 24 - TC-MN-053 'no look label is cut' red at 320x568, 375x679 and 390x844 (four of five names cut; 'Owl' fits); every other O2 line green; the tree's trial 50970d4907c6 reads 27 pass 0 fail
