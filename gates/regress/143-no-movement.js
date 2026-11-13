'use strict';
// gates/regress/143-no-movement.js - NOTHING MOVES THAT THE USER DID NOT MOVE. US-R151 / TC-R219a..i.
//
// WHY [#550, docs/movement-check-2026-11-12, Kunal 12 Nov: "Every time I click on the next move button at the bottom right, for some
// reason the board keeps shaking for a few seconds"; his ruling on MOV-01: "Fix the cause, keep the loop from flipping between two trims
// whatever the cause, and gate it in a real scaled window at his size"]. MOV-01: at a display scale other than 100% the root's 100dvh is
// fractional (1267.33 in a 1063x1267 window at 150%) while clientHeight is rounded (1267), so _fitOver read an exact fit as +0.33 over;
// the fit loop trimmed 16, fixr3e counted the eval graph band as slack at trim 16, the board grew back to trim 0, and it flipped
// 820 <-> 804 18 to 36 times after every move. Gate 135 could not see it: deviceScaleFactor emulation keeps the viewport a whole number
// of CSS px. MOV-02: the same phantom +0.33 at 960x971 at 150% trimmed the board 16px for good (651.03 against 667.03). MOV-03: sideways,
// the move counter at the end of the toolbar row changed width with its digits (9/33 -> 10/33) and the four buttons beside it resized and
// shifted 2 to 6px. MOV-04: sideways, the comparison strip's 20px was reserved only at plies that had a strip, so the explanation box
// grew and shrank 20px and the graph and move strip under it jumped.
// WHAT IT READS: the bundle under test (CT_APP). (A) A REAL SCALED WINDOW (L.launch realScale: Chromium run with
// --force-device-scale-factor and --window-size, no emulated viewport), the Opera Game reviewed (drive/review.js), eval graph on, ply 4,
// Next move tapped twice, the widest repeat(8,...) grid sampled every animation frame for 3 s after each tap - at 1063x1267 and
// 1025x1261 at 1.5 and 1230x1510, 1511 and 1512 at 1.25 (the five windows the checker saw shake), and 960x971 at 1.5 (MOV-02). The
// window's own fractional 100dvh is read and printed first, so a run that did not get a fractional viewport says so. (B) Sideways
// Review at 1440x780 and 761x375 (emulated, scale 1): the toolbar buttons and the counter read at plies 9 and 10 (one more digit), and
// the explanation box, the eval graph and the move strip read at plies 0..6.
// KNOW ITS LIMIT: headless Chromium on Linux with the gates' pinned fonts, not his Windows Chrome with Segoe UI; row heights differ a
// little from his, the mechanism does not depend on them. 1230x1512 has a whole-number viewport and shook anyway (fractional rows) on the
// checker's run; it is read here as a size, not as a fractional-viewport case. MOV-08 (puzzle header, the formatting
// lane's) and MOV-09 (tab padding, not built: measured, Home's menu button sits at y 15 against 8 on the tab screens at kunal761 and 320x568,
// which is the top-row standard the formatting lane is changing) are not covered here.
// AND MOV-05/06/07 (#550, docs/movement-check-2026-11-12; US-R151 / TC-R219g..i): (C) a sideways lesson in practice at 1440x780 and 1920x970 -
// Flip, Hints and Try again kept dropping 44px after the first correct move, because the step-through row (|< < LIVE > >|) joined the column
// then; (D) the sideways Play rail at 761x375 and 1440x780 - the bottom player bar sat under the controls until the move list appeared, then
// at the rail's foot (191 -> 327 at 761x375, 191 -> 732 at 1440x780), and rode up again on Moves closed and at checkmate; (E) sideways
// Puzzles at 761x375 - the hint replaced the 17px counter row with three lines and the top panel grew 206 -> 223.5.
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=76 red=25 scope=trial:9812f33cea74 how=the branch tip before the change (no sub-pixel rule in _fitOver, no shrink memory in the fit loop, the sideways counter content-sized, the comparison strip reserved only where it renders): 820/804 with 18 changes per tap at all five windows and 651.03/667.03 at 960x971 (TC-R219a/b/f red), buttons 6.09px and counter 8px at 1440x780 and 761x375 (c/d red), rev-why 34/54 and the graph 20px (e red); on t2 366455f018b8 76/0
// CONTROL-RECORD: bcc4eff 2026-11-13 total=94 red=5 scope=trial:9f4f6f823150 how=#550 MOV-05/06/07 arms on t0, the branch tip before them (claude/exciting-noether-v1swj8 faa82a9): TC-R219g red at 1440x780 and 1920x970 (44px), TC-R219h red at 761x375 (191/327/191/327/269.8) and 1440x780 (191/732/191/732/273.6), TC-R219i red (206 -> 223.5); the older arms stay green there (MOV-01..04 are on that tip); on t3 450fed03791b 94/0
// HALF-FIX RECORD: the fit loop's shrink memory alone (no sub-pixel rule, MOV-03/04 not applied), trial 9dc62b591b92: total=76 red=14 - every TC-R219a green (0 changes: the loop stops at the smaller trim and does not flip), every TC-R219b/f red (the board holds 804, 651.03), c/d/e red - so the cause fix and the anti-flip memory are each pinned by their own case.
const L=require('../lib');
const R=require('../drive/review');
const sample=(b,ms)=>b.page.evaluate((ms)=>new Promise(res=>{const s=[];const t0=performance.now();
  const f=()=>{let m=0;for(const e of document.querySelectorAll('div'))if(/repeat\(8,/.test(e.style.gridTemplateColumns||'')){const r=e.getBoundingClientRect();if(r.width>m)m=r.width;}
    s.push(Math.round(m*100)/100);if(performance.now()-t0<ms)requestAnimationFrame(f);else res(s);};requestAnimationFrame(f);}),ms);
const curPly=(b)=>b.page.evaluate(()=>{const s=[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')];return s.findIndex(x=>x.style.boxShadow&&x.style.boxShadow!=='none')+1;});
const changes=(s)=>{let c=0;for(let k=1;k<s.length;k++)if(s[k]!==s[k-1])c++;return c;};
async function openReview(b,tag){
  let ok=true;try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,4);await b.settle(1500);}catch(e){ok=false;}
  L.say(ok,tag+': TC-R219 PRECONDITION the Opera Game is reviewed and on ply 4');return ok;
}
// (A) one real scaled window
async function scaled(w,h,sc,opts){
  const tag=w+'x'+h+' @'+sc;
  const b=await L.launch({geo:{w,h,safe:'',label:tag+' real scaled window'},realScale:sc,name:'mov143-'+w+'x'+h,store:{ct_pool:'3',ct_evalgraph:'1'}});await b.open();
  const vp=await b.page.evaluate(()=>({ih:innerHeight,iw:innerWidth,dpr:devicePixelRatio,ch:document.documentElement.clientHeight,root:Math.round(document.getElementById('root').getBoundingClientRect().height*1000)/1000}));
  L.say(Math.abs(vp.dpr-sc)<1e-6&&vp.iw===w&&vp.ih===h,tag+': TC-R219 PRECONDITION the window really runs at scale '+sc+' and is '+w+'x'+h+' CSS px (dpr '+vp.dpr+', '+vp.iw+'x'+vp.ih+', #root '+vp.root+', clientHeight '+vp.ch+')',vp);
  if(opts.frac)L.say(Math.abs(vp.root-Math.round(vp.root))>0.1,tag+': TC-R219 PRECONDITION 100dvh is fractional here (#root '+vp.root+' against clientHeight '+vp.ch+') - the condition MOV-01 needs',vp);
  else L.note(tag+': #root '+vp.root+', clientHeight '+vp.ch+' (whole-number viewport; read as a size)');
  if(!(await openReview(b,tag))){await b.close();return;}
  const graph=await b.page.evaluate(()=>!!document.querySelector('[data-ct="eval-graph"]'));
  const s0=await sample(b,400);const w0=s0[s0.length-1];
  L.say(w0>100&&graph,tag+': TC-R219 PRECONDITION the board is found ('+w0+') and the eval graph is on',{w0,graph});
  let prev=w0,all=[];
  for(let i=0;i<(opts.taps||2);i++){
    const p0=await curPly(b);const pr=sample(b,3000);await b.page.waitForTimeout(30);
    let tapped=true;await b.page.locator('[aria-label="Next move"]:visible').last().click({timeout:5000}).catch(()=>{tapped=false;});
    const s=await pr;const p1=await curPly(b);const u=[...new Set(s)];all.push(...s);
    L.say(tapped&&p1===p0+1,tag+' tap '+(i+1)+': TC-R219 PRECONDITION Next move was tapped and the strip advanced ('+p0+' -> '+p1+')',{tapped,p0,p1});
    L.say(s.length>=40&&u.length===1&&Math.abs(s[0]-prev)<0.5,tag+' tap '+(i+1)+': TC-R219a the board holds one size for 3 s after Next move ('+s.length+' frames, sizes '+u.join('/')+', '+changes(s)+' changes, before '+prev+')',{u,changes:changes(s),head:s.slice(0,30)});
    prev=s[s.length-1];
  }
  if(opts.cap)L.say(Math.min(w0,...all)>=opts.cap-0.5,tag+': TC-R219'+(opts.capId||'b')+' the board is the size the window allows, never trimmed for a sub-pixel reading (min '+Math.min(w0,...all)+', expected >= '+opts.cap+')',{min:Math.min(w0,...all),cap:opts.cap});
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();
}
// (B) sideways Review
async function sideways(geo){
  const tag=geo.w+'x'+geo.h+' sideways';
  const b=await L.launch({geo,name:'mov143-side-'+geo.w,store:{ct_pool:'3',ct_evalgraph:'1'}});await b.open();
  if(!(await openReview(b,tag))){await b.close();return;}
  const side=await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-count"]'));
  L.say(side,tag+': TC-R219 PRECONDITION this is the sideways Review (the counter rev-count sits at the end of the toolbar row)',{side});
  const row=()=>b.page.evaluate(()=>{const r=document.querySelector('[data-ct="rev-row1"]');const c=document.querySelector('[data-ct="rev-count"]');
    const q=(e)=>{if(!e)return null;const x=e.getBoundingClientRect();return {l:Math.round(x.left*100)/100,w:Math.round(x.width*100)/100,t:Math.round(x.top*100)/100};};
    return {btn:r?[...r.querySelectorAll('button')].map(e=>({k:e.getAttribute('aria-label')||e.title||e.textContent,...q(e)})):[],cnt:q(c),txt:c&&c.textContent};});
  await R.goPly(b,9);await b.settle(500);const a=await row();
  await R.goPly(b,10);await b.settle(500);const c=await row();
  L.say(/^9\//.test(a.txt||'')&&/^10\//.test(c.txt||''),tag+': TC-R219 PRECONDITION the counter reads '+a.txt+' then '+c.txt+' (it gains a digit)',{a:a.txt,c:c.txt});
  L.say(a.btn.length>=3&&a.btn.length===c.btn.length,tag+': TC-R219 PRECONDITION the toolbar buttons are found ('+a.btn.length+')',{n:a.btn.length});
  const dmax=Math.max(0,...a.btn.map((x,i)=>c.btn[i]?Math.max(Math.abs(x.l-c.btn[i].l),Math.abs(x.w-c.btn[i].w)):99));
  L.say(a.btn.length>0&&dmax<0.5,tag+': TC-R219c the toolbar buttons keep their place and width when the counter gains a digit (largest move '+dmax+'px)',{a:a.btn,c:c.btn});
  const dc=a.cnt&&c.cnt?Math.max(Math.abs(a.cnt.l-c.cnt.l),Math.abs(a.cnt.w-c.cnt.w)):99;
  L.say(dc<0.5,tag+': TC-R219d the counter itself keeps its box ('+JSON.stringify(a.cnt)+' -> '+JSON.stringify(c.cnt)+')',{a:a.cnt,c:c.cnt});
  const rd=()=>b.page.evaluate(()=>{const g=(k)=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return null;const r=e.getBoundingClientRect();return {t:Math.round(r.top*100)/100,h:Math.round(r.height*100)/100};};
    return {why:g('rev-why'),graph:g('eval-graph'),strip:g('strip-row'),cmp:!!document.querySelector('[data-ct="rev-cmp"]')};});
  const rows=[];for(const n of [0,1,2,3,4,5,6]){await R.goPly(b,n);await b.settle(400);rows.push({n,...(await rd())});}
  const k=(f)=>[...new Set(rows.map(f))];
  const wh=k(r=>r.why&&r.why.h),gt=k(r=>r.graph&&r.graph.t),st=k(r=>r.strip&&r.strip.t);
  L.note(tag+': comparison strip rendered at plies '+rows.filter(r=>r.cmp).map(r=>r.n).join(',')+' of 0..6');
  L.say(rows.every(r=>r.why)&&wh.length===1,tag+': TC-R219e the explanation box keeps one height at plies 0..6 (heights '+wh.join('/')+')',rows.map(r=>[r.n,r.why&&r.why.h]));
  L.say(rows.every(r=>r.strip)&&st.length===1&&(gt.length===1),tag+': TC-R219e and the eval graph and the move strip under it do not move (graph tops '+gt.join('/')+', strip tops '+st.join('/')+')',rows);
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();
}
// (C) MOV-05: the sideways lesson in practice - Flip, Hints and Try again keep their place after the first correct move
const LS=require('../drive/lesson');const P=require('../drive/play');const PZ=require('../drive/puzzles');
async function lessonSide(w,h){const tag=w+'x'+h+' sideways lesson';
  const b=await L.launch({geo:{w,h,safe:'',label:w+'x'+h},name:'mov143-les-'+w});await b.open();let ok=true;
  try{await LS.states['practice-m0'](b);await b.settle(900);}catch(e){ok=false;}
  const rd=()=>b.page.evaluate(()=>{const r=document.querySelector('.ctside');if(!r||getComputedStyle(r).display!=='flex')return null;const o={};
    for(const x of r.querySelectorAll('button')){const k=(x.getAttribute('aria-label')||x.innerText||'').trim();if(/^(Flip board|Hints|↻ Try again|Try again)$/.test(k)){const q=x.getBoundingClientRect();o[k]=Math.round(q.top*10)/10;}}return o;});
  const a=await rd();L.say(ok&&!!a&&Object.keys(a).length>=3,tag+': TC-R219 PRECONDITION practice is up sideways and Flip, Hints and Try again are found by their names ('+JSON.stringify(a)+')',a);
  let moved=true;try{await b.move('e2','e4',1500);await b.settle(900);}catch(e){moved=false;}
  const note=await b.page.evaluate(()=>{const n=document.querySelector('[data-ct="lesson-note"]');return n?(n.innerText||'').trim().slice(0,40):'';});
  L.say(moved&&/correct|✓/.test(note),tag+': TC-R219 PRECONDITION 1.e4 was played and taken as correct ("'+note+'")',note);
  const c=await rd();const d=a&&c?Math.max(0,...Object.keys(a).map(k=>c[k]==null?99:Math.abs(c[k]-a[k]))):99;
  L.say(!!a&&!!c&&d<0.5,tag+': TC-R219g Flip, Hints and Try again keep their place after the first move (largest move '+d+'px; '+JSON.stringify(a)+' -> '+JSON.stringify(c)+')',{a,c});
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();}
// (D) MOV-06: the sideways Play rail - the bottom player bar sits at the rail's foot from move 0, through a Moves toggle and the end of the game
async function playRail(w,h){const tag=w+'x'+h+' sideways Play';
  const b=await L.launch({geo:{w,h,safe:'',label:w+'x'+h},name:'mov143-play-'+w});await b.open();
  const bb=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pbar-bottom"]');const q=e&&e.getBoundingClientRect();return q?Math.round(q.top*10)/10:null;});
  let ok=true;try{await P.states['pp-m0'](b);await b.settle(800);}catch(e){ok=false;}
  const side=await b.page.evaluate(()=>{const r=document.querySelector('.ctside');return !!r&&getComputedStyle(r).display==='flex';});
  const t0=await bb();L.say(ok&&side&&t0!=null,tag+': TC-R219 PRECONDITION Pass and Play is up sideways, the bottom player bar found (top '+t0+')',{side,t0});
  const seq=[['move 0',t0]];
  try{await b.move('e2','e4',900);await b.settle(800);seq.push(['after 1.e4',await bb()]);
    await P.tapBtn(b,/^Moves$/,600);seq.push(['Moves closed',await bb()]);await P.tapBtn(b,/^Moves$/,600);seq.push(['Moves open',await bb()]);}catch(e){L.note(tag+': '+String(e).slice(0,120));}
  try{await P.states['pp-mate'](b);await b.settle(4500);seq.push(['checkmate',await bb()]);}catch(e){L.note(tag+' mate: '+String(e).slice(0,120));}
  L.say(seq.length===5&&seq.every(x=>x[1]!=null&&Math.abs(x[1]-t0)<0.5),tag+': TC-R219h the bottom player bar holds its place from move 0, after the first move, through a Moves toggle and at checkmate ('+seq.map(x=>x[0]+' '+x[1]).join(', ')+')',seq);
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();}
// (E) MOV-07: sideways Puzzles - Hint does not grow the top panel
// (F) lesson-practice-small-defects (4) [#550 lead]: on a wide desktop window the sideways Puzzles panels fill their side column (at 1920 and 2560 wide
// both stopped at 440 of the 520 column, an 80px empty band before the rail). Read: pz-top and pz-bottom against their own parent column.
async function pzWide(w,h){const tag=w+'x'+h+' sideways Puzzles';
  const b=await L.launch({geo:{w,h,safe:'',label:w+'x'+h},name:'mov143-pzw-'+w});await b.open();let ok=true;
  try{await PZ.startTraining(b);await b.settle(900);}catch(e){ok=false;}
  const r=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]'),bt=document.querySelector('[data-ct="pz-bottom"]');if(!t||!bt)return null;
    const c=t.parentElement.getBoundingClientRect(),q=t.getBoundingClientRect(),z=bt.getBoundingClientRect();const f=x=>Math.round(x*10)/10;
    return {col:[f(c.left),f(c.right)],top:[f(q.left),f(q.right)],bot:[f(z.left),f(z.right)]};});
  L.say(ok&&!!r&&r.col[1]-r.col[0]>=440,tag+': TC-R219j PRECONDITION a puzzle is up sideways in a side column at least 440 wide ('+JSON.stringify(r)+')',r);
  L.say(!!r&&Math.abs(r.top[0]-r.col[0])<=1&&Math.abs(r.top[1]-r.col[1])<=1&&Math.abs(r.bot[0]-r.col[0])<=1&&Math.abs(r.bot[1]-r.col[1])<=1,
    tag+': TC-R219j the top and bottom panels fill the side column, no empty band before the rail (column '+(r&&r.col)+', top '+(r&&r.top)+', bottom '+(r&&r.bot)+')',r);
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();}
async function pzSide(w,h){const tag=w+'x'+h+' sideways Puzzles';
  const b=await L.launch({geo:{w,h,safe:'',label:w+'x'+h},name:'mov143-pz-'+w});await b.open();let ok=true;
  try{await PZ.startTraining(b);await b.settle(900);}catch(e){ok=false;}
  const rd=()=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');const q=t&&t.getBoundingClientRect();const hint=[...document.querySelectorAll('span')].some(s=>/^💡/.test((s.innerText||'').trim())&&s.getBoundingClientRect().width>0);return q?{h:Math.round(q.height*10)/10,top:Math.round(q.top),hint}:null;});
  const a=await rd();L.say(ok&&!!a&&!a.hint,tag+': TC-R219 PRECONDITION a puzzle is up sideways, no hint showing ('+JSON.stringify(a)+')',a);
  try{await PZ.tapBtn(b,/Hint$/,700);}catch(e){}const c=await rd();
  L.say(!!c&&c.hint,tag+': TC-R219 PRECONDITION Hint was tapped and the hint shows',c);
  L.say(!!a&&!!c&&Math.abs(c.h-a.h)<0.5&&c.top===a.top,tag+': TC-R219i the top panel keeps its height when the hint appears ('+(a&&a.h)+' -> '+(c&&c.h)+')',{a,c});
  L.say(b.errs.length===0,tag+': TC-R219 zero app errors',b.errs.slice(0,3));await b.close();}
L.run(async()=>{
  await scaled(1063,1267,1.5,{frac:true,cap:820});
  await scaled(1025,1261,1.5,{frac:true,cap:820});
  await scaled(1230,1510,1.25,{frac:true,cap:820});
  await scaled(1230,1511,1.25,{frac:true,cap:820});
  await scaled(1230,1512,1.25,{frac:false,cap:820});
  await scaled(960,971,1.5,{frac:true,cap:664,capId:'f',taps:1});   // MOV-02: 667.03 is what the window allows (666 at 960x970); the defect left 651.03
  await sideways({w:1440,h:780,safe:'',label:'1440x780'});
  await sideways({w:761,h:375,safe:'',label:'761x375'});
  for(const [w,h] of [[1440,780],[1920,970]])await lessonSide(w,h);
  for(const [w,h] of [[761,375],[1440,780]])await playRail(w,h);
  await pzSide(761,375);
  for(const [w,h] of [[1920,1080],[2560,1440]])await pzWide(w,h);
},'143-no-movement');
// SELECTOR-OPENED: rev-count reading=precondition round 4: the sideways PRECONDITION requires it
