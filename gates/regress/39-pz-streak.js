// regress/39-pz-streak.js  Z-04 (Kunal, choice "Streak"). THE ONLY GUARD ON THIS CHANGE.
// CONTROL-RECORD: 75f9025 2026-11-11 total=229 red=2 scope=trial:ae0f65399b7d how=#550 answer a10: the tree before the revealed-finish wording, whose line still reads 'not counted as solved' - R4c red at kunal730 and kunal761, everything else green; the a10 bundle 2f43024ddf91 reads 229 pass, 0 fail
// CONTROL-RECORD: 24f4294 2026-11-11 total=227 red=13 scope=trial:851f1d7f8d6e how=#550 item (23): the training card's pz-top given marginTop 40 when solved (the board pushed down on the first solve) - TC-PZ-SOLVED39 red at kunal761 and 320x568 with the board-top lines it moves; every other line green
// CONTROL-RECORD: 04419c4 2026-11-06 total=219 red=4 scope=trial:5f575748b380 how=the HEAD 4637b44 bundle, whose landscape rail held the hint only in puzMsg - TC-R86 'the hint is STILL in the header after the wrong move' and 'and still after a second wrong move' red at 730x375 and 844x390 [#549 item (46)]
//
// THE DEFECT. On a phone, a puzzle hint TAKES THE HEADER ROW - that was Y-03/Z-01, and it is the one row that
// costs the board nothing - and while it is up the counters step aside. But the verdict box below the goal card
// is RESERVED space: a fixed 30px on a phone (74 above 820 tall), held empty so that the verdict can appear
// later without moving the board. So while a hint was showing you had an empty bordered box on screen AND no
// streak readable anywhere, because the only place it was ever shown had just been taken by the hint.
//
// THE ANSWER was one word, "Streak", with no note. So the reserved box is filled with the readout the header
// gives up - the same text, not a new one, and never the hint repeated. The constraint stated with the question
// still binds and is why this is cheap: the box is ALREADY 46px-and-then-30px of reserved space, so whatever
// sits there must be replaceable by the wrong-move verdict instantly, without the board moving.
//
// WHAT IT PROVES, at his phone and at 320x568 and 390x844:
//   1. With a hint up, the box is no longer empty.
//   2. The board does not move when the hint appears - the whole reason the box is reserved rather than collapsed.
//   3. The box does NOT repeat the hint text. Filling it with the hint again was the option he was NOT offered.
//   4. A wrong move takes the same box back for the verdict, and the board STILL does not move. This is the half
//      that would break silently: a fill that changed the box's height would only show itself on the transition.
//   5. BOTH data branches, because a readout that only works on one is half-built:
//        - a live streak (seeded 4, the way the app persists it after four solves) reads "4 in a row"
//        - no streak yet reads the puzzle counter and rating, which is what the header shows in that case
//      Measured: "1 / 890 · 🔥 4 in a row" and "1 / 890 · rating 600".
//   6. The reserved height is unchanged by the fill: 30 at 375x730 and 320x568, 74 at 390x844. The 30-vs-74
//      split is chosen by viewport height (vp.h<820), so it is a branch the DEVICE picks and both are run.
//
// CONTROL-RECORD: 9b89943 2026-11-06 total=131 red=6 scope=trial:31bbe1d9345a how=HEAD's chess.jsx, the chip '<icon> <tier> · ✓ N' - the TC-PZ-CHIP naming line red in all six states (3 states x 375x761, 320x568), every other line green [#549 item (16)]
// NEGATIVE CONTROL: proved against a bundle with the pz-streak block deleted - the box goes back to empty and
// assertion 1 goes red at every geometry. See claude/agents/REGRESSION-LOG.md.
// CONTROL-RECORD: 5e332e7 2026-11-06 total=155 red=3 scope=trial:e824097dfb8e how=#549 item (37) control ncA: HEAD's chess.jsx (no data-ct on the rank-up layer) - TC-PZ-RANKUP hook line red at kunal761, kunal730 and se
// CONTROL-RECORD: 5e332e7 2026-11-06 total=155 red=6 scope=trial:8a52b0ceaa57 how=#549 item (37) control ncB: the rank-up Continue does nothing - TC-PZ-RANKUP layer-gone and verdict-on-top lines red at all three
// CONTROL-RECORD: 2e50b37 2026-11-06 total=221 red=2 scope=full how=#549 item (25) A3-R2 pre-fix bundle, run-branch HEAD 2bea40d (chip sticky inside the rail, over Show), trial md5 f1f932adbd41; red: TC-PZ-LAND2 'at rest the chip covers no control' at 730x375 (110/266) and 844x390 (289/418). Fixed trial 80ae56967728: 221/0.
'use strict';
const L=require('../lib');
// CONTROL-RECORD: ef3feab 2026-11-06 total=185 red=10 scope=trial:e824097dfb8e how=the tree before the #549 (16) veto fix (chip minWidth 0, shrinkable) - TC-PZ-CHIP's not-cut lines red for rankup-continue and rank1-train at kunal761 and kunal730 and rankup-continue at 390 [#549 item (16) veto fix]
// CONTROL-RECORD: c33e447 2026-11-11 total=232 red=3 scope=trial:a0832813a26e how=#550 AUD-L18: the tree before the header kept the tick alone (t74, '1 / 890 · ✓ solved') - the three AUD-L18 lines red at kunal761, kunal730 and 390
// CONTROL-RECORD: faa82a9 2026-11-13 total=232 red=6 scope=trial:480bcca1adc1 how=#550 job suite-never-asserts-after-a-success (whatIsLeft: TC-PZ-RANKUP's board-rect lines): the training card's pz-top pushed 40px further down from the moment the rank-up layer first shows, and kept there after Continue (a page-global latch) - the two TC-PZ-RANKUP board-rect lines red at kunal761, kunal730 and se (board top 222.5 -> 242.5 at kunal761; at se 116.5 -> 159 and 320 -> 280 wide), the layer-gone half and every other TC-PZ-RANKUP line green; the tip trial 342f7329901b reads 223/9 and the control 217/15, and the six added reds are exactly these (the tip's nine se reds are the a42 re-key's, not this control's)
const Z=require('../drive/puzzles');
const PZKEY='chesstrainer.progress.v1';

const box=(b)=>b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="pz-streak"]');
  if(!e)return null;
  const r=e.getBoundingClientRect();
  return {y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,t:(e.innerText||'').replace(/\s+/g,' ').trim()};
});
// #550 #432 sweep (lead): the fill also counted by its WORDS and shape - a box at least 60% of the screen wide whose own text is the
// counter it carries ('N / D · ' and then the streak, a solved tick or the rating) - so the three absence lines below do not read only
// the hook. The header's own puzzle counter carries the same 'N / D ·' but sits in a narrow span, so the width bound keeps it out.
const fillWords=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('div')].filter(x=>{const q=x.getBoundingClientRect();return q.width>=innerWidth*0.6&&q.height>0&&q.height<=80&&/^\d+ \/ \d+ \u00b7 .*(in a row|solved|rating)/.test((x.innerText||'').replace(/\s+/g,' ').trim());}).length);
const hintHead=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const tapBtn=async(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);const el=[...document.querySelectorAll('button')].filter(x=>r.test((x.innerText||'').trim()))[0];if(el){el.scrollIntoView({block:'center'});el.click();return true;}return false;},[re.source,re.flags]);

L.run(async()=>{
  for(const [geo,wantH] of [['kunal730',30],['se',30],['390',74]]){
    // ---- no streak yet: the fresh-store case, which is what a new user sees
    const b=await L.launch({geo,name:'pzstreak-'+geo,store:{}});await b.open();
    await Z.states['train'](b);await b.settle(400);
    const before=await b.metrics();
    const empty=await box(b);const emptyW=await fillWords(b);
    L.say(empty===null&&emptyW===0,geo+': with no hint up the streak fill is absent (by hook, and by its words: '+emptyW+') - it exists only in the branch where the box would otherwise be empty, so it never competes with a verdict',empty);

    await Z.states['train-hint'](b);await b.settle(500);
    const hh=await hintHead(b);
    L.say(!!hh&&/^\u{1F4A1}/u.test(hh),geo+': the hint really did take the header row, which is the state this whole item is about',hh&&hh.slice(0,50));
    const filled=await box(b);const afterHint=await b.metrics();
    const filledW=await fillWords(b);if(geo!=='se')L.say(!!filled&&filledW>=1,geo+': PRECONDITION with the hint up the fill is found by its words as well as its hook ('+filledW+') - so the word count can see it',filledW);
    // #550 a42 (1603f06): on a short upright phone (320x568 here) Puzzles keeps NO reserved verdict box - the notes are overlays over
    // the board - so there is no box for the streak to fill, BY DESIGN. That arm is therefore asserted the other way round: the box
    // and the fill are both ABSENT there (found by structure as well as by hook), and the fill lines below run at the other two only.
    const SHORT=geo==='se';
    if(SHORT){const resv=await b.page.evaluate(()=>!!document.querySelector('[data-ct="pz-verdict-box"]'));
      L.say(filled===null&&filledW===0&&!resv,geo+': a42 - no reserved verdict box and so no streak fill on a short upright phone, the board takes the room (fill by its words: '+filledW+')',{filled,filledW,resv});
      L.note(geo+': the reserved-box fill lines (filled, exact height, no hint repeat) do not apply here by a42 and are NOT credited');}
    else{
      L.say(!!filled&&filled.h>0,geo+': the reserved box is FILLED while the hint is up (it used to be empty bordered space)',filled);
      L.say(!!filled&&Math.abs(filled.h-wantH)<0.6,geo+': the fill is exactly the reserved height, '+wantH+'px - it borrows the space, it does not ask for more',filled&&filled.h);
      L.say(!!filled&&!/\u{1F4A1}/u.test(filled.t||''),geo+': the box does NOT repeat the hint text',filled&&filled.t);
    }
    L.say(!!before.board&&!!afterHint.board&&Math.abs(before.board.w-afterHint.board.w)<0.6&&Math.abs(before.board.top-afterHint.board.top)<0.6,
          geo+': the board does not move when the hint appears (w '+(before.board&&before.board.w)+' -> '+(afterHint.board&&afterHint.board.w)+', top '+(before.board&&before.board.top)+' -> '+(afterHint.board&&afterHint.board.top)+')');
    // #384 (derived test-lane item 6): the board-movement assertion nearby compares two MEASURED values and
    // nothing else, so it is true of a board that has been the wrong size since before the first sample. That is
    // exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. Pinned for the same reason; measured on #383.
    const WANTB={kunal730:375,se:320,'390':390};   /* #550 short upright (BSA-L-16): 259 -> 277 at 320x568; then a42 (1603f06) took the reserved box away on short upright phones, so the board is full width there: 277 -> 320, measured on 342f7329901b */
    if(WANTB[geo]!=null)L.say(!!afterHint.board&&Math.abs(afterHint.board.w-WANTB[geo])<0.6,geo+': the puzzle board is '+WANTB[geo]+' wide with the hint up - the measured size, not merely unmoved',{measured:afterHint.board&&afterHint.board.w,want:WANTB[geo]});
    // A VALUE, NOT A SHAPE [#545, item (50); jobs/two-gate-39-streak-assertions-are-shapes-not-values-and-gate-41-forces-the-
    // worker-pool-2026-10-03]. This read /\/\s*\d+/, which '0 / 0' satisfies. chess.jsx prints the fill as
    // '{puzIdx+1} / {PZ.length} · {streak | ✓ solved | rating R}', so on a fresh store it must parse as a real position
    // in a real set (1 <= N <= D, D >= 2) followed by the puzzle's rating - and must not claim any streak at all.
    // THE SEPARATOR IS ACCEPTED IN BOTH FORMS, AND THE WRONG ONE IS NAMED. Pinning the value found a real defect the
    // shape regex had hidden: chess.jsx writes this separator as \u00b7 in JSX TEXT, where escapes are not processed, so
    // the player reads a literal backslash-u-00b7 (measured on 049b41dfb6f1: '1 / 890 \u00b7 rating 600'). This run
    // ships no app code, so the numbers are pinned here with either separator and the escape is reported by name below,
    // never silently: jobs/the-puzzle-hint-fill-prints-a-literal-unicode-escape-2026-10-29.
    const cTxt=((filled&&filled.t)||'').replace(/\s+/g,' ').trim();
    // #547 item (102): the escape is fixed in chess.jsx (the separator is now {'\u00b7'}, an expression, so JSX
    // processes it), so the counter must carry the REAL middle dot; the literal backslash form is no longer accepted.
    const cm=/^(\d+) \/ (\d+) \u00b7 rating (\d{3,4})$/.exec(cTxt);
    if(/\\u[0-9a-fA-F]{4}/.test(cTxt))L.note(geo+': KNOWN DEFECT, REPORTED NOT ASSERTED - the fill prints a literal escape where the app meant a middle dot: '+JSON.stringify(cTxt)+' (jobs/the-puzzle-hint-fill-prints-a-literal-unicode-escape-2026-10-29)');
    const cN=cm?+cm[1]:null,cD=cm?+cm[2]:null,cR=cm?+cm[3]:null;
    if(!SHORT)L.say(!!cm&&cN>=1&&cN<=cD&&cD>=2&&cR>=400&&cR<=3200&&!/in a row/.test(filled.t||''),geo+': with no streak yet it falls back to the counter the header gave up - a real position N of D (1 <= N <= D, D >= 2) and the puzzle rating, never a streak of zero',{text:filled&&filled.t,N:cN,D:cD,rating:cR});

    // ---- the verdict takes the same box back, instantly, and the board still does not move
    await b.move('e1','e7',900);await b.settle(600);
    const afterWrong=await b.metrics();
    const gone=await box(b);const goneW=await fillWords(b);
    const verdict=await b.page.evaluate(()=>{const d=[...document.querySelectorAll('div')].map(x=>(x.innerText||'').trim()).filter(t=>/^✗/.test(t));return d[0]?d[0].slice(0,44):null;});
    L.say(!!verdict,geo+': a wrong move produces the verdict',verdict);
    if(geo!=='se')L.say(gone===null&&goneW===0,geo+': and the streak fill steps back out of the box for it - one box, never two (by hook, and by its words: '+goneW+')',{gone,goneW});
    L.say(!!afterHint.board&&!!afterWrong.board&&Math.abs(afterHint.board.w-afterWrong.board.w)<0.6&&Math.abs(afterHint.board.top-afterWrong.board.top)<0.6,
          geo+': the board does not move when the verdict replaces the streak - the transition is the half that would break silently');
    await b.shot('pzstreak-'+geo);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();

    // ---- a real streak: the branch his one-word answer actually names
    const b2=await L.launch({geo,name:'pzstreak-live-'+geo,store:{}});await b2.open();
    await b2.page.evaluate((k)=>localStorage.setItem(k,JSON.stringify({solved:{},streak:4,best:6,xp:40,online:0,onlineIds:{}})),PZKEY);
    await b2.open();
    await b2.tile('Puzzles');await b2.settle(600);
    await tapBtn(b2,/^▶ (Start training|Train next puzzle)$/);await b2.settle(900);
    const pre=await b2.metrics();
    await tapBtn(b2,/^\u{1F4A1} Hint$/u);await b2.settle(700);
    const live=await box(b2);const post=await b2.metrics();
    if(geo!=='se')L.say(!!live&&/in a row/.test(live.t||''),geo+': with a live streak the box reads the STREAK, which is the one word of his answer',live&&live.t);
    // THE STREAK, NOT ANY 4 [#545, item (50)]. This read /\b4\b/ over the whole fill, which a box printing 'best 4' or
    // '4 / 40' satisfies. The seed carries streak 4 and best 6, so the pin is the streak's own phrase, and best's must
    // be absent; the branches the one seed never reaches (1, and two digits) are driven once, after this loop.
    if(geo!=='se')L.say(!!live&&/(^|\s)4 in a row/.test(live.t||'')&&!/\b6 in a row/.test(live.t||''),geo+': and it is the STREAK the store carries ("4 in a row"), not best (6) and not a placeholder',live&&live.t);
    if(geo!=='se')L.say(!!live&&Math.abs(live.h-wantH)<0.6,geo+': the streak text does not change the reserved height either',live&&live.h);
    if(geo==='se')L.note(geo+': a42 - with the hint up on a short upright phone there is no box to carry the streak, so the three live-streak fill lines are NOT run here (where the streak shows instead is not asserted by this gate)');
    L.say(!!pre.board&&!!post.board&&Math.abs(pre.board.w-post.board.w)<0.6&&Math.abs(pre.board.top-post.board.top)<0.6,geo+': the board does not move on the streak branch either');
    await b2.close();
  }
  // ---- THE OTHER STREAK BRANCHES, at one column [#545, item (50)]: chess.jsx shows a streak only at pzStreak>=2, so a
  // streak of 1 must fall back to the rating, and a two-digit streak must print whole. One geometry, because this is the
  // value under test, not the layout, which the loop above already pins at three.
  for(const [streak,best,want] of [[1,9,null],[11,3,'11 in a row']]){
    const b3=await L.launch({geo:'kunal730',name:'pzstreak-v'+streak,store:{}});await b3.open();
    await b3.page.evaluate(([k,st,be])=>localStorage.setItem(k,JSON.stringify({solved:{},streak:st,best:be,xp:40,online:0,onlineIds:{}})),[PZKEY,streak,best]);
    await b3.open();
    await b3.tile('Puzzles');await b3.settle(600);
    await tapBtn(b3,/^▶ (Start training|Train next puzzle)$/);await b3.settle(900);
    await tapBtn(b3,/^\u{1F4A1} Hint$/u);await b3.settle(700);
    const v=await box(b3);const t=(v&&v.t)||'';
    if(want)L.say(new RegExp('(^|\\s)'+want).test(t)&&!new RegExp('\\b'+best+' in a row').test(t),'kunal730: a streak of '+streak+' (best '+best+') prints "'+want+'" whole, and not best',t);
    else L.say(!!v&&!/in a row/.test(t)&&/rating \d{3,4}/.test(t),'kunal730: a streak of 1 is below the display floor (pzStreak>=2), so the box shows the rating and no streak, not "1 in a row" and not best ('+best+')',t);
    await b3.close();
  }
  // ---- R: A REVEALED ANSWER FINISHES THE PUZZLE BUT DOES NOT RANK IT [#547, item (66), TC-PZ-03;
  // jobs/show-the-answer-credits-a-full-puzzle-solve-2026-09-30; Kunal chose "show-no-rank"]. Puzzle 1, Back-rank mate in 2
  // (Re8+ Rf8 Rxf8#), on a fresh store at 375x730 and at 375x761 with insets. Unaided: the solved map gains the puzzle. With
  // Show tapped before the mating move: no solved entry (so no solved count, no rank, no tier step), the streak still +1, XP
  // and the Daily 3 puzzle step still credited, and the closing line is not "Solved!" and says the answer was shown.
  const prog=(b)=>b.page.evaluate((k)=>{let p=null,d=null;try{p=JSON.parse(localStorage.getItem(k)||'null');}catch(e){}try{d=JSON.parse(localStorage.getItem('ct_daily3')||'null');}catch(e){}
    return {solved:p&&p.solved?Object.keys(p.solved).length:0,streak:p?p.streak:null,xp:p?p.xp:null,puz:d?d.puz:null};},PZKEY);
  const closing=(b)=>b.page.evaluate(()=>{const d=[...document.querySelectorAll('div')].map(x=>(x.innerText||'').trim()).filter(t=>/^(\u{1F389}|\u{1F441})/u.test(t)&&t.length>12);return d.length?d[d.length-1].slice(0,120):null;});
  for(const geo of ['kunal730','kunal761']){
    for(const shown of [false,true]){
      const tag=geo+(shown?' shown':' unaided');
      const b=await L.launch({geo,name:'pzreveal-'+geo+(shown?'-shown':'-plain'),store:{}});await b.open();
      await Z.states['train'](b);await b.settle(500);
      const p0=await prog(b);
      await b.move('e1','e8',1300);await b.settle(500);
      if(shown){const ok=await tapBtn(b,/^\u{1F441} Show( move)?$/u) /* the compact row (375x730) labels it '👁 Show', the wide one '👁 Show move' */;await b.settle(500);
        const msg=await b.page.evaluate(()=>[...document.querySelectorAll('div,span')].map(x=>(x.innerText||'').trim()).find(t=>/^\u{1F441} Play /u.test(t))||null);
        L.say(!!msg,tag+': R0 PRECONDITION Show was tapped and printed its "Play ..." line, so the finish below is a revealed one',{tapped:ok,msg});}
      await b.move('e8','f8',1300);await b.settle(900);
      const p1=await prog(b), line=await closing(b);
      L.say(p0.solved===0&&p1.streak===((p0.streak||0)+1),tag+': R1 ARRIVAL the puzzle was finished - the streak went '+(p0.streak||0)+' -> '+p1.streak,{p0,p1});
      if(!shown){
        L.say(p1.solved===1&&!!line&&/Solved!/.test(line),tag+': R2 unaided, TC-PZ-03 the solved map gains the puzzle and the closing line says Solved!',{p1,line});
      } else {
        L.say(p1.solved===0,tag+': R2 TC-PZ-03 after a reveal the solved map is UNCHANGED - no solved count, no rank, no tier step',{p1});
        L.say((p1.xp||0)>(p0.xp||0)&&(p1.puz||0)>=1,tag+': R3 and the XP and the Daily 3 puzzle step are still credited',{xpBefore:p0.xp,xpAfter:p1.xp,daily3puz:p1.puz});
        L.say(!!line&&!/Solved!/.test(line)&&/answer shown/i.test(line),tag+': R4 the closing line is not "Solved!" and says the answer was shown',{line});
        // R4b [#548 item (153); jobs/puzzle-finished-with-answer-shown-pays-streak-and-xp-2026-11-03]: and it does not PRAISE in the same
        // breath - the line read '... not counted as solved. Mate in 2 — nicely done.' The streak and XP half of that job is Kunal's
        // 'show-no-rank' (R3 above) and is not changed.
        L.say(!!line&&/answer shown/i.test(line)&&!/nicely done/i.test(line),tag+': R4b TC-PZ-SHOWN the revealed finish does not say "nicely done" beside "not counted as solved"',{line});
        // R4c [#550, the orchestrator's a10 on questions build__1794388896663-q10, from Kunal's show-no-rank of 11 Oct 2026]: the line
        // says plainly what a revealed finish earns - no rank - and what it still counts for - XP and the streak - matching R2 and R3.
        L.say(!!line&&/no rank/i.test(line)&&/XP/.test(line)&&/streak/i.test(line),tag+': R4c TC-PZ-SHOWN the revealed finish says it earns no rank and still counts for XP and the streak',{line});
      }
      L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+': R5 no app error beyond the allowed engine trap',b.errs.slice(0,2));
      await b.close();
    }
    // R6 [#547 antagonist A on item (66)]: SHOW, THEN RESET, THEN PLAY IT. Reset reloads the same puzzle, and it used to clear the
    // reveal with it, so a revealed answer replayed from the start earned a full solve. The reveal belongs to the PUZZLE.
    {
      const tag=geo+' shown-then-reset';
      const b=await L.launch({geo,name:'pzreveal-reset-'+geo,store:{}});await b.open();
      await Z.states['train'](b);await b.settle(500);
      const p0=await prog(b);
      const okS=await tapBtn(b,/^\u{1F441} Show( move)?$/u);await b.settle(400);
      const okR=await tapBtn(b,/^\u21ba Reset$/u);await b.settle(500);
      L.say(okS&&okR,tag+': R6 PRECONDITION Show and then Reset were both tapped',{show:okS,reset:okR});
      await b.move('e1','e8',1300);await b.settle(500);await b.move('e8','f8',1300);await b.settle(900);
      const p1=await prog(b), line=await closing(b);
      L.say(p1.streak===((p0.streak||0)+1),tag+': R6 ARRIVAL the puzzle was finished after the Reset',{p0,p1,line});
      L.say(p1.solved===0&&!!line&&/answer shown/i.test(line),tag+': R6 a reveal survives Reset of the same puzzle - no solved count, and the closing line says the answer was shown',{p1,line});
      await b.close();
    }
  }
  // ════════ TC-R86 (US-R82), #547 item (123): A WRONG MOVE DOES NOT DELETE THE HINT, AND THE SECOND ONE POINTS AT SHOW ════════
  // jobs/pz-one-message-slot-overwrites-the-hint-2026-09-28. Pre-fix the hint and the ✗ line shared one slot: after 💡 Hint then a
  // wrong move (Re7) the header lost the hint, and every wrong move printed the same sentence. Phones only (the header carries
  // the hint below the iPad width); 375x730 and 320x568.
  // TC-R86b [#549, item (46); same job, amber flags/amber-549-pz-hint-rail]: AND IN LANDSCAPE. On HEAD before #549 the wide rail held
  // the hint only in puzMsg, so at 730x375 and 844x390 the first wrong move replaced it (measured: the verdict box read the hint, then
  // '✗ Re7 isn't it...', and no pz-hint-head existed). The hint now takes the rail's counter row. Same drive, same assertions, plus the
  // board's rect read before the hint and after the second wrong move at every geometry.
  for(const g0 of ['kunal730','se',{w:730,h:375,safe:''},{w:844,h:390,safe:''}]){
    const geo=typeof g0==='object'?(g0.w+'x'+g0.h):g0;
    const b=await L.launch({geo:g0,name:'pz-hint-keep-'+geo});await b.open();
    const rd=()=>b.page.evaluate(()=>{const h=document.querySelector('[data-ct="pz-hint-head"]');const t=document.querySelector('[data-ct="pz-top"]');
      const x=t?[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^✗/.test((e.innerText||'').trim())).map(e=>e.innerText.trim()):[];const hl=t?[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^\u{1F4A1}/u.test((e.innerText||'').trim())):[];
      /* #549 (46): the hint is found by WHAT IT SAYS (a leaf in pz-top starting 💡), pz-hint-head first - not by the hook alone, which on the pre-#549 landscape rail does not exist, so the control would only have failed the precondition */
      return {head:h?(h.innerText||'').trim():(hl.length?hl[0].innerText.trim():null),x};});
    let ok=true,m0=null;try{await Z.states['train'](b);await b.settle(400);m0=await b.metrics();await Z.tapBtn(b,/^💡 Hint$/,600);await b.settle(400);}catch(e){ok=false;}
    const r0=await rd();
    if(!L.say(ok&&!!r0.head&&/^\u{1F4A1}/u.test(r0.head),geo+': TC-R86 PRECONDITION the hint was asked for and is in the header',r0)){await b.close();continue;}
    await b.move('e1','e7',0);try{await Z.waitMsg(b,/^✗/,3000);}catch(e){}await b.settle(500);const r1=await rd();
    L.say(r1.x.length===1,geo+': TC-R86 PRECONDITION the wrong move printed its ✗ line',r1);
    L.say(r1.head===r0.head,geo+': TC-R86 the hint is STILL in the header after the wrong move - it is state, not an event the next message overwrites',{before:r0.head,after:r1.head});
    await b.move('e1','e7',0);await b.settle(900);const r2=await rd();
    L.say(r2.head===r0.head,geo+': TC-R86 and still after a second wrong move',{after:r2.head});
    L.say(r2.x.length===1&&r2.x[0]!==r1.x[0]&&/\u{1F441}/u.test(r2.x[0]),geo+': TC-R86 the second wrong move says something new: it points at 👁 Show instead of repeating the first sentence',{first:r1.x[0],second:r2.x[0]});
    const m2=await b.metrics();
    L.say(!!m0&&!!m0.board&&!!m2&&!!m2.board&&Math.abs(m0.board.top-m2.board.top)<0.6&&Math.abs(m0.board.left-m2.board.left)<0.6&&Math.abs(m0.board.w-m2.board.w)<0.6,geo+': TC-R86b the board has the same rect (top, left, width) before the hint and after the second wrong move',{before:m0&&m0.board,after:m2&&m2.board});
    L.say(b.errs.length===0,geo+': TC-R86 no console errors',{errs:b.errs.slice(0,2)});
    await b.close();
  }
  // TC-PZ-BURST [#548, item (21); jobs/puzzle-screen-celebration-overlaps-and-dead-space-2026-09-24, acceptance A]: THE SOLVE
  // BURST NEVER PAINTS OVER THE TOP BOX. Puzzle 1 (Re8+ Rf8 Rxf8#) is solved, and every animation frame for 1.4s the confetti
  // pieces of the burst layer (found by structure: the fixed, zIndex 9500, pointer-events none layer) are read against [data-ct=pz-top] and against the board. Arrival first (#385): the burst was
  // sampled, non-empty, in its own L.say, so an absent burst cannot pass the overlap check over nothing (R18's empty-denominator
  // rule). Then: no piece intersects the top box, and every piece lies inside the board's rect (the layer is clipped to it).
  // Control: main's c7f6a1228e43, whose burst is viewport-wide from 16% of the height, reddens the overlap line here.
  for(const geo of ['se','w375h667','430']){
    const b=await L.launch({geo,name:'pz-burst-'+geo});await b.open();let ok=true;
    try{await Z.states['train-step1'](b);}catch(e){ok=false;}
    await b.page.evaluate(()=>{window.__bs=[];window.__bstop=false;const R=(e)=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const tick=()=>{if(window.__bstop)return;const L=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='9500'&&d.style.pointerEvents==='none');   /* by STRUCTURE (the burst's own fixed layer), not by the data-ct #548 adds (#432) */
        if(L){const top=document.querySelector('[data-ct="pz-top"]');const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(R).sort((a,b)=>(b[2]-b[0])-(a[2]-a[0]))[0];
          const vis=[...L.querySelectorAll('span')].map(R).map(r=>{const c=L.getBoundingClientRect();return [Math.max(r[0],c.left),Math.max(r[1],c.top),Math.min(r[2],c.right),Math.min(r[3],c.bottom)];}).filter(r=>r[2]-r[0]>0.5&&r[3]-r[1]>0.5);
          window.__bs.push({top:top?R(top):null,board:bd||null,p:vis});}
        requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    if(ok){await b.move('e8','f8',0);await b.settle(1400);}
    const S=await b.page.evaluate(()=>{window.__bstop=true;return window.__bs;});
    const pieces=S.reduce((n,f)=>n+f.p.length,0);
    L.say(ok&&S.length>0&&pieces>0,geo+': TC-PZ-BURST DENOMINATOR the puzzle was solved and the burst was sampled on screen ('+S.length+' frames, '+pieces+' painted pieces)',{frames:S.length,pieces});
    const hit=(a,c)=>a&&c&&a[0]<c[2]-0.5&&a[2]>c[0]+0.5&&a[1]<c[3]-0.5&&a[3]>c[1]+0.5;
    const over=S.filter(f=>f.p.some(p=>hit(p,f.top)));
    L.say(S.length>0&&over.length===0,geo+': TC-PZ-BURST no painted confetti piece intersects the top box (prompt and verdict text) in any frame',{framesOverTop:over.length,frames:S.length,first:over[0]||null});
    const out=S.filter(f=>f.board&&f.p.some(p=>p[0]<f.board[0]-1||p[1]<f.board[1]-1||p[2]>f.board[2]+1||p[3]>f.board[3]+1));
    L.say(S.length>0&&out.length===0,geo+': TC-PZ-BURST every painted piece lies inside the board rect - the layer is the board\'s size and clips at its edges',{framesOutside:out.length,first:out[0]||null});
    L.say(b.errs.length===0,geo+': TC-PZ-BURST no console errors',{errs:b.errs.slice(0,2)});
    await b.close();
  }
  // TC-PZ-TIER [#548, item (133); jobs/pz-rank-up-announces-a-rank-the-screen-already-showed-2026-09-28, Kunal's choice
  // questions/B8B-RANK-UP (wording, candidate (a))]: BEFORE THE RANK UP THE ROADMAP NAMES THE TIER, NOT THE PLAYER. Fresh store: the
  // card's heading - found by its position as the card's first bold line, not by the hook #548 adds (#432) - reads 'Novice puzzles ·
  // 0 of 10'. After Novice is earned (roadmap-rank1) it names the next tier the same way. main's heading is the bare 'Novice', which
  // is what made 'you reached Novice' at the 10th solve announce a rank the screen had shown from the first puzzle.
  for(const [st,want] of [['roadmap',/^Novice puzzles · 0 of 10$/],['roadmap-rank1',/^\S+ puzzles · \d+ of \d+$/]]){
    const b=await L.launch({geo:'kunal730',name:'pz-tier-'+st});await b.open();let ok=true;
    try{await Z.states[st](b);await b.settle(400);}catch(e){ok=false;}
    const h=await b.page.evaluate(()=>{const btn=[...document.querySelectorAll('button')].find(x=>/^▶ (Start training|Train next puzzle)$/.test((x.innerText||'').trim()));if(!btn)return null;
      const card=btn.parentElement;const bolds=[...card.querySelectorAll('div')].filter(d=>d.children.length===0&&parseInt(getComputedStyle(d).fontWeight)>=800&&(d.innerText||'').trim());return bolds.length?(bolds[0].innerText||'').trim():null;});
    L.say(ok&&!!h,'TC-PZ-TIER '+st+' PRECONDITION the roadmap card is on screen and its heading was read',{h});
    L.say(!!h&&want.test(h)&&!/^(Novice|Apprentice)$/.test(h),'TC-PZ-TIER '+st+': the roadmap heading names the TIER and the progress into it ("'+h+'"), not a bare rank name',{h});
    await b.close();
  }
  // TC-PZ-CHIP [#549, item (16); the same job's remainder after the orchestrator's PARTLY on #548, amber
  // flags/amber-549-pz-chip-tier-progress]: THE PUZZLE SCREEN'S HEADER CHIP NAMES THE TIER AND THE PROGRESS INTO IT, NOT THE
  // PLAYER. #548 fixed the roadmap heading and put the chip back to '<icon> Novice · ✓ <total>' (9e4ff22, ' puzzles' clipped it),
  // so before the first RANK UP the chip still called the player Novice. The chip is found BY STRUCTURE - the last child of the
  // pz-top header row, the row gate 40's Z-06 pin walks - never by a new hook (#432). Three inputs: a fresh store (Novice 0/10),
  // the 10th Novice solve after Continue (Novice 10/10, the tier the RANK UP just completed), and Start training once Novice is
  // earned (the next tier at 0/10). Each at 375x761 (his phone) and 320x568, and the chip must not be cut (scrollWidth vs clientWidth), because
  // fitting at both widths is the condition the orchestrator wrote into whatIsLeft.
  // #549 item (16) VETO FIX (antagonist A1-R1): the first version asserted the cut arm only where the row "had room" - chosen by
  // comparing the geometry NAME, which r19-phone-geometry.sh A4 rightly refuses - and wrote an L.note where the fraction WAS cut
  // ('🌱 Novice 10/1…' 111/103 after RANK UP, '♟️ Apprentice 0/1…' 132/126 at 375x761, 111/110 at 390x844). The chip now does not
  // shrink and the counter beside it yields, so not-cut is ASSERTED at every geometry and in every state, no exception list: a fresh
  // store, the first solve (Novice 1/10, the counter at its widest 'n / 890 · ✓ solved'), RANK UP then Continue (Novice 10/10) and
  // Start training once Novice is earned (Apprentice 0/10; its counter reads a 3-digit rating, 800 - a 4-digit one only widens the counter, which is the child that yields). Two readings per state, never a conjunct: the
  // chip's own scrollWidth against its clientWidth, and a Range over the n/need text, whose right edge must sit inside the chip's box
  // and the viewport - the INK of the fraction, not only the box around it (#395).
  // Negative control (#549 (16) veto fix): a trial of the tree before the fix (chip minWidth 0, shrinkable), md5 e824097dfb8e.
  const chipStates=[['train',/^🌱 Novice 0\/10$/],['train-solved',/^🌱 Novice 1\/10$/],['rankup-continue',/^🌱 Novice 10\/10$/],
    ['rank1-train',/^\S+ Apprentice 0\/10$/]];
  for(const geo of ['kunal761','kunal730','390','se']){
    for(const [st,want] of chipStates){
      const b=await L.launch({geo,name:'pz-chip-'+geo+'-'+st});await b.open();let ok=true;
      try{if(st==='rank1-train'){await Z.states['roadmap-rank1'](b);await Z.tapBtn(b,/^▶ (Start training|Train next puzzle)$/,900);}else await Z.states[st](b);await b.settle(500);}catch(e){ok=false;}
      const c=await b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');const r=top&&top.querySelector('div');const k=r&&[...r.children].filter(x=>(x.getAttribute('aria-label')||'')!=='Menu and settings').pop();   /* re-keyed by formatting audit FMT-A-02, Kunal's pick 12 Nov: the row now ends in the 44x44 menu, so the chip is the last child that is not the menu (was lastElementChild) */
        if(!k)return null;const q=k.getBoundingClientRect();
        // the fraction's ink: a Range over the 'n/need' characters of the chip's text node
        let fr=null;const w=document.createTreeWalker(k,NodeFilter.SHOW_TEXT);let tn;while((tn=w.nextNode())){const m=/\d+\/\d+$/.exec(tn.data);if(m){const rg=document.createRange();rg.setStart(tn,m.index);rg.setEnd(tn,tn.data.length);const rr=rg.getBoundingClientRect();fr={txt:m[0],left:Math.round(rr.left*100)/100,right:Math.round(rr.right*100)/100,w:Math.round(rr.width*100)/100};}}
        const cn=k.previousElementSibling;   // #550 AUD-L18: the counter, the chip's left neighbour
        return {cnt:cn&&cn!==k?{t:(cn.innerText||'').replace(/\s+/g,' ').trim(),sw:cn.scrollWidth,cw:cn.clientWidth}:null,t:(k.innerText||'').replace(/\s+/g,' ').trim(),sw:k.scrollWidth,cw:k.clientWidth,left:Math.round(q.left*100)/100,right:Math.round(q.right*100)/100,h:Math.round(r.getBoundingClientRect().height*100)/100,vw:innerWidth,fr};});
      L.say(ok&&!!c&&!!c.t,'TC-PZ-CHIP '+geo+' '+st+' PRECONDITION the puzzle header row is on screen and its last chip was read',{c});
      L.say(!!c&&want.test(c.t)&&!/✓/.test(c.t),'TC-PZ-CHIP '+geo+' '+st+': the header chip names the TIER and the progress into it ("'+(c&&c.t)+'"), not the tier name beside the all-time solved count',{c});
      L.say(!!c&&c.sw<=c.cw+0.5,'TC-PZ-CHIP '+geo+' '+st+': chip not cut - scrollWidth '+(c&&c.sw)+' <= clientWidth '+(c&&c.cw),{c});
      L.say(!!c&&!!c.fr&&c.fr.w>0&&c.fr.right<=c.right+0.5&&c.right<=c.vw+0.5,'TC-PZ-CHIP '+geo+' '+st+': the fraction "'+(c&&c.fr&&c.fr.txt)+'" is painted inside the chip - ink right '+(c&&c.fr&&c.fr.right)+' <= chip right '+(c&&c.right)+' <= viewport '+(c&&c.vw)+' (header row '+(c&&c.h)+'px)',{c});
      // #550 AUD-L18 (P2): the audit measured '1 / 890 · ✓ solv…' cut (139 in 121) after a solve; at this state on the pre-fix t74 it read
      // '1 / 890 · ✓ solved' at 129 in 129, so the cut did not reproduce here - the word, which the green verdict already says, is what goes
      if(st==='train-solved'&&geo!=='se')L.say(!!c&&!!c.cnt&&/✓$/.test(c.cnt.t)&&c.cnt.sw<=c.cnt.cw+0.5,'TC-PZ-CHIP '+geo+' train-solved: AUD-L18 after a solve the counter carries the tick alone - the word the green verdict already says is gone - and is not cut ("'+(c&&c.cnt&&c.cnt.t)+'", scrollWidth '+(c&&c.cnt&&c.cnt.sw)+' <= clientWidth '+(c&&c.cnt&&c.cnt.cw)+')',c&&c.cnt);
      await b.close();
    }
  }
  // TC-PZ-LBL [#548, item (134); jobs/a-file-label-under-a-highlight-falls-to-1-58-to-1-contrast-2026-10-04, Kunal's default
  // questions/B8-SMALL-DEFAULTS (3)]: THE BOARD'S LETTERS KEEP THEIR OWN CONTRAST ON HIGHLIGHTED SQUARES. Puzzle 1's Show
  // highlights e1 (a rank-1 square, so it carries the 'e' file label). Every file and rank label is found BY STRUCTURE (a
  // one-character absolutely placed span inside the board), never by the hook #548 adds (#432), and its PAINTED contrast is read
  // off a screenshot of its own box: background = the commonest pixel, ink = the pixel farthest from it in luminance. The job
  // measured 1.58:1 under a highlight and 3.37:1 as the plain baseline; the assertion is that no label falls under 3.0 in either
  // state, and the denominator (labels read, and at least one of them on a highlighted square) is its own line.
  // MEASURED at #548: main c7f6a1228e43 reads the 'e' label on the highlighted e1 at 1.98:1 at 375x730 (red here) and the fix
  // reads 4.24:1; at 320x568 the same scan reads 10.59 on main (the letter's box there also takes in piece ink), so 320x568 is
  // not a discriminating arm and is kept only as a second reading.
  for(const geo of ['kunal730','se']){
    for(const st of ['train-show']){   // train-hint highlights no labelled square on puzzle 1 (measured: 0 of 16 at both geometries), so only Show is a real input
      const b=await L.launch({geo,name:'pz-lbl-'+geo+'-'+st});await b.open();let ok=true;
      try{await Z.states[st](b);await b.settle(500);}catch(e){ok=false;}
      const labs=ok?await b.page.evaluate(()=>{const gr=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];if(!gr)return [];
        const _over=[...document.querySelectorAll('body *')].filter(e=>{if(gr.contains(e)||e.contains(gr))return false;const cs=getComputedStyle(e);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05)return false;const bg=cs.backgroundColor;return bg&&bg!=='rgba(0, 0, 0, 0)';}).map(e=>{const q=e.getBoundingClientRect();return {l:q.left,r:q.right,t:q.top,b:q.bottom};}).filter(q=>q.r>q.l&&q.b>q.t);
        return [...gr.querySelectorAll('span')].filter(x=>getComputedStyle(x).position==='absolute'&&/^[a-h1-8]$/.test((x.textContent||'').trim())).map(x=>{const r=x.getBoundingClientRect();const sqd=x.parentElement;const _sw=sqd.getBoundingClientRect().width;const hl=[...sqd.children].some(c=>{if(c===x||c.tagName!=='DIV')return false;const cs=getComputedStyle(c);return cs.position==='absolute'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&c.getBoundingClientRect().width>=_sw*0.9;});const cov=_over.some(o=>o.l<r.right&&o.r>r.left&&o.t<r.bottom&&o.b>r.top);return {t:(x.textContent||'').trim(),x:r.left,y:r.top,w:r.width,h:r.height,hl,cov};});}):[];
      const out=[];
      for(const l of labs){const buf=await b.page.screenshot({clip:{x:Math.max(0,l.x),y:Math.max(0,l.y),width:Math.max(1,l.w),height:Math.max(1,l.h)}});
        const cr=await b.page.evaluate(async(b64)=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
          const lum=(r,gg,bb)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(gg)+0.0722*f(bb);};
          const cnt=new Map();for(let i=0;i<d.length;i+=4){const k=d[i]+','+d[i+1]+','+d[i+2];cnt.set(k,(cnt.get(k)||0)+1);}
          const bg=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);const Lb=lum(...bg);let Lt=Lb;
          for(let i=0;i<d.length;i+=4){const L2=lum(d[i],d[i+1],d[i+2]);if(Math.abs(L2-Lb)>Math.abs(Lt-Lb))Lt=L2;}
          return Math.round(((Math.max(Lb,Lt)+0.05)/(Math.min(Lb,Lt)+0.05))*100)/100;},buf.toString('base64'));
        out.push({t:l.t,hl:l.hl,cr,cov:l.cov});}
      const tag=geo+' '+st;
      L.say(ok&&out.length>=15&&out.some(o=>o.hl),tag+': TC-PZ-LBL DENOMINATOR the puzzle state was reached, '+out.length+' board labels were read off the screen, and '+out.filter(o=>o.hl).length+' of them sit on a highlighted square',{n:out.length,onHighlight:out.filter(o=>o.hl)});
      // #550 a42 (1603f06): on a short upright phone Show's note is an overlay over the top of the board, so a label UNDER it is not
      // painted at all - its screenshot reads the overlay, not the board. A covered label is found by hit test (its box intersects a painted position:fixed element that is neither
      // inside nor around the board grid - a hit test cannot see the note, which is pointer-events:none; measured at #550: the '7' at 320x568 is HALF under Show's note, 2.57:1 - structure, not a42's hook), counted, and kept out of the contrast floor.
      const covered=out.filter(o=>o.cov);if(covered.length)L.note(tag+': TC-PZ-LBL '+covered.length+' label(s) sit under something drawn over the board and are not read for contrast: '+covered.map(o=>o.t+'@'+o.cr).join(' '));
      const low=out.filter(o=>o.cr<3.0&&!o.cov);
      L.say(covered.length<=4,tag+': TC-PZ-LBL at most 4 of the '+out.length+' labels are excused as covered ('+covered.length+') - the excusal cannot empty the floor',covered.map(o=>o.t));
      L.say(out.length>0&&low.length===0,tag+': TC-PZ-LBL no board label is painted under 3.0:1 against what is behind it - a highlight cannot take a letter down to the 1.58:1 the job measured (lowest '+Math.min(...out.map(o=>o.cr))+')',{low,onHighlight:out.filter(o=>o.hl)});
      L.say(b.errs.length===0,tag+': TC-PZ-LBL no console errors',{errs:b.errs.slice(0,2)});
      await b.close();
    }
  }
  // TC-PZ-LAND [#548, item (161); jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03]: IN LANDSCAPE THE PUZZLE
  // PREV/NEXT PAIR HAS THE SAME ACCESSIBLE NAMES AS IN PORTRAIT. Found by their visible text ('‹ Prev', 'Next ›'), then their
  // aria-label read; on main the landscape pair carried none, so the puzzles driver's tapAria states failed there.
  for(const g of [{w:730,h:375,safe:''},{w:844,h:390,safe:''}]){
    const b=await L.launch({geo:g,name:'pz-land-'+g.w});await b.open();let ok=true;
    try{await Z.states['train'](b);await b.settle(400);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const bs=[...document.querySelectorAll('button')];const f=(re)=>bs.filter(x=>re.test((x.innerText||'').trim()));
      return {prev:f(/^‹ Prev$/).map(x=>x.getAttribute('aria-label')),next:f(/^Next ›$/).map(x=>x.getAttribute('aria-label'))};});
    L.say(ok&&r.prev.length===1&&r.next.length===1,g.w+'x'+g.h+': TC-PZ-LAND PRECONDITION the landscape puzzle screen shows one ‹ Prev and one Next ›',r);
    L.say(r.prev[0]==='Previous puzzle'&&r.next[0]==='Next puzzle',g.w+'x'+g.h+': TC-PZ-LAND the landscape pair is named "Previous puzzle" / "Next puzzle", as in portrait',r);
    // TC-PZ-LAND2 [#549, item (25); same job]: THE '▾ More below' CHIP SITS AT THE BOTTOM OF THE RAIL, NOT THE TOP, AND TAPPING IT
    // BRINGS THE PAIR ON SCREEN. The pair starts below the rail's fold here (the rail clips at 296.5, the pair at 329.5 at 730x375),
    // so the chip is the only thing at rest saying the pane moves. On HEAD before #549 the chip's wrapper had flex order 0 against the
    // puzzle children's 1 and 3, so it painted at the TOP (30-55) pointing down at the board's top rank.
    /* #550 answer a8 (Kunal, Option A of docs/mockup-q8-sideways-2026-11-11): THE PROBLEM THE CHIP POINTED AT IS GONE. The tabs became a rail on
       the right and the board took the height, so the puzzle panel FITS - nothing is below its fold, there is no 'More below' chip to show,
       and Prev and Next are on screen at rest. The four TC-PZ-LAND2 lines now assert that, on the same states; the chip's own position
       (its #549 subject) can no longer arise here and is not asserted. */
    const rc=await b.page.evaluate(()=>{const m=document.querySelector('[data-ct="rail-more"]');const f=(re)=>[...document.querySelectorAll('button')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&re.test((x.innerText||'').trim());});
      const prev=f(/^‹ Prev$/),next=f(/^Next ›$/);let sc=prev&&prev.parentElement;while(sc&&!/auto|scroll/.test(getComputedStyle(sc).overflowY))sc=sc.parentElement;
      const R=sc?sc.getBoundingClientRect():null;const self=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {y:[r.top,r.bottom],self:!!h&&(h===e||e.contains(h)),inView:r.top>=0&&r.bottom<=innerHeight+0.5&&(!R||r.bottom<=R.bottom+0.5)};};
      const sh=f(/^👁 Show( move)?$/);let show=null;
      if(sh){const s=sh.getBoundingClientRect();const hc=document.elementFromPoint(s.left+s.width/2,s.top+s.height/2);let n=0,ok=0;
        for(let x=s.left+1;x<s.right-1;x+=4)for(let y=s.top+1;y<s.bottom-1;y+=4){n++;const h=document.elementFromPoint(x,y);if(h&&(h===sh||sh.contains(h)))ok++;}
        show={rect:[s.left,s.right,s.top,s.bottom],centreSelf:!!hc&&(hc===sh||sh.contains(hc)),n,ok};}
      const chipVis=!!m&&m.getBoundingClientRect().height>0;
      return {chip:chipVis,prev:self(prev),next:self(next),scroll:sc?sc.scrollHeight-sc.clientHeight:null,show};});
    L.say(!!(rc.prev&&rc.next&&rc.scroll!=null),g.w+'x'+g.h+': TC-PZ-LAND2 PRECONDITION the puzzle panel and its ‹ Prev / Next › pair are found',rc);
    L.say(!rc.chip&&rc.scroll!=null&&rc.scroll<=1,g.w+'x'+g.h+': TC-PZ-LAND2 nothing is below the panel\'s fold and no More-below chip is shown (#550 a8: the tabs went to a right rail, so the panel fits; scroll '+rc.scroll+')',rc);
    L.say(!!(rc.show&&rc.show.n>=20&&rc.show.centreSelf&&rc.show.ok>=0.95*rc.show.n),g.w+'x'+g.h+': TC-PZ-LAND2 at rest nothing covers Show move: its centre and >= 95% of its sample points hit-test to it',rc.show);
    L.say(!!(rc.prev&&rc.prev.self&&rc.prev.inView&&rc.next&&rc.next.self&&rc.next.inView),g.w+'x'+g.h+': TC-PZ-LAND2 ‹ Prev and Next › are on screen AT REST, each hit-testing to itself at its centre (it took a tap on the chip before #550 a8)',{prev:rc.prev,next:rc.next});
    // CONTROL-RECORD: 9fb0aa5 2026-11-06 total=137 red=2 scope=full how=pre-fix bundle 9dca31cd3621 (rail-more wrapper without order:99, chip at the top of the puzzle rail); red: TC-PZ-LAND2 chip-position assertion at 730x375 and 844x390. Good trial b48b6d6b2582 reads 137 PASS 0 FAIL.
    await b.close();
  }
  // TC-PZ-RANKUP [#549, item (37); jobs/suite-never-asserts-after-a-success-2026-09-27 theFix (2) and (4)]: AFTER THE 10TH NOVICE
  // SOLVE (state 'rankup': PZ[9] with nine solves seeded) THE RANK-UP LAYER MAY COVER THE SCREEN, BUT IT MUST NOT MOVE THE BOARD, AND
  // ONCE IT IS DISMISSED NOTHING CELEBRATING MAY BE LEFT OVER THE VERDICT THAT SAYS WHAT I DID. The layer is found by WHAT IT SAYS
  // ('RANK UP!' inside a position:fixed ancestor), never only by the data-ct hook this build adds, so the hook check is its own line
  // and a bundle without the hook still has its overlap and board assertions measured. train-solved's verdict hit test and board
  // pin are gate 57's G and A (TC-PZ-01); the card's no-timer rule is gate 57's TC-R82; this block is the rankup half of the job.
  const pzLayer=(b)=>b.page.evaluate(()=>{const leaf=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/^RANK UP!$/.test((d.textContent||'').trim()));
    if(!leaf)return null;let e=leaf;while(e&&getComputedStyle(e).position!=='fixed')e=e.parentElement;if(!e)return {fixed:false};
    const r=e.getBoundingClientRect();return {fixed:true,ct:e.getAttribute('data-ct'),z:getComputedStyle(e).zIndex,cover:r.width>=innerWidth-1&&r.height>=innerHeight-1};});
  const pzVerdictHit=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;
    const leaf=[...t.querySelectorAll('div,span')].filter(d=>d.children.length===0&&/^\u{1F389}/u.test((d.innerText||'').trim())).pop();if(!leaf)return {found:false};
    const rg=document.createRange();rg.selectNodeContents(leaf);const rs=[...rg.getClientRects()].filter(r=>r.width>0&&r.height>0);
    const pts=rs.slice(0,2).map(r=>[r.left+Math.min(8,r.width/2),r.top+r.height/2]);
    const hits=pts.map(([x,y])=>{const h=document.elementFromPoint(x,y);return {x:Math.round(x),y:Math.round(y),self:!!h&&(h===leaf||leaf.contains(h)),got:h?(h.getAttribute('data-ct')||h.tagName):null};});
    return {found:true,news:/⬆ Rank up/.test(leaf.textContent||''),hits};});
  for(const geo of ['kunal761','kunal730','se']){
    const b=await L.launch({geo,name:'pz-rankup-'+geo,store:{}});await b.open();let ok=true,m0=null,m1=null,lay=null,m2=null,vh=null,gone=null;
    try{await Z.seedSolved(b,Z.FIRST9);await Z.startTraining(b);await b.settle(500);m0=await b.metrics();
      const goal=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');return t?(t.innerText||''):'';});
      if(!/mate in 2/.test(goal))throw new Error('expected PZ[9], got '+goal.replace(/\s+/g,' ').slice(0,80));
      await b.move('d5','d8',0);await Z.waitMsg(b,/^✓/,3000);await b.settle(900);await b.move('d1','d8',0);await b.settle(1600);
      m1=await b.metrics();lay=await pzLayer(b);
      if(lay&&lay.fixed){await Z.tapBtn(b,/^Continue ▶$/,800);}
      await b.settle(600);m2=await b.metrics();gone=await pzLayer(b);vh=await pzVerdictHit(b);
    }catch(e){ok=false;L.note(geo+': TC-PZ-RANKUP drive threw: '+String(e.message).slice(0,120));}
    L.say(ok&&!!m0&&!!m0.board&&!!lay&&lay.fixed&&lay.cover,geo+': TC-PZ-RANKUP PRECONDITION the unsolved PZ[9] card was measured and the 10th solve raised the full-screen RANK UP layer',{board0:m0&&m0.board,lay});
    L.say(!!lay&&lay.ct==='pz-celebrate',geo+': TC-PZ-RANKUP the rank-up layer carries data-ct="pz-celebrate", so a gate can name it',lay);
    const same=(a,c)=>!!a&&!!c&&!!a.board&&!!c.board&&Math.abs(a.board.top-c.board.top)<0.6&&Math.abs(a.board.left-c.board.left)<0.6&&Math.abs(a.board.w-c.board.w)<0.6;
    L.say(same(m0,m1),geo+': TC-PZ-RANKUP the board under the rank-up layer has the unsolved card\'s rect (top, left, width) - celebrating does not move it',{before:m0&&m0.board,under:m1&&m1.board});
    L.say(ok&&gone===null&&same(m0,m2),geo+': TC-PZ-RANKUP after Continue the layer is gone and the board is still where the unsolved card had it',{after:m2&&m2.board,layerAfter:gone});
    L.say(!!vh&&vh.found&&vh.news&&vh.hits.length>0&&vh.hits.every(h=>h.self),geo+': TC-PZ-RANKUP the verdict carrying the rank-up news is on top at its first lines - nothing that celebrated is left over the text that says what I did',vh);
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': TC-PZ-RANKUP no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }
  // TC-PZ-SOLVED39 [#550 item (23); jobs/suite-never-asserts-after-a-success-2026-09-27 theFix (2), the half batch 9's checker found left to
  // gate 57]: THE ORDINARY SOLVE IN THIS GATE TOO. After the first training puzzle is solved (state 'train-solved'), the board keeps the
  // unsolved card's rect and the verdict is on top at its first lines - the same two readings as TC-PZ-RANKUP, on the common success.
  const pzSolvedHit=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;
    const leaf=[...t.querySelectorAll('div,span')].filter(d=>d.children.length===0&&/^\u{1F389}/u.test((d.innerText||'').trim())).pop();if(!leaf)return {found:false};
    const rg=document.createRange();rg.selectNodeContents(leaf);const rs=[...rg.getClientRects()].filter(r=>r.width>0&&r.height>0);
    const hits=rs.slice(0,2).map(r=>{const x=r.left+Math.min(8,r.width/2),y=r.top+r.height/2;const h=document.elementFromPoint(x,y);return {x:Math.round(x),y:Math.round(y),self:!!h&&(h===leaf||leaf.contains(h)),got:h?(h.getAttribute('data-ct')||h.tagName):null};});
    return {found:true,hits};});
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'pz-solved39-'+geo,store:{}});await b.open();let ok=true,m0=null,m1=null,vh=null;
    try{await Z.states['train-step1'](b);await b.settle(400);m0=await b.metrics();await b.move('e8','f8',0);await Z.waitMsg(b,/^🎉/,3000);await b.settle(1600);m1=await b.metrics();vh=await pzSolvedHit(b);}
    catch(e){ok=false;L.note(geo+': TC-PZ-SOLVED39 drive threw: '+String(e.message).slice(0,120));}
    L.say(ok&&!!m0&&!!m0.board&&!!vh&&vh.found,geo+': TC-PZ-SOLVED39 PRECONDITION the first training puzzle was measured before its last move and solved (a verdict starting with the party mark)',{board0:m0&&m0.board,vh});
    const same=(a,c)=>!!a&&!!c&&!!a.board&&!!c.board&&Math.abs(a.board.top-c.board.top)<0.6&&Math.abs(a.board.left-c.board.left)<0.6&&Math.abs(a.board.w-c.board.w)<0.6;
    L.say(same(m0,m1),geo+': TC-PZ-SOLVED39 the board after the solve keeps the rect it had before it (top, left, width)',{before:m0&&m0.board,after:m1&&m1.board});
    L.say(!!vh&&vh.found&&vh.hits.length>0&&vh.hits.every(h=>h.self),geo+': TC-PZ-SOLVED39 the verdict is on top at its first lines - nothing celebrating is left over it',vh);
    await b.close();
  }
},'PZ-STREAK');
// SELECTOR-OPENED: pz-celebrate reading=presence round 4: the layer is found by structure and this hook must be its name
