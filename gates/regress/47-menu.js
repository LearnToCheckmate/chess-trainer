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
//   MN-A  TC-MN-001 002 003 004 005 006          MN-E  TC-MN-022 023 024
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
    ['Eval graph in the player bars','ct_evalgraph', 'OFF · option C','ON · try it in Review','0','1','TC-MN-015'],
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
  const readout=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="menu-sheet"]');
    const d=[...s.querySelectorAll('div')].find(x=>/^what THIS device computes/.test((x.innerText||'').trim()));
    return d?d.innerText.replace(/\s+/g,' ').trim().slice(0,200):null;});
  L.say(!!readout&&/screen 375x730/.test(readout)&&/build #/i.test(readout),
    '375x730: TC-MN-018 turning the readout on paints the live layout block, and it names the viewport it is actually running in and the bundle it was built from',readout);
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

},'MENU');
