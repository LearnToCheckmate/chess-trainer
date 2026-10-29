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
// taste call) and then its own build; the drill - jobs/board-jumps-on-drill-verdict and then
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
];
const cutBands=(bands,top)=>bands.map(([a,b])=>[Math.max(a,top),b]).filter(([a,b])=>b-a>=8).map(([a,b])=>[+a.toFixed(1),+b.toFixed(1),+(b-a).toFixed(1)]);
const sum=(bands)=>+bands.reduce((s,x)=>s+x[2],0).toFixed(1);
const big=(bands)=>bands.reduce((m,x)=>(!m||x[2]>m[2])?x:m,null);
const fmt=(bands)=>bands.map(x=>x[2]+' @'+x[0]+'-'+x[1]).join(' ; ')||'none';

L.run(async()=>{
  const table=[];
  for(const [cs,label,drive,store] of STATES){
    const row={label,cs};
    for(const c of COLS){
      let m=null,err=null,ink=0;
      const b=await L.launch({geo:c.geo,store:Object.assign({ct_pool:'3'},store),name:'eb-'+label.replace(/ /g,'-')+'-'+c.n.split(' ')[0]});
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
