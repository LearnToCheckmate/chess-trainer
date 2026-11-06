'use strict';
// gates/regress/78-inner-scroller-fold.js - THE PRIMARY ACTION'S DISTANCE FROM THE FOLD, MEASURED INSIDE THE SCROLLER WHERE
// over() CANNOT SEE IT. TC-INV-08a..j, US-INV-07 (08d/08e: the Discover -> Tactics board clear of the tab bar; 08f..08j: Puzzles' and Review's primary actions, #549).
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
  const REV_PIN={"320x568":373.5,"360x640":320.3,"375x667":294.3,"375x730":231.3,"390x844":94.3,"414x896":28.5,"440x956":-26.5};
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
    {key:'review-stored',label:'Review list (stored games)',re:/^⚡ Analyze Game$/,name:'"⚡ Analyze Game"',go:b=>R.states['list-stored'](b),pinned:true}];
  for(const g of L.TA7){
    const geo=L.GEOS[g];const n=geo.w+'x'+geo.h;
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
        L.say(past<=0,n+' '+s.key+': TC-INV-'+(s.key==='puzzles'?'08g':'08h')+' on arrival, unscrolled, '+s.name+' sits above the fold ('+(past<=0?(-past)+'px clear':past+'px BELOW it')+')',{past,bottom:r.bottom,fold:r.fold,inner:sc});
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
  const tgot={};
  for(const g of ['kunal761',...L.TA7]){
    const geo=L.GEOS[g];const n=geo.w+'x'+geo.h+(geo.safe?'+'+geo.safe:'');
    const b=await L.launch({geo:g,name:'tactics-'+n});await b.open();
    let reached=true;try{await D.states['tactics'](b);await b.settle(400);}catch(e){reached=false;}
    for(const tab of ['Tactics','Strategy']){
      if(reached&&tab==='Strategy'){await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='Strategy');if(x)x.click();});await b.settle(400);}
      const m=reached?await b.page.evaluate(()=>{const root=document.getElementById('root');if(root)root.scrollTop=0;
        const gs=[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).gridTemplateColumns.split(' ').length===8&&d.getBoundingClientRect().width>100).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width);
        const bar=document.querySelector('[data-ct="tabbar"]');const head=[...document.querySelectorAll('div')].some(d=>(d.innerText||'').trim()==='Tactics & Strategy');
        if(!gs.length||!bar)return {board:!!gs.length,bar:!!bar,head};const r=gs[0].getBoundingClientRect(),t=bar.getBoundingClientRect();
        return {board:true,bar:true,head,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width*10)/10,barTop:Math.round(t.top*10)/10};}):null;
      L.say(!!m&&m.board&&m.bar&&m.head,n+' '+tab+': TC-INV-08d Discover -> Tactics was reached ("Tactics & Strategy" on screen) with its board and the tab bar both found - the denominator, so a missing board reads red and not as clear',m);
      if(!m||!m.board||!m.bar)continue;
      const under=Math.round((m.bottom-m.barTop)*10)/10;tgot[n+' '+tab]=under;
      L.say(under<=0,n+' '+tab+': TC-INV-08e at rest the board ('+m.w+'px, bottom '+m.bottom+') is clear of the tab bar (top '+m.barTop+'): '+(under<=0?(-under)+'px above it':under+'px UNDER it'));
    }
    await b.close();
  }
  L.note('    TACTICS BOARD vs TAB BAR (px under the bar at rest; <= 0 is clear): '+JSON.stringify(tgot));
},'78-inner-scroller-fold');
// THE CONTROL RECORD gates/control-audit.js READS [#546 item (89)]. #545 measured this control and deferred the line so its gated
// tree would not change; its trial bundle did not survive its container, so it was REBUILT from the recipe at #546 with
// gates/build.sh + CT_OUT (app.js untouched) and re-run against this file at a35524b, whose L.say set is today's.
// CONTROL-RECORD: a35524b 2026-10-30 total=22 red=7 scope=trial:f6c76d217316 how=setup-start 20px lower (marginTop 4 -> 24), one change - TC-INV-08b off its FOLD_PIN at all seven geometries, each by 20px [rebuild of #545's 5e17541ffc01]
