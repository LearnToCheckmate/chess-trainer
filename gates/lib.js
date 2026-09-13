// gates/lib.js - the one harness library. Every gate, audit and drive script uses this so that a
// finding is always measured the same way. CommonJS, no deps beyond the Playwright that ships with
// the container (global) or playwright-core (executablePath from PLAYWRIGHT_BROWSERS_PATH).
//
//   const L=require('./lib');
//   const b=await L.launch({geo:'kunal'});      // 375x679 = his phone's usable area (no ct_safe: see GEOS), or '390' (390x844), or {w,h,safe}
//   await b.open();                             // serves the repo (or CT_APP) and waits for the app to mount
//   await b.tile('Play'); await b.tab('Review'); await b.tapText(/^Pass & Play$/);
//   const bd=b.board();                         // {x,y,w,h,sq,flip} of the painted board grid, or null
//   await b.move('e2','e4');                    // tap the piece, then the target (never press the source twice)
//   const m=await b.metrics();                  // {board, over, vw, vh, errs}  over = bottom-most laid-out child - viewport
//   await b.shot('play-after-e4');              // gates/shots/<name>.png (CT_SHOTS overrides the dir)
//   L.say(ok,'what');  ... L.done();            // PASS/FAIL lines; done() exits 1 on any FAIL
//
// RULES BAKED IN (from HANDOFF): overflow is measured from the bottom-most laid-out child of #root, not
// scrollHeight (clamped, #354); a move is piece-tap then target-tap (#343 trap); measure AFTER interaction
// (#370 k8 rule); Kunal's geometry is 375x679 with insets 51/31, height binds there (#364).
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),net=require('net');
const ROOT=path.resolve(__dirname,'..');
const SHOTS=process.env.CT_SHOTS||path.join(__dirname,'shots');
const NET_NOISE=/ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_FAILED|net::ERR|gstatic|googleapis|firebase|Failed to load resource/i;
const BLOCK=/gstatic\.com|googleapis\.com|firebaseio|firebase\.com|api\.chess\.com|lichess\.org|fonts\.g|google-analytics|googletagmanager|cloudfunctions/;
// Kunal's phone is 375x761 with insets 51/31 = 375x679 USABLE. Emulate it as a 375x679 viewport with NO ct_safe:
// the 679 already is the usable area, and ct_safe would make the app subtract the insets a second time (measured
// 2026-09-12: with both, the review board is 293 instead of the 349 his phone shows; with 679 alone, 349 and the
// Pass & Play board 351, both matching HANDOFF). 'kunal761' is the other emulation (full height + ct_safe), kept for
// cross-checks; its Play numbers differ because headless Chromium has no real env() padding.
const GEOS={kunal:{w:375,h:679,safe:'',label:'375x679 = Kunal usable area'},kunal761:{w:375,h:761,safe:'51,31',label:'375x761 with ct_safe 51,31'},'390':{w:390,h:844,safe:'',label:'390x844'},'430':{w:430,h:932,safe:'',label:'430x932'},se:{w:320,h:568,safe:'',label:'320x568'}};

function pw(){
  try{return require('/opt/node22/lib/node_modules/playwright');}catch(e){}
  try{return require('playwright');}catch(e){}
  const core=require('playwright-core');const bp=process.env.PLAYWRIGHT_BROWSERS_PATH||'/opt/pw-browsers';
  const d=fs.readdirSync(bp).find(x=>/^chromium-\d+$/.test(x));
  core._ctExec=d?path.join(bp,d,'chrome-linux','chrome'):undefined;return core;
}
function freePort(){return new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});}

// A site dir is the repo with one file swapped: app.js -> the bundle under test (CT_APP, default the repo's app.js).
// Symlinks for everything else, so index.html, lessons.js, sw.js and the engine are always the repo's own.
function siteDir(app){
  const d=path.join(__dirname,'.site',String(process.pid));fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
  for(const f of fs.readdirSync(ROOT)){if(f==='.git'||f==='gates'||f==='app.js')continue;fs.symlinkSync(path.join(ROOT,f),path.join(d,f));}
  fs.copyFileSync(app,path.join(d,'app.js'));return d;
}
let _srv=null;
async function serve(opts={}){
  if(_srv&&!opts.fresh)return _srv;
  // gates/.pin-app.js, when present, is served by default instead of the repo's app.js: it pins the bundle an
  // audit is measuring while a new build lands in app.js (gates.sh always names its bundle explicitly).
  const pinned=path.join(__dirname,'.pin-app.js');
  const app=path.resolve(opts.app||process.env.CT_APP||(fs.existsSync(pinned)?pinned:path.join(ROOT,'app.js')));
  const dir=siteDir(app);const port=await freePort();
  const p=cp.spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:dir,stdio:'ignore'});
  const url='http://127.0.0.1:'+port+'/';
  for(let i=0;i<50;i++){try{await new Promise((res,rej)=>{const s=net.connect(port,'127.0.0.1',()=>{s.end();res();});s.on('error',rej);});break;}catch(e){await new Promise(r=>setTimeout(r,100));}}
  _srv={url,dir,app,port,proc:p,close(){try{p.kill();}catch(e){}fs.rmSync(dir,{recursive:true,force:true});_srv=null;}};
  return _srv;
}
const sq2xy=(sq)=>({f:sq.charCodeAt(0)-97,r:parseInt(sq[1],10)-1});

async function launch(opts={}){
  const geo=typeof opts.geo==='object'?opts.geo:(GEOS[opts.geo||'kunal']);
  if(!geo)throw new Error('unknown geo '+opts.geo);
  const srv=await serve(opts);
  const P=pw();const launchOpts={headless:true};if(P._ctExec)launchOpts.executablePath=P._ctExec;
  const browser=await P.chromium.launch(launchOpts);
  const ctx=await browser.newContext({viewport:{width:geo.w,height:geo.h},deviceScaleFactor:opts.dpr||1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 CTGATE'});
  if(!opts.network)await ctx.route(u=>BLOCK.test(u.href),r=>r.abort());
  const store=Object.assign({},geo.safe?{ct_safe:geo.safe}:{},opts.store||{});
  // #353 harness hole: addInitScript re-runs on every navigation; seed once per origin, guarded by a marker.
  await ctx.addInitScript((st)=>{try{if(!sessionStorage.getItem('ct_seeded')){for(const k in st)localStorage.setItem(k,typeof st[k]==='string'?st[k]:JSON.stringify(st[k]));sessionStorage.setItem('ct_seeded','1');}}catch(e){}},store);
  const page=await ctx.newPage();
  const errs=[],noise=[];
  page.on('console',m=>{if(m.type()==='error'){const t=m.text();(NET_NOISE.test(t)?noise:errs).push(t.slice(0,300));}});
  page.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,300)));
  const b={browser,ctx,page,geo,errs,noise,url:srv.url,name:opts.name||'run',
    async open(p){await page.goto(srv.url+(p||'index.html'),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>{const r=document.getElementById('root');return r&&r.children.length&&!document.getElementById('boot');},null,{timeout:30000});
      await page.waitForTimeout(opts.settle||900);return b;},
    async stamp(){return page.evaluate(()=>{const m=document.documentElement.innerHTML.match(/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/);return m?m[0]:null;});},
    async settle(ms){await page.waitForTimeout(ms==null?600:ms);},
    // visible element whose own trimmed text matches; buttons first
    loc(re,opts2={}){const r=re instanceof RegExp?re:new RegExp('^'+String(re).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');return page.locator(opts2.sel||'button, [role=button], a, div, span',{hasText:r}).filter({has:page.locator(':scope')}).last();},
    async tapText(re,opts2={}){const r=re instanceof RegExp?re:new RegExp('^\\s*'+String(re).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$');
      // choose the smallest visible element whose innerText matches, so a tile is not chosen over its label
      // in-viewport matches win; an off-screen match is scrolled into view first (a long roadmap, a menu sheet)
      const h=await page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);const all=[...document.querySelectorAll('button,[role=button],a,div,span,label')];let best=null,ba=1e12,bestOff=null,baOff=1e12;for(const el of all){const t=(el.innerText||'').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const st=getComputedStyle(el);if(st.visibility==='hidden'||st.pointerEvents==='none')continue;const a=r.width*r.height;const off=(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth);if(off){if(a<baOff){baOff=a;bestOff=el;}}else if(a<ba){ba=a;best=el;}}if(!best&&bestOff){bestOff.scrollIntoView({block:'center'});return bestOff;}return best;},[r.source,r.flags]);
      const el=h.asElement();if(!el)throw new Error('tapText: nothing visible matches '+r);
      await page.waitForTimeout(120);const box=await el.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(opts2.wait==null?500:opts2.wait);return box;},
    async allTexts(){return page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;}).map(x=>(x.innerText||x.getAttribute('aria-label')||x.title||'').replace(/\s+/g,' ').trim()).filter(Boolean));},
    async tapCt(id,wait){const el=page.locator('[data-ct="'+id+'"]').last();await el.waitFor({state:'visible',timeout:8000});const box=await el.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(wait==null?500:wait);return box;},
    async tile(name){return b.tapText(new RegExp('^'+name+'\\n')).catch(()=>b.tapText(name));},
    async tab(name){const bt=page.locator('div[style*="position: fixed"][style*="bottom: 0px"] button',{hasText:new RegExp('^'+name+'$')}).last();await bt.waitFor({state:'visible',timeout:8000});await bt.click();await page.waitForTimeout(500);},
    async onHome(){return page.evaluate(()=>!![...document.querySelectorAll('div')].find(d=>/(^|\n)Play\n/.test(d.innerText||'')&&d.getBoundingClientRect().height<400&&d.getBoundingClientRect().height>60));},
    async tabBarVisible(){return page.locator('div[style*="position: fixed"][style*="bottom: 0px"] button',{hasText:/^Home$/}).last().isVisible().catch(()=>false);},
    // back to the Home overlay from anywhere: the tab bar where there is one, the house in the Play bar (#371),
    // the back arrow on a review, else a reload (the app always boots on Home)
    async home(){if(await b.onHome())return;
      const vis=async(sel)=>page.locator(sel).last().isVisible().catch(()=>false);
      const has=async(re)=>page.evaluate((s)=>{const r=new RegExp(s);return [...document.querySelectorAll('button')].some(x=>r.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);},re.source);
      if(await has(/^‹ Home$/)){await b.tapText(/^‹ Home$/);}                 // the Play setup sheet (covers the tab bar)
      else if(await vis('[data-ct="play-home"]')){await b.tapCt('play-home');} // a live game: the house in the top bar (#371)
      else if(await vis('[data-ct="rev-back"]')){await b.tapCt('rev-back');await b.settle(300);}
      if(!(await b.onHome())){try{await page.locator('div[style*="position: fixed"][style*="bottom: 0px"] button',{hasText:/^Home$/}).last().click({timeout:2500});}catch(e){}}
      if(!(await b.onHome())){await b.open();}
      await page.waitForTimeout(300);},
    // the painted board: the CSS grid with repeat(8, …) columns; returns geometry and orientation
    async board(){return page.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.w){const kids=[...e.children].slice(0,64);const bl=kids[56]?(kids[56].innerText||''):'';const br=kids[63]?(kids[63].innerText||''):'';const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);best={x:r.left,y:r.top,w:r.width,h:r.height,sq:r.width/8,flip,kids:e.children.length};}}return best;});},
    async sqCenter(sq){const bd=await b.board();if(!bd)throw new Error('no board on screen');const {f,r}=sq2xy(sq);const col=bd.flip?7-f:f,row=bd.flip?r:7-r;return {x:bd.x+(col+0.5)*bd.sq,y:bd.y+(row+0.5)*bd.sq,bd};},
    async tapSq(sq){const c=await b.sqCenter(sq);await page.mouse.click(c.x,c.y);await page.waitForTimeout(160);return c;},
    async move(from,to,wait){await b.tapSq(from);await b.tapSq(to);await page.waitForTimeout(wait==null?450:wait);},
    // overflow the way the fit loop measures it: bottom-most laid-out child of #root vs the viewport (#354)
    async over(){return page.evaluate(()=>{const root=document.getElementById('root');let bottom=0;const walk=(el,depth)=>{for(const c of el.children){const st=getComputedStyle(c);if(st.position==='fixed'||st.position==='absolute')continue;const r=c.getBoundingClientRect();if(r.height>0)bottom=Math.max(bottom,r.bottom);if(depth<4)walk(c,depth+1);}};walk(root,0);return {bottom:Math.round(bottom*10)/10,vh:innerHeight,over:Math.round((bottom-innerHeight)*10)/10,scrollY:Math.round(scrollY),docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight)};});},
    async metrics(){const board=await b.board(),over=await b.over();return {board:board?{w:Math.round(board.w*10)/10,top:Math.round(board.y*10)/10,left:Math.round(board.x*10)/10,flip:board.flip}:null,over,vw:geo.w,vh:geo.h,errs:errs.length};},
    async texts(){return page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>(x.innerText||x.getAttribute('aria-label')||x.title||'').replace(/\s+/g,' ').trim()).filter(Boolean));},
    async cts(){return page.evaluate(()=>[...document.querySelectorAll('[data-ct]')].map(x=>{const r=x.getBoundingClientRect();return x.getAttribute('data-ct')+'@'+Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height);}));},
    async rect(sel){return page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,text:(e.innerText||'').slice(0,80)};},sel);},
    async text(sel){return page.evaluate((s)=>{const e=document.querySelector(s);return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;},sel);},   // the FULL text (rect() keeps 80 chars)
    async shot(name,o={}){fs.mkdirSync(SHOTS,{recursive:true});const p=path.join(SHOTS,name+'.png');await page.screenshot(Object.assign({path:p},o));return p;},
    // open the Preview gallery from Home and run one card by its id token (e.g. 'k10'), holding for `hold` ms
    // id may be an item id ('k10'; the FIRST card with that id), a card number (4 -> the 4th card) or a RegExp on the card title
    async card(id,hold){await b.home();const gb=page.locator('button[title="Preview gallery (dev)"]');await gb.waitFor({state:'visible',timeout:8000});await gb.click();await page.waitForTimeout(400);
      const re=id instanceof RegExp?id:(typeof id==='number'?new RegExp('^'+id+' · '):new RegExp('^\\d+ · '+String(id).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' · '));
      const c=page.locator('button',{hasText:re}).first();await c.waitFor({state:'visible',timeout:8000});await c.click();await page.waitForTimeout(hold==null?1500:hold);},
    async cardTitles(){await b.home();const gb=page.locator('button[title="Preview gallery (dev)"]');await gb.click();await page.waitForTimeout(400);const t=await page.evaluate(()=>[...document.querySelectorAll('button')].map(x=>(x.innerText||'').split('\n')[0]).filter(x=>/^\d+ · /.test(x)));await page.locator('button',{hasText:/^✕$/}).last().click();return t;},
    async close(){try{await browser.close();}catch(e){}}
  };
  return b;
}
let _fails=0,_pass=0;
function say(ok,msg,detail){const line=(ok?'PASS ':'FAIL ')+msg+(detail!==undefined?'  ['+(typeof detail==='string'?detail:JSON.stringify(detail))+']':'');console.log(line);if(ok)_pass++;else _fails++;return ok;}
function note(msg){console.log('     '+msg);}
function done(label){console.log((label||'GATE')+': '+_pass+' pass, '+_fails+' fail');if(_srv)_srv.close();process.exit(_fails?1:0);}
async function run(fn,label){try{await fn();}catch(e){say(false,'harness threw: '+(e&&e.stack?e.stack.split('\n').slice(0,3).join(' | '):e));}done(label);}
module.exports={launch,serve,say,note,done,run,GEOS,ROOT,SHOTS,NET_NOISE};
