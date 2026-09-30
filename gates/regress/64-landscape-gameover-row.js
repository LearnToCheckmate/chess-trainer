// gates/regress/64-landscape-gameover-row.js
// US-PL-13 / TC-PL-035. #438, from
// jobs/landscape-game-over-keeps-the-live-row-and-the-rail-clips-half-of-it-2026-09-30, which #437's TWO
// antagonists found independently from different doors and #437 handed over on the pen.
//
// THE DEFECT, two halves with one cause. On the shipped #437 bundle (md5 5751da3ce0d9) at 730x375, a finished
// game kept the LIVE control row - Moves, Back, Forward, Hint, Flip, More - because the swap at chess.jsx:6314
// read `(!wide&&_gameOver)`. So there was no Rematch anywhere, and the Hint was ENABLED AND INERT (requestHint
// returns immediately on getStatus(game)). Separately the wide-only "Review this game" button, 45.0px tall (the 52 an
// earlier draft gave is the row DISPLACEMENT including the parent's gap:7 - antagonist A) and laid
// out ABOVE the row inside a rail of clientHeight 216, pushed the row from y164 down to y216-266.5 against a clip
// bottom of 242 - so the bottom 24 of each control's 51px was unpainted and not hit-testable, its own centre in
// the dead band. #438 drops the `!wide` and deletes the duplicate button; landscape is now portrait's row exactly.
//
// ── WHY THIS GATE DOES **NOT** ASSERT scrollHeight === clientHeight, THOUGH ITS JOB SAYS TO ─────────────────
// The job's case says "assert the rail's scrollHeight equals its clientHeight so nothing is clipped". I MEASURED
// that before encoding it and it is WRONG AS WRITTEN - CLAUDE.md's rule that a flag's proposed fix is a hypothesis
// and not a prescription is exactly why it was checked. On the SHIPPED bundle the rail's scrollHeight exceeds its
// clientHeight by 142px in the LIVE landscape game and after every step-back, with all twelve sample points on all
// six controls reachable. The excess is the moves-panel, and CLAUDE.md says in terms that vertical spill inside a
// scroller is fine. So sh===ch would go RED on a healthy bundle and would have to be weakened later, which is how
// an assertion becomes decoration. The property that matters is the one the player's thumb finds: EVERY CONTROL IN
// THE ROW IS FULLY HIT-TESTABLE AT THE TERMINAL PLY. B3 asserts that by sampling every 4px down each control's own
// height, and B4 asserts the mechanism behind it (the row's bottom lies inside the rail's visible window). The job
// is amended with this measurement rather than silently departed from.
//
// ── WHAT MAKES EACH ASSERTION ABLE TO FAIL, run against the REAL shipped #437 bundle rather than argued ───────
//   B1 Review AND Rematch present  -> #437: FAIL (row is Moves/Back/Forward/Hint/Flip/More)
//   B2 no Hint at the terminal ply  -> #437: FAIL (Hint present, enabled, and inert)
//   B3 every control 100% reachable -> #437: FAIL (6 of 12 points, first dead at dy=27 of 51)
//   B4 row bottom inside the rail   -> #437: FAIL (bottom 266.5 vs clip bottom 242)
//   B5 all of it after Back x2      -> #437: FAIL on the same three
//   B0 and B6 PASS ON BOTH BUNDLES BY DESIGN and are not part of the control count. They are the two assertions
//      that stop this gate being satisfiable the cheap way, and each is one line:
//        B0 is INSTRUMENT VALIDATION - Hint in a LIVE landscape game MOVES the 64-square signature. Every
//           "the Hint is gone / was inert" claim here is vacuous unless B0 passes first (gate 63's A2 lesson, and
//           #385's rule that an absence assertion must first prove presence).
//        B6 is the OVER-APPLICATION CONTROL - the LIVE landscape row must STILL be Hint and Flip and must NOT
//           carry Review or Rematch. Without B6, keying the swap to a constant `true` would pass B1-B5 and break
//           every live game, which is precisely the shape of fix a green suite should refuse to certify.
//   B7 is the PORTRAIT REGRESSION GUARD: #437's portrait fix must survive. Green on both bundles, by design.
//
// ROUTE: every landscape state is reached by driving the game in PORTRAIT and THEN ROTATING. That is gate 62's
// rule and it is not decoration - a real phone is opened in portrait and turned, and gate 16's blocks E and F
// published landscape numbers for years from a direct launch, a viewport no user can be in.
//
// TERMINAL KINDS: `_gameOver` is `playEnd || getStatus(game)`, two terms. Checkmate exercises ONLY the getStatus
// half (playEnd is null on a mate); resignation exercises ONLY the playEnd half. Driving one would leave half the
// predicate untested, which is the #375 single-worker-fallback mistake. Both are driven here.
'use strict';
const L=require('../lib');const P=require('../drive/play');

const PORT={w:375,h:730,safe:''};
// 730x375 and 667x375 share a height (availH 221) and 844x390 differs (236); 667 is here as an independent
// ROUTE and width, not as an independent height. Stated because gate 62's first draft overclaimed exactly this.
const LAND=[{w:730,h:375},{w:844,h:390},{w:667,h:375}];
const ROW=['Moves','Back','Forward','Review','Rematch','Hint','Flip','More'];

const sigOf=(b)=>b.page.evaluate(()=>{
  const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.r.width)best={e,r};}
  if(!best)return null;
  return [...best.e.children].slice(0,64).map(k=>{
    const cs=getComputedStyle(k);
    const kids=[...k.children].map(c=>{const s=getComputedStyle(c);const r=c.getBoundingClientRect();
      return c.tagName+':'+s.backgroundColor+':'+s.backgroundImage.slice(0,40)+':'+s.opacity+':'+s.border+':'+Math.round(r.width)+'x'+Math.round(r.height);}).join(',');
    return cs.backgroundColor+'|'+cs.boxShadow+'|'+kids+'|'+(k.innerText||'').trim();
  }).join(';');
});

// The control row, read off the title= labels _CBtn has always emitted, picked as the densest y band.
const rowOf=(b,want)=>b.page.evaluate((want)=>{
  const all=[...document.querySelectorAll('button')].filter(x=>{const t=(x.title||'').trim();const r=x.getBoundingClientRect();
    return want.indexOf(t)>=0&&r.width>1&&r.height>1;})
    .map(x=>{const r=x.getBoundingClientRect();
      return {label:(x.title||'').trim(),x:Math.round(r.left),y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,
              h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,dis:!!x.disabled};});
  if(!all.length)return {labels:[],items:[],bottom:null};
  const ys=all.map(a=>a.y).sort((p,q)=>p-q);let bandY=ys[0],bandN=0;
  for(const y of ys){const n=all.filter(a=>Math.abs(a.y-y)<=3).length;if(n>bandN){bandN=n;bandY=y;}}
  const items=all.filter(a=>Math.abs(a.y-bandY)<=3).sort((p,q)=>p.x-q.x);
  return {labels:items.map(i=>i.label),items,bottom:Math.max.apply(null,items.map(i=>i.bottom))};
},want);

// Is the WHOLE height of every control in the row reachable by a finger? Sample every 4px down its own box.
// elementFromPoint, not scrollIntoView: script can reach a clipped box and a thumb cannot (CLAUDE.md, #380/#382).
// SCOPED TO THE ROW BAND, not to "every button that happens to carry a row title". Antagonist A measured that
// the two are different sets and that the assertion text claimed the narrower one. Conservative either way, but an
// assertion should measure what it says it measures.
const hitMap=(b,want)=>b.page.evaluate((want)=>{
  const res=[];
  const cand=[...document.querySelectorAll('button')].filter(x=>{const t=(x.title||'').trim();const r=x.getBoundingClientRect();
    return want.indexOf(t)>=0&&r.width>1&&r.height>1;});
  if(!cand.length)return res;
  const ys=cand.map(x=>x.getBoundingClientRect().top).sort((p,q)=>p-q);
  let bandY=ys[0],bandN=0;
  for(const y of ys){const n=cand.filter(x=>Math.abs(x.getBoundingClientRect().top-y)<=3).length;if(n>bandN){bandN=n;bandY=y;}}
  for(const x of cand){
    const t=(x.title||'').trim();
    const r=x.getBoundingClientRect();if(Math.abs(r.top-bandY)>3)continue;
    const cx=r.left+r.width/2;const pts=[];
    for(let dy=3;dy<r.height;dy+=4){const el=document.elementFromPoint(cx,r.top+dy);pts.push(!!(el&&(el===x||x.contains(el))));}
    const c=document.elementFromPoint(cx,r.top+r.height/2);
    res.push({label:t,h:Math.round(r.height*10)/10,ok:pts.filter(Boolean).length,total:pts.length,
              centre:!!(c&&(c===x||x.contains(c)))});
  }
  return res;
},want);

// The rail is the wide side column: a scroller taller than 60px whose overflow-x is hidden and which actually clips.
const railOf=(b)=>b.page.evaluate(()=>{
  let best=null;
  for(const el of document.querySelectorAll('div')){
    const st=getComputedStyle(el);
    if(st.overflowY!=='auto'&&st.overflowY!=='scroll')continue;
    const r=el.getBoundingClientRect();
    if(r.width<60||r.height<60||r.left<20)continue;                  // the rail sits to the right of the board
    if(!best||r.top>best.y)best={x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),
      h:Math.round(r.height),ch:el.clientHeight,sh:el.scrollHeight,clipBottom:Math.round(r.top+el.clientHeight)};
  }
  return best;
});

// The three wide-only sites that used to mount at game over: the bot chip, the Elo pill and the Elo slider.
// Read by what they SAY and by their own rects, not by a hook this build added - an assertion keyed only to a
// selector its own commit introduces cannot see the defect it removes (#432's lesson, jobs/an-assertion-keyed-...).
const eloChrome=(b)=>b.page.evaluate(()=>{
  const sliders=[...document.querySelectorAll('input[type=range]')].filter(x=>{const r=x.getBoundingClientRect();return r.width>2&&r.height>2;}).length;
  const eloPills=[...document.querySelectorAll('span')].filter(x=>/\u2248\s*\d+\s*Elo/.test(x.innerText||'')).map(x=>(x.innerText||'').trim());
  const botChips=[...document.querySelectorAll('span')].filter(x=>/vs Computer|^(Pip|Rosa|Milo|Astrid|Viktor)$/.test((x.innerText||'').trim())).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||'').trim(),y:Math.round(r.top)};});
  return {sliders,eloPills,botChips};
});

async function tapTitle(b,label,wait){
  const ok=await b.page.evaluate((label)=>{const x=[...document.querySelectorAll('button')].find(e=>(e.title||'').trim()===label);
    if(!x)return false;const r=x.getBoundingClientRect();if(r.width<2||r.height<2)return false;x.click();return true;},label);
  await b.settle(wait==null?600:wait);return ok;
}
async function rotate(b,g){await b.page.setViewportSize({width:g.w,height:g.h});await b.settle(1400);}

const KINDS=[
  {id:'M',name:'checkmate (the getStatus half of _gameOver)',drive:async(b)=>{
     await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
     await b.move('f2','f3',450);await b.move('e7','e5',450);await b.move('g2','g4',450);await b.move('d8','h4',900);
     await b.settle(700);}},
  {id:'R',name:'resignation (the playEnd half of _gameOver)',drive:async(b)=>{
     await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
     await b.move('e2','e4',450);await b.move('e7','e5',450);await b.settle(300);
     await tapTitle(b,'More',600);
     await b.tapText(/^Resign$/).catch(()=>{});await b.settle(400);             // #375: the first tap only ARMS it
     await b.tapText(/^Tap again to resign$/).catch(()=>{});await b.settle(1100);
     await b.page.mouse.click(8,8).catch(()=>{});await b.settle(400);}},
];

// assert the three terminal-ply properties; used at the terminal ply AND again after Back x2
async function assertOver(b,tag,shots){
  const row=await rowOf(b,ROW),hm=await hitMap(b,ROW),rail=await railOf(b);
  const has=(l)=>row.labels.indexOf(l)>=0;
  L.say(has('Review')&&has('Rematch'),
    tag+' a finished game offers Review AND Rematch in the control row',{labels:row.labels.join(',')});
  L.say(!has('Hint'),
    tag+' and offers NO Hint - the control that is enabled and does nothing at game over is absent, not merely clipped',{labels:row.labels.join(',')});
  const bad=hm.filter(h=>h.ok<h.total||!h.centre);
  L.say(hm.length>0&&bad.length===0,
    tag+' EVERY control in the row is hit-testable down its WHOLE height (4px steps) and at its own centre',
    {n:hm.length,failing:bad.map(h=>h.label+' '+h.ok+'/'+h.total+(h.centre?'':' CENTRE DEAD')).join(' | ')||'none',
     sample:hm.map(h=>h.label+' '+h.ok+'/'+h.total).join(' ')});
  L.say(!!(row.bottom!=null&&rail&&row.bottom<=rail.clipBottom),
    tag+' THE MECHANISM: the row lies inside the rail\'s visible window, so nothing needs a scroll that shows no affordance',
    {rowBottom:row.bottom,clipBottom:rail?rail.clipBottom:null,railCh:rail?rail.ch:null,railSh:rail?rail.sh:null});
  return {row,hm,rail};
}

L.run(async()=>{
 for(const g of LAND){
  const kinds=(g.w===730)?KINDS:[KINDS[0]];   // both halves of the predicate at the primary geometry, mate at the others
  for(const k of kinds){
   const G='land '+g.w+'x'+g.h+' '+k.id+': ';

   // ===== B0 + B6: the LIVE landscape game. Instrument validation, and the over-application control. =====
   {
    const b=await L.launch({geo:PORT,name:'l64-live-'+g.w+k.id});await b.open();
    try{
      await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
      await b.move('e2','e4',450);await b.move('e7','e5',450);await b.settle(400);
      await rotate(b,g);
      const live=await rowOf(b,ROW);
      const before=await sigOf(b);
      L.say(!!before&&before.split(';').length===64,G+'B0a the 64-square signature reads 64 squares',before?before.split(';').length:null);
      const tapped=await tapTitle(b,'Hint',1200);
      const after=await sigOf(b);
      L.say(tapped&&after!==before,
        G+'B0 INSTRUMENT VALIDATION: tapping Hint in a LIVE landscape game MOVES the 64-square signature. B2 and B5b below are vacuous unless this passes',
        {tapped,moved:after!==before});
      L.say(live.labels.indexOf('Hint')>=0&&live.labels.indexOf('Flip')>=0,
        G+'B6a OVER-APPLICATION CONTROL: a LIVE landscape game still offers Hint and Flip',{labels:live.labels.join(',')});
      L.say(live.labels.indexOf('Review')<0&&live.labels.indexOf('Rematch')<0,
        G+'B6b OVER-APPLICATION CONTROL: and offers NEITHER Review NOR Rematch - so keying the swap to a constant cannot pass this gate',{labels:live.labels.join(',')});
      const lhm=await hitMap(b,ROW);const lbad=lhm.filter(h=>h.ok<h.total||!h.centre);
      L.say(lhm.length>0&&lbad.length===0,G+'B6c the LIVE row is fully reachable too (the baseline the terminal ply must match)',
        {failing:lbad.map(h=>h.label+' '+h.ok+'/'+h.total).join(' | ')||'none'});
    }catch(e){L.say(false,G+'B0/B6 block drove to its state',String(e.message||e));}
    await b.close();
   }

   // ===== B1-B5: the finished game, reached in PORTRAIT and rotated =====
   {
    const b=await L.launch({geo:PORT,name:'l64-over-'+g.w+k.id});await b.open();
    try{
      await k.drive(b);
      // B7: the portrait fix #437 shipped must still hold, before we rotate
      if(g.w===730&&k.id==='M'){
        const p=await rowOf(b,ROW);
        L.say(p.labels.indexOf('Review')>=0&&p.labels.indexOf('Rematch')>=0&&p.labels.indexOf('Hint')<0,
          'portrait 375x730 '+k.id+': B7 REGRESSION GUARD - #437\'s portrait row still swaps to Review and Rematch at the terminal ply',{labels:p.labels.join(',')});
      }
      await rotate(b,g);
      await assertOver(b,G+'B1-B4 TERMINAL PLY:',true);
      await b.shot('g64-'+g.w+'x'+g.h+'-'+k.id+'-terminal');

      // ===== B5: after Back x2. #437's trap - the clip must not become permanent, and the row must not be ply-keyed. =====
      const b1=await tapTitle(b,'Back',700);const b2=await tapTitle(b,'Back',700);
      L.say(b1&&b2,G+'B5a the Back control could be tapped twice (guarded: the assertions below are worthless if this failed)',{b1,b2});
      if(b1&&b2)await assertOver(b,G+'B5b AFTER BACK x2:',false);
    }catch(e){L.say(false,G+'B1-B5 block drove to its state',String(e.message||e));}
    await b.close();
   }
  }
 }
 // ================= C. vs COMPUTER, THE CONFIGURATION PASS & PLAY CANNOT REACH =================
 // WHY THIS BLOCK EXISTS, and it is the most important thing in this file. The first version of this gate was six
 // Pass & Play sessions and it went 57/0 GREEN on a tree where vs COMPUTER in landscape was STILL CLIPPED - row
 // bottom 253.5 against a clip of 242, 9 of 12 points on every control, persisting through a step-back. Pass &
 // Play sets opponent==='human', so the three wide-only sites that mount the bot chip, the Elo pill and the Elo
 // slider at game over are never mounted in ANY of those six sessions, and they are worth 53.0px of rail (an earlier
// draft said 39, which differenced TWO OPPONENTS - antagonist A). That is
 // #375's single-worker-fallback mistake: a gate that exercises one branch twice. CLAUDE.md's rule is that when a
 // code path is chosen by configuration, the gate covers EVERY branch or it is not a gate.
 for(const g of [{w:730,h:375},{w:844,h:390}]){
  const G='land '+g.w+'x'+g.h+' C: ';
  // C0/C6: the LIVE vs-Computer landscape game - instrument validation and the over-application control
  {
   const b=await L.launch({geo:PORT,name:'l64-cpulive-'+g.w});await b.open();
   try{
     await P.states['cpu-4ply'](b);
     await rotate(b,g);
     const live=await rowOf(b,ROW);const before=await sigOf(b);
     const tapped=await tapTitle(b,'Hint',1400);const after=await sigOf(b);
     L.say(tapped&&after!==before,
       G+'C0 INSTRUMENT VALIDATION: tapping Hint in a LIVE vs-Computer landscape game MOVES the 64-square signature',{tapped,moved:after!==before});
     L.say(live.labels.indexOf('Hint')>=0&&live.labels.indexOf('Review')<0,
       G+'C6 OVER-APPLICATION CONTROL: a LIVE vs-Computer landscape game still offers Hint and NOT Review',{labels:live.labels.join(',')});
     const lec=await eloChrome(b);
     L.say(lec.sliders===0&&lec.eloPills.length===0,
       G+'C6b and the LIVE game still hides the Elo chrome, so the pre-game/live half of that condition is untouched',lec);
   }catch(e){L.say(false,G+'C0/C6 block drove to its state',String(e.message||e));}
   await b.close();
  }
  // C1-C5: vs Computer, RESIGNED (playEnd, and NOT ply-keyed, so this is the state that persisted through Back)
  {
   const b=await L.launch({geo:PORT,name:'l64-cpuover-'+g.w});await b.open();
   try{
     await P.states['cpu-resigned'](b);
     await rotate(b,g);
     await assertOver(b,G+'C1-C4 TERMINAL (vs Computer, resigned):',false);
     const ec=await eloChrome(b);
     // C4b WAS REWRITTEN BEFORE THE PUSH, BY THE FULL SUITE, AND IT IS NOT A WEAKENING. Its first version
     // asserted the Elo slider AND the Elo pill are both gone. That shipped a real regression:
     // gates/regress/16-cpu-result-line.js E3 went RED with strengthHits:[] at 730x375, because E3 pins EXACTLY
     // ONE painted element stating the computer's adaptive strength once the result card has gone, and #435 is
     // the build that deliberately reduced that from two to one. Zero is not an improvement on two. So the pill
     // KEEPS its game-over mounting and only the slider is dropped - 23px with the duplicate bot chip, against
     // the 11.5px the row needed. This assertion now pins the DECIDED behaviour rather than the behaviour my
     // first draft happened to produce: the slider is gone AND the strength is still stated exactly once.
     L.say(ec.sliders===0,
       G+'C4b THE MECHANISM: at game over the wide-only Elo SLIDER is not mounted - part of the 23px that was pushing the row past the rail clip',ec);
     L.say(ec.eloPills.length===1,
       G+'C4d AND THE STRENGTH IS STILL STATED EXACTLY ONCE - not zero. Removing the pill too made 16-cpu-result-line E3 red (#435 reduced this from two to one, and zero is not an improvement on two)',ec);
     // ===1 and not <=1. Antagonist A: <=1 is satisfied by ZERO, so it cannot tell "the duplicate is gone" from
     // "both are gone" - which is exactly the distinction #435 acted on, and exactly the hole that made deleting
     // the Elo pill look fine until 16-cpu-result-line E3 went red. Strengthened before the push.
     L.say(ec.botChips.length===1,
       G+'C4c and the bot name is stated EXACTLY ONCE - not twice (the y110 duplicate of the player-bar chip, #435\'s class) and not zero',
       {chips:ec.botChips.map(c=>c.t+'@'+c.y).join(' ')});
     await b.shot('g64-'+g.w+'x'+g.h+'-C-terminal');
     const b1=await tapTitle(b,'Back',700);
     L.say(b1,G+'C5a the Back control could be tapped (the assertions below are worthless if this failed)',{b1});
     if(b1)await assertOver(b,G+'C5b AFTER BACK (playEnd is NOT ply-keyed, so this state persisted on the shipped bundle):',false);
   }catch(e){L.say(false,G+'C1-C5 block drove to its state',String(e.message||e));}
   await b.close();
  }
 }
 L.done();
});
