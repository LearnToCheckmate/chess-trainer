// gates/shots476.js - the #476 before/after render pair, at Kunal's geometry (R19: 375x730).
// Definition of done (d): "a before-and-after rendering at 375x730 with a red box on the change".
// BOTH FRAMES ARE TAKEN IN THE SAME STATE, from the same seed, so neither can be a vacuous or mislabelled
// capture - that is #474's renderPair discipline, where a pair was only trustworthy because a sentinel proved
// which bundle had painted it.
// WHAT ACTUALLY PROVES THE PROVENANCE HERE, AND THE FIRST VERSION OF THIS COMMENT GOT IT WRONG [R18].
// It said each frame "carries a SENTINEL read out of the bundle it loaded (the build stamp)". Measured: on
// the BEFORE frame `b.stamp()` returned **null**, because stamp() matches the build stamp in the live DOM and
// that stamp is not rendered on the Review screen at all. So it is a sentinel for the SCREEN, not for the
// bundle, and on this screen it is simply absent - a sentinel that returns null is not a sentinel.
// The provenance is instead carried by two things that ARE present. (1) L.launch's own print, which names the
// bundle path and the stamp it read OUT OF THE FILE - "bundle ../../../tmp/shipped-475.js  stamp #475 -
// 2026-10-03 22:01 ET (CT_APP)" - which is the mechanism CLAUDE.md requires of every launch for exactly this
// reason. (2) THE DISCRIMINATING CONTENT ITSELF, printed on stdout beside each frame: the before frame reads
// rows=0, count="7 loaded", empty=null; the after frame reads rows=0, count="0 of 7" and a non-null empty
// state. A pair of frames that differ in the quantity under test, each beside the bundle that produced it,
// is stronger evidence than a stamp - and unlike the stamp it cannot come back null without the run noticing.
// THE STATE CHOSEN IS THE DEFECT'S OWN STATE, not the default screen: the list narrowed by the PRE-EXISTING
// name box to a string that matches nothing. On #475 that is a blank list under a header still reading
// "7 loaded"; on #476 it is "0 of 7" over a sentence naming the filter and a way back. A pair taken on the
// unfiltered screen would show only the new chip row and would miss the thing the job was filed about.
'use strict';
const L=require('./lib');
const path=require('path');

const MOVES='1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0';
const pgn=(w,b,r)=>['[Event "Live Chess"]','[Site "Chess.com"]','[Date "2026.09.01"]','[White "'+w+'"]',
  '[Black "'+b+'"]','[Result "'+r+'"]','[TimeControl "180"]','[WhiteElo "1500"]','[BlackElo "1480"]','[ECO "C70"]','',MOVES,''].join('\n');
const G=[['Alpha','opp1','win',1757000001000],['opp2','Alpha','win',1757000002000],['Alpha','opp3','resigned',1757000003000],
         ['Alpha','opp4','draw',1757000004000],['beta','opp5','win',1757000005000],['opp6','beta','win',1757000006000],
         ['beta','opp7','win',1757000007000]];
const rows=G.map(([w,b,wr,d])=>({src:'cc',acct:(w==='Alpha'||b==='Alpha')?'Alpha':'beta',white:w,black:b,wr,tc:'blitz',date:d,
  pgn:pgn(w,b,wr==='win'?'1-0':(wr==='draw'?'1/2-1/2':'0-1'))}));
const gk=(g)=>g.src+':'+g.date+':'+g.white+':'+g.black;
const TALLY={};rows.forEach((g,i)=>{if(i<5)TALLY[gk(g)]={bril:i===0?1:(i===3?2:0),great:1,inacc:0,mist:i===1?2:(i===2?1:0),blun:i===1?1:(i===3?3:0),src:'est'};});
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:alpha','cc:beta'],
  ct_acctgames:{'cc:alpha':rows.slice(0,4),'cc:beta':rows.slice(4)},ct_gamestats:TALLY};

(async()=>{
  const which=process.argv[2];                       // 'before' | 'after'
  const app=process.argv[3]||undefined;              // bundle path for 'before'
  if(app)process.env.CT_APP=app;
  const b=await L.launch({geo:{w:375,h:730,safe:''},store:STORE,name:'shots476-'+which});
  await b.open(); await b.tile('Review'); await b.settle(1400);
  const stamp=await b.stamp();                       // THE SENTINEL: which bundle actually painted this frame
  // drive the PRE-EXISTING name box to a string that matches nothing - the state the job is about
  const box=b.page.locator('input[placeholder="Filter by player name"]');
  if(await box.count()===0){console.log(which+': FATAL the name box is absent, the frame would be vacuous');process.exit(2);}
  await box.fill('zzzznosuchplayer'); await b.settle(900);
  // the red box goes round the region that differs: the count readout and whatever sits where the rows were
  const mark=await b.page.evaluate(()=>{
    const t=(el)=>el?(el.textContent||'').replace(/\s+/g,' ').trim():null;
    const cnt=document.querySelector('[data-ct="glist-count"]')||
      [...document.querySelectorAll('span')].find(x=>/^\d+(?: loaded| of \d+)$/.test(t(x)||''));
    const list=document.querySelector('[data-ct="game-row"]');
    const empty=document.querySelector('[data-ct="glist-empty"]');
    const hdr=[...document.querySelectorAll('span')].find(x=>/^Your games/.test(t(x)||''));
    const anchor=empty||list||hdr;
    // #476 BRING THE ANCHOR ON SCREEN BEFORE MEASURING, IN BOTH FRAMES, so the pair stays matched.
    // The first version of this script shot the frames unscrolled and the AFTER frame did not contain the
    // empty-state sentence at all - it sat below the fold at 375x730 - so the render taken to evidence the
    // change showed clause (1) and clause (2) and NOT clause (3), which is the clause the job was actually
    // filed about. This run's auditor caught that. `#root` is the app's scroller, so scrollIntoView on the
    // anchor moves the real scrolling ancestor; the box is measured AFTER the scroll settles.
    if(anchor)anchor.scrollIntoView({block:'center'});
    const a=cnt?cnt.getBoundingClientRect():null, c=anchor?anchor.getBoundingClientRect():null;
    const x0=Math.min(a?a.left:1e9,c?c.left:1e9)-6, y0=Math.min(a?a.top:1e9,c?c.top:1e9)-6;
    const x1=Math.max(a?a.right:0,c?c.right:0)+6, y1=Math.max(a?a.bottom:0,c?c.bottom:0)+6;
    const d=document.createElement('div');
    d.style.cssText='position:fixed;left:'+x0+'px;top:'+y0+'px;width:'+(x1-x0)+'px;height:'+(y1-y0)+'px;'+
      'border:3px solid #ff2d2d;border-radius:8px;z-index:99999;pointer-events:none';
    document.body.appendChild(d);
    return {count:t(cnt),empty:t(empty),rows:document.querySelectorAll('[data-ct="game-row"]').length,
            box:[Math.round(x0),Math.round(y0),Math.round(x1-x0),Math.round(y1-y0)]};
  });
  await b.shot('476-review-filter-'+which+'-at-375x730');
  console.log(which+'  stamp='+stamp+'  rows='+mark.rows+'  count='+JSON.stringify(mark.count)+'  empty='+JSON.stringify(mark.empty)+'  redbox='+JSON.stringify(mark.box));
  await b.close();
})().catch(e=>{console.error('shots476 threw',e);process.exit(1);});
