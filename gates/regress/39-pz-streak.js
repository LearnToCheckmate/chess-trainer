// regress/39-pz-streak.js  Z-04 (Kunal, choice "Streak"). THE ONLY GUARD ON THIS CHANGE.
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
// NEGATIVE CONTROL: proved against a bundle with the pz-streak block deleted - the box goes back to empty and
// assertion 1 goes red at every geometry. See claude/agents/REGRESSION-LOG.md.
'use strict';
const L=require('../lib');
const Z=require('../drive/puzzles');
const PZKEY='chesstrainer.progress.v1';

const box=(b)=>b.page.evaluate(()=>{
  const e=document.querySelector('[data-ct="pz-streak"]');
  if(!e)return null;
  const r=e.getBoundingClientRect();
  return {y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,t:(e.innerText||'').replace(/\s+/g,' ').trim()};
});
const hintHead=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const tapBtn=async(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);const el=[...document.querySelectorAll('button')].filter(x=>r.test((x.innerText||'').trim()))[0];if(el){el.scrollIntoView({block:'center'});el.click();return true;}return false;},[re.source,re.flags]);

L.run(async()=>{
  for(const [geo,wantH] of [['kunal730',30],['se',30],['390',74]]){
    // ---- no streak yet: the fresh-store case, which is what a new user sees
    const b=await L.launch({geo,name:'pzstreak-'+geo,store:{}});await b.open();
    await Z.states['train'](b);await b.settle(400);
    const before=await b.metrics();
    const empty=await box(b);
    L.say(empty===null,geo+': with no hint up the streak fill is absent - it exists only in the branch where the box would otherwise be empty, so it never competes with a verdict',empty);

    await Z.states['train-hint'](b);await b.settle(500);
    const hh=await hintHead(b);
    L.say(!!hh&&/^\u{1F4A1}/u.test(hh),geo+': the hint really did take the header row, which is the state this whole item is about',hh&&hh.slice(0,50));
    const filled=await box(b);const afterHint=await b.metrics();
    L.say(!!filled&&filled.h>0,geo+': the reserved box is FILLED while the hint is up (it used to be empty bordered space)',filled);
    L.say(!!filled&&Math.abs(filled.h-wantH)<0.6,geo+': the fill is exactly the reserved height, '+wantH+'px - it borrows the space, it does not ask for more',filled&&filled.h);
    L.say(!!filled&&!/\u{1F4A1}/u.test(filled.t||''),geo+': the box does NOT repeat the hint text',filled&&filled.t);
    L.say(!!before.board&&!!afterHint.board&&Math.abs(before.board.w-afterHint.board.w)<0.6&&Math.abs(before.board.top-afterHint.board.top)<0.6,
          geo+': the board does not move when the hint appears (w '+(before.board&&before.board.w)+' -> '+(afterHint.board&&afterHint.board.w)+', top '+(before.board&&before.board.top)+' -> '+(afterHint.board&&afterHint.board.top)+')');
    // #384 (derived test-lane item 6): the board-movement assertion nearby compares two MEASURED values and
    // nothing else, so it is true of a board that has been the wrong size since before the first sample. That is
    // exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. Pinned for the same reason; measured on #383.
    const WANTB={kunal730:375,se:259,'390':390};
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
    const cm=/^(\d+) \/ (\d+) (?:\u00b7|\\u00b7) rating (\d{3,4})$/.exec(cTxt);
    if(/\\u[0-9a-fA-F]{4}/.test(cTxt))L.note(geo+': KNOWN DEFECT, REPORTED NOT ASSERTED - the fill prints a literal escape where the app meant a middle dot: '+JSON.stringify(cTxt)+' (jobs/the-puzzle-hint-fill-prints-a-literal-unicode-escape-2026-10-29)');
    const cN=cm?+cm[1]:null,cD=cm?+cm[2]:null,cR=cm?+cm[3]:null;
    L.say(!!cm&&cN>=1&&cN<=cD&&cD>=2&&cR>=400&&cR<=3200&&!/in a row/.test(filled.t||''),geo+': with no streak yet it falls back to the counter the header gave up - a real position N of D (1 <= N <= D, D >= 2) and the puzzle rating, never a streak of zero',{text:filled&&filled.t,N:cN,D:cD,rating:cR});

    // ---- the verdict takes the same box back, instantly, and the board still does not move
    await b.move('e1','e7',900);await b.settle(600);
    const afterWrong=await b.metrics();
    const gone=await box(b);
    const verdict=await b.page.evaluate(()=>{const d=[...document.querySelectorAll('div')].map(x=>(x.innerText||'').trim()).filter(t=>/^✗/.test(t));return d[0]?d[0].slice(0,44):null;});
    L.say(!!verdict,geo+': a wrong move produces the verdict',verdict);
    L.say(gone===null,geo+': and the streak fill steps back out of the box for it - one box, never two',gone);
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
    L.say(!!live&&/in a row/.test(live.t||''),geo+': with a live streak the box reads the STREAK, which is the one word of his answer',live&&live.t);
    // THE STREAK, NOT ANY 4 [#545, item (50)]. This read /\b4\b/ over the whole fill, which a box printing 'best 4' or
    // '4 / 40' satisfies. The seed carries streak 4 and best 6, so the pin is the streak's own phrase, and best's must
    // be absent; the branches the one seed never reaches (1, and two digits) are driven once, after this loop.
    L.say(!!live&&/(^|\s)4 in a row/.test(live.t||'')&&!/\b6 in a row/.test(live.t||''),geo+': and it is the STREAK the store carries ("4 in a row"), not best (6) and not a placeholder',live&&live.t);
    L.say(!!live&&Math.abs(live.h-wantH)<0.6,geo+': the streak text does not change the reserved height either',live&&live.h);
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
},'PZ-STREAK');
