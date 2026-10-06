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
const fs=require('fs'),path=require('path'),cp=require('child_process'),net=require('net'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const SHOTS=process.env.CT_SHOTS||path.join(__dirname,'shots');
const NET_NOISE=/ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_FAILED|net::ERR|gstatic|googleapis|firebase|Failed to load resource/i;
const BLOCK=/gstatic\.com|googleapis\.com|firebaseio|firebase\.com|api\.chess\.com|lichess\.org|fonts\.g|google-analytics|googletagmanager|cloudfunctions/;
// Kunal's phone is 375x761 with insets 51/31 = 375x679 USABLE. Emulate it as a 375x679 viewport with NO ct_safe:
// the 679 already is the usable area, and ct_safe would make the app subtract the insets a second time (measured
// 2026-09-12: with both, the review board is 293 instead of the 349 his phone shows; with 679 alone, 349 and the
// Pass & Play board 351, both matching HANDOFF). 'kunal761' is the other emulation (full height + ct_safe), kept for
// cross-checks; its Play numbers differ because headless Chromium has no real env() padding.
// 2026-09-13, from Kunal and his feedback session: his phone's LAYOUT VIEWPORT is 375x730. The 679 came from a
// readout that subtracted the 51pt status bar a second time, and two sessions made that mistake independently.
// 'kunal730' is the real phone and new gates should use it; 'kunal' stays 375x679 as the shorter-phone column
// until each existing assertion has been re-measured at 730 deliberately, one gate at a time, rather than having
// every expected number change at once inside an unrelated build.
const GEOS={kunal730:{w:375,h:730,safe:'',label:'375x730 = Kunal\'s real phone'},kunal:{w:375,h:679,safe:'',label:'375x679 = shorter-phone column'},kunal761:{w:375,h:761,safe:'51,31',label:'375x761 with ct_safe 51,31'},'390':{w:390,h:844,safe:'',label:'390x844'},'430':{w:430,h:932,safe:'',label:'430x932'},se:{w:320,h:568,safe:'',label:'320x568'},
// #406, from SIT run 5: "a geometry list has TWO axes and this project has only ever laddered one". Every
// geometry above either is narrow AND short or wide AND tall, so NO size in this list, in the headless UAT's
// nine, or in #404's own sweep table had width >= 360 AND height <= 600. That corner is where the lesson
// board - which is fit to HEIGHT - stays 270.88px wide while the viewport is 375 or 390 wide, so a row sized
// to the board overhangs a screen nothing can scroll. Measured there: the counted "Other lines (2)" button ran
// 18.91px off a 360x568 screen, 11.41px off 375x568 and 3.91px off 390x568, unchanged from #403, while #404's
// viewport-width threshold could not reach it by construction. `short375` is that corner, and it is a real
// phone shape: a 375-wide device in a browser with a large toolbar, or any 16:9 Android at 375dp.
short375:{w:375,h:568,safe:'',label:'375x568 = the wide-and-short corner nothing used to cover'}};

// #480. WHAT THIS CONTAINER IS, PRINTED INTO EVERY LOG, BECAUSE THE PINS DEPEND ON IT AND NOTHING RECORDED IT.
// gates/package.json pins esbuild, react and react-dom and NO BROWSER. pw() below resolves whatever playwright
// the image happens to carry, so every absolute pixel assertion in this suite is a function of an unrecorded
// variable. MEASURED 2026-10-06 on ONE bundle (origin/main's own app.js, md5 fb10dbef9591): gate 12-hint reads
// the puzzle board 361 wide at 375x679 in this container and 375 in the logs committed for #475, #476 and #477,
// and the full suite reddened ELEVEN sections, ten of them pins that moved. Two containers, one bundle, two
// verdicts, and no artefact in the repository could tell the two apart - so a run could not know whether its
// red was its own change or its machine, and two consecutive runs spent a build slot finding that out.
//
// THE CAUSE, measured rather than hypothesised: the app asks for `system-ui, -apple-system, Segoe UI, Roboto,
// sans-serif` (index.html:59) and `'Segoe UI',system-ui,sans-serif` (chess.jsx, many sites). In THIS container
// fc-list carries 103 fonts and NONE matches "segoe", and fc-match resolves BOTH `Segoe UI` and `system-ui` to
// Inter. Inter is about 7.2% wider than Chromium's own sans-serif default here: the reference string below
// measures 373.42px under the app's stack against 348.28px under bare sans-serif, a 25.14px spread on one line.
// Gate 48's failure is a two-track min-content row short by 23.82px, which is the same quantity and order.
//
// AND IT REFINES THE HYPOTHESIS IT CAME FROM, which blamed `Segoe UI` alone: `system-ui` resolves to Inter here
// too, identical to three decimals, so the variable is BOTH families collapsing onto one substituted font and
// not one missing name. That much is measured and stands.
//
// *** #485 WITHDRAWS THE REST OF THIS PARAGRAPH [R18]. *** It read: "index.html asks for `system-ui` FIRST ...
// Naming only Segoe UI would send the next reader looking for a font the app does not even ask for first on its
// primary surface." BOTH CLAUSES ARE WRONG, and the second is backwards. MEASURED: index.html's ONLY font
// declaration is at line 59, INSIDE THE `#boot` RULE - the boot splash, which is gone once the app mounts. The
// app's primary surface sets its own stack as an INLINE style on its root, `'Segoe UI', system-ui, sans-serif`
// at chess.jsx:5288, plus ~92 per-element declarations; `getComputedStyle(document.body).fontFamily` on the
// puzzle screen reads "Times New Roman", because nothing in the app styles body at all. So the app DOES ask for
// Segoe UI first, on the only surface that matters, and a reader sent to index.html lands on the splash screen.
// Recorded rather than quietly deleted because this paragraph is why six runs looked at index.html.
//
// AND THE QUANTITY NAMED BELOW IS A PROXY, NOT THE DRIVER. The width figure this function prints is real and
// comparable, but the board moves on text HEIGHT: DejaVu Sans is WIDER than Inter (402.12 against 373.42) and
// restores the pinned board exactly. See gates/fonts.conf for the full measurement and the per-clause controls.
//
// NOTE THE METHOD, because the obvious one is wrong: document.fonts.check('16px "Segoe UI"') returns TRUE in
// this container for every family tried, including families fc-list does not have at all, so it CANNOT answer
// "is this font present". Width of a fixed string is the measurement that can; two families that resolve to one
// font return the same number to three decimals. That is why this prints NUMBERS and not a boolean.
//
// THIS DOES NOT MAKE THE PINS RIGHT and it is deliberately not a fix for them. Re-pinning 375 to 361 is
// forbidden for the reason gate 40's job already gives: it destroys the evidence that the quantity is
// container-dependent, and afterwards a genuine board regression passes. Making the assertions RELATIVE is
// test-authoring's, and must not be done by a run holding the pen to unblock itself. This makes the variable
// VISIBLE IN THE ARTEFACT so the next run knows in one line whether its red is its own.
const FP_REF='It’s mate in 2 — start with the most forcing check.';  // fixed forever; the number is only comparable against itself
let _tcSaid=false,_fpSaid=false;

// #485: PIN THE FONT THE PINS WERE CALIBRATED AGAINST, BEFORE ANY BROWSER STARTS.
// The whole argument, the per-clause controls and what this does NOT claim are in gates/fonts.conf;
// read that file before changing this. Short version: these images install no face the app asks for,
// fontconfig answers the generic chain with Inter, Inter's taller line boxes make the puzzle column
// overflow, and chess.jsx's board fit loop absorbs the overflow by shrinking the board 375 -> 361.
// Seven containers in a row could not gate any tree because of it. Binding the generic chain to the
// calibration face takes gate 12-hint from 22/2 to 24/0 on origin/main's own bundle with no assertion
// touched.
// IT IS A DEFAULT ON PURPOSE. CLAUDE.md: "ask of any harness default: what does it do when I forget?"
// Forgetting here must give the DETERMINISTIC fonts, not the image's accident - a run that forgets is
// exactly the run that spends its slot rediscovering this. So it is opt-OUT, never silent, and every
// gate log says which fontconfig produced its numbers.
const FC_CONF=path.join(__dirname,'fonts.conf');
let _fcState='image default (no fontconfig pinned)';
(function pinFontconfig(){
  if(process.env.CT_NOFC==='1'){_fcState='DISABLED by CT_NOFC=1 - fonts come from the image';return;}
  if(process.env.FONTCONFIG_FILE){_fcState='caller-supplied FONTCONFIG_FILE='+process.env.FONTCONFIG_FILE;return;}
  if(!fs.existsSync(FC_CONF)){_fcState='gates/fonts.conf MISSING - fonts come from the image';return;}
  process.env.FONTCONFIG_FILE=FC_CONF;_fcState='gates/fonts.conf';
})();
function pwVersion(){
  for(const m of ['/opt/node22/lib/node_modules/playwright','playwright','playwright-core']){
    try{return require(m+'/package.json').version+' ('+m+')';}catch(e){}
  }
  return 'UNRESOLVED';
}
async function sayToolchain(browser){
  if(_tcSaid)return;_tcSaid=true;
  let cv='?';try{cv=browser.version();}catch(e){cv='unavailable: '+e.message;}
  console.log('     toolchain: playwright '+pwVersion()+'  chromium '+cv+'  [no browser is pinned in gates/package.json]');
  console.log('     fontconfig: '+_fcState+'   [#485 - every text-derived pin in this suite depends on this line]');
}
// The one number that explains a moved pixel pin. Printed once per process, so every gate section carries it.
async function sayTextMetrics(page){
  if(_fpSaid)return;_fpSaid=true;
  try{
    const r=await page.evaluate((ref)=>{
      const cv=document.createElement('canvas').getContext('2d');
      const w=(spec)=>{cv.font=spec;return +cv.measureText(ref).width.toFixed(2);};
      return {app:w('16px system-ui'),segoe:w('16px "Segoe UI"'),sans:w('16px sans-serif'),
              bogus:w('16px "CTNoSuchFamily-ZZ9"')};
    },FP_REF);
    // READ THE SENTINEL NARROWLY. An unknown family falls through to Chromium's DEFAULT (here 322.15, which is
    // Times); so app===bogus means the app's first choice fell ALL THE WAY THROUGH. It does NOT detect absence,
    // and this container is exactly why: "Segoe UI" is absent from all 103 installed fonts, yet it measures
    // 373.42 rather than 322.15, because FONTCONFIG SUBSTITUTES Inter instead of letting it fall through. So a
    // font can be missing and still produce a confident, stable, wrong-against-the-pins number. The comparable
    // artefact is the NUMBER, across containers; the sentinel only catches the fall-through case.
    const fellThrough=Math.abs(r.app-r.bogus)<0.01;
    console.log('     text metrics @16px over the reference string: system-ui '+r.app+'  "Segoe UI" '+r.segoe+
                '  sans-serif '+r.sans+'  (fall-through sentinel '+r.bogus+')'+
                (fellThrough?'  -- the app\'s first-choice family fell ALL THE WAY THROUGH to the default':''));
    if(Math.abs(r.app-r.sans)>0.5)
      console.log('     NOTE: the app\'s stack and bare sans-serif differ by '+(r.app-r.sans).toFixed(2)+
                  'px on one line here, so every absolute text-derived pin in this suite is container-dependent [#480].');
  }catch(e){console.log('     text metrics: unavailable ('+e.message+')');}
}
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
  // WHICH BUNDLE IS SERVED, SAID OUT LOUD, BECAUSE A SILENT SUBSTITUTION COST A WHOLE PASS.
  //
  // gates/.pin-app.js used to be served by DEFAULT whenever CT_APP was unset - it pinned the bundle an audit
  // was measuring while a new build landed in app.js. gates.sh always names its bundle explicitly, so the
  // suite was immune; a bare `node gates/regress/<x>.js` was not. On 2026-09-14 that trap took four ad-hoc
  // measurements against a #372 bundle from two days earlier and reported them as the current build - after
  // a written warning in gates/pending/README.md had been sitting there saying exactly that would happen.
  // A warning you have to already know to read is not a guard.
  //
  // So the pin is now OPT-IN (CT_PIN=1) and never silent, and EVERY launch prints the bundle it is serving
  // with the stamp read out of the file. If a run's output does not say what it measured, it is not evidence.
  const pinned=path.join(__dirname,'.pin-app.js');
  const usePin=process.env.CT_PIN==='1'&&fs.existsSync(pinned);
  const app=path.resolve(opts.app||process.env.CT_APP||(usePin?pinned:path.join(ROOT,'app.js')));
  try{
    const head=fs.readFileSync(app,'utf8');
    const m=head.match(/#\d{3,4} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/);
    const how=opts.app?'opts.app':(process.env.CT_APP?'CT_APP':(usePin?'CT_PIN=1 -> .pin-app.js':'default app.js'));
    // md5 BESIDE the stamp, because a stamp is not a bundle id: build.sh embeds the minute in the stamp via
    // --define:__BUILD__, so one build number can name several bundles (#439 has three) and four of eight
    // numbers on main name more than one. CLAUDE.md's rule is "cite the bundle md5"; this is where a log gets it.
    let _md5='?';try{_md5=crypto.createHash('md5').update(fs.readFileSync(app)).digest('hex').slice(0,12);}catch(e){}
    console.log('     bundle: '+path.relative(ROOT,app)+'  md5 '+_md5+'  stamp '+(m?m[0]:'NONE')+'  ('+how+')');
    if(!m)console.log('     WARNING: that bundle carries no build stamp at all.');
  }catch(e){console.log('     bundle: '+app+'  (could not be read: '+e.message+')');}
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
  await sayToolchain(browser);
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
      await page.waitForTimeout(opts.settle||900);await sayTextMetrics(page);return b;},
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
    /* #451: cardTitles() returns EVERY card in the gallery, which since #451 is Kunal's ask queue PLUS the eight
       fixed states the harness drives (chess.jsx, const TS). Gate 14 wants the whole list - it checks the US-R
       journey card exists - so cardTitles() is unchanged. askTitles() is the QUEUE only, for the gate that pins
       what Kunal is actually being asked for. Scoped by data-ct because the two lists are deliberately
       indistinguishable by title: five gates locate the state cards by their original labels and relabelling them
       would break those gates silently. */
    async askTitles(){await b.home();const gb=page.locator('button[title="Preview gallery (dev)"]');await gb.click();await page.waitForTimeout(400);const t=await page.evaluate(()=>[...document.querySelectorAll('button[data-ct="ask-card"]')].map(x=>(x.innerText||'').split('\n')[0]));await page.locator('button',{hasText:/^\u2715$/}).last().click();return t;},
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
