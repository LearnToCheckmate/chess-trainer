'use strict';
// gates/regress/139-one-top-row-standard.js - ONE TOP ROW, ONE TITLE, ONE BUTTON HEIGHT, ONE BOARD TOP. US-R147 / TC-R215a..h.
//
// WHY [#550, docs/formatting-audit-2026-11-12, P1 findings FMT-A-01, A-02, A-03, A-05, A-06, B-01, B-02, B-03; Kunal 12 Nov, "All in this
// batch, top first", and on the titles "I prefer it being center aligned on the screen titles"; run-answers a42, his board rule]: the
// screen title changed place, size and typeface screen to screen; back and menu came in four sizes and three distances from the edge, none
// 44x44 on most screens; Tactics' buttons were 38 and 36 high where every other board screen uses 44; the lesson's close X moved between
// demo and practice and practice showed two ⋯; the Tactics board jumped 78.5px between its two tabs; and the online game shrank its board
// to 192 at game over and scrolled the page.
// WHAT IT READS: the bundle under test (CT_APP), at kunal761, 375x667, 320x568 and sideways 761x375. Every element is found by WHAT IT IS
// (its accessible name, its glyph or its words), never by a data-ct this build added (CLAUDE.md, #432: a check that reads only what the fix
// added cannot see the defect the fix removes). The corners are the top-left back (aria-label Back/Home/Back to games, or the words
// '‹ Home') and the top-right menu (aria-label 'Menu and settings', or Review's '⋯' More); the title is the screen's own words.
// THE STANDARD (chess.jsx TOP_EDGE, TOP_BTN, TOP_TITLE): corners >= 44x44 at 8 from their edge (+-1); title centre within 2 of the screen
// centre, 18px weight 800, one font family on every screen; Tactics/Strategy action buttons 44 high; the Tactics and Strategy boards at one
// top; the Tactics answer opens over the board, which neither moves nor shrinks; the lesson X is the bar's first button and ⋯ its last, in
// demo and practice, with one ⋯ on screen; on a short phone the lesson's row under the board folds into the bar (Now I'll try it is a bar
// button, Other lines in the ⋯ sheet) and the board is the screen width at 320x568; the online game over keeps the board 375 on his phone
// with no page scroll (gate 100's stand-in cloud, a finished game).
// KNOW ITS LIMIT: on a short phone (375x667, 320x568) the Review board has no header row - back and ⋯ live in its top player bar, which
// sits at the board's edge, and the title is not shown (#351, Kunal: 'relocate them') - so there only the 44x44 size is asserted.
// THE REST OF THE AUDIT (TC-R215i..r, the same build, formatting audit FMT-A-02/A-04/A-06..A-14, B-04..B-08, Kunal's pick 12 Nov): Puzzle
// training, free play and both drills carry the standard corners (back 'Back to Roadmap' / 'Back to Review', words in the accessible name,
// and the menu) with no board smaller than before (i); the top row sits at TOP_Y (2) under the safe area on every upright screen (j) -
// AT kunal761 A SCREEN THAT PADS BY THE APP'S OWN safeTop (the Review summary) READS 51 + 2, because headless Chromium has no env() and
// ct_safe drives only safeTop; on his phone both read the inset + 2, so 2 or 53 is accepted there and nowhere else; one sheet header (l);
// the online game's actions in the one secondary style (m); the 12 gutter on pages with no board (n); list rows radius 12 and a Gambits row
// the height of an Openings row (o); one section label (p); 44pt tap targets (q); the main buttons 44 high radius 12 (r).
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=227 red=123 scope=trial:749a261311ba how=#550 the tree before this build (HEAD 9a6a5c6, built as t0): 38x30 menus and left/off-centre titles in four sizes (TC-R215a 57 red, b 33), 38- and 36-high Tactics buttons (c 9), the Tactics board 78.5 lower than Strategy's and short of the width at 375x667/320x568 (d 5), the answer in a box under the board (e 3), X mid-bar in the demo and two ⋯ in practice (f 9), the 320x568 lesson board 270.9 with the row under it (g 5), the online game-over board 192 and the page scrolling 80 (h 2) - every case red; on a43f44594f3b 233/0
const L=require('../lib');
const H=require('../drive/home'),D=require('../drive/lesson'),Z=require('../drive/puzzles'),R=require('../drive/review'),P=require('../drive/play'),M=require('../drive/menu');
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'100-online-review-rating.js'),'utf8');
const STUB=new Function('return ('+src.slice(src.indexOf('const STUB=')+'const STUB='.length,src.indexOf('\nL.run(')).trim().replace(/;$/,'')+')')();
const GEOS=[['kunal761','kunal761'],['375x667',{w:375,h:667,safe:'',label:'375x667'}],['320x568','se']];
const LAND={w:761,h:375,safe:'',label:'761x375'};
// screen -> [driver, title words or null, has a back]
const SCREENS=[['Discover',b=>H.states.discover(b),/^Discover$/,false],['Openings list',b=>D.states['openings-list'](b),/^Openings$/,true],
  ['Puzzles roadmap',b=>Z.states.roadmap(b),/^Puzzles$/,false],['Review list',b=>R.states['list-stored'](b),/^Game review$/i,false],
  ['Review summary',b=>R.states.summary(b),/^Game review$/i,true],['Review board',b=>R.states['moves-ply10'](b),/^Game review$/i,true],
  ['Play setup',b=>P.states.setup(b),/^New Game$/,true],['Game vs computer',b=>P.states['cpu-4ply'](b),null,true],['Tactics',b=>D.states.tactics(b),null,true]];
const corners=(b,title)=>b.page.evaluate((tsrc)=>{const vw=innerWidth,vh=innerHeight;
  const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;const c=document.elementFromPoint(Math.min(vw-1,Math.max(0,r.left+r.width/2)),Math.min(vh-1,Math.max(0,r.top+r.height/2)));return !!c&&(e.contains(c)||c.contains(e));};
  const bs=[...document.querySelectorAll('button')].filter(vis).filter(e=>e.getBoundingClientRect().top<140);
  const R=e=>{const r=e.getBoundingClientRect();return {x:+r.left.toFixed(1),r:+(vw-r.right).toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),y:+r.top.toFixed(1),br:getComputedStyle(e).borderRadius};};
  const menu=bs.filter(e=>/^menu and settings$|^more$/i.test(e.getAttribute('aria-label')||'')||/^[☰⋯]$/.test((e.innerText||'').trim())).map(R).sort((a,c)=>a.r-c.r)[0]||null;
  const back=bs.filter(e=>/^(back|home|back to games|roadmap|back to roadmap|back to review)$/i.test(e.getAttribute('aria-label')||'')||/^(‹|←|⌂)/.test((e.innerText||'').trim())).map(e=>({...R(e),al:e.getAttribute('aria-label')||(e.innerText||'').trim()})).sort((a,c)=>a.x-c.x)[0]||null;
  let title=null;if(tsrc){const re=new RegExp(tsrc);const t=[...document.querySelectorAll('div,span')].filter(e=>!e.closest('button')&&re.test((e.innerText||'').trim())&&e.getBoundingClientRect().top<140&&vis(e)).sort((a,c)=>a.getBoundingClientRect().top-c.getBoundingClientRect().top)[0];
    if(t){const s=getComputedStyle(t);const rg=document.createRange();rg.selectNodeContents(t);const q=rg.getBoundingClientRect();title={cx:+((q.left+q.right)/2-vw/2).toFixed(1),fs:parseFloat(s.fontSize),fw:+s.fontWeight,ff:s.fontFamily.split(',')[0].replace(/"/g,'').trim()};}}
  return {menu,back,title,vw};},title?title.source:null);
const ok44=c=>!!c&&c.w>=43.5&&c.h>=43.5;
const TOP_Y=2;const atY=(y,gn)=>y!=null&&(Math.abs(y-TOP_Y)<=1||(gn==='kunal761'&&Math.abs(y-(51+TOP_Y))<=1));   // see the header: 53 only where the app pads by its own safeTop at kunal761
const at8=(v)=>v!=null&&Math.abs(v-8)<=1;
L.run(async()=>{
  const fams=new Set();
  for(const [gn,geo] of GEOS)for(const [nm,go,title,hasBack] of SCREENS){const tag=nm+' '+gn;
    const b=await L.launch({geo,name:'top139',store:{ct_pool:'3'}});await b.open();let ok=true;try{await go(b);await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,120));}
    const c=await corners(b,title);
    L.say(ok,'TC-R215 '+tag+' PRECONDITION the screen is reached',{ok});
    const inBar=nm==='Review board'&&gn!=='kunal761';   // on a short phone Review keeps back and ⋯ inside its top player bar (#351, no header row); they are the standard size there, at the bar's edge
    L.say(ok44(c.menu)&&(inBar||at8(c.menu.r)),'TC-R215a '+tag+' the menu is top-right, >=44x44, '+(inBar?'(in the player bar) ':'8 from the right edge ')+'('+(c.menu?c.menu.w+'x'+c.menu.h+' at '+c.menu.r:'none')+')',c.menu);
    if(hasBack)L.say(ok44(c.back)&&(inBar||at8(c.back.x)),'TC-R215a '+tag+' the back is top-left, >=44x44, 8 from the left edge ('+(c.back?c.back.w+'x'+c.back.h+' at '+c.back.x:'none')+')',c.back);
    if(c.menu&&c.back)L.say(c.menu.br===c.back.br&&c.menu.br==='12px','TC-R215a '+tag+' back and menu share one corner radius, 12 ('+c.back.br+' / '+c.menu.br+')',{b:c.back.br,m:c.menu.br});
    if(!inBar){const ys=[c.menu&&c.menu.y,hasBack&&c.back?c.back.y:null].filter(v=>v!=null);L.say(ys.length>0&&ys.every(y=>atY(y,gn)),'TC-R215j '+tag+' the top row is at y '+TOP_Y+' under the safe area ('+(ys.join(' / ')||'no corners')+')',ys);}
    if(title&&!inBar){L.say(!!c.title&&Math.abs(c.title.cx)<=2,'TC-R215b '+tag+' the title is centred on the screen ('+(c.title?'off by '+c.title.cx:'not found')+')',c.title);
      L.say(!!c.title&&c.title.fs===18&&c.title.fw===800,'TC-R215b '+tag+' the title is 18px weight 800 ('+(c.title?c.title.fs+'/'+c.title.fw:'-')+')',c.title);if(c.title)fams.add(c.title.ff);}
    L.say(b.errs.length===0,'TC-R215 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  L.say(fams.size===1,'TC-R215b one title typeface on every screen and geometry ('+[...fams].join(' | ')+')',[...fams]);
  // Home: the menu joins the standard (the account button stays as it is)
  {const b=await L.launch({geo:'kunal761',name:'top139-home'});await b.open();await H.states.home(b);await b.settle(600);
   const m=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>/^menu and settings$/i.test(x.getAttribute('aria-label')||'')&&x.getBoundingClientRect().width>0);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {w:r.width,h:r.height,br:s.borderRadius,bg:s.backgroundColor};});
   L.say(!!m&&m.w>=43.5&&m.h>=43.5&&m.br==='12px'&&/0\.08\)$/.test(m.bg),'TC-R215a Home kunal761 the menu is the standard 44x44 square button, radius 12, white 8% ('+JSON.stringify(m)+')',m);await b.close();}
  // sideways: the fixed corner buttons
  for(const [nm,go] of [['Discover',b=>H.states.discover(b)],['Puzzles roadmap',b=>Z.states.roadmap(b)]]){const b=await L.launch({geo:LAND,name:'top139-land'});await b.open();try{await go(b);await b.settle(900);}catch(e){}
   const c=await corners(b,null);L.say(ok44(c.menu)&&at8(c.menu.r),'TC-R215a '+nm+' 761x375 sideways the menu is >=44x44 at 8 from the right ('+(c.menu?c.menu.w+'x'+c.menu.h+' at '+c.menu.r:'none')+')',c.menu);await b.close();}
  // Tactics and Strategy: one board top, full width, 44pt actions, the answer over the board
  for(const [gn,geo] of GEOS){const b=await L.launch({geo,name:'top139-tac'});await b.open();let ok=true;try{await D.states.tactics(b);await b.settle(900);}catch(e){ok=false;}
    const rd=()=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const act=[...document.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().width>0&&/^(Hint|Show answer|Next motif →|‹ Prev|Next ›)$/.test((x.innerText||'').trim())).map(x=>({t:(x.innerText||'').trim(),h:+x.getBoundingClientRect().height.toFixed(1)}));
      const root=document.getElementById('root');return {top:g?+g.top.toFixed(1):null,w:g?+g.width.toFixed(1):null,bottom:g?g.bottom:null,act,sh:root.scrollHeight-root.clientHeight,vw:innerWidth};});
    const t=await rd();
    L.say(ok&&t.top!=null,'TC-R215 Tactics '+gn+' PRECONDITION the Tactics board is on screen',t);
    L.say(t.act.length===2&&t.act.every(a=>Math.abs(a.h-44)<=0.5),'TC-R215c Tactics '+gn+' Hint and Show answer are 44 high ('+t.act.map(a=>a.t+' '+a.h).join(', ')+')',t.act);
    L.say(t.w!=null&&Math.abs(t.w-t.vw)<=1&&t.sh<=1,'TC-R215d Tactics '+gn+' the board is the screen width ('+t.w+' of '+t.vw+') and the page does not scroll ('+t.sh+')',t);
    let a=null;try{await b.tapText(/^Show answer$/);await b.settle(700);a=await rd();}catch(e){}
    const ov=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return r.width>0&&/^(✓ |Answer: )/.test((d.innerText||'').trim())&&d.querySelector('button')&&getComputedStyle(d).position==='absolute';})[0];if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom};});
    L.say(!!a&&a.top===t.top&&a.w===t.w&&a.sh<=1,'TC-R215e Tactics '+gn+' showing the answer moves nothing: board top '+t.top+' -> '+(a&&a.top)+', width '+t.w+' -> '+(a&&a.w),a);
    L.say(!!ov&&!!a&&ov.top>=a.top-0.5&&ov.bottom<=a.bottom+0.5,'TC-R215e Tactics '+gn+' the answer opens OVER the board ('+(ov?Math.round(ov.top)+'..'+Math.round(ov.bottom):'no overlay')+' inside '+(a?a.top+'..'+Math.round(a.bottom):'-')+')',ov);
    L.say(!!a&&a.act.length===1&&a.act[0].t==='Next motif →'&&Math.abs(a.act[0].h-44)<=0.5,'TC-R215c Tactics '+gn+' Next motif is 44 high ('+(a&&a.act.map(x=>x.t+' '+x.h).join(', '))+')',a&&a.act);
    let s=null;try{await b.tapText(/^Strategy$/);await b.settle(900);s=await rd();}catch(e){}
    L.say(!!s&&s.top===t.top&&s.w===t.w,'TC-R215d Tactics '+gn+' the Strategy board sits at the Tactics board\'s top and size ('+t.top+'/'+t.w+' vs '+(s&&s.top)+'/'+(s&&s.w)+')',s);
    L.say(!!s&&s.act.length===2&&s.act.every(x=>Math.abs(x.h-44)<=0.5),'TC-R215c Strategy '+gn+' Prev and Next are 44 high ('+(s&&s.act.map(x=>x.t+' '+x.h).join(', '))+')',s&&s.act);
    L.say(b.errs.length===0,'TC-R215 Tactics '+gn+' zero app errors',b.errs.slice(0,3));await b.close();}
  // the lesson's bottom bar: X first, ⋯ last, one ⋯, in demo and practice; the short phone fold
  for(const [gn,geo] of GEOS)for(const st of ['demo-m1','demo-end','practice-m0']){const tag='lesson '+st+' '+gn;const b=await L.launch({geo,name:'top139-les',store:{ct_pool:'3'}});await b.open();let ok=true;try{await D.states[st](b);await b.settle(1200);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,120));}
    const r=await b.page.evaluate(()=>{const vw=innerWidth;const f=[...document.querySelectorAll('button[aria-label]')].filter(x=>{const q=x.getBoundingClientRect();return q.width>0&&q.top>innerHeight-110&&getComputedStyle(x.parentElement).position==='fixed';}).sort((a,c)=>a.getBoundingClientRect().left-c.getBoundingClientRect().left).map(x=>x.getAttribute('aria-label'));
      const dots=[...document.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0&&/^[⋯]$/.test((x.innerText||'').trim());}).length;
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];const root=document.getElementById('root');
      return {f,dots,w:g?+g.width.toFixed(1):null,vw,sh:root.scrollHeight-root.clientHeight};});
    L.say(ok&&r.f.length>=2,'TC-R215 '+tag+' PRECONDITION the lesson bar is on screen ('+r.f.join(', ')+')',r);
    L.say(r.f[0]==='Close lesson'&&r.f[r.f.length-1]==='More for this lesson','TC-R215f '+tag+' the close X is far left of the bar and ⋯ far right ('+r.f.join(', ')+')',r.f);
    L.say(r.dots===1,'TC-R215f '+tag+' one ⋯ on the screen ('+r.dots+')',r.dots);
    if(gn==='320x568'){L.say(r.w!=null&&r.w>=319&&r.sh<=1,'TC-R215g '+tag+' on a short phone the lesson board is the screen width ('+r.w+' of '+r.vw+'), no page scroll ('+r.sh+')',r);
      if(st!=='practice-m0')L.say(r.f.includes("Now I'll try it"),'TC-R215g '+tag+' Now I\'ll try it is a button in the bar ('+r.f.join(', ')+')',r.f);
      if(st==='demo-end'){await b.page.click('button[aria-label="More for this lesson"]').catch(()=>{});await b.settle(600);
        const ln=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>/How does White reply|another of White/.test(d.innerText||'')&&d.querySelectorAll('button').length>0&&d.getBoundingClientRect().height>0);return !!e;});
        L.say(ln,'TC-R215g '+tag+' Other lines is reached through ⋯ (the sheet lists the lines)',ln);}}
    L.say(b.errs.length===0,'TC-R215 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
  // the online game over: board full width on his phone, no page scroll
  {const b=await L.launch({geo:'kunal761',name:'top139-online',store:{ct_pool:'3'}});await b.ctx.addInitScript(STUB);await b.open('index.html?g=ABCDE');let ok=true;
   try{await b.page.waitForSelector('[data-ct="pbar-rating-w"]',{timeout:20000});await b.settle(4500);}catch(e){ok=false;}
   const r=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];const root=document.getElementById('root');
     const over=/You lost|You won|Draw/.test(document.body.innerText||'');const rev=[...document.querySelectorAll('button')].some(x=>/Review this game/.test((x.getAttribute('aria-label')||'')+' '+(x.innerText||''))&&x.getBoundingClientRect().height>=43.5);
     return {w:g?+g.width.toFixed(1):null,vw:innerWidth,sh:root.scrollHeight-root.clientHeight,over,rev};});
   L.say(ok&&r.over&&r.rev,'TC-R215 online game over kunal761 PRECONDITION the finished game is on screen with Review this game',r);
   L.say(r.w!=null&&Math.abs(r.w-r.vw)<=1,'TC-R215h online game over kunal761 the board stays the screen width ('+r.w+' of '+r.vw+')',r);
   L.say(r.sh<=1,'TC-R215h online game over kunal761 the page does not scroll ('+r.sh+')',r);
   // FMT-B-04/B-07: the actions in the one secondary style - at most ONE filled button (the accent primary), each 44 high, radius 12 - where
   // they were Review blue, Rematch accent, Flip purple and Leave grey. Found by the panel's data-ct, which is older than this build.
   const ac=await b.page.evaluate(()=>{const p=document.querySelector('[data-ct="online-over-actions"]');if(!p)return null;return [...p.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>{const s=getComputedStyle(x),q=x.getBoundingClientRect();return {t:x.getAttribute('aria-label')||(x.innerText||'').trim(),bg:s.backgroundColor,h:+q.height.toFixed(1),br:s.borderRadius};});});
   L.say(!!ac&&ac.length>=3,'TC-R215m online game over kunal761 PRECONDITION the action panel is on screen ('+(ac?ac.length:0)+' buttons)',ac);
   if(ac){const neutral=x=>/^rgba\(255, 255, 255, 0\.(0[5-9]|1\d?)\d*\)$/.test(x.bg);const fill=ac.filter(x=>!neutral(x));
     L.say(fill.length<=1,'TC-R215m online game over kunal761 one filled button at most, the rest the secondary style ('+ac.map(x=>x.t+' '+x.bg).join('; ')+')',ac);
     L.say(ac.every(x=>Math.abs(x.h-44)<=0.5&&x.br==='12px'),'TC-R215m online game over kunal761 every action is 44 high, radius 12 ('+ac.map(x=>x.h+'/'+x.br).join(', ')+')',ac);}
   L.say(b.errs.length===0,'TC-R215 online game over zero app errors',b.errs.slice(0,3));await b.close();}
  // ── TC-R215i/j: PUZZLE TRAINING, FREE PLAY AND THE DRILLS - the standard corners, at TOP_Y, and no board smaller than before.
  {const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'],UCIS=['b2b7','c2c7','d2d7'];
   const rows=(label,n)=>FENS.slice(0,n).map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',...(label==='Brilliant'?{}:{wc:{g:'Blunder',drop:25}})}));
   const drill=(re)=>async b=>{await b.tile('Review');await b.settle(700);await b.tapText(re,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});};
   const PZS=[['Puzzle training',b=>Z.states.train(b),{},/Roadmap/],['Free play',b=>Z.states['free-play'](b),{},/Roadmap/],
     ['Mistakes drill',drill(/find the move you missed/),{ct_mymistakes:rows('Blunder',3)},/Review/],['Brilliant drill',drill(/can you spot them again\?/),{ct_mybrilliancies:rows('Brilliant',1),ct_bril_reset_v1:'1'},/Review/]];
   // the board on the tree before this build (trial 9f4f6f823150, the branch tip): the floor, never smaller (his board rule)
   const FLOOR={kunal761:375,'375x667':375,'320x568':320,land:375},FLOOR_MK_SE=288;
   for(const [gn,geo] of [...GEOS,['land',LAND]])for(const [nm,go,st,word] of PZS){const tag=nm+' '+gn;const up=gn!=='land';
    const b=await L.launch({geo,name:'top139-pz',store:{ct_pool:'3',...st}});await b.open();let ok=true;try{await go(b);await b.settle(1000);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,120));}
    const c=await corners(b,null);
    const r=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];const root=document.getElementById('root');
      const ctr=document.querySelector('[data-ct="drill-counter"]');const q=ctr&&ctr.getBoundingClientRect();return {w:g?+g.width.toFixed(1):null,sh:root.scrollHeight-root.clientHeight,ctr:q&&q.width>0?+q.height.toFixed(1):null};});
    L.say(ok&&r.w!=null,'TC-R215 '+tag+' PRECONDITION the screen is up with its board',r);
    L.say(ok44(c.back)&&(!up||at8(c.back.x))&&word.test(c.back.al||''),'TC-R215i '+tag+' the back is the 44x44 corner'+(up?' at 8 from the left':'')+' and names the place in its accessible name ('+(c.back?c.back.w+'x'+c.back.h+' at '+c.back.x+', "'+c.back.al+'"':'none')+')',c.back);
    L.say(ok44(c.menu)&&(!up||at8(c.menu.r)),'TC-R215i '+tag+' the menu is the 44x44 corner'+(up?' at 8 from the right':'')+' ('+(c.menu?c.menu.w+'x'+c.menu.h+' at '+c.menu.r:'none')+')',c.menu);
    if(c.menu&&c.back)L.say(c.menu.br==='12px'&&c.back.br==='12px','TC-R215i '+tag+' both corners radius 12 ('+c.back.br+' / '+c.menu.br+')',{b:c.back.br,m:c.menu.br});
    if(up)L.say(!!c.back&&!!c.menu&&atY(c.back.y,gn)&&atY(c.menu.y,gn),'TC-R215j '+tag+' the top row is at y '+TOP_Y+' ('+(c.back&&c.back.y)+' / '+(c.menu&&c.menu.y)+')',{b:c.back,m:c.menu});
    const fl=(nm==='Mistakes drill'&&gn==='320x568')?FLOOR_MK_SE:FLOOR[gn];
    L.say(r.w!=null&&r.w>=fl-0.5&&r.sh<=1,'TC-R215i '+tag+' the board is '+r.w+', not smaller than the '+fl+' it was, and the page does not scroll ('+r.sh+')',r);
    if(nm==='Mistakes drill'&&up)L.say(r.ctr!=null&&r.ctr>=43.5,'TC-R215q '+tag+' the card counter is a 44pt target ('+r.ctr+')',r.ctr);
    L.say(b.errs.length===0,'TC-R215 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}}
  // ── TC-R215l: ONE SHEET HEADER - Menu, Look and feel, the lesson intro card: the X 44x44 radius 12, the title 18px weight 700 in one face and colour.
  {const hd=[];for(const [nm,go,how] of [['Menu',b=>M.states['menu-discover'](b),'prev'],['Look and feel',b=>M.states['menu-look'](b),'prev'],['Lesson intro',b=>D.states.intro(b),'first']]){   // the X is the hit-testable 'Close' whose title is its row's text (Menu, Look and feel) or the card's first line (the intro)
    const b=await L.launch({geo:'kunal761',name:'top139-sheet'});await b.open();let ok=true;try{await go(b);await b.settle(800);}catch(e){ok=false;}
    const h=await b.page.evaluate((how)=>{const xs=[...document.querySelectorAll('button[aria-label="Close"]')].filter(x=>{const q=x.getBoundingClientRect();if(!(q.width>0))return false;const c=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return !!c&&(x===c||x.contains(c));});
      const x=xs.filter(x=>how!=='prev'||(x.previousElementSibling&&/\S/.test(x.previousElementSibling.innerText||''))).pop();if(!x)return null;const q=x.getBoundingClientRect(),xs2=getComputedStyle(x);const t=how==='prev'?x.previousElementSibling:x.parentElement.firstElementChild;if(!t)return {x:{w:q.width,h:q.height,br:xs2.borderRadius}};const ts=getComputedStyle(t);
      return {x:{w:+q.width.toFixed(1),h:+q.height.toFixed(1),br:xs2.borderRadius},t:{txt:(t.innerText||'').trim().slice(0,24),fs:parseFloat(ts.fontSize),fw:+ts.fontWeight,ff:ts.fontFamily.split(',')[0].replace(/"/g,'').trim(),col:ts.color}};},how);
    L.say(ok&&!!h&&!!h.t,'TC-R215l '+nm+' kunal761 PRECONDITION the sheet is open with its X and title',h);
    if(h&&h.t){L.say(ok44(h.x)&&h.x.br==='12px','TC-R215l '+nm+' kunal761 the close X is 44x44 radius 12 ('+h.x.w+'x'+h.x.h+' '+h.x.br+')',h.x);
      L.say(h.t.fs===18&&h.t.fw===700,'TC-R215l '+nm+' kunal761 the title "'+h.t.txt+'" is 18px weight 700 ('+h.t.fs+'/'+h.t.fw+')',h.t);hd.push(h.t);}
    await b.close();}
   L.say(hd.length===3&&new Set(hd.map(t=>t.ff+'|'+t.col)).size===1,'TC-R215l the three sheet titles share one face and one colour ('+hd.map(t=>t.ff+' '+t.col).join(' | ')+')',hd);}
  // ── TC-R215n/o/p/q/r: gutters, list rows, section labels, tap targets, main buttons (no board on these pages)
  const edges=(b)=>b.page.evaluate(()=>{const vw=innerWidth,vh=innerHeight;const els=[...document.querySelectorAll('div,button')].filter(e=>{const q=e.getBoundingClientRect();if(!(q.width>=vw*0.8&&q.width<vw-2&&q.top>=50&&q.top<vh*0.8&&q.height>0))return false;const s=getComputedStyle(e);return s.position!=='fixed';});
    if(!els.length)return null;const L=Math.min(...els.map(e=>e.getBoundingClientRect().left)),R=Math.max(...els.map(e=>e.getBoundingClientRect().right));return {l:+L.toFixed(1),r:+(vw-R).toFixed(1),n:els.length};});
  for(const gn of ['kunal761','320x568']){const geo=GEOS.find(g=>g[0]===gn)[1];
   for(const [nm,go] of [['Home',b=>H.states.home(b)],['Openings list',b=>D.states['openings-list'](b)],['Puzzles roadmap',b=>Z.states.roadmap(b)],['Review list',b=>R.states['list-stored'](b)]]){
    const b=await L.launch({geo,name:'top139-gut'});await b.open();try{await go(b);await b.settle(800);}catch(e){}
    const e=await edges(b);L.say(!!e&&Math.abs(e.l-12)<=1&&Math.abs(e.r-12)<=1,'TC-R215n '+nm+' '+gn+' the page sits 12 from each screen edge ('+(e?e.l+' / '+e.r:'nothing measured')+')',e);await b.close();}}
  {const b=await L.launch({geo:'kunal761',name:'top139-rows'});await b.open();const rh={};
   for(const [nm,st] of [['Openings','openings-list'],['Gambits','gambits-list']]){try{await D.states[st](b);await b.settle(700);}catch(e){}
    rh[nm]=await b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const q=x.getBoundingClientRect();return q.width>innerWidth*0.8&&q.height>0&&/[♔♚]/.test(x.innerText||'');}).slice(0,12).map(x=>({h:+x.getBoundingClientRect().height.toFixed(1),br:getComputedStyle(x).borderRadius})));}
   const all=[...(rh.Openings||[]),...(rh.Gambits||[])];
   L.say((rh.Openings||[]).length>0&&(rh.Gambits||[]).length>0,'TC-R215o PRECONDITION the Openings and Gambits rows are measured ('+(rh.Openings||[]).length+' / '+(rh.Gambits||[]).length+')',rh);
   L.say(all.length>0&&all.every(x=>x.br==='12px'),'TC-R215o the list rows are radius 12 ('+[...new Set(all.map(x=>x.br))].join(', ')+')',all);
   // a one-line row: the modal height of each list (a lesson whose NAME runs to two lines is 71 on both trees - the name, not the chip)
   const mode=a=>{const m={};a.forEach(x=>{m[x.h]=(m[x.h]||0)+1;});return +Object.keys(m).sort((p,q)=>m[q]-m[p])[0];};
   const mo=mode(rh.Openings||[]),mg=mode(rh.Gambits||[]);
   L.say(!!mo&&Math.abs(mo-mg)<=0.5&&Math.abs(mo-58)<=0.5,'TC-R215o a one-line Gambits row is the height of an Openings row, 58 ('+mg+' against '+mo+')',rh);await b.close();}
  {const lab=[];for(const [nm,go,re] of [['Play setup',b=>P.states.setup(b),/^Opponent$/i],['Puzzles roadmap',b=>Z.states.roadmap(b),/^YOUR JOURNEY/i],['Lesson',b=>D.states['demo-m1'](b),/^MOVES$/i]]){
    const b=await L.launch({geo:'kunal761',name:'top139-lab'});await b.open();try{await go(b);await b.settle(800);}catch(e){}
    const t=await b.page.evaluate((src)=>{const re=new RegExp(src,'i');const e=[...document.querySelectorAll('div,span')].find(x=>x.children.length===0&&re.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);if(!e)return null;const s=getComputedStyle(e);return {fs:parseFloat(s.fontSize),fw:+s.fontWeight,ls:s.letterSpacing,tt:s.textTransform,ff:s.fontFamily.split(',')[0]};},re.source);
    L.say(!!t,'TC-R215p '+nm+' PRECONDITION the section label is found',t);if(t)lab.push(t);await b.close();}
   L.say(lab.length===3&&new Set(lab.map(t=>[t.fs,t.fw,t.ls,t.tt,t.ff].join('|'))).size===1,'TC-R215p one section-label style on Play setup, Puzzles and a lesson ('+lab.map(t=>t.fs+'/'+t.fw+'/'+t.ls+'/'+t.ff).join(' | ')+')',lab);}
  {const b=await L.launch({geo:'kunal761',name:'top139-tap'});await b.open();await H.states.home(b);await b.tile('Discover');await b.settle(600);
   const tb=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="tabbar"] button')].map(x=>+x.getBoundingClientRect().height.toFixed(1)));
   L.say(tb.length===5&&tb.every(h=>h>=43.5),'TC-R215q the five tabs are 44pt targets ('+tb.join(', ')+')',tb);
   try{await Z.states['roadmap-bottom'](b);await b.settle(500);}catch(e){}
   const pin=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('input')].find(x=>/Unlock code/.test(x.placeholder||'')&&x.getBoundingClientRect().width>0);return e?+e.getBoundingClientRect().height.toFixed(1):null;});
   L.say(pin!=null&&pin>=43.5,'TC-R215q the Unlock code box is 44 tall, as the Unlock button beside it ('+pin+')',pin);await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'top139-main',store:{ct_pool:'3'}});await b.open();const mb=[];
   try{await R.states.summary(b);await b.settle(800);mb.push(...await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="rev-summary-foot"] button')].map(x=>({t:(x.innerText||'').trim(),h:+x.getBoundingClientRect().height.toFixed(1),br:getComputedStyle(x).borderRadius}))));}catch(e){}
   try{await P.states.setup(b);await b.settle(800);const st=await b.page.evaluate(()=>{const x=document.querySelector('[data-ct="setup-start"]');return x?{t:(x.innerText||'').trim(),h:+x.getBoundingClientRect().height.toFixed(1),br:getComputedStyle(x).borderRadius}:null;});if(st)mb.push(st);}catch(e){}
   L.say(mb.length===3,'TC-R215r PRECONDITION the summary footer and Start game are measured ('+mb.map(x=>x.t).join(', ')+')',mb);
   L.say(mb.length>0&&mb.every(x=>Math.abs(x.h-44)<=0.5&&x.br==='12px'),'TC-R215r the main buttons are 44 high, radius 12 ('+mb.map(x=>x.t+' '+x.h+'/'+x.br).join('; ')+')',mb);await b.close();}
},'139-one-top-row-standard');
