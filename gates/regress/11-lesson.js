// regress/11-lesson.js  (port of lesson371.js)  k11 / A-01 / Y-01 / Y-02: the lesson board is edge to edge at
// the same top in every phase. Card 3 = the King's Gambit demo at its END, card 4 = practice before the first
// move; then one correct practice move (1.e4) and the board must not change size or move.
'use strict';
const L=require('../lib');
const D=require('../drive/lesson');
L.run(async()=>{
  if(!process.env.CT_LS058_ONLY){
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'lesson-'+geo});await b.open();
    await b.card(3,2500);const demoEnd=await b.metrics();await b.shot('lesson-'+geo+'-demo-end');
    const note=await b.rect('[data-ct="lesson-note"]');
    L.say(!!demoEnd.board,geo+': demo end shows a board',demoEnd.board);
    if(L.GEOS[geo].w===375&&L.GEOS[geo].h===679&&demoEnd.board){ /* keyed on the geometry's DIMENSIONS, not its name [#545 item (4)]: a renamed key now throws here instead of silently skipping these pins */L.say(Math.abs(demoEnd.board.w-375)<0.6,'kunal: demo end board is 375 wide ('+demoEnd.board.w+')');L.say(Math.abs(demoEnd.board.top-92)<1,'kunal: demo end board top is 92 ('+demoEnd.board.top+')');}
    // THE OTHER GEOMETRY THIS LOOP RUNS IS PINNED TOO [#547, item (38); jobs/gate-11-pins-the-demo-end-board-only-at-one-geometry-
    // 2026-10-02]. At 390x844 the demo-end board was asserted to exist and nothing else, so it could move with this gate green.
    // Pinned from MEASUREMENT, not copied from 375/92: claude/agents/gatelogs/545-all.log and 546c-all.log both print the 390
    // demo-end board as w 390, top 92 (bundle 049b41dfb6f1). New lines, so the kunal lines and the a35524b record stand.
    if(L.GEOS[geo].w===390&&L.GEOS[geo].h===844&&demoEnd.board){L.say(Math.abs(demoEnd.board.w-390)<0.6,'390: demo end board is 390 wide, edge to edge ('+demoEnd.board.w+')');L.say(Math.abs(demoEnd.board.top-92)<1,'390: demo end board top is 92 ('+demoEnd.board.top+')');}
    L.say(!!note&&Math.abs(note.h-75)<1,geo+': note box is 75px',note&&note.h);
    L.say(demoEnd.over.over<=0,geo+': no scroll at the demo end',demoEnd.over);
    await b.card(4,2500);const prac=await b.metrics();await b.shot('lesson-'+geo+'-practice');
    L.say(!!prac.board&&!!demoEnd.board&&Math.abs(prac.board.w-demoEnd.board.w)<0.6&&Math.abs(prac.board.top-demoEnd.board.top)<0.6,geo+': practice board = demo board (w '+(prac.board&&prac.board.w)+' top '+(prac.board&&prac.board.top)+')');
    await b.move('e2','e4',1800);const after=await b.metrics();await b.shot('lesson-'+geo+'-practice-e4');
    L.say(!!after.board&&Math.abs(after.board.w-prac.board.w)<0.6&&Math.abs(after.board.top-prac.board.top)<0.6,geo+': board unchanged after one practice move (w '+(after.board&&after.board.w)+' top '+(after.board&&after.board.top)+')');
    L.say(after.over.over<=0,geo+': no scroll after the move',after.over);
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
  // #545 item (83): 375x730, then CLAUDE.md's figure for the device, was in NO block of this gate, so the #395 footer
  // fix he reported was asserted only at geometries that are not his. It is added here; the board-fit lines below
  // run there too. R19 has since settled 375x761 as his phone [#549 item (23)]: this column is the superseded one.
  for(const [name,g] of [['320x568',{w:320,h:568,safe:''}],['360x640',{w:360,h:640,safe:''}],['375x667',{w:375,h:667,safe:''}],['375x730',L.GEOS.kunal730]]){
    const W73={}; // TC-R73 [#547 item (59)]: the board width in each of the two states, for the transition assertion below
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
                board:gr?{w:Math.round(gr.width*10)/10,x:Math.round(gr.left*10)/10,top:Math.round(gr.top*10)/10}:null};
      });
      const tag=name+' '+st;
      W73[st]=m.board?m.board.w:null;
      // TC-LS-046 [#548 item (86); jobs/gate-11-and-26-practice-pins-are-insensitive-to-the-430-defect-2026-09-30, the job's
      // cheaper fix]: assert the MOVES header row's HEIGHT directly - one line, 23px measured at #548 at 320x568 and 375x730 -
      // rather than inferring the wrap from the board width, which has 24px of slack and stayed green against the pre-#430 label.
      // The row is found as the grandparent of the Copy chip (moves-copy is the chip's own hook from #430, not this build's).
      if(st==='practice-m0'){
        const mh=await b.page.evaluate(()=>{const c=document.querySelector('[data-ct="moves-copy"]');const r=c&&c.parentElement&&c.parentElement.parentElement;
          if(!r)return null;const q=r.getBoundingClientRect();return {h:Math.round(q.height*10)/10,w:Math.round(q.width),text:(r.innerText||'').replace(/\s+/g,' ').trim()};});
        L.say(!!mh&&/^MOVES\b/.test(mh.text),tag+': TC-LS-046 PRECONDITION the MOVES header row was found by the Copy chip and reads MOVES',mh);
        L.say(!!mh&&mh.h<=30,tag+': TC-LS-046 the MOVES header row is ONE line ('+(mh&&mh.h)+'px, ceiling 30; two lines measure 46+) - the wrap #430 removed, asserted at its own height',mh);
      }
      L.say(!!m.board,tag+': the lesson board is on screen',m.board);
      // THIS ONE DOES NOT DISCRIMINATE, and it is kept only because it is true and explains the shape.
      // Proved: against a bundle with the board shrunk to 90% it still passes, because the MOVES panel carries
      // flex:'1 1 auto' and stretches to absorb whatever the board gives up, so the column fills the viewport
      // either way. Recorded rather than quietly relied on - it looks like the assertion that matters and is not.
      L.say(Math.abs(m.bottom-m.vh)<2,tag+': the column fills the viewport (bottom '+m.bottom+' of '+m.vh+'). NOTE: this cannot fail while the MOVES panel flexes, so it explains the shape rather than guarding it.',{bottom:m.bottom,vh:m.vh});
      // THIS is the assertion that guards the board. Same fix 10-gameover and A-12 needed: a size compared only
      // to itself, or to an invariant that always holds, cannot see the board get smaller. Measured on #382.
      const WANT={'320x568 demo-end':270.9,'320x568 practice-m0':270.9/* #547 item (124): the practice-only progress strip no longer takes layout, so practice equals the demo end at every geometry (was 254.9; #430 was 230.9) */,'360x640 demo-end':342.4,'360x640 practice-m0':342.4/* #547 (124): was 326.4 */,'375x667 demo-end':375,'375x667 practice-m0':375/* #547 (124): was 352.2 */,'375x730 demo-end':375,'375x730 practice-m0':375/* #548 item (8): the 730 column (R19 settled 761), measured 375 in both states on c7f6a1228e43 and in 547d-all.log; width-bound, so one value */};
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
      /* #548, item (8); jobs/gate-11-pins-the-demo-end-board-only-at-one-geometry-2026-10-02: THE TOP IS PINNED AT ALL FOUR
         SWEEP GEOMETRIES, not only at kunal and 390. Measured on main's own bundle c7f6a1228e43 at #548: the board's top is 92.0
         in both states at 320x568, 360x640, 375x667 and 375x730 - the same 92 the kunal and 390 lines pin. A board that moves
         down (a row grew above it) or up (the header lost height) is red here at every geometry this block runs. */
      L.say(!!m.board&&Math.abs(m.board.top-92)<1,tag+': TC-R73b the lesson board top is 92 ('+(m.board&&m.board.top)+')',m.board);
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
                  fs:parseFloat(getComputedStyle(e).fontSize),gw,gh,svg:!!svg};
        }).filter(Boolean);
      });
      const GLYPH_PIN_ALL={'Back a move':27,'Forward a move':27,'Play or pause':24,'Close lesson':24,'More for this lesson':24}; // the practice block's copy of GLYPH_PIN below [#549 item (54)]; text pin 22 -> 24 at #549 item (80), see GLYPH_PIN
      if(st==='demo-end'){
        L.say(foot.length===5,name+': the lesson footer shows its five buttons (precondition - without this the size checks below pass by measuring nothing)',foot.map(f=>f.aria));
        L.say(foot.every(f=>f.h>=44&&f.h<=46),name+': every footer button is still 44 to 46 tall - the fix had to go INSIDE the box, because this row is fixed and any growth here is board height spent',foot.map(f=>f.h));
        // ONE READING, NOT THREE [#547, item (21); jobs/rotating-audit-433-two-assertions-that-cannot-discriminate-2026-09-29]: the glyph
        // heights (27/22/27/22/22) and widths are byte-identical at 320, 360 and 375 - the glyphs do not scale with width - so the geometries
        // below contribute one measurement of these two floors, not one each. What the sweep adds is the board-fit lines; an accessibility font
        // scale or a width where the 5x44 row must compress is the untested half. Comment only, so the a35524b record's L.say set is unchanged.
        L.say(foot.every(f=>f.gh>=20),name+': every footer GLYPH is at least 20px tall. The boxes were always big enough; the ink was not, and that is what he reported',foot.map(f=>({a:f.aria,gh:f.gh})));
        L.say(foot.every(f=>f.gw>=16),name+': and at least 16px wide',foot.map(f=>({a:f.aria,gw:f.gw})));
        L.note(name+': FOOTER GLYPHS '+JSON.stringify(foot.map(f=>({a:f.aria,gh:f.gh,gw:f.gw,svg:f.svg,fs:f.fs}))));
        const sizes=[...new Set(foot.map(f=>f.fs))];
        // [R18, #545 item (83); jobs/gate-11-asserts-consistency-on-fontsize-while-two-of-the-five-glyphs-are-svg-props-2026-09-30]
        // This line claimed "consistent is a fact" from fontSize, and two of the five glyphs are ChevIcon SVGs sized by a PROP
        // (size={27}) that fontSize cannot see: size={10} left it green. It now claims only what fontSize governs, the three
        // TEXT glyphs, and the band below holds all five glyphs at their measured heights.
        const tsizes=[...new Set(foot.filter(f=>!f.svg).map(f=>f.fs))];
        L.say(tsizes.length===1&&foot.filter(f=>!f.svg).length===3,name+': the three TEXT glyphs carry ONE font size (the play button shipped at 13px because it used to carry the word "Pause" - #347). fontSize does not size the two SVG chevrons; the band below does',{textSizes:tsizes,svgCount:foot.filter(f=>f.svg).length});
        // THE GLYPH BAND, two-sided as #395 needs: a floor cannot see a glyph GROW, and growth here costs board height.
        // Pinned to the heights measured at #545 on 049b41dfb6f1 at all four geometries: chevron SVG box 27, text line box 22.
        // NOTE the 27 is the SVG BOX, which is what the size prop sets; the polyline INK inside it is 16.2 (gate 26's lesson
        // footer pin), so this band holds the PROP and gate 26 reports the ink spread. +-1.5px.
        // PIN MOVED WITH A FIX [#549 item (80), jobs/lesson-footer-icons-consistent]: the text glyphs now come from FootBtn, the component the
        // Review transport row uses - 21px in the Segoe/system-ui stack where they were 20-20.25px in the inherited stack - so the text line
        // box measured 22 on 2c323ead88f0 and 24 on the fixed trial 0a7612ca7dc3 at all four geometries. The chevrons are unchanged at 27.
        const GLYPH_PIN={'Back a move':27,'Forward a move':27,'Play or pause':24,'Close lesson':24,'More for this lesson':24};
        const offBand=foot.filter(f=>!(Math.abs(f.gh-(GLYPH_PIN[f.aria]??-99))<=1.5)).map(f=>({a:f.aria,gh:f.gh,pin:GLYPH_PIN[f.aria]}));
        L.say(offBand.length===0,name+': every footer glyph is within 1.5px of its pinned height (chevrons 27, text 24) - a band, so a chevron shrunk to size={10} or grown past the row is red',offBand.length?offBand:foot.map(f=>({a:f.aria,gh:f.gh})));
        // ROTATION AUDIT [#549 item (54)]: this line DISCRIMINATES (slack 11px wide, 11px tall at the 44px box), but its HEIGHT
        // half is now dominated by the band above (27+1.5 and 22+1.5 both sit under 44-6), so what it adds is the WIDTH ceiling.
        L.say(foot.every(f=>f.gw<=f.w-6&&f.gh<=f.h-6),name+': and no glyph fills its box edge to edge - raising the ink must not make the button look like a solid block',foot.map(f=>({a:f.aria,gw:f.gw,w:f.w})));
      }
      // THE PRACTICE-PHASE FOOTER [#549 item (54); jobs/gate-11-asserts-consistency-on-fontsize-while-two-of-the-five-glyphs-are-svg-props-
      // 2026-09-30, twoMoreAssertionsWorthNoting]: every footer line above sits inside if(st==='demo-end'), so the footer a player sees
      // while PRACTISING was checked at no geometry. In practice chess.jsx hides the transport (learnPhase!=='practice'), leaving Close
      // and More, measured on 4a23e434e3bb at 320x568 and 375x761: both 44x44, glyph line box 22 tall, 16.8-20.3 wide. The same band
      // and pins as the demo end, so a practice-only change to either glyph is red here and invisible to every line above.
      if(st==='practice-m0'){
        const pa=foot.map(f=>f.aria).sort().join('|');
        L.say(pa==='Close lesson|More for this lesson',name+': PRACTICE footer PRECONDITION shows exactly Close and More, the transport hidden - so practice was reached and the lines below measure two glyphs, not none',foot.map(f=>f.aria));
        L.say(foot.length>0&&foot.every(f=>f.h>=44&&f.h<=46),name+': PRACTICE every footer button is 44 to 46 tall',foot.map(f=>f.h));
        const offP=foot.filter(f=>!(Math.abs(f.gh-(GLYPH_PIN_ALL[f.aria]??-99))<=1.5)).map(f=>({a:f.aria,gh:f.gh,pin:GLYPH_PIN_ALL[f.aria]}));
        L.say(foot.length>0&&offP.length===0,name+': PRACTICE every footer glyph is within 1.5px of its pinned height (24, the demo end\'s text pin) - a band, so a practice-only glyph grown or shrunk is red',offP.length?offP:foot.map(f=>({a:f.aria,gh:f.gh})));
        L.say(foot.length>0&&foot.every(f=>f.gw>=16&&f.gw<=f.w-6),name+': PRACTICE every footer glyph is 16px wide or more and does not fill its box edge to edge',foot.map(f=>({a:f.aria,gw:f.gw,w:f.w})));
      }
      await b.shot('lesson-'+name+'-'+st);
      await b.close();
    }
    // TC-R73 [#547 item (59); jobs/action-row-fix-widens-the-lesson-board-jump-2026-09-28]: tapping into practice from a finished
    // demo must not shrink the board by MORE than the #428 baseline of 40.00px (main bundle md5 4d4bb99dd44f at 320x568; the job
    // measured #428's action-row fix taking it to 56). The TARGET IS ZERO and this pin is a ceiling that must only fall - it is
    // not a value to hold. Two denominators first, as their own lines, so a missing board is never read as a zero jump.
    L.say(W73['demo-end']!=null&&W73['practice-m0']!=null,name+': TC-R73 DENOMINATOR the board was measured in both demo-end and practice-m0',W73);
    {const jump=(W73['demo-end']!=null&&W73['practice-m0']!=null)?Math.round(Math.abs(W73['demo-end']-W73['practice-m0'])*10)/10:null;
     L.say(jump!=null&&jump<=40.0,name+': TC-R73 entering practice from the finished demo changes the board width by '+jump+'px - no more than the #428 baseline of 40px (the job measured 56 after #428; the target is 0, so this ceiling only falls)',{jump,demoEnd:W73['demo-end'],practice:W73['practice-m0']});}
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
  // #547 item (187) MOVED THE FIRST INPUT, AS THE PARAGRAPH ABOVE SAID A LAYOUT CHANGE WOULD HAVE TO. The practice label now
  // follows the row's budget (long at 96px or more), so at 375x568 (budget 98.8) it reads '↻ Try again' and T0b went red there
  // on this run's trial: the control had stopped controlling. Measured at #547: 375x552 reads '↻ Again' at a budget of 80.3
  // (board 236.3), the middle of the short-label window (73 to 96), so the old selector is again unable to match.
  // #547 item (124) MOVED IT AGAIN: the practice board no longer loses 16px to the progress strip, so 375x552 now has a 252.3
  // board, a budget of 96.3 and the long label - the control stopped controlling, as the paragraph above says it will. Measured:
  // 375x544 reads '↻ Again' at 247.0 (budget 91, near the edge), 375x536 at 233.8 (budget 77.8, inside 73..96). 375x536 it is.
  for(const tg of [{n:'375x536',g:{w:375,h:536,safe:''}},{n:'320x540',g:{w:320,h:540,safe:''}}]){
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
      L.say(/Not the book move|isn.t the line|The book move is|Try again\./ /* #550 HEX-T-12: the wrong-move line now gives a reason and ends "Try again." */.test(nw||''),'TC-R64c T1 '+tg.n+' the wrong-move line IS PRESENT before anything claims it was cleared [#385]',{note:nw});
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
      L.say(threw===null&&/Your move/.test(n1||'')&&!/Not the book move|isn.t the line|The book move is|Try again\./ /* #550 HEX-T-12: the wrong-move line now gives a reason and ends "Try again." */.test(n1||''),'TC-R64c T3 '+tg.n+' and the wrong-move line is CLEARED: the note is back to the move-0 prompt',{note:n1});
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
// CONTROL-RECORD: e753b08 2026-11-11 total=240 red=4 scope=trial:1bcc54084c94 how=#550 item (9): the lesson footer's Copy label lengthened to 'Copy every move of this game' (a label that wraps the row, the job's proposed control for the post-#430 tree) - TC-LS-046's four lines red; six later lines of the same visit not reached (234 of 240 ran), every line that ran otherwise green
// CONTROL-RECORD: 055192b 2026-10-28 total=64 red=7 scope=trial:8d809ba235f7 how=the edge-path board x0.9, so every lesson board is ~10% small
// CONTROL-RECORD: 44bf4b3 2026-10-29 total=84 red=7 scope=trial:3fb73f240fd0 how=the edge-path board x0.9 again, re-run on the grown 84-assertion gate so the record covers items (24) and (24b) of #544 [#545 item (2)]
// CONTROL-RECORD: 777aa06 2026-10-29 total=84 red=7 scope=trial:3fb73f240fd0 how=the same x0.9 trial re-run after #545 item (4) rewrote the kunal demo-end line, whose L.say sites moved the 44bf4b3 record to ASSERTIONS-MOVED
// CONTROL-RECORD: a35524b 2026-10-30 total=102 red=7 scope=trial:dfb25d27c4b4 how=the same edge-path board x0.9, REBUILT at #546 because #545's trial bundle did not survive its container, and re-run on the 102-assertion gate whose L.say set moved the 777aa06 record: red at kunal demo-end and at all six bistable-pin cells [#546 item (89)]
// CONTROL-RECORD: d13c07d 2026-11-06 total=146 red=4 scope=trial:35c22e00ca63 how=Close lesson fontSize 30px in PRACTICE only: the four PRACTICE glyph-band lines red at 320x568, 360x640, 375x667 and 375x730; the pre-change gate read 130/0 on the same bundle [#549 item (54)]
// CONTROL-RECORD: e129a5c 2026-11-06 total=164 red=16 scope=trial:2c323ead88f0 how=the pre-fix #549 HEAD bundle (before item 80): all 8 TC-LS-051 glyph-size and shape lines red at 375x761 and 320x568, plus the 8 text-glyph band lines whose pin moved 22->24 with the fix
// CONTROL-RECORD: e129a5c 2026-11-06 total=164 red=12 scope=trial:a76671da6f71 how=FootBtn's floor cut to 40px (minHeight/minWidth 40, height 40): all 4 TC-LS-051 tap-target lines red at 375x761 and 320x568
// CONTROL-RECORD: c8308a4 2026-11-06 total=170 red=3 scope=trial:9b2d05899a1c how=the pre-fix chess.jsx (HEAD 92e8f51, no lesson resume) - TC-LS-053's three case lines red at kunal761, both re-opens read 'Press Play to watch' with the demo footer [#549 item (107)]
// CONTROL-RECORD: da53b65 2026-11-06 total=174 red=2 scope=trial:7d815ea63d6b how=mutant: setGame dropped from the lesson resume (note, phase and footer restored, board not); red: exactly the two TC-LS-053 placement lines. The fix trial 64d46d055bd5 reads 174 PASS 0 FAIL.
// CONTROL-RECORD: f913b91 2026-11-07 total=240 red=10 scope=trial:51f45de88555 how=the lesson-name line capped at maxWidth 120 - TC-R152b red alone at all five geometries x two states (job 100)
// CONTROL-RECORD: f913b91 2026-11-07 total=240 red=32 scope=trial:fd5fade99686 how=the pre-fix run-tree bundle (name in the footer, sheet buttons nowrap, Home 18-char cut) - TC-R152a/b/c red x30 and TC-R152e x2; TC-R152d measured red separately at 320 after its widest-name fix (job 100)
// CONTROL-RECORD: b443dd8 2026-11-11 total=244 red=4 scope=trial:04ac78bee28c how=#550 round 3: FOOT_ICON_GLYPH back to the lesson's old clamp(20px,5.4vw,24px) - the four TC-LS-051 glyph-size lines red (demo-end and practice-m0 at 375x761 and 320x568), the shape and tap-target lines green

  // ── TC-LS-051 (US-LS-11) [#549 item (80); jobs/lesson-footer-icons-consistent, Kunal 2026-09-14 "consistent with Review"]:
  // THE LESSON FOOTER (demo AND practice) AND THE REVIEW TRANSPORT ROW ARE ONE COMPONENT. Measured on the pre-fix bundle
  // 2c323ead88f0 (#549 HEAD before item 80): the lesson's text glyphs were 20.25px at 375 and 20px at 320 against Review's
  // 21px, radius 10 against 12, and every lesson button carried a 1px outline Review had dropped at item (68). Read from
  // the RENDERED computed style of both rows, never from a hook this build adds, so the pre-fix bundle is the control.
  // DENOMINATORS FIRST, as their own lines: Review's row must show its glyph controls and the lesson its five and two.
  for(const geo of ['kunal761','se']){
    const G=L.GEOS[geo],dim=G.w+'x'+G.h;
    const RV=require('../drive/review');
    const read=(sel)=>b=>b.page.evaluate((sel)=>{const vh=innerHeight;
      return [...document.querySelectorAll(sel)].map(e=>{const r=e.getBoundingClientRect();if(r.width<1||r.bottom<=0||r.top>=vh)return null;/* #550 item (2): was r.bottom<vh-160 - the Review row moved above the move line, so it is read wherever it is on screen */
        const st=getComputedStyle(e);const lab=e.getAttribute('aria-label')||'';
        const txt=(e.innerText||'').trim();
        return {a:lab,glyph:!e.querySelector('svg')&&txt.length>0&&txt.length<=2,fs:parseFloat(st.fontSize),rad:st.borderTopLeftRadius,
          bw:parseFloat(st.borderTopWidth)||0,mh:st.minHeight,ff:st.fontFamily,w:+r.width.toFixed(1),h:+r.height.toFixed(1)};}).filter(Boolean);},sel);
    let rv=null;{const b=await L.launch({geo,name:'ls051-review-'+geo,store:RV.SEED});await b.open();
      try{await RV.states['moves-ply10'](b);await b.settle(500);rv=await read('[data-ct="rev-row1"] > button')(b);}catch(e){rv=null;}
      await b.close();}
    /* #550 round-3 suite (386d5b5): since a21 the phone Review row is the streamlined TOOLBAR - Previous, Key move, Analyze, Next
       - drawn with SVG chevrons and a labelled star, so it carries NO text glyph any more and the old denominator (three text-glyph
       buttons) read 0 on a healthy bundle. The row is still the one Kunal compared the lesson footer to, so its SHAPE stays the
       reference (radius, outline, min-height, font family); the GLYPH SIZE is pinned to the size that row used to carry,
       FOOT_ICON_GLYPH = clamp(21px,5.4vw,26px), evaluated at this viewport - the lesson's old clamp(20px,5.4vw,24px) reads 20.25
       at 375 and still reddens. */
    const rg=(rv||[]).filter(k=>k.h>0);
    L.say(rg.length>=3,dim+': TC-LS-051 DENOMINATOR the Review transport row shows its controls at ply 10 ('+rg.map(k=>k.a).join(' | ')+')',rv);
    const FIG=Math.min(26,Math.max(21,0.054*G.w));
    for(const st of ['demo-end','practice-m0']){
      const b=await L.launch({geo,name:'ls051-lesson-'+geo+'-'+st,store:{}});await b.open();
      let lf=null;try{await D.states[st](b);await b.settle(600);lf=await read('button[aria-label]')(b);}catch(e){lf=null;}
      await b.close();
      lf=(lf||[]).filter(k=>/^(Back a move|Forward a move|Play or pause|Close lesson|More for this lesson)$/.test(k.a));
      const want=st==='demo-end'?5:2;
      if(!L.say(lf.length===want,dim+' '+st+': TC-LS-051 DENOMINATOR the lesson footer shows its '+want+' buttons',lf.map(k=>k.a)))continue;
      if(!rg.length)continue;
      const R=rg[0];
      const lg=lf.filter(k=>k.glyph);
      const offFs=lg.filter(k=>Math.abs(k.fs-FIG)>0.01).map(k=>({a:k.a,fs:k.fs}));
      L.say(lg.length>0&&offFs.length===0,dim+' '+st+': TC-LS-051 every lesson footer TEXT glyph carries the footer glyph size ('+FIG+'px; lesson '+lg.map(k=>k.fs).join('/')+')',offFs);
      const offShape=lf.filter(k=>k.rad!==R.rad||k.bw>0.01||k.mh!==R.mh||k.ff!==R.ff).map(k=>({a:k.a,rad:k.rad,bw:k.bw,mh:k.mh}));
      L.say(offShape.length===0,dim+' '+st+': TC-LS-051 every lesson footer button has the Review button SHAPE - radius '+R.rad+', no outline, min-height '+R.mh+', one font family',offShape);
      const small=lf.concat(rv).filter(k=>k.h<43.99||(k.w<43.99&&k.glyph));
      L.say(small.length===0,dim+' '+st+': TC-LS-051 every footer icon tap target on both rows is at least 44 tall and every glyph button at least 44 wide',small);
    }
  }

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
  // ── TC-R152e [#549 item (100); Amber: flags/amber-549-home-continue-full-name]: HOME'S DAILY 3 CARD NAMES THE LESSON TO CONTINUE
  // IN FULL. It printed 'Continue: ' + the first 18 characters (since #314), so the longest real name read 'Continue: Albin
  // Counter-Gamb' - cut mid-word with no ellipsis, the silent half of this job's class. Seeded with the LONGEST real name (by
  // characters, as the cut was by characters) as the last lesson; the label must carry every character and paint inside its box.
  for(const geo of ['se','kunal761']){
    const G=L.GEOS[geo],dim=G.w+'x'+G.h;
    const b=await L.launch({geo,name:'r152e-'+geo,store:{}});await b.open();
    const pick=await b.page.evaluate(()=>{const C=window.CTLESSONS||{};const all=[];for(const k of Object.keys(C))for(const o of (C[k]||[]))all.push(o.name);
      const nm=all.slice().sort((a,c)=>c.length-a.length)[0];return {nm,i:all.indexOf(nm),n:all.length};});
    await b.page.evaluate((i)=>{localStorage.setItem('ct_lastlesson',String(i));},pick.i);await b.open();await b.settle(900);
    const r=await b.page.evaluate(()=>{const s=[...document.querySelectorAll('span')].find(x=>/^Continue: /.test(x.textContent)&&x.children.length===0);if(!s)return null;
      const q=s.getBoundingClientRect();const rg=document.createRange();rg.selectNodeContents(s);const rs=[...rg.getClientRects()].filter(x=>x.width>0);
      let clip=null;for(let a=s.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflowX!=='visible'){clip=a.getBoundingClientRect();break;}}
      const R0=Math.max(...rs.map(x=>x.right));return {t:s.textContent,sw:s.scrollWidth,cw:s.clientWidth,inkR:+(R0-q.right).toFixed(1),clipR:clip?+(R0-clip.right).toFixed(1):null,vw:innerWidth,right:+R0.toFixed(1)};});
    L.say(pick.n>=100&&pick.i>=0,'TC-R152e '+dim+' DENOMINATOR the last lesson is the longest real name in the library ("'+pick.nm+'", '+pick.nm.length+' characters, of '+pick.n+')',pick);
    L.say(!!r&&r.t==='Continue: '+pick.nm&&r.sw<=r.cw&&r.inkR<=0.5&&(r.clipR==null||r.clipR<=0.5)&&r.right<=r.vw,'TC-R152e '+dim+': Home\'s Daily 3 card names the lesson to continue IN FULL ("'+(r&&r.t)+'") and paints all of it on screen',r);
    L.say(b.errs.length===0,'TC-R152e '+dim+': zero app errors',b.errs.slice(0,2));
    await b.close();
  }
  // ── TC-LS-053 (US-LS-12) [#549 item (107); jobs/auditor-424-p2-findings-2026-09-27, p2_lessonLosesItsPlace; Amber:
  // flags/amber-549-lesson-resume]. A LESSON LEFT MID-PRACTICE COMES BACK WHERE IT WAS LEFT. The auditor measured: Italian Game ->
  // practice -> 1.e4 -> X -> the SAME row, and the note read '▶ Press Play to watch' with the transport back, i.e. the demo at ply 0
  // and the practice gone; the same through Home and Discover. Driven the long way (gates/drive/lesson.js), at his phone's geometry.
  {const b=await L.launch({geo:'kunal761',name:'lesson-resume'});await b.open();
   // A6-R4 [antagonist A round 4]: the note and the footer are not the POSITION. A build that restored them but not the game (or skipped
   // the book reply) read green, so the painted board's placement is compared too - per square, a hash of each piece image's full source (data URIs share their tails) and the glyph text.
   const place=()=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
     let best=null,bw=0;for(const e of els){const w=e.getBoundingClientRect().width;if(w>bw){bw=w;best=e;}}if(!best)return null;
     const sq=[...best.children].slice(0,64).map(c=>[...c.querySelectorAll('img')].map(i=>{const u=i.getAttribute('src')||'';let h=0;for(let k=0;k<u.length;k++)h=(h*31+u.charCodeAt(k))|0;return u.length+':'+h;}).join('+')+'/'+(c.innerText||'').replace(/[a-h1-8\s]/g,''));
     return {sq:sq.join(','),n:sq.length,pieces:sq.filter(x=>x!=='/').length};});
   const foot=()=>b.page.evaluate(()=>[...document.querySelectorAll('button[aria-label]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>1&&r.bottom>innerHeight-80;}).map(e=>e.getAttribute('aria-label')).filter(a=>/^(Back a move|Forward a move|Play or pause|Close lesson|More for this lesson)$/.test(a)).sort().join('|'));
   let ok=true;try{await D.states['practice-correct'](b);await b.settle(700);}catch(e){ok=false;}
   const n0=(await D.noteText(b))||'';const f0=await foot();const p0=await place();
   L.say(!!p0&&p0.n===64&&p0.pieces>=30,'TC-LS-053 PRECONDITION the placement read sees a board of 64 squares with the pieces on it ('+(p0?p0.pieces:'no board')+' occupied), so equality below compares a real position',p0&&{n:p0.n,pieces:p0.pieces});
   if(L.say(ok&&/e4/.test(n0)&&/correct/.test(n0)&&f0==='Close lesson|More for this lesson','TC-LS-053 PRECONDITION practice reached and 1.e4 accepted: the note reads the correct-move line and the footer is the practice footer',{n0:n0.slice(0,80),f0})){
    let r1=true;try{await D.tapBtn(b,/^Close lesson$/,600);await D.openRow(b,0);await b.settle(700);}catch(e){r1=String((e&&e.message)||e).slice(0,100);}
    const n1=(await D.noteText(b))||'';const f1=await foot();
    L.say(r1===true&&n1===n0&&!/Press Play/.test(n1),'TC-LS-053 closed with X and re-opened from the SAME row: the note is the one it was left on, not the demo at ply 0',{r1,n0:n0.slice(0,80),n1:n1.slice(0,80)});
    L.say(f1==='Close lesson|More for this lesson','TC-LS-053 and it is still PRACTICE: the footer is Close and More only, the demo transport is not back',{f1});
    const p1=await place();
    L.say(!!p0&&!!p1&&p1.sq===p0.sq,'TC-LS-053 and the BOARD is the one it was left on: the placement after X and the same row equals the placement read before the close (1.e4 and the book reply on it)',{same:!!p0&&!!p1&&p1.sq===p0.sq,before:p0&&p0.pieces,after:p1&&p1.pieces});
    // Home is reached through lib's b.home(), which taps the bottom bar's Home button when the screen behind the lesson shows one and
    // FALLS BACK TO b.open() (a reload, a cold start) when it finds none [A6-R4: this comment used to say "the tab bar's Home" as if
    // that were the route; it is the first route b.home() tries, not a promise]. So the two things that make this the warm Home route
    // are ASSERTED, not assumed: Home is on screen after b.home() (b.onHome()), and a page marker proves no reload happened.
    await b.page.evaluate(()=>{window.__ctResumeMark=1;});
    let r2=true,onH=false;try{if(await D.hasBtn(b,/^Got it/))await D.tapBtn(b,/^Got it/,300);/* a lesson that re-opened at its demo raises the intro card over X */await D.tapBtn(b,/^Close lesson$/,600);
      await b.home();await b.settle(300);onH=await b.onHome();await D.openLesson(b,'Openings',0);await b.settle(700);}catch(e){r2=String((e&&e.message)||e).slice(0,100);}
    const n2=(await D.noteText(b))||'';const f2=await foot();const p2=await place();const mk=await b.page.evaluate(()=>window.__ctResumeMark===1);
    L.say(r2===true&&mk,'TC-LS-053 PRECONDITION the Home route was driven without a page reload (the marker survived)',{r2,mk});
    L.say(onH===true,'TC-LS-053 PRECONDITION Home was ON SCREEN between the close and the re-open (b.onHome() after b.home()), so the route is X -> Home -> Discover and not a jump from the lesson list',{onH});
    L.say(r2===true&&n2===n0&&f2==='Close lesson|More for this lesson','TC-LS-053 left to Home and re-reached through Discover -> Openings -> the same row: still practice, on the same note',{r2,n2:n2.slice(0,80),f2});
    L.say(!!p0&&!!p2&&p2.sq===p0.sq,'TC-LS-053 and through Home the BOARD is still the one it was left on (placement equal to the one read before the first close)',{same:!!p0&&!!p2&&p2.sq===p0.sq,before:p0&&p0.pieces,after:p2&&p2.pieces});
    await b.shot('lesson-resume-kunal761');}
   L.say(b.errs.length===0,'TC-LS-053 zero app errors through close and re-open',b.errs.slice(0,3));
   await b.close();}
  // ── TC-R152 (US-INV-04 clause 4c) [#549 item (100); jobs/labels-truncate-in-shared-rows-2026-09-24; Amber:
  // flags/amber-549-lesson-name-own-line]. THE LESSON NAME IS READABLE IN FULL, AT THE WIDTH OF THE LONGEST NAME THERE IS.
  // Before: the name sat in the lesson footer between Close and More, in a row of five fixed 44px controls, so it got the
  // remainder - 18px at 320 and 73px at 375x761 for "King's Gambit" (87px), and the longest real name, "Albin Counter-Gambit:
  // Lasker Trap", cut at every phone width (Kunal's "Two-Rook..." and "King & Pa...", 24 Sep). Now it has its own line at the
  // top of the moves panel ([data-ct="lesson-name"]). THE CONTENT SET IS THE INPUT, NOT THE FIXTURE'S NAME (the job's
  // theContentSetMatters): the width the line must offer is measured from EVERY name in window.CTLESSONS, set in the line's own
  // computed font, and the widest wins - a check on "King's Gambit" alone is green on the broken bundle at 390 and up. Two
  // states (the demo end and practice), because the footer carried the name in both. The pre-fix bundle is the control: it has
  // no such line, so a/b go red, and the footer still carries the name, so c goes red.
  for(const geo of ['se','short375','w360','kunal761','390']){
    const G=L.GEOS[geo],dim=G.w+'x'+G.h;
    for(const [st,card] of [['demo-end',3],['practice',4]]){
      const b=await L.launch({geo,name:'r152-'+geo+'-'+st});await b.open();
      await b.card(card,2500);await b.settle(600);
      const r=await b.page.evaluate(()=>{
        const names=[];const C=window.CTLESSONS||{};for(const k of Object.keys(C))for(const o of (C[k]||[]))if(o&&o.name)names.push(o.name);
        const ln=document.querySelector('[data-ct="lesson-name"]');
        const f=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='471');
        const footTexts=f?[...f.querySelectorAll('*')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>e.textContent.trim()):null;
        let need=null,widest=null,cw=null,sw=null,txt=null,vis=false;
        if(ln){const cs=getComputedStyle(ln);const pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight);
          const sp=document.createElement('span');Object.assign(sp.style,{position:'absolute',left:'-9999px',top:'0',whiteSpace:'nowrap',font:cs.font,letterSpacing:cs.letterSpacing,fontFeatureSettings:cs.fontFeatureSettings});document.body.appendChild(sp);
          for(const n of names){sp.textContent=n;const w=sp.getBoundingClientRect().width;if(need==null||w>need){need=w;widest=n;}}sp.remove();
          cw=ln.clientWidth-pad;sw=ln.scrollWidth;txt=ln.textContent;const rr=ln.getBoundingClientRect();vis=rr.width>0&&rr.height>0&&rr.top>=0&&rr.bottom<=innerHeight;}
        return {n:names.length,has:!!ln,txt,vis,cw,sw,clientW:ln?ln.clientWidth:null,need:need&&+need.toFixed(2),widest,footTexts,named:!!txt&&names.indexOf(txt)>=0};});
      L.say(r.n>=100,'TC-R152 '+dim+' '+st+' DENOMINATOR the content set is the real lesson library: window.CTLESSONS names '+r.n+' lessons, so the widest name below is drawn from all of them',{n:r.n});
      L.say(r.has&&r.vis&&r.named&&r.sw<=r.clientW,'TC-R152a '+dim+' '+st+': the lesson name has its own line ([data-ct="lesson-name"]) on screen, it names the open lesson, and it paints all of itself (scrollWidth '+r.sw+' <= clientWidth '+r.clientW+')',{txt:r.txt,vis:r.vis,sw:r.sw,cw:r.clientW});
      L.say(r.has&&r.cw!=null&&r.need!=null&&r.cw+0.5>=r.need,'TC-R152b '+dim+' '+st+': that line offers the width of the LONGEST real lesson name in its own font ("'+r.widest+'" needs '+r.need+'px, the line gives '+(r.cw!=null?r.cw.toFixed(2):'none')+'px), so no lesson in the library is cut',{need:r.need,widest:r.widest,cw:r.cw});
      L.say(Array.isArray(r.footTexts)&&!r.footTexts.some(t=>r.txt?t===r.txt:/\w{3,}/.test(t)&&!/^[←-⯿✕⋯\s]+$/.test(t)),'TC-R152c '+dim+' '+st+': the footer row of controls carries no lesson name any more - a variable-length label does not share a row with fixed controls',{footTexts:r.footTexts});
      if(st==='demo-end'){
        // TC-R152d: THE MORE SHEET'S PREVIOUS/NEXT LESSON BUTTONS carry lesson names too (lesson-sheet-nav), and they were
        // ellipsised at 140px (320) and 168px (375) against 209px for the longest name and its arrow. Each button is re-measured
        // holding the WIDEST real name, the way the line above is: the label wraps inside the button rather than being cut.
        await b.page.evaluate(()=>{const d=document.querySelector('[data-ct="rec-cap-done"]');if(d)d.click();const o=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).position==='fixed'&&getComputedStyle(d).zIndex==='472');if(o)o.click();});
        await b.settle(300);
        const opened=await b.page.evaluate(()=>{const m=document.querySelector('button[aria-label="More for this lesson"]');if(!m)return false;m.click();return true;});
        await b.settle(500);
        const nv=await b.page.evaluate(()=>{const nav=document.querySelector('[data-ct="lesson-sheet-nav"]');if(!nav)return null;
          // the widest real name IN THE BUTTONS' OWN FONT, measured here and not borrowed from the lesson-name line above, so this
          // reading does not depend on the line the build adds (#432) - a first draft borrowed it and read 'null' on the pre-fix bundle
          const names=[];const C=window.CTLESSONS||{};for(const k of Object.keys(C))for(const o of (C[k]||[]))if(o&&o.name)names.push(o.name);
          const b0=nav.querySelector('button');const cs0=b0?getComputedStyle(b0):null;let widest=null,ww=-1;
          if(cs0){const sp=document.createElement('span');Object.assign(sp.style,{position:'absolute',left:'-9999px',whiteSpace:'nowrap',font:cs0.font,letterSpacing:cs0.letterSpacing});document.body.appendChild(sp);
            for(const n of names){sp.textContent=n;const w=sp.getBoundingClientRect().width;if(w>ww){ww=w;widest=n;}}sp.remove();}
          if(!widest)return {n:0,out:[],widest:null};
          const full=(e)=>{const q=e.getBoundingClientRect();const rg=document.createRange();rg.selectNodeContents(e);const rs=[...rg.getClientRects()].filter(x=>x.width>0);
            const R0=Math.max(...rs.map(x=>x.right)),L0=Math.min(...rs.map(x=>x.left)),B0=Math.max(...rs.map(x=>x.bottom));
            return {t:e.textContent.slice(0,50),cw:e.clientWidth,sw:e.scrollWidth,sh:e.scrollHeight,ch:e.clientHeight,ok:e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight+0.5&&R0<=q.right+0.5&&L0>=q.left-0.5&&B0<=q.bottom+0.5};};
          const bs=[...nav.querySelectorAll('button')];const out=[];
          bs.forEach((x,i)=>{const keep=x.textContent;x.textContent=i===0?('\u2039 '+widest):(widest+' \u203A');out.push(full(x));x.textContent=keep;});
          return {n:bs.length,out,widest,needPx:+ww.toFixed(1)};});
        L.say(opened&&!!nv&&nv.n===2&&typeof nv.widest==='string'&&nv.widest.length>0,'TC-R152d '+dim+' PRECONDITION the More sheet opened from the footer and shows its two lesson buttons, and the widest real name was measured in their font ("'+(nv&&nv.widest)+'", '+(nv&&nv.needPx)+'px)',{opened,n:nv&&nv.n,widest:nv&&nv.widest,needPx:nv&&nv.needPx});
        L.say(!!nv&&nv.n===2&&nv.out.every(x=>x.ok),'TC-R152d '+dim+': each previous/next lesson button, holding the LONGEST real lesson name, paints all of it inside the button - the name wraps instead of being cut',nv&&nv.out);
      }
      L.say(b.errs.length===0,'TC-R152 '+dim+' '+st+': zero app errors',b.errs.slice(0,3));
      await b.close();
    }
  }
  }   // end of !CT_LS058_ONLY
  // TC-LS-058 THE NOTE BOX'S OVERFLOW COUNT, PRINTED AND PINNED OVER EVERY NOTE [#550 item (82); jobs/bench-lesson-the-method-sentence-is-
  // the-clipped-one-2026-09-28, its folded bench-lesson-note-fit-count-in-source-is-stale-and-nothing-asserts-it-2026-10-09]. The note box
  // (data-ct lesson-note) is a FIXED 75px with a 59px inner scroller, so the number of notes that do not fit is a property of the content and
  // the box together - and the source comment above the box carried "734 notes, 18 scroll" for a library that now holds 2262 notes (lesson
  // and variation, pickVariation renders both in the same box). Measured, not grepped: the box is PAINTED (drive/lesson demo-m1), its inner
  // scroller's own computed font, line-height and clientWidth (paddingRight 0, the not-overflowing width) and clientHeight are read, and every
  // non-empty note in window.CTLESSONS - lessons' notes and every vars[].notes - is laid out in a probe carrying those properties, with the
  // "N. san — " prefix the demo prepends. A note overflows when the probe is taller than the scroller's clientHeight. The DENOMINATOR (the
  // note count) is its own assertion; the count is PINNED per geometry at what this build measures, so a content edit or a box change that
  // clips more notes goes red and has to move the pin on purpose. CT_LS058_ONLY=1 runs this block alone.
  // CONTROL-RECORD: 8a852bd 2026-11-11 total=5 red=2 scope=env:CT_LS058_ONLY=1 how=#550 item (82): c82 (0ca1bcd2a0d3), the lesson-note box 60px tall instead of 75 (scroller 44) - both TC-LS-058 count lines red (195 and 315 notes against pins 67 and 119); the two DENOMINATORS and the font pin green
  {
    const PIN058={kunal761:{max:67},se:{max:119}};   // measured #550 on trial b195c3c10627: 67 and 119 of 2262
    for(const geo of Object.keys(PIN058)){
      const b=await L.launch({geo,name:'lesson-notefit-'+geo});await b.open();
      let ok=true;try{await D.states['demo-m1'](b);await b.settle(500);}catch(e){ok=false;L.say(false,'TC-LS-058 '+geo+' the lesson demo was reached (drive/lesson demo-m1)',String(e).slice(0,160));}
      if(ok){
        const m=await b.page.evaluate(()=>{const box=document.querySelector('[data-ct="lesson-note"]');const sc=box&&box.firstElementChild;if(!sc)return null;
          const cs=getComputedStyle(sc);const padR=parseFloat(cs.paddingRight)||0;const w=sc.clientWidth-padR;const h=sc.clientHeight;
          const pr=document.createElement('div');pr.style.cssText='position:absolute;left:-9999px;top:0;visibility:hidden;white-space:normal;word-wrap:break-word;overflow-wrap:break-word';
          for(const k of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','wordSpacing'])pr.style[k]=cs[k];pr.style.width=w+'px';document.body.appendChild(pr);
          const C=window.CTLESSONS||{};let n=0,over=0,lessons=0;const worst=[];
          const one=(name,line,notes)=>{(notes||[]).forEach((t,i)=>{if(!t)return;n++;const ply=i+1;const san=(line||[])[i]||'';
            pr.textContent=Math.ceil(ply/2)+(ply%2===1?'.':'…')+' '+san+' — '+t;const ph=pr.getBoundingClientRect().height;
            if(ph>h+0.5){over++;worst.push([Math.round(ph),name,ply]);}});};
          for(const k of Object.keys(C))for(const o of (C[k]||[])){lessons++;one(o.name,o.line,o.notes);for(const v of (o.vars||[]))one(o.name+' / '+v.name,v.line,v.notes);}
          pr.remove();worst.sort((a,c)=>c[0]-a[0]);
          return {w:+w.toFixed(1),h,font:cs.fontSize+' '+cs.lineHeight,lessons,n,over,worst:worst.slice(0,3)};});
        L.say(!!m&&m.lessons>=150&&m.n>=2000,'TC-LS-058 '+geo+' DENOMINATOR every note in the library was laid out: '+(m?m.n+' notes of '+m.lessons+' lessons':'none')+' in the painted box\'s own font and width',m&&{w:m.w,h:m.h,font:m.font});
        if(m)L.say(m.over<=PIN058[geo].max,'TC-LS-058 '+geo+' notes that do not fit the '+m.h+'px note scroller: '+m.over+' of '+m.n+' (pin '+PIN058[geo].max+'); the longest need '+m.worst.map(x=>x[0]+'px ('+x[1]+' ply '+x[2]+')').join(', '),m);
      }
      await b.close();
    }
  }
},'LESSON');
