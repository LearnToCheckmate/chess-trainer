// regress/11-lesson.js  (port of lesson371.js)  k11 / A-01 / Y-01 / Y-02: the lesson board is edge to edge at
// the same top in every phase. Card 3 = the King's Gambit demo at its END, card 4 = practice before the first
// move; then one correct practice move (1.e4) and the board must not change size or move.
'use strict';
const L=require('../lib');
const D=require('../drive/lesson');
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'lesson-'+geo});await b.open();
    await b.card(3,2500);const demoEnd=await b.metrics();await b.shot('lesson-'+geo+'-demo-end');
    const note=await b.rect('[data-ct="lesson-note"]');
    L.say(!!demoEnd.board,geo+': demo end shows a board',demoEnd.board);
    if(geo==='kunal'&&demoEnd.board){L.say(Math.abs(demoEnd.board.w-375)<0.6,'kunal: demo end board is 375 wide ('+demoEnd.board.w+')');L.say(Math.abs(demoEnd.board.top-92)<1,'kunal: demo end board top is 92 ('+demoEnd.board.top+')');}
    L.say(!!note&&Math.abs(note.h-75)<1,geo+': note box is 75px',note&&note.h);
    L.say(demoEnd.over.over<=0&&demoEnd.over.docScroll===0,geo+': no scroll at the demo end',demoEnd.over);
    await b.card(4,2500);const prac=await b.metrics();await b.shot('lesson-'+geo+'-practice');
    L.say(!!prac.board&&!!demoEnd.board&&Math.abs(prac.board.w-demoEnd.board.w)<0.6&&Math.abs(prac.board.top-demoEnd.board.top)<0.6,geo+': practice board = demo board (w '+(prac.board&&prac.board.w)+' top '+(prac.board&&prac.board.top)+')');
    await b.move('e2','e4',1800);const after=await b.metrics();await b.shot('lesson-'+geo+'-practice-e4');
    L.say(!!after.board&&Math.abs(after.board.w-prac.board.w)<0.6&&Math.abs(after.board.top-prac.board.top)<0.6,geo+': board unchanged after one practice move (w '+(after.board&&after.board.w)+' top '+(after.board&&after.board.top)+')');
    L.say(after.over.over<=0&&after.over.docScroll===0,geo+': no scroll after the move',after.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }

  // ---- SHORT AND NARROW PHONES, which this gate did not run until #383 and which is why it encoded an
  // assumption that is false there. uat378-lesson-board-not-edge-to-edge reported the lesson board failing to
  // reach the screen edges at 320x568, 360x640 and 375x667 while passing at 375x679 and above, and gallery
  // cards 3/8 and 4/8 assert "board edge to edge" throughout.
  //
  // MEASURED ON #382, and it is NOT a defect in the app: at every one of those geometries the column fills the
  // viewport EXACTLY - bottom equals innerHeight, zero slack - so the board is already as large as the height
  // allows. A square board cannot be as wide as the screen when the screen is shorter than it is wide plus the
  // chrome. At 320x568 the demo board is 270.9 and practice 254.9, and the 16px difference is exactly the extra
  // chrome practice carries: a 56px control row against demo's 44 (+12) and a 74.1px MOVES panel against demo's
  // 70.1 (+4). 12 + 4 = 16. Nothing is stealing width; there is no width to steal.
  //
  // RE-PINNED AT #430, AND THE IDENTITY WAS RE-DERIVED RATHER THAN THE NUMBER SWAPPED. Practice was 230.9 with a
  // 98.1px panel (+28) until #430, which stopped the MOVES row WRAPPING at this geometry by shrinking its two
  // chips. Measured on both bundles at 320x568: the practice MOVES row was 52px tall on two lines and is 23px on
  // one, so the panel falls 98.13 -> 74.13 and the board takes the 24px back, 230.9 -> 254.9. THE DEMO END IS
  // UNCHANGED TO THE HUNDREDTH on both bundles (board 270.9, panel 70.13), which is the check that this pin moved
  // because the chrome shrank and not because something started stealing width - the very distinction the
  // assertion below is worded around. The gate was RIGHT to go red: it caught a real change in board geometry,
  // which is what it is for, so the pin moves WITH the change rather than being deleted or widened.
  //
  // So "edge to edge" is an unachievable absolute at those sizes, and asserting it would be asserting geometry
  // away. What IS testable, and is the real invariant, is that the board is GIVEN EVERYTHING AVAILABLE: no slack
  // below the column, and the leftover width shared evenly so the board stays centred. That is asserted here.
  //
  // NOTE WHAT THIS ALSO EXPOSES about the assertion above: "practice board = demo board" holds only where BOTH
  // are width-bound. It is true at 375x679 and 390x844 and false at 320x568 and 375x667, and it passed for
  // months because this gate ran only the two geometries where it happens to hold.
  for(const [name,g] of [['320x568',{w:320,h:568,safe:''}],['360x640',{w:360,h:640,safe:''}],['375x667',{w:375,h:667,safe:''}]]){
    for(const st of ['demo-end','practice-m0']){
      const b=await L.launch({geo:g,name:'lesson-'+name+'-'+st,store:{}});await b.open();
      await D.states[st](b);await b.settle(600);
      const m=await b.page.evaluate(()=>{
        const root=document.getElementById('root');let bottom=0;
        const walk=(el,d)=>{for(const c of el.children){const s=getComputedStyle(c);
          if(s.position==='fixed'||s.position==='absolute')continue;const r=c.getBoundingClientRect();
          if(r.height>0)bottom=Math.max(bottom,r.bottom);if(d<4)walk(c,d+1);}};
        walk(root,0);
        const gr=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''))
          .map(e=>e.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0];
        return {vw:innerWidth,vh:innerHeight,bottom:Math.round(bottom*10)/10,
                board:gr?{w:Math.round(gr.width*10)/10,x:Math.round(gr.left*10)/10}:null};
      });
      const tag=name+' '+st;
      L.say(!!m.board,tag+': the lesson board is on screen',m.board);
      // THIS ONE DOES NOT DISCRIMINATE, and it is kept only because it is true and explains the shape.
      // Proved: against a bundle with the board shrunk to 90% it still passes, because the MOVES panel carries
      // flex:'1 1 auto' and stretches to absorb whatever the board gives up, so the column fills the viewport
      // either way. Recorded rather than quietly relied on - it looks like the assertion that matters and is not.
      L.say(Math.abs(m.bottom-m.vh)<2,tag+': the column fills the viewport (bottom '+m.bottom+' of '+m.vh+'). NOTE: this cannot fail while the MOVES panel flexes, so it explains the shape rather than guarding it.',{bottom:m.bottom,vh:m.vh});
      // THIS is the assertion that guards the board. Same fix 10-gameover and A-12 needed: a size compared only
      // to itself, or to an invariant that always holds, cannot see the board get smaller. Measured on #382.
      const WANT={'320x568 demo-end':270.9,'320x568 practice-m0':254.9/* #430: was 230.9; the MOVES row no longer wraps here, see the note above */,'360x640 demo-end':342.4,'360x640 practice-m0':326.4,'375x667 demo-end':375,'375x667 practice-m0':352.2};
      /* ── RE-KEYED TO THE TWO STATES THE FIT LOOP IS BISTABLE BETWEEN [#544, item (8) of
         directOpening_2026_10_28_batch4;
         jobs/461-the-gate-manifest-is-built-and-controlled-and-held-on-a-bistable-literal-in-gate-11-2026-10-02,
         which names this line as THE ONE BLOCKER that stopped #461's push, and
         jobs/re-key-gate-11-WANT-to-the-physics-the-430-way-2026-10-02].
         WHAT WAS WRONG. The assertion was `Math.abs(m.board.w-WANT[tag])<1.5` against a hard-coded table, and
         the 320x568 demo-end board is BISTABLE ON ONE BUNDLE: 270.9 in run 1 and in the archived #460 log,
         262.9 in run 2 - a difference of EXACTLY 8.0px, which is one step of the board's fit trim. That single
         FAIL was the only red in #461's second full suite and the only reason that build did not push, on a
         diff that touched no application code and no gate.
         WHY 8.0 IS THE PHYSICS AND NOT A COINCIDENCE. On a lesson screen `_edge` is true, so chess.jsx's SQ
         returns `Math.max(24,Math.round(_cap/8*100)/100)` - CONTINUOUS, not quantised - and `_cap` carries
         `_trim=boardTrim`, which the fit loop walks in 8px steps until the column fits. So the only thing that
         can move this board by exactly 8.0 on one bundle at one geometry is the loop settling on the adjacent
         trim step, and the two readings are the two stable states of one mechanism.
         WHAT IS ASSERTED NOW: the board is at the pinned width OR exactly one trim step under it, and NOTHING
         ELSE. That is narrower than it sounds and is the whole point - it still rejects a board that is
         smaller than one step (the board lost space, which is what this assertion exists for), a board that is
         LARGER (the chrome lost space), and anything that is not one of the two states. It is not a widened
         tolerance: `<9.5` would accept +8 as well, and the chrome losing 8px is a real defect.
         THE CONTROL IS WHAT MAKES THIS HONEST, and the job says so in terms - re-keying a currently-failing
         literal inside the run that needs it to pass, without a control, is weakening an assertion to get
         green. TWO trial bundles were built at #544 with gates/build.sh CT_OUT (chess.jsx patched, built,
         reverted byte-identical, app.js never touched):
           SMALLER, the edge-path board x0.9 (bundle md5 8d809ba235f7): this assertion goes RED at ALL SIX
             geometry/state pairs - 57 pass / 7 fail - with the 320x568 demo board at 243.8, which is 27.1
             under the pin and 19.1 under the lower state.
           LARGER, the edge-path board +8 (bundle md5 223c40e2bd78): 61 pass / 3 fail, and the result is more
             useful than a clean red. It reddens here at 360x640 practice-m0 (334.4 against a pin of 326.4),
             and the two other reds are the kunal-geometry assertions below. IT DOES NOT REDDEN AT 320x568,
             AND THAT IS THE FIT LOOP DOING ITS JOB: the loop trims until the column fits, so it takes the
             extra 8px back and the board lands on a stable state again. SO THE LIMIT OF THE "larger" HALF OF
             THIS ASSERTION IS NAMED RATHER THAN CLAIMED: where the fit loop can absorb a chrome loss it does,
             and this assertion cannot see it there. What catches that case is the kunal-geometry pins and the
             width-bound geometries, which the same control reddens.
         AND THE LOWER STATE IS REPORTED EVERY TIME IT HAPPENS, so "bistable" stays a measurement rather than
         an excuse: if the log never shows the note, the second state has stopped occurring and the pin can go
         back to one value. */
      const TRIM_STEP=8;
      if(WANT[tag]!=null){
        const w=m.board?m.board.w:null;
        const atPin=w!=null&&Math.abs(w-WANT[tag])<1.5;
        const oneStepUnder=w!=null&&Math.abs(w-(WANT[tag]-TRIM_STEP))<1.5;
        L.say(atPin||oneStepUnder,tag+': the board is '+WANT[tag]+' wide, or exactly one '+TRIM_STEP+'px fit-trim step under it ('+(Math.round((WANT[tag]-TRIM_STEP)*10)/10)+') - the two states this column is bistable between on one bundle, and nothing else. Smaller than that and the board lost space; larger and the chrome did.',{measured:w,pin:WANT[tag],lowerState:Math.round((WANT[tag]-TRIM_STEP)*10)/10,atPin,oneStepUnder,trimStep:TRIM_STEP});
        if(oneStepUnder)L.note('       '+tag+': the board came out at the LOWER of the two stable states ('+w+' against the pin '+WANT[tag]+'). Reported, not a failure - see the comment above. If this note stops appearing the pin can go back to one value.');
      }
      L.say(!!m.board&&m.board.w<=m.vw+0.6,tag+': the board never exceeds the viewport width',m.board);
      L.say(!!m.board&&Math.abs(m.board.x-(m.vw-m.board.w)/2)<1.5,tag+': the width the board cannot use is shared evenly - it stays centred rather than pinned to one side (x '+(m.board&&m.board.x)+', expected '+(m.board?Math.round((m.vw-m.board.w)/2*10)/10:'-')+')',m.board);

      /* #394 (kunal-lesson-footer-icons-small): THE GLYPHS IN THE LESSON FOOTER, NOT THE BOXES.
         He reported the footer icons as too small. The CONTAINERS were never the problem - measured 50.5pt
         square on his phone, above the 44pt minimum - so a container check would have gone green while the
         complaint stood. What is small is the INK: a 9.2pt close x, 13.8 x 18.3 chevrons, 17.2 x 3.1 dots.
         So this asserts the GLYPH, by measuring the text node's own box rather than the button's, and it
         asserts all five agree - "consistent" is what he actually asked for, and one shared size is the only
         way that is a fact rather than a judgement.
         AND IT ASSERTS THE BOXES DID NOT GROW, because the fix had to cost no layout: this row is
         position:fixed with minHeight 44, so the board must be untouched. A version of this fix that bumped
         the container would satisfy "bigger" and break the rule that matters more. */
      const foot=await b.page.evaluate(()=>{
        const vh=innerHeight;
        return [...document.querySelectorAll('button[aria-label]')].map(e=>{
          const r=e.getBoundingClientRect();
          if(r.width<1||r.bottom<vh-140||r.top>vh)return null;
          if(!/Back a move|Forward a move|Play or pause|Close lesson|More for this lesson/.test(e.getAttribute('aria-label')||''))return null;
          let gw=0,gh=0;
          const svg=e.querySelector('svg');
          if(svg){const g=svg.getBoundingClientRect();gw=+g.width.toFixed(1);gh=+g.height.toFixed(1);}
          else{const rg=document.createRange();rg.selectNodeContents(e);const g=rg.getBoundingClientRect();gw=+g.width.toFixed(1);gh=+g.height.toFixed(1);}
          return {aria:e.getAttribute('aria-label'),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
                  fs:parseFloat(getComputedStyle(e).fontSize),gw,gh};
        }).filter(Boolean);
      });
      if(st==='demo-end'){
        L.say(foot.length===5,name+': the lesson footer shows its five buttons (precondition - without this the size checks below pass by measuring nothing)',foot.map(f=>f.aria));
        L.say(foot.every(f=>f.h>=44&&f.h<=46),name+': every footer button is still 44 to 46 tall - the fix had to go INSIDE the box, because this row is fixed and any growth here is board height spent',foot.map(f=>f.h));
        L.say(foot.every(f=>f.gh>=20),name+': every footer GLYPH is at least 20px tall. The boxes were always big enough; the ink was not, and that is what he reported',foot.map(f=>({a:f.aria,gh:f.gh})));
        L.say(foot.every(f=>f.gw>=16),name+': and at least 16px wide',foot.map(f=>({a:f.aria,gw:f.gw})));
        const sizes=[...new Set(foot.map(f=>f.fs))];
        L.say(sizes.length===1,name+': all five carry ONE font size, so "consistent" is a fact rather than a judgement. The play button shipped at 13px because it used to carry the word "Pause" - #347, icons still sized for the labels they stopped carrying',sizes);
        L.say(foot.every(f=>f.gw<=f.w-6&&f.gh<=f.h-6),name+': and no glyph fills its box edge to edge - raising the ink must not make the button look like a solid block',foot.map(f=>({a:f.aria,gw:f.gw,w:f.w})));
      }
      await b.shot('lesson-'+name+'-'+st);
      await b.close();
    }
  }
  // ── THE LESSON DRIVER'S TRY-AGAIN STATE, AND ITS NEGATIVE CONTROL IN THE SAME BLOCK [#544, item (24);
  // jobs/522-the-lesson-drivers-try-again-selector-is-stale-so-practice-tryagain-throws-on-every-bundle-2026-10-14].
  // WHY IT IS HERE AT ALL: `grep -rn practice-tryagain gates/ claude/stories/` returned the driver's own
  // definition and its doc comment AND NOTHING ELSE, so that state had ZERO consumers and the job's "the count
  // of affected assertions is unmeasured, so the blast radius is unknown" resolves to ZERO ASSERTIONS. These
  // are the first, which is what makes the repair checkable rather than merely written.
  // THE TWO GEOMETRIES ARE THE JOB'S OWN two inputs, 375x568 and 320x540, and both are geometries where the
  // OLD selector could not match: at 375x568 the button reads '↻ Again' (98.9px) and at 320x540 '↻' (72.4px),
  // measured at #544 on main's own bundle. At 375x679 and 390x844 the label IS '↻ Try again' and the old
  // selector worked, which is why this block does not drive those - the defect is geometry-conditioned.
  // T0 IS THE NEGATIVE CONTROL AND IT LIVES IN THE GATE RATHER THAN IN A BROKEN BUNDLE, because the thing that
  // was wrong is a SELECTOR and a selector's falsity is measurable in the healthy app: the old pattern must
  // match no button here while the accessible name matches one. If a future layout change makes the visible
  // label '↻ Try again' at these sizes, T0 goes red and says the control has stopped controlling - which is
  // better than it silently becoming a tautology.
  for(const tg of [{n:'375x568',g:L.GEOS.short375},{n:'320x540',g:{w:320,h:540,safe:''}}]){
    // (a) the wrong state, where the old selector is shown unable to match.
    {
      const b=await L.launch({geo:tg.g,name:'tryagain-ctl-'+tg.n});await b.open();
      await D.states['practice-wrong'](b);
      const seen=await b.page.evaluate(()=>[...document.querySelectorAll('button')]
        .map(e=>({t:(e.innerText||'').replace(/\s+/g,' ').trim(),a:e.getAttribute('aria-label')||'',w:+e.getBoundingClientRect().width.toFixed(1)}))
        .filter(x=>/↻/.test(x.t)||/Try again/.test(x.a)));
      const oldHits=seen.filter(x=>/^↻ Try again$/.test(x.t)||/^↻ Try again$/.test(x.a)).length;
      const newHits=seen.filter(x=>/^Try again$/.test(x.t)||/^Try again$/.test(x.a)).length;
      L.say(newHits===1,'TC-R64c T0a '+tg.n+' INSTRUMENT: exactly one button is reachable by the ACCESSIBLE NAME \'Try again\' - the one string that is identical at every geometry',{seen,newHits});
      L.say(oldHits===0,'TC-R64c T0b '+tg.n+' NEGATIVE CONTROL: the OLD selector /^↻ Try again$/ matches NO button here, which is why gates/drive/lesson.js\'s practice-tryagain threw at this geometry on every bundle',{seen,oldHits});
      const nw=await b.text('[data-ct="lesson-note"]');
      L.say(/Not the book move/.test(nw||''),'TC-R64c T1 '+tg.n+' the wrong-move line IS PRESENT before anything claims it was cleared [#385]',{note:nw});
      L.say(b.errs.length===0,'TC-R64c T1e '+tg.n+' zero app errors in the wrong state',b.errs.slice(0,3));
      await b.close();
    }
    // (b) the state itself, which is the thing the job asks to be shown reachable.
    {
      const b=await L.launch({geo:tg.g,name:'tryagain-'+tg.n});await b.open();
      let threw=null;
      try{ await D.states['practice-tryagain'](b); }catch(e){ threw=String((e&&e.message)||e).slice(0,120); }
      L.say(threw===null,'TC-R64c T2 '+tg.n+' D.states[\'practice-tryagain\'] REACHES ITS STATE instead of throwing - tapBtn throws when its target is absent, which is how this state failed silently rather than loudly',{threw});
      const n1=threw===null?await b.text('[data-ct="lesson-note"]'):null;
      L.say(threw===null&&/Your move/.test(n1||'')&&!/Not the book move/.test(n1||''),'TC-R64c T3 '+tg.n+' and the wrong-move line is CLEARED: the note is back to the move-0 prompt',{note:n1});
      L.say(b.errs.length===0,'TC-R64c T3e '+tg.n+' zero app errors through the Try-again tap',b.errs.slice(0,3));
      await b.shot('tryagain-'+tg.n);
      await b.close();
    }
  }
// ── THE CONTROL RECORD gates/control-audit.js READS [#544, item (9); the first `trial:<md5>` record written in
// this project, and the form was added in the same run for it]. The control is the SMALLER of the two trial
// bundles described at the WANT block above: chess.jsx's edge-path board multiplied by 0.9, built with
// gates/build.sh + CT_OUT, run with CT_APP. The control is re-run against the COMMITTED gate rather than the
// working tree, so the sha below names the exact L.say lines it exercised.
// RE-RUN AT #544 ITEM (24b), AND THE REASON IS WORTH THE LINE. That item added fourteen assertions to this file
// for the lesson driver's Try-again state, which took it from 64 L.say sites to 79 - and gates/control-audit.js
// then reported the record below as PARTIAL ('every line each one ran is still here, but the gate has grown
// 20 -> 27 L.say sites since - the newer assertions are unshown'), which moved this gate out of COVERED and
// took that tool's `uncovered` count back up by one. A control record describes a SET OF LINES, so growing the
// gate expires it; the remedy is to re-run the control, not to edit the numbers. Done: the same recipe rebuilt
// and re-run against commit 64349de, at 72 pass / 7 fail over 79 assertions.
// THE RECIPE'S md5 CHANGED AND THE RECIPE DID NOT, which is this project's own #450 note rather than a new
// finding: gates/build.sh embeds the build MINUTE in the stamp via --define:__BUILD__, so the same patched
// source gives a different bundle md5 on every rebuild. The first run of this control measured
// trial:8d809ba235f7 at 57 pass / 7 fail over 64 assertions; this one measures trial:c086633a6d2c at 72 pass /
// 7 fail over 79. SAME SEVEN REDS, named in the log both times - the six geometry/state pairs of the WANT
// assertion plus the kunal demo-end pin - so the fourteen new assertions are all green on the broken bundle
// and the control still crosses exactly the threshold it crossed before. chess.jsx and app.js were md5-verified
// restored after the build (1b41d1d1e765 and 049b41dfb6f1, unchanged).
// WHY THE RECORD LINE BELOW STILL NAMES 055192b AND total=64, AND NOT THIS RE-RUN. MEASURED, by writing the
// new line and running the tool: gates/control-audit.js:202 bounds a record's `total` by `now`, and `now` is
// the gate's assertion count IN THE NEWEST ARCHIVED SUITE LOG that gates/verify-log.sh accepts - today
// claude/agents/gatelogs/540-all.log, where this gate ran 64. A record saying total=79 is therefore rejected
// as a BAD-RECORD ('scoped total=79 is not inside 1..64') and the tool's badrecord count rises, which is a
// WORSE reading than the PARTIAL it replaced. SO A CONTROL RECORD FOR A GATE THAT HAS JUST GROWN CANNOT BE
// WRITTEN UNTIL A SUITE LOG FOR THE NEW TREE EXISTS - it always lags the growth by one build - and this run
// cannot close that gap, because the only commit after its suite is the close-out and editing a gate file
// after the suite has read it makes the pushed gate differ from the gated one [#461, and #522's own refusal of
// exactly this 'behaviourally inert' comment edit]. The honest end state is PARTIAL with the measurement
// written beside it: the control covered 64 of the 79 assertions this file now runs, the other 15 are the
// Try-again block and item (21)'s font-pin line, and every one of them is GREEN on the broken bundle because
// none of them is about board width. The next run that archives a suite log over this tree can write the
// record for it as `<that sha> <date> total=79 red=7 scope=trial:c086633a6d2c`, with no new measurement
// needed - and the token that would normally open that line is deliberately NOT written here, because
// control-audit.js counts any comment carrying it WITH ITS COLON as a claim and read this very sentence as
// an UNPARSABLE record, taking that ratchet field from 0 to 1 against main. The tool's own comment says the
// colon is what makes a line a claim; a prose mention of the form must therefore omit it.
// Filed as its own finding on the job rather than left in this comment alone.
// CONTROL-RECORD: 055192b 2026-10-28 total=64 red=7 scope=trial:8d809ba235f7 how=the edge-path board x0.9, so every lesson board is ~10% small

  // ── TC-R64e THE CARD ORDINAL IS SCOPED TO THE STATE CARDS, DRIVEN IN BOTH DIRECTIONS IN ONE BROWSER STATE
  // [#544 item (35); jobs/b-card-ordinal-is-ambiguous-now-that-the-gallery-has-two-lists-numbering-from-1-
  // 2026-10-01, P1, filed by antagonist A of #451 before that build's push].
  // THIS GATE IS THE CONSUMER AT RISK: b.card(3) and b.card(4) at the top of this file are two of the three
  // numeric call sites in the suite, and the defect is that the ask queue reaching three cards silently steals
  // the ordinal. So the control lives here rather than beside the selector.
  // IT IS AN INJECTION AND NOT A SECOND BUNDLE, deliberately: the input that triggers the collision is the
  // LENGTH OF KUNAL'S ASK QUEUE, which is tracker data and not code, so no bundle can be built that has three
  // ask cards in it. Injecting a third into the open gallery is the only way to put the real input in front of
  // the real selector. The injected button carries data-ct="ask-card" and is appended to the ask list's own
  // parent, so it sits BEFORE the state cards in DOM order exactly as a real third ask would.
  // BOTH LOCATORS ARE RESOLVED AGAINST THE SAME DOM, which is what makes this a control rather than a claim:
  // the OLD unscoped form must hit the injected ask card (the defect, reproduced) and the NEW scoped form must
  // hit the k11 state card (the fix), from one page in one state with one injection.
  // AND THE DENOMINATOR IS ASSERTED FIRST [the non-empty-denominator rule]: if the injection did not land, or
  // if the ask list has no cards to append to, both locators resolve to the same button and the pair would
  // agree for a reason that has nothing to do with the scope.
  {
    const b=await L.launch({geo:'kunal',name:'lesson-cardnum'});await b.open();
    await b.home();
    const gb=b.page.locator('button[title="Preview gallery (dev)"]');
    await gb.waitFor({state:'visible',timeout:8000});await gb.click();await b.page.waitForTimeout(400);
    const pre=await b.page.evaluate(()=>({
      asks:document.querySelectorAll('button[data-ct="ask-card"]').length,
      states:document.querySelectorAll('button[data-ct="state-card"]').length,
      third:(()=>{const t=[...document.querySelectorAll('button[data-ct="state-card"]')]
        .map(x=>(x.innerText||'').split('\n')[0]).find(x=>/^3 · /.test(x));return t||null;})()}));
    L.say(pre.asks>=1&&pre.states>=4&&pre.third!==null,
      'TC-R64e DENOMINATOR: the gallery renders BOTH lists - '+pre.asks+' ask card(s) and '+pre.states+' state card(s) - and the state card numbered 3 exists, so an ordinal collision is constructible and distinguishable',pre);
    const inj=await b.page.evaluate(()=>{
      // INSERTED WHERE A REAL THIRD ASK WOULD GO, NOT APPENDED, and that correction is the control working.
      // The first draft used `askList.parentElement.appendChild(n)`; MEASURED, it put the button LAST, because
      // the ask cards and the state cards share one flex column in chess.jsx - so the unscoped locator's
      // `.first()` still found the state card and the negative control went RED on a tree where the defect is
      // perfectly real. A control that disturbs something genuine and leaves the measured value untouched
      // reads exactly like a gate that cannot fail [CLAUDE.md, #416]. The injected card goes immediately
      // after the LAST ask card, which is where the queue's third entry renders.
      const asks=[...document.querySelectorAll('button[data-ct="ask-card"]')];
      const last=asks[asks.length-1];
      if(!last||!last.parentElement)return {ok:false};
      const n=document.createElement('button');
      n.setAttribute('data-ct','ask-card');
      n.textContent='3 · FAKE · an injected third ask card, gate 11 item (35) control';
      last.parentElement.insertBefore(n,last.nextSibling);
      const all=[...document.querySelectorAll('button[data-ct="ask-card"],button[data-ct="state-card"]')];
      return {ok:true,asks:document.querySelectorAll('button[data-ct="ask-card"]').length,
              injectedIndex:all.indexOf(n),
              firstStateIndex:all.findIndex(x=>x.getAttribute('data-ct')==='state-card')};});
    L.say(inj.ok&&inj.asks===pre.asks+1&&inj.injectedIndex<inj.firstStateIndex,
      'TC-R64e the third ask card was INJECTED into the ask list AND SITS BEFORE THE FIRST STATE CARD in DOM order (index '+inj.injectedIndex+' against '+inj.firstStateIndex+'), so the queue now numbers to 3 the way it will when Kunal asks a third question - the two lists share one flex column, so position is the whole point',inj);
    const hit=async(sel)=>{const el=b.page.locator(sel).filter({hasText:/^3 · /}).first();
      const n=await el.count();if(n===0)return null;
      return await el.evaluate(x=>({ct:x.getAttribute('data-ct'),title:(x.innerText||'').split('\n')[0]}));};
    const unscoped=await hit('button'), scoped=await hit('button[data-ct="state-card"]');
    L.say(!!unscoped&&unscoped.ct==='ask-card',
      'TC-R64e NEGATIVE CONTROL: the OLD unscoped locator `button` + /^3 · / resolves to the ASK card - "'+(unscoped&&unscoped.title)+'" - which is the defect reproduced, so this pair is measuring the scope and not a selector that was never ambiguous',unscoped);
    L.say(!!scoped&&scoped.ct==='state-card'&&/^3 · /.test(scoped.title),
      'TC-R64e and the SCOPED locator used by b.card(N) resolves to the STATE card - "'+(scoped&&scoped.title)+'" - with a third ask card present, so the lesson gates keep reaching the k11 demo-end fixture',scoped);
    L.say(!!unscoped&&!!scoped&&unscoped.title!==scoped.title,
      'TC-R64e and the two resolutions are DIFFERENT buttons, so neither assertion above could have been satisfied by both locators finding the same thing',{unscoped:unscoped&&unscoped.title,scoped:scoped&&scoped.title});
    await b.close();
  }
},'LESSON');
