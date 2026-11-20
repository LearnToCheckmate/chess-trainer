'use strict';
// gates/audit/question-shots.js - THE PICTURES FOR A DECISION-DESK QUESTION: one render per call and per option, each with a RED BOX round the
// thing the call is about, and every mock-up labelled in the image itself. Kunal, 20 Nov 2026: "Anything you put on the decision desk should
// really have mock-ups and highlights so I can follow along ... I might have picked a different answer if I had a mock-up."
//
// A render is a real app at a real phone size (dpr 2) with, drawn IN THE PAGE just before the screenshot:
//   - a 3px #ff2a2a box from getBoundingClientRect round each element the call is about (mark()), and
//   - for an option that is only a LOOK, a MOCK-UP made on the BUILT bundle by editing the DOM or injecting CSS (the `mock` string), with a
//     caption bar burned in at the top: "MOCK-UP - option (N): <words>", so it can never be taken for the built app.
// Names: claude/agents/shots/b13-q<NN>-c<call>-<today|built|opt-<short>>-<W>x<H>.png (the index is b13-questions-pictures.md).
//
// USAGE: CT_TODAY=<bundle of main> CT_BUILT=<bundle of the tree> [CT_Q=q27,q28,q32,q33] [CT_OUT_DIR=<dir>] node gates/audit/question-shots.js
// Both bundles are trial builds (CT_OUT=<outside the repo>/app.js bash gates/build.sh '#NNN'); this script never builds and never touches app.js.
const path=require('path');
const L=require('../lib');
const R=require('../drive/review');
const P=require('../drive/play');
const OUT=process.env.CT_OUT_DIR||path.join(__dirname,'..','..','claude','agents','shots');
const TODAY=process.env.CT_TODAY,BUILT=process.env.CT_BUILT;
const ONLY=(process.env.CT_Q||'q27,q28,q32,q33').split(',');
if(!TODAY||!BUILT){console.error('set CT_TODAY and CT_BUILT to trial bundles');process.exit(2);}
const SIZE={kunal761:'375x761',se:'320x568'};
const made=[];

// ── the page-side drawing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// A finder is {sel} (a CSS selector, the first painted match), {text,tag} (the smallest painted element of that tag list whose text matches),
// {fn} (a JS expression for a function returning an element), or {rect:[l,t,w,h]}; pad grows the box. Several finders may be given.
const PAGE=`(function(args){
  const painted=(e)=>{const q=e.getBoundingClientRect();return q.width>1&&q.height>1;};
  const find=(f)=>{
    if(f.rect)return {left:f.rect[0],top:f.rect[1],width:f.rect[2],height:f.rect[3]};
    let e=null;
    if(f.sel)e=[...document.querySelectorAll(f.sel)].find(painted)||null;
    else if(f.text){const re=new RegExp(f.text,f.flags||'');let best=null,ba=1e12;
      for(const x of document.querySelectorAll(f.tag||'button,div,span,input,label,a')){if(!painted(x))continue;const t=((x.innerText||x.value||x.placeholder||x.getAttribute('aria-label')||'')+'').replace(/\\s+/g,' ').trim();
        if(!re.test(t))continue;const q=x.getBoundingClientRect();const a=q.width*q.height;if(a<ba){ba=a;best=x;}}e=best;}
    else if(f.fn)e=(new Function('return ('+f.fn+')'))()();
    if(!e)return null;const q=e.getBoundingClientRect();return {left:q.left,top:q.top,width:q.width,height:q.height};};
  const out=[];
  for(const f of args.marks||[]){const q=find(f);if(!q||q.width<1||q.height<1){out.push('MISSING '+JSON.stringify(f));continue;}
    const p=f.pad==null?3:f.pad;const d=document.createElement('div');d.setAttribute('data-qshot','box');
    d.style.cssText='position:fixed;pointer-events:none;box-sizing:border-box;border:3px solid #ff2a2a;border-radius:4px;z-index:2147483646;'+
      'left:'+(q.left-p)+'px;top:'+(q.top-p)+'px;width:'+(q.width+2*p)+'px;height:'+(q.height+2*p)+'px;';document.body.appendChild(d);out.push('ok');}
  if(args.caption){const c=document.createElement('div');c.setAttribute('data-qshot','caption');
    c.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;pointer-events:none;background:#ffd400;color:#000;font:700 11px/13px system-ui,sans-serif;padding:3px 6px;text-align:center;border-bottom:2px solid #000;';
    c.textContent=args.caption;document.body.appendChild(c);}
  return out;})`;

async function snap(b,name,o){
  o=o||{};
  if(o.mock)await b.page.evaluate(o.mock);
  await b.page.waitForTimeout(o.mockWait==null?250:o.mockWait);
  const res=await b.page.evaluate(PAGE+'('+JSON.stringify({marks:o.marks||[],caption:o.caption||''})+')');
  const bad=res.filter(x=>x!=='ok');
  const f=path.join(OUT,name+'.png');require('fs').mkdirSync(OUT,{recursive:true});
  await b.page.screenshot({path:f});
  await b.page.evaluate(()=>document.querySelectorAll('[data-qshot]').forEach(e=>e.remove()));
  made.push(name+'.png');
  console.log((bad.length?'WARN ':'ok   ')+name+(bad.length?'  '+bad.join('; '):''));
  return !bad.length;
}
const cap=(n,w)=>'MOCK-UP - option ('+n+'): '+w;
const wait=(b,ms)=>b.settle(ms||600);
const launch=(app,geo,name,store,extra)=>L.launch(Object.assign({geo,app,name:'qs-'+name,dpr:2,dev:false,store:store||{ct_pool:'3',ct_bril_reset_v1:'1'}},extra||{}));

// ── stores ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DAY=86400000,D0=1763000000000;
const SHORT='[White "Jsmiller1112"]\n[Black "Shorty"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *';
const GAMES=[];for(let i=0;i<10;i++)GAMES.push({src:'cc',acct:'jsmiller1112',white:'Jsmiller1112',black:i===0?'Shorty':'Opp'+i,wr:i%2?'win':'resigned',tc:'blitz',date:D0-i*DAY,pgn:i===0?SHORT:R.PGN_OPERA});
const MK=[{fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}}];
const LIST_STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':GAMES},ct_mymistakes:MK,ct_pool:'3',ct_bril_reset_v1:'1'};
const NEW_STORE={ct_bril_reset_v1:'1',ct_pool:'3'};
const GAMES40=[];for(let i=0;i<40;i++)GAMES40.push({src:'cc',acct:'jsmiller1112',pgn:R.PGN_OPERA,white:'Jsmiller1112',black:'Opponent'+i,wr:(i%3?'win':'checkmated'),tc:'blitz',date:Date.now()-(i+1)*DAY});
const GAMES_STORE={ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':GAMES40},ct_pool:'3',ct_bril_reset_v1:'1'};

const SCEN={};
// SCENARIOS

// ── q33: the move list on 320x568 in Play against the computer, and the menu label ───────────────────────────────────────────────────────
SCEN.q33=async()=>{
  const N='b13-q33-';
  // call 1: today's column (the list under the board), the built sheet (closed, behind Moves), option 2 (open by default - the built sheet, opened)
  {const b=await launch(TODAY,'se','q33t');await b.open();await P.states['cpu-4ply'](b);await wait(b,900);
   await snap(b,N+'c1-today-320x568',{marks:[{sel:'[data-ct="moves-panel"]'}]});await b.close();}
  {const b=await launch(BUILT,'se','q33b');await b.open();await P.states['cpu-4ply'](b);await wait(b,900);
   await snap(b,N+'c1-built-320x568',{marks:[{text:'^Moves$',tag:'button'}]});
   await P.tapBtn(b,/^Moves$/,700);
   await snap(b,N+'c1-opt-open-320x568',{caption:cap('2','the move list starts open, over the foot of the board'),marks:[{sel:'[data-ct="moves-panel"]'}]});await b.close();}
  // the tall phone, unchanged, for context
  {const b=await launch(BUILT,'kunal761','q33b2');await b.open();await P.states['cpu-4ply'](b);await wait(b,900);
   await snap(b,N+'c1-built-375x761',{marks:[{sel:'[data-ct="moves-panel"]'}]});await b.close();}
  // call 2: the menu label. It lives in the review screen's three-dots sheet.
  for(const [tag,app] of [['today',TODAY],['built',BUILT]]){
   const b=await launch(app,'kunal761','q33m'+tag);await b.open();await R.states['more-sheet'](b);await wait(b,700);
   const m={marks:[{text:'^Eval bar: ',tag:'button,div,span'}]};
   await snap(b,N+'c2-'+tag+'-375x761',m);
   if(tag==='built'){
     const relabel=(t)=>`(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(/^Eval bar: /.test(n.nodeValue.trim())){n.nodeValue=${JSON.stringify(t)};}}})()`;
     await snap(b,N+'c2-opt-keep-375x761',{caption:cap('label: keep',"keep the label as it was: 'Eval bar: above on tall screens'"),mock:relabel('Eval bar: above on tall screens'),marks:m.marks});
     await snap(b,N+'c2-opt-reword-375x761',{caption:cap('label: reword',"the label reworded to 'Eval bar: above the board'"),mock:relabel('Eval bar: above the board'),marks:m.marks});}
   await b.close();}
  // the other place the bar's setting is worded: the menu's Evaluation bar row (Above / Left / Off), in Play on the small phone
  for(const [tag,app] of [['today',TODAY],['built',BUILT]]){
   const b=await launch(app,'se','q33n'+tag);await b.open();await P.states['cpu-4ply'](b);await wait(b,700);
   await P.tapBtn(b,/^Menu/,600).catch(()=>{});
   await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-evalbar"]');if(e)e.scrollIntoView({block:'center'});});await wait(b,500);
   await snap(b,N+'c2-menu-'+tag+'-320x568',{marks:[{sel:'[data-ct="menu-evalbar"]'}]});await b.close();}
};

// ── q27: the Brilliant tile, the Famous tile's place with games listed, the followed shelf ────────────────────────────────────────────
// the cards are built the way gate 181 builds them (the shipped functions, through gates/engine-extract.js)
let _E=null;const E_=()=>_E||(_E=require('../engine-extract.js'));
const T_=()=>require('../brilliant-fixed-tests.json').tests;
const mvOf=(pos,san)=>E_().getLegal(pos).find(x=>E_().cleanSAN(E_().toSAN(pos,x,E_().applyMove(pos.board,x)))===E_().cleanSAN(san));
const uciOf=(m)=>E_().rc2sq(m.fr,m.fc)+E_().rc2sq(m.tr,m.tc)+(m.promo||'');
const ownCard=(id,missed)=>{const t=T_().find(x=>x.id===id);const pos=E_().fromFEN(t.fen);const m=mvOf(pos,t.san);return Object.assign({fen:t.fen,uci:uciOf(m),label:'Brilliant',ts:1791000000000,last:null,why:'You give up a piece here, and it holds.',no:17},missed?{missed:true}:{});};
const folCard=(id,acct)=>{const t=T_().find(x=>x.id===id);const pos=E_().fromFEN(t.fen);const m=mvOf(pos,t.san);
  const row={cls:{label:'Brilliant'},gate:E_().brilliantGate(pos,m,0,0.5,0.5,null),motifs:E_().moveMotifs(pos,m),evalAfter:pos.turn==='w'?2.4:-2.4,forkT:E_().forkTargets(pos,m)};
  const c=E_().followBrilCards([row],[pos],[{move:m}],pos.turn,acct,0)[0];delete c._i;c.no=17;return c;};
const TILE={text:'(Famous|Your) brilliant moves',tag:'button'};
SCEN.q27=async()=>{
  const N='b13-q27-';
  const MISSED_STORE=Object.assign({},NEW_STORE,{ct_mybrilliancies:[ownCard('FT01',true)]});
  // call 1: who sees "Your brilliant moves". Today a new player sees no tile; built shows Famous until a card is in the store (a missed one counts).
  {const b=await launch(TODAY,'kunal761','q27c1t',NEW_STORE);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1200);
   await snap(b,N+'c1-today-375x761',{marks:[{rect:[12,245,351,130]}]});await b.close();}
  {const b=await launch(BUILT,'kunal761','q27c1n',NEW_STORE);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1200);
   await snap(b,N+'c1-built-new-player-375x761',{marks:[TILE]});await b.close();}
  {const b=await launch(BUILT,'kunal761','q27c1m',MISSED_STORE);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1200);
   await snap(b,N+'c1-built-375x761',{marks:[TILE]});
   await snap(b,N+'c1-opt-famous-375x761',{caption:cap(1,"'Famous' until he has played a Brilliant himself (a missed one does not count)"),
     mock:`(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(/^Your brilliant moves$/.test(n.nodeValue.trim()))n.nodeValue='Famous brilliant moves';}})()`,marks:[TILE]});await b.close();}
  // call 2: where the Famous tile sits with his games listed
  for(const geo of ['kunal761','se']){const sz=SIZE[geo];
   {const b=await launch(TODAY,geo,'q27c2t'+geo,Object.assign({},LIST_STORE,{ct_mybrilliancies:[ownCard('FT01',false)]}));await b.open();await b.tile('Review').catch(()=>{});await wait(b,1500);
    await snap(b,N+'c2-today-'+sz,{marks:[TILE]});await b.close();}
   const b=await launch(BUILT,geo,'q27c2b'+geo,LIST_STORE);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1500);
   await snap(b,N+'c2-built-'+sz,{marks:[TILE]});
   // option: the usual place - the tile as the first row of the games box, two lines, the page scrolling
   await snap(b,N+'c2-opt-usual-place-'+sz,{caption:cap('2, usual place','the tile in the games box as its first row; the page scrolls to reach the rest'),
     mock:`(()=>{const t=[...document.querySelectorAll('button')].find(x=>/(Famous|Your) brilliant moves/.test((x.innerText||'').trim()));const box=document.querySelector('[data-ct="glist-box"]');if(!t||!box)return;
       t.setAttribute('data-qmoved','1');t.style.width='100%';t.style.flex='none';t.style.minHeight='64px';t.style.marginBottom='6px';
       const sub=document.createElement('div');sub.style.cssText='font-size:13px;opacity:.65;font-weight:500';sub.textContent='3 from famous games \\u00b7 can you find them?';const ti=[...t.querySelectorAll('span')].find(x=>/brilliant moves/.test(x.textContent)&&x.children.length===0);(ti&&ti.parentElement||t).appendChild(sub);
       box.insertBefore(t,box.firstChild);document.getElementById('root').style.overflowY='auto';})()`,
     marks:[{sel:'[data-qmoved="1"]'}]});
   if(geo==='se'){await b.close();
    const c=await launch(BUILT,geo,'q27c2h',LIST_STORE);await c.open();await c.tile('Review').catch(()=>{});await wait(c,1500);
    const r=await c.page.evaluate(()=>{const t=[...document.querySelectorAll('button')].find(x=>/(Famous|Your) brilliant moves/.test((x.innerText||'').trim()));const q=t.getBoundingClientRect();return [q.left,q.top,q.width,q.height];});
    await snap(c,N+'c2-opt-hidden-'+sz,{caption:cap('2, hidden','the Famous tile hidden on phones under 700 tall; the box shows where it was'),
      mock:`(()=>{const t=[...document.querySelectorAll('button')].find(x=>/(Famous|Your) brilliant moves/.test((x.innerText||'').trim()));if(t)t.style.visibility='hidden';})()`,marks:[{rect:r}]});await c.close();}
   else await b.close();}
  // call 3: the followed shelf, filled only from games he opens
  const FOL=[folCard('FT01','cc:peterpatzer'),folCard('FT02','cc:peterpatzer')];
  const FST=Object.assign({},NEW_STORE,{ct_accts:['cc:peterpatzer'],ct_acctmine:{'cc:peterpatzer':false},ct_followbril:FOL});
  {const b=await launch(TODAY,'kunal761','q27c3t',Object.assign({},FST,{ct_mybrilliancies:T_().slice(0,8).map(t=>{try{return ownCard(t.id,false);}catch(e){return null;}}).filter(Boolean)}));await b.open();await b.tile('Review').catch(()=>{});await wait(b,1200);
   await b.page.locator('button',{hasText:/brilliant moves/}).first().click({timeout:4000}).catch(()=>{});await wait(b,900);
   await snap(b,N+'c3-today-375x761',{marks:[{text:'^You played them',flags:'i',tag:'div,span,h1,h2,h3,b'}]});await b.close();}
  {const b=await launch(BUILT,'kunal761','q27c3b',FST);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1200);
   await b.page.locator('button',{hasText:/brilliant moves/}).first().click({timeout:4000}).catch(()=>{});await wait(b,900);
   await snap(b,N+'c3-built-375x761',{marks:[{text:'^From peterpatzer',flags:'i',tag:'div,span,h1,h2,h3,b'}]});await b.close();}
};

// ── q32: the Review list's final layout (Q25 B) ──────────────────────────────────────────────────────────────────────────────────────────
const toList32=async(app,geo,name,extra)=>{const b=await launch(app,geo,name,LIST_STORE,extra);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1500);return b;};
const afterReview=async(b)=>{   // a game is reviewed and left by Back to games: the list now has "an analysis to go back to"
  await b.page.locator('[data-ct="game-row"]').nth(0).scrollIntoViewIfNeeded();await b.page.locator('[data-ct="game-opp"]').nth(0).click();
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await wait(b,1000);
  await b.tapText(/^‹ Back to games$/,{wait:1200});await wait(b,800);};
const BACKBTN={sel:'button[aria-label="Back to your analysis"]'};
SCEN.q32=async()=>{
  const N='b13-q32-';
  // call 1: the back icon
  {const b=await toList32(TODAY,'kunal761','q32c1t');let ok=true;try{await afterReview(b);}catch(e){ok=false;console.log('today after-review failed',String(e).slice(0,100));}
   await snap(b,N+'c1-today-375x761',{marks:[{text:'Back to your analysis',tag:'button,div,span,a'}]});await b.close();}
  {const b=await toList32(BUILT,'kunal761','q32c1b');
   // no analysis yet: no icon (built); the box marks the empty corner where it would be
   await snap(b,N+'c1-built-no-analysis-375x761',{marks:[{rect:[12,0,44,48]}]});
   await snap(b,N+'c1-opt-always-375x761',{caption:cap(2,'the back icon always shown, even with no analysis to go back to'),
     mock:`(()=>{const d=document.createElement('div');d.setAttribute('data-qmock','1');d.style.cssText='position:fixed;left:12px;top:4px;width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font:700 26px system-ui;z-index:5000;pointer-events:none';d.textContent='\\u2039';document.body.appendChild(d);})()`,marks:[{rect:[12,4,44,44]}]});
   let ok=true;try{await afterReview(b);}catch(e){ok=false;console.log('built after-review failed',String(e).slice(0,100));}
   await snap(b,N+'c1-built-375x761',{marks:[BACKBTN]});
   const r=await b.page.evaluate(()=>{const e=document.querySelector('button[aria-label="Back to your analysis"]');if(!e)return null;const q=e.getBoundingClientRect();return [q.left,q.top,q.width,q.height];});
   await snap(b,N+'c1-opt-never-375x761',{caption:cap(3,'no back icon at all: the way back to the analysis is only the review tab'),
     mock:`(()=>{const e=document.querySelector('button[aria-label="Back to your analysis"]');if(e)e.style.visibility='hidden';})()`,marks:r?[{rect:r}]:[]});await b.close();}
  // call 2: the practice cards under 360 wide
  {const b=await launch(TODAY,'se','q32c2t',Object.assign({},LIST_STORE,{ct_mybrilliancies:[ownCard('FT01',false)]}));await b.open();await b.tile('Review').catch(()=>{});await wait(b,1500);await snap(b,N+'c2-today-320x568',{marks:[{text:'Practice your mistakes',tag:'button'},{text:'brilliant moves',tag:'button'}]});await b.close();}
  {const b=await toList32(BUILT,'se','q32c2b');const M=[{text:'Practice your mistakes',tag:'button'},{text:'brilliant moves',tag:'button'}];
   await snap(b,N+'c2-built-320x568',{marks:M});
   await snap(b,N+'c2-opt-stacked-320x568',{caption:cap(2,'the two practice cards stacked, one under the other, on small phones'),
     mock:`(()=>{const a=[...document.querySelectorAll('button')].find(x=>/Practice your mistakes/.test(x.innerText||''));const p=a&&a.parentElement;if(p){p.style.flexDirection='column';p.style.display='flex';p.style.gridTemplateColumns='1fr';[...p.children].forEach(c=>{c.style.width='100%';c.style.flex='none'});}})()`,marks:M});
await b.close();}
  {const b=await toList32(BUILT,'se','q32c2s');
   await snap(b,N+'c2-opt-shorter-names-320x568',{caption:cap(2,'icon squares kept, the names shortened to fit on two lines'),
     mock:`(()=>{const sq=(c,e)=>{const s=document.createElement('span');s.textContent=e;s.style.cssText='flex-shrink:0;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;background:'+c;return s;};
       for(const [re,nm,col,em] of [[/Practice your mistakes/,'Mistakes','linear-gradient(150deg,#f59e0b,#b45309)','\\ud83c\\udfaf'],[/brilliant moves/,'Brilliants','linear-gradient(150deg,#22d3ee,#0e7490)','\\u2728']]){
         const b=[...document.querySelectorAll('button')].find(x=>re.test(x.innerText||''));if(!b)continue;const t=[...b.querySelectorAll('span,div')].find(x=>x.children.length===0&&re.test(x.textContent));if(t)t.textContent=nm;b.style.gap='8px';b.insertBefore(sq(col,em),b.firstChild);}})()`,marks:[{fn:'()=>[...document.querySelectorAll("button")].find(x=>/Brilliants/.test(x.innerText||"")).parentElement'}]});await b.close();}
  // call 3: Fetch and Analyze
  {const b=await toList32(TODAY,'kunal761','q32c3t');await snap(b,N+'c3-today-375x761',{marks:[{text:'^Fetch$',tag:'button'},{text:'Analyze game',tag:'button'}]});await b.close();}
  {const b=await toList32(BUILT,'kunal761','q32c3b');const F={sel:'button[aria-label*="etch"],button[title*="etch"]'};
   await snap(b,N+'c3-built-375x761',{marks:[F]});
   await snap(b,N+'c3-opt-inbox-375x761',{caption:cap(3,'the inbox emoji from the old heading in place of the download arrow'),
     mock:`(()=>{const e=document.querySelector('button[aria-label*="etch"],button[title*="etch"]');if(!e)return;e.innerHTML='<span style="font-size:24px;line-height:1">\\ud83d\\udce5</span>';})()`,marks:[F]});await b.close();}
  // call 4: the Filter chips on the small phone
  {const b=await toList32(TODAY,'se','q32c4t');await b.page.locator('[data-ct="gf-toggle"]').first().click({timeout:3000}).catch(()=>{});await wait(b,800);
   await snap(b,N+'c4-today-320x568',{marks:[{sel:'[data-ct="gf-bril"]'}]});await b.close();}
  {const b=await toList32(BUILT,'se','q32c4b');await b.page.locator('[data-ct="gf-toggle"]').first().click({timeout:3000}).catch(()=>{});await wait(b,800);
   await snap(b,N+'c4-built-320x568',{marks:[{sel:'[data-ct="glist-filters"]'}]});
   await snap(b,N+'c4-opt-above-320x568',{caption:cap(4,'the chips above the search line; the page now scrolls to reach the games'),
     mock:`(()=>{const f=document.querySelector('[data-ct="glist-filters"]');const line=document.querySelector('[data-ct="glist-line"]');if(!f||!line)return;f.setAttribute('data-qmoved','1');f.style.marginBottom='6px';line.parentElement.insertBefore(f,line);document.getElementById('root').style.overflowY='auto';})()`,
     marks:[{sel:'[data-qmoved="1"]'}]});await b.close();}
  // call 5: the search placeholder
  for(const geo of ['se','kunal761']){const sz=SIZE[geo];const I={fn:'()=>[...document.querySelectorAll("input")].find(x=>/player name|Search players|Filter by/i.test((x.placeholder||"")+(x.getAttribute("aria-label")||"")))||document.querySelector("[data-ct=gf-toggle]")'};
   {const b=await toList32(TODAY,geo,'q32c5t'+geo);await snap(b,N+'c5-today-'+sz,{marks:[I]});await b.close();}
   const b=await toList32(BUILT,geo,'q32c5b'+geo);await snap(b,N+'c5-built-'+sz,{marks:[I]});
   await snap(b,N+'c5-opt-search-players-'+sz,{caption:cap(5,"the placeholder reads 'Search players'"),mock:`(()=>{const i=[...document.querySelectorAll('input')].find(x=>/player name/i.test((x.placeholder||'')+(x.getAttribute('aria-label')||'')));if(i)i.placeholder='Search players';})()`,marks:[I]});await b.close();}
};

// ── q28: Coach mode's engine card over the board ─────────────────────────────────────────────────────────────────────────────────────────
const ENGWORDS='(^| )Engine: |Engine is looking|Engine not loaded';
const coachEngine=async(app,geo,name)=>{   // a coach game against Pip, four plies played, then the engine's view asked for from More (gate 170's route)
  const b=await launch(app,geo,name,{ct_pool:'3'});await b.open();
  await P.states['setup'](b);await wait(b,300);
  const sw=b.page.locator('[data-ct="setup-coach"]');if(await sw.count()){await sw.first().scrollIntoViewIfNeeded().catch(()=>{});await sw.first().click({timeout:3000}).catch(()=>{});await wait(b,300);}
  await P.pickBot(b,'Pip');await P.tapStart(b,900);await P.ensureMovesShown(b).catch(()=>{});
  await b.move('e2','e4',0);await P.waitPlies(b,2);await wait(b,500);await b.move('g1','f3',0);await P.waitPlies(b,4);await wait(b,700);
  await P.tapBtn(b,/^More$/,450);
  const e=b.page.locator('[data-ct="more-coach-engine"]');let got=false;
  if(await e.count()){await e.first().scrollIntoViewIfNeeded().catch(()=>{});await e.first().click({timeout:3000}).catch(()=>{});
    for(let i=0;i<60&&!got;i++){await b.settle(250);got=await b.page.evaluate((w)=>{const re=new RegExp(w);return [...document.querySelectorAll('body *')].some(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1&&re.test((x.innerText||'').trim())&&x.children.length===0;});},ENGWORDS);}}
  await wait(b,500);return {b,got};};
const CARD={fn:`()=>{const re=new RegExp('${ENGWORDS}');const c=[...document.querySelectorAll('body *')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1&&x.children.length===0&&re.test((x.innerText||'').trim());})[0];if(!c)return null;let a=c;while(a&&a!==document.body&&!/absolute|fixed/.test(getComputedStyle(a).position))a=a.parentElement;return (a&&a!==document.body)?a:c;}`,pad:2};
SCEN.q28=async()=>{
  const N='b13-q28-';
  for(const geo of ['kunal761','se']){const sz=SIZE[geo];
   // today (main) has no Coach mode at all, so there is no engine card to show: a game against the computer, the box marking the top two ranks where the built card sits
   {const b=await launch(TODAY,geo,'q28t'+geo);await b.open();await P.states['cpu-4ply'](b);await wait(b,900);const bd=await b.board();
    await snap(b,N+'c1-today-'+sz,{marks:[{rect:[bd.x,bd.y,bd.w,2*bd.sq]}]});await b.close();}
   const {b,got}=await coachEngine(BUILT,geo,'q28b'+geo);if(!got)console.log('built: no engine card words found at '+geo);
   await snap(b,N+'c1-built-'+sz,{marks:[CARD]});
   await snap(b,N+'c1-opt-bottom-'+sz,{caption:cap(1,'the engine card at the bottom of the board, covering the player’s own back ranks instead'),
     mock:`(()=>{const re=new RegExp('${ENGWORDS}');const c=[...document.querySelectorAll('body *')].filter(x=>{const q=x.getBoundingClientRect();return q.width>1&&q.height>1&&x.children.length===0&&re.test((x.innerText||'').trim());})[0];if(!c)return;let a=c;while(a&&a!==document.body&&!/absolute|fixed/.test(getComputedStyle(a).position))a=a.parentElement;if(!a||a===document.body)return;
       a.setAttribute('data-qmoved','1');a.style.top='auto';a.style.bottom='6px';})()`,marks:[{sel:'[data-qmoved="1"]',pad:2}]});
   await b.close();}
};

// ── q34: the game card's unknown move count (en dash, hyphen, question mark, blank) ──────────────────────────────────────────────────────
SCEN.q34=async()=>{
  const N='b13-q34-';
  const gk=g=>g.src+':'+g.date+':'+g.white+':'+g.black;
  const st=Object.assign({},LIST_STORE,{ct_gamestats:{[gk(GAMES[1])]:{bril:0,great:4,inacc:0,mist:1,blun:2,src:'review'}}});   // no best/great split: those two counts are unknown
  const U=(i)=>({fn:'()=>document.querySelectorAll(\'[data-known="0"]\')['+i+']'});
  const unk=`(f)=>{document.querySelectorAll('[data-known="0"]').forEach(e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){n.nodeValue=n.nodeValue.replace(/[-\\u2013]/,f);}});}`;
  for(const [tag,app] of [['today',TODAY],['built',BUILT]]){
   const b=await launch(app,'kunal761','q34'+tag,st);await b.open();await b.tile('Review').catch(()=>{});await wait(b,1500);
   await b.page.evaluate(()=>{const e=document.querySelector('[data-known="0"]');if(e)e.scrollIntoView({block:'center'});});await wait(b,400);
   await snap(b,N+'c1-'+tag+'-375x761',{marks:[U(0),U(1)]});
   if(tag==='built'){
     await snap(b,N+'c1-opt-question-mark-375x761',{caption:cap('?','an unknown count shown as a question mark'),mock:'('+unk+')("?")',marks:[U(0),U(1)]});
     await snap(b,N+'c1-opt-blank-375x761',{caption:cap('blank','an unknown count left empty'),mock:'('+unk+')("")',marks:[U(0),U(1)]});}
   await b.close();}
};
// END SCENARIOS
L.run(async()=>{for(const q of ONLY){if(!SCEN[q]){console.log('no scenario '+q);continue;}console.log('== '+q);await SCEN[q]();}console.log('made '+made.length+' pictures');L.say(true,'made '+made.length+' pictures');},'question-shots');
