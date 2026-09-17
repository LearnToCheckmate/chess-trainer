// RENUMBERED BY THE BUILD SESSION, 2026-09-14. This file was authored as 43-play-setup.js. The build session had
// already committed and pushed gates/regress/43-tcrl-analysis.js (TC-RL batch 1) the same afternoon,
// so 43 AND 44 were both spoken for by the time these two lanes arrived. Theirs moved rather than mine
// because 43-tcrl-analysis is referenced by name in a pushed commit, in gates/logs/, in RUN-LOG.md and
// in claude/stories/README.md, and renaming it would rewrite the record of what was measured and when.
// Nothing else changed: gates.sh runs gates/regress/*.js in NAME order, so the number is ordering only.
//
// regress/45-play-setup.js  (authored as 43-play-setup.js)   PLAY SETUP - the sheet where a game is configured and started.
//
// WHY THIS GATE EXISTS. Play setup gates 100% of Play's value: every single game in the app starts here, and a
// broken setup sheet blocks the core loop outright. It had ZERO stories and ZERO cases before this file. It is
// also the screen with the proven break history at short heights - A-13 on #372, where the Computer sheet scrolled
// 312px on Kunal's phone and "Start game" sat at 931 in a 679-tall viewport.
//
// WHAT THE SUITE ALREADY COVERS, so this file does not duplicate it: gates/regress/30-p1-fixes.js asserts A-13 -
// that the setup sheet does not scroll and the build line is on screen - but ONLY with PASS & PLAY selected, and
// only at 375x679, 390x844 and 375x640. Pass & Play is the SHORTEST of the three variants and the only one that
// fits. The DEFAULT opponent is Computer (chess.jsx:2000, useState('computer')), which adds a persona row, a
// colour row and a strength slider, and that variant has never been measured. This gate measures it.
//
// WHAT IT GUARDS
//   1. Reachability of "Start game" at every geometry, measured correctly (see MEASUREMENT RULES below). This is
//      the assertion the whole screen hangs off: a start button a thumb cannot get to is a dead app.
//   2. That the setup overlay is a real scroll container, so a sheet taller than the phone is always recoverable.
//   3. That NOTHING spills horizontally and the DOCUMENT never scrolls - the spill that cannot be recovered.
//   4. The five opponent personas, their exact Elos, and that each is reachable (the row scrolls sideways).
//   5. The strength slider's range and its two-way sync with the personas.
//   6. Exactly one colour, exactly one time control, exactly one opponent selected at a time.
//   7. The footer line, which is the only thing on screen that states what is about to start.
//   8. "Play from here" arriving from a review: the banner, the preselected side, and the changed button label.
//   9. That Start actually starts, and that "‹ Home" leaves without starting.
//
// MEASUREMENT RULES BAKED IN. Three false findings came out of breaking these in one night, so they are not
// optional and the helpers below are the reference implementation:
//   (a) #root carries overflow-y:auto by design (index.html: "The app scrolls inside here ... the page never
//       does"), so document.scrollingElement NEVER scrolls in this app. Reading docScrollY and concluding that
//       something below the fold is unreachable measures nothing. Worse here: the setup screen is a
//       position:fixed overlay with its own overflowY:auto, so it is not even inside #root's scroll flow, and
//       L.over() - which skips fixed and absolute children - cannot see this screen AT ALL. Any Play-setup
//       assertion written on L.over() is asserting about the screen behind the overlay.
//   (b) An element below the fold is unreachable only when NO USER-scrollable ancestor can bring it on screen.
//       So: collect ancestors whose COMPUTED overflow is auto/scroll, scroll them for real, re-read the rect,
//       restore. Never scrollIntoView() - script can scroll an overflow:hidden box and a finger cannot.
//   (c) On screen is not the same as under the finger. Every reach assertion is paired with a hit test:
//       document.elementFromPoint at the centre of the control's VISIBLE area must land on the control.
//   (d) Playwright's locator.click() auto-scrolls its target into view, so a control a thumb cannot reach passes
//       for the harness. Every rect here is measured BEFORE anything is clicked, and the drive taps are done with
//       an in-page .click() that is honest about being programmatic - reachability is proved separately, by (b).
//   (e) getBoundingClientRect() includes CSS transforms. Nothing on this screen is transformed today; if that
//       changes, these numbers are boxes and not paint.
//
// SELECTORS. The setup sheet carries exactly ONE data-ct in the whole build: [data-ct="setup-sheet"] on the inner
// column (chess.jsx:4514). Nothing else on this screen is hooked - not the opponent tiles, not the personas, not
// the time pills, not the colour buttons, not the slider, not the Start button, not the footer line. So every
// other control here is addressed by its exact rendered text, scoped inside [data-ct="setup-sheet"]. No selector
// in this file is invented; each string was harvested from chess.jsx and confirmed in the live DOM.
// NOTE for whoever hooks this screen later: [data-ct="play-context"] is NOT the setup banner. It is the live
// game's opening/status row (chess.jsx:4895), it renders UNDER the overlay while setup is open, and its text
// there is a single non-breaking space. claude/stories/TEST-CASES-REVIEW.md TC-RL-086 names it as the carrier of
// the "Continuing from your reviewed position" string; it is not, and a gate written from that case would be
// asserting on the wrong element. The banner has no data-ct at all - see PS-I.
//
// CASES IMPLEMENTED (claude/stories/PLAY-SETUP-LANE-2026-09-14.md):
//   PS-A  TC-PS-001 002 003 004 005 006 007      PS-F  TC-PS-026 027 028
//   PS-B  TC-PS-008 009 010                      PS-G  TC-PS-029 030 031 032 033
//   PS-C  TC-PS-011 012 013 014                  PS-H  TC-PS-034 035 036
//   PS-D  TC-PS-015 016 017 018 019              PS-I  TC-PS-037 038 039 040
//   PS-E  TC-PS-020 021 022 023 024 025          PS-J  TC-PS-041 042 043
//
// NEGATIVE CONTROLS - one per asserted property, each a one-line chess.jsx change applied to a SCRATCH COPY only.
// Every one was built with gates/build.sh and this gate was run against it; the RED lines are recorded beside it.
// A green that has never been disproved is worth nothing, and two gates were caught passing their own breakage.
//   P1 Start reachable            chess.jsx:4513  overlay  overflowY:'auto' -> 'hidden'
//        -> 17 FAIL: TC-PS-003 at all six geos, TC-PS-007 at five, TC-PS-010 at all six.
//   P2 personas reachable         chess.jsx:4554  row      overflowX:'auto' -> 'hidden'
//        -> TC-PS-017 red at all three geos: Astrid and Viktor hit=false with nowhere left to scroll.
//   P3 one time control selected  chess.jsx:4573  "No clock" pill(!timeCtrl) -> pill(false)     -> TC-PS-030 red x3.
//   P4 footer names the choices   chess.jsx:4598  footer   the colour term -> a constant "White" -> TC-PS-028 red x3.
//   P5 Start label from a review  chess.jsx:4597  label    the setupFromFEN ternary -> the plain Start label
//        -> TC-PS-040 red at both geos.
//   P6 side-to-move preselected   chess.jsx:4106  handler  setPColor(boardGame.turn) -> setPColor('w')
//        -> TC-PS-037 and TC-PS-039 red at both geos: the banner says White and White is preselected.
//   P7 persona Elos               chess.jsx:1547  BOTS     Viktor elo:2350 -> 2300               -> TC-PS-016 red x3.
//   P8 Start starts a game        chess.jsx:4597  handler  drop setPlaySetup(false)              -> TC-PS-041 red x2.
//
// P1 IS THE ONE THAT MATTERS, and it discriminates in the right way: with the overlay's scroll removed, every
// rect-AT-REST number stays byte-identical - Start game still measures 874..922 at 320x568 - so TC-PS-006 and the
// whole geometry table stay green. Only the REACH assertions move: onScreen false, hit false. That is the proof
// that this gate tests REACHABILITY and not position, which was the distinction three false findings turned on.
// SAID OUT LOUD SO NOBODY READS IT AS COVERAGE: on the P1 bundle TC-PS-007 stays GREEN at 430x932, because that is
// the one geometry where Start game is already on screen at rest and the claim is vacuous there. TC-PS-010 - the
// same claim after a persona has been chosen, which pushes Start below the fold at 430 too - is what catches it.
// A reachability assertion is only a test on a screen where something is genuinely out of reach.
'use strict';
const L=require('../lib');

// ---------------------------------------------------------------------------------------------------------
// THE MEASUREMENT. One canonical reach function, used by every reachability claim in this file.
// Scrolls BOTH axes of every user-scrollable ancestor (the persona row scrolls sideways), re-reads the rect,
// hit-tests, then puts every scroll position back so the next measurement starts from rest.
// ---------------------------------------------------------------------------------------------------------
const REACH=(b,txt,opt)=>b.page.evaluate(([t,exact])=>{
  const sh=document.querySelector('[data-ct="setup-sheet"]');
  if(!sh)return {found:false,noSheet:true};
  const cand=[...sh.querySelectorAll('button,span,input')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;});
  const first=(x)=>(x.innerText||'').trim().split('\n')[0];
  const el=cand.find(x=>first(x)===t)||(exact?null:cand.find(x=>first(x).startsWith(t)));
  if(!el)return {found:false,saw:cand.map(first).filter(Boolean).slice(0,30)};
  const r0=el.getBoundingClientRect();
  // (b) USER-scrollable ancestors only: computed overflow auto|scroll AND actual room to move.
  const scs=[];let p=el.parentElement;
  while(p&&p!==document.documentElement){const st=getComputedStyle(p);
    const y=/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1;
    const x=/auto|scroll/.test(st.overflowX)&&p.scrollWidth>p.clientWidth+1;
    if(y||x)scs.push({el:p,y,x});p=p.parentElement;}
  const saved=scs.map(s=>[s.el.scrollTop,s.el.scrollLeft]);
  // two passes: scrolling an outer box moves the inner one, so the inner correction needs re-applying
  for(let pass=0;pass<2;pass++)for(let i=scs.length-1;i>=0;i--){
    const q=scs[i].el,pr=q.getBoundingClientRect(),er=el.getBoundingClientRect();
    if(scs[i].y)q.scrollTop =Math.max(0,Math.min(q.scrollHeight-q.clientHeight,q.scrollTop +(er.bottom-pr.bottom)+8));
    if(scs[i].x)q.scrollLeft=Math.max(0,Math.min(q.scrollWidth -q.clientWidth ,q.scrollLeft+(er.right -pr.right )+8));}
  const r=el.getBoundingClientRect();
  // (c) on screen is not under the finger: hit-test the centre of the VISIBLE area
  const hx=Math.round(r.left+r.width/2),hy=Math.round((Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2);
  const hit=document.elementFromPoint(hx,hy);
  const out={found:true,label:first(el),
    restTop:Math.round(r0.top),restBottom:Math.round(r0.bottom),restRight:Math.round(r0.right*10)/10,
    restOn:r0.top>=-0.5&&r0.bottom<=innerHeight+0.5&&r0.left>=-0.5&&r0.right<=innerWidth+0.5,
    top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),
    w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,
    onScreen:r.top>=-0.5&&r.bottom<=innerHeight+0.5&&r.left>=-0.5&&r.right<=innerWidth+0.5,
    scrollers:scs.length,hit:!!(hit&&(hit===el||el.contains(hit))),hitWas:hit?(hit.tagName.toLowerCase()+(hit.getAttribute&&hit.getAttribute('data-ct')?'['+hit.getAttribute('data-ct')+']':'')):null,
    vh:innerHeight,vw:innerWidth};
  scs.forEach((s,i)=>{s.el.scrollTop=saved[i][0];s.el.scrollLeft=saved[i][1];});
  return out;},[txt,!!(opt&&opt.exact)]);

// The overlay that carries the sheet: its scroll range IS the answer to "what does the sheet do when it is
// taller than the phone". Measured on the PARENT of setup-sheet, which is the fixed overlay (chess.jsx:4513).
const SHEET=(b)=>b.page.evaluate(()=>{
  const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
  const p=s.parentElement,ps=getComputedStyle(p),sr=s.getBoundingClientRect();
  return {w:Math.round(sr.width*10)/10,h:Math.round(sr.height*10)/10,
    pos:ps.position,overflowY:ps.overflowY,maxScroll:Math.round(p.scrollHeight-p.clientHeight),
    vh:innerHeight,vw:innerWidth,
    docScrollY:Math.round(scrollY),
    docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight),
    docScrollW:document.documentElement.scrollWidth};});

// Selection state without knowing the theme: --ac is the accent every selected control borders itself with.
const GROUP=(b,re)=>b.page.evaluate((src)=>{
  const r=new RegExp(src);const sh=document.querySelector('[data-ct="setup-sheet"]');if(!sh)return null;
  const probe=document.createElement('span');probe.style.color='var(--ac)';sh.appendChild(probe);
  const ac=getComputedStyle(probe).color;probe.remove();
  const els=[...sh.querySelectorAll('button,span')].filter(x=>{const q=x.getBoundingClientRect();
    return q.width>1&&q.height>1&&r.test((x.innerText||'').trim().split('\n')[0])&&getComputedStyle(x).borderTopWidth!=='0px';});
  return {ac,items:els.map(x=>{const cs=getComputedStyle(x),q=x.getBoundingClientRect();
    return {t:(x.innerText||'').trim().split('\n')[0],on:cs.borderTopColor===ac,h:Math.round(q.height*10)/10,w:Math.round(q.width*10)/10};})};},re.source);

// Everything horizontal that cannot be recovered on a phone. The persona row and the sheet scroll sideways ON
// PURPOSE, so they are excluded the way gate 40 excludes the review's move strip; what is asserted is that
// nothing ESCAPES the viewport and that the document itself never gains a horizontal scroll.
const HSPILL=(b)=>b.page.evaluate(()=>{
  const sh=document.querySelector('[data-ct="setup-sheet"]');if(!sh)return null;
  const vw=innerWidth,bad=[];
  const inScroller=(e)=>{let p=e.parentElement;while(p&&p!==document.documentElement){const s=getComputedStyle(p);
    if(/auto|scroll/.test(s.overflowX)&&p.scrollWidth>p.clientWidth+1)return true;p=p.parentElement;}return false;};
  for(const e of sh.querySelectorAll('*')){
    const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none')continue;
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)continue;
    if(r.right>vw+0.5&&!inScroller(e))bad.push({tag:e.tagName.toLowerCase(),right:Math.round(r.right*10)/10,t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,26)});}
  return {vw,docScrollW:document.documentElement.scrollWidth,bad:bad.slice(0,5)};});

const FOOT=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
  const d=[...s.querySelectorAll('div')].filter(x=>x.children.length===0&&/·/.test(x.innerText||'')&&!/^Build/.test((x.innerText||'').trim()));
  return d.length?d[d.length-1].innerText.replace(/\s+/g,' ').trim():null;});
const START_LABEL=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
  const bs=[...s.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1;});
  return bs.length?bs[bs.length-1].innerText.replace(/\s+/g,' ').trim():null;});
const SLIDER=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
  const i=s.querySelector('input[type=range]');if(!i)return null;const q=i.getBoundingClientRect();
  const lab=[...s.querySelectorAll('span')].find(x=>/^≈ \d+ Elo$/.test((x.innerText||'').trim())&&!x.closest('button'));
  return {min:i.min,max:i.max,step:i.step,value:i.value,w:Math.round(q.width*10)/10,label:lab?lab.innerText.trim():null};});
const SET_SLIDER=(b,v)=>b.page.evaluate((v)=>{const i=document.querySelector('[data-ct="setup-sheet"] input[type=range]');
  if(!i)return false;const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  set.call(i,String(v));i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true;},v);
// (d) a drive tap, deliberately programmatic and deliberately NOT locator.click(): reachability is proved by
// REACH() above, never by the fact that the harness managed to press something.
const TAP=async(b,t,wait)=>{const ok=await b.page.evaluate((s)=>{const sh=document.querySelector('[data-ct="setup-sheet"]');
    if(!sh)return false;const el=[...sh.querySelectorAll('button,span')].find(x=>(x.innerText||'').trim().split('\n')[0]===s);
    if(!el)return false;el.click();return true;},t);
  await b.settle(wait==null?450:wait);return ok;};
const openSetup=async(b)=>{await b.home();await b.tile('Play');await b.settle(600);};

const PGN='[White "Morphy"] [Black "Duke"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 *';
const GEOS=['se','kunal','kunal730','kunal761','390','430'];
// Measured on #386. Both tables are the POINT of this lane: an assertion that runs at one width is not a test.
// "rest" = where Start game sits before anything is scrolled, in the DEFAULT (vs Computer) configuration.
/* #408 MOVED EVERY NUMBER IN THIS TABLE BY EXACTLY +29, AND THE TABLE IS A RECORD RATHER THAN A REQUIREMENT -
   which is the distinction this gate's own header turns on ("this gate tests REACHABILITY and not position").
   R-BS-2 of the board-scan spec reserves the scan message row so the sheet stops moving when a scan starts
   (measured on the shipped #407 release: the sheet's content height jumped 938 -> 966 the moment a scan began,
   28px under the player's thumb). The reserve is 21px of row plus its 8px top margin, and it sits above Start
   game, so Start game moved down by that 29 at EVERY geometry: se 874 -> 903, kunal 808 -> 837, kunal730 and
   kunal761 844 -> 873, 390 and 430 827 -> 856. Uniform, because the reserve is a fixed height and not a
   proportion. TC-PS-007 - a thumb can still reach it by scrolling the overlay's own range - stayed GREEN at all
   six, which is what says this is a cost and not a defect.
   THE COST IS WORTH SEEING PLAINLY: 29px of sheet is now spent on every setup, on every screen, to reserve
   space for a message from a feature whose cloud function is still not deployed (flag
   scan-board-cloud-function-never-deployed). Two cheaper shapes were measured and not taken at #408 - merging
   the message into the helper line's existing row (about +3.5px, but it changes when that helper copy shows,
   and R-BS-6 is AMBER with a recommendation to change nothing), and dropping the helper line's own 7px margin
   (+22px). Flag scan-row-collapses-on-second-tap carries all three with their numbers, because the row's final
   shape is one decision and not three separate nudges. */
const START_REST={se:903,kunal:837,kunal730:873,kunal761:873,'390':856,'430':856};
const SHEET_W   ={se:288,kunal:343,kunal730:343,kunal761:343,'390':358,'430':398};

// CT_PS_BLOCKS=A,B  runs only the named blocks. It exists for the NEGATIVE CONTROLS - proving eight one-line
// breakages red means eight gate runs, and the "Play from here" block costs a full Stockfish analysis each time.
// Unset (the suite's own case) runs everything, so gates.sh is never selective by accident.
const ONLY=(process.env.CT_PS_BLOCKS||'').split(',').map(x=>x.trim()).filter(Boolean);
const blk=(k)=>!ONLY.length||ONLY.indexOf(k)>=0;

L.run(async()=>{

// =========================================================================================================
// PS-A  The sheet as it arrives, at every geometry. TC-PS-001..007.
// The DEFAULT opponent is Computer, so this is the screen every user actually meets - and the variant
// 30-p1-fixes.js does not measure.
// =========================================================================================================
if(blk('A'))for(const geo of GEOS){
  const b=await L.launch({geo,name:'ps-a-'+geo});await b.open();
  await openSetup(b);
  const sh=await SHEET(b);
  L.say(!!sh,geo+': TC-PS-001 the Play tile on Home opens [data-ct="setup-sheet"] - the only data-ct this whole screen carries',sh);
  L.say(!!sh&&Math.abs(sh.w-SHEET_W[geo])<0.6,geo+': TC-PS-002 the sheet is '+SHEET_W[geo]+' wide - the measured number, not "the same as last time". It is the viewport less the overlay\'s 16px gutters, capped at maxWidth 420',{measured:sh&&sh.w,want:SHEET_W[geo]});
  L.say(!!sh&&sh.pos==='fixed'&&/auto|scroll/.test(sh.overflowY),
    geo+': TC-PS-003 the setup screen is a position:fixed overlay that scrolls ITSELF (overflowY '+(sh&&sh.overflowY)+'). This is what makes a sheet taller than the phone recoverable at all, and it is why L.over() - which skips fixed children of #root - cannot see this screen. Any Play-setup assertion built on L.over() is measuring the screen behind the overlay.',sh);
  L.say(!!sh&&sh.docScroll===0&&sh.docScrollY===0,
    geo+': TC-PS-004 the DOCUMENT still does not scroll (docScroll '+(sh&&sh.docScroll)+'). #root carries overflow-y:auto by design, so document.scrollingElement never moves in this app - pinned here because reading it and concluding "nothing scrolls" is the error that produced three false findings in one night.',sh);
  const hs=await HSPILL(b);
  L.say(!!hs&&hs.bad.length===0&&hs.docScrollW<=hs.vw+0.5,
    geo+': TC-PS-005 nothing in the sheet escapes the RIGHT edge and document.scrollWidth stays at '+(hs&&hs.vw)+'. Vertical spill inside a scroller is fine; horizontal spill past the viewport cannot be recovered on a phone (flag sweep372-other-lines-320).',hs);

  const st=await REACH(b,'▶ Start game');
  L.note(geo+': Start game at rest '+st.restTop+'..'+st.restBottom+' in a '+st.vh+'-tall viewport; the overlay can scroll '+sh.maxScroll+'px');
  L.say(st.found&&Math.abs(st.restTop-START_REST[geo])<2,
    geo+': TC-PS-006 Start game sits at y='+START_REST[geo]+' at rest, measured. It is BELOW THE FOLD at five of the six gate geometries - only 430x932 shows it without a scroll - and 30-p1-fixes.js A-13 does not see this because it only ever selects Pass & Play, the one variant short enough to fit.',{measured:st.restTop,want:START_REST[geo],restOn:st.restOn});
  L.say(st.found&&st.onScreen&&st.hit,
    geo+': TC-PS-007 and a thumb CAN get to it: scrolling only the overlay\'s own user-scrollable range brings Start game fully on screen ('+st.top+'..'+st.bottom+' of '+st.vh+') and document.elementFromPoint at the centre of it lands on the button itself, not on something layered over it. Below the fold is not unreachable; not hit-testable is.',st);
  L.say(b.errs.length===0,geo+': zero app errors on the setup screen',b.errs.slice(0,3));
  await b.shot('ps-a-'+geo);
  await b.close();
}

// =========================================================================================================
// PS-B  What choosing an opponent does to the geometry. TC-PS-008..010.
// Picking a persona is the whole point of the screen, and it makes the screen taller: the selected chip gains
// its blurb line and the row goes 95 -> 170. Start game drops another ~75px with it.
// =========================================================================================================
if(blk('B'))for(const geo of GEOS){
  const b=await L.launch({geo,name:'ps-b-'+geo});await b.open();await openSetup(b);
  const before=await REACH(b,'▶ Start game');
  const rowBefore=(await GROUP(b,/^(Pip|Rosa|Milo|Astrid|Viktor)$/)).items.filter(x=>x.h>40);
  await TAP(b,'Viktor',500);
  const rowAfter=(await GROUP(b,/^(Pip|Rosa|Milo|Astrid|Viktor)$/)).items.filter(x=>x.h>40);
  const after=await REACH(b,'▶ Start game');
  L.say(rowBefore.length===5&&rowBefore.every(x=>Math.abs(x.h-95)<0.6)&&rowAfter.length===5&&rowAfter.every(x=>Math.abs(x.h-170)<0.6),
    geo+': TC-PS-008 choosing a persona grows EVERY chip in the row from 95 to 170 - the selected one gains its blurb line and the row is a flex row, so all five follow. Same at every width.',{before:rowBefore.map(x=>x.h),after:rowAfter.map(x=>x.h)});
  L.say(after.restTop-before.restTop>=70&&after.restTop-before.restTop<=80,
    geo+': TC-PS-009 and that pushes Start game down '+(after.restTop-before.restTop)+'px, to '+after.restTop+'. After a persona is chosen Start game is below the fold at ALL SIX geometries, 430x932 included - the one geometry where it fitted before.',{before:before.restTop,after:after.restTop,vh:after.vh,restOn:after.restOn});
  L.say(after.onScreen&&after.hit,
    geo+': TC-PS-010 it is still reachable and still hit-testable in the taller sheet ('+after.top+'..'+after.bottom+' of '+after.vh+')',after);
  await b.close();
}

// =========================================================================================================
// PS-C..PS-H  The controls. Driven at three geometries - the 568 floor, Kunal's real phone, and a tall one -
// because these are state assertions with a geometry component, not pure layout.
// =========================================================================================================
if(blk('C'))for(const geo of ['se','kunal730','430']){
  const b=await L.launch({geo,name:'ps-c-'+geo});await b.open();await openSetup(b);

  // ---- PS-C the three opponent tiles. TC-PS-011..014
  const opp=await GROUP(b,/^(Online|Computer|Pass & Play)$/);
  const oppOn=opp.items.filter(x=>x.on);
  L.say(opp.items.length===3,geo+': TC-PS-011 three opponent tiles - Online, Computer, Pass & Play',opp.items.map(x=>x.t+' '+x.w+'x'+x.h));
  L.say(oppOn.length===1&&oppOn[0].t==='Computer',
    geo+': TC-PS-012 exactly ONE is selected on arrival and it is Computer (chess.jsx:2000 useState(\'computer\')). This is why the default screen is the tall one, and why measuring only Pass & Play measures the variant nobody lands on.',opp.items);
  L.say(opp.items.every(x=>x.h>=44),geo+': TC-PS-013 every opponent tile is at least 44px tall (measured '+opp.items[0].h+')',opp.items.map(x=>x.h));
  await TAP(b,'Pass & Play',500);
  const noSlider=await SLIDER(b);
  const pp=await SHEET(b);
  L.say(noSlider===null,geo+': TC-PS-014 Pass & Play drops the persona row, the colour row and the strength slider - there is no input[type=range] on screen at all, which is exactly why its sheet fits ('+pp.h+' tall, overlay scroll '+pp.maxScroll+') where the Computer sheet does not');
  await TAP(b,'Computer',500);

  // ---- PS-D the five personas. TC-PS-015..019
  const per=await REACH(b,'Pip');
  L.say(per.found,geo+': TC-PS-015 the persona row is on screen');
  const names=['Pip','Rosa','Milo','Astrid','Viktor'],elos=[500,900,1300,1900,2350];
  const chips=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');
    return [...s.querySelectorAll('button')].filter(x=>/≈ \d+ Elo/.test(x.innerText||'')).map(x=>(x.innerText||'').replace(/\s+/g,' ').trim());});
  const ok=names.every((n,i)=>chips.some(c=>c.startsWith(n+' ≈ '+elos[i]+' Elo')));
  L.say(chips.length===5&&ok,geo+': TC-PS-016 five personas, each naming its exact Elo: Pip 500, Rosa 900, Milo 1300, Astrid 1900, Viktor 2350',chips);
  const reaches=[];for(const n of names)reaches.push(await REACH(b,n));
  const atRest=reaches.filter(x=>x.restOn).map(x=>x.label);
  L.say(reaches.every(x=>x.onScreen&&x.hit),
    geo+': TC-PS-017 every one of the five can be brought fully on screen AND is hit-testable there - the row is a horizontal scroller, so the ones off the right edge are swiped to, not lost. Reached by scrolling the row for real, never by scrollIntoView.',reaches.map(x=>x.label+' rest.right='+x.restRight+' -> '+x.left+'..'+x.right+' hit='+x.hit));
  L.say(!reaches[4].restOn,
    geo+': TC-PS-018 Viktor is NEVER visible at rest - his right edge is at '+reaches[4].restRight+' against a '+reaches[4].vw+'px viewport at every width in the gate set. The strongest opponent in the app always costs a sideways swipe to find. Visible at rest here: '+atRest.join(', '),{restRight:reaches[4].restRight,vw:reaches[4].vw,atRest});
  await TAP(b,'Milo',500);
  const perOn=(await GROUP(b,/^(Pip|Rosa|Milo|Astrid|Viktor)$/)).items.filter(x=>x.on&&x.h>40);
  L.say(perOn.length===1&&perOn[0].t==='Milo',geo+': TC-PS-019 tapping one persona selects exactly one',perOn);

  // ---- PS-E the strength slider. TC-PS-020..025
  let sl=await SLIDER(b);
  L.say(!!sl&&sl.min==='400'&&sl.max==='2400'&&sl.step==='25',
    geo+': TC-PS-020 the strength slider runs 400 to 2400 in steps of 25 (ELO_MIN/ELO_MAX, chess.jsx:990)',sl);
  L.say(!!sl&&sl.value==='1300'&&sl.label==='≈ 1300 Elo',
    geo+': TC-PS-021 choosing Milo drives the slider to his Elo and the readout to "≈ 1300 Elo" - the persona chips and the slider are one value, not two',sl);
  await SET_SLIDER(b,1900);await b.settle(400);
  const at1900=(await GROUP(b,/^(Pip|Rosa|Milo|Astrid|Viktor)$/)).items.filter(x=>x.on&&x.h>40);
  L.say(at1900.length===1&&at1900[0].t==='Astrid'&&(await FOOT(b)).startsWith('vs Astrid'),
    geo+': TC-PS-022 and it works the other way: dragging the slider onto a persona\'s exact Elo selects that persona',{sel:at1900,foot:await FOOT(b)});
  await SET_SLIDER(b,1925);await b.settle(400);
  const at1925=(await GROUP(b,/^(Pip|Rosa|Milo|Astrid|Viktor)$/)).items.filter(x=>x.on&&x.h>40);
  L.say(at1925.length===0&&(await FOOT(b))==='vs Computer · White · No clock',
    geo+': TC-PS-023 one step off a persona\'s Elo (1925) deselects every chip and the footer falls back to the unnamed "vs Computer". botForElo is an EXACT match (chess.jsx:1550), so only 5 of the slider\'s 81 stops name an opponent - and the app\'s own default, 800, is not one of them.',{sel:at1925,foot:await FOOT(b),elo:(await SLIDER(b)).value});
  await SET_SLIDER(b,2400);await b.settle(400);
  L.say((await SLIDER(b)).label==='≈ 2400 Elo'&&(await FOOT(b))==='vs Computer · White · No clock',
    geo+': TC-PS-024 the slider\'s top end is 2400 but the strongest persona is Viktor at 2350, so the maximum strength in the app has no face and no name',{foot:await FOOT(b)});
  await SET_SLIDER(b,400);await b.settle(400);
  L.say((await SLIDER(b)).label==='≈ 400 Elo'&&(await FOOT(b))==='vs Computer · White · No clock',
    geo+': TC-PS-025 and the bottom end, 400, is below Pip\'s 500 and is equally unnamed',{foot:await FOOT(b)});
  await TAP(b,'Milo',450);

  // ---- PS-F colour. TC-PS-026..028
  const col0=await GROUP(b,/^(White|Black)$/);
  const on0=col0.items.filter(x=>x.on);
  L.say(col0.items.length===2&&on0.length===1&&on0[0].t==='White',
    geo+': TC-PS-026 two colour buttons, White selected by default (chess.jsx:2164 useState(\'w\'))',col0.items);
  L.say(col0.items.every(x=>x.h>=44),geo+': TC-PS-027 both colour buttons are at least 44px tall (measured '+col0.items[0].h+')',col0.items.map(x=>x.h));
  await TAP(b,'Black',400);
  const on1=(await GROUP(b,/^(White|Black)$/)).items.filter(x=>x.on);
  L.say(on1.length===1&&on1[0].t==='Black'&&/· Black ·/.test(await FOOT(b)),
    geo+': TC-PS-028 tapping Black moves the selection and the footer follows it',{sel:on1,foot:await FOOT(b)});
  await TAP(b,'White',400);

  // ---- PS-G time control. TC-PS-029..033
  const tc=await GROUP(b,/^(No clock|\d+ min|\d\+\d)$/);
  const tcOn=tc.items.filter(x=>x.on);
  L.say(tc.items.length===9,geo+': TC-PS-029 nine time controls: No clock plus the eight in TIME_CONTROLS (chess.jsx:994)',tc.items.map(x=>x.t));
  L.say(tcOn.length===1&&tcOn[0].t==='No clock',geo+': TC-PS-030 No clock is selected on arrival and it is the only one selected',tc.items);
  await TAP(b,'3+1',400);
  const tc2=(await GROUP(b,/^(No clock|\d+ min|\d\+\d)$/)).items.filter(x=>x.on);
  L.say(tc2.length===1&&tc2[0].t==='3+1'&&/· 3\+1$/.test(await FOOT(b)),
    geo+': TC-PS-031 picking one moves the selection and the footer names it',{sel:tc2,foot:await FOOT(b)});
  // THE CROSS-OPPONENT STATE. Two taps from the default screen.
  await TAP(b,'Online',600);
  // #400 CLOSED THIS DEFECT AND THE PIN MOVES WITH IT rather than being deleted (CLAUDE.md). What this used to
  // pin: switching to Online with 3+1 selected showed FOUR "Time per move" pills with NONE selected, because
  // timeCtrl was still {label:'3+1'} so `!timeCtrl` was false and no CORR_CONTROLS label matched - no state on
  // screen said what the game would use, and Continue proceeded anyway. #400 (R-OC-1/R-OC-2) shows the live row
  // for an online game and keeps the selection, so the answer is now on screen. This assertion went RED on the
  // #400 bundle before being rewritten, which is the gate doing its job: it detected the behaviour moving, in the
  // good direction, from a different driver and different geometries than gate 25-online-clocks uses.
  const onlLive=(await GROUP(b,/^(No clock|\d+ min|\d\+\d)$/)).items;
  const onlCorr=(await GROUP(b,/^(No limit|\d days? \/ move)$/)).items;
  const onlSel=[...onlLive,...onlCorr].filter(x=>x.on);
  L.say(onlLive.length===9&&onlSel.length===1&&onlSel[0].t==='3+1',
    geo+': TC-PS-032 the blitz control a player picked SURVIVES the switch to Online, and the live row is on screen there to show it - nine live pills plus the day limits, with exactly one selection across both rows. Before #400 this screen offered no minute clocks for an online game at all and showed four day pills with nothing selected',{live:onlLive.length,corr:onlCorr.length,selected:onlSel});
  L.say(onlCorr.length===3&&!onlCorr.some(x=>x.t==='No limit'),
    geo+': TC-PS-032b the day-limit row no longer carries its own "No limit" null pill - the null option lives ONCE, as "No clock" in the live row above, because two null pills keyed off the same !timeCtrl state both lit up at once and the screen showed two selections for one setting',onlCorr.map(x=>x.t));
  await TAP(b,'3 days / move',400);
  await TAP(b,'Computer',600);
  const back=await GROUP(b,/^(No clock|\d+ min|\d\+\d)$/);
  const footBack=await FOOT(b);
  // #400 CLOSED THIS ONE TOO, and it was the worse half. What it used to pin: pick "3 days / move" under Online,
  // switch back to Computer, and all nine Computer pills read unselected while the FOOTER named the correspondence
  // limit as the time control of a local game against Stockfish - from a list this screen does not offer and
  // cannot select back. #400's R-OC-2 clears a corr limit when the opponent stops being online. NOTE FOR WHOEVER
  // READS THE #400 DIFF: the first version of that fix went on the MENU's opponent spans (chess.jsx:4898) and NOT
  // on this sheet's opponent buttons (chess.jsx:4656), so this very assertion would still have been red - the
  // antagonist pass found it, and this gate would have caught it independently.
  const backSel=back.items.filter(x=>x.on);
  L.say(backSel.length===1&&backSel[0].t==='No clock'&&!/\/ move$/.test(footBack),
    geo+': TC-PS-033 a correspondence day-limit does NOT follow the player back into a local game: exactly one live pill is selected ("No clock") and the footer reads "'+footBack+'" with no per-move limit in it. Before #400 nine pills read unselected and the footer named a multi-day limit on a game against Stockfish',{selected:backSel,foot:footBack});
  await TAP(b,'No clock',400);

  // ---- PS-H the footer line. TC-PS-034..036
  await TAP(b,'Milo',450);
  L.say((await FOOT(b))==='vs Milo · White · No clock',
    geo+': TC-PS-034 the footer states the three choices in order - opponent, colour, clock. It is the only line on the screen that says what is about to start.',await FOOT(b));
  await TAP(b,'Pass & Play',550);
  L.say((await FOOT(b))==='Pass & play on one device · No clock'&&(await START_LABEL(b))==='▶ Start game',
    geo+': TC-PS-035 Pass & Play restates itself as "Pass & play on one device · No clock" and keeps the clock choice across the opponent switch',{foot:await FOOT(b),label:await START_LABEL(b)});
  await TAP(b,'Online',600);
  L.say((await FOOT(b))==='Online · play a friend by invite code'&&(await START_LABEL(b))==='Continue →',
    geo+': TC-PS-036 Online names no clock and no colour, and the button becomes "Continue →" because the next screen is where the game is actually made',{foot:await FOOT(b),label:await START_LABEL(b)});
  L.say(b.errs.length===0,geo+': zero app errors across the control sweep',b.errs.slice(0,3));
  await b.close();
}

// =========================================================================================================
// PS-I  "Play from here" - setup arriving from a review. TC-PS-037..040.
// Two geometries: the 568 floor and Kunal's real phone. Each needs a real analysis, so this is the slow block.
// =========================================================================================================
if(blk('I'))for(const geo of ['se','kunal730']){
  const b=await L.launch({geo,name:'ps-i-'+geo,store:{ct_pool:'3',ct_revmig339:'1',ct_revCompact:'1'}});await b.open();
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN);
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
  await b.settle(400);
  await b.tapText(/^Start review/,{wait:900}).catch(()=>{});
  await b.settle(500);
  // three plies in, so the side to move is BLACK and the preselect is a real claim rather than the default
  for(let i=0;i<3;i++){await b.page.locator('[aria-label="Next move"]').first().click();await b.settle(220);}
  const ply=await b.text('[data-ct="rev-move-line"]');
  await b.tapCt('rev-more',800);
  await b.tapText(/^Play from here$/,{wait:1000});
  await b.settle(500);
  const ban=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;
    const d=[...s.querySelectorAll('div')].find(x=>/Continuing from your reviewed position/.test(x.innerText||'')&&x.children.length<=2);
    const pc=document.querySelector('[data-ct="play-context"]');
    return {sheet:true,present:!!d,ct:d?d.getAttribute('data-ct'):null,
      t:d?d.innerText.replace(/\s+/g,' ').trim():null,h:d?Math.round(d.getBoundingClientRect().height):null,
      pcPresent:!!pc,pcInk:pc?pc.innerText.replace(/[\s\u00a0]+/g,''):null};});
  L.note(geo+': came from '+JSON.stringify(ply));
  L.say(!!ban&&ban.present&&ban.t==="♟ Continuing from your reviewed position. You'll play Black (the side to move) — switch the color below if you'd rather take the other side.",
    geo+': TC-PS-037 the setup sheet opens with the banner, word for word, naming the side to move',ban);
  L.say(!!ban&&ban.ct===null&&ban.pcPresent&&ban.pcInk==='',
    geo+': TC-PS-038 the banner carries NO data-ct. [data-ct="play-context"] IS in the DOM - it is the live game\'s opening row rendering under the overlay - and it carries no ink at all there (its text is a lone non-breaking space). TEST-CASES-REVIEW.md TC-RL-086 names play-context as the carrier of this string; it is not, and a gate written from that case asserts on the wrong element.',ban);
  const col=(await GROUP(b,/^(White|Black)$/)).items;
  L.say(col.filter(x=>x.on).length===1&&col.find(x=>x.on).t==='Black'&&(await FOOT(b))==='vs Computer · Black · No clock',
    geo+': TC-PS-039 the colour preselected is the SIDE TO MOVE at that ply (Black after 2.Nf3), not the reviewer\'s own side, and the footer agrees. US-R28 asks for "my side"; this is what the build does (chess.jsx:4106 setPColor(boardGame.turn)).',{col,foot:await FOOT(b)});
  const st=await REACH(b,'▶ Play this position');
  L.say((await START_LABEL(b))==='▶ Play this position'&&st.found&&st.onScreen&&st.hit,
    geo+': TC-PS-040 the button relabels itself "▶ Play this position", and it is reachable and hit-testable at '+st.top+'..'+st.bottom+' of '+st.vh+' (at rest it sits at '+st.restTop+', below the fold at both geometries)',st);
  await b.shot('ps-i-'+geo);
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
  await b.close();
}

// =========================================================================================================
// PS-J  Leaving the screen - the only two ways out. TC-PS-041..043.
// =========================================================================================================
if(blk('J'))for(const geo of ['se','kunal730']){
  const b=await L.launch({geo,name:'ps-j-'+geo});await b.open();await openSetup(b);
  await TAP(b,'Milo',450);await TAP(b,'Black',400);
  await TAP(b,'▶ Start game',1500);
  const after=await b.page.evaluate(()=>({sheet:!!document.querySelector('[data-ct="setup-sheet"]'),
    home:!!document.querySelector('[data-ct="play-home"]')}));
  const bd=await b.board();
  L.say(!after.sheet&&!!bd&&after.home,
    geo+': TC-PS-041 Start game dismisses the setup sheet and lands on a painted board with the live Play chrome',{after,board:bd&&{x:Math.round(bd.x),y:Math.round(bd.y),w:Math.round(bd.w)}});
  L.say(!!bd&&bd.flip===true,
    geo+': TC-PS-042 and the colour chosen is honoured - Black was selected, so the board comes up flipped',{flip:bd&&bd.flip});
  await openSetup(b);
  await TAP(b,'‹ Home',700);
  const left=await b.page.evaluate(()=>!!document.querySelector('[data-ct="setup-sheet"]'));
  L.say(!left&&await b.onHome(),geo+': TC-PS-043 "‹ Home" leaves setup without starting anything and returns to Home');
  L.say(b.errs.length===0,geo+': zero app errors leaving the screen',b.errs.slice(0,3));
  await b.close();
}

},'PLAY-SETUP');