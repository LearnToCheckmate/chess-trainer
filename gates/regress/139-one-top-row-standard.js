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
// sits at the board's edge, and the title is not shown (#351, Kunal: 'relocate them') - so there only the 44x44 size is asserted. Puzzle training and the two drills were not changed by this build (other lanes held those screens), so they are not
// asserted here. The vertical position of the top row differs by screen (it follows each screen's own safe-area handling); only the x
// offsets are asserted, as the task asked.
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=227 red=123 scope=trial:749a261311ba how=#550 the tree before this build (HEAD 9a6a5c6, built as t0): 38x30 menus and left/off-centre titles in four sizes (TC-R215a 57 red, b 33), 38- and 36-high Tactics buttons (c 9), the Tactics board 78.5 lower than Strategy's and short of the width at 375x667/320x568 (d 5), the answer in a box under the board (e 3), X mid-bar in the demo and two ⋯ in practice (f 9), the 320x568 lesson board 270.9 with the row under it (g 5), the online game-over board 192 and the page scrolling 80 (h 2) - every case red; on a43f44594f3b 233/0
const L=require('../lib');
const H=require('../drive/home'),D=require('../drive/lesson'),Z=require('../drive/puzzles'),R=require('../drive/review'),P=require('../drive/play');
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'100-online-review-rating.js'),'utf8');
const STUB=new Function('return ('+src.slice(src.indexOf('const STUB=')+'const STUB='.length,src.indexOf('\nL.run(')).trim().replace(/;$/,'')+')')();
const GEOS=[['kunal761','kunal761'],['375x667',{w:375,h:667,safe:'',label:'375x667'}],['320x568','se']];
const LAND={w:761,h:375,safe:'',label:'761x375'};
// screen -> [driver, title words or null, has a back]
const SCREENS=[['Discover',b=>H.states.discover(b),/^Discover$/,false],['Openings list',b=>D.states['openings-list'](b),/^Openings$/,true],
  ['Puzzles roadmap',b=>Z.states.roadmap(b),/^Puzzles$/,false],['Review list',b=>R.states['list-stored'](b),/^Game Review$/,false],
  ['Review summary',b=>R.states.summary(b),/^Game Review$/,true],['Review board',b=>R.states['moves-ply10'](b),/^Game Review$/,true],
  ['Play setup',b=>P.states.setup(b),/^New Game$/,true],['Game vs computer',b=>P.states['cpu-4ply'](b),null,true],['Tactics',b=>D.states.tactics(b),null,true]];
const corners=(b,title)=>b.page.evaluate((tsrc)=>{const vw=innerWidth,vh=innerHeight;
  const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;const c=document.elementFromPoint(Math.min(vw-1,Math.max(0,r.left+r.width/2)),Math.min(vh-1,Math.max(0,r.top+r.height/2)));return !!c&&(e.contains(c)||c.contains(e));};
  const bs=[...document.querySelectorAll('button')].filter(vis).filter(e=>e.getBoundingClientRect().top<140);
  const R=e=>{const r=e.getBoundingClientRect();return {x:+r.left.toFixed(1),r:+(vw-r.right).toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),y:+r.top.toFixed(1),br:getComputedStyle(e).borderRadius};};
  const menu=bs.filter(e=>/^menu and settings$|^more$/i.test(e.getAttribute('aria-label')||'')||/^[☰⋯]$/.test((e.innerText||'').trim())).map(R).sort((a,c)=>a.r-c.r)[0]||null;
  const back=bs.filter(e=>/^(back|home|back to games)$/i.test(e.getAttribute('aria-label')||'')||/^(‹|←|⌂)/.test((e.innerText||'').trim())).map(R).sort((a,c)=>a.x-c.x)[0]||null;
  let title=null;if(tsrc){const re=new RegExp(tsrc);const t=[...document.querySelectorAll('div,span')].filter(e=>!e.closest('button')&&re.test((e.innerText||'').trim())&&e.getBoundingClientRect().top<140&&vis(e)).sort((a,c)=>a.getBoundingClientRect().top-c.getBoundingClientRect().top)[0];
    if(t){const s=getComputedStyle(t);const rg=document.createRange();rg.selectNodeContents(t);const q=rg.getBoundingClientRect();title={cx:+((q.left+q.right)/2-vw/2).toFixed(1),fs:parseFloat(s.fontSize),fw:+s.fontWeight,ff:s.fontFamily.split(',')[0].replace(/"/g,'').trim()};}}
  return {menu,back,title,vw};},title?title.source:null);
const ok44=c=>!!c&&c.w>=43.5&&c.h>=43.5;
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
   L.say(b.errs.length===0,'TC-R215 online game over zero app errors',b.errs.slice(0,3));await b.close();}
},'139-one-top-row-standard');
