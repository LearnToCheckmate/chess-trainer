'use strict';
// gates/regress/148-player-words.js - A PLAYER SEES NO DEVELOPER TOOLS AND NO DEVELOPER WORDS. US-R156 / TC-R224a..l.
//
// WHY [#550, wording check docs/wording-check-2026-11-12, Kunal "Only you" and "Batch 10", 12 Nov 2026]: the preview gallery (the
// film-clapper on Home), feedback-to-Claude, the Layout readout and overlay, the New features switches, the brilliant-gate numbers, the
// build number/time/source hash and the Puzzles unlock code were shown to every player, and six error messages told a player how to fix
// the server setup. He chose to keep the tools for himself only: they appear on his own signed-in account (users/{uid}.dev === true, set
// by hand in the Firebase console; firestore.rules refuses a client write that sets it) and for the gate harness (gates/lib.js, launch
// opt `dev`, ON by default so every older gate still reaches them). This gate is the one that looks at the PLAYER view (dev:false).
// WHAT IT READS: the bundle under test (CT_APP, else app.js), at kunal761. Launch A is a signed-out player with no flag: Home, Menu, the
// Account sheet, Play setup, Puzzles, Review entry and, after one short review, the Review More sheet. Every tool is looked for by its OWN
// words and glyphs (the 🎬 button, "Preview gallery", "Layout readout", "New features", "brilliant-gate", "Unlock code", "Build #", a
// 12-hex source hash), never by a hook #550 added. Launch B is the harness default (dev on): the same tools are reachable. Launch C is
// a player whose account document carries dev:true (a stand-in CTCloud whose load() answers {dev:true}, no harness flag): the tools
// appear - the cloud path itself. Launch D is the same stand-in answering {dev:false}: they do not.
// Static half: the bundle text no longer carries the six setup-error sentences, the preview/deploy lines or the stale Correspondence line.
// KNOW ITS LIMIT: the signed-in player screens (online play, video call, board scan) are not rendered; their messages are checked as
// bundle strings only. The More sheet is reached after one review of an 8-move game.
// CONTROL-RECORD: c2e0d87 2026-11-13 total=33 red=12 scope=trial:b96f96352c90 how=#550 the branch tip before this change (claude/exciting-noether-v1swj8 c2e0d87), built as a trial: every tool shown to every player, so A (b..h), D (k) and the static half (7 of 9 sentences) go red, B and C stay green; on 3de557ab1c5e 33/0
// CONTROL-RECORD: bb29be7 2026-11-14 total=44 red=11 scope=trial:f0042ce1a984 how=#550 helper app A, wording check what was left (TC-R224l): bb29be7's tree, every TXT item's old wording still in the bundle and its replacement missing (8 static) and Home, Play setup and Review entry rendering the old words (3); on w2 54fd98fdb522 44/0
const L=require('../lib');
const fs=require('fs'),path=require('path');
const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const PGN='[White "Morphy"] [Black "Duke"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 *';
// the developer words a player must never read (rendered text, titles and aria-labels, input placeholders)
const DEV_WORDS=[/Preview gallery/i,/Layout readout/,/Layout overlay/,/^New features$/im,/brilliant-gate/i,/Unlock code/i,/dev loaders/i,
  /Dev tools/,/Build #\d+/,/#\d{3} - 20\d\d-\d\d-\d\d \d\d:\d\d ET/,/\bsrc [0-9a-f]{12}\b/,/to Claude|for Claude/,/option C/,/screenshot this/,
  /Firebase/i,/preview sandbox/i,/in this preview/i,/published app/i,/cloud function/i,/relay server/i,/build=#/];
const textOf=(b,sel)=>b.page.evaluate((s)=>{const root=s?document.querySelector(s):document.body;if(!root)return null;
  const vis=(el)=>{const r=el.getBoundingClientRect();const st=getComputedStyle(el);return r.width>1&&r.height>1&&st.visibility!=='hidden'&&st.display!=='none';};
  const extra=[...root.querySelectorAll('[title],[aria-label],input[placeholder],textarea[placeholder]')].filter(vis)
    .map(e=>[e.getAttribute('title'),e.getAttribute('aria-label'),e.getAttribute('placeholder')].filter(Boolean).join(' | '));
  return (root.innerText||'')+'\n'+extra.join('\n');},sel||null);
const hits=(t)=>DEV_WORDS.filter(re=>re.test(t||'')).map(String);
// the film-clapper button, found by its glyph
const clapper=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>(x.innerText||'').trim()==='\u{1F3AC}'&&x.getBoundingClientRect().width>1).length);
const stub=(dev)=>({dev,fn:(answer)=>{try{if(window.__ct148Stub)return;const me={uid:'u-gate-148',name:'Gate Player',email:'',photo:''};const S=window.__ct148Stub={loads:0};
  const base={ready:true,user:me,onAuth(cb){setTimeout(()=>{try{cb(me);}catch(e){}},30);},proWatch(cb){setTimeout(()=>{try{cb(false);}catch(e){}},40);return ()=>{};},
    load:async()=>{S.loads++;return answer;},save:async()=>{},signOut:async()=>{},gameList:async()=>[],friendId(){return me.uid;},
    friendsWatch(cb){setTimeout(()=>{try{cb({incoming:[],friends:[]});}catch(e){}},0);return ()=>{};},
    gameWatch:()=>()=>{},nearbyList:()=>()=>{},tourList:()=>()=>{},tourWatch:()=>()=>{},gameLeave(){},mmCancel(){}};
  const p=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null;}});
  Object.defineProperty(window,'CTCloud',{configurable:false,get(){return p;},set(v){}});}catch(e){}}});

L.run(async()=>{
  // ── STATIC: the bundle text
  const src=fs.readFileSync(APP,'utf8');
  const GONE=['the cloud function still needs to be deployed','need a relay server','Open the published app','in this preview',
    'deployed to a real site','unlocks when we put games online','Eval graph in the player bars','OFF \u00b7 option C','preview sandbox blocks'];
  const left=GONE.filter(s=>src.indexOf(s)>=0);
  L.say(src.length>100000,'TC-R224 PRECONDITION the bundle under test was read ('+src.length+' bytes, '+path.basename(APP)+')');
  L.say(left.length===0,'TC-R224a no setup-error, preview or deploy sentence and no stale Correspondence line is left in the bundle ('+left.length+' of '+GONE.length+' found)',left);
  /* #550 wording check, what was left (TXT-21, 22, 23, 27, 29, 32, 35, 37; helper app A): one name and one spelling per thing. The words
     that live in states this gate does not render (the drill header, the Coach line, the locked-style line, the analysing line, the
     Journey back, the rank unlock) are read from the bundle: each old wording gone AND its replacement present, so a bundle that lost
     the line entirely cannot pass. */
  const TXT=[['TXT-21 the mistakes drill is named once',['Your mistakes','slipped on in your games'],['Mistakes drill','Practice your mistakes: ']],
    ['TXT-22 brilliant move in sentences, Brilliant only as the grade',['Missed Brilliants','a Brilliant was on the board','Brilliancies'],['Missed brilliant moves','a brilliant move was on the board','Brilliant moves']],
    ['TXT-23 one spelling (colors) and Style for the sets',['Board colours','Colours &','are Pro skins','is a Pro skin'],['Board colors','Colors & pieces','are Pro styles','is a Pro style']],
    ['TXT-27 Journey for the screen, rank for the ladder',['Back to Roadmap','tap any tier','next puzzle tier'],['Back to Journey','All ranks unlocked','next puzzle rank']],
    ['TXT-29 the hint prompt names the button',['for a hint.)'],['Hint.)']],
    ['TXT-32 Discover names tactics, the card names its screen',['Openings, gambits & endgames'],['Openings, tactics, endgames','Tactics & strategy']],
    ['TXT-35 sentence case',['Analyze Game','New Game','Menu & settings'],['Analyze game','New game','Menu and settings']],
    ['TXT-37 no engine internals on the analysing screen',['checking every move','engines side by side'],['Checking every move','This takes a few seconds.']]];
  for(const [tag,old,neu] of TXT){const o=old.filter(s=>src.indexOf(s)>=0),n=neu.filter(s=>src.indexOf(s)<0);
    L.say(o.length===0&&n.length===0,'TC-R224l '+tag+' (old left: '+(o.join(' / ')||'none')+'; new missing: '+(n.join(' / ')||'none')+')',{o,n});}

  // ── A: the player view
  {const b=await L.launch({geo:'kunal761',name:'pw148-player',dev:false,store:{ct_pool:'3',ct_revmig339:'1'}});await b.open();
    const flag=await b.page.evaluate(()=>window.__ctDevHarness===undefined);
    L.say(flag,'TC-R224 PRECONDITION launch A carries no harness dev flag (window.__ctDevHarness undefined)');
    const home=await textOf(b);
    L.say(/Review/.test(home||'')&&/Puzzles/.test(home||''),'TC-R224 PRECONDITION Home is on screen (its tiles read)',(home||'').slice(0,120));
    const cl=await clapper(b);
    L.say(cl===0,'TC-R224b Home: no film-clapper (preview gallery) button ('+cl+' found)');
    L.say(hits(home).length===0,'TC-R224b Home: no developer words ('+hits(home).join(', ')+')',hits(home));
    let menu=null;try{await b.tapCt('home-menu',800);await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-sheet"] [data-ct="menu-foot"]');if(e&&e.getAttribute('aria-expanded')==='false')e.click();});await b.settle(350);menu=await textOf(b,'[data-ct="menu-sheet"]');}catch(e){L.note('menu: '+e);}   // #550 jobs/build-menu-one-screen: read WITH the fold behind the foot line open, so a dev word moved behind it is still seen
    L.say(!!menu&&/Sound/.test(menu)&&/Look and feel/.test(menu),'TC-R224 PRECONDITION the Menu sheet is open (it reads Sound and Look and feel; #550: Piece style moved to the Look screen)');
    L.say(!!menu&&hits(menu).length===0,'TC-R224c Menu: no Layout readout or overlay, no New features switches, no build stamp, no feedback-to-Claude ('+hits(menu).join(', ')+')',hits(menu||''));
    L.say(!!menu&&/Evaluation graph/.test(menu),'TC-R224c Menu: the graph switch reads "Evaluation graph"');
    const ver=(menu||'').match(/Version (\d+)/);
    L.say(!!ver,'TC-R224d Menu foot: one quiet "Version NNN" line ('+(ver?ver[0]:'none')+')');
    L.say(!/Send feedback/.test(menu||''),'TC-R224c Menu: no Send feedback row (it copies a note for Claude\'s chat; there is no support address yet)');
    await b.page.keyboard.press('Escape');await b.settle(400);await b.home();
    let acct=null;try{await b.page.locator('button[title="Sign in"]').first().click();await b.settle(700);acct=await textOf(b);}catch(e){L.note('account: '+e);}
    L.say(!!acct&&/Sign in|Sign-in/.test(acct),'TC-R224 PRECONDITION the Account sheet opened');
    L.say(!!acct&&hits(acct).length===0,'TC-R224e Account sheet: no "published app" or setup words ('+hits(acct||'').join(', ')+')',hits(acct||''));
    await b.page.keyboard.press('Escape');await b.settle(300);
    try{await b.page.reload();await b.settle(1200);}catch(e){}
    let setup=null;try{await b.tile('Play');await b.settle(800);setup=await textOf(b);}catch(e){L.note('play: '+e);}
    L.say(!!setup&&/Computer/.test(setup)&&/Pass & Play/.test(setup),'TC-R224 PRECONDITION Play setup is on screen');
    L.say(!!setup&&hits(setup).length===0,'TC-R224f Play setup: no build stamp or developer words ('+hits(setup||'').join(', ')+')',hits(setup||''));
    try{await b.page.reload();await b.settle(1200);}catch(e){}
    let pz=null;try{await b.tile('Puzzles');await b.settle(900);pz=await textOf(b);}catch(e){L.note('puzzles: '+e);}
    L.say(!!pz&&/Free play/.test(pz),'TC-R224 PRECONDITION the Puzzles road is on screen (Free play reads)');
    const pin=await b.page.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>/Unlock code|\u{1F511}/u.test(i.placeholder||'')).length);
    L.say(pin===0&&!!pz&&hits(pz).length===0,'TC-R224g Puzzles: no unlock-code box, no dev loaders ('+pin+' code boxes; '+hits(pz||'').join(', ')+')',hits(pz||''));
    try{await b.page.reload();await b.settle(1200);}catch(e){}
    let rv=null,more=null;
    try{await b.tile('Review');await b.settle(700);rv=await textOf(b);
      await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:300});
      await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(500);
      await b.tapText(/^Start review/,{wait:900}).catch(()=>{});await b.settle(600);
      await b.tapCt('rev-more',800);await b.settle(400);more=await textOf(b);}catch(e){L.note('review: '+String(e).slice(0,160));}
    L.say(!!rv&&hits(rv).length===0,'TC-R224h Review entry: no developer words ('+hits(rv||'').join(', ')+')',hits(rv||''));
    /* and the same words as rendered, on the screens launch A already opens */
    L.say(/Colors & pieces/.test(home||'')&&!/Colours/.test(home||''),'TC-R224l TXT-23 rendered: Home\'s look chip reads Colors & pieces');
    L.say(/New game/.test(setup||'')&&!/New Game/.test(setup||''),'TC-R224l TXT-35 rendered: the Play setup title reads New game');
    L.say(/Analyze game/.test(rv||'')&&!/Analyze Game/.test(rv||''),'TC-R224l TXT-35 rendered: the Review entry button reads Analyze game');
    L.say(!!more&&/Flip board/.test(more),'TC-R224 PRECONDITION the Review More sheet is open (Flip board reads)');
    L.say(!!more&&hits(more).length===0,'TC-R224h Review More sheet: no brilliant-gate numbers row ('+hits(more||'').join(', ')+')',hits(more||''));
    L.say(b.errs.length===0,'TC-R224 launch A: zero app errors',b.errs.slice(0,3));
    await b.close();}

  // ── B: the harness default (dev on) reaches the tools
  {const b=await L.launch({geo:'kunal761',name:'pw148-dev'});await b.open();
    const home=await textOf(b);const cl=await clapper(b);
    L.say(cl>=1&&/Build #\d+/.test(home||''),'TC-R224i dev on: Home carries the film-clapper and the build stamp ('+cl+' clapper)');
    let gal=null;try{await b.page.locator('button[title="Preview gallery (dev)"]').first().click();await b.settle(600);gal=await textOf(b);}catch(e){}
    L.say(!!gal&&/Preview gallery/.test(gal),'TC-R224i dev on: the clapper opens the Preview gallery');
    try{await b.page.reload();await b.settle(1200);}catch(e){}
    let menu=null;try{await b.tapCt('home-menu',800);await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-sheet"] [data-ct="menu-foot"]');if(e&&e.getAttribute('aria-expanded')==='false')e.click();});await b.settle(350);menu=await textOf(b,'[data-ct="menu-sheet"]');}catch(e){}
    L.say(!!menu&&/Layout readout/.test(menu)&&/Layout overlay/.test(menu)&&/^New features$/im.test(menu)&&/Build #\d+/.test(menu)&&/Send feedback/.test(menu),'TC-R224i dev on: the Menu carries Layout readout, Layout overlay, New features, Send feedback and the full build stamp');
    try{await b.page.reload();await b.settle(1200);}catch(e){}
    let pin=0;try{await b.tile('Puzzles');await b.settle(900);pin=await b.page.evaluate(()=>[...document.querySelectorAll('input')].filter(i=>/Unlock code/.test(i.placeholder||'')).length);}catch(e){}
    L.say(pin===1,'TC-R224i dev on: the Puzzles road carries the unlock-code box ('+pin+')');
    L.say(b.errs.length===0,'TC-R224 launch B: zero app errors',b.errs.slice(0,3));
    await b.close();}

  // ── C and D: the account document decides (no harness flag)
  for(const [dev,tc] of [[true,'TC-R224j'],[false,'TC-R224k']]){
    const b=await L.launch({geo:'kunal761',name:'pw148-cloud-'+dev,dev:false});const s=stub(dev);await b.ctx.addInitScript(s.fn,{dev:s.dev});await b.open();await b.settle(1500);
    const st=await b.page.evaluate(()=>({loads:window.__ct148Stub?window.__ct148Stub.loads:-1,h:window.__ctDevHarness}));
    L.say(st.loads>=1&&st.h===undefined,tc+' PRECONDITION the stand-in account was loaded ('+st.loads+' loads) and no harness flag is set');
    const cl=await clapper(b);let menu=null;try{await b.tapCt('home-menu',800);await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-sheet"] [data-ct="menu-foot"]');if(e&&e.getAttribute('aria-expanded')==='false')e.click();});await b.settle(350);menu=await textOf(b,'[data-ct="menu-sheet"]');}catch(e){}
    const on=cl>=1&&!!menu&&/Layout readout/.test(menu);const off=cl===0&&!!menu&&!/Layout readout/.test(menu)&&hits(menu).length===0;
    L.say(dev?on:off,tc+' users/{uid}.dev = '+dev+': the developer tools are '+(dev?'shown':'hidden')+' ('+cl+' clapper; readout '+(!!menu&&/Layout readout/.test(menu))+')');
    L.say(b.errs.length===0,tc+' zero app errors',b.errs.slice(0,3));
    await b.close();}
},'148-player-words');
// SELECTOR-OPENED: menu-foot reading=precondition #550 lead, opened by reading: the fold opens only through this hook, and TC-R224c's 'Evaluation graph' line sits behind it, so a missing hook leaves the fold shut and that line reds
