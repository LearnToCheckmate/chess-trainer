'use strict';
// gates/regress/97-setup-game-carries-its-fen.js - A GAME PLAYED FROM A SET-UP POSITION IS COPIED AND REVIEWED FROM THAT POSITION.
// TC-PL-069a..c, TC-R398, US-PL-25.
//
// WHY [#550, item (88) of directOpening_2026_11_11_batch10; jobs/a-game-played-from-a-set-up-position-is-reviewed-and-copied-without-a-
// fen-header-so-review-fails-at-move-1-2026-11-07, found by #549's job 66 in the play lane]. reviewPlayedGame, analyzeLine and copyMoves
// wrote "1. Bc4 Bc5" for a game that started from a scanned or reviewed position, with no [FEN] tag, so the review replayed it from the
// initial position and failed at move 1, and the copied text could not be pasted back anywhere. Now the start FEN rides in [SetUp "1"]
// [FEN "..."] and the moves are numbered from that position's own move number.
//
// WHAT IT ASSERTS, at kunal761, a vs-Computer game started through the board-scan route (gate 55's scanInto: the scan returns FEN0, a
// position White plays at move 3), one move by the player and Pip's reply:
//  (a) TC-PL-069a COPY (data-ct moves-copy, in the More sheet in play; navigator.clipboard.writeText is captured): the text carries [FEN "FEN0"] and begins its moves
//      at "3. ", the position's own number - not "1. ".
//  (b) TC-PL-069b ANALYZE (data-ct moves-analyze): the analysis of the two plies is reached - the review's move strip shows the player's
//      move - with no import error on screen.
//  (c) TC-PL-069c REVIEW (the play row's Review, offered once the game is over - the gate resigns it first): the review reaches its summary,
//      and its move strip numbers the moves from the position ("3. Bc4"), which it can only do if the FEN rode in.
// (d) TC-R398 [#553 B3, the checker's 14 Nov 'a case the gate does not cover']: BLACK TO MOVE. FENB is the same Italian one move on,
//     Black to play at move 3, and the player takes Black: Copy carries [FEN "FENB"] and numbers the first move '3... Nf6' and White's
//     reply '4. ' (pgnMovesFrom's side half - a writer that assumed White moves first would print '3. Nf6'); Review numbers it '3… Nf6'.
// GEOMETRY: CT_G97_GEO (default kunal761); gates/pairs runs it at kunal761 and se. Every line names its geometry.
// DENOMINATOR: the game really started from FEN0 (the board's own FEN before the first move) and two plies were played.
// CONTROL-RECORD: 7bbec32 2026-11-11 total=9 red=5 scope=trial:3ab724514641 how=#550 item (88): origin/main's bundle - Copy gives '1. Bc4 Nf6' with no FEN (both TC-PL-069a lines red), Analyze and Review never reach the review (TC-PL-069b red, both TC-PL-069c lines red); the three DENOMINATORS green
const L=require('../lib');const P=require('../drive/play');
const zlib=require('zlib');
function png8(){const w=8,h=8,raw=Buffer.alloc(h*(1+w*3));for(let y=0;y<h;y++){raw[y*(1+w*3)]=0;for(let x=0;x<w*3;x++)raw[y*(1+w*3)+1+x]=((x+y)%2)?200:40;}
  const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);T[n]=c>>>0;}
  const crc=(buf)=>{let c=0xffffffff;for(let i=0;i<buf.length;i++)c=T[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td),0);return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const FEN0='r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FENB='r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';   // #553 B3: Black to move at 3
const GEO=process.env.CT_G97_GEO||'kunal761';
/* batch 13 (jobs/scan-check-the-board-first-then-who-moves-and-which-side-then-play-or-analyze-2026-11-18): the scan route now runs through
   Check the board and its two questions (gates/drive/scan.js); the board is taken as read and White - FEN0's side to move - both moves
   next and is the player, so the game starts from FEN0 itself, move counters and all, as it did from the sheet's Play this position. */
async function startFromFen(b,fen,side){fen=fen||FEN0;side=side||'w';
  const st=await require('../drive/scan').through(b,{fen,turn:side,side,kind:'Play',settle:1600});
  if(st!=='ok')throw new Error('the scan route did not start a game: '+st);
}
const errOnScreen=(b)=>b.page.evaluate(()=>/could not|couldn.t|illegal|Not a legal|failed/i.test(document.getElementById('root').innerText));

L.run(async()=>{
  for(const arm of ['copy','analyze','review','copy-black','review-black']){
    const tag=GEO+' '+arm+': ';const black=/black$/.test(arm);
    const b=await L.launch({geo:GEO,name:'setupfen-'+arm+'-'+GEO,store:{ct_pool:'3'}});await b.open();
    let ok=true;try{await startFromFen(b,black?FENB:FEN0,black?'b':'w');}catch(e){ok=false;L.say(false,tag+(black?'TC-R398':'TC-PL-069')+' the game was started from the scanned position',String(e).slice(0,160));}
    if(ok&&black){
      // TC-R398: the player is Black and moves first; Nf6 and Pip's reply
      await b.move('g8','f6',0);await P.waitPlies(b,2,20000);await b.settle(600);
      const pl=await P.plies(b);
      L.say(pl>=2,tag+'TC-R398 DENOMINATOR the game from FENB (Black to move at 3) has the player\'s Nf6 and the reply ('+pl+' plies)',{pl});
      if(arm==='copy-black'){
        await b.page.evaluate(()=>{window.__copied=null;try{navigator.clipboard.writeText=(t)=>{window.__copied=t;return Promise.resolve();};}catch(e){}});
        try{await P.tapBtn(b,/^More$/,600);}catch(e){}
        try{await b.tapCt('moves-copy',500);}catch(e){L.note('moves-copy tap: '+String(e).slice(0,100));}
        const t=await b.page.evaluate(()=>window.__copied);
        L.say(!!t&&t.includes('[FEN "'+FENB+'"]'),tag+'TC-R398 the copied moves carry [FEN "'+FENB+'"]',{t});
        L.say(!!t&&/(^|\n)3\.\.\. Nf6 4\. [KQRBN]?[a-h]?x?[a-h1-8]/.test(t),tag+'TC-R398 and number Black\'s first move "3... Nf6" and White\'s reply "4. ...", not "3. Nf6"',{t});
      }else{
        try{await P.tapBtn(b,/^More$/,600);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1100);}catch(e){L.note('resign: '+String(e).slice(0,100));}
        let tapped=true;try{await P.tapBtn(b,/Review$/,1500);}catch(e){tapped=false;L.note('Review tap: '+String(e).slice(0,100));}
        let reached=false;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});reached=true;}catch(e){}
        try{await b.tapText(/^Start review/,{wait:900});}catch(e){}
        const strip=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('[data-ct="strip-row"]')].pop();return e?e.innerText.replace(/\s+/g,' '):null;});
        const err=await errOnScreen(b);
        L.say(tapped&&reached&&!err&&!!strip&&/\b3\s*(…|\.\.\.)\s*Nf6\b/.test(strip),tag+'TC-R398 Review of the Black-to-move game reaches its summary and its strip reads "3… Nf6"',{tapped,reached,err,strip:strip&&strip.slice(0,120)});
      }
    }else if(ok){
      const placement=await b.page.evaluate(()=>{const sq=[...document.querySelectorAll('div')].filter(d=>/repeat\(8/.test(getComputedStyle(d).gridTemplateColumns)).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];return sq?sq.innerText.length:0;});
      await b.move('f1','c4',0);await P.waitPlies(b,2,20000);await b.settle(600);
      const pl=await P.plies(b);
      L.say(pl>=2,tag+'TC-PL-069 DENOMINATOR the game from FEN0 has the player\'s move and the reply ('+pl+' plies)',{pl,placement});
      if(arm==='copy'){
        await b.page.evaluate(()=>{window.__copied=null;try{navigator.clipboard.writeText=(t)=>{window.__copied=t;return Promise.resolve();};}catch(e){}});
        try{await P.tapBtn(b,/^More$/,600);}catch(e){}   // in play, Copy moves and Analyze sit in the More sheet
        try{await b.tapCt('moves-copy',500);}catch(e){L.note('moves-copy tap: '+String(e).slice(0,100));}
        const t=await b.page.evaluate(()=>window.__copied);
        L.say(!!t&&t.includes('[FEN "'+FEN0+'"]'),tag+'TC-PL-069a the copied moves carry [FEN "'+FEN0+'"]',{t});
        L.say(!!t&&/(^|\n)3\. Bc4\b/.test(t),tag+'TC-PL-069a and are numbered from the position: "3. Bc4", not "1. Bc4"',{t});
      }else if(arm==='analyze'){
        try{await P.tapBtn(b,/^More$/,600);}catch(e){}
        try{await b.tapCt('moves-analyze',2500);}catch(e){L.note('moves-analyze tap: '+String(e).slice(0,100));}
        let reached=false;try{await b.page.locator('[data-ct="rev-summary"],[data-ct="strip-row"]').first().waitFor({state:'visible',timeout:120000});reached=true;}catch(e){}
        const err=await errOnScreen(b);
        L.say(reached&&!err,tag+'TC-PL-069b Analyze opens the two plies from the set-up position (the review reached, no import error)',{reached,err});
      }else{
        // Review is offered once the game is over: resign it (More, Resign, Tap again to resign), then the play row's Review
        try{await P.tapBtn(b,/^More$/,600);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1100);}catch(e){L.note('resign: '+String(e).slice(0,100));}
        let tapped=true;try{await P.tapBtn(b,/Review$/,1500);}catch(e){tapped=false;L.note('Review tap: '+String(e).slice(0,100));}
        let reached=false;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});reached=true;}catch(e){}
        const pgn=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="strip-row"]')||document.querySelector('[data-ct="rev-summary"]');return e?e.innerText.replace(/\s+/g,' '):null;});
        try{await b.tapText(/^Start review/,{wait:900});}catch(e){}
        const strip=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('[data-ct="strip-row"]')].pop();return e?e.innerText.replace(/\s+/g,' '):null;});
        const err=await errOnScreen(b);
        L.say(tapped&&reached&&!err,tag+'TC-PL-069c Review of the played game reaches its summary (it failed at move 1)',{tapped,reached,err});
        L.say(!!strip&&/\b3\.\s*Bc4\b/.test(strip),tag+'TC-PL-069c and the review numbers the moves from the position: its move strip reads "3. Bc4"',{strip:strip&&strip.slice(0,120)});
      }
    }
    await b.close();
  }
},'97-setup-game-carries-its-fen');
