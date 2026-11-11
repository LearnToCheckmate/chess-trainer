'use strict';
// gates/regress/78-inner-scroller-fold.js - THE PRIMARY ACTION'S DISTANCE FROM THE FOLD, MEASURED INSIDE THE SCROLLER WHERE
// over() CANNOT SEE IT. TC-INV-08a..k, US-INV-07 (08d/08e/08k: the Discover -> Tactics board clear of the tab bar and one size on every card; 08f..08j: Puzzles' and Review's primary actions, #549).
//
// WHY [#545, item (44); jobs/bench-inner-scrollers-invisible-to-the-overflow-rule-2026-09-28]. gates/lib.js's over() measures
// the bottom-most laid-out child of #root against the viewport. That is right about the page (#354) and blind to every inner
// scroller: three layout defects - the drill verdict jump, the Play setup sheet hiding 273px at 375x730, and "Start game"
// 191px below the fold on arrival - all read over = 0. This gate is the second measurement the job asks for, kept BESIDE
// over() and not instead of it: L.innerScrollers() reports what each inner scroller hides, and the Play setup sheet's
// primary action is measured against the fold on arrival, unscrolled, at THE DRILL SEVEN (L.TA7).
//
// PINNED, NOT ASSERTED AT ZERO, AND THAT IS THE HONEST STATE. "Start game" is below the fold on arrival at most of the seven
// on main today. The fix is product work: Kunal answered the Decision Desk card play-setup-start-game-on-screen-2026-10-10
// with "options-row" (fold the settings into one Options row), and that build has not happened. So each geometry's distance
// is pinned to the number measured at #545, and a move in EITHER direction is red - a regression grows it, and the
// options-row build shrinks it and must retire its pin in the same commit, writing the new rule from the job's
// START_HERE_2026_10_12_PLAY_SETUP_OPTIONS_ROW acceptance (A: 320x568 with real insets passes on "reachable by scroll"; B:
// 360x640 on arrival with the social tiles hidden; C: the other five on arrival, unscrolled).
// THE REACH IS ASSERTED TOO, so a pinned "below the fold" can never hide "unreachable": the button's own scroller is
// scrolled and the button must then sit on screen - below the fold is not unreachable (CLAUDE.md), and this checks both.
// CONTROL-RECORD: 831e068 2026-11-11 total=142 red=8 scope=trial:b19697cd53cb how=#550 answer a12: the a12-only version of this gate (REV_PIN retired, TC-INV-08i asserting on screen) on the tree before the paste row - TC-INV-08i red at all eight geometries, 47.5 to 373.5px below the fold (245.5 on his phone); everything else green
// CONTROL-RECORD: 40515d9 2026-11-11 total=198 red=34 scope=trial:a6ef99c17548 how=#550 answer a26 (with a12's 08i): the tree before the Tactics page's own bar - the new TC-INV-08l and 08m lines red where its controls or back button sit under the tab bar or scrolled away, or #root scrolls; the a26 trial 455ff0ea4f3f reads 198 pass, 0 fail
const L=require('../lib');
const P=require('../drive/play');
const D=require('../drive/lesson');
const Z=require('../drive/puzzles');
const R=require('../drive/review');
// measured at #545 on app.js 049b41dfb6f1, px of "Start game"'s bottom past innerHeight on arrival (<= 0: on screen)
const FOLD_PIN={"320x568":383,"360x640":280,"375x667":218,"375x730":191,"390x844":59.5,"414x896":7.5,"440x956":-51.5};
L.run(async()=>{
  // TC-INV-08f..08j [#549, item (90); jobs/bench-inner-scrollers-invisible-to-the-overflow-rule-2026-09-28, Q2 as the orchestrator
  // ruled it on 4 Nov 2026 (decisions/the-orchestrators-calls-on-the-jobs-batch-8-left-out-for-them-2026-11-04): "on Puzzles (the
  // list of packs) the control that opens the first pack; on Review (the import box) its import button; each named by selector".
  // Puzzles: the roadmap on a fresh store, "▶ Start training" (it opens the first unsolved puzzle of the first tier). Review: the
  // import box's "⚡ Analyze Game", on the list screen with no stored games AND with the drive's seeded games (the state a player
  // with an account arrives in). Found BY TEXT, not by a hook. THE FOLD here is the top of the fixed tab bar when it is on
  // screen (it covers whatever sits under it), else innerHeight - both are printed. Stored-games Review is a known below-the-fold
  // defect, so it is PINNED as 08b is: a move either way is red, and the build that fixes it retires the pin.
  // measured at #549 on trial 1d1679f9c883 (HEAD afc6977): px of "⚡ Analyze Game"'s bottom past the fold, stored games, SETTLED (identical on two runs)
  // RE-PINNED at #549 item (100) [jobs/labels-truncate-in-shared-rows-2026-09-24], a pin moving WITH a fix and the reason stated: the
  // stored-games rows now REFLOW their opponent name and the line under it instead of ellipsising them, so the seeded rows are taller
  // (at 375x761 124/72/72px -> 156/104/88px), the games list reaches more of its min(46vh,340px) cap, and the import box below it sits
  // lower: 375x761 200.3 -> 260.3, 360x640 320.3 -> 334.6, 375x667 294.3 -> 321.1, 375x730 231.3 -> 287, 390x844 94.3 -> 177.3,
  // 414x896 28.5 -> 105.5, 440x956 -26.5 -> 47.5; 320x568 unchanged (the list was already at its cap there). Measured on trial
  // 4d7c48fa1578 (gate 78 subset log, then re-run). NOT ONLY A MOVE AT ONE COLUMN, said plainly: at 440x956 the import button was 26.5px
  // ABOVE the fold and is now 47.5px below it, so on that one geometry a player with stored games now scrolls to reach it; at every
  // other column it was already below the fold (200.3px on Kunal's phone). Named in the job's outcome for him to weigh.
  // #550 item (72) RE-PIN, measured twice on trial a0cfb40ec1d4 and once on t12 f0477c0d12aa (before (72)) to attribute it: item (72) took the
  // games row's brilliant pill under the WON badge and EST to the approximately sign (cf05c35), so the wider rows are shorter and the import
  // box sits closer to the fold: 375x761 260.3 -> 245.5, 375x730 287 -> 276.5, 390x844 177.3 -> 162.5, 414x896 105.5 -> 100.8; 320x568,
  // 360x640, 375x667 and 440x956 unchanged (identical on both runs; t12, the tree before (72), reads the old pins exactly). Still below the
  // fold at every column but 440x956's 47.5 - item (95) owns where the box goes (q12).
  const REV_PIN={"320x568":373.5,"360x640":334.6,"375x667":321.1,"375x730":276.5,"390x844":162.5,"414x896":100.8,"440x956":47.5,
    // [#549 fix round 4, A8-R4] Kunal's phone joins this loop. Its key carries the insets (w x h + safe), read from the GEOS entry, so
    // it can never collide with a no-inset column of the same size. Measured at #549 on trial 27d9c9980e1b (settled, first read 870.5) and again on c738ab207551 (HEAD 376ccde): 200.3 both.
    "375x761+51,31":245.5};
  const pv={};
  const find=(re)=>b=>b.page.evaluate((src)=>{const re=new RegExp(src);const btn=[...document.querySelectorAll('button')].find(x=>re.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>2);
    const bar=document.querySelector('[data-ct="tabbar"]');const t=bar?bar.getBoundingClientRect():null;const fold=t&&t.height>0&&t.top<innerHeight?t.top:innerHeight;
    if(!btn)return {found:false,fold,vh:innerHeight};const q=btn.getBoundingClientRect();return {found:true,top:Math.round(q.top*10)/10,bottom:Math.round(q.bottom*10)/10,fold:Math.round(fold*10)/10,vh:innerHeight,bar:!!t};},re.source);
  const reachOf=(re)=>b=>b.page.evaluate((src)=>{const re=new RegExp(src);const btn=[...document.querySelectorAll('button')].find(x=>re.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>2);
    const bar=document.querySelector('[data-ct="tabbar"]');const t=bar?bar.getBoundingClientRect():null;const fold=t&&t.height>0&&t.top<innerHeight?t.top:innerHeight;
    let sc=null;for(let p=btn.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);if(st.touchAction==='none')return {blocked:true};if(/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1){sc=p;break;}}
    const q0=btn.getBoundingClientRect();const need=Math.max(0,q0.bottom-fold+2);if(sc&&need>0)sc.scrollTop+=need;
    const q=btn.getBoundingClientRect();const hit=document.elementFromPoint(q.left+q.width/2,Math.min(innerHeight-1,Math.max(0,q.top+q.height/2)));
    return {top:Math.round(q.top),bottom:Math.round(q.bottom),fold:Math.round(fold),owns:!!hit&&(hit===btn||btn.contains(hit))};},re.source);
  const SURF=[
    {key:'puzzles',label:'Puzzles roadmap (fresh store)',re:/^▶ Start training$/,name:'"▶ Start training"',go:b=>Z.states['roadmap'](b),pinned:false},
    {key:'review-empty',label:'Review list (no stored games)',re:/^⚡ Analyze Game$/,name:'"⚡ Analyze Game"',go:b=>R.states['list-empty'](b),pinned:false},
    // #550 answer a12 (item 95): REV_PIN IS RETIRED. The paste row now sits above Import (Option A, docs/mockup-q12-paste-2026-11-11), so with
    // stored games "⚡ Analyze Game" is on screen on arrival at every column (measured on trial a6ef99c17548: its row top 123..128 at every
    // geometry, the tab bar at 512..900) and TC-INV-08i asserts that, as 08g and 08h do. REV_PIN above is kept as the record of what it was.
    {key:'review-stored',label:'Review list (stored games)',re:/^⚡ Analyze Game$/,name:'"⚡ Analyze Game"',go:b=>R.states['list-stored'](b),pinned:false}];
  for(const g of ['kunal761',...L.TA7]){
    const geo=L.GEOS[g];const n=geo.w+'x'+geo.h+(geo.safe?'+'+geo.safe:'');
    const b=await L.launch({geo:g,name:'prim-'+n});await b.open();
    for(const s of SURF){
      let reached=true;try{await s.go(b);}catch(e){reached=false;}
      // SETTLE PAST THE GRADING [CLAUDE.md, "text that arrives late"]: with stored games each row GROWS when its background grade
      // lands (78px to 140 and 97 in this container, the last one seconds later), pushing the button down ~16-46px - so a single
      // early read is a coin flip. Poll until the button's bottom holds for eight 500ms samples (cap 25s; three was too few at 440x956, where the last grade
      // landed after a 1.5s lull and moved it 11.7px) and print the first read.
      let r=reached?await find(s.re)(b):null;const first=r&&r.found?r.bottom:null;
      if(r&&r.found){let same=0;for(let t=0;t<50&&same<8;t++){await b.page.waitForTimeout(500);const r2=await find(s.re)(b);if(!r2.found)break;same=(r2.bottom===r.bottom)?same+1:0;r=r2;}}
      L.say(reached&&!!r&&r.found,n+' '+s.key+': TC-INV-08f the '+s.label+' was reached and carries '+s.name+' - the denominator, so a missing button reads red and not as on screen',{reached,button:r});
      if(!r||!r.found)continue;
      const past=Math.round((r.bottom-r.fold)*10)/10;pv[n+' '+s.key]=past;
      const sc=await b.innerScrollers();
      L.note('    '+n+' '+s.key+': '+s.name+' bottom '+r.bottom+' against the fold '+r.fold+' (tab bar top; innerHeight '+r.vh+'; first read '+first+') -> '+(past>0?past+'px BELOW the fold':'on screen')+';  inner scrollers: '+(sc.map(x=>x.id+' hides '+x.hiddenY+'px').join(', ')||'none'));
      if(!s.pinned){
        L.say(past<=0,n+' '+s.key+': TC-INV-'+(s.key==='puzzles'?'08g':s.key==='review-stored'?'08i':'08h')+' on arrival, unscrolled, '+s.name+' sits above the fold ('+(past<=0?(-past)+'px clear':past+'px BELOW it')+')',{past,bottom:r.bottom,fold:r.fold,inner:sc});
      } else if(REV_PIN&&Object.prototype.hasOwnProperty.call(REV_PIN,n)){
        L.say(Math.abs(past-REV_PIN[n])<=0.5,n+' '+s.key+': TC-INV-08i with stored games '+s.name+' sits '+past+'px past the fold on arrival, as pinned ('+REV_PIN[n]+'). A known below-the-fold defect pinned, not passed; a move either way is red',{past,pin:REV_PIN[n],inner:sc});
      } else L.note('    TC-INV-08i NOT ASSERTED at '+n+': no REV_PIN for it.');
      const reach=await reachOf(s.re)(b);
      L.say(!reach.blocked&&reach.top>=0&&reach.bottom<=reach.fold&&reach.owns,n+' '+s.key+': TC-INV-08j and '+s.name+' is REACHABLE - after its own scroller is scrolled it sits above the fold and owns its centre',reach);
    }
    await b.close();
  }
  L.note('    PRIMARY ACTIONS MEASURED (px past the fold on arrival): '+JSON.stringify(pv));
  const got={};
  for(const g of L.TA7){
    const geo=L.GEOS[g];const n=geo.w+'x'+geo.h;
    const b=await L.launch({geo:g,name:'fold-'+n});await b.open();
    let reached=true;try{await P.states['setup'](b);}catch(e){reached=false;}
    const m=reached?await b.metrics():null;
    const sc=reached?await b.innerScrollers():[];
    const r=reached?await b.page.evaluate(()=>{const btn=[...document.querySelectorAll('button')].find(x=>/^▶ Start game$/.test((x.innerText||'').trim()));
      if(!btn)return null;const q=btn.getBoundingClientRect();return {top:Math.round(q.top*10)/10,bottom:Math.round(q.bottom*10)/10,vh:innerHeight};}):null;
    L.say(reached&&!!r,n+': TC-INV-08a the Play setup sheet was reached and carries "▶ Start game" - the denominator, so a missing button reads red and not as on-screen',{reached,button:r});
    if(!r){await b.close();continue;}
    const past=Math.round((r.bottom-r.vh)*10)/10;got[n]=past;
    const hidden=sc.reduce((a,x)=>a+x.hiddenY,0);
    L.note('    '+n+': Start game bottom '+r.bottom+' on a '+r.vh+'px viewport -> '+(past>0?past+'px BELOW the fold':'on screen ('+(-past)+'px above the fold)')+';  over() reads '+(m&&m.over?m.over.over:'?')+';  inner scrollers: '+(sc.map(x=>x.id+' hides '+x.hiddenY+'px').join(', ')||'none'));
    if(FOLD_PIN&&Object.prototype.hasOwnProperty.call(FOLD_PIN,n)){
      L.say(Math.abs(past-FOLD_PIN[n])<=0.5,n+': TC-INV-08b "▶ Start game" sits '+past+'px past the fold on arrival (0 or less is on screen), as pinned ('+FOLD_PIN[n]+'). Below the fold at six of the seven, a known defect waiting on the options-row build. A move in either direction is red, so that build retires this pin',{past,pin:FOLD_PIN[n],innerHiddenY:hidden,overReads:m&&m.over?m.over.over:null});
    } else {
      L.note('    TC-INV-08b NOT ASSERTED at '+n+': no FOLD_PIN for it yet.');
    }
    // REACH: scroll the button's own finger-scrollable ancestor and require it fully on screen.
    const reach=await b.page.evaluate(()=>{const btn=[...document.querySelectorAll('button')].find(x=>/^▶ Start game$/.test((x.innerText||'').trim()));
      let sc=null;for(let p=btn.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);if(st.touchAction==='none')return {blocked:true};if(/auto|scroll/.test(st.overflowY)&&p.scrollHeight>p.clientHeight+1){sc=p;break;}}
      const q0=btn.getBoundingClientRect();const need=Math.max(0,q0.bottom-innerHeight+2);if(sc&&need>0)sc.scrollTop+=need;
      const q=btn.getBoundingClientRect();const hit=document.elementFromPoint(q.left+q.width/2,Math.min(innerHeight-1,Math.max(0,q.top+q.height/2)));
      return {top:Math.round(q.top),bottom:Math.round(q.bottom),vh:innerHeight,owns:!!hit&&(hit===btn||btn.contains(hit))};});
    L.say(!reach.blocked&&reach.top>=0&&reach.bottom<=reach.vh&&reach.owns,n+': TC-INV-08c and it is REACHABLE - after its own scroller is scrolled it sits fully on screen and owns its centre, so the pin above can never hide "unreachable" behind "below the fold"',reach);
    await b.close();
  }
  L.note('    FOLD MEASURED (px past the fold on arrival): '+JSON.stringify(got));
  // TC-INV-08d/08e [#549, item (87); jobs/tactics-landing-overflows-104px-and-sits-under-the-tab-bar-2026-09-28; Kunal's default
  // (5) on questions/B8-SMALL-DEFAULTS, 4 Nov 2026: "Tactics keeps the board clear of the tab bar, as Lessons and Puzzles do"].
  // Discover -> Tactics, both of its tabs, AT REST (#root unscrolled): the board is the thing that screen is for, and its bottom
  // must sit at or above the fixed tab bar's top, read on the LIVE elements. Before #549 it ran 14px under at 375x730, 65 at
  // 375x679 and 119.5 at 320x568. The board is found as the widest 8-column grid, NOT by the data-ct hook #549 added, so this
  // assertion reads the same element on a bundle that predates the fix (CLAUDE.md, the selector-its-own-build-adds rule).
  // [#549 fix round 4, A1-R4 and A2-R4] EVERY CARD, NOT THE FIRST ONE, AND THE STRATEGY TAB PROVEN REACHED. The first version read
  // only the landing motif and the first strategy card, so it could not see that the 12th motif (Decoy, whose idea runs a line
  // longer) put the board 4.8px under the bar on #548 and shrank it 367.5 -> 356 on Kunal's phone once the fit landed, nor that at
  // 375x730 the width changed card to card. So each tab is now STEPPED THROUGH EVERY CARD (Tactics: "Show answer" then "Next motif";
  // Strategy: "Next"), each card read at rest before it is touched; 08e asserts every card is clear of the bar and 08k asserts the
  // board is ONE width on every card (the board must never jump). 08d is the denominator: the tab's own controls are on screen
  // (Tactics: "Show answer"; Strategy: "‹ Prev" and no "Show answer") - the heading is on both tabs, so it cannot tell them apart -
  // and every card from 1/N to N/N was visited, read from the card's own counter.
  const tgot={};
  const readCard=b=>b.page.evaluate(()=>{const root=document.getElementById('root');if(root)root.scrollTop=0;
    const gs=[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).gridTemplateColumns.split(' ').length===8&&d.getBoundingClientRect().width>100).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width);
    const bar=document.querySelector('[data-ct="tabbar"]');
    // #550 answer a26 (AUD-L01, Option A): the page's heading went into ONE bar - back, the two tabs, the menu - so the denominator's
    // "this is the Tactics page" reads the two tab buttons by their text (not the data-ct the same build added), and the old heading or
    // the new bar's tabs both satisfy it, so the check reads the same page on a bundle from before a26.
    const head=[...document.querySelectorAll('div')].some(d=>(d.innerText||'').trim()==='Tactics & Strategy')||(['Tactics','Strategy'].every(t=>[...document.querySelectorAll('button')].some(x=>(x.innerText||'').trim()===t)));
    // #550 a26: the page's controls (Hint, Show answer, Next motif, Prev, Next) must end ABOVE the tab bar, and #root must not scroll
    const ctls=[...document.querySelectorAll('button')].filter(x=>/^(💡 ?Hint|Hint|Show answer|Next motif|‹ Prev|Next ›)/.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>2).map(x=>({t:(x.innerText||'').trim().slice(0,12),bottom:Math.round(x.getBoundingClientRect().bottom*10)/10}));
    const rsc=root?Math.max(0,root.scrollHeight-root.clientHeight):null;
    const back=[...document.querySelectorAll('button')].find(x=>/^(‹ Back)$/.test((x.innerText||'').trim())||x.getAttribute('aria-label')==='Back');const backTop=back?Math.round(back.getBoundingClientRect().top):null;
    const btn=re=>[...document.querySelectorAll('button')].some(x=>re.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>2);
    const ctr=[...document.querySelectorAll('span')].map(x=>(x.innerText||'').trim()).map(t=>/(?:^|· )(\d+)\/(\d+)$/.exec(t)).find(Boolean);
    const o={board:!!gs.length,bar:!!bar,head,tacticsCtl:btn(/^Show answer$/),strategyCtl:btn(/^‹ Prev$/),card:ctr?+ctr[1]:null,of:ctr?+ctr[2]:null,ctls,rsc,backTop};
    if(!gs.length||!bar)return o;const r=gs[0].getBoundingClientRect(),t=bar.getBoundingClientRect();
    return Object.assign(o,{top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width*10)/10,barTop:Math.round(t.top*10)/10});});
  const press=(b,re)=>b.page.evaluate(src=>{const re=new RegExp(src);const x=[...document.querySelectorAll('button')].find(x=>re.test((x.innerText||'').trim()));if(x)x.click();return !!x;},re.source);
  for(const g of ['kunal761',...L.TA7]){
    const geo=L.GEOS[g];const n=geo.w+'x'+geo.h+(geo.safe?'+'+geo.safe:'');
    const b=await L.launch({geo:g,name:'tactics-'+n});await b.open();
    let reached=true;try{await D.states['tactics'](b);await b.settle(400);}catch(e){reached=false;}
    for(const tab of ['Tactics','Strategy']){
      if(reached&&tab==='Strategy'){await press(b,/^Strategy$/);await b.settle(400);}
      const cards=[];let m=reached?await readCard(b):null;const first=m;const hintBad=[];let hintN=0;
      const onTab=c=>!!c&&(tab==='Tactics'?c.tacticsCtl&&!c.strategyCtl:c.strategyCtl&&!c.tacticsCtl);
      if(m&&m.board&&m.bar&&onTab(m)&&m.of){
        for(let k=0;k<m.of;k++){
          if(k>0){if(tab==='Tactics'){await press(b,/^Show answer$/);await b.settle(150);if(k===1){const sh=await readCard(b);const nm=sh.ctls.find(x=>/^Next motif/.test(x.t));L.say(!!sh.board&&sh.top===cards[0].top&&sh.w===cards[0].w,n+' Tactics: TC-INV-08l with the answer SHOWN the board does not move ('+cards[0].top+'/'+cards[0].w+' at rest, '+sh.top+'/'+sh.w+' shown) - the board never jumps when the answer appears (antagonist A round 2, P2)',{rest:{top:cards[0].top,w:cards[0].w},shown:{top:sh.top,w:sh.w}});L.say(!!nm&&nm.bottom<=sh.barTop&&sh.rsc!==null&&sh.rsc<=0.5,n+' Tactics: TC-INV-08l with the answer SHOWN "Next motif" ends above the tab bar and the page does not scroll ('+(nm&&nm.bottom)+' against '+sh.barTop+', #root overflow '+sh.rsc+')',{nm,barTop:sh.barTop,rsc:sh.rsc});}await press(b,/^Next motif/);}else await press(b,/^Next ›$/);await b.settle(300);m=await readCard(b);}
          if(!m||!m.board||!m.bar||!onTab(m))break;cards.push(m);
          // #550 antagonist A round 2 (P1): WITH THE HINT ON (every motif card) the hint is not clipped silently - it fits its box or the box
          // fades at its foot - and the page's controls still end above the tab bar. Hint is a toggle, so it is closed again after the read.
          if(tab==='Tactics'&&await press(b,/Hint$/)){await b.settle(250);const hs=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>/^💡/.test((d.innerText||'').trim())&&!d.querySelector('div'));if(!e)return null;const cs=getComputedStyle(e);
              return {ch:e.clientHeight,sh:e.scrollHeight,mask:(cs.webkitMaskImage||cs.maskImage||'none')!=='none'};});const hc=await readCard(b);
            const hctl=hc.ctls.length?Math.max(...hc.ctls.map(x=>x.bottom)):null;
            if(!hs||hs.sh>hs.ch+1&&!hs.mask||hctl===null||hctl>hc.barTop||hc.rsc>0.5)hintBad.push({card:k+1,hs,hctl,barTop:hc.barTop,rsc:hc.rsc});hintN++;
            await press(b,/Hint$/);await b.settle(150);}
        }
      }
      if(tab==='Tactics')L.say(hintN>0&&hintBad.length===0,n+' Tactics: TC-INV-08l with the HINT on, on every card ('+hintN+'), the hint fits its box or fades at its foot, and the controls stay above the tab bar with the page unscrolled (antagonist A round 2, P1: it was clipped to 18px at 320x568 with no fade)',{hintN,hintBad:hintBad.slice(0,4)});
      const seen=cards.map(c=>c.card);const all=!!first&&!!first.of&&cards.length===first.of&&seen.every((c,k)=>c===k+1);
      L.say(!!first&&first.board&&first.bar&&first.head&&onTab(first)&&all,n+' '+tab+': TC-INV-08d Discover -> Tactics was reached, the '+tab+' tab is the one on screen (its own controls are, the other tab\'s are not) with its board and the tab bar found, and every card 1/'+(first&&first.of)+' to '+(first&&first.of)+'/'+(first&&first.of)+' was read - the denominator, so a missed tab or a missing card reads red and not as clear',{first,visited:seen});
      if(!cards.length)continue;
      const unders=cards.map(c=>Math.round((c.bottom-c.barTop)*10)/10);const worst=Math.max(...unders);const wk=unders.indexOf(worst)+1;
      tgot[n+' '+tab]=worst;
      L.say(worst<=0,n+' '+tab+': TC-INV-08e at rest the board is clear of the tab bar on EVERY card ('+cards.length+'): the worst is card '+wk+' at '+(worst<=0?(-worst)+'px above it':worst+'px UNDER it'),{unders});
      // TC-INV-08l [#550 answer a26, AUD-L01 Option A: "there should be no scrolling"]: at rest on EVERY card the page's own controls end at
      // or above the tab bar's top and #root does not scroll; and (08m) the back control is in the first 80px of the screen, not scrolled away.
      const ctlPast=cards.map(c=>c.ctls.length?Math.max(...c.ctls.map(x=>x.bottom))-c.barTop:null);
      L.say(cards.every(c=>c.ctls.length>0)&&ctlPast.every(x=>x!==null&&x<=0),n+' '+tab+': TC-INV-08l at rest the page\'s own controls end above the tab bar on EVERY card ('+cards.length+'; worst '+Math.max(...ctlPast.map(x=>x===null?999:x))+'px past its top)',{ctlPast,first:cards[0].ctls});
      L.say(cards.every(c=>c.rsc!==null&&c.rsc<=0.5),n+' '+tab+': TC-INV-08l and the page does not scroll on any card (#root overflow '+[...new Set(cards.map(c=>c.rsc))].join(', ')+'px)',{rsc:cards.map(c=>c.rsc)});
      L.say(cards.every(c=>c.backTop!==null&&c.backTop>=0&&c.backTop<80),n+' '+tab+': TC-INV-08m the back control is in the first 80px of the screen on every card ('+[...new Set(cards.map(c=>c.backTop))].join(', ')+')',{backTops:cards.map(c=>c.backTop)});
      const ws=[...new Set(cards.map(c=>c.w))];
      L.say(ws.length===1,n+' '+tab+': TC-INV-08k the board is ONE width on every card ('+ws.join(', ')+'px'+(ws.length>1?', cards '+cards.map((c,k)=>(k+1)+':'+c.w).join(' '):'')+') - the board must never jump between cards',{widths:cards.map(c=>c.w),tops:cards.map(c=>c.top)});
    }
    await b.close();
  }
  L.note('    TACTICS BOARD vs TAB BAR (px under the bar at rest; <= 0 is clear): '+JSON.stringify(tgot));
  // TC-INV-08n [#550 answer a18 on jobs/bench-inner-scrollers-invisible-to-the-overflow-rule-2026-09-28, the orchestrator's ruling a18: "no single
  // control. Home's four tiles (Discover, Puzzles, Review and Play) are its primary actions, so TC-INV-08's Home arm in gate 78 asks that each be
  // fully on screen at rest at 375x761 and at 320x568, with its control; a tile found below the fold is pinned, not passed ... until his answer on
  // Home's layout (the audit's AUD-H01) lands"]. AUD-H01 has landed (the compact footer and tiles) and 320x568 still puts the second row below the
  // fold, so those two are PINNED at the distance measured, and a move either way is red. The tiles are found by their icon hooks (tile-ic-<k>,
  // #366's, not this build's) and their buttons' rects read unscrolled; the fold is the viewport's bottom (Home is drawn over the tab bar).
  {const HOME_PIN={'320x568':{analyze:41,play:41}};   // px past the fold, measured on trial a7022891e79d (was 88 before AUD-H01)
   for(const g of ['kunal761','se']){
     const geo=L.GEOS[g];const n=geo.w+'x'+geo.h+(geo.safe?'+'+geo.safe:'');
     const b=await L.launch({geo:g,name:'home-tiles-'+n});await b.open();await b.settle(1200);
     const t=await b.page.evaluate(()=>{const o={};const ov=document.querySelector('[data-ct="tile-ic-learn"]');const sc=ov&&ov.closest('div[style*="overflow"]');
       for(const k of ['learn','puzzle','analyze','play']){const ic=document.querySelector('[data-ct="tile-ic-'+k+'"]');const bt=ic&&ic.closest('button');if(!bt)continue;const r=bt.getBoundingClientRect();o[k]={top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10};}
       return {tiles:o,fold:innerHeight};});
     const ks=['learn','puzzle','analyze','play'];
     L.say(ks.every(k=>t.tiles[k]),n+': TC-INV-08n DENOMINATOR Home\'s four tiles were found by their icon hooks ('+Object.keys(t.tiles).join(', ')+')',t);
     for(const k of ks){if(!t.tiles[k])continue;const past=Math.round((t.tiles[k].bottom-t.fold)*10)/10;const pin=HOME_PIN[n]&&HOME_PIN[n][k];
       if(pin==null)L.say(past<=0,n+' '+k+': TC-INV-08n at rest the tile is fully on screen ('+(past<=0?(-past)+'px clear':past+'px BELOW the fold')+')',{past,tile:t.tiles[k],fold:t.fold});
       else L.say(Math.abs(past-pin)<=1,n+' '+k+': TC-INV-08n the tile sits '+past+'px past the fold at rest, as PINNED ('+pin+'): a known below-the-fold tile at this geometry after AUD-H01, pinned not passed; a move either way is red',{past,pin});}
     await b.close();}}
},'78-inner-scroller-fold');
// THE CONTROL RECORD gates/control-audit.js READS [#546 item (89)]. #545 measured this control and deferred the line so its gated
// tree would not change; its trial bundle did not survive its container, so it was REBUILT from the recipe at #546 with
// gates/build.sh + CT_OUT (app.js untouched) and re-run against this file at a35524b, whose L.say set is today's.
// CONTROL-RECORD: a35524b 2026-10-30 total=22 red=7 scope=trial:f6c76d217316 how=setup-start 20px lower (marginTop 4 -> 24), one change - TC-INV-08b off its FOLD_PIN at all seven geometries, each by 20px [rebuild of #545's 5e17541ffc01]
// CONTROL-RECORD: a9e66ac 2026-11-06 total=54 red=6 scope=trial:7655d031c876 how=the #549 item (87) tree with chess.jsx at bd8c4a7 (no fit to the tab bar), one change - TC-INV-08e red at 320x568 Tactics and Strategy, 360x640 Tactics and Strategy, 375x667 Tactics and 375x730 Tactics
// CONTROL-RECORD: bae7803 2026-11-06 total=142 red=7 scope=trial:c738ab207551 how=the run-head tree 376ccde (per-card fit, no idea-box or title-row reservation), one change against the fix - TC-INV-08k red at 375x761+51,31 Tactics, 320x568 Tactics and Strategy, 360x640, 375x667 and 375x730 Tactics; TC-INV-08e red at 320x568 Tactics (5.3px under on four motifs)
// CONTROL-RECORD: bae7803 2026-11-06 total=126 red=8 scope=trial:7f72a195020d how=the fix with the Strategy tab button relabelled 'Plans' so the gate's click misses - TC-INV-08d red on Strategy at all eight geometries (the tab is proven reached, A2-R4); the run emits 126 lines because the missed tab's 08e and 08k do not run
// CONTROL-RECORD: 6180c2b 2026-11-11 total=224 red=13 scope=trial:8f0c3906c86c how=#550 c_h18, a bundle built for this control: the tree before antagonist A round 2's Tactics hint fix (e856800) with Home's tiles pushed 400px down - TC-INV-08l (hint on every card) red at all five geometries and TC-INV-08n (Home, AUD-H01) red at 375x761 for all four tiles and at 320x568 for all four (two below the fold, two off their 41px pin); every other line green. On t52 (28378590a526) 224 of 224 green
// CONTROL-RECORD: 6ff1c24 2026-11-11 total=142 red=8 scope=trial:e8bb320d6d6d how=#550 item (133): c133, the Puzzles roadmap's '▶ Start training' pushed 900px down (marginTop 12 -> 900) - TC-INV-08g red at all eight geometries (172..584px below the fold); 08f's denominator and 08j's reach-by-scrolling stay green, which is right; good trial 4fe71d55db29 142/0
