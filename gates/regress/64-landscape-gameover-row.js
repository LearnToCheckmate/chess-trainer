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
const ROW=['Moves','Back','Forward','Review','Rematch','New game','Hint','Flip','More'];   // 'New game': the sideways finished game's 2x2 block (#550 a23)

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
  /* #550 a23 (his Option A): a finished sideways game's controls are not one row - Back and Forward sit in the result card and Review,
     Rematch, New game and More are a 2x2 block (land-over-btns) - so there the "row" is every wanted control on screen, top to bottom. */
  const items=(document.querySelector('[data-ct="land-over-btns"]')?all:all.filter(a=>Math.abs(a.y-bandY)<=3)).sort((p,q)=>(p.y-q.y)||(p.x-q.x));
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
    const r=x.getBoundingClientRect();if(!document.querySelector('[data-ct="land-over-btns"]')&&Math.abs(r.top-bandY)>3)continue;   // #550 a23: every control of the sideways finished game, not one band
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
     await P.closeSheet(b).catch(()=>{}); /* #548 item (92): (8,8) is the top row's Home now */await b.settle(400);}},
];

// #548 item (118), TC-PL-053, Kunal B8B-LANDSCAPE-ROW 'side': in landscape the row moves into the side space beside the
// board and EVERY control is at least 44px wide. Found by title (the row has no hook, and none was added), against the
// board found the only way there is - the widest repeat(8,...) grid. Main (c7f6a1228e43) pins the row to boardPx, so
// at 730x375 Hint and Flip read 27px and this reds.
const boardOf=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(e=>e.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  return g?{l:g.left,r:g.right,vw:innerWidth}:null;});
async function assertWide(b,row,tag){
  const bd=await boardOf(b);
  L.say(row.items.length>=3,tag+' TC-PL-053 PRECONDITION the control row was found by title ('+row.items.length+' controls)',{labels:row.labels.join(',')});
  const narrow=row.items.filter(i=>i.w<44);
  L.say(row.items.length>=3&&narrow.length===0,tag+' TC-PL-053 every control in the landscape row is at least 44px wide',
    {widths:row.items.map(i=>i.label+' '+i.w).join(' '),narrow:narrow.map(i=>i.label+' '+i.w).join(' ')||'none'});
  const out=row.items.filter(i=>!bd||i.x<bd.r-0.5||i.x+i.w>bd.vw+0.5);
  L.say(!!bd&&row.items.length>=3&&out.length===0,tag+' TC-PL-053 and every control sits in the side space: right of the board and inside the viewport',
    {boardRight:bd&&Math.round(bd.r),vw:bd&&bd.vw,outside:out.map(i=>i.label+' x'+i.x+' w'+i.w).join(' ')||'none'});
}

// assert the three terminal-ply properties; used at the terminal ply AND again after Back x2
async function assertOver(b,tag,shots){
  const row=await rowOf(b,ROW),hm=await hitMap(b,ROW),rail=await railOf(b);
  const has=(l)=>row.labels.indexOf(l)>=0;
  await assertWide(b,row,tag);
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
      await assertWide(b,live,G+'B6w LIVE');
      const before=await sigOf(b);
      L.say(!!before&&before.split(';').length===64,G+'B0a the 64-square signature reads 64 squares',before?before.split(';').length:null);
      /* #550 HEX-R-10: Pass & Play's Hint is disabled (no hint against a person), so the instrument is validated with Flip - it moves every
         square of the 64-square signature, which is what B2 and B5b need to know the instrument can see; their Hint-does-nothing claims stand. */
      const tapped=await tapTitle(b,'Flip',1200);
      const after=await sigOf(b);
      L.say(tapped&&after!==before,
        G+'B0 INSTRUMENT VALIDATION: tapping Flip in a LIVE landscape game MOVES the 64-square signature. B2 and B5b below are vacuous unless this passes',
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
      // B8 [#547 item (92); jobs/landscape-game-over-banner-is-cut-mid-letter-2026-09-29]: the result card's WORD is painted whole.
      // Its font was 5.2vw - 38px at 730 wide - inside a box sized from a 216px board, so the player read 'Checkma'. The card is
      // found first (its own line), then the word's glyph box must lie inside the card AND inside the board that clips it.
      // ON 'M' ONLY: the 'R' drive taps (8,8) after resigning, which DISMISSES the result card by design, so there is no card to
      // measure there and B8 would be a red about the drive, not the app (the first #547 run did exactly that).
      if(k.id!=='M')L.note(G+'B8 NOT RUN on '+k.id+' and not counted: this drive dismisses the result card before the rotate, so there is no headline to measure');
      /* #550 a23 (his Option A): sideways, the result is the rail's card (land-result) and no card is drawn on the board, so the word must
         lie inside ITS card and inside the viewport; the board clause applies to the on-board card, which is now portrait's only. */
      else {const w=await b.page.evaluate(()=>{const lr=document.querySelector('[data-ct="land-result"]');const c=lr||document.querySelector('[data-ct="result-card"]');if(!c)return null;const h=[...c.querySelectorAll('div')].find(d=>d.children.length===0&&(d.textContent||'').trim());
         const t=h&&[...h.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());const rg=document.createRange();if(t)rg.selectNodeContents(t);const r=t?rg.getBoundingClientRect():null;
         const cr=c.getBoundingClientRect();const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0];
         return {word:t?t.nodeValue.trim():null,ink:r&&[Math.round(r.left*10)/10,Math.round(r.right*10)/10],card:[Math.round(cr.left*10)/10,Math.round(cr.right*10)/10],board:lr?[0,innerWidth]:(g&&[Math.round(g.left*10)/10,Math.round(g.right*10)/10]),inRail:!!lr};});
       L.say(!!w&&!!w.word&&!!w.ink,G+'B8 PRECONDITION the result card is up and its headline word is found ('+(w&&w.word)+')',w);
       L.say(!!w&&!!w.ink&&!!w.board&&w.ink[0]>=w.card[0]-0.5&&w.ink[1]<=w.card[1]+0.5&&w.ink[0]>=w.board[0]-0.5&&w.ink[1]<=w.board[1]+0.5,G+'B8 the headline "'+(w&&w.word)+'" is painted whole - inside its card and inside '+(w&&w.inRail?'the screen (the rail\'s card, #550 a23)':'the board that clips it'),w);}
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
 // TC-PL-056 [#548 item (111); jobs/landscape-320-tall-is-unusable-and-a-mate-cannot-be-played-2026-09-30]: A 320-TALL LANDSCAPE GAME FITS.
 // At 568x320 and 480x320 the side-rail layout never engaged ((vp.w-RAIL-48) < 360), so the portrait stack laid out 480px in a 320px
 // viewport with the whole control row at y 350-401 - measured on main c7f6a1228e43. A Pass & Play fool's mate is played to the end,
 // then the board and every control in the row are read: both inside the viewport, and the row hit-testable at its own centres.
 for(const g of [{w:568,h:320},{w:480,h:320}]){
  const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'l64-320tall-'+g.w});await b.open();const G='land '+g.w+'x'+g.h+' 320-TALL: ';
  try{
   await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^\u25b6 Start game$/,{wait:900});
   const live=await rowOf(b,ROW);
   L.say(live.items.length>=5&&live.bottom!=null&&live.bottom<=g.h+0.5,G+'TC-PL-056 the LIVE control row is on screen ('+live.labels.join(',')+', bottom '+live.bottom+' of '+g.h+')',{labels:live.labels.join(','),bottom:live.bottom});
   await b.move('f2','f3',450);await b.move('e7','e5',450);await b.move('g2','g4',450);await b.move('d8','h4',900);await b.settle(700);
   const over=await b.page.evaluate(()=>/Checkmate/i.test(document.body.innerText||''));
   L.say(over,G+'TC-PL-056 PRECONDITION the fool\'s mate was played to the end - the game reads Checkmate',{over});
   const row=await rowOf(b,ROW),hm=await hitMap(b,ROW),bd=await b.page.evaluate(()=>{const gr=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(e=>e.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];return gr?{top:gr.top,bottom:gr.bottom}:null;});
   L.say(!!bd&&bd.top>=-0.5&&bd.bottom<=g.h+0.5,G+'TC-PL-056 the whole board is inside the viewport at game over',{board:bd,vh:g.h});
   L.say(row.items.length>=3&&row.bottom!=null&&row.bottom<=g.h+0.5&&hm.length>0&&hm.every(h=>h.centre),G+'TC-PL-056 the game-over control row ('+row.labels.join(',')+') is on screen and every control is the element under its own centre',{bottom:row.bottom,centres:hm.map(h=>h.label+':'+h.centre).join(' ')});
  }catch(e){L.say(false,G+'TC-PL-056 block drove to its state',String(e.message||e));}
  await b.close();
 }
 L.done();
});
// SELECTOR-OPENED: land-result reading=fallback round 4: result-card beside it
// SELECTOR-OPENED: land-over-btns reading=mode round 4: a missing hook selects the one-row reading, whose labels then fail on the 2x2 block
// CONTROL-RECORD: de85c2d 2026-11-14 total=150 red=24 scope=trial:a220f726ee22 how=#550 test-system helper B (jobs/control-audit-exists-is-red-and-nothing-runs-it part b): a finished game in landscape keeps the LIVE row - the land-over-btns block never mounts (false? for landPlay&&_gameOver?) and the control row swaps only when !wide, the #437 shape - 'offers Review AND Rematch' and 'offers NO Hint' red at the terminal ply and after Back for checkmate, resignation and vs-Computer at 730x375, 844x390 and 667x375 (labels Moves,Back,Forward,Hint,Flip,More); portrait B7 and the live baselines green. Either half alone stays 150/0 (a720a2b1cc6a, 2d273b599fa4), because the other half still supplies Review and Rematch. tip trial 86ab25a276d6 150/0
