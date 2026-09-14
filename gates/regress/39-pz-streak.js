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
    L.say(!!filled&&/\/\s*\d+/.test(filled.t||''),geo+': with no streak yet it falls back to the counter the header gave up rather than claiming a streak of zero',filled&&filled.t);

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
    L.say(!!live&&/\b4\b/.test(live.t||''),geo+': and it is the value the store actually carries (4), not a placeholder',live&&live.t);
    L.say(!!live&&Math.abs(live.h-wantH)<0.6,geo+': the streak text does not change the reserved height either',live&&live.h);
    L.say(!!pre.board&&!!post.board&&Math.abs(pre.board.w-post.board.w)<0.6&&Math.abs(pre.board.top-post.board.top)<0.6,geo+': the board does not move on the streak branch either');
    await b2.close();
  }
},'PZ-STREAK');
