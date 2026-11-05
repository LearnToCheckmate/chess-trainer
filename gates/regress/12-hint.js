// regress/12-hint.js  (port of gallery372.js / hintcap372.js, the live-app half)  A-06 / Z-01: a puzzle hint takes
// CONTROL-RECORD: ea49ec3 2026-11-03 total=28 red=3 scope=trial:ac743b970f97 how=#547 control run j12nc: a bundle whose hint header shows another puzzle's hint - 'hint header shows THIS puzzle's hint' red at 390, kunal and se [#547 close-out, ratchet]
// the header row and never moves the board. Card 5 enters the first puzzle and sets its hint after 700ms: the
// board top before the hint must equal the board top with the hint showing; the hint header is on screen and its
// text is not clipped (scrollHeight == clientHeight).
'use strict';
const L=require('../lib');
L.run(async()=>{
  for(const geo of ['kunal','390','se']){
    const b=await L.launch({geo,name:'hint-'+geo});await b.open();
    await b.card('A-06',350);const before=await b.metrics();
    // THE HINT WAS ABSENT WHEN `before` WAS SAMPLED [#546, item (38); jobs/rotating-audit-433-two-assertions-that-cannot-
    // discriminate-2026-09-29]. 'board unmoved by the hint' compares the +350ms sample with the +2150ms one; if the hint ever
    // arrived inside 350ms both samples would be hint-up and the comparison could not fail. Read it in the same breath.
    const hintAtBefore=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');return e?(e.innerText||'').trim():null;});
    // THE PUZZLE'S OWN MATE COUNT, read off the goal line while the hint is still absent [#547, item (21); jobs/rotating-audit-
    // 433-two-assertions-that-cannot-discriminate-2026-09-29]: the hint assertion below is pinned to it rather than to length.
    const goalN=await b.page.evaluate(()=>{const m=(document.body.innerText||'').match(/(?:White|Black) to move \u2014 (?:mate in (\d)|find the best move)/);return m?(m[1]?+m[1]:0):null;});
    await b.settle(1800);const after=await b.metrics();await b.shot('hint-'+geo);
    const head=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-hint-head"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,sh:e.scrollHeight,ch:e.clientHeight,text:(e.innerText||'').trim()};});
    L.say(!!before.board&&!!after.board,geo+': puzzle board present before and with the hint');
    L.say(!hintAtBefore,geo+': PRECONDITION the hint was NOT yet showing at the before sample, so the next line compares a hintless board with a hinted one',{hintAtBefore:hintAtBefore&&hintAtBefore.slice(0,60)});
    if(before.board&&after.board){L.say(Math.abs(before.board.top-after.board.top)<0.6&&Math.abs(before.board.w-after.board.w)<0.6,geo+': board unmoved by the hint (top '+before.board.top+' -> '+after.board.top+', w '+after.board.w+')');}
      // #384 (derived test-lane item 6): the board-movement assertion above compares two MEASURED values and nothing else, so it is true of a board that has been the wrong size since before the first sample. That is exactly what left 10-gameover passing 12 of 12 on a board 16px wrong. The width is pinned here for the same reason. Measured on #383.
      const WANT={kunal:375,'390':390,se:259};
      if(WANT[geo]!=null)L.say(!!after.board&&Math.abs(after.board.w-WANT[geo])<0.6,geo+': the puzzle board is '+WANT[geo]+' wide with the hint up - the measured size, not merely the same as a moment ago',{measured:after.board&&after.board.w,want:WANT[geo]});
    // THE HINT IS THIS PUZZLE'S HINT, NOT ANY STRING OVER TEN CHARACTERS [#547, item (21)]. _pzHint prints one of two templates:
    // 'It's mate in N - start with the most forcing check.' for a mate puzzle and 'Find the forcing move - ... (<motif>)' otherwise.
    // Exactly one must match, and a mate hint's N must equal the N the puzzle's own goal line printed before the hint, so a stale
    // hint from another puzzle, a wrong count, or a hint under the wrong template is red. The bare length test it replaces passed all three.
    {const t=head?head.text:'';const HM=/^(?:\u{1F4A1} )?It.s mate in (\d) \u2014 start with the most forcing check\.$/u,HF=/^(?:\u{1F4A1} )?Find the forcing move \u2014 a check, capture, or strong threat\. \(.+\)$/u;   // the header prefixes the bulb the Hint button sets
     const hm=t.match(HM),hf=HF.test(t);
     L.say(!!head&&goalN!=null&&((!!hm&&!hf&&+hm[1]===goalN&&goalN>0)||(!hm&&hf&&goalN===0)),geo+': hint header shows THIS puzzle\'s hint - one of _pzHint\'s two templates, and a mate hint\'s count equals the goal line\'s (mate in '+goalN+')',{hint:t.slice(0,80),goalN});}
    L.say(!!head&&head.sh<=head.ch+1,geo+': hint text not clipped (scroll '+(head&&head.sh)+' vs '+(head&&head.ch)+')');
    L.say(!!head&&head.y>=0&&head.y+head.h<=(after.board?after.board.top:1e9)+0.5,geo+': hint header sits above the board, on screen');
    L.say(after.over.over<=0,geo+': no scroll with the hint',after.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'HINT');
