// regress/28-scan-client.js  BOARD SCANNING, THE CLIENT HALF: what a player sees when the read FAILS.
//
// Built from jobs/build-spec-board-scan-server PART 4 (R-BS-1, R-BS-2) and PART 6.3, at #408. The pure FEN
// validator is gate 27 and runs in Node; this one needs a browser, because every claim here is about what is
// on the screen. It installs a DOUBLE for the one cloud call - window.CTCloud._scanBoard - and drives the real
// New Game sheet at 375x730.
//
// WHY A DOUBLE IS HONEST HERE, AND WHERE IT STOPS BEING SO. index.html:70 assigns window.CTCloud in a plain
// script whose methods delegate to `this._scanBoard` (index.html:96), and the module that assigns the real
// _scanBoard imports from gstatic.com, which gates/lib.js's BLOCK aborts. So in the harness the facade sits
// bare: assigning _scanBoard is exactly what the deployed bridge does, through the same seam, not a monkey-patch
// around the app. What it CANNOT prove is that the deployed function ever returns these shapes - that is the
// server's own contract and it is unverifiable from here until Kunal deploys it (flag
// scan-board-cloud-function-never-deployed). This gate is about the CLIENT's behaviour given each shape.
//
// ── ONE CLAIM PER ASSERTION, DELIBERATELY ────────────────────────────────────────────────────────────────────
// The standing-checks spec gate scored PART 4's rows on 2026-09-17 and failed three of them for compounding
// (flags spec-gate-d8-tracker-R-BS-1, -R-BS-2, -R-BS-5). R-BS-1's own GATE line is "contains X and does not
// contain Y"; R-BS-2's is "the spinner is visible; the scroll height is identical"; R-BS-5's is "all four
// selectors resolve". Those are two, two and four independently failing claims behind one verdict each. That
// finding is right and this gate does not reproduce the shape: every claim below is its own L.say, so a red
// line names the thing that broke. The published rows are cited per assertion instead.
//
// ── THE CONTROL IS THE SHIPPED #407 RELEASE, AND IT IS NOT A BUNDLE BUILT TO FAIL ───────────────────────────
// Recovered with `git cat-file -p 5332a8d:app.js` (md5 e719c5842b43), which is the strongest control this
// project has: the release a player would have been using an hour ago, not a trial bundle broken on purpose.
// MEASURED, and the split is the point of running it: 24 pass, 9 FAIL.
//
//   THE NINE, and they are exactly R-BS-1 and R-BS-2:
//     TC-SC-004  no scan-row at all - the message row was conditionally rendered
//     TC-SC-008/009/010/010b  no spinner: [data-ct="scan-busy"] does not exist
//     TC-SC-011  THE G3 DEFECT, MEASURED: the New Game sheet's scroll height goes 938 -> 966 the moment a scan
//                starts, so 28px of screen moved under the player's thumb every time they tapped Scan
//     TC-SC-012  ... and the row's own height and y could not even be read, because the row was absent
//     TC-SC-019  an honest refusal printed "Could not read the board. Try a clearer, straight-on, well-lit
//                photo..." - the server's REASON never reached the screen
//     TC-SC-022  and reason "invalid-position" printed that same generic line
//
//   WHAT STAYED GREEN, which is what makes the nine mean something: the three data-ct labels from #405, the
//   #392 deploy message, the unauthenticated path, the transient-internal message, the whole success path, the
//   call shape (once, bare base64) and the double-tap guard. None of those is what this build changed.
//
//   AND THREE OF THE NEW ASSERTIONS PASSED ON THE CONTROL, said out loud rather than counted as coverage:
//   TC-SC-020, TC-SC-021 and TC-SC-023 are all of the form "the screen does NOT say X", and the OLD generic
//   message does not say X either. They are necessary and not sufficient on their own - TC-SC-019 is the one
//   that fails - and that is exactly the shape the spec's own compound GATE line hides by putting "contains A
//   and does not contain B" behind one verdict.
//
// THE COST OF THE RESERVE, measured rather than waved at: the sheet is now 967 tall at rest where #407 was
// 938. The 29px the row reserves is spent permanently, and it buys a sheet that does not move when a scan
// starts. It is height inside a SCROLLING sheet, not board height, which is the trade CLAUDE.md asks for
// ("if a fix costs board height, put it in a sheet" - this is already in one).
// ── THE ANTAGONIST VETOED THIS BUILD, AND THE VETO IS WHY TC-SC-032..038 EXIST ──────────────────────────────
// Run as its own subagent against the bundle, before the push, per the procedure's step 2b. It reproduced the
// height identity at SEVEN geometries rather than my one (975/975 at 320x568, 944/944 at 360x640, 967/967 at
// 375x730, 909/909 at 375x568, 950/950 at 390x844 and 430x932, 967/967 at 375x761 with insets seeded), through
// the CAMERA input as well as the upload one, on all three opponent tiles, and with the reviewed-position
// banner up - so the claim generalises further than I measured it. Then it broke the build in a configuration
// this gate never fed:
//
//   R-BS-1 IS THE FIRST PLACE IN THE APP TO INTERPOLATE UNBOUNDED SERVER TEXT INTO THE DOM, and the row it
//   goes in had no break opportunity. Ink right edge against the viewport, measured with a Range: a signed
//   storage URL overhung 118.58px at 320 and 63.58px at 375; a Java-style exception 368.98/313.98; a 64-char
//   sha 250.98/195.98; a 200-char token 1270.19/1215.19. The shortest pure token that spilled was 40
//   characters at 320x568, 44 at 375x730; 200 characters of PROSE was always safe, so the trigger is
//   specifically an unbroken run - which is exactly what a URL, a hash, a stack frame or a model error id is.
//   AND IT WAS NOT MERELY PAINTED PAST THE EDGE: an ancestor computes overflow-x:auto, and the antagonist
//   proved it moves by actually scrolling it - scrollLeft 0 -> 1215, which dragged the Start-game button to
//   x=-1199 and took the sheet's title off screen with it.
//
// FIXED with one declaration (overflowWrap:'anywhere' on the message) and CONTROLLED against the bundle that
// was one push away: `git cat-file -p 27bae89:app.js` (md5 0a6db93eef13) scores 36 pass / 4 FAIL, and the four
// are TC-SC-033 (ink 560.81 against a 320 viewport), TC-SC-034 (row scrollWidth 545 vs clientWidth 288),
// TC-SC-035 (the ancestor scroller at 561 vs 320) and TC-SC-036 (the mechanism). The fixed bundle reads ink
// 298.55 inside 320, row 288/288, scroller 320/320.
//
//   AND TC-SC-037 IS GREEN ON BOTH BUNDLES, said out loud rather than counted: document.documentElement's
//   scrollWidth is 320 either way, because the spill lives inside an inner scroller and never reaches the
//   page. That is CLAUDE.md's own rule - "document.scrollingElement is the wrong thing to ask" - showing up
//   as an assertion that cannot see the defect it sits beside. It is kept because it would catch a page-level
//   spill, and it is named here so nobody reads its green as coverage of this one.
//
// IT ALSO DISPUTED TWO OF MY NUMBERS AND WAS RIGHT ABOUT BOTH. "The 19.8px ring" is a rotation bounding box
// (ten samples 37ms apart: 15.71, 18.29, 19.12, 19.13, 19.80 - sqrt(2) x 14 at 45 degrees); the layout height
// is 14, and TC-SC-010b now measures 14 + marginTop 3 against the 21px reserve instead. "One line to the
// pixel" was 20.3px against a 21px reserve, so 0.7px of slack, not exact. Both corrections are in the code
// below and in the build note, rather than quietly dropped.
'use strict';
const L=require('../lib');
const P=require('../drive/play');
const zlib=require('zlib');

// A real 8x8 PNG, built here rather than committed as a binary: the app decodes the file with new Image() and
// then draws it to a canvas, so it has to be a picture a browser will actually decode.
function png8(){
  const w=8,h=8;
  const raw=Buffer.alloc((w*3+1)*h);
  for(let y=0;y<h;y++){ raw[y*(w*3+1)]=0; for(let x=0;x<w;x++){ const o=y*(w*3+1)+1+x*3; const v=((x+y)%2)?0xee:0x22; raw[o]=v;raw[o+1]=v;raw[o+2]=v; } }
  const chunk=(type,data)=>{
    const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
    const td=Buffer.concat([Buffer.from(type,'ascii'),data]);
    const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)>>>0,0);
    return Buffer.concat([len,td,crc]);
  };
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
let _crcT=null;
function crc32(buf){
  if(!_crcT){_crcT=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);_crcT[n]=c>>>0;}}
  let c=0xffffffff; for(let i=0;i<buf.length;i++)c=_crcT[(c^buf[i])&0xff]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
const FILE={name:'board.png',mimeType:'image/png',buffer:png8()};

// Sign in the way the real bridge does: index.html:73's _emit is what onAuthStateChanged calls at :287, and
// chess.jsx:2661 subscribes to it. Seeding a user any other way would be testing the harness.
const signIn=(b)=>b.page.evaluate(()=>{ const C=window.CTCloud; if(!C||!C._emit)return false; C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null}); return true; });

// Install the double for ONE case. `mode` decides the shape; `release` holds the call in flight until let go.
const stub=(b,mode,payload)=>b.page.evaluate(([mode,payload])=>{
  const C=window.CTCloud;
  window.__scan={calls:[],release:null};
  C._scanBoard=function(img){
    window.__scan.calls.push(String(img==null?'':img));
    if(mode==='hold')return new Promise((res)=>{ window.__scan.release=()=>res(payload); });
    if(mode==='reject')return Promise.reject(Object.assign(new Error(payload.message||''),{code:payload.code}));
    return Promise.resolve(payload);
  };
  return true;
},[mode,payload]);

const feed=async(b)=>{ await b.page.locator('input[type=file]').nth(1).setInputFiles(FILE); };
const msg=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="scan-msg"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
/* THE SHEET'S OWN scrollHeight EQUALS ITS clientHeight (967/967 here, 938/938 on the #407 control), so `sh`
   below is the sheet's CONTENT height and not a scroll range - the element that actually scrolls is its parent
   overlay, measured at 1003/730 against the control's 974/730. The antagonist's correction, and it matters
   because an assertion named for a scroll range while measuring content height is the kind of mislabel this
   project keeps filing. Both are read here: `sh` is what the reserve changes, `oh`/`oc` is the scroller. */
const sheet=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-sheet"]');if(!e)return null;const r=e.getBoundingClientRect();
  let sc=e.parentElement; while(sc&&sc!==document.documentElement){const o=getComputedStyle(sc).overflowY;if(o==='auto'||o==='scroll')break;sc=sc.parentElement;}
  return {sh:e.scrollHeight,ch:e.clientHeight,h:Math.round(r.height*100)/100,top:Math.round(r.top*100)/100,oh:sc?sc.scrollHeight:null,oc:sc?sc.clientHeight:null};});
const busy=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="scan-busy"]');if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return {w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100,vis:s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0,anim:s.animationName,dur:s.animationDuration};});
const screenText=(b)=>b.page.evaluate(()=>(document.body.innerText||'').replace(/\s+/g,' '));

// Each failure case: reach the sheet, install the double, feed the file, read the message. One helper so the
// twelve message assertions below cannot drift from each other.
async function caseMsg(b,mode,payload){
  await P.states['setup'](b); await b.settle(200);
  await signIn(b); await b.settle(250);
  await stub(b,mode,payload);
  await feed(b);
  await b.settle(900);
  return {m:await msg(b),all:await screenText(b)};
}

L.run(async()=>{
  const b=await L.launch({geo:'kunal730',name:'scan-client',store:{ct_pool:'3'}});await b.open();

  // ── R-BS-5, the four selectors, ONE ASSERTION EACH (the published row asks for all four in one) ──
  await P.states['setup'](b); await b.settle(200);
  const ok=await signIn(b); await b.settle(300);
  L.say(ok===true,'TC-SC-001 the harness signed in through CTCloud._emit, the same seam onAuthStateChanged uses - the scan buttons are behind a cloudUser check, so without this the gate would measure the sign-in prompt and call it a scan',ok);
  for(const [id,ct] of [['TC-SC-002','scan-camera'],['TC-SC-003','scan-upload'],['TC-SC-004','scan-msg-or-row']]){
    if(ct==='scan-msg-or-row')continue;
    const r=await b.rect('[data-ct="'+ct+'"]');
    L.say(!!r&&r.w>0&&r.h>0,id+' [data-ct="'+ct+'"] resolves on the New Game sheet and is painted (R-BS-5, its own claim)',r&&{w:r.w,h:r.h});
  }
  const rowIdle=await b.rect('[data-ct="scan-row"]');
  L.say(!!rowIdle&&rowIdle.h>0,'TC-SC-004 [data-ct="scan-row"] - the RESERVED message row - exists and is painted with no message showing. This is R-BS-2\'s G3 half: the row that used to appear and disappear.',rowIdle&&{h:rowIdle.h,w:rowIdle.w});
  const msgIdle=await msg(b);
  L.say(msgIdle===null,'TC-SC-005 and the message element itself is ABSENT while there is no message - the row is reserved, the text is conditional, which is what "fixed height with conditional content" means',msgIdle);
  const busyIdle=await busy(b);
  L.say(busyIdle===null,'TC-SC-006 no spinner while idle',busyIdle);
  const sheetIdle=await sheet(b);
  L.say(!!sheetIdle&&sheetIdle.sh>0,'TC-SC-007 the setup sheet reports a scroll height, so the R-BS-2 height comparison has something to compare',sheetIdle);

  // ── R-BS-2, the two claims the published row puts behind one semicolon, measured separately ──
  await stub(b,'hold',{fen:null,ok:false,reason:'held open by the gate'});
  await feed(b);
  await b.settle(500);
  const busyRun=await busy(b), sheetRun=await sheet(b), rowRun=await b.rect('[data-ct="scan-row"]'), msgRun=await msg(b);
  L.say(!!busyRun,'TC-SC-008 with a scan IN FLIGHT, [data-ct="scan-busy"] exists (R-BS-2, claim 1 of 2)',busyRun);
  L.say(!!busyRun&&busyRun.vis===true,'TC-SC-009 ... and it is visible, not merely in the DOM',busyRun&&{vis:busyRun.vis,w:busyRun.w,h:busyRun.h});
  L.say(!!busyRun&&busyRun.anim==='ctScanSpin'&&parseFloat(busyRun.dur)>0,'TC-SC-010 ... and it is actually SPINNING: a static ring is a lie about whether the phone is working, which is the whole complaint R-BS-2 comes from',busyRun&&{anim:busyRun.anim,dur:busyRun.dur});
  /* THE MECHANISM BEHIND TC-SC-011, and the first version of this assertion measured the WRONG QUANTITY -
     the antagonist's dispute, and it was right. It compared getBoundingClientRect().height, which for a box
     under `animation: ctScanSpin` is the ROTATION BOUNDING BOX: sampled ten times 37ms apart the same 14px
     ring read 15.71, 18.29, 19.12, 19.13, 19.80 - sqrt(2) x 14 = 19.799 at 45 degrees. So the number varied
     run to run, and the assertion would have gone red on a 16px ring that moves nothing (layout 16 + 3 = 19,
     inside the 21px reserve) while its own sentence claimed to be about layout. CLAUDE.md, in as many words:
     a transform is paint, not layout, and getBoundingClientRect() cannot tell you which.
     The quantity that decides whether the row can grow is the ring's LAYOUT height plus its top margin
     against the reserve - 14 + 3 = 17 against 21, four pixels of slack - so that is what is asserted. */
  const ringBox=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="scan-busy"]');if(!e)return null;const s=getComputedStyle(e);
    return {off:e.offsetHeight,mt:parseFloat(s.marginTop)||0,rect:Math.round(e.getBoundingClientRect().height*100)/100};});
  L.say(!!ringBox&&!!rowIdle&&(ringBox.off+ringBox.mt)<=rowIdle.h+0.01,'TC-SC-010b ... and the spinner FITS INSIDE the reserved row IN LAYOUT, which is why the height below cannot move: offsetHeight '+(ringBox&&ringBox.off)+' + marginTop '+(ringBox&&ringBox.mt)+' against a '+(rowIdle&&rowIdle.h)+'px reserve. Its painted rect is larger and varies (it is a rotating box) and is deliberately NOT what this tests.',ringBox&&{layout:ringBox.off+ringBox.mt,reserve:rowIdle&&rowIdle.h,paintedRect:ringBox.rect});
  L.say(!!sheetIdle&&!!sheetRun&&sheetRun.sh===sheetIdle.sh,'TC-SC-011 the setup sheet\'s scroll height is IDENTICAL before the scan and while it runs, to the pixel (R-BS-2, claim 2 of 2 - G3, and the reason the row is reserved)',{idle:sheetIdle&&sheetIdle.sh,running:sheetRun&&sheetRun.sh});
  L.say(!!rowIdle&&!!rowRun&&Math.abs(rowRun.h-rowIdle.h)<0.5&&Math.abs(rowRun.y-rowIdle.y)<0.5,'TC-SC-012 ... and the row itself has not grown or moved either (h '+(rowIdle&&rowIdle.h)+' -> '+(rowRun&&rowRun.h)+', y '+(rowIdle&&rowIdle.y)+' -> '+(rowRun&&rowRun.y)+')');
  L.say(msgRun==='Reading the board…','TC-SC-013 and the in-flight message is the one chess.jsx sets, beside the spinner rather than instead of it',msgRun);
  const calls1=await b.page.evaluate(()=>window.__scan.calls.length);
  L.say(calls1===1,'TC-SC-014 the file reached the cloud call exactly once (PART 6.2 row 1)',calls1);
  const arg=await b.page.evaluate(()=>String(window.__scan.calls[0]||''));
  L.say(arg.length>0&&!/^data:/.test(arg),'TC-SC-015 the argument is not a data URI - the client strips the prefix before sending (PART 6.2 row 2, claim 1)',arg.slice(0,24));
  L.say(/^[A-Za-z0-9+/]+={0,2}$/.test(arg),'TC-SC-016 ... and it is bare base64 (PART 6.2 row 2, claim 2)',{len:arg.length,head:arg.slice(0,16)});
  const disabled=await b.page.evaluate(()=>{const c=document.querySelector('[data-ct="scan-camera"]'),u=document.querySelector('[data-ct="scan-upload"]');return {c:!!(c&&c.disabled),u:!!(u&&u.disabled)};});
  L.say(disabled.c===true&&disabled.u===true,'TC-SC-017 both scan buttons are disabled while a scan is in flight, so the double-tap guard still holds with a spinner beside it (PART 6.2 row 4)',disabled);
  await b.page.evaluate(()=>{ if(window.__scan&&window.__scan.release)window.__scan.release(); });
  await b.settle(700);
  const busyAfter=await busy(b);
  L.say(busyAfter===null,'TC-SC-018 the spinner goes when the call resolves - it is tied to scanBusy and not left behind',busyAfter);
  await b.close();

  // ── R-BS-1, the honest refusal. Three claims, three assertions. ──
  const b2=await L.launch({geo:'kunal730',name:'scan-refusal',store:{ct_pool:'3'}});await b2.open();
  const r1=await caseMsg(b2,'resolve',{fen:null,ok:false,reason:'a hand is covering the bottom two ranks'});
  L.say(!!r1.m&&r1.m.indexOf('a hand is covering')>=0,'TC-SC-019 an honest refusal SHOWS THE SERVER\'S REASON on screen (R-BS-1, claim 1; PART 6.3 row 5)',r1.m);
  L.say(!!r1.m&&r1.m.indexOf('not set up yet')<0,'TC-SC-020 ... and it does NOT print the #392 deploy message, which would tell the player nothing they do will help at the one moment a better photo would (R-BS-1, claim 2)',r1.m);
  L.say(!!r1.m&&r1.m.indexOf('Please try again')<0,'TC-SC-021 ... and it does not print the generic retry text either (PART 6.3 row 5, third claim)',r1.m);
  const r2=await caseMsg(b2,'resolve',{fen:null,ok:false,reason:'invalid-position'});
  L.say(!!r2.m&&/did not read as a legal chess position/.test(r2.m),'TC-SC-022 reason "invalid-position" gets its OWN message, the one the spec\'s do-clause names and its GATE line never mentioned (PART 6.3 row 6, claim 1)',r2.m);
  L.say(!!r2.all&&r2.all.indexOf('invalid-position')<0,'TC-SC-023 ... and the raw sentinel never reaches the screen anywhere on it (claim 2, measured over the whole body text rather than the message alone)',r2.m);
  await b2.close();

  // ── The three rejection paths. TC-SC-024 is the standing control for #392 and must be kept. ──
  const b3=await L.launch({geo:'kunal730',name:'scan-rejects',store:{ct_pool:'3'}});await b3.open();
  const r3=await caseMsg(b3,'reject',{code:'functions/not-found',message:'not-found'});
  L.say(!!r3.m&&/not set up yet/.test(r3.m),'TC-SC-024 a not-found rejection STILL gets the #392 deploy message - the standing control for #392: if the /not-found|unimplemented/ test in the catch is ever broken, this goes red (PART 6.3 row 7)',r3.m);
  const r4=await caseMsg(b3,'reject',{code:'functions/unauthenticated',message:'Sign in to read a board.'});
  L.say(!!r4.m&&/[Ss]ign in/.test(r4.m),'TC-SC-025 an unauthenticated rejection keyed on the CODE gets the sign-in message, not the generic retry text (R-BS-4, shipped #405 - this is its only guard, and the spec\'s own row quotes neither string, which is flag spec-gate-d6-tracker-R-BS-4)',r4.m);
  const r5=await caseMsg(b3,'reject',{code:'functions/internal',message:'The board reader is not answering right now. Try again in a moment.'});
  L.say(!!r5.m&&/[Tt]ry again/.test(r5.m)&&!/not set up yet/.test(r5.m),'TC-SC-026 a transient internal failure says try again - which is CORRECT here and wrong for #392, and the two must not share a message (PART 6.3 row 9)',r5.m);
  await b3.close();

  // ── THE ANTAGONIST'S VETO, #408. UNBOUNDED SERVER TEXT WITH NO BREAK OPPORTUNITY. ──────────────────────────
  // R-BS-1 makes this row the first place in the app to interpolate text the SERVER chose into the DOM, and
  // every reason the assertions above feed is short prose, which wraps at its spaces and hides the whole
  // problem. A refusal reason from a vision model is just as likely to be a URL, a stack frame, a sha or a
  // snake_case id - an unbroken run, which `overflow-wrap:normal` cannot break. Run at 320x568, the width
  // where it is worst, and asserted as INK against the viewport plus the scroller it was found to move.
  const b5=await L.launch({geo:'se',name:'scan-spill',store:{ct_pool:'3'}});await b5.open();
  const TOK='9f2c1ab7e4d05c83be71f6a94d2e0b5c7a38f1e6d4b09c25a7f3e8d1c6b42a90';   // 64 hex: a sha-shaped reason
  const rspill=await caseMsg(b5,'resolve',{fen:null,ok:false,reason:TOK});
  L.say(!!rspill.m&&rspill.m.indexOf(TOK)>=0,'TC-SC-032 the 64-character token really did reach the screen, so the four assertions below are measuring the interpolation and not an empty row',rspill.m&&rspill.m.length);
  const spill=await b5.page.evaluate(()=>{
    const e=document.querySelector('[data-ct="scan-msg"]'); if(!e)return null;
    const row=document.querySelector('[data-ct="scan-row"]');
    const rng=document.createRange(); rng.selectNodeContents(e);
    const rects=[...rng.getClientRects()];
    const ink=rects.length?rects.reduce((m,x)=>Math.max(m,x.right),-1e9):null;
    let sc=e.parentElement, scInfo=null;
    while(sc&&sc!==document.documentElement){const o=getComputedStyle(sc).overflowX;
      if(o==='auto'||o==='scroll'){scInfo={sw:sc.scrollWidth,cw:sc.clientWidth,who:sc.getAttribute('data-ct')||sc.tagName+'.'+(sc.className||'').toString().slice(0,18)};break;}
      sc=sc.parentElement;}
    const n=(v)=>v==null?null:Math.round(v*100)/100;
    return {ink:n(ink),lines:rects.length,vw:innerWidth,wrap:getComputedStyle(e).overflowWrap,
            rowSw:row?row.scrollWidth:null,rowCw:row?row.clientWidth:null,sc:scInfo,docSw:document.documentElement.scrollWidth};
  });
  L.say(!!spill&&spill.ink!==null&&spill.ink<=spill.vw+0.5,'TC-SC-033 THE PAINTED INK STAYS INSIDE THE VIEWPORT with an unbreakable 64-character reason. Measured with a Range over the text node, not the element box. Before the fix this overhung 250.98px at 320 and 195.98px at 375.',spill&&{ink:spill.ink,vw:spill.vw,lines:spill.lines});
  L.say(!!spill&&spill.rowSw!==null&&spill.rowSw<=spill.rowCw+0.5,'TC-SC-034 ... and the row is not overflowing itself either (scrollWidth vs clientWidth), so nothing is hidden inside it',spill&&{sw:spill.rowSw,cw:spill.rowCw});
  L.say(!!spill&&(!spill.sc||spill.sc.sw<=spill.sc.cw+0.5),'TC-SC-035 ... and the nearest ancestor that CAN scroll horizontally has gained no scroll range. This is the assertion that matters: the spill was not merely painted past the edge, it made that ancestor scrollable, and scrolling it dragged the Start-game button to x=-1199 with the sheet title off screen.',spill&&spill.sc);
  L.say(!!spill&&spill.wrap==='anywhere','TC-SC-036 ... and the MECHANISM is pinned, not just its symptom: the message computes overflow-wrap:anywhere. A wrapped line is one fix among several and the next person changing this style should go red here, at the cause.',spill&&spill.wrap);
  L.say(!!spill&&spill.docSw<=spill.vw,'TC-SC-037 ... and the page itself still has no horizontal scroll range',spill&&{docSw:spill.docSw,vw:spill.vw});

  /* THE STATE THIS GATE DOES NOT ASSERT, measured by the antagonist and recorded here rather than left for
     someone to rediscover. TC-SC-011 compares an EMPTY row to a BUSY row, which is the transition R-BS-2 is
     about. It is not the only transition a player sees: with a failed message already in the row, tapping
     Scan again fires setScanMsg('') in the button's own onClick before the picker opens, so the row collapses
     60.89 -> 21.00 and the sheet 1007 -> 967 at 375x730 (81.19 -> 21.00 and 1035 -> 975 at 320x568) the
     instant the finger lands. That is 40px and 60px of screen moving on a transition the player is watching -
     larger than the 28px this build removed, in the opposite direction. The message also SURVIVES closing and
     reopening the sheet, so "idle" is not always a 21px state. Not fixed here because the honest fix is a
     design choice with a permanent cost (reserve two lines and scroll inside the row, or clear the message
     later and move the collapse rather than remove it), and guessing between them is what flag
     scan-row-collapses-on-second-tap exists to stop. */
  L.note('NOT ASSERTED, measured by the #408 antagonist: a SECOND scan with a failed message standing collapses the row 60.89 -> 21.00 and the sheet 1007 -> 967 at 375x730 (81.19 -> 21.00, 1035 -> 975 at 320x568) at the moment of the tap, because the button clears the message itself. See flag scan-row-collapses-on-second-tap.');
  const bad5=b5.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad5.length===0,'TC-SC-038 no app error while rendering an unbreakable reason at 320x568',bad5.slice(0,2));
  await b5.shot('scan-client-spill-320');
  await b5.close();

  // ── The success path, and G3 across the whole cycle. ──
  const b4=await L.launch({geo:'kunal730',name:'scan-success',store:{ct_pool:'3'}});await b4.open();
  await P.states['setup'](b4); await b4.settle(200);
  await signIn(b4); await b4.settle(250);
  const before=await sheet(b4);
  await stub(b4,'resolve',{fen:'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b kq - 3 3',ok:true});
  await feed(b4);
  await b4.settle(1200);
  const txt=await screenText(b4);
  L.say(/Play this position/.test(txt),'TC-SC-027 a valid FEN lands on the New Game sheet with the "Play this position" button (PART 6.3 row 10, claim 1)',/Play this position/.test(txt));
  L.say(/Continuing from your reviewed position/.test(txt),'TC-SC-028 ... and the sheet says where the position came from (claim 2)');
  /* The FEN fed above has BLACK to move, and the banner prints the side as a word: "You'll play <b>White|Black</b>
     (the side to move)". So the assertion pins the WHOLE phrase and then checks the other branch is absent.
     The first version of this line was /You'll play\s*Black|Black/, which matches the bare word "Black"
     anywhere on the sheet - and the sheet carries a Black COLOUR CHIP, so it was green by construction and
     would have stayed green with pColor set to White. #388's rule: read the branches the code can print and
     check the pattern rejects the others. */
  L.say(/You'll play\s*Black\s*\(the side to move\)/.test(txt),'TC-SC-029 ... and the side to move in the FEN (b) is the side the player is given - the banner\'s whole phrase, not the bare word, which the Black colour chip on the same sheet would satisfy (claim 3)',/You'll play\s*Black/.test(txt));
  L.say(!/You'll play\s*White/.test(txt),'TC-SC-029b ... and it does NOT say White - the half that makes the line above an assertion rather than a coincidence');
  const after=await sheet(b4);
  L.say(!!before&&!!after&&Math.abs(after.top-before.top)<0.5,'TC-SC-030 the sheet has not moved across the whole cycle (PART 6.3 row 11, G3)',{before:before&&before.top,after:after&&after.top});
  const bad=b4.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'TC-SC-031 no app error anywhere in the scan cycle beyond the allowed engine trap',bad.slice(0,2));
  await b4.shot('scan-client-success');
  await b4.close();
},'SCAN-CLIENT');
