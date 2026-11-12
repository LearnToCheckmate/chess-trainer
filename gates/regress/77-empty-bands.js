'use strict';
// gates/regress/77-empty-bands.js - REPORT-ONLY. THE EMPTY-BAND MEASUREMENT, TC-S04 / TC-S05 / TC-S06, US-INV-06.
//
// WHY THIS EXISTS [#545, item (25) of directOpening_2026_10_29_batch5;
// jobs/empty-band-cases-and-clause-at-375x761-report-only-first-2026-10-12]. Kunal adopted one rule on 11 Oct 2026
// (Decision Desk card empty-space-limit-per-screen-2026-10-10, "Yes, adopt the 60px rule"): on a screen that does not
// scroll, no empty vertical band is over 60px, certified at 375x761 with the real insets (51 top, 31 bottom; the top
// 51px status area does not count); other heights are reported, not asserted. Until this file nothing could measure a
// band at that height, so no screen fix queued for the rule could show it had met it.
//
// REPORT-ONLY. THIS GATE ASSERTS NO BAND. It asserts only that each state was REACHED and MEASURED (a measurement over
// an empty page is reported, never credited), so it cannot go silent. Every band is printed with L.note, which is the
// suite's own reported-not-asserted mechanism (gates/regress/26-invariants.js prints invariant 3 that way).
//
// PROMOTION RULE. A state moves from report-only to asserted (largest band at most 60px at 375x761 with real insets)
// in the SAME COMMIT as the fix that brings it to 60px or under, or on a re-measure that finds it already there.
// Owners today: the Review move screen - jobs/eval-graph-into-the-band; Puzzles right after a solve -
// jobs/puzzle-screen-celebration-overlaps-and-dead-space-2026-09-24; Discover - its own Desk card (owed to Kunal, a
// taste call) and then its own build (answered 'tiles', promoted at #549); the drill - jobs/board-jumps-on-drill-verdict and then
// jobs/drill-empty-bands-at-375x761-once-the-float-has-landed-2026-10-12 (the drill states are NOT driven here yet).
// The Puzzles rankup state has no owner job and stays report-only.
//
// THE INK DEFINITION, in words (the job's inkDefinition, verbatim in substance). A vertical point of the viewport is
// INK if any of these covers it: (1) the glyph box of any non-empty text node that is visible (not display none, not
// visibility hidden, not opacity 0.05 or less, on the element or any ancestor) and is not covered at its own centre by
// another element; (2) the box of any replaced or form element (img, svg, canvas, video, input, textarea, select, hr)
// that is visible and not covered; (3) the box of any element that is an opaque surface (background alpha over 0.99
// and a colour different from the one painted behind it), or has a visible border, or has a box shadow, provided its
// height is not more than 90 percent of the viewport height and it is not covered. An EMPTY BAND is a maximal run of
// vertical points with no ink; bands under 8pt are ignored; the empty total is the sum of the remaining bands and the
// largest band is the longest. INK below is the job's methodScriptInk, pasted UNCHANGED.
//
// THE TOP 51px, AND EXACTLY HOW. The pasted function scans from y 0 and has no clip at 51. The exclusion is applied
// AFTER it, to its output, at the 375x761 column only: every band is cut to start no higher than y 51 and is then
// dropped if it is under 8px. That is exact rather than approximate, because cutting can only SHORTEN a band, so a
// band the function already dropped for being under 8px can never come back above it. Both readings print, the raw
// one first, so the card's numbers (taken with no exclusion) can be compared like for like. The 730 and 812 columns
// carry no insets at all, so nothing is excluded there; they are REPORTED, never asserted.
//
// THE 375x761 COLUMN applies BOTH halves of the real insets, as the card's readings were taken: lib's kunal761 geometry
// (ct_safe 51,31) plus Chromium's Emulation.setSafeAreaInsetsOverride top 51 bottom 31, so CSS env(safe-area-inset-*)
// reads 51 and 31 rather than 0.
// CONTROL-RECORD: 752b6d3 2026-10-29 total=61 red=6 scope=trial:dfd2bce100c5 how=the Home tile relabelled "Discovery" so home discover cannot be reached; the REACHED and MEASURED pair reddens at all three columns [#545 item (25)]
// CONTROL-RECORD: 8f55589 2026-11-06 total=93 red=1 scope=trial:14ea26b79b33 how=the #549 base bundle (rows read against the viewport less 56, icons at 0.52 of the row); restricted to home discover, the PROMOTED line reds at 375x761 real reading 89 @379.2-468.2; a row-fix-reverted bundle 05984d62dcd7 reds it at 68 [#549 item (18)]
// CONTROL-RECORD: 3620b52 2026-11-06 total=124 red=34 scope=trial:092470ec1943 how=mistake capture disabled (if(0)caps.push) and both pz-top marginTop 90: FAIL TC-S07 PHASE 1 mistakes x2, every drill-mistakes REACHED and MEASURED at all three columns (24), the four drill-brilliant PROMOTED lines (98.5/94.5 @51) and the four promoted puzzles states; the trial 96d043bdf18f reads 128 pass 0 fail [#549 item (21)]
const L=require('../lib');
const HM=require('../drive/home');
const PZ=require('../drive/puzzles');
const R=require('../drive/review');

const INK=()=>{
  const vh=innerHeight, vw=innerWidth, iv=[];
  const add=(t,b)=>{t=Math.max(0,t);b=Math.min(vh,b);if(b-t>0.01)iv.push([t,b]);};
  const vis=(el)=>{const st=getComputedStyle(el);if(st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity)<=0.05)return false;
    // any ancestor display none / hidden / opacity
    for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<=0.05)return false;}
    return true;};
  const occluded=(el,r)=>{const x=Math.min(vw-1,Math.max(0,r.left+r.width/2)),y=Math.min(vh-1,Math.max(0,r.top+r.height/2));const top=document.elementFromPoint(x,y);return !(top&&(top===el||el.contains(top)||top.contains(el)));};
  // (1) text
  const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=tw.nextNode())){const t=(n.textContent||'').replace(/\s+/g,'');if(!t)continue;const el=n.parentElement;if(!el||!vis(el))continue;
    if(['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName))continue;
    const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.bottom<0||r.top>vh)continue;
    if(occluded(el,r))continue;add(r.top,r.bottom);}
  // (2) replaced
  for(const el of document.querySelectorAll('img,svg,canvas,video,input,textarea,select,hr')){if(!vis(el))continue;const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(occluded(el,r))continue;add(r.top,r.bottom);}
  // (3) surfaces
  const alpha=(c)=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 0;const p=m[1].split(',').map(s=>parseFloat(s));return p.length>=4?p[3]:1;};
  const paintedBg=(el)=>{for(let p=el.parentElement;p;p=p.parentElement){const c=getComputedStyle(p).backgroundColor;if(alpha(c)>0.99)return c;}return 'rgb(255, 255, 255)';};
  for(const el of document.body.querySelectorAll('*')){if(!vis(el))continue;const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.bottom<0||r.top>vh)continue;if(r.height>0.9*vh)continue;
    const st=getComputedStyle(el);let surf=false;
    if(alpha(st.backgroundColor)>0.99&&st.backgroundColor!==paintedBg(el))surf=true;
    const bw=parseFloat(st.borderTopWidth)+parseFloat(st.borderBottomWidth)+parseFloat(st.borderLeftWidth)+parseFloat(st.borderRightWidth);
    if(bw>0&&st.borderTopStyle!=='none'&&alpha(st.borderTopColor)>0.05)surf=true;
    if(st.boxShadow&&st.boxShadow!=='none')surf=true;
    if(!surf)continue;if(occluded(el,r))continue;add(r.top,r.bottom);}
  iv.sort((a,b)=>a[0]-b[0]);const m=[];for(const x of iv){if(m.length&&x[0]<=m[m.length-1][1]+0.0001)m[m.length-1][1]=Math.max(m[m.length-1][1],x[1]);else m.push([x[0],x[1]]);}
  const bands=[];let cur=0;for(const [a,b] of m){if(a>cur)bands.push([cur,a]);cur=Math.max(cur,b);}if(cur<vh)bands.push([cur,vh]);
  const real=bands.filter(([a,b])=>b-a>=8);const empty=real.reduce((s,[a,b])=>s+(b-a),0);
  let big=null;for(const [a,b] of real){if(!big||b-a>big[1]-big[0])big=[a,b];}
  return {vh,empty:+empty.toFixed(1),pct:+(100*empty/vh).toFixed(1),largest:big?+(big[1]-big[0]).toFixed(1):0,at:big?big[0].toFixed(1)+'-'+big[1].toFixed(1):'',bands:real.map(([a,b])=>[+a.toFixed(1),+b.toFixed(1),+(b-a).toFixed(1)])};
};

const COLS=[
  {n:'375x761 real', geo:'kunal761', real:true, cut:51},
  {n:'375x730',      geo:{w:375,h:730,safe:'',label:'375x730, no insets (reported column)'}, real:false, cut:0},
  {n:'375x812',      geo:{w:375,h:812,safe:'',label:'375x812, no insets (reported column)'}, real:false, cut:0},
];
// [case, label, driver state, store]. TC-S04 is the draft's nine states; TC-S05 is Discover; TC-S06 is the Review move
// screen in the card's three states (moves-ply10 mid-game, moves-ply0 move 0, analysis engine lines open). The ninth
// TC-S04 state moves-last and the extra moves-ply0 are named, as the job asks.
// #549 item (21), jobs/drill-empty-bands-at-375x761-once-the-float-has-landed-2026-10-12: THE DRILL CARDS ARE CAPTURED BY THE APP, never
// hand-written (the job's mustNotDo; #548 seeded three invented one-move cards here). PHASE 1 below reviews the Opera Game through the
// stored-account path twice, as gate 51 does: as BLACK the app captures 2 mistakes (e7b4 after 10.Nxb5, e6d7 after 15.Bxd7+), as WHITE
// it captures 1 brilliancy (c3b5, 10.Nxb5), measured on the #549 trial 96d043bdf18f at about 15s each. Each drill state then re-seeds
// ONE harvested card (gate 51's pattern (b): deterministic, nothing inherited from a previous card) - the FIRST captured one (e7b4 and
// c3b5 on that trial, neither side in check), and the wrong move is a single pawn push (a7a6 for Black, a2a3 for White).
const PGN77=`[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.01"]
[White "Jsmiller1112"]
[Black "DukeKarlCountIsouard99"]
[Result "1-0"]
[TimeControl "600"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
const ACCT77=(u,wr)=>({ct_accts:['cc:'+u],ct_acctgames:{['cc:'+u]:[{src:'cc',acct:u,pgn:PGN77,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr,tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3',ct_bril_reset_v1:'1'});
const DRSEED={mistakes:null,brilliant:null};   // filled by PHASE 1 with the app's own capture
const DRCARD={mistakes:null,brilliant:null};
const WRONG={w:'a2a3',b:'a7a6'};
// ASKED, WRONG (a legal non-solution move; the ✗ verdict must render), HINT (the 💡 button; the 💡 line must render), SOLVED (the
// captured uci played). The wrong and hint states assert they were entered, not merely driven (CLAUDE.md, "a gate that enters a state
// by the shortest route often enters the wrong one").
const DR=(k,path)=>async(b)=>{const card=DRCARD[k];if(!card)throw new Error('PHASE 1 captured no '+k+' card');
  await b.tile('Review');await b.settle(700);
  await b.tapText(k==='mistakes'?/find the move you missed/:/can you spot them again\?/,{wait:1800});
  await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  const leaf=(re)=>b.page.evaluate((src)=>{const re=new RegExp(src,'u');const t=document.querySelector('[data-ct="pz-top"]');if(!t)return '';
    const c=[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&re.test((e.innerText||'').trim()));return c.length?(c[c.length-1].innerText||'').trim():'';},re.source);
  if(path==='wrong'){const w=WRONG[card.fen.split(' ')[1]];await b.move(w.slice(0,2),w.slice(2,4),900);await b.settle(1100);
    if(!(await leaf(/^✗/)))throw new Error('wrong move '+w+' played and no ✗ verdict rendered - the wrong-move state was not entered');}
  if(path==='hint'){const _hb=b.page.locator('button[aria-label="Hint"]:visible');if(await _hb.count())await _hb.first().click({timeout:4000});else await b.tapText(/^\u{1F4A1} Hint$/u);await b.page.waitForTimeout(900);   /* #550 item (66): the drills' Hint is an icon named by aria-label on phones; the text form stays for any wider screen */
    if(!(await leaf(/^\u{1F4A1}/u)))throw new Error('hint tapped and no 💡 line rendered - the hint state was not entered');}
  if(path==='solved'){await b.move(card.uci.slice(0,2),card.uci.slice(2,4),900);await b.settle(1500);
    if(!(await leaf(/^🎉/u)))throw new Error('captured move '+card.uci+' played and no 🎉 verdict rendered - the solved state was not entered');}
};
// PROMOTED BY RE-MEASURE [#549 item (21)], per the promotion rule's "or on a re-measure that finds it already there": every drill state
// read at or under 60px at 375x761 real on the #549 trial 96d043bdf18f (the readings are in this item's CONTROL-RECORD and the job's
// outcome). Kept apart from PROMOTED77 and appended to it at run start.
const PROMOTED77D=['drill mistakes asked','drill mistakes wrong','drill mistakes hint','drill mistakes solved','drill brilliant asked','drill brilliant wrong','drill brilliant hint','drill brilliant solved'];
const STATES=[
  ['TC-S04 TC-S05','home discover',      HM.states['discover'],      {}],
  ['TC-S04','puzzles train',             PZ.states['train'],         {}],
  ['TC-S04','puzzles train-solved',      PZ.states['train-solved'],  {}],
  ['TC-S04','puzzles train-fail',        PZ.states['train-fail'],    {}],
  ['TC-S04','puzzles train-hint',        PZ.states['train-hint'],    {}],
  ['TC-S04','puzzles rankup',            PZ.states['rankup'],        {}],
  ['TC-S04 TC-S06','review moves-ply10', R.states['moves-ply10'],    R.SEED],
  ['TC-S04','review moves-last',         R.states['moves-last'],     R.SEED],
  ['TC-S04 TC-S06','review analysis',    R.states['analysis'],       R.SEED],
  ['TC-S06','review moves-ply0',         R.states['moves-ply0'],     R.SEED],
  // #548 item (146), jobs/drill-empty-bands-at-375x761-once-the-float-has-landed-2026-10-12: THE TWO DRILLS, now that the drill float
  // build (#547 item (80), e384760, the solved board no longer jumps) is on main. #549 item (21) adds the wrong-move and hint states the
  // job's acceptance B names, and captures the cards through the app (PHASE 1) instead of seeding invented ones.
  ['TC-S07','drill mistakes asked',    DR('mistakes','asked'), ()=>DRSEED.mistakes],
  ['TC-S07','drill mistakes wrong',    DR('mistakes','wrong'), ()=>DRSEED.mistakes],
  ['TC-S07','drill mistakes hint',     DR('mistakes','hint'), ()=>DRSEED.mistakes],
  ['TC-S07','drill mistakes solved',   DR('mistakes','solved'), ()=>DRSEED.mistakes],
  ['TC-S07','drill brilliant asked',   DR('brilliant','asked'), ()=>DRSEED.brilliant],
  ['TC-S07','drill brilliant wrong',   DR('brilliant','wrong'), ()=>DRSEED.brilliant],
  ['TC-S07','drill brilliant hint',    DR('brilliant','hint'), ()=>DRSEED.brilliant],
  ['TC-S07','drill brilliant solved',  DR('brilliant','solved'), ()=>DRSEED.brilliant],
];
// #549 item (18), jobs/bench-discover-is-57-per-cent-empty-2026-09-30: HOME DISCOVER PROMOTED in the same commit as its fix, per the rule
// above. On the #549 base (md5 14ea26b79b33) it read 89 @379.2-468.2 at 375x761 real; the fix (rows measured against the real tab bar,
// icon at 0.64 of the row) reads 52 @381.7-433.7. 375x730 (78) and 375x812 (119) stay reported, as the rule says.
const PROMOTED77=['home discover','puzzles train','puzzles train-solved','puzzles train-fail','puzzles train-hint','review moves-ply10','review moves-last','review analysis'];
const cutBands=(bands,top)=>bands.map(([a,b])=>[Math.max(a,top),b]).filter(([a,b])=>b-a>=8).map(([a,b])=>[+a.toFixed(1),+b.toFixed(1),+(b-a).toFixed(1)]);
const sum=(bands)=>+bands.reduce((s,x)=>s+x[2],0).toFixed(1);
const big=(bands)=>bands.reduce((m,x)=>(!m||x[2]>m[2])?x:m,null);
const fmt=(bands)=>bands.map(x=>x[2]+' @'+x[0]+'-'+x[1]).join(' ; ')||'none';

L.run(async()=>{
  const table=[];
  PROMOTED77.push(...PROMOTED77D);
  // PHASE 1 [#549 item (21)]: the app captures the drill cards. Its own two assertions, so an empty harvest is a RED and never a quiet
  // "no drill states" (CLAUDE.md, "before asserting a property of a collection, assert the collection is non-empty").
  for(const [k,u,wr,key] of [['mistakes','dukekarlcountisouard99','loss','ct_mymistakes'],['brilliant','jsmiller1112','win','ct_mybrilliancies']]){
    let got=[],err=null;const b=await L.launch({geo:{w:375,h:730,safe:''},name:'eb-capture-'+k,store:ACCT77(u,wr)});
    try{await b.open();await b.tile('Review');await b.settle(700);
      await b.page.locator('button',{hasText:/Review ›/}).first().click();
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(1200);
      got=await b.page.evaluate((key)=>JSON.parse(localStorage.getItem(key)||'[]'),key);}catch(e){err=String(e&&e.message||e).slice(0,160);}
    await b.close();
    const card=got.find(m=>m&&m.fen&&m.uci)||null;   // the FIRST captured card; if its side to move cannot make the pawn push the wrong state goes red and says so
    L.say(!err&&got.length>0,'TC-S07 PHASE 1 the app CAPTURED at least one '+k+' card by reviewing the Opera Game as '+(k==='mistakes'?'Black':'White')+' through the stored-account path ('+got.length+' in '+key+')',err?{err}:got.map(m=>({uci:m.uci,played:m.played,fen:m.fen})));
    L.say(!!card,'TC-S07 PHASE 1 a captured '+k+' card was chosen to drive the four drill states (the first captured)',card&&{uci:card.uci,fen:card.fen});
    if(card){DRCARD[k]=card;DRSEED[k]=k==='mistakes'?{ct_mymistakes:[card]}:{ct_mybrilliancies:[card],ct_bril_reset_v1:'1'};}
  }
  for(const [cs,label,drive,store] of STATES){
    const row={label,cs};
    for(const c of COLS){
      let m=null,err=null,ink=0;
      const b=await L.launch({geo:c.geo,store:Object.assign({ct_pool:'3'},typeof store==='function'?(store()||{}):store),name:'eb-'+label.replace(/ /g,'-')+'-'+c.n.split(' ')[0]});
      try{
        if(c.real){const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:51,bottom:31,left:0,right:0}});}
        await b.open();
        await drive(b);
        await b.page.waitForTimeout(400);
        m=await b.page.evaluate(INK);
        ink=await b.page.evaluate(()=>{let k=0;const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))if((n.textContent||'').trim())k++;return k;});
      }catch(e){err=String(e&&e.message||e).slice(0,160);}
      await b.close();
      // REACHED AND MEASURED, each its own line - the only two things this gate asserts.
      L.say(!err&&!!m, cs+' '+label+' @'+c.n+': the state was REACHED (its driver ran to the end without throwing)',err?{err}:undefined);
      L.say(!!m&&m.vh===(typeof c.geo==='object'?c.geo.h:L.GEOS[c.geo].h)&&ink>0, cs+' '+label+' @'+c.n+': the band scan MEASURED a painted page of the right height - a scan over nothing reports "no bands" and must not be believed',{vh:m&&m.vh,textNodes:ink});
      if(!m)continue;
      const raw=m.bands, cut=c.cut?cutBands(raw,c.cut):raw.map(x=>x.slice());
      const bg=big(cut);
      // PROMOTED [#547 items (87), (56)/(184)]: states measured at or under 60px at 375x761 real are now ASSERTED there, per the
      // promotion rule above. Measured on the #547 trial: train-solved 49 (was 89.4, item 87 centres the verdict card), review
      // moves-ply10 25.1, moves-last 42, analysis 11 (were 68.5/68.5/99, the graph moved into the band), puzzles train 46.6,
      // train-fail and train-hint 15.5 (already under). Rankup and review moves-ply0 (71) stay report-only; Discover was promoted at #549 (see PROMOTED77).
      if(c.real&&PROMOTED77.indexOf(label)>=0)L.say(!!bg&&bg[2]<=60,cs+' '+label+' @'+c.n+': PROMOTED - the largest empty band is at most 60px (Kunal\'s rule, adopted 11 Oct): '+(bg?bg[2]+' @'+bg[0]+'-'+bg[1]:'none'),{largest:bg&&bg[2],at:bg&&(bg[0]+'-'+bg[1])});
      row[c.n]={largest:bg?bg[2]:0,at:bg?bg[0]+'-'+bg[1]:'',empty:sum(cut),rawLargest:m.largest,rawAt:m.at};
      L.note('    REPORT '+cs+' '+label+' @'+c.n+(c.cut?'  RAW from y 0: largest '+m.largest+' @'+m.at+', empty '+m.empty+'  |  TOP '+c.cut+'px EXCLUDED:':':')+
        ' largest '+(bg?bg[2]+' @'+bg[0]+'-'+bg[1]:'0')+', empty '+sum(cut)+', bands >= 8: '+fmt(cut)+(c.cut?'   (60px rule, not asserted: '+((bg?bg[2]:0)<=60?'within':'OVER')+')':''));
    }
    table.push(row);
  }
  L.note('    SUMMARY (largest band / total empty; 375x761 with the top 51px excluded; 730 and 812 reported, with 812 minus 730 for TC-S04):');
  for(const r of table){const a=r['375x761 real'],b=r['375x730'],c=r['375x812'];
    L.note('      '+r.label.padEnd(22)+' 761r '+(a?a.largest+' / '+a.empty:'-')+'   730 '+(b?b.largest+' / '+b.empty:'-')+'   812 '+(c?c.largest+' / '+c.empty:'-')+'   812-730 empty '+(b&&c?+(c.empty-b.empty).toFixed(1):'-'));}
  const over=table.filter(r=>r['375x761 real']&&r['375x761 real'].largest>60).map(r=>r.label);
  L.note('    OVER 60px at 375x761 real (REPORTED, not asserted): '+over.length+' of '+table.length+(over.length?' - '+over.join(', '):''));
},'77-empty-bands');
