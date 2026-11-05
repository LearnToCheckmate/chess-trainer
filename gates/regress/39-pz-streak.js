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
    // #547 item (102): the escape is fixed in chess.jsx (the separator is now {'\u00b7'}, an expression, so JSX
    // processes it), so the counter must carry the REAL middle dot; the literal backslash form is no longer accepted.
    const cm=/^(\d+) \/ (\d+) \u00b7 rating (\d{3,4})$/.exec(cTxt);
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
  for(const geo of ['kunal730','se']){
    const b=await L.launch({geo,name:'pz-hint-keep-'+geo});await b.open();
    const rd=()=>b.page.evaluate(()=>{const h=document.querySelector('[data-ct="pz-hint-head"]');const t=document.querySelector('[data-ct="pz-top"]');
      const x=t?[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^✗/.test((e.innerText||'').trim())).map(e=>e.innerText.trim()):[];return {head:h?(h.innerText||'').trim():null,x};});
    let ok=true;try{await Z.states['train-hint'](b);await b.settle(400);}catch(e){ok=false;}
    const r0=await rd();
    if(!L.say(ok&&!!r0.head&&/^\u{1F4A1}/u.test(r0.head),geo+': TC-R86 PRECONDITION the hint was asked for and is in the header',r0)){await b.close();continue;}
    await b.move('e1','e7',0);try{await Z.waitMsg(b,/^✗/,3000);}catch(e){}await b.settle(500);const r1=await rd();
    L.say(r1.x.length===1,geo+': TC-R86 PRECONDITION the wrong move printed its ✗ line',r1);
    L.say(r1.head===r0.head,geo+': TC-R86 the hint is STILL in the header after the wrong move - it is state, not an event the next message overwrites',{before:r0.head,after:r1.head});
    await b.move('e1','e7',0);await b.settle(900);const r2=await rd();
    L.say(r2.head===r0.head,geo+': TC-R86 and still after a second wrong move',{after:r2.head});
    L.say(r2.x.length===1&&r2.x[0]!==r1.x[0]&&/\u{1F441}/u.test(r2.x[0]),geo+': TC-R86 the second wrong move says something new: it points at 👁 Show instead of repeating the first sentence',{first:r1.x[0],second:r2.x[0]});
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
        return [...gr.querySelectorAll('span')].filter(x=>getComputedStyle(x).position==='absolute'&&/^[a-h1-8]$/.test((x.textContent||'').trim())).map(x=>{const r=x.getBoundingClientRect();const sqd=x.parentElement;const _sw=sqd.getBoundingClientRect().width;const hl=[...sqd.children].some(c=>{if(c===x||c.tagName!=='DIV')return false;const cs=getComputedStyle(c);return cs.position==='absolute'&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&c.getBoundingClientRect().width>=_sw*0.9;});return {t:(x.textContent||'').trim(),x:r.left,y:r.top,w:r.width,h:r.height,hl};});}):[];
      const out=[];
      for(const l of labs){const buf=await b.page.screenshot({clip:{x:Math.max(0,l.x),y:Math.max(0,l.y),width:Math.max(1,l.w),height:Math.max(1,l.h)}});
        const cr=await b.page.evaluate(async(b64)=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
          const lum=(r,gg,bb)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(gg)+0.0722*f(bb);};
          const cnt=new Map();for(let i=0;i<d.length;i+=4){const k=d[i]+','+d[i+1]+','+d[i+2];cnt.set(k,(cnt.get(k)||0)+1);}
          const bg=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);const Lb=lum(...bg);let Lt=Lb;
          for(let i=0;i<d.length;i+=4){const L2=lum(d[i],d[i+1],d[i+2]);if(Math.abs(L2-Lb)>Math.abs(Lt-Lb))Lt=L2;}
          return Math.round(((Math.max(Lb,Lt)+0.05)/(Math.min(Lb,Lt)+0.05))*100)/100;},buf.toString('base64'));
        out.push({t:l.t,hl:l.hl,cr});}
      const tag=geo+' '+st;
      L.say(ok&&out.length>=15&&out.some(o=>o.hl),tag+': TC-PZ-LBL DENOMINATOR the puzzle state was reached, '+out.length+' board labels were read off the screen, and '+out.filter(o=>o.hl).length+' of them sit on a highlighted square',{n:out.length,onHighlight:out.filter(o=>o.hl)});
      const low=out.filter(o=>o.cr<3.0);
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
    await b.close();
  }
},'PZ-STREAK');
