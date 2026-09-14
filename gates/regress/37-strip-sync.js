// regress/37-strip-sync.js  TC-RL-039, the move strip must follow the board. THE ONLY GUARD ON THIS FIX (#380).
//
// THE DEFECT. The strip scrolls itself to the current ply with a ref on the CURRENT CHIP:
//     const isCur = ply===i+1;   ... <span ref={isCur?(el=>{ ...closest('[data-mstrip]').scrollTo(...) }):undefined}>
// i starts at 0, so isCur is true for ply 1..N and NEVER for ply 0. There is no chip for the start position, so at
// ply 0 nothing pulled the strip back and it kept whatever scrollLeft it already had. Step to the end and tap ⏮ and
// the board says "Start position 0/N" while the strip still shows the last moves of the game - the two halves of the
// same screen disagreeing about where you are. Every other jump re-synced correctly, which is what made this a bug
// and not a design.
//
// MEASURED BEFORE THE FIX, in a clean browser: scrollLeft 1691 at 375x730, 1676 at 390x844, 1776 at 320x568 - in
// each case exactly scrollWidth-clientWidth, i.e. pinned to the far end. After: 0 at all three.
//
// THE FIX gives the container its own conditional ref for the one ply the chips cannot cover, in the same idiom.
//
// WHAT THIS GATE PROVES
//   1. The fixture is real: with the game fully stepped through, the strip IS overflowing and IS scrolled away
//      from the start. A gate that asserts scrollLeft===0 on a strip that never scrolls proves nothing, and that
//      is the shape of green this suite has been fooled by twice.
//   2. ⏮ from the end puts the strip back to 0 while the board reads 0/N.
//   3. So does stepping back from ply 1 with "‹ Prev" - a SECOND, independent path into ply 0. The re-sync must
//      follow the state, not the button that was pressed.
//   4. The chip ref still works: ⏭ from ply 0 scrolls the strip back to the far end. The fix must not pin it at 0.
//   5. The board does not move across any of it. A strip scroll is not a layout event.
//
// BRANCHES COVERED. `revCompact` is a stored user preference (localStorage ct_revCompact, default ON) and it
// changes this very row - it decides whether the strip is flanked by chevron arrows and how much padding it
// carries, so it changes both clientWidth and scrollWidth. Per CLAUDE.md, a gate covers EVERY branch the device or
// the user can select, so this runs compact AND classic at his real phone, plus 320x568 where the strip overflows
// hardest and the row is tightest.
//
// SEEDING CLASSIC IS NOT JUST ct_revCompact=0. A #339 one-time migration overwrites the stored preference on first
// load unless ct_revmig339 is already '1', so a run seeded with ct_revCompact=0 alone silently comes up COMPACT -
// which is what the first version of this gate did, reporting a classic branch it never entered. Both keys are
// seeded, and the branch is then ASSERTED from the painted screen rather than assumed from the seed.
//
// NEGATIVE CONTROL: proved RED against the #379 bundle, the build immediately before the fix, on all three runs -
// the ⏮ assertion fails there with scrollLeft still at the far end (537 of 537 at 375, 622 of 622 at 320).
// Note honestly which assertions do NOT discriminate: the step-forward-then-back path reads 0 on the broken build
// too, because stepping to ply 1 makes chip 1 current and its own ref scrolls the strip to the left edge. It is
// kept as a guard that the fix did not break the path that already worked, not as evidence of the defect.
// See claude/agents/REGRESSION-LOG.md.
'use strict';
const L=require('../lib');

// 16 plies of the Opera Game. Long enough that the strip overflows every geometry under test by a wide margin
// (measured: scrollWidth-clientWidth is over 600px at 375), short enough that three analyses fit the gate budget.
const PGN='[White "Morphy"] [Black "Duke"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 *';

const strip=(b)=>b.page.evaluate(()=>{
  const c=document.querySelector('[data-mstrip]');
  if(!c)return null;
  return {left:Math.round(c.scrollLeft),max:Math.round(c.scrollWidth-c.clientWidth),w:Math.round(c.clientWidth)};
});
// "<ply>/<total>" lives in the nav row next to ⏮/⏭. Read it so every strip claim is anchored to what the BOARD
// says the position is - the whole defect is the two disagreeing, so measuring one without the other is half a
// measurement.
const counter=(b)=>b.page.evaluate(()=>{
  // Scoped to the painted <span> whose OWN text is exactly "<n>/<n>". A regex over the whole screen also matches
  // accuracy and count readouts elsewhere on the card; CLAUDE.md calls a bad selector a reading, not a measurement.
  for(const e of document.querySelectorAll('span')){
    if(e.children.length)continue;
    const t=(e.textContent||'').trim(); const m=/^(\d+)\/(\d+)$/.exec(t);
    if(!m)continue;
    const r=e.getBoundingClientRect(); if(r.width<2||r.height<2)continue;
    return {ply:+m[1],total:+m[2]};
  }
  return null;
});

// One ply forward or back. COMPACT review flanks the strip with chevron arrows (aria-label "Previous move" /
// "Next move"); CLASSIC review has a separate nav row reading "‹ Prev" and "Next ›" and no arrows at all. Both are
// reachable by the same user, so the helper uses whichever this branch actually paints and SAYS which - a gate that
// silently skipped the step on one branch would report a pass it never measured.
const step=async(b,dir)=>{
  const l=b.page.locator('[aria-label="'+(dir>0?'Next move':'Previous move')+'"]');
  if(await l.count()&&await l.first().isVisible().catch(()=>false)){await l.first().click();await b.settle(700);return 'strip arrow';}
  await b.tapText(dir>0?/^Next ›$/:/^‹ Prev$/,{wait:600});await b.settle(700);return dir>0?'"Next ›"':'"‹ Prev"';
};

async function reviewed(b){
  await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN);
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});
  await b.settle(500);
  await b.tapText(/^Start review/,{wait:900}).catch(()=>{});
  await b.settle(600);
}

L.run(async()=>{
  const runs=[
    {geo:'kunal730',compact:'1',what:'his phone, compact review (the stored default)'},
    {geo:'kunal730',compact:'0',what:'his phone, CLASSIC review - ct_revCompact=0, the other branch of this very row'},
    {geo:'se',       compact:'1',what:'320x568, where the strip overflows hardest'},
  ];
  for(const r of runs){
    const tag=r.geo+'/compact'+r.compact;
    L.note('--- '+tag+': '+r.what);
    const b=await L.launch({geo:r.geo,name:'strip-'+r.geo+'-c'+r.compact,store:{ct_pool:'3',ct_revmig339:'1',ct_revCompact:r.compact}});
    await b.open();
    await reviewed(b);

    // The branch, measured. Compact paints the chevron arrows beside the strip; classic paints none and carries a
    // "‹ Prev" / "Next ›" nav row instead. Asserting it here is what stops this gate from running the same branch
    // three times and calling it coverage.
    const arrows=await b.page.locator('[aria-label="Next move"]').count();
    L.say(r.compact==='1'?arrows>0:arrows===0,tag+': the run is genuinely in '+(r.compact==='1'?'COMPACT':'CLASSIC')+' review - strip chevrons present: '+arrows,{arrows});

    const s0=await strip(b),c0=await counter(b);
    L.say(!!s0,tag+': the move strip is on the review screen',s0);
    const m0=await b.metrics();

    // --- to the end of the game. This is what leaves the strip scrolled away.
    await b.tapText(/^⏭$/,{wait:900});
    await b.settle(900);
    const sEnd=await strip(b),cEnd=await counter(b);
    L.say(!!sEnd&&sEnd.max>200,tag+': THE FIXTURE IS REAL - the strip overflows its box by '+(sEnd&&sEnd.max)+'px, so "scrolled to 0" is a claim that can fail',sEnd);
    L.say(!!sEnd&&sEnd.left>sEnd.max*0.5,tag+': at the last ply the strip really is scrolled away from the start (left '+(sEnd&&sEnd.left)+' of '+(sEnd&&sEnd.max)+')',{strip:sEnd,counter:cEnd});

    // --- 2. ⏮ : the reported path into ply 0
    await b.tapText(/^⏮$/,{wait:900});
    await b.settle(1200);
    const sTop=await strip(b),cTop=await counter(b);
    L.say(!!cTop&&cTop.ply===0,tag+': ⏮ put the BOARD at the start position',cTop);
    L.say(!!sTop&&sTop.left===0,tag+': and the STRIP is back at the start too (scrollLeft '+(sTop&&sTop.left)+', was '+(sEnd&&sEnd.left)+' before the tap). This is the defect: ply 0 has no chip, so nothing used to pull the strip back.',{strip:sTop,counter:cTop});
    const mTop=await b.metrics();
    // #384 (derived test-lane item 6): the board-movement assertion nearby compares two MEASURED values and
    // nothing else, so it is true of a board that has been the wrong size since before the first sample. That is
    // exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. Pinned for the same reason; measured on #383.
    const WANTW={'kunal730/compact1':349,'kunal730/compact0':336,'se/compact1':264};
    if(WANTW[tag]!=null)L.say(!!mTop.board&&Math.abs(mTop.board.w-WANTW[tag])<0.6,tag+': the review board is '+WANTW[tag]+' wide - the measured size for this geometry AND this branch, so a board wrong from the start cannot pass here',{measured:mTop.board&&mTop.board.w,want:WANTW[tag]});
    L.say(!!m0.board&&!!mTop.board&&Math.abs(m0.board.w-mTop.board.w)<0.6&&Math.abs(m0.board.top-mTop.board.top)<0.6,
          tag+': the board did not move across the end-and-back trip (w '+(m0.board&&m0.board.w)+' -> '+(mTop.board&&mTop.board.w)+', top '+(m0.board&&m0.board.top)+' -> '+(mTop.board&&mTop.board.top)+')');

    // --- 4. the chip ref still works: forward again must scroll the strip back to the far end
    await b.tapText(/^⏭$/,{wait:900});
    await b.settle(1200);
    const sBack=await strip(b);
    L.say(!!sBack&&sBack.left>sBack.max*0.5,tag+': ⏭ scrolls the strip forward again - the container ref fires only at ply 0 and does not pin the strip there',sBack);

    // --- 3. the SECOND path into ply 0: step back one ply at a time. The re-sync must track the STATE.
    await b.tapText(/^⏮$/,{wait:600});await b.settle(700);
    const via=await step(b,1);
    const c1=await counter(b);
    await b.settle(500);
    await step(b,-1);await b.settle(1200);
    const sPrev=await strip(b),cPrev=await counter(b);
    L.note(tag+': the second path stepped with '+via);
    L.say(!!c1&&c1.ply===1,tag+': one step forward from the start really did reach ply 1, so the step back below is measured and not skipped',c1);
    L.say(!!cPrev&&cPrev.ply===0,tag+': stepping back one ply from ply 1 reaches the start position again',cPrev);
    L.say(!!sPrev&&sPrev.left===0,tag+': reached that way the strip is at 0 as well - the re-sync follows the POSITION, not the ⏮ button',{strip:sPrev,counter:cPrev});

    const mEnd=await b.metrics();
    // What this gate owns is that a strip scroll stays INSIDE the strip: the document itself must never gain a
    // scroll from it. `over` is asserted only on the compact screen, which is the one-screen layout and is meant to
    // fit. The CLASSIC screen is the pre-#337 long layout and measures over=393 at 375x730 on the #379 bundle, i.e.
    // before this change and unrelated to it - noted with its number rather than asserted, because a gate that
    // fails on a pre-existing condition it did not cause blocks every later build. Filed as a finding instead.
    L.say(mEnd.over.docScroll===0,tag+': the document itself does not scroll - the strip scrolls inside its own box',mEnd.over);
    if(r.compact==='1')L.say(mEnd.over.over<=0,tag+': the compact review screen still fits its viewport after all of that',mEnd.over);
    else L.note(tag+': classic review lays out '+mEnd.over.over+'px past the viewport (bottom '+mEnd.over.bottom+' vs vh '+mEnd.over.vh+'). PRE-EXISTING: measured identically on #379, before this change. Not asserted here; see FEEDBACK-INBOX.md.');
    await b.shot('strip-'+r.geo+'-c'+r.compact+'-ply0');
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,tag+': no app error beyond the allowed engine trap',bad.slice(0,2));
    await b.close();
  }
},'STRIP-SYNC');
