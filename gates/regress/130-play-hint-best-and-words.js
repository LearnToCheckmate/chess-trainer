'use strict';
// gates/regress/130-play-hint-best-and-words.js - THE PLAY HINT IS THE BEST MOVE, SAYS WHY, AND IS NOT OFFERED AGAINST A PERSON.
// US-R138 / TC-R206a..e.
//
// WHY [#550, docs/hint-audit-2026-11-12 HEX-R-10; jobs/play-hint-best-move-and-words-2026-11-12; run-answers build__1794388896663-a37]:
// the Play hint came from a 3-ply built-in search, not the engine the eval bar uses, and on 1r4k1/1P3ppp/1Q6/p7/3R4/8/PKP4q/8 w it lit
// d4 and d5 (Rd5) while the eval pill on the same screen read M2 (Qd8+ Rxd8 Rxd8#). It said nothing at all - two yellow squares. And
// the audit's rule: no hint or engine text in a live game against a person.
// WHAT IT READS: the bundle under test (CT_APP). Each position is entered the way gate 55 enters one - the board-scan route with the
// scan stubbed to return the FEN - then "Play this position" against the computer, White to move. The hint's squares are the board
// squares carrying the HL_HINT overlay (rgba(255,200,30,.75)); the words are the play-context status slot.
// KNOW ITS LIMIT: two positions. The words are concreteRead's; their coverage is a measurement on the jobs, not this gate.
// CONTROL-RECORD: 0131b3c 2026-11-12 total=14 red=4 scope=trial:3ab724514641 how=#550 origin/main's own #549 bundle: the mate-in-2 hint lights d4-d5 (Rd5, the audit's case), the status slot is blank on both positions, and Pass and Play's Hint is live; on t125 fbb12a951537 14/0
// AND HEX-R-11/12 (TC-R206d/e): one line in the status slot after the computer's reply (a free piece, a piece of yours attacked, the
// checking piece), fitted in the slot's two lines at kunal761 and 320x568, and a checkmate against the computer names the mating move.
// CONTROL-RECORD: b3ce5bf 2026-11-14 total=42 red=10 scope=trial:81ea6ac84397 how=#550 helper app A, the tree before HEX-R-11/12 (b3ce5bf's chess.jsx): the slot is blank after the free-piece and attacked-piece replies and reads 'Check!' after the check, and the mate reads 'Checkmate! You win!' on the card and in the slot, at both geometries; on t4 29df54c8df82 42/0
// KNOW ITS LIMIT (HEX-R-11): three readings of five - the mate-threat and other-loose-piece readings have no forced-reply position here.
const L=require('../lib');
const P=require('../drive/play');
const zlib=require('zlib');
function png8(){const w=8,h=8,raw=Buffer.alloc(h*(1+w*3));for(let y=0;y<h;y++){raw[y*(1+w*3)]=0;for(let x=0;x<w*3;x++)raw[y*(1+w*3)+1+x]=((x+y)%2)?200:40;}
  const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);T[n]=c>>>0;}
  const crc=(buf)=>{let c=0xffffffff;for(let i=0;i<buf.length;i++)c=T[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td),0);return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const CONFIRM_RE=/^(▶ Start game|▶ Play this position)$/;
async function scanInto(b,fen){
  await P.states['setup'](b); await b.settle(200);
  await b.page.evaluate(()=>{const C=window.CTCloud;if(C&&C._emit)C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null});});
  await b.settle(250);
  await b.page.evaluate((fen)=>{window.CTCloud._scanBoard=function(){return Promise.resolve({ok:true,fen});};},fen);
  await b.page.locator('input[type=file]').nth(1).setInputFiles({name:'board.png',mimeType:'image/png',buffer:png8()});
  await b.settle(1200);
}
const start=(b)=>b.page.evaluate((src)=>{const re=new RegExp(src);const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return 'no sheet';
  const x=[...s.querySelectorAll('button')].filter(e=>re.test((e.innerText||'').trim())).pop()||s.querySelector('[data-ct="setup-start"]');if(!x)return 'no button';if(x.disabled)return 'disabled';x.click();return 'ok';},CONFIRM_RE.source);
const hintSquares=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];if(!g)return null;
  const out=[];[...g.children].slice(0,64).forEach((sq,i)=>{if([...sq.querySelectorAll('div')].some(d=>/rgba\(255, ?200, ?30/.test(d.style.background||'')))out.push('abcdefgh'[i%8]+(8-Math.floor(i/8)));});return out.sort();});
const hintBtn=(b)=>b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('title')||e.getAttribute('aria-label')||'')==='Hint'&&e.getBoundingClientRect().height>0);return x?{dis:!!x.disabled}:null;});
const slot=(b)=>b.text('[data-ct="play-context"]');
const CASES=[{tag:'mate in 2',fen:'1r4k1/1P3ppp/1Q6/p7/3R4/8/PKP4q/8 w - - 0 1',want:[['b6','d8'],['d4','d8']],words:/mate in two/i,old:'Rd5 (d4, d5) against Qd8+ Rxd8 Rxd8#'},
  {tag:'queen to take',fen:'6kr/3q1p1p/8/4N3/8/8/PB4PP/6K1 w - - 0 1',want:[['d7','e5']],words:/queen on d7 can be taken/i,old:'no words'}];
L.run(async()=>{
  for(const c of CASES){
    const b=await L.launch({geo:'kunal761',name:'hint130',store:{ct_pool:'3'}});await b.open();
    await scanInto(b,c.fen);const st=await start(b);await b.settle(1500);
    const on=await b.page.evaluate(()=>!document.querySelector('[data-ct="setup-sheet"]'));
    const h0=await hintBtn(b);
    L.say(st==='ok'&&on&&!!h0&&!h0.dis,'TC-R206 '+c.tag+' PRECONDITION the position is on the board against the computer, White to move, with Hint live ('+st+')',{st,on,h0});
    const before=await hintSquares(b);
    L.say(Array.isArray(before)&&before.length===0,'TC-R206 '+c.tag+' PRECONDITION no hint is lit before the tap',before);
    await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('title')||e.getAttribute('aria-label')||'')==='Hint'&&e.getBoundingClientRect().height>0);if(x)x.click();});
    let sq=null;for(let i=0;i<20;i++){await b.settle(250);sq=await hintSquares(b);if(sq&&sq.length)break;}
    L.say(!!sq&&c.want.some(w=>w.join(',')===sq.join(',')),'TC-R206a '+c.tag+': the hint lights a best move ('+(sq&&sq.join(','))+' against '+c.want.map(w=>w.join('-')).join(' or ')+' - both first moves mate in two here; it was '+c.old+')',sq);
    const t=await slot(b);
    L.say(!!t&&c.words.test(t),'TC-R206b '+c.tag+': the hint says why, in the status slot above the board ("'+(t||'')+'")',t);
    L.say(b.errs.length===0,'TC-R206 '+c.tag+' zero app errors',b.errs.slice(0,3));await b.close();
  }
  /* #550 HEX-R-11 and HEX-R-12 (jobs/play-hint-best-move-and-words-2026-11-12, what was left): ONE LINE AFTER THE COMPUTER'S REPLY, and a
     checkmate against the computer NAMES THE MATING MOVE. Each position leaves the computer ONE legal reply, so the line it reads is
     deterministic; measured at kunal761 and 320x568, and the line must fit its slot (no ellipsis, no clipped second line). */
  const REPLY=[
    {tag:'free piece',fen:'r6k/6pp/8/8/1Q6/8/6PP/5R1K w - - 0 1',mv:['b4','f8'],want:/^Their rook took on f8 and can be taken back\.$/,then:['f1','f8']},
    {tag:'your piece attacked',fen:'7k/8/p7/8/1R6/5Q2/8/2K5 w - - 0 1',mv:['f3','f7'],want:/^The pawn on a5 attacks your rook on b4\.$/},
    {tag:'check',fen:'7k/8/8/8/8/2p2Q2/8/3K4 w - - 0 1',mv:['f3','f7'],want:/^Check from the pawn on c2\.$/}];
  const fit=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-opening"]');if(!e)return null;const r=e.getBoundingClientRect();
    return {sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,l:Math.round(r.left*10)/10,r:Math.round(r.right*10)/10,vw:innerWidth,op:getComputedStyle(e).opacity};});
  for(const geo of ['kunal761','se']){
    for(const c of REPLY){
      const b=await L.launch({geo,name:'reply130',store:{ct_pool:'3'}});await b.open();
      await scanInto(b,c.fen);const st=await start(b);await b.settle(1500);
      const s0=(await P.status(b)).txt;
      L.say(st==='ok'&&!c.want.test(s0||''),'TC-R206d '+geo+' '+c.tag+' PRECONDITION the position is on against the computer and the slot does not already carry the line ("'+(s0||'')+'")',{st,s0});
      await b.move(c.mv[0],c.mv[1],300);
      let t='';for(let i=0;i<40;i++){await b.settle(250);t=(await P.status(b)).txt||'';if(c.want.test(t))break;}
      L.say(c.want.test(t),'TC-R206d '+geo+' '+c.tag+': after the computer\'s only reply the status slot says what it means ("'+t+'")',{t});
      const f=await fit(b);
      L.say(!!f&&f.sw<=f.cw+1&&f.sh<=f.ch+1&&f.l>=0&&f.r<=f.vw+0.5,'TC-R206d '+geo+' '+c.tag+': and the whole line is painted - not cut by the slot (scroll '+(f&&f.sw)+'x'+(f&&f.sh)+' in '+(f&&f.cw)+'x'+(f&&f.ch)+')',f);
      if(c.then){
        await b.move(c.then[0],c.then[1],300);let card=null;for(let i=0;i<12;i++){await b.settle(200);card=await b.text('[data-ct="result-card"]');if(card)break;}
        L.say(!!card&&/Checkmate/.test(card)&&/Rxf8 is mate\. ?You win/.test(card),'TC-R206e '+geo+': a checkmate against the computer names the mating move on the result card ("'+(card||'')+'"; it read "Checkmate! You win!")',{card});
        let s2='';for(let i=0;i<30;i++){await b.settle(300);s2=(await P.status(b)).txt||'';if(/Rxf8 is mate/.test(s2))break;}
        L.say(/^Checkmate! · Rxf8 is mate\. You win!/.test(s2),'TC-R206e '+geo+': and the status slot states it once the card has gone ("'+s2+'")',{s2});
      }
      L.say(b.errs.length===0,'TC-R206d '+geo+' '+c.tag+' zero app errors',b.errs.slice(0,3));await b.close();
    }
  }
  {const b=await L.launch({geo:'kunal761',name:'hint130pp',store:{ct_pool:'3'}});await b.open();let ok=true;try{await P.states['pp-1'](b);}catch(e){ok=false;}await b.settle(800);
   const h=await hintBtn(b);
   L.say(ok&&!!h,'TC-R206 Pass and Play PRECONDITION a game between two people is on, and its toolbar shows Hint',h);
   L.say(!!h&&h.dis===true,'TC-R206c Pass and Play: no hint against a person - the Hint button is disabled',h);
   L.say(b.errs.length===0,'TC-R206 Pass and Play zero app errors',b.errs.slice(0,3));await b.close();}
},'130-play-hint-best-and-words');
