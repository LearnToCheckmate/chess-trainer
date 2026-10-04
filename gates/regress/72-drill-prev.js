// regress/72-drill-prev.js   TC-R47 (US-R35): a drill must go BACKWARDS as well as forwards, and a card
// THE IDS ARE NOT THE ONES THE JOB NAMES, DELIBERATELY. jobs/drill-needs-a-previous-card-2026-09-23 says
// "US-R27 (NEW)" and "TC-R37 (NEW)", written by spec-a on 2026-09-28; both were ALREADY TAKEN in
// claude/stories/ by the Lesson MOVES row pair, so following the job verbatim would have minted a second
// US-R27 and a second TC-R37 - one id, two meanings, which is R45 shape (1). #475 allocated US-R35 and TC-R47,
// both past the highest id in use, and filed the cause as a job rather than only stepping around it.
// you already solved must come back solved rather than asking again.
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

const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1',
            '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1','4k3/8/8/8/8/8/5Q2/4K3 w - - 0 1',
            '4k3/8/8/8/8/8/6Q1/4K3 w - - 0 1'];
const UCIS=['b2b7','c2c7','d2d7','f2f7','g2g7'];
const N=FENS.length;
const rows=(label)=>FENS.map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,
  why:'the queen gets behind the pawn (card '+(i+1)+')',hint:'look up the file (card '+(i+1)+')'}));

const DRILLS=[
  {k:'mistakes',   enter:/find the move you missed/,        store:{ct_mymistakes:rows('Blunder'),ct_pool:'3'},                                 counter:/Your mistakes/},
  {k:'brilliant',  enter:/can you spot them again\?/,       store:{ct_mybrilliancies:rows('Brilliant'),ct_bril_reset_v1:'1',ct_pool:'3'},      counter:/Your brilliant moves/},
];
const GS=[{n:'kunal761',g:L.GEOS.kunal761},{n:'320x568',g:L.GEOS.se}];

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
  return {btns,asking:btns.some(x=>/Hint/.test(x)),verdict:verdict[0]||'',
          exits:btns.filter(x=>/^‹\s*Review$/.test(x)).length,
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
  L.note('GEOMETRIES: '+GS.map(x=>x.n).join(', ')+'   [R19: 375x761 is his phone; TC-R47 says 375x730 and that is the figure R19 corrects]');
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
      await tap(b,'drill-next',1000);
      let p2=await idx(b);
      L.say(!!p2&&p2.i===2,'TC-R47 A6 '+tag+' (b) Next moved the index to exactly 2',{counter:p2});
      const s2=await state(b);
      L.say(s2.prev&&s2.prev.dis===false,'TC-R47 A7 '+tag+' (a) Prev is ENABLED on card 2',{prev:s2.prev});
      // solve card 2 by playing its stored move
      const u=UCIS[1];await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1100);
      const sv=await state(b);
      if(!L.say(sv.asking===false&&sv.verdict.length>0,'TC-R47 A8 '+tag+' card 2 was actually SOLVED - the verdict is on screen and the Hint row has gone. Every claim A10 makes about "comes back solved" is vacuous without this',{asking:sv.asking,verdict:sv.verdict.slice(0,70)})){
        await b.close();continue;}
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
      L.say(sb.verdict.length>0,'TC-R47 A10c '+tag+' (c) the revisited card 2 still shows its verdict, so the work he went back to look at survived the round trip [US-R35 clause two]',{verdict:sb.verdict.slice(0,90)});

      // ---- A11 (b): and all the way back to card 1, where Prev goes inert again.
      await tap(b,'drill-prev',1000);
      const p1=await idx(b),s1=await state(b);
      L.say(!!p1&&p1.i===1,'TC-R47 A11a '+tag+' (b) Prev reached card 1 - the index decrements one at a time in the backward direction too',{counter:p1});
      L.say(s1.prev&&s1.prev.dis===true,'TC-R47 A11b '+tag+' (a) Prev is inert again at the front of the queue',{prev:s1.prev});
      L.say(s1.exits===1,'TC-R47 A11c '+tag+' (d) still exactly one exit after a full round trip',{exits:s1.exits,buttons:s1.btns});
      L.say(p1&&p1.n===N,'TC-R47 A11d '+tag+' the queue LENGTH never changed across the walk - a solve must not shorten the queue under the player mid-drill',{counter:p1});

      L.say(b.errs.length===0,'TC-R47 A12 '+tag+' no console errors during the walk',{errs:b.errs.slice(0,2)});
      await b.close();
    }
  }
},'72-drill-prev');
