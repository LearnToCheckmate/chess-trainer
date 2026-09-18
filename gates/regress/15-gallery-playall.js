// regress/15-gallery-playall.js  THE RECORDING-FREE GALLERY GATE (Kunal's feedback session, flag
// uat372-headless-run, 2026-09-12 22:30 ET: "the whole Play-all runs headlessly in real Chromium ... this is the
// shape the daily UAT check now takes: Playwright, not a phone recording ... worth committing under gates/").
// Drives "▶ Play all N" from Home at his geometry and at 375x812, sampling every 700 ms: every card's caption is
// reached in order with its item id, no card leaves a page scroll, the board (where a card shows one) never shrinks
// within a card, the run ends on the green RECORDING COMPLETE frame, and there are no app errors beyond the one
// allowed engine trap (#356). A phone is slower than this container, so the gate asserts ORDER and COMPLETION,
// never wall-clock; the per-card checkpoints live in 14-uat-review-card.js.
//
// #416: THE BASELINE USED TO BE THE UNSETTLED FRAME, AND THAT IS WHY THIS GATE REDDENED A GOOD BUILD ABOUT ONE
// FULL RUN IN SEVEN (flag gate15-baseline-is-the-unsettled-frame-2026-09-18, six green and one red on one
// verified-identical bundle). The old loop did `if(cap!==cur){cur=cap;curBoard=null;}` and then took curBoard from
// the FIRST sample under the new caption - systematically the frame least likely to be settled, because the caption
// changes at the moment the card sets its state up. Re-measured here at 40ms on the #415 bundle in ONE atomic
// evaluate per sample, card 1/8 (k10) at 375x679: the board is 375.03 with over=12 at the first post-caption sample
// and 351.03 with over=0 from 88ms on, holding for the remaining 296 samples of that card; every other card in the
// walk holds ONE width for its whole duration. So the transient is real - a ~130ms, 24px painted jump on ENTERING
// that card, which is the gallery mounting a pre-set-up state, and the #415 antagonist measured the only
// user-reachable analogue (playing into mate) and found NO jump there - and reading a baseline out of it made the
// settled value look like a shrink. Both reds came from that one frame: `over 12` and `375 -> 351`.
// THE SAME WALK AT 375x812 HAS NO TRANSIENT AT ALL: card 1/8 is 375.03 with over=0 from its first frame, because
// at 812 there is height enough that the pre-setup width IS the settled one. So the flake this fixes was only ever
// reachable at the shorter geometry, on the one card whose board is fit to a height that binds. Two other facts
// out of the same 3336-sample sweep, both of which the fix has to respect: card 6/8 US-R01 shows NO BOARD for the
// first 11.5s of its 52s (so an entry-window baseline alone would silently stop covering that card, which is why
// the late baseline below exists), and cards 7/8 and 8/8 report 349.03 - the review board still mounted UNDER the
// Home overlay, since this app keeps several screens mounted at once (#393). Every other card holds one width.
//
// WHAT REPLACED IT. On every caption change the gate reads the board every 50ms for a FIXED 900ms and takes the
// baseline from the TAIL of that series: the last run of reads agreeing within 0.6px must span at least 250ms. It
// deliberately does NOT stop at the first value that holds for 250ms - that is the same thing as trusting the first
// stable-looking value, and a transient LONGER than the hold would then be taken as settled. Reading to the end of
// the window instead sees through any transient shorter than 900-250 = 650ms, and a card still moving at 900ms is
// REPORTED by its own assertion rather than silently baselined. tailStable() is a pure function over the read
// series and FIXTURE unit-tests it against the shapes this walk can produce including the ones it must reject (the
// #391 rule) - which is how the alternative the flag proposed was ruled out: "require the shrink to persist across
// two consecutive samples" DOES NOT FIX THIS, because the transient is the BASELINE and the shrink to the settled
// value persists for ever, so a persistence filter keeps the false red. Every run also NOTES what the old baseline
// would have said, taken from reads[0] of the same series, so the log carries the before-and-after rather than an
// argument about it. And the sample that feeds an assertion is now bracketed by two caption reads: b.metrics() is
// two evaluates, so without that guard a caption change between them attributes card N+1's setup frame to card N.
//
// WHY THE CAPTION IS NOW POLLED EVERY 60ms AND NOT EVERY 700. The first version of this fix kept the 700ms poll,
// and its first run showed why that will not do: it recorded card 1/8's first read as 351.03, the SETTLED value,
// because a 700ms-quantised poll detects the caption change up to 700ms after it happens and so usually starts
// reading after the transient has gone. That is the lucky six-in-seven, and a gate that dodges the state it
// guards against six times in seven is not evidence about the seventh (#385: when an assertion is about a state,
// prove the state was entered). Polling at 60ms means reads[0] lands inside the ~130ms transient every time, so
// at 375x679 the log shows "first read 375.03, settled baseline 351.03" on EVERY run - the old baseline and the
// new one side by side, on the same series, from the same run. The 700ms cadence of the assertion samples is
// unchanged; only the caption watch is fast.
//
// AND THE HEADLINE ASSERTION WAS ASSERTING NOTHING. "Every card was reached in order" was `seen.length>=N`,
// which checks neither reaching nor order: card 6/8 alone emits SEVEN sub-captions, so this walk's 16 captions
// clear a bar of 8 with six of the eight cards missing. It is the alternation-that-matches-every-branch fault
// (#388) in arithmetic form, on the claim this gate exists to make. walkOk() now parses the n/N token out of
// every caption and requires the totals to agree with the gallery's own card count, the numbers to be
// non-decreasing, and every card 1..N to appear; WFIX unit-tests it against five lists it must REJECT, one of
// which (W4) is exactly the nine-caption list that satisfied the old bar.
//
// WHAT THIS GATE STILL CANNOT SEE, stated rather than left to be discovered as a fresh defect - and the first
// version of this paragraph got its own coverage claim wrong, which the #416 antagonist measured.
// (i) A shrink INSIDE the 900ms entry window is invisible: brief, and the tail absorbs it; sustained for 250ms at
// the end of the window, and it BECOMES the baseline. That is the unavoidable price of not reading the expected
// value out of an unsettled frame, and it is bounded - 900ms of a card that runs 5 to 52s.
// (ii) A board that is the WRONG SIZE for its whole card passes everything here, because every assertion is
// relative to the card's own settled width. This paragraph used to say that absolute board size "is pinned in
// 35-width-containment, 46-play and 48-lesson-flow" - and NONE OF THOSE THREE GATES RUNS AT EITHER OF THIS
// GATE'S GEOMETRIES: 35 runs se/short375/kunal730, 46 se/kunal730/390, 48 se/kunal730/390 plus four short
// columns, and `812` appears in gate 35 only inside a comment. That is the "it is covered elsewhere" excuse
// CLAUDE.md warns about, written by the session that had just added the rule about it. What DOES pin an absolute
// board width at 375x679, checked file by file: 10-gameover.js:25 `WANT={kunal:351}` (card 1/8's state),
// 13-play-after-moves.js:27 `PIN={kunal:{card:{w:351}}}` (card 2/8), 11-lesson.js:13 demo end 375 wide (cards
// 3/8 and 4/8), 12-hint.js:16 `WANT={kunal:375}` (card 5/8), and 20-review.js:80 with 14-uat-review-card.js:21
// both at 349 (card 6/8). AT 375x812 NOTHING IN THE SUITE PINS AN ABSOLUTE BOARD WIDTH - this gate is the only
// file under gates/regress/ that visits that viewport at all. So (ii) is genuinely uncovered there, and saying
// so is the point. The numbers to pin if the next session wants to close it are in the header above (375x679:
// card 1/8 351.03, cards 3-5 375.03, cards 6-8 349.03; 375x812: 375.03 then 349.03).
// (iii) What (ii) does NOT excuse, and what the population assertion below now catches: a board that is ABSENT.
// Every board check here is conditioned on `m.board` existing, so `display:none` on the grid used to give
// 24 pass / 0 fail with the log printing "2 of 15 captions had a board" and nothing reading that number -
// the count-with-no-assertion fault, measured by the #416 antagonist with a control it wrote itself.
// `CT_G15_NC=hide` and `=hideEntry` are that control, kept. The assertion is pinned to the MECHANISM (the only
// boardless caption is the one whose text is "Starting...") rather than to a count with slack, because "at
// least 13 of 15" was the first draft and one caption of slack is how a frozen denominator starts.
// (iv) The shrink check is ONE-SIDED (`w < base - TOL`), so a board that GROWS mid-card and returns is
// invisible, and CLAUDE.md's rule is that the board must never JUMP. A running max over each card's settled
// samples would catch it; nothing in this walk grows (one width per caption, measured over 32,000+ samples at
// 1x/4x/6x throttling across both geometries), so it is a gap in the argument rather than a missed defect.
// (v) Latent: `tailStable` reports `why:'no board'` when the LAST read is null even if the board was present
// for the rest of the window, and such a card lands in `noBase` and reds with a misleading reason. Not
// reachable here - no caption group in five 40ms sweeps has a board present early and null later.
//
// ── CONTROL-RECORD lines, the machine-readable form gates/control-audit.js reads (#418). One per control, and
// every one of these numbers was produced by the command in the block below, on this file at 955501e. `scope`
// is mandatory and is why the format exists: all SEVEN ran at 375x679 only, where this gate runs 25 of its 36
// assertions, and a count without its scope is not evidence (#411, where two of six published control counts
// turned out to be subset runs nobody could reproduce).
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=0 scope=env:CT_G15_GEOS=kunal how=shipped bundle, no injection - the baseline the other six are read against
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board width+height+squares cut 24px from card 2 on, persistent
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=a laid-out 14px child appended to #root
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=2 scope=env:CT_G15_GEOS=kunal how=board width flipped every 60ms so no 900ms window has a settled tail
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none after the entry window - the hole the antagonist found
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none before the entry window
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=body forced out of position:fixed with 3000px appended, so the page really scrolls
//
// THE CONTROLS, each with the command that reproduces its count (#412: publish the command with the number).
// Measured on the shipped #415 bundle (app.js md5 6f42b141eac4), 2026-09-18, all at 375x679:
//   CT_G15_GEOS=kunal node gates/regress/15-gallery-playall.js                     -> 24 pass, 0 fail  (shipped)
//   CT_G15_GEOS=kunal CT_G15_NC=shrink    node gates/regress/15-gallery-playall.js -> 24 pass, 1 fail
//        the fail is "no board shrinks inside a card", card 2/8, base 351.03 -> 327 on three consecutive samples
//   CT_G15_GEOS=kunal CT_G15_NC=over      node gates/regress/15-gallery-playall.js -> 24 pass, 1 fail
//        the fail is "no card leaves the page scrolling", card 2/8, over 14 on three consecutive samples
//   CT_G15_GEOS=kunal CT_G15_NC=unsettled node gates/regress/15-gallery-playall.js -> 23 pass, 2 FAILS, and both
//        of them are right: the settle assertion goes red ("settled only 0ms", reads alternating 351.03/327.03),
//        and so does the baseline-population one, because a card whose width never settles gets no baseline while
//        its board plainly WAS on screen. The two are coupled on purpose - that is the pairing that stops an
//        unsettled card from being quietly dropped from the shrink check instead of reported.
//   CT_G15_GEOS=kunal CT_G15_NC=hide       ... -> the population assertion reds ("2 of 15 captions had a board")
//   CT_G15_GEOS=kunal CT_G15_NC=hideEntry  ... -> the same, "1 of 15"
//   CT_G15_GEOS=kunal CT_G15_NC=pagescroll ... -> the page-scroll assertion reds (body position:static)
//   With no CT_G15_GEOS the gate runs both geometries.
//
// INDEPENDENTLY REPRODUCED by the #416 antagonist on its own instrument (an in-page 40ms sampler recording
// [performance.now(), width, caption] in one synchronous callback, 32,000+ samples over five sweeps): the
// transient's end at 89ms against the 88ms in this header; 113ms under 4x CPU throttling and 134ms under 6x, so
// the worst transient anywhere in the walk is 134ms against this window's 650ms limit; card 6/8's board first
// appearing at 13.1s (1x), 22.6s (4x), 14.4s (6x) of its 51.9s, which is what the late baseline exists for; and
// every other caption holding exactly one width at every geometry and every throttle rate. Runtime, back to
// back on the same machine: this gate 294s against the old one's 296s for the same walk, because the wall clock
// is set by the app's own 5-88s holds and the read windows happen inside them.
// THE MARGIN ON reads[0] IS ABOUT 60ms and that is worth knowing: detection is within one 60ms TICK of the
// caption change and the transient runs to 89-134ms, so the note is not guaranteed for ever - but the failure
// mode is a missing LOG NOTE, never a red, and it held on 5 of 5 runs plus the suite's own.
//
// WHY ct_pool IS FORCED TO 3 HERE (asked and answered at #416, not left for the next reader to re-derive):
// determinism on card 6/8, which is a 52-second engine-bound review. The branch it skips is covered where it
// matters - 33-reproducible-review.js run C forces ct_pool=1 and asserts the single-worker review returns the
// same verdicts, and 23-full-walk.js drives this same gallery with NO override, so the device-chosen branch
// runs there. Measured at #416: forcing ct_pool=1 here gives 24 pass / 0 fail with the transient still caught,
// because pool size changes analysis speed, not geometry.
// Each NC injects a REAL layout change AT card CT_G15_NC_CARD (default 2) and then LEAVES IT IN PLACE for the rest
// of the run - the injected `<style id="ct-nc">` is never removed - so these are global from that card on, not
// per-card. That wording matters, because it is why only card 2/8 ever reds for `shrink` and `over`: every later
// card takes its baseline AFTER the injection and so measures the broken board as its own settled width. That is
// blind spot (ii) above, demonstrated by the controls themselves rather than argued.
// `shrink` takes 24px off the board's width, height and squares, which is the persistent shrink this gate exists
// to catch; `over` appends a laid-out 14px child to #root; `unsettled` flips the board's width every 60ms so the
// 900ms read window never has a settled tail; `hide` and `hideEntry` remove the board entirely, after and before
// the entry window, which is the control for the population assertion; `pagescroll` forces `body` out of
// `position:fixed` and appends 3000px to it, which is the control for the page-scroll mechanism. The first draft of `shrink`
// overrode only `grid-template-columns` and the board's rect did not move at all - the box is fixed by an inline
// `width:boardPx` on the same element - so the control injected something real and measured nothing, which is
// #384's rule ("the numbers moved" is not enough) failing one step earlier still: the numbers had not moved.
'use strict';
const L=require('../lib');

const TOL=0.6, HOLD=250, WIN=900, STEP=50, TICK=60;
const PINNED_IDS='1 k10|2 k8|3 k11|4 k11|5 A-06|6 US-R|7 y3|8 y3';

// tailStable(reads,hold,tol): reads are [{w,ms}] in poll order. The baseline is the value at the END of the read
// window, and it counts as settled only if the run of reads agreeing with it within tol spans >= hold ms.
// Pure, so FIXTURE below can test it against the shapes the walk produces and the ones it must reject.
function tailStable(reads,hold,tol){
  if(!reads.length)return {ok:false,why:'no reads'};
  const last=reads[reads.length-1];
  if(last.w===null||!isFinite(last.w))return {ok:false,why:'no board'};
  let i=reads.length-1;
  while(i>0&&reads[i-1].w!==null&&isFinite(reads[i-1].w)&&Math.abs(reads[i-1].w-last.w)<=tol)i--;
  const heldMs=last.ms-reads[i].ms;
  return {ok:heldMs>=hold,w:last.w,fromMs:reads[i].ms,heldMs,why:heldMs>=hold?null:'settled only '+heldMs+'ms'};
}
const mk=(pairs)=>pairs.map(p=>({w:p[0],ms:p[1]}));
const ser=(w,a,b,step)=>{const o=[];for(let t=a;t<=b;t+=step)o.push({w,ms:t});return o;};
// Each fixture is a read series at 50ms and what tailStable MUST say about it. F1 is the shape measured on card
// 1/8; F3 is why the window is read to its end; F4/F5/F7 are what must never be silently baselined.
const FIXTURE=[
  ['F1 the measured card-1/8 shape: 375 for three reads then 351 to the end',
   mk([[375.03,0],[375.03,50],[375.03,100]]).concat(ser(351.03,150,900,50)),{ok:true,w:351.03,fromMs:150}],
  ['F2 already settled for the whole window',ser(351.03,0,900,50),{ok:true,w:351.03,fromMs:0}],
  ['F3 a transient LONGER than the hold (300ms) is still seen through, because the tail is what counts',
   ser(375.03,0,300,50).concat(ser(351.03,350,900,50)),{ok:true,w:351.03,fromMs:350}],
  ['F4 a width still moving at the end of the window is NOT settled',
   mk([[375,0],[351,50],[375,100],[351,150],[375,200],[351,250],[375,300],[351,350],[375,400],[351,450],[375,500],[351,550],[375,600],[351,650],[375,700],[351,750],[375,800],[351,850],[375,900]]),{ok:false}],
  ['F5 a tail that has only held 100ms is NOT settled',ser(375,0,800,50).concat(mk([[351,850],[351,900]])),{ok:false}],
  ['F6 sub-pixel jitter inside the tolerance IS settled',
   mk([[351.03,0],[351.5,50],[351.03,100],[350.9,150]]).concat(ser(351.03,200,900,50)),{ok:true,w:351.03,fromMs:0}],
  ['F7 a card with no board on screen yields no baseline rather than a zero one',ser(null,0,900,50),{ok:false}],
  ['F8 the settled value is the LAST one even when an earlier value held longer',
   ser(375,0,600,50).concat(ser(351,650,900,50)),{ok:true,w:351,fromMs:650}],
];

// walkOk(caps,N): the captions this walk produced, in order, against the gallery's own card count. The old
// assertion for "every card was reached in order" was `seen.length>=N`, which checks NEITHER: card 6/8 alone
// emits seven sub-captions, so nine captions out of two cards satisfied it and the gate could go green having
// skipped most of the gallery. W4 below is exactly that list. Pure, so the FIXTURE tests it against lists it
// must reject as well as the one this walk really produces (#391).
function walkOk(caps,N){
  const ns=[];
  for(const c of caps){const m=String(c||'').match(/·\s*(\d+)\/(\d+)\s*·/);if(!m)continue;
    if(Number(m[2])!==N)return {ok:false,why:'caption says '+m[1]+'/'+m[2]+' but the gallery holds '+N,ns};
    ns.push(Number(m[1]));}
  if(!ns.length)return {ok:false,why:'no caption carried an n/N token',ns};
  for(let i=1;i<ns.length;i++)if(ns[i]<ns[i-1])return {ok:false,why:'card '+ns[i]+' came after card '+ns[i-1],ns};
  for(let n=1;n<=N;n++)if(!ns.includes(n))return {ok:false,why:'card '+n+' never appeared',ns};
  return {ok:true,ns};
}
const CAPS8=['🎬 #415 · 375x679 Starting…','🎬 #415 · 1/8 · k10 · 375x679 game over','🎬 #415 · 2/8 · k8 · 375x679 four plies',
  '🎬 #415 · 3/8 · k11 · 375x679 demo end','🎬 #415 · 4/8 · k11 · 375x679 practice','🎬 #415 · 5/8 · A-06 · 375x679 hint',
  '🎬 #415 · 6/8 · US-R01 · 375x679 Review','🎬 #415 · 6/8 · US-R03 · 375x679 Summary','🎬 #415 · 6/8 · US-R04 · 375x679 Move',
  '🎬 #415 · 6/8 · US-R06 · 375x679 10.Nxb5','🎬 #415 · 6/8 · k12 · 375x679 17.Rd8#','🎬 #415 · 6/8 · US-R07 · 375x679 Analysis',
  '🎬 #415 · 6/8 · US-R09 · 375x679 Exit','🎬 #415 · 7/8 · y3 · 375x679 Layout','🎬 #415 · 8/8 · y3 · 375x679 Home',
  '🎬 #415 · 8/8 · END · 375x679 RECORDING COMPLETE'];
const WFIX=[
  ['W1 the list this walk really produces, sub-captions and the END frame included',CAPS8,8,true],
  ['W2 a gallery card that never played is rejected',CAPS8.filter(c=>!/·\s*5\//.test(c)),8,false],
  ['W3 cards out of order are rejected',[CAPS8[1],CAPS8[3],CAPS8[2]].concat(CAPS8.slice(4)),8,false],
  ['W4 THE HOLE THE OLD `seen.length>=N` LEFT: nine captions from two cards satisfied it and must not satisfy this',
   [CAPS8[1]].concat(CAPS8.slice(6,13),[CAPS8[15]]),8,false],
  ['W5 a caption whose total disagrees with the gallery count is rejected',CAPS8.map(c=>c.replace('/8 ·','/9 ·')),8,false],
  ['W6 no n/N token anywhere is rejected rather than passing vacuously',[CAPS8[0],CAPS8[0]],8,false],
];
// the page CANNOT scroll, and the reason is not the one this gate used to give. index.html sets
// `body{position:fixed;inset:0}`, so documentElement has no scrollable content whatever anyone adds to it -
// measured by the #416 antagonist: 3000px injected into #root gives over=3000 and docScroll STILL 0, and
// docScroll only moves once `body{position:static}` is forced. So asserting docScroll===0 is inert by
// construction and cannot be controlled; assert the MECHANISM instead, which is a positive claim and flips
// under CT_G15_NC=pagescroll.
const PAGEFIX=(b)=>b.page.evaluate(()=>{const r=document.getElementById('root');
  return {bodyPos:getComputedStyle(document.body).position,rootOv:r?getComputedStyle(r).overflowY:null,
    docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight)};});
const CAP=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rec-cap"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
// read the board every STEP ms for exactly WIN ms, then take the tail. Uses b.board() so the width is measured by
// the one harness library and cannot drift from what the assertions compare against.
async function settleBoard(b){
  const reads=[];const t0=Date.now();
  for(;;){
    const bd=await b.board();
    reads.push({w:bd?Math.round(bd.w*100)/100:null,ms:Date.now()-t0});
    if(Date.now()-t0>=WIN)break;
    await b.settle(STEP);
  }
  return {st:tailStable(reads,HOLD,TOL),reads};
}
const NC=process.env.CT_G15_NC||'';
const NC_CARD=process.env.CT_G15_NC_CARD||'2';
async function inject(b,kind){
  return b.page.evaluate((k)=>{
    const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.getBoundingClientRect().width)best=e;}
    if(k==='over'){const d=document.createElement('div');d.style.height='14px';d.textContent='.';document.getElementById('root').appendChild(d);return 'appended a laid-out 14px child to #root';}
    if(k==='pagescroll'){const st2=document.createElement('style');st2.id='ct-nc';
      st2.textContent='body{position:static!important;height:auto!important}html,body{overflow:auto!important}';document.head.appendChild(st2);
      const d=document.createElement('div');d.style.height='3000px';d.textContent='.';document.body.appendChild(d);
      return 'body forced out of position:fixed and 3000px appended to it - the page really can scroll now';}
    if(k==='hide'||k==='hideEntry'){const st3=document.createElement('style');st3.id='ct-nc';
      st3.textContent='div[style*="repeat(8"]{display:none!important}';document.head.appendChild(st3);
      return 'the board grid is display:none from here on - no board at all, not merely a smaller one';}
    if(!best)return 'NO BOARD TO INJECT INTO';
    const w0=best.getBoundingClientRect().width, sq=w0/8;
    // the board carries BOTH `grid-template-columns:repeat(8,SQpx)` AND an inline `width:boardPx` (chess.jsx:6537),
    // and it is the WIDTH that fixes its rect - overriding the columns alone left the box at 375.03 and the first
    // version of this control injected nothing measurable. So set the box and the squares together.
    const rule=(w)=>'div[style*="repeat(8"]{width:'+w+'px!important;height:'+w+'px!important;'+
      'grid-template-columns:repeat(8,'+(w/8)+'px)!important;grid-template-rows:repeat(8,'+(w/8)+'px)!important}';
    const st=document.createElement('style');st.id='ct-nc';document.head.appendChild(st);
    if(k==='shrink'){st.textContent=rule(w0-24);return 'board '+w0.toFixed(2)+' -> '+(w0-24).toFixed(2)+'px, squares '+sq.toFixed(2)+' -> '+((w0-24)/8).toFixed(2)+'px, and it STAYS there';}
    if(k==='unsettled'){let f=0;setInterval(()=>{f++;st.textContent=rule(f%2?w0-24:w0);},60);return 'board flipping '+w0.toFixed(2)+'/'+(w0-24).toFixed(2)+'px every 60ms';}
    return 'unknown NC '+k;
  },kind);
}

L.run(async()=>{
  for(const f of FIXTURE){
    const got=tailStable(f[1],HOLD,TOL),want=f[2];
    const ok=got.ok===want.ok&&(!want.ok||(Math.abs(got.w-want.w)<1e-9&&got.fromMs===want.fromMs));
    L.say(ok,'tailStable unit: '+f[0],{got:{ok:got.ok,w:got.w,fromMs:got.fromMs,heldMs:got.heldMs,why:got.why},want});
  }
  for(const f of WFIX){
    const got=walkOk(f[1],f[2]);
    L.say(got.ok===f[3],'walkOk unit: '+f[0],{ok:got.ok,why:got.why,ns:got.ns});
  }
  const ALL=[['kunal','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}]];
  const pick=(process.env.CT_G15_GEOS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(pick.length){const bad=pick.filter(p=>!ALL.some(a=>a[0]===p));if(bad.length)throw new Error('CT_G15_GEOS: unknown geometry '+bad.join(','));}
  const GEOS=pick.length?ALL.filter(a=>pick.includes(a[0])):ALL;
  L.note('geometries: '+GEOS.map(g=>g[0]).join(' ')+(pick.length?'  (CT_G15_GEOS subset)':'')+(NC?'   NEGATIVE CONTROL '+NC+' at card '+NC_CARD:''));
  for(const [lab,geo] of GEOS){
    const b=await L.launch({geo,name:'playall-'+lab,store:{ct_pool:'3'}});await b.open();
    const titles=await b.cardTitles();const N=titles.length;
    // PINNED, not a floor. `N>=6` was two cards of slack, and since walkOk takes N from this same call both
    // sides moved together: delete two cards from SC and N would be 6, every caption would read /6, and the
    // gate would go green having walked six. A deliberate change to the gallery updates this line on purpose.
    // measured off b.cardTitles(), not guessed: card 6's own id is `US-R`, while its seven mid-walk steps
    // re-caption as US-R01, US-R03 and so on. My first draft of this pin wrote US-R01 from the walk's
    // captions and would have gone red on a healthy build.
    const ids=titles.map(t=>t.split(' · ').slice(0,2).join(' '));
    L.say(N===8&&ids.join('|')===PINNED_IDS,
      lab+': the gallery holds its pinned eight cards in order ('+N+')',ids);
    await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.click();await b.settle(400);
    await b.page.locator('button',{hasText:/^▶ Play/}).first().click();
    const seen=[];let done=false;const scrolled=[],shrunk=[],pageScroll=[],unsettled=[],cards=[];
    let cur=null,base=null,raced=0,sampled=0,lateBase=0;
    let lastSample=Date.now();
    for(let i=0;i<4000;i++){                                  // runaway guard only; the walk breaks on RECORDING COMPLETE
      const cap=await CAP(b);
      if(cap&&cap!==cur){
        cur=cap;seen.push(cap);
        if(/RECORDING COMPLETE/i.test(cap)){done=true;break;}
        if(NC&&new RegExp('·\\s*'+NC_CARD+'/').test(cap)&&(NC==='unsettled'||NC==='hideEntry'))L.note('NC '+NC+': '+await inject(b,NC));
        const s=await settleBoard(b);base=s.st.ok?s.st.w:null;
        const first=s.reads[0].w;
        // what the OLD baseline (the first post-caption frame) would have been, from the same series
        const oldBase=first, oldWouldRed=(oldBase!==null&&base!==null&&base<oldBase-TOL);
        cards.push({cap:cap.slice(0,34),first,base,settleMs:s.st.ok?s.st.fromMs:null,oldWouldRed,
          sawBoard:s.reads.some(r=>r.w!==null&&isFinite(r.w))});
        L.note(lab+' card "'+cap.slice(0,34)+'": first read '+first+', settled baseline '+base+
          (s.st.ok?' (held from '+s.st.fromMs+'ms of the 900ms window)':' NOT SETTLED: '+s.st.why)+
          (oldWouldRed?'   <- the OLD first-frame baseline would have reported a shrink of '+(oldBase-base).toFixed(2)+'px here':''));
        if(!s.st.ok&&s.st.why!=='no board')unsettled.push({cap:cap.slice(0,34),why:s.st.why,reads:s.reads.map(r=>r.w).slice(0,20)});
        if(NC&&new RegExp('·\\s*'+NC_CARD+'/').test(cap)&&NC!=='unsettled'&&NC!=='hideEntry')L.note('NC '+NC+': '+await inject(b,NC));
        lastSample=Date.now();continue;
      }
      if(cap&&/RECORDING COMPLETE/i.test(cap)){done=true;break;}
      if(Date.now()-lastSample<700){await b.settle(TICK);continue;}
      lastSample=Date.now();
      const m=await b.metrics();
      if(await CAP(b)!==cur){raced++;continue;}                // metrics is two evaluates; do not attribute across a change
      if(!cur)continue;
      sampled++;
      if(m.over.over>0.5)scrolled.push({cap:cur.slice(0,34),over:m.over.over});
      const pf=await PAGEFIX(b);
      if(pf.bodyPos!=='fixed'||!/^(auto|scroll)$/.test(String(pf.rootOv))||pf.docScroll>0)
        pageScroll.push(Object.assign({cap:cur.slice(0,34)},pf));
      const rec=cards[cards.length-1];
      if(m.board&&rec)rec.sawBoard=true;
      if(m.board&&base===null&&rec&&(rec.lateTried||0)<2){    // the board arrived after the entry window
        rec.lateTried=(rec.lateTried||0)+1;
        const s2=await settleBoard(b);base=s2.st.ok?s2.st.w:null;if(s2.st.ok)lateBase++;
        if(rec){rec.base=base;rec.settleMs=s2.st.ok?s2.st.fromMs:null;}
        L.note(lab+' card "'+cur.slice(0,34)+'": no board at entry; settled baseline '+base+' once it appeared'+
          (s2.st.ok?' (held from '+s2.st.fromMs+'ms of a second 900ms window)':' NOT SETTLED: '+s2.st.why));
        if(!s2.st.ok&&s2.st.why!=='no board')unsettled.push({cap:cur.slice(0,34),why:s2.st.why,late:true,reads:s2.reads.map(r=>r.w).slice(0,20)});
        continue;
      }
      if(m.board&&base!==null&&m.board.w<base-TOL)shrunk.push({cap:cur.slice(0,34),base,to:m.board.w});
    }
    await b.shot('playall-'+lab+'-final');
    L.say(done,lab+': the run ends on the RECORDING COMPLETE frame ('+seen.length+' captions seen)');
    const w=walkOk(seen,N);
    L.say(w.ok,lab+': every one of the '+N+' gallery cards was reached, in order ('+seen.length+' captions'+
      (w.ok?', card numbers '+w.ns.join(',')+')':') - '+w.why),w.ok?undefined:seen.map(c=>c.slice(0,44)));
    L.say(scrolled.length===0,lab+': no card leaves the page scrolling',scrolled.slice(0,3));
    // expected vacuous by design and kept as a tripwire for the design changing: index.html says #root is the
    // app's scroller and "the page never does", so docScroll is 0 on every screen (CLAUDE.md, two false P0s).
    L.say(pageScroll.length===0,lab+': the page itself cannot scroll - body is out of flow and #root is the scroller',pageScroll.slice(0,3));
    L.say(shrunk.length===0,lab+': no board shrinks inside a card, against a SETTLED baseline',shrunk.slice(0,3));
    L.say(unsettled.length===0,lab+': every card whose board is measurable settles inside the 900ms window',unsettled.slice(0,2));
    L.say(sampled>=8,lab+': the walk actually took samples to assert over ('+sampled+' attributed, '+raced+' discarded across a caption change)');
    // the population this gate's board assertion actually covers, pinned to the MECHANISM rather than to a card
    // count that the gallery can change under it: a caption whose board was never on screen has nothing to
    // baseline (the Starting frame), but one whose board WAS on screen must never be left unbaselined - which is
    // what the old lazy `if(curBoard===null)curBoard=m.board.w` did cover and a fixed entry window alone does not
    // (measured: card 6/8 US-R01 shows no board for the first 11.5s of its 52s).
    // AND THE POPULATION ITSELF MUST BE ASSERTED, not merely printed. Every board check here is conditioned on
    // the board existing, so a bundle whose board is display:none passes ALL of them - measured by the #416
    // antagonist at 24 pass / 0 fail with this line printing "2 of 15" and nothing reading it. That is the
    // count-with-no-assertion fault (#405, #413's invariant 4b), and the number was already on the page.
    // PINNED TO THE MECHANISM, NOT TO A COUNT WITH SLACK. The first draft of this line asserted
    // "at least 13 of 15", and a bar with one caption of slack is how a frozen denominator starts - a gallery
    // that legitimately gains one boardless caption would spend the slack silently. Measured at both
    // geometries over five runs, the captions WITHOUT a board are exactly one, and it is the frame whose own
    // text is "Starting...". So assert that: any other boardless caption is a finding, and a deliberate
    // change to the gallery has to come through here on purpose.
    const withBoard=cards.filter(c=>c.sawBoard).length;
    const boardless=cards.filter(c=>!c.sawBoard&&!/Starting/.test(c.cap));
    L.say(boardless.length===0,lab+': every caption except the Starting frame showed a board ('+withBoard+
      ' of '+cards.length+' had one)',boardless.map(c=>c.cap));
    const noBase=cards.filter(c=>c.sawBoard&&c.base===null);
    L.say(noBase.length===0,lab+': every caption whose board was on screen got a settled baseline ('+
      cards.filter(c=>c.sawBoard).length+' of '+cards.length+' captions had a board, '+lateBase+' baselined late)',
      noBase.map(c=>c.cap));
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,lab+': no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
    await b.close();
  }
},'GALLERY-PLAYALL');
