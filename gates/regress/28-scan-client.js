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
const sheet=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-sheet"]');if(!e)return null;const r=e.getBoundingClientRect();return {sh:e.scrollHeight,ch:e.clientHeight,h:Math.round(r.height*100)/100,top:Math.round(r.top*100)/100};});
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
  /* THE MECHANISM BEHIND TC-SC-011, not another reading of its symptom. The row holds its height only while
     the spinner FITS INSIDE the reserve; measured, the ring paints 19.8px inside a 21px row, which is 1.2px of
     slack and not much. Assert the relationship, so a larger ring or a smaller reserve goes red HERE, naming
     the cause, instead of showing up as a height that moved. */
  L.say(!!busyRun&&!!rowIdle&&busyRun.h<=rowIdle.h+0.01,'TC-SC-010b ... and the spinner FITS INSIDE the reserved row, which is why the height below cannot move: ring '+(busyRun&&busyRun.h)+'px inside a '+(rowIdle&&rowIdle.h)+'px reserve',{ring:busyRun&&busyRun.h,reserve:rowIdle&&rowIdle.h});
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
