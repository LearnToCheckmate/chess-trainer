// regress/41-coach-bubble.js  THE COACH BUBBLE IS GONE, AND THE BOARD IS UNOBSTRUCTED.
//
// #394 (kunal-review-floating-bubble-remove). This gate used to assert the bubble's geometry against the
// mockup Kunal approved on 2026-09-13 ("Build it, over the board, dismiss on tap"). He has now reversed that
// with the cost measured off his own screenshot: the bubble was 379.2 x 110.8pt on a 405.2pt board - 2.19
// ranks, 27% of board height, 26% of board AREA - and it hid ranks 1 to 3 including the black king on g8.
// It was also pure duplication: its body text was `_annoWhy`, the SAME variable rev-why-txt renders under
// the board, so it cost a quarter of the board to say nothing new.
//
// THE GATE IS NOT DELETED, IT IS INVERTED, and that matters. "The bubble is gone" is an ABSENCE claim, and
// CLAUDE.md is explicit that absence is the hardest thing to measure: it must name the screens and states
// actually checked. The trap is a gate that passes because it never reached a state where the bubble COULD
// have appeared - which is exactly how #385's anaMode assertion went 38 of 38 green against a bundle with
// its guard deleted. So every absence assertion here is paired with a POSITIVE precondition proving the old
// render condition (`inReview && !anaMode && ply>0 && _annoWhy`) was satisfied at the moment of the check.
//
// WHAT THIS GATE CANNOT CARRY ANY MORE, said plainly rather than quietly dropped:
//   - the #385 SCALE check (the coach chip printed every evaluation divided by a hundred) is gone, because
//     the chip was the only element rendering curAnno.evalAfter. That defect class cannot recur in an
//     element that no longer exists. `evPawnsTxt` is still used by rev-cmp, which gate 20 covers.
//   - the #387 TRUNCATION work does NOT disappear: it MOVES here, onto rev-why-txt, which is now the only
//     place the sentence is readable. That box is clamped, not clipped, so an ellipsis is drawn - which is
//     the property #387 established must hold ("assert WHICH THING DID THE CUTTING").
'use strict';
const L=require('../lib');
const R=require('../drive/review');

const rect=(b,sel)=>b.page.evaluate((s)=>{
  const e=document.querySelector(s); if(!e)return null;
  const r=e.getBoundingClientRect();
  return {x:+r.left.toFixed(2),y:+r.top.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),
    right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2),
    text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,120)};
},sel);
const seen=(b,sel)=>b.page.locator(sel).last().isVisible().catch(()=>false);

// The review board's width per geometry, measured not assumed: 349 is Kunal's phone, 264 the same board at
// 320 minus the same eval bar. PINNED, so this gate cannot go green against a board that was wrong already.
const WANT={kunal730:{board:349},se:{board:264}};

L.run(async()=>{
  for(const geo of ['kunal730','se']){
    const b=await L.launch({geo,name:'coach-'+geo,store:{ct_pool:'3'}});
    const W=WANT[geo];
    await b.open();

    // ply 31 is 16.Qb8+, a move with a verdict and therefore a sentence - the exact state the bubble used
    // to render in. Everything below is checked HERE, where the old element would have been present.
    await R.states['moves-ply31'](b);
    await b.settle(400);

    const bd0=await b.board();
    L.say(!!bd0&&Math.abs(bd0.w-W.board)<0.6,geo+': the review board is '+W.board+' wide - pinned, so this gate cannot go green against a board that was wrong from the start',bd0&&bd0.w);

    // ── THE PRECONDITION. Without this the absence assertions below are worthless. ───────────────────
    const why=await rect(b,'[data-ct="rev-why-txt"]');
    L.say(!!why&&why.text.length>20,geo+': PRECONDITION - ply 31 has a coach sentence, so the removed bubble would have had something to say here',why&&why.text.slice(0,50));
    const st=await b.page.evaluate(()=>({ana:[...document.querySelectorAll('*')].some(e=>/Exit analysis/.test(e.textContent||'')&&e.children.length===0)}));
    L.say(!st.ana,geo+': PRECONDITION - not in analysis mode, the one state the bubble was always hidden in anyway',st);

    // ── THE REMOVAL ITSELF ──────────────────────────────────────────────────────────────────────────
    L.say(!(await seen(b,'[data-ct="coach-bubble"]')),geo+': the coach bubble is GONE at a ply that has a verdict and a sentence');
    L.say((await rect(b,'[data-ct="coach-bubble"]'))===null,geo+': and it is absent from the DOM, not merely invisible - an element still laid out over the board would still eat taps');
    L.say((await rect(b,'[data-ct="coach-say"]'))===null,geo+': its sentence element is gone with it');
    L.say((await rect(b,'[data-ct="coach-eval"]'))===null,geo+': its eval chip is gone with it');
    L.say((await rect(b,'[data-ct="coach-verdict"]'))===null,geo+': its verdict pill is gone with it');

    // ── WHAT HE ACTUALLY ASKED FOR: THE BOARD BACK. ────────────────────────────────────────────────
    // Not "the bubble is gone" but "nothing covers the board". Asserted by hit-testing the squares the
    // bubble used to cover - the top three ranks - rather than by naming the element, so anything ELSE
    // that lands there later fails this too. Nine points across the top third of the board.
    /* THE SELECTOR HERE WAS WRONG IN ITS FIRST VERSION AND THE GATE WENT RED ON A HEALTHY BUNDLE.
       It asked whether the hit element had an ancestor matching [data-ct="rev-grid"] or [data-ct="board"].
       NEITHER EXISTS: the board carries no data-ct at all, and gates/lib.js finds it the only way there is,
       by looking for the widest div whose gridTemplateColumns is a repeat(8,...). So all nine points
       "failed" against an ancestor that could never match - a bad selector reporting a defect that is not
       there, which CLAUDE.md lists as one of the two readings that produced false P0s in a single day.
       Identified the same way lib.js does, and asserted with contains() so a square, a piece, a badge or a
       coordinate label all count as the board. */
    const cover=await b.page.evaluate((bd)=>{
      const grids=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
      let grid=null; for(const e of grids){const r=e.getBoundingClientRect(); if(r.width<40)continue; if(!grid||r.width>grid.getBoundingClientRect().width)grid=e;}
      if(!grid)return [{err:'no board grid found'}];
      /* AND IT MUST BE A SQUARE, NOT MERELY "INSIDE THE BOARD". The first version of this asked whether the
         hit element was contained by the grid - and it PASSED against the #393 control with the bubble fully
         up, because the bubble was rendered as a child of the grid itself, a sibling of the 64 squares. An
         assertion that the element under your finger is somewhere inside the board is satisfied by the very
         overlay it was written to detect. The squares are the grid's first 64 children (gates/lib.js reads
         kids[56] and kids[63] for the coordinate labels), so the test is: the hit element must BE one of
         those 64, or sit inside one - a piece, a badge, a rank label all count. Anything else covering the
         square, bubble included, fails. */
      const squares=[...grid.children].slice(0,64);
      const onSquare=(el)=>squares.some(sq=>sq===el||sq.contains(el));
      const out=[];
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){
        const x=Math.round(bd.x+bd.w*(0.17+0.33*j)), y=Math.round(bd.y+bd.w*(0.06+0.13*i));
        const el=document.elementFromPoint(x,y); if(!el){out.push({x,y,tag:'(nothing)'});continue;}
        if(!onSquare(el))out.push({x,y,tag:el.tagName,ct:el.getAttribute&&el.getAttribute('data-ct'),txt:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)});
      }
      return out;
    },bd0);
    L.say(cover.length===0,geo+': every one of nine points across the TOP THIRD of the board hit-tests to a SQUARE of the board - the ranks the bubble covered are the user\'s again. Asserted by hit test against the 64 squares rather than by element name, so anything else that lands there fails this too',cover);

    // ── THE SENTENCE SURVIVED, AND IS STILL READABLE SOMEWHERE ─────────────────────────────────────
    L.say(!!why&&why.h>10,geo+': the sentence is still on screen under the board, which is the box he told us to keep',why&&{h:why.h,y:why.y});
    L.say(!!why&&!!bd0&&why.y>=bd0.y+bd0.w-1,geo+': and it is BELOW the board, not over it',{whyY:why&&why.y,boardBottom:bd0&&(bd0.y+bd0.w)});

    // ── #387'S WORK, MOVED HERE: WHICH THING DOES THE CUTTING. ─────────────────────────────────────
    // rev-why-txt is clamped to 3 lines (phone) at a fixed height. A clamp draws an ellipsis; a box with
    // overflow:hidden does not. So the box must never be the shorter of the two, or text is cut silently.
    // Walking plies because sentence length varies per move, and settling past the debounce because on a
    // Brilliant or Great ply _annoWhy GROWS ~450ms after arrival (sacRun) - #387's flakiness lesson.
    const cut=[];
    for(const ply of [9,14,19,21,24,28,31]){
      await R.goPly(b,ply); await b.settle(900);
      const m=await b.page.evaluate(()=>{
        const e=document.querySelector('[data-ct="rev-why-txt"]'); if(!e)return null;
        const cs=getComputedStyle(e);
        return {sh:e.scrollHeight,ch:e.clientHeight,clamp:cs.webkitLineClamp||cs.getPropertyValue('-webkit-line-clamp'),
                ov:cs.overflow,len:(e.textContent||'').trim().length};
      });
      if(m)cut.push({ply,...m,over:m.sh>m.ch+1});
    }
    L.say(cut.length>=6,geo+': the truncation walk actually measured the box at six or more plies',cut.length);
    L.say(cut.every(c=>c.clamp&&c.clamp!=='none'),geo+': the box CLAMPS rather than merely hiding overflow, so when the sentence does not fit an ellipsis is drawn and the user can see there is more. #387: a box with overflow:hidden and no clamp cuts silently',cut.map(c=>c.clamp)[0]);
    // NOT an assertion that nothing is ever truncated - on a phone some sentences genuinely will not fit,
    // and CLAUDE.md says so. This RECORDS how often, because removing the bubble took the roomier of the
    // two readouts away and the honest thing is to publish that number rather than estimate it.
    L.note(geo+': sentence overflows the 3-line box at '+cut.filter(c=>c.over).length+' of '+cut.length+' plies walked (RESIDUAL of removing the bubble, recorded not asserted): '+JSON.stringify(cut.map(c=>({p:c.ply,len:c.len,over:c.over}))));

    // ── ANALYSIS MODE: still no bubble, and now trivially so. Kept because entering analysis is the one
    // state transition that used to be able to resurrect it, and a removed element must stay removed.
    await R.goPly(b,32);
    await b.settle(400);
    const preAna=await rect(b,'[data-ct="rev-why-txt"]');
    L.say(!!preAna&&preAna.text.length>10,geo+': PRECONDITION - ply 32 has a sentence before analysis is entered');
    await b.tapCt('rev-fab',700);
    await b.settle(400);
    const inAna=(await b.texts()).some(x=>/Exit analysis/.test(x));
    L.say(inAna,geo+': PRECONDITION - analysis mode was actually entered from ply 32. An assertion about a state never reached is not an assertion (#385)');
    L.say(!(await seen(b,'[data-ct="coach-bubble"]')),geo+': still no bubble in analysis mode');
    await R.states['analysis-exit'](b);

    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': zero app errors beyond the allowed engine trap',bad.slice(0,3));
    await b.close();
  }
},'COACH-BUBBLE-REMOVED');
