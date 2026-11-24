'use strict';
// gates/regress/227-nav-symbols-one-meaning.js - ONE SET OF NAVIGATION SYMBOLS, EACH MEANING ONE THING ON EVERY SCREEN. US-R235 / TC-R376..380.
//
// WHY [#553, jobs/one-set-of-navigation-symbols-means-one-thing-everywhere-in-the-app-2026-11-23; card 70, his picks of Mon 23 Nov 2026, and
// docs/run-answers orchestrator-B14-BUTTONS-NOW-2026-11-24, his words at about 7:35am EST Tue 24 Nov]: "the same triangle means 'next
// puzzle' on one screen and 'next move' on another", which he said must not happen. The standard:
//   switching items (puzzles, drill cards, lessons, motifs, ideas) = a HOLLOW triangle with a bar at its outer end
//   stepping moves (a game, Review, a card's line, a lesson)        = a SOLID triangle (first / last move: the solid triangle with a bar)
//   playing a line                                                  = a solid triangle inside a circle, the ONLY blue symbol
//   reset and retry                                                 = the curled arrow, not blue
// WHAT IT READS: the bundle under test (CT_APP), at kunal761 and 320x568 (se), and the desktop 1280x800 where the Play moves panel shows,
// every state AFTER INTERACTION. In each state it reads EVERY visible button on screen (not a list of expected rows), so a symbol that turns
// up on a button nobody listed is still seen. Each button's MEANING comes from what it is called (aria-label, else title, else its words),
// never from a data-ct or data-icon this build added (CLAUDE.md, #432); each button's SYMBOL comes from what it PAINTS (the svg shapes'
// computed fill and stroke, and any triangle glyph in its text).
// WHAT IT ASSERTS per state (TC-R376..380):
//   376 PRECONDITION the state is reached and each meaning the state is listed with has at least one button on screen (never a pass on none)
//   377 every MOVE button paints a solid white triangle (no hollow one, no chevron line, no blue, no triangle glyph)
//   378 every ITEM button paints a hollow triangle and a bar (no solid triangle, no blue)
//   379 every PLAY button paints a circle with a blue filled triangle (or the blue pause; at a line's end the curled arrow, replay, not blue),
//       and every RESET button the curled arrow, not blue
//   380 THE REVERSE, over every visible button: a hollow triangle only on an ITEM button, a solid triangle only on a MOVE or PLAY button, blue
//       only on a PLAY button, and no text triangle glyph (▶ ◀ ⏮ ⏭ ⏸ ▸ ◂) on any button except the NAMED start buttons below
// EXCLUDED, NAMED: worded start buttons that carry a decorative ▶ ('▶ Start game', 'Continue ▶', 'Got it, play ▶', '▶ Play this position',
// '▶ Start training' / '▶ Train next puzzle', the developer gallery's '▶ Play ... (screen-record this)') -
// a copy question left to Kunal by the job's report; the Review's best-move chip row (card 76 is back on the Desk: build nothing there).
// CT_G227_ONLY=<comma list of state keys> runs only those states (a subset is never the whole gate).
// CONTROL-RECORD: e81ee051 2026-11-24 total=129 red=54 scope=trial:3cbe014dc60e how=THE SUBJECT REMOVED: the branch's start (e81ee051, built as base) - batch 13's white chevron for moves and blue triangle for items, the Review's text transport and the lesson's text play: TC-R377 17 red, TC-R378 12, TC-R379 6, TC-R380 19; the fix (trial 06dcd1d30f27) 129 pass 0 fail
const L=require('../lib');
const P=require('../drive/play'),Z=require('../drive/puzzles'),D=require('../drive/lesson'),R=require('../drive/review');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const DSTORE={ct_mymistakes:FENS.map((f,i)=>({fen:f,uci:UCIS[i],label:'Blunder',played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}})),ct_pool:'3'};
const drill=async(b)=>{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);};
const strategy=async(b)=>{await D.states.tactics(b);await b.tapText(/^Strategy$/,{wait:700});};
const answered=async(b)=>{await D.states.tactics(b);await b.tapText(/^(Show answer)$/,{wait:900});};
const playing=async(b)=>{await D.states['demo-m4'](b);await b.page.locator('button[aria-label="Play or pause"]').click();await b.settle(400);};
const sheet=async(b)=>{await R.states['moves-ply10'](b);const has=await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-more"]'));if(has){await b.tapCt('rev-more',500);await b.settle(500);}};
const MEAN={
  move:/^(Back|Forward|Previous move|Next move|Back a move|Forward a move|Step back|Step forward|First move|Last move|Previous move of the line|Next move of the line)$/,
  item:/^(Previous|Next) (puzzle|card|idea|motif)$|^(Previous|Next) lesson\b|^Next lesson:/,
  play:/^(Auto-play|Pause|Play or pause|Play the line|Play this line)$/,
  reset:/^(Reset|Try again|Replay from start|Back to the card's position|Back to the position after your move)$/,
};
const START=/^▶ Start game$|Continue ▶$|^Got it, play ▶$|^▶ Play this position$|^▶\s*why$|^▶ (Start training|Train next puzzle)|^▶ Play( all \d+)? \(screen-record this\)$/;   // named exclusions, see the header
// key -> [enter, meanings the state must show, geometries (default kunal761 and se), extra store]
const STATES=[
  ['play-live',b=>P.states['cpu-4ply'](b),['move']],
  ['play-over',b=>P.states['cpu-resigned'](b),['move']],
  ['passplay',b=>P.states['pp-1'](b),['move']],
  ['play-desk',b=>P.states['cpu-4ply'](b),['move'],['desk']],
  ['puzzle',b=>Z.states['train-step1'](b),['item','reset']],
  ['puzzle-solved',b=>Z.states['train-solved'](b),['item']],
  ['drill',drill,['item','reset'],null,DSTORE],
  ['tactics-answered',answered,['item']],
  ['strategy',strategy,['item']],
  ['lesson-demo',b=>D.states['demo-m4'](b),['move','play']],
  ['lesson-playing',playing,['move','play']],
  ['lesson-end',b=>D.states['demo-end'](b),['move']],
  ['lesson-complete',b=>D.states['practice-complete'](b),['item']],
  ['review-moves',b=>R.states['moves-ply10'](b),['move']],
  ['review-sheet',sheet,['move','play'],['kunal761']],
  ['review-desk',b=>R.states['moves-ply10'](b),['move','play'],['desk']],
];
const GEO={kunal761:'kunal761',se:'se',desk:{w:1280,h:800,safe:''}};
const ONLY=(process.env.CT_G227_ONLY||'').split(',').filter(Boolean);
const READ=(MS)=>{const vw=innerWidth,vh=innerHeight;const M={};for(const k in MS)M[k]=new RegExp(MS[k]);
  const nm=e=>{const a=(e.getAttribute('aria-label')||'').trim();if(a)return a;const t=(e.getAttribute('title')||'').trim();if(t)return t;return (e.innerText||'').replace(/\s+/g,' ').trim();};
  const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>1&&r.height>1))return false;if(r.bottom<=0||r.top>=vh||r.right<=0||r.left>=vw)return false;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false;return true;};
  const BLUE=/^rgb\(91, 155, 213\)$/;const none=f=>!f||f==='none'||/rgba\(0, 0, 0, 0\)/.test(f);
  const out=[];
  for(const e of document.querySelectorAll('button')){if(!vis(e))continue;
    const n=nm(e),text=(e.innerText||'').replace(/\s+/g,' ').trim();const sh=[];
    for(const g of e.querySelectorAll('svg polygon,svg polyline,svg path,svg circle,svg rect,svg line')){const cs=getComputedStyle(g);sh.push({tag:g.tagName.toLowerCase(),fill:cs.fill,stroke:cs.stroke,pts:(g.points&&g.points.numberOfItems)||0});}
    const poly=sh.filter(x=>x.tag==='polygon'&&x.pts===3);   // a TRIANGLE: three points (the Review's star is a filled ten-point polygon and is not one)
    const sym={
      hollow:poly.some(x=>none(x.fill)&&!none(x.stroke)),
      solid:poly.some(x=>!none(x.fill)),
      bar:sh.some(x=>x.tag==='rect'&&!none(x.fill)),
      circle:sh.some(x=>x.tag==='circle'),
      blue:sh.some(x=>BLUE.test(x.fill)||BLUE.test(x.stroke)),
      bluePoly:poly.some(x=>BLUE.test(x.fill)),
      chevron:sh.some(x=>x.tag==='polyline'),
      glyph:/[▶◀⏮⏭⏸▸◂⏪⏩]/.test(text),
      curl:sh.some(x=>x.tag==='path')&&!sh.some(x=>x.tag==='polygon')||/[↺↻]/.test(text),
    };
    let mean=Object.keys(M).filter(k=>M[k].test(n));
    // 'Back' alone is also a screen's corner back (Tactics, Review); it is the MOVE 'Back' only beside its partner 'Forward' in one row
    // (and the reverse) - read from the row it sits in, never from the symbol it paints, which is the thing under test.
    if(n==='Back'||n==='Forward'){const want=n==='Back'?'Forward':'Back';const sib=e.parentElement&&[...e.parentElement.querySelectorAll('button')].some(x=>x!==e&&nm(x)===want);if(!sib)mean=[];}
    out.push({n,text:text.slice(0,40),mean,sym,shapes:sh.map(x=>x.tag+':'+x.fill+'/'+x.stroke).join(' ')});}
  return out;};
const MS={};for(const k in MEAN)MS[k]=MEAN[k].source;
L.run(async()=>{
  for(const [key,enter,must,geos,xstore] of STATES){
    if(ONLY.length&&!ONLY.includes(key))continue;
    for(const g of (geos||['kunal761','se'])){
      const geo=GEO[g];const tag=(g==='kunal761'?'375x761':g==='se'?'320x568':'1280x800')+' '+key;
      const b=await L.launch({geo,name:'g227-'+key+'-'+g,store:{...(xstore||{})}});await b.open();let ok=true,err='';
      try{await enter(b);await b.settle(700);}catch(e){ok=false;err=e.message;}
      const bs=await b.page.evaluate(READ,MS);
      const by=k=>bs.filter(x=>x.mean.includes(k));
      const miss=must.filter(k=>by(k).length===0);
      L.say(ok&&miss.length===0,'TC-R376 '+tag+' PRECONDITION the state is reached and shows '+must.join(', ')+' ('+(miss.length?'NONE for '+miss.join(', '):must.map(k=>k+' '+by(k).map(x=>x.n).join('|')).join('; '))+(err?'; '+err:'')+')',{err,names:bs.map(x=>x.n)});
      const moves=by('move'),items=by('item'),plays=by('play'),resets=by('reset');
      const badM=moves.filter(x=>!(x.sym.solid&&!x.sym.hollow&&!x.sym.chevron&&!x.sym.blue&&!x.sym.glyph));
      if(must.includes('move')||moves.length)L.say(moves.length>0&&badM.length===0,'TC-R377 '+tag+' every move button paints the solid white triangle ('+(badM.length?badM.map(x=>x.n+' paints '+(x.shapes||JSON.stringify(x.text))).join('; '):moves.length+' of '+moves.length)+')',badM);
      const badI=items.filter(x=>!(x.sym.hollow&&x.sym.bar&&!x.sym.solid&&!x.sym.blue&&!x.sym.glyph));
      if(must.includes('item')||items.length)L.say(items.length>0&&badI.length===0,'TC-R378 '+tag+' every switch-item button paints the hollow triangle with a bar ('+(badI.length?badI.map(x=>x.n+' paints '+(x.shapes||JSON.stringify(x.text))).join('; '):items.length+' of '+items.length)+')',badI);
      const badP=plays.filter(x=>!((x.sym.circle&&x.sym.blue&&!x.sym.glyph&&(x.sym.bluePoly||x.sym.bar))||(x.sym.curl&&!x.sym.circle&&!x.sym.blue&&!x.sym.glyph)));   // at a line's end Play shows the curled arrow (replay), not blue
      const badR=resets.filter(x=>!(x.sym.curl&&!x.sym.blue));
      if(must.includes('play')||plays.length||must.includes('reset')||resets.length)L.say((plays.length+resets.length)>0&&badP.length===0&&badR.length===0,'TC-R379 '+tag+' Play paints the blue circled triangle and Reset the curled arrow, not blue ('+((badP.length||badR.length)?[...badP.map(x=>x.n+' (play) paints '+(x.shapes||JSON.stringify(x.text))),...badR.map(x=>x.n+' (reset) paints '+(x.shapes||JSON.stringify(x.text)))].join('; '):plays.length+' play, '+resets.length+' reset')+')',{badP,badR});
      const wrong=[];
      for(const x of bs){
        const is=k=>x.mean.includes(k);
        if(x.sym.hollow&&!is('item'))wrong.push(x.n+': hollow triangle (the switch-item symbol)');
        if(x.sym.solid&&!x.sym.circle&&!is('move')&&!is('play'))wrong.push(x.n+': solid triangle (the move symbol)');
        if(x.sym.blue&&!is('play'))wrong.push(x.n+': blue (Play only)');
        if(x.sym.glyph&&!START.test(x.text))wrong.push(x.n+': text triangle '+JSON.stringify(x.text));
      }
      L.say(ok&&bs.length>0&&wrong.length===0,'TC-R380 '+tag+' no button uses a navigation symbol for another meaning ('+(wrong.length?wrong.join('; '):'all '+bs.length+' buttons read')+')',wrong);
      L.say(b.errs.length===0,'TC-R376 '+tag+' zero app errors',b.errs.slice(0,3));
      await b.close();}}
});
