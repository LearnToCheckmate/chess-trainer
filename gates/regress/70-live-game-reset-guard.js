// gates/regress/70-live-game-reset-guard.js
// #471, for jobs/at-least-eleven-fullreset-call-sites-destroy-a-live-game-on-one-silent-tap-2026-10-03.
// Story US-R16 (extended, see claude/stories/USER-STORIES.md), case TC-R45.
//
// WHAT IS UNDER TEST. #469 made the Play setup sheet's primary button ARM over a live game, as an amber default
// (flags/amber-469-start-game-arms-over-a-live-game-rather-than-being-relabelled), and published its class sweep
// as "2 found / 1 fixed / 1 left ... both instances are this one button". Antagonist A falsified that in one
// grep. MEASURED AGAIN HERE at origin/main 2077175 before any change, AND THE SCOPE OF THE COUNT IS STATED
// BECAUSE MY FIRST VERSION OF IT WAS WRONG IN EXACTLY THE WAY THIS PROJECT KEEPS PAYING FOR. This header first
// read "chess.jsx has 12 `fullReset()` call sites". That is the count of the NO-ARGUMENT SPELLING only:
// `grep -o 'fullReset()'` is 12, `grep -o 'fullReset('` is 17, one of which is prose inside a comment, so there
// are SIXTEEN real call sites. Antagonist A found it, and the four the spelling dropped are the interesting
// ones - `_play`, `_autogame`, the setup committer and `learn-play-position`, the last of which was the one
// site still unguarded. A count scoped to a spelling cannot be checked [CLAUDE.md, #411], and #469 was
// falsified on precisely a published class count.
// THE SIXTEEN, classified against the predicate "a control a player can reach that replaces the game in
// progress": NINE routed through `guardReset` here, painting SIXTEEN controls - the More sheet's "New game"
// row, the lesson practice sheet's "Play this position vs Computer", and SEVEN Game-setup call sites in the
// hamburger that paint fourteen pills (opponent x3, No clock, the TIME_CONTROLS map x8 from one handler,
// colour x2). ONE was already guarded (#469's setup-start). FOUR are deliberately left with reasons (the three
// online paths, where leaving or matchmaking is itself the act, and Rematch, where the game is over and
// replacing it is the button's purpose - G1 is the control that proves the guard did not leak into it). TWO
// are the preview gallery's dev-only helpers, and `_play` is never called at all.
//
// WHY THE ASSERTIONS ARE SHAPED THIS WAY - each of these is a trap this project has already paid for:
//
//  1. A GUARD THAT ARMS AND NEVER FIRES LOOKS IDENTICAL TO A GUARD THAT WORKS. #469's own D2 lesson: its first
//     assertion for the armed button was satisfied by a permanently DEAD button. So every arm block here asserts
//     BOTH halves - one tap does not destroy (B1/C2/F1) AND the second tap does destroy (B4/C5/F2). Neither on
//     its own is evidence.
//
//  2. THE ARM MUST BE KEYED, AND A BOOLEAN WOULD PASS EVERY ASSERTION ABOVE. Block D is the whole reason
//     `resetArm` holds a key rather than true/false: it arms one pill and then taps a DIFFERENT one, and requires
//     the game to survive. A boolean implementation is green on A, B, C, E, F, G, H and I and RED only on D.
//
//  3. A ROW THAT APPEARS ABOVE A CONTROL MOVES THE CONTROL UNDER THE FINGER. This is the wrong-action shape
//     filed at #393, at #427's lesson action row and at #428 (Reset pushed under the fixed tab bar). The warning
//     sentence sits directly above the pills, so it is rendered ALWAYS at a fixed height with only its text
//     changing. C4 and B3 measure every control's rect before and after arming and require 0.00px of movement.
//     H1 measures the reserved row's own height across all three of its states.
//
//  4. A GUARD THAT FIRES WHEN THERE IS NOTHING TO LOSE IS A REGRESSION, NOT A FIX. Block E: with no game on the
//     board a pill must apply on ONE tap, as it always has. Block G is the same point from the other side -
//     Rematch is deliberately NOT routed through the guard (the game is over and replacing it is the button's
//     entire purpose), so G proves the guard did not leak into it. #439's broad-guard veto is the precedent: a
//     guard written with no mode term suppressed the promotion picker in analysis, which was worse than the
//     defect it closed.
//
//  5. A FINISHED GAME IS STILL WORTH A CONFIRM. The predicate is `playHist.length>0` and deliberately NOT
//     `!_gameOver`. SIT run 12 measured the worse case: discarding a just-mated game also discards the only
//     route to its Review. Block F drives a real fool's mate and requires the arm there too. This is a DIFFERENT
//     predicate from #469's Start-button guard, which asks whether a game can be CONTINUED; #469's three P0s all
//     came from using one where the other was meant, so the two are asserted separately rather than assumed equal.
//
//  6. ARRIVAL CHECKS BEFORE EVERY ABSENCE CLAIM. A0/B0/C1/F0 assert the state was actually reached and the
//     instrument actually works, because "the plies did not change" is also what a tap that landed on nothing
//     produces - which is exactly how SIT run 12's harness lied to it and nearly produced a false all-clear.
//
// NEGATIVE CONTROLS, all built and run; figures in this header are measured, see claude/agents/controls/.
//   NC-MAIN      the REAL shipped #470 bundle (md5 ec59168f03a7). Every guard assertion must be RED and every
//                arrival/no-friction/control assertion GREEN. This is the free control: it is the broken build.
//   NC-BOOL      resetArm as a boolean instead of a key. Block D only must be RED.
//   NC-NORESERVE the warning row rendered conditionally instead of at a fixed height. Blocks H and C4 go RED.
//                B3 DOES NOT, and my first version of this line claimed it did - the bundle does not touch the
//                More sheet, which is the only thing B3 measures, so B3 passes on it. Antagonist A caught the
//                claim against this gate's own committed control log. B3's control is NC-LONGLABEL.
//   NC-LONGLABEL the More sheet's armed label replaced by one long enough to wrap. B3 only.
//   NC-NODISARM  the disarm effect deleted. I1/I2 only - without it the whole disarm mechanism, one of the four
//                this build adds, had no negative control at all (antagonist A's F7).
//                AND THIS IS THE CONTROL THAT MATTERS FOR B3 AND C4, not NC-MAIN. On the shipped bundle nothing
//                ever arms, so no control can move and B3/C4 are GREEN THERE BY CONSTRUCTION - green over the
//                defect. Said here rather than left for a reader to assume the whole gate is controlled by one
//                bundle: each block names the control that can actually redden it.
//   C5 and I1 are additionally VACUOUS on NC-MAIN - there one tap already gives 0 plies, and nothing is ever
//                armed - so NC-DEADARM and NC-NODISARM are their controls rather than the shipped bundle.
//   NC-DEADARM   guardReset's `apply()` removed after arming. B4/C5/F2 must be RED while B1/C2/F1 stay GREEN.
//
// GEOMETRIES: 375x730 first (Kunal, R19), then 320x568 and 390x844. The guard's own expression has no viewport
// term, so the extra two buy the LAYOUT assertions (B3, C4, H) rather than repeating the logic ones - said here
// rather than sold as coverage [#411].
'use strict';
const L=require('../lib'), P=require('../drive/play'), R=require('../drive/review'), LE=require('../drive/lesson');
const ONLY=process.env.CT_B70||'';
const GEOS=[{k:'kunal',w:375,h:730},{k:'320x568',w:320,h:568},{k:'390x844',w:390,h:844}];

const moverow=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const warnRow=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-reset-warn"]');if(!e)return null;const r=e.getBoundingClientRect();return {t:(e.innerText||'').replace(/\s+/g,' ').trim(),h:Math.round(r.height*100)/100,ch:e.clientHeight,sh:e.scrollHeight};});
/* EVERY GAME-SETUP PILL, LOCATED BY WHAT IT SAYS, INSIDE THE PRE-EXISTING [data-ct="menu-sheet"].
   THIS IS THE #432 REPAIR AND MY OWN CONTROL IS WHAT FORCED IT. The first version of this gate keyed every tap
   and every reading on data-ct attributes #471 ITSELF ADDED (setup-opp-*, setup-clock-*, more-newgame). Run
   against the real shipped #470 bundle - the ideal control, and the actual broken build - those attributes do
   not exist, so the gate THREW on a missing locator after 2 assertions instead of measuring the defect. That is
   CLAUDE.md's #432 entry verbatim: "a check that reads only what the fix added cannot see the defect the fix
   removes". The pills are therefore keyed by their own TEXT, which is identical on both bundles, and menu-sheet
   is a hook that predates this build. The data-ct attributes are kept in the app for convenience only and
   nothing in this gate depends on them. */
const PILLTXT=/^(\u{1F464} vs Human|\u{1F916} vs Computer|\u{1F310} Online|No clock|\d+ min|\d\+\d|\u2654 White|\u265a Black)$/u;
const pills=(b)=>b.page.evaluate(()=>{const sh=document.querySelector('[data-ct="menu-sheet"]');if(!sh)return {};
  const re=/^(\u{1F464} vs Human|\u{1F916} vs Computer|\u{1F310} Online|No clock|\d+ min|\d\+\d|\u2654 White|\u265a Black)$/u;const o={};
  for(const e of sh.querySelectorAll('span,div,button')){const t=(e.innerText||'').replace(/\s+/g,' ').trim();if(!re.test(t))continue;
    const r=e.getBoundingClientRect();if(r.width<10||r.width>230||r.height<16||r.height>46)continue;
    if(o[t])continue;
    /* CONTENT-ABSOLUTE y, NOT VIEWPORT y, AND MY OWN GATE IS WHAT FORCED THIS. The first version compared
       getBoundingClientRect().top before and after arming, and went RED at 320x568 with "65px of pill movement"
       on a bundle whose layout had not moved at all: tapPill scrollIntoView()s the pill before clicking it, the
       menu sheet is a scroller, and at 320x568 that scroll is 65px. So the assertion was reading the HARNESS's
       own scroll and calling it a layout failure - the same family as CLAUDE.md's "a bad selector is a reading"
       and #416's "check the control moved the quantity the assertion reads". Adding the scroller's scrollTop back
       makes the number a property of the LAYOUT: a pure scroll cancels, and a row appearing above the pills -
       which is the defect this assertion exists for - does not. Both numbers are reported so the next reader can
       see which one is being compared. */
    let sc=e.parentElement,st=0;
    while(sc&&sc!==document.body){if(sc.scrollHeight-sc.clientHeight>1){st=sc.scrollTop;break;}sc=sc.parentElement;}
    o[t]={x:Math.round(r.left*100)/100,vy:Math.round(r.top*100)/100,scrollTop:st,
          y:Math.round((r.top+st)*100)/100,
          w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100,bg:getComputedStyle(e).backgroundColor,txt:t};}
  return o;});
// tap a pill by its own text, scrolled into view first (the menu sheet scrolls)
async function tapPill(b,txt){
  const h=await b.page.evaluateHandle((t)=>{const sh=document.querySelector('[data-ct="menu-sheet"]');if(!sh)return null;
    for(const e of sh.querySelectorAll('span,div,button')){if((e.innerText||'').replace(/\s+/g,' ').trim()!==t)continue;const r=e.getBoundingClientRect();if(r.width<10||r.width>230||r.height<16||r.height>46)continue;e.scrollIntoView({block:'center'});return e;}return null;},txt);
  const el=h.asElement();if(!el)throw new Error('tapPill: no pill says '+txt);
  await b.page.waitForTimeout(140);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(600);return box;
}
// tap the More sheet's new-game row by its text, armed or not
async function tapNewGame(b){
  const h=await b.page.evaluateHandle(()=>{const sh=document.querySelector('[data-ct="more-sheet"]');if(!sh)return null;
    for(const e of sh.querySelectorAll('button,[role=button],div')){const t=(e.innerText||'').replace(/\s+/g,' ').trim();if(!/^(New game|Tap again to discard)$/.test(t))continue;const r=e.getBoundingClientRect();if(r.width<40||r.height<20||r.height>90)continue;return e;}return null;},null);
  const el=h.asElement();if(!el)throw new Error('tapNewGame: no New game row');
  await b.page.waitForTimeout(140);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(650);return box;
}
// the More sheet's rows, by their text, with rects
const sheetRows=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="more-sheet"]');if(!s)return null;const o=[];for(const e of s.querySelectorAll('button,[role=button],div')){const t=(e.innerText||'').replace(/\s+/g,' ').trim();if(!t||t.length>44)continue;const r=e.getBoundingClientRect();if(r.width<40||r.height<20||r.height>90)continue;o.push({t,y:Math.round(r.top*100)/100,h:Math.round(r.height*100)/100});}return o;});
const resultText=(b)=>b.page.evaluate(()=>{const hits=[];for(const e of document.querySelectorAll('*')){if(e.children.length)continue;const t=(e.innerText||'').trim();if(t&&t.length<44&&/won|win|lose|lost|Time!|Resigned|Checkmate|Stalemate|draw/i.test(t))hits.push(t);}return hits;});
/* THE 64-SQUARE OCCUPANCY STRING, not a piece COUNT. K2 first asserted "fewer than 32 pieces" and went RED on
   a correct bundle, because an OPENING lesson position has all 32 pieces and is still not the opening array -
   a count is not a position. This reads which squares are occupied, in the board's own DOM order. */
const placement=(b)=>b.page.evaluate(()=>{const gs=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));let best=null;for(const e of gs){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.getBoundingClientRect().width)best=e;}if(!best)return null;return [...best.children].slice(0,64).map(sq=>sq.querySelector('img')?'1':'0').join('');});
const pieces=(b)=>b.page.evaluate(()=>{const gs=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));let best=null;for(const e of gs){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.getBoundingClientRect().width)best=e;}return best?best.querySelectorAll('img').length:-1;});
const amber=(bg)=>/224,\s*168,\s*58/.test(bg||'');

// Pass & Play to n plies. No engine on this path, so the ply count is stable and nothing moves under us.
async function liveGame(b,n){
  await P.states['pp-m0'](b);
  await b.move('f2','f3');
  if(n>=2)await b.move('e7','e5');
  if(n>=3)await b.move('g2','g4');
  if(n>=4)await b.move('d8','h4');   // Qh4# - fool's mate, the game is OVER
  await b.settle(450);
  return P.plies(b);
}
async function openMenu(b){await b.tapCt('play-menu',650);}
async function openMore(b){await P.tapBtn(b,/^More$/,600).catch(async()=>{await b.tapText(/^More$/,{wait:600});});}
const rowY=(rows,re)=>{const r=(rows||[]).find(x=>re.test(x.t));return r?r.y:null;};

/* #393: NO TAP IN THIS GATE MAY THROW. On the broken bundle the first tap DESTROYS the game and the sheet
   closes with it, so the "second tap" has nothing to land on - and a thrown locator would take the remaining
   ~30 assertions down with it, which is exactly the failure CLAUDE.md records at #393 (4 red and then the
   harness threw, leaving ninety assertions unrun). tryTap turns an impossible tap into a false, the dependent
   assertion goes red on its own terms, and the gate carries on. */
async function tryTap(fn){try{await fn();return true;}catch(e){return false;}}

L.run(async()=>{
for(const g of (ONLY?GEOS.filter(x=>x.k===ONLY):GEOS)){
  const G=g.k;

  // ---------- A. the instrument, and B. the More sheet's New game row ----------
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-more-'+G}); await b.open();
    const p0=await liveGame(b,3);
    L.say(p0===3,G+' A0 ARRIVAL: Pass & Play reaches 3 plies, so every "nothing changed" below is a measurement and not a tap that missed',{plies:p0,row:await moverow(b)});
    await openMore(b);
    let rows=await sheetRows(b);
    const hasNew=!!(rows&&rows.some(r=>/^New game$/.test(r.t)));
    L.say(hasNew,G+' B0 ARRIVAL: the More sheet is open and carries a "New game" row',{rows:(rows||[]).map(r=>r.t)});
    if(hasNew){
      const before=rows, yResign=rowY(rows,/^(Resign|Tap again to resign)$/), yAnalyze=rowY(rows,/^Analyze$/), yCopy=rowY(rows,/^(Copy moves|Copied)/);
      await tapNewGame(b);
      const p1=await P.plies(b), r1=await moverow(b);
      L.say(p1===3,G+' B1 ONE TAP ON "New game" DOES NOT DISCARD THE GAME: plies still 3',{plies:p1,row:r1});
      rows=await sheetRows(b);
      const relabelled=!!(rows&&rows.some(r=>/^Tap again to discard$/.test(r.t)));
      L.say(relabelled,G+' B2 the row SAYS it is armed, so the first tap is not silently swallowed',{rows:(rows||[]).map(r=>r.t)});
      // 3. the rows BELOW must not move: a longer label that wrapped would push Resign/Analyze/Copy down
      const dR=yResign!=null&&rowY(rows,/^(Resign|Tap again to resign)$/)!=null?Math.abs(rowY(rows,/^(Resign|Tap again to resign)$/)-yResign):0;
      const dA=yAnalyze!=null&&rowY(rows,/^Analyze$/)!=null?Math.abs(rowY(rows,/^Analyze$/)-yAnalyze):0;
      const dC=yCopy!=null&&rowY(rows,/^(Copy moves|Copied)/)!=null?Math.abs(rowY(rows,/^(Copy moves|Copied)/)-yCopy):0;
      L.say(dR<0.01&&dA<0.01&&dC<0.01,G+' B3 ARMING MOVES NOTHING BELOW IT: Resign/Analyze/Copy are at the same y to 0.01px, so the second tap cannot land on a different row than the first',{dResign:dR,dAnalyze:dA,dCopy:dC,before:before.length,after:(rows||[]).length});
      const ok4=await tryTap(()=>tapNewGame(b));
      const p2=await P.plies(b), r2=await moverow(b);
      L.say(ok4&&p2===0,G+' B4 THE SECOND TAP ACTUALLY STARTS A NEW GAME: plies 0. Without this, a permanently dead button passes B1 (#469 D2). On a bundle with no guard there is no second tap to make - the row is gone because the first tap already took the game - and that reads here as tapped:false',{tapped:ok4,plies:p2,row:r2});
    }else{
      L.say(false,G+' B1 NOT RUN: no "New game" row'); L.say(false,G+' B2 NOT RUN'); L.say(false,G+' B3 NOT RUN'); L.say(false,G+' B4 NOT RUN');
    }
    L.say(b.errs.length===0,G+' B9 zero app console errors over the More-sheet block',b.errs.slice(0,3));
    await b.close();
  }

  // ---------- C. the Game-setup pills, D. the key, H. the reserved row ----------
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-pills-'+G}); await b.open();
    const p0=await liveGame(b,3);
    L.say(p0===3,G+' C0 ARRIVAL: 3 plies before the menu is opened',{plies:p0});
    await openMenu(b);
    const unarmed=await pills(b), wUn=await warnRow(b);
    const keys=Object.keys(unarmed);
    L.say(keys.length>=6,G+' C1 ARRIVAL: the Game-setup pills are on screen and keyed (found '+keys.length+')',keys);
    L.say(!!wUn&&wUn.h>0,G+' H0 THE SHEET RESERVES A ROW FOR THE WARNING. On a bundle with no such row this is ABSENT, which is the defect and not a missing selector: with nothing reserved there is nowhere to say it and no way to say it without moving the pills',wUn);
    L.say(!!wUn&&/starts a new game/i.test(wUn.t||''),G+' H3 WITH A GAME LIVE AND NOTHING ARMED the row already says these controls start a new game - the warning is before the first tap, not only after',wUn);

    const target=keys.includes('No clock')?'No clock':keys[0];
    const other=keys.find(k=>k!==target);
    if(target&&other){
      const okC2=await tryTap(()=>tapPill(b,target));
      const p1=await P.plies(b);
      L.say(okC2&&p1===3,G+' C2 ONE TAP ON A SETUP PILL ('+target+') DOES NOT DISCARD THE GAME: plies still 3',{tapped:okC2,plies:p1,row:await moverow(b)});
      const armed=await pills(b), wAr=await warnRow(b);
      L.say(amber(armed[target]&&armed[target].bg),G+' C3 the tapped pill is visibly armed (amber), so the state is on screen and not only in memory',{bg:armed[target]&&armed[target].bg});
      // THE LAYOUT ASSERTION. Every pill, not only the tapped one.
      let worst=0,worstK=null;
      for(const k of keys){if(!armed[k]){worst=999;worstK=k+' (vanished)';break;}
        const d=Math.max(Math.abs(armed[k].x-unarmed[k].x),Math.abs(armed[k].y-unarmed[k].y),Math.abs(armed[k].w-unarmed[k].w),Math.abs(armed[k].h-unarmed[k].h));
        if(d>worst){worst=d;worstK=k;}}
      L.say(worst<0.01,G+' C4 ARMING MOVES NO PILL BY ANY AMOUNT: worst CONTENT-ABSOLUTE delta '+worst+'px on '+worstK+' over '+keys.length+' pills (viewport y is reported too and moves with the harness\'s own scrollIntoView, which is why it is not the quantity asserted). This is the assertion that stops the fix becoming the wrong-action defect it is meant to prevent',{worst,worstK,n:keys.length,sampleBefore:unarmed[worstK||keys[0]],sampleAfter:armed[worstK||keys[0]]});
      L.say(!!wAr&&Math.abs(wAr.h-wUn.h)<0.01,G+' H1 THE RESERVED ROW IS THE SAME HEIGHT ARMED AND UNARMED ('+(wUn&&wUn.h)+' -> '+(wAr&&wAr.h)+')',{un:wUn,ar:wAr});
      L.say(!!wAr&&wAr.sh<=wAr.ch,G+' H2 the armed sentence is not cut: scrollHeight '+(wAr&&wAr.sh)+' <= clientHeight '+(wAr&&wAr.ch)+'. A reserved box that clips its own warning is #394 again',wAr);
      L.say(!!wAr&&/Tap the same choice again/i.test(wAr.t||''),G+' H4 the armed sentence names what the second tap must be - the SAME choice - because the arm is keyed',wAr&&wAr.t);

      // D. THE KEY. Tap a DIFFERENT pill: it must not confirm the first one's arm.
      const okD=await tryTap(()=>tapPill(b,other));
      const pD=await P.plies(b);
      L.say(okD&&pD===3,G+' D1 A SECOND TAP ON A DIFFERENT PILL ('+other+') DOES NOT CONFIRM THE FIRST: plies still 3. A boolean arm is green on every other assertion in this gate and RED here',{tapped:okD,plies:pD,row:await moverow(b)});
      const after=await pills(b);
      L.say(amber(after[other]&&after[other].bg)&&!amber(after[target]&&after[target].bg),G+' D2 the arm MOVED to the pill just tapped and left the first one: only one choice is ever armed',{armedNow:after[other]&&after[other].bg,wasArmed:after[target]&&after[target].bg});

      // C5. the same pill twice actually works.
      const ok5=await tryTap(()=>tapPill(b,other));
      const p2=await P.plies(b);
      L.say(ok5&&p2===0,G+' C5 TAPPING THE SAME PILL TWICE DOES START A NEW GAME: plies 0. Without this the guard could be a dead end',{tapped:ok5,plies:p2,row:await moverow(b)});
    }else{
      for(const id of ['C2','C3','C4','H1','H2','H4','D1','D2','C5'])L.say(false,G+' '+id+' NOT RUN: pills not found',keys);
    }
    L.say(b.errs.length===0,G+' C9 zero app console errors over the pills block',b.errs.slice(0,3));
    await b.close();
  }

  // ---------- I. the arm does not survive leaving the sheet ----------
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-disarm-'+G}); await b.open();
    const p0=await liveGame(b,3);
    await openMenu(b);
    const keys=Object.keys(await pills(b));
    const target=keys.includes('No clock')?'No clock':keys[0];
    if(p0===3&&target){
      await tryTap(()=>tapPill(b,target));
      await P.closeSheet(b).catch(async()=>{await b.page.mouse.click(g.w/2,6);await b.settle(400);});
      await b.settle(400);
      await openMenu(b);
      const reArmed=await pills(b);
      L.say(!amber(reArmed[target]&&reArmed[target].bg),G+' I1 THE ARM DOES NOT SURVIVE CLOSING THE MENU: the pill is unarmed on the next visit',{bg:reArmed[target]&&reArmed[target].bg});
      const okI=await tryTap(()=>tapPill(b,target));
      const p1=await P.plies(b);
      L.say(okI&&p1===3,G+' I2 so ONE tap in the new visit still does not discard the game: plies still 3. An arm that leaked across visits would let a tap taken minutes ago confirm this one',{tapped:okI,plies:p1});
    }else{L.say(false,G+' I1 NOT RUN',{plies:p0,target});L.say(false,G+' I2 NOT RUN');}
    await b.close();
  }

  // ---------- E. no friction when there is nothing to lose ----------
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-nofriction-'+G}); await b.open();
    await P.states['pp-m0'](b);
    const p0=await P.plies(b);
    L.say(p0===0,G+' E0 ARRIVAL: a fresh Pass & Play game, 0 plies',{plies:p0});
    await openMenu(b);
    const w0=await warnRow(b);
    /* The row is ABSENT, not empty-but-reserved. It was reserved-and-empty in this build's first candidate, and
       I changed it on my own re-read of the diff: with no game on the board no arm can ever happen, so the
       reserve buys nothing and a permanently blank 34px band in the menu is space that earns nothing
       [R14 dimension 10]. The reserve is complete WITHIN the regime an arm can occur in, which is the only
       regime C4 measures - and the 0-ply to 1-ply transition cannot happen with the sheet over the board. */
    L.say(w0===null,G+' E2 WITH NOTHING TO LOSE THE ROW IS NOT THERE AT ALL: no warning, and no blank band reserving space for a warning that cannot be needed',w0);
    const before=await pills(b);
    const t=Object.keys(before).includes('\u{1F916} vs Computer')?'\u{1F916} vs Computer':Object.keys(before)[0];
    const okE=await tryTap(()=>tapPill(b,t));
    const after=await pills(b);
    const applied=!!(after[t]&&!amber(after[t].bg)&&after[t].bg!==before[t].bg);
    /* NO FALLBACK TERM. The first version of this assertion read `applied || !amber(after[t].bg)`, and the
       second disjunct is satisfied by a pill that did NOTHING AT ALL - so E1 PASSED on NC-DEADARM, a bundle
       built with apply() removed, where the 0-ply tap genuinely applies nothing. I found that by reading this
       gate against a control I had already run rather than by running a new one. E1 now requires the pill to
       have become SELECTED: its background must CHANGE and must not be the armed amber. That is reachable by
       construction here - the fixture is Pass & Play, so the "vs Computer" pill starts unselected. */
    L.say(okE&&applied,G+' E1 ONE TAP APPLIES IMMEDIATELY when no game is in progress: the pill is not armed, it is selected. The guard must not add friction to the normal case',{tapped:okE,before:before[t]&&before[t].bg,after:after[t]&&after[t].bg});
    L.say(b.errs.length===0,G+' E9 zero app console errors over the no-friction block',b.errs.slice(0,3));
    await b.close();
  }

  // ---------- F. a FINISHED game is guarded too, G. Rematch is not ----------
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-mate-'+G}); await b.open();
    const p0=await liveGame(b,4);
    const res0=await resultText(b);
    L.say(p0===4&&res0.length>0,G+' F0 ARRIVAL: fool\'s mate reached, 4 plies, and the screen states a result',{plies:p0,result:res0.slice(0,3)});
    await openMore(b);
    const rows=await sheetRows(b);
    if(p0===4&&rows&&rows.some(r=>/^New game$/.test(r.t))){
      const okF1=await tryTap(()=>tapNewGame(b));
      const p1=await P.plies(b), res1=await resultText(b);
      L.say(okF1&&p1===4,G+' F1 A FINISHED GAME IS GUARDED TOO: one tap on "New game" over a mated game leaves 4 plies. SIT run 12 called this the worse case - Review is only reachable from the result screen, so discarding here also discards the only door to it',{tapped:okF1,plies:p1});
      L.say(res1.length>0,G+' F1b ... and the result is still on screen after that tap',res1.slice(0,3));
      const okF2=await tryTap(()=>tapNewGame(b));
      const p2=await P.plies(b);
      L.say(okF2&&p2===0,G+' F2 and the second tap does start the new game: plies 0',{tapped:okF2,plies:p2});
    }else{for(const id of ['F1','F1b','F2'])L.say(false,G+' '+id+' NOT RUN',{plies:p0,rows:(rows||[]).map(r=>r.t)});}
    // G. the CONTROL: Rematch is deliberately NOT guarded and must still work on one tap.
    const b2=await L.launch({geo:{w:g.w,h:g.h},name:'b70-rematch-'+G}); await b2.open();
    const q0=await liveGame(b2,4);
    L.say(q0===4,G+' G0 ARRIVAL: a second mated game for the Rematch control',{plies:q0});
    let tapped=true;
    await P.tapBtn(b2,/^Rematch$/,800).catch(()=>{tapped=false;});
    const q1=tapped?await P.plies(b2):null;
    L.say(tapped&&q1===0,G+' G1 CONTROL - REMATCH IS STILL ONE TAP: the game is over and replacing it is the button\'s whole purpose, so it is deliberately NOT routed through the guard. #439\'s broad-guard veto is why this is asserted rather than assumed',{tapped,plies:q1});
    L.say(b.errs.length===0&&b2.errs.length===0,G+' F9 zero app console errors over the mate and rematch blocks',b.errs.concat(b2.errs).slice(0,3));
    await b.close(); await b2.close();
  }

  // ---------- J. A POSITION LOADED BUT NOT YET MOVED IN. Both antagonists, from different doors. ----------
  // B drove Review -> ⋯ -> "Play from here" -> "▶ Play this position" and measured 10 of 64 squares changing on
  // ONE tap; A drove the LESSON route (block K) and got a board signature byte-identical to a fresh game. The
  // same committer carries a BOARD SCAN (gates/regress/28-scan-client.js:292 asserts a scanned FEN lands on that
  // button), which costs a photograph of a real board and lands at ZERO plies. A ply-count predicate is GREEN
  // over all of it. PIECE COUNT is the signature: the opening array has 32 and any real mid-game position fewer,
  // so "the position survived" is a number rather than a look.
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-loaded-'+G}); await b.open();
    let reached=false;
    try{ await R.states['moves-ply10'](b);
         await b.tapCt('rev-more',500);                        // gate 55's own route into the ⋯ sheet
         await b.tapText(/^Play from here$/,{wait:900});
         await b.tapText(/^▶ Play this position$/,{wait:1600});
         reached=true; }catch(e){}
    const p0=reached?await P.plies(b):null, n0=reached?await pieces(b):null;
    L.say(reached&&p0===0&&n0>0&&n0<32,G+' J0 ARRIVAL: a position is LOADED on the board at ZERO plies - '+n0+' pieces, so it is not the opening array, and the move list is empty so a ply count sees nothing to lose',{reached,plies:p0,pieces:n0});
    if(reached&&p0===0&&n0>0&&n0<32){
      await openMenu(b);
      const w=await warnRow(b);
      L.say(!!w&&!!(w.t||'').length,G+' J2 the sheet SAYS these controls start a new game even though no move has been played - on a ply-count predicate it said nothing at all',w);
      const keys=Object.keys(await pills(b));
      const t=keys.includes('No clock')?'No clock':keys[0];
      const okJ=await tryTap(()=>tapPill(b,t));
      const n1=await pieces(b);
      L.say(okJ&&n1===n0,G+' J1 ONE TAP ON A SETUP PILL DOES NOT DESTROY THE LOADED POSITION: still '+n1+' pieces (was '+n0+')',{tapped:okJ,before:n0,after:n1});
      const okJ2=await tryTap(()=>tapPill(b,t));
      const n2=await pieces(b);
      L.say(okJ2&&n2===32,G+' J3 and the second tap on the SAME pill does start the new game: '+n2+' pieces, the full opening array',{tapped:okJ2,pieces:n2});
    }else{for(const id of ['J1','J2','J3'])L.say(false,G+' '+id+' NOT RUN: the loaded-position state was not reached',{reached,plies:p0,pieces:n0});}
    L.say(b.errs.length===0,G+' J9 zero app console errors over the loaded-position block',b.errs.slice(0,3));
    await b.close();
  }

  // ---------- K. THE LESSON PRACTICE SHEET. Antagonist A's F2, and a comment said it was guarded. ----------
  // chess.jsx's own comment claimed this route was "guarded at its own button, on `isOver`". `isOver` asks
  // whether the LESSON position is terminal and says nothing about the live Play game, so A drove it with a
  // 3-ply game running and took the move row from "1.f3 1...e5 2.g4" to empty on ONE tap. The comment is
  // withdrawn in chess.jsx and the site now goes through guardReset.
  {
    const b=await L.launch({geo:{w:g.w,h:g.h},name:'b70-lesson-'+G}); await b.open();
    await P.states['pp-m0'](b);
    const START=await placement(b);              // this session's own opening array, not a constant
    await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4'); await b.settle(450);
    const p0=await P.plies(b);
    let at=false; try{ await LE.states['practice-more'](b); at=true; }catch(e){}
    const label=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="learn-play-position"]');return e?{t:(e.innerText||'').trim(),dis:!!e.disabled}:null;});
    const l0=at?await label():null;
    L.say(p0===3&&at&&!!l0&&!l0.dis,G+' K0 ARRIVAL: a 3-ply Pass & Play game is running AND the lesson practice sheet offers an enabled "Play this position vs Computer"',{plies:p0,at,label:l0});
    if(p0===3&&at&&l0&&!l0.dis){
      await b.tapCt('learn-play-position',700).catch(()=>{});
      const l1=await label();
      L.say(!!l1&&/Tap again/.test(l1.t||''),G+' K1 ONE TAP ARMS INSTEAD OF STARTING: the lesson sheet is still up and its button now asks for a second tap',l1);
      await b.tapCt('learn-play-position',900).catch(()=>{});
      const s2=await placement(b), p2=await P.plies(b);
      L.say(!!s2&&s2!==START&&p2===0,G+' K2 and the second tap DOES start the LESSON position - the board occupancy differs from this session\'s own opening array, at 0 plies - so the arm is not a dead end',{differs:s2!==START,plies:p2});
    }else{for(const id of ['K1','K2'])L.say(false,G+' '+id+' NOT RUN: lesson practice sheet not reached over a live game',{plies:p0,at,label:l0});}
    L.say(b.errs.length===0,G+' K9 zero app console errors over the lesson block',b.errs.slice(0,3));
    await b.close();
  }
}
},'70-live-game-reset-guard');
