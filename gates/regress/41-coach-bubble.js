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
    L.say(!!ev&&/^(\+|-)?(\d+\.\d|mate|-mate)$/.test(ev.text),geo+': the eval chip reads as an evaluation rather than an empty box',ev&&ev.text);

    // THE ASSERTION THAT WAS MISSING IN #385, AND THE DEFECT IT LET THROUGH.
    // The chip shipped formatted with evTxt - the CENTIPAWN formatter - against curAnno.evalAfter, which is
    // held in PAWNS. So it printed the right number divided by a hundred: +0.0 on 21 plies of the Opera
    // Game, +0.1 on 8, +1.0 on 4, while the eval bar beside it on the same board read up to +5.9 and M1.
    // The original assertion here checked the chip's SHAPE with a regex, and "+0.0" satisfies a regex for
    // an evaluation perfectly. A shape is not a value.
    //
    // What catches it is a CROSS-CHECK against the other thing on screen that shows the same quantity. Not
    // equality - the chip is the eval AFTER this move and the bar is the position now, so they are allowed
    // to differ by a little - but they must be on the SAME SCALE. A factor of a hundred is not a little.
    // AND IT HAS TO BE CHECKED WHERE BOTH NUMBERS EXIST. The first version of this cross-check ran at ply
    // 31 - a MATE, where the bar reads "M1" and not a plain number - so the comparison was skipped and the
    // assertion never executed once. A control that restored the defect left it silent. Sample several
    // plies, compare wherever both are plain numbers, and ASSERT THAT AT LEAST ONE SUCH PLY WAS FOUND, so
    // an empty comparison set fails instead of passing quietly.
    const num=(x)=>(x&&/^[+-]?\d+(\.\d+)?$/.test(x))?Math.abs(parseFloat(x)):null;
    const pairs=[];
    for(const ply of [9,14,19,21,24,28]){
      await R.goPly(b,ply); await b.settle(1100);
      const pr=await b.page.evaluate(()=>{
        const t=(s)=>{const e=document.querySelector(s);return e?(e.innerText||'').trim():null;};
        return {chip:t('[data-ct="coach-eval"]'),bar:t('[data-ct="eval-bar-num"]')};
      });
      const cN=num(pr.chip),bN=num(pr.bar);
      if(cN!=null&&bN!=null&&bN>=0.5)pairs.push({ply,chip:pr.chip,bar:pr.bar,cN,bN});
    }
    L.say(pairs.length>=3,geo+': at least three plies gave a plain number in BOTH the coach chip and the eval bar to compare ('+pairs.length+'). Without this the scale check below can pass by never running - which is exactly what it did when it sat on a mate ply',pairs.map(x=>x.ply));
    const offScale=pairs.filter(x=>!(x.cN>=x.bN/3&&x.cN<=x.bN*3));
    L.say(offScale.length===0,geo+': the coach chip and the eval bar are on the SAME SCALE wherever both are numbers. #385 shipped them a FACTOR OF 100 apart - the chip used the centipawn formatter on a value held in pawns - and a regex on the chip\'s shape could not see it',{pairs,offScale});

    // AND THE SAME DEFECT SEEN A SECOND WAY, because one ply can agree by luck. Across the whole game the
    // chip must actually MOVE: the broken build took three distinct values in thirty-three plies.
    const vals=[];
    for(const ply of [5,9,14,19,21,24,28,30,33]){
      await R.goPly(b,ply); await b.settle(260);
      const v=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="coach-eval"]');return e?(e.innerText||'').trim():null;});
      if(v)vals.push(v);
    }
    const distinct=[...new Set(vals)];
    L.say(distinct.length>=5,geo+': the chip takes at least five distinct values across nine plies of the Opera Game ('+distinct.join(', ')+'). The #385 build took THREE across all thirty-three, because dividing every evaluation by a hundred flattens the game into +0.0',{vals,distinct});
    L.say(vals.some(v=>v==='mate'),geo+': a mate reads "mate" rather than a small number - dividing 99 pawns by a hundred printed "+1.0" over a mated king',vals);

    // THE SENTENCE MUST NOT BE CUT, at any ply, at any width. At 320 the old cap was a PROPORTION of the
    // board (boardPx*0.367 = 97px) and the bubble hit it before -webkit-line-clamp could fire, so the text
    // was cut by the BOX and no ellipsis was drawn: measured 14 of 33 plies cut, 28 of 33 sitting exactly
    // on the cap. Walking plies here rather than trusting one, because the sentence length varies per move.
    // THE WALK MUST WAIT OUT THE DEBOUNCE OR IT MEASURES THE WRONG SENTENCE. On a Brilliant or Great ply
    // _annoWhy GROWS about half a second after arrival: the sacrifice refutation comes from a debounced
    // engine query (sacRun, 450ms) and is appended. A 220ms settle caught the short version and this walk
    // disagreed with itself between runs - one ply cut or none, depending on timing. A flaky assertion is
    // worse than no assertion, so the settle is past the debounce and the numbers below are the grown text.
    let cutAt=[],capAt=0,walked=0;
    for(let ply=1;ply<=33;ply++){
      await R.goPly(b,ply); await b.settle(1100);
      const r=await b.page.evaluate(()=>{
        const bub=document.querySelector('[data-ct="coach-bubble"]'),say=document.querySelector('[data-ct="coach-say"]');
        if(!bub||!say)return null;
        return {h:bub.getBoundingClientRect().height,cap:parseFloat(getComputedStyle(bub).maxHeight),
          sh:say.scrollHeight,ch:say.clientHeight};
      });
      if(!r)continue;
      walked++;
      if(r.sh>r.ch+1)cutAt.push(ply);
      if(Math.abs(r.h-r.cap)<1.5)capAt++;
    }
    L.say(walked>=30,geo+': the bubble was present on at least thirty plies to walk ('+walked+') - a cut-text check over an empty walk proves nothing',walked);
    // WHICH THING DOES THE CUTTING IS THE WHOLE ASSERTION. The clamp draws an ellipsis; the box does not.
    // #386 let the BOX clip, on 14 of 33 plies at 320, so the sentence just stopped mid-phrase. Asserting
    // "nothing is ever cut" would be the wrong test - at 320 the grown sentence genuinely cannot fit a
    // bubble that respects the board, and the full text is always readable in the box UNDER the board.
    // What must never happen is cutting WITHOUT SAYING SO.
    L.say(capAt===0,geo+': the bubble never sits jammed against its own height cap ('+capAt+' of '+walked+' plies), so the BOX is never what clips the sentence. The #386 build sat on the cap on 28 of 33 at 320 and cut the text silently',capAt);
    L.say(cutAt.length<=4,geo+': at most four plies of '+walked+' are clamped at all ('+cutAt.length+': '+(cutAt.join(', ')||'none')+'), and a clamp draws an ellipsis. A build that truncated most of the game would fail here even though every cut was "signalled"',cutAt);
    await R.goPly(b,31); await b.settle(300);
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
