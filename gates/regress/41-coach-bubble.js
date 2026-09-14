// regress/41-coach-bubble.js  THE COACH SPEECH BUBBLE, OVER THE BOARD, AT NO COST TO THE BOARD.
//
// Kunal decided this on 2026-09-13 after being shown the mockup. His choice, verbatim: "Build it, over the
// board, dismiss on tap". His note, verbatim: "would it dismiss when the player plays the next move. DOn't
// want to make it an explicit dismissal by having to click a cross somewhere. SO it doesn't interrupt the
// flow of play". BOTH HALVES ARE BINDING and this gate asserts both: a tap retires the bubble, and stepping
// to another ply shows that move's comment without anything having to be closed.
//
// WHY IT IS OVER THE BOARD AT ALL. The question put to him was that the bubble has no free vertical space on
// his phone, so it would cost board height. He chose over the board rather than pay that. So the thing this
// gate guards hardest is the thing the choice was ABOUT: the board must be exactly the same size, in the same
// place, with the bubble up and with it gone. CLAUDE.md: "The board is sacred... and the board must never
// jump." An overlay that quietly reflowed the column would satisfy the word of the decision and break its
// point.
//
// THE MOCKUP HE ANSWERED was 333x128 inside the top of a 349-wide review board - an 8px inset, so boardPx-16
// wide - covering about 35 percent of the board while open. Those numbers are PINNED here rather than
// recomputed from whatever the app happens to render, because a gate that derives its expectation from the
// bundle it is testing cannot tell a change from a fact. The height is a CAP, not a fixed box: the sentence
// varies in length and 128 was the mockup's maximum.
//
// NOT IN ANALYSIS MODE. There you play the position out, and a bubble covering a third of the squares would
// swallow taps meant for pieces. The sentence under the board is hidden in anaMode for the same reason, so
// this follows a rule the screen already has rather than inventing one.
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

// the mockup, per geometry: the review board's width, and the bubble that sits inside it.
// 349 is Kunal's phone; 320 carries the same board minus the same eval bar, measured not assumed.
const WANT={kunal730:{board:349,inset:8},se:{board:264,inset:8}};

L.run(async()=>{
  for(const geo of ['kunal730','se']){
    const b=await L.launch({geo,name:'coach-'+geo,store:{ct_pool:'3'}});
    const W=WANT[geo];
    await b.open();

    // ply 31 is 16.Qb8+, a move with a verdict and therefore a sentence for the coach to say.
    await R.states['moves-ply31'](b);
    await b.settle(400);

    const bd0=await b.board();
    L.say(!!bd0&&Math.abs(bd0.w-W.board)<0.6,geo+': the review board is '+W.board+' wide with the bubble up - the measured size, pinned, so this gate cannot go green against a board that was wrong from the start',bd0&&bd0.w);

    const up=await rect(b,'[data-ct="coach-bubble"]');
    L.say(!!up,geo+': the coach bubble is on screen at a move that has a verdict (ply 31, 16.Qb8+)',up);
    if(up&&bd0){
      // the mockup: boardPx-16 wide at an 8px inset inside the top of the board
      L.say(Math.abs(up.w-(W.board-2*W.inset))<1.2,geo+': the bubble is '+(W.board-2*W.inset)+' wide - the board minus an '+W.inset+'px inset each side, which is the 333 of the 349 mockup he approved',{w:up.w,want:W.board-2*W.inset});
      L.say(Math.abs(up.x-(bd0.x+W.inset))<1.2,geo+': its left edge is inset '+W.inset+'px from the board, not flush to it',{x:up.x,boardX:bd0.x});
      L.say(Math.abs(up.y-(bd0.y+W.inset))<1.2,geo+': it sits INSIDE the top of the board, inset '+W.inset+'px, rather than above it',{y:up.y,boardY:bd0.y});
      L.say(up.right<=bd0.x+bd0.w+0.6,geo+': it does not run past the right edge of the board',{right:up.right,boardRight:bd0.x+bd0.w});
      L.say(up.h<=Math.round(W.board*0.367)+1,geo+': it covers about a third of the board and no more - the mockup was 128 of 349, so the cap here is '+Math.round(W.board*0.367)+'px',{h:up.h});
      L.say(up.h>20,geo+': it has real height rather than being a collapsed box',{h:up.h});
    }
    L.say(await seen(b,'[data-ct="coach-say"]'),geo+': it carries the coach sentence');
    L.say(await seen(b,'[data-ct="coach-eval"]'),geo+': it carries the eval chip - DECISIONS-LOG, "the bubble and the eval chip, but no face until the piece-mascot direction is drawn"');
    const ev=await rect(b,'[data-ct="coach-eval"]');
    L.say(!!ev&&/^(\+|-)?(\d+\.\d|M\d+|-M\d+|1-0|0-1)$/.test(ev.text),geo+': the eval chip reads as an evaluation rather than an empty box',ev&&ev.text);
    const say=await rect(b,'[data-ct="coach-say"]');
    L.say(!!say&&say.text.length>12,geo+': the sentence is a sentence, not a placeholder',say&&say.text.slice(0,80));
    await b.shot('coach-'+geo+'-ply31');

    // HIS CONDITION: the board does not move. Measured with the bubble up and again after it is gone,
    // because "over the board" is only true if the board did not pay for it.
    await b.page.locator('[data-ct="coach-bubble"]').last().click();
    await b.settle(350);
    const gone=await seen(b,'[data-ct="coach-bubble"]');
    L.say(!gone,geo+': a tap on the bubble retires it - no cross to hunt for, which is exactly what his note asked for');
    const bd1=await b.board();
    L.say(!!bd1&&Math.abs(bd1.w-bd0.w)<0.6&&Math.abs(bd1.x-bd0.x)<0.6&&Math.abs(bd1.y-bd0.y)<0.6,
      geo+': THE BOARD DID NOT MOVE when the bubble went - same width, same position. This is the whole point of "over the board": he was told the bubble would otherwise cost board height and chose this instead',{before:bd0,after:bd1});

    // "would it dismiss when the player plays the next move" - stepping shows the next move's comment,
    // with nothing to close. Dismissing ply 31 must NOT silence ply 32.
    await R.goPly(b,32);
    await b.settle(450);
    L.say(await seen(b,'[data-ct="coach-bubble"]'),geo+': stepping to the next move brings that move\'s comment up on its own - dismissing one move\'s bubble does not silence the next, which is what "so it doesn\'t interrupt the flow of play" asks for');
    const bd2=await b.board();
    L.say(!!bd2&&Math.abs(bd2.w-bd0.w)<0.6,geo+': and the board is still '+W.board+' wide a move later',bd2&&bd2.w);

    // at the start position there is no move to comment on
    await R.goPly(b,0);
    await b.settle(400);
    L.say(!(await seen(b,'[data-ct="coach-bubble"]')),geo+': no bubble at the start position - there is no move yet for the coach to have an opinion about');

    // ANALYSIS MODE: you are playing the position out, so the bubble must not swallow taps on the squares.
    //
    // THIS MUST BE ENTERED FROM A PLY THAT HAS A VERDICT, and the first version of this gate got it wrong.
    // It used the driver's 'analysis' state, which goes to ply 0 and taps the Analyze button there - and at
    // ply 0 the bubble is already hidden by `ply>0`, so the assertion passed no matter what anaMode did. A
    // bundle with the anaMode guard deleted went 38 of 38 GREEN against it. Entering analysis from ply 31
    // leaves every other condition satisfied, so the anaMode guard is the only thing left doing the work.
    // ply 32, not 31: ply 31's bubble was tapped away earlier in this run and a dismissal STAYS with its
    // move, so returning to 31 would have shown nothing and the control check below would fail for the
    // wrong reason. (That persistence is deliberate app behaviour - you tapped that move's comment away.)
    await R.goPly(b,32);
    await b.settle(400);
    L.say(await seen(b,'[data-ct="coach-bubble"]'),geo+': (control check) the bubble IS up at ply 32 before analysis is entered, so the next assertion has something to hide');
    await b.tapCt('rev-fab',700);
    await b.settle(400);
    const inAna=(await b.texts()).some(x=>/Exit analysis/.test(x));
    L.say(inAna,geo+': (control check) analysis mode was actually entered from ply 32 - an assertion about a state never reached is not an assertion');
    L.say(!(await seen(b,'[data-ct="coach-bubble"]')),geo+': no bubble in analysis mode, where a box over a third of the squares would eat taps meant for pieces');
    await R.states['analysis-exit'](b);

    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,geo+': zero app errors beyond the allowed engine trap',bad.slice(0,3));
    await b.close();
  }
},'COACH-BUBBLE');
