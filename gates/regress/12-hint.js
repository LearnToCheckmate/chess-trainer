// regress/12-hint.js  (port of gallery372.js / hintcap372.js, the live-app half)  A-06 / Z-01: a puzzle hint takes
// CONTROL-RECORD: ea49ec3 2026-11-03 total=28 red=3 scope=trial:ac743b970f97 how=#547 control run j12nc: a bundle whose hint header shows another puzzle's hint - 'hint header shows THIS puzzle's hint' red at 390, kunal and se [#547 close-out, ratchet]
// CONTROL-RECORD: 8c9a628 2026-11-05 total=28 red=3 scope=trial:9fd16ca819b5 how=#548 control for item (84): the same 110vh relative child under a zero-height box - 'no scroll with the hint' red
// CONTROL-RECORD: 729b4d4 2026-11-06 total=28 red=3 scope=trial:617a56a8cb4f how=#549 control for item (76), the new Puzzles route: a bundle whose 💡 Hint button sets another puzzle's mate-in-3 hint - 'hint header shows THIS puzzle's hint' red at kunal, 390 and se; and a bundle with the A-06 gallery card deleted (trial:532619211a94) is 28/0 on this route where the old b.card route threw on the missing card (1 pass, 1 fail) [#549 item (76)]
// CONTROL-RECORD: 7c32cc7 2026-11-11 total=34 red=1 scope=trial:c025f21705d7 how=#550 item (139): c139, the hint header's font at 320 wide raised 11 -> 14px - TC-PZ-04's corpus line red at se (12 of 27 hints need 4 lines) while the old 'hint text not clipped' stays green; good trial 4fe71d55db29 34/0
// CONTROL-RECORD: e83c0d1 2026-11-12 total=34 red=1 scope=trial:0b494f6c50db how=#550 a42 re-key (se 277 -> 320): t140, the tree before the short-phone overlays - the se board reads 277 against the new 320 pin; on t142 4e6cd77c 34/0
// CONTROL-RECORD: faa82a9 2026-11-13 total=58 red=1 scope=trial:669f10d33d96 how=#550 job gate-12-clipping-assertion-cannot-fail-while-the-clamp-is-what-cuts (whatIsLeft, all supported widths): the hint header's font at 341..369 wide raised 12 -> 16px - the corpus line red at w360 only (13 of 33 hints need 4 lines), a width the three-geometry loop never visited; on 342f7329901b 58/0
// CONTROL-RECORD: 63f941c 2026-11-13 total=76 red=12 scope=trial:7a088dc57ab5 how=#550 job gate-12-clipping-assertion-cannot-fail-while-the-clamp-is-what-cuts (its own fix: assert WHICH thing cuts, the clamp or the box edge): both pz-hint-head spans given minHeight 4.6em, a box taller than the 3 lines its clamp draws (#396's shape - the over-long input paints 4.09 lines into the slack) - TC-PZ-04b red at all nine geometries (34 of 34 inputs at kunal) plus 'board unmoved by the hint' at kunal, 390 and se; the old 'hint text not clipped' (scrollHeight) stays GREEN at every geometry
// CONTROL-RECORD: 63f941c 2026-11-13 total=76 red=9 scope=trial:305fa25fbf7a how=#550 same job: both pz-hint-head spans given maxHeight 2.3em, a box SHORTER than the clamp's lines, so the box edge cuts the third line with no ellipsis - TC-PZ-04b red at all nine geometries (16 of 34 at kunal, the over-long one drawing 2.08 lines) and nothing else; the old 'hint text not clipped' stays GREEN on the shipped first-puzzle hint; on the tip trial 77ffccc15668 76/0
// the header row and never moves the board. The Puzzles route enters the first puzzle (PZ[0]) and the gate taps 💡 Hint (#549 item (76); it was gallery card 5, which set the hint after 700ms): the
// board top before the hint must equal the board top with the hint showing; the hint header is on screen and its
// text is not clipped (scrollHeight == clientHeight).
'use strict';
const L=require('../lib');const P=require('../drive/puzzles');
const SRC=require('fs').readFileSync(require('path').join(__dirname,'..','..','chess.jsx'),'utf8');
const HINTS=[...new Set([...SRC.matchAll(/\bhint:\s*("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g)].map(x=>x[2]||x[3]).filter(x=>x&&x.length>3))];
async function corpusFit(b,geo){
     const fit=await b.page.evaluate((hints)=>{const h=document.querySelector('[data-ct="pz-hint-head"]');if(!h)return null;
       const cs=getComputedStyle(h),lh=parseFloat(cs.lineHeight),clamp=parseInt(cs.webkitLineClamp||cs.WebkitLineClamp||'0',10),orig=h.textContent,over=[];
       for(const t of hints){const pr=document.createElement('div');pr.style.cssText='position:absolute;visibility:hidden;width:'+h.clientWidth+'px;font:'+cs.font+';letter-spacing:'+cs.letterSpacing+';line-height:'+cs.lineHeight+';white-space:normal;';
         pr.textContent='\u{1F4A1} '+t;document.body.appendChild(pr);const need=Math.round(pr.getBoundingClientRect().height/lh*100)/100;pr.remove();if(need>clamp+0.05)over.push({n:t.length,need,t:t.slice(0,50)});}
       // CLAMP VERSUS CLIP, IN THE REAL BOX [TC-PZ-04b]: each hint is set into the shipped element itself and its own box is read.
       // The clamp is what may cut (it draws an ellipsis); the box edge (overflow:hidden) must never be - so the box must be no
       // taller than the lines the clamp draws (a taller box paints a 4th line into its slack and cuts it at the edge, #396) and
       // no shorter than the lines the text needs up to the clamp (a shorter box cuts a line with no ellipsis). The corpus has
       // no hint over 3 lines, so one OVER-LONG input (the longest hint three times) is added: it is the case where cutting
       // actually happens, and the box must then sit exactly on the clamp's lines.
       const box=[],longest=hints.reduce((a,t)=>t.length>a.length?t:a,'');
       for(const t of [...hints,longest+' '+longest+' '+longest]){
         const pr=document.createElement('div');pr.style.cssText='position:absolute;visibility:hidden;width:'+h.clientWidth+'px;font:'+cs.font+';letter-spacing:'+cs.letterSpacing+';line-height:'+cs.lineHeight+';white-space:normal;';
         pr.textContent='\u{1F4A1} '+t;document.body.appendChild(pr);const need=Math.round(pr.getBoundingClientRect().height/lh);pr.remove();
         h.textContent='\u{1F4A1} '+t;const ch=h.clientHeight,want=Math.min(need,clamp);
         const cap=Math.ceil(clamp*lh)+0.5,floor=want*lh-1;
         if(ch>cap||ch<floor)box.push({n:t.length,need,ch,cap:Math.round(cap*10)/10,floor:Math.round(floor*10)/10,t:t.slice(0,40)});
         if(t.length>longest.length)var cut={need,ch,lines:Math.round(ch/lh*100)/100};
       }
       h.textContent=orig;return {n:hints.length,clamp,over,box,cut,lh,fs:cs.fontSize,w:h.clientWidth};},HINTS);
     L.say(!!fit&&fit.n>=20&&fit.clamp===3,geo+': DENOMINATOR the hint corpus was read from chess.jsx ('+(fit&&fit.n)+' hints) and the hint box clamps at '+(fit&&fit.clamp)+' lines',fit&&{n:fit.n,clamp:fit.clamp,fs:fit.fs,w:fit.w});
     L.say(!!fit&&fit.over.length===0,geo+': every hint in the corpus fits the lines the clamp draws - '+(fit?fit.over.length:'?')+' need more (the clamp would cut the instruction off with an ellipsis)',fit&&fit.over);
     L.say(!!fit&&!!fit.cut&&fit.cut.need>fit.clamp,geo+': TC-PZ-04b DENOMINATOR the over-long input needs more lines than the clamp draws ('+(fit&&fit.cut&&fit.cut.need)+' > '+(fit&&fit.clamp)+'), so the box below is read in a state where something cuts',fit&&fit.cut);
     L.say(!!fit&&!!fit.cut&&fit.box.length===0,geo+': TC-PZ-04b the CLAMP, never the box edge, is what cuts - set into the real hint box, all '+(fit?fit.n+1:'?')+' inputs give a box no taller than the clamp\'s '+(fit&&fit.clamp)+' lines and no shorter than the lines the text needs ('+(fit?fit.box.length:'?')+' do not; the over-long one draws '+(fit&&fit.cut&&fit.cut.lines)+' lines)',fit&&fit.box.slice(0,4));
}
L.run(async()=>{
  for(const geo of ['kunal','390','se']){
    const b=await L.launch({geo,name:'hint-'+geo});await b.open();
    // THE ROUTE IN IS THE PLAYER'S, NOT A DEV GALLERY CARD [#549, item (76); jobs/five-gates-enter-their-state-by-tapping-a-dev-
    // gallery-card-2026-10-01]. This gate used to enter its state with b.card('A-06',350), so it went RED whenever Kunal's preview
    // gallery lost its A-06 fixture card (#451's first flush took it and four other gates down on a missing card, not a defect).
    // It now drives the app the way a player does: Home -> Puzzles -> Start training opens PZ[0] (the same first puzzle the card
    // entered), `before` is sampled with no hint, then the real 💡 Hint button is tapped. Same three geometries, same assertions,
    // and the measured numbers are unchanged to the pixel (board top/w at kunal 181.5/375, 390 278.5/390, se 184/259; header
    // scroll 27/27/25) - the job's equivalence case, run old route against new on one trial bundle.
    await P.states['train'](b);const before=await b.metrics();
    // THE HINT WAS ABSENT WHEN `before` WAS SAMPLED [#546, item (38); jobs/rotating-audit-433-two-assertions-that-cannot-
    // discriminate-2026-09-29]. 'board unmoved by the hint' compares the +350ms sample with the +2150ms one; if the hint ever
    // arrived inside 350ms both samples would be hint-up and the comparison could not fail. Read it in the same breath.
    const hintAtBefore=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');return e?(e.innerText||'').trim():null;});
    // THE PUZZLE'S OWN MATE COUNT, read off the goal line while the hint is still absent [#547, item (21); jobs/rotating-audit-
    // 433-two-assertions-that-cannot-discriminate-2026-09-29]: the hint assertion below is pinned to it rather than to length.
    const goalN=await b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/(?:White|Black) to move(?: \u2014|:) (?:mate in (\d)|find the best move)/);return m?(m[1]?+m[1]:0):null;});
    await P.tapBtn(b,/^\u{1F4A1} Hint$/u,600);await b.settle(1800);const after=await b.metrics();await b.shot('hint-'+geo);
    const head=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,sh:e.scrollHeight,ch:e.clientHeight,text:(e.innerText||'').trim()};});
    L.say(!!before.board&&!!after.board,geo+': puzzle board present before and with the hint');
    L.say(!hintAtBefore,geo+': PRECONDITION the hint was NOT yet showing at the before sample, so the next line compares a hintless board with a hinted one',{hintAtBefore:hintAtBefore&&hintAtBefore.slice(0,60)});
    if(before.board&&after.board){L.say(Math.abs(before.board.top-after.board.top)<0.6&&Math.abs(before.board.w-after.board.w)<0.6,geo+': board unmoved by the hint (top '+before.board.top+' -> '+after.board.top+', w '+after.board.w+')');}
      // #384 (derived test-lane item 6): the board-movement assertion above compares two MEASURED values and nothing else, so it is true of a board that has been the wrong size since before the first sample. That is exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. The width is pinned here for the same reason. Measured on #383.
      const WANT={kunal:375,'390':390,se:320};   /* #550 a42: chips behind the Hint and notes as overlays on a short upright phone, 277 -> 320 (t141). Was: the top card's padding and gaps tightened on a short phone, 259 -> 277 (9px padding, so a long solved verdict still fits its reserve - gate 57 D) */
      if(WANT[geo]!=null)L.say(!!after.board&&Math.abs(after.board.w-WANT[geo])<0.6,geo+': the puzzle board is '+WANT[geo]+' wide with the hint up - the measured size, not merely the same as a moment ago',{measured:after.board&&after.board.w,want:WANT[geo]});
    // THE HINT IS THIS PUZZLE'S HINT, NOT ANY STRING OVER TEN CHARACTERS [#547, item (21)]. _pzHint prints one of two templates:
    // 'It's mate in N - start with the most forcing check.' for a mate puzzle and 'Find the forcing move - ... (<motif>)' otherwise.
    // Exactly one must match, and a mate hint's N must equal the N the puzzle's own goal line printed before the hint, so a stale
    // hint from another puzzle, a wrong count, or a hint under the wrong template is red. The bare length test it replaces passed all three.
    {const t=head?head.text:'';const HM=/^(?:\u{1F4A1} )?It.s mate in (\d)(?: \u2014|:) start with the most forcing check\.$/u,HF=/^(?:\u{1F4A1} )?Find the forcing move(?: \u2014|:) a check, capture, or strong threat\. \(.+\)$/u;   // the header prefixes the bulb the Hint button sets
     /* #550 HEX-T-04 (gate re-key): the generated puzzles' hint is now READ from the position (pzText), not one of the two templates, so a
        mate hint says 'mate in two' or 'mate in 3' in its own words; it must still name the SAME count as the goal line, and a non-mate
        hint must not claim a mate - which keeps the stale-hint and wrong-count reds this assertion exists for. */
     const _W={one:1,two:2,three:3,four:4};const _m=t.match(HM)||t.match(/mate in (one|two|three|four|\d)/i);
     const hm=_m?[_m[0],String(_W[String(_m[1]).toLowerCase()]||_m[1])]:null,hf=HF.test(t)||(!_m&&t.replace(/^\u{1F4A1} ?/u,'').length>10);
     L.say(!!head&&goalN!=null&&((!!hm&&!hf&&+hm[1]===goalN&&goalN>0)||(!hm&&hf&&goalN===0)),geo+': hint header shows THIS puzzle\'s hint - read from it (pzText) or one of _pzHint\'s two templates, and a mate hint\'s count equals the goal line\'s (mate in '+goalN+')',{hint:t.slice(0,80),goalN});}
    L.say(!!head&&head.sh<=head.ch+1,geo+': hint text not clipped (scroll '+(head&&head.sh)+' vs '+(head&&head.ch)+')');
    L.say(!!head&&head.y>=0&&head.y+head.h<=(after.board?after.board.top:1e9)+0.5,geo+': hint header sits above the board, on screen');
    L.say(after.over.over<=0,geo+': no scroll with the hint',after.over);
    // #550 item (139) [jobs/gate-12-clipping-assertion-cannot-fail-while-the-clamp-is-what-cuts-2026-09-30]: 'hint text not
    // clipped' above reads scrollHeight<=clientHeight, which a -webkit-line-clamp makes TRUE BY CONSTRUCTION whenever the clamp is
    // what cuts - so it cannot see a hint cut to three lines. This asks what the clamp hides: every hint in chess.jsx's corpus
    // (read from the source, both quote styles) is set into THIS box, and the lines it NEEDS - measured in an unclamped probe
    // of the same width, font, letter-spacing and line-height - must not exceed the 3 the clamp draws. Measured at #550 on
    // trial 4fe71d55db29: 27 hints, 0 over 3 lines at all eight geometries (the three that clamped at #445 have been shortened).
    await corpusFit(b,geo);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  // THE REST OF THE SUPPORTED WIDTHS [#550; jobs/gate-12-clipping-assertion-cannot-fail-while-the-clamp-is-what-cuts-2026-09-30,
  // its whatIsLeft]: the corpus predicate above ran at the loop's three geometries while the job's case names every supported
  // width. These are the rest of THE DRILL SEVEN (L.TA7) plus Kunal's own phone (kunal761). Only the hint-fit block and its
  // denominator run here - the board-size pins above are measured for the three columns and are not claimed elsewhere - and the
  // route in is the same player route (Home -> Puzzles -> Start training -> Hint), with the header asserted present first.
  for(const geo of [...L.TA7.filter(g=>!['se','390','kunal'].includes(g)),'kunal761']){
    const b=await L.launch({geo,name:'hint-fit-'+geo});await b.open();
    await P.states['train'](b);await P.tapBtn(b,/^\u{1F4A1} Hint$/u,600);await b.settle(1200);
    const up=await b.page.evaluate(()=>!!document.querySelector('[data-ct="pz-hint-head"]'));
    L.say(up,geo+': PRECONDITION the hint header is showing after the Hint tap, so the corpus below is set into the real box');
    await corpusFit(b,geo);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'HINT');
