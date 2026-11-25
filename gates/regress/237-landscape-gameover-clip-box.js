'use strict';
// gates/regress/237-landscape-gameover-clip-box.js - A SIDEWAYS GAME THAT ENDS VS THE COMPUTER, ON TIME OR BY RESIGNING, PAINTS EVERYTHING IN
// ITS RAIL INSIDE THE RAIL'S CLIP BOX AT FIRST PAINT. TC-R415, TC-R431, US-R250.
//
// WHY [#553 batch 14 B2; jobs/the-landscape-result-line-lives-in-a-scroller-that-can-take-it-off-screen-2026-09-29 and its folded lead
// jobs/a-landscape-time-loss-paints-the-whole-moves-panel-below-the-rails-visible-window-2026-10-07]. Measured by #495's antagonist B and
// again at #549 on 04419c4: at a literal 730x375, after a REAL one-minute flag vs the computer, [data-ct=moves-panel] sat at 246.5..397.9
// inside a rail clipping at 25.5..241.5, so the player saw none of the moves; the rail scrolled 380 against 216. #550's Option A (372f372,
// Kunal's pick on B10-Q23) rebuilt the sideways game: the board takes the height and the rail holds the result card, a one-line move strip,
// four 44pt buttons and the strength pill, with nothing to scroll. Gate 113 proves Option A for a Pass & Play checkmate; NOTHING drove the
// ending the lead job is about - a time loss vs the computer, against a resign at the same ply count - or read the rail against its CLIP
// BOX (the lead's close condition asks exactly that, and warns that the project's usual `over<=0 && docScroll===0` line false-reds here).
// The folded instances are read the same way: the MOVES header sliver (there is no such header in Option A), the strength (Elo) pill below
// about 352 tall and at 730x350.
//
// HOW: a vs-Computer game (Pip, 1 minute, White) started at kunal761 (portrait) with two moves each, then the phone turned to the size
// under test, then EITHER a real clock flag (no injected state: the gate waits up to 90s for 'Time') OR More, Resign, Tap again. At
// scrollTop as the app leaves it (no harness scrollIntoView before the read), every element in the rail (the nearest scrolling ancestor of the result, which is found by its words 'You lose'; buttons by their words; no hook Option A added is read) that owns a non-empty
// text node is read against its CLIP BOX: the intersection of the window and every ancestor whose overflow clips. A text that is
// VISUALLY HIDDEN on purpose (the screen-reader pattern: clip rect(0 0 0 0) or clip-path inset(50%) on itself or an ancestor - the move
// strip below 360 tall, #550 a23, which stays a live log) paints nothing and is counted apart, and the mechanism is pinned: only
// [data-ct=play-moverow] may be hidden that way, and only under 360 tall.
// WHAT IT ASSERTS, per size and ending:
//  TC-R415  DENOMINATOR the game ended the named way (the result card reads Time / Resigned and You lose), the rail is found, and at least
//           10 painted texts were read in it (never a pass over nothing).
//  TC-R415  every painted text in the rail lies inside its clip box (0.5px), and the rail does not scroll (scrollHeight within 1px of
//           its clientHeight), so nothing in it sits below the fold.
//  TC-R415  at 360 tall or more the move strip is painted inside the clip box with at least one move; texts hidden on purpose occur only
//           in the move strip and only under 360 tall.
//  TC-R431  the time ending costs no height the resign ending does not: the result card and the four buttons sit at the same y (1px) after
//           a flag as after a resign at the same size and ply count (the lead job's 34.5px).
// CT_G237_SIZES=730x375,... runs only those sizes (a subset is never the whole gate).
// CONTROLS, measured on the batch head d7089287 (gate 237 28/0 on its bundle 7bb4c6b70611). THE TREE BEFORE OPTION A (372f372^, built as
// c787fb87fc02) CANNOT BE DRIVEN by today's Play drive - its setup sheet has no [data-ct=setup-time] select, so the one-minute clock is
// never chosen - and every line there reds on the DENOMINATOR (9 of 16 red): that is a red for the wrong reason and is not counted. The
// mechanism controls are counted instead, each a one-line change to chess.jsx built as a trial (they are also the pairs breaks):
//   the time ending costs 36px more (marginBottom 36 on the result card when it reads Time - the lead job's mechanism): 22/6, TC-R415 red
//     after the flag at 730x375 and 761x375 (the bottom player bar cut 11px, the rail 393 against 375), and TC-R431 red at all three sizes;
//   the rail runs below the fold (marginBottom 140 under the four buttons): 22/6, TC-R415 red after both endings at all three sizes (the
//     strength pill and the bottom bar below the window, the rail 497 against 375).
// CONTROL-RECORD: 6f64fe5e 2026-11-25 total=28 red=6 scope=trial:04bd8507ee29 how=the result card 36px taller when it reads Time (the lead job's mechanism) - TC-R415 red after the flag at 730x375 and 761x375 (bottom bar cut 11px, rail 393 against 375), TC-R431 red at all three sizes
// CONTROL-RECORD: 6f64fe5e 2026-11-25 total=28 red=6 scope=trial:a1b1d39bc7a7 how=marginBottom 140 under the four buttons, the rail running below the fold - TC-R415 red after both endings at 730x375, 761x375 and 730x350 (the strength pill and the bottom bar below the window)
const L=require('../lib');const P=require('../drive/play');
const ALL=[{w:730,h:375},{w:761,h:375},{w:730,h:350}];
const SIZES=process.env.CT_G237_SIZES?process.env.CT_G237_SIZES.split(',').map(s=>{const [w,h]=s.split('x').map(Number);return {w,h};}):ALL;
const read=(b)=>b.page.evaluate(()=>{
  // EVERYTHING IS FOUND BY WHAT IT SAYS, never by a hook Option A added (CLAUDE.md #432): the result by 'You lose', the rail as the
  // nearest scrolling ancestor of the result, the buttons by their words. On the tree before Option A the same reads find the old rail.
  const painted=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
  const card=[...document.querySelectorAll('body *')].filter(e=>painted(e)&&/(Time|Resigned|Checkmate|time)[\s\S]{0,40}You lose|You lose[\s\S]{0,40}(time|Time|resign)/.test(e.innerText||'')).sort((x,y)=>(x.innerText||'').length-(y.innerText||'').length)[0]||null;
  if(!card)return null;
  let rail=null;for(let a=card.parentElement;a&&a!==document.body;a=a.parentElement){if(/(auto|scroll)/.test(getComputedStyle(a).overflowY)){rail=a;break;}}
  if(!rail)rail=card.parentElement;
  const hiddenOnPurpose=(el)=>{for(let a=el;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(/inset\(50%\)/.test(cs.clipPath)||/rect\(0px,? 0px,? 0px,? 0px\)/.test(cs.clip))return a;}return null;};
  const clipOf=(el)=>{let t=0,bo=innerHeight,l=0,r=innerWidth;for(let a=el.parentElement;a;a=a.parentElement){const cs=getComputedStyle(a);if(/(auto|scroll|hidden|clip)/.test(cs.overflowY+' '+cs.overflowX)){const q=a.getBoundingClientRect();t=Math.max(t,q.top);bo=Math.min(bo,q.bottom);l=Math.max(l,q.left);r=Math.min(r,q.right);}}return {t,b:bo,l,r};};
  const cut=[],hidden=[];let n=0;
  for(const el of rail.querySelectorAll('*')){
    if(![...el.childNodes].some(c=>c.nodeType===3&&c.textContent.trim()))continue;
    const q=el.getBoundingClientRect();if(!q.width||!q.height)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
    const h=hiddenOnPurpose(el);const label=(el.textContent||'').trim().slice(0,24);
    if(h){hidden.push({t:label,in:(h.closest('[data-ct]')||{}).getAttribute?h.closest('[data-ct]').getAttribute('data-ct'):null});continue;}
    n++;const c=clipOf(el);const over=Math.max(c.t-q.top,q.bottom-c.b,c.l-q.left,q.right-c.r);
    if(over>0.5)cut.push(label+' '+over.toFixed(1)+'px ['+q.top.toFixed(1)+','+q.bottom.toFixed(1)+'] in ['+c.t.toFixed(1)+','+c.b.toFixed(1)+']');}
  const btnY=(re)=>{const e=[...rail.querySelectorAll('button')].find(x=>painted(x)&&re.test((x.innerText||'').replace(/[^A-Za-z ]/g,'').trim()));return e?+e.getBoundingClientRect().top.toFixed(1):null;};
  // the move list in the rail, whichever the tree draws: Option A's one-line strip, or the older moves panel
  const ml=[...rail.querySelectorAll('[data-ct="play-moverow"],[data-ct="moves-panel"]')].find(e=>painted(e)&&!hiddenOnPurpose(e))||null;let strip=null;
  if(ml){const r=ml.getBoundingClientRect();const c=clipOf(ml);strip={ct:ml.getAttribute('data-ct'),top:+r.top.toFixed(1),bot:+r.bottom.toFixed(1),clip:[+c.t.toFixed(1),+c.b.toFixed(1)],inClip:r.top>=c.t-0.5&&r.bottom<=c.b+0.5,moves:(ml.innerText.match(/[KQRBN]?[a-h]?x?[a-h][1-8]/g)||[]).length};}
  return {vh:innerHeight,rail:{sh:rail.scrollHeight,ch:rail.clientHeight,st:rail.scrollTop},n,cut,hidden,strip,card:(card.innerText||'').replace(/\s+/g,' ').slice(0,60),
    ys:{card:+card.getBoundingClientRect().top.toFixed(1),review:btnY(/^Review$/),rematch:btnY(/^Rematch$/),newgame:btnY(/^New game$/),more:btnY(/^More$/)}};});
const clickBtn=(b,re)=>b.page.evaluate((s)=>{const R=new RegExp(s);const e=[...document.querySelectorAll('button')].find(x=>R.test((x.getAttribute('aria-label')||'').trim())||R.test((x.innerText||'').trim()));if(e)e.click();return !!e;},re);
L.run(async()=>{
  for(const S of SIZES){const tag=S.w+'x'+S.h;const got={};
    for(const end of ['flag','resign']){
      const b=await L.launch({geo:'kunal761',name:'g237-'+tag+'-'+end});await b.open();let ok=true;
      try{await P.states['cpu-clock-m0'](b);await b.move('e2','e4',0);await b.settle(2500);await b.move('g1','f3',0);await b.settle(2500);
        await b.page.setViewportSize({width:S.w,height:S.h});await b.settle(1500);
        if(end==='flag')await b.page.waitForFunction(()=>/You lose/.test(document.body.innerText)&&/Time|on time/.test(document.body.innerText),null,{timeout:95000});
        else{await clickBtn(b,'^More$');await b.settle(600);await clickBtn(b,'^Resign$');await b.settle(900);await clickBtn(b,'^Tap again to resign$');await b.settle(900);}
        await b.settle(1500);}catch(e){ok=false;L.note(tag+' '+end+': '+String(e).slice(0,160));}
      const m=ok?await read(b):null;got[end]=m;
      const want=end==='flag'?/Time/:/Resigned/;
      L.say(!!m&&want.test(m.card||'')&&/You lose/.test(m.card||'')&&m.n>=10,tag+' '+end+': TC-R415 DENOMINATOR the game ended '+(end==='flag'?'on time':'by resigning')+' vs the computer, sideways, and '+(m?m.n:0)+' painted texts in the rail were read against their clip box',m&&{card:m.card,n:m.n});
      if(m){
        L.say(m.cut.length===0&&m.rail.sh-m.rail.ch<=1,tag+' '+end+': TC-R415 every painted text in the rail lies inside its clip box and the rail does not scroll ('+m.rail.sh+' against '+m.rail.ch+'), so nothing in it waits below the fold',{cut:m.cut.slice(0,6),rail:m.rail});
        const hidOk=m.hidden.every(x=>x.in==='play-moverow')&&(S.h<360||m.hidden.length===0);
        L.say(hidOk&&(S.h<360||(!!m.strip&&m.strip.inClip&&m.strip.moves>=1)),tag+' '+end+': TC-R415 '+(S.h<360?'under 360 tall the move strip is the only text hidden on purpose (a live log, #550 a23)':'the move strip is painted inside the clip box with its moves, and no text is hidden'),{strip:m.strip,hidden:m.hidden.slice(0,8)});
      }
      L.say(b.errs.length===0,tag+' '+end+': TC-R415 zero app errors',b.errs.slice(0,3));
      await b.close();
    }
    const f=got.flag,r=got.resign;
    const same=!!f&&!!r&&Object.keys(f.ys).every(k=>f.ys[k]!=null&&r.ys[k]!=null&&Math.abs(f.ys[k]-r.ys[k])<=1);
    L.say(same,tag+': TC-R431 the time ending costs no height the resign ending does not - the result card and the four buttons sit at the same y after a flag as after a resign',{flag:f&&f.ys,resign:r&&r.ys});
  }
},'237-landscape-gameover-clip-box');
