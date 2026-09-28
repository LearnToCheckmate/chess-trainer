// regress/57-pz-solved-explanation.js — TC-R20 / US-R17.
//
// WHY 56 AND NOT 55: this file was written as 55 and RENUMBERED at 21:13Z in the same run. A SECOND
// test-authoring session fired 11 seconds before this one (runledger/test-authoring__1790627870413,
// 20:37:50Z), took jobs/bench-inner-scrollers-invisible-to-the-overflow-rule-2026-09-28 and authored
// gates/regress/55-inner-scroller-fold.js. R02's claim is per JOB, so it separated the two jobs and did
// nothing at all about the shared gate NUMBER — both patches claimed 55 and the second one to land would
// have been silently overwritten or dropped. That session started first, so it keeps 55 and this is 56.
// Filed as jobs/two-lane-runs-can-claim-the-same-gate-number-2026-09-28.
// GUARDS: jobs/build-puzzles-solved-explanation-wraps (Kunal on the Desk, bench-puzzles-solved-explanation,
// "yes"): once a puzzle is SOLVED, the goal card gives its space to the explanation, the explanation WRAPS
// instead of being cut off mid-word, and THE BOARD DOES NOT MOVE.
//
// WHAT WAS MEASURED ON #427 (90abeba, app.js md5 95fa1c00fcc8) BEFORE A LINE OF THIS GATE WAS WRITTEN.
// The 150-character Novice verdict (drive state 'long-solved', PZ[95] = c0, Qd8#):
//   375x730 (Kunal's phone)  box scrollWidth 1215 against clientWidth 362 — 853px of the sentence unreachable,
//                            whiteSpace nowrap, textOverflow ellipsis, reserved height 30. Cut off mid-word.
//   320x568                  scrollWidth 1215 against clientWidth 307 — 908px unreachable. Same branch.
//   390x844                  whiteSpace normal, so it DOES wrap — to 113px — inside a RESERVED BOX OF 74px
//                            with overflow-y:auto. 39px of the sentence sits below the fold of an inner
//                            scroller, and L.over() reads over:0 the whole time.
//   All three               the goal card is 161px (205 at 390) before AND after the solve: it gives up nothing
//                            today. And the board does NOT move (top 207 -> 207 at 375x730), which is the
//                            clause the fix must not break.
//
// THE TRAP THIS GATE IS SHAPED AROUND, and it is this lane's own finding from 2026-09-28 19:11Z
// (jobs/acceptance-criteria-that-the-broken-build-already-passes-2026-09-28): the obvious criterion
// "the box is tall enough for its text" is GREEN ON THE BROKEN BUILD at every geometry. At 375x730
// nowrap makes the text one line, so box.scrollHeight === box.clientHeight; at 390x844 the box really is
// 113px tall and its own scrollHeight fits — the 39px is clipped by its PARENT. So:
//   * D is asserted on the RESERVED PARENT, never on the inner div, and
//   * E counts the characters actually PAINTED INSIDE the reserved box, which is the only assertion here
//     that no partial fix can satisfy, and it is red at all seven geometries today.
// B and C are the two halves of the horizontal defect and are stated separately on purpose: C alone is
// satisfied by NC1 (wrapping allowed, height still pinned at 30) and B alone by nothing, so a fix that
// passes one and not the other is a partial fix and this gate says which half is missing.
//
// GEOMETRIES: the seven in prompts/test-authoring. 375x679 (the harness geometry) is never used.
// INPUTS: 7 geometries x 2 verdict lengths (35 chars and 150 chars) = 14 measured solved states,
// each compared against its own unsolved baseline in the same page.
//
// NOT ASSERTED, DELIBERATELY: the RANK-UP concatenation ('🎉 Solved! … ⬆ Rank up — you reached Novice!',
// 593px in 362 at 375x730) is a WORSE instance filed as jobs/rank-up-verdict-line-is-cut-mid-word-2026-09-28,
// whose cause is the concatenation rather than the 71px this job gives back. Fixing this job may not fix that
// one, so asserting it here would turn this gate red on a CORRECT fix. It is MEASURED AND PRINTED as a note
// at 375x730 instead, so the number is on the record without being a pass condition.
'use strict';
const L=require('../lib');
const Z=require('../drive/puzzles');

// the seven geometries prompts/test-authoring names. 375x679 is the harness, not a phone, and is absent.
const G7=[['320x568',{w:320,h:568,safe:''}],['360x640',{w:360,h:640,safe:''}],['375x667',{w:375,h:667,safe:''}],
          ['375x730 KUNAL',{w:375,h:730,safe:''}],['390x844',{w:390,h:844,safe:''}],['414x896',{w:414,h:896,safe:''}],
          ['440x956',{w:440,h:956,safe:''}]];

// The verdict line, its RESERVED parent, and how much of the sentence is actually painted inside that parent.
// Measurement rule 1: reachability is asserted with elementFromPoint on the visible area, never from docScrollY.
// Measurement rule 2: rects include scale(1.06); every number here is a rect-to-rect comparison inside the same
// transformed subtree, so the scale cancels. No absolute px is claimed across subtrees.
const solved=(b)=>b.page.evaluate(()=>{
  const el=[...document.querySelectorAll('div')].filter(d=>/^\u{1F389}/u.test((d.innerText||'').trim())&&d.children.length===0)[0];
  if(!el)return null;
  const box=el.parentElement;                       // the RESERVED box (fixed height / maxHeight, overflow-y auto)
  const r=el.getBoundingClientRect(), br=box.getBoundingClientRect(), st=getComputedStyle(el), bst=getComputedStyle(box);
  const full=(el.innerText||'').replace(/\s+/g,' ').trim();
  // characters PAINTED INSIDE the reserved box: Range per code point, clipped to the box's own rect.
  let painted=0, total=0, firstLost=null;
  const walk=(n)=>{ if(n.nodeType===3){const s=n.nodeValue; const cps=Array.from(s);
      let off=0;
      for(const cp of cps){ const len=cp.length; if(/\s/.test(cp)){off+=len;total++;painted++;continue;}
        const rg=document.createRange(); rg.setStart(n,off); rg.setEnd(n,off+len);
        const cr=rg.getBoundingClientRect(); off+=len; total++;
        const inside = cr.width>0 && cr.left>=br.left-0.5 && cr.right<=br.right+0.5 && cr.top>=br.top-0.5 && cr.bottom<=br.bottom+0.5;
        if(inside)painted++; else if(firstLost===null)firstLost=total;
      } return; }
    for(const c of n.childNodes)walk(c); };
  walk(el);
  const cx=Math.round(Math.max(br.left,r.left)+Math.min(br.width,r.width)/2);
  const cy=Math.round(Math.max(br.top,r.top)+Math.min(br.height,Math.max(r.height,1))/2);
  const hitEl=document.elementFromPoint(cx,cy);
  return {text:full, len:Array.from(full).length,
    y:+r.top.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2),
    cw:el.clientWidth, sw:el.scrollWidth, ws:st.whiteSpace, to:st.textOverflow,
    boxH:+br.height.toFixed(2), boxCH:box.clientHeight, boxSH:box.scrollHeight, boxOvY:bst.overflowY,
    painted, total, lostFrom:firstLost,
    hit: hitEl===el||el.contains(hitEl)||el===hitEl, hitTag: hitEl?(hitEl.tagName+'.'+(hitEl.getAttribute&&hitEl.getAttribute('data-ct')||'')):null};
});

// the goal card: its own 🎯 line, so the gate can say whether a fix that TAKES its space left it truncated.
const goal=(b)=>b.page.evaluate(()=>{
  const e=[...document.querySelectorAll('div')].find(d=>/^\u{1F3AF} /u.test((d.innerText||'').trim()));
  if(!e)return null; const card=e.parentElement, cr=card.getBoundingClientRect(), er=e.getBoundingClientRect();
  return {t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,40), cardH:+cr.height.toFixed(2),
    lineCW:e.clientWidth, lineSW:e.scrollWidth, lineH:+er.height.toFixed(2), lineSH:e.scrollHeight};
});
const pzTopH=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?+e.getBoundingClientRect().height.toFixed(2):null;});
// How much space the goal card ACTUALLY has to give. The job promises 71px from the benchmark mockup; this
// measures the collapsible part (the motif/level badge row and the gap above it) at each geometry, so the
// build lane sizes the fix from a measurement rather than from the mockup's single number.
const giveable=(b)=>b.page.evaluate(()=>{
  const line=[...document.querySelectorAll('div')].find(d=>/^\u{1F3AF} /u.test((d.innerText||'').trim()));
  if(!line)return null; const card=line.parentElement, cr=card.getBoundingClientRect();
  const rows=[...card.children].map(c=>({t:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,28),h:+c.getBoundingClientRect().height.toFixed(2)}));
  const st=getComputedStyle(card);
  return {cardH:+cr.height.toFixed(2),rows,gap:st.gap,padT:st.paddingTop,padB:st.paddingBottom};
});

// CT_G57 scopes a run to a comma-separated subset of the seven labels (control runs use it; a suite run
// must not set it). A scoped run says so in its own output, so a partial run can never be read as a full one.
const ONLY=(process.env.CT_G57||'').split(',').map(x=>x.trim()).filter(Boolean);

L.run(async()=>{
  if(ONLY.length)L.note('SCOPED RUN: CT_G57='+ONLY.join(',')+' — this is NOT the full seven-geometry sweep.');
  for(const [label,geo] of G7){
    if(ONLY.length&&!ONLY.some(o=>label.indexOf(o)===0))continue;
    for(const [state,kind] of [['train-solved','short 35-char verdict'],['long-solved','long 150-char verdict']]){
      const tag=label+' / '+kind;
      const b=await L.launch({geo,name:'pz55-'+geo.w+'x'+geo.h+'-'+state});await b.open();
      const stamp=await b.stamp();
      L.note(tag+'  bundle on the page: '+stamp);

      // ---- baseline: the SAME puzzle screen unsolved, in the same page, so the board comparison is real
      await Z.states['train'](b);await b.settle(400);
      const m0=await b.metrics(), g0=await goal(b), t0=await pzTopH(b);

      await Z.states[state](b);await b.settle(600);
      const m1=await b.metrics(), g1=await goal(b), t1=await pzTopH(b), v=await solved(b);

      if(!v){L.say(false,tag+': the solve verdict could not be found on screen at all — every assertion below is unmeasured',{state});await b.close();continue;}
      L.note(tag+'  verdict '+v.len+' cp: sw '+v.sw+' vs cw '+v.cw+', ws '+v.ws+', reserved box '+v.boxCH+' / content '+v.boxSH+', painted '+v.painted+'/'+v.total);

      // A — THE CLAUSE THE FIX MUST NOT BREAK. Green today; a "let it grow" fix is what turns it red.
      L.say(!!m0.board&&!!m1.board&&Math.abs(m0.board.top-m1.board.top)<0.6&&Math.abs(m0.board.w-m1.board.w)<0.6,
        tag+' A: the board does not move when the verdict appears (top '+(m0.board&&m0.board.top)+' -> '+(m1.board&&m1.board.top)+', w '+(m0.board&&m0.board.w)+' -> '+(m1.board&&m1.board.w)+')');
      // A2 — pinned, not merely unmoved: gate 39's own lesson, a board that was the wrong size before the
      // first sample passes a before/after comparison (10-gameover, 12 of 12 on a 16px-wrong board).
      // A2's pins are MEASURED on #427, one per geometry, NOT derived from the viewport width. The first
      // draft of this gate asserted min(vw,440) and went red at 320x568 (259), 360x640 (331) and 375x667
      // (342) on a CORRECT build, because the puzzle board is FIT TO HEIGHT at short heights and is
      // narrower than the screen by design. That was a defect in the gate and it is recorded here rather
      // than smoothed over; the wrong figures are withdrawn.
      const WANTB={'320x568':259,'360x640':331,'375x667':342,'375x730 KUNAL':375,'390x844':390,'414x896':414,'440x956':440};
      L.say(!!m1.board&&Math.abs(m1.board.w-WANTB[label])<0.6,
        tag+' A2: and it is the width this geometry measured on #427, not merely unchanged',{measured:m1.board&&m1.board.w,want:WANTB[label]});

      // B — the horizontal half of "cut off mid-word".
      L.say(v.sw<=v.cw+1, tag+' B: the verdict is not cut off across its width (scrollWidth '+v.sw+' <= clientWidth '+v.cw+')',{lost:Math.max(0,v.sw-v.cw)});
      // C — the mechanism that makes B impossible today. Stated separately so a partial fix names itself.
      L.say(v.ws!=='nowrap'&&v.to!=='ellipsis', tag+' C: the verdict is allowed to WRAP rather than being ellipsed on one line',{whiteSpace:v.ws,textOverflow:v.to});
      // D — the vertical half, asserted ON THE RESERVED PARENT. On the inner div this is green on the broken
      // build at every geometry, which is the whole trap named in the header.
      L.say(v.boxSH<=v.boxCH+1, tag+' D: the wrapped verdict fits inside its RESERVED box — no inner scroller hiding the rest (content '+v.boxSH+' <= reserved '+v.boxCH+')',{hidden:Math.max(0,v.boxSH-v.boxCH)});
      // E — THE ONE NO PARTIAL FIX SATISFIES: every character of the sentence is painted inside that box.
      L.say(v.painted===v.total, tag+' E: EVERY character of the explanation is actually painted inside the box ('+v.painted+' of '+v.total+'), so nothing is cut off mid-word',{lostFromChar:v.lostFrom,text:v.text.slice(0,70)});
      // F — the cost guard. The naive fix buys room by pushing the screen; R10 item 6.
      L.say(m1.over.over<=0, tag+' F: and it buys that room without pushing anything off the bottom of the screen (over '+m1.over.over+')',m1.over);
      // G — measurement rule 1: it is not merely laid out, it is hit-testable where it is painted.
      L.say(v.hit===true, tag+' G: the verdict is the element at the centre of its own visible area, not something layered over it',{got:v.hitTag});
      // H — mechanism-neutral: the job gives the goal card's space away, so the card must end up either
      // intact or gone, never present-and-truncated. Written this way so EITHER fix route passes.
      const hOK = (g1===null) || (g1.lineSW<=g1.lineCW+1 && g1.lineSH<=Math.ceil(g1.lineH)+1);
      L.say(hOK, tag+' H: the goal card is either gone or still shows its goal in full — never present and truncated',{before:g0,after:g1});
      L.note(tag+'  pz-top height '+t0+' -> '+t1+'  (the space the explanation is given has to come from inside this column)');
      const gv=await giveable(b);
      L.note(tag+'  GOAL CARD, what it has to give: '+JSON.stringify(gv));

      if(/KUNAL/.test(label)&&state==='long-solved'){
        await b.shot('55-pz-solved-long-kunal730');
        // MEASURED, NOT ASSERTED: the rank-up concatenation, filed separately. See the header.
        try{ await Z.states['rankup-continue'](b); await b.settle(600);
          const rv=await solved(b);
          if(rv)L.note('RANK-UP (measured, NOT a pass condition — jobs/rank-up-verdict-line-is-cut-mid-word-2026-09-28): '+rv.len+' cp, sw '+rv.sw+' vs cw '+rv.cw+', painted '+rv.painted+'/'+rv.total+' :: '+rv.text.slice(0,80));
          else L.note('RANK-UP: the concatenated verdict was not on screen in this state; not measured.');
        }catch(e){L.note('RANK-UP: state not reached ('+String(e.message).slice(0,80)+'); not measured, and not a pass condition.');}
      }
      const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
      L.say(bad.length===0, tag+': no app error beyond the allowed engine trap',bad.slice(0,2));
      await b.close();
    }
  }
},'PZ55-SOLVED-EXPLANATION');
