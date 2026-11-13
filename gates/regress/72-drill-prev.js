// regress/72-drill-prev.js   TC-R47 (US-R35): a drill must go BACKWARDS as well as forwards, and a card
// THE IDS ARE NOT THE ONES THE JOB NAMES, DELIBERATELY. jobs/drill-needs-a-previous-card-2026-09-23 says
// "US-R27 (NEW)" and "TC-R37 (NEW)", written by spec-a on 2026-09-28; both were ALREADY TAKEN in
// claude/stories/ by the Lesson MOVES row pair, so following the job verbatim would have minted a second
// US-R27 and a second TC-R37 - one id, two meanings, which is R45 shape (1). #475 allocated US-R35 and TC-R47,
// both past the highest id in use, and filed the cause as a job rather than only stepping around it.
// you already solved must come back solved rather than asking again.
// BLOCK C, TC-R80 (US-R75, #547 item (110)): the brilliancy card's goal box is one line, chipless, and the verdict is the
// move's own explanation or nothing.
// BLOCK J, TC-R108 (US-R100, #549 item (15)): the first card served is stamped practised, and the 150 cap holds on load.
// CONTROL-RECORD: d140c9a 2026-11-11 total=287 red=16 scope=trial:6fd424a4553c how=#550 item (22): trial t5 (item 13's tree, no drill chooser) - TC-R178's four lines red at both drills and both geometries (the counter opens nothing); every other line green
// CONTROL-RECORD: d140c9a 2026-11-11 total=287 red=19 scope=trial:d044eeb93e96 how=#550 item (13): trial c13 (mineN counting every stored row, t5's tree otherwise) - block K's TC-R177 lines red (3) plus block L's 16 (no chooser on that tree)
// CONTROL-RECORD: 7223662 2026-11-11 total=357 red=5 scope=trial:7b8e4db40255 how=#550 item (54): pz-bottom's marginTop 8 -> 70 in both drill layouts (the bottom area pushed down under the tab bar) - TC-R181 asking and solved red at 320x568 on the mistakes drill (Prev and Next UNDER tabbar), plus TC-R47 A2d, TC-R80 C3 and TC-R102 at 320x568 that the same push moves; every other line green
// CONTROL-RECORD: 914f15d 2026-11-06 total=262 red=3 scope=full how=the pre-fix #548 bundle (app.js e07e3d4fb9ea, no first-card stamp in startMistakes, no cap on load): TC-R108 A2 A4 A5 red
// BLOCK D, TC-R81 (US-R76, #547 item (111)): the drill's evaluation bar - absent until solved or shown, in the header row,
// from the player's side.
//
// WHY IT EXISTS. Kunal asked for this TWICE - 2026-09-23 ("I also want the ability to go backwards, not just
// forward, because sometimes I see a position and I want to come back to it after four or five additional
// positions") and again on 2026-09-30 - which under STEP 1S tie-break (a) is evidence the queue's ordering was
// wrong about it, not evidence of impatience. jobs/drill-needs-a-previous-card-2026-09-23, priority 9.
//
// THE DEFECT, MEASURED BEFORE THE FIX rather than read: sit run 19 (sit__1790738781049, 2026-09-30) drove the
// brilliancy drill on the SHIPPED #437 bundle at 375x812 and 320x568 and found the complete button set to be
//   ['< Review','HINT','SHOW MOVE','RESET','< Review','Next >']
// - two controls spelled "Review", a Next, and a regex over every visible button for previous|prev|back|<
// returning EMPTY at both geometries. So the drill was forward-only and the bottom-left slot was a DUPLICATE
// of the header's exit, which is what makes the fix cost no board height.
//
// WHAT IT ASSERTS, AND THE FOUR LIMBS OF TC-R47:
//   (a) a Prev control EXISTS, is enabled on cards 2..N, and is VISIBLY INERT on card 1 - inert, not absent,
//       because a control that vanishes moves the row and "a row that can appear must reserve its space".
//   (b) Prev decrements the index by EXACTLY 1 and the counter text reads the new index, in BOTH directions.
//   (c) a card solved on the way out renders ALREADY SOLVED when it is revisited.
//   (d) the drill has EXACTLY ONE visible control that leaves it.
//
// HOW "ALREADY SOLVED" IS READ, AND WHY IT IS NOT A STYLE CHECK. When puzSolved is true the app does two
// things that are structural rather than cosmetic: it renders the verdict message (which begins with the
// party emoji) and it DROPS the whole Hint / Show move / Reset row, which is `{!puzSolved&&(...)}` in
// chess.jsx. "Is the drill still asking?" is therefore exactly "is the Hint button on screen?", which is a
// fact about the DOM and not a colour comparison. A6 is the positive control for that signal: on a card that
// was never solved the Hint button MUST be present and the verdict MUST be absent, so the instrument is shown
// able to report both answers before A5 is believed. Without A6, A5 passing would be consistent with a gate
// that simply cannot find a Hint button.
//
// BOTH DRILLS ARE INPUTS, NOT ONE PLUS AN ASSUMPTION. startMistakes and startBrilliant are separate entry
// points that happen to share mistakeQueueRef and the renderer, and puzzleFromMistake branches on
// m.label==='Brilliant'. A fix proved on one is not proved on the other, so both are driven.
//
// GEOMETRY [R19, settled 2026-10-03]. 375x761 is Kunal's phone (iPhone 15 Pro Max, Display Zoom Larger Text,
// installed PWA: his own 2026-09-14 diagnostics report returned innerW 375 / innerH 761). TC-R47 as written
// says 375x730; that number is the one R19 corrects wherever it appears, so this gate runs GEOS.kunal761 and
// says so rather than copying the stale figure forward. 320x568 is the short-phone column, where the drill's
// bottom row is tightest and a six-button row would wrap.
//
// INPUT COUNT, SAID OUT LOUD [R18]: 2 drills x 2 geometries = 4 runs, each walking 1->2->3 and back 3->2->1
// with a solve on card 2, which is 4 x 4 = 16 card transitions plus 4 inert-at-the-front taps. The queue is
// seeded at FIVE cards so that "enabled on cards 2..N" is a range and not a single step.
//
// THE SEED, AND THE TRAP IN IT. The five positions are distinct legal FENs with the black king on e8, the
// white king on e1 and one white queen on a rank-2 file that does NOT see e8, so in every one of them the
// side NOT to move is out of check - which is what puzzleFromMistake requires before it will build a card at
// all. The solution is that queen walking up its own empty file. FIVE DISTINCT FENs matter because the card
// id is 'lichess:mine:<fen>', so an accidental duplicate would collapse two queue slots onto one id and the
// solved record in A5 would appear to travel between cards.
// AND ct_bril_reset_v1 IS NOT OPTIONAL: chess.jsx carries a one-time effect that CLEARS myBrilliant unless
// that marker is already set, so a brilliancies seed without it is wiped on boot and every assertion below
// would measure an empty drill while looking like it had run.
// THE TAP HAD TO LEARN WHAT GATES 42 AND 23 ALREADY KNEW, and this is the third time this project has paid
// for it, so it is written as the habit rather than as a fact about this gate [CLAUDE.md, #386 then #390].
// MEASURED at 320x568 on this very bundle, before any assertion was believed:
//     drill control row   y 490..542      the FIXED tab bar   y 512..568
//     document.elementFromPoint(240,516) -> DIV "Home Discover Puzzles Review Play"   <- the tab bar, not Next
// So a naive click on the row's centre lands on the tab bar and the index never moves. The first run of this
// gate scored 66/6 entirely on that, at 320x568 only, and the six reds were an artefact of the TAP.
// IT IS NOT UNREACHABLE, AND THE DISTINCTION IS THE WHOLE RULE: #root is the app's scroller (overflow-y auto,
// scrollHeight 612 against clientHeight 568), so 44px of real finger scroll clears the row of the bar. An
// element below the fold is unreachable only when NO ancestor with overflow-y auto/scroll can bring it on
// screen, measured by ACTUALLY SCROLLING that ancestor and re-reading the rect - which is what reach() does.
// A2e then ASSERTS the result instead of quietly relying on it, so if a future build makes this row genuinely
// unreachable the gate goes red rather than scrolling around the defect.
const L=require('../lib.js');
/* #550 a41: the Home pass re-grades every stored card that carries no win-chance grade and drops those that are no longer a Blunder or
   Mistake - so this gate's fixture cards (each a real position whose 'played' move may still leave the side winning) were thinned out
   before the drill opened ("1 of 3" where 5 were seeded). The re-grade is gate 134's subject; here every seeded card is marked as already
   re-graded (wc), so the drill this gate measures holds exactly the cards it seeded. Applied in one place, to every launch. */
{const _lz=L.launch;L.launch=(o)=>{if(o&&o.store&&Array.isArray(o.store.ct_mymistakes))o={...o,store:{...o.store,ct_mymistakes:o.store.ct_mymistakes.map(c=>c&&!c.wc?{...c,wc:{g:c.label==='Mistake'?'Mistake':'Blunder',drop:25}}:c)}};return _lz(o);};}

const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1',
            '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1','4k3/8/8/8/8/8/5Q2/4K3 w - - 0 1',
            '4k3/8/8/8/8/8/6Q1/4K3 w - - 0 1'];
const UCIS=['b2b7','c2c7','d2d7','f2f7','g2g7'];
const N=FENS.length;
const rows=(label)=>FENS.map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,
  why:'the queen gets behind the pawn (card '+(i+1)+')',hint:'look up the file (card '+(i+1)+')'}));

// #550 item (21): every brilliant store here seeds ct_bril_lib '0', so the tile starts the drill on all its cards as these arms
// expect; with the library on, a store of two kinds opens the chooser instead (gate 118 covers that).
const DRILLS=[
  {k:'mistakes',   enter:/find the move you missed/,        store:{ct_mymistakes:rows('Blunder'),ct_pool:'3'},                                 counter:/Your mistakes/},
  {k:'brilliant',  enter:/can you spot them again\?/,       store:{ct_mybrilliancies:rows('Brilliant'),ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'},      counter:/Your brilliant moves/},
];
const GS=[{n:'kunal761',g:L.GEOS.kunal761},{n:'320x568',g:L.GEOS.se}];

// THE PAINTED POSITION, as a comparable signature. Pieces are <img> data-URI SVGs inside the 64 grid cells,
// so this returns "index:last-10-chars-of-src" for every occupied square. IT EXISTS BECAUSE THE FIRST VERSION
// OF THIS GATE ASSERTED THE CHROME AND NEVER THE BOARD: antagonist A built a bundle whose restore put the
// WRONG POSITION on screen under a correct-looking verdict and it scored 100 pass / 0 fail here. "The card
// comes back solved" is a claim about the BOARD; the Hint row and the verdict are only its chrome.
async function placement(b){return b.page.evaluate(()=>{
  const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null,bw=0;for(const e of els){const q=e.getBoundingClientRect();if(q.width>bw){bw=q.width;best=e;}}
  if(!best||best.children.length<64)return null;
  return [...best.children].slice(0,64).map((c,i)=>{const im=c.querySelector('img');
    return im?(i+':'+String(im.getAttribute('src')||'').slice(-10)):null;}).filter(Boolean).join('|');});}

// the drill header counter, e.g. "Your mistakes - 2 of 5". Returns {i,n} or null.
async function idx(b){return b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;
  const m=(t.innerText||'').match(/(\d+)\s+of\s+(\d+)/);return m?{i:+m[1],n:+m[2]}:null;});}
// is the drill asking this card, or showing it as done? Both read from the DOM, never from a colour.
async function state(b){return b.page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
  const btns=[...document.querySelectorAll('button')].filter(vis).map(x=>(x.innerText||'').replace(/\s+/g,' ').trim());
  const t=document.querySelector('[data-ct="pz-top"]');
  const verdict=t?[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/\u{1F389}/u.test(e.innerText||'')).map(e=>(e.innerText||'').replace(/\s+/g,' ').trim()):[];
  const pv=document.querySelector('[data-ct="drill-prev"]');
  const pvr=pv?pv.getBoundingClientRect():null;
  /* #550 item (66): the drill's Hint is an icon under 430 wide, so 'asking' reads its accessible name too - and only while it is VISIBLE, which is
     what innerText gave for free (a solved card keeps the row's box with visibility hidden, and innerText reads '' there) */
  const _hint=[...document.querySelectorAll('button')].some(x=>vis(x)&&getComputedStyle(x).visibility==='visible'&&(/Hint/.test(x.innerText||'')||x.getAttribute('aria-label')==='Hint'));
  return {btns,asking:_hint,verdict:verdict[0]||'',
          exits:[...document.querySelectorAll('button')].filter(x=>vis(x)&&(/^‹\s*Review$/.test((x.innerText||'').replace(/\s+/g,' ').trim())||x.getAttribute('aria-label')==='Back to Review')).length,   /* re-keyed by formatting audit FMT-A-02, Kunal's pick 12 Nov: the exit is the 44x44 corner button, its words 'Back to Review' in its accessible name (was the text '‹ Review'); either form counts, so two exits still read 2 */
          prev:pv?{dis:pv.disabled===true,aria:pv.getAttribute('aria-disabled'),w:Math.round(pvr.width),h:Math.round(pvr.height),
                   op:+getComputedStyle(pv).opacity,text:(pv.innerText||'').trim(),bottom:Math.round(pvr.bottom*10)/10}:null,
          hasNext:!!document.querySelector('[data-ct="drill-next"]'),vh:innerHeight,
          inDrill:!!t};});}

// Scroll the app's own scroller until this control is the thing under its own centre, then report how far it
// had to go and whether it got there. Returns {hit, scrolled, cx, cy}.
async function reach(b,ct){return b.page.evaluate((id)=>{
  const el=document.querySelector('[data-ct="'+id+'"]');if(!el)return {hit:false,scrolled:0,missing:true};
  const root=document.getElementById('root');
  const hits=()=>{const r=el.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
                  return !!(h&&(h===el||el.contains(h)||el.contains(h.parentElement)));};
  let scrolled=0;
  if(!hits()&&root){const st=getComputedStyle(root).overflowY;
    if(st==='auto'||st==='scroll'){const b0=root.scrollTop;root.scrollTop=root.scrollHeight;scrolled=root.scrollTop-b0;}}
  const r=el.getBoundingClientRect();
  return {hit:hits(),scrolled:Math.round(scrolled),cx:r.left+r.width/2,cy:r.top+r.height/2,
          ovf:root?getComputedStyle(root).overflowY:null,sh:root?root.scrollHeight:0,ch:root?root.clientHeight:0};},ct);}
// tap a drill control the way a finger would: bring it clear of the fixed tab bar first, then click it.
async function tap(b,ct,wait){const r=await reach(b,ct);if(!r.hit)return r;
  await b.page.mouse.click(r.cx,r.cy);await b.page.waitForTimeout(wait==null?600:wait);return r;}

L.run(async()=>{
  L.note('GEOMETRIES: '+GS.map(x=>x.n).join(', ')+'   [R19 settled 375x761 as the device; TC-R47 says 375x730 and that is the figure R19 corrects]');
  L.note('INPUTS: '+DRILLS.length+' drills x '+GS.length+' geometries, queue of '+N+' cards each');
  for(const d of DRILLS){
    for(const G of GS){
      const tag=d.k+' @ '+G.n;
      const b=await L.launch({geo:{w:G.g.w,h:G.g.h,safe:G.g.safe},name:'drill-prev-'+d.k+'-'+G.n,store:d.store});
      await b.open();
      if(d.k==='mistakes'&&G===GS[0])L.note('bundle on the page: '+(await b.stamp()));
      await b.tile('Review');await b.settle(700);
      try{await b.tapText(d.enter,{wait:1800});}catch(e){
        L.say(false,'TC-R47 A0 '+tag+' the drill entry card was not reachable, so nothing below measured anything',{err:e.message.slice(0,90)});
        await b.close();continue;}
      try{await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});}catch(e){}

      // ---- A0: the preflight. Without a real N-card queue on screen every assertion below is vacuous.
      let p=await idx(b),s=await state(b);
      if(!L.say(!!p&&p.i===1&&p.n===N,'TC-R47 A0 '+tag+' the drill opened on card 1 of '+N+' - the preflight every assertion below depends on',{counter:p,buttons:s.btns})){
        await b.close();continue;}

      // ---- A1 (a): Prev EXISTS at all. This is the assertion sit run 19 measured RED on #437.
      L.say(!!s.prev,'TC-R47 A1 '+tag+' (a) a Prev control exists in the drill - sit run 19 measured ZERO on shipped #437, where a regex for previous|prev|back over every visible button returned empty',{prev:s.prev,buttons:s.btns});
      // ---- A3 (d): EXACTLY ONE exit. The fix reuses the duplicate, so this must not regain a second.
      L.say(s.exits===1,'TC-R47 A3 '+tag+' (d) the drill has EXACTLY ONE visible control that leaves it - sit run 19 measured TWO identical "< Review" buttons on #437 and this fix spends the duplicate',{exits:s.exits,buttons:s.btns});
      // A3 DELIBERATELY RUNS BEFORE THE BAIL BELOW. On the shipped bundle there is no Prev at all, so the
      // walk cannot continue - but the DUPLICATE EXIT is the other half of the same defect and it is
      // measurable without a Prev. Ordering it after the bail meant the free negative control (main's own
      // bundle) reported 4 assertions and never looked at the duplicate it was built to expose.
      // [CLAUDE.md: a gate that halts on the first missing element hides every regression after it.]
      if(!s.prev){L.note(tag+' NO PREV CONTROL: the walk (b) and (c) cannot run on this bundle - that is the defect, not a gate error.');await b.close();continue;}
      L.say(/Prev/.test(s.prev.text),'TC-R47 A1b '+tag+' the control is labelled as Prev rather than carrying some other word',{text:s.prev.text});

      // ---- A2 (a): on card 1 it is INERT AND STILL THERE. Absent would move the row.
      L.say(s.prev.dis===true,'TC-R47 A2a '+tag+' (a) on card 1 Prev is DISABLED',{prev:s.prev});
      L.say(s.prev.w>1&&s.prev.h>1,'TC-R47 A2b '+tag+' (a) on card 1 Prev is still PAINTED - visibly inert, not absent, so the row does not move when it becomes usable',{w:s.prev.w,h:s.prev.h});
      L.say(s.prev.op<1,'TC-R47 A2c '+tag+' (a) the inert Prev is visually distinguishable from an enabled one (opacity below 1) - a disabled button that looks identical reads as a dead control',{opacity:s.prev.op});
      L.say(s.prev.bottom<=s.vh+0.5,'TC-R47 A2d '+tag+' the Prev control is inside the viewport',{bottom:s.prev.bottom,vh:s.vh});
      // A2e IS THE ONE THAT WOULD HAVE CAUGHT THE TAP BUG, so it is an assertion and not a comment. At
      // 320x568 this row starts UNDER the fixed tab bar and needs 44px of #root scroll; that is reachable and
      // is recorded as a number. If some build makes it unreachable, hit stays false here and the gate reds.
      const _rp=await reach(b,'drill-prev'),_rn=await reach(b,'drill-next');
      L.say(_rp.hit===true,'TC-R47 A2e '+tag+' (a) Prev is REACHABLE BY A FINGER - it is the element under its own centre after scrolling the app scroller, which is the only test that separates "below the fold" from "unreachable"',{scrolledPx:_rp.scrolled,overflowY:_rp.ovf,scrollHeight:_rp.sh,clientHeight:_rp.ch});
      L.say(_rn.hit===true,'TC-R47 A2f '+tag+' Next is REACHABLE BY A FINGER by the same test',{scrolledPx:_rn.scrolled});
      if(_rp.scrolled>0)L.note(tag+' NOTE: the drill control row needed '+_rp.scrolled+'px of #root scroll to clear the fixed tab bar at this geometry. Reachable, and filed separately as a finding about the row\'s resting position - it is NOT introduced by this change (the same row carried "< Review" + "Next >" before it).');


      // ---- A4 (a): tapping an inert Prev must not leave the drill or move the index.
      await tap(b,'drill-prev',700);
      const p0=await idx(b),s0=await state(b);
      L.say(!!s0.inDrill&&!!p0&&p0.i===1,'TC-R47 A4 '+tag+' (a) tapping Prev on card 1 does nothing at all - the index stays 1 and the player is NOT thrown out of the drill (Next exiting at the END is a completion; falling off the front is not an event)',{counter:p0,inDrill:s0.inDrill});

      // ---- walk forward to card 2, SOLVING it on the way, then on to card 3.
      L.say(s0.asking===true,'TC-R47 A5pre '+tag+' card 1 is being ASKED (the Hint row is on screen) before any solve',{asking:s0.asking});
      const pl0=await placement(b);
      L.say(!!pl0&&pl0.length>0,'TC-R47 A5plc '+tag+' the painted position can be read at all - every board assertion below is vacuous without this',{occupiedSquares:pl0?pl0.split('|').length:0});
      await tap(b,'drill-next',1000);
      let p2=await idx(b);
      L.say(!!p2&&p2.i===2,'TC-R47 A6 '+tag+' (b) Next moved the index to exactly 2',{counter:p2});
      const s2=await state(b);
      L.say(s2.prev&&s2.prev.dis===false,'TC-R47 A7 '+tag+' (a) Prev is ENABLED on card 2',{prev:s2.prev});
      // solve card 2 by playing its stored move, capturing the board BEFORE and AFTER the live solve
      const askPlc=await placement(b);
      const u=UCIS[1];await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1100);
      const solvedPlc=await placement(b);
      const sv=await state(b);
      if(!L.say(sv.asking===false&&sv.verdict.length>0,'TC-R47 A8 '+tag+' card 2 was actually SOLVED - the verdict is on screen and the Hint row has gone. Every claim A10 makes about "comes back solved" is vacuous without this',{asking:sv.asking,verdict:sv.verdict.slice(0,70)})){
        await b.close();continue;}
      L.say(!!askPlc&&!!solvedPlc&&askPlc!==solvedPlc,'TC-R47 A8b '+tag+' the live solve actually MOVED A PIECE - the asking and solved positions differ. This is the CONTROL for A10d: were these two equal, "the restored board matches the solved board" would be satisfied by a board that never moved at all',{changed:askPlc!==solvedPlc});
      await tap(b,'drill-next',1000);
      const p3=await idx(b),s3=await state(b);
      L.say(!!p3&&p3.i===3,'TC-R47 A9 '+tag+' (b) Next moved the index to exactly 3',{counter:p3});
      // A9b IS THE POSITIVE CONTROL FOR A10's INSTRUMENT: an unsolved card must read as asking.
      L.say(s3.asking===true&&s3.verdict==='','TC-R47 A9b '+tag+' card 3, never solved, reads as ASKING - this is the control that proves the solved/asking signal can report BOTH answers, without which A10 passing would be consistent with a gate that simply cannot find a Hint button',{asking:s3.asking,verdict:s3.verdict});

      // ---- A10 (b)+(c): back to card 2 and it is STILL SOLVED.
      await tap(b,'drill-prev',1000);
      const pb=await idx(b),sb=await state(b);
      L.say(!!pb&&pb.i===2,'TC-R47 A10a '+tag+' (b) Prev decremented the index by exactly 1, from 3 to 2, and the counter READS the new index',{counter:pb});
      L.say(sb.asking===false,'TC-R47 A10b '+tag+' (c) the revisited card 2 is NOT asking again - the Hint row is still gone',{asking:sb.asking,buttons:sb.btns});
      const backPlc=await placement(b);
      L.say(backPlc===solvedPlc,'TC-R47 A10d '+tag+' (c) THE RESTORED BOARD IS THE POSITION THE PLAYER LEFT, piece for piece - not merely a card wearing a solved verdict. A bundle that restored the WRONG position scored 100/0 against the first version of this gate, which read only the chrome',{equal:backPlc===solvedPlc,restored:String(backPlc).slice(0,60),expected:String(solvedPlc).slice(0,60)});
      L.say(backPlc!==askPlc,'TC-R47 A10e '+tag+' (c) and it is NOT the unsolved position - the card is not silently asking again behind a solved-looking header',{equalToAsking:backPlc===askPlc});
      L.say(sb.verdict.length>0,'TC-R47 A10c '+tag+' (c) the revisited card 2 still shows its verdict, so the work he went back to look at survived the round trip [US-R35 clause two]',{verdict:sb.verdict.slice(0,90)});

      // ---- A11 (b): and all the way back to card 1, where Prev goes inert again.
      await tap(b,'drill-prev',1000);
      const p1=await idx(b),s1=await state(b);
      L.say(!!p1&&p1.i===1,'TC-R47 A11a '+tag+' (b) Prev reached card 1 - the index decrements one at a time in the backward direction too',{counter:p1});
      L.say(s1.prev&&s1.prev.dis===true,'TC-R47 A11b '+tag+' (a) Prev is inert again at the front of the queue',{prev:s1.prev});
      L.say(s1.exits===1,'TC-R47 A11c '+tag+' (d) still exactly one exit after a full round trip',{exits:s1.exits,buttons:s1.btns});
      /* A11d IS A TRIPWIRE, NOT AN ASSERTION, AND IT NOW SAYS SO. Antagonist A measured that
         mistakeQueueRef.current is assigned in exactly two places, both from a .slice(), and never mutated in
         place - 0 hits for push/splice/pop/shift/length= - so "the length did not change" cannot go red for
         any build that does not edit start*. It is kept because it is free and would catch such an edit, and
         it is LABELLED so that nobody counts it as coverage. */
      L.say(p1&&p1.n===N,'TC-R47 A11d[tripwire] '+tag+' the queue length never changed across the walk (true by construction on any build that does not edit startMistakes/startBrilliant - kept as a tripwire, NOT counted as coverage)',{counter:p1});

      L.say(b.errs.length===0,'TC-R47 A12 '+tag+' no console errors during the walk',{errs:b.errs.slice(0,2)});
      await b.close();
    }
  }

  /* ===== BLOCK B: THE INPUT CLASS THAT WAS MISSING, AND IT IS WHY BLOCK A COULD NOT SEE THE VETO =====
     Block A seeds five rows that are ALL playable, so `the raw queue index` and `the position among the
     playable rows` are the same number in every one of its 100 assertions, and a build that confused the two
     scored 100 pass / 0 fail. BOTH ANTAGONISTS, working blind and from opposite doors, found the same thing:
     puzzleFromMistake refuses a saved row whose position or stored move is illegal - which is the whole point
     of that guard, and those rows are REAL, they are what a stale store holds - and with such a row at the
     FRONT the drill opened on "2 of 5" with Prev enabled, full opacity, and completely dead. The build's own
     comment claimed the opposite. So the fix was to hold the playable rows as the one source of truth, and
     this block is the input that reddens the old arithmetic.
     THE THREE UNPLAYABLE SHAPES ARE THE THREE THE GUARD ITSELF NAMES: a row with no stored move, a row whose
     stored move is illegal in its own position, and a row whose position is illegal (the side NOT to move is
     already in check). Rows 1, 3 and 5 are unplayable, so there are exactly TWO playable cards out of five. */
  const BAD=[
    {fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1', uci:undefined,  label:'Blunder', played:'Kd1', ts:9001, why:'row 1 has no stored move',        hint:'h'},
    {fen:'4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1', uci:'c2c7',      label:'Blunder', played:'Kd1', ts:9002, why:'row 2 is playable',               hint:'h'},
    {fen:'4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1', uci:'a1a8',      label:'Blunder', played:'Kd1', ts:9003, why:'row 3 stored move is illegal',    hint:'h'},
    {fen:'4k3/8/8/8/8/8/5Q2/4K3 w - - 0 1', uci:'f2f7',      label:'Blunder', played:'Kd1', ts:9004, why:'row 4 is playable',               hint:'h'},
    {fen:'4k3/8/8/8/8/4Q3/8/4K3 w - - 0 1', uci:'e3e7',      label:'Blunder', played:'Kd1', ts:9005, why:'row 5 position is illegal (black already in check)', hint:'h'},
  ];
  const PLAYABLE=2;
  for(const G of GS){
    const tag='unplayable-rows @ '+G.n;
    const b=await L.launch({geo:{w:G.g.w,h:G.g.h,safe:G.g.safe},name:'drill-prev-bad-'+G.n,store:{ct_mymistakes:BAD,ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(700);
    try{await b.tapText(/find the move you missed/,{wait:1800});}catch(e){
      L.say(false,'TC-R47 B0 '+tag+' the drill entry card was not reachable, so this block measured nothing',{err:e.message.slice(0,90)});
      await b.close();continue;}
    try{await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});}catch(e){}
    const q0=await idx(b),t0=await state(b);
    // B1 IS THE VETO. The old build opened here on "2 of 5"; the counter must count what can be SHOWN.
    L.say(!!q0&&q0.i===1,'TC-R47 B1 '+tag+' (b) the drill opens on card 1 - NOT on the raw queue index of the first playable row. The pre-fix build opened on "2 of 5" because an unplayable row 1 advanced the index',{counter:q0});
    L.say(!!q0&&q0.n===PLAYABLE,'TC-R47 B2 '+tag+' (b) the counter states the number of cards that can actually be SHOWN ('+PLAYABLE+' of 5 rows are playable) - the pre-fix build said 5 and then threw the player out part-way through',{counter:q0,playable:PLAYABLE,seeded:BAD.length});
    if(!t0.prev){L.say(false,'TC-R47 B3 '+tag+' no Prev control on this input at all');await b.close();continue;}
    // B4 IS THE OTHER HALF OF THE VETO: enabled-and-dead is worse than absent, because it invites the tap.
    L.say(t0.prev.dis===true,'TC-R47 B4 '+tag+' (a) Prev is DISABLED on the opening card even though an unplayable row sits in front of it. BOTH antagonists measured this ENABLED at opacity 1 and completely dead on the pre-fix build, at both geometries and on both drills',{prev:t0.prev});
    L.say(t0.prev.op<1,'TC-R47 B5 '+tag+' (a) and it is dimmed, so the player can SEE it is not available',{opacity:t0.prev.op});
    await tap(b,'drill-prev',700);
    const q1=await idx(b),t1=await state(b);
    L.say(!!t1.inDrill&&!!q1&&q1.i===1,'TC-R47 B6 '+tag+' (a) tapping it changes nothing and does not eject the player',{counter:q1,inDrill:t1.inDrill});
    // forward across the gap: row 3 is unplayable, so card 2 is queue row 4
    await tap(b,'drill-next',1000);
    const q2=await idx(b),t2=await state(b);
    L.say(!!q2&&q2.i===2&&q2.n===PLAYABLE,'TC-R47 B7 '+tag+' (b) Next steps OVER the unplayable row to card 2 of '+PLAYABLE+', and the counter still agrees with itself',{counter:q2});
    L.say(t2.prev&&t2.prev.dis===false,'TC-R47 B8 '+tag+' (a) Prev is enabled on card 2',{prev:t2.prev});
    L.say(t2.asking===true,'TC-R47 B9 '+tag+' card 2 is a real, askable card and not a blank left by the skipped row',{asking:t2.asking,verdict:t2.verdict});
    await tap(b,'drill-prev',1000);
    const q3=await idx(b);
    L.say(!!q3&&q3.i===1,'TC-R47 B10 '+tag+' (b) Prev comes back to card 1 across the same gap',{counter:q3});
    // and the END: with row 5 unplayable, card 2 is the last one, so Next there is a COMPLETION
    await tap(b,'drill-next',1000);
    const qPre=await idx(b);   // #547, antagonist A's A3: "not earlier" is now READ - the last card must be on screen before the end tap
    await tap(b,'drill-next',1200);
    const t4=await state(b);
    // #547 item (147): Next from the last card no longer LEAVES the drill - it shows the drill's end state (TC-R92), which is the
    // completion now. So B11 asserts the end card, reached from card 2 of 2 and not earlier, instead of the exit it used to read.
    const end4=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="drill-end"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
    L.say(!!qPre&&qPre.i===PLAYABLE&&qPre.n===PLAYABLE&&!!end4&&new RegExp('of '+PLAYABLE+'\\b').test(end4),'TC-R47 B11 '+tag+' Next from the LAST playable card is a completion - the drill\'s end state, counting the '+PLAYABLE+' playable cards - and it did not come early. The pre-fix build ejected the player at "3 of 5" while its own counter claimed two cards remained',{inDrill:t4.inDrill,end:end4,counterBeforeTheEndTap:qPre});
    L.say(b.errs.length===0,'TC-R47 B12 '+tag+' no console errors over the unplayable-row walk',{errs:b.errs.slice(0,2)});
    await b.close();
  }
  // ════════ BLOCK C - TC-R80 (US-R75), #547 item (110): THE BRILLIANCY CARD SPENDS ITS SPACE ON THE BOARD ════════
  // Kunal, 23 Sep: the top box "is the same text everywhere in all of those brilliancies" and the praise line says what
  // "everybody knows". Measured at 375x730 on the pre-fix bundle: the goal box 107px ('... you found a brilliant move here.
  // Can you spot it again? | Tactic | Medium'), the board 355 wide at top 186, the verdict opening "That's your brilliant
  // move. Nicely done." After: 44px, 375 at 144. Card 1 carries a `why`; card 2 deliberately has none, so the empty case
  // (no message at all, not a bare 🎉) is exercised and not assumed.
  // PRE is the board width MEASURED on the pre-fix bundle (5b66d2fb6147, HEAD~1 of the (110) commit) at the same geometry and
  // card. A full-column-width test is right at 375x730, where the board is width-bound, and WRONG at 320x568, where it is
  // height-bound (216 of 320 after the fix) - which is the first draft's mistake, caught by its own run on the fixed bundle.
  for(const G of [{n:'375x730',g:{w:375,h:730,safe:''},PRE:355},{n:'320x568',g:L.GEOS.se,PRE:192}]){
    const tag='brilliancy card @ '+G.n;
    const CR=[{fen:FENS[0],uci:UCIS[0],label:'Brilliant',ts:1791000000000,last:null,why:'You gave up a piece and it still worked (card 1).'},
              {fen:FENS[1],uci:UCIS[1],label:'Brilliant',ts:1791000001000,last:null}];
    const b=await L.launch({geo:{w:G.g.w,h:G.g.h,safe:G.g.safe},name:'drill-bril-card-'+G.n,store:{ct_mybrilliancies:CR,ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(700);
    let ok=true;try{await b.tapText(/can you spot them again\?/,{wait:1800});await b.page.locator('[data-ct="pz-float"]').waitFor({state:'visible',timeout:15000});}catch(e){ok=false;}
    await b.settle(600);
    const rd=()=>b.page.evaluate(()=>{const f=document.querySelector('[data-ct="pz-float"]');
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
      const m=document.querySelector('[data-ct="pz-msg"]');const fr=f&&f.getBoundingClientRect(),gr=g&&g.getBoundingClientRect();
      return {float:fr?Math.round(fr.height):null,lines:f?f.innerText.split('\n').map(x=>x.trim()).filter(Boolean):[],msg:m?m.innerText.trim():null,
              chips:f?[...f.querySelectorAll('span')].map(x=>(x.innerText||'').trim()).filter(Boolean):[],
              board:gr?{w:Math.round(gr.width),top:Math.round(gr.top)}:null,vw:innerWidth};});
    const c1=await rd();
    if(!L.say(ok&&!!c1.board&&c1.lines.length>0,'TC-R80 C0 '+tag+' PRECONDITION the brilliancies drill opened on a card with a goal box and a board',c1)){await b.close();continue;}
    L.say(c1.lines.length===1&&/^\u{1F3AF} White to move$/u.test(c1.lines[0]),'TC-R80 C1 '+tag+' the goal box is ONE line naming only the side to move - no "you found a brilliant move here", which was the same on every card',c1.lines);
    L.say(c1.chips.length===0,'TC-R80 C2 '+tag+' no motif or level chip: on an own-game card they read "Tactic" and "Medium" on every card',c1.chips);
    L.say(c1.board.w>=Math.min(G.PRE+10,Math.min(c1.vw,440)-0.5),'TC-R80 C3 '+tag+' the reclaimed height goes into the board: '+c1.board.w+'px wide against '+G.PRE+' measured pre-fix here (at least +10, or the full column)',{board:c1.board,pre:G.PRE,col:Math.min(c1.vw,440)});
    await b.move(UCIS[0].slice(0,2),UCIS[0].slice(2,4),900);await b.settle(1100);
    const s1=await rd();
    L.say(s1.msg==='\u{1F389} You gave up a piece and it still worked (card 1).','TC-R80 C4 '+tag+' the verdict is the move\'s own explanation and nothing else - no "That\'s your brilliant move. Nicely done."',{msg:s1.msg});
    L.say(!!s1.board&&s1.board.top===c1.board.top&&s1.board.w===c1.board.w,'TC-R80 C5 '+tag+' the board does not move when the verdict appears',{before:c1.board,after:s1.board});
    let nx=true;try{await b.page.locator('[data-ct="drill-next"]').click();}catch(e){nx=false;}await b.settle(1200);
    const c2=await rd();
    L.say(nx&&c2.lines.length===1&&c2.msg===null,'TC-R80 C6 PRECONDITION '+tag+' card 2 (no `why`) is on screen and asking',{nx,lines:c2.lines,msg:c2.msg});
    await b.move(UCIS[1].slice(0,2),UCIS[1].slice(2,4),900);await b.settle(1100);
    const s2=await rd();
    L.say(s2.msg===null&&s2.lines.length===1&&/to move$/.test(s2.lines[0]),'TC-R80 C7 '+tag+' with nothing true to say the verdict area holds nothing - no message box and no bare 🎉 - and the goal line keeps its place',{msg:s2.msg,lines:s2.lines});
    L.say(!!s2.board&&s2.board.top===c1.board.top,'TC-R80 C8 '+tag+' and the board has still not moved',{first:c1.board,now:s2.board});
    L.say(b.errs.length===0,'TC-R80 C9 '+tag+' no console errors',{errs:b.errs.slice(0,2)});
    await b.close();
  }
  // ════════ BLOCK D - TC-R81 (US-R76), #547 item (111): THE DRILL'S EVALUATION BAR ════════
  // jobs/eval-bar-on-the-drill-board-2026-09-23. Lives here, not in gate 36, because this gate already seeds and walks the
  // drill; gate 36's Play/Review assertions are untouched because the side bar there did not change. Three cards: White a
  // queen up (solved), BLACK a queen up (solved - the sign test: White's view would print it negative), and White again
  // opened with Show move (the other half of the spoiler rule). Before any solve the bar must not exist at all.
  for(const G of [{n:'375x730',g:{w:375,h:730,safe:''}},{n:'320x568',g:L.GEOS.se}]){
    const tag='drill eval bar @ '+G.n;
    const DR=[{fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Brilliant',ts:1791000000000,last:null,why:'White card.'},
              {fen:'4k3/1q6/8/8/8/8/8/4K3 b - - 0 1',uci:'b7b2',label:'Brilliant',ts:1791000001000,last:null,why:'Black card.'},
              {fen:'4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1',uci:'c2c7',label:'Brilliant',ts:1791000002000,last:null,why:'Shown card.'}];
    const b=await L.launch({geo:{w:G.g.w,h:G.g.h,safe:G.g.safe},name:'drill-evalbar-'+G.n,store:{ct_mybrilliancies:DR,ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(700);
    let ok=true;try{await b.tapText(/can you spot them again\?/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});}catch(e){ok=false;}
    await b.settle(600);
    const rd=()=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');const hr=t&&t.firstElementChild;
      const e=document.querySelector('[data-ct="drill-eval"]'),f=document.querySelector('[data-ct="drill-eval-fill"]'),n=document.querySelector('[data-ct="drill-eval-num"]');
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
      const gr=g&&g.getBoundingClientRect(),er=e&&e.getBoundingClientRect();
      return {hdr:hr?Math.round(hr.getBoundingClientRect().height*10)/10:null,bar:e?{w:Math.round(er.width),h:Math.round(er.height),right:Math.round(er.right),fill:f?Math.round(f.getBoundingClientRect().width):null,num:n?n.innerText.trim():null}:null,
              board:gr?{w:Math.round(gr.width),top:Math.round(gr.top)}:null,vw:innerWidth};});
    const settled=async()=>{let r=await rd();for(let k=0;k<20&&r.bar&&(r.bar.num==='…'||r.bar.num==null);k++){await b.page.waitForTimeout(500);r=await rd();}return r;};
    const r0=await rd();
    if(!L.say(ok&&!!r0.board&&r0.hdr>0,'TC-R81 D0 '+tag+' PRECONDITION the brilliancies drill opened with its header row and a board',r0)){await b.close();continue;}
    L.say(r0.bar===null,'TC-R81 D1 '+tag+' on an UNSOLVED card there is no evaluation bar at all - it would say who is winning (Kunal\'s spoiler rule)',r0.bar);
    await b.move('b2','b7',900);await b.settle(1500);const r1=await settled();
    L.say(!!r1.bar,'TC-R81 D2a PRECONDITION '+tag+' once the White card is solved the bar is on screen',r1.bar);
    L.say(!!r1.bar&&/^\+\d/.test(r1.bar.num||'')&&r1.bar.fill>r1.bar.w/2,'TC-R81 D2 '+tag+' White a queen up reads POSITIVE and fills past half: '+(r1.bar&&r1.bar.num),r1.bar);
    L.say(!!r1.bar&&r1.bar.right<=r1.vw&&r1.bar.w>=56&&r1.bar.h>=15,'TC-R81 D3 '+tag+' the bar is on screen and readable (at least 56 wide, 15 tall)',r1.bar);
    L.say(r1.hdr===r0.hdr&&!!r1.board&&r1.board.top===r0.board.top&&r1.board.w===r0.board.w,'TC-R81 D4 '+tag+' it SHARES the header row: that row\'s height, and the board\'s width and top, are unchanged',{before:{hdr:r0.hdr,board:r0.board},after:{hdr:r1.hdr,board:r1.board}});
    let nx=true;try{await b.page.locator('[data-ct="drill-next"]').click();}catch(e){nx=false;}await b.settle(1200);
    const r2=await rd();
    L.say(nx&&r2.bar===null,'TC-R81 D5 '+tag+' the next (unsolved) card hides the bar again',{nx,bar:r2.bar});
    await b.move('b7','b2',900);await b.settle(1500);const r3=await settled();
    L.say(!!r3.bar&&/^\+\d/.test(r3.bar.num||''),'TC-R81 D6 '+tag+' BLACK a queen up ALSO reads positive: the number is the PLAYER\'s, not White\'s (White\'s view prints it negative)',r3.bar);
    try{await b.page.locator('[data-ct="drill-next"]').click();}catch(e){}await b.settle(1200);
    const r4=await rd();
    let sh=true;try{await (async()=>{/* #550 item (66): the drill's helpers are one 44pt row and show their icon only under 430 wide, so they are tapped by their accessible name */const _l=b.page.locator('button[aria-label="Show move"]:visible').first();await _l.click({timeout:2000});await b.page.waitForTimeout(700);})()}catch(e){sh=false;}await b.settle(1500);const r5=await settled();
    L.say(r4.bar===null&&sh&&!!r5.bar,'TC-R81 D7 '+tag+' Show move on an unsolved card brings the bar up - "or he asks to see the line"',{before:r4.bar,shown:sh,after:r5.bar});
    L.say(b.errs.length===0,'TC-R81 D8 '+tag+' no console errors',{errs:b.errs.slice(0,2)});
    await b.close();
  }
  // ════════ BLOCK E - TC-R92 (US-R94), #547 item (147): THE END OF THE DRILL IS A STATE, NOT AN EXIT ════════
  // Pre-fix Next from the last card left the drill (pz-top null, no board, the Review landing). Two mistakes, both solved, then Next.
  {const ER=[{fen:FENS[0],uci:UCIS[0],label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'w1'},{fen:FENS[1],uci:UCIS[1],label:'Blunder',played:'Kd1',ts:1791000001000,last:null,why:'w2'}];
   const b=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-end',store:{ct_mymistakes:ER,ct_pool:'3'}});await b.open();
   let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);
     await b.move(UCIS[0].slice(0,2),UCIS[0].slice(2,4),900);await b.settle(900);await tap(b,'drill-next',1000);await b.move(UCIS[1].slice(0,2),UCIS[1].slice(2,4),900);await b.settle(900);}catch(e){ok=false;}
   const q=await idx(b);
   if(L.say(ok&&!!q&&q.i===2&&q.n===2,'TC-R92 PRECONDITION both cards were solved and the drill is on its LAST card (2 of 2)',{counter:q})){
     await tap(b,'drill-next',1200);
     const r=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="drill-end"]');return {inDrill:!!document.querySelector('[data-ct="pz-top"]'),end:e?(e.innerText||'').replace(/\s+/g,' ').trim():null};});
     L.say(r.inDrill&&!!r.end,'TC-R92 Next from the last card stays in the drill and shows an end state, instead of dropping the player on the Review landing',r);
     L.say(!!r.end&&/fixed 2 of 2/.test(r.end),'TC-R92 and the end state says how many were fixed, against the set\'s original size',{end:r.end});
     let again=true;try{await b.page.click('[data-ct="drill-end-again"]');await b.settle(1000);}catch(e){again=false;}
     const q2=await idx(b);L.say(again&&!!q2&&q2.i===1,'TC-R92 Go again returns to card 1',{counter:q2});}
   await b.close();}
  // ════════ BLOCK F - TC-R96 (US-R98), #547 item (164): TWO SMALL TRUTHS ON THE DRILL CARD ════════
  // One card whose entry carries NO `played` (the app's own guard says the field can be missing). Pre-fix the goal read
  // 'White to move — you played here, a blunder.' with the word gone. And the '✓ solved before' chip must not appear on the FIRST
  // solve of a card never seen: pre-fix it was gated on the very map the solve writes. Both located by text, not by a new hook.
  {const FR=[{fen:FENS[2],uci:UCIS[2],label:'Blunder',ts:1791000000000,last:null,why:'f1'}];
   const b=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-truths',store:{ct_mymistakes:FR,ct_pool:'3'}});await b.open();
   let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);}catch(e){ok=false;}
   const rd=()=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');const tx=t?(t.innerText||'').replace(/\s+/g,' '):'';
     return {goal:(tx.match(/(White|Black) to move[^.]*\.[^.]*\./)||[''])[0],chip:/solved before/.test(document.body.innerText||'')};});
   const g0=await rd();
   if(L.say(ok&&/to move/.test(g0.goal),'TC-R96 PRECONDITION the one-card drill opened and its goal line is on screen',g0)){
     L.say(!/you played\s+here/.test(g0.goal)&&!/\s{2}/.test(g0.goal),'TC-R96 with no recorded move the goal line does not say "you played here" with the move missing',g0);
     L.say(/your move here was a blunder/.test(g0.goal),'TC-R96 it says "your move here was a blunder" instead',g0);
     L.say(!g0.chip,'TC-R96 TRIPWIRE (cannot fail on a drill card since #460; block G is the controlled one) before the first solve there is no "solved before" chip',g0);
     let mv=true;try{await b.move(UCIS[2].slice(0,2),UCIS[2].slice(2,4),900);await b.settle(1200);}catch(e){mv=false;}
     const solved=await b.page.evaluate(()=>/\u{1F389}|Solved|solved it|Correct/u.test((document.querySelector('[data-ct="pz-top"]')||{}).innerText||''));
     const g1=await rd();
     if(L.say(mv&&solved,'TC-R96 PRECONDITION the card was solved (a verdict is on the card)',{mv,solved})){
       L.say(!g1.chip,'TC-R96 TRIPWIRE (as above) after the FIRST solve of a drill card there is still no "solved before" chip',g1);}}
   await b.close();}
  // ════════ BLOCK G - TC-R96 (US-R98), #547 item (164)(1) on the path where the chip actually lies: a LICHESS puzzle ════════
  // Block F's chip lines cannot fail on a drill card (since #460 a drill solve writes nothing to the solved map - measured: both
  // bundles PASS there). The defect lives on Lichess puzzles, where the solve writes the very map the chip read. Stub the daily
  // puzzle with a one-move mate never seen (empty store), solve it, and the chip must stay absent.
  {const b=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-truths-lichess',store:{ct_pool:'3'}});
   await b.ctx.route(/lichess\.org\/api\/puzzle/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({game:{pgn:'e4 e5 Bc4 Nc6 Qh5 Nf6'},puzzle:{id:'r96aa',initialPly:5,solution:['h5f7'],rating:900,themes:['mateIn1']}})}));
   await b.open();
   let ok=true;try{await b.tile('Puzzles');await b.settle(700);const _h=await b.page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(x=>/Online puzzles \(Lichess\)/.test(x.innerText||''))||null);const _el=_h.asElement();if(!_el)throw new Error('no Online puzzles button');await _el.scrollIntoViewIfNeeded();await _el.click();/* below the fold on the roadmap: tapText landed on nothing */await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);}catch(e){ok=false;}
   // READ IN THE DOM (textContent), NOT innerText: measured on the pre-fix bundle, the chip IS rendered after the first solve but the
   // goal box is visibility:hidden while the verdict is up, so innerText skips it and an innerText read passed on the broken bundle.
   const chip=()=>b.page.evaluate(()=>[...document.querySelectorAll('span')].some(x=>/solved before/.test(x.textContent||'')));
   const c0=await chip();
   if(L.say(ok,'TC-R96 PRECONDITION the stubbed Lichess puzzle opened (never seen: empty store)',{ok,c0})){
     let mv=true;try{await b.move('h5','f7',900);await b.settle(1500);}catch(e){mv=false;}
     const solved=await b.page.evaluate(()=>/\u{1F389}|Solved|Correct/u.test((document.querySelector('[data-ct="pz-top"]')||{}).innerText||''));
     const c1=await chip();
     if(L.say(mv&&solved,'TC-R96 PRECONDITION the Lichess puzzle was solved (a verdict is on the card)',{mv,solved})){
       L.say(!c0&&!c1,'TC-R96 the FIRST solve of a Lichess puzzle never seen renders no "solved before" chip, before or after the solve (pre-fix: in the DOM at top 205, hidden behind the verdict)',{before:c0,after:c1});}}
   await b.close();}
  // ════════ BLOCK H - TC-R96 (US-R98), #547 item (164)(3): THE HINT ON AN EN-PASSANT BEST MOVE ════════
  // A UNIT block over the TREE's chess.jsx, NOT the bundle under test (the bundle's names are not addressable): the engine
  // functions up to explainAnno are pure, so they are transformed with esbuild and called. An en-passant capture lands on an EMPTY
  // square, and every capture test read the destination, so the hint said 'No tactic to spot here' about a capture. Enumerated
  // per #391: en passant, an ordinary capture, a promotion, a castle and a quiet move, each with the hint it must and must not get.
  {let M=null,why='';
   try{const fs=require('fs'),path=require('path'),es=require('esbuild');const src=fs.readFileSync(path.join(__dirname,'..','..','chess.jsx'),'utf8');
     const end=src.indexOf('\nfunction explainAnno(');const body=src.slice(src.indexOf('\n')+1,end);
     const js=es.transformSync(body,{loader:'jsx',format:'cjs'}).code;
     const W=global.window;global.window=new Proxy({},{get:(t,k)=>t[k]!==undefined?t[k]:({OPENINGS:[],MORE:[],ENDGAMES:[]})});
     try{M=new Function('React','memo','useState',js+';return {fromFEN,getLegal,mistakeHint};')({createElement(){}},x=>x,()=>[]);}finally{global.window=W;}
   }catch(e){why=e.message.slice(0,160);}
   if(L.say(!!M,'TC-R96 PRECONDITION the tree\'s move functions load for the unit block',{why})){
     const CASES=[['en passant','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',m=>m.epCap,/material to be taken|can be taken\. Take it with/ /* #550 HEX-T-01: the concrete reading names the piece and the taker */],
                  ['ordinary capture','4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1',m=>m.fr===4&&m.fc===4&&m.tr===3&&m.tc===3,/material to be taken|can be taken\. Take it with/ /* #550 HEX-T-01: the concrete reading names the piece and the taker */],
                  ['promotion','8/4P3/8/8/8/8/8/k6K w - - 0 1',m=>m.promo==='q',/pawn is closer/],
                  ['castle','4k3/8/8/8/8/8/8/4K2R w K - 0 1',m=>m.castle==='K',/^No tactic/],
                  ['quiet move','4k3/8/8/8/8/8/8/4K2R w K - 0 1',m=>m.fr===7&&m.fc===4&&m.tr===7&&m.tc===3,/^No tactic/]];
     for(const [nm,fen,pick,want] of CASES){const pos=M.fromFEN(fen);const mv=M.getLegal(pos).find(pick);const h=mv?M.mistakeHint(pos,mv,null):null;
       L.say(!!mv&&want.test(h||''),'TC-R96 the hint on a best move that is a(n) '+nm+' reads '+want,{fen,hint:h});}}}
  // ════════ BLOCK I - TC-R97 (US-R12), #547, final antagonist B's VETO (B1): THE HINT MAY NOT TAKE THE BOARD'S TAPS ════════
  // Since item (48) the message floated over the goal card with minHeight 100% and no cap, so the brilliant drill's fixed 66-character
  // hint grew down over rank 8: at 320x568 all 16 rank-8 sample points (top edge and centre) hit pz-msg and d1-d8 did not solve. The
  // message now sits at exactly the reserve and scrolls (Kunal: "Don't change the size just allow the player to scroll through the
  // text"). Per geometry: PRECONDITION the hint is longer than the reserve (the state that used to cover); then rank 8 hit-tests to
  // the board at all 16 points, the box is a real scroller whose last line is reachable, and the back-rank answer solves.
  {const BR=[{fen:'6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',uci:'d1d8',label:'Brilliant',played:'Rd8#',ts:1791000000000,last:null}];
   for(const [w,h] of [[320,568],[375,568],[375,730]]){const tag=w+'x'+h;
     const b=await L.launch({geo:{w,h,safe:''},name:'drill-hint-board-'+tag,store:{ct_mybrilliancies:BR,ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}});await b.open();
     let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/can you spot them again\?/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);/* #550 item (66): the drill's Hint is an icon under 430 wide, so it is tapped by its accessible name */await b.page.locator('button[aria-label="Hint"]:visible').first().click({timeout:3000});await b.page.waitForTimeout(700);}catch(e){ok=false;}
     const r=ok?await b.page.evaluate(()=>{const m=[...document.querySelectorAll('[data-ct="pz-top"] div')].find(d=>/^\u{1F4A1}/u.test((d.innerText||'').trim())&&getComputedStyle(d).position==='absolute');
       const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
       if(!m||!g)return null;const gr=g.getBoundingClientRect(),sq=gr.width/8,res=m.parentElement.getBoundingClientRect();
       let lost=0;for(let c=0;c<8;c++)for(const fy of [0.15,0.5]){const e=document.elementFromPoint(gr.left+sq*(c+.5),gr.top+sq*fy);if(!e||!g.contains(e))lost++;}
       const longer=m.scrollHeight>res.height+1;const ovf=getComputedStyle(m).overflowY;let pan=true;for(let p=m;p&&p!==document.documentElement;p=p.parentElement){const ta=(getComputedStyle(p).touchAction||'auto').trim();if(/\bnone\b/.test(ta)||(/\bpan-(x|left|right)\b/.test(ta)&&!/\bpan-(y|up|down)\b/.test(ta)))pan=false;}/* cross-read A(2): script scrolls what a finger may not - require a vertical pan to be allowed */
       m.scrollTop=m.scrollHeight;const rg=document.createRange();rg.selectNodeContents(m);const rs=[...rg.getClientRects()];const lr=rs[rs.length-1],vr=m.getBoundingClientRect();
       const lastIn=!!lr&&lr.bottom<=vr.bottom+1&&lr.top>=vr.top-1;m.scrollTop=0;
       return {lost,longer,ovf,pan,sh:m.scrollHeight,ch:m.clientHeight,reserve:+res.height.toFixed(1),lastIn};}):null;
     if(L.say(!!r&&r.longer,'TC-R97 PRECONDITION '+tag+' the brilliant drill\'s hint is up and its text is LONGER than the reserve - the state that used to run over the board',r)){
       L.say(r.lost===0,'TC-R97 '+tag+' with the hint up, every rank-8 square hit-tests to the board at its top edge and centre ('+r.lost+' of 16 lost; pre-fix 16 at 320x568, 8 at 375)',r);
       L.say(/^(auto|scroll)$/.test(r.ovf)&&r.pan&&r.sh>r.ch+1&&r.lastIn,'TC-R97 '+tag+' and the hint box is a real scroller whose LAST line scrolls into view',r);
       let mv=true;try{await b.move('d1','d8',900);await b.settle(1500);}catch(e){mv=false;}
       const still=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="pz-top"] div')].some(d=>/^\u{1F4A1}/u.test((d.innerText||'').trim())&&getComputedStyle(d).position==='absolute'));
       L.say(mv&&!still,'TC-R97 '+tag+' and the back-rank answer d1-d8, tapped at the square centres, SOLVES - the hint is gone (pre-fix at 320x568 it stayed up after two tries)',{mv,hintStillUp:still});}
     await b.close();}}
  // ════════ BLOCK G - TC-R102, #548 item (160): THE BOARD DOES NOT MOVE BETWEEN MISTAKE CARDS ════════
  // jobs/auditor-547-p2-findings-2026-11-03, p2_drillBoardBetweenCards: the mistakes-drill goal names the played move and its grade,
  // so it wraps to a different number of lines card by card and the board below moved (162.5 -> 153.5 -> 162.5 measured by the
  // auditor). Three cards whose goals differ in length - a short played move and grade, a long one, the short again - and the board
  // top read on each. The board is found the only way there is (the widest repeat(8,...) grid); the goal card by its text.
  for(const G2 of [{n:'375x730',g:{w:375,h:730,safe:''}},{n:'320x568',g:{w:320,h:568,safe:''}}]){
    // MEASURED ON MAIN c7f6a1228e43 at 375x730 with exactly these three: goal heights 36 / 54 / 54 and board tops 153.5 / 162.5 /
    // 162.5 - the auditor's 9px, reproduced. A card with no `played` reads 'your move here was a blunder' and wraps one line shorter.
    const VR=[{fen:FENS[0],uci:UCIS[0],label:'Blunder',played:'',ts:1791000000000,last:null,why:'w1'},
              {fen:FENS[1],uci:UCIS[1],label:'Inaccuracy',played:'exd8=Q+',ts:1791000001000,last:null,why:'w2'},
              {fen:FENS[2],uci:UCIS[2],label:'Mistake',played:'Kd1',ts:1791000002000,last:null,why:'w3'}];
    const b=await L.launch({geo:G2.g,name:'drill-goalwrap-'+G2.n,store:{ct_mymistakes:VR,ct_pool:'3'}});await b.open();
    const rd=()=>b.page.evaluate(()=>{const gr=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(e=>e.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const gl=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/^\u{1F3AF}/u.test((d.innerText||'').trim()));
      return {top:gr?Math.round(gr.top*10)/10:null,goalH:gl?Math.round(gl.getBoundingClientRect().height):null,goal:gl?(gl.innerText||'').trim().slice(0,90):null};});
    let ok=true;const seen=[];
    try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(700);
      seen.push(await rd());await tap(b,'drill-next',1000);await b.settle(500);seen.push(await rd());await tap(b,'drill-next',1000);await b.settle(500);seen.push(await rd());}catch(e){ok=false;}
    const tag=G2.n;
    L.say(ok&&seen.length===3&&seen.every(x=>x.top!=null&&!!x.goal)&&new Set(seen.map(x=>x.goal)).size===3,'TC-R102 PRECONDITION '+tag+' three cards were shown, each with its board and its own goal',{seen});
    L.say(seen.length===3&&new Set(seen.map(x=>x.goal.length)).size>1,'TC-R102 PRECONDITION '+tag+' the three goals differ in LENGTH, so a board that held still is evidence and not a fixture that cannot wrap differently',{lens:seen.map(x=>x.goal&&x.goal.length)});
    L.say(seen.length===3&&seen.every(x=>x.top!=null&&Math.abs(x.top-seen[0].top)<0.6),'TC-R102 '+tag+' the board top is the same on all three cards ('+seen.map(x=>x.top).join(' / ')+') - the goal card reserves its height',{seen});
    await b.close();
  }

  // TC-R106 [#548 item (109); jobs/analyze-this-position-from-the-drill-2026-09-23, Kunal's 'analyse (Let Review analyse it)' on
  // questions/B8B-DRILL-POSITION]: FROM A SOLVED CARD HE TAKES OVER THE BOARD AND COMES BACK TO THE SAME CARD. The entry is found by its
  // TEXT as well as its hook (#432: a check that reads only what the fix added cannot see the defect the fix removes - on main the
  // button is absent, and A1 is red for THAT, not for a missing selector). The position is read from the PAINTED BOARD, never the
  // store: analysis opens on exactly the card's start, a move for EACH side changes it, Reset puts the start back, and the way back
  // lands on the same card number out of the same total, still solved.
  for(const G of GS){
    const tag='mistakes @ '+G.n;
    const b=await L.launch({geo:{w:G.g.w,h:G.g.h,safe:G.g.safe},name:'drill-analyse-'+G.n,store:{ct_mymistakes:rows('Blunder'),ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(700);
    let ok=true;try{await b.tapText(/find the move you missed/,{wait:1800});}catch(e){ok=false;}
    L.say(ok,'TC-R106 PRECONDITION '+tag+' the mistakes drill opened');
    const find=()=>b.page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(e).visibility!=='hidden';};
      const x=[...document.querySelectorAll('button')].find(e=>vis(e)&&(e.getAttribute('data-ct')==='drill-analyse'||/Analy[sz]e this position/i.test(e.innerText||'')));
      if(!x)return null;const r=x.getBoundingClientRect();return {w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,ct:x.getAttribute('data-ct'),text:(x.innerText||'').trim()};});
    if(ok){await tap(b,'drill-next',1000);}
    const p2=await idx(b);
    L.say(!!p2&&p2.i===2,'TC-R106 PRECONDITION '+tag+' the drill is on card 2',{counter:p2});
    const asked=await find();const askPlc=await placement(b);
    L.say(asked===null,'TC-R106 A0 '+tag+' an UNSOLVED card offers no analysis - the spoiler rule (offered there it is a hint button)',{found:asked});
    await b.move(UCIS[1].slice(0,2),UCIS[1].slice(2,4),900);await b.settle(1200);
    const sv=await state(b);const btn=await find();
    L.say(!!sv.verdict,'TC-R106 PRECONDITION '+tag+' card 2 is SOLVED (the verdict is painted)',{verdict:sv.verdict});
    L.say(!!btn&&btn.h>=44,'TC-R106 A1 '+tag+' the solved card offers "Analyse this position", a full-size tap target',{btn});
    const r=btn&&btn.ct?await tap(b,'drill-analyse',2500):{hit:false};
    L.say(!!r.hit,'TC-R106 A1b '+tag+' the control is reachable by a finger (clear of the tab bar) and was tapped',{reach:r});
    const rowBtns=()=>b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="rev-row1"] button')].map(x=>(x.innerText||'').replace(/\s+/g,' ').trim()));
    const rb=r.hit?await rowBtns():[];const anaPlc=r.hit?await placement(b):null;
    L.say(rb.some(t=>/Undo/.test(t))&&rb.some(t=>/Reset/.test(t))&&rb.some(t=>/\u2039 Card|Back to the card/.test(t)),'TC-R106 A2 '+tag+' it opens the review ANALYSIS board with take back, reset and the way back',{row:rb});
    // A2b [#548 final auditor P1]: every control on that row FITS ITS OWN BOX - '\u2039 Back to the card' needed 132px in 119.7px at 375 and read
    // 'Back to the car' while A2's text test stayed green. scrollWidth against clientWidth, per button, and the row inside the screen.
    const fit=r.hit?await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="rev-row1"]');if(!row)return null;const bs=[...row.querySelectorAll('button')].map(x=>({t:(x.innerText||'').trim(),sw:x.scrollWidth,cw:x.clientWidth}));const q=row.getBoundingClientRect();return {bs,right:+q.right.toFixed(1),vw:innerWidth,rowSw:row.scrollWidth,rowCw:row.clientWidth};}):null;
    L.say(!!fit&&fit.bs.length>=3&&fit.bs.every(x=>x.sw<=x.cw+1)&&fit.rowSw<=fit.rowCw+1&&fit.right<=fit.vw+0.5,'TC-R106 A2b '+tag+' every control on the analysis row fits its own box and the row is inside the screen (no clipped label)',fit);
    L.say(!!anaPlc&&anaPlc===askPlc,'TC-R106 A3 '+tag+' the analysis board shows EXACTLY the card\'s position (the painted pieces equal the asked card\'s)',{same:anaPlc===askPlc});
    const eng=r.hit?await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-engline"]')||{}).innerText||'').trim()):'';
    L.say(/^(M\d+|[+-]?\d+\.\d)/.test(eng),'TC-R106 A4 '+tag+' the engine is on and reads the position',{eng:eng.slice(0,60)});
    if(r.hit){await b.move('e1','d1',900);await b.settle(700);}const w1=r.hit?await placement(b):null;
    if(r.hit){await b.move('e8','d8',900);await b.settle(900);}const b1=r.hit?await placement(b):null;
    L.say(!!w1&&w1!==anaPlc&&!!b1&&b1!==w1,'TC-R106 A5 '+tag+' he moves BOTH sides: a White move changes the board, then a Black move changes it again',{white:w1!==anaPlc,black:b1!==w1});
    if(r.hit)await b.page.evaluate(()=>{const x=[...document.querySelectorAll('[data-ct="rev-row1"] button')].find(e=>/Reset/.test(e.innerText||''));x&&x.click();});
    await b.settle(700);const rs=r.hit?await placement(b):null;
    L.say(!!rs&&rs===askPlc,'TC-R106 A6 '+tag+' Reset puts the card\'s position back',{same:rs===askPlc});
    if(r.hit)await b.page.evaluate(()=>{const x=[...document.querySelectorAll('[data-ct="rev-row1"] button')].find(e=>/\u2039 Card|Back to the card/.test(e.innerText||''));x&&x.click();});
    await b.settle(1500);const back=await idx(b);const bs=await state(b);
    // A7/A8 REQUIRE THAT IT LEFT: without the round trip the card never moved and both would pass on a build with no way in (main did).
    const left=!!r.hit&&rb.some(t=>/\u2039 Card|Back to the card/.test(t));
    L.say(left&&!!back&&!!p2&&back.i===p2.i&&back.n===p2.n,'TC-R106 A7 '+tag+' the way back lands on the SAME card number out of the same total ('+(back?back.i+' of '+back.n:'none')+')',{back,before:p2});
    L.say(left&&!!bs.verdict&&!bs.asking,'TC-R106 A8 '+tag+' and that card is still SOLVED, not asked again',{verdict:bs.verdict,asking:bs.asking});
    await b.close();
  }
  // TC-R106 A9 [#548 round-2 antagonist A veto]: THE ANALYSIS BOARD NUMBERS ITS LINES FROM THE CARD'S MOVE, NOT FROM 1. Every fixture above
  // is a White card at move 1, which is why A4's shape check could not see that a FEN-built position read '1.' on every card. This one is
  // BLACK to move at move 20 (the card's own `no`), so a line from move 1 reads '1...' and a right one '20...' - in the row AND the reading.
  {const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-analyse-no20',store:{ct_mymistakes:[{fen:'4k3/1q6/8/8/8/8/8/4K3 b - - 0 1',no:20,uci:'b7b2',label:'Blunder',played:'Kd8',ts:1791000000000,last:null,why:'the queen comes down',hint:'look down the file'}],ct_pool:'3'}});
   await b.open();await b.tile('Review');await b.settle(700);let ok=true;try{await b.tapText(/find the move you missed/,{wait:1800});}catch(e){ok=false;}
   if(ok){await b.move('b7','b2',900);await b.settle(1200);}
   const r=ok?await tap(b,'drill-analyse',2500):{hit:false};
   let row='';if(r.hit){for(let k=0;k<40&&!/\d\.\S|\d\.\.\.\s*\S/.test(row);k++){await b.page.waitForTimeout(500);row=await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-engline"]')||{}).innerText||'').replace(/\s+/g,' '));}}
   L.say(ok&&!!r.hit&&!!row,'TC-R106 A9 PRECONDITION the Black move-20 card was solved, opened on the analysis board, and its engine line arrived',{row,reach:r});
   const rn=(row.match(/(?:^|\s)(\d+)\.+\s*[KQRBNOa-h]/)||[])[1];
   L.say(rn==='20','TC-R106 A9 the engine row numbers the line from the CARD\'s move: "20... " for a Black card at move 20 ("'+row.slice(0,40)+'")',{row:row.slice(0,60),first:rn});
   let rd=null;if(row){await b.page.click('[data-ct="rev-engline"]').catch(()=>{});await b.settle(600);rd=await b.page.evaluate(()=>{const m=document.querySelector('[data-ct="rev-engwhy-move"]');return m?(m.innerText||'').replace(/\s+/g,' ').trim():null;});}
   L.say(!!rd&&/^20(\.|…)/.test(rd),'TC-R106 A9b and the plain-words reading opens on 20 too ("'+(rd||'').slice(0,24)+'")',{reading:rd});
   await b.close();}
  // TC-R106 A9c/A9d/A10 [#548 final-read antagonist A vetoes]. A9 seeds only a MISTAKE card that carries `no`, which is why two routes stayed
  // wrong under it: a BRILLIANT card (captured with no `no` until the fix) and any card stored before #548 (no `no`, and its FEN always says
  // move 1). A9c: such a legacy card prints the line with NO move numbers - never a wrong '1...'. A9d: a brilliant card at move 20 reads 20.
  // A10: leaving the drill board by ⋯ -> New game must not carry the analysis board into the next game - it did (rev-row1 Undo/Exit on a fresh import).
  {const R72=require('../drive/review');
   const card={fen:'4k3/1q6/8/8/8/8/8/4K3 b - - 0 1',uci:'b7b2',ts:1791000000000,last:null,why:'the queen comes down',hint:'look down the file'};
   const openAna=async(store,enter)=>{const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-analyse-'+Object.keys(store)[0],store:Object.assign({ct_pool:'3'},store)});
     await b.open();await b.tile('Review');await b.settle(700);let ok=true;try{await b.tapText(enter,{wait:1800});}catch(e){ok=false;}
     if(ok){await b.move('b7','b2',900);await b.settle(1200);}const r=ok?await tap(b,'drill-analyse',2500):{hit:false};
     let row='';if(r.hit){for(let k=0;k<40&&!/[KQRBN][a-h1-8x]|[a-h][1-8]/.test(row.replace(/^\S+\s*/,''));k++){await b.page.waitForTimeout(500);row=await b.page.evaluate(()=>((document.querySelector('[data-ct="rev-engline"]')||{}).innerText||'').replace(/\s+/g,' '));}}
     return {b,ok,r,row};};
   {const {b,ok,r,row}=await openAna({ct_mymistakes:[Object.assign({label:'Blunder',played:'Kd8'},card)]},/find the move you missed/);
    L.say(ok&&!!r.hit&&!!row,'TC-R106 A9c PRECONDITION a legacy Black card (no stored move number) was solved, opened on the analysis board, its line arrived',{row});
    L.say(!!row&&!/(?:^|\s)\d+\.+\s*[KQRBNOa-h]/.test(row)&&/Qb2/.test(row),'TC-R106 A9c a card with no recoverable move number prints its line WITHOUT move numbers, never a wrong "1..." ("'+row.slice(0,40)+'")',{row:row.slice(0,60)});
    let rd=null;if(row){await b.page.click('[data-ct="rev-engline"]').catch(()=>{});await b.settle(600);rd=await b.page.evaluate(()=>{const m=document.querySelector('[data-ct="rev-engwhy-move"]');return m?(m.innerText||'').replace(/\s+/g,' ').trim():null;});await b.page.click('[data-ct="rev-engwhy"]').catch(()=>{});await b.settle(300);}
    L.say(!!rd&&!/^\d/.test(rd)&&/^Qb2/.test(rd),'TC-R106 A9c and the plain-words reading opens on the move with no number ("'+(rd||'').slice(0,20)+'")',{reading:rd});
    // A10 from the same board: ⋯ -> New game, then a fresh import must open on the ordinary review controls
    let row1=null,okA=false;if(r.hit){try{await b.tapCt('rev-more',500);await b.tapText(/^New game$/,{wait:800});await R72.importPgn(b,R72.PGN_OPERA,180000);await R72.startReview(b);await b.settle(800);okA=true;}catch(e){}/* read AT ARRIVAL, before any ply change: a ply change clears anaMode by itself, and the first draft's goPly(10) made A10 pass on the broken bundle */
      row1=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="rev-row1"] button')].map(x=>(x.innerText||'').trim()));}
    L.say(okA,'TC-R106 A10 PRECONDITION from the drill analysis board, ⋯ -> New game -> a fresh import reached its move screen',{row1});
    L.say(okA&&!!row1&&row1.length>0&&!row1.some(t=>/Undo|Exit analysis|\u2039 Card|Back to the card/.test(t)),'TC-R106 A10 the next game opens on its ordinary review controls, NOT the analysis board left on from the drill',{row1});
    await b.close();}
   {const {b,ok,r,row}=await openAna({ct_mybrilliancies:[Object.assign({label:'Brilliant',no:20},card)],ct_bril_reset_v1:'1',ct_bril_lib:'0'},/can you spot them again\?/);
    L.say(ok&&!!r.hit&&!!row,'TC-R106 A9d PRECONDITION a Black BRILLIANT card at move 20 was solved, opened on the analysis board, its line arrived',{row});
    const rn=(row.match(/(?:^|\s)(\d+)\.+\s*[KQRBNOa-h]/)||[])[1];
    L.say(rn==='20','TC-R106 A9d the brilliancies drill numbers its analysis line from the card\'s STORED move too - it pins the drill path; the capture now writing `no` for a brilliant is not asserted here ("'+row.slice(0,40)+'")',{first:rn});
    await b.close();}}
  // ════════ BLOCK J - TC-R108 (US-R100), #549 item (15), jobs/mistakes-pool-evicts-the-tail-the-drill-starts-at-the-head-2026-09-28 ════════
  // Kunal's default (questions/B8-SMALL-DEFAULTS (2)): a full mistakes list drops ones already PRACTISED first, then the oldest. #548 made
  // drillGo stamp practisedAt, but the FIRST card of every session is opened by startMistakes through loadExternal and was never stamped,
  // and the 150 cap ran only on the review merge, so a store arriving over it was kept whole. Both are read from the STORE, not the screen.
  {const J=FENS[0];
   const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-pool-stamp',store:{ct_mymistakes:rows('Blunder'),ct_pool:'3'}});
   await b.open();await b.tile('Review');await b.settle(700);let ok=true;try{await b.tapText(/find the move you missed/,{wait:1800});}catch(e){ok=false;}
   await b.settle(800);const p=ok?await idx(b):null;
   const st=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_mymistakes')||'[]');}catch(e){return null;}});
   L.say(ok&&!!p&&p.i===1&&p.n===N&&Array.isArray(st)&&st.length===N,'TC-R108 A1 PRECONDITION the mistakes drill opened on card 1 of '+N+' and the stored list reads back with '+N+' rows',{counter:p,stored:st&&st.length});
   const e1=Array.isArray(st)?st.find(x=>x.fen===J):null;
   L.say(!!e1&&typeof e1.practisedAt==='number'&&e1.practisedAt>0,'TC-R108 A2 the FIRST card the drill serves is stamped practised in the store - it is opened by startMistakes, not drillGo, and was never stamped, so capMistakes kept it over an older unseen one',{first:e1&&{fen:e1.fen,practisedAt:e1.practisedAt}});
   const others=Array.isArray(st)?st.filter(x=>x.fen!==J):[];
   L.say(others.length===N-1,'TC-R108 A3pre the other '+(N-1)+' rows are in the store to be read',{n:others.length});
   L.say(others.length===N-1&&others.every(x=>!x.practisedAt),'TC-R108 A3 and NO card the drill has not yet served is stamped - the instrument can say no, and the stamp is not sprayed over the queue',{stamped:others.filter(x=>x.practisedAt).map(x=>x.fen)});
   await b.close();}
  {const mk=i=>({fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 '+(i+1),uci:'b2b7',label:'Blunder',played:'Kd1',ts:1791000000000-i*1000,last:null,why:'w'+i,hint:'h'+i,...(i>=10&&i<20?{practisedAt:1791000000000}:{})});
   const seed=Array.from({length:160},(_,i)=>mk(i));   // newest first: index 159 is the oldest; ten practised rows at 10..19
   const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-pool-cap-on-load',store:{ct_mymistakes:seed,ct_pool:'3'}});
   await b.open();await b.settle(1500);
   const st=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_mymistakes')||'null');}catch(e){return null;}});
   L.say(Array.isArray(st)&&st.length>0,'TC-R108 A4pre the stored list reads back after boot',{stored:st&&st.length});
   L.say(Array.isArray(st)&&st.length===150,'TC-R108 A4 a store arriving with 160 rows is held at the 150 cap on load, not only on the review merge',{stored:st&&st.length});
   L.say(Array.isArray(st)&&st.length===150&&st.every(x=>!x.practisedAt),'TC-R108 A5 the ten it dropped are the ten PRACTISED rows',{practisedLeft:Array.isArray(st)?st.filter(x=>x.practisedAt).length:null});
   L.say(Array.isArray(st)&&st.some(x=>x.fen===seed[159].fen)&&st.some(x=>x.fen===seed[0].fen),'TC-R108 A6 the oldest unpractised row and the newest both survive',{oldest:seed[159].fen});
   await b.close();}
  // ════════ BLOCK K - TC-R177 (US-R100), #550 item (13), the same job's folded (a) and (b) ════════
  // Kunal's 'Use your defaults' (questions/B8-SMALL-DEFAULTS) as the batch 10 brief reads it: count only the rows the drill can play,
  // delete nothing, and say why when none can. A row is unplayable when puzzleFromMistake refuses it (no king, an illegal move).
  {const BADROW=(i)=>({fen:'8/8/8/8/8/8/8/'+(i?'7K':'K7')+' w - - 0 1',uci:'a1a2',label:'Blunder',played:'Kd1',ts:1790000000000-i,last:null,why:'x',hint:'x'});
   const cardSub=async(b)=>b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/Practice your mistakes/.test(e.innerText||''));return x?(x.innerText||'').replace(/\s+/g,' ').trim():null;});
   {const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-pool-playable-count',store:{ct_mymistakes:[...rows('Blunder'),BADROW(0),BADROW(1)],ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(800);const t=await cardSub(b);
    L.say(!!t,'TC-R177 A1 PRECONDITION the Practice your mistakes card is on the Review screen for a store of '+(N+2)+' rows, 2 of them unplayable',{t});
    L.say(!!t&&new RegExp('\\b'+N+' positions? from your reviewed games').test(t),'TC-R177 A1 the card counts the '+N+' rows the drill can play, not the '+(N+2)+' stored',{t});
    await b.close();}
   {const b=await L.launch({geo:{w:375,h:761,safe:'51,31'},name:'drill-pool-none-playable',store:{ct_mymistakes:[BADROW(0),BADROW(1)],ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(800);const t=await cardSub(b);
    L.say(!!t&&/None of your 2 saved positions can be played yet/.test(t),'TC-R177 A2 with nothing playable the card says so, with the count it holds, instead of offering a drill it cannot serve',{t});
    let tapped=true;try{await b.tapText(/^Practice your mistakes/,{wait:600});}catch(e){tapped=false;}
    const toast=await b.page.evaluate(()=>[...document.querySelectorAll('div')].map(d=>(d.innerText||'').trim()).find(x=>/^None of your 2 saved positions can be played:/.test(x))||null);
    const st=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_mymistakes')||'null');}catch(e){return null;}});
    const inDrill=await b.page.evaluate(()=>/Your mistakes/.test(document.body.innerText||''));
    L.say(tapped&&!!toast&&/kept, not deleted/.test(toast),'TC-R177 A3 a tap says why nothing can be played (a legal position and a legal better move) and that the rows are kept',{tapped,toast});
    L.say(Array.isArray(st)&&st.length===2&&!inDrill,'TC-R177 A4 and nothing is deleted or served: the store still holds both rows and no drill opened',{stored:st&&st.length,inDrill});
    await b.close();}
  }
  // ════════ BLOCK L - TC-R178 (US-R114), #550 item (22), jobs/the-brilliant-moves-drill-jumps-to-a-number-from-its-counter-2026-11-11 ════════
  // Kunal, 11 Nov: "a way to jump to a specific number so we don't have to hit next next next". Both drills, at his phone and the
  // smallest: tap the counter (found by its TEXT 'i of N' inside pz-top, never by a hook this build adds), choose the last number in
  // the chooser (found as a button whose whole text is that number), and the drill is on that card; Prev then steps back one.
  for(const D of DRILLS)for(const geo of ['kunal761','se']){
   const b=await L.launch({geo,name:'drill-jump-'+D.k+'-'+geo,store:D.store});await b.open();await b.tile('Review');await b.settle(700);
   let ok=true;try{await b.tapText(D.enter,{wait:1800});}catch(e){ok=false;}await b.settle(800);
   const p0=ok?await idx(b):null;const tag=L.GEOS[geo].w+'x'+L.GEOS[geo].h+' '+D.k;
   L.say(ok&&!!p0&&p0.i===1&&p0.n===N,tag+': TC-R178 PRECONDITION the drill opened on card 1 of '+N,{p0});
   if(ok&&p0){
    const c=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;let best=null,ba=1e9;for(const e of t.querySelectorAll('*')){const x=(e.innerText||'').trim();if(!/\b\d+ of \d+\b/.test(x))continue;const r=e.getBoundingClientRect();const a=r.width*r.height;if(r.width>1&&a<ba){ba=a;best={x:r.left+r.width/2,y:r.top+r.height/2};}}return best;});
    if(c){await b.page.mouse.click(c.x,c.y);await b.settle(600);}
    const nb=await b.page.evaluate((n)=>{const x=[...document.querySelectorAll('button')].filter(e=>(e.innerText||'').trim()===String(n)&&e.getBoundingClientRect().width>1);return x.length?(()=>{const r=x[x.length-1].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};})():null;},N);
    L.say(!!c&&!!nb,tag+': TC-R178 a tap on the counter opens a chooser that offers card '+N,{counter:c,last:nb});
    L.say(!!nb&&nb.w>=44&&nb.h>=44,tag+': TC-R178 each number in the chooser is at least 44 by 44 to tap',nb);
    if(nb){await b.page.mouse.click(nb.x,nb.y);await b.settle(900);}
    const p1=await idx(b);
    L.say(!!nb&&!!p1&&p1.i===N&&p1.n===N,tag+': TC-R178 choosing '+N+' shows card '+N+' of '+N+' at once (it was '+(p1&&p1.i)+')',{p1});
    let pv=true;try{await b.page.locator('[data-ct="drill-prev"]').click();}catch(e){pv=false;}await b.settle(1000);
    const p2=await idx(b);
    L.say(!!nb&&pv&&!!p2&&p2.i===N-1,tag+': TC-R178 Prev then steps back to card '+(N-1)+' (read '+(p2&&p2.i)+')',{pv,p2});
   }
   await b.close();}
  /* ===== BLOCK M, TC-R181 [#550 item (54); jobs/the-drill-nav-row-rests-under-the-tab-bar-at-320x568-on-main-2026-10-04] =====
     The job's case, which no gate wrote: at REST, with #root not scrolled, EVERY button in the drill's bottom area (the pz-bottom
     container plus Prev and Next, wherever they sit: Hint, Show move, Reset, Prev, Next, and Analyse after a solve) hit-tests to
     ITSELF at its centre, at all seven geometries (L.TA7, THE DRILL SEVEN), on both drills. reach() above scrolls #root to its end
     whenever a centre misses, which is why A2e/A2f could pass with the row under the tab bar (the #549 checker's gap). This block
     never scrolls; it asserts #root.scrollTop is 0 before it reads. Each state's denominator is its own line. */
  const atRest=(b)=>b.page.evaluate(()=>{const root=document.getElementById('root');const vis=e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);return r.width>1&&r.height>1&&st.visibility!=='hidden';};
    const set=new Set();const pb=document.querySelector('[data-ct="pz-bottom"]');if(pb)for(const x of pb.querySelectorAll('button'))set.add(x);
    for(const id of ['drill-prev','drill-next']){const x=document.querySelector('[data-ct="'+id+'"]');if(x)set.add(x);}
    const out=[...set].filter(vis).map(e=>{const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {t:((e.innerText||e.getAttribute('aria-label')||'')+'').replace(/\s+/g,' ').trim().slice(0,24),self:!!(h&&(h===e||e.contains(h))),
        under:h&&!(h===e||e.contains(h))?((h.closest('[data-ct]')||h).getAttribute('data-ct')||h.tagName):null,cy:Math.round((r.top+r.height/2)*10)/10};});
    return {scrollTop:root?root.scrollTop:null,vh:innerHeight,btns:out};});
  for(const d of DRILLS){
    for(const g of L.TA7){
      const tag=d.k+' @ '+L.GEOS[g].label;
      const b=await L.launch({geo:g,name:'drill-rest-'+d.k+'-'+g,store:d.store});await b.open();
      let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(d.enter,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);}catch(e){ok=false;}
      if(L.say(ok,'TC-R181 '+tag+': PRECONDITION the drill opened')){
        const r=await atRest(b);
        L.say(r.scrollTop===0&&r.btns.length>=4,'TC-R181 '+tag+': DENOMINATOR asking, at rest (#root scrollTop '+r.scrollTop+'), the bottom area paints '+r.btns.length+' buttons (at least 4: Hint, Show move, Prev, Next)',r.btns.map(x=>x.t));
        const bad=r.btns.filter(x=>!x.self);
        L.say(r.scrollTop===0&&r.btns.length>=4&&bad.length===0,'TC-R181 '+tag+': asking, every bottom-area button hit-tests to ITSELF at rest with no scroll ('+r.btns.map(x=>x.t+(x.self?'':' UNDER '+x.under)).join(' | ')+')',bad);
        // a solve, then the same read: Analyse joins the row
        const u=UCIS[0];let r2=null;try{await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1400);await b.page.evaluate(()=>{const root=document.getElementById('root');if(root)root.scrollTop=0;});await b.settle(200);r2=await atRest(b);}catch(e){}
        const an=r2&&r2.btns.some(x=>/Analy/.test(x.t));
        L.say(!!r2&&r2.scrollTop===0&&an,'TC-R181 '+tag+': DENOMINATOR solved, at rest, the bottom area paints '+(r2?r2.btns.length:0)+' buttons including Analyse',r2&&r2.btns.map(x=>x.t));
        const bad2=r2?r2.btns.filter(x=>!x.self):[];
        L.say(!!r2&&an&&r2.scrollTop===0&&bad2.length===0,'TC-R181 '+tag+': solved, every bottom-area button, Analyse included, hit-tests to ITSELF at rest ('+(r2?r2.btns.map(x=>x.t+(x.self?'':' UNDER '+x.under)).join(' | '):'none')+')',bad2);
      }
      await b.close();}
  }
},'72-drill-prev');
