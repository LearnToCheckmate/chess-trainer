'use strict';
// gates/regress/148-player-words.js - A PLAYER SEES NO DEVELOPER TOOLS AND NO DEVELOPER WORDS. US-R156 / TC-R224a..o.
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
// CONTROL-RECORD: e599269 2026-11-14 total=48 red=3 scope=trial:701fa8c609b0 how=#550 helper app A, TXT-36/TXT-40 (TC-R224m/n, Kunal's q46/q47): e599269's tree - chess.jsx built as the trial, lessons.js and index.html read from that tree (CT_LESSONS, CT_INDEX) - the dash line red (bundle 'No tactic to spot here \u2014 ...', lessons, page title), the British line red (analysed, centre, practise...) and the one-spelling line red (Petrov 5, Petroff 5, Maróczy 2); on d3 1a65030ba57a 48/0
// CONTROL-RECORD: 54e83e1 2026-11-14 total=48 red=2 scope=env:CT_LESSONS=54e83e1,trial:7a1ff10f131c how=#550 helper app A, checker seat 2's TXT-36 finding: the strengthened TC-R224n (hyphen after a word matches, a stem inside a compound, plain Maroczy must be 0) over 54e83e1's own lessons.js - both TC-R224n lines red (outmanoeuvre x2, centre-pawn, Maroczy-style, Maroczy-type); on the fixed lessons.js 48/0
// CONTROL-RECORD: 6e02e303 2026-11-20 total=70 red=1 scope=trial:0075dfcc49e3 how=batch 13 red repair B3: the batch 13 head as it is, its game card painting an unknown move count as an en dash (df0a8230, gstat '!! \u2013') - the TC-R224m dash line red alone; the code fixed to a plain hyphen (trial:e55da891cac1) 70 pass 0 fail
// CONTROL-RECORD: aaa691a 2026-11-19 total=23 red=6 scope=env:CT_G148_ONLY=o,trial:fcc6f271332f how=batch 13 wording check, the two items held for layout (TC-R224o): 589563c's tree built as a trial, before the change - at kunal761 the caption reads 'Openings & endgames' where the long words fit (3 lines red: the caption, the width, the return to Home), at se the width line red, and the Show button has no name at both; on bbd39ed5bdf9 23/0
// CONTROL-RECORD: 3235ab93 2026-11-25 total=31 red=4 scope=env:CT_G148_ONLY=o,trial:e55d3cacf8aa how=#553 B2, the re-keyed TC-R224o on the tree before the fix (e370bd84, FitLine measured before Home's 0.85 scale): se reads the short caption where the long words fit (161.2 in 162) - the se caption, se width-follow, se back-on-Home and kunal761 width-follow lines red; se x1.25 green (short there anyway). The landing subset's own red (553-subset-148-player-words.log, the old se pin, bundle be76d5228242) is the same defect
// CONTROL-RECORD: d8c5414e 2026-11-25 total=30 red=6 scope=env:CT_G148_ONLY=o,trial:3d2bb4da7f95 how=#553 B2, the pair's always-SHORT break (caption-always-short: no FitLine, the short words everywhere): red 3 at kunal761 and 3 at se, the LONG pins; se x1.25 green
// CONTROL-RECORD: d8c5414e 2026-11-25 total=30 red=3 scope=env:CT_G148_ONLY=o,trial:90de22a0bf7f how=#553 B2, the pair's always-LONG break (caption-never-falls-back: the long words painted whether or not they fit): red 3 at se x1.25 (201.3 px of words cut in a 162 px box), green at 1x where they fit
// ON THE REAL TREE after the re-key: 78 pass, 0 fail twice (trial a017c3eaa6ec, 95a1c0c6 + 3235ab93, 25 Nov 2026, 57 s and 58 s)
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
  /* ── O: batch 13, jobs/wording-check-2026-11-12, the two items #550 held for layout (TC-R224o), at his phone and at 320x568.
     TXT-32: on a phone Home's Discover caption read 'Openings & endgames' at every width, because the long words measured 161px against a
     136px slot at 320. It now reads 'Openings, tactics, endgames' wherever those words fit on the one line and the short caption where they
     do not. The gate measures the fit ITSELF (the long words in the caption's own font against the tile's inner width), pins which of the
     two each geometry gets, and checks the words painted are whole (scrollWidth against clientWidth: an ellipsis is a cut).
     The Show button: the phone puzzle row keeps the short word '👁 Show' (the three long labels need 268px and share 196 at 320 and 251 at
     375), so the line checked is its NAME: 'Show move', the name every other Show button carries.
     Every line starts with its geometry, so gates/pairs can grade each on its own. CT_G148_ONLY=o runs this block alone. */
  {const Z=require('../drive/puzzles');
   const LONG='Openings, tactics, endgames',SHORT='Openings & endgames';
   /* #553 B2 (amber flags/amber-553-discover-caption-re-measures-after-home-scales): se MOVED FROM SHORT TO LONG. Since Q13 (e5435040) Home is drawn
      at 0.85 at 320x568, so the caption's room is 162 CSS px against 161.2 of long words (it was 136); the app kept the short words there only
      because FitLine measured before the scale landed. Measured on the fix (trial a017c3eaa6ec), the room at every phone width: se 162,
      w360 186, kunal 184, short375 194, kunal761 164, 390 171 - the long words fit at all of them at 1x. So THE SHORT BRANCH IS DRIVEN BY
      LARGER TEXT: case 'se125' is se with every text x1.25 (gates/drive/textscale.js, as gate 241), where the long words are 201.3 px
      against 162 and the short caption must show. Its lines are the same TC-R224o caption lines; the puzzle-row lines run at 1x only. */
   const CASES=[{tag:'kunal761',geo:'kunal761',S:1,want:LONG},{tag:'se',geo:'se',S:1,want:LONG},{tag:'se125',geo:'se',S:1.25,want:SHORT}];
   const TS=require('../drive/textscale');
   const caps=(b)=>b.page.evaluate((LONG)=>{const o={};for(const k of ['learn','puzzle','analyze','play']){const e=document.querySelector('[data-ct="tile-sub-'+k+'"]');if(!e){o[k]=null;continue;}
       const cs=getComputedStyle(e),bt=e.closest('button'),bcs=getComputedStyle(bt),r=e.getBoundingClientRect();
       const sp=document.createElement('span');sp.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:'+cs.font+';letter-spacing:'+cs.letterSpacing;sp.textContent=LONG;document.body.appendChild(sp);const lw=sp.getBoundingClientRect().width;sp.remove();
       o[k]={text:e.textContent,cw:e.clientWidth,sw:e.scrollWidth,h:Math.round(r.height*10)/10,line:parseFloat(cs.fontSize)*1.4,slot:bt.clientWidth-parseFloat(bcs.paddingLeft)-parseFloat(bcs.paddingRight),longW:Math.round(lw*10)/10,
         onScreen:r.width>1&&r.bottom>0&&r.top<innerHeight,tileH:Math.round(bt.getBoundingClientRect().height*10)/10};}return o;},LONG);
   const whole=(c)=>!!c&&c.sw<=c.cw&&c.h<=c.line+1.5;
   for(const CS of CASES){const {geo,tag}=CS;const WANT={[geo]:CS.want};
    const b=await L.launch({geo,name:'pw148-fit-'+tag,dev:false});if(CS.S!==1)await TS.install(b,CS.S);await b.open();await b.settle(400);
    if(CS.S!==1){const ts=await TS.stats(b);L.say(ts.scale===CS.S&&ts.scaled>10,tag+' TC-R224o PRECONDITION the text is x'+CS.S+' ('+ts.scaled+' elements scaled)',ts);}
    const c=await caps(b);const d=c.learn;
    L.say(!!d&&d.onScreen&&['puzzle','analyze','play'].every(k=>c[k]&&c[k].text.length>3),tag+' TC-R224o PRECONDITION Home is on screen with its four tile captions ('+['learn','puzzle','analyze','play'].map(k=>c[k]?c[k].text:'missing').join(' | ')+')',c);
    const fits=!!d&&d.longW<=d.slot;
    L.say(!!d&&d.longW>100&&d.slot>100&&fits===(WANT[geo]===LONG),tag+' TC-R224o PRECONDITION the gate\'s own measurement: the long caption is '+(d&&d.longW)+'px in the caption\'s font and the tile gives it '+(d&&d.slot)+'px, so it '+(fits?'fits':'does not fit')+' here (pinned: '+(WANT[geo]===LONG?'fits':'does not fit')+' at '+geo+')',d);
    L.say(!!d&&d.text===WANT[geo],tag+' TC-R224o TXT-32 Discover\'s caption reads "'+WANT[geo]+'" ('+(WANT[geo]===LONG?'the long words fit, so it names tactics':'the long words do not fit, so the short caption')+'); it reads "'+(d&&d.text)+'"',d);
    L.say(whole(d),tag+' TC-R224o TXT-32 the caption is whole on one line: '+(d&&d.sw)+'px of words in a '+(d&&d.cw)+'px box, '+(d&&d.h)+'px tall (a cut caption paints an ellipsis)',d);
    const others=['puzzle','analyze','play'];
    L.say(others.every(k=>whole(c[k]))&&others.every(k=>c[k]&&d&&c[k].tileH===d.tileH),tag+' TC-R224o TXT-32 the other three captions are whole too and all four tiles are one height ('+['learn',...others].map(k=>c[k]&&c[k].tileH).join(', ')+'), so the caption cost Home no height',c);
    /* a new width is measured again, both ways (a caption decided once at the first paint would keep the wrong words after a turn or a resize) */
    const other=L.geoIs(geo,320,568)?{w:375,h:761,want:CS.S===1?LONG:SHORT}:{w:320,h:568,want:LONG};   /* #553: at 1x the long words fit at both widths now; at x1.25 at neither (201 against 164 at 375) */
    await b.page.setViewportSize({width:other.w,height:other.h});await b.settle(700);const c2=await caps(b);
    await b.page.setViewportSize({width:L.GEOS[geo].w,height:L.GEOS[geo].h});await b.settle(700);const c3=await caps(b);
    L.say(!!c2.learn&&c2.learn.text===other.want&&whole(c2.learn)&&!!c3.learn&&c3.learn.text===WANT[geo]&&whole(c3.learn),tag+' TC-R224o TXT-32 the caption follows the width: at '+other.w+' wide it reads "'+(c2.learn&&c2.learn.text)+'", and back at '+L.GEOS[geo].w+' "'+(c3.learn&&c3.learn.text)+'", whole both times',{c2:c2.learn,c3:c3.learn});
    if(CS.S!==1){L.say(b.errs.length===0,tag+' TC-R224o zero app errors',b.errs.slice(0,3));await b.close();continue;}   /* larger text: the caption lines only */
    /* the phone puzzle row */
    let row=null;try{await Z.states.train(b);await b.settle(300);
      row=await b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&(/\u{1F441}/u.test(x.innerText||'')||(x.closest('[data-ct="pz-bottom"]')&&x.getAttribute('aria-label')==='Show move'));})   /* batch 13: the phone row's Show is the eye icon (an svg), no words */
        .map(x=>{const rg=document.createRange();rg.selectNodeContents(x);const ir=rg.getBoundingClientRect(),r=x.getBoundingClientRect();return {text:(x.innerText||'').trim(),name:x.getAttribute('aria-label'),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,ink:Math.round(ir.width*10)/10,inside:ir.left>=r.left-0.5&&ir.right<=r.right+0.5};}));}catch(e){L.note(geo+' puzzle row: '+String(e).slice(0,160));}
    L.say(!!row&&row.length===1&&/^(\u{1F441} Show( move)?|)$/u.test(row[0].text),tag+' TC-R224o PRECONDITION a training puzzle is open and its row carries one Show button, found by its eye ('+(row?row.map(x=>x.text).join(' | '):'none')+')',row);
    L.say(!!row&&row.length===1&&row[0].name==='Show move',tag+' TC-R224o the puzzle row\'s Show button is NAMED "Show move", the name every other Show button carries; its name is '+JSON.stringify(row&&row[0]&&row[0].name),row);
    L.say(!!row&&row.length===1&&row[0].inside&&row[0].h===44,tag+' TC-R224o and its icon (words before batch 13) is whole inside a 44px button ('+(row&&row[0]&&row[0].ink)+'px of ink in '+(row&&row[0]&&row[0].w)+'px)',row);
    /* back on Home after another screen was up: the caption is still the right one (a caption measured while Home was hidden would be wrong here) */
    let c4=null;try{await b.home();await b.settle(500);c4=await caps(b);}catch(e){L.note(geo+' home again: '+String(e).slice(0,120));}
    L.say(!!c4&&!!c4.learn&&c4.learn.onScreen&&c4.learn.text===WANT[geo]&&whole(c4.learn),tag+' TC-R224o TXT-32 back on Home after a puzzle the caption still reads "'+WANT[geo]+'", whole ("'+(c4&&c4.learn&&c4.learn.text)+'")',c4&&c4.learn);
    L.say(b.errs.length===0,tag+' TC-R224o zero app errors',b.errs.slice(0,3));
    await b.close();}
   if(process.env.CT_G148_ONLY==='o')return;}
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
    ['TXT-37 no engine internals on the analysing screen',['checking every move','engines side by side','This takes a few seconds.'],['Analyzing move ','Keep the app open']]];   /* #553 (jobs/long-reviews-keep-running-in-the-app-...-2026-11-22): the waiting screen's words; 'a few seconds' was untrue at Deepest */
  for(const [tag,old,neu] of TXT){const o=old.filter(s=>src.indexOf(s)>=0),n=neu.filter(s=>src.indexOf(s)<0);
    L.say(o.length===0&&n.length===0,'TC-R224l '+tag+' (old left: '+(o.join(' / ')||'none')+'; new missing: '+(n.join(' / ')||'none')+')',{o,n});}
  /* #550 wording check TXT-36 and TXT-40, Kunal's answers run-answers q46 and q47: US spelling everywhere (the lesson names included) and no
     em or en dash in any player-facing text, the page title included. Read over the three places a player's words come from: the bundle's
     strings, lessons.js (every lesson's name, idea, notes and plans) and index.html outside its comments, styles and scripts. The only
     dashes allowed are inside a regex character class (the move-name sanitiser's [\s(—–-] and the solve line's [,—]), which
     strip a dash from text a player pasted and are code, not words. */
  {const ROOT=path.join(__dirname,'..','..');
   const lessons=fs.readFileSync(process.env.CT_LESSONS||path.join(ROOT,'lessons.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/[^\n]*/g,'$1');
   const index=fs.readFileSync(process.env.CT_INDEX||path.join(ROOT,'index.html'),'utf8').replace(/<!--[\s\S]*?-->|<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g,'');
   const appTxt=src.replace(/\[[^\]\n"'`]{0,60}(?:—|\\u2014)[^\]\n"'`]{0,60}\]/g,'')
     /* and the one map whose KEYS are the old spellings on purpose: VAR_RENAMED, the progress migration from the British variation names (its
        values are the new names, so a reader still sees only US words) */
     .replace(/\{"Two Knights Defence":[^}]*\}/,'{}');
   const DASH=/—|–|\\u2014|\\u2013/g;
   const dashes=(t)=>{const o=[];let m;DASH.lastIndex=0;while((m=DASH.exec(t))&&o.length<6)o.push(t.slice(Math.max(0,m.index-40),m.index+30).replace(/\s+/g,' '));return o;};
   const BRIT=/(?<![-\/_.A-Za-z0-9])(centre|centres|centred|centring|centralis(?:e|ed|es|ing|ation)|defences?|manoeuvr(?:e|es|ed|ing)|favourites?|favour(?:s|ed|ing|able|ably)?|colours?|coloured|colourful|neighbour(?:s|ing)?|practis(?:e|ed|es|ing)|analys(?:e|ed|ing)|neutralis(?:e|ed|es|ing)|memoris(?:e|ed|ing)|equalis(?:e|ed|es|ing)|recognis(?:e|ed)|realis(?:e|ed)|organis(?:e|ed)|learnt|whilst|behaviour|honour|armour|fianchettos|Maroczy)(?![\/_A-Za-z0-9])/gi;   /* #550 checker seat 2's finding: a following HYPHEN is a word boundary here (centre-pawn, Maroczy-style were missed) */
   const brits=(t)=>{const o=[];let m;BRIT.lastIndex=0;while((m=BRIT.exec(t))&&o.length<6)o.push(m[1]+' @ '+t.slice(Math.max(0,m.index-30),m.index+20).replace(/\s+/g,' '));return o;};
   /* and a British stem INSIDE a compound (outmanoeuvre was missed: the lookbehind refuses a letter before the word) */
   const BRIT_IN=/manoeuvr|centre(?=[-\s.,;:!?)'"])|colour|favour/gi;
   const britsIn=(t)=>{const o=[];let m;BRIT_IN.lastIndex=0;while((m=BRIT_IN.exec(t))&&o.length<6)o.push(m[0]+' @ '+t.slice(Math.max(0,m.index-30),m.index+20).replace(/\s+/g,' '));return o;};
   const dl=[...dashes(appTxt).map(x=>'app: '+x),...dashes(lessons).map(x=>'lessons: '+x),...dashes(index).map(x=>'index: '+x)];
   L.say(lessons.length>50000&&index.length>500,'TC-R224m PRECONDITION lessons.js and index.html were read ('+lessons.length+' and '+index.length+' chars)');
   L.say(dl.length===0,'TC-R224m TXT-40 no em or en dash in any player-facing text: bundle strings, lessons and the page ('+(dl.slice(0,3).join(' | ')||'none')+')',dl);
   const bl=[...brits(appTxt).map(x=>'app: '+x),...brits(lessons).map(x=>'lessons: '+x),...brits(index).map(x=>'index: '+x),...britsIn(lessons).map(x=>'lessons (in a compound): '+x)];
   L.say(bl.length===0,'TC-R224n TXT-36 no British spelling in any player-facing text, lesson names included ('+(bl.slice(0,3).join(' | ')||'none')+')',bl);
   const pet=(lessons.match(/Petrov\b/g)||[]).length,petf=(lessons.match(/Petroff\b/g)||[]).length,mar=(lessons.match(/Maróczy/g)||[]).length,marP=(lessons.match(/Maroczy/g)||[]).length;
   L.say(pet===0&&petf>0&&mar>0&&marP===0,'TC-R224n and one spelling each: Petroff ('+petf+', Petrov '+pet+'), Maróczy ('+mar+', plain Maroczy '+marP+')',{pet,petf,mar,marP});}

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
