'use strict';
// gates/regress/78-inner-scroller-fold.js - THE PRIMARY ACTION'S DISTANCE FROM THE FOLD, MEASURED INSIDE THE SCROLLER WHERE
// over() CANNOT SEE IT. TC-INV-08a..c, US-INV-07.
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
// measured at #545 on app.js 049b41dfb6f1, px of "Start game"'s bottom past innerHeight on arrival (<= 0: on screen)
const FOLD_PIN={"320x568":383,"360x640":280,"375x667":218,"375x730":191,"390x844":59.5,"414x896":7.5,"440x956":-51.5};
L.run(async()=>{
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
},'78-inner-scroller-fold');
